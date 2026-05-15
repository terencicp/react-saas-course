# Chapter 4.7 — The render model

## Concept 1 — Render is a function call, not a template binding

**Why it's hard.** Students arriving from Vue, Angular, or any framework with reactive bindings believe a component "binds to its state" and updates in place when state changes. React doesn't. State change schedules React to *call the function again*, and the new return value is diffed against the last. Every footgun in this chapter falls out of missing that shift.

**Ideal teaching artifact.** A Concept archetype: a small split-screen visualization where the left panel shows `Counter` as plain function-of-state — boxed inputs (`count`, `props`), an arrow into the function body, an arrow out into a JSX tree literal — and the right panel shows a render log that appends a new row each time React re-invokes the function. The student clicks an "increment" button; on the left the function visibly re-fires, a fresh JSX tree pops out, and a "diff" arrow connects the previous tree to the new one. The point is visceral: render is an event, not a binding.

**Engagement.** A four-statement `TrueFalse` round immediately after the artifact — "the component object is reused between renders" (false), "calling `setCount` mutates the current render's `count`" (false), "JSX is a description of UI, not the UI itself" (true), "render produces a tree of plain objects" (true).

**Components.**
- `Figure` wrapping a hand-authored SVG of the function-of-state diagram (left side), with a small live `ReactCoding` block beside it whose `console.log` adds a row to a render-log panel each call.
- `TrueFalse` for the post-artifact recall.

**Project link.** The marketing surface in 4.12 is mostly static but the `ThemeToggle` and `MobileNav` ride this model — students need it to recognize *why* a click triggers everything downstream.

---

## Concept 2 — The three triggers, and "the prop didn't trigger anything"

**Why it's hard.** The most common misconception in React: "my prop changed, so the child re-rendered." Props don't trigger renders. Parents passing new props do — because the parent re-rendered first. Naming this distinction early prevents months of confused profiler readings.

**Ideal teaching artifact.** Mechanics archetype with a guided-puzzle twist. A small three-component tree (`App → UserCard → Avatar`) sits on the page with a render-count badge on each component. The student gets four buttons — "increment App state," "increment Avatar state," "change context value," "mutate the user prop directly" — and must predict, *before* clicking, which components will re-render. After each prediction the widget reveals the badges that incremented. The fourth button is the trap: mutating the prop does nothing visible because no re-render was triggered, naming "props don't trigger" by demonstration.

**Engagement.** The widget itself carries the assessment via the predict-then-reveal loop. Follow-up: a single `MultipleChoice` — "what triggers a re-render of `Avatar`?" with three correct options pre-marked (own state, parent re-render, subscribed context change) and three decoys (prop value change, ref change, DOM event on a sibling).

**Components.**
- New: `RenderTrigger` — a small Astro/React widget that mounts a fixed three-node component tree, exposes a button bar of trigger actions, shows per-component render-count badges, and supports a "predict first" mode where badges stay hidden until the user commits a guess.
- `MultipleChoice` for the follow-up recall.

---

## Concept 3 — Reference identity, inline literals, and what the compiler retires

**Why it's hard.** "The user object is the same — it has the same `name` and `email`." But `{ name, email }` is a *new* object every render under `Object.is`. Students need to feel the difference between *structural equality* (what they assume) and *reference equality* (what React uses), and then learn that the React Compiler retires the memoization gymnastics this rule used to demand.

**Ideal teaching artifact.** Mechanics archetype with a wrong-by-default sandbox. The student sees a parent component with a `<Child>` wrapped in `React.memo`. The parent passes three props: a string, a number, and an inline object literal. A render-count badge on the child climbs every time the parent re-renders, even though "nothing visible changed." The student is asked to fix it. Three checkpoints — extract the object to a `useMemo`, then to a constant outside the component, then *delete the manual memo and turn on the compiler badge* and watch the count freeze on its own. The arc lands the rule and the 2026 retirement of the workaround in one motion.

