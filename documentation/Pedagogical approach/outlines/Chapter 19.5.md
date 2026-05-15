## Concept 1 — The money-path filter as a trigger gate

**Why it's hard.** The pyramid-era reflex is "new flow ships, new E2E test ships." Students arrive with that instinct intact, and the cost of leaving it intact is the 80-test, 25-minute, retry-until-green suite that catches none of the bugs that actually escape. The concept that has to land is not "write fewer E2E tests" but a binary trigger: failure on this path either moves money, breaks identity, or destroys unrecoverable data, or this is the wrong tool.

**Ideal teaching artifact.** A misconception-first ambush: the chapter opens with a roster of a fictional team's twelve recent feature flows (settings page polish, dark-mode toggle, OAuth sign-in, refund handler, marketing landing redesign, invitation acceptance, ...). The student is asked to mark which deserve a Playwright test before the trigger is named. They commit answers, then the four-question senior gate is revealed and applied to each roster item one by one, with the test result table flipping as the gate filters them. The form is a **decision-gate ambush** — the student's pre-trigger intuition is captured and then visibly corrected against the rule.

**Engagement.** After the reveal, a `Buckets` drop sort: a fresh set of ten flows the student classifies into *Playwright*, *integration seam*, *component test*, *manual smoke / no test*. The bucket sort confirms the filter generalizes past the worked roster.

**Components.**
- `MultipleChoice` (multi-select mode) for the initial twelve-flow commit before the reveal.
- `Figure` containing a two-column hand-authored table (flow / verdict) for the post-reveal walkthrough, with the four-question gate beside it as static prose blocks.
- `Buckets` for the confirmation sort.

**Project link.** The four-question gate is the same gate 19.6 applies when picking which Stripe surfaces become Playwright tests versus seam tests.

---

## Concept 2 — Year-one zero and the runtime/flake cost curve

**Why it's hard.** "Default zero" sounds like negligence to a student trained on coverage-as-virtue. The trigger from Concept 1 is the *rule*; this concept is the *economics* that makes the rule rational. Students need to feel, not be told, how 30 tests becomes 200 tests becomes a CI bottleneck and a retry-driven suite that hides bugs.

