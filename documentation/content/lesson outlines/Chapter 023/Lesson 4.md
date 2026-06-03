# State is a snapshot

- **Title:** State is a snapshot
- **Sidebar label:** State is a snapshot

## Lesson framing

This lesson cashes in two debts the chapter has been carrying. L1 installed `UI = f(state)` and named "a setter schedules a re-render" without explaining the consequence. L3 gave a capped 3-sentence `useState` primer and made *no* snapshot claim, explicitly deferring it here. This is where the student stops thinking of state as a live mutable variable and starts thinking of it as **a value frozen for the duration of one render** — a photograph React takes each time it calls your component.

The whole lesson hangs on one mental model and four footguns that fall out of it:

1. The snapshot model itself — each render closes over its own `props` and `state` as constants.
2. `setCount(count + 1)` three times increments by **1**, not 3 (all three reads see the same snapshot).
3. `setCount(count + 1); console.log(count)` logs the **old** value (the setter queues; it doesn't mutate the variable).
4. Async/late callbacks capture a stale snapshot; mutate-then-set silently bails out via `Object.is`.

The senior reflexes the student must leave with: **reach for the updater form `setX(c => …)` whenever the next state depends on the previous, and whenever the setter runs after render (async/timers).** And: **always produce a new reference** — spread, never mutate-in-place.

Pedagogical spine: lead with the visceral bug (the +1 surprise) before the theory, because the surprise is what makes the snapshot model *worth* learning. Then explain the model visually with a `DiagramSequence` (render = a frozen photo). Then explain the *mechanism* underneath — automatic batching and the update queue — which is *why* the snapshot holds across three setters. Then the fix (updater form reading the queue). Then extend the same root cause to the scarier async/stale-closure surface. Then immutable updates as the second reason a setter "does nothing". Close with `flushSync` (rare opt-out) and the daily separate-vs-grouped-state cut.

This ordering minimizes cognitive load: one model, introduced simply (a photo), then complexity added in layers (queue → updater → async → immutability), each layer a re-statement of the same rule rather than a new rule.

Cross-references to honor (do not preempt): the `key`-as-reset tactic is **L5's** (this lesson never resets state via `key`); full `useState` API surface, typing, lazy init, props-as-initial-state, derived state, and "you might not need an effect" are **Ch 024's** — use only the L3 primer shape inline; `useReducer` is named once as the alternative and owned by **Ch 024 L4**; Strict Mode's *mechanism* is **Ch 025 L1** (here only the named consequence: the updater function may run twice in dev, so keep it pure). Reuse L1's `Trigger → Render → Reconcile → Commit` phase vocabulary and L3's spread reflex so the chapter reads as one continuous argument.

## Lesson sections

### Introduction (no header)

Open with the senior question framed as a bug report a junior would file: "I call `setCount(count + 1)` three times in my click handler and the counter only goes up by one — is `setState` broken?" State that it is not broken; the handler is reading state correctly, and *correctly* is the surprising part. Connect back to `UI = f(state)` from L1 and the purity contract from L3: if render is a deterministic function of its inputs, then `count` inside one render *cannot* change — it is a fixed input to that render. Preview the payoff: by the end the student will predict exactly what these handlers do and own the updater-function reflex that every React codebase depends on. Keep it to ~3 short paragraphs, warm and terse. No "what is state" scaffolding — the student met `useState`'s shape in L3.

Include a one-line recap of the L3 primer so the lesson reads inline, using `Term` for `useState` rather than a prose digression: `const [count, setCount] = useState(0)` declares local state; reading `count` gives this render's value; calling `setCount(next)` schedules a re-render. State the explicit scope boundary in a single sentence: the full `useState` API (typing, lazy init, what it's *not* for) is next chapter; here we study one property — that the value is a snapshot.

### A render is a snapshot of state

Teach the core model before any fix. Define **snapshot**: when React renders a component, it takes the current state and *bakes it into that render* as a plain constant. Inside that render's JSX and every function defined during it (event handlers, callbacks), `count` is a number literal frozen at render time — calling `setCount(...)` does not reach back and change it. The setter's only job is to ask React to render *again*, producing a *new* snapshot with the new value.

Reinforce the connection to prior lessons explicitly: this is the direct consequence of `UI = f(state)` (L1) and purity (L3). A pure function given input `count = 3` must always produce the same tree; it would be incoherent for `count` to mutate mid-render. State updates between renders, never during one.

