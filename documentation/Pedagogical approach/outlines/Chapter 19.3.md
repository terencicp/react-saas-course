## Concept 1 — Why mocking the DB lies

**Why it's hard.** A test that mocks Drizzle proves the call shape, not the behavior. Column nullability, default values, unique constraints, RLS, and the SQL Drizzle actually emits are invisible to the mock — so the regression that breaks production survives the green suite. Students who built confidence in unit tests have to feel the gap before they accept the ms-not-µs cost.

**Ideal teaching artifact.** A *misconception-first ambush* (new archetype: **Trap**). Open with a confident-looking action test where `db` is mocked with `vi.fn()`; the student is invited to predict the result of a hidden production change. Three rounds: (a) a developer renames `invoices.due_at` to `invoices.dueAt`, (b) someone adds a `NOT NULL` to `org_id`, (c) a unique constraint lands on `(org_id, external_id)`. After each prediction, the artifact reveals *what the mocked test reports* (still green) and *what a real-Postgres test reports* (red, with the actual SQL error). The point lands before any pattern is named.

**Engagement.** A short `Buckets` sort after the ambush: ten code paths, sorted into "mocked DB catches this" vs. "only real DB catches this" (FK violation, JSON column type drift, computed column wrong, function-call shape change, etc.).

**Components.**
- New: `MockVsRealComparison` — side-by-side panel showing the same test under a mocked-DB column vs. a real-DB column. Inputs: a schema change descriptor + the test body. Renders two terminal-style outputs. Used here and credibly forward in 19.4 (component mocking traps) and 19.5 (E2E vs. mock divergence).
- `Buckets` for the follow-up sort.

**Project link.** The webhook-and-Checkout project in 19.6 lives or dies on schema-aware integration tests; this concept is the reason that scaffolding exists.

---

## Concept 2 — Transaction rollback as the isolation primitive

**Why it's hard.** Students reach for `beforeEach(truncate)` or `afterEach(deleteAll)` and watch the suite slow to a crawl. The mental flip is seeing a transaction as a *test boundary*, not a database feature — every test opens one, the wrapper throws a sentinel, Postgres unwinds the writes for free.

**Ideal teaching artifact.** A *scrubbable timeline* (Concept archetype) showing what happens inside one `withRollback` test: t=0 `BEGIN`, t=5ms `INSERT user`, t=10ms `INSERT invoice`, t=15ms assertions read the rows, t=20ms sentinel throws, t=21ms `ROLLBACK`. At each step the student sees two views side-by-side: the *transaction's view* (rows visible) and the *outside world's view* (rows invisible). Scrubbing forward shows the assertions pass; scrubbing past the sentinel shows the outside-world view stays empty. The transactional invariant becomes visual rather than verbal.

**Engagement.** `PredictOutput` immediately after: given a tiny test that does `tx.insert(...)` then `tx.select(...)`, what does the second select return inside the transaction? After rollback, what does a fresh `db.select(...)` see? Two prompts, two answers.

**Components.**
- `DiagramSequence` carrying a hand-SVG per step (two-pane: inside-tx vs. outside-tx state tables). Existing components cover this cleanly — no new build needed.
- `PredictOutput` for the recall round.

**Project link.** Every integration test in 19.6 — happy-path, replay, tamper — runs inside this wrapper.

---

## Concept 3 — The `tx` seam through production code

**Why it's hard.** The rollback is silent on writes made via the singleton `db`. Students will reach for the default import out of habit, the test passes (because the assertion is on the return value), and real rows leak into the test DB. The teaching has to make the *seam itself* visible — production accepts a `DbOrTx`, the test passes `tx`, anything else commits.

**Ideal teaching artifact.** A *wrong-by-default sandbox* (Pattern archetype, played as a guided puzzle). Two production files are open: `createInvoice.ts` calls `db.insert(...)` directly; its test passes `tx` to the *wrapper* but the inner function ignores it. The student watches a counter pane: "rows leaked into `test_w1` after this run." After each test it ticks up. The student's job is to refactor `createInvoice` to accept `{ db = defaultDb }` and use the injected handle. When done correctly, the counter stays at zero. A second round drops the `DbOrTx` type and lets the student feel the compile-time backstop kick in.

