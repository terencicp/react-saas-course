# Chapter 19.2 — Pedagogical approach

## Concept 1 — `/lib` purity is what makes the daily test shape trivial

**Why it's hard.** Students arrive expecting unit tests to need elaborate setup, mocks, and `beforeEach` rituals — habits imported from older frameworks and from testing the wrong layer. The chapter only works if they internalize *up front* that a `/lib` test is short, mockless, and AAA-on-one-screen precisely because the unit is pure. Otherwise every later lesson reads as more ceremony rather than as the contract the purity earns.

**Ideal teaching artifact.** A **before/after diptych** (Concept archetype). Left panel: a "test" of a Server-Action-shaped function that needs a fake `cookies()`, a stubbed `db`, a mock email client, three `beforeEach` blocks, and a 40-line setup; right panel: the same business rule extracted as a `/lib` pure function and its three-line AAA test. No prose explaining why — the size and noise difference is the lesson. The student reads down both columns and feels the cost asymmetry before being told to name it.

**Engagement.** A short bucket sort: ten function signatures (`mapDatabaseError`, `requirePlan`, `cookies().get`, `db.query.invoices.findFirst`, `redact`, `Temporal.Now.instant`, `formatInvoiceTotal`, `auth()`, `clock.now`, `resend.emails.send`) — student drags each into "lives in `/lib`, gets a unit test" vs. "lives at the seam, gets an integration test in 19.3". The misclassifications surface the rule.

**Components.**
- `TabbedContent` or `Figure` containing two side-by-side `Code` blocks for the diptych — caption "same rule, two homes." `TabbedContent` works if vertical comparison reads better than tabs; pick side-by-side `Code` blocks inside one `Figure` for the diptych.
- `Buckets` (two columns: `/lib` unit / seam integration) for the sort.

---

## Concept 2 — Matcher selection by value shape

**Why it's hard.** Students reach for `toBe` everywhere because it's the matcher they remember. The failure mode is silent: `toBe` on an object passes a *reference* check that often coincidentally works (same factory call) and then breaks weirdly under refactor; `toEqual` on a `Temporal.PlainDate` compares opaque internal shape and gives a green pass that means nothing. The matcher-to-shape mapping is rules-with-exceptions, not memorizable from prose.

**Ideal teaching artifact.** A **matcher decision puzzle** (Pattern archetype, guided form). The student sees a short test where the assertion line is a fill-in: `expect(actual).___(expected)` with a dropdown of six matchers. Six rounds, one per shape — primitive number, deep object, partial object with extra fields, array containing a deep object, float result of a division, a `Temporal.PlainDate`. After each pick the widget reveals not just right/wrong but *what the wrong matcher would have done* — "`.toBe` passed here only because both calls returned the same cached object; mutate the input and watch it fail." The "passed for the wrong reason" exposure is the durable lesson; a static table cannot deliver it.

**Engagement.** The puzzle is itself the assessment. A follow-up `Tokens` round on a 20-line test file confirms recall: click every matcher call that's the wrong shape for its assertion.

**Components.**
- New component: **`MatcherPicker`** — inputs: a code block with one `___` slot per round, a list of matcher options, the actual/expected runtime values for each round, and per-wrong-pick explanation strings. On submit, runs the assertion in-browser and shows what the wrong matcher silently passed or failed on. Forward-links to 19.3 (seam-level matchers), 19.4 (RTL queries), and any future "wrong matcher" teaching.
- Alternative: `Dropdowns` with `___` placeholders plus follow-up prose explaining each miss; loses the "wrong matcher silently passed" demonstration.
- `Tokens` for the recall round.

---

## Concept 3 — The factory pattern replaces shared mutable fixtures

**Why it's hard.** The shared-fixture instinct (`const org = { ... }` at the top of the file) feels DRY and reads cleanly until the bug hits — and the bug doesn't hit until two tests run in parallel or in a different order. The cause is invisible at the test that breaks; the test that wrote the mutation looks fine in isolation. Students need to *see* the mutation propagate across tests before the factory pattern reads as a remedy rather than as boilerplate.

