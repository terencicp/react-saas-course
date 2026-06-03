# Lesson title

- **Title:** You probably don't need an effect
- **Sidebar label:** You don't need an effect

---

# Lesson framing

This is the conceptual capstone of the effects arc and the lesson the project's own code conventions point juniors to ("Read 'You probably don't need an effect' before reaching for one"). Lessons 1–3 of this chapter taught the *mechanics* of effects (Strict Mode, the `useEffect` lifecycle, the non-reactive seam). This lesson teaches the *judgment*: before writing any effect, run an audit, and four times out of five the answer is "this is not an effect — it has a better-shaped tool."

**The single mental model the student must leave with:** an effect synchronizes React with a system *React doesn't own*. If you can't name the external system the effect synchronizes with and what its cleanup tears down, you've miscategorized the problem — it's really a derived value, an event handler, a server fetch, or cached server state. The lesson is an exercise in *re-shaping*, not in deleting effects.

**Why a junior gets this wrong.** `useEffect` is the one hook that "feels like" the old lifecycle methods, so a junior from a class-component or jQuery background reaches for it as the universal "do something when stuff changes" hook. The pain is real and compounding: every misused effect adds a render cycle, a stale-closure surface, a possible loop, and a maintenance liability. The senior framing reframes the reflex from *"I'll use an effect"* to *"what shape should this be?"*. The accumulation trap (a codebase with 80 effects across 200 components has races and loops *somewhere*) is the production stake that makes this matter.

**Pedagogical spine — two devices carry the lesson:**

1. **The audit as a decision tree** (`StateMachineWalker`, `kind="decision"`). The five quadrants are not five parallel facts; they are an *ordered* set of questions a senior asks in sequence. The walker forces the student to walk the order (derive → handle → server → cache → sync) rather than memorize a flat list. This is the durable artifact of the lesson — the student should be able to replay this walk in their head at a real keyboard.

2. **The anti-pattern catalog as before/after pairs** (`CodeVariants`, `del=`/`ins=`). Each anti-pattern is a recognizable *shape* ("`useState` + `useEffect(() => setX(...))` with no cleanup"), paired with its correctly-shaped fix. The student learns to pattern-match the smell, then apply the named replacement. Grouping by quadrant keeps cognitive load bounded — each fix references a tool the student already owns (derive-in-render from ch024 l2, `key` reset from ch023 l5, handlers, lifting state from ch024 l3).

**Cognitive-load sequencing.** Open with the audit (the cheap, reusable framework), then walk the catalog quadrant by quadrant (derived → events → chains/notify → fetch/cache → the residual legit cases), then close with the code-review heuristic that compresses the whole lesson into two questions. Don't front-load all eight anti-patterns; introduce each beside the quadrant it falls under so the student always knows *which question failed*.

**Scope discipline is critical here.** This lesson is wall-to-wall cross-references — nearly every fix lives in another lesson. The writer must *name the replacement and show its shape*, then stop. Do not re-teach `useEffect` mechanics (l2), `useEffectEvent` (l3), `key` reset (ch023 l5), Server Components (ch030), or TanStack Query (ch11). The lesson's value is the *catalog and the audit*, not deep dives into each fix.

This is a concepts-and-judgment lesson, not a syntax-drill lesson, so live coding takes a back seat to recognition exercises (classification, before/after reading, code review). One focused `ReactCoding` refactor exercise earns its place because converting a derived-state-via-effect to derive-in-render is the single most common real fix and is satisfying to *do*, not just read.

---

# Lesson sections

## Introduction (no header)

Open with the senior question, concretely. A junior on the team opens a PR with five `useEffect`s in one component: one updates a `totalPrice` derived value, one resets a form draft when the selected record changes, one fires an analytics event after a save, one fetches the page's initial data on mount, one notifies the parent that a value changed. State the verdict up front: **four of these five are wrong** — not because effects are bad, but because each has a better-shaped tool. Promise the lesson's two deliverables: a reusable *audit* you run before writing any effect, and a *catalog* of the named anti-patterns so you recognize the smell on sight.

Reconnect to the arc: lessons 1–3 taught how effects *work*; this lesson is the one that decides *whether to write one at all*. Land the one-line thesis early: **an effect synchronizes React with a system React doesn't own — if you can't name that system, it's not an effect.**

Keep it to ~4 short paragraphs. Warm, terse, no celebration.

## The audit: five questions before any effect

The centerpiece. Teach the five-quadrant audit as an *ordered diagnostic*, then make it interactive.

Concepts to land (in this order — the order is the lesson):

