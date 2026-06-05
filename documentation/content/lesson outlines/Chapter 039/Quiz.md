sources:
  39.1: Indexes that earn their weight
  39.2: Spotting and fixing N+1
  39.3: Reading EXPLAIN ANALYZE
  39.4: Transactions and isolation levels

questions:
  - source: 39.1
    question: |
      You're reviewing a PR. A child table declares `invoiceId: integer().references(() => invoices.id)` and the page joins on it constantly, but there's no `index(...)` for that column. What's the senior call?
    choices:
      - text: |
          Add a B-tree index on `invoiceId` — `references(...)` creates the constraint but **not** an index, and the missing FK index silently degrades joins and cascade deletes at scale.
        correct: true
      - text: |
          Leave it — `references(...)` already creates an index on the foreign-key column, so a separate `index(...)` would just double the write cost.
        correct: false
      - text: |
          Wait for `EXPLAIN ANALYZE` to prove the join is slow before adding any index, the same as every other non-unique column.
        correct: false
    why: |
      Postgres indexes primary keys and `.unique()` columns automatically, but **not** foreign keys — `references(...)` is only a constraint. A missing FK index is the most common performance bug in this stack: it's invisible on a dev seed and turns joins and cascade deletes into sequential scans as the table grows. FK and unique indexes are the two you ship on day one without waiting for evidence, precisely because they're correctness-adjacent.

  - source: 39.1
    question: |
      You have a composite index on `(organizationId, createdAt, id)`. Which query can the planner serve from a *prefix* of this index?
    choices:
      - text: |
          `where organizationId = ? order by createdAt`
        correct: true
      - text: |
          `where createdAt = ?` on its own
        correct: false
      - text: |
          `where id = ?` on its own
        correct: false
    why: |
      The leftmost-prefix rule: an index on `(a, b, c)` serves queries that use a prefix from the left — `a`, then `a + b`, then `a + b + c`, and ordering in that sequence. `createdAt` and `id` are only sorted *within* each `organizationId` group, never globally, so a query that filters on one of them alone can't use the index. That's why the equality column (the tenant column) leads the composite.

  - source: 39.1
    question: |
      A table takes ~10,000 inserts/minute. An admin report run a few times a day filters `where status = 'archived'`, and `archived` is only 0.5% of rows. What index earns its weight?
    choices:
      - text: |
          A partial index on the report's column with `.where(sql`status = 'archived'`)` — it serves the rare slice the report's predicate matches exactly, yet only updates when a row enters or leaves `archived`.
        correct: true
      - text: |
          A plain B-tree on `status` — it's the column being filtered, so indexing it directly is the most predictable choice.
        correct: false
      - text: |
          No index at all — let the report take the sequential scan since it runs only a few times a day.
        correct: false
    why: |
      A partial index threads the needle on a write-heavy table: it's a twentieth of the size, barely taxes the 10,000 inserts/minute, and the planner will use it because the report's `where` matches the index predicate exactly. A plain B-tree on a low-cardinality column like `status` pays the full write tax and the planner may ignore it as not selective enough. Skipping the index entirely leaves a hot table scanned end-to-end. (Write the predicate as a raw `sql` template, not `eq()`.)

  - source: 39.2
    question: |
      A page does `Promise.all(invoices.map((inv) => db.select().from(lineItems).where(eq(lineItems.invoiceId, inv.id))))`. Is this a real fix for the N+1, and why?
    choices:
      - text: |
          No — `Promise.all` parallelizes the JavaScript awaits but the database still plans and executes N separate statements, and the pool still pays N concurrent round-trips. It's parallel N+1, not a fix.
        correct: true
      - text: |
          Yes — running the child queries concurrently collapses them into a single round-trip, which is exactly what the relational query API does under the hood.
        correct: false
      - text: |
          Yes — `Promise.all` is the senior tool for this, and the only remaining risk is that it's slightly harder to read than a `for` loop.
        correct: false
    why: |
      `Promise.all` touches only the JavaScript layer — it does not collapse database queries. Postgres still receives N statements and the pool still serves N round-trips, now concurrently, which can even *starve the pool*. The fix is structural: one query via the relational API (`with`) or a join. `Promise.all` is correct only over *different* queries — the smell is the same query shape parameterized by an id.

  - source: 39.2
    question: |
      You suspect a list page has an N+1. Which diagnostic actually surfaces it?
    choices:
      - text: |
          Turn on `logger: true` and count statements per render — N+1 shows as a burst of near-identical statements differing only by the bound `$1`, `$2`, `$3`.
        correct: true
      - text: |
          Run `EXPLAIN ANALYZE` on the slow page — the plan will show the N child queries stacked inside a single node.
        correct: false
      - text: |
          Add a request-scoped cache and check whether the page speeds up — if it does, the N+1 is confirmed.
        correct: false
    why: |
      N+1 lives at the call site, not in any one query's plan — each individual statement has a perfectly healthy plan, so `EXPLAIN ANALYZE` is the wrong tool. You catch it by counting statements per *render* in the query log; the visual signature is identical statements differing only by the bound parameter. A cache merely hides the cost (and can even mask it in dev), so "it got faster with a cache" proves nothing about the underlying shape.

  - source: 39.3
    question: |
      A plan node reads `Index Scan ... (actual time=0.015..0.040 rows=180 loops=200)`. Why is this node's real cost much higher than the `0.040ms` it appears to show?
    choices:
      - text: |
          The time and rows are reported *per loop*, and `loops=200` means the node ran 200 times — so the honest cost is roughly 200 × 0.040ms, the database-side cousin of N+1.
        correct: true
      - text: |
          `actual time=0.015..0.040` is in seconds, not milliseconds, so the node actually took 40ms per execution.
        correct: false
      - text: |
          The `rows=180` estimate is stale, so the planner will re-run the node until the estimate matches reality.
        correct: false
    why: |
      Postgres reports per-loop figures and trusts you to multiply by `loops=`. A node that looks free at `0.040ms` is expensive at `loops=200` — about 8ms and 36,000 rows touched. A high `loops=` on the inner side of a nested loop is the database-side N+1 shape, and (unlike application N+1) the plan shows it plainly. Buffer counts are per-loop too.

  - source: 39.3
    question: |
      The disciplined diagnostic loop is: measure with `EXPLAIN (ANALYZE, BUFFERS)`, hypothesize the expensive node, apply a change, re-run and confirm. Why does the loop insist on changing *exactly one thing* per pass?
    choices:
      - text: |
          Change two things at once and you've destroyed the signal — when the query speeds up you can't say which change did it, and you may ship a useless second index that taxes every write forever.
        correct: true
      - text: |
          Postgres can only refresh its statistics for one change at a time, so a second change in the same pass is silently ignored by the planner.
        correct: false
      - text: |
          Each `EXPLAIN ANALYZE` run resets the table's cache, so a second change would be measured against cold buffers and look artificially slow.
        correct: false
    why: |
      One change per pass is what separates a fix from cargo-cult tuning. If two changes land together and the query gets faster, you can't attribute the win — and you risk shipping an index that earns nothing while taxing every write to that table. Measure, hypothesize, change one thing, confirm the *predicted* node changed the way you predicted.

  - source: 39.4
    question: |
      A helper `getCustomer(id)` closes over the module-scope `db` and is called from inside a `db.transaction(async (tx) => ...)`. What's wrong?
    choices:
      - text: |
          The helper's query runs on a *different* pooled connection, outside the transaction — it can't see the transaction's uncommitted writes and won't roll back with it.
        correct: true
      - text: |
          Nothing — `db` and `tx` share the same underlying connection inside a transaction, so the helper participates correctly.
        correct: false
      - text: |
          The helper will deadlock, because two queries on the same connection can't run concurrently.
        correct: false
    why: |
      A transaction runs on one checked-out connection; a helper reaching for module-scope `db` goes out on a *separate* pooled connection, escaping the boundary entirely. It commits on its own, can't be rolled back with the group, and can't see uncommitted writes. This passes on a quiet dev machine and corrupts data in production. The fix is the course convention: every data-layer helper takes the client (`db | tx`) as its first argument.

  - source: 39.4
    question: |
      A nightly job reads `orders`, `refunds`, and `payouts` to build one reconciliation report. It writes nothing, but the three reads must reflect the same instant. Which isolation level fits?
    choices:
      - text: |
          `repeatable read` — the whole transaction reads from one snapshot, so all three queries agree on one moment; it's the cheapest level that gives that guarantee.
        correct: true
      - text: |
          `serializable` — only the strongest level can guarantee three reads see a consistent view of the data.
        correct: false
      - text: |
          `read committed` — the default is always correct for read-only work.
        correct: false
    why: |
      A multi-statement read that must be internally coherent is exactly what `repeatable read` provides: a single per-transaction snapshot. `read committed` re-snapshots per statement, so the three queries could each catch a different committed state. `serializable` defends an invariant against concurrent *writers* — there are none here, so you'd pay for protection you can't use.

  - source: 39.4
    question: |
      Both helpers catch a database error by SQLSTATE, but handle it oppositely. Match the correct response to each code.
    choices:
      - text: |
          `40001` (serialization failure) → retry the whole transaction; `23505` (unique violation) → don't retry, return a clean typed error to the user.
        correct: true
      - text: |
          `40001` → return a clean typed error; `23505` → retry the whole transaction up to three times with backoff.
        correct: false
      - text: |
          Both → retry the whole transaction with backoff, since both are transient concurrency conflicts.
        correct: false
    why: |
      `40001` is transient — Postgres couldn't order concurrent transactions, so retrying (with backoff, bounded) usually succeeds. `23505` is deterministic — the value already exists, so retrying reproduces the exact same conflict; the right move is to map it to a typed `err(...)` the UI can render, not a 500. Same `try/catch` instinct, opposite handling.

  - source: 39.4
    question: |
      Why is `await sendEmail(...)` inside a `db.transaction` callback a production hazard?
    choices:
      - text: |
          Transaction-mode pooling holds the connection for the whole transaction, so awaiting a network call keeps a pooled connection checked out for the round-trip; under load these stack up and starve the pool.
        correct: true
      - text: |
          The email send will be rolled back along with the database writes if the transaction aborts, so the customer never receives it.
        correct: false
      - text: |
          Drizzle forbids any `await` other than a query call inside a transaction callback and will throw at runtime.
        correct: false
    why: |
      In transaction-mode pooling a real connection is checked out for the entire transaction, not just per statement. Awaiting external IO inside the boundary holds that connection hostage for the network round-trip; dozens at once drain the pool and unrelated reads start timing out. Gather inputs before the transaction and fire side effects after it commits — which is also what keeps the transaction safely retryable.
