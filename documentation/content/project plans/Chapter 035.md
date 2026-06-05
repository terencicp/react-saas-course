# Chapter 035 — Project plan: list-plus-detail with parallel routes

Second project in the course; **forks the Chapter 028 `solution/`** (the themed-surface toolchain + shadcn primitives) and adds the App Router list-plus-detail surface. First project that ships from a `degit` starter rather than from scratch, so the toolchain is inherited verbatim and the slices add only routing + data + render. The standards bar is: the whole view derives from the URL (no client view-state), every parallel slot has a `default.tsx`, the intercepting modal degrades to a full page, and both slots stream independently — all verified against a real render, not just a green build.

## Project goals

The project cashes in Unit 4's App Router primitives by shipping the canonical SaaS workspace surface: a filtered invoices list on the left, the selected invoice's detail on the right, and a "new invoice" form that opens as a URL-backed modal. The student practices five things at once: wiring **parallel slots** (`@list` / `@detail`) alongside `children` in a layout, each with its own `default.tsx` fallback so a direct visit never 404s; reading **view state from the URL server-side** (`await searchParams`, Zod `safeParse` at the boundary) instead of holding it in `useState`; pairing an **intercepting route** (`(.)new`) with its non-intercepting twin (`new/`) so soft-nav opens a dialog while direct visit / refresh / `Cmd+click` render the full page; placing **data fetching in async Server Components** and keeping render components pure; and giving each slot a **`loading.tsx`** so the list and detail stream independently under a throttled network. The coding is sliced so each step adds one browser-confirmable capability the student can `pnpm dev` and use — list → detail → modal → streaming — mirroring the lesson cadence. The data layer is an in-memory fixture (Drizzle/Postgres land in Unit 5), so the project stays small and fast while the routing shape is the lesson.

## Student position

The student has finished Unit 3 (themed surface project, Ch 028) and Unit 4 teaching chapters **029–034**, and **nothing past it**. Coders must not use any concept from Unit 5 onward.

**Knows (use freely):**
- **Routing (Ch 029):** `app/` folders = URL segments; `layout.tsx` (persistent shell, `children: ReactNode`) vs `page.tsx`; dynamic `[id]` segments where `params` is a **Promise** (`await params` on server); `<Link>` for soft navigation, `useRouter()` (`push`/`replace`/`back`/`refresh`) in client components, the throwing trio `redirect()`/`notFound()` (run during render, return `never`, never `try/catch` them); **parallel routes** — a `@slot` folder = a named layout prop beside `children`, each slot its own route tree, **every slot ships a `default.tsx`** (the hard-nav fallback that prevents a whole-route 404); **intercepting routes** — `(.)`/`(..)` prefixes count URL segments not folders, always paired with a non-intercepting twin, **closing a modal is `router.back()` not a state toggle**, the shadcn `<Dialog>` owns focus-trap/Esc/return-focus.
- **Server/Client boundary (Ch 030):** Server Components are the default (async bodies, direct data reads, zero client JS); `'use client'` only for state/effects/handlers/browser APIs, pushed to the smallest leaf; Client cannot be `async` (takes Promises, reads with `use()`); Client composes Server via `children` only; only structured-cloneable values + React extensions cross the RSC wire (no functions/class instances); pass the slice (`{ id }`), never the whole row, to a client leaf; hydration mismatches come from non-determinism (`Date.now`, `Math.random`, locale) — defer to `useEffect`, use `useId`, narrow `suppressHydrationWarning`.
- **Async UI (Ch 031):** `<Suspense fallback>` is the streaming seam; **`loading.tsx` is the framework writing `<Suspense>` at the segment** (Server Component, default export, no props); one boundary per coherent visual surface; skeleton mirrors resolved footprint (no layout shift); `not-found.tsx` paired with `notFound()` (fetch-then-guard, throws a `never` that narrows `T | null` → `T`); `error.tsx` is the `'use client'` boundary; streaming is the App Router default (no flag).
- **Cache Components (Ch 032):** dynamic-by-default under `cacheComponents: true`; **`await searchParams` / `await params` is the dynamic signal**, not a flag; reading a request API inside a `'use cache'` scope is a build error; legacy `export const dynamic/revalidate` are gone; type page/layout props with the generated **`PageProps<'/route'>` / `LayoutProps<'/route'>`** helpers (globally available, no import).
- **Request surface (Ch 033):** `await searchParams` server-side, validate with a hand-written Zod schema + **`safeParse`**, fall back to defaults so a bad URL renders the default view (never a 500); `params` = identity, `searchParams` = view state; the client's only job is to change the URL; active state comes from a **server-passed prop** (`aria-pressed={status === current}`), not re-read on the client; `router.replace(url, { scroll: false })` for filter changes; merge-don't-clobber when building the next query string.
- **Config + platform (Ch 034):** `next.config.ts` typed `NextConfig`, `cacheComponents: true` + `typedRoutes: true` always-on; `next/image` (not in scope here — fixture has no images); static `metadata` export.
- **Carried from Unit 3:** typed props (`ComponentProps<'tag'>`, `type` aliases, discriminated unions), arrow-`const` components, `cn()` from `@/lib/utils`, Tailwind v4 with semantic tokens + `dark:`, `cva` + `VariantProps`, shadcn copy-into-repo + `asChild`, the a11y baseline (semantic HTML, `aria-label` on icon buttons, `focus-visible:` rings, one `<h1>`), the four-state contract (`<Skeleton>` over spinners, empty state with a CTA), Zod 4 (`z.enum`, `.optional()`, `safeParse`, `z.infer`).

**Does NOT know (do not use):**
- **Any DB / ORM** — Drizzle, Postgres, `$inferSelect`, migrations, `db.query` (Unit 5). The data layer here is a **plain in-memory fixture array** in `src/lib/invoices/`; queries are plain async functions over it. Do not import `db`, do not write SQL, do not add `env.ts` or `DATABASE_URL`.
- **Server Actions / forms-as-contract** — `'use server'`, `useActionState`, `<form action={fn}>`, `FormData` parsing, `useFormStatus`, `useOptimistic` (Unit 6). The new-invoice form is **render-only** (`<InvoiceForm>` shows the fields; it does **not** submit — no action wired, the submit button can be inert or a no-op). Do not implement `createInvoice`.
- **`'use cache'` / `cacheLife` / `cacheTag` / `tags.ts` / invalidation** — the surface is fully dynamic (authenticated-style data read per request). Do not add caching directives; every route is dynamic by default, which is correct here. (The student has *seen* these named in Ch 032 but the project does not use them.)
- **`nuqs`, TanStack Query, Zustand** (later units) — URL state is read server-side with `await searchParams` + Zod and written client-side with `useRouter().replace`, the raw shape taught in Ch 033. Do not install `nuqs`.
- **`proxy.ts`, auth, `getCurrentUser`, `requireUser`, multi-tenancy, org scoping** (Units 8–10) — no request gate, no session, no `orgId`. Invoices are a flat global list.
- **`next-intl` / i18n** (Unit 17) — **hardcode visible English strings**. No translation keys.
- **Testing as a student skill** (Unit 18) — the lesson test runner is provided; the student does not author tests. The `project-lesson-test-coder` writes the `Lesson <n>.test.ts` bodies later.
- **`branded.ts` / `result.ts`** — IDs are plain `string`; no `Result<T>` type (no Server Actions to return one). Keep `getInvoice` returning `Invoice | null`.