Land the precise vocabulary the rest of the lesson leans on, set apart in an `Aside[note]`: "Setting state asks for a new render; it does not change the variable in the render you're in." Anchor to L1's phase strip in one sentence — the new snapshot is produced in the next `Render` box, after a fresh `Trigger`.

**Diagram — `DiagramSequence` "the snapshot timeline" (the spine visual of the lesson).** Pedagogical goal: make "each render owns its own frozen `count`" literally visible, so the +1 bug becomes obvious rather than mysterious. Author with plain HTML/CSS inside each `DiagramStep` (no diagram engine — this is a phase strip, per the diagrams guide). Steps:
- Step 1 — Render #0: a "photo" card labeled `count = 0`, showing the handler body with `count` literally substituted as `0` (e.g. `setCount(0 + 1)`). Caption: the component runs, React freezes `count` at 0 into this render.
- Step 2 — the user clicks; the handler runs entirely inside Render #0's snapshot; `setCount(1)` is *scheduled* (a small "queued: 1" chip appears). Caption: the click handler still sees `count` as 0 — it was defined in render #0.
- Step 3 — React re-renders → Render #1: a new photo card labeled `count = 1`. Caption: a new render, a new snapshot. The old photo is gone.
Keep each card short and horizontal (laptop viewport). This sequence is referenced again in the next two sections, so make `count` and the "photo" metaphor legible.

Tooltip candidates this section: `Term` on **snapshot** (the frozen value), and a `Term` reminder of **render** ("React calling your component function to produce a tree") since it's load-bearing and was last defined in L1.

### Three setters, one increment

Now the canonical bug, with the model in hand. Show the handler:

```tsx
function handleTripleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
```

Walk through it with the snapshot model: `count` is `0` in this render, so all three lines are literally `setCount(0 + 1)` → `setCount(1)`. Three requests to set state to `1`. The next render shows `1`, not `3`. Use `AnnotatedCode` (single block, focus attention line-by-line, blue tint default) to step: (1) the snapshot value of `count`, (2) each call substituting the same `0`, (3) the resulting next render. This is the right component because the insight is *which value each line reads*, and we need to direct attention to the same token three times.

Frame it as the interview classic it is, in one sentence, so the student recognizes it later.

**Exercise — `PredictOutput`.** Matches L3's house style (visceral prediction over prose). Program: a tiny component that on mount calls the triple-setter and logs `count` after, or simply a sequence the student reasons about. Cleaner version that avoids component mounting noise: present a script-style snippet that mirrors the snapshot semantics so the printed output is deterministic, OR keep it React and ask "after one click, what does the badge show?" Prefer the React framing via a short reasoning prompt. Use `<PredictWhy>` to land: "All three reads see the same snapshot (`count === 0`); three `setCount(1)` calls collapse to one `1`." If a plain `PredictOutput` is awkward to make deterministic for a React click, fall back to a `MultipleChoice` ("after clicking once, the counter shows: 1 / 3 / 0") with the explanation — author's call, but the prediction beat must exist here.

### Why the snapshot holds: automatic batching and the update queue

Explain the *mechanism* that makes "three setters, one render" true — this is the "why" the senior framing demands, and it sets up the updater form. Two ideas, simplest first:

1. **The update queue.** Each `setCount(...)` call doesn't render immediately; it pushes an entry onto a queue React keeps for that state. After your handler finishes, React processes the queue to compute the final next state, then renders once. Use React's own precise framing (verified against the docs): passing a **value** enqueues "replace the state with this value" — overriding whatever is already queued — while passing an updater enqueues a *function* that runs on the result so far. This is exactly why three `setCount(count + 1)` calls collapse to one (three "replace with 1" entries land on `1`) and why the updater form in the next section stacks instead.
2. **Automatic batching.** React groups all the setters fired during one event (and, since React 18 and unconditionally in React 19, also those fired in promises, `setTimeout`, and async callbacks) into a single re-render. Name this as the reason multiple setters in a row don't each re-read state and re-render — batching is *why* the snapshot is stable across them. State as fact (project runs React 19), not as configuration. Note the one boundary React draws: it does **not** batch across separate intentional events — two clicks are two renders; the batching is within one event's handlers.

Land the senior takeaway in an `Aside[note]`: batching is a feature, not a quirk — it prevents half-finished renders and is why you can call several setters without paying for several renders.

