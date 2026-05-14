# Chapter 4.7 — The render model

## Chapter framing

Chapter 4.6 taught the component as a typed function — props in, JSX out. Chapter 4.7 is the chapter where the student stops thinking of components as templates and starts thinking of them as *re-running functions* whose return value React diffs against the last one. The senior framing is that React's render model is small and learnable: render is triggered by state change (or a parent's re-render), each render produces a snapshot of props and state that callbacks and effects close over, React reconciles by element type and `key`, and components must stay pure so the React Compiler (Chapter 4.10) can memoize them safely. Every footgun in this chapter — the stale-closure bug, the form-stuck-on-the-previous-record bug, the list-with-index-as-key bug, the impure-render-mutating-props bug — falls out of misunderstanding one of those four pieces.

Several threads run through every lesson. **The render model is the rule the React Compiler depends on** — purity is named here and cashed in at 4.10.2; the chapter teaches the contract that makes auto-memoization safe. **Reference identity is the prop-change rule** — React's re-render decision is `Object.is` on each prop, so inline objects, arrays, and callbacks always look "new"; the lesson names this and trusts the compiler to retire most manual `useMemo`/`useCallback` (4.10.3). **State is a snapshot, not a live value** — every render closes over its own props and state; the updater-function form is the senior reflex for sequential updates. **Keys are reconciliation identity, not list cosmetics** — wrong keys cause the canonical "two `<input>`s swap their values" bug; right keys are the fix for stateful list reorders and the surgical tool for state resets. **Synthetic events are the React layer over the DOM events from 3.5** — same `e.stopPropagation()`, same bubbling, but delegation runs at the React root and the event object is pooled-then-released differently in React 17+. The chapter ships six teaching lessons plus the quiz, in dependency order: the render model and triggers (4.7.1), reconciliation and keys (4.7.2), purity as the compiler contract (4.7.3), state-as-snapshot (4.7.4), the `key`-as-reset tactic (4.7.5), and synthetic events (4.7.6). Forward references land in 4.8 (state hooks at depth), 4.9 (effects and the Strict Mode contract), 4.10 (the React Compiler that depends on this chapter's rules), and 4.11 (shadcn components that use `key` resets and synthetic event handlers idiomatically).

---

## Lesson 4.7.1 — Render triggers and reference identity

Topics to cover:

- **The senior question.** A `<UserCard>` with a `user` prop re-renders on every parent state change even though the user object is "the same" — because the parent passes `{ name, email }` inline and that's a new object identity every render. A `<Button onClick={() => save()}>` looks stable but the callback is a fresh function each render. The lesson installs the mental model: React re-renders by *running the component function again*, and a prop change means a new reference under `Object.is`, not "a structurally different value." Once that lands, the React Compiler's job in 4.10.2 makes sense.
- **What rendering is, in 2026 terms.** Rendering is React calling your component function. The function returns JSX (a tree of React elements — plain objects describing what to render). React diffs that tree against the previous one and applies the minimum DOM changes. "Render" is the function call; "commit" is the DOM update. The two phases matter when effects enter in 4.9.1.
- **What triggers a render.** Three triggers: (1) the component's own state updates via a `useState`/`useReducer` setter; (2) a parent component re-renders; (3) a subscribed context value changes. There is no fourth — prop changes don't trigger a render directly, the *parent* re-rendering and passing new props does. The lesson names this explicitly because the misconception ("my prop changed, so the child re-rendered") confuses the optimization story.
- **The initial render vs. re-renders.** The initial render mounts the component (creates the DOM); subsequent renders update it. Most of the chapter's bugs only appear on re-renders because the initial render has nothing to compare against.
- **Reference identity and `Object.is`.** When React compares props to decide whether a memoized child can skip a re-render, it walks each prop and compares with `Object.is`. Primitives compare by value (`'hello' === 'hello'`). Objects, arrays, and functions compare by reference — `{} !== {}`. The lesson names this rule as the *only* equality rule in React; deep equality is opt-in via the developer (rare, error-prone).
- **Inline objects, arrays, and callbacks — the identity churn.** `<Child style={{ color: 'red' }} />` creates a new object every render; `<Child items={[...list, 'extra']} />` creates a new array; `<Child onClick={() => save()} />` creates a new function. None of these *change* visually but all of them break shallow-equality memoization. The lesson lands the rule: any prop that's an object/array/function literal in JSX is "new" every render.
- **The React Compiler retires most manual memoization.** Before React 19 + Compiler, the fix was `useMemo` and `useCallback` everywhere. In 2026 the compiler (4.10.2) auto-memoizes object literals, array spreads, and inline callbacks when components are pure (4.7.3). This lesson teaches the *rule*; 4.10 teaches the compiler. The takeaway: don't manually memoize prophylactically — write the natural code, let the compiler handle it, and reach for manual `useMemo`/`useCallback` only when the compiler skipped a component (DevTools badge in 4.10.2).
- **Render is not "expensive" by default.** A senior corrects the junior reflex "but won't that re-render the whole tree?" — yes, and that's usually fine. Rendering a function and diffing a virtual tree is cheap; the DOM commit is the expense, and React already minimizes that. Optimizing renders is a last-resort fix backed by a profiler measurement (DevTools Profiler in 1.3.3), not a default discipline.
- **Mental model — the function-of-state framing.** UI is a function of state: `UI = render(state)`. Same state, same output. Render the same component twice with the same props and state and you get the same JSX tree. This is the framing that makes purity (4.7.3) and reconciliation (4.7.2) coherent, and it's the framing that React docs commit to.
- **The "what re-rendered and why" debugging move.** React DevTools' Profiler shows which components rendered and which props changed. The senior reflex when a perf complaint comes in: profile first, then chase the prop identity that's churning. Cross-reference to 1.3.3 for DevTools install and 4.10.3 for manual memoization decisions.
- **Watch-outs:**
  - "My state didn't change but the component re-rendered" — the parent re-rendered. State changes are not the only trigger.
  - "I called `setState` with the same value but it still re-rendered" — `useState`'s bail-out compares with `Object.is`; setting `setUser(user)` with the same reference bails out, but `setUser({ ...user })` does not.
  - Don't reach for manual `useMemo`/`useCallback` before profiling — the compiler likely handles it, and unnecessary memoization adds dependency-array maintenance for no win.
  - Context value identity matters too — a context provider whose `value={{ user, login }}` is inline re-runs every subscriber every render. The compiler memoizes it; otherwise wrap in `useMemo` (cross-reference 4.9.4).
  - "React batched my updates" is a related but separate topic — covered in 4.7.4 (state as a snapshot).

