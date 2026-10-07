# Career Reads Admin

The admin panel for [Career Reads](../blognest): write and publish posts, post jobs, manage categories, authors, media, messages, settings and users. It is its own Next.js 16 app with no database: it talks to the Career Reads API ([`blognest-api`](../blognest-api)).

- Design: [`docs/ADMIN_DESIGN.md`](docs/ADMIN_DESIGN.md) (frosted glass, light "Aurora" and dark "Ember")
- Plan and architecture: [`docs/ADMIN_PANEL_PLAN.md`](docs/ADMIN_PANEL_PLAN.md)
- Screenshots of every main screen in both themes: [`docs/screenshots/`](docs/screenshots)

## Run it locally

You need Node 20.9+ and the API running. The admin has **no database of its own**: everything it shows and saves goes through the Career Reads API ([`../blognest-api`](../blognest-api)). Start order: Postgres → API (:4000) → website (:3000) → admin (:3001).

```bash
# In ../blognest-api: npm run db:local, npm run db:migrate, npm run db:import,
# npm run admin:create -- you@example.com "Your Name", npm run start:dev  (see its README)
npm install
cp .env.example .env.local  # set ADMIN_API_KEY to the API's ADMIN_API_KEY
npm run dev                 # http://localhost:3001
```

Uploaded images are stored by the API: in development in the site's `public/uploads/` folder, in production in Vercel Blob.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Admin on http://localhost:3001 |
| `npm run api:types` | Regenerate `src/lib/api/schema.d.ts` from the API's OpenAPI spec (`${API_URL}/docs-json`, default `http://localhost:4000`). Commit the result |
| `npm run sync:shared` | Copy the API's content rules the screens use into `src/shared/` (run after changing them in the API) |
| `npm run check` | Lint, typecheck, unit tests, build |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests: builds and runs **all three** apps (API, website, admin) against the `blognest_test` database |
| `node scripts/screenshots.mjs` | Refresh `docs/screenshots/` (dev server running, QA users seeded) |

## How it connects

```
blognest-admin ──Server Actions / pages──▶ blognest-api ──▶ Postgres, Vercel Blob
   (tokens in httpOnly cookies)                 │
                                                └── POST /api/revalidate ──▶ blognest (website)
```

- **The API owns everything:** the database, migrations, uploads, passwords and every rule (validation, roles, company scoping, job review). The admin only renders screens and calls it from the server (`src/lib/api/client.ts`, server-only).
- **Sign-in:** `POST /auth/login` returns an access token (15 minutes) and a refresh token (30 days). Both live in httpOnly cookies on the admin's domain; the browser never sees them. `src/proxy.ts` refreshes the pair a minute before the access token expires (Server Components can't write cookies, so the proxy is the one place that does). If the refresh token no longer works (signed out elsewhere, removed, paused) the cookies are cleared and you're sent to `/login`.
- **Every call** carries `X-Api-Key` (`ADMIN_API_KEY`) and the visitor's IP in `X-Client-IP`, so the API's per-visitor sign-in limits work.
- **Types:** request paths are typed from the API's OpenAPI spec (`npm run api:types`). Row shapes are in `src/lib/api/types.ts`.
- **`src/shared/`** is a display copy of the API's content rules (post preview, editor hints, label lists). The API validates every save; `npm run sync:shared` keeps the copies in step.
- **Saves refresh the site:** the API calls the website's `/api/revalidate` after each save. If the site can't be reached, the save still succeeds and the admin says the site will catch up within the hour.

## Deploying (Vercel)

1. Deploy the API first (see its README and go-live checklist). Production API: `https://api.careersreads.com`.
2. Environment variables for this project:

   | Variable | Required | What it is |
   | --- | --- | --- |
   | `API_URL` | No | The API. Vercel production deployments default to `https://api.careersreads.com`; elsewhere `http://localhost:4000` |
   | `ADMIN_API_KEY` | Yes | Same value as `ADMIN_API_KEY` in the API |
   | `PUBLIC_SITE_URL` | Yes | The website, e.g. `https://www.careersreads.com` ("View on site" links, image previews) |

   Remove the old `DATABASE_URL`, `REVALIDATE_SECRET`, `BLOB_READ_WRITE_TOKEN` and `BLOGNEST_DIR`.
3. Everyone signs in once more after this change (the old database sessions aren't used any more).
4. The first super admin is created in the API: `npm run admin:create -- you@example.com "Your Name"` there.

## Roles and company accounts

| | Super admin | Editor | Company |
| --- | --- | --- | --- |
| Dashboard | Full site dashboard | Full site dashboard | Their own jobs: live / in review, views and Apply clicks |
| Jobs | All jobs; approve or send back company jobs | All jobs; approve or send back company jobs | Only their company's jobs |
| Posts, categories, authors, media, messages, activity, help | ✅ | ✅ | 403 |
| Companies (every company's stats, invites, pause) | ✅ | 403 | 403 |
| Users, Settings | ✅ | 403 | 403 |

**Adding a company:** Companies → **New company** → **Invite**. Send the one-time link (valid 7 days) to someone at the company; they choose a password and land on their company dashboard.

**Review flow:** by default, when a company publishes a new job or edits a live one, it stays off the site with status **In review**. Staff see a count on **Jobs** and in notifications, open the job and choose **Approve & publish** or **Send back** (with a note the company sees). Turn on **Trusted** for a company (Companies → the company → Edit) to let its jobs go live without review. Companies can't mark jobs as Featured; that stays a Career Reads decision.

**Stats:** views and Apply clicks come from the site's cookie-free counters (`daily_stats`), per job page per day. Companies see their own; super admins see every company on **Companies**, and each company's chart and per-job table on its page.

**Pausing** a company signs its people out and blocks sign-in; its jobs are untouched. **Deleting** a company removes its user accounts and invites; its jobs and stats are kept as Career Reads jobs.

## Security model

- The API checks every request: it loads the user on each call, so role changes, removals and paused companies take effect immediately. Company accounts are confined to their own company's jobs **in the API**; another company's job is a 404, not a 403.
- `requireUser()` still runs on **every** page, Server Action and route handler, so the screens match what the API allows; `src/proxy.ts` only refreshes tokens and redirects logged-out visitors. `tests/unit/security.test.ts` fails the build if an action or route forgets it, if a job action calls the API without the user's token, or if anything in `src/` imports a database driver.
- Tokens: httpOnly, `SameSite=Lax`, `Secure` in production, expiring with the tokens themselves. Refresh tokens rotate on every use; reusing an old one signs that user out everywhere.
- Passwords (argon2id), sign-in rate limits, upload checks (JPG, PNG, WebP, AVIF by their bytes, max 5 MB) and the MDX safety filter all run in the API.
- Every page is `noindex` (`X-Robots-Tag`, robots.txt, meta), never framed, and served `Cache-Control: private, no-store`.
