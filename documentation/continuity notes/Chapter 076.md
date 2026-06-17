# Chapter 076 — TanStack Query

## Lesson 1 — When TanStack Query earns its weight

**Taught.** Zero TanStack Query code; installed the senior decision reflex: TanStack Query is conditional not default, scoped to four triggers (polling, cross-view caching, optimistic-into-cache, infinite scroll with reuse), each taught against the specific default it beats.

**Cut.** Nothing from the lesson-outline scope was cut; the lesson delivered all planned sections including the SWR comparison paragraph and the forward pointer to the comment-thread worked screen.

**Debts.** Lesson 2 owns all TanStack Query primitives (`useQuery`, `useMutation`, `useInfiniteQuery`, query keys, `staleTime`, `invalidateQueries`, `refetchInterval`). Lesson 3 owns provider wiring, `getQueryClient()` / `cache()` trap, `<HydrationBoundary>`, `dehydrate`/`prefetchQuery`, senior defaults, dual-fetcher split, devtools; the providers file path conflict (code conventions say `app/_components/providers.tsx`, chapter outline draft says `src/components/providers.tsx`) must be resolved in lesson 3. Lesson 4 owns the full worked screen. Chapter 077 builds the comment thread end to end. Chapter 078 owns Zustand (named here as the home for generic client state, not server-state).