What this lesson does not cover:

- The React Compiler API and configuration — Lesson 4.10.2.
- Manual `useMemo`, `useCallback`, and `React.memo` — Lesson 4.10.3.
- Reconciliation and the DOM diff algorithm — Lesson 4.7.2.
- State as a snapshot, updater functions, and batching — Lesson 4.7.4.
- Effects and the commit phase — Lesson 4.9.2.
- Server vs. client rendering and the boundary — Chapter 5.2.
- Concurrent rendering, transitions, and Suspense priorities — Chapters 4.9.5 and 5.3.

---

## Lesson 4.7.2 — Reconciliation, keys, and component identity

Topics to cover:

- **The senior question.** A list of `<TodoItem>` components renders fine, but reordering items causes the wrong checkboxes to stay checked — because React used the array index as the implicit key and matched the wrong nodes across renders. The lesson installs reconciliation as the algorithm React uses to decide *which previous component instance corresponds to which new one*, names `key` as the explicit identity signal, and lands the canonical bugs the rule prevents.
- **What reconciliation is.** When React renders, it produces a new tree of elements. Reconciliation is the algorithm that diffs this new tree against the previous one and decides which DOM nodes to keep, which to update, and which to remount. The output of reconciliation is the smallest set of DOM operations to bring the page in line with the new tree.
- **The two heuristics React commits to.** (1) **Elements of different types produce different trees** — `<div>` to `<section>` means tear down the old subtree and build a new one, even if the children are identical. (2) **Elements of the same type are kept and updated in place** — `<div className="a">` to `<div className="b">` updates the attribute, doesn't recreate the node. These heuristics turn an O(n³) tree diff into O(n) and are why React is fast enough to be practical.
- **Component identity by position.** Without `key`, React identifies sibling components by their *position* in the parent. The first `<TodoItem>` in the new render corresponds to the first one in the previous render; the second to the second; and so on. State and refs follow the position — they belong to "the component at position N," not "the component for item with ID X."
- **The `key` prop — explicit identity.** `key` overrides the position-based identity. React uses `key` to match new elements to previous ones across renders. A `key` that doesn't appear in the new render means the component unmounts; a `key` that's new means a fresh mount; a `key` that's in both renders means React reuses the instance (and its state).
- **The "index as key" anti-pattern.** `items.map((item, i) => <Row key={i} ...>)` looks fine but breaks the moment the list reorders, filters, or inserts at any position other than the end. The instance at index 2 now represents a different item but keeps the old state. The canonical reproduction: a list of `<input>` fields with index keys — sort the list and the typed values stay attached to the wrong rows.
- **Stable IDs as keys.** The senior reach is the item's stable ID — `key={item.id}` for database rows, `key={post.slug}` for content. When no ID is available, derive one (a hash of the content for static lists, a `crypto.randomUUID()` assigned once at creation for client-side rows). Index-as-key is acceptable *only* when the list is static and never reorders (a constant menu, a fixed nav).
- **Same component, different `key` → remount.** When a component's `key` changes between renders at the same position, React unmounts the old instance and mounts a new one — state resets, refs reset, effects run their cleanup and then run fresh. This is the mechanism Lesson 4.7.5 cashes in for deliberate state resets.
- **Different types at the same position → remount.** Switching `<EditView>` to `<ReadView>` at the same position tears down the old subtree completely. The senior takeaway: keeping the component type stable across conditional renders preserves state; switching types is a state-reset.
- **The conditional-render-preserves-state subtlety.** `{showEdit ? <Form data={...} /> : <Form data={...} disabled />}` keeps the `<Form>` instance because the type matches at the position; only the props update. Switch to `{showEdit ? <Form /> : <DisplayCard />}` and the form's local state is gone the moment `showEdit` flips.
- **Reconciliation across `<Fragment>` and conditional rendering.** Fragments are transparent — children are reconciled as if they were direct siblings of the parent. `{condition && <A />}` followed by `<B />` means when `condition` flips, `<B>`'s position shifts and it might or might not match. The senior reach for stable identity across conditional siblings: wrap in fragments with consistent structure or assign keys.
- **The React 19 / 19.2 reconciler — what changed and what didn't.** React 19's reconciler is faster (fiber nodes 32% smaller, time-sliced work) but the *rules* are the same — heuristics, position, `key`. The lesson names this so students reading "React 19 reconciler" content don't expect new mental models; what shipped is performance, not semantics.
- **Watch-outs:**
  - `key` must be unique *among siblings*, not globally. `<TodoList>` and `<UserList>` can both have an item with `key="1"` — different parents, different sibling sets.
  - `key` is not passed to the component as a prop. Trying to read `props.key` returns `undefined`; if the component needs the ID, pass it as a separate `id` prop too.
  - `Math.random()` as a key is a state-reset on every render — every key changes, every instance remounts. Common interview answer to "what's wrong with this code."
  - Stable IDs derived from object identity (`key={String(item)}`) break when the same logical item gets a new object reference (e.g., after a refetch).
  - `key` on a `<Fragment>` works (`<Fragment key={id}>` for keyed fragments in lists) but the `<>` shorthand can't take a key — use `<Fragment>` explicitly.
  - Reordering a list with stable keys preserves DOM nodes — React moves them rather than recreating, so animations and focus survive.
  - State lives at the *React-tree* position-plus-key, not at the DOM-tree position. Two `<input>`s with the same key under different parents are different instances.

