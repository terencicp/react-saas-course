# Lesson outline — Chapter 025, Lesson 2

## Lesson title

- Title: `useEffect as synchronization`
- Sidebar label: `useEffect`

## Lesson framing

**The one idea.** An effect is not a lifecycle hook; it is a way to keep something *outside* React synchronized with current props and state.
Everything in this lesson radiates from that reframe: the cleanup-then-resync model, the four cleanup pairings, the race patterns, and the dependency array all fall out of "make the outside world match the current render."
Lesson 1 already installed effects as a **setup + optional cleanup** black box under Strict Mode and named three leak shapes (uncleared interval, unaborted fetch, unremoved listener) without coding them.
This lesson is where that black box opens: the student learns to *write* the setup, *write* the matching cleanup, and *read* the dependency array.

**The 2026 stance must lead.** The single biggest mistake a junior makes with `useEffect` in 2026 is reaching for it at all.
The senior framing — `useEffect` has been narrowed to a small escape hatch because Server Components, `use()`, Server Actions, and TanStack Query absorbed everything else — has to land in the introduction, before any syntax, so the student never builds the 2020-era "effect for everything" reflex.
But this lesson does **not** teach the full audit (that is lesson 4) or the replacements at depth (Unit 4 / Chapter 11).
Here the move is narrow: name the narrowing, name the residual cases, then teach the mechanics *for those residual cases*. The student leaves able to write a correct effect for the times one is genuinely warranted.

**Mental model to leave the student with.** "When does the outside world need to change, and what tears down what I made?"
Every effect the student writes should answer two questions: *what external system does this synchronize with* and *what does the cleanup do*. An effect whose cleanup is empty is a smell to interrogate.

**Cognitive-load sequencing.** Build the model in one concrete scenario and keep returning to it: a chat component that connects to a room. Connect on mount, disconnect on unmount, **reconnect when the room changes** — that last beat is what forces the cleanup-then-resync insight and it is the spine of the lesson.
Introduce the signature first (simplified: setup + deps), then the lifecycle as synchronization, then cleanup discipline, then the two race patterns, then the dependency-identity traps, then the two specialist variants (`useLayoutEffect`, `useSyncExternalStore`) as recognition-level threshold tools.
The non-reactive trap (reading a value at event-time without re-running) is *named and motivated* here but its fix (`useEffectEvent`) is explicitly deferred to lesson 3 — set up the pain, promise the relief.

**Tone.** Adult, terse, decision-first. This is a daily-driver hook with sharp edges; the student has shipped React state already (Chapter 024) and met purity, snapshots, and `key` resets (Chapter 023). Lean on that.

**Heaviest pedagogical levers.** (1) A `DiagramSequence` that animates the connect → roomId-changes → disconnect-old → connect-new lifecycle, because "cleanup runs before the next setup, not just on unmount" is the one timing fact every beginner gets wrong. (2) A `ReactCoding` exercise where the student adds the missing cleanup to a leaking subscription and watches the leak stop. (3) A `CodeVariants` before/after on the object-literal dependency infinite loop, because the identity trap is the most common real-world `useEffect` bug.

## Lesson sections

### Introduction (no header)

State the goal: learn the one hook React still gives you for talking to the world outside its own render — and learn it *after* learning when not to use it.
Open with the senior question as a concrete scene (do not label it "senior question"): you are building a chat feature. The component must open a WebSocket connection when it mounts, close it when it unmounts, and switch connections when the user picks a different room. No amount of `useState` or deriving-in-render does this — the connection is a live thing outside React. That is the job `useEffect` exists for.
Then immediately widen to the 2026 stance (2-4 sentences): in 2020 `useEffect` was the daily reach for fetching, syncing the URL, resetting forms, deriving values. In 2026 each of those moved to a better-shaped tool. What is left is the narrow set this lesson teaches: synchronizing with systems React does not own. Forward-ref lesson 4 ("you probably don't need an effect") as the full audit — one sentence, do not pre-teach it.
Preview the practical payoff: by the end you can write a correct connect/disconnect/reconnect effect, clean up four kinds of external resource, and avoid the infinite-loop and stale-data traps that make effects feel cursed.
Keep it warm and brief. Reuse the chat scenario throughout the lesson so the student is never re-orienting.

