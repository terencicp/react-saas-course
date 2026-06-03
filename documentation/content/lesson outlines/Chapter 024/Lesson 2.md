# Lesson 2 — Derive in render, do not mirror into state

- **Title (h1):** Derive in render, do not mirror into state
- **Sidebar label:** Derive, don't mirror

---

## Lesson framing

This is L2 of Ch 024 ("Hooks for holding state"). L1 installed the full `useState` surface and closed on the **four-homes map** ("before you reach for `useState`, ask what kind of value this is"), where home #2 was *"computed from other state or props? → derive in render, don't store it"* and forward-referenced **this lesson**. L1 also planted the **frozen-prop trap** at its "reading a prop as initial state" section and explicitly deferred its two fixes here (derive) and to Ch 023 L5 (`key`-reset). This lesson cashes both debts: it owns **derived-in-render** as the senior default and dismantles the single most consequential anti-pattern in early React careers — **mirror a value into `useState` and keep it in sync with a `useEffect`**.

The chapter's spine — *state shape is a design decision before it's a syntax decision* — lands here as a sharp rule: **state is the minimum set of values from which everything else can be computed.** Everything derivable is computed in the function body during render with ordinary JavaScript; `useState` is reserved for values that change over time *independently* of other state.

Senior-mindset framing (course pillar 1): the value of this lesson is judgment, not API — there is barely any new API at all. The student already has every prerequisite (snapshots, immutable updates, the `key`-reset, the four-homes map). What they lack is the *reflex* to recognize that a value is derivable and the *conviction* that computing it in render is correct and cheap. Beginners reflexively reach for `useState` + `useEffect` to "keep things in sync" because it feels active and explicit; the cost is invisible until it bites — an extra render every change, a window where the UI shows stale data, and a synchronization bug the moment a new input is added and someone forgets to add it to the dependency array. This lesson makes that cost visible and installs the cheaper, bug-proof shape.

The mental model the student should leave with: **if you can compute it from props and existing state, compute it in render. A `setState` inside a `useEffect` whose only job is to mirror other state/props is a code smell with three fixes — derive, `key`-reset, or lift — and the sync effect is none of them.**