What this lesson does not cover:

- The `key`-as-state-reset tactic — Lesson 4.7.5 (this lesson teaches the mechanism; 4.7.5 cashes it in as a deliberate move).
- Component purity and the compiler — Lesson 4.7.3.
- State management beyond identity — Chapter 4.8.
- Server-rendered lists and stable keys across SSR — Chapter 5.4 territory.
- The Fiber data structure at depth — out of scope.
- `<Suspense>` boundary reconciliation — Chapter 5.3.
- Concurrent rendering and interruption — recognition only, surfaced in 4.9.5.

---

## Lesson 4.7.3 — Keeping components pure

Topics to cover:

- **The senior question.** A `<Counter>` that increments a module-level variable on every render "works" — until React Strict Mode (4.9.1) double-renders it in development and the count doubles, until the React Compiler (4.10.2) memoizes it and the count stops updating, until two parents render the same component and they share the variable. The lesson installs the purity contract React relies on: render must be a pure function of props and state, and every side effect must move into a handler or an effect. This is the rule the React Compiler depends on to auto-memoize safely.
- **What "pure" means for a React component.** A component is pure if, given the same props and state, it returns the same JSX tree without mutating anything outside its own local scope. No writes to module-level variables, no DOM mutations, no API calls, no timestamp reads, no random number generation during render. The component is a function from inputs to JSX; side effects belong elsewhere.
- **The two rules in one breath.** (1) Don't mutate props or state during render — treat them as readonly. (2) Don't perform side effects during render — no `localStorage.setItem`, no `fetch`, no `console.log` in production code, no `document.title = ...`, no setting a ref's `.current`. The lesson names both and trusts 4.9.2 to teach where side effects actually go.
- **Why React needs this contract.** React reserves the right to (a) call your component function more than once per render in development (Strict Mode), (b) interrupt rendering mid-tree and restart (concurrent rendering), (c) skip rendering when props haven't changed (compiler-memoized children), and (d) render components out of order. None of those are safe unless render is pure. The senior framing: purity is the *price of admission* for React's optimization moves.
- **The React Compiler depends on purity.** The compiler reads your component code, decides what to memoize, and inserts the memoization automatically. When it detects a violation — a mutation, a side effect, a non-deterministic read — it skips that component (DevTools shows no compiler badge). The skipped component still works but re-renders without auto-memoization. The 2026 senior skill: keep components pure so the compiler can do its job, then audit DevTools to confirm no component was skipped silently.
- **Common purity violations and their fixes.** (1) Mutating a prop: `props.items.push(...)` → return a new array. (2) Mutating state during render: `state.count++` → use the setter. (3) Reading mutable globals: `Date.now()` in JSX → pass as a prop or read in an effect. (4) `Math.random()` for a key or ID: replace with `useId` (4.8.7) or a stable derivation. (5) `console.log` in render: fine in development, strip for production. (6) Setting a ref's `.current` during render: move to an event handler or effect.
- **Local mutation is fine.** Mutating a *local* variable created during the same render is pure — `const items = []; items.push(x)` inside the component body is fine because nothing outside this render can see `items`. The constraint is mutations crossing the render boundary.
- **Side effects belong in handlers or effects.** The two correct homes for side effects: event handlers (a function React calls in response to user input, *not* during render) and `useEffect` (a function React calls after commit, in response to render). The lesson names both and trusts 4.8 and 4.9 to teach the surface.
- **The `useState` initializer trap.** `useState(expensiveCompute())` runs `expensiveCompute()` on every render even though only the first call's result is used. The fix is the lazy initializer form: `useState(() => expensiveCompute())`. Foreshadowed here as an example of "doing work during render that shouldn't be there"; the surface lands in 4.8.2.
- **Reading from refs during render is impure.** A ref's `.current` is mutable; reading it during render produces non-deterministic output. Read refs in effects and handlers; if a component needs to *derive* render output from a ref, the value should be in state instead. Recognition-level here; the deeper treatment is in 4.8.6.
- **The compiler badge — your purity audit.** React DevTools shows a badge on compiler-optimized components. A missing badge means the compiler skipped this one — usually due to a purity violation. The senior reach: when adding a new component, glance at DevTools, confirm the badge. When optimizing, check the Profiler for components that re-render and trace whether the compiler skipped them.
- **Watch-outs:**
  - Strict Mode double-renders components in dev to surface impurity (4.9.1). A counter that increments by 2 in dev but 1 in prod is impure.
  - Mutating an object before passing it to `setState` doesn't trigger a re-render — `obj.count++; setState(obj)` bails out because the reference didn't change. Always create new objects/arrays.
  - "Pure" doesn't mean "no state" — `useState` and `useReducer` are fine. The purity is *given* the props and state, the render is deterministic.
  - Logging in render is technically impure but is fine as a debugging move; React's docs explicitly allow `console.log` because it's idempotent.
  - The React Compiler doesn't fail your build on impurity — it silently skips. The audit move is DevTools, not the compiler error log.
  - Returning a different JSX tree on the same inputs (e.g., reading `Math.random()` in render) breaks reconciliation and hydration both — same root cause, two failure modes.
  - Setting `document.title` during render works in development but desyncs under concurrent rendering — move to a `useEffect` or use Next.js's metadata API (4.1.2).