**Engagement.** A `Buckets` sort right after — items: `42`, `"hello"`, `{ id: 1 }`, `[1, 2, 3]`, `() => save()`, `user` (reused reference), `Math.PI` — into "stable across renders" vs "new every render."

**Components.**
- `ReactCoding` in target-match mode for the three-step fix sandbox, with the compiler-on toggle exposed as a runtime switch (or simulated with a pre-baked frame).
- `Buckets` for the identity sort.

**Project link.** 4.12's `FeatureCard` and `ThemeToggle` rely on the compiler doing this work silently — the lesson is what lets students *trust* writing the natural code instead of pre-emptively memoizing.

---

## Concept 4 — Reconciliation by type and position

**Why it's hard.** Reconciliation is invisible. Students see "the DOM updated" and don't think about *which previous instance corresponds to which new one*. They especially don't see that conditional renders at the same position preserve state, and switching types nukes it. This is the substrate concept 5 (`key`) and concept 10 (`key`-as-reset) both stand on.

**Ideal teaching artifact.** A Concept-archetype scrubbable sequence. The student steps through three forks of the same starting tree: (a) same type at the position with different attributes — instance reused, state preserved, attribute updated; (b) different type at the position — old subtree torn down, new one mounted, state lost; (c) same type, different `key` — explicit identity swap, state lost. Each step shows the previous tree, the new tree, and the diff edges between them, with a "state cell" on each node so the student watches state survive or evaporate edge by edge.

**Engagement.** A `Sequence` exercise: given a parent that conditionally renders `<EditView>` vs `<ReadView>` at the same position, drag the four events into order — "user types in input," "toggle flips," "old instance unmounts," "new instance mounts with fresh state." Plus a `MultipleChoice` on the same prompt with a `{cond ? <Form a /> : <Form b />}` variant — does state survive? (yes — same type, same position).

**Components.**
- `DiagramSequence` wrapping three SVG frames per fork (previous tree, new tree, diff edges with state-cell annotations).
- `Sequence` for the order recall, `MultipleChoice` for the state-survives variant.

---

## Concept 5 — `key` as identity, and the index-as-key bug

**Why it's hard.** The bug is famous and the explanation is famous, but most students "know" the rule without ever having seen the failure mode bite. They need to *cause* the bug, then *see* the fix, in the same widget — the clicked-checkbox-jumps-rows symptom is what makes the rule stick.

**Ideal teaching artifact.** A Pattern-archetype controllable explorable. Two side-by-side `TodoList` widgets render the same five items, each `<li>` an `<input>` plus a `<Checkbox>`. The left list uses `key={index}`, the right uses `key={item.id}`. A "sort" button reorders both. The student types into a couple of inputs and ticks some checkboxes first, then sorts. On the left, typed values and checkmarks stay attached to *positions* and visibly drift to the wrong rows; on the right they ride the items. A live key-readout under each `<li>` shows React's matching decision. Toggle: try `key={Math.random()}` and watch every input clear on every re-render.

**Engagement.** A `PredictOutput` round — given a snippet that uses index keys on a filterable list, predict the typed-value-of-row-3 after a filter is applied. Then a `Buckets` sort: "stable ID," "array index," "`Math.random()`," "content hash for static list," "`useId()` for one element" into "good key default," "acceptable for static lists only," "always wrong."

**Components.**
- New: `KeyedListExplorable` — a two-pane keyed-list widget with shared item data, toggleable key strategy per pane, a sort/filter button bar, and a per-row key readout. Reusable in 4.7.5 for `key`-as-reset and in 4.11 for shadcn list components, and again in Unit 11's URL-state list chapter.
- `PredictOutput` for the typed-value-after-filter drill.
- `Buckets` for the key-strategy sort.

---

## Concept 6 — The purity contract React's optimizations rely on

**Why it's hard.** "Pure function" is a phrase students recognize from FP but don't translate to "no `Date.now()` in render, no `localStorage.setItem` in render, no `props.items.push` in render." More importantly, they don't see *why* React needs it — that Strict Mode double-invokes, the compiler memoizes, and concurrent rendering interrupts, and all three break on impure components. Purity has to feel like a *contract with consequences*, not a stylistic preference.

