# The catalog: five components that earn the test

- Title (h1): The catalog: five components that earn the test
- Sidebar label: The component catalog

## Lesson framing

This is the **pattern/application** lesson of chapter 089 and the chapter's payoff. Lessons 1–3 installed the abstractions: L1 the trigger ("off by default"; reach only for shared library, complex state, critical UX, plus the implicit accessibility trigger), L2 the rig (`render` helper returning `{ ...rtl, user }`, the jsdom lane, MSW + `next/navigation` reuse), L3 the durable reach (the query ladder, `getBy`/`queryBy`/`findBy`, "behavior is what the user observes", "the failing query is a bug report on your component"). This lesson does the one thing none of those did: **apply all three to the codebase the student has been building since Unit 3.** It is the canon the team extends without re-litigating the trigger every time a component lands.

The senior question that opens it: *the trigger names the surfaces, the ladder names the queries — what does that actually look like in our app?* The answer is a short, named catalog of **five** components (the title's promise), each presented identically: name the trigger met, name the behaviors to assert, name what is deliberately left to the seam (ch088) or to E2E (ch090). The repeated structure is itself the teaching — by component three the student is predicting the shape, and that predictive habit is the transferable skill. The catalog is short *on purpose*; the "year-one zero" stance from L1 means a real app might have one or two of these, not five.

Two cross-cutting techniques get taught here because the catalog is the first place they're needed concretely (L1–L3 named the boundary but never showed the mock): (1) **the Server Action mock-import pattern** — `vi.mock('@/server/actions/...', () => ({ name: vi.fn() }))` at the file top, `vi.mocked(...).mockResolvedValue(Result.ok/err)` per test — and (2) **the compose-not-overlap discipline** it enforces: the form test owns the form's *reaction* to the action's contract; the action's *body* (DB write, audit, Stripe) is the seam test's job from ch088 L7. This is the single most important idea to land, because it's where juniors over-reach ("mocking too deep" from L1). L3 left an explicit debt: it named `expect(mockOnSubmit).toHaveBeenCalledWith(...)` a smell and tasked L4 with showing the correct alternative — assert on what the UI renders *after* the action resolves, not on mock call args. Pay that debt visibly in catalog component 2.

Pedagogical stance, optimized for low cognitive load: this lesson is **not** a tutorial that builds five components from scratch — that would bury the lesson (system-design-over-syntax) under boilerplate. Instead, each component is presented as a *small artifact already built earlier in the course*, and the lesson focuses on the **test decisions**: which trigger, which behaviors, which boundary. Code samples are tight (one realistic test per component, 12–18 lines, never the full component source). The student already knows how to write the queries (L3) and drive the user (L2); the new skill is *deciding what to assert and what to leave alone* on real surfaces. Keep every component's prose to the same three-beat rhythm so the page reads as a reference card, not five mini-lessons.

Do not re-teach: the query ladder, the `getBy/queryBy/findBy` split, the render helper, `userEvent` mechanics, the three triggers themselves, or what a Server Action wrapper does. All are prerequisites; redefine in one clause and move on. Reinforce, don't re-derive, L3's "the failing query is a bug report" and "user sees" reflexes — use them, name them once, keep moving.

React 19 note carried from continuity: forms use **`useActionState`** (not `useFormState`) and `useFormStatus` for pending — this is the established correction across the chapter. Any form test that touches pending/error state must reflect that surface.

Mental model the student should leave with: *a component test is a decision before it is code — name the trigger, write the behaviors as sentences about the user, mock the action at the import and let the seam own its body. The catalog is five worked instances of that decision, and the discipline is the count, not the coverage.*

## Lesson sections

### Introduction (no header)

Open with the senior question, warm and brief (per pedagogical guidelines, the intro states the goal and motivates with a concrete problem). Frame: you have the trigger (L1), the rig (L2), the ladder (L3) — three abstractions with no application yet. A teammate opens a PR adding a component test; how do you know it earns its weight, what should it assert, and where does it stop? This lesson answers that by walking the real app's catalog. State the through-line explicitly: **every entry names the trigger met, the behaviors to assert, and what to leave to the seam or E2E** — that triad is the reusable reasoning, the five components are just its worked instances. Preview the two new techniques (the action mock-import pattern, the compose boundary) as the only genuinely new code in the lesson. Set the honest expectation from L1's "year-one zero": the catalog is the *shape*, not a quota — a real codebase has whatever earns weight.

End the intro with a small orientation visual (see diagram below) so the student has a map of the five before diving in.

**Diagram — the catalog map (HTML+CSS table/grid, in `<Figure>`).** Pedagogical goal: a single glanceable index of the five components keyed to their trigger and their boundary, so the repeated three-beat structure is primed before the student meets it. Shape: a compact 5-row grid (cap height well under 800px, horizontal-friendly), one row per component. Columns: **Component** (cookie consent gate / subscribe form / date-range picker / data table / checkout summary), **Trigger met** (critical UX · complex state · shared library · shared library · critical UX) — tint the trigger pill to match L1's trigger language, **Left to the seam/E2E** (one short phrase each: "PostHog gate fires → E2E" / "DB write + Stripe → seam" / "library internals" / "pagination → seam" / "Stripe redirect → E2E"). This makes the boundary discipline visible *as a column* from the start. Caption: "Five components that earn a test — and for each, exactly one trigger and a clear line on what someone else covers."

### Reach for the import mock, not the database

Teach the two cross-cutting techniques *before* the catalog so each entry can lean on them without re-explaining. This is the conceptual spine; put it first because every form-touching catalog entry depends on it.

Content:
- **The problem.** A client component imports a Server Action and calls it (via `useActionState` or directly). The component test is not end-to-end — so what stands in for the action? Naive reach: let the real action run and assert on the database. That's "mocking too deep" from L1 — the component test re-tests the seam at higher cost and couples two layers.
- **The pattern.** `vi.mock('@/server/actions/createSubscription', () => ({ createSubscription: vi.fn() }))` at the top of the test file (hoisted). Per-test, set the return: `vi.mocked(createSubscription).mockResolvedValue(Result.ok({...}))` for the happy branch, `Result.err({ code: 'CARD_DECLINED' })` for the failure branch. The component test asserts the component's *reaction* — what renders, what's announced — never the action's effect.
- **The compose boundary (the load-bearing idea).** State it as a clean division of ownership: *the form test owns the form's contract with the action; the action's body owns its own behavior at the seam (ch088 L7).* The two tests **compose, they don't overlap** — the form test trusts the action's `Result` contract; the action test trusts no client. Name the reflex: "test each thing once, at the layer that owns it." Reinforce the ch088 L7 boundary by name ("the action's body is the seam test's job") without re-teaching it.
- **Pay L3's debt here.** Show, in a CodeVariants before/after, the smell L3 flagged and its fix. Brittle tab: `expect(createSubscription).toHaveBeenCalledWith(...)` — asserts the *mock got called*, which is internal wiring and breaks on a rename, and worse, says nothing about what the user saw. Durable tab: `await screen.findByRole('alert', { name: /card was declined/i })` — asserts the *user-observable consequence* of the action resolving. One sentence naming why: a mocked action's job in this test is to *drive a branch*, not to be the thing under test; assert the branch's visible result.

Components:
- **CodeVariants** for the brittle/durable mock-assertion pair. Two tabs, line-light. Brittle pane `data-mark-color="red"`, durable pane `data-mark-color="green"`. Brittle: assert on `toHaveBeenCalledWith`. Durable: assert on the rendered `alert`. One paragraph of prose per tab (component cap is one paragraph / 6 lines).
- **Code** (single fenced `ts`, `frame="code"`) for the canonical mock-import setup: the `vi.mock(...)` at top plus a two-line per-test `mockResolvedValue` showing both `Result.ok` and `Result.err` (as a comment-separated pair, not two blocks). Highlight the module path and the `vi.mocked(...).mockResolvedValue` token (blue). This is the reusable snippet every catalog form entry refers back to.

Tooltip terms in this section: `Result` (re-define in one clause — "the project's typed success-or-error return from ch088; `ok(data)` / `err({ code })`", since it's load-bearing for the mock returns); "mocking too deep" (re-name from L1 via `<Term>`, one clause).

### Catalog component 1 — the cookie consent gate

Trigger: **critical UX path with legal weight** (the consent gate from the security baseline, ch081 L5 — `useConsent()` is the single source; gating non-essential analytics on consent is a real GDPR surface; a one-line bug ships exposure). Establish the three-beat rhythm cleanly here since it's the first entry: **(1) trigger met → (2) behaviors to assert → (3) left to seam/E2E.**

Behaviors to assert (phrase each as a "user sees / user can" sentence, reinforcing L3's reflex):
- First-time visitor (no consent cookie) sees the banner: `findByRole('dialog', { name: /cookie/i })` (or `region` if the app uses a non-modal banner — note the role depends on the component's actual semantics, and the role query failing is the prompt to fix the component, per L3).
- Clicking "Accept" dismisses the banner and records consent: `await user.click(screen.getByRole('button', { name: /accept/i }))`, then `expect(screen.queryByRole('dialog', { name: /cookie/i })).not.toBeInTheDocument()` (note: `queryBy` for the negative, per L3) plus an assertion that the consent module's setter was called with the granted value.
- Clicking "Reject" records the rejected value and dismisses (same shape, different stored value).
- Re-mount with consent already set does not render the banner (`queryBy ... not.toBeInTheDocument()`).
- The `useConsent()`-driven gate reads `false` before consent and `true` after — tested by rendering a tiny consumer or asserting on the provider's exposed state.

Mocks: the cookie read/write is a client cookie helper the component already uses — mock that module (`vi.mock` on the cookie helper), not `next/headers` (this component is client-side; clarify the distinction in one clause, since L2 mocked `next/navigation` and the student may conflate). **Watch-out to teach inline:** reset `document.cookie` (or the mocked store) in `afterEach` — consent state leaking across tests is a real flake here; tie it to L2's `afterEach(cleanup)`/reset discipline.

Left to E2E (ch090/analytics chapter): the *actual* PostHog/analytics gate firing on real consent — the component test proves the gate's *input* (`useConsent` flips); the wire firing is the browser's job. Name this as the boundary; it mirrors the action/seam split.

Components:
- **AnnotatedCode** (`lang="tsx"`, `maxLines` ≤18, steps `color="violet"` — the component band) for one realistic consent test: render with no cookie → assert banner → click Accept → assert dismissed + setter called. 4–5 steps, each ≤6 lines. This is the canonical "render → interact → assert dismissal + negative" walkthrough.
- Keep the other behaviors as a tight prose list with inline one-liners, not five separate code blocks (avoid bloat; the AnnotatedCode carries the shape).

Tooltip terms: `useConsent()` (one clause — "the project's consent provider hook from the security baseline; single source of truth for whether non-essential scripts may run").

### Catalog component 2 — the multi-step subscribe form

Trigger: **complex stateful interactive component** (the canonical example carried since L1/L2 — conditional branches, a state graph with >3 nodes). This is the entry where the action mock-import pattern and the compose boundary pay off concretely, so it's the longest of the five and the natural place to fully resolve L3's debt.

Behaviors to assert:
- Initial step renders only plan selection (the seat-count field is absent: `queryBy ... not.toBeInTheDocument()`).
- Selecting "Pro" reveals the seat-count field (`findBy`/`getBy` after the click); selecting "Free" hides it again — the conditional-branch behavior that *only* lives in the component (the seam test never sees it; name this explicitly as "what the component test catches that the integration test can't").
- Submit is disabled until required fields are filled (`toBeDisabled` → `toBeEnabled` flip).
- Submitting valid data calls the mocked Server Action — but assert the *consequence*, not the call: on `Result.ok` the success affordance appears; on `Result.err({ code: 'CARD_DECLINED' })` the error alert renders with the right accessible name (`findByRole('alert', { name: /card was declined/i })`).
- The dynamic submit button's accessible name reflects state (e.g. "Subscribe to Pro — 5 seats") — an accessibility assertion that lives in the component (`toHaveAccessibleName`), reinforcing L3's "the query is the audit".

Mocks: `vi.mock('@/server/actions/createSubscription', ...)` per the spine section; per-test `mockResolvedValue(Result.ok/err)`. Form wired via `useActionState` (React 19 surface, per continuity) — note pending/error flow through `useActionState`, and `useFormStatus` drives the `<SubmitButton>`; the test asserts on the rendered result of those, not on the hooks.

Explicit compose callout: the action's DB write, audit log, Stripe call → ch088 L7 (the seam). The full Stripe Checkout redirect path → ch090 (E2E). Draw the line in one sentence each.

Components:
- **CodeVariants** (or two AnnotatedCode steps) showing the two action branches side by side: tab "Approved" (`mockResolvedValue(Result.ok(...))` → assert success affordance) and tab "Declined" (`mockResolvedValue(Result.err({ code: 'CARD_DECLINED' }))` → assert error alert). The A/B framing teaches "same form, different action contract, different observable result" — and is the durable counterpart to the brittle `toHaveBeenCalledWith` from the spine.
- **AnnotatedCode** for the conditional-field branch (select Pro → seat field appears; select Free → disappears), `color="violet"`, to make the "state transitions are the lesson" point visceral.

**Diagram — the state graph (Mermaid `flowchart LR` or `stateDiagram`, in `<Figure>`).** Pedagogical goal: make "complex state = the trigger" concrete by drawing the form's branch graph, and show that each *edge* is a behavior a component test asserts (and that no seam test can see). Shape: a small left-to-right graph: Start → (Plan: Pro | Free) → Pro reveals SeatCount → Filled enables Submit → Submit → (ok: Success | err: Error alert). Annotate 2–3 edges with the assertion that covers them. Cap height; keep it ~5–6 nodes. Caption: "Every edge is a behavior the component test owns — and a branch the seam test never sees." This directly visualizes L1's "what component tests catch that integration tests don't."

Tooltip terms: `useActionState` (one clause — "React 19 hook holding a form's action result and pending state at the form root"); reuse `Result` term if needed.

### Catalog component 3 — the date-range picker

Trigger: **shared component library** (consumed across Reports, Invoices, Filters — one bug, many regressions; the cost-per-test math flips). Also the entry that exercises the **Temporal/clock seam** from ch087, so it ties the testing chapters together.

Behaviors to assert:
- Renders a default range showing dates in the user's locale (the i18n thread from L2's render helper — `render(<X />, { locale })`; assert the formatted text the user reads).
- Selecting a new start date past the current end snaps the end date forward (a state-coordination behavior).
- Keyboard navigation moves the focused day: `await user.keyboard('{ArrowRight}')`, assert via `toHaveFocus()` — the focus-management behavior that lives in the component (L3 named `toHaveFocus` for exactly this).
- `Esc` closes the popover and returns focus to the trigger (`toHaveFocus` on the trigger after close) — focus-return-after-close, a critical a11y behavior.
- Selecting a range fires the `onChange` prop with two `Temporal.PlainDate`s — **but** assert this as the user-observable result where possible (the displayed range updates); if asserting the callback is unavoidable for a controlled component, note it's the rare legitimate prop-callback assertion and contrast with the form's compose boundary (a presentational controlled component's `onChange` *is* its contract, unlike a Server Action wiring).

Mocks: `vi.setSystemTime(new Date('2026-05-14'))` (the clock seam from ch087) so "today" is deterministic — name why: a date picker that depends on the real clock is flaky by construction. Reuse L2's `userEvent.setup({ advanceTimers })` note only if a timer is genuinely involved (most pickers aren't — don't introduce it gratuitously).

Left out: the calendar's internal cell layout, which library cell wraps which day — library internals (L3's `data-testid`/library carve-out applies: assert presence and behavior, not internals).

Components:
- **AnnotatedCode** (`color="violet"`) for the keyboard-nav + focus test: open → `{ArrowRight}` moves focus → `{Esc}` closes → focus returns to trigger. This is the richest focus-management example in the chapter; make it the centerpiece.
- **Code** (single small fenced block) for the locale-aware render assertion (`render(<DateRangePicker />, { locale: 'es-ES', messages: esMessages })` → assert the localized date text), demonstrating L2's render-helper locale option in action.

Tooltip terms: `Temporal.PlainDate` (one clause — "a calendar date with no time or zone, from the Temporal API taught in ch083"); reuse "clock seam" via `<Term>` if helpful (one clause, "the swappable time source from ch087's `lib/clock.ts`").

### Catalog component 4 — the data table with selection

Trigger: **shared component library** (a `<DataTable>` consumed across many list surfaces). Behaviors center on selection state and the toolbar that reacts to it.

Behaviors to assert:
- Rows render with expected accessible names: `getAllByRole('row')` length check, plus per-row content. Reinforce L3's "address the specific item by content, don't index the array."
- Clicking a row checkbox selects it and updates the toolbar count ("1 selected"): `within(row).getByRole('checkbox')` then assert the toolbar text — `within` for per-row scoping, the clean answer from L3.
- The header checkbox toggles all rows (select-all / deselect-all).
- Selecting rows enables the "Delete" toolbar button (`toBeEnabled` flips from `toBeDisabled`).
- Clicking "Delete" with two rows selected opens a confirm dialog whose accessible name carries the count: `getByRole('dialog', { name: /delete 2 invoices/i })` — a dynamic-accessible-name assertion (the count is computed from selection state), a strong L3 callback.

Mocks: the delete Server Action import, `mockResolvedValue(Result.ok(...))` — same pattern; the test asserts the dialog/optimistic UI reaction, not the deletion's DB effect.

Left out: **pagination** (URL-state via `nuqs` — integration/seam territory, not a component concern; name it) and **virtualization internals** (the library owns those — assert visible rows and behavior, not the virtualizer).

Components:
- **AnnotatedCode** (`color="violet"`) for the selection → toolbar → confirm-dialog flow: click two row checkboxes → assert "2 selected" → Delete enabled → click → dialog with count in its name. This is the `within` + dynamic-name showcase.
- Keep header-checkbox and row-render assertions as inline one-liners in prose.

Tooltip terms: none new strictly required; `within` is from L3 — reference, don't re-tooltip.

### Catalog component 5 — the checkout summary line

Trigger: **critical UX path on the money surface** (the user reads total, tax, discount, trial-end date before committing money — too consequential for manual review, the seven content variants too granular for E2E's happy path). This is the **purest RTL surface** in the catalog: a presentational component that's a content-under-prop-variants table, *no interactions, no action mocks* — the ideal closing example because it shows component tests at their cleanest.

Behaviors to assert (a small matrix of prop variants → rendered content; 6–8 `it` blocks):
- `plan: 'pro', seats: 5, couponCode: undefined` → the total line reads the expected amount.
- A coupon applied → the discount line appears and the total updates (`findBy`/`getBy` on the discount row; the variant the happy-path E2E never exercises).
- The trial-end date renders in the user's locale *and* timezone (the i18n thread again — `render` with `locale`; reinforce L2's render helper and ch084 formatter discipline).
- "Subtotal", "Tax", "Total" labels are present and announced (`getByText` / role as appropriate).

Mocks: none beyond the locale provider (already in the render helper). Tax *computation* is a `/lib` unit test from ch087 — name the boundary: the summary test asserts the line *renders* the right value given props; the tax *math* is owned by a pure unit test. Same compose discipline, different layer (unit, not seam).

Left out: the actual Stripe Checkout redirect (E2E, ch090).

Teach the **prop-variant matrix** explicitly as a shape: one `describe`, one `it` per variant, each rendering with different props and asserting the rendered content. Contrast with a `toMatchSnapshot()` reflex — name the snapshot smell from L1's watch-outs (a snapshot that updates every copy change is churn without signal; write explicit assertions on labels and amounts instead). This is the lesson's one place to land "explicit behavioral assertions > snapshots" with a concrete example.

Components:
- **Code** or a compact **AnnotatedCode** showing two contrasting variant `it` blocks (no-coupon vs coupon-applied) so the matrix shape is concrete. `color="violet"`.
- **CodeVariants** (optional) — "Snapshot (churns)" vs "Explicit assertions (durable)" — to make the anti-snapshot point visceral, paralleling the brittle/durable framing used elsewhere.

Tooltip terms: none new required.

### When it's not on the list

A short closing-discipline section (content-driven: "what does NOT make the catalog and why"), so the student leaves with the negative space as sharply as the positive. This is where the "off by default" stance from L1 gets its concrete counter-examples, applied to the same app.

Content:
- Every `<Card>`, `<Section>`, `<PageHeader>` — no trigger met; testing them is the coverage theatre L1 warned about.
- The Stripe-redirect button on the pricing page — covered by E2E (ch090); a component test would duplicate at higher cost.
- The page-level Server Components rendering each surface — framework-orchestrated, never an RTL surface (the chapter's spine thread).
- The Server Actions themselves — covered at the seam (ch088 L7).
- Then the **reviewer checklist** for a new component-test PR (one-second reflexes, the practical takeaway the team can adopt): (1) which trigger from L1 was met? name it in the PR. (2) are queries role-first? `data-testid` needs justification. (3) does it assert what the user observes (not state/props/classes)? (4) is the action mocked at the import, and does its real seam test exist? (5) does it pass under `vitest --project component --shuffle`? Present as a `Steps` or a `Checklist` component (Checklist persists ticks — good for a "run this on your next PR" artifact).
- Restate the "year-one zero applied" stance: the catalog is the *shape*, the *count* is whatever earns weight — better five well-chosen tests than fifty box-ticking ones.

Components:
- **Checklist** + **ChecklistItem** for the reviewer checklist (tickable, persists — frames it as a reusable artifact, not just prose).

### Decide the boundary (exercise)

A capstone exercise checking the lesson's core transferable skill: *given a behavior, which layer owns it — component test, seam test, E2E, or unit test (or: don't test)?* This is the highest-value check because the lesson's whole thesis is boundary discipline, and L1–L3 never exercised it on concrete behaviors.

Use **Buckets** (classification drag-and-drop — exactly fits "sort each item into the layer that owns it"). `twoCol` likely on. Four buckets: **Component test** ("observable client behavior"), **Seam / integration test** ("Server Action effect"), **E2E** ("money path in a real browser"), **Don't test / delete** ("no trigger met"). ~8–10 items drawn from the catalog so the answers are defensible and reinforce specific entries:
- Component test: "The seat-count field appears when Pro is selected"; "The confirm dialog's name shows the count of selected rows"; "Esc closes the date picker and returns focus to the trigger"; "The checkout summary shows the discount line when a coupon is applied".
- Seam: "createSubscription writes the subscription row and revalidates the path"; "deleteInvoice refuses a member who lacks the admin role".
- E2E: "The full Stripe Checkout redirect completes after Subscribe"; "PostHog actually stops firing before consent".
- Don't test: "The `<Card>` renders its children"; "The page-level Server Component fetches and lists invoices" (Server Component → wrong surface).

Each item maps unambiguously to one bucket (Buckets requires exact single-bucket answers). Goal: the student internalizes the four-way boundary as a reflex, which is the durable outcome of the whole chapter.

Optionally precede with a single **MultipleChoice** on the spine idea (e.g., "A form test asserts `expect(createSubscription).toHaveBeenCalledWith(...)`. What's wrong?" → correct: it asserts internal wiring, not what the user observed; assert the rendered result of the action resolving). Only if it doesn't crowd the Buckets exercise — the Buckets drill is the priority.

### External resources

A small `<CardGrid>` of 1–2 `ExternalResource` cards if genuinely additive (not padding). Candidates: Testing Library's "Common mistakes" / guiding-principles page (reinforces the boundary and query discipline). Skip a video — the chapter's prior lessons judged the interactive components carry RTL better than a generic walkthrough; only add a `VideoCallout` if the resourcer finds a current (≤~12 min) clip specifically on "what to test vs not in components" that matches the trigger framing. Fail-fast rather than embed off-message.

## Scope

**In scope:** Applying the trigger + ladder + rig to five named app components; the Server Action mock-import pattern (`vi.mock` + `vi.mocked().mockResolvedValue`); the compose-not-overlap boundary (component vs seam vs E2E vs unit); paying L3's debt (assert the action's *observable result*, not `toHaveBeenCalledWith`); the prop-variant matrix shape and the anti-snapshot point; the reviewer checklist; the four-way boundary classification.

**Out of scope — prerequisites, redefine in one clause only:**
- The query priority ladder, `getBy`/`queryBy`/`findBy`, jest-dom matchers, "behavior is what the user observes", "the failing query is a bug report" — **ch089 L3.** Use freely; never re-explain.
- The jsdom `component` project, the `render` helper (`{ ...rtl, user }`, locale options), `userEvent.setup()` + `await` discipline, MSW + `next/navigation`/`next/cache` reuse, `afterEach(cleanup)` — **ch089 L2.** Reference by name.
- The three triggers + "off by default" + "year-one zero" + the five-second gate + "mocking too deep" — **ch089 L1.** Apply, don't re-derive.

**Out of scope — owned by other lessons/chapters, do not teach:**
- Server Action *implementations* and their *integration tests* (the action's body: DB write, audit, Stripe, redirect, role gate) — **ch088 L7.** This lesson mocks the action and stops at the boundary; reinforce that boundary but never test the action's effect here.
- E2E money-path tests (Playwright; Stripe redirect, real PostHog gate firing) — **ch090.** Named as the boundary on the other side.
- `/lib` unit tests (e.g. tax computation) — **ch087.** Named once as the unit-layer boundary for the checkout summary.
- Server Component testing — **out of scope chapter-wide** (not an RTL surface; covered at seam/E2E).
- Visual-regression testing (Chromatic, Percy) — **out of scope chapter-wide.**
- Storybook play functions — **out of scope** (named once in L2, not pinned; do not reintroduce).
- Deep accessibility auditing (axe-core, Lighthouse) — **out of scope**; pointer only, if at all (L3 already gave the axe-core pointer).
- The chapter quiz — **ch089 L5** (separate lesson).

**Honesty note for downstream agents:** these five components are presented as artifacts built earlier in the course (consent gate = ch081 L5 is real; subscribe/checkout, date-range, data table map to the course's Unit-level features but may not all exist as literal files). Write the tests as realistic against the *established contracts* (`useConsent()`, `useActionState`, `Result.ok/err`, the `authedAction` shape, Temporal dates, the render helper), not against specific file paths you cannot verify. Keep code samples illustrative of the *decisions*; do not fabricate exact component source. If a component's existence is uncertain, frame it as "the shape you'd write" rather than asserting the file ships — same stance L1 used for the optional combobox.
