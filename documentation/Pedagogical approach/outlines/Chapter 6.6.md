# Chapter 6.6 — Project: the org-scoped invoicing data layer: pedagogical approach

## Concept 1 — The project is a discipline rehearsal: scope cuts as senior moves

**Why it's hard.** A project chapter invites the wrong reflex — *more is better*. The student wants to ship mutations, auth, RBAC, an admin dashboard, the whole picture. The senior move is the inverse: ship the foundation that makes the next four units cheap, *and nothing else*. Without the cut named explicitly, the student treats the scope as artificial constraint and either pads it (loses the deadline) or shortcuts the disciplines the cut is designed to install (skips `organizationId` on one table, skips the index review, skips the `EXPLAIN` verification). The cut *is* the lesson.

**Ideal teaching artifact.** Pattern archetype delivered as a **cuts-and-carry-forwards table** in the brief lesson. Two columns: *In scope* (six tables, two reads, the migration, the deterministic seed, the inspector's verification surface) and *Cut, with the unit that owns it* (mutations → 7.6, real auth → 9.5, RBAC at the query layer → 10.4, soft-delete + sort controls → 11.3, optimistic concurrency → 11.3). A third row at the bottom: *forward-loaded disciplines* (manual `organizationId` filter that 10.4's `tenantDb` will wrap; per-table `id`/`createdAt`/`updatedAt` that 11.3's soft-delete pattern extends). The student leaves with a picture of the chapter's place in the unit graph, not a bullet list of features. The senior posture lands inline: the project ships the smallest data layer the rest of the course can build on, and the cut items are not missing — they are *owned by their owning units*.

**Engagement.** A `Buckets` sort — the student drops twelve feature descriptions ("a Server Action that creates an invoice", "a delete button that soft-deletes", "the org switcher in the inspector header", "a route handler that paginates the invoice list", "the composite cursor index", "an RBAC check on `getInvoiceDetail`", etc.) into "in scope for 6.6" or "owned by a later chapter (name it)". Wrong-answer feedback names which discipline the cut protects.

**Components.**
- `Figure` wrapping a hand-coded HTML table (in-scope / cut-and-owned-by / forward-loaded) for the cuts-and-carries panel. Single-use static composition; no bespoke component earns its weight.
- `Buckets` for the in-scope-vs-owned-elsewhere sort.
- `Aside` (`tip`) below the panel: "the cut items are not missing — they are owned by their owning units; this chapter's job is the foundation they all share."

**Project link.** This concept *is* the project framing — the student returns to the panel at the end of every build lesson to confirm they're still on the inside of the cut.

---

## Concept 2 — The inspector contract is the spec; the queries are the implementation

**Why it's hard.** A junior reads a starter's `page.tsx` to find the place to type code. The senior reads it as a *contract* — what the page calls, with what shape, expecting what return — and then implements *to that contract* without renaming, restructuring, or "improving" the surface. The inversion is load-bearing: the call site is canonical because the page is provided whole; the queries the student writes must satisfy the call site, not the other way around. This contract-first reading is rarely modeled; juniors arrive at the keyboard and start writing queries from scratch instead of tracing the call sites first.

**Ideal teaching artifact.** Pattern archetype delivered as a **call-site trace** through the provided `app/inspector/page.tsx`. The student walks `searchParams` → `listInvoices({ organizationId, status, cursor, pageSize })` → return shape consumed by the list panel; then `searchParams` → `getInvoiceDetail({ organizationId, invoiceId })` → return shape consumed by the detail panel. Three annotation tracks on each call: (a) what arguments the page passes, (b) what return shape the page consumes, (c) what would break in the page if the student returned a different shape. The artifact is the same `AnnotatedCode` the chapter uses for query walkthroughs, but pointed *at the call site* — the student practices reading a contract before they write code that satisfies it. The closing line names the senior reflex: when the page is the spec, the implementation does not get to argue with the spec.

**Engagement.** A `Dropdowns` exercise on a stub `queries.ts` skeleton — four blanks: the function signature for `listInvoices` (input shape, return shape), the function signature for `getInvoiceDetail` (input shape, return shape). The student fills each from a curated set of options that includes plausible-but-wrong shapes (return `Invoice[]` instead of `{ rows; nextCursor }`, omit the tenant guard from the input). The grader confirms the four signatures match what the inspector page expects.

**Components.**
- `AnnotatedCode` walking the inspector's two call sites with the three annotation tracks.
- `Dropdowns` for the four-signature exercise.
- `Aside` (`note`) below: "the page is the contract; the queries earn their right to exist by satisfying it."

**Project link.** This concept *is* lesson 6.6.2's senior posture — the student leaves the lesson knowing what they have to write, before they write a line.

---

## Concept 3 — Authoring the schema is a sequence of decisions, not a transcription

**Why it's hard.** Six tables, twenty-odd columns, ten-plus constraints. The junior's reflex is to type the reference solution from the chapter framing top-to-bottom. The senior's reflex is to *pause on each column for one beat* and name the decision: which Postgres type and why, NOT NULL or nullable and why, default and why, FK with which `ON DELETE` and why, unique scope and why. Without that pause, the student leaves the chapter with a working schema and no defensible reasoning — the moment a code review asks "why `restrict` here?" the student shrugs. This concept's job is to install the per-decision pause as the way schemas get written.

**Ideal teaching artifact.** Pattern archetype delivered as a **decision-walked authoring beat** for one of the harder tables (`invoices` is the canonical pick — every decision class fires on it). The student sees the empty `invoices` table being filled column by column inside `AnnotatedCode`, with each column's annotation being the *trigger* that drove the choice, not the syntax. Twelve annotations in order: `id` (UUIDv7, sortable, no cross-table guess-leak — Concept 6.2.5); `organizationId` (NOT NULL FK, `ON DELETE cascade` because invoices belong to the org — Concept 6.2.6); `customerId` (NOT NULL FK, `ON DELETE restrict` because customers shouldn't disappear under an invoice — same concept, different decision); `createdBy` (NOT NULL FK to `users`, `ON DELETE restrict` because the audit trail outlives the user); `number` (text, NOT NULL, scoped-unique with `organizationId`); `status` (`pgEnum`, NOT NULL, default `'draft'`); `total` (`numeric(12, 2)`, NOT NULL, with a `CHECK (total >= 0)` constraint); `currency` (text, default `'USD'` — names the multi-currency carve-out as out of scope); `issuedAt` / `dueAt` (`timestamptz`, NOT NULL); `createdAt` (`timestamptz`, default `now()`). At the bottom: the three indexes, each with the *query that demanded it* called out (composite `(organizationId, status, createdAt desc, id desc)` for the cursor list with status filter; the no-status variant; the `customerId` FK index). The student watches a senior author the table by deciding, and leaves with the reflex.