**Ideal teaching artifact.** A **wrong-by-default sandbox** (Pattern archetype, repair form). The student opens a file with three `it` blocks sharing a top-level `const org = buildOrg()`. Test A mutates `org.plan = 'pro'` mid-act. Test B reads `org.plan` expecting `'free'`. In one run order they pass; in the other they fail. The widget runs the tests in *both* orders and shows the diff. The student's job is to refactor so both orders pass — the only legal move is `buildOrg(overrides)` returning a fresh object per call. Tests turn green when the shape is right.

**Engagement.** The sandbox is itself the assessment — the green/red light from both run orders is the gradient. Follow-up `MultipleChoice`: "which of these factory definitions still leaks mutation?" with four variants (returns a cached const, mutates `defaults` instead of spreading, uses a top-level mutable array as nested default, the correct shape).

**Components.**
- `ScriptCoding` (sandpack runner) with custom test harness that runs tests in two orders and reports both. Starter contains the shared-fixture anti-pattern; passing requires the factory shape.
- `MultipleChoice` for the four-variant follow-up.

---

## Concept 4 — Factories, fixtures, seeds — three nouns the team confuses

**Why it's hard.** The three words get used interchangeably on every team, and the conflation is what produces "tests that work locally but fail in CI" or "seeds that pollute test runs." Students need a sharp, durable boundary, not a paragraph of definitions.

**Ideal teaching artifact.** A **three-column anatomy** (Reference archetype) shown as one `Figure` — a hand-SVG card per noun with three rows: *Lives where* / *Mutability* / *Used by*. Factories: `src/test/factories/`, fresh per call, every test. Fixtures: `src/test/fixtures/*.json`, frozen, only when external payload shape matters (Stripe webhook). Seeds: `db/seed.ts`, mutates a real DB, dev-only. Visually distinct columns make the cross-use bug class (a "seed" reached for in a unit test) feel structurally wrong.

**Engagement.** `Buckets` round with twelve concrete artifacts (a captured Stripe webhook JSON, `buildInvoice`, `drizzle-seed` script populating 10k rows, `anExpiredInvoice()` helper, etc.) dragged into the three columns.

**Components.**
- `Figure` wrapping a hand-coded SVG three-column comparison. Single-use, no forward-link — hand-SVG is the right scope.
- `Buckets` (three-column variant if supported, else two passes) for the sort.

---

## Concept 5 — Determinism is structural, via the clock / IDs / RNG seams

**Why it's hard.** The reflex is to write `Date.now()` or `crypto.randomUUID()` inline and "deal with the test later" — by then there is no clean fix, because the call site is the unit under test. Students need to feel that the seam isn't testing ceremony; it's a *durable production architecture choice* that happens to make tests trivial. The framing has to land before the syntax of `vi.mock` or fake timers, or the syntax reads as the lesson.

**Ideal teaching artifact.** A **dependency-graph scrubber** (Concept archetype, scrollytelling form). Three stages, advanced by a `DiagramSequence`. Stage 1: a function reading `Temporal.Now.instant()` directly — arrows from the function into a "wall clock" node colored red ("uncontrolled input"). Stage 2: the same function reading `clock.now()` — the arrow now lands on a `lib/clock.ts` box that fans out to production (real Temporal) and test (frozen instant); both fans are present in the same diagram. Stage 3: a "what changes when" toggle showing the same setup unlocks backfills, replay tooling, virtual-time debugging — the seam pays beyond tests. The student scrubs back and forth between the three stages to internalize *seam, not mock*.

**Engagement.** `MultipleChoice` round: "which of these is a seam violation?" with four code excerpts — one inlining `Date.now()`, one passing `clock` as a parameter, one calling `Temporal.Now.instant()` inside a `/lib` function, one using `crypto.randomUUID()` inline.

**Components.**
- `DiagramSequence` with three `DiagramStep` panels containing `ArrowDiagram` content per stage.
- `MultipleChoice` for the follow-up.

---

