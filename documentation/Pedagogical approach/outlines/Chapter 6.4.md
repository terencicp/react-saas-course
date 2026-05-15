# Chapter 6.4 — Indexes, plans, and transactions: pedagogical approach

## Concept 1 — What an index is mechanically: a sorted on-disk structure the planner *may* pick

**Why it's hard.** A returning dev knows "indexes make queries faster" the way they know "caching helps" — true, useless. Without the mental model — sorted structure, planner cost-estimate, write-side cost — the student treats every index as a free win and starts adding one to every column. The chapter cannot land its central claim ("indexes are a measured response, not preemptive") if the student doesn't first see the index as a *physical artifact with maintenance cost*, not as a config flag.

**Ideal teaching artifact.** Concept archetype rendered as a **two-state table-and-index visualization**. The student sees a small `invoices` table (twelve rows) drawn as an unsorted heap on the left and a B-tree index on `customerId` drawn on the right — boxes with the indexed values sorted, each pointing back at the heap row. A query `where customerId = 'cus_42'` is shown executing in two modes: (1) **no index** — the engine walks every row of the heap, twelve probes, the matched row highlighted at the end; (2) **with index** — the engine descends the tree in three jumps, fetches the heap row, two probes total. Then a second beat: an `insert` of a new invoice. Without the index, one heap append; with the index, one heap append *plus* one tree-insert. The maintenance cost lands as a visible second arrow, not as prose. Closing line: indexes don't change query results — only the path the engine takes to find them, and the path costs writes.

**Engagement.** A `TrueFalse` round of four statements after the visualization: *"adding an index changes the query result," "every `where` predicate benefits from an index," "a column with an index slows down `insert` on that table," "the planner always uses an index when one exists for the column."* Each false statement maps to a misconception the visualization just dispelled.

**Components.**
- `Figure` wrapping a hand SVG of the heap-plus-tree visualization, with the two query paths and the insert-cost arrow drawn inline. The artifact is one beat in one concept and has no credible forward-link as a bespoke component (the same shape appears in 6.4.3 only as a static figure, not a reusable widget); the SVG is the right scope.
- `TrueFalse` for the misconception round.
- Alternative: a small bespoke `IndexLookupViz` (props: `rows`, `query`, `mode: 'heap' | 'index'`) animating the probe count. Demoted because the static SVG carries the lesson and the component would be single-use.

**Project link.** Project 6.6.6's "EXPLAIN ANALYZE shows the right indexes" Done-when check rests on the student understanding what an index *does* before they verify which ones the planner uses.

---

## Concept 2 — The four senior triggers: indexes are a response to a read pattern, not preemptive

**Why it's hard.** Without a closed list of triggers, the student either over-indexes (every column "just in case") or under-indexes (waits for production to scream). The chapter's load-bearing claim is a small, named set: FK columns, selective `where`, `order by` keys matching cursor pagination, unique constraints — and *every other index waits for `EXPLAIN ANALYZE` to demand it*. The teaching has to install the four as a code-review reflex, not a memorized list.

**Ideal teaching artifact.** Decision archetype delivered as a **schema-walk audit**. The student sees the 6.6 invoice schema rendered as a small ER fragment with eight columns flagged across `invoices`, `org_members`, and `customers`. For each flagged column, the student picks one of: *FK index*, *selective `where` index*, *cursor `order by` index*, *unique index*, or *no index yet — wait for `EXPLAIN`*. After each pick, a one-line reveal names the trigger and (for the "no index yet" cases) the read pattern that hasn't shown up in scope. The trick item is `status` on `invoices` — a low-cardinality column where a plain B-tree loses to a sequential scan, but a *partial* index on `where status = 'pending'` earns its weight. The reveal threads forward to Concept 3. Closing rule: four triggers reach by default; everything else waits for evidence.

**Engagement.** The audit round is itself the assessment — eight calls, each scored. Confirm with a single `MultipleChoice` after: *"a teammate's PR adds an index on the boolean `is_archived` column. The senior reviewer asks for what?"* — correct answer names `EXPLAIN ANALYZE` evidence and suggests a partial index on the rare value if any.

**Components.**
- `Figure` wrapping a hand SVG of the schema fragment with the eight columns numbered.
- `MultipleChoice` reused eight times, one per flagged column, each with the trigger reveal in the wrong-answer feedback.
- `MultipleChoice` for the post-audit confirmation.
- `Aside` (`tip`) below the round listing the four triggers and the "wait for evidence" rule as a one-line reference.

**Project link.** The 6.6.3 lesson asks the student to ship FK indexes, the unique `(organizationId, externalId)` index, and the cursor composite. The student writes those four from this concept's audit, not from the project brief.

---

## Concept 3 — The index-type decision tree: B-tree as default, GIN/partial/expression as named reaches

**Why it's hard.** Postgres ships B-tree, GIN, GiST, SP-GiST, BRIN, and hash; any index can also be partial, composite, expression-based, or unique. The taught-as-survey approach drowns the student. The senior cut: B-tree for 95% of cases, GIN when the column itself is composite (`tsvector`, `jsonb`), partial when the predicate slices off most rows, expression when a function wraps the column. Everything else gets named for recognition and deferred. Without the cut, the student picks index types by which one they remember from the docs.

