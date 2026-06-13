# When RTL earns its weight

- **Title (h1):** When component tests earn their weight
- **Sidebar label:** When RTL earns its weight

---

## Lesson framing

This is a **decision lesson**, not a how-to. The student writes zero RTL code here; lessons 2-4 of this chapter do the wiring, the query ladder, and the catalog. This lesson installs one durable reflex: **component tests are off by default for a 2026 Next.js SaaS, and earn their weight only against named triggers.** Everything downstream of this chapter sits under the trigger this lesson installs, so the mental model has to land cleanly.

Pedagogical conclusions for the lesson as a whole:

- **Lead with the failure mode, not the rule.** The senior question (the 200-test suite that catches no bugs and trains the team to skip review) is the motivating problem. The student has likely *seen* coverage-theatre suites or absorbed the test-pyramid reflex ("new component → write a test"). The pain this relieves is concrete: slow CI, dead signal, review fatigue. Open there.
- **This is a "trigger before tool" lesson** — the course's canonical pattern (per pedagogical guidelines: "Defaults before conditionals; trigger before tool"). The default is *no component test*; the conditional reach is RTL, gated on a named threshold. Frame it explicitly as the same shape the student met with TanStack Query / Zustand (Unit on client state) and will meet again with Playwright (chapter 090). This is not a new idea — it's a familiar pattern applied to the test suite.
- **Anchor on the honeycomb from chapter 086.** The student already learned the honeycomb suite-shape: wide unit base over `/lib`, integration at the seams as the center of gravity, thin component + E2E bands gated by trigger. This lesson zooms into the thin component band. Reference the honeycomb by name; do not re-teach it. The "bug density at the boundary" argument is the through-line: a Next.js SaaS renders most of its tree on the server, so most bugs are at the seam (chapter 088 territory), not in the rendered DOM.
- **The three triggers + one implicit are the core deliverable.** Shared component library, complex stateful interactive component, critical UX path; plus the implicit fourth (accessibility regression on a high-traffic surface). Each must come with a *concrete codebase referent* (a component the student has built or seen named) so the trigger is grounded, not abstract. The anti-triggers (delete the test, don't write it) are equally important — a senior deletes more tests than they write here.
- **The cost shape is the quantitative backbone.** Unit ~5ms, integration 20-80ms, component (jsdom) 100-300ms, E2E seconds. Component tests sit in the awkward middle: 20 well-chosen ones cost nothing, 200 double the watch loop. The discipline is in the *count*, and the count is governed by the trigger. Visualize this.
- **The mental model the student should end with:** a five-second mental gate they run *before* writing any component test — "is this a Server Component? covered at the seam? a one-off presentational primitive? on the E2E money path? → stop. Is it a shared library / complex state machine / critical UX / a11y-sensitive primitive? → reach." Materialize this gate as an interactive decision walk so the student *runs* it rather than reads it.
- **Real production stakes throughout.** The cookie consent gate (a one-line bug ships GDPR exposure) and the checkout summary line (the user reads the total before committing money) are the highest-stakes referents. Use them. "Year-one SaaS may ship zero component tests" is the honest senior stance and must be stated plainly — it gives a small team permission to *not* write these, which is the point of a trigger.
- **What NOT to belabor:** no RTL API surface, no queries, no `render` helper, no jsdom config. The moment the lesson reaches for a `getByRole` example it has drifted into lesson 3. Code samples here are minimal and illustrative of *the decision* (e.g. a tiny counter-example of a worthless test), never of RTL technique.

Target student: junior dev, some web exposure, building production SaaS with AI agents. They can read TSX. They have seen tests. They have *not* internalized when a test is worth its maintenance cost — that judgment is the senior skill this lesson teaches.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open with the senior question as a concrete scene: a feature lands with three new components, the team's reflex fires ("write tests for the components"), two months later the suite has 200 component tests, ~80% re-test presentational primitives (`<Card>` renders children, `<Button>` forwards `onClick`), CI is slow, the suite has caught zero production bugs, and the team has quietly learned to rubber-stamp the component-test review. Name the inversion: the senior reach is the opposite rule — **component tests are off by default; they earn weight against a small set of named triggers.** State the lesson goal: by the end the student runs a five-second gate before writing any component test and can name when RTL is worth its cost and when the senior move is to delete the test. Connect back to the honeycomb (chapter 086) — this is the thin component band, zoomed in — and to the "trigger before tool" pattern the student already knows. Keep it warm, terse, adult. No celebratory tone.

Tooltip (`Term`) candidates in this section: **RTL** (React Testing Library — the library; named in the title, define on first prose use), **jsdom** (in-memory DOM implementation tests render into, no real browser).

### Why component tests are off by default

The core argument. A Next.js 16 SaaS renders most of its tree on the **server**. Walk the reasoning step by step (minimize cognitive load — build the picture incrementally):

1. A Server Component that fetches invoices and renders a list has its bugs *inside the data layer* — the query, the auth check, the formatter. Those are caught at the seam (chapter 088). The rendered output is framework-orchestrated; asserting on it with RTL re-tests Next.js, not your code.
2. The Client Components that remain are mostly *thin*: forms wired to Server Actions (the action's integration test already covers the behavior), modals, tooltips, navigation. Their behavior is either trivial or visible on the first manual interaction.
3. Therefore the *default* is correct: write no component test. The rendered surface is mostly not yours to test, and the interactive surface is mostly thin.

Reinforce the "bug density follows the architecture" rule from chapter 086: write the test where the bugs land. For UI on this stack, that's rarely the DOM.

Also state plainly here (it belongs with the default): **the unit under test is always a Client Component or a pure presentational component, never a Server Component.** Async Server Components are not a 2026 RTL surface — the framework's support is fragile and testing them with RTL is fighting the tool. They get covered at the seam (chapter 088) and at the money-path boundary in E2E (chapter 090). This is a thread through the whole chapter; plant it here.

**Diagram — "where the bugs live" (HTML + CSS, in a `<Figure>`).** A horizontal three-band strip of a typical SaaS page render: left band = Server Components (fetch + render, framework-orchestrated) labeled "bugs → seam (ch. 088)"; middle = thin Client Components (forms, modals) labeled "mostly trivial / covered by the action test"; a small highlighted slice = the few interactive Client Components where state *is* the behavior, labeled "RTL earns its weight here." Pedagogical goal: make visceral that the RTL-worthy surface is a *thin slice* of the rendered tree, not the whole page. Horizontal, capped height. This is a simple visual aid, not a system graph — exactly the kind the diagrams index encourages.

### The three triggers that earn the test

The heart of the lesson. Present the three triggers, each as its own short subsection (h3), each with a concrete codebase referent and the cost-math intuition. Keep the structure parallel so the student can pattern-match.

Frame before the subsections: a component earns a test when its **bug density justifies the maintenance cost.** The three triggers are the three places bug density spikes.

#### Trigger 1 — a shared component library

A `<DataTable>`, `<Combobox>`, `<DatePicker>` consumed in 30+ places. One bug ships 30 regressions. The cost-per-test math *flips*: a test that prevents one regression in a shared primitive pays for itself many times over. Concrete course referents: the form field set (Unit 6), the toast surface (Unit 13), the date-range picker (Unit 17). Reach here.

#### Trigger 2 — a complex stateful interactive component

State transitions *are* the lesson. A multi-step form with conditional branches (e.g. `<SubscribeForm>`, Unit 6), a virtualized list with multi-select and keyboard navigation, a command palette with async search. Manual walk-through is unreliable; the action's integration test at the seam doesn't see the form's *branch logic*. Give the student a crisp threshold: reach when the state graph has **more than three nodes** or interactions span **more than two events**. A concrete rule of thumb beats "complex."

#### Trigger 3 — a critical UX path

Behaviors too granular for E2E but too consequential for manual QA. The course's two canonical referents, with their stakes named:
- **Cookie consent gate** (Unit 16) — gating analytics on consent must work; a one-line bug ships GDPR exposure.
- **Checkout summary line** (Unit 11) — the user reads the total, tax, and trial-end date *before committing money*. E2E covers the happy path; it does not cover the seven content variants (coupon applied, trial vs. no-trial, multi-seat, tax-exclusive locale, etc.). Those variants are exactly an RTL surface.

Use real production stakes here — this is where the lesson's "why it matters" peaks.

#### The implicit fourth — accessibility regressions on high-traffic surfaces

A login form, a primary CTA, a navigation header. A test written to find the submit button *by role and accessible name* fails the instant that name disappears — and a missing accessible name on a primary control is a real bug. The accessibility regression and the test failure are the *same event*. This is why the query ladder (lesson 3) doubles as an accessibility audit. Plant the connection; don't teach the ladder yet. Keep this short — it's a fourth trigger, lighter than the three.

**Exercise — `Buckets` (classification drill).** After the four triggers, a Buckets exercise: two buckets, "Reach for RTL" and "Don't write the test." Items are short component descriptions drawn from the course's world — e.g. *"A `<Card>` that renders its children with no state"* (don't), *"The cookie consent banner that gates PostHog"* (reach), *"A Server Component that lists invoices"* (don't), *"The shared `<DateRangePicker>` used in Reports, Invoices, and Filters"* (reach), *"A multi-step subscribe form with conditional seat-count field"* (reach), *"A `<Section>` wrapper for spacing"* (don't), *"A button whose only job is to call a Server Action that has its own seam test"* (don't). Goal: the student practices applying the triggers to concrete cases. Grading is built into Buckets (green/red on Check). This is a low-cost, high-signal check right after the concept.

### When the senior move is to delete the test

The anti-triggers, given equal weight to the triggers — a senior deletes more component tests than they write. List each with its one-line reason (these are *content*, the lesson's other half, not a tips dump):

- A **purely presentational component** (`<Card>`, `<Section>`, `<PageHeader>`) with no state and no branching content — the bug density doesn't justify the cost.
- A **Server Component** (async or otherwise) — wrong surface; the framework owns it and RTL's async-component support is fragile in 2026.
- **Anything covered end-to-end by the Server Action integration test** (lesson 7 of chapter 088) — mocking the action and asserting its effect re-tests the seam test at higher cost.
- **Anything on the E2E money path** (chapter 090) — duplicate coverage at higher cost.
- The **framework-owned surface** — `<Link>`, `<Image>`, route-segment behavior. You don't test Next.js.
- **Plugin/library internals** — TipTap commands, a virtualization library's windowing. The library owns those.

This pairs naturally with the next section's two-way contrast (what each layer catches). Keep the list tight; each line is a deletion the student should feel comfortable making.

### What lives in the component vs. what lives at the seam

The two-column mental model that makes the boundary precise — *this* is what stops the most common beginner mistake (mocking a Server Action and asserting it wrote a row). Present as two short lists, ideally side by side.

**What component tests catch that integration tests don't** (all live in the component, not the seam):
- conditional render branches driven by client state
- keyboard navigation order
- focus management after a modal closes
- an error message rendered from a `useActionState` reducer
- an optimistic-update reconciliation
- the accessible name on a dynamic button (`"Delete invoice INV-001"`, computed from props)

**What integration tests catch that component tests don't** (all live at the seam, not the component):
- whether the Server Action wrote the row
- whether the cross-tenant filter held
- whether the audit log fired
- whether the rate limiter allowed the request

Land the rule: **a component test asserting on a Server Action's database effect is mocking too deep** — it has reached past its layer into the seam test's job. The two tests *compose*: the component test trusts the action's contract; the action test trusts no client.

**Component note for the contrast:** use `TabbedContent` with two panels ("In the component" / "At the seam"), each holding the bullet list, captioned. Or a two-column HTML table inside a `<Figure>` if a static side-by-side reads cleaner. Prefer `TabbedContent` so the two halves get equal visual weight. No code blocks here — these are conceptual lists; a code example would pull focus toward technique (lesson 3/4 territory).

Note for downstream agent: use `useActionState` (React 19) in the prose, not the older `useFormState` name — the chapter outline says `useFormState` but that hook was renamed in React 19, the chapter's pinned version. This is a deliberate correction; flag it as code-convention alignment.

### The five-second gate before you write the test

The synthesizing section — turns the triggers + anti-triggers into a runnable procedure. Present the senior's "before you write this test" checklist as an *ordered* gate (order matters — cheapest disqualifiers first):

1. Is this a Server Component? → stop, wrong surface.
2. Is this covered by the Server Action integration test? → stop, duplicate.
3. Is this a one-off, non-shared presentational component? → stop, not earning weight.
4. Is this on the money path Playwright covers? → stop, duplicate at higher cost.
5. Is this a shared library, a complex state machine, a critical UX path, or an accessibility-sensitive primitive? → **reach.**

**Interactive — `StateMachineWalker` (`kind="decision"`).** This is the lesson's centerpiece interaction: materialize the gate as a click-through decision walk so the student *runs* the questions in order rather than reading them. Each `<Question>` is one gate step; "yes" on a disqualifier branches to a `<Leaf>` verdict ("Stop — wrong surface", "Stop — the seam test owns this", etc.); "no" advances to the next question; the terminal question's "yes" lands on a `<Leaf verdict="Reach for RTL">` that names *which* trigger was met. Pedagogical goal: the walker forces the *order* a senior asks the questions in — cheap disqualifiers before the expensive "is it worth it" judgment — which is exactly the StateMachineWalker's stated strength ("the lesson lives in the order"). `kind="decision"`, no diagram slot needed (this is a funnel, not a cyclic machine). Do **not** wrap in `<Figure>` (the walker provides its own card). Keep each Question prompt to one line and each Leaf reason to one or two sentences.

Reinforce after the walker: this is a *five-second mental gate*, not a process document. It runs in the time it takes to start typing a test file.

### Year one may ship zero component tests

Short, honest closer that gives permission. Same shape as the E2E year-one-zero stance (chapter 090). A small team shipping fast on a stack where most of the UI is server-rendered and most behavior is at the seam is *correct* to write zero RTL tests in year one. The integration suite (chapter 088) catches the seam bugs; manual interaction catches the obvious ones; the trigger language is what tells the team *when to start* — not a standing obligation to "have component tests." State that the rest of this chapter (setup, query ladder, catalog) is what they reach for *when a trigger fires*, not a backlog to burn down. Better five well-chosen tests than fifty box-ticking ones.

Optionally close with a tiny illustrative counter-example (a single `Code` block, ~4 lines) of the worthless test the gate prevents — `it('renders', () => { render(<Card />); })` asserting only that it didn't throw — labeled "coverage theatre." This is the *one* place a code snippet earns its place, because the shape of the worthless test is itself the teaching point. Keep it to one block; do not explain RTL API around it.

**Exercise — `TrueFalse` round (4-5 statements).** End-of-lesson recall check on the decisions. Candidate statements (each with a `<TfWhy>`):
- "For a 2026 Next.js SaaS, component tests are on by default and you delete the ones that don't earn weight." → **false** (off by default; you *add* against a trigger).
- "An async Server Component that lists invoices is a good RTL target." → **false** (wrong surface; seam + E2E).
- "A `<DateRangePicker>` shared across Reports, Invoices, and Filters earns a component test." → **true** (shared library trigger).
- "A component test that asserts the Server Action wrote a row to the database is correctly scoped." → **false** (mocking too deep; that's the seam test's job).
- "A small SaaS shipping zero component tests in year one is making a defensible call." → **true** (year-one zero is the honest default).

This consolidates the lesson's judgments and surfaces the two highest-frequency beginner errors (default-on thinking; cross-layer mocking).

---

## Scope

**This lesson covers:** the decision of *whether* to write a component test — the three triggers (shared library, complex state, critical UX), the implicit fourth (accessibility regression on high-traffic surfaces), the anti-triggers, the cost shape, the component-vs-seam boundary, the five-second gate, and the year-one-zero stance.

**This lesson does NOT cover (reserve for the named lesson):**

- **jsdom + RTL setup, the third Vitest `component` project, the `render` helper, `userEvent.setup()` configuration, the `@testing-library/*` pin set** → lesson 2 of chapter 089. Do not show install commands or config here.
- **The query priority ladder (`getByRole`/`getByLabelText`/…/`getByTestId`), `getBy`/`queryBy`/`findBy`, jest-dom matchers, what "behavior" means concretely at the DOM layer** → lesson 3 of chapter 089. This lesson may *reference* "queries written to the accessibility tree double as a11y audits" (the implicit fourth trigger), but must not teach the ladder.
- **The concrete component catalog** (cookie consent, subscribe form, date-range picker, data table, checkout summary) walked test-by-test with assertions and the Server-Action mock-import pattern → lesson 4 of chapter 089. This lesson *names* these components as trigger referents only — no assertions, no mocking code.
- **The end-of-chapter quiz** → lesson 5 of chapter 089.
- **E2E money-path trigger, Playwright** → chapter 090 (reference as the parallel "off by default" band; do not teach).
- **Server Action integration testing at the seam** → lesson 7 of chapter 088 (reference as where action behavior is covered; do not teach).
- **Visual-regression tooling** (Chromatic, Percy) — out of scope entirely; name once at most if contrasting "RTL is not the tool for visual/spacing/color bugs."
- **Storybook play functions** as a parallel interactive-test surface — out of scope; name once at most, do not pin.

**Prerequisites to redefine concisely (assume taught, one line each):** the honeycomb suite-shape and "bug density follows architecture" (chapter 086); the "trigger before tool / default before conditional" pattern (Unit on client state, TanStack Query/Zustand); the seam (`authedAction`, integration tests) as where Server Action behavior is covered (chapter 088); Server vs. Client Components (Unit on the App Router). Redefine in a clause, not a paragraph.

---

## Code conventions alignment

- `documentation/code standards/Code conventions.md` Testing section line 486 states the exact rule this lesson installs verbatim: "Component tests only when (a) shared library, (b) complex state, or (c) critical UX. Otherwise let the seam test cover it." The lesson must teach precisely this triple plus the implicit accessibility fourth. Do not invent a fifth trigger.
- Line 487: E2E reserved for money paths, "Zero or four E2Es by year one; nothing in between" — mirror this framing when stating the component-tests year-one-zero stance, for consistency across the testing unit.
- Line 477: three Vitest projects (`unit`/`integration`/`component`) — reference the `component` project by name as "the slice lesson 2 wires," do not configure it here.
- **Deliberate divergence from the chapter outline:** the chapter outline writes `useFormState`; React 19 (the pinned version) renamed this hook to `useActionState`. Use `useActionState` in any prose mention. Flag noted so downstream agents know this is intentional, not a typo to "fix" back.
- Any minimal code shown (the single "coverage theatre" counter-example) should be plain TSX consistent with the course's React 19 + Vitest conventions; no `globals: true` reliance (the project uses `globals: false`, so an `it`/`render` snippet is illustrative pseudo-context, not a runnable file — keep it tiny enough that imports aren't the point).

---

## Notes for downstream agents

- This is a 30-40 minute decision lesson. Keep prose dense and judgment-forward; resist drifting into RTL technique. If a section starts explaining *how* to query or render, it has crossed into lesson 2/3 — cut it.
- Two interactive widgets carry the lesson: the `Buckets` trigger drill (after the triggers section) and the `StateMachineWalker` gate (the synthesizing centerpiece). The `TrueFalse` round closes. Do not over-add exercises; these three are calibrated to the lesson's length.
- One diagram (the "where the bugs live" three-band strip) and at most one `TabbedContent` contrast. No DiagramSequence, no heavy figures — this is a mindset lesson, not a mechanics lesson.
- Real production stakes (GDPR exposure on consent, money on checkout) are the emotional anchors — use them where the triggers and the "why it matters" need weight.
- Optional `ExternalResource` card: the Testing Library guiding principles page ("The more your tests resemble the way your software is used…") fits the lesson's thesis and previews lesson 3's ladder. One card at most, in an External resources tail if used.
