## Concept 1 — The four-trigger funnel as the threshold gate

**Why it's hard.** Students who've used React Query before will reach for it on reflex; students who haven't will either over-adopt it (because every tutorial uses it) or under-adopt it (because Server Components feel sufficient for everything). The gate is the missing piece — a senior brings the library in only when the workload sits in a specific shape, and that shape has exactly four names.

**Ideal teaching artifact.** A *funnel-as-decision-tool* artifact, not a static flowchart. The student is handed five short scenario cards (a filterable list, an optimistic toggle, a notification badge polling every 10s, a deep-scroll feed, a single-form CRUD page) and routed through a four-question funnel one node at a time: *is this server state? → would Server Components plus `router.refresh()` cover it? → would `useOptimistic` cover it? → would Server-Component cursor pagination cover it?* At each node the student commits a prediction (would this scenario fall through this node?) before the path advances. Scenarios that fall out of the funnel name the default they belong to (`nuqs`, `useOptimistic`, plain `useState`); only the ones that survive every gate earn TanStack Query. The archetype is *Decision-as-puzzle* — the student isn't reading the gate, they're operating it. Pair the funnel with the four-trigger summary diagram so the named triggers (polling, cross-view caching, optimistic-with-rollback into cached queries, infinite scroll with reuse) crystallize as labels after the operating experience.

**Engagement.** A short `Buckets` round after the funnel: six new scenarios (a session read, a comment thread, a sidebar filter, a job-status panel, a settings form, an infinite chat) sorted into the four defaults plus "TanStack Query." Confirms the trigger names stuck, not just the funnel mechanics.

**Components.**
- New component: `DecisionFunnel` — author supplies the funnel nodes (question + branch labels) and a set of scenario cards each tagged with the path they take; the student picks a scenario, predicts its path one node at a time, and sees the verdict at the terminus. The four-trigger summary sits in a `Figure`-wrapped mermaid flowchart underneath.
- Existing fallback for the summary: mermaid flowchart inside `Figure`.
- `Buckets` for the post-funnel sort.

---

## Concept 2 — The cost ledger that makes the gate matter

**Why it's hard.** Without an internalized cost, the four-trigger funnel reads like an arbitrary checklist. The student needs to feel why a second cache, a second invalidation surface, a second mental model for "where does this data live," and a forced Client Component boundary are real prices, not bureaucratic warnings.

**Ideal teaching artifact.** A side-by-side *two-system layout* of the same feature: left column shows the feature implemented with Server Components plus a Server Action (one cache, one invalidation call, server-rendered leaf); right column shows the same feature implemented with TanStack Query (two caches, two invalidation calls, Client Component boundary, `<HydrationBoundary>`, `QueryClientProvider`). The student isn't asked to prefer one — they're asked to count. Annotations call out each surface area the right-hand version adds: the cache box, the `invalidateQueries` call, the `'use client'` directive, the provider wiring, the `staleTime` tuning seat. Archetype: *Cost-ledger comparison* — a Decision-archetype variant where the artifact carries the tradeoff visually rather than in prose.

**Engagement.** A two-question `MultipleChoice` immediately after the comparison: (1) which surfaces does TanStack Query add that the default stack doesn't? (multi-select, correct answers are the boxes the diagram highlighted); (2) which of those is the one the chapter most warns about? (the cross-request leak on the server, foreshadowing Concept 8). Locks the cost in as named surfaces.

**Components.**
- `TabbedContent` with two panels (Server Components shape vs. TanStack Query shape), each panel containing a hand-SVG `Figure` showing the layered architecture with the added surfaces highlighted. Single-use composition, no new component needed.
- `MultipleChoice` for the post-comparison check.

---

## Concept 3 — Query keys as the cache contract

**Why it's hard.** Query keys look like trivia until the student writes their first `invalidateQueries` and misses because the key shape didn't match the query's key. The senior pattern (a `queryKeys.ts` helper, hierarchical arrays, no raw arrays in feature code) feels like over-engineering until you see what flat or inconsistent keys break.

