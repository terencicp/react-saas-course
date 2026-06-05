# Chapter 035 — Project: list-plus-detail with parallel routes

## Chapter framing

Chapter 035 cashes in the App Router primitives the unit installed: parallel routes (lesson 5 of chapter 029), intercepting routes (lesson 6 of chapter 029), server-side `searchParams` reads (lesson 4 of chapter 033), Suspense and `loading.tsx` at the segment boundary (lesson 1 of chapter 031, lesson 3 of chapter 031), `default.tsx` for unmatched slots, and the server/client boundary (chapter 030).
The student ships the canonical SaaS list-plus-detail surface — invoices on the left, the selected invoice's detail on the right — with the "new invoice" form opening as a soft-navigation modal that has a real URL, refreshes correctly, survives `Cmd+click`, and falls back to a full page on direct visit.
The list reads a `?status=` filter from `searchParams` server-side; both slots stream independently under their own Suspense boundaries; the surface degrades to a working no-JavaScript flow.

Threads that run through every lesson: parallel slots render alongside `children` in a layout, each with its own loading/error/not-found boundary; `default.tsx` per slot is the contract that prevents a 404 on direct visits when only one slot has a matching segment; intercepting routes are always paired with a non-intercepting twin so direct visits and refreshes degrade to the full page; URL is the source of truth for view state, transient UI state is not; data fetching happens in Server Components, not in client effects; Suspense is the seam where streaming kicks in, and the `loading.tsx` file convention is the layer-appropriate skeleton owner.
This is the first project in the course that starts from a `degit` starter rather than from scratch; each implementation lesson closes on a runnable, browser-confirmable state.

### Project goals

The finished surface, stated as the behaviors the student can confirm in the browser:

- The list at `/invoices` renders server-side, and `?status=paid` filters it server-side; the filter survives a hard reload at `/invoices?status=paid`. An invalid status such as `?status=banana` falls back to "all" without crashing.
- A direct visit to `/invoices/inv_001` renders the list alongside the selected invoice's detail; `/invoices` with no selection renders the list alongside a "pick an invoice" empty state.
- Soft navigation to `/invoices/new` from the list opens the form as a modal over the list; a direct visit, a refresh, or a `Cmd+click` to `/invoices/new` renders the full page instead. (Refresh dropping the underlay is by design in 2026 Next.js — the project accepts it.)
- Under a throttled network, the list and detail slots each show their own skeleton and stream to content independently; navigating between two invoices re-streams only the detail slot.
- With JavaScript disabled, the list and detail still render server-side and the modal link degrades to the full page.

### Dependency carry-in

