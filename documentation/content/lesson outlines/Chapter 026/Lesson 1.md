# Lesson outline — Extracting custom hooks

## Lesson title

- Title: `Extracting custom hooks`
- Sidebar label: `Custom hooks`

## Lesson framing

This is lesson 1 of chapter 026, the wrap-up of Unit 3's hook arc.
Chapter 024 installed the hooks that hold state; chapter 025 the hooks that connect to the outside world.
This lesson teaches how to *compose* those built-ins into reusable named behaviors — and, more importantly, *when* extraction earns its weight and when it's premature.

The senior thesis to land: **custom hooks are about composition, not abstraction.**
A custom hook is not a default refactor reflex; it exists when a stateful behavior is reused, when extracting untangles a busy component, or when an external system needs encapsulated effect+state+ref wiring.
The single most important mental model: a custom hook is a *recipe for wiring, executed fresh per consumer* — calling the same hook in two components shares the **code**, not the **state**.
This is where beginners stumble hardest (they expect `useCounter()` in two places to share a count), so it gets a dedicated section with a diagram.

The student already knows every primitive this lesson composes (`useState`, `useReducer`, `useRef`, `useEffect`, `useEffectEvent`, `useContext`, `useDeferredValue`, the rules of hooks, the `use*` naming contract foreshadowed in chapter 024 lesson 1 and owned by chapter 025 lesson 8).
So the lesson spends *zero* time re-teaching primitives and *all* its budget on the four new things: (1) the naming-is-the-contract rule, (2) share-code-not-state, (3) the extraction threshold and its inverse (the over-extraction smell), and (4) the canonical 2026 catalog with its idioms (tuple-vs-object shape, generics, `useEffectEvent`-inside-the-hook for callback props).

Pedagogical spine: open with the copy-paste-three-times pain (the concrete senior question), reveal the extraction, then formalize. Lead with decisions, illustrate with code.
Cognitive-load management: the catalog is large; do NOT dump all eight hooks as full implementations. Teach two in depth (`useLocalStorage` as the flagship — it touches SSR-safety, generics, and the project payoff; `useOnClickOutside` as the `useEffectEvent`-inside vehicle), present the rest as a compact reference card naming shape + the failure each prevents. This keeps the lesson about *judgment*, not a copy-paste library.

The compiler interaction is deliberately a *foreshadow only* (one short section): the compiler analyzes custom hooks like any function and auto-memoizes pure ones; it does not change how you write them. Lesson 2 owns the compiler. Manual `useMemo`/`useCallback`/`memo` thresholds are lesson 3 — do not pre-empt either.

