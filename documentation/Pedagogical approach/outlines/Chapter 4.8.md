# Chapter 4.8 — Hooks for holding state

## Concept 1 — The `useState` surface and the bailout rule

**Why it's hard.** Students treat `useState` as "a variable that remembers." Two truths get hidden under that intuition: the initial value is the *first-render* value and silently ignored afterwards, and setting state to a reference-equal value bails out entirely. Without naming both, the spread-vs-mutate bug in Concept 5 has no anchor.

**Ideal teaching artifact.** A Mechanics-archetype anatomy diagram of one `useState` call site annotated like a hardware datasheet: `useState(0)` at the top, three numbered pins — "initial value (consumed once)," "snapshot (frozen for this render)," "setter (stable reference for component lifetime)." A small render-counter widget below the diagram cycles through three actions (initial render, `setCount(5)`, `setCount(5)` again) and shows which pin fires on each tick — including the third call doing nothing because `Object.is(5, 5)` bails. The student learns the contract at the call site rather than from a bullet list.

**Engagement.** A `PredictOutput` round on a five-line snippet: `setCount(0)` from `count = 0`, `setCount(count)`, `setUser({ ...user })` — predict whether each re-renders. The bailout rule is the only thing being tested.

**Components.**
- `Figure` wrapping a hand-authored SVG of the annotated call-site with the three pins; a small `ReactCoding` block beside it whose render-count badge climbs (or doesn't) on each scripted action.
- `PredictOutput` for the bailout recall.

---

## Concept 2 — Lazy initialization: function form vs. value form

**Why it's hard.** `useState(expensiveCompute())` *runs* `expensiveCompute()` on every render and discards every result except the first. The fix is one character — `useState(() => expensiveCompute())` — but students who haven't internalized Concept 1's "function body is called every render" can't see why the function form matters. They also accidentally store a function as state by writing `useState(handler)`.

**Ideal teaching artifact.** A Mechanics-archetype side-by-side reproduction. Two `<Cart>` components live next to each other, both reading a 500-row JSON cart from `localStorage` as initial state. The left uses `useState(parseLocalStorage())`, the right uses `useState(() => parseLocalStorage())`. A counter elsewhere on the page triggers re-renders. A call-counter on `parseLocalStorage` climbs once for the right version and once per render for the left. The student sees the cost without having to time anything.

**Engagement.** A `MultipleChoice` decision drill — for each of five initial values (`0`, `[]`, `parseJSON(blob)`, `Date.now()`, `() => fetch(...)`), pick value-form, lazy-form, or trap. The fourth tests "literal that happens to be a function call" and the fifth tests "storing a function" (`useState(() => handler)`).

**Components.**
- `CodeVariants` with two tabs (value form vs. lazy form), each tab running a live `ReactCoding` block that exposes the call counter on `parseLocalStorage`.
- `MultipleChoice` for the per-case picker.

---

## Concept 3 — Object state vs. multiple state variables

**Why it's hard.** "Put it all in one object" feels tidy and "spread every update" feels ceremonial — but the real cost is invisible: grouped state forces every consumer to re-read the whole object, every update is a full spread, and unrelated fields churn together. Conversely, four `useState`s for fields that always update together duplicate the same intent. The decision is a daily one and students don't have a rule for it.

**Ideal teaching artifact.** A Decision-archetype split: a small `<FormDraft>` rendered twice. The left version has four `useState`s (`firstName`, `lastName`, `email`, `phone`); the right has one `useState({...})`. A render-count badge sits beside each input. The student types in `firstName` on both sides. On the grouped side, every input shows a re-render (because the shared object reference changed); on the split side, only the typed field re-renders. The student then types in `email` and sees the same asymmetry. Two follow-up scenarios swap the data shape — a `<PanelSettings>` with `isOpen` and unrelated `content`, then a `<UserSettings>` bundle saved together — and the artifact recommends the structure each time.

**Engagement.** A `Buckets` sort — items: `firstName + lastName + email of one form`, `isOpen + scrollPosition`, `cart line items`, `dark-mode + locale`, `loading + error + data of one request` — into "one grouped `useState`" vs. "separate `useState`s." The "loading + error + data" item is a trap that forward-references Concept 8.

**Components.**
- New: `StateShapeProbe` — a small comparator with grouped vs. split state for a fixed field set, per-input render-count badges, and a scripted typing sequence. Single-use in this chapter; demoted in favor of `Figure` + hand-SVG plus a `CodeVariants` block (see Components proposals).
- Alternative (primary): `Figure` wrapping a hand-SVG showing the render-fan-out of grouped vs. split state, with `CodeVariants` showing the two implementations.
- `Buckets` for the shape sort.

---

## Concept 4 — Derive in render, do not mirror into state

**Why it's hard.** This is the most consequential anti-pattern in early React careers. A junior reflex creates `useState` for any value that "depends on" something else and syncs it with a `useEffect`. The fix sounds obvious in the abstract — "just compute it" — but the muscle memory only forms when the student watches the two-render-and-stale-window bug *happen* and then watches the derived version produce one render with the right value.

**Ideal teaching artifact.** A misconception-first ambush. The lesson opens with a `<UserCard>` whose `fullName` is mirrored into state and synced with an effect. The artifact runs a click that flips `firstName` from "Ada" to "Ada Augusta" and *pauses* between the first render and the effect's setter — the screen shows the stale `fullName` for a beat, then the effect fires, the second render arrives with the new `fullName`. A render-trace strip across the bottom logs `render → effect → render`. The student watches the bug, then a "fix" button collapses the state and effect into a `const fullName = firstName + ' ' + lastName` line; the trace strip now reads `render` only, and the stale beat is gone.

A second beat sweeps the canonical reproductions — filtered list, derived flag, cached calculation — as three small tabs in the same widget, each with the same render-trace strip. The student sees the *shape* repeat: state, effect, double-render, stale window.

**Engagement.** A `CodeReview` exercise — a 20-line component containing two of the canonical anti-patterns (one mirrored prop, one derived flag) plus one legitimate `useState` for an input. The student leaves inline comments on the two violations and explains the fix. AI-graded against the "derive in render" kernel phrase.

**Components.**
- New: `RenderTrace` — a horizontal timeline strip showing `render`, `effect`, `commit` cells per tick of a small wired component. Reused later in 4.9.2 (effect lifecycle) and 4.9.4 (effect anti-patterns). High forward-link weight.
- `CodeReview` for the bug-hunt.

**Project link.** 4.12.4's theme toggle hits this rule — students reach for `useState` + effect to "sync theme to the DOM" and the senior reach is `next-themes`' controlled value derived from the system preference.

---

## Concept 5 — Immutable updates and the spread reflex

**Why it's hard.** Concept 1 named the bailout rule. The follow-on bug is that students mutate objects in place (`user.name = 'Alice'; setUser(user)`) and the component "doesn't update." The lint rule won't catch it because the mutation is legal JavaScript; only the bailout rule explains the silence. Students need to feel the silent no-op once, then see the spread fix on the same line.

**Ideal teaching artifact.** A Pattern-archetype wrong-by-default sandbox. The student opens a `<TodoList>` with an "Add" button and an array in `useState`. The starter handler calls `items.push(newItem); setItems(items)` and the UI doesn't update. The student is asked: why? A render-count badge sits next to the list and stays at `1`. The student fixes the handler to `setItems([...items, newItem])` and the badge climbs. The widget then walks three sibling reproductions in tabs — array push, object field mutation, nested object spread — each starting broken and each fixed by the spread reflex.

**Engagement.** A `Tokens` exercise on a single 15-line component body — click every line that mutates state in place. Targets: `items.push(...)`, `user.name = ...`, `items[0].done = true`. Decoys: `const draft = [...items]; draft.push(x); setItems(draft)` (fine), `setCount(count + 1)` (fine, primitive), `const items = []; items.push(...)` *inside a handler before any `useState`* (fine — local).

**Components.**
- `ReactCoding` in target-match mode for the three-step fix sandbox.
- `Tokens` for the mutation hunt.

---

## Concept 6 — The four homes for state

**Why it's hard.** Junior reflex is "everything is `useState`." The senior reflex is a four-tier decision tree the student must internalize before any of the homes feels obvious. The cost of getting it wrong (server state in `useState`, search filters that vanish on refresh, theme state lifted to the root) shows up months later as a redesign, not a runtime bug.

**Ideal teaching artifact.** A Decision-archetype guided puzzle. The student sees a wireframe of a real-looking SaaS page — a sidebar with a user avatar, a top-bar search input with a filter chip, a paginated table below, a record-detail modal that opens on row click. Around the page, twelve state values are pinned with question marks: `currentUser`, `darkMode`, `searchQuery`, `filterTags`, `currentPage`, `sortColumn`, `selectedRow`, `modalOpen`, `editedRecordDraft`, `theme`, `tableData`, `unreadCount`. The student drags each to one of four labeled lanes — Local, Lifted, URL, Server. Wrong placements get a one-sentence senior correction ("a recipient opening your shared link should see the same filters — URL"); right placements lock in.

**Engagement.** The puzzle carries the assessment. Follow-up: a `MultipleChoice` decision drill on three edge cases — "the modal is open, should the modal ID be in the URL?" (yes if you want shareable deep links), "the cart contents in a guest checkout?" (server-side cart or `localStorage` — not `useState`), "the open/closed state of a sidebar disclosure?" (local, almost always).

**Components.**
- New: `StatePlacementPuzzle` — a wireframe canvas with draggable state-value pins and four lanes (Local / Lifted / URL / Server), with per-pin senior-correction strings shown on wrong placements.
- `MultipleChoice` for the edge-case follow-up.

**Project link.** Every state value in 4.12 lives somewhere on this tree. The mobile-nav drawer's `isOpen` is local; the theme is lifted via `ThemeProvider`; there's no URL or server state in 4.12 yet — naming the absence is part of the framing for Chapter 5.5.

---

## Concept 7 — Colocate-then-lift on demand

**Why it's hard.** Concept 6 named the tiers; this concept lands the *reflex*. Students lift prophylactically because "maybe a sibling will need it later," and they pay for it with prop-drilling and avoidable re-renders. The opposite mistake — leaving state in a leaf when two siblings need it and gluing them together with effects — is equally common. The senior cut is "lift on demand, not on prediction," and the smell signals on each side need to feel concrete.

**Ideal teaching artifact.** A Pattern-archetype side-by-side: two versions of the same `<SearchableTable>`. The left version has the search input owning a local `query` and the table owning its own `query`, kept in sync with a `useEffect` that calls `setTableQuery` when the input changes — the canonical "lifting not done" smell. The right version lifts `query` to the parent `<SearchableTable>` and passes it down to both children — one source of truth. A render-trace strip under each marks the extra render the left version pays per keystroke. The student then toggles a third panel — "lifted to the root layout" — which over-lifts the same state and the render-trace shows the entire app re-rendering on every keystroke.

**Engagement.** A `MultipleChoice` smell-detector — three short component snippets, each with a state-placement smell (under-lifted, over-lifted, just right). For each, pick the smell and the fix.

**Components.**
- New: `StateLiftLadder` — a three-rung comparator (under-lifted / lifted to common parent / over-lifted) wired to the same `<SearchableTable>` example, with per-rung render-trace strips. Reuses `RenderTrace` from Concept 4.
- `MultipleChoice` for the smell-detector.

---

## Concept 8 — URL state as the third tier

**Why it's hard.** Students treat the URL as "the address of this page" not "a synchronization channel for application state." The result is filter UIs that vanish on refresh, table sorts that can't be shared, and modal-open state that breaks the back button. The fix isn't a library — it's the framing that the URL *is* the source of truth for anything the user expects to bookmark, share, or restore.

**Ideal teaching artifact.** A Concept-archetype real-artifact replica. A scaled-down browser chrome sits at the top of the widget — address bar, back button, refresh button. Below it, a `<TaskList>` with a search input, a status filter dropdown, and pagination. The student is asked to test four user actions: type "report" in search, set status to "done," click page 2, refresh. The widget runs both versions of the component side by side — one with `useState` for all three filters, one with `useSearchParams` (the `nuqs`-shaped surface). On refresh, the left side resets; the right side restores. On back-button click, the left side does nothing; the right side undoes the last filter change. The student watches the URL change in the chrome on every interaction in the right pane.

**Engagement.** A `Buckets` sort — values into "belongs in URL" vs. "stays local": `searchQuery`, `currentPage`, `modalOpen with shareable record id`, `sidebar collapsed state` (local — not shareable), `cart line items` (server), `theme` (local + cookie — not URL), `selectedTab when tabs are part of the route`, `dark-mode preview before save` (local).

**Components.**
- New: `BrowserChrome` — a styled browser-chrome wrapper exposing a fake address bar, back button, refresh, and an inner content slot. Used inside a `TabbedContent` to show the two implementations. Forward-links hard to 5.5 (URL state at depth) and Chapter 11 (production list with URL filters).
- `Buckets` for the home-of-state sort.

**Project link.** 4.12 has no URL state — the chapter ends without one. The widget here pre-loads the reflex so when 5.5 lands, students already feel the pull toward the URL.

---

## Concept 9 — `useReducer` as the state-machine threshold

**Why it's hard.** Students learn `useReducer` as "the other state hook" and reach for it either too early (one toggle and a counter) or too late (twelve `useState`s coordinating a form). The threshold is a *quality of state*, not a count: when transitions have invariants that scattered setters keep violating ("loading and error simultaneously"), one reducer with named actions closes the door on impossible states. The senior framing is "model the machine, then write the reducer."

**Ideal teaching artifact.** A Concept-archetype side-by-side. The left panel shows a `<FetchButton>` with four `useState`s (`isLoading`, `data`, `error`, `lastFetched`). The right panel shows the same component with `useReducer` over a discriminated state union (`idle | loading | success | error`). The student clicks "Fetch" then "Cancel" rapidly on both. On the left, a status readout reveals the impossible states the scattered setters drift through (`{ isLoading: true, error: 'X' }`). On the right, every readout shows exactly one state variant. A small state-machine graph above the right panel highlights the transitions as the student clicks. The artifact uses the graph as a teaching surface — actions are *named arrows*, not setter calls.

**Engagement.** A `MultipleChoice` threshold drill — five components, pick which should switch from `useState` to `useReducer`. (Counter — `useState`. Form with 8 fields, validation, submission state — `useReducer`. Modal open/closed — `useState`. Multi-step wizard with branching — `useReducer`. Toggle — `useState`.) The trap option: "8 fields with no validation or submission — just user input" still stays `useState` because the transitions don't multiply.

**Components.**
- New: `StateMachineExplorable` — a two-pane reducer-vs-`useState` comparator with a state-machine graph overlay that highlights transitions live. Reuses the discriminated-union framing from Chapter 2.5.
- `MultipleChoice` for the threshold drill.

---

## Concept 10 — The reducer purity contract and the action shape

**Why it's hard.** Once students reach for `useReducer`, two new bugs appear: side effects inside the reducer (a `fetch`, a `console.log`, a `Math.random` for an ID) that break Strict Mode and the compiler, and weakly typed actions (`type: string, payload: any`) that lose every benefit the pattern was supposed to deliver. The fix is two rules — purity, and discriminated-union actions with exhaustive switches.

**Ideal teaching artifact.** A Mechanics-archetype anatomy. A correct reducer is shown with four annotated zones — the action union (discriminated by `type`, payloads as additional fields), the switch on `action.type`, each `case` returning a spread-then-override new state, and the `default` case calling `assertNever(action)`. Beside it, a "broken neighbor" version stacks four reds: action typed as `{ type: string }`, a `fetch` inside a case, a mutation (`state.items.push(...)`), and no exhaustive default. A toggle reveals the TypeScript errors and the Strict-Mode double-call symptom on the broken neighbor.

**Engagement.** A `TypeCoding` exercise — the student writes a discriminated action union for a form reducer (`set-field`, `submit-start`, `submit-success`, `submit-error`, `reset`). The reducer signature is provided; the test asserts that the `default` case narrows to `never`.

**Components.**
- `Figure` wrapping a hand-authored SVG of the reducer anatomy with annotated zones and the side-by-side broken-neighbor.
- `TypeCoding` for the action-union exercise.

---

## Concept 11 — `useRef`: "does the JSX read it?"

**Why it's hard.** Students reach for `useRef` for "values that should persist," forget that `useState` also persists, and end up with refs that should be state (timer IDs that drive a UI countdown) or state that should be refs (an `isFirstRender` flag that never appears in JSX). The decision rule is one question — "does the JSX read this value?" — but students don't have the muscle until they've sorted enough cases.

**Ideal teaching artifact.** A Concept-archetype side-by-side with a sorting drill folded in. Two parallel call sites appear on the page: `useState` on the left, `useRef` on the right. The student is shown six values one at a time — a controlled input's text, a `setInterval` ID, the previous `count` for a `usePrevious` comparison, the focus state of an input the JSX styles on focus, a render-count for a debug overlay rendered to the screen, the DOM node for an autofocus call. For each, the student picks state or ref; the artifact reveals the answer and animates the value's lifecycle: state values flow to JSX (highlighted), ref values flow to handlers/effects only (different highlight). The "does the JSX read this?" question is the cursor the student carries.

A second beat introduces the two flavors — DOM ref and instance value — as the same shape with two slots: `ref.current` either holds a DOM node assigned by React, or a value the developer assigns in handlers/effects. A small diagram links the two flavors via the shared `{ current: T }` box.

**Engagement.** A `Buckets` sort confirming the decision after the artifact — values into "state (UI reads it)" vs. "ref (handlers and effects only)." The bucket items overlap with the artifact's six but add three: `scroll position used to compute a sticky-header transform in JSX` (state), `IntersectionObserver instance` (ref), `the validated form value that the submit button reads to enable itself` (state).

**Components.**
- New: `RefVsStateProbe` — a "show the value, ask state-or-ref, reveal with animated highlight" widget driven by a small scripted list of cases. Forward-links to 4.10.1 (`usePrevious`, `useEventListener` custom hooks).
- `Figure` for the two-flavors-of-ref diagram.
- `Buckets` for the post-artifact confirmation.

---

## Concept 12 — Don't read or write refs during render

**Why it's hard.** DOM refs are `null` on the first render and stale on every subsequent one because React assigns `.current` *after* commit. Reading `ref.current` in the function body produces values that look right occasionally and break under conditional rendering. Writing to `ref.current` during render makes the component impure and silently disables compiler memoization. The rule is "handlers and effects only," and the artifact has to show *when* the ref actually gets its value.

**Ideal teaching artifact.** A Mechanics-archetype scrubbable lifecycle. A `DiagramSequence` walks one render-and-commit pass for a small `<TextField>`: (1) function body runs, `inputRef.current === null` highlighted, (2) JSX returned with `ref` attribute, (3) React commits — DOM node created, (4) React assigns `inputRef.current = node`, (5) effect fires, `inputRef.current` highlighted as the live node. The student scrubs forward and back. A second frame in the same sequence shows the *next* render: function body runs again, `inputRef.current` is now the live node from the previous commit — fine to read in effects, suspicious to read in render (could be stale if the ref target changed). A third frame demonstrates the compiler skipping memoization for a component that writes to `ref.current` in the body, with the badge flipping gray.

**Engagement.** A `Sequence` drill — drag five steps into order: function body runs, JSX returned, DOM commit, ref assignment, effect fires. Then a `MultipleChoice` on three snippets — "is this ref access legal?" (read in handler — yes, read in render — no except lazy-init exception, write in effect — yes).

**Components.**
- `DiagramSequence` wrapping three SVG frames of the render-and-commit lifecycle.
- `Sequence` for the order drill.
- `MultipleChoice` for the legality check.

---

## Concept 13 — `useId` for ARIA wiring, never for list keys

**Why it's hard.** Two misconceptions live here together. The first is the hydration-mismatch trap: students reach for `Math.random()` or `crypto.randomUUID()` for an input ID, the SSR HTML and the hydrated client differ, and React throws a warning that costs an afternoon. The second is the universal "could I use `useId` for list keys?" question — the answer is no, but the *reason* (the ID derives from the component instance, which exists only after creation; keys must come from the data) needs naming so the rule isn't memorized as arbitrary.

**Ideal teaching artifact.** A Concept-archetype split. The top half shows the canonical correct use: a `<TextField label="Email">` rendered, the same component shown twice on the page, and the resulting HTML inspected — two unique `:r1:`, `:r2:` IDs, both stable across server and client renders. A small SSR-vs-client toggle confirms the IDs match. A composing-IDs sub-beat shows one `useId()` call producing `id`, `${id}-error`, `${id}-hint`.

The bottom half is a misconception ambush. A list of three `<Comment>` items renders with `key={useId()}` — the student is told "this looks right." A "delete the middle comment" button fires; the artifact reveals that React reused the wrong instance because the keys shifted as the tree changed. A "fix" toggle swaps to `key={comment.id}` and the deletion behaves correctly. The artifact pairs the rule ("keys come from data") with the failure mode that explains it.

**Engagement.** A `MultipleChoice` decision drill — five ID/key scenarios: label-input wiring (`useId`), list of comments (`item.id`), aria-describedby for an error message (`useId`-derived), CSRF token (`crypto.randomUUID` server-side), a one-off element with a URL fragment users link to (`id="email"` hardcoded — not `useId`).

**Components.**
- New: `UseIdReplica` — a small Astro widget rendering a real `<TextField>` (or shadcn equivalent) twice, exposing the rendered HTML with the generated IDs highlighted, plus a list-key variant that demonstrates the keys-shift bug on deletion. Forward-links to Chapter 7 (form fields) and 4.11.3 (ARIA wiring).
- `MultipleChoice` for the per-case picker.

**Project link.** 4.12 has no forms yet — `useId` doesn't surface in the project until Chapter 7. The lesson lands the reflex pre-emptively so Chapter 7's form components don't have to re-teach it.

---

## Component proposals

- **`RenderTrace`** — horizontal timeline strip showing per-tick `render`, `effect`, `commit` cells for a wired component; supports multiple stacked traces for side-by-side comparison.
  - Uses in this chapter: concepts 4, 7.
  - Forward-links: 4.9.1 (Strict Mode double-invoke is visible on this strip), 4.9.2 (effect lifecycle is the same strip), 4.9.4 (effect anti-patterns), 4.10.2 (compiler memo skips visible). High forward-link weight.
  - Leanest v1: a static `DiagramSequence` with pre-baked trace strips for the three or four scenarios used in this chapter. Live tracing is iteration two; the model lands either way.

- **`StateShapeProbe`** — grouped-vs-split state comparator for a fixed form, per-input render-count badges, scripted typing sequence.
  - Uses in this chapter: concept 3.
  - Forward-links: None — single-use. Demoted in concept 3 in favor of a `Figure` + hand-SVG + `CodeVariants` combination.
  - Leanest v1: skip — use the `Figure`-wrapped static diagram as the primary recommendation. Listed here for completeness.

- **`StatePlacementPuzzle`** — wireframe canvas with draggable state-value pins and four lanes (Local / Lifted / URL / Server), per-pin senior-correction strings shown on wrong placements.
  - Uses in this chapter: concept 6.
  - Forward-links: 5.5 (URL state at depth — same puzzle, more pins), Chapter 11 (production list state placement), Unit 16 (global stores as a fifth lane). Real forward-link weight.
  - Leanest v1: a static four-column `Buckets` exercise with the twelve state values and the four lanes — drops the wireframe canvas but keeps the decision drill. The wireframe is the polish iteration; the sort still teaches.

- **`StateLiftLadder`** — three-rung comparator (under-lifted / common parent / over-lifted) for the same `<SearchableTable>`, with per-rung `RenderTrace` strips.
  - Uses in this chapter: concept 7.
  - Forward-links: 4.9.5 (`useContext` re-render storm — over-lifted via context is the same shape), Unit 16 (global-store over-reach).
  - Leanest v1: ship as `CodeVariants` with three tabs and a static `RenderTrace` strip per tab — no live wiring. The render-difference is named in prose; interactivity is iteration two.

- **`BrowserChrome`** — styled browser-chrome wrapper exposing a fake address bar, back button, refresh button, and an inner content slot.
  - Uses in this chapter: concept 8.
  - Forward-links: 5.5 (URL state at depth — the canonical demo surface), Chapter 11 (production list with URL filters — same chrome), 5.1 (file-system routing demos benefit from the same chrome). High reuse across Units 5 and 11.
  - Leanest v1: a CSS-only chrome shell with no interactive back/refresh — just a visual frame and a fake address bar that the inner content updates via a prop. Interactive history simulation is iteration two.

- **`StateMachineExplorable`** — two-pane reducer-vs-`useState` comparator with a state-machine graph overlay highlighting transitions live as the student clicks actions.
  - Uses in this chapter: concept 9.
  - Forward-links: 4.9.6 (`useTransition` wrapping `dispatch`), Chapter 7 (`useActionState` for form submission — same machine shape), Unit 16 (Zustand's state-machine patterns).
  - Leanest v1: a static `Figure` with the state-machine diagram alongside a `CodeVariants` of the two implementations — no live transition highlighting. The visual model lands; the live wiring is the polish iteration.

- **`RefVsStateProbe`** — show-value-then-ask widget that walks the student through six cases, asks state-or-ref, and reveals with an animated "this value flows into JSX" or "this value flows into handlers only" highlight.
  - Uses in this chapter: concept 11.
  - Forward-links: 4.10.1 (custom hooks like `usePrevious`, `useEventListener` reuse the same decision), Chapter 7 (uncontrolled form fields).
  - Leanest v1: a `Buckets`-style drill with the six values and two lanes ("state" vs. "ref") and a reveal-with-explanation interaction. The highlight animation is iteration two.

- **`UseIdReplica`** — small Astro/React widget rendering a `<TextField>` twice, exposing the rendered HTML with generated IDs highlighted, plus a list-key variant that demonstrates the keys-shift bug on deletion.
  - Uses in this chapter: concept 13.
  - Forward-links: Chapter 7 (form fields at depth), 4.11.3 (ARIA wiring).
  - Leanest v1: a static `Figure` showing two rendered `<TextField>`s with the IDs called out in callouts, plus a `CodeVariants` showing `useId` vs. `Math.random()` and a separate `CodeVariants` showing `useId`-as-key vs. `item.id`-as-key. The interactive deletion can be a static before/after frame pair in `DiagramSequence`.

## Build priority

The top components to build first, ranked by reuse plus forward-link weight:

1. **`RenderTrace`** — used in two concepts in this chapter and reused across at least four downstream lessons (Strict Mode, effect lifecycle, effect anti-patterns, compiler memoization). The leanest-v1 is a `DiagramSequence` with pre-baked strips, which is cheap and still teaches; the live version compounds across Chapter 4.9.
2. **`BrowserChrome`** — single-concept here, but the canonical surface for URL-state and routing demos throughout Unit 5 and Unit 11. The CSS-only v1 ships fast and removes a recurring wireframing problem from future lessons.
3. **`StatePlacementPuzzle`** — load-bearing for the chapter's central decision and forward-links into Unit 5, Unit 11, and Unit 16. Even as a `Buckets`-style v1, the four-lane sort is the assessment vehicle for the most consequential reflex in this chapter.

`StateMachineExplorable`, `RefVsStateProbe`, and `UseIdReplica` are worth building but rank below — single-concept in this chapter with lighter forward-links. `StateLiftLadder` and `StateShapeProbe` should ship as `CodeVariants` + `Figure` first; promote to bespoke components only if reuse materializes.

## Open pedagogical questions

- Concept 8's `BrowserChrome` could either ship a faithful `nuqs`-shaped surface here or defer the library API to 5.5 entirely. Recommendation is to defer the API and show `useSearchParams` directly so the lesson stays on the *placement* decision, not on the library. Confirm during draft.
- Concept 13's list-keys ambush retreads Chapter 4.7.2's `key`-as-identity material. The forward-reference should be tight — the artifact here should *re-use* the failure-mode pattern, not re-explain it. Worth a cross-check against 4.7's pedagogy doc when 4.8.6 is drafted.
