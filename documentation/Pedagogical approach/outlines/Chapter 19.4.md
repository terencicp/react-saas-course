## Concept 1 — Component tests are off by default

**Why it's hard.** Students arriving with bootcamp habits or pre-2024 React experience treat "write a test for every component" as the responsible reflex. The 2026 server-first reality inverts that: most of the rendered tree is framework-orchestrated, most behavior tests at the seam, and a 200-test RTL suite that catches no bugs is the predictable consequence of the old reflex.

**Ideal teaching artifact.** A *misconception-first ambush*. The student opens the lesson on a recognizable scene: a fictional team's component-test suite, two months in, scrolling past file after file of `<Card> renders children`, `<Button> accepts onClick`, `<Section> applies className`. They predict, before reading further, how many of those 200 tests caught a real production bug in the last quarter. Reveal: zero. A second panel overlays the same codebase's bug postmortems — every incident's root cause sits at the data seam, the Server Action, or the money path. The student sees, visually, the gap between where the tests are and where the bugs are. The frame "off by default" lands as the conclusion the student already drew, not as an assertion to absorb.

**Engagement.** A short `TrueFalse` round on five concrete components — `<Card>`, an async Server Component, a multi-step form, a Stripe redirect button, a shared `<DataTable>` — asking *"this earns a component test"*. The student commits a guess before the trigger language is even introduced; the lesson then names the rule that made their answers right or wrong.

**Components.**
- Open with a `Figure` containing a hand-SVG split panel: left side a tall stack of green-passing test files, right side a separate stack of red production incidents, with an arrow gap labeled "where the tests live vs. where the bugs are."
- `TrueFalse` round of five statements for the prediction-then-reveal beat.
- Alternative: a small bespoke `BugMissTimeline` component that animates the gap. Demoted — single-use, no forward-link in the testing unit's remaining chapters; the hand-SVG carries the same teaching weight.

---

## Concept 2 — The three triggers (plus the accessibility-regression trigger)

**Why it's hard.** "When should I write a component test?" is a fuzzy question that students answer with feel rather than rule. Without an explicit trigger language, they default to coverage-as-virtue and the suite drifts toward the 200-test failure mode from Concept 1.

**Ideal teaching artifact.** A *Decision* archetype, taught as a four-card reach-or-skip drill. Each card names a real component shape from the course's app — a shared `<DataTable>` used in thirty places; a `<SubscribeForm>` with conditional branches and a six-state machine; the cookie consent gate with legal weight; a login form's submit button. The student reads the shape and picks which of four triggers it matches: shared library, complex state, critical UX, accessibility-sensitive surface. The reveal explains *why* this shape crossed the threshold — bug density math for the library, state-graph nodes for the form, blast radius for consent, accessibility-tree fragility for the login. The triggers are named once and then enforced by the cards themselves.

**Engagement.** A `Buckets` sort follows: ten components from the course's codebase (some named in earlier units, some hypothetical) sorted into "shared library / complex state / critical UX / accessibility / no trigger met." The "no trigger" bucket should attract the majority of items — the sort itself teaches that *most* components don't earn the test.

**Components.**
- A `DiagramSequence` walking the four triggers, one card per step, each showing the component shape on one side and the bug density / blast radius reasoning on the other.
- `Buckets` for the post-artifact sort.
- The trigger cards themselves can be hand-SVG inside `Figure` panels if `DiagramSequence` feels heavy.

**Project link.** The 19.6 unit project tests the Stripe webhook (seam) and one money-path Checkout flow (E2E) — explicitly *not* a component test. The trigger language from this concept is what justifies that scope cut in the project brief.

---

## Concept 3 — The anti-triggers and the five-second mental gate

**Why it's hard.** Triggers tell you when to reach; anti-triggers tell you when to *stop*. The harder discipline is the second one — recognizing that a test you could write would duplicate coverage from the seam or the money path, and deleting the impulse before the test exists. Students under-apply this and write the same behavior at two layers.

**Ideal teaching artifact.** A *guided-puzzle* in the form of a "PR review" exercise. The student is shown five proposed component-test files, each with its filename, the component under test, and a two-line summary of what it asserts. For each, they pick *approve* or *reject*, and if reject, *why* — wrong surface (Server Component), duplicate of the action's integration test, presentational primitive, money path covered by E2E, framework-owned surface. The fifth file is correctly scoped (a date-range picker with a complex Temporal state machine) and approves cleanly. The puzzle *is* the five-second gate; running it in this concrete form is faster than memorizing five rules.