Two interactive moments earn their place: a `StateMachineWalker` "should I extract?" decision funnel (the lesson's judgment lives in the order of questions), and one `ReactCoding` exercise where the student extracts a tangled component into a hook (active practice of the core skill). A `Buckets` drill sorts "hook vs. plain utility vs. leave-inline." No video — the concepts are short and code-centric; a video would dilute.

## Lesson sections

### Introduction (no header — opening prose)

Open with the senior question verbatim from the chapter outline, made concrete: three components in a SaaS dashboard each lazy-load images with the *same* six lines of `useRef` + `useEffect` + `useState` wiring an `IntersectionObserver`. A junior copy-pastes the block a fourth time; a senior extracts `useIntersection`.
State the lesson goal: by the end the student can decide *whether* to extract, name the hook correctly, choose its return shape, and recognize the 2026 catalog.
Connect to prior knowledge in one sentence: "You already have every hook this lesson composes — now you'll learn to package them."
Keep it to ~4 short paragraphs, warm and terse. No "what is a function" scaffolding.

Reasoning: per the pedagogical guidelines, the introduction states the goal, motivates with a concrete problem, and connects to prior knowledge — the senior question is delivered implicitly through the pain, not as a labeled section.

### A custom hook is a function that calls hooks

Define it plainly: a custom hook is an ordinary JavaScript function whose name starts with `use` and that calls one or more hooks (built-in or other custom hooks). No special API, no registration, no React import beyond the hooks it uses.
Land the key reframe: **the `use*` prefix is the contract, not decoration.** It tells the ESLint plugin "apply the rules of hooks to this function" and tells the reader "this obeys those rules — call it at the top level, unconditionally." (Cross-ref chapter 025 lesson 8 for *why* the rules exist; do not re-derive the indexed-slot mechanic here — one sentence of recap max.)
Show the extraction of the `useIntersection` teaser from the intro as the first concrete hook so the definition lands on the example the student is already holding.

Use `CodeVariants` with two tabs to make the before/after vivid:
- Tab "Inline (×3)": one component with the raw `useRef`+`useEffect`+`IntersectionObserver` block, captioned "Repeated verbatim in three components."
- Tab "Extracted": the `useIntersection(ref, options)` hook definition plus the one-line call site, captioned "One recipe, called wherever the behavior is needed."

This is the canonical "incorrect-reflex / correct-shape" comparison `CodeVariants` is built for.

Add a short note (inline prose, not an Aside-only section): the corollary watch-out — **a `use*`-named function that calls no hooks is misnamed.** If it's pure data-shaping with no hooks inside, drop the prefix and ship it as a `/lib` utility. Naming a plain function `use*` lies to the lint and the reader.

Reasoning: this section establishes the definition and the naming contract together because in 2026 the contract *is* the definition — there's no separate API to teach. Leading with the worked extraction keeps it concrete.

Terms for `Term` tooltips in this section:
- `rules of hooks` — "Hooks must be called at the top level of a component or another hook, in the same order every render. Enforced by `react-hooks/rules-of-hooks`."

### Same hook, separate state

This is the lesson's load-bearing mental model and the #1 beginner misconception, so it gets its own section and a diagram.
Land the rule: calling the same custom hook in two components shares the **code** (the wiring recipe), never the **state**. Each call site gets its own `useState` cell, its own `useEffect` subscription, its own ref. Nothing is shared between instances.
Use the analogy explicitly: a custom hook is a recipe, each component that uses it cooks its own dish. Two cooks following one recipe don't share a plate.
Name the consequence: if you *want* shared state across components, a custom hook is the wrong tool — you need lifting (chapter 024 lesson 3), context (chapter 025 lesson 5), or an external store (forward-ref Unit 15, recognition only, one clause).

Diagram — `RenderTracking` is the right component here (it models a tree of "components" with per-node state/render badges and supports tabs for comparison). Build a small two-instance illustration:
- A tree with two sibling components `<SearchField/>` and `<FilterField/>`, each calling `useDebounced(value, 300)`.
- Tag each node so the badges show each maintains an *independent* debounced value — typing in one does not change the other's badge.
- Caption: "One hook definition, two independent state cells. Custom hooks share code, not state."

If `RenderTracking`'s render-count framing doesn't cleanly express "independent state cells" (it's primarily a re-render counter), fall back to a simple hand-authored HTML+CSS `Figure`: two component boxes side by side, each containing its own labeled `[value, setValue]` cell, with a single shared "useDebounced recipe" box above connected to both by arrows — visually one recipe, two state stores. The agent should pick whichever reads clearer; the *pedagogical goal* is the same: kill the "shared count" misconception on sight. Cap height per the vertical-space constraint.

Reasoning: this misconception causes real bugs (a junior expecting a shared toggle). A visual that shows two distinct state cells fed by one recipe is worth more than a paragraph. It earns a diagram because it's counter-intuitive and spatial.

### Shaping the hook: arguments in, tuple or object out

Teach the canonical extraction shape as a set of small conventions, not a long treatise.
- **Inputs are arguments.** Everything the hook needs comes in as a parameter. A hook that reads a value from the consumer's render scope *other than through its arguments* leaks the consumer's scope into the hook — pass it in. (This is a watch-out; place it here, inline, where the rule it qualifies lives.)
- **Outputs are the return value**, in one of three shapes:
  - A single value when there's one output (`const isOnline = useOnlineStatus()`).
  - A **tuple** for the "state + action(s)" pattern, mirroring `useState` so it reads familiar: `const [value, setValue] = useLocalStorage('draft', '')`.
  - An **object** when there are three or more outputs, so call sites name what they take and order stops mattering: `const { data, loading, error } = useFetch(url)`.
- **Pick one shape per hook and hold it.** A hook that returns a tuple sometimes and an object other times breaks every call site. (Watch-out, placed here.)
- Reference the code convention directly: tuples when ordered, objects when named (matches `useToggle() → [on, toggle]`, `useForm() → { register, ... }`).

Use a single `Code` block (or `AnnotatedCode` if showing all three shapes in one excerpt) presenting three tiny signatures side by side — value, tuple, object — each one line. Keep it a reference, not a walkthrough.

**Generics** subsection-worthy content (can be an `###` if the agent prefers, or a tight paragraph): hooks that pass a value *through* should be generic so the type flows from the call site.
Show `const useLocalStorage = <T,>(key: string, initial: T): [T, (value: T) => void] => { ... }` and the inference at the call site: `useLocalStorage('draft', '')` infers `T = string`; `useLocalStorage('count', 0)` infers `T = number`.
Use `CodeTooltips` on the generic signature so the `<T,>` and the return tuple get short inline definitions without a prose detour.
Per code conventions: arrow-function-bound-to-`const` is the default form for hooks; annotate the return type because the signature *is* the lesson here (the convention says annotate exported-function returns and "when the signature is itself the lesson").

Note the trailing comma in `<T,>` for `.tsx` files (disambiguates from JSX) as a one-line inline note — students hit this and get a confusing parse error otherwise. Flag to downstream agent: this is a real `.tsx` gotcha worth one sentence.

Reasoning: shape is the most transferable craft skill in the lesson — it's what makes a hook feel native. Generics belong here because they're a property of the hook's signature, not a separate topic. Keeping each example to one line respects cognitive load; the judgment ("which shape?") is the content.

Terms for `Term` tooltips:
- `generic` — "A type parameter (`<T>`) that lets one function work over many types, with the concrete type inferred from how it's called."

### When extraction earns its weight

The judgment core of the lesson. Frame as three conditions — extract when *any one* holds:
1. **Reuse.** The behavior is used in two or more components and the wiring is non-trivial (more than a line or two). The `useIntersection` case from the intro.
2. **Clarity.** A single component has a tangled block of coordinated hooks; extracting it into a named hook reveals intent even though the component is the *only* caller. Readability is a legitimate reason on its own.
3. **Encapsulation.** An external system — a browser API, a third-party SDK — needs effect + state + ref wiring that should be hidden behind a clean interface. `useMediaQuery`, `useIntersection`, anything wrapping `addEventListener`.

Then the inverse, given equal weight (this is where seniors and juniors diverge): **when extraction is the wrong move.**
- A two-line `useState` "wrapped" as `useToggle` with no added behavior adds an indirection layer without revelation. Naming the smell: "a hook for everything" is the same error as premature optimization.
- A function with no hooks inside is not a hook — it's a utility (callback to the misnaming watch-out from the first section).
- A hook that takes a callback and calls it from an effect almost always needs `useEffectEvent` inside — flagged here, taught in the next section.

Interactive — `StateMachineWalker` (`kind="decision"`) as the "Should I extract this?" funnel. The lesson's judgment lives in the *order* of the questions, which is exactly what the walker is for. Sketch:
- Root `Question` "Does the block call at least one hook?"
  - "No, it's pure data-shaping" → `Leaf` verdict "Ship it as a `/lib` utility" (reason: no hooks = not a hook; the `use*` prefix would lie to the lint).
- "Yes, it calls hooks" → `Question` "Is the behavior used in 2+ components?"
  - "Yes, and it's more than a line or two" → `Leaf` "Extract a custom hook" (reuse condition).
  - "No, only one component" → `Question` "Does the hook block tangle the component's intent?"
    - "Yes — extraction would name what it does" → `Leaf` "Extract for clarity" (clarity condition, single caller is fine).
    - "No — it's a one-liner like a single `useState`" → `Leaf` "Leave it inline" (the over-extraction guard).
- A separate path: `Question` "Is it wiring a browser API / SDK with effect+ref+cleanup?" → `Leaf` "Extract to encapsulate" (encapsulation condition).

The agent should wire the branches so the walk reinforces *order*: hooks-or-not first, then reuse, then clarity, then the inline floor. Keep leaves to 2–3 sentences each.

Reasoning: a decision funnel is strictly better than a bulleted list for a judgment skill — it forces the student through the senior's question order and makes the "leave it inline" and "it's just a utility" outcomes feel like first-class answers, not afterthoughts. This directly serves the "decisions before syntax" pillar.

### Callbacks that should not re-fire the effect

The one genuinely subtle composition pattern, and the reason `useOnClickOutside` is in the catalog.
Set up the problem concretely: `useOnClickOutside(ref, handler)` attaches a `pointerdown` listener in an effect and calls `handler` when a click lands outside `ref`. The consumer passes a fresh inline arrow every render (`useOnClickOutside(menuRef, () => setOpen(false))`) — they should NOT have to `useCallback` it; that pushes ceremony onto every caller.
The naive hook puts `handler` in the effect's dep array, so the effect tears down and re-attaches the listener on *every* render (because the callback identity changes every render). Wasteful, and it can drop events between teardown and re-attach.
The fix: wrap `handler` with `useEffectEvent` *inside* the hook. The effect depends only on `ref`; the wrapped event always reads the latest `handler` without being a dependency. The consumer stays ergonomic — pass any inline function, no memoization required.
This is the pattern that makes hook APIs that accept callbacks feel right.

Cross-ref chapter 025 lesson 3 for `useEffectEvent` mechanics — do NOT re-teach them. One-sentence recap: "`useEffectEvent` wraps a callback so it reads latest values but is excluded from dep arrays." Note it's stable as of React 19.2 (the lint understands it and won't ask for it in deps).

Use `AnnotatedCode` here — this is exactly the "one complex block, focus attention on specific parts in sequence" case. Steps:
1. `{the function signature line}` — the hook takes `ref` and a plain `handler`; consumers pass an inline arrow.
2. `"useEffectEvent"` (the wrap line), color green — wrap the consumer's handler; this reads the latest handler each call.
3. `{the useEffect block}` — the effect attaches the listener; note its dep array.
4. `"[ref]"` (or the dep array), color blue — only `ref` is a dependency; the event is excluded, so the listener attaches once and stays put.
5. `{the cleanup return}` — remove the listener on unmount / ref change.

Reasoning: this is the highest-value craft detail in the lesson — it's what separates a hook API that works from one that thrashes. It earns `AnnotatedCode` because the *why* lives in the relationship between the wrap line and the dep array, and stepping focus between them is the clearest way to show it.

Terms for `Term` tooltips:
- `pointerdown` — "A DOM event that fires on mouse, touch, or pen press; the unified successor to `mousedown`/`touchstart`."

### Composing hooks from other hooks

Land that custom hooks calling *other* custom hooks is the daily mode, not an advanced trick. The whole point of the `use*` contract is that composition is free — a custom hook is just a function that may call hooks, including custom ones.
Two compact examples (one-liner bodies, illustrative not exhaustive):
- `useFilteredList(items, query)` internally calls `useDeferredValue(query)` (chapter 025 lesson 6) and derives the filtered array in render — composing a built-in concurrent hook into a domain behavior.
- `usePaginatedData(query)` composes a fetch hook with `useSearchParams` to read the page from the URL. Note `useSearchParams` is the Next.js hook that reads the URL query string — forward-ref chapter 033, one clause, recognition only. Do not teach the App Router URL surface here.
Rule to land: compose freely; **flatten only when nesting hides intent.** Deeply nested hooks where you can't tell what state lives where is the signal to inline one layer.

Use a small `Code` block per example, or a single `Code` block showing both — these are short enough that `AnnotatedCode` would be overkill.

Reasoning: composition is the "second-order" payoff that makes the `use*` ecosystem powerful; naming it explicitly prevents the student from thinking hooks can only wrap built-ins. Kept brief because the mechanic is trivial once share-code-not-state and shaping are understood.

### The 2026 custom-hook catalog

The reference payoff. Frame as: these are the hooks a 2026 SaaS codebase reaches for repeatedly — recognize them, reach for the named one instead of re-deriving the wiring.
**Do not implement all of them.** One flagship deep dive + a reference card.

**Flagship: `useLocalStorage`** (subsection or extended treatment). It's the flagship because it exercises everything the lesson taught — generics, tuple shape, AND it's the hook the chapter 028 project consumes, so the student meets it before they build with it.
Teach the SSR-safe implementation built on `useSyncExternalStore` (chapter 025 lesson 2, recognition — one-sentence recap: "the primitive for subscribing React to a value that lives outside it"). The three parts:
- `subscribe` — listens for the `storage` event (fires on writes from *other* tabs) and dispatches a custom event on local writes so same-tab consumers update too.
- `getSnapshot` — reads and parses the current `localStorage` value (wrapped in try/catch).
- `getServerSnapshot` — returns the `initial` value during SSR and the first client render, so server and client agree and hydration doesn't mismatch. **This is the senior detail** — a naive `useState(() => localStorage.getItem(...))` throws on the server (no `localStorage`) and mismatches on hydration; `getServerSnapshot` is why this hook is SSR-safe.

Present with `AnnotatedCode` (the implementation is one block worth stepping through) — steps walk the generic signature, the three `useSyncExternalStore` arguments, and the setter that writes + dispatches the custom event. Cap `maxLines` so it stays in frame.
Verify against current docs: `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` — `getServerSnapshot` is required for SSR and must return identical data on server and first client render. (Confirmed current as of 2026.)

**Reference card: the rest of the catalog.** Use a `Card`/`CardGrid` or a compact table — each entry is *name → shape → the failure it prevents*, NOT an implementation:
- `useMediaQuery(query)` → `boolean` — `matchMedia` subscription with cleanup. Prevents `window.innerWidth` polling on resize.
- `useIntersection(ref, options)` → entry/visibility — `IntersectionObserver`. Prevents scroll-handler position math for lazy-load and scroll-spy.
- `useDebounced(value, delay)` / `useThrottled(value, delay)` → the deferred value — **value-shaped, not callback-shaped**, so the result flows through dep arrays naturally (contrast the old debounced-callback pattern).
- `useLockBodyScroll()` → nothing — toggles `overflow: hidden` on `<body>` with cleanup. Prevents background scroll behind a modal. (Chapter 028 project consumes this — name the forward-ref.)
- `usePrevious(value)` → the previous value — the one legitimate effect-driven previous-value pattern (chapter 025 lesson 4 / chapter 024 lesson 5). Prevents reaching for state to remember last render.
- `useCopyToClipboard()` → `[copy, copied]` — wraps the Clipboard API with a transient `copied` flag. Prevents hand-rolling the reset timeout each time.
- `useOnClickOutside(ref, handler)` → nothing — the `useEffectEvent`-inside hook from two sections back. Prevents the dropdown/modal "click-outside-to-close" boilerplate.

Land the framing under the card: the value of the catalog isn't memorizing implementations — it's *recognizing the shape* so you reach for the named hook (or a vetted library one) instead of pasting raw `useEffect` blocks.

Reasoning: a full implementation of all eight would bury the lesson's judgment content under copy-paste and balloon length. One flagship (the project's hook, exercising generics + SSR) proves the craft; a reference card delivers recognition value at a fraction of the tokens. This is the cognitive-load cut the framing demands.

