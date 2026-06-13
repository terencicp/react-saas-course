# Pure-function tests, the daily shape

- Title: Pure-function tests, the daily shape
- Sidebar label: Pure-function tests

## Lesson framing

This is the foundation lesson of Chapter 087 (the wide unit-test base over `/lib`). Every later lesson in the chapter assumes this shape on disk. The student arrives from Chapter 086 with: Vitest installed, `globals: false`, a `unit` project whose include glob is `src/lib/**/*.test.ts`, the AAA shape, and the behavior-over-implementation rule. This lesson does not re-justify any of that — it cashes it in for the *daily craft* of writing a `/lib` test file.

The single most important takeaway: **a `/lib` file is pure, so its unit test is its contract written as assertions — inputs to observables, nothing else.** No mocks, no `beforeEach`, no setup. The student should leave able to open any `/lib` file, write its `.test.ts` sibling in one sitting, and pick the matcher that matches the value's shape.

Pedagogical conclusions that shape the whole lesson:

- **Lead with the senior framing, not syntax.** The student already knows `describe`/`it`/`expect` exist (Ch086). The new content is *judgment*: which matcher, how little setup, when a custom matcher earns its weight, why no mocks. Frame each as a decision with a threshold.
- **Anchor in the course's real `/lib` surface.** The student has built `lib/temporal.ts`, `lib/result.ts`, `lib/error-mapping.ts`, `lib/redact.ts`, Zod schemas, money helpers, locale matchers across prior units. Use *these* as the running examples so the test shape lands on code they recognize, not toy `add(a, b)`.
- **The mental model is "behavior catalog."** A finished `/lib` test file reads top-to-bottom as a list of what the function does on each input. Reinforce this framing repeatedly: the `describe` names the unit, each `it` names one observable branch, and reading them aloud is the spec.
- **Minimize cognitive load via a single worked example that grows.** Introduce one function (`mapDatabaseError`) early, write its first test in full AAA, then layer matcher selection, `it.each`, and custom matchers onto progressively richer `/lib` functions. The student sees the shape stabilize before complexity is added.
- **Purity is the throughline that explains every "no".** No mocks, no `beforeEach`, no `app/**` imports — all three reduce to the same root: a pure function has no collaborators, no shared state, and sits below the framework. Teach the root once; the rules fall out.
- **Code-first, diagram-light.** This is a craft lesson; the vehicle is code blocks and one live exercise, not system diagrams. A single small visual (matcher-by-shape decision aid) is the only figure that earns its place.
- **Use the canonical `Result<T>` shape from `lib/result.ts`** (single type param, lowercase snake `code` values, `ok(data)`/`err(code, userMessage)` helpers) — see Scope. The chapter-outline brainstorm uses some stale shapes (`Result<T,E>`, `NOT_FOUND`); the lesson must use the convention's shape.

## Lesson sections

### Introduction (no header)

Open with the senior question, stated through a concrete file. A `/lib` file exports three functions the student has met before: `mapDatabaseError(err: unknown): ErrorCode`, `formatMoney(amount: bigint, currency: Currency): string`, `redact(payload: unknown): unknown`. Each is *pure*: same inputs, same output, no I/O, no clock, no network. State the payoff in one line: when a function is pure, its unit-test contract is *exactly* the function's contract — you feed inputs, you assert observables, and there is nothing else to set up. Preview the practical skill: by the end the student can write the `.test.ts` sibling for any `/lib` file in a single sitting and pick the right matcher every time. Keep it to ~5 sentences, warm and terse. Connect explicitly back to Ch086 ("you have the runner and the AAA shape; this is the daily craft of the base layer").

### A `/lib` file and its test sit side by side

Teach the colocation rule and the `.test.ts` suffix. `src/lib/error-mapping.ts` and `src/lib/error-mapping.test.ts` live in the same folder. The `unit` project's include glob from Ch086 (`src/lib/**/*.test.ts`) picks the sibling up with zero extra config — reinforce that the student already wired this, nothing new to configure.

Use a `<FileTree>` (Starlight built-in) to show two or three `/lib` files each next to its `.test.ts` sibling — visual, instant, the canonical diagram engine for a directory listing per the diagrams index. Keep it small (one folder, ~6 entries).

Then give the *reasoning* for colocation over a parallel `tests/` tree, as a short bulleted rationale (this is a senior-judgment beat, so name the why): short relative import paths; a rename moves both files together; deleting the source can't orphan a test; the test reads as documentation in the same folder you're editing. One sentence each.

Tooltip candidates here: `colocation` (Term — define as "source and its test in the same directory").

### Arrange, act, assert in three lines

Show what AAA collapses to for a pure function. The point: a `/lib` test has a one-line Arrange (the input), a one-line Act (the call), and one or two Assert lines. It fits on screen with no scrolling.