A second beat ships the misconception ambush for the easy mistake: `users` is the *one* table that doesn't carry `organizationId` (it's global — membership lives in `org_members`). The student is asked the trap question — *"every tenant-owned table carries `organizationId`. So `users` does too, right?"* — and the reveal lands the structural distinction: tenant-owned vs. global, and the membership table is the bridge.

**Engagement.** A `DrizzleSchemaCoding` exercise covering the `customers` table (smaller than `invoices`, same decision classes): the student writes the table from a one-paragraph spec ("organization-scoped customers; email is unique within the org; if the org goes away the customers go with it") and the grader checks the FK with the right `ON DELETE`, the composite unique on `(organizationId, email)`, and the NOT NULL flags. Wrong-answer feedback for `ON DELETE restrict` on the `organizationId` FK names the failure mode (offboarding an org would now block on its customers).

**Components.**
- `AnnotatedCode` walking the twelve-annotation `invoices` table authoring beat.
- `Figure` wrapping a hand SVG marking which of the six tables carries `organizationId` (five do, `users` doesn't, with `org_members` drawn as the bridge) for the trap-reveal.
- `DrizzleSchemaCoding` for the `customers` exercise.
- `Aside` (`tip`) below the authoring beat: "every column is a decision; the schema review is the seven-question pass on each decision, not on the syntax."

**Project link.** This concept *is* the build-by-decision posture for lesson 6.6.3 — the student authors the remaining five tables by walking the same per-column pause they watched on `invoices`.

---

## Concept 4 — Indexes earn their weight by being demanded by a query the project ships

**Why it's hard.** Two failure modes flank this concept. (1) **Over-indexing** — the junior reads "indexes make queries fast" and adds one to every column "just in case", paying write cost forever for queries the app never runs. (2) **Under-indexing** — the junior writes the cursor `where` and the cursor `orderBy` without thinking about the index, ships, and the production list query falls back to a `Seq Scan` + `Sort` at any real volume. The senior posture is the closed loop: each index in the schema corresponds to a query the project ships, and the column order of composite indexes is dictated by the `where` + `orderBy` of that query. Without the loop, the student writes indexes by feel.

**Ideal teaching artifact.** Decision archetype delivered as a **query-to-index audit table**. Three rows, one per index this project ships. Row one: the cursor list query *with* status filter (`where organizationId = ? and status = ?`, `order by createdAt desc, id desc`, `limit pageSize + 1`) → composite index `(organizationId, status, createdAt desc, id desc)`. Row two: the cursor list query *without* status filter (same shape minus status) → composite index `(organizationId, createdAt desc, id desc)`. Row three: the detail query's join (`from invoices where id = ? and organizationId = ?`, joined to `customers` on `customerId`) → the FK index on `customers.id` (the PK serves it) and an index on `invoices.customerId` for the reverse-direction join cases the inspector exercises. For each row, three annotation tracks: (a) the query the index serves, (b) the column order rationale (equality first, range/order second, tiebreaker last — the leftmost-prefix rule from 6.4 Concept 4 made concrete), (c) the failure mode if this index is missing or its column order is wrong (`Seq Scan` for the missing case; planner refuses the index for the wrong-order case). The audit table is the chapter's index-design discipline in one picture.

**Engagement.** A `MultipleChoice` round of three trap scenarios: (a) "a teammate's PR adds an index on `invoices.status` alone — should it ship?" → no, low cardinality, the composite already covers status-filtered queries through the leftmost prefix; (b) "the cursor's `orderBy` becomes `asc(createdAt), asc(id)` — does the existing composite index still serve it?" → yes, B-tree indexes can be scanned in either direction; (c) "a teammate adds a composite index on `(createdAt desc, id desc, organizationId)` for the same cursor query — does it serve?" → no, wrong column order, planner refuses for the org-scoped query. Wrong-answer feedback names the rule (selectivity, scan direction, leftmost-prefix) that drove the call.

**Components.**
- `Figure` wrapping a hand-coded HTML table for the three-row query-to-index audit, with the three annotation tracks per row.
- `MultipleChoice` reused three times for the trap-scenario round.
- `Aside` (`tip`) below: "every index in the schema points at a query the project ships; if you can't name the query, the index does not earn its weight."

**Project link.** This concept *is* the indexing pass for lesson 6.6.3's `invoices` table — the student writes the three indexes from this audit, and 6.6.6 verifies each one through `EXPLAIN ANALYZE`.

---

## Concept 5 — The seed is a determinism contract with a "drop to direct insert" escape valve

**Why it's hard.** Three things have to land together for the seed script to actually serve the project. (1) **Determinism + idempotency** — `reset(db, schema)` then `seed(db, schema, { seed: 1 }).refine(...)` produces byte-identical state across runs; the student's reflex when local data goes weird is `pnpm db:seed` without fear, and the inspector banner verifies it. (2) **The `with` per-parent gotcha** — `customers` with `count: 30` and `with: { invoices: 4-7 }` produces 120-210 invoices (per parent), not 4-7 total; the junior who misses this ships a seed that under-populates the cursor pagination test. (3) **The escape valve** — `drizzle-seed`'s declarative shape doesn't model overlapping memberships (one user in two orgs with different roles), so the senior pattern is to mix `seed().refine(...)` for the bulk shape with `db.insert(orgMembers).values([...])` for the targeted corrections. *Mixing both inside one script is the senior pattern, not the smell.*

**Ideal teaching artifact.** Pattern archetype delivered in two beats. **Beat one — the layered call-shape walk.** An `AnnotatedCode` over `scripts/seed.ts` with five annotations: (1) `reset(db, schema)` opens the script — idempotency contract; (2) `seed(db, schema, { seed: 1 })` — the determinism contract, the fixed seed number is the discipline; (3) `.refine(...)` per-table generators — `weightedRandom` for `status`, `valuesFromArray` for curated names, `count: 2` for `organizations`; (4) `with: { invoices: 4-7 }` on `customers` — annotated with the per-parent rule and the resulting math (30 × 4-7 = 120-210, not 4-7); (5) the post-seed `db.insert(orgMembers).values([...])` block — the escape valve, with the prose naming why: the seeder can't model "user 1 is owner of org A and admin of org B" cleanly, and the script drops to direct inserts for the shapes that don't fit. The student watches the script grow under the layers and sees the escape valve land as the senior pattern, not as a workaround.

**Beat two — the determinism proof.** A `Figure` shows two database snapshots side by side after two consecutive `pnpm db:seed` runs, with row counts and sample primary keys identical between them. The reflex lands: re-running the seed is safe, the dataset is reproducible, the inspector banner is the live verification.

**Engagement.** A `MultipleChoice` round of three traps: (a) "a teammate bumps `count: 30` to `count: 50` on `customers` without bumping the seed number — what's the smell?" → the determinism contract is broken silently; bumping the seed number signals the shift; (b) "a teammate adds 100 to the `count: 4-7` to get 100 invoices total — does it work?" → no, that's per-parent, the math is now 30 × 100 = 3000; (c) "the seeder can't produce overlapping `org_members` cleanly — what's the senior reach?" → drop to direct `db.insert` after the `seed()` call; mixing is the pattern. Wrong-answer feedback names the contract or the rule that fired.

**Components.**
- `AnnotatedCode` walking the five-annotation `scripts/seed.ts` layering for beat one.
- `Figure` wrapping a hand SVG of the two-snapshot determinism demo for beat two.
- `MultipleChoice` reused three times for the trap round.
- `Aside` (`note`) below beat one: "`with` is per parent; the escape valve is the senior pattern, not the smell."

**Project link.** This concept *is* the build-the-seed posture for lesson 6.6.4 — the student writes `scripts/seed.ts` from this layered shape, and the 6.6.6 Done-when check "idempotent seed" verifies the determinism property directly through the inspector banner.

---

## Concept 6 — The tenant guard lives in the `where`, not after the load

**Why it's hard.** This is the concept the chapter's structural rule rests on, the one the entire later `tenantDb` wrapper exists to enforce. The trap is the *load-then-check* shape: read the row, then verify `row.organizationId === currentOrgId`, return null if not. The shape works in dev, passes the inspector's happy-path test, and ships the failure mode that surfaces on the first audit — anyone with a valid invoice ID from any org reads the row's data because the data was loaded before the check fired (timing leak; possibly a logged row in an audit table; in a worse codebase, an actual return). The senior posture is structural: the `organizationId` check goes into the `where` clause itself, the database returns no row, the consumer sees `null`, and there is nothing to leak. The teaching has to install this as a *reflex at the keyboard* — not as a code-review discipline that gets skipped under deadline.

**Ideal teaching artifact.** Misconception-first ambush rendered as a **wrong-by-default detail query the student must repair**. The student is shown the inspector's `getInvoiceDetail` in its provided-but-broken form: `db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId), with: { lines: true, customer: true } })` followed by an `if (invoice.organizationId !== organizationId) return null` post-load check. The lesson asks the student to predict: *if a logged-in user of org A passes an `invoiceId` belonging to org B, what does the function return?* Most students will answer "null". The reveal: yes, the function returns null — but the row was *read from the database*. In a logging or audit context, the read is recorded against org A's session even though the row belongs to org B (the leak vector for any later observability layer); in a dev who copies this shape into a route handler that returns `200 + null` vs `404`, the existence of the invoice across tenants is enumerable through timing differences. The fix is one line: move `eq(invoices.organizationId, organizationId)` into the `where` clause via `and(...)`. The database returns no row; nothing leaks because nothing was read.

The artifact carries the assessment because the student must *make the change* — they edit the query, re-run the inspector with the cross-org URL, and confirm the detail panel shows the empty state instead of the "load and discard" path. Closing line: the tenant guard is a query-shape, not a post-condition. Unit 10's `tenantDb` wrapper enforces this structurally; this chapter installs the manual reflex so the wrapper has something to wrap.

**Engagement.** The wrong-by-default repair is the assessment. Confirm with a `MultipleChoice` after: *"a teammate's PR for a new `getCustomer(customerId)` query loads the customer, then checks `customer.organizationId === orgId` and returns null otherwise. The senior reviewer asks for what?"* — correct answer: move the org check into the `where`. Wrong answers map to common wrong reaches ("add a unit test for the cross-org case", "add a logging suppress for the not-matching case", "wrap the call in `try/catch`"), each named in the wrong-answer feedback as a *symptom mitigation, not a structural fix*.

**Components.**
- `CodeVariants` with two tabs ("guard after load — leaks", "guard in `where` — structural") rendering the same `getInvoiceDetail` in both forms, with a "row was read?" badge per tab.
- `PredictOutput` for the cross-org-URL prediction (predicted: null; actual: null but the row was read).
- `MultipleChoice` for the post-repair recall.
- `Aside` (`caution`) below: "load-then-check is the IDOR shape; the structural fix is `where: and(eq(organizationId, ...), eq(id, ...))`."

**Project link.** This concept *is* the load-bearing reflex for both queries in lesson 6.6.5, and one of the seven Done-when checks in 6.6.6 (the cross-org `invoiceId` test) verifies it directly. The forward-link to Unit 10's `tenantDb` lands here, not as foreshadowing but as the *reason* the manual discipline is worth installing first.

---

## Concept 7 — Cursor pagination shipped end-to-end: predicate, n+1, opaque cursor

**Why it's hard.** The student arrives at this lesson with the cursor concept installed (6.3.6 owned the predicate; 6.4.1 owned the index; 6.6.3 wrote the index in the schema). What's new is *integration*: the predicate, the `limit(pageSize + 1)` n+1 trick for the "has next page" affordance, the opaque base64 cursor encoding/decoding through Zod, and the inspector's URL state all have to wire together cleanly. The risk is partial application — student writes the predicate but skips the n+1 trick (uses a separate `count()` round-trip), or writes the predicate but reaches into the cursor's decoded shape outside the validator (bypasses the Zod boundary that protects against malformed input). The teaching has to walk the *complete* shape end-to-end, with each piece earning its place.

**Ideal teaching artifact.** Pattern archetype delivered as a **complete worked endpoint** with three annotation passes. The student sees the final `listInvoices` function, fully written, in `AnnotatedCode`. Pass one walks the *input* — `listInvoicesInputSchema.safeParse({ organizationId, status, cursor, pageSize })`, the cursor decoded via the provided `cursor.decode` (base64url → JSON → Zod), the failure mode if the parse is skipped (malformed cursor crashes the query). Pass two walks the *query* — the `where` AND-combining `eq(organizationId, ...)`, optional `eq(status, ...)`, and the cursor predicate `or(lt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), lt(id, c.id)))`; the `orderBy: [desc(createdAt), desc(id)]`; the `limit(pageSize + 1)`; the `with: { customer: true }` for the list cell's customer-name column (one query, not N+1, because the relational API expands `with` into a single SQL statement — Concept 8's substrate). Pass three walks the *output* — slice the first `pageSize` rows, encode `nextCursor` from the last returned row's `(createdAt, id)` if `rows.length > pageSize` else `null`, return `{ rows, nextCursor }`. Each annotation names the failure mode if the piece is missing: skip the n+1 trick → separate `count` round-trip; skip the slice → return one extra row to the client; skip the `with: { customer: true }` → render the list with N customer-name lookups in the consumer.

