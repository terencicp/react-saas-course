## Concept 1 — Vitest is the 2026 runner

**Why it's hard.** A returning dev's instinct is Jest, because Jest is what they last touched. The misconception is that runner choice is interchangeable — that you grab one, write tests, move on. The senior read is that the runner's relationship to ESM, TypeScript, and the project's module graph decides whether the suite takes 90 seconds or 9, and whether the config is a wall or a window.

**Ideal teaching artifact.** A two-column **decision-anatomy comparison** (Decision archetype): Jest column and Vitest column, four rows naming what each *requires you to wire* — ESM support, TypeScript transform, watch-mode granularity, jsdom/node split. Each cell shows the literal config the runner demands (Babel preset entries, `ts-jest` transformer line, custom `globalSetup`) versus the Vitest equivalent (often empty, or a single option). The student reads not "Vitest is faster" but "Jest requires these four pieces of plumbing the project doesn't otherwise need." The cell sizes themselves make the argument visually.

**Engagement.** A short multiple-choice round after the comparison: given a scenario (ships a `.ts` file with top-level `await`, runs on Node 26, imports a `.css` module), which runner needs additional plumbing to handle it? Three scenarios; the student picks Jest-or-Vitest for each and reads the one-line explanation.

**Components.**
- `TabbedContent` inside `Figure` for the two-column anatomy comparison, with each panel rendering a small annotated config snippet (use `Code` blocks inline).
- `MultipleChoice` for the three-scenario engagement round.

**Project link.** The 19.6 project ships a Vitest integration config the student reads in 19.6.2; the comparison here is what justifies that config existing in the form it does.

---

## Concept 2 — One config, multiple projects: the environment split

**Why it's hard.** Junior devs default to either one mono-suite (everything runs in jsdom, node tests get a fake `window`) or two separate runner configs (different commands, different watchers). Both fail at scale — the first contaminates node tests with browser globals, the second forks the watch loop. The senior move is *one config, multiple projects* with per-project environment and include glob. The mental model the student lacks is that a "project" is a slice of the suite, not a separate runner.

**Ideal teaching artifact.** A **single-config anatomy diagram** (Concept archetype) showing the `vitest.config.ts` as a parent box with three nested project boxes: `unit` (env: node, glob: `src/lib/**`), `integration` (env: node, glob: `**/*.int.test.ts`), `component` (env: jsdom, glob: `**/*.tsx`, marked "lands in 19.4"). Arrows from the root to each project showing which options inherit and which override. Below the diagram, a paired `vitest --project unit` / `vitest` command pair with output stubs showing the file count each picks up.

**Engagement.** A `Buckets` exercise: ten file paths from the course's app (`/lib/temporal/codecs.test.ts`, `/app/api/webhooks/stripe.int.test.ts`, `/components/DateRangePicker.test.tsx`, etc.) sort into three buckets — `unit`, `integration`, `component`. The student feels the glob doing the routing.

**Components.**
- `Figure` wrapping a hand-authored SVG (or `ArrowDiagram`) for the config-anatomy diagram — the layout itself carries meaning (root config + nested projects with inherit/override arrows).
- `Buckets` for the file-routing sort.

**Project link.** 19.6.2 has the student read the integration project config they'll be writing tests against; the anatomy here is the prep.

---

## Concept 3 — Files parallel, tests sequential: the isolation contract

**Why it's hard.** A test that passes alone but fails in the suite is the classic flake. The cause is almost always shared state — a module-level cache, a `vi.mock` that leaked, a DB connection pool that wasn't torn down. The student needs to internalize the runner's concurrency model *before* writing tests, not after the first flake. The misconception: "tests run in order, so I can set up state in test 1 and read it in test 2."

**Ideal teaching artifact.** A **scrubbable concurrency timeline** (Concept archetype, new component) showing four test files as horizontal lanes. The student drags a time-cursor and watches workers pick up files in parallel; inside each lane, the tests run sequentially with `beforeEach` markers. A toggle adds a "shared module-level variable" between two files — the timeline visually shows the variable's value diverging per worker, because workers don't share memory. A second toggle adds shared state *within* a file — the variable persists test-to-test, because tests in a file are sequential and share the module. The student leaves with the rule: *file isolation is free, in-file isolation is your job.*