1. **Is this value *derived* from existing props/state?** → compute it in render. (Ref ch024 l2.)
2. **Is it triggered by a specific *user interaction*?** → event handler.
3. **Is it *initial data* the page needs to render?** → Server Component or route loader. (Ref ch030 / Unit 4, recognition only.)
4. **Is it *cached server state* with refetch/polling/optimistic needs?** → TanStack Query, or `use()` for a simple read. (Ref ch11 / l7.)
5. **Are you *synchronizing with an external system* React doesn't own?** → *now* it's a `useEffect`.

Only quadrant 5 warrants an effect. Frame quadrants 1–4 as "the effect you were about to write is a symptom of reaching past a closer tool."

**Diagram — the audit decision tree.** Use `StateMachineWalker` (`kind="decision"`, do *not* wrap in `<Figure>`). This is the lesson's durable artifact. Each `<Question>` is one audit question phrased as the senior would ask it; branches are "yes / no"; each `<Leaf>` is a verdict naming the correctly-shaped tool with a one-line rationale.

- Pedagogical goal: the student internalizes the *sequence*, not a flat list. Walking it commits the order to memory; a flat bullet list would not.
- Suggested topology (author may refine): `derived?` → yes → Leaf "Compute it in render"; no → `triggered-by-interaction?` → yes → Leaf "Event handler"; no → `initial-page-data?` → yes → Leaf "Server Component / route loader"; no → `cached-server-state?` → yes → Leaf "TanStack Query or `use()`"; no → `external-system?` → yes → Leaf "`useEffect` (the residual case)"; no → Leaf "You don't need to do anything here" (the value already exists / already flows).
- Keep leaf rationales to one or two sentences with the tool named in the `verdict` pill. Cross-reference lessons in the leaf body but do not teach them.

After the walker, give a compact static summary of the five quadrants (a tight `Card`/`CardGrid` or a plain table) so the student has a glanceable reference that doesn't require re-walking the tree. Keep it to the question + the tool, one line each.

`Term` candidates in this section: **derived value** (re-anchor from ch024 l2 — a value computed from existing props/state, recomputed every render), **route loader** (recognition — a Server Component or framework data function that fetches before render; owned by Unit 4).

## Anti-pattern: state that should just be derived

The most common misuse, and the highest-value fix. A component keeps `totalPrice` in `useState` and an effect that calls `setTotalPrice(sum(items))` whenever `items` changes.

Teach via `CodeVariants` (before/after, `del=`/`ins=`):
- **Variant "Effect" (the smell):** `const [total, setTotal] = useState(0); useEffect(() => setTotal(sum(items)), [items]);`. Prose: names the two costs — a wasted second render (state set *after* the first render commits, triggering another), and a stale-state window where `total` lags `items` for one render.
- **Variant "Derived" (the fix):** `const total = sum(items);` in render body. Prose: one render, no stale window, no state to keep in sync, the effect and its `useState` both vanish.

Land the recognition rule: **`useEffect(() => setX(derivedFromProps))` with no cleanup is the textbook shape of this anti-pattern.** Cross-ref ch024 l2 (derive-in-render is the home concept) without re-teaching it. Note in one sentence that the modern `eslint-plugin-react-hooks` ships a `set-state-in-effect` lint rule that flags exactly this shape (calling a setter synchronously in an effect) — the tooling now catches the anti-pattern automatically. Name the rule, don't teach the lint config; enforcement is ch025 l8's surface. Briefly note the expensive-computation variant: if `sum`/`expensiveTransform` is genuinely heavy, the fix is *still* compute-in-render, just let the React Compiler memoize it (ref ch026 l2) or fall back to `useMemo` — *not* an effect-plus-state. One sentence; mechanics are ch026's.

**Live exercise — `ReactCoding`, tests mode.** This is the one hands-on refactor in the lesson and it earns its place. Give the student a small working-but-smelly component (a cart with `items` as a prop and `totalPrice` held in `useState` + synced by an effect). Task: remove the effect and the `useState`, derive `totalPrice` in render. Grade with tests asserting: (a) the rendered total matches `sum(items)` for the seeded items, (b) — the durable check — `useEffect` and `useState` no longer appear (assert via a render-count probe or a source check: the component must produce the correct total in a *single* render with no effect-driven update). Keep the component tiny so the focus is the refactor, not the domain. Provide a reference solution behind `<details>`.

## Anti-pattern: resetting or adjusting state when a prop changes

Two related shapes; teach the dominant fix first, flag the narrow exception second.

