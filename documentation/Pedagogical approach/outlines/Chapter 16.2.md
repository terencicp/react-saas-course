## Concept 1 — Leaf-scope the library, do not let it climb the tree

**Why it's hard.** Once a project adopts TanStack Query, the path of least resistance is to convert the rest of the surface to `useQuery`. The student needs to feel the gravity, then resist it: the read seam stays Server-Component, the write seam stays Server-Action, and the library mounts at the one subtree that clears the four-trigger funnel.

**Ideal teaching artifact.** A *Decision* archetype rendered as a labeled tree of the invoice-detail page. The student sees the entire 11.3 page anatomy — header, customer card, line items, comment thread — with a colored band that marks where the `'use client'` boundary sits and where the `<HydrationBoundary>` actually wraps. Three tempting candidates above the thread (the lines table, the customer card, the toolbar) are annotated with the threshold check that knocks each one back out of TanStack Query's reach: "no polling need, no optimism, no cross-view cache, no infinite scroll — Server Component holds." The student is not designing this tree; they are reading it as the chapter's structural contract.

**Engagement.** A `Buckets` round after the diagram: a list of nine candidate surfaces (the invoice toolbar, a notifications bell, an org-wide search, a dashboard chart, a comment thread, a status panel with `lastSeenAt`, a pricing page, an admin user table, a long feed) sorted into "TanStack Query earns its weight" vs. "Server Component holds." This rehearses the trigger funnel against a wider field than the chapter's one surface.

**Components.**
- `Figure` wrapping a hand-authored SVG of the invoice-page tree with the client-boundary band drawn over the comment-thread subtree. Single-use within the chapter — `Figure` + SVG is the right vehicle, not a bespoke component.
- `Buckets` for the trigger-funnel sort.

**Project link.** This is the load-bearing structural call of the project — every later wiring decision (per-request factory, hydration boundary placement, fetcher branch) depends on the leaf scope being honored.

## Concept 2 — Per-request `QueryClient` on the server, singleton on the client

**Why it's hard.** Module-scoped `new QueryClient()` looks idiomatic — it is the React-on-the-client pattern the student has used for months. On the App Router server it is a cross-tenant data leak: org A's prefetched comments survive into org B's request. The student must internalize that the *same statement in the same file* means two different things depending on which side of `typeof window` it runs on.

**Ideal teaching artifact.** A *Concept* artifact framed as a misconception-first ambush. The student is shown the obvious-looking module-scoped factory ("const queryClient = new QueryClient(); export const getQueryClient = () => queryClient") with no commentary and asked to predict what happens when admin-in-org-A loads the page, then admin-in-org-B loads the same page on the same Node process one millisecond later. After the prediction, a two-pane scrubbable timeline walks the two requests across the server's event loop: pane A shows the module-scoped client accumulating org-A's keys, then org-B's request arriving and finding org-A's data already in cache; pane B shows the same two requests under `cache(makeQueryClient)`, with each request receiving its own freshly-scoped instance. The `typeof window` branch is the punchline — same factory function, but the server branch is React-`cache()`-wrapped and the client branch holds a singleton because *that's exactly what the client wants*.

**Engagement.** `PredictOutput` against three small scenarios — module-scoped on server, `cache()`-wrapped on server, singleton on client — asking which one leaks data, which one refetches on every render, and which one survives across navigations. The misconception ambush surfaces the bug; the predict round locks the corrective model.

**Components.**
- `DiagramSequence` to scrub two requests across the server timeline under each factory variant. Recurs as the canonical "two-tenant request-isolation" visualization (forward-link below).
- `PredictOutput` for the three-scenario lock.

**Project link.** 16.2.3 wires this exact branch; 16.2.6 flips the `QUERY_CLIENT_MODULE_SCOPED` debug flag to reproduce the leak the diagram describes.

## Concept 3 — Hydration boundary as a key-match contract

