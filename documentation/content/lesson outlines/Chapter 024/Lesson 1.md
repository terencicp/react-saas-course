# Lesson 1 — The useState surface and lazy initialization

- **Title (h1):** The useState surface and lazy initialization
- **Sidebar label:** The useState surface

---

## Lesson framing

This is the first lesson of Ch 024 ("Hooks for holding state") and the first lesson to teach `useState` as a full API.
Ch 023 already spent the student's `useState` budget on the *render model*: L3 gave a capped 3-sentence primer (`const [v, setV] = useState(init)`; read = this render's snapshot; `setV(next)` schedules a re-render), and **L4 owns the snapshot model, the update queue, automatic batching, the `setCount(count+1)`×3 bug, the updater form, stale closures, the `Object.is` mutate-then-set bailout, the three immutable idioms (`{...obj}`/`[...arr]`/`filter`/`map`), shallow-spread nesting, and the separate-vs-grouped-state closing cut.**
This lesson must **cash those in at the `useState` call site, not re-derive them.** Re-teaching the snapshot derivation or the triple-click bug would duplicate L4 and waste the student's time.

What this lesson actually *owns* (the debts L4 and L3 forwarded here): the **full signature and tuple destructuring**, **TypeScript typing of `useState`** (inference defaults and the four annotate-on-purpose triggers), **lazy initial state in full** (L3/L4 only named `useState(() => …)` in one line each as a forward hook), **setter stability** as a named guarantee, **reading props as initial state — the controlled/frozen trap**, and **what `useState` is *not* for** (the four-homes map that the rest of the chapter expands). The chapter framing's spine — *state shape is a design decision before it's a syntax decision* — lands here as the lesson's organizing question: **"does this value belong in `useState` at all, and if so, in what shape?"** before any API detail.