**Engagement.** A `DrizzleCoding` exercise scoped tighter than the full function: the student is given the input-validated `where` and asked to write the rest — `orderBy`, `limit(pageSize + 1)`, and the post-query slice + `nextCursor` calculation. The grader runs the query against a seeded fixture with a known page-2 boundary and verifies the right rows come back and the right `nextCursor` value is computed.

**Components.**
- `AnnotatedCode` walking the three annotation passes (input, query, output) on the complete `listInvoices` function.
- `DrizzleCoding` for the cursor-tail exercise.
- `Aside` (`note`) below: "the n+1 trick replaces a separate `count` round-trip with one extra row in the same query — the cheapest 'has next page' affordance Postgres affords."

**Project link.** This concept *is* the build-the-list-query posture for lesson 6.6.5 — the student writes `listInvoices` from this end-to-end pattern, and the 6.6.6 Done-when checks "paginates one org's invoices" and "`?status=paid` filters server-side" verify it through the inspector.

---

## Concept 8 — Single-round-trip detail via `with`: relational API as N+1-safe by construction

**Why it's hard.** The detail query is *one* read returning *one* invoice with its lines and its customer. The junior's reflex is three calls — `getInvoice(id)`, then `getCustomer(invoice.customerId)`, then `getLines(invoice.id)` — three round-trips, the canonical 1+N+1 shape, looking innocuous because the three function names read clean. The senior reflex is one call — `db.query.invoices.findFirst({ where, with: { lines: { orderBy: asc(position) }, customer: true } })` — single statement, nested typed result, one round-trip, verified through `EXPLAIN ANALYZE` in 6.6.6. The teaching has to make the *contrast* between the two shapes felt enough that the student's first reach for "load with relations" is `with`, not three function calls.

