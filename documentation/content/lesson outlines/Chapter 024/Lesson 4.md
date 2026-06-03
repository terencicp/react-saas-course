# useReducer when transitions multiply

- Title: `useReducer when transitions multiply`
- Sidebar label: `useReducer`

## Lesson framing

This is the fourth hook in the chapter (`useState` → derive → four homes → **`useReducer`**). The student already owns: immutable updates and the `Object.is` bailout (Ch 023 L4 / Ch 024 L1), the updater form `setX((c) => c + 1)`, purity (Ch 023 L3), lifting and the typed-callback contract (Ch 024 L3), and discriminated unions with `assertNever` exhaustiveness (Ch 005 L1/L2/L3). This lesson cashes **all** of those in at once — `useReducer` is the synthesis hook, not a new primitive. The senior framing the whole lesson hangs on: **a reducer is a state machine you write inline; reach for it when `useState`s start coordinating, not before.**

Core decisions, in order of weight:

1. **The trigger, not the API.** The lesson must open on the pain (a form with eight `useState`s and a stuck `isLoading` after a validation failure) so the student feels *why* before *how*. The convention slogan to land: "when `useState`s start coordinating, switch to a reducer." Concretely: 3+ related state values that update together, transitions with invariants, or one value set from many distant handlers. The Code-conventions rule is explicit: `useReducer` when coordinated transitions multiply (3+ `useState` calls that update together).
2. **Impossible states are the real win.** The deepest payoff is modeling `status` as a single discriminated field so `isLoading: true` *and* `error: 'x'` can never coexist. This is the bridge from Ch 005 — the student learned the *type* shape there; here they learn the *runtime hook* that holds it. Lead the "why a reducer over more `useState`" argument through impossible-state elimination, not through "less code."
3. **Purity is the contract.** The reducer is `(state, action) => newState`: pure, returns a new reference, no `fetch`, no `Math.random`, no DOM, no logging. This is the same contract as `useState` initializers and render bodies — name it as *the same rule applied again*, and note Strict Mode double-invokes in dev (mechanism owed to Ch 025 L1, asserted-only here).
4. **Async lives in the handler.** The single most common beginner mistake: trying to `await` inside the reducer. The shape to drill: handler starts the async and dispatches `{ type: 'submit' }`; on resolution dispatches `{ type: 'success', ... }` or `{ type: 'error', message }`. The reducer only ever maps a state + action to the next state.
5. **Typing in React 19.** Types live next to the reducer (`function reducer(state: State, action: Action): State`), not as generics on the hook call. Inference flows from the reducer signature into `state` and `dispatch`. Discriminated-union actions give per-`case` narrowing for free.
6. **`dispatch` is stable; state is a snapshot.** Same two facts as `useState`'s setter/value, restated at this call site — `dispatch` is safe in effect deps and safe to prop-drill without a callback wrapper; the next render sees the next state.

Pedagogical spine: this is a **decision + synthesis** lesson, so it leans on (a) a tight before/after refactor as the backbone (eight `useState`s → one reducer), (b) a `StateMachineWalker` decision tree for the trigger, (c) an `AnnotatedCode` walkthrough of the reducer + dispatch wiring, and (d) one `ReactCoding` exercise where the student adds a missing transition and watches the `assertNever` compile error guide them. Keep the running example a **submittable form with an async save** — it is the canonical real-world shape, it exercises every concept (coordinated values, invariants, async-in-handler, lazy init from a prop), and it forward-connects to Unit 6 forms. Recognition-only topics (Immer, XState, Redux vocabulary, context-sharing, `useTransition`) get one or two sentences each and a forward pointer — do not let them bloat the lesson.

Mental model the student leaves with: *State shape is a design decision. When several values move together and some combinations are illegal, stop scattering `useState` and model the transitions as a reducer — a pure function over `(state, action)` whose action is a discriminated union, whose body is an exhaustive switch, and whose async lives in the caller.*

