# Admin panel design: "Frosted glass"

The design spec for the BlogNest admin panel (this repo, `blognest-admin`). It's inspired by two references:

- **Light mode ("Aurora")**: frosted white panels floating over a soft pastel gradient (lavender → pink → mint), crisp blue primary buttons, airy spacing, and big confident numbers.
- **Dark mode ("Ember")**: smoky translucent panels over a deep, dimly lit backdrop with warm amber glows, darker inset strips for key stats, and glowing chart lines.

Both themes share one layout, one component set, and one set of design tokens. Only the token values change between themes. `docs/ADMIN_PANEL_PLAN.md` says which phase builds what. This file defines how it should look and behave.

> The public website (`blognest` repo) keeps its current clean design. The glass look is for the admin app only.

---

## 1. The four layers

Every admin screen is built from the same stack, back to front:

```
┌───────────────────────────────────────────────────────────────┐
│ 1. BACKDROP: full-screen gradient mesh + 3–4 blurred colour   │
│    blobs drifting very slowly (fixed, behind everything)      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2. SHELL: one large frosted frame (radius 28px) with    │  │
│  │    16–24px margin around it, holding sidebar + content  │  │
│  │  ┌──────────┐ ┌──────────────────────────────────────┐  │  │
│  │  │ SIDEBAR  │ │ 3. PANELS: glass cards (radius 20px)  │  │  │
│  │  │ (part of │ │   ┌──────────────────────────────┐    │  │  │
│  │  │  shell)  │ │   │ 4. INSETS: darker/lighter     │    │  │  │
│  │  │          │ │   │ strips inside a panel (stats, │    │  │  │
│  │  │          │ │   │ table header, tabs)           │    │  │  │
│  │  └──────────┘ └──────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

**Rule:** at most **two** `backdrop-filter` layers on top of each other (shell + panel). Insets, table rows, buttons, and chips use plain translucent colour with no blur. This keeps the effect crisp and scrolling smooth.

---

## 2. Design tokens

Defined once in `src/app/admin.css` and scoped to `.admin-root`. Tailwind maps them with `@theme inline`.

```css
.admin-root {
  /* Backdrop */
  --bd-base: #eef0fb;
  --bd-blob-1: #c7d2fe;   /* lavender */
  --bd-blob-2: #fbcfe8;   /* pink */
  --bd-blob-3: #bbf7d0;   /* mint */
  --bd-blob-4: #bae6fd;   /* sky */

  /* Glass */
  --glass-shell: rgb(255 255 255 / 0.45);
  --glass-panel: rgb(255 255 255 / 0.62);
  --glass-inset: rgb(255 255 255 / 0.55);
  --glass-border: rgb(255 255 255 / 0.7);
  --glass-highlight: linear-gradient(180deg, rgb(255 255 255 / 0.65), rgb(255 255 255 / 0) 40%);
  --glass-shadow: 0 1px 0 rgb(255 255 255 / 0.6) inset, 0 20px 50px -20px rgb(30 41 82 / 0.25);
  --glass-solid-fallback: #f8fafc;   /* used when blur is unsupported or transparency is reduced */
  --glass-blur: 24px;
  --glass-saturate: 160%;

  /* Text & accents */
  --ink: #0f172a;
  --ink-muted: #475569;
  --primary: #2563eb;          /* site brand blue: buttons, active nav, links */
  --primary-glow: rgb(37 99 235 / 0.35);
  --accent: #f59e0b;           /* amber: highlights, second chart series */
  --success: #16a34a;
  --danger: #e11d48;
  --chart-1: #2563eb; --chart-2: #f59e0b; --chart-3: #f97316; --chart-4: #10b981; --chart-5: #8b5cf6;

  /* Shape */
  --radius-shell: 28px;
  --radius-panel: 20px;
  --radius-control: 12px;
}