**Ideal teaching artifact.** Pattern archetype delivered as a **two-implementation contest** for the same product requirement. The student sees the requirement: *"one invoice with its line items (ordered by position) and its customer."* Tab one: hand-written three-call shape — `findFirst(invoice)`, await; `findFirst(customer)`, await; `findMany(lines)`, await; assemble into the nested result manually. The tab carries a 3-bar `RoundTripTrace` (reused from 6.3 Concept 9) underneath, with the round-trip-count badge reading "3". Tab two: `db.query.invoices.findFirst({ where: and(eq(id, ...), eq(organizationId, ...)), with: { lines: { orderBy: asc(position) }, customer: true } })`. The tab carries a 1-bar trace and a "1" badge. The senior call lands at the bottom: relational API is the default for tree-shaped reads; the three-call shape is the failure mode the relational API was built to prevent.

The closing beat names the *structural* property the relational API delivers: the SQL that hits the wire is one statement with subqueries that aggregate child rows into JSON arrays per parent — the planner sees the joins, the round-trip count is one regardless of how many child collections nest. This is what makes 6.6.6's "single round trip detail" Done-when check pass automatically once the `with` shape is correct.

**Engagement.** A `PredictOutput`-shaped recall: the student is shown the three-call hand-written shape and asked to predict the round-trip count for one detail load. Most will say "3". The reveal confirms 3, then loads the relational API equivalent and shows the count drop to 1. Confirm with a `MultipleChoice`: *"the structural property that makes `db.query.<table>.findFirst({ with: ... })` single-round-trip is"* → "it compiles to a single SQL statement with child-aggregating subqueries", with wrong answers naming common misconceptions (parallel `Promise.all` requests inside, request-scoped cache, dataloader batching).

