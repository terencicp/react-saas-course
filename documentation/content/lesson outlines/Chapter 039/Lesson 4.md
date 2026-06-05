# Transactions and isolation levels

Sidebar label: `Transactions`

## Lesson framing

This is the last teaching lesson of chapter 039 and the one that turns "the writes run" into "the writes are correct under failure and concurrency." It's the source of the transaction thread that lesson 5 of chapter 043 (Server Actions) cashes in, and the home of two error-mapping helpers (`isUniqueViolation`, the 40001 retry) that chapter 043 reuses.

Senior question the whole lesson answers (state implicitly in the intro, never as a heading): *when does a multi-statement write need atomicity, and which isolation level — if any beyond the default — does the rest of the work?*

Central pedagogical decision — **two independent axes, taught in this order**:

1. **Atomicity (the always-on baseline).** A transaction is all-or-nothing. This is the reason 95% of transactions exist and it has nothing to do with concurrency. Teach this first, fully, with the worked example, before the word "isolation level" appears in anger.
2. **Isolation (the concurrency axis).** Only once atomicity is solid do we ask the second, separate question: what does *another* transaction running at the same time see, and can it corrupt my read-modify-write? This is where isolation levels live.

The biggest beginner failure here is collapsing these two axes into one — thinking "I need a transaction" and "I need `serializable`" are the same decision. They are not. Most transactions in a real SaaS are `read committed` (the default) and exist purely for atomicity. Keep the two axes visually and structurally separate; the lesson's spine is "atomicity is the default reason, isolation is the rarer second question."

Second failure mode: concurrency anomalies are abstract until seen on a timeline. Non-repeatable read, phantom, and write skew cannot be taught in prose alone — students nod along and retain nothing. The load-bearing teaching device is a **two-lane interleaved-timeline diagram** (`DiagramSequence`) that scrubs through two concurrent transactions step by step and shows exactly when the anomaly appears and which isolation level prevents it. Build the model simplest-first: one transaction, then two non-overlapping, then two interleaved.

Third failure mode: students reach for `serializable` prophylactically (cargo-cult "strongest is safest") and ship random user-facing 500s because they never wrote the retry. Frame isolation level as a *cost* decision — higher levels buy correctness with throughput and a mandatory retry obligation. The `read committed` default is correct until a specific anomaly forces a step up.

Fourth: the silent-bug cluster — mixing `db` and `tx`, awaiting external IO inside a transaction, no retry on 40001. These are the bugs that pass every test on a single-user dev machine and detonate in production. Frame them in production stakes (pool starvation, corrupted partial state, random 500s), not as style nits.

Mental model the student leaves with: *a transaction is a boundary with two knobs. The first knob (atomicity) is on by default and is why you reach for one. The second knob (isolation level) defaults to `read committed` and you only turn it up when a named concurrency anomaly proves you must — and turning it up signs you up for a retry loop. Before either knob, ask whether a database constraint already does the job for free.*

Tie everything to what the student already knows from chapters 037–039: schema constraints (037.7 `.unique()`, CHECK), the relational/`db.select` query API (038), the unique indexes that webhook idempotency relies on (038.5 / 039.1), and the `Result<T>` error channel from the code conventions. The constraint-first reflex links directly back to 037.

Estimated student time: 50–60 minutes.

## Lesson sections

### Introduction (no heading)

Warm, brief, motivating. Open with the concrete failure the worked example will fix: an invoice-create that inserts the invoice, inserts its line items, then bumps the customer's `lastActivityAt` — three separate statements. The server crashes (or a constraint trips) after statement one. Now there's an invoice with no line items: corrupted state a user will see. State the senior question implicitly. Preview the two knobs (atomicity now, isolation later) and the two helpers the student will leave with. Connect to prior chapters: the queries are from 038, the constraints from 037; this lesson makes the *writes* safe.

### A transaction is a boundary that's all-or-nothing

Teach atomicity as the baseline, fully, before any isolation talk.