**Engagement.** A two-question `PredictOutput`: given two tests in the same file that both mutate a module-level array, predict the second test's view of it. Then the same two tests *split across two files* — predict again. The contrast is the lock-in.

**Components.**
- New: **`ConcurrencyTimeline`** — props for files (each with tests), toggles for module-level and file-level shared state; renders a scrubbable lane diagram with state values annotated per cursor position.
- `PredictOutput` for the two-question round.

**Project link.** 19.3.8 (flake taxa) and 19.3.1 (transaction rollback) both lean on the isolation model installed here — the project's webhook tests fail without it.

---

## Concept 4 — The honeycomb: shape follows bug density

**Why it's hard.** The pyramid is the shape every prior-decade testing course taught. The student has internalized "many unit, few integration, very few E2E." For a Next.js SaaS in 2026 this is the wrong distribution — the framework owns most orchestration, so unit-testing leaves the seams (Server Actions, webhooks, Drizzle queries) under-defended. The honeycomb isn't a different style; it's a consequence of where bugs actually land in *this* architecture. The student needs to feel the shift, not just be told.

**Ideal teaching artifact.** Two coordinated artifacts, because the concept has a "why" and a "what." First, a **bug-density-to-shape mapping** (new component, Concept archetype): a list of eight realistic bugs from the course's app (cross-tenant filter missing `orgId`, webhook receiver JSON-parsed before signature verification, cache tag mismatch, rate limiter swallowed Redis throw, etc.). Each bug card has a "which layer would catch this?" dropdown — unit, integration, component, E2E. As the student answers, a bar chart on the side grows: tallies per layer. By the end, the integration bar dominates. The chart *is* the honeycomb, derived not asserted.

Second, a **three-shape comparison** (Decision archetype): pyramid, trophy, honeycomb side by side as `Figure`-wrapped SVGs, with a one-line "right when…" caption per shape. The student now sees their derived bar chart and the named shape it produces.

**Engagement.** The mapping exercise *is* the engagement (guided puzzle). Follow-up confirmation: a `MultipleChoice` asking which shape fits each of three system descriptions (a banking back-end, a 2026 Next.js SaaS, a React component library) — confirms the student can apply the "shape follows bug density" rule outside the course's app.

**Components.**
- New: **`BugDensitySort`** — list of bug scenarios, each with a "which layer catches this" dropdown; live bar-chart aggregation as the student answers; reveal text per bug explaining why.
- `Figure` wrapping hand-authored SVG for the three-shape comparison (pyramid / trophy / honeycomb).
- `MultipleChoice` for the shape-to-system confirmation round.

**Project link.** The 19.6 deliverable is "three webhook integration tests plus one Playwright test" — the honeycomb's exact distribution. The student should leave 19.1.2 understanding why 19.6 isn't asking for unit tests of the webhook handler.

---

## Concept 5 — Coverage is a diagnostic, not a target

**Why it's hard.** The CI gate at "≥80% lines" is everywhere, and the student likely thinks chasing the percentage is the work. The senior reframe — *100% is a smell, the report is a map of un-exercised paths to read with judgment* — feels paradoxical without seeing what theatre looks like in practice. The student needs to see a covered-but-untested codebase before they'll trust the reframe.

**Ideal teaching artifact.** A **theatre vs signal** side-by-side (Pattern archetype). Two test files for the same `mapStripeError` function. The left file has six `it` blocks, all of the form `expect(typeof mapStripeError).toBe('function')`, `expect(mapStripeError(input)).toBeDefined()`, etc. — 100% line coverage, zero branch coverage on the actual decision points. The right file has three `it` blocks that exercise the actual branches (known error code, fallback case, error with `cause`) — same coverage percentage on the line metric, *full* branch coverage. Below both, the coverage HTML snippet showing identical green-percentages. The visual punchline: percentages match, signal does not.

**Engagement.** A short `Tokens` exercise on the left (theatre) test file — the student clicks the assertions that "would not fail if the function were replaced with `() => undefined`." Three correct picks (the `typeof` check, the `toBeDefined` check, the snapshot of an internal helper); decoys are the assertions that would actually catch the swap. The click confirms the student can spot theatre.

**Components.**
- `CodeVariants` or `TabbedContent` for the two test-file comparison (with a `Figure` below showing matching coverage percentages).
- `Tokens` for the "which assertion is theatre" click round.