Mark-color convention (continued from L1/L2/L3): **orange = smell** (scattered coordinated `useState`s, async in reducer, returning the same/partial state), **green = correct** (the reducer fix, the handler-owns-async shape), **red = type/compile error** (the `assertNever` catch on a forgotten action). Reuse these consistently.

## Lesson sections

### Eight useStates and a stuck spinner

Open on the pain, not the API (decisions-before-syntax filter). Present a `NewInvoiceForm`-style Client Component carrying a realistic pile of coordinated `useState`s: field `values`, `errors`, `isSubmitting`, `submitError`, `isSaved`. Walk a concrete bug: a submit handler sets `isSubmitting(true)`, validation fails, an early `return` skips the `isSubmitting(false)` reset, and the spinner stays forever. Land the diagnosis: these five values are **one machine wearing five hats** — every handler must remember to keep them consistent, and nothing enforces that `isSubmitting` and `submitError` are mutually exclusive with `isSaved`.

Convey with a `Code` block of the messy component (kept short — show the handler and the `useState` cluster, elide the JSX with a comment). Then state the thesis sentence: *when several `useState`s must change together to stay correct, you don't have five pieces of state — you have one, and you want one place that owns every legal transition.* Name the tool (`useReducer`) and the convention threshold verbatim: **3+ coordinated `useState` calls that update together**. Connect explicitly back to Ch 024 L3's "under-lifted = duplicated state + sync effect" smell — this is its sibling smell *inside one component*: too many setters, no single transition authority.

Tooltip terms: ((transition)) — a move from one state value to the next; ((invariant)) — a rule about which state combinations are legal (e.g. never submitting and saved at once).

### The signature: state, dispatch, and a reducer

Introduce the API now that the student wants it. Use a `Code` block for the call site:

```
const [state, dispatch] = useReducer(reducer, initialState);
```

Teach each piece as a short labeled list (mirror the L1 `useState` framing so the symmetry is obvious):

- `reducer` — a pure `(state, action) => newState` function. Define it *outside* the component (it depends on nothing but its arguments) — reinforces purity and that it's unit-testable without React.
- `state` — the current snapshot. Same snapshot rule as `useState`'s value.
- `dispatch(action)` — queues an action; React calls the reducer with current state + the action and re-renders with the result. **Referentially stable across renders**, like `useState`'s setter.
- third arg `init` — the lazy initializer, deferred to its own section below.

Land the parallel as a one-row mental mapping (prose or a tiny two-column `TabbedContent` is overkill — a sentence suffices): `useState` gives you `[value, setValue]`; `useReducer` gives you `[state, dispatch]`, trading "a setter per value" for "one dispatcher and a named vocabulary of changes."

State the two carried-over facts crisply because they're load-bearing later: **`dispatch` is stable** (safe in effect deps, safe to pass down as a prop without wrapping it in a callback — contrast Ch 024 L3 where raw `setState` setters were *not* to be prop-drilled; `dispatch` is the sanctioned exception because its identity is stable and the action vocabulary is the contract). **State follows the snapshot rule** — dispatching queues; the next render sees the next state.

Tooltip term: ((dispatch)) — the function that sends an action to the reducer.

### Actions as a discriminated union

This is the Ch 005 payoff section. Teach the action type first, because the action vocabulary *is* the component's API for change. Use a `Code` block:

```
type Action =
  | { type: 'editField'; field: keyof Values; value: string }
  | { type: 'submit' }
  | { type: 'success' }
  | { type: 'error'; message: string }
  | { type: 'reset' };
```

Points to make:
- The `type` field is the **discriminant**; payloads ride as extra fields. Explicitly call back to Ch 005 L1 — "this is the discriminated union you already know, now driving a hook."
- TypeScript narrows per `case`: `action.message` exists only where `action.type === 'error'`. This is what makes the reducer body type-safe with zero casts.
- Naming: action `type`s read as **events that happened or commands** (`'submit'`, `'editField'`), not as setter names (`'setLoading'`). The senior tell — actions describe *intent*, the reducer decides *consequence*. A reducer with a `'setIsLoading'` action has missed the point; that's just `useState` with extra steps.