**Engagement.** The puzzle carries the assessment. A short `MultipleChoice` follow-up asks the student to recall the gate's five questions in order — *Server Component? Covered by action test? Presentational? On money path? Trigger met?* — as a single ordered checklist they will run in their head on every new component test PR.

**Components.**
- A bespoke `PrReviewDrill` component: shows a stack of mock PR diffs/file headers; the student approves or rejects each with a reason; AI or rubric grading confirms.
- Alternative: a `Sequence` of approve/reject decisions over five static `Code` blocks inside a `Figure`. Demoted only if `PrReviewDrill` doesn't already exist — see Concept 12, which uses the same artifact.
- `MultipleChoice` for the ordered-checklist recall.

---

## Concept 4 — The jsdom project as a separate fast slice

**Why it's hard.** Students who have only seen one-Vitest-config setups assume tests are tests. The point that jsdom boot adds 100–300 ms per test, that node-fast and DOM-slow suites must not mix, and that a `*.dom.test.tsx` glob keeps the unit lane uncontaminated, lands only if the cost shape is visible.

**Ideal teaching artifact.** A *Setup/wiring* lesson opened by a side-by-side timing strip — three bars showing typical durations: `/lib` unit test (~5 ms), integration with rollback (~20–80 ms), component test with jsdom (~100–300 ms), drawn to scale. The strip primes the student to care *before* the config block lands. Then the canonical wiring: `test.projects` extended with a `component` project, `environment: 'jsdom'`, the glob, the setup file. Each chunk of config is annotated with what it costs and what it would break if dropped.

**Engagement.** A `Dropdowns` exercise on a partially-filled `vitest.config.ts` — the student picks the right `environment`, glob, and setup file path from `<select>`s. Forces them to commit to the discriminator (`.dom.test.tsx`) rather than skim past it.

**Components.**
- `Figure` with a hand-SVG horizontal bar chart of the per-test timing strip (5 ms / 20–80 ms / 100–300 ms / seconds), labeled by layer.
- `AnnotatedCode` for the `test.projects` config — one step per chunk (`name`, `environment`, `include`, `setupFiles`).
- `Dropdowns` for the fill-in-the-config drill.

---

## Concept 5 — The render helper is the providers seam

**Why it's hard.** Students write `import { render } from '@testing-library/react'` reflexively and end up duplicating provider boilerplate across thirty test files. When a new provider lands in production (a new theme, a locale switch, a Toaster), they refactor thirty files. The seam concept — one wrapper the codebase calls instead of RTL's `render` directly — is invisible until that pain has already happened.

**Ideal teaching artifact.** A *Pattern* archetype framed around the diff. Show two parallel versions of a test file: version A imports RTL's `render` directly and wraps the component in `<NextIntlClientProvider locale="en-US" messages={enMessages}>` plus a theme provider in line; version B imports the project's `render` helper and calls `render(<SubscribeForm />)`. Then introduce a new requirement — a `<Toaster>` portal target must be in the tree for any component that fires toasts — and ask the student to predict the cost of adding it in version A versus version B. Reveal: thirty file edits versus one. The pattern reads as the obvious move once the cost asymmetry is visible.

**Engagement.** A `CodeReview` PR drill on a freshly-written component test — the student leaves an inline comment naming why the writer should not have imported `render` from `@testing-library/react`, and what the project's helper does that the raw import doesn't.

**Components.**
- `CodeVariants` with two tabs: "raw `render`" and "project `render` helper," showing the same test under each, with the maintenance cost called out in the caption.
- A second `CodeVariants` (or a follow-on `Code` block) showing the helper's implementation — `render(ui, { locale, messages })` returning `{ ...rtlReturn, user }`.
- `CodeReview` for the engagement drill.

---

## Concept 6 — `userEvent.setup()` and the await discipline

**Why it's hard.** v14 made every interaction async. Students writing `user.click(button)` without `await` get tests that pass for the wrong reasons — the assertion runs before the state flush, the test stays green even when the click does nothing. The bug is the same shape as 19.2.5's unawaited-promise trap, but the trigger surface is different and the symptom is silent.

**Ideal teaching artifact.** A *wrong-by-default sandbox*. The student opens a test file with three pre-written `it` blocks, each missing an `await` somewhere — one before `user.click`, one before `findByRole`, one inside a `waitFor`. The component under test is intentionally broken (the click handler does nothing). All three tests pass anyway. The student's job is to add the missing `await`s until each test correctly *fails*, then read why. The artifact teaches that a green test is not evidence — only a test that *fails when the code is broken* is.

