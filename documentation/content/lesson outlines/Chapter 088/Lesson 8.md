# Flake has a structural cause

Title: Flake has a structural cause
Sidebar label: Flake is structural

## Lesson framing

Closing lesson of the chapter and the integration-testing arc. **Not a mechanics lesson** — almost every *fix* it names was already taught: transaction rollback (L1), `server.resetHandlers()` (L5), `vi.useRealTimers()` / the clock seam (Ch 087 L3), mock reset (L3, L7). The job here is **synthesis + diagnosis**: collapse all those scattered "reset in `afterEach`" rules under one mental model — *a flaky test is a test with leaked state or an order dependency, and both have a structural cause and a structural fix* — and add the two things the chapter hasn't covered yet: the **diagnostic tooling** (`vitest --repeat N` to quantify, `vitest --shuffle` to locate) and the **forbidden shortcut** (`--retry`, "just re-run CI").

Central thesis, stated once and returned to: **flake is not bad luck; every flake has a named cause and a structural fix.** The senior reframe is that "intermittent" is a *symptom*, never a diagnosis. The whole lesson is built to make the student reach for *cause* instead of *retry* the moment a test goes yellow.

**FLAG-ACCURACY CONSTRAINT (verified June 2026 against Vitest docs — downstream agents must not "simplify" these back to the convenient form):**
- **There is no `--repeat` CLI flag.** Repetition is the per-test/config **`repeats`** option: `it('…', { repeats: 100 }, async () => { … })`, or `test.repeats` config. (An open Vitest issue requests a CLI arg; it has not shipped — do not write `vitest run … --repeat 100`.) To quantify a flake rate, set `repeats` on the suspect test (or temporarily in config) and run that file.
- **Shuffle is `--sequence.shuffle.files` / `--sequence.shuffle.tests`** (dot-notation), not `--shuffle`. The whole-suite move is `vitest run --sequence.shuffle.files`. Per-test order randomization is `--sequence.shuffle.tests`. Config equivalents live under `test.sequence.shuffle`.
- **Seed is `--sequence.seed <seed>`** (config `test.sequence.seed`); Vitest reports the seed so a failing shuffled order replays via `--sequence.seed <reported>`.
- `--retry` (CLI) / `retry` (config) exist and behave as described; the Vitest 4.1 object form (`retry.count`/`retry.delay`/`retry.condition`) is a real surface but **out of scope** — the lesson teaches that `--retry` is forbidden for test-logic flake, not its options.
- Vitest 4: `maxWorkers` is the worker knob (`minWorkers` removed). Not central to this lesson — leave worker tuning to L2.

Target student: a junior who has built the integration suite across L1–L7 and will, in the real world, hit their first flaky test and feel the pull of `--retry` / "re-run the job." The lesson must make that pull feel like the mistake it is. Lead with **production stakes** (re-run culture, eroded CI trust, cost-per-flake math) because the *why this matters* is economic and cultural, not technical — the fixes are mostly one-liners they already know.

Mental model to leave behind: a 2×2 / two-bucket frame. **(a) State leaks** — a test mutates something (`tx`, MSW handlers, a mock impl, fake timers, a shared array, a port) that the *next* test inherits. Fix: isolate or reset, structurally, in `afterEach`/the fixture. **(b) Order / nondeterminism** — the test only passes because of run order, real wall-clock time, or `Math.random()`. Fix: remove the dependency (seam the clock/IDs/randomness, make tests order-independent) and *prove* it with `--shuffle`. Every one of the nine taxa drops into one of these two buckets — that bucketing is the load-bearing teaching device, not the list of nine.

Pedagogical spine:
1. **Hook** — the three-line story (passes alone, fails in suite, passes on re-run) + the cost math. Frame the senior question.
2. **The reframe** — "intermittent" is a symptom; flake is structural; two root buckets. This is the mental model, stated before any taxon.
3. **The taxonomy** — the nine taxa, but *organized under the two buckets*, each as cause → structural fix, most pointing back to a lesson the student already did (this is a recap, kept tight, ~one or two lines each).
4. **The diagnostic loop** — the `repeats` option quantifies the rate, `--sequence.shuffle.*` localizes order bugs; the loop is quantify → locate → fix structurally → re-prove. One worked narrative on a `createInvoice` test.
5. **The forbidden fix** — why `--retry` and "re-run it" hide bugs; the one narrow exception (infra flake); quarantine *with discipline* as the controlled release valve.
6. **Self-check** — classify-the-cause exercise + a diagnostic walker.

