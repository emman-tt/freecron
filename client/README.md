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
│   ├── dashboard/          # overview KPIs, stat cards
│   ├── jobs/               # list, add/edit form, detail report
│   ├── executions/         # execution API/types, table, run cards
│   ├── notifications/      # alert-rule list and CRUD UI
│   └── scheduled/          # week calendar, up-next list
└── shared/
    ├── api/http.ts         # envelope-aware fetch wrapper + ApiError
    ├── lib/cron.ts         # describeCron / isValidCron via cron-parser
    ├── lib/format.ts       # mask, formatIn, hm, dayLabel, durationLabel
    └── ui/                 # Button, Card, Input, Shell, StatusPill, Toggle
```

Each feature keeps `api/` (request functions + types), `hooks/` (TanStack
Query hooks), `components/`, and a page component. Pages do not call `fetch`
directly.

## Routes

| Path | Page | Purpose |
| --- | --- | --- |
| `/sign-in` | `SignInPage` | Combined sign-in/sign-up split layout |
| `/` | `DashboardPage` | Aggregate KPIs and recent activity |
| `/jobs` | `JobsPage` | Searchable/filterable job table |
| `/jobs/new` | `JobFormPage` | Create a job |
| `/jobs/:jobId` | `JobDetailPage` | Job overview, report KPIs, runs/logs, inline alert rules |
| `/jobs/:jobId/edit` | `JobFormPage` | Edit a job |
| `/scheduled` | `ScheduledPage` | Week calendar + up-next runs |
| `/notifications` | `NotificationsPage` | Alert-rule list across jobs |

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
| `--color-warning` | `#a16207` |
| `--color-danger` | `#dc2626` |
| `--color-danger-soft` | `#fef2f2` |
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