**Ideal teaching artifact.** Two beats. First, a Concept artefact: a side-by-side simulator showing the same `<Counter>` component rendered twice — once "as written" and once "called twice by Strict Mode in dev." When the body is pure, both panels match. When the student edits the body to push to a module-level `log` array, increment a global counter, or read `Math.random()` for an inline ID, the two panels desync — counts double, IDs differ, logs accumulate. The student *causes* the bug and watches React's "I called you twice and got different answers" symptom appear. Second, a small DevTools-replica card that shows the React Compiler badge state for the current component — green when the body is pure, gray with a one-line skip reason when an impurity is detected by a simple linter pass. The student edits, watches the badge flip.

**Engagement.** A `Tokens` exercise on a single component body — click every line that violates purity. Targets: `Date.now()` in JSX, `props.items.push(x)`, `globalCounter++`, `document.title = '...'`. Decoys: a local `const items = []; items.push(x)` (fine), a `console.log` (fine), a `useState` call (fine).

**Components.**
- New: `PurityProbe` — a two-panel "render twice, compare output" widget around a small editable function body, with a static checker that lights the green/gray compiler-badge replica on the side. Mirrors what the student will see in real DevTools in 4.10.2, so it forward-links hard.
- `Tokens` for the impurity hunt.

---

## Concept 7 — State is a snapshot, not a live value

**Why it's hard.** This is the most-asked React interview question because it's the deepest break from the mental model. Inside one render, `count` is *just a number that the closure captured*. Calling `setCount(...)` schedules the next render — it doesn't reach back into this one and change `count`. The canonical `setCount(count + 1)` ×3 bug is the bug every working React dev has shipped at least once.

**Ideal teaching artifact.** A misconception-first ambush. The lesson opens with a `PredictOutput`: "what does `count` show after one click?" given a handler that calls `setCount(count + 1)` three times starting from 0. Every junior says 3. The widget runs it and shows 1. Then — and only then — the artifact: an animated frame-by-frame walkthrough of one render, with `count = 0` highlighted inside the function body, each of the three `setCount(0 + 1)` calls landing in a "scheduled updates" queue alongside it, and the next render arriving with `count = 1` because all three scheduled the same value. The student sees the snapshot freeze across the three calls.

**Engagement.** The opening `PredictOutput` *is* the assessment hook for the misconception. The artifact then resolves it. Follow-up: a `MultipleChoice` — "the handler calls `setCount(count + 1)` then logs `count` on the next line — what does the log show?" with the correct answer being the *old* count, because the setter is queued.

**Components.**
- `PredictOutput` as the lesson opener.
- New: `RenderQueue` — a small animated diagram of one render frame showing closed-over state on the left, a "scheduled updates" queue in the middle, and the next render's state on the right. Reusable for concept 8 (updater form) and concept 9 (batching) — same widget, different scenarios.
- `MultipleChoice` for the read-after-set follow-up.

---

## Concept 8 — The updater form for sequential and stale-closure cases

**Why it's hard.** Students learn `setCount(c => c + 1)` as "the fix" without understanding *why* it fixes anything. The mechanism — React calls each updater with the *queued* value, not the captured snapshot — makes it predictable for sequential updates *and* for async callbacks that fire after the capturing render is gone. Both cases need the same rule, taught together.

**Ideal teaching artifact.** Mechanics archetype reusing the `RenderQueue` widget. The student now sees the same three `setCount` calls, but the updater form turns each entry in the scheduled-updates queue from `1` to a function. The frame advances and React applies each function to the previous queue value: `0 → 1 → 2 → 3`. Then a second scenario flips on — a `setTimeout` fires 1s after the render — and the student watches the direct-form version capture the stale snapshot and the updater-form version read the live queued value. One widget, two scenarios, one rule.