What this lesson does not cover:

- `useEffect` and where side effects actually go — Lesson 4.9.2.
- Strict Mode and the double-render contract — Lesson 4.9.1.
- The React Compiler installation and configuration — Lesson 4.10.2.
- Manual memoization (`useMemo`, `useCallback`, `React.memo`) — Lesson 4.10.3.
- Server Components and the server-rendering purity contract — Chapter 5.2.
- Immer and immutable-update helpers — recognition only; the course teaches direct spread and updater functions.

---

## Lesson 4.7.4 — State as a snapshot and the updater form

Topics to cover:

- **The senior question.** A handler that calls `setCount(count + 1)` three times in a row only increments by 1 — because all three calls read the *same* snapshot of `count` from the current render. The fix is `setCount(c => c + 1)`, the updater form, which reads from the queued value. The lesson installs the "state is a snapshot" mental model, names React 19's automatic batching, and lands the updater function as the senior reflex for sequential state changes.
- **What "snapshot" means.** Each render closes over its own `props` and `state` as captured values. Inside a single render, `count` is a number — it does not "update" mid-render. Calling `setCount(...)` schedules a new render with new state; it does not mutate the current render's `count`. This is the consequence of render being a function of state (4.7.1).
- **The canonical bug.** `function handleClick() { setCount(count + 1); setCount(count + 1); setCount(count + 1); }` increments by 1, not 3, when `count` starts at 0. All three reads see `count === 0`; all three schedule `setCount(1)`; React batches them; the next render has `count === 1`. The lesson reproduces the bug, then shows the fix.
- **The updater function form.** `setCount(c => c + 1)` passes a function that receives the *queued* value and returns the next. React calls each updater in order. Three calls now produce 0→1→2→3. The senior rule: when the next state depends on the previous, use the updater form. When it doesn't (`setCount(0)`, `setUser(newUser)`), the direct form is fine and arguably clearer.
- **Automatic batching in React 19.** React batches multiple `setState` calls into a single re-render — whether they fire from an event handler, an async callback, a `setTimeout`, or a promise resolution. This was the breaking change in React 18; in React 19 it's the unconditional default. Three setters fire, one re-render runs. The lesson names this so the snapshot rule makes sense — batching is *why* multiple setters in a row don't each re-read state.
- **`flushSync` — the opt-out.** When code needs a render to commit synchronously before the next line runs (rare; usually for measurement or third-party integration), `flushSync(() => setCount(...))` forces it. The lesson names the API once and trusts that senior code reaches for it intentionally, not by default.
- **State updates and stale closures.** A `setTimeout(() => setCount(count + 1), 1000)` captures `count` from the render where the timeout was set. If the user clicks twice before the timeout fires, the second click also reads the stale `count`. The updater form fixes this: `setTimeout(() => setCount(c => c + 1), 1000)`. The lesson lands the rule: any setter that runs *after* render — async callbacks, event handlers that capture across renders, effects — should use the updater form for safety unless the value is deliberately the snapshot.
- **Object and array state — the immutable-update reflex.** State updates that look "mutate the object" must produce a new reference. `setUser({ ...user, name: 'Alice' })` is the spread reflex; `setItems([...items, newItem])` for arrays; nested paths get nested spreads. Mutating in place (`user.name = 'Alice'; setUser(user)`) bails out — the reference didn't change, no re-render. Recognition of structural sharing for performance is in 4.8 territory.
- **State updates are queued, not immediate.** The setter returns immediately, before React updates state. `setCount(count + 1); console.log(count)` logs the *old* count. This is the "snapshot" rule restated. The lesson names this trap because it's the second-most common misconception after "the component re-rendered because the prop changed."
- **Reading the next state — `useEffect` or derived state.** When code needs to react to a state change (run something *after* the state updates), the home is `useEffect` (4.9.2) or, more often, deriving the value in render. The senior reach: if you find yourself wanting to "read the new state after setting it," you usually wanted derived state — compute it directly in render (4.8.3 cashes in derived state).
- **Multiple state variables vs. one object.** Two `useState`s for `firstName` and `lastName` vs. one `useState({ firstName, lastName })` is a daily decision. The senior cut: separate state for independent values (different update sites, different lifetimes), object state for values that update together (a form, a settings panel). Object state means every update is a spread; separate state means more setters. Cross-reference 4.8 for the deeper treatment.
- **The `useState`-vs-`useReducer` foreshadow.** When state has multiple transitions or the update logic gets gnarly, `useReducer` (4.8.5) is the senior reach — the reducer is a pure function `(state, action) => newState` and avoids the updater-in-setter ceremony. Named once here as the alternative; 4.8.5 owns it.
- **Watch-outs:**
  - `setCount(count + 1); setCount(count + 1)` is the interview classic — both reads see the same snapshot, the increment is 1, not 2.
  - Async callbacks that use captured state are the stale-closure source; the updater form is the safest default for setters that don't run synchronously in a handler.
  - `setState` does not return the new value — there's no `const newCount = setCount(...)`. Read the next state from the next render.
  - Setting the same value bails out — `setUser(user)` with the same reference doesn't re-render. Useful for an early-return pattern; surprising if you didn't know.
  - Object spread is shallow — `setUser({ ...user, address: { ...user.address, street: 'X' } })` for nested updates. Immer is the library reach for deeply nested state (recognition only).
  - `flushSync` forces a re-render mid-event-handler and breaks batching — use only when measurement or a non-React API demands it.
  - The updater function must be pure (4.7.3) — no side effects, no reads from globals. React may call it more than once in development (Strict Mode).

