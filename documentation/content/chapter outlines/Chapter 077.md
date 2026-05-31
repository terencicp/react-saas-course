# Chapter 077 — Project: TanStack Query on optimistic comments

## Chapter framing

Chapter 077 cashes in the threshold and wiring discipline of chapter 076 — the four-trigger funnel (lesson 1 of chapter 076), the read/write split between `useInfiniteQuery` and the Server Action (lesson 4 of chapter 076), the per-request `getQueryClient()` rule on the server (lesson 3 of chapter 076), the `<HydrationBoundary>` SSR-hydrated shape (lesson 3 of chapter 076), the cache-update optimistic pattern with `cancelQueries` + snapshot + restore (lesson 2 of chapter 076 / lesson 4 of chapter 076), the `commentKeys` helper (lesson 2 of chapter 076), and the two-system invalidation reality (lesson 3 of chapter 076 / lesson 4 of chapter 076) — as one runnable per-invoice comment thread on top of the Unit chapter 062 invoices surface. The student wires `<QueryClientProvider>` and the senior defaults, prefetches the thread's first page on the Server Component invoice page, hydrates the client cache, runs `useInfiniteQuery` with cursor paging and a 10-second `refetchInterval`, posts new comments through a Server Action, then fires the cache-update optimistic shape with rollback on `onError` and `invalidateQueries` from the client after the action returns. Each build closes on a runnable state: lesson 2 of chapter 077 ends with the provider wired and the seeded first page rendering with no client loading state on first paint; lesson 3 of chapter 077 ends with infinite scroll and polling live; lesson 4 of chapter 077 ends with optimistic add and rollback wired and the full flow verifiable.

### Project goals

The finished comment thread is done when, on the chapter 062 invoice detail page:

- The initial paint shows the seeded thread with no client loading state — the SSR-hydrated cache populates the first render, no skeleton, no waterfall.
- Submitting a comment shows the new row immediately at the top of the thread, and it persists once the Server Action returns.
- A failed submit (the inspector's "Force 500 on next POST") rolls the optimistic row back and surfaces an error banner, leaving the audit log untouched.
- A comment inserted from another browser session ("Insert coworker comment" in the inspector) appears in the open thread within the 10-second poll window, with no manual refresh.
- Scrolling up loads older pages through the route handler without re-fetching the already-loaded head.
- Polling pauses when the tab is hidden and resumes within 10 seconds of the tab regaining focus.

These hold on top of architectural invariants the build keeps throughout: the per-request server `QueryClient` never leaks across requests; TanStack Query stays scoped to the comment-thread leaf (nothing else on the page uses it); the route handler is the read seam and the Server Action is the write seam; the two-system invalidation (`revalidateTag` plus `invalidateQueries`) fires together; and `commentKeys` is the only place query-key arrays exist.

Threads through every lesson: TanStack Query is **scoped to the comment thread leaf only** — the rest of the invoice detail page stays Server Components, no `useQuery` creeps outside the `<CommentThread />` subtree; the `QueryClient` is per-request on the server via React's `cache()` and a singleton on the client, never module-scoped on the server; the `queryFn` calls a route handler (`GET /api/invoices/[id]/comments`) so the read seam stays a public HTTP contract that a future mobile or third-party client can hit, and the same handler the Server Component's prefetch can read directly via the in-process branch; the write seam is a Server Action (`addCommentAction`) — Server Actions own form semantics, audit-log writes, and the canonical Result — and the client invalidates the TanStack cache after the action resolves; `commentKeys` is the only place query-key arrays exist, same structural enforcement as `tags.ts` from lesson 1 of chapter 072; the optimistic update is the **cache-update** shape (snapshot via `getQueryData`, write via `setQueryData`, restore in `onError`, invalidate in `onSettled`) because the new row has to land inside `data.pages[0].comments` of the infinite-query cache; `cancelQueries` runs before every optimistic `setQueryData` to prevent an in-flight refetch from overwriting the optimism; polling uses `refetchInterval: 10_000` plus `refetchIntervalInBackground: false` so polling pauses when the tab is hidden; the two-system invalidation (Server Action's `revalidateTag` + client's `invalidateQueries`) is the architectural price tag of bringing TanStack Query in, surfaced deliberately at the seam.

### Dependency carry-in

- **From chapter 062 (the starter base):** `app/(app)/invoices/page.tsx` Server Component reading `invoiceListSearchParamsCache`, `app/(app)/invoices/[id]/page.tsx` Server Component reading `getInvoiceDetail({ orgId, id })`, the toolbar / table / pagination shells, the four lifecycle Server Actions, the version-precondition update path.
- **From chapter 059 (tenancy + RBAC):** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts`, the active-org slot in the session, `logAudit(tx, event)`.
- **From chapter 041 (schema):** `invoices`, `invoice_lines`, `customers`, `organizations`, `org_members`, `audit_logs`, the cursor helpers in `src/db/cursor.ts`. New for this project: `invoice_comments` table — `id uuid pk`, `organizationId uuid fk`, `invoiceId uuid fk`, `authorId uuid fk references users(id)`, `body text not null`, `createdAt timestamptz default now()`. Composite index `(invoiceId, createdAt desc, id desc)` for the cursor.
- **From chapter 046 (route handlers):** `authedRoute(role, schema, fn)` wrapper, the canonical JSON response shape `{ data } | { error }`, the Zod parse at the boundary, the shared response schema imported by both the handler and the client `queryFn`.
- **From chapter 043 + chapter 047:** canonical Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`, `useActionState`.
- **From lesson 6 of chapter 032 / lesson 2 of chapter 072:** `revalidateTag` for the Server Component cache invalidation from the action.
- **From lesson 1 of chapter 072 (`tags.ts`):** the existing `invoiceTag(id)` helper and the new `invoiceCommentsTag(invoiceId)` helper, both invalidated by the action via `revalidateTag` so the Server Component invoice page's cached count refreshes alongside the TanStack cache.
- **From lesson 2 of chapter 076:** `useQuery`, `useMutation`, `useInfiniteQuery` primitives; `commentKeys.list(invoiceId)`; `cancelQueries` + `getQueryData` + `setQueryData` + restore pattern; `maxPages` cap; `refetchInterval` + `refetchIntervalInBackground: false`.
- **From lesson 3 of chapter 076:** `getQueryClient()` with the `typeof window` branch and React `cache()` on the server; `<QueryClientProvider>` with senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`); `<HydrationBoundary>`; `<ReactQueryDevtools />` gated on `NODE_ENV`.
- **From lesson 4 of chapter 076:** the read/write split (infinite query reads, Server Action writes), the cache-update optimistic shape (not via-variables), the two-system invalidation, the 10-second polling cadence with background pause.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided: cacheComponents: true; experimental.useCache enabled
.env.example                    # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET
package.json                    # provided: db:migrate, db:seed, dev, build; @tanstack/react-query + devtools
scripts/
  seed.ts                       # provided: two orgs, 60 invoices per org from chapter 062, plus 80+ seeded
                                #           comments on one focal invoice per org (so the infinite-query
                                #           has real pages to fetch and the polling demo has a coworker
                                #           insert path)
src/
  db/
    schema.ts                   # provided: full chapter 062 schema + new invoice_comments table
    client.ts                   # provided
    relations.ts                # provided
    cursor.ts                   # provided
  lib/
    tenant-db.ts                # provided (chapter 056)
    authed-action.ts            # provided (chapter 057)
    authed-route.ts             # provided (chapter 046)
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
  - `const queryClient = getQueryClient(); await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.list(id), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId: id, cursor: pageParam }), initialPageParam: null as string | null }); const dehydrated = dehydrate(queryClient); return <HydrationBoundary state={dehydrated}><CommentThread invoiceId={id} /></HydrationBoundary>` — wrapped beneath the existing chapter 062 invoice header / customer card / lines table (those stay Server Components).
- **Client thread** (`app/(app)/invoices/[id]/comment-thread.tsx`):
  - `'use client'`; `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. Renders `data.pages.flatMap(p => p.comments)` newest first; `<button onClick={() => fetchNextPage()}>` for "Load older"; `isFetchingNextPage` spinner.