**Why it's hard.** `<HydrationBoundary>` looks like a configuration boilerplate; the student types it and moves on. The load-bearing fact is buried: it works only when the server's `prefetchInfiniteQuery` query key, `queryFn`, and `initialPageParam` *exactly* match the client's `useInfiniteQuery`. A silent mismatch produces a cold client fetch on first paint with no error — the page still works, just badly.

**Ideal teaching artifact.** A *Pattern* artifact rendered as a side-by-side server/client diptych with four lined-up rows: `queryKey`, `queryFn` identity, `initialPageParam`, response shape. The diptych is shown twice — once with everything matched (green network panel: zero fetches on first paint, devtools shows `status: success / fetchStatus: idle`) and once with `initialPageParam: undefined` on the server vs. `initialPageParam: null` on the client (red network panel: a cold fetch fires on mount despite the dehydrated state being present). The student reads the failure as "the keys didn't line up so the cache entry on the client looked empty," not as "hydration is broken."

**Engagement.** A `Tokens` round on the server-side prefetch block: click every fragment that *must* match the client's `useInfiniteQuery` call. The structural enforcement is the lesson — `commentKeys.list(invoiceId)` is the only correct way to write this; raw arrays in either spot are the decoys.

**Components.**
- `TabbedContent` wrapping two `Figure`s — matched vs. mismatched, each with its server snippet, client snippet, and a network-tab panel.
- `Tokens` for the must-match identification round.

**Project link.** 16.2.3's prefetch wiring uses `commentKeys.list(id)` in both call sites for exactly this reason; the student has the diptych in their head when they read the senior-call about "the structural enforcement."

## Concept 4 — The fetcher's `typeof window` branch is the load-bearing architectural call

**Why it's hard.** The branch looks like a workaround. The student's reflex is to "unify" the function — pick one execution context and route both through it. The senior call is the opposite: one `queryFn` deliberately holds two execution paths so that the server-side prefetch reads directly from Postgres (zero HTTP hop, no second auth round-trip) while the client-side fetch goes through the public route handler (the seam a future mobile app reaches for).

**Ideal teaching artifact.** A *Concept* artifact rendered as a two-lane swim diagram. Both lanes start at `fetchCommentsPage({ invoiceId, cursor })`; the top lane resolves on the server and crosses three nodes (`getActiveOrg → listCommentsPage → Postgres`); the bottom lane resolves on the client and crosses four (`fetch → route handler → listCommentsPage → Postgres`). The same `commentsPageSchema.parse` sits at the end of both lanes. Below the diagram, three tempting "simplifications" are listed with the cost each one pays — call `listCommentsPage` from the client (Drizzle ships in the browser bundle; the database driver crosses the boundary); call the route handler from the server (an extra HTTP hop and a second auth round-trip per render); split into two named functions (cache-key contract fractures; future surfaces have to remember to keep them in sync).

**Engagement.** A short `MultipleChoice` (multi-correct) on which simplifications are wrong and why — the failure modes are what the student must name, not the right answer.

**Components.**
- `Figure` wrapping a hand-authored SVG of the two-lane diagram with the shared parse step rendered as a single sink at the bottom. Single-use; `Figure` + SVG is the right vehicle.
- `MultipleChoice` (multi-correct) for the rejected-simplifications round.

**Project link.** 16.2.3 wires the server branch; 16.2.4 wires the client branch; the student returns to this diagram both times.

## Concept 5 — Route handler is the read seam, Server Action is the write seam

**Why it's hard.** Both can talk to the database. Both can run Zod parses. Both can return JSON. The student needs a durable rule that doesn't rely on taste: reads that a third-party (future mobile app, integration partner, scheduled job) might need go through a route handler; writes that need form semantics, audit logs, and the canonical Result shape go through a Server Action.

