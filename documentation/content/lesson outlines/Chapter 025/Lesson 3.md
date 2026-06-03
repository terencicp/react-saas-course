# Lesson title

- Title: `useEffectEvent and the non-reactive seam`
- Sidebar label: `useEffectEvent`

# Lesson framing

This lesson cashes the debt lesson 2 deliberately created. Lesson 2 set up the **non-reactive trap** as a named pain — promised relief, didn't deliver — using the chat-room-by-`roomId` running example, and installed the vocabulary this lesson stands on: *escape hatch*, *synchronize*, *reactive value*, *stale closure*, the exhaustive-deps-as-correctness-oracle rule, and the function-dep fix ladder that ends in `useEffectEvent`. This lesson is the bottom rung of that ladder.

**The single mental model the student must leave with:** an effect's dependency array is a list of *reactive* values — things whose change should *cause the effect to resynchronize*. Some values an effect reads at run time are **not** reactive: they should be read at *latest* but their change should **not** tear down and rebuild the synchronization. `useEffectEvent` carves out that non-reactive seam — a callback that always reads the freshest props/state but is invisible to the dependency array. The bright line is the whole lesson: *does a change to this value mean "re-sync"? then it's reactive (deps). Does it mean "just use the newest value next time the effect does its thing"? then it's an Effect Event.*