- Define a transaction: a group of statements that commit together or roll back together. Postgres wraps every single statement in an implicit transaction already — the explicit transaction extends that all-or-nothing guarantee across *multiple* statements.
- ACID, restated in one tight pass (do not belabor — the student likely half-knows it): Atomicity (all-or-nothing), Consistency (constraints hold at commit), Isolation (concurrent transactions see a coherent view — flag this as "the second half of the lesson"), Durability (committed writes survive a crash). The honest framing: this lesson is mostly Atomicity (the everyday reason) and Isolation (the rarer second question); C and D are largely free from Postgres + your constraints.
- Use `Term` for ACID, atomicity, durability.

Diagram — **atomicity as a commit/rollback fork**. A small `Figure` with hand HTML/CSS or `ArrowDiagram`: three stacked statements inside a boundary box, two outcomes branching off — "all committed" (green) vs "all rolled back" (red), with the partial-failure middle state shown as crossed-out/impossible. Pedagogical goal: cement that there is no in-between state. Keep it horizontal and short. This is a simple visual aid, not a system graph — that's fine and wanted.

### Wrapping writes in `db.transaction`

The Drizzle call shape and the `tx` discipline.

- The shape: `await db.transaction(async (tx) => { ... })`. Every statement inside uses `tx`, not `db`. The transaction commits when the callback returns normally; **throwing inside the callback rolls it back** — there is no manual `commit`/`rollback`, the return/throw is the signal.
- The return value of the callback becomes the return value of `db.transaction(...)` — this is how you bring an inserted id (or row) back out. Call this out explicitly; it's a common "how do I get the new id?" stumble.
- Use `AnnotatedCode` (ts) on the invoice-create transaction body. Steps: (1) the `db.transaction(async (tx) => ...)` signature; (2) the insert returning the invoice via `.returning()`, captured in the closure; (3) the dependent line-items insert using `tx` and the new invoice id; (4) the `lastActivityAt` update on `tx`; (5) `return invoice` — the value crosses the boundary out. Color the `tx` token consistently (blue) across steps so the eye tracks the discipline. Align this code with the conventions and with the chapter-043 worked example: insert invoice → insert lines → return invoice.

The `db` vs `tx` discipline (the silent bug) — teach it where the student first writes `tx`:

- The trap: a helper called from inside the transaction that captures `db` from module scope runs its query on the *outer* pooled connection, outside the transaction. It silently won't roll back. Tests pass; production corrupts.
- The course pattern (from code conventions, `db/queries/`): every data-layer helper called inside a transaction takes the client as its first argument — `fn(tx, ...)` — never reaches for module-scope `db`. Show the type: the parameter accepts the Drizzle client type that covers both `db` and `tx`.
- Use `CodeVariants` here: tab "Leaks out of the transaction" (helper uses module-scope `db`, mark it red `del`-style) vs "Threads `tx`" (helper takes `tx` first arg, green). First sentence of each tab states the consequence. This is the highest-value before/after in the lesson.
- `Term` for connection pool (redefine briefly from 036 — a fixed set of reusable database connections).

### When a write earns a transaction — and when it doesn't

The four senior triggers plus the negative space. Defaults-and-triggers framing per the pedagogical guidelines.

- The four triggers (frame each with a one-line SaaS example, keep tight):
  1. **Multi-row mutation that must all succeed or all fail** — invoice + line items; signup creating user + profile + org row; team-create + first-member insert.
  2. **Cross-row invariant the schema can't express** — "sum of line-item allocations equals invoice total," checked before commit, abort if violated.
  3. **Read-modify-write under contention** — decrement a balance, allocate a seat from a pool, increment a counter where the read must reflect the write that follows.
  4. **Atomic state transition with side effects** — move invoice `draft → sent`, write an outbox row, bump `lastActivityAt`, all-or-nothing.
- When **not** to: a single statement is already atomic — wrapping it adds a round-trip and buys nothing. `db.insert(...).values([...])` (bulk insert) is one statement, no transaction needed. Read-only queries don't need one *unless* they span statements and need a consistent snapshot (forward-reference: that's `repeatable read`, coming up). This is the "trigger before tool" discipline — name the threshold the default crosses.

The constraint-first reflex (links back to 037) — teach it adjacent to trigger #2:

- Before writing a transaction whose job is a cross-row *check*, ask whether a `UNIQUE`, `CHECK`, foreign key, or `EXCLUSION` constraint already enforces it. The schema is the cheaper, always-on, race-free defense; the transaction-with-check is only for invariants the schema genuinely can't express. `EXCLUSION` named for recognition only (per scope).
- Reinforce with a short `MultipleChoice` or `Buckets`: given several scenarios (duplicate email; invoice total must be positive; allocate the last seat in a pool; one primary contact per org), sort into "a constraint handles this" vs "needs a transaction." Pedagogical goal: stop the reflex of reaching for a transaction when a constraint is the right (cheaper) tool. `Buckets` two-column fits this exactly.

### What another transaction sees — the second knob

The pivot to the concurrency axis. Make the axis change explicit: "Everything above was atomicity, the first knob, on by default. Now the separate, second question: what does a *concurrent* transaction see?"

- Frame isolation as a snapshot question: each transaction reads some snapshot of the database; the isolation level decides how stable that snapshot is across the transaction's lifetime and what concurrent commits can leak in.
- Introduce the three anomalies the levels are defined against, but **teach them on a timeline, not in a glossary**. This is the load-bearing diagram of the lesson.

Diagram — **two-lane interleaved timelines** (`DiagramSequence`, the centerpiece). Two columns, "Transaction A" and "Transaction B," time flowing downward; each step reveals the next operation and the value each transaction observes. Build up across two or three sequences (consider grouping with `TabbedContent`, one tab per anomaly, each tab its own `DiagramSequence`):

- **Non-repeatable read** — A reads row X (value 100), B updates X to 150 and commits, A reads X again and now sees 150 *within the same transaction*. Caption the punchline step: "Same query, different answer — a non-repeatable read. `read committed` allows this; `repeatable read` freezes A's snapshot so the second read still sees 100."
- **Phantom read** — A counts rows where `status = 'pending'` (gets 3), B inserts a new pending row and commits, A re-counts and gets 4. Caption: "The set grew under A — a phantom. `repeatable read` in Postgres prevents this too." **Accuracy note for the builder (verified against Postgres 18 docs):** Postgres's `repeatable read` is *stronger than the SQL standard* — it prevents phantoms via snapshot isolation. Do not "correct" this to the textbook claim that only `serializable` stops phantoms; that's the standard, not Postgres.
- **Write skew** (the serializable-only case) — two transactions each read a constraint ("at least one admin must remain"), each sees two admins, each demotes a different admin, both commit; invariant now violated though each transaction alone was correct. Caption: "Neither read stale data, yet the invariant broke. Only `serializable` catches this — by aborting one with a serialization failure." This is the hardest anomaly; the timeline makes it concrete and motivates `serializable` specifically.

Pedagogical goal of the diagram: convert three abstract anomaly names into "I can see exactly when and why this happens, and which level stops it." Cap each timeline at ~5–6 steps to respect the height limit. `Term` for snapshot, non-repeatable read, phantom read, write skew.

### The four isolation levels and where each earns its keep

Now name the levels, anchored to the anomalies just visualized. Build complexity gradually: cheapest/default first, escalate.

- **Read uncommitted** — Postgres silently treats it as `read committed`; no dirty reads ever exist in Postgres. Named once for compatibility recognition; never the right answer. Don't dwell.
- **Read committed (the default).** Each *statement* sees a fresh snapshot of data committed at statement start. Cheapest, correct for the overwhelming majority of mutations. Susceptible to non-repeatable and phantom reads (point back to the diagram). This is what every transaction in the lesson so far has been using without saying so — make that explicit.
- **Repeatable read.** The whole *transaction* sees one snapshot taken at its first statement; same query, same answer throughout, and in Postgres phantoms are prevented too. Reach when a multi-statement *read* needs internal coherence — month-end roll-up reports, multi-table consistency snapshots, read-your-own-snapshot computations. Can raise a serialization failure (SQLSTATE 40001) on conflicting concurrent writes → the app must retry.
- **Serializable.** Postgres guarantees the outcome equals *some* serial ordering of all concurrent transactions — the only level that catches write skew. The reach when a cross-row invariant can't be a constraint and read-modify-write contention is the workload. Most expensive; raises 40001 more often; retries are part of the call shape, not optional.

Setting it in Drizzle: the second argument — `await db.transaction(async (tx) => { ... }, { isolationLevel: 'serializable' })`. Drizzle accepts the four level strings; also mention `accessMode: 'read only'` and `deferrable` exist (one line, defer depth). Use a small `Code` block, not `AnnotatedCode` — the shape is simple.

