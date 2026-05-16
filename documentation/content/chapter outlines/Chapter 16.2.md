# Chapter 16.2 — Project: TanStack Query on optimistic comments

## Chapter framing

Chapter 16.2 cashes in the threshold and wiring discipline of 16.1 — the four-trigger funnel (16.1.1), the read/write split between `useInfiniteQuery` and the Server Action (16.1.4), the per-request `getQueryClient()` rule on the server (16.1.3), the `<HydrationBoundary>` SSR-hydrated shape (16.1.3), the cache-update optimistic pattern with `cancelQueries` + snapshot + restore (16.1.2 / 16.1.4), the `commentKeys` helper (16.1.2), and the two-system invalidation reality (16.1.3 / 16.1.4) — as one runnable per-invoice comment thread on top of the Unit 11.3 invoices surface. The student wires `<QueryClientProvider>` and the senior defaults, prefetches the thread's first page on the Server Component invoice page, hydrates the client cache, runs `useInfiniteQuery` with cursor paging and a 10-second `refetchInterval`, posts new comments through a Server Action, then fires the cache-update optimistic shape with rollback on `onError` and `invalidateQueries` from the client after the action returns. Each build closes on a runnable state: 16.2.3 ends with the provider wired and the seeded first page rendering with no client loading state on first paint; 16.2.4 ends with infinite scroll and polling live; 16.2.5 ends with optimistic add and rollback wired; 16.2.6 walks the "Done when" clause-by-clause.

Threads through every lesson: TanStack Query is **scoped to the comment thread leaf only** — the rest of the invoice detail page stays Server Components, no `useQuery` creeps outside the `<CommentThread />` subtree; the `QueryClient` is per-request on the server via React's `cache()` and a singleton on the client, never module-scoped on the server; the `queryFn` calls a route handler (`GET /api/invoices/[id]/comments`) so the read seam stays a public HTTP contract that a future mobile or third-party client can hit, and the same handler the Server Component's prefetch can read directly via the in-process branch; the write seam is a Server Action (`addCommentAction`) — Server Actions own form semantics, audit-log writes, and the canonical Result — and the client invalidates the TanStack cache after the action resolves; `commentKeys` is the only place query-key arrays exist, same structural enforcement as `tags.ts` from 15.1.1; the optimistic update is the **cache-update** shape (snapshot via `getQueryData`, write via `setQueryData`, restore in `onError`, invalidate in `onSettled`) because the new row has to land inside `data.pages[0].comments` of the infinite-query cache; `cancelQueries` runs before every optimistic `setQueryData` to prevent an in-flight refetch from overwriting the optimism; polling uses `refetchInterval: 10_000` plus `refetchIntervalInBackground: false` so polling pauses when the tab is hidden; the two-system invalidation (Server Action's `revalidateTag` + client's `invalidateQueries`) is the architectural price tag of bringing TanStack Query in, surfaced deliberately at the seam.

### Dependency carry-in

- **From 11.3 (the starter base):** `app/(app)/invoices/page.tsx` Server Component reading `invoiceListSearchParamsCache`, `app/(app)/invoices/[id]/page.tsx` Server Component reading `getInvoiceDetail({ orgId, id })`, the toolbar / table / pagination shells, the four lifecycle Server Actions, the version-precondition update path.
- **From 10.4 (tenancy + RBAC):** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts`, the active-org slot in the session, `logAudit(tx, event)`.
- **From 6.6 (schema):** `invoices`, `invoice_lines`, `customers`, `organizations`, `org_members`, `audit_logs`, the cursor helpers in `src/db/cursor.ts`. New for this project: `invoice_comments` table — `id uuid pk`, `organizationId uuid fk`, `invoiceId uuid fk`, `authorId uuid fk references users(id)`, `body text not null`, `createdAt timestamptz default now()`. Composite index `(invoiceId, createdAt desc, id desc)` for the cursor.
- **From 7.5 (route handlers):** `authedRoute(role, schema, fn)` wrapper, the canonical JSON response shape `{ data } | { error }`, the Zod parse at the boundary, the shared response schema imported by both the handler and the client `queryFn`.
- **From 7.2 + 7.6:** canonical Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`, `useActionState`.
- **From 5.4.6 / 15.1.2:** `revalidateTag` for the Server Component cache invalidation from the action.
- **From 15.1.1 (`tags.ts`):** the existing `invoiceTag(id)` helper and the new `invoiceCommentsTag(invoiceId)` helper, both invalidated by the action via `revalidateTag` so the Server Component invoice page's cached count refreshes alongside the TanStack cache.
- **From 16.1.2:** `useQuery`, `useMutation`, `useInfiniteQuery` primitives; `commentKeys.list(invoiceId)`; `cancelQueries` + `getQueryData` + `setQueryData` + restore pattern; `maxPages` cap; `refetchInterval` + `refetchIntervalInBackground: false`.
- **From 16.1.3:** `getQueryClient()` with the `typeof window` branch and React `cache()` on the server; `<QueryClientProvider>` with senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`); `<HydrationBoundary>`; `<ReactQueryDevtools />` gated on `NODE_ENV`.
- **From 16.1.4:** the read/write split (infinite query reads, Server Action writes), the cache-update optimistic shape (not via-variables), the two-system invalidation, the 10-second polling cadence with background pause.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided: cacheComponents: true; experimental.useCache enabled
.env.example                    # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
package.json                    # provided: db:migrate, db:seed, dev, build; @tanstack/react-query + devtools
scripts/
  seed.ts                       # provided: two orgs, 60 invoices per org from 11.3, plus 80+ seeded
                                #           comments on one focal invoice per org (so the infinite-query
                                #           has real pages to fetch and the polling demo has a coworker
                                #           insert path)
src/
  db/
    schema.ts                   # provided: full 11.3 schema + new invoice_comments table
    client.ts                   # provided
    relations.ts                # provided
    cursor.ts                   # provided
  lib/
    tenant-db.ts                # provided (10.1)
    authed-action.ts            # provided (10.2)
    authed-route.ts             # provided (7.5)
    audit-log.ts                # provided
    cache/
      tags.ts                   # provided: invoiceTag, orgInvoicesTag + new invoiceCommentsTag helper
    query/
      client.ts                 # TODO student: getQueryClient() with typeof window branch and cache()
      keys.ts                   # TODO student: commentKeys.all / list(invoiceId) helpers
      provider.tsx              # TODO student: 'use client' Providers component wrapping
                                #               QueryClientProvider + ReactQueryDevtools
    comments/
      schema.ts                 # provided: Zod response + request schemas shared by handler + client
      fetcher.ts                # TODO student: fetchCommentsPage({ invoiceId, cursor }) — branches on
                                #               typeof window (in-process DB read on server,
                                #               fetch('/api/...') on client)
      queries.ts                # provided: listCommentsPage({ orgId, invoiceId, cursor, pageSize })
                                #           — direct DB read for server-side prefetch
      actions.ts                # TODO student: addCommentAction (authedAction + Zod + insert
                                #               + logAudit + revalidateTag)
  app/
    api/
      invoices/
        [id]/
          comments/
            route.ts            # TODO student: GET handler — authedRoute, parse cursor,
                                #               call listCommentsPage, return the typed payload
    layout.tsx                  # provided shell; TODO student: wrap children in <Providers>
    (app)/
      invoices/
        [id]/
          page.tsx              # provided shell; TODO student: per-request QueryClient,
                                #                                prefetchInfiniteQuery, dehydrate,
                                #                                <HydrationBoundary>
          comment-thread.tsx    # TODO student: 'use client'; useInfiniteQuery, infinite scroll,
                                #                useMutation with optimistic + rollback, post form
          comment-form.tsx      # provided shell; TODO student: useActionState wiring to
                                #                                addCommentAction + the post mutation
    inspector/
      page.tsx                  # provided: org/user switcher, focal-invoice picker, "force 500
                                #           on next POST" debug toggle, "insert coworker comment"
                                #           button (writes a row from another user in the seed),
                                #           "clear client cache" button, query-state panel that
                                #           reads from React Query Devtools data
```