**Diagram — `DiagramSequence` "the queue" (or a `TabbedContent` with two tabs: 'Value form' vs 'Updater form').** Pedagogical goal: contrast *what gets queued* in the buggy form vs the fixed form, which is the crux. Recommend `TabbedContent` (two tabs, same UI surface, reveals the asymmetry — exactly its stated use case) with HTML/CSS queue visuals inside:
- Tab "Pass a value — `setCount(count + 1)`": queue shows three identical "replace with 1" entries; React applies → final `1`. Caption: every entry was computed from the same snapshot, and a value just replaces.
- Tab "Pass an updater — `setCount(c => c + 1)`": queue shows three *functions*; React threads them: `0 → 1`, `1 → 2`, `2 → 3`; final `3`. Caption: each function receives the result of the previous one.
This tab pair is the visual hinge between this section and the next.

Note for downstream agents: do **not** introduce `key`, lazy init, or `useReducer` here. Batching scope is exactly "many setters → one render"; the deeper async-batching nuance is illustrated again in the stale-closure section, not belabored here.

Tooltip candidates: `Term` on **batching** ("grouping multiple state updates into a single re-render").

### The updater form: read from the queue, not the snapshot

The fix, now motivated by the queue visual. Introduce `setCount(c => c + 1)`: the argument is a function that receives the **pending** value (the result of any updaters already queued) and returns the next one. React calls each queued updater in order, so three calls produce `0 → 1 → 2 → 3`.

Use `CodeVariants` (before/after — its primary use) with two tabs:
- "Value form" (`del` the three `setCount(count + 1)` lines): increments by 1.
- "Updater form" (`ins` the three `setCount(c => c + 1)` lines): increments by 3.
One-paragraph prose per tab per the component's six-line cap.

Land the senior rule crisply, set apart in an `Aside[tip]` titled with the rule: **when the next state depends on the previous state, use the updater form.** When it does not — `setCount(0)`, `setUser(freshUser)`, `setOpen(true)` — the direct form is fine and arguably clearer. Do not over-rotate into "always use updaters"; the senior cut is conditional.

Name two constraints the student must respect (recognition, tie to L3):
- The updater must be **pure** — no side effects, no reads from outside. Connect to L3's purity contract in half a sentence.
- React may call the updater **more than once in development** (Strict Mode) to surface impurity — name the *consequence* only; the mechanism is Ch 025.

**Exercise — `ReactCoding` (exploration mode), the load-bearing interactive moment.** Pedagogical goal: let the student *feel* the bug and the fix by editing one line. Starter: a working counter whose "+3" button uses the value form and visibly only adds 1 per click. `instructions`: "This button should add 3. It adds 1. Fix it by switching to the updater form." Exploration mode (no `tests`/`target`) so they tinker freely; `live` off so they Run intentionally and observe the jump from +1 to +3. Keep the starter tiny (a single component with a count badge and one button) so the edit is obvious. This is preferable to a sandbox because it's guided to one precise change.

### State you set now, you read on the next render

Address footgun #3 directly: the setter is **queued, not immediate**. Show:

```tsx
setCount(count + 1);
console.log(count); // logs the OLD count
```

Explain via the snapshot rule restated: the line after `setCount` is still inside the *current* render, whose `count` is unchanged. The new value exists only in the *next* render's snapshot. Name the corollary explicitly because students trip on it: **`setState` does not return the new value** — there is no `const next = setCount(...)`. To use the next state, read it on the next render (or derive it directly — forward-ref Ch 024 L2 in one clause without teaching it).

**Exercise — `PredictOutput`.** Program prints something like `0` then `0` (logging `count` before and after a `setCount(count + 1)` in a handler that fires once). `<PredictWhy>`: "The setter schedules a re-render; it doesn't reassign `count`. Both logs run in the same render, so both see the snapshot value." This is the cleanest deterministic `PredictOutput` in the lesson — make this the canonical one if the earlier prediction beat used `MultipleChoice`.

Brief senior aside (`Aside[note]`): if you find yourself wanting to "read the new state right after setting it," you usually wanted to compute that value directly during render — but that's derived state, which is next chapter. One sentence, no teaching.

### Stale closures: setters that run after the render

Extend the *same* snapshot rule to its scariest surface — asynchronous and delayed setters. Motivate with a concrete bug: a `setTimeout(() => setCount(count + 1), 1000)`. The callback captures `count` from the render where the timeout was *created*. If the user clicks twice before it fires, the second timeout also closes over the stale `count`, so two clicks can land as one increment.

```tsx
// captures the snapshot — stale if state moved on
setTimeout(() => setCount(count + 1), 1000);
// reads the live queued value — safe
setTimeout(() => setCount(c => c + 1), 1000);
```

