# Admin panel plan

This plan lets you post blogs, jobs, and everything else on BlogNest from a web dashboard instead of editing files in the code.

The admin panel is its **own Next.js app in its own repo** (`blognest-admin`, this repo), separate from the public site (`blognest`). Both apps talk to the **same PostgreSQL database**.

The plan is split into **7 phases**. Each phase is a single working session: copy that phase's prompt, run it in the repo it names, check the result, commit, then start the next one. Don't skip phases.

> **Before you start:** both apps use **Next.js 16**. `middleware.ts` is now **`proxy.ts`**, and `params` / `searchParams` / `headers()` / `cookies()` are all `await`ed. Every prompt says to read the bundled docs in `node_modules/next/dist/docs/` first.

> **Status (2 Oct 2026): all 7 phases are built.** See "Implementation notes" at the end for where the build differs from the original prompts, and `README.md` for setup and deployment.

---

## What you'll be able to do when it's finished

| Area | You can… |
| --- | --- |
| **Blog posts** | Write, edit, preview, save as draft, schedule, publish, unpublish, delete. Set category, tags, SEO title/description, and featured / trending / editor's pick. Turn ads off for a single post. |
| **Post images** | A **hero image** plus up to **3 more images**, each placed *After the intro*, *Middle of the post*, *Before the conclusion*, or *Under a specific heading*. Alt text and optional caption. The preview shows each image in its exact spot. |
| **Jobs** | Company, location, job type, on-site/remote, experience, salary, responsibilities, requirements, benefits, apply link or email, deadline. Jobs disappear after the deadline. Featured flag. Duplicate an old job. |
| **Categories** | Add, rename, reorder, remove blog and job categories. |
| **Authors** | Photo, bio, links. |
| **Media** | Upload images once and reuse them. |
| **Messages** | Contact-form messages and newsletter sign-ups. |
| **Ads** | Turn ads on/off and paste AdSense IDs. |
| **Users** | **Admin** (everything) or **Editor** (posts, jobs, media, messages; no settings or users). |

Everything you publish shows up on the live site within seconds, without redeploying.

---

## How the two repos fit together

```
            ┌──────────────────────────┐        ┌──────────────────────────┐
            │  blognest-admin (this)   │        │  blognest (public site)  │
            │  admin.yourdomain.com    │        │  yourdomain.com          │
            │                          │        │                          │
            │  • owns the DB schema +  │        │  • reads content from DB │
            │    migrations (Drizzle)  │        │    (falls back to files) │
            │  • login, all CRUD       │──POST─▶│  • /api/revalidate       │
            │  • uploads to Blob       │ secret │    (clears cache tags)   │
            │                          │        │  • /api/stats beacon     │
            └────────────┬─────────────┘        └────────────┬─────────────┘
                         │         ┌──────────────┐          │
                         └────────▶│ Neon Postgres│◀─────────┘
                                   └──────────────┘
```

Rules for the split:

1. **The admin repo owns the database.** Drizzle schema and migrations live in `blognest-admin/src/db/`. The public site gets a **read-only copy** of the schema file (`blognest/src/db/schema.ts`). Any time the schema changes, copy it across in the same session.
2. **Revalidation goes over HTTP.** `revalidatePath` / `revalidateTag` only work inside the app that serves the page. So after every save, the admin calls `POST {PUBLIC_SITE_URL}/api/revalidate` with `REVALIDATE_SECRET` and a list of tags/paths. The public site checks the secret and revalidates.
3. **Shared rules are copied, not imported.** The Zod schemas (`schema.ts` for content and jobs), `toc.ts` (`placeableSectionIds`, `injectArticleImages`), the category lists, and the MDX rendering pipeline (`MdxContent` + `prose-article` styles) are copied into `blognest-admin/src/shared/` with a header comment `// Copied from blognest/<path>. Keep in sync.` That way the admin's validation and preview always match the site. (Later you can move them into a shared npm package or a monorepo.)
4. **The stats beacon lives on the public site.** The admin only reads `daily_stats`.
5. **Separate deploys.** Two Vercel projects, both with the same `DATABASE_URL`.

## Recommended tools

