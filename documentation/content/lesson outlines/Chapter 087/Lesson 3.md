# Lesson title

- Title: Pinning time, IDs, and randomness
- Sidebar label: Pinning time and IDs

# Lesson framing

Third lesson of the unit-test chapter. The student arrives with the daily `/lib` test shape (L1) and the factory pattern (L2). L2 closed with a deliberate crumb: factory defaults use a hardcoded `instant('2026-01-01T00:00:00Z')` and a fixed string `id`, "never a live `Temporal.Now.instant()` or a fresh UUID — the machinery for *pinning* time and IDs is the next lesson's entire subject." This lesson is that machinery. It also redeems L1's single named exception to the no-`beforeEach` rule: "`vi.useFakeTimers()` / `vi.useRealTimers()` for code that touches time."

The one idea the whole lesson serves: **time, IDs, and randomness are inputs, and an input you don't control is an input that breaks your test on a different day, in a different timezone, or on a different run.** A test that reads the wall clock, calls `crypto.randomUUID()`, or rolls `Math.random()` inside the unit is non-deterministic by construction — it passes today and fails next month, and the team writes it off as "flaky in CI." The senior move is structural: route every non-deterministic source through a *seam* — a tiny module (`lib/clock.ts`, `lib/ids.ts`, `lib/random.ts`) that production wires to the real impl and tests wire to a frozen/seeded one.

