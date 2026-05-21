# Chapter 033 — File-system routing with the App Router

## Chapter framing

Chapter 033 teaches the App Router as a contract between the file system and the URL space: a folder under `app/` is a route segment, `page.tsx` is the leaf, `layout.tsx` is the shell every nested page renders inside, `[id]` is a parameter, `(marketing)` is organization without URL impact, `@sidebar` is a slot, and `(.)photo` is an interception. By the end the student recognizes each convention on sight, knows what shape the corresponding default export must take, and reaches for the file the framework offers before inventing a JavaScript workaround. The chapter owns the URL surface — Server vs. Client Components (chapter 034), async UI primitives like `loading.tsx` and `error.tsx` (chapter 035), and the rendering and caching model (chapter 036) are named in context but owned elsewhere. Next.js 16 (February 2026, Turbopack default) is the pinned version; the App Router is the only router the course teaches; Pages Router gets one line for recognition.

Threads that run through every lesson: the file system is the URL space and every convention is framework-enforced; co-location by feature is Architectural Principle #1, with route-specific code living under `_components/` or `_lib/` inside the route folder; layouts compose down the tree while pages are leaves; route groups (`(folder)`) organize without URL impact; dynamic segments hand `params` to the page as a Promise (Next.js 16 async-request APIs); parallel routes (`@slot`) render independent slots at one URL with `default.tsx` as the hard-navigation fallback; intercepting routes (`(.)`, `(..)`, `(...)`) ship the modal-with-real-URL pattern paired with a non-intercepting sibling; navigation is `<Link>` plus `redirect`/`notFound`/`permanentRedirect`. The chapter ships six teaching lessons plus a quiz, ordered by dependency: scaffolding and basic routing first, then layouts and route groups, dynamic segments, navigation primitives, parallel routes, and intercepting routes — Chapter 039 wires them into a project.

---

## Lesson 1 — File tree, page.tsx, and co-location

Teaches how folders under `app/` become URL segments, how `page.tsx` makes a route routable, and the feature co-location rule that puts route-specific code under `_components/` and `_lib/` private folders.

Topics to cover:

- **The senior question.** Given the starter's `app/`, what files does the student create to add `/dashboard` and `/dashboard/invoices`? The lesson establishes that the file system *is* the route table: a folder becomes a URL segment, a `page.tsx` becomes the route's leaf.
- **`pnpm create next-app` — for recognition, not for use.** The course's starter (lesson 1 of chapter 004) is the source of truth; the wizard is named so the student recognizes its output (TypeScript, Tailwind v4, App Router, Turbopack, Biome, `@/*` alias, `AGENTS.md`) when seen elsewhere.
- **The App Router file tree at a glance.** Every folder under `app/` is a route segment; `page.tsx` makes it routable; `layout.tsx` makes it a shell every nested route renders inside; folders without `page.tsx` are valid but produce no URL.
- **`page.tsx` — the route leaf.** Default export required; component name doesn't affect routing; Server Component by default; must live inside a folder under `app/` (bare `app/page.tsx` is the index route).
- **The Pages Router named once, dropped.** Recognition only; the course does not teach it. A `pages/` folder in a legacy codebase is "pre-App-Router; migration out of scope."
- **Architectural Principle #1 — co-locate by feature, not by layer.** Organize by purpose, not by file kind. A feature's components, hooks, helpers, and actions live inside its route folder (`app/dashboard/_components/`, `app/dashboard/_lib/`, `app/dashboard/_actions.ts`); the "by-layer" alternative (top-level `components/`, `hooks/`, `lib/`, `services/`) is named once as the legacy form the App Router rejects.
- **Private folders (`_folder`) — the senior form for non-routable colocation.** A folder prefixed with an underscore is invisible to the routing system. Any non-routable supporting file (`_components/`, `_lib/`, `_actions.ts`) goes under a private folder; bare files in a route folder compete with future framework conventions.
- **What lives outside `app/`.** The project-root surface for genuinely shared code: `lib/` (helpers used by 2+ features), `db/` (Drizzle, Unit 6), `components/` (app-wide UI, often shadcn), `actions/` (rare; shared server actions), `env.ts` (lesson 5 of chapter 004), config files. Threshold for top-level: "used by two or more features."
- **`@/*` and the import-alias contract.** `tsconfig.json` maps `@/*` to project root; the senior reach is `@/` for everything except intra-feature relative imports.
- **Top-level files in the `app/` directory.** Framework-read file conventions at `app/`'s root: `favicon.ico`, `globals.css`, plus the SEO conventions `robots.ts`, `sitemap.ts`, `opengraph-image.{ext}`, `twitter-image.{ext}`, `icon.{ext}`, `apple-icon.{ext}` (Chapter 038 owns the SEO set).
- **`route.ts` named once.** A `route.ts` in a route folder makes it a route handler (HTTP responses, not UI); Chapter 050 owns the full surface. Named here to prevent confusing it with `page.tsx`.
- **Watch-outs:** a folder without `page.tsx` is a 404; `app/page.tsx` is the index route; bare files in a route folder mix routing and non-routing concerns; `app/` and `pages/` can coexist but the course doesn't teach the mix; only `app/` is scanned; the default export from `page.tsx` is what renders.

