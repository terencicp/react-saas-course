# Lesson title

- Title: `Transaction rollback against real Postgres`
- Sidebar label: `Rollback against real Postgres`

# Lesson framing

This is the foundational pattern lesson for Unit 18's integration band. Every later lesson in chapter 088 (signedInAs, MSW, webhook receivers, Server Actions) consumes `withRollback` and the threaded `tx`. Get the mental model and the helper right here.

**The one idea the student must leave with:** an integration test runs the *real* production query against a *real* test Postgres, wrapped in a transaction that is *always* rolled back. Isolation comes from the rollback, not from cleanup code, not from a fresh database. Production code accepts a DB handle as an explicit argument; the test passes `tx` where production passes the singleton `db`.

**Pedagogical spine — build the model in three escalating beats, lowest cognitive load first:**

1. *Why a real DB at all* (the senior question + the unit/integration boundary). Motivate before mechanism. The student just spent chapter 087 mocking everything in `/lib`; the instinct carried over is "mock `db` too." This lesson's whole job is to break that instinct for the seam layer. Lead with a concrete bug a mocked `db` cannot catch.
2. *The rollback mechanism* (how one test stays isolated). This is the conceptual core and the place students stumble — they don't intuit that a deliberately-thrown error is the isolation primitive. Visualize it with a `DiagramSequence` (BEGIN → run body → throw sentinel → ROLLBACK → swallow sentinel). Then show the `withRollback` helper as code.
3. *The seam* (how the test reaches the rollback). The `tx` only isolates if production code actually uses it. This is the subtle, real-world failure: a test that looks right but queries the global `db` and silently commits real rows. Teach the `db = defaultDb` handle pattern, then the `DbOrTx` type and the lint rule as the two structural guards that make the silent bug loud.

**Framing stance (per pedagogical guidelines):** decisions before syntax. Every section names the senior reasoning — why rollback over truncate-and-reseed, why explicit handle over AsyncLocalStorage, why a real DB over a Drizzle mock. Name the alternative, name its cost, name the trigger where the alternative wins. Keep it adult and terse; the student has written hundreds of unit tests by now.

**Cost is a recurring motif, not a section.** The "ms not µs" trade-off is the price of the pattern and should surface where it's relevant (intro, rollback mechanism, the closing reality check) rather than be quarantined. A small comparison visual (unit 5ms / rollback 20-80ms / truncate-reseed 500ms) anchors *why* rollback is the reach over the obvious truncate-and-reseed alternative.

**Scope discipline is critical here** — this chapter splits one big topic across eight lessons and the boundaries are sharp. This lesson owns the *rollback pattern and the tx seam only*. The DB lifecycle (how `test_w1` gets created, migrations, Docker, Neon) is lesson 2 and must be treated as "assume it exists" — the student writes tests against a DB that's already migrated and seeded. Do not teach `globalSetup`, `drizzle-kit migrate`, or worker DBs here beyond a one-line "lesson 2 wires this." MSW, auth fixtures, and the Server Action/webhook worked examples are all later lessons; reference them as forward pointers, never teach them.

