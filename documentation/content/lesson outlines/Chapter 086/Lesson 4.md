# Lesson outline — Chapter 086, Lesson 4

## Lesson title

- Title: `Arrange, act, assert one behavior`
- Sidebar label: `AAA, one behavior`

(Chapter-outline title fits. It names the two ideas the lesson installs — the AAA structure and the one-behavior-per-test rule — and reads as an imperative the student can hold in their head while writing a test.)

---

## Lesson framing

This is the closing teaching lesson of Chapter 086 and the **single-test shape** lesson. L1 installed Vitest 4 and the runner; L2 installed the honeycomb (where tests live); L3 installed coverage discipline (how many, where). This lesson installs the shape of **one** test, the unit every other lesson in Unit 18 writes dozens of. It is a pattern lesson, not a tooling lesson — almost no new API surface, all judgment.

Two load-bearing ideas, taught in this order so the second builds on the first:

1. **Structure — Arrange / Act / Assert, one behavior per test, a name that reads as the behavior.** The mechanical shape. Easy to state, easy to get visibly right or wrong, so teach it first and concretely.
2. **The durable rule — test behavior, not implementation.** The senior idea the whole lesson is really about. A test that asserts on *what the caller observes* survives every internal refactor; a test that asserts on *how the function does its work* breaks on a rename and trains the team to ignore it. This is the chapter's thread ("behavior over implementation") cashed out at the single-test level.

Pedagogical stance:

- **Lead with the pain, not the rule.** The senior question is concrete: a test that goes green-red-fix-green on refactors that changed no behavior, until the team learns to ignore it. The student has written exactly this test. Open there. Every rule in the lesson is the answer to "how do I stop writing that test."
- **The mental model to leave with:** a good test is a *contract about observable behavior*, written so it fails when the behavior breaks and only then. The reflexive question while writing: "what does the caller observe, and what would have to change for this test to fail meaningfully?" (the second clause is the same heuristic L3 used for spotting theatre tests — reuse it deliberately, the student has seen it).
- **The black-box thought experiment is the through-line:** *replace the function with a different implementation that satisfies the same contract — does the test still pass?* Yes ⇒ behavior test. No ⇒ implementation test. Introduce it once, return to it at every decision point (what to assert, whether to mock, snapshot or not).
- **Cognitive load:** start with a pure function (the simplest observable surface — return value, thrown error), get AAA and naming solid there, *then* widen "what counts as observable" across the layers the student already knows (Server Action, route handler, webhook receiver). Don't introduce the layer-by-layer observable table until AAA is concrete on a pure example.
- **Ground every example in the codebase the student has built across Units 1-17.** The seam catalog (`authedAction`, `authedRoute`, `requireOrgUser`, webhook receiver, `safeLimit`, `error.tsx`) is from ch080 L3 and was named as the integration-test catalog in L2 — reuse those exact names. The validators/mappers/codecs in `/lib` are the unit-test surface. No invented domain.
- **This lesson teaches what a good test *looks like*; the depth of each test type is ch087's job.** Resist teaching async-await mechanics, fixtures, determinism, type-level tests, or unhappy-path depth — name-forward only. The student should leave able to *recognize and write* a well-shaped test and *spot* an implementation-coupled one in review, not to have mastered every test category.
- **Vitest 4 / `globals: false` is the established baseline** (L1, continuity notes): every code sample imports `{ describe, it, expect }` (and `vi` where needed) from `'vitest'` explicitly. Do not use ambient globals — it would contradict L1 and the convention.
- **Heavy use of contrast.** The behavior-vs-implementation idea only lands as before/after pairs (CodeVariants) and as a review exercise (CodeReview), not as prose assertions. The student must *see* the refactor break the bad test and leave the good one green.

---

## Lesson sections

### Introduction (no header)

Open with the senior question as a concrete failure story, not an abstraction: a test passes today; tomorrow a teammate renames an internal helper or inlines it — no behavior changed — and the test goes red. The author opens it, sees it asserting on the helper's call arguments, patches the assertion, re-runs, green. Three weeks later, same function, same dance. The team's lesson isn't "fix the test" — it's "this test lies, ignore it." Name the bug class: the test coupled to *how* the code works, not *what* it does for the caller.