What this lesson does not cover:

- Layouts, nested layouts, and the layout/page render boundary (lesson 2 of chapter 033).
- Route groups and how they organize layouts (lesson 2 of chapter 033).
- Dynamic segments and catch-all routes (lesson 3 of chapter 033).
- Navigation between routes (lesson 4 of chapter 033).
- Parallel routes and slots (lesson 5 of chapter 033).
- Intercepting routes (lesson 6 of chapter 033).
- Server Components vs. Client Components in depth — Chapter 034.
- `loading.tsx`, `error.tsx`, `not-found.tsx` — Chapter 035.
- The `metadata` export and `<head>` content — lesson 2 of chapter 021 introduced, Chapter 038 owns.
- `route.ts` and route handlers — Chapter 050.
- The `middleware.ts`-replaced-by-`proxy.ts` migration — Chapter 037.
- The Pages Router — named once for recognition, never taught.

Estimated student time: 50 to 65 minutes. Load-bearing for every later lesson in the chapter, every route in Chapters 034 through 039, and the entire project structure in Units 6 through 23.

---

## Lesson 2 — Layouts and route groups

Teaches `layout.tsx` as the persistent shell that composes down the tree, the layout/page render boundary, `template.tsx` for the remount case, and route groups (`(folder)`) for organizing siblings under distinct layouts without affecting the URL.

Topics to cover:

- **The senior question.** How to share a shell across dashboard pages without re-rendering on every navigation, while letting `/sign-in` and `/marketing/about` have a completely different shell? The 2026 answer names two conventions: `layout.tsx` for the shared shell and route groups (`(folder)`) for organizing routes under different layouts without URL impact.
- **`layout.tsx` — the shell every nested route renders inside.** Default export required; takes `children`; Server Component by default. Only the root layout (`app/layout.tsx`) owns `<html>` and `<body>` — nested layouts return fragments or wrappers that go inside the root's `<body>`.
- **Layouts compose down the tree.** The framework matches root layout → nested layout → page, wrapping each level like nested function calls.
- **The layout/page render boundary — what re-renders on navigation.** Layouts stay mounted across navigations within their subtree; only the page changes. State in a Client Component inside a layout survives navigation; state in the page does not. The senior reach: persistent UI (sidebar toggle, in-corner player) lives in the layout.
- **Nested layouts.** Multiple layout levels compose like Russian dolls (e.g., dashboard layout wrapping an invoice-specific tab bar wrapping the invoice page).
- **`template.tsx` — when "this should remount" is the senior call.** Same shape as `layout.tsx` but remounts on every navigation (state reset, effects re-fire). Narrow use cases: route-level animation, per-page analytics. 99% of the time the student wants `layout.tsx`.
- **Route groups — `(folder)` for organization without URL impact.** A folder name wrapped in parentheses is invisible to the URL. Three uses: sharing a layout among siblings without a URL prefix; multiple distinct layouts in one app (e.g., `(marketing)` and `(app)` with no `/marketing/` or `/app/` prefix); organizing routes by domain or team.
- **Multiple root layouts — when each group has its own root.** Rare; when two groups need truly independent `<html>`/`<body>` shells, `app/layout.tsx` is dropped and a `layout.tsx` is placed inside each group. The senior reach for a SaaS app: one root, multiple group-level layouts.
- **Route group conflict.** Two pages in different groups resolving to the same URL crash the build at compile time.
- **Co-locate layout-specific code with the layout** — Principle #1 applied: `(app)/_components/Sidebar.tsx`, not a top-level `components/`.
- **Watch-outs:** layouts don't re-render in their subtree (this is the feature, not a bug); `children` is filled by the framework, not the developer; only the root has `<html>`/`<body>`; don't put deep-child data fetching in a high layout; route groups are invisible to URLs; URL collisions across groups crash the build; `template.tsx` and `layout.tsx` can coexist; Client-Component state inside a layout survives subtree navigations.