Use `CodeVariants` (stale vs safe) to make the one-line difference jump out. Land the rule, broadened: **any setter that runs after render — timers, promises, async callbacks, subscriptions — should use the updater form unless you deliberately want the snapshot.** This is the general statement of which the triple-click bug was a special case; say so, to unify the two.

Define **closure** with a `Term` (the callback "remembers" the variables from the render where it was created) — non-obvious for the target student and the root cause word for this whole section. Keep the explanation to recognition depth; the course assumes JS closures from earlier units, so this is a reminder, not a teach.

Note for downstream agents: keep `useEffect` out of the code here. A bare `setTimeout` in a handler illustrates the capture without pulling in effect lifecycle (that's Ch 025). If an effect-shaped example is tempting, resist — name "effects too" only in the prose rule.

### Updating objects and arrays without mutating

Footgun #4 and the second reason a setter can appear to "do nothing." Connect to L1's `Object.is` rule and L3's spread reflex — this is the same muscle at the `setState` call site.

The trap:

```tsx
user.name = 'Alice';
setUser(user); // no re-render — same reference, Object.is bails out
```

Explain: React compares the next state to the current with `Object.is`. Mutating in place hands back the *same reference*, so React bails out and skips the render — the data changed but the screen didn't. The fix is to always produce a **new** object/array:

```tsx
setUser({ ...user, name: 'Alice' });        // object: spread + override
setItems([...items, newItem]);              // array: append
setItems(items.filter((i) => i.id !== id)); // array: remove
```

Use `AnnotatedCode` to walk the three idioms (object spread, array append, array remove/replace), each step naming what new reference is produced and why `Object.is` now sees a change. This is the right tool — one block, attention directed to each idiom in turn.

Cover the one nuance students miss: **spread is shallow.** Nested updates spread at each level:

```tsx
setUser({ ...user, address: { ...user.address, city: 'Berlin' } });
```

Name the bailout's useful side (one sentence): setting state to the same value/reference is a deliberate no-op you can lean on — but in-place mutation is the *accidental* version of it, and that's the bug. Mention Immer once as the recognition-level reach for deeply nested state; the course default is direct spread and updater functions. Do not demonstrate Immer.

**Exercise — `Buckets` (classification, two columns).** Pedagogical goal: drill the "does this re-render?" instinct that ties `Object.is` to the setter. Two buckets: "Re-renders" vs "Bails out (no re-render)". Items (chips): `setUser({ ...user, name: 'Al' })`, `user.name = 'Al'; setUser(user)`, `setItems([...items, x])`, `items.push(x); setItems(items)`, `setCount(count)` (same number), `setCount(count + 1)`, `setOpen(!open)`. This consolidates `Object.is` + immutability into one check and is a better fit than a quiz question because the sort *is* the reasoning.

### When sequential setters are fine: the direct form still has a place

Short, deliberately de-escalating section so the student doesn't cargo-cult updaters everywhere. The senior cut, stated plainly:
- Updater form when the next state **depends on** the previous (`c => c + 1`, `items => [...items, x]`, toggles read from prior state) or when the setter runs **after render** (async/timers).
- Direct form when the next state is **independent** of the previous — `setCount(0)` to reset, `setUser(serverUser)`, `setOpen(true)`. Clearer, and nothing is gained by an updater.

One or two lines only. Optionally fold this into the updater-form section's tip rather than its own header if the writer finds the lesson reads tighter — author's call, but the *idea* must land so students don't over-apply updaters.

### flushSync: forcing a synchronous render (the rare opt-out)

Name the opt-out once, framed as senior-intentional, not default. Because React 19 batches everything, there are rare moments when you need a state update to be committed to the DOM *before the next line runs* — almost always to measure layout or hand off to a non-React/third-party API. `flushSync(() => setCount(c => c + 1))` forces the render+commit synchronously.

```tsx
import { flushSync } from 'react-dom';

flushSync(() => setSelectedId(id));
// the DOM is updated here — safe to read/measure the new node
node.scrollIntoView();
```

Use a plain `Code` block (simple, single concept). State the cost in an `Aside[caution]`: `flushSync` defeats batching and forces an extra synchronous render — reach for it only when measurement or a non-React API demands it, never as a default. Note the import is from `react-dom`, not `react` (a common slip). Keep this section short — it's recognition, not a workhorse.

### Choosing the shape of your state: separate values or one object

Close on a daily design decision the snapshot/immutability material makes concrete, foreshadowed in the chapter framing and fully owned by Ch 024 — so keep it to the *cut*, not the API. The decision: two `useState` calls (`firstName`, `lastName`) vs one `useState({ firstName, lastName })`.

The senior cut:
- **Separate state** for values that change independently (a panel's `isOpen` and the search text) — more setters, but each update is a clean primitive set.
- **Grouped object state** for values that change together (a form draft, a settings bundle) — fewer setters, but every update is a spread (`{ ...form, email }`), and you carry the shallow-spread discipline from the previous section.

Frame it as a trade between number-of-setters and spread-ceremony, decided by whether the values share a lifetime. Name `useReducer` in exactly one sentence as the senior reach when an object's transitions multiply (3+ setters that move together) — owned by Ch 024 L4, not taught here.

Optional tiny `Buckets` or `MultipleChoice` is *not* needed here; the section is a closing judgment call, and the earlier `Buckets` already exercised immutability. Keep it prose.

### External resources (optional)

One or two `ExternalResource` / `LinkCard`s if they add value: the React docs "State as a Snapshot" and "Queueing a Series of State Updates" pages map almost 1:1 onto this lesson and are the canonical reference. A short embedded explainer video via `VideoCallout` is optional and resourcer-sourced — only if a current, high-quality clip on the snapshot model is found; do not block on it.

## Scope

Prerequisites to restate concisely (one line each, do not re-teach):
- `useState`'s shape from L3's primer: `const [v, setV] = useState(init)`; read = this render's value; `setV(next)` schedules a re-render.
- `Object.is` as React's equality rule (L1): primitives by value, objects/arrays/functions by reference.
- The spread reflex (L3): derive new values, never mutate what outlives the render.
- `UI = f(state)` and purity (L1, L3) as the *reason* state is a snapshot.

This lesson covers: the snapshot model; the `setCount(count + 1)`×3 bug; automatic batching and the update queue; the updater form `setX(c => …)` and when to reach for it vs the direct form; the queued-not-immediate trap (`setState` returns nothing, reads stale on the same line); stale closures in async/delayed setters and the updater-form fix; immutable object/array updates and the `Object.is` bailout at the call site; shallow-spread nesting; `flushSync` as the rare opt-out; the separate-vs-grouped-state cut.

This lesson does **not** cover (defer, with a one-clause pointer at most where the student will reach for it):
- Full `useState` API surface — typing/inference traps (`never[]`), lazy initializer `useState(() => …)`, setter stability, props-as-initial-state, what `useState` is not for → **Ch 024 L1**.
- Derived state and the "mirror prop into state via effect" anti-pattern / "you might not need an effect" → **Ch 024 L2** (mention only as the answer to "I want to read state after setting it").
- `useReducer` for multi-transition state → **Ch 024 L4** (named once as the alternative).
- `key`-as-state-reset tactic (record-bound form, animation replay, button-bump) → **Ch 023 L5**. This lesson never resets state by changing a `key`.
- `useEffect` and where post-render side effects go; running code *after* a state change → **Ch 025 L2**. No effects in this lesson's code.
- Strict Mode's double-invoke *mechanism* → **Ch 025 L1** (here only the named consequence: updaters/initializers may run twice in dev, so keep them pure).
- Structural sharing / performance of immutable updates, Immer at depth → recognition only.
- `useTransition` / `useDeferredValue` (other reasons to defer/prioritize updates) → **Ch 025 L5**. `flushSync` is the only scheduling escape hatch named here.
- State management libraries (Zustand, Jotai) → Unit 15.
- Form state, controlled vs uncontrolled inputs, server actions → Unit 6.

## Code conventions notes for downstream agents

- React 19 shape: components are `const`-bound arrow functions in project code; lesson snippets may use a `function` declaration for a standalone handler when it reads clearer (allowed by convention for named functions). Keep `const [x, setX] = useState(...)` for local UI state.
- No manual `useMemo`/`useCallback`/`React.memo` anywhere — the Compiler handles memoization (L1's thread). Inline handlers are fine; do not "optimize" them.
- Single quotes, 2-space indent, semicolons, trailing commas — Biome shape, mirror it in MDX blocks.
- Booleans as predicates (`isOpen`, not `open`) in any example that introduces a flag.
- `flushSync` imports from `react-dom`.
- Deliberate, flag for downstream agents: the buggy `setCount(count + 1)`×3 snippet and the mutate-then-`setUser(user)` snippet are anti-patterns being *exposed* — do not "fix" them inline; the corrected `CodeVariant`/`AnnotatedCode` tab models the convention-correct shape.
