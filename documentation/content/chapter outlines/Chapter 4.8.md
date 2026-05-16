# Chapter 4.8 — Hooks for holding state

## Chapter framing

Chapter 4.7 installed the render model — render is a function call, state is a snapshot, reconciliation runs by type and `key`, and components must stay pure. Chapter 4.8 is where the student learns the four hooks every React component reaches for to *hold* and *shape* state: `useState` (the default), `useReducer` (when transitions multiply), `useRef` (the mutable escape hatch that doesn't trigger re-renders), and `useId` (stable identifiers across SSR/hydration). The senior framing is that state shape is a design decision long before it's a syntax decision — every lesson lands the *where does this value live* question first, then the API. The chapter also lands the most consequential anti-pattern in early React careers: mirroring props into state via an effect when derived state or a `key` reset is the right reach.

Several threads run through every lesson. **State has four homes** — local component state, lifted parent state, URL state, server state — and the senior reflex is to start at the leaf and lift only on demand; this thread runs through 4.8.1, 4.8.3, and 4.8.4 and connects forward to the URL-state surface in 5.5. **Updates produce new references, never mutations** — the `Object.is` bailout from 4.7.1 is cashed in repeatedly; spread for objects and arrays, updater functions for stale-prone setters. **The compiler depends on purity** (4.7.3) — `useState` initializers, reducers, and ref reads all respect that contract; 4.10.2 cashes it in. **Hooks are called unconditionally at the top of the component** — the rules of hooks are foreshadowed here and owned by 4.9.7. **Refs are the not-state escape hatch** — when a value persists across renders but doesn't drive UI, it lives in a ref; this contrasts with state on every dimension. **`useId` is for accessibility wiring, not list keys** — the rule lands once and forward-references the form patterns in Chapter 7. The chapter ships six teaching lessons plus the quiz, in dependency order: the `useState` surface (4.8.1), derived state and the mirror-into-state anti-pattern (4.8.2), the lift-vs-colocate-vs-URL decision (4.8.3), `useReducer` for multi-transition state (4.8.4), `useRef` as the non-rendering store (4.8.5), and `useId` for SSR-stable identifiers (4.8.6). Forward references land in 4.9 (effects and `useContext`), 4.10 (compiler and the narrow remaining cases for manual memoization), and Chapter 7 (forms, where every hook in this chapter shows up at the call site).

---

## Lesson 4.8.1 — The `useState` surface and lazy initialization

Teaches the `useState` signature, typing pitfalls, the `Object.is` bailout, immutable-update reflex, lazy initializer form, setter stability, and what `useState` is not for.

Topics to cover:

- **The senior question.** A component needs to hold a value that changes over time and drives the UI — a counter, a toggle, the currently selected tab, a form field. `useState` is the answer, but the API rewards careful framing: the initial value runs once but the function is called on every render, the setter is stable but the value is a fresh snapshot, and the lazy initializer form earns its weight when the initial computation is non-trivial. The lesson installs the surface, lands the four daily decisions (primitive vs. object, initial-value form, separate-vs-grouped state, when the setter bails out), and forward-references the patterns that build on it.
- **The signature and what each piece does.** `const [count, setCount] = useState(0)` returns a tuple — the current snapshot and a setter. The initial value is used on the first render only; subsequent renders ignore it. The setter is stable across renders (same reference), which matters for effect dependencies (4.9.2) and the compiler's memoization story.
- **Typing `useState`.** Inference is the default — `useState(0)` infers `number`, `useState('')` infers `string`, `useState([])` infers `never[]` (a trap). For empty arrays, object initial values where the shape can grow, or `null`-able state, annotate explicitly: `useState<Todo[]>([])`, `useState<User | null>(null)`. The senior reflex: annotate when inference would narrow too tight or widen wrong.
- **State that's an object vs. multiple state variables.** Two `useState`s for `firstName` and `lastName` vs. one `useState({ firstName, lastName })` is a daily decision (foreshadowed in 4.7.4). The senior cut: separate state for values that update independently (a panel's `isOpen` and its content), grouped state for values that update together (a form draft, a settings bundle). Grouped state means every update is a spread; separate state means more setters but cleaner updates.
- **The immutable-update reflex.** `setUser({ ...user, name: 'Alice' })` for objects; `setItems([...items, newItem])` for arrays; `setItems(items.filter(i => i.id !== removed))` for removal; nested updates spread at every level. Mutating in place and then calling the setter bails out via `Object.is`. The lesson reinforces the rule from 4.7.4 and shows it at the `useState` call site.
- **The bailout rule.** Setting state to a value that is `Object.is`-equal to the current state skips the re-render entirely. `setCount(count)` with the same number is a no-op; `setUser(user)` with the same reference is a no-op; `setUser({ ...user })` with a freshly spread object re-renders even if every field matches. The lesson names this so students understand both the optimization (cheap to call `setState` defensively) and the trap (in-place mutation looks "set" but doesn't render).
- **Lazy initial state — `useState(() => expensiveCompute())`.** When the initial value requires non-trivial work (parsing a localStorage blob, computing a derived structure, reading a large prop), passing a function defers and caches it. Without the lazy form, `useState(expensiveCompute())` calls `expensiveCompute()` on every render and discards the result. The threshold for reaching for the lazy form: anything that touches storage, parses JSON, walks a large structure, or measures the DOM. For a literal or simple expression, the direct form is fine.
- **The setter is stable, the value is not.** The setter reference never changes across renders; it's safe in `useEffect` dependency arrays (and the lint rule won't flag it). The state value is a fresh snapshot every render — capturing it in a closure freezes the snapshot, which is the stale-closure mechanism from 4.7.4.
- **The updater form recap.** When the next state depends on the previous, reach for `setCount(c => c + 1)` (cashed in by 4.7.4). The lesson re-states it at the `useState` call site as the reflex, not the workaround.
- **Reading from props as initial state — the controlled trap.** `useState(props.value)` looks reasonable but the state is "frozen" at the mount — subsequent prop changes don't update it. This is sometimes deliberate (an editable copy of a server value), sometimes a bug (the parent expects the child to follow the prop). The lesson names the trap and forward-references the fix (4.8.2 for derived state, 4.7.5 for `key`-driven reset).
- **What `useState` is not for.** Values that don't affect the UI (interval IDs, focus state, scroll positions read by handlers) — use `useRef` (4.8.5). Values derived from other state or props — derive in render (4.8.2). Values that should be shared across many components — lift or use context (4.8.3, 4.9.4). Values that should survive a refresh or be shareable — URL or server state (4.8.3, 5.5).
- **Watch-outs:**
  - `useState([])` infers `never[]` and `arr.push(x)` won't typecheck. Annotate `useState<T[]>([])`.
  - `useState({})` infers `{}` — usable but loose. Annotate the shape.
  - Passing a function literal *as* the initial value (`useState(handler)`) calls `handler()` once instead of storing the function. To store a function as state, wrap: `useState(() => handler)`.
  - The lazy initializer must be pure (4.7.3) — Strict Mode may call it twice in development.
  - Calling the setter inside the function body (not in a handler/effect) causes an infinite loop. The exception is the `setState`-during-render pattern for *derived from previous state* (rare, narrow rules apply); the daily reach is to derive in render instead (4.8.2).
  - Setting state from inside `useState`'s initial value (calling the setter in the initializer) is silently ignored — the component hasn't mounted yet.
  - Reading a stale `count` in a `setTimeout` is fixed with the updater form, not by recomputing.