State the goal: by the end, the student writes a test with a shape that survives refactors — Arrange / Act / Assert, one behavior, a name that reads as that behavior, asserting only what the caller observes. Connect back: L2 said tests go where the bugs are; this lesson says a test is only worth writing if it *fails when the bug ships and stays green otherwise*. Keep it to ~4-6 sentences, warm and terse.

### Arrange, act, assert: the three-part shape

Teach the mechanical structure first because it's concrete and immediately gradable.

- Define the three sections: **Arrange** — build inputs and fixtures. **Act** — invoke the unit under test, **once**. **Assert** — verify the observable outcome. Same order, every test. The blank line between sections is the convention that makes a test scannable (senior tell — a reviewer reads the three beats at a glance).
- Anchor on a single pure-function example from `/lib` the student knows — e.g. the error-code mapper (`error.tsx` / RFC 9457 work, Unit 16) or a Zod validator (Unit 6). Pure function = simplest observable surface (return value or thrown error), so the shape is uncluttered.
- **Component: `AnnotatedCode`** (one `it` block, ts, `globals: false` import line included). Steps walk: (1) the `describe`/`it` skeleton and import-from-`'vitest'` line; (2) the Arrange block (color `blue`); (3) the single Act call (color `green`); (4) the Assert (color `violet`). Reuse the unit/integration/component layer colors from L2 only if they don't clash — otherwise these three step-colors are local and that's fine; note it for the writer. Goal: the student sees the rhythm in one well-formed test before any contrast.
- Name the counter-shapes briefly (prose + a short `Code` block or two): assertions interleaved into Arrange (`expect(fixture.id)...` before the Act — you're testing your own fixture); two Act-and-Assert pairs in one `it` (two behaviors — split); no Arrange at all (the Act reaches a global — a missing-fixture smell). Keep each to a sentence; these are qualifications of the shape, they belong here, not in a tips dump.

### One behavior per test, named for the behavior

The "what is a behavior" and "what is a good name" ideas are inseparable — a good name *is* the behavior stated — so teach them together.

- **One behavior** = one thing the caller observes: one return shape, one branch taken, one side effect, one thrown error. Multiple `expect` calls are fine **when they describe the same behavior** (a returned object's `id`, `status`, `createdAt` are one behavior — "returns the created invoice"). Multiple `expect` calls describing **different** behaviors (returns data *and* writes an audit row *and* throws on bad input) are several tests wearing one `it`. The test: if it fails, can the reader name the single broken behavior from the name alone?
- **Naming pattern (canonical for the course, from Code conventions):** `it('<observable outcome> when <conditions>')`, present tense. The `describe` carries the unit (`describe('safeLimit', ...)`), the `it` carries the specific behavior. Reading `describe` + `it` aloud should produce a sentence a teammate parses on the PR. Examples grounded in the seams: `it('returns 403 when the role is below admin')`, `it('allows the request through when Redis auth fails')` (the `safeLimit` fail-open carve-out from ch081), `it('rejects the body before parsing when the signature is invalid')` (webhook receiver). Mention BDD given/when/then is the same shape under a different label; AAA + this naming pattern is the course surface — name it once, move on.
- Name the content-free anti-names explicitly so the student recognizes them in their own code: `'works'`, `'works correctly'`, `'returns the right value'`, `'handles the case'`, `'test 1'`. Each names nothing; rename for the behavior.
- **Exercise — `Buckets` (twoCol).** Two buckets: **One behavior (keep as one test)** vs **Multiple behaviors (split)**. Items are short descriptions of what an `it` block asserts, e.g. "asserts the returned invoice's id, status, and total" (one), "asserts the function returns data and that it also logged an audit row" (split), "asserts a 403 is returned for a viewer role" (one), "asserts both the success result and the thrown error on bad input" (split). Goal: train the boundary between "same behavior, many asserts" and "many behaviors, one test." Place it right after the one-behavior explanation, before naming, so the bucket reasoning reinforces "what is one behavior."

### Test the behavior, not the implementation

The heart of the lesson. Build it as contrast — the student must watch a refactor break one test and spare another.

- State the rule plainly: assert on what the caller observes — return value, thrown error, the DB row that got written, the HTTP status and body. Do **not** assert on which private helper was called, the internal data structure mid-flight, the order of internal queries, or the language a regex is written in. A test that asserts "the function called `_buildQuery(args)`" couples to structure; inline `_buildQuery` and it breaks though behavior is identical. A test that asserts "returns rows ordered by `createdAt` desc" couples to the contract; the same refactor leaves it green.
- **Introduce the black-box thought experiment here as the writing reflex** (and flag it as the idea the rest of the lesson returns to): swap the implementation for another one satisfying the same contract — does the test pass? Yes ⇒ behavior. No ⇒ implementation. This is *how you decide what to assert*, not just a post-hoc check.
- **Component: `CodeVariants`** — the same function under test, two test variants:
  - **Tab "Couples to implementation"** (`del`-tinted / red mark color): a test that does `vi.spyOn` on an internal collaborator and asserts `toHaveBeenCalledWith(...)` — asserting the wiring. First sentence of prose: this breaks the moment the function is refactored to call a different helper, even with identical output.
  - **Tab "Asserts the contract"** (`ins`-tinted / green): the same scenario asserting the returned `Result` shape via `toMatchObject`. First sentence: survives any refactor that still produces the same observable result.
  Keep each tab's prose to one paragraph (component limit). Continue any longer discussion in prose after the block.
- **The "mock the network, not the function" corollary** (name-forward to ch088 L4 for depth — do not teach MSW here): when a test needs an external dependency stubbed, the stub belongs at the *boundary* (the HTTP call), not at the function calling it. Mocking the function ("the code called `fetchInvoice`") couples to implementation and breaks on a rename to a different helper; mocking the network ("a `GET /invoices/:id` returns this body") couples to the contract and survives. Same black-box logic, applied to dependencies. One short prose paragraph + a one-line mention that ch088 builds the MSW machinery; no MSW code here.
- **`vi.mock`/`vi.spyOn` caution, inline:** the smell isn't "mocks are bad" — it's *asserting that your mocks were called with the values you wired in*. That test verifies the test's own setup, not the function's behavior. State it where the spy example sits, not in a separate watch-outs block.
- **Tooltips (`Term`):** `seam` (boundary where app code meets an external system — framework, DB, auth, third-party; defined this way in L2), `RFC 9457` (the problem-details JSON error body shape, from Unit 16), `BDD` (behavior-driven development — given/when/then phrasing). Keep definitions to one line each.

### What "observable" means at each layer

Now widen the surface — the student has AAA + behavior-over-implementation on a pure function; show that "observable" changes shape by layer but the rule doesn't.

- A compact mapping, layer → what the test asserts (the *observable surface*):
  - **Pure function** — return value; thrown error.
  - **Async function** — resolved value; rejected error; side effects on injected dependencies.
  - **Server Action** — the `Result` shape; the row written to the test DB; the audit-log entry; the error caught by `error.tsx`.
  - **Route handler** — HTTP status; response body (RFC 9457 shape); headers.
  - **Webhook receiver** — HTTP status; the dedup/`processed_events` row; side effects on business tables.
  - **Component (ch089)** — rendered text; controls present; the effect of a click. (Name-forward; one line.)
- **Format:** a small two-column table inside a `Figure` (HTML, not a diagram engine — this is a reference table, not a graph). Caption ties it together: every layer has a surface the caller depends on; assert there, never below it.
- **Reinforce the seam connection:** the integration layer (Server Actions, route handlers, webhook receivers, `safeLimit`, `error.tsx`) is L2's center of gravity; this table is *where you point the assertion* for each of those seams. Each seam typically gets the success/observable path **and** its fail-closed branch (L2's "fail-closed branch / message-split branch") — name this as the two-tests-per-seam habit, defer the unhappy-path depth to ch087 L6.
- **"Don't test the framework," concisely:** a unit test that drives Next.js's render pipeline for a Server Component tests Vercel's code, not yours. Tests stop at the framework boundary — assert the Server Action body, the data-fetching helper, the validator; not `<Link>`, `redirect()`, `notFound()`, segment behavior, or `page.tsx` rendering. This restates L2's "no test the framework" at the assertion level; keep it to ~2 sentences, it's a boundary of *this* rule.

### Choosing the matcher: assertion failures are documentation

Small but high-value section — the matcher choice is part of "the test tells you what broke."

- The principle: a test *name* names the behavior; the assertion *failure* names what diverged. Pick the matcher that produces the most readable diff. `expect(result.ok).toBe(true)` fails with "expected false to be true" — useless. `expect(result).toMatchObject({ ok: true, data: { id: expect.any(String) } })` fails with a structural diff — it tells you *which field* broke.
- Practical guidance (the small matcher surface the course uses, from L1): `toBe` for primitives/identity, `toEqual` for deep value equality, `toMatchObject` for partial-shape match (preferred for `Result` and DB rows — assert the fields the caller depends on, not the whole row), `toContainEqual` for "this item is in the array," `toThrow` for the error path, `expect.any(String)` / `expect.objectContaining` for fields that vary (IDs, timestamps — name-forward to ch087 L3's determinism seams for the *real* fix, this is just the matcher). 
- **Component: `Code` blocks** for the contrasting matcher pairs (one weak, one informative) — short enough that `AnnotatedCode` would be overkill. Optionally a single `CodeVariants` if a side-by-side reads better, author's call.
- One line on **snapshots as the narrow valid case:** a snapshot is a behavior assertion *only* when it captures a contract the caller depends on — an email template's rendered HTML, an RFC 9457 body shape. It's an implementation assertion when it captures whatever the function happened to return today. The course uses snapshots for email-template output (ch089) and RFC 9457 shapes, nowhere else; snapshot churn (updates every other PR) is the warning sign. Don't teach snapshot mechanics — name the valid/invalid line and move on.

### Read the test, not the source: the review reflex

Close by turning the lesson's rule into a review skill — this is the senior-mindset payoff and the natural home for an applied exercise.

- The reflex: a reviewer reads *only the test file* and asks — what does this unit do, what behaviors does it have, could I reimplement the unit from these tests alone? Yes ⇒ the tests are behavior-anchored documentation. If the test reads like a transcript of the implementation (it names private helpers, asserts call order, mirrors the source line-for-line), the rule has slipped. Tie to the running heuristic: "what would have to change for this test to fail meaningfully?" — if the answer is "the test would have to be deleted," it's theatre (the same lens L3 used on coverage).
- Note that test names, listed by Vitest's reporter (`vitest run --reporter=verbose`), are a behavior catalog a new engineer reads to learn the unit without opening source — names earn their keep by being read first when something breaks.
- **Capstone exercise — `CodeReview`** (single or two-file). A PR diff adding a test file for a known seam (e.g. `safeLimit` or the webhook receiver) with **three seeded plants** the student must flag inline:
  1. An implementation-coupled assertion — `expect(spy).toHaveBeenCalledWith(...)` on an internal collaborator. `kernel`: "asserts an internal call instead of the observable result; breaks on any refactor that changes the helper."
  2. A two-behaviors-in-one-test block — one `it` asserting both the success `Result` and the thrown error. `kernel`: "one test asserts two behaviors (success and failure) — split into two."
  3. A content-free name — `it('works', ...)`. `kernel`: "test name names no behavior; rename to `<outcome> when <conditions>`."
  Optionally a fourth: a too-weak matcher (`toBe(true)` on `result.ok`) where `toMatchObject` would document the failure — `kernel`: "asserts only the boolean flag; the failure diff says nothing about what broke." Add a `ReviewWhy` summarizing the through-line: each plant is the same disease — the test describes *how*, not *what*. This exercise is the lesson's assessment: it forces the student to apply behavior-over-implementation, one-behavior, and naming all at once, in the review mode L2/L3 established as the course's senior frame.

### External resources (optional)

One or two `ExternalResource` cards: the Vitest docs on `expect`/matchers, and optionally Kent Beck's or Martin Fowler's canonical "test behavior not implementation" write-up if a current, stable link exists. Keep to authoritative sources; skip if nothing current.

---

## Scope

**Prerequisites (assume known, redefine in one line at most if used):**
- Vitest 4 installed, `globals: false`, the three test projects, `vitest`/`vitest run` (L1) — every sample imports from `'vitest'`; do not re-teach config.
- The honeycomb and the seam catalog — `authedAction`, `authedRoute`, `requireOrgUser`, webhook receiver, `safeLimit`, `error.tsx` (L2, originally ch080 L3) — reuse the names; do not re-justify the shape.
- Coverage as a diagnostic; the "what would have to change for this test to fail" heuristic; theatre tests (L3) — reuse the heuristic; do not re-teach coverage.
- The `/lib` surface (validators, mappers, codecs), `Result` types (Unit 6), RFC 9457 bodies (Unit 16), `safeLimit` fail-open carve-out (ch081), `processed_events` idempotency (Unit 11) — these are the example material; the student built them.

**Out of scope (name-forward only, do not teach):**
- Pure-function test surface depth, the daily `/lib` workflow — ch087 L1.
- Factories vs shared fixtures — ch087 L2.
- Pinning time / IDs / randomness (determinism seams) — ch087 L3. (This lesson only mentions `expect.any()` as a matcher for varying fields, pointing forward.)
- Type-level tests, `expectTypeOf`, `vitest --typecheck`, `*.test-d.ts` — ch087 L4.
- Async-test mechanics, the forgotten-`await` trap, `resolves`/`rejects` depth — ch087 L5. (Mention the resolved/rejected *observable* in the layer table; no mechanics.)
- Unhappy-path testing at depth — ch087 L6. (Name the two-tests-per-seam habit; defer the how.)
- MSW, transaction rollback (`withRollback`), real test Postgres lifecycle, auth fixtures — ch088. (State "mock at the boundary"; build it there.)
- React Testing Library, jsdom, component-test queries and triggers — ch089. (One line in the layer table.)
- Playwright / E2E — ch090.
- CI wiring, the `no-focused-tests` / `it.only` lint rule, JUnit reporter — ch097. (Do not teach `it.only` lint config; if `it.only` is mentioned as a left-in-commit smell, attribute the rule to ch097.)
- Mutation testing / Stryker — out of scope for the unit (L3 named it once).

---

## Notes for downstream agents

- **Vitest 4, `globals: false`:** every test sample begins `import { describe, it, expect } from 'vitest'` (add `vi` only in the implementation-coupling counter-example). This is deliberate and matches L1 — do not switch to ambient globals for brevity.
- **No invented domain.** Pull every example from the student's codebase: invoices, orgs/roles, the six seams, the `/lib` validators and mappers. The webhook receiver and `safeLimit` are the richest seam examples for the behavior-vs-implementation contrast.
- **The bad examples must be genuinely tempting,** not strawmen — the implementation-coupled test should look like something a competent dev writes on autopilot (a `spyOn` + `toHaveBeenCalledWith`), so the lesson lands.
- **Deliberate divergence from Code conventions:** none expected — the conventions' Testing section already prescribes AAA, `it('<outcome> when <conditions>')`, one behavior, async-assertion form, and the seam catalog. Stay aligned. The only convention items this lesson *won't* cover (determinism seams, `expectTypeOf`, `withRollback`, async `resolves`) are explicitly ch087/ch088's and should be name-forwarded, not taught.
- **Step colors** in the AAA `AnnotatedCode` (blue Arrange / green Act / violet Assert) are local and chosen for legibility; they need not match L2's layer palette (unit=blue, integration=teal, component=violet, E2E=orange). If reuse causes confusion, the local choice wins — note it so a later consistency pass doesn't "fix" it.