**Engagement.** A `ReactCoding` exercise with a small counter and a "+3" button. The starter uses `setCount(count + 1)` three times and tests fail (result is 1, expected 3). The student switches to the updater form to pass.

**Components.**
- Reuse `RenderQueue` from concept 7 with the second-scenario toggle and the function-vs-value queue entries.
- `ReactCoding` (tests mode) for the +3 fix.

---

## Concept 9 — Automatic batching and the immutable-update reflex

**Why it's hard.** Two rules live together here: (1) React 19 batches every setter call in a tick into one re-render, so `setA(); setB(); setC()` produces *one* render not three; (2) state updates that look like "mutate the object then set it" silently bail out because `Object.is(user, user)` is `true`. The connection is `Object.is`: it's the equality rule for the bail-out *and* the rule for inline-literal churn (concept 3). Naming them together cements the rule.

**Ideal teaching artifact.** A Pattern artefact with three short before/after comparisons in a tabbed panel. Tab one: three setters in a handler, the render-count badge increments by 1 not 3 — batching, named. Tab two: `user.name = 'Alice'; setUser(user)` — render-count stays put, the typed-input doesn't update, and the bail-out message is shown explicitly. Tab three: `setUser({ ...user, name: 'Alice' })` — new reference, render fires, input updates. Each tab is a self-contained 6–8 line snippet with a live render-count readout.

**Engagement.** A `CodeReview` exercise — a 12-line component with two bugs (one direct mutation of a state array, one assumption that two setters cause two renders). The student leaves inline comments on the two offending lines.

**Components.**
- `CodeVariants` to present the three tabs of the batching/bail-out/spread pattern with live render-count readouts in each.
- `CodeReview` for the bug-hunt.

---

## Concept 10 — `key`-as-reset: discarding state on identity change

**Why it's hard.** Students who learned concept 4 know `key` change → remount. They still write `useEffect` chains to clear form fields when the selected record changes. The mental jump is from "key is for lists" to "key is the declarative reset primitive for identity-bound local state." The canonical reproduction is the form-bound-to-a-record bug — a junior fix is brittle effect plumbing; the senior fix is one line.

**Ideal teaching artifact.** A wrong-by-default sandbox. The student opens a master-detail view: a sidebar of three users, a detail panel with a `<UserEditForm user={selectedUser} />`. The student clicks Alice, types into the `name` field, then clicks Bob — and sees Alice's typed-but-unsaved edits sitting on top of Bob's record. The fix challenge: make the form reset on user switch. The widget offers three buttons: "clear fields in a `useEffect` watching `user.id`" (works but verbose, and breaks if a new field is added without updating the effect), "lift state to the parent" (works but rewrites the component), "add `key={user.id}`" (one line, fresh instance per identity). Each option is wired and the student tries all three, then picks one.

**Engagement.** The sandbox carries the choice but doesn't lock in recall. Follow-up: a `MultipleChoice` decision drill — "which reset strategy fits?" — across four scenarios (form bound to a record, toast that should re-animate on each new message, a `Reset` button that should clear without unmounting the parent, a scroll position the user expects to keep when switching tabs). Three are `key` reset wins, one is a "don't reset, the state should persist" trap.

**Components.**
- New: `MasterDetailExplorable` — a master-detail layout with switchable reset strategies wired to the same `UserEditForm`, with a verbose-effect option, a lift-state option, and a `key={id}` option. Forward-links to Chapter 7 forms and 4.12.5's mobile-nav drawer.
- `MultipleChoice` for the strategy-fit drill.

**Project link.** 4.12.5's `MobileNav` resets internal state on route change via this exact idiom; Chapter 7's record forms reuse it.

---

## Concept 11 — Synthetic events as the React layer over the DOM event model

**Why it's hard.** Students saw `addEventListener`, bubbling, and `e.stopPropagation()` in Chapter 3.5 and now see `onClick`, `onChange`, and `onSubmit` and assume they're literally the same thing wrapped in JSX. The differences that actually bite — delegation at the *React root* not `document` (since React 17), `onChange` firing on every keystroke unlike native `change`, and the gone-but-still-cited event-pooling history — need explicit naming so students don't carry stale assumptions into production.