- **From chapter 029 (routing):** `app/` shape, `layout.tsx` / `page.tsx` semantics, parallel-route `@slot` naming, `default.tsx` per slot, intercepting-route prefixes (`(.)`, `(..)`).
- **From chapter 030 (server/client boundary):** Server Components as the default, `"use client"` only where state or events appear.
- **From chapter 031 (async UI):** `<Suspense>` as the streaming seam, `loading.tsx` at the segment, sibling-independent streaming.
- **From chapter 032 (cache):** Under Cache Components every route is dynamic by default; `searchParams` is an explicit dynamic signal.
- **From chapter 033 (server-side reads):** `await searchParams` in Server Components, Zod validation at the boundary.
- **From chapter 027 (shadcn):** `<Dialog>` for the modal shell (shipped in the starter's `components/ui/`); `<Skeleton>` for skeleton primitives.
- **From chapter 004 / chapter 005 (TypeScript):** Zod schemas, `z.infer`, narrowed enum types.
- **From chapter 028 (themed surface):** the project's toolchain decisions — pnpm, `AGENTS.md`, `tsconfig`, Biome, `next-themes` `<Providers>` — carried forward in the starter rather than rebuilt. (No build-time env validation here; the in-memory fixture needs no env, so `@t3-oss/env-nextjs` waits for Unit 5.)

### Starter file tree (stubs carry a `TODO(L<n>)` comment)

Each stub renders a placeholder (a text node or empty `data-testid` div) so the app builds and runs from the first clone; the `TODO(L<n>)` comment names the lesson that fleshes it out. Everything else is provided and shared with the solution.

```
src/
  app/
    globals.css                  # provided: Tailwind v4 CSS-first theme, light/dark oklch vars
    layout.tsx                   # provided: root html/body shell + <Providers>, metadata export
    page.tsx                     # provided: redirect('/invoices')
    _components/
      providers.tsx              # provided: 'use client' next-themes ThemeProvider
    invoices/
      layout.tsx                 # provided: two-slot shell, receives {children, list, detail}
      default.tsx                # provided: segment default (renders null)
      loading.tsx                # provided: segment loading (two-column Skeleton grid)
      @list/
        page.tsx                 # TODO(L2) (reads searchParams.status)
        default.tsx              # TODO(L2) (same render as page, no filter)
        loading.tsx              # TODO(L4) (renders <ListSkeleton>)
      @detail/
        default.tsx              # TODO(L2) (empty-state)
        [id]/
          page.tsx               # TODO(L2) (loads one invoice, notFound() on null)
          loading.tsx            # TODO(L4) (renders <DetailSkeleton>)
      new/
        page.tsx                 # TODO(L3) (paired full page)
      (.)new/
        page.tsx                 # TODO(L3) (intercepted modal)
  components/
    invoice-list.tsx             # provided: pure render component
    invoice-detail.tsx           # provided: pure render component
    invoice-form.tsx             # provided: pure render component, no submit yet
    status-filter.tsx            # provided: client component, router.replace-driven
    new-invoice-dialog.tsx       # TODO(L3) ('use client' Dialog wrapper, router.back() on close)
    skeletons.tsx                # TODO(L4) exports ListSkeleton, DetailSkeleton
    ui/                          # provided: shadcn primitives (badge, button, card, dialog, separator, sheet, skeleton)
  lib/
    utils.ts                     # provided: cn()
    invoices/
      schema.ts                  # provided: Invoice type, statusSchema, searchParamsSchema
      data.ts                    # provided: in-memory fixture (30 records, inv_001–inv_030)
      queries.ts                 # provided: listInvoices(filters), getInvoice(id)
tests/
  lessons/
    Lesson 2.test.ts             # provided: describe.todo placeholder
    Lesson 3.test.ts             # provided: describe.todo placeholder
    Lesson 4.test.ts             # provided: describe.todo placeholder
```

### Reference solution signatures lessons display

- `listInvoices(filters: { status?: InvoiceStatus }): Promise<Invoice[]>` (sorts ascending by `dueDate`)
- `getInvoice(id: string): Promise<Invoice | null>` (with artificial 600 ms delay)
- `statusSchema = z.enum(['draft', 'sent', 'paid', 'overdue'])`
- `searchParamsSchema = z.object({ status: statusSchema.optional() })`
- `Invoice = { id: string; number: string; customer: string; status: InvoiceStatus; amount: number; dueDate: string }` (`amount` in cents, `dueDate` as `YYYY-MM-DD`)
- List slot uses the generated route type: `async function ListPage({ searchParams }: PageProps<'/invoices'>)` (`next typegen` emits `PageProps`; `searchParams` is a `Promise` to await).
- Detail slot: `async function DetailPage({ params }: PageProps<'/invoices/[id]'>)`.
- Layout: `({ children, list, detail }: LayoutProps<'/invoices'>)` — the parallel slots arrive as named props.
- Env: no entries (in-memory fixture; Drizzle/Postgres land in Unit 5).

### Concepts demonstrated → owning lesson

- Parallel routes with `default.tsx` fallbacks — lesson 5 of chapter 029; first applied in lesson 2 of chapter 035.
- Intercepting routes paired with non-intercepting `page.tsx` — lesson 6 of chapter 029; first applied in lesson 3 of chapter 035.
- Layouts vs. pages — lesson 2 of chapter 029.
- Server Components with async data — lesson 1 of chapter 030; first applied in lesson 2 of chapter 035.
- Server-side `searchParams` reads with Zod validation — lesson 4 of chapter 033; first applied in lesson 2 of chapter 035.
- Suspense at the segment + `loading.tsx` — lesson 1 of chapter 031, lesson 3 of chapter 031; first applied in lesson 4 of chapter 035.
- RSC prop-serialization boundary — lesson 4 of chapter 030.
- Architectural Principle #6 (explicit over magic) at `"use client"` — lesson 3 of chapter 030.
- Dynamic-by-default rendering under Cache Components — lesson 1 of chapter 032.

---

## Lesson 1 — Project Overview

No feature is built. The student leaves with the starter cloned, dependencies installed, and `pnpm dev` serving the `/invoices` shell with placeholder slots on `localhost:3000`.

### What we're building

The canonical SaaS workspace surface: a list of invoices on the left, the selected invoice's detail on the right, and a "new invoice" form that opens as a modal with a real URL.
The senior framing in one line — a `state.open` modal loses URL persistence, shareability, refreshability, and `Cmd+click`; the intercepting-route shape buys all four with no extra code.
Show the final UX as three screenshots or a short animation: list with the `?status=paid` filter applied, list-plus-detail at `/invoices/inv_017`, and the modal at `/invoices/new`.

### What we'll practice

- Reading view state from the URL server-side instead of holding it in client state.
- Wiring parallel slots with `default.tsx` so each independently-streamed region has a fallback.
- Pairing an intercepting route with its non-intercepting twin so soft nav, refresh, and `Cmd+click` each behave correctly.
- Placing data fetching in Server Components and keeping render components pure.

### Architecture

Labeled list or diagram, shape only: the `invoices/layout.tsx` two-slot shell renders `@list` and `@detail` alongside `children`; `@list` reads `?status=` and renders the filtered list; `@detail/[id]` loads one invoice; `(.)new` intercepts soft navigation into a dialog while `new/` is the full-page twin; the provided segment-level `invoices/loading.tsx` covers the first paint, and each slot adds its own `loading.tsx` skeleton in lesson 4.

### Starting file tree

Render the "Starter file tree" from the Chapter framing, annotated: comment the files changed from the previous project or that lessons will touch, leave the rest uncommented, and mark the `TODO(L<n>)` stubs (`@list/page.tsx`, `@list/default.tsx`, `@list/loading.tsx`, `@detail/default.tsx`, `@detail/[id]/page.tsx`, `@detail/[id]/loading.tsx`, `new/page.tsx`, `(.)new/page.tsx`, `components/new-invoice-dialog.tsx`, `components/skeletons.tsx`) as the highlighted focus.
One sentence per provided file on what it is and why it earns a seat; deep per-file explanation lands in the lesson that first touches the file. Name the senior call behind the starter itself: chapter 028 taught the from-scratch toolchain decisions (pnpm, `AGENTS.md`, `tsconfig`, Biome), and every project chapter after carries them forward via a `degit`'d snapshot rather than rebuilding them.

### Roadmap

One Card per implementation lesson in a CardGrid:

- **Lesson 2 — Server-rendered list and detail.** Adds the filtered list and the selected-invoice detail, both rendered server-side from the URL.
- **Lesson 3 — Modal with a real URL.** Adds the intercepting modal and its full-page twin so soft nav, refresh, and `Cmd+click` each behave correctly.
- **Lesson 4 — Independent streaming per slot.** Adds per-slot skeletons so the list and detail stream independently under a throttled network.

### Setup

`Steps` block with the exact command sequence and the expected outcome on success:

1. `pnpm dlx degit <starter-repo> list-plus-detail` — fetches the starter folder contents without git history. (`pnpm dlx` runs a package without installing it — the pnpm equivalent of `npx`.) One line on the projects monorepo layout: one folder per chapter project, with `start/` and `solution/` siblings.
2. `pnpm install` — installs the pinned dependencies (pnpm 11, Node ≥ 24); the student sees the install run and the symlinks appear.
3. `pnpm dev` — starts the Next.js dev server on `localhost:3000` with Turbopack (the Next.js 16 default, named only so the student recognizes the bundler in dev banners and error messages); the root path redirects to `/invoices`, whose two-slot shell renders with placeholder slots because `@list/page.tsx`, `@detail/[id]/page.tsx`, and friends are still `TODO(L<n>)` stubs.
4. `pnpm verify` — Biome CI + `next typegen` + `tsc --noEmit` + production build; this is the gate CI runs on every PR and the first proof the project is shippable. (`pnpm build` alone runs only the build step.)

No env vars (in-memory fixture; `DATABASE_URL` and friends land in Unit 5).
Expected result: `pnpm dev` serves the placeholder `/invoices` shell and `pnpm verify` completes cleanly — the starter is the new project's floor, ready to commit as the first milestone.

---

## Lesson 2 — Server-rendered list and detail

Wire the `@list` and `@detail` slots so the invoices list and the selected invoice's detail both render server-side, driven entirely by the URL.

### Goal + Finished result

`/invoices` shows the list beside a "pick an invoice" empty state; `/invoices/inv_001` shows the same list beside that invoice's detail; `?status=paid` filters the list server-side and survives a reload.
Show the two-slot surface rendering with the filter applied and a detail selected.

### Your mission

This is the spine of the surface: the layout already wires `@list` and `@detail` alongside `children`, and your job is to fill the slot pages so the entire view derives from the URL rather than from client state.
The list slot is an async Server Component that awaits `searchParams`, validates `status` with the project's `searchParamsSchema` at the boundary (the same Zod seam Unit 6 will reuse for FormData), and passes the result to the provided pure `<InvoiceList>` and the `<StatusFilter>` client component; the detail slot awaits `params`, loads one invoice, and shows it.
The constraint that earns this lesson its place is the `default.tsx` contract: a parallel slot without a `default.tsx` 404s on a direct visit where it has no matched segment, so `@list` needs a `default.tsx` that renders the list — otherwise visiting `/invoices/inv_001` directly breaks.
Keep data fetching in the Server Component pages and the render components pure; reach for `notFound()` rather than a thrown error for a missing invoice, and treat `@detail/default.tsx` as the "no detail selected" empty state, not a 404.
Out of scope: the modal, skeletons, and any mutation — the form does not submit yet.

- `/invoices` renders the filtered list and a "pick an invoice" empty state.
- `/invoices/inv_001` renders the list alongside that invoice's detail.
- `?status=paid` filters the list server-side; the filtered list holds across a hard reload at `/invoices?status=paid`.
- `?status=banana` (an invalid status) falls back to the full "all" list without crashing.
- A direct visit to `/invoices/inv_001` still renders the list on the left rather than 404ing.
- A missing invoice id renders the 404 surface rather than throwing.

### Coding time

Build prompt directing the student to implement against the brief and the tests, then the hidden solution `<details>`: `@list/page.tsx` (async, awaits and `safeParse`s `searchParams`, calls `listInvoices({ status })`, renders a header with a "New invoice" `<Link href="/invoices/new">` plus `<StatusFilter current={status} />` and `<InvoiceList>`), `@list/default.tsx` (the same render as `page.tsx` but with no status filter, since the default has no `searchParams`), `@detail/default.tsx` (empty-state prompt, `data-testid="detail-empty"`), `@detail/[id]/page.tsx` (awaits `params`, calls `getInvoice(id)`, `notFound()` on null, renders `<InvoiceDetail invoice={invoice} />`).
The "New invoice" link lands here in the list header (it lives in the list slot, not a separate component); lesson 3 makes it open a modal — for now it just navigates to the full page at `/invoices/new`.
This lesson is the first to open the provided `lib/invoices/queries.ts` and `schema.ts` — walk `listInvoices` accepting `{ status?: InvoiceStatus }` and returning sorted records, `getInvoice(id)`'s artificial 600 ms delay (the seam that makes streaming visible in lesson 4), and the `statusSchema`/`Invoice` shape Unit 5 will replace with Drizzle's `$inferSelect`.
Note `searchParamsSchema` living in `/lib` so one Zod schema validates the URL now and a form payload later — Architectural Principle #3 (pure `/lib`), formalized in lesson 4 of chapter 043.
Decision rationale: `default.tsx` on `@list` (name the direct-visit 404 it prevents), `notFound()` over a thrown error (the 404 boundary owns the case, not `error.tsx` — wire `not-found.tsx` later or accept the default), and the empty-state-vs-404 distinction on `@detail/default.tsx`.

### Moment of truth

Run `pnpm test:lesson 2` and `pnpm verify` (the `Lesson 2.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand, tick off each requirement:

- [ ] `/invoices` shows the list and the empty state.
- [ ] `/invoices/inv_001` shows the list and the detail.
- [ ] `/invoices?status=paid` filters the list, and the filter holds after a hard reload.
- [ ] `/invoices?status=banana` renders the full list without crashing.
- [ ] A direct visit to `/invoices/inv_001` renders the list slot, not a 404.

---

## Lesson 3 — Modal with a real URL

Build the `(.)new` intercepting modal and its non-intercepting twin so soft navigation opens a dialog while a direct visit, refresh, and `Cmd+click` open the full page.

### Goal + Finished result

From `/invoices`, clicking "New invoice" opens the form as a modal over the list at URL `/invoices/new`; visiting `/invoices/new` directly, refreshing it, or `Cmd+click`ing the link renders the full page instead.
Show the modal open over the list and the same URL rendering full-page in a fresh tab.

### Your mission

This is the modal-with-real-URL pattern, the production default for any "form that could also be a page": the URL is the source of truth, so the form gets shareability, refreshability, and `Cmd+click` for free instead of trapping its state in `useState`.
The "New invoice" link already exists from lesson 2 (it navigates to the full page); this lesson makes that same URL open as a modal on soft navigation.
Build the non-intercepting twin at `new/page.tsx` first — a full-page `<InvoiceForm>` with a "Cancel" link back to `/invoices` — because that is what direct visits, refreshes, and `Cmd+click` resolve to; then build the `NewInvoiceDialog` client component (a shadcn `<Dialog open>` whose `onOpenChange` calls `router.back()` on close) and the intercepting `(.)new/page.tsx` that composes `<NewInvoiceDialog><InvoiceForm /></NewInvoiceDialog>`.
The constraint that shapes the solution is that an intercepting route is always paired with its non-intercepting twin: skip the twin and direct visits, refreshes, and `Cmd+click` all break.
Closing the modal is a navigation (`router.back()`), not a state toggle, so history stays clean; the shadcn `<Dialog>` portal-renders to `<body>`, escaping ancestor stacking contexts (cross-reference lesson 9 of chapter 020).
Name the trade rather than fight it: refreshing the modal URL renders the full page and drops the underlay — that is by design in 2026 Next.js, and the "modal preserved across refresh" shape (a parallel `@modal` slot) is out of scope here.

- Clicking "New invoice" from `/invoices` opens the form as a modal over the list, with the URL at `/invoices/new`.
- A direct visit to `/invoices/new` in a fresh tab renders the full-page form.
- Refreshing while on the modal URL renders the full page (the accepted trade).
- `Cmd+click`ing the "New invoice" link opens the full page in a new tab.
- Closing the modal returns to `/invoices` and leaves the browser history clean.

### Coding time

Build prompt, then the hidden solution `<details>`: `new/page.tsx` (full-page `<InvoiceForm>` + "Cancel" `<Link href="/invoices">`), `components/new-invoice-dialog.tsx` (the `'use client'` `NewInvoiceDialog` — a shadcn `<Dialog open>` rendering `children` in `<DialogContent>`, closing via `router.back()` on `onOpenChange`), and `(.)new/page.tsx` (composes `<NewInvoiceDialog><InvoiceForm /></NewInvoiceDialog>`).
The "New invoice" `<Link href="/invoices/new">` is already in the list header from lesson 2 — no change needed here; the interception is what makes it open a modal.
Decision rationale: building the twin first (it is what every non-soft entry resolves to), close-as-navigation over close-as-state, factoring the dialog into a Client Component so `(.)new/page.tsx` stays a thin Server Component, and the `<Dialog>` portal target.
Callout: the `(.)` prefix matches a same-level segment — `(..)` and `(...)` exist for cross-level interception (referenced to lesson 6 of chapter 029, not re-explained).

### Moment of truth

Run `pnpm test:lesson 3` and `pnpm verify` (the `Lesson 3.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand, tick off each requirement:

- [ ] Soft navigation from `/invoices` opens the modal with the list underneath and the URL at `/invoices/new`.
- [ ] A direct visit to `/invoices/new` renders the full page.
- [ ] A refresh on the modal URL renders the full page (expected by design).
- [ ] A `Cmd+click` on "New invoice" opens the full page in a new tab.
- [ ] Closing the modal navigates back to `/invoices`.

---

## Lesson 4 — Independent streaming per slot

Add `loading.tsx` and skeleton components to each slot so the list and detail stream independently under a throttled network.

### Goal + Finished result

Under a throttled network, navigating from `/invoices` to `/invoices/inv_005` keeps the list mounted while the detail slot streams from skeleton to content on its own; moving to another invoice re-streams only the detail.
Show the two slots streaming independently, each under its own skeleton.

### Your mission

This lesson makes the surface feel right under real network conditions by giving each slot its own segment-level loading UI, so the seam where streaming kicks in is owned by the file convention rather than a hand-written `<Suspense>` tag.
Build the shared skeleton components against shadcn's `<Skeleton>` primitive — a row-count `ListSkeleton` and a header-plus-body `DetailSkeleton` — then place a `loading.tsx` in each slot that renders the matching skeleton; because each slot has its own `loading.tsx`, each gets its own Suspense boundary and they stream independently without any extra wiring.
The best practice that keeps the student clear of the common trap: throttle the network in DevTools to verify, because that is what exposes "I'm waterfalling, not streaming," and shape each skeleton to mirror its final content (the `DetailSkeleton`'s heading-plus-body blocks should track the real detail's number heading, status badge, and amount/due-date rows, not a generic gray box).
The artificial 600 ms delay on `getInvoice` from lesson 2 is what makes the detail stream observable; the list's data has already resolved, so it stays put.
Out of scope: per-sub-section streaming inside a page — name the explicit-`<Suspense>` reach (a slow related-invoices panel, pointing to lesson 2 of chapter 031) but do not build it.

- Under a throttled network, the list slot shows `ListSkeleton` before its content resolves.
- Under a throttled network, the detail slot shows `DetailSkeleton` before its content resolves.
- Navigating from `/invoices` to `/invoices/inv_005` streams the detail slot while the list stays mounted.
- Navigating from `/invoices/inv_005` to `/invoices/inv_009` re-streams only the detail slot.

### Coding time

Build prompt, then the hidden solution `<details>`: `components/skeletons.tsx` exporting `<ListSkeleton>` (six `h-12` `<Skeleton>` rows, stable string keys) and `<DetailSkeleton>` (heading + subtitle + `<Separator>` + body `<Skeleton>` blocks) over shadcn `<Skeleton>`, `@list/loading.tsx` rendering `<ListSkeleton>`, and `@detail/[id]/loading.tsx` rendering `<DetailSkeleton>`.
Decision rationale: `loading.tsx` is the segment-level skeleton and an explicit `<Suspense>` is the sub-segment-level one — senior code reaches for the file convention first and the explicit boundary only when granularity inside the segment matters.
Callout: the optional reach is an explicit `<Suspense>` around a slow sub-section inside `@detail/[id]/page.tsx`; name the pattern and link lesson 2 of chapter 031 rather than implement it.

### Moment of truth

Run `pnpm test:lesson 4` and `pnpm verify` (the `Lesson 4.test.ts` file is a `describe.todo` placeholder; the by-hand checklist plus `pnpm verify` is the real gate). By hand, throttle the network in DevTools to "Slow 3G" and tick off each requirement:

- [ ] Navigating to a detail URL shows `DetailSkeleton`, then the content, while the list stays mounted.
- [ ] Navigating between two invoices re-streams only the detail slot.
- [ ] Each skeleton's shape mirrors its final content.
- [ ] With JavaScript disabled in DevTools, the list and detail still render server-side and the "New invoice" link degrades to the full page.

This is the surface complete. The student can now confirm every project goal in the browser: server-side filtering that survives reload, the modal that opens on soft nav and falls back to the full page on direct visit, refresh, and `Cmd+click`, and per-slot independent streaming.
Forward references: Unit 6 adds Server Actions to the modal form (`<form action={createInvoice}>`), Unit 5 replaces the in-memory fixture with Drizzle and Postgres, and Unit 10 adds `nuqs`, cursor pagination, sort, and soft delete on this same surface.