**Engagement.** The sandbox carries the assessment. A short `Tokens` follow-up presents one consolidated test, with every `user.click`, `findByRole`, and `waitFor` highlighted; the student clicks the ones that need `await`. Locks the reflex in.

**Components.**
- `ReactCoding` in tests mode, with the three broken-but-passing tests pre-seeded. The student edits the test code until the assertions fail correctly — the criteria check is that all three tests must fail on the broken component.
- `Tokens` for the await-spotting follow-up.
- Alternative if `ReactCoding`'s test mode can't host Vitest-style `userEvent` directly: a `ScriptCoding` or a static `AnnotatedCode` walk through each missing `await`. Demoted — the sandbox is the highest-teaching form and `ReactCoding` is the existing surface closest to it.

---

## Concept 7 — The query priority ladder

**Why it's hard.** A single button has seven plausible queries — testid, class, id, text, label, role+name, alt. Students reach for whichever is fastest to write (`getByTestId`) and the suite ages into something that asserts nothing about the user-visible surface. The ladder is short — eight steps — but the *reason* for the order is the lesson, not the order itself.

**Ideal teaching artifact.** A *controllable comparison widget*. Render a single submit button with seven different attributes attached (id, class, text, aria-label, role, alt, testid). A row of seven query buttons sits below — `getByTestId`, `getByText`, `getByLabelText`, `getByRole({ name })`, etc. — and a toggle row of seven "degrade the button" switches above: remove the accessible name, change the text, rename the class, swap the testid. The student picks a query, then flips toggles to see which queries break and which survive. The role+name query survives almost every change except the one that breaks accessibility — at which point the test fails and the component is genuinely broken. The widget makes the ladder's ordering *felt* rather than memorized.

**Engagement.** A `Sequence` exercise: drag the eight query types into priority order. The widget primes the answer; the sort confirms it. Optional follow-up `MultipleChoice` asking why role+name sits at the top — answer choices include "fastest to write," "shortest," "matches what assistive tech sees" (correct), "least likely to break."

**Components.**
- A bespoke `QueryLadderWidget`: renders a target element with toggleable attributes; shows the result of each Testing Library query (pass / fail / which element matched) reactively.
- `Sequence` for the post-widget ordering drill.
- `MultipleChoice` for the why-it's-first follow-up.

---

## Concept 8 — The query ladder doubles as an accessibility audit

**Why it's hard.** Students treat accessibility as a separate concern with its own tooling (axe, Lighthouse, screen-reader audits). The insight that a role-first test *is* the audit — that the same query fails the moment the accessible name disappears — is the kind of leverage point students only believe after seeing it cause-and-effect.

**Ideal teaching artifact.** A *scrubbable scrollytelling* sequence over three frames. Frame one: a submit button with `aria-label="Confirm purchase"`, test passes, screen-reader transcript shown alongside reads "Confirm purchase, button." Frame two: a designer removes the `aria-label` in pursuit of cleaner JSX; the screen-reader transcript now reads only "button," the test fails on the same line. Frame three: the developer reads the test failure and restores the accessible name, both the test and the screen reader recover together. The student scrubs back and forth between frames and sees that *the test failure and the accessibility regression are the same event, observed by two instruments*.

**Engagement.** A `MultipleChoice` with one stem and four scenarios: "Which of these failing tests is also an accessibility bug?" — the student picks the one(s) where the failure is caused by a missing role or accessible name (correct: most of them) versus a class-name churn (not an a11y bug). Reinforces that the ladder's value compounds.

**Components.**
- `DiagramSequence` with three steps; each step is a side-by-side `Figure` showing component JSX, the test result (pass/fail), and the screen-reader announcement.
- `MultipleChoice` for the recall pass.

---

## Concept 9 — `getBy` vs. `queryBy` vs. `findBy`

**Why it's hard.** Three queries that look interchangeable but encode three different *intents*: "is here now," "is NOT here," "will be here after async work." The misuse pattern is consistent — `getBy` used for negative assertions throws before the assertion runs and surfaces a confusing error; `findBy` used for synchronous checks slows the suite. Students need the intent baked in, not the API memorized.