**Ideal teaching artifact.** Decision archetype rendered as a **trigger-first decision tree** plus a **reach catalog** at the bottom. The tree starts with the question *"what shape is the column?"* and branches: scalar value → B-tree (90% of reaches); `tsvector` for full-text → GIN; `jsonb` with `@>` queries → GIN with `jsonb_path_ops`; column wrapped in a function in the `where` → expression index, or promote to a generated column (link to 6.2.4); rare predicate value used in most queries → partial index; composite-key cursor pagination → composite B-tree (forward to Concept 4). Below the tree, a one-line catalog: BRIN (event logs past tens of millions of rows), GiST/SP-GiST (geometric), hash (B-tree usually wins) — each named once, deferred. The senior reflex lands at the bottom: *if the column is a scalar and you're not in the GIN cases, it's B-tree.*

**Engagement.** A `Buckets` sort: ten column-fact descriptions dropped into the index-type buckets — `tsvector` for invoice search → GIN; `customerId` FK → B-tree; `status = 'pending'` (5% of rows) → partial; `lower(email)` predicate → expression (or generated column); `(orgId, createdAt desc, id desc)` cursor → composite B-tree; `payload @> { type: 'paid' }` on `jsonb` → GIN with `jsonb_path_ops`; `is_archived` boolean (most rows true) → no index, or partial on the rare side; `userId` FK → B-tree; `createdAt` for time-series past 50M rows → BRIN (deferred); `email` for uniqueness → unique B-tree. Wrong-answer feedback names which axis (column shape, predicate selectivity, function wrapping) drove the call.

**Components.**
- `Figure` wrapping a hand SVG of the decision tree with the deferred-types catalog drawn as a footer strip. Single-use bespoke component is not warranted — the tree is a static teaching artifact, not a manipulable widget.
- `Buckets` for the ten-column sort.
- `Aside` (`note`) below: "B-tree until something on the trigger list says otherwise."

**Project link.** The 6.6.3 indexes are all B-tree (FKs + unique + composite cursor); the 6.6 schema doesn't ship a GIN or partial yet, but the student should be able to point at the `status` column and say *partial-on-pending if the listing query slows.*

---

## Concept 4 — Composite indexes and the leftmost-prefix rule

**Why it's hard.** Composite-index column order is one of the two places senior-vs-junior judgement compounds the most (the other is FK index reflex). The student writes `index().on(t.createdAt, t.organizationId)` and the planner ignores it for the `where org = ?` query, because the index is sorted by `createdAt` first. The leftmost-prefix rule reads as ceremony until you've seen the planner refuse the wrong-order index. The teaching has to make the *order* visible, not state it as a rule.

**Ideal teaching artifact.** Concept archetype rendered as a **two-index, three-query lookup table**. The student sees two composite indexes side by side: `index_a` on `(organizationId, createdAt desc, id desc)` and `index_b` on `(createdAt desc, organizationId, id desc)`. Below, three query shapes: (a) `where org = ? order by createdAt desc, id desc` (cursor pagination), (b) `where org = ? and createdAt > ?` (range filter on time), (c) `where createdAt > ?` (time-only filter). For each query, two badges show whether each index serves it. The asymmetry is stark: `index_a` serves all three; `index_b` serves only (c). The reveal: B-tree composite indexes are sorted left-to-right, and a query can only use the leftmost contiguous prefix of the index keys. The senior call lands as one rule — *equality predicate first, range/order key second, tiebreaker last* — with the cursor-pagination composite from 6.3.6 as the canonical shape.

**Engagement.** A `DrizzleSchemaCoding` exercise: the student is given an `events` table with `organizationId`, `eventType`, `occurredAt`, `id` and three queries the table must serve (org-scoped event-type filter, org-scoped time-range filter, global time-range scan). They write the smallest set of composite indexes that serves all three with the column order correct. The grader checks that each query's plan would use a real index (no `Seq Scan` smell) and rejects the over-index case (more indexes than needed).

**Components.**
- `Figure` wrapping a hand-coded HTML table for the two-index, three-query lookup grid. Single-use static composition; no bespoke component earns its weight.
- `DrizzleSchemaCoding` for the three-query exercise.
- `Aside` (`caution`) below: "the leftmost-prefix rule is structural — the planner cannot synthesize an index it doesn't have."

**Project link.** The 6.6.3 lesson ships exactly the canonical composite — `(organizationId, createdAt desc, id desc)` — for the cursor-paginated `listInvoices`. The student should be able to defend the column order from this concept, not from copy-paste.

---

## Concept 5 — `CREATE INDEX CONCURRENTLY`: the production-deploy reflex

**Why it's hard.** Adding an index to a hot table without `CONCURRENTLY` locks writes for the duration of the build — minutes on a million-row table, longer at scale. The migration runs in dev in 50ms and in production at noon takes 90 seconds during which every checkout fails. The student has never felt this; the lesson has to make the lock-out *concrete* enough that the production-deploy reflex installs as muscle memory in the migration review.