.admin-root.dark {
  --bd-base: #0b0d12;
  --bd-blob-1: #7c2d12;   /* ember */
  --bd-blob-2: #b45309;   /* amber */
  --bd-blob-3: #1e3a8a;   /* deep blue */
  --bd-blob-4: #3f3f46;   /* smoke */

  --glass-shell: rgb(38 38 42 / 0.45);
  --glass-panel: rgb(63 63 70 / 0.42);
  --glass-inset: rgb(24 24 27 / 0.45);     /* the darker stat strip from the reference */
  --glass-border: rgb(255 255 255 / 0.1);
  --glass-highlight: linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0) 35%);
  --glass-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset, 0 30px 60px -25px rgb(0 0 0 / 0.7);
  --glass-solid-fallback: #27272a;

  --ink: #f4f4f5;
  --ink-muted: #a1a1aa;
  --primary: #3b82f6;
  --primary-glow: rgb(59 130 246 / 0.45);
  --accent: #fb923c;           /* the warm orange from the dark reference */
  --success: #22c55e;          /* brighter on dark glass for AA contrast */
  --danger: #fb7185;
  --chart-1: #3b82f6; --chart-2: #fb923c; --chart-3: #f97316; --chart-4: #34d399; --chart-5: #a78bfa;
}
```

**Glass surface recipe** (one utility class, `.glass`, plus `.glass-shell` and `.glass-inset` variants):

```css
.glass {
  background: var(--glass-highlight), var(--glass-panel);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-panel);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}
