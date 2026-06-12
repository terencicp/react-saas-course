# Lesson 2 — The four primitives the project reaches for

- **Title (h1):** The four primitives the project reaches for
- **Sidebar label:** The four primitives

## Lesson framing

This is the chapter's mechanics lesson and its heaviest. Lesson 1 installed the decision reflex (TanStack Query is conditional, scoped to four triggers); this lesson teaches the API surface a senior actually writes once the threshold is crossed. Scope is a **focused tour of four primitives** — `useQuery`, `useMutation`, the v5 optimistic two-shape decision, and `useInfiniteQuery` — plus the supporting cast the project leans on: query keys as the cache contract, the `invalidateQueries`/`setQueryData`/`removeQueries` trio, `refetchInterval` polling, `useQueryClient`, and the client-side Zod parse. Wiring (provider, `getQueryClient`, `<HydrationBoundary>`, dehydrate/prefetch) is **deliberately deferred to lesson 3** — this lesson assumes a cache exists and teaches what you write at the call site.

Pedagogical spine: build complexity in layers, never front-load it. Order is read → state flags → cache identity → write → optimism → pagination, because each step is a prerequisite for the next. Every primitive lands its **senior default explicitly** against the library's own default (the recurring beat: the library ships defaults tuned for "always-live data"; SaaS reads want the opposite). The canonical shapes come from the `Client server state (TanStack Query)` section of Code conventions — that section is the contract this lesson must match exactly (query-key helper shape, `staleTime: 60_000`, `refetchOnWindowFocus: false`, `maxPages`, the cancel/snapshot/restore optimistic flow, the dual-fetcher/Zod seam). Do not invent alternative shapes.

Mental model the student should leave with: **a query is a read of server state addressed by a key; a mutation is a write with a five-callback lifecycle; the cache is a key→value store you read, write, and invalidate imperatively.** Three sentences. Everything else is detail hung off them.

