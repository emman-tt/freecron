# Decision record

Central list of architectural and behavioral decisions in freecron, each with the constraint it resolves and the cost it accepts. Behavior in this repo should be explainable from this file plus the code; if a behavior contradicts an entry here, one of them is wrong.

---

## D-1 — Every log line carries `filename` and `functionname`

**Status:** adopted, enforced at all call sites.

**Context.** Structured logging with three root pino loggers (`reqLogger`, `workerLogger`, `watchManLogger` in `app/shared/lib/logger.service.ts`) only pays off if each line identifies its origin without needing stack traces.

**Decision.** Every log call site passes two explicit fields: `filename` (the bare basename of the file, no paths, no line numbers) and `functionname` (`Class.method` for methods, bare name for module helpers). Arrow functions under async frameworks are given stable labels instead of `(anonymous)` (for example `findDueJobs.tick`, `ScheduleWorker.on-failed`).

**Consequences.** Fields are maintained by hand, not derived at runtime; the way it was applied once was an AST codemod over all call sites. Line numbers drift as files change — that is accepted, since grep on `filename` + `functionname` identifies any site.

---

## D-2 — Cross-user access is 403, not 404

**Status:** adopted. This one went 404 → 403 after explicit review; it is the settled position.

**Context.** Two defensible roles for "the job exists but is not yours": hide it (404, anti-enumeration) or declare the permission failure (403, truthfulness). Anti-enumeration semantics surface from hiding whether an id exists.

