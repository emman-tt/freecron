# Testing reference

The backend suite is **integration-first**: the e2e suites run the real Express
app, the real Postgres schema, the real Redis instance, and the real BullMQ
workers. Outbound HTTP (`fetch`) is mocked globally via `jest-fetch-mock`;
unit tests additionally spy on the Resend and Slack SDKs.

## Prerequisites

- Docker compose test services (test Postgres on `5431`, test Redis on `6378`):

  ```sh
  docker compose up -d freecron-test-db freecron-test-redis
  ```

- A populated `.env.test`. It points at the test services, uses a dummy Resend
  key, a placeholder `SLACK_TOKEN`, and sets `NODE_ENV=test`.
- No dev server may be running. A live `pnpm run dev` instance consumes from the
  same Redis and its watchman processes jobs underneath the test workers.
  Stop it before running the suite.

## Commands

```sh
set -a; source .env.test; set +a
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand
```

**Do not use `dotenv-cli` / `dotenv -e .env.test`.** It swallows CLI arguments
(`--runInBand`, path filters) before Jest sees them.

Useful variants:

```sh
# one file
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand app/e2e/job-execution.test.ts

# one suite by name
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand -t "should notify on the final failure"
```

## Why serial execution

`jest.config.cjs` sets `maxWorkers: 1` and the commands pass `--runInBand`.
Every suite shares one Postgres database and one Redis database; fixtures
truncate and flush in `beforeEach`. Parallel workers would destroy each
other's state (deadlocks, FK violations, missing BullMQ keys). Serial
execution is a correctness requirement, not a speed tweak (D-5).

## Fixture contract

`app/shared/helpers/test-setup.ts` provides:

| Helper | What it does |
| --- | --- |
| `SetupTestInfra()` | Opens the test Postgres client + Redis connection. Migrations are **commented out**, so the test database must already have the schema applied. |
| `CleanTestInfra()` | `TRUNCATE users, job, execution, notification, session, account, verification RESTART IDENTITY CASCADE` + `FLUSHDB` |
| `TeardownTestInfra()` | Quits the Redis connection, ends the Postgres client, closes the Drizzle client |
| `createUserTest(name)` | Inserts a user with a random email |
| `createJobTest(userId, data)` | Inserts a job, filling defaults from `JOB_DEFUALTS` |

## Connection ownership

BullMQ does not quit caller-owned connections; every wrapper stores the
connection it was given and `quit()`s it in `close()` (D-4). Tests hand each
wrapper `redis.duplicate()` — never the shared suite Redis — so a wrapper's
`close()` cannot interrupt fixture teardown.

App-level teardown goes through one exported `closeInfra()` (`app/infra.ts`):
watchman, schedule worker, both queues, cache Redis. Known gap:
`NotificationWorker` shares `notifRedis` with `NotificationQueue` and is not
awaited by `closeInfra()`; `NotifQueue.close()` quits the shared connection.

## Environment quirks

- `NODE_ENV=test` skips the whole `boot()` path in `app/index.ts`: no infra
  probe, no stale-running sweep, no `app.listen`, no 15 s queue-depth gauge
  loop, no signal handlers. Supertest talks to the exported `app` directly.
- `NODE_ENV=test` changes retry counts and backoff (D-9): scheduler queue
  2 attempts / 100 ms exponential (5 / 3 s otherwise); notification queue
  2 attempts (3 otherwise).
- `useSecureCookies` is disabled under tests (D-3) so supertest jars can persist
  and replay `freecron.session_token` over plain HTTP.
- The watchman does not start under `NODE_ENV=test`, but `closeWatchman()`
  no-ops safely either way.
- `slack.service.ts` skips its import-time `auth.test()` probe under
  `NODE_ENV=test` (D-17), so no live Slack token is required.

## What the suites cover

| File | Focus |
| --- | --- |
| `app/e2e/auth.test.ts` | Sign-up, sign-in, failed logins, sign-out, session cookie name |
| `app/e2e/job-ownership.test.ts` | 403 on cross-user read/update/delete; notification creation rejects without writes |
| `app/e2e/job-lifecycle.test.ts` | Create/update/delete, cascade cleanup, scheduling polling |
| `app/e2e/job-execution.test.ts` | Run-now endpoint, worker execution, retry behavior, `/metrics` histograms |
| `app/e2e/job-failure.test.ts` | Failure notifications only on the terminal attempt; retry recovery does not notify |
| `app/e2e/job-validation.test.ts` | DTO validation and route-level 400s |
| `app/modules/*/_tests_/*.test.ts` | Unit tests for controllers, services, repositories, workers, and queue options |
| `app/shared/helpers/_tests_/email.test.ts` | Email template interpolation, relative past/future timestamps, non-date passthrough |
| `app/shared/helpers/_tests_/slack.test.ts` | Slack block structure, fallback text, action buttons, singular wording |

See `docs/decisions.md` for the architectural rules that shape these fixtures
and expectations (D-4, D-5, D-6, D-7, D-9, D-10, D-11).