**Ideal teaching artifact.** A *wrong-by-default sandbox* the student repairs. The starting code has three queries (`['comments', invoiceId]`, `['comments-list', invoiceId]`, `['invoiceComments', invoiceId]`) and one mutation that calls `invalidateQueries({ queryKey: ['comments'] })`. The student runs it, sees that only one of the three lists actually refetches, then is asked to repair the call sites so every list shares one hierarchical key built from a `commentKeys` helper. The repair is small but the symptom (the refetch silently misses) is exactly the production bug the discipline prevents. Archetype: *Pattern-as-repair* — the student fixes a real symptom, not a hypothetical one. After the repair, a short prose beat surfaces the parallel to `tags.ts` from 15.1.1.

**Engagement.** The repair itself is the assessment — the test in the sandbox passes when all three lists refetch on one `invalidateQueries` call. Follow-up: a one-question `MultipleChoice` on *why* hierarchical keys matter (because `invalidateQueries({ queryKey: ['comments', invoiceId] })` matches both `['comments', invoiceId]` and `['comments', invoiceId, { sort }]`), confirming the prefix-match rule was internalized, not just pattern-matched.

**Components.**
- `ReactCoding` in test mode — student edits the key shapes and the helper, tests verify all three queries refetch on a single invalidation.
- `MultipleChoice` for the prefix-match follow-up.

---

## Concept 4 — `useQuery` semantics: `isPending` vs `isFetching` and the `staleTime` default

**Why it's hard.** `isPending` and `isFetching` look interchangeable in a quick read of the docs, and the library's default `staleTime: 0` produces refetch storms on tab focus that students attribute to bad luck rather than a misconfigured default.

**Ideal teaching artifact.** A *controllable simulator* of a single `useQuery` against a fake endpoint. The student gets three sliders/toggles: `staleTime` (0, 30s, 60s), a "switch tab and back" button (simulates window-focus), and a "mount/unmount the component" button. The simulator's right pane shows a live trace: when did a network request fire, what was `isPending`, what was `isFetching`, what did the user see (skeleton vs. subtle spinner vs. nothing). The student plays — drops `staleTime` to 0, focuses the tab twice, watches the refetch storm; bumps it to 60s, watches the storm collapse to one initial fetch. They feel the default's wrongness for SaaS reads before reading the prose that names it. Archetype: *Explorable simulator* — the kind of interactive Bartosz or Josh would build for this.

**Engagement.** A `PredictOutput`-shaped round after the simulator: three scenario cards ("`staleTime: 0`, user switches tab three times in 90s — how many network requests fired?", etc.); the student predicts, then runs the simulator to verify. Three predictions, three runs, then the prose names the senior SaaS default of `60_000`.

**Components.**
- New component: `QueryLifecycleSimulator` — props: `staleTimeOptions`, `gcTimeOptions`, `actions` (focus, mount/unmount, manual refetch). Shows a timeline of network requests, the `isPending`/`isFetching` booleans over time, and the rendered UI state at each beat.
- `PredictOutput` for the prediction round.
- Alternative if the simulator slips schedule: a `DiagramSequence` walking three pre-baked timelines (default, 30s, 60s) with the same trace pane as a static SVG per step.

---

## Concept 5 — The `useMutation` five-callback lifecycle

**Why it's hard.** The five callbacks (`mutationFn`, `onMutate`, `onError`, `onSuccess`, `onSettled`) look like an oversized API for "make a POST request" until the student has to reason about *when* each one fires and *what `context` flows between them*. The cancel-queries-before-write step is invisible to anyone who hasn't seen the race it prevents.