### Reference solution signatures lessons display

- **Query client factory** (`src/lib/query/client.ts`):
  - `makeQueryClient()` — returns `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false } } })`.
  - `getQueryClient = cache(() => makeQueryClient())` on the server (React `cache()` scopes per-request).
  - On the client, a module-scoped singleton `let clientSingleton: QueryClient | undefined; getQueryClient = () => (clientSingleton ??= makeQueryClient())`.
  - The same module exports one helper; the body branches on `typeof window === 'undefined'`. The branch is the load-bearing piece.
- **Query keys** (`src/lib/query/keys.ts`):
  - `commentKeys = { all: ['comments'] as const, list: (invoiceId: string) => ['comments', invoiceId, 'list'] as const }`.
  - The hierarchy lets `invalidateQueries({ queryKey: ['comments'] })` match all comment lists, `invalidateQueries({ queryKey: commentKeys.list(invoiceId) })` matches one thread. The `as const` keeps the tuple narrow.
- **Providers** (`src/lib/query/provider.tsx`):
  - `'use client'` at the top; `export function Providers({ children }: { children: ReactNode }) { const queryClient = getQueryClient(); return <QueryClientProvider client={queryClient}>{children}{process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}</QueryClientProvider> }`.
- **Comments response schema** (`src/lib/comments/schema.ts`):
  - `commentSchema = z.strictObject({ id: z.string().uuid(), invoiceId: z.string().uuid(), authorId: z.string().uuid(), authorName: z.string(), body: z.string(), createdAt: z.string().datetime() })`.
  - `commentsPageSchema = z.strictObject({ comments: z.array(commentSchema), nextCursor: z.string().nullable() })`.
  - `addCommentInput = z.strictObject({ invoiceId: z.string().uuid(), body: z.string().min(1).max(2000) })`.
- **Direct DB read** (`src/lib/comments/queries.ts`):
  - `listCommentsPage({ orgId, invoiceId, cursor, pageSize }: { orgId: string; invoiceId: string; cursor: string | null; pageSize: number }): Promise<{ comments: Comment[]; nextCursor: string | null }>` — joins `invoice_comments` with `users` for `authorName`, filters by `(organizationId, invoiceId)`, decodes the cursor `(createdAt, id)`, orders `createdAt desc, id desc`, limits `pageSize + 1` to detect more pages.
- **Fetcher with branch** (`src/lib/comments/fetcher.ts`):
  - `fetchCommentsPage = async ({ invoiceId, cursor }: { invoiceId: string; cursor: string | null }) => { if (typeof window === 'undefined') { const { orgId } = await getActiveOrg(); return listCommentsPage({ orgId, invoiceId, cursor, pageSize: 20 }); } const url = new URL(\`/api/invoices/${invoiceId}/comments\`, window.location.origin); if (cursor) url.searchParams.set('cursor', cursor); const res = await fetch(url, { credentials: 'same-origin' }); if (!res.ok) throw new Error('Failed to fetch comments'); const json = await res.json(); return commentsPageSchema.parse(json.data); }`.
- **Route handler** (`app/api/invoices/[id]/comments/route.ts`):
  - `export const GET = authedRoute({ role: 'member', schema: z.strictObject({ cursor: z.string().nullable().optional() }), handler: async ({ ctx, query, params }) => { const page = await listCommentsPage({ orgId: ctx.orgId, invoiceId: params.id, cursor: query.cursor ?? null, pageSize: 20 }); return Response.json({ data: commentsPageSchema.parse(page) }); } })`.
- **Server Action** (`src/lib/comments/actions.ts`):
  - `addCommentAction = authedAction('member', addCommentInput, async (input, ctx) => { const inserted = await tenantDb(ctx.orgId).transaction(async (tx) => { const [row] = await tx.insert(invoiceComments).values({ organizationId: ctx.orgId, invoiceId: input.invoiceId, authorId: ctx.user.id, body: input.body }).returning(); await logAudit(tx, { action: 'comment.added', subjectType: 'invoice_comment', subjectId: row.id, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: {} }); return row; }); await revalidateTag(invoiceCommentsTag(input.invoiceId), 'max'); return { ok: true as const, data: { id: inserted.id, createdAt: inserted.createdAt.toISOString() } }; })`.
- **Server Component prefetch** (`app/(app)/invoices/[id]/page.tsx`):
  - `const queryClient = getQueryClient(); await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.list(id), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId: id, cursor: pageParam }), initialPageParam: null as string | null }); const dehydrated = dehydrate(queryClient); return <HydrationBoundary state={dehydrated}><CommentThread invoiceId={id} /></HydrationBoundary>` — wrapped beneath the existing 11.3 invoice header / customer card / lines table (those stay Server Components).
