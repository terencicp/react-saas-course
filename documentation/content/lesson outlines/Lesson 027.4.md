# Lesson 027.4 — State is a snapshot

## Lesson framing

The senior question this lesson answers: why does calling `setCount(count + 1)` three times in a row only increment by 1? The answer is that each render closes over its own state values as a captured snapshot — calling a setter schedules a new render, it does not mutate the current render's bindings. Once the student internalizes "state is a snapshot," three things follow cleanly: (1) the updater function form for sequential updates, (2) React 19's automatic batching as the mechanism behind the snapshot rule, and (3) the immutable-update reflex (spread, not mutate) because `Object.is` bails out on same-reference setters.

Target student: junior developer who has been writing useState since Lesson 027.3's primer, has hit (or will hit) the canonical "increment by 1, not 3" bug, and currently thinks of `count` as a live variable that updates when the setter is called. The mental model fix is the lesson's whole job.

Pedagogical approach:
- Lead with the bug. Show the broken handler, ask the student to predict, reveal the surprise. The misconception only dissolves when it's been named first.
- Build the snapshot model visually. State is a frozen value per render, not a live reference. A render-by-render timeline diagram makes this tangible better than prose.
- Introduce the updater form as the *fix to a problem the student just felt*, not as an alternate API to memorize.
- Name batching as the *mechanism* behind the snapshot rule, not as a separate topic. Batching is why React can freeze state per render — because it knows when "the work" is done.
- Connect to purity (027.3): the updater function must itself be pure; React may call it twice in Strict Mode.
- Avoid teaching the full useState API surface — that's 028. This lesson is the mental model, not the API tour.
- Use real production stakes: stale closures in async callbacks are a leading source of React bugs in real codebases. Frame the updater form as the senior reflex that prevents them.

Mental model the student should leave with:
- Each render is a function call producing a snapshot of state and props.
- Setters schedule re-renders; they don't mutate the current render's values.
- When the next state depends on the previous (or is read in an async callback), use the updater form.
- Mutation in place + setter does nothing — always create a new reference.

What the student should be able to do at the end:
- Predict the result of multiple-setter sequences correctly.
- Choose between `setX(value)` and `setX(prev => next)` confidently.
- Fix a stale-closure bug in a setTimeout/promise handler.
- Apply spread-based immutable updates for object and array state.

## Lesson sections

### Introduction (no header)

Brief framing. Connect to 027.1 (UI = render(state)) and 027.3 (purity). State the lesson goal: build the snapshot mental model and the updater-form reflex. Tease the canonical bug: "Three setters in a row, count starts at 0, what's the final value?" Promise an answer and the fix.

### The bug that names the rule

Open with a concrete, runnable example. A counter component with one button whose handler calls `setCount(count + 1)` three times. Show the code, ask the student to predict the result before revealing.

Code component: use `PredictOutput` exercise here. The student picks between "3", "1", or "0" before the rest of the lesson continues. This makes the misconception explicit before correcting it.

After the reveal: explain *why* the final count is 1, not 3 — but lightly. The full explanation is the next section. This section just plants the surprise.

### State is a snapshot, not a live value

The core mental-model section. Use prose + a diagram.

Concepts:
- Each render is a function call. React calls your component, the function returns JSX, React commits.
- Inside that function call, `count` is a *value* — a captured number, not a live binding. The variable doesn't get re-read mid-render.
- Calling `setCount(...)` schedules a *new* render with a new state value. It does not mutate `count` in the current render.
- Render N's `count` is Render N's `count` forever. Render N+1 has its own `count`.

Diagram: a `DiagramSequence` walking through three render frames side by side. Each frame shows the snapshot of `count` for that render (a labeled box), the handler code with `count` literally substituted with the snapshot value (e.g., "setCount(0 + 1)" in Render 0), and an arrow to the next render. This visualizes the "value-substitution" reading of state — students should mentally substitute the snapshot wherever they see `count` in a handler.

Pedagogical goal of the diagram: make abstract "snapshot" concrete by showing what the code *effectively* looks like with the snapshot value substituted. After this, the bug from the previous section becomes obvious — all three calls in the same handler see the same snapshot.

Code component: `AnnotatedCode` walking through the handler with the snapshot value substituted at each setter call, highlighting what React actually queues.

### The updater form fixes sequential updates

Introduce `setCount(c => c + 1)` as the fix.

