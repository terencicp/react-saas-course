# Chapter 077 — Project: TanStack Query on optimistic comments

## Chapter framing

Chapter 077 cashes in the threshold and wiring discipline of chapter 076 — the four-trigger funnel (lesson 1 of chapter 076), the read/write split between `useInfiniteQuery` and the Server Action (lesson 4 of chapter 076), the per-request `getQueryClient()` rule on the server (lesson 3 of chapter 076), the `<HydrationBoundary>` SSR-hydrated shape (lesson 3 of chapter 076), the cache-update optimistic pattern with `cancelQueries` + snapshot + restore (lesson 2 of chapter 076 / lesson 4 of chapter 076), the `commentKeys` helper (lesson 2 of chapter 076), and the two-system invalidation reality (lesson 3 of chapter 076 / lesson 4 of chapter 076) — as one runnable per-invoice comment thread on top of the Unit chapter 062 invoices surface. The student wires `<QueryClientProvider>` and the senior defaults, prefetches the thread's first page on the Server Component invoice page (the page reads the store in-process — no HTTP round-trip), hydrates the client cache, runs `useInfiniteQuery` with cursor paging and a 10-second `refetchInterval`, posts new comments through a Server Action, then fires the cache-update optimistic shape with rollback on `onError` and `invalidateQueries` from the client after the action returns. Each build closes on a runnable state: lesson 2 of chapter 077 ends with the provider wired and the seeded first page rendering with no client loading state on first paint; lesson 3 of chapter 077 ends with infinite scroll and polling live; lesson 4 of chapter 077 ends with optimistic add and rollback wired and the full flow verifiable.

The data layer is a deterministic in-memory store (`src/server/store.ts`, a `globalThis`-backed singleton that survives the bundle split between the route handler and the Server Action module graphs), not Postgres — `pnpm install` and `pnpm dev` are the only setup; there is no Docker, no migrations, no `DATABASE_URL`. The store mirrors the SQL *shapes* (keyset cursor on `(createdAt, id)`, org-scoped reads), and the inspector documents the equivalent Postgres index and query plan in prose rather than running it live.

### Project goals

The finished comment thread is done when, on the chapter 062 invoice detail page:

- The initial paint shows the seeded thread with no client loading state — the SSR-hydrated cache populates the first render, no skeleton, no waterfall.
- Submitting a comment shows the new row immediately at the top of the thread, and it persists once the Server Action returns.
- A failed submit (the inspector's "Force 500 on next POST") rolls the optimistic row back and surfaces an error banner, leaving the audit log untouched.
- A comment inserted from another browser session ("Insert coworker comment" in the inspector) appears in the open thread within the 10-second poll window, with no manual refresh.
- Scrolling up loads older pages through the route handler without re-fetching the already-loaded head.
- Polling pauses when the tab is hidden and resumes within 10 seconds of the tab regaining focus.

These hold on top of architectural invariants the build keeps throughout: the per-request server `QueryClient` never leaks across requests; TanStack Query stays scoped to the comment-thread leaf (nothing else on the page uses it); the route handler is the client read seam and the Server Action is the write seam; the two-system invalidation (`updateTag` plus `invalidateQueries`) fires together; and `commentKeys` is the only place query-key arrays exist.

Threads through every lesson: TanStack Query is **scoped to the comment thread leaf only** — the rest of the invoice detail page stays Server Components, no `useQuery` creeps outside the `<CommentThread />` subtree; the `QueryClient` is per-request on the server via React's `cache()` and a singleton on the client, never module-scoped on the server; the **client** `queryFn` calls a route handler (`GET /api/invoices/[id]/comments`) so the client read seam stays a public HTTP contract that a future mobile or third-party client can hit, while the Server Component's prefetch reads the store directly in the page via the server-only `listCommentsPage` — the fetcher module is client-safe and never touches `server-only` code (importing it from a Client Component would otherwise fail `next build`); the write seam is a Server Action (`addCommentAction`) — Server Actions own input parsing, audit-log writes, and the canonical Result — and the client invalidates the TanStack cache after the action resolves; `commentKeys` is the only place query-key arrays exist, same structural enforcement as `tags.ts` from lesson 1 of chapter 072; the optimistic update is the **cache-update** shape (snapshot via `getQueryData`, write via `setQueryData`, restore in `onError`, invalidate in `onSettled`) because the new row has to land inside `data.pages[0].comments` of the infinite-query cache; `cancelQueries` runs before every optimistic `setQueryData` to prevent an in-flight refetch from overwriting the optimism; polling uses `refetchInterval: 10_000` plus `refetchIntervalInBackground: false` so polling pauses when the tab is hidden; the two-system invalidation (Server Action's `updateTag` + client's `invalidateQueries`) is the architectural price tag of bringing TanStack Query in, surfaced deliberately at the seam.

### Dependency carry-in

- **From chapter 062 (the starter base):** `app/(app)/invoices/page.tsx` Server Component reading `invoiceListSearchParamsCache`, `app/(app)/invoices/[id]/page.tsx` Server Component reading `getInvoiceDetail({ orgId, id, role })`, the toolbar / table / view-tabs / pagination shells, the four lifecycle Server Actions, the version-precondition update path (`edit-form.tsx` + `conflict-banner.tsx`), and the `scopedInvoices(orgId)` query builder.
- **From chapter 059 (tenancy + RBAC):** `authedAction(role, schema, fn)` (FormData) **and** `authedInputAction(role, schema, fn)` (plain object) in `src/lib/authed-action.ts`; `authedRoute(role, schema, fn)` in `src/lib/authed-route.ts`; the cookie-driven dev `Session = { userId, orgId, role }` from `src/server/session.ts`; `pushAudit({ orgId, actorUserId, action, subjectId })` from `src/server/store.ts`. Roles are `roleAtLeast(role, required)`; there is no Better Auth in this project — the session is a dev cookie the inspector switches.
- **From the data layer:** the in-memory store (`src/server/store.ts`) holding `invoices`, `auditLogs`, `invoiceComments`, plus `users` (4 seeded: 2 orgs × admin + member). New for this project: the `InvoiceComment` shape — `{ id, orgId, invoiceId, authorId, authorName, body, createdAt }` — and the store's keyset-paged `listCommentsPage` (cursor is base64url of `createdAt|id`, ordered `createdAt desc, id desc`). The inspector's "Index & query plan" panel documents the equivalent Postgres comments table keyset-paged on `(created_at, id)` and scoped to `org_id`.
- **From chapter 046 (route handlers):** `authedRoute(role, schema, fn)` wrapper, the JSON success envelope `{ data }`, RFC 9457 Problem Details on refusal (401/403/400/500), the Zod parse at the boundary, the shared response schema imported by both the handler and the client `queryFn`.
- **From chapter 043 + chapter 047:** canonical `Result<T>` shape (`ok()` / `err()` / `conflict()` in `src/lib/result.ts`), Zod 4 `strictObject` at the action boundary, `'use server'`, `useActionState` (used by the invoice edit/lifecycle path, not the comment post).
- **From lesson 6 of chapter 032 / lesson 2 of chapter 072:** `updateTag` for the Server Component cache invalidation from the action (the read-your-writes form chapter 076 lesson 4 standardized on for in-app mutations; `revalidateTag(tag, 'max')` is reserved for webhooks/background jobs).
- **From lesson 1 of chapter 072 (`src/lib/tags.ts`):** the existing `invoiceTag(id)` and `orgInvoicesTag(orgId)` helpers plus the new `invoiceCommentsTag(invoiceId)` helper, invalidated by the action via `updateTag` so the Server Component invoice page's cached thread refreshes alongside the TanStack cache.
- **From lesson 2 of chapter 076:** `useQuery`, `useMutation`, `useInfiniteQuery` primitives; `commentKeys.lists(invoiceId)`; `cancelQueries` + `getQueryData` + `setQueryData` + restore pattern; `maxPages` cap; `refetchInterval` + `refetchIntervalInBackground: false`.
- **From lesson 3 of chapter 076:** `getQueryClient()` with the `typeof window` branch and React `cache()` on the server; `<QueryClientProvider>` with senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`); `<HydrationBoundary>`; `<ReactQueryDevtools />` gated on `NODE_ENV`.
- **From lesson 4 of chapter 076:** the read/write split (infinite query reads, Server Action writes), the cache-update optimistic shape (not via-variables), the two-system invalidation, the 10-second polling cadence with background pause.

### Starter file tree (stubs marked with TODO)

Start and solution share one file tree — no files are added or removed; the student work is edits *within* the stubbed files below. There is no Docker, no Drizzle, no migration or seed script: the in-memory store self-seeds deterministically on first import.

```
next.config.ts                  # provided: cacheComponents, typedRoutes, reactCompiler, turbopack
package.json                    # provided: dev, build, verify; @tanstack/react-query + devtools
src/
  server/
    types.ts                    # provided: InvoiceStatus, Role, roleAtLeast, Invoice, AuditLog,
                                #           InvoiceComment
    session.ts                  # provided: cookie-driven dev Session { userId, orgId, role }
    store.ts                    # provided: globalThis-backed store (invoices, auditLogs,
                                #           invoiceComments, users); reseed self-seeds 45+2 acme
                                #           invoices + 6 globex, 240 comments per focal invoice;
                                #           listCommentsPage keyset cursor; insertCoworkerComment
  lib/
    result.ts                   # provided: Result<T> + ok/err/conflict
    tags.ts                     # provided: invoiceTag, orgInvoicesTag + new invoiceCommentsTag
    authed-action.ts            # provided: authedAction (FormData) + authedInputAction (object)
    authed-route.ts             # provided: authedRoute (RFC 9457 Problem Details on refusal)
    query-client.ts             # TODO student: makeQueryClient() + getQueryClient() with the
                                #               typeof window branch and cache()
    comments/
      schema.ts                 # provided: Zod request/response schemas (ids are string.min(1)),
                                #           shared by handler + client + action
      keys.ts                   # TODO student: commentKeys.all / lists(invoiceId) / detail(id)
      fetcher.ts                # TODO student: fetchCommentsPage({ invoiceId, cursor }) — CLIENT-only
                                #               HTTP fetcher to the route handler (never imports
                                #               server-only code)
      queries.ts                # provided: server-only listCommentsPage — wraps the store read and
                                #           projects orgId off the row for the strict wire shape
      actions.ts                # TODO student: addCommentAction (authedInputAction + force-failure
                                #               check + pushComment + pushAudit + updateTag)
      force-failure.ts          # provided: per-user one-shot force-500 flag (globalThis map)
    invoices/                   # provided: search-params, queries, actions, scoped-query (chapter 062)
  app/
    layout.tsx                  # provided shell; <Providers> already wraps children (doc-only TODO)
    _components/
      providers.tsx             # TODO student: add QueryClientProvider + gated ReactQueryDevtools
                                #               + ClearCacheOnFlag to the existing ThemeProvider
    api/
      invoices/
        [id]/
          comments/
            route.ts            # TODO student: GET handler — authedRoute('member', schema, fn),
                                #               call listCommentsPage, return { data } payload
    (app)/
      invoices/
        page.tsx                # provided: chapter 062 list page
        [id]/
          page.tsx              # provided shell; TODO student: per-request QueryClient,
                                #                                prefetchInfiniteQuery (in-process
                                #                                listCommentsPage), dehydrate,
                                #                                <HydrationBoundary>
          comment-thread.tsx    # TODO student: 'use client'; useInfiniteQuery, "Load older",
                                #                useMutation with optimistic + rollback
          comment-form.tsx      # provided shell; TODO student: controlled textarea driven by
                                #                                props from CommentThread
          edit/                 # provided: chapter 062 version-precondition edit path
    inspector/
      page.tsx                  # provided: identity switcher (4 seeded users), focal-invoice links,
                                #           "Insert coworker comment", "Force 500 on next POST",
                                #           "Clear client cache", "Open thread with polling OFF",
                                #           reset/reseed, force-version-drift, comment audit tail
      actions.ts                # provided: the inspector's Server Actions
```

### Reference solution signatures lessons display

- **Query client factory** (`src/lib/query-client.ts`):
  - `makeQueryClient()` — returns `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false }, dehydrate: { shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending' } } })`. The `dehydrate` override ships pending queries so SSR streaming hydrates in-flight reads.
  - `getQueryClient` branches on `typeof window === 'undefined'`: server returns `cache(makeQueryClient)()` (React `cache()` scopes per-request), browser returns a module-scoped singleton (`let browserClient; browserClient ??= makeQueryClient()`). The branch is the load-bearing piece; the file must NOT add `import 'server-only'` because the browser branch has to ship.
- **Query keys** (`src/lib/comments/keys.ts`):
  - `commentKeys = { all: ['comments'] as const, lists: (invoiceId: string) => [...commentKeys.all, 'list', invoiceId] as const, detail: (id: string) => [...commentKeys.all, 'detail', id] as const }` — the exact factory shape chapter 076 lesson 2 shipped (method name `lists`, plural).
  - The hierarchy lets `invalidateQueries({ queryKey: commentKeys.all })` match all comment lists, `invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })` matches one thread. The `as const` keeps the tuple narrow.
- **Providers** (`src/app/_components/providers.tsx`):
  - `'use client'` at the top. The provided shell already wraps children in `ThemeProvider`; the student adds `<QueryClientProvider client={getQueryClient()}>` around it, mounts `ReactQueryDevtools` via `next/dynamic` gated on `NODE_ENV !== 'production'` (so it tree-shakes from prod), and renders a `<ClearCacheOnFlag />` child inside `<Suspense>` that reads `?clearCache=1` from `useSearchParams()` and calls `queryClient.clear()` once. The `<Suspense>` is mandatory because `useSearchParams` is an uncached request-time read under `cacheComponents: true`.
- **Comments schemas** (`src/lib/comments/schema.ts`, provided):
  - `commentSchema = z.strictObject({ id: z.string().min(1), invoiceId: z.string().min(1), authorId: z.string().min(1), authorName: z.string(), body: z.string(), createdAt: z.iso.datetime() })`. Ids are `z.string().min(1)`, NOT `z.uuid()`: the in-memory store seeds non-UUID ids (`inv-0001`, `cmt-...`, `org-acme`) and the optimistic row carries an `optimistic-<uuid>` id — `z.uuid()` would reject all of them.
  - `commentsPageSchema = z.strictObject({ comments: z.array(commentSchema), nextCursor: z.string().nullable(), prevCursor: z.string().nullable() })`. The `prevCursor` is required because the thread's `useInfiniteQuery` sets `maxPages: 10` — chapter 076 lesson 2 established that a capped infinite query must define `getPreviousPageParam` (so dropped pages re-fetch on scroll-back), which needs a backward cursor on every page.
  - `addCommentInput = z.strictObject({ invoiceId: z.string().min(1), body: z.string().min(1).max(2000) })`; `commentsQuerySchema = z.strictObject({ cursor: z.string().nullable().optional() })`.
- **Server-only read** (`src/lib/comments/queries.ts`, provided):
  - `listCommentsPage(args: ListCommentsPageArgs): CommentsPage` — `import 'server-only'`; a thin wrapper over the store's keyset-paged read that **projects `orgId` off each row** so the strict `commentsPageSchema.parse(page)` matches (the store row carries `orgId` for tenancy; the wire shape does not). Used by both the route handler and the page's SSR prefetch.
- **Client fetcher** (`src/lib/comments/fetcher.ts`):
  - `fetchCommentsPage = async ({ invoiceId, cursor }: { invoiceId: string; cursor: string | null }) => { const url = new URL(\`/api/invoices/${invoiceId}/comments\`, window.location.origin); if (cursor) url.searchParams.set('cursor', cursor); const res = await fetch(url, { credentials: 'same-origin' }); if (!res.ok) throw new Error(\`Failed to load comments (${res.status})\`); const json = await res.json(); return commentsPageSchema.parse(json.data); }`. This is a **client-only** module — it never branches on `typeof window` and never imports `server-only` code. The server prefetch reads the store directly in `page.tsx`, not through this module.
- **Route handler** (`src/app/api/invoices/[id]/comments/route.ts`):
  - `export const GET = authedRoute('member', commentsQuerySchema, (query, ctx) => { const page = listCommentsPage({ orgId: ctx.orgId, invoiceId: ctx.params.id, cursor: query.cursor ?? null, pageSize: 20 }); return Response.json({ data: commentsPageSchema.parse(page) }); })` — positional `authedRoute(role, schema, fn)`; `ctx.params.id` carries the dynamic segment; tenancy falls out of scoping to `ctx.orgId` (a cross-org `invoiceId` yields an empty page).
- **Server Action** (`src/lib/comments/actions.ts`):
  - `addCommentAction = authedInputAction('member', addCommentInput, async (input, ctx) => { if (consumeForceFailure(ctx.userId)) return { ok: false as const, error: { code: 'internal' as const, userMessage: 'Forced failure for verification' } }; const authorName = findUser(ctx.userId)?.name ?? ctx.userId; const row = pushComment({ orgId: ctx.orgId, invoiceId: input.invoiceId, authorId: ctx.userId, authorName, body: input.body }); pushAudit({ orgId: ctx.orgId, actorUserId: ctx.userId, action: 'comment.added', subjectId: row.id }); await updateTag(invoiceCommentsTag(input.invoiceId)); return { ok: true as const, data: { id: row.id, createdAt: row.createdAt } }; })`. Note: `authedInputAction` (plain object, callable from `useMutation`), NOT the FormData `authedAction`; the force-failure flag is consumed FIRST so a forced failure writes no audit row.
- **Server Component prefetch** (`src/app/(app)/invoices/[id]/page.tsx`):
  - `const queryClient = getQueryClient(); await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.lists(id), queryFn: ({ pageParam }) => listCommentsPage({ orgId: session.orgId, invoiceId: id, cursor: pageParam, pageSize: 20 }), initialPageParam: null as string | null });` then wrap the thread `<section>` in `<HydrationBoundary state={dehydrate(queryClient)}><CommentThread invoiceId={invoice.id} session={{ userId: session.userId, userName }} /></HydrationBoundary>`. The prefetch `queryFn` calls the server-only `listCommentsPage` **directly** — not the client fetcher — under the same key the hook uses. The chapter 062 invoice header / customer / total cards stay Server Components above the boundary.
- **Client thread** (`src/app/(app)/invoices/[id]/comment-thread.tsx`):
  - `'use client'`; takes `{ invoiceId, session: { userId, userName } }` props from the page; `useInfiniteQuery({ queryKey: commentKeys.lists(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor ?? undefined, getPreviousPageParam: (first) => first.prevCursor ?? undefined, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })` (`getPreviousPageParam` is mandatory because `maxPages` is set — chapter 076 lesson 2). Renders `data?.pages.flatMap(p => p.comments)` newest first; a `data-testid="load-older"` button for "Load older" / "End of thread"; an `isFetching` "Updating…" poll indicator distinct from the `isFetchingNextPage` spinner.
- **Optimistic mutation** (inside `comment-thread.tsx`):
  - `useMutation({ mutationFn: async (text: string) => { const result = await addCommentAction({ invoiceId, body: text }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }, onMutate: async (text) => { await queryClient.cancelQueries({ queryKey: commentKeys.lists(invoiceId) }); const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.lists(invoiceId)); const optimistic: Comment = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body: text, createdAt: new Date().toISOString() }; queryClient.setQueryData<InfiniteData<CommentsPage>>(commentKeys.lists(invoiceId), (old) => old ? { ...old, pages: [{ comments: [optimistic, ...(old.pages[0]?.comments ?? [])], nextCursor: old.pages[0]?.nextCursor ?? null, prevCursor: old.pages[0]?.prevCursor ?? null }, ...old.pages.slice(1)] } : old); return { snapshot }; }, onError: (_err, _text, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.lists(invoiceId), ctx.snapshot); }, onSuccess: () => setBody(''), onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) }); } })`. The textarea body is local `useState` cleared in `onSuccess`.
- **Env entries:** none. The project boots with `pnpm install` + `pnpm dev`; no `.env`, no Postgres, no third-party services.

### Inspector page spec

Single Server Component at `/inspector` (plus `src/app/inspector/actions.ts`), the verification surface each lesson's Moment of truth drives. Every control is a `<form action={serverAction}>`; the actions mutate the store and `revalidatePath('/inspector')` (and `/invoices` where relevant) — no `router.refresh()`.

- **Acting-identity switcher:** a `<select>` over the four seeded identities (`org-acme:admin`, `org-acme:member`, `org-globex:admin`, `org-globex:member`); `switchIdentity` writes the dev session cookie. Each org's focal invoice (`inv-0001` / `glx-0001`) is linked.
- **"Force 500 on next POST" button:** `armForceFailureAction` sets a per-user one-shot flag (`globalThis`-backed `Map` in `force-failure.ts`). The next `addCommentAction` for the acting user `consumeForceFailure`s the flag FIRST and returns `{ ok: false, error: { code: 'internal', userMessage: 'Forced failure for verification' } }`, writing no audit row — so the optimistic row rolls back with the audit tail untouched. The action returns before any insert; the route handler is not involved (it is read-only). A `data-testid="force-500-state"` line shows armed/disarmed for the acting user. The teaching surface for the rollback verification in lesson 4 of chapter 077.
- **"Insert coworker comment" button:** `insertCoworkerCommentAction` inserts an `invoiceComments` row authored by the **other** seeded user in the active org. It does **not** call `updateTag` — the TanStack Query poll is what surfaces the row on the open client. Used to verify cross-session arrival within the 10-second window.
- **"Clear client cache" button:** `clearClientCacheAction` redirects to `/invoices/<focal>?clearCache=1`; the `ClearCacheOnFlag` child inside `<Providers>` reads the flag once and calls `queryClient.clear()`. Used to demonstrate the SSR-hydrated first paint without a leftover cache.
- **"Open thread with polling OFF" link:** opens the focal invoice with `?poll=off`, a labeled entry point for the background-pause demonstration (watch the network tab go quiet when the tab is hidden). The thread hard-wires `refetchIntervalInBackground: false`; there is no runtime toggle button.
- **Comment audit tail:** last 20 `comment.added` rows from `auditLogs`, scoped to the active org. Confirms the Server Action's audit write fires on the happy path and does not fire on the forced-failure path.
- **Reset and re-seed / Force version drift:** `resetAndReseed` returns the store to its deterministic seed; `forceVersionDrift` bumps a row's `version` to drive the chapter 062 optimistic-concurrency 409 on the edit form. Provided for run hygiene; not central to this project's verification.
- **Index & query plan panel:** prose describing the equivalent Postgres comments table keyset-paged on `(created_at, id)` and scoped to `org_id` — the in-memory store runs the same shapes, so the SQL artifacts are documented rather than executed.

The inspector is provided in full; the student writes only `query-client.ts`, `comments/keys.ts`, `comments/fetcher.ts`, `_components/providers.tsx`, the route handler, `comments/actions.ts`, the prefetch wiring in the invoice detail page, the thread component, and the comment form.

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
- The two read paths: server prefetch reads the store directly (`listCommentsPage`), client reads go through the route handler via the client-only fetcher — lesson 3 of chapter 076.
- `<ReactQueryDevtools />` gated on `NODE_ENV` via `next/dynamic` — lesson 3 of chapter 076.
- `'use client'` boundary placement at the leaf, not the page — lesson 3 of chapter 076 (lesson 2 of chapter 030 frame).
- Route handlers as the client read seam — chapter 046 (lesson 4 of chapter 076 frame).
- Server Actions as the write seam, canonical Result, audit write — chapter 043 / chapter 059.
- The two-system invalidation reality (Server Component cache vs. TanStack cache) — lesson 3 of chapter 076 + lesson 4 of chapter 076.
- Zod parse at every boundary (route handler, fetcher, action) — chapter 042.

---

## Lesson 1 — Project Overview

Bolt a polling, infinite-scrolling, optimistically-added comment thread onto the chapter 062 invoice detail page, with TanStack Query scoped to the thread leaf. The student leaves with the starter running locally on `pnpm dev`: the invoice detail page renders, the seeded thread is in the store (240 comments per focal invoice), and the comment-thread leaf shows its "not wired yet" stub because the hooks are not yet implemented.

One figure: a screenshot of the finished invoice detail page — chapter 062 header, customer and total cards, with the comment thread below showing a freshly posted optimistic row at the top.

### What we'll practice

- Wiring TanStack Query into an App Router surface the senior way: a `<QueryClientProvider>` with production defaults, a per-request `QueryClient` on the server, and `'use client'` pushed to the leaf rather than the page.
- Bridging server and client caches: prefetching on a Server Component, dehydrating, and hydrating the client cache so the first paint carries data with no loading state.
- Reading a paginated, polling list with `useInfiniteQuery` — cursor paging, a bounded page count, and a poll cadence that pauses when the tab is hidden.
- Writing through a Server Action with the cache-update optimistic shape — snapshot, optimistic write, rollback on failure — and reconciling the two caches that now hold the same data.

### Architecture

- The chapter 062 invoice detail page stays a Server Component. The comment thread is a single client leaf (`<CommentThread />`) mounted at the bottom; nothing else on the page touches TanStack Query.
- Two read paths: a route handler (`GET /api/invoices/[id]/comments`) is the public HTTP contract the **client** polls and scroll-fetches through; the Server Component's prefetch reads the store **directly** via the server-only `listCommentsPage`. Same key, same wire shape, two execution contexts — but two distinct functions, because the client fetcher must never import server-only code.
- Write seam: a Server Action (`addCommentAction`) owns the input parse, the comment insert, the audit write, and `updateTag`. The client posts through it via `useMutation` and invalidates the TanStack cache once it resolves.
- The `QueryClient` is per-request on the server (React `cache()`) and a singleton on the client. `commentKeys` is the only source of query-key arrays.
- An `/inspector` Server Component is the verification surface the Implementation lessons drive: an acting-identity switcher plus controls ("Force 500 on next POST", "Insert coworker comment", "Clear client cache", "Open thread with polling OFF") and a comment audit tail. (Full spec above.)

### Starting file tree

The student-facing tree below highlights the files carrying TODOs — those are the build. Everything else is provided: the full chapter 062 surface, the in-memory store with the seeded comments, the shared Zod schemas, the provided server-only `listCommentsPage`, the force-failure flag, and the inspector. (The complete annotated tree, including the provided files, is in the Chapter framing above.)

```
src/
  lib/
    query-client.ts    # TODO — makeQueryClient() + getQueryClient() (typeof window branch + cache())  ← focus
    comments/
      schema.ts        # provided — shared Zod request/response schemas (ids: string.min(1))
      keys.ts          # TODO — commentKeys.all / lists(invoiceId) / detail(id)                ← focus
      queries.ts       # provided — server-only listCommentsPage (store read, projects orgId off)
      fetcher.ts       # TODO — fetchCommentsPage, client-only HTTP fetcher                     ← focus
      actions.ts       # TODO — addCommentAction (force-failure + pushComment/pushAudit + updateTag)  ← focus
      force-failure.ts # provided — per-user one-shot force-500 flag
  app/
    _components/providers.tsx  # provided shell — add QueryClientProvider + devtools + ClearCacheOnFlag  ← focus
    api/invoices/[id]/comments/
      route.ts         # TODO — GET handler, the client read seam                              ← focus
    layout.tsx         # provided — <Providers> already wraps children (doc-only TODO)
    (app)/invoices/[id]/
      page.tsx         # provided shell — add prefetch + dehydrate + <HydrationBoundary>        ← focus
      comment-thread.tsx  # TODO — 'use client'; useInfiniteQuery + useMutation                 ← focus
      comment-form.tsx    # provided shell — controlled form driven by CommentThread props       ← focus
    inspector/page.tsx # provided in full — the verification surface
```

`src/lib/comments/` is a feature-shaped directory grouping the schema, keys, fetcher, queries, action, and force-failure flag for the thread so the read/write seams sit together; `getQueryClient` lives at the top-level `src/lib/query-client.ts` because the factory is shared infrastructure, not comment-specific. `commentKeys` lives beside the comment feature because key arrays are that feature's query-system identifiers — the parallel to `tags.ts` from lesson 1 of chapter 072.

### Roadmap

<CardGrid>
  <Card title="Lesson 2 — Provider, per-request factory, and the SSR-hydrated first page">Wires the provider, keys, per-request factory, and the prefetch-plus-hydration bridge so the seeded thread paints with no client loading state.</Card>
  <Card title="Lesson 3 — Infinite scroll, polling, and the route handler">Adds the public read seam and the leaf's `useInfiniteQuery` so "Load older" pages in and a coworker's comment arrives within the poll window.</Card>
  <Card title="Lesson 4 — Optimistic add and rollback with useMutation">Adds the Server Action write seam and the optimistic post — instant row, rollback on failure, two-system invalidation — then verifies the full flow.</Card>
</CardGrid>

### Setup

The starter is the chapter 062 codebase plus the in-memory `invoiceComments` store (a `(createdAt, id)` keyset cursor; the inspector documents the equivalent Postgres composite index) and a deterministic seed of 240 comments per focal invoice alternating between the org's two seeded users — the second identity is what the "Insert coworker comment" verification attributes rows to. `cacheComponents: true` stays on from chapter 062; the comment thread is a fresh dynamic-with-client-cache leaf that does not touch the cached invoice-header subtree. There is no Postgres, Docker, or `.env` — the store self-seeds on first import.

1. Install dependencies (`pnpm install`). `@tanstack/react-query` and the devtools ship in the starter's `package.json`.
2. Start the dev server (`pnpm dev`).

Expected result: `/invoices/[id]` renders the chapter 062 invoice detail page working end-to-end; the comment-thread leaf shows its "not wired yet" stub. `/inspector` loads with the identity switcher and comment controls, but posting and polling do nothing yet because the hooks, provider, and seams are unimplemented.

---

## Lesson 2 — Provider, per-request factory, and the SSR-hydrated first page

Open an invoice detail page and the seeded comment thread is already there on first paint — no skeleton, no spinner, no loading flash. The finished result: the chapter 062 page renders as before, and below the line items the first 20 seeded comments appear instantly, served from a cache the Server Component populated and handed to the client.

### Your mission

This is the foundation every later lesson builds on: get TanStack Query mounted on the App Router the senior way, then prove it by making the seeded thread paint with no client loading state. The hard part is not the provider — it is the seam between the server and client caches. On the server, the `QueryClient` must be created fresh per request: a module-scoped client leaks one org's prefetched comments into the next org's render, which in a multi-tenant SaaS is a data-isolation bug, so the factory branches on `typeof window` and wraps the server path in React's `cache()` while the client keeps a single long-lived singleton. The invoice page's Server Component prefetches the thread's first page — reading the store directly via the server-only `listCommentsPage`, not the client fetcher — dehydrates the cache, and wraps only the thread subtree in a `<HydrationBoundary>`; the chapter 062 header and cards above it stay Server Components and stay outside the boundary, because `'use client'` belongs at the leaf, not the page. The prefetch and the client hook must address the cache through the exact same key — `commentKeys.lists(invoiceId)`, the single source of query-key arrays — or the hydration silently misses and the client refetches cold. The provider also sets the SaaS defaults that prevent refetch storms (`staleTime`, `gcTime`, `refetchOnWindowFocus: false`) and gates the devtools behind `NODE_ENV` so they tree-shake out of production. Out of scope this lesson: the client-side fetch, polling, infinite scroll, and posting — the client fetcher stays a stub, and the thread is read-only with no working form. You only need the server-side prefetch path working to land the first paint.

The starter ships the in-memory store, the seed, the shared Zod schemas, and the provided server-only `listCommentsPage`; the page's prefetch calls that read directly.

- Opening an invoice detail page renders the seeded thread's first page immediately on first paint, with no skeleton, spinner, or fetch fired on initial render.
- The dehydrated cache ships in the page's RSC payload — the comment bodies are present in the raw HTML, not fetched after hydration.
- Hard-refreshing the page reproduces the instant first paint every time, with the cache rebuilt per request.
- Hitting two different orgs' focal invoices in quick succession shows each org only its own comments — no rows leak from the first request into the second.
- The React Query devtools are reachable in development and absent from a production build.
- Nothing outside the comment-thread leaf and the provider uses TanStack Query — the chapter 062 toolbar, table, pagination, and lifecycle actions stay Server-Component / Server-Action shape.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/query-client.ts`: `makeQueryClient()` sets the senior defaults (`staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`) plus the `dehydrate.shouldDehydrateQuery` override that also ships `pending` queries. `getQueryClient` branches on `typeof window === 'undefined'`: server returns `cache(makeQueryClient)()` (React's per-request memoization), client returns a module-scoped singleton. Comment the branch with the cross-request-leak failure mode named in lesson 3 of chapter 076 — name the bug at the call site so future readers know why the branch is there. Do NOT add `import 'server-only'`: the browser branch has to ship. This is the most important handful of lines in the project: the `cache()`-wrapped factory scopes the instance to the React-server-render lifecycle; the client singleton survives across renders, which is the entire point of a cache.
- `src/lib/comments/keys.ts`: `commentKeys = { all: ['comments'] as const, lists: (invoiceId: string) => [...commentKeys.all, 'list', invoiceId] as const, detail: (id: string) => [...commentKeys.all, 'detail', id] as const }` — the factory shape chapter 076 lesson 2 shipped (method name `lists`, plural). Lock the hierarchy now so the later lessons share the same identity; `as const` keeps the tuples narrow.
- `src/app/_components/providers.tsx`: `'use client'` is already at the top of the provided shell (which wraps children in `ThemeProvider`). Add `<QueryClientProvider client={getQueryClient()}>` around the tree, mount `ReactQueryDevtools` imported via `next/dynamic` and gated on `process.env.NODE_ENV !== 'production'` so the bundler tree-shakes the devtools out of production, and render the provided-style `ClearCacheOnFlag` child inside a `<Suspense fallback={null}>` (it reads `useSearchParams()`, an uncached request-time read that must sit under Suspense given `cacheComponents: true`).
- `app/layout.tsx`: no code change — `<Providers>` already wraps `{children}` in the shell. This is a doc-only TODO marker.
- `src/lib/comments/fetcher.ts`: stays a throwing stub this lesson — the first paint reads the store in the page, not through this client-only module. Wired in lesson 3 of chapter 077.
- `app/(app)/invoices/[id]/page.tsx`: above the existing chapter 062 render, create the per-request `queryClient` via `getQueryClient()`, `await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.lists(id), queryFn: ({ pageParam }) => listCommentsPage({ orgId: session.orgId, invoiceId: id, cursor: pageParam, pageSize: 20 }), initialPageParam: null as string | null })`, then wrap the thread `<section>` in `<HydrationBoundary state={dehydrate(queryClient)}>`; the Server Components above stay outside it. The prefetch calls the server-only `listCommentsPage` directly under the same key the client hook uses — same wire shape, but the read here is in-process, not an HTTP hop.
- `app/(app)/invoices/[id]/comment-thread.tsx` (minimal): a `'use client'` component reading the populated cache via `useInfiniteQuery` keyed on `commentKeys.lists(invoiceId)` with a `queryFn` that still calls the stubbed `fetchCommentsPage`, rendering `data?.pages.flatMap(p => p.comments).map(...)` — no polling, no infinite scroll, no working form. The `queryFn` is never called on first render because the hydrated data is already `success`.

Decision rationale and untested-requirement coverage:

- `<HydrationBoundary>` need only wrap the subtree that runs the hook on those keys; wrapping the whole page works but is unnecessary. Boundary discipline from lesson 2 of chapter 030: push `'use client'` as deep as it goes.
- `staleTime: 60_000` is the SaaS default that prevents the 2022-era refetch-on-every-mount-and-focus storms; the polling cadence in lesson 3 of chapter 077 overrides it per-query via `refetchInterval`, which works alongside `staleTime`, not against it.
- `refetchOnWindowFocus: false` is the senior default for an authenticated SaaS surface; live-data tools flip it on per-query, but focus is not a meaningful event for an invoice thread.
- The `dehydrate.shouldDehydrateQuery` override that also ships `pending` queries lets an in-flight prefetch stream to the client and resolve there rather than being dropped from the dehydrated payload — the standard App Router SSR-streaming setup.
- The hydration boundary works only if the server's prefetch key exactly matches the client's hook key. Importing `commentKeys.lists(invoiceId)` in both places is the structural enforcement; a raw array in either spot is the silent miss.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Then confirm by hand:

- [ ] Open a focal invoice; the first 20 seeded comments render immediately — no skeleton, no flicker. View source: a seeded comment body appears in the raw HTML (the dehydrated state is in the RSC payload).
- [ ] Open the React Query devtools (the floating icon); the `['comments', 'list', invoiceId]` query is present with `state: 'success'`, `fetchStatus: 'idle'`, and no fetch fired on first paint.
- [ ] Hard-refresh; the SSR-hydrated cache rebuilds and the first paint is still instant.
- [ ] In the inspector, switch the acting identity from `org-acme:*` to `org-globex:*` and immediately open the globex focal invoice (`glx-0001`); it shows globex comments only, with no acme rows leaked. To observe the leak the branch prevents, temporarily collapse `getQueryClient` to a single module-scoped client, restart, and repeat; restore the `cache()` branch and confirm it is gone.
- [ ] Build for production (`pnpm build`) and inspect the bundle — `@tanstack/react-query-devtools` is not in the chunks (the `next/dynamic` import is gated on `NODE_ENV`).
- [ ] Grep for `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`; the only hits are `comment-thread.tsx` and `providers.tsx`.

---

## Lesson 3 — Infinite scroll, polling, and the route handler

The thread becomes live: scroll to the bottom and a "Load older" button pages in earlier comments, and a comment posted by a coworker shows up on its own within ten seconds. The finished result: the seeded first page still paints instantly, "Load older" appends earlier pages through a real HTTP endpoint, a background poll refreshes the head every ten seconds, and the polling stops while the tab is hidden.

### Your mission

Now the read side comes alive. The seam to respect here is that **client** reads travel through a public route handler — `GET /api/invoices/[id]/comments` — so the same data is reachable by a future mobile or third-party client, while the Server Component's prefetch keeps reading the store directly through the server-only `listCommentsPage` you wired in lesson 2. Two read functions, one wire shape: the client fetcher must never import the store, `getSession`, or `queries.ts` — any transitive `server-only` reach fails `next build` from a Client Component (in a real Postgres app it would also bundle the database driver into the browser). The handler is wrapped in `authedRoute`, so the tenancy boundary holds at the client read seam exactly as it does at the write seam — a request for another org's invoice scopes to the acting org and yields an empty page, and a sub-`member` role is refused with RFC 9457 Problem Details. Both the handler and the client fetcher parse the payload through the shared Zod schema, so if the response ever drifts the client fails loudly instead of rendering broken UI. On the client, `useInfiniteQuery` reads cursor pages newest-first and caps retained pages at ten — a chat-style thread bounds memory, unlike a feed-style read-once surface — and polls on a ten-second `refetchInterval` with `refetchIntervalInBackground: false` so the browser pauses polling when the tab is hidden. Ten seconds is the deliberate cadence: faster floods the connection pool and burns mobile battery, slower feels stale. Keep the "Load older" interaction an explicit button rather than an `IntersectionObserver` auto-load, which is better for feeds but wrong for a thread the user might scroll past by accident; and surface the poll's in-flight state with an `isFetching` chip distinct from the per-page spinner, the `isPending`-vs-`isFetching` distinction from lesson 2 of chapter 076. Out of scope: posting — the form stays unwired until the next lesson; this lesson is read-only. Live updates are polling, not WebSockets or Server-Sent Events, which are out of scope for this course; polling is the threshold-met case.

- Scrolling to the bottom and clicking "Load older" appends the next earlier page below the existing rows, and the already-loaded head stays in place with no refetch or flicker.
- Repeated "Load older" clicks keep appending until the thread runs out, at which point the control shows an end-of-thread state; retained pages stay capped so deep scrolling does not grow memory without bound.
- A comment inserted from another session (the inspector's "Insert coworker comment") appears at the top of the open thread within ten seconds, with no manual refresh.
- Switching to another tab pauses the polling network traffic, and switching back resumes it within ten seconds.
- "Load older" and the poll both travel as `GET /api/invoices/[id]/comments` requests visible in the network tab; the Server Component's first-paint data does not.
- A read request for an invoice in another org is rejected before any data is returned.
- A drifted response (an unexpected field) surfaces as a visible error state in the thread rather than rendering silently.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/comments/fetcher.ts`: implement the client-only fetcher — build the URL with `cursor` as an optional search param, `fetch` with `credentials: 'same-origin'`, throw on `!res.ok` so `useInfiniteQuery` surfaces the error, and validate with `commentsPageSchema.parse(json.data)` (the `{ data }` envelope from chapter 046). Keep the module free of any `server-only` import.
- `app/api/invoices/[id]/comments/route.ts`: `export const GET = authedRoute('member', commentsQuerySchema, (query, ctx) => { ... })` — positional args. Inside, `listCommentsPage({ orgId: ctx.orgId, invoiceId: ctx.params.id, cursor: query.cursor ?? null, pageSize: 20 })`, returning `Response.json({ data: commentsPageSchema.parse(page) })`. `authedRoute` resolves the session and gates `roleAtLeast` before the read; scoping to `ctx.orgId` means a cross-org `invoiceId` returns an empty page, and a sub-`member` role gets a 403 Problem Details — defense in depth alongside the data and cache-tag layers.
- `app/(app)/invoices/[id]/comment-thread.tsx` (real shape):
  - `useInfiniteQuery({ queryKey: commentKeys.lists(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor ?? undefined, getPreviousPageParam: (first) => first.prevCursor ?? undefined, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. The `initialPageParam: null` must match the prefetch exactly, or the first render fetches cold despite the hydration boundary. `getPreviousPageParam` is required whenever `maxPages` is set (chapter 076 lesson 2) so a page dropped by the cap can be re-fetched on scroll-back.
  - Render `data?.pages.flatMap(p => p.comments).map(...)` newest-first (the DB returns descending; the component renders top-down).
  - "Load older" button at the bottom: `<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>` — "End of thread" when `hasNextPage` is false, a small spinner when `isFetchingNextPage` is true.
  - An `isFetching` indicator (a subtle dot or "Updating…" chip) at the top, distinct from the per-page spinner.

Decision rationale and untested-requirement coverage:

- The two-read-paths split is load-bearing: the server prefetch reads the store in-process with zero HTTP hop, client reads go through the public seam. Unifying them into one function would drag `server-only` code into the client bundle and erase the HTTP contract a future client depends on.
- `maxPages: 10` caps retained pages for a chat-style thread; without it an unbounded `useInfiniteQuery` accumulates pages until the tab closes. Feed-style read-once surfaces leave it unbounded.
- `refetchIntervalInBackground: false` lets the framework's `document.hidden` check pause polling when the tab is hidden; the inspector's "Open thread with polling OFF" (`?poll=off`) link opens the focal invoice for the manual demonstration of that behavior.
- The client-side `commentsPageSchema.parse` is the contract enforcement from chapter 042 / chapter 046; the schema in `src/lib/comments/schema.ts` is imported by the handler, the fetcher, and the action so drift fails loudly.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Then confirm by hand:

- [ ] Open a focal invoice; first paint shows 20 seeded comments instantly. Click "Load older" — the network tab shows `GET /api/invoices/[id]/comments?cursor=...`, the response renders below the existing rows, the head stays put. Devtools shows `data.pages.length` growing; click again and page 3 appends.
- [ ] Click "Load older" repeatedly toward the seeded depth; from a fresh load, click past page 10 and confirm `data.pages.length` caps at 10 (the oldest retained page drops), while the head page is unchanged. With 240 seeded comments (12 pages at `pageSize: 20`), "End of thread" is reachable only after the cap has dropped earlier pages.
- [ ] Keep the page open; from the inspector (another tab) click "Insert coworker comment". Within 10 seconds a `GET /api/.../comments` fires and the new row appears at the top; the comment audit tail shows the insert. No manual refresh.
- [ ] Switch to another tab for 30 seconds — no `GET /api/...comments` requests fire. Switch back; a poll fires within 10 seconds.
- [ ] In devtools, craft a `fetch('/api/invoices/<a-globex-invoice-id>/comments')` while acting as an acme user; the handler scopes to the acting org and returns an empty page (no foreign rows leak). The `roleAtLeast('member')` gate still runs first — all four seeded identities are `admin`/`member` so they pass, but the 403 Problem-Details branch is the same `authedRoute` enforcement that fires for a sub-`member` caller.
- [ ] Temporarily add a phantom field to the handler's response; the `strictObject` schema rejects it, the client surfaces an error state (`data-testid="thread-error"`), and reverting recovers the thread on the next poll.

---

## Lesson 4 — Optimistic add and rollback with useMutation

Type a comment and it appears at the top of the thread the instant you submit, then quietly settles into the canonical server row; if the server rejects it, the row vanishes and an error banner explains why. The finished result: posting is instant, persists once the action returns, and rolls back cleanly on failure — and with the write side in place, the full thread is verifiable against every project goal.

### Your mission

This is the chapter's heaviest lesson and the one that justifies bringing TanStack Query in at all: the cache-update optimistic add with rollback. The write seam is a Server Action, `addCommentAction` (built on `authedInputAction`, the plain-object twin callable straight from `useMutation`), which owns the input parse, the comment insert, the audit write, and the `updateTag` that refreshes the Server Component's cached thread. The client posts through it with `useMutation`, not `<form action>` with `useActionState`: when TanStack Query already owns the read side, the write composes through `useMutation`, whose `onMutate`/`onError`/`onSettled` lifecycle is what the optimistic shape needs — `useActionState` is built for the redirect-and-revalidate path (and is what the chapter 062 invoice edit/lifecycle forms still use), and mixing the two would put two sources of truth on one form. The optimistic update must be the cache-update shape, not the via-variables shape from lesson 2 of chapter 076, because the new row has to land inside `data.pages[0].comments` of the infinite-query cache rather than be rendered inline. `onMutate` must `cancelQueries` before it writes — otherwise an in-flight poll resolving mid-flight overwrites the optimism with data the server does not yet know about — then snapshot the whole query data wide, write the optimistic row with an `optimistic-`-prefixed client id, and return the snapshot. `onError` restores that snapshot exactly; on the inspector's forced failure the action returns its `internal` Result before any insert or audit write, so the audit tail stays clean. `onSettled` always fires and is where `invalidateQueries` belongs — on success it pulls the canonical server row in and the temporary id flips to the real store id; skip it and the optimistic row lingers until the next poll. This is the two-system invalidation reality stated once at the seam: the action's `updateTag` invalidates the Server Component cache, the client's `invalidateQueries` invalidates the TanStack cache, and both must fire. The `optimistic-` prefix doubles as the dedup anchor if a coworker's poll lands while the add is in flight. Out of scope, and worth naming so the student does not over-build: no comment edit, delete, or moderation; no @-mention notifications (Unit 13 territory); no rich-text body (`body` is a plain string with a `min(1).max(2000)` Zod cap); and no fan-out optimistic writes to other queries — there is one query and one optimistic write here.

- Submitting a comment shows the new row at the top of the thread synchronously, before the server responds, and the form clears.
- Once the action returns, the optimistic row is replaced by the canonical server row (its temporary `optimistic-<uuid>` id becomes the server-generated store id) and the new `comment.added` row appears in the comment audit tail.
- When the server rejects the submit (the inspector's "Force 500 on next POST"), the optimistic row disappears, the prior thread state is restored exactly, and an inline error banner surfaces — with the audit tail unchanged because the action returns before any insert or audit write.
- A successful add invalidates both caches: the thread refetches the canonical row and the Server Component's cached thread refreshes; skipping either invalidation is observable as a stale layer.
- A coworker's comment arriving mid-submit does not produce a duplicate once the dust settles — the canonical rows replace the optimistic placeholder.
- Every query-key reference across the read and write paths comes from `commentKeys`; no raw key arrays exist outside it.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

- `src/lib/comments/actions.ts`: `addCommentAction = authedInputAction('member', addCommentInput, async (input, ctx) => { ... })`. First, `if (consumeForceFailure(ctx.userId)) return { ok: false, error: { code: 'internal', userMessage: 'Forced failure for verification' } }` — consume the flag before any write so a forced failure leaves the audit tail clean. Then resolve `authorName = findUser(ctx.userId)?.name ?? ctx.userId`, `const row = pushComment({ orgId: ctx.orgId, invoiceId: input.invoiceId, authorId: ctx.userId, authorName, body: input.body })`, `pushAudit({ orgId: ctx.orgId, actorUserId: ctx.userId, action: 'comment.added', subjectId: row.id })`, then `await updateTag(invoiceCommentsTag(input.invoiceId))` — the read-your-writes form chapter 076 lesson 4 standardized on, not `revalidateTag(tag, 'max')` (the webhook/background-job variant). Return `{ ok: true, data: { id: row.id, createdAt: row.createdAt } }`; on a parse failure the `authedInputAction` wrapper returns the canonical `{ ok: false, error }` shape the mutation keys its rollback on. (There is no Postgres transaction here — the store is in-memory; in a real DB this insert + audit pair would run inside one `tenantDb(orgId).transaction`.)
- `app/(app)/invoices/[id]/comment-form.tsx`: a controlled `<textarea>` and submit button, a child of `<CommentThread />` so it shares the query-client scope. It is props-driven — `{ body, onBodyChange, onPost, isPending, error }` — not a `<form action>`. `onPost(body)` triggers the mutation; `isPending` disables the button and dims the textarea (`data-testid="comment-submit"`); `error` surfaces in an inline banner (`data-testid="post-error"`). The parent `CommentThread` owns the `body` `useState` and clears it in `onSuccess`.
- `useMutation` inside `comment-thread.tsx`:
  - `mutationFn: async (text: string) => { const result = await addCommentAction({ invoiceId, body: text }); if (!result.ok) throw new Error(result.error.userMessage); return result.data; }`.
  - `onMutate: async (text) => { await queryClient.cancelQueries({ queryKey: commentKeys.lists(invoiceId) }); const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.lists(invoiceId)); const optimistic: Comment = { id: \`optimistic-${crypto.randomUUID()}\`, invoiceId, authorId: session.userId, authorName: session.userName, body: text, createdAt: new Date().toISOString() }; queryClient.setQueryData<InfiniteData<CommentsPage>>(commentKeys.lists(invoiceId), (old) => old ? { ...old, pages: [{ comments: [optimistic, ...(old.pages[0]?.comments ?? [])], nextCursor: old.pages[0]?.nextCursor ?? null, prevCursor: old.pages[0]?.prevCursor ?? null }, ...old.pages.slice(1)] } : old); return { snapshot } }`.
  - `onError: (_err, _text, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.lists(invoiceId), ctx.snapshot) }`.
  - `onSuccess: () => setBody('')`.
  - `onSettled: () => { queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) }) }`.

Decision rationale and untested-requirement coverage:

- `cancelQueries` is the load-bearing first line of `onMutate`: without it an in-flight poll resolving between the optimistic write and the settle overwrites the optimistic row with stale data. Subsequent refetches from `onSettled` pick up the canonical row.
- Snapshot wide, restore wide: `ctx.snapshot` is the entire `InfiniteData`, not just page 0, because invalidation may have reshaped `data.pages` between the optimistic write and the error.
- `onSettled` (always fires) owns `invalidateQueries` — success refetches the canonical row, failure refetches the genuine post-rollback state. Skipping it leaves the optimistic row in the cache until the next poll, a subtle but real bug.
- The two-system invalidation is surfaced once, not papered over: `updateTag(invoiceCommentsTag(invoiceId))` invalidates the Server Component cache, `invalidateQueries` invalidates the TanStack cache. Both layers hold the data; both must invalidate.
- The `optimistic-` prefix is the dedup anchor; the lesson keeps it a simple prefix, naming that production might key on a true UUID and compare. Resist fanning the optimistic write out to other queries — name the capability, defer to a future need.

### Moment of truth

Run the lesson's test suite (the command and expected pass output ship with the starter). Run each deliberate-failure demo below as a single named change, then revert before the next — flipping several at once muddies the diagnosis. Then confirm by hand:

- [ ] Type a comment and submit; the row appears at the top synchronously (devtools shows the `optimistic-...` id inside `data.pages[0].comments`). After the action settles, `invalidateQueries` refetches and the id flips to the server-generated store id; the form clears; the comment audit tail shows the new `comment.added` row.
- [ ] Click "Force 500 on next POST" in the inspector, then submit; the optimistic row appears briefly, then `onError` restores the snapshot and an inline banner shows the error. The audit tail is unchanged (the action returned before any insert or audit write); devtools shows the pre-mutation snapshot fully restored.
- [ ] Read the action's source for `await updateTag(invoiceCommentsTag(input.invoiceId))` and the mutation's `onSettled` for `invalidateQueries`. Delete the `updateTag` call and confirm the Server-Component thread stays stale until the next visit while the client thread still updates; restore it. Delete `invalidateQueries` and confirm the optimistic row lingers (with its `optimistic-...` id) until the next poll; restore it.
- [ ] With a debug delay on the action in flight, fire the inspector's "Insert coworker comment"; on settle the refetch returns both rows from the store and no duplicate is visible — the optimistic placeholder is replaced by the canonical server row.
- [ ] Grep for raw `['comments', ...]` arrays outside `src/lib/comments/keys.ts`; zero hits — every hook and cache call imports `commentKeys`.

After this lesson the full project is done: re-run the project goals end to end and confirm each holds. Forward pointer, not an implementation step here — production should clear the client cache at the tenancy boundary by wiring `queryClient.clear()` (or `removeQueries` per org-scoped subtree) into the identity/active-org-switch action (the inspector's `switchIdentity` is this project's stand-in); the inspector's "Clear client cache" button demonstrates the manual call via the `?clearCache=1` flag and `ClearCacheOnFlag`, and lesson 3 of chapter 076's framing names this discipline. Name where it goes; do not reach into that action here.

Where this leads:

- Chapter 078 — Zustand for genuinely shared client state; the chapter project layers a wizard's per-step shared state over four routes and runs the threshold question against a different surface.
- Unit chapter 089 — component tests for the comment thread; the optimistic-add-and-rollback assertions are mechanical against a mocked `addCommentAction`.
- Unit chapter 081 — security baseline; the route handler's tenancy check is one of the audited findings (`authedRoute` on every read seam, not just write seams).
- Unit chapter 070 — notifications dispatcher; a future "@-mention" feature on the thread would route through the dispatcher rather than the polling loop.
- Unit chapter 092 — structured logs; the `comment.added` audit-log entry is the operator-truth side, the in-app notification (Unit 13) the user-facing side — the same notifiable-vs-logged distinction from chapter 070.

---

> **Note (Server Component cache invalidation in Next.js 16):** in-app mutations whose author is waiting on the result use `updateTag(tag)` for read-your-writes (the form chapter 076 lesson 4 standardized on, and the form this project's `addCommentAction` uses). `revalidateTag` is the eventual-consistency variant reserved for webhooks/background jobs; when reached for, its single-argument form `revalidateTag(tag)` is deprecated — pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
