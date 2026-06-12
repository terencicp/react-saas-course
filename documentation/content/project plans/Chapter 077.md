# Chapter 077 — Project plan: TanStack Query on optimistic comments

## Project goals

Bolt a polling, infinite-scrolling, optimistically-added comment thread onto the Ch062 invoice detail page, with TanStack Query scoped to a single client leaf.
The student practices wiring TanStack Query into an App Router surface the senior way and cementing the five Ch076 reflexes against one runnable screen: the per-request `getQueryClient()` (the multi-tenant cache-leak trap), the SSR prefetch + `<HydrationBoundary>` bridge so the first paint carries data with no loading state, `useInfiniteQuery` with cursor paging + `maxPages` + 10s polling, the cache-update optimistic add (`cancelQueries` → snapshot → `setQueryData` → restore → invalidate), and the two-system invalidation reality (the Server Action's `updateTag` plus the client's `invalidateQueries`).
The coding develops these skills by forcing the student to address two caches through one key factory, split a read seam (route handler) from a write seam (Server Action), and reconcile an optimistic row that must land inside `data.pages[0]`.
Scope is deliberately minimal: no comment edit/delete/moderation, no @-mentions, no rich text — the thread is the smallest surface that exercises all four triggers.

## Student position

The student has finished Ch076 (TanStack Query taught end to end: the four-trigger funnel, all four primitives, provider wiring, `getQueryClient()`/`cache()`, `<HydrationBoundary>`, the dual-fetcher split, the cache-update optimistic shape, the two-system invalidation) but has **never built the full comment thread** — Ch076 deliberately staged it across lessons and left the screen incomplete. This project is the first time it assembles the whole thing.

Knows (safe to use): React 19, Next 16 App Router (Server/Client Components, Cache Components, `loading.tsx` Suspense seam), TanStack Query v5 (`useQuery`, `useMutation`, `useInfiniteQuery`, `setQueryData`/`getQueryData`/`cancelQueries`/`invalidateQueries`, `staleTime`/`gcTime`, `refetchInterval`, `maxPages`, `getPreviousPageParam`), the `commentKeys` factory shape, Zod 4, Server Actions + `useActionState`, route handlers, the `Result<T>` shape, nuqs URL state, `useOptimistic`, the Ch062 invoices surface, cache tags (`updateTag`/`revalidateTag`).

Does **not** know yet (coders must NOT use): Zustand (Ch078), real Postgres/Drizzle/Neon in this project (the carried-in Ch062 base is **in-memory**, not a DB — see Scaffolding), Better Auth / real sessions (Ch062 uses a cookie-driven dev session), Trigger.dev, WebSockets/SSE for live updates (polling is the taught form), `IntersectionObserver` auto-load (the thread uses an explicit "Load older" button), testing libraries beyond the lesson Vitest runner, observability/i18n/security-header tooling. Do not introduce a database, an ORM, an auth library, or any new third-party service.

## Scaffolding recipe

Fork the **Ch062 production-list-view solution** (`documentation/content/project code outlines/Chapter 062.md`) as the base. It is an **in-memory** app: `src/server/store.ts` (seeded `invoices`, `auditLogs`, 4 `users` across 2 orgs), `src/server/session.ts` (cookie-driven dev session: `getSession()` → `{ userId, orgId, role }`), `src/lib/authed-action.ts`, `src/lib/result.ts`. No Postgres, no Drizzle, no Better Auth, no Docker. Keep it that way.