**Engagement.** The sandbox carries the assessment. After it, one `Tokens` round on a finished file: click every place `tx` flows through, click the one accidental `db.` that would commit (decoy).

**Components.**
- `ReactCoding` (target-match mode) with a "leaked rows" counter wired through tests — the student edits production code, the test runner reports `tx`-respecting behavior. This is a stretch of `ReactCoding`'s assertion surface; the alternative is a hand-coded sandbox showing the leak count in a separate pane.
- New (alternative): `LeakCounterSandbox` — Vitest-style runner in browser that tracks writes outside `tx`. Forward-links to 19.3.6 (dedupe inside `tx`) and 19.3.7 (action wrapper). Worth proposing only if the bespoke `ReactCoding` stretch turns out awkward.
- `Tokens` for the follow-up.

**Project link.** 19.6's `processed_events` dedupe and side-effect writes must share `tx` — the seam is the load-bearing pattern.

---

## Concept 4 — What does not roll back

**Why it's hard.** Rollback is a leaky abstraction. Sequences advance and stay advanced. `pg_notify` fires. `fetch` calls already left the process. Students who assume "rollback undoes everything" write assertions on `id === 1` and watch them fail every other Tuesday.

**Ideal teaching artifact.** A *taxonomy table with worked failure* (Reference, but each row is clickable to a 3-line failing test). Six rows: sequence values, `pg_notify`, triggers, external `fetch`, queue enqueues, file writes. Clicking a row reveals the test that *looks like it works* and the assertion that flakes — sequence assertion failing on second run, `pg_notify` listener firing in a sibling worker. Each row ends in the fix (assert on shape, mock at boundary, in-memory stub).

**Engagement.** `TrueFalse` round across the six categories: "rollback undoes the sequence advance" (false), "rollback undoes the `INSERT`" (true), "the MSW handler observed the `fetch` after rollback" (true — fetch already happened), etc.

**Components.**
- `TabbedContent` with one tab per category, each tab carrying a small failing `Code` block and the fix.
- `TrueFalse` for the recall round.

---

## Concept 5 — Per-worker database isolation

**Why it's hard.** Vitest parallelism plus a single Postgres database equals racing migrations, advisory-lock fights, and "works alone, fails in parallel" flake. The mental model is *one logical database per worker, keyed by `VITEST_POOL_ID`* — each worker owns its sandbox; nothing crosses worker boundaries.

**Ideal teaching artifact.** A *system diagram* (Concept archetype): one `globalSetup` process at the top spawning N workers, each worker connecting to its own `test_w{id}` database, each running its own migration pass. The diagram is annotated with the lifecycle: when migrations run, when seeds run, when handlers reset, what's per-worker vs. per-test. Critically, a toggle flips between "shared DB" (red arrows showing collisions) and "per-worker DB" (clean green arrows) — the student feels the architectural force of the choice.

**Engagement.** `Matching` exercise: lifecycle hook (`globalSetup`, `setupFiles`, `beforeAll`, `beforeEach`, `afterEach`) ↔ what runs there (Docker, migrations, MSW listen, `tx` open, `resetHandlers`).

**Components.**
- `Figure` wrapping a hand-authored SVG with the toggle implemented as a small inline `<details>` or two `Figure`s in a `TabbedContent`. Single-use, no forward-link — keep static.
- `Matching` for recall.

---

## Concept 6 — `globalSetup` vs. `setupFiles`

**Why it's hard.** These look the same in the config file but run in entirely different processes and at different times. Putting migrations in `globalSetup` runs them once for the whole suite against a database that doesn't exist yet; putting Docker bring-up in `setupFiles` runs it N times. Wrong hook, wrong lifetime.

