# The query ladder is the accessibility audit

- Title: The query ladder is the accessibility audit
- Sidebar label: The query ladder

## Lesson framing

This is the highest-value lesson in chapter 089. Lessons 1 and 2 installed *when* to write a component test and *how the harness boots*. This lesson installs *how to write the assertions* — and the durable idea that **the way you find an element is a verdict on its accessibility**. Every other concept in the lesson hangs off one thesis: a test written to the accessibility tree (role + accessible name) is an accessibility regression test for free; a test written to `data-testid` or a CSS class proves nothing about whether a real user can reach the element.

Three distinct topics live here, taught in this order so each builds on the last:
1. **The query priority ladder** — the ordered list of how to find elements, role-first, `data-testid` last. This is the spine; teach it first and longest.
2. **The `getBy` / `queryBy` / `findBy` trichotomy** — the three *intentions* (it's here now / it's absent / it'll be here after async). Orthogonal to the ladder: each ladder query has all three variants. Teach this after the ladder so the student isn't juggling two new axes at once.
3. **"Behavior" at the DOM layer** — what an assertion should target (what the user observes) vs what it must never target (internal state, props passed to children, class names, hook order). This is the philosophical payoff; it reframes the first two topics as *consequences* of one principle rather than rules to memorize.

Pedagogical spine. The student arrives able to *boot* a test but not *author* one well; their instinct (carried from older tutorials and from the path of least resistance) is `getByTestId` because it always works and never makes them think about semantics. The lesson's job is to make that instinct feel expensive. The technique throughout: **write the assertion in plain English first** ("the user sees a payment-failed alert"), and let the query *fall out* of that sentence. When the query can't be written role-first, that is the signal the *component* is broken (missing `role`, missing accessible name, no `<label>`) — not a license to drop down the ladder. This "the failing query is a bug report on your component" reframing is the lesson's most important mental model and should recur in at least three sections.

Cognitive-load management. The ladder has eight rungs; do not dump all eight as a flat list and move on. Teach the top three rungs (role+name, label, text) with worked examples and an interactive playground, because they cover ~90% of real assertions. Present the lower five rungs (displayValue, alt, title, testid) compactly as "the tail," with `getByTestId` getting its own treatment as the deliberate carve-out. Keep the `getBy`/`queryBy`/`findBy` axis visually separate (a small diagram) from the ladder so the two mental models don't blur.

Interactivity is central, not decorative. This lesson is *about* a tool (Testing Playground) whose whole purpose is ranking queries by the ladder. The `ReactTestingCallout` component embeds exactly that tool — the student pastes markup and watches the playground recommend the same ladder we teach. Use it at least twice: once for an accessible form (top of ladder fires), once for an inaccessible `<div onClick>` widget (the playground falls back to testid and the lesson connects that fallback to the accessibility failure). This is the lesson's "show, don't tell" lever and the reason this topic is so well-suited to interaction.

Carry the established contract. Per lessons 1–2 continuity notes: tests call `src/test/render.tsx` (returns `{ ...rtl, user }`), `screen` is the default query surface, `findBy` is the default post-interaction reach, `userEvent` interactions are always `await`ed, and React 19 uses `useActionState` (never `useFormState`). Do not re-teach setup; assume the harness from lesson 2. Use violet for the component band in any reused diagram styling (ch086 convention).

## Lesson sections

### Introduction (no header)

Open with the senior question framed as a concrete dilemma (from the brainstorm): a single Confirm button carries class `btn-primary`, id `submit`, text `Confirm`, `aria-label="Confirm purchase"`, role `button`, and `data-testid="submit-btn"`. Six ways to find it. Which do you write? State that the naive answer (`getByTestId` — always works, never breaks) ages the suite badly, and the senior answer follows a *priority ladder* that happens to be the same axis as accessibility. Land the one-sentence thesis: **the query is the audit**. Preview the three topics. Keep it to ~5 lines; connect back to lesson 2 ("you can boot a test; now you'll write assertions a senior would sign off on").

Terms to introduce here with `<Term>`: **accessibility tree** (the semantic tree assistive tech navigates — roles, names, states — derived from the DOM, not the DOM itself), **accessible name** (the computed label a screen reader announces for an element: from text content, `aria-label`, `aria-labelledby`, or an associated `<label>`).

### The priority ladder: how to find an element

The spine section. Teach the ladder as an *ordered preference*, top to bottom, with the governing rule stated up front: **prefer the query highest on the ladder that the element supports**; dropping a rung should feel like a compromise you can justify.

Present the full ladder once as a compact reference (a simple ordered visual — see diagram below), then teach the top three rungs in depth:

1. **`getByRole(role, { name })`** — the single highest-value query; semantic role plus accessible name. Stress that `name` is what makes it precise (a page has many buttons; `name` picks one). Worked example: `screen.getByRole('button', { name: /confirm purchase/i })`. Enumerate the common roles a SaaS UI exercises: `button`, `link`, `textbox`, `combobox`, `checkbox`, `radio`, `heading` (with `{ level }`), `dialog`, `alert`, `status`, `region`, `listitem`, `row`, `grid`. Note implicit vs explicit roles inline here (don't make it a separate section): `<button>`→`button`, `<input type="checkbox">`→`checkbox`, `<a href>`→`link`, but `<a>` *without* `href` has no role, and `<div role="button">` needs `tabIndex={0}` + a key handler to be truly reachable — RTL's role query finds it, real accessibility tooling does not, and that gap is exactly what the test should surface.
2. **`getByLabelText(text)`** — form controls via their associated `<label>`. This is the *top* preference for inputs (a labelled input is how a real user fills a form). Worked example with a proper `<label htmlFor>`.
3. **`getByText(text)`** — non-interactive content (a paragraph, a status line that isn't a live region). Warn inline: `getByText('Confirm')` can match a tooltip *and* a button; narrow with role when the element is interactive.

Then compress the tail into one short list with one-line justifications: `getByPlaceholderText` (only when no label exists — usually a sign the form is inaccessible), `getByDisplayValue` (current value of a filled input), `getByAltText` (images), `getByTitle` (the `title` attribute — and a watch-out: `title` is *not* an accessible name; it only shows on hover, so prefer `aria-label` + `getByRole({ name })`). End the tail at `getByTestId`, but give it its own micro-treatment as the carve-out (next paragraph), because it's the rung students abuse.

**Why role-first** (the payoff paragraph, give it weight): role + name is *exactly what assistive tech sees*. A test passing the role-first query proves the element is keyboard-reachable and announced correctly. A test passing only `getByTestId` proves nothing about that — the element could be a `<div>` with a click handler that no screen reader will ever find. This is where "the query is the audit" gets its mechanical justification; make the causal chain explicit.

**Accessible-name matching options**: `name` accepts an exact string, a regex (`/confirm/i`), or a predicate `(name, el) => boolean`. Teach **regex as the default** (copy shifts from "Confirm purchase" to "Confirm payment" and a `/confirm/i` test stays green on the stable part), and **exact string when the copy is load-bearing** and *should* break the test on change (a legally-required label, a privacy string). This is a senior-judgment beat, not a syntax dump — frame it as "decide whether this string is allowed to change silently."

Components and diagram for this section:
- **Diagram — the ladder.** A vertical HTML+CSS "ladder" or ranked strip (plain HTML+CSS per the diagrams index; this is a color-coded ordered list, not a graph) wrapped in `<Figure>`. Eight rungs top-to-bottom, top three tinted as "reach for these" (e.g. green/blue), middle tinted neutral, `getByTestId` at the bottom tinted as "last resort" (orange/red). Each rung shows the query name + a three-word use case. Pedagogical goal: a single glance-able mental image of precedence that the student can recall mid-test. Cap height well under 800px; this is a short strip.
- **`ReactTestingCallout` (instance 1 — accessible form).** Embed a small accessible login form (`<label for>` + `<input>` + submit `<button>`). Seed `query` with `screen.getByRole('button', { name: /sign in/i })` or `getByLabelText(/email/i)`. Message: the playground ranks suggestions by the *same* ladder — paste markup, watch it recommend role/label first. This is the "the tool agrees with the lesson" moment. Use the example shape from the component doc.
- **`AnnotatedCode`** walking one realistic `it` block that exercises the top three rungs in sequence (find the heading by role+level, fill an input by label, click the submit by role+name, read the result by role `status`). Steps tinted violet (component band). Goal: show the ladder applied in flowing test code, not as isolated one-liners. Keep ≤18 lines, ≤6 lines prose per step.

Terms here: **role** (the semantic category of an element in the accessibility tree — `button`, `link`, `textbox` — that tells assistive tech how to present and operate it), **live region** (an element like `role="alert"` or `role="status"` whose content changes are announced to screen readers automatically) — introduce `live region` when `status`/`alert` first appears.

### Three intentions: getBy, queryBy, findBy

The second axis. Open by making the orthogonality explicit and visual: the ladder answers *which* element; this trichotomy answers *what you're asserting about its existence in time*. Every ladder query (`getByRole`, `queryByRole`, `findByRole`, …) has all three forms.

Teach the three by *intention*, each with the one assertion shape it's correct for:
- **`getBy*`** — "it is here, now." Throws immediately if missing (so the failure message is good), returns exactly one element. The default for synchronous presence.
- **`queryBy*`** — "it is **not** here." Returns `null` instead of throwing — the *only* correct query for a negative assertion: `expect(screen.queryByRole('alert')).not.toBeInTheDocument()`. Hammer the common bug: using `getBy` for "not present" throws *before* your assertion runs, so the test fails for the wrong reason with a confusing message.
- **`findBy*`** — "it will be here after async work." Returns a promise, retries until the element appears or the ~1000 ms default timeout elapses. The default reach for any assertion *after* a `user.click` that triggers state, fetch (MSW), or a transition: `await screen.findByRole('alert', { name: /payment failed/i })`. Tie back to lesson 2: this is the same `findBy` already used as the wiring example.

Then the lower-level escape hatch: **`waitFor`** is for *non-DOM* observations (a mock got called: `await waitFor(() => expect(mock).toHaveBeenCalled())`). Default to `findBy` for DOM; reach for `waitFor` only when the thing you're waiting on isn't an element. Watch-out: wrapping a *synchronous* assertion in `waitFor` just slows the suite for no reason.

Mention `*AllBy` variants briefly (`getAllByRole('listitem')` → array; assert `.toHaveLength(n)`), but immediately steer toward the better pattern: address a specific item by its content (`getByRole('button', { name: /delete invoice INV-001/i })`) instead of indexing into an array — more durable, reads like intent. Introduce `within(element).getByRole(...)` here as the scoping tool for "the delete button *in this row*."

Diagram and exercise for this section:
- **Diagram — a small decision flow** (`Mermaid flowchart LR`, per diagrams index for decision trees), wrapped in `<Figure>`. Three questions → three answers: "Asserting it's absent?" → `queryBy`; "Appears after async work?" → `findBy`; else → `getBy`. Keep it to ~4 nodes, horizontal. Goal: a fast disambiguator the student runs in their head; this is exactly the kind of small flow that decision trees suit.
- **Exercise — `Buckets`.** Three buckets (`getBy` / `queryBy` / `findBy`); items are short assertion *intentions* phrased in English ("Assert the error banner is gone after a successful save", "Assert the heading renders on first paint", "Assert the toast appears after clicking Submit", "Assert no validation message before submit", "Assert the search results list after typing"). Goal: drill the intention→query mapping, which is where students slip. Use `twoCol={false}`; ~6 items.

### Behavior is what the user observes

The philosophical payoff — reframes the whole lesson. State the definition crisply: **behavior at the component layer is what a user (sighted or not) observes from outside the component** — rendered text, accessible names, element states (disabled / checked / pressed), image alt text, form values, focus order, and what gets *announced* after an interaction. Behavior is **not**: which hook ran, what prop a child received, internal state shape, the order of `useEffect` calls, or which CSS classes applied. Tie explicitly to the same "behavior, not implementation" rule from ch086 L4 — note it's the same principle specialized to the DOM (per continuity, lessons are entered independently, so re-state the principle in one line rather than assuming recall).

**The "user sees" reflex** — the lesson's central writing technique, give it the most prose: before writing an assertion, phrase it as "the user sees X" or "the user can do X," then let the query and matcher fall out. Show the contrast directly:
- Durable: `expect(screen.getByRole('alert', { name: /payment failed/i })).toBeInTheDocument()` reads as "the user sees a payment-failed alert" — survives refactors.
- Brittle: `expect(mockOnSubmit).toHaveBeenCalledWith(...)` reads as "my mock got called" — implementation surface, breaks on rename, and at the component layer is usually the wrong assertion (the *action's* contract is the seam test's job, ch088 L7 — name the boundary, don't re-teach it).

**The matchers worth knowing** (from `@testing-library/jest-dom`, registered in lesson 2's setup): present them sorted by *what they read as*, not alphabetically. "Reads as an observation" (prefer): `toBeVisible`, `toHaveAccessibleName`, `toHaveAccessibleDescription`, `toBeDisabled`/`toBeEnabled`, `toBeChecked`, `toHaveValue`, `toHaveFocus`, `toHaveTextContent`. "Reads as DOM detail" (avoid — couples to implementation): `toHaveClass`, `toHaveAttribute`. Make the heuristic explicit: if the matcher name describes something a user could perceive, it's a good assertion; if it describes markup internals, you're testing implementation. Keep this a curated list, not the full catalog (the full set is large and mostly niche).

**The failing query as a bug report** (recurring mental model, land it hardest here): write the assertion first — "the user sees the success toast 'Invoice sent'" — and the query falls out: `await screen.findByRole('status', { name: /invoice sent/i })`. If that query *can't* be written role-first, the *component* is wrong (missing `role="status"`, missing accessible name, an unlabelled input). The correct response is to **fix the component to expose semantic structure**, not to drop to `getByTestId`. Walk the concrete "unhappy DOM tree": a modal that ships without `role="dialog"`, without `aria-labelledby` on its title, without an accessible name on its close button — it *renders* but is untestable by the role-first ladder; writing the test, watching the role query fail, and fixing the component is how the component *becomes* accessible. This closes the loop on the lesson thesis.

**`data-testid` — the legitimate carve-out** (so the student doesn't read the lesson as "testid is forbidden"): three real cases — (1) an element with no semantic role (a portal mount node, a pure styling wrapper); (2) a third-party widget the team doesn't own (a charting library container — assert presence, not internals); (3) two semantically-identical regions during a transition where role+name is genuinely ambiguous (prefer `within` first; testid only if that fails). Outside those, `getByTestId` is a smell whose remediation is "fix the component, write the role query."

Components and exercises for this section:
- **`CodeVariants` — brittle vs durable.** Two tabs ("Brittle" / "Durable") of the *same* behavioral check. Brittle tab uses `container.querySelector('.btn-primary')` / asserts `component.state.isOpen` / `toHaveClass('error')` (use `del=` styling for the smell lines); durable tab uses role+name + `toBeVisible` / `findByRole('alert')` (use `ins=`). One-paragraph prose per tab naming the smell and the fix. Goal: side-by-side makes the brittleness visceral. Per-pane mark color: red on brittle, green on durable.
- **`ReactTestingCallout` (instance 2 — the inaccessible widget).** Embed a `<div onClick>` "button" (no `role`, no `tabindex`, no accessible name). The playground's best suggestion drops toward `getByTestId` / `getByText`. Message connects it to the lesson: when the tool *can't* suggest a role query, that's the accessibility bug talking — fix the markup (`<button>` or `role="button" tabindex="0"`) and re-paste to watch the role suggestion appear. This is the strongest single demonstration of the thesis; pair it in prose with the "failing query as bug report" idea.
- **Exercise — `MultipleChoice` (single-correct), the six-attribute button.** Reuse the intro's Confirm button (class / id / text / aria-label / role / data-testid). Question: which query should you write? Options: `getByTestId('submit-btn')`, `container.querySelector('.btn-primary')`, `getByRole('button', { name: /confirm purchase/i })` (correct), `getByText('Confirm')`. `McqWhy` ties the answer back to the ladder and the audit thesis. Phrase options so the student reasons, not pattern-matches (per MCQ guidance).

Terms here: **portal** (React rendering a subtree into a different DOM node — e.g. a toast or modal mounted at `document.body` — so it escapes the parent's overflow/stacking) — introduce when the portal-anchor testid carve-out appears.

### External resources (optional)

One or two `<ExternalResource>` cards: the Testing Library "About Queries / Priority" page (canonical source for the ladder) and the `jest-dom` matcher reference. Optional `VideoCallout` only if a short, current (≤ ~12 min) RTL-queries video is found that matches the role-first framing — do not force one; the `ReactTestingCallout` interactions carry the lesson better than a generic video would. The resourcer agent should fail-fast rather than embed an off-message or outdated clip.

## Scope

**Already taught — assume, do not re-teach (state in ≤1 line each where needed):**
- jsdom/RTL setup, the `component` Vitest project, `.dom.test.tsx` glob, `vitest.setup.dom.ts`, `afterEach(cleanup)`, the pin set (`@testing-library/react` v16 / `user-event` v14 / `jest-dom` v6) — ch089 L2.
- `src/test/render.tsx` returning `{ ...rtl, user }`; `screen` as default; `userEvent.setup()` once per test; `await` every interaction; `findBy` as the post-interaction default; `userEvent` over `fireEvent`; MSW + `next/navigation` mocks carried from ch088 — ch089 L2. This lesson *uses* `findBy`, `screen`, and `user.click` as established tools; it teaches their *selection rationale* (the trichotomy), not their wiring.
- *When* to write a component test — the three triggers + accessibility-regression trigger, anti-triggers, "off by default" — ch089 L1. Do not re-litigate the decision; this lesson assumes the test is greenlit.
- "Behavior not implementation" as a general testing principle — ch086 L4. Re-state in one line specialized to the DOM; don't re-derive.
- React 19 `useActionState` (not `useFormState`) — ch089 L1 correction; use the correct name if an action-state error message appears in an example.

**Belongs to later/other lessons — do NOT cover:**
- The concrete component catalog (cookie consent, subscribe form, date-range picker, data table, checkout summary) and the **Server Action mock-import pattern** (`vi.mock('@/server/actions/...')`) — ch089 L4. This lesson may use *generic* one-off examples (a login form, a Confirm button, a toast) but must not build out the named catalog components or teach the action-mock pattern.
- E2E money-path testing (Playwright) — ch090.
- Server Action integration testing at the seam — ch088 L7. Name the boundary ("the action's body is the seam test's job") without teaching it.
- Server Component testing — out of scope chapter-wide (seam in ch088 / E2E in ch090).
- Deep accessibility auditing (axe-core, Lighthouse a11y, full WCAG, ARIA authoring patterns) — out of scope; name axe-core once at most as "the next step if the team wants automated a11y coverage." This lesson teaches *only* the accessibility surface that the role-query ladder incidentally exercises.
- Visual-regression testing (Chromatic, Percy) — out of scope chapter-wide.
- Storybook `play` functions / `@storybook/test` — out of scope (named once at most for awareness, per ch089 L2 stance).
- Custom matchers via `expect.extend` — name the threshold by reference to ch087 L1 (domain-repeated 3×, then extract); don't teach the mechanics.

**Concept boundaries within the lesson:** the ladder (which element) and the `getBy`/`queryBy`/`findBy` trichotomy (existence-in-time) are orthogonal — teach them as separate axes and say so explicitly, so the student doesn't conflate "role query" with "synchronous query."