Decision aid — **`StateMachineWalker`** (`kind="decision"`, the senior decision filter). Walk the order a senior actually asks:

- Root: "Is this a single statement?" → yes → Leaf "No transaction — it's already atomic."
- → no → "Does it only *read* across multiple statements and need them coherent?" → yes → Leaf "`repeatable read` for a consistent snapshot."
- → no (it writes) → "Is the correctness rule a cross-row invariant a constraint can't express, under concurrent writers?" → no → Leaf "`read committed` (the default) — wrap for atomicity, that's all."
- → yes → "Is the hot row identifiable up front?" → yes → Leaf "`read committed` + `SELECT … FOR UPDATE` — lock the row, skip retry thrash." → no → Leaf "`serializable` + a 40001 retry wrapper."

Pedagogical goal: the lesson lives in the *order* of questions (atomicity-only is the common answer; the higher levels are the exceptions), not in any single leaf. This directly fights the "reach for serializable first" instinct.

### Surviving serialization failures — the retry

The obligation that the higher two levels create. This is where prophylactic `serializable` goes wrong without it.

- Why it happens: at `repeatable read` / `serializable`, Postgres can't always serialize concurrent transactions, so it aborts one with SQLSTATE 40001 (`serialization_failure`) rather than corrupt data. This is *expected and normal* — not a bug, not a 500. The contract is: the app retries the whole transaction.
- The retry helper: catch the specific code, retry up to N times (2–3) with a small backoff, surface a clean error after the budget. Emphasize: retry the *entire* transaction closure, not the failed statement; and the closure must be side-effect-free outside the DB (re-running it must be safe) — which is exactly why external IO can't live inside.
- `AnnotatedCode` (ts) on a `retryTransaction(fn)` wrapper. Steps: (1) the loop with an attempt budget; (2) the `try` calling `db.transaction(fn, { isolationLevel: 'serializable' })`; (3) the `catch` narrowing `unknown` and checking the `40001` code — show the `isSerializationFailure(e)` predicate; (4) the small backoff before the next attempt; (5) throw after the budget is spent. Align error handling with conventions: narrow `unknown` via `ensureError`/`instanceof`, never `catch (e: any)`.
- Watch-out, inline: a retry loop *without backoff* makes contention worse, not better (thundering herd) — the backoff is load-bearing. And `serializable` *without any* retry surfaces as random user-facing 500s — the two ship together or not at all.
- `Term` for SQLSTATE, serialization failure, backoff.

### Mapping unique-constraint conflicts to a clean error

The deterministic-conflict sibling of the retry — different code, different handling. This is the helper chapter 043 lesson 3 reuses for form-level errors.

- Postgres raises SQLSTATE **23505** on a unique-constraint / unique-index violation: the duplicate-email signup, the second insert of a webhook event id, an `(organizationId, externalId)` collision (tie back to 038.5 idempotency / 039.1 unique index). postgres-js surfaces it as a catchable error carrying `code === '23505'`.
- Crucial contrast with 40001: **23505 is not retried.** It's a deterministic conflict — retrying produces the same failure. The senior move is to map it to a typed result at the application boundary, not let it become a 500. Make the 40001-vs-23505 distinction explicit (one is "try again," one is "tell the user"); consider a tiny two-row comparison via `TabbedContent` or inline table.
- The helper: `isUniqueViolation(e)` predicate checking the code shape, used to return `err('conflict', 'That email is already taken')` (the `Result<T>` channel from conventions, `conflict` code) instead of throwing. Foreshadow: lesson 3 of chapter 043 cashes this exact helper in for form field-level error mapping.
- `Code` or short `CodeVariants`: "Unhandled — becomes a 500" vs "Mapped to `err('conflict', …)`". Keep tight.
- `Term` for unique violation if not already glossed.

### Locking a row instead of retrying — `SELECT … FOR UPDATE`

The pessimistic alternative to optimistic `serializable` + retry, for hot identifiable rows.

