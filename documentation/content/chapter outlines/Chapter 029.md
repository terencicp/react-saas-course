# Chapter 029 — Effects, context, and concurrent hooks

## Chapter framing

Chapter 028 installed the hooks that *hold* state. Chapter 029 is where the student learns the hooks that *connect* a React component to anything outside the render contract: external systems, scheduling, and context. The senior framing is that `useEffect` is no longer the daily reach it was in 2020 — Server Components, Server Actions, `<Suspense>`, the `use()` primitive, and TanStack Query have absorbed the vast majority of what `useEffect` used to do. What remains is the narrow set of escape hatches a senior reaches for *deliberately*: synchronizing with a non-React subscription, integrating a third-party widget, reading a browser API React doesn't model. Every lesson lands the *should this be an effect at all?* question before any syntax.

Several threads run through every lesson. **Effects synchronize with the outside world; they don't run on render** — the cleanup-and-resync model is the contract from lesson 2 of chapter 029 and cashed in by every subsequent lesson. **Most "I need an effect" instincts are wrong in 2026** — the five-quadrant audit lands in lesson 4 of chapter 029 and forward-references the Next.js data path in chapter 035–chapter 036. **Strict Mode is the senior's free correctness test** — double-invocation surfaces missing cleanups and impurity before production. **Reactivity is what changes inputs to an effect** — `useEffectEvent` carves out the non-reactive seam so effects don't re-run on every keystroke. **Context is propagation, not a store** — value-changes-everything-re-renders is the daily footgun. **Concurrent rendering primitives mark *intent*, not *speed*** — `useTransition`, `useDeferredValue`, and `<Suspense>` tell React which updates are urgent. **`use()` is the new shape of "read this async thing"** — it replaces effect-based fetching with suspense-driven render. The chapter ships eight teaching lessons plus the quiz: Strict Mode (lesson 1 of chapter 029), `useEffect` (lesson 2 of chapter 029), `useEffectEvent` (lesson 3 of chapter 029), the "you might not need an effect" catalog (lesson 4 of chapter 029), `useContext` and re-render cost (lesson 5 of chapter 029), `useTransition`/`useDeferredValue` (lesson 6 of chapter 029), `use()` (lesson 7 of chapter 029), rules of hooks (lesson 8 of chapter 029). Forward references: chapter 030 (custom hooks, React Compiler), Chapter 5 (App Router data path, Server Actions, Suspense streaming), Chapter 11 (server-state caching).

---

## Lesson 1 — Strict Mode is the messenger

How `<StrictMode>` double-invokes renders, initializers, and the effect lifecycle in dev so impurity and missing cleanups surface before production.

Topics to cover:

- **The senior question.** A component looks fine in dev, ships to prod, and a user reports stale data after navigating away and back. The bug is a missing effect cleanup that Strict Mode would have surfaced on day one. The lesson installs `<StrictMode>` as the senior's free correctness test and lands the rule that code that breaks under Strict Mode is broken — Strict Mode is the messenger, not the bug.
- **What it is and where it lives.** A wrapper component (`<StrictMode>`) that opts a subtree into dev-time checks. Next.js wraps the app in Strict Mode by default; the student inherits it. Production builds run normally — zero runtime cost shipped.
- **What gets double-invoked.** In dev, Strict Mode intentionally double-invokes component function bodies, `useState`/`useReducer` initializers, `useMemo`/`useCallback` factories (memoization hooks — lesson 3 of chapter 030), and the *full effect lifecycle* (setup → cleanup → setup again on mount). Anything that should be pure runs twice; anything synchronizing with an external system gets a full mount/unmount/mount cycle so missing cleanups surface immediately.
- **The mount/unmount/mount cycle for effects.** On first mount in dev, React runs setup → cleanup → setup. If the effect subscribes (`addEventListener`, `setInterval`, WebSocket connect), the cleanup must unsubscribe — otherwise after the second setup the component holds two subscriptions. Canonical reproductions: an interval ID not cleared (fires twice), a request not aborted (two in flight), a listener not removed (handler fires twice per user event).
- **Why double-invocation surfaces purity bugs.** A render pushing to a module-level array doubles it. A `useState` initializer that writes to localStorage corrupts the resource. The fix is the contract from lesson 3 of chapter 027 — keep render and initializers pure. Strict Mode doesn't cause the bug; it makes a latent bug visible.
- **The Server Components interaction.** Server Components don't run under Strict Mode's double-invocation (they execute once per request on the server). Strict Mode applies at every `'use client'` boundary.
- **`useState` initializer gotcha.** `useState(() => expensiveCompute())` runs twice. If pure, harmless; if side-effectful (localStorage write, counter increment), the side effect runs twice. Same rule for `useReducer`'s `init` arg.
- **Race conditions exercised.** Two overlapping setups model the production scenario of rapid navigation. The fix is the canonical abort pattern (`AbortController` or an `ignore` flag), taught in lesson 2 of chapter 029.
- **The "don't fight Strict Mode" rule.** A junior reaches for a `useRef(false)` guard to suppress the second setup. This silences the warning but reintroduces the bug — React 19's concurrent rendering (Activity API, prefetching, transitions) legitimately mounts/unmounts/remounts. Write cleanups that make the second mount safe, not guards that prevent it.
- **The Activity API foreshadow.** React chapter 091's `<Activity>` lets components mount, get hidden (effects clean up), and remount without leaving the page. Strict Mode isn't a dev fiction; it models real production behavior. Recognition only; Chapter 5 owns the surface.
- **Other dev signals.** Console warnings for deprecated APIs, unsafe legacy lifecycles, string refs — students won't write these but should recognize the warning shape from legacy libraries.
- **Watch-outs:**
  - "Why does my effect run twice?" is almost always Strict Mode. Fix the cleanup, not the workaround.
  - `useState(() => fetch(...))` is a bug regardless of Strict Mode — initializers must be pure and synchronous.
  - Side-effectful render (an analytics call) fires twice — move to an effect or handler.
  - "Production seems fine" is the classic justification for ignoring warnings; the bug ships, it just hides until a user navigates fast enough.
  - Disabling Strict Mode globally to make tests pass is a smell — fix the cleanup, isolate incompatible libraries in a wrapper.
  - Strict Mode does *not* double-invoke event handlers, `setTimeout`, or `setInterval` callbacks — only render-time and effect-lifecycle code.