- **Client thread** (`app/(app)/invoices/[id]/comment-thread.tsx`):
  - `'use client'`; `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. Renders `data.pages.flatMap(p => p.comments)` newest first; `<button onClick={() => fetchNextPage()}>` for "Load older"; `isFetchingNextPage` spinner.
- **Optimistic mutation** (inside `comment-thread.tsx`):
  - `useMutation({ mutationFn: async (body: string) => { const result = await addCommentAction({ invoiceId, body }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }, onMutate: async (body) => { await queryClient.cancelQueries({ queryKey: commentKeys.list(invoiceId) }); const snapshot = queryClient.getQueryData(commentKeys.list(invoiceId)); const optimistic = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body, createdAt: new Date().toISOString() }; queryClient.setQueryData(commentKeys.list(invoiceId), (old) => old ? { ...old, pages: [{ ...old.pages[0], comments: [optimistic, ...old.pages[0].comments] }, ...old.pages.slice(1)] } : old); return { snapshot, optimisticId: optimistic.id }; }, onError: (_err, _body, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.list(invoiceId), ctx.snapshot); }, onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) }); } })`.
- **Env entries:** unchanged from 11.3. No new third-party services for this project.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every "Done when" clause. Refreshes on submit via `router.refresh()`.

- **Header:** session-user switcher (admin / member per seeded org), org switcher (two seeded orgs), focal-invoice picker (one per org, the seeded thread).
- **"Force 500 on next POST" toggle:** when on, sets a server-side flag (env-backed in dev, an in-memory `Map` keyed by user in the starter) that makes the next `addCommentAction` invocation return `{ ok: false, error: { code: 'forced_500', userMessage: 'Forced failure for verification' } }` after the route handler intentionally throws. The toggle auto-clears on the first invocation so the next add succeeds. The teaching surface for the rollback step in 16.2.6.
- **"Insert coworker comment" button:** invokes a server-only action that inserts an `invoice_comments` row authored by the **other** seeded user in the active org. The button does **not** call `revalidateTag` — the TanStack Query poll is what surfaces the row on the open client. Used to verify cross-session arrival within the 10-second window.
- **"Clear client cache" button:** posts to `/inspector` with a redirect that includes a `?clearCache=1` flag the layout reads to call `queryClient.clear()` once on the next mount (a tiny effect in the provider). Used to demonstrate the SSR-hydrated first paint without a leftover cache.
- **Query-state panel:** an iframe-style panel embedding `<ReactQueryDevtools />` in standalone mode (or a small custom panel reading via `useQueryClient().getQueryCache().findAll()`) so the student can see the `comments` cache state, the `isStale` flag, and the page-count for the infinite query.
- **Audit-log tail:** last 20 `comment.added` rows from `audit_logs`, scoped to the active org. Confirms the Server Action's audit-log write fires on the happy path and does not fire on the forced-500 path.
- **"Toggle background polling" debug:** flips `refetchIntervalInBackground` between `false` and `true` for the open thread, demonstrating the battery-and-pool discipline by watching the network tab pause when the tab is hidden.

The inspector is provided in full; the student writes only `client.ts`, `keys.ts`, `provider.tsx`, `fetcher.ts`, the route handler, `actions.ts`, the prefetch wiring in the invoice detail page, and the thread component.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| New comments from another browser session appear within the poll window | Open invoice detail in browser A; note the comment count. From the inspector in browser B (different session, same org), click "Insert coworker comment". Within 10 seconds, browser A's thread shows the new row at the top — the `useInfiniteQuery`'s `refetchInterval` pulled it in. The audit-log tail shows the insert. No manual refresh. |
| Submitting a comment shows immediately | Type a comment in browser A's form; submit. The new row appears at the top of the list synchronously (the `onMutate` `setQueryData` wrote it). The form clears. The audit-log tail shows the `comment.added` row. The cache devtools panel shows the optimistic row inside `data.pages[0].comments` with an `optimistic-…` id, then the id flips to the server-generated UUID on `invalidateQueries` settle. |
| Rolls back if the server returns an error | Toggle "Force 500 on next POST" in the inspector. Submit a comment. The optimistic row appears, then vanishes when `onError` restores the snapshot. An error banner surfaces from the mutation's `error` state. The audit-log tail is unchanged (the transaction rolled back before the audit-log write). The cache devtools panel shows the restored snapshot — no orphan optimistic row. |
| Scrolling up loads older pages without re-fetching the already-loaded head | Open the focal invoice (80+ seeded comments). The first page renders from the SSR-hydrated cache — no loading flash on first paint. Click "Load older" three times; pages 2, 3, 4 load via the route handler. Scroll back to the top; the head is still there — no refetch, no flicker. The cache panel shows `data.pages.length` growing on each click and the head page unchanged. |
| Initial paint shows the seeded thread with no client loading state | Hard-refresh the invoice detail. The first 20 comments render immediately — no skeleton, no spinner, no waterfall. View source: the dehydrated state is in the RSC payload. `useInfiniteQuery`'s `isPending` is `false` on first render because the cache is populated from `<HydrationBoundary>`. |
| The QueryClient does not leak across server requests | Hit the focal invoice page from two different orgs in rapid succession (admin in org A, then admin in org B). The org-B page shows org-B's comments — no org-A rows leaked. The server logs show two distinct `QueryClient` instances created (one per request) via the `cache()`-wrapped factory. Flip the factory to module-scoped (a deliberate misuse demo via an env flag if the starter ships it) and observe the cross-request leak — org-B sees org-A's seeded comments on the first hit. |
| TanStack Query is scoped to the comment thread only | Grep the codebase for `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient` outside `app/(app)/invoices/[id]/comment-thread.tsx` (and the provider). Zero hits. The toolbar, table, pagination, lifecycle actions — all still Server-Component / Server-Action shape from 11.3. |
| The route handler is the read seam, the Server Action is the write seam | The browser's network tab on "Load older" shows a `GET /api/invoices/[id]/comments?cursor=...` request. The submit on "Add comment" shows a Next.js Server Action POST to the page, not a `fetch` to a route handler. The audit-log write happens inside the action's transaction. |
| The two-system invalidation fires at the seam | The `addCommentAction` body calls `revalidateTag(invoiceCommentsTag(invoiceId), 'max')` after commit — the invoice page's Server-Component-rendered comment count refreshes. The mutation's `onSettled` calls `queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) })` — the client cache refetches. Both fire; both layers stay consistent. Skipping either is the demo for the failure-mode callouts in 16.2.5. |
| Polling pauses when the tab is hidden | Open the thread; switch to another tab for 30 seconds; the network tab shows no `GET /api/...comments` requests during the hidden interval. Switch back; the next poll fires within 10 seconds. `refetchIntervalInBackground: false` is doing its job. |
| `commentKeys` is the only place query-key arrays exist | Grep `\\[\\s*['\"]comments['\"]\\s*,` outside `src/lib/query/keys.ts`. Zero hits. Every `useInfiniteQuery`, `useMutation`, `invalidateQueries`, `setQueryData`, `cancelQueries` call imports the helper. |
| Cross-session arrival does not duplicate the optimistic row | While the optimistic add is in flight (introduce a 1-second delay in the action via a debug flag), the inspector "Insert coworker comment" fires. Both rows arrive; on `onSettled`'s `invalidateQueries`, the refetch returns both rows from the database, the optimistic placeholder is replaced by the canonical server row, no duplicate visible to the user. The `optimisticId` returned from `onMutate` is the dedup anchor. |

### Concepts demonstrated → owning lesson

- The four-trigger funnel and the comment-thread case clearing three of them — 16.1.1 + 16.1.4.
- `useInfiniteQuery` with `getNextPageParam`, `initialPageParam`, `maxPages` — 16.1.2.
- `useMutation` lifecycle and the cache-update optimistic shape — 16.1.2 + 16.1.4.
- `cancelQueries` + `getQueryData` + `setQueryData` + restore — 16.1.2.
- Polling with `refetchInterval` + `refetchIntervalInBackground: false` — 16.1.2 + 16.1.4.
- `queryClient.invalidateQueries` after the Server Action returns — 16.1.3.
- `commentKeys` as the structural enforcement — 16.1.2 (mirrors 15.1.1's `tags.ts`).
- Per-request `QueryClient` on the server via React `cache()` — 16.1.3.
- `<QueryClientProvider>` + senior defaults (`staleTime`, `gcTime`, `refetchOnWindowFocus: false`) — 16.1.3.
- `<HydrationBoundary>` and `dehydrate` for SSR-hydrated initial data — 16.1.3.
- The fetcher branch on `typeof window` for in-process server reads — 16.1.3.
- `<ReactQueryDevtools />` gated on `NODE_ENV` — 16.1.3.
- `'use client'` boundary placement at the leaf, not the page — 16.1.3 (5.2.2 frame).
- Route handlers as the read seam — 7.5 (16.1.4 frame).
- Server Actions as the write seam, canonical Result, audit-log write — 7.2 / 10.4.
- The two-system invalidation reality (Server Component cache vs. TanStack cache) — 16.1.3 + 16.1.4.
- Zod parse at every boundary (route handler, fetcher, action) — 7.1.

---

## Lesson 16.2.1 — Project brief

Frames the build: bolt a polling, infinite-scrolling, optimistically-added comment thread onto the 11.3 invoice detail page with TanStack Query scoped to the leaf, names the "Done when" clauses, and links the starter.

Goals:

- Frame the build: take the 11.3 invoice detail page and add a real-time-ish comment thread — `<QueryClientProvider>` wired in the root layout, the invoice page's Server Component prefetches the first page via `prefetchInfiniteQuery` and hands a dehydrated cache to `<HydrationBoundary>`, the client `<CommentThread />` runs `useInfiniteQuery` with 10-second polling and infinite-scroll-up paging, posting a comment fires a Server Action with cache-update optimistic add and rollback on failure. Show one screenshot of the finished invoice page: header, customer card, line items, and the comment thread at the bottom with a posted optimistic row visible.
- State the "Done when" in one paragraph: first paint of the invoice page shows the seeded thread with no client loading skeleton (SSR-hydrated cache); posting a comment shows the row instantly and persists after the action returns; toggling "Force 500" in the inspector makes the next post optimistically appear then roll back with an error banner; the inspector's "Insert coworker comment" surfaces inside the open thread within 10 seconds (polling); scrolling up the thread loads older pages without refetching the head; switching tabs pauses polling.
- Scope cuts: no WebSockets / Server-Sent Events (out of scope for this course; polling is the threshold-met case from 16.1.4); no comment edit / delete / moderation (product scope, not the library demo); no @-mention notifications (Unit 14 territory — the thread is a flat list); no rich-text body — `body` is plain `string` with a `min(1).max(2000)` Zod cap; no Suspense-mode (`useSuspenseQuery`) — the chapter project uses the imperative `isPending` shape because the SSR-hydrated cache populates the first render and the polling case is incompatible with throwing on stale; no offline persistence (the persist-query-client plugin is named once in 16.1.2 and skipped here).
- Senior payoff: this is the canonical TanStack-Query-on-App-Router shape for the rest of the course. Any future surface that clears the four-trigger funnel reuses the same skeleton — provider + per-request factory + prefetch + hydration boundary + leaf client component running `useInfiniteQuery`/`useMutation` with cache-update optimistic. The route-handler-as-read-seam plus Server-Action-as-write-seam split is the load-bearing architectural call.
- Show the end UX: a short capture of the comment thread — type-and-submit (optimistic appears, settles), inspector "Insert coworker" (new row within 10s), toggle "Force 500" then submit (optimistic appears, rolls back), scroll up to load older pages.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 11.3 working end-to-end plus the new `invoice_comments` table with 80+ seeded rows per focal invoice. The 11.3 surface stays untouched — every change in this project lives under `src/lib/query/`, `src/lib/comments/`, the new route handler, the invoice detail page's prefetch wiring, and the leaf `<CommentThread />` component.
- The TOC suggests "QueryClientProvider + HydrationBoundary" and "useInfiniteQuery with polling" as two lessons. The outline splits them deliberately: 16.2.3 lands the provider, the per-request factory, the prefetch, and the hydration boundary so the seeded first page renders SSR-hydrated; 16.2.4 layers infinite scroll and polling on top. Each is independently verifiable.
- The cache-update optimistic shape (snapshot + setQueryData + restore + invalidate) is the heavier path — the via-variables shape from 16.1.2 doesn't fit because the optimistic row has to land inside the infinite-query cache's `data.pages[0].comments`, not be rendered inline by reading `mutation.variables`. The lesson surfaces this decision once and commits.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated (including the new `invoice_comments` table), seed loaded; `pnpm dev` shows the 11.3 invoice detail page working with no comment thread yet (the leaf component is unimported); `/inspector` loads but the cache-state panel is empty (no provider).

Estimated student time: 10 to 15 minutes.

---

## Lesson 16.2.2 — Tour the starter and the inspector

Walks the provided file tree, the new `invoice_comments` schema and seed, the route-handler scaffolding, the shared Zod schemas, the in-process `listCommentsPage` read, and every inspector panel and debug toggle.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: `src/lib/query/client.ts` (empty — 16.2.3), `src/lib/query/keys.ts` (empty — 16.2.3), `src/lib/query/provider.tsx` (empty — 16.2.3), `src/lib/comments/fetcher.ts` (empty — 16.2.4), `app/api/invoices/[id]/comments/route.ts` (empty — 16.2.4), `src/lib/comments/actions.ts` (empty — 16.2.5), plus the two consumer files `app/(app)/invoices/[id]/page.tsx` (provided Server Component shell — student adds prefetch in 16.2.3) and `app/(app)/invoices/[id]/comment-thread.tsx` (empty — 16.2.4 + 16.2.5).
- Read the schema: the new `invoice_comments` table with the composite index on `(invoiceId, createdAt desc, id desc)`. The seed populates 80+ rows per focal invoice authored by two seeded users so the "coworker insert" verification has a second identity to attribute rows to.
- Read the route-handler scaffolding: `authedRoute` is the 7.5 wrapper; the empty `route.ts` exports a placeholder that returns 501. The Zod schemas in `src/lib/comments/schema.ts` are shipped, shared by the handler and the client fetcher.
- Read `src/lib/comments/queries.ts` — the `listCommentsPage` direct DB read is provided in full because the SQL is not the lesson (cursor pagination was the 6.6 lesson, scoped queries 11.3). The student calls it from two places: the route handler (server side, public) and the in-process branch of `fetcher.ts` (server side, internal). The same function, two callers.
- Read `next.config.ts`: `cacheComponents: true` is on from 11.3; the invoice detail page's existing Server-Component reads stay cached. Adding the comment thread does not touch that — the cached subtree is the invoice header, the comment thread is a fresh dynamic-with-client-cache leaf.
- Read the inspector end-to-end — every panel, button, debug toggle. The "Force 500 on next POST", "Insert coworker comment", "Clear client cache", and "Toggle background polling" controls are the verification surface for 16.2.6.
- Read the layout: `app/layout.tsx` is a shell waiting for `<Providers>{children}</Providers>` — the only edit there is one import and one wrap.
- Run the app: `/invoices/[id]` renders the 11.3 invoice detail page; the comment-thread section is empty (the leaf component is unimported). `/inspector` loads but the query-state panel is blank.

Senior calls and watch-outs:

- `src/lib/query/` is a feature-shaped directory, not a generic `utils/`. Per Architectural Principle #4 (name things for intent), the directory groups everything TanStack-Query-related — factory, keys, provider — so the senior reader sees the boundary. New TanStack-Query consumers in future projects extend this directory.
- The fetcher's `typeof window` branch is deliberate. The lesson does **not** unify it into a single fetch call — server-side prefetch should read directly from Postgres, not hop through HTTP back to your own host. The branch is the load-bearing architectural call; the route handler still exists for external HTTP clients.
- The seeded comments include some authored by the active session user and some by a second seeded user. The cross-session demo writes from the second user's identity via the inspector — no real second browser is needed for the polling test (though the verification works with one if the student wants).
- `commentKeys` lives in `src/lib/query/keys.ts` because key arrays are query-system identifiers — the parallel to `tags.ts` from 15.1.1. Future projects will extend `keys.ts` with `notificationKeys`, `jobKeys`, etc. Same discipline.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, invoice detail page tried, comment thread section empty as expected. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 16.2.3 — Provider, per-request factory, and the SSR-hydrated first page

Wires `getQueryClient()` with the `typeof window` branch and React `cache()`, the `commentKeys` helper, the `<Providers>` shell with senior defaults and gated devtools, the in-process fetcher branch, and the invoice page's `prefetchInfiniteQuery` plus `<HydrationBoundary>` so the seeded thread paints with no client loading state.

Goals:

- Fill `src/lib/query/client.ts`: define `makeQueryClient()` with the senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`). Export `getQueryClient` that branches on `typeof window === 'undefined'`: on the server, return `cache(makeQueryClient)()` (React's per-request memoization); on the client, return a module-scoped singleton. Comment the branch with the cross-request-leak failure mode named in 16.1.3 — name the bug at the call site so future readers know why the branch is there.
- Fill `src/lib/query/keys.ts`: `commentKeys = { all: ['comments'] as const, list: (invoiceId: string) => ['comments', invoiceId, 'list'] as const }`. Lock the hierarchy now so 16.2.4 and 16.2.5 share the same identity. `as const` keeps the tuples narrow.
- Fill `src/lib/query/provider.tsx`: `'use client'` at the top; the `Providers` component creates the client via `getQueryClient()` and wraps `children` in `<QueryClientProvider>`. Mount `<ReactQueryDevtools initialIsOpen={false} />` gated on `process.env.NODE_ENV !== 'production'` so devtools tree-shakes from production. The `'use client'` directive is mandatory — `QueryClientProvider` uses `createContext`, which only runs on the client.
- Edit `app/layout.tsx`: import `Providers`, wrap `{children}` once. The only edit in the entire layout file.
- Fill the in-process branch of `src/lib/comments/fetcher.ts`: the `typeof window === 'undefined'` branch resolves the active org and calls `listCommentsPage({ orgId, invoiceId, cursor, pageSize: 20 })`. The client branch is stubbed with a TODO that 16.2.4 completes — for now the first paint only needs the server-side prefetch to work.
- Edit `app/(app)/invoices/[id]/page.tsx`: above the existing 11.3 invoice header / customer card / lines table render, create the per-request `queryClient` via `getQueryClient()`, call `await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.list(id), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId: id, cursor: pageParam }), initialPageParam: null as string | null })`, then `dehydrate(queryClient)`. Wrap the **bottom** of the existing render (where the comment thread will live) in `<HydrationBoundary state={dehydratedState}>`. The existing Server Components above stay outside the boundary — they don't need it.
- Create a minimal `app/(app)/invoices/[id]/comment-thread.tsx`: a `'use client'` component that reads the populated cache via `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: () => { throw new Error('client fetcher not wired yet') }, initialPageParam: null as string | null, getNextPageParam: () => null })` and renders `data?.pages.flatMap(p => p.comments).map(...)` — no polling, no infinite scroll, no form. The first paint reads from the hydrated cache; the `queryFn` is never called on initial render because `isPending` is `false` from the hydrated data.
- Run the app: open an invoice detail page. The thread renders 20 seeded comments immediately on first paint — no skeleton, no flicker. View source: the dehydrated state is in the RSC payload (search for `\"comments\"` in the HTML). Open the React Query devtools (the floating icon); the `['comments', invoiceId, 'list']` query is present, `state: 'success'`, no fetch fired. Hard-refresh; the SSR-hydrated cache is rebuilt each time, the first paint is still instant.