**Ideal teaching artifact.** A *decision table* (Decision archetype) with three columns: the work (Docker up, DB create, migrate, seed baseline, open Drizzle pool, register MSW, open `tx`), where to put it, why. Each row has a one-line "if you put it in the wrong hook, here's what breaks." This is short prose-and-table — no widget needed.

**Engagement.** `Buckets` two-column sort: a list of setup operations dragged into "globalSetup" vs. "setupFiles" vs. "beforeEach" — the third decoy bucket catches students who conflate worker-level with test-level.

**Components.**
- Plain prose plus a Markdown table; `Buckets` for the sort. No new component.

---

## Concept 7 — Test-DB performance tuning and the Neon-branch trigger

**Why it's hard.** Students assume "real Postgres = slow." They don't yet know that production durability settings are the cost, not Postgres itself. And they don't yet know when the cheap local construction stops scaling — at which point Neon's copy-on-write branching becomes the conditional move.

**Ideal teaching artifact.** A *cost-shape figure* (Decision archetype) showing four bars: mocked unit (5ms), real-DB with default fsync (200ms), real-DB with `fsync=off` (20ms), truncate-and-reseed (500ms). The bars are annotated with what each cost buys. Below, a single threshold sentence: "when the local seed exceeds 5s or assertions need production-shaped row counts, swap to Neon branch per CI run." The Neon path is a Setup/wiring callout, not a topic to dwell on.

**Engagement.** One `MultipleChoice`: given a team profile (seed time, data-shape needs, RLS depth), which construction earns its weight?

**Components.**
- `Figure` wrapping a hand-SVG bar chart. Single-use here; no forward-link.
- `MultipleChoice`.
- A separate `Aside` (`tip`) for the Neon trigger so it reads as conditional reach.

---

## Concept 8 — `signedInAs` as the one-call auth context

**Why it's hard.** Without a fixture, every test re-implements the session: a mock of `next/headers`, a fake cookie, a hand-built session row, a forgotten `orgId`. Copy-paste drift produces tests that "auth correctly" against five different fictional auth surfaces.

**Ideal teaching artifact.** An *anatomy diagram* (Concept archetype) of one `signedInAs({ role: 'admin', plan: 'pro' }, tx)` call: arrows fanning out to (a) `INSERT users` inside `tx`, (b) `INSERT sessions` inside `tx`, (c) `cookies()` mock implementation set, (d) `auth()` mock resolved value set. Each arrow has a "what would break without this" annotation. Hovering one fan-out arrow dims the others — the student inspects one responsibility at a time.

**Engagement.** A `Tokens` round on a five-line test that uses `signedInAs`: click the responsibilities the fixture covers, *not* the ones the test still owns (the per-test factory call, the action invocation, the assertion).

**Components.**
- `Figure` with hand-SVG; hover dimming is CSS-only — no new component needed.
- `Tokens` for recall.

---

## Concept 9 — Stub at the right seam

**Why it's hard.** Students mock too deep (the JWT library, Auth.js internals) or too shallow (a global `auth` const). Both break: the deep mock shatters on library updates, the shallow one leaks across tests. The seam to mock is `await auth()` / `await cookies()` — Next.js's surface to the action.

**Ideal teaching artifact.** A *layered diagram* (Concept archetype) showing the auth call stack: action body → `await auth()` → Auth.js → JWT verify → crypto. Each layer is labeled "mock here?" with Yes/No and a reason. The two valid layers (`auth()` and `cookies()`) are green; the others red. A toggle switches between three test variants — mock at `auth()` (course default), mock at JWT (breaks on `next-auth` minor), mock with a real cookie + real `auth()` (works but slow). The student sees each variant's cost.

**Engagement.** `MultipleChoice` with a scenario: "the test mocks `jsonwebtoken`. What breaks?" Distractor answers cover the wrong failure modes.

**Components.**
- `Figure` with hand-SVG of the layered stack; `TabbedContent` for the three variants.
- `MultipleChoice`.

---

## Concept 10 — Mock the wire, not the SDK

