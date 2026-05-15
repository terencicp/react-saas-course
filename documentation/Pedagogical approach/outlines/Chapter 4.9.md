# Chapter 4.9 — Effects, context, and concurrent hooks

## Concept 1 — Strict Mode is the messenger, not the bug

**Why it's hard.** Strict Mode's double-invocation looks like a dev-only nuisance — "my effect ran twice, my console logs duplicated, my counter jumped to two." The junior reflex is a `useRef(false)` guard that "fixes" the visible symptom. The fix re-introduces the production bug Strict Mode was telling them about. Students must reframe the double-invoke as a *simulation of a real production cycle* (an Activity API hide/show, a fast back-button navigation) before any cleanup pattern lands.

**Ideal teaching artifact.** A misconception-first ambush. The lesson opens with a small `<ChatRoom>` widget that subscribes to a `roomId` in `useEffect` and logs `connecting…` / `disconnecting…` to a console pane next to it. With Strict Mode off, mount logs one connect; the student is told "this looks fine." A toggle flips Strict Mode on, the dev console now reads `connect → disconnect → connect`, and a render-trace strip across the bottom shades the three phases. The student is offered two "fixes" via a tab strip: (A) add a `useRef(false)` guard so the second connect never fires (the lazy reach), (B) make the cleanup unsubscribe properly. Both quiet the console. Then a "production simulator" button replays the same component under a *real* unmount/remount triggered by a fake `<Activity>` toggle. Fix (A) silently keeps the connection from the first mount and starts a second — the artifact shows two live sockets in a "connections" sidebar. Fix (B) closes the first, opens the second cleanly. The student watches the "fix" become the production bug, exactly as the lesson framed it.

**Engagement.** A `MultipleChoice` immediately after the artifact, on three symptoms: "my interval fires twice in dev" (fix cleanup), "my `useState(() => writeToLocalStorage())` corrupts the resource" (initializer must be pure), "my event handler fires twice when I click" (Strict Mode does *not* double-invoke handlers — the bug is elsewhere). The third option is the trap that confirms the student internalized the *scope* of what Strict Mode double-invokes.

**Components.**
- New: `StrictModeReplica` — a side-by-side widget with a Strict-Mode toggle, a `<ChatRoom>` mount, a live connection-count sidebar, a render-trace strip, and a "simulate production remount" button. Forward-links to 4.9.2 (cleanup mechanics) and Chapter 5 (Activity API recognition).
- `MultipleChoice` for the symptom-routing drill.

**Project link.** 4.12 has no effects of consequence, but the `useLockBodyScroll` hook in 4.12.5 is the first place a missing cleanup would bite — the chapter has to install the reflex before the project lands the hook.

---

## Concept 2 — What gets double-invoked, and what doesn't