**Ideal teaching artifact.** A *scrubbable timeline diagram* of one mutation's lifecycle. The horizontal axis is wall-clock time; the vertical axis is the five callbacks plus the network request plus the cache state. The student scrubs a slider from "user clicks submit" through to "settled" and watches each callback fire in order, with the `context` value flowing as a labeled arrow from `onMutate`'s return into `onError`'s argument. A second toggle on the timeline simulates failure — the student scrubs again and sees `onError` fire with the context, `onSuccess` skipped, `onSettled` fired anyway. Then a third toggle adds a *concurrent refetch* (a poll fires mid-mutation) — without `cancelQueries`, the refetch response overwrites the optimistic write; with `cancelQueries` on, the timeline shows the in-flight refetch being aborted. Archetype: *Scrollytelling lifecycle* in the Distill style — the student drives the time axis.

**Engagement.** A `Sequence` exercise after the timeline: six events (`mutationFn` starts, `onMutate` returns context, network request flies, network responds 500, `onError` fires with context, `onSettled` fires) dragged into firing order. Locks in the lifecycle order independent of the timeline scrubbing.

**Components.**
- New component: `MutationTimeline` — props: `callbacks` (which fire), `outcome` (`success` | `failure`), `concurrent` (whether a poll races). Renders a scrubbable horizontal timeline with the callback events, network arrow, cache state, and the `context` flow.
- Alternative: `DiagramSequence` with three pre-baked timelines (success, failure, race-with-cancel) as discrete steps — less rich but ships faster.
- `Sequence` for the lifecycle drill.

---

## Concept 6 — The optimistic two-shape decision

**Why it's hard.** v5 ships two ways to do optimistic updates and they're not interchangeable. The "via variables" shape is simpler but breaks down when the optimism has to flow into a cached infinite query; the "cache-update" shape is more powerful but easy to write wrong (forgetting the cancel, forgetting the snapshot, forgetting the restore). The student needs the *decision*, not a survey of both APIs.

**Ideal teaching artifact.** A *side-by-side controllable demo*: same user-visible feature (add a comment, see it appear optimistically, roll back on failure) implemented twice in tabs. Each tab has a "force failure" button. In the "via variables" tab, the optimistic row renders inline from `variables` and vanishes automatically on settle — the student forces failure, watches the row disappear with no rollback code. In the "cache-update" tab, the same feature has `onMutate` snapshot, `setQueryData` write, `onError` restore, `onSettled` invalidate — the student forces failure, watches the rollback fire from the explicit restore. A third tab shows the *breakdown case*: the same feature where the optimistic row must appear inside an infinite query's first page. The "via variables" version fails (the inline row renders but the cache doesn't see it, so a coworker's incoming poll insert pushes it down weirdly); the "cache-update" version works. Archetype: *Comparative explorable* — the student doesn't pick between two APIs in the abstract, they watch each one break or hold in the scenario that flips the decision.

**Engagement.** A `MultipleChoice` after the demo: three scenarios ("single optimistic toggle on a server-rendered list", "comment thread with infinite scroll", "favourite-star that must persist across navigations") — pick the shape. Confirms the trigger that flips the choice was felt, not just the syntax.

**Components.**
- `TabbedContent` with three panels containing `ReactCoding`-in-exploration-mode demos plus inline force-failure buttons.
- `MultipleChoice` for the scenario sort.
- Alternative if `ReactCoding` doesn't fit cleanly into `TabbedContent`: three separate `ReactCoding` blocks with shared prose framing the comparison.

---

## Concept 7 — `useInfiniteQuery` and the `maxPages` memory cap

**Why it's hard.** Infinite scroll feels like "pagination but smoother" until the student realizes the cache holds every page they've ever scrolled past. On a chat-style thread the user opens twice a day, that's hundreds of pages held forever. `maxPages` is the cap — but the student needs to feel the unbounded shape first.

