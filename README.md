# Career Reads Admin

The admin panel for [Career Reads](../blognest): write and publish posts, post jobs, manage categories, authors, media, messages, settings and users. It is its own Next.js 16 app and shares one PostgreSQL database with the public site.

- Design: [`docs/ADMIN_DESIGN.md`](docs/ADMIN_DESIGN.md) (frosted glass, light "Aurora" and dark "Ember")
- Plan and architecture: [`docs/ADMIN_PANEL_PLAN.md`](docs/ADMIN_PANEL_PLAN.md)
- Screenshots of every main screen in both themes: [`docs/screenshots/`](docs/screenshots)

## Run it locally

You need Node 20.9+ and Homebrew Postgres (`brew install postgresql@18`). Nothing touches any other database on your machine: the admin runs its own private Postgres in `.data/pg` on port 54329.

```bash
npm install
npm run db:local            # start the private Postgres (creates it the first time)
cp .env.example .env.local  # then set REVALIDATE_SECRET (openssl rand -hex 32)
npm run db:migrate          # create the tables
npm run db:import           # copy the site's articles, authors, jobs, categories and images
npm run admin:create -- you@example.com "Your Name"   # prints a temporary password
npm run dev                 # http://localhost:3001
```

Run the public site against the same database so you can see changes live: in `../blognest/.env.local` set `DATABASE_URL=postgres://postgres@localhost:54329/blognest` and the same `REVALIDATE_SECRET`, then `npm run dev` there (port 3000).

In development, uploaded images are saved into the site's `public/uploads/` folder so both apps can show them. In production they go to Vercel Blob.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Admin on http://localhost:3001 |
| `npm run db:local` / `db:local:stop` | Start / stop the private local Postgres |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` (then copy the schema to the site, see below) |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:import` | Copy the site's file content into the database (safe to re-run; overwrites rows with the same slug) |
| `npm run admin:create -- email "Name" [--reset]` | Create the first super admin, or reset someone's password (they become a super admin), with a temporary password |
| `npm run sync:shared` | Copy the site's shared rules into `src/shared/` (run after changing them in the site) |
| `npm run check` | Lint, typecheck, unit tests, build |
| `npm test` | Unit tests (uses the `blognest_test` database for DB tests) |
| `npm run test:e2e` | End-to-end tests: builds and runs **both** apps against the test database |
| `node scripts/screenshots.mjs` | Refresh `docs/screenshots/` (dev server running, QA users seeded) |

## How it connects to the public site

```
blognest-admin ──writes──▶ Postgres ◀──reads── blognest
       │                                          ▲
       └── POST /api/revalidate (shared secret) ──┘   after every save
```

- **This repo owns the database schema** (`src/db/schema.ts`, migrations in `src/db/migrations`). The site keeps a read-only copy at `blognest/src/db/schema.ts`. After changing the schema here, copy the file across.
- **The site owns the content rules.** Zod schemas, image placement, visibility, categories, settings and the safe-MDX filter live in the site and are copied here by `npm run sync:shared` (files in `src/shared/` say so at the top; don't edit them here).
- **Saves refresh the site** through `POST {PUBLIC_SITE_URL}/api/revalidate` with `REVALIDATE_SECRET`. If the site can't be reached, the save still succeeds and the admin says the site will catch up within the hour.
- **Traffic stats** come from the site's privacy-friendly beacon (`/api/stats`): counts per page per day only, no cookies, no IPs.

## Deploying (Vercel)

1. Create a Neon Postgres database. Run `DATABASE_URL=<neon url> npm run db:migrate` and `npm run db:import` once from your machine.
2. Create **two** Vercel projects: `blognest` (the site) and `blognest-admin` (this repo, e.g. `admin.yourdomain.com`).
3. Environment variables:

   | Variable | Admin | Site |
   | --- | --- | --- |
   | `DATABASE_URL` (Neon) | ✅ | ✅ |
   | `REVALIDATE_SECRET` (same value) | ✅ | ✅ |
   | `PUBLIC_SITE_URL` (e.g. `https://www.yourdomain.com`) | ✅ | |
   | `BLOB_READ_WRITE_TOKEN` (Vercel Blob store) | ✅ | |
   | `BLOGNEST_DIR` | only for `db:import` | |

4. Create the first super admin: `DATABASE_URL=<neon url> npm run admin:create -- you@example.com "Your Name"`. Sign in and choose a new password.
5. Invite the team from **Users** (each invite is a one-time link valid for 7 days).

Never run `scripts/seed-test-users.ts` against production: it creates QA accounts with known passwords (it refuses Neon URLs).

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

- Server-side sessions in Postgres (`sessions` table stores only a SHA-256 of the cookie token); httpOnly, `SameSite=Lax`, `Secure` in production; 30 days.
- `requireUser()` runs on **every** page, Server Action and route handler; `src/proxy.ts` only redirects logged-out visitors. A unit test (`tests/unit/security.test.ts`) fails the build if an action or route forgets it.
- Roles (see [Roles and company accounts](#roles-and-company-accounts)): **Super admin**, **Editor** and **Company**. Every page and action declares who may use it with `requireUser()`, `requireStaff()` or `requireSuperAdmin()`; anyone else gets a 403. There is always at least one super admin.
- Company accounts are confined to their own company's jobs: every job query goes through `jobScope()` / `canAccessJob()` (`src/lib/jobs/access.ts`), and another company's job returns 404 rather than 403, so its existence isn't revealed. `tests/unit/security.test.ts` fails the build if a staff-only page or action becomes reachable by companies.
- Passwords: argon2id; login and password changes are rate-limited in Postgres (works across serverless instances); keys are hashed, never raw IPs or emails.
- Uploads: checked by their bytes (JPG, PNG, WebP, AVIF only; SVG is refused), max 5 MB, random file names.
- Content: MDX is filtered by `remarkSafeMdx` (no `{expressions}`, imports, unknown components, event handlers or `javascript:` links). The editor shows problems on save; the site strips anything unsafe.
- Every page is `noindex` (`X-Robots-Tag`, robots.txt, meta), never framed, and served `Cache-Control: private, no-store`.