**Components.**
- `CodeVariants` with two tabs ("three-call shape", "relational `with` shape") for the two-implementation contest.
- `RoundTripTrace` (reused from 6.3 Concept 9) — props: `traces` array with the 3-query trace and the 1-query trace for visual comparison. Confirms the component's anticipated forward-link from 6.3.
- `PredictOutput` for the round-trip-count recall.
- `MultipleChoice` for the structural-property confirmation.

**Project link.** This concept *is* the build-the-detail-query posture for lesson 6.6.5, and one of the seven Done-when checks in 6.6.6 ("detail loads in a single round trip") verifies it through the inspector's plan panel.

---

## Concept 9 — `EXPLAIN ANALYZE` is the proof step; "works in dev" is not evidence

**Why it's hard.** Two failure modes converge here. (1) The student writes the queries, the inspector renders the right rows, the page is fast, and the student calls it done — *because the demo works*. The query plan was never read; the index might not be used; `Seq Scan` could be hiding under the right answer at low data volume. (2) The student opens the plan panel, sees a wall of `Index Scan`, `Limit`, `Nested Loop`, and reads it as ambient information — they don't know which line names the index, which line proves the cursor's composite index was picked, which line would say `Seq Scan` if the index column order were wrong. The chapter's verification rests on the student being able to read the plan and *recognize* the load-bearing line, not just glance at it.