Keep this tight; the student knows discriminated unions. The new idea is *applying* them as an action vocabulary. One `MultipleChoice` or `Buckets` check could verify the "actions are events, not setters" distinction — a `Buckets` sorting candidate action names into "good (intent)" vs "smell (setter-shaped)" buckets fits perfectly and is low-cost. Include it here.

Tooltip terms: ((discriminant)) — the literal field TypeScript switches on to narrow a union (re-assert from Ch 005); ((payload)) — the data an action carries beyond its `type`.

### The reducer: one exhaustive switch, no mutation

The heart of the lesson. Teach the reducer body with **`AnnotatedCode`** (`lang="ts"`, `maxLines` ≤ 18) so attention is directed case-by-case. Author the full reducer once; step through it:

```
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'editField':
      return { ...state, values: { ...state.values, [action.field]: action.value } };
    case 'submit':
      return { ...state, status: 'submitting', submitError: null };
    case 'success':
      return { ...state, status: 'saved' };
    case 'error':
      return { ...state, status: 'idle', submitError: action.message };
    case 'reset':
      return initialState;
    default:
      return assertNever(action);
  }
}
```

Annotated steps (each ≤ 6 lines prose):
1. Signature — `(state, action) => State`, defined outside the component; types live here, this is what `useReducer` infers from. (color blue)
2. The `editField` case — spread `...state` first, then nest-spread `values`. Reinforce the immutable-update reflex from Ch 023 L4 / Ch 024 L1: **always spread `...state` first, then override** — forgetting it returns a *partial* state (a real watch-out). (color green)
3. `submit` — note it sets `status: 'submitting'` **and** clears `submitError` in one atomic transition. This is the impossible-state win in action: the two fields can't drift because one transition owns both. (color green)
4. `error` — carries a payload (`action.message`), available only because the discriminant narrowed. (color green)
5. `default: assertNever(action)` — the exhaustiveness guard from Ch 005 L3. If a teammate adds an action `type` and forgets a `case`, this is a **compile error**, not a runtime surprise. (color red on the `default` line to signal "this is your safety net," with prose clarifying red here means "catches the error at build time")

Crucial conceptual point to state plainly after the walkthrough: **the reducer holds a `status` discriminated field instead of separate `isSubmitting` / `isSaved` / `hasError` booleans.** Show the `State` type explicitly in a small `Code` block so the impossible-state elimination is concrete:

```
type State = {
  values: Values;
  status: 'idle' | 'submitting' | 'saved';
  submitError: string | null;
};
```

Drive home: three booleans = eight combinations, several illegal; one `status` = exactly three legal states. This is the sentence the whole lesson exists to deliver — model the machine, and the illegal states become *unrepresentable*, echoing Ch 005's "impossible states, unrepresentable."

The bailout watch-out belongs here (it qualifies the reducer-writing concept, not a separate section): returning `state` unchanged (or any `Object.is`-equal reference) **bails out the render**, exactly like `useState`. A `default` that returns `state` is sometimes deliberate (ignore unknown action) but usually a bug — prefer `assertNever`. Mention Strict Mode may double-call the reducer in dev (asserted, mechanism → Ch 025 L1).

Tooltip term: ((reducer)) — a pure function that takes the current state and an action and returns the next state.

### Wiring dispatch in the component

Show the refactored component now — the before/after is the payoff, so use **`CodeVariants`** with two tabs:

- **Tab "Scattered `useState`s"** (mark-color orange): the cluster from section 1, abbreviated. First-sentence framing: "five setters, every handler responsible for consistency."
- **Tab "One reducer"** (mark-color green): `const [state, dispatch] = useReducer(reducer, initialState)`, handlers reduced to `dispatch({ type: 'editField', field, value })` etc. First-sentence framing: "one dispatcher, the reducer owns every transition."

Then teach reading state in JSX: `state.status === 'submitting'` drives the disabled button, `state.submitError && <FieldError>` (use `Boolean(...)` / `!= null` per the conditional-render convention from Code conventions — `submitError` is `string | null`, so `state.submitError != null && ...` or just truthy-string is fine; show the convention-correct form). Inputs become controlled from `state.values`, `onChange` dispatches `editField` — connect to Ch 024 L3's controlled-input + typed-handler contract: the handler shape is preserved, only the storage changed.

