# FreeCron client

React single-page app for the FreeCron cron-monitoring backend. It renders the
job lifecycle the API exposes: discover jobs → create → inspect a run report →
edit → run now → watch scheduled work → manage email/Slack alert rules.

**Stack:** React 19, TypeScript, Vite 8, React Router 8, TanStack Query 5,
Tailwind CSS 4, `lucide-react` icons, `cron-parser` for schedule previews.

## Commands

```sh
pnpm install
pnpm dev       # Vite on :5173, proxies /api to the backend on :5002
pnpm build     # tsc -b && vite build
pnpm lint      # oxlint
pnpm preview   # serve the production build
```

The dev server proxies `/api` to `http://localhost:5002` and rewrites the
`Origin` header to the backend's own origin, so better-auth cookies and CSRF
validation behave the same as in production, where Express serves the built
client.

## Layout

```
src/
├── App.tsx                 # routes + RequireAuth session gate
├── features/
│   ├── auth/               # sign-in/sign-up page, auth API + hooks
│   ├── dashboard/          # fleet KPIs, health banner, job list + detail panel
│   ├── jobs/               # list, add/edit form, job report (KPIs, chart, config)
│   ├── executions/         # execution API/types, logs table, run strip, CSV export
│   ├── notifications/      # per-job alert rules: table + add-rule composer
│   └── scheduled/          # week calendar, up-next list
└── shared/
    ├── api/http.ts         # envelope-aware fetch wrapper + ApiError
    ├── lib/cron.ts         # describeCron / cronSummary / isValidCron
    ├── lib/format.ts       # mask, formatIn, hm, dayLabel, durationLabel
    ├── lib/headers.ts      # quoted-header cleanup + case-insensitive lookup
    ├── lib/use-now.ts      # one ticking clock for countdowns
    └── ui/                 # Button, Card, Input, Shell, StatusPill, Toggle
```

Each feature keeps `api/` (request functions + types), `hooks/` (TanStack
Query hooks), `components/`, and a page component. Pages do not call `fetch`
directly.

## Routes

| Path | Page | Purpose |
| --- | --- | --- |
| `/sign-in` | `SignInPage` | Combined sign-in/sign-up split layout |
| `/` | `DashboardPage` | Fleet health, KPIs, job list, job detail panel |
| `/jobs` | `JobsPage` | Searchable/filterable job table |
| `/jobs/new` | `JobFormPage` | Create a job (`?from=<id>` prefills a copy) |
| `/jobs/:jobId` | `JobDetailPage` | Job report: Overview / Logs / Scheduled |
| `/jobs/:jobId/edit` | `JobFormPage` | Edit a job |
| `/scheduled` | `ScheduledPage` | Week calendar + up-next runs |
| `/notifications` | `NotificationsPage` | Per-job alert rules with a job picker |

`RequireAuth` wraps the shell: while the session query loads it renders a
loading line, and on error/no session it redirects to `/sign-in` with the
original path in router state. Better-auth owns `/api/auth/*`; the client
never stores tokens itself — the session cookie is the auth state.

## Data layer

- `shared/api/http.ts` unwraps the backend envelope `{status, data, meta?}`,
  exposes `get`/`post`/`put`/`patch`/`delete`, sends `credentials: "include"`,
  and throws `ApiError(status, message)` with the backend's own message.
  `raw` mode is used for better-auth endpoints that bypass the envelope.
- Hooks are TanStack Query wrappers. Mutations invalidate the relevant lists
  and detail queries (jobs, executions, notification rules, stats).
- Aggregate numbers come from real endpoints: `GET /api/jobs/stats` and
  `GET /api/executions/stats?jobId=…`. The UI follows the honest-data rule:
  render a real value or `—`/`since Today`, never an invented placeholder.
- `shared/lib/format.ts` masks long URLs, formats relative/absolute times,
  and turns durations into compact labels. Server timestamps arrive as ISO
  strings and are formatted at render time.

## Design system

Tokens live in `src/index.css` under Tailwind's `@theme` and are copied from
the pen.dev FreeCron board — components use the variables, not raw hexes:

| Token | Value |
| --- | --- |
| `--color-bg` | `#f7f7f6` |
| `--color-card` | `#ffffff` |
| `--color-primary` | `#0a0a0a` |
| `--color-muted` | `#737373` |
| `--color-muted-bg` | `#f5f5f4` |
| `--color-border` | `#e7e5e4` |
| `--color-success` | `#16a34a` |
| `--color-success-strong` | `#15803d` |
| `--color-success-soft` | `#eaf7ee` |
| `--color-live` | `#22c55e` |
| `--color-chart-bar` | `#d6d3d1` |
| `--color-warning` | `#a16207` |
| `--color-warning-soft` | `#fdf6e3` |
| `--color-warning-border` | `#f0dfae` |
| `--color-danger` | `#dc2626` |
| `--color-danger-soft` | `#fef2f2` |
| `--color-danger-border` | `#f3c9c9` |
| `--color-ink` | `#0a0a0a` |
| `--radius-card` | `20px` |
| `--radius-control` | `12px` |
| `--radius-field` | `10px` |