**Ideal teaching artifact.** A controllable **cost-curve simulator**. The student moves three sliders: unit-test count, integration-test count, E2E-test count. The widget computes total CI minutes (using the lesson's per-layer cost shape — 5 ms / 50 ms / 5 s), plots a stacked bar of where the budget goes, and surfaces a flake-probability estimate that rises non-linearly with E2E count. A second control toggles `retries: 1` versus `retries: 3` and re-renders the "bugs masked" annotation. The student watches a 30-E2E suite hit a 3-minute pole and a 200-E2E suite hit a 20-minute pole, with the integration band staying flat. The form is an **explorable economic model** — the curve is the teacher.

**Engagement.** `PredictOutput`-style numeric prediction immediately before the simulator is revealed: "your team has 20 unit, 50 integration, and 60 E2E tests, all in CI. Predict the wall-clock minutes." Wrong-by-default; the simulator then validates the answer and exposes the shape.

**Components.**
- New component **`TestSuiteCostSimulator`** — three count sliders, a retries toggle, outputs stacked-bar CI minutes and a flake-probability badge. Recurs in 19.1 and 19.4 conceptually but a single concrete widget here.
- `PredictOutput` for the pre-simulator numeric guess.

**Project link.** The simulator's per-layer cost numbers are the same budget arithmetic 19.6 uses when justifying three integration tests plus one Playwright test for the same Stripe flow.

---

## Concept 3 — Production build versus dev mode (environment fidelity)

**Why it's hard.** The seam between `next dev` and `next start` is invisible until a bug ships. Students will reach for the faster server in the name of iteration speed and not realize they have just tested a different application than the one users get. The hydration path, error overlay, middleware, and static optimization all diverge.

**Ideal teaching artifact.** A **side-by-side dev-vs-prod toggle**. One panel shows the same page served from `next dev`, the other from `next start`, with the divergences pre-labeled as overlays — "this error overlay is dev-only, your test that asserts on it will pass locally and fail in CI"; "this hydration path is dev-only, the timing your locator depends on shifts." The student toggles four illustrative scenarios (error-state assertion, middleware redirect, static-page hydration, image optimization) and watches what the user actually sees differ. The form is a **fidelity-comparison panel** — two panes, one rule, four scenarios.

**Engagement.** `TrueFalse` round of five statements ("an E2E test that passes against `next dev` is sufficient evidence the path works in production"; "the dev-mode error overlay can be asserted on in Playwright"; ...) immediately after.

**Components.**
- `TabbedContent` with two tabs (Dev / Prod) and four scenarios stacked inside each tab, screenshots or hand-SVG mocks showing the divergence. Single-use here — `TabbedContent` is the right existing fit.
- `TrueFalse` for the recall round.

---

## Concept 4 — `storageState` instead of UI login

**Why it's hard.** The student's first instinct on writing an authenticated test is `await page.goto('/sign-in'); fill; click; assert`. That instinct is correct for the *one* test that exercises sign-in. For the other twenty, it multiplies runtime by 5–10× and re-tests the same flow on every run. The architectural move is to separate "prove sign-in works" from "use a signed-in browser" and to cache the latter as JSON on disk.

**Ideal teaching artifact.** An **animated stepper diagram** of the auth setup flow: `auth.setup.ts` runs once in the `setup` project, drives the UI sign-in, calls `storageState({ path })`, the JSON file lands on disk; then four test files in the `chromium` project each inherit `storageState` from config and start mid-session. The student scrubs through the sequence — setup-runs, file-written, test-1-inherits, test-2-inherits — and a runtime counter beside the diagram tallies seconds saved as more tests are added. The form is a **scrubbable architecture diagram** with a live runtime side-bar, doubling as the cost argument.

**Engagement.** `Dropdowns` over a code block showing `playwright.config.ts` with three blanks (the `setup` project's `testMatch`, the `chromium` project's `dependencies`, and the `use.storageState` path) — the student wires the inheritance chain themselves.

**Components.**
- `DiagramSequence` wrapping a hand-SVG scene of the setup → write → inherit flow, with the runtime tally as part of the slot content (recomputed per step).
- `Dropdowns` for the config-completion drill.

**Project link.** 19.6.2 hands the student exactly this `auth.setup.ts` + `storageState` wiring as a pre-built harness; the architecture being clear here is what makes the harness read as familiar there.

---

## Concept 5 — Auto-waiting locators replace sleeps

**Why it's hard.** Every flaky-Playwright war story the student will hear in the wild involves `waitForTimeout` or a `waitForSelector` racing the app. The locator API is auto-waiting *by default* — the discipline isn't "wait better," it's "stop waiting manually and use matchers that poll." The shift is from a procedural mindset (sleep, then assert) to a declarative one (assert what should eventually be true, the framework polls).

**Ideal teaching artifact.** A **wrong-by-default sandbox**. The student is handed a failing test against a small in-browser app: `await page.waitForTimeout(500); expect(await button.textContent()).toBe('Paid')`. The button flips text on a randomized delay between 200–1500 ms, so the test fails roughly half the time. A flake-counter widget runs the test in a loop and shows the failure rate. The student rewrites the assertion to `await expect(button).toHaveText('Paid')`, runs the loop again, and the flake counter drops to zero. The locator priority ladder (role → label → text → testid) is then introduced as a static reference *after* the student has felt the polling behavior. The form is a **flake-counter sandbox** — the artifact carries the assessment by virtue of the failure rate dropping when the fix lands.

**Engagement.** Because the sandbox itself is assessment, follow with one tight `Buckets` sort to confirm recall of the locator ladder — eight selector strings (`page.locator('.btn-primary')`, `page.getByRole('button', { name: /pay/i })`, ...) into *Prefer*, *Acceptable fallback*, *Refactor away*.

**Components.**
- New component **`PlaywrightFlakeLoop`** — a simulated `it`-runner that re-executes a student-edited assertion against a stubbed page model 50 times and surfaces the flake rate. Single-use in the chapter; the flake-rate visualization compounds forward into 19.5.3 (timing assertions on Stripe round-trip) and 19.6.5 (the checkout poller).
- `Buckets` for the locator ladder sort.

**Project link.** The locator discipline tested here is exactly what 19.6.5 enforces against the Stripe iframe — role-and-name selectors inside `frameLocator`, no CSS, no sleeps.

---

## Concept 6 — The trace viewer is the debugger

**Why it's hard.** Students default to `console.log` debugging because that's how they debug everything else. A failed Playwright run in CI without trace inspection is opaque — they cannot reproduce, cannot see the DOM at the moment of failure, cannot tell whether the locator missed or the app misbehaved. The shift is to treat the `trace.zip` as the primary debug artifact and the trace viewer UI as the debugger.

**Ideal teaching artifact.** A **guided trace-viewer puzzle**. The student is given a recorded, replayable trace from a failed test ("the test asserted the dashboard heading was visible after sign-in; it failed"). The artifact replicates the trace viewer's three panes — action list on the left, DOM snapshot in the center, network log on the right — and asks the student to click the action where the test actually broke. Hints surface in order: the action list (notice the `goto /sign-in` followed by an unexpected `goto /sign-in`); the DOM snapshot (notice the error alert in the snapshot); the network log (notice the 401 on the POST). The student diagnoses *redirect-loop-after-expired-seed*, not "test flaky." The form is a **diagnose-from-trace puzzle**.

**Engagement.** The puzzle is itself the assessment — wrong clicks reveal targeted hints, the correct click reveals the diagnosis. Follow with one `MultipleChoice` on what to change (the seed script, the locator, the retries config, the test) to make recall stick.

**Components.**
- New component **`TraceViewerPuzzle`** — three-pane replica (action list, DOM snapshot iframe, network log), accepts a JSON trace fixture, scores the student's click against a labeled "failure action." Recurs implicitly in 19.6.6 (mutation drills produce traces the student inspects) — credible forward-link.
- `MultipleChoice` for the follow-up diagnosis-action question.

**Project link.** 19.6.6's mutation drills produce real traces; the discipline of reading them as the primary debug surface is installed here.

---

## Concept 7 — The four-path catalog and coverage allocation

**Why it's hard.** Even after the trigger is internalized (Concept 1), the student facing their own codebase has to *find* the money paths and decide what at each path is covered by E2E versus by the seam test versus by the component test. The composition argument — "only the browser-driven test sees the redirect-loop after Stripe round-trip" — has to land alongside the negative argument: "the webhook signature verification is *not* an E2E concern, it's the seam test from 19.3.6."

**Ideal teaching artifact.** A **layered coverage map** of each of the four canonical paths. For sign-in, Stripe Checkout, invitation acceptance, and the primary value loop, a single grid shows three columns — *Component-level (19.4) catches*, *Integration seam (19.3) catches*, *E2E (this chapter) catches* — with concrete bug examples populating each cell. The student sees that the webhook signature bug lives in the integration column, the form validation lives in the component column, and the *composition* (redirect, session survival across the Stripe round-trip, webhook-arriving-before-UI-refetch) lives in the E2E column. The artifact is a **coverage allocation grid** repeated for each of the four paths — the redundancy is the point, because the pattern is what generalizes.

**Engagement.** A `Matching` drill: ten concrete bug descriptions on the left ("checkout button accessible name is wrong"; "webhook arrives, plan flips in DB, UI still shows Free"; "rate limiter blocks sixth login attempt with right copy"; ...) and three test-layer targets on the right (Component / Integration / E2E). Forces the student to apply the allocation rule path-by-path.

**Components.**
- `Figure` containing a hand-authored four-row grid (one row per money path, three columns per layer) with hand-SVG path icons on the left. Static, single-use, no forward-link — `Figure` is the right call.
- `TabbedContent` could alternatively partition the four paths into tabs if the single-grid presentation gets dense.
- `Matching` for the bug-to-layer allocation drill.

**Project link.** 19.6 builds exactly this grid for the Stripe Checkout money path in concrete code — three integration tests in the *Integration* column, one Playwright test in the *E2E* column, no component test needed for the flow itself. The grid taught here is the planning artifact 19.6.1 hands to the student as a Done-when checklist.

---

## Component proposals

- **`TestSuiteCostSimulator`** — three sliders (unit, integration, E2E test counts) plus a `retries` toggle; outputs stacked-bar CI minutes and a flake-probability badge.
  - Uses in this chapter: Concept 2.
  - Forward-links: 19.1.2 (honeycomb shape — same cost math), 19.4.1 (component-test cost argument). Compounds.
  - Leanest v1: drop the `retries` toggle and the flake-probability badge; ship just the three sliders and the stacked-bar minutes output. The cost asymmetry is the lesson; the flake annotation is the polish.

- **`PlaywrightFlakeLoop`** — student-editable assertion runs 50× against a stubbed page model with randomized delays; reports failure rate.
  - Uses in this chapter: Concept 5.
  - Forward-links: 19.5.3 timing concerns around the Stripe round-trip and 19.6.5's checkout poller — same flake-rate visualization is the natural feedback there.
  - Leanest v1: a binary outcome (`passes 50/50` vs `fails sometimes`) instead of a numeric flake rate; the dramatic flip from "fails sometimes" to "passes 50/50" when the student replaces `waitForTimeout` is enough to teach the concept.

- **`TraceViewerPuzzle`** — three-pane trace-viewer replica accepting a JSON trace fixture; scores click against labeled failure action; reveals tiered hints.
  - Uses in this chapter: Concept 6.
  - Forward-links: 19.6.6 mutation-drill traces. Compounds within the testing unit specifically.
  - Leanest v1: ship only the action-list pane plus a single static DOM snapshot at the failing action; drop the network pane and the snapshot scrubber. The action-list misclick is the load-bearing teaching moment.

## Build priority

`TestSuiteCostSimulator` is the highest-leverage build — it teaches Concept 2 here, reframes 19.1.2's honeycomb in concrete numbers, and underwrites 19.4.1's component-test economics. Build first.

`TraceViewerPuzzle` is second — it has a clear forward-link to 19.6.6, where the student will read traces they themselves produced, and the puzzle form is the only one that locks the diagnosis discipline.

`PlaywrightFlakeLoop` is third — the wrong-by-default sandbox is the right form for the concept, but a static `CodeVariants` showing the broken-then-fixed assertion plus a prose claim about flake rate would teach 70% of the concept at 10% of the build cost. Build only if the prior two are in.

## Open pedagogical questions

- The trace-viewer puzzle (Concept 6) relies on a realistic JSON trace fixture. Authoring even one trace that reads as authentic (action list, DOM snapshot, network log) is non-trivial — is the right v1 a hand-authored fake or a captured-and-trimmed real trace from the course's app?
- Concept 7's coverage allocation grid risks redundancy with 19.4.4's component catalog and 19.3's seam catalog. Should the grid here be a *back-reference* (linking out to the same bug already discussed at the lower layer) rather than re-listing the same bugs, to avoid teaching the same case three times?