Pedagogical spine, cognitive-load-first:
1. **Lead with the bug, not the rule** (matches the chapter's house style and L4/L5). Open on the `fullName` reproduction a junior would actually write — `useState` + `useEffect` syncing it — and make the *cost* concrete (render → effect → render; a frame of stale UI) before stating the fix. The surprise is what makes the rule worth learning.
2. **State the rule once, simply.** "Derive in render." Anchor it to what they already know: the component body is a function (Ch 023 L3 purity), and `count`/`props` are constants for that render (L4 snapshot) — so computing `firstName + ' ' + lastName` there is just JavaScript, re-run each render, always consistent.
3. **Stack the reproductions.** The same anti-pattern wears three costumes — derived value (`fullName`), cached calculation (filtered list), derived flag (`hasErrors`). Teach the first fully; show the other two *fast* as "same smell, same fix." Pattern-recognition is the skill.
4. **Pre-empt the two objections head-on.** "Isn't recomputing every render slow?" (no — and here's the measurement threshold + the React Compiler) and "But sometimes I *do* need state seeded from a prop" (yes — that's the `key`-reset you already learned, or lifting; the sync effect is still wrong). Resolving these two is what converts the rule into a reflex.
5. **Land the decision.** Close on a compact decision filter — *derivable? → derive; needs reset on identity change? → `key`; shared? → lift; genuinely independent and UI-read? → `useState`* — reusing the persist/derive/lift order the student met in Ch 023 L5's walker so the chapter reads as one continuous argument.

This lesson is **TSX throughout**, types woven in (course stance), and uses small disposable snippets — no forced continuous character. Each reproduction is a tight, independent example (a profile's `fullName`, a todo list's `visibleTodos`, a form's `hasErrors`, a cart's `total`) illustrating one shape and then discarded, matching L1's "tour of decisions" structure.

A hard scope discipline runs through the whole lesson: **`useEffect` is named and shown, never taught.** The student has seen `useEffect(callback, deps)` named in Ch 023 (L3 "second home for side effects", L5's rejected effect-clears-fields fix) but its signature, lifecycle, cleanup, and dependency-array mechanics are **Ch 025 L2**. This lesson uses a one-clause primer ("`useEffect(cb, deps)` runs `cb` after the render is committed and re-runs it whenever a value in `deps` changes") and then treats the effect purely as the *anti-pattern being exposed*. Likewise the full "you might not need an effect" catalog (event-handler logic, fetching, chains of effects) is **Ch 025 L4** — this lesson covers only the derived-state subset and forward-references the rest.

---

## Lesson sections

### Introduction (no header)

Open with the senior question as a junior's reasonable-sounding instinct. A profile component has `firstName` and `lastName` in state and needs to show a `fullName`. The natural-feeling move: a third `useState` for `fullName` and a `useEffect` that calls `setFullName(firstName + ' ' + lastName)` whenever either changes. It works… and it's three passes for one value (render → effect fires → render again), with a sliver of time where the screen shows the *old* `fullName`, and a brand-new way to introduce a bug (forget a dependency and the name silently stops updating).

State the payoff warmly and briefly: by the end the student will recognize this shape on sight, know that the fix is one line of plain JavaScript in the render body, and own the rule that catches an entire class of synchronization bugs before they're written. Connect back explicitly: L1 closed by asking "what kind of value is this?" and named "derived" as home #2 — *this* is that home. And L4 taught that `props`/`state` are constants for a render — computing from them in the body is just reading those constants. No "what is an effect" scaffolding; the effect here is the thing we're about to stop reaching for.

No diagram in the intro — the intro motivates, the body teaches. (The "render → effect → render" cost gets its diagram in the next section, where the model is taught.)

### The double-render tax of syncing state with an effect

**Goal:** make the *cost* of the mirror-into-state-and-sync pattern concrete and visible, so the rule that follows is obviously worth it. This is the conceptual core; everything after applies it.

Content:
- Show the canonical reproduction in full — the `fullName` case from the intro, written as a junior would write it: `const [fullName, setFullName] = useState(''); useEffect(() => { setFullName(firstName + ' ' + lastName); }, [firstName, lastName]);`.
- Give the **one-clause `useEffect` primer** inline (not a teach): "`useEffect(cb, deps)` runs `cb` *after* React commits the render to the DOM, and re-runs it whenever a value in `deps` changes — the full treatment is Ch 025 L2." Set this apart so downstream agents and the student both see it's a borrowed forward-reference, not the lesson's subject.
- Walk the sequence that makes it expensive, tied to L1's `Trigger → Render → Reconcile → Commit` strip: `firstName` changes → component **renders** with the *stale* `fullName` from the previous commit → React **commits** → the **effect runs** and calls `setFullName` → that schedules **another render** → second render finally shows the right name. Two renders per change, and between the commit and the effect the UI is briefly wrong.
- Name the bug surface honestly: the effect is only correct if its dependency array lists *every* input. Add a `middleName` later, forget to add it to `deps`, and `fullName` silently stops tracking it — a class of bug the derived version *cannot* have because there's no second copy to fall out of sync.
- State the fix in one line as a teaser (full treatment next section): delete the state and the effect, write `const fullName = firstName + ' ' + lastName;` in the body. One render, always correct, nothing to keep in sync.

**Diagram — `DiagramSequence` "two renders, or one" (the spine visual).** Pedagogical goal: make "an effect that sets state runs a *second* render with a stale frame in between" literally visible, contrasted against the single-render derived path. Author with plain HTML/CSS inside each `DiagramStep` (a phase strip, per the diagrams guide — no engine). Two "tracks" the reader scrubs:
- Steps 1–4 (the sync-effect path): Step 1 — `firstName` changes, **Render #1** runs, a card shows `fullName` badge still reading the *old* value (highlight it as stale). Step 2 — **Commit**: the DOM paints the stale `fullName`. Step 3 — **Effect runs**, calls `setFullName(...)` (a "scheduled re-render" chip appears). Step 4 — **Render #2 + Commit**: badge now correct. Caption on the stale steps drives the point: "the screen showed the old name for one commit."
- Step 5 (the derived path): a single **Render + Commit** where `const fullName = …` is computed in the body and painted correctly the first time. Caption: "derive it and there is no second render and no stale frame."
Keep cards short and horizontal (laptop viewport). Reference this sequence again in the objections section ("the second render you saw earlier is the cascading update React's docs warn about").

`Term` candidates: **derived state** (re-assert Ch 023 L5's / L1's one-line definition — a value computed from props/state during render rather than stored). **effect** is *not* `Term`-defined as a teach; the one-clause primer in prose carries it (full definition is Ch 025).

### Derive in render: state is the minimum, everything else is JavaScript

**Goal:** state the rule and the mental shift cleanly, now that the cost is felt. The load-bearing positive content of the lesson.

Content:
- The rule, stated once and set apart in an `Aside[tip]` titled with it: **when a value can be computed from existing props and state, compute it during render — don't store it.**
- The mental shift — **JavaScript before JSX.** The body of a component is an ordinary function that runs top to bottom on every render. Anything computable with normal JavaScript — a variable, a ternary, `.filter`/`.map`/`.reduce`, a string template — gets computed there, from the snapshot constants (`props`, `state`) the render already holds (callback to L4 in one clause). The JSX at the bottom just reads those locals.
- The senior framing, stated as the chapter's spine: **state is the *minimum* set of values from which everything else can be computed.** If a value is reconstructable from other state at any moment, it isn't state — it's a view of state. Keeping a second copy in `useState` is keeping two sources of truth that can disagree; deriving keeps exactly one.
- Make "what counts as derived" concrete with a short catalog the student will recognize from real code: a full name from first/last; the count of completed todos from a todo array; a cart's line-item total from the items; an `isEmpty` flag from `list.length === 0`; the currently-selected object from a `selectedId` plus the list (`items.find(i => i.id === selectedId)`). Each is one expression in the body.

**Component — `CodeVariants` (the before/after that is the lesson's positive hinge).** Two variants, framed wrong → right (this *is* a wrong/right contrast, unlike L1's naming-reveals-intent framing):
- Variant "Mirrored into state (don't)": the full `useState` + `useEffect` `fullName` reproduction. Prose leads with the verdict — "**Two renders and a stale frame.** A second copy of data that's already in `firstName`/`lastName`, kept in sync by hand." Wrap pane in `<div data-mark-color="orange">` (perf/architecture smell, not a hard type error — consistent with L1's orange-vs-red convention). `del` the `useState`/`useEffect` lines if it reads cleanly.
- Variant "Derived in render (do)": `const fullName = firstName + ' ' + lastName;` in the body, used directly in JSX. Prose: "**One render, one source of truth.** Plain JavaScript, recomputed each render, can never drift." Wrap in `<div data-mark-color="green">`; mark the derivation line.
Flag for downstream agents: the orange variant is the anti-pattern shipped *to be rejected*; the green is convention-correct. Do not "fix" the orange one inline.

**Exercise — `ReactCoding` (exploration mode, the load-bearing interactive moment).** Pedagogical goal: let the student *delete* the effect and feel that the derived version is shorter and just works. Starter: a small profile component with `firstName`/`lastName` inputs (controlled, basic `useState`) **plus** a `fullName` state and a `useEffect` syncing it, rendered in a heading. `instructions`: "This component keeps `fullName` in a third state and syncs it with an effect. Delete the state and the effect, and compute `fullName` during render instead." Exploration mode (no `tests`/`target`) with `live` off so they Run and see the heading still update; pair with a `<details>` reference solution showing the one-line derivation. This is preferable to a sandbox because it's guided to one precise, self-evidently-checkable change (the heading still tracks the inputs, with less code). Downstream: keep the starter tiny so the diff is "remove two constructs, add one line."

`Term` candidates: none new here — **derived state** already asserted; **snapshot** is a one-clause callback at most.

### The same smell in three disguises

**Goal:** pattern-recognition breadth. The mirror-into-state-and-sync shape recurs across codebases wearing different costumes; show two more *fast* so the student spots the shape, not just the `fullName` instance. Group under one h2 so it reads as "one anti-pattern, applied incorrectly three ways."

Lead-in: name the shared shape explicitly so the section has a through-line — **a `useState` holding a value, plus a `useEffect` watching other state/props and calling that state's setter.** Wherever you see it, the fix is the same: delete both, compute in render.

#### A filtered or sorted list cached in state

Content:
- The reproduction: `const [visibleTodos, setVisibleTodos] = useState([]); useEffect(() => { setVisibleTodos(getFilteredTodos(todos, filter)); }, [todos, filter]);`.
- The fix: `const visibleTodos = getFilteredTodos(todos, filter);` in the body. Same delete-both-compute-in-render move.
- The objection this raises — "but filtering is *work*, won't it run every render?" — is real and gets its own treatment in the next section; flag it forward in one clause here ("we'll deal with the cost in a moment — spoiler: it's cheap, and the React Compiler has your back") so the student isn't left hanging, but don't resolve it here.

#### A boolean flag derived from other state

Content:
- The reproduction: `const [hasErrors, setHasErrors] = useState(false); useEffect(() => { setHasErrors(errors.length > 0); }, [errors]);`.
- The fix: `const hasErrors = errors.length > 0;` — a single expression. Emphasize that flags are the most obviously-derivable case and the most common place this smell hides (also `isEmpty`, `isComplete`, `canSubmit`).

**Component for the two disguises — `CodeVariants` with `syncKey`** so both tabs flip in lockstep, OR two compact `AnnotatedCode` blocks. Recommendation: a single `CodeVariants` per disguise is heavy for two near-identical examples; instead use **one `AnnotatedCode`** that shows the *shared anti-pattern shape* abstractly (a `useState` + a `useEffect`-with-setter, with steps highlighting "the redundant state" and "the setter that only mirrors") and then two tight `Code` blocks (before/after) for the filtered-list and flag cases. Keep prose minimal — the point is recognition speed, and the student already learned the fix in the prior section. Reuse the orange (smell) / green (fix) mark convention.

**Exercise — `Buckets` (classification, two-column).** Pedagogical goal: drill "is this state, or is it derived?" — the recognition skill the whole lesson builds. `instructions`: "Sort each value into whether it should live in `useState` or be computed during render." Buckets: `name="state"` label "Lives in useState" description "Changes independently; the UI reads it", `name="derive"` label "Derive in render" description "Computable from other state or props". ~8 chips drawn from canonical examples:
- `state`: "The text the user has typed into a search box" (raw input — genuinely independent), "Whether a modal is open", "The list of todos fetched from the server" (cached external data — a legit trigger, foreshadows next section), "The currently selected todo's `id`".
- `derive`: "The user's full name from first and last name", "The number of completed todos", "Whether the form has any errors", "The todos matching the current filter".
Reasoning: classification *is* the reasoning for this skill, and two-column keeps it compact. Place it here so it tests the freshly-stacked reproductions. Note the two deliberately-tricky `state` chips (raw input; fetched data) preview the next section's "when state is warranted" — flag for downstream that those are the legitimate-state cases, not derivations.

`Term` candidates: none new.

### "Won't recomputing every render be slow?" — and the React Compiler

**Goal:** demolish the single objection that makes juniors cling to the cached-in-state pattern. This is the senior-judgment payoff and a key 2026-stack beat (the React Compiler).

Content:
- Answer the cost question directly and quantitatively. For the work that shows up in real components — a `.filter` over a few hundred items, a sum, a string concatenation, a `.find` — the cost is **negligible next to the render itself** (React building elements and reconciling). Recomputing on every render is *the point*, not a problem: it's how the value stays correct with zero bookkeeping.
- Give the senior's actual measurement threshold, quoting the React docs' rule of thumb so the student has a concrete line: roughly, **unless you're creating or looping over thousands of objects, it's probably not expensive.** And the way to *know* rather than guess: wrap the computation in `console.time('filter')` / `console.timeEnd('filter')` and read the number — if it's consistently ~1ms or more on a representative dataset, *then* it's a candidate for memoization. Decisions are measured, not assumed (course pillar).
- The 2026 backstop — the **React Compiler**. Since the project ships with the compiler enabled (`reactCompiler: true`, established Ch 023 L1/L3), React **automatically memoizes** expensive derivations whose inputs are stable — including cases manual `useMemo` can't reach (e.g. after an early return). So the default is: derive in render and let the compiler handle caching; you write natural code. State this as fact (React Compiler v1.0 is stable as of late 2025), consistent with the chapter's "write natural code, never prophylactically memoize" thread.
- The narrow `useMemo` escape valve — **named once, audited, not taught.** When a derivation is *measurably* expensive (a large sort, a non-trivial graph traversal, a parser pass) and the compiler hasn't memoized it (or you need precise control), `useMemo(() => compute(), [deps])` caches across renders. Frame it exactly as "trigger before tool": the threshold is a profiler measurement, not a hunch, and the decision rules are owned by Ch 026 L3. The default is **no `useMemo`**. Show its shape in a single `Code` line for recognition; do not walk it.

**Component:** a small `Code` block showing the `console.time`/`timeEnd` measurement around a derivation (the senior's "prove it" move), and a one-line `Code` showing the `useMemo` shape with a comment naming *why* it's there (`// measured at ~4ms over 10k rows`), matching the code-conventions rule that any manual memo carries a reason comment. No `CodeVariants` needed — this section is judgment prose anchored by two short snippets.

`Term` candidates: **memoization** (`Term` — caching a computed result so it isn't recomputed when its inputs are unchanged) — likely new-ish in this concrete sense for the target student; one line. **React Compiler** — one-line recognition `Term` (re-assert from Ch 023: a build step that auto-memoizes pure components), not a teach.

### When a value really does belong in state

**Goal:** prevent over-correction. "Derive everything" is wrong; some values genuinely belong in `useState`. Naming the legitimate triggers sharply is what keeps the rule from becoming dogma — and it directly resolves the two "tricky" chips from the earlier `Buckets`.

Content — the four legitimate triggers, each one sentence + a one-line example:
1. **It originates from user input.** The raw text in an `<input onChange>`, a toggle's on/off, the selected tab — there's no other source to compute it from; the user *is* the source. (This is the seed of every controlled input; Unit 6 owns forms.)
2. **It's cached from an external system.** Data fetched from the server, read from `localStorage`, or pushed by a subscription needs a local home so the UI can read it synchronously. (Long-term, server data belongs in a server-state cache / Server Component, not `useState` — forward-ref Ch 032 / Unit 11; here it's named as a legitimate *trigger*, with the caveat.)
3. **It captures a moment in time.** A timestamp taken at mount, a random seed assigned once — values that are deliberately *snapshotted* and must not recompute. (Connect to Ch 023 L3's "`Date.now()`/`Math.random()` in render is impure" — the fix was to capture once, which means state.)
4. **It's an intentionally divergent draft.** An editable copy of a server value that *should* drift from the canonical record until the user saves — the form-draft case. This is the legitimate version of "seed from a prop," and it's exactly where the **`key`-reset** comes back (next section).

The senior cut, stated once: **the test is "could I reconstruct this from other state right now?" — if yes, derive; if no (because it's input, cached, captured, or a deliberate divergent copy), it's state.**

**Component:** no heavy component needed — this is a tight enumerated list with one-line code examples each (inline `Code` or a single small block). Optionally an `Aside[note]` restating the reconstruct-it test as the one-question heuristic. Keep it crisp; the `Buckets` already exercised classification, and the next section handles the draft case interactively.

`Term` candidates: **server state** (one-line recognition — data whose canonical home is the server/database, not the component; full treatment Unit 11) since it's named as trigger #2 with a forward-ref. **controlled input** — one-line callback from L1/Ch 023 if the input trigger needs it; do not re-teach.

### "I need to update state when a prop changes" — derive, key, or lift

**Goal:** resolve the second objection — the one case that *feels* like it needs a sync effect (state that depends on a changing prop) — and route it to the right tool. This is where the lesson connects to L1's frozen-prop trap and Ch 023 L5's `key`-reset, closing the loop the chapter has been building.

Content:
- Name the instinct precisely: "I have local state seeded from a prop, and when the prop changes I need the state to update." This is the exact thought that produces a `useEffect(() => setState(prop), [prop])` — and it's almost always one of **three** things, none of which is a sync effect:
  1. **The value is purely a function of the prop → derive it.** No state at all; compute from the prop in render. (The default; this lesson's whole first half.)
  2. **The state is an editable copy that should *reset* when the prop's identity changes → `key`-reset.** You already learned this in Ch 023 L5: `<EditForm key={record.id} record={record} />` remounts the form on a new record, so its `useState(record.field)` re-seeds for free — one attribute, can't go stale. Assert it as known ("you've seen this — `key={record.id}` throws away the old instance and hands you a fresh one seeded from the new record").
  3. **Two components need the value → lift it** to the common parent (Ch 024 L3, next lesson — named only). The child stops owning a copy; it reads the parent's single source of truth.
- The rule, stated flatly: **"update state when a prop changes" is a smell; the cure is derive, `key`-reset, or lift — never a mirroring effect.** Cross-reference L1 explicitly: "this is the fix L1 promised for the frozen-prop trap — a prop named `value` that the child should track is *derived from* (or lifted), and a `default`-prefixed seed that should reset on identity change uses `key`."
- The documented narrow exception — **the "adjusting state during render" pattern**, named exactly once. React *does* permit calling a setter *during render* (not in an effect) to adjust state when a prop changed, guarded by a `prev !== current` check: `const [prevId, setPrevId] = useState(id); if (id !== prevId) { setPrevId(id); setSelection(null); }`. React re-renders immediately, before painting children, so there's no stale frame and no second commit the user sees — which is why React's docs call it "better than an effect." But it's hard to read and **rarely the right reach**: the docs' own guidance is to prefer resetting all state with `key` or calculating everything during rendering. Name it, show the shape once in a `Code` block, and state the senior default: reach for derive or `key` first; this pattern is the last resort for the narrow "adjust *some* state on a prop change" case. (Aligns with the chapter outline's "name it once, trust that `key`/derivation cover most cases.")

**Component — `CodeVariants` "three fixes for the same instinct"** (purpose-built for this — the student sees the wrong reach beside the three right ones). Tabs:
- "Sync effect (don't)": `useEffect(() => setSelection(null), [items])` (or the seed-from-prop shape). Prose: "**The smell.** A setter in an effect that only watches other state/props." Orange.
- "Derive": the value computed from the prop in render (e.g. `const selection = items.find(i => i.id === selectedId) ?? null`). Prose: "**Best when the value is reconstructable.**" Green.
- "key-reset": `<Child key={items.id} … />`. Prose: "**Best when a draft must reset on identity change** — you learned this in the render-model chapter." Green.
Keep the `useReducer`/lift case to a prose mention (lift is next lesson). Three tabs is the right count; a fourth (the adjusting-state-during-render exception) can be a separate small `Code` block below rather than a tab, to keep it visibly "the rare one."

**Exercise — `MultipleChoice` (single question, multi-select if needed).** Pedagogical goal: check that the student routes the instinct correctly rather than reaching for an effect. Stem: a short scenario — "A child component holds an editable copy of the selected customer in `useState`, seeded from a `customer` prop. When the user picks a different customer, the form keeps the previous customer's edits. What's the senior fix?" Choices: (a) "Add a `useEffect` that resets the fields when `customer.id` changes" [wrong — the smell], (b) "Give the form `key={customer.id}` so a new customer remounts it" [correct], (c) "Compute the fields from the prop in render with no local state" [partially right — correct only if the form shouldn't hold a divergent draft; mark per how the stem is worded], (d) "Lift the form state to the parent" [defensible but heavier]. Word the stem and `correct` flags so (b) is the clear best answer and the explanation contrasts it with (a)'s effect smell and notes when (c)/(d) apply. Reasoning: a routing decision is best checked by a scenario MCQ, and it consolidates the L1/L5 cross-references.

`Term` candidates: **`key`-reset** is not a `Term` (it's a named tactic with a full prior lesson); a one-clause callback suffices. No new terms.

### Choosing where a value lives: the derive-first filter

**Goal:** the durable takeaway — a compact decision filter that places "derive" correctly *first* among the homes for a UI value, so the student leaves with the order a senior asks the questions. Reuses and tightens Ch 023 L5's decision order and L1's four-homes map so the chapter coheres.

Content:
- Present the filter as a short ordered check (prose + a small visual), the same shape the student met in L5's walker (`persist → derive → lift → key`) but oriented around the "is this state?" question this lesson owns:
  1. **Can I compute it from props/other state right now?** → **derive in render.** (This lesson.)
  2. **Is it a draft that must reset when an identity changes?** → **`key`-reset.** (Ch 023 L5.)
  3. **Do two or more components need it?** → **lift** to the common parent. (Ch 024 L3, next.)
  4. **Otherwise — is it input, cached external data, a captured moment, or a divergent draft the JSX reads?** → **`useState`.** (L1.)
- The one-line senior reflex tying it together: **reach for `useState` last, not first — most values a junior puts in state are derivable, resettable, or liftable.** This is the chapter's "colocate, lift on demand" thread restated for the derive case.

**Component — a compact decision diagram.** Pedagogical goal: one glanceable artifact the student carries, making "derive comes before state" structural rather than a list. Two honest options for the writer (build one, not both):
- **Option A (lighter, default): Mermaid `flowchart LR`** in a `<Figure>` with a caption (per the diagram index's "decision tree → Mermaid flowchart LR" pick). Nodes: start "A value your component needs" → diamond "computable from props/state?" (yes → "**derive in render** → this lesson"); no ↓ → diamond "a draft that resets on identity change?" (yes → "**`key`-reset** → Ch 023 L5"); no ↓ → diamond "shared by 2+ components?" (yes → "**lift** → next lesson"); no → "**useState** ✓". Horizontal, short (vertical-space constraint). Label leaves with owning lessons so it doubles as a chapter mini-map, consistent with L1's four-homes figure leaf labels.
- **Option B (interactive): `StateMachineWalker` in `kind="decision"` mode** — the same engine Ch 023 L5 used — hosting the four-question walk ending on a recommendation. Offer only if the writer wants the student to *practice* the routing; the static flowchart is the lower-risk default. Do not build both.

Note for downstream agents: keep the leaf labels and ordering consistent with L1's four-homes map and L5's reset-decision walker — this is the third time the student sees this shape, and consistency is the payoff. Do not introduce a *new* ordering vocabulary.

`Term` candidates: none new — all four homes already named across L1/L5.

### External resources (optional, `ExternalResource` in a `CardGrid`)

A small `CardGrid` of `ExternalResource` cards, per the lesson structure's optional close (downstream agent verifies links resolve and are current):
- react.dev **"You Might Not Need an Effect"** — the canonical reading for this lesson; the `fullName`, filtered-list, `hasErrors`, and prop-reset examples are lifted almost 1:1 from it. The single best follow-up.
- react.dev **"Choosing the State Structure"** — owns "don't put redundant or derived state in state" as a first-class principle; reinforces the "state is the minimum" framing.
- Optionally the **React Compiler** page (react.dev) or the v1.0 release post — supports the "derive in render, the compiler memoizes" beat for a student who wants to see the 2026 backstop. (Ch 023 L3 already linked the compiler release card; avoid duplicating if the writer prefers variety.)
Two or three cards, no over-stuffing. A `VideoCallout` is **not** prioritized — the surface is small and the live edit + diagram carry it; the writer may add one only if a current, tight "you don't need useEffect / derived state" clip surfaces during resourcing (Ch 023 lessons shipped videos opportunistically, so it's allowed, not required).

---

## Scope

**Already taught (assert in one line, never re-teach):**
- **State is a snapshot**; `props`/`state` are frozen constants for a render — **Ch 023 L4**. This lesson *uses* it as the reason "compute in the body" works (the body reads those constants); it does not re-derive the snapshot model.
- **Immutable updates / the `Object.is` bailout / the updater form** — **Ch 023 L4**. Touched only if a reproduction's *fix* sets state (rare here); not a topic.
- **The `key`-reset tactic** in full — record-bound form, button-bump, the rejected effect-clears-fields fix, the `persist → derive → lift → key` decision order — **Ch 023 L5**. Named here as fix #2 for "state from a changing prop" and asserted as known; **not re-taught**. (This is the most important boundary in the lesson: L5 already owns the `key`-reset and even *showed and rejected* an effect-clears-fields fix. This lesson must not re-explain the `key` mechanic — it cites it.)
- **Component purity / "no side effects during render"** and the "two homes for side effects (handlers, `useEffect`)" map — **Ch 023 L3**. The "derive in render is just a pure computation" framing leans on this in one clause.
- **The four-homes map** ("does the JSX read it? → derived? → shared? → survive-refresh/server? → else `useState`") and the **frozen-prop trap** — **Ch 024 L1** (previous lesson). This lesson *delivers* the "derive" fix L1 promised for the frozen prop and reuses the homes map's ordering; it does not re-introduce the map from scratch.
- **The React Compiler is on by default** (`reactCompiler: true`), auto-memoizes pure components — **Ch 023 L1/L3**. Re-asserted here as the reason "derive in render" needs no manual memo; config/badge mechanics are Ch 026 L2.

**Deferred to later lessons (name + forward-reference only, do not teach):**
- **`useEffect` signature, lifecycle, cleanup, dependency-array mechanics** — **Ch 025 L2**. This lesson uses a one-clause primer and treats the effect only as the anti-pattern being exposed. Do **not** teach effect rules, cleanup, or the deps lint here beyond naming that "a forgotten dependency is how the mirror goes stale."
- **The full "you might not need an effect" catalog** — event-handler logic that doesn't belong in an effect, fetching in effects, chains of effects, sending POST on render, notifying parents — **Ch 025 L4**. This lesson covers only the *derived-state subset* (the four React-docs derived-state anti-patterns) and forward-references the rest.
- **Lifting state, colocation, URL state (`nuqs`), server state** — **Ch 024 L3**. "Lift" is named as fix #3 / filter branch only.
- **`useReducer`** for coordinated transitions — **Ch 024 L4**. May be named in one clause if a reproduction's fix would otherwise sprawl; not taught.
- **`useRef`** — **Ch 024 L5**. Not relevant here; do not introduce.
- **`useMemo` thresholds and decision rules** — **Ch 026 L3**. Named once as the audited escape valve with a measurement threshold; the decision framework is deferred. **React Compiler** config/badge — Ch 026 L2.
- **Form drafts, controlled/uncontrolled inputs, validation, Server Actions, dirty-tracking** — **Unit 6**. The "divergent draft" legitimate-state trigger and the controlled-input trigger get one-line names only.
- **Server-state caching (TanStack Query) and Server Components** — **Ch 032 / Unit 11**. Named as the long-term home for "cached external data" (trigger #2), with the caveat that `useState` for server data is a stopgap.
- **The `set-state-in-effect` / `set-state-in-render` ESLint rules** as a tooling surface — recognition only; may be named in one clause as "modern React lint flags this exact smell," but the rule catalog and the React Compiler diagnostics belong to Ch 026 / the tooling chapters.

**Prerequisites the student brings (concise refreshers allowed, one line each):** the component body is a function that runs every render (Ch 023 L3); `props`/`state` are snapshot constants (Ch 023 L4); array methods `.filter`/`.map`/`.reduce`/`.find` (Ch 003); ternaries and boolean expressions (Ch 002); the `useState` tuple shape and typing (Ch 024 L1); the `key`-reset (Ch 023 L5).

---

## Notes for downstream agents

- **Hold the effect boundary hard.** `useEffect` is *shown as the anti-pattern*, never taught. One-clause primer only ("`useEffect(cb, deps)` runs after commit, re-runs when a dep changes — Ch 025 L2 owns it"). Resist explaining cleanup, the deps array rules, or Strict Mode double-invoke. Every effect in this lesson's code is there to be deleted.
- **Hold the `key`-reset boundary in reverse.** Ch 023 L5 owns the `key`-reset and already taught it fully (and rejected the effect-clears-fields fix). Do **not** re-derive the remount mechanic — cite it in one sentence as known and move on. The new content this lesson owns is *derive in render* and the *three-reproductions* of the mirror-into-state smell.
- **Deliberate anti-patterns shipped on purpose** (flag for reviewers, matching the chapter's house style): the `fullName`-synced-with-effect, the `visibleTodos`-cached-in-state, the `hasErrors`-flag-in-effect, and the sync-effect-on-prop-change snippets are *exposed to be rejected*. The convention-correct shape is the derived (green) variant in each comparison. Do not "fix" them inline by importing other machinery.
- **Mark-color convention** (consistent with Ch 023 L1/L3/L4 and Ch 024 L1): **orange** = the mirror-into-state perf/architecture smell (not a hard error), **green** = the derived/convention-correct fix. Reserve **red** for genuine type errors (none expected in this lesson). `AnnotatedStep` default to blue for neutral walkthroughs.
- **Code conventions to honor:** arrow components bound to `const`; derived values as plain `const`s in the body; booleans as predicates (`hasErrors`, `isEmpty`, `canSubmit`, not `errors`/`empty`); **no manual `useMemo`/`useCallback`** in sample code except the single recognition-only `useMemo` line, which *must* carry a `// measured at …` reason comment (code-conventions rule); single quotes, 2-space indent, semicolons, trailing commas (Biome shape) in MDX blocks; updater form `setX((c) => c + 1)` if any setter appears.
- **Factual guardrails (verified against current React docs / 2026 stack):**
  - The four derived-state anti-patterns and their fixes match react.dev "You Might Not Need an Effect" exactly — derive (full name), `useMemo`/compiler (filtered list), `key` (reset all state on prop change), adjust-during-render-with-guard (adjust *some* state on prop change). Keep the examples faithful.
  - The "adjusting state during render" pattern requires the `prev !== current` guard and the paired `setPrev(current)` inside the condition, or it loops forever — show the guard, and frame it as "rare, better than an effect, but prefer `key`/derive."
  - React's cost rule of thumb: "unless you're creating or looping over thousands of objects, it's probably not expensive"; measure with `console.time`/`timeEnd`; ~1ms+ is the rough memoization candidate line. Quote it as guidance, not law.
  - React Compiler v1.0 is **stable** (released Oct 2025) and on by default in the project; it memoizes pure derivations including cases `useMemo` can't (after early returns). State as fact; the default is no manual memo.
- **MDX is being authored fresh from this outline** — no existing Ch 024 L2 MDX. Rely on the Ch 023 continuity notes' established terminology (the `Trigger → Render → Reconcile → Commit` strip, **snapshot**, **derived state**, **remount**, the `persist → derive → lift → key` order) for consistency, and on Ch 024 L1's four-homes map and orange/green mark convention.