**Ideal teaching artifact.** Pattern archetype delivered as a **plan-reading rehearsal** on the inspector's plan panel. The student loads the inspector with `?orgId=...&status=paid&invoiceId=...`, expands the `<details>` plan panel, and sees the real `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` output for the cursor-list query and the detail query rendered in a `PlanTree` (reused from 6.4 Concept 8). The lesson walks the student through the load-bearing recognition for each plan: for the list query *with* status filter, the proof line is `Index Scan using invoices_org_status_created_id_idx on invoices` — the composite index name is *literally* in the plan output, and the column order in the index name should match the `where` + `orderBy` of the query. For the list query *without* status filter, the proof line is `Index Scan using invoices_org_created_id_idx`. For the detail query, the proof line is `Index Scan using invoices_pkey` joined to `customers` and `invoice_lines` in the *same* plan (one outer scan, joins flowing in, no separate plans). Three "if you see this instead, the failure is" callouts: `Seq Scan on invoices` → the right index isn't being picked, check column order; `Sort` step dominating → an index that produces the order is missing; multiple plan trees instead of one → the relational API didn't expand into one statement, the call site is wrong.

The closing line names the senior posture: `EXPLAIN ANALYZE` is the chapter's proof; *fast in dev* is not evidence because dev volume hides scan cost. The plan is the document the senior reads to confirm the discipline shipped intact.