## Concept 6 — Fake timers patch `Date`, not `Temporal.Now` — and the seam closes the gap

**Why it's hard.** Students see `vi.useFakeTimers()` and assume it patches everything time-shaped. It doesn't patch `Temporal.Now`; tests then mysteriously read real time even with fake timers "on." The right mental model isn't "Vitest is broken" but "Temporal's clock is decoupled from `Date` *by design*, and the clock module seam from Concept 5 is the durable bridge."

**Ideal teaching artifact.** A **side-by-side simulator** (Mechanics archetype). Two minimal test panes; a top toolbar with `vi.useFakeTimers()` ON, `vi.setSystemTime('2026-05-14T00:00:00Z')` applied. Left pane: `Date.now()` and `new Date()` — both report the frozen instant. Right pane: `Temporal.Now.instant()` — still reports today's real wall clock. The student then flips a second toggle: "use `clock.now()` (mocked)" — the right pane snaps to the frozen instant. The behavior is the lesson; no paragraph required.

**Engagement.** `TrueFalse` round of six statements: "`vi.useFakeTimers()` patches `Temporal.Now.instant()` directly" (F), "`vi.setSystemTime` affects `Date` but not `Temporal.Now`" (T), "`vi.mock('@/lib/clock', ...)` is the durable pattern for Temporal" (T), etc.

**Components.**
- New component: **`TimerPatchDemo`** — inputs: a fixed system time, toggles for `useFakeTimers` and `clockMock`, three live-evaluated expressions (`Date.now()`, `new Date().toISOString()`, `Temporal.Now.instant().toString()`). Re-evaluates on toggle. Forward-links to 19.2.5 (microtask flushing) and 19.3 (integration time control). If forward use stays limited, demote to hand-SVG four-quadrant figure showing each toggle combination.
- Alternative: a `Figure` with a 2x2 matrix (fake-timers on/off × clock-seam on/off) showing what each cell yields for `Date` vs. `Temporal`. Static, no runtime cost.
- `TrueFalse` for recall.

---

## Concept 7 — Injection vs. module mock — picking the seam shape

**Why it's hard.** Both shapes work. Students who learn one default to it forever. The decision turns on API friction and call-site count, not on dogma. Without an explicit threshold, the choice gets made by accident.

**Ideal teaching artifact.** A **decision card** (Decision archetype). One `Figure` with a two-column comparison: shape, signature impact, test ergonomics, when it earns its weight. Default: injection for `/lib` helpers with two or three call sites. Flip: `vi.mock` when threading `clock` through ten signatures would be friction. The card lists the flip threshold explicitly.

**Engagement.** Three short scenarios in `MultipleChoice`: each presents a function and its call sites; the student picks injection or module-mock for each, with one-line justification revealed on submit.

**Components.**
- `Figure` with a hand-authored SVG or table comparing the two seam shapes.
- `MultipleChoice` for the scenarios.

---

## Concept 8 — Type-level tests are first-class tests

**Why it's hard.** Students treat types as "the compiler's job" and tests as "the runner's job," and never test types. The result: a refactor widens a discriminated union, drops a brand, or weakens a `Result` generic — and ships green. They need a moment where a runtime-green test plus a type-red test catches a regression neither could catch alone.

**Ideal teaching artifact.** A **broken-refactor walkthrough** (Pattern archetype). A `DiagramSequence` of three states of one file. State 1: `type Invoice = Draft | Sent | Paid`, a `processInvoice` switch covering all three, all runtime tests green. State 2: a teammate adds `Cancelled` to the union; the switch doesn't handle it. Runtime tests stay green (no test exercises `Cancelled`); `tsc --noEmit` still passes (no exhaustiveness check). The bug ships. State 3: with `expectTypeOf(processInvoice).parameters.toEqualTypeOf<[Invoice]>()` in `processInvoice.test-d.ts`, the type-test now fails the build because the new shape no longer matches the consumer's pinned shape. The scrubber lets the student see "this is the moment the type-test caught what the runtime-test could not."

