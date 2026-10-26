# Notification module

Turns execution outcomes into user-configured alerts (email or Slack). Pure fan-out: it never runs jobs, it listens for events and delivers messages.

## Components

- **`notification.routes.ts`** — `POST /`, `GET /?jobId=…&page&limit`, `GET/PATCH/PUT/DELETE /:notificationId`. All reads/writes pass through the caller-scoping inside the service; `findAll` is job-scoped and verifies the job belongs to the caller before listing.
- **`notification.controller.ts`** — zod validation at every boundary; creation validates `type ∈ {email, slack}` (email address / URL per type), `event ∈ {start, failure, success}`, and an optional `channelId` for Slack-style targets.
- **`notification.service.ts` — `NotificationService`.** Two jobs:
  - CRUD over rules with ownership checks — a mismatch throws `PermissionError` (403, D-2 in `docs/decisions.md`).
  - `notify(jobId, userId, event, …)` — invoked by the schedule worker with each execution outcome; every rule for `(jobId, event)` is dropped onto `NotificationQueue` for delivery.
- **`notification.queue.ts` — `NotificationQueue`.** BullMQ queue **`notification`**, job name `notification-queue`, payload `{notificationId, userId, executionId, event}`, bull job id `<notificationId>-exec-<executionId>`. Same ownership pattern as `ScheduleQueue`: stores its connection, `close()` quits it (D-4).
- **`notification.worker.ts` — `NotificationWorker`.** Owns the delivery BullMQ worker. Per message: delivery via **Resend** for `email` — the resend SDK returns `{ data, error }` rather than throwing, so the worker branches on `error` ("rejected by resend") vs logging success with `messageId` — and via the **`@slack/web-api`** client for `slack`. A Slack delivery that throws is logged scoped and re-thrown, enrolling itself in BullMQ retries.
- **Retry profile (D-9):** `attempts 2 / 100 ms exponential backoff` under `NODE_ENV=test`; `attempts 3 / 3 s` otherwise.

## Rule → payloads

- `email` type → `target` is a recipient address, message subject/body derived from the event outcome and job metadata.
- `slack` type → `target` is a webhook/channel; needs an existing Slack auth (see `slack.service.ts` and `RESEND_API_KEY`/`SLACK_TOKEN` env).

## Notes for tests

- The worker is **not** instantiated by `app/infra.ts`; the schedule worker triggers `notify()` directly, and unit tests `notification.worker.test.ts` exercise the delivery paths with spikes on Resend/Slack.
- Rule CRUD is fully testable via HTTP without queueing anything; delivery is a separate surface from rule creation.