What this lesson does not cover:

- `useState` API surface, lazy initial state, and derived state — Chapter 4.8.
- `useReducer` and multi-transition state — Lesson 4.8.5.
- Async-and-effect state updates with `useEffect` — Lesson 4.9.2.
- Server state and the data-fetching surface — Chapter 5.4.
- `useTransition` and `useDeferredValue` — Lesson 4.9.5.
- State management libraries (Zustand, Jotai) — Unit 16.
- Form state and uncontrolled inputs — Chapter 7.

---

## Lesson 4.7.5 — Resetting state with the `key` prop

Topics to cover:

- **The senior question.** A `<UserEditForm user={selectedUser} />` keeps its `name` and `email` state when the parent switches `selectedUser` from Alice to Bob — because reconciliation kept the same `<UserEditForm>` instance and only updated the `user` prop, so the form fields still show Alice's typed-but-unsaved edits over Bob's data. The fix is `<UserEditForm key={selectedUser.id} user={selectedUser} />` — changing the key remounts the component on every user switch, discarding the stale state. The lesson installs this idiom, names when to reach for it, and lands the alternatives.
- **The mechanism — same component, different key, fresh instance.** A key change at the same position in the tree (Lesson 4.7.2) tells React to unmount the old instance and mount a new one. Local state resets, refs reset, `useEffect` cleanup runs followed by fresh effects. The component is *semantically the same component* but a different *instance*. This is the deliberate use of reconciliation as a state-management tool.
- **The canonical pattern — form-bound-to-a-record.** A detail view that shows an editable form for a selected record needs to discard edits when the selection changes. The pattern: `<Form key={recordId} record={record} />`. Every selection change resets the form. The alternative — manually clearing every field in a `useEffect` watching `recordId` — is brittle, easy to forget when adding new fields, and surfaces the "you might not need an effect" rule from 4.9.3.
- **The animation-replay variant.** A toast or alert that should re-animate when its content changes uses the same trick: `<Toast key={messageId} message={message} />`. Each new message gets a fresh mount and the entrance animation runs again. Without the key, the toast updates the text in place and the animation only ran on the initial mount.
- **The reset-by-button-click variant.** A "Reset form" button that should clear the form without unmounting the parent: `const [resetKey, setResetKey] = useState(0); <Form key={resetKey} ... />; <button onClick={() => setResetKey(k => k + 1)}>Reset</button>`. Bumping the key remounts the form. Common in multi-step wizards and search panels.
- **When `key` resets are the right reach.** When (a) the component owns local state that should be tied to a specific identity (a record, a message, a session), and (b) re-deriving the state manually on prop change is more code than a key reset. The lesson lands this as the rule: prefer a `key` reset when the state has a natural "owner" that the parent already tracks.
- **When `key` resets are the wrong reach.** When the state should *persist* across the identity change (a scroll position the user expects to keep) — don't reset. When the parent should be the single source of truth and the child should be a function of props (no local state) — restructure, don't paper over with keys. When the state derives from props — derive it (4.8.3), don't store it.
- **The `key`-vs-controlled-component decision.** A controlled form (parent owns every field, child is presentational) has no local state to reset — the parent rewrites the props and the form follows. A `key` reset is the answer when local state has a legitimate home in the child but needs an identity-driven reset. The senior cut: if you find yourself reaching for `key` resets on every prop change, the state probably wants to live in the parent.
- **The cost of remount — effects re-run, refs re-attach.** A `key` change is not free: the cleanup of every effect runs, the new effects re-run, refs detach and re-attach, animations re-play, DOM nodes are recreated (rather than updated). For most components this is imperceptible. For a heavy subtree with expensive mount logic, the cost can show up in a profiler. Named here as the trade-off.
- **`key` on a wrapper vs. on a leaf.** Putting the `key` on the top-level component of the subtree to reset is the right grain. A `key` on a deeply nested element resets only that element. The senior reach: identify the smallest subtree that owns the state to reset and key it.
- **The `useImperativeHandle`-with-`reset` alternative — named once and rejected.** Some teams expose a `reset()` method on a ref the parent calls. This works but trades the declarative key reset for imperative ceremony, and tends to grow into a per-component reset API. The course default is `key`.
- **Cross-reference to the project chapter.** The 4.12.5 mobile-nav drawer uses a `key` to reset internal state when the route changes; Chapter 7 forms use `key` resets when switching records. The pattern recurs.
- **Watch-outs:**
  - A `key` change discards *all* local state in the subtree, including state the user might want to keep (scroll position, expanded/collapsed sections). Be deliberate.
  - Using a freshly generated key (`Math.random()`, `Date.now()` on every render) remounts on every parent render — guaranteed loop of unmount/mount. The key must change *only* when the reset is intended.
  - `key` on a fragment shorthand `<>` doesn't work — use `<Fragment key={...}>` explicitly.
  - The remount triggers the effect cleanup before the new effect runs — subscriptions tear down and re-establish. Usually fine; matters for expensive setups (web sockets, large data fetches).
  - The remounted component starts with `useState`'s initial value — if the parent should pre-fill the new instance, pass via props and use them as the initial state (`useState(() => props.initialValue)` with the lazy form).
  - Don't reach for `key` resets when the cleaner reach is derived state (4.8.3) or lifting state to the parent (4.8.4).
  - A `key` reset on a Suspense boundary remounts the boundary — the fallback shows again. Pattern matters in 5.3 territory.