**The dominant case — full reset.** An editable form keeps a `draft` in state and an effect `useEffect(() => setDraft(record), [record])` to reload the draft when the selected `record` prop changes. This works but is the wrong shape: the component renders once with the *stale* draft, then the effect fires and renders again.

Teach via `CodeVariants`:
- **Variant "Effect reset" (smell):** the `useEffect(() => setDraft(record), [record])` version.
- **Variant "`key` reset" (fix):** `<EditForm key={record.id} record={record} />` at the *parent*, with `EditForm` initializing `draft` from `record` via `useState`. Prose: changing the `key` makes React discard the old component instance and mount a fresh one with fresh state — no effect, no stale render. Cross-ref ch023 l5 (the `key`-as-identity concept is owned there); name it, don't re-derive it.

**The narrow exception — partial reset (adjust one field, keep the rest).** Sometimes you want to keep most edits but reset *one* field when a prop changes. The documented pattern is `setState` *during render*, conditionally, gated by a previous-value comparison (store the previous prop, compare, and call the setter inside the render body when it changed). Show it once with `AnnotatedCode` so the student can read the unusual shape carefully (highlight: the previous-value tracking, the in-render conditional `setState`, the early continuation). **Flag it loudly as the 5% case** — an `Aside` (caution): reach for `key` first; this pattern is for when you genuinely can't reset the whole subtree. Note that this is the *only* sanctioned `setState`-in-render and React explicitly supports it (it re-renders immediately, before committing, without a paint). Do not generalize it.

`Term` candidate: **component identity** (re-anchor from ch023 l5 — React keys a component instance by position + `key`; a changed `key` is a different instance, so its state resets).

## Anti-pattern: event logic hiding in an effect

A class of bugs where the trigger is genuinely a *user action*, but the code reacts to the resulting *state change* via an effect instead of doing the work in the handler. Examples: showing a toast after a save succeeds, navigating after a form submits, firing analytics on a button click.

Teach the principle first, then a representative pair. The tell: the work should happen *because the user did X*, not *because state Y changed*. An effect that watches state to do event-shaped work runs on *every* path that sets that state (including ones you didn't intend), and is one render late.

`CodeVariants` on the analytics/toast example:
- **Variant "Effect" (smell):** `useEffect(() => { if (saved) showToast('Saved'); }, [saved]);`. Prose: fires on any code path that sets `saved`, including a re-mount with `saved` already true; the trigger is divorced from the action.
- **Variant "Handler" (fix):** call `showToast('Saved')` inside the `onSave` handler, right after the save resolves. Prose: the toast is tied to the *action*, fires exactly once, on exactly the path the user took.

Land the boundary rule from the chapter's effect arc: **effects are for changes that should happen because the component is *displayed* and synced; handler work happens because the user *did something specific*.** Reuse the running distinction from l1–l3 (Strict Mode double-invokes effects, *not* handlers — a second reason event work doesn't belong in an effect).

## Anti-pattern: chains of effects, and notifying the parent

Two shapes that share a root cause — using effects to propagate one logical change across multiple pieces of state or across the component boundary, each hop costing a render and risking a loop.