**Ideal teaching artifact.** An *interactive cache-state visualizer* of a `useInfiniteQuery` scrolling through a long thread. The left pane is the rendered comment list; the right pane shows `data.pages` as a stack of page boxes with their cursor and row count. The student clicks "Load older" repeatedly, watches pages accumulate on the right; a memory counter ticks up. Then they toggle `maxPages: 10` — the next "Load older" drops the oldest page from the stack, the memory counter stops climbing. They scroll back up; the dropped page refetches and reappears. Archetype: *State-inspector explorable* in the Lin Clark "show the actor's notebook" tradition — the cache is the protagonist.

**Engagement.** Two `TrueFalse` statements after the visualizer: "Without `maxPages`, a `useInfiniteQuery` cache can grow unboundedly across a session" (true); "`maxPages: 10` prevents the user from scrolling back past the tenth page" (false — pages refetch on re-entry). Confirms the memory cap's meaning and that scrolling back still works.

**Components.**
- New component: `InfiniteQueryInspector` — props: `pages` (or a generator), `maxPages` (configurable). Renders the rendered list, the `data.pages` stack, the memory counter, and the load-older / scroll-back controls.
- Alternative: hand-SVG `Figure` showing two states (unbounded stack vs. capped stack) side by side, with a short live `ReactCoding` demo of `maxPages` on a smaller dataset. Less visceral but ships fast.
- `TrueFalse` for the post-visualizer check.

---

## Concept 8 — The per-request `QueryClient` trap

