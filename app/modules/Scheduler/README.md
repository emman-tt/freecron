# Scheduler module

Turns cron-defined jobs into timed BullMQ executions. Owns the scheduling clock for the whole app.

## Components

- **`schedular.service.ts` — `SchedularService`.** Three scheduling verbs and a clock:
  - `findDueJobs` — the **watchman**: node-cron sweep every second (`* * * * * *`) that reads the DB for due jobs and re-enters them into the queue. This is the reconciliation layer for anything that escaped scheduling at creation or resume time (D-7 in `docs/decisions.md`). Its cron handle is stored and `closeWatchman()` stops + discards it — call it whenever the DB/Redis this sweep reads from are shutting down (app shutdown, e2e teardown).
  - `scheduleJob(jobId, userId, delayMs)` / `unscheduleJob(jobId)` — enqueue/remove a job from the queue under the id `cron-<jobId>`.
  - `runJobNow(jobId, userId)` — same queue, priority 1, no delay, for the "run now" endpoint (`POST /api/jobs/:jobId`). The trigger enqueues under a **unique bull job id** `cron-<id>-runnow-<ts>` (D-10 in `docs/decisions.md`): bull dedupes same-id adds, so reusing the scheduled `cron-<id>` would silently swallow the immediate trigger into the delayed job.
- **`schedular.queue.ts` — `ScheduleQueue`.** Thin wrapper over the BullMQ queue **`schedular`** with job name **`execute-job`**. Payload carries `jobId` (`cron-<id>`), `userId`, `executionId`, `statusCode`, `response`. Options: `attempt` 2 with 100 ms exponential backoff under `NODE_ENV=test`, 5 attempts with 3 s otherwise (D-9); `removeOnComplete`/`removeOnFail` true. Owns its connection; `close()` quits it (D-4).
- **`schedular.worker.ts` — `ScheduleWorker`.** BullMQ worker on queue `schedular`. The processor: create an execution, run the HTTP command (method/url/body/headers from the job), record outcome via `ExecutionService`, then hand the outcome (`start`/`failure`/`success`) to `NotificationService.notify`. On failure it throws so BullMQ's retry policy takes over; failed attempts surface through worker event labels (`ScheduleWorker.on-failed`). `close()` quits both BullMQ and its own connection (D-4).
- **`../shared/lib/cron.service.ts` (imported as `cronManager`).** The cron-literal authority: `validateCron` (accepted by the API), `findNextRun` (stored as `nextRunAt`), `findDelayMs` (queue delay until next fire). Backed by `cron-parser`.

## Data flow

```
job created/resumed ──► scheduleJob ──► [schedular] with delay = findDelayMs(cron)
watchman (1 Hz) ────► due jobs found ──► scheduleJob (reconciliation)
[schedular] delay expires ──► ScheduleWorker.Processor ──► HTTP run + execution path
                                            └─► NotificationService.notify(event)
```

## Notes for tests

- Tests hand this module's BullMQ structures `redis.duplicate()`, never the shared suite redis (D-4/D-5).
- `queue.add` is fire-and-forget at the service level; e2e asserts scheduling by polling (D-7).
- The watchman does not start under `NODE_ENV=test` (starting `index.ts` skips it), but `closeWatchman` no-ops gracefully either way.