**Chains of effects.** State A changes → effect sets B → another effect sets C. Three renders for one logical transition, and the intermediate renders show inconsistent state. Show the smell briefly (don't belabor it). Fix: compute B and C in the *same handler* that sets A, or model the whole transition atomically with `useReducer` (ref ch024 l4 — name it, the reducer is owned there). Frame the heuristic: **effects-feeding-effects-feeding-effects is the canonical signal to reach for a reducer.**

**Notifying the parent (child-to-parent via effect).** A child holds state X and wants to tell the parent when it changes, via `useEffect(() => props.onChange(x), [x])`. The notification lands one render late and loops are trivially easy (parent re-renders child, effect fires again). Fix: call `props.onChange(next)` in the *same handler* that updates X (often *before* or alongside the local `setX`), or — if the parent is the real owner — lift the state entirely (ref ch024 l3, "lifting state up"; name it).

Use one `CodeVariants` for the notify case (it's the more common real bug):
- **Variant "Effect notify" (smell):** `useEffect(() => onChange(value), [value]);`.
- **Variant "Notify in handler" (fix):** in `handleChange`, call both `setValue(next)` and `onChange(next)`.

Briefly note the related **"subscribing to a parent's prop/context via effect"** smell — a child copies a prop into local state through an effect, then reads the local copy (always one render stale). Fix: read the prop/context directly. One or two sentences; it's the same "read it, don't mirror it" lesson.

`Term` candidate: **lift state up** (re-anchor from ch024 l3 — move shared state to the closest common parent so both children read the same source).

## Anti-pattern: fetching on mount

Historically the single biggest use of `useEffect`, and the one most thoroughly replaced in 2026. Give it real weight because the student *will* see this pattern everywhere in older code and AI output.

Show the 2020 shape and name why it's a liability: `useEffect(() => { fetch(url).then(r => r.json()).then(setData); }, []);` with a `if (!data) return <Spinner/>` below. Enumerate what it costs — two+ renders, hand-rolled loading state, hand-rolled error handling, manual race-condition cleanup, *and it doesn't run during SSR* (so the first paint has no data and the page can't be server-rendered with content).

Then the **fix ladder**, ordered (this is a small decision sub-tree — consider a tight ordered list or a compact `StateMachineWalker` branch, but a list is fine here since it's linear):
1. **Server Component awaits directly** — the default in 2026. `const data = await getData();` in a Server Component, no effect, no client JS, data present at first paint. (Ref ch030 — recognition only.)
2. **`use()` a promise from a Server Component parent** — when the consumer must be a Client Component, the parent passes the unawaited promise and the child reads it under `<Suspense>`. (Ref l7 — name it, l7 owns the surface.)
3. **TanStack Query** — when you need client-side caching, polling, invalidation, or optimistic updates. (Ref ch11.)

Land the rule: **a `useEffect` that fetches is a code-review red flag in 2026.** It survives only in genuinely residual cases (an SDK call that only exposes a callback, a non-cacheable client-only POST mid-interaction) — and even then it's rare. Cross-ref l2's abort/ignore patterns as the *mechanics* if you ever do hit a residual case, without re-teaching them.

`Term` candidates: **SSR** (server-side rendering — the server produces the initial HTML; effects don't run there, so effect-fetched data is absent from the first paint), **hydration** (only if needed — likely defer, it's ch030's; mention by name at most).

## When an effect is actually the answer

Close the catalog by clearly drawing the *residual surface* so the lesson doesn't read as "never use effects." This section makes the student confident about quadrant 5.

Enumerate the legitimate cases — each is synchronization with a system React genuinely doesn't own:
1. **Real-time connections** — WebSocket, `EventSource`/SSE, `BroadcastChannel`. (The chat-room example from l2/l3 lives here.)
2. **Third-party widgets that take a DOM node** — a chart library, a map, Stripe Elements, a video player. React renders the container; the effect instantiates the widget against the node and the cleanup destroys it.
3. **Browser APIs React doesn't model** — `matchMedia`, `IntersectionObserver`, `ResizeObserver`, raw scroll/resize listeners.
4. **Native element state sync** — driving a `<dialog>` open/close or `<details>` from React state.
5. **Script-tag / non-React widget initialization** — a third-party script that must be set up against the live DOM.

Present these as a `CardGrid` or a tight list — five recognizable categories, each with its one-line "what it synchronizes with." Reinforce the through-line: **every one of these returns a cleanup that tears down exactly what it set up.** No external system + empty cleanup = not actually this section.

Reuse the **`usePrevious` legitimate-exception** note from the chains discussion if it didn't land there: writing a previous value to a ref via an effect *is* synchronization (with the ref as a tiny external store), which is why it's the one "store a value in an effect" pattern that's fine. Name the `usePrevious` custom hook as where this is packaged (ref ch026 l1). One or two sentences.

## The two-question code review

The compression of the whole lesson into a reusable heuristic, plus the production stake. This is the *takeaway* the student carries to real PRs.

Teach the heuristic explicitly — for any effect you encounter, ask:
1. **What external system does this synchronize with?**
2. **What does its cleanup tear down?**

If the answer to (1) is "none" and (2) is "nothing," the effect is almost certainly one of the catalog's anti-patterns — re-shape it. This two-question filter *is* the audit, applied in review instead of authorship.

Land the **accumulation trap** as the production stakes: an effect is never free — each one adds a render, a stale-closure surface, a possible loop, and a line of maintenance liability. A codebase with dozens of effects scattered across components is *statistically guaranteed* to have an ordering bug, a race, or a loop somewhere. The senior discipline is not "use effects well"; it's "reach for `useEffect` only when nothing else fits."

**Exercise — `CodeReview`.** This is the ideal capstone: a short multi-file PR (2 files) seeded with two or three effect anti-patterns from the catalog (e.g., a derived-state-via-effect, an event-in-effect, and a fetch-on-mount). The student leaves inline comments flagging each. `kernel` phrases name the defect crisply ("derived value held in state and synced by an effect — derive in render", "save toast fired from an effect watching state instead of from the save handler", "initial data fetched in `useEffect` instead of a Server Component"). `<ReviewWhy>` ties it back to the two questions. This makes the student *perform* the senior reflex the lesson teaches, against realistic code.

**Exercise — `Buckets` (classification, optional second check).** If a second exercise is wanted before the code review, a `Buckets` drill sorting ~6 scenarios into **"derive in render" / "event handler" / "server / cached" / "real `useEffect`"** is a fast recognition check that maps directly onto the audit. Scenarios phrased as plain-language situations ("the filtered list shown from a search box and a dataset", "connect to a chat server when a room opens", "show a success toast after saving", "the page's initial list of invoices"). Place it *after* the catalog, *before* the code review, as the warm-up to the capstone. Use the four-bucket framing so it reinforces the audit's quadrants (collapse "server" and "cache" into one bucket to keep it tractable).

**Concept-check — `MultipleChoice`.** One question probing the *recognition* skill, not prose recall: show a small effect and ask which anti-pattern it is / what the right shape is. Phrase distractors so the student must reason from the shape (no answer is a verbatim lift from the prose). Place wherever it best checks a just-taught point — likely after the fetch-on-mount section.

## External resources (optional)

`ExternalResource` cards, kept to 1–2:
- React docs "You Might Not Need an Effect" (the canonical reference this lesson is built on).
- Optionally the React docs "Synchronizing with Effects" for the residual-cases counterpart.

No YouTube video is necessary here — the concepts are decision-and-pattern oriented and are better served by the interactive walker, the before/after variants, and the code-review exercise than by a talking-head video. If the resourcer finds a high-quality, current (last 6 months) conference talk specifically on the "you don't need an effect" audit, a single `VideoCallout` could supplement, but it is not required and should not be invented.

---

# Scope

**This lesson teaches:** the five-quadrant audit (derive / handle / server / cache / sync) as an ordered decision tree; the catalog of effect anti-patterns each paired with its correctly-shaped replacement; the residual surface of genuinely-legitimate effects; and the two-question code-review heuristic plus the accumulation-trap stake.

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- *Derive in render* (ch024 l2) — values computed from props/state belong in the render body, not in state.
- *`key` reset* (ch023 l5) — a changed `key` gives a component a fresh instance with fresh state.
- *Lifting state up* (ch024 l3) — shared state moves to the closest common parent.
- *`useReducer`* (ch024 l4) — model a multi-field atomic transition in one place.
- *`useEffect` lifecycle / cleanup* (ch025 l2) — setup synchronizes, cleanup tears down; assume fully known.
- *Strict Mode double-invokes effects but not handlers* (ch025 l1) — assume known; reuse, don't re-explain.

**Explicitly out of scope (belongs elsewhere — name and forward-reference at most):**
- `useEffect` API surface, dependency arrays, abort/ignore race patterns — **ch025 l2** (already taught; reference as mechanics only).
- `useEffectEvent` — **ch025 l3** (the seam for the *residual* legitimate effect; this lesson gates *whether* you need an effect, l3 handles the non-reactive read *inside* one).
- `key`-as-identity mechanics — **ch023 l5**.
- Server Components and the App Router data path — **ch030 / ch032 / Unit 4** (recognition only; never teach the data-fetching API here).
- `use()` and `<Suspense>` — **ch025 l7**.
- TanStack Query (caching, polling, invalidation, optimistic, `useSuspenseQuery`) — **ch11**.
- Streaming / Suspense boundaries — **ch031**.
- React Compiler auto-memoization and `useMemo`/`useCallback` thresholds — **ch026 l2 / l3** (name as the answer for expensive derived values; don't teach mechanics).
- `usePrevious` and custom hooks — **ch026 l1** (name the packaging only).
- Rules of hooks / `exhaustive-deps` enforcement — **ch025 l8**.
- `useTransition` / `useDeferredValue` — **ch025 l6**.

**Deliberate divergences from code conventions (flag for downstream agents):** anti-pattern "before" snippets intentionally show *bad* shapes (effect-driven derived state, fetch-on-mount, effect-notify) that violate the project's own conventions — this is the whole point. Mark each "before" variant clearly as the smell (label, prose first sentence, `del=` markers) so no agent mistakes it for endorsed code. The "after" variants must be convention-clean (derive in render, handler work in handlers, Server Component fetch named correctly). The partial-reset `setState`-in-render pattern is a sanctioned-but-rare exception — keep it flagged as such.