Senior calls and watch-outs:

- The per-request branch is the most important six lines in the chapter. Module-scoped `new QueryClient()` on the server leaks across requests — in a multi-tenant SaaS, org A's prefetched data ends up in org B's cache. The `cache()`-wrapped factory scopes the instance to the React-server-render lifecycle. The client branch is the opposite — one singleton that survives across renders, which is the entire point of a cache.
- The `prefetchInfiniteQuery` call on the server uses the **same** `fetcher` function the client will use. The fetcher's `typeof window` branch picks the in-process DB read on the server side, the `fetch('/api/...')` on the client side. The key insight: one `queryFn`, two execution contexts, identical cache contract — the keys and the response shape match by construction.
- `<HydrationBoundary>` only needs to wrap the subtree that will run `useQuery` / `useInfiniteQuery` on those keys. Wrapping the entire page is fine but unnecessary — the comment-thread leaf is what reads from the hydrated cache. The 5.2.2 boundary discipline: push `'use client'` as deep as it goes.
- `staleTime: 60_000` at the provider level is the SaaS default — without it, every mount and tab focus would refetch, which is the 2022-era React Query behavior that produces refetch storms. The polling cadence in 16.2.4 overrides this per-query via `refetchInterval` (which works alongside `staleTime`, not against it).
- `refetchOnWindowFocus: false` at the provider is the senior call for the authenticated SaaS surface. Live-data tools (job dashboards, stock tickers) flip this on per-query; the default for an invoice thread is off — focus is not a meaningful event for the user's intent.
- `<ReactQueryDevtools />` is dev-only. Gating on `process.env.NODE_ENV !== 'production'` lets the bundler tree-shake the devtools out of the production bundle. Skipping the gate ships ~30KB of devtools to every visitor.
- The hydration boundary works only if the query key on the server's `prefetchInfiniteQuery` **exactly** matches the key on the client's `useInfiniteQuery`. Using `commentKeys.list(invoiceId)` in both places (imported from `src/lib/query/keys.ts`) is the structural enforcement — raw arrays in either spot would be the silent miss.