What this lesson does not cover:

- The root layout's `<html>` and `<body>` and the metadata API (lesson 2 of chapter 021).
- Dynamic segments and catch-all (lesson 3 of chapter 033).
- Parallel routes and slots — a different model from nested layouts (lesson 5 of chapter 033).
- `loading.tsx`, `error.tsx`, `not-found.tsx` at the layout level — Chapter 035.
- Server Components vs. Client Components — Chapter 034.
- Multiple root layouts at depth (rare; named only).
- Routing in middleware / `proxy.ts` — Chapter 037.

Estimated student time: 50 to 65 minutes. Load-bearing for every multi-page surface in the course, the `<auth>` and `<app>` split in Unit 9, and the project in Chapter 039.

---

## Lesson 3 — Dynamic and catch-all segments

Teaches `[param]` for single dynamic segments, `[...slug]` and `[[...slug]]` for variable-depth URLs, why `params` is a Promise in Next.js 16, and validating captured strings with Zod before they hit a query.

Topics to cover:

- **The senior question.** How to ship a detail page per invoice without hand-writing a `page.tsx` per ID? The answer names the dynamic-segment convention: `[id]` captures the URL part as a parameter the page reads from `params`, which in Next.js 16 is a Promise.
- **`[param]` — the dynamic segment.** Folder `[id]` produces `/invoices/:id`; `params.id` is a string; the parameter name in the folder determines the property name; the page is `async` and awaits `params`.
- **Why `params` is a Promise — the 2026 change.** Next.js 16 made `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` Promises to enable Partial Prerendering. In Server Components, `await`; in Client Components, `React.use(params)`. Chapter 036 owns the rendering model.
- **Multiple dynamic segments.** Nested brackets (e.g., `app/orgs/[orgSlug]/invoices/[id]/page.tsx`) produce `/orgs/:orgSlug/invoices/:id` with `params` resolving to `{ orgSlug: string; id: string }`. Each segment name must be unique within the route.
- **Catch-all segments — `[...slug]`.** Matches any number of path segments and produces a string array. Senior reach is narrow: docs sites, CMS-driven content, editorial slugs. Does *not* match the parent URL alone.
- **Optional catch-all segments — `[[...slug]]`.** Same as catch-all but also matches the parent URL; `params.slug` is `string[] | undefined`. Use when one page should serve both the parent and depth-N children.
- **The decision tree.** Single segment for known-depth single variable (canonical: detail pages); multiple single segments for multi-axis scoping (tenant-scoped resources); catch-all for genuinely variable depth with separate parent; optional catch-all for one-page-serves-all; literal segments when enumerable.
- **`generateStaticParams` — pre-rendering dynamic routes at build time.** Named as a forward-reference; the route exports an array of params and the framework generates a static HTML per entry. lesson 11 of chapter 038 owns it in full.
- **Validating `params` with Zod — the senior shape.** The URL is untrusted input; the page often expects a number, UUID, or constrained value. Zod 4 (Chapter 046) at the entry; parse failure throws into the surrounding error boundary (Chapter 035).
- **`notFound()` when the resource doesn't exist.** Named in context; the framework catches the thrown signal and renders the closest `not-found.tsx`. Full treatment in lesson 4 of chapter 033.
- **Watch-outs:** `params` is always a Promise — forgetting `await` produces a runtime Promise; captured values are always strings (coerce or parse); catch-all produces an array; catch-all doesn't match the parent; duplicate segment names crash the build; catch-all and dynamic siblings at the same level conflict; always validate `params` before queries; mismatched segment names crash silently.