**Engagement.** A `MultipleChoice` round of three plan snippets (rendered through `PlanTree`): for each, the student picks (a) which index is being used or whether none is, (b) whether the plan matches the query's intended shape, (c) the diagnostic if the plan is wrong. Trick item: a plan with `Index Scan using invoices_pkey` for the cursor query — the planner used the PK, scanned, sorted; the composite index isn't being picked, likely a column-order issue in the schema definition.

**Components.**
- `PlanTree` (reused from 6.4 Concept 8) — props: `plan` text, `highlightStep` for the proof line. Confirms the component's anticipated forward-link.
- `MultipleChoice` reused three times for the plan-snippet round.
- `Aside` (`tip`) below: "the index name is *in* the plan output; if you can't read which index served the query, you can't claim the index earned its weight."

**Project link.** This concept *is* the verification engine for lesson 6.6.6 — the Done-when checks "EXPLAIN ANALYZE on the detail query uses the right indexes" and "list query plan uses `invoices_org_status_created_id_idx`" rest entirely on the student being able to read the plan panel and name the proof line.

---

## Concept 10 — The Done-when rehearsal: verification is naming what would break without it

**Why it's hard.** Verification reads as bureaucracy until the student understands what it's *for*. Each of the seven Done-when clauses corresponds to a discipline that has a failure mode if skipped — clean migrate fails when the snapshot drifts; idempotent seed fails when state contaminates between runs; cursor pagination skips/duplicates rows when the tiebreaker is missing; server-side status filter leaks client-side filter logic if the URL doesn't preserve; cross-org tenant guard returns leaked rows if the guard is post-load; single-round-trip detail explodes into N+1s if `with` is missing; `EXPLAIN ANALYZE` fallbacks to `Seq Scan` if the index column order is wrong. The verify lesson's job is not to *check the boxes* but to *rehearse each failure* — to make the student feel what would have shipped if the discipline weren't installed. Without the rehearsal, the verify lesson is a checklist; with it, the student leaves the chapter knowing what a senior data layer guards against.

**Ideal teaching artifact.** Pattern archetype delivered as a **failure-rehearsal pass** through the seven Done-when clauses. For each clause, three beats: (1) *the verify step* — the action the student takes (e.g., "click 'Next page' three times against one org; confirm no row repeats"); (2) *the failure that would have shipped* — what the user would have seen if the discipline were missing (e.g., "a duplicate row at the page-2 boundary, invisible at low volume, surfacing as 'why is invoice INV-0042 appearing twice?' on a 200-invoice account"); (3) *the discipline that prevented it* — the named lesson and the structural rule (e.g., "Concept 7's tiebreaker — the cursor predicate's `and(eq(createdAt), lt(id))` half is what made the boundary clean"). The student walks the seven clauses, each as a small three-beat scrub, and leaves the lesson with the verify checklist *and* the failure-mode catalog the verification protects against.

The closing beat is the unit's senior posture distilled: schema is the source of truth, every tenant-owned read filters by `organizationId` in the `where`, cursor pagination requires the tiebreaker, indexes earn their weight by being demanded by a query the project ships, `EXPLAIN ANALYZE` is the proof step, seeds are deterministic and idempotent. Six rules, one chapter, foundation for the next four units. The forward references (Unit 7 actions on top, Unit 9 Better Auth swap, Unit 10 `tenantDb` wrapper, Unit 11 production list) close the chapter on the *cash-in graph* — what each later unit does *because* this chapter shipped the discipline.