Codebase state at entry: empty `query/` directory, empty layout providers, empty comment thread.
Codebase state at exit: provider mounted in the root layout, per-request factory wired with the `typeof window` branch, `commentKeys` helper in place, invoice detail page prefetches the first page of the thread and dehydrates into `<HydrationBoundary>`, `<CommentThread />` reads from the hydrated cache and renders the seeded first page on first paint with no loading state. **Runnable — the SSR-hydrated initial paint demonstrably works; no client refetch, no polling, no infinite scroll, no posting yet.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 16.2.4 — Infinite scroll, polling, and the route handler

Fills the client fetcher branch, the `authedRoute` `GET` handler as the public read seam, and the leaf's `useInfiniteQuery` with cursor paging, `maxPages: 10`, 10-second `refetchInterval`, and `refetchIntervalInBackground: false` so "Load older" and cross-session arrival both work.

Goals:

- Fill the client branch of `src/lib/comments/fetcher.ts`: build the URL with `cursor` as an optional search param, `fetch` it with `credentials: 'same-origin'`, parse the response envelope (`{ data }` shape from 7.5), validate with `commentsPageSchema.parse`, throw on `!res.ok` so `useInfiniteQuery` surfaces the error. The fetcher now works on both sides — server-side prefetch unchanged, client-side polls and scroll-fetches via this branch.
- Fill `app/api/invoices/[id]/comments/route.ts`: the `GET` handler is `authedRoute({ role: 'member', schema: <cursor parser>, handler })`. Inside the handler, call `listCommentsPage({ orgId: ctx.orgId, invoiceId: params.id, cursor: query.cursor ?? null, pageSize: 20 })`. Return `Response.json({ data: commentsPageSchema.parse(page) })`. The handler is the public HTTP contract; the in-process branch of the fetcher bypasses it on the server side.
- Rewrite `app/(app)/invoices/[id]/comment-thread.tsx` to the real shape:
  - `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`.
  - Render `data?.pages.flatMap(p => p.comments).map(...)` newest first (the DB returns descending; the component renders top-down).
  - "Load older" button at the bottom of the rendered list: `<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>` — when `hasNextPage` is false, show "End of thread"; when `isFetchingNextPage` is true, show a small spinner.
  - Render an `isFetching` indicator (a subtle dot or "Updating..." chip) at the top of the thread so the user can tell when a poll is in flight without confusing it with the per-page spinner — 16.1.2's `isPending` vs. `isFetching` distinction applied.