**Terminology.**
- **server-state** — data whose source of truth is the database, not the browser.
- **client-side server-state library** — a library that caches server data in the browser and manages refetch/invalidation lifecycle (TanStack Query, SWR).
- **Router Cache** — Next.js's client-side cache of prefetched route segments for soft navigations (used as the foil for the cross-view trigger).
- **cursor pagination** — opaque-pointer paging, a replace-not-accumulate UX (used as the foil for the infinite-scroll trigger).
- **hydration** — client re-attaching interactivity (and here a pre-filled cache) to server-rendered HTML.
- **stale-while-revalidate** — serve cached value immediately, refetch in background, swap in fresh value (SWR's pattern).
- Four triggers named exactly: *polling / frequent refetches*, *complex client-side caching across views*, *optimistic mutations with rollback into cached queries*, *infinite scroll with cache reuse*.

**Patterns and best practices.**
- Enumerate the specific default a workload would use before considering TanStack Query; only if every default fails does the library earn its weight.
- The page stays a Server Component even when a feature clears the bar; TanStack Query scopes to the interactive leaf only ("Server Components own the first paint, TanStack owns the live cache").
- Two-cache reality: Server Component cache (invalidated with `revalidateTag`) and TanStack client cache (invalidated with `invalidateQueries`) are separate and both must be invalidated on a mutation touching shared data.
- Cross-view caching is the weakest trigger; it is rarely the sole justification.
- `useOptimistic` is sufficient for single-component optimism with no separate cache; the library only earns its weight when the rollback target is a cached query.

**Misc.** The worked case for the entire chapter is the per-invoice comment thread (`/invoices/[id]`), which meets three strong triggers (polling, optimistic-into-cache, infinite scroll). Later lessons should use this as their concrete anchor. The `useOptimistic` prerequisite is ch044 L5; `router.refresh()`, cursor pagination, and the Server Component cache (`use cache`, ch032/ch072) are also treated as known prerequisites here.

---

## Lesson 2 — The four primitives the project reaches for

**Taught.** Delivered the full call-site API for all four primitives (`useQuery`, `useMutation`, optimistic two-shape decision, `useInfiniteQuery`) plus query keys, the imperative cache trio, and `refetchInterval` polling — everything the project will write inside Client Components, with provider/SSR wiring explicitly deferred.

**Cut.** `useMutationState` (shared pending state across components) mentioned in the chapter outline was not full-treated — named only in scope notes as "exists for a navbar badge," not in the lesson body. The chapter outline's `staleTime: 30_000` as the senior default was overridden by the lesson; the lesson uses `60_000` consistently (matching Code conventions).

**Debts.** Lesson 3 owns: `QueryClient` instantiation, `<Providers>` Client Component, `getQueryClient()` / React `cache()` per-request trap, senior defaults set on `QueryClient` constructor, dual-fetcher `typeof window` branch, devtools, `<HydrationBoundary>` / `dehydrate` / `prefetchQuery`, org-switch `queryClient.clear()` full treatment. Lesson 4 owns: full worked screen with real updater function, two-system invalidation after a Server Action, verify recipe. The closing `CommentThread` component in this lesson has no provider and no `useMutation` — lesson 3 and lesson 4 complete it.

**Terminology.**
- **`isPending`** — "have I ever resolved?" — `true` until the first successful fetch; gates the skeleton.
- **`isFetching`** — "is a request in flight right now?" — `true` during every refetch including background; gates the subtle spinner/dimming.
- **`isLoading`** — v5 alias for `isPending && isFetching` (first-load-no-cache); course teaches the two underlying flags.
- **stale** — cached data the library considers out of date and will refetch on next mount/focus.
- **`staleTime: 60_000`** — the course's SaaS default (60 seconds); set once on `QueryClient` in lesson 3, overridden per-query with a comment when live freshness matters.
- **query key** — the cache address; a hierarchical const-literal array, always through a typed helper, never inlined.
- **`commentKeys`** — the canonical typed key-factory shape for the comment thread: `{ all, lists(invoiceId), detail(id) }` with `as const`.
- **via-variables optimistic shape** — reads `mutation.variables` + `mutation.isPending` inline; no cache write, no rollback code; auto-clears on settle.
- **cache-update optimistic shape** — cancel → snapshot → `setQueryData` → return context → restore on error → invalidate on settled; used when optimism must land in the cache.
- **`data.pages`** — the `useInfiniteQuery` render shape; an array of page results, flattened with `flatMap` at the render site.
- **`initialPageParam: null`** — the cursor for the very first infinite-query page.
- **`undefined` as stop signal** — `getNextPageParam` returns `undefined` (not `null`) to signal no more pages.
- **`maxPages: 10`** — caps pages held in cache; required when polling an infinite query; requires `getPreviousPageParam` also defined.

**Patterns and best practices.**
- Use `isPending` to gate the skeleton; use `isFetching` to gate the in-place spinner. Never render a skeleton on `isFetching` alone — it yanks content during a background refetch.
- `staleTime: 60_000` is the SaaS default; set it on the `QueryClient` (lesson 3), not per-query unless overriding.
- Treat `data` returned by `useQuery`/`useInfiniteQuery` as frozen — it is a direct cache reference; mutate it via `setQueryData`, never in place.
- All query keys go through a typed factory file (`commentKeys`); raw arrays never appear at call sites. Use `as const` on each returned tuple.
- Only serializable primitives and plain objects in query keys (no `Date`, no function refs, no class instances).
- `queryFn` calls a route handler for reads, never a Server Action.
- Parse the route handler response with the same Zod schema the handler validates its output against; schema lives in `/lib`, imported by both sides.
- Default to `mutate` (fire-and-forget); escalate to `mutateAsync` only when composing the result into a larger async flow.
- Never call `mutate` inside `onMutate`; sequence a follow-up mutation in `onSuccess`.
- Start with via-variables optimism; escalate to cache-update only when the optimism must land in a cached structure (e.g. `useInfiniteQuery` pages, cross-component cache, post-navigation persistence).
- Cache-update step order is mandatory: cancel → snapshot → write → return context → restore (onError) → invalidate (onSettled). Skip cancel and a late background refetch overwrites the optimism.
- The optimistic comment carries the same client-generated UUID sent to the server so the persisted row replaces it by key on reconciliation — no duplicate.
- When `maxPages` is set, `getPreviousPageParam` must also be defined so dropped pages can be re-fetched on scroll-back.
- Poll an infinite query only with `maxPages` set; otherwise the polled refetch grows the cache unbounded.
- `refetchIntervalInBackground: false` (already default) — polling pauses when the tab is hidden; confirm the default rather than adding a redundant line.
- `useQueryClient()` is client-only; calling it in a Server Component is a category error.
- `invalidateQueries` is the default after a mutation; `setQueryData` is the optimistic write; `removeQueries`/`queryClient.clear()` is the org-switch/sign-out sledgehammer.
- `useQuery` is for keyed reads of server state only — URL state → `nuqs`, form-input → `useState`, generic global client state → Zustand (ch078).
- One-shot fetch on a click is a mutation, not a query.
- Derived values over query data use `useMemo`, not a separate `useQuery` with a synthetic key.

**Misc.**
- `useQuery` `onSuccess`/`onError` callbacks were removed in v5; they exist only on `useMutation`. Handle post-query render effects in component code.
- `refetchInterval` function form in v5 receives the `query` object; read latest data at `query.state.data`, not `query.data`.
- The closing `CommentThread` component is intentionally incomplete (no provider, no `useMutation`, no SSR prefetch) — this is staged, not an omission; lesson 3 adds wiring, lesson 4 adds the write side. Any reviewer seeing "missing provider" should check the lesson's `:::note` aside before "fixing" it.
- The project (ch077) uses the cache-update shape because the optimistic comment must appear in `useInfiniteQuery`'s `data.pages[0]`; the full updater function is ch077's job, not this lesson's.
- `useMutationState`, `useSuspenseQuery`, `useQueries`, `useQuery({ enabled })`, devtools, persistence plugin, online/offline handling — named in passing only; not load-bearing.

---

## Lesson 3 — Wiring without leaking the cache across requests

**Taught.** Provider wiring, the per-request `getQueryClient()` helper with the cross-request leak framing, senior default config, SSR-hydrated initial data via `prefetchInfiniteQuery`/`dehydrate`/`<HydrationBoundary>`, the dual-fetcher `typeof window` split, gated/dynamic devtools, the two-system invalidation reality after a Server Action, and the org-switch `queryClient.clear()` tenant-boundary reset.

**Cut.** Chapter outline floated passing `fetchComments` an explicit *fetcher* argument (more testable); the lesson adopted the `typeof window` branch as the canonical form instead, and called out the fetcher-injection alternative in one sentence. Chapter outline mentioned `queryClient.clear()` after `dehydrate` as a high-throughput-server discipline; the lesson names it only in the context of org-switch, not post-dehydrate cleanup.

**Debts.** Lesson 4 owns: the full worked comment-thread screen (four-trigger funnel applied), the full `useMutation` cache-update optimistic add with `onMutate`/`onError`/`onSettled`, the verify recipe, and the real route handler build. Chapter 077 builds the full surface end to end.

**Terminology.**
- **`getQueryClient()`** — the canonical helper at `src/lib/query-client.ts`; returns `cache(makeQueryClient)` on the server (fresh per request) and a lazy module singleton (`browserQueryClient ??= makeQueryClient()`) in the browser.
- **`isServer`** — TanStack Query's exported boolean; `true` during server render; equivalent to `typeof window === 'undefined'`.
- **`gcTime`** — garbage-collect time: how long an *unused* cache entry survives before eviction; distinct from `staleTime` (freshness while in use). Course default: `5 * 60_000`.
- **`makeQueryClient()`** — internal factory both branches call; config (`staleTime`, `gcTime`, `refetchOnWindowFocus`, `shouldDehydrateQuery`) lives here so server and browser clients are always identically configured.
- **`dehydrate`** — serializes a `QueryClient`'s cache into a plain object for transport in the RSC payload.
- **`HydrationBoundary`** — Client Component that injects dehydrated state into the browser's `QueryClient` before children render.
- **`prefetchInfiniteQuery`** — runs a query's fetcher and stores the result in the cache without rendering a hook; the server-side way to populate the cache for an infinite query.
- **dual-fetcher split** — `fetchComments` branches on `typeof window`: server path calls Drizzle directly (`listInvoiceComments`), browser path calls the route handler; both branches parse the same `commentPageSchema`.
- **`revalidateTag(tag, 'max')`** — invalidates the Server Component cache; cannot reach the TanStack client cache.
- **`queryClient.clear()`** — nukes the entire client cache; the correct call at a hard tenant boundary (org switch). `removeQueries({ queryKey })` is the surgical alternative when only some subtrees are org-scoped.

**Patterns and best practices.**
- `getQueryClient()` is the *only* path to a `QueryClient` in server-rendered code; never `new QueryClient()` at module scope on the server.
- `src/lib/query-client.ts` is deliberately **not** `server-only` — the browser branch must ship; do not add `import 'server-only'` to "harden" it (the client build breaks).
- Provider file is `app/_components/providers.tsx` (not `src/components/providers.tsx` as the chapter-outline draft said); this resolves the conflict noted in L1/L2 continuity notes.
- Devtools: dynamically imported (`next/dynamic`) behind `process.env.NODE_ENV !== 'production'`; gate on `NODE_ENV` *and* lazy-import — gate alone still ships the bundle.
- A mutation touching data both layers show must call **both** `updateTag(tag)` inside the Server Action (Server Component cache, read-your-writes) and `queryClient.invalidateQueries({ queryKey })` on the client (TanStack cache); forget one and that layer goes stale.
- `updateTag`/`revalidateTag` cannot refresh a `useQuery`; they are different caches. Fix a stale `useQuery` with `invalidateQueries`, never another `updateTag`.
- `shouldDehydrateQuery` extended to include `status === 'pending'` so in-flight queries dehydrate for streaming; required config for `<HydrationBoundary>` + streaming to work.
- The page (`app/(app)/invoices/[id]/page.tsx`) stays a Server Component — no `'use client'`; only the `<Providers>` shell and the leaf (`comment-thread.tsx`) carry `'use client'`.
- Key match between `prefetchInfiniteQuery` and `useInfiniteQuery` is the entire contract; any array difference (even one element) causes a silent cold fetch on mount — both call sites must import from `commentKeys`.
- On org switch: `queryClient.clear()` before navigating; the cache carries no org filter and cannot survive a tenant change.

**Misc.**
- `CommentThread` from L2 is now complete on the read side (provider, SSR-hydrated cache, polling); write side (`useMutation` optimistic add) is L4's job.
- The `shouldDehydrateQuery: 'pending'` extension enables streaming dehydration but the lesson does not build a streaming UI; it is a required line in the config, not an advanced feature lesson 4 needs to revisit.
- Chapter outline's `src/components/providers.tsx` path is **superseded** by `app/_components/providers.tsx` — L4 and ch077 must use the `app/_components/` path.

---

## Lesson 4 — The per-invoice comment thread clears the bar

**Taught.** Applied the four-trigger funnel to the per-invoice comment thread, drew the read (`useInfiniteQuery`) / write (Server Action) seam and its two-cache invalidation duty, taught the cache-update optimistic-add step order and the page-zero write mechanism, and framed the ch077 build.

**Cut.** Chapter outline mentioned `refetchIntervalInBackground: false` as an explicit config line; the lesson names it as the default to confirm rather than a line to add. Chapter outline used `revalidateTag(invoiceTag(invoiceId), 'max')` for Server Component invalidation after posting; the lesson teaches `updateTag(invoiceTag(invoiceId))` instead (read-your-writes for in-app mutations), naming `revalidateTag(tag,'max')` only as the eventual-consistency variant for webhooks/jobs — ch077 must follow this `updateTag` form.

**Debts.** Ch077 owns all build steps: seeded comments, route handler, `useInfiniteQuery` with polling, full production `useMutation` cache-update updater (the lesson's `AnnotatedCode` is a compact teaching skeleton), `addCommentAction`, `useActionState` form, verify recipe.

**Terminology.**
- **read seam** — the single endpoint where the client crosses into server data; here `GET /api/invoices/[id]/comments?cursor=…`.
- **write seam** — the Server Action that owns the mutation (`addCommentAction`): parse, authorize, write, audit, return `Result`.
- **page-zero write** — `setQueryData<InfiniteData<CommentPage>>(key, old => prependToFirstPage(old, optimisticComment))` — prepends the optimistic row to `data.pages[0]` of the infinite query.
- **`prependToFirstPage`** — helper (ch077 implements it) that clones `old.pages` and prepends a row to `pages[0]`.
- **`optimisticComment(input)`** — helper that builds the optimistic row carrying the client-generated UUID; used for key-based reconciliation.
- **two-cache invalidation** — after `addCommentAction` succeeds: `updateTag(invoiceTag(invoiceId))` inside the action (Server Component cache) + `queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })` on the client (TanStack cache); both always required.

**Patterns and best practices.**
- Reads go through TanStack Query (`useInfiniteQuery`); mutations go through the Server Action; the two meet at the `invalidateQueries` call — they are not competitors.
- `useMutation`-against-a-route-handler does not beat the Server Action for writes that own a form contract, Zod validation, and an audit-log write; use the action and call `invalidateQueries` after it resolves.
- Cache-update optimistic step order is mandatory: `cancelQueries` → `getQueryData` snapshot → `setQueryData` page-zero write (return context) → restore on `onError` → `invalidateQueries` on `onSettled`.
- `cancelQueries` before the page-zero write is load-bearing on a polling screen; skip it and an in-flight poll overwrites the optimistic row.
- Optimistic comment carries the same client-generated UUID sent to the server; the persisted row replaces the optimistic one by key on reconciliation — no duplicate.
- `updateTag` (not `revalidateTag(tag,'max')`) is the correct call inside a Server Action for read-your-writes; `revalidateTag(tag,'max')` is for webhooks/background jobs.
- `updateTag` cannot reach a `useQuery`; `invalidateQueries` cannot reach a Server Component — both invalidations must always fire.
- Scope TanStack Query to the comment-thread leaf only; the rest of the invoice page (`page.tsx`, header, customer card, line items, banner) stays Server Components with no `useQuery`.
- `refetchInterval: 10_000` is the deliberate polling cadence; do not lower it — multiplies the cancel/overwrite race and burns DB pool + battery.
- The route handler `GET /api/invoices/[id]/comments` is the public API contract; TanStack Query adds a client cache on top without closing that surface to external callers.
- Response schema lives in `/lib`, imported by both the route handler (output validation) and the `queryFn` (response parse); the contract is structural.

**Misc.**
- The `AnnotatedCode` optimistic skeleton in this lesson is intentionally compact — ch077 owns the full production updater. Reviewers must not flag it as "incomplete."
- The `Figure` wrapping the mock screen layout uses a hand-built HTML/CSS mock (not a `Screenshot` component); the real screen does not exist until ch077.
- `commentKeys.lists(invoiceId)` (plural) is the key shape used in this lesson's code samples; ch077 must import from the same `commentKeys` factory.
