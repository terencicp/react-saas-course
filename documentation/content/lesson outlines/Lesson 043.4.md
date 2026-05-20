# Lesson 043.4 — Transactions and isolation levels

## Lesson framing

**The senior question this lesson answers.** When does a multi-statement write need atomicity, which isolation level does the work, and what does the call shape look like in Drizzle? End state: the student reaches for `db.transaction` when one of four triggers fires, picks the right isolation level for the workload, knows when to retry on SQLSTATE 40001 vs. surface SQLSTATE 23505, and never holds a transaction open across external IO.

**Target student.** Has just learned to write Drizzle queries (042) and to add indexes (043.1), spot N+1 (043.2), and read plans (043.3). They've seen multi-statement writes (insert invoice + insert line items) but always as two separate `await`s — the lesson lands the atomicity reflex.

**Pedagogical approach.**
- **Decisions before syntax.** Open with the broken multi-statement write (invoice + line items, second insert throws, half the data persists) — make the pain visceral before showing the wrapper. The senior reflex (the four triggers) gets named once, in a decision walker, so the student can re-derive it later.
- **Defaults before conditionals.** `read committed` is the default and right 95% of the time; `repeatable read` and `serializable` are conditional power tools introduced by their *trigger* (a snapshot report; an invariant that can't be a constraint).
- **Mental model first, then mechanics.** Use a sequence diagram for "what happens on commit / rollback" and a two-actor sequence for "what does isolation actually mean" (two concurrent transactions seeing different data). The student can re-imagine these any time.
- **Cognitive load.** Build complexity in layers: (1) the broken write, (2) `db.transaction` wraps it, (3) ACID restated briefly, (4) the four triggers (decision walker), (5) isolation levels (only once atomicity is solid), (6) the boundary errors (40001 retry vs. 23505 surface), (7) `FOR UPDATE` as the locking alternative, (8) the production rules (no external IO, `db` vs. `tx` discipline). Each layer adds one idea on top of the previous.
- **Pain points relieved.** Silent partial-failure states ("the invoice was created but the line items weren't, now the customer sees a $0 invoice"); flaky tests where two concurrent writes both succeed but the invariant breaks; production 500s from unhandled 40001s; PgBouncer pool starvation from a long-running transaction.
- **Beginner traps to surface.** Calling `db.x()` inside a `tx => ...` callback (silently leaks out). Awaiting an HTTP call inside the transaction (pool starvation). Reaching for `serializable` prophylactically (kills throughput). Treating 23505 the same as 40001 (retry loops on a deterministic conflict).
- **Production stakes.** The invoice example is the canonical SaaS shape — a multi-row write the user expects to be atomic. The customer charged but no line items recorded is real money lost.

## Lesson sections

### Introduction (no h2)

Open with the senior question framed as a concrete scenario: a Server Action creates an invoice — one row in `invoices`, N rows in `invoice_line_items`, plus an update to `customers.lastActivityAt`. If the second `await` throws after the first succeeds, the database now holds half the truth. Name the lesson's deliverable: by the end the student will reach for `db.transaction(async (tx) => …)` reflexively, pick an isolation level by trigger not by feel, and know which boundary errors retry vs. which surface.

Connect to prior knowledge: 042 taught the queries, 043.1-3 made them fast — this lesson keeps multi-statement writes correct under concurrency and failure. Foreshadow 047 lightly (Server Actions will default to transaction-wrapped writes) without owning that mechanic here.

### The broken multi-statement write

Goal: make the pain concrete before the cure. One `CodeVariants` block with two tabs:

- **Tab "Broken — three separate writes"** — sequential `await db.insert(invoices)...`, then `await db.insert(invoiceLineItems)...`, then `await db.update(customers)...`. Annotate that if the second statement throws (FK violation, unique conflict, network blip), the invoice row stays committed and the customer sees garbage state.
- **Tab "Fixed — one transaction"** — same logic wrapped in `await db.transaction(async (tx) => { ... })` using `tx` for every statement. Annotate that throwing inside the callback rolls back all three; returning commits all three.

Below the variants, a short prose paragraph naming the guarantee: a transaction is a *single unit of work* the database commits or rolls back as a whole. Code uses Drizzle, schema implied from 041/042.

### What a transaction guarantees — ACID at one paragraph each

Brief restatement, not a deep dive. Four short blocks (use a Starlight `CardGrid` for visual compactness):

- **Atomicity.** All-or-nothing. The lesson's main concern.
- **Consistency.** Constraints (`CHECK`, `UNIQUE`, FK) hold at commit. The schema does most of this work; the transaction lets the application add cross-row invariants the schema can't express.
- **Isolation.** Concurrent transactions see a coherent view of the database. The next section's whole topic.
- **Durability.** Once `commit` returns, the write survives a crash. Postgres' WAL handles this; the app doesn't think about it.

Aside (Starlight `Aside` type=note): "We're not teaching ACID for theory's sake — atomicity is what fixed the broken write, isolation is the next decision the lesson hands you."

### The `db.transaction` shape

`AnnotatedCode` block, four to five steps, walking the canonical shape:

```ts
const invoice = await db.transaction(async (tx) => {
  const [created] = await tx.insert(invoices).values(input).returning();
  await tx.insert(invoiceLineItems).values(linesFor(created.id));
  await tx.update(customers)
    .set({ lastActivityAt: new Date() })
    .where(eq(customers.id, input.customerId));
  return created;
});
```

Annotated steps:
1. `await db.transaction(async (tx) => { ... })` — the function passed receives a `tx` client that scopes every query to one Postgres transaction. The outer `await` resolves to the callback's return value.
2. `tx.insert(...).returning()` — `tx` is used everywhere `db` would be. The shadowing is intentional; the linter or naming convention catches mistakes.
3. The closure returns `created` — `db.transaction` resolves to whatever the callback returns. This is how inserted ids escape the transaction boundary.
4. Throwing anywhere inside the callback rolls back the transaction and propagates the error. Drizzle also exposes `tx.rollback()` which throws a sentinel exception that triggers `ROLLBACK` without surfacing as a caller-visible error — useful for explicit "abort the transaction but don't propagate" flows; the more common path is `throw new Error('reason')` which both rolls back and surfaces.

Below the annotated code, a short prose paragraph: the senior reflex is "`tx` shadows `db` inside this closure — if you see a bare `db.` call inside, that's a bug" (foreshadow the discipline section).

### Sequence diagram — commit vs. rollback

`TabbedContent` with two Mermaid `sequenceDiagram` panels.

- **Panel "Commit path"** — Actor: App. Participant: Postgres. Messages: `BEGIN`, `INSERT invoice`, `INSERT line items`, `UPDATE customer`, `COMMIT`, return value to app. Pedagogical goal: the student sees the wire protocol implied by `db.transaction` so the magic disappears.
- **Panel "Rollback path"** — same start, then `INSERT line items` returns an error, app `throw`s, Drizzle sends `ROLLBACK`, error propagates to caller. Goal: rollback is automatic on throw — no explicit call.

Wrapped in `<Figure>`, single shared caption: "Drizzle issues `BEGIN` on entry, `COMMIT` on clean return, `ROLLBACK` on any thrown error."

### When to reach for a transaction — the four triggers

Use the `StateMachineWalker` (kind="decision") to teach the four triggers as a senior-question funnel. The student walks the decision once; the diagram acts as a re-derivable checklist.

Decision tree shape:

- Root question: "Does this code path issue more than one write statement?"
  - "No, single statement" → Leaf "No transaction needed" (single statements are atomic by themselves; bulk inserts via `.values([...])` are one statement).
  - "Yes" → next question: "What's the relationship between the writes?"
    - "All-or-nothing — partial success would corrupt state" → Leaf "Transaction with `read committed` (default)" — e.g., invoice + line items, signup with profile + org row.
    - "There's a cross-row invariant the schema can't express" → Leaf "Transaction; consider `serializable` if under contention" — e.g., sum of line-item totals must equal the invoice total; allocating from a finite pool.
    - "I need to read a row, decide, then write it" → Leaf "Transaction; reach for `SELECT ... FOR UPDATE` or `serializable`" — read-modify-write under contention.
    - "I need a coherent snapshot across multiple read statements" → Leaf "Transaction with `repeatable read`" — month-end report, multi-table consistency check.

Reason bodies on each leaf explain *why* that level (briefly) and forward-reference the isolation-levels section for depth.

After the walker, a short prose paragraph names the four triggers in list form as the takeaway memory aid:
1. Multi-row mutation that must all succeed or all fail.
2. Cross-row invariants the schema can't express.
3. Read-modify-write under contention.
4. Atomic state transitions (entity move + outbox row + activity update).

And the **constraint-first reflex**: before wrapping in a transaction with hand-rolled checks, ask whether a `CHECK`, `UNIQUE`, or FK constraint already does the work. The schema is the cheaper, always-on defense; transactions are for invariants the schema can't express.

### When not to reach

Short bullets in prose:

- A single `INSERT`/`UPDATE`/`DELETE` is already atomic — wrapping it is overhead.
- A bulk insert (`db.insert(t).values([row1, row2, ...])`) is one statement, no transaction needed.
- Read-only queries don't need transactions unless they span statements *and* need a consistent snapshot.
- Don't reach for `serializable` "just to be safe" — it costs throughput and surfaces 40001s as user-facing errors.

### The four isolation levels

Open with a one-paragraph framing: isolation describes what concurrent transactions see of each other's in-flight work. Postgres offers four levels by SQL standard; in practice the choice is between three (read uncommitted collapses to read committed).

Then a sequence diagram showing the canonical isolation problem to anchor intuition. `DiagramSequence` with three to four steps showing two concurrent transactions T1 and T2 against a shared `accounts` row:

- Step 1: T1 reads balance=100. (Both transactions started; T1 inside its `BEGIN`.)
- Step 2: T2 updates balance to 50 and commits.
- Step 3: T1 reads balance again. At `read committed` it sees 50 (committed reads of T2 are visible). At `repeatable read`, it still sees 100 (snapshot pinned to first statement).
- Step 4: T1 tries to commit a write based on the old read. At `serializable`, Postgres detects the conflict and raises 40001 if its commit would create a non-serial ordering.

Caption: "The same code reads different values, or fails differently, depending on isolation level."

Then four short subsections (h3) — one per level. For each: the trigger that reaches for it, the guarantee, the cost, the typical SaaS use case.

#### Read uncommitted

One paragraph. Postgres treats `read uncommitted` as `read committed` — dirty reads never happen. Named for SQL-standard compatibility, never the right answer in this stack.

#### Read committed — the default

Each statement sees a snapshot of committed data at *statement start*. Two statements in the same transaction can see different data if another transaction commits between them. Cheapest level. The right default for nearly every write workflow. Subject to non-repeatable reads and phantoms.

#### Repeatable read

The whole transaction sees a snapshot taken at the *first* statement. Same query, same result throughout. The reach when a report or computation reads multiple tables and needs them coherent. Can raise SQLSTATE 40001 on conflicting concurrent writes — the app retries.

Concrete trigger: month-end revenue roll-up that reads `invoices`, `payments`, and `refunds` — all three must reflect the same point in time.

#### Serializable

Postgres guarantees the result is equivalent to *some* serial ordering of all concurrent transactions. Reach when cross-row invariants can't be expressed as a constraint and read-modify-write is the workload. Most expensive level; raises 40001 most often. Retries must be part of the call shape.

Concrete trigger: "limit each org to 100 active integrations" — if the rule can't be a partial unique index, `serializable` checks it correctly under contention. Aside (`Aside` type=tip): "Most invariants are constraint-shaped. Ask 'could this be a `UNIQUE` or partial unique index?' before reaching for serializable."

#### Setting the isolation level in Drizzle

A short `Code` block showing the second-argument signature:

```ts
await db.transaction(async (tx) => {
  // …
}, { isolationLevel: 'serializable', accessMode: 'read write' });
```

Prose: Drizzle accepts the four standard strings (`'read uncommitted'`, `'read committed'`, `'repeatable read'`, `'serializable'`) plus `accessMode: 'read only' | 'read write'` and an optional `deferrable` flag for `serializable read only` transactions. The course defaults: `read committed` for most mutations, `repeatable read` for multi-statement snapshot reads, `serializable` reserved for the invariant case.

### Boundary errors — retry 40001, surface 23505

Open with a framing paragraph: two SQLSTATE codes show up at the application boundary often enough to deserve helpers. They're handled in opposite ways — one retries, the other returns a typed error to the caller.

`TabbedContent` with two panels (or a `CodeVariants` block if both are code-heavy):

- **Panel "40001 — `serialization_failure`"** — raised at `repeatable read` or `serializable` when Postgres can't serialize the transaction. The app retries, usually 2-3 attempts with a small backoff. Show a `retryOnSerializationFailure(fn, { attempts: 3 })` helper sketch that inspects `error.code === '40001'`. Senior reflex: every `serializable` transaction has a retry wrapper.
- **Panel "23505 — `unique_violation`"** — raised on a unique-constraint or unique-index violation (duplicate email signup, webhook event-id collision, `(orgId, externalId)` clash from 042.5). This is *not* retried — it's a deterministic conflict the caller should surface as a typed result (e.g., `Result.err('email_taken')`). Show an `isUniqueViolation(e)` helper checking `e.code === '23505'`. Foreshadow 047.3 cashing in this helper for form-error mapping.

After the variants, a one-sentence rule: "Retry transient failures; surface deterministic conflicts."

Note for the writer: postgres-js and node-postgres both surface Postgres errors with a `.code` string property holding the SQLSTATE — Drizzle does not wrap these, so the helper does its own duck-typing check (`'code' in err && err.code === '23505'`).

### Row-level locking with `SELECT ... FOR UPDATE`

Senior trigger: the workflow is read-decide-write and concurrent writers must wait their turn. Locking the row inside a transaction serializes the contended access without paying the throughput cost of `serializable`.

Show a `Code` block with the canonical pattern (decrement a balance):

```ts
await db.transaction(async (tx) => {
  const [account] = await tx
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .for('update');
  if (account.balance < amount) throw new Error('insufficient_funds');
  await tx
    .update(accounts)
    .set({ balance: account.balance - amount })
    .where(eq(accounts.id, accountId));
});
```

Prose explanation: `.for('update')` issues `SELECT ... FOR UPDATE`, locking the returned rows until the transaction commits. Other transactions that try to `SELECT ... FOR UPDATE` (or `UPDATE`) the same rows block until the lock releases. Pairs naturally with the default `read committed` — the lock does the serialization work the higher isolation level would.

Aside (`Aside` type=caution): "The lock is held for the whole transaction. Short transactions are fast; long transactions block every other writer of those rows. Never await external IO between the lock and the commit."

Note for the writer: `.for(...)` is on the `db.select(...)` query builder, not on the relational query API (`db.query.x.findFirst`) — for relational reads that need locking, drop to `db.select`.

### The production rules

Three rules, each one short subsection (h3). These are the senior-reflex calls a junior would otherwise miss in production.

#### No external IO inside a transaction

PgBouncer transaction-mode pooling (the Neon pooled URL from 040.4) checks the connection out for the *duration* of the transaction. Awaiting `fetch(...)`, an SDK call to Stripe or Resend, or any IO that isn't the database, holds the pooled connection while doing nothing useful. Under load, the pool runs out of connections and the whole app stalls.

Use a `CodeVariants` block with two tabs:

- **Tab "Wrong — external call inside"** — `db.transaction` callback awaits a `stripe.charges.create(...)` between two DB writes. Annotate the connection-hold span.
- **Tab "Right — bracket the transaction"** — make the external call before (or after) the transaction. Show the pattern: compute → transact → confirm.

Course rule restated: external side-effects fire *after* commit. (Foreshadow Unit 12's outbox pattern as the bulletproof version of this.)

#### `db` vs. `tx` discipline

A function called from inside a transaction must accept the transaction client. A service helper that captures `db` from module scope silently runs *outside* the caller's transaction — partial-failure state appears, isolation breaks, and the bug is invisible until production load.

`CodeVariants` with two tabs:

- **Tab "Wrong — captures `db`"** — `function logActivity(userId) { return db.insert(activity).values(...); }` called from inside a `db.transaction` callback. Annotate that the `db.insert` runs on a different connection.
- **Tab "Right — accepts the client"** — `function logActivity(client: Db | Tx, userId) { return client.insert(activity).values(...); }`. Caller passes `tx`.

Course pattern: every data-layer function takes the Drizzle client (`db` *or* `tx`) as a parameter. The type accepts both; the caller decides.

#### Keep transactions short

A bulleted reminder list:
- Build the inputs (validation, lookups that don't need to be in the snapshot) *before* `db.transaction`.
- Fire side-effects (emails, webhooks, queue jobs) *after* commit.
- The transaction body is data-layer writes only.

### Savepoints — nested `tx.transaction`, briefly

One paragraph. Drizzle's `tx.transaction(async (sub) => ...)` emits `SAVEPOINT`. Inner failure rolls back to the savepoint; outer transaction continues. Reach: partial-failure handling inside a larger transaction (try a write, fall back if a constraint fires). Rare in practice; named for recognition only.

### Practice — guided exercise

A `DrizzleCoding` exercise so the student writes a transaction against a real PGlite-backed Drizzle setup. Goal: convert a broken multi-statement write into a transaction, with `expectedRows` checking the final state after a deliberately failing run.

**Exercise design:**
- **Instructions:** "Rewrite `createOrder` so that the order row and its items are inserted atomically. The seed already contains data that will cause the line-item insert to fail with a unique-constraint violation — your transaction must roll back the order row when that happens. Return all rows from the `orders` table after the failing call."
- **Schema:** `orders` and `orderItems` tables, with a unique constraint on `(orderId, sku)` so the line-item insert collides with seed data.
- **Starter:** A broken `createOrder` body that does two sequential `db.insert` calls without a transaction, plus a runner block at the bottom that catches the expected failure and then returns `await db.select().from(orders);`. The student edits the `createOrder` body to wrap it in `db.transaction(async (tx) => { ... })`.
- **Grading via `expectedRows`:** `expectedRows: []` — after a successful wrap, the orders table is empty (the rollback took the partial write with it); without the transaction, the broken starter returns one stray order row, so the check fails.

Author note for the writer: if PGlite's transaction semantics through Drizzle have surprising behavior here, fall back to a single-run version where the harness inspects both tables and the grading rule is "neither table contains any rows from the failed call."

### Quick understanding check

A `MultipleChoice` (single-correct) checking the four-triggers reflex without parroting the prose. Question shape: present a small code scenario (e.g., "an endpoint updates a user's email and writes an audit log row") and ask which is the senior reflex from a list of four options (no transaction needed; `db.transaction` with `read committed`; `db.transaction` with `serializable`; wrap each `await` in its own `try/catch`). Correct: `db.transaction` with `read committed`. Explanation re-derives the trigger.

A second `MultipleChoice` (multi-select, two correct) on which situations call for `repeatable read`:
- Snapshot report reading three tables (correct).
- Single-row update (incorrect — single statement is atomic).
- Decrementing a balance under contention (incorrect — `for update` + `read committed` or `serializable`).
- Month-end roll-up across `invoices` + `payments` + `refunds` (correct).

### Senior reflexes for transactions in production

Compact bulleted recap (the lesson's takeaway card):

- Mixing `db` and `tx` inside a transaction silently breaks isolation.
- Long-running transactions starve the pool — never await external IO inside.
- `serializable` without retry logic = random user-facing 500s.
- `for update` locks rows until commit — slow transactions block every other writer.
- `read committed` is correct for most cases; higher levels cost throughput.
- `db.transaction` returns the callback's return value — use that to surface inserted ids.
- 40001 retries; 23505 surfaces. Don't loop on 23505.

### External resources

Two or three `ExternalResource` cards:
- Postgres docs — "Transaction Isolation" (`https://www.postgresql.org/docs/current/transaction-iso.html`).
- Drizzle ORM — "Transactions" (`https://orm.drizzle.team/docs/transactions`).
- Postgres docs — "Serialization Failure Handling" (`https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html`).

## Scope

**Not covered in this lesson** (owned elsewhere):

- **Wrapping Server Actions in transactions in context** — Lesson 047.5 owns this; this lesson teaches the shape, 047.5 teaches the action-flow integration. Mention as foreshadow only.
- **Outbox patterns / transactional messaging** — Unit 12 owns the durable side-effect dispatch story.
- **MVCC internals, `VACUUM`, bloat, autovacuum** — out of scope; the student doesn't need to know how Postgres implements snapshots.
- **Connection-pool sizing and tuning** — Lesson 040.4 owned the driver decision and the pooled-vs-unpooled URLs. This lesson assumes the student already knows what PgBouncer transaction-mode pooling is.
- **Distributed transactions across services** — out of scope; the course teaches the single-database default everywhere.
- **`EXCLUSION` constraints** — name once when discussing the constraint-first reflex, don't teach.
- **RLS-aware transactions and `SET LOCAL` for tenancy** — Chapter 060/063 owns the `withTenant` mechanic.
- **Idempotency keys and webhook claim transactions** — Lesson 067.1 owns the `claimEvent` pattern.
- **Audit-log writes inside a transaction (`logAudit(tx, event)`)** — Lesson 061.5 / 063 owns this; the lesson can hint that the `tx`-as-parameter discipline is what makes this signature enforceable.

**Prerequisites assumed (briefly redefined if needed):**
- Drizzle query builder (042.1-3) — the lesson uses `db.insert`, `db.update`, `.returning()`, the relational query API.
- Postgres unique constraints (041.7) — referenced in the 23505 panel.
- Cursor pagination composite indexes (042.6 / 043.1) — not used directly, but the student has seen partial unique indexes.
- PgBouncer transaction-mode pooling (040.4) — referenced in the "no external IO" rule.