- Verify the prefetched cache survives: the page-level Server Component already pre-populated `commentKeys.list(invoiceId)`. The first render reads from that cache and does **not** fire `queryFn` — confirm in devtools that the initial query has `status: 'success'`, `fetchStatus: 'idle'`, and no network request fired on first paint.
- Run the app: open an invoice detail. First paint shows 20 seeded comments instantly. Click "Load older" — the network tab shows `GET /api/invoices/[id]/comments?cursor=...`, the response renders below the existing rows, the head stays put. Click again — page 3 appended. Switch tabs for 30 seconds — network tab silent (background polling paused). Switch back — within 10 seconds, a `GET /api/.../comments` request fires; the response is identical to what's cached, no visible change. From the inspector in a second tab (or after a session switch), click "Insert coworker comment" — within 10 seconds, the new row appears at the top of the thread. The audit-log tail in the inspector shows the insert.

Senior calls and watch-outs:

- The fetcher's branch is the load-bearing architectural call. The server-side prefetch reads directly from Postgres (zero HTTP hop), the client-side fetch goes through the route handler (the public seam). One function in `/lib`, two execution paths. The temptation to "just call `listCommentsPage` from the client too" fails because (a) the client cannot import Drizzle (it would bundle the database driver) and (b) the seam matters — the route handler is the contract a future mobile app will use.
- `maxPages: 10` is the senior memory cap from 16.1.2. For a 1000-comment thread, scrolling deep keeps the 10 most-recent loaded pages in memory; older pages drop and refetch if the user scrolls back. Without the cap, an unbounded `useInfiniteQuery` accumulates pages until the tab is closed. The senior call: chat-style threads cap at 10; feed-style read-once surfaces are unbounded.
- `refetchInterval: 10_000` with `refetchIntervalInBackground: false` is the threshold-met polling cadence from 16.1.4. Faster (1s, 2s) floods the connection pool and burns mobile battery; slower (30s, 60s) feels stale. The framework's `document.hidden` check is what pauses polling — flipping `refetchIntervalInBackground: true` (the inspector toggle) keeps polling when hidden, useful for status-panel surfaces but wrong for a thread.
- `useInfiniteQuery` doesn't know about the SSR-hydrated initial page on its own — the hydration boundary populates the cache, and the `useInfiniteQuery` call finds the entry by key. The `initialPageParam: null` value must match exactly between the prefetch and the hook (`null` here because the first page has no cursor). Mismatched initial-page-params produce a cold fetch on first render even with the hydration boundary in place.
- The route handler's `authedRoute` wrapper enforces the tenancy boundary at the read seam (same as `authedAction` does at the write seam). A request for an invoice belonging to a different org returns 403 before `listCommentsPage` runs. Tenancy isolation holds at the route-handler layer the same way it does at the data layer and the cache-tag layer — defense in depth.
- The Zod parse on the client side (`commentsPageSchema.parse(json.data)`) is the contract enforcement from 7.1 / 7.5. If the route handler drifts (a new field added without updating the schema), the client fails loudly with a parse error rather than silently rendering broken UI. The schema lives in `src/lib/comments/schema.ts` — both the handler and the fetcher import it.
- The "Load older" button is the canonical infinite-scroll trigger for a SaaS thread. An `IntersectionObserver`-based auto-load-on-scroll is named once as an alternative (better UX for feeds, worse for threads where the user might accidentally scroll past) and skipped — the button keeps the interaction explicit.

Codebase state at entry: provider + per-request factory + hydration boundary working; client thread shows the seeded first page with no interactivity.
Codebase state at exit: route handler live, client fetcher branch wired, `useInfiniteQuery` running with 10-second polling and `maxPages: 10`, "Load older" loads pages 2/3/4 from the route handler, polling pauses when the tab is hidden, "Insert coworker comment" surfaces within 10 seconds in the open thread. **Runnable — the read side is complete; no posting yet (the form is unwired).**

Estimated student time: 55 to 70 minutes.

---

## Lesson 16.2.5 — Optimistic add and rollback with `useMutation`

Writes the `addCommentAction` Server Action with audit-log and `revalidateTag`, then wires the form's `useMutation` with `cancelQueries`, snapshot, `setQueryData`, restore in `onError`, and `invalidateQueries` in `onSettled` — surfacing the two-system invalidation reality at the seam.

Goals:

- Fill `src/lib/comments/actions.ts`: `addCommentAction = authedAction('member', addCommentInput, fn)`. Inside `fn`, wrap the insert in a `tenantDb(ctx.orgId).transaction`: insert the row, call `logAudit(tx, { action: 'comment.added', subjectType: 'invoice_comment', subjectId: row.id, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: {} })`, return the row with `createdAt` ISO-stringified. After the transaction commits and **before** returning, call `await revalidateTag(invoiceCommentsTag(input.invoiceId), 'max')` so the Server Component invoice page's cached comment count refreshes on the next visit. Return `{ ok: true, data: { id, createdAt } }`. On Zod parse failure or DB error, the wrapper returns the canonical `{ ok: false, error }` shape — the rollback path the mutation will key on.
- Wire the form in `app/(app)/invoices/[id]/comment-form.tsx`: the form has a `<textarea name="body">` and a submit button. The form is a child of the `<CommentThread />` so it shares the `useQueryClient` scope. Two options for the wiring:
  - **The chosen path:** form `onSubmit` calls `mutation.mutate(body)`. The mutation's `mutationFn` calls `addCommentAction({ invoiceId, body })` programmatically and throws on `{ ok: false }` so `onError` fires. This is the right shape for the optimistic-add use case because `useMutation` owns the lifecycle hooks (`onMutate`, `onError`, `onSettled`).
  - **The alternative considered and rejected:** `<form action={addCommentAction}>` with `useActionState`. Native, progressive-enhancement-friendly, but the lifecycle for cache-update optimistic with rollback doesn't compose with `useActionState` cleanly — `useActionState` is designed for the redirect-and-revalidate path, not the in-place cache-update path. The senior call: when TanStack Query is already in play for the read side, the write side composes through `useMutation`. Reach for `<form action>` when the write is the only TanStack-Query interaction and the cache stays Server-Component.