**Why it's hard.** The seductive move is `vi.mock('stripe', ...)` — fast, easy, asserts the function call. It ships a fictional Stripe. The reach is to mock at `fetch` so the SDK's serialization, signing, retry, and parsing stay under test — but students need to *see* what they lose by mocking too high.

**Ideal teaching artifact.** A *peel-the-onion comparison* (new archetype: **LayerPeel**, paragraph-length but distinctive). One Server Action; three test setups stacked: (1) mock the inner function — what coverage area shrinks, drawn as a shaded region over the call stack; (2) mock the SDK class — shrinks less, but the SDK's request building, idempotency-key generation, error mapping fall out of scope; (3) mock at `fetch` via MSW — only the network leaves coverage. Each setup is annotated with a real production bug it would miss (Stripe v1's form encoding, the missing `Idempotency-Key`, the retry-on-502 pattern). The shaded-coverage visual makes the choice concrete.

**Engagement.** `Buckets` sort: ten responsibilities (URL path, idempotency header, retry on 502, request signing, response decoding, internal call-site shape, response status branching, body shape, headers, telemetry) into "covered by mock-fetch" vs. "covered by mock-SDK" vs. "covered by mock-function." Students should see the rightmost bucket holds almost nothing useful.

**Components.**
- New: `CoverageOverlay` — call-stack diagram with shaded regions toggled per test setup. Inputs: stack layers, per-setup mask. Used in this chapter; forward-links to 19.4 (component-test depth) and 19.5 (E2E coverage triangle). Worth building.
- Alternative: three side-by-side `Figure` blocks with hand-SVG overlays, no toggle. Same teaching, less interaction.
- `Buckets` for recall.

---

## Concept 11 — MSW v2 in practice

**Why it's hard.** MSW is the daily reflex for outbound HTTP, but it has a lifecycle (listen / reset / close), a handler-precedence model (defaults plus `server.use` overrides), a sequencing trick (`{ once: true }`), and a request-capture pattern (`request.clone()` then assert later) — and the v2 API diverges from every online snippet older than late 2023.

**Ideal teaching artifact.** A *guided puzzle* (Mechanics archetype as guided sandbox). The student is dropped into a Server Action test for `createSubscription` against Stripe. Five increments: (a) get the happy-path handler to return 200 with a canned URL; (b) add an `Idempotency-Key` assertion using `request.clone()`; (c) override a single test to return 400 via `server.use`; (d) make the test exercise SDK retry by chaining two `{ once: true }` 503s before a 200; (e) flip `onUnhandledRequest: 'error'` and watch a URL typo turn from silent pass to loud fail. Each increment ships with a failing test and a tiny edit. The student writes one to three lines per step.

**Engagement.** The puzzle carries the assessment. A follow-up `Sequence` drill orders the MSW lifecycle hooks (`listen`, `resetHandlers`, `use`, `close`) into their correct positions in setup/teardown.

**Components.**
- `ScriptCoding` (or `ReactCoding` with the test-mode runner) hosting the five-step puzzle. The runner needs to surface MSW request captures — feasible with the existing assertion plumbing.
- New (alternative): `MswSandbox` — bespoke runner with a "wire log" pane showing intercepted requests. Forward-links to 19.4 (jsdom MSW) and 19.5 (Playwright route mocking).
- `Sequence` for the follow-up.

**Project link.** 19.6's webhook tests don't use outbound MSW directly, but the Checkout Playwright path in 19.6.5 inherits the same boundary discipline.

---

## Concept 12 — Webhook receivers: signing the raw bytes

**Why it's hard.** Webhook tests have a sneaky bug: sign the parsed JSON, send `JSON.stringify(payload)` — the bytes differ, the signature fails, and the student "fixes" it by skipping the verification step instead of fixing the test. The point of the test is to catch *that exact bug class in production*; getting it wrong in the test inverts the value.

