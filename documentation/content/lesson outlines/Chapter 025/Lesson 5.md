# useContext without the re-render storm

- **Title (h1):** useContext without the re-render storm
- **Sidebar label:** useContext

## Lesson framing

This lesson does two jobs at once and the title names the tension: install `useContext` as the **propagation primitive** for cross-cutting infrastructure, *and* land the re-render footgun that makes a naive bundled context a perf liability. The perf story is not an appendix — it is the spine. A junior who only learns "wrap the tree in a provider, read it anywhere" ships the storm; the senior deliverable is knowing *what context is for*, *why every consumer re-renders*, and the *three mitigations* that contain it.

Sequencing into the chapter: ch024 L3 (the four homes for state) ended on prop-drilling pain and explicitly deferred the "is context the fix?" decision to here. ch024 L4 taught `useReducer` and seeded the state/dispatch-split-in-context note. This lesson cashes both: context answers prop-drilling for genuinely cross-cutting values, and the reducer-in-context pattern is one of the three mitigations.

Core mental model the student must leave with: **a context broadcasts one value down a subtree; subscribing means subscribing to every change of that value by `Object.is`, no matter which field you read.** That single sentence, derived from the `Object.is` bailout the student already owns (ch023/024), generates the whole footgun and all three fixes. Build it gradually: first the propagation mechanic (simple, intuitive), then the re-render rule (the complication), then the three mitigations layered on (cohesion → stable identity → reference-stable dispatch).

Pedagogical spine: lead with the SaaS decision (current user, theme, locale, flags scattered across the tree), make `useContext` the answer, then immediately stress-test the naive bundled-context version with the `RenderTracking` widget so the student *sees* every box light up on a theme toggle. The three mitigations each attach to a piece of prior knowledge (cohesion, the object-identity trap from ch024 L1, reference-stable `dispatch` from ch024 L4), which keeps cognitive load low — nothing here is a brand-new primitive, it's `useContext` plus disciplined value shaping.

Tone and stack discipline: React 19 / Next.js 16, compiler-on (per code conventions). This forces a precise treatment of mitigation #3: the React Compiler *already* auto-memoizes provider values when the provider component is pure, so manual `useMemo` is the documented fallback, not the daily reach. The lesson must show the manual `useMemo` for *understanding* (a deliberate staged shape) while naming clearly that the compiler usually erases that ceremony — otherwise it contradicts the "no manual memo by default" convention.

End state — the student can: pick context vs prop-drill vs store; write a typed context with a fail-fast consumer hook; explain why a bundled context re-renders everything; and apply split-context / state-dispatch-split / stable-value as the situation demands.

## Lesson sections

### What context is actually for

**Goal:** install the propagation primitive against the prop-drilling pain ch024 L3 left open, and draw the *infrastructure-not-store* line before any syntax.

- Open with the senior question (implicit, per guidelines): a SaaS app has a current user, theme, locale, feature-flag map, notification queue — values a `<Sidebar>` fifteen layers deep needs. Threading them as props through every intermediate component is the pain. Bundling them in one context removes the drilling but, as the next section shows, introduces a different cost.
- Frame context as **propagation, not a store**: a `<Provider>` makes a value available to every descendant that asks, skipping the layers in between. It does not *manage* or *slice* state — it broadcasts whatever value you hand it.
- Land the **what-it's-for / what-it's-not** cut crisply (this is the decision the section exists to teach):
  - *For:* cross-cutting **infrastructure** that changes rarely or with broad scope — auth user, active org, theme, locale/i18n translator, feature flags, the router instance. These are the things every region reads and nobody wants to drill.
  - *Not for:* a drop-in for three-layer prop-drilling (just pass the prop, or compose via `children` — ch022 L2); server state (Server Components / TanStack Query, ch11); form state (the form component owns it, Unit 6); high-frequency updates (per-keystroke, per-scroll) where re-render cost dominates.
- Reuse the ch024 L3 anchor explicitly: "Move state to context" is *not* the fix for prop-drilling that's three layers deep — context earns its weight for genuinely cross-cutting concerns, not for skipping a couple of intermediate components.

**Component:** a `Buckets` exercise (`twoCol`) to make the for/not-for cut active rather than passively read. Buckets `Belongs in context` / `Does not belong in context`. Items (phrase chips, not lifted verbatim from prose): "the signed-in user", "the app's color theme", "the current locale", "text in a search box before submit", "the open/closed state of one dropdown", "the team's saved invoices", "the value of a draggable slider mid-drag". Grading: the canonical bucket per `bucket` prop. This doubles as the decision rubric.