What this lesson does not cover:

- The `useEffect` API surface and cleanup mechanics — lesson 2 of chapter 029.
- `useEffectEvent` — lesson 3 of chapter 029.
- The Activity API and prerendering — Chapter 5 (recognition only).
- Hydration mismatches — Lessons lesson 5 of chapter 034–lesson 6 of chapter 034.
- The React Compiler's purity checks — lesson 2 of chapter 030.

---

## Lesson 2 — useEffect as synchronization

The `useEffect` signature, the setup/cleanup/resync lifecycle, the four canonical cleanup pairings, abort and ignore-flag race patterns, and the dependency-array contract.

Topics to cover:

- **The senior question.** A component needs to connect to a WebSocket on mount, disconnect on unmount, reconnect when the room ID changes. A non-React widget (chart, map, Stripe Elements) needs instantiation against a DOM node. A browser API (`IntersectionObserver`, `matchMedia`) needs subscription and cleanup. `useEffect` is the right tool for each — and almost nothing else in 2026.
- **The 2026 narrowing.** Data fetching moved to Server Components, route loaders, TanStack Query. URL syncing moved to `nuqs` and `useSearchParams`. Form state moved to Server Actions and `useActionState`. Derived values compute in render. Parent-driven resets use `key`. The lesson opens with this audit; effect's residual role is external systems React doesn't own.
- **The signature.** `useEffect(setup, dependencies?)` — `setup` returns `undefined` or a cleanup function. Three array forms: omitted (runs every render — almost always a bug), `[]` (mount only, cleanup on unmount), `[deps]` (re-runs when any dep changes by `Object.is`).
- **The lifecycle as synchronization, not lifecycle.** The effect's job is to make the outside world match current props and state. When inputs change, cleanup first, then re-setup. The canonical reproduction: a `roomId` prop change → disconnect old room → connect new room. The cleanup is not "happens on unmount"; it's "happens before next setup *and* on unmount."
- **The dependency-array contract.** Every reactive value read inside the setup belongs in deps. `react-hooks/exhaustive-deps` enforces this — when it flags a missing dep, the fix is almost always "add it," not "silence the rule."
- **The non-reactive trap.** An effect that needs to read a `currentUser` at *event time* but shouldn't *re-run* when the user changes — that's what `useEffectEvent` (lesson 3 of chapter 029) is for.
- **Cleanup discipline — the four canonical pairings.** `addEventListener` ↔ `removeEventListener`. `setInterval`/`setTimeout` ↔ `clear*`. Subscription `subscribe` ↔ returned `unsubscribe`. Resource `create` ↔ `destroy` (a chart instance, map instance, Stripe Elements). Every effect that creates anything outside React returns a cleanup that destroys it.
- **The abort-on-resync pattern.** When an effect kicks off a fetch, cleanup aborts: `const ctrl = new AbortController(); fetch(url, { signal: ctrl.signal }); return () => ctrl.abort();`. Taught here as the canonical race-condition fix even though most fetching shouldn't be in effects in 2026 — the pattern still matters for residual cases (SDK with `signal`, non-cacheable POST).
- **The "ignore" flag pattern for non-abortable async.** `let cancelled = false; doWork().then(r => { if (!cancelled) setResult(r); }); return () => { cancelled = true; };`. The two-prong race-condition discipline.
- **Object and array deps — the identity trap.** An object literal `{ id: 1 }` changes reference every render, re-runs the effect every render, and creates infinite loops if the effect calls `setState`. Fix: depend on primitives (`item.id`), memoize upstream, or restructure so the parent passes primitives.
- **Function deps.** A function defined inside the component re-creates every render. Fixes in order: (1) move inside the effect; (2) move outside the component if it doesn't capture reactive values; (3) `useCallback` only when the function passes to a memoized child (lesson 3 of chapter 030); (4) `useEffectEvent` for non-reactive event-shaped reads (lesson 3 of chapter 029).
- **`useLayoutEffect`.** Synchronous variant — runs after DOM commit, before browser paint. Reach for it when an effect must measure the DOM and synchronously update state to avoid a visible flicker (tooltip measuring content then positioning). Threshold: only when a flicker is the problem; otherwise `useEffect` is default. Recognition: `useInsertionEffect` is CSS-in-JS-library territory.
- **`useSyncExternalStore` — recognition only.** When a value lives outside React (a `window` event, a third-party store, a `BroadcastChannel`), this is the correct primitive — it integrates with concurrent rendering's tearing-prevention. Daily app code rarely reaches for it; consumer-side libraries (Zustand, `useSearchParams`) already use it.
- **Effects and the Server/Client boundary.** Effects only run in Client Components. The senior reflex: when a component "needs an effect," check whether it could be a Server Component reading data directly. Cross-reference chapter 034.
- **Watch-outs:**
  - Reading state in an effect *to update state* is a smell — usually means the value should be derived in render (lesson 2 of chapter 028).
  - Returning a Promise from setup is a type error — setup is synchronous. Do async work in an inner function and remember the cleanup.
  - Cleanups run in reverse order across multiple effects in the same component — usually irrelevant, occasionally matters.
  - Mutating a dep inside the effect breaks invariants — never mutate; produce a new value.
  - Effects don't run during SSR — anything that must run on first paint reaches for `use()` (lesson 7 of chapter 029) or moves to a Server Component.