Terms for `Term` tooltips:
- `useSyncExternalStore` — "React's primitive for subscribing a component to a value that lives outside React, safely under concurrent rendering and SSR."
- `hydration` — "The client re-attaching React to server-rendered HTML. If the first client render differs from the server's, React warns about a mismatch."

### Hooks and the lint: the `additionalHooks` hook-up

Short, practical section. Most custom hooks should *not* take a dependency array — the senior pattern is a focused API (`useDebounced(value, delay)` takes a value, not deps). But a hook that *does* accept a dependency array (an `useInterval(callback, deps)` kind of shape) won't get `exhaustive-deps` checking automatically — the lint only knows about the built-ins.
The fix: add the hook's name to the `react-hooks/exhaustive-deps` `additionalHooks` regex so the lint enforces deps on it too. Show the one-line config:
`'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useInterval|useIsomorphicLayoutEffect)' }]`.
Cross-ref chapter 025 lesson 8 (the lint rules) — recognition, don't re-teach.
Land the senior preference: prefer the value-shaped, dep-array-free API (`useDebounced(value, delay)`) over the dep-array-taking one wherever possible — fewer footguns, no `additionalHooks` upkeep. The React team's own guidance is that most custom hooks should expose a higher-level API rather than a raw deps array. (Confirmed current.)

