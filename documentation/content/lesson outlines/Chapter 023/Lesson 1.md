# What triggers a render

- Title (h1): `What triggers a render`
- Sidebar label: `What triggers a render`

---

## Lesson framing

This is the chapter's opener and the moment the course finally cashes in a forward reference made all through Ch 022 ("the component function runs again with new props"). The student arrives knowing a component as a typed function of props that returns JSX (the `<Button>`/`<Card>` spine), but still half-thinks of it as a *template* that React mutates in place. This lesson flips that model: **a component is a function React re-runs, and its return value is diffed against the last return.** Everything in the chapter (reconciliation, purity, snapshot, key resets) depends on this one shift, so the lesson's job is to install it cleanly, not to cover every optimization edge.

The pedagogical spine, in order:

1. **Render = a function call.** Re-running the function is the whole mechanism. Name "render" (the call) vs "commit" (the DOM update) once, lightly — commit gets its weight in Ch 025; here it exists only so "render is cheap, commit is the expense" is sayable.
2. **What triggers a re-run.** Three triggers: own state update, an ancestor re-rendering, a subscribed context change. The load-bearing misconception to kill: "my prop changed, so the child re-rendered." Props don't trigger anything — the *parent* re-running and passing new props does.
3. **`Object.is` is the only equality rule.** When a memoized child decides whether to skip, React compares each prop with `Object.is`. Primitives by value, objects/arrays/functions by reference. This is the rule that makes the next beat land.
4. **Inline literals churn identity.** `style={{...}}`, `items={[...]}`, `onClick={() => …}` are *new every render* under `Object.is`, even when they "look the same."
5. **The 2026 resolution: write the natural code, let the React Compiler memoize it.** This is the senior payoff and the reason the lesson refuses to teach `useMemo`/`useCallback` here. The student leaves with "don't memoize prophylactically," not "memoize everything."
6. **Renders are cheap; profile before optimizing.** Defuse the junior reflex "won't that re-render the whole tree?" — yes, and it's usually fine.

Tone: adult, terse, decision-first (per pedagogical guidelines and AGENTS thesis). The senior framing is `UI = f(state)` — same inputs, same output — and that framing is the thread that makes purity (L3) and reconciliation (L2) coherent later, so plant it early and return to it at the close.

**Cognitive-load staging.** Start with one concrete bug the student can feel (a child re-rendering "for no reason"), give the minimal mental model that explains it, *then* layer `Object.is` and identity churn, *then* lift to the compiler. Do not introduce reconciliation internals, the DOM diff algorithm, batching, or snapshot semantics — each has an owning lesson and dragging them in here is the main risk.

**Visual-first where it pays.** The "which boxes light up" question is the heart of triggers and is far better shown than told — the purpose-built `RenderTracking` component (designed against exactly this unit and this question) carries the three triggers and the inline-literal churn. Prose explains *why*; the widget shows *what*.

**`useState` is borrowed, not taught.** The student has seen `useState(0)`/`setCount` informally (Ch 022 portals lesson used "the component renders" language) but the real API surface lands in Ch 024. This lesson uses `const [count, setCount] = useState(0)` purely as "the thing whose setter triggers a render" — name that it's a Ch 024 topic so no one expects depth here.

---

## Lesson sections

### Introduction (no heading)

Open on the senior question, concretely. Reuse the chapter spine: a `<UserCard user={...} />` sitting in a dashboard re-renders every time *anything* in the parent changes — a search box keystroke, a clock tick — even though "the user is the same user." Junior reaction: "why is it re-rendering, nothing about the user changed?" State the promise: by the end you'll know precisely what makes a component re-run, why `{ name, email }` written inline counts as a brand-new value every time, and why in 2026 you write the obvious code and let the compiler handle the rest. Connect back: Ch 022 said "the function runs again" and deferred the details — this is the details. Keep it to ~5-6 lines, warm and brief. No section header (per lesson structure: the intro is unlabeled prose).

### Rendering is React calling your function