Carry forward all Ch062 deps verbatim (next 16.2.7, react/react-dom 19.2.4, nuqs ^2.8.9, zod ^4.4.3, next-themes, radix-ui ^1.4.3, lucide-react ^1.17.0, cva, clsx, tailwind-merge, sonner, uuidv7, tw-animate-css; dev: @biomejs/biome 2.4.16, typescript ^6.0.3, tailwindcss ^4.3.0 + @tailwindcss/postcss, vitest ^4.1.8, babel-plugin-react-compiler 1.0.0, vite-tsconfig-paths, @types/*). Keep the locked `tsconfig.json`, `biome.json`, `next.config.ts` (`cacheComponents: true`, `reactCompiler: true`), `pnpm-workspace.yaml` (`allowBuilds:` map) idempotent per Toolchain constraints (see Locked decisions).

Add to `dependencies`:
- `@tanstack/react-query@^5.101.0`
- `@tanstack/react-query-devtools@^5.101.0`

`package.json` scripts must define:
- `"verify": "biome ci . && next typegen && tsc --noEmit && next build"` (carry Ch062's exact string — `next typegen` regenerates `.next/types/` before the standalone `tsc` so route-handler/`typedRoutes` types resolve; dropping it ships latent under the locked `typedRoutes: true`).
- `"test:lesson"` → node wrapper (carry Ch062's `scripts/test-lesson.mjs`) that reads the lesson number positional and runs **only** that one `lesson-verification/Lesson <Y>.ts` file via Vitest. Do **not** use a bare `vitest run` glob (pnpm forwards `<Y>` as a positional vitest OR-matches against every `Lesson *.ts`). Confirm the wrapper narrows to one file before locking. Runner is node-env (no DOM), needs no extra config, works in `start/`. No shared helpers module — each gate inlines its helpers.

**Build now (provided, fully working):**
- `src/server/store.ts` [edit] — add a mutable `invoiceComments: InvoiceComment[]` array + `pushComment(entry)` + `insertCoworkerComment(orgId, invoiceId)` (writes a row authored by the *other* seeded user in the org) + `listCommentsPage({ orgId, invoiceId, cursor, pageSize })` helper that filters by `(orgId, invoiceId)`, decodes the `(createdAt,id)` cursor, orders `createdAt desc, id desc`, takes `pageSize+1` to detect more, returns `{ comments, nextCursor, prevCursor }` (rows still carry `orgId`; `queries.ts` projects it off for the wire). **`invoiceComments` (and the existing `invoices`/`auditLogs`) must be backed by `globalThis`** (`(globalThis.__invoiceStore ??= { … }).invoiceComments`) — Ch077 adds a Route Handler read seam and a Server Action write seam, which the bundler emits in separate module graphs, so plain module-level arrays give each seam its own copy and an action's `pushComment`/`pushAudit` is invisible to the route handler's read (the post-settle refetch and the poll would never surface the write; R6/R9 fail). One `globalThis` holder makes the singleton survive the bundle split. Seed **220+ comments** on one focal invoice per org (two distinct authors) so `maxPages: 10` is reachable — at `pageSize: 20`, the 10-page cap engages only past 200 rows (see R5). Extend `reseed()` to refill comments.
- `src/server/types.ts` [edit] — add `InvoiceComment = { id; orgId; invoiceId; authorId; authorName; body; createdAt }` (all strings).
- `src/lib/comments/schema.ts` — Zod request/response schemas (the exact shapes in Locked decisions), shared by handler + fetcher + action.
- `src/lib/comments/queries.ts` — `listCommentsPage` thin wrapper over the store helper, typed to return `CommentsPage`; the server-side read used by the SSR prefetch and the route handler. **Must project each row to the wire shape — drop the server-internal `orgId` column** (`comments.map(({ orgId, ...rest }) => rest)`). The store's `InvoiceComment` carries `orgId` for tenancy filtering, but `commentSchema` is `strictObject` without it, so feeding raw store rows to `commentsPageSchema.parse(page)` throws `Unrecognized key: "orgId"`. Project here so both `.parse()` sites (handler, prefetch) match the strict schema.
- `app/inspector/page.tsx` [edit] + `app/inspector/actions.ts` [edit] — provided in full: session/org/focal-invoice switcher, "Force 500 on next POST" toggle (in-memory `Map` keyed by userId; auto-clears on first consume), "Insert coworker comment" button (calls `insertCoworkerComment`, does **not** call `updateTag` — the poll surfaces it), "Clear client cache" button (redirects with `?clearCache=1`), audit-log tail (last 20 `comment.added` rows, active org), "Toggle background polling" debug. The student writes none of the inspector.
- `src/lib/authed-route.ts` — provided: `authedRoute(role, schema, fn)` route-handler wrapper (in-memory-session shaped: `getSession()` → `roleAtLeast` gate → query Zod parse → handler; failures return Problem-Details JSON with 401/403/400/404). Mirrors `authedAction`'s pipeline for the read seam.
- `src/lib/authed-action.ts` [edit] — provided: keep Ch062's FormData `authedAction`; add `authedInputAction(role, schema, fn)` — the direct-input twin returning `(input) => Promise<Result>` (session → `roleAtLeast` → `schema.safeParse(input)` → `fn(input, ctx)`; throws become `err('internal', …)`), the shape the comment `useMutation` calls.
- `src/lib/tags.ts` — provided: `invoiceTag(id)`, `orgInvoicesTag(orgId)`, and `invoiceCommentsTag(invoiceId)` helpers (Ch062 in-memory base has no `tags.ts`; create it). Tags are plain string helpers; the in-memory app has no real Server Component cache, but `updateTag(invoiceCommentsTag(id))` is the correct call and keeps the two-system-invalidation lesson honest.
- The full Ch062 invoices surface (list, toolbar, table, pagination, edit, lifecycle actions) stays as-is and untouched.

**Leave as TODO stubs (slice-coders / start-coder own completion):**
- `src/lib/query-client.ts` — TODO(L2): `makeQueryClient()` + `getQueryClient()` with the `typeof window` branch.
- `src/lib/comments/keys.ts` — TODO(L2): `commentKeys` factory.
- `app/_components/providers.tsx` — TODO(L2): `'use client'` `Providers` wrapping `QueryClientProvider` + gated devtools + the `?clearCache=1` effect.
- `src/lib/comments/fetcher.ts` — TODO(L2): in-process branch; TODO(L3): client `fetch` branch.
- `app/api/invoices/[id]/comments/route.ts` — TODO(L3): `GET` handler.
- `src/lib/comments/actions.ts` — TODO(L4): `addCommentAction`.
- `app/(app)/invoices/[id]/page.tsx` [edit] — TODO(L2): per-request prefetch + dehydrate + `<HydrationBoundary>` wrapping the thread subtree.
- `app/layout.tsx` [edit] — TODO(L2): wrap `{children}` in `<Providers>`.
- `app/(app)/invoices/[id]/comment-thread.tsx` — TODO(L2): minimal read-only; TODO(L3): real `useInfiniteQuery`; TODO(L4): `useMutation`.
- `app/(app)/invoices/[id]/comment-form.tsx` — TODO(L4): wire submit to the post mutation.

Ship `lesson-verification/Lesson 2.ts`, `Lesson 3.ts`, `Lesson 4.ts` as `describe.todo` placeholders (the lesson-test-coder fills them).

## Slices

### Slice S1 — Provider, per-request factory, SSR-hydrated first page

Scope: mount TanStack Query the senior way and prove it by making the seeded thread paint with **no client loading state**. Server-side prefetch path only — no client fetch, no polling, no infinite scroll, no posting.

Implement:
- `src/lib/query-client.ts`: `makeQueryClient()` returns `new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false }, dehydrate: { shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending' } } })` (import `defaultShouldDehydrateQuery` from `@tanstack/react-query`; the `dehydrate` key sits **inside** `defaultOptions`, beside `queries`). `getQueryClient` branches on `typeof window === 'undefined'`: server returns `cache(makeQueryClient)()` (React per-request memo), browser returns a module singleton (`browserClient ??= makeQueryClient()`). Comment the branch with the cross-request-leak failure mode. Do **not** add `import 'server-only'` (the browser branch must ship).
- `src/lib/comments/keys.ts`: the `commentKeys` factory (exact shape in Locked decisions).
- `app/_components/providers.tsx`: `'use client'`; `Providers({ children }: { children: ReactNode })` creates the client via `getQueryClient()`, wraps `children` in `<QueryClientProvider>`, mounts devtools gated on `process.env.NODE_ENV !== 'production'` (dynamically imported via `next/dynamic` so the bundle tree-shakes), and runs the `?clearCache=1` one-shot effect (`useSearchParams` → `queryClient.clear()` once). **The `useSearchParams` reader must sit in its own child component wrapped in `<Suspense fallback={null}>`** — `useSearchParams` is an uncached request-time read, and under the locked `cacheComponents: true` an unsuspended read in `Providers` (which wraps the whole tree in `app/layout.tsx`) fails `next build` prerender with "Uncached data was accessed outside of `<Suspense>`". Extract the clear-cache effect into e.g. `<ClearCacheOnFlag />` (reads `useSearchParams` + `useQueryClient`, returns `null`) and render it inside a `<Suspense>` seam.
- `app/layout.tsx`: import `Providers`, wrap `{children}` — the only edit.
- `src/lib/comments/fetcher.ts` is the **client-safe** fetcher: HTTP branch only. It must NOT import `getSession`, the store, or `queries.ts` (all `server-only`) — `comment-thread.tsx` imports this module, so any transitive `server-only` reach fails `next build` ("'server-only' cannot be imported from a Client Component"). A `typeof window` branch with a static (or dynamic) `import` of the server modules does not help: the bundler still pulls them into the client SSR graph. In S1 the client branch is a TODO that throws; the server read is done directly in the page (next item), not through this module.
- `app/(app)/invoices/[id]/page.tsx`: above the existing Ch062 render, prefetch using the **in-process server read directly** (the page is a Server Component, so it imports the `server-only` read without the client-bundle problem): `const session = await getSession(); const queryClient = getQueryClient(); await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.lists(id), queryFn: ({ pageParam }) => listCommentsPage({ orgId: session.orgId, invoiceId: id, cursor: pageParam, pageSize: 20 }), initialPageParam: null as string | null });` then wrap **only** the thread subtree in `<HydrationBoundary state={dehydrate(queryClient)}>`. The Ch062 header/customer/lines stay outside the boundary, no `'use client'` on the page.
- `app/(app)/invoices/[id]/comment-thread.tsx` (minimal): `'use client'` reading the hydrated cache via `useInfiniteQuery({ queryKey: commentKeys.lists(invoiceId), queryFn: () => { throw new Error('client fetcher not wired yet') }, initialPageParam: null as string | null, getNextPageParam: () => undefined })`, rendering `data?.pages.flatMap(p => p.comments)` newest-first in a `data-testid="comment-thread"` container with one `data-testid="comment-row"` per row. No form, no polling. `queryFn` never fires because data is hydrated.

Exclude: client fetcher branch, route handler, `useMutation`, `comment-form.tsx`, polling, "Load older".

Contracts created: `getQueryClient`, `makeQueryClient` (`src/lib/query-client.ts`); `commentKeys` (`src/lib/comments/keys.ts`); `Providers` (`app/_components/providers.tsx`); the in-process read `listCommentsPage` (`src/lib/comments/queries.ts`, used directly by the page prefetch — the dual-fetcher split keeps the in-process read out of the client-imported `fetcher.ts`). The prefetch key and the hook key must both be `commentKeys.lists(id)` or hydration silently misses.

Screenshot: none.

### Slice S2 — Infinite scroll, polling, route handler

Scope: bring the read side alive — public route handler, client fetcher branch, `useInfiniteQuery` with cursor paging, `maxPages: 10`, 10s polling that pauses on hidden tab, explicit "Load older". This slice completes the visible thread surface end to end.

Implement:
- `src/lib/comments/fetcher.ts` (client fetcher, the only branch): build `new URL('/api/invoices/<invoiceId>/comments', window.location.origin)`, set `cursor` search param when present, `fetch(url, { credentials: 'same-origin' })`, throw on `!res.ok`, validate `commentsPageSchema.parse(json.data)`. Keep this module free of any `server-only` import (see S1).
- `app/api/invoices/[id]/comments/route.ts`: `export const GET = authedRoute('member', <cursor schema>, async (query, ctx) => ...)` (wrapper provided by scaffold) — call `listCommentsPage({ orgId: ctx.orgId, invoiceId: ctx.params.id, cursor: query.cursor ?? null, pageSize: 20 })` (the `queries.ts` wrapper that already projects off `orgId`), return `Response.json({ data: commentsPageSchema.parse(page) })`. Tenancy is enforced by reading scoped to `ctx.orgId`: a cross-org `invoiceId` simply yields an empty page (no foreign rows leak), which satisfies R3. Cursor schema `z.strictObject({ cursor: z.string().nullable().optional() })`.
- `app/(app)/invoices/[id]/comment-thread.tsx` (real read shape): `useInfiniteQuery({ queryKey: commentKeys.lists(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor ?? undefined, getPreviousPageParam: (first) => first.prevCursor ?? undefined, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. Render `data.pages.flatMap(p => p.comments)` newest-first. "Load older" button `data-testid="load-older"` at the bottom: `onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}`, shows "End of thread" when `!hasNextPage`, a spinner when `isFetchingNextPage`. An `isFetching` chip `data-testid="poll-indicator"` at top, distinct from the per-page spinner. Surface query `isError` as a visible `data-testid="thread-error"` state.

Exclude: posting, `useMutation`, `comment-form.tsx`, optimistic writes.

Contracts created: `GET /api/invoices/[id]/comments` (the public read seam, `{ data } | problem+json`); `fetchCommentsPage` (client fetcher). `initialPageParam: null` must match S1's prefetch exactly.

Screenshot: L3 — route `/invoices/<focal-id>`, desktop (1280×800) + mobile (390×844), state `settled` (first page painted, "Load older" visible).

### Slice S3 — Optimistic add and rollback with useMutation

Scope: the write seam and the cache-update optimistic add with rollback, plus the two-system invalidation. After this slice the full project is done.

Implement:
- `src/lib/comments/actions.ts`: `addCommentAction = authedInputAction('member', addCommentInput, async (input, ctx) => { ... })` (direct-input wrapper — see Locked decisions; the FormData `authedAction` is the wrong shape for `useMutation`). Inside: consume the inspector's force-500 flag for `ctx.userId` first — if set, return `{ ok: false, error: { code: 'internal', userMessage: 'Forced failure for verification' } }` and write **no** audit row. Otherwise `pushComment({ orgId: ctx.orgId, invoiceId: input.invoiceId, authorId: ctx.userId, authorName: <from store>, body: input.body })`, `pushAudit({ orgId, actorUserId: ctx.userId, action: 'comment.added', subjectId: row.id })`, then `await updateTag(invoiceCommentsTag(input.invoiceId))`, return `{ ok: true, data: { id: row.id, createdAt: row.createdAt } }`. Use `updateTag` (read-your-writes), **not** `revalidateTag(tag,'max')`.
- `src/lib/tags.ts` is provided (includes `invoiceCommentsTag`); just import it. Do not re-create it.
- `app/(app)/invoices/[id]/comment-form.tsx`: `<textarea name="body">` + submit button, child of `<CommentThread />` (shares query scope). `onSubmit` calls `mutation.mutate(body)`; `mutation.isPending` disables the button + dims the textarea (`data-testid="comment-submit"`); `onSuccess` clears the textarea; `onError` shows the message in `data-testid="post-error"` above the form.
- `useMutation` inside `comment-thread.tsx`:
  - `mutationFn: async (body) => { const r = await addCommentAction({ invoiceId, body }); if (!r.ok) throw new Error(r.error.userMessage); return r.data; }`
  - `onMutate`: `await queryClient.cancelQueries({ queryKey: commentKeys.lists(invoiceId) })`; `const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.lists(invoiceId))`; build `optimistic` with `id: \`optimistic-${crypto.randomUUID()}\``, `authorId`/`authorName` from `session` props, `createdAt: new Date().toISOString()`; `setQueryData(key, (old) => old ? { ...old, pages: [{ ...old.pages[0], comments: [optimistic, ...old.pages[0].comments] }, ...old.pages.slice(1)] } : old)`; return `{ snapshot }`.
  - `onError: (_e, _b, ctx) => { if (ctx?.snapshot) queryClient.setQueryData(commentKeys.lists(invoiceId), ctx.snapshot) }`.
  - `onSettled: () => queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })`.
  - Pass `session` ({ userId, userName }) into `<CommentThread />` from the page (Server Component reads `getSession()`).

Exclude: comment edit/delete, @-mentions, rich text, fan-out to other queries.

Contracts created: `addCommentAction` (write seam, canonical `Result`). The optimistic row carries an `optimistic-` id; `onSettled.invalidateQueries` flips it to the real id.

Screenshot: L4 — route `/invoices/<focal-id>`, desktop (1280×800), state `optimistic-row` (a freshly submitted row sitting at the top of the thread). The L1 overview figure is the finished detail page with the thread + a posted optimistic row at top; capture it here as a second desktop shot, state `settled`, since this slice completes that surface.

## Start derivation

Derive `start/` from the completed `solution/` after all slices. Keep the entire provided base (Ch062 surface, store with comments + seed, `src/lib/comments/schema.ts`, `src/lib/comments/queries.ts`, the inspector, `src/lib/authed-route.ts`, `src/lib/authed-action.ts` with `authedInputAction`, `src/lib/tags.ts`) intact. Replace the bodies of the **student-owned** files with stubs that typecheck, render a clear empty/placeholder state, and carry a `// TODO(L<n>) — <task>` marker so `rg TODO start/` enumerates the work:

- `src/lib/query-client.ts` — `// TODO(L2) — getQueryClient() with the typeof window branch + cache()`; stub: `export const getQueryClient = () => { throw new Error('TODO(L2)') }` (kept off the SSR path by the page stub) or a trivial single `new QueryClient()` that the lesson replaces.
- `src/lib/comments/keys.ts` — `// TODO(L2) — commentKeys factory`; stub exports `commentKeys = { all: ['comments'] as const, lists: (_: string) => ['comments'] as const, detail: (_: string) => ['comments'] as const }` (typechecks, wrong shape the lesson fixes).
- `app/_components/providers.tsx` — `// TODO(L2) — wrap QueryClientProvider + gated devtools`; stub returns `{children}` unwrapped.
- `src/lib/comments/fetcher.ts` — `// TODO(L2) — in-process branch`, `// TODO(L3) — client fetch branch`; stub throws.
- `app/api/invoices/[id]/comments/route.ts` — `// TODO(L3) — GET handler`; stub `export const GET = () => Response.json({ data: { comments: [], nextCursor: null, prevCursor: null } })`.
- `src/lib/comments/actions.ts` — `// TODO(L4) — addCommentAction`; stub `addCommentAction = authedInputAction('member', addCommentInput, async () => ({ ok: false as const, error: { code: 'internal', userMessage: 'Not implemented' } }))` (the direct-input wrapper, not the FormData `authedAction`).
- `app/(app)/invoices/[id]/page.tsx` — `// TODO(L2) — prefetch + dehydrate + HydrationBoundary`; stub renders the Ch062 detail page with `<CommentThread />` mounted but no prefetch/boundary.
- `app/layout.tsx` — `// TODO(L2) — wrap children in <Providers>`; stub renders `{children}` (Providers stub is a pass-through anyway).
- `app/(app)/invoices/[id]/comment-thread.tsx` — `// TODO(L2/L3/L4)` markers; stub renders an empty `data-testid="comment-thread"` with a "Thread not wired yet" note.
- `app/(app)/invoices/[id]/comment-form.tsx` — `// TODO(L4) — wire submit to the post mutation`; stub renders a disabled textarea + button.

Remove `lesson-verification/` from `start/`. Exclude `lesson-verification/` from the `start/` tsconfig if any test forward-references student-derived types (per the start-verify constraint).

## Locked decisions

- **In-memory base, no DB/auth/Docker.** The carried-in Ch062 solution is in-memory (`src/server/store.ts` + cookie session). Do not add Postgres, Drizzle, `tenantDb`, Better Auth, `db.transaction`, or any new service. Comments live in the store; the action `pushComment` + `pushAudit`; the read seam reads the store in-process. The outline's Drizzle/Better Auth carry-in describes an idealized lineage the real base does not have — follow the real base.
- **Providers path:** `app/_components/providers.tsx`, component `Providers` (Ch076 L3 continuity note supersedes the outline's `src/lib/query/provider.tsx`; Code conventions agree). One Provider, mounted once in `app/layout.tsx`.
- **Query-client path:** `src/lib/query-client.ts` (Ch076 L3 shipped path), single `getQueryClient` helper, `typeof window` branch is load-bearing, **no** `import 'server-only'`.
- **Keys path:** `src/lib/comments/keys.ts` (Ch076 shipped path; co-located with the comments feature). Factory shape exactly: `commentKeys = { all: ['comments'] as const, lists: (invoiceId: string) => [...commentKeys.all, 'list', invoiceId] as const, detail: (id: string) => [...commentKeys.all, 'detail', id] as const }`. Ordering `['comments','list',invoiceId]`. Raw key arrays forbidden anywhere outside this file.
- **`getNextPageParam` returns `last.nextCursor ?? undefined`; `getPreviousPageParam` returns `first.prevCursor ?? undefined`** (both mandatory because `maxPages: 10` is set). The minimal S1 hook uses `getNextPageParam: () => undefined`.
- **`commentsPageSchema` carries `prevCursor`** (required, not optional) because `maxPages` demands a backward cursor. Shapes:
  - `commentSchema = z.strictObject({ id: z.string().min(1), invoiceId: z.string().min(1), authorId: z.string().min(1), authorName: z.string(), body: z.string(), createdAt: z.iso.datetime() })`
  - `commentsPageSchema = z.strictObject({ comments: z.array(commentSchema), nextCursor: z.string().nullable(), prevCursor: z.string().nullable() })`
  - `addCommentInput = z.strictObject({ invoiceId: z.string().min(1), body: z.string().min(1).max(2000) })`
  - **Id fields are `z.string().min(1)`, NOT `z.uuid()`.** The carried-in Ch062 in-memory store seeds non-UUID ids (`inv-0001`, `org-acme`, `user-acme-admin`) and the optimistic row carries an `optimistic-<uuid>` id — `z.uuid()` rejects all of these, so `commentsPageSchema.parse(page)` (route handler + SSR prefetch) and `addCommentInput.parse({ invoiceId })` (the mutation) throw at runtime. Same pattern as the Better Auth plugin-id constraint in Toolchain constraints. Use `z.iso.datetime()` for `createdAt`; never the deprecated `z.string().datetime()` chain.
- **Server-Action invalidation uses `updateTag(invoiceCommentsTag(invoiceId))`** (read-your-writes, in-app form). `revalidateTag(tag,'max')` is reserved for webhooks/jobs and is not used here. `updateTag` cannot refresh a `useQuery`; the client must also `invalidateQueries`.
- **Cache-update optimistic step order is mandatory:** `cancelQueries` → `getQueryData` snapshot → `setQueryData` page-zero prepend (return context) → `onError` restore → `onSettled` invalidate. Snapshot/restore the whole query data, not just page 0.
- **`useMutation` for the post, not `<form action>`+`useActionState`** — TanStack owns the read side, so the write composes through `useMutation`'s `onMutate`/`onError`/`onSettled`.
- **`addCommentAction` is a direct-input Server Action**, callable as `addCommentAction(input: { invoiceId, body })` and returning `Promise<Result>`. Ch062's `authedAction(role, schema, fn)` returns a **FormData-shaped** `(prev, formData) => Promise<Result>` for `useActionState` — that signature cannot be `mutate`d with a plain object. Provide a sibling direct-input wrapper (e.g. `authedInputAction(role, schema, fn)` in `src/lib/authed-action.ts`, or a `'use server'` plain async function doing session → `roleAtLeast` → `schema.safeParse(input)` → `fn`) and use it here. Do not reuse the FormData wrapper for the mutation path. The route handler's `authedRoute` is separate again.
- **`refetchInterval: 10_000` + `refetchIntervalInBackground: false`** (do not lower; do not add a redundant background line beyond the explicit `false`). `maxPages: 10`.
- **TanStack scoped to the `<CommentThread />` leaf only.** Nothing else on the invoice page uses TanStack; the page, header, customer card, line items stay Server Components. `'use client'` lives only in `providers.tsx`, `comment-thread.tsx`, `comment-form.tsx`.
- **Devtools** dynamically imported (`next/dynamic`) behind `process.env.NODE_ENV !== 'production'` (gate alone still ships the bundle).
- **`shouldDehydrateQuery` extended with `status === 'pending'`** set under `defaultOptions.dehydrate` in `makeQueryClient`, composed with `defaultShouldDehydrateQuery` (required for `<HydrationBoundary>` + streaming).
- **Action name `addCommentAction`** (kept from Ch076 lessons/continuity; the `Action` suffix disambiguates from the read seam). Audit action string `comment.added`.
- **Stable selectors (data-testid):** `comment-thread` (the single list container — must resolve to ONE element, never split per page), `comment-row` (per row), `load-older`, `poll-indicator`, `thread-error`, `comment-submit`, `post-error`. The `<HydrationBoundary>` wraps the thread subtree as a single slot — it must resolve to one element, not flatten into siblings.
- **Toolchain (from constraints, carried from Ch062, keep idempotent):** `tsconfig.json` — `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, `include` has both `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"`, no `baseUrl` (TS6 hard error; `"paths": { "@/*": ["./src/*"] }` only), strict + `noUncheckedIndexedAccess`. `biome.json` — `quoteStyle: 'single'`, exclude `next-env.d.ts` via `"files": { "includes": ["**", "!next-env.d.ts"] }`, `css.parser.tailwindDirectives: true`, folder ignores without trailing `/**`. `next.config.ts` — `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true`, `turbopack: { root: __dirname }` (carried verbatim from Ch062). `typedRoutes` is live: any new dynamic-href `<Link>`/`router.push` must cast per the Toolchain constraint, and `verify` runs `next typegen` before `tsc` so route types resolve — the comment thread itself uses `new URL(...)`/`fetch`, not typed Link hrefs, so it is unaffected. `babel-plugin-react-compiler@1.0.0` devDep. `pnpm-workspace.yaml` with `allowBuilds:\n  sharp: true` in both `solution/` and `start/`.

## File tree

```
solution/
├── package.json                                  [edited by: scaffold — add TanStack deps]
├── pnpm-workspace.yaml                            [created by: scaffold]
├── tsconfig.json / biome.json / next.config.ts    [created by: scaffold]
├── scripts/test-lesson.mjs                        [created by: scaffold]
├── lesson-verification/
│   ├── Lesson 2.ts                                [created by: scaffold (todo); filled by lesson-test-coder]
│   ├── Lesson 3.ts                                [created by: scaffold (todo)]
│   └── Lesson 4.ts                                [created by: scaffold (todo)]
└── src/
    ├── app/
    │   ├── layout.tsx                             [edited by: S1 — wrap in <Providers>]
    │   ├── page.tsx                               [scaffold]
    │   ├── globals.css                            [scaffold]
    │   ├── _components/
    │   │   ├── providers.tsx                      [created by: S1]
    │   │   └── submit-button.tsx                  [scaffold]
    │   ├── api/invoices/[id]/comments/
    │   │   └── route.ts                           [created by: S2]
    │   ├── (app)/invoices/
    │   │   ├── page.tsx                           [scaffold]            (list, untouched)
    │   │   ├── loading.tsx / toolbar / table / ...[scaffold]            (Ch062 surface)
    │   │   └── [id]/
    │   │       ├── page.tsx                       [edited by: S1 — prefetch+dehydrate+boundary]
    │   │       ├── comment-thread.tsx             [created by: S1, edited by: S2, S3]
    │   │       └── comment-form.tsx               [created by: S3]
    │   └── inspector/
    │       ├── page.tsx                           [scaffold]
    │       └── actions.ts                         [scaffold]
    ├── server/
    │   ├── store.ts                               [edited by: scaffold — comments + seed + helpers]
    │   ├── types.ts                               [edited by: scaffold — InvoiceComment]
    │   └── session.ts                             [scaffold]
    └── lib/
        ├── result.ts / utils.ts                   [scaffold]
        ├── authed-action.ts                       [edited by: scaffold — add authedInputAction]
        ├── authed-route.ts                        [created by: scaffold]
        ├── tags.ts                                [created by: scaffold — invoiceTag/orgInvoicesTag/invoiceCommentsTag]
        ├── query-client.ts                        [created by: S1]
        └── comments/
            ├── schema.ts                          [created by: scaffold]
            ├── queries.ts                         [created by: scaffold]
            ├── keys.ts                            [created by: S1]
            ├── fetcher.ts                         [created by: S1 (server branch), edited by: S2 (client branch)]
            └── actions.ts                         [created by: S3]
```

## Verification

### Static checks (reviewer runs)

1. `solution/` + `start/`: `pnpm verify` exits 0 (biome ci + next typegen + tsc --noEmit + next build).
2. `solution/`: `pnpm test:lesson 2` runs exactly one file (`lesson-verification/Lesson 2.ts`) — confirm the wrapper narrows; repeat for 3, 4.
3. `start/`: `rg "TODO\(L" start/` lists every student-owned file (query-client, keys, providers, fetcher, route, actions, page, layout, comment-thread, comment-form).
4. Feature-not-inert greps (`solution/`):
   - `rg "typeof window" solution/src/lib/query-client.ts` — the per-request branch exists (fails if the leak-trap branch was dropped).
   - `rg "cache\(makeQueryClient\)" solution/src/lib/query-client.ts` — server path is `cache()`-wrapped.
   - `rg "prefetchInfiniteQuery" "solution/src/app/(app)/invoices/[id]/page.tsx"` — SSR prefetch ships (fails if the page renders the thread without seeding the cache).
   - `rg "HydrationBoundary" "solution/src/app/(app)/invoices/[id]/page.tsx"` — boundary wraps the thread.
   - `rg "refetchInterval: 10_000" "solution/src/app/(app)/invoices/[id]/comment-thread.tsx"` and `rg "maxPages: 10"` — polling + page cap live.
   - `rg "cancelQueries" "solution/src/app/(app)/invoices/[id]/comment-thread.tsx"` — optimistic cancel exists.
   - `rg "invalidateQueries" "solution/src/app/(app)/invoices/[id]/comment-thread.tsx"` — client side of two-system invalidation.
   - `rg "updateTag\(invoiceCommentsTag" solution/src/lib/comments/actions.ts` — server side of two-system invalidation (fails if the action mutates without invalidating the Server Component cache).
   - `rg "logAudit|pushAudit" solution/src/lib/comments/actions.ts` — audit write on the happy path.
   - `rg "credentials: 'same-origin'" solution/src/lib/comments/fetcher.ts` — client fetch branch hits the route handler.
   - `rg "listCommentsPage" "solution/src/app/api/invoices/[id]/comments/route.ts"` — the GET handler actually reads a page (fails if it ships an empty/static payload).
   - `rg -n "\['comments'" solution/src/ | rg -v "src/lib/comments/keys.ts"` — zero hits (no raw key arrays outside the factory).
5. `solution/`: `rg -l "use client" solution/src/app | rg "comment-thread|comment-form|providers"` returns exactly those three authored files (TanStack scoped to the leaf); a broader grep for `useInfiniteQuery|useMutation|useQueryClient` outside `comment-thread.tsx`/`providers.tsx` returns nothing.

### Rendered checks (slice coders + inspector run against the live app)

All on the focal invoice route `/invoices/<focal-id>` of the active seeded org.

- **id** `R1-first-paint` · **slice** S1 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** settled (initial paint, no interaction) · **intent** SSR-hydrated thread paints with no client loading state · **selectors** `comment-thread`, `comment-row` · **assertion** `comment-thread` resolves to exactly one element and contains ≥1 `comment-row` on first paint with no skeleton/spinner shown; a seeded comment body string is present in the page's server-rendered HTML (view-source), not fetched after hydration.
- **id** `R2-single-slot` · **slice** S1 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** settled · **intent** the `<HydrationBoundary>` slot resolves to one element, never splitting into siblings · **selectors** `comment-thread` · **assertion** there is exactly one element with `data-testid="comment-thread"` in the document, and the Ch062 header/customer/lines sections render above it as siblings of (not inside) the thread container.
- **id** `R3-no-leak` · **slice** S1 · **route** `/invoices/<focal-id>` (org A then org B via inspector switch) · **viewport** 1280×800 · **state** settled · **intent** per-request `QueryClient` does not leak org A's prefetched comments into org B's render · **selectors** `comment-row` · **assertion** after switching session A→B in the inspector and immediately opening org B's focal invoice, every visible `comment-row` belongs to org B (its bodies match org B's seed); no org A body appears.
- **id** `R4-load-older` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** after clicking `load-older` once · **intent** "Load older" appends an earlier page through the route handler without refetching the head · **selectors** `comment-row`, `load-older` · **assertion** clicking `load-older` issues a `GET /api/invoices/<id>/comments?cursor=...` and increases the `comment-row` count (older rows appended below); the previously-top row is unchanged and stays in place.
- **id** `R5-maxpages-cap` · **slice** S2 · **state** after clicking `load-older` 10+ times · **intent** `maxPages: 10` bounds memory — the retained window caps at 10 pages, dropping the oldest as a newer one loads · **selectors** `comment-row`, `load-older` · **assertion** with 220+ seeded comments (so >10 pages of 20 exist), clicking `load-older` 11 times grows `comment-row` from 20 up to 200 then **stops at 200** (the 11th fetch drops page 1 as it appends page 11); the head row that was at the top after click 10 is no longer the very first row. Falsifiable: a missing/incorrect `maxPages` lets the count exceed 200. (Seed must exceed 200 rows on the focal invoice or the cap can never engage — the thread would hit "End of thread" first.)
- **id** `R5b-end-of-thread` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** after exhausting pages · **intent** the control shows an end state when the cursor runs out · **selectors** `load-older` · **assertion** when `hasNextPage` is false the `load-older` button renders its "End of thread" label and is `disabled`; `fetchNextPage` issues no further `GET /api/.../comments` request when clicked in that state.
- **id** `R6-poll-arrival` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** transient (within 10s after inspector "Insert coworker comment") · **intent** a coworker's comment arrives via the poll with no manual refresh · **selectors** `comment-row`, `poll-indicator` · **assertion** with the thread open, triggering the inspector's "Insert coworker comment" causes a new `comment-row` (authored by the other user) to appear at the top within 10 seconds, with no page reload; `poll-indicator` flashes during the background refetch.
- **id** `R7-poll-pause` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** tab hidden then visible · **intent** polling pauses on a hidden tab and resumes within 10s of refocus · **selectors** (network observation) · **assertion** while the tab is backgrounded for ≥20s no `GET /api/.../comments` poll fires; on refocus a poll fires within 10s.
- **id** `R8-mobile-thread` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 390×844 · **state** settled · **intent** the thread renders usably at mobile width · **selectors** `comment-thread`, `comment-row`, `load-older` · **assertion** at 390px wide the thread is a single column, `comment-row`s do not overflow horizontally, and `load-older` is visible/tappable.
- **id** `R8b-thread-error` · **slice** S2 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** read failure (force the client fetch to reject — e.g. block the `/api/.../comments` request or take the network offline before a poll) · **intent** a failed read surfaces a visible error state, not a blank/broken thread · **selectors** `thread-error`, `comment-thread` · **assertion** when the client fetcher throws (`useInfiniteQuery` `isError` true), exactly one `data-testid="thread-error"` element is shown with a message; falsifiable in that a hidden/absent `thread-error` on a forced fetch rejection fails the check.
- **id** `R9-optimistic-add` · **slice** S3 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** transient (immediately after submit, before the action resolves) · **intent** the optimistic row appears at the top synchronously · **selectors** `comment-thread`, `comment-row`, `comment-submit`, `post-error` · **assertion** typing a body and submitting inserts a new `comment-row` at the top of `comment-thread` before the server responds (its id begins `optimistic-`); the textarea clears; after settle the row's id flips to a non-optimistic id and `post-error` is absent.
- **id** `R10-rollback` · **slice** S3 · **route** `/invoices/<focal-id>` · **viewport** 1280×800 · **state** transient (after submit with inspector "Force 500 on next POST" armed) · **intent** a failed submit rolls back and surfaces an error, audit untouched · **selectors** `comment-thread`, `comment-row`, `post-error` · **assertion** with force-500 armed, submitting briefly shows the optimistic row, then removes it (the thread returns to its pre-submit row set), and `post-error` shows a message; the inspector's audit tail gains no `comment.added` row.