- The workflow: "read this row, decide, then update it," where concurrent writers must wait rather than race. `for update` locks exactly the rows the `SELECT` returns until the transaction commits or rolls back; other transactions touching those rows block until then.
- Drizzle: `db.select().from(invoices).where(eq(invoices.id, id)).for('update')` — inside a transaction, paired with the default `read committed`. The lock does the serialization work the higher isolation level would, and avoids retry thrash when the contended row is known up front (e.g., decrement one account balance, allocate from one pool).
- The trade-off (optimistic vs pessimistic), said plainly: `serializable` + retry lets everyone run and aborts losers (good when conflicts are rare); `FOR UPDATE` makes writers queue (good when the hot row is known and contention is high). This is a senior judgment call, not a rule.
- Watch-out: `FOR UPDATE` holds the lock until commit — a slow transaction blocks *every* other writer of those rows. Same discipline as everything else: keep it short.
- Diagram is optional here; the two-lane timeline mental model already established carries it. A one-line `Code` block plus prose suffices. `Term` for row lock, optimistic vs pessimistic concurrency.

### Keeping transactions short — the pool-starvation rule

The production discipline that ties the lesson to chapter 036's pooling. This is a top-cluster silent bug.

- The mechanism: the pooled Neon URL (036.4) fronts Postgres with PgBouncer in *transaction mode* — a connection is checked out for the **entire duration** of the transaction and only returned on commit/rollback. Hold a transaction open across a slow operation and you hold a pooled connection hostage; do it under load and the pool starves, every other request waits.
- The hard rule (from conventions): **never `await` external IO inside `db.transaction`.** No `fetch`, no email send, no Stripe/R2/queue call inside the boundary. Do the external work *before* (gather inputs) or *after* (fire side effects) the transaction. Tie back to the retry section: a transaction that must be safely re-runnable can't have committed an external side effect anyway — the two rules reinforce each other.
- `db` vs `dbUnpooled`: name that genuinely long-running transactions (migrations, rare batch jobs) use the unpooled connection (036 / conventions); the everyday request path uses pooled `db` and keeps transactions sub-100ms.
- `CodeVariants`: "Starves the pool" (an `await fetch(...)` / email send sitting inside the transaction, red) vs "External IO outside the boundary" (gather → `db.transaction` → send email after, green). First sentence states the production consequence. `Term` for PgBouncer, transaction-mode pooling, pool starvation.

### Worked example — atomic invoice create, proven by rollback

The capstone that fuses atomicity + the disciplines, and sets up chapter 043.

