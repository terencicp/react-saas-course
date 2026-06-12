# Lesson 4 — The per-invoice comment thread clears the bar

- **Title:** The per-invoice comment thread clears the bar
- **Sidebar label:** A screen that clears the bar

---

## Lesson framing

This is the chapter's **synthesis/bridge** lesson, not a mechanics lesson. The student already owns the decision reflex (L1), the four primitives (L2), and the SSR-hydrated wiring (L3). This lesson does one thing: it takes everything taught in the abstract and lands it on **one concrete screen** — the per-invoice comment thread at `/invoices/[id]` — so the student sees a senior actually run the funnel, draw the read/write seam, and account for the two-cache cost. It closes by framing the ch077 build (which writes the files); this lesson is the *design review*, ch077 is the *implementation*.

Pedagogical conclusions that apply lesson-wide:

- **Lead with the decision, not the code.** The load-bearing skill here is judgment: "given a real screen, which parts get TanStack Query and which stay framework-default?" Every section foregrounds the *why*. Code appears only to make a decision concrete, never to teach new syntax — all syntax is L2/L3's job and is treated as known.
- **The screen is the spine.** Introduce the comment thread once, early, with a screenshot so the student has a mental picture to attach every decision to. Then every section answers a question *about this screen*.
- **The senior move this lesson teaches is the seam.** The single most important takeaway: Server Actions own the **write** (form contract, audit log, `Result`, read-your-writes invalidation), TanStack Query owns the **read cache** (poll, infinite pages, optimistic display). They cooperate at one seam; they do not fight. The two-cache invalidation duty is the *price tag* of that seam, taught as a deliberate cost, not a bug.
- **Minimize new load.** No new hooks, no new config. The only genuinely new content is (a) the funnel applied to a real screen, (b) the read/write split decision, (c) the one concrete `setQueryData` updater shape for an infinite query, and (d) the two-cache cost made visible. Everything else is recall, reframed against the screen.
- **End on the boundary map.** The student should leave able to point at any region of the invoice page and say "Server Component" or "TanStack leaf" and justify it — and know that scoping the library to one leaf is the whole point.
- **Format.** ~35–45 min. Heavy on diagrams/decision components, light on long code. One walker (funnel applied), one boundary illustration, one DiagramSequence for the post-submit two-cache flow, one compact `setQueryData` updater via AnnotatedCode, one classification exercise, one MCQ. No live-coding sandbox (the screen is multi-file App Router + Drizzle, which `ReactCoding` can't run, per the react-only constraint; ch077 is the hands-on build).

---

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete: the threshold, the primitives, and the wiring are all in hand — now *which screen in our SaaS actually earns all that machinery, and how is it shaped?* State that this lesson runs the L1 funnel against one real screen end-to-end and hands the build to ch077. Connect back: "L1 said TanStack is conditional; this is the condition being met." Keep warm, ~3 sentences. Name the screen (per-invoice comment thread) in the last sentence as the thing we're about to dissect.

### The screen: a comment thread on every invoice

Goal: give the student the concrete artifact before any decision-making, so every later decision has something to attach to.

- Describe the product surface: on each invoice detail page (`/invoices/[id]`), a thread coworkers read, scroll back through, and post to — for disputes, internal notes, customer correspondence. Frame it as the SaaS-standard "activity on a record" pattern, so the student recognizes it generalizes (tickets, deals, PRs).
- Name the three things a user *does* on it, because each maps to a later decision: **read the latest** (someone else may have posted), **scroll back** through history, **post** a new comment.
- **Diagram — `Screenshot`** inside `<Figure caption="…">`: a desktop capture of the invoice detail page with the comment thread on the right (or below) the invoice summary. The pedagogical goal is purely orientational — anchor the abstract discussion to a picture. Use a placeholder screenshot path `/screenshots/076/invoice-comment-thread.png`; note for the resourcer/screenshot agent: capture the invoice page showing summary cards + a scrollable thread of ~4 comments + a "post a comment" textarea. This screen is built in ch077; the screenshot may need to be sourced from the ch077 solution app or mocked — flag as a soft dependency.
- Close by previewing the lesson's structure in one line: first we prove it clears the bar, then we draw the seam, then we cost it out.

### Running the four-trigger funnel on this screen

Goal: model the senior reflex from L1 — *don't reach for the library on vibes; run the funnel* — against this exact screen. This is the heart of the "decisions before syntax" pillar for this lesson.

- Reframe the L1 funnel as a checklist the student now applies themselves. Restate the four triggers tersely (one clause each) — recall, not re-teach.
- Walk each trigger against the thread, naming **which default it beats** (this is the L1 discipline: a trigger only counts if a specific cheaper default fails):
  - **Polling.** A coworker posts from another session; the user expects to see it without a manual refresh. Cadence is "every ~10s while focused" — below user-initiated. The cheaper default (`router.refresh()` on a `setInterval`) re-renders the whole route segment every tick — too heavy, too jarring. **Met.**
  - **Optimistic into a cached query.** Posting should show instantly; a 500 rolls the row back with an error. The optimism must land in the **first page of the cached infinite query**, not just a local list. `useOptimistic` covers single-list inline rollback but doesn't intersect the infinite-query cache shape. **Met.**
  - **Infinite scroll with reuse.** The thread can be hundreds deep; the user scrolls back then forward. Server-Component cursor pagination (ch060) refetches every page on each navigation; `useInfiniteQuery` + `maxPages` keeps loaded pages in the client cache for the session. **Met.**
  - **Cross-view caching.** The thread might be peeked from a "recent activity" sidebar that mounts/unmounts; the client cache renders it instantly on re-mount. **Met, but weakest** — call out explicitly that this alone would not justify the library (echoes L1's "cross-view is the weakest trigger").
- Verdict: three strong triggers + one weak — the strongest case in the course for the library being the right call. Make the meta-point: *one screen, four triggers, is rare*; this is exactly the kind of surface the library was built for, which is why the chapter chose it.
- **Component — `StateMachineWalker` (`kind="decision"`)**: the student walks the funnel interactively for *this screen*, committing one answer at a time, landing on the "TanStack Query earns its weight here" leaf. Pedagogical goal: make the student *perform* the decision sequence (the value is the order of questions, per the walker's intended use), not just read a verdict. Node order mirrors L1's funnel: "Is this server state?" → "Would Server Components + `router.refresh()` cover the refresh cadence?" → "Would `useOptimistic` cover the optimism?" → "Would Server-Component cursor pagination cover the scroll-back?" → leaf. Each "no" branch carries a one-line `rationale` naming the default that fails. Keep it to ~4 questions + 1 leaf so it stays a committed walk, not a maze. Place this *after* the prose walk so the student has the answers, then re-performs them.

### Drawing the seam: what gets a query, what stays a Server Action

Goal: teach the single most important architectural decision of the lesson — the **read/write split** — and *why* the write side stays a Server Action even though TanStack has `useMutation`.

- State the split plainly:
  - **Read side (the thread):** `useInfiniteQuery` against the route handler `GET /api/invoices/[id]/comments?cursor=…`, with `refetchInterval: 10_000`, `maxPages: 10`, SSR-prefetched first page. This is the live, cached, polled surface.
  - **Write side (posting):** a Server Action (`addCommentAction`) driven by `useActionState` on the form — same five-seam shape the student already knows (ch044). After the action resolves, the client calls `queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })`.
- **Why the write stays a Server Action — make this the senior reasoning beat.** Server Actions own things `useMutation` against a route handler would force you to rebuild: the `FormData`/progressive-enhancement form contract, server-side Zod validation, the **audit-log write** (ch057 — posting a comment is an auditable event), and the canonical `Result`. The route handler is the read seam; the action is the write seam. They are not competitors — the action mutates and triggers invalidation; TanStack owns the cache that gets invalidated. State the senior rule: **reads through TanStack, mutations through the action; the two systems cooperate at the invalidate seam.**
- Address the obvious objection head-on (anticipate the student's "why not just `useMutation` for everything?"): a route-handler `POST` + `useMutation` would mean re-implementing the form contract, losing progressive enhancement, and wiring the audit write by hand — all to avoid one `invalidateQueries` call. Not worth it. This is the "trigger before tool" discipline applied to the *write* path: TanStack's mutation surface doesn't beat the action here.
- **Component — `TabbedContent`** with two panels, "Read side" and "Write side," each a short bullet spec (hook/endpoint, what it owns, its cache). Goal: hold the two halves of the seam side by side so the student sees them as *complementary*, not alternatives. (Not `CodeVariants` — these aren't two versions of the same code, they're two cooperating subsystems; short specs, not full files.)
- Terms to consider for `Term`: **read seam**, **write seam** (define inline as "the single function/endpoint where the client crosses into server data" for read, "the Server Action that owns the mutation" for write) — only if it reads naturally; don't over-tag.

### The read seam: one route handler, two callers

Goal: justify *why the read goes through a route handler* (not a direct `/lib` import, not a Server Action) and connect it to the dual-fetcher split the student saw in L3.

- The read flows through `GET /api/invoices/[id]/comments?cursor=…`, wrapped in `authedRoute(role, schema, fn)` (ch057) for the auth + tenancy check, returning the Zod-validated `{ comments, nextCursor }` shape. The response schema lives in `/lib` and is imported by both the handler (output validation) and the `queryFn` (response parse) — the contract is structural.
- Three reasons the route handler is right here, each a senior point:
  1. **The client can't import `/lib` directly** — it would bundle Drizzle (and your DB URL) into client JS. The handler is the network boundary that keeps the database server-side.
  2. **The same endpoint is the public contract.** Because the read is HTTP, a future mobile app, a Zapier integration, or a script reaches the thread through the *same* surface. Bringing TanStack in added a client cache *on top of* the API — it didn't sacrifice the API. Frame as the senior win: **the architecture stayed open.**
  3. **The dual-fetcher split (recall L3):** on the server inside `prefetchInfiniteQuery`, calling `fetch()` to your own host is a wasteful loopback; the read function branches on `typeof window` and runs the Drizzle query (`listInvoiceComments`) in-process on the server, `fetch`es the handler in the browser — both parse the same schema. The route handler is still the seam for *external* callers; the in-app server prefetch just skips the network hop.
- Keep code minimal: a single small `Code` block showing the route handler signature line + the `{ comments, nextCursor }` return shape (≤8 lines), to ground "this is the seam" — not a full handler walkthrough (that's ch077). Do **not** re-teach `authedRoute` internals; one clause of recall.

### The optimistic add: writing into page zero of the cache

Goal: teach the *one* concrete mechanism this screen needs that L2 only named in the abstract — the **cache-update** optimistic shape, because the new comment must appear in `data.pages[0]` of the infinite query. This is the lesson's single piece of real "how," and it's the bridge to ch077's full updater.

- Motivate the shape choice first: L2 taught two optimistic shapes (via-variables vs cache-update). Here the optimistic comment must show **at the top of the first page of a `useInfiniteQuery`** — that's a structured cache write, not an inline render, so it's the **cache-update** shape. State the rule the student should internalize: *the optimism target's shape dictates the optimistic technique.*
- Walk the `onMutate` step order (recall from L2, now made concrete): **cancel** in-flight queries (`cancelQueries`) so a mid-flight poll doesn't clobber the optimism → **snapshot** the current cache (`getQueryData`) → **write** the optimistic comment into page 0 (`setQueryData`) → **return** the snapshot as context → **restore** on `onError` → **invalidate** on `onSettled`. Emphasize *cancel-first* as the non-obvious senior step (without it, the 10s poll or a background refetch overwrites the optimistic row — tie directly to this screen's polling).
- The updater shape: typed as `InfiniteData<CommentPage>`, clone `old.pages`, prepend the optimistic comment to `pages[0].comments`, return the new shape. The optimistic comment carries the **same client-generated UUID** sent to the action, so when the persisted row arrives via invalidation/refetch it **replaces by key** — no duplicate. Call out the duplicate hazard explicitly (a coworker's comment arriving via poll between the optimistic add and the action resolve), and that the UUID-by-key reconciliation is the fix.
- **Component — `AnnotatedCode`** (`lang="ts"`, `maxLines={18}`, blue default): a compact `onMutate`/`onError`/`onSettled` skeleton (~14 lines) with the page-0 updater. Steps, in order: (1) `cancelQueries` — "cancel first or the poll overwrites you" (color orange, the watch-out); (2) `getQueryData` snapshot for rollback; (3) `setQueryData` with the `InfiniteData<CommentPage>` updater prepending to `pages[0]` (color green); (4) `onError` restore from context; (5) `onSettled` invalidate. Goal: focus attention on the *sequence and the page-0 write* one beat at a time — this is exactly the AnnotatedCode use case (one complex block, attention directed part by part). Keep the updater realistic but trimmed; explicitly note in the outline that **ch077 owns the full, production updater** — this is the teaching skeleton, deliberately compact.
- Watch-out (inline `Aside type="caution"`, not a trailing section): bumping `refetchInterval` to 1s "for snappiness" multiplies the cancel/overwrite race and burns mobile battery + DB pool — 10s is the deliberate call.

### Paying for two caches: invalidation after a post

Goal: surface the *cost* of the seam — the two-system invalidation duty — as the price tag of bringing TanStack in, and make the student fluent in which call hits which cache. This is the section that prevents the canonical "list fresh, detail stale" bug.

- Frame as the honest cost ledger: the moment you add TanStack's client cache, the invoice page holds data in **two** caches — the Server Component cache (the page's summary cards, any server-rendered comment count) and the TanStack client cache (the live thread). A post must refresh **both**, because both hold comment-derived data.
- The two calls, side by side, on `addCommentAction` success:
  - **`updateTag(invoiceTag(invoiceId))`** inside the action → refreshes the **Server Component** layer with read-your-writes (the parent layout's summary, any server-rendered count). Note: `updateTag` is the read-your-writes choice for in-app Server Actions (the user must see their own write immediately); `revalidateTag(tag, 'max')` is the eventual-consistency variant for webhooks/jobs. (Aligns with ch057/code-conventions; the chapter-outline draft's `revalidateTag(...,'max')` is corrected to `updateTag` here for the read-your-writes case — note this divergence for downstream agents.)
  - **`queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })`** on the client after the action's `Result` resolves → marks the TanStack thread stale and refetches.
- The senior point: **`updateTag`/`revalidateTag` cannot reach a `useQuery`, and `invalidateQueries` cannot reach a Server Component.** They are different caches with different invalidation APIs. Forget either and that layer goes stale — the canonical bug class. This is not a leak in the design; it's the *price* of the second cache, paid deliberately for the four triggers.
- **Component — `DiagramSequence`** (~4 steps), the post-submit flow, because the value is *temporal order*: (1) user submits the form → optimistic comment already in `pages[0]` (from `onMutate`); (2) `addCommentAction` runs server-side: writes the row, audit log, `updateTag(invoiceTag)` — Server Component cache marked; (3) action returns `Result.ok`; client `await`s it, fires `invalidateQueries(commentKeys.lists(id))` — TanStack cache marked; (4) both layers refetch; the persisted row replaces the optimistic one by UUID; summary card count updates. Per step, label *which cache* is being touched (use a two-lane visual: "Server Component cache" vs "TanStack cache") so the student literally sees both lanes light up. Goal: cement that the two systems fire at different moments through different APIs but cooperate to one consistent screen.
- **Exercise — `Buckets`** (`twoCol`, instructions "Sort each refresh job into the cache that owns it"): chips like *"the invoice summary card's comment count"*, *"the live thread the user is scrolled through"*, *"a server-rendered 'X comments' badge in the page header"*, *"the optimistic row the poster just added"* → buckets **"Server Component cache (`updateTag`)"** and **"TanStack client cache (`invalidateQueries`)"**. Goal: check that the student can map a piece of UI to its cache and its invalidation API — the exact skill that prevents the stale-layer bug. Include one trap chip that forces thinking (e.g., a count that's *also* shown inside the thread component → TanStack).

### The boundary map: one leaf is client, the rest stays server

Goal: land the chapter-long principle — *scope the library to the leaf that needs it* — as a concrete map of this page, so the student leaves able to point at any region and name its boundary.

- Inventory the page: invoice header, customer card, line-items table, status/version banner — **all Server Components**, zero `useQuery`. The comment thread leaf (`comment-thread.tsx`, `'use client'`) is the **only** part that needs TanStack. The page itself (`app/(app)/invoices/[id]/page.tsx`) stays a Server Component that prefetches the thread's first page and renders `<HydrationBoundary>` around the leaf.
- The senior reflex, stated as the chapter's thesis landing: bringing in a client-state library does **not** mean clientifying the page. Draw the boundary at the leaf; the static/server-fast parts stay server-fast; you pay TanStack's cost only on the region that earns it. Connect to L3's "Server Components own the first paint, TanStack owns the live cache."
- **Diagram — `ArrowDiagram` inside `<Figure>`** (or a labeled HTML box illustration): the invoice page as a set of boxes — header / customer / line items / banner tinted "Server Component," the comment-thread box tinted "Client leaf — TanStack," with the page wrapper labeled "Server Component + `<HydrationBoundary>`." Pedagogical goal: a single glance that burns in *one leaf, not the page*. Keep it horizontal and short (vertical-space constraint). Caption: "Only the thread crosses the client boundary; everything else ships zero client JS for this data."
- Reinforce the SSR-hydrated payoff in one line: because the page prefetches via `prefetchInfiniteQuery` and hydrates, the thread's first page paints **server-rendered with no skeleton**; only scroll-back and polling hit the network afterward.

### What ch077 builds from here

Goal: cleanly hand off to the project chapter and set expectations — this lesson was the design review, ch077 is the implementation.

- One short paragraph + a tight `Steps` or bullet list of what the project chapter assembles end-to-end: the seeded comments, the `<Providers>` + `getQueryClient()` wiring (L3), the `<HydrationBoundary>` on the page, the `useInfiniteQuery` with 10s polling and `maxPages: 10`, the `addCommentAction` + `useActionState` form, the full `useMutation` cache-update optimistic add, and the verify recipe (cross-session arrival, optimistic visibility, forced-500 rollback).
- Make explicit this lesson deliberately stopped at the *design* — it showed the decisions and the shapes; ch077 writes every file and proves it runs. No code is left "broken" here; it's simply not the build.
- **Component — `ExternalResource`** card(s): link the TanStack Query **Optimistic Updates** guide and the **Next.js App Router prefetching** example as the two canonical references for the build. (Verified current in fact-check.)

### (No standalone watch-outs section)

Per the authoring rule, watch-outs live in the section teaching the concept they qualify:
- *cancel-before-set / poll overwrites optimism* → in **The optimistic add**.
- *1s refetchInterval floods server + battery* → in **The optimistic add**.
- *forgetting one of the two invalidations → stale layer* → in **Paying for two caches**.
- *clientifying the whole page instead of the leaf* → in **The boundary map**.
- *replacing the action with route-handler POST + useMutation* → in **Drawing the seam**.
- *temporary duplicate row from a poll mid-post* → in **The optimistic add** (UUID-by-key reconciliation).

---

## Components & exercises summary (for downstream agents)

- `Screenshot` (in `Figure`) — the invoice page with thread (placeholder asset, ch077 soft dependency).
- `StateMachineWalker` (`kind="decision"`) — the four-trigger funnel applied to this screen.
- `TabbedContent` — read side vs write side, side-by-side specs.
- `Code` — route handler signature + return shape (≤8 lines).
- `AnnotatedCode` — the `onMutate` cache-update skeleton, stepped (compact teaching version; ch077 owns the full updater).
- `DiagramSequence` — the post-submit two-cache invalidation flow, two-lane.
- `ArrowDiagram` (in `Figure`) — the page boundary map (one client leaf, rest server).
- `Buckets` (`twoCol`) — map each UI piece to its cache + invalidation API.
- One `MultipleChoice` (place in **Drawing the seam** or as a recall check after the funnel) — e.g., "Posting a comment should be a ___" with the correct answer being "Server Action; TanStack invalidates the read cache after," and distractors covering the `useMutation`-for-everything and `router.refresh()` misconceptions. Goal: verify the seam decision stuck.
- `Aside` (caution/note) — inline watch-outs as listed above.
- `Term` — `read seam`, `write seam` (sparingly).
- `ExternalResource` — TanStack optimistic-updates guide; Next.js App Router prefetching example.

---

## Scope

**Prerequisites (recall in one clause each, do not re-teach):**
- The four triggers and the funnel reflex — L1 (this chapter).
- `useInfiniteQuery`, `useMutation`, the two optimistic shapes, query keys / `commentKeys`, `refetchInterval`, `maxPages`, the imperative cache trio — L2 (this chapter).
- `<Providers>`, `getQueryClient()` + `cache()` per-request trap, `prefetchInfiniteQuery`/`dehydrate`/`<HydrationBoundary>`, senior defaults, the dual-fetcher `typeof window` split, devtools, org-switch `clear()` — L3 (this chapter).
- Server Actions five-seam shape, `useActionState`, `Result`, client-UUID reconciliation — ch044.
- `authedRoute(role, schema, fn)`, route-handler vs Server-Action decision, audit log — ch046/ch057.
- `updateTag` vs `revalidateTag(tag, 'max')`, `invoiceTag` — ch072 / Next.js 16 caching.
- `useOptimistic` (the single-list shape this screen outgrows) — ch044 L5.

**This lesson does NOT cover (reserved for elsewhere):**
- The file-by-file build, the seeded comments, the starter repo, the verify recipe — **ch077**.
- Full provider/`getQueryClient()`/`<HydrationBoundary>` mechanics — **L3** (recalled, not re-derived).
- The primitives' APIs in depth (`getNextPageParam`, `isPending`/`isFetching`, the full updater function internals) — **L2** / **ch077**.
- Zustand and generic global client state — **ch078**.
- Real-time via WebSockets / Server-Sent Events; server-pushed notifications when a coworker posts — out of course scope / Unit 13.
- Comment moderation, mentions, attachments, threading/replies — product scope, out of course.
- The Server Component cache internals (`use cache`, `cacheTag`, `cacheLife`) — ch032 / ch072.

**Deliberate divergences flagged for downstream agents:**
- The chapter-outline L4 draft wrote `revalidateTag(invoiceTag(invoiceId), 'max')` for the post-success Server Component invalidation. This lesson teaches **`updateTag(invoiceTag(invoiceId))`** instead, because posting is an in-app mutation needing read-your-writes (the poster must see the updated summary immediately); `revalidateTag(tag,'max')` is named as the eventual-consistency variant for webhooks/jobs. This matches Code conventions and the ch057 audit/mutation pattern.
- The `AnnotatedCode` optimistic skeleton is intentionally a compact teaching version; the full production updater is **ch077**'s deliverable. Downstream reviewers should not flag it as "incomplete."
- Provider path is `app/_components/providers.tsx` (per L3 continuity, superseding the chapter-outline's `src/components/providers.tsx`).