**Ideal teaching artifact.** Misconception-first ambush rendered as a **two-deploy timeline**. Two side-by-side deploy lanes for the same `CREATE INDEX invoices_pending_idx ...` statement against a 5M-row `invoices` table. Lane one (default `CREATE INDEX`): the timeline shows a `BEGIN` → `ACCESS EXCLUSIVE` lock acquired → 90 seconds of "build" → `COMMIT` → unlock. Below the lane, a parallel "incoming writes" strip shows three insert attempts queued during the build, each failing with a 30-second statement timeout. Lane two (`CREATE INDEX CONCURRENTLY`): two passes over the table, no `ACCESS EXCLUSIVE` lock, builds in ~3 minutes (longer wall-clock) but the writes-lane shows every insert succeeding. The trade is visible — wall-clock cost vs. write-availability — and the senior call is unambiguous: any index added to a table with material write traffic uses `CONCURRENTLY` in the migration. The Drizzle Kit hand-edit (it does not emit `CONCURRENTLY` by default) is named here and forwarded to 6.5.2.

**Engagement.** A `MultipleChoice` after the timeline: *"the migration `CREATE INDEX invoices_status_idx ON invoices (status);` is queued for the lunchtime deploy on a 5M-row table. The on-call senior asks for what change?"* — correct answer is the `CONCURRENTLY` hand-edit; wrong answers map to common deflections ("run it at midnight," "it's only 90 seconds," "raise the statement timeout").

**Components.**
- `Figure` wrapping a hand SVG of the two-deploy timeline, with the writes-lane drawn as a parallel strip per lane.
- `MultipleChoice` for the on-call recall.
- `Aside` (`caution`) below: "Drizzle Kit emits `CREATE INDEX`; the `CONCURRENTLY` hand-edit is a 6.5.2 reflex on every index migration to a hot table."

**Project link.** Project 6.6's `CREATE INDEX` migrations are run against a freshly-seeded local database (no concurrency cost), but the 6.6.6 Done-when checks include a forward-pointer to the `CONCURRENTLY` hand-edit the student would make in production.

---

## Concept 6 — The N+1 shape and why `Promise.all` doesn't fix it

**Why it's hard.** Two misconceptions compound here. First, the student doesn't recognize the *shape* — a loop or `Promise.all` over a per-row query reads like clean code, not a bug. Second, when N+1 is named, the student's first reach is `Promise.all` to "make them parallel," and the round-trip count *stays the same*. The teaching has to install both — pattern recognition for the shape, and the structural truth that parallelism is not a fix for round-trip count.

**Ideal teaching artifact.** Misconception-first ambush in two beats. **Beat one — the `Promise.all` ambush.** The student is shown a list page rendering 20 invoices, each with its line items. The "smart" code: `await Promise.all(invoices.map(inv => db.select().from(lineItems).where(eq(lineItems.invoiceId, inv.id))))`. The student is asked: *how many SQL statements hit the database?* Most will say "one — they're parallel." The reveal: 21 (one for the parent list, 20 for the children), in parallel from JS but 21 round-trips through the connection pool, 21 plans for the planner, the latency floor is the slowest of the batch — not one query's worth.

**Beat two — the four canonical shapes.** Below the ambush, a panel of four code snippets, each labeled with its smell: (1) sequential `for...of` with `await` inside; (2) `Promise.all` over a parameterized map; (3) RSC tree where each `<InvoiceCard id={inv.id} />` awaits its own query; (4) a `findMany` followed by per-row `findFirst`. The student reads them as four versions of the same bug, with the recognition heuristic at the bottom: *"is this query running once or once per row?"* If once per row, it's N+1, regardless of whether the code looks parallel.

**Engagement.** A `RoundTripTrace` (introduced in 6.3 Concept 9) renders the 21-bar trace under the ambush, with the round-trip-count badge as the punchline. Confirm with a `Buckets` sort after the four-shape panel: eight code sketches dropped into "N+1" or "fine" — the trick items include a `Promise.all` over *distinct* queries (fetch invoices, customers, and tags in parallel — fine), a `for...of` loop with no DB call inside (fine), and a `findMany` with `with: { lineItems: true }` (fine — relational API solves it).

**Components.**
- `PredictOutput` for the round-trip-count ambush.
- `RoundTripTrace` (reused from Chapter 6.3) — props: `traces` array with the 21-query `Promise.all` trace and the 1-query relational alternative for visual comparison. This concept is the canonical second use of the component named in 6.3 Concept 9.
- `CodeVariants` with four tabs (one per shape) for the panel of canonical N+1 forms.
- `Buckets` for the N+1-vs-fine sort.
- `Aside` (`note`) below: "`Promise.all` is correct when the queries are distinct; the smell is `Promise.all` over the same query shape parameterized by id."

**Project link.** Project 6.6.5's `getInvoiceDetail` is single-round-trip by construction — one of the seven Done-when checks (6.6.6) verifies it via query-log inspection. The student must be able to *name* the bug they're avoiding, not just write the right code.

---

## Concept 7 — The structural fix: relational API or join, never a cache

**Why it's hard.** Once the bug is named, the student's next wrong reach is *caching* — a request-scoped `cache()` wrapper, an `unstable_cache`, anything that hides the round-trip count from the user. The cache doesn't fix N+1; the database still ran N queries the first time, the cache still expires, the structural shape stays wrong. The fix is *one query, not N* — relational API for tree-shaped reads, hand-written join for irregular projections. The teaching has to install the structural-fix reflex *and* explicitly defuse the cache reach.