What this lesson does not cover:

- `useEffectEvent` — lesson 3 of chapter 029.
- The "you might not need an effect" catalog — lesson 4 of chapter 029.
- `useContext` — lesson 5 of chapter 029.
- Concurrent primitives — lesson 6 of chapter 029.
- `use()` — lesson 7 of chapter 029.
- Rules of hooks and lint — lesson 8 of chapter 029.
- TanStack Query — Chapter 11.
- Suspense and streaming — Chapter 035.

---

## Lesson 3 — useEffectEvent and the non-reactive seam

How `useEffectEvent` lets an effect read latest props and state without re-running, the reactive vs. non-reactive distinction, and the call-site restrictions that make it safe.

Topics to cover:

- **The senior question.** A chat-room component connects to a WebSocket on mount, reconnects when `roomId` changes, and on every incoming message calls `onMessage(message, currentUser)`. The reflex says `onMessage` and `currentUser` belong in deps — but adding them re-runs the effect (disconnect-reconnect) when the user changes, which is wrong: changing user shouldn't drop the connection. `useEffectEvent` (stable in React chapter 091) is the seam: a callback that *reads* the latest props and state but is *excluded* from deps.
- **The signature.** `const onMessageEvent = useEffectEvent((message) => { onMessage(message, currentUser); });`. Returns a function that reads latest values each call but has no stable identity and *cannot* be called outside an effect, layout effect, or another Effect Event. The lint rule (in React chapter 091+) understands it and won't ask for it in deps — and *will* flag a call outside allowed contexts.
- **Reactive vs. non-reactive — the bright line.** A value is *reactive* if changes should *cause resynchronization*. Room ID is reactive (disconnect-reconnect). Current user is non-reactive in this scenario. `onMessage` is non-reactive (a parent's fresh callback shouldn't reconnect the socket). Audit every reactive value the effect reads.
- **The canonical replacements.** Before `useEffectEvent`: stash the latest value in a ref (leaked stale closures through timing cracks) or wrap every callback in `useCallback` (still re-ran on legit changes). Both disappear in 2026 — `useEffectEvent` is the platform answer.
- **The three canonical reaches.** (1) Event-shaped callbacks from props — a chart's `onPointClick` wrapped, dropped from deps. (2) Analytics/logging from inside an effect — the trigger is reactive, the *values logged* are not. (3) Reading mutable state at an interval — the polling interval is set on mount, the `pollNow` function reads latest filter state each tick.
- **The rules.** Only callable inside effects or other Effect Events. Never during render. Never passed as a prop or returned from a hook (unstable identity makes it useless downstream). Excluded from dep arrays. Body should be event-shaped — read latest values, perform an action.
- **Why the call-site restriction matters.** Calling during render would read mutable state during render — the same impurity that breaks the React Compiler (lesson 3 of chapter 027 / lesson 2 of chapter 030). Calling from a regular handler is tolerated by the runtime but defeats the purpose; ordinary handlers already see latest values via closure.
- **Difference from `useCallback`.** `useCallback` produces a *stable* function whose body closes over its render — same stale-closure problem if deps are wrong. `useEffectEvent` produces an *unstable* function whose body always reads latest values; the trade is restricted call sites.
- **Difference from a ref.** A ref-based pattern (`callbackRef.current = callback` in an effect, then `callbackRef.current()` in another) works for some cases but has timing gaps and no lint enforcement. `useEffectEvent` is the same pattern with first-class support.
- **Audit before reaching.** Audit whether the effect is needed (lesson 4 of chapter 029) first. This hook is for the residual cases where an effect is genuinely warranted; not a license to keep effects that should be handlers, derived values, or Server Components.
- **Status in 2026.** Stable since React chapter 091 (October 2025). Available in Next.js 16. ESLint plugin understands it. No experimental flag.
- **Watch-outs:**
  - Calling from a regular handler defeats the design — use a normal function or `useCallback`.
  - Passing as a prop loses meaning and is lint-flagged — wrap on the consumer side.
  - The body should be event-shaped — don't declare hooks, derive state, or branch in ways that should drive re-renders.
  - "Wrap everything so I don't have to think about deps" is the abuse mode — converts reactive logic to non-reactive and breaks synchronization.

What this lesson does not cover:

- The "you might not need an effect" catalog — lesson 4 of chapter 029.
- `useCallback` thresholds — lesson 3 of chapter 030.
- React Compiler effect handling — lesson 2 of chapter 030.
- Custom hooks wrapping effects — lesson 1 of chapter 030.

---

## Lesson 4 — You probably don't need an effect

The five-quadrant audit (derive, handle, server, cache, sync) and the catalog of effect anti-patterns paired with their correctly shaped replacements.

Topics to cover:

- **The senior question.** A junior writes a `useEffect` to update a derived value, reset a form when a prop changes, log an analytics event on click, fetch on mount, and compute next state from previous. Four out of five are wrong — not because effects are bad, because each has a better-shaped tool. The lesson is the canonical audit: every senior anti-pattern named, paired with the right shape.
- **The five-quadrant audit.** Before adding an effect, ask: (1) Is this value *derived* from existing props/state? → compute in render (lesson 2 of chapter 028). (2) Triggered by a *user interaction*? → event handler. (3) *Initial data* the page needs? → Server Component or route loader (Chapter 5). (4) *Cached server state*? → TanStack Query or `use()` (Chapter 11). (5) *Synchronizing with an external system* React doesn't own? → effect. Only (5) warrants `useEffect`.
- **Anti-pattern: derived state via effect.** `useState(0)` for `totalPrice` + `useEffect(() => setTotalPrice(sum(items)), [items])`. Fix: `const totalPrice = sum(items)` in render. Two renders collapse to one; stale state disappears. (Cross-ref lesson 2 of chapter 028.)
- **Anti-pattern: resetting state when a prop changes.** `useEffect(() => setDraft(record), [record])` for an editable form. Fix: `<EditForm key={record.id} record={record} />` — the `key` reset (lesson 5 of chapter 027).
- **Anti-pattern: adjusting state on prop change (partial reset).** Keep edits but reset *one* field on prop change. The narrow documented pattern: `setState` during render, conditionally, with a previous-value ref. Shown but flagged — `key` reset handles 95%.
- **Anti-pattern: event-handler logic in an effect.** Toast after save, navigate after submit, analytics on click. Trigger is the action, not a prop/state change. Fix: do the work in the handler.
- **Anti-pattern: chains of state updates via effects.** State A → effect sets B → effect sets C. Three renders for one logical change. Fix: compute B and C in the handler that triggers A, or use `useReducer` (lesson 4 of chapter 028) for atomic transitions.
- **Anti-pattern: initial data fetch in `useEffect`.** `useEffect(() => fetch().then(setData), [])`. Fix path: (1) Server Component awaits directly (chapter 034); (2) `use()` if parent passes a promise (lesson 7 of chapter 029); (3) TanStack Query for client cache, polling, optimistic updates (Chapter 11). The residual effect-fetch case is a code-review red flag.
- **Anti-pattern: subscribing to a parent's state via effect.** A child reads a prop/context, copies to local state via effect, uses local. Updates are one render late. Fix: read the prop/context directly.
- **Anti-pattern: deriving expensive values via effect with `useState`.** `useEffect(() => setProcessed(expensiveTransform(input)), [input])`. Fix: compute in render and let the React Compiler memoize (lesson 2 of chapter 030); fall back to `useMemo` if needed.
- **Anti-pattern: communicating to a parent via effect.** Child wants to notify parent "I changed state X" via `useEffect(() => props.onChange(state), [state])`. Notification is one render late; loops are easy. Fix: call `props.onChange` in the same handler that updates state, or lift state (lesson 3 of chapter 028).
- **Anti-pattern: storing a "previous value" via effect.** `useEffect(() => { prevRef.current = value })`. Legitimate exception — it *is* synchronization with an external store (the ref). The `usePrevious` custom hook (lesson 1 of chapter 030).
- **Legitimate effect cases — the residual surface.** (1) WebSocket / EventSource / BroadcastChannel. (2) Third-party widget taking a DOM node (chart, map, Stripe Elements, video). (3) Browser APIs not React-aware (`matchMedia`, `IntersectionObserver`, `ResizeObserver`, scroll listeners). (4) Native `<dialog>`/`<details>` state synchronization. (5) Non-React script-tag widget initialization.
- **The senior code-review heuristic.** Two questions: "What external system does this synchronize with?" and "What does the cleanup do?". Empty cleanup + no external system = suspect the effect should be a handler, a Server Component fetch, or derived in render.
- **The accumulation trap.** A codebase with 80 effects across 200 components is almost guaranteed to have ordering bugs, races, loops, stale closures somewhere. Every effect is maintenance liability; reach for `useEffect` only when nothing else fits.
- **Watch-outs:**
  - "I'll just use an effect" is the lazy reach; "what shape *should* this be?" is the correct reflex.
  - `useEffect(() => setX(...))` with no cleanup is almost always one of the anti-patterns.
  - The fix isn't always "remove the effect" — sometimes it's "move to a Server Component," which is a larger refactor.
  - Effects depending on derived values depending on more derived values signal `useReducer` (lesson 4 of chapter 028).
  - `eslint-disable react-hooks/exhaustive-deps` is rarely the fix — `useEffectEvent` (lesson 3 of chapter 029) is the seam for legitimate cases.

What this lesson does not cover:

- `useEffect` mechanics — lesson 2 of chapter 029.
- `useEffectEvent` — lesson 3 of chapter 029.
- `key` reset — lesson 5 of chapter 027.
- Server Component data — Chapter 034, chapter 036.
- TanStack Query — Chapter 11.
- Suspense / streaming — Chapter 035.

---

## Lesson 5 — useContext without the re-render storm

`useContext` as propagation primitive, the every-consumer-re-renders footgun, and the three mitigations: split contexts, separate state from dispatch, and stable provider values.

Topics to cover:

- **The senior question.** A SaaS app has a current user, theme, feature-flag map, locale, notifications queue — values needed by components scattered across the tree. Prop-drilling through fifteen layers is wrong. Bundling them in one context also costs: every consumer re-renders whenever *any* field changes. The lesson installs `useContext` as the propagation primitive, lands the perf footgun, and teaches the mitigations.
- **The signature.** `const Context = createContext<T | null>(null)`. Provider in React 19: `<Context value={current}>...</Context>` (the shorter form; `.Provider` still works). Consumers: `const value = useContext(Context)` or `use(Context)` — the latter adds conditional reads (lesson 7 of chapter 029).
- **What context is for.** Cross-cutting *infrastructure*: auth user, active org, theme, locale, i18n translator, feature flags, router instance. Values that change rarely or with broad scope. Used by Better Auth (Unit 9), theme provider (chapter 031), Next router.
- **What context is *not* for.** A drop-in for three-layer prop drilling (pass the prop). Server state (TanStack Query / Server Components). Form state (the form component, Chapter 7). High-frequency updates (per-keystroke, per-scroll) — re-render cost dominates.
- **Default value and the null-check pattern.** `createContext<User | null>(null)` requires consumers to handle null. Senior pattern: a wrapper hook that throws on missing — `function useCurrentUser() { const ctx = useContext(UserContext); if (!ctx) throw new Error('...'); return ctx; }`. Converts a runtime null into fail-fast error at the import site; rest of the codebase reads a non-nullable type.
- **The re-render rule — the footgun.** When the provider's `value` changes by `Object.is`, every consumer re-renders, regardless of which field they read. A theme toggle re-renders every consumer of a bundled global context.
- **Mitigation #1: split the context.** Instead of one `AppContext`, three: `UserContext`, `ThemeContext`, `LocaleContext`. Consumers subscribe to what they use. Theme changes only re-render theme consumers. One context per cohesive concern.
- **Mitigation #2: separate state from dispatch.** A reducer-backed context exposing `state + dispatch` re-renders dispatch-only consumers on every state change. Fix: two contexts — `StateContext` and `DispatchContext`. Dispatch is reference-stable; pure-dispatch consumers never re-render on state changes. The canonical pattern for reducer-in-context.
- **Mitigation #3: stable provider values.** `<Context value={{ user, theme }}>` creates a new object every render. Fix: `useMemo` the value, or pass a stable reference (the state object directly). The React Compiler (lesson 2 of chapter 030) handles this automatically when analysis succeeds; manual `useMemo` is the fallback.
- **The compiler interaction.** The compiler auto-memoizes provider values when the component is pure. When it succeeds, the manual `useMemo` ceremony disappears. When DevTools shows it didn't, `useMemo` is the manual fallback.
- **Composition.** Each context owns its provider. Compose at the root: `<AuthProvider><ThemeProvider><LocaleProvider>...</LocaleProvider></ThemeProvider></AuthProvider>`. Deep nesting is unsightly but cheap; a `composeProviders` helper is recognition territory.
- **Server/Client boundary.** Server Components can't consume Client contexts directly. Pattern in Next.js: a Client Component `<ProvidersWrapper>` holds all contexts; Server Components above pass data as props into Client Components below. Cross-ref chapter 034.
- **Reading with `use(Context)`.** Same primitive plus one capability `useContext` lacks — conditional reads, including after early returns. `if (!enabled) return null; const value = use(Context);` is legal. (lesson 7 of chapter 029 owns the surface.)
- **Watch-outs:**
  - "Every consumer re-renders on context change" — split before it becomes a perf problem.
  - `useContext` deep in a frequently re-rendering tree magnifies cost — measure with the Profiler.
  - A provider with object literals in JSX re-renders every consumer every parent render — compiler usually fixes this; otherwise `useMemo`.
  - "Use context to avoid the prop" for three-layer drill is overkill — pass the prop or use composition (children).
  - Storing setter and value in the same context bundles read+write cohesion — split.
  - Server-component providers don't exist; the Server Component *renders* the provider but doesn't read.
  - Zustand/Jotai are the right move when state is *application state* (mutated from many places, sliced into subscribers), not infrastructure — Unit 16.

What this lesson does not cover:

- `use(Context)` conditional reads — lesson 7 of chapter 029.
- Server/Client boundary — Chapter 034.
- React Compiler memoization — lesson 2 of chapter 030.
- Manual `useMemo` / `memo` thresholds — lesson 3 of chapter 030.
- Zustand and external stores — Unit 16.
- Better Auth's session provider — Chapter 9.

---

## Lesson 6 — Marking updates as non-urgent

`useTransition` and `useDeferredValue` as priority markers (not speed boosts), the wrap-the-setter vs. wrap-the-value cut, async transitions, and the Suspense interaction that keeps old UI visible.

Topics to cover:

- **The senior question.** A type-ahead has an instant-updating input and a slow result list — every keystroke janks. A tab-switch click triggers a heavy re-render, freezing the click animation. A filter applies and the table re-renders for 300ms. Each is a *priority* problem: the input/click is urgent, the downstream re-render is non-urgent. `useTransition` and `useDeferredValue` tell React which is which.
- **The mental model — urgency, not speed.** React's concurrent renderer can interrupt low-priority work for higher-priority updates. The primitives don't make rendering faster; they reorder which work blocks the user. `startTransition` marks an update as low-priority; React commits the urgent update first and the transition in the background, optionally showing a pending state.
- **`useTransition` — the signature.** `const [isPending, startTransition] = useTransition()`. Wrap a state update: `startTransition(() => setFilter(value))`. `isPending` is `true` from start to commit — useful for spinners, dimming, disabling.
- **The canonical reach — input + slow filter.** The input's `onChange` updates two states: urgent `setQuery(value)` (the controlled input, must paint immediately) and transitional `startTransition(() => setFilter(value))` (drives the slow list). React commits the input first; the list updates in the background.
- **Async transition pattern (React 19+).** `startTransition(async () => { const data = await fetchData(); setData(data); })`. The async runs inside the transition; `isPending` stays `true` until commit. Foundation Server Actions build on — every `<form action={...}>` and `useActionState` dispatch is implicitly a transition. Cross-ref Chapter 7.
- **`useDeferredValue` — the signature.** `const deferredQuery = useDeferredValue(query, initialValue?)`. Returns a value that *lags* — when `query` updates, the deferred value keeps the previous for one render, then re-renders at low priority with the new. Optional `initialValue` (React 19+) for SSR with a placeholder.
- **`useDeferredValue` — the canonical reach.** When you can't control the *setter* (third-party input, library hook), wrap at the *consumer*. `const deferredQuery = useDeferredValue(query); return <SlowList query={deferredQuery} />`. The slow list re-renders against the deferred value; the input stays responsive.
- **`useTransition` vs. `useDeferredValue` — the cut.** Wrap the *setter* when you control where state updates. Wrap the *value* when you only observe. Same downstream behavior; different side of the data flow.
- **Suspense + transition interaction.** When a transition's render reads a suspending resource (a `use()` of a promise, a tripped Suspense), React keeps the *previous* committed UI visible during the transition instead of unmounting to a fallback. This is what makes transitions feel smooth.
- **Combining with `useMemo` for compounding wins.** The deferred value passed into a `useMemo` (or compiler auto-memo) means the expensive computation only runs when the deferred updates — not every keystroke.
- **The threshold — when these earn their weight.** (1) Measurable jank (the user notices, typically >50ms). (2) Genuinely large work (sorting thousands of items, complex viz). (3) The React Compiler hasn't already memoized it away. Premature blanket-wrapping adds complexity without payoff.
- **Server Actions and transitions — recognition.** Server Action runs (form submit, `useActionState.formAction`, or `startTransition(async () => action())`) are transitions. `useFormStatus().pending` and `useActionState.isPending` surface from the same mechanism. (Chapter 7.)
- **What these are not.** Not a debounce (use a debounce hook or `useDeferredValue`'s lag). Not a way to make slow code fast (just reorders priority). Not a substitute for `<Suspense>` at route boundaries — Suspense is for *initial* load; transitions keep old UI visible *during* an update. Not relevant to non-React work (a slow `setTimeout`).
- **Compiler interaction.** Compiler doesn't replace these; it complements. Compiler memoizes pure computation to make non-deferred renders faster; the primitives mark *which* updates can wait.
- **Watch-outs:**
  - `startTransition(setX)` (passing the setter directly) doesn't work — call it inside the function.
  - State inside a transition isn't delayed — `setX(v)` still queues a commit; only *priority* changes.
  - `isPending` is `true` during the transition's render *and* any suspending resources — using it for spinners covers both.
  - Wrapping the input's own value in `useDeferredValue` is wrong — that's the urgent path. Wrap the consumer.
  - Effects depending on a deferred value see the deferred value, not current — usually correct, occasionally a trap.
  - "Use `useTransition` for everything" misses the threshold. Default is no transition; reach when measurable jank exists.
  - A transition can be interrupted — a new transition starting before the previous commits abandons the previous work. Correct behavior.
  - Standalone `startTransition` from the React import does the same priority marking without `isPending` — useful from module-scope utilities.

What this lesson does not cover:

- `use()` and Suspense — lesson 7 of chapter 029.
- `<Suspense>` and streaming — Chapter 035.
- `useOptimistic` — Chapter 7.
- `useFormStatus` and `useActionState` — Chapter 7.
- Server Actions at depth — Chapter 7.
- Debounce/throttle hooks — lesson 1 of chapter 030.
- The Profiler — lesson 3 of chapter 030.

---

## Lesson 7 — Reading promises with use()

The `use()` primitive for unwrapping promises into Suspense and reading context conditionally, the stable-promise rule, and the Server-to-Client streaming pattern that replaces effect-based fetching.

Topics to cover:

- **The senior question.** A Server Component awaits a database query and passes the resulting `Promise` to a Client Component child. The child shouldn't `await` (Client Components aren't async), shouldn't `useEffect` (the 2020 anti-pattern), shouldn't `useState` + spinner (also 2020). It should *read* the promise inside a Suspense boundary and let React suspend until it resolves. `<Suspense fallback={...}>` is a boundary that renders the fallback while descendant components throw a pending Promise; wrapping granularity is the subject of lesson 1 of chapter 035. `use()` is the primitive: unwraps a Promise (suspending if unresolved) or a Context (with one capability `useContext` lacks: conditional reads).
- **The signature.** `const value = use(resource)` — `resource` is `Promise<T>` or `Context<T>`. Returns `T`. Promise pending → throws to nearest Suspense boundary. Resolved → returns value. Rejected → throws to nearest error boundary. Context → returns current value, callable conditionally.
- **The rule that breaks rules of hooks — for `use()` only.** Can be called conditionally, after early returns, inside loops. The lint has a special exemption. Reason: `use()` doesn't depend on call-order matching across renders; it reads a resource and decides whether to suspend. Named explicitly — students should not generalize.
- **Promise use case — Server → Client streaming.** A Server Component starts a slow query and passes the *unawaited* promise: `<ClientList items={getItems()} />`. The child: `const items = use(itemsPromise)`. While pending, React suspends; the parent's `<Suspense fallback>` shows. When resolved, the child renders. The canonical pattern for streaming data server → client without `useEffect` and without blocking the rest of the page.
- **Context use case — conditional reads.** `useContext` must be at the top, before any early return. `use(Context)` can be anywhere. Rarely needed but solves a real pain — a component returning `null` for disabled state and reading context only when enabled.
- **What `use()` does not do.** It does not subscribe to a promise's resolution and re-render. It throws to Suspense, which renders the fallback, then re-renders the component when the promise resolves. From the component's view, it's synchronous: get a value or interrupt the render.
- **The "cache the promise" rule.** The Promise must be referentially stable across renders for the same logical resource. Creating a new promise inside the component every render (`use(fetch('/api/data'))`) is wrong — every render creates a new fetch, suspends, never resolves. Senior pattern: create in a Server Component (one run per request) or pass from a stable holder. For client-only async, TanStack Query (Chapter 11).
- **`cache()` from React.** Server-only — deduplicates calls to the same function with the same args within a request: `const getUser = cache(async (id) => db.user.findUnique({ id }))`. With `use()`, multiple components reading the same resource share one fetch. (Chapter 036 owns the full data path.)
- **Error handling — error boundaries.** A rejected promise throws to the nearest error boundary, which renders its fallback. Pattern: wrap regions with `<ErrorBoundary>` (from `react-error-boundary` or hand-rolled) and `<Suspense>` for loading. (Unit 17 for error patterns.)
- **Comparison to `useEffect` + state.** Old: `useEffect(() => fetch().then(setData), []); if (!data) return <Spinner />`. Two renders, manual loading, manual error, manual cleanup, no SSR. New: `const data = use(promise)`. One render, Suspense for loading, error boundary for errors, works in SSR.
- **Comparison to TanStack Query.** TanStack Query handles client-side server-state with cache, polling, invalidation, optimistic updates. `use()` is the lower-level primitive — closer to the metal, no caching, no automatic refetch. Senior reflex: initial server-rendered fetch with simple reads → `use()` + Server Components. Interactive data with cache, mutations, invalidation → TanStack Query. They compose (TanStack Query's `useSuspenseQuery` uses Suspense, which `use()` taps into).
- **`use()` in Server Components.** Server Components can `await` directly — `use()` is unnecessary there. It shines in Client Components reading promises from Server Component parents and in conditional context reads. Don't sprinkle `use()` where `await` would do.
- **Action-side counterparts.** `useActionState`, `useFormStatus`, `useOptimistic` — taught in Chapter 7. Together they form the React 19 "read async resources" surface. Forward reference only.
- **Watch-outs:**
  - Creating a promise inside the component body is wrong — must be stable from a parent or `cache()`.
  - `use()` reading a promise without `<Suspense>` above suspends the whole tree — wrap at the right granularity.
  - Error boundary placement matters — too high blanks the whole region; too low and it doesn't catch.
  - `use()` doesn't deduplicate — two children reading the same `promiseA` each suspend independently; `cache()` deduplicates the *function call*.
  - Conditional `use(Context)` is fine; conditional `use(promise)` that varies across renders can cause inconsistent suspense behavior — keep the resource stable.
  - `use()` isn't a replacement for `useEffect`'s synchronization with external systems.
  - Browser-only promises (timers, `setTimeout`) coordinating with UI usually want `useEffect` + `useState` or `useDeferredValue` — `use()` is for *resource* reads.

What this lesson does not cover:

- `<Suspense>` and streaming SSR — Chapter 035.
- Server Components and the data path — Chapter 034, chapter 036.
- `cache()` at depth — Chapter 036.
- Server Actions, `useActionState`, `useFormStatus`, `useOptimistic` — Chapter 7.
- TanStack Query's `useSuspenseQuery` — Chapter 11.
- Error boundaries at depth — Unit 17.

---

## Lesson 8 — Rules of hooks and the lint that enforces them

Why hooks must run at the top level in the same order every render (the indexed-slot mechanic), the `use*` naming contract, and the two ESLint rules that enforce structure and dependencies.

Topics to cover:

- **The senior question.** Hooks have unstated rules that make them work: same hooks, in the same order, every render. Violating produces unpredictable bugs — `useState` returning the wrong slot, `useEffect` running for the wrong deps, `useRef` pointing at the wrong instance. The rules are simple to state, easy to violate, easy to enforce with lint. The lesson names them explicitly (per "explicit over magic"), explains *why* they exist (React identifies hook instances by call order), and lands the lint setup.
- **Rule 1: only at the top level of a component or another hook.** Never inside conditionals, loops, or after early returns. Every render must execute the same sequence in the same order. Canonical violation: `if (props.show) { const [x] = useState(0); }` — first render runs `useState`, second skips it, slot misaligns, next `useState` reads the wrong slot.
- **Rule 2: only from React function components or other hooks.** Not from utility functions, handlers, or class components. Hooks rely on render-time tracking; calling outside a render breaks the contract. Custom hooks (prefixed `use*`, lesson 1 of chapter 030) are legitimate composition.
- **The exception: `use()`.** As taught in lesson 7 of chapter 029, callable conditionally. The lint has a built-in exemption. Reason: `use()` doesn't rely on call-order matching. The lesson reinforces this as the *one* deviation — students should not generalize.
- **Why the rules exist — the indexed-slot metaphor.** React doesn't track hooks by name. On render, it advances an internal "current hook index" on each call: 0 → `useState` → 1 → `useEffect` → 2 → `useState`. The next render expects the same sequence. A conditional hook breaks indexing — index 1 might be `useEffect` on render one and `useState` on render two, and React mismatches state.
- **The naming convention — `use*` as contract.** Any function calling a hook must be named `use*`. This signals to the lint that the function obeys the rules and may call other hooks. `getThing` calling `useState` is a lint error.
- **Setup: `eslint-plugin-react-hooks`.** Two rules — `react-hooks/rules-of-hooks` (calling rules) and `react-hooks/exhaustive-deps` (dependency arrays for `useEffect`, `useMemo`, `useCallback`, custom hooks via `additionalHooks`). Both ship in the default Next.js ESLint config. Comments-disabling either is almost always a smell.
- **`rules-of-hooks` failures.** Hook inside `if`, hook after early `return`, hook inside a callback or handler, hook in a non-`use*` function, hook in a class method. Each has a specific fix — usually restructuring so the hook is at the top.
- **`exhaustive-deps` warnings.** Triggers when an effect (or `useMemo`/`useCallback`) reads a reactive value not in its deps. The fix is almost always "add the dep." Exclusions the lint understands: `useEffectEvent`-wrapped functions (lesson 3 of chapter 029), refs (`ref.current`), stable `useState` setters.
- **`additionalHooks` config.** Custom hooks that take a dep array (e.g., a `useDebounced(value, delay)`) can be added to the `additionalHooks` regex so the lint enforces deps on them too. Students writing custom hooks (lesson 1 of chapter 030) should opt in.
- **When to disable lint — narrow cases.** (1) Intentional one-time effect where adding a dep would cause undesired re-runs *and* `useEffectEvent` doesn't fit (extremely rare; document with a comment). (2) A library hook with non-standard semantics the lint doesn't understand. (3) A complex dep that's intentionally referentially stable from upstream. Each requires a comment explaining why; bare `// eslint-disable-next-line` is a code-review red flag.
- **Compiler-plus-lint.** With the React Compiler enabled (lesson 2 of chapter 030), `exhaustive-deps` is less critical — the compiler analyzes and inserts the right deps. `rules-of-hooks` remains critical regardless; the compiler doesn't change the indexed-slot mechanic. Keep both rules on.
- **The DevTools angle.** When a rules-of-hooks violation slips past lint (a hot-reload edge, a library doing something unusual), React throws at runtime: "Rendered fewer hooks than expected." The error names the component; fix is auditing for conditional calls.
- **Watch-outs:**
  - `if (props.show) { const [x] = useState(0); }` is the textbook violation — slot misaligns.
  - `if (!data) return <Spinner />; const [x] = useState(0)` — the early return makes the hook conditional. Move all hooks above any early return.
  - `items.map((_, i) => useEffect(...))` — hooks in a loop where iteration count can change. Lift the iteration into a child component with one hook per instance.
  - `function onClick() { const [x] = useState(0); }` — hook inside a handler, not a component or custom hook.
  - A custom hook named `getThing` (no `use*` prefix) calling `useState` — lint flags both name and implication.
  - The lint can't catch a hook called from a renamed-to-`use*` utility that doesn't actually obey the rules — naming is a contract, not enforcement.
  - `use(Context)` and `use(promise)` are the deliberate exception — don't generalize.
  - Class components don't have hooks. A library boundary requiring a class wraps a function component that owns hooks and passes results down.

What this lesson does not cover:

- Custom hooks at depth — lesson 1 of chapter 030.
- React Compiler's interaction with `exhaustive-deps` — lesson 2 of chapter 030.
- Full project ESLint config — Chapter 003.
- `useEffectEvent` exclusions — lesson 3 of chapter 029.

---

## Lesson 9 — Quizz

Top 10 topics to quiz:

- Strict Mode's double-invocation contract — what gets double-invoked (renders, initializers, effect mount/cleanup/mount), why it surfaces missing cleanups, the rule that fighting Strict Mode reintroduces the bug it catches.
- The `useEffect` lifecycle as synchronization, not lifecycle — setup, cleanup-then-setup on dep change, cleanup on unmount; the four cleanup pairings (listener, timer, subscription, resource); abort and `ignore`-flag patterns.
- The narrowed 2026 role of `useEffect` — residual cases (external subscriptions, third-party widgets, browser APIs) and what replaced effect-based fetching (Server Components, `use()`, TanStack Query).
- `useEffectEvent` for non-reactive logic — reactive vs. non-reactive (cause resynchronization vs. read latest values); the three canonical reaches (event-shaped props, analytics, polling reads); call-site restriction.
- The "you might not need an effect" audit — the five-quadrant chart (derive, handle, server, cache, sync) and canonical anti-patterns (derived state, prop-driven reset, chain of effects, fetch-on-mount, child-to-parent notify).
- `useContext` and the re-render footgun — value-change re-renders all consumers; three mitigations (split contexts, separate state from dispatch, stable provider values via compiler or `useMemo`).
- `useTransition` vs. `useDeferredValue` — wrap-the-setter vs. wrap-the-value; urgency-not-speed framing; threshold (measurable jank, large work, compiler doesn't help); Suspense keeps old UI visible.
- `use()` for promises and contexts — the conditional-call exemption; Server-to-Client streaming pattern; stable-promise requirement and `cache()` companion.
- The rules of hooks (top level, function-component or `use*`-function, no conditionals, `use()` exception) — the call-order/indexed-slot mechanic and why violations produce slot-misalignment bugs.
- ESLint enforcement — `react-hooks/rules-of-hooks` (structural, never disable) and `react-hooks/exhaustive-deps` (dependencies, rarely disable); compiler-plus-lint relationship and when each is the right layer.
