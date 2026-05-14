# Chapter 5.7 — Project: list-plus-detail with parallel routes

## Chapter framing

Chapter 5.7 cashes in the App Router primitives the unit installed: parallel routes (5.1.5), intercepting routes (5.1.6), server-side `searchParams` reads (5.5.4), Suspense and `loading.tsx` at the segment boundary (5.3.1, 5.3.3), `default.tsx` for unmatched slots, and the server/client boundary (5.2). The student ships the canonical SaaS list-plus-detail surface — invoices on the left, the selected invoice's detail on the right — with the "new invoice" form opening as a soft-navigation modal that has a real URL, refreshes correctly, survives `Cmd+click`, and falls back to a full page on direct visit. The list reads a `?status=` filter from `searchParams` server-side; both slots stream independently under their own Suspense boundaries; the surface degrades to a working no-JavaScript flow.

Threads that run through every lesson: parallel slots render alongside `children` in a layout, each with its own loading/error/not-found boundary; `default.tsx` per slot is the contract that prevents a 404 on direct visits when only one slot has a matching segment; intercepting routes are always paired with a non-intercepting twin so direct visits and refreshes degrade to the full page; URL is the source of truth for view state, transient UI state is not; data fetching happens in Server Components, not in client effects; Suspense is the seam where streaming kicks in, and the `loading.tsx` file convention is the layer-appropriate skeleton owner. The chapter ships 1 brief + 1 starter walkthrough + 3 build lessons + 1 verify lesson; each build lesson closes on a runnable state.

### Dependency carry-in

- **From 5.1 (routing):** `app/` shape, `layout.tsx` / `page.tsx` semantics, parallel-route `@slot` naming, `default.tsx` per slot, intercepting-route prefixes (`(.)`, `(..)`).
- **From 5.2 (server/client boundary):** Server Components as the default, `"use client"` only where state or events appear.
- **From 5.3 (async UI):** `<Suspense>` as the streaming seam, `loading.tsx` at the segment, sibling-independent streaming.
- **From 5.4 (cache):** Under Cache Components every route is dynamic by default; `searchParams` is an explicit dynamic signal.
- **From 5.5 (server-side reads):** `await searchParams` in Server Components, Zod validation at the boundary.
- **From 4.11 (shadcn):** `<Dialog>` for the modal shell (assumed installed in starter); `<Skeleton>` for skeleton primitives.
- **From 2.4 / 2.5 (TypeScript):** Zod schemas, `z.infer`, narrowed enum types.

### Starter file tree (stubs marked with TODO)

```
app/
  invoices/
    layout.tsx                 # provided: two-slot layout with @list and @detail
    @list/
      default.tsx              # TODO student
      page.tsx                 # TODO student (reads searchParams.status)
      loading.tsx              # TODO student (list skeleton)
    @detail/
      default.tsx              # TODO student (empty-state)
      [id]/
        page.tsx               # TODO student (loads one invoice)
        loading.tsx            # TODO student (detail skeleton)
    (.)new/
      page.tsx                 # TODO student (intercepted modal)
    new/
      page.tsx                 # TODO student (paired full page)
  layout.tsx                   # provided: root shell, fonts, Tailwind
lib/
  invoices/
    data.ts                    # provided: in-memory fixture (30 records)
    queries.ts                 # provided: getInvoices(filters), getInvoice(id)
    schema.ts                  # provided: Invoice type, statusSchema
components/
  invoice-list.tsx             # provided: pure render component
  invoice-detail.tsx           # provided: pure render component
  invoice-form.tsx             # provided: pure render component, no submit yet
  status-filter.tsx            # provided: client component, useRouter-driven
  skeletons.tsx                # TODO student exports ListSkeleton, DetailSkeleton
```

### Reference solution signatures lessons display