**Ideal teaching artifact.** Pattern archetype rendered as a **three-way contest** for the same product requirement: list 20 invoices each with their line items. Tab one: `Promise.all`-of-`findFirst` (the bug from Concept 6) with a request-scoped `cache()` wrapper added — the round-trip count is still 21 on first hit, then 0 on dev re-renders, and the badge says *"masked, not fixed."* Tab two: hand-written join with `db.select().from(invoices).leftJoin(lineItems, ...)` and client-side regrouping — 1 round-trip, flat result, regrouping code visible. Tab three: relational API `db.query.invoices.findMany({ with: { lineItems: true } })` — 1 round-trip, nested typed result, no regrouping. The senior call lands at the bottom: relational API for tree-shaped reads, hand-join when irregular projection or aggregate enters, *never* cache as the fix. The DataLoader pattern is named once in a sidebar (resolver-style codebases, not this stack) and deferred.

**Engagement.** A `CodeReview` exercise: the student is shown a four-call PR diff that includes (a) a `Promise.all`-over-`findFirst` with a `cache()` wrapper added "to fix N+1" — flag the masking; (b) a `findMany` with `with: { lineItems: true }` — correct, no flag; (c) a `Promise.all` over three distinct queries (invoices, customers, tags) — correct, no flag; (d) a hand-written join with regrouping for a list with aggregates — correct, no flag (irregular projection earns the join). AI grades against a four-rubric kernel.

**Components.**
- `CodeVariants` with three tabs (cache mask, hand-join, relational API) showing the same requirement in three implementations, with the round-trip-count badge per tab.
- `CodeReview` for the four-call PR.
- `Aside` (`caution`) below the contest: "cache is for cross-component reuse of the same query — never for collapsing N parameterized queries into one."

**Project link.** Project 6.6.5's `getInvoiceDetail` is the relational `findFirst` with `lines` and `customer` — the canonical shape this concept makes the student reach for first.

---

## Concept 8 — Reading the plan tree bottom-up + the node types worth recognizing

**Why it's hard.** `EXPLAIN ANALYZE` output is a wall of text the first time a junior reads it. They scan top-to-bottom (wrong direction), skip the node names, and can't tell a `Seq Scan` from a `Bitmap Heap Scan` from a `Nested Loop`. Without a reading reflex and a small recognition vocabulary, the diagnostic that the chapter calls "the only acceptable evidence" is unreadable, and the student falls back to feel.

**Ideal teaching artifact.** Concept archetype delivered in two paired beats. **Beat one — the bottom-up reading.** A real `EXPLAIN ANALYZE` output for the cursor-pagination query from 6.3.6 is rendered as text with each node visually grouped and numbered in execution order (bottom-most node = step 1). An animated annotation walks the tree bottom-up: *"step 1: the index scan on `invoices_org_created_id_idx` reads the matching rows; step 2: the result feeds the `Limit` node; step 3: rows return to the client."* The student watches the data flow upward through the tree. The reading-direction reflex lands as one line: *output is inverted; the bottom is what runs first.*