Note for downstream agent: `eslint-plugin-react-hooks` 6.1.1+ also exposes a shared-settings `additionalEffectHooks` option; `additionalHooks` on the rule is the long-standing one and the simplest to show. Use `additionalHooks` in the example.

Reasoning: this is a small but real gap students hit when they ship a dep-array hook — the lint silently stops protecting them. It belongs in the section about writing hooks, paired with the senior nudge toward the API shape that avoids the problem entirely.

### Custom hooks under the React Compiler (foreshadow)

Deliberately short — a bridge to lesson 2, not a teaching section.
Land three sentences' worth: the React Compiler analyzes a custom hook's body like any other function. A *pure* custom hook gets auto-memoization for free. The compiler does **not** change how you write hooks — same rules of hooks, same dependency arrays, same shapes. Forward to lesson 2 for what the compiler does and how to turn it on.
Use an `Aside` (note) for this so it reads clearly as a forward-pointer, not new required material.

Reasoning: the chapter framing requires every lesson to acknowledge the compiler thread, but lesson 2 owns it. A single Aside satisfies continuity without leaking lesson 2's content or implying the student must act on it now.

### Practice: extract a hook from a tangled component

The active-practice capstone. One `ReactCoding` exercise (tests mode).
Setup: provide a starter `App` with a small but tangled component — e.g. an online/offline status badge that wires `navigator.onLine` plus `addEventListener('online'/'offline')` in a `useEffect` with `useState`, inline in the component body, mixed with unrelated JSX. The wiring is non-trivial and clearly the encapsulation case.
Task (in `instructions`): extract the online-status logic into a `useOnlineStatus()` custom hook defined in the same file, returning a boolean, and consume it from `App`. Keep the rendered output identical.
Tests assert: the component still renders the correct status text for the initial state; (if feasible in the runner) toggling reflects through the hook. Because `ReactCoding` only renders the `App` export, the hook is defined in the same module above `App` — note this constraint to the agent: the exercise must be self-contained in one file with `export function App()` consuming a locally-defined `useOnlineStatus`.
Keep `maxHeight` modest; this is a focused refactor, not a big build. Provide a reference solution behind a `<details>` block below the exercise.