What this lesson does not cover:

- Navigation to dynamic routes via `<Link>` (lesson 4 of chapter 033).
- `notFound`, `redirect`, `permanentRedirect` — named in context, owned by lesson 4 of chapter 033.
- `not-found.tsx` and the error boundary — Chapter 035.
- `searchParams` and URL state — Chapter 037.
- `generateStaticParams` at depth and the rendering model — Chapters 036 and chapter 038.
- The full async-request-API surface (`cookies()`, `headers()`, `draftMode()`) — lesson 8 of chapter 036.
- Zod 4 at depth — Chapter 046.

Estimated student time: 45 to 55 minutes. Load-bearing for every dynamic-route page in the course, the `searchParams` model in Chapter 037, and the project in Chapter 039.

---

## Lesson 4 — Navigation primitives

Teaches `<Link>` for client-side soft navigation with intelligent prefetching, `useRouter().push` for programmatic moves, and the throwing trio `redirect()` (307), `permanentRedirect()` (308), and `notFound()` for server-side flow control.

Topics to cover:

- **The senior question.** How to soft-navigate between pages, render "not found" for missing resources, send unauthenticated users to `/sign-in`, and permanently redirect a moved URL? The four mechanisms: `<Link>` for client-side soft navigation, `redirect()` (307) for server-side temporary, `permanentRedirect()` (308) for permanent moves, `notFound()` for missing resources.
- **`<Link>` from `next/link` — client-side soft navigation.** Extends `<a>`; the framework intercepts the click, fetches the destination's bundle and data, swaps the page without a reload. Bare `<a>` reserved for external links.
- **Prefetching — the navigation performance model.** Default (`prefetch={null}`) prefetches static parts on viewport intersection and dynamic parts on hover; `true` always prefetches everything; `false` disables. The default is the senior reach unless the route is expensive to prefetch or rate-limit constrained.
- **Programmatic navigation — `useRouter` from `next/navigation`.** Used when navigation runs from a handler (form submit, conditional). Client Component only; `push`/`replace`/`back`/`refresh`. Full surface in lesson 5 of chapter 037.
- **`redirect()` — server-side temporary redirect (307).** Works in Server/Client Components, route handlers, and Server Actions; throws (no code runs after). 307 by default, 303 in Server Actions, `<meta refresh>` in streaming contexts. Senior reach: auth gates, post-action redirects.
- **`permanentRedirect()` — HTTP 308 for permanent URL moves.** SEO and browser bfcache treat 308 as canonical. Use only when search engines should update their index.
- **`notFound()` — the "resource doesn't exist" signal.** Throws; the framework renders the closest `not-found.tsx`; HTTP 404. Every dynamic route is a candidate. Full `not-found.tsx` in Chapter 035.
- **Where each mechanism earns its weight.** `<Link>` for clicked navigation; `useRouter().push` for programmatic; `redirect()` for server-side conditional (auth, post-action); `permanentRedirect()` for URL migrations only; `notFound()` for missing resources.
- **`redirect()` vs. `permanentRedirect()`.** The 2026 reach is overwhelmingly `redirect()`; `permanentRedirect()` earns its weight for URL migrations and brand changes only.
- **Watch-outs:** `<Link>` for in-app, `<a>` for external; the throwing trio (`redirect`/`notFound`/`permanentRedirect`) doesn't execute code after them — don't `try/catch`; `redirect()` in Server Actions is 303; `useRouter` is `next/navigation`, not `next/router`; don't `prefetch={true}` blindly; `router.refresh()` is the post-mutation reach (lesson 6 of chapter 036); `<Link>` to external loses prefetching; `<Link replace>` skips history; `<Link scroll={false}>` preserves scroll.

What this lesson does not cover:

- The full `useRouter` / `usePathname` / `useSearchParams` / `useParams` surface — lesson 5 of chapter 037.
- Server Actions and the post-action `redirect()` pattern — Chapter 047.
- `not-found.tsx`, `error.tsx`, `global-error.tsx` — Chapter 035.
- Middleware-level redirects in `proxy.ts` — lesson 3 of chapter 037.
- The full mutation-revalidation tree (`revalidatePath`, `revalidateTag`, `router.refresh`) — lesson 6 of chapter 036.
- `next.config.ts` redirects for project-wide URL maps — lesson 3 of chapter 038.