**Beat two — the recognition catalog.** A short cheat-sheet panel listing the eight node types the SaaS dev meets daily: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap Heap Scan` + `Bitmap Index Scan`, `Nested Loop`, `Hash Join`, `Sort`, `Aggregate` / `HashAggregate`. Each row carries one line of "what it means" and one line of "the smell to watch for" (e.g., `Seq Scan` on a large table with a `Filter` clause = missing index; `Sort` step dominating = add an index that produces the order). `CTE Scan` and `Subquery Scan` named at the bottom for recognition. The catalog is the recognition vocabulary; the student leaves with eight node names and one diagnostic per name.

**Engagement.** A `Buckets` sort: eight one-line plan-fragment descriptions dropped into the eight node-type buckets. Then a `MultipleChoice` round of three small plan snippets — for each, the student picks the node that's the bottleneck and names the diagnostic. (e.g., `Seq Scan ... rows=1.2M ... Filter: status = 'pending'` → missing index, add a partial.)

**Components.**
- New: `PlanTree` — props: `plan` (text or structured AST of the EXPLAIN output), `highlightStep` (step index for the walkthrough). Renders the `EXPLAIN ANALYZE` text with nested nodes visually grouped (indentation guides, numbered execution order), and an optional step-by-step highlight that walks the bottom-up reading. Pure static rendering — no live database. Plays the role for plans that `AnnotatedCode` plays for code.
- `Figure` wrapping a hand-coded HTML table for the eight-node recognition cheat-sheet.
- `Buckets` for the node-type sort.
- `MultipleChoice` reused three times for the bottleneck-recognition round.
- Alternative if `PlanTree` doesn't earn its weight: `AnnotatedCode` on the EXPLAIN output as if it were code, walking the steps as annotations. Loses the visual grouping of execution order but keeps the bottom-up walk.

**Project link.** Project 6.6.6's "EXPLAIN ANALYZE shows the right indexes" Done-when check requires the student to read the cursor-pagination plan and confirm the composite index is used — they need both the reading direction and the node-recognition vocabulary to pass it.

---

## Concept 9 — The numbers that matter: estimated vs. actual rows, loops, and buffer hits

**Why it's hard.** Even a student who can read the plan tree top-down (or bottom-up) often can't tell *which numbers move a decision*. Three measurements carry almost all the diagnostic load: (1) the gap between `rows` (estimated) and `actual rows` — large gaps signal stale stats or mis-estimation; (2) `loops=N` on the inner side of a join — the per-execution time multiplied by `loops` is the real cost, and high loop counts on a `Nested Loop` are the database-side N+1 shape; (3) `Buffers: shared hit=X read=Y` — read counts dominating means the data isn't in cache, often the difference between fast and slow on a hot query. Without the three-number lens, the student treats the plan as ambient information.

**Ideal teaching artifact.** Mechanics archetype delivered as a **three-plan diagnostic round**. The student is shown three real plan snippets in sequence, each with a different diagnostic: (1) **stale-stats plan** — `rows=10` estimated, `actual rows=120000`, the planner picked a `Nested Loop` that thrashes; the diagnosis is `ANALYZE invoices;` to refresh stats. (2) **N+1-shaped plan** — a `Nested Loop` with `(actual time=0.5..0.5 rows=20 loops=5000)` on the inner side; the per-loop time is small but `5000 × 0.5ms = 2.5s` is the real cost, and the fix is a `Hash Join` triggered by adding an index on the join key. (3) **cold-cache plan** — `Buffers: shared hit=12 read=4892` on a query that should be hot; the diagnosis is the index doesn't cover or the working set doesn't fit in `shared_buffers`. For each, the student is asked to *name the number that's the smoking gun* before the diagnosis is revealed. The student leaves with the three-number lens, not a survey.

**Engagement.** A `MultipleChoice` round (one per plan) where the student picks the diagnosis from four options before the reveal. Confirm with a `Buckets` sort after: six small plan fragments dropped into "stats stale", "high loop count", "cold cache", or "fine" — the trick item is a plan with `rows=1000 actual rows=1100` (within 10% — fine, not a stats issue).

**Components.**
- `PlanTree` (reused from Concept 8) renders the three plan snippets with the load-bearing number highlighted per snippet.
- `MultipleChoice` reused three times, one per plan.
- `Buckets` for the post-round generalization sort.
- `Aside` (`caution`) below: "`BUFFERS` numbers are per-execution — multiply by `loops=` for the real cost."

**Project link.** Not directly in 6.6's scope, but the diagnostic muscle is what the student reaches for the first time a 6.6 query is suspect — the Done-when check that runs `EXPLAIN ANALYZE` against the cursor-paginated list query (6.6.6) is the first time they apply the three-number lens.

---

## Concept 10 — Measure, hypothesize, verify — one change at a time

**Why it's hard.** The senior diagnostic loop — measure with `EXPLAIN ANALYZE`, hypothesize about which node is expensive and why, apply *one* change, re-run to verify the node changed — is invisible to a student who has only ever debugged by guessing and re-running. The trap: change two things at once (add an index *and* rewrite the query), see the wall-clock drop, ship — and not know which change did the work. The next time the query is slow, the student has no diagnostic muscle. The teaching has to make the *one-change discipline* feel like the cheap path, not the slow one.

**Ideal teaching artifact.** Pattern archetype delivered as a **scrubbable diagnostic loop** on a worked example. The starting query is the cursor-pagination read against `invoices` *without* the composite index from 6.4.1. Step 1 (measure): `EXPLAIN ANALYZE` shows a `Seq Scan` plus a `Sort`, total ~800ms on a seeded 100k-row table; the smoking gun (high `actual rows` discarded by `Filter`, `Sort Method: external merge` writing to disk) is highlighted. Step 2 (hypothesize): the bottleneck is the missing index that would produce the order — adding `(organizationId, createdAt desc, id desc)` should turn the `Sort` into a `nothing` and the `Seq Scan` into an `Index Scan`. Step 3 (apply one change): the index is added; *no* other change. Step 4 (verify): re-run `EXPLAIN ANALYZE`; the plan now shows `Index Scan` + `Limit` (no `Sort`), buffer reads collapse, total ~12ms. The student scrubs through the four steps; each step's plan is shown in full. A side panel narrates the one-change discipline at each tick.

The wrong-shape variant is shown after the correct loop: a developer who *also* rewrote the `where` clause and *also* changed the page size in the same commit; the wall-clock dropped, but the next query still has a `Sort` because the rewrite was the wrong fix and the index is what carried the win — the developer doesn't know that, because they changed three things. The discipline lands as economic, not as ceremony.

**Engagement.** A `Sequence` drag-and-order drill: six steps from a real diagnostic session (some correct one-change applications, some "changed two things at once" violations) ordered into the correct senior loop. The trick steps include "rewrote the query and re-ran without `EXPLAIN ANALYZE`" (skipped step 4) and "added two indexes in one commit" (violated step 3). A confirming `MultipleChoice` after: *"the query is now 60ms instead of 800ms after a commit that added an index, rewrote the predicate, and tweaked the page size. Which change did the work?"* — correct answer: *can't tell — the experiment was contaminated.*

**Components.**
- `DiagramSequence` (existing) wrapping a four-step scrub of the diagnostic loop, each step rendering the `EXPLAIN ANALYZE` output of that point in time (re-using `PlanTree` from Concept 8 inside each step).
- `Sequence` for the six-step ordering drill.
- `MultipleChoice` for the contaminated-experiment recall.
- `Aside` (`tip`) below: "two changes at once = one ruined experiment."

**Project link.** Project 6.6.6's index-verification Done-when is exactly this loop in miniature — `EXPLAIN ANALYZE` the query, observe the index-scan, declare done. The student should feel they're applying a named discipline, not following a checklist.

---

## Concept 11 — Transactions: the four triggers and the constraint-first reflex

**Why it's hard.** Transactions are the reach a junior either over-uses (every Server Action wrapped, even single-statement ones) or under-uses (multi-row writes shipped without a wrap and the production database goes inconsistent on the first partial failure). The four legitimate triggers — multi-row mutation, cross-row invariants, read-modify-write under contention, atomic state transitions — are the cut. Layered above the triggers is the *constraint-first reflex*: before reaching for a transaction-with-checks for a cross-row invariant, ask whether a `CHECK`, `UNIQUE`, `EXCLUSION`, or `FK` already handles it. The schema is the cheaper, always-on defense; the transaction is for what the schema can't express.

**Ideal teaching artifact.** Decision archetype rendered as a **trigger-audit walkthrough** plus a **constraint-versus-transaction beat**. The audit: six write scenarios from the 6.6 invoice domain, each presented with a one-line code shape: (a) insert one invoice; (b) insert one invoice + N line items; (c) move an invoice from `draft` to `sent` + emit an outbox row + bump `customer.lastActivityAt`; (d) decrement an org's invoice-credit balance and insert the invoice; (e) sum all line-item allocations and assert they equal the invoice total before commit; (f) bulk insert 200 line items from a CSV. The student picks *transaction needed* or *single statement is fine* per scenario. Reveals name the trigger (or the absence — (a) and (f) are single statements). Then the constraint-first beat: scenario (e) "sum-equals-total" is shown twice — once as a transaction with a `select sum(...) from line_items` then a comparison then commit-or-abort, and once as a `CHECK` constraint plus a generated total column that maintains the invariant by construction. The constraint version is shorter, faster, and can't be skipped by a future code path. Closing rule: schema first, transaction for what the schema can't catch.

**Engagement.** The audit is itself the assessment — six picks, each scored. Confirm with a `MultipleChoice` after: *"a teammate's PR wraps a single `db.update(invoices).set({ status: 'sent' }).where(eq(id, ?))` in `db.transaction(...)`. The senior reviewer asks for what?"* — correct answer: drop the transaction, single statements are atomic.

**Components.**
- `Figure` wrapping a hand SVG of the six-scenario audit panel, each scenario rendered as a one-line code sketch with a verdict slot.
- `MultipleChoice` reused six times, one per scenario.
- `CodeVariants` with two tabs ("transaction with check", "CHECK constraint + generated") for the constraint-first beat.
- `MultipleChoice` for the post-audit confirmation.
- `Aside` (`tip`) below: "before a transaction with a cross-row check, ask whether a constraint already says it."

**Project link.** Project 6.6 has no mutations in scope, but every write in Chapter 7.6 lands on this audit — the student wraps the multi-row mutations and skips the single-statement ones based on this concept's reflex.

---

## Concept 12 — Isolation levels, serialization-failure retries, and `FOR UPDATE`

**Why it's hard.** Three things have to land together. (1) The four isolation levels with the reach-trigger for each: `read committed` is the default (cheapest, right for most), `repeatable read` for snapshot-coherent multi-statement reports, `serializable` for invariants that can't be expressed as constraints. (2) Both higher levels can raise SQLSTATE 40001 (`serialization_failure`) on conflicting writes — the application must retry, with backoff, capped. (3) `SELECT ... FOR UPDATE` is the row-locking alternative when the workload is read-modify-write hot enough that retries thrash. Without all three, the student either picks `serializable` prophylactically (and ships random 500s under load) or sticks to `read committed` for everything (and ships subtle data-corruption bugs in cross-row workflows).

**Ideal teaching artifact.** Concept archetype delivered as a **two-lane concurrency simulator** rendered as a scrubbable timeline. The setup: two parallel transaction lanes, each running a balance-decrement workflow against the same row. The student picks an isolation level from a dropdown (`read committed`, `repeatable read`, `serializable`, `read committed` + `FOR UPDATE`) and scrubs through the timeline tick by tick.

- **`read committed`** — both lanes read the balance (100), both compute new value (90), both commit; the row ends at 90 and one decrement was lost (the lost-update anomaly is the load-bearing reveal).
- **`repeatable read`** — both lanes read the balance (100), lane A commits at 90; lane B's commit raises `serialization_failure (40001)`; the student sees the error and the timeline shows the retry that succeeds against the new snapshot.
- **`serializable`** — same outcome as repeatable read for this workload; the difference (predicate-level guarantees beyond row reads) is named in a sidebar.
- **`read committed` + `FOR UPDATE`** — lane A's `select ... for update` locks the row; lane B blocks at its `select ... for update` until A commits, then reads the new value (90) and computes 80; final value 80, no retry, no lost update. The lock-vs-retry trade is the punchline.

Below the simulator, the retry-helper shape lands as one block: a small wrapper that catches code 40001, retries up to three times with exponential backoff, surfaces a clean error after. The senior defaults: `read committed` is the default; reach for `repeatable read` for multi-table snapshot reports; reach for `serializable` only when invariants can't be constraints; reach for `FOR UPDATE` when the read-modify-write is hot enough that retries would thrash.

**Engagement.** The simulator carries the assessment — the student watches the lost-update appear and disappear under their fingers. Confirm with a `Buckets` sort after: six workload descriptions dropped into the four levels — *month-end report reading five tables coherently* → `repeatable read`; *audit assertion that no overlap exists in a booking system* → `serializable`; *bump a counter on every page view* → `read committed`; *transfer credits between two orgs* → `read committed` + `FOR UPDATE` (lock both rows, no retry); *list all invoices for an org* → no transaction needed; *daily roll-up over a hot table* → `repeatable read`. Wrong-answer feedback names the workload property that drove the call.

**Components.**
- New: `IsolationLevelSim` — props: `workload` (preset: balance-decrement, transfer-credits, etc.), `defaultLevel`. Renders two parallel transaction lanes, an isolation-level dropdown, a step-by-step scrubber, and a final-state badge per run (showing whether the lost-update happened, whether a retry fired, whether the lock blocked). Pure client state; no real database. The component carries the load-bearing reveal of this concept (you cannot teach lost-update without showing the interleaving) and forward-links to Chapter 7.2.5/7.2.9 (Server Action transactions) where the same concurrency questions resurface, and to Unit 12 (webhook idempotency, exactly-once writes) where the same reasoning applies to outbox patterns.
- `Buckets` for the workload-classification sort.
- `Code` block for the retry-helper.
- `Aside` (`caution`) below the simulator: "`serializable` without a retry wrapper surfaces as random user-facing 500s."
- Alternative if `IsolationLevelSim` doesn't ship: `DiagramSequence` with four scrub-states (one per isolation level) showing the same two-lane timeline with the outcome baked in per state. Loses the "pick a level and watch the outcome change" affordance; keeps the four outcomes visible.

**Project link.** Project 6.6 doesn't ship transactions, but Chapter 7.2.9 wraps Server Actions in transactions and the call shape lands here. The student writes their first `db.transaction({ isolationLevel: 'read committed' })` in 7.2 from this concept, not from copy-paste.

---

## Concept 13 — Pool starvation and the `db`-vs-`tx` discipline

**Why it's hard.** Two silent failure modes. (1) **Pool starvation** — PgBouncer transaction-mode (the Neon pooled URL from 6.1.4) holds a backend connection for the duration of the transaction. An `await fetch(...)` or any external IO inside `db.transaction(...)` keeps the connection checked out for hundreds of milliseconds; a traffic spike under that pattern empties the pool, and the next requests fail with `too many connections`. (2) **The `db`-vs-`tx` discipline** — a service function that captures `db` from module scope and runs queries against it from inside someone else's transaction silently runs *outside* that transaction. Isolation is gone, partial-failure state appears, and no error fires. Both are bugs that pass code review without a discipline named.

**Ideal teaching artifact.** Two-beat concept. **Beat one — pool starvation.** A reuse of `ConnectionPoolSim` from Chapter 6.1 (Concept 7), wired to a "long-running transaction" preset: the slider controls concurrent invocations, but each invocation now holds its connection for a configurable transaction duration (50ms baseline, 2s with an `await fetch` inside). The student watches the pool drain at low concurrency the moment the transaction duration jumps — the cap-breach happens at 20 concurrent invocations instead of 100. The reveal: external IO inside a transaction multiplies the effective connection-hold time by the IO latency, and the pool that scaled to 100 invocations now collapses at 20. The senior rule lands as one line: *never `await` external IO inside `db.transaction(...)`; do it before, do it after, never inside.*

**Beat two — the `db`-vs-`tx` discipline.** A code-review walkthrough of a service-function pattern: `createInvoiceWithLines(db, args)` versus `createInvoiceWithLines(args)` (which captures `db` from module scope). The student is shown the second form being called from inside a `db.transaction(async (tx) => { await createInvoiceWithLines(args); ... })` — the function's queries run on the outer pool, not on `tx`, the partial-failure scenario plays out (lines insert, outer transaction rolls back, lines stay), and no error fires. The fix is structural: every data-layer function takes the client (`db | tx`) as its first argument; the type signature `Database = typeof db | TransactionClient` enforces it. The discipline is named: *no service function captures `db` from module scope.*

**Engagement.** A `CodeReview` exercise with three diff hunks: (a) a Server Action with `await fetch('https://stripe.com/...')` inside `db.transaction(...)` — flag pool-starvation; (b) a service function `createInvoice(args)` that captures `db` and is called from inside a transaction — flag the missing `tx` parameter; (c) a Server Action that does external IO *before* the transaction and the database write *inside* — correct, no flag. AI grades against a three-rubric kernel.

**Components.**
- `ConnectionPoolSim` (reused from Chapter 6.1) with a new `transactionDurationMs` prop wired to the simulator's connection-hold time. Two-chapter reuse confirms the original component proposal's forward-link.
- `CodeVariants` with two tabs ("captures `db`", "takes client as parameter") showing the same service function in both forms, with the partial-failure timeline drawn beside each.
- `CodeReview` for the three-diff exercise.
- `Aside` (`caution`) below beat one: "transaction duration × concurrency = connection-hold; external IO inside multiplies both."
- `Aside` (`note`) below beat two: "service functions take the client as the first argument — `db.transaction` should never call a function that captures `db`."

**Project link.** Project 6.6 has no transactions in scope, but the data-layer service-function shape (`listInvoices(db, ...)`, `getInvoiceDetail(db, ...)`) is established here as a forward-loaded discipline — the student's 6.6.5 reads take `db` as the first argument, even though they don't yet need `tx`, so the pattern is in place when 7.6 introduces transaction-wrapped writes.

---

## Component proposals

- **`PlanTree`** — `EXPLAIN ANALYZE` plan renderer. Props: `plan` (text or structured AST of the plan output), optional `highlightStep` (numbered execution-order step to spotlight), optional `highlightNumbers` (array of `{ node, field }` for spotlighting load-bearing measurements like high `loops=` or large `actual rows`). Renders the plan text with nested nodes visually grouped (indentation guides, execution-order numbering bottom-up), with optional highlight overlays. Pure static rendering; no live database. Plays the role for plans that `AnnotatedCode` plays for code.
  - **Uses in this chapter** — Concepts 8, 9, 10 (used inside `DiagramSequence` for the diagnostic-loop scrub).
  - **Forward-links** — Chapter 6.5.2 (production-safe migrations) when `EXPLAIN`-ing a migration's lock-acquisition cost; potentially Chapter 11.x and Chapter 13 (production list patterns and CSV exports) when query-tuning is the lesson; potentially Chapter 23 (vector search) when reading `pgvector` index-scan plans. Three credible re-use points within this chapter alone, plus durable forward-links — clears the bar comfortably.
  - **Leanest v1** — render the plan text with bottom-up numbered guides on each node and a `highlightStep` prop that adds a single colored callout to one node. Drop `highlightNumbers` and the structured AST input — accept the raw `EXPLAIN` text as a string and parse only the indentation. The bottom-up numbering is the load-bearing affordance; everything else is polish.

- **`IsolationLevelSim`** — two-lane concurrency simulator. Props: `workload` (preset: `'balance-decrement'`, `'transfer-credits'`, etc., each defining the SQL each lane runs), `defaultLevel` (`'read committed'` | `'repeatable read'` | `'serializable'` | `'read committed + for update'`), optional `autoplay`. Renders two parallel transaction lanes, an isolation-level dropdown, a tick-by-tick scrubber, a per-tick "what each lane sees" panel, and a final-state badge per run (lost-update? retry fired? lock blocked?). Pure client state.
  - **Uses in this chapter** — Concept 12.
  - **Forward-links** — Chapter 7.2.5/7.2.9 (Server Action transactions) where the same concurrency questions resurface, and Chapter 12 (webhook idempotency, outbox patterns) where exactly-once writes lean on the same isolation reasoning. Two credible re-use points; clears the single-use bar.
  - **Leanest v1** — drop the multi-workload presets; ship with the balance-decrement workload only and the four isolation-level options. Drop the per-tick "what each lane sees" panel; show only the final-state badge (lost-update / retry / blocked / committed). The four-outcomes-under-one-control reveal is the load-bearing teaching; the per-tick narration is dramatization.

No other new components proposed. Concepts 1–5, 7, 11, 13 each reach a strong fit with `Figure` + hand SVG, `CodeVariants`, `AnnotatedCode`, the existing `DiagramSequence`, and the existing exercise components. Concept 6 reuses `RoundTripTrace` from Chapter 6.3 (its second canonical use, exactly as that chapter's component proposal anticipated). Concept 13's pool-starvation beat reuses `ConnectionPoolSim` from Chapter 6.1, validating that proposal's forward-link to "transactions and pool starvation."

## Build priority

`PlanTree` is the higher-leverage build. It carries three of this chapter's twelve concepts (8, 9, 10 — the entire 6.4.3 lesson on `EXPLAIN ANALYZE`), and the same renderer is the right shape for any later query-tuning beat in Chapters 6.5.2, 11.x, 13, and 23. The lean v1 (text + bottom-up numbering + a single-step highlight) is dramatically thinner than the full proposal and almost certainly enough — escalate to highlightable measurements only if the diagnostic-round playtesting shows the student missing the load-bearing numbers.

`IsolationLevelSim` is the second priority. It carries Concept 12 alone in this chapter but the lost-update reveal is *the* load-bearing teaching moment for transactions across the entire course — it's the one moment where the student feels concurrency, not just reads about it. The lean v1 (one workload, four levels, final-state badges only) is enough to land the four outcomes under one control. Build it before Chapter 7.2.5 cashes the isolation thread in for Server Actions.

Both proposals follow the chapter's own discipline: ship the smallest shape that does the work; escalate when the next chapter's reuse demands it.

## Open pedagogical questions

- Concept 8's `PlanTree` could ship as a generic `AnnotatedCode` over the EXPLAIN text on the cheap path — the cost is losing the visual grouping of execution order, which is the load-bearing affordance of bottom-up reading. Confirm with a quick playtest whether the indentation alone (no execution-order numbering) carries the lesson, or whether the bespoke renderer is the right scope from v1.
- Concept 12's `IsolationLevelSim` has overlap with the race-window timeline in 6.3 Concept 12 (the `onConflictDoUpdate` race) — both show two-lane interleaving with an isolation-level outcome. If the playtesting shows that 6.3's race-window simulator is also worth promoting from a `Figure`-wrapped SVG to a bespoke component, the two could share a `TwoLaneTimeline` substrate that `IsolationLevelSim` extends with the level dropdown and the locking variant.
- Concept 10's "scrubbable diagnostic loop" reuses `DiagramSequence` with `PlanTree` slotted into each step — confirm the existing component's slot model accepts a complex inner component (rather than just text/SVG) without layout strain. If not, the alternative is a `TabbedContent` with four tabs (one per loop step), losing the scrub affordance but keeping the per-step plans visible.