**Ideal teaching artifact.** A short *Mechanics* lesson built on a three-column intent table — `getBy` / `queryBy` / `findBy`, with the *intent* phrase in the header, the *behavior on missing element* in row two, and the *typical assertion* in row three. The table is followed by three short tests, each with a mistake — `getBy` used for "is NOT here," `findBy` used for a synchronous render, `queryBy` used after an interaction without `waitFor`. The student diagnoses each.

**Engagement.** A `Matching` drill: three intent phrases on the left ("is here now," "is NOT here," "will be here after async work"), three queries on the right. Locks the intent-first reading.

**Components.**
- `Figure` containing a hand-built three-column table; the intent header is the load-bearing row, set in larger type.
- `CodeVariants` with three tabs, each tab showing one of the three misuse patterns plus its fix.
- `Matching` for the engagement drill.

---

## Concept 10 — Behavior is what the user observes

**Why it's hard.** Students who learned Enzyme-era patterns or who read post-2020 tutorials carry assumptions about asserting on state, props, hook execution order, or class names. The mental shift to "if a user can't see it, don't assert on it" is a posture change, not a syntax change — which makes it slippery.

**Ideal teaching artifact.** A *Buckets* sort framed as a smell test. Twelve assertion snippets sit on the screen — `expect(component.state.isOpen).toBe(true)`, `expect(screen.getByRole('alert')).toBeInTheDocument()`, `expect(mockOnSubmit).toHaveBeenCalledWith(...)`, `expect(container.querySelector('.btn-primary')).toBeInTheDocument()`, `expect(screen.findByText(/invoice sent/i)).resolves.toBeVisible()`, and so on. The student drags each into "user observes" or "implementation peek." The buckets' final tallies are the lesson — the implementation-peek bucket is the smell.

**Engagement.** The buckets carry the assessment; after sorting, the student reads a single paragraph naming each implementation-peek pattern by its remediation ("re-write as role+name query," "delete — covered at the seam," "re-write as `toBeVisible`"). A `Tokens` round on one composite test follows: the student clicks every assertion that observes implementation rather than user behavior.

**Components.**
- `Buckets` (two-column) for the twelve-assertion sort.
- `Tokens` over a longer composite test for the follow-up.

---

## Concept 11 — Mocking Server Actions at the import, and how layers compose

