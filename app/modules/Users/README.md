# Users module

The caller-facing surface for account data, sitting behind session authentication. Auth does not happen in this module — it happens in the middleware chain this module is mounted under.

## Endpoints

Mounted at **`/api/users`** in `app/index.ts`, in this order: `requestLogger` → `authMiddleware` → route.

| Route | Handler | Does |
|---|---|---|
| `GET /me` | `find` | returns the session user's account record |
| `PUT /me` | `update` | patches account fields (`updateUserDTO`) |
| `DELETE /me` | `delete` | deletes the account along with its jobs (delegated cleanup) |

## Session flow

- `app/shared/middleware/auth.ts` — `authMiddleware` calls `auth.api.getSession` (better-auth, drizzle-backed) and attaches `req.userId` to the request. No session → `UnauthenticatedError` → **401**; a session-lookup failure inside better-auth is also propagated (`session lookup failed`), but as an internal error.
- `app/shared/lib/auth.service.ts` — better-auth config: drizzle adapter (pg), credentials email/password, `cookiePrefix: "freecron"`, `useSecureCookies` conditional on `NODE_ENV` (D-3 in `docs/decisions.md`), `{CLIENT_URL}` trusted origins.
- Controllers read ownership strictly from `req.userId` — no id ever arrives from a body/query of these endpoints, which is also exactly what the tests mirror (`mockReq` shapes).

## e2e notes

- `app/e2e/auth.test.ts` covers sign-up 200 + `freecron.session_token` cookie name, sign-in, failed logins (unknown user / wrong password → 401), and the sign-out → subsequent unauthenticated flow → 401.
- Session cookies persist in supertest jars because of the conditional-secure-cookies decision (D-3); no test attaches cookies by hand.