| Need | Choice |
| --- | --- |
| Database | **PostgreSQL** on **Neon** |
| Database code | **Drizzle ORM** + `drizzle-kit` migrations |
| Login | **Auth.js (NextAuth v5)** credentials, optional Google |
| Image uploads | **Vercel Blob** |
| Post editor | Markdown editor with live preview |
| Hosting | **Vercel** (two projects) |
| UI | **Radix UI**, **Recharts**, **cmdk**, **dnd-kit**, **sonner**, **lucide-react**, **motion** (see `docs/ADMIN_DESIGN.md`) |
| Rate limiting | A small `rate_limits` table in Postgres (in-memory counters don't work across serverless instances) |

Environment variables:

| Variable | Admin | Public site |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | ✅ |
| `AUTH_SECRET` | ✅ | |
| `BLOB_READ_WRITE_TOKEN` | ✅ | |
| `PUBLIC_SITE_URL` | ✅ | |
| `REVALIDATE_SECRET` | ✅ | ✅ |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (optional) | ✅ | |

---

## Database tables

```
users          id, name, email (unique), password_hash, role ('admin' | 'editor'), created_at
authors        slug (pk), name, type, role, bio, avatar, links (jsonb)
categories     slug (pk), kind ('blog' | 'job'), name, headline, description, sort_order
articles       slug (pk), title, excerpt, body (markdown/MDX), category → categories, tags text[],
               author → authors, status ('draft' | 'published'), published_at, updated_at,
               featured, trending, editors_pick,
               cover_image, cover_alt, cover_width, cover_height,   ← the HERO image
               images jsonb default '[]',  ← up to 3: [{ src, alt, caption, width, height, placement }]
               seo_title, seo_description, canonical_url, noindex, ads,
               created_by → users, created_at
jobs           slug (pk), title, company, company_website, city, country, work_model,
               employment_type, category → categories, experience, salary, summary,
               responsibilities text[], requirements text[], benefits text[],
               apply_url, apply_email, posted_at, deadline, status, featured,
               created_by → users, created_at, updated_at
media          id, url, alt, width, height, size_bytes, uploaded_by → users, created_at
messages       id, name, email, topic, message, read (bool), created_at
subscribers    id, email (unique), confirmed (bool), created_at
settings       key (pk), value (jsonb)
audit_log      id, user_id, action, entity, entity_slug, created_at
daily_stats    day (date), path, kind ('view' | 'apply_click'), entity_slug, count
               primary key (day, path, kind)   ← no cookies, no IPs, no personal data
user_prefs     user_id (pk) → users, theme ('light' | 'dark' | 'system'), dashboard_layout jsonb
rate_limits    key (pk), count, window_start   ← login + stats beacon limits
```

`images[].placement` is one of `after-intro`, `middle`, `before-conclusion`, or `section:<heading-id>`, validated by `articleImageSchema`.

Indexes: `articles(status, published_at desc)`, `jobs(status, posted_at desc)`, `jobs(category)`, `articles(category)`.

---

## Admin pages

The admin app has its own domain, so routes start at `/`:

```
/login                 Sign in
/                      Dashboard
/posts                 List + "New post"
/posts/new             Editor
/posts/[slug]          Edit / preview / publish / delete
/jobs                  List + "New job"
/jobs/new              Job form
/jobs/[slug]           Edit / duplicate / close early / delete
/categories            Blog + job categories
/authors               Authors
/media                 Image library + upload
/messages              Contact messages + subscribers (CSV export)
/settings              Ads, site info, social links   (admin only)
/users                 Invite / change role / remove  (admin only)
/design                Style guide                    (dev only)
```

The whole admin app is `noindex` (`robots.txt` disallows everything, plus `X-Robots-Tag: noindex` header).

### Look and feel

Frosted-glass design with light "Aurora" and dark "Ember" themes. Full spec in **[`docs/ADMIN_DESIGN.md`](./ADMIN_DESIGN.md)**. **Every phase must follow it.**

---

## Security rules (every phase)

1. **Every** Server Action and route handler checks the session and role on the server. `proxy.ts` only redirects logged-out visitors to `/login`; it's never the only check.
2. All input is validated with the shared Zod schemas on the server before it touches the database.
3. Passwords hashed (argon2 or bcrypt). Login rate-limited via `rate_limits`.
4. Uploads: `jpg`, `png`, `webp`, `avif` only, max 5 MB, random file names.
5. Markdown preview uses the same safe MDX pipeline as the site. Raw `<script>` never allowed.
6. Deletes ask for confirmation. Published content can be unpublished instead.
7. After every save, call the public site's `/api/revalidate`. `/api/revalidate` rejects requests without the correct secret (constant-time compare).

---

## The phases

### Phase 1 (admin repo): database and content import

> Read `AGENTS.md`, `docs/ADMIN_PANEL_PLAN.md`, and the Next.js 16 docs in `node_modules/next/dist/docs/` before writing code.
> Add Drizzle ORM (Neon serverless driver) and create every table from "Database tables" as schema + migrations in `src/db/`. Add a typed env module `src/lib/env.ts` (Zod) with `DATABASE_URL` and a `.env.example`.
> Copy the shared files from the public site into `src/shared/` (see "How the two repos fit together", rule 3), reading them from `BLOGNEST_DIR` (default `../blognest`).
> Write `scripts/import-content.mjs` (npm script `db:import`) that reads from `BLOGNEST_DIR` and upserts every article from `content/articles/*.mdx` (including `images`), every author from `content/authors/*.json`, every job from `content/jobs/*.json` (skip `sample: true`), and the blog and job categories. Safe to run twice.
> Add Vitest. Run lint, typecheck, and tests.

**Check:** `npm run db:import`, then Neon's table viewer shows all articles (with their images), authors, jobs, and categories.

### Phase 2 (public site repo `blognest`): read from the database

> Read `AGENTS.md` and the Next.js 16 docs first. Copy `../blognest-admin/src/db/schema.ts` to `src/db/schema.ts` (read-only copy, header comment says so).
> Implement `PostgresContentRepository` (implements `ContentRepository` in `src/lib/content/repository.ts`) and a matching job repository behind `src/lib/jobs/index.ts`. Use the database when `DATABASE_URL` is set and fall back to files otherwise. Load categories from the database with the typed lists as fallback.
> Use `"use cache"` + `cacheTag()` with tags `articles`, `jobs`, `categories`, `settings`. Add `POST /api/revalidate` that checks `REVALIDATE_SECRET` (constant-time) and accepts `{ tags?: string[], paths?: string[] }`.
> Keep `isPubliclyVisible` and `isJobVisible` exactly as they are. Lint, typecheck, unit tests, build, and e2e must pass.

**Check:** the live site looks exactly the same as before.

### Phase 3a (admin repo): login and the glass shell

> Read `docs/ADMIN_DESIGN.md` fully before writing code.
> Add Auth.js v5 with credentials and the `users` table. Roles `admin` / `editor`. Add `npm run admin:create -- email@example.com "Full Name"` that prints a temporary password.
> Create `src/proxy.ts` that redirects logged-out visitors to `/login`, and a `requireUser(role?)` helper that every page and Server Action calls.
> Build the glass design system from sections 1–4: tokens in `src/app/admin.css` (Aurora + Ember), `.glass` / `.glass-shell` / `.glass-inset` with fallbacks, `AdminBackdrop`, `GlassShell`, `GlassPanel`, `GlassInset`, `Sidebar`, `Topbar`, form controls, `GlassDialog`, `GlassDrawer`, `Toast`, `EmptyState`, and the ⌘K `CommandPalette`. Use Radix.
> Build the layout: floating shell, sidebar (Dashboard, Posts, Jobs, Categories, Authors, Media, Messages, Users; bottom group: Settings, Help, dark-mode switch, user card), top bar, tablet icon rail, mobile drawer. Save each user's theme in `user_prefs`.
> Build the login page, and a dev-only style guide at `/design` showing every component in both themes.
> Whole app `noindex`. Rate-limit login. Add a `revalidateSite({ tags, paths })` helper that calls the public site's `/api/revalidate`. Unit tests for `requireUser`; Playwright e2e for login/logout, redirect when logged out, and theme persistence. Run the design QA checklist.

**Check:** log in and out, the dashboard is blocked when logged out, `/design` looks right in both themes on desktop and phone.

### Phase 3b (both repos): dashboard and stats

> Read `docs/ADMIN_DESIGN.md` sections 3, 4, 6 and 7.
> **In `blognest`:** add `POST /api/stats` (rate-limited, accepts only a known path/kind, never stores IPs or cookies) that increments that day's `daily_stats` row. Send it with `navigator.sendBeacon` from article and job pages (`view`) and the job Apply button (`apply_click`). Skip bots.
> **In `blognest-admin`:** build the dashboard as in the layout sketch: 4 `StatCard`s (published posts, active jobs, subscribers with deltas; unread messages as a count), `ChartCard` "Traffic & engagement" (12M/6M/30D/7D, CSV export), `ProgressList` "Top job categories", `MixChart` "Content mix", `DataTable` "Recent posts & jobs", and on wide screens `QuickActions`, `FeaturedJobCard`, and `ActivityFeed` (reads `audit_log`; empty until Phase 4 writes to it). Add lists for drafts, scheduled posts, and jobs expiring within 7 days. **Customize** hides/shows/reorders cards (saved in `user_prefs.dashboard_layout`). Real empty states only. Charts via `next/dynamic` with reserved height.
> Run the design QA checklist.

**Check:** visit a few articles and click Apply on a job, then see the numbers move.

### Phase 4 (admin repo): jobs manager

> Follow `docs/ADMIN_DESIGN.md` (DataTable, job form with live preview card, stat strip).
> Build `/jobs` (search, status/category filters, "Expired" filter, pagination) and `/jobs/new` + `/jobs/[slug]` with Server Actions and `useActionState`.
> Validate with the shared `jobSchema`. Fields: title, company, company website, city, country, work model, job type, category, experience, salary, summary, responsibilities / requirements / benefits (add/remove/reorder), apply URL or email, posted date, deadline, featured, status.
> Slug from title + company, editable, unique. Buttons: Duplicate, Close now, Unpublish, Delete (confirm), and "View on site" (links to `PUBLIC_SITE_URL/jobs/[slug]`).
> After every save, call `revalidateSite` with tag `jobs` and paths `/`, `/jobs`, `/jobs/[slug]`, `/sitemap.xml`. Log every change in `audit_log`. E2E: create a job → appears on the public `/jobs` → unpublish → gone.

**Check:** post a real job and see it on the homepage and `/jobs`.

### Phase 5 (admin repo): post editor and media library

> Follow `docs/ADMIN_DESIGN.md` (opaque writing panel, side panel tabs Details · Images · SEO · Publish, mini outline in the Images tab).
> Build `/posts` (list, filters, pagination) and the editor at `/posts/new` + `/posts/[slug]`: Markdown text area with toolbar (headings, bold, italic, link, list, quote, image, table) and a Preview tab rendering through the shared `MdxContent` with `prose-article` styles. Side panel: title, slug, excerpt (counter), category, tags, author, SEO title/description (Google snippet + counters), featured / trending / editor's pick, ads, noindex, canonical URL.
> Status buttons: Save draft, Schedule, Publish now, Unpublish. Autosave every 30s; warn before leaving with unsaved changes.
> **Images** panel: required hero image (library or upload, required alt) saved to `cover_*`; 0–3 more images (drag to reorder) each with picker, required alt, optional caption, and a "Show this image" dropdown (*After the intro*, *Middle of the post*, *Before the conclusion*, and *Under "<heading>"* for every `##`/`###` via shared `placeableSectionIds`). Warn when a chosen heading no longer exists. Save to `images`, validated with `articleImageSchema`, with real width/height. Preview passes `images` to `MdxContent`.
> Validate with `articleFrontmatterSchema`. Show reading time.
> Build `/media` with Vercel Blob (images only, max 5 MB, store width/height/alt). All pickers choose from the library or upload. Show "used in" and block deleting an image a post still uses.
> On save, `revalidateSite` with tag `articles` and the article, blog lists, category page, homepage, RSS, and sitemap paths. E2E: draft → publish → visible on site.

**Check:** publish a test post with a hero and two more images (one *Middle*, one *Under a heading*), confirm placement on the live page, then unpublish.

### Phase 6 (both repos): categories, authors, messages, settings

> Follow `docs/ADMIN_DESIGN.md`.
> **Admin:** `/categories` (blog/job tabs, add, rename, edit description, drag to reorder; can't delete while in use), `/authors` (CRUD with avatar upload), `/messages` (contact messages with read/unread; subscribers with CSV export), `/settings` (admin only: ads on/off, AdSense client ID and slot IDs `in-article`, `sidebar`, `below-article`, `listing`, contact email, social links). Revalidate tags `categories` / `settings` on save.
> **Public site:** update `src/app/actions.ts` so contact messages and newsletter sign-ups are also saved to the database. Read ads and site settings in `src/lib/ads.ts` and `src/lib/site.ts` from `settings`, with env vars as fallback.

**Check:** turn on ad placeholders in settings and see them on a post.

### Phase 7 (admin repo): users, roles, launch review

> Build `/users` (admin only): invite by email with a role, change role, remove (never the last admin). Editors can't access settings or users: enforce on the server in every action and hide their links.
> Finish the dashboard `ActivityFeed` (filters, "View all" page). Add a "Change password" page.
> Run the design QA checklist on every page and a security review: every Server Action calls `requireUser`, every input validated, uploads restricted, `/api/revalidate` secret checked, nothing cached publicly or indexed. Lint, typecheck, unit tests, build, e2e; fix failures.

**Check:** log in as an Editor and confirm Settings and Users are hidden and blocked.

---

## Going live checklist

- [ ] Two Vercel projects (public site + admin), both with `DATABASE_URL` and `REVALIDATE_SECRET`.
- [ ] Admin on its own subdomain (e.g. `admin.yourdomain.com`).
- [ ] Delete the sample jobs in `blognest/content/jobs/`.
- [ ] Set `NEXT_PUBLIC_SITE_URL` (public) and `PUBLIC_SITE_URL` (admin) to the real domain.
- [ ] Add real jobs and 15–20 real articles before applying for AdSense.
- [ ] Verify the site in Google Search Console and submit `/sitemap.xml`.
- [ ] Turn ads on from `/settings` once AdSense approves.

---

## Implementation notes (how it was actually built)

Where the build differs from the prompts above, and why:

| Plan said | Built | Why |
| --- | --- | --- |
| Auth.js v5 credentials provider | Small built-in session system: argon2id passwords, server-side sessions in Postgres, `requireUser(role?)` | Auth.js v5 is still in beta, and its credentials provider only supports JWT sessions, so removed users and changed roles would stay signed in until the token expired. Database sessions take effect immediately and are easy to audit. |
| "Invite by email" | Invite creates a one-time link (valid 7 days, stored hashed) that the admin sends | The admin has no email service yet. Plug Resend into `inviteUser` later if you want automatic emails. |
| `"use cache"` + `cacheTag()` on the site | `unstable_cache` with tags, plus `revalidateTag(tag, { expire: 0 })` | The site doesn't use Cache Components. Switching would be a site-wide migration; the tag-based cache works the same for revalidation. |
| Login rate limit with `src/lib/forms/rate-limit.ts` | `rate_limits` table in Postgres | In-memory counters don't hold across serverless instances. |
| "Close now" sets the deadline to today | Sets it to **yesterday** | The site shows a job through the end of its deadline day, so "today" would keep it live until midnight. |
| Categories are typed lists on the site | Typed lists are now the **fallback**; with a database, the site replaces them in place from the `categories` table (`ensureSiteData()`), and the content schemas accept any slug | So categories can be added in the admin without a code change. Files in `content/` are still checked against the built-in lists. |
| "Safe MDX pipeline the site already uses" | New `remarkSafeMdx` plugin in the site (synced here) | MDX can run JavaScript in `{expressions}`. With several editors that's a server-side code-execution risk, so expressions, imports, unknown components, event handlers and `javascript:` links are removed on the site and rejected in the editor. All existing articles pass unchanged. |
| Local development DB | A private Postgres in `.data/pg` (port 54329), started with `npm run db:local` | No account or password needed, and it never touches another Postgres on the machine. |
| Settings read from DB in `ads.ts` / `site.ts` | Same, via a shared `settings-schema.ts`; placeholders switched on in the admin show in production too | So you can check placements on the live site before AdSense approval. Turn them off before applying. |
| Uploads with Vercel Blob | Blob in production; in development, files go to the site's `public/uploads/` | So both apps show local uploads without a Blob token. Production refuses local uploads. |

### Changes made in the public site (`blognest`)

These are **not committed**: they sit on top of your existing uncommitted work so you can review them together.

- `src/db/schema.ts` (read-only copy), `src/lib/db.ts`, `src/lib/site-data.ts`, `src/lib/categories-loader.ts`, `src/lib/settings.ts`, `src/lib/settings-schema.ts`
- `src/lib/content/postgres-repository.ts`, `src/lib/jobs/index.ts` (database reads), `src/lib/jobs/visibility.ts` (moved out so it can be shared)
- `src/app/api/revalidate/route.ts`, `src/app/api/stats/route.ts`, `src/components/analytics/StatsBeacon.tsx`
- `src/lib/content/safe-mdx.ts` and its use in `MdxContent.tsx`
- `src/lib/forms/store.ts` and `src/app/actions.ts` (contact messages and sign-ups are saved to the database too)
- Categories, ads and contact settings: `src/lib/categories.ts`, `src/lib/jobs/categories.ts`, `src/lib/ads.ts`, `src/lib/site.ts`, schemas, and pages that load them
- `next.config.ts` (`distDir` override for test builds, Blob image host), `.env.example` (new), README env table, unit tests