### Creating and reading a context

**Goal:** the React 19 syntax surface — `createContext`, the bare-`<Context value>` provider shorthand, `useContext` — plus the typing and the fail-fast consumer-hook pattern that every later section assumes.

- The signature: `const ThemeContext = createContext<Theme | null>(null)`. Name why the default is `null` and the type is `Theme | null`: a consumer rendered outside any provider reads the default, so the type must admit that.
- **React 19 provider shorthand:** `<ThemeContext value={current}>…</ThemeContext>` — the value-as-the-component form. Name that `<ThemeContext.Provider value={…}>` still works and is what older code and many libraries show, but the bare form is the 2026 default. (One sentence; don't dwell — students should *recognize* `.Provider`, *write* the short form.)
- Reading: `const theme = useContext(ThemeContext)`. The value flows from the nearest provider above; with no provider, the `createContext` default.
- **The fail-fast consumer hook** — the senior pattern this section is really about. A bare `useContext(UserContext)` returns `User | null`, forcing every call site to null-check infrastructure that should always be present. Wrap it:
  ```ts
  function useCurrentUser() {
    const user = useContext(UserContext);
    if (user === null) {
      throw new Error('useCurrentUser must be used inside <UserProvider>');
    }
    return user;
  }
  ```
  Now the rest of the codebase imports `useCurrentUser()` and reads a non-nullable `User`; a missing provider fails loudly at the import site instead of producing a thousand `?.` reads or a silent `null`. Connect to the `use*` hook-naming contract (ch024 foreshadow / ch025 L8) and to the `requireUser`-style fail-fast convention the project uses server-side — same instinct, client side.
- Provider ownership / composition: each context owns its provider component; compose at the root by nesting (`<AuthProvider><ThemeProvider><LocaleProvider>…`). Deep nesting is unsightly but cheap; a `composeProviders` helper is recognition-only (name it in one clause, don't build it).

**Component:** `AnnotatedCode` (blue steps) over a single ~12-line file that declares `UserContext`, the `UserProvider`, and `useCurrentUser`. Steps: (1) `createContext<User | null>(null)` and why the null default; (2) the `UserProvider` wrapping children with the bare `value` form; (3) the `useCurrentUser` hook and the throw; (4) the consumer reading a non-nullable `User`. This is the canonical shape every following section references — author it once, walk attention through it.

**Tooltips (`Term`):** `context` (React mechanism to pass a value to a subtree without props), `provider` (the component that sets a context's value for its descendants). Keep both short and plain.

### Why one value change re-renders every consumer

**Goal:** land the footgun. This is the conceptual center of the lesson — derive it from `Object.is`, *show* it with `RenderTracking`, and make the cost visceral before offering any fix.

- State the rule plainly: when a provider's `value` changes by `Object.is`, **every** component that calls `useContext` on that context re-renders — regardless of which field it actually reads. Context subscription is all-or-nothing; there is no "subscribe to just `value.theme`."
- Derive it from prior knowledge so it feels inevitable, not arbitrary: the student already knows (ch023/024) that React bails out of a render when the next value is `Object.is`-equal to the previous, and re-renders when it isn't. Context is the same comparison applied to the provided value: a new value reference means every reader is notified.
- The canonical reproduction: an `AppContext` bundling `{ user, theme, locale }`. Toggling the theme produces a new context value → every consumer re-renders, including ones that only read `user`. On a small page this is invisible; in a tree with hundreds of consumers it is jank the user feels.
- Surface the compounding factors so the student knows where it bites: a context consumed deep inside a frequently re-rendering subtree, or a provider whose `value` is an object literal created fresh every parent render (teed up here, fixed in mitigation #3) — both magnify the cost.
- Tee the fix without resolving it: the storm has two independent causes — *too much in one context* (cohesion) and *a fresh value reference every render* (identity). The next sections take each.

**Component (hero):** `RenderTracking` (no `<Figure>` wrapper — it owns its card). A small tree: `App → { ThemeButton, UserBadge, LocaleLabel }`. Single implementation (no toggle yet — keep the first exposure clean). Triggers: "toggle theme", "rename user", "change locale" — *each* lists `renders="app,theme,user,locale"`, so the student watches every badge tick on every action and reads the asymmetry directly off the boxes. This is the moment the abstract rule becomes concrete; the doc for this component cites context-driven re-render as its exact use case.

**Component:** one `MultipleChoice` (single-correct) checking the *mechanism*, not the slogan — e.g. given a bundled context and a component that reads only `user`, what happens when `theme` changes, and *why* (the value reference changed, not the field). Distractors should tempt the "it only re-renders if it reads the changed field" misconception. `McqWhy` ties it back to `Object.is`.

### Mitigation 1: split the context by concern

**Goal:** the first and most important fix — one context per cohesive concern so a change re-renders only that concern's consumers.

- The move: instead of one `AppContext`, declare `UserContext`, `ThemeContext`, `LocaleContext`. Each has its own provider; consumers call `useContext` only on the contexts they actually read. A theme toggle now re-renders theme consumers *only* — the `user`-only `UserBadge` is untouched.
- The rule of thumb: **one context per cohesive concern.** Concerns that change independently get independent contexts. This is the structural fix and should be the *default* posture — split first, before the storm is ever measurable, because the cost of an extra context is near zero and retrofitting a split later means touching every consumer.
- Connect to composition from the previous section: each split context contributes one more provider in the root nest. The nesting grows, but each provider is cheap and the re-render isolation is the payoff.
- Watch-out woven in: don't over-split into a context-per-field either — group by *concern* (everything theme-related together), not by individual primitive. The cohesion unit is the concern, not the variable.

**Component:** extend the same `RenderTracking` tree using an `<Implementation>` toggle (this is the comparison the component was built for): tab "one bundled context" (every trigger renders all four boxes) vs tab "split contexts" (toggle theme → `renders="theme"`, rename user → `renders="user"`, change locale → `renders="locale"`). Switching tabs on the identical trigger set makes the isolation unmissable. Keep `App` in the tree but only tick it where a real parent re-render would occur.

### Mitigation 2: separate state from dispatch

**Goal:** the reducer-in-context pattern — split a `{ state, dispatch }` context into two so dispatch-only consumers never re-render on state changes. Cashes in `useReducer` (ch024 L4) and its reference-stable `dispatch`.

- The setup: a non-trivial shared concern (e.g. a notifications queue, or a multi-step wizard) is backed by `useReducer` and shared via context. The naive shape puts `{ state, dispatch }` in one context. Now *every* consumer — even a "Clear all" button that only ever calls `dispatch`, never reads `state` — re-renders on every state change, because the bundled value changes.
- The fix: **two contexts.** `NotificationsStateContext` holds `state`; `NotificationsDispatchContext` holds `dispatch`. Components that only act (the button) read dispatch from its context and subscribe to nothing that changes — `dispatch` is **reference-stable across renders** (the guarantee from ch024 L4), so the dispatch context's value never changes and pure-dispatch consumers never re-render. Components that display read the state context and re-render only when state actually changes.
- This is the canonical reducer-in-context pattern; name it as such. Two provider components (or one provider rendering both), two consumer hooks (`useNotifications()` for state, `useNotificationsDispatch()` for the dispatcher), each with the fail-fast wrapper from section 2.
- Connect back: ch024 L4 explicitly flagged that "sharing a reducer via context is where context's re-render cost bites — split state and dispatch." This section is the promised payoff.

**Component:** `CodeVariants` (two tabs, `del`/`ins` framing) showing the *provider* both ways:
- Variant "one context" (`data-mark-color="red"`): `<Ctx value={{ state, dispatch }}>` — prose: every consumer re-renders on any dispatch, including action-only ones.
- Variant "split" (`data-mark-color="green"`): two providers, `dispatch` in its own context — prose: action-only consumers read a reference-stable dispatcher and stop re-rendering.

Optionally fold the render asymmetry into the section-1 `RenderTracking` widget as a third `<Implementation>` tab ("state+dispatch split") if it reads cleanly; otherwise keep the `CodeVariants` standalone to avoid overloading one figure.

### Mitigation 3: keep the provider value reference-stable

**Goal:** the identity fix — a fresh object literal in the provider's JSX re-renders every consumer every parent render. Cashes in the object-identity trap (ch024 L1) and threads the React Compiler precisely.

- The trap: `<UserContext value={{ user, role }}>` constructs a **new object every render** of the provider's parent. Even if `user` and `role` are unchanged, the value is a fresh reference, `Object.is` says "changed," and every consumer re-renders on every parent render — the storm without anyone touching state. This is the exact object-identity trap from ch024 L1, now biting through context.
- The understanding-level fix, shown deliberately: wrap the value so its reference is stable when its contents are — `const value = useMemo(() => ({ user, role }), [user, role])`, then `<UserContext value={value}>`. Or, when the value *is* already a stable reference (e.g. the reducer's `state` object, or a single primitive), pass it directly with no wrapper.
- **The compiler reality (must be precise — it governs the convention):** the project ships with the React Compiler on, and per code conventions manual `useMemo`/`useCallback` are *not* the default reach — the compiler auto-memoizes the provider value when the provider component is pure, erasing this ceremony automatically. So the senior posture in 2026 is: write the provider plainly and let the compiler stabilize the value; reach for manual `useMemo` only as the **fallback** when the React DevTools compiler badge shows the component *wasn't* optimized (impure body, opt-out, a shape the compiler can't infer). Frame the `useMemo` version explicitly as a *teaching* shape that makes the mechanism visible and as the documented escape hatch — **not** as code the student should sprinkle by default. Note this divergence so downstream agents keep the framing: we show manual memo to teach identity, then immediately subordinate it to the compiler.
- Tie the three mitigations together in one closing beat: split context (don't put unrelated things together) + state/dispatch split (don't bundle read with write) + stable value (don't hand out a fresh reference) are three angles on the *same* root cause — a context re-renders its consumers exactly when its value reference changes, so the discipline is to change that reference only when something a consumer cares about actually changed.

**Component:** `CodeVariants`, three tabs:
- "object literal" (`red`): `<Ctx value={{ user, role }}>` — re-renders every consumer every parent render.
- "useMemo (teaching / fallback)" (`orange`): the `useMemo` wrap — stable when contents are, but ceremony the compiler usually removes.
- "compiler-on (the 2026 default)" (`green`): the plain object literal again, with prose that the compiler memoizes it for you when the provider is pure — so this and the `useMemo` tab compile to the same behavior, and *this* is what you write.

The orange→green ordering is intentional: show the manual mechanism, then reveal the compiler subsumes it, so the student understands *why* the convention says "no manual memo by default" rather than taking it on faith.

### Where context meets the server boundary

**Goal:** recognition-only landing of the Server/Client interaction so the student isn't blindsided when they wire a real Next.js app — ch030 owns the depth.

- The constraint: React Context is a client-runtime mechanism. **Server Components cannot call `useContext`** — they have no hooks. A Server Component can *render* a provider, but it cannot *consume* one.
- The Next.js pattern (name it, don't teach it deeply): a single `'use client'` `<Providers>` component holds the context providers and is mounted high in the root layout; Server Components above pass data **as props** down into the Client Components that read context below. This matches the `app/_components/providers.tsx` shape the project's conventions already reference (the TanStack Query provider lives there too).
- Keep this tight: the goal is recognition of *why* (no hooks on the server) and *the shape* (a client `<Providers>` island), with an explicit forward-reference to ch030 for the boundary mechanics and `'use client'` rules. Do not attempt to teach the boundary here.
- One forward clause for L7: `use(Context)` reads the same context but adds a capability `useContext` lacks — it may be called conditionally, after an early return. Name it in a single sentence and defer entirely to ch025 L7; do not show conditional-read examples here.

**Component:** none required; a short `Aside` (note) is enough to set the boundary expectation. Optionally a tiny `FileTree` showing `app/layout.tsx → _components/providers.tsx (use client) → feature components` if it aids the mental picture — but prose suffices, don't force a figure.

### When context is the wrong tool

**Goal:** close the loop by naming the alternatives, so the student reaches for context *deliberately* and knows the upgrade path — reinforces the thesis (decisions over syntax).

- Restate the boundaries as a short decision recap, now that the cost model is understood: context is for low-frequency cross-cutting **infrastructure**. The moment the shared value is **application state** — mutated from many places, sliced into many independent subscribers, updated often — context's all-consumers-re-render model fights you, and an external store (Zustand / Jotai) is the right move. Name this as recognition only; Unit 15 owns it.
- The other escapes, one clause each: server state → TanStack Query / Server Components (ch11); URL state → `nuqs` (ch033); just-a-few-layers drilling → pass the prop or compose with `children` (ch022 L2).
- Land the senior reflex as the takeaway line: **context is propagation, not a store** — reach for it for infrastructure, split it by concern, keep its value reference stable, and graduate to a store when the value becomes high-churn application state.

**Component:** an `ExternalResource` card to the React docs "Passing Data Deeply with Context" and/or "Scaling Up with Reducer and Context" (the latter is the canonical state/dispatch-split reference). Optionally a short `MultipleChoice` posing a context-vs-store scenario (a value mutated from many components and sliced per-field) to verify the student can spot when context stops being the right tool — distractors should make "just use context" tempting.

## Scope

**Prerequisites to redefine concisely (assume taught, restate in one line where needed):**
- `Object.is` render bailout (ch023/024) — the engine of the footgun; restate as the comparison, don't re-teach.
- `useReducer` and reference-stable `dispatch` (ch024 L4) — the basis of mitigation #2; assume the reducer shape, do not re-teach reducers.
- The four homes for state and the prop-drilling-is-not-a-context-bug distinction (ch024 L3) — the on-ramp; reference, don't re-derive.
- Object identity / fresh-reference-every-render trap (ch024 L1) — the basis of mitigation #3; restate at the call site.
- `children` composition and compound components (ch022 L2) — the prop-drilling alternative; name, don't teach.
- `use*` hook-naming contract (ch024 foreshadow, ch025 L8) — assume; the consumer-hook pattern leans on it lightly.

**Explicitly out of scope (defer, do not teach):**
- `use(Context)` and conditional/after-early-return context reads → ch025 L7. One-sentence forward-reference only.
- Server/Client boundary mechanics, `'use client'` rules, the `<Providers>` island in depth → ch030. Recognition only here.
- React Compiler memoization internals and the manual `useMemo`/`React.memo` decision thresholds → ch026 L2/L3. This lesson uses the compiler-handles-provider-values fact and shows `useMemo` as a teaching/fallback shape only; it does not teach when-to-memo as a discipline.
- Zustand / Jotai and external-store selectors (the slice-vs-atomic-selector story) → Unit 15. Named as the upgrade path only; the `RenderTracking` selector example in the component doc is *not* this lesson's subject.
- Better Auth's session provider → Unit 8. The `useCurrentUser` example is illustrative, not the real auth wiring.
- TanStack Query / server-state caching → ch11. Named as the server-state alternative only.
- URL state / `nuqs` → ch033. Named as an alternative only.
- The theme provider / `next-themes` concrete wiring → ch027. Theme is used as a running *example* of a context concern, not wired for real.
- `composeProviders` / provider-stacking helpers — recognition clause only, do not build.
- `useContext` with class components / `Context.Consumer` render-prop form — out of scope entirely (legacy; the course teaches function components only).

## Notes for downstream agents

- The `RenderTracking` badge counts are **simulated** from the author's `renders=` mapping — they do not observe a real tree. Author the mappings to tell the truth about which consumers re-render under each implementation; the whole pedagogical value is the asymmetry between the bundled and split tabs.
- The manual `useMemo` provider-value shape is shown **deliberately** against the "no manual memo by default" code convention — it is a teaching shape plus the documented compiler fallback. Keep it subordinated to the compiler-on default (orange→green ordering); do not let it read as the endorsed daily pattern.
- "Before" / naive variants must be marked `data-mark-color="red"` with smell-leading prose so no agent mistakes the bundled-context or object-literal shapes for endorsed code; "after" variants `green`.
- Status line for the compiler and React 19 surface must stay accurate to React 19 / Next.js 16 with `reactCompiler: true` (the React Compiler is **stable** as of 2026); do not invent versions. The React 19 bare-`<Context value>` shorthand is correct and `.Provider` is slated for deprecation (with a codemod) — frame `.Provider` as recognition-only legacy.
- **Do not claim the React Compiler narrows context subscriptions** (i.e. that it makes consumers re-render only when the field they read changes). That is a circulating third-party claim **not** in the official React docs. The compiler auto-memoizes the *provider value* (fixing the object-literal identity trap, mitigation #3) but does **not** change the all-consumers-re-render-on-value-change rule — so "split the context" (mitigation #1) stays necessary and is *not* made obsolete by the compiler. An agent fact-checking mid-write may surface the narrowing claim; it must be rejected to keep the footgun and mitigation #1 coherent.
