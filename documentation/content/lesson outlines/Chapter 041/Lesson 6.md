# Lesson 6 — The single-round-trip invoice detail read

- **Chapter:** 041 — Project: the org-scoped invoicing data layer
- **Lesson title:** The single-round-trip invoice detail read
- **Sidebar title:** Invoice detail read
- **Lesson type:** Implementation

The chapter-outline title fits — it names the read and its load-bearing property (one round trip). Keep it.

## Lesson framing

The student installs the two senior reflexes that define every relational read for the rest of the course: the tenant guard lives *inside* the `where`, not in a check after the load (the IDOR fix), and a nested entity ("one invoice with its lines and customer") is one query through the relational `with`, not an N+1 loop. Shipping `getInvoiceDetail` closes the chapter's data layer — both reads it ships now follow the same `organizationId`-in-the-`where` discipline that Unit 9's `tenantDb` later makes structural.

## Codebase state

### Entry

Lessons 2–5 are done: env boundary wired (L2), the six tables + relations + indexes migrated (L3), the deterministic seed populating two orgs / 100+ invoices (L4), and `listInvoices` implemented with cursor pagination + status filter, proven against its plan (L5). The inspector's list panel works; clicking a row sets `?invoiceId=...` but the detail panel renders nothing useful because `getInvoiceDetail` in `src/lib/invoices/queries.ts` is still the stub returning `null` (with hand-typed `InvoiceDetail = Invoice & { customer; lines }` placeholder). Everything `getInvoiceDetail` depends on already exists: the migrated schema with `idx_invoices_customer_id`, the relations (`invoices → one(customer)`, `invoices → many(lines)`), the seeded data, the provided `DetailPanel` (calls `getInvoiceDetail` when `invoiceId` present, renders header / customer / lines / empty-state), and the provided `getDetailPlan` probe behind the plan panel.

### Exit

`getInvoiceDetail` is implemented in `queries.ts`: a `findFirst` whose callback `where` AND-includes both `eq(t.id, invoiceId)` and `eq(t.organizationId, organizationId)`, `with: { customer: true, lines: { orderBy: asc(position) } }`, returning `invoice ?? null`. `InvoiceDetail` is now inferred from the query (`NonNullable<Awaited<ReturnType<typeof findInvoiceDetail>>>`), replacing the hand-typed placeholder. The inspector detail panel renders a real invoice (header, customer, position-ordered lines); a cross-org `orgId`/`invoiceId` pairing shows the empty state; the detail plan panel shows one outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`. The data layer is complete — this is the final lesson of the chapter.

## Lesson sections

Implementation lesson. Render the contract's four-section structure: Goal + Finished result (intro, no header) / **Your mission** / **Coding time** (solution in `<details>`) / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: clicking an invoice loads it with its line items and customer in a single query, and only if it belongs to the current org. Then one short paragraph (or a `Screenshot` of the inspector with a row clicked and the detail panel populated — header, customer block, position-ordered line items, expanded plan panel showing the single `Index Scan`) describing the feature working. Lead with the payoff: this read closes the data layer. No `<details>` here.

### Your mission

Coherent prose paragraph (per contract: no subsection headers, no implementation hints, the requirements as the section's only list). Weave in:

- **Feature** (user terms): clicking an invoice in the list loads its full detail — header, customer, line items in order — and a detail URL that names an invoice belonging to a different org shows the empty state, never the row.
- **Framing**: this is the read that closes the data layer; it proves the relational API turns "one invoice with its lines and customer" into a single round trip rather than the N+1 a hand-written `getCustomer` + `getLines` loop would produce.
- **Constraints** (the two senior decisions, named without giving away the call shape):
  - *Tenant guard* — the security must live in the query: the read filters on `organizationId` as part of the match condition, so a guessed invoice id from another org returns nothing. Name the failure mode plainly: the "load the invoice, then check its `organizationId`" shape reads as correct but leaks any invoice whose id an attacker guesses (IDOR). This is the same structural rule `listInvoices` (L5) follows and the discipline Unit 9's `tenantDb` will later enforce.
  - *Single round trip* — the customer and the line items must come back in one query plan, not three lookups; line items must be ordered deterministically by their `position`.
- **Out of scope** (one line): the list read (L5) and the plan panel's wiring — the student reads the plan's output to confirm the single round trip, doesn't build the probe; the project stays read-only (mutations are Unit 6).

Then the **Functional requirements** numbered list, each tagged. Phrase every item as a verifiable outcome, never as a file/export/import. Render with `Checklist` / `ChecklistItem` carrying `tested`/`untested` chips.

1. Clicking an invoice loads the detail panel with the invoice header, its customer, and its line items ordered by `position`. `[tested]` — assert the detail read returns the matching invoice with its customer object and its lines in ascending `position` order.
2. A detail read pairing one org's `organizationId` with another org's `invoiceId` returns no invoice (the empty state), not the cross-org row. `[tested]` — the tenant-guard assertion; the lesson's reason for existing.
3. A detail read for an `invoiceId` that exists in the matching org returns that invoice's customer and the correct set of line items in one result. `[tested]` — confirms the nested `with` resolves customer + lines in a single read.
4. The detail-load query plan shows one outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines` (not three independent lookups). `[untested]` — verified by hand in the plan panel; the test asserts shape/correctness of the result, not the EXPLAIN text.