- **Optimistic mutation** (inside `comment-thread.tsx`):
  - `useMutation({ mutationFn: async (body: string) => { const result = await addCommentAction({ invoiceId, body }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }, onMutate: async (body) => { await queryClient.cancelQueries({ queryKey: commentKeys.list(invoiceId) }); const snapshot = queryClient.getQueryData(commentKeys.list(invoiceId)); const optimistic = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body, createdAt: new Date().toISOString() }; queryClient.setQueryData(commentKeys.list(invoiceId), (old) => old ? { ...old, pages: [{ ...old.pages[0], comments: [optimistic, ...old.pages[0].comments] }, ...old.pages.slice(1)] } : old); return { snapshot, optimisticId: optimistic.id }; }, onError: (_err, _body, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.list(invoiceId), ctx.snapshot); }, onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) }); } })`.
- **Env entries:** unchanged from chapter 062. No new third-party services for this project.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface each lesson's Moment of truth drives. Refreshes on submit via `router.refresh()`.

- **Header:** session-user switcher (admin / member per seeded org), org switcher (two seeded orgs), focal-invoice picker (one per org, the seeded thread).
- **"Force 500 on next POST" toggle:** when on, sets a server-side flag (env-backed in dev, an in-memory `Map` keyed by user in the starter) that makes the next `addCommentAction` invocation return `{ ok: false, error: { code: 'forced_500', userMessage: 'Forced failure for verification' } }` after the route handler intentionally throws. The toggle auto-clears on the first invocation so the next add succeeds. The teaching surface for the rollback verification in lesson 4 of chapter 077.
- **"Insert coworker comment" button:** invokes a server-only action that inserts an `invoice_comments` row authored by the **other** seeded user in the active org. The button does **not** call `revalidateTag` — the TanStack Query poll is what surfaces the row on the open client. Used to verify cross-session arrival within the 10-second window.
- **"Clear client cache" button:** posts to `/inspector` with a redirect that includes a `?clearCache=1` flag the layout reads to call `queryClient.clear()` once on the next mount (a tiny effect in the provider). Used to demonstrate the SSR-hydrated first paint without a leftover cache.
- **Query-state panel:** an iframe-style panel embedding `<ReactQueryDevtools />` in standalone mode (or a small custom panel reading via `useQueryClient().getQueryCache().findAll()`) so the student can see the `comments` cache state, the `isStale` flag, and the page-count for the infinite query.
- **Audit-log tail:** last 20 `comment.added` rows from `audit_logs`, scoped to the active org. Confirms the Server Action's audit-log write fires on the happy path and does not fire on the forced-500 path.
- **"Toggle background polling" debug:** flips `refetchIntervalInBackground` between `false` and `true` for the open thread, demonstrating the battery-and-pool discipline by watching the network tab pause when the tab is hidden.