**Project link.** 19.6's "verify and mutation drills" lesson (19.6.6) makes the student deliberately mutate the handler to confirm their tests catch it — the theatre/signal distinction installed here is what makes that drill comprehensible.

---

## Concept 6 — Branch over line, per-directory thresholds, absence audit

**Why it's hard.** Once the student accepts "100% is theatre," they need an operational alternative. The misconception that creeps in: "if not 100%, then no threshold at all." The senior shape is three moves stacked — read **branch** coverage not line, set thresholds **per directory** weighted to the seams, and add the **absence-of-tests audit** so untested files don't vanish from the report. Each move is small; the combination is what works.

**Ideal teaching artifact.** A **coverage-config worked example** (Mechanics archetype) walking the `vitest.config.ts` coverage block line by line with `AnnotatedCode`. Stop on each highlighted region: the `coverage.all: true` line (annotation: "without this, untested files vanish — coverage tells you what *ran*, not what was *written*"); the per-directory `thresholds` object with `/lib/**` at 90/85, `/app/api/webhooks/**` at 85 branches (annotation: "high-stakes seam, every uncovered branch is a webhook bug"); the `exclude` array (annotation: "framework-orchestrated surface, tested at the integration seam"). Each annotation includes a one-line justification the student would write next to the threshold in their own repo.

**Engagement.** A `TrueFalse` round on six statements about coverage discipline: "branch coverage and line coverage diverge most on functions with early returns" (T), "a 100%-covered file is necessarily well-tested" (F), "files in the `exclude` array don't appear in the report" (T), "`coverage.all: true` is what makes untested files show as zero rather than disappearing" (T), etc. End-of-round score confirms the operational rules stuck.

**Components.**
- `AnnotatedCode` for the stepped coverage-config walkthrough.
- `TrueFalse` for the six-statement confirmation round.

---

## Concept 7 — Arrange, act, assert: one behavior, one act

**Why it's hard.** The student has likely written tests as "set up everything, call the function a few times, throw in assertions wherever." The AAA shape is structural discipline that pays off years later, not minutes later — so the rationale ("scannable, scoped, debuggable") feels abstract until the student sees a malformed test next to its AAA-shaped peer.

**Ideal teaching artifact.** A **misformed-then-formed test pair** (Pattern archetype, wrong-then-right). Show a real-looking test with interleaved assertions inside the arrange, two act-and-assert pairs jammed together, an unfocused test name (`'works correctly'`). Then show its AAA-decomposed peers — two `it` blocks, each with three blank-line-separated sections, names of the form `it('<observable outcome> when <conditions>')`. The diff between them is the lesson. Annotate the formed version with margin labels: "this is arrange," "this is act," "this is assert," "the name reads as the behavior."

**Engagement.** A `Sequence` exercise: given the shuffled lines of a Server Action test (fixture creation, a `signedInAs` call, the action invocation, an `expect.toMatchObject` on the `Result`, an `expect` on a DB row), drag them into the canonical AAA order. The drag motion *is* the rule — arrange first, one act, asserts last.

**Components.**
- `CodeVariants` for the wrong-then-right test pair.
- `Sequence` for the AAA-ordering drag.

**Project link.** Every test the student writes in 19.6.3, 19.6.4, and 19.6.5 follows this shape; the grader for those lessons reads test names looking for the `<outcome> when <conditions>` pattern.

---

## Concept 8 — Behavior over implementation: survives the refactor

**Why it's hard.** This is the rule the entire unit references, and it's the rule most easily violated by a well-meaning student. The misconception: "more assertions = more tested." The reality: a test that asserts on which private helper got called couples to *how* the function works; rename the helper and the test breaks even though behavior is identical. The student needs to internalize the "black box" reflex — *replace the function with a different implementation satisfying the same contract; does the test still pass?*

**Ideal teaching artifact.** A **wrong-by-default refactor sandbox** (new component, Pattern archetype). The student sees a `getInvoicesForOrg` function with three internal helpers (`_buildQuery`, `_paginate`, `_serializeRow`) and a test file with five assertions. Two assertions are behavior-anchored (return shape, error on missing `orgId`); three couple to implementation (`vi.spyOn(_buildQuery)`, assertion on `_paginate.calls[0]`, snapshot of internal row shape). The student hits a "refactor" button — the implementation flips to inline the helpers, no behavior change. Three tests turn red. The student then deletes or rewrites the implementation-coupled assertions; the button now flips the refactor again, and the suite stays green. The artifact carries its own assessment — the student has to *make the suite survive*.

