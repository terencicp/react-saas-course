# Async tests without the forgotten-await trap

- Title (h1): Async tests without the forgotten-await trap
- Sidebar label: Async tests

## Lesson framing

This is a mechanics lesson. The single highest-value takeaway: **an async assertion that isn't awaited silently passes** — and under Vitest 4 (the course's pinned version) it now fails loudly, but the student must understand *why* so they write the awaited shape reflexively, not because a tool nags them. Every async test in the rest of the suite uses the shape this lesson installs.

Target student: a junior dev who has written `async`/`await` against fetches and Server Actions (Code conventions: `async`/`await` uniformly, `Promise.all`, `AbortSignal`) and who, as of Lessons 1–4 of this chapter, can already write a pure-function test, a factory, pin the clock, and write a type-level test. What they have *not* met is the failure mode where a green checkmark is a lie. That gap is the whole lesson.

Pedagogical spine, ordered to minimize cognitive load:

1. **Lead with the lie.** The opening must *show* a forgotten-`await` test passing against code that is provably broken. Shock first, mechanism second. This is the "senior question" the lesson answers, framed as production stakes: a broken refund function ships because its test was green.
2. **Two prevention layers, taught in order of how often they're reached for.** First the canonical positive/negative form (`await expect(p).resolves` / `.rejects`) — the everyday shape. Then `expect.assertions(n)` as the *insurance* for branchy try/catch tests where the await point is easy to skip past. Don't bundle them; they solve different shapes of the same bug.
3. **Then the microtask layer.** Fake timers + promises is the genuinely hard part and where even experienced devs get stuck. It builds on Lesson 3's `vi.useFakeTimers()` mechanics (already taught) and adds *only* the async delta: the `*Async` timer variants and the microtask/macrotask mental model. Keep the timer-setup machinery in the background (Lesson 3 owns it) and spend the budget on *why* `advanceTimersByTime` leaves a promise unresolved.
4. **Close with the async toolkit** the student will actually need: `rejects.toThrow` for the unhappy path (shallow — Lesson 6 owns the depth), `try/catch` + `expect.fail` for multi-field error inspection, `AbortSignal` cancellation tests, and `Promise.allSettled` for parallel-effect assertions.

Mental model the student should leave with: *a test function is only as truthful as its awaits — the runner can only judge what it waits for.* And: *promises live on the microtask queue; advancing fake timers ticks the macrotask queue; an async chain spanning both needs the `*Async` variants to drain both.*

Tone per pedagogical guidelines: adult, terse, decisions-first. No "what is a promise." The student knows promises; they don't know how the test runner's awaiting contract interacts with them.

Component strategy at a glance (detailed per section):
- A `DiagramSequence` is the centerpiece for the microtask-flush mental model — this is a temporal, step-by-step execution trace, exactly its use case.
- `CodeVariants` for every before/after (forgotten vs awaited; sync-timer vs async-timer) — the A/B framing is the pedagogy.
- A `PredictOutput` drill cements the silent-pass: the student predicts a test *result*, not stdout, and is surprised.
- `ScriptCoding` (vanilla runner) for a hands-on flush exercise, with a hard caveat about its shim (below).
- `AnnotatedCode` for the `expect.assertions(n)` branchy-test walkthrough.

**Critical authoring constraint — the `ScriptCoding` shim.** Per `script-coding.md`, the vanilla runner's `expect` shim supports only `toBe / toEqual / toBeTruthy / toBeFalsy / toBeCloseTo / toThrow / toContain` (+ `.not`). It has **no** `.resolves` / `.rejects`, **no** `expect.assertions`, and **no** `vi.useFakeTimers`. The Sandpack runner bundles npm but still is not Vitest — it's the same jest-flavoured shim. Therefore: **do not author a sandbox that asks the student to call `.resolves`, `expect.assertions`, or `vi` APIs — it cannot run them.** Any live-coding exercise must be reframed to plain promise/microtask mechanics that the shim *can* run (e.g. "make this assertion observe the resolved value by adding the right await," tested via a `toEqual` on a captured variable). All Vitest-specific syntax (`.resolves`, `expect.assertions`, `*Async` timers) is taught through static `Code`/`CodeVariants` blocks and reinforced with non-coding exercises (`PredictOutput`, `Sequence`, `MultipleChoice`), never a runnable sandbox.