What this lesson does not cover:

- `useState` initial values and lazy initialization — Lessons 4.8.1 and 4.8.2.
- Derived state and the "you might not need an effect" rule — Lessons 4.8.3 and 4.9.3.
- Lifting state up to the parent — Lesson 4.8.4.
- Reconciliation mechanics in detail — Lesson 4.7.2 owns them.
- Server-side identity and React keys across SSR — Chapter 5 territory.
- `useImperativeHandle` for imperative resets — recognition only; Chapter 4.6.4 owns the API.

---

## Lesson 4.7.6 — JSX synthetic events

Topics to cover:

- **The senior question.** Chapter 3.5 taught DOM events — `addEventListener`, capture and bubble phases, `e.stopPropagation()`, delegation patterns. JSX's `onClick`, `onChange`, and friends look like the same surface but they're React's *synthetic event* layer wrapping the native event, delegated to the React root, and typed against the element they're attached to. The lesson maps the DOM event model to React's, names the differences that bite in production, and lands the typed-event reflexes the rest of the course assumes.
- **What a synthetic event is.** A `SyntheticEvent` is React's cross-browser wrapper around a native `Event`. It has the same shape — `type`, `target`, `currentTarget`, `preventDefault()`, `stopPropagation()` — plus a `nativeEvent` escape hatch for the raw browser event. The wrapper normalizes browser quirks (which mostly evaporated by 2026 but the abstraction stayed) and integrates events with React's render scheduling.
- **Event delegation at the React root, not `document`.** Since React 17, React attaches one listener per event type at the application's root container (the element passed to `createRoot`) rather than at `document`. Two consequences: (1) multiple React apps on a page don't fight over `document`-level handlers; (2) native `document.addEventListener` handlers run *before* React's, while native handlers attached to ancestors of the React root run *after*. Senior code that mixes native and React handlers respects this ordering.
- **The event-prop naming convention.** `onClick`, `onChange`, `onSubmit`, `onMouseDown`, `onKeyDown`, `onFocus`, `onBlur`, `onPointerDown`, `onPointerMove`. All camelCase, all prefixed with `on`. The native event name (`click`, `change`) loses the prefix and gains the casing. The full surface is in React's docs; the lesson names the half-dozen daily reaches and trusts that students search the rest.
- **Typed events — `MouseEvent`, `ChangeEvent`, `KeyboardEvent`, `FormEvent`.** React's event types are generic over the element: `MouseEvent<HTMLButtonElement>`, `ChangeEvent<HTMLInputElement>`, `KeyboardEvent<HTMLInputElement>`, `FormEvent<HTMLFormElement>`. The senior reach: import the type from `react`, parameterize with the element, use it as the handler's parameter type. For inline handlers, TypeScript infers from the prop position so no annotation is needed.
- **`e.target` vs. `e.currentTarget` — the typed difference.** `currentTarget` is the element the handler is attached to (typed against the element). `target` is the deepest element the event originated on (typed as `EventTarget`, often needs a cast or narrowing). The senior reflex for form inputs: `e.currentTarget.value` — typed, no cast needed. `e.target.value` requires a cast or a type assertion because TypeScript can't infer the target's element type. Same principle for `checked`, `name`, `dataset`.
- **`preventDefault` and `stopPropagation` — same semantics as native.** `preventDefault()` cancels the default browser action (form submission, link navigation); `stopPropagation()` halts event bubbling at this handler. Same surface as Chapter 3.5; the lesson cashes in that knowledge here. `stopImmediatePropagation()` is on the native event (`e.nativeEvent.stopImmediatePropagation()`) when needed.
- **Capture vs. bubble in React.** The default for `onClick` and friends is bubble phase — handlers fire from inner element to outer. The capture-phase form adds `Capture` to the prop: `onClickCapture`, `onMouseDownCapture`. Same ordering as DOM events. The lesson names this for completeness; the daily reach is bubble.
- **The pooled-event surprise — gone in React 17+.** Pre-React 17, event objects were pooled and nulled out after the handler returned; accessing `e.target` in an async callback returned `null`. React 17 removed pooling. The lesson names this once for students reading older code or older tutorials; the modern reach is "event objects are normal objects, hold references freely."
- **Form event handling — the input/change pattern.** `<input value={value} onChange={e => setValue(e.currentTarget.value)} />` is the canonical controlled-input pattern. `onChange` in React fires on every keystroke (unlike native `change`, which fires on blur for text inputs); React's `onInput` and `onChange` are aliases. The lesson names this so students who read MDN's native `change` event don't get confused.
- **Form submit and `preventDefault`.** `<form onSubmit={e => { e.preventDefault(); ... }}>` is the daily reach — without `preventDefault`, the browser does a full-page navigation. The lesson names this; Chapter 7 owns the form surface, server actions, and the `action={fn}` form that replaces manual `preventDefault` in many 2026 cases.
- **Keyboard events — `e.key` over `e.keyCode`.** `e.key` is the modern reach — string values like `'Enter'`, `'Escape'`, `'ArrowUp'`. `e.keyCode` and `e.which` are deprecated. The senior reflex: `if (e.key === 'Escape')` for closing modals (cashed in by Lesson 4.6.5 and the project chapter). Modifier keys: `e.ctrlKey`, `e.shiftKey`, `e.metaKey`, `e.altKey`.
- **Pointer events — the unified primitive.** `onPointerDown`, `onPointerMove`, `onPointerUp` cover mouse, touch, and pen with a single API. `e.pointerType` is `'mouse' | 'touch' | 'pen'`. The senior 2026 reach for drag-and-drop, custom gestures, and anything that needs both touch and mouse — the older `onMouseDown` + `onTouchStart` pair is legacy.
- **Inline handlers vs. handler functions — the senior cut.** Inline arrow functions in JSX (`onClick={() => save(id)}`) are fine; the React Compiler memoizes them when the surrounding component is pure. Defining a separate handler function inside the component (`const handleClick = () => save(id)`) is cleaner for handlers with branching logic or multiple uses. The performance cost of inline handlers is a non-issue with the compiler; the choice is readability.
- **Synthetic events and the `value`/`checked` typing trap.** `e.currentTarget.value` is always a string, even on `<input type="number">` — the browser stores the raw text. The conversion to number happens in the handler. Same for `<input type="date">` — string in ISO format. The lesson names this so students don't reach for `parseInt` blindly.
- **Watch-outs:**
  - `onChange` in React fires on every keystroke; native `change` fires on blur. The names look the same but the semantics differ.
  - Don't mix `addEventListener` on a DOM node with a React `onClick` on the same element unless you understand the ordering — React's delegated listener runs after the native one on the same element.
  - `e.target.value` requires a TypeScript cast or narrowing; `e.currentTarget.value` is typed correctly from the prop position. Reach for `currentTarget` by default.
  - `stopPropagation()` on a React handler stops React-tree bubbling but doesn't stop native handlers attached to ancestors *outside* the React root.
  - `preventDefault()` on a form submit is required when the form has no `action` prop set (or when overriding the action) — Chapter 7's server-action form pattern eliminates many of these handlers.
  - The synthetic event is not the same object across handler calls — don't keep a reference and read it later (modern React doesn't pool, but the practice is brittle).
  - Pointer capture (`e.currentTarget.setPointerCapture(e.pointerId)`) is the senior reflex for drag handlers that must keep receiving events when the pointer leaves the element.
  - `onScroll` doesn't bubble in React (matching the DOM); attach to the scrolling element directly.