**Engagement.** The sandbox is the assessment; the follow-up beat is a `Buckets` sort with eight assertion fragments, one column "behavior" and one column "implementation" — confirms the distinction transfers outside the sandbox context.

**Components.**
- New: **`RefactorSandbox`** — props for two function implementations (same behavior, different internals) and a list of assertions; renders a "run tests" button that switches implementations and shows pass/fail per assertion; lets the student delete or rewrite assertions and re-run.
- `Buckets` for the behavior-vs-implementation classification round.

**Project link.** 19.6.6's mutation drills depend on this concept — the student deliberately changes the webhook handler and verifies the *right* tests fail. Tests coupled to implementation give false positives there; behavior-anchored tests pinpoint the breakage.

---

## Component proposals

- **`ConcurrencyTimeline`** — props: `files: { name, tests: string[] }[]`, `toggles: { moduleLevelState, fileLevelState }`. Renders horizontal lanes per file with a scrubbable time-cursor; toggles annotate state values that diverge across workers vs persist within a file.
  - Uses in this chapter: Concept 3.
  - Forward-links: 19.3.8 (flake taxa — order-dependence and shared-state flakes use the same model); 19.3.1 (per-worker DB isolation visualized).
  - Leanest v1: a static three-panel `DiagramSequence` showing (a) two files starting in parallel workers, (b) shared module-level state diverging, (c) within-file state persisting across tests. Scrub-by-step rather than continuous time. Still teaches the rule; loses the toggle interaction.

- **`BugDensitySort`** — props: `bugs: { description, correctLayer }[]`. Renders bug cards with a layer-dropdown each; aggregates answers into a live bar chart that resolves into the honeycomb shape.
  - Uses in this chapter: Concept 4.
  - Forward-links: 19.3 (every integration test in the unit could reference the bug catalog this seeds); 17.1.3 seam catalog (the bugs *are* the seams).
  - Leanest v1: a `Buckets`-shaped exercise sorting eight bugs into four layer columns, followed by a static bar chart `Figure` showing the result. Same teaching effect; loses the "chart grows as you answer" reveal.

- **`RefactorSandbox`** — props: `implementations: { name, code }[]`, `assertions: { code, behaviorOrImplementation }[]`. Renders a runnable test panel with a "swap implementation" button; assertions that couple to implementation turn red on swap; student edits assertions and re-runs.
  - Uses in this chapter: Concept 8.
  - Forward-links: 19.2.1 (every `/lib` test should pass the black-box reflex); 19.6.6 (mutation drills are the same mechanic — change the source, see which tests catch it).
  - Leanest v1: a `CodeVariants` showing two implementations and one shared test file, with a manual "see which fail" reveal underneath. Loses the student's ability to edit and re-run; keeps the wrong-then-right shape.

## Build priority

`RefactorSandbox` carries the most teaching load across the curriculum — the behavior-over-implementation rule recurs through all of Unit 19 and shows up again whenever the course teaches refactoring discipline. Build it first; its leanest v1 is *not* much cheaper than the full thing (the runnable swap is what carries the lesson), so build the full version.

`BugDensitySort` is the next priority — it teaches the honeycomb derivation that justifies every later chapter's distribution choice, and the underlying mechanic (sort scenarios, watch a chart resolve into a known shape) is reusable for any "shape follows X" pattern. The lean v1 (Buckets + static chart) is acceptable if budget forces the call.

`ConcurrencyTimeline` is third. Its forward-links are real (flake taxa, per-worker DB) but the lean v1 is dramatically cheaper and still teaches the rule; build v1 first and promote to interactive only if 19.3.8 confirms the same mental model is needed live.

## Open pedagogical questions

- Concept 4 proposes deriving the honeycomb from a sorted bug catalog — does the course want the student to *derive* the shape (longer, stickier) or *receive* the named shape and immediately apply it (faster)? The chapter is short, so the derivation cost may not fit; if not, demote `BugDensitySort` to a post-hoc confirmation rather than the lead artifact.
- Concept 8's `RefactorSandbox` assumes the student can read a small swap of internal helpers and reason about it. The chapter is before any meaningful test-writing in the course. Is the example too abstract for the first encounter with the rule, and should it instead live in 19.2.1 where the student is actively writing `/lib` tests?
