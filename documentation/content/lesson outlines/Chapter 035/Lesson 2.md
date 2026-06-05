# Chapter 035 — Lesson 2 outline

## Lesson title

- **Full title:** Server-rendered list and detail
- **Sidebar (short) title:** List and detail

The chapter-outline title fits: the lesson's payoff is exactly that both slots render server-side from the URL. Keep it.

## Lesson type

`Implementation`

Drives the test-coder (the `Lesson 2.test.ts` file ships as a `describe.todo` placeholder — the test-coder authors it) and the Implementation section list.

## Lesson framing

The student installs the senior reflex that the **URL is the source of truth for view state**: the list filter and the selected invoice both live in the address bar, read server-side, instead of in client `useState`. They ship the spine of the surface — two parallel slots (`@list`, `@detail`) filling the layout shell alongside `children` — and close the lesson having confirmed that filtering survives a hard reload, an invalid filter degrades gracefully, and a direct visit to a detail URL still paints the list. The decision that earns the lesson its place is the **`default.tsx` contract**: a parallel slot with no matched segment 404s unless it has a `default.tsx`, so `@list` needs one that renders the full list.

## Codebase state

### Entry

Starter from Lesson 1 runs: `pnpm dev` serves the `/invoices` two-slot shell with placeholder slots. The layout (`invoices/layout.tsx`), segment `default.tsx`/`loading.tsx`, every pure render component (`invoice-list.tsx`, `invoice-detail.tsx`, `status-filter.tsx`, `invoice-form.tsx`), the `ui/` primitives, and the whole `lib/invoices/` data layer (`schema.ts`, `data.ts`, `queries.ts`) are provided and identical to the solution. The four slot stubs this lesson fills (`@list/page.tsx`, `@list/default.tsx`, `@detail/default.tsx`, `@detail/[id]/page.tsx`) each render a `TODO(L2)` placeholder. `@list/loading.tsx`, `@detail/[id]/loading.tsx`, the modal files, and skeletons remain `TODO(L3/L4)` stubs.

### Exit

All four `TODO(L2)` slots implemented. `/invoices` renders the filtered list beside the "pick an invoice" empty state; `/invoices/inv_001` renders the list beside that invoice's detail; `?status=paid` filters server-side and holds across reload; `?status=banana` falls back to "all"; a direct visit to a detail URL renders the list, not a 404; a missing id renders the 404 surface. `pnpm verify` passes. Untouched: the "New invoice" link navigates to the full page at `/invoices/new` (no modal yet — Lesson 3), and there are no per-slot skeletons (Lesson 4).

## Lesson sections

Implementation type → contract section list: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: wire the two slots so the invoices list and the selected invoice's detail both render server-side, driven entirely by the URL. Then a one-paragraph (or `Screenshot`) description of the finished surface: `/invoices` showing the list beside the empty state, `/invoices/inv_001` showing list-plus-detail, and `?status=paid` filtering the list. Prefer a single `Screenshot` (desktop) of the two-slot surface with a filter applied and a detail selected; if a static image is unavailable, a one-paragraph description suffices.

### Your mission

Prose paragraph (no subsection headers, no implementation hints). Weave together:

- **Feature.** Fill the `@list` and `@detail` slot pages so the entire view — the active filter and the selected invoice — derives from the URL rather than from client state; the layout already wires both slots alongside `children`.
- **Constraints.** Data fetching stays in the Server Component pages; the provided render components stay pure. Validate `status` with the project's `searchParamsSchema` at the boundary (the same Zod seam Unit 6 reuses for FormData). Use `notFound()` for a missing invoice, not a thrown error. Treat `@detail/default.tsx` as the "no detail selected" empty state, not a 404. `@list` must carry a `default.tsx` or a direct visit to a detail URL 404s.
- **Out of scope.** The modal, skeletons, and any mutation — the form does not submit yet.

Then the **Functional requirements** as a numbered list, each tagged. Render as a `Checklist` with `tested`/`untested` chips. Tag every item `[untested]` — the `Lesson 2.test.ts` placeholder means the by-hand checklist plus `pnpm verify` is the real gate for this lesson; the test-coder may upgrade some to `[tested]` if it authors real assertions, but the outline assumes the placeholder.

1. `/invoices` renders the filtered list and a "pick an invoice" empty state. `[untested]`
2. `/invoices/inv_001` renders the list alongside that invoice's detail. `[untested]`
3. `?status=paid` filters the list server-side; the filtered list holds across a hard reload at `/invoices?status=paid`. `[untested]`
4. `?status=banana` (invalid status) falls back to the full "all" list without crashing. `[untested]`
5. A direct visit to `/invoices/inv_001` still renders the list on the left rather than 404ing. `[untested]`
6. A missing invoice id renders the 404 surface rather than throwing. `[untested]`

### Coding time

Build prompt (one line: implement against the brief and the tests, then read the solution). Writer wraps the solution in `<details>`, collapsed. Present the four files in repo order. Use plain `Code` for the short files; use `AnnotatedCode` for `@list/page.tsx` to direct focus across its three load-bearing parts (the `safeParse` boundary, the `listInvoices({ status })` call, the header `<Link>` + `<StatusFilter current={status}>` + `<InvoiceList>` render). For `@list/page.tsx` vs `@list/default.tsx`, a `CodeVariants` (two tabs: "page — reads the filter" / "default — no filter") makes the single difference legible — `default` calls `listInvoices({})` with no status and renders `<StatusFilter />` with no `current` because a slot default has no `searchParams`.