**Engagement.** `Tokens` on a small `.test-d.ts` file — click the lines that constitute the type assertion (vs. import noise vs. comments). Lock in *what a type-test looks like* before the syntax lesson.

**Components.**
- `DiagramSequence` with three `DiagramStep` panels — each step shows two side-by-side `Code` blocks (union + consumer + runtime tests + type tests) with the diff highlighted.
- `Tokens` for the recall.

---

## Concept 9 — `expectTypeOf`: equality vs. assignability

**Why it's hard.** `.toEqualTypeOf<T>()` and `.toMatchTypeOf<T>()` look interchangeable but assert different things — bidirectional equality vs. one-way assignability. The wrong matcher hides regressions: `toMatchTypeOf` lets a widened type pass; `toEqualTypeOf` rejects valid structural matches. The mental model is set theory, not API memorization.

**Ideal teaching artifact.** A **type-relationship explorer** (Mechanics archetype). A `TypeCoding` exercise with two type aliases the student edits (left pane). The right pane runs four assertions automatically: `A toEqualTypeOf B`, `A toMatchTypeOf B`, `B toMatchTypeOf A`, `A toBeAssignableTo B`. As the student widens or narrows `A`, the four assertion lights flip independently. After three rounds the relationships are felt, not memorized.

**Engagement.** `Matching` round: four type relationships ("`UserId` and `string`," "`Result<T, never>` and `{ ok: true; data: T }`," "`Draft | Sent` and `Invoice`," etc.) matched to which `expectTypeOf` matcher passes/fails for each.

**Components.**
- `TypeCoding` for the explorer (already supports Twoslash and type-only assertions).
- `Matching` for the recall.

---

## Concept 10 — The forgotten-`await` trap

**Why it's hard.** This is the single most damaging async-test failure mode: tests silently pass under Vitest 3, the regression ships, the fix happens months later. Students need to *witness* a test that returns a green check while the assertion never ran — and they need the demonstration before they trust the `await expect(...).resolves` shape. Telling them "always await" without the visceral failure does not stick.

**Ideal teaching artifact.** A **silent-pass ambush** (Pattern archetype, misconception-first form). Two paragraphs of setup; then a single test rendered in a runner that *actually executes* under both Vitest 3 and Vitest 4 semantics, side by side. The test reads `expect(fetchInvoice('id_1')).resolves.toEqual({ id: 'id_1' })` — *no `await`*. The function actually rejects (returns a 404). The v3 column shows a green pass; the v4 column shows a red fail. The student sees the same code, two outcomes. Then they edit the test to fix it — the v3 pass and v4 pass should *both* be green, and `expect.assertions(1)` makes the trap impossible regardless of version.

**Engagement.** The artifact carries the assessment. Follow-up: `Tokens` round clicking every missing-`await` and every missing `expect.assertions(n)` across three short async tests.

**Components.**
- New component: **`VersionedTestRunner`** — inputs: a test source string, a stub for the function under test, two semantic modes (`vitest-v3` and `vitest-v4`). Renders two columns of run results from the same source. Forward-links to 19.2.5's other async traps, 19.3.7 (Server Actions async testing), 19.3.8 (flake taxa includes unawaited promises). Genuine recurring need.
- Alternative: side-by-side `Code` blocks inside a `Figure` with hand-authored "PASS"/"FAIL" badges and prose explaining what v3 and v4 each do — loses the live demonstration.
- `Tokens` for the recall round.

---

## Concept 11 — Microtask vs. macrotask: why the `*Async` timer variants exist

**Why it's hard.** Students reach for `vi.advanceTimersByTime(5000)` and find the assertion *after* it fails — even though "the timer fired." The cause is the event loop's split between macrotask queue (where `setTimeout` lives) and microtask queue (where awaited promises resolve). Without a mental model of the queue split, the `*Async` variants look arbitrary.