**Code shape note for downstream agents:** the canonical names from the chapter outline are `src/test/db/with-rollback.ts` (kebab-case per code conventions — the outline's `withRollback.ts` violates the filename rule, use kebab), exported helper `withRollback`, type `DbOrTx`, the production handle pattern `({ db = defaultDb }: { db?: DbOrTx } = {})`, the ALS module `src/db/test-tx-context.ts`, and the `.int.test.ts` suffix. The driver is **node-postgres** (`NodePgDatabase`), matching the local-Docker-Postgres construction; Neon's serverless driver is a lesson-2 CI concern, not this lesson's surface. The example domain is `createInvoice` / `invoices`, reused across the chapter, so the student sees one running example deepen rather than a new toy per lesson.

# Lesson sections

## Why a mocked database proves nothing at the seam

**Goal:** install the senior question and break the "mock everything" instinct the student carried out of chapter 087. This is the motivation beat — no helper code yet, just the problem.

**Content:**
- Open with the concrete scenario from the chapter framing: a Server Action does `db.insert(invoices).values(input).returning()`. The chapter-087 reflex is `vi.mock` on the db client and `expect(mockedDb.insert).toHaveBeenCalledWith(...)`. State plainly: that test passes forever, and proves only the *call shape* the test itself wired in. It is a tautology.
- Enumerate what the mock makes invisible — keep this a tight, concrete list because it's the payload of the section: column nullability, unique constraints (the `(org_id, slug)` unique from the data layer), default values and generated columns (UUIDv7 default, `created_at`), the actual SQL Drizzle emits, `onDelete` cascade behavior. Each is a real regression class. Pick **one** to walk through in a sentence as the canonical example — a `NOT NULL` column the insert forgot, green under the mock, `23502` in production.
- Land the reach in one sentence: run the test against a **real test Postgres** with the production schema; the SQL, the constraints, and the defaults are all under test because they actually execute.
- Name the cost honestly and immediately so it isn't a later surprise: this is milliseconds per test, not microseconds — a real connection, a real round-trip. The rest of the lesson is the discipline that keeps that cost contained.

**Components:** Use `CodeVariants` for the central contrast — tab "Mocked db (proves nothing)" with the `vi.mock` + `toHaveBeenCalledWith` shape (the prose first sentence: *passes against a fictional database*), tab "Real db (proves behavior)" with the same action under test hitting `tx` and asserting on a row read back via `tx.select`. This is the canonical before/after that motivates the whole lesson; CodeVariants is the right tool because it's two versions of the same test. Keep both panes short (≤12 lines). The real-db tab will use `withRollback`/`tx` shapes the student hasn't met yet — that's fine and intentional; add a one-line "we'll build this next" pointer in the prose so the unfamiliarity reads as a promise, not a gap.

**Tooltips (`Term`):** `tautology` (a test that can only pass — it asserts the inputs it just supplied), `23502` (Postgres error code for a NOT NULL violation) if it appears in prose.

## Where the unit/integration line actually falls

**Goal:** give the student a crisp, reusable decision rule for which layer a test belongs to. They have the honeycomb (chapter 086) and the `/lib` unit surface (chapter 087); this draws the boundary on the integration side.

**Content:**
- Restate the two sides briefly (these are prerequisites, keep it to a sentence each): unit owns `/lib`'s pure logic — same input, same output, no I/O, no mocks needed. Integration owns anything that crosses a process boundary the *runtime* cares about — Drizzle→Postgres, a Server Action through its full wrapper, a route handler including request/response serialization, a webhook receiver including signature verification.
- Give the one-line litmus test, stated as the decision rule: *if mocking the collaborator would mean the test no longer catches a column-rename, schema-drift, or constraint-violation regression, it belongs at the integration layer.* This is the durable takeaway — phrase it memorably.
- Brief contrast to keep the boundary sharp: a Zod schema is a unit test (pure validation, no DB); the Server Action that *calls* that schema then writes the parsed result is an integration test (the write is the part that breaks).

**Components:** A `Buckets` exercise is the right check here — two buckets "Unit test (`/lib`, mock-free)" and "Integration test (real DB / full wrapper)", and ~6 items the student classifies. Items should force the litmus rule, not be obvious: e.g. "formatInvoiceTotal — sums line items into a Money value" (unit), "createInvoice — parses input then inserts a row" (integration), "mapDatabaseError — turns a Postgres code into an ErrorCode" (unit), "listInvoices — queries invoices scoped to an orgId" (integration), "the createInvoiceSchema Zod validator" (unit), "the Stripe webhook POST handler" (integration). Place it right after the litmus rule so the student applies it immediately. Use `instructions` to frame it as applying the litmus test.

## How one test stays isolated: open, run, roll back

**Goal:** the conceptual core. Make the student *feel* why a deliberately-thrown error is the isolation primitive, and why this beats the obvious alternative (truncate + reseed). This is where first-timers stumble; spend the visualization budget here.

**Content:**
- State the problem the pattern solves: hundreds of tests, all hitting one worker's database, each writing rows. Without isolation, test B sees test A's invoice and breaks; the suite becomes order-dependent. We need every test to start from the same clean state and leave nothing behind.
- Present the naive solution first and let it fail on cost (decisions-before-syntax, simplest-model-first): after each test, `TRUNCATE` every table and re-insert the baseline. It works, it's simple, and it's ~500ms per test — a full disk round-trip and a reseed. At hundreds of tests that's minutes. Name it as the obvious move so the reach has something to beat.
- Now the reach: wrap the whole test in `db.transaction(async (tx) => { ... })`, run the test body against `tx`, and **never commit** — force a rollback at the end. Postgres discards every write the transaction made in sub-millisecond time, with no truncate and no reseed. The baseline seed (lesson 2) sits *outside* the transaction and is therefore visible to every test and untouched by any rollback.
- The mechanism that forces the rollback, stated explicitly because it's the non-obvious bit: Drizzle commits a transaction when the callback resolves and rolls back when the callback *throws* — **throwing is the rollback primitive**. So the wrapper throws a private sentinel error after the body runs. The transaction rolls back; the wrapper catches *only* that sentinel and swallows it (so the test still passes); any real error from the body propagates normally (so a genuine failure still fails the test).
- One line on the built-in alternative, because the student will see it in the wild: Drizzle also exposes `tx.rollback()`, which aborts by throwing its own `TransactionRollbackError`. The course prefers an *own* sentinel over `tx.rollback()` because `tx.rollback()` has surfaced edge-case bugs (see fact-check) and a private sentinel can't be confused with a real `TransactionRollbackError` thrown by the body. Same idea — throw to roll back — but the sentinel is unambiguous. (Downstream: teach the custom sentinel as primary; name `tx.rollback()`/`TransactionRollbackError` as the built-in the student will encounter, one sentence, no detour.)
- Reinforce the cost win here with the three-tier comparison — this is the section where "why rollback" is the live question.

**Components:**
- A `DiagramSequence` is the right vehicle for the mechanism — it's a temporal sequence and the student should scrub it. Steps, each with a one-line caption and a simple visual (a row of labeled stage boxes with the active one lit, plus a tiny "DB rows" indicator showing the invoice appearing then vanishing):
  1. `BEGIN` — transaction opens; `tx` is live. DB rows: baseline seed only.
  2. **Run test body** against `tx` — the action inserts an invoice; assertions read it back via `tx` and pass. DB rows: seed + 1 uncommitted invoice (visible *inside* the tx).
  3. **Throw sentinel** — the wrapper throws `RollbackSignal` after the body finishes.
  4. `ROLLBACK` — Postgres discards every write. DB rows: back to baseline seed only.
  5. **Swallow the sentinel** — the wrapper catches exactly this error; the test reports green. Any other error would have propagated and failed the test.
  Pedagogical goal: make the "throw-to-roll-back, catch-to-stay-green" move concrete and show that the invoice never persists. The vanishing-row indicator is the payoff — it's what students don't picture on their own.
- A small inline comparison visual for the cost tiers. A plain HTML+CSS three-bar strip (per the diagrams guide — sequential, no parallelism, devtools-friendly) inside a `<Figure>`: `/lib` unit ~5ms · rollback-per-test ~20-80ms · truncate-and-reseed ~500ms, bars to scale (log or clipped so 500 doesn't dwarf the others — note this to the figure author). Caption: rollback is two orders of magnitude cheaper than truncate-and-reseed, and that gap is the whole reason it's the reach. Keep it lightweight; this is an anchor, not a centerpiece.

**Tooltips (`Term`):** `sentinel error` (a private error value used only as a control-flow signal, never surfaced to the caller), `TRUNCATE` (SQL that empties a table fast but commits — outside any rollback).

## The withRollback helper

**Goal:** show the helper as code, now that the student has the mechanism in their head. The previous section earned the "why"; this section is the "what it looks like."

**Content:**
- Present `src/test/db/with-rollback.ts`. The shape: a function that takes a test body `({ tx }) => Promise<void>` and returns the function Vitest's `it` actually runs. Inside: open `db.transaction`, call the body with `{ tx }`, throw the sentinel; the outer `try/catch` swallows only the sentinel.
- Walk the call site so the ergonomics land: `it('creates an invoice', withRollback(async ({ tx }) => { ... }))`. The student reads `tx` as "the database, but anything I write vanishes after this test."
- Two details worth one line each: the sentinel is a module-private class so nothing outside the helper can accidentally catch or throw it (and so it can't be confused with a real `TransactionRollbackError` from the body); the `catch` must rethrow everything that *isn't* the sentinel (a swallow-all catch would hide real failures — name this as the trap, it's the load-bearing line).
- Note that this helper assumes a `db` whose `.transaction` is wired to the per-worker test connection from lesson 2 — one sentence, forward pointer, no detail.

**Components:** `AnnotatedCode` is the right tool — one ~15-line helper, and the student's attention needs steering to three specific parts in sequence. Steps (each `color`-tinted, ≤6 lines prose):
  1. (blue) the signature — takes a body that receives `{ tx }`, returns the function `it` runs. This is the wrapper shape.
  2. (blue) `await db.transaction(async (tx) => { await body({ tx }); throw new RollbackSignal(); })` — run the body, then throw to force the rollback.
  3. (green) the `catch` — `if (!(err instanceof RollbackSignal)) throw err;` — swallow only the sentinel, rethrow everything else. Call out explicitly that this line is what keeps real failures failing.
AnnotatedCode over a flat block because the swallow-only-the-sentinel line is the subtle, load-bearing part and deserves isolated focus.

**Tooltips (`Term`):** none new; `sentinel` already defined.

## Threading tx through production code

**Goal:** the second core idea and the one with the highest real-world stakes. The rollback only isolates if the production query runs on `tx`. Teach the explicit-handle seam and why it beats AsyncLocalStorage for the common case.

**Content:**
- State the requirement plainly: for the test's `tx` to govern the write, the production function has to *use* `tx` instead of the singleton `db`. So production code accepts the DB handle as an argument.
- The pattern: `export const createInvoice = (input: CreateInvoiceInput, { db = defaultDb }: { db?: DbOrTx } = {}) => { ... }`. Default is the singleton (production passes nothing); the test passes `{ db: tx }`. One parameter, defaulted, invisible at every production call site, swappable at every test call site. (Aligns with the conventions' "thread `tx` through any helper called inside the block" rule and the `db/queries/` helpers that "take `tx` as the first argument" — note for downstream: the chapter outline puts the handle in an options object; that's the shape to teach here, and it's consistent with the two-positional-args-max rule.)
- Name the alternative and its trigger (defaults-before-conditionals): **AsyncLocalStorage** can make `tx` ambient so no signature changes — but it pays a complexity tax (a context module, `.run()` wrapping, a `getDb()` indirection) for a seam that's already explicit and readable at the call site. Course default: the explicit handle. ALS earns its weight only where the signature is *fixed by the framework* and can't take a handle — which is exactly the route-handler case in the next section.
- Show production vs. test call sites side by side so the "nothing changes in production" point is visceral: `createInvoice(input)` in the action body vs. `createInvoice(input, { db: tx })` in the test.

**Components:** `CodeVariants` with three tabs:
  - "Production code" — the `createInvoice` signature with `{ db = defaultDb }` and a normal call `createInvoice(input)` somewhere. Prose: *the handle is invisible in production — the default fires.*
  - "Test code" — `withRollback(async ({ tx }) => { await createInvoice(input, { db: tx }); /* assert via tx.select */ })`. Prose: *the test passes `tx`; every write rolls back.*
  - "AsyncLocalStorage (the alternative)" — a sketch of the ALS shape (`als.run(tx, () => createInvoice(input))`, no handle in the signature) with prose naming the cost: *ambient, zero signature change, but adds a context module and a `getDb()` indirection — reach for it only when the signature is fixed (next section).*
  Use `ins=`/highlight meta to mark the `{ db: tx }` argument in the test tab so the eye lands on the one thing that differs.

**Tooltips (`Term`):** `AsyncLocalStorage` (a Node API that carries a value through an async call chain without passing it as an argument — like request-scoped context), `singleton` if not already familiar from earlier units (the one shared `db` client exported from `db/index.ts`).

## The route-handler escape hatch

**Goal:** the contained exception to the explicit-handle default. Route handlers can't take a `db` argument, so they get the ALS treatment — but framed strictly as an escape hatch, used in earnest in lesson 6, sketched here.

**Content:**
- The constraint: a Next.js route handler's signature is fixed — `export async function POST(request: Request)`. There's no parameter to thread `tx` through. The explicit-handle pattern has nowhere to go.
- The contained alternative: a module-scope `AsyncLocalStorage<DbOrTx>` in `src/db/test-tx-context.ts`. The test enters the handler inside `als.run(tx, () => POST(request))`; production code inside the handler reads its DB via a `getDb()` helper that returns `als.getStore() ?? defaultDb`. In production nothing has called `.run`, so the store is empty and `getDb()` returns the singleton; under test, the store holds `tx`.
- Frame the boundary crisply (this is the discipline that keeps ALS from spreading): explicit handles stay the default for Server Actions, `/lib` helpers, and `db/queries/` functions. ALS is reserved for the framework-fixed-signature case — route handlers and webhook receivers. One mechanism, used in exactly one place, for exactly one reason.
- This is a forward reference made concrete in lesson 6 (webhook receiver). Keep the treatment to the mechanism and the boundary; do not test a handler here.

**Components:** A short `Code` block for the `test-tx-context.ts` module (the `AsyncLocalStorage` instance + the `getDb()` helper, ~8 lines) — it's small and a single focus, so a plain annotated-free block is enough. Optionally a one-line `Aside` (note) reinforcing "ALS only where the signature is fixed; everywhere else, the handle." Don't over-build this section — it's a pointer, not a destination.

**Tooltips (`Term`):** none new.

## What does not roll back

**Goal:** the critical watch-out cluster, taught as a coherent concept (not a bullet dump): rollback governs *transactional* state only. Everything non-transactional escapes it. This prevents the most damaging silent-failure class in the chapter.

**Content:** Frame the whole section around one principle — *the rollback undoes rows, and nothing else.* Then the consequences, each one sentence:
- **Sequences advance and stay advanced.** A rolled-back insert still consumed its sequence value. So never assert on exact auto-incrementing IDs — assert on *shape* (`expect.stringMatching(/^inv_/)`, `expect.any(String)`), never `id === 42`. This is the most common fragile-test bug in the chapter; state it strongly.
- **`pg_notify` and triggers fire pre-rollback.** A `NOTIFY` already went out; a trigger already ran. Don't assert on the notify directly — assert through other observable state.
- **External side effects are not transactional at all.** `fetch`, queue enqueues, email sends — none of them are inside the Postgres transaction. The rollback can't touch them. These go through MSW (lessons 4-5) or in-memory stubs, and the test asserts on *intent* (the MSW handler was called with body X), not on a real side effect.
- The unifying takeaway: the transaction is a clean, cheap reset for *your Postgres rows*. For everything else, isolation is a different tool — which is exactly why the chapter spends three more lessons on the network boundary.

**Components:** A `Buckets` exercise reinforces the principle and doubles as the section's check — two buckets "Rolled back automatically" / "Survives the rollback (needs other isolation)", ~6 items: "an inserted invoice row" (rolled back), "an `UPDATE` to an existing row" (rolled back), "a `nextval` consumed by a serial column" (survives), "a `pg_notify` to a listening channel" (survives), "a Stripe API call the action made" (survives), "an email enqueued to the send queue" (survives). The split makes the "rows vs. everything else" line tangible. Place it at the end of the section.

**Tooltips (`Term`):** `pg_notify` (a Postgres pub/sub command that emits a message to listeners — fires immediately, not on commit), `sequence`/`nextval` (the counter Postgres uses for serial and identity columns — advancing it isn't undone by rollback).

## Two type guards against the silent-commit bug

**Goal:** close the loop on the seam's failure mode. A test that threads `tx` wrong — queries the global `db` inside the transaction — *silently commits real rows* and the rollback is a no-op on them. Two structural guards make that bug impossible to ship quietly. This is the senior-mindset payoff of the lesson.

**Content:**
- Name the bug precisely: inside `withRollback`, a production function that reaches for the imported singleton `db` instead of the passed `tx` runs *outside* the test's transaction. Its writes commit. The rollback rolls back nothing of theirs. The test may still pass (it asserted via `tx`, which can't see the committed row — or worse, leaks state into the next test). This is the same class of failure as mocking the DB: the test looks like an integration test and isn't.
- **Guard 1 — the `DbOrTx` type.** The canonical, current shape (verified against Drizzle discussion #3271) defines the transaction type once and unions it with the singleton's type:
  ```ts
  type Transaction = PgTransaction<
    NodePgQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >;
  type DbOrTx = typeof db | Transaction;
  ```
  Use `typeof db` for the database side rather than re-deriving `NodePgDatabase` generics — it's cleaner and sidesteps a known `$client`-missing incompatibility when a bare `PgTransaction` is assigned to a `NodePgDatabase` parameter (Drizzle issue #3140). Every query helper and every threaded function takes `DbOrTx`, not the concrete `db` type. Because both the singleton and a transaction satisfy it, production and test both type-check — but it documents the contract ("this function might run inside a transaction") and is the type the lint rule keys off. One sentence on why the union and not just `db`'s type: it makes "called on `tx`" a first-class, expected shape rather than a coincidence. (Downstream version note: some recent Drizzle releases rename `PgTransaction` → `PgAsyncTransaction`; verify the import against the project's pinned Drizzle version before writing the type.)
- **Guard 2 — the lint rule.** ESLint `no-restricted-imports` forbids importing `@/db/client` (the singleton) from any `*.int.test.ts` file. An integration test physically cannot reach the global `db` — it has only the `tx` the wrapper hands it. The rule turns "I accidentally used the wrong handle" from a silent runtime bug into a red squiggle at author time. Tie it back to the lesson's thesis: *a test that passes despite not threading `tx` is the same bug as one that mocks the DB — both must be made loud.*
- One line on the `.int.test.ts` suffix as the discriminator the whole tooling chain relies on: it's what the `integration` Vitest project globs (from chapter 086), what the lint rule targets, and what keeps a unit test from being accidentally promoted into the slow lane. `invoice.test.ts` is unit; `invoice.int.test.ts` is integration.

**Components:**
- `CodeVariants` for the bug itself — two tabs, "Wrong: queries the global db" (imports `db`, calls `createInvoice(input)` with no handle inside `withRollback` → prose: *commits a real row; the rollback is silent on it*) vs. "Right: threads tx" (`createInvoice(input, { db: tx })` → prose: *the write is inside the transaction and rolls back*). This is the single most important watch-out in the lesson; the A/B makes the silent failure visible. Use `del=`/`ins=` to mark the differing line.
- A short `Code` block (lang `ts`) showing the `DbOrTx` type and a one-line `Code` (lang `json` or `js`) showing the `no-restricted-imports` rule entry, so both guards are concrete.

**Tooltips (`Term`):** `no-restricted-imports` (an ESLint rule that bans specific import paths from specific files), `PgTransaction` (Drizzle's type for the handle inside a `db.transaction` callback).

## Closing reality check

**Goal:** a brief consolidation, not a new concept. Reassert the mental model and the cost trade so the student leaves with the through-line.

**Content (keep to a few sentences, no new mechanism):**
- The model in one breath: real test Postgres, production schema, every test wrapped in a transaction that always rolls back, `tx` threaded through production as an explicit handle, two guards (the `DbOrTx` type and the lint rule) that make the silent-commit bug loud.
- The cost in one breath: 20-80ms per test, two orders of magnitude over a `/lib` unit test and two orders *under* truncate-and-reseed. That's the price of catching the column-rename, the constraint violation, and the schema drift a mock cannot see — and it's the right price for the seam layer where the bugs actually live (the honeycomb argument from chapter 086, now in code).
- One forward sentence: lesson 2 wires the database this pattern assumes — per-worker isolation, migrations, the baseline seed — so that `db.transaction` has a real, migrated connection to open.

**Components:** Optionally an `ExternalResource`/`LinkCard` to Drizzle's transactions doc and/or the Vitest test-context docs for the curious. No exercise — the section is a wrap. Keep it short.

# Scope

**This lesson teaches:** the integration-vs-unit boundary (litmus rule only); the transaction-rollback-per-test pattern and *why* it beats truncate-and-reseed; the `withRollback` helper and its sentinel mechanism; threading `tx` through production via the explicit `{ db = defaultDb }` handle; AsyncLocalStorage as the route-handler escape hatch (mechanism + boundary, not an applied handler test); what does *not* roll back (sequences, `pg_notify`, triggers, external side effects); the `DbOrTx` type and the `no-restricted-imports` lint guard; the `.int.test.ts` convention as the discriminator. One running example: `createInvoice`/`invoices`.

**Explicitly out of scope — do not teach, reference as forward pointers only:**
- **Test-DB lifecycle** — Docker Compose, `globalSetup`, per-worker `test_wN` databases, `VITEST_POOL_ID`, `drizzle-kit migrate` against the test DB, the baseline seed step, `.env.test`, `fsync=off` tuning, Neon branch-per-CI-run. All of this is **lesson 2 of chapter 088**. This lesson assumes a migrated, seeded, per-worker DB already exists and that `db.transaction` opens against it. Mention this dependency in one sentence; teach none of it.
- **Auth fixtures** — `signedInAs`, cookie/session stubbing. **Lesson 3 of chapter 088.** The `createInvoice` examples here can elide auth or pass a bare user id; do not build the fixture.
- **Network-boundary mocking** — MSW, `setupServer`, `http.*`, mocking the wire vs. the SDK. **Lessons 4-5 of chapter 088.** Referenced only in "what does not roll back" as the tool for external side effects.
- **Webhook receiver testing** — signing raw bodies, `processed_events`, the applied route-handler test. **Lesson 6 of chapter 088.** The ALS section sets up the mechanism that lesson uses; it does not test a handler.
- **Server Action end-to-end testing** — calling exported actions with auth + MSW + assertions on `Result`/`revalidatePath`/`NEXT_REDIRECT`. **Lesson 7 of chapter 088.**
- **Flake taxonomy** — `--shuffle`, `--repeat`, the nine taxa. **Lesson 8 of chapter 088.** This lesson states that rollback eliminates the DB-state-leak flake class but does not enumerate the taxonomy.
- **Drizzle transaction basics** (what a transaction *is*, ACID, savepoints) — taught in **Unit 5**. Assume the student knows `db.transaction(async (tx) => ...)` commits on resolve. Redefine in one phrase only: "Drizzle commits when the callback resolves, rolls back when it throws" — that single fact is the load-bearing prerequisite and is worth restating tersely.
- **RLS / `auth.uid()` testing** — **Chapter 11.** The multi-tenant `orgId` filter appears in examples as a constraint to test against, but RLS policy testing is not this lesson.
- **Coverage thresholds, the AAA shape, behavior-over-implementation** — **chapter 086.** Assume in hand; the examples follow AAA without re-teaching it.
- **Factories** (`buildInvoice`) and **determinism seams** (`lib/clock`, `lib/ids`) — **chapter 087.** Reuse `buildInvoice`-style factories in examples as already-known; the "assert on shape not exact ID" point connects to the determinism lesson but is taught here specifically as a *rollback* consequence (sequences advance), which is the new angle.

**Prerequisite quick-redefs (one phrase each, do not expand):** the honeycomb puts integration at the center of gravity (086); `/lib` is pure and mock-free (087); a Drizzle transaction commits on resolve and rolls back on throw (Unit 5); the `db` singleton is exported from `db/index.ts` (Data layer conventions).

# Code conventions notes for downstream agents

- **Filename:** use `src/test/db/with-rollback.ts` (kebab-case). The chapter outline's `withRollback.ts` violates the kebab-case filename rule — correct it. The *export* is `withRollback` (camelCase function), which is right.
- **Test file location divergence (deliberate, note it):** the `Code conventions.md` §Testing line says "Integration tests live in `tests/integration/`," but this chapter colocates `*.int.test.ts` next to the code under test under `src/**` (per the chapter-086 `integration` project glob `src/**/*.int.test.ts`). The chapter's `.int.test.ts` suffix convention is the governing decision for Unit 18 and supersedes the older note for these lessons. Colocate; do not put examples under `tests/integration/`.
- **Driver:** `NodePgDatabase` / node-postgres for the local test DB. Neon's serverless driver is lesson-2 CI surface, not this lesson.
- **Handle shape:** options-object with default — `(input, { db = defaultDb }: { db?: DbOrTx } = {})`. Respects two-positional-args-max. The `db/queries/` convention says helpers "take `tx` as the first argument"; for the *action* surface taught here, the defaulted options-object handle is the shape (production calls pass nothing). Keep both consistent in examples: query helpers can take `tx` first; the action takes the options handle.
- **Types:** `type DbOrTx = ...` (use `type`, never `interface`, per TS conventions). Import types with `import type`.
- **Result/assertions:** examples assert on the row read back and, where an action returns a `Result`, on `{ ok: true }` shape (the `Result` type is from chapter 043; don't re-teach). Assert on shape, never exact IDs (the sequence consequence).
- **Formatting:** single quotes, 2-space indent, semicolons, named exports — all examples follow the baseline.
- **Comments:** rare. The only inline comment that earns its place is on the `catch` rethrow line in `with-rollback.ts` (a runtime invariant the reader can't infer: "rethrow anything that isn't our rollback signal").