- Fill the `useMutation` inside `comment-thread.tsx`:
  - `mutationFn: async (body: string) => { const result = await addCommentAction({ invoiceId, body }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }`.
  - `onMutate: async (body) => { await queryClient.cancelQueries({ queryKey: commentKeys.list(invoiceId) }); const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.list(invoiceId)); const optimistic = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body, createdAt: new Date().toISOString() }; queryClient.setQueryData(commentKeys.list(invoiceId), (old) => old ? { ...old, pages: [{ ...old.pages[0], comments: [optimistic, ...old.pages[0].comments] }, ...old.pages.slice(1)] } : old); return { snapshot, optimisticId: optimistic.id } }`.
  - `onError: (_err, _body, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.list(invoiceId), ctx.snapshot) }`.
  - `onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) }) }`.
- Wire the form's pending state from the mutation's `isPending` — disable the submit button, dim the textarea. On `onSuccess` clear the textarea. On `onError` surface the error message in a small inline banner above the form. The audit-log write happens inside the action's transaction; on rollback (forced 500) the transaction is never committed, the audit-log row is never written, and the inspector's audit-log tail confirms it.
- Run the app: type a comment, submit. The row appears at the top of the thread instantly (optimistic). Within ~100ms (or whatever the action's latency is), `onSettled` fires `invalidateQueries`, the route handler is called, the canonical server row replaces the optimistic one (the `optimistic-...` id flips to the real UUID). The audit-log tail in the inspector shows the new `comment.added` row. Toggle "Force 500 on next POST" in the inspector. Submit a comment. The optimistic row appears, then disappears as `onError` restores the snapshot; the inline banner shows the error. The audit-log tail is unchanged — the transaction rolled back.

Senior calls and watch-outs:

- `await queryClient.cancelQueries({ queryKey })` before the `setQueryData` is the load-bearing first line of `onMutate`. Without it, an in-flight poll that resolves between the optimistic write and the action's settle can overwrite the optimistic row with stale data (the row the server doesn't yet know about). The cancel pauses any active refetch on that key; subsequent refetches (from `invalidateQueries` in `onSettled`) pick up the new server row.
- The optimistic row's id is a client-generated string with the `optimistic-` prefix. This is the dedup anchor — if a poll fires between optimistic add and action settle, and the poll happens to return the new row from the database before the action's promise resolves, the renderer can distinguish the optimistic row from the canonical one. The lesson keeps the dedup as a simple prefix; production code might key on a true UUID and compare.
- The `onError` rollback restores from `ctx.snapshot` — the exact `data` shape that `getQueryData` returned at `onMutate` time. Snapshotting the entire query data (not just page 0) is the correct shape because the framework's invalidation may have changed `data.pages` between optimistic write and the error firing. The senior reflex: snapshot wide, restore wide.
- `onSettled` always fires (success or failure) and is the right place for `invalidateQueries` — on success it triggers the refetch that brings the canonical server row in; on failure it refetches the genuine state after the rollback. Skipping `invalidateQueries` here leaves the cache with the optimistic row indefinitely after success (until the next poll arrives) — a subtle but real bug.
- The Server Action's `revalidateTag(invoiceCommentsTag(invoiceId), 'max')` after commit invalidates the **Server Component** cache (the parent invoice page's comment count widget, if any, refreshes on next visit). The client's `invalidateQueries` after the action returns invalidates the **TanStack Query** cache. Both layers hold data; both layers must invalidate. This is the two-system reality named in 16.1.3 and 16.1.4 — surfaced once at the seam, not papered over.
- The form's pending state comes from `mutation.isPending`, not from `useActionState`'s `pending`. The choice is consistent: TanStack Query owns the write lifecycle for this surface; `useActionState` was rejected above. Mixing the two would put two sources of truth on the form, which is the bug class.
- The forced-500 path in the inspector returns `{ ok: false }` from the action; the `mutationFn` throws; `onError` fires with the snapshot in context; the rollback is exact. The audit-log write doesn't fire because the transaction never committed — confirm by the inspector's audit-log tail staying unchanged after the rollback.
- Resist the urge to optimistically write to multiple queries (e.g., a "recent comments across all invoices" sidebar). For this project there is one query, one optimistic write. The cache-update shape supports multi-query optimistic writes — name it once, defer to a future need.

Codebase state at entry: read side complete; form unwired, no `addCommentAction`.
Codebase state at exit: `addCommentAction` writes a row, an audit log, and fires `revalidateTag`; `useMutation` with `cancelQueries` + snapshot + `setQueryData` + restore + `invalidateQueries` is wired into the form; submitting a comment is optimistic with rollback on forced 500. **Runnable — the full read and write flow is live; ready for the verify pass.**

Estimated student time: 55 to 75 minutes. The chapter's heaviest lesson — the cache-update optimistic shape is the load-bearing pattern, and the rollback path is what justifies bringing TanStack Query in.

---

## Lesson 16.2.6 — Verify against "Done when"

