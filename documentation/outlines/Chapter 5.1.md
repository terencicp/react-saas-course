# Chapter 5.1 — The first project: file structure and routing

## Chapter framing

Unit 4 closed with the student writing React components and shipping a themed product surface, but every component lived inside a single `app/page.tsx` route. Unit 5 is where Next.js stops being a runtime around the React tree and starts being the framework — the URL space, the navigation model, the rendering primitives. Chapter 5.1 is the file-system lesson: the student learns how a folder under `app/` becomes a URL, how layouts compose around pages, how dynamic segments capture URL parts as parameters, how route groups organize without affecting the URL, and how the two advanced primitives — parallel and intercepting routes — solve patterns that JavaScript-based modal state cannot.

The senior framing for the chapter: **the App Router is a contract between the file system and the URL space, and every file convention is a structural decision the framework holds the student to.** `page.tsx` is a route. `layout.tsx` is the shell every nested page renders inside. `[id]` is a parameter. `(marketing)` is organization without URL impact. `@sidebar` is a slot. `(.)photo` is an interception. The student leaves recognizing the convention the moment they see a folder name, knowing what shape the corresponding file's default export must take, and reaching for the file the framework offers before inventing a JavaScript-side workaround.

Chapter 1.4.1 already had the student read the starter's file tree and recognize that `app/page.tsx` is the index route. Chapter 4.1.2 taught the root layout's HTML document shape — `<html>`, `<body>`, the metadata API. Both lessons named the existence of file-system routing without teaching it as a system. This chapter is the system: the rules, the conventions, the senior patterns that compose them. The chapter does not teach Server Components vs. Client Components as concepts (Chapter 5.2 owns that boundary) — every component the student writes in this chapter is a Server Component by default and the chapter names the boundary lightly when a Client Component is needed (a `<Link>` doesn't need one, but a `useRouter` call does). The chapter does not teach `loading.tsx`, `error.tsx`, or Suspense (Chapter 5.3 owns async UI). It does not teach the rendering or caching model (Chapter 5.4 owns that). It owns the URL surface, period.

The 2026 reality the chapter rests on. Next.js 16, released in February 2026, is the pinned version. The App Router is the only router the course teaches — Pages Router gets one line in 5.1.1 as the deprecated predecessor named for recognition only. Turbopack is the dev and build bundler default. File conventions stable in 16: `page.tsx`, `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `default.tsx`, `route.ts` (route handlers, Chapter 7.5), plus the SEO file conventions (Chapter 5.6). Route groups (`(folder)`), dynamic segments (`[param]`), catch-all (`[...param]`), optional catch-all (`[[...param]]`), parallel slots (`@slot`), and intercepting prefixes (`(.)`, `(..)`, `(..)(..)`, `(...)`) are all stable. Private folders (`_folder`) for non-routable colocation are stable and the senior reach for feature-internal files. The `<Link>` component's `prefetch` prop has three states (`null`/`auto`, `true`, `false`); the `null` default behaves differently for static vs. dynamic routes — `null` prefetches the static layout on viewport intersection and the dynamic data on hover, `true` prefetches everything, `false` disables both. `redirect`, `notFound`, and `permanentRedirect` work in Server Components, Client Components, route handlers, and Server Actions; their HTTP semantics (307/308/303) are stable.

Threads that must run through every lesson:

- **The file system is the URL space; the convention is the contract.** Every routable file convention (`page.tsx`, `layout.tsx`, `route.ts`) and every folder-naming convention (`[id]`, `(group)`, `@slot`, `_private`, `(.)intercept`) carries a meaning the framework enforces. The senior reflex: when looking at a folder under `app/`, the student names the URL it produces and the rendering role of each file in it without opening the contents. The chapter installs this fluency.
- **Co-location by feature is the architectural principle, and `app/` is its canonical shape.** Architectural Principle #1 — co-locate by feature, not by layer — gets introduced in Lesson 5.1.1 and named at every later branch point in the chapter. Route-specific components, hooks, helpers, and data-access functions live next to the route that uses them, inside the route folder, under a `_components/` or `_lib/` private folder when grouping helps. The "by-layer" alternative — top-level `components/`, `hooks/`, `lib/`, `utils/` directories that mirror the file's *kind* instead of its *purpose* — is named once as the legacy form the App Router rejects, then dropped. The senior recognition: a route folder reads like a feature folder; deleting it deletes the feature without orphaned imports.
- **Private folders (`_folder`) are the senior form for non-routable colocation.** A folder prefixed with `_` is invisible to the routing system. The 2026 reflex: any time a route folder contains files that aren't routable conventions (a component the route uses, a server-side helper, a Zod schema), they go under `_components/`, `_lib/`, `_actions/`, `_schemas/`, never as bare files in the route folder. The reason: bare files compete with the framework's future file conventions, future Next.js versions may claim file names the project already uses, and the underscore prefix is the structural enforcement that prevents the collision.
- **Layouts compose; pages don't.** A page is a leaf. A layout is a frame the page renders inside, and layouts compose down the tree — the root layout wraps every nested layout, which wraps every nested page. The senior reach: shared UI (a nav, a sidebar, a global wrapper) goes in the highest layout that all consumers share; per-page UI goes in the page itself. The student never duplicates a navbar across pages because every page that needs it shares an ancestor layout.
- **Route groups solve "shared layout, different URL space" and "different layouts, same URL space."** The folder `(marketing)` doesn't appear in the URL; everything inside renders under a shared layout. Two route groups at the same level (`(marketing)/page.tsx`, `(app)/dashboard/page.tsx`) let an app have a public landing page and an authenticated dashboard with completely different layouts but no `/marketing/` or `/app/` URL prefix. The senior recognition: route groups are organization, not routing — they don't change the URL, they change which layout wraps which page.
- **Dynamic segments are parameters, and the framework hands them to the page as a Promise.** A folder `[id]` produces a URL like `/invoices/42`, and the corresponding `page.tsx` receives `params: Promise<{ id: string }>`. In Next.js 16, `params` and `searchParams` are async — the student awaits them in Server Components or unwraps with `React.use()` in Client Components. The lesson names the async shape once, here, because every dynamic route in the chapter uses it; Chapter 5.4.8 cashes in the full async request APIs surface.
- **Catch-all is for legitimately variable-depth URLs, not for routing creativity.** `[...slug]` matches any number of segments and produces an array. The senior reach is narrow: a docs site where the path is a hierarchical content reference (`/docs/auth/email-password`), a marketing site with editorial slugs, a redirector that matches anything and routes server-side. Most dynamic routes are single-parameter; catch-all earns its weight only when the URL shape is genuinely arbitrary-depth.
- **Parallel routes let one URL render multiple independent slots in parallel.** A folder `@sidebar/page.tsx` next to `page.tsx` in the same route creates a named slot that the layout receives as a prop. The canonical case is a list-plus-detail surface — a route that renders both a list and a focused detail at the same URL, each with its own loading, error, and not-found boundary. The senior recognition: parallel slots stream independently when wrapped in Suspense (Chapter 5.3 cashes this in), and `default.tsx` per slot is what prevents a 404 on direct navigation when the slot's URL state can't be reconstructed.
- **Intercepting routes solve the "modal with a real URL" problem the framework's competitors can't.** A folder `(.)photo/[id]` next to a list route intercepts a soft navigation to `/photo/42` and renders an in-place modal *without* unmounting the list. The same URL on direct visit, refresh, or `Cmd+click` renders the non-intercepting `app/photo/[id]/page.tsx` as a full page. The student gets shareable, refreshable, deep-linkable modal URLs — the SaaS feature every state-driven modal can't ship. The senior anchor: when a modal needs URL persistence, the answer is interception, not `useState` plus a `?modal=open` query param.
- **Navigation is `<Link>` plus `redirect`/`notFound` — the four mechanisms.** Client-side soft navigation goes through `<Link>` (or `useRouter().push` from a Client Component when not in a JSX tree). Server-side flow control goes through `redirect` (307), `permanentRedirect` (308 — for permanent URL moves like `/old-url` → `/new-url`), and `notFound` (a thrown signal the framework catches and renders `not-found.tsx`). The senior reach: every entry point that can produce a missing resource calls `notFound()`; every URL that's moved permanently uses `permanentRedirect`; every login-required boundary uses `redirect` to send the user to `/sign-in`.
- **Prefetching is the navigation performance model, and the default is intelligent.** `<Link>` prefetches the linked route in three situations: on viewport intersection (for the static parts of the route), on hover (for the dynamic parts), and on focus (for keyboard navigation). The `prefetch` prop overrides: `true` prefetches everything always, `false` disables prefetching entirely. The senior reach: leave it at the default unless the link points to a route the student knows is expensive to prefetch (a route with a heavy server call that shouldn't fire on hover) or to a route under heavy auth/rate-limit constraints. The cross-reference to 5.4 is named: full prefetching semantics interact with the caching model.
- **Forward references to where each thread lands again.** Server vs. Client Components are named at every place a Client Component is necessary in this chapter, with the cross-reference to 5.2. `params` and `searchParams` as Promises are introduced in 5.1.3 (dynamic segments) and 5.1.5 (parallel routes), cashed in fully in 5.4.8. Suspense at the route boundary is referenced from 5.1.5 (parallel routes streaming independently) and 5.1.6 (intercepting routes feel instant under streaming), owned by Chapter 5.3. `loading.tsx`, `error.tsx`, `not-found.tsx` are named as the per-slot/per-route boundaries parallel and intercepting routes leverage, owned by Chapter 5.3. The metadata API is named once where the chapter touches a route's `<head>` — full treatment in Chapter 5.6.

The chapter ships six teaching lessons plus the quiz. The TOC's eleven content bullets compress: scaffolding, the architectural principle, and basic file-system routing belong in one lesson (the project tree is the canonical shape of the principle, and `page.tsx` is the smallest unit of that tree). Layouts and route groups belong together (route groups exist primarily to organize layouts and the routes that share them). Dynamic segments and catch-all share a lesson because catch-all is a one-paragraph extension of the dynamic-segment model. `<Link>`, `redirect`, `notFound`, and `permanentRedirect` belong in one lesson because they are the four mechanisms for moving users between routes. Parallel routes and intercepting routes get their own lessons because each has a distinct mental model and the intercepting-route pattern only makes sense after parallel routes are in place; Chapter 5.7 wires them together as a project.

The chapter ships short JSX and folder-tree snippets, heavy use of `FileTree` blocks for the file conventions, a `Matching` exercise pattern for "folder name → URL," `Buckets` for "where does this file go," `PredictOutput` for "what URL does this folder produce," `CodeReview` for the canonical naming and colocation bugs, and a handful of `ReactCoding` blocks where the student writes pages, layouts, and dynamic routes against the framework. Diagrams carry weight at five sites: an `ArrowDiagram` in 5.1.1 showing how a folder tree under `app/` maps to URL paths; an `ArrowDiagram` in 5.1.2 showing how nested layouts compose around a page; a `DiagramSequence` in 5.1.5 walking parallel routes through soft-navigate, direct-visit, and refresh states with the corresponding slot rendering; an `ArrowDiagram` in 5.1.6 showing the dual rendering paths for an intercepting route (soft nav vs. hard nav); and a `Matching` exercise pattern using folder structures across the chapter.

The chapter ordering follows the dependency: project scaffold and basic routing first (the file-system contract every other lesson rides on), layouts and route groups second (the composition model), dynamic segments third (parameters as the second axis of routing), navigation primitives fourth (how users move between routes), parallel routes fifth (the slot model), intercepting routes sixth (the modal pattern that depends on parallel routes). The quiz closes the chapter.

---

## Lesson 5.1.1 — The App Router project: file tree, `page.tsx`, and co-location

Topics to cover:

- The chapter-opening senior question: the student opens the course's starter from Chapter 1.4 and looks at `app/`. They see `layout.tsx`, `page.tsx`, `globals.css`. They want to add a route at `/dashboard` and a second one at `/dashboard/invoices`. What files do they create, where do they put them, and what do they default-export? The naive answer is "make a `pages/` folder." The 2026 answer names the App Router contract — a folder becomes a URL segment, a `page.tsx` inside that folder becomes the route's leaf — and recognizes that the file system *is* the route table.
- **`pnpm create next-app` and what it generates — for recognition, not for use.** A short cash-in. The course's starter is the source of truth (Chapter 1.4.1); `pnpm create next-app@latest` is named here so the student recognizes the wizard's output when they encounter it in a tutorial, an interview test, or a colleague's repo. The wizard ships TypeScript, Tailwind v4, the App Router, Turbopack, Biome (replacing the removed `next lint`), an import alias `@/*`, and an `AGENTS.md` with a `CLAUDE.md` reference that guides coding agents to write up-to-date Next.js code. The senior reach: don't run the wizard for a real project — the wizard's defaults drift; pin a starter. But know what it produces.
- **The App Router file tree at a glance.** A `FileTree` block walks the canonical shape:
  ```
  app/
    layout.tsx        // root layout — html, body, providers (Chapter 4.1.2)
    page.tsx          // the index route — renders at /
    globals.css       // Tailwind v4 entry — @import "tailwindcss"
    favicon.ico       // file-convention favicon (Chapter 5.6)
    dashboard/
      page.tsx        // renders at /dashboard
      layout.tsx      // wraps every /dashboard/* page (optional)
      invoices/
        page.tsx      // renders at /dashboard/invoices
  ```
  The senior recognition: every folder under `app/` is a route segment; a `page.tsx` makes the segment routable; a `layout.tsx` makes the segment a shell every nested route renders inside. Folders without a `page.tsx` are still valid — they just don't produce a URL of their own (they may host nested routes, layouts, or non-routable files).
- **`page.tsx` — the route leaf.** The smallest routable file convention. The shape:
  ```tsx
  // app/dashboard/page.tsx
  export default function DashboardPage() {
    return <h1>Dashboard</h1>;
  }
  ```
  The senior call-outs: a default export is required (the framework wires it as the route's component); the component name doesn't matter for routing (but should match the route for readability); the file is a Server Component by default (no `'use client'`); a `page.tsx` *must* live inside a folder under `app/` (a bare `app/page.tsx` is the index route). The lesson names the Server Component default lightly — Chapter 5.2 owns the boundary.
- **The Pages Router named once, dropped.** A short one-liner. Next.js used to ship a `pages/` directory as the routing convention; the App Router replaced it. The course does not teach the Pages Router. If the student encounters a `pages/` folder in a legacy codebase, the recognition is "this is pre-App-Router; the migration is a separate project, not in scope here."
- **Architectural Principle #1 — co-locate by feature, not by layer.** The principle introduced and named explicitly. The naive form for organizing a project: top-level directories that mirror the *kind* of file (`components/`, `hooks/`, `lib/`, `utils/`, `services/`, `types/`). Every feature is fragmented — the dashboard's components are in `components/dashboard/`, its hooks are in `hooks/useDashboard.ts`, its server work is in `lib/dashboard.ts`. Deleting the dashboard requires touching five directories and leaves orphans the linter doesn't catch. The senior form: organize by *purpose*. The dashboard feature lives in `app/dashboard/`; its components in `app/dashboard/_components/`; its hooks and helpers in `app/dashboard/_lib/`; its actions in `app/dashboard/_actions.ts`. Deleting the feature is `rm -rf app/dashboard/`, and the framework's tree-shaking and TypeScript's module graph catch everything that broke. The chapter installs the principle once, here, and references it at every later branch point.
- **Private folders (`_folder`) — the senior form for non-routable colocation.** A folder prefixed with an underscore is invisible to the routing system. The 2026 reflex: any non-routable file that supports a route lives in a private folder inside that route. The shape:
  ```
  app/dashboard/
    page.tsx
    layout.tsx
    _components/
      InvoiceList.tsx
      RevenueChart.tsx
    _lib/
      queries.ts
      formatters.ts
    _actions.ts
  ```
  The senior recognition: the underscore prefix is *structural enforcement* — the framework will never claim `_components` or `_lib` as a file convention, which means the student's code is future-proof against framework upgrades. Bare files in a route folder (`app/dashboard/InvoiceList.tsx`) are not invalid, but they compete with future Next.js conventions and they're harder to scan visually. The chapter installs `_components/`, `_lib/`, `_actions.ts` as the conventions per route.
- **What lives outside `app/`.** A short tour. The 2026 reach for non-route code is split: most code lives next to the route that uses it (the principle above); the rest lives at the project root, alongside `app/`:
  - **`lib/`** — pure helpers shared across multiple features (`lib/formatCurrency.ts`, `lib/cn.ts`). Used by more than one route folder. No side effects at import time.
  - **`db/`** — Drizzle schema and client (Unit 6 owns this).
  - **`components/`** — shared, app-wide UI components (`<Button>`, `<Card>` if not from shadcn — shadcn ships these into `components/ui/` per Chapter 4.11.1).
  - **`actions/`** — shared server actions used by multiple routes (rare; most actions colocate with the route, Unit 7 cashes this in).
  - **`env.ts`** — env validation (Chapter 1.4.5).
  - **`next.config.ts`**, **`biome.json`**, **`tsconfig.json`** — project config.
  - The senior call: route-specific code lives inside the route folder; only genuinely shared code earns a top-level directory. The threshold for "shared" is "used by two or more features." Code used by one feature lives with that feature, period.
- **`@/*` and the import-alias contract.** A short paragraph. The starter's `tsconfig.json` (Chapter 1.4.3) maps `@/*` to the project root. The 2026 form: `import { db } from '@/db/client';` and `import { Button } from '@/components/ui/button';`. The senior reach is `@/` for everything; relative imports (`./`, `../`) only for intra-feature imports within the same route folder (`./_components/InvoiceList`, `./_lib/queries`). The reason: `@/` imports survive refactors that move a file; relative imports break.
- **Top-level files in the `app/` directory.** A short tour of the file conventions that live at the root of `app/` (not at every level, only at the root):
  - **`favicon.ico`** — the favicon, served at `/favicon.ico`.
  - **`globals.css`** — the Tailwind entry point, imported by `layout.tsx`.
  - **`robots.ts`**, **`sitemap.ts`** — SEO file conventions (Chapter 5.6).
  - **`opengraph-image.{ext}`**, **`twitter-image.{ext}`**, **`icon.{ext}`**, **`apple-icon.{ext}`** — image conventions for OG, Twitter, and favicons (Chapter 5.6).
  - The senior recognition: these file conventions are framework primitives — the framework reads them and routes them to the appropriate browser surface. Naming the file conventionally is the contract.
- **`route.ts` named once.** A short one-liner. A file named `route.ts` (not `page.tsx`) in a route folder makes the route a route handler — it serves HTTP responses instead of rendering UI. Chapter 7.5 owns route handlers in full. The student recognizes the existence of the convention here so they don't confuse `page.tsx` and `route.ts`.
- **The watch-outs a senior names:**
  - **A folder without a `page.tsx` does not produce a URL** — `app/dashboard/invoices/` without a `page.tsx` means `/dashboard/invoices` is a 404 (unless a parent layout's redirect or middleware catches it). The folder is valid for hosting nested routes or layouts; it just isn't itself routable.
  - **A `page.tsx` at `app/page.tsx` is the index route** (`/`). Don't put it under a folder if you want it to be the root.
  - **Bare files in a route folder mix routing and non-routing concerns.** Use private folders (`_components/`, `_lib/`) for non-routable files; reserve the route folder's top level for the framework's file conventions.
  - **The Pages Router (`pages/`) and the App Router (`app/`) can coexist, but the course doesn't teach the mixed setup.** A project should pick one.
  - **Files inside `node_modules`, `.next`, and other tooling directories are never routable** — the framework only scans `app/`.
  - **The `app` directory must live at the project root** (or inside a `src/` folder if the project opts into `src/app/`; the course's starter uses `app/` at the root for shorter import paths).
  - **The `default export` from `page.tsx` is what the framework renders** — a named export with a `Page` name does nothing. If the export is missing or not a function, the build fails.

What this lesson does not cover:

- Layouts, nested layouts, and the layout/page render boundary (5.1.2).
- Route groups and how they organize layouts (5.1.2).
- Dynamic segments and catch-all routes (5.1.3).
- Navigation between routes (5.1.4).
- Parallel routes and slots (5.1.5).
- Intercepting routes (5.1.6).
- Server Components vs. Client Components in depth — Chapter 5.2 owns the boundary; this lesson names "Server Component by default" once and moves on.
- `loading.tsx`, `error.tsx`, `not-found.tsx` — Chapter 5.3 owns async UI primitives.
- The `metadata` export and `<head>` content — Chapter 4.1.2 introduced it, Chapter 5.6 owns it in full.
- `route.ts` and route handlers — Chapter 7.5 owns them.
- The `middleware.ts`-replaced-by-`proxy.ts` migration — Chapter 5.5 owns it.
- The Pages Router — named once for recognition, never taught.

Pedagogical approach:

Setup-plus-concept archetype. The lesson installs the file-system-as-URL-space contract, the `page.tsx` convention, and Architectural Principle #1 (co-locate by feature) as the architectural framing. The deliverable is fluency — the student looks at a folder under `app/` and names the URL it produces; the student wants to add a feature and reaches for a new folder under `app/` with a `page.tsx`, `_components/`, `_lib/` shape without thinking.

Open with the senior question — "you want to add a `/dashboard/invoices` route; what files do you create and where" — and a `MultipleChoice` exercise pitting four answers (a `pages/dashboard/invoices.tsx` file — wrong, that's the legacy Pages Router; an `app/routes/dashboard/invoices.tsx` file — wrong, the framework only scans `app/`; an `app/dashboard/invoices/page.tsx` file — right; an `app/DashboardInvoices.tsx` file — wrong, routing is folder-based). The discrimination installs the contract.

A `FileTree` block walks the canonical project tree with annotations on each entry — what is it, what does it produce, when does a senior reach for each. The student reads the shape once and recognizes every entry.

An `ArrowDiagram` (`Figure` wrapped) shows a sample folder structure on the left (`app/`, `app/dashboard/`, `app/dashboard/page.tsx`, `app/dashboard/invoices/page.tsx`, `app/dashboard/_components/InvoiceList.tsx`, `app/(marketing)/page.tsx`) with arrows to the URL each produces on the right (`/dashboard`, `/dashboard/invoices`, `/` — the route group is invisible — and the `_components` file producing no URL at all). The mapping is concrete.

A `Matching` exercise pairs ten folder paths with the URLs they produce — `app/page.tsx` (`/`), `app/about/page.tsx` (`/about`), `app/blog/posts/page.tsx` (`/blog/posts`), `app/blog/page.tsx` (`/blog`), `app/_components/Button.tsx` (no URL — private folder, no `page.tsx`), `app/api/route.ts` (`/api` — a route handler, not a page), `app/dashboard/` (no URL — no `page.tsx`), `app/dashboard/_lib/queries.ts` (no URL — private, no `page.tsx`), `app/settings/profile/page.tsx` (`/settings/profile`), `app/settings/page.tsx` (`/settings`). The file-system-to-URL mapping locks in.

A `Buckets` exercise sorts twelve project artifacts into "lives in `app/<route>/`" vs. "lives in `app/<route>/_components/`" vs. "lives in `app/<route>/_lib/`" vs. "lives in the top-level `lib/`" vs. "lives in the top-level `components/`" — the page for a feature (route folder), a component used only by that page (route's `_components/`), a Zod schema used only by that page (route's `_lib/`), a `formatCurrency` helper used across the app (top-level `lib/`), a `<Button>` used across the app (top-level `components/ui/` or shadcn), the page's server action (route's `_actions.ts` or alongside as `_lib/actions.ts`), a database query used by two routes (top-level `lib/queries/` or the route that owns it), a TypeScript type used only by one route (route's `_lib/types.ts`), the favicon (`app/favicon.ico`), a `globals.css` (`app/globals.css`), the Drizzle schema (top-level `db/schema.ts`), the env validator (`env.ts` at the root). The colocation reflex locks in.

A `PredictOutput` exercise on six routing scenarios — given a folder structure, predict the resulting URL table:
1. `app/page.tsx`, `app/about/page.tsx` → `/`, `/about`.
2. `app/blog/page.tsx`, `app/blog/posts/page.tsx`, `app/blog/posts/featured/page.tsx` → `/blog`, `/blog/posts`, `/blog/posts/featured`.
3. `app/dashboard/` (no `page.tsx`), `app/dashboard/invoices/page.tsx` → no `/dashboard` URL, but `/dashboard/invoices` resolves.
4. `app/page.tsx`, `app/_components/Nav.tsx`, `app/_lib/utils.ts` → only `/` (private folders are invisible).
5. `app/dashboard/page.tsx`, `app/dashboard/_components/InvoiceList.tsx` → only `/dashboard`.
6. `app/dashboard/Page.tsx` (capital P) → no URL — file names are case-sensitive, the convention requires lowercase.

A `CodeReview` exercise on a 40-line project tree (rendered as a `FileTree`) with six issues:
- A `components/` folder at the project root holding `<DashboardNav>` (used only in `/dashboard`) — fix: move to `app/dashboard/_components/DashboardNav.tsx`.
- A bare `app/dashboard/queries.ts` (not in a private folder) — fix: rename to `app/dashboard/_lib/queries.ts` to avoid framework collision.
- A `hooks/useDashboardFilters.ts` at the project root, used only in `/dashboard` — fix: colocate as `app/dashboard/_components/useDashboardFilters.ts`.
- A `pages/api/health.ts` (Pages Router) alongside `app/` — fix: migrate to `app/api/health/route.ts` (Chapter 7.5 owns the migration target).
- A `services/invoiceService.ts` directory mirroring layer organization — fix: by-feature; move the service into the route it serves.
- A `utils/` directory with a single `cn.ts` file — fix: move to `lib/cn.ts` or `lib/utils.ts` since it's genuinely shared, name it for what it does, drop the by-layer parent.

The student leaves a comment per issue with the senior fix.

A `ReactCoding` block (with the App Router preconfigured) has the student add three routes — `/dashboard` (renders an `<h1>Dashboard</h1>`), `/dashboard/invoices` (renders an `<h1>Invoices</h1>` and imports an `<InvoiceList />` component from `_components/`), and `/dashboard/invoices/draft` (renders an `<h1>Draft Invoices</h1>`). The grader checks the folder structure and the default exports.

Close with a `TrueFalse` round of six statements: "A folder under `app/` always produces a URL" (false — only folders with a `page.tsx` do), "Private folders are invisible to the routing system" (true), "The default export from `page.tsx` is what the framework renders" (true), "Files in `app/_lib/` are routable" (false — underscore makes the folder private), "Architectural Principle #1 prefers organizing by feature, not by kind of file" (true), "`pnpm create next-app` is the recommended way to start a SaaS project" (false — pin a starter; the wizard's defaults drift). The principle and the contract lock in.

Estimated student time: 50 to 65 minutes. Load-bearing for every later lesson in the chapter, every route in Chapters 5.2 through 5.7, and the entire project structure in Units 6 through 23.

---

## Lesson 5.1.2 — Layouts, nested layouts, and route groups

Topics to cover:

- The senior question: the student has `/dashboard/invoices` and `/dashboard/customers` working as separate pages, both needing a shared sidebar and a shared header. They also have a `/sign-in` page and a `/marketing/about` page that need a *completely different* shell — no sidebar, a minimal header, no auth gate. How does the App Router let them share the dashboard shell across dashboard pages without re-rendering it on every navigation, *and* let the sign-in page have its own shell entirely? The naive answer is "two top-level layouts." The 2026 answer names two file conventions: `layout.tsx` for the shared shell, and route groups (`(folder)`) for organizing routes under different layouts without affecting the URL.
- **`layout.tsx` — the shell every nested route renders inside.** The shape:
  ```tsx
  // app/dashboard/layout.tsx
  import { Sidebar } from './_components/Sidebar';
  import { Header } from './_components/Header';

  export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main>{children}</main>
        </div>
      </div>
    );
  }
  ```
  The senior call-outs: a default export is required; the component takes `children` as a prop and renders it somewhere in the JSX tree; `children` is the matched page (or nested layout); the layout is a Server Component by default; the `<html>` and `<body>` tags belong *only* to the root layout (`app/layout.tsx`, Chapter 4.1.2) — nested layouts return fragments or wrappers that go *inside* the root layout's `<body>`. The chapter installs the shape once and the student stops writing `<html>` or `<body>` in nested layouts forever.
- **Layouts compose down the tree.** A concrete walkthrough. When the user visits `/dashboard/invoices`:
  - The framework matches the root layout (`app/layout.tsx`).
  - Then the dashboard layout (`app/dashboard/layout.tsx`).
  - Then the invoices page (`app/dashboard/invoices/page.tsx`).
  - The rendered tree is: `RootLayout({ children: DashboardLayout({ children: InvoicesPage() }) })`.
  - Every layout wraps its `children`; layouts compose like nested functions, not like routes that "extend" each other.
- **The layout/page render boundary — what re-renders on navigation.** The senior anchor for performance. When the user navigates from `/dashboard/invoices` to `/dashboard/customers`:
  - The root layout *does not re-render* — it stayed mounted from the previous navigation.
  - The dashboard layout *does not re-render* — it's a shared ancestor.
  - Only the page changes — the invoices page unmounts, the customers page mounts inside the same dashboard-layout `<main>`.
  - State in the dashboard layout (a `useState` in a Client Component inside the layout) survives the navigation. State in the page does not.
  - The senior reach: stateful UI that should persist across navigations within a section (a sidebar's collapsed state, a player playing in the corner) lives in the layout. State that resets per-page lives in the page.
- **Nested layouts and the "shared shell within a shell" pattern.** A short example. A `/dashboard/invoices/[id]` route can have its own layout (`app/dashboard/invoices/[id]/layout.tsx`) that renders inside the dashboard layout — a deep three-pane navigation, for example, where the dashboard sidebar wraps an invoice-specific tab bar that wraps the invoice page. The student composes layouts like Russian dolls; the framework handles the wiring.
- **`template.tsx` — when "this should remount" is the senior call.** A short paragraph. `template.tsx` is the same shape as `layout.tsx` (a component that takes `children` and renders them), but unlike a layout, a template *remounts* on every navigation. Its state is reset, its effects re-fire, its `<input>` values clear. The 2026 reach is narrow: a route-level animation that should re-play on navigation, a per-page analytics event that fires on every mount. The senior recognition: 99% of the time, the student wants `layout.tsx`; `template.tsx` is the exception that names its trigger.
- **Route groups — `(folder)` for organization without URL impact.** The shape. A folder name wrapped in parentheses — `(marketing)`, `(app)`, `(auth)` — is invisible to the URL. Three uses, each named:
  - **Sharing a layout among siblings without a URL prefix.** A `(marketing)` folder containing the landing page, the pricing page, the about page, and a `(marketing)/layout.tsx` shared shell. The URLs stay `/`, `/pricing`, `/about` — no `/marketing/` prefix.
  - **Multiple root layouts in one app.** When two URL trees need completely different shells (a marketing surface and an authenticated dashboard surface), wrap each in a route group and give each a `layout.tsx`. The shape:
    ```
    app/
      (marketing)/
        layout.tsx       // marketing shell
        page.tsx         // /
        pricing/page.tsx // /pricing
      (app)/
        layout.tsx       // app shell with sidebar, header
        dashboard/page.tsx // /dashboard
        invoices/page.tsx  // /invoices
    ```
    The senior recognition: the two layouts don't share state — navigation between `/` and `/dashboard` is a full layout switch. The trade-off: the framework can't keep state across the switch, but the two surfaces can have completely independent shells.
  - **Organizing routes by domain or team.** Splitting `(admin)` from `(customer)` from `(auth)` for project navigation without changing URLs.
- **Multiple root layouts — when each group has its own root.** A short cash-in. When a project uses route groups for multiple distinct shells, only the *root* `app/layout.tsx` can own the `<html>` and `<body>` tags. Group-level layouts (`(marketing)/layout.tsx`) are nested layouts and return fragments. A common surprise: a project that wants two truly independent root-level shells (with their own `<html>` and `<body>`) needs to drop `app/layout.tsx` and put a `layout.tsx` inside each route group. This is the "multiple root layouts" pattern; it's rare but supported. The senior reach for a SaaS app: keep one root layout and use group-level layouts for shell variation.
- **Route group conflict — same URL from two groups breaks the build.** A short watch-out. `app/(marketing)/about/page.tsx` and `app/(shop)/about/page.tsx` would both resolve to `/about`, and the framework throws a build error. The senior reach: route groups don't change the URL, so URL collisions are real; the student treats two groups as if they share a URL space and avoids overlaps.
- **The senior pattern — co-locate layout-specific code with the layout.** A short cash-in of Principle #1. A `(app)/layout.tsx` has a sidebar and a header? Those components live in `(app)/_components/Sidebar.tsx` and `(app)/_components/Header.tsx`, not in a top-level `components/`. The chapter doesn't re-teach the principle but reinforces the reflex.
- **The watch-outs a senior names:**
  - **Layouts don't re-render across navigations within their subtree** — this is the *feature*. If the student wants something that *does* re-render on navigation, that's a Client Component reading `usePathname()` or a `template.tsx`.
  - **A layout's `children` is what gets matched at the next level down** — it's not a slot the student fills imperatively; the framework fills it with the matched page or nested layout.
  - **The root layout must contain `<html>` and `<body>`** (Chapter 4.1.2 named this). Nested layouts must not.
  - **Don't put data fetching that's specific to a deep child in a high layout** — the layout runs on every page within its subtree; expensive queries here slow every page. Push data fetching into the page that uses it.
  - **Route groups don't appear in the URL** — `(marketing)/pricing` is `/pricing`, not `/marketing/pricing`. The student gets this once and stops being surprised.
  - **Route group URL conflicts crash the build** — two pages in different groups resolving to the same URL throws at build time.
  - **A `template.tsx` and a `layout.tsx` at the same level coexist** — both wrap children; layout is outer, template is inner. Rare to need both.
  - **State in a nested Client Component inside a layout survives navigations within the layout's subtree** — leverage this for sidebar toggles, theme controls, players.

What this lesson does not cover:

- The root layout's `<html>` and `<body>` and the metadata API (Chapter 4.1.2).
- Dynamic segments and catch-all (5.1.3).
- Parallel routes and slots — a different model from nested layouts (5.1.5).
- `loading.tsx`, `error.tsx`, `not-found.tsx` at the layout level — Chapter 5.3 owns the boundaries.
- Server Components vs. Client Components — Chapter 5.2 owns the boundary; this lesson names the default and moves on.
- Multiple root layouts at depth (rare; the lesson names the existence).
- Routing in middleware / `proxy.ts` — Chapter 5.5.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the layout composition model (layouts wrap pages, layouts compose down the tree, layouts don't re-render on navigation within their subtree) and the route group convention (`(folder)` for organization without URL impact). The deliverable is fluency — the student looks at a UI that has a persistent shell and reaches for a layout; they want to organize routes under a shared layout without a URL prefix and reach for a route group.

Open with the senior question — "your dashboard pages all need a sidebar and header; do you put the sidebar in every page, or somewhere shared?" — and a `MultipleChoice` exercise pitting four answers (import the sidebar into every page — wrong, repetition; put the sidebar in the root layout — wrong, it would appear on the marketing pages too; put the sidebar in a `dashboard/layout.tsx` — right; use a global state for "should the sidebar render" — wrong, that's reinventing layouts).

An `ArrowDiagram` (`Figure`-wrapped) renders the composition tree — at the top, `RootLayout` (with `<html>` and `<body>`); below, `DashboardLayout` (with sidebar and header); below, the page (`InvoicesPage` or `CustomersPage`). Arrows show `children` flowing from each layout to the next. Annotations call out: only the root has `<html>`/`<body>`, only the leaf changes on navigation, layouts compose like nested function calls.

An `AnnotatedCode` block walks a real layout file — 15 lines of `app/(app)/layout.tsx` with the Sidebar and Header imports, the flexbox container, the `<main>{children}</main>`. Annotations call out: the typed `children`, the absence of `'use client'` (Server Component), the absence of `<html>`/`<body>`, the colocated `_components/` imports.

A `FileTree` block walks two realistic project shapes — a SaaS with a `(marketing)` group and an `(app)` group, each with its own layout, plus a top-level root layout. The student reads which URL each page produces.

A `Matching` exercise pairs ten folder structures with which layouts wrap which pages:
- `app/layout.tsx` + `app/dashboard/page.tsx` → root layout wraps dashboard page.
- `app/layout.tsx` + `app/dashboard/layout.tsx` + `app/dashboard/invoices/page.tsx` → root → dashboard layout → invoices page.
- `app/(marketing)/page.tsx` → root layout wraps page (route group is invisible, no `(marketing)` layout means no extra wrap).
- `app/(marketing)/layout.tsx` + `app/(marketing)/page.tsx` → root → marketing layout → marketing index page.
- And six more variations.

A `Buckets` exercise sorts twelve "where does this UI live" decisions:
- A sidebar that should show on every dashboard page → dashboard layout.
- A toast container shared across the entire app → root layout.
- A page title that changes per page → page (or page's metadata).
- A breadcrumb that updates per page → in the layout (rendered as a Client Component reading `usePathname()`).
- A modal that should persist across navigations → see 5.1.6 (intercepting routes).
- A header for the marketing pages only → route group's layout.
- An `<html>` element wrapper → only root layout.
- A `<ThemeProvider>` wrapping the whole app → root layout.
- A loading skeleton for a slow query → `loading.tsx` next to the page (Chapter 5.3).
- A side nav specific to settings → `(app)/settings/layout.tsx`.
- A floating chat widget for support → root layout (so it persists).
- A per-step progress bar in a wizard → the wizard's parent layout (the wizard's container, not the page).

A `PredictOutput` exercise on five navigation scenarios — given a folder structure and a sequence of navigations, predict what re-renders:
1. Navigate from `/dashboard/invoices` to `/dashboard/customers`: only the page re-renders, dashboard layout stays mounted.
2. Navigate from `/dashboard/invoices` to `/sign-in` (in a `(auth)` group with its own layout): the dashboard layout unmounts, the auth layout mounts, the page changes.
3. Navigate from `/dashboard/invoices/1` to `/dashboard/invoices/2`: only the page re-renders if there's no `[id]` layout; if there is one, the `[id]` layout stays mounted but the page changes.
4. Navigate within `/dashboard` and a Client Component in the layout has `useState`: the state survives.
5. Same as 4 but with a `template.tsx` wrapping the page: the template's state resets on each navigation.

The render-boundary model locks in.

A `CodeReview` exercise on a 30-line project structure with five issues:
- A nested layout that includes `<html>` and `<body>` — fix: only the root layout owns those tags.
- A `(marketing)` group and an `(app)` group both with `about/page.tsx` — fix: URL conflict, rename one.
- A `template.tsx` used where a `layout.tsx` would do — fix: use a layout unless there's a specific need to remount.
- A sidebar component imported from a top-level `components/` directory — fix: colocate as `(app)/_components/Sidebar.tsx`.
- A data fetch inside the dashboard layout that's only used by one page — fix: push the fetch to the page.

A `ReactCoding` block (App Router preconfigured) has the student build a `(app)/layout.tsx` with a sidebar and a header, then add two pages (`(app)/dashboard/page.tsx` and `(app)/invoices/page.tsx`) that share the layout. The grader checks: the layout renders `children`, the pages share the sidebar, the URL has no `(app)/` prefix.

Close with a `TrueFalse` round of six statements: "A layout re-renders every time a nested page changes" (false — it stays mounted), "Route groups change the URL" (false — they're invisible), "Only the root layout can have `<html>` and `<body>`" (true), "`template.tsx` and `layout.tsx` are interchangeable" (false — templates remount), "Two pages in different route groups can resolve to the same URL" (false — it's a build error), "A Client Component's state inside a layout survives navigations within that layout's subtree" (true). The composition model locks in.

Estimated student time: 50 to 65 minutes. Load-bearing for every multi-page surface in the course, the `<auth>` and `<app>` split that lands in Unit 9, and the project in Chapter 5.7.

---

## Lesson 5.1.3 — Dynamic segments and catch-all routes

Topics to cover:

- The senior question: the student has `/invoices` rendering a list, and they want each row to link to `/invoices/42`, `/invoices/77`, etc. — a detail page per invoice. They don't want to hand-write a `page.tsx` per invoice. What does the framework offer? The naive answer is "URL parameters with a wildcard." The 2026 answer names the dynamic-segment convention — a folder wrapped in square brackets `[id]` captures the URL part as a parameter the page reads from `params`, which in Next.js 16 is a Promise the page awaits.
- **`[param]` — the dynamic segment.** The shape:
  ```
  app/invoices/[id]/page.tsx
  ```
  The folder name `[id]` produces a URL pattern `/invoices/:id`. The `id` part of the URL is captured and passed to the page as a parameter. The page reads it:
  ```tsx
  // app/invoices/[id]/page.tsx
  export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <h1>Invoice {id}</h1>;
  }
  ```
  The senior call-outs: the parameter name in the folder (`[id]`) determines the property name in `params.id`; `params` is a Promise in Next.js 16 (the async-request-API change Chapter 5.4.8 owns in full); the page is `async` and awaits `params`; the captured value is always a string (the URL is a string; coerce to number with `Number(id)` if needed; validate with `parseInt` and `isNaN` checks or with a Zod schema — the canonical 2026 form is the Zod parse).
- **Why `params` is a Promise — the 2026 change.** A short cash-in. Next.js 16 made `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` all return Promises. The reason: it lets the framework defer the *act of reading dynamic data* until the component actually uses it, which enables Partial Prerendering (the static shell renders without resolving dynamic values; the dynamic component streams in when `await params` resolves). Chapter 5.4 owns the rendering model; here, the student awaits `params` because the framework asks them to. In Client Components, the same is unwrapped with `React.use(params)`.
- **Multiple dynamic segments.** A short example. The shape:
  ```
  app/orgs/[orgSlug]/invoices/[id]/page.tsx
  ```
  produces `/orgs/:orgSlug/invoices/:id`, and `params` resolves to `{ orgSlug: string; id: string }`. The senior pattern: any URL that scopes a resource to an organization, a tenant, or a project uses the multi-segment form. The senior recognition: every segment name must be unique within the route — a folder structure that puts `[id]` inside another `[id]` is a build error.
- **Catch-all segments — `[...slug]`.** The shape:
  ```
  app/docs/[...slug]/page.tsx
  ```
  matches any number of path segments after `/docs/` — `/docs/auth`, `/docs/auth/email-password`, `/docs/auth/email-password/verification`. `params.slug` is a string array: `['auth']`, `['auth', 'email-password']`, `['auth', 'email-password', 'verification']`. The page reads:
  ```tsx
  export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const path = slug.join('/');
    // …
  }
  ```
  The senior reach: a docs site, a marketing site with editorial paths, a CMS-driven content surface. The recognition: catch-all does *not* match the parent's own URL — `app/docs/[...slug]/page.tsx` does not match `/docs` alone; the next bullet covers the fix.
- **Optional catch-all segments — `[[...slug]]`.** The shape:
  ```
  app/docs/[[...slug]]/page.tsx
  ```
  Matches `/docs`, `/docs/auth`, `/docs/auth/email-password`, etc. — the optional form makes the segment match the parent URL too. `params.slug` is `string[] | undefined` — undefined when matching `/docs` alone, an array otherwise. The senior reach: when the catch-all should also handle its parent route (the docs index plus all nested docs paths). The narrower regular catch-all is the senior default; the optional form is for the cases where a single page serves the parent and the depth-N children.
- **The decision tree — single segment vs. catch-all vs. optional catch-all.**
  - **Single segment (`[id]`)** is the senior default. Use when the URL has a single variable part at a known depth. Canonical: detail pages (`/invoices/[id]`, `/users/[username]`, `/orgs/[slug]`).
  - **Multiple single segments (`[orgSlug]/.../[id]`)** when each variable part has a known position. Canonical: tenant-scoped resources (`/orgs/[orgSlug]/invoices/[id]`).
  - **Catch-all (`[...slug]`)** when the URL's depth is genuinely variable and a *separate* parent page handles the empty case. Canonical: docs nested arbitrarily.
  - **Optional catch-all (`[[...slug]]`)** when one page handles both the parent and all depths. Canonical: a single React component rendering "docs index" or "docs at path X" based on whether `slug` is undefined.
  - **None of the above (literal segments)** when every URL is enumerable. The senior recognition: literal segments are clearest; catch-all is the senior reach only when it earns its weight.
- **`generateStaticParams` — pre-rendering dynamic routes at build time.** A short forward-reference. A dynamic route is dynamic by default — Next.js renders it on-demand. To pre-render at build time (a blog post page where the list of posts is known at build, a docs page), the route exports `generateStaticParams` returning an array of params:
  ```tsx
  export async function generateStaticParams() {
    const invoices = await db.select({ id: invoicesTable.id }).from(invoicesTable);
    return invoices.map((i) => ({ id: i.id.toString() }));
  }
  ```
  The framework reads this at build, generates a static HTML per returned params object, and serves them as static files. Chapter 5.6.11 owns `generateStaticParams` in full; this lesson names the existence and the canonical use case (build-time SSG for dynamic routes with bounded, known param sets).
- **Validating `params` with Zod — the senior shape.** A short cash-in. The URL is a string; the page often expects a number, a UUID, a constrained value. The senior reach is to validate at the entry — Zod 4 (Chapter 7.1) is the canonical 2026 tool. The shape:
  ```tsx
  import { z } from 'zod';

  const ParamsSchema = z.object({ id: z.coerce.number().int().positive() });

  export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = ParamsSchema.parse(await params);
    // id is now a number, narrowed
  }
  ```
  When parse fails, the framework throws — the surrounding error boundary (Chapter 5.3) catches it. The senior reflex: any time a `params` value enters a database query or a server-side operation, validate it first; never trust the URL.
- **`notFound()` when the resource doesn't exist.** A short cash-in. The page has a valid `params.id` shape, but no invoice with that ID exists. The senior reach is `notFound()` (named in 5.1.4) — the framework catches the thrown signal and renders the closest `not-found.tsx` boundary (Chapter 5.3). The shape:
  ```tsx
  const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice.length) notFound();
  ```
  The full treatment is in 5.1.4; here the student sees the pattern in context.
- **The watch-outs a senior names:**
  - **`params` is always a Promise in Next.js 16** — `await` in Server Components, `React.use(params)` in Client Components. Forgetting the `await` produces a TypeScript error or a runtime "Promise" object instead of the data.
  - **Captured params are always strings** — `[id]` produces `params.id: string`, not `number`. Coerce or parse before use.
  - **Catch-all `[...slug]` produces an array, not a string** — `params.slug: string[]`. A common mistake is `params.slug.split('/')`; the framework already split it.
  - **Catch-all does not match the parent URL** — `app/docs/[...slug]/page.tsx` doesn't match `/docs`. Use optional catch-all `[[...slug]]` or add a sibling `page.tsx` at the parent level.
  - **Two dynamic segments with the same name in the same route is a build error** — `[id]/[id]/page.tsx` doesn't compile.
  - **Catch-all and dynamic segments at the same level conflict** — `[id]/page.tsx` and `[...slug]/page.tsx` as siblings produce a build error (the framework can't disambiguate).
  - **Always validate `params` before passing them to a database query or a server-side operation** — the URL is untrusted input. Zod is the canonical validator.
  - **Mismatched segment name and `params` key crashes silently** — if the folder is `[invoiceId]` and the code reads `params.id`, the result is `undefined` and the page renders empty. The TypeScript types catch this if the page annotates `params` correctly.

What this lesson does not cover:

- Navigation to dynamic routes via `<Link>` (5.1.4).
- `notFound`, `redirect`, `permanentRedirect` — named in context, owned by 5.1.4.
- `not-found.tsx` and the error boundary — Chapter 5.3.
- `searchParams` and URL state — Chapter 5.5.
- `generateStaticParams` at depth and the rendering model — Chapters 5.4 and 5.6.
- The full async-request-API surface (`cookies()`, `headers()`, `draftMode()`) — Chapter 5.4.8.
- Zod 4 at depth — Chapter 7.1.

Pedagogical approach:

Mechanics-plus-decision archetype. The lesson installs the dynamic-segment file convention, the Promise-shaped `params` API, and the decision tree among single segment, catch-all, and optional catch-all. The deliverable is fluency — the student looks at a URL pattern and reaches for the right folder convention; they read `params` correctly with the async shape; they validate before using.

Open with the senior question — "you have a list of invoices, each linking to a detail page; how does the framework let one file render all of them?" — and a `MultipleChoice` exercise pitting four answers (write one `page.tsx` per invoice — wrong; use a wildcard `*` in the filename — wrong; wrap the folder in `[brackets]` — right; use `useRouter` and a query parameter — wrong, that's URL state, not routing).

An `AnnotatedCode` block walks a minimal `app/invoices/[id]/page.tsx` — the `async` keyword, the typed `params: Promise<{ id: string }>`, the `await params`, the use of `id` in the JSX. Annotations call out: the Promise shape, the string type, the senior validation reflex.

A `FileTree` block walks four shapes side by side:
- `app/invoices/[id]/page.tsx` — single dynamic segment.
- `app/orgs/[orgSlug]/invoices/[id]/page.tsx` — multiple single dynamic segments.
- `app/docs/[...slug]/page.tsx` — catch-all.
- `app/docs/[[...slug]]/page.tsx` — optional catch-all.

A `Matching` exercise pairs ten URL patterns with their folder structure:
- `/users/jane` → `app/users/[username]/page.tsx`.
- `/orgs/acme/projects/123` → `app/orgs/[slug]/projects/[id]/page.tsx`.
- `/docs/auth/email-password` → `app/docs/[...slug]/page.tsx`.
- `/docs` and `/docs/anything` → `app/docs/[[...slug]]/page.tsx`.
- `/blog/2026/05/hello` → `app/blog/[year]/[month]/[slug]/page.tsx`.
- `/admin` → `app/admin/page.tsx` (no dynamic segment).
- And four more.

A `Buckets` exercise sorts ten URL designs into "single segment," "catch-all," "optional catch-all," or "literal segments (no dynamic)":
- Product page per SKU → single.
- Settings page per org → single.
- Docs nested arbitrarily, with separate docs index → catch-all.
- Docs that handles both the index and any nested path in one component → optional catch-all.
- A static "About" page → literal.
- A user profile by username → single.
- An admin dashboard at a fixed URL → literal.
- A CMS-driven editorial site where editors create pages at arbitrary depth → catch-all or optional catch-all.
- A multi-tenant SaaS with `/orgs/[slug]/...` → single.
- A redirect handler that needs to match any URL not otherwise routed → optional catch-all at the root (rare; not the chapter's main case).

A `PredictOutput` exercise on five `params` scenarios:
1. `app/users/[username]/page.tsx` matching `/users/jane` → `params.username === 'jane'`.
2. `app/orgs/[slug]/page.tsx` matching `/orgs/acme/projects` → no match (URL has an extra segment).
3. `app/docs/[...slug]/page.tsx` matching `/docs/auth/email-password` → `params.slug === ['auth', 'email-password']`.
4. `app/docs/[[...slug]]/page.tsx` matching `/docs` → `params.slug === undefined`.
5. `app/docs/[...slug]/page.tsx` matching `/docs` → no match (regular catch-all requires at least one segment).

The recognition of the matching semantics locks in.

A `CodeReview` exercise on a 35-line dynamic-route file with six issues:
- The page is not `async` but `params` is awaited — fix: `async` keyword.
- `params.id` is used directly in a database query without parsing — fix: Zod-parse first.
- The folder is `[invoiceId]` but the code reads `params.id` — fix: rename one to match the other.
- A `[...slug]` route expected to handle the parent URL — fix: use `[[...slug]]`.
- A `Number(params.id)` without `NaN` check — fix: Zod's `z.coerce.number()` or explicit `isNaN` check + `notFound()`.
- A page that returns `null` when no resource is found instead of calling `notFound()` — fix: call `notFound()` so the framework's not-found boundary fires.

A `ReactCoding` block (App Router preconfigured, mock data fixture) has the student build `app/invoices/[id]/page.tsx`: read the id from params (async), parse with Zod, fetch from the mock store, return `notFound()` if missing, render the invoice details. The grader checks: the page is async, params is awaited, the schema validates, `notFound()` fires on missing IDs.

Close with a `TrueFalse` round of six statements: "`params` is a Promise in Next.js 16" (true), "Captured dynamic segments are always strings" (true), "`[...slug]` matches the parent URL" (false — use `[[...slug]]`), "Two `[id]` segments in the same route work fine" (false — name collision, build error), "`generateStaticParams` pre-renders dynamic routes at build time" (true), "A page must validate `params` before passing them to a database query" (true — the URL is untrusted). The model locks in.

Estimated student time: 45 to 55 minutes. Load-bearing for every dynamic-route page in the course, the `searchParams` model in Chapter 5.5, and the project in Chapter 5.7.

---

## Lesson 5.1.4 — Navigation: `<Link>`, `redirect`, `notFound`, `permanentRedirect`

Topics to cover:

- The senior question: the student has a list of invoices and a detail page per invoice. They want a row click to navigate to the detail page without a full reload (soft navigation), they want a missing invoice to render a "not found" UI, they want a login-required page to send unauthenticated users to `/sign-in`, and they want an old URL like `/invoices/legacy/[id]` to permanently redirect to `/invoices/[id]`. What does the framework offer? The naive answer is "set `window.location` and call it a day." The 2026 answer names the four mechanisms: `<Link>` for client-side soft navigation, `redirect()` for server-side temporary redirects, `permanentRedirect()` for server-side permanent redirects, and `notFound()` for the "this resource doesn't exist" signal.
- **`<Link>` from `next/link` — client-side soft navigation.** The shape:
  ```tsx
  import Link from 'next/link';

  <Link href="/invoices/42">View invoice</Link>
  ```
  The senior call-outs: `<Link>` extends `<a>` (Chapter 4.1.4 named the `<Link>` vs. `<a>` distinction); the framework intercepts the click, fetches the destination route's bundle and data, and swaps the page in place without a full reload; the URL updates in the address bar; the browser back button works; the user sees no flash of white. The student writes `<Link>` for every in-app navigation; bare `<a>` is reserved for external links (`<a href="https://stripe.com" target="_blank" rel="noopener">`).
- **Prefetching — the navigation performance model.** A concrete walkthrough. By default (`prefetch={null}` or omitted), `<Link>` prefetches the linked route's static parts when the link enters the viewport, and the route's dynamic parts on hover. The result: the user clicks and the page appears instantly because the framework already has it. The `prefetch` prop overrides:
  - **`prefetch={true}`** — prefetch the full route (static and dynamic) on viewport intersection. Use when the route is expensive to render and the student wants the user's first click to feel instant.
  - **`prefetch={false}`** — disable prefetching entirely. Use when the link points to a route that's expensive to *prefetch* (a route with a server query the student doesn't want to fire on hover) or a route under heavy rate-limit constraints.
  - **`prefetch={null}` / omitted** — the intelligent default; static on viewport, dynamic on hover. The senior reach for almost every case.
- **Programmatic navigation — `useRouter` from `next/navigation`.** A short forward-reference. When the navigation needs to happen from a handler (a form submit, a button click that runs logic first), the student reaches for `useRouter`:
  ```tsx
  'use client';
  import { useRouter } from 'next/navigation';

  const router = useRouter();
  // router.push('/invoices/42'), router.replace('/'), router.back(), router.refresh()
  ```
  The senior call-outs: `useRouter` is *only* in Client Components (the `'use client'` directive is required); `router.push` navigates; `router.replace` navigates without adding to history; `router.back` goes back; `router.refresh` re-fetches the current route's data without a full reload. The full surface is in Chapter 5.5.5 — this lesson names it in the context of "you'll need this when `<Link>` doesn't fit."
- **`redirect()` from `next/navigation` — server-side temporary redirect (HTTP 307).** The shape:
  ```tsx
  import { redirect } from 'next/navigation';

  export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect('/sign-in');
    return <h1>Dashboard</h1>;
  }
  ```
  The senior call-outs: `redirect()` works in Server Components, Client Components, route handlers, and Server Actions; it *throws* a special error the framework catches (which means code after `redirect()` doesn't execute — this is the intended shape); the HTTP status is 307 (Temporary Redirect) by default; in a Server Action context it's 303 (See Other) so the browser follows with a GET; in a streaming context it inserts a `<meta http-equiv="refresh">` tag in the client. The senior reach: auth guards in layouts and pages, post-action redirects after a form submission.
- **`permanentRedirect()` — HTTP 308 for permanent URL moves.** The shape:
  ```tsx
  import { permanentRedirect } from 'next/navigation';

  export default function LegacyInvoicePage({ params }) {
    permanentRedirect(`/invoices/${params.id}`);
  }
  ```
  The senior call-outs: HTTP 308 (Permanent Redirect); SEO and the browser's bfcache treat 308 as "this is the new canonical URL, update the cache and don't ask again"; use only when the URL is *permanently* moving (a feature rename, a URL-structure migration). The threshold: would a search engine update its index, would the browser remember this redirect for the user's session, would another site's link to the old URL be wrong to follow? If yes to all, 308; if temporary (auth gate, feature flag, A/B test), 307.
- **`notFound()` — the "resource doesn't exist" signal.** The shape:
  ```tsx
  import { notFound } from 'next/navigation';

  export default async function InvoicePage({ params }) {
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) notFound();
    return <InvoiceDetail invoice={invoice} />;
  }
  ```
  The senior call-outs: `notFound()` throws a special error the framework catches; the framework finds the closest `not-found.tsx` in the route tree (or the root `not-found.tsx` if none nearby) and renders it; the HTTP status is 404. The senior reach: every dynamic-route page calls `notFound()` when the underlying resource doesn't exist. The full `not-found.tsx` treatment is in Chapter 5.3 — this lesson installs the signal.
- **Where each mechanism earns its weight.** A short decision tree:
  - **`<Link>`** for every in-app navigation the user clicks. The default.
  - **`useRouter().push`** when navigation runs from a handler (post-submit, conditional).
  - **`redirect()`** for server-side auth gates, post-action redirects, and any "send the user elsewhere based on server state" situation. Temporary by definition.
  - **`permanentRedirect()`** for permanent URL moves only. Rare; the threshold is "update search engine indexes."
  - **`notFound()`** when a resource doesn't exist. Every dynamic route is a candidate.
- **The threshold — `redirect()` vs. `permanentRedirect()` once more.** A short cash-in because the distinction matters. `redirect()` says "for now, go here; the old URL might come back." `permanentRedirect()` says "this URL is dead, the new one is canonical, update your bookmarks." The 2026 reach is overwhelmingly `redirect()` — most redirects are conditional (auth, feature flags, role-based routing). `permanentRedirect()` earns its weight for URL migrations and brand changes only.
- **The watch-outs a senior names:**
  - **`<Link>` for in-app, `<a>` for external** — Chapter 4.1.4 named the rule; this lesson reinforces it.
  - **`redirect()`, `notFound()`, `permanentRedirect()` throw — code after them does not execute.** Don't wrap in `try/catch` (you'll catch the framework's signal and break the redirect); don't put cleanup after them.
  - **`redirect()` in a Server Action returns HTTP 303** (See Other), not 307. The browser follows with GET. This is the correct behavior for post-action redirects.
  - **`useRouter` is `next/navigation`, not `next/router`** — `next/router` is the legacy Pages Router hook. Named once for recognition.
  - **`prefetch={true}` on every link is a regression** — it fires server work for routes the user might never visit. Use the default.
  - **`prefetch={false}` on routes the user always navigates to is also a regression** — the user pays the network cost on click.
  - **`router.refresh()` re-fetches the current route's data** — it's the "post-mutation refresh" reach when the page should re-render with fresh server-side data. Chapter 5.4.6 owns the full mutation-revalidation tree.
  - **`<Link>` to an external URL works but loses prefetching and soft navigation** — use `<a>` for external links.
  - **`<Link replace>` replaces history instead of pushing** — for navigations the user shouldn't be able to "back" into (post-error retry, search-form clear).
  - **The `scroll` prop** — `<Link scroll={false}>` disables the automatic scroll-to-top on navigation. Default is `true`. Use when the navigation is in-page and scroll position should persist.

What this lesson does not cover:

- The full `useRouter` / `usePathname` / `useSearchParams` / `useParams` surface — Chapter 5.5.5.
- Server Actions and the post-action `redirect()` pattern — Chapter 7.2.
- `not-found.tsx`, `error.tsx`, `global-error.tsx` — Chapter 5.3.
- Middleware-level redirects in `proxy.ts` — Chapter 5.5.3.
- The full mutation-revalidation tree (`revalidatePath`, `revalidateTag`, `router.refresh`) — Chapter 5.4.6.
- `next.config.ts` redirects for project-wide URL maps — Chapter 5.6.3.

Pedagogical approach:

Mechanics-plus-decision archetype. The lesson installs the four navigation mechanisms, where each earns its weight, and the prefetching model. The deliverable is fluency — the student reaches for `<Link>` by default, `redirect()` for server-side auth, `notFound()` for missing resources, and never confuses the four.

Open with the senior question — "you need to send an unauthenticated user to `/sign-in` from a server-rendered page; what do you call?" — and a `MultipleChoice` exercise pitting four answers (return a `<meta http-equiv="refresh">` tag — wrong, too slow and brittle; set `window.location.href` — wrong, can't run on the server; call `redirect('/sign-in')` from `next/navigation` — right; throw a custom error — wrong, the framework has a primitive for this).

An `AnnotatedCode` block walks a worked auth-guarded page — 12 lines with `getSession()`, a `redirect('/sign-in')` on no session, and a normal render path. Annotations call out: `redirect` throws (no `return` needed), the server-side import, the HTTP 307 status.

A `FileTree` plus `CodeVariants` shows three variants of the same dynamic-route page:
- Variant 1: Render `<p>No invoice found</p>` when the invoice doesn't exist — anti-pattern.
- Variant 2: `return null` — also wrong, framework treats this as empty render.
- Variant 3: `notFound()` — the senior pattern; the framework's `not-found.tsx` fires.

A `Matching` exercise pairs ten navigation scenarios with the right mechanism:
- Clicking a row to open its detail page → `<Link>`.
- Redirecting after a successful form submit → `redirect()` in the Server Action.
- Old `/legacy-invoices/[id]` → new `/invoices/[id]` → `permanentRedirect()`.
- Auth gate sending unauthenticated user to sign-in → `redirect()` in the layout or page.
- Loading a detail page for an invoice that was deleted → `notFound()`.
- Programmatic navigation after a multi-step wizard completes → `useRouter().push()`.
- External link to Stripe docs → bare `<a target="_blank" rel="noopener">`.
- Re-fetching data after a mutation without a navigation → `router.refresh()`.
- A link that shouldn't add to browser history → `<Link replace>`.
- A link to a page expected to stay on the same scroll position → `<Link scroll={false}>`.

A `Buckets` exercise sorts ten redirect scenarios into "`redirect()` (307)" vs. "`permanentRedirect()` (308)":
- Auth guard sending to sign-in → 307.
- Migrating `/blog/old-slug` → `/blog/new-slug` permanently → 308.
- Feature flag routing → 307.
- Role-based dashboard routing → 307.
- Renaming the entire app from `/app/*` to `/dashboard/*` → 308.
- A/B test variant routing → 307.
- Removing a deprecated URL with a permanent replacement → 308.
- Post-action redirect to a success page → 307 (303 in a server action context).
- Locale routing based on user preference → 307.
- Vanity URL forwarding (`/twitter` → `/x.com/user`) → 308.

A `PredictOutput` exercise on four `<Link>` scenarios:
1. `<Link href="/invoices/42">View</Link>` enters the viewport → predict: the static parts of `/invoices/42` are prefetched.
2. User hovers the link → predict: the dynamic parts are prefetched too.
3. `<Link href="/heavy-route" prefetch={false}>` enters the viewport → predict: no prefetch.
4. `<Link href="https://stripe.com">Stripe</Link>` clicked → predict: full page load, no soft navigation (external URL, no prefetching applies).

A `CodeReview` exercise on a 35-line page component with six issues:
- A `<a href="/dashboard">` for an in-app link — fix: `<Link href="/dashboard">`.
- A `try/catch` around `redirect('/sign-in')` — fix: don't catch the framework's signal; let it throw.
- `permanentRedirect()` used for an auth gate — fix: `redirect()` (auth is temporary state).
- A missing-invoice page returning `<p>Not found</p>` — fix: `notFound()`.
- `<Link href="/dashboard" prefetch={true}>` on every link in a long list — fix: omit `prefetch` to use the intelligent default.
- `import { useRouter } from 'next/router'` — fix: `from 'next/navigation'`.

The student leaves a comment per issue with the senior fix.

A `ReactCoding` block has the student build a list page and a detail page: the list renders rows with `<Link>` to each detail; the detail page parses `id` from `params`, fetches from a mock store, calls `notFound()` if missing, and renders the data. The grader checks: every list row is a `<Link>`, the detail page is async with awaited `params`, `notFound()` fires on missing data, no `<a>` is used for in-app links.

Close with a `TrueFalse` round of six statements: "`<Link>` always replaces `<a>` for in-app navigation" (true), "`redirect()` and `notFound()` can be wrapped in `try/catch`" (false — they throw the framework's signal), "`permanentRedirect()` emits HTTP 308" (true), "`useRouter` works in Server Components" (false — Client Components only), "`<Link prefetch={true}>` on every link is best practice" (false — the default is intelligent; `true` everywhere is a regression), "`router.refresh()` re-fetches the current route's server-side data" (true). The model locks in.

Estimated student time: 50 to 60 minutes. Load-bearing for every navigation in the course, the auth guard pattern in Unit 9, and the project in Chapter 5.7.

---

## Lesson 5.1.5 — Parallel routes and slots

Topics to cover:

- The senior question: the student is building a list-plus-detail surface — a left pane showing a list of invoices and a right pane showing the focused invoice. Both should live at the same URL (`/invoices/42` shows the list on the left, invoice 42 on the right). Both should have their own loading skeleton, their own error boundary, their own "nothing selected" state. The naive answer is "render both in one page component, hand-roll the URL state." The 2026 answer names parallel routes — named slots in a layout that render independently, each owning its own route segment, each with its own `loading.tsx`, `error.tsx`, and `not-found.tsx` boundary.
- **`@slot` — the named-slot folder convention.** The shape:
  ```
  app/invoices/
    layout.tsx
    page.tsx              // the children prop receives this
    @list/
      page.tsx            // the @list slot receives this
    @detail/
      [id]/
        page.tsx          // /invoices/42 renders this in @detail
      default.tsx         // unmatched fallback for @detail
  ```
  The layout receives each slot as a named prop:
  ```tsx
  // app/invoices/layout.tsx
  export default function InvoicesLayout({
    children,
    list,
    detail,
  }: {
    children: React.ReactNode;
    list: React.ReactNode;
    detail: React.ReactNode;
  }) {
    return (
      <div className="grid grid-cols-[1fr_2fr]">
        <aside>{list}</aside>
        <main>{detail}</main>
      </div>
    );
  }
  ```
  The senior call-outs: each `@slot/` folder is itself a mini route tree — it has its own `page.tsx`, its own dynamic segments (`@detail/[id]/page.tsx`), its own `loading.tsx`, its own `error.tsx`; the slot's prop in the layout has the slot's name; the regular `page.tsx` at the segment becomes the `children` prop; multiple slots can coexist in one layout.
- **`default.tsx` — the unmatched-slot fallback.** A concrete walkthrough of the most-bitten gotcha. When the user navigates to `/invoices/42`, the URL matches `@detail/[id]/page.tsx`. The `@list` slot has nothing matching — but the slot still needs to render something. Two cases:
  - **Soft navigation.** The framework remembers the slot's previous state (the list was already rendered when the user was on `/invoices`; the soft navigation to `/invoices/42` keeps the list rendered). The list slot renders its previous match.
  - **Hard navigation (direct visit, refresh, `Cmd+click`).** The framework has no previous state to remember; the slot's URL state can't be reconstructed. Without a `default.tsx`, the entire route renders a 404. With a `default.tsx`, the unmatched slot renders the default. The senior reflex: **every parallel slot ships a `default.tsx`.** Forgetting this is the single most common parallel-routes bug.
  - The shape:
    ```tsx
    // app/invoices/@detail/default.tsx
    export default function DetailDefault() {
      return <EmptyState message="Select an invoice to view details" />;
    }
    ```
- **Slots stream independently with Suspense.** A short cash-in of the Chapter 5.3 forward reference. When each slot has its own `loading.tsx`, the framework streams the route's HTML in pieces — the list slot's HTML appears as soon as the list's data is ready, the detail slot's HTML appears when the detail's data is ready, the layout's static shell appears immediately. The senior recognition: parallel routes are not just a layout pattern; they're a streaming pattern. Independent slots stream as independent Suspense boundaries. Chapter 5.3 owns Suspense in full; this lesson names the connection.
- **The canonical list-plus-detail pattern.** A concrete walkthrough. The shape:
  ```
  app/invoices/
    layout.tsx
    @list/
      page.tsx              // list of all invoices, filtered by ?status=
      loading.tsx           // list skeleton
    @detail/
      [id]/
        page.tsx            // focused invoice
        loading.tsx         // detail skeleton
      default.tsx           // "select an invoice"
  ```
  The user lands on `/invoices` — the list renders, the detail shows "select an invoice." The user clicks invoice 42 — the URL becomes `/invoices/42`, the list stays mounted (it's the same slot match), the detail slot updates to show invoice 42's data, only the detail's loading skeleton appears during the load. The list does not re-render. The student gets the UI shape the SaaS world has been hand-rolling with client-side state for a decade, with a real URL and refreshability.
- **`searchParams` for the list filter, `params` for the detail.** A short worked example. The list reads `?status=paid` from `searchParams`:
  ```tsx
  // app/invoices/@list/page.tsx
  export default async function InvoiceList({
    searchParams,
  }: {
    searchParams: Promise<{ status?: string }>;
  }) {
    const { status } = await searchParams;
    // …
  }
  ```
  The detail reads `params.id`:
  ```tsx
  // app/invoices/@detail/[id]/page.tsx
  export default async function InvoiceDetail({
    params,
  }: {
    params: Promise<{ id: string }>;
  }) {
    const { id } = await params;
    // …
  }
  ```
  The senior recognition: both slots receive their slice of the URL state independently, and both await their async APIs. The `searchParams` model is Chapter 5.5.4; the lesson names the shape in context.
- **When parallel routes earn their weight.** A short threshold. Use parallel routes when:
  - **Two or more independent areas of a route render at the same time and need their own URL state, loading, error, or not-found behavior.** List-plus-detail. A dashboard with a stats panel and a chart that load independently. A settings page with a left nav and a right content area.
  - **The user expects refreshability and deep-linkability of the combined state.** A `/invoices/42?status=paid` URL the user can bookmark and the list filter survives the refresh.
  - **A modal that needs URL persistence.** Lesson 5.1.6 cashes this in with intercepting routes; parallel routes are the foundation.
  - Don't reach for parallel routes when:
  - **A single page can render both areas in one component.** If there's no independent URL state, loading, or error per area, just write one page. Parallel routes are the carve-out, not the default.
  - **Two completely separate routes happen to share a layout.** That's just nested layouts (5.1.2), not parallel routes.
- **The watch-outs a senior names:**
  - **Every slot needs a `default.tsx`** — without it, direct navigation to a URL that doesn't match every slot renders a 404.
  - **The `@` prefix is a slot convention, not a route group** — `@list` is a slot the layout receives as a prop; `(list)` is a route group invisible to URL.
  - **Slots don't appear in the URL** — `@detail/[id]/page.tsx` matches `/[id]`, not `/@detail/[id]`.
  - **The layout's prop name matches the slot folder name** — `@list/` produces a `list` prop; `@detail/` produces a `detail` prop. TypeScript catches the typo only if the layout is fully typed.
  - **Slots are scoped to one layout** — a slot defined in `app/invoices/@list/` is the prop in `app/invoices/layout.tsx`, not in a deeper layout.
  - **Adding a slot is a breaking change to the layout's type** — the layout's `children` prop is automatic, but each new slot adds a new prop. The student adds the prop to the layout when the slot ships.
  - **Each slot has its own loading and error boundary** — if the list's data fails, only the list slot renders an error UI; the detail slot keeps rendering normally. This is the feature; it's why parallel routes are worth the indirection.
  - **`children` is the regular `page.tsx` in the same segment** — it's not a slot; it's the unnamed default route that lives alongside the slots.
  - **Hard navigation rebuilds slot state from URL only** — if a slot's content was set via a click that didn't change the URL, refresh loses it. This is by design; URL state is the source of truth.

What this lesson does not cover:

- Intercepting routes — the modal pattern (5.1.6).
- Suspense, streaming, `loading.tsx`, `error.tsx` at depth — Chapter 5.3.
- `searchParams` at depth and the URL-state SaaS pattern — Chapter 5.5.4.
- The list-plus-detail project — Chapter 5.7 wires the full surface.
- Routing in `proxy.ts` for tenant-scoped slot rendering — Chapter 5.5.

Pedagogical approach:

Concept-plus-mechanics archetype. The lesson installs the slot model — named slots are independent route segments rendered alongside the regular `page.tsx`, each with its own URL state, loading, error, and not-found boundary, all composed by the parent layout. The deliverable is the recognition reflex — the student sees a UI with two areas that need independent URL state and reaches for parallel routes, not for `useState` and a query parameter.

Open with the senior question — "you want a list pane and a detail pane sharing a URL, each with its own loading skeleton; how does the framework let you do this without hand-rolling state?" — and a `MultipleChoice` exercise pitting four answers (render both in one page with `useState` for the selected ID — wrong, no URL persistence; two separate routes with a portal between them — wrong, no shared layout; parallel routes with `@list` and `@detail` slots — right; nested layouts with the detail in a child layout — wrong, only one URL slot per nesting).

A `FileTree` block walks the canonical list-plus-detail shape:
```
app/invoices/
  layout.tsx
  page.tsx
  @list/
    page.tsx
    loading.tsx
  @detail/
    [id]/page.tsx
    [id]/loading.tsx
    default.tsx
```
Annotations call out: the slot folders, the layout's three props (`children`, `list`, `detail`), the per-slot `loading.tsx`, the per-slot `default.tsx`.

An `AnnotatedCode` block walks the layout file — 18 lines with the typed props, the grid layout, the three slots rendered in the JSX. Annotations call out: the typed `React.ReactNode` props, the grid template, the slot order.

A `DiagramSequence` walks the navigation states:
- Frame 1: User on `/invoices`. `@list` shows the list; `@detail` shows the default ("select an invoice").
- Frame 2: User clicks invoice 42. URL becomes `/invoices/42`. `@list` still shows the list; `@detail` starts loading; the detail's `loading.tsx` shows a skeleton.
- Frame 3: Detail's data resolves. `@detail` shows invoice 42.
- Frame 4: User refreshes. URL is still `/invoices/42`. Hard navigation: framework rebuilds from URL. `@list` matches `@list/page.tsx`; `@detail` matches `@detail/[id]/page.tsx`. Both render their loading skeletons, then resolve. The user sees the same state as before the refresh.
- Frame 5: User navigates back to `/invoices`. URL is `/invoices`. `@detail` has no matching URL pattern; `default.tsx` renders.

The independent-streaming and refreshability story locks in.

A `Matching` exercise pairs eight slot configurations with what renders:
- `/invoices` and `@list/page.tsx` exists, `@detail/default.tsx` exists → list renders, detail renders default.
- `/invoices/42` and `@list/page.tsx` exists, `@detail/[id]/page.tsx` exists → list renders, detail renders invoice 42.
- `/invoices/42` after a refresh (hard nav) and `@detail/default.tsx` is missing → 404 across the entire route.
- `/invoices` and the list's data fails → `@list/error.tsx` renders, `@detail` renders default normally.
- And four more.

A `Buckets` exercise sorts ten UI patterns into "use parallel routes" vs. "use nested layouts" vs. "use one page (no parallel routes)" vs. "use intercepting routes" (forward-reference to 5.1.6):
- List-plus-detail with shared URL → parallel routes.
- Dashboard with sidebar and main content → nested layouts (sidebar is in the layout).
- Modal with shareable URL → intercepting routes (5.1.6).
- Single-form settings page → one page.
- A stats overview where each card loads its own data with its own skeleton → parallel routes (or just Suspense inside one page — the threshold is whether each card needs its own URL or just its own loading boundary; the senior call: Suspense alone if no URL, parallel routes if each card has its own route).
- A tab interface where each tab is a route → could be nested layouts (one layout with `<TabBar />` and the page renders tab content) or parallel routes (each tab is a slot — rare, only if the tabs need independent URL state).
- And four more.

A `CodeReview` exercise on a 40-line parallel-routes structure with six issues:
- A `@detail/` slot without a `default.tsx` — fix: add `default.tsx` so direct navigation to `/invoices/42` doesn't 404.
- A layout that forgets to type the `list` prop — fix: add `list: React.ReactNode` to the layout's props.
- A slot folder named `list/` without the `@` prefix — fix: rename to `@list/` so it's a slot, not a regular route.
- A slot's `page.tsx` that reads `searchParams` without awaiting — fix: `await searchParams`.
- A `default.tsx` that returns `null` — fix: render a meaningful empty state.
- A single-slot setup where the slot is the only content (no other slots, no `children`) — fix: this is just a normal route; don't introduce slots without parallel rendering.

A `ReactCoding` block (App Router + mock data preconfigured) has the student build the list-plus-detail surface: a layout with `@list` and `@detail` slots, a `@list/page.tsx` rendering a list of invoices with `<Link>` to each, a `@detail/[id]/page.tsx` rendering the focused invoice, a `@detail/default.tsx` showing "select an invoice." The grader checks: the layout receives both slots as props, every slot has its `page.tsx` (and `default.tsx` for `@detail`), navigation between list rows updates only `@detail`, hard refresh on `/invoices/42` works.

Close with a `TrueFalse` round of six statements: "Every parallel slot should have a `default.tsx`" (true), "Slots appear in the URL as `/@list/`" (false — they're invisible), "Slots stream independently when each has its own loading.tsx" (true), "Parallel routes are the right tool for any page with multiple sections" (false — only when each section needs its own URL state and boundaries), "The layout receives slots as named props matching the `@slot` folder name" (true), "Adding a slot is non-breaking to the layout's type" (false — the layout needs the new prop typed). The model locks in.

Estimated student time: 50 to 65 minutes. Load-bearing for Lesson 5.1.6 (intercepting routes build on the slot model), Chapter 5.3 (Suspense at the slot boundary), and Chapter 5.7 (the project wires the full list-plus-detail surface).

---

## Lesson 5.1.6 — Intercepting routes and the modal-with-real-URL pattern

Topics to cover:

- The senior question: the student has a feed of photos. Clicking a photo should open it in a modal overlay — the feed stays visible behind, the photo's URL is `/photos/42`, the URL is shareable. But if a user lands on `/photos/42` directly (via a shared link, a refresh, or `Cmd+click`), they should see a full photo page, not a modal floating over an empty feed. The naive answer: client-side modal state with `?photo=42` in the URL — which loses the "full page on direct visit" behavior. The 2026 answer names intercepting routes: a folder `(.)photo/[id]` next to the feed route intercepts soft navigations to `/photo/42` and renders the modal in-place, while the non-intercepting `app/photo/[id]/page.tsx` handles direct visits.
- **The intercepting prefixes — `(.)`, `(..)`, `(..)(..)`, `(...)`.** A short, complete tour:
  - **`(.)folder`** — intercept a route at the same level. `app/feed/(.)photo/[id]/page.tsx` intercepts `/feed/photo/42` (relative to `/feed`).
  - **`(..)folder`** — intercept a route one level up. `app/feed/(..)photo/[id]/page.tsx` intercepts `/photo/42` (one level up from `/feed`).
  - **`(..)(..)folder`** — intercept a route two levels up.
  - **`(...)folder`** — intercept a route from the root `app/` directory, regardless of nesting depth.
  - The senior recognition: the prefix is relative to the *route segment* (the URL path), not the file system. The `(..)` pattern operates on URL segments, not on folder depth.
- **The always-paired non-intercepting route.** A concrete walkthrough of the most-load-bearing rule. An intercepting route is the *soft-navigation* render path. The same URL on direct visit, refresh, or `Cmd+click` (a hard navigation) renders the *non-intercepting* route at that URL. The shape:
  ```
  app/
    feed/
      page.tsx                  // the feed
      @modal/
        (.)photo/
          [id]/page.tsx         // intercepted: modal in @modal slot
        default.tsx
    photo/
      [id]/
        page.tsx                // not intercepted: full photo page
  ```
  - **Soft navigation** (`<Link>` click from `/feed`) → `(.)photo/[id]/page.tsx` renders inside `@modal`. The feed stays mounted underneath; the modal floats on top.
  - **Hard navigation** (direct visit, refresh, `Cmd+click` to open in new tab) → `app/photo/[id]/page.tsx` renders as a full page. No modal; no feed.
  - The senior reflex: **every intercepting route ships its non-intercepting sibling.** Without the non-intercepter, the URL works on soft nav and 404s on direct visit. The most common bug.
- **The combined pattern — intercepting + parallel routes for a URL-driven modal.** A walkthrough of the full canonical shape:
  ```
  app/
    layout.tsx
    feed/
      layout.tsx
      page.tsx                  // the feed
      @modal/
        default.tsx             // empty (closes the modal)
        (.)photo/[id]/page.tsx  // intercepted: the modal
    photo/[id]/page.tsx         // not intercepted: the full page
  ```
  The feed's layout renders both `children` (the feed page) and the `@modal` slot. On a normal `/feed` visit, `@modal` renders `default.tsx` (empty — modal closed). On a soft navigation to `/feed/photo/42`, `(.)photo/[id]/page.tsx` matches and renders inside `@modal` — the modal is the photo, the feed stays underneath. On a hard visit to `/photo/42`, the full page renders. The student gets:
  - **URL persistence** — the modal has a real URL.
  - **Refreshability** — refresh shows the full page; soft nav shows the modal.
  - **Shareability** — paste the URL elsewhere, the recipient sees the full page; navigating from inside the app sees the modal.
  - **Browser back/forward** — works correctly because the URL is real.
  - **`Cmd+click`** — opens the full page in a new tab.
  - The senior anchor: this is the pattern state-driven modals cannot ship. Any time a feature requires shareable, refreshable, deep-linkable in-context views, the answer is parallel + intercepting routes.
- **Closing the modal — back navigation and `@modal/default.tsx`.** A short cash-in. The user is in the modal; the modal's "close" button calls `router.back()` or navigates to `/feed` (the parent route). Either way, the URL becomes `/feed`, `@modal` no longer has a match, and `@modal/default.tsx` (empty content) renders — the modal closes naturally because the URL changed. The senior recognition: closing the modal is *navigating away from its URL*, not toggling React state.
- **Implementation watch-outs:**
  - **The `(.)` prefix uses the URL segment as a reference, not the file system.** `(.)photo` means "intercept the route at the same URL-segment level as the intercepting file's parent." A common mistake is treating `(..)` as "one folder up" instead of "one URL segment up."
  - **Route groups in the path are invisible to interception** — `(.)folder` only counts non-group URL segments.
  - **The intercepting route must be in a parallel slot** — `@modal/(.)photo/[id]/page.tsx`, not `(.)photo/[id]/page.tsx` directly under the feed page. The parallel slot is what gives the modal its own loading, error, and rendering surface separate from the feed.
  - **The non-intercepting sibling must exist** — every `(.)photo/[id]/page.tsx` ships with `app/photo/[id]/page.tsx`.
  - **The non-intercepting and intercepting components can be the same file imported twice** — a shared `<PhotoDetail />` component renders in both, with a different surrounding wrapper (a `<Modal>` for the intercepted, a normal page layout for the direct visit).
  - **The intercepter only fires on soft navigation initiated within the app** — a `<Link>` click. External entry (a Google search result, a shared link, a bookmark, refresh, `Cmd+click`) is always a hard navigation, which is always the non-intercepting render.
- **The modal UI itself.** A short cash-in. The intercepting page renders the modal's contents inside a `<Modal>` (or `<Dialog>`) wrapper. The wrapper is a Client Component (Radix Dialog or shadcn's Dialog, Chapter 4.11.1) because it owns the open/close state, focus management, and `Esc`-to-close. The shape:
  ```tsx
  // app/feed/@modal/(.)photo/[id]/page.tsx
  import { Modal } from '@/components/Modal';
  import { PhotoDetail } from '@/app/photo/[id]/_components/PhotoDetail';

  export default async function PhotoModal({ params }) {
    const { id } = await params;
    return (
      <Modal>
        <PhotoDetail id={id} />
      </Modal>
    );
  }
  ```
  The senior recognition: the modal wrapper handles open state and close handling; the data and content come from the shared `<PhotoDetail />` component, used in both the intercepter and the full page.
- **When intercepting routes earn their weight.** A short threshold:
  - **A "show details without leaving context" UI that should have a real URL.** Photo viewers, message threads, contact-card popovers, in-context edit forms.
  - **The user expects the URL to be shareable and the refresh to "promote" to a full page.** The threshold is: "does the URL need to work outside the app?"
  - **Not for short-lived ephemeral UI.** A "confirm delete?" dialog has no URL persistence reason. Use a regular Dialog with React state.
  - **Not for "modal-like" but app-internal flows.** A multi-step wizard doesn't need URL interception unless each step is shareable. Most wizards live in one page with internal step state.
- **The watch-outs a senior names:**
  - **Always pair the intercepter with the non-intercepter** — without it, hard navigation 404s.
  - **Intercepting routes only fire on soft navigation** — direct visits, refreshes, and `Cmd+click` go through the non-intercepter.
  - **The intercepting folder must be inside a parallel slot** — the slot is what gives the intercepter its own render boundary.
  - **The non-intercepting page and the intercepting page can share a component** — DRY the content; the difference is just the wrapper.
  - **The `(.)` prefix is URL-relative, not file-system-relative** — `(..)` operates on URL segments.
  - **Closing the modal is a navigation, not a state toggle** — `router.back()` or navigate to the parent URL.
  - **The modal's close behavior on hardware back (mobile) is automatic** — the URL is real, the browser back button does the right thing.
  - **Don't intercept routes for non-modal UI** — interception is a specific pattern; using it elsewhere (a hover popover, a tooltip) is over-engineering.

What this lesson does not cover:

- Parallel routes — installed in 5.1.5 and assumed here.
- Modal implementation details, focus management, `Esc`-to-close — Chapter 4.11.3 (focus management) and Chapter 4.11.1 (shadcn Dialog).
- `loading.tsx`, `error.tsx`, `not-found.tsx` at the slot level — Chapter 5.3.
- The list-plus-detail project — Chapter 5.7 wires intercepting routes into a full project surface.
- Animations and transitions for the modal opening — Chapter 4.5.5.

Pedagogical approach:

Concept-plus-pattern archetype. The lesson installs the intercepting-route file convention and the modal-with-real-URL pattern. The deliverable is the recognition reflex — when a feature needs URL persistence, refreshability, and shareability for an in-context view, the student reaches for parallel + intercepting routes, not for React state.

Open with the senior question — "a photo modal needs a real URL, refresh should land on a full page, `Cmd+click` should open the full page in a new tab; how do you implement this?" — and a `MultipleChoice` exercise pitting four answers (React state plus a `?photo=42` query param — wrong, no full-page on refresh; two separate routes and a portal — wrong, no soft-nav modal; intercepting routes paired with a non-intercepting fallback — right; client-side routing with a custom modal manager — wrong, reinventing the framework).

A `FileTree` block walks the full canonical structure — `app/feed/`, the `@modal/` slot, the `(.)photo/[id]/page.tsx` intercepter, the `default.tsx`, the non-intercepting `app/photo/[id]/page.tsx`. Annotations call out: the parallel slot, the intercepting prefix, the always-paired non-intercepter, the shared `<PhotoDetail />` component imported by both.

An `ArrowDiagram` (`Figure`-wrapped) renders the two rendering paths side by side:
- Left: Soft navigation. User clicks `<Link href="/photo/42">` from `/feed`. Arrows show the intercept firing in `@modal`, the feed staying mounted, the modal rendering over it.
- Right: Hard navigation. User refreshes `/photo/42` or visits directly. Arrows show the non-intercepting `app/photo/[id]/page.tsx` rendering as a full page, no modal, no feed.

The dual-path model locks in.

An `AnnotatedCode` block walks the intercepting page — 12 lines with the imported Modal wrapper, the shared `<PhotoDetail />` import, the `await params`, the modal rendering. Annotations call out: the file path with the `(.)` prefix, the shared component reuse, the Server Component shape.

A `Matching` exercise pairs ten URL behaviors with what renders:
- `/feed` then `<Link>` to `/photo/42` → modal in `@modal` slot.
- Direct visit to `/photo/42` → full page from `app/photo/[id]/page.tsx`.
- `Cmd+click` on `<Link href="/photo/42">` → new tab, full page.
- Refresh while modal is open → full page.
- Close the modal (click X) → navigate back to `/feed`, `@modal/default.tsx` renders.
- `/photo/42` shared link opened in another browser → full page.
- And four more.

A `Buckets` exercise sorts ten UI patterns into "intercepting route" vs. "client-side modal (React state)" vs. "separate page":
- Photo viewer with shareable URL → intercepting route.
- Confirm-delete dialog → client-side modal.
- Compose-message popover that should be URL-addressable → intercepting route.
- A tooltip on hover → not a modal at all.
- A multi-step wizard with no shareable intermediate state → client-side modal (or its own page).
- A "view contact details" popover with URL → intercepting route.
- A toast notification → not a route.
- A full-page edit form for a record → separate page (no need to intercept).
- A "quick view" of a product card with URL → intercepting route.
- A login modal that doesn't need URL persistence → client-side modal.

A `PredictOutput` exercise on five intercepting-route scenarios:
1. `(.)photo` inside `app/feed/@modal/` matches `/photo/42` (which is not under `/feed`). True or false?  (Depends on prefix semantics — `(.)` is same-segment level; the right answer requires checking the URL-segment relationship.)
2. User on `/feed`, soft-nav to `/photo/42` → modal renders.
3. Refresh on `/feed/photo/42` URL pattern → behavior depends on whether the modal route is intercepted at `/feed`'s level.
4. No `default.tsx` in `@modal`, hard nav to `/photo/42` → 404 (modal slot has no fallback).
5. Non-intercepting `app/photo/[id]/page.tsx` is missing, direct visit to `/photo/42` → 404.

The dual-path semantics lock in.

A `CodeReview` exercise on a 35-line intercepting-route setup with six issues:
- An intercepter without a non-intercepting sibling — fix: add `app/photo/[id]/page.tsx`.
- An intercepter not inside a parallel slot — fix: nest under `@modal/`.
- A `@modal/` slot without `default.tsx` — fix: add `default.tsx` returning null or empty.
- Two separate `<PhotoDetail />` implementations (one in the intercepter, one in the full page) — fix: extract to a shared component.
- A close button calling `setOpen(false)` instead of `router.back()` — fix: navigate, since the URL is the source of truth.
- A `(.)photo` prefix when the intent is "one URL segment up" — fix: `(..)photo`.

A `ReactCoding` block has the student wire a feed-plus-modal: a feed page with `<Link href="/photo/N">` per item, the parallel slot with the intercepter, the `default.tsx`, and the non-intercepting full page. The grader checks: soft navigation triggers the modal, hard navigation triggers the full page, closing the modal navigates back to the feed.

Close with a `TrueFalse` round of six statements: "Intercepting routes work for soft and hard navigation" (false — only soft), "Every intercepting route needs a non-intercepting sibling" (true), "The intercepter must be inside a parallel slot" (true), "Intercepting routes solve the modal-with-real-URL pattern" (true), "Closing the intercepting modal is a navigation, not a state toggle" (true), "Intercepting routes should be used for every modal in the app" (false — only for shareable, refreshable modals). The pattern locks in.

Estimated student time: 50 to 65 minutes. Load-bearing for Chapter 5.7 (the project's intercepting modal), Chapter 11.1 (URL-state list views), and the senior reflex of reaching for URL-backed UI in every later SaaS pattern.

---

## Lesson 5.1.7 — Chapter quiz

Top 10 topics to quiz:

- File-system routing — what makes a folder a route, what makes a file a routable leaf (`page.tsx`, `route.ts`), what makes a folder non-routable (`_underscore` private folders, missing `page.tsx`).
- Architectural Principle #1 — co-locate by feature, not by layer. The senior reflex: route-specific code lives inside the route folder under `_components/` or `_lib/`; top-level `components/`, `lib/` reserved for genuinely shared code.
- Layouts and the layout/page render boundary — layouts stay mounted across navigations within their subtree; state in a Client Component inside a layout survives navigation; pages re-mount.
- Route groups — `(folder)` is invisible to the URL; used for organizing routes under different layouts, for "shared layout without URL prefix," and for separating marketing from app surfaces.
- Dynamic segments — `[param]` captures a URL part; `params` is a Promise in Next.js 16, awaited in Server Components or unwrapped with `React.use()` in Client Components; captured values are always strings; validate before use (Zod).
- Catch-all vs. optional catch-all — `[...slug]` matches one-or-more segments and does not match the parent; `[[...slug]]` matches zero-or-more and matches the parent. The senior reach is narrow.
- Navigation primitives — `<Link>` for in-app soft navigation with intelligent prefetching, `useRouter().push` for programmatic, `<a>` for external; `redirect()` (307) for server-side temporary, `permanentRedirect()` (308) for permanent URL moves, `notFound()` for missing resources.
- `<Link>` prefetching — the `null`/`auto` default prefetches static parts on viewport, dynamic on hover; `true` always prefetches everything; `false` disables. The default is the senior reach.
- Parallel routes — `@slot` folders become named props in the layout; every slot needs a `default.tsx` for hard-navigation fallback; slots stream independently with their own loading/error boundaries; the canonical use case is list-plus-detail.
- Intercepting routes — `(.)folder`, `(..)folder`, `(..)(..)folder`, `(...)folder` intercept soft navigations to render in-context; always paired with the non-intercepting sibling at the same URL; the canonical use case is modals with real URLs (shareable, refreshable, deep-linkable).