**Why this matters in production (the senior stakes):** the alternative isn't "slightly worse code," it's a class of real bugs. Put a non-reactive value (a parent's `onMessage` callback, the `currentUser`) into deps and the chat socket disconnects and reconnects on every keystroke the parent re-renders through — dropped messages, reconnect storms, flicker. Leave it out and lint screams (correctly, because the closure goes stale). Before React 19.2 seniors escaped this with two hacks — a `useRef` mirror updated in an effect, or wrapping every callback in `useCallback` — both of which the lesson shows and retires. `useEffectEvent` is the platform answer that makes the hacks obsolete.

**The crucial guardrail, verified against current React docs (correcting the chapter outline):** the official rule is *strict* — an Effect Event can be called **only** from inside an Effect or another Effect Event, never from render, never from a regular event handler. The chapter outline's softer "tolerated from a handler but pointless" framing is the wrong emphasis; teach the hard rule. The reason chains back to the purity contract (chapter 023 lesson 3) and forward to the React Compiler (chapter 026 lesson 2): calling it in render reads mutable latest state during render, which is exactly the impurity the model forbids. The instability of the returned function is **intentional** — it's a runtime assertion: if you wrongly depend on its identity, the effect re-runs every render and the bug becomes loud.

**Sequencing within the lesson.** Open on the unfinished chat-room cliffhanger from lesson 2 (the student already feels this pain — don't re-motivate from scratch, *resume*). Land the reactive/non-reactive distinction as the conceptual core before any new syntax. Introduce `useEffectEvent` as the named seam. Then the three canonical reaches, the rules (with the strict call-site rule as the centerpiece), the two retired hacks (ref / `useCallback`) framed as "what this replaces," and finally the abuse-mode guardrail tied back to the lesson-4 forward-ref (audit whether you need the effect at all first). End with a recall check and external resources.

**Cognitive-load management.** This is a *narrow, deep* lesson — one hook, one idea. Resist breadth. The risk is over-explaining the runtime; keep the "why unstable identity" and "why call-site restricted" explanations tight and anchored in already-known concepts (closures by reference, purity, the deps contract) rather than re-derived. Lead with the simplest framing (a callback that reads latest values, excluded from deps), add the restrictions as guardrails *after* the student has the happy path, not before.

**Status accuracy (fact-checked).** `useEffectEvent` ships **unprefixed in React 19.2** (released 2025-10-01) — imported directly from `'react'` with **no `experimental_` prefix** (the react.dev reference page dropped the prefix; the 19.2 release post features and documents it). Available in Next.js 16. `eslint-plugin-react-hooks` (7.x, the version that ships with the course's Next.js config) understands it: it excludes Effect Events from dependency arrays and flags calls outside allowed contexts. The chapter outline's internal "React chapter 087" token = React 19.2; the lesson must say **React 19.2**, never an invented version. State the status plainly ("available from React 19.2, imported from `react`") rather than quoting "stable" as a release-note phrase — the win condition is that the student doesn't reach for the old `experimental_` import.

# Lesson sections

## Resuming the chat room: the dependency that shouldn't be there

Pick up exactly where lesson 2 left off. Restate the scenario in two sentences (assume the student remembers): a chat component connects to a room over a WebSocket, keyed by `roomId`; cleanup disconnects, a `roomId` change re-syncs (disconnect old, connect new) — that's correct and reactive. Now extend it: on every incoming message the effect should call `onMessage(message, currentUser)`, where `onMessage` is a prop from the parent and `currentUser` comes from context/state.

Show the naive effect with the lint-honest dependency array — `[roomId, onMessage, currentUser]` — using `Code` (single block, no need for multi-part focus yet). Then state the conflict plainly: the deps array is an exact contract (lesson 2's rule), so `onMessage` and `currentUser` *belong* there by the exhaustive-deps oracle — but putting them there is **wrong behavior**: every time the parent re-renders (new `onMessage` identity) or the user object changes, the effect cleans up and re-sets-up, i.e. the socket disconnects and reconnects. Changing who you are shouldn't drop your chat connection.

Visualize the damage with a small **`DiagramSequence`** (it provides its own card — do not wrap in `Figure`). Pedagogical goal: make the reconnect-storm *visceral* so the student feels why "just add it to deps" is unacceptable here, before any solution. Steps, each a simple HTML strip showing socket state + a re-render trigger:
1. Mount with `roomId="general"` → socket connects (green "connected" pill).
2. User types in an unrelated input → parent re-renders → `onMessage` gets a fresh identity → deps changed → cleanup fires (red "disconnect") → setup fires (amber "reconnecting") → connected again. Caption: "One keystroke in the parent tore down a healthy connection."
3. `currentUser` updates (e.g., avatar loads) → same teardown/rebuild. Caption: "A profile field changing dropped the socket too."
4. Contrast frame: `roomId` changes from `general` to `random` → teardown/rebuild — and *this* one is correct: a real resync. Caption: "Only this last reconnect was the one we wanted."

Close the section by naming the tension as the bridge: two of those three values must be *read at latest* inside the effect but must *not* be in the deps. That's the non-reactive seam. Name it; the next section defines it precisely.

Terms for `Term` tooltips in this section: none new — `reactive value`, `synchronize`, `stale closure` were defined in lesson 2; reuse the words in prose without re-tooltipping (avoid tooltip noise). Optionally one `Term` on **WebSocket** if lesson 2 didn't tooltip it (brief: "a persistent two-way connection between browser and server; stays open so the server can push messages").

## Reactive vs. non-reactive: what the dependency array is actually a list of

This is the conceptual core — teach it *before* `useEffectEvent` syntax so the hook lands as the answer to a question the student already holds.

State the reframe sharply: the dependency array is not "every variable the effect touches" — it's **the list of reactive values**, where a value is reactive if *a change to it should cause the effect to re-synchronize*. Reads that don't meet that bar are non-reactive even though the effect reads them.

Apply the test to the three values, one at a time, as plain prose reasoning (not a component yet):
- `roomId` — **reactive**. A new room means: disconnect this room, connect that room. The change *is* the resync. Deps.
- `currentUser` — **non-reactive** in this scenario. The effect needs the *latest* user when a message arrives (to attribute it), but the user changing is not a reason to reconnect the socket. Read latest, don't resync.
- `onMessage` — **non-reactive**. It's a fresh function the parent hands down each render; the *connection* shouldn't care that the parent re-rendered. Read latest, don't resync.

Make the abstraction concrete and durable with a one-shot classification exercise — **`Buckets`** (`twoCol`), sorting values an effect might read into "Reactive (goes in deps)" vs "Non-reactive (read latest, stays out)". Pedagogical goal: force the student to *apply* the bright line rather than recognize the chat example. Use varied scenarios so it isn't pattern-matching the prose:
- Reactive bucket: the `roomId` a socket connects to; the `url` an effect fetches; the `theme` an effect applies to a third-party chart; the `serverUrl` of a subscription.
- Non-reactive bucket: a `currentUser` logged with each event; an analytics `onEvent` callback from props; the current `filters` read inside a polling tick; a `onComplete` prop called when an animation finishes.

Bucket descriptions encode the test: "Reactive — its change should re-run the effect" / "Non-reactive — read its latest value, but don't re-sync."

End by stating the unmet need precisely: we need a way to read `currentUser`/`onMessage` at their latest *inside* the effect, while telling React (and lint) "these are not reactive — keep them out of deps." That capability has a name.

## useEffectEvent: a callback that reads latest and stays out of deps

Introduce the hook as the seam, minimally first. Signature and the happy-path mental model only — restrictions come in the next section so the simple shape lands clean.

Show the fix to the chat room with **`CodeVariants`** (the established don't/do pattern from chapter 024), orange "before" / green "after" via `data-mark-color`:
- Variant "Everything in deps (reconnect storm)": the naive effect with `[roomId, onMessage, currentUser]`, the three deps highlighted. One-paragraph framing: re-states the teardown-on-every-parent-render bug.
- Variant "Effect Event (the seam)": `onReceiveMessage = useEffectEvent((message) => { onMessage(message, currentUser); })`, the effect calls `onReceiveMessage(message)` and deps shrink to `[roomId]`. Framing: the non-reactive reads now live in the Effect Event, which always sees the latest `onMessage`/`currentUser`; the effect re-syncs only when `roomId` changes.

Then walk the after-version in detail with **`AnnotatedCode`** (single block, multiple focus points — this is exactly its use case). Steps:
1. Highlight the `useEffectEvent(...)` call and the values it reads (`onMessage`, `currentUser`) — color blue. Prose: this returns a function that, every time it's *called*, reads the current `onMessage` and `currentUser` — never a stale snapshot.
2. Highlight the effect's deps `[roomId]` — color green. Prose: `onMessage` and `currentUser` are deliberately absent and lint is *fine with it* — the rule understands Effect Events and excludes them. Only the genuinely reactive `roomId` remains.
3. Highlight the call site `onReceiveMessage(message)` inside the socket's message handler — color blue. Prose: the effect calls the Event when a message arrives; the connection lifecycle and the message-handling logic are now cleanly separated by reactivity.

State the contract in one line as a tip/aside: *an Effect Event reads the freshest props and state every time it runs, but it is not a reactive dependency — it never appears in a dependency array.*

`Term` tooltip: **Effect Event** ("a non-reactive callback created by `useEffectEvent`; reads the latest props/state when called, but is excluded from effect dependency arrays").

`CodeTooltips` candidate (optional, light touch): on the `useEffectEvent` line, a tooltip on `onReceiveMessage` noting its inferred type is `(message: Message) => void` and that its identity intentionally changes each render — but only if it doesn't overload the AnnotatedimplCode; prefer to fold this into the annotation prose to avoid stacking two code-overlay components on the same block.

## The three places you'll actually reach for it

Generalize past the chat example so the student recognizes the shape in their own code. Keep each tight — one short `Code` block each, prose-led. These are the *canonical reaches* (from the chapter outline), reframed around the reactive/non-reactive test:

1. **Event-shaped callbacks from props.** A third-party widget effect (a chart's `onPointClick`, a map's `onMove`) wraps the parent's handler in an Effect Event so a new handler identity each render doesn't re-instantiate the widget. The trigger (mount/`config` change) is reactive; the *handler* is not.
2. **Logging/analytics fired from inside an effect.** The effect runs on a reactive change (e.g., a page/route becomes visible), but the *values logged* — `currentUser`, `currentRoute`, a `referrer` — should be latest-at-fire, not deps. Classic: `useEffect(() => { logVisit(); }, [url])` where `logVisit` is an Effect Event reading `url` *and* `currentUser`, so `url` stays the lone reactive dep and a `currentUser` change doesn't re-log.
3. **Reading mutable state inside an interval/subscription.** A poll set up once on mount (`setInterval`) whose tick must read the *latest* `filters`/`pageSize`. Without the seam, putting `filters` in deps tears down and recreates the interval on every filter change (resetting the timer); with an Effect Event (`onTick` reading latest `filters`), the interval is created once and always polls with current filters.

For reach #3, this is the strongest live-practice candidate — see exercise below in this section. Use **`ReactCoding`** (tests-graded). Setup: a starter that polls a counter/endpoint on an interval and reads a `multiplier` (or `step`) from state; the naive version lists `multiplier` in the interval effect's deps, so changing the multiplier *restarts* the timer (observable: the tick resets). Task: move the latest-value read into an Effect Event so the interval is created once (`[]` deps) yet each tick uses the current multiplier. Grading via `tests`: assert the effect's dep array is empty / the interval isn't recreated (testable by asserting a single interval-setup side effect, or by exposing a render/setup counter the test reads from the DOM), and assert that after changing the multiplier the displayed tick value reflects the new multiplier without a timer reset. Provide a reference solution in a `<details>` block per the established pattern. If reliably asserting "interval created once" in the jsdom-free iframe runner proves too brittle, fall back to a target-match or a `MultipleChoice` on "which version restarts the timer" — but attempt the tests-graded version first because *doing* the seam is far more durable than recognizing it.

`Term` tooltip (optional): **polling** if not previously defined ("repeatedly fetching/checking on a timer, e.g. via `setInterval`, to keep data fresh without a push channel").

## The rules that keep it safe

Now that the happy path is owned, install the guardrails. Lead with the call-site rule because it's the one students violate and the one the chapter outline got soft on — teach the **strict** version verified against current React docs.

Present the rules as a short, scannable set (a `Steps`-style or plain list with bolded leads), each with a one-line *why* anchored in known concepts:

- **Call it only from inside an Effect or another Effect Event. Never from render, never from a regular event handler.** This is the hard rule. Why-from-render: reading the latest mutable state *during* render is exactly the impurity the render model (chapter 023 lesson 3) forbids and the React Compiler (chapter 026 lesson 2) will reject — the render must be a pure function of its snapshot. Why-not-from-a-handler: ordinary event handlers already close over the latest props/state by virtue of running on a fresh render, so they don't need the seam — and the lint flags the call as a misuse. Show the canonical wrong/right with a tiny **`CodeVariants`** (red: `onSomething()` called from `handleClick`; green: `onSomething()` called from inside `useEffect`), mirroring the official docs example.
- **Never pass it as a prop or return it up out of a hook.** Its identity is intentionally unstable, so anything downstream that depends on that identity (a memoized child, a dep array two levels up) breaks loudly. If a child needs the behavior, the child wraps its *own* Effect Event. Nuance worth stating (this is the one place the naive "never in a hook" rule needs softening, verified against docs): you *may* create an Effect Event *inside* a custom hook and call it within that hook's own effect — what you must not do is hand the Effect Event itself back to callers. Keep this to one clarifying sentence; full custom-hook treatment is chapter 026 lesson 1.
- **It's excluded from dependency arrays — by design, and lint knows.** The student already saw this; restate it as a rule and note the lint behavior explicitly (the rule ignores Effect Events in deps and will flag a call outside allowed contexts).
- **Keep the body event-shaped.** Read latest values and perform an action. Don't declare hooks inside it, don't compute values meant to drive re-renders. It's an event handler that happens to live next to an effect, not a place to hide reactive logic.

Then explain the deliberately-unstable identity as its own short beat, because it's the non-obvious bit and it pays off the "why these rules" question. Frame it as a *feature*: unlike a `useState` setter or a ref (stable identities the deps array can safely omit), an Effect Event's identity changes every render *on purpose*. That instability is a runtime assertion — if you wrongly wire its identity into a dependency, the effect re-runs every single render and the mistake is immediately visible instead of silently masked. Tie back to lesson 2's "stable values you may omit from deps" (setters, refs): the Effect Event is omitted for a *different* reason — not because it's stable, but because it's explicitly non-reactive.

`Term` tooltips here: none strictly needed; optionally **purity / pure function** re-cap as a one-line `Term` if the prose leans on it, but lesson 2/chapter 023 already own it — prefer a back-reference in prose.

## What this replaces: the ref mirror and the useCallback wrap

Short historical-context section, but kept on the "what a senior used to do, and why it's gone" framing the course favors (trigger-before-tool, no historical detours for their own sake — this earns its place because students *will* see both patterns in existing codebases and AI output). Two retired hacks, each a brief `Code` block + one paragraph:

- **The ref mirror.** Stash the latest callback/value in a ref, update `ref.current` in an effect, then read `ref.current()` inside the other effect. Show it. Explain it *works* but has timing gaps (the ref updates after commit, so an effect reading it can be one beat behind) and — critically — no lint enforcement, so nothing tells you when you've gotten it wrong. `useEffectEvent` is this exact pattern blessed with first-class support and correct timing.
- **The `useCallback` wrap.** Wrap every callback in `useCallback` to stabilize its identity so it can sit in deps without re-firing. Show it. Explain the flaw: `useCallback` produces a *stable* function whose body still closes over the render it was created in — so if its own deps are wrong, you're back to a stale closure; and a *legitimate* change to its deps still re-runs the effect (a reconnect you didn't want). The difference, stated as the crisp contrast: **`useCallback` gives a stable function over a fixed snapshot; `useEffectEvent` gives an unstable function over the latest values.** The trade for `useEffectEvent` is the restricted call site — and that restriction is the price of always-fresh reads.

Optionally a tiny **`TabbedContent`** (provides its own card) with three tabs — "Ref mirror", "useCallback", "useEffectEvent" — each a short snippet of the same chat fix, captioned with its failure mode / blessing. This makes the "same goal, three eras" comparison glanceable. Only build it if it reads cleaner than three sequential blocks; otherwise sequential `Code` blocks are fine.

Reinforce with a **`MultipleChoice`** (single-correct) contrasting `useEffectEvent` and `useCallback`: a scenario where a parent passes a fresh `onMessage` every render and the socket must not reconnect — ask which tool fits and why. Make distractors plausible (the `useCallback` option should be tempting — "stabilize the callback so it's safe in deps"), and write the `McqWhy` to explain that `useCallback` stabilizes identity but still re-runs the effect on a *real* dep change and still risks a stale body, whereas the Effect Event is the non-reactive seam. Do not let any choice be a verbatim line from the prose.

## Reach for the seam last, not first

Close on the guardrail the chapter outline flags as the abuse mode, tied to the lesson-4 forward-ref. The reflex this lesson must *not* install is "wrap everything in `useEffectEvent` so I never have to think about dependencies." That converts genuinely reactive logic into non-reactive logic and silently breaks synchronization — the socket that *should* reconnect on `roomId` no longer does because you buried `roomId` in an Event too.

State the discipline as an ordered reflex:
1. **First ask whether you need the effect at all.** Forward-ref lesson 4 ("you probably don't need an effect") explicitly — most "I need to read latest state in an effect" instincts dissolve when the effect turns out to be a derived value, an event handler, or a Server Component read. This hook is for the *residual* cases where an effect is genuinely warranted.
2. **Then ask, value by value, which reads are reactive.** Only the non-reactive reads move into an Effect Event. The reactive ones stay in deps where they belong. `useEffectEvent` is a scalpel for specific non-reactive reads, not a blanket exemption from the deps contract.

End with the one-sentence thesis the lesson should be remembered by (a tip/aside): *the dependency array is the list of values whose change should re-sync the effect; `useEffectEvent` is for the values you must read fresh but whose change must not.*

Final recall check — a **`MultipleChoice`** (could be multi-select) presenting an effect that reads four values and asking which belong in deps and which belong in an Effect Event, forcing the student to run the bright line one more time on a fresh scenario (e.g., a presence/typing-indicator effect, or a document-title sync). This is the assessment that proves the mental model transferred.

## External resources

`CardGrid` of `ExternalResource` cards (established end-of-lesson pattern). Candidates:
- React docs — `useEffectEvent` reference (`react.dev/reference/react/useEffectEvent`). The canonical, now-stable page; the lesson is built on it.
- React docs — "Separating Events from Effects" (`react.dev/learn/separating-events-from-effects`). The conceptual long-form on reactive vs. non-reactive — the source of the bright line.
- React docs — "Removing Effect Dependencies" (`react.dev/learn/removing-effect-dependencies`). Where the deps-as-a-contract and the legitimate ways to shrink them live.
- React 19.2 release post (`react.dev/blog/2025/10/01/react-19-2`) — to anchor the "stable since 19.2, ships in the ESLint plugin" status claim.

A `VideoCallout` is optional and lower-priority for a hook this narrow and new — only include one if the resourcer surfaces a current (post-19.2) video that specifically covers `useEffectEvent` as stable, not an old experimental-API walkthrough. Do not embed a pre-19.2 video that uses the `experimental_useEffectEvent` import — it would teach a stale API shape. Leave a note for the resourcer to verify recency.

# Scope

**Prerequisites (assume taught; restate in one clause max, do not re-teach):**
- `useEffect(setup, deps)` signature, the cleanup-then-setup *synchronization* model (cleanup before each re-sync and on unmount), the three dep-array forms, and the dep array as an exact contract — all lesson 2. The chat-room-by-`roomId` example, the *non-reactive trap* name, *escape hatch*, *synchronize*, *reactive value*, *stale closure*, the exhaustive-deps-as-oracle rule, and the function-dep fix ladder — all lesson 2; this lesson is its final rung. Reference them; don't re-derive.
- Strict Mode's setup→cleanup→setup dev double-invocation — lesson 1. Only relevant if the polling/interval exercise surfaces a double-fire; a one-line aside at most.
- Purity / render is a pure function of its snapshot, closures capture by reference — chapter 023 / chapter 002. Used to *justify* the call-site rule; back-reference, don't expand.
- `useState`/`useRef` and that setters/refs have stable identity omittable from deps — chapter 024. Used in the unstable-identity contrast.

**Explicitly out of scope (belongs to other lessons — do not teach here):**
- The full "you might not need an effect" five-quadrant audit and anti-pattern catalog — lesson 4. Forward-ref only, as the "reach for the seam last" gate.
- `useCallback` *thresholds* and when to reach for it for memoized children — chapter 026 lesson 3. This lesson contrasts `useCallback` vs `useEffectEvent` *behaviorally* (stable-over-snapshot vs unstable-over-latest) but does not teach `useCallback`'s own decision framework.
- The React Compiler's handling of effects/memoization — chapter 026 lesson 2. Named once to justify "no reading mutable state in render"; not explained.
- Custom hooks wrapping effects (e.g., a `useChatRoom`) — chapter 026 lesson 1. The one nuance "you may create an Effect Event inside a custom hook but not hand it back" gets a single clarifying sentence; the full custom-hook surface is deferred.
- Rules of hooks / the indexed-slot mechanic / the `use()` exemption — lesson 8. `useEffectEvent` must still obey hooks rules (top-level call); mention in passing if needed, don't teach the mechanic.
- `useEffect` mechanics, the four cleanup pairings, abort/ignore race patterns — lesson 2; the chat example reuses them as given.
- TanStack Query, Server Components, `use()` as the real homes for data fetching — chapters 030–032 / chapter 11. Not relevant; this hook is about reads inside a *legitimate* effect, not fetching.

# Code conventions notes

- Hooks-and-React-Compiler section confirms the canonical line: "`useEffectEvent` to read latest props/state from inside an effect without re-running" and "the two ESLint rules are required and never disabled" — the lesson's lint framing aligns.
- Function form: arrow-functions-bound-to-`const` is the default; the Effect Event and component bodies follow that. The course uses `eslint-plugin-react-hooks@7.x` (per Supply chain section) — the version that understands Effect Events; the lesson's lint claims are consistent with the project config.
- Deliberate divergence for pedagogy (note for downstream agents): the chat-room/poll examples are intentionally *staged and simplified* — bare `useEffect` + WebSocket/`setInterval`, no `'use client'` directive shown, no error handling, no Result type, naming kept illustrative (`onMessage`, `currentUser`). This is a focused single-hook lesson, not project code; the production shape (Server/Client boundary, the data path) is owned by later chapters and explicitly out of scope here. Keep examples minimal so the reactive/non-reactive idea stays foreground.
- Single quotes, 2-space indent, semicolons per Biome config in all snippets.