Concepts:
- The updater form passes a *function* to the setter. React queues the function and calls it with the latest queued value, returning the next.
- Multiple updater calls stack: 0 → 1 → 2 → 3.
- Rule of thumb: when the next state depends on the previous, use the updater form. When it doesn't (`setCount(0)`, `setUser(newUser)`), the direct form is fine and arguably clearer.
- The function passed to the updater must be pure (link back to 027.3) — Strict Mode may call it twice in development.

Code component: `CodeVariants` with two tabs — "Broken (direct form)" and "Fixed (updater form)" — showing the same handler. Each tab has prose explaining what React queues and the final result.

Diagram: a small queue diagram showing three updater functions stacked, each receiving the output of the previous one. Use `ArrowDiagram` or hand-coded HTML + CSS — a horizontal strip of three boxes labeled "0 → 1", "1 → 2", "2 → 3" with the input value flowing across. Caption: "React calls each updater with the queued value, not the snapshot."

Senior reflex callout: an `Aside` (`tip`) with the rule "If your next state reads the previous state, use the updater form. If it doesn't, use the direct form."

### Automatic batching — why the snapshot rule even works

Name React 19's automatic batching as the mechanism behind the snapshot rule.

Concepts:
- React batches multiple setter calls into a single re-render. Three setters fire, one re-render runs.
- This was the breaking change in React 18; in React 19 it's the unconditional default for handlers, async callbacks, `setTimeout`, promise resolutions — everywhere.
- Why this matters for snapshots: batching is *why* React can freeze state per render. Setters add to a queue; the queue gets drained when the work boundary closes; one new render runs with the final value.
- The state value isn't "live" because React is collecting setter calls before committing them.

Diagram: a timeline showing one handler invocation, three setters in a row, one batched re-render at the end. Use HTML + CSS or a simple SVG. Pedagogical goal: visualize that "between the handler firing and the next render," there's a queue, not three separate renders.

Senior note: pre-React-18 code that worked in handlers but broke in `setTimeout` no longer needs the `unstable_batchedUpdates` escape hatch. Recognition only — the student writing new code in 2026 doesn't need to know the workaround existed.

### `flushSync` — the rare opt-out

Name `flushSync` once, briefly. Don't dwell.

Concepts:
- `flushSync(() => setCount(...))` forces React to commit a re-render before the next line runs.
- Use cases: measurement (read DOM after a state change), third-party integrations that need synchronous updates.
- The senior reach: rare. Default is batching; reach for `flushSync` only when measurement or a non-React API forces it.

Code: a short `Code` block showing the API shape and a one-line use case. No exercise needed.

`Aside` (`caution`) callout: `flushSync` breaks batching and forces an extra render — measure twice before reaching for it.

### Stale closures in async callbacks

The senior payoff: most stale-state bugs in real codebases come from async callbacks that captured a snapshot from an older render.

Concepts:
- A `setTimeout(() => setCount(count + 1), 1000)` captures `count` from the render where the timeout was scheduled. If the component re-renders before the timeout fires, the timeout still sees the old snapshot.
- The fix: `setTimeout(() => setCount(c => c + 1), 1000)` — the updater form reads from the queued value, not the captured snapshot.
- Rule: any setter that runs *after* render (timeouts, promise `.then`, event listeners attached in effects) should reach for the updater form by default, unless the snapshot is deliberately what you want.

Code component: `CodeVariants` — a debounced increment button. Tab 1: the broken version with `setCount(count + 1)` inside a setTimeout, demonstrating the stale-closure bug under rapid clicks. Tab 2: the fixed version with the updater form. Add prose framing the production stakes — this exact pattern hits real apps with debounced search, optimistic updates, and animation callbacks.

Exercise: `ReactCoding` (target-match or tests mode). The student is given a broken async counter — a button that schedules a `setCount(count + 1)` via `setTimeout` — and is asked to fix the stale-closure bug. Grading: the counter must increment correctly when the user clicks 5 times in rapid succession. Goal: the student practices the diagnosis (stale closure) and the reflex (updater form) on a realistic broken example.

### Object and array state — the immutable-update reflex

Snapshot model extends to objects and arrays: mutation in place doesn't trigger a re-render because the reference didn't change.