**Ideal teaching artifact.** A **two-queue visualizer** (Concept archetype, controllable simulation). Two queues drawn side by side — macrotask (top) and microtask (bottom). A simple async function under test: `await sleep(1000); await fetchInvoice(); doWork()`. Three buttons drive the demo: `advanceTimersByTime(1000)` (synchronous variant), `advanceTimersByTimeAsync(1000)` (async variant), `await Promise.resolve()` (manual microtask flush). Each button moves tasks visibly from queue to "executed." After `advanceTimersByTime` the timer's callback runs but the chained `.then` is still pending in the microtask queue — `doWork` hasn't run. After `advanceTimersByTimeAsync` the microtasks drain between ticks and `doWork` runs. The animation makes the abstraction physical.

**Engagement.** `PredictOutput` round: three short test snippets with fake timers; for each, "after this line runs, is `doWork` complete?" with explanation revealed on submit.

**Components.**
- New component: **`EventLoopQueues`** — inputs: a task script (sequence of async/timer steps), buttons to advance time or flush microtasks. Renders queue contents and execution log. Forward-links to 19.3.5 (MSW handler timing), 19.3.8 (flake from real timers), and any future concurrency content. Strong forward weight.
- Alternative: animated hand-SVG `Figure` showing the queue state at three frozen points (before advance, after sync advance, after async advance) — loses the interactivity but conveys the model.
- `PredictOutput` for the recall.

---

## Concept 12 — The two-path rule: every behavior gets a success and a documented failure test

**Why it's hard.** Students write the success test, move on, and the unhappy path stays untested forever. The bias is psychological — the success case is what they were building toward. The rule has to feel obligatory, not aspirational, and the "documented failure" framing has to be clear (every thrown error and every `Result.err` code is part of the contract, not an edge case).

**Ideal teaching artifact.** A **contract-reading drill** (Concept archetype). One function signature, fully documented: `function parseInvoice(input: unknown): Result<Invoice, ValidationError | ParseError>`. The student is shown the function and asked: "how many tests minimum?" Wrong answers — one ("just the happy path"), two ("happy + one error") — get the right rebuttal: every documented error code is its own behavior. The reveal shows four tests: success, `ValidationError` for malformed input, `ParseError` for unparseable shape, and the boundary case where both could apply but only one is correct. The exercise lands the rule by making the student *count*.

**Engagement.** A second function with three documented error codes; the student sorts test cases (`Buckets`) into "needed," "redundant," "missing." The missing-bucket recall is the lock-in.

**Components.**
- `Figure` with the documented function signature and the four-test reveal — single-use, hand-SVG composition is the right scope.
- `Buckets` for the second-function drill.

---

## Concept 13 — Assert class and code, never user-facing message

**Why it's hard.** `toThrow('Invalid email')` reads naturally and passes today. It breaks tomorrow when the message is i18n'd or rephrased. The lesson is to treat the message as a presentation detail and the class + code as the contract. The misconception is durable because the string-matching style is what students see in tutorials.

**Ideal teaching artifact.** A **fragility timeline** (Pattern archetype). Three snapshots of the same test file at days 1, 30, 90. Day 1: `toThrow('Email must be a valid RFC 5322 address')` — green. Day 30: copy team tweaks the message to "Enter a valid email." — test fails despite zero behavior change. Day 90: i18n lands and the message is now a key, not a string — test catastrophically fails for every locale. Side-by-side with the message-string test, the alternative — `toThrow(ValidationError)` plus `toMatchObject({ ok: false, error: { code: 'INVALID_EMAIL' } })` — stays green across all three days. The timeline shape makes "stability through abstraction" feel like the obvious choice.

**Engagement.** `ScriptCoding` exercise: a test file with five message-coupled assertions; the student rewrites each to a class/code assertion against the same `Result`/throw shape; the harness runs the original test against a "future message edit" and the rewrite, showing the rewrite's stability.

**Components.**
- `DiagramSequence` (three steps: day 1 / day 30 / day 90) with `Code` blocks per step.
- `ScriptCoding` (sandpack runner) for the rewrite exercise. Use a custom `toBeErrResult`/`toBeOkResult` matcher shim in the test runtime to mirror the chapter's `src/test/matchers/result.ts` convention.

---

## Component proposals

