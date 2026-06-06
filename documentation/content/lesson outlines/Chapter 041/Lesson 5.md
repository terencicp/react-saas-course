# Lesson 5 — The tenant-scoped invoice list with cursor pagination

## Lesson title

Chapter-outline title fits: **The tenant-scoped invoice list with cursor pagination**. Keep it.
Sidebar: **Invoice list & pagination**.

## Lesson type

`Implementation`

(Test-coder runs for this lesson: `tests/lessons/Lesson 5.test.ts` is currently `describe.todo('Lesson 5')` and must be filled.)

## Lesson framing

The student installs the read pattern every list view later in the course inherits: a single tenant-scoped, cursor-paginated, status-filterable query the planner serves from a composite index instead of a `Seq Scan`. The senior payoff is three load-bearing decisions made correctly the first time — the `organizationId` guard lives *inside* the `where` (the manual discipline Unit 9's `tenantDb` later enforces structurally), the cursor carries a `(createdAt, id)` tiebreaker so no row is skipped or duplicated when timestamps collide, and the `limit: pageSize + 1` n+1 trick learns "is there a next page?" without a second `count()` round trip. The lesson ships `listInvoices` and proves it against the live query plan.

## Codebase state

**Entry.** Everything before this lesson is in place: `env.ts` validated (L2), the six-table schema migrated with the three indexes including `idx_invoices_org_created_at_id` and `idx_invoices_org_status_created_at_id` (L3), and the deterministic seed populating two orgs and 100+ invoices (L4). `src/lib/invoices/queries.ts` is a stub — `listInvoices` returns `{ rows: [], nextCursor: null }` with a `TODO(L5)`, and `InvoiceListRow` is a hand-typed placeholder so the inspector compiles. The inspector's list panel renders the empty state for every org. All plumbing the query depends on is provided: `listInvoicesInputSchema` and `Cursor`/`encodeCursor`/`decodeCursor`, the `list-panel.tsx` RSC that calls `listInvoices`, and `getListPlan` behind the plan panel.

**Exit.** `listInvoices` is implemented against the real signature: it accepts a typed `ListInvoicesInput`, builds the relational `findMany` with the AND-combined `where` (tenant guard + optional status + conditional cursor predicate), orders `desc(createdAt), desc(id)`, fetches `pageSize + 1`, slices, and emits a `nextCursor` from the last kept row. `InvoiceListRow` is now inferred from the query. The inspector list panel renders an org's invoices, "Next page" carries a fresh `?cursor=...` with no repeats, `?status=paid` filters server-side and survives a reload, and the plan panel shows the matching index. `getInvoiceDetail` is still a stub (L6).

## Lesson sections

Implementation type — section list: *Goal + Finished result* (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: the inspector lists one org's invoices, pages through them with a cursor, and filters by status server-side. Then one paragraph (or a `Screenshot` of the inspector list panel) describing the working feature: rows show invoice number, customer name, status badge, total, and due date; "Next page" advances with a fresh `?cursor=...` and no repeated rows; `?status=paid` shows only paid rows and survives a hard reload; the plan panel confirms the list query rides the composite index, never a `Seq Scan`.

### Your mission

Prose paragraph(s) + one requirements `Checklist`. No subsection headers, no implementation hints.

Weave into prose:

- **Feature.** Implement `listInvoices` in `src/lib/invoices/queries.ts` so the inspector's list panel renders an org's invoices, pages forward with a cursor, and filters by status — the read every later list in the course is built on.
- **Input shape (provided, do not re-derive).** The function takes a typed `ListInvoicesInput` (validated by the provided `listInvoicesInputSchema`): `organizationId` required, `status` optional, `cursor` optional as an already-decoded `Cursor` object (the inspector page decodes the URL token via `decodeCursor` before calling — the student does not parse the token here), `pageSize` default 20, capped at 100. This is the same input shape Unit 6 reuses against a Server Action's `formData`, which is why the schema lives in `/lib` for callers to compose — surface this as the senior reason the boundary schema is separated.
- **Constraints (the three load-bearing decisions).**
  1. *Tenant guard in the where, never after the load.* The `organizationId` filter belongs inside the query's `where`; the "load then filter in memory" shape is the IDOR failure mode. This is the manual discipline Unit 9's `tenantDb` later enforces structurally.
  2. *Compound cursor tiebreaker.* Ordering by `createdAt` alone skips or duplicates rows whenever two invoices share a timestamp; the cursor must compare on the `(createdAt, id)` pair, included only when a cursor is present.
  3. *The `pageSize + 1` n+1 trick.* Fetch one extra row to learn whether a next page exists; set `nextCursor` from the last kept row, avoiding a separate `count()` round trip.
- **Out of scope.** The detail read (L6); the provided plan panel's wiring (read its output, don't build it); any mutation — this project is read-only, Unit 6 owns the Server Actions and CRUD.
- **Trap to pre-empt.** Treating the tiebreaker or the `+ 1` as optional polish — both are load-bearing for correct paging.

`Checklist` (the only list here; each item an observable outcome, tagged):

1. `[tested]` The list returns one org's invoices, scoped to `organizationId`; switching orgs in the switcher changes which rows appear.
2. `[tested]` A cross-org pairing returns no leaked rows — invoices for a different org never appear under the requested org.
3. `[tested]` Paging forward via the returned `nextCursor` yields a fresh page with no row repeated across pages, and `nextCursor` is `null` on the last page.
4. `[tested]` Passing `status: 'paid'` returns only paid rows; the result is identical whether or not the status reaches via the URL.
5. `[tested]` The page never returns more than `pageSize` rows even when more exist (the `+ 1` extra row is dropped, not emitted).
6. `[untested]` Each returned row carries its `customer` (e.g. the customer name) from the same query, no per-row follow-up fetch.
7. `[untested]` In the inspector, `?status=paid` puts the status in the URL and a hard reload (or a second tab on the same URL) reproduces the filtered view.
8. `[untested]` The list query's plan uses `idx_invoices_org_created_at_id` without a status filter and `idx_invoices_org_status_created_at_id` with one, never a `Seq Scan`.

Note for the test-coder: assertions target observable behavior of `listInvoices` against the seeded DB (calling it with crafted inputs and checking returned `rows`/`nextCursor`), not file paths or internal names. Items 7–8 (URL persistence and plan/index selection) are verified by hand in *Moment of truth*, not asserted.

### Coding time

One line directing the student to implement `listInvoices` against the brief and the tests, then exercise the inspector list before reading on. The solution walkthrough goes in a `<details>` (the writer wraps it).

Reference implementation — ground exactly against `projects/Chapter 041/solution/src/lib/invoices/queries.ts`. Present it as it sits in the repo: a private `listInvoiceRows(input)` builder (the `findMany`), the `InvoiceListRow` type inferred from `Awaited<ReturnType<typeof listInvoiceRows>>[number]`, then the public `listInvoices` that awaits it and computes the slice + `nextCursor`.

Use `AnnotatedCode` for the `listInvoiceRows` builder — multiple parts need student focus in sequence:
1. The callback `where` form `(t, { and, eq, lt, or }) => and(...)` and the tenant guard `eq(t.organizationId, organizationId)`.
2. The optional status leaf: `status ? eq(t.status, status) : undefined` (an `undefined` leaf is dropped by `and`, so the filter conditionally vanishes — call this out).
3. The conditional cursor predicate: `cursor ? or(lt(t.createdAt, new Date(cursor.createdAt)), and(eq(t.createdAt, new Date(cursor.createdAt)), lt(t.id, cursor.id))) : undefined`. Stress the `(createdAt, id)` tiebreaker and that `cursor.createdAt` is wrapped in `new Date(...)` because the column is a `Date`; `createdAt` is pinned to millisecond precision (from the `timestamps` group, `precision: 3`) so the cursor's ISO string round-trips exactly. Do NOT describe a `RAW: sql` cursor escape — the clean relational predicate is the whole point.
4. `orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)]` — order matches the cursor comparison direction and the composite index column order from L3.
5. `limit: pageSize + 1` and `with: { customer: true }`.

Then a plain `Code` block (or continue annotation) for `listInvoices`: `hasNextPage = rows.length > pageSize`, `kept = hasNextPage ? rows.slice(0, pageSize) : rows`, `last = kept.at(-1)`, and `nextCursor = hasNextPage && last ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : null`.

Decision rationale (one or two sentences each, covering `[untested]` requirements):
- Why `listInvoices` takes a typed `ListInvoicesInput` and does **not** call `listInvoicesInputSchema.parse` internally — the inspector page (and Unit 6's action) parse at their boundary; the query trusts its typed input. Mention the schema lives in `/lib` so callers compose it (Architectural Principle #3).
- Why `with: { customer: true }` stays one round trip (the planner satisfies the join in one plan) versus a manual per-row customer fetch — the N+1 the relational API avoids. Link the chapter 038 relational-query lesson and the chapter 039 N+1 lesson rather than re-explaining.
- Why the tiebreaker is mandatory (skip/duplicate at equal timestamps) and why `+ 1` beats a separate `count()`. Link the chapter 038 cursor-pagination lesson.
- Why `InvoiceListRow` is inferred from the query, not from `Invoice` — the row includes the joined `customer`, so the inferred type is the accurate one (covers requirement 6's typing). Optionally a `CodeTooltips` hover on `InvoiceListRow` to show the inferred shape (invoice columns + `customer`).
- Naming/organization note: the private builder is split out so the public function's `Awaited<ReturnType<...>>` inference stays clean and the slice logic reads top-to-bottom.

Callouts (`Aside`):
- The tenant guard in the `where` is the IDOR defense; the "load then check `organizationId`" shape reads correct but leaks. Same structural rule the detail read (L6) follows; Unit 9's `tenantDb` makes the missing filter impossible to write.
- Reading the list query's plan in the provided plan panel: `Index Scan using idx_invoices_org_created_at_id ...` (no status) or `...org_status_created_at_id` (with status), read bottom-up with the chapter 039 vocabulary; a `Seq Scan` here means the index column order from L3 is wrong.

No diagram needed — prose plus annotated code carries the cursor predicate. (If the writer judges a small figure helps, a two-page filmstrip showing page 1's last row becoming page 2's cursor boundary could clarify the tiebreaker, but it is optional, not required.)

External resources: none required; the resourcer appends after the `<details>` if any.

### Moment of truth

- Test command: `pnpm test:lesson 5`. Expected: the Lesson 5 suite passes (all assertions green, pass/fail surface only).
- By-hand `Checklist` for the untested requirements (items 6–8), ticked as the student goes:
  - Against one org, click "Next page" three times and confirm no row repeats across the three pages (open Studio if needed); switch orgs and confirm the rows differ.
  - Click `paid`, confirm the URL shows `?status=paid`, only paid rows render, and a hard reload preserves the view.
  - Switch the plan panel to the list query and confirm it uses `idx_invoices_org_created_at_id` (no status) and `idx_invoices_org_status_created_at_id` (with status), never a `Seq Scan` — if it falls back, the L3 index order is wrong.

## Scope

- The single-round-trip invoice detail read (`getInvoiceDetail`) is L6 — leave the detail stub untouched.
- Building or wiring the plan panel and the `EXPLAIN ANALYZE` probes is provided plumbing, not student work; the student only reads the panel's output.
- Authoring the schema, indexes, and migration is L3; the deterministic seed is L4. Cursor encode/decode and the input Zod schema are provided.
- Mutations / Server Actions / CRUD that write to this schema are Unit 6, not this read-only project.
- Deep Zod authoring is chapter 042; the `EXPLAIN ANALYZE` reading vocabulary is chapter 039.