**Ideal teaching artifact.** A *byte-level diff* (Concept archetype, two beats). First beat: a side-by-side panel showing two byte sequences — `JSON.stringify(parsed)` and the original wire string — with the *one differing byte* highlighted (a whitespace, a key order, a number-vs-string serialization). The HMAC of each is shown; they differ. The student sees that signature verification is bytewise. Second beat: a small worked sequence — fixture file → `sign(payload, secret, timestamp)` → `new Request(url, { body: rawString, headers })` → handler `POST` — with each arrow annotated "same bytes throughout."

**Engagement.** `PredictOutput` on three variants: (a) handler reads `request.text()`, test passes the raw string — predict pass/fail; (b) handler reads `request.json()` then re-stringifies for verification — predict pass/fail; (c) middleware parses body before handler — predict pass/fail.

**Components.**
- New: `BytePairDiff` — two-row monospaced view with byte-index highlights and an HMAC display per row. Inputs: two strings, a secret. Used here; forward-links to Chapter 13 (Stripe receiver) and any future signed-payload material (S3 presigned URLs, GitHub webhooks). Worth building — signature material recurs in 13 and 8.
- Alternative: hand-SVG inside `Figure` showing the two strings with a single character circled and the two HMAC values below — same teaching, no interaction.
- `PredictOutput` for recall.

**Project link.** 19.6.3 ("the happy-path webhook test") and 19.6.4 ("replay and tamper tests") are this concept made into deliverables.

---

## Concept 13 — Idempotency through `processed_events` inside `tx`

**Why it's hard.** Three things have to be true at once: the dedupe insert is part of the same transaction as the side effect, the dedupe is keyed on `event.id` (not a hash, not the timestamp), and the replay path returns 2xx so Stripe stops retrying. Students get one or two of the three.

**Ideal teaching artifact.** A *two-call sequence diagram* (Concept archetype) showing the receiver under replay: call 1 — `BEGIN`, `INSERT processed_events ON CONFLICT DO NOTHING RETURNING id`, returning a row, run side effect, `COMMIT`. Call 2 (same payload) — `BEGIN`, `INSERT processed_events ON CONFLICT DO NOTHING RETURNING id`, returning empty, *short-circuit*, return 200, `COMMIT` (or `ROLLBACK`). The two columns make the short-circuit explicit; a callout highlights the empty `RETURNING` as the dedupe signal.

**Engagement.** `MultipleChoice` (multi-correct): "which of these break replay-safety?" — options include "dedupe outside the transaction," "dedupe on a hash of body," "dedupe on `event.id` but return 500 on replay," "side effect before dedupe insert." The student picks the three that break and leaves the one that holds.

**Components.**
- `Figure` wrapping a Mermaid sequence diagram (two parallel actors: Stripe and Receiver) — Mermaid handles this cleanly.
- `MultipleChoice`.

**Project link.** 19.6.4's tamper-and-replay tests assert on `processed_events` directly.

---

## Concept 14 — Server Action through the full wrapper

**Why it's hard.** The action wrapper does six things: parse, auth, plan-gate, execute, revalidate, return `Result`. Testing the inner function skips five of them. The branches multiply — happy, validation-fail, unauth, forbid, plan-gated, redirect — and each branch has its own assertion shape.

**Ideal teaching artifact.** A *branch atlas* (Pattern archetype): a tree diagram of the action wrapper showing the six branches as leaves, each annotated with (a) how to set up the precondition (`signedInAs` shape, input shape, mock state), (b) the assertion code, (c) the DB state. A toggle picks one branch and surfaces a complete reference test on the side. The student internalizes the *shape* — six leaves, six test files in their head — before writing any of them.

**Engagement.** `Dropdowns` on a partially-blank test file with five blanks: which `signedInAs` role, which assertion matcher (`toBeOkResult` / `toBeErrResult`), which error code, which DB assertion, which `revalidatePath` expectation. Five blanks across five lines.

**Components.**
- `Figure` with hand-SVG of the branch tree; `TabbedContent` for the six reference tests indexed by leaf.
- `Dropdowns` for recall.

