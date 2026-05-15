## Concept 1 — The three-trigger threshold against five prior defaults

**Why it's hard.** Students arrive at Zustand from one of two reflexes: tutorial-blog reflex (use it for everything, it's small and ergonomic) or anti-state-library reflex (Server Components and `useState` cover everything, libraries are bloat). Both miss the actual threshold. The senior gate is narrow: three named workloads, all client-only, all already-tried against five stronger defaults (`useState`, `useReducer`, lifted state + Context, `nuqs`, TanStack Query). The student needs to feel the funnel as a five-default *gauntlet* the candidate workload must survive, not a single yes/no on Zustand itself.

**Ideal teaching artifact.** A *Decision-as-puzzle* funnel — the same shape as 16.1's four-trigger funnel, reused with this chapter's gauntlet. The student is handed eight short scenario cards (a wizard payload across four route segments, a global command palette opened from three subtrees, a theme toggle, a filterable invoice list, a comment thread polling every 10s, a single contact form, an org sidebar collapsed flag read by header + main + footer, a cart updating per keystroke read by twelve consumers) and routed through a five-default gauntlet one node at a time: *is this server state? → would `useState` or `useReducer` cover it? → would lifted state + Context cover it (consumers under one subtree, low write frequency)? → would `nuqs` (URL state) cover it? → would TanStack Query cover it?* At each node the student commits a prediction before the path advances. Scenarios that fall out earlier are routed to the default that owns them. Only the wizard, the command palette, and the cart survive to the Zustand terminus — and the terminus labels them with which of the three triggers they hit (cross-route shared state, cross-subtree imperative action surface, selector-vs-Context re-render cost). The archetype is *operating the gate, not reading it*.

**Engagement.** A short `Buckets` round after the funnel: six new scenarios (a session read, an org switcher dropdown, an onboarding tooltip the user dismissed, a draft email being composed, a search input's debounced value, the current invoice's line-item editor) sorted into the six final defaults (`useState`/`useReducer`, lifted + Context, `nuqs`, Server Components, TanStack Query, Zustand). Confirms the trigger names stuck and that Zustand is the rare terminus, not the default.

**Components.**
- Existing `DecisionFunnel` (proposed in Chapter 16.1) with a Zustand-flavored scenario set and a five-node gauntlet. The component was already designed for reuse across conditional-tool chapters; this is its second canonical use.
- `Buckets` for the six-default sort.

## Concept 2 — Per-feature stores, never the store of the universe

**Why it's hard.** Once a student sees how clean Zustand's API is, the gravitational pull is to make one `useAppStore` with twelve slices. That's Redux-store-of-the-universe in fewer lines, with the same coupling cost: every feature reads every slice's types, every refactor risks cross-feature breakage, the store file becomes the dumping ground for any state nobody knew where to put. Architectural Principle #6 lands here, and prose alone won't carry it — the student has to see the two shapes side by side and feel which one survives a year of feature work.

**Ideal teaching artifact.** A *side-by-side codebase tour* of two `/lib` layouts for the same fictional SaaS (wizard, cart, command palette, sidebar, theme). The left pane is the universal-store shape: one `useAppStore.ts` file with five interleaved slices, every consumer importing the same hook, the type surface ballooning as features are added. The right pane is the per-feature shape: `/lib/wizard/store.ts`, `/lib/cart/store.ts`, `/lib/command-palette/store.ts`, each a self-contained three-file folder (`store.ts`, `store-provider.tsx`, `use-foo-store.ts`). A toggle adds a new fictional feature (a global toast surface) to each layout; on the left, the student watches the universal-store file grow another slice and another import in unrelated consumers; on the right, a new folder appears and nothing else moves. The archetype is *anatomy-with-ablation* — adding a feature is the ablation, the cost shows up structurally.

**Engagement.** A `MultipleChoice` after the comparison: three scenarios ("a new feature needs a draft state shared across two routes", "two existing features now both need read access to the same flag", "the cart needs to be removed when the e-commerce module is sunset") — pick which layout makes each operation cheap. Confirms the per-feature rule was felt as structural rather than aesthetic.