Estimated student time: 50 to 60 minutes. Load-bearing for every navigation in the course, the auth guard pattern in Unit 9, and the project in Chapter 039.

---

## Lesson 5 — Parallel routes and slots

Teaches `@slot` folders as named props on a layout that render and stream independently, `default.tsx` as the unmatched-slot fallback, and the canonical list-plus-detail surface where both panes live under one URL.

Topics to cover:

- **The senior question.** How to build a list-plus-detail surface where both panes share one URL, each with its own loading, error, and not-found behavior? The answer names parallel routes: named slots in a layout that render independently.
- **`@slot` — the named-slot folder convention.** A folder prefixed `@` defines a slot the layout receives as a prop alongside `children`. Each slot is its own mini route tree (its own `page.tsx`, dynamic segments, `loading.tsx`, `error.tsx`); multiple slots can coexist in one layout.
- **`default.tsx` — the unmatched-slot fallback.** When a slot has no match on direct visit, refresh, or `Cmd+click`, the framework needs a fallback or the entire route 404s. Soft navigation keeps the previous match; hard navigation needs `default.tsx`. Every parallel slot ships a `default.tsx` — forgetting this is the single most common parallel-routes bug.
- **Slots stream independently with Suspense.** Each slot with its own `loading.tsx` streams as an independent boundary; the layout shell appears immediately. Chapter 035 owns Suspense in full.
- **The canonical list-plus-detail pattern.** A `/invoices` URL renders the list; `/invoices/42` updates only the detail slot; the list stays mounted. The student gets the UI shape the SaaS world has hand-rolled for a decade, with a real URL.
- **`searchParams` for the list filter, `params` for the detail.** Each slot receives its slice of URL state independently and awaits its async APIs. `searchParams` model is lesson 4 of chapter 037.
- **When parallel routes earn their weight.** Use when 2+ independent areas need their own URL state, loading, error, or not-found behavior; when refreshability of combined state matters; or as the foundation for the intercepting-route modal pattern (lesson 6 of chapter 033). Don't reach when a single page suffices or when two separate routes happen to share a layout (that's nested layouts).
- **Watch-outs:** every slot needs `default.tsx`; `@` is a slot convention, not a route group; slots are invisible to the URL; the layout's prop name matches the slot folder name; slots are scoped to one layout; adding a slot changes the layout's type; each slot has its own loading/error boundary; `children` is the regular `page.tsx` in the same segment; hard navigation rebuilds slot state from URL only.

What this lesson does not cover:

- Intercepting routes — the modal pattern (lesson 6 of chapter 033).
- Suspense, streaming, `loading.tsx`, `error.tsx` at depth — Chapter 035.
- `searchParams` at depth and the URL-state SaaS pattern — lesson 4 of chapter 037.
- The list-plus-detail project — Chapter 039.
- Routing in `proxy.ts` for tenant-scoped slot rendering — Chapter 037.

Estimated student time: 50 to 65 minutes. Load-bearing for lesson 6 of chapter 033 (intercepting routes build on the slot model), Chapter 035 (Suspense at the slot boundary), and Chapter 039 (the project wires the full list-plus-detail surface).

---

## Lesson 6 — Intercepting routes and URL-backed modals

Teaches the `(.)`, `(..)`, `(..)(..)`, and `(...)` prefixes for intercepting soft navigations, the always-paired non-intercepting sibling for direct visits, and the combined parallel-plus-intercepting pattern that gives modals a real, shareable, refreshable URL.

Topics to cover:

- **The senior question.** How to ship a feed where clicking a photo opens a modal at `/photo/42`, while a direct visit to the same URL renders a full photo page? The answer names intercepting routes: a folder `(.)photo/[id]` intercepts soft navigations and renders the modal in-place; the non-intercepting `app/photo/[id]/page.tsx` handles direct visits.
- **The intercepting prefixes.** `(.)folder` intercepts at the same level, `(..)folder` one level up, `(..)(..)folder` two levels up, `(...)folder` from the root `app/` directory. The prefix is URL-segment-relative, not file-system-relative.
- **The always-paired non-intercepting route.** An intercepting route is the soft-navigation render path; the same URL on direct visit, refresh, or `Cmd+click` renders the non-intercepter. Every intercepting route ships its non-intercepting sibling — forgetting this is the most common bug.
- **The combined pattern — intercepting + parallel routes for a URL-driven modal.** A `@modal` slot in the feed's layout holds the `(.)photo/[id]/page.tsx` intercepter; `@modal/default.tsx` is empty (closed); a sibling `app/photo/[id]/page.tsx` handles hard navigation. Student gets URL persistence, refreshability, shareability, working back/forward, and proper `Cmd+click` behavior.
- **Closing the modal — back navigation and `@modal/default.tsx`.** Close button calls `router.back()` or navigates to the parent route; `@modal` loses its match and renders the empty default. Closing is navigation, not state toggle.
- **Implementation watch-outs.** `(.)` is URL-relative, not file-system-relative; route groups in the path don't count for interception; the intercepter must live inside a parallel slot; the non-intercepting sibling must exist; the two routes can share a component with different wrappers; interception fires only on in-app soft navigation.
- **The modal UI itself.** Wrapped in a `<Modal>`/`<Dialog>` (Client Component, Radix or shadcn — lesson 1 of chapter 031) for open/close, focus, and `Esc`-to-close. The data and content come from a shared `<PhotoDetail />` used in both renders.
- **When intercepting routes earn their weight.** "Show details without leaving context" UI that needs a real URL (photo viewers, message threads, in-context edits). Not for ephemeral dialogs or app-internal flows without URL persistence.
- **Watch-outs:** always pair with the non-intercepter; soft navigation only; must be inside a parallel slot; share a component across intercepter and full page; `(.)` is URL-relative; closing is navigation; mobile back works automatically; don't use interception for non-modal UI.

What this lesson does not cover:

- Parallel routes — installed in lesson 5 of chapter 033.
- Modal implementation details, focus management, `Esc`-to-close — Chapters lesson 1 of chapter 031 and lesson 3 of chapter 031.
- `loading.tsx`, `error.tsx`, `not-found.tsx` at the slot level — Chapter 035.
- The list-plus-detail project — Chapter 039.
- Animations and transitions for the modal opening — lesson 5 of chapter 025.

Estimated student time: 50 to 65 minutes. Load-bearing for Chapter 039 (the project's intercepting modal), Chapter 064 (URL-state list views), and the senior reflex of reaching for URL-backed UI in every later SaaS pattern.

---

## Lesson 7 — Quizz

Top 10 topics to quiz:

- File-system routing — what makes a folder a route, what makes a file a routable leaf (`page.tsx`, `route.ts`), what makes a folder non-routable (`_underscore` private folders, missing `page.tsx`).
- Architectural Principle #1 — co-locate by feature, not by layer.
- Layouts and the layout/page render boundary — layouts stay mounted across navigations within their subtree; state in a Client Component inside a layout survives navigation; pages re-mount.
- Route groups — `(folder)` is invisible to the URL; used for organizing routes under different layouts.
- Dynamic segments — `[param]` captures a URL part; `params` is a Promise in Next.js 16; captured values are always strings; validate before use (Zod).
- Catch-all vs. optional catch-all — `[...slug]` matches one-or-more and does not match the parent; `[[...slug]]` matches zero-or-more and matches the parent.
- Navigation primitives — `<Link>` for in-app soft navigation, `useRouter().push` for programmatic, `<a>` for external; `redirect()` (307), `permanentRedirect()` (308), `notFound()`.
- `<Link>` prefetching — the `null`/`auto` default prefetches static parts on viewport, dynamic on hover; `true` always; `false` disables.
- Parallel routes — `@slot` folders become named props in the layout; every slot needs `default.tsx`; slots stream independently; canonical use case is list-plus-detail.
- Intercepting routes — `(.)`, `(..)`, `(..)(..)`, `(...)` intercept soft navigations to render in-context; always paired with the non-intercepting sibling; canonical use case is modals with real URLs.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