Concepts:
- React's setter bails out when the new value is `Object.is`-equal to the previous. Mutating an object in place and calling `setUser(user)` bails out — same reference.
- Spread is the reflex for objects: `setUser({ ...user, name: 'Alice' })`. For arrays: `setItems([...items, newItem])`, `setItems(items.filter(...))`, `setItems(items.map(...))`.
- Nested updates need nested spreads. The deeper the nesting, the uglier the spread. Recognition mention of Immer as the library reach when nesting gets hairy (don't teach it — recognition only).
- The updater form composes with spreads cleanly: `setUser(u => ({ ...u, name: 'Alice' }))`.

Code: `Code` block showing the mutation-then-set bug, then the spread fix. Then a short example of an array update (add an item) using the updater form.

Exercise: `PredictOutput` — show a small handler that mutates an object in place and then calls the setter, ask the student to predict whether the component re-renders. The answer reinforces "no — same reference, `Object.is` bails out."

### When you want to "read the new state" — derived state and effects

Address the common follow-up question: "How do I do X *after* the state updates?"

Concepts:
- The setter doesn't return the new value. `const next = setCount(...)` doesn't exist.
- `console.log(count)` immediately after `setCount(...)` logs the old `count`. This is the snapshot rule again.
- If you want to *react* to a state change, the two homes are: (1) derive the value in render (compute it directly from state), or (2) `useEffect` (029.2 owns the surface).
- The senior reach is *derived state* — if you find yourself wanting to "read the new value after setting," you usually wanted to compute it directly in render. Foreshadow 028.3.

Short prose section. No code block needed unless it sharpens the point — a one-line example of `console.log(count)` after `setCount(count + 1)` showing the stale log is enough.

`Aside` (`note`): foreshadow 028.3 (derived state) and 029.2 (useEffect) as the proper homes for "code that needs to run after state changes."

### Recap — the rules in one breath

A short closing section, no header escalation needed (use a `Aside` of type `tip` or a small bullet list).

Bullets:
- State is a snapshot — each render captures its own values.
- Setters schedule re-renders, they don't mutate the current render's values.
- Use the updater form when the next state depends on the previous, or when the setter runs after the current render (async callbacks, timeouts).
- Always create a new reference for object/array state — mutation in place bails out.
- React batches setters; `flushSync` is the rare opt-out.

### Check your understanding

A final exercise to consolidate. Pick `MultipleChoice` or `TrueFalse` with 3-4 statements:
- "Calling `setCount(count + 1)` three times in a single handler increments count by 3." (False)
- "The updater form `setCount(c => c + 1)` reads from the queued value, not the render's snapshot." (True)
- "Mutating `user.name` and then calling `setUser(user)` triggers a re-render." (False)
- "React 19 batches state updates from `setTimeout` and promise callbacks by default." (True)

Goal: surface remaining misconceptions before the student moves on.

### External resources

Optional `ExternalResource` cards at the bottom:
- React docs: "State as a snapshot" page.
- React docs: "Queueing a series of state updates" page.

## Scope

Prerequisites the student already has (do not re-teach in depth):
- `useState` basics — declared in 027.3's minimal primer (the `const [value, setValue] = useState(initial)` shape, reading current value, calling the setter to schedule a re-render).
- Render as a function call, the three triggers, `Object.is` on props — 027.1.
- Reconciliation by element type and `key`, the index-as-key bug — 027.2.
- Component purity, the no-mutation rule for props/state, the React Compiler dependency — 027.3.

Not in scope (reserved for later lessons):
- Full `useState` API surface, lazy initial state with `useState(() => ...)`, and the function-initializer trap mechanics — Lesson 028.1 and 028.2.
- Derived state ("you might not need a state variable") — Lesson 028.3.
- Lifting state up to the parent — Lesson 028.4.
- `useReducer` and multi-transition state — Lesson 028.5 (named once here as the alternative for gnarly state logic).
- `useEffect` and the commit phase — Lesson 029.2 (named once as the home for "code that runs after state changes").
- Strict Mode's double-invocation contract — Lesson 029.1 (referenced briefly for "updater functions may be called twice").
- `useTransition`, `useDeferredValue`, and concurrent rendering priorities — Lesson 029.5.
- The `key`-as-reset tactic — Lesson 027.5.
- Synthetic events and event-handler typing — Lesson 027.6.
- Immer and other immutable-update libraries — recognition only; the course teaches direct spread.
- Server state, data fetching, optimistic updates — Chapter 036.
- Form state and controlled vs. uncontrolled inputs — Unit 7.
- State management libraries (Zustand, Jotai) — Unit 16.

Concepts to redefine concisely as prerequisites:
- "Snapshot" — coined in this lesson; introduce the term explicitly.
- `Object.is` semantics — referenced from 027.1; a one-line reminder ("primitives by value, objects by reference") is enough when introducing the immutable-update reflex.
- Purity of the updater function — one-line callback to 027.3 ("the updater must be pure; Strict Mode may call it twice").