**Why it's hard.** A client component imports a Server Action and calls it. The component test should not run the action's body — that's the integration test's job (19.3.7). But students either mock too shallowly (asserting only that the action was called, missing the form's branching) or too deeply (asserting on database rows from a component test, duplicating the seam). The pattern is `vi.mock` at the import, per-test `mockResolvedValue` returning `Result.ok` or `Result.err`, and the *test composes* with the action's own integration test rather than overlapping.

**Ideal teaching artifact.** A *Pattern* archetype shown as a stacked layer diagram. Top layer: the component test, asserting on what the user sees when the action returns `Result.err({ code: 'CARD_DECLINED' })`. Middle layer: the action's integration test (19.3.7), asserting on the database row, audit log, and Stripe call when given valid input. Bottom layer: the action's body itself. Arrows show what each test trusts and what each test owns. Then a paired `CodeVariants` showing two versions of the component test — one over-mocked (asserts DB rows from a component test), one correctly scoped. The student reads the diagram, then the code variants, then names the over-reach.

**Engagement.** A `CodeReview` drill on a real-shape component test for `<SubscribeForm>`: the student leaves inline comments flagging two over-reaches (an assertion on the database, an assertion on the mock's call count *and* on the response shape) and approves the role+name assertion on the rendered error alert.

**Components.**
- `Figure` containing a hand-SVG three-layer stack (component test / integration test / action body) with arrows labeled "trusts" and "owns."
- `CodeVariants` with two tabs — over-mocked vs. correctly scoped.
- `CodeReview` for the engagement drill.

**Project link.** The 19.6 project mocks Stripe at the wire (MSW) but does *not* mock the Server Action — because the action *is* the unit under test there. This concept's "what each layer trusts and owns" framing is the rule that decides which seam to mock in 19.6.

---

## Concept 12 — The catalog as canon

**Why it's hard.** Triggers and queries are abstract until applied. Five components in the course's app meet the bar — cookie consent, subscribe form, date-range picker, data table, checkout summary — and each meets it for a *different* trigger. Students need to see the trigger-to-test mapping concretely on components they have already built or read about in earlier units, or the triggers stay theoretical.

**Ideal teaching artifact.** A *Reference/survey* archetype, but framed as a "what trigger, what to assert, what to leave out" card per component. Five cards, scrubbed through. Each card has three sections: trigger met (one line, named from Concept 2), three to six behaviors to assert (each phrased as "the user sees X" or "after the user does X, Y happens"), and *what this test deliberately does not cover* (the seam, the E2E, the library internals). The "leave out" section is what makes the catalog canon — it teaches the layered composition by showing it five times in a row.

**Engagement.** A `Matching` drill at the end: five components on the left, five triggers on the right (some triggers appear twice — shared library covers two components). Then a follow-up `Buckets` sort with twelve hypothetical assertions across the five catalog components, sorted into "component test owns" / "seam owns (19.3.7)" / "E2E owns (19.5)." The sort is the chapter's terminal assessment — it pulls together every concept above.

**Components.**
- `DiagramSequence` with five steps, one per catalog component; each step is a card with the three sections (trigger / assertions / left out).
- `Matching` for the trigger-to-component drill.
- `Buckets` (three-column) for the terminal assertion-ownership sort.

**Project link.** The catalog explicitly *excludes* anything covered by the webhook integration test or the Checkout Playwright test — which is exactly the scope of project 19.6. The catalog's "left out" sections are the de facto brief for what 19.6 *does* cover.

---

## Component proposals

- **`BugMissTimeline`** — animated split-panel comparing component-test counts vs. bug-postmortem root causes over time. Inputs: arrays of test files and incident summaries.
  - Uses in this chapter: Concept 1.
  - Forward-links: None — single-use.
  - Leanest v1: a hand-SVG inside `Figure` (already the primary recommendation). The bespoke component is the alternative; flagged here because single-use with no forward-link, do not build.
- **`PrReviewDrill`** — stack of mock PR diff headers, each with approve / reject + reason; rubric or AI grading.
  - Uses in this chapter: Concept 3, Concept 11.
  - Forward-links: Could compound in any chapter teaching a decision gate via review (19.5 money-path filter has the same shape; 16.x conditional-tool reach lessons; any "when to reach for X" decision lesson). Worth building once if Unit 19 and 20 will reuse.
  - Leanest v1: a `Sequence` over five static `Code` blocks, ordering "approve" vs. "reject" buttons inline; no AI grading, no rubric. Teaches the gate; loses the per-card *why* phrase. Build v1 if the AI grading is the cost driver.
- **`QueryLadderWidget`** — interactive single-element + togglable attributes + a row of Testing Library queries that show which match.
  - Uses in this chapter: Concept 7.
  - Forward-links: None within Unit 19. Could plausibly anchor an accessibility-focused lesson in a future a11y chapter or a Storybook-style components chapter; no committed forward link in the current TOC.
  - Leanest v1: a static `TabbedContent` with four tabs (one per attribute-removed variant), each showing the eight queries and their pass/fail. Loses the toggle interactivity but keeps the cause-and-effect. Worth considering v1 first given the lack of forward-links.

## Build priority

`PrReviewDrill` is the only proposal that compounds — it appears in two concepts this chapter (3 and 11) and the same review-the-decision shape recurs across Unit 19's remaining chapters (19.5's money-path filter, 19.6's project brief). Build it first; the AI-graded version is worth the cost if Unit 20 will reuse the form for observability and performance decisions.

`QueryLadderWidget` is single-chapter, single-concept, but the concept it carries is the highest-value lesson in the chapter (per the outline's own estimate) and the cause-and-effect manipulation is what makes the ladder *felt*. Build the leanest v1 (static `TabbedContent` showing attribute-removed variants) first; promote to the full interactive widget only if student feedback shows the static version doesn't land.

`BugMissTimeline` should not be built. The hand-SVG inside `Figure` carries the same teaching for Concept 1 and there is no forward-link.

## Open pedagogical questions

- Concept 6's wrong-by-default sandbox is the highest-teaching form for the await discipline, but `ReactCoding` in tests mode may not faithfully host `@testing-library/user-event` v14's async semantics inside the in-browser runtime. If the iframe can't reproduce the silent-pass behavior, the artifact needs to fall back to `AnnotatedCode` and the concept loses its sharpest beat.
- Concept 12's terminal `Buckets` sort spans three layers (component / seam / E2E) and relies on the student remembering 19.3.7's seam coverage and forward-referencing 19.5's E2E scope. If 19.5 has not yet been read at quiz time, the sort tests material the student doesn't yet own — consider moving the three-column sort into the 19.5 quiz or the 19.6 project brief instead.
