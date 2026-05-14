# Chapter 4.10 — Custom hooks and the compiler-era memoization cut

## Chapter framing

Chapter 4.9 closed the built-in hook surface. Chapter 4.10 is the wrap-up of Unit 4's hook arc: how to compose hooks into reusable behaviors (custom hooks) and how the React Compiler reshapes the rules around manual memoization. The senior framing is that the React 19 + Next.js 16 + Compiler stack of 2026 has eliminated 90% of what used to be daily React performance work — `useMemo`, `useCallback`, and `React.memo` are no longer the first reach, custom hooks are no longer the only way to share stateful logic, and `dynamic()` is no longer the default answer to bundle size. Every lesson lands what's now automatic, what remains a deliberate senior reach, and the precise threshold that separates the two.

Several threads run through every lesson. **Custom hooks are about composition, not abstraction** — they exist when a stateful behavior is reused or when extracting clarifies a complex component, not as a default refactor. **The React Compiler is opt-in but the default for new SaaS projects in 2026** — the lesson teaches the wiring explicitly per "explicit over magic." **Manual memoization is now an escape hatch, not a discipline** — the four narrow cases where `useMemo`/`useCallback`/`memo` still earn their weight are named precisely, and everything else gets cut. **The compiler doesn't change the rules of hooks or the effect contract** — earlier chapters' purity guarantees and dependency arrays still hold; the compiler simply removes the manual memoization wrapper. **What to stop hand-tuning matters as much as what to keep** — `useMemo` everywhere, premature `dynamic()`, and reference-equality gymnastics are 2020 reflexes that hurt 2026 codebases. The chapter ships three teaching lessons plus the quiz: custom hooks (4.10.1), the React Compiler (4.10.2), manual memoization thresholds (4.10.3). Forward references: 4.11 (shadcn/ui composition patterns), 4.12 (chapter project consuming `useLockBodyScroll`), Chapter 5 (Server Components and the data path), Chapter 11 (TanStack Query and server-state caching), Chapter 20 (Profiler and performance vigilance).

---

## Lesson 4.10.1 — Extracting custom hooks

The `use*` naming contract, the share-code-not-state rule, the three-condition extraction threshold, canonical hook shapes and generics, and the 2026 catalog of useful custom hooks.

Topics to cover:

- **The senior question.** Three components each track an `IntersectionObserver` to lazy-load images. The same six lines of `useEffect` + `useRef` + `useState` appear in each. A junior copies and pastes; a senior extracts a `useIntersection` hook. The lesson lands the *when* — a behavior is reused, or extraction clarifies a tangled component — and the *how* — naming, composition, and what custom hooks share vs. don't.
- **What a custom hook is.** A plain JavaScript function whose name starts with `use` and that calls one or more hooks. No special API, no registration. The naming is the contract: the `use*` prefix tells the lint and the reader "this obeys the rules of hooks."
- **What custom hooks share — and what they don't.** Calling the same custom hook in two components shares the *code*, not the *state*. Each call gets its own `useState`, its own `useEffect`, its own ref. The mental model: a custom hook is a recipe for wiring, executed fresh per consumer. State sharing requires lifting (Chapter 4.8.3), context (Chapter 4.9.5), or an external store (Unit 16).
- **The canonical extraction shape.** Inputs as arguments; outputs as the return (a single value, a tuple, or an object). Tuples for "state plus actions" patterns (`const [value, setValue] = useLocalStorage(key, initial)`); objects when there are three or more outputs (`const { data, loading, error } = useFetch(url)`). Pick one and hold to it across the codebase.
- **When a custom hook earns its weight — the threshold.** (1) The behavior is used in two or more components and the wiring is non-trivial. (2) A single component has a tangled hook block where extraction reveals intent (the component file is the *only* user, but readability wins). (3) An external system (browser API, third-party SDK) needs effect + state + ref wiring that should be encapsulated. Anything short of these is premature.
- **When a custom hook is the wrong move.** A two-line `useState` "wrapped" in `useToggle` adds friction without revelation. A "hook" with no internal hooks is just a function — drop the `use*` prefix and ship it as a utility. A custom hook that takes a callback as input and calls it from an effect almost always wants `useEffectEvent` (4.9.3) inside.
- **Canonical examples — the catalog of useful custom hooks in 2026.** Each named with its shape and the failure it prevents:
  - `useLocalStorage(key, initial)` — synchronized read/write to `localStorage` with SSR-safe initial value via `useSyncExternalStore`. Used by the project in 4.12.
  - `useMediaQuery(query)` — `matchMedia` subscription with cleanup. Reach for it over `window.innerWidth` polling.
  - `useIntersection(ref, options)` — `IntersectionObserver` for lazy-load and scroll-spy patterns.
  - `useDebounced(value, delay)` and `useThrottled(value, delay)` — value-shaped, not callback-shaped, so deferred values flow through deps naturally.
  - `useLockBodyScroll()` — toggles `overflow: hidden` on `body` with cleanup. The 4.12 project consumes this.
  - `usePrevious(value)` — the legitimate effect-driven previous-value pattern from 4.9.4.
  - `useCopyToClipboard()` — wraps the Clipboard API with a transient "copied" state.
  - `useOnClickOutside(ref, handler)` — pointer-down listener with the `useEffectEvent` (4.9.3) inside for the non-reactive handler.