Note for the test-coder: the test imports the student's `getInvoiceDetail` and exercises it against the seeded database — happy path (existing in-org invoice with customer + ordered lines), the tenant edge case (in-org `organizationId` + out-of-org `invoiceId` ⇒ `null`), and a sanity check that line items come back sorted by `position`. Self-contained per the contract; inline any org/invoice id lookups it needs from the seeded data rather than depending on other lesson specs.

### Coding time

One line directing the student to implement `getInvoiceDetail` in `src/lib/invoices/queries.ts` against the brief and the tests, then exercise the inspector detail panel before reading on.

Solution hidden in `<details>` (writer wraps it). Contents:

- The `getInvoiceDetail` block as it sits in `queries.ts`, shown with `AnnotatedCode` to direct focus across three parts of the same block: (1) the callback `where` AND-combining `eq(t.id, args.invoiceId)` and `eq(t.organizationId, args.organizationId)`; (2) the `with` block — `customer: true` plus `lines: { orderBy: (t, { asc }) => [asc(t.position)] }`; (3) the `invoice ?? null` return. Ground the code against the real solution: an internal `findInvoiceDetail` helper holds the query, `getInvoiceDetail` awaits it and coalesces to `null`.
- Decision rationale, one or two sentences each:
  - Why the `organizationId` filter lives in the `where` (IDOR otherwise — the filter *is* the security boundary, never a post-load check). This is the `[untested]`-adjacent reasoning behind requirement 2.
  - Why the relational `with` stays one round trip versus a manual `getCustomer` + `getLines` loop (the planner satisfies both joins in one plan). Link the chapter 039 N+1 lesson rather than re-deriving it.
  - Why `lines` is explicitly `orderBy: asc(position)` — row order from the join is not guaranteed without it.
- Coverage of the `[untested]` requirement (the type inference, which the tests don't assert): `InvoiceDetail` is `NonNullable<Awaited<ReturnType<typeof findInvoiceDetail>>>`, inferred from the query rather than hand-typed — call out that this replaces the start file's placeholder `Invoice & { customer; lines }` alias, and that the inferred shape is what `DetailPanel` consumes. Use `CodeTooltips` on the `InvoiceDetail` type line to surface the inferred shape (customer object + `lines[]`).
- Callout (`Aside`) on reading the detail plan in the provided panel: one outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`, read bottom-up with the chapter 039 `EXPLAIN ANALYZE` vocabulary; contrast it with the three separate lookups an N+1 loop would emit.
- Closing pointer (prose, not a header) to where this data layer is picked up next: Unit 6 adds Server Actions and `useActionState` on top of these reads; Unit 8 swaps the `users` stub for Better Auth's generated tables (additive migration, FK targets unchanged); Unit 9 wraps both reads in `tenantDb(orgId)` so the missing `organizationId` filter becomes impossible to write; Unit 10 turns the inspector's URL state into the production list view.
- External resources slot (no header, after the `<details>`) for the resourcer to fill later — leave empty.

Code-sample handling summary: `AnnotatedCode` for the `getInvoiceDetail` block (three focus points in one file); `CodeTooltips` for the inferred `InvoiceDetail` type; plain `Code` for any plan-panel output snippet. No diagram needed — the single-vs-N+1 contrast is carried by the plan text and prose, and the relations were diagrammed in L3 territory.

### Moment of truth

- Test command: `pnpm test:lesson 6`. Show the expected pass output (the Lesson 6 suite green — happy-path detail, tenant-guard `null`, position ordering).
- By-hand checklist (`Checklist`), ticked as the student goes:
  - Click an invoice; confirm the detail panel renders its customer and line items ordered by `position` in one paint.
  - Hand-construct an inspector URL pairing org A's `orgId` with an `invoiceId` read from org B in Studio (`pnpm db:studio`); confirm the detail panel shows the empty state, not the leaked invoice.
  - Expand the plan panel on the detail load; confirm one plan with an outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`.

## Scope

- Does not cover `listInvoices`, cursor pagination, or the status filter — that is Lesson 5 of this chapter.
- Does not build the EXPLAIN probes or the plan panel — provided in `lib/invoices/explain.ts`; the student only reads their output.
- Does not cover mutations / Server Actions on this schema — Unit 6 (Chapters 042–047).
- Does not build the structural `tenantDb(orgId)` wrapper — Unit 9 (Chapters 056–059); this lesson installs the manual `organizationId`-in-`where` discipline the wrapper later enforces.
- Does not cover the Better Auth `users` swap — Unit 8 (Chapters 051–055).
- Does not deep-dive `EXPLAIN ANALYZE` reading or the N+1 problem — owned by Chapter 039; link, don't re-explain.