**Why it's hard.** Module-scoped singletons are idiomatic in Node and idiomatic in client-only React. In a Server Component world, a module-scoped `new QueryClient()` is a multi-tenant data-isolation bug — request A's cache leaks to request B's render, and the student sees another tenant's comments on their invoice page. The bug is invisible in development with one user; it shows up in production with traffic. The senior reflex (per-request via React's `cache()` on the server, singleton on the client, branching on `typeof window`) is the fix.

**Ideal teaching artifact.** A *misconception-first ambush*. Open with a 12-line snippet that looks idiomatic — `const queryClient = new QueryClient()` at module scope in `lib/query-client.ts`, imported by the Server Component page, the provider, and the prefetch call. The student is asked: *"In dev, one tenant, this works fine. In production, with two concurrent requests from different orgs, what does tenant B see?"* They commit a `MultipleChoice` answer before the reveal. The reveal is a sequence diagram showing two concurrent requests on the same Node process sharing the module-scoped instance: tenant A prefetches their comments, the cache holds them; tenant B's request arrives mid-render, calls `prefetchQuery` with the same key, hits the cache, and sees tenant A's rows. Then the fix lands: a `getQueryClient()` helper with the `typeof window` branch, the server branch wrapped in React's `cache()` to get per-request scoping, the client branch using a module-scoped singleton. Archetype: *Misconception-first reveal* — the bug is the lesson; the fix is the relief.

The second beat: a *trust-store walkthrough* of the actual file. The student steps through `getQueryClient` line by line in `AnnotatedCode`, with the `typeof window` branch highlighted as the load-bearing line and the React `cache()` wrapper highlighted as the per-request seam.

**Engagement.** A `Tokens` round on the final `getQueryClient` snippet: click the line that prevents the cross-request leak (the `cache()` wrapper), click the line that keeps the client cache stable across renders (the module-scoped singleton), click the branch that decides between them (`typeof window`). Confirms the three load-bearing tokens are recognized, not just the file shape.

**Components.**
- `MultipleChoice` for the pre-reveal prediction.
- `Figure` wrapping a mermaid sequence diagram for the two-request leak scenario.
- `AnnotatedCode` for the `getQueryClient` walkthrough.
- `Tokens` for the post-walkthrough recognition check.

---

## Concept 9 — The SSR-hydrated initial-data shape

**Why it's hard.** The student has internalized "Server Components fetch, Client Components render." `useQuery` reads on the client. Without hydration, the page either shows a loading skeleton on every initial paint (Server Component renders nothing, Client Component fires cold) or duplicates the fetch (Server Component renders the data, Client Component re-fetches on mount). The hydration boundary is the seam that makes one fetch land in both places.

**Ideal teaching artifact.** A *data-flow diagram with a "what if" toggle*. The diagram shows the four actors stacked vertically: the request, the Server Component page, the `<HydrationBoundary>`, the Client Component leaf. Arrows show the data path: `prefetchQuery` on the server fills the per-request `QueryClient`, `dehydrate()` serializes it, the boundary deserializes it into the client cache, the Client Component's `useQuery` reads from the populated cache on first render — no cold fetch. A toggle lets the student remove the boundary and watch the data path collapse: the Server Component still fetches (wasted), the Client Component fires its own cold request anyway. A second toggle removes `prefetchQuery` and shows the loading-skeleton initial paint. The student feels each piece's load-bearing role by removing it. Archetype: *Anatomy-with-ablation* — the diagram earns its parts by showing what breaks without them.

**Engagement.** A `Matching` exercise: four roles ("populates the server-side cache per request", "serializes the cache for transport", "deserializes the cache on the client", "reads from the populated cache on first render") matched to four pieces (`prefetchQuery`, `dehydrate`, `<HydrationBoundary>`, `useQuery`). Confirms the seam ownership.

**Components.**
- New component: `DataFlowAblation` — props: `actors` (boxes), `arrows` (data path), `ablations` (toggles that hide a part and show the broken state). Wrapped in `Figure`.
- Alternative: `DiagramSequence` with three pre-baked steps (full path, no-boundary path, no-prefetch path) — less interactive but covers the same ground.
- `Matching` for the role drill.

---

## Concept 10 — The two-system invalidation reality

**Why it's hard.** The student spent Chapter 15 internalizing `revalidateTag` as *the* invalidation call. Now there's a second cache (TanStack Query) with its own invalidation call (`invalidateQueries`), and a Server Action that succeeds doesn't refresh the TanStack cache unless the client explicitly fires it. The two systems don't see each other. The student's instinct will be "this is a bug, one should invalidate the other"; the senior reality is "no, both layers hold data, both fire, that's the price of having a second cache."

**Ideal teaching artifact.** A *two-track flow diagram* of one Server Action's success path. Track A (server): action runs → `revalidateTag(invoiceTag(invoiceId), 'max')` fires → Server Component cache invalidated → next navigation re-renders fresh. Track B (client): action returns `Result` → client awaits → `queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) })` fires → TanStack Query cache marked stale → active `useQuery` refetches. The two tracks run in parallel, neither triggers the other. A toggle removes one track; the student sees the symptom: removing Track A leaves the parent layout's comment-count stale; removing Track B leaves the comment thread itself stale. The student watches the two systems be genuinely separate. The org-switch reset sits as a one-paragraph follow-up: at the tenancy boundary, `queryClient.clear()` is the sledgehammer because no per-key invalidation can cover the whole cache being for the wrong tenant.

**Engagement.** A `Buckets` sort: ten invalidation needs (some Server Component cache, some TanStack cache, some both, one tenancy-switch) sorted into four buckets: `revalidateTag` only, `invalidateQueries` only, both, `queryClient.clear()`. Confirms the student picks the right tool per layer rather than reaching for one as a default.

**Components.**
- `Figure` wrapping a hand-SVG two-track diagram with the ablation toggles, or `TabbedContent` with three panels (both tracks, Track A only, Track B only) if the toggle interaction is too costly for a single-use composition.
- `Buckets` for the layer-routing sort.

---

## Concept 11 — Applying the funnel to the comment thread and the read/write split

**Why it's hard.** The student has the gate, the primitives, the wiring, and the cost ledger. Concept 11 is the *integration moment*: take one concrete screen, run the four-trigger funnel against it, accept that three out of four triggers fire, and then make the further architectural call that *reads* go through `useInfiniteQuery` while *writes* stay in a Server Action with a client-side `invalidateQueries` chaser. The split is non-obvious — students will want to either move the write into a `useMutation` calling a route handler (losing the Server Action's audit-log and `revalidateTag`) or keep the read in a Server Component (losing the polling and cache reuse).

