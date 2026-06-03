# Lesson title

- Title: `Marking updates as non-urgent`
- Sidebar label: `Non-urgent updates`

# Lesson framing

This is the **concurrent rendering** lesson of chapter 025. Two hooks — `useTransition` and `useDeferredValue` — plus one standalone `startTransition`. The whole lesson hangs on one reframe the student must leave with: **these mark *intent* (which update is urgent), not *speed* (they don't make anything faster).** Every junior who meets these reaches for them as a performance band-aid; the senior reaches for them to tell React *what to render first* when a single event triggers both a cheap urgent update (an input painting its keystroke) and an expensive non-urgent one (a 5,000-row list re-rendering).

**Target student.** Has just finished chapter 024 (state, snapshots, the `Object.is` bailout, `useReducer`, lifting state) and chapter 025 lessons 1–5 (Strict Mode, `useEffect` as sync, `useEffectEvent`, the "you don't need an effect" audit, `useContext` + re-render cost). Knows controlled inputs, derive-in-render, and that React batches and re-renders on state change. Does **not** yet know `use()`/Suspense mechanics (lesson 7), Server Actions (Unit 6), or the Profiler (chapter 026 lesson 3).

**The pain that motivates the lesson.** The student already understands *why* a heavy re-render is slow (it's synchronous work on the main thread). What they've never had is a lever to say "this part of the update can wait." Before concurrent React, the only tools were debounce/throttle (delays the *work*, still janky on commit) or manual virtualization (huge effort). The relief these hooks provide: React's renderer can **interrupt** an in-progress low-priority render to handle a high-priority one, then resume. The student felt the `Object.is` bailout (chapter 023/024) as React's way of skipping work; this is React's way of *reordering* work.

**The mental model to land (build it gradually, minimize cognitive load).**
1. Start concrete and visceral: a type-ahead where every keystroke janks. Show the problem, not the API.
2. Introduce the *two-update insight*: one `onChange` fires two state updates of different urgency. This is the crux — once the student sees that an event can split into urgent + non-urgent, both hooks become obvious.
3. `useTransition` = **mark the setter** (you own where the update happens). `useDeferredValue` = **mark the value** (you only receive it, e.g. from a library or a parent). Same outcome, opposite side of the data flow. This wrap-the-setter vs. wrap-the-value cut is the single decision the student must be able to make.
4. Layer `isPending` for UX feedback (dimming, spinner).
5. Layer async transitions (foundation Server Actions build on — recognition forward-ref to Unit 6).
6. Layer the Suspense interaction (keep old UI visible) — recognition only, lesson 7/chapter 031 own it.
7. Close with the **threshold**: default is *no* transition; reach only on measurable jank that the React Compiler hasn't already erased.

**Why both hooks in one lesson.** They're two faces of one concept (priority marking). Teaching them together makes the wrap-the-setter/wrap-the-value cut the centerpiece — that decision *is* the lesson's senior skill. Splitting them would bury the comparison.

**Production stakes to surface.** This is the exact machinery behind every responsive search box, tab switch, and filter in a real SaaS. Forward-ref (one sentence) that Unit 6's URL-search lesson rebuilds a production search input on this foundation, and that Server Action form submissions are transitions under the hood — so this isn't a niche optimization, it's a primitive they'll meet constantly.

**Pedagogical vehicles.**
- A **live `ReactCoding` exercise** is the spine: a real laggy type-ahead the student fixes by splitting the update. Live coding is where the jank → smooth transformation becomes felt, not described. Guided (tests-graded), not a sandbox.
- A **`DiagramSequence`** to visualize the interrupt-and-resume timeline (urgent commit jumps the queue). This is the one genuinely non-obvious mechanic; a static paragraph won't land "React abandons in-progress work."
- A **`CodeVariants`** block for the wrap-the-setter vs. wrap-the-value cut — the two shapes side by side is the clearest possible framing of the central decision.
- An **`AnnotatedCode`** walkthrough of the canonical type-ahead so the two-update split is dissected line by line.
- A **`MultipleChoice`** (or two) to check the urgency-not-speed model and the setter/value cut.
- No video proposed (the live exercise + diagram carry it; keep the lesson tight).

# Lesson sections

## Introduction (no header)

Open with the visceral problem, three flavors of the same bug, framed as the senior question (per pedagogical guidelines, implicit not a header): a type-ahead whose input stutters because every keystroke re-renders a giant result list; a tab click that freezes mid-animation because switching tabs triggers a heavy render; a filter that locks the table for 300ms. Name the shared diagnosis up front: each is a **priority** problem, not a speed problem — one event triggers two updates, one urgent (the input/click must respond *now*) and one non-urgent (the downstream re-render can wait a beat). Preview the payoff: by the end the student can keep an interface responsive under heavy renders by telling React which updates may wait, and can choose between `useTransition` and `useDeferredValue` correctly. Connect to prior knowledge: they've seen React skip work via the `Object.is` bailout (chapter 023/024); this is React *reordering* work instead of skipping it. Keep it warm and brief.

## Urgency, not speed

The core mental-model section — must come before any API so the student never installs the wrong model.

Teach: React 19's renderer is **concurrent** — it can pause a render that's in progress, handle a more urgent update, then resume or restart the paused one. The priority hooks don't make rendering faster; they label updates so React knows which one is allowed to block the user and which can be done in the background. `startTransition` marks a state update as low-priority ("transition"); React commits any urgent update first and renders the transition in the background.

The non-negotiable line to pin (Aside `:::note` or bold thesis): **these are priority markers, not speed boosts.** The expensive render still costs the same; it just no longer blocks the keystroke.

Diagram — **`DiagramSequence`** (the interrupt-and-resume timeline). Pedagogical goal: make "React abandons in-progress low-priority work to service an urgent update" visible, because it's the one mechanic prose can't convey. Steps (authored as simple HTML strips inside `DiagramStep`, horizontal lanes capped in height per the diagrams vertical-space rule):
1. User types "a" → two updates queued: **urgent** (input value) + **transition** (filter the list).
2. React commits the urgent update immediately → input shows "a". Transition render starts in the background.
3. Before the background render finishes, user types "b" → new urgent update arrives.
4. React **interrupts/abandons** the half-done background render, commits "b" to the input, restarts the transition render for "ab".
5. Typing stops → background render completes → list updates. Input never stuttered.
Caption each step. The abandon-and-restart in step 4 is the payload — call it out explicitly (a transition can be interrupted; that's correct behavior, the stale work would have been wrong anyway).

Reasoning: leading with the model (not the signature) follows "decisions before syntax" and prevents the speed-boost misconception that otherwise contaminates everything downstream.

`Term` tooltips here: **concurrent rendering** (React renders in interruptible chunks instead of one blocking pass), **transition** (a state update React is allowed to render in the background and interrupt).

## useTransition: marking the setter

First API. Use this hook when **you own the setter** — you control the code that calls `setX`.

Teach:
- Signature: `const [isPending, startTransition] = useTransition()`. `isPending` is `true` from the moment the transition starts until its render commits — drives spinners, dimming, disabled states.
- Usage: wrap the *non-urgent* state update in the callback: `startTransition(() => { setFilter(value); })`.
- The canonical reach — **input + slow filter** (the running example). The input's `onChange` fires two updates: the urgent `setQuery(value)` so the controlled input paints the keystroke immediately, and `startTransition(() => setFilter(value))` which drives the expensive list. React commits the input first; the list re-renders in the background.

Code — **`AnnotatedCode`** of the canonical type-ahead component. The single block written once; steps dissect it (color the urgent path one color, the transition path another):
1. `const [isPending, startTransition] = useTransition()` — the hook returns the pending flag and the marker.
2. `setQuery(value)` outside the transition — the **urgent** path; the input must never lag.
3. `startTransition(() => setFilter(value))` — the **non-urgent** path; the slow list can wait.
4. `isPending && <Spinner/>` (or a dimming class on the list) — surfacing the background work to the user.
The pedagogical goal: make the *two-update split* unmissable. This is the insight the whole lesson rests on.

Watch-outs woven into prose at the point each applies (NOT bundled at the end):
- `startTransition(setX)` — passing the setter directly does nothing; you must *call* `setX` inside the function. (Common first mistake.)
- The state update isn't *delayed* — `setFilter(v)` still queues a commit; only its **priority** changes. (Corrects "transition = setTimeout" misconception.)
- `isPending` covers both the transition render *and* any suspending resource it triggers — so one flag handles your spinner in both cases.

`Term` tooltip: **isPending**? No — self-evident from context. Keep tooltips strategic.

## useDeferredValue: marking the value

Second API, framed as the mirror of the first. Use this hook when **you don't own the setter** — you only *receive* a value (from a third-party input, a library hook, a parent prop) and want the expensive consumer to lag.

Teach:
- Signature: `const deferredQuery = useDeferredValue(query, initialValue?)`. Returns a value that **lags**: when `query` changes, `deferredQuery` keeps the *previous* value for the urgent render, then React re-renders at low priority with the new value. Optional `initialValue` (React 19) is what the deferred value reports on the very first render (useful for SSR with a placeholder).
- The canonical reach: you can't wrap the setter (it's inside a library or a parent), so wrap at the **consumer**. `const deferredQuery = useDeferredValue(query); return <SlowList query={deferredQuery} />`. The input stays bound to `query` (urgent, instant); only `SlowList` reads the lagging value.
- Compounding win with memoization: when the deferred value feeds a `useMemo` (or the React Compiler's auto-memo), the expensive computation only re-runs when the deferred value updates — not on every keystroke. Mention the compiler does this for pure computation automatically (chapter 026 lesson 2 owns the surface); `useMemo` is the manual fallback. Keep it to one or two sentences — don't re-teach memoization.

Code — a short **`Code`** block (simple, no stepping needed) showing the consumer-wrap shape: input bound to `query`, `SlowList` reading `useDeferredValue(query)`.

Watch-outs inline:
- **Wrapping the input's own value in `useDeferredValue` is the classic mistake** — that's the urgent path; the input would lag behind the user's typing. Defer the *consumer*, never the source of truth the input is bound to.
- An effect that reads a deferred value sees the *deferred* value, not the live one — usually what you want, occasionally a trap (call it out, don't dwell).

`Term` tooltip: none new needed.

## Setter or value: choosing between them

The decision section — the lesson's central senior skill. Short, sharp, comparison-driven.

The cut: **wrap the setter** (`useTransition`) when you control where the state update happens; **wrap the value** (`useDeferredValue`) when you only observe a value handed to you. Same downstream behavior (the expensive render runs at low priority, the urgent path stays responsive) — different side of the data flow.

Vehicle — **`CodeVariants`** with two tabs, the same type-ahead solved both ways:
- Tab "Wrap the setter (`useTransition`)": you own the `onChange`, so split the update there. First-sentence framing: *"You control the state update — mark it where it happens."*
- Tab "Wrap the value (`useDeferredValue`)": the query comes from somewhere you don't control, so lag the value at the consumer. First-sentence framing: *"You only receive the value — lag it where it's read."*
This side-by-side is the clearest possible presentation of the one decision the student must internalize.

Add a one-line heuristic to commit to memory (Aside `:::tip`): *own the update → transition the setter; only receive the value → defer the value.*

Check — **`MultipleChoice`**: give 3–4 short scenarios (you wrote the `onChange`; the value comes from a `nuqs`/router hook; a third-party `<Combobox>` calls you back with the query; you set state in your own click handler) and ask which hook fits. Tests the cut directly. (Multi-correct only if a scenario genuinely allows both.)

## Async transitions and the pending state

Layer on the async capability and tie `isPending` to real UX — and plant the Server Actions seed.

Teach:
- React 19+ allows `async` work inside a transition: `startTransition(async () => { const data = await fetchSomething(); ... })`. Any awaited work is included in the transition and `isPending` stays `true` until it settles — so a single flag drives the loading affordance across the whole async flow.
- **The post-`await` nesting requirement (must teach correctly — this is a real current-limitation footgun).** A state update placed *after* an `await` is no longer synchronously inside the transition, so React won't mark it as a transition unless you wrap it again: `startTransition(async () => { const data = await fetchSomething(); startTransition(() => setData(data)); })`. The React docs flag this as a known limitation to be fixed later. Downstream agent: show the **nested** `startTransition` around the post-await setter; do **not** show a bare `setData(data)` after the await (that would teach the wrong shape).
- This is the **foundation Server Actions are built on**: every `<form action={...}>` submission and every `useActionState` dispatch is implicitly wrapped in a transition, which is why they expose a pending state. One sentence, recognition only — **Unit 6 owns Server Actions, `useActionState`, `useFormStatus`, `useOptimistic`.** Forward-ref so the student later recognizes the machinery, not so they learn it here.
- `isPending` UX patterns: dim the stale list, show an inline spinner, disable a submit button — all from the same boolean.

Code — short **`Code`** block of the async-transition shape, including the nested post-await `startTransition`. Keep the example abstract (`fetchSomething`) so it doesn't drift into Server Action territory the student hasn't met.

Watch-out inline: don't reach for async transitions as a data-fetching pattern in general — that's `use()`/Server Components/TanStack territory (lesson 7, chapter 011, Unit 4). This is about *priority* of an update that happens to be async, not about how to fetch.

Reasoning: this section both completes the `useTransition` surface and does the cheap forward-ref work that makes Unit 6 click later, without overreaching scope.

## Keeping the old UI on screen during a transition

The Suspense interaction — recognition depth only, but it's *why transitions feel good*, so it earns a short section.

Teach (conceptually, minimal code):
- When a transition's render reads a not-yet-ready resource (a `use()`d promise, a tripped Suspense boundary), React keeps the **previously committed UI visible** during the transition instead of replacing it with a Suspense fallback. The old content stays on screen, optionally dimmed via `isPending`, until the new content is ready — no jarring flash to a spinner.
- Contrast crisply: `<Suspense>` fallbacks are for the **first** load of a region (nothing to show yet); transitions keep **already-rendered** UI visible while it updates. Different moments. This contrast is the whole point of the section.
- One sentence of scope-fencing: `<Suspense>`, `use()`, and streaming are **lesson 7 and chapter 031** — here you only need to know that a transition *cooperates* with Suspense to avoid fallback flicker.

No diagram needed — the contrast is verbal and the student hasn't met Suspense mechanics yet; a diagram would overreach. A `:::note` Aside stating the first-load-vs-update distinction is enough.

`Term` tooltip: **Suspense boundary** (a wrapper that shows a fallback while the UI inside it is still loading — full mechanics in a later chapter) — since the student hasn't formally met it.

## Practice: making a type-ahead responsive

The hands-on spine of the lesson. **`ReactCoding`**, tests-graded, `live` on (instant feedback is the point — the student must *feel* the jank vanish).

Setup: provide a working-but-janky type-ahead. Starter exports `App` with:
- A controlled `<input>` bound to `query` via `useState`.
- A `<SlowList>` child that renders a large list filtered by `query` and contains a deliberate artificial slowdown (a busy loop over thousands of synthetic items, or rendering ~5,000 nodes) so the jank is real in-browser.
- Currently the input itself lags because the same `query` drives both.

Task: keep the input responsive by introducing a transition or a deferred value. Instructions tell the student to make the input update instantly while letting the list lag, using the hook that fits — guide toward the two-update split.

Grading (tests against rendered DOM + source, per `ReactCoding` assertion surface — write assertions whose *names* communicate the fix since error text is hidden):
- Assert the component uses a priority hook — detectable via behavior: type a burst of characters and assert the input's `value` reflects the **latest** keystroke synchronously while the list still shows the older/previous query for at least one render (the lag signature). If pure-DOM behavioral assertion is too flaky in the WASM runner, fall back to a source-based check that `useTransition` or `useDeferredValue` appears and that the input's value is **not** the deferred value.
- Assert the input remains a controlled input bound to the live `query` (catches the wrap-the-input mistake).

Provide a reference solution behind a `<details>` (per components index: use `<details>` for reveal-on-demand solutions). Show the `useDeferredValue` consumer-wrap as the canonical solution (fewest moving parts for a single value), and note in prose the `useTransition` alternative.

Reasoning: this is the single most load-bearing component in the lesson. The transformation from janky to smooth is the thing the student remembers; describing it can't substitute for feeling it. Guided (clear task + tests + reference) per the "guided over sandbox" guideline.

## When these earn their weight

The threshold section — closes the lesson by gating the tool, per "defaults before conditionals / trigger before tool."

Teach the three conditions that *together* justify reaching:
1. **Measurable jank** — the user actually notices (rule of thumb: a render blocking past ~50ms). If it's smooth, do nothing.
2. **Genuinely large work** — sorting/filtering thousands of items, a complex visualization. A 20-item list doesn't need this.
3. **The React Compiler hasn't already erased it** — the compiler memoizes pure computation, so the "expensive" render may already be cheap. Measure before wrapping. (One sentence; chapter 026 owns the compiler and the Profiler.)

State the default loudly: **no transition is the default.** Blanket-wrapping every update adds complexity and indirection for zero payoff and is a real anti-pattern. Reach when measurable jank exists, not preemptively.

What these are **not** (clarify the boundaries, inline as a short list — each corrects a real confusion):
- Not a **debounce** — debounce delays *when the work runs*; a transition runs the work immediately but at low priority. (Debounce/throttle hooks are chapter 026 lesson 1.)
- Not a way to make **slow code fast** — it reorders priority, full stop.
- Not a substitute for **`<Suspense>`** at route/region boundaries — Suspense is initial load; transitions are updates.
- Not relevant to **non-React work** — a slow `setTimeout` or a blocking network call isn't reordered by these.

Briefly: **standalone `startTransition`** imported directly from `react` does the same priority marking without giving you `isPending` — useful when you need to mark an update from module scope or a utility outside a component (where you can't call the hook). One or two sentences; show the import shape.

Reasoning: ending on the threshold prevents the "wrap everything" reflex the API otherwise invites, and the not-a-X list pre-empts the four most common conceptual collisions (debounce, perf magic, Suspense, non-React work).

## External resources (optional)

One or two `ExternalResource` cards: the React docs for `useTransition` and `useDeferredValue`. Keep minimal.

# Scope

**This lesson covers:** `useTransition`, `useDeferredValue`, standalone `startTransition`, the urgency-not-speed model, the wrap-the-setter vs. wrap-the-value cut, `isPending` for UX, async transitions (the shape only), the Suspense-keeps-old-UI interaction (recognition), and the reach threshold.

**Prerequisites to redefine concisely (do not re-teach):**
- Controlled inputs and `useState` — chapter 024 / earlier. One-line reminder at the call site only.
- The `Object.is` bailout / how React decides to re-render — chapter 023/024. Reference as the contrast (skip vs. reorder), don't re-explain.
- Derive-in-render — chapter 024 lesson 2. The filtered list is derived; assume it.
- `useMemo` / React Compiler memoization — name as the compounding-win mechanism, **do not teach**; chapter 026 lessons 2–3 own it.

**Explicitly out of scope (forward-ref by name, one sentence max, do not teach):**
- `use()` and unwrapping promises into Suspense — **lesson 7**.
- `<Suspense>` placement, fallback contract, and streaming SSR — **chapter 031**.
- `useOptimistic`, `useFormStatus`, `useActionState`, Server Actions — **Unit 6** (named as what builds on async transitions).
- Debounce / throttle custom hooks — **chapter 026 lesson 1**.
- The React Profiler and measuring jank in practice — **chapter 026 lesson 3** (named as how you'd confirm the threshold).
- `nuqs` / URL-state search inputs (the production application of these hooks) — **later unit** (named once as the production payoff).
- Manual `useMemo` / `React.memo` thresholds — **chapter 026 lesson 3**.

**Deliberate simplifications (flag for downstream agents):**
- The slow list in examples uses an artificial slowdown (busy loop / thousands of nodes) purely to make jank real in-browser — label it as a teaching device, not production code.
- Async-transition examples use an abstract `fetchSomething()` placeholder, never a real Server Action, to stay inside scope.
- Examples are client-only (`'use client'` may be shown but its mechanics are chapter 030); no error handling / Result type on the async sample — production shape is owned by later chapters.

# Code conventions notes

- Components as arrow `const`s; hooks at top level (chapter 025 already established the rules-of-hooks expectation, formalized in lesson 8). Single quotes, 2-space indent, semicolons.
- Per the Hooks/React Compiler convention: **no `useMemo`/`useCallback` by default** — when the deferred-value-feeds-memo example appears, frame `useMemo` as the explicit fallback the compiler usually makes unnecessary, consistent with how lesson 5 handled it. Don't present manual memo as the default reach.
- `useTransition` and `useDeferredValue` are explicitly endorsed by the conventions as "priority markers, not speed boosts" — the lesson's thesis line is already the house position; mirror that phrasing.
- Keep example code stripped of imports per pedagogical display rules unless an import is itself the point (the standalone `startTransition` import from `react` is the point — show it).