Use a `Term` tooltip on **synchronize** (define: making an external system's state match React's current props/state) and **escape hatch** (a deliberate exit from React's normal data flow, used sparingly).

### What useEffect is for in 2026

The trigger-before-tool section the pedagogy demands. Lead with the threshold the platform default crosses, not the API.
Present the residual surface as a short, concrete list — these are the *only* things `useEffect` is the right tool for in a 2026 SaaS app:
1. Non-React subscriptions: WebSocket / `EventSource` / `BroadcastChannel`.
2. Third-party widgets that take a DOM node: a chart (e.g. a charting lib), a map, Stripe Elements, a video player.
3. Browser APIs React does not model: `IntersectionObserver`, `ResizeObserver`, `matchMedia`, scroll/resize listeners.

Then the contrast list — what *moved away* from effects, one line each, each naming the replacement so the student starts wiring the reflex (do not teach the replacements, just name them and where they're taught):
- Initial data the page needs → Server Component or route loader (Unit 4).
- Cached/refetched server state → TanStack Query (Chapter 11) or `use()` (lesson 7).
- URL state → `nuqs` / `useSearchParams` (Chapter 024 lesson 3, already seen).
- Form submission state → Server Actions + `useActionState` (Unit 6).
- A value derivable from props/state → compute it in render (Chapter 024 lesson 2, already seen).
- Reset state when a prop changes → `key` reset (Chapter 023 lesson 5, already seen).

Pedagogical goal: the student should finish this section able to answer "should this be an effect?" with a default of *no*, and recognize the three shapes where the answer is *yes*. Anchor explicitly to what they already know (derive-in-render, `key` reset) so the narrowing feels like consolidation, not new rules.

**Diagram — the audit at a glance.** A small `Figure` wrapping a plain HTML+CSS two-column "moved away vs. stays" table-card (left: the six things that left effects + their new home; right: the three residual cases). Goal: a single glanceable mental sorting shelf. Keep it compact (well under 800px). This is a visual summary, not a decision tree — the full decision tree belongs to lesson 4, so do not build a `StateMachineWalker` here.

This is the right spot for a short reinforcement check. Add a `Buckets` exercise (`twoCol`), instructions "Sort each task into whether `useEffect` is the right tool in 2026." Buckets: "Reach for useEffect" / "Use something else". Items (phrase them as tasks, not as the prose's exact wording): "Keep a WebSocket open while a chat panel is mounted", "Show the sum of line items in a cart", "Load the dashboard's initial data", "Position a third-party chart into a div", "Reset an edit form when a different record is selected", "React to the viewport crossing a sentinel element", "Submit a form and show a pending state". Goal: force the active sort before any mechanics are taught.

### The signature, in its three forms

Now the API, kept deliberately simple at first: `useEffect(setup, dependencies?)`. Setup is a function; it optionally returns a cleanup function. Defer cleanup detail to the next section — introduce it here as "an optional function setup hands back."

Teach the three dependency-array forms with a tight `CodeVariants` (three tabs), because the *shape of the array* is the highest-leverage thing to get right and a side-by-side makes the contrast legible:
- Tab "Omitted — `useEffect(fn)`": runs after *every* render. First sentence of prose: "Almost always a bug." Show it, flag it, move on.
- Tab "Empty `[]` — `useEffect(fn, [])`": setup runs once on mount, cleanup on unmount. The "connect once, disconnect once" shape.
- Tab "With deps `[roomId]` — `useEffect(fn, [roomId])`": re-runs when any listed value changes by `Object.is`. The "reconnect when the room changes" shape.

Anchor `Object.is` explicitly to Chapter 023 lesson 1 / Chapter 024's bailout — the student already owns this comparison; reuse it, don't re-teach it (one `Term` or one clause).

Use a `CodeTooltips` block on the canonical chat effect skeleton to inline-define the moving parts without leaving the code: tooltip keys `useEffect` (setup + optional cleanup, runs after commit), `dependencies` (reactive values the effect reads; React re-syncs when one changes), and the returned arrow as the cleanup. Keep tooltips to one or two lines each.

State plainly here the type fact that prevents a common error: **setup must be synchronous and must not return a Promise.** `useEffect(async () => …)` is a type error because an async function returns a Promise, and React expects either nothing or a cleanup function. Show the fix shape (async work in an inner function) but keep the full async/race treatment for the race-conditions section — just plant the rule.

### The lifecycle is synchronization, not "mount and unmount"

The conceptual heart of the lesson. The misconception to dismantle, stated outright: beginners read `useEffect(fn, [])` as "componentDidMount" and the cleanup as "componentWillUnmount." That model is wrong and it produces the stale-connection bug.
The correct model: the effect's job is to make the outside world match the *current* props and state. When a dependency changes, React does **cleanup-then-setup** — it tears down the effect built from the old values, then builds it again from the new values. Cleanup is not "on unmount"; it is "before the next setup, *and* on unmount."

Drive it with the room-switch scenario. The canonical reproduction: `roomId` changes from `general` to `random` → React runs the cleanup (disconnect from `general`) → then the setup (connect to `random`). Without the cleanup, the old connection leaks and the user receives messages from both rooms.

**Primary diagram — `DiagramSequence`** animating the lifecycle. This is the lesson's most important visual; budget care here. Steps (each a compact panel — reuse a tiny "Component ⟷ Server (room)" two-box motif, do **not** wrap a `DiagramSequence` in `Figure`):
1. Mount with `roomId = "general"`: setup runs, connection to `general` opens. Caption: setup makes the outside world match the first render.
2. A render where `roomId` is unchanged: nothing happens — deps equal by `Object.is`, effect is skipped. Caption: equal deps → no resync. (Teaches that re-renders alone don't re-run effects.)
3. `roomId` changes to `"random"` — *cleanup fires first*: disconnect from `general`. Caption: the old setup is torn down before the new one is built.
4. Setup runs again: connect to `random`. Caption: the outside world now matches the current render.
5. Unmount: cleanup runs one final time, disconnect from `random`. Caption: the same cleanup that runs between syncs also runs on unmount.
Pedagogical goal: make "cleanup runs *between* syncs, not only at the end" a visual, sticky fact. The Strict Mode double-mount from lesson 1 is the dev-time version of exactly this cycle — call that connection out in one sentence so the two lessons reinforce each other.

Pair the diagram with the code: an `AnnotatedCode` walkthrough of the full chat-room effect (connect, `onMessage` handler attach, return cleanup). Steps highlight (color-coded): the `roomId` dependency (blue — "this is what triggers resync"), the connection setup (green — "the external thing we made"), the returned cleanup (red — "tears down exactly what setup made"). Keep each step ≤6 lines of prose, ≤18 lines of code. This is the canonical shape the student will pattern-match against for the rest of the chapter.

Add a `Sequence` ordering exercise to cement the timing: instructions "A chat component's `roomId` changes from `general` to `random`. Order what React does." Steps in source (correct) order: "React commits the new render with `roomId = random`", "The old effect's cleanup runs — disconnect from `general`", "The new setup runs — connect to `random`", "Messages now arrive only from `random`". Goal: force the student to place cleanup *before* the new setup.

### The dependency array is a contract, not a tuning knob

The rule, stated as a contract: **every reactive value the setup reads belongs in the dependency array.** A reactive value is anything that can change between renders — props, state, and values computed from them. React uses the array to know when the outside world has drifted from the current render and must be re-synced.

Frame the lint rule as an ally, not an obstacle: `react-hooks/exhaustive-deps` (ships in `eslint-config-next`, on by default at `warn` level — anchor to Chapter 024's "two rules, never disabled" mention) reads your setup and flags any reactive value you forgot. The senior reflex when it flags a missing dep is **add it**, not silence it. (Accuracy note for the writer: it surfaces as a lint *warning*, not a build error, and the React Compiler does **not** turn it off — verified current; don't claim it fails the build.) Lying to the dependency array — omitting a value the effect reads — produces stale closures: the effect keeps using the value from the render where it last ran.

Name the two legitimate-looking escapes and rule on them briefly:
- "But adding it makes my effect re-run too often / reconnect on every keystroke." That is the **non-reactive trap** — the effect reads a value at event-time that shouldn't drive resync. The fix is not `eslint-disable`; it is `useEffectEvent`, which carves out a non-reactive seam. Motivate the pain concretely (the chat's `onMessage(msg, currentUser)` — you don't want to drop the connection just because the user's name changed) and forward-ref lesson 3 explicitly. Do **not** teach `useEffectEvent` here — name it, promise it, move on.
- Stable values you can omit: `useState`/`useReducer` setters (React guarantees stable identity — anchor Chapter 024 lesson 1) and refs (`ref.current`). The lint already knows these; it won't ask for them.

Pedagogical goal: the student should treat `exhaustive-deps` as a correctness oracle and understand that the rule is almost never the thing to disable. Plant the `useEffectEvent` hook precisely so lesson 3 has a running start.

Use an `Aside type="caution"` titled around the stale-closure idea: "An effect that lies about its dependencies doesn't error — it silently uses stale values." Keep it short.

### Four cleanups for four kinds of resource

The actionable discipline. Frame: every effect that *creates* something outside React returns a cleanup that *destroys exactly that thing*. The cleanup mirrors the setup — same object, undone.
Teach the four canonical pairings as a tight reference. A `CodeVariants` with four tabs is the right vehicle (each tab = one pairing, setup line + cleanup line, one-sentence prose). Use `ins=`/`del=` framing where it sharpens the mirror:
- Tab "Listener": `addEventListener('resize', onResize)` ↔ `removeEventListener('resize', onResize)`. Note the *same function reference* must be passed to both — an inline arrow in each breaks removal.
- Tab "Timer": `setInterval(tick, 1000)` / `setTimeout(...)` ↔ `clearInterval(id)` / `clearTimeout(id)`. The leak shape from lesson 1 — now coded.
- Tab "Subscription": `const unsub = store.subscribe(cb)` ↔ `unsub()` (return the unsubscribe the API handed you).
- Tab "Resource": `const chart = createChart(node)` ↔ `chart.destroy()` (third-party instance: chart, map, Stripe Elements).

Then the code-review heuristic, stated as a senior habit: read any effect and ask "what does the cleanup tear down?" If the cleanup is empty and nothing external was created, the effect is probably one of lesson 4's anti-patterns wearing a costume — flag it. This is the through-line the chapter cashes in.

**Exercise — fix the leak (`ReactCoding`, tests-graded).** The highest-value practice beat in the lesson; the student must *write* a cleanup, not recognize one.
Starter: an `App` with a counter and a child that subscribes to a `resize` (or a fake interval) in `useEffect(fn, [])` but returns no cleanup. Mount/unmount the child via a toggle button so the leak is exercisable. Instructions: "This effect subscribes but never cleans up. Return a cleanup that removes the listener so toggling the panel doesn't stack handlers."
Grading tests assert: the effect returns a function; after toggling off, the listener count / interval is zero (probe via a module-level counter the starter exposes, e.g. a fake `subscribe` that increments on subscribe and decrements on unsubscribe — assert it nets to 0 after unmount). Phrase the failing-test name to communicate the problem ("listener still attached after unmount") since diagnostic text is hidden from the student. Keep the starter ≤ ~25 lines.

### Two race patterns for async inside an effect

Scope this tightly: most fetching is *not* an effect's job in 2026 (re-state, one sentence). But the residual cases exist — an SDK call that takes a `signal`, a non-cacheable POST, a browser API returning a promise — and they have a race condition the student must know how to kill. Motivate with the room scenario: the user switches rooms fast; an old request resolves *after* the new one and overwrites the UI with stale data.

Teach exactly two patterns, both via the cleanup:
1. **Abort on resync** — when the async call accepts an `AbortSignal` (anchor explicitly to Chapter 007 lesson 4 `AbortController` — the student already owns this; reuse, don't re-teach):
   `const ctrl = new AbortController(); fetchThing(url, { signal: ctrl.signal }).then(setData); return () => ctrl.abort();`
   Cleanup aborts the in-flight request before the next setup fires.
2. **The `ignore` flag** — for async work that can't be aborted:
   `let ignore = false; doWork().then(r => { if (!ignore) setResult(r); }); return () => { ignore = true; };`
   The resolved callback checks the flag and no-ops if the effect has since been cleaned up.

Use `CodeVariants` (two tabs, "Abortable" / "Not abortable") so the student sees both shapes side by side and learns the selection rule: prefer abort when the API supports `signal`; fall back to the flag otherwise. Tie back to the async-returns-Promise rule from the signature section — the async lives in an *inner* function; setup itself stays synchronous and returns the cleanup.

Pedagogical goal: the student can write the abort/ignore cleanup from memory and knows it's the *same* cleanup-on-resync mechanism, just applied to async. Reinforce that Strict Mode (lesson 1) is what surfaces a missing abort in dev (two requests in flight).

### When dependencies are objects, arrays, and functions

The single most common real-world `useEffect` bug, and it deserves its own section because the fix is non-obvious. The trap: a dependency that changes *reference* every render even when its *contents* are identical, because `Object.is` compares identity. The effect re-runs every render; if it calls `setState`, it loops forever.

**Object/array literals.** `useEffect(() => …, [{ id: 1 }])` — the literal is a new object each render, never `Object.is`-equal to the last. Walk the failure with a `CodeVariants` before/after (`del=`/`ins=`):
- "Broken" tab: effect depends on an object prop `options = { id }` constructed inline by the parent; the effect calls `setState`; show the infinite loop. First sentence: "New object every render → effect every render → loop."
- "Fixed" tab: depend on the **primitive** (`options.id`), not the object. Loop stops.
State the fix ladder in order of preference: (1) depend on the primitive fields you actually read; (2) move the object construction so it isn't recreated each render (or memoize upstream — note the React Compiler usually handles this, anchor Chapter 024's compiler mentions, defer depth to Chapter 026); (3) restructure so the parent passes primitives.

**Function dependencies.** A function defined inside the component body is a new reference every render — same trap. The fix ladder, ordered:
1. Move the function *inside* the effect (if only the effect uses it) — then it isn't a dependency at all.
2. Move it *outside the component* (if it captures no reactive values) — module-scope functions are stable.
3. `useCallback` only when the function must be passed to a memoized child — explicitly defer the threshold to Chapter 026 lesson 3; do not teach `useCallback` mechanics here, just name it as the narrow tool.
4. `useEffectEvent` when it's an event-shaped read of latest values — forward-ref lesson 3.

**Exercise — diagnose the loop (`PredictOutput` or `MultipleChoice`).** Prefer a `MultipleChoice`: show a small effect with an object-literal dependency that loops, and ask which fix is correct (options: add `eslint-disable`; wrap in `useState`; depend on `item.id` instead of `item`; remove the dependency array). Correct: depend on the primitive. `McqWhy` explains the identity comparison. Author the distractors so they're plausible (the `eslint-disable` option is the tempting wrong answer). Make the options *not* verbatim from prose so it's reasoning, not matching.

Pedagogical goal: the student can recognize "re-runs every render / infinite loop" as an identity problem on sight and reach for the primitive-dependency fix first.

### useLayoutEffect and useSyncExternalStore: the two specialist variants

Threshold tools, recognition-depth. Keep this section short — the student should know they exist, what crossed the threshold, and that `useEffect` is the default they almost always want.

**`useLayoutEffect`** — the synchronous sibling. Runs after React commits the DOM but *before the browser paints*, so a state update inside it is applied without a visible flicker. The threshold, stated as a single trigger: reach for it **only when a user-visible flicker is the problem** — the canonical case is measuring a DOM node (a tooltip's width) and synchronously repositioning before paint. Otherwise `useEffect` (which runs after paint) is correct and cheaper. One `Term`-style note that it blocks paint, so overuse hurts performance. Mention `useInsertionEffect` in a single clause as CSS-in-JS-library territory the student won't write — recognition only.

**`useSyncExternalStore`** — the correct primitive for reading a value that lives *outside* React (a `window` event, a third-party store, a `BroadcastChannel`) in a way that's safe under concurrent rendering (it prevents *tearing* — a `Term` tooltip: different parts of one render seeing different values of the same external source). The threshold: daily app code rarely calls it directly; the libraries the student already uses (a store like Zustand, `useSearchParams`) call it internally. Recognition only — the student should know the name so when they see it in a library's source it isn't mysterious, and know that *if* they ever hand-integrate an external store, this — not `useEffect` + `useState` — is the right tool.

Pedagogical goal: round out the effect family without inflating it. Make crystal clear these are exceptions; `useEffect` is the default. No exercise here — a `TabbedContent` with two panels ("Need to avoid a paint flicker?" → `useLayoutEffect`; "Reading an external store safely?" → `useSyncExternalStore`) is enough to make the two triggers glanceable.

### Effects and the server boundary

Short, important closer that forward-links the unit. State the boundary fact: **effects only run in Client Components.** They do not run during server rendering and never run in a Server Component. So when a component "needs an effect," the senior's first question is whether it should be a Client Component at all — could this be a Server Component that reads the data directly? Anchor to the upcoming Server/Client boundary chapter (Chapter 030) as where this is taught in full; one sentence, recognition only.
Tie the bow: an effect that doesn't run on the server means anything that must be correct on the first paint cannot live in an effect — that's what `use()` (lesson 7) and Server Components are for. This reinforces the lesson-opening narrowing from the other end.

Pedagogical goal: leave the student with the reflex that "I need an effect" should trigger "or should this not be a client component?" — the senior mindset the course foregrounds.

### Wrap-up / external resources (optional)

One or two `ExternalResource` cards: the official `useEffect` reference and the "Synchronizing with Effects" + "You Might Not Need an Effect" pages on react.dev (the latter teed up for lesson 4). Optionally an `Aside type="note"` recapping the two-question code-review heuristic (what external system / what does cleanup do) as the single takeaway to remember.

### Term tooltips (collect across the lesson)

- **synchronize** — make an external system's state match React's current props/state.
- **escape hatch** — a deliberate exit from React's normal data flow, used sparingly.
- **reactive value** — a prop, state, or anything derived from them; can change between renders.
- **stale closure** — a function capturing values from an earlier render, used after they've changed (anchor Chapter 002 lesson 7 closures).
- **cleanup** — the function setup returns; tears down exactly what setup created (carried over from lesson 1).
- **tearing** — different parts of a single render observing different values of the same external source (only at `useSyncExternalStore`).
- `Object.is` — referential/value equality React uses for deps (anchor, don't re-teach).

## Scope

**Prerequisites to assume (redefine in one clause each, do not re-teach):**
- Render is a pure function of props/state; re-renders re-run the function (Chapter 023 lessons 1, 3).
- State is a snapshot; `Object.is` bailout; immutable updates; setter stability (Chapter 023 lesson 4, Chapter 024 lesson 1).
- Derive-in-render over mirror-into-state; `key` reset (Chapter 024 lesson 2, Chapter 023 lesson 5).
- Closures capture by reference; the stale-closure trap (Chapter 002 lesson 7).
- `AbortController` / `AbortSignal` and the `{ signal }` shape (Chapter 007 lesson 4).
- Strict Mode double-invokes the effect lifecycle in dev; effects = setup + optional cleanup (Chapter 025 lesson 1).
- Effects must not derive/mirror state — the "reading state to set state is a smell" point is named here but the full anti-pattern catalog is lesson 4.

**Explicitly out of scope (defer, do not teach):**
- `useEffectEvent` and the reactive/non-reactive seam — **lesson 3**. Name the non-reactive trap and forward-ref only.
- The five-quadrant "you might not need an effect" audit and the full anti-pattern catalog — **lesson 4**. This lesson names the narrowing and gives the three residual cases; it does not enumerate every anti-pattern or teach the replacements.
- `useContext` — lesson 5.
- `useTransition` / `useDeferredValue` — lesson 6.
- `use()` and Suspense — lesson 7. Reference only as "what replaced effect-fetching on first paint."
- Rules of hooks mechanics and the indexed-slot model — lesson 8. (`exhaustive-deps` is used here as a correctness ally; its enforcement model is lesson 8.)
- `useCallback` / `useMemo` / `React.memo` thresholds and the React Compiler — Chapter 026. Name `useCallback` as the narrow fix in the function-dependency ladder; do not teach its mechanics.
- Custom hooks (`use*`, `usePrevious`) — Chapter 026 lesson 1.
- TanStack Query — Chapter 11. Server Components / `'use client'` boundary mechanics — Chapter 030. Server Actions / `useActionState` — Unit 6. Each named only as "where this moved."
- Data-fetching *patterns* at depth — this lesson teaches abort/ignore as race fixes for residual async-in-effect, not a fetching strategy.

## Code conventions notes

- Align with `Code conventions.md` "Hooks and the React Compiler": `useEffect` is for synchronization with external systems only; do not show `useMemo`/`useCallback` as defaults (the Compiler handles memoization) — when `useCallback` is named in the function-dependency ladder, frame it as the narrow exception with a one-line reason, per convention.
- The two ESLint rules are required and never disabled — present `exhaustive-deps` as an ally and show the *correct* fix (add the dep / use the right seam), never an `eslint-disable`. If any sample must show the disable-as-anti-pattern, mark it clearly as the wrong path (e.g. `del=`).
- Code samples: `'use client'` is implied (all hooks run in Client Components) — a brief note suffices; don't ceremonially repeat the directive on every snippet, but show it once on a full-file sample so the boundary is concrete.
- Deliberate divergence to flag for downstream agents: the async-in-effect fetch samples (abort/ignore) are taught as race-fix mechanics for *residual* cases, knowingly against the "don't fetch in effects" default — keep the framing explicit so the sample isn't read as an endorsement of effect-fetching.
- Use `const` arrow handlers, immutable state updates, and the project's named-import style in all samples (anchor Chapter 002 / Chapter 003 conventions already taught).