Files (organized as in the repo):

1. **`@list/page.tsx`** — async Server Component. `const parsed = searchParamsSchema.safeParse(await searchParams); const status = parsed.success ? parsed.data.status : undefined;` then `await listInvoices({ status })`. Renders a `<section>` with a header holding the "Invoices" label and a `<Button asChild size="sm"><Link href="/invoices/new" data-testid="new-invoice-link">New invoice</Link></Button>`, followed by `<StatusFilter current={status} />` and `<InvoiceList invoices={invoices} />`.
2. **`@list/default.tsx`** — same render, but `await listInvoices({})` and `<StatusFilter />` with no `current`. Rationale: the default has no `searchParams`, so it shows the unfiltered list; it exists to keep `@list` from 404ing on a direct `/invoices/[id]` visit.
3. **`@detail/default.tsx`** — the empty state. `<section data-testid="detail-empty" …>Pick an invoice to see its details</section>`. Note the `sticky top-0 grid h-dvh place-items-center` styling and that this is an empty state, not a 404.
4. **`@detail/[id]/page.tsx`** — async. `const { id } = await params; const invoice = await getInvoice(id); if (!invoice) notFound();` then `<InvoiceDetail invoice={invoice} />`.

Decision rationale (one or two sentences each, covering the `[untested]` requirements):

- **`safeParse` over `parse`** — an invalid `?status=banana` must degrade to "all", not throw; `safeParse` + fallback to `undefined` is the graceful-degradation path (requirement 4). Note `searchParamsSchema` lives in `/lib` so one Zod schema validates the URL now and a form payload later — Architectural Principle #3 (pure `/lib`), formalized in lesson 4 of chapter 043.
- **`default.tsx` on `@list`** — name the direct-visit 404 it prevents: visiting `/invoices/inv_001` directly matches `@detail/[id]` but leaves `@list` with no matched segment, so without a default the whole route 404s (requirement 5).
- **`notFound()` over a thrown error** — the 404 boundary owns the missing-invoice case, not `error.tsx`; the project accepts the default not-found surface here, wiring a `not-found.tsx` later (requirement 6).
- **Empty-state vs 404** on `@detail/default.tsx` — no selection is a valid, expected state, so it renders a prompt, not an error.
- **The "New invoice" link lands in the list header** (it lives in the list slot, not a separate component); for now it just navigates to the full page at `/invoices/new` — Lesson 3 makes interception turn it into a modal.

First open of the provided data layer — walk briefly, link rather than re-explain owned topics:

- `lib/invoices/queries.ts` — `listInvoices({ status? })` filters then returns records sorted ascending by `dueDate`; `getInvoice(id)` carries an artificial 600 ms delay, the seam that makes streaming visible in Lesson 4, and returns `null` for a miss.
- `lib/invoices/schema.ts` — `statusSchema` (`z.enum`), `InvoiceStatus` (`z.infer`), `searchParamsSchema`, and the `Invoice` shape (`amount` in cents, `dueDate` as `YYYY-MM-DD`) that Unit 5 replaces with Drizzle's `$inferSelect`.
- For the server/client boundary at `<StatusFilter>` ('use client', `router.replace`), reference chapter 030 / chapter 033 rather than re-teaching; the filter is provided, not built here.

No diagram needed — the layout-plus-two-slots shape is already covered in Lesson 1's Architecture and the flow is linear (URL → safeParse → query → pure component). If the Lesson 1 Architecture figure proves thin, an optional `RequestTrace` of one `/invoices/inv_001` request through layout → `@list/default` + `@detail/[id]/page` would clarify why both slots resolve, but treat it as optional, not required.

External resources slot: appended after the `<details>` with no header (resourcer fills later).

### Moment of truth

`Code` block with the command and expected output. Run `pnpm test:lesson 2` (the `Lesson 2.test.ts` placeholder reports the `describe.todo` as pending/skipped — show that output) and `pnpm verify` (Biome CI + `next typegen` + `tsc --noEmit` + build; the real gate, show the clean pass). Then a by-hand `Checklist` mirroring requirements 1–5 the student ticks off in the browser:

- `/invoices` shows the list and the empty state.
- `/invoices/inv_001` shows the list and the detail.
- `/invoices?status=paid` filters the list, and the filter holds after a hard reload.
- `/invoices?status=banana` renders the full list without crashing.
- A direct visit to `/invoices/inv_001` renders the list slot, not a 404.

## Scope

- **Modal / intercepting route** for `/invoices/new` — Lesson 3 of this chapter. The "New invoice" link here only navigates to the full page.
- **Per-slot skeletons and `loading.tsx`** — Lesson 4 of this chapter. The provided segment-level `invoices/loading.tsx` already covers first paint.
- **Mutations / form submit** — Unit 6 (Server Actions); the form renders but does not submit.
- **Replacing the in-memory fixture** with Drizzle/Postgres — Unit 5.
- **URL state library (`nuqs`), pagination, sort, soft delete** on this surface — Unit 10.
- **Server/client boundary, `searchParams` reads, parallel routes** are *applied* here but *owned* by chapters 029/030/033 — link, don't re-teach.