## Lesson sections

### Introduction (no header)

Per pedagogical guidelines, the intro is warm, brief, states the goal and the concrete problem. Frame the senior question implicitly through a scenario: a `/lib` function `refundCharge` returns a promise; the test reads `expect(refundCharge(charge)).resolves.toBe(true)` with no `await`. The function is buggy — it resolves `false` — yet the test is green and the bug ships. State the lesson's promise: by the end, the student writes async tests whose green is *earned*, and understands the one trap (forgotten `await`) that makes every other async-testing skill worthless if missed. Connect to prior knowledge: "you already write `async`/`await` in your app code and you've tested pure functions in this chapter — the new idea is that the *test runner* can only verify what it awaits." Name that Vitest 4 (the course's runner) now hard-fails the unawaited form, but the point is to understand it, not lean on the tool.

### The green test that ships a bug

Goal: make the silent-pass visceral before any fix. This is the motivational core.

Content:
- Show the broken pairing with `CodeVariants` (two tabs): tab "The code" = a small async `/lib` function that's wrong (e.g. returns the wrong `Result`, or resolves a rejected-intent value); tab "The test" = `it('...', async () => { expect(brokenFn()).resolves.toBe(expected); })` with the missing `await` highlighted via regex meta on `/expect/`. Prose under the test tab: this passes in Vitest 3 (warning only) and the assertion is just a dangling promise nobody waited for.
- Name the three v3 silent-pass shapes precisely (from chapter outline), best shown as a short `Code` block or three tight `CodeVariants` tabs:
  1. `expect(promise).resolves.toBe(x)` without `await` — the assertion is a returned promise the runner never awaits.
  2. `expect(promise).toBe(x)` — compares a `Promise` object to a value (always false), but the comparison's rejection is itself an unawaited promise, so it never surfaces.
  3. `it('...', () => { somePromise(); })` — the promise is neither returned nor awaited; the test body finishes "successfully" before the promise settles.
- The mechanism, stated plainly: **the runner judges a test by the promise the `it` callback returns (or by `await`ed work inside it). Work it never waits for cannot fail the test.** This single sentence is the load-bearing idea.

Exercise — `PredictOutput`, reframed as "predict the test result": present the broken function + unawaited test, and ask the student to type what the test runner reports (`PASS` or `FAIL` and why). Withhold the answer on first wrong attempt (component default). `<PredictWhy>`: explains the dangling-promise mechanism and that Vitest 4 flips this exact case to FAIL. Pedagogical goal: the surprise of "PASS against broken code" is the hook that makes the rest of the lesson stick. (Use `PredictOutput` even though output is a test verdict — the textarea-and-check loop fits; instructions clarify they're predicting the runner's report.)

Aside (`caution`): "A green test is a hypothesis, not a proof — it proves only what it awaited." Keep it one line.