**Components.**
- New component: `CodebaseLayoutComparison` — props: two `FileTree`-like panels with optional per-node annotations and a "before/after a new feature is added" toggle that diffs the two layouts. Wrapped in a `Figure`.
- Alternative: two `FileTree` blocks inside `TabbedContent` ("universal" vs. "per-feature"), with the "add a feature" beat shown as a second tab pair underneath. Less interactive but covers the same ground.
- `MultipleChoice` for the structural-cost check.

## Concept 3 — `create` looks idiomatic and silently leaks across requests

**Why it's hard.** Module-scoped `const useWizardStore = create((set) => ({ ... }))` is the canonical Zustand snippet in every tutorial and the first thing a senior would reach for in a Vite or CRA app. On the App Router server, that same snippet is a cross-tenant data-isolation bug — request A's wizard draft survives into request B's render on the same Node process. The bug is invisible in dev with one user; it surfaces in production with traffic. The student has already met this shape in 16.1.3 with `QueryClient`; the surprise here is that *the same trap recurs in a different library* and the fix has a different name.

**Ideal teaching artifact.** A *misconception-first ambush*, structured to deliberately echo Chapter 16.1.3's `QueryClient` reveal so the student feels the pattern. The lesson opens with a 10-line snippet that looks idiomatic — `const useWizardStore = create<WizardState>()((set) => ({ ... }))` at module scope in `lib/wizard/store.ts`, imported by the four step pages. The student is asked: *"Two admins in two different orgs hit `/customers/new/step-1` within the same second on the same Node process. What does admin B see when their page renders?"* They commit a `MultipleChoice` answer before the reveal. The reveal is a two-pane scrubbable sequence diagram: pane A shows two concurrent requests sharing the module-scoped hook — admin A fills the contact step, admin B's render reads the same hook and inherits admin A's draft as initial state; pane B shows the same two requests under the `createStore` + provider pattern, each request receiving its own freshly-constructed store. The student names the parallel out loud: same shape as the `QueryClient` leak, different library, same fix family.

**Engagement.** A `Tokens` round on the broken snippet: click the token that makes this code module-scoped (the top-level `const`), click the token that *would* make it per-request (the `createStore` call inside a Client Component provider, shown beneath as the contrast). Confirms the student can name the load-bearing token, not just the symptom.

**Components.**
- `MultipleChoice` for the pre-reveal prediction.
- `DiagramSequence` for the two-pane two-request scrub. The `DiagramSequence` precedent from 16.2.2's request-isolation visualization is reused; the same shape carries the same misconception in a different library.
- `Tokens` for the post-reveal token-identification round.

## Concept 4 — Selectors as the subscription contract, not as syntax

**Why it's hard.** Newcomers write `useWizardStore((s) => s)` because it's the shortest call that compiles, and the page works in dev — every state change re-renders every consumer, but with three components the cost is invisible. The selector model only matters once dozens of consumers read disjoint slices on a frequently-mutated store; by then the re-render storm is a profiler problem the student doesn't know how to read. The senior reflex (atomic selectors by default, `useShallow` only when returning a fresh object/array, never select the whole store) has to be wired in *before* the cost is felt, which means teaching it as a contract, not as an optimization.