The inspector is provided in full; the student writes only `client.ts`, `keys.ts`, `provider.tsx`, `fetcher.ts`, the route handler, `actions.ts`, the prefetch wiring in the invoice detail page, and the thread component.

### Concepts demonstrated → owning lesson

- The four-trigger funnel and the comment-thread case clearing three of them — lesson 1 of chapter 076 + lesson 4 of chapter 076.
- `useInfiniteQuery` with `getNextPageParam`, `initialPageParam`, `maxPages` — lesson 2 of chapter 076.
- `useMutation` lifecycle and the cache-update optimistic shape — lesson 2 of chapter 076 + lesson 4 of chapter 076.
- `cancelQueries` + `getQueryData` + `setQueryData` + restore — lesson 2 of chapter 076.
- Polling with `refetchInterval` + `refetchIntervalInBackground: false` — lesson 2 of chapter 076 + lesson 4 of chapter 076.
- `queryClient.invalidateQueries` after the Server Action returns — lesson 3 of chapter 076.
- `commentKeys` as the structural enforcement — lesson 2 of chapter 076 (mirrors lesson 1 of chapter 072's `tags.ts`).
- Per-request `QueryClient` on the server via React `cache()` — lesson 3 of chapter 076.
- `<QueryClientProvider>` + senior defaults (`staleTime`, `gcTime`, `refetchOnWindowFocus: false`) — lesson 3 of chapter 076.
- `<HydrationBoundary>` and `dehydrate` for SSR-hydrated initial data — lesson 3 of chapter 076.
- The fetcher branch on `typeof window` for in-process server reads — lesson 3 of chapter 076.
- `<ReactQueryDevtools />` gated on `NODE_ENV` — lesson 3 of chapter 076.
- `'use client'` boundary placement at the leaf, not the page — lesson 3 of chapter 076 (lesson 2 of chapter 030 frame).
- Route handlers as the read seam — chapter 046 (lesson 4 of chapter 076 frame).
- Server Actions as the write seam, canonical Result, audit-log write — chapter 043 / chapter 059.
- The two-system invalidation reality (Server Component cache vs. TanStack cache) — lesson 3 of chapter 076 + lesson 4 of chapter 076.
- Zod parse at every boundary (route handler, fetcher, action) — chapter 042.

---

## Lesson 1 — Project Overview

Bolt a polling, infinite-scrolling, optimistically-added comment thread onto the chapter 062 invoice detail page, with TanStack Query scoped to the thread leaf. The student leaves with the chapter 062 starter running locally: the invoice detail page renders, the new `invoice_comments` table is migrated and seeded, and the comment-thread section is empty because the leaf component is not yet imported.

One figure: a screenshot of the finished invoice detail page — chapter 062 header, customer card, and line items, with the comment thread at the bottom showing a freshly posted optimistic row at the top.

### What we'll practice

- Wiring TanStack Query into an App Router surface the senior way: a `<QueryClientProvider>` with production defaults, a per-request `QueryClient` on the server, and `'use client'` pushed to the leaf rather than the page.
- Bridging server and client caches: prefetching on a Server Component, dehydrating, and hydrating the client cache so the first paint carries data with no loading state.
- Reading a paginated, polling list with `useInfiniteQuery` — cursor paging, a bounded page count, and a poll cadence that pauses when the tab is hidden.
- Writing through a Server Action with the cache-update optimistic shape — snapshot, optimistic write, rollback on failure — and reconciling the two caches that now hold the same data.

### Architecture

- The chapter 062 invoice detail page stays a Server Component. The comment thread is a single client leaf (`<CommentThread />`) mounted at the bottom; nothing else on the page touches TanStack Query.
- Read seam: a route handler (`GET /api/invoices/[id]/comments`) is the public HTTP contract the client polls and scroll-fetches through. The Server Component's prefetch reads the same data directly from Postgres via an in-process branch of the shared fetcher — one `queryFn`, two execution contexts.
- Write seam: a Server Action (`addCommentAction`) owns the insert, the audit-log write, and `revalidateTag`. The client posts through it and invalidates the TanStack cache once it resolves.
- The `QueryClient` is per-request on the server (React `cache()`) and a singleton on the client. `commentKeys` is the only source of query-key arrays.
- An `/inspector` Server Component is the verification surface the Implementation lessons drive: a session/org/invoice switcher plus debug controls ("Force 500 on next POST", "Insert coworker comment", "Clear client cache", "Toggle background polling") and an audit-log tail. (Full spec above.)

### Starting file tree

The student-facing tree below highlights the files carrying TODOs — those are the build. Everything else is provided: the full chapter 062 surface, the new `invoice_comments` schema and seed, the shared Zod schemas, the provided `listCommentsPage` DB read, and the inspector. (The complete annotated tree, including the provided files, is in the Chapter framing above.)

```
src/
  lib/
    query/
      client.ts        # TODO — getQueryClient() with the typeof window branch + cache()   ← focus
      keys.ts          # TODO — commentKeys.all / list(invoiceId)                           ← focus
      provider.tsx     # TODO — 'use client' <Providers> wrapping QueryClientProvider        ← focus
    comments/
      schema.ts        # provided — shared Zod request/response schemas
      queries.ts       # provided — listCommentsPage direct DB read (cursor paging)
      fetcher.ts       # TODO — fetchCommentsPage, branches on typeof window                  ← focus
      actions.ts       # TODO — addCommentAction (insert + logAudit + revalidateTag)         ← focus
  app/
    api/invoices/[id]/comments/
      route.ts         # TODO — GET handler, the public read seam                            ← focus
    layout.tsx         # provided shell — wrap children in <Providers>                        ← focus
    (app)/invoices/[id]/
      page.tsx         # provided shell — add prefetch + dehydrate + <HydrationBoundary>      ← focus
      comment-thread.tsx  # TODO — 'use client'; useInfiniteQuery + useMutation               ← focus
      comment-form.tsx    # provided shell — wire submit to the post mutation                 ← focus
    inspector/page.tsx # provided in full — the verification surface
```

`src/lib/query/` is a feature-shaped directory, not a generic `utils/`: it groups the factory, keys, and provider so the boundary is visible, and future TanStack-Query consumers extend it. `commentKeys` lives beside it because key arrays are query-system identifiers — the parallel to `tags.ts` from lesson 1 of chapter 072.

### Roadmap

<CardGrid>
  <Card title="Lesson 2 — Provider, per-request factory, and the SSR-hydrated first page">Wires the provider, keys, per-request factory, and the prefetch-plus-hydration bridge so the seeded thread paints with no client loading state.</Card>
  <Card title="Lesson 3 — Infinite scroll, polling, and the route handler">Adds the public read seam and the leaf's `useInfiniteQuery` so "Load older" pages in and a coworker's comment arrives within the poll window.</Card>
  <Card title="Lesson 4 — Optimistic add and rollback with useMutation">Adds the Server Action write seam and the optimistic post — instant row, rollback on failure, two-system invalidation — then verifies the full flow.</Card>
</CardGrid>

### Setup

The starter is the chapter 062 codebase plus the new `invoice_comments` table (composite index `(invoiceId, createdAt desc, id desc)` for the cursor) and a seed of 80+ comments per focal invoice authored by two seeded users — the second identity is what the "Insert coworker comment" verification attributes rows to. `cacheComponents: true` stays on from chapter 062; the comment thread is a fresh dynamic-with-client-cache leaf that does not touch the cached invoice-header subtree.

1. Clone the starter with `degit`.
2. Install dependencies (`pnpm install`). `@tanstack/react-query` and the devtools ship in the starter's `package.json`.
3. Start Postgres (`docker compose up -d`; `postgres:18`).
4. Copy `.env.example` to `.env` — `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `BETTER_AUTH_SECRET` are unchanged from chapter 062. No new third-party services.
5. Migrate the schema (`pnpm db:migrate`), including the new `invoice_comments` table.
6. Load the seed (`pnpm db:seed`).
7. Start the dev server (`pnpm dev`).

Expected result: `/invoices/[id]` renders the chapter 062 invoice detail page working end-to-end; the comment-thread section is empty because the leaf component is not yet imported. `/inspector` loads, but the query-state panel is blank because no provider is mounted yet.

---

## Lesson 2 — Provider, per-request factory, and the SSR-hydrated first page

Open an invoice detail page and the seeded comment thread is already there on first paint — no skeleton, no spinner, no loading flash. The finished result: the chapter 062 page renders as before, and below the line items the first 20 seeded comments appear instantly, served from a cache the Server Component populated and handed to the client.

### Your mission

This is the foundation every later lesson builds on: get TanStack Query mounted on the App Router the senior way, then prove it by making the seeded thread paint with no client loading state. The hard part is not the provider — it is the seam between the server and client caches. On the server, the `QueryClient` must be created fresh per request: a module-scoped client leaks one org's prefetched comments into the next org's render, which in a multi-tenant SaaS is a data-isolation bug, so the factory branches on `typeof window` and wraps the server path in React's `cache()` while the client keeps a single long-lived singleton. The invoice page's Server Component prefetches the thread's first page, dehydrates the cache, and wraps only the thread subtree in a `<HydrationBoundary>`; the chapter 062 header, customer card, and line items above it stay Server Components and stay outside the boundary, because `'use client'` belongs at the leaf, not the page. The prefetch and the client hook must address the cache through the exact same key — `commentKeys.list(invoiceId)`, the single source of query-key arrays — or the hydration silently misses and the client refetches cold. The provider also sets the SaaS defaults that prevent refetch storms (`staleTime`, `gcTime`, `refetchOnWindowFocus: false`) and gates the devtools behind `NODE_ENV` so they tree-shake out of production. Out of scope this lesson: the client-side fetch, polling, infinite scroll, and posting — the client fetcher branch stays a stub, and the thread is read-only with no form. You only need the server-side prefetch path working to land the first paint.

The starter ships the `invoice_comments` schema, the seed, the shared Zod schemas, and the provided `listCommentsPage` DB read; the in-process branch of the fetcher calls that read directly.

- Opening an invoice detail page renders the seeded thread's first page immediately on first paint, with no skeleton, spinner, or fetch fired on initial render.
- The dehydrated cache ships in the page's RSC payload — the comment bodies are present in the raw HTML, not fetched after hydration.
- Hard-refreshing the page reproduces the instant first paint every time, with the cache rebuilt per request.
- Hitting two different orgs' focal invoices in quick succession shows each org only its own comments — no rows leak from the first request into the second.
- The React Query devtools are reachable in development and absent from a production build.
- Nothing outside the comment-thread leaf and the provider uses TanStack Query — the chapter 062 toolbar, table, pagination, and lifecycle actions stay Server-Component / Server-Action shape.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/query/client.ts`: `makeQueryClient()` sets the senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`). `getQueryClient` branches on `typeof window === 'undefined'`: server returns `cache(makeQueryClient)()` (React's per-request memoization), client returns a module-scoped singleton. Comment the branch with the cross-request-leak failure mode named in lesson 3 of chapter 076 — name the bug at the call site so future readers know why the branch is there. This is the most important handful of lines in the project: the `cache()`-wrapped factory scopes the instance to the React-server-render lifecycle; the client singleton survives across renders, which is the entire point of a cache.
- `src/lib/query/keys.ts`: `commentKeys = { all: ['comments'] as const, list: (invoiceId: string) => ['comments', invoiceId, 'list'] as const }`. Lock the hierarchy now so the later lessons share the same identity; `as const` keeps the tuples narrow.
- `src/lib/query/provider.tsx`: `'use client'` at the top — mandatory, because `QueryClientProvider` uses `createContext`, which only runs on the client. The `Providers` component creates the client via `getQueryClient()` and wraps `children` in `<QueryClientProvider>`, mounting `<ReactQueryDevtools initialIsOpen={false} />` gated on `process.env.NODE_ENV !== 'production'` so the bundler tree-shakes ~30KB of devtools out of production.
- `app/layout.tsx`: import `Providers`, wrap `{children}` once — the only edit in the file.
- `src/lib/comments/fetcher.ts` (in-process branch only): the `typeof window === 'undefined'` branch resolves the active org and calls `listCommentsPage({ orgId, invoiceId, cursor, pageSize: 20 })`. The client branch stays a TODO for lesson 3 of chapter 077 — the first paint only needs the server-side read.
- `app/(app)/invoices/[id]/page.tsx`: above the existing chapter 062 render, create the per-request `queryClient` via `getQueryClient()`, `await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.list(id), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId: id, cursor: pageParam }), initialPageParam: null as string | null })`, then `dehydrate(queryClient)`. Wrap the bottom of the render (where the thread lives) in `<HydrationBoundary state={dehydratedState}>`; the Server Components above stay outside it. The prefetch uses the same fetcher the client will — one `queryFn`, two execution contexts, identical cache contract.
- `app/(app)/invoices/[id]/comment-thread.tsx` (minimal): a `'use client'` component reading the populated cache via `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: () => { throw new Error('client fetcher not wired yet') }, initialPageParam: null as string | null, getNextPageParam: () => null })`, rendering `data?.pages.flatMap(p => p.comments).map(...)` — no polling, no infinite scroll, no form. The `queryFn` is never called on first render because `isPending` is `false` from the hydrated data.

Decision rationale and untested-requirement coverage:

- `<HydrationBoundary>` need only wrap the subtree that runs the hook on those keys; wrapping the whole page works but is unnecessary. Boundary discipline from lesson 2 of chapter 030: push `'use client'` as deep as it goes.
- `staleTime: 60_000` is the SaaS default that prevents the 2022-era refetch-on-every-mount-and-focus storms; the polling cadence in lesson 3 of chapter 077 overrides it per-query via `refetchInterval`, which works alongside `staleTime`, not against it.
- `refetchOnWindowFocus: false` is the senior default for an authenticated SaaS surface; live-data tools flip it on per-query, but focus is not a meaningful event for an invoice thread.
- The hydration boundary works only if the server's prefetch key exactly matches the client's hook key. Importing `commentKeys.list(invoiceId)` in both places is the structural enforcement; a raw array in either spot is the silent miss.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Then confirm by hand:

- [ ] Open a focal invoice; the first 20 seeded comments render immediately — no skeleton, no flicker. View source: a seeded comment body appears in the raw HTML (the dehydrated state is in the RSC payload).
- [ ] Open the React Query devtools (the floating icon); the `['comments', invoiceId, 'list']` query is present with `state: 'success'`, `fetchStatus: 'idle'`, and no fetch fired on first paint.
- [ ] Hard-refresh; the SSR-hydrated cache rebuilds and the first paint is still instant.
- [ ] In the inspector, switch the session from org A to org B and immediately open org B's focal invoice; it shows org B's comments only, with no org A rows leaked. Flip the starter's `QUERY_CLIENT_MODULE_SCOPED` debug flag on, restart, and repeat to watch the leak appear; flip it off and confirm it is gone.
- [ ] Build for production (`pnpm build`) and inspect the bundle — `@tanstack/react-query-devtools` is not in the chunks.
- [ ] Grep for `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`; the only hits are `comment-thread.tsx` and `provider.tsx`.

---

## Lesson 3 — Infinite scroll, polling, and the route handler

The thread becomes live: scroll to the bottom and a "Load older" button pages in earlier comments, and a comment posted by a coworker shows up on its own within ten seconds. The finished result: the seeded first page still paints instantly, "Load older" appends earlier pages through a real HTTP endpoint, a background poll refreshes the head every ten seconds, and the polling stops while the tab is hidden.

### Your mission

Now the read side comes alive. The seam to respect here is that reads travel through a public route handler — `GET /api/invoices/[id]/comments` — so the same data is reachable by a future mobile or third-party client, while the Server Component's prefetch keeps reading Postgres directly through the in-process branch you already wrote. That is one fetcher with two execution paths: the client cannot import Drizzle (it would bundle the database driver into the browser), and even if it could, the route handler is the contract that matters. The handler is wrapped in `authedRoute`, so the tenancy boundary holds at the read seam exactly as it does at the write seam — a request for another org's invoice is rejected before the query runs. Both the handler and the client fetcher parse the payload through the shared Zod schema, so if the response ever drifts the client fails loudly instead of rendering broken UI. On the client, `useInfiniteQuery` reads cursor pages newest-first and caps retained pages at ten — a chat-style thread bounds memory, unlike a feed-style read-once surface — and polls on a ten-second `refetchInterval` with `refetchIntervalInBackground: false` so the browser pauses polling when the tab is hidden. Ten seconds is the deliberate cadence: faster floods the connection pool and burns mobile battery, slower feels stale. Keep the "Load older" interaction an explicit button rather than an `IntersectionObserver` auto-load, which is better for feeds but wrong for a thread the user might scroll past by accident; and surface the poll's in-flight state with an `isFetching` chip distinct from the per-page spinner, the `isPending`-vs-`isFetching` distinction from lesson 2 of chapter 076. Out of scope: posting — the form stays unwired until the next lesson; this lesson is read-only. Live updates are polling, not WebSockets or Server-Sent Events, which are out of scope for this course; polling is the threshold-met case.

- Scrolling to the bottom and clicking "Load older" appends the next earlier page below the existing rows, and the already-loaded head stays in place with no refetch or flicker.
- Repeated "Load older" clicks keep appending until the thread runs out, at which point the control shows an end-of-thread state; retained pages stay capped so deep scrolling does not grow memory without bound.
- A comment inserted from another session (the inspector's "Insert coworker comment") appears at the top of the open thread within ten seconds, with no manual refresh.
- Switching to another tab pauses the polling network traffic, and switching back resumes it within ten seconds.
- "Load older" and the poll both travel as `GET /api/invoices/[id]/comments` requests visible in the network tab; the Server Component's first-paint data does not.
- A read request for an invoice in another org is rejected before any data is returned.
- A drifted response (an unexpected field) surfaces as a visible error state in the thread rather than rendering silently.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/comments/fetcher.ts` (client branch): build the URL with `cursor` as an optional search param, `fetch` with `credentials: 'same-origin'`, throw on `!res.ok` so `useInfiniteQuery` surfaces the error, and validate with `commentsPageSchema.parse(json.data)` (the `{ data }` envelope from chapter 046). The server-side branch is unchanged; the fetcher now works on both sides.
- `app/api/invoices/[id]/comments/route.ts`: `export const GET = authedRoute({ role: 'member', schema: <cursor parser>, handler })`. Inside, `listCommentsPage({ orgId: ctx.orgId, invoiceId: params.id, cursor: query.cursor ?? null, pageSize: 20 })`, returning `Response.json({ data: commentsPageSchema.parse(page) })`. `authedRoute` enforces tenancy before the query runs — a cross-org request returns 403, defense in depth alongside the data and cache-tag layers.
- `app/(app)/invoices/[id]/comment-thread.tsx` (real shape):
  - `useInfiniteQuery({ queryKey: commentKeys.list(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. The `initialPageParam: null` must match the prefetch exactly, or the first render fetches cold despite the hydration boundary.
  - Render `data?.pages.flatMap(p => p.comments).map(...)` newest-first (the DB returns descending; the component renders top-down).
  - "Load older" button at the bottom: `<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>` — "End of thread" when `hasNextPage` is false, a small spinner when `isFetchingNextPage` is true.
  - An `isFetching` indicator (a subtle dot or "Updating…" chip) at the top, distinct from the per-page spinner.

Decision rationale and untested-requirement coverage:

- The fetcher branch is the load-bearing call: server-side prefetch reads Postgres with zero HTTP hop, client-side reads go through the public seam. Unifying them into one fetch would bundle the driver and erase the contract a future client depends on.
- `maxPages: 10` caps retained pages for a chat-style thread; without it an unbounded `useInfiniteQuery` accumulates pages until the tab closes. Feed-style read-once surfaces leave it unbounded.
- `refetchIntervalInBackground: false` lets the framework's `document.hidden` check pause polling; the inspector's "Toggle background polling" flips it on to show the status-panel behavior, which is wrong for a thread.
- The client-side `commentsPageSchema.parse` is the contract enforcement from chapter 042 / chapter 046; the schema in `src/lib/comments/schema.ts` is imported by both the handler and the fetcher so drift fails loudly.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Then confirm by hand:

- [ ] Open a focal invoice; first paint shows 20 seeded comments instantly. Click "Load older" — the network tab shows `GET /api/invoices/[id]/comments?cursor=...`, the response renders below the existing rows, the head stays put. Devtools shows `data.pages.length` growing; click again and page 3 appends.
- [ ] Click "Load older" repeatedly until "End of thread" renders; from a fresh load, click eleven times and confirm `data.pages.length` caps at 10 (the oldest page drops), while the head page is unchanged.
- [ ] Keep the page open; from the inspector (another tab or after a session switch) click "Insert coworker comment". Within 10 seconds a `GET /api/.../comments` fires and the new row appears at the top; the audit-log tail shows the insert. No manual refresh.
- [ ] Switch to another tab for 30 seconds — no `GET /api/...comments` requests fire. Switch back; a poll fires within 10 seconds. Flip the inspector's "Toggle background polling" to `true`, switch tabs, and watch polling continue; flip it back to `false`.
- [ ] In devtools, craft a `fetch('/api/invoices/[other-org-invoice-id]/comments')`; the handler returns 403 before the query runs.
- [ ] Temporarily add a phantom field to the handler's response; the `strictObject` schema rejects it, the client surfaces an error state, and reverting recovers the thread on the next poll.

---

## Lesson 4 — Optimistic add and rollback with useMutation

Type a comment and it appears at the top of the thread the instant you submit, then quietly settles into the canonical server row; if the server rejects it, the row vanishes and an error banner explains why. The finished result: posting is instant, persists once the action returns, and rolls back cleanly on failure — and with the write side in place, the full thread is verifiable against every project goal.

### Your mission

This is the chapter's heaviest lesson and the one that justifies bringing TanStack Query in at all: the cache-update optimistic add with rollback. The write seam is a Server Action, `addCommentAction`, which owns the insert, the audit-log write inside one transaction, and the `revalidateTag` that refreshes the Server Component's cached comment count. The client posts through it with `useMutation`, not `<form action>` with `useActionState`: when TanStack Query already owns the read side, the write composes through `useMutation`, whose `onMutate`/`onError`/`onSettled` lifecycle is what the optimistic shape needs — `useActionState` is built for the redirect-and-revalidate path, and mixing the two would put two sources of truth on one form. The optimistic update must be the cache-update shape, not the via-variables shape from lesson 2 of chapter 076, because the new row has to land inside `data.pages[0].comments` of the infinite-query cache rather than be rendered inline. `onMutate` must `cancelQueries` before it writes — otherwise an in-flight poll resolving mid-flight overwrites the optimism with data the server does not yet know about — then snapshot the whole query data wide, write the optimistic row with an `optimistic-`-prefixed client id, and return the snapshot. `onError` restores that snapshot exactly; the transaction never commits on failure, so the audit log stays clean. `onSettled` always fires and is where `invalidateQueries` belongs — on success it pulls the canonical server row in and the temporary id flips to the real UUID; skip it and the optimistic row lingers until the next poll. This is the two-system invalidation reality stated once at the seam: the action's `revalidateTag` invalidates the Server Component cache, the client's `invalidateQueries` invalidates the TanStack cache, and both must fire. The `optimistic-` prefix doubles as the dedup anchor if a coworker's poll lands while the add is in flight. Out of scope, and worth naming so the student does not over-build: no comment edit, delete, or moderation; no @-mention notifications (Unit 13 territory); no rich-text body (`body` is a plain string with a `min(1).max(2000)` Zod cap); and no fan-out optimistic writes to other queries — there is one query and one optimistic write here.

- Submitting a comment shows the new row at the top of the thread synchronously, before the server responds, and the form clears.
- Once the action returns, the optimistic row is replaced by the canonical server row (its temporary id becomes the server-generated UUID) and the new `comment.added` row appears in the audit-log tail.
- When the server rejects the submit (the inspector's "Force 500 on next POST"), the optimistic row disappears, the prior thread state is restored exactly, and an inline error banner surfaces — with the audit log unchanged because the transaction rolled back.
- A successful add invalidates both caches: the thread refetches the canonical row and the Server Component's cached comment count refreshes; skipping either invalidation is observable as a stale layer.
- A coworker's comment arriving mid-submit does not produce a duplicate once the dust settles — the canonical rows replace the optimistic placeholder.
- Every query-key reference across the read and write paths comes from `commentKeys`; no raw key arrays exist outside it.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/comments/actions.ts`: `addCommentAction = authedAction('member', addCommentInput, fn)`. Inside `fn`, wrap the insert in `tenantDb(ctx.orgId).transaction`: insert the row, `logAudit(tx, { action: 'comment.added', subjectType: 'invoice_comment', subjectId: row.id, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: {} })`, return the row with `createdAt` ISO-stringified. After commit and before returning, `await revalidateTag(invoiceCommentsTag(input.invoiceId), 'max')`. Return `{ ok: true, data: { id, createdAt } }`; on parse or DB failure the wrapper returns the canonical `{ ok: false, error }` shape the mutation keys its rollback on.
- `app/(app)/invoices/[id]/comment-form.tsx`: a `<textarea name="body">` and submit button, a child of `<CommentThread />` so it shares the query-client scope. The form's `onSubmit` calls `mutation.mutate(body)`; pending state comes from `mutation.isPending` (disable the button, dim the textarea), `onSuccess` clears the textarea, `onError` surfaces the message in an inline banner above the form.
- `useMutation` inside `comment-thread.tsx`:
  - `mutationFn: async (body: string) => { const result = await addCommentAction({ invoiceId, body }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }`.
  - `onMutate: async (body) => { await queryClient.cancelQueries({ queryKey: commentKeys.list(invoiceId) }); const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.list(invoiceId)); const optimistic = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body, createdAt: new Date().toISOString() }; queryClient.setQueryData(commentKeys.list(invoiceId), (old) => old ? { ...old, pages: [{ ...old.pages[0], comments: [optimistic, ...old.pages[0].comments] }, ...old.pages.slice(1)] } : old); return { snapshot, optimisticId: optimistic.id } }`.
  - `onError: (_err, _body, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.list(invoiceId), ctx.snapshot) }`.
  - `onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.list(invoiceId) }) }`.