## Scaffolding recipe

**Fork the Chapter 028 `solution/`** at `projects/Chapter 028/solution/` as the base for **both** `solution/` and `start/`. Everything below applies to both dirs unless noted. Build `solution/` complete enough to compile, render the `/invoices` shell with empty slots, and serve every slice's surface as a `TODO` stub; the slice-coders fill the stubs.

### Carry over verbatim from Chapter 028 (do not rewrite)

- All config: `package.json` (update `name` to `chapter-035-list-plus-detail`), `next.config.ts`, `tsconfig.json`, `biome.json`, `components.json`, `postcss.config.mjs` (Tailwind v4 PostCSS plugin — load-bearing, carry it), `.mise.toml`, `.npmrc`, `pnpm-workspace.yaml`, `.editorconfig`, `.gitignore`, `.vscode/`, `next-env.d.ts`.
- `src/app/globals.css` (tokens, light + `.dark`), `src/app/_components/providers.tsx` (`'use client'` ThemeProvider), `src/lib/utils.ts` (`cn()`).
- All shadcn primitives already present: `src/components/ui/{button,badge,card,separator,sheet,skeleton}.tsx`.
- The lesson test runner: `scripts/test-lesson.mjs` (reads `process.argv[2]`, resolves the exact path `tests/lessons/Lesson ${n}.test.ts`, spawns `pnpm exec vitest run <path>` — an exact path, never a bare positional) and `vitest.config.ts` (`environment: 'node'`, `globals: false`, `include: ['tests/lessons/**/*.test.ts']`, `resolve: { tsconfigPaths: true }`). This is the proven Ch 028 shape; keep it byte-for-byte. The runner already works in `start/` with no extra config. Confirm `pnpm test:lesson 2` runs only `Lesson 2.test.ts` before locking.

### Changes to make to the fork