Keep cognitive load low: the student already owns every fix. Do **not** re-teach `withRollback`, MSW lifecycle, or fake-timer mechanics — *point* to them. Spend the new budget on the *frame* (two buckets), the *tooling* (the `repeats` option / `--sequence.shuffle.*`), and the *judgment* (`--retry` is forbidden, quarantine is a tracked debt). Running domain stays `createInvoice` / `invoices` and the `signedInAs` fixture so the examples are a continuation, not new toys.

Estimated length: 30–40 min. This is a discipline lesson; it closes the chapter and the discipline lands across every later integration test.

## Lesson sections

### Introduction (no header)

Open on the single most expensive bug a team ships: a test that **passes alone, fails in the suite, passes when you re-run it**. Name the lived experience — the red X on a PR that has nothing to do with the change, the Slack message "anyone else seeing CI flake?", the muscle-memory click on *Re-run failed jobs*. Then the senior reframe in one sentence: **that test is not unreliable — your suite has leaked state or an order dependency, and both have a structural cause and a structural fix.** State the lesson promise: by the end, the student names the cause of any flake and fixes the structure instead of re-running.

Connect to what they just built: every isolation rule from L1–L7 (rollback, `resetHandlers`, mock reset, `useRealTimers`) was *already* a flake fix — this lesson is where those rules become one idea. Keep it warm and brief; the body does the work.

### The cost of "just re-run it"

**Goal:** establish production stakes before any technique — the senior-mindset hook. Flake is taught as an *economic and cultural* failure, not a technical curiosity, because the fixes are cheap one-liners; what's expensive is the team habit that grows around tolerated flake.

Content:
- The arithmetic, concrete and small: a team merging ~200 PRs/week at a 5% per-run flake rate eats ~10 spurious red builds/week. Each one costs real CI minutes on the re-run **plus** the far larger tax — a developer context-switches out of their work to investigate a failure that was never their bug, then learns to ignore red.
- The cultural failure mode is the real cost: once "just re-run it" is normal, the suite stops being a signal. A *real* regression now hides behind the same yellow the team has trained itself to dismiss. **Tolerated flake doesn't cost you the flaky test — it costs you every other test's credibility.**
- The senior inversion: a flaky test is *worse than no test*, because a missing test is a known gap while a flaky test is a gap that lies about being covered. The bar is a measured integration-flake rate well under 1% — a number you watch, not a vibe.
- Land the thesis sentence here, bolded, so the rest of the lesson hangs off it: **every flake has a named cause and a structural fix.**

**Component:** prose-led, no diagram needed (the math is two numbers). Optionally a single `Aside` (note) carrying the "worse than no test" inversion so it reads as the quotable senior take. Keep this section short — it's the motivating frame, not the content.

### "Intermittent" is a symptom, not a diagnosis

**Goal:** install the mental model *before* the taxonomy, so the nine taxa land as instances of one idea rather than nine things to memorize. This is the load-bearing conceptual section.

Content:
- Reframe the word "intermittent." When a developer says "the test is flaky," they've named the *symptom* and stopped. The senior move is to refuse "intermittent" as a root cause and ask: **what does the failing run inherit from a run before it, or depend on, that the passing run doesn't?** Flake is *determinism you haven't found yet* — given identical inputs, code is deterministic; the hidden input is the variable.
- Introduce the two root buckets — the spine of the whole lesson:
  - **State leak** — a test leaves a mutation behind (an un-rolled-back row, a stacked MSW handler, a mock implementation, fake timers still engaged, a shared module-scope array, a held port) and the *next* test runs against the dirty state. The tell: **passes alone, fails in the suite.**
  - **Order / nondeterminism** — the test passes only because of *when* it ran (run order, real wall-clock time, a random value). The tell: **passes in one order, fails in another; passes today, fails at midnight.**
- The fix shape differs per bucket and that's the point: a **state leak** is fixed by *isolation or reset* (structurally, in a fixture or `afterEach` — never in the test body, which the next author forgets); an **order dependency** is fixed by *removing the dependency* (seam the clock/IDs/randomness, make every test self-contained) and **proven gone** under shuffle (`--sequence.shuffle.files`).

**Diagram (Figure + simple HTML/CSS two-column or ArrowDiagram):** "Symptom → two root causes → two fix shapes." Left: the symptom box ("test passes alone, fails in suite / passes one order, fails another"). It forks into two cause boxes (State leak / Order-nondeterminism), each pointing to its fix box (Isolate or reset / Remove the dependency + prove with `--shuffle`). Pedagogical goal: make the *forked* structure visual so the student internalizes "first decide which bucket, then the fix follows." Keep it horizontal and short (well under the 800px cap). Author boxes as custom HTML inside `<Figure>`; if connector lines help, use `<ArrowDiagram>`.