Decision rationale and untested-requirement coverage:

- `cancelQueries` is the load-bearing first line of `onMutate`: without it an in-flight poll resolving between the optimistic write and the settle overwrites the optimistic row with stale data. Subsequent refetches from `onSettled` pick up the canonical row.
- Snapshot wide, restore wide: `ctx.snapshot` is the entire query data, not just page 0, because invalidation may have reshaped `data.pages` between the optimistic write and the error.
- `onSettled` (always fires) owns `invalidateQueries` — success refetches the canonical row, failure refetches the genuine post-rollback state. Skipping it leaves the optimistic row in the cache until the next poll, a subtle but real bug.
- The two-system invalidation is surfaced once, not papered over: `revalidateTag(invoiceCommentsTag(invoiceId), 'max')` invalidates the Server Component cache, `invalidateQueries` invalidates the TanStack cache. Both layers hold the data; both must invalidate.
- The `optimistic-` prefix is the dedup anchor; the lesson keeps it a simple prefix, naming that production might key on a true UUID and compare. Resist fanning the optimistic write out to other queries — name the capability, defer to a future need.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Run each deliberate-failure demo below as a single named change, then revert before the next — flipping several at once muddies the diagnosis. Then confirm by hand:

- [ ] Type a comment and submit; the row appears at the top synchronously (devtools shows the `optimistic-...` id inside `data.pages[0].comments`). After the action settles, `invalidateQueries` refetches and the id flips to the real UUID; the form clears; the audit-log tail shows the new `comment.added` row.
- [ ] Toggle "Force 500 on next POST" and submit; the optimistic row appears briefly, then `onError` restores the snapshot and an inline banner shows the error. The audit-log tail is unchanged (the transaction rolled back); devtools shows the pre-mutation snapshot fully restored.
- [ ] Read the action's source for `await revalidateTag(invoiceCommentsTag(invoiceId), 'max')` and the mutation's `onSettled` for `invalidateQueries`. Delete the `revalidateTag` call and confirm the Server-Component comment count stays stale until the next visit while the thread still updates; restore it. Delete `invalidateQueries` and confirm the optimistic row lingers (with its `optimistic-...` id) until the next poll; restore it.
- [ ] With a debug delay on the action in flight, fire the inspector's "Insert coworker comment"; on settle the refetch returns both rows from the database and no duplicate is visible — the optimistic placeholder is replaced by the canonical server row.
- [ ] Grep for raw `['comments', ...]` arrays outside `src/lib/query/keys.ts`; zero hits — every hook and cache call imports `commentKeys`.

After this lesson the full project is done: re-run the project goals end to end and confirm each holds. Forward pointer, not an implementation step here — production should clear the client cache at the tenancy boundary by wiring `queryClient.clear()` (or `removeQueries` per org-scoped subtree) into the chapter 056 active-org-switch action; the inspector's "Clear client cache" button demonstrates the manual call, and lesson 3 of chapter 076's framing names this discipline. Name where it goes; do not reach into that action here.

Where this leads:

- Chapter 078 — Zustand for genuinely shared client state; the chapter project layers a wizard's per-step shared state over four routes and runs the threshold question against a different surface.
- Unit chapter 089 — component tests for the comment thread; the optimistic-add-and-rollback assertions are mechanical against a mocked `addCommentAction`.
- Unit chapter 081 — security baseline; the route handler's tenancy check is one of the audited findings (`authedRoute` on every read seam, not just write seams).
- Unit chapter 070 — notifications dispatcher; a future "@-mention" feature on the thread would route through the dispatcher rather than the polling loop.
- Unit chapter 092 — structured logs; the `comment.added` audit-log entry is the operator-truth side, the in-app notification (Unit 13) the user-facing side — the same notifiable-vs-logged distinction from chapter 070.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