Walks every clause: SSR-hydrated first paint, infinite scroll with `maxPages` cap, cross-session polling arrival within 10 seconds, tab-hide pause, optimistic happy path, forced-500 rollback, two-system invalidation, per-request server `QueryClient` isolation, leaf-scoping, `commentKeys` discipline, route-handler tenancy, Zod-drift recovery, and devtools tree-shaking.

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **SSR-hydrated first paint:** hard-refresh the focal invoice page; 20 seeded comments render instantly — no skeleton, no spinner, no fetch fired on first render. View source: the dehydrated state is in the RSC payload (search for one of the seeded comment bodies in the raw HTML). React Query devtools shows the `['comments', invoiceId, 'list']` query with `state: 'success'`, `fetchStatus: 'idle'`, `data.pages.length: 1`.
- **Infinite scroll:** click "Load older". Network tab fires `GET /api/invoices/[id]/comments?cursor=...`. The response renders below the existing rows; the head stays put. Devtools shows `data.pages.length: 2`. Click again; page 3 appended. Click eight more times until `hasNextPage` is `false` and the "End of thread" label renders. Devtools shows `data.pages.length: 10`. Click "Load older" eleven times total from a fresh load — `maxPages: 10` is the cap; the oldest page drops. Scroll back to the head; the head is still there (it's page 0, not page 10).
- **Polling cross-session:** keep the focal invoice page open. From the inspector in another tab (or after a session switch), click "Insert coworker comment". Within 10 seconds (watch the network tab), `GET /api/invoices/[id]/comments` fires; the response includes the new row; the thread renders the row at the top. The audit-log tail shows the `comment.added` row from the second user. No manual refresh.
- **Polling pause on tab hide:** open the focal invoice; switch to another tab. The network tab shows no `GET /api/...comments` requests during the hidden interval (verify by waiting 30 seconds — three poll intervals — and seeing zero requests). Switch back; within 10 seconds, a poll fires. Flip the inspector's "Toggle background polling" to `true`; switch tabs again; the network tab shows polling continuing in the background. Flip back to `false`; the discipline returns.
- **Optimistic happy path:** type a comment in the form; submit. The row appears at the top synchronously (the `optimistic-...` id is visible in the devtools cache). After ~100ms, `invalidateQueries` triggers a refetch; the response replaces the optimistic row with the canonical server row (the id flips to a real UUID). The form clears. The audit-log tail shows the new row.
- **Forced 500 rollback:** toggle "Force 500 on next POST" in the inspector. Submit a comment. The optimistic row appears for ~50ms, then disappears as `onError` restores the snapshot. The inline banner shows the error message. The audit-log tail is unchanged (the action's transaction rolled back before the audit-log write). The devtools cache shows the pre-mutation snapshot fully restored.
- **Two-system invalidation reality:** check the action's source — `await revalidateTag(invoiceCommentsTag(invoiceId), 'max')` after commit. Check the mutation's source — `queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) })` in `onSettled`. Both fire on every successful add. Delete the `revalidateTag` call (deliberately) and observe: the comment thread updates (TanStack cache invalidated), but the parent Server-Component-rendered comment count widget (if the seed includes one) stays stale until the next visit. Add the call back. Then delete the `invalidateQueries` call: the optimistic row stays, the form clears, but the next poll is the only thing that brings in the canonical server row — for ~10 seconds the cache holds a row with the `optimistic-...` id. Add the call back.
- **Per-request server QueryClient (no leak):** simulate cross-org by switching the session in the inspector from org A to org B and immediately navigating to org B's focal invoice. The thread shows org B's seeded comments — no org A rows leaked. The starter ships a debug env var (`QUERY_CLIENT_MODULE_SCOPED`) that swaps `getQueryClient` for a module-scoped instance on the server; flip it on, restart, repeat the org-switch — observe the leak (org A's data appears on org B's first hit). Flip it off; verify the leak is gone. The framework-level architectural rule is the demo.
- **TanStack Query scoping check:** grep the codebase for `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`. The only hits are in `comment-thread.tsx`, `comment-form.tsx`, and `provider.tsx`. The rest of the app — the toolbar, table, pagination, lifecycle actions — stays Server-Component / Server-Action shape. The library is scoped to the leaf that needs it.
- **Key discipline:** grep `\\[\\s*['\"]comments['\"]\\s*,` outside `src/lib/query/keys.ts`. Zero hits. Every `useInfiniteQuery`, `invalidateQueries`, `setQueryData`, `cancelQueries` call imports `commentKeys`.
- **Tenancy at the route-handler seam:** in browser A (admin in org A), open devtools and craft a `fetch('/api/invoices/[org-B-invoice-id]/comments')` request. The handler returns 403 (authedRoute rejected before `listCommentsPage` ran). Same defense as authedAction; defense-in-depth across read and write seams.
- **Zod parse failure (forced drift):** add a phantom field to the response in the route handler (e.g., `data.foo = 'bar'`); the schema is `strictObject` so it rejects unknown keys; the fetcher's `commentsPageSchema.parse` throws; `useInfiniteQuery` surfaces the error; the thread shows an error state. Revert; the thread recovers on next poll. The schema is doing its contract job.
- **Devtools production-gating:** build the app for production (`pnpm build`); inspect the bundle; `@tanstack/react-query-devtools` is not in the chunks. The `NODE_ENV` gate is doing its tree-shaking job.
- **Org-switch cache-clear discipline (forward pointer):** the chapter does **not** ship a `queryClient.clear()` on org switch — the inspector's "Clear client cache" button demonstrates the manual call, and 16.1.3's framing names this as the discipline at the tenancy boundary. The forward direction: production should wire `queryClient.clear()` (or `removeQueries` per org-scoped subtree) into the active-org-switch action. Name once; do not implement here.
- Name the senior calls one more time:
  - The library is scoped to the leaf that meets the threshold; the rest of the app stays Server-Component / Server-Action.
  - The `QueryClient` is per-request on the server via `cache()`, singleton on the client.
  - The fetcher branches on `typeof window` so server-side prefetch reads directly from Postgres and client-side reads go through the route handler — one function, two contexts.
  - `commentKeys` is the only place key arrays live; raw arrays are a red flag.
  - The optimistic shape is cache-update (snapshot + `setQueryData` + restore in `onError` + `invalidateQueries` in `onSettled`) because the row has to land inside the infinite-query cache, not be rendered inline.
  - `cancelQueries` runs before every `setQueryData` to prevent in-flight polls from overwriting optimism.
  - Polling pauses on tab hide via `refetchIntervalInBackground: false`.
  - The Server Action's `revalidateTag` and the client's `invalidateQueries` fire together — two layers, two invalidations, both needed.
  - The route handler is the public read seam; future mobile / third-party clients reach the same data through the same contract.
- Forward references:
  - Chapter 16.3 — Zustand for genuinely shared client state; the chapter project layers a wizard's per-step shared state over four routes; the threshold question is run again against a different surface.
  - Unit 19.4 — component tests for the comment thread; the optimistic-add-and-rollback assertions are mechanical against a mocked `addCommentAction`.
  - Unit 17.2 — security baseline; the route handler's tenancy check is one of the audited findings (`authedRoute` on every read seam, not just write seams).
  - Unit 14.1 — notifications dispatcher; a future "@-mention" feature on the thread would route through the dispatcher rather than the polling loop.
  - Unit 20.1 — structured logs; the `comment.added` audit-log entry is the operator-truth side, the in-app notification (Unit 14) is the user-facing side — same notifiable-vs-logged distinction from 14.1.

Senior calls and watch-outs:

- The verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- The deliberate failure demos (delete `revalidateTag`, delete `invalidateQueries`, flip the module-scoped factory, force a 500, force a Zod parse failure) must run as named single-flag changes — flipping multiples at once muddies the diagnosis. Verify each in isolation, then revert.
- The org-switch cache-clear is a forward pointer, not an implementation step here. The chapter explicitly does not ship it because the active-org-switch action lives in 10.1 and the cache-clear hook into that action is a single line — name where it goes, don't reach in.

Codebase state at entry: full read + write + optimistic + rollback wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`<QueryClientProvider>`, per-request `getQueryClient()`, `<HydrationBoundary>`, `useInfiniteQuery` with `maxPages` and `refetchInterval`, `useMutation` with `cancelQueries` + `setQueryData` + restore + `invalidateQueries`, the route-handler-as-read-seam + Server-Action-as-write-seam split, the two-system invalidation reality, the `commentKeys` discipline) and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