Senior-mindset framing (the course's first pillar): the API is small, so the lesson's value is in the *judgment* around it. Beginners reach for `useState` reflexively (it's the first hook they learn), then suffer the predictable consequences — `never[]` arrays that won't `.push`-typecheck, expensive work re-run every render because the lazy form was skipped, props frozen into state that silently stops tracking the parent, and `useState` holding values that should be refs, derived, lifted, or server state. Each of these is a *decision* the lesson surfaces, not a syntax point. The mental model the student should leave with: **`useState` is the default home for a value that (a) the JSX reads and (b) changes over time independently of other state — and the surface rewards getting the *shape* and the *initial-value form* right on the first try.**

Cognitive-load management: build the API in layers. Start with the bare tuple (already familiar from Ch 023), then add one decision at a time — typing → initial-value form (eager vs lazy) → the controlled-trap → the not-for map. Lean hard on Ch 023's established `Trigger → Render → Reconcile → Commit` strip, the `Object.is` rule, the snapshot `Term`, and the spread reflex — assert them in one line, never re-teach. Every new idea is anchored to a concrete `useState(...)` call the student can read.

TypeScript is taught as one language with JS (course stance) — typing `useState` is woven into the signature section, not a separate "types" detour. The lesson is TSX throughout.

This lesson does **not** introduce new continuous-example characters gratuitously; small, self-contained snippets (a counter, a `<TabPanel>`'s active tab, a `Todo[]` list, a `localStorage`-seeded draft, a `<PriceInput>` reading a `defaultValue` prop) each illustrate one decision and are discarded. Avoid a single forced narrative — the lesson is a tour of four daily decisions, and crisp independent snippets serve that better than one over-loaded component.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. A component needs to hold a value that changes over time and drives what the user sees — a counter, a toggle, the active tab, a half-typed form field. `useState` is the answer the student already met in Ch 023 as "the setter that schedules a re-render." Now we install the *full* surface and, more importantly, the **judgment around it**: the initial value runs once but a careless initializer runs every render; the value is a fresh snapshot while the setter is stable; reading a prop as initial state freezes it; and half the values juniors put in `useState` don't belong there at all.

State the payoff in one or two warm sentences: by the end the student will read any `useState(...)` call and know its type, whether its initializer is paying rent, and whether the value even belongs in state. Connect explicitly back to Ch 023 ("you already know the setter schedules a render and that state is a snapshot — now we make the call site itself a deliberate decision") and forward-tease that the rest of the chapter is the *other* homes (derive, lift, URL/server, reducer, ref, id). Keep it brief; no celebratory tone (course stance).

No diagram here — the introduction motivates, the body teaches.

### The signature: a snapshot and a stable setter

Teach the full signature: `const [count, setCount] = useState(0)` returns a **two-element tuple** — the current value (this render's snapshot) and a setter. Cover, in order:

- **Tuple destructuring and naming.** `[value, setValue]` is the convention; the setter is `set` + the value's name (`setCount`, `setUser`, `setIsOpen`). This is array destructuring (the position matters, not a key), which is *why* you can name them anything — contrast with object destructuring in one line. Anchor to the naming convention (booleans read as predicates: `isOpen` not `open`).
- **The initial value is used on the first render only.** Subsequent renders ignore the argument entirely — React already holds the current value. Re-anchor to Ch 023's mount-vs-update: the initializer is a *mount* concern. This is the seed for the lazy-init section (the argument's evaluation cost matters precisely because the *result* is discarded after mount).
- **The setter is stable across renders (same reference).** Name this as a guarantee, not a derivation. It matters because it can sit in a `useEffect` dependency array without causing re-runs (forward-ref Ch 025 L2) and because the React Compiler relies on stable identities (Ch 023 L1 thread, Ch 026 L2). One sentence each, recognition-level.
- **The value is a fresh snapshot, the setter only asks for a new render.** Assert from Ch 023 L4 in one line — do **not** re-derive the snapshot model. Cross-reference L4 explicitly ("you saw why three `setCount(count+1)` calls increment by one — that's the snapshot rule, and it applies at every `useState` call site").

**Component:** `CodeTooltips` on a single small `Counter` block (the canonical `const [count, setCount] = useState(0)` with a `<button onClick={() => setCount((c) => c + 1)}>`). Tooltip keys: `useState` ("React hook. Returns a [value, setter] tuple. Re-runs the component when the setter is called."), the destructuring `[count, setCount]` is hard to key cleanly, so instead tooltip `setCount` ("Stable across renders. Schedules a re-render; never mutates `count` in place.") and `0` ("Initial value — used on the first render only; ignored after."). Use the updater form `(c) => c + 1` here (consistent with L4 and Biome's parenthesized-arrow rule) and tooltip `=>` lightly if helpful. Reasoning: one compact block carries the whole signature without a stepped walkthrough; tooltips keep definitions inline so the reader never leaves the code.

`Term` candidates in this section: **snapshot** (re-assert Ch 023 L4's definition in one line — the frozen per-render value), **mount** (Ch 023 — first render, no previous tree). Keep both to one-line refreshers; they are prerequisites, not new.

### Typing useState: inference by default, annotate on purpose

This is one of the two sections the lesson genuinely owns. The senior reflex from the code conventions ("inference-led at the boundaries; strict at the seams") drives it: **let inference win, annotate only when inference would narrow too tight or widen wrong.**

Teach the inference defaults first (they're correct most of the time):
- `useState(0)` infers `number`, `useState('')` infers `string`, `useState(true)` infers `boolean`. No annotation needed — the initial value *is* the type signal. This is the common case; lead with it so the student doesn't over-annotate.

Then the four annotate-on-purpose triggers (the part juniors get wrong):
1. **Empty array → `never[]` trap.** `useState([])` infers `never[]`, so `items.push(todo)` is a *type error* (you can't push anything into `never[]`). Fix: `useState<Todo[]>([])`. This is the single most common typing bug with `useState` — give it the most weight.
2. **Empty/loose object.** `useState({})` infers `{}` (usable but loose — no known fields). Annotate the shape: `useState<FormDraft>({ email: '', password: '' })` or annotate when the object will grow fields.
3. **Nullable state.** `useState(null)` infers `null` (only ever null). When the value will later hold a `User`, annotate the union: `useState<User | null>(null)`. The `noUncheckedIndexedAccess`/strict stance means the `| null` is honest and forces a null-check at read sites (good).
4. **Union/wider-than-initial.** When the initial value is one member of a union the state will range over — `useState<Status>('idle')` where `Status = 'idle' | 'loading' | 'done'` — annotate so the setter accepts the other members. Without the annotation, `useState('idle')` infers the literal-widened `string`, which is *too wide* in the other direction. (Connect to Ch 005 discriminated-union/literal-union seed in one line.)

The senior cut, stated once: **annotate `useState` when the initial value can't represent the full range of the state** (empty collections, `null` placeholders, union members) — otherwise trust inference.

**Component:** `CodeVariants` titled around the `never[]` trap, since it's the highest-value one and pairs cleanly as wrong/right.
- Variant "Inferred (`never[]`)": `const [todos, setTodos] = useState([]);` then `setTodos([...todos, newTodo]);` with the offending line marked. Prose: leads with "**Type error.** `[]` infers `never[]` — the array can never hold anything." Wrap pane in `<div data-mark-color="red">`.
- Variant "Annotated": `const [todos, setTodos] = useState<Todo[]>([]);` same usage, now valid. Wrap in `<div data-mark-color="green">`. Prose: "**The annotation is the shape signal the empty literal can't give.**"
This is a deliberate anti-pattern shipped *to be rejected* — flag for downstream agents that the red variant is the error being exposed, the green is convention-correct.

After the `CodeVariants`, a short `Code` block (or inline) showing the `null` and union cases (`useState<User | null>(null)`, `useState<Status>('idle')`) so all four triggers are concrete. Keep it tight.

**Exercise — `Buckets` (classification, two-column).** Title/instructions: "Sort each `useState` call into whether it needs an explicit type annotation." Buckets: `name="infer"` label "Let inference win" description "Initial value is the full type", `name="annotate"` label "Annotate the type" description "Initial value is too narrow or null". ~7 chips:
- `infer`: `useState(0)`, `useState('')`, `useState(false)`, `useState({ x: 0, y: 0 })` (a fully-populated object — inference is fine).
- `annotate`: `useState([])` (→ `never[]`), `useState(null)` (will hold a user), `useState('idle')` where state ranges over a status union.
Reasoning: classification is the right format for a recognition skill ("can the initializer represent the full range?"). Two-column keeps it compact. Grading is built-in (correct bucket per chip). Place it right after the four triggers so it checks the freshly-taught cut.

`Term` candidates: **inference** (TypeScript deducing a type from a value, no annotation needed) — likely already familiar from earlier TS chapters; include only a one-line refresher. Do **not** `Term` `never[]` — it's explained in prose where it appears.

### Eager vs lazy initial state

The second section the lesson owns in full (L3/L4 only name it in one line). Build it in two steps to manage load.

**Step 1 — the problem.** `useState(expensiveCompute())` calls `expensiveCompute()` on *every* render and throws the result away on every render after the first (because the initial value is ignored after mount — callback to the signature section). The function call sits in the component body, so it runs as part of rendering. For `useState(0)` this is free; for `useState(JSON.parse(localStorage.getItem('draft')))` or `useState(buildIndexFrom(largeProp))` it's wasted work on every keystroke elsewhere in the component.

**Step 2 — the fix: pass a function.** `useState(() => expensiveCompute())` passes an **initializer function** that React calls *once*, on mount only. React sees a function and defers it; subsequent renders never call it. Make the distinction visceral: `useState(expensiveCompute())` *calls now, every render*; `useState(() => expensiveCompute())` *passes a recipe React runs once*. This is the same "pass a function, don't call it" shape the student will see again with the updater form — name the parallel lightly.

**The threshold (senior judgment, the load-bearing part):** reach for the lazy form when the initializer **touches storage** (`localStorage`/`sessionStorage`), **parses** (JSON, a query string), **walks or builds a large structure** (indexing an array, deriving a map), or **measures** anything. For a literal or a cheap expression (`useState(0)`, `useState(props.count ?? 0)`), the direct form is fine — the lazy wrapper would be ceremony. Frame it exactly like the chapter's "trigger before tool" stance: the lazy form earns its weight at a named threshold, not prophylactically.

Two watch-outs land here (inline, in the section that teaches the concept — not bundled):
- **The initializer must be pure** (Ch 023 L3). Strict Mode may call it twice in development — assert the consequence in one line, cross-ref Ch 025 L1 for the *mechanism*. (Aligns with L3/L4's "updaters/initializers must be pure" thread.)
- **Function-as-value gotcha.** Passing a function you want to *store as state* (`useState(handler)`) calls `handler()` once instead of storing it — React treats any function argument as an initializer. To store a function as state, wrap it: `useState(() => handler)`. This is a genuine surprise; give it a sentence and a one-line code contrast. (This is rare but it's the one place the lazy-init mechanism bites unexpectedly.)

**Component:** `CodeVariants` (eager vs lazy), the cleanest before/after.
- Variant "Every render": `const [draft, setDraft] = useState(parseDraft(localStorage.getItem('draft')));` — prose leads "**Runs `parseDraft` on every render**, discards all but the first result." `data-mark-color="red"` (or `orange`, since this is a perf smell not a hard error — use `orange` to distinguish from the `never[]` type-error red).
- Variant "Once, on mount": `const [draft, setDraft] = useState(() => parseDraft(localStorage.getItem('draft')));` — prose "**React calls the initializer once.** Wrapping in `() =>` defers it to mount." `data-mark-color="green"`, mark the `() =>`.
Use `ins`/`del` framing isn't ideal across two variants — colored marks on the `() =>` carry it. Flag the eager variant as the anti-pattern exposed.

**Exercise — `PredictOutput`.** This is the strongest way to make "once vs every render" visceral, and `PredictOutput` is deterministic (unlike a click). Program: an initializer function that `console.log`s a tag and returns a value, used in *eager* form, inside a component that re-renders a couple of times (e.g., a parent maps and a state toggle fires one extra render — or simpler: render the component, then call its setter once via a scripted interaction the harness drives). Simpler and safe: a plain module-level demo, not a click — e.g.,

```
function init() { console.log('init'); return 0; }
function App() {
  const [n, setN] = useState(init());   // eager
  // ... a deterministic second render is hard without a click
}
```

Because a React re-render in `PredictOutput` isn't deterministic stdout, prefer a **plain-JS reproduction** that models the same idea without React: a function `createState(initialOrFn)` mimicking React's "call the function once vs use the value as-is," invoked twice, logging when the expensive work runs — eager arg logs twice (it's evaluated at each call site), function arg logs once. Expected output demonstrates `init ran` appearing twice for the eager form and once for the lazy form. If a faithful plain-JS model is too contrived, **drop `PredictOutput` and use the `CodeVariants` plus a one-line `Aside`** instead — do not force a misleading React `PredictOutput`. (Downstream agent: pick whichever is honest; the goal is "the eager arg runs every time," not a specific stdout gimmick.) Include a `PredictWhy` explaining the eager argument is evaluated at the call site every time, the function argument is only invoked when the initializer slot wants it.

`Term` candidates: **initializer function** (the `() => …` form React calls once on mount). One line.

### Reading a prop as initial state: the frozen copy

The controlled-trap section — owns a debt forwarded from Ch 023 (L4 deferred props-as-initial-state to here; L5 established the `key`-reset tactic the student already knows).

Teach the mechanism plainly: `useState(props.value)` uses `props.value` **on the first render only** (same rule as every initializer). After mount, the prop can change all it wants — the state stays frozen at the mount value, because React ignores the initializer on updates. Show the surprise concretely: a `<PriceInput defaultPrice={…}>` whose parent changes `defaultPrice`, and the input keeps showing the *old* price because its `useState(defaultPrice)` froze at mount.

The senior framing — **this is sometimes exactly right, sometimes a bug, and the prop *name* should tell you which:**
- **Deliberate (`defaultX` naming).** An editable copy of an initial value that *should* diverge from the prop after the user edits it — a form seeded with a server value the user then changes. The React/HTML convention: a prop named `defaultValue`/`defaultPrice` signals "initial seed only, I won't track you." This is correct and intentional. (Connect to the `defaultValue` HTML attribute the student met around forms/uncontrolled inputs in Ch 023 L2's `Term` — one line.)
- **A bug (`value` naming).** A prop named `value` implies "I am the source of truth, follow me" — freezing it into state silently breaks that contract; the child stops tracking the parent. The fix is *not* a sync effect (name that as the anti-pattern the next lesson dismantles).

The two fixes, named and forward-referenced (do **not** teach them here — boundary discipline):
- If the value is purely a function of the prop → **derive it in render** (Ch 024 L2, the very next lesson).
- If it's an editable copy that should *reset* when the prop's identity changes → **`key`-reset** (Ch 023 L5, already taught — assert the student knows this: "you already saw `key={record.id}` reset a record-bound form; that's the senior reach when the seed must refresh").

Explicitly state the boundary in an `Aside` or one line: "Why the prop changed and the state didn't is the right question — the *fix* is the next lesson's whole subject."

**Component:** `CodeVariants` with two variants framed as *naming reveals intent*, not wrong/right (because frozen-from-prop is legitimate):
- Variant "`defaultPrice` — deliberate seed": `const [price, setPrice] = useState(defaultPrice);` prose "**Editable copy.** The `default` prefix signals it seeds once and then diverges — correct." `data-mark-color="green"`.
- Variant "`price` — accidental freeze": same code with the prop renamed `price`, prose "**Silent bug.** A prop called `price` implies the child should track it, but state froze at mount. Don't reach for a sync effect — *derive* or *`key`-reset* (next lesson)." `data-mark-color="orange"`.
Reasoning: the contrast is the *prop name → intent*, which is the senior insight; the code is nearly identical, so colored marks on the prop name carry the lesson.

`Term` candidates: **controlled component** (re-assert Ch 023 L5's one-line definition — value lives in React state, flows down, child reports edits up; full mechanics Unit 6) and **uncontrolled input** (Ch 023 L2 — value lives in the DOM/`defaultValue`, not React state). Both one-line refreshers; the section turns on the distinction.

### What useState is not for

The closing section installs the chapter's organizing map — **the four homes for state** — at a recognition level, so the student leaves L1 knowing `useState` is *one* home among four and the rest of the chapter/unit fills in the others. This is the "defaults before conditionals" and "state shape is a design decision" spine paying off.

Teach as a short decision filter, framed as "before you reach for `useState`, ask what kind of value this is":
1. **Does the JSX read it, and does it change over time independently?** → `useState`. The default; this is what the lesson taught.
2. **Is it computed from other state or props?** → **derive in render**, don't store it (Ch 024 L2).
3. **Does it persist across renders but the UI never reads it?** (an interval/timeout ID, a previous-value box, a scroll position a handler reads) → **`useRef`** (Ch 024 L5).
4. **Do two or more components need it?** → **lift** to the common parent (Ch 024 L3).
5. **Should it survive a refresh or be shareable?** → **URL state** (Ch 024 L3, Ch 033). **Is it the canonical server record?** → **server state** (Ch 032, Ch 11). Neither belongs in long-lived `useState`.

State the senior reflex once: **start at the leaf with `useState`, and move the value outward only when a concrete trigger demands it** (the chapter's "colocate, lift on demand" thread). Each non-`useState` home gets one sentence and a forward reference — recognition only, no teaching. This section is deliberately a *map*, not a tutorial; it's the scaffolding the whole chapter hangs on.

**Component:** This is the place for a small **decision diagram** — the four-homes filter as a compact `flowchart LR` (Mermaid, per the diagram index's "decision tree → Mermaid flowchart LR" pick), wrapped in `<Figure>` with a caption. Nodes: a start ("A value your component needs") → diamond "UI reads it?" (no → "ref"; yes ↓) → diamond "computed from other state/props?" (yes → "derive in render"; no ↓) → diamond "shared by 2+ components?" (yes → "lift") → diamond "survive refresh / shareable / server-canonical?" (yes → "URL / server state"; no → "**useState** ✓"). Keep it horizontal and short (vertical-space constraint). Pedagogical goal: a single glanceable artifact the student can carry through the rest of the chapter — it makes "useState is one of several homes" structural, not a list to memorize. Label leaves with the lesson that owns each (e.g., "→ L2", "→ L5", "→ L3") so the diagram doubles as the chapter map.

Alternatively, if the writer prefers interactivity, `StateMachineWalker` in *decision mode* (the same engine Ch 023 L5 used for "which reset reach?") could host this as a clickable walk ending on a recommendation. The static Mermaid flowchart is the lighter, lower-risk default; offer the walker as an option the writer can choose if they want the student to *practice* the decision. Do not build both.

**Exercise — `Buckets` (four buckets, two-column) OR fold into the diagram.** If the diagram is static, add a `Buckets` to make the student *apply* the map: buckets `useState` / `useRef` / `derive` / `lift-or-url`. Chips (each a plain-prose value description, drawn from the chapter's canonical examples): "The number shown on a counter" (useState), "Whether a dropdown is open" (useState), "A `setTimeout` ID a handler clears" (ref), "A `<video>` element you call `.play()` on" (ref), "A cart's line-item total" (derive), "The count of completed todos" (derive), "A search query two sibling panels read" (lift), "The active filter you want to survive a page refresh" (url). Reasoning: the closing `Buckets` turns the recognition map into an active sort — the highest-value check for this section, and it directly previews L2/L3/L5. If the writer instead picks the `StateMachineWalker`, the walk *is* the exercise and the `Buckets` is redundant — pick one.

`Term` candidates: **derived state** (Ch 023 L5 defined it — computed from props/state in render rather than stored; one-line refresh). The other homes (lift, URL, server) are named with forward references, not `Term`-defined here.

### External resources (optional, LinkCards / `ExternalResource`)

A small `CardGrid` of `ExternalResource` cards, per the lesson structure's optional close. Strong candidates (downstream agent verifies links resolve and are current):
- react.dev **`useState` reference** (the API page — covers lazy initializer, the function-as-initial-value gotcha, and typing notes; the canonical source).
- react.dev **"Choosing the State Structure"** (covers grouping vs splitting and "don't put redundant/derived state" — directly supports the not-for section and previews L2).
- Optionally react.dev **"Reacting to Input with State"** for the broader "what is state" framing.
Do not over-stuff; two or three cards. No `VideoCallout` is prioritized for this lesson — the surface is small and the interactive exercises carry it; the writer may add one only if a single tight `useState`-surface video surfaces during resourcing (Ch 023 lessons shipped videos opportunistically, so this is allowed but not required).

---

## Scope

**Already taught (assert in one line, never re-teach):**
- The snapshot model, update queue, automatic batching, `setCount(count+1)`×3 bug, the **updater form** `setX((c) => c + 1)`, stale closures — **Ch 023 L4**. This lesson *uses* the updater form and the snapshot rule at the call site; it does not re-derive them.
- The **three immutable-update idioms** (`{...obj}` / `[...arr]` / `filter`/`map`), shallow-spread nesting, and the **`Object.is` mutate-then-set bailout** — **Ch 023 L4**. Assert the spread reflex when it appears (e.g., `setTodos([...todos, t])`); do not re-teach immutability or the bailout rule as topics. (The chapter outline lists "the bailout rule" and "the immutable-update reflex" under L1, but the Ch 023 continuity notes confirm L4 already owns both in full — treat them as cashed-in here, not re-taught. Flag this divergence from the chapter outline as deliberate.)
- The **`Object.is` prop-equality rule** and reference-vs-value — Ch 023 L1.
- **Render/commit phases**, the `Trigger → Render → Reconcile → Commit` strip, **mount vs update** — Ch 023 L1.
- **Purity** (initializers/updaters must be pure; Strict Mode dev double-invoke as a *named consequence*) — Ch 023 L3. The *mechanism* of Strict Mode is Ch 025 L1.
- The **`key`-reset tactic** for record-bound forms — Ch 023 L5. Named here as one of the two fixes for the frozen-prop trap; not re-taught.
- **`Object.is`-equal setter is a no-op** — covered by L4's bailout; recognition-only mention if it aids the snapshot one-liner.

**Deferred to later lessons (name + forward-reference only, do not teach):**
- **Derived state and the "mirror prop into state + sync effect" anti-pattern**, the three fixes (derive/lift/`key`) — **Ch 024 L2** (next lesson). This lesson *names* the trap at the frozen-prop section and stops.
- **The four homes in depth** — colocation, lifting mechanics, URL state with `nuqs`, server state — **Ch 024 L3**. L1 ships only the recognition-level decision map.
- **`useReducer`** for coordinated transitions / the "12 `useState`s" trigger — **Ch 024 L4**. (Separate-vs-grouped-state was already cut in Ch 023 L4; do not re-open it here beyond a one-line pointer if needed.)
- **`useRef`** as the non-rendering store, the "does the JSX read it?" rule — **Ch 024 L5**. Named in the not-for map only.
- **`useId`** — Ch 024 L6.
- **`useEffect`** signature/lifecycle/cleanup, effect dependency arrays, the setter-is-stable-in-deps payoff — **Ch 025 L2**. The setter-stability *guarantee* is stated here; its effect-deps consequence is forward-referenced only.
- **`useMemo`** for measurably-expensive derivation — Ch 026 L3; **React Compiler** config/badge — Ch 026 L2 (only the "compiler relies on stable identities" thread is touched, recognition-level).
- **Controlled/uncontrolled inputs and form state** in full — **Unit 6**. `controlled`/`uncontrolled`/`defaultValue` get one-line refreshers only.
- **Discriminated unions / status unions at depth** — Ch 004/005. Touched only as the "annotate a union" typing trigger, one line.
- **`flushSync`, `useTransition`, `useDeferredValue`** — Ch 023 L4 (named) / Ch 025 L5. Out of scope here.

**Prerequisites the student brings (concise refreshers allowed):** array vs object destructuring, TypeScript inference and explicit annotations, literal/union types (Ch 005), `localStorage`/`JSON.parse` as the canonical "expensive initializer" example (browser-APIs unit), the spread operator.