Use a single `Code` block (not AnnotatedCode yet — keep the first example dead simple) showing the full first test of `mapDatabaseError`, imports included:

```ts
import { describe, it, expect } from 'vitest';
import { mapDatabaseError } from './error-mapping';

describe('mapDatabaseError', () => {
  it('maps a unique-violation code to conflict', () => {
    const dbError = { code: '23505' };          // Arrange
    const result = mapDatabaseError(dbError);    // Act
    expect(result).toBe('conflict');             // Assert
  });
});
```

Call out the per-file import from `'vitest'` as a direct consequence of `globals: false` (set in Ch086) — every file imports `{ describe, it, expect }` (and `vi`, `expectTypeOf` later) explicitly; this keeps the codebase grep-able and refactor-tools don't lose references. State the two structural rules that the three-line shape enforces: if Arrange grows past ~3 lines the input wants a factory (forward-ref Lesson 2); if Act has more than one call you're testing two behaviors and should split into two `it` blocks. Frame these as the smells that tell you the test shape is drifting.

Tooltip candidates: `globals: false` (Term — "Vitest setting requiring `describe`/`it`/`expect` to be imported per file rather than injected as ambient globals").

### One describe per export, one it per branch

Teach the file-organization pattern explicitly, because it's the skeleton every later section hangs on. The pattern: **one `describe` block per exported function; one `it` per observable branch of that function.** A `/lib` file exporting two functions has two `describe` blocks.

Cover `describe` nesting discipline here (it belongs with organization, not as a stray tip): nest a second level *only* when a genuine sub-context exists (e.g. `describe('mapDatabaseError', () => { describe('Postgres constraint codes', ...) })`). Three-plus levels read as a hierarchy the reporter flattens anyway — one or two levels per file is the ceiling. Frame the smell: deep nesting is usually an attempt to group tests that should just have clearer `it` names.

Use a `Code` block showing a skeleton (two `describe` blocks, a couple of `it` stubs each) so the student sees the file-level rhythm before the matcher detail arrives.

### Picking the matcher that matches the shape

This is the heart of the lesson — the largest section. The senior skill: the matcher follows the *shape of the value*, and the wrong matcher silently loses signal. Teach by shape, not by listing every matcher.

Open with the failure framing that makes this matter: `toBe` on an object compares references (two structurally-equal objects fail); `toEqual` on a `Temporal.Instant` compares opaque internal shape, not the instant — so a passing test can be asserting the wrong thing. The student must learn that a green test with the wrong matcher is worse than a red one.