/* Browsers without backdrop-filter, and people who ask for less transparency, get solid panels. */
@supports not (backdrop-filter: blur(1px)) {
  .glass, .glass-shell { background: var(--glass-solid-fallback); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass, .glass-shell { backdrop-filter: none; background: var(--glass-solid-fallback); }
}
```

**Typography:** Inter with `font-variant-numeric: tabular-nums` on every number.

| Use | Size / weight |
| --- | --- |
| Page title ("My Dashboard") | 28px / 700 |
| Panel title | 16px / 600 |
| Big stat number | 36–40px / 700, tight tracking |
| Labels | 13px / 500, muted |
| Table text | 14px |

---

## 3. Layout

### Desktop (≥ 1280px)

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ ◆ BlogNest   │  Hi, Hasham 👋                 [🔍] [🔔•] [⚙ Customize] [+ New ▾]│
│ [Search… ⌘K] │  Here's what's happening today                                  │
│              │ ┌───────────────┐┌───────────────┐┌───────────────┐┌──────────┐ │
│ ▣ Dashboard  │ │ Published     ││ Active jobs   ││ Subscribers   ││ Unread   │ │
│ ✎ Posts      │ │ posts   124   ││     38  ╱╲╱   ││  2,410  ╱╲╱   ││ messages │ │
│ 💼 Jobs       │ │ ▲ +12% vs last││ ▼ −4% vs last ││ ▲ +36%        ││   7      │ │
│ ▦ Categories │ └───────────────┘└───────────────┘└───────────────┘└──────────┘ │
│ 👤 Authors    │ ┌──────────────────────────────────────────┐┌────────────────┐ │
│ 🖼 Media      │ │ Traffic & engagement  [12M][6M][30D][7D] ││ Top job        │ │
│ ✉ Messages   │ │  ╱‾‾╲    ╱‾‾‾‾╲___╱‾‾  page views (blue)  ││ categories     │ │
│ 👥 Users      │ │ ╱    ╲__╱             apply clicks (amber)││ Software ▬▬▬▬▬ │ │
│              │ │            [tooltip card on hover]         ││ Design   ▬▬▬   │ │
│ ── APPS ──   │ └──────────────────────────────────────────┘│ Sales    ▬▬    │ │
│ ⚡ Quick post │ ┌────────────────┐┌─────────────────────────┐└────────────────┘ │
│              │ │ Content mix    ││ Recent posts & jobs     View all → │      │
│ ⚙ Settings   │ │   (bubble /    ││ [img] Title   Type  Date  Status   │      │
│ ? Help       │ │    donut)      ││ [img] …       Job   …     ●Live    │      │
│ ◐ Dark  [●─] │ │ ● Tech  ● Life ││ [img] …       Post  …     ●Draft   │      │
│ (◉) Hasham ⌄ │ └────────────────┘└─────────────────────────────────────┘      │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

- The **shell** floats with a 20px margin on all sides, so the backdrop is visible around it.
- The **sidebar** is 264px wide and part of the shell, with a slightly stronger tint. The active item is a solid blue pill with a soft glow (`box-shadow: 0 8px 24px -8px var(--primary-glow)`). Settings lives only in the bottom group, not in the main nav. Users is hidden for Editors.
- The **right rail** is optional on wide screens (≥ 1536px): avatar, role badge, a row of round **quick-action buttons** (New post · New job · Upload · Messages), a **featured job card** (amber→orange gradient, current featured job and days left), and an **activity list** ("Hasham published *Frontend Developer*, 2h ago").

### Tablet (768–1279px)
The sidebar collapses to a 76px icon rail with tooltips, and stat cards go to 2 columns. The right rail moves below the main content.

### Mobile (< 768px)
The shell goes edge-to-edge (no margin, radius 0 at the top). The sidebar becomes a glass slide-over drawer opened from the top bar. Stat cards scroll horizontally with snap. "+ New" becomes a floating round button bottom-right. Tables turn into stacked cards.

---

## 4. Components

Built in `src/components/admin/`. Radix primitives give keyboard support and accessibility. Glass styling sits on top.

| Component | Looks like | Notes |
| --- | --- | --- |
| `AdminBackdrop` | Gradient mesh + blurred blobs drifting over ~40s | CSS-only (`@keyframes` on transforms). Static with reduced motion. Never re-renders. |
| `GlassShell`, `GlassPanel`, `GlassInset` | Layers 2–4 above | `as` prop for semantic tags |
| `Sidebar` / `NavItem` | Logo, ⌘K search field, grouped nav, bottom Settings / Help / Dark mode switch / user card | Active pill uses the primary glow. Unread counts as small badges. |
| `Topbar` | "Hi, {firstName} 👋" + subtitle, icon buttons (search, notifications with red dot), **Customize**, **+ New** dropdown (Post, Job, Category, Author, Upload) | Sticky inside the content area |
| `StatCard` | Title, ⋮ menu, big number, optional ▲/▼ delta "vs last month", **sparkline area chart** fading to transparent | Delta colour: green up / rose down. The "Unread messages" card shows a count only (no delta). |
| `StatStrip` | Inset bar: 3–4 icon + label + value pairs in one row | Used on detail pages (e.g. a job: views, apply clicks, days left) |
| `ChartCard` | Title, range tabs **12M / 6M / 30D / 7D**, **Export CSV**, smooth area/line chart, dashed "projected" line, glass tooltip with values + % change | Recharts `AreaChart` with gradient fills |
| `ProgressList` | Label, value, thin rounded bar | Bars animate width on mount |
| `MixChart` | Bubble cluster or donut with % in the centre + legend | Same data, user picks the style in **Customize** |
| `DataTable` | Inset header row, thumbnail column, status pills (Live = green, Draft = amber, Scheduled = blue, Expired = rose), row hover, "Show 5 from 12" + pager | Sorting, search, bulk select (publish / unpublish / delete) |
| `FeaturedJobCard` | Amber→orange gradient card with soft noise, company, title, "Closes in 6 days" | One per dashboard; links to the job |
| `QuickActions` | Round glass icon buttons with labels | New post, New job, Upload, Messages |
| `ActivityFeed` | Avatar, name, action, time; amber pill for important events | From `audit_log` |
| `CommandPalette` | ⌘K / Ctrl K glass dialog: search posts, jobs, pages, and actions | `cmdk` |
| `GlassDialog` / `GlassDrawer` | Confirmations, media picker, image placement editor | Background dims + extra blur |
| `Toast` | Small glass pill bottom-right ("Job published · View") | `sonner` |
| Form controls | Translucent fill, 1px glass border, blue focus ring with glow | Error state: rose border + message under the field |
| `EmptyState` | Soft illustration + one sentence + primary button | Every list and chart has one; never fake numbers |

**Motion** (`motion`): panels fade and rise 8px on page enter, staggered by 40ms. Numbers count up once. Chart lines draw in. Hover lifts cards by 2px. All of this turns off with `prefers-reduced-motion`.

---

## 5. Page by page

| Page | Design notes |
| --- | --- |
| **Login** | Centred glass card over the animated backdrop. Logo, email, password, "Sign in" (primary glow), theme toggle in the corner. |
| **Dashboard** | Layout above. **Customize** lets each user hide, show, and reorder cards (saved per user). |
| **Posts / Jobs lists** | `DataTable` with a glass toolbar (search, status chips, category select), bulk actions bar that slides up when rows are selected. |
| **Job form** | Form panels on the left (Basics · Location & type · Details lists · How to apply · Publishing), live **preview card** matching `/jobs` on the right. Stat strip on top for existing jobs. |
| **Post editor** | Writing panel at 90% opacity. Side panel tabs: *Details · Images · SEO · Publish*. Images tab: hero large, up to 3 image cards each with a "Show this image" dropdown and a mini outline showing where it lands. |
| **Media** | Masonry grid of glass tiles. Drag-and-drop upload zone with a glowing dashed border. Side drawer for alt text and "used in". |
| **Messages** | Two-pane inbox: list left (unread = bold + blue dot), message right, "Reply by email". |
| **Settings** | Glass sections with switches (Ads on/off), AdSense ID inputs, live ads preview placeholder. |
| **Users** | Avatar cards with role badges (Admin = blue, Editor = amber). |

---

## 6. Real data for the charts

| Card | Data source |
| --- | --- |
| Published posts, active jobs, subscribers (+ "vs last month"), unread messages | Counts from the shared database |
| Traffic & engagement | `daily_stats`, filled by the beacon on the **public site**: counts per page per day only, no cookies, IPs or personal data |
| Top job categories | `daily_stats` job views grouped by category |
| Content mix | Posts by category + jobs by category |
| Job stat strip | Views and apply clicks for that job |

Until there's data, each chart shows its `EmptyState` ("Stats will appear here after your first visitors").

---

## 7. Accessibility and performance rules

1. **Contrast first.** Body text on glass meets WCAG AA (4.5:1). Long-text panels use ≥ 85% opacity. Check both themes over the brightest part of the backdrop.
2. **Focus is always visible.** 2px primary ring + 4px soft glow.
3. **Respect user settings:** `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-color-scheme`.
4. **Blur budget:** max 2 stacked `backdrop-filter`s. Blobs are pre-blurred on a fixed layer. `will-change: transform` only on the blobs.
5. **Keyboard:** everything reachable with Tab. ⌘K palette. `Esc` closes dialogs. Arrow-key row focus in tables.
6. **Speed:** first content < 1.5s, interactions < 100ms, charts via `next/dynamic`.
7. **No layout shift:** cards and charts reserve height while loading (glass skeleton shimmer).

---

## 8. Libraries

| Purpose | Package |
| --- | --- |
| Accessible primitives | `@radix-ui/react-*` |
| Charts | `recharts` |
| Command palette | `cmdk` |
| Drag to reorder | `@dnd-kit/core`, `@dnd-kit/sortable` |
| Toasts | `sonner` |
| Icons / animation | `lucide-react`, `motion` |

---

## 9. Design QA checklist (each phase)

- [ ] Looks right in **light and dark** at 1440px, 1024px, 768px, and 390px wide
- [ ] Text contrast passes AA on every panel in both themes
- [ ] Works with reduced motion and reduced transparency turned on
- [ ] No more than 2 stacked blur layers
- [ ] Every list and chart has a real empty state
- [ ] Everything works with the keyboard alone
- [ ] Screenshot of each new screen added to the PR description