**Project link.** Indirectly — 19.6 focuses on the webhook side, but the action-wrapper shape recurs in every later chapter that ships a feature with tests.

---

## Concept 15 — Flake taxonomy

**Why it's hard.** "Flaky test" sounds like a property of the test. It isn't. Every flake has a structural cause from a closed set — DB leak, timer leak, MSW leak, mock-impl leak, real clock, unawaited promise, random data, port collision, order dependency. Students who don't carry the taxonomy reach for `--retry` and hide the bug.

**Ideal teaching artifact.** A *clinical diagnosis flow* (new archetype: **Diagnostic**). The student is shown a symptom — "this test passes alone, fails in suite, passes on re-run" — and walks a decision tree: did the previous test leave mock implementation behind? did fake timers leak? does the test share a port? Each branch lands on one of the nine taxa with the structural fix. The artifact is replayed for two more symptoms ("fails 1 in 10 runs" → `--repeat 100` quantify, then localize) and ("CI fails on Tuesday only" → real clock or quota). The decision tree *is* the teaching.

**Engagement.** `Matching` exercise: nine symptoms ↔ nine taxa ↔ nine structural fixes. Three-column matching forces the student to walk both directions of the lookup.

**Components.**
- New: `DiagnosticTree` — clickable decision tree with leaf nodes. Inputs: tree spec (node label, branches, leaf payload). Used here; forward-links to 19.5 (Playwright flake) and Unit 21 (CI flake diagnosis). Worth building if 19.5 and 21 will reuse — credible reuse.
- Alternative: hand-SVG decision tree inside `Figure`, with leaf nodes expanding through `<details>` blocks. Single-page teaching, no interaction.
- `Matching` for recall.

---

## Concept 16 — `--shuffle` and `--repeat` as audits, never `--retry`

**Why it's hard.** Vitest exposes three flags that look adjacent. `--shuffle` surfaces order dependency, `--repeat N` quantifies flake rate, `--retry` papers over both. Teams reach for `--retry` because it makes CI green; it also costs trust over weeks.

**Ideal teaching artifact.** A *side-by-side ledger* (Decision archetype). Three columns, one flag each, four rows: what it does, what it *measures*, what it *hides*, when to reach for it. The `--retry` column is mostly red — except for one cell ("CI infrastructure flake, never test logic"). Below the ledger, two terminal snippets show the workflow: `vitest run --shuffle` weekly + `vitest run --repeat 100 path/file.int.test.ts` on a suspect file.

**Engagement.** `TrueFalse` round: five statements like "`--retry 3` is a reasonable response to a 5% flaky test" (false), "`--repeat 100` should run on every CI build" (false — local triage tool), etc.

**Components.**
- Plain prose plus a Markdown table; `Code` blocks for the terminal commands.
- `TrueFalse` for recall.

---

## Component proposals

**`MockVsRealComparison`** (Concept 1)
- Sketch: side-by-side panel rendering the same test under a mocked-DB column and a real-DB column. Inputs: schema-change descriptor, test body. Renders two terminal-style outputs.
- Uses in this chapter: Concept 1.
- Forward-links: 19.4 (component mocking traps), 19.5 (E2E vs. mock divergence). Credible reuse.
- Leanest v1: two static `Code` blocks inside a custom `Figure` showing terminal output for one schema change; no schema-change toggle. The toggle is the v2 reach.

**`LeakCounterSandbox`** (Concept 3, alternative)
- Sketch: in-browser Vitest-flavored runner that tracks writes happening outside `tx`, surfaces a leak counter alongside test results. Inputs: production files, test files, schema.
- Uses in this chapter: Concept 3 (only if `ReactCoding`'s assertion surface won't carry it).
- Forward-links: 19.3.6 (dedupe inside `tx`), 19.3.7 (action wrapper) — both reuse the same `tx`-respecting harness.
- Leanest v1: `ReactCoding` target-match mode with a custom assertion that fails when the leak counter is non-zero; the counter renders inside the existing output pane. If this v1 works, the bespoke build is unnecessary.

