# Chapter 039 — Indexes, plans, and transactions

## Chapter framing

Chapter 039 turns the queries from chapter 038 from "they run" into "they run fast and they don't corrupt data." Four senior reflexes earn their lessons: deciding which columns get indexes and which index type they get; spotting the N+1 query shape before it ships; reading an `EXPLAIN ANALYZE` plan well enough to act on it; and reaching for transactions with the right isolation level when atomicity or consistency is the question. No new schema artifacts beyond `index(...)` / `uniqueIndex(...)` declarations in `db/schema.ts`, no new query APIs beyond `db.transaction(...)` and `db.execute(sql\`explain ...\`)` — every lesson works against the schema from chapter 037 and the queries from chapter 038. The chapter sits between chapter 038 (what to write) and chapter 040 (how migrations ship the index DDL), and it's the source of the transaction thread lesson 5 of chapter 043 cashes in for Server Actions.

Threads that run through every lesson: indexes are a measured response to a read pattern, not preemptive; the four senior triggers for adding one are FK columns, `where` predicates that filter selectively, `order by` keys that match cursor pagination, and unique constraints — every other index waits for `EXPLAIN ANALYZE` to demand it; B-tree is the default and covers 95% of needs, GIN earns its weight for `tsvector` and `jsonb @>`, partial indexes earn theirs when the predicate slices off most rows, expression indexes when the query computes a value the index can pre-materialize; `EXPLAIN ANALYZE` with `BUFFERS` (on by default in Postgres 18) is the only acceptable evidence for an index decision — "feels slow" doesn't count; the relational query API (lesson 3 of chapter 038) solves N+1 by construction, so the N+1 conversation is about code that bypasses it (a `Promise.all` over per-row queries, a loop with `await` inside, an RSC tree where each card fetches its own data) — the fix is one query with a join or `with`, never a cache; transactions are for atomicity (all-or-nothing) and consistency (cross-row invariants), defaulting to `read committed`, with `repeatable read` for read-your-write-snapshot reports and `serializable` reserved for invariants that can't be expressed as constraints — both higher levels can raise serialization-failure errors the app must retry. The chapter ships four teaching lessons plus a quiz, ordered by dependency: indexes, N+1, plan reading, transactions, quiz.

---

## Lesson 1 — Indexes that earn their weight

Teaches the four senior triggers for adding an index (FK columns, selective `where`, `order by` keys, unique constraints), the index-type decision tree (B-tree default, GIN, partial, composite, expression, unique), how to declare them in Drizzle, and the write/disk cost that bounds when not to add one.

Topics to cover:

- **The senior question.** Given a Drizzle schema and a set of queries, which columns get indexes, what kind, and when? The lesson lands the four reach-for triggers (FKs, selective `where`, `order by`, unique constraints), the index-type decision tree (B-tree default, GIN for full-text and JSONB containment, partial when the predicate is selective, expression when the query computes), and the cost side (every index slows writes, takes disk, and consumes the planner's time).
- **The index mental model.** An index is a sorted on-disk structure that lets the engine find rows by key without scanning the whole table. The engine consults the planner; the planner picks an index if its cost estimate beats a sequential scan. Indexes don't change query results — only how the engine reaches them. Cost: every `insert`, `update`, and `delete` on an indexed column has to update the index too.
- **Declaring indexes in Drizzle.** Table-level third argument: `(t) => [index('invoices_org_id_idx').on(t.organizationId), uniqueIndex('invoices_external_id_unique').on(t.externalId)]`. Names are explicit — Drizzle Kit (chapter 040) emits them verbatim, naming collisions across schemas become real diagnostics. The convention: `<table>_<columns>_<kind>` (`invoices_created_at_idx`, `users_email_lower_unique`).
- **B-tree — the default, the workhorse.** Equality, range, and ordering on scalar columns. Sorted, supports `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `IS NOT NULL`, and `ORDER BY` in either direction. Drizzle's `index(...).on(col)` emits a B-tree by default. 95% of SaaS indexes are B-tree.
- **The four senior triggers — when an index earns its weight.**
  - **Foreign-key columns.** Postgres does not auto-index FK columns; a missing FK index turns cascade deletes and join probes into sequential scans. Every FK column gets a B-tree index by default. The course makes this a code-review reflex.
  - **Selective `where` predicates.** A column the planner can use to skip most of the table — `status = 'pending'` when 5% of rows are pending wins; `status = 'paid'` when 90% are paid loses to a sequential scan. The threshold is roughly 5-10% of the table; the planner decides via statistics (`ANALYZE`, auto-vacuum).
  - **`order by` keys that match cursor pagination.** The composite `(sortKey, tiebreaker)` index from lesson 6 of chapter 038, in the exact direction the query orders. Without it, the engine sorts the whole table per page.
  - **Unique constraints.** `.unique()` on a column already creates a unique B-tree index — never add a separate index for uniqueness.
- **Composite indexes — column order matters.** `index('invoices_org_created_id_idx').on(t.organizationId, desc(t.createdAt), desc(t.id))`. The leftmost-prefix rule: an index on `(a, b, c)` serves `where a = ?`, `where a = ? and b = ?`, `where a = ? and b = ? and c = ?`, and `order by a, b, c` — but not `where b = ?` alone. Senior call: put the equality predicate first, the range/order key second, the tiebreaker last. The cursor-pagination composite from lesson 6 of chapter 038 is the canonical shape.
- **Partial indexes — the predicate carve-out.** `index('invoices_pending_idx').on(t.createdAt).where(sql\`status = 'pending'\`)`. The index covers only rows matching the predicate — smaller, faster to maintain, and the planner uses it only when the query's `where` includes the same predicate. Reach when: most rows don't match the hot predicate (soft-delete filtering `where deleted_at is null`, status workflows where `pending` is rare, multi-tenant carve-outs that can't be a column).
- **Expression indexes — index a computed value.** `index('users_email_lower_idx').on(sql\`lower(${t.email})\`)`. The query `where lower(email) = ?` can now use the index. The senior signal: a `where` predicate wraps a column in a function (`lower`, `date_trunc`, a cast). The cleaner alternative is a generated column from lesson 4 of chapter 037 with a normal index on it — promote when the value is read often, expression-index when the value is one-off.
- **Unique indexes vs. unique constraints.** `.unique()` (lesson 7 of chapter 037) and `uniqueIndex(...)` are nearly equivalent — both create a unique B-tree. The differences: `uniqueIndex` supports a `where` clause (partial unique index — "one primary contact per org where `is_primary = true`"), `.unique()` does not. The partial unique is the senior reach for conditional uniqueness.
- **GIN indexes — named, owned by the columns that need them.** GIN is the generalized inverted index Postgres ships for composite-value columns. The two cases the course uses: `tsvector` columns for full-text search (`gin('search_vector_idx').on(t.searchVector)`, pairs with lesson 8 of chapter 038); `jsonb` columns for containment queries (`gin('events_payload_idx').on(t.payload)`, pairs with lesson 9 of chapter 038). Also covers arrays. Slower to write than B-tree but the only viable structure for these query shapes. The `jsonb_path_ops` operator class is a smaller, faster GIN variant when only `@>` containment is used — name it, use it.
- **BRIN — named for recognition.** Block-range indexes for very large, naturally-ordered columns (event logs ordered by `created_at`, time-series). Tiny on disk, useful past tens of millions of rows. Not a 2026 SaaS default reach — name and defer.
- **GiST, SP-GiST, hash — named once.** GiST for geometric and full-text alternatives; SP-GiST for partitioned geometric data; hash indexes are now crash-safe (Postgres 10+) but B-tree usually wins. None are reaches in this course.
- **`CREATE INDEX CONCURRENTLY` — the production lock-out story.** Adding an index on a hot table locks writes for the duration of the build unless `CONCURRENTLY` is used. Drizzle Kit (chapter 040) emits `CREATE INDEX` by default; the migration's hand-edit to add `CONCURRENTLY` is the production-deploy reflex. Course rule: any index added to a table with material write traffic uses `CONCURRENTLY` in the migration.
- **What an index does for free.** Primary keys are unique + indexed automatically. `.unique()` constraints are indexed. `references(...)` does not index — that's the missing FK index trap.
- **The cost of over-indexing.** Every index slows every write on that table. Every index takes disk. Every index complicates the planner's search space. The course default: ship the FK and unique indexes from day one (they're correctness-adjacent), add others only when `EXPLAIN ANALYZE` (lesson 3 of chapter 039) shows the query needs one.
- **Worked example — invoices.** FK indexes on `organizationId`, `customerId`. Unique index on `(organizationId, externalId)` for webhook idempotency (pairs with lesson 5 of chapter 038). Composite for cursor pagination: `(organizationId, createdAt desc, id desc)`. Partial for the hot pending-invoice query: `index(...).on(t.dueDate).where(sql\`status = 'pending'\`)`. GIN on the `tsvector` from lesson 8 of chapter 038 — wired here.
- **Watch-outs:** missing FK index is the most common performance bug in this stack — Postgres won't warn, cascade deletes silently become slow; composite-index column order matters and isn't symmetric — leftmost-prefix rule decides; partial indexes only serve queries whose `where` matches the index's `where` exactly — the planner is strict; indexes on low-cardinality columns (booleans, three-state enums) are usually worse than sequential scans — partial indexes are the rescue; adding an index in a migration without `CONCURRENTLY` locks writes — the production-deploy footgun; expression-index predicates must match the query's expression character-for-character — small wrappers (`coalesce`, casts) defeat reuse.

What this lesson does not cover:

- `EXPLAIN ANALYZE` for verifying the planner uses the index — lesson 3 of chapter 039.
- Drizzle Kit emitting the index DDL and the `CONCURRENTLY` hand-edit — lesson 1 of chapter 040.
- The cursor-pagination composite index in context — already in lesson 6 of chapter 038, restated here briefly.
- Generated columns as the cleaner alternative to expression indexes — lesson 4 of chapter 037 owns the mechanic.
- Index tuning at extreme scale (partitioning, sharding) — out of scope.
- Vector / `pgvector` HNSW indexes — Unit 22.

Estimated student time: 50 to 60 minutes. Load-bearing for every list query and every join in Units 6 through 23.

---

## Lesson 2 — Spotting and fixing N+1

Teaches the four canonical N+1 shapes (await-in-loop, `Promise.all` over a parameterized map, per-card RSC fetches, mixed `findMany`/`findFirst`), why `Promise.all` doesn't fix it, and the structural fix via the relational query API or a hand-written join.

Topics to cover:

- **The senior question.** When a list of N parent rows produces N+1 database round-trips, what's the code shape that caused it and what's the fix? The lesson lands the recognition pattern (a loop or `Promise.all` over per-row queries), the structural fix (one query with `with` or a join), and the senior reflex that catches the bug at code-review time.
- **The shape of the bug.** A page renders a list of invoices; each invoice needs its line items. Naive code: `await db.select().from(invoices)` returns N rows, then `await Promise.all(invoices.map(inv => db.select().from(lineItems).where(eq(lineItems.invoiceId, inv.id))))` issues N more queries. Total: N+1. Even with `Promise.all` parallelizing them, the database processes N+1 statements, the network handles N+1 round-trips, and the latency floor is the slowest of the batch — not one query's worth.
- **Why `Promise.all` doesn't fix it.** `Promise.all` parallelizes JavaScript awaits; it does not collapse database queries. The database still plans, parses, and executes N queries; the connection pool still pays N round-trips. The win over sequential `await` in a loop is real (parallel network), but the structural problem is unchanged. The course names this explicitly because it's a common junior misunderstanding.
- **The four canonical N+1 shapes in this stack.**
  - **Loop with `await` inside.** `for (const inv of invoices) { const items = await db.select()...; }` — sequential N+1, the worst form.
  - **`Promise.all` over a map.** Parallel N+1; faster than sequential but still N+1.
  - **RSC tree where each card fetches its own data.** `<InvoiceCard id={inv.id} />` and the card awaits its own query. Multiplies across the tree (Chapter 094 owns the RSC-waterfall analogy at depth).
  - **A `findMany` followed by a `findFirst` per row.** Mixed-API version of the same bug.
- **The structural fix — one query, not N.** Two shapes do the work:
  - **The relational query API (lesson 3 of chapter 038).** `db.query.invoices.findMany({ with: { lineItems: true } })` emits one SQL statement with a JSON-aggregated child array. Typed nested result. The senior default for tree-shaped reads.
  - **A join with `db.select` (lesson 2 of chapter 038).** When the projection is flat or aggregates enter, hand-write the join. Group the result in app code if the parent-with-children shape matters.
- **The `Promise.all`-of-distinct-queries clarification.** `Promise.all` is correct and senior when the queries are different — fetch invoices, customers, and tags concurrently for an unrelated page. The smell is `Promise.all` over the same query shape parameterized by id. Name the difference.
- **The cache is not the fix.** A request-scoped cache (React's `cache`, Next's `unstable_cache`) hides the N+1 from the user but doesn't fix it — the database still ran N queries the first time, the cache still expires, and the structural shape stays wrong. Cache is for cross-component reuse of the same query, not for collapsing N parameterized queries into one.
- **DataLoader — named, deferred.** The DataLoader pattern (batching `.load(id)` calls within a tick into one query) is the GraphQL world's answer. In a Server Component / Server Action codebase with Drizzle, the relational query API is the better tool — it solves the same problem at the query layer with full typing. DataLoader earns its weight in resolver-style codebases (GraphQL, tRPC routers with deep nesting). Named for recognition; the course does not teach it.
- **Spotting N+1 in code review — the heuristic.** Search for `Promise.all` and `for (const ... of ...)` near a `db.` call. Look for component trees where each leaf fetches. The reflexive question: "is this query running once or once per row?" If once per row, restructure to one query.
- **Verifying with the database — query logging.** Drizzle's `logger: true` option on the client logs every emitted SQL statement. Turning it on in dev surfaces N+1 visually — N near-identical statements in a row. The course wires this in chapter 040 setup; revisited here as the diagnostic.
- **The `EXPLAIN ANALYZE` connection.** Plan-level work doesn't appear N times; the N+1 cost is round-trip latency and connection overhead, not per-query plan cost. The plan for any single query in the batch looks fine. That's why the bug is invisible to query-plan inspection alone — it lives at the call-site shape, not the SQL.
- **The N+1 reflex in Server Components — foreshadowed.** Chapter 094 (the RSC waterfall lesson) cashes in this thread for the component-tree version of the same problem: parallel data needs decided at one layer, not at each leaf. Named here, owned there.
- **Worked example — fix in place.** Show the broken version (the `Promise.all`-over-map), the relational-API rewrite (`db.query.invoices.findMany({ with: { lineItems: true } })`), the inferred-type win (no hand-written `InvoiceWithItems`), the round-trip count drop from 21 to 1 in a 20-invoice page.
- **Watch-outs:** `Promise.all` looks fast and clean, which is what makes the bug hard to see — the heuristic is "is this map issuing the same query with different ids?", not "is the code sync or parallel"; the relational API can over-fetch — wide `with` trees pull child arrays even when only one field is needed (use `columns: { ... }` projection); request-scoped caches mask N+1 in dev when the same component renders twice and only the first hit pays — the metric is statements-per-render, not statements-per-user; dropping `with` for performance and re-introducing N+1 manually is a regression — re-shape the data instead; in a list page, an N+1 across 20 rows is fine until production scales it to 500 — design for the load, not for the dev sample.

What this lesson does not cover:

- The relational query API mechanics — lesson 3 of chapter 038.
- Joins as the flat alternative to `with` — lesson 2 of chapter 038.
- The RSC waterfall at the component-tree layer — Chapter 094.
- DataLoader patterns at depth — out of scope.
- Caching strategies for cross-component query reuse — Chapter 033 covers `cache` and `use cache`.
- Plan inspection — lesson 3 of chapter 039.

Estimated student time: 35 to 45 minutes. Load-bearing for every list-and-detail page in the course.

---

## Lesson 3 — Reading EXPLAIN ANALYZE

Teaches how to run `EXPLAIN (ANALYZE, BUFFERS)` through Drizzle, read the plan tree bottom-up, interpret the node types (`Seq Scan`, `Index Scan`, `Nested Loop`, `Hash Join`, `Sort`) and the numbers that matter (estimated vs. actual rows, loop counts, buffer hits), and run the measure-hypothesize-verify loop one change at a time.

Topics to cover:

- **The senior question.** When a query is slow, what does the database say about why? `EXPLAIN ANALYZE` is the only acceptable evidence — feel, benchmark wall-clock alone, or "looks fine on my dev sample" don't count. The lesson teaches what to ask the planner, how to read the answer, and which numbers move a decision.
- **`EXPLAIN` vs. `EXPLAIN ANALYZE`.** `EXPLAIN` prints the plan the planner would use, with cost estimates. `EXPLAIN ANALYZE` actually runs the query and prints the plan with real timings and row counts alongside the estimates. The senior reaches for `ANALYZE` — estimated cost without actual rows is half the picture; the discrepancy between estimated and actual is often the bug.
- **Running it through Drizzle.** `await db.execute(sql\`explain analyze ${sql.raw(builtQuery)}\`)` is the awkward path; the cleaner reach is `db.execute(sql\`explain (analyze, format text) <hand-written query>\`)` for spot diagnosis, or the Neon/Postgres dashboard's "explain" affordance, or Drizzle Studio (lesson 1 of chapter 040). The course's reflex: copy the SQL Drizzle logs (`logger: true`), prefix it with `explain (analyze, buffers, format text)`, run it in a `psql` or Neon SQL console.
- **The `BUFFERS` option — on by default in Postgres 18.** `BUFFERS` adds shared/local/temp block hit-and-read counts to every node. Postgres 18 (the course's target) turns it on automatically with `ANALYZE`; on older Postgres versions explicit `(analyze, buffers)` is needed. The numbers tell whether the data came from RAM (shared hit) or disk (shared read) — a cache miss is often the difference between fast and slow.
- **The plan tree — bottom-up reading.** Postgres outputs an inverted tree: the bottom-most node executes first, its output feeds the parent. Each node has a name (`Seq Scan`, `Index Scan`, `Bitmap Heap Scan`, `Nested Loop`, `Hash Join`, `Sort`, `Aggregate`), an estimated cost range, actual time and row counts, and per-node buffer numbers when `BUFFERS` is on. Senior reflex: read bottom-to-top, track row counts, look for the node that loses orders of magnitude.
- **The numbers that matter.**
  - **`actual rows` vs. `rows` (estimated).** Off by more than 10x means the planner's statistics are stale or the predicate is too complex for the planner to estimate. Run `ANALYZE <table>;` and re-check; if still off, the query may need restructuring.
  - **`actual time` per node, looped.** `(actual time=0.01..0.04 rows=20 loops=50)` means the node executed 50 times — the loop count multiplied by the per-execution time is the real cost. Common N+1 shape inside a nested loop.
  - **Buffer hits vs. reads.** `Buffers: shared hit=120 read=8` — 120 blocks from cache, 8 from disk. Most reads coming from disk on a hot query says the data isn't fitting in `shared_buffers` or the index doesn't cover.
- **The node types the SaaS dev meets daily.**
  - **`Seq Scan`** — full-table read. Fine for small tables; the smell when row count is large and a `where` should filter.
  - **`Index Scan`** — walks an index, fetches matching rows from the heap. The shape a B-tree predicate produces.
  - **`Index Only Scan`** — answers the query from the index alone, no heap fetch. Wins when the index includes every column the query needs (covering index). The senior reach when a query is hot enough to justify column duplication via the `INCLUDE` clause.
  - **`Bitmap Heap Scan` + `Bitmap Index Scan`** — for multi-predicate queries that combine indexes; faster than two index scans when the bitmap is small.
  - **`Nested Loop` / `Hash Join` / `Merge Join`** — three join algorithms. Nested loop wins for small outer sets; hash join for medium-to-large equality joins; merge join for sorted inputs. The planner picks; the senior reads.
  - **`Sort` / `Aggregate` / `HashAggregate` / `GroupAggregate`** — the post-processing stages.
  - **`CTE Scan` / `Subquery Scan`** — CTE results and subqueries (lesson 7 of chapter 038).
- **The diagnoses — pattern-matching the plan.**
  - **`Seq Scan` on a large table with a `Filter` clause.** Missing or unused index — check the column, add or fix the index (lesson 1 of chapter 039).
  - **`Index Scan` returning many more rows than the predicate selects.** The index is being used but isn't selective enough — composite index might help.
  - **`Sort` step that takes most of the time.** Sort spill to disk (`Sort Method: external merge`) — add an index that produces the order, or `work_mem` is too low (DBA-side fix).
  - **`Nested Loop` with high `loops=` count on the inner side.** Classic N+1-shaped plan when joins go bad — different from app-level N+1 but the same shape on the database side.
  - **`Rows Removed by Filter` very high.** Index could be partial — the engine is reading rows just to throw them away.
  - **`Bitmap Heap Scan` recheck cost dominating.** Bitmap recheck means the heap was visited; consider a covering index.
- **`auto_explain` — the production diagnostic.** A Postgres extension that logs slow-query plans automatically (`auto_explain.log_min_duration = '500ms'`). Named for recognition — production-config concern, not in the course's hands-on but the senior knows it exists.
- **The pipeline — measure, hypothesize, verify.** Senior loop: (1) run `EXPLAIN ANALYZE` on the slow query, (2) form a hypothesis about which node is expensive and why, (3) apply one change (index, query rewrite, restructure), (4) re-run `EXPLAIN ANALYZE` and verify the node changed. Changing two things at once destroys the signal.
- **The dev-vs-prod data trap.** Plans on a 100-row dev table tell you nothing about the 10-million-row production plan. The planner picks different strategies at different sizes. Senior reflex: seed dev with realistic volumes (the seed lesson, lesson 2 of chapter 040) or run `EXPLAIN ANALYZE` against a production-shaped Neon branch.
- **Worked example.** Take the cursor-pagination query from lesson 6 of chapter 038. Show its plan without the composite index (sequential scan + sort), add the index from lesson 1 of chapter 039, show the new plan (index scan, no sort, two orders of magnitude faster). Compare buffer numbers — the disk-read drop is the punchline.
- **Watch-outs:** `EXPLAIN ANALYZE` runs the query for real — never on a destructive statement (use `BEGIN; ... ROLLBACK;` or `EXPLAIN` without `ANALYZE`); estimated row counts off by orders of magnitude usually mean stats are stale (`ANALYZE <table>;` refreshes them, auto-vacuum does too on a schedule); a plan that looks great on 100 rows can flip strategy past 100k — verify on production-volume data; the planner is conservative — sometimes the "obvious" index isn't picked because the cost model thinks a scan is cheaper; `BUFFERS` numbers are per-execution, not cumulative across `loops=` — multiply for the real cost.

What this lesson does not cover:

- Index types and when to add which — lesson 1 of chapter 039.
- Application-level N+1 (round-trip count, not plan shape) — lesson 2 of chapter 039.
- Query rewriting techniques at depth — case-by-case, not a course-wide topic.
- Postgres configuration tuning (`shared_buffers`, `work_mem`) — DBA-side, out of scope.
- Production query-monitoring tools (pganalyze, Datadog) — named, deferred.

Estimated student time: 45 to 55 minutes. Load-bearing as the diagnostic skill any senior reaches for when a query is suspect.

---

## Lesson 4 — Transactions and isolation levels

Teaches the `db.transaction(async (tx) => …)` shape, the four senior triggers for a transaction, the four Postgres isolation levels with their SaaS use cases, the SQLSTATE 40001 retry pattern, `SELECT ... FOR UPDATE` for row locking, and the pool-starvation rule that keeps external IO outside the transaction.

Topics to cover:

- **The senior question.** When does a multi-statement write need atomicity, and which isolation level does the work? The lesson lands the `db.transaction(async (tx) => …)` shape, the four Postgres isolation levels with the SaaS triggers for each, the retry pattern for the higher two, and the boundary with what database constraints already handle.
- **What a transaction guarantees — ACID, restated briefly.** Atomicity (all-or-nothing), Consistency (constraints hold at commit), Isolation (concurrent transactions see a coherent view), Durability (committed writes survive crashes). The senior question is mostly about isolation; atomicity is the always-on baseline.
- **The Drizzle shape — `db.transaction`.** `await db.transaction(async (tx) => { await tx.insert(...).values(...); await tx.update(...).set(...).where(...); })`. Every query inside the callback uses `tx` instead of `db`; mixing `db` calls inside leaks to the outer connection and breaks isolation. The transaction commits when the callback returns; throwing rolls it back. The senior reflex: `tx` shadows `db` inside the closure — the linter or naming convention catches mixed use.
- **When to reach for a transaction — the four triggers.**
  - **Multi-row mutation that must all succeed or all fail.** Invoice + line items in one write; team-create + first-member insert; user signup with profile + organization row.
  - **Cross-row invariants the schema can't express.** "Sum of allocations across line items equals invoice total" — check before commit, abort if violated.
  - **Read-modify-write under contention.** Decrement a balance, increment a counter, allocate from a pool — the read inside the transaction must reflect the write that will follow.
  - **Atomic state transitions.** Move an invoice from `draft` to `sent` plus emit an outbox row plus update the customer's `lastActivityAt` — all-or-nothing.
- **When not to reach.** A single statement is already atomic; wrapping it adds overhead and a connection round-trip. Bulk inserts handled by `db.insert(...).values([...])` are one statement, no transaction needed. Read-only queries don't need transactions unless they span statements and need a consistent snapshot (then `repeatable read`).
- **The four isolation levels.**
  - **Read uncommitted** — Postgres treats it as read committed (no dirty reads ever). Named for compatibility; never the right answer.
  - **Read committed (default).** Each statement sees a snapshot of committed data at statement start. The cheapest level; the right default. Subject to non-repeatable reads (the same query twice in one transaction can return different rows) and phantom reads (a `where`-clause set can grow between queries).
  - **Repeatable read.** The whole transaction sees a snapshot taken at the first statement. Same query, same result throughout. Reach when a report or computation reads multiple tables and needs them coherent — month-end roll-ups, multi-table consistency checks. Can raise `serialization_failure` (SQLSTATE 40001) on conflicting writes — the app retries.
  - **Serializable.** Postgres guarantees the result is equivalent to some serial ordering of all concurrent transactions. The reach when cross-row invariants can't be expressed as constraints and read-modify-write under contention is the workload. Most expensive level; raises `serialization_failure` more often than repeatable read — retries are part of the call shape.
- **Setting the isolation level in Drizzle.** Second argument to `db.transaction`: `await db.transaction(async (tx) => { ... }, { isolationLevel: 'serializable', accessMode: 'read write', deferrable: false })`. Drizzle accepts the four strings. The course's defaults: `read committed` for most mutations, `repeatable read` for multi-statement reports, `serializable` reserved for the invariants case.
- **The serialization-failure retry.** Postgres raises SQLSTATE 40001 when it can't serialize the transaction at `repeatable read` or `serializable`. The app retries — usually two to three times with a small backoff. The retry wrapper is one helper: catch the specific error code, retry up to N times, surface a clean error after. The course names the helper, the production codebase ships it.
- **Unique-violation detection at the boundary.** Postgres raises SQLSTATE 23505 when a write hits a unique constraint or unique index (the duplicate-email signup, the second insert of a webhook event-id, a `(organizationId, externalId)` collision from lesson 5 of chapter 038). Drizzle/postgres-js surfaces these as catchable errors with a detectable code; the senior reflex is an `isUniqueViolation(e)` helper at the application boundary that checks the `code === '23505'` shape and maps to a typed result (e.g., a `Result.err('email_taken')` rather than a 500). Unlike 40001, this is not retried — it's a deterministic conflict the caller should surface. Server Actions in lesson 3 of chapter 043 cash in this helper for form-level error mapping.
- **`SELECT ... FOR UPDATE` — row-level locking inside a transaction.** When the workflow is "read this row, decide, then update it" and concurrent writers must wait, `for update` locks the rows the select returns until commit. Drizzle: `db.select().from(invoices).where(...).for('update')`. Reach when the read-modify-write is hot enough that retries (serializable) would thrash. Pairs with `read committed`; the lock does the serialization work the higher isolation level would.
- **The constraint-first reflex.** Before reaching for a transaction with cross-row checks, ask whether a `CHECK` constraint, a `UNIQUE` constraint, an `EXCLUSION` constraint, or a foreign key already handles it. The transaction is for invariants the schema can't express; the schema is the cheaper, always-on defense.
- **Transactions and Server Actions — foreshadowed.** lesson 5 of chapter 043 wraps Server Actions in transactions; the call shape lands here. The mental model: a Server Action that writes more than one row defaults to transaction-wrapped.
- **Transactions and connection pooling — the PgBouncer gotcha.** PgBouncer's transaction-mode pooling (the Neon pooled URL from lesson 4 of chapter 036) checks connections in for the duration of the transaction. Holding a transaction open for a slow operation (an external HTTP call, a user action) starves the pool. Senior reflex: keep transactions short; do external IO outside; never `await fetch(...)` inside `db.transaction`.
- **The `db` vs. `tx` discipline.** Functions called from inside a transaction must accept the `tx` (or a Drizzle client type that covers both). A service function that captures `db` from module scope and runs queries against it from inside someone else's transaction silently runs outside that transaction. Course pattern: every data-layer function takes `db: typeof db | typeof tx` as its first argument.
- **Savepoints and nested transactions.** Drizzle supports `tx.transaction(async (sub) => ...)` which emits `SAVEPOINT`. The inner failure rolls back to the savepoint, the outer continues. Reach: partial-failure handling inside a larger transaction (try a write, fall back to a different write if it fails). Brief mention; rare in practice.
- **Worked example.** An invoice-create Server Action: insert the invoice, insert N line items, update the customer's `lastActivityAt`, return the new invoice's id. Show the un-wrapped version (three statements, partial failure is a corrupted state), the transaction-wrapped version (atomic), the test that proves rollback works (throw inside the closure, verify no rows persisted).
- **Watch-outs:** mixing `db` and `tx` inside a transaction is the silent bug — writes go to the outer connection, isolation is gone, partial-failure state appears; long-running transactions starve the pool — never await external IO inside; `serializable` without retry logic surfaces as random user-facing 500s; serializable retry budgets that loop without backoff make contention worse, not better; `for update` locks rows until commit — a slow transaction blocks every other writer of those rows; the default `read committed` is correct for most cases — reaching for higher levels prophylactically costs throughput; `db.transaction` returns the callback's return value — that's the way to bring inserted ids out.

What this lesson does not cover:

- Wrapping Server Actions in transactions in context — lesson 5 of chapter 043.
- Outbox patterns for transactional messaging — Unit 11.
- Postgres concurrency at depth (MVCC internals, `vacuum`, bloat) — out of scope.
- Distributed transactions across services — out of scope; the course teaches the single-database default.
- `EXCLUSION` constraints — named for recognition, not at depth.
- Connection-pool sizing and tuning — lesson 4 of chapter 036 covers the driver decision.

Estimated student time: 50 to 60 minutes. Load-bearing for Chapter 043 (Server Actions) and every multi-step write in the course.

---

## Lesson 5 — Quizz

Top 10 topics to quiz:

- The four senior triggers for adding an index (FK columns, selective `where`, `order by` keys matching cursor pagination, unique constraints); B-tree as the default; the cost side (writes, disk, planner search space); why FK indexes aren't automatic and why the missing FK index is the most common performance bug.
- Composite-index column order and the leftmost-prefix rule; the canonical `(orgId, createdAt desc, id desc)` cursor-pagination shape; when partial indexes earn their weight (predicate slices off most rows); when expression indexes vs. generated columns are the right tool.
- GIN indexes for `tsvector` (paired with FTS in lesson 8 of chapter 038) and `jsonb @>` (paired with lesson 9 of chapter 038); the `jsonb_path_ops` variant when only containment is used; BRIN/GiST/SP-GiST/hash named for recognition; `CREATE INDEX CONCURRENTLY` as the production-deploy reflex.
- The N+1 query shape (loop with await, `Promise.all` over a parameterized map, per-card RSC fetches); why `Promise.all` doesn't fix N+1 (parallelizes JS, not the database); the relational query API and joins as the two structural fixes; the request-scoped cache is not the fix.
- DataLoader named and deferred (resolver-style codebases); Drizzle's `logger: true` as the dev diagnostic that surfaces N+1 visually; the RSC waterfall in Chapter 094 as the component-tree version of the same problem; the reflex "is this query running once or once per row?".
- `EXPLAIN` vs. `EXPLAIN ANALYZE`; `BUFFERS` on by default in Postgres 18; reading the plan bottom-up; the numbers that matter (`actual rows` vs. estimated, loop counts, buffer hits vs. reads); the senior measure-hypothesize-verify pipeline with one change at a time.
- The node types: `Seq Scan`, `Index Scan`, `Index Only Scan`, `Bitmap Heap Scan`, `Nested Loop`, `Hash Join`, `Sort`, `Aggregate`; the patterns to recognize (`Seq Scan` with `Filter` on a large table = missing index; high `loops=` on the inner side of a nested loop; `Sort` dominating); the dev-vs-prod data trap.
- The four ACID guarantees; the `db.transaction(async (tx) => …)` shape; the four senior triggers for transactions (multi-row mutation, cross-row invariants, read-modify-write under contention, atomic state transitions); the constraint-first reflex (use schema-level constraints before a transaction with checks).
- The four isolation levels (`read uncommitted` collapsed to `read committed` in Postgres; `read committed` as default; `repeatable read` for snapshot reports; `serializable` for invariants under contention); the serialization-failure (SQLSTATE 40001) retry pattern at the higher two; `SELECT ... FOR UPDATE` as the row-locking alternative.
- Transactions and connection pooling (PgBouncer transaction mode holds the connection for the duration); the no-external-IO-inside-transactions rule; the `db` vs. `tx` discipline (functions take the client type, never capture `db` from module scope); savepoints via nested `tx.transaction` named for recognition; the Server Action transaction wrap foreshadowed for lesson 5 of chapter 043.
