# When Zustand earns its weight

- Title: When Zustand earns its weight
- Sidebar label: When Zustand earns its weight

## Lesson framing

This is the **decision lesson** of the Zustand chapter and the load-bearing one — lessons 2 (primitives + per-request provider) and 3 (the routed wizard) are both conditional on the threshold landing here. The lesson teaches no Zustand API. It teaches *when a senior reaches for an in-memory global client store at all*, and just as importantly, when they don't.

Pedagogical spine: **trigger before tool, defaults before conditionals** (the course's core stance). The student has spent the prior 22+ chapters acquiring five client-state defaults; Zustand is the conditional reach past *all five*. So the lesson's job is to make the threshold explicit and the funnel reflexive — the senior runs a checklist before installing the library, and "if `useState` covers it, ship `useState`" is the headline. The biggest risk this lesson exists to prevent is the **Redux-store-of-the-universe trap**: treating Zustand as "ambient global state for everything." Every framing decision here narrows the surface the library is allowed to touch.

Target student: junior dev from another field, building production SaaS with AI agents. They have likely seen "global state = Redux/Zustand" framed online as a default, not a conditional. The pain this lesson relieves: it gives them the *vocabulary and the gate* to push back on an AI agent (or their own instinct) that reaches for a global store when a default would do. The mental model the student should leave with: **client state is a funnel** — server? → `useState`? → lifted + Context? → URL? → only then Zustand; and once past the gate, **one store per feature, never one global store**.

Mental-model sequencing to minimize cognitive load:
1. Re-anchor the five defaults the student already owns (one line each — this is recall, not re-teaching).
2. Name the gap: what shape do all five fail to cover.
3. The three triggers that define that gap (positive cases).
4. The non-cases (negative cases) — the same workloads mapped back to their correct default.
5. The cost of installing the library (why the bar is high).
6. The per-feature rule (architecture, not just "when").
7. Alternatives (why Zustand specifically, in one paragraph each).
8. The funnel as an interactive gate (synthesis).
9. The pointer to our app's worked case (sets up lessons 3 / 079).

Concepts are mostly architectural-judgment, not syntax — so the lesson is prose-heavy with two high-value interactive aids: a `RenderTracking` widget to *show* (not tell) the Context-whole-tree-re-render cost that motivates trigger 3, and a `StateMachineWalker` decision funnel as the lesson's synthesis. One `Buckets` exercise checks the central skill (mapping a workload to its correct default). No code sandboxes — there's no Zustand code to write yet (that's lesson 2), and forcing one would violate "trigger before tool." Estimated 30-40 min.

Tone: adult, terse, senior. No celebratory scaffolding. Lead every conditional discussion by naming the default it crosses.

## Lesson sections

### Introduction (no header)

Open with the senior question, implicitly (per pedagogical guidelines — the introduction states the goal and motivates with a concrete problem, no "senior question" header). Frame: the student now owns five ways to hold client state, each with a stronger default than a global store. So when does a feature genuinely need an in-memory store that lives across the whole app? Motivate with a concrete stake: a four-step customer-onboarding wizard whose steps sit on different routes and must share a draft — name it once as the destination, don't drill in (that's lesson 3). State the lesson's payoff: by the end, the student can run a funnel that decides, before installing anything, whether Zustand earns its weight, and can name the one architectural rule that keeps it from sprawling. Keep warm and brief (~1 short para).

Set the one-line headline that recurs: **"If `useState` covers it, ship `useState`."** Zustand is conditional and per-feature, never the app's ambient state bus.

### The five defaults already cover most client state

Recall, not re-teach. One tight line per default, framed as "what it owns," so the student re-anchors the map before we find the gap. Use a compact list or a small two-column table (workload → default). The five:
- `useState` — transient local UI state (a toggle, an input, an open/closed flag one component owns).
- `useReducer` — related local state with coordinated transitions (the 3+-`useState`-that-update-together threshold from the hooks convention).
- Lifted state + React Context — narrowly shared state read by consumers **under one provider in one subtree**, low write frequency.
- `nuqs` (URL state) — shareable view state: filters, sort, search, cursor pagination (Chapter 060).
- TanStack Query — client-side **server** state on the four chapter 076 triggers (polling, cross-view caching, optimistic-with-rollback, infinite scroll).

Close with the gap framing in one sentence: every one of these has a boundary, and there's a shape that falls outside all five — genuinely shared, non-server, non-URL client state living in memory across **disjoint or cross-route** component trees. That shape is what the rest of the lesson is about.

Reasoning: the student must hold the full default map in working memory before the triggers make sense; the triggers are defined *by contrast* with these. Keep it recall-speed so cognitive budget is spent on the new material.

Term tooltips here: none needed — all five are prior-chapter concepts; a one-line gloss in prose is enough.

### The three triggers that cross the threshold

The positive cases. Frame upfront: the course accepts **three and only three** reasons to bring Zustand into a SaaS codebase. Numbered list (H3 each, or a strong bulleted structure — H3 is cleaner since each trigger has a couple of examples + a "senior call" qualifier).

#### Genuinely shared state across disjoint or cross-route trees

The core trigger. Concept: lifting + Context works when all consumers live under one provider in one subtree. Once consumers are in **disjoint trees** or **across route boundaries** (e.g. a wizard whose steps are separate route segments `/new/step-1`, `/new/step-2`), Context degrades into prop-drilling-by-another-name — you'd thread the state through a common ancestor that doesn't naturally own it, and every intermediate becomes a Client Component passing data it doesn't use. Examples (name, don't build): the routed wizard sharing a draft payload; a command palette whose open/close is read by topbar + layout overlay + a keybinding handler in three subtrees; a cart read by a header badge, a slide-over, and a checkout page. Senior call: the trigger is real when the consumers genuinely can't sit under one natural provider — not merely because passing a prop two levels feels tedious.