**Ideal teaching artifact.** A Concept artefact: a side-by-side diagram of a native event flow vs. a React event flow. Both start at the deepest target; the native side bubbles up through DOM ancestors with `document`'s listener at the top. The React side bubbles through DOM ancestors *plus* synthetic propagation through the React tree, with the single delegated listener attached to the `createRoot` container (not `document`). The student toggles "native `addEventListener` on `<body>`" on and off and watches the order indicator: native-on-body fires *before* React's delegated handler (because the React root is a descendant of body), but native-on-an-ancestor-outside-the-root fires *after*. The ordering rule lands by manipulation, not by paragraph.

**Engagement.** A `Sequence` drill — four handlers (`native addEventListener on document`, `React onClickCapture on root`, `React onClick on a leaf`, `React onClick on a wrapper`) and the student drags them into firing order for a click on the leaf.

**Components.**
- New: `EventFlow` — a two-pane DOM-tree-vs-React-tree diagram with a clickable leaf, toggleable handler placement (native at various levels, React at various levels), and a numbered firing-order overlay. Forward-links to Chapter 7 (form submission) and Unit 16 (Zustand subscriptions touch this).
- `Sequence` for the firing-order drill.

---

## Concept 12 — `currentTarget` vs `target` and typed event handlers

**Why it's hard.** Both feel like the same thing to a junior. `e.target.value` "works" in JS — and then TypeScript needs a cast and the cast hides the bug where the deepest clicked element isn't the input. `e.currentTarget` is typed against the handler's element and reads cleanly. The senior reflex is `currentTarget` by default; the lesson has to land it as a *reflex*, not as a "you could also use."

**Ideal teaching artifact.** Mechanics archetype with a typed `TypeCoding` exercise. The student sees a `<form>` with a button inside, and an `onClick` handler on the form. The handler has two destructured options shown side-by-side: `const value = e.target.value` (red-squiggled — `Property 'value' does not exist on type 'EventTarget'`) and `const value = e.currentTarget.elements.namedItem('email')` (clean). Then a second scenario: `<input onChange={...}>` where both `target` and `currentTarget` happen to be the input — both work, but `currentTarget` is typed without a cast. The student types both into the exercise and the `^?` Twoslash query reveals the inferred type at each call site.