Note the **dispatch-down** pattern briefly: because `dispatch` is stable, passing it to a child as a prop is fine and idiomatic (unlike raw setters). Keep this to two sentences; the multi-component/context version is recognition-only (next section's watch-out / Ch 025 L5).

### Async belongs in the handler, never the reducer

The highest-value correction in the lesson — give it its own section. State the rule first: **the reducer is pure, so async cannot live in it.** Async lives in the handler that calls `dispatch`.

Teach the canonical sequence with a `Code` block (the async submit handler):

```
async function handleSubmit() {
  dispatch({ type: 'submit' });
  const result = await saveInvoice(state.values);
  if (result.ok) {
    dispatch({ type: 'success' });
  } else {
    dispatch({ type: 'error', message: result.error });
  }
}
```

Points:
- Three dispatches bracket the await: start → (await) → success | error. The reducer never sees the Promise; it only maps the bracketing actions to state. (Use the `Result<T>`-style `{ ok, ... }` shape — it's the course's discriminated-union return convention from Ch 005, keeps continuity, and avoids `try/catch` clutter in a teaching snippet. Note as deliberate.)
- The anti-pattern to reject (orange): a `case 'submit': const data = await fetch(...)` inside the reducer. State plainly why it's broken — the reducer must be synchronous and pure; an `await` there means side effects, double-invocation hazards under Strict Mode, and an unpredictable state graph.

Optionally reinforce with a small **`DiagramSequence`** (3 steps) showing the state moving `idle → submitting → saved`/`error` as each dispatch fires, with the `await` sitting *between* dispatch 1 and dispatch 2 — pedagogical goal: make visible that the component re-renders at `submitting` (spinner shows) *before* the await resolves, which is exactly the bug the scattered version got wrong. This is a strong, cheap visual; include it. Wrap nothing (DiagramSequence is self-carding).

Forward-pointer (one line): when this async submit is a real form, `useActionState` + Server Actions package this start/await/result shape — Unit 6. And `dispatch` can be wrapped in a `useTransition` to mark it non-urgent — Ch 025 L6. Recognition only.

Tooltip term: ((side effect)) — work that reaches outside the function (network, DOM, logging, randomness); reducers must have none.

### Lazy initialization with init

Short section, parallels `useState`'s lazy initializer (Ch 024 L1) so it's a quick transfer. Signature:

```
const [state, dispatch] = useReducer(reducer, draftFromServer, init);
```

`init(arg)` runs **once on mount** to compute initial state from `arg`. Same threshold as L1's lazy form: reach for it when initial state requires real work — parsing a localStorage draft, deriving from a prop (e.g. seeding the form from a server record). Show a tiny `init` that maps an incoming `invoice` prop to the reducer's `State` shape. Note the symmetry: `useState(() => …)` is a thunk; `useReducer(reducer, arg, init)` passes `arg` *into* `init` so the initializer is reusable and testable. Keep ≤ 8 lines of code.

Tie the snapshot caveat back to L1's frozen-prop trap in one sentence: `init` runs at mount only — later changes to the `invoice` prop won't re-run it; if the form must reset when a different record is selected, that's a `key` reset (Ch 023 L5), not a re-init. This closes the loop with the chapter's recurring "seeded-from-prop" thread.

### Choosing useReducer over useState

The decision section — make it interactive with a **`StateMachineWalker`** (`kind="decision"`, do NOT wrap in `<Figure>`). Pedagogical goal: drill the *order* of the senior's questions so the student internalizes that `useReducer` is a threshold tool, not a default. Branch structure:

- Root: "How many state values must change together to stay correct?"
  - "One (a counter, a toggle, a single field)" → Leaf **`useState`** — "One value, one or two transitions. A reducer is pure ceremony here."
  - "Several" → next question.
- "Are some combinations of those values illegal (can't be loading *and* saved)?"
  - "Yes" → Leaf **`useReducer` (model the `status` machine)** — "Collapse the booleans into one discriminated `status` field; the reducer makes illegal states unrepresentable."
  - "No, they're just several independent values" → next question.
- "Is the same value set from many distant handlers, or is the update logic worth a name?"
  - "Yes" → Leaf **`useReducer` (one transition authority)** — "Name the transitions; centralize the logic in one testable function."
  - "No" → Leaf **Grouped `useState`** — "A single `useState({...})` object with spread updates is enough; revisit if transitions multiply."

This walker doubles as where the **separate-vs-grouped `useState`** decision lands (the L1 continuity note explicitly deferred it to L4 as a one-line pointer) — the "No, independent" / "Grouped" leaf is its home. Keep that leaf's body to two sentences naming the grouped-object option.

After the walker, list **when `useReducer` earns its weight** as a tight bulleted recap (the five triggers from the chapter outline, compressed to four): coordinated values that move together; transitions with invariants; logic worth a name; testability without React. And the inverse — **when `useState` wins**: a counter, a toggle, a single field, one or two transitions. Slogan to close: "reach for the reducer when the ceremony pays for itself."

The "I have 12 `useState`s in one component" line is the loud trigger — state it as the unmissable signal.

### Practice: complete the state machine

A **`ReactCoding`** exercise (tests-graded, `hidePreview` since it's about reducer logic not visuals). Pedagogical goal: the student writes a reducer transition and feels the `assertNever` safety net.

- **Starter:** a working reducer for a small async-toggle/like-button or download machine (`status: 'idle' | 'loading' | 'done' | 'error'`) with the `'start'` and `'success'` cases written, the `Action` union complete, `default: assertNever(action)` in place, and the `'error'` case **missing** (so it currently fails to compile *and* fails the runtime test). The component's handler already dispatches `'error'` on failure.
- **Task (instructions):** "Add the `'error'` case so a failed request lands in the `error` state with its message. The `assertNever` line will stop complaining once every action is handled."
- **Tests:** assert the rendered DOM shows the error message after a simulated failed dispatch, and that the button re-enables (status back to a non-`loading` state). Because diagnostic text is hidden from the student, write test *names* that communicate ("error message is shown after a failed save", "button is re-enabled after an error").
- **Grading criteria for the agent building it:** pass = the `'error'` case spreads `...state`, sets the status field, and stores `action.message`; the `assertNever` compiles. The exercise should be solvable in ≤ 5 lines added.

This is the right exercise type because the concept is *writing a pure transition with a payload under an exhaustive switch* — a `ReactCoding` tests-graded task makes the reducer's correctness checkable and lets the student experience the exhaustiveness guard firsthand, which no static example can. Guided (single missing case), not an open sandbox.

### State machines, libraries, and the names you'll meet

Recognition-only closer — keep brief, this is vocabulary the student will encounter, not skills to build. Cover in 1–2 sentences each, ideally as a small `Card`/`CardGrid` or tight bullets:

- **It's a state machine.** `idle → loading → success | error` is a four-state machine; a reducer is the inline, library-free way to model one. When transitions get *guarded* or *nested*, the dedicated library is **XState** — overkill for most components, right when the machine is genuinely complex. Recognition only.
- **Redux vocabulary transfers.** Actions, reducers, dispatch — `useReducer` is "single-component Redux." The course doesn't teach Redux; the point is the mental model carries to any reducer-based store you meet. (Global stores Zustand/Jotai → Unit 15, recognition.)
- **Immer for deep nesting.** When spreads pile up on deeply nested state, Immer's `produce` lets you write mutating-style code that yields an immutable result. The course default stays explicit spreads — shallow updates dominate and the spreads keep intent visible. Recognition only, one sentence.
- **Sharing a reducer across components** is done via context (`dispatch` is stable, so it passes cleanly) — but context has a re-render cost, mitigated by splitting state and dispatch into separate contexts. Forward to Ch 025 L5 (correct the chapter-outline's "L4" reference). Recognition only.

End with one `ExternalResource` LinkCard to the React docs `useReducer` reference (and optionally "Extracting State Logic into a Reducer"). No video unless the resourcer finds a high-signal short one — not required; the interactive walker + exercise carry the lesson.

## Scope

**Already taught — assert, don't re-teach (redefine in ≤ 1 clause each):**
- Discriminated unions, the discriminant, narrowing, `assertNever`/exhaustiveness — Ch 005 L1/L2/L3. This lesson *applies* them; it does not teach the type machinery. One-line re-assertion only.
- Immutable updates, spread-to-new-reference, the `Object.is` bailout — Ch 023 L4 / Ch 024 L1. Restated at the reducer call site, not taught.
- The updater form / snapshot model / stable-setter guarantee — Ch 024 L1. The `dispatch`-stable, state-snapshot facts are the same facts restated here.
- Purity contract for render/initializers — Ch 023 L3. The reducer purity rule is "the same rule again."
- Lifting, controlled inputs, typed `on*Change` callbacks, the four homes — Ch 024 L3. Used as the wiring context; the dispatch-as-prop exception is the only new wrinkle.
- `key` reset for prop-seeded state — Ch 023 L5. Cited as the alternative to re-init, not taught.
- Lazy `useState(() => …)` initializer + threshold — Ch 024 L1. `init` parallels it.

**Deferred — name once with a forward pointer, do not teach:**
- `useEffect` signature, lifecycle, cleanup, deps, and Strict Mode double-invoke *mechanism* — Ch 025 L1/L2. Here: only the bare fact that dev double-invokes the reducer.
- `useContext` and its re-render footgun / split-context mitigation — Ch 025 L5 (NOT L4 — chapter outline is stale here). Recognition only, for the share-a-reducer case.
- `useTransition` wrapping a `dispatch` — Ch 025 L6 (NOT L5). One-line forward reference.
- Rules of hooks (unconditional top-level call order) — Ch 025 L8. Foreshadow at most; not owned here.
- Async form actions, `useActionState`, Server Actions, validation, the full form surface — Unit 6. The async-submit handler here is a teaching shape, not the production form pattern.
- `useRef` — Ch 024 L5 (next lesson). Do not preempt.
- Redux / Zustand / Jotai as real tools — Unit 15. XState as a real tool — recognition only. Immer surface — recognition only.
- Server-state caching (TanStack Query) — Unit 15 / Ch 11. The `saveInvoice` call is a stand-in, not a data-layer lesson.
- Reducer unit-testing tooling/framework — mentioned as a *benefit* (reducers are testable without React) but the testing chapter owns the how.

**This lesson's lane:** the trigger threshold (`useState` → reducer), the `(state, action) => newState` signature, discriminated-union actions as an intent vocabulary, the exhaustive non-mutating reducer body, the `status`-field impossible-state win, wiring `dispatch` (incl. dispatch-as-prop), async-in-the-handler, lazy `init`, and the `useReducer`-vs-`useState` decision. Everything else is recognition or a pointer.

## Notes for downstream agents

- The continuity-note Mermaid `flowchart LR` chapter-map convention (four-homes leaves labeled with owning lessons, established L1→L3) is a *placement* map and does not naturally fit this hook-selection lesson. Use the `StateMachineWalker` decision tree for this lesson's interactive decision instead; if a static chapter-map figure is desired for consistency, keep its leaf labels consistent with L1–L3, but it is optional here — do not force it.
- Keep the running example one coherent submittable form (`NewInvoiceForm` / invoice save) across sections 1, 4, 5, 6, 7 so the before/after refactor reads as one story; the practice exercise (section 9) may use a smaller disposable machine (like/download button) to avoid coupling the grader to the form.
- Code-convention divergences that are deliberate (note inline so they aren't "corrected"): teaching snippets elide JSX with comments; the async handler uses a `Result`-style `{ ok }` return rather than `try/catch` for clarity; `assertNever` is assumed importable (from Ch 005's `lib`), shown in use without re-deriving it.
