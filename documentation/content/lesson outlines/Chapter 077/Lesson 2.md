# Chapter 077 — Lesson 2 outline

## Lesson title

Chapter-outline title fits: **Provider, per-request factory, and the SSR-hydrated first page**. Keep it.
Sidebar (short): **Provider and SSR hydration**.

## Lesson type

`Implementation` — the test-coder runs for this lesson; the writer renders the Implementation section list (Goal + Finished result / Your mission / Coding time / Moment of truth).

## Lesson framing

The student installs the senior way to mount TanStack Query on an App Router surface: a per-request server `QueryClient` (cross-tenant leak prevented by a `cache()`-wrapped factory branched on `typeof window`), a `<QueryClientProvider>` carrying the SaaS refetch-storm defaults, and the server→client cache bridge (prefetch on the Server Component, dehydrate, hydrate only the thread leaf). The payoff is the foundation every later lesson builds on plus one observable win — the seeded comment thread paints on first render with no skeleton, spinner, or client fetch, because the cache the server populated ships in the RSC payload.

## Codebase state

### Entry

Chapter 062 invoice surface runs on `pnpm dev` (Lesson 1 left the starter booting). The in-memory store self-seeds (240 comments on each org's focal invoice). The student work files are still stubs: `src/lib/query-client.ts` exports a bare `new QueryClient()`; `src/lib/comments/keys.ts` is an empty stub; `src/app/_components/providers.tsx` wraps children in `ThemeProvider` only; `src/app/(app)/invoices/[id]/page.tsx` renders `<CommentThread>` with no hydration; `comment-thread.tsx` shows a "Thread not wired yet" static stub. `fetcher.ts` and `actions.ts` are throwing/stub. The detail page renders, but the thread leaf is dead.

### Exit

`query-client.ts` has `makeQueryClient()` (senior defaults + dehydrate-pending override) and `getQueryClient()` (server `cache()` branch / browser singleton). `keys.ts` exports the full `commentKeys` factory. `providers.tsx` wraps the tree in `<QueryClientProvider>`, mounts prod-gated `ReactQueryDevtools` via `next/dynamic`, and renders `ClearCacheOnFlag` under `<Suspense>`. The invoice detail page prefetches the thread's first page in-process via the server-only `listCommentsPage`, dehydrates, and wraps only the thread `<section>` in `<HydrationBoundary>`. `comment-thread.tsx` is a minimal `'use client'` reader: `useInfiniteQuery` keyed on `commentKeys.lists(invoiceId)`, rendering the hydrated first page — its `queryFn` still calls the stubbed `fetchCommentsPage` but is never invoked because the hydrated data is already `success`. Still stubbed for later lessons: the route handler (L3), the real fetcher (L3), the Server Action and working form (L4). The thread is read-only; the first paint is instant.

## Lesson sections

Implementation type. Sections in order below.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: open an invoice detail page and the seeded comment thread is already there on first paint — no skeleton, no spinner, no loading flash. Then a one-paragraph description (or reuse the Lesson-1 finished-app figure cropped to the thread): the chapter 062 page renders as before, and below the line items the first 20 seeded comments appear instantly, served from a cache the Server Component populated and handed to the client. No new figure strictly required; a `Screenshot` of the instant-first-paint thread is optional.

### Your mission

Coherent prose (no subsection headers, no implementation hints), weaving:

- **Feature** (user terms): the seeded comment thread paints with data on the invoice detail page's first render, no client loading state.
- **Constraints that shape the solution** (woven, not listed): the per-request server `QueryClient` is the hard part — a module-scoped server client leaks one org's prefetched comments into the next org's render, a multi-tenant data-isolation bug, so the factory branches on `typeof window` and wraps the server path in React `cache()` while the client keeps one long-lived singleton. `'use client'` belongs at the thread leaf, not the page; the chapter 062 header/cards stay Server Components outside the hydration boundary. The prefetch and the client hook must address the cache through the exact same key (`commentKeys.lists(invoiceId)`) or hydration silently misses and the client refetches cold. Senior defaults (`staleTime`, `gcTime`, `refetchOnWindowFocus: false`) prevent refetch storms; devtools gate behind `NODE_ENV` so they tree-shake from production.
- **Out of scope** (one line): the client fetch, polling, infinite scroll, and posting — the fetcher stays a stub, the form is non-working; only the server-side prefetch path is needed to land the first paint.

Then the **Functional requirements** numbered list (the only list in the section; render as `Checklist`/`ChecklistItem` with `tested`/`untested` chips). Phrase each as an observable outcome, no file/export names:

1. Opening an invoice detail page renders the seeded thread's first page immediately on first paint — no skeleton, spinner, or fetch fired on initial render. `[tested]`
2. The dehydrated cache ships in the page's RSC payload — comment bodies are present in the raw HTML, not fetched after hydration. `[tested]`
3. Hard-refreshing reproduces the instant first paint every time, the cache rebuilt per request. `[tested]`
4. Hitting two different orgs' focal invoices in quick succession shows each org only its own comments — no rows leak from the first request into the second. `[tested]`
5. The React Query devtools are reachable in development and absent from a production build. `[untested]`
6. Nothing outside the comment-thread leaf and the provider uses TanStack Query — the chapter 062 toolbar, table, pagination, and lifecycle actions stay Server-Component / Server-Action shape. `[untested]`

Note for the test-coder: assertions target observable behavior (rendered rows present without a client fetch; per-request isolation across two orgs; RSC-payload presence of bodies) — not file paths or imports. Items 5 and 6 are verified by hand in Moment of truth (bundle inspection, grep), covered only in the reference solution.

### Coding time

One line directing the student to implement against the brief and tests, then read the reference walkthrough (writer wraps the solution in `<details>`, collapsed). Present the reference implementation organized as it appears in the repo. Use `Code` for the per-file blocks; reach for `AnnotatedCode` on `query-client.ts` (the load-bearing branch — direct focus to the `typeof window` test, the `cache(makeQueryClient)()` server return, the browser singleton, and the deliberate absence of `import 'server-only'`) and on `page.tsx` (focus the `getQueryClient()` call, the `prefetchInfiniteQuery` with the shared key + `initialPageParam`, the `dehydrate`, and the `<HydrationBoundary>` wrapping only the thread `<section>`).

Files, in repo order:

- `src/lib/query-client.ts` — `makeQueryClient()`: `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`, plus the `dehydrate.shouldDehydrateQuery` override that also ships `pending` queries. `getQueryClient()`: server returns `cache(makeQueryClient)()`, browser returns a module-scoped singleton (`browserClient ??= makeQueryClient()`). Rationale (1–2 sentences each): the `cache()`-wrapped factory scopes the instance to the React-server-render lifecycle so each request gets a fresh client; the client singleton survives across renders, which is the whole point of a cache. Comment the branch at the call site naming the cross-request-leak failure mode (from lesson 3 of chapter 076). Callout: must NOT add `import 'server-only'` — the browser branch has to ship; this file is the most important handful of lines in the project.
- `src/lib/comments/keys.ts` — the `commentKeys` factory (`all` / `lists(invoiceId)` / `detail(id)`, `as const`, method name `lists` plural). Rationale: lock the hierarchy now so later lessons share one identity; `invalidateQueries({ queryKey: commentKeys.all })` matches all lists, `commentKeys.lists(id)` one thread; `as const` keeps tuples narrow. The single source of query-key arrays (parallel to `tags.ts`, link to lesson 1 of chapter 072 rather than re-explain).
- `src/app/_components/providers.tsx` — `'use client'` already at top of the provided shell. Add `<QueryClientProvider client={getQueryClient()}>` around the existing `ThemeProvider` tree; mount `ReactQueryDevtools` via `next/dynamic` gated on `process.env.NODE_ENV !== 'production'`; render `ClearCacheOnFlag` inside `<Suspense fallback={null}>`. Callout: the `<Suspense>` is mandatory because `ClearCacheOnFlag` reads `useSearchParams()`, an uncached request-time read under `cacheComponents: true`.
- `src/app/layout.tsx` — no code change; `<Providers>` already wraps `{children}`. Documentation-only TODO marker — say so explicitly so the student doesn't hunt for a diff.
- `src/lib/comments/fetcher.ts` — stays a throwing stub this lesson; the first paint reads the store in the page, not through this client-only module. One line; wired in lesson 3.
- `src/app/(app)/invoices/[id]/page.tsx` — above the existing chapter 062 render: `const queryClient = getQueryClient()`, `await queryClient.prefetchInfiniteQuery({ queryKey: commentKeys.lists(id), queryFn: ({ pageParam }) => listCommentsPage({ orgId: session.orgId, invoiceId: id, cursor: pageParam, pageSize: 20 }), initialPageParam: null as string | null })`, then wrap the thread `<section>` in `<HydrationBoundary state={dehydrate(queryClient)}>`. Rationale: the prefetch `queryFn` calls the server-only `listCommentsPage` directly (in-process, no HTTP hop) under the same key the client hook uses; the chapter 062 header/customer/total cards stay Server Components above the boundary.
- `src/app/(app)/invoices/[id]/comment-thread.tsx` (minimal) — `'use client'`; `useInfiniteQuery` keyed on `commentKeys.lists(invoiceId)` with a `queryFn` that still calls the stubbed `fetchCommentsPage` and `initialPageParam: null`; renders `data?.pages.flatMap(p => p.comments).map(...)`. No polling, infinite scroll, or working form. Callout: the `queryFn` is never called on first render because the hydrated data is already `success`.

Decision rationale / untested-requirement coverage to fold in after the file blocks:

- `<HydrationBoundary>` need only wrap the subtree that runs the hook on those keys; wrapping the whole page works but is unnecessary — boundary discipline (push `'use client'` as deep as it goes), link to lesson 2 of chapter 030.
- `staleTime: 60_000` is the SaaS default that prevents 2022-era refetch-on-every-mount-and-focus storms; lesson 3's `refetchInterval` overrides cadence per-query and works alongside `staleTime`, not against it.
- `refetchOnWindowFocus: false` is the senior default for an authenticated SaaS surface; focus is not a meaningful event for an invoice thread (live-data tools flip it on per-query).
- The `dehydrate.shouldDehydrateQuery` override shipping `pending` queries lets an in-flight prefetch stream to the client and resolve there — the standard App Router SSR-streaming setup.
- Hydration works only if the server prefetch key exactly matches the client hook key; importing `commentKeys.lists(invoiceId)` in both places is the structural enforcement, a raw array in either spot is the silent miss (covers requirement 1's failure mode).
- Requirement 6 coverage: the only TanStack hooks in the tree are in `comment-thread.tsx` and `providers.tsx`; everything else stays Server-Component / Server-Action shape.

Diagram (optional but clarifying): a horizontal `ArrowDiagram` inside a `Figure` of the SSR-hydration bridge — *Server Component prefetch (`listCommentsPage`, in-process)* → *dehydrate(queryClient)* → *`<HydrationBoundary state>` in RSC payload* → *client `useInfiniteQuery` reads hydrated cache, no fetch*. Brief only; prose carries the rest. Mermaid `flowchart LR` is the fallback. Skip if the writer judges prose sufficient.

### Moment of truth

The test command (`pnpm test:lesson 2`) and the expected pass output (ship with the starter). Then the by-hand checklist for the untested requirements — render as `Checklist`/`ChecklistItem`:

- [ ] Open a focal invoice; the first 20 seeded comments render immediately — no skeleton, no flicker. View source: a seeded comment body appears in the raw HTML (dehydrated state in the RSC payload).
- [ ] Open the React Query devtools (floating icon); the `['comments', 'list', invoiceId]` query is present with `state: 'success'`, `fetchStatus: 'idle'`, no fetch fired on first paint.
- [ ] Hard-refresh; the SSR-hydrated cache rebuilds and first paint stays instant.
- [ ] In the inspector, switch acting identity from `org-acme:*` to `org-globex:*` and immediately open `glx-0001`; it shows globex comments only, no acme rows. To see the leak the branch prevents, temporarily collapse `getQueryClient` to one module-scoped client, restart, repeat; restore the `cache()` branch and confirm it's gone.
- [ ] `pnpm build` and inspect the bundle — `@tanstack/react-query-devtools` is not in the chunks (the `next/dynamic` import is gated on `NODE_ENV`).
- [ ] Grep `useQuery`, `useMutation`, `useInfiniteQuery`, `useQueryClient`; only hits are `comment-thread.tsx` and `providers.tsx`.

## Scope

This lesson does not cover:

- The public client read seam (`GET /api/invoices/[id]/comments` route handler) and the real client fetcher — lesson 3 of chapter 077.
- `useInfiniteQuery` with working cursor paging ("Load older"), the 10-second `refetchInterval` polling, and background pause — lesson 3 of chapter 077.
- The Server Action write seam (`addCommentAction`), the cache-update optimistic add with rollback, and the two-system invalidation — lesson 4 of chapter 077.
- The TanStack Query / SSR-hydration concepts themselves (per-request `QueryClient`, `<HydrationBoundary>`, senior defaults, devtools gating) are taught in lesson 3 of chapter 076 — link, don't re-teach. This lesson applies them to the project surface.