**`CoverageOverlay`** (Concept 10)
- Sketch: a call-stack diagram with shaded regions togglable per test-setup variant. Inputs: stack layer labels, per-setup mask, per-setup caption.
- Uses in this chapter: Concept 10.
- Forward-links: 19.4 (component-test depth), 19.5 (E2E coverage triangle). Strong reuse.
- Leanest v1: three sibling `Figure` blocks with pre-baked SVG masks, no toggle. Teaches the same point at lower fidelity; the toggle adds engagement, not the lesson.

**`BytePairDiff`** (Concept 12)
- Sketch: two-row monospaced view with byte-index highlight and per-row HMAC display. Inputs: two strings, a secret.
- Uses in this chapter: Concept 12.
- Forward-links: Chapter 13 (Stripe receiver implementation), Chapter 8 (Resend events) — signature material recurs.
- Leanest v1: a pre-rendered SVG figure inside `Figure` showing one byte difference and two HMAC values. No interaction. The teaching lands; the interaction is comfort.

**`MswSandbox`** (Concept 11, alternative)
- Sketch: in-browser MSW-aware runner with a "wire log" pane showing intercepted requests for after-the-fact assertion.
- Uses in this chapter: Concept 11 (only if `ScriptCoding`'s output pane can't surface request captures cleanly).
- Forward-links: 19.4 (jsdom MSW), 19.5 (Playwright route handlers).
- Leanest v1: `ScriptCoding` with custom assertion helpers that print captured requests into the existing output panel; no dedicated wire-log UI.

**`DiagnosticTree`** (Concept 15)
- Sketch: clickable decision tree; nodes are questions, leaves carry diagnosis + fix payload. Inputs: tree spec.
- Uses in this chapter: Concept 15.
- Forward-links: 19.5 (Playwright flake taxonomy), Unit 21 (CI flake). Strong reuse.
- Leanest v1: hand-SVG tree inside `Figure` with `<details>` reveals for each leaf — same content path, no click-tracking. Acceptable if the chapter ships before 19.5.

---

## Build priority

Three components carry the heaviest teaching load across this chapter and forward into 19.4, 19.5, and Unit 21.

1. **`CoverageOverlay`** — anchors the chapter's load-bearing decision (mock the wire, not the SDK) and the same visual reapplies in 19.4 and 19.5 to argue what each test layer covers. Build first.
2. **`DiagnosticTree`** — flake taxonomy returns at every higher test layer; a clickable diagnostic tree is the engagement form that prevents the taxonomy from reading as a list. Build second.
3. **`BytePairDiff`** — narrower in scope (signed-bytes material), but recurs in Chapter 13 and Chapter 8, and the byte-level point doesn't land in prose alone. Build third.

`MockVsRealComparison` is appealing but its forward-links are softer; its leanest v1 is close to the full version, so the bespoke build is a judgment call. `LeakCounterSandbox` and `MswSandbox` are demoted to alternatives — both pass the single-use discipline only if the `ReactCoding`/`ScriptCoding` stretch works; the v1 reduction in each is dramatic enough to start there.

---

## Open pedagogical questions

- Concept 3's wrong-by-default sandbox depends on `ReactCoding` (or `ScriptCoding`) surfacing a "rows leaked into the DB outside `tx`" assertion. If the runner can't host a Postgres connection (PGlite is excluded by the chapter's "real Postgres" stance), the sandbox falls back to a contrived counter — confirm whether a worker-side PGlite is acceptable as a teaching prop even though it's banned as a test target.
- The byte-pair diff for Concept 12 needs a real HMAC computation in the page. SubtleCrypto in-browser works, but a stale-cache pitfall exists when the secret is editable — confirm whether the secret is fixed in the figure or editable.
- Concept 15's `DiagnosticTree` overlaps with whatever Unit 21 builds for CI-flake triage. If Unit 21 owns the broader taxonomy, this chapter's tree should be scoped to test-logic taxa only; if not, the same component carries both. Decide before building.