**Term tooltips here:** `flake`/`flaky test` (re-define crisply — non-deterministic pass/fail with no code change), `isolation` (each test sees a clean world), `nondeterministic`.

### The nine causes, two buckets

**Goal:** the taxonomy as a *reference table the student can scan when a real test goes flaky*, deliberately organized under the two buckets from the previous section so the structure reinforces the model. This is mostly **recap** — seven of the nine fixes were taught earlier in the chapter or in Ch 087 — so keep each entry to cause → fix in one or two lines and cross-link the lesson that owns the mechanics. Resist re-teaching.

Present as two grouped lists (one per bucket), not a flat nine. Suggested rendering: a `Figure` wrapping a styled two-column table or two `Card`s (one per bucket), each listing its taxa as *cause → structural fix → where it was taught*. A `CardGrid` of two cards reads well and keeps it scannable.

**Bucket A — state leaks (reset/isolate structurally):**
1. **DB-state leak** — `signedInAs` or a factory called *outside* `withRollback` commits real rows that every later test sees. Fix: every test body runs inside `withRollback`; the `tx` rollback is the isolation (L1, L3).
2. **MSW handler leak** — a per-test `server.use(...)` override survives into the next test. Fix: `server.resetHandlers()` in `afterEach`, wired once in the integration `setupFiles` (L5).
3. **Mock-implementation leak** — `vi.mocked(auth.api.getSession).mockResolvedValue(...)` set in test A still answers in test B. Fix: `vi.resetAllMocks()` (or a targeted `mockReset`) in `afterEach`; note that `setupFiles`-level mocks are *not* auto-reset — you name the reset (L3, L7).
4. **Timer leak** — `vi.useFakeTimers()` with no `vi.useRealTimers()` in `afterEach`; fake time carries forward and a later "after 1s" test hangs to the timeout. Fix: always restore real timers in `afterEach` (Ch 087 L3).
5. **Port collision** — two suites (or a stray dev server) bind the same port; whoever loses flakes. Fix: dedicated test ports (the test Postgres on 5433 per L2) and per-worker DBs so workers can't contend.
6. **Shared mutable module state** — a top-of-file `const seen = []` (or any module-scope singleton) mutated by tests. Fix: declare capture arrays *inside the test body*, never at module scope (the L5 `seen`-inside-the-test rule generalized); the factory + `tx` pattern is the structural answer.