**Decision.** Ownership mismatches throw `PermissionError` (403) in `job.service.ts` and `notification.service.ts`, and are distinct from `NotFoundError` (404), which is a non-existent item. The internal warn log still states "job doesn't belong to user" — the answer to "does this id exist". The e2e contract is `app/e2e/job-ownership.test.ts` (read/update/delete → 403; the listing step is caller-scoped; notification creation against another's job rejects without writes).

**Consequences.** Job and notification ids are serial numbers, meaning they can be probed from error codes alone. If the strategy later switches to hide-then-absence semantics, it is a mechanical overwrite and the D-2 test tests shift with it.

---

## D-3 — Secure cookies only where secure transport is real

**Status:** adopted, conditional in code.

**Context.** Better Auth was putting `__Secure-` prefixes and `Secure` flags on session cookies. A jar must reject a `Secure` cookie it is not receiving over https, and tests walk over `http://127.0.0.1:<random>` — so a production cookie shape made hands-off jar persistence in tests impossible.

**Decision.** `advanced.useSecureCookies` is `process.env.NODE_ENV !== "test"` in `auth.service.ts`. Production keeps full `__Secure-…; Secure` semantics; tests get storable cookies and the jar persists and replays them naturally.

**Consequences.** The cookie *name* changes across environments (`freecron.session_token` vs `__Secure-freecron.session_token`). Assertions keyed on the full name should match on the suffix `freecron.session_token`.

---

## D-4 — Who owns a redis connection, files it and quits it

**Status:** adopted; caused the suite-wide exit hang and is the remediation that settled it.

**Context.** BullMQ does not close connections callers pass to `Queue`/`Worker`. Connections created by `RedisConnection()` in `app/infra.ts` were therefore immortal — three leaked sockets, and jest never exited.

**Decision.**
- Every BullMQ-backed wrapper (`ScheduleQueue`, `NotificationQueue`, `ScheduleWorker`) stores the connection it was given and `quit()`s it in its `close()` after the BullMQ close, guarded by `status !== "end"` so shared or already-defunct instances are skipped.
- App-level teardown goes through one exported `closeInfra()` in `app/infra.ts`: watchman, schedule worker, both queues, cache redis.
- Tests hand BullMQ wrappers `redis.duplicate()` — never the shared suite redis — so a wrapper's own close never interrupts fixture teardown in `TeardownTestInfra`.

**Consequences.** `close()` on the wrappers is the single socket-clean path; adding a new BullMQ surface means following the wrapper pattern and including it in `closeInfra()`.

---

## D-5 — Tests run serially against shared infra

**Status:** adopted, pinned in `jest.config.cjs` (`maxWorkers: 1`) and the commands (`--runInBand`).

**Context.** Integration suites share one Postgres and one Redis; suites truncate/flush in fixtures (`CleanTestInfra`). Parallel workers destroy one another's fixtures — deadlocks, FK violations, mid-flight queue keys.

**Decision.** Serial execution; suite isolation is by `TRUNCATE … RESTART IDENTITY CASCADE` + `flushdb` per test, never by database-per-worker.

**Consequences.** No parallel speedup; correctness first. Any long-running dev server (with an app instance and a watchman) must be off during test runs — it consumes from the same Redis and truncates out from under suites.

---

## D-6 — e2e asserts state from independent sources

**Status:** adopted.

**Context.** An HTTP handler's response is the API's word about what it did; a lifecycle assertion should not re-quote that word.

**Decision.** When a test possibly checks server state, it obtains the state itself: drizzle reads directly from `test-setup.ts` `db`, queue reads through the app's own `scheduleQueue`, and the ownership proof goes through the real route (`GET /api/notifications?jobId=…`) rather than an invented endpoint.

**Consequences.** Tests are slightly more work to write, and mismatches are behavior bugs rather than schema drift in the response shape.

---

## D-7 — Scheduling writes are fire-and-forget, tests poll

**Status:** adopted.

**Context.** `jobService.create` → `scheduleJob` → `queue.add` without awaiting; the HTTP response may reach the client before the Redis write does.

**Decision.** Production behavior stays fire-and-forget (creation must not block on queue admission). e2e verification of scheduling polls briefly (see `app/e2e/job-lifecycle.test.ts`) instead of racing Redis, and uses far-future cron expressions so `delay > 0` cannot flake at a boundary.

**Consequences.** Scheduling is not in the same transaction as job creation — a crash between the two calls leaves a persisted job that is not scheduled. The watchman sweep (D-8) is the reconciliation layer and will re-schedule any due job it finds unscheduled.

---

## D-8 — The watchman is a one-second sweep with a discrete handle

**Status:** adopted.

**Context.** Jobs can escape being rescheduled into the BullMQ queue (D-7), user-resumed jobs need their next run re-enqueued, and any persisted-but-unscheduled job must eventually run.

**Decision.** `SchedularService.findDueJobs` is scheduled with node-cron to sweep every second (`* * * * * *`), re-scheduling anything due. The task handle is stored (`ScheduledTask`), and `closeWatchman()` stops and discards it so the sweep does not outlive the DB/Redis it reads from (app shutdown, test teardown).

**Consequences.** Sweep frequency is 1s — meaning up to ~1s of added latency for jobs escaping other paths, and up to 86400 ticks/day at idle in production (accepted for simplicity; revisit if it shows up in profiling).

---

## D-9 — Retry profile: aggressive in tests, backoff in production

**Status:** adopted, in `schedular.queue.ts`.

**Context.** Retry e2e asserts exact attempt counts; production wants durable backoff against transient failures.

**Decision.** `attempts: 2, backoff 100ms (exponential)` when `NODE_ENV === "test"`; `attempts: 5, backoff 3s` otherwise. `removeOnComplete`/`removeOnFail` stay true both ways.

**Consequences.** Tests that assert attempt counts are exact only under `NODE_ENV=test`; running the tests with production env silently changes the numbers they expect to see (and fails accordingly).

---

## D-10 — BullMQ dedupes on the custom `jobId`; each must be trigger-unique

**Status:** adopted, in `schedular.queue.ts` + `schedular.service.ts`. Found by the run-now e2e (`app/e2e/job-execution.test.ts`) after the endpoint appeared to do nothing.

**Context.** BullMQ treats the `options.jobId` argument as a dedupe key: `queue.add` with an already-existing id does **not** enqueue a new job — it returns the existing job and restamps its data. `create` schedules every job as delayed under `cron-<id>` until its next cron fire, so `runJobNow`'s immediate `queue.add(..., jobId: cron-<id>, delay: 0)` was silently swallowed into that far-future delayed job. No error, no retry — the endpoint just did nothing for any actively-scheduled job.

**Decision.** `queueDTO` carries an optional `triggerId`, and `ScheduleQueue.add` uses `jobId: data.triggerId ?? data.jobId` for the dedupe key. `runJobNow` generates `cron-<id>-runnow-<Date.now()>` per trigger. Paths that *want* dedupe (watchman re-schedule vs create, resume) keep passing `cron-<id>`.

**Consequences.** One DB job can now map to two queue entries side by side (the scheduled `cron-<id>` and an in-flight `cron-<id>-runnow-…`). `unscheduleJob` removes only `cron-<id>`; a run-now trigger survives a delete that lands between trigger and execution, then aborts against the missing row (NotFoundError → BullMQ retries → `removeOnFail` cleans it). Two run-now triggers within the same millisecond coalesce into one execution — accepted.
