# The purity contract

- Title (h1): `The purity contract`
- Sidebar label: `The purity contract`

---

## Lesson framing

Conclusions from the brainstorm that govern the lesson as a whole.

**What this lesson is.** L1 installed `UI = f(state)` and the phase strip `Trigger → Render → Reconcile → Commit`; L2 showed reconciliation matching new tree to old. This lesson names the **contract that makes both safe**: render must be a *pure* function of props and state. Purity is not a style preference here — it is the precondition React's optimizers (Strict Mode double-invoke, concurrent interrupt/restart, the React Compiler's auto-memoization) all silently assume. The senior framing, stated once and returned to: **purity is the price of admission for everything React does to make your app fast.** Break it and the failures are spooky-at-a-distance — a counter that increments by 2 in dev, a value that stops updating once the compiler memoizes it, two parents that corrupt each other's output.

**The spine mental model the student leaves with.** A component is a function from `(props, state)` to JSX. Same inputs → same tree, *and* nothing outside this render's local scope changes as a result of calling it. Two rules in one breath: (1) don't **mutate** props or state during render — treat them readonly; (2) don't run **side effects** during render. Everything else in the lesson is an instance of, a justification for, or a recovery from those two rules.

**Pedagogical strategy — make the abstract failure concrete first.** "Pure function" is a math-class phrase that slides off a junior. Do not open with the definition. Open with the senior question: a `<Counter>` that increments a module-level `let` during render and "works" on your machine — then break it three different ways (Strict Mode, the compiler, two mounts sharing the variable). The student feels the contract before it's named. This mirrors L1/L2's "senior question → bug → rule" arc and keeps cognitive load low: one impurity, three distinct symptoms, one root cause.

**Simplified-then-complicated escalation.** Stage the model: (a) start with the narrowest, most visceral violation (writing a module-level variable) and its three symptoms; (b) generalize to the two-rule statement; (c) justify it via *why React needs it* (the four moves React reserves the right to make); (d) catalog the common violations and their fixes as a reference the student will actually reach back to; (e) draw the boundary — local mutation is fine, and side effects have two legitimate homes (handlers, effects) named but not taught. Each stage adds exactly one new idea.

**Hold the scope boundaries hard (see Scope).** This lesson *names* Strict Mode, the compiler, `useEffect`, and the snapshot model as the payoffs and homes — it teaches none of their surfaces. The single biggest authoring risk is drifting into ch024/ch025/ch026 territory. Foreshadow with one sentence and a forward pointer; never demonstrate the deferred API. The minimal `useState` primer is the one deliberate exception: it exists only so L3 and L4 read inline, and it is capped to the three-sentence shape below.

**`console.log` is the deliberate nuance, not a contradiction.** The lesson's own code uses `console.log` for debugging while teaching "no side effects in render." Resolve this explicitly where it arises: logging is *technically* a side effect but idempotent and observation-only, so React's docs sanction it as a debugging move. Naming this prevents the sharp student's "but you just said no side effects" objection and models senior judgment over rule-worship.

**Components and emphasis.** This is a concepts-and-contracts lesson, light on novel syntax — so the load-bearing assets are a small failure-mode visual, before/after fix pairs, a "does this belong in render?" classifier the student operates, and a short hands-on that lets them *feel* Strict Mode's double-invoke surface the bug. Diagrams stay simple (a phase strip callout, a "what React reserves the right to do" panel). No heavy system graph — purity is a rule, not an architecture.

---

## Lesson sections

### Introduction (no h2 — opening prose)

Open in the established voice. Connect back: "L1 said `UI = f(state)`. L2 trusted that render produces the same tree to diff. Both quietly assumed something we never named — that running your component is *safe to do more than once, at any time, in any order*." Then the senior question, concrete: ship a `<Counter>` whose render bumps a module-scoped `let renders = 0; renders++` (a "harmless" render counter). It works. Preview the three ways it breaks (Strict Mode dev double-render → off-by-2; the compiler memoizes → stops updating; mount it twice → shared corruption) without resolving them yet. State the lesson's promise: by the end you'll have the **purity contract** as a checklist you run on every component, and you'll know the two legitimate homes for the side effects that don't belong in render. Keep it to ~2 short paragraphs.

Do **not** add a "what is a pure function" preamble. The definition lands in the next section, motivated.

### A component is a pure function of props and state

