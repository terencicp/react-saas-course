# Chapter 035 — Project: list-plus-detail with parallel routes

## Chapter framing

Chapter 035 cashes in the App Router primitives the unit installed: parallel routes (lesson 5 of chapter 029), intercepting routes (lesson 6 of chapter 029), server-side `searchParams` reads (lesson 4 of chapter 033), Suspense and `loading.tsx` at the segment boundary (lesson 1 of chapter 031, lesson 3 of chapter 031), `default.tsx` for unmatched slots, and the server/client boundary (chapter 030). The student ships the canonical SaaS list-plus-detail surface — invoices on the left, the selected invoice's detail on the right — with the "new invoice" form opening as a soft-navigation modal that has a real URL, refreshes correctly, survives `Cmd+click`, and falls back to a full page on direct visit. The list reads a `?status=` filter from `searchParams` server-side; both slots stream independently under their own Suspense boundaries; the surface degrades to a working no-JavaScript flow.

Threads that run through every lesson: parallel slots render alongside `children` in a layout, each with its own loading/error/not-found boundary; `default.tsx` per slot is the contract that prevents a 404 on direct visits when only one slot has a matching segment; intercepting routes are always paired with a non-intercepting twin so direct visits and refreshes degrade to the full page; URL is the source of truth for view state, transient UI state is not; data fetching happens in Server Components, not in client effects; Suspense is the seam where streaming kicks in, and the `loading.tsx` file convention is the layer-appropriate skeleton owner. The chapter ships 1 brief + 1 starter clone + 1 starter walkthrough + 3 build lessons + 1 verify lesson; each build lesson closes on a runnable state.

### Dependency carry-in

- **From chapter 029 (routing):** `app/` shape, `layout.tsx` / `page.tsx` semantics, parallel-route `@slot` naming, `default.tsx` per slot, intercepting-route prefixes (`(.)`, `(..)`).
- **From chapter 030 (server/client boundary):** Server Components as the default, `"use client"` only where state or events appear.
- **From chapter 031 (async UI):** `<Suspense>` as the streaming seam, `loading.tsx` at the segment, sibling-independent streaming.
- **From chapter 032 (cache):** Under Cache Components every route is dynamic by default; `searchParams` is an explicit dynamic signal.
- **From chapter 033 (server-side reads):** `await searchParams` in Server Components, Zod validation at the boundary.
- **From chapter 027 (shadcn):** `<Dialog>` for the modal shell (assumed installed in starter); `<Skeleton>` for skeleton primitives.
- **From chapter 004 / chapter 005 (TypeScript):** Zod schemas, `z.infer`, narrowed enum types.

### Starter file tree (stubs marked with TODO)