- **`next.config.ts`:** add **`cacheComponents: true`** AND `typedRoutes: true` (Ch 034 made both always-on; Ch 028 predates that — its fork carries neither, and the whole surface below assumes `cacheComponents: true`). Keep `reactCompiler: true` and `turbopack: { root: __dirname }`. No `images` config (fixture has no images). Verified: `next build` is green with both flags on, parallel routes, the intercepting modal, and `useSearchParams` in `<StatusFilter>`.
- **`package.json`:** add **`zod` (`^4.4.3`)** to `dependencies` (the Ch 028 fork ships no `zod`; `schema.ts` and the `searchParams` `safeParse` boundary need it — Zod 4 is the course default, taught Ch 005, used Ch 033). No other dependency changes are needed; the `dialog` add (below) pulls nothing new because `radix-ui@^1.4.3` is already present.
- **`verify` script:** change the inherited Ch 028 `"verify"` to `"biome ci . && next typegen && tsc --noEmit && next build"`. The **`next typegen` step is mandatory** and must run before `tsc`: `PageProps`/`LayoutProps` and the `typedRoutes` `Route` union are generated into `.next/types` by Next, so on a cold checkout (no `.next/`) a bare `tsc --noEmit` fails with `Cannot find name 'PageProps'`. Ch 028 had no generated-type-typed pages so its build-then-nothing order worked; Ch 035 introduces them, so typegen must seed the types first. (Verified: cold `pnpm verify` exits 0 with this order; the old order exits 2.)
- **`next-env.d.ts`:** leave it as Next emits it — do **not** hand-edit it. `next build`/`next typegen` rewrite this file every run and strip any added `/// <reference>` line, so an edit does not survive. The `typedRoutes` href gate is already enforced by `tsc` because the locked `tsconfig.json` `include` carries `.next/types/**/*.ts` (which contains the generated `link.d.ts`); a single-package app does not need the manual reference (the monorepo-only gap is vercel/next.js#93007, which does not apply here — each chapter dir is its own package with its own `tsconfig.json`). Verified: with the `include` glob and `next typegen`, `tsc` rejects an invalid `<Link href>` and passes a valid one.
- **Add the `dialog` shadcn primitive:** run `pnpm dlx shadcn@latest add dialog`, writing `src/components/ui/dialog.tsx`. (Ch 028 shipped `sheet` but not `dialog`; the modal needs `<Dialog>`.) Accept the double-quote/`import * as React` shape on first add; run **`pnpm check`** to normalize (the `check` script already carries `--write`; appending the flag — `pnpm check --write` — doubles it and errors, per Toolchain constraints).
- **Root layout (`src/app/layout.tsx`):** keep the shape; update `metadata` title/description to the invoicing surface. No redirect from `/` is required — but ship a tiny `src/app/page.tsx` that `redirect('/invoices')` so the app root lands on the surface (this is the only top-level page; uses `redirect` from `next/navigation`, taught in Ch 029). **Remove** any Ch-028 marketing components from the fork: delete `site-header.tsx`, `hero.tsx`, `theme-aware-image.tsx`, `feature-card.tsx`, `feature-grid.tsx`, `pricing-card.tsx`, `pricing-table.tsx`, `site-footer.tsx`, `theme-toggle.tsx`, `mobile-nav.tsx`, `src/hooks/use-lock-body-scroll.ts`, and the old `src/lib/data.ts`. Replace the old `src/app/page.tsx` (which composed those) with the `redirect` page.

### Author fully (provided code / fixtures — not student work)

- **`src/lib/invoices/schema.ts`:** the canonical types + Zod schema (`import { z } from 'zod'` — the `zod@^4.4.3` dependency added to the fork).
  - `export const statusSchema = z.enum(['draft', 'sent', 'paid', 'overdue']);`
  - `export type InvoiceStatus = z.infer<typeof statusSchema>;`
  - `export const searchParamsSchema = z.object({ status: statusSchema.optional() });`
  - `export type Invoice = { id: string; number: string; customer: string; status: InvoiceStatus; amount: number; dueDate: string };` (amount in integer cents; `dueDate` as an ISO `YYYY-MM-DD` string — no Temporal, that's Unit 1/17 elsewhere but the fixture stays plain).
- **`src/lib/invoices/data.ts`:** the in-memory fixture — `export const invoices: Invoice[]` with **30 records**, ids `inv_001`…`inv_030` (zero-padded, matches lesson copy), varied across all four statuses, realistic `number`/`customer`/`amount`/`dueDate`. Plain module, no `'use client'`, no DB.
- **`src/lib/invoices/queries.ts`:** plain async functions over the fixture (no DB, no cache directives).
  - `export const listInvoices = async (filters: { status?: InvoiceStatus }): Promise<Invoice[]>` — returns the fixture filtered by `status` when present, else all, sorted by `dueDate` ascending (stable, deterministic order).
  - `export const getInvoice = async (id: string): Promise<Invoice | null>` — finds by id; returns `null` on miss. **Includes an artificial 600 ms delay** (`await new Promise(r => setTimeout(r, 600))`) so the detail slot's streaming is observable in slice S4. `listInvoices` resolves immediately (so the list stays put while the detail streams). One short comment marks the delay as the intentional streaming seam.
- **`src/components/invoice-list.tsx`:** pure render component (Server Component, no `'use client'`). `({ invoices }: { invoices: Invoice[] })` → a `<ul data-testid="invoices-list">` of `<li>` rows, each row a `<Link href={`/invoices/${inv.id}`}>` showing number/customer/status badge/amount. Empty array → a small "No invoices" line. Stable `key={inv.id}`. (A bare template-literal href that matches a **known** dynamic route — `/invoices/[id]` exists — typechecks under `typedRoutes` with no cast; `as Route` is optional here. See Locked decisions for when the cast is actually needed.)
- **`src/components/invoice-detail.tsx`:** pure render component. `({ invoice }: { invoice: Invoice })` → a `<article data-testid="invoice-detail">` with the invoice's fields laid out (number as a heading, customer, status, amount, due date).
- **`src/components/invoice-form.tsx`:** pure render component, **render-only (no submit wired)**. A `<form data-testid="invoice-form">` with labelled inputs (number, customer, amount, status `<select>` from the four statuses, due date) and a submit `<Button>`. The form does **not** post anywhere — no `action`, no `onSubmit` that mutates; the button may be `type="submit"` with no handler (a forward-ref to Unit 6 in a one-line comment). Server Component (no state).
- **`src/components/status-filter.tsx`:** the `'use client'` filter control. `({ current }: { current?: InvoiceStatus })` → a row of filter controls (an "All" option + one per status) rendered as buttons. On click it builds the next URL by merging `searchParams` (read via `useSearchParams`) and calls `router.replace(href, { scroll: false })` (`useRouter` from `next/navigation`). **Active state comes from the `current` prop** (`aria-pressed={status === current}`), never re-read from the hook. `data-testid="status-filter"`. **Authored fully by the scaffold** (provided wiring the student consumes, mirroring the chapter-outline "provided: client component, useRouter-driven"). It reaches `useSearchParams`, which requires a Suspense boundary above it at prerender; the scaffold-authored segment-level `app/invoices/loading.tsx` (below) is that boundary for the whole slot subtree from the first scaffold, so S1 is build-green even though `@list/page.tsx` renders `<StatusFilter>`. (The per-slot `loading.tsx` files added in S4 refine the UX; they are not what unblocks S1.)

### Layout shell — author the layout, stub the slot pages

- **`src/app/invoices/layout.tsx`** (author fully, default export, framework-named): the two-slot shell. Typed with the generated `LayoutProps<'/invoices'>` (`children` + `list` + `detail` arrive as props). Shape: an outer wrapper that renders, in order, `{children}` first, then the grid `<div data-testid="invoices-grid" className="grid md:grid-cols-[20rem_1fr]">` whose **two direct children** are `{list}` (left) and `{detail}` (right). Putting `{children}` **outside** `invoices-grid` keeps the grid at exactly two children: the implicit-`children` slot resolves to `default.tsx` (`null`) on `/invoices` and `/invoices/[id]`, and to the intercepting modal on `/invoices/new` (which portals to `<body>` via `<Dialog>`) — so `{children}` never adds a grid cell. **See the structural invariant in Locked decisions: `invoices-grid` resolves to exactly two direct children.** The "New invoice" `<Link>` lives in the list column header (added by S3 inside `@list`, not the layout — the layout owns geometry only).
- Stub the slot pages as `TODO(L<n>)` files (compile-clean, render a labeled placeholder, body's first line is the TODO marker). In `solution/` the slice-coders fill them; the `start/` shape is derived later. Stubs:
  - `src/app/invoices/@list/page.tsx` (L2) — `default export`, async; stub returns a placeholder.
  - `src/app/invoices/@list/default.tsx` (L2).
  - `src/app/invoices/@detail/default.tsx` (L2).
  - `src/app/invoices/@detail/[id]/page.tsx` (L2) — `default export`, async.
  - `src/app/invoices/(.)new/page.tsx` (L3).
  - `src/app/invoices/new/page.tsx` (L3).
  - `src/app/invoices/@list/loading.tsx` (L4).
  - `src/app/invoices/@detail/[id]/loading.tsx` (L4).
  - `src/components/skeletons.tsx` (L4) — exports `ListSkeleton`, `DetailSkeleton` (stub returns empty/placeholder).
- **`src/app/invoices/default.tsx`** (author fully, default export): the **implicit `children` slot's** `default.tsx`, returning `null`. **Mandatory** — when a layout declares named slots, the implicit `children` slot also needs its own `default.tsx` at the same level or URLs matching only the named slots render Next's 404 fallback inside the children area (HTTP 200, broken). (Toolchain constraint.)
- **`src/app/invoices/loading.tsx`** (author fully, default export): a segment-level `loading.tsx` at the parallel-routes parent rendering a neutral full-surface skeleton. **Mandatory under `cacheComponents: true`** — without a segment-level boundary here, a slot's dynamic `await searchParams`/`getInvoice` read can propagate into sibling routes' prerender and fail the build with "Uncached data was accessed outside of `<Suspense>`". This is the cleanest seam; the per-slot `loading.tsx` files (S4) refine the experience but this parent boundary is what keeps the build green from the first slice. (Toolchain constraint.)

The scaffolder builds: the forked toolchain/config, `globals.css`, providers, root layout, the `redirect('/invoices')` root page, the invoices `layout.tsx` + `default.tsx` + `loading.tsx`, the full `lib/invoices/{schema,data,queries}.ts`, the four pure render components, `status-filter.tsx`, and all slot/skeleton stubs. It implements no slot-page body in `start/` beyond the TODO stub; in `solution/` the slice-coders own the bodies. Leave the per-slice render work as `TODO` stubs.

### Lesson test runner (carry over, both dirs)

Ship `scripts/test-lesson.mjs` + `vitest.config.ts` (Ch 028 shape, above) and `tests/lessons/` with **placeholder** files `Lesson 2.test.ts` … `Lesson 4.test.ts` (each `import { describe } from 'vitest'; describe.todo('Lesson N')`) so the runner is green on a fresh scaffold. Tests are node-env, no DOM: they observe SSR/first-paint render output and source shape (e.g. render a Server Component's output, or assert the data layer / schema shape), never interaction. Do not ship a shared helpers module — each lesson test inlines its own helpers. The `project-lesson-test-coder` fills the bodies later (one per implementation lesson L2–L4).

## Slices

Each slice fills one or more stub files in `solution/` against the contracts below. All components: typed props, arrow-`const` bound (slot `page.tsx`/`default.tsx`/`loading.tsx` are framework default-exported), `cn()` with `className` last, semantic tokens only, Server Components by default — `'use client'` only where named. Keep each slice minimal: no abstraction the brief doesn't ask for, no caching directives, no Server Actions, no data layer beyond the provided fixture.

### Slice S1

**Lesson 2 (part 1 of 2) — The `@list` slot: server-rendered, URL-filtered.** Fill `src/app/invoices/@list/page.tsx` and `src/app/invoices/@list/default.tsx`.

`@list/page.tsx` is an **async Server Component** typed with `PageProps<'/invoices'>`. It `await`s `searchParams`, validates with `searchParamsSchema.safeParse(...)`, derives `status` (the parsed value on success, `undefined` on failure — so `?status=banana` falls back to the full list, never crashes), calls `listInvoices({ status })`, and renders the provided `<InvoiceList invoices={...} />` plus `<StatusFilter current={status} />`. The "New invoice" `<Link href="/invoices/new">` is NOT added here (S3 owns it). `@list/default.tsx` renders the **same content** as `page.tsx` (extract a shared `ListView`-style body or have `default.tsx` re-implement the same read) — this is the contract that prevents a direct visit to `/invoices/inv_001` from 404ing the whole route because `@list` has no matched segment on hard nav. Both must resolve to a **single root element** (never a bare fragment — a fragment flattens into `invoices-grid` and splits the slot into multiple grid cells; see Locked decisions).

Excludes: the detail slot, the modal, skeletons, any mutation. Do not add a `loading.tsx` here (S4).

Contracts: `@list/page.tsx` (default export, async, `PageProps<'/invoices'>`), `@list/default.tsx` (default export). Reads `listInvoices`, `searchParamsSchema`, `<InvoiceList>`, `<StatusFilter>`. `data-testid` exposed by the rendered tree: `invoices-list` (from `<InvoiceList>`), `status-filter` (from `<StatusFilter>`).

**Screenshot** — `lesson:2 route:/invoices?status=paid viewport:desktop(1280x800) state:settled` (the list filtered to paid, beside the empty detail placeholder — captures L2's "filter applied" figure; the detail slot still shows its stub placeholder here, which is acceptable for this figure, OR capture at S2 if the detail empty-state must be present — pick S2; see S2 screenshot).

### Slice S2

**Lesson 2 (part 2 of 2) — The `@detail` slot: empty state + selected invoice.** Fill `src/app/invoices/@detail/default.tsx` and `src/app/invoices/@detail/[id]/page.tsx`.

`@detail/default.tsx` is the **"no detail selected" empty state** (a centered "Pick an invoice to see its details" prompt with `data-testid="detail-empty"`) — NOT a 404. It renders when the URL is `/invoices` (no `[id]` matched). `@detail/[id]/page.tsx` is an **async Server Component** typed with `PageProps<'/invoices/[id]'>`: it `await`s `params`, calls `getInvoice(id)`, calls **`notFound()`** when the result is `null` (the throw narrows `Invoice | null` → `Invoice` and is caught by the route's 404 surface — do **not** `try/catch` it), and renders the provided `<InvoiceDetail invoice={...} />`. Both files resolve to a single root element.

Visiting `/invoices/inv_001` now renders the list (from S1's `@list`, via its `default.tsx` on hard nav) alongside this detail; `/invoices` renders the list alongside the empty state. A garbage id (`/invoices/inv_999`) renders the 404 surface, not a 500.

Excludes: the modal, skeletons, a custom `not-found.tsx` (accept the default 404; wiring a tailored one is out of scope). No mutation.

Contracts: `@detail/default.tsx` (default export), `@detail/[id]/page.tsx` (default export, async, `PageProps<'/invoices/[id]'>`). Reads `getInvoice`, `<InvoiceDetail>`, `notFound`. `data-testid`: `detail-empty`, `invoice-detail`.

**Screenshot** —
- `lesson:2 route:/invoices viewport:desktop(1280x800) state:settled` (list beside the "pick an invoice" empty state — L2's "list + empty detail" figure).
- `lesson:2 route:/invoices/inv_017 viewport:desktop(1280x800) state:settled` (list beside a selected invoice's detail — L2's "list + detail" figure).
- `lesson:2 route:/invoices?status=paid viewport:desktop(1280x800) state:settled` (filtered list beside empty detail — L2's "filter applied" figure; captured here so the detail empty-state is real, superseding the S1 note).

### Slice S3

**Lesson 3 — Modal with a real URL.** Fill `src/app/invoices/new/page.tsx` and `src/app/invoices/(.)new/page.tsx`, and add the "New invoice" `<Link>` to the list column.

Build the **non-intercepting twin first**: `new/page.tsx` (default export) is a full-page surface rendering the provided `<InvoiceForm />` with a "Cancel" `<Link href="/invoices">` back to the list — this is what a direct visit, refresh, and `Cmd+click` resolve to. Then `(.)new/page.tsx` (default export) is the **intercepting** version: it wraps `<InvoiceForm />` in the shadcn `<Dialog>` (open by default) whose close action is a **navigation** (`router.back()`), not a state toggle — via a small `'use client'` wrapper component (`new-invoice-dialog.tsx`) that owns the `<Dialog open onOpenChange={(o) => { if (!o) router.back(); }}>` and renders the Server-Component `<InvoiceForm />` through `children` (Client composes Server via children, never imports it). The `(.)` prefix matches the same URL level (`@list`/`@detail`/`(group)` add zero segments — invoices is the same level). Add the "New invoice" `<Link href="/invoices/new">` into the `@list` column header (edit `@list/page.tsx` and, if `default.tsx` duplicates the body, keep both in sync — or have both render a shared list-header element).

Refreshing the modal URL renders the full page and drops the underlay — **this is by design in 2026 Next.js and the project accepts it** (a parallel `@modal` slot for refresh-preserved modals is explicitly out of scope). Closing returns to `/invoices` with clean history.

Excludes: a `@modal` parallel slot, real form submission (the form stays render-only), any mutation, skeletons.

Contracts created: `new/page.tsx` (default export), `(.)new/page.tsx` (default export), `src/components/new-invoice-dialog.tsx` (`'use client'`, named export `NewInvoiceDialog`, takes `children: ReactNode`). Modifies `@list/page.tsx` (+ `@list/default.tsx` for the header link). `data-testid`: `new-invoice-link` (on the "New invoice" Link), `new-invoice-dialog` (on the `<Dialog>` content), `invoice-form` (already on `<InvoiceForm>`).

**Screenshot** —
- `lesson:3 route:/invoices viewport:desktop(1280x800) state:modal-open` (modal open over the list — the screenshotter clicks `new-invoice-link` and settles).
- `lesson:3 route:/invoices/new viewport:desktop(1280x800) state:settled` (the same URL rendering full-page in a fresh load — the full-page twin).

### Slice S4

**Lesson 4 — Independent streaming per slot.** Fill `src/components/skeletons.tsx`, `src/app/invoices/@list/loading.tsx`, and `src/app/invoices/@detail/[id]/loading.tsx`.

`skeletons.tsx` exports `ListSkeleton` (a row-count placeholder mirroring the list's footprint — N `<Skeleton>` rows) and `DetailSkeleton` (a header-plus-body placeholder mirroring the detail's footprint), both over the shadcn `<Skeleton>` primitive. Each shape mirrors its final content (no layout shift). Because skeleton lists render a fixed number of placeholder rows, **use a stable string-key tuple** (`const ROWS = ['r1','r2',…] as const`) and map over that — NOT `Array.from({length}).map((_, i) => key={i})`, which trips Biome's `noArrayIndexKey` (toolchain constraint). `@list/loading.tsx` renders `<ListSkeleton>`; `@detail/[id]/loading.tsx` renders `<DetailSkeleton>` (default exports, no props). Because each slot now has its own `loading.tsx`, each gets its own Suspense boundary and streams independently: under a throttled network, navigating `/invoices` → `/invoices/inv_005` keeps the list mounted while the detail streams from `DetailSkeleton` to content (the `getInvoice` 600 ms delay makes this visible; `listInvoices` resolved already). Moving between two invoices re-streams only the detail.

Excludes: per-sub-section `<Suspense>` inside a page (name the explicit-`<Suspense>` reach for a slow related-panel in a one-line comment, point to Ch 031 — do not build it). No changes to the data layer.

Contracts created: `skeletons.tsx` (named exports `ListSkeleton`, `DetailSkeleton`), `@list/loading.tsx` (default export), `@detail/[id]/loading.tsx` (default export). `data-testid`: `list-skeleton` (on `ListSkeleton` root), `detail-skeleton` (on `DetailSkeleton` root).

**Screenshot** — `lesson:4 route:/invoices/inv_005 viewport:desktop(1280x800) state:detail-streaming` (the detail slot showing `DetailSkeleton` while the list stays mounted — the screenshotter throttles the network / navigates and captures during the streaming window, before the 600 ms detail resolves). This is the only transient-state shot; if the screenshotter cannot reliably catch the window, fall back to capturing `route:/invoices/inv_005 state:settled` and note the skeleton is verified by Rendered check R-detail-stream instead.

## Start derivation

Derive `start/` from the completed `solution/` after all slices land. The toolchain, config, `globals.css`, providers, root layout, root `redirect` page, the invoices `layout.tsx` / `default.tsx` / `loading.tsx`, the full `lib/invoices/{schema,data,queries}.ts`, the four pure render components (`invoice-list`, `invoice-detail`, `invoice-form`, `status-filter`), the `components/ui/*` primitives (incl. `dialog`), the test runner, and `vitest.config.ts` are **identical** — copy verbatim. Replace only the student-owned slot/skeleton/dialog bodies with `TODO` stubs that compile and render an empty/placeholder shape, each carrying a `// TODO(L<n>) — <task>` marker as the first body line so `rg "TODO" start/src` enumerates the work. Stubs:

- `@list/page.tsx` → `// TODO(L2) — async @list: await+safeParse searchParams, listInvoices({ status }), render <InvoiceList> + <StatusFilter current={status} />`. Render a single-element placeholder so the slot fills one grid cell.
- `@list/default.tsx` → `// TODO(L2) — same content as @list/page.tsx (the default.tsx that stops a direct /invoices/[id] visit 404ing)`.
- `@detail/default.tsx` → `// TODO(L2) — "pick an invoice" empty state (data-testid="detail-empty"), NOT a 404`.
- `@detail/[id]/page.tsx` → `// TODO(L2) — async @detail: await params, getInvoice(id), notFound() on null, render <InvoiceDetail>`.
- `new/page.tsx` → `// TODO(L3) — full-page twin: <InvoiceForm /> + Cancel <Link href="/invoices">`.
- `(.)new/page.tsx` → `// TODO(L3) — intercepting modal: <InvoiceForm /> inside <Dialog> closing via router.back()`.
- `new-invoice-dialog.tsx` → `// TODO(L3) — 'use client' Dialog wrapper: open, onOpenChange→router.back(), renders children`.
- `@list/loading.tsx` → `// TODO(L4) — render <ListSkeleton>`.
- `@detail/[id]/loading.tsx` → `// TODO(L4) — render <DetailSkeleton>`.
- `skeletons.tsx` → `// TODO(L4) — ListSkeleton + DetailSkeleton over shadcn <Skeleton>, stable string keys`.

The "New invoice" `<Link>` is part of L3 work — the `start/` `@list` stub does not render it (it's added when the student does S3). Each stub must keep the framework default export and a compatible signature so the layout and `page.tsx` shell still typecheck and the shell renders the empty grid. `start/` must pass `pnpm verify` (build-green with stubs) and `pnpm test:lesson <n>` must run against each placeholder. The `start/` `/invoices` route renders the two-column shell with placeholder slots, exactly as the L1 Overview promises (`pnpm dev` serving the unstubbed shell).

## Locked decisions

Cross-cutting calls every slice and the scaffold must honor.

**Toolchain constraints (from `Toolchain constraints.md`, mandatory):**
- `tsconfig "jsx": "react-jsx"` (not `"preserve"`), NO `baseUrl` (TS 6 errors on it — `@/*` paths resolve without it under `moduleResolution: "bundler"`), `"incremental": true`, `"skipLibCheck": true`, `"allowJs": false`, `include` carries BOTH `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`. (Inherited from the Ch 028 fork; do not regress.)
- `biome.json files.includes` excludes use NO trailing `/**`; `"css": { "parser": { "tailwindDirectives": true } }`; keep `lint/performance/noImgElement: "off"` (inherited — no raw `<img>` ships here, but the fork carries it harmlessly).
- `next.config.ts`: `turbopack: { root: __dirname }`, `reactCompiler: true` (REQUIRES `babel-plugin-react-compiler@1.0.0` devDep, inherited), and — both **added** to the fork — **`cacheComponents: true`** AND **`typedRoutes: true`** (Ch 034 made both always-on; the Ch 028 fork has neither). The entire routing/streaming surface below assumes `cacheComponents: true`.
- **`verify` script runs `next typegen` before `tsc`:** `"biome ci . && next typegen && tsc --noEmit && next build"`. `PageProps`/`LayoutProps` and the `typedRoutes` `Route` union live in `.next/types` (generated, not committed), so a cold `tsc --noEmit` with no `.next/` fails `Cannot find name 'PageProps'`. `next typegen` seeds those types without a full build; it must precede `tsc`. (The Ch 028 `verify` order — `tsc` straight after `biome` — only worked because Ch 028 typed no pages with the generated helpers.)
- **`zod@^4.4.3`** is a `dependencies` add (the Ch 028 fork ships no `zod`); `schema.ts` and the `safeParse` boundary require it.
- `pnpm-workspace.yaml` with `onlyBuiltDependencies: [sharp]` + `allowBuilds: { sharp: true }` in BOTH dirs (inherited — pnpm's sharp ledger, needed even without `next/image`).
- shadcn primitives arrive double-quoted with `import * as React` — accept on first add, then run **`pnpm check`** to normalize (the script already carries `--write`; `pnpm check --write` doubles the flag and errors). `radix-ui` umbrella `^1.4.3` (new-york-v4). The `dialog`/`sheet`/`separator` primitives carry `'use client'` — any verification counting `'use client'` files must include `components/ui/*`, not just authored islands.
- **`typedRoutes: true` + dynamic href strings:** the gate is enforced by `tsc` because the locked `tsconfig.json` `include` carries `.next/types/**/*.ts` (which holds the generated `link.d.ts`) AND `verify` runs `next typegen` first. Do **not** hand-edit `next-env.d.ts` to add a `link.d.ts` reference — `next build`/`next typegen` regenerate that file every run and strip the line, and it is unnecessary here (the monorepo-only gap that requires it is vercel/next.js#93007; each chapter dir is its own single package, so it does not apply). A template-literal `href` that **matches a known route pattern** (`/invoices/[id]` exists) typechecks with **no** `as Route` cast; the cast is only needed for a built href that matches **no** declared route. Static literal hrefs (`/invoices`, `/invoices/new`) never need a cast. (Verified: `tsc` rejects `/bogus-route` and accepts `` `/invoices/${id}` `` uncast.)
- **`new Date()` in a Server Component breaks `next build` under `cacheComponents: true`** — the fixture's `dueDate` is a hardcoded ISO string; never compute "days until due" or a "today" stamp in a Server Component. No `new Date()` / `Date.now()` anywhere in render paths.
- **Cache Components + slot interaction:** the segment-level `app/invoices/loading.tsx` (scaffold-authored) is mandatory — it is the Suspense seam that keeps a slot's dynamic `await searchParams`/`getInvoice` read from propagating into sibling routes' prerender and failing the build. Per-slot `loading.tsx` (S4) refine, but do not remove the parent boundary.
- **Implicit `children` slot needs its own `default.tsx`:** `app/invoices/default.tsx` (returns `null`) is mandatory alongside the `@list`/`@detail` `default.tsx` files, or URLs matching only the named slots render Next's broken 404-fallback in the children area (HTTP 200).
- **Biome `noArrayIndexKey` on placeholder lists:** skeleton row lists use a stable string-key tuple mapped over (`const ROWS = ['r1',…] as const`), never `Array.from({length}).map((_, i) => key={i})` (the diagnostic is not suppressible with `biome-ignore` on the nested `<li>`).

**Code conventions (taught syntax — from `Code conventions.md`):**
- Filenames kebab-case; one concept per file. Components/types PascalCase, functions/vars camelCase, booleans as predicates. `type` aliases (never `interface`); no `any`; `import type` for type-only imports (`verbatimModuleSyntax`).
- Arrow-`const` for components/hooks/callbacks. **Default exports ONLY for framework-named files** — `page.tsx`, `layout.tsx`, `default.tsx`, `loading.tsx`, `not-found.tsx`. Every authored component (`invoice-list`, `invoice-detail`, `invoice-form`, `status-filter`, `new-invoice-dialog`, `skeletons`) is a **named** export. Two positional params max, then options object.
- **Page/layout props typed with the generated `PageProps<'/route'>` / `LayoutProps<'/route'>` helpers** (globally available, no import) — never hand-written `{ searchParams: Promise<{...}> }`. (Ch 032/033 default; supersedes the chapter-outline's hand-written reference signatures.)
- **`searchParams` / `params` are Promises** — `await` them in the async page body; `safeParse` (never `parse`) untrusted `searchParams`, fall back to defaults on failure. `notFound()` on a missing record (never `try/catch` the throw). Validate before the query.
- **URL is the source of truth for view state; the active filter state comes from a server-passed prop** (`aria-pressed={status === current}`), not re-read from `useSearchParams`. The client's only job is to change the URL (`router.replace(href, { scroll: false })`, merge-don't-clobber).
- `'use client'` only on `status-filter.tsx` and `new-invoice-dialog.tsx` (state/handlers/`useRouter`); keep it off everything else. Client composes Server via `children` (the dialog wraps `<InvoiceForm>` through children, never imports it). No `async` Client Components.
- No `useMemo`/`useCallback`/`React.memo` (React Compiler on). `react-hooks/rules-of-hooks` + `exhaustive-deps` never disabled. No `useEffect` is needed in this project.
- Imports in three alphabetized groups (external incl. `next/*` → `@/` → relative), side-effecting imports first. No barrel files. No deep relative imports — use `@/`.
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`); no literal colors. `gap` for spacing. Logical properties. Semantic HTML: `<ul>`/`<li>` for the list, `<article>` for the detail, `<form>`/`<label>` for the form, one `<h1>` per rendered view, `aria-label` on icon-only controls, `focus-visible:` ring on every interactive control.
- No `Result<T>`, no branded IDs, no `'use cache'`, no Server Actions, no Drizzle, no `nuqs` (the student hasn't learned them). IDs are plain `string`; `getInvoice` returns `Invoice | null`.
- Comments rare; the only inline comments are the `TODO(L<n>)` stub markers, the one-line `getInvoice` delay note, the one-line "form submit lands in Unit 6" note, and the one-line explicit-`<Suspense>`-reach pointer in S4.

**Structural invariants (head off render breaks):**
- `invoices-grid` (the inner grid `<div>` inside `layout.tsx`) resolves to **exactly two direct children**: the `@list` slot (left) and the `@detail` slot (right), in one row at `md`+. The implicit `{children}` slot (the modal mount) must NOT add a third direct child to the grid — render `{children}` **outside** the grid `<div>` (before it in the layout wrapper), since the intercepting modal portals to `<body>` via `<Dialog>` and so occupies no grid cell. Note: the full-page `new/` twin is **nested under `invoices/layout.tsx`**, so on a hard visit to `/invoices/new` the layout still renders — the twin's form fills `{children}` (above the grid) and the grid below shows `@list/default` + `@detail/default`. The twin does **not** replace the grid; the modal-vs-fullpage distinction is the `<Dialog>` wrapper, not the grid's presence (see R-modal-fullpage). (Verified against a real render.)
- **Every parallel slot's `page.tsx` and `default.tsx` resolves to a SINGLE root element**, never a bare fragment. A fragment adds no DOM wrapper, so when the layout drops `{list}`/`{detail}` into the CSS grid each returned child becomes its own grid cell — one slot silently splits into several columns. (This is the Ch 035 toolchain-constraint render break; the explicit guard.)
- `@list/page.tsx` and `@list/default.tsx` render the **same** list content (the `default.tsx` is the hard-nav fallback that keeps `/invoices/[id]` direct visits from 404ing). Keep them in sync — ideally a shared body component both render.
- Theme is inherited from the Ch 028 fork (`.dark` class via `next-themes`); the surface uses semantic tokens so light/dark is one class string. No new theme wiring.

**Stable selectors (every rendered surface exposes `data-testid` for its checks):** `invoices-grid`, `invoices-list`, `invoice-detail`, `detail-empty`, `status-filter`, `invoice-form`, `new-invoice-link`, `new-invoice-dialog`, `list-skeleton`, `detail-skeleton`. Prefer these over positional selectors in all Rendered checks. (The list `<li>` rows need no per-row testid; count children of `invoices-list`.)

## File tree

Complete tree after S4 (`solution/`; `start/` is identical except the 10 student-owned files carry stubs). `[S1]` etc. tag the slice that creates/edits; unmarked files are scaffolder-authored (most forked verbatim from Ch 028).

```
solution/
  package.json                              # scaffold (forked; name updated, +zod, verify runs next typegen)
  pnpm-lock.yaml                            # scaffold (forked; +zod)
  pnpm-workspace.yaml                       # scaffold (forked; sharp ledger)
  .npmrc                                    # scaffold (forked)
  .mise.toml                                # scaffold (forked)
  .editorconfig                             # scaffold (forked)
  .gitignore                                # scaffold (forked)
  biome.json                                # scaffold (forked)
  tsconfig.json                             # scaffold (forked)
  next.config.ts                            # scaffold (forked + cacheComponents: true + typedRoutes: true)
  components.json                           # scaffold (forked)
  postcss.config.mjs                        # scaffold (forked; @tailwindcss/postcss)
  next-env.d.ts                             # scaffold (forked; Next-emitted, not hand-edited)
  AGENTS.md                                 # scaffold (forked; thesis updated)
  vitest.config.ts                          # scaffold (forked)
  scripts/
    test-lesson.mjs                         # scaffold (forked; single-file runner)
  tests/
    lessons/
      Lesson 2.test.ts                      # scaffold placeholder (lesson-test-coder fills)
      Lesson 3.test.ts                      # scaffold placeholder
      Lesson 4.test.ts                      # scaffold placeholder
  .vscode/
    extensions.json                         # scaffold (forked)
    settings.json                           # scaffold (forked)
  src/
    app/
      globals.css                           # scaffold (forked; tokens, light + .dark)
      layout.tsx                            # scaffold (forked; html, Providers, metadata)
      page.tsx                              # scaffold (redirect('/invoices'))
      _components/
        providers.tsx                       # scaffold (forked; 'use client' ThemeProvider)
      invoices/
        layout.tsx                          # scaffold (two-slot grid: @list + @detail)
        default.tsx                         # scaffold (implicit children slot → null)
        loading.tsx                         # scaffold (segment-level full-surface skeleton)
        @list/
          page.tsx                          # [created by: S1, edited by: S3 (New-invoice link)]
          default.tsx                       # [created by: S1, edited by: S3]
          loading.tsx                       # [created by: S4]
        @detail/
          default.tsx                       # [created by: S2]
          [id]/
            page.tsx                        # [created by: S2]
            loading.tsx                     # [created by: S4]
        (.)new/
          page.tsx                          # [created by: S3]
        new/
          page.tsx                          # [created by: S3]
    components/
      ui/
        button.tsx                          # scaffold (forked)
        badge.tsx                           # scaffold (forked)
        card.tsx                            # scaffold (forked)
        separator.tsx                       # scaffold (forked)
        sheet.tsx                           # scaffold (forked; unused, kept)
        skeleton.tsx                        # scaffold (forked)
        dialog.tsx                          # scaffold (shadcn add — new)
      invoice-list.tsx                      # scaffold (pure render component)
      invoice-detail.tsx                    # scaffold (pure render component)
      invoice-form.tsx                      # scaffold (pure render, no submit)
      status-filter.tsx                     # scaffold ('use client', useRouter-driven)
      new-invoice-dialog.tsx                # [created by: S3]
      skeletons.tsx                         # [created by: S4]
    lib/
      utils.ts                              # scaffold (forked; cn())
      invoices/
        schema.ts                           # scaffold (Invoice type, statusSchema, searchParamsSchema)
        data.ts                             # scaffold (30-record fixture)
        queries.ts                          # scaffold (listInvoices, getInvoice w/ 600ms)
```

## Verification

### Static checks (reviewer executes)

1. **both** — `pnpm verify` exits 0 in `solution/` and in `start/` (Biome CI + `next typegen` + `tsc --noEmit` + `next build` all green) **from a cold checkout** (delete `.next/` first, or the gate is not exercised). Catches drift, type errors, build failures, the sharp/babel-plugin/jsx pitfalls, AND the `typedRoutes` invalid-href gate (`next typegen` seeds `.next/types/link.d.ts`, which the `tsconfig.json` `include` glob feeds to `tsc`). The cold run is what proves the `next typegen`-before-`tsc` ordering; a warm `.next/` masks an order regression.
2. **both** — `pnpm test:lesson 2` runs exactly `tests/lessons/Lesson 2.test.ts` and no other (exact path, not a substring positional). Sanity-repeat: `pnpm test:lesson 4` runs only `Lesson 4.test.ts`.
3. **start** — `rg "TODO\(L" start/src` lists exactly the 10 student-owned files (one marker each), enumerating the work across L2–L4.
4. **solution** — `rg -l "TODO\(L" solution/src` returns nothing (no stub markers left in the completed solution).
5. **solution** (feature-not-inert greps — each fails if the load-bearing teaching feature ships inert):
   - `rg "safeParse" solution/src/app/invoices/@list/page.tsx` — the list validates `searchParams` at the boundary (fails if it reads `status` raw or skips Zod).
   - `rg "listInvoices" solution/src/app/invoices/@list/page.tsx` — the list actually queries the fixture (fails if it renders a hardcoded array).
   - `rg "listInvoices|InvoiceList" solution/src/app/invoices/@list/default.tsx` — `@list/default.tsx` actually renders the list (the hard-nav fallback that stops a direct `/invoices/[id]` visit 404ing), not an empty/`null` body. Confirm by render check R-detail-direct too.
   - `rg "notFound" solution/src/app/invoices/@detail/[id]/page.tsx` — the detail guards a missing invoice with `notFound()` (fails if a null invoice renders blank or throws a 500).
   - `rg "getInvoice" solution/src/app/invoices/@detail/[id]/page.tsx` — the detail reads one invoice by id.
   - `rg "router.back" solution/src/components/new-invoice-dialog.tsx` — the modal closes via navigation, not a state toggle (fails if `onOpenChange` flips local state only, leaving history dirty).
   - `rg "(\.)new" -F solution/src/app/invoices` (the intercepting folder exists) AND `new/page.tsx` exists — the interceptor is paired with its twin (fails if only one ships → 404-on-refresh or no modal).
   - `rg "setTimeout" solution/src/lib/invoices/queries.ts` — the `getInvoice` artificial delay is present (fails if removed → the detail never visibly streams in S4).
   - `rg "loading" solution/src/app/invoices/@detail/[id]/loading.tsx` (default export) AND `@list/loading.tsx` exists — both per-slot streaming boundaries ship.
   - both `solution/src/app/invoices/default.tsx` and `solution/src/app/invoices/loading.tsx` exist (the mandatory implicit-children `default.tsx` and the segment-level `loading.tsx` — the two Cache-Components/parallel-route build guards). A render check is not needed; their absence fails `next build` (caught by check 1).
6. **both** — `rg "createInvoice|use server|'use cache'|drizzle|from 'nuqs'" solution/src start/src` returns nothing (no Server Actions, no caching directives, no DB, no nuqs — concepts the student hasn't learned).
7. **both** — `rg "typedRoutes" solution/next.config.ts` confirms the flag is on, and the gate is proven **non-vacuously**: temporarily add a `<Link href="/bogus-route">` to any source file, run `next typegen && tsc --noEmit`, and confirm `tsc` errors with `Type '"/bogus-route"' is not assignable` (then revert). Do **not** grep for `as Route` (the cast is optional — `` href={`/invoices/${id}`} `` typechecks because `/invoices/[id]` is a declared route) and do **not** grep `next-env.d.ts` for a `link.d.ts` reference (Next regenerates that file every build and strips any added line; the `tsconfig.json` `include` glob is what enforces the gate).
8. **both** — `rg "tailwind.config" solution start --glob '!**/node_modules/**'` returns nothing (CSS-first only).

### Rendered checks (slice coders + inspector run against the running app)

Viewports given explicit. The owning slice runs its check as its render checkpoint.

| id | slice | route | viewport | state | intent | selectors | assertion |
|----|-------|-------|----------|-------|--------|-----------|-----------|
| R-grid-two-children | S1 | /invoices | 1280×800 | settled | the surface is one row of exactly two slots, never split | `invoices-grid`, `invoices-list`, `detail-empty` | `invoices-grid` has **exactly 2 direct children** — the list region (containing `invoices-list`) on the left and the detail region (containing `detail-empty`, present once S2 lands; in S1 a placeholder) on the right — sitting in the same row at 1280px (list right edge < detail left edge). No slot splits into extra cells. |
| R-list-filter | S1 | /invoices?status=paid | 1280×800 | settled | the list is server-filtered by the URL status | `invoices-list`, `status-filter` | `invoices-list` renders only `paid` invoices (every visible row's status reads "paid"); `status-filter` shows the "paid" control as active (`aria-pressed="true"`), all others not pressed. The list count is < 30 (the unfiltered total). |
| R-list-filter-reload | S1 | /invoices?status=paid | 1280×800 | hard reload | the filter survives a hard reload (server-read, not client state) | `invoices-list`, `status-filter` | After a full page reload at `/invoices?status=paid`, the list still shows only paid invoices and the "paid" control is still active — proving the filter is read from the URL server-side, not held in client state. |
| R-list-filter-invalid | S1 | /invoices?status=banana | 1280×800 | settled | an invalid status falls back to "all", never crashes | `invoices-list` | The page renders without error (no 500, no error boundary); `invoices-list` shows the full unfiltered set (30 rows) — `safeParse` failure fell back to no filter. |
| R-detail-empty | S2 | /invoices | 1280×800 | settled | no selection shows the empty state, not a 404 | `invoices-grid`, `detail-empty`, `invoice-detail` | At `/invoices` the right slot renders `detail-empty` (the "pick an invoice" prompt) and NOT `invoice-detail`; the page is HTTP 200 with the list still on the left. |
| R-detail-selected | S2 | /invoices/inv_017 | 1280×800 | settled | a selected invoice shows its detail beside the list | `invoices-grid`, `invoices-list`, `invoice-detail`, `detail-empty` | `invoice-detail` renders the invoice's fields on the right; `detail-empty` is absent; `invoices-list` is still present on the left (the list slot stayed matched). `invoices-grid` still has exactly 2 direct children. |
| R-detail-direct | S2 | /invoices/inv_003 | 1280×800 | settled (fresh load, hard nav) | a direct visit renders the list (via `@list/default.tsx`), not a whole-route 404 | `invoices-list`, `invoice-detail` | On a fresh hard load of `/invoices/inv_003`, the left slot renders `invoices-list` (proving `@list/default.tsx` provides the hard-nav fallback) and the right renders `invoice-detail` — the route is NOT a 404. |
| R-detail-notfound | S2 | /invoices/inv_999 | 1280×800 | settled | a missing invoice renders the 404 surface, not a 500 | (document) | Visiting a non-existent id renders Next's not-found surface (the 404 UI), not an error boundary / 500. The page does not crash. |
| R-modal-open | S3 | /invoices | 1280×800 | click `new-invoice-link`, settle (`modal-open`) | soft-nav opens the form as a modal over the list, URL becomes /invoices/new | `new-invoice-link`, `new-invoice-dialog`, `invoices-list`, `invoice-form` | Clicking `new-invoice-link` renders `new-invoice-dialog` (a single dialog) containing `invoice-form` over the still-visible `invoices-list`; the URL is `/invoices/new`; focus is inside the dialog. |
| R-modal-close-back | S3 | /invoices | 1280×800 | open modal, press Esc | closing is a navigation: Esc returns to /invoices, history clean | `new-invoice-dialog`, `invoices-list` | After Esc, the URL is back at `/invoices`, `invoices-list` is shown, and `new-invoice-dialog` is **not visible** — test visibility (`offsetParent === null` or computed `display: none`), NOT raw DOM presence: closing fires `router.back()`, which navigates without unmounting the cached intercepted-route subtree, so the dialog element can linger hidden in the DOM (verified — `data-state` flips and `display` becomes `none`). A single browser Back from here does NOT re-open the modal (it lands before `/invoices`), proving `router.back()` left clean history rather than a dangling forward entry. |
| R-modal-fullpage | S3 | /invoices/new | 1280×800 | settled (fresh load, hard nav) | a direct visit / refresh renders the full-page twin, not the modal | `invoice-form`, `new-invoice-dialog` | On a fresh load of `/invoices/new`, the full-page form (`invoice-form` with a Cancel link to `/invoices`) renders **outside** the grid and `new-invoice-dialog` is NOT present (no `<Dialog>` wrapper, no `role="dialog"`) — the non-intercepting twin, not the intercepted modal. Note: because `new/` is nested under `invoices/layout.tsx`, `invoices-grid` (with `@list/default` + `@detail/default`) **is still present below the form** — verified; do NOT assert its absence. The modal-vs-fullpage distinction is the presence of `new-invoice-dialog`, not the presence of the grid. |
| R-detail-stream | S4 | /invoices/inv_005 | 1280×800 | navigate from /invoices under throttling; window = `detail-streaming` | the detail streams independently while the list stays mounted | `invoices-list`, `detail-skeleton`, `invoice-detail` | Navigating from `/invoices` to `/invoices/inv_005` under a throttled network: during the streaming window `detail-skeleton` is shown in the right slot while `invoices-list` stays mounted on the left (not replaced by a skeleton); after the 600 ms delay resolves, `invoice-detail` replaces `detail-skeleton` and the list is unchanged. |
| R-detail-restream | S4 | /invoices/inv_005 → /invoices/inv_009 | 1280×800 | navigate between two invoices under throttling | only the detail slot re-streams; the list does not | `invoices-list`, `detail-skeleton`, `invoice-detail` | Navigating from one invoice detail to another shows `detail-skeleton` again in the right slot (the detail re-suspends) while `invoices-list` on the left never shows a skeleton and is not remounted — only the detail slot re-streams. |
| R-responsive-stack | S2 | /invoices/inv_017 | 390×844 | settled | the two-column surface stacks below md with no horizontal scroll | `invoices-grid`, `invoices-list`, `invoice-detail` | At 390px `invoices-grid` still has exactly 2 direct children but they are stacked (detail top offset > list bottom offset, i.e. not in the same row); document `scrollWidth` ≤ `clientWidth` (no horizontal scroll). |