**Ideal teaching artifact.** A *guided architectural sketch* of one screen. The student is shown the per-invoice comment thread as a wireframe and asked, beat by beat, to commit a choice per surface: the invoice header (Server Component? Client Component? `useQuery`?), the customer card, the comment thread itself, the "post a comment" form, the comment-count badge in the parent layout. Each commit gets immediate feedback with the senior call and the one-line reason. The split emerges from the per-surface choices, not from being told. Then the four-trigger funnel from Concept 1 reappears as a small inline panel, applied to the comment thread surface specifically: three triggers fire (polling, optimistic-into-cache, infinite scroll), one is weaker (cross-view caching) — the case is strong. The student ends with a labeled architecture diagram of the final screen showing which leaf is `'use client'` with `useInfiniteQuery`, where `<HydrationBoundary>` sits, where the Server Action lives, and where the two invalidation calls fire. Archetype: *Guided architectural decomposition* — the student does the senior's job of routing each surface to its right primitive.

**Engagement.** The per-surface commit *is* the assessment — the student doesn't read about the split, they make it. Follow-up beat: a single `MultipleChoice` asking *"why does the write side stay as a Server Action instead of becoming a `useMutation` against a route handler?"* (correct: Server Actions own the form-submission semantics, the audit-log write, and the `Result` shape; TanStack Query handles only the client cache after). Confirms the split's rationale.

**Components.**
- New component: `ArchitecturalDecomposition` — props: `surfaces` (wireframe regions with click targets) and per-surface multi-choice options + correct routing. Shows the wireframe, accepts per-surface picks, and assembles a final architecture diagram from the choices.
- Alternative: a sequence of `MultipleChoice` blocks per surface plus a final `Figure`-wrapped architecture diagram authored by hand. Less integrated but covers the same teaching.
- `MultipleChoice` for the split-rationale follow-up.

---

## Component proposals

- **`DecisionFunnel`** — author supplies funnel nodes (question + branch labels) and scenario cards tagged with their path; the student picks a scenario, predicts its path one node at a time, sees the verdict at the terminus.
  - Uses in this chapter: Concept 1.
  - Forward-links: Chapter 16.3 (Zustand's three triggers — same funnel shape), Chapter 7.4 (React Hook Form's four triggers — same shape), any future conditional-tool lesson (the course has many: Drizzle Studio, edge runtime, Suspense, etc.).
  - Leanest v1: hardcoded four-question, five-scenario funnel rendered as a step-through with a prediction buttoned at each node and a static verdict screen. No general authoring API yet; the v1 ships for this chapter and Chapter 16.3 with a second hardcoded set.