**Ideal teaching artifact.** A *Decision* artifact rendered as a head-to-head property table — six rows (caller surface, transport, body shape, contract enforcement, side-effect ownership, retry semantics) compared across `GET /api/.../comments` and `addCommentAction`. The table sits above the canonical seam diagram from earlier in the course; the new annotation is which seam each row belongs to and which property forces the choice (audit-log writes belong inside the Server Action's transaction; cursor-paginated GETs belong on the route handler because they have a URL the mobile client will hit).

**Engagement.** `Buckets` round: ten hypothetical operations on a SaaS surface (mark-invoice-paid, list-invoices, export-CSV, soft-delete-comment, fetch-by-id, role-promote, search, bulk-update, single-row-create, polled-status) sorted into "route handler" vs. "Server Action" with the trigger named in the bucket label.

**Components.**
- `Figure` with a table-style SVG composition of the six-property comparison, anchored to the existing seam diagram referenced from 7.5.
- `Buckets` for the read/write sort.

**Project link.** 16.2.4 builds the route handler, 16.2.5 builds the Server Action; the property table is the rationale the student references when justifying the split in the verify pass.

## Concept 6 — `commentKeys` is the only place query-key arrays exist

**Why it's hard.** The first instinct is to write `useInfiniteQuery({ queryKey: ['comments', invoiceId, 'list'], ... })` inline. It works. It composes. It also drifts: the prefetch on the server writes one tuple, the hook on the client reads another, `invalidateQueries` in the mutation typoes a third, and the bug is a silent miss across three call sites.

**Ideal teaching artifact.** A *Pattern* artifact framed as a "wrong-by-default sandbox" the student has to repair. The student is shown a tree of six call sites — server prefetch, client `useInfiniteQuery`, `cancelQueries` in `onMutate`, `setQueryData` in `onMutate`, `getQueryData` in `onMutate`, `invalidateQueries` in `onSettled` — each holding a raw array tuple. One of the six has a one-character typo (`'comment'` instead of `'comments'`). The student is asked to predict the symptom: not a thrown error, not a console warning, just a cache that *looks fine* in devtools but never receives the invalidation, so the optimistic row never gets replaced by the canonical server row. After the prediction reveals the symptom, the same tree is shown with `commentKeys.list(invoiceId)` imported in every spot — the typo class is structurally impossible. This mirrors `tags.ts` from 15.1.1 explicitly.

**Engagement.** The wrong-by-default sandbox carries the assessment — the student names the symptom of the silent typo before the repair is shown. A short follow-up `MultipleChoice` confirms recall: "which of these would surface the bug — devtools, type-checker, lint, runtime error?" (the correct answer is *none*, which is the point).

**Components.**
- New component proposal: `CallSiteAudit` — renders a labeled grid of N code fragments (one per call site) with a single field highlighted on each; the student picks the inconsistent fragment, the component reveals the resulting behavior. Recurs across the chapter for the hydration-key audit (Concept 3) and the optimistic-shape audit (Concept 10), and is the natural vehicle for `tags.ts`-style discipline elsewhere.
- `MultipleChoice` for the recall confirmation.

**Project link.** Lessons 16.2.3 through 16.2.5 each add one more call site to the audit — by 16.2.6 the chapter's grep test ("zero raw `['comments', ...]` arrays outside `keys.ts`") is the same audit run automatically.

## Concept 7 — `useInfiniteQuery` cursor paging with the `maxPages` memory cap

**Why it's hard.** The library accumulates pages until the tab closes by default. For a chat-style thread that can grow into thousands of comments, the unbounded shape is a memory leak the student does not feel in development. `maxPages: 10` is a *senior call*, not an idiomatic default — the student needs to internalize that the cap is the right shape for threads, the absence is the right shape for read-once feeds.

**Ideal teaching artifact.** A *Mechanics* artifact rendered as a controllable simulator. A slider drives "number of 'Load older' clicks"; a panel renders `data.pages.length` and an approximate memory cost over time; a toggle flips `maxPages: 10` on and off. With the cap off, the bar grows linearly; with it on, the bar plateaus at 10 and the simulator annotates that scrolling back to a dropped page would refetch. The student plays with the slider and watches the trade — refetch cost vs. memory cost — under both regimes.

**Engagement.** After the simulator, a one-question `MultipleChoice` distinguishes the two surface classes the senior call hinges on: "for which of these is `maxPages` the wrong default — a chat thread, a feed, a search-results page, an admin user list?" (the feed; read-once surfaces don't want the refetch tax).

**Components.**
- New component proposal: `InfiniteQuerySimulator` — inputs `{ pageSize, pageCount, maxPages? }`; renders a stacked-bar of accumulated pages over interaction time with toggleable cap. Single-use within this chapter; no credible forward-link (16.3 is Zustand, 16.4 reuses none of this).
- Demote to alternative: `Figure` + a static hand-authored SVG showing the bar with and without the cap, paired with a single `PredictOutput` ("after 15 clicks, `data.pages.length` is ___ under `maxPages: 10`").
- `MultipleChoice` for the surface-class round.

**Project link.** 16.2.4 sets the cap; 16.2.6's verify pass walks the click sequence and observes `data.pages.length` plateau at 10.

## Concept 8 — Polling cadence and the background-pause discipline

**Why it's hard.** "10 seconds" looks like a magic number. The student needs to feel why 1 second floods the connection pool, why 30 seconds feels stale on a comment thread, and why the *pause on tab hide* matters more than the cadence itself. The combination — `refetchInterval: 10_000` with `refetchIntervalInBackground: false` — is the senior shape; either knob alone is the bug.

**Ideal teaching artifact.** A *Mechanics* artifact rendered as a controllable explorable. Two sliders (cadence in seconds; `refetchIntervalInBackground` toggle); two visualizations side-by-side: a network-request strip showing pings over a 60-second window, and a battery-cost meter that increments with each ping while `document.hidden`. The student drags cadence to 1 second and watches the strip saturate; flips background polling on, switches the simulated tab to hidden, and watches the battery meter keep climbing despite no user attention. The senior shape (10s, background off) is the bottom of a small valley the student finds by playing.

**Engagement.** A `TrueFalse` round on cadence trade-offs: "polling at 2 seconds is fine on localhost" (true on local, false in production); "tab-hide pause means the user misses messages while away" (false — the next poll on focus catches up within one interval); "polling and `staleTime` fight each other" (false — `refetchInterval` overrides freshness for that query); "`refetchIntervalInBackground: true` is the right call for a status panel" (true — the surface-class call). Lock the cadence model after the play.

**Components.**
- New component proposal: `PollingClockExplorable` — inputs `{ cadenceMs, backgroundEnabled, tabHidden }`; renders a 60-second timeline strip plus a battery/pool-cost meter. Single-use within this chapter; no credible forward-link.
- Demote to alternative: `Figure` with a hand-drawn SVG comparing two timelines (cadence-1s vs. cadence-10s) and a third strip showing the hidden-tab gap under `refetchIntervalInBackground: false`, paired with the same `TrueFalse` round.
- `TrueFalse` for the trade-off lock.

**Project link.** 16.2.4 sets the cadence; 16.2.6 verifies the pause by leaving the tab hidden for 30 seconds and watching the network panel stay silent.

## Concept 9 — Choosing cache-update over via-variables

**Why it's hard.** 16.1.2 introduced both optimistic shapes as equally valid. The student arrives at 16.2.5 needing to *pick* — and the picking criterion is not "which is shorter" but "where does the optimistic row have to land." A row that needs to render inside `data.pages[0].comments` of an infinite-query cache cannot be rendered by reading `mutation.variables` inline; the cache is what `useInfiniteQuery` reads from.

**Ideal teaching artifact.** A *Decision* artifact rendered as a forked walkthrough. Both branches start at the same fork ("does the optimistic row have to participate in an existing cached query the same component reads from?"). The via-variables branch shows a simple "like" button — the optimistic state is the button's own variant; reading `mutation.variables` inline is enough; no cache write. The cache-update branch shows the comment-thread shape — the optimistic row must be visible alongside the seeded rows the same `useInfiniteQuery` already cached; reading `mutation.variables` would render the optimistic row *outside* the list, twice, or out of order. The walkthrough makes the structural reason explicit: which shape you reach for is determined by the cache topology, not by taste.

**Engagement.** `Matching` between four product scenarios (like button, comment thread, single-record edit on a list page, status badge updated by a click) and the right optimistic shape, with a one-line justification rendered when each pair connects.

**Components.**
- `TabbedContent` for the two-branch walkthrough, each tab holding the canonical code shape and a small inline render of where the optimistic row appears in the DOM.
- `Matching` for the four-scenario round.

**Project link.** 16.2.5 commits to cache-update for the comment thread; the senior-call paragraph in the lesson is the rationale this concept locks.

## Concept 10 — The optimistic-mutation four-callback lifecycle

**Why it's hard.** `onMutate`, `onError`, `onSettled`, plus the `cancelQueries` discipline inside `onMutate` — four moves in a strict order. Each has a failure mode if skipped or reordered: skip `cancelQueries` and an in-flight poll overwrites the optimism; skip the snapshot return and `onError` has nothing to restore; skip `invalidateQueries` in `onSettled` and the cache holds the `optimistic-...` id until the next poll; restore from page-0 only and a concurrent invalidation breaks the rollback.

**Ideal teaching artifact.** A *Pattern* artifact rendered as a scrubbable timeline of one mutation, with four parallel lanes. Lane 1 shows the user action (type, submit). Lane 2 shows the cache state as it mutates (snapshot taken, optimistic written, error fires, snapshot restored, invalidate refetches). Lane 3 shows the in-flight poll the timeline deliberately overlaps with the mutation (the polling fetch fires *during* the optimistic window). Lane 4 shows the action's promise resolving (success or `{ ok: false }`). The student scrubs forward and sees each callback's responsibility surface at exactly the right tick — `cancelQueries` is the move that lets the poll-lane harmlessly resolve without overwriting the optimistic write. Then the student scrubs the same timeline with `cancelQueries` removed and watches the overlap go wrong: the poll's resolved data lands on top of the optimistic row, the snapshot is now wrong, the rollback restores stale state. Same for skipping `invalidateQueries` (the `optimistic-...` id sticks around for ten seconds).

The second beat: the canonical four-callback code block beside the timeline, with each callback's body anchor-linked to the lane it drives. The student finishes able to point at any line of `onMutate` and name what it's preventing.

**Engagement.** `Sequence` drill — given the four callbacks and three "lines inside `onMutate`" (cancel, snapshot, setQueryData), drag into the correct order; the artifact's scrubbed-with-error variant is the visual the student references to justify the order.

**Components.**
- New component proposal: `MutationLifecycleScrubber` — inputs `{ scenario: 'happy' | 'forced-error' | 'no-cancel' | 'no-invalidate' }`; renders a four-lane scrubbable timeline with the cache state, poll lane, action lane, and user lane. Forward-links to any future chapter that teaches a cache-mutating lifecycle (Unit 19.4 component tests of this same mutation could reuse it as the mental model; Chapter 16.4's wizard submit reaches for an analogous "what fires when" view though the lifecycle is simpler).
- `Sequence` for the callback-order drill.

**Project link.** This *is* the lesson 16.2.5 teaches; the scrubber is the artifact the senior-calls paragraph leans on.

## Concept 11 — Two-system invalidation is the architectural price tag

**Why it's hard.** The student wired `revalidateTag` in Unit 15.1 and learned it as the cache invalidation. Bringing TanStack Query in *adds a second cache*, and the action must invalidate *both*. Skipping `revalidateTag` leaves the Server-Component-rendered comment count stale until the next visit; skipping `invalidateQueries` leaves the client cache holding the `optimistic-...` row for up to ten seconds. Neither failure crashes anything; both produce subtly wrong UI the student would not notice in development.

**Ideal teaching artifact.** A *Concept* artifact rendered as a two-system diagram with explicit ownership: a left column "Server Component cache (`'use cache'`, tagged by `invoiceCommentsTag`)" and a right column "TanStack Query cache (keyed by `commentKeys.list(invoiceId)`)." The action node sits between them with two arrows leaving it — one labeled `revalidateTag(...)` pointing left, one labeled `queryClient.invalidateQueries(...)` pointing right (the second arrow originates from the mutation's `onSettled`, not the action body — the diagram annotates this seam clearly). Below the diagram, a four-cell consequence matrix: both fire (correct), only right fires (parent count stale on next visit), only left fires (optimistic id sticks for 10s), neither fires (everything stale until poll *and* visit). The matrix is the price tag the student is reading.

**Engagement.** A short `PredictOutput`-style round on three scenarios: "you skip `revalidateTag`," "you skip `invalidateQueries`," "you skip both" — for each, what does the user see, and after how long does the system self-correct? The matrix is the answer key; the round forces the student to predict before checking.

**Components.**
- `Figure` wrapping a hand-authored SVG of the two-system diagram with the action node and labeled arrows. The four-cell consequence matrix renders as an adjacent table inside the same `Figure`. Single-use composition.
- `PredictOutput` for the three-scenario round.

**Project link.** 16.2.5's wiring fires both invalidations; 16.2.6's verify pass deliberately deletes each one in isolation and observes the predicted symptom.

## Concept 12 — `useMutation` vs. `useActionState` at the write seam

**Why it's hard.** Both are legal. `<form action={addCommentAction}>` with `useActionState` is the default the course taught in Unit 7.6, and the student's reflex is to reach for it again here. The senior call is the opposite: when TanStack Query is already in play for the read side, the write side composes through `useMutation` because `useMutation` owns the `onMutate`/`onError`/`onSettled` hooks the cache-update optimistic shape needs. `useActionState` has no analog for "write to a cache between submit and resolve."

**Ideal teaching artifact.** A *Decision* artifact rendered as a two-track comparison. The student sees the same form wired both ways, side by side, with the cache-update shape forced through each. The `useActionState` track has a row crossed out: "no hook fires between submit and server response — the optimistic write has nowhere to live." The `useMutation` track has `onMutate` rendered as the hook that owns that exact window. The decision rule below the comparison: "when the surface already runs TanStack Query for reads, the writes compose through `useMutation`; when the surface stays Server-Component, reach for `<form action>` with `useActionState`." The student leaves with the rule indexed on the cache topology, not on familiarity.

**Engagement.** `MultipleChoice` (multi-correct) on which of four surfaces should use which write primitive — a soft-delete on a Server-Component-rendered table (form action), an optimistic toggle inside a `useQuery`-driven panel (useMutation), a multi-step wizard submit (form action), a like button on a polling-driven feed (useMutation).

**Components.**
- `CodeVariants` for the two-track comparison, each tab annotated with the hook surface and what it does and does not own.
- `MultipleChoice` (multi-correct) for the four-surface picker.

**Project link.** 16.2.5 commits to `useMutation` for exactly the reason this concept names; the alternative-considered-and-rejected paragraph in the lesson is the rationale this concept seeds.

---

## Component proposals

- **`CallSiteAudit`** — labeled grid of N code fragments (one per call site), one field highlighted on each; student picks the inconsistent fragment and the component reveals the resulting behavior.
  - Uses in this chapter — Concept 6 (primary), Concept 3 (key-match audit variant), Concept 10 (callback-order variant).
  - Forward-links — `tags.ts` discipline (15.1.1) and any future structural-enforcement pattern in the course (Zod schema discipline, RBAC role-constant discipline). Compounds.
  - Leanest v1 — a static `Figure` rendering the N fragments and a single `MultipleChoice` asking which one drifts; no reveal animation, no behavioral preview. Still passes the teaching bar if paired with prose naming the symptom. The richer reveal is the second iteration.

- **`MutationLifecycleScrubber`** — four-lane scrubbable timeline of one optimistic mutation under selectable scenarios (`happy`, `forced-error`, `no-cancel`, `no-invalidate`).
  - Uses in this chapter — Concept 10 (primary).
  - Forward-links — Unit 19.4 tests of the exact mutation (the scrubber is the mental model the tests assert); plausible reuse for any future "lifecycle with multiple cache writes" surface (org-switch cache clear, future Unit 14 dispatcher with optimistic notification ack).
  - Leanest v1 — a `DiagramSequence` with three frames (start, optimistic written, settled) and a hard-coded second `DiagramSequence` for the error path. Drops the simultaneous-poll lane in v1. Acceptable trade-off: the no-cancel scenario loses its visual punch and the lesson carries that beat in prose; the canonical happy-path teaching survives. Consider building only if a v1 lesson run shows students missing the no-cancel beat.

- **`InfiniteQuerySimulator`** — slider for click count, toggleable `maxPages` cap, stacked-bar of pages and memory.
  - Uses in this chapter — Concept 7 (primary).
  - Forward-links — None — single-use. Per single-use discipline, demoted to the alternative bullet in Concept 7; the primary recommendation there is `Figure` + SVG + `PredictOutput`. Surfaced here only to record the proposal.
  - Leanest v1 — see demoted primary above; no need to build the bespoke widget for this chapter alone.

- **`PollingClockExplorable`** — cadence slider + background toggle + tab-hidden toggle, driving a 60-second timeline strip and a battery/pool-cost meter.
  - Uses in this chapter — Concept 8 (primary).
  - Forward-links — None — single-use. Per single-use discipline, demoted to the alternative bullet in Concept 8; the primary recommendation there is `Figure` + SVG + `TrueFalse`. Listed here only to record the proposal.
  - Leanest v1 — see demoted primary above; defer the bespoke widget.

## Build priority

`CallSiteAudit` is the highest-value build. It carries three concepts in this chapter (6, and the variants in 3 and 10) and forward-links cleanly into every structural-enforcement pattern the course teaches (tags, keys, role constants, Zod schema barrels). Build the v1 first — static fragments + `MultipleChoice` — and only iterate to the behavioral-preview reveal if classroom use shows students skipping past the predict step.

`MutationLifecycleScrubber` is the second-priority build, scoped narrowly to Concept 10 inside this chapter but with a credible forward-link to Unit 19.4 testing assertions. Start at the `DiagramSequence`-based v1 and only invest in the four-lane scrubber if the lesson cannot land the no-cancel beat with prose alone.

The remaining two proposals (`InfiniteQuerySimulator`, `PollingClockExplorable`) are single-use with no forward-link; the per-concept Components bullets already route around them with `Figure` + SVG primary recommendations. Do not build them as bespoke components for this chapter.

## Open pedagogical questions

- Concept 2's misconception ambush leans on the student *not* having internalized the module-scoped-on-server failure mode from 16.1.3. If 16.1.3 hits hard enough, the ambush in 16.2.3 is redundant and the lesson could open instead with the corrective pattern. Open question on how forcefully 16.1.3 lands the leak — depends on the eventual draft of that lesson.
- The cadence numbers in Concept 8's explorable (1s floods the pool, 30s feels stale) are values the senior call asserts but the student has no way to verify in-browser. If a future iteration wants the explorable to *prove* the trade rather than narrate it, the simulator would need a fake server with realistic latency — a substantially bigger build. Worth flagging now in case Concept 8's primary recommendation gets revisited.