Present the matcher-by-shape mapping. Use a small **HTML+CSS decision aid inside a `<Figure>`** (per diagrams index, a simple visual aid that maps "value shape → matcher" earns its place; this is not a system graph, it's a lookup the student will internalize). Rows:

- **Primitive** (`string`, `number`, `boolean`, `bigint`) → `toBe` (SameValue equality)
- **Object / array, full structural** → `toEqual` (deep)
- **Object, partial — assert only some fields** → `toMatchObject`
- **Array contains an element** → `toContainEqual` (deep) or `toContain` (primitive/reference identity)
- **Float with rounding error** → `toBeCloseTo`
- **Instance of a class** → `toBeInstanceOf`
- **Throws** → `toThrow(MessageOrClass)` (note: depth in Lesson 6)

After the figure, a short `CodeVariants` block contrasting **wrong vs right** on a value the student recognizes — the strongest teaching move here. Two variants:
- "Reference accident" — `expect(formatLineItems(input)).toBe([...])` (or `toEqual` on a Temporal value) marked with `del`, prose explaining it passes/fails for the wrong reason.
- "Shape-matched" — the correct matcher, marked with `ins`, prose naming why.

Then the **Temporal caveat** as its own teaching beat (the student built `lib/temporal.ts` in Ch083, so this is high-value and concrete): `toEqual` on a `Temporal.Instant` or `Temporal.PlainDate` does not compare the moment/day — it compares the object's internal slots and can mislead. The reach: assert on `.epochMilliseconds` for an `Instant`, on `.year`/`.month`/`.day` (or the ISO string via `.toString()`) for a `PlainDate`, or use a custom matcher (next section). Use a small `Code` block with the right form.

Tooltip candidates: `SameValue` (Term — "the equality algorithm `toBe` uses; like `===` but treats `NaN` as equal to `NaN` and distinguishes `+0`/`-0`"), `deep equality` (Term — "structural comparison field-by-field, recursing into nested objects and arrays").

### Table-driven tests with it.each

Teach parameterized tests for the many-input/one-output functions that dominate `/lib` (error-code mapping, plural-form selection, currency formatting). The motivation: `mapDatabaseError` has a dozen Postgres-code → error-code mappings; twelve near-identical `it` blocks is noise, one `it.each` table is a readable spec.

Show the **object form** as the course default (more readable failure names than the array form):

```ts
it.each([
  { code: '23505', expected: 'conflict' },
  { code: '23503', expected: 'conflict' },
  { code: '40001', expected: 'internal' },
])('maps Postgres $code to $expected', ({ code, expected }) => {
  expect(mapDatabaseError({ code })).toBe(expected);
});
```

Explain the `$code`/`$expected` interpolation in the test name — each row gets a distinct, self-describing name in the reporter, which is why the object form beats the positional array form. Name two thresholds as judgment beats: don't pack a row with seven columns (the failure message becomes unreadable — that's a sign the cases aren't really the same behavior); and **never** generate rows from a function call (`it.each(generateCases())`) — the data vanishes from the failure message; list cases inline so a failing row is legible.

Add an **exercise** here — this is the section where hands-on practice pays off most. Use `ScriptCoding` with `runner="sandpack"` (the vanilla runner can't parse TS; sandpack supports TS and the jest-flavored `test`/`expect` shim covers `toBe`). The exercise: give the student a small pure `mapPlan(tier: string): 'free' | 'pro' | 'enterprise'`-style function (or reuse `mapDatabaseError`) as `starter`, and have them *complete an `it.each` table* covering the branches; the `tests` prop asserts their function against the cases. Goal: practice the table shape and matcher choice. Grading: the provided `test(...)` blocks pass when the function is correct. Note for the builder: keep it to plain functions and `toBe`/`toEqual` (ScriptCoding's shim does not implement `it.each` or `toMatchObject` — so the *student writes the function* and the fixed `tests` exercise the branches, rather than the student writing `it.each` in the widget). If the builder finds the shim too limiting to demonstrate `it.each` itself, fall back to a `Dropdowns` fenced-code exercise where the student fills the `it.each` row values and the `$`-interpolation tokens.

### Custom matchers, when they earn their weight

Teach `expect.extend` and the threshold for reaching for it. The senior framing: a custom matcher is worth its weight when the *same domain comparison* is written three or more times across files, and when its failure message can name the divergence better than a raw diff.

Two course-canonical examples, both tied to types the student owns:
- A `Result` matcher pair — `toBeOkResult(expectedData?)` and `toBeErrResult(expectedCode?)` — that absorbs the `ok` discriminator check so a test reads `expect(result).toBeErrResult('not_found')` instead of `expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })`. Note these are *introduced* here as the home for repeated `Result` assertions; their deep use on the unhappy path is Lesson 6. Use the canonical lowercase `code` value `'not_found'`.
- A `toBeMoneyEqualTo(...)` sketch for the repeated money/Temporal comparison the previous section flagged.

Show one `expect.extend` implementation in a `Code` block (the `Result` one), including the `{ pass, message }` return contract so the student sees how a custom matcher produces a readable failure string. State where they live: `src/test/matchers/` (e.g. `src/test/matchers/result.ts`), imported by the setup file or per-test. Name the over-engineering guardrail: five custom matchers is healthy, fifty is a parallel test framework you now have to maintain — and a vague matcher (`toBeValid`) hides *which* axis failed, so a custom matcher must name its specific contract.

Tooltip candidates: `expect.extend` (Term — "Vitest API for registering a project-wide custom matcher").

### Pure functions need no mocks and no beforeEach

This section consolidates the three "no" rules under their single root cause, which is the lesson's conceptual spine. Teach the root first: a pure function has **no collaborators, no shared state, and lives below the framework**, so the three reaches a test author instinctively makes — mock a dependency, set up shared state in `beforeEach`, import app code — are all signals the unit isn't actually pure (and belongs in Ch088's integration layer) or that the test is mis-shaped.

Cover each consequence:
- **No `beforeEach`.** Pure functions need no setup, so a `beforeEach` in a `/lib` test is a smell: either it's building a shared fixture (move it to a factory call *inside* each `it` — Lesson 2) or the unit reads time/IO and isn't pure. Name the one legitimate exception so the student isn't confused later: `vi.useFakeTimers()`/`vi.useRealTimers()` for time-touching code (Lesson 3 owns it).
- **No mocks, almost ever.** Purity means no collaborator worth mocking. A `/lib` function reaching for `fetch`, the database, or `Date.now()` is a *seam violation* — the fix is to extract the dependency to a parameter or a seam module, not to `vi.mock` it. The narrow exception (deterministic modules: clock, IDs, RNG, pinned via injection or timer fakes) is Lesson 3 — name it, don't teach it.
- **No `app/**` imports.** A `/lib` test importing from `app/**` reverses the dependency direction (`/lib` is below the app, not above it). State that `eslint-plugin-import`'s `no-restricted-paths` catches this structurally so the student knows it's enforced, not just convention.

Frame the whole section as a single diagnostic the student can run on any `/lib` test: *"if this test wants a mock, a `beforeEach`, or an `app` import, the unit is probably misclassified — move it to integration (Ch088)."* This is the senior reflex the lesson most wants to install.

Add a short `MultipleChoice` or `TrueFalse` check here to verify the diagnostic landed — e.g. statements like "a `/lib` test that needs `cookies()` should mock it" (false — it's misclassified, move to integration). Keep it to 3-4 statements.

### What a finished /lib test file looks like

Close the lesson by assembling everything into one realistic file the student can hold as the target shape. The senior anchor: a healthy `/lib` test file is 60-80 lines — imports at top, one `describe` per export, six-to-ten three-to-six-line `it` blocks, an `it.each` table where it helps, maybe one custom matcher, no `beforeEach`, no mocks. It runs in single-digit milliseconds and reads as a behavior catalog.

Use `AnnotatedCode` here — this is exactly its use case (one complete block, attention directed to each region in turn). Author one ~30-40 line `error-mapping.test.ts` (or `money.test.ts`) and step through it:
1. The imports — `{ describe, it, expect }` from `'vitest'`, the unit, any custom matcher. (color blue)
2. The `describe` naming the unit. (blue)
3. A single representative `it` in clean AAA. (green)
4. The `it.each` table covering the mapping branches. (green)
5. The unhappy-path `it` (forward-ref Lesson 6 lightly — "the failure branch gets a test too"). (orange)
Keep each step's prose to one short paragraph per the component constraint.

End with the **inner-loop reflex**: `vitest --project unit --watch` is what runs while you edit this file; the `/lib/**` coverage thresholds from Ch086 (90% lines / 85% branches) ride this same glob. One or two sentences — connect the daily command back to the suite shape they already configured.

### External resources (optional)

Optionally one or two `ExternalResource` cards: the Vitest "Expect" API reference (matcher list) and the `it.each` / test API page. Keep to official Vitest docs only.

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- Vitest is installed; `globals: false`; the `unit` project's include glob is `src/lib/**/*.test.ts`; `vite-tsconfig-paths` resolves `@/` aliases. (Ch086 L1 — assume on disk, reference in one line.)
- AAA shape and behavior-over-implementation. (Ch086 L4 — name them, don't re-derive; this lesson shows their *pure-function* collapse.)
- The honeycomb and that `/lib` is the wide unit base. (Ch086 L2 — one-line reference.)
- Coverage thresholds on `/lib/**`. (Ch086 L3 — reference only, in the closing reflex.)
- The `Result<T>` type and `ok`/`err` helpers from `lib/result.ts`; the `error-mapping`, `temporal`, `redact`, money, and Zod-schema `/lib` surfaces. (Built in earlier units — used as examples; redefine each in a half-sentence at first use, no full teaching.)

**Explicitly out of scope (defer, with a one-line forward pointer where the student would expect it):**
- Fixture factories and the `build*(overrides)` Builder pattern — **Lesson 2**. (When Arrange grows past three lines, point here.)
- Pinning time, IDs, randomness; `vi.useFakeTimers`; the clock/ids/random seams; `vi.mock`/`vi.spyOn` mechanics — **Lesson 3**. (Name the fake-timers `beforeEach` exception and the deterministic-module mock exception; teach neither.)
- Type-level assertions, `expectTypeOf`, `*.test-d.ts`, `vitest --typecheck` — **Lesson 4**. (May name `expectTypeOf` as something imported from `'vitest'`; no usage.)
- Async tests, the forgotten-`await` trap, `await expect().resolves/.rejects`, `expect.assertions(n)` — **Lesson 5**. (The closing file's examples stay synchronous.)
- Unhappy-path depth: `toThrow(Class)` and code/regex matching, `rejects.toThrow`, `Result.err` inspection, Zod issue and Postgres-code error tables, `Error.cause` chains — **Lesson 6**. (Introduce `toBeOkResult`/`toBeErrResult` as the *home* for repeated `Result` assertions; the unhappy-path craft is Lesson 6. The `it.each` Postgres example here is a *success-path* mapping table, not error-shape assertion.)
- Integration tests at the seams (Server Actions, route handlers, webhook receivers, Drizzle against a real test DB), MSW, transaction rollback — **Chapter 088**.
- Component tests / React Testing Library — **Chapter 089**.
- Snapshot testing (email templates, RFC 9457 bodies) — **Chapter 089 / 088**.
- Mutation testing — out of scope for the course.