The definition, now earned. State it precisely and minimally: a component is **pure** if, given the same props and state, it (1) returns the same JSX tree and (2) mutates nothing outside its own local scope while doing so. Frame it as React's side of a deal: *you* keep render pure, *React* gets to optimize freely.

Then the **two rules in one breath** — this is the load-bearing sentence of the lesson, set it apart (an `Aside` `tip` or bolded line):
1. **Don't mutate props or state during render** — treat them as readonly.
2. **Don't perform side effects during render** — no writes to anything that outlives the render.

List concrete side-effect examples inline so rule 2 isn't abstract: writing module-level variables, `localStorage.setItem`, `fetch`, `document.title = …`, setting a ref's `.current`, network/analytics calls, `Math.random()` / `Date.now()` reads. Keep the list tight; the full catalog comes later with fixes.

Land the connection to the spine: this is exactly what `UI = f(state)` *meant* — `f` is a pure function. Purity isn't a new topic; it's the fine print of the model they already hold.

**Component:** `Code` block (not AnnotatedCode — it's short and contrast is the point). Two tiny components side by side conceptually, or a single before/after via `CodeVariants` ("Impure" / "Pure"): the impure one reads `Date.now()` in the returned JSX or pushes to a prop array; the pure one receives the timestamp as a prop / returns a new array. Keep each variant ≤8 lines, one-paragraph prose each. Use `del`/`ins` framing.

**Term:** `pure function` — short inline definition (same inputs → same output, no observable side effects) so the math vocabulary doesn't gate the reader.

### Why React demands this

The justification. The student now knows the rule; this section makes it non-negotiable by showing what React *does* that purity enables. The senior framing: **React reserves four rights, and each one is unsafe against an impure component.** Present as a compact list, each with the one-line failure it would cause:

1. **Call your component more than once per render (dev).** Strict Mode double-invokes render to surface impurity *before* production. The module-level counter increments twice → off-by-2. (Forward pointer: ch025 L1 owns Strict Mode; here it's named as the messenger.)
2. **Interrupt rendering mid-tree and restart (concurrent rendering).** React may begin rendering, abandon it for a higher-priority update, and start over. A side effect fired during the abandoned attempt already happened — now it happens again, or happened for a tree that never committed.
3. **Skip rendering a component (compiler memoization).** When inputs haven't changed, the compiler may reuse the last result and *not call your function*. A counter that mutated on every render simply stops. (Forward pointer: ch026 L2.)
4. **Render components out of order / not at all.** React decides scheduling; assuming a render order or a guaranteed render is a bug.

Resolve the introduction's cliffhanger here: walk the `<Counter>` through rights 1, 3, and the two-mounts case, each as one beat. This is the emotional payoff — the spooky bugs all reduce to "you broke the contract; React exercised a right it always had."

**Component — `Figure` with hand-coded HTML/CSS panel:** a small "React reserves the right to…" card listing the four moves as labeled chips/rows, each paired with its failure tag. Pedagogical goal: compress four abstract guarantees into one glanceable visual the student can recall as a unit. Per the diagram index this is an annotated illustration → plain HTML+CSS inside `<Figure>`, not a graph engine. Keep under the height cap; horizontal/row layout.

**Optional reuse:** if it reads cleanly, re-anchor L1's phase strip (`Trigger → Render → Reconcile → Commit`) in an `Aside` to point out that purity is a constraint on the **Render** box specifically — Commit is where effects are allowed to touch the world. This ties the new rule to the picture they already carry. Keep it a one-line callout, not a full rebuild of the strip.

### The compiler is watching: purity as the 2026 default

Why this rule matters *more* in 2026 than it did in 2020. Before the compiler, impurity mostly bit you only under Strict Mode or concurrent features many teams didn't use. Now the React Compiler reads every component and **auto-memoizes the pure ones** — which is precisely why L1 told the student to stop reaching for `useMemo`/`useCallback`. The deal: keep components pure → the compiler optimizes them for free. Break purity → the compiler **silently skips** that component (no build error, no warning in the log). The component still works; it just renders without auto-memoization, quietly losing the optimization the rest of the codebase enjoys.

Land the senior audit move: the React DevTools shows a badge on compiler-optimized components; a *missing* badge on a component you expected to be optimized means the compiler skipped it — usually a purity violation worth hunting. Frame this as recognition only: **the audit signal exists, glance for it; the badge's mechanics and the compiler's config are ch026 L2.** Do not show DevTools screenshots or teach how to read the panel in depth here — one sentence on "the badge is your purity smoke detector" is the right dose.

Critical scope guard (call out for downstream agents): this section establishes *that the compiler depends on purity and skips on violation*, nothing about *how* to enable/configure it or the exact badge label. Resist explaining `reactCompiler: true`, Babel plugin, or annotation mode — all ch026 L2.

**No new component here** — this is a short prose bridge that cashes in L1's "write natural code, let the compiler handle it" promise and motivates the catalog that follows. Keep to ~2 paragraphs.

### The violations you'll actually write — and their fixes

The reference heart of the lesson: the catalog. These are the impurities a junior ships in real code, each paired with the minimal correct shape. Present as a sequence of tight before/after pairs so the student internalizes the *fix*, not just the prohibition. This is where the lesson earns its "checklist you run on every component" promise.

The six canonical violations (cover all; each gets a one-line "why it's impure" + the fix):

1. **Mutating a prop.** `props.items.push(newItem)` during render → return a new array (`[...props.items, newItem]`). Ties to L2's "treat data as identity" and foreshadows L4's immutable-update reflex.
2. **Mutating state during render.** `state.count++` → use the setter (named, not taught — `setCount(...)`).
3. **Reading mutable globals in render.** `Date.now()` / `Math.random()` in JSX → pass as a prop, or read in an effect/handler. Non-determinism breaks reconciliation *and* hydration from the same root cause — name both failure modes in one line.
4. **`Math.random()` for a key or id.** The L2 callback: a random key remounts every row every render. The pure fix is a stable id (generate-once-at-creation, or `useId` for ARIA — forward pointer to ch024 L6, recognition only).
5. **Writing to a ref's `.current` during render.** Impure because the ref outlives the render and reads become non-deterministic. Move to an event handler or effect. Recognition-level; ch024 L5 owns refs.
6. **`localStorage`/`document` writes / network calls in render.** → move to a handler or `useEffect` (ch025 L2 owns the surface).

**Component choice — `CodeVariants` per pair, OR one `AnnotatedCode` walking a single "haunted component" that commits several of these at once.** Recommended: a short `AnnotatedCode` over **one** deliberately-impure component (e.g., a `<ProductRow>` that pushes to `props.tags`, reads `Date.now()` for a "added just now" label, and writes `ref.current` for a render count), each `AnnotatedStep` highlighting one violation with `color="red"` and naming the fix in prose. This is the textbook use of `AnnotatedCode` — one complex block, attention directed to multiple parts in turn — and it's more memorable than six disconnected snippets because the student sees impurity as something that *accretes* in real code. Cap `maxLines` ~14; keep each step ≤6 lines of prose. Follow it with a single `CodeVariants` "Impure / Pure" showing the *cleaned* version for the one or two fixes worth seeing in full (the prop-mutation → spread fix is the highest-value one to show end-to-end, since it recurs in L4 and across the course).

**The `console.log` nuance — resolve it right here.** Immediately after the catalog, address the obvious objection: "you used `console.log` two sections ago — isn't that a side effect?" Answer: yes, technically, but it's idempotent and observes rather than mutates, so React's own docs sanction `console.log` in render as a debugging move. The senior point: purity is about *observable effects on the world that React schedules around*, not a religion. Strip noisy logs before production for hygiene, not correctness. One short paragraph or an `Aside` `note`.

### Local mutation is fine — where the boundary actually is

The crucial nuance that prevents the over-correction. Juniors who just learned "no mutation" start cloning everything and fear `let`/`push` entirely. Correct it: mutating a variable **created during this same render** is pure, because nothing outside the render can observe it. `const rows = []; for (…) rows.push(<Row …/>); return rows;` is perfectly pure. The constraint is precisely *mutations that cross the render boundary* — writes to props, state, refs, modules, the DOM. Inside-the-render scratch space is yours.

Give the contrast crisply: a local array you build and return = fine; the *same* push against `props.items` = violation. Same operation, different target, different verdict. This sharpens the rule from "never mutate" to "never mutate something that outlives this render."

**Component — `Buckets` classifier exercise.** This is the ideal check: two buckets, **"Pure (fine in render)"** vs **"Impure (move it out)"**, ~6 short `Item` chips drawn straight from the catalog + this section. Pedagogical goal: force the student to operate the boundary rather than recognize it passively — the whole lesson reduces to making this judgment fast. Suggested items: *"`const list = []; list.push(x)` then return `list`"* (pure), *"`props.user.name = 'Ada'`"* (impure), *"`Math.random()` in JSX"* (impure), *"`Date.now()` passed in as a prop, read in render"* (pure), *"`localStorage.setItem` in the body"* (impure), *"map props to a new array with `.map()`"* (pure). `twoCol` off (two buckets read fine in one column), custom `instructions` naming the task.

### Where side effects belong, and a minimal state primer

Close the loop the rules opened: if effects can't run in render, where *do* they go? Name the **two legitimate homes**, briefly, as a map for the chapters ahead — do not teach either surface:

- **Event handlers** — functions React calls in *response to user input*, not during render. The natural home for "do a thing when the user clicks/submits." (Surface: ch023 L6 synthetic events; forms in Unit 6.)
- **`useEffect`** — a function React calls *after commit*, to synchronize with external systems. The home for "after this render lands, touch the outside world." (Surface: ch025 L2; "you probably don't need an effect" gut-check: ch025 L4.)

One sentence each, each with its forward pointer. The senior reflex to plant: *reach for a handler first; reach for an effect only to synchronize with something outside React.* That's the seed ch025 L4 grows.

**The minimal `useState` primer (deliberate, capped).** L4 needs it and so do this lesson's setter-based fixes. Three sentences, no more: `const [value, setValue] = useState(initial)` declares a piece of local state; reading `value` gives **this render's** snapshot; calling `setValue(next)` schedules a re-render where `value` reflects `next`. Explicitly flag (inline, for the reader and downstream agents) that lazy init, functional updaters, and the `useState`-vs-`useReducer` cut are ch024 — this is the readability primer, not the API.

**The initializer trap as the bridge to L4.** End on a forward-looking hook that *is* a purity instance: `useState(expensiveCompute())` runs `expensiveCompute()` on **every** render even though only the first result is kept — work happening during render that shouldn't be there. Name the lazy fix (`useState(() => expensiveCompute())`) in one line, frame it as "the same 'don't do work in render' instinct you just built," and forward-point to ch024 L2 for the full treatment. Do **not** expand it — it's the cliffhanger into the next two lessons (L4's snapshot model, ch024's `useState` depth), not a section.

### Check your understanding (consolidation)

A short end-of-lesson consolidation so recall sticks before the chapter moves to the snapshot model. Two complementary checks:

**`PredictOutput`** — the visceral payoff of "render runs more than once in dev." A tiny program with a module-level `let count = 0;` incremented inside a component body, rendered once under Strict Mode; the student predicts the logged value. Expected output reflects the **double-invoke** (e.g., logs `1` then `2`, or final `2`), and `PredictWhy` explains: Strict Mode called render twice to surface exactly this impurity; in production it'd run once and the bug would hide. Pedagogical goal: cement that impurity is *detectable* and *why dev behaves "weirdly."* Keep the program ≤12 lines, output ≤3 lines. (If a runnable Strict-Mode double-invoke is awkward to express as plain stdout, fall back to a `setCount(count+1)`-style snapshot predictor that L4 will deepen — but the Strict-Mode framing is the stronger fit for *this* lesson's theme; prefer it.)

**`TrueFalse`** — 4–5 statements covering the contract's edges, each with a `TfWhy`. Candidate statements: *"Mutating a local array you created in the same render and returning it is impure"* (false — local scratch is fine), *"`console.log` in render violates the purity contract so you must remove it"* (false — sanctioned as a debug move), *"An impure component fails the build under the React Compiler"* (false — it silently skips, DevTools badge is the tell), *"Strict Mode's dev double-render is a bug to suppress"* (false — it's the messenger surfacing impurity), *"Reading `Date.now()` in render makes the component impure"* (true). Pedagogical goal: target the precise misconceptions juniors hold *after* a first pass — the over-corrections (local mutation, logging) and the under-corrections (compiler silently skips). Shuffle-safe statements; keep each one claim.

Place these in this dedicated short section because the lesson is contract-dense and the misconceptions are specific — a consolidation pass is worth the space here, unlike a purely procedural lesson.

### External resources (optional)

If a strong recent explainer fits, one or two `ExternalResource` cards: React's official "Keeping Components Pure" doc (the canonical source for the contract and the `console.log` carve-out) and, if useful, the "Render and Commit" doc to reinforce the phase boundary. Resourcer may add a short conceptual video via `VideoCallout` if one cleanly covers "pure components / why Strict Mode double-renders" — author-optional, not load-bearing.

---

## Terms for `Term` tooltips

Be strategic — only terms that serve the lesson's goals and aren't already defined in flow:

- **pure function** — same inputs → same output, no observable side effects. (Gates the whole lesson; define on first use.)
- **side effect** — any change a function makes to state outside itself, or any dependence on outside state that can change (writing a global, the DOM, storage, network; reading the clock/random). Define where rule 2 lands.
- **idempotent** — running it once vs. many times produces the same observable result; why `console.log` (and Strict Mode's double-invoke) are safe. Use at the `console.log` nuance.
- **Strict Mode** — recognition-level one-liner (a dev-only wrapper that double-invokes render to surface impurity) so the "why React demands this" point reads without a forward jump. Full treatment ch025 L1.
- **React Compiler** — recognition-level one-liner (build-time tool that auto-memoizes pure components) at the "compiler is watching" section. Full treatment ch026 L2.
- **commit** — re-anchor from L1 if the phase-strip callout is used (the phase where React applies the diff to the DOM; where effects run). Only if referenced.

Do **not** `Term`-define already-flowing concepts (render, reconciliation, mount/update — established L1/L2) or anything taught inline.

---

## Scope

**This lesson teaches:** the purity contract (the two rules: no mutation of props/state in render, no side effects in render); *why* React requires it (the four reserved rights — Strict Mode double-invoke, concurrent interrupt/restart, compiler skip, out-of-order/skipped renders — at recognition level); that the React Compiler depends on purity and silently skips violators (DevTools badge named as the audit signal, recognition only); the catalog of common violations and their immutable/relocated fixes; the local-mutation-is-fine boundary; `console.log`'s sanctioned-debug carve-out; the two homes for side effects (handlers, effects) named as a map; a three-sentence `useState` primer; the initializer trap as a one-line forward hook.

**Explicitly out of scope — name with a forward pointer, never demonstrate:**

- **State-as-snapshot, the `setCount(count+1)` bug, updater functions, automatic batching, `flushSync`** — ch023 **L4**. This lesson may *name* "the setter schedules a re-render" (the primer) but makes **no snapshot claim** and shows **no** sequential-update bug; that's L4's opening. Hold this hard — the temptation to explain "why three setters increment by one" is strong and belongs next door.
- **`useState` full API, typing, lazy initialization, the `Object.is` setState bailout, derived state** — ch024 **L1/L2**. The initializer trap is *named in one line*, not taught.
- **`useRef` surface, the state-vs-ref rule, DOM refs** — ch024 **L5**. Ref-write-in-render appears only as a violation in the catalog (recognition).
- **`useId`** — ch024 **L6**. Named once as the pure fix for random keys/ids; not taught.
- **Strict Mode's mechanism — how/why it double-invokes renders, initializers, and the effect lifecycle** — ch025 **L1**. This lesson uses Strict Mode only as the *named consequence* ("React may call render twice in dev"), not as a topic with its own surface.
- **`useEffect` signature, lifecycle, cleanup, dependency arrays** — ch025 **L2**. Named as the second home for side effects; zero API shown.
- **"You probably don't need an effect"** — ch025 **L4**. The handler-first reflex is *planted* in one sentence; the audit framework is L4's.
- **React Compiler installation, config (`reactCompiler: true`, Babel plugin), annotation mode, `'use no memo'`, the exact DevTools `Memo` badge mechanics** — ch026 **L2**. This lesson asserts only *that* the compiler depends on purity and skips violators, and *that* a badge exists.
- **Manual `useMemo` / `useCallback` / `React.memo`** — ch026 **L3**. Not shown; L1 already framed them as "the old manual tools."
- **Reconciliation/keys mechanics, the index-as-key bug** — ch023 **L2** (done). Referenced only via the random-key violation.
- **Immer / immutable-update libraries** — recognition only across the course; the course teaches direct spread. Don't introduce here.
- **Server Components / server-render purity contract** — Chapter 030.

**Prerequisites to redefine concisely (one line each, lean on L1/L2):** `UI = f(state)` (render is a function of state — the spine); render vs. commit (render = call your function for a tree, no DOM; commit = apply the diff); mount vs. update; `Object.is` as React's equality rule (only if the mutation-bailout is touched — keep to a clause, the full bailout is L4). Reuse L1/L2's exact framings and the phase strip rather than re-deriving them.