What this lesson does not cover:

- DOM event capture/bubble phases at depth — Chapter 3.5 owns them.
- Form submission, controlled inputs, and server actions — Chapter 7.
- Drag-and-drop APIs (`@dnd-kit`, native HTML5 drag) — out of scope; recognition only.
- Keyboard accessibility patterns (Esc-to-close, tab order) — Lesson 4.11.4.
- `useEvent` (React 19 experimental) — recognition only; not stable enough to teach as a default.
- Custom event emitters and pub/sub — out of scope; the course uses props and context.
- Touch events and gesture libraries — recognition only; the pointer-event API replaces most cases.

---

## Lesson 4.7.7 — Chapter quiz

Top 10 topics to quiz:

- The three triggers of a re-render — own state update, parent re-render, subscribed context change — and the misconception that "the prop changed, so the child re-rendered" (the parent re-rendered, the parent passed the new prop).
- Reference identity and `Object.is` — primitives compare by value, objects/arrays/functions compare by reference; inline JSX literals are "new" every render; the React Compiler retires most manual `useMemo`/`useCallback` for pure components.
- Reconciliation heuristics — different element types remount the subtree, same type updates in place; component identity by position by default and by `key` when provided; the index-as-key anti-pattern and its canonical reproduction (a list of inputs sorted with index keys keeps typed values on the wrong rows).
- Component purity as the React Compiler contract — render must be a function of props and state, no mutations of props/state, no side effects, no non-deterministic reads; the compiler silently skips impure components and the DevTools badge is the audit signal.
- State-as-snapshot — each render closes over its own state; `setCount(count + 1)` three times increments by 1; the updater form `setCount(c => c + 1)` reads from the queued value and stacks correctly.
- React 19 automatic batching — multiple setters in handlers, async callbacks, and timeouts batch into a single re-render; `flushSync` is the rare opt-out.
- Immutable state updates — object spread for object state, array spread for array state, mutation-then-set bails out via `Object.is`; reach for the updater form for sequential or stale-closure-prone updates.
- The `key`-as-reset idiom — same component, different key, fresh instance; canonical reaches (form bound to a record, animation replay, button-driven reset); the decision rule for when to reset by key vs. lift state vs. derive state.
- Synthetic events vs. DOM events — React delegates at the application root not `document`, `SyntheticEvent` wraps the native event with the same `preventDefault`/`stopPropagation` surface, `e.currentTarget` is typed against the element and `e.target` requires narrowing; `onChange` fires on every keystroke unlike native `change`.
- Typed event handlers — `MouseEvent<HTMLButtonElement>`, `ChangeEvent<HTMLInputElement>`, `KeyboardEvent`, `FormEvent`; `e.key` over `e.keyCode`; pointer events as the unified mouse/touch/pen primitive.