Where beginners go wrong (surface these as the watch-outs woven into their home sections, never bundled at the end): leaving `staleTime` at the default `0` and getting a refetch storm on every mount/focus; mutating `data` from `useQuery` in place (it's the cache, treat it frozen); putting non-serializable values (`Date`, function refs) in a query key; running `useInfiniteQuery` without `maxPages` on a deep thread; expecting v4's `onSuccess`/`onError` on `useQuery` (removed in v5 — mutations only); calling a second `mutate` inside `onMutate` (recursion — sequence in `onSuccess`); reaching for `useQuery` as a generic state manager (that's `useState`/Zustand — query is server state only).

The worked anchor is the per-invoice comment thread (`/invoices/[id]`), the chapter's running case. The lesson ends on one compact ~25-line `useInfiniteQuery` Client Component that pulls every primitive together — but does NOT wire SSR/provider (that's lesson 3) and does NOT build the full screen (lesson 4 / chapter 077). State that boundary plainly so the student isn't confused when the example has no provider in sight.

Use the established chapter voice (terse, adult, decision-first). Frontmatter mirrors lesson 1: `chapter-id: 76`, `sidebar.order: 2`. Import component paths are `../../../components/...` from `src/content/docs/076 TanStack Query/2 ....mdx`.

## Lesson sections

### Introduction (no header)

Open by closing the loop from lesson 1: the threshold is crossed, the screen is the comment thread — so what do you actually type? Name the four primitives as the lesson's spine and state the one-sentence job of each. Set the explicit boundary: **this lesson is the call site; wiring (provider, SSR hydration) is lesson 3.** Keep it to ~6 lines, warm and brief. Preview the closing payoff: a single Client Component that uses all four pieces together.

### `useQuery`: the read primitive

Teach the read hook first because it is the simplest and every other piece references it.

Lead with the destructure and the senior default:
```tsx
const { data, error, isPending, isFetching } = useQuery({
  queryKey: commentKeys.lists(invoiceId),
  queryFn: () => fetchComments(invoiceId),
  staleTime: 60_000,
});
```
Use **AnnotatedCode** (blue default, ~8 maxLines) to walk: (1) the destructured returns, (2) `queryKey` as cache identity — "this array IS the address", forward-ref the next section, (3) `queryFn` returns a Promise (or throws), (4) `staleTime` controls when a refetch is *allowed*.

Then the load-bearing distinction, **`isPending` vs `isFetching`**, the single most-confused pair in the API. `isPending` = "have I ever resolved?" (true only until first success — no cached data yet). `isFetching` = "is a request in flight right now?" (true on every background refetch too). The UX rule: render the **skeleton on `isPending`**, a subtle **spinner/dimming on `isFetching`**. One-line aside so the third flag doesn't surprise: v5 also derives `isLoading` as exactly `isPending && isFetching` (first-load-and-no-cache); the course teaches the two underlying flags because they map cleanly to the two UI states — mention `isLoading` exists, don't build on it. Visualize with a small HTML+CSS figure inside `<Figure>` — a 2×3 grid (rows: first load, idle-fresh, background refetch; columns: `isPending`, `isFetching`, what the user sees). Pedagogical goal: make the two flags concrete and tie each to a visible UI state so the student stops conflating them. Keep height well under 800px, horizontal.

Land the **`staleTime` senior default** here, framed as a trap-with-fix: the library default is `0`, meaning every mount and every window focus refetches. Right for a stock ticker, wrong for almost every SaaS read. The course default is `60_000` (set once on the QueryClient in lesson 3; overridable per-query with a comment). Use a tiny **CodeVariants** A/B: tab "Library default (`staleTime: 0`)" → "refetches on every mount + focus — a refetch storm"; tab "Senior default (`60_000`)" → "serves cache for a minute, no thrash". One paragraph each, `del`/`ins` not needed — just the value differing.

Watch-out woven in: never mutate `data` in place — it's a direct reference into the cache; mutating it skips re-renders and corrupts the store. Treat it frozen.

Tooltips (`CodeTooltips` on the code block): `staleTime` ("how long cached data is considered fresh; while fresh, no refetch fires on mount or focus"), `queryFn` ("the async function that produces the data; returns a Promise or throws").

### Query keys are the cache contract

This is the discipline section — give it its own h2 because the whole library hinges on key identity.

Teach hierarchical arrays: `['comments']`, `['comments', 'list', invoiceId]`, `['comments', 'detail', commentId]`. The point: `invalidateQueries({ queryKey: ['comments'] })` matches every comment query by **prefix**; a more specific key matches a narrower slice. Keys are serialized internally for lookup, so **only serializable primitives and plain objects** belong in them — no `Date`, no function refs, no class instances (state this as the rule, it's also a watch-out).

Then the senior pattern, lifted verbatim-in-spirit from conventions: a centralized typed `commentKeys` helper so raw arrays never leak across the codebase. Show the exact shape from Code conventions:
```ts
export const commentKeys = {
  all: ['comments'] as const,
  lists: (invoiceId: string) => [...commentKeys.all, 'list', invoiceId] as const,
  detail: (id: string) => [...commentKeys.all, 'detail', id] as const,
};
```
Explicitly link this to the **`tags.ts` discipline from lesson 1 of chapter 072** — same idea (one source of truth for cache strings so read-side and write-side never drift) applied at the client cache layer instead of the Server Component cache layer. This callback cements a known pattern rather than teaching a new one.

Exercise (**Buckets**, two columns): "Will `invalidateQueries({ queryKey: ['comments', 'list', 'inv-1'] })` refetch this query?" Items are query keys; buckets are "Refetched (matches by prefix)" / "Untouched (different prefix)". Goal: cement prefix-matching mechanics. ~6 chips. Grading: prefix match = refetched.

### `queryFn`: what the cache reads from

Short, decision-focused h2. The `queryFn` returns a Promise resolving to the data shape, or throws on failure (a throw becomes `useQuery`'s `error`).

The course's call-site decision: **the `queryFn` calls a route handler** (`fetch('/api/invoices/${id}/comments?...')`), not a Server Action. State why in one crisp paragraph: Server Actions are built for form submissions with redirect/revalidate semantics, not pure reads with stable HTTP error codes; route handlers (chapter 046) are the read seam between the client cache and the database, and double as the public contract any HTTP client can hit. The senior split, stated once: **TanStack reads from route handlers; mutations can go either way** (route handler for the contract-driven case, Server Action for the in-app shortcut) — lesson 4 makes that mutation call concretely.

The **client-side Zod parse** belongs here: the `queryFn` parses its response with the same Zod schema the route handler emits (the contract from lesson 2 of chapter 046). Result: cached data is typed by construction and a shape drift surfaces as a `useQuery` error, not silent corruption. Schema lives in `/lib`; both the handler's response writer and the `queryFn`'s parser import it. Mention the dual-fetcher reality only as a one-line forward pointer ("on the server this same read runs Drizzle directly — lesson 3 covers the branch"); do not teach the branch here.

`Aside` (note) tying it back: this keeps the API open — bringing TanStack Query in added a client cache on top of the route handler without sacrificing it.

### `useMutation`: the write primitive and its lifecycle

The write hook. Lead with the destructure:
```tsx
const { mutate, mutateAsync, isPending, error } = useMutation({
  mutationFn: (input) => postComment(invoiceId, input),
  onMutate,
  onError,
  onSuccess,
  onSettled,
});
```

Teach the **five-callback lifecycle** as a timeline — this is the right place for a **DiagramSequence** (it provides its own card; do not wrap in `<Figure>`). Steps:
1. `mutate(input)` called → `onMutate(input)` fires *before* the request; returns a `context` value carried forward.
2. request in flight → `isPending` true.
3a. success → `onSuccess(data, input, context)`.
3b. failure → `onError(error, input, context)` — receives the context for rollback.
4. either way → `onSettled(data, error, input, context)` — the cleanup seat (where invalidation usually lives).
Per-step captions name what each callback is *for*, not just when it fires. Pedagogical goal: make the rollback channel (`onMutate` returns context → `onError` consumes it) visible as a data flow, because that handoff is the part students miss. Keep the optimistic specifics out of this diagram — it's the generic lifecycle; the optimistic flow gets its own diagram next.

The `mutate` vs `mutateAsync` call: `mutate` is fire-and-forget for the common case (callbacks handle the result); `mutateAsync` returns a Promise for compose-with-`await` flows (chained mutations, redirect-after-mutate). Senior default is `mutate`; reach for `mutateAsync` only when you must await.

Watch-out woven in: calling `mutate` (the same or another mutation) **inside `onMutate`** is a recursion/ordering bug — sequence a follow-up mutation in `onSuccess` instead.

Tooltips: `onMutate` ("runs before the request; its return value becomes `context`, passed to `onError`/`onSettled` — the rollback channel"), `onSettled` ("runs after success *or* error; the place to invalidate").

### Optimistic updates: the v5 two-shape decision

The lesson's pedagogical peak — the decision that separates "knows the API" from "knows the library". Frame it as **a choice between two shapes**, named explicitly, with a clear default and an escalation trigger. Use **CodeVariants** as the primary vehicle (two tabs, the shapes side by side) so the comparison is structural, not buried in prose.

Tab A — **"via variables" (newer, simpler):** the component reads the in-flight `variables` and `isPending` off the mutation and renders the optimistic row *inline* by reading `variables` directly. No cache write, no rollback code — the optimistic row vanishes automatically when the mutation settles. Right for: one list, one optimistic add, one rollback path.

Tab B — **"cache update" (older, more powerful):** `onMutate` runs the cancel→snapshot→write sequence against the cache; `onError` restores the snapshot; `onSettled` invalidates. Right when the optimism must flow into *cached* queries, persist across navigations, or interact with other in-flight mutations.

Below the variants, walk the **cache-update sequence** with a second **DiagramSequence**, because the ordering is subtle and order-dependent:
1. `await queryClient.cancelQueries({ queryKey })` — stop in-flight refetches so a late response can't clobber the optimism.
2. `const prev = queryClient.getQueryData(key)` — snapshot.
3. `queryClient.setQueryData(key, (old) => /* optimistic shape */)` — write.
4. `return { prev }` — hand the snapshot to the rollback channel.
5. on error → `queryClient.setQueryData(key, ctx.prev)` — restore.
6. on settled → `queryClient.invalidateQueries({ queryKey })` — reconcile with the server.
Pedagogical goal: make **cancel-before-write** land as a *correctness* requirement, not a nicety — without it, a poll or background refetch that resolves mid-optimism overwrites the optimistic value. Captions must say *why* each step exists.

State the senior reach explicitly: **start with "via variables"; escalate to "cache update" only when the simpler shape doesn't fit.** Then name the chapter's case: the project uses cache-update because the optimistic comment must appear in the `useInfiniteQuery`'s first page — that's a write into `data.pages[0]`, not an inline render. Forward-pointer to lesson 4 for the full updater; here just establish *which* shape and *why*.

Mention the **UUID reconciliation** convention (from Code conventions): the optimistic value carries the same client-generated UUID the Server Action receives, so the persisted row replaces the optimistic one by key instead of duplicating. One sentence, it pays off in lesson 4.

Exercise (**MultipleChoice**, multi-select-capable): "Which of these require the cache-update shape (not via-variables)?" Options: a single comment list with inline optimistic add (no); the optimistic row must appear in a `useInfiniteQuery` page (yes); the optimism must survive a navigation to another route (yes); a toggle on one component rolled back on failure (no — `useOptimistic` territory). Goal: drill the escalation trigger.

### `useInfiniteQuery`: the cursor-paginated cache

The fourth primitive. Lead with the destructure and config:
```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: commentKeys.lists(invoiceId),
  queryFn: ({ pageParam }) => fetchComments(invoiceId, pageParam),
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
  maxPages: 10,
});
```
Use **AnnotatedCode** to step through the config pieces that differ from `useQuery`: (1) `queryFn` receives `{ pageParam }` (the cursor); (2) `initialPageParam` is the first cursor; (3) `getNextPageParam(lastPage)` returns the next cursor or `undefined` to stop (`undefined`, not `null` — `null` is a valid first param but `undefined` is the "done" signal); (4) `getPreviousPageParam` — present here because `maxPages > 0` requires both directions (see the correctness note below); (5) `maxPages` caps pages held in cache.

Then the **render shape**: `data.pages` is an array of page results; flatten at the render site with `data.pages.flatMap((p) => p.comments)`. Show the `<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>` and the `isFetchingNextPage` spinner. Make the `data.pages` → flatMap shape explicit because students expect a flat array and get a pages array.

The **`maxPages` senior call**, with the memory-leak watch-out as the motivation: without it, a thread the user scrolls deep into accumulates pages in cache forever. `maxPages: 10` is right for a chat-style thread (re-entry to old scroll positions is common, but bounded); `maxPages: undefined` (unbounded) only for feeds where scrolling back up is rare. When a page drops past the cap, it refetches on scroll-back — the cost the cap trades for bounded memory. **Correctness note (v5):** when `maxPages > 0`, `getPreviousPageParam` must also be defined alongside `getNextPageParam`, so a dropped older page can be refetched when the user scrolls back up — state this and show `getPreviousPageParam` in the config (the comment thread pages backward from the first cursor).

Tie back to lesson 1's foil: this is a different cache contract from the **Server Component cursor pagination of lesson 4 of chapter 060**, which produces the right URL but loses already-fetched pages on each "Next". Infinite scroll *accumulates*; cursor pagination *replaces*. One sentence, reinforces the lesson-1 framing.

Exercise (**Dropdowns**, fenced-code mode): a `useInfiniteQuery` config with `___` blanks at `initialPageParam`, the `getNextPageParam` return (`undefined` vs `null` vs `0`), and `maxPages`. Goal: lock the config keys and the "`undefined` stops paging" rule by having the student pick them.

### The cache trio: `invalidateQueries`, `setQueryData`, `removeQueries`

The imperative cache surface, reached via `useQueryClient()`. Open with **`useQueryClient`** itself: `const queryClient = useQueryClient()` returns the singleton wired by the provider (lesson 3); call it inside event handlers and mutation callbacks. Note it is **client-only by definition** — never in a Server Component (a watch-out that also previews a lesson-3 trap).

Then the three calls, each with its one-line senior anchor:
- `invalidateQueries({ queryKey })` — marks matching queries stale and refetches the active ones. **The default after a mutation.**
- `setQueryData(key, updater)` — writes a value directly into the cache. **The optimistic shortcut.**
- `removeQueries({ queryKey })` — evicts entries entirely. **Rare — the tenancy-switch / sign-out sledgehammer.**

Reinforce with a **Buckets** exercise (two columns): scenarios → which call. Items: "after posting a comment, refresh the list" (invalidate); "write the optimistic row before the server responds" (setQueryData); "user switched active org — the cache is the wrong tenant's" (removeQueries / clear); "user signed out" (removeQueries / clear). Goal: build the reflex of mapping intent → call. ~5 chips. (The org-switch `queryClient.clear()` full treatment is lesson 3; here it's just the call's *purpose*, surfaced so `removeQueries` has a real use case.)

### Polling: `refetchInterval` and the background pause

Short, syntax-focused h2 — polling is the first of the four triggers and this is its shape. The basic form:
```tsx
useQuery({ queryKey, queryFn, refetchInterval: 10_000 });
```
The **function form** that self-terminates: `refetchInterval: (query) => (isDone(query.state.data) ? false : 5_000)` — return `false` to stop (e.g. a job-status panel that stops polling when the job completes). Note the v5 callback receives the `query` object (read `query.state.data`), not the bare data — a real API-shape gotcha worth getting right.

The senior pairing: `refetchIntervalInBackground: false` (the default) so **polling pauses when the tab is hidden** — saves the user's battery and the database's connection pool. State 10s as the right cadence for a comment thread and tie it to lesson 1's threshold ("the cadence drops below user-initiated" — 10s clears that bar). For `useInfiniteQuery`, polling additionally *requires* a `maxPages` cap (per conventions) so the polled refetch doesn't grow the cache unbounded — one sentence connecting back to the previous section.

### What gets a query, what doesn't

A short discipline h2 to prevent the most common misuse: treating `useQuery` as a generic state manager. The rule, stated as three buckets:
- **A query** = a read of server state with an identity (the key).
- **A mutation** = a write (or a one-shot fetch in response to a click).
- **A derived value** = `useMemo` over other queries' `data` — *not* its own query with a synthetic key.

Land the senior reflex from conventions: server state only — URL state is `nuqs`, form-input state is `useState`, theme is `next-themes`, generic global client state is Zustand (chapter 078). Reaching for `useQuery` to hold any of those is the misuse.

Exercise (**Buckets**): classify items into "Gets a `useQuery`" / "A mutation" / "`useMemo`, not a query". Items: "the list of comments on an invoice" (query); "posting a new comment" (mutation); "the count of unresolved comments derived from the loaded list" (useMemo); "the draft text in the comment box" (neither — `useState`); "exporting the thread to CSV on a button click" (mutation/one-shot). Goal: the single highest-value discipline check in the lesson. Use `twoCol`.

### The comment thread query, end to end

The closing synthesis — pull every primitive into one compact Client Component. ~25 lines, the project's center of gravity in miniature:
```tsx
'use client';

export function CommentThread({ invoiceId }: { invoiceId: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery({
      queryKey: commentKeys.lists(invoiceId),
      queryFn: ({ pageParam }) => fetchComments(invoiceId, pageParam),
      initialPageParam: null,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      getPreviousPageParam: (first) => first.prevCursor ?? undefined,
      refetchInterval: 10_000,
      maxPages: 10,
    });
  // skeleton on isPending, flat list from data.pages.flatMap, load-more button
}
```
Use **AnnotatedCode** to highlight, one step each: the `'use client'` boundary; the `commentKeys.lists` call (the contract); the cursor `queryFn`; `getNextPageParam`; `refetchInterval` + `maxPages` (the two triggers, live in one config); the `data.pages.flatMap` render; the `fetchNextPage` button gated on `hasNextPage`/`isFetchingNextPage`.

Critically, **state what is missing on purpose**: no provider, no SSR prefetch, no `<HydrationBoundary>`, no optimistic `useMutation` yet. Use an `Aside` (note) to say: "Run this as-is and the first paint shows a skeleton while the cold fetch resolves — lesson 3 wires SSR prefetch so the first page arrives server-rendered. The write side (optimistic add + invalidation) lands in lesson 4." This prevents the student from thinking the example is complete or broken.

Optionally offer an editable **SandpackCallout** (`client:visible`, `dependencies: { '@tanstack/react-query': '^5...' }`, a tiny `QueryClientProvider` + a mocked async `queryFn`) so the student can poke `isPending`/`isFetching` and `staleTime` live — note in the outline this is optional and exists only to make the flags tangible; ReactCoding can't load the npm dep (per project memory) so Sandpack is the only editable path. If included, keep it minimal and self-contained; primary teaching stays in the guided exercises above.

### External resources (optional)

One or two `ExternalResource`/`LinkCard` to the TanStack Query v5 docs: the "Important Defaults" guide (for `staleTime`/`isPending` vs `isFetching`) and the "Optimistic Updates" guide (the cache-update example the cancel-before-write pattern comes from). Only if they add value; do not pad.

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- The four triggers and the conditional framing — lesson 1 of this chapter (assume known; reference, don't restate).
- `useOptimistic` (single-list inline rollback) — lesson 5 of chapter 044; name it as the foil for "via variables" without re-teaching.
- Route handlers and the Zod response contract — chapter 046; name the seam, don't re-teach handler authoring.
- The `tags.ts` cache-string discipline — lesson 1 of chapter 072; reference as the parallel pattern.
- Server Component cursor pagination — lesson 4 of chapter 060; reference as the infinite-scroll foil.

**Deferred to later lessons — do NOT teach here:**
- `QueryClient` instantiation, the `<Providers>` Client Component, `getQueryClient()` / React `cache()` per-request trap, `staleTime`/`gcTime`/`refetchOnWindowFocus` set on the QueryClient, devtools, the dual-fetcher `typeof window` branch — **lesson 3**. (This lesson *names* the senior defaults at the call site but does not show the provider config.)
- `prefetchQuery` / `prefetchInfiniteQuery`, `dehydrate`, `<HydrationBoundary>`, the SSR-hydrated first paint — **lesson 3**.
- The two-system invalidation discipline after a Server Action (`revalidateTag` + client `invalidateQueries`), the org-switch `queryClient.clear()` full treatment — **lesson 3** (this lesson surfaces only the *purpose* of `removeQueries`/`clear`).
- The full worked screen end to end (the real updater function, the read/write split, the verify recipe) — **lesson 4** and **chapter 077**.
- `useMutationState` (shared mutation state across components) — name in one sentence as "exists for a navbar 'Saving…' badge", do not full-treat (it is not load-bearing for the project's core path).
- `useSuspenseQuery` / Suspense mode — name once as the alternative to the `isPending` check; the course uses the imperative `isPending` shape.
- `useQueries` (parallel) and `useQuery({ enabled })` (conditional) — name in passing only.
- Devtools, persistence plugin, online/offline handling, prefetch-on-hover — out of scope, do not introduce.
- Real-time via WebSockets/SSE — out of scope for the course.

## Code conventions notes

Match the `Client server state (TanStack Query)` section of Code conventions exactly: the `commentKeys` helper shape (`all`/`lists`/`detail` with `as const`), `staleTime: 60_000`, the cancel→snapshot→`setQueryData`→restore→invalidate optimistic order, the UUID-reconciliation note, `refetchInterval` + `refetchIntervalInBackground: false`, `maxPages` required for infinite-query polling. Function form: `useQuery` etc. destructured into `const`; the Client Component is an arrow `const` with typed props; `'use client'` at file top. Zod: schemas in `/lib`, top-level format builders (no deprecated chains) if any schema literal is shown. **Deliberate divergence to note for downstream agents:** the closing example intentionally omits the provider/SSR wiring (a staged simplification — lesson 3 completes it); flag this in the example's `Aside` so no reviewer "fixes" it by adding a provider this lesson hasn't taught.

## Fact-check targets (verify post-write)

- TanStack Query **v5** is current; confirm latest stable major and that `isPending` (not v4's `isLoading`) is the first-load flag, `isFetching` semantics unchanged.
- Confirm `useQuery` `onSuccess`/`onError` were **removed in v5** (mutations keep them).
- Confirm `refetchInterval` function form receives the **`query` object** in v5 (`(query) => ...`, read `query.state.data`), and returning `false` stops polling.
- Confirm `useInfiniteQuery` requires `initialPageParam` (v5 addition) and that `getNextPageParam` returns `undefined` to signal "no more pages"; confirm `maxPages` is the current option name and still in v5.
- Confirm the "via variables" optimistic pattern (reading `mutation.variables` + `mutation.isPending` to render an inline optimistic UI) is current v5-documented.
- Confirm `dependencies` install path for `@tanstack/react-query` in Sandpack works against the pinned bundler (if the optional sandbox is included).