**Engagement.** A `Dropdowns` fill-in on four short snippets — for each, pick `target` or `currentTarget` given the goal (read the input's value from the input's own handler / from a parent form's submit handler / read the clicked button when the handler is on the form / read which `<li>` was clicked when the handler is on the `<ul>`).

**Components.**
- `TypeCoding` for the typed reveal — leverages Twoslash `^?` to show the inferred element type at each call site.
- `Dropdowns` for the per-scenario picker.

---

## Component proposals

- **`RenderTrigger`** — fixed three-component tree with render-count badges and a trigger button bar (own state, parent state, context, prop mutation), supports a "predict-first" mode.
  - Uses in this chapter: concept 2.
  - Forward-links: 4.9.5 (`useContext` re-render storm) reuses the same render-count-on-a-tree shape; 4.10.2 (compiler badge in DevTools) layers a badge readout onto these same trees.
  - Leanest v1: hard-code the three-node tree and the four trigger buttons; skip predict-first mode for v1 — just show badges climbing on each click. Predict-first is the recall step but `MultipleChoice` carries that for v1.

- **`KeyedListExplorable`** — two-pane keyed-list widget with shared data, toggleable key strategy per pane, sort/filter button bar, per-row key readout.
  - Uses in this chapter: concept 5.
  - Forward-links: 4.7.5 (`key`-as-reset variant of the same widget — see `MasterDetailExplorable`), 4.11 (shadcn list components and accessibility), Unit 11 (URL-state lists with stable IDs).
  - Leanest v1: a single-pane widget with a key-strategy toggle at the top instead of two side-by-side panes — still teaches the bug because the student toggles strategy and re-sorts. Side-by-side is more visceral but not load-bearing for v1.

- **`PurityProbe`** — two-panel "render twice, compare output" widget around a small editable function body, with a static checker that lights a green/gray compiler-badge replica.
  - Uses in this chapter: concept 6.
  - Forward-links: 4.9.1 (Strict Mode is *exactly* this widget made real), 4.10.2 (the DevTools compiler badge — this widget is the lo-fi simulator). High forward-link weight.
  - Leanest v1: skip the live editing — ship two or three pre-baked function bodies the student steps through, each toggling between "as-written" and "called twice." The badge is a static label per body, not a real check. Live editing is the second iteration.

- **`RenderQueue`** — animated diagram of one render frame: closed-over state on the left, a scheduled-updates queue in the middle, next render's state on the right; supports value-entries and function-entries in the queue; supports a deferred-callback scenario.
  - Uses in this chapter: concepts 7 and 8 (and a sub-scene cameo for concept 9's batching).
  - Forward-links: 4.8.5 (`useReducer` — the queue *is* a reducer in miniature), 4.9.6 (`useTransition` — the same queue with priority lanes).
  - Leanest v1: a `DiagramSequence` of pre-rendered frames showing the queue at three or four stops, no live state — the animation is canned but the model is there. Live-updating queue is iteration two.

- **`MasterDetailExplorable`** — master-detail layout with three switchable reset strategies (verbose effect, lifted state, `key={id}`) wired to the same `UserEditForm`.
  - Uses in this chapter: concept 10.
  - Forward-links: 4.8.2 (mirror-prop-into-state anti-pattern — same shape), 4.12.5 (mobile-nav drawer reset on route change), Chapter 7 (record-bound forms).
  - Leanest v1: skip the "lift state" strategy in v1 — show only the verbose-effect option and the `key` option. The two-way comparison still lands the lesson; the three-way is the polish iteration.

- **`EventFlow`** — two-pane DOM-tree-vs-React-tree diagram with a clickable leaf, toggleable native and React handler placement, numbered firing-order overlay.
  - Uses in this chapter: concept 11.
  - Forward-links: Chapter 7 (form submission ordering with native + React handlers), Unit 16 (Zustand subscriptions, when relevant).
  - Leanest v1: hand-authored SVG with three pre-baked scenarios as `DiagramSequence` frames (native-on-body, native-on-document, both off). Drop the toggles for v1 — the three frames cover the load-bearing cases. Interactive toggles are iteration two.

## Build priority

The top three to build first, ranked by reuse + forward-link weight:

1. **`PurityProbe`** — single chapter use but exceptionally strong forward-links (4.9.1 Strict Mode and 4.10.2 compiler badge both *are* this widget). The same artefact teaches three lessons across three chapters.
2. **`RenderQueue`** — reused inside this chapter for concepts 7, 8, and a cameo in 9, plus forward-links into 4.8.5 and 4.9.6. The highest in-chapter reuse.
3. **`KeyedListExplorable`** — load-bearing for the most-cited React bug, with credible forward-links into 4.11 and Unit 11. The leanest-v1 (single pane + toggle) is cheap and still teaches.

`RenderTrigger`, `MasterDetailExplorable`, and `EventFlow` are worth building but rank below the top three — each is single-concept in this chapter and their forward-links are real but lighter.

## Open pedagogical questions

- Concept 6's `PurityProbe` compiler-badge replica overlaps with what 4.10.2 will eventually teach with real DevTools. Confirm whether 4.7.3 should ship the replica or just *describe* the badge and defer the visual to 4.10.2 — the latter is leaner but loses the audit-now reflex this chapter wants to install.
- Concept 9 bundles batching and immutable updates because `Object.is` ties them; if the lesson runs long this could split into two concepts at the cost of one extra section heading. Worth flagging during draft review.