Terms for `Term` tooltips in this section: **microtask queue** (where promise continuations run, drained before the next macrotask), **silent pass** / **false negative** (the term from Lesson 2's continuity — reuse it: a test that passes while the code is broken).

### `await expect(p).resolves` — the canonical form

Goal: install the everyday correct shape for both success and failure paths. This is what 90% of async tests look like.

Content:
- The fix, shown as the "after" against the previous section's "before". Prefer `CodeVariants` with `syncKey` so the broken/fixed framing carries across the page, OR a single `Code` block with `ins`/`del` if it reads cleaner. Canonical positive form (from Code conventions, verified): `await expect(p).resolves.toEqual(...)`. Negative form: `await expect(p).rejects.toThrow(...)`.
- Decompose the shape explicitly so the student knows what each piece does (a short `AnnotatedCode` is ideal here — one block, three focal points):
  - `.resolves` / `.rejects` unwrap the promise and apply the matcher to the settled value.
  - the **outer `await`** is what makes the runner wait — without it, `.resolves` returns a promise that's never observed.
  - `async () =>` on the `it` callback: the runner awaits the callback's returned promise. Default every async test to `async` even when not strictly required — future-proofs against adding an await later (chapter-outline point).
- The "return instead of await" alternative: `return expect(p).resolves.toBe(x)` works in v3 and v4 and is equivalent. State why the course prefers `await`: it composes when a test has more than one assertion (you can't `return` twice). One short `Code` block; don't over-dwell.
- Matcher reuse: `.resolves` / `.rejects` chain *any* matcher the student already knows from Lesson 1 (`toEqual`, `toMatchObject`, `toBe`). Nothing new on the matcher axis here — just say it so the student doesn't think async needs special matchers.

Exercise — `Sequence` ordering drill (the `ScriptCoding` shim can't run `.resolves`, so use a non-coding exercise here): a fixed `Code` block shows a correct awaited async test; the student orders the conceptual steps the runner takes ("call `it` callback → callback returns a promise → runner awaits it → `.resolves` unwraps the inner promise → matcher runs → result reported"). Pedagogical goal: cement that the runner's awaiting is a *chain*, and the outer await is one specific link.

### `expect.assertions(n)` for branchy tests

Goal: the insurance policy for tests where the await is easy to skip past — specifically try/catch error tests.

Content:
- The shape of test that *needs* it: a test that wraps the act in `try/catch` to inspect a thrown error. If the act doesn't throw, the `catch` block's assertions never run — and the test passes having verified *nothing*. This is the branchy-path version of the silent pass.
- `expect.assertions(n)` declares the test must run exactly `n` assertions; if it exits having run fewer (forgotten await, early return, swallowed error, no-throw when a throw was expected), the test fails with "expected n assertions, called m". Cheap insurance.
- `expect.hasAssertions()` — the looser "at least one" variant; name it, prefer the precise count when you know it.
- Use `AnnotatedCode` (one block, stepped) for the canonical branchy test:
  ```
  it('rejects an expired charge', async () => {
    expect.assertions(2);
    try {
      await refundCharge(expiredCharge);
      expect.fail('expected refundCharge to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(RefundError);
      expect((err as RefundError).code).toBe('expired');
    }
  });
  ```
  Steps: (1) `expect.assertions(2)` declares the contract; (2) the `await` in `try` — if `refundCharge` *resolves*, control falls to `expect.fail`; (3) `expect.fail('...')` guards the no-throw case so a non-throwing bug fails loudly rather than silently skipping the catch; (4) the two `catch` assertions on class + structured `code` (forward-crumb to Lesson 6 for depth on *why* class/code over message). This block does double duty: it teaches `expect.assertions` *and* previews the try/catch error-inspection pattern the next section formalizes.
- Connect to the lesson's spine: `await expect(...).rejects` is the concise form; `expect.assertions` + try/catch is reached for only when the error has *multiple fields* worth asserting. Name the decision threshold so the student doesn't reach for try/catch by default.

`color` guidance for the `AnnotatedStep`s: use `green` for the assertions-contract line, `orange` for the `await`/`expect.fail` guard, `blue` for the catch assertions.

### When fake timers meet promises

Goal: the deep trap. This is the section that earns the lesson's length. Build on Lesson 3 (student already knows `vi.useFakeTimers()`, `vi.advanceTimersByTime`, the `beforeEach`/`afterEach` pair) — teach *only* the async delta.

Content, staged simple-to-complex:

**4a. The trap, shown failing.** Code under test: `async function withRetry() { await sleep(5000); return doWork(); }` where `sleep` wraps `setTimeout` in a promise. The test does `vi.useFakeTimers()`, calls the function, `vi.advanceTimersByTime(5000)`, then asserts `doWork` ran — and the assertion fails (or `doWork`'s result isn't there yet). Show with `CodeVariants`: tab "Broken (sync advance)" vs tab "Fixed (async advance)". The fix is one character-cluster: `await vi.advanceTimersByTimeAsync(5000)`.

**4b. Why — the microtask/macrotask model.** This is the conceptual heart and the best diagram candidate in the lesson. Use a **`DiagramSequence`** (its exact use case: a temporal execution trace the student scrubs). Pedagogical goal: make visible that the timer firing and the promise resolving happen on *different queues*, one tick apart.

DiagramSequence steps (each step = a small HTML panel showing two labeled lanes, "Macrotask queue" and "Microtask queue", plus a "current line" pointer at the code, and a status chip for `doWork ran?`):
  - Step 1 — "`advanceTimersByTime(5000)` fires the timer": the `setTimeout` callback (which *resolves* `sleep`'s promise) moves off the macrotask queue and runs. Caption: the macrotask ran, but resolving a promise only *queues* its `.then`/continuation as a microtask. `doWork` has NOT run.
  - Step 2 — "the test's next line runs immediately": `vi.advanceTimersByTime` is synchronous, so the assertion executes *now*, before the microtask drains. Status chip: `doWork ran? → no`. Caption: this is the failure — the assertion sees the world one tick too early.
  - Step 3 — "with `await advanceTimersByTimeAsync`": the async variant yields to the event loop between ticks, draining the microtask queue. The continuation runs, `doWork` executes. Status chip flips to `yes`.
  - Step 4 — recap panel: "timer fires (macrotask) → promise resolves → continuation queued (microtask) → microtasks drain → `doWork` runs → assertion sees the result." The async variants do macrotask + microtask; the sync variants do macrotask only.

Author the panels as simple flexbox HTML inside each `DiagramStep` (two stacked lanes with colored pills; an arrow or highlight for the active queue). Keep height well under the 800px cap. This is a "simple visual aid," not a system graph — exactly what the diagram guidance encourages.

**4c. The `*Async` family.** Brief `Code` block listing the three the student will use and their sync counterparts:
  - `advanceTimersByTimeAsync(ms)` ↔ `advanceTimersByTime(ms)`
  - `runAllTimersAsync()` ↔ `runAllTimers()` — but reinforce Lesson 3's rule: `runAllTimers` loops forever on a self-rescheduling `setInterval`; prefer the bounded forms.
  - `runOnlyPendingTimersAsync()` ↔ `runOnlyPendingTimers()` — one round, the interval-safe choice.
  Rule: **any fake-timer test on a code path that `await`s uses the `*Async` variant.**

**4d. Flushing without timers — `await Promise.resolve()`.** When the code schedules work *outside* the timer system (`queueMicrotask`, a `.then` chain, an awaited already-resolved promise), there's no timer to advance — `await Promise.resolve()` (twice for two ticks) drains pending microtasks. State the watch-out from the chapter outline: repeated `await Promise.resolve()` as a "wait for stuff to happen" crutch is brittle — name the actual await point when you can; reach for the microtask flush only when the code genuinely schedules a bare microtask.

Exercise — `ScriptCoding` (vanilla runner), reframed to fit the shim. **Cannot use `vi` or `.resolves`.** Instead, a pure-promise microtask drill the shim *can* run: give the student a function that does `let ran = false; Promise.resolve().then(() => { ran = true; }); ` and a test that asserts `ran === true` but fails because the microtask hasn't drained; the student's task is to make the assertion observe `ran` correctly by inserting `await Promise.resolve()` (or making the test async and awaiting the chain) before the assertion. `tests` use `toBe(true)` on the captured flag. Instructions explicitly say: "this is the microtask-flush idea from the diagram, in plain promises — the same reasoning applies to `advanceTimersByTimeAsync`." Pedagogical goal: let the student *feel* the one-tick gap with code they can actually execute, since the Vitest timer APIs can't run in the sandbox. If grading proves finicky, fall back to a second `PredictOutput`.

Terms for `Term` here (some are Lesson 3 re-explanations, kept brief to not break flow): **macrotask** (a `setTimeout`/`setInterval` callback, run by the timer queue — reuse Lesson 3's definition), **microtask** (a promise continuation, drained to empty before the next macrotask), **event loop** (the scheduler that alternates between draining microtasks and running the next macrotask).

### The async unhappy-path toolkit

Goal: round out the async assertions the student needs in practice. Keep error-shape depth shallow — Lesson 6 owns "assert class/code not message" in full; here it's just the *async* mechanics.

Content (each a tight `Code` block, no heavy decomposition):
- **`await expect(p).rejects.toThrow(ErrorClass)`** — the async negative form, already previewed. Assert on the error class or a structured `code` regex, not the message string (one sentence + forward-crumb to Lesson 6). Example against a `/lib` function that returns a rejected promise on bad input.
- **`try/catch` + `expect.fail`** — already shown in the `expect.assertions` section; here just name that the async version is identical with `await` in the `try`. Cross-reference rather than repeat the block.
- **Cancellation with `AbortSignal`** — this connects directly to Code conventions ("every async function that does IO takes `{ signal }` when cancellation is reachable"). Cancellation is a *behavior*, so it gets a test. Shape:
  ```
  const controller = new AbortController();
  const p = fetchInvoice('inv_1', { signal: controller.signal });
  controller.abort();
  await expect(p).rejects.toThrow(/abort/i);
  ```
  Pedagogical note: this is the first time the student tests cancellation; frame it as "the abort path is code you wrote, so it earns an assertion." Keep the matcher loose (`/abort/i`) because the native `AbortError` name/message varies — acknowledge that lightly.
- **`Promise.allSettled` for parallel effects** — when the unit fires concurrent calls and the test asserts each outcome independently (one rejection shouldn't collapse the whole assertion). Shape: `const results = await Promise.allSettled([...]); expect(results.map(r => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected']);`. Connect to Code conventions' `Promise.allSettled` rule ("when one failure should not cancel the rest") — the test mirrors the production primitive.

Optional, only if it reads light: a one-line mention of `it.concurrent` requiring the context `expect` (`async ({ expect }) =>`) for correct attribution, and that it races when tests share fake timers or module mocks — default off. This is a niche topic from the outline; include as a single `Aside` (note) or cut if the section is already dense. Lean toward a brief Aside.

### Cleanup that survives failure

Goal: the discipline that prevents one async test's mess from poisoning the next. Short section.

Content:
- Resources opened in a test (an `AbortController`, an `setInterval`, fake timers) must be released even when an assertion throws mid-test. `try { ... } finally { controller.abort(); }`, or `afterEach` for cross-test teardown.
- The specific leak that matters most and ties back to Lesson 3: a missing `vi.useRealTimers()` in `afterEach` leaks fake time *forward* into unrelated tests — a classic run-order bug. Reuse Lesson 3's `beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers())` pair; state that the `afterEach` is non-negotiable for async-timer tests because a leaked fake clock makes later real-time async tests hang or misbehave.
- One watch-out worth its own sentence: a long `testTimeout` is a smell, not a fix — if a test needs a 30s timeout, the await structure is wrong (probably a real timer that should be faked, or a missing `*Async` flush).

Present as prose + one small `Code` block of the `beforeEach`/`afterEach` + `try/finally` pattern. No exercise.

### Recap and the rule

Goal: compress the lesson to a few durable rules. Short.

Content — a `Card`/`CardGrid` or a tight bulleted recap:
- Every async test: `it('...', async () => ...)`.
- Positive: `await expect(p).resolves.toEqual(...)`. Negative: `await expect(p).rejects.toThrow(Class)`. The outer `await` is mandatory.
- Branchy/multi-field error tests: `expect.assertions(n)` + try/catch + `expect.fail`.
- Fake timers on an awaited path: the `*Async` variants flush microtasks; the sync ones don't.
- Cancellation and parallel effects are behaviors — they get tests (`rejects.toThrow(/abort/i)`, `Promise.allSettled`).
- `afterEach(() => vi.useRealTimers())` is non-negotiable.
- The one rule under all of it: **the runner can only judge what it awaits.**

Optional `ExternalResource` LinkCards (per pedagogical guidelines' optional external-resources step): the Vitest "Testing Asynchronous Code" guide and the `expect` API page (`.resolves`/`.rejects`). Verify URLs current before linking.

### Optional video

A `VideoCallout` on the JS event loop / microtask-vs-macrotask queue would reinforce section 4's mental model well — this is a famously well-covered topic on YouTube (e.g. Lydia Hallie's event-loop visualizations, or Jake Archibald's "In The Loop"). If the resourcer finds a high-quality, current explainer, embed it in "When fake timers meet promises" right after the `DiagramSequence`. Not required; the diagram carries the concept on its own.

## Scope

**Prerequisites — redefine briefly, do not re-teach:**
- `async`/`await`, promises, `Promise.all`/`allSettled`, `AbortSignal` — from Code conventions and prior units; the student writes these already. Re-explain only the queue mechanics (micro/macrotask) because they're load-bearing for the timer trap.
- `vi.useFakeTimers()`, `vi.advanceTimersByTime`, `vi.spyOn`, the `beforeEach`/`afterEach` timer pair, the clock/IDs/RNG seams — **owned by Lesson 3 of this chapter**. This lesson assumes them and adds only the *async* timer variants and the microtask reason they're needed. Do not re-teach timer setup or the seam pattern.
- Matcher selection (`toBe`/`toEqual`/`toMatchObject`), AAA, colocation, custom matchers, the `Result<T>` shape (`{ ok, data }` / `{ ok: false, error: { code, userMessage } }` with lowercase snake codes) — **owned by Lesson 1**. Reuse, don't redefine.
- Factories (`buildCharge`/`buildInvoice` etc.) — **owned by Lesson 2**. Use them in examples without explanation.

**Deliberately excluded (belongs elsewhere):**
- Fake-timer mechanics on the *time/clock* axis (setting system time, `FROZEN` instant, Temporal-not-faked gotcha) — Lesson 3. This lesson touches timers only through the promise/microtask lens.
- Unhappy-path error-shape craft in full: `toThrow(Class)` vs message, `toMatchObject({ ok: false, error: { code } })`, custom `toBeOkResult`/`toBeErrResult`, Zod issue inspection, Postgres error-mapping tables, `Error.cause` chains, `it.fails` — **all owned by Lesson 6.** This lesson shows `rejects.toThrow` and try/catch only as *async mechanics*, with a one-line forward-crumb that "why class/code over message" is Lesson 6. Do not pre-teach Lesson 6's content.
- Type-level async assertions — Lesson 4 (already taught; not revisited).
- Integration-level async: MSW handlers, Drizzle transactions, `withRollback` — Chapter 088.
- Server Action async testing — Chapter 088 Lesson 7.
- Playwright's auto-waiting / E2E async — Chapter 090.
- Production concurrency primitives (queues, retries, rate-limit) — Trigger.dev / Unit 13–15. `AbortSignal` and `allSettled` appear here only as *units under test*, not as production patterns to design.

**Self-imposed scope guard:** keep the unhappy-path section shallow and the cleanup section short — the lesson's weight belongs on the silent-pass mechanism (sections 1–2) and the microtask/timer trap (section 4). Don't let the toolkit sections balloon into a Lesson 6 preview.

## Code conventions alignment

- Canonical async assertion form matches Code conventions exactly: `await expect(p).resolves.toEqual(...)`, "never assert on a non-awaited promise." This lesson *is* the deep treatment of that one-line rule.
- `Result<T>` shape and lowercase snake codes (`'expired'`, `'not_found'`, `'conflict'`) per Lesson 1 continuity — use in all error examples.
- `AbortSignal` options-bag shape (`fn(arg, { signal })`) per Code conventions' cancellation rule.
- `return await` inside `try` (Code conventions) — if a code-under-test sample has a try block, use `return await` so the example models the standard.
- Vitest 4 is the course's pinned runner (verified current/stable, see fact-check) — write the awaited shape as correct-in-both-v3-and-v4, but state plainly that v4 hard-fails the unawaited form. Do not frame v4 as speculative/future.
- `it('<outcome> when <conditions>')` naming per Code conventions in every example `it` title.
- **Deliberate divergence:** examples use small invented `/lib` functions (`refundCharge`, `fetchInvoice`, `withRetry`) shaped for the trap being shown, not real prior-chapter code — pedagogy needs a controllably-broken function. Downstream agents: these are illustrative, not a continuation of a specific earlier file's API.