- `getInvoices(filters: { status?: InvoiceStatus }): Promise<Invoice[]>`
- `getInvoice(id: string): Promise<Invoice | null>` (with artificial 600 ms delay)
- `statusSchema = z.enum(['draft', 'sent', 'paid', 'overdue'])`
- `searchParamsSchema = z.object({ status: statusSchema.optional() })`
- `Invoice = { id: string; number: string; customer: string; status: InvoiceStatus; amount: number; dueDate: string }`
- Page signature: `async function ListPage({ searchParams }: { searchParams: Promise<{ status?: string }> })`
- Detail page signature: `async function DetailPage({ params }: { params: Promise<{ id: string }> })`
- Env: no entries (in-memory fixture; Drizzle/Postgres land in Unit 6).

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Direct visit to `/invoices/new` renders the full page | Visit `localhost:3000/invoices/new` in a fresh tab. |
| Soft navigation to `/invoices/new` shows the modal | From `/invoices`, click the "New invoice" `<Link>`. |
| Refresh on the modal still shows the modal | Reload while on the modal URL. *Caveat: refresh shows the non-intercepting page, by design — the doc names this and the project spec accepts.* |
| Both slots show their own skeleton while loading | Throttle network in DevTools to "Slow 3G"; observe two skeletons stream independently. |
| `?status=paid` filters the list server-side | Click the Paid filter; confirm URL and rendered list. |
| Survives a hard reload | Reload at `/invoices?status=paid`; the filter holds. |
| Survives `Cmd+click` | `Cmd+click` an invoice and the new tab renders the full detail page directly. |

### Concepts demonstrated → owning lesson

- Parallel routes with `default.tsx` fallbacks — 5.1.5.
- Intercepting routes paired with non-intercepting `page.tsx` — 5.1.6.
- Layouts vs. pages — 5.1.2.
- Server Components with async data — 5.2.1.
- Server-side `searchParams` reads with Zod validation — 5.5.4.
- Suspense at the segment + `loading.tsx` — 5.3.1, 5.3.3.
- RSC prop-serialization boundary — 5.2.4.
- Architectural Principle #6 (explicit over magic) at `"use client"` — 5.2.3.
- Dynamic-by-default rendering under Cache Components — 5.4.1.

---

## Lesson 5.7.1 — Project brief

Goals:

- Frame the SaaS pattern being built: list-plus-detail as the canonical workspace surface, modal-with-real-URL as the senior modal pattern, URL as the source of truth for view state.
- State the four "Done when" verifications in one paragraph.
- Set the scope cut: in-memory fixture, no mutations yet (Unit 7 owns Server Actions), no auth (Unit 9), no real database (Unit 6).
- Show the final UX as three screenshots or a short animation: list with filter, list-plus-detail at `/invoices/inv_017`, modal at `/invoices/new`.
- Name the senior-mindset payoff: a `state.open` modal loses URL persistence, shareability, refreshability, and `Cmd+click` — the intercepting-route shape buys all four with no extra code.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The modal-as-URL pattern is the production default for any "form that could also be a page." Naming the threshold up front avoids the student reaching for `useState` and shipping a worse UX.
- The fixture has an artificial 600 ms delay so streaming is visible; production data would not need the delay, but the seam is real.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, dependencies installed, `pnpm dev` runs and shows the unstubbed shell (empty slots).

Estimated student time: 10 to 15 minutes.

---

## Lesson 5.7.2 — Starter walkthrough

Goals:

- Walk the file tree above, calling out provided vs. stubbed.
- Read `lib/invoices/queries.ts` together — note `getInvoices` accepts `{ status?: InvoiceStatus }`, returns sorted records; `getInvoice(id)` adds a 600 ms delay to make streaming observable.
- Read `lib/invoices/schema.ts` — the `statusSchema` enum and `Invoice` type the project consumes; this is what Unit 6 will replace with Drizzle's `$inferSelect` output.
- Open `app/invoices/layout.tsx` — point out the two-slot layout signature (`children`, `list`, `detail` slots, all already wired into a grid).
- Read the pure render components (`InvoiceList`, `InvoiceDetail`, `InvoiceForm`) — they take resolved data as props, no fetching inside. Reinforce: data fetching belongs in Server Component pages, not in render components.
- Read `status-filter.tsx` — it's a Client Component because it uses `useRouter`, and the boundary is named.
- Run `pnpm dev`, navigate to `/invoices`, confirm an empty layout renders (because the slot `page.tsx` files are still TODO).