What this lesson does not cover:

- Derived state and the syncing-via-effect anti-pattern — Lesson 4.8.2.
- Lifting state, colocation, and URL state — Lesson 4.8.3.
- `useReducer` for multi-transition state — Lesson 4.8.4.
- `useRef` for non-rendering values — Lesson 4.8.5.
- `useEffect` for syncing with external systems — Lesson 4.9.2.
- The rules of hooks — Lesson 4.9.7.
- Form state and uncontrolled inputs — Chapter 7.

---

## Lesson 4.8.2 — Derive in render, do not mirror into state

Teaches that values computable from existing props and state belong in the function body, names the canonical mirror-prop-into-state-and-sync-with-effect anti-pattern, and lands the three fixes (derive, lift, `key`-reset).

Topics to cover:

- **The senior question.** A component has a `fullName` value that depends on `firstName` and `lastName`. A junior reflex is `useState` for `fullName` plus a `useEffect` that calls `setFullName(firstName + ' ' + lastName)` whenever either changes. The result is a render, an effect, a re-render — three passes for one value, plus a window of stale state where the UI shows the old `fullName`. The fix is to *derive* the value during render: `const fullName = firstName + ' ' + lastName`. The lesson installs the rule, lands the canonical reproductions, and forward-references the narrow cases where state actually earns its weight.
- **What "derived" means.** A value is derived when it can be computed from existing props and state at any moment. A user's full name from first/last. A filtered list from a search query plus the source list. The count of completed todos from a todo array. The total of a cart's line items. These should not live in state — they should be computed in the function body during render.
- **The mental shift — JavaScript before JSX.** The body of a component is a function. Anything that can be computed with normal JavaScript (variables, ternaries, `.filter`, `.map`, `.reduce`) gets computed there. State is reserved for values that *change over time independent of other state*. The senior framing: state is the *minimum* set of values from which everything else can be computed.
- **The canonical anti-pattern: mirror a prop into state, sync with effect.** `const [value, setValue] = useState(props.value); useEffect(() => setValue(props.value), [props.value])`. (`useEffect(callback, deps)` runs the callback after commit and re-runs when any value in `deps` changes — full treatment in 4.9.2.) The component renders with the stale state, the effect fires, the component re-renders with the new state — two renders per prop change, and any code between the two reads stale state. The fix depends on intent: if the value is purely a function of the prop, derive it; if the value is an editable copy that should reset when the prop changes, use a `key` reset (4.7.5); if neither fits, the state structure is wrong.
- **The canonical anti-pattern: cached calculation as state.** `const [filtered, setFiltered] = useState([]); useEffect(() => setFiltered(items.filter(...)), [items, query])`. Same shape, same fix — `const filtered = items.filter(...)` in render. The React Compiler (4.10.2) memoizes the expensive computation; the developer doesn't pre-memoize.
- **The canonical anti-pattern: derived flags.** `const [hasErrors, setHasErrors] = useState(false); useEffect(() => setHasErrors(errors.length > 0), [errors])`. Fix: `const hasErrors = errors.length > 0`. The lesson stacks these reproductions because the shape recurs in every codebase.
- **When state is actually warranted.** (1) The value originates from user input (`<input onChange>`). (2) The value comes from an external system (server, localStorage, a subscription) and needs to be cached locally. (3) The value tracks a moment in time (a timestamp at mount, a random seed assigned once). (4) The value is intentionally "snapshotted" — an editable form draft that should diverge from the server-side record until save. The lesson lands these as the legitimate triggers.
- **Computing in render is cheap.** The senior reflex corrects "but won't recomputing on every render be slow?" — for typical work (a filter over a few hundred items, a sum, a string concatenation), the cost is negligible compared to the rendering itself. The React Compiler memoizes when the computation is expensive and the inputs are stable; when it doesn't, `useMemo` (4.10.3) is the manual reach, but only after a profiler measurement.
- **The `useMemo` foreshadow — narrow and audited.** When derivation is *measurably* expensive (a large sort, a non-trivial graph traversal, a parser pass), `useMemo` caches across renders. Named here once as the escape valve; 4.10.3 owns the decision threshold. The default is no `useMemo`.
- **The "you might not need an effect" landing.** The React docs page of the same name is the canonical reading for this lesson — the lesson summarizes its rules and forward-references 4.9.3 for the full effects-anti-pattern catalog (event-handler logic, parent-driven resets, expensive calculation, fetching).
- **State that derives from changing props — the `key`-reset alternative.** When a child needs local state seeded from a prop but reset when the prop changes (an edit form for a selected record), the `key` reset (4.7.5) is the senior reach, not a sync effect. The lesson cross-references explicitly because the two anti-patterns share the same setup.
- **Watch-outs:**
  - "I need to update state when a prop changes" is almost always one of: derive it, lift it, or `key`-reset it. The sync-effect is the wrong shape.
  - Derived computations in render run on every render — that's the point. Don't optimize prophylactically.
  - A `setState` call inside a `useEffect` that watches another piece of state is the smell. Look for the derivation.
  - The exception — `setState` during render, conditionally, for "adjusting state based on changed props" — is a documented but narrow pattern; the lesson names it once and trusts that `key` resets or derivation cover most cases.
  - Derived state hidden inside a custom hook is still derived state. The hook should return the computed value, not store it.
  - A computed value that is the *input* to an effect (a query string passed to a fetch) belongs in render and the effect's dependencies. Don't cache it in state to "stabilize" the dependency — React's comparison is `Object.is` and the source-of-truth values already drive the change.