- Walk the invoice-create write end to end (the same one foreshadowed for 043.5, kept at the data-layer level here — *no* Server Action wrapping, parse, or `revalidatePath`; those are explicitly 043's, see scope):
  - **Before**: three bare `await db.…` statements (insert invoice, insert lines, update customer). Show the partial-failure hazard: a throw between statements leaves a half-written invoice.
  - **After**: the same three wrapped in `db.transaction(async (tx) => …)`, every statement on `tx`, returning the new invoice id out of the boundary.
- Use `CodeVariants` (Before / After) for the two versions — the `ins`/`del` markers make the wrap visible.
- The proof: a small test that throws *inside* the closure after the invoice insert and asserts **zero** rows persisted — atomicity demonstrated, not just asserted. Show it as a `Code` block (vitest-style). Pedagogical goal: rollback is believed only when seen; this is the payoff of the opening corrupted-invoice motivation.

Hands-on exercise — the lesson needs the student to *do*, not just read. Two candidates, pick based on builder feasibility (note the constraint for the builder):

- **Preferred — `DrizzleCoding`**: give a seeded `invoices` + `line_items` schema (integer PKs, explicit snake_case columns per the chapter-038/039 widget convention — see Scope/conventions note) and a starter that does the three writes *unwrapped*; the task is to wrap them in `db.transaction` and return the invoice. Grade on the returned row shape via `expectedRows`. **Builder risk to verify:** the PGlite-backed `DrizzleCoding` runtime must (a) support `db.transaction(...)` and (b) let the grader read the returned row. If transactions aren't supported in the widget runtime, fall back to the alternative below and teach the wrap via `CodeVariants` + prose only. Document the outcome in continuity notes.
- **Fallback — `Sequence` or `MultipleChoice`**: a `Sequence` ordering drill (gather inputs → open transaction → insert invoice → insert lines → return → commit → send email *after*) reinforces the external-IO-outside ordering; or a `MultipleChoice` on "which of these belongs inside the transaction?" Lower value than live coding but robust.

A second small check earlier in the lesson is also worth it: a `MultipleChoice` on the isolation-level decision (a scenario → correct level) right after the `StateMachineWalker`, to confirm the decision filter stuck.

### Foreshadowing and external resources

- One tight paragraph foreshadowing where this thread is cashed in: Server Actions wrap exactly this transaction shape (043.5), and the `isUniqueViolation` helper maps form conflicts there (043.3); outbox-style transactional messaging is a later unit. Keep it to recognition — do not teach.
- `ExternalResource` cards (1–2, optional): the Postgres "Transaction Isolation" docs chapter (the canonical anomaly/level reference) and the Drizzle transactions guide. Verify both URLs and current titles in fact-check.

## Scope

Prerequisites to restate briefly (one line each, do not re-teach):

- The Drizzle query API — `db.select(...)` and `db.query.<table>` (038); used in examples, mechanics owned by 038.
- Schema constraints — `.unique()`, CHECK, foreign keys (037); the constraint-first reflex *references* these, doesn't re-teach them.
- Unique indexes for webhook idempotency — `(organizationId, externalId)` (038.5 / 039.1); the 23505 example points back, doesn't re-derive.
- The `Result<T>` channel and `ok`/`err` (code conventions); the helpers return it; not introduced here.
- Connection pooling and the pooled vs unpooled Neon URL (036.4); the pool-starvation rule references it, doesn't re-teach the driver decision.

Explicitly **out of scope** (belongs elsewhere — do not drift):

- Wrapping Server Actions in transactions in context — parse → authorize → transaction → `revalidatePath` → return — is **lesson 5 of chapter 043**. This lesson teaches only the data-layer `db.transaction` shape; keep all examples at the query-helper level, no `'use server'`, no `revalidatePath`.
- The `isUniqueViolation` helper *applied* to form field-level errors — lesson 3 of chapter 043. Here it's introduced and unit-justified; there it's wired to UI.
- `EXPLAIN ANALYZE` / plan reading — lesson 3 of chapter 039 (just shipped). Do not analyze transaction plans here.
- N+1 / round-trip shape — lesson 2 of chapter 039. The pool-starvation discussion is about transaction *duration*, not query count; don't conflate.
- Index types and declaration — lesson 1 of chapter 039.
- Outbox / transactional messaging patterns — Unit 11.
- MVCC internals, `VACUUM`, bloat, tuple visibility mechanics — out of scope; teach the *behavior* (snapshots, anomalies) not the storage internals.
- Distributed transactions / two-phase commit across services — out of scope; the course's default is the single Postgres database.
- `EXCLUSION` constraints at depth — named for recognition only.
- Savepoints / nested `tx.transaction(...)` — **cut to a one-line mention** at most (rare in 2026 SaaS practice, not worth the cognitive load). If included, a single sentence in the retry or worked-example section that nested `tx.transaction` emits a `SAVEPOINT` and rolls back to it on inner failure; no example, no exercise. Prefer cutting it entirely if section length runs long.
- Connection-pool *sizing/tuning* — 036 owns the driver decision; not here.

## Code conventions alignment

- `db.transaction(async (tx) => …)`; thread `tx` through every helper called inside; never module-scope `db` inside the boundary.
- Never `await` external IO inside a transaction (pool starvation). External work before/after.
- `Result<T>` with `ok`/`err`; map 23505 to `err('conflict', …)`; throw the unexpected.
- Narrow `unknown` in `catch` via `instanceof Error` / `ensureError`; never `catch (e: any)`.
- `casing: 'snake_case'` is on the client — app-shape example code reads camelCase TS props (`lastActivityAt`) while emitted SQL is snake_case. **Widget divergence (deliberate, do not "correct"):** `DrizzleCoding`/`SQLCoding` exercises use integer PKs and explicit snake_case column strings per the chapter-038/039 staging convention, since the widget runtime doesn't set client `casing`.
- `dbUnpooled` named only for genuinely long-running transactions; everyday path is pooled `db`.
- Raw SQL only via the `sql\`\`` tagged template; no string-built queries.