Reasoning: the core skill of the lesson is *extraction*, and the only way to verify the student can do it is to have them do it. A tangled-component-to-hook refactor is the exact real-world motion. Tests-mode grading gives an objective pass; the `<details>` solution supports the student who gets stuck without gating the lesson.

If the runner can't reliably simulate `online`/`offline` events, fall back to a simpler extraction target (a `useToggle`-shaped behavior that's genuinely non-trivial, e.g. a counter with reset and step, returning an object) so the test surface stays deterministic. Flag this to the agent: pick the target whose behavior the `ReactCoding` test harness can assert deterministically.

### Quick check: hook, utility, or inline? (optional reinforcement)

A `Buckets` drill (two or three buckets) sorting snippets into "Extract a custom hook" / "Ship as a `/lib` utility" / "Leave it inline." Items drawn from the threshold section:
- "Six lines of `IntersectionObserver` wiring used in three components" → custom hook.
- "A one-line `useState(false)` toggle used in one component" → inline.
- "A pure `formatCurrency(cents)` with no hooks" → utility.
- "`matchMedia` subscription with cleanup, used by the responsive nav" → custom hook.
- "A `slugify(title)` string transform" → utility.
- "A single `useRef` for a DOM node read in one handler" → inline.

Place this as a light end-of-lesson self-check. Optional — the agent may cut it if the lesson is already long; the `StateMachineWalker` and `ReactCoding` carry the assessment weight.