What this lesson does not cover:

- The full "you might not need an effect" catalog (event handlers, parent resets, expensive calc) — Lesson 4.9.3.
- `useMemo` thresholds and decision rules — Lesson 4.10.3.
- The `key` reset mechanic at depth — Lesson 4.7.5.
- Effects and external-system sync — Lesson 4.9.2.
- Form drafts and server-state divergence — Chapter 7.
- Server state and caching — Chapter 5.4 and Chapter 11.

---

## Lesson 4.8.3 — The four homes for state

Teaches the local-lifted-URL-server decision tree, the colocate-then-lift-on-demand reflex, URL state with `nuqs` as the 2026 reach, and the prop-drilling-is-not-a-context-bug distinction.

Topics to cover:

- **The senior question.** A `SearchableTable` has a `query` input and rows below. Should `query` be local state in the input, lifted to the parent that owns the rows, or pushed into the URL as `?q=...`? The answer drives shareability, refresh behavior, undo/redo via back button, and SSR. The lesson installs the four-tier decision (leaf, lifted, URL, server) as the senior framing for state placement, lands the canonical triggers for each tier, and forward-references the URL-state surface in 5.5.
- **The four homes for state.** (1) **Local** — state belongs to a single component, no one else cares. (2) **Lifted** — state belongs to a parent because two or more siblings need it. (3) **URL** — state belongs to the route because it should survive refresh, be shareable, and respect the back button. (4) **Server** — state belongs to the server because it's the canonical record. The lesson teaches the senior reflex: start at (1), lift only when (2) demands, push to (3) when shareability or refresh-survival demands, persist to (4) when canonicity demands.
- **Colocation as the default.** "Colocate state with the component that needs it" is the rule. A modal's open/closed state lives in the modal trigger's parent — the closest common ancestor of the trigger and the modal. A dropdown's expanded state lives in the dropdown component. Premature lifting creates prop-drilling and recomputes the world on every keystroke. The senior framing: lift on demand, not on prediction.
- **Lifting state up — the mechanic.** When two siblings need the same state (a parent showing a list, a filter input above it), the state moves to their common parent and is passed down as props plus a setter (or a typed event handler). The lifted-up component becomes the *single source of truth* — the inputs are now controlled, the children render purely from props.
- **The canonical lift triggers.** (1) Two siblings need the same value (filter + list). (2) An ancestor needs to *react* to a child's state (form fields driving a "save" button's enabled state). (3) The state needs to survive across the unmount of a single child (a tab's content state surviving tab switches — though `key` resets often handle this better).
- **URL state — the third tier.** Search filters, pagination, sort orders, the selected tab, modal IDs that should be linkable. The URL is the source of truth; the components read from `searchParams` (in App Router this means `useSearchParams` for Client Components, or awaited `searchParams` on the page in Server Components — Chapter 5.1 and 5.5 own these). The senior reflexes the lesson lands: if a user reloading the page expects the value to stick, it belongs in the URL. If they expect to share the link and the recipient sees the same view, it belongs in the URL. If neither, local or lifted is fine.
- **URL state with `nuqs` — the 2026 reflex.** `nuqs` is the typed-search-params library that wraps `useSearchParams` with typed parsers, defaults, batching, and history mode. The lesson names it once as the senior reach when URL state grows past one or two params; full surface is in 5.5. Without `nuqs`, hand-rolled `useSearchParams` + `router.push` works for simple cases.
- **Server state — the fourth tier.** Server state (the user's saved records, the team's settings, anything backed by a database) doesn't belong in `useState` long-term — it belongs in a server-state cache (Chapter 11) or read directly in a Server Component (Chapter 5.4). `useState` for server data leads to staleness, refetch-on-every-mount bugs, and lost optimistic updates. Named here as the fourth tier and forward-referenced.
- **The decision framework — a tree.** (1) Does the value need to survive a refresh or be shareable? → URL. (2) Is it canonical data backed by the server? → server cache / Server Component. (3) Do two or more components need it? → lift to the common parent. (4) Otherwise → local. The lesson states this once as the chart and uses it for the rest of the surface.
- **Prop-drilling and the context foreshadow.** When lifted state has to traverse many layers, prop-drilling becomes the cost. The instinct to "fix" this with context is sometimes right and sometimes premature — context has its own re-render cost (4.9.4) and is reserved for genuinely cross-cutting state (auth user, theme, locale). The lesson names this and trusts 4.9.4 to land the decision.
- **The compound-component alternative to prop-drilling.** When the depth comes from layout structure (a `Card` with `CardHeader` and `CardBody`), compound components (4.6.2) often eliminate the need to lift — children are wired implicitly via context inside the compound. Recognition only; 4.6.2 owns the surface.
- **The senior code smell — multiple `useState`s tracking the same conceptual value.** A `searchInput` state in the input, a `searchQuery` state in the list, and a `useEffect` syncing them is the lifting-not-done signal. The fix is one `useState` at the parent.
- **Inverse smell — state lifted too high.** A `tabState` lifted to the root layout when only one route uses it bloats the layout and re-renders the world on every tab click. The fix is push state down to the smallest component that actually needs it.
- **The form-draft exception.** Form state is *almost always* lifted to the form component, never to the input. The form owns the submit, the validation, the dirty-tracking; the inputs are presentational. This is the canonical "one form, many inputs, one piece of state" pattern. Chapter 7 owns the surface; the lesson names it here as the canonical lifting case.
- **Watch-outs:**
  - Lifting too eagerly is as wrong as lifting too late. The trigger is two-components-need-it, not "might someday."
  - URL state is global state with a free synchronization mechanism. Use it for anything the user might expect to bookmark.
  - `useState` for the current user, the theme, or the locale is the wrong tier — those are context (auth, theme provider) or URL/cookie (locale).
  - "Move state to context" is not a fix for prop-drilling that's three layers deep — pass the prop. Context is for cross-cutting concerns, not for skipping intermediate components.
  - Server state in `useState` looks like it works until the user opens a second tab.
  - When lifting, the typed callback shape (`onChange: (next: string) => void`) is the contract — don't pass setters across component boundaries unless the child is genuinely "the input." Named callbacks are easier to refactor.
  - URL state without parsing is unsafe — Zod-validate the params on read (foreshadowed at 5.1.3).

What this lesson does not cover:

- `useContext` and the perf footgun — Lesson 4.9.4.
- The `useSearchParams` surface and `nuqs` API — Lesson 5.5 (App Router URL state).
- Server-side data fetching and Server Components — Chapter 5.4.
- Server-state caching (TanStack Query / SWR-style) — Chapter 11.
- Forms at depth (validation, submission, server actions) — Chapter 7.
- Global stores (Zustand, Jotai) — Unit 16 recognition only.
- Co-location patterns at the file-system level — Chapter 5.1.1.

---

## Lesson 4.8.4 — `useReducer` when transitions multiply

Teaches the threshold where coordinated `useState`s become a reducer, the discriminated-union action shape, the reducer purity contract, lazy init via the `init` argument, and the async-lives-in-the-handler rule.

Topics to cover:

- **The senior question.** A form has fields, a submit button, a loading state, a server error, a "draft saved" indicator. The component has eight `useState`s and twenty setters scattered through handlers, and a bug shows up where the loading state stays `true` after a validation failure. The fix is `useReducer` — one state object, named actions, one reducer that owns every legal transition. The lesson installs the threshold ("when `useState`s start coordinating, switch to a reducer"), lands the reducer shape, and connects to the broader state-management vocabulary.
- **The signature.** `const [state, dispatch] = useReducer(reducer, initialState)`. The reducer is `(state, action) => newState`, pure, no side effects. `dispatch(action)` queues an action; React calls the reducer with the current state and the action and renders with the result. The third argument — `init` — is the lazy form (same role as `useState`'s lazy initializer).
- **What an action looks like.** Discriminated unions are the senior shape: `type Action = { type: 'submit' } | { type: 'error'; message: string } | { type: 'reset' }`. The `type` field discriminates; payloads come as additional fields. TypeScript narrows in each `case` of the switch, so `action.message` is only available where `action.type === 'error'`. The lesson connects this directly to Chapter 2.5's discriminated-union seed.
- **The reducer shape.** A switch on `action.type`, each case returning a new state object via spread. No mutation. No side effects. No async calls. Pure inputs to pure outputs. The lesson lands this as the contract — the reducer's purity is what makes the state predictable, testable, and time-travel-debuggable (devtools recognition only).
- **When `useReducer` earns its weight.** (1) Multiple related state values that update together (a form's `values + errors + isSubmitting + submitError`). (2) Transitions that have invariants (you can never be `isLoading` and have a `result` at the same time). (3) Update logic complex enough to want a name (`'optimistic-update'`, `'rollback'`, `'commit'`). (4) The same state value getting set from multiple distant handlers and you want one place to trust. (5) State that needs to be tested independently — reducers are unit-testable without React.
- **When `useState` is the right reach instead.** A counter. A toggle. A form field. A modal's open/closed flag. A single piece of state with one or two transitions. Reducers add ceremony; reach for them when the ceremony pays for itself.
- **The "model a state machine" framing.** Reducers are state machines without the library. `idle → loading → success | error → idle` is a four-state machine with named transitions; modeling it as a `status` field in a reducer prevents the impossible-state bugs that scattered `useState`s create (e.g., `isLoading: true` *and* `error: 'X'` at the same time). The senior reflex: when invariants matter, model the state machine. XState as the library reach is recognition only — overkill for most components, right when the machine has nested or guarded transitions.
- **Lazy initialization with the `init` argument.** `useReducer(reducer, initialArg, init)` calls `init(initialArg)` once on mount. Useful when initial state requires a derivation (parsing local storage, computing from props on mount). Same role as `useState(() => ...)`.
- **Dispatch is stable, state is a snapshot.** `dispatch` is referentially stable across renders; safe in effect dependencies and prop-drilling. The state value follows the snapshot rule — actions queue; the next render sees the next state. The updater-form rules from 4.7.4 apply: when an action's payload depends on the current state, reach for an action that computes from previous-state inside the reducer (which already has access), not from outside.
- **Immer with `useReducer` — recognition only.** When state is deeply nested and spreads pile up, Immer's `produce` wraps a "mutating-style" reducer body and produces an immutable result. Named once as the library reach; the course default is direct spreads because shallow updates dominate and explicit spreads keep the reducer's intent visible.
- **Reducer + `useTransition` — recognition.** `useTransition` (4.9.5) can wrap a `dispatch` to mark the update as a transition. Forward reference only.
- **The Redux foreshadow.** `useReducer` looks like a single-component Redux. The shape is intentional — actions, reducers, dispatch — but the scope is one component (and its descendants via context, if shared). Course doesn't teach Redux; recognition that the vocabulary transfers.
- **Typing `useReducer` in React 19.** The compiler's type inference improved; the senior pattern is `useReducer(reducer, initialState)` with the reducer's signature carrying the types — `function reducer(state: State, action: Action): State`. The state and action types live next to the reducer, not as generics on the hook call. Cross-reference to 2.5 for the discriminated-union shape.
- **Watch-outs:**
  - The reducer must be pure (4.7.3) — no `fetch`, no `console.log`-in-production, no DOM access, no `Math.random()`. Strict Mode may double-call it in dev.
  - Returning the same state object reference bails out the same way `useState` does. Always spread to produce a new reference.
  - Don't put async logic inside the reducer. Async lives in the handler that calls `dispatch` — start the async, dispatch `{ type: 'start' }`, await, dispatch `{ type: 'success', payload }` or `{ type: 'error', message }`.
  - "Switch on action type" exhaustiveness — TypeScript's `never` check at the end of the switch catches forgotten action types. The senior pattern: a `default` case with `assertNever(action)` (cross-reference 2.5).
  - Sharing a reducer via context is the multi-component pattern, but it's also where context's re-render cost (4.9.4) bites — split the state and dispatch into two contexts to limit re-renders.
  - Reducers can return a partial state by mistake — always spread `...state` first in the case, then override fields.
  - "I have 12 `useState`s in one component" is the canonical trigger to switch.

What this lesson does not cover:

- Discriminated unions and exhaustive switches at depth — Lessons 2.4.5 and 2.5.
- `useContext` and context performance — Lesson 4.9.4.
- `useTransition` and async transitions — Lesson 4.9.5.
- Async form actions and `useActionState` — Chapter 7.
- Redux, Zustand, Jotai — Unit 16 recognition.
- State machines (XState) — recognition only.
- Server-state caching libraries — Chapter 11.

---

## Lesson 4.8.5 — `useRef` as the non-rendering escape hatch

Teaches the two flavors of ref (DOM nodes and instance values), the state-vs-ref rule ("does the JSX read it?"), the four canonical DOM-ref reaches, the don't-read-or-write-during-render rule, and how refs interact with the React Compiler.

Topics to cover:

- **The senior question.** A `<SearchInput>` should focus its `<input>` when the parent opens the dropdown. A debounced search needs to remember its `setTimeout` ID across renders so the next keystroke can clear it. A scroll-position tracker needs to read `scrollTop` without re-rendering the page on every pixel. Each of these is a value that *persists across renders* but *doesn't drive UI*. The lesson installs `useRef` as the React escape hatch for that pattern, names the two flavors (DOM node access and instance values), and lands the rule that distinguishes refs from state.
- **The signature and what's in `.current`.** `const inputRef = useRef<HTMLInputElement>(null)` returns a stable object `{ current: T | null }`. The object reference is the same across renders; `.current` is mutable and doesn't trigger re-renders when set. The initial value (`null` for DOM refs, anything for instance values) is set once on the first render.
- **The two flavors of ref.** (1) **DOM refs** — attach to an element via the `ref` prop (`<input ref={inputRef} />`) and React assigns the DOM node to `.current` after commit. (2) **Instance values** — a mutable box for any value the component needs to remember across renders without rendering on change (interval IDs, timeout IDs, previous values, large objects that shouldn't be inputs to state).
- **The rule that separates refs from state.** State is for values the UI reads. Refs are for values *only handlers and effects* read. If changing the value should re-render, it's state. If changing the value should not re-render, it's a ref. The senior reflex: "does the JSX read this?" — yes → state, no → ref.
- **DOM ref lifecycle.** React assigns the node to `.current` after the DOM commit (the `useEffect` timing). Reading `inputRef.current` in render returns the *previous* commit's value (or `null` on the first render); reading it in an effect or handler reads the live node. The lesson lands this so students don't reach for the ref in render.
- **The canonical DOM-ref patterns.** (1) Focus management: `inputRef.current?.focus()` in an effect or a handler. (2) Reading layout: `divRef.current?.getBoundingClientRect()` in an effect. (3) Imperative APIs: `videoRef.current?.play()` from a "Play" button handler. (4) Scrolling: `listRef.current?.scrollTo({ top: 0 })`. The lesson names these as the four reaches and forward-references 4.6.4 for `ref` as a React 19 prop (no more `forwardRef`).
- **Refs are not for things React already does.** Reading the value of a controlled input via a ref defeats the controlled pattern. Setting `style.display = 'none'` via a ref bypasses React. Toggling a class via `classList.add` bypasses Tailwind/state. The senior cut: refs are for capabilities the DOM exposes that React doesn't (focus, measurement, media playback, scrolling, copy-to-clipboard targets), not for re-implementing what props and state do.
- **Instance-value refs — the second flavor.** `const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to remember a `setTimeout` ID across renders. `const previousValueRef = useRef(value)` to compare against the previous render (the `usePrevious` custom-hook pattern foreshadowed in 4.10.1). `const renderCountRef = useRef(0); renderCountRef.current++` for debugging.
- **The "don't read or write refs during render" rule.** Refs hold mutable state; reading or writing during render makes the component impure (4.7.3). The narrow exception is the "lazy initial ref" pattern: `if (someRef.current === null) someRef.current = createExpensiveThing()` for one-time setup. Otherwise — handlers and effects only.
- **Ref callbacks for measurement and dynamic refs.** Passing a function as the `ref` prop (`<div ref={node => { ... }}>`) gives a callback that runs when the node attaches and (in React 19) returns a cleanup that runs when it detaches. Useful for measuring on mount, attaching to dynamic elements, and merging multiple refs. Forward reference to 4.6.4 for the full surface.
- **`useImperativeHandle` — recognition only.** When a parent legitimately needs to call methods on a child (a `<VideoPlayer>` with `play()` and `pause()`), the child exposes a typed API via `useImperativeHandle`. Rare in 2026 — most "expose a method" instincts are better served by lifting state or `key` resets. Cross-reference 4.6.4.
- **Refs and the React Compiler.** The compiler treats refs as opaque; reading or writing `.current` during render flags the component as impure and skips memoization (4.10.2). The senior audit: any component with ref reads in render shows up in the DevTools "not memoized" list. Move the ref access to a handler or effect.
- **The "previous value" pattern.** `useEffect(() => { previousValueRef.current = value })` after render captures the previous value for the next render. Common enough to extract as a `usePrevious` custom hook (4.10.1). The lesson names this once as the canonical instance-value pattern.
- **Cleanup discipline.** A ref holding a timer ID, a subscription, or a resource needs a cleanup — usually in the effect that created it. The lesson names this and trusts 4.9.2 to teach effect cleanup at depth.
- **Watch-outs:**
  - Reading `ref.current` during render returns the *committed* value, which is `null` on the first render and stale on every subsequent one. Always read in effects or handlers.
  - Setting `ref.current` during render makes the component impure and skips compiler memoization.
  - A `useState` plus a setter where the value never appears in JSX is a ref in disguise. Switch to `useRef` and move the setter into a handler.
  - A ref to a conditionally rendered element holds `null` when the element isn't mounted — null-check at read sites.
  - Sharing a ref across components by passing it as a prop works; sharing by storing in module scope is a leak and breaks Strict Mode tests.
  - Don't initialize a ref with an expensive computation directly — the lazy form is `useRef(null)` followed by an `if (ref.current === null) ref.current = ...` block inside an effect or the lazy-init exception above.
  - `ref` is not passed through standard `props.ref` access; in React 19 you destructure `ref` from props directly on the function component (4.6.4) — but accessing it from inside the *same* component (looking at "my own" ref) uses `useRef`, not the prop.
  - Pointer-capture refs and IntersectionObserver targets are the canonical "instance value + DOM node" combo — both lifecycles must align.

What this lesson does not cover:

- `ref` as a prop in React 19 and ref forwarding — Lesson 4.6.4 (already taught).
- `useImperativeHandle` at depth — Lesson 4.6.4 (recognition only).
- `useEffect` cleanup and external systems — Lesson 4.9.2.
- IntersectionObserver, MutationObserver, ResizeObserver patterns — Chapter 4.9 (effects) and recognition in 3.x DOM chapters.
- Drag-and-drop and gesture libraries — out of scope (recognition).
- Animation libraries (Framer Motion, `motion`) — Chapter 4.5.5 territory.
- Custom hooks extracting ref patterns (`usePrevious`, `useEventListener`) — Lesson 4.10.1.

---

## Lesson 4.8.6 — `useId` for ARIA wiring across SSR

Teaches the position-in-the-tree derivation that keeps IDs stable across server and client, composing multiple IDs from one call, the label-input-error wiring pattern, and the not-for-list-keys rule.

Topics to cover:

- **The senior question.** A custom `<TextField label="Email" />` component needs to wire a `<label htmlFor={id}>` to a `<input id={id}>` so screen readers announce the field correctly. Hardcoding `id="email"` works for one instance but collides when two `<TextField>`s are on the same page. `Math.random()` works on render but produces a hydration mismatch under SSR — the server picks one number, the client picks another. `useId` is the platform answer: a stable identifier per component instance, identical on server and client. The lesson installs the hook, names the canonical reaches, and lands the rule that distinguishes `useId` from list keys.
- **The signature and what it produces.** `const id = useId()` returns a string identifier (`':r1:'` or similar) that is unique per component instance, stable across renders, and identical on server and client. The format is opaque — don't parse it, don't pattern-match on it. The hook is called once per component; each instance gets its own ID.
- **Why a hook and not a `crypto.randomUUID`.** `crypto.randomUUID()` would produce a different value on server and client and break hydration. `useId` derives the ID from the component's *position in the React tree*, which is deterministic across renders and identical on server and client because the tree is the same.
- **The canonical use — accessibility wiring.** Form fields where label and input must be paired: `<label htmlFor={id}>` plus `<input id={id} />`. `aria-describedby={errorId}` plus an error element with `id={errorId}`. `aria-labelledby={titleId}` for custom dialogs. The senior reflex: any time a non-visual ID needs to link two DOM nodes, reach for `useId`.
- **Composing multiple IDs from one `useId`.** A single `useId()` returns one base ID. When a component needs multiple related IDs (one for the input, one for the error message, one for the description), derive: `const id = useId(); const inputId = id; const errorId = \`${id}-error\``. The convention preserves uniqueness and keeps the relationship visible.
- **What `useId` is *not* for — list keys.** The lesson lands this rule explicitly because the misconception is universal. `key` in a list (`items.map(item => <Row key={...} />)`) is for reconciliation identity (4.7.2) — it must come from the *data*, not from a hook. `useId` generates an ID for the *component instance*, which by definition exists only after the instance is created — the chicken-and-egg makes it useless for keys. Use the item's `id`, `slug`, or a `crypto.randomUUID()` assigned at creation time and stored on the data.
- **What `useId` is not for — security or business identifiers.** `useId` IDs are not random, not unpredictable, and not unique across pages or sessions. They're stable per component, per tree, per page render. Anything that needs cryptographic uniqueness (CSRF tokens, session IDs, idempotency keys) uses `crypto.randomUUID()` server-side.
- **The hydration-mismatch fix.** When a Client Component reads from `Date.now()`, `Math.random()`, or `window.*` and uses the result in an ID attribute, the SSR HTML and the hydrated HTML differ and React throws a hydration warning (5.2.5). `useId` is one of the canonical fixes — replace the random ID with a deterministic one. Other hydration fixes live at the source (move the random read to an effect; use `suppressHydrationWarning` for known-acceptable differences) — 5.2.5 owns the surface.
- **Inside Server Components.** `useId` works in both Server and Client Components in React 19 — the IDs are generated during the tree-walk and serialized into the SSR HTML, then matched on the client during hydration. The senior takeaway: don't special-case Server Components for ID generation; `useId` is universal.
- **The `idPrefix` rendering option.** When rendering multiple React roots on the same page (rare, but used for some legacy migration patterns and embedded widgets), `createRoot(..., { identifierPrefix: 'app1-' })` prefixes IDs to avoid cross-root collisions. Recognition only — the daily reach is one root per page.
- **Composability and library compatibility.** `useId` is what shadcn/ui (4.11.1) and Radix primitives use internally to wire ARIA attributes. The course's own form components (Chapter 7) reach for `useId` at every label-input pairing. When wrapping a third-party input with a custom component, the wrapper generates the ID and the inner element receives it as a prop.
- **Watch-outs:**
  - `useId` IDs contain colons (`:r1:`) by design — they're safe in HTML `id` attributes and `htmlFor`, but if a CSS selector references the ID it must escape the colons (`#\\:r1\\:`). The senior reach is to not select on these IDs from CSS; they're for ARIA wiring, not styling.
  - Don't use `useId` as a key in lists — keys come from data, not from the React tree (4.7.2).
  - Conditional rendering that changes the *call order* of `useId` (e.g., `{flag && <UseIdComponent />}` followed by another `useId` consumer in the same parent) can shift IDs and cause hydration mismatches — keep `useId` calls outside conditionals.
  - The ID changes if the component unmounts and remounts (a `key` reset, for instance) — fine for ARIA, surprising if you stored the ID somewhere expecting it to persist.
  - `useId` is for *internal* wiring. URL fragments (`#email`) that users link to need stable, human-readable IDs hardcoded — not `useId`.
  - Calling `useId` inside a custom hook is fine; the hook receives a unique ID per call site. The custom hook returns the ID for the consumer to use.
  - Reading `useId` and then mutating it (string concatenation for a suffix) is the right pattern; calling `useId` twice in one component is also fine — each call gets its own ID.

What this lesson does not cover:

- Reconciliation and list keys — Lesson 4.7.2.
- Hydration mismatches at depth and Server/Client boundaries — Lessons 5.2.5 and 5.2.6.
- ARIA roles, live regions, and the first rule of ARIA — Lesson 4.11.3.
- Focus management and keyboard navigation — Lesson 4.11.4.
- Form field components and validation — Chapter 7.
- shadcn/ui's internal ID wiring — Chapter 4.11.1 (recognition).
- Cryptographic IDs and server-generated tokens — Chapter 11 (server) and recognition only.

---

## Lesson 4.8.7 — Quizz

Top 10 topics to quiz:

- The `useState` signature, the bailout rule (`Object.is` skips re-render on same value), and typing pitfalls — `useState([])` infers `never[]`, annotate when the inferred type is too narrow.
- Lazy initial state — `useState(() => expensiveCompute())` runs once on mount; `useState(expensiveCompute())` runs on every render and discards the result; the trigger is anything that touches storage, parses, or measures.
- Derived state — compute in render rather than mirroring with a `setState`-in-effect; the canonical anti-pattern (prop mirrored into state, synced via effect) and the three fixes (derive, lift, `key`-reset).
- The four homes for state — local, lifted, URL, server — and the decision tree (start at local, lift when two components need it, push to URL when refresh/share matters, persist when the server is canonical).
- The colocation-vs-lifting senior cut — lift on demand, not on prediction; the form-as-the-canonical-lifting-case; the prop-drilling-is-not-a-fix-for-context distinction.
- `useReducer` — the threshold (multiple coordinated state values, transitions with invariants), the reducer purity contract, discriminated-union actions, lazy init, and the "don't put async in the reducer" rule.
- `useRef` — instance values and DOM access, the "state-vs-ref" rule (does the JSX read it?), the four canonical DOM-ref reaches (focus, measure, imperative APIs, scrolling), the "don't read or write refs during render" rule.
- `useRef` lifecycle and the React Compiler interaction — `.current` is set after commit; reading in render returns the previous commit's value; impure ref access skips compiler memoization.
- `useId` for stable IDs across SSR — the position-in-the-tree derivation, composing multiple IDs from one call, the rule that `useId` is for ARIA wiring not list keys, the hydration-mismatch case it fixes.
- The hooks-are-tools-not-defaults framing — `useState` for UI-driving values, `useReducer` for coordinated transitions, `useRef` for non-rendering persistence, `useId` for accessibility wiring; reach for each at its threshold, not prophylactically.
