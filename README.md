# freecron

Cron-job monitoring platform: users define HTTP jobs on cron schedules, a worker executes them on time, records every run (execution log/retries/durations/failures), and alerts through email or Slack by rules.

**Stack:** TypeScript (ESM, `verbatimModuleSyntax`-style `.js` import specifiers), Express 5, better-auth + Drizzle ORM + Postgres, BullMQ + ioredis, pino, Jest 30 (ts-jest ESM). Node ≥ 26 (top-level cron-parser/better-auth behavior validated there).

## Layout

```
app/
├── index.ts            # boot: dotenv, middleware, routers, conditional listen
├── infra.ts            # object composition root + closeInfra() teardown
├── e2e/                # end-to-end suites (auth, job ownership, lifecycle)
├── modules/
│   ├── Jobs/           # user jobs CRUD: routes, controller (zod), service, repository
│   ├── Scheduler/      # watchman, queue, worker — see modules/Scheduler/README.md
│   ├── Execution/      # per-run records: status, attempts, durations, response
│   ├── Notification/   # alert rules + delivery — see modules/Notification/README.md
│   └── Users/          # account endpoints — see modules/Users/README.md
├── shared/
│   ├── lib/            # logger.service (pino roots), auth.service, cron.service, infra clients
│   ├── middleware/     # requestLogger, authMiddleware
│   ├── errors/         # DomainError hierarchy (business) + errorHandler (http)
│   ├── repositories/   # shared cache repository
│   └── helpers/        # test-setup.ts (SetupTestInfra / CleanTestInfra / TeardownTestInfra)
└── database/           # db.schema.ts (drizzle), db.config.ts (client + closeDb)
docs/                   # decision record (docs/decisions.md) + testing reference (docs/testing.md)
```

## Logging

pino everywhere, zero `console.*` in `app/`. Three roots: `reqLogger` (`request-journey`), `workerLogger` (`worker-journey`), `watchManLogger` (`schedule-watchman`). Every call site carries explicit `filename` (bare basename) and `functionname` fields — D-1 in `docs/decisions.md`.

## Error model

All domain errors extend `DomainError` (`app/shared/errors/business.errors.ts`) and render through one `errorHandler` (`http.errors.ts`): `audit`-style body `{status, error, message}`. Known mapping: validation → 400, unauthenticated → 401, permission/ownership → **403** (D-2), missing → 404, business rules → 422, internal → 500.

## Running

```sh
pnpm run dev    # tsx watch + pino-pretty (local dev; reads .env)
pnpm run prod   # tsc && node ./build/index.js
pnpm run test   # full jest suite (see testing section)
```

Environment comes from `.env` (dev/prod) and `.env.test` (tests: test Postgres :5431, test Redis :6378, dummy Resend key, `NODE_ENV=test`). Secrets (`BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SLACK_TOKEN`, `BETTER_AUTH_URL`, `CLIENT_URL`) are never committed.

## Testing

`docs/testing.md` at the repo root is the authoritative reference: the exact runnable command (jest must be invoked *without* `dotenv-cli`, which swallows CLI arguments), the infra contract, connection-ownership rules, and every pitfall that shaped it. `docs/decisions.md` enumerates the architecture decisions (403 ownership, `useSecureCookies` conditional, BullMQ connection ownership, serial execution, fire-and-forget scheduling, and others).

```sh
set -a; source .env.test; set +a
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --runInBand
```

Suite-shaped constraints worth restating in one line: tests run **serially** because all suites share one Postgres/Redis as their fixture surface, and any live dev-server instance of this app must be shut down before a test run — it consumes from the same Redis and its `watchman` processes jobs underneath the workers.