**Bucket B — order / nondeterminism (remove the dependency, prove with `--sequence.shuffle.files`):**
7. **Order dependency** — test B only passes because test A ran first (left a row, set a mock, advanced a sequence). Fix: make every test self-contained; surface the bug with `vitest run --sequence.shuffle.files`.
8. **Real-time clock** — code reads `Date.now()` / `new Date()` directly, so a test asserting on time passes by day and fails near a boundary (or near midnight). Fix: read time through the clock seam (`lib/clock.ts`) and freeze it in tests (Ch 087 L3); the L6 stale-timestamp webhook test is the worked instance.
9. **Inline randomness / unstable data** — `Math.random()`, `crypto.randomUUID()`, or `Date.now()` inline in production or test data, so values differ run to run and an assertion occasionally lands wrong. Fix: route randomness/IDs through their seams (`lib/random.ts`, `lib/ids.ts`); assert on *shape* (`expect.stringMatching`, `expect.any`), never exact sequence-derived IDs (L1's "assert on shape, sequences advance and don't roll back" rule).

Close the section by naming the meta-pattern: **all six "reset in `afterEach`" rules are the same rule** — leaked state is the bug class, structural reset is the fix; **all three nondeterminism rules are the same rule** — a hidden non-deterministic input is the bug class, a seam is the fix. The nine collapse to two.

**Exercise — `Buckets` (classify the cause):** present ~8–10 chips, each a *short failing-test symptom or a one-line code smell* ("`signedInAs` called before `withRollback`", "`server.use` with no `afterEach` reset", "asserts `row.id === 5`", "`vi.useFakeTimers()` and no `useRealTimers`", "production code calls `Date.now()` directly", "module-scope `const seen = []`", "test B fails when run before test A", "`Math.random()` in the input factory"). Two buckets: **State leak** / **Order or nondeterminism**. Goal: drill the *first* decision of the diagnostic loop — which bucket — because that decision selects the fix shape. Two-column layout, custom instructions framing it as triage. This directly rehearses the mental model rather than testing recall of the nine names.

### Finding the cause: repeats and shuffle

**Goal:** the genuinely **new mechanics** of the lesson — the diagnostic loop that turns "it's flaky sometimes" into a located, reproducible cause. Everything before this was frame and recap; this is the tool the student doesn't have yet. **Write the flags exactly per the accuracy constraint above** — `repeats` is a test option, shuffle is `--sequence.shuffle.*`.

Content, taught as a four-step loop:
1. **Quantify with `repeats`.** "Flaky sometimes" is unactionable; a *rate* is actionable. There is no `--repeat` CLI flag — you set the per-test **`repeats`** option on the suspect and run just that file: `it('creates an invoice', { repeats: 100 }, async () => { … })`, then `vitest run path/to/create-invoice.int.test.ts`. A `3/100` failure is a 3% flake rate. Quantify *before* investigating: the rate tells you whether you've actually reproduced it, and re-running after a fix candidate tells you whether the fix worked (100/100 green is the bar, not "seems fine now"). The senior instinct is **never debug a flake you can't reproduce on demand** — `repeats` is how you force reproduction. (Mention in one line that config-level `test.sequence.shuffle`/`repeats` exist for whole-suite runs; the per-test option is the debugging reach.)
2. **Localize order bugs with shuffle.** A leak that only fires in a specific order is invisible to repeating a single file in source order. `vitest run --sequence.shuffle.files` randomizes file execution order (`--sequence.shuffle.tests` randomizes order *within* a file); a green suite that goes red under shuffle *is* an order dependency or a cross-file leak — proof, not suspicion. Vitest prints the **seed** on failure so the exact failing order replays deterministically via `vitest run --sequence.shuffle.files --sequence.seed <reported>`; reproducibility is the whole point. The senior reach: enable `test.sequence.shuffle` on a schedule (every CI run, or at minimum a weekly job) so order dependencies surface the day they're introduced, not months later.
3. **Read the bucket off the symptom.** Reproduces under `repeats` in source order → state leak within the file or genuine nondeterminism; clean alone but red under shuffle → order dependency / cross-file leak. The tool you reproduced it with already narrows the bucket.
4. **Fix structurally, then re-prove.** Apply the bucket's fix (reset/isolate, or seam/remove-dependency), then re-run with `repeats` (and shuffle) until green. The fix isn't done when the test passes once; it's done when it *can't* fail under the tool that caught it.

**Diagram — `DiagramSequence` (the diagnostic loop):** scrub through the four states on one worked `create-invoice.int.test.ts` example.
- Step 1: the symptom — CI shows the test red on a PR that didn't touch it; locally it's green. Caption: "intermittent" is where most people stop.
- Step 2: add `{ repeats: 100 }` to the test and run the file → `7/100 failed`. Caption: a rate, on demand — now it's reproducible and it's a state leak (it fires in source order).
- Step 3: read the cause — the test set `vi.mocked(auth.api.getSession).mockResolvedValue(adminSession)` and `setupFiles` has no `resetAllMocks` in `afterEach`, so an earlier test's admin session bleeds in. Caption: name the taxon — mock-implementation leak (bucket A).
- Step 4: the structural fix — add `afterEach(() => vi.resetAllMocks())` once in `setupFiles`; re-run with `repeats: 100` → `100/100`. Caption: fixed in the fixture, not the test body; re-proven, not hoped.
Pedagogical goal: show the loop as a *temporal* process the student scrubs, so "quantify → locate → fix → re-prove" becomes a sequence they can replay mentally, anchored to a concrete leak they already understand from L7.

**Code:** the shuffle commands as small `Code` (bash) blocks inline with their step; the `{ repeats: 100 }` test-option form as a small `Code` (ts) block (this is the load-bearing accuracy detail — it is an option object on `it`, not a CLI flag). The fix itself is two lines — show the `afterEach(() => vi.resetAllMocks())` addition as a small `Code` (ts) block; it needs no `AnnotatedCode` (the diagram already walks it). Keep code minimal — the lesson's weight is the *loop*, not the snippet.

**Term tooltips:** `repeats` (per-test option, run a test N times to measure a flake rate), `--sequence.shuffle.files`, `seed` (the value that makes a shuffled order replayable).

### Why --retry is forbidden

**Goal:** the judgment payload — the single most important *don't* of the lesson, framed (per guidelines) as a senior decision with stakes, not a scold. `--retry` is the tempting tool that converts a real bug into green CI; the student must leave viscerally unwilling to reach for it.

Content:
- What `--retry N` does: re-runs a failing test up to N times and reports green if any attempt passes. It looks like a fix for flake. It is the **opposite** of a fix — it takes the suite's one honest signal (this test is non-deterministic) and *silences* it. The flake is still there; you've just stopped being told. Tie back to the cost section: `--retry` is "just re-run it" promoted to config, applied to *every* test, forever.
- The deeper harm: retry doesn't only hide the flaky test — it hides the *category*. A real intermittent regression (a genuine race in production code the test correctly catches one run in twenty) now passes under retry exactly like a leaked mock would. You've configured your suite to lie about a class of real bugs.
- The course rule, stated flatly: **`--retry` on test-logic flake is forbidden.** The fix for a flaky test is always the structural fix from the bucket it belongs to.
- The one narrow, named exception so the rule is credible: **infrastructure flake** — the CI runner's network blips pulling an image, a container that occasionally needs a second to accept connections, an external sandbox timing out. That is genuinely outside your test's determinism, and a *scoped* retry on *that boundary* (e.g. the container-startup step, not the test suite) is legitimate. The line: retry the **infrastructure**, never the **test logic**. If retry is making *your code's* test pass, it's hiding your bug.

**Component:** a `CodeVariants` two-tab A/B is the sharp way to teach this. Tab "Reach for --retry" (`vitest run --retry=3`, or `retry: 3` in config) — prose: green builds, hidden bug, eroded signal; the flake count silently climbs. Tab "Find the cause" (`{ repeats: 100 }` on the test, then the structural fix) — prose: the flake is *gone*, not muted. The contrast makes "retry hides, repeats reveals" a single glance. (Keep the flags accurate per the constraint: `--retry` is real; the repetition side is the `repeats` *option*, not a `--repeat` flag.)

### Shipping with a flake you can't fix yet

**Goal:** the realistic release valve so the lesson isn't dogmatic — sometimes a flake hits `main` and the fix isn't immediate, and the student needs a *disciplined* way to keep the line green without normalizing "just re-run it." Teaches quarantine as **tracked debt**, the controlled alternative to both blocking the team and tolerating flake.

Content:
- The situation: a flake is failing builds on `main`, the team is blocked, and the root cause needs real investigation time you don't have this hour. Reverting the test's value to "always re-run" (i.e. `--retry`) is the wrong release valve — it's permanent and silent.
- The disciplined move: **quarantine, with a leash.** Skip the test *visibly* — `it.skipIf(process.env.CI)('…', …)` so it still runs locally, or move it to an excluded `*.flaky.test.ts` lane the integration project's glob doesn't pick up. The difference between quarantine and `--retry` is that quarantine is *loud and finite*: the test is visibly skipped (not silently passing), and **every quarantined test carries an owner and a tracking issue link in a comment**. Quarantine without a follow-up issue is just `--retry` with extra steps — it's debt you've decided to forget.
- The senior framing: quarantine buys *time to do the structural fix*, it is never the fix. A quarantine list that only grows is a suite rotting in slow motion; the health metric is that the list trends to zero.

**Component:** prose-led with one small `Code` (ts) block showing the `it.skipIf(process.env.CI)` form *with the mandatory owner + issue-link comment* in place — the comment is the load-bearing part of the example, so it reads as "this is what a responsible quarantine looks like," not "here's how to skip a test." An `Aside` (caution) carries the one-liner: *quarantine without a tracking issue is `--retry` with extra steps.*

### Diagnose the flake (self-check)

**Goal:** consolidate the whole lesson — given a *symptom*, walk to the *cause* and the *structural fix*, rehearsing the senior's question order (reproduce → bucket → taxon → fix) rather than recalling trivia.

**Exercise — `StateMachineWalker` (`kind="decision"`, diagnostic funnel):** the walker doc names exactly this use case ("production is slow — where is the time going?" generalized). Funnel:
- Root question: "A test is failing intermittently. First move?" Branches → "Re-run the job until green" (→ a *corrective* leaf: that's the habit this whole lesson exists to break; reproduce on demand instead) / "Reproduce it on demand with `repeats`" (→ continues).
- Next: "It reproduces under `repeats` in source order. What does that point to?" Branches → "A state leak within the run" (→ continue) / "An order dependency" (→ leaf: then it'd be clean under `repeats` and red under `--sequence.shuffle.files` — re-check the tool).
- Next: "Which leaked?" Branches to leaves naming each bucket-A taxon and its structural fix (un-rolled-back rows → `withRollback`; stacked MSW handler → `resetHandlers` in `afterEach`; leaked mock impl → `resetAllMocks` in `afterEach`; fake timers → `useRealTimers` in `afterEach`).
- A parallel branch from the root for the shuffle-only case → order dependency → "make the test self-contained; prove by replaying the failing order with `--sequence.shuffle.files --sequence.seed <reported>`."
- Each `<Leaf verdict>` names the structural fix in a few words; the body says *why* it's structural (in a fixture/`afterEach`, not the test body) and links the lesson that owns the mechanics. Goal: the student practices *the order the senior asks questions in* — reproduce before theorize, bucket before taxon — which is the durable skill; any single leaf is just a pointer back to a fix they already know.

Optionally precede with a couple of `TrueFalse` statements to catch the two highest-value misconceptions crisply ("`--retry` is an acceptable fix for a flaky integration test" → false; "a test that passes alone but fails in the suite has a state leak" → true) — but the walker is the primary self-check; don't over-stack.

### External resources (optional)

One or two `ExternalResource` cards if a current, authoritative page fits: the Vitest **`sequence` config** page (`vitest.dev/config/sequence` — documents `shuffle`/`seed`), the **`retry` config** page (`vitest.dev/config/retry`), and the **CLI guide** (`vitest.dev/guide/cli` — the `--sequence.shuffle.*` flags) as the canonical reference for what the lesson teaches; the `repeats` option lives on the **Test API** page (`vitest.dev/api/test`). Optionally the Vitest test-isolation / improving-performance guide. Only include if they're current and add reference value beyond the lesson; skip rather than pad. No YouTube video — the content is short, judgment-heavy, and reference-shaped; a video adds length without teaching the *decision* better than the walker does.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `withRollback` / `tx` (L1) — the per-test transaction that rolls back every write; named as the fix for the DB-leak taxon, mechanics not re-explained.
- MSW `server` lifecycle (L5) — `resetHandlers()` in `afterEach`; named as the fix for the handler-leak taxon only.
- The clock/IDs/randomness seams `lib/clock.ts` / `lib/ids.ts` / `lib/random.ts` (Ch 087 L3, Code conventions) — named as the fix for the nondeterminism taxa; seam construction is Ch 087's, not re-derived here.
- `signedInAs` (L3) and `next/cache` / mock reset (L7) — named as the fix for the mock-impl-leak taxon.
- Per-worker DBs / port 5433 (L2) — named as the fix for the port-collision taxon.

**Explicitly out of scope (defer, do not cover):**
- The rollback pattern's internals, MSW API surface, fake-timer mechanics — owned by L1, L5, Ch 087 L3 respectively; this lesson *points*, never re-teaches.
- `expect.assertions(n)` and the forgotten-`await` failure mode in unit tests — Ch 087 L5 (the unawaited-promise hazard is named in the taxonomy as a one-liner pointing back there; not re-developed).
- **CI infrastructure flake at depth** — matrix builds, caching, JUnit reporters, the GitHub Actions wiring that *surfaces* flake rates and retry counts — Chapter 097. This lesson names "scoped retry on infra is the one exception" and "watch the flake rate as a metric" but does not build the CI that measures it.
- **Playwright / E2E flake** — Chapter 090. The structural-cause framing transfers, but browser-specific flake (auto-waiting, locator races, trace-based debugging) is that chapter's.
- `it.concurrent` parallelism within a file — mention at most one line if needed (it's off by default and risky when tests share fakes); the chapter's default is sequential-within-file, so it isn't a flake source the student will hit. Do not develop it.
- Tooling beyond Vitest's own surface (flaky-test trackers, third-party dashboards) — out of scope; the lesson is the `repeats` option / `--sequence.shuffle.*` / `--retry` and the discipline around them.

**Convention note for downstream agents:** integration tests are colocated as `src/**/*.int.test.ts` (Ch 086 glob) — this *supersedes* the `tests/integration/` location in `documentation/code standards/Code conventions.md` (Testing section), per the chapter continuity notes. The Code conventions thesis line — "Flake has a structural cause. `--retry` is forbidden. `--shuffle` and `--repeat` to locate; fix the structure." — is the canonical one-sentence summary of this lesson; align with it exactly. Running domain remains `createInvoice` / `invoices` / `signedInAs` to keep examples continuous with L1–L7.