**Ideal teaching artifact.** A *controllable explorable* — a small live wizard surface with a re-render heatmap. Three components share one store: the header progress indicator (reads `currentStep`), the contact-step email field (reads `contact.email`), the footer Next button (reads `currentStep` + the current slice's validity). The student picks among four selector strategies via a tab toggle: (1) whole-store selection `(s) => s`, (2) returning a new object literal `(s) => ({ email: s.contact.email })`, (3) atomic per-field selectors, (4) `useShallow` wrapping the object literal. As the student types into the email field, the heatmap flashes which components re-rendered on each keystroke. Strategy (1) flashes all three on every keystroke. Strategy (2) flashes all three (new literal reference). Strategy (3) flashes only the email field. Strategy (4) flashes only the email field, with the multi-field selection still terse. The student feels the difference — the model is no longer abstract. The archetype is *explorable simulator* of the kind Bartosz Ciechanowski would build for a subscription system.

**Engagement.** A `MultipleChoice` after the explorable: three scenarios ("a component reads three independent fields from the same slice", "a component reads a list of items mapped from a slice", "a debug panel wants to display the entire store") — pick the right selector strategy. The whole-store case is the trap — only the debug panel is allowed it, and even there the student should reach for the devtools middleware instead.

**Components.**
- New component: `SelectorRerenderHeatmap` — props: a small store definition, a set of consumer components with their selectors, a typed-in trigger (an input bound to one slice field). Renders each consumer with a flash overlay on render and a per-consumer render-count badge. The selector strategy is switched via a tab control above the components.
- Alternative: a `DiagramSequence` walking four pre-baked traces (one per strategy) with a frozen render-count table per strategy. Less visceral but ships fast.
- `MultipleChoice` for the strategy-picker drill.

## Concept 5 — Slices and `StateCreator` typing as a composition contract

**Why it's hard.** Tutorial-grade Zustand examples show one big object inside `create((set) => ({ ... }))` and stop there. The senior shape is composition: each slice is a factory in its own file, the full store is `(...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ... })`, and the `StateCreator<Store, Mws, Mws, Slice>` generic threads the full-store type into each slice's `set` and `get`. Skipping the generic is the moment every slice tutorial ends up with `any` or duplicated type definitions. The student needs the *shape* of the type flow, not the alphabet soup of generics.

**Ideal teaching artifact.** A *Pattern* artifact rendered as a labeled three-file decomposition. File 1 is `wizard-types.ts` exporting four slice types and the composed `WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`. File 2 is one slice (`contact-slice.ts`) with its `StateCreator<WizardState, [], [], ContactSlice>` signature highlighted — the second and third generic positions (the middleware tuples) called out as load-bearing for `set`/`get` typing, the fourth as the slice's local return shape. File 3 is `store.ts` showing the composition `createStore<WizardState>()((...a) => ({ ...createContactSlice(...a), ... }))` with the `...a` spread explicitly annotated as "the same `(set, get, store)` tuple that each slice was typed to receive." Beside the three files, a small *type-flow arrow diagram* shows how `WizardState` flows top-down into each slice's generic position so each slice's `set` writes against the full store, not just its own keys. The student doesn't memorize the generic — they read the dataflow once and the snippet becomes copy-able.

**Engagement.** A `Dropdowns` exercise on a fresh slice (`billing-slice.ts`) with four blanks: the `StateCreator` generic positions and the `set` call's payload shape. The student picks the correct full-store type, the empty middleware tuples, and the slice-local type. Confirms the type flow was internalized as a pattern that survives a fresh slice, not a single read of one file.

**Components.**
- `AnnotatedCode` for the three-file walkthrough, with the generic positions highlighted step by step.
- `Figure` wrapping a hand-SVG of the type-flow arrows from `WizardState` down into each slice's `StateCreator` slot.
- `Dropdowns` for the fill-in-the-blank slice.

**Project link.** Lesson 16.4.3 (Build the store skeleton) is the build of exactly this pattern — the student writes the four slice factories with the same `StateCreator` shape this concept rehearses.

## Concept 6 — The per-request provider as the fix that makes routed state work

**Why it's hard.** The student now knows module-scoped is the bug (Concept 3). The fix isn't "wrap in a function" — it's a specific three-file pattern: a `createWizardStore(initialState)` factory using vanilla `createStore`, a `WizardStoreProvider` Client Component that calls the factory once via `useRef`, and a typed `useWizardStore<T>(selector)` hook that reads the store off Context and calls `useStore(store, selector)`. Three subtleties all bite: `useRef` not `useState` (state would re-create on every render before commit), the provider on the *shared layout* not on each step page (or it resets on navigation), and the typed hook generic not `s => s` (or the subscription model is defeated). Each subtlety has its own canonical bug.

**Ideal teaching artifact.** A *wrong-by-default sandbox* in three rounds. Round 1: the student opens a starter where the provider sits on each step page. They fill step 1, click Next, watch step 2 mount — and the store has reset to initial state. The repair is to move `<WizardStoreProvider>` up to `app/customers/new/layout.tsx`. Round 2: the starter uses `useState` instead of `useRef` to hold the store. The student types into the email field, watches the entire wizard flicker on every keystroke because the store is being re-constructed each render. The repair is `useRef`. Round 3: the typed hook is written without a generic — `useWizardStore` returns the whole store object. The student types into one field, the re-render heatmap from Concept 4 lights up across all consumers. The repair is the `<T>(selector: (s: WizardState) => T)` signature that forces every call site to subscribe to a slice. Three rounds, three canonical bugs, three repairs — each one points at a load-bearing line in the canonical pattern. The archetype is *Pattern-as-repair* across three small failures rather than one monolithic walkthrough.

**Engagement.** The three repairs *are* the assessment — each round's test passes when the canonical bug stops firing. Follow-up beat: a `Matching` exercise pairing four pieces (`createStore`, `useRef`, the shared-layout placement, the `<T>(selector)` hook signature) with the four canonical bugs each prevents (cross-request leak, per-render store re-construction, store reset on navigation, whole-store subscription storm). Confirms the load-bearing role of each piece.

**Components.**
- `ReactCoding` in test mode (or three small ones in sequence) — student edits the provider placement, the `useRef`/`useState` choice, and the hook generic; tests verify the bugs stop firing.
- `Matching` for the role-to-bug drill.

**Project link.** Lesson 16.4.3 builds the production version of this provider; the verify recipe in 16.4.6 flips a debug flag to reproduce each of the three canonical bugs from this concept.

## Concept 7 — Running the three-trigger funnel against the routed wizard

**Why it's hard.** Even with the threshold concept landed (Concept 1) and the primitives in hand, the student's next move on a real screen is often wrong: they reach for `useState` + lifted state on the customer wizard ("it's just four forms") or they reach for URL state ("the steps are routed, so the data should be"). Both fail for non-obvious reasons. The student needs to feel the funnel actually firing on this specific surface — *why* lifted state fails when steps are routed, *why* URL state fails for PII and draft semantics, *why* server state is the wrong answer for an unsubmitted draft — before they accept that the wizard is the rare case where Zustand is genuinely correct.

**Ideal teaching artifact.** A *guided architectural sketch* of the wizard surface. The student is shown the four route segments as a wireframe stacked vertically (`/step-1` contact, `/step-2` billing, `/step-3` preferences, `/step-4` review) with the shared `/customers/new` layout drawn as the outer frame. For each of the five candidate state homes (lifted state in a parent Client Component, lifted state in the layout, URL state via `nuqs`, server state as a `customer_drafts` table, in-memory Zustand store on the layout), the student commits a guess ("does this fit?") and immediately gets the senior call with a one-line reason: lifted state can't span routes because the page-level Client Components unmount; URL state leaks PII to logs, history, and analytics; server state requires a drafts table with garbage-collection that's out of scope; Zustand on the layout survives navigation because the provider sits on the shared frame. The five-candidate sweep is the lesson — Zustand isn't the answer because it's the only one, it's the answer because the other four each fail for a specific named reason. After the sweep, the three triggers from Concept 1 are re-applied to the wizard surface: cross-route shared state (fires), imperative action surface across disjoint subtrees (fires for the header progress + footer Next + step-4 submit), selector-vs-Context cost (weakest of the three, named as such honestly).

**Engagement.** The per-candidate commit *is* the assessment — the student doesn't read about why each alternative fails, they predict and check. Follow-up beat: a single `MultipleChoice` framing the inverse question — "if the wizard were a single-route modal (not routed across four segments), which of the five state homes becomes the correct choice?" (correct: lifted state in the modal component; Zustand stops earning its weight the moment the cross-route trigger drops out). Confirms the trigger is what flips the choice, not the wizard concept itself.

**Components.**
- New component: `CandidateSweep` — props: a wireframe (image or SVG) plus a set of "candidate" entries each with a description, a predict button, and a senior-call reveal. Renders the wireframe, accepts per-candidate predictions, and reveals each verdict with its named reason as the student advances.
- Alternative: a sequence of five `MultipleChoice` blocks (one per candidate) plus a `Figure`-wrapped final wireframe annotated with the winning choice. Less integrated but covers the same teaching.
- `MultipleChoice` for the single-route-modal inverse question.

**Project link.** Lesson 16.4.1's project brief frames the build on this exact decomposition — the structural decisions called out there (shared-layout provider, vanilla `createStore`) are the consequences of this concept's sweep.

## Concept 8 — The submit boundary and the three resets at tenancy

**Why it's hard.** Two tightly-coupled traps. First, the student's reflex is to make the wizard store *own* the submit — call the action from inside a store action, await the database, update the store with the new customer ID. That collapses the store/action separation: stores are client-only and shouldn't talk to the database, actions own audit logs and `revalidateTag`, the new customer ID is server state and belongs in the URL via redirect. Second, even with the submit boundary correct, students forget to reset the store after success and after tenancy boundaries (sign-out, org-switch). Without the reset, the next "create another customer" shows the previous customer's draft; after an org switch, the previous org's wizard payload haunts the new org's session. The same shape as `queryClient.clear()` from 16.1.3, applied to the Zustand surface.

**Ideal teaching artifact.** A *two-track flow diagram* of the submit lifecycle, paired with a *reset boundary checklist*. The flow diagram has three columns: the wizard store (left), the Server Action (middle), the URL/router (right). Beat by beat, the student steps through what fires where: the user clicks Submit on step 4 → the client reads `contact + billing + preferences` from the store via `useShallow` → the Server Action receives the composite payload, re-parses with the same Zod schema, writes the `customers` row, writes the audit log, returns the `Result` → the client awaits, calls `wizardStore.reset()`, calls `router.push('/customers/[newId]')`. A toggle removes the reset; the student watches a "create another" replay show the previous draft. A second toggle removes the `useShallow`; the student watches a re-render storm fire on the read. The diagram makes the boundary visible as a structural seam, not as prose.

The second beat is a *boundary checklist*: three reset triggers (submit-success on step 4, sign-out via Better Auth, org-switch via the 10.1 surface) lined up next to the parallel TanStack Query reset (`queryClient.clear()` on org-switch). The student sees the reset discipline as a *cross-cutting tenancy concern* that every client-side cache must honor — Zustand stores are the third example in the curriculum (after Server Component cache, after TanStack Query).

**Engagement.** A `Buckets` sort after the diagram: ten state lifecycles (a successful submit, an action returning a validation error, the user clicking the logo to leave the wizard mid-flow, sign-out, org-switch, a hard refresh, a back-button to step 2 from step 3, a tab close, the `<Provider>` unmounting on route exit, an action throwing) sorted into four buckets: "store resets explicitly", "store is discarded when its provider unmounts", "store survives untouched", "store should survive but doesn't and that's a bug." Confirms the student knows which lifecycle each event triggers and which ones require code to do the right thing.

**Components.**
- `Figure` wrapping a hand-SVG three-column flow diagram with two ablation toggles (reset off, `useShallow` off) for the submit lifecycle. Single-use within the chapter — `Figure` + SVG is the right vehicle.
- `Figure` wrapping a hand-SVG of the reset-boundary checklist with the TanStack Query parallel labeled. Single-use, `Figure` + SVG.
- `Buckets` for the ten-lifecycle sort.

**Project link.** Lesson 16.4.5 builds this exact submit handler and reset call; the verify recipe in 16.4.6 walks the action-failure case (keeps the draft, no reset) and the success case (reset + redirect) clause by clause.

---

## Component proposals

- **`CodebaseLayoutComparison`** — two `FileTree`-like panels with optional per-node annotations and a "before/after a new feature is added" toggle that diffs the two layouts. Wrapped in a `Figure`.
  - Uses in this chapter: Concept 2.
  - Forward-links: Chapter 7.4 (per-form-feature vs. one global form module — same shape), Unit 17's error-discipline chapters (per-feature error boundaries vs. one global one), Chapter 11's route-group decisions. The "structural cost of a centralized vs. distributed shape" is a recurring senior-mindset move.
  - Leanest v1: two static `FileTree` blocks rendered side by side with a single "before/after" toggle baked into one fixed scenario. No general authoring API; second use rewrites if the abstraction matters.

- **`SelectorRerenderHeatmap`** — a small store definition, a set of consumer components with their selectors, a typed-in trigger (an input bound to one slice field). Renders each consumer with a flash overlay on render and a per-consumer render-count badge. Selector strategy switched via tabs above the consumers.
  - Uses in this chapter: Concept 4.
  - Forward-links: Chapter 7.3.5's `useOptimistic` could re-use the heatmap shape for "which components rendered on the optimistic write," and any future React performance chapter (memoization, `useMemo`, server-component re-render scoping) inherits the same visualization.
  - Leanest v1: a hardcoded three-consumer wizard surface with the four strategies as radio buttons, no general authoring API; render-count badges and a flash class on each consumer's wrapper. If even that is too costly, demote to the `DiagramSequence` alternative with pre-baked traces.

- **`CandidateSweep`** — a wireframe (image or SVG) plus a set of "candidate" entries each with a description, a predict button, and a senior-call reveal. Renders the wireframe, accepts per-candidate predictions, and reveals each verdict with its named reason as the student advances.
  - Uses in this chapter: Concept 7.
  - Forward-links: Chapter 13's payments architecture (Stripe vs. own checkout vs. third-party — same shape), Chapter 14's email transport choice, Unit 17's session-storage candidate sweep (cookies vs. localStorage vs. server session). The "sweep five candidates, name why four fail" decomposition is a senior-mindset reusable across architectural lessons.
  - Leanest v1: a fixed wireframe image with five candidate buttons in a list, each button revealing a prose verdict on click; no general authoring API. Promote to a general component on the second reuse.

## Build priority

Three new components, in priority order:

`CandidateSweep` is the highest-leverage proposal — Concept 7 is the chapter's bridge into the project and the "predict-five-candidates" shape is the most reusable architectural-decision pattern across the curriculum. Worth building as a general component with a clean authoring API, even at v1 scope.

`SelectorRerenderHeatmap` is second — Concept 4 is the chapter's most viscerally-teachable concept (the re-render storm is the bug every Zustand newcomer writes) and the heatmap shape carries beyond Zustand into general React performance teaching. Build v1 hardcoded; promote on the third reuse.

`CodebaseLayoutComparison` is third — Concept 2 lands its lesson with the structural comparison, but the forward-link surface is narrower than the other two. Acceptable to ship as the v1 static-toggle version and revisit if a third use materializes.

The `DecisionFunnel` reuse for Concept 1 is not a new component — it's the second canonical use of Chapter 16.1's proposal, and the highest argument for that component's build priority is precisely this re-use landing here.

## Open pedagogical questions

- Concept 3's misconception-first ambush leans on the student remembering the `QueryClient` leak from 16.1.3 well enough to feel the parallel. If 16.1.3's prerequisite hasn't landed cleanly (the leak being abstract for students who haven't run multi-tenant traffic), the parallel falls flat and the concept has to teach the bug shape from scratch — which would double its length.
- Concept 4's heatmap explorable is the most ambitious artifact in the chapter and the one most likely to slip schedule. The pre-baked `DiagramSequence` alternative carries the teaching but loses the "feel the storm" beat; worth a deliberate decision before authoring.
- Concept 8's reset-boundary checklist treats the TanStack Query parallel as load-bearing; if 16.1.3's `queryClient.clear()` discipline lesson hasn't been authored yet (or has been authored differently than this concept assumes), the cross-cutting framing needs a re-read against the actual prose.