```
src/
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
- Env: no entries (in-memory fixture; Drizzle/Postgres land in Unit 5).

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

- Parallel routes with `default.tsx` fallbacks — lesson 5 of chapter 029.
- Intercepting routes paired with non-intercepting `page.tsx` — lesson 6 of chapter 029.
- Layouts vs. pages — lesson 2 of chapter 029.
- Server Components with async data — lesson 1 of chapter 030.
- Server-side `searchParams` reads with Zod validation — lesson 4 of chapter 033.
- Suspense at the segment + `loading.tsx` — lesson 1 of chapter 031, lesson 3 of chapter 031.
- RSC prop-serialization boundary — lesson 4 of chapter 030.
- Architectural Principle #6 (explicit over magic) at `"use client"` — lesson 3 of chapter 030.
- Dynamic-by-default rendering under Cache Components — lesson 1 of chapter 032.

---

## Lesson 1 — Project brief

Frames the list-plus-detail surface, the modal-with-real-URL pattern, the "Done when" verifications, and the scope cut against future units.

Goals:

- Frame the SaaS pattern being built: list-plus-detail as the canonical workspace surface, modal-with-real-URL as the senior modal pattern, URL as the source of truth for view state.
- State the four "Done when" verifications in one paragraph.
- Set the scope cut: in-memory fixture, no mutations yet (Unit 6 owns Server Actions), no auth (Unit 8), no real database (Unit 5).
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

## Lesson 2 — Cloning the starter and the dev/build cycle

Fetch the course's pinned Next.js 16 scaffold with `degit`, read the file tree end to end, and run `pnpm dev` and `pnpm build` to commit the project's toolchain decisions into a real first commit — the first project in the course that starts from a starter rather than from scratch.

Topics to cover:

- The senior question: why does this project ship a starter when chapter 028 just built one from scratch. Two reasons named plainly. First, the chapter 028 from-scratch flow taught the toolchain decisions that any new SaaS project would have to make (pnpm, AGENTS.md, tsconfig, Biome, env validation). From now on, project chapters land on those decisions already made — the starter is a `degit`'d snapshot of the previous project's solution plus the new project's stubbed file tree. Second, recreating chapter 028's setup before every project would take each project chapter sideways. The starter is the senior call: one canonical scaffold, one set of decisions, carried forward.
- Fetching the starter with `degit`. `pnpm dlx degit react-saas-course-projects/list-plus-detail-starter project-name` (`pnpm dlx` runs a package without installing it — the pnpm equivalent of npx). Why `degit` over `git clone`: it pulls the folder contents without history, which is what the student wants — they are about to commit this as their own next milestone, not fork the course's repo. One line on the projects monorepo layout (one folder per project, the `starter/` and `solution/` siblings) so the student knows what they're pulling from.
- `pnpm install` against the pinned `pnpm-lock.yaml` from the starter. The student sees the install run and the symlinks appear; everything the previous project pinned fires.
- The file tree, read once end to end. The expected shape, with one sentence per entry on what it is and why it earns a seat (the chapter framing's "Starter file tree" table above is the canonical reference; this lesson is the reading pass).
- The three Next.js scripts, with one line each on what they do and when a senior reaches for each.
  - `pnpm dev` — Next.js dev server on `localhost:3000`, Turbopack bundling, fast refresh, the loop the student lives in for development.
  - `pnpm build` — production build through Turbopack, type-checks, emits the optimized output. Two senior calls: `pnpm build` is what CI runs on every PR, and the build's success is the first proof that the project is shippable.
  - `pnpm start` — serves the production build locally. Used to confirm the build runs end-to-end before pushing to deploy; not the development surface.
- Turbopack as the default. One paragraph: Turbopack went stable in Next.js 16 (February 2026) and is now the default for both `next dev` and `next build`, no flag required. The student does not need to think about this — the only reason to name it at all is so they recognize the bundler name in CI logs and Next.js error messages.
- The first run. The student runs `pnpm dev`, sees the unstubbed `/invoices` shell on `localhost:3000` (empty slots, because the `page.tsx` files are still TODO), and then runs `pnpm build` to confirm the production path works.
- The `.gitignore` worth a glance. `node_modules/`, `.next/`, `.env*.local`, plus the conventional set. `pnpm-lock.yaml` is **not** in it — the starter respects the lockfile-as-contract rule from chapter 028.
- Initial commit. One paragraph naming what the student is about to commit: every file in the tree they just read, the lockfile, the `AGENTS.md`, the existing source files. Not the `.env.local` if one exists (excluded by `.gitignore`). The senior framing: a project commit is the moment the previous project's decisions become the new project's floor.

What this lesson does not cover:

- The contents of the provided source files (`/lib/invoices/queries.ts`, `/lib/invoices/schema.ts`, the pure render components) — lesson 4 of chapter 035 walks them.
- The intercepting-routes pattern, the parallel-routes wiring, the slot signatures — lessons 4 of chapter 035 through 6 of chapter 035 own those.
- The relationship to chapter 028's from-scratch flow at depth — named here, not retaught.

Pedagogical approach:

Setup/wiring archetype with a Decision opening. Open with one paragraph naming why projects from chapter 035 forward start from a starter (chapter 028 taught the from-scratch flow; every project chapter after carries it forward via `degit`), then a `Steps` block that walks the four commands: `degit`, `pnpm install`, `pnpm dev`, `pnpm build`. Show each command and its expected output in adjacent labeled blocks; the student sees the bundler line ("Turbopack" in the dev banner, the build summary in production output) and the page rendering on `localhost:3000`. After the commands, a `FileTree` component renders the project root with annotations on each entry — the same tree the chapter framing previewed, now grounded in the running project. No sandbox: the lesson's deliverable is a running app and a committed starter.

Estimated student time: 25 to 30 minutes.

---

## Lesson 3 — Starter walkthrough

Tours the provided file tree, the queries and Zod schema in `/lib`, the pure render components, and the two-slot layout the student will fill in.

Goals:

- Walk the file tree above, calling out provided vs. stubbed.
- Read `src/lib/invoices/queries.ts` together — note `getInvoices` accepts `{ status?: InvoiceStatus }`, returns sorted records; `getInvoice(id)` adds a 600 ms delay to make streaming observable.
- Read `src/lib/invoices/schema.ts` — the `statusSchema` enum and `Invoice` type the project consumes; this is what Unit 5 will replace with Drizzle's `$inferSelect` output.
- Open `src/app/invoices/layout.tsx` — point out the two-slot layout signature (`children`, `list`, `detail` slots, all already wired into a grid).
- Read the pure render components (`InvoiceList`, `InvoiceDetail`, `InvoiceForm`) — they take resolved data as props, no fetching inside. Reinforce: data fetching belongs in Server Component pages, not in render components.
- Read `status-filter.tsx` — it's a Client Component because it uses `useRouter`, and the boundary is named.
- Run `pnpm dev`, navigate to `/invoices`, confirm an empty layout renders (because the slot `page.tsx` files are still TODO).

Senior calls and watch-outs:

- Pure render components that take data as props compose freely on either side of the server/client boundary — the senior shape.
- The `searchParamsSchema` is in `/lib` so the same Zod schema validates the URL and would validate a form payload later — this is Architectural Principle #3 (pure `/lib`) (introduced formally in lesson 4 of chapter 043).

Codebase state at entry: starter cloned, `pnpm dev` runs an empty `/invoices` shell.
Codebase state at exit: student has read every provided file and can articulate which slot needs which signature. No code written.

Estimated student time: 20 to 25 minutes.

---

## Lesson 4 — Wiring the @list and @detail slots

Fills the slot `page.tsx` and `default.tsx` files, reads `searchParams` server-side with Zod validation, and uses `notFound()` for missing records.

Goals:

- Fill `@list/page.tsx`: async Server Component, awaits `searchParams`, parses with `searchParamsSchema.safeParse`, calls `getInvoices({ status })`, renders `<InvoiceList>` with the result and the `<StatusFilter>` client component for control.
- Fill `@list/default.tsx`: returns the same content as `page.tsx` so direct visits to `/invoices/inv_017` (where `@list` has no matched segment under `[id]`) render the list correctly.
- Fill `@detail/default.tsx`: empty-state component prompting the user to pick an invoice from the list.
- Fill `@detail/[id]/page.tsx`: async Server Component, awaits `params`, calls `getInvoice(id)`, calls `notFound()` if null, renders `<InvoiceDetail>`.
- Verify locally: `/invoices` shows the list and the empty state; `/invoices/inv_001` shows the list and the detail; `/invoices?status=paid` filters server-side; an invalid status (`?status=banana`) safely falls back to "all" without crashing.

Senior calls and watch-outs:

- `default.tsx` is the silent must-have. Skipping it on `@list` means a direct visit to `/invoices/inv_001` 404s because the `@list` slot has no matched segment. Name the failure mode and the fix.
- `searchParams` is a Promise in Next.js 16 — `await` it. The Zod parse at the boundary is the seam Unit 6 will reuse for FormData.
- `notFound()` over a thrown error: the 404 boundary handles the case, not the `error.tsx` boundary. Wire `not-found.tsx` later or accept the default — name the choice.
- `@detail/default.tsx` is *not* a 404 — it's the "no detail selected" empty state, which is the right UX for the list-only URL.

Codebase state at entry: empty stubs from lesson 3 of chapter 035.
Codebase state at exit: `/invoices`, `/invoices?status=paid`, `/invoices/inv_001` all render server-side. No modal yet — clicking "New invoice" 404s because `(.)new/` is still empty.

Estimated student time: 35 to 45 minutes.

---

## Lesson 5 — Modal with a real URL

Builds the `(.)new` intercepting modal and its non-intercepting twin so soft nav opens a dialog while refresh and `Cmd+click` open the full page.

Goals:

- Fill `src/app/invoices/new/page.tsx` first — the non-intercepting twin. Renders a full-page version of `<InvoiceForm>` with a "Cancel" `<Link>` back to `/invoices`. This is what direct visits, refreshes, and `Cmd+click` hit.
- Fill `src/app/invoices/(.)new/page.tsx` — the intercepting modal. Wraps `<InvoiceForm>` in a shadcn `<Dialog open>` that closes by navigating back (`router.back()` on a small Client Component close button, or the dialog's `onOpenChange` triggers `router.back()`).
- Add a "New invoice" `<Link href="/invoices/new">` to the list header.
- Soft-navigate: from `/invoices`, click "New invoice" — the modal opens, the URL is `/invoices/new`, the list stays underneath.
- Hard-refresh the modal URL — the non-intercepting page renders. Name the trade: refresh dropping the underlay is by design in 2026 Next.js; the production reach for "modal preserved across refresh" is a different shape (Suspense + parallel `@modal` slot), out of scope for this project.
- `Cmd+click` the New invoice link — the new tab renders the full page.

Senior calls and watch-outs:

- The intercepting page is *always* paired with a non-intercepting twin. Skipping the twin breaks direct visits, refreshes, and `Cmd+click` — every senior modal-with-real-URL ships both.
- The `(.)` prefix matches "same-level segment" — `(..)` and `(...)` exist for cross-level interception (named once, referenced to lesson 6 of chapter 029).
- Closing the modal is a navigation, not a state toggle. `router.back()` on the close action keeps history clean.
- The shadcn `<Dialog>` portal-renders to `<body>` — confirming the modal escapes any ancestor stacking context. Cross-reference lesson 9 of chapter 020 if the student saw the trap.

Codebase state at entry: list and detail render server-side.
Codebase state at exit: full list-plus-detail-plus-modal works. Soft nav opens modal, hard nav opens full page, `Cmd+click` opens full page. No skeletons yet.

Estimated student time: 35 to 45 minutes.

---

## Lesson 6 — Independent streaming per slot

Adds `loading.tsx` and skeleton components to each slot so the list and detail stream independently under throttled network.

Goals:

- Fill `src/components/skeletons.tsx` — export `<ListSkeleton>` (row-count placeholder) and `<DetailSkeleton>` (header + body placeholder) using shadcn's `<Skeleton>` primitive.
- Fill `@list/loading.tsx` — render `<ListSkeleton>`. This is the segment-level loading UI for the list slot.
- Fill `@detail/[id]/loading.tsx` — render `<DetailSkeleton>`. Segment-level loading for the detail slot.
- Throttle network in DevTools to "Slow 3G", navigate from `/invoices` to `/invoices/inv_005`, observe: the list stays mounted (its data already resolved), the detail slot streams from skeleton to content independently. Then navigate to `/invoices/inv_009` from `/invoices/inv_005` — only the detail slot re-streams.
- Name the architectural payoff: each slot owns its own Suspense boundary because each slot has its own `loading.tsx`. Streaming is independent without the student writing a single `<Suspense>` tag — the file convention installs the boundary.
- Optional reach: an explicit `<Suspense>` inside `@detail/[id]/page.tsx` around a slow sub-section (a related-invoices panel that takes longer than the detail header) — name the pattern, point to lesson 2 of chapter 031.

Senior calls and watch-outs:

- `loading.tsx` is the segment-level skeleton; an explicit `<Suspense>` is the sub-segment-level skeleton. Both exist; senior code reaches for the file convention first and the explicit boundary when the granularity inside the segment matters.
- Skeleton shape mirrors the final content's shape. A square skeleton next to a circular avatar is the smell.
- Throttling the network is the verification move that catches "I'm not actually streaming, I'm waterfalling" — the senior debugging discipline.

Codebase state at entry: full surface works, but transitions feel synchronous.
Codebase state at exit: both slots stream independently under their own skeletons. Done-when clauses are now achievable in lesson 7 of chapter 035.

Estimated student time: 25 to 35 minutes.

---

## Lesson 7 — Verify

Walks every "Done when" clause as a verification step, names the senior calls, and points at the forward references in Units 5, 6, and 10.

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
  - Unit 6 will add Server Actions to the modal form (`<form action={createInvoice}>`).
  - Unit 5 will replace the in-memory fixture with Drizzle and Postgres.
  - Unit 10 will add `nuqs`, cursor pagination, sort, and soft delete on this same surface (URL-state list project).

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the fix the student wrote.
- If any verification fails, the lesson points at the owning build lesson, not at "debug it yourself."

Codebase state at entry: full surface, working.
Codebase state at exit: same surface, verified clause-by-clause against the spec. Student can articulate what each App Router primitive bought them.

Estimated student time: 15 to 20 minutes.
