# Lesson outline — Chapter 023, Lesson 2

## Lesson title

- **Title:** Reconciliation and the key prop
- **Sidebar label:** Reconciliation and keys

## Lesson framing

This lesson zooms into the **Reconcile** box of L1's `Trigger → Render → Reconcile → Commit` phase strip. L1 left a debt — "reconciliation (matching new tree to old) foreshadowed at close" — and this lesson pays it. The spine mental model `UI = f(state)` continues: every render produces a fresh element tree, and reconciliation is the algorithm that decides *which previous component instance corresponds to which new one*, then emits the minimum DOM operations to close the gap.

The senior reframe is the whole point: **`key` is reconciliation identity, not list cosmetics.** Juniors meet `key` as "the warning React yells about when I `.map`," paste in `key={i}`, and silence the console. This lesson makes them feel the bug that index keys hide. The load-bearing experience is the canonical reproduction — a list of `<input>`s with index keys, reorder it, and the typed text stays glued to the wrong rows. That bug is invisible in prose and invisible in a screenshot; it only bites on interaction. So the lesson's center of gravity is a **live sandbox the student reorders by hand**, not a paragraph.

Pedagogical sequencing to minimize cognitive load: start from L1's "render produces a tree," introduce reconciliation as the diff, give the two heuristics (type-based) first because they're the simpler half, *then* introduce sibling identity (position → key) because that's where the bugs live. Keys come last and land as the fix for a problem the student has already felt. End by collapsing "remount" into one rule that covers three triggers (key change, type change, position shift) — this is the rule L5 ("Remounting with key") will cash in as a deliberate tactic, so name the mechanism here and explicitly defer the *tactic*.