- **Composing hooks — the second-order pattern.** Custom hooks call other custom hooks. A `useFilteredList(items, filterKey)` might internally call `useDeferredValue` and `useMemo`. A `usePaginatedData(query)` might call `useSearchParams` and a fetch hook. Composition is the daily mode; flatten only when nesting hides intent.
- **Effect Event inside a custom hook.** When a custom hook takes a callback prop (`useOnClickOutside(ref, onOutsideClick)`), the consumer doesn't memoize. Inside the hook, wrap `onOutsideClick` with `useEffectEvent` so the effect doesn't re-run when the callback identity changes. The pattern that makes hook APIs ergonomic.
- **Generic typing.** Use generics for hooks that pass values through: `function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void]`. The type flows from the call site (`useLocalStorage('draft', '')` infers `T = string`).
- **Testing custom hooks.** The hook lives outside React's tree, so unit tests render it inside a small test component or use a library wrapper. Recognition only here — Chapter 19 owns the testing surface.
- **The `additionalHooks` lint hook-up.** Custom hooks that take a dep array (`useDebounced(value, delay)` doesn't, `useInterval(callback, deps)` might) should be added to the `react-hooks/exhaustive-deps` `additionalHooks` regex so the lint enforces deps on them too (cross-ref 4.9.8).
- **The compiler interaction.** The React Compiler analyzes custom hooks like any function. A pure custom hook gets auto-memoization. The compiler does not change *how* you write them — same rules of hooks, same dep arrays. Forward to 4.10.2.
- **Watch-outs:**
  - A `use*`-prefixed function that doesn't call any hooks is misnamed — drop the prefix.
  - A hook returning a different shape across calls (sometimes a tuple, sometimes an object) breaks call sites — pick one signature and hold.
  - A hook reading values from outside its arguments leaks the consumer's render scope into the hook — pass values in as arguments.
  - A custom hook that "wraps" `useEffect` and accepts a callback re-runs the effect every render when the callback identity changes — wrap the callback with `useEffectEvent` inside.
  - Calling a custom hook conditionally is the same rules-of-hooks violation as calling a built-in hook conditionally.
  - "Make a hook for everything" reflex — premature extraction is the same kind of wrong as premature optimization.
  - Naming `useGetUser` vs. `useCurrentUser` — name for the behavior, not the implementation. `useCurrentUser` reads like English; `useGetUser` leaks the verb.

What this lesson does not cover:

- The React Compiler and auto-memoization — Lesson 4.10.2.
- Manual `useMemo`/`useCallback`/`memo` thresholds — Lesson 4.10.3.
- `useSyncExternalStore` at depth — Lesson 4.9.2 (recognition).
- `useEffectEvent` mechanics — Lesson 4.9.3.
- Testing hooks — Chapter 19.
- TanStack Query as a server-state hook system — Chapter 11.
- Zustand / Jotai as cross-component state — Unit 16.

---

## Lesson 4.10.2 — The React Compiler

What the compiler auto-memoizes, how to enable it in Next.js 16 (`reactCompiler: true` plus `babel-plugin-react-compiler`), the annotation mode for incremental adoption, the `'use no memo'` escape hatch, and how to verify it via the DevTools `Memo` badge.

Topics to cover:

- **The senior question.** A 2024 React codebase carries `useMemo` and `useCallback` on every value and callback, `React.memo` on every leaf component, and still re-renders too much because the wrapping has gaps. The React Compiler — stable in React 19 and Next.js 16 as of late 2025 — analyzes components and auto-inserts memoization at the boundaries that actually matter. The lesson installs it, lands what it does, and frames the mental shift: memoization is no longer something the engineer writes.
- **Status in May 2026.** React Compiler 1.0 is stable. In Next.js 16, `reactCompiler` is a stable config option but not on by default — the senior turns it on as a deliberate choice. Next.js ships a custom SWC-based optimization that runs the compiler only on relevant files for faster builds compared to the raw Babel plugin. Named explicitly per "explicit over magic": you opt in, you understand what changes.
- **What the compiler does — the contract.** Static analysis of component and hook bodies. Wraps values, JSX, and callbacks in compiler-managed memo slots that behave identically to `useMemo`/`useCallback`/`memo` at runtime but are driven by the compiler's data-flow analysis. The output is regular memoized React code; nothing magical at runtime.
- **What gets auto-memoized.** Derived values (the in-render computations from 4.8.2 and 4.9.4). Object and array literals passed as props (`<Child config={{ ... }} />` no longer reference-tanks the child). Callbacks defined inside the component (`<Child onClick={() => ...} />` is stable across renders when its deps don't change). Provider values (`<Context value={{ a, b }}>` is auto-stabilized). JSX subtrees that don't depend on changed values get reused.
- **Enabling it in Next.js 16.** Install `babel-plugin-react-compiler`. Set `reactCompiler: true` in `next.config.ts`. That's the full wiring — no per-file annotation needed for full-coverage mode. Verify in DevTools: the Components panel shows `Memo ✨` badges on auto-memoized components.
- **Incremental adoption — the annotation mode.** For migrating large legacy codebases, set `reactCompiler: { compilationMode: 'annotation' }` so only files starting with `'use memo'` are processed. Validate on a small subset, expand, eventually flip to full coverage. For greenfield SaaS in 2026 the default is full coverage from day one.
- **The opt-out — `'use no memo'`.** A file-level directive that disables the compiler for that file. Reach for it when a component breaks under the compiler (almost always because of a rules-of-hooks or purity violation the compiler exposes). Use as a *temporary* escape while you fix the underlying violation, not a permanent waiver.
- **What the compiler does not do.** It does not rewrite effects. It does not change the rules of hooks. It does not eliminate `useEffect` dependency arrays. It does not memoize impure code — if the analysis detects a rules-of-React violation (mutation during render, hook called conditionally, side-effectful initializer), it *skips* the component and warns. Cross-reference: the purity contract from 4.7.3 is the price of admission.
- **What the compiler exposes.** Codebases that "worked" because manual memoization papered over impurity reveal their bugs under the compiler. A component mutating a prop, an initializer pushing to a module-level array, a render call to a side-effectful function — the compiler refuses to optimize and the warning surfaces the underlying issue. The lesson frames this as a feature, not a friction: the compiler is the messenger.
- **Compiler + `exhaustive-deps`.** With the compiler on, `exhaustive-deps` is less critical for `useMemo`/`useCallback` (you stop writing them), but it still owns `useEffect` and custom hooks with dep arrays. Keep the rule on. Cross-ref 4.9.8.
- **Compiler + `useEffectEvent`.** No conflict. `useEffectEvent` carves the non-reactive seam; the compiler doesn't touch it. Together they handle the two halves of the effect problem.
- **Compiler + ref forwarding.** React 19 removed `forwardRef`'s ceremony — `ref` is a normal prop. The compiler handles components reading `ref` from props transparently.
- **Verifying it's working — the senior workflow.** Open React DevTools Components panel; auto-memoized renders show the `Memo ✨` badge. Use the Profiler to confirm a child no longer re-renders when an unrelated parent state changes. The badge presence is the contract; the Profiler is the proof.
- **Performance — what to expect.** Typical SaaS apps see modest baseline wins (5–15% fewer re-renders, faster interactions). Apps with measurable wasted-render problems can see large wins. Apps already manually memoized see no meaningful change. The win isn't always speed; it's the deletion of memoization ceremony from the codebase.
- **Build cost.** SWC-based path is fast. Babel-only path (non-Next projects) adds noticeable compile time. Next.js 16's integration is the senior default.
- **Library compatibility.** Compatible with shadcn/ui (4.11), Better Auth (Unit 9), Drizzle queries through Server Components (Chapter 5), TanStack Query (Chapter 11). Incompatibilities are rare and surface as compiler warnings, not silent breakage.
- **Watch-outs:**
  - "I'll keep my `useMemo`s just in case" — leaving manual memoization in place can change the compiler's output in subtle ways and effects relying on reference stability can over-fire. Don't mass-delete blind, but plan a deliberate cleanup as you touch files.
  - The compiler does not retrofit purity. Components with mutation, side-effectful renders, or rules-of-hooks violations get skipped — the fix is the violation, not `'use no memo'`.
  - DevTools without `Memo ✨` badges in compiled code = the file is being skipped. Audit for purity issues.
  - "Use the compiler everywhere including legacy code" — annotation mode is the migration path for legacy; full coverage is for greenfield and audited code.
  - Auto-memoization doesn't help if the *parent* of an expensive subtree keeps changing its identity — the compiler optimizes within each component, not across boundaries it can't see.
  - `'use no memo'` at the top of a file the compiler chokes on silences the warning but ships the original perf characteristics. Treat as TODO.

What this lesson does not cover:

- Custom hook composition — Lesson 4.10.1.
- Manual memoization escape hatches — Lesson 4.10.3.
- The purity contract — Lesson 4.7.3.
- Rules of hooks — Lesson 4.9.8.
- React DevTools Profiler at depth — Chapter 20.3.
- Bundle splitting and `dynamic()` decisions — Lesson 4.10.3 (the cut), Chapter 20.3 (depth).

---

## Lesson 4.10.3 — Memoization as escape hatch

The four narrow cases where `useMemo` / `useCallback` / `React.memo` still earn their weight, the 2020-era reflexes to stop (blanket memoization, premature `dynamic()`, blanket `<Suspense>`), and the measure-then-memoize workflow with comment discipline.

Topics to cover:

- **The senior question.** With the React Compiler on, when does an engineer in 2026 still reach for `useMemo`, `useCallback`, or `React.memo`? And what 2020-era performance reflexes should they stop using altogether? The lesson names the narrow surface where manual memoization still earns its weight and cuts the rest — `useMemo` everywhere, premature `dynamic()`, and reference-equality gymnastics that the compiler now handles automatically.
- **The mental shift.** Manual memoization went from *discipline* (wrap everything, never re-render unnecessarily) to *escape hatch* (reach for it when you need a *specific* memoization guarantee the compiler can't provide). The default is no wrapper; the reach is justified by a measured cause.
- **The four cases where manual memoization still earns its weight.**
  1. **Reference-stable value feeding a `useEffect` dep array.** When an effect depends on an object or function whose identity matters (not just its content) — e.g., an SDK that re-subscribes on identity change. `useMemo` guarantees the reference; the compiler may or may not, depending on analysis. Code review red flag: `useMemo` here without a comment naming the consumer.
  2. **Integration with libraries that read by reference equality.** `react-hook-form`'s `watch` callbacks, some chart libraries' option objects, certain Zustand selectors. The library's contract demands a stable reference; the compiler can't know that. Wrap the value with `useMemo`/`useCallback` at the integration point.
  3. **Measured expensive computation the compiler skipped.** A heavy sort, a tokenizer, a fuzzy-match build — and the Profiler confirms it runs every render. The compiler may skip when it can't prove purity or when inputs are complex. Manual `useMemo` is the patch. Cross-ref Chapter 20.3 for the Profiler workflow.
  4. **A leaf component that must never re-render unless specific props change.** Truly hot paths — a virtualized list row, a canvas drawing component, a chart that re-paints expensively. `React.memo` with a custom comparator gives the guarantee. Rare; document the measurement.
- **`useMemo` — the signature, briefly.** `const memoized = useMemo(() => compute(a, b), [a, b])`. Returns the same reference when deps are unchanged by `Object.is`. The compiler usually beats it for in-render derived values; the residual case is reference-stability for downstream consumers.
- **`useCallback` — the signature, briefly.** `const handler = useCallback((e) => doThing(e, value), [value])`. Sugar for `useMemo` returning a function. Same compiler-eaten default; same residual escape-hatch role.
- **`React.memo` — the signature, briefly.** `const Row = memo(function Row({ item }) { ... })`. Skips re-render when props are shallowly equal. The compiler memoizes JSX subtrees automatically when prop references stabilize; `memo` is the explicit guarantee at a boundary you've measured.
- **The `memo` comparator.** Second arg: `memo(Row, (prev, next) => prev.item.id === next.item.id)`. Reach when the default shallow check is wrong (an object prop where only one key matters). Rare and code-smelly; usually the fix is restructuring props to pass the primitive.
- **Stop hand-tuning: `useMemo` on every value.** The 2020 reflex of wrapping every derived value in `useMemo` is now actively counterproductive — adds noise, can interfere with the compiler's analysis, and trains the brain to write ceremony instead of code. The lesson explicitly names this as the largest cleanup opportunity in legacy codebases.
- **Stop hand-tuning: `useCallback` on every handler.** Same shape, same reflex, same cut. `onClick={() => setOpen(true)}` is fine without `useCallback`. The compiler handles stability where it matters.
- **Stop hand-tuning: `memo` on every component.** Wrapping every leaf in `React.memo` is a pattern from a pre-compiler era. The compiler memoizes JSX subtrees automatically; `memo` is now a targeted instrument.
- **Stop hand-tuning: premature `dynamic()`.** `next/dynamic` for code-splitting was the 2020 reflex for any component imagined as "heavy." In 2026 the defaults are different: Server Components don't ship to the client, route-level code splitting is automatic, and the App Router lazy-loads route segments. Reach for `dynamic()` only when a measured client bundle includes a component the user rarely renders (a modal opened by 5% of sessions, a chart library only used on one tab). Cross-ref Chapter 20.3.
- **Stop hand-tuning: blanket `<Suspense>` boundaries.** A `<Suspense>` around every component imagined as slow is the same reflex. Place boundaries at meaningful UX boundaries — a route segment, a slot in a parallel route, a region with its own loading state. Cross-ref Chapter 5.3.
- **The senior workflow — measure, then memoize.** The order matters: turn on the compiler, run the Profiler, find the actual hot spot, apply the targeted escape hatch with a comment. Never the reverse. "Performance work" without measurement is decoration.
- **Profiler primer.** React DevTools Profiler records renders, shows which components rendered, why, and how long. The senior workflow: record interaction → look for components rendering when their props didn't change → audit. Recognition only here; Chapter 20.3 owns the full surface.
- **Comment discipline.** Every manual memoization in a 2026 codebase should carry a one-line comment naming the reason — "SDK requires stable ref," "Profiler shows X ms in sorting," "Library reads by reference equality." Without it, the next reader assumes 2020 reflex and deletes.
- **Migrating from a manual-memoization codebase — the order.** (1) Enable the compiler in annotation mode. (2) Add `'use memo'` to a small audited file. (3) Delete its manual `useMemo`/`useCallback`/`memo` ceremony, run tests, profile. (4) Expand. (5) Flip to full coverage. (6) Final pass: delete remaining ceremony, leaving only the four-case residual.
- **Watch-outs:**
  - `useMemo` "for safety" with no consumer that needs reference stability is dead weight.
  - `useCallback` wrapping a handler that's only ever attached to one element is dead weight.
  - `memo` on a component whose parent never re-renders is dead weight.
  - `dynamic(() => import('./Modal'))` for a 2 KB component on a hot path costs more in a roundtrip than it saves in bundle.
  - Reaching for memoization before measuring is the inverse of senior practice.
  - Memoizing around library quirks without comment leaves the next reader to re-discover the integration constraint.
  - `useMemo(() => fetch(...), [])` is not a cache — it's a closure trick that breaks under suspense and concurrent rendering. The right tool is `cache()` or TanStack Query.
  - "The compiler can't possibly be right" — trust DevTools' badge; if it's not memoizing, the cause is in your code, not the compiler.

What this lesson does not cover:

- Custom hooks — Lesson 4.10.1.
- React Compiler config and behavior — Lesson 4.10.2.
- Profiler workflow at depth — Chapter 20.3.
- `dynamic()` and bundle analysis at depth — Chapter 20.3.
- `<Suspense>` boundary placement — Chapter 5.3.
- Server Component bundle elimination — Chapter 5.2.
- TanStack Query and server-state caching — Chapter 11.

---

## Lesson 4.10.4 — Quizz

Top 10 topics to quiz:

- Custom hook fundamentals — the `use*` naming convention, the lint contract that the prefix carries, the rule that custom hooks share code not state.
- When a custom hook earns its weight — the three-condition threshold (reused, clarifies, encapsulates) vs. the premature-extraction reflex.
- Custom hook shapes — tuple vs. object return, generic typing, accepting callbacks and wrapping them with `useEffectEvent` to keep effect dep arrays stable.
- The 2026 canonical custom-hook catalog — `useLocalStorage`, `useMediaQuery`, `useIntersection`, `useDebounced`, `useLockBodyScroll`, `usePrevious`, `useOnClickOutside` — and what each prevents.
- React Compiler — what it is (Babel-plugin-based static analyzer), what it auto-memoizes (derived values, callbacks, JSX subtrees, provider values, object/array literal props), and what it doesn't touch (effects, rules of hooks).
- Enabling the compiler in Next.js 16 — install `babel-plugin-react-compiler`, set `reactCompiler: true`, verify via the `Memo ✨` badge in DevTools; annotation mode for incremental migration.
- What the compiler exposes — purity violations get skipped with warnings, surfacing latent rules-of-React bugs; `'use no memo'` is a temporary escape, not a fix.
- The four cases where manual memoization still earns its weight — feeding a `useEffect` dep, integrating reference-equality-sensitive libraries, measured expensive computations the compiler skipped, hot-path `React.memo` guarantees.
- What to stop hand-tuning — `useMemo` everywhere, `useCallback` on every handler, blanket `React.memo`, premature `dynamic()`, blanket `<Suspense>` boundaries; the measure-then-memoize workflow.
- Migration from manual-memoization codebases — annotation-mode entry, file-by-file cleanup, profile-driven validation, the comment discipline that documents every residual escape hatch.