Senior calls and watch-outs:

- Pure render components that take data as props compose freely on either side of the server/client boundary — the senior shape.
- The `searchParamsSchema` is in `/lib` so the same Zod schema validates the URL and would validate a form payload later — this is Architectural Principle #3 (pure `/lib`).

Codebase state at entry: starter cloned, `pnpm dev` runs an empty `/invoices` shell.
Codebase state at exit: student has read every provided file and can articulate which slot needs which signature. No code written.

Estimated student time: 20 to 25 minutes.

---

## Lesson 5.7.3 — Parallel slots with the server-side status filter

Goals:

- Fill `@list/page.tsx`: async Server Component, awaits `searchParams`, parses with `searchParamsSchema.safeParse`, calls `getInvoices({ status })`, renders `<InvoiceList>` with the result and the `<StatusFilter>` client component for control.
- Fill `@list/default.tsx`: returns the same content as `page.tsx` so direct visits to `/invoices/inv_017` (where `@list` has no matched segment under `[id]`) render the list correctly.
- Fill `@detail/default.tsx`: empty-state component prompting the user to pick an invoice from the list.
- Fill `@detail/[id]/page.tsx`: async Server Component, awaits `params`, calls `getInvoice(id)`, calls `notFound()` if null, renders `<InvoiceDetail>`.
- Verify locally: `/invoices` shows the list and the empty state; `/invoices/inv_001` shows the list and the detail; `/invoices?status=paid` filters server-side; an invalid status (`?status=banana`) safely falls back to "all" without crashing.

Senior calls and watch-outs:

- `default.tsx` is the silent must-have. Skipping it on `@list` means a direct visit to `/invoices/inv_001` 404s because the `@list` slot has no matched segment. Name the failure mode and the fix.
- `searchParams` is a Promise in Next.js 16 — `await` it. The Zod parse at the boundary is the seam Unit 7 will reuse for FormData.
- `notFound()` over a thrown error: the 404 boundary handles the case, not the `error.tsx` boundary. Wire `not-found.tsx` later or accept the default — name the choice.
- `@detail/default.tsx` is *not* a 404 — it's the "no detail selected" empty state, which is the right UX for the list-only URL.

Codebase state at entry: empty stubs from 5.7.2.
Codebase state at exit: `/invoices`, `/invoices?status=paid`, `/invoices/inv_001` all render server-side. No modal yet — clicking "New invoice" 404s because `(.)new/` is still empty.

Estimated student time: 35 to 45 minutes.

---

## Lesson 5.7.4 — The intercepting modal and its paired full page

Goals:

- Fill `app/invoices/new/page.tsx` first — the non-intercepting twin. Renders a full-page version of `<InvoiceForm>` with a "Cancel" `<Link>` back to `/invoices`. This is what direct visits, refreshes, and `Cmd+click` hit.
- Fill `app/invoices/(.)new/page.tsx` — the intercepting modal. Wraps `<InvoiceForm>` in a shadcn `<Dialog open>` that closes by navigating back (`router.back()` on a small Client Component close button, or the dialog's `onOpenChange` triggers `router.back()`).
- Add a "New invoice" `<Link href="/invoices/new">` to the list header.
- Soft-navigate: from `/invoices`, click "New invoice" — the modal opens, the URL is `/invoices/new`, the list stays underneath.
- Hard-refresh the modal URL — the non-intercepting page renders. Name the trade: refresh dropping the underlay is by design in 2026 Next.js; the production reach for "modal preserved across refresh" is a different shape (Suspense + parallel `@modal` slot), out of scope for this project.
- `Cmd+click` the New invoice link — the new tab renders the full page.

Senior calls and watch-outs:

- The intercepting page is *always* paired with a non-intercepting twin. Skipping the twin breaks direct visits, refreshes, and `Cmd+click` — every senior modal-with-real-URL ships both.
- The `(.)` prefix matches "same-level segment" — `(..)` and `(...)` exist for cross-level interception (named once, referenced to 5.1.6).
- Closing the modal is a navigation, not a state toggle. `router.back()` on the close action keeps history clean.
- The shadcn `<Dialog>` portal-renders to `<body>` — confirming the modal escapes any ancestor stacking context. Cross-reference 4.4.9 if the student saw the trap.

Codebase state at entry: list and detail render server-side.
Codebase state at exit: full list-plus-detail-plus-modal works. Soft nav opens modal, hard nav opens full page, `Cmd+click` opens full page. No skeletons yet.

Estimated student time: 35 to 45 minutes.

---

## Lesson 5.7.5 — Slot-specific Suspense boundaries and skeletons

Goals:

- Fill `components/skeletons.tsx` — export `<ListSkeleton>` (row-count placeholder) and `<DetailSkeleton>` (header + body placeholder) using shadcn's `<Skeleton>` primitive.
- Fill `@list/loading.tsx` — render `<ListSkeleton>`. This is the segment-level loading UI for the list slot.
- Fill `@detail/[id]/loading.tsx` — render `<DetailSkeleton>`. Segment-level loading for the detail slot.
- Throttle network in DevTools to "Slow 3G", navigate from `/invoices` to `/invoices/inv_005`, observe: the list stays mounted (its data already resolved), the detail slot streams from skeleton to content independently. Then navigate to `/invoices/inv_009` from `/invoices/inv_005` — only the detail slot re-streams.
- Name the architectural payoff: each slot owns its own Suspense boundary because each slot has its own `loading.tsx`. Streaming is independent without the student writing a single `<Suspense>` tag — the file convention installs the boundary.
- Optional reach: an explicit `<Suspense>` inside `@detail/[id]/page.tsx` around a slow sub-section (a related-invoices panel that takes longer than the detail header) — name the pattern, point to 5.3.2.

Senior calls and watch-outs:

- `loading.tsx` is the segment-level skeleton; an explicit `<Suspense>` is the sub-segment-level skeleton. Both exist; senior code reaches for the file convention first and the explicit boundary when the granularity inside the segment matters.
- Skeleton shape mirrors the final content's shape. A square skeleton next to a circular avatar is the smell.
- Throttling the network is the verification move that catches "I'm not actually streaming, I'm waterfalling" — the senior debugging discipline.

Codebase state at entry: full surface works, but transitions feel synchronous.
Codebase state at exit: both slots stream independently under their own skeletons. Done-when clauses are now achievable in 5.7.6.

Estimated student time: 25 to 35 minutes.

---

## Lesson 5.7.6 — Verify

Goals:

- Walk every "Done when" clause as a verification step (see table in Chapter framing).
- Direct visit to `/invoices/new` in a fresh tab — full page.
- Soft navigation from `/invoices` — modal.
- Refresh on `/invoices/new` while in modal — full page renders (the senior-noted trade).
- DevTools network throttling — both skeletons appear and resolve independently on a slot change.
- `?status=paid` survives a hard reload and a `Cmd+click`.
- JavaScript disabled in DevTools — the list and detail still render server-side; the modal degrades to the full page on click (the `<Link>` is a real anchor).
- Name the senior calls one more time:
  - URL is the source of truth for filter, sort, and active record.
  - Parallel routes with `default.tsx` are the contract that prevents direct-visit 404s.
  - Intercepting routes always ship with a paired non-intercepting twin.
  - Suspense + `loading.tsx` give independent streaming for free.
- Forward references:
  - Unit 7 will add Server Actions to the modal form (`<form action={createInvoice}>`).
  - Unit 6 will replace the in-memory fixture with Drizzle and Postgres.
  - Unit 11 will add `nuqs`, cursor pagination, sort, and soft delete on this same surface (URL-state list project).

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the fix the student wrote.
- If any verification fails, the lesson points at the owning build lesson, not at "debug it yourself."

Codebase state at entry: full surface, working.
Codebase state at exit: same surface, verified clause-by-clause against the spec. Student can articulate what each App Router primitive bought them.

Estimated student time: 15 to 20 minutes.