**Engagement.** The rehearsal pass *is* the assessment — seven clauses, each scrubbed, each verified. Confirm with a `Sequence` drag-and-order drill: the student orders the seven Done-when clauses into the recommended verification order (clean migrate first because it gates everything, idempotent seed next, then the per-query checks, with `EXPLAIN ANALYZE` last because it's the proof of indexes the earlier checks demanded). Wrong-order feedback names the dependency that drove the order.

**Components.**
- `DiagramSequence` for the seven-clause failure-rehearsal scrub, each step rendering the three beats (verify step, failure that would have shipped, discipline that prevented it).
- `Sequence` for the Done-when ordering drill.
- `Aside` (`tip`) below the rehearsal: "verification is failure-mode rehearsal; the checklist is the visible artifact, the discipline is the invisible one."

**Project link.** This concept *is* lesson 6.6.6 — the verify lesson lives or dies on whether the student can name the failure mode each clause protects against, not on whether they can tick the box.

---

## Component proposals

None — the chapter ships entirely on existing components and on confirmed re-uses of components proposed in earlier chapters of Unit 6.

The chapter's reuse pattern is the load-bearing observation: every bespoke component proposal from 6.1–6.5 that was forward-linked to "the project" lands here as confirmation, not as a new build. `RoundTripTrace` (proposed in 6.3 Concept 9, forward-linked to N+1 work in 6.4 and 6.6) carries Concept 8's two-implementation contest. `PlanTree` (proposed in 6.4 Concept 8, forward-linked to query-tuning in later chapters and to "the project's verification") carries Concept 9's plan-reading rehearsal. The third bespoke component the unit produces — `IsolationLevelSim` (6.4 Concept 12) — is not used here because this chapter has no transactions; its forward-link is to 7.2.5 instead.

The remaining concepts each reach a strong fit with `Figure` + hand SVG, `AnnotatedCode`, `CodeVariants`, `DiagramSequence`, the live-coding components (`DrizzleSchemaCoding`, `DrizzleCoding`, `Dropdowns`), and the existing exercise components (`Buckets`, `Sequence`, `MultipleChoice`, `PredictOutput`). Concept 6's wrong-by-default detail query is structurally the same shape as 2.7 Concept 10's `SearchRaceLab` (a wrong-by-default sandbox the student must repair), but here the repair is a one-line code change inside the inspector's `getInvoiceDetail` — small enough that a `CodeVariants` + `PredictOutput` pairing carries it without a bespoke component. The pattern itself is worth naming as a recurring archetype the course will lean on (wrong-by-default repair as both artifact and assessment).

## Build priority

No new components to build. The chapter's build cost is *zero* — every artifact is either a static composition (`Figure`-wrapped hand SVG, `Figure`-wrapped HTML table, `AnnotatedCode` over real code, `CodeVariants` over two variants, `DiagramSequence` over scrubbable beats) or a re-use of a component the unit's earlier chapters already proposed (`RoundTripTrace`, `PlanTree`).

The forward-link confirmations that this chapter delivers are themselves a load-bearing signal for the unit's component-proposal discipline — each bespoke component proposed in 6.1–6.4 that reaches the project chapter validates the original single-use-discipline call. `RoundTripTrace` and `PlanTree` both clear the bar comfortably; both should be at the top of the unit's build queue precisely because they land twice in the unit (once at concept introduction, once at project verification).

## Open pedagogical questions

- Concept 6's wrong-by-default detail query (a guard-after-load shape the student must repair) is structurally the same archetype as 2.7 Concept 10's `SearchRaceLab` and several other "the artifact is the assessment" beats across the course. Worth deciding whether the course settles on a named archetype ("wrong-by-default repair") with shared authoring conventions, or whether each instance ships as a one-off `CodeVariants` + `PredictOutput` pairing.
- Concept 10's seven-clause failure-rehearsal scrub strains `DiagramSequence`'s slot model the same way 6.1 Concept 6's two-row sequence did — each step needs to render three sub-beats (verify step, failure, discipline). Confirm whether the existing component carries the three-beat layout or whether the rehearsal lives as a `Steps`-shaped vertical list with one expandable row per clause instead.
- Concept 1's cuts-and-carry-forwards table is the second instance in the unit (after 6.1 Concept 5's three-option DATABASE_URL comparison) of a "verdict table" shape that compares an in-scope choice against a deferred-to-later-chapter alternative. If this shape recurs across project chapters in later units, it may earn a small named composition (a `ScopeCuts` or `CarryForwards` table primitive) — flagging here so the pattern isn't reinvented per project chapter.