**Why it's hard.** Strict Mode's contract is precise: render bodies, `useState`/`useReducer` initializers, `useMemo`/`useCallback` factories, and the *full effect setup-cleanup-setup cycle* run twice. Event handlers, `setTimeout` callbacks, and `setInterval` ticks do *not*. Students conflate the two and chase phantom bugs in the wrong place ("why does my interval callback run twice?" — it doesn't; the interval itself was created twice because the effect ran twice without cleanup). Without the line drawn explicitly, every other lesson in the chapter accumulates noise.

**Ideal teaching artifact.** A Reference-archetype matrix shown as a labeled scoreboard, paired with an interactive probe. The scoreboard is a two-column table: left lists every callable React touches (render body, `useState` initializer, `useMemo` factory, effect setup, effect cleanup, event handler, `setInterval` tick, `requestAnimationFrame` callback); right marks `2×` or `1×` under Strict Mode. Below, a probe widget runs each callable, increments a per-callable hit counter, and lets the student trigger each one (click a button → handler; mount the component → initializer; mutate state → render body). The student watches each counter and verifies the scoreboard claim against live behavior.

**Engagement.** A `Buckets` sort confirming after the probe — eight callables into "Strict Mode double-invokes" vs. "runs once." Items include the four-corner traps: render body (2x), event handler (1x), `useState(() => ...)` initializer (2x), `setInterval` callback (1x).

**Components.**
- `Figure` wrapping a hand-authored SVG of the two-column scoreboard (sentence-case labels, no decoration).
- New: `StrictModeProbe` — a small wired component with hit counters per callable type and user-driven triggers. Single-use; demoted to the alternative bullet below.
- Alternative (primary): `Figure` with the static scoreboard plus a `ReactCoding` block in exploration mode showing a component with hit counters wired up — the student triggers each path manually.
- `Buckets` for the post-artifact sort.

---

## Concept 3 — Effects synchronize with the outside world

**Why it's hard.** The "lifecycle" framing students bring from 2020 React makes them think of effects as `componentDidMount` / `componentDidUpdate` / `componentWillUnmount`. The 2026 framing is synchronization: the effect's *job* is to make the outside world match current props and state, and cleanup is not "the unmount step" — it's "the step that runs before every resync *and* on unmount." The reframing changes how students write the body: instead of "do X on mount, do Y on update, undo on unmount," the body says "given these inputs, connect; teardown closes the connection," and React picks the right moments to run each.

**Ideal teaching artifact.** A Concept-archetype scrubbable explorable. A `<ChatRoom roomId={...}>` component sits at the top, with a dropdown to change `roomId` between `general`, `random`, and `engineering`. Below it, a `DiagramSequence` scrubs through what React does when `roomId` changes: (1) render with new `roomId`, (2) call previous setup's cleanup (the disconnect from old room), (3) run new setup (connect to new room), (4) commit. A live "active connection" badge to the right shows which room is currently subscribed; the badge tracks the scrub. The student drags the slider back and forth, seeing the disconnect-then-connect pair fire on every transition. A second frame removes the cleanup return from the effect; the student scrubs the same `roomId` change and watches the active-connections badge accumulate — `general`, then `general + random`, then `general + random + engineering`. The contract lands by feel: cleanup is the seam that keeps the outside world in sync.

**Engagement.** The artifact itself carries the assessment — the student must demonstrate they predict the active-connections state at each scrub position before the badge updates. Follow-up `PredictOutput` on a 6-line effect with three dep changes scripted: predict the sequence of `setup`/`cleanup` log lines and the final outside-world state.

**Components.**
- `DiagramSequence` wrapping four hand-SVG frames of the resync cycle with the chat-room state overlay.
- Reuses `RenderTrace` from Chapter 4.8 (Concept 4) for the timing strip — extends with a "cleanup" cell.
- `PredictOutput` for the trace prediction.

---

## Concept 4 — Dependencies, identity, and the infinite-loop trap

**Why it's hard.** The dep-array rule is "every reactive value read inside the setup belongs in deps." The trap is *what counts as a value*. An object literal `{ id }`, a function defined inside the component, an array `[1, 2, 3]` — each has a new identity every render, each fails `Object.is`, each re-triggers the effect, and if the effect calls `setState`, the loop is silent until the browser tab freezes. The lint rule "exhaustive-deps" is correct but its fix ("add the dep") is sometimes wrong; the *real* fix is to depend on primitives or restructure.

**Ideal teaching artifact.** A Pattern-archetype wrong-by-default explorable. The student sees a `<UserDashboard>` component fetching data with `useEffect(() => fetchUser(query), [query])`. The starter passes `query` as an object: `query = { id: userId }`. A loop counter ticks once on mount, then climbs `1 → 2 → 3 → ...` without bound; a "stop the world" button kills the loop. The artifact shows three reshape paths in side-by-side tabs: (A) depend on the primitive `userId` instead of the object — counter stops at 1; (B) lift the object to a stable upstream and memoize — counter stops at 1; (C) ditch the effect entirely because this is a fetch (forward-references 4.9.4). Each tab leaves the bug in place if the student picks it without reading the diagnosis prompt — the student must commit to the fix before the counter freezes.

**Engagement.** A `Tokens` exercise on a 12-line component containing four dep candidates — click every reactive value that should be in the dep array. Targets: `userId`, `filter` (string state). Decoys (must *not* click): a function defined inside the component (`handleSelect` — would re-create identity every render; the fix isn't "add to deps"), a `useEffectEvent`-wrapped callback (excluded by the lint plugin), `setUser` (stable, excluded), `ref.current` (refs are not reactive).

**Components.**
- New: `IdentityTrapSandbox` — a wired `ReactCoding` block with a live loop counter, a "stop the world" cutoff, and three tabbed reshape paths. Reuses across 4.10.3 (memo thresholds) and 4.10.1 (custom hook deps).
- `Tokens` for the dep-classification exercise.

---

## Concept 5 — The four cleanup pairings and the race patterns

**Why it's hard.** "Every setup that creates something returns a cleanup that destroys it" sounds obvious, but in practice the four canonical pairings — `addEventListener`/`removeEventListener`, `setInterval`/`clearInterval`, `subscribe`/`unsubscribe`, `create`/`destroy` — are forgotten one at a time until something leaks in production. Layered on top: an effect that kicks off a fetch needs to abort the previous fetch on resync, or use an `ignore` flag, or both. The student needs the pairings as a checklist and the race patterns as a single muscle.

**Ideal teaching artifact.** A Reference-archetype card deck. Four pairing cards laid out in a 2×2 grid; each card shows the setup line, the cleanup line, a one-sentence "what leaks if you forget," and a one-line canonical example (window resize listener, polling interval, WebSocket subscription, chart instance). Below the grid, a fifth card occupies a full row: the *race-condition* card. It shows the two canonical race patterns side by side — `AbortController` for fetch-shaped work, `let cancelled = false` flag for non-abortable Promise chains — annotated as "same problem, two shapes." Each card has a tiny live demo embedded: the user toggles a "fast-navigation" simulator on the race card and watches stale data flash without the cleanup, then watches the same flow with the abort or flag in place.

**Engagement.** A `CodeReview` exercise — a 25-line `<NotificationsList>` component with three effects: a window resize listener missing cleanup, a `setInterval` polling for notifications missing cleanup, and a `fetch` missing an abort. The student leaves inline comments naming each leak and the pairing it violates. AI-graded against the "cleanup pairing" kernel phrase.

**Components.**
- `Figure` wrapping a hand-authored SVG of the four-pairing 2×2 grid with the race card.
- Each card embeds a small `ReactCoding` block running the leak demo in target-match mode (one click triggers the failure, one click triggers the fix).
- `CodeReview` for the audit drill.

**Project link.** 4.12.5's `useLockBodyScroll` is the canonical Pattern this concept rehearses — the cleanup that restores `body.overflow` is exactly the create/destroy pairing on a browser API.

---

## Concept 6 — Reactive vs. non-reactive: the seam `useEffectEvent` carves

**Why it's hard.** Two values an effect reads can look identical (both are props, both change over time) but have opposite reactivity. `roomId` *causes resynchronization* — when it changes, disconnect and reconnect. `onMessage` (a callback the parent passes) and `currentUser` should *not* cause resynchronization — they're read at event time, not at subscription time. Putting them in deps re-runs the effect on every parent render. Leaving them out closes over stale values. Until the student internalizes the *reactive vs. non-reactive* distinction, every workaround they reach for (ref-stash, `useCallback` everywhere, disable lint) re-introduces a worse bug.

**Ideal teaching artifact.** A Concept-archetype debate transcript. The student watches a fictional code-review conversation between a junior and a senior over a `<ChatRoom roomId onMessage>` component. The junior proposes four fixes for "the lint is complaining about `onMessage` missing from deps": (1) add it to deps — senior shows the resulting reconnect storm; (2) wrap in `useCallback` upstream — senior shows the propagation cost and the brittleness; (3) stash in a ref — senior shows the timing-gap stale-read; (4) `useEffectEvent` — senior approves and explains the reactive/non-reactive split. Each fix renders the same `<ChatRoom>` mounted in a sandbox below the transcript with a live "reconnect count" badge; the student clicks "apply fix N" and watches the badge react. The "right" answer isn't given upfront — the artifact walks every wrong reach so the seam is felt before it's named.

A second beat, shorter, ships the call-site restriction: `useEffectEvent` can *only* be called from inside an effect, a layout effect, or another Effect Event. A one-frame diagram shows the four call-site positions (render body, handler, effect, another Event) with green checkmarks on the two legal positions and red on the two illegal ones, plus a one-line justification per row.

**Engagement.** A `Buckets` sort on eight prop/state values for a `<ChatRoom>` effect — into "reactive (belongs in deps)" vs. "non-reactive (wrap in `useEffectEvent`)" vs. "ditch the effect entirely (handler or derived)." Items: `roomId` (reactive), `onMessage` callback (non-reactive), `currentUser` for logging (non-reactive), the `setUser` setter (stable, excluded), a derived `roomLabel` (handler-time, doesn't belong in the effect), a `filter` driving which messages render (handler-time again).

**Components.**
- New: `DebateTranscript` — a structured back-and-forth conversation widget with per-message live demos embedded; supports "apply this fix" actions that re-mount a sibling sandbox. Forward-links to any chapter teaching a decision via wrong-then-right reasoning (4.9.4 anti-pattern catalog, Unit 16 store decisions).
- `Figure` for the call-site-restriction diagram.
- `Buckets` for the reactivity-classification exercise.

---

## Concept 7 — The five-quadrant audit: "should this be an effect at all?"

**Why it's hard.** Every senior decision about effects in 2026 routes through one question: "what shape *should* this be?" The junior reflex is `useEffect` for anything that involves "change over time" — derived values, prop-driven resets, after-click logging, fetches, child-to-parent notifications. Four out of five of those are the wrong shape, and the correct shape is *different per case*. Without a structured audit, the student keeps reaching for the same hammer; with the audit, the reach itself becomes the lesson.

**Ideal teaching artifact.** A Decision-archetype guided puzzle. The student sees a five-quadrant chart on the screen, labeled `derive` / `handle` / `server` / `cache` / `sync`. Around the chart, ten candidate use-cases sit as draggable cards: "compute the total price of cart items," "reset the form when the record prop changes," "toast after save," "fetch the user list on page load," "log a click for analytics," "poll for unread notifications," "subscribe to a WebSocket on mount," "instantiate Stripe Elements against a DOM node," "notify the parent when a child's selection changes," "store the previous value of a prop." The student drags each card into the quadrant they think owns it. Wrong placements reveal a one-sentence senior correction *and* a "what shape instead" hint that names the platform tool (`key` reset, `<Suspense>` + `use()`, TanStack Query, Server Action handler). Right placements lock in. The student finishes the puzzle with the muscle: `useEffect` is the *fifth* quadrant only, and "sync" means external systems.

**Engagement.** The puzzle carries the assessment. Follow-up `MultipleChoice` on three edge cases the puzzle doesn't cover: "I want to focus the input after the modal opens" (handle — call `.focus()` in the same handler that opens the modal, with `flushSync` only if absolutely needed), "I want to scroll to top on route change" (handle the route change; Next.js does it automatically), "I want to set a CSS variable from a measured DOM size" (sync — `useLayoutEffect` is the rare correct reach).

**Components.**
- New: `EffectAuditPuzzle` — a five-lane drag-and-drop with ten candidate cards, per-card senior-correction strings and "what shape instead" hints, plus a completion ribbon. Forward-links to 5.2 (Server Components data path), 5.3 (Suspense), Chapter 7 (Server Actions), Chapter 11 (TanStack Query).
- `MultipleChoice` for the edge-case follow-up.

---

## Concept 8 — The anti-pattern catalog: each effect smell with its correct shape

**Why it's hard.** Concept 7 names the *audit*; this concept lands the *shapes*. The catalog is roughly nine canonical anti-patterns — derived state via effect, prop-reset via effect, chain of effects, fetch-on-mount, child-to-parent notify, expensive transform via state-plus-effect, subscribing to a parent's state via effect, event-handler logic in an effect, partial reset via render-time setState. Each has a different correct shape. The student has to recognize each one in code-review at a glance and pick the right fix without re-deriving the audit.

**Ideal teaching artifact.** A Reference-archetype card catalog with built-in "spot the smell" pacing. Nine cards stacked vertically, one per anti-pattern. Each card has three regions: (1) the broken code (5–8 lines), with a `<Show fix>` toggle hidden; (2) the *symptom* — what the user sees in the running app (a stale window, a double render, a wrong-value warning); (3) on toggle, the correct shape, also 5–8 lines, with the structural change highlighted. The student walks the catalog top to bottom; each card teaches one smell and one fix. The cards are ordered by frequency in real codebases — derived state and prop-reset on top, partial-reset and ref-based previous-value at the bottom (the rare legitimate cases).

**Engagement.** A `CodeReview` exercise on a 60-line component containing four of the nine anti-patterns interleaved with one legitimate effect (a WebSocket subscription that *should* be an effect). The student must comment on each anti-pattern, identify which card from the catalog it matches, and leave the legitimate effect alone. The "spot the legitimate effect" is the meta-test: the catalog doesn't make every effect bad, just the wrong-shape ones.

**Components.**
- New: `AntiPatternCatalog` — a vertically stacked card list with per-card broken/fixed code blocks, hidden-then-revealed fix, and an inline symptom strip. The cards reuse `CodeVariants` shape internally. Forward-links: future "X anti-patterns" lessons (server state, form state, auth state) reuse the same card catalog shape.
- `CodeReview` for the four-of-nine audit, plus the legitimate-effect bait.
- Alternative (primary, single-use risk): a sequence of nine `CodeVariants` blocks under prose section headers — no new component. Recommend this as the v1, with the bespoke `AntiPatternCatalog` as the upgrade if the same shape recurs in later chapters.

---

## Concept 9 — `useContext` as propagation, not as store

**Why it's hard.** Students learn `useContext` as "the fix for prop drilling" and reach for it as if it were a global state container. The 2026 framing is narrower: context propagates *infrastructure* — current user, theme, locale, feature flags, router instance — values that change rarely and apply broadly. Server state belongs in TanStack Query; application state belongs in Zustand; three-layer prop drilling belongs in props. Until the student has the four-way split, they over-reach for context, then suffer the re-render storm (Concept 10) and blame the primitive.

**Ideal teaching artifact.** A Decision-archetype real-artifact replica. The student sees a wireframe of a SaaS app — sidebar with user avatar, top-bar with notifications bell, main content with a paginated table, a settings panel deep in the tree. Twelve state values are pinned around the wireframe: `currentUser`, `theme`, `featureFlags`, `unreadCount`, `tableData`, `tableFilters`, `selectedRow`, `editedDraft`, `locale`, `routerInstance`, `searchQuery`, `wizardStep`. The student drags each into one of four buckets: Context (infrastructure), TanStack Query (server state), Zustand (application state), Props (local-only). Wrong drops show a one-sentence senior correction. The result is a calibrated reach: context for five of the twelve, server cache for two, app store for one, props for the rest.

**Engagement.** The puzzle carries the assessment. Follow-up `MultipleChoice` on the trap cases: "the active organization in a multi-tenant SaaS" (context — infrastructure for the whole authenticated session), "the cart contents" (server state or app store, never context), "the toast queue" (app store, not context — high-frequency updates).

**Components.**
- Reuses `StatePlacementPuzzle` from Chapter 4.8 (Concept 6) extended with a fifth lane (or rebuilds the four-way variant with `Buckets`). Recommends reusing the puzzle when built; otherwise ship as four-column `Buckets` v1.
- `MultipleChoice` for the trap-case follow-up.

---

## Concept 10 — The re-render storm and the three mitigations

**Why it's hard.** The footgun is invisible until profiled: when a provider's `value` changes by `Object.is`, *every* consumer re-renders, regardless of which field they read. A theme toggle re-renders the table. A user-update re-renders the feature-flag consumers. The fix isn't one technique — it's three layered ones (split contexts, separate state from dispatch, stable value via compiler or `useMemo`), and the student has to know which to reach for in which order.

**Ideal teaching artifact.** A Concept-archetype side-by-side simulator. A small SaaS-ish tree renders six leaves: `<UserAvatar>`, `<ThemeIndicator>`, `<NotificationsBadge>`, `<DataTable>`, `<SettingsPanel>`, `<Sidebar>`. Above the tree, a control panel exposes one provider with three fields (`user`, `theme`, `unreadCount`). Each leaf reads only one field. A live render-count badge sits on each leaf. The student clicks "toggle theme" — every badge climbs by one (the storm). A "mitigation" tab strip lets the student apply each fix in sequence: (1) split into three contexts — now toggling theme only re-renders `<ThemeIndicator>`; (2) keep one context, separate state from dispatch — dispatch-only consumers stop re-rendering on state changes; (3) memoize the provider value — fixes the per-render-new-object case even when the parent re-renders. Each fix is shown applied to a baseline, with the render-count delta visible. The student feels the cost compound and the mitigations compound the other way.

**Engagement.** A `MultipleChoice` decision drill — four context-shape scenarios, pick the mitigation that earns its weight. (A reducer-backed app context with both `state` and `dispatch` — separate. A theme context with one boolean — already minimal, no mitigation. A bundled `AppContext` with eight fields — split. A correctly split context that re-renders too often because the parent passes `{ user }` as a literal — memoize or rely on the compiler.)

**Components.**
- New: `ContextRenderStorm` — a wired six-leaf tree with per-leaf render-count badges, a three-tab mitigation strip, and a controllable provider. Reuses the `RenderTrace` strip from Chapter 4.8.
- `MultipleChoice` for the mitigation picker.

---

## Concept 11 — Urgency, not speed: the transition mental model

**Why it's hard.** Students hear "concurrent rendering" and assume `useTransition` and `useDeferredValue` make slow code fast. They don't. They mark *which updates are urgent and which can wait*. The user-facing payoff is the same — the input stays responsive while the slow filter computes — but the mechanism is *priority reordering*, not work elimination. Until the student stops thinking of these as speed knobs, they apply them everywhere and pay the complexity cost without the payoff.

**Ideal teaching artifact.** A Concept-archetype controllable simulator. A two-track layout: the top track is "urgent work" (the input), the bottom track is "non-urgent work" (the slow filter against a 5000-row list). The student types in the input; without transitions, each keystroke blocks the input for ~150ms while the list re-renders, and a visible jank meter spikes. The student then enables `startTransition` wrapping the filter setter; the input updates instantly, and the bottom track shows the filter re-render *catching up* a few hundred milliseconds later. A side bar visualizes the React scheduler as a small two-lane queue — urgent updates go in lane A, transitional ones in lane B, and lane A always commits first. The total *work done* is the same; the *order* is different. The student watches both versions race against the same keystroke sequence.

**Engagement.** A `TrueFalse` round on six claims: "transitions make slow code fast" (false), "transitions reorder priority" (true), "`isPending` is true while the urgent update is committing" (false — true during the *transition's* render), "wrapping every setter in `startTransition` is the senior default" (false), "transitions can be interrupted by a newer transition" (true), "a transition still commits eventually" (true, unless superseded). Each card has a one-sentence card-by-card review.

**Components.**
- New: `TransitionSimulator` — a two-track widget with a typeable input, a slow filter render, a jank meter, and a toggle for `startTransition` wrapping; visualizes the React scheduler queue as a side panel. Forward-links to Chapter 5.3 (Suspense + transitions for navigation), Chapter 7 (Server Actions as implicit transitions).
- `TrueFalse` for the mental-model check.

---

## Concept 12 — Wrap the setter vs. wrap the value: the `useTransition` / `useDeferredValue` cut

**Why it's hard.** `useTransition` and `useDeferredValue` produce the same downstream behavior (an urgent path stays responsive while a non-urgent path lags). The cut is *which side of the data flow you control*. If you own the setter, wrap it in `startTransition`. If you only receive the value (a third-party hook, a parent prop, a library), wrap *the value* in `useDeferredValue` at the consumer. Without that decision rule, students reach for whichever they remember and end up wrapping the input's own value in `useDeferredValue` (which is the urgent path — wrong).

**Ideal teaching artifact.** A Decision-archetype side-by-side. Two `<TypeAhead>` components live next to each other. The left version controls its own state — it owns `query` via `useState`, so wrapping the *setter* in `startTransition` is the senior reach. The right version receives `query` as a prop from a third-party uncontrolled input (the student can't change where `setQuery` is called); the senior reach is `const deferredQuery = useDeferredValue(query)` at the consumer. The artifact shows both versions running, the same keystroke sequence applied to both, the same downstream behavior. Then a "swap" toggle moves the input control between the two; the student watches the *correct* hook flip per side. The cut isn't "which is better" — it's "which side of the data flow do you own."

**Engagement.** A `Matching` two-column drill: four scenarios on the left, the correct hook on the right. Scenarios: "controlled input + slow downstream list" → `useTransition`. "Receive `query` as a prop from a library hook" → `useDeferredValue`. "Slow re-render after a tab click I own" → `useTransition`. "A `data` prop from a Suspense `use()` that downstream components display in a slow chart" → `useDeferredValue`.

**Components.**
- Reuses `TransitionSimulator` from Concept 11 with the consumer-side toggle.
- `Matching` for the hook-picker drill.

---

## Concept 13 — `use()` for promises and the Server-to-Client streaming pattern

**Why it's hard.** `use()` is structurally different from every hook before it: it can be called conditionally, after early returns, and inside loops. The runtime contract is "throw to Suspense if the promise is pending, return the value if resolved, throw to error boundary if rejected." The student must hold three things at once: the call-site freedom (which violates rules of hooks for everyone else), the Server-Component-passes-a-promise pattern (which is the canonical reach in 2026), and the Suspense boundary that catches the throw (which the student probably hasn't met yet).

**Ideal teaching artifact.** A Mechanics-archetype anatomy plus a Pattern-archetype walkthrough. Beat one: a hand-SVG diagram of the `use()` call site, labeled like a control-flow valve. Three exit paths emerge: "pending → throw to Suspense," "resolved → return value," "rejected → throw to error boundary." A small wired example renders a `<UserCard userId={1}>` Client Component that calls `const user = use(userPromise)`; a parent Server Component creates `userPromise` and passes it as a prop. The student toggles three states (pending, resolved, rejected) and watches the boundary catch each.

Beat two: a scrubbable `DiagramSequence` of the Server-to-Client streaming flow. (1) Server Component starts a slow query and returns *without awaiting* — passes the Promise as a prop. (2) Client child renders, calls `use(promise)`, suspends. (3) `<Suspense fallback>` renders the skeleton. (4) Promise resolves. (5) Client child re-renders, `use()` returns the data, the skeleton swaps. The student scrubs forward and back, watching the boundary swap. A toggle at the bottom flips to the *old* shape — `useEffect(() => fetch().then(setData), []); if (!data) return <Spinner />` — and the same scrub shows two renders, manual loading state, no SSR. The contrast is the lesson.

**Engagement.** A `Sequence` ordering drill — five steps in the streaming flow, drag into order. Plus a `MultipleChoice` on three call-site legality questions: "can `use()` be called after `if (!enabled) return null;`?" (yes), "can `use()` be called inside a `.map()`?" (yes), "must the Promise be stable across renders?" (yes — creating a new Promise in the render body is wrong).

**Components.**
- `Figure` wrapping a hand-authored SVG of the `use()` three-exit-path anatomy.
- `DiagramSequence` for the streaming scrub (five frames).
- `CodeVariants` for the old-effect-shape vs. new-`use()`-shape side-by-side.
- `Sequence` + `MultipleChoice` for the engagement combo.

---

## Concept 14 — The stable-promise rule and `cache()`

**Why it's hard.** `use()`'s call-site freedom hides a different requirement: the Promise must be *referentially stable across renders* for the same logical resource. `use(fetch('/api/data'))` inside a component body creates a new fetch every render, suspends every render, and never resolves — the component locks. The senior pattern is to create the Promise in a Server Component (one run per request) and pass it down, or to wrap a server-side function in `cache()` for request-scoped deduplication. Students who skip this rule write components that look correct and hang forever.

**Ideal teaching artifact.** A Pattern-archetype wrong-by-default. A `<UserCard>` component is shipped with `const data = use(fetch('/api/user'))` in its body. The student mounts it and watches the suspense fallback render forever — a "render attempt" counter climbs `1 → 2 → 3 → ...` indefinitely as React retries. The artifact prompts: "the Promise is being recreated on every render attempt." Three fixes are offered in tabs: (A) lift Promise creation to a Server Component parent (the canonical 2026 shape) — counter resolves at 1; (B) wrap a server-side function in `cache()` and call it from multiple children — counter resolves at 1, and the *same* request is shared across components; (C) for client-only async, route to TanStack Query (forward-reference, no fix here — flag the wrong tool). The third tab is the meta-test: `use()` is not the right hook for client-side interactive data.

**Engagement.** A `MultipleChoice` audit on five `use()` call sites — pick the ones that violate the stable-promise rule. The trap: a Promise created in a *parent* Server Component (legal) vs. a Promise created in a *parent* Client Component without memoization (still re-creates on every parent render, still wrong).

**Components.**
- Reuses `IdentityTrapSandbox` from Concept 4 with `use()` semantics — the "infinite re-render" symptom is the same as the dep-identity loop, conceptually.
- Alternative: a one-off `ReactCoding` block with the three fix tabs.
- `MultipleChoice` for the audit.

---

## Concept 15 — The rules of hooks and the indexed-slot mechanic

**Why it's hard.** "Hooks must run at the top level in the same order every render" is easy to state and easy to violate. The why — React identifies hooks by call-order index, not by name — is rarely taught explicitly, so students treat the rule as arbitrary and find clever ways to violate it ("just this one conditional `useState`"). Once they see the indexed-slot mechanic, the rule becomes self-evident: a conditional hook misaligns the slot index across renders and React reads the wrong state.

**Ideal teaching artifact.** A Concept-archetype scrubbable explorable. A `<Counter>` component contains three hooks in order: `useState(0)`, `useState('')`, `useEffect(...)`. A side panel visualizes React's per-component "hook slot array" — three numbered boxes. The student scrubs through three render passes via a slider; on each pass, the visualizer animates the slot index advancing 0 → 1 → 2 as each hook is called, and writes the value into the corresponding slot. The student then introduces a conditional: wraps the second `useState` in `if (showName)`. The artifact re-runs the scrub: render 1 with `showName: true` calls all three hooks (slots 0, 1, 2 populated); render 2 with `showName: false` calls only two hooks (slot 0 → `useState(0)`, slot 1 → `useEffect`), but React expected slot 1 to be the name state. The visualizer flashes red on the misalignment and shows the resulting bug — the effect's setup ran with the name-state slot. The student sees *exactly* what "the slots misalign" means.

A second short beat introduces the one deliberate exception: `use()`. The visualizer is paused; the rule is named explicitly — `use()` doesn't rely on call-order matching across renders, so the lint exempts it. The student should not generalize.

**Engagement.** A `Sequence` drill — five hook calls in a `<Component>` body, drag into a *legal* order (all hooks before any early return; the `use(Context)` call is the only one allowed after the early return). Plus a `Tokens` exercise on a 15-line component: click every line that violates the rules. Targets: a `useState` inside an `if`, a `useEffect` after `if (!data) return <Spinner />`, a `useState` inside a `.map()`. Decoys: a `use(Context)` after an early return (legal), a `useState` inside a custom hook (legal — composition).

**Components.**
- New: `HookSlotVisualizer` — a wired component with a scrubbable render counter, a side-panel slot-array animation, and a "toggle conditional hook" switch that triggers the misalignment. Forward-links to 4.10.1 (custom hooks reuse the same slot model) and 4.10.2 (compiler analyzes the same structure).
- `Sequence` for the order drill.
- `Tokens` for the violation hunt.

---

## Concept 16 — ESLint enforcement and the compiler-plus-lint relationship

**Why it's hard.** The two `eslint-plugin-react-hooks` rules — `rules-of-hooks` and `exhaustive-deps` — earn their weight in different ways. The first is *structural* and almost never legitimately disabled. The second is *advisory* and has a small set of legitimate disables. With the React Compiler enabled (4.10.2), `exhaustive-deps` is *less* critical because the compiler analyzes and inserts deps automatically; `rules-of-hooks` remains essential because the compiler doesn't change the slot mechanic. Students need to know which lint failures are "fix the code" vs. "lint is wrong, document and move on" — and the answer is almost always the first.

**Ideal teaching artifact.** A Decision-archetype reference card paired with a calibration drill. The card is a two-row layout: row one names `rules-of-hooks` (structural, almost never disabled, one-line "fix the code by restructuring"); row two names `exhaustive-deps` (advisory, three legitimate disable cases listed by name, with `useEffectEvent` as the right tool for the most common one). Below the card, a calibration drill shows ten lint failures (some real bugs, some legitimate disables, some compiler-handled). The student picks one of three responses per failure: "fix the code," "wrap with `useEffectEvent`," "disable with a comment." Wrong picks reveal the failure mode the wrong response causes.

A second beat addresses the compiler interaction: with the compiler enabled, `exhaustive-deps` warnings on `useEffect` deps that the compiler will auto-insert can be safely ignored *if* the component is compiler-eligible. The student is shown the DevTools `Memo ✨` badge as the verification — if the badge is green, the compiler is doing the analysis; if not, the lint warning still matters. The "two layers" framing is the takeaway.

**Engagement.** The drill carries the assessment. Follow-up `MultipleChoice` on three meta-questions: "I see `rules-of-hooks` flagging a hook inside a `.map()` — should I disable?" (no — extract a child component, one hook per instance), "the compiler is enabled and `exhaustive-deps` is still warning — should I add the dep?" (yes — the compiler doesn't silence the lint, and the dep is what the lint analyzed; the compiler-plus-lint pair both want the truthful deps), "I have a custom hook with a dep array — does `exhaustive-deps` check it?" (only if added to `additionalHooks` — forward-reference to 4.10.1).

**Components.**
- `Figure` wrapping a hand-authored SVG of the two-row reference card.
- New: `LintCalibrationDrill` — a ten-row drill with per-row failure code, three response buttons, and per-row "what fails if you pick wrong" reveals. Single-use risk; demoted to the alternative bullet below.
- Alternative (primary): a `MultipleChoice` round of ten questions (one per lint failure), each with the three response options and per-question feedback.
- `MultipleChoice` for the meta-question follow-up.

---

## Component proposals

- **`StrictModeReplica`** — a side-by-side widget with a Strict Mode toggle, a `<ChatRoom>` mount, a live connection-count sidebar, a render-trace strip, and a "simulate production remount" button.
  - Uses in this chapter: concept 1.
  - Forward-links: Chapter 5 (Activity API recognition), 4.10.2 (compiler purity checks). Moderate forward-link weight.
  - Leanest v1: a `DiagramSequence` with pre-baked frames of the connect/disconnect/connect cycle plus a side-by-side `CodeVariants` of "fight Strict Mode" vs. "fix the cleanup." The live remount simulator is iteration two; the misconception lands either way.

- **`IdentityTrapSandbox`** — a wired `ReactCoding` block with a live loop counter, a "stop the world" cutoff, and three tabbed reshape paths for object/function/array dep identity issues.
  - Uses in this chapter: concepts 4, 14.
  - Forward-links: 4.10.1 (custom hook deps), 4.10.3 (memo thresholds — same identity story), Unit 16 (selector identity in Zustand).
  - Leanest v1: a single `ReactCoding` block with the loop visible (counter climbs, then cuts off at 50) plus three `CodeVariants` tabs for the fixes — no bespoke component. The cutoff and loop counter can live inside the block's UI scaffolding.

- **`DebateTranscript`** — a structured back-and-forth conversation widget (junior vs. senior) with per-message live demos and "apply this fix" actions.
  - Uses in this chapter: concept 6.
  - Forward-links: 4.9.4 (anti-pattern dialogues), Unit 16 (store-choice debates), any decision-heavy concept where wrong-then-right reasoning carries the teach. Moderate forward-link weight if reused; single-use risk if not.
  - Leanest v1: a vertically stacked sequence of `Aside`-wrapped quote blocks alternating speakers, each followed by a small `ReactCoding` block for the "apply this fix" demo. Drops the apply-fix interaction in favor of static before/after frames. The conversation pacing is what teaches; the live re-mount is iteration two.

- **`EffectAuditPuzzle`** — a five-lane drag-and-drop with ten candidate cards, per-card senior-correction strings and "what shape instead" hints.
  - Uses in this chapter: concept 7.
  - Forward-links: 5.2 (Server Components data path), 5.3 (Suspense), Chapter 7 (Server Actions), Chapter 11 (TanStack Query). High forward-link weight — every later "should this be X" decision can borrow the lane model.
  - Leanest v1: a five-column `Buckets` exercise with the ten cards and per-wrong-drop senior-correction strings — drops the visual chart but keeps the decision drill. The visual chart is iteration two.

- **`AntiPatternCatalog`** — a vertically stacked card list with per-card broken/fixed code, hidden-then-revealed fix, and inline symptom strip.
  - Uses in this chapter: concept 8.
  - Forward-links: future "X anti-patterns" lessons (server state in 11.x, form state in 7.x, auth in 9.x).
  - Leanest v1: a sequence of nine `CodeVariants` blocks under prose section headers — no bespoke component. The reveal-on-toggle is the only thing lost; the broken/fixed comparison is the teach.

- **`ContextRenderStorm`** — a wired six-leaf tree with per-leaf render-count badges, a three-tab mitigation strip, and a controllable provider.
  - Uses in this chapter: concept 10.
  - Forward-links: 4.10.3 (memo thresholds — same render-fan-out math), Unit 16 (store selector subscribe-to-slice).
  - Leanest v1: a static `Figure` with a hand-SVG of the six-leaf tree showing the three render-fan-out scenarios (storm / split / dispatch-separated) side by side, plus a `CodeVariants` of the three implementations. Drops the live wiring; the visual lands the model.

- **`TransitionSimulator`** — a two-track widget with a typeable input, a slow filter, a jank meter, a `startTransition` toggle, and a scheduler-queue side panel.
  - Uses in this chapter: concepts 11, 12.
  - Forward-links: Chapter 5.3 (Suspense + transitions for navigation), Chapter 7 (Server Actions as implicit transitions), Chapter 11 (server-state suspense + transitions).
  - Leanest v1: a `ReactCoding` block running the same `<TypeAhead>` example with two tabs (with/without `startTransition`), plus a `Figure` of a hand-SVG scheduler-queue diagram. The jank meter can be a static "before/after" frame. The live two-track race is iteration two.

- **`HookSlotVisualizer`** — a wired component with a scrubbable render counter, a side-panel slot-array animation, and a "toggle conditional hook" switch that triggers the misalignment.
  - Uses in this chapter: concept 15.
  - Forward-links: 4.10.1 (custom hooks reuse the same slot model), 4.10.2 (compiler analyzes the same structure).
  - Leanest v1: a `DiagramSequence` with five pre-baked frames showing the slot array across two renders (one with the conditional `false`, showing the misalignment in red). Drops the live scrub; the visual lands the mechanic.

- **`LintCalibrationDrill`** — a ten-row drill with per-row failure code, three response buttons, per-row "what fails if you pick wrong" reveals.
  - Uses in this chapter: concept 16. Single-use.
  - Forward-links: None — single-use. Demoted in concept 16 in favor of a `MultipleChoice` round.
  - Leanest v1: skip — ship as a `MultipleChoice` round of ten questions. Listed here for completeness.

## Build priority

Three components carry the most teaching load across this chapter and forward into the curriculum, ranked by reuse plus forward-link weight:

1. **`EffectAuditPuzzle`** — the central decision of the chapter (Concept 7) and the reach pattern every subsequent lesson in Unit 5 and Chapter 7 reinforces. Even as a five-column `Buckets` v1, the lane-and-correction shape lands the audit better than prose. High forward-link weight into 5.2, 5.3, Chapter 7, Chapter 11.
2. **`TransitionSimulator`** — covers two concepts in this chapter (11, 12) and is the canonical urgency-vs-speed demo surface for every later lesson that touches Suspense, Server Actions, or async UI. The leanest v1 (`ReactCoding` with two tabs + a static scheduler-queue diagram) ships fast; the live race is the polish iteration.
3. **`IdentityTrapSandbox`** — used in two concepts here (4, 14) and forward-links into every later memoization and selector lesson. The leanest v1 is a single `ReactCoding` block with a visible loop counter — no bespoke component required if it stays simple.

`ContextRenderStorm`, `HookSlotVisualizer`, and `StrictModeReplica` are worth building but rank below — single-concept in this chapter with moderate forward-links. `AntiPatternCatalog` and `DebateTranscript` should ship as their leanest-v1 (stacked `CodeVariants` and `Aside`-wrapped quotes respectively) first; promote to bespoke components only if the shape recurs. `LintCalibrationDrill` should not be built — `MultipleChoice` handles the assessment at lower cost.

## Open pedagogical questions

- Concept 8's `AntiPatternCatalog` overlaps in shape with the inevitable "X anti-patterns" lessons in Chapters 7, 11, and 16. If the recurring shape is real, the component is worth building once and reusing; if each later chapter prefers a different framing, ship the stacked-`CodeVariants` v1 here and revisit. Worth a cross-check when 11.x and 16.x are drafted.
- Concept 14's stable-promise rule may be better folded into Concept 13 as a "watch-out" beat rather than carrying its own concept slot — it's load-bearing but narrow. Keeping it separate here because the failure mode (component hangs forever, suspense fallback never resolves) is severe enough to warrant a dedicated artifact. Confirm during draft whether the artifact stands or merges.
- Concept 9's reach for `StatePlacementPuzzle` (from 4.8) extended with a fifth lane assumes that component ships in 4.8. If it doesn't, ship the four-column `Buckets` v1 here and defer the bespoke puzzle until reuse is real.