Reasoning: `Buckets` is the cheapest way to harden the hook-vs-utility-vs-inline judgment, which is the lesson's central decision. It's marked optional so it doesn't bloat an already content-rich lesson if length runs over.

### External resources (optional LinkCards)

A short `ExternalResource` / `CardGrid` of 1–3 links: the React docs "Reusing logic with Custom Hooks" page, and optionally the `useSyncExternalStore` reference (for the `useLocalStorage` deep-dive) and the `usehooks-ts` or similar vetted catalog as a "don't reinvent these" pointer. Keep to the genuinely useful; no padding.

## Scope

**Prerequisites to recap in one line each, not re-teach** (the student has these):
- The four state hooks and `useRef` (chapter 024) — composed, not explained.
- `useEffect` as synchronization + cleanup (chapter 025 lesson 2) — assumed; the catalog uses it.
- `useEffectEvent` mechanics (chapter 025 lesson 3) — one-sentence recap only; this lesson shows it *inside a hook*.
- `useDeferredValue` (chapter 025 lesson 6), `useContext` (chapter 025 lesson 5), `useSyncExternalStore` (chapter 025 lesson 2, recognition) — named at call sites, not taught.
- The rules of hooks and the `use*` lint contract (chapter 025 lesson 8) — recapped as the contract the prefix carries; the indexed-slot *why* is not re-derived.