#### Imperative actions fired from unrelated subtrees

Concept: "open the global toast," "fire the confirmation modal from any leaf," "flip the sidebar from a deeply nested button." A small store with an `open()`/`close()`/`fire()` action surface beats threading a callback down six layers. Senior call (the gate that prevents overreach): the trigger is real only when **more than two unrelated subtrees** fire the action. Two callers under a shared parent? Lift the callback. This qualifier matters — it's the most-abused trigger.

#### Frequently-mutated shared state where Context re-renders the whole tree

Concept: Context re-renders **every** consumer when **any** value on it changes. Zustand's selector subscriptions re-render only components whose selected slice changed. When shared state mutates often (a cart updating per keystroke, a wizard validating per field) and many consumers read **disjoint** slices, the selector model is the right shape. Senior call: this is a **profiled** trigger — measured re-render cost, not aesthetic preference. It's also the weakest of the three on its own (a four-step wizard rarely has a render-cost problem); it earns its place stacked on triggers 1-2.

**Diagram — `RenderTracking` widget (the load-bearing visual of this section).** Place it inside this trigger's subsection. Pedagogical goal: *show* the asymmetry the prose claims, so "Context re-renders everyone" stops being an abstract assertion. Use the `Implementation` toggle to contrast two strategies for the same 3-consumer tree:
- Tree: a `WizardShell` parent with three children `ContactStep`, `BillingStep`, `ReviewSummary` (or a generic `Header` / `FieldA` / `FieldB` set).
- Variant A `Context value={{ a, b, c }}` (default tab): each trigger (`update a`, `update b`, `update c`) renders `shell` + all three children — every badge ticks on every update.
- Variant B `useStore(s => s.a)` per consumer: `update a` renders only the `a` consumer; `update b` only the `b` consumer; etc.
The student clicks the triggers and watches Context light the whole subtree while selectors stay surgical. Note for the builder: this is the exact use case the `RenderTracking` component was designed against (see its doc's Chapter 082/083 example) — render counts are simulated from the `renders` mapping, which is fine; we're teaching the *shape* of the cost, not measuring a real tree. Keep it to ≤4 boxes per its guidance. Wrap nothing — the component is its own card.

Reasoning for H3 split: each trigger has a distinct "senior call" qualifier that's the actual teaching content (the triggers without their gates are what produces overreach). Separating them lets each qualifier breathe and makes them quotable in the quiz.

Term tooltips: `selector` (one-liner — "a function that reads just the slice of store state a component needs, so only that component re-renders when the slice changes"); the full treatment is lesson 2, but the word appears here and a junior won't know it yet.

### What does not clear the bar

The negative cases — equal weight to the positive ones, because the whole point is restraint. This is the section that prevents the library from sprawling. Structure: a workload → "no, use X instead" mapping, ideally a table or a tight list, each row naming the default that *does* cover it. Cover at minimum:
- A single page's form state → `useState`, or React Hook Form on the chapter 045 threshold. Not Zustand.
- Theme / locale the whole app reads from one place → Context is fine; reads are rare, no re-render problem.
- Filter / sort / search / cursor pagination → `nuqs` + Server Components (Chapter 060).
- Server state the client polls or optimistically updates → TanStack Query (Chapter 076).
- Auth session / current user → `auth()` in a Server Component, or the Better Auth client hook in a leaf.

State the senior reflex plainly: **enumerate which default the workload would otherwise use; only if every default is wrong does Zustand earn its weight.** Re-state the headline: "if `useState` covers it, ship `useState`."

Call out the two most common overreaches explicitly in prose (not a separate watch-out block — qualify the concept here): reaching for Zustand because "global state feels cleaner" (the Redux-of-the-universe trap, named); and using Zustand to cache server data the user could see go refresh-stale (that's TanStack Query's job — the "do we even own this on the client?" check, which the next-but-one section formalizes).

**Exercise — `Buckets` (the section's comprehension check).** Place it at the end of this section, because by now the student has both the positive and negative cases. Goal: classify a set of concrete SaaS workloads into the right home. Two or three buckets to keep it crisp — recommend three columns: **`useState` / lifted+Context**, **`nuqs` or TanStack Query (a default, not Zustand)**, **Zustand**. Items (mix, ~8-10): "a modal's open/closed flag owned by one component" → useState; "the invoices-list filter and sort" → nuqs; "a comment thread the client polls every 10s" → TanStack Query; "a four-step wizard's draft shared across route segments" → Zustand; "the app's theme toggle read app-wide" → lifted+Context; "a command palette opened from three disjoint subtrees" → Zustand; "the current user's session" → (a default — server `auth()`); "an accordion's expanded panel index" → useState; "a cart badge + slide-over + checkout reading one cart" → Zustand. Grading: each item lands in exactly one correct bucket. This drills the exact senior skill the lesson teaches — *mapping a workload to its owner*. (If two-column is preferred by the component's ergonomics, collapse to "A default covers it" vs "Zustand earns it" — but three columns teaches the *which* default, which is the richer lesson.)

Reasoning: the negative cases are where the senior judgment actually lives; a junior can memorize three triggers but the skill is recognizing that a given feature is *not* one of them. The `Buckets` exercise makes that recognition active.

### The cost of bringing the library in

Why the bar is high — make the trade-off concrete so "earns its weight" has teeth. Each cost shrinks the surface a senior applies it on. List (prose or tight bullets), naming each as a real recurring tax:
- **A new "where does this state live?" mental model** every future reader must learn and locate.
- **A per-feature store file** future readers must find (motivates the file-layout rule in the next section).
- **An SSR wiring trap** — on App Router a naively module-scoped store leaks one request's state into the next user's response (forward-reference the per-request rule; the *fix* is lesson 2, name only that the trap exists).
- **A `'use client'` boundary at every consumer** — the store is client-only; every component that reads it opts out of being a Server Component.
- **Reset discipline** — without an explicit reset on sign-out, org-switch, and submit-success, state leaks across sessions in the same browser tab. Forgetting it is a data-isolation bug at the client layer (parallel to the TanStack Query `queryClient.clear()` discipline the student saw in chapter 076).

Land the conclusion: these costs are why Zustand is conditional. A default has none of them. The library has to clear the *combined* cost before it's worth it — which is exactly why the three triggers are narrow.

Reasoning: juniors underweight the maintenance/architecture cost of "just add a library." Making the tax explicit is what converts the rule from arbitrary to motivated — and it sets up the reset-discipline and SSR-wiring topics that lessons 2/3 pay off, so the student arrives there already knowing *why* they matter.

Term tooltips: `SSR` (server-side rendering — "rendering the page to HTML on the server before sending it to the browser; on App Router this is the default") — non-obvious acronym a junior may not have internalized even after earlier chapters.

### One store per feature, never one global store

The chapter's load-bearing architectural rule, introduced at the moment it's earned (inline, not bundled). State it plainly as an **architectural rule**: every Zustand store has a **single feature owner** and lives next to the feature it owns. There is no `useAppStore` holding everything.

Teach by contrast with the failure mode: one `useAppStore` with twelve unrelated slices is the **2016 Redux-store-of-the-universe in fewer lines** — same coupling cost (every feature's state tangled in one module, every change a merge-conflict magnet, every consumer importing the world). Per-feature stores keep each store's surface small, locatable, and independently deletable.

Give the concrete convention:
- Naming: `useWizardStore` (onboarding wizard), `useCartStore` (cart), `useCommandPaletteStore` (palette) — each named for its one owner.
- File layout: `/lib/<feature>/store.ts`. State for a feature lives beside that feature's other code, not in a global `/store` directory.

**Diagram — small comparison illustration (HTML+CSS inside `<Figure>`, or a `TabbedContent` two-panel).** Pedagogical goal: make the contrast visual and memorable. Two side-by-side shapes:
- Left (anti-pattern, struck/dimmed): one big `useAppStore` box with twelve unrelated slices crammed in (cart, wizard, palette, theme, modal, toast, sidebar, …) and arrows from every feature pointing into it — a hairball.
- Right (the rule): three small labeled boxes `useCartStore` / `useWizardStore` / `useCommandPaletteStore`, each sitting next to its feature, no cross-arrows.
Keep it simple and horizontal (vertical-space constraint). This is a "simple visual aid that enriches the lesson," which the diagram guidance explicitly welcomes — it doesn't need to be a complex graph. A `<FileTree>` showing `/lib/cart/store.ts`, `/lib/wizard/store.ts` is an acceptable lighter-weight alternative if the box diagram feels heavy.

Reasoning: this rule is what stops the whole chapter's tooling from becoming the thing the chapter warns against. It threads through all three lessons (the continuity-relevant "per-feature scoping rule"), so it must land crisply here with a memorable visual and a file convention the student can copy.

### Do we even own this state on the client?

A short but important pre-flight check that sits logically *before* the funnel. Concept: before any of the five defaults or Zustand, ask whether the state is actually the **server's**. Examples that *look* like client state but aren't:
- A draft that must survive refresh → that's server state; write a `draft` row.
- A list view's filter → URL state.
- A comment thread → server state (TanStack Query on the chapter 076 trigger).

State the boundary that scopes Zustand: **Zustand owns client-only state that is *allowed to vanish on refresh* by product decision.** If losing it on refresh is unacceptable, it belongs on the server (with all the persistence/garbage-collection cost that implies) — not in a store. Name that "refresh loses store state" is **by design**, and that surviving refresh is a *product decision* (server persistence or `sessionStorage` via `persist`), not a library limitation. Don't drill `persist` — it's named in lesson 2; here it's only the conceptual escape hatch.

Reasoning: this check catches the single most common Zustand misuse in real SaaS code — using it as a poor man's database/cache. Putting it just before the funnel makes "is this server state?" the funnel's first gate, which is exactly the order a senior asks.

Term tooltips: none new.

### The funnel: deciding before you install

The synthesis. Everything above collapses into one ordered gate the student can run reflexively. This is the section the rest of the chapter justifies.

**Interactive — `StateMachineWalker` (`kind="decision"`, the lesson's centerpiece).** This component is purpose-built for exactly this ("trigger before tool" decision filters — see its doc's "when to reach for it"). It forces the student through the *order* a senior asks the questions, one commit at a time, which is the real lesson (the order, not any single leaf). Author the funnel as:

- Root `Question` "Is this state the server's?" → branch "Yes — it must survive refresh / it's canonical data" → `Leaf` "Server Components / Server Actions (or TanStack Query if a chapter-076 trigger applies)". Branch "No — it's client-only, may vanish on refresh" → next question.
- `Question` "Would `useState` (or `useReducer`) cover it?" → branch "One component owns it" → `Leaf` "`useState` — ship it." Branch "Shared across components" → next.
- `Question` "Do the consumers sit under one provider in one subtree, with low write frequency?" → branch "Yes" → `Leaf` "Lift state + React Context." Branch "No — disjoint/cross-route, or mutates often with many readers" → next.
- `Question` "Is it shareable view state (filter/sort/search/page)?" → branch "Yes" → `Leaf` "`nuqs` (URL state)." Branch "No" → the Zustand leaf.
- `Leaf` "Zustand earns its weight" — body restates the per-feature sub-rule: **one store per feature, never one global `useAppStore`**, file at `/lib/<feature>/store.ts`.

Each leaf body is one or two lines naming the tool and *why this branch lands there*. The walker provides its own card — do **not** wrap in `<Figure>`. Pedagogical goal: convert the prose funnel into a committed, replayable walk so the student internalizes the *sequence* of gates; this is more durable than a static flowchart they'd skim.

Optionally, mention that a static Mermaid `flowchart LR` of the same funnel could accompany it, but the walker is preferred (interactive, enforces order). Do **not** build both — the walker is the call; a redundant static diagram adds maintenance and screen height for little gain.

Reasoning: a decision lesson needs a decision artifact. The walker is the highest-leverage component for "which tool here?" content and is explicitly recommended for it. Placing it as the synthesis (after all the pieces are taught) means the student walks it with full context, not as a cold cheat-sheet.

### Why Zustand and not Redux, Jotai, or Valtio

One short paragraph per alternative — enough to justify the course's choice without a historical detour (the thesis: no historical detours, minimum viable 2026 stack). Keep each to ~2-3 sentences; this is "why this tool," not a comparison tutorial.
- **Redux Toolkit** — heavier API surface; reducer/action/dispatcher ceremony that v5 Zustand doesn't need. Pick Zustand by default in 2026; reach for RTK only if a codebase already standardizes on it.
- **Jotai** — atom-based, fine-grained, bottom-up; a different mental shape that fights the slices model. Right when state is genuinely many small independent atoms with derivation graphs — rare in SaaS UI.
- **Valtio** — proxy-based mutable API; nicer ergonomics in spots, smaller ecosystem. Note the pmndrs angle: Zustand, Jotai, and Valtio are all pmndrs projects, and Zustand is the one that fits the canonical 2026 SaaS shape (a few named per-feature stores with selector subscriptions).
- The course's call, stated once: **Zustand v5, no detours.**

Reasoning: the student building with AI agents *will* be offered these alternatives. One paragraph each gives them the "why we chose differently" so they can hold the line, without turning the lesson into a library survey. This belongs after the funnel (the student has the mental model to evaluate the comparison) and is intentionally brief.

Optional `Aside` (note): if the student's team already runs Redux, that's fine — don't rip it out to add Zustand; the chapter teaches the greenfield-2026 default.

### The screen we'll build against

The forward pointer — short, closes the lesson. Name our app's worked case once: a four-step customer-onboarding wizard at `/customers/new/step-1` … `/step-4` (contact → billing → preferences → review). State that it clears the bar (steps on disjoint route segments sharing a draft = trigger 1; progress indicator + Next button + review reading the same store = trigger 2), and that lesson 3 runs the full funnel against it while chapter 079 builds it end to end. Do **not** drill the store shape, the slices, or the wiring — that's later lessons; naming it here gives the chapter its destination.

Reasoning: the pedagogical guidelines want the introduction (and close) to preview the practical payoff. The wizard is the chapter's center of gravity; planting it here without detail keeps lesson 1 a clean decision lesson while giving the student something concrete to anticipate.

### External resources (optional, end-of-lesson `ExternalResource` cards)

If included, link the official Zustand docs/README (homepage) as the canonical reference, and optionally the pmndrs "Comparison" docs page (it directly contrasts Zustand with Redux/Jotai/Valtio/others, reinforcing the alternatives section from the maintainers' own perspective). Keep to 1-2 cards; don't link API-deep pages (those belong to lesson 2). A short YouTube overview of "when to use Zustand" via `VideoCallout` is *optional* and low-priority — only if a current, high-quality, decision-focused (not syntax-tutorial) video exists; the lesson stands without one and a syntax-heavy video would pull focus from the decision framing. Do not block on it.

## Scope

This lesson is **decision-only**. It must not teach Zustand mechanics or wiring.

Explicitly out of scope (reserved for later lessons — name forward pointers, don't teach):
- **Any Zustand API** — `create` / `createStore`, `set`/`get`, `StateCreator`, the slices *implementation*, `useShallow`, selectors-as-code, middleware (`persist`, `devtools`, `subscribeWithSelector`). All of this is **lesson 2**. The word "selector" and the *concept* of per-feature slices appear here only as framing; no code, no API surface.
- **The App Router per-request provider** (the `useRef`-pinned Context provider, the three-file shape, the `useFooStore<T>(selector)` hook). The *trap* (module-scoped store leaks across requests) is named in the cost section as a reason the bar is high; the **fix is lesson 2**.
- **The wizard's store shape, Zod-per-step gates, Server-Action submit boundary, reset implementation, back/forward behavior** — **lesson 3**. Lesson 1 names the screen and asserts it clears the bar; it does not walk it.
- **The file-by-file build, starter, verify recipe** — **chapter 079** (the project).
- **TanStack Query mechanics** — **chapter 076** (done). Referenced here only as the default that owns client-side *server* state.
- **`nuqs` / URL-state mechanics** — **Chapter 060** (done). Referenced as the default for shareable view state.

Prerequisites to redefine **concisely** (one line each, as recall — the student has these):
- The five client-state defaults and what each owns (the recall section makes this explicit; keep it one line per default).
- Server Components own read state, Server Actions own write state (Chapter 030) — assumed, glossed in one phrase where relevant.
- The four TanStack Query triggers (Chapter 076) — named, not re-derived.
- React Context re-renders all consumers on any value change — this is the *mechanism* trigger 3 rests on; restate it in one sentence (it's the load-bearing prior fact), let the `RenderTracking` widget show it rather than re-teaching Context.
- `queryClient.clear()` reset discipline at the tenancy boundary (Chapter 076) — referenced as the parallel for Zustand's reset cost; one-line callback, not re-taught.

## Code conventions notes

Per `Code conventions.md` (client-state section, lines 179-189): the hierarchy taught here matches the canon exactly — `useState` for local UI, lift only when a sibling reads it, `useReducer` at the 3+-coordinated-`useState` threshold, URL state via `nuqs`, TanStack Query only on its four triggers. The lesson's funnel is a faithful superset that adds the Zustand gate at the end. No divergence.

This lesson contains **no project code blocks** (decision lesson — the only "code" is illustrative store *names* like `useWizardStore` and file paths like `/lib/wizard/store.ts`, used as labels in prose/diagrams, not runnable snippets). When lesson 2 introduces the actual API, the `createStore`-plus-provider convention and per-feature `/lib/<feature>/store.ts` layout asserted here must hold — flagged so downstream agents keep the contract. Deliberate: showing zero Zustand syntax in lesson 1 is the pedagogical point (trigger before tool); do not let a downstream agent "helpfully" add a `create(...)` example.