Where beginners go wrong in production, and what this lesson preempts:
- `key={index}` everywhere as a reflex → the reorder/insert/filter bug.
- Thinking `key` is a normal prop they can read inside the child (`props.key` is `undefined`).
- `key={Math.random()}` to "make it unique" → remounts every instance every render (state loss, focus loss, perf cliff).
- Assuming `key` must be globally unique (it's per-sibling-set).
- Not realizing that swapping element *types* at a position throws away all child state — the conditional-render footgun.

Target end state: the student can look at any `.map(...)` and pick the right key from data identity; can explain *why* index keys corrupt reorderable lists in terms of position-vs-key matching; knows that same-type-same-position preserves state while type-change or key-change remounts; and reads "React 19 reconciler" headlines without expecting new semantics (it's faster, not different).

Tone per pedagogical guidelines: adult, terse, decisions-before-syntax. No "what is an array." The senior question is implicit in the intro (the wrong-checkbox / wrong-input bug), not a labeled section.

## Lesson sections

### Introduction (no header)

Open on the concrete failure, framed as a senior would hit it. A `TodoList` renders fine; the checkboxes and the typed text look correct on first paint. Then the user sorts the list — and the checked boxes, or the half-typed text, stay behind on the *wrong* rows. Nothing in the data is wrong; the bug is in how React matched old rows to new rows. Name that matching process: **reconciliation**. State the lesson goal in one breath — understand the diff React runs after every render, and the `key` prop that steers it — and connect back to L1: rendering produced a tree (`UI = f(state)`); this lesson is about the box right after, where React compares the new tree to the last one. Keep it to ~4-5 sentences, warm and brief. Do **not** over-explain here; the payoff demo comes in the index-key section.

Use a `Term` on **reconciliation** at first mention (definition: "React's algorithm for diffing the new element tree against the previous one to compute the minimum set of DOM changes").

### What reconciliation does

Teach the concept and its output, not the internals.

- Reconciliation is React calling the diff: new element tree vs. previous element tree → smallest set of real DOM operations (create, update attributes, move, remove). Reinforce L1's render/commit split: reconciliation happens *between* render (got the tree) and commit (touched the DOM). It decides *what* to commit.
- Why a diff at all: re-running the component produces a whole new tree of plain element objects (L1 named these — "JSX is a tree of React elements, plain objects"). React does not blow away the DOM and rebuild it; it reuses what it can. Reconciliation is how it figures out what can be reused.
- The complexity motivation, stated plainly (no proofs): a general tree-diff is prohibitively expensive (O(n³)). React refuses to pay that. Instead it commits to two cheap heuristics that get the diff to roughly O(n). The trade: the heuristics are occasionally "wrong" (rebuild more than strictly necessary), and one of those edges is the bug this lesson is about.

**Diagram — the phase strip, re-anchored.** Reuse L1's `Trigger → Render → Reconcile → Commit` strip as a small hand-written HTML/CSS strip inside `<Figure>`, with **Reconcile** highlighted (`is-on`). Pedagogical goal: continuity — the student sees exactly where in the pipeline we are, so reconciliation isn't a free-floating new idea but a zoom into a box they already know. Keep it horizontal, short (vertical-space constraint). Inline styles only, `margin: 0` on every inner element (prose-margin gotcha). Caption: "This lesson lives in the Reconcile box."

Code's role here: none yet — this section is conceptual scaffolding. Resist the urge to show code before the heuristics.

### Two heuristics: same type updates, different type rebuilds

The simpler half of reconciliation, taught first to build confidence before the position/key subtlety.

- **Heuristic 1 — different element types produce different trees.** `<div>` → `<section>` at the same spot means: tear down the old subtree entirely and build a new one, even if the children are byte-identical. State and DOM under the old node are discarded.
- **Heuristic 2 — same element type, keep and update in place.** `<div className="a">` → `<div className="b">` updates the one attribute; it does *not* recreate the node. The DOM node, its focus, its scroll position, and the React state of components inside it all survive.
- Land the senior takeaway early: **keeping the type stable across renders preserves everything underneath it; changing the type is a full reset.** This single sentence is the seed for the conditional-render footgun two sections down and for L5's deliberate remount.

**Diagram — type-match vs type-mismatch.** A `<Figure>` with two small side-by-side before/after tree pairs (HTML+CSS boxes):
- Left pair: `div.a` → `div.b`. Same-type node tinted green ("reused, attribute patched"), child preserved.
- Right pair: `div` → `section`. Old subtree tinted red/struck ("torn down"), new subtree tinted as freshly built.
Pedagogical goal: make "same type = reuse, different type = rebuild" a *picture*, not a rule to memorize. Color is the signal — use saturated mid-tones with appropriate text contrast (theme-adaptation guidance). Cap height, horizontal layout, `margin: 0` everywhere. Two trees of 2-3 nodes each — keep it tiny.

Code: a single small `Code` block (tsx) is fine to show the JSX that flips the type, e.g. a conditional that returns `<section>` in one branch and `<div>` in the other, to ground the abstract "type change" in real JSX. Keep it ≤6 lines. Don't over-annotate — this is illustration, not a walkthrough.

### Siblings are matched by position

Introduce the default identity rule — the foundation the key prop will override.

- When a parent renders a *list* of same-type children with no `key`, React has no per-item identity, so it falls back to **position**: the 1st child of the new render is matched to the 1st child of the old render, 2nd to 2nd, and so on.
- The consequence that matters: **state and refs belong to the position, not to the data.** "The component at slot 0" keeps its state across renders; if a different item moves into slot 0, it inherits slot 0's state. This is correct and even desirable when the list never reorders — but it's the exact mechanism that corrupts reorderable lists.
- Foreshadow without spoiling: name that React warns you (the console "each child in a list should have a unique key" message) precisely because position-matching is fragile for dynamic lists — but defer the *why it bites* to the next section where the student will feel it.

**Diagram — position matching.** Reuse the same HTML+CSS tree style: a parent with three positioned slots (0,1,2), each showing both the slot index and the item currently in it. Show one render, then the "after reorder" render beside it, with arrows or aligned columns making clear that slot 0 still points to slot 0 (so its state stayed) even though the *item* in slot 0 changed. Pedagogical goal: pre-load the mental model that makes the next section's bug feel inevitable rather than mysterious. Could be a `DiagramSequence` (step 1: initial list; step 2: reorder requested; step 3: position-match keeps state on the moved-away rows) — the temporal scrub fits a "watch the bug happen" narrative. Author's choice between static side-by-side `Figure` and `DiagramSequence`; recommend `DiagramSequence` because the bug is fundamentally a *sequence* (before → after).

### The index-as-key trap

The heart of the lesson. The student must *experience* the bug, then get the fix.

- Set up the anti-pattern in code: `items.map((item, i) => <Row key={i} ... />)`. Explain that `key={i}` looks like it gives each row an identity but it actually re-pins identity to *position* — key `0` is always "whatever is first now," so it's no better than no key at all for reorders, and worse because it silences the warning.
- The canonical reproduction, stated precisely: a list of rows each containing an uncontrolled `<input>` (or a checkbox). Type into row A's input. Sort or reverse the list. The typed text stays in the same DOM position — now attached to a *different* item — because React matched by key=index=position and only swapped the text content of the labels, leaving the input's internal (DOM-owned) value where it sat. (Verified against current React docs and 2026 write-ups: this is still the textbook reproduction and still current behavior.)

**Exercise — `ReactCoding`, exploration mode (the load-bearing element).** This is the most important interactive in the lesson. Build a small app: an array of 3-4 named items, each rendered as a row with a label and an uncontrolled `<input defaultValue=... />` (or a checkbox), plus a "Reverse"/"Shuffle" button that reorders the array in state. Ship it with `key={i}`. Instructions: "Type a note into the first row, then press Reverse. Watch where your note ends up." The student feels the text desync. Then a second tab / second `ReactCoding` (or a `CodeVariants`-style before/after) ships the same app with `key={item.id}` and the bug is gone.
- Recommend implementing this as a single `ReactCoding` in exploration mode (no `tests`, no `target`) so the student can freely type and reorder — guided sandbox over open sandbox, but here the *interaction itself* is the lesson, so exploration is justified. Keep the starter small and readable; the reorder button and `useState` array are fine (L1 borrowed `useState`'s setter shape; a one-line `setItems([...].reverse())` is within reach, but add a one-line comment since immutable-update reflex isn't formally taught until Ch 024 — note this deliberate forward-lean for downstream agents).
- Pair it with a `CodeVariants` block (label "Index key (broken)" / "Stable id key (fixed)") showing just the `key=` line difference with `del=`/`ins=` markers and one-paragraph framing each. This gives the durable code takeaway next to the felt bug.

- After the demo, generalize the rule: index keys break the moment the list **reorders, filters, or inserts anywhere but the end.** Append-only lists survive index keys (the appended item gets a brand-new index, nothing shifts) — which is exactly why the bug hides in dev and surfaces in production when sorting ships.

`Term` candidates here: **uncontrolled input** (brief: "an input whose value lives in the DOM, not React state — React doesn't overwrite it on re-render, which is why the index-key bug is visible") — this is forward-referenced (Unit 6 owns forms) so a one-line tooltip keeps flow without a detour.

### Stable keys from data identity

The fix, generalized into a senior decision rule.

- The reach: a key tied to **data identity**, stable across renders. `key={item.id}` for DB rows, `key={post.slug}` for content. This directly cashes the code convention "Lists need a stable `key` tied to data identity. Never the array index for reorderable lists."
- When there's no natural id: assign one *once at creation* — `crypto.randomUUID()` (or the project's UUIDv7 helper) stamped when the row is created, then stored with the row. The critical word is *once*: the id must be generated at creation and persisted, **never** computed fresh during render. Contrast sharply with `key={Math.random()}` / `key={crypto.randomUUID()}` *inline in the map* — that mints a new key every render, so every row remounts every render: state lost, inputs blurred, a guaranteed perf and UX cliff. This is the interview-classic "what's wrong with this code."
- When index keys are genuinely fine: a list that is **static** and never reorders/filters/inserts mid-list — a fixed nav, a constant menu. Name this carve-out so the student doesn't over-correct into "index keys are always wrong"; the rule is about *reorderable* lists.
- Two precise constraints the student will trip on, taught inline at the point they matter (not bundled as a tips section):
  - **`key` is unique among siblings, not globally.** A `TodoList` and a `UserList` can each have a child with `key="1"` — different parents, different sibling sets. Reassure: you don't need to namespace keys across the app. (Verified current.)
  - **`key` is not a readable prop.** Reading `props.key` inside the child returns `undefined` — React reserves and consumes it. If the child needs the id, pass it again as a separate `id` prop. Show the two-prop shape briefly: `<Row key={item.id} id={item.id} ... />`. (Verified current — `key` is still reserved in React 19.)

Code: an `AnnotatedCode` over a single realistic list-render snippet is the right tool here — multiple parts of one block need focused attention (the `.map`, the `key={item.id}`, the separate `id` prop, the typed item param). 3-4 steps, blue default tint, each step ≤6 lines of prose. Pedagogical goal: direct the student's eye to each decision in the canonical pattern without four separate code blocks.

`CodeTooltips` is unnecessary here (no inferred-type story); skip it.

### Same component, new key, fresh instance — and what else triggers a remount

Consolidate the "remount" mechanism. This is the bridge to L5 — teach the mechanism, defer the tactic.

- State the mechanism crisply: when a component sits at the **same position** but its **`key` changes** between renders, React stops treating it as the same instance — it **unmounts** the old one (state gone, refs detached, effect cleanup runs) and **mounts** a fresh one (initial state, effects run clean). Same component *type*, different *instance*.
- Fold in the type-change and position-shift cases so the student leaves with **one unified rule for "React threw away my state":** state under a position is preserved only if, across renders, the element there keeps the *same type* **and** the *same key* (or, with no key, the *same position*). Change any of those three and the subtree remounts.
- The conditional-render subtlety (high-value, commonly-hit): `{showEdit ? <Form data={a} /> : <Form data={b} disabled />}` keeps the `<Form>` instance — same type at the position, only props change, so local state survives the toggle. Switch to `{showEdit ? <Form /> : <DisplayCard />}` and the form's state vanishes the instant `showEdit` flips, because the *type* at that position changed. Land the senior takeaway: if you want to preserve state across a conditional, keep the component type stable and branch on props; if you want to reset it, that's a job for a key change (L5).
- Fragments, briefly: fragments are transparent to reconciliation — children reconcile as if they were direct siblings of the parent. Note the one gotcha relevant to keys: the `<>` shorthand can't take a `key`; use `<Fragment key={id}>` explicitly when you need a keyed fragment in a list. Keep this to a couple of sentences — it's a recognition-level edge, not a focus.

- **Explicit forward-reference, do not teach the tactic here.** Name that "changing a key on purpose to reset a form when the selected record changes" is a real, deliberate pattern — and that **L5 ("Remounting with key") owns it.** One sentence. The continuity note for downstream: this lesson must teach the *mechanism* (key change → remount) and stop; L5 cashes it as a tactic. Do not preempt the record-bound-form example.

**Exercise — quick comprehension check.** A `MultipleChoice` or short `TrueFalse` round on the unified remount rule is well-placed here. Candidate items (TrueFalse fits): "Switching `<input type='text'>` to `<textarea>` at the same spot preserves the typed value" (false — type change), "Toggling a `disabled` prop on the same `<Form>` keeps its local state" (true — same type), "`key={Math.random()}` in a map preserves row state across renders" (false — remounts every render). Pedagogical goal: confirm the student fused type/key/position into one rule rather than three trivia facts. Prefer `TrueFalse` (fast, multi-statement, end-of-round review) over a single `MultipleChoice`.

### React 19's reconciler: faster, same rules

Short closing section to inoculate against confusion from "React 19 reconciler" content.

- The reconciler shipped real performance and scheduling work — React 19's renderer can interrupt low-priority rendering to handle high-priority updates (user input) immediately, so long renders don't block interaction. But the **reconciliation semantics are identical**: same two heuristics, same position-then-key identity. Nothing in *this* lesson is version-specific. (Verified: 2026 sources frame React 19's gains as scheduling/batching/concurrency, not a new diff algorithm. Do **not** assert a specific "fiber nodes X% smaller" statistic — it's uncorroborated; keep the claim qualitative.)
- The senior takeaway: when you read a "the React 19 reconciler" blog post or release note, expect *performance and scheduling*, not a new mental model. The rules you just learned are the rules.
- Use an `Aside` (note) for this rather than a full subsection of prose — it's a "don't be confused" signal, not new teaching. Keep it tight.

### External resources (optional)

One or two `ExternalResource` cards: React docs "Preserving and Resetting State" (the canonical reference for position/key/type identity) and "Rendering Lists" (keys). Optional — author/resourcer's call. No YouTube video is necessary for this lesson; the index-key bug is best taught by the live sandbox, not a watch-along.

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- `UI = f(state)`, render = calling the component to get an element tree, render/commit split, the `Trigger → Render → Reconcile → Commit` strip — all from L1. Restate in one sentence each as needed; do not re-derive.
- `Object.is` prop equality and inline-literal identity churn — L1 owns it. This lesson uses "element tree" and "new tree every render" but does **not** re-explain reference identity.
- `useState`'s setter shape (`const [x, setX] = useState(init)`; setter schedules a re-render) — borrowed/named in L1, full API is Ch 024. Use it in the sandbox only at the depth L1 already established; one-line comments where the immutable-update reflex (Ch 024) is leaned on early.

**Explicitly out of scope — defer, with a one-line pointer where the student would expect it:**
- **The `key`-as-state-reset tactic** (record-bound form, animation replay, button-bump reset) → **L5 of this chapter.** Teach only the mechanism (key change → remount); name that L5 owns the deliberate use. This is the single most important boundary to hold.
- **Component purity / the compiler contract** → L3 of this chapter. Reconciliation assumes pure render but this lesson doesn't teach purity.
- **State-as-snapshot, updater functions, batching** → L4. The sandbox's reorder uses a setter but the lesson makes no claim about snapshots or batching.
- **`useState` API surface, lazy init, derived state, lifting state** → Ch 024. When the remount section mentions "fresh initial state," don't open the lazy-initializer or derived-state discussions.
- **`useEffect`, cleanup-on-remount mechanics, Strict Mode double-mount** → Ch 025. The remount section may *name* that effects clean up and re-run on remount (it's part of "what remount costs"), but must not teach the effect lifecycle.
- **Manual `useMemo`/`useCallback`/`React.memo` and the React Compiler config** → Ch 026. Don't reach for memoization to "fix" anything here.
- **The Fiber data structure at depth, the actual diff implementation** → out of scope entirely. Teach behavior and rules, never the internal node graph.
- **`<Suspense>` boundary reconciliation, concurrent rendering/interruption at depth** → Ch 031 / recognition-only in Ch 025. The React-19 section may mention "interruptible rendering" as a one-liner but does not teach concurrency.
- **Server-rendered lists, key stability across SSR/hydration** → Unit 4 / Ch 032 territory. Keep all examples client-side.
- **Controlled vs. uncontrolled inputs and forms in general** → Unit 6. Use an uncontrolled input in the demo (it's what makes the bug visible) with a one-line `Term`, but do not teach the controlled/uncontrolled decision.

## Code conventions notes

- Apply: "Lists need a stable `key` tied to data identity. Never the array index for reorderable lists." — this is the lesson's thesis in convention form. The "Stable keys from data identity" section *is* this rule, taught.
- Apply: arrow-function components bound to `const`; `PascalCase` components; single quotes (double only in JSX attributes); 2-space indent; typed props as the function parameter.
- Apply: keys from data identity prefer `item.id`; for generated ids the project standard is UUIDv7 (`uuidv7()` helper) — mention `crypto.randomUUID()` as the platform primitive but note the project helper, consistent with the Drizzle PK convention. Don't deep-dive UUID flavors.
- Deliberate divergence (flag for downstream agents): the broken sandbox ships `key={index}` and an uncontrolled `<input>` — both are *anti-patterns* the lesson is exposing, not endorsing. The fixed variant must model the convention-correct shape. Make the "this is the bug, not the recommendation" framing unmistakable in surrounding prose so no agent or student mistakes the broken variant for house style.
- Deliberate divergence: the sandbox leans lightly on the immutable-update reflex (`[...items].reverse()`) before Ch 024 formally teaches it — keep it to one commented line; this is a pedagogy-over-completeness call, noted so a later agent doesn't "fix" it by importing Ch 024 machinery.
