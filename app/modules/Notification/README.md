# Notification module

Turns execution outcomes into user-configured alerts (email or Slack). Pure fan-out: it never runs jobs, it listens for events and delivers messages.

## Components

- **`notification.routes.ts`** — `POST /`, `GET /?jobId=…&page&limit`, `GET/PATCH/PUT/DELETE /:notificationId`. All reads/writes pass through the caller-scoping inside the service; `findAll` is job-scoped and verifies the job belongs to the caller before listing.
- **`notification.controller.ts`** — zod validation at every boundary; creation validates `type ∈ {email, slack}` (email address / URL per type), `event ∈ {start, failure, success}`, and an optional `channelId` for Slack-style targets.
- **`notification.service.ts` — `NotificationService`.** Two jobs:
  - CRUD over rules with ownership checks — a mismatch throws `PermissionError` (403, D-2 in `docs/decisions.md`).
  - `notify(jobId, executionId, event, userId, log)` — invoked by the schedule worker with each execution outcome (`success` at completion, `failure` only on the terminal attempt, D-11); every enabled rule for `(jobId, event)` is dropped onto `NotificationQueue` for delivery. Disabled rules are skipped with a warn log.
- **`notification.queue.ts` — `NotificationQueue`.** BullMQ queue **`notification`**, job name `notification-queue`, payload `{notificationId, userId, executionId, event}`, bull job id `<notificationId>-exec-<executionId>`. Stores its connection and `close()` quits it (D-4).
- **`notification.worker.ts` — `NotificationWorker`.** Owns the delivery BullMQ worker. Per message: delivery via **Resend** for `email` — the resend SDK returns `{ data, error }` rather than throwing, so the worker branches on `error` ("rejected by resend") vs logging success with `messageId` — and via the **`@slack/web-api`** client for `slack`. A Slack delivery that throws is logged scoped and re-thrown, enrolling itself in BullMQ retries.
- **Retry profile (D-9):** `attempts 2 / 100 ms exponential backoff` under `NODE_ENV=test`; `attempts 3 / 3 s` otherwise. `removeOnComplete`/`removeOnFail` are both `true`.
- **Email templates (`app/shared/helpers/email.ts`).** `successMail`/`failedMail` render run and next-run timestamps through a local `fmt()`: `just now`, `5 minutes ago`, `an hour ago`, `Yesterday`, `in 2 hours`, `Tomorrow`, then a short calendar fallback. Non-date strings pass through untouched. Slack templates (`app/shared/helpers/slack.ts`) still interpolate the raw `runAt`/`nextRun` values; only email localizes them today.

## Rule → payloads

- `email` type → `target` is a recipient address, message subject/body derived from the event outcome and job metadata.
- `slack` type → `target` is ignored for delivery; the worker posts to `channelId` and needs a valid bot token in `SLACK_TOKEN` with `chat:write`.
- Delivery is event-shaped: `success` and `failure` have branches today; a rule stored with `event: "start"` is accepted by validation but the worker has no `start` branch, so it does not send.

## Metrics (D-16)

`freecron_notifications_total` is a counter with labels `type` (`email` | `slack`), `event` (`start` | `failure` | `success`), and `outcome` (`sent` | `failed`):

- `sent` after Slack `chat.postMessage` returns, and after Resend returns without `error`.
- `failed` in the Slack catch block, before the error is re-thrown for a retry.
- Known gap: the email `sent.error` path logs `email rejected by resend` but does not increment `failed` yet, so the counter under-counts email rejections. Add the increment there when tightening delivery accounting.

Queue health is on the shared gauge set: `freecron_queue_depth{queue="notification",state="waiting"}` (also `active`, `delayed`, `failed`, `completed`) is refreshed every 15 s from `app/index.ts` via `NotifQueue.getQueue().getJobCounts()`.

## Startup and operations

- `app/infra.ts` constructs `NotificationWorker` as `notifWorker` alongside `NotifQueue`, both on the same `notifRedis` connection. Importing the composition root starts the worker — there is no separate process to launch.
- The queue only drains when that Redis is reachable (`REDIS_URL`, logical DB 1; test Redis is `:6378`). If Redis is down or the worker is not consuming, `freecron_queue_depth{queue="notification",state="waiting"}` climbs while `rate(freecron_notifications_total{outcome="sent"}[5m])` stays at zero.
- `slack.service.ts` probes `auth.test()` at import unless `NODE_ENV=test`; an invalid token only logs `slack auth test failed` and boot continues (D-17). Per-message Slack failures then show up in logs and in the `failed` counter.
- Known teardown gap: `closeInfra()` currently closes the watchman, schedule worker, both queues, and the cache redis, but does not await `notifWorker.close()`. The shared `notifRedis` is quit by `NotifQueue.close()`. Adding `notifWorker.close()` before the queue (or giving the worker its own connection) is the clean follow-up (D-4).

## Notes for tests

- The worker unit test is `notification.worker.test.ts`; it exercises the Resend/Slack delivery paths with spies. Rule CRUD is fully testable via HTTP without queueing anything.
- Under `NODE_ENV=test` the Slack import-time auth probe is skipped, so tests do not need a live token.
- Retry assertions are exact only under `NODE_ENV=test` (2 attempts instead of 3, D-9).