- **`QueryLifecycleSimulator`** — props: `staleTimeOptions`, `gcTimeOptions`, `actions` (focus, mount/unmount, manual refetch); shows a timeline of network requests, `isPending`/`isFetching` over time, rendered UI state at each beat.
  - Uses in this chapter: Concept 4.
  - Forward-links: Chapter 16.2 (the project's verify recipe — students could re-use the simulator to validate their `staleTime` choice before running the real app), arguably Chapter 15.1's `cacheLife` lessons (similar shape but server-side).
  - Leanest v1: a fixed simulator with three `staleTime` presets and two actions (focus, mount); no `gcTime` axis. Static timeline rendering with three pre-baked traces. If the dynamic version is too costly, demote to the `DiagramSequence` alternative.

- **`MutationTimeline`** — props: `callbacks`, `outcome` (`success` | `failure`), `concurrent` (whether a poll races); renders a scrubbable horizontal timeline with callback events, network arrow, cache state, and `context` flow.
  - Uses in this chapter: Concept 5.
  - Forward-links: Chapter 16.2's optimistic-add lesson (same lifecycle, applied), potentially Chapter 7.3.5's `useOptimistic` (a thinner timeline of the React 19 primitive).
  - Leanest v1: three pre-rendered scrubbable timelines (success, failure, race-with-cancel), no authoring API. If the scrub is costly, `DiagramSequence` is the demoted fallback.

- **`InfiniteQueryInspector`** — props: `pages` (or generator), `maxPages` configurable; renders the rendered list, `data.pages` stack, memory counter, load-older / scroll-back controls.
  - Uses in this chapter: Concept 7.
  - Forward-links: Chapter 16.2 (the project's infinite scroll is the same surface — the inspector could power the verify step), Chapter 11.1.4's cursor pagination (a thinner inspector showing the difference between page-replacement and page-accumulation).
  - Leanest v1: a fixed dataset of 50 comments, three buttons (load older, scroll up, toggle `maxPages: 10`), a static stack visualization. If even that's too costly, demote to the hand-SVG `Figure` plus small `ReactCoding` alternative.

- **`DataFlowAblation`** — props: `actors`, `arrows`, `ablations` (toggles that hide a part and show the broken state); wrapped in `Figure`.
  - Uses in this chapter: Concept 9.
  - Forward-links: Chapter 16.2 (the same SSR-hydration shape, applied), Chapter 5.4 (RSC streaming with Suspense — same ablation pedagogy fits), Chapter 7.3 (Server Action flow — similar actor stack).
  - Leanest v1: a hand-SVG diagram with three discrete ablation states wired to three buttons (no general `actors`/`ablations` API yet); promote to a general component on the third reuse.

- **`ArchitecturalDecomposition`** — props: `surfaces` (wireframe regions with click targets) plus per-surface multi-choice options and correct routing; renders the wireframe, accepts per-surface picks, assembles the final architecture diagram from the choices.
  - Uses in this chapter: Concept 11.
  - Forward-links: Chapter 16.2's project brief (the same screen, decomposed in advance), potentially every "build a screen" lesson in Units 11, 13, 14 — the decomposition exercise is a senior-mindset reusable.
  - Leanest v1: a hardcoded wireframe with five surfaces, per-surface `MultipleChoice` blocks inline, a static "final diagram" image assembled by a switch on the choices. If the dynamic assembly is too costly, demote to a sequence of `MultipleChoice` plus a hand-authored final diagram.

## Build priority

`DecisionFunnel` is the highest-leverage proposal — it lands the chapter's load-bearing concept (the threshold gate) and has a clean forward-link to Chapter 16.3's three triggers and Chapter 7.4's four triggers. Build it first, even at v1 scope.

`ArchitecturalDecomposition` is the second priority — the senior-mindset payoff is large, and the forward-link surface across the unit-level project chapters is wide. Worth building as a general component, not a single-use composition.

`MutationTimeline` is third — Concept 5's lifecycle is the chapter's most timeline-shaped concept, and the same component carries directly into Chapter 16.2's optimistic-add walkthrough. The v1 (three pre-baked scrubbable timelines) is enough.

The remaining three (`QueryLifecycleSimulator`, `InfiniteQueryInspector`, `DataFlowAblation`) carry their concepts well but their forward-links are narrower; each can ship in the v1 / alternative shape named per concept if the schedule tightens.

## Open pedagogical questions

- Concept 2's cost-ledger comparison risks reading as advocacy *against* TanStack Query rather than as honest accounting; the framing prose needs to land "this is the price, and it's worth paying for the four triggers" without tipping into either direction.
- The misconception-first ambush in Concept 8 assumes the student has internalized request-scoped state from earlier chapters (e.g., 5.4.5's React `cache()`). If that internalization didn't land, the reveal lands flat — the prerequisite link needs to be confirmed before authoring.