Pedagogical spine — build one mental model and reuse it three times. The clock is taught in full depth (it's the most common and the one with the Temporal wrinkle); IDs and randomness are then taught as **the same pattern applied to a different source**, fast, because the student already owns the shape. This is the minimize-cognitive-load move: one concept (the seam), three instances, not three separate concepts.

Where beginners struggle / what to preempt:
- They reach for `vi.useFakeTimers()` and expect it to control `Temporal.Now` — it does **not**, because Vitest's fake timers (via `@sinonjs/fake-timers`) patch `Date`/`setTimeout`/etc., and Temporal's clock is decoupled. This is the single highest-value gotcha in the lesson. The durable answer is the clock-module seam, which sidesteps the question entirely.
- They mock `Temporal.Now.instant` directly with deep ES patching — brittle, version-fragile. The seam is durable.
- They pin "now" to `new Date().toISOString().slice(0,10)` thinking it's stable — it's still the wall clock.
- They forget `vi.useRealTimers()` in teardown and leak frozen time into later tests (fails loudly only when the *next* test reads time).
- They put `vi.useFakeTimers()` in `beforeAll` instead of `beforeEach`, leaking frozen time across the file.

Mental model the student should leave with: "A non-deterministic source is a dependency. I name the dependency, route it through a one-line seam module, and in tests I swap the seam for a frozen/sequenced/seeded value. Production never changes; the test controls the input." And the reflex command stays `vitest --project unit --watch`.

Scope discipline: the **async** half of fake timers (`*Async` variants, microtask flushing, the forgotten-`await`-with-timers trap) is L5's territory. This lesson names the trap once as a forward-crumb and shows the *synchronous* timer surface only (`vi.setSystemTime`, `vi.advanceTimersByTime`). Do not teach `advanceTimersByTimeAsync` here beyond a one-line "L5 owns this." This keeps the lesson focused on the *seam* idea, not on promise mechanics.

Code-sample conventions: `globals: false` is established, so every shown test imports `{ describe, it, expect, vi, beforeEach, afterEach }` from `'vitest'` — `vi` joins the import line here for the first time at depth (L1 named it, deferred it). Use lowercase-snake `Result` codes, `Temporal.Instant`, and the existing `instant()` / `lib/temporal.ts` and `lib/result.ts` surfaces. Diverge from production code shape only where pedagogy needs a staged build (noted inline).

# Lesson sections

Target 40-50 min. Eight sections. The clock arc is sections 2-5 (the deep teach); IDs is section 6; randomness is section 7; section 8 is the structural-enforcement close. Section 1 motivates with a failing test.

## A test that passes today and fails next month

Goal: make the non-determinism pain visceral before naming the fix, per the "decisions before syntax / motivate with a concrete problem" guideline. This is the lesson introduction (warm, brief, states the goal and connects to L2's deferred crumb).

Open on a concrete `/lib` function the student recognizes: a due-date helper that computes an invoice's `dueAt` as 30 days after creation, reading "now" from the wall clock. Something like `computeDueAt()` calling `Temporal.Now.instant()` internally. The test asserts `dueAt` is 30 days out by recomputing "30 days from now" in the test body too.

Show the bug as a `CodeVariants` (label "The test" / "Why it rots"):
- Variant "The test": the unit reads `Temporal.Now.instant()`; the assertion recomputes `Temporal.Now.instant().add({ days: 30 })`. First-sentence verdict: "Green today — both sides read the same clock in the same millisecond."
- Variant "Why it rots": same code, but narrate the failure modes — the two clock reads can straddle a millisecond/day boundary; pin a literal expected date and it drifts the moment the calendar moves; run it at 23:59 and midnight rollover flips the day. First-sentence verdict: "The unit's input is the wall clock, and you can't assert against a moving target."

Then name the principle in one paragraph: a test that fails Tuesday 14:32 and passes Tuesday 14:33 is **broken, not flaky** (callback to L2's "flake has a structural cause"). If the code reads the wall clock with no injection point, **time is an uncontrolled input**. Preview the fix in one sentence — route "now" through a seam the test can freeze — and note the same disease afflicts `crypto.randomUUID()` (idempotency keys) and `Math.random()` (jitter), which sections 6-7 cure with the identical move.

Terms (`Term`): `flaky` (a test whose pass/fail changes without the code changing), `wall clock` (the machine's real current time, `Temporal.Now` / `Date.now()`).

## The clock module: one seam for "now"

Goal: install the core abstraction — the seam — on the clock first. This is the conceptual heart; spend the most words here.

Teach the seam in two beats:

1. **The shape.** A `lib/clock.ts` that exports a `clock` object with a single `now()` method:
   ```ts
   import { Temporal } from 'temporal-polyfill';

   export const clock = {
     now: (): Temporal.Instant => Temporal.Now.instant(),
   };
   ```
   Use a plain `Code` block with `title="src/lib/clock.ts"`. Keep it tiny — the smallness is the point ("a seam is a few lines, not a framework"). Note the `temporal-polyfill` import matches the project's pinned Node 24 surface (established in Code conventions §Time; one-line swap when Node 26 lands).

2. **The discipline.** Every `/lib` function that needs "now" calls `clock.now()` — never `Temporal.Now.instant()` or `Date.now()` inline. Show the refactor of section 1's `computeDueAt` as a `CodeVariants` before/after (label "Reads the wall clock directly" / "Reads through the seam"), using `del=`/`ins=` on the single changed line. The before pane wraps in `<div data-mark-color="red">`, after in green. Verdict sentences: before — "Untestable: nothing in the signature or imports gives a test a handle on time." after — "The clock is now a named dependency; production wires the real `Temporal.Now`, a test wires a frozen instant."

Then the payoff paragraph: the seam isn't only for tests. It's the single place "now" enters the domain, which also unblocks future needs — backfills that replay with a virtual "now", time-travel debugging. Frame it as a senior call: you pay one indirection to make time a first-class, swappable input.

Diagram — `Figure` wrapping a hand-authored HTML/CSS "seam" illustration (per diagrams INDEX: annotated illustration → HTML+CSS). Goal: show one box (`clock.now()`) in the center with two wires fanning out — up to production (`Temporal.Now.instant()` → real wall clock) and down to the test (frozen `Temporal.Instant.from('2026-01-15T12:00:00Z')`). Horizontal, well under 800px. Caption: "One call site, two wirings. Production reads the wall clock; the test reads a frozen instant." Pedagogical job: cement that the *unit* is unchanged and only the *wiring* differs — this single image is the whole lesson's thesis and gets reused mentally in sections 6-7.

Terms: `seam` (a deliberate point where a dependency can be swapped — production wires one impl, tests wire another).

## Freezing the clock in a test

Goal: show the two ways to swap the clock seam in a test, and pick a default. This is where `vi.mock` and module-mocking get their depth (L1 deferred them).

Teach **two shapes**, present both, then recommend:

- **Module mock** (`vi.mock`). Replace the whole `@/lib/clock` module with a frozen `now()`:
  ```ts
  vi.mock('@/lib/clock', () => ({
    clock: { now: () => Temporal.Instant.from('2026-01-15T12:00:00Z') },
  }));
  ```
  First-sentence framing: "Least invasive on the unit's signature — the function keeps reading `clock.now()`, the test just gives it a frozen module." Note `vi.mock` is hoisted to the top of the file (it runs before imports) — name this as the one surprising mechanic; defer the full hoisting rules to L5 with a crumb ("the order `vi.mock` runs in is the async-testing lesson's job").

- **Injection** (pass the dependency as an argument). The function takes `now` (or a `clock`) in its options object:
  ```ts
  const computeDueAt = (createdAt, { now = clock.now } = {}) => ...
  ```
  Test calls `computeDueAt(createdAt, { now: () => FROZEN })`. First-sentence framing: "The signature documents the dependency — no module mock, the seam is right there in the parameter list." Note the two-positional-params-max convention (Code conventions §Function form) means the injected dep rides in the options object.

Present these as `CodeVariants` (labels "Module mock" / "Injection"), since they're two solutions to one problem — the doc says prefer `CodeVariants` for that.

**The recommendation** (a clear senior default, per "defaults before conditionals"): default to **injection** for `/lib` helpers — it's explicit, type-checked, and needs no mock machinery — and reach for the **module mock** when threading `now` through every signature is more friction than it's worth (a deep call chain). Both are legitimate; the choice is about where the friction lands.

Code-shape note for the agent: the injected `computeDueAt` deliberately uses a default-parameter seam (`{ now = clock.now } = {}`) — this is a staged teaching shape; production helpers more often take a required options object. Flag it as deliberate.

## The frozen-instant convention

Goal: turn the ad-hoc `Temporal.Instant.from('...')` literals from sections 3 into a shared, named convention so failure messages read cleanly and tests don't each invent their own "now". Short section.

Teach the `src/test/clock.ts` support module (this is the `clock.ts` crumb L2's file-tree already planted under `src/test/`). It exports:
- `FROZEN` — the one canonical instant every time-touching test pins to: `export const FROZEN = Temporal.Instant.from('2026-01-15T12:00:00Z');`
- a `freezeClock()` helper that wires `vi.mock`/`vi.spyOn` once so tests don't repeat the boilerplate.

Use a `Code` block, `title="src/test/clock.ts"`.

The "why one canonical instant" paragraph: a failure message that reads "expected `2026-01-15T12:00:00Z` plus 30 days, got ..." is debuggable; "expected today plus 30 days" is not — *today* is different every day you read the log. Pinning to a single literal across the suite makes every time-dependent failure reproduce identically. Tie back to L2's "deterministic data debugs better than random data" — same principle, now applied to time.

Cross-reference the file-tree: this fills the `src/test/clock.ts` slot the previous two lessons crumbed. A small `FileTree` is optional but probably redundant with L2's — prefer a one-line prose callback instead of repeating the tree.

## Fake timers for code that schedules

Goal: cover `vi.useFakeTimers()` for the *other* kind of time-dependence — code that calls `setTimeout`/`setInterval`/reads `Date` — and resolve L1's named `beforeEach` exception. Critically, draw the **Temporal does-not-get-faked** line here.

Three beats:

1. **What fake timers swap.** `vi.useFakeTimers()` replaces `Date`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `setImmediate`, `performance.now`, `requestAnimationFrame`. (Accuracy note for the agent: `process.nextTick` and `queueMicrotask` are **not** faked by default — they require an explicit `toFake` array. Do not list them as automatic.) `vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))` sets the fake wall clock; `vi.advanceTimersByTime(5000)` moves it 5 s and fires due timers. Use a `Code` block listing the setup/teardown pair:
   ```ts
   beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-15T12:00:00Z')); });
   afterEach(() => { vi.useRealTimers(); });
   ```
   This is the legitimate `beforeEach`/`afterEach` exception L1 promised — call that out explicitly ("remember the one exception to no-`beforeEach`-in-`/lib`? This is it"). Stress the paired teardown: `vi.useRealTimers()` in `afterEach` is non-negotiable, because leaked fake time poisons later tests.

2. **The Temporal caveat — the headline gotcha.** `vi.useFakeTimers()` patches `Date`. It does **not** patch `Temporal.Now`. Temporal's clock is decoupled from `Date`, so `Temporal.Now.instant()` still returns the real wall clock even with fake timers active. This is exactly why the clock-module seam (sections 2-4) is the durable pattern for "now": it sidesteps the question. Reserve `vi.setSystemTime` for `Date`-based and `setTimeout`-based code at third-party seams; reach for the `clock.now()` seam for all domain "now" reads. Name the upcoming surface honestly: fake-timer Temporal support is being discussed as native Temporal lands in Node 26 — *name it, don't depend on it.*

   Make this an `Aside` (`caution`) so it stands out as the load-bearing watch-out, OR fold it into prose with a `CodeVariants` (labels "What you'd expect" / "What actually happens") showing `vi.setSystemTime(...)` followed by `Temporal.Now.instant()` still returning real time. The `CodeVariants` is the stronger choice — it makes the surprise concrete. Use it.

3. **Intervals without looping forever** (brief, practical). `setInterval` reschedules itself, so `vi.runAllTimers()` loops forever on it. Reach for `vi.advanceTimersByTime(N)` with an explicit horizon, or `vi.runOnlyPendingTimers()` for one round. One short paragraph + a one-line `Code` snippet contrast. Keep it tight — this is a footnote, not a subtopic.

Forward-crumb (one sentence, no depth): when the scheduled code is `await`-ed, `vi.advanceTimersByTime` alone won't flush the promise — that's the forgotten-`await`-with-timers trap, and the async-testing lesson owns it.

Terms: `macrotask` (a `setTimeout`/`setInterval` callback, run by the timer queue) — define inline since the interval discussion touches it; keep it light, full micro/macro model is L5.

## The same seam for IDs

Goal: teach the ID seam *fast* by leaning on the now-established clock pattern. The whole point is reuse — "you already know this shape."

Open by explicitly transferring the pattern: "The clock taught you the move. IDs are the same move on a different source." Then:

- **The seam.** `lib/ids.ts` exports `newId(prefix)` wrapping the real generator:
  ```ts
  import { uuidv7 } from 'uuidv7';
  export const newId = (prefix: string): string => `${prefix}_${uuidv7()}`;
  ```
  Use `Code`, `title="src/lib/ids.ts"`. Use `uuidv7()` to stay consistent with the project's UUIDv7 standard (Code conventions §Data layer — user-facing IDs are v7 for index-locality). Discipline: every ID-generation site calls `newId('inv')`, never `crypto.randomUUID()` or `uuidv7()` inline. Connect to L2: this is the seam the factory's fixed `id: 'usr_test'` default was gesturing at.

- **Pinning sequenced IDs in a test.** The reason you control IDs: a function returns an idempotency key or a row id the test wants to assert on. Show the `vi.mock` + `mockImplementation` counter:
  ```ts
  vi.mock('@/lib/ids', () => ({ newId: vi.fn() }));
  // in the test:
  let i = 0;
  vi.mocked(newId).mockImplementation((prefix) => `${prefix}_${++i}`);
  ```
  Now `newId('inv')` yields `inv_1`, `inv_2`, ... deterministically — the test can assert exact ids. Use a `Code` block.

- **Resetting between tests — the `vi.mocked` companions.** This is where the chapter-outline's reset discipline lands (reused by the integration chapter). Teach the small companion set as a cluster, not one-by-one:
  - `vi.mocked(fn).mockImplementation(...)` / `.mockReturnValue(...)` — set behavior.
  - `.mockResolvedValue(v)` / `.mockRejectedValue(err)` — async shorthands (name them here, used at depth in L5/integration).
  - `.mockReset()` resets one mock; `vi.resetAllMocks()` in `afterEach` resets every mock in the file.
  The discipline sentence: **reset between tests** so a sequenced-ID counter (or a stubbed resolved value) from one `it` doesn't leak into the next — the same run-order-coupling hazard L2 hammered, now in mock state. Put the `afterEach(() => vi.resetAllMocks())` line in a `Code` snippet.

Keep this section noticeably shorter than the clock arc — the student is applying a known pattern. If it runs long, the pattern wasn't taught well in sections 2-4.

Exercise — a `ScriptCoding`, `runner="sandpack"` (TS + the jest-flavored shim, which can't parse plain-JS-only). Goal: the student writes a small pure function that **takes an id-maker as an injected dependency** and uses it, proving they grasp the seam-as-parameter shape without needing `vi.mock` (the shim has no `vi`). E.g. `buildIdempotencyKey(userId, action, makeId)` that returns `` `${userId}:${action}:${makeId()}` ``; fixed tests pass a deterministic stub `makeId` (a counter) and assert the exact composed key. Grading: exact-string assertions on the composed key across two calls, proving the injected maker is actually used (not an inline `crypto.randomUUID()`). Instructions name the constraint: "use the passed-in `makeId`, never generate an id inside the function." This mirrors the injection shape from section 3 and reinforces "the seam is a parameter."

## The same seam for randomness

Goal: third instance of the pattern, fastest of all. Randomness is where business logic genuinely uses entropy (jitter, shard selection, A/B bucketing) and where `Math.random()` quietly destroys reproducibility.

- **The seam.** `lib/random.ts` wraps the real entropy source. Production wires `crypto.getRandomValues` (or `Math.random` for non-crypto jitter); tests wire a **seeded** generator. Introduce `pure-rand` as the test-side tool (chapter outline's pick — ~5 KB, splittable). Show the seeded shape:
  ```ts
  import { xoroshiro128plus, unsafeUniformIntDistribution } from 'pure-rand';
  const rng = xoroshiro128plus(42); // fixed seed → reproducible stream
  unsafeUniformIntDistribution(0, 99, rng); // same sequence every run
  ```
  Use `Code`. The key insight (one paragraph): a **seed** makes randomness deterministic — same seed, same sequence, every run. This is the randomness analogue of `FROZEN` for time and the counter for IDs: a fixed starting point that yields a reproducible stream. Tie all three together explicitly here — *frozen instant, sequenced counter, fixed seed are the same idea wearing three costumes.*

- **Why not just `vi.spyOn(Math, 'random')`?** Brief contrast: you *can* `vi.spyOn(Math, 'random').mockReturnValue(0.5)` for a single call site, restored via `vi.restoreAllMocks()` in `afterEach` — narrower than a module mock, fine for one return. But for logic that draws a *sequence* of values, a seeded generator behind the seam beats a hand-fed list of mock returns. Frame as: spy for one value, seam+seed for a stream. (This is also where `vi.spyOn` + `vi.restoreAllMocks()` get named, satisfying the outline's spy bullet.)

This section is the shortest. Two `Code` blocks, no exercise (the ID exercise already drilled the injection shape; another would be repetitive).

Terms: `seed` (the fixed starting value that makes a pseudo-random stream reproducible).

## Keeping the wall clock out by default

Goal: the structural-enforcement close — make determinism the *default* the codebase enforces, not a discipline each dev remembers. Mirrors L1's `no-restricted-paths` close and L2's "deterministic defaults" close.

- **The lint rule.** A `no-restricted-syntax` (Biome/ESLint) rule that bans `Date.now()`, `new Date()` (no args), and `Temporal.Now.instant()` *outside* test files and the seam modules themselves. Show the rule's intent in prose + a tiny config snippet (`Code`). The point: the seam only works if nobody bypasses it; the linter makes a bypass a build error, the same way `no-restricted-paths` made an upward `/lib`→`app` import a build error in L1. Name it as the senior pattern: structural enforcement over code-review vigilance.

- **The reflex recap.** Close with the consolidated rule the student should leave with, stated as one move applied to three sources:
  > Any non-deterministic source — time, IDs, randomness — goes through a seam (`lib/clock.ts`, `lib/ids.ts`, `lib/random.ts`). Production wires the real impl; tests wire a frozen instant, a sequenced counter, or a fixed seed. Never `Date.now()`, `crypto.randomUUID()`, or `Math.random()` inline.

Check-understanding exercise — a `Buckets` (3 buckets) titled to test whether the student can route a source to its seam + pinning strategy. Buckets: "Pin with frozen instant / fake timers", "Pin with a sequenced counter", "Pin with a fixed seed". Items: "An invoice's `dueAt` computed from now", "A retry's exponential-backoff jitter", "An idempotency key on a webhook", "A `setTimeout`-based debounce", "An A/B assignment bucket", "A new row's primary id". This verifies the three-instances-of-one-pattern model landed — the whole lesson's payload. Place it as the lesson's closing assessment.

Alternative if Buckets feels too classification-y: a short `TrueFalse` round hitting the headline gotchas (fake timers don't touch Temporal; `vi.useRealTimers()` belongs in `afterEach`; pinning "now" to `new Date().slice(0,10)` is still non-deterministic; a seeded RNG reproduces across runs). Prefer **Buckets** as primary (it tests the synthesizing model) and skip the TrueFalse unless the section needs a second beat.

## External resources

1-2 `ExternalResource` cards (and optionally one `VideoCallout` if a current, high-quality Vitest fake-timers walkthrough exists — only if it earns its place; do not pad):
- Vitest — `vi` API (the `useFakeTimers`, `setSystemTime`, `advanceTimersByTime`, `mock`, `mocked`, `spyOn` reference). https://vitest.dev/api/vi.html
- Vitest — Mocking timers/dates guide. https://vitest.dev/guide/mocking/timers or /dates
- Optionally `pure-rand` README for the seeded-RNG API, if a randomness card adds value.

# Scope

Already taught (do not re-teach; redefine only in one phrase where needed as a prerequisite):
- The `/lib` colocation rule, AAA shape, matcher-by-shape, `it.each`, custom matchers, `globals: false` import discipline, the no-`beforeEach`/no-mocks-in-`/lib` default and its named fake-timer exception — **L1**. This lesson cashes the fake-timer exception; it does not re-derive AAA or matcher selection.
- The factory pattern, `build*(overrides)`, `src/test/` support tree, deterministic-vs-random defaults, the `sequence()` helper, factory `createdAt`/`id` literals as a crumb toward this lesson — **L2**. Reference `sequence()` and the frozen factory defaults; do not re-teach factories.
- `Temporal` time model, `Temporal.Instant`/`PlainDate`/`ZonedDateTime`, IANA timezones, the `lib/temporal.ts` codec and `instant()` helper, `timestamptz` storage, the `temporal-polyfill`→native-Node-26 path — **Chapter 083 / Code conventions §Time**. Use `Temporal.Instant` and `instant()` freely as known; do not explain Temporal semantics, DST, or month-end arithmetic (the outline's "DST/month-end determinism in inputs" bullet is **cut** — it's a Ch083 concern about input dates, not a determinism-seam concept, and would dilute the seam focus).
- The `Result<T>` shape and lowercase-snake codes — **Chapter 043 / Code conventions §Error handling**. Use it; don't define it.
- UUIDv7 / `uuidv7()` as the project's id standard — **Unit 5 / Code conventions §Data layer**. Use it; don't justify v7.
- Why Vitest, `vitest.config.ts`, the `unit` project glob, watch vs run, the worker/isolation model — **Chapter 086**. Assume configured; the reflex command is `vitest --project unit --watch`.

Reserved for later (name as crumbs only, do not teach):
- `*Async` fake-timer variants (`advanceTimersByTimeAsync`, `runAllTimersAsync`), microtask vs macrotask flushing, the forgotten-`await`-with-timers trap, `vi.mock` hoisting order rules, `expect.assertions(n)` — **L5 (async tests)**. This lesson shows only the *synchronous* timer surface and names the async trap once.
- Type-level pinning of seam signatures with `expectTypeOf` — **L4**.
- Unhappy-path assertions (`toThrow`, `rejects.toThrow`, `Result.err` matchers at depth) — **L6**. The `mockRejectedValue` shorthand is named, not exercised.
- DB-inserting factories, integration fixtures (signed-in user, org seed, `withRollback`), and the reuse of `vi.mocked` reset discipline at the seam — **Chapter 088**.
- MSW handler determinism / request-level randomness — **Chapter 088 L5**.
- `@faker-js/faker` for dev seeds, `drizzle-seed`, `scripts/seed.ts` — **Chapter 040 L3** (named once in L2 already; not revisited).

Out of scope entirely:
- Production replay/backfill tooling that the clock seam would also unblock (mention as one-sentence motivation only, do not design it).
- Mutation testing, property-based testing (pure-rand's fast-check lineage is not invoked).