- **`MatcherPicker`** — code block with `___` matcher slots; on submit, runs the assertion live and shows what each wrong matcher would have done (silent pass vs. fail).
  - Uses in this chapter: Concept 2.
  - Forward-links: 19.3 (seam matchers including `toMatchObject` shapes), 19.4 (RTL query selection has the same "wrong tool, silent pass" failure mode). Recurring.
  - Leanest v1: one round, hardcoded actual/expected values, three matcher options, server-side pre-computed "what would have happened" strings per wrong pick. Skips live evaluation. Still teaches the "passed for the wrong reason" lesson if the explanation strings are sharp.

- **`TimerPatchDemo`** — toggles for `useFakeTimers`, `setSystemTime`, and `clockMock`; live-evaluates `Date.now()`, `new Date()`, `Temporal.Now.instant()` and renders all three.
  - Uses in this chapter: Concept 6.
  - Forward-links: 19.2.5 (microtask flushing under fake timers), 19.3 (integration tests that need time control across the seam). Modest forward weight — single-chapter recurrence.
  - Leanest v1: a static 2x2 grid (`useFakeTimers` × `clockMock`) showing what each cell yields; no live evaluation, no toggles. If this v1 reads as enough to land the patching-gap insight, prefer it; if students need to *witness* the toggle to internalize the gap, build the dynamic version.

- **`VersionedTestRunner`** — same test source executed under v3 and v4 semantics, two-column pass/fail.
  - Uses in this chapter: Concept 10.
  - Forward-links: 19.2.5 (every async trap), 19.3.7 (Server Action async testing), 19.3.8 (flake taxa). Strong forward weight; this is the most reusable proposal in the chapter.
  - Leanest v1: hardcoded test scenarios (no editor), two columns, server-side pre-rendered v3-pass/v4-fail outcomes per scenario. Loses editability but keeps the visceral two-column demonstration.

- **`EventLoopQueues`** — visualized macrotask + microtask queues; buttons to advance time, advance time async, or flush microtasks; per-step execution log.
  - Uses in this chapter: Concept 11.
  - Forward-links: 19.3.5 (MSW handler timing), 19.3.8 (real-clock flake), Chapter 13/15 (queues, rate limits, retries). Strong forward weight.
  - Leanest v1: an animated hand-SVG `Figure` showing three frozen snapshots — pre-advance, post-`advanceTimersByTime` (microtask still queued), post-`advanceTimersByTimeAsync` (drained). If three frames lands the model, this is sufficient; the controllable widget is the upgrade if students struggle to map the static snapshots to the runtime behavior.

## Build priority

`VersionedTestRunner` is the priority build: highest forward-link weight (every async lesson in 19.2 and 19.3 cashes it in), and the v3-vs-v4 silent-pass demonstration is the chapter's most consequential ambush. `EventLoopQueues` is second — strong forward use across the testing unit and concurrency chapters, and the microtask gap is otherwise nearly invisible. `MatcherPicker` is third — narrower forward weight but reusable across 19.3 and 19.4. `TimerPatchDemo` is the most demote-able; if `EventLoopQueues` ships, a static 2x2 figure likely closes the Temporal-patching-gap point without a second bespoke widget.

## Open pedagogical questions

- Concept 10's `VersionedTestRunner` needs the v3-vs-v4 semantic difference to be reproducible in-browser. If maintaining two runtime shims is too costly, the fallback is a `Figure` with pre-captured CI output from both versions — credible but loses the "same code, two outcomes" punch.
- Concept 11's queue visualizer assumes Vitest's `*Async` variants behave as documented when wrapped — confirm the in-browser shim can reproduce the microtask/macrotask split faithfully, or scope the v1 to the animated SVG snapshots.
- The chapter has no project of its own; Unit 19's project is Chapter 19.6 and centers on integration tests for the Stripe webhook. The `/lib` concepts here land *as prerequisites* (factories, determinism seams, unhappy-path matchers all show up in 19.6) but no concept has a direct "lands in the project" beat — the project link is intentionally omitted from each concept above.