**Explicitly out of scope (owned elsewhere):**
- The React Compiler and auto-memoization mechanics, enabling it, `'use no memo'` — **lesson 2 of chapter 026.** This lesson foreshadows in one Aside only.
- Manual `useMemo` / `useCallback` / `React.memo` thresholds and the "stop hand-tuning" cuts — **lesson 3 of chapter 026.** Do not discuss memoization decisions.
- `useEffectEvent` full mechanics and the reactive/non-reactive bright line — **chapter 025 lesson 3.**
- `useSyncExternalStore` at depth (tearing, the subscribe contract in general) — **chapter 025 lesson 2.** Used here only as the engine of `useLocalStorage`.
- Testing custom hooks — **Unit 18.** Mention in at most one sentence (the hook lives outside the tree, so tests render it in a small component) only if it arises naturally; otherwise omit. Recognition only.
- TanStack Query as a server-state hook system — **Chapter 11.** Name once as "for cached server state, reach for a server-state library, not a hand-rolled fetch hook" if `useFetch` comes up; do not teach.
- Zustand / Jotai for cross-component shared state — **Unit 15.** One clause in the share-code-not-state section as the answer to "I want shared state"; recognition only.
- `useSearchParams` / `nuqs` and the App Router URL surface — **chapter 033.** One clause in the composition section; do not teach.
- The chapter 028 project that consumes `useLocalStorage` and `useLockBodyScroll` — name as forward-refs; do not build here.

**Composition note for downstream agents:** code samples diverge from the "no manual memoization" convention's spirit only where the lesson is *about* the hook's internals (e.g. `useLocalStorage`'s `useSyncExternalStore` wiring) — this is deliberate and correct, not a violation. No `useMemo`/`useCallback` should appear in any sample (that's lesson 3's surface); if a hook body would normally memoize, let the compiler handle it and say nothing, per the convention.