Brand assets: `public/logo-mark.svg` is the single-color `#22C55E` clock +
refresh-arrow mark with a white chip baked in; it is also the favicon
(`index.html`). The sidebar and the auth page both use it.

The sign-in page is the reference split layout: a dark `#0a0a0a` brand panel
(logo tile, headline, green-check bullets) hidden below `lg`, plus a 440px
white 20px-radius form card. A compact logo row replaces the panel on small
screens. Sign-in and sign-up share the page via a mode toggle.

## Screens

### Dashboard (`/`)

Fleet health banner → five KPI cards (Total jobs, Active, Paused, Failed
all-time, Avg runtime) → a two-column workspace: searchable job list and a
detail panel with Overview / Runs / Config / Alerts tabs.

- **Health banner** is derived, not decorative: it names the worst job and its
  failure count when anything is failing, turns green when every active job is
  healthy, and stays neutral when there is nothing to report.
- **KPI cards** read `GET /api/jobs/stats`. The stats endpoints are all-time
  only, so the range control is a static “All time” chip with a tooltip —
  there is no fake 24-hour switcher. Hovering a card explains the number.
- **Job list** shows status dot, name, human schedule (`cronSummary`), and a
  live countdown from the shared `useNow` clock. The status popover filters
  Active / Paused client-side.
- **Detail panel**: header actions (Run now, Edit, Duplicate, Delete), a 48-run
  strip (green = success, red = failed/timeout, amber = running; no grey
  “skipped” state because the API has none), request vs latest response,
  payload, recent runs, and per-job alert rules with toggles.
- **Duplicate** links to `/jobs/new?from=<id>`; the form prefills the fields
  and appends “(copy)” to the name. Nothing is written until Save.

### Job report (`/jobs/:jobId`)

Breadcrumb, job name + health word (Up / Down / Running / Paused / Idle),
actions, a real sub-line (`url · cron · method · next run in …`), and underline
tabs.

- **Overview** — six-metric KPI strip (Last failure, Average, Uptime, Lowest,
  Highest, Status) from `GET /api/executions/stats`; a linear response-time bar
  chart for the latest 12 completed runs (grey bars, red failures, black latest,
  dashed window average, y-axis and x-axis labels); a caption that names any
  run over a second instead of hiding outliers; and a Config card with human
  schedule, method, URL, timeout, retries, content-type, header count, and the
  real JSON payload.
- **Logs** — see below.
- **Scheduled** — the next eight fire times, computed locally from the cron
  expression (the BullMQ queue itself is not exposed over HTTP).

### Logs (report → Logs)

Status chips (All / Success / Failed), a search over status code, status, error
and response, and the execution table. Counts describe the loaded page — the
header says “showing 1–20 of N”, and “All runs” is a static chip because range
filtering is not wired to the API.

- The newest row opens automatically. “View” / “Hide” toggles a detail block
  with the request (method, path, content-type, payload) and the response
  (status line, JSON body or error), plus **Copy as cURL** and **Re-run**.
- The latency bar compares each run to the slowest run on the page.
- **Export CSV** downloads the rows currently loaded on the page; the API has no
  bulk export, so the filename includes the page number.
- The same table powers the dashboard’s Runs tab.

### Notifications (`/notifications`)

A job picker scopes the page to one job and loads its rules via
`GET /api/notifications?jobId=…`. An amber banner explains when a job has no
enabled rules; it turns green once alerts are on. The rules table lists the
channel, event, target, and an on/off toggle, with Remove per row (there is no
test-send endpoint, so the design’s “Send test” is intentionally absent).

The add-rule card composes real payloads: email validates the address, Slack
takes a webhook URL, and the event choices are `failure` and `success` — the
form omits `start` because the backend accepts it but never sends start alerts.
The note is accurate about retries: failure alerts fire only after retries are
exhausted.

### Header cleanup

Some stored jobs have quoted header keys/values (`"'Content-type'"`). The
report and cURL output display them through `shared/lib/headers.ts`, which
strips one layer of quotes and matches names case-insensitively; the stored
value itself is never rewritten.

## Job form details

`JobFormPage` edits only fields the API actually persists (no timeout/retries
editing — those are not part of the save/clone payload):

- **Cron field:** eight always-visible quick-pick chips
  (`*/15 * * * *`, `0 * * * *`, `0 2 * * *`, `0 18 * * *`, `0 9 * * 1-5`,
  `0 9 * * 1`, `0 23 * * 0`, `0 0 1 * *`) plus an as-you-type suggestion
  dropdown that matches either the label or the raw cron text.
- `describeCron`/`isValidCron` mirror the backend's wording for the next-run
  preview and input validation.
- Add and edit reuse the same component; edit loads the job first.

## Build

`pnpm build` runs `tsc -b` then `vite build`. Production output goes to
`dist/`, which the Express app serves. There is no separate client runtime
configuration: API calls are same-origin `/api/*`.