Install the core mechanism. Rendering is not React "updating a template" — it is **React calling your component function**. The function returns JSX, which is a tree of plain objects (React elements) describing what should be on screen (recall from Ch 022 that JSX compiles to element objects — one line, don't re-teach). React compares that tree to the previous one and applies the minimum DOM changes.

Name the two phases once, then move on:

- **Render** — React calls the function, gets the JSX tree. Pure computation, no DOM touched.
- **Commit** — React applies the diff to the real DOM.

Land the one consequence that matters now: **if a render produces the same output as last time, React doesn't touch the DOM** (cite this as the React docs' own guarantee — it's the seed of "renders are cheap"). Defer the rest of commit to Ch 025 explicitly ("when effects enter, the render/commit split earns its keep").

Mental-model line to state plainly: **`UI = f(state)`** — UI is a function of state; same state in, same JSX out. Return to this phrase at the lesson's close.

**Diagram — the render→commit strip.** A simple horizontal two-stage strip: `Trigger → Render (call fn, get tree) → Reconcile (diff vs previous) → Commit (DOM update)`. Pedagogical goal: make "render" concretely a *function call that returns a tree*, visually separate from the DOM write, so "render is cheap, commit is the expense" is obvious later. Build as **HTML + CSS** inside a `<Figure>` (a sequential phase strip — exactly the html-css "sequential phase strip / timeline without parallelism" use case per the diagrams index; no engine needed). Keep it ≤4 boxes, horizontal, short. Caption: the trigger is the cause; render and commit are the two phases.

Code: a tiny `Code` block showing a 5-line component (`function Greeting({ name }: { name: string }) { return <h1>Hello {name}</h1>; }`) framed as "this function *is* what React calls on every render." No `AnnotatedCode` — it's one idea, a plain block carries it.

### The three triggers

The center of the lesson. A component re-runs for exactly one of three reasons:

1. **Its own state updated** — a `useState`/`useReducer` setter was called.
2. **An ancestor re-rendered** — when a component re-renders, React re-runs its children by default.
3. **A context it subscribes to changed** — `useContext` value updated (name `useContext` as "the hook that reads a shared value, taught in Ch 025" — recognition only).

State the rule hard: **there is no fourth trigger, and crucially, a prop change is not on the list.** Props changing is the *consequence* of trigger 2 (the parent re-ran and passed new props), not a trigger itself. This is the single most load-bearing correction in the lesson — call it out as the misconception that wrecks the optimization story: "my prop changed so the child re-rendered" is backwards; the parent re-rendered, which both re-ran the child *and* produced the new prop.

**Reconcile with the React docs framing (important, prevents confusion).** react.dev lists *two* reasons to render — initial render, and "the component's (or one of its ancestors') state has been updated." Add a one-line `Aside` (`note`) bridging the two framings: an ancestor re-rendering and a context change are both, underneath, "some state somewhere above updated and the update reached this component." The three-trigger split is the practical lens; the docs' two-reason split is the same truth compressed. A student who reads both shouldn't think they conflict.

**Diagram / widget — `RenderTracking` (the lesson's centerpiece).** This component exists for this exact question ("what causes a render," misconception lives in *which boxes light up"). Author a small tree and a trigger row:

```
<RenderTracking title="What makes a box re-run?">
  <TrackedNode id="app" label="Dashboard">
    <TrackedNode id="search" label="SearchBox" />
    <TrackedNode id="card" label="UserCard" />
  </TrackedNode>

  <Trigger id="state-search" label="type in SearchBox (its own setState)" renders="search" />
  <Trigger id="state-app"    label="setState in Dashboard"             renders="app,search,card" />
  <Trigger id="rerender-card" label="UserCard's own setState"          renders="card" />
</RenderTracking>
```

Pedagogical goal: the student *sees* that a `Dashboard` state change re-runs the whole subtree (triggers 1+2 together — own state here, ancestor for the children), while a leaf's own state stays local. This is the visual that makes "the parent re-rendered, that's why your `<UserCard>` re-ran" undeniable. Do **not** wrap in `<Figure>` (it ships its own card). Keep the tree 3-4 nodes. Pair one sentence above and one below; let the badges do the teaching.

Then the **initial render vs re-render** beat, kept short: the first render *mounts* (creates DOM from nothing, nothing to diff against); every later render *updates* (diffs against the previous tree). Land the why-it-matters: most of this chapter's bugs only appear on re-renders, because the initial render has no previous tree to compare. One or two sentences, no diagram — it's a framing note that pays off in L2.

Code: a minimal two-component example — a parent with a `useState` counter rendering a `<Label text="hi" />` child whose props never change. `Code` block, then prose: click the parent's button and the child function still runs, because trigger 2 fired. Frame `useState` here as borrowed-from-Ch-024 ("setter schedules a re-render — full API in Ch 024").

### Reference identity and `Object.is`

Now the equality rule, motivated by the previous section's open question (why does the unchanged-looking `<UserCard>` "count as changed"?). When React decides whether a memoized child can *skip* re-running after its parent re-rendered, it walks each prop and compares old vs new with **`Object.is`** — React's single equality rule.

Teach `Object.is` by its two behaviors, framed as already-known JS (the student knows `===` from earlier units):

- **Primitives compare by value** — `Object.is('hi', 'hi')` is `true`, `Object.is(3, 3)` is `true`. (It's `===` with two tidy edge-case fixes: `NaN` equals itself, `+0`/`-0` don't — mention in one clause, it's not the point.)
- **Objects, arrays, functions compare by reference** — `Object.is({}, {})` is `false`. Two object literals with identical contents are *different values* to React. Deep/structural equality is never automatic; it's opt-in work the developer does by hand (rare, error-prone) — name that it exists so "why doesn't React just deep-compare?" is pre-answered: it'd be slow and it's usually wrong.

**Component to use:** a `CodeTooltips` block on a handful of `Object.is(...)` comparisons, tooltips defining the by-value vs by-reference split inline so the reader doesn't leave the block. Example keys: `Object.is` → "React's equality check. Primitives by value, objects/arrays/functions by reference."; the `{}` literal → "a fresh object — a new reference every time it's evaluated." Keep it to ~6 lines of comparisons with their `// true`/`// false` results.

Tie it back to the trigger list: this comparison only runs *when a child is memoized* (by the compiler, or rarely by hand). Without memoization, an ancestor re-render re-runs the child unconditionally — there's no comparison to skip it. State that plainly so the student doesn't over-generalize "React compares props on every render" (it doesn't, by default it just re-runs).

### Inline literals churn identity

The payoff of `Object.is`: the everyday code patterns that silently produce a new reference every render. Walk the three:

- `<Child style={{ color: 'red' }} />` — a new object literal each render.
- `<Child items={[...list, 'extra']} />` — a new array each render.
- `<Child onClick={() => save(id)} />` — a new function each render.

None of these *change* on screen; all three are `!==` their previous selves under `Object.is`. Land the rule in one sentence the student can carry: **any object, array, or function written as a literal in JSX is a new value every render.** This is *the* reason a memoized child re-renders "for no reason" — and the bridge to the senior resolution.

**Component:** `AnnotatedCode` on a single ~8-line parent component containing all three inline-literal props on one child, stepping through (1) the inline object prop — new reference, (2) the inline array prop — new reference, (3) the inline callback prop — new reference, (4) a primitive prop alongside (`title="Profile"`) that *is* stable, to contrast. Use `color="orange"` on the three churning props and `color="green"` on the stable primitive so the eye sorts them. This is the one block where directing attention to multiple specific spots earns `AnnotatedCode` over a plain block.

**Exercise — `PredictOutput` (high-value check).** A short program that logs the results of `Object.is` on a couple of inline-style objects and a primitive, e.g. building the same `{ color: 'red' }` twice and comparing, plus comparing a string to itself. Expected output is a few `true`/`false` lines. `PredictWhy`: object literals are fresh references; primitives compare by value. This forces the student to *commit* to the by-reference rule rather than nod along — the exact misconception that causes the bug. Keep the program ≤8 lines, plain `js`/`ts`, no React needed (the rule is pure JS identity, which makes the check sharper).

### The React Compiler writes the memoization for you

The resolution and the senior mindset beat — why none of the above is a problem you hand-fix in 2026. Frame historically in one breath, then land the present:

- **Before (recognition only):** pre-React-19, the fix was to wrap object/array/callback props in `useMemo`/`useCallback` so their reference stayed stable across renders. That meant memoization scattered everywhere and dependency arrays to maintain. Name `useMemo`/`useCallback` here as "the old manual tools" — do **not** teach their API (Ch 026 owns it).
- **Now:** the React Compiler (the project enables it via `reactCompiler: true` in `next.config.ts`, per code conventions — state as a fact, don't configure it here) reads your components and inserts that memoization automatically — the inline object, the array spread, the inline callback get stable identities *when the component is pure* (forward-ref purity to L3 as the condition the compiler depends on).

The takeaway, stated as a rule the student adopts today: **write the natural code — inline the object, inline the callback — and let the compiler memoize. Don't reach for `useMemo`/`useCallback` prophylactically.** Manual memoization is a last resort for the rare component the compiler skips (the DevTools badge that flags it is L3's audit signal, and the manual-memo decision is Ch 026 L3 — point forward, don't detour).

**Watch-out, inline as a sub-point of this section, not a bucket:** the context-value-identity trap. A `<Ctx.Provider value={{ user, login }}>` with an inline object re-runs every subscriber on every render — same identity-churn rule, applied to context. The compiler memoizes the value; absent the compiler you'd wrap it in `useMemo` (cross-ref Ch 025 for context). Mention in two sentences as "the same rule shows up in context," do not expand into a context lesson.

No diagram here — it's a mindset/decision beat carried by prose. Optionally a `RenderTracking` with an `<Implementation>` toggle ("without compiler" vs "with compiler") showing a child that re-renders on every parent tick in one tab and stays put in the other — include this **only if** it reads cleanly in 3-4 nodes; the per-trigger asymmetry is exactly what `<Implementation>` is for. Author's call; the prose rule is the required part, the widget is the enhancement.

### Renders are cheaper than you think

Close the loop on the junior reflex. When a student first internalizes "a parent re-render re-runs the whole subtree," the panic is "isn't that wasteful?" Answer head-on: **rendering — calling functions and diffing a tree of plain objects — is cheap. The DOM commit is the expense, and React already minimizes it** (it only touches DOM nodes that actually differ — callback to the render/commit strip). Optimizing renders is a *last-resort* move backed by a profiler measurement, not a default discipline you sprinkle everywhere.

Name the debugging reflex without teaching the tool: when a real perf complaint lands, the senior move is **profile first, then chase the prop identity that's churning** — React DevTools' Profiler shows which components rendered and which props changed (cross-ref Ch 006 L3 where DevTools was installed; Ch 026 L3 for the manual-memo decision that follows). The discipline being taught is *measure before optimize*, which is a senior-mindset thread, not a React API.

Return to `UI = f(state)` to close: you now know the function (your component), the inputs (props, state, context), and what makes React call it again. The next lesson (L2) opens the function's return value — how React decides *which* previous instance each new element corresponds to (reconciliation and `key`).

**Optional `VideoCallout`** at the very end if a high-quality, current (React 19-era) short explainer on the render/commit model exists — the resourcer can slot one; not required for the lesson to stand. If included, frame as supplementary, collapsed by default.

---

### Term tooltips (use `<Term>` in prose)

Strategic, only where it keeps flow without a detour:

- **`Object.is`** — first prose mention: "JavaScript's same-value comparison; like `===` but `NaN` equals itself and `±0` differ. React uses it as its one prop-equality rule."
- **reconciliation** — when foreshadowing L2: "the algorithm React uses to match a new element tree against the previous one."
- **React Compiler** — first mention: "a build-time tool that auto-inserts memoization so you don't write `useMemo`/`useCallback` by hand."
- **memoize / memoization** — first mention: "cache a value (or a component's output) and reuse it when inputs are unchanged, skipping recomputation."
- **commit** — at the render/commit split: "the phase where React applies the computed changes to the real DOM."

Do **not** `Term`-wrap things the student already owns (`props`, `JSX`, `component`, `state`) — Ch 022 established them.

---

## Scope

**Prerequisites to recall briefly (one clause each, do not re-teach):**

- A component is a typed function of props returning JSX (Ch 022) — assume fully owned.
- JSX compiles to React element objects (Ch 022) — one-line recall only.
- `===` / value vs reference in JS (earlier units) — the foundation `Object.is` extends; recall, don't lecture.
- `useState(initial)` returns `[value, setter]` and the setter triggers a re-render — used as a borrowed primitive; explicitly defer the API to Ch 024.
- `useContext` reading a shared value — name only, defer to Ch 025.

**This lesson does NOT cover (each has an owner):**

- **Reconciliation, the tree-diff heuristics, and the `key` prop** — L2 of this chapter. This lesson may *foreshadow* "React matches new elements to old ones" in one sentence at the close, but teaches none of the algorithm, no `key`, no index-as-key bug.
- **The purity contract (no-mutation, no-side-effects, why the compiler needs it)** — L3. This lesson names "the compiler memoizes *pure* components" as a condition and stops; it does not define or enforce purity.
- **State as a snapshot, the `setCount(count+1)`×3 bug, the updater form, automatic batching, `flushSync`** — L4. Deliberately excluded; do not explain *why* the snapshot behaves as it does. If a student wonders "but does the setter update immediately?", that's L4 — don't answer it here.
- **The `key`-as-reset tactic** — L5.
- **Synthetic events / typed handlers** — L6. Inline `onClick={() => …}` appears only as an *identity-churn example*; do not teach event typing or the synthetic-event layer.
- **`useMemo`, `useCallback`, `React.memo` API** — Ch 026 L3. Named as "the old manual tools the compiler retires"; never demonstrated.
- **The React Compiler's API, install, configuration, and the DevTools optimized-badge audit** — Ch 026 L2 (config) and L3 of this chapter (badge). State only that the project has it enabled; don't configure or screenshot it.
- **`useEffect` / the commit phase at depth / where side effects go** — Ch 025. The render/commit split is named for "render is cheap, commit is the expense" and nothing more.
- **React DevTools Profiler usage** — named as the "profile first" reflex with a cross-ref to Ch 006 L3; no walkthrough.
- **Server vs client rendering, the RSC boundary, concurrent rendering / transitions / Suspense** — Ch 030 / Ch 031 / Ch 025 L5. Out of scope entirely; do not gesture at "server renders" when saying "React calls your function."

---

## Code conventions notes (for downstream agents)

Apply the relevant conventions; flag deliberate divergences:

- **Component form:** arrow-bound `const` with typed destructured props is the chapter spine. For the tiny throwaway examples here, a `function Greeting({ name }: { name: string })` declaration reads fine and matches the React-docs mental model ("this function is what React calls") — either is acceptable for these one-idea snippets; prefer the spine's `const` form when the example resembles real component code, allow the `function` form for the "React calls your function" framing block.
- **`useState`:** write `const [count, setCount] = useState(0)` — the conventions' "`useState` for local UI state" shape. Do not model lifting/`nuqs`/`useReducer` here (Ch 024).
- **No manual memoization in sample code** — this lesson's entire thesis is the conventions' "skip the manual reflex." Any `useMemo`/`useCallback` that appears must be in a *recognition-only* "the old way" framing, never as recommended code.
- **Conditional render / `&&`** — unlikely to appear; if it does, boolean-guard per conventions (`count > 0 && …`).
- **Inline-literal props** are shown *deliberately as the natural, compiler-handled code* — this is aligned with conventions (write the natural code), not a divergence, but note it so an agent doesn't "fix" the inline object into a `useMemo`.
- **`Object.is` examples** are illustrative JS, not component code — plain `ts`/`js` fences are correct.
