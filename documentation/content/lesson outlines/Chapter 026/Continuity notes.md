# Chapter 026 — Custom hooks and the compiler-era memoization cut

## Lesson 1 — Extracting custom hooks

**Taught.** Custom hooks as composition (a `use`-named function calling hooks): the `use` prefix as lint+reader contract; share-code-not-state (recipe-vs-dish); return shapes (bare value / tuple-when-ordered / object-when-named, pick one and hold); generics so type flows from call site (`<T,>` trailing-comma .tsx gotcha); three-condition extraction threshold (reuse / clarity / encapsulation) + over-extraction inverse; `useEffectEvent`-inside-the-hook for callback-accepting hooks (`useOnClickOutside`); composing hooks from hooks; SSR-safe `useLocalStorage` on `useSyncExternalStore` (subscribe/getSnapshot/getServerSnapshot); the 2026 catalog (recognition only); `additionalHooks` ESLint config for dep-array hooks.

**Debts.**
- React Compiler (auto-memoizes pure hooks, doesn't change how you write them) — foreshadowed in one Aside, owned by L2.
- Manual `useMemo`/`useCallback`/`memo` thresholds — owned by L3; deliberately silent here (no manual memoization appears in any sample, per code convention).
- External store for cross-component shared state — one clause, recognition only, forward to Unit 15.
- `useSearchParams` (Next.js URL query hook) — one clause in composing section, forward to ch033 App Router.
- Chapter 028 project consumes `useLocalStorage` and `useLockBodyScroll` — named as forward-refs, not built.
- `useSyncExternalStore` depth, `useEffectEvent` mechanics, rules-of-hooks indexed-slot why — recapped only, owned by ch025 (L2/L3/L8).

**Terminology.** "custom hook = recipe; each consumer cooks its own dish" (share-code-not-state mental model). "The `use` prefix is a contract/promise, not decoration." "value-shaped vs callback-shaped" hooks (`useDebounced` is value-shaped). Three extraction conditions named: reuse / clarity / encapsulation. "leave it inline" / "ship to `lib/`" as first-class non-extraction verdicts.

**Patterns and best practices.**
- Hooks bound to `const` as arrow functions (default form, same as components/callbacks).
- Annotate return type when the signature is itself the lesson / for exported functions.
- Hookless `use`-named functions are misnamed — drop prefix, ship from `lib/` with verb-led name.
- Hook return shape: tuples when order is the meaning, objects when names are; never conditional within one hook.
- Callback-accepting hooks wrap the caller's handler with `useEffectEvent` so the effect depends only on stable values (e.g. `[ref]`), never thrashing; caller passes inline arrows freely.
- Prefer value-shaped hook APIs over dep-array-shaped; reserve dep-array shape (+ `additionalHooks` upkeep) for the rare hook needing caller-controlled re-runs.
- `useLocalStorage` reference implementation (generic, tuple return, `useSyncExternalStore` with `getServerSnapshot` returning `initial` for SSR/hydration safety, try/catch in getSnapshot, `storage` event dispatch for same-tab sync) — the canonical version a later project should match.

**Misc.**
- Catalog hooks future lessons/projects can assume the student recognizes (not memorizes): `useLocalStorage`, `useMediaQuery`, `useIntersection`, `useDebounced`/`useThrottled`, `useLockBodyScroll`, `usePrevious`, `useCopyToClipboard`, `useOnClickOutside`.
- `usehooks-ts` named as the vetted library to reach for instead of re-deriving.
- Cut from outline scope: testing custom hooks (outline listed it as recognition-only; omitted entirely here — Unit 18 owns it). The `useGetUser` vs `useCurrentUser` naming watch-out from the chapter outline was not surfaced.
- Practice exercise is a `useOnlineStatus` extraction (online/offline window events), not the outline's fallback `useToggle`/counter; tests assert rendered-output equivalence only since the harness renders only `App`.
- Share-code-not-state uses a bespoke `RecipeNotState` figure (not the outline's `RenderTracking` option).
- Outline said "no video"; build added two `VideoCallout`s (Darius Cosden extraction walkthrough; Cosden Solutions on `useSyncExternalStore`) — later lessons can assume video is acceptable in this chapter.
- `useFetch` example returns `{ data, isLoading, error }` (object shape, three+ outputs).

## Lesson 2 — The React Compiler

**Taught.** The React Compiler as a build-time tool that inserts the `useMemo`/`useCallback`/`memo` equivalent automatically (output is ordinary memoized React, no runtime engine); static data-flow analysis decides what to memoize; Next.js pipeline (SWC selects JSX/hook files → Babel plugin transforms → ordinary shipped output); the five auto-memoized cases (in-render derived values, object/array literal props, in-component callbacks, provider values, JSX subtrees); enabling in Next.js 16 (`pnpm add -D babel-plugin-react-compiler` + `reactCompiler: true` in `next.config.ts`, full coverage no per-file opt-in); annotation mode (`reactCompiler: { compilationMode: 'annotation' }` + `'use memo'` directive) as legacy migration on-ramp only; the four boundaries the compiler will NOT touch (effects, rules of hooks, dependency arrays, impure code — skips+warns rather than miscompiling); compiler-as-messenger (a skip surfaces a latent purity bug, fix the violation not the message); `'use no memo'` temporary escape hatch (ships unoptimized behavior, treat as TODO); verification workflow (`Memo ✨` badge = processed-not-rerender-free; Profiler = proof); performance expectation (~5–15% fewer re-renders, real win is deleted ceremony).

**Cut.** Library-compatibility roster (shadcn/Better Auth/Drizzle/TanStack named compatible in outline) collapsed to nothing here — only `useEffectEvent` and ref-as-prop interactions kept; compatibility statement dropped. Compiler + `exhaustive-deps` interaction (outline bullet) not surfaced as its own beat.

**Debts.**
- The narrow surface where manual `useMemo`/`useCallback`/`memo` still earns its weight — explicitly pointed at twice (lesson closes on it), owned by L3.
- Full file-by-file migration workflow (cleanup order, residual-memoization handling) — named annotation mode as entry only, owned by L3.
- Profiler at depth (flame graphs, timings, full record-and-read loop) — recognition only ("the proof tool"), owned by Chapter 094.
- Purity contract as price of admission — recapped, owned by ch023 L3.
- `useEffectEvent` non-reactive seam, rules of hooks + two ESLint rules, ref-as-normal-prop — recapped only (ch025 L3/L8, ch024 L5).

**Terminology.** "memoization stops being something you write" (the chapter's mental-shift one-liner). "The compiler is a messenger, not a magician." `Memo ✨` badge = "processed," NOT "never re-renders." "auto-memoization" (compiler-inserted vs hand-written). "Rules of React" (umbrella term: pure render + hook ordering). "escape hatch" defined as a deliberate, documented opt-out. `'use memo'` / `'use no memo'` directives.

**Patterns and best practices.**
- `reactCompiler: true` is the greenfield default; new SaaS projects turn it on day one and delete the manual `useMemo`/`useCallback`/`memo` reflex — no manual memoization in any recommended sample (this lesson is the justification for that course-wide convention).
- `next.config.ts` shape: `import type { NextConfig } from 'next'`, typed `const nextConfig: NextConfig`, default export (sanctioned framework-named carve-out), single quotes, 2-space indent, trailing commas.
- Purity is the price of admission — a missing badge in a compiled build means audit the file, never silence with `'use no memo'`; `'use no memo'` only as a TODO-tagged temporary measure.
- `eslint-plugin-react-hooks@7.x` carries the compiler diagnostics (in-render mutation, broken manual memo) and runs alongside Biome — violations surface in-editor before DevTools.
- Don't sort/mutate a prop array in render (`items.sort()`); copy first (`[...items].sort()`).

**Misc.**
- The impure example (`items.sort()` in render) is an intentional teaching anti-pattern, flagged as such — not a shape to copy. Component fragments kept to ~6 lines, arrow-bound `const`, typed props; downstream agents should not expand into production files.
- Outline marked video optional; build added two `VideoCallout`s (Lydia Hallie "React Compiler Internals" build-time pipeline; Cosden Solutions "The Problem With the React Compiler" — the badge-isn't-a-guarantee Profiler walkthrough). Consistent with L1 also carrying video.
- Five auto-memoized cases delivered as a prose bullet list (not the outline's `CardGrid`); the `RenderTracking` widget illustrates only the inline-object-prop case (App+Sidebar, authored render counts) — L3's inverse `RenderTracking` figure relies on this contrast.

## Lesson 3 — Memoization as escape hatch

**Taught.** Manual memoization as escape-hatch-not-discipline (default is no wrapper; reach justified by a measured or contractual cause + one-line comment); the four residual cases where `useMemo`/`useCallback`/`memo` still earn weight — (1) stable ref an effect's dep array depends on, (2) library that reads by reference equality (stabilize at the integration point), (3) Profiler-measured expensive in-render computation, (4) hot-path leaf guarded with `React.memo`; the three signatures shown by hand for the first/only time (`useMemo`, `useCallback` as sugar for `useMemo` returning a fn, `memo` shallow-prop bailout); `memo` comparator (2nd arg) named as a smell, fix is restructuring props; the 2020 reflexes to delete (blanket `useMemo`/`useCallback`/`memo`, premature `next/dynamic`, blanket `<Suspense>`); `useMemo`-is-not-a-cache trap; measure-then-memoize order (compiler on → Profiler → find hot spot → targeted wrapper + comment); the legacy cleanup order (annotation mode → opt one file → delete+test+profile → expand → full coverage → final four-case-residual pass).

**Cut.** Chapter-outline pinned Profiler/`dynamic()` depth to "Chapter 094"; lesson forward-refs the **performance-vigilance unit (Unit 19) generally** rather than a chapter number (TOC's ch094 has no dedicated Profiler lesson) — later writers should keep this vaguer forward-ref until Unit 19 lessons exist.

**Debts.**
- Profiler at depth (flame graphs, full record-and-read loop) — recognition only, forward to Unit 19 (performance vigilance), NOT a specific chapter.
- `next/dynamic`, bundle analysis, tree-shaking — named as a reflex to stop; depth owned by Unit 19; Server-Components-ship-zero-client-JS reason forward-refs ch030.
- `<Suspense>` boundary placement / the async files / streaming — named as a reflex to stop; owned by ch031.
- React `cache()` (request-scoped dedup, server) — named as the right tool for the not-a-cache trap, forward to Unit 4 / ch032.
- TanStack Query (client-side server-state caching) — named as the right tool for the not-a-cache trap, forward to Unit 15 / ch076.
- `react-hook-form` (ch045) and Zustand (Unit 15) — named at one line each as reference-equality-sensitive integrations (case 2), recognition only.
- Effects + dependency-array contract, purity contract — recapped only (ch025, ch023 L3).

**Terminology.** "escape hatch" = a deliberate, documented departure from the default, pulled for a specific named reason (reused from L2). "memoization went from discipline to escape hatch." "the comment is the only thing that tells a justified escape hatch apart from ceremony" (load-bearing comment discipline). "integration point" = the line where your code hands a value across the boundary into a library. `Object.is` and "shallowly equal" defined as `CodeTooltips`. "Profiler" defined as a `Term`. "measure, then memoize" (the fixed order).

**Patterns and best practices.**
- The course-wide rule that justifies no-manual-memoization-in-samples: a manual `useMemo`/`useCallback`/`memo` is allowed ONLY for one of the four cases and ALWAYS carries a one-line comment naming the cause (e.g. `// Profiler: rankMatches ran 18ms on every keystroke, inputs unchanged`, `// stable ref: SDK re-subscribes on options identity change`, `// chart library reads this by reference equality`). An uncommented wrapper is read as a 2020 reflex and deleted.
- Case 2 (library reference-equality) is the most common real reach in a 2026 app — stabilize at the integration point, comment with the library name.
- `memo` custom comparator is a smell — restructure props to pass the primitive the component needs rather than hand-writing a comparison.
- A future project codebase consuming `react-hook-form`/Zustand/charting libs should carry these commented escape hatches at the exact integration points, never blanket wrapping.

**Misc.**
- Two intentional anti-patterns shown to be named-and-avoided, flagged in prose — do NOT lift into production files: `useMemo(() => fetch(url).then(r => r.json()), [])` (not-a-cache trap) and `memo(Row, (prev, next) => ...)` (custom comparator).
- The `RenderTracking` blanket-memo-vs-compiler figure is deliberately the inverse of L2's: both implementations light the *identical* boxes to prove the blanket `memo` bought nothing (L2's contrasted differing re-render counts).
- This lesson reconciles the convention's three reach-cases (a/b/c) with the outline's four: cases 1+2 = convention (b) referential equality, case 3 = (a) measured bottleneck, case 4 = (c) precise control.
- Render counts in the `RenderTracking` widget are authored/simulated, not observed from a real tree (correct for an illustrative before/after).
- The discipline-vs-escape-hatch two-column figure is a bespoke `DisciplineVsEscapeHatch.astro` (lessons/026/3/), not inline HTML+CSS as the outline suggested.
- Two `VideoCallout`s added (Cosden Solutions "The Problem With the React Compiler" reused from L2; Web Dev Simplified Profiler/measure-first preview) — consistent with L1/L2 carrying video.
