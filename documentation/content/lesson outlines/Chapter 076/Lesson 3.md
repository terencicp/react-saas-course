# Lesson 3 outline — Wiring without leaking the cache across requests

- **Title (h1):** Wiring TanStack Query without leaking the cache across requests
- **Sidebar label:** Wiring without cache leaks

---

## Lesson framing

This is the **wiring/setup lesson**. Lesson 2 shipped the call-site primitives and closed with a `CommentThread` Client Component that has *no provider, no SSR prefetch, no `<HydrationBoundary>`* — it cold-fetches and flashes a skeleton on first paint. This lesson makes that component's cache real and server-fast. By the end the student can stand up TanStack Query in a Next.js 16 App Router SaaS correctly: one provider, a per-request `QueryClient` that does not leak across tenants, SSR-prefetched initial data, the senior default config, devtools, and the two-system invalidation reality at the Server-Action seam.

**The load-bearing idea — and the lesson's emotional center — is the cross-request leak.** On a single-user toy app, a module-scoped `new QueryClient()` on the server is invisible. On a multi-tenant SaaS it is a *data-isolation bug*: request B renders with request A's cached rows. This is the one mistake that turns a UI library into a security incident, so the lesson frames it in production stakes, not as a style nit. The mental model the student must leave with: **the server gets a fresh `QueryClient` per request; the browser keeps one singleton for the session; the same helper file serves both by branching on `typeof window`.** This is the *exact same per-request `cache()` discipline* the student already met for request-scoped reads (ch032 L5) — anchor on that recognition to cut cognitive load rather than presenting it as new magic.

**Two threads to keep visible the whole way:**
1. *Server Components own the first paint; TanStack owns the live cache.* The page stays a Server Component that prefetches; only the interactive leaf is `'use client'`. This was promised in L1/L2 — here it becomes literal file structure.
2. *Two caches, two invalidation surfaces.* `revalidateTag` invalidates the Server Component cache; `queryClient.invalidateQueries` invalidates the TanStack cache. After a Server Action that touches shared data, **both** fire. This is not a bug to fix; it is the price tag of bringing the library in, surfaced honestly so the student does not expect `updateTag` to refresh a `useQuery` (it can't).

**Pedagogical shape.** This is a concrete, file-by-file setup lesson — terminal command, then file shapes, then one worked path from `layout.tsx` down to the hydrated leaf. Keep prose terse and senior; the student has the primitives, they need the plumbing and the *why* behind each piece. Lead each file with the decision it encodes. Use a scrubbable diagram for the SSR-hydration data flow (the one genuinely non-obvious runtime sequence), a before/after `CodeVariants` for the leak trap (the canonical mistake → the fix), and a short ordering exercise to lock the dehydrate→hydrate sequence. Do **not** re-teach the primitives; reference L2's `CommentThread`, `commentKeys`, and `fetchComments` as already-built and complete them.

**Canonical path decision (resolves the continuity-notes conflict).** The chapter-outline draft said `src/components/providers.tsx`; Code conventions say `app/_components/providers.tsx` (stated twice) and define `_components/` as the home for non-route shared components co-located in the App Router tree. **Canonical: `src/app/_components/providers.tsx`** (written as `app/_components/providers.tsx` in prose). Use this path everywhere in this lesson; record it so lesson 4 and chapter 077 agree. The `getQueryClient()` helper is repo-wide infrastructure imported by both Server Components and the provider, so it lives in `src/lib/query-client.ts` (a pure-ish client-config module — note it is *not* `server-only`, since the browser branch must ship).

---

## Lesson sections

### Introduction (no header)

Open on the gap, concretely: "Last lesson's `CommentThread` works — and on first load it flashes a skeleton while a cold request resolves, because nothing populated the cache yet. It also has no provider, so dropped into a real app it throws before it renders. This lesson closes both gaps." State the senior question implicitly: *how do you wire TanStack Query into the App Router so the first paint is server-rendered and the server-side client never leaks one tenant's cache into another's render?* Preview the four moving parts in one sentence (provider, per-request client, SSR hydration, the two-system invalidation seam) and name that the per-request rule is the one that gates everything. Warm, brief, ~4 sentences.

### Install and the one provider

- Terminal: `pnpm add @tanstack/react-query @tanstack/react-query-devtools`. One `Code` block, bash. Match L2's pin (`^5.66.0` era; current published line is 5.101.x — the caret range covers it, no need to bump in prose). Name devtools as part of the install, not an afterthought — it is part of the daily loop, set up in the same breath as the library.
- The `<Providers>` Client Component. A `Code` block (tsx) for `app/_components/providers.tsx`: `'use client'` at top, creates/obtains a `QueryClient`, wraps `children` in `<QueryClientProvider client={...}>`. Keep it minimal here — the *how it obtains the client* is the next section's whole point, so show it calling `getQueryClient()` and forward-reference. Then a tiny `Code` block (tsx) showing `app/layout.tsx` wrapping `{children}` in `<Providers>`.
- **Watch-out, inline (not a separate section):** missing `'use client'` on the provider file is the canonical first error — `createContext is not a function` at build/render, because `QueryClientProvider` uses React context which only exists in Client Components. State it once, right where the directive appears, as the single most common setup mistake.
- **Tooltip terms:** `QueryClientProvider` (React context provider that exposes the cache to every `useQuery`/`useMutation` below it).

### The per-request QueryClient — the cross-request leak

The heart of the lesson. Build the model in stages to manage cognitive load.

- **Stage 1 — name the bug in production terms.** Lead with the failure, not the fix. `const queryClient = new QueryClient()` at module scope in (or imported by) a Server Component creates *one* client for the whole server process. Server module scope is shared across every request the process serves. So request B's render can read rows request A prefetched. Frame it explicitly: on a multi-tenant SaaS this is a *data-isolation bug* — the same class of failure as forgetting the org filter in a query, but at the cache layer. This is why the rule exists; it is not a performance tweak.
- **Stage 2 — the fix, recognized not introduced.** The browser has exactly one user, so a module singleton is *correct* there — the cache should persist across client navigations. The server needs a fresh client per request. One file resolves both by branching on `typeof window`. The server branch wraps creation in React's `cache()` so every call *within one request* returns the same instance (so a layout and a page prefetching into "the" client share it) while different requests get different instances. **Anchor hard on prior knowledge:** this is the identical request-scoped-memoization primitive from ch032 L5 (`cache()` for per-request dedupe of reads) — the student already owns the mechanism; only the thing being memoized is new.
- **The code.** `AnnotatedCode` (blue, `maxLines` ~16) for `src/lib/query-client.ts`. The block (ts):

  ```ts
  import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';
  import { cache } from 'react';

  function makeQueryClient() {
    return new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
        dehydrate: {
          shouldDehydrateQuery: (query) =>
            defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        },
      },
    });
  }

  const getServerQueryClient = cache(makeQueryClient); // fresh per request

  let browserQueryClient: QueryClient | undefined;

  export function getQueryClient() {
    if (isServer) return getServerQueryClient();
    return (browserQueryClient ??= makeQueryClient()); // one singleton for the session
  }
  ```

  Steps (one each, blue): (1) `makeQueryClient` is the single factory both branches call — config lives in one place. (2) `cache(makeQueryClient)` — request-scoped on the server; *this is the ch032 `cache()` you already know, memoizing a client instead of a read*. (3) `let browserQueryClient` + `??=` — lazy module singleton, created once on the client, persists across navigations. (4) `isServer` branch (TanStack's exported flag — clearer than hand-rolling `typeof window === 'undefined'`, mention both forms are equivalent). (5) the `shouldDehydrateQuery` line including `'pending'` — explain briefly: lets the SSR prefetch dehydrate *in-flight* queries so streaming works (v5.40+); a one-line "you'll see why under hydration" forward-reference, don't rabbit-hole.
- **The contrast, made unmissable.** `CodeVariants` (two tabs) — *Leaks* vs *Per-request*. Tab A (`del`): `export const queryClient = new QueryClient()` at module top, prose first sentence "Shared across every request — tenant A's cache renders in tenant B's request." Tab B (`ins`): the `getQueryClient()` call, prose "Fresh on the server, singleton in the browser — no cross-request bleed." This A/B is the single most important takeaway; the variant component exists to burn it in.
- **Tooltip terms:** `isServer` (TanStack's exported boolean, true during server render), `gcTime` (garbage-collect time — how long an *unused* cache entry survives before eviction, distinct from `staleTime`).

### Senior defaults at the provider

Short, decisive section — the config object the student saw in the factory, justified.

- The library ships defaults tuned for "always-live data": `staleTime: 0` (refetch on every mount and every window focus), aggressive refocus refetching. Right for a trading dashboard, wrong for a SaaS where most reads are stable for a minute. Set the SaaS-appropriate defaults once on the `QueryClient` so every query inherits them; override per-query only with a comment naming the reason (matches Code conventions exactly).
- The three that matter, each one line of *why*: `staleTime: 60_000` (no refetch storm on mount/focus inside a minute), `gcTime: 5 * 60_000` (keep unused entries ~5 min so back-navigations are instant), `refetchOnWindowFocus: false` (alt-tabbing back doesn't trigger a refetch wave — the single most surprising default for newcomers).
- **Watch-out inline:** setting `staleTime: 0` at the provider (or leaving the default) produces a refetch storm on every tab focus across the whole app — set the floor at the provider, raise freshness per-query where live data genuinely matters (e.g. the comment thread overrides with `refetchInterval`, not by dropping `staleTime`). Tie back to L2's "60s is the SaaS default."
- No diagram; this is a config-justification beat. Reuse the factory block from the prior section by reference rather than reprinting.

### SSR-hydrated initial data — server prefetch into `<HydrationBoundary>`

The other genuinely non-obvious mechanic. This is where "no skeleton on first paint" comes from.

- **The shape, stated first.** The page stays a Server Component. Inside it: get the per-request client via `getQueryClient()`, `await queryClient.prefetchInfiniteQuery({ queryKey, queryFn })` for the data the client will read, then render `<HydrationBoundary state={dehydrate(queryClient)}>` wrapping the Client Component. `dehydrate` serializes the prefetched cache into the RSC payload; `<HydrationBoundary>` rehydrates it into the *browser's* client before the leaf's `useInfiniteQuery` runs — so the hook reads a warm cache on first render, no loading state, no client round-trip. The network read happened once, on the server, inside the RSC.
- **The DiagramSequence — the dehydrate→hydrate data flow.** This is the lesson's primary diagram; the sequence-of-events is exactly the misconception surface ("doesn't the client refetch anyway?"). Use `DiagramSequence` (own card, not in `<Figure>`), ~5 steps, simple labeled boxes (a "Server" lane and a "Browser" lane with the RSC wire between). Steps:
  1. **Server render** — Server Component calls `getQueryClient()` (request-scoped instance) and `prefetchInfiniteQuery` runs `fetchComments` *in-process* (direct DB read, no HTTP). Cache fills server-side. Caption names the per-request client so it ties to the prior section.
  2. **Dehydrate** — `dehydrate(queryClient)` snapshots the cache to a plain serializable object embedded in the RSC payload.
  3. **The wire** — payload (HTML + dehydrated cache state) crosses to the browser. Caption: this is the only network trip for the first page.
  4. **Hydrate** — `<HydrationBoundary>` injects the dehydrated state into the *browser singleton* `QueryClient`.
  5. **Leaf renders warm** — `CommentThread`'s `useInfiniteQuery` mounts, finds page 1 already in cache, paints immediately — no `isPending` skeleton on initial load. Subsequent `fetchNextPage`/poll go over HTTP to the route handler.
  Pedagogical goal: make the "server fills the cache, the client *inherits* it" handoff concrete so the student trusts that the skeleton genuinely won't flash and that `useQuery` won't double-fetch what was prefetched.
  - *Optional alternative:* `RequestTrace` could show this (server-render → wire → hydrate) with the dehydrated state as a `WireProp` crossing `ok`. Prefer `DiagramSequence` here because the teaching point is the *cache-fill handoff across the two QueryClients*, which `RequestTrace`'s fixed phase engine doesn't model as cleanly. Note the choice so a downstream agent doesn't "upgrade" it to RequestTrace.
- **The code — the page.** `AnnotatedCode` (blue) for `app/(app)/invoices/[id]/page.tsx`. The block (tsx), keep ~14 lines:

  ```tsx
  import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
  import { getQueryClient } from '@/lib/query-client';
  import { fetchComments } from '@/lib/comments/fetch';
  import { commentKeys } from '@/lib/comments/keys';
  import { CommentThread } from './_components/comment-thread';

  export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const queryClient = getQueryClient();

    await queryClient.prefetchInfiniteQuery({
      queryKey: commentKeys.lists(id),
      queryFn: ({ pageParam }) => fetchComments(id, pageParam),
      initialPageParam: null,
    });

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CommentThread invoiceId={id} />
      </HydrationBoundary>
    );
  }
  ```

  Steps: (1) `getQueryClient()` returns the per-request instance — same helper, server branch. (2) `prefetchInfiniteQuery` with the *exact same `queryKey` and `queryFn`* the leaf uses — the key match is the whole contract; a mismatched key means the leaf cold-fetches anyway (forward-ref the watch-out). (3) `await params` — note Next.js 16's async `params` (already known from Unit 4; one-line reminder, don't re-teach). (4) `dehydrate(queryClient)` into `<HydrationBoundary state>`. (5) `<CommentThread>` is the only `'use client'` part — the page itself ships zero query JS for the static surrounding content.
- **The key-match watch-out, surfaced loud:** prefetch with one key but render `useQuery`/`useInfiniteQuery` with a *different* key (even a subtly different array) and you get a cold fetch on mount — the prefetch was wasted. This is *exactly why `commentKeys` exists* (L2): both call sites import the one helper, so the keys are identical by construction. Reinforces the L2 discipline at the moment it pays off.
- **Tooltip terms:** `dehydrate` (serialize a `QueryClient`'s cache into a plain object for transport), `HydrationBoundary` (Client component that injects dehydrated state into the browser's `QueryClient`), `prefetchInfiniteQuery` (fills the cache for an infinite query without rendering a hook).

### One fetcher, two call sites — the dual-fetcher split

This is the seam that makes the SSR prefetch *not* loop back over HTTP. Code-conventions calls it "the dual fetcher split."

- **The problem.** On the client, `fetchComments` does `fetch('/api/invoices/${id}/comments?...')` — correct, the route handler is the public contract (and the surface a future mobile/third-party client uses). On the server inside `prefetchInfiniteQuery`, calling `fetch()` to your *own* host is wasteful: an HTTP loopback for data the server can read directly from Drizzle in-process.
- **The senior fix — branch on `typeof window`.** `fetchComments` runs the Drizzle query directly when `isServer`/`typeof window === 'undefined'`, and `fetch`es the route handler in the browser. Both branches return the *same Zod-validated shape* (the schema from ch046 L2, shared by the route handler's response writer and this fetcher's parser). One function, two call sites, one contract — structural, not by convention.
- **The code.** `CodeVariants` (two tabs) or a single `AnnotatedCode` of `src/lib/comments/fetch.ts` — prefer `AnnotatedCode` so the *one function with the branch* reads as one unit (the point is that it's a single function). Sketch (ts):

  ```ts
  import { commentPageSchema } from './schema'; // shared with the route handler

  export async function fetchComments(invoiceId: string, cursor: string | null) {
    if (typeof window === 'undefined') {
      const page = await listInvoiceComments(invoiceId, cursor); // direct Drizzle read
      return commentPageSchema.parse(page);
    }
    const res = await fetch(`/api/invoices/${invoiceId}/comments?cursor=${cursor ?? ''}`);
    if (!res.ok) throw new Error('Failed to load comments');
    return commentPageSchema.parse(await res.json());
  }
  ```

  Steps: (1) one shared `commentPageSchema` import — typed by construction on both paths. (2) server branch: direct `listInvoiceComments` Drizzle read, no network. (3) client branch: `fetch` the route handler. (4) both `.parse()` the same schema — parse failures become `useInfiniteQuery` errors, no silent drift (L2 reflex).
- **Why this over a "fetcher param".** The chapter outline floated passing an explicit fetcher argument (more testable). The course picks the `typeof window` branch as the *taught default* because it keeps the one-function-one-contract story tight and matches Code conventions verbatim; name the fetcher-injection alternative in one sentence as the move if the team wants to unit-test the two paths in isolation. **Deliberate divergence note:** Code conventions' canonical form is the `typeof window` branch — follow it.
- **Watch-out inline:** the client must *never* be able to import the server branch's Drizzle code — the `typeof window` guard makes the DB call dead code in the browser bundle, but the import of `listInvoiceComments` (which pulls `server-only` Drizzle) would still poison the client build. The senior shape keeps the direct-read helper behind the guard *and* ensures the module's server-only imports are tree-shaken; in practice the route handler stays the client's only path to the data. (Keep this to ~2 sentences — full bundling rules are not this lesson's job; flag the hazard, point at the route handler as the safe client path.)
- **Tooltip terms:** none new; `route handler` already known (ch046).

### Devtools in the daily loop

Short, practical.

- `<ReactQueryDevtools />` is a floating panel showing every query by key, its `isStale`/`isFetching` state, last-updated time, and an "Invalidate"/"Refetch" button to test the refresh path by hand. Position it as part of the everyday loop (open it, watch the comment thread query go stale at 60s, click Invalidate to force the refetch), not a debugging-only tool.
- **Mount it gated, dynamically imported.** Inside `<Providers>`, render it only when `process.env.NODE_ENV !== 'production'`, and `dynamic`-import it so the devtools bundle tree-shakes out of production entirely (Code conventions: "dynamically imported behind `process.env.NODE_ENV !== 'production'`"). Small `Code` block (tsx) showing the `next/dynamic` (or `React.lazy` + `Suspense`) gated mount inside the provider. Keep the snippet to the gate + import; don't reprint the whole provider.
- **Watch-out inline:** a bare top-level `import { ReactQueryDevtools }` mounted unconditionally ships the panel to users in production — gate on `NODE_ENV` *and* lazy-import so it's both not-rendered and not-bundled.
- **Tooltip terms:** none new.

### Two caches, two invalidations — the Server-Action seam

The architectural-honesty section. This is where the student internalizes that bringing TanStack in adds a *second* invalidation surface that lives alongside, not instead of, the framework's.

- **The setup.** A Server Action mutates shared data — e.g. `createComment` (the full write side is lesson 4's job; here treat it as a known action returning the canonical `Result`). The action does its own `revalidateTag(invoiceTag(id), 'max')` so the **Server Component** invoice page (summary cards, server-rendered comment counts in the parent layout) re-renders. That handles *one* cache.
- **The gap.** The TanStack `useInfiniteQuery` reading the thread lives in the **browser cache** — a separate cache the server's `revalidateTag` cannot touch. So after the action's promise resolves, the Client Component calls `queryClient.invalidateQueries({ queryKey: commentKeys.lists(id) })` to mark the cached thread stale and refetch. Both fire because both layers hold the data.
- **State the rule as the price tag, not a bug.** This two-system reality is the *cost ledger* item L1 promised ("a second invalidation surface"). The senior takeaway, said plainly: `revalidateTag`/`updateTag` ↔ Server Component cache; `queryClient.invalidateQueries` ↔ TanStack cache; **a mutation touching data both layers show must invalidate both.** The canonical bug class (Code conventions): forget one side and "the list paints fresh while the detail stays stale" (or vice versa).
- **Diagram — a small two-lane figure.** A simple `<Figure>` with hand-authored HTML/CSS (two side-by-side boxes: "Server Component cache" and "TanStack client cache") and the mutation in the middle fanning an arrow to each, each arrow labeled with its invalidation call. Pedagogical goal: cement that these are *two distinct caches*, not one, and that the mutation must hit both. Keep it static and small (well under the height cap) — it's a clarifying picture, not an animation. (`ArrowDiagram` is an alternative if leader-lines read better; if used, set `expandable={false}` per its constraint.)
- **Tiny code.** A `Code` (tsx) snippet of the client-side post-action call: `await createComment(formData); queryClient.invalidateQueries({ queryKey: commentKeys.lists(id) });` — just enough to show *where* the client-side invalidation hangs (after the action resolves). Mutation internals (optimistic add) are explicitly deferred to L4 — one-line forward pointer.
- **Watch-out inline:** expecting `updateTag`/`revalidateTag` to refresh a `useQuery` — it can't; they invalidate different caches. This is the single most common mental-model error when the two systems coexist; state it as the named misconception.
- **Tooltip terms:** `revalidateTag` (Next.js cache-invalidation by tag — note the Next 16 two-arg form `revalidateTag(tag, 'max')`, the `cacheLife` profile is now required; one-line reminder since it's prerequisite but version-sensitive).

### The tenant boundary — clearing the cache on org switch

Short but non-negotiable for multi-tenant correctness; the natural capstone of the leak theme.

- **The problem.** When the user switches active org (ch056), the entire TanStack cache holds the *previous* tenant's data. The cache carries no org filter of its own — leaving it populated across a switch leaks org A's comments/lists into org B's session. Same data-isolation failure as the server-side leak, now on the client, now triggered by a user action instead of a request boundary.
- **The fix.** On `activeOrganizationId` change, call `queryClient.clear()` (nukes everything — the safe default at a tenant boundary) before navigating; `removeQueries({ queryKey })` is the surgical option when only some subtrees are org-scoped. Code conventions: "the cache cannot survive a tenant change." Small `Code` (tsx) showing the `clear()` call wired to the org-switch handler.
- Frame it as bookending the lesson: the lesson opened with the *server* leak (per-request boundary), it closes with the *client* leak (per-tenant boundary). Same principle — cache must be scoped to the tenant — two enforcement points.
- **Tooltip terms:** none new (`activeOrganizationId` known from ch056).

### Putting it together — the wiring, end to end

The synthesis section: one worked path from layout to leaf, mostly a file map plus the ordering check.

- **`<FileTree>`** showing the four files this lesson created/touched and how they relate:
  - `src/app/_components/providers.tsx` — `'use client'`, mounts `<QueryClientProvider>` + gated devtools.
  - `src/app/layout.tsx` — wraps children in `<Providers>`.
  - `src/lib/query-client.ts` — `getQueryClient()`, the per-request/singleton branch.
  - `src/lib/comments/fetch.ts` — the dual-fetcher `fetchComments`.
  - `src/app/(app)/invoices/[id]/page.tsx` — Server Component, prefetch + `<HydrationBoundary>`.
  - `src/app/(app)/invoices/[id]/_components/comment-thread.tsx` — L2's leaf, now reading a warm cache.
  Pedagogical goal: show the *boundary placement* visually — the page is a Server Component, the `'use client'` line lives only at the provider and the leaf.
- **Ordering exercise — `Sequence`.** Lock the runtime order, since the dehydrate→hydrate sequence is the lesson's trickiest mental model. Steps to order (scrambled): (1) Server Component calls `getQueryClient()`; (2) `prefetchInfiniteQuery` reads from Drizzle in-process; (3) `dehydrate(queryClient)` serializes the cache into the RSC payload; (4) payload crosses the wire to the browser; (5) `<HydrationBoundary>` injects state into the browser `QueryClient`; (6) `CommentThread`'s `useInfiniteQuery` mounts and reads page 1 from the warm cache. Grading: exact order. Goal: confirm the student can reconstruct the handoff unaided.
- **Optional MultipleChoice to test the leak model** (only if the section isn't already long): "You see one tenant's data in another tenant's render on the server. Which line is the bug?" with the module-scoped `new QueryClient()` as the correct pick and the `cache()`-wrapped helper among distractors. Reinforces the load-bearing idea. Keep at most one quick check here; the chapter quiz (L5) carries the rest.
- Close with a one-line forward pointer: the *read* side is now wired and server-fast; **lesson 4** adds the write side (the optimistic `useMutation` cache-update add) and walks the whole screen against the four-trigger funnel; **chapter 077** builds it for real.

---

## Scope

**This lesson covers:** the `<Providers>` Client Component and root-layout mount; the per-request `getQueryClient()` helper with the `cache()`/`isServer` branch and the cross-request-leak framing; the senior default config (`staleTime`/`gcTime`/`refetchOnWindowFocus`) at the provider; SSR-hydrated initial data via `prefetchInfiniteQuery` + `dehydrate` + `<HydrationBoundary>`; the dual-fetcher `typeof window` split; gated/dynamic devtools; the two-system invalidation reality at the Server-Action seam; the org-switch `queryClient.clear()` tenant-boundary reset.

**Explicitly out of scope (do not re-teach / reserve for later):**
- **The primitives themselves** — `useQuery`, `useMutation`, `useInfiniteQuery`, query keys, `staleTime` as a concept, `invalidateQueries`/`setQueryData`/`removeQueries`, `refetchInterval`, `isPending`/`isFetching` — all taught in **L2**. Reference them as known; do not redefine. `commentKeys`, `fetchComments`, and the `CommentThread` leaf are L2 artifacts — *complete* them, don't rebuild them.
- **The write side / optimistic mutation internals** — the `onMutate`/`onError`/`onSettled` cache-update updater that prepends into `data.pages[0]`, cancel-before-set, the UUID-reconciliation dedupe — **lesson 4** frames it, **chapter 077** builds it. This lesson shows only *where* the client-side `invalidateQueries` hangs after an action resolves, not the optimistic write.
- **The full worked screen end-to-end** (the four-trigger funnel applied, the route handler build, the verify recipe) — **lesson 4** and **chapter 077**.
- **Suspense mode** (`useSuspenseQuery`) and deep streaming integration with the App Router — name in one line as the alternative to the imperative `isPending` shape; the SaaS surface here uses the `isPending`/hydration shape. The `shouldDehydrateQuery: 'pending'` line enables streaming dehydration but the lesson does not build a streaming UI.
- **Server-side prefetch from inside a Server Action** — Server Actions own their own invalidation; the prefetch pattern is for initial page loads only. One-line clarification if it comes up.
- **Edge runtime / `QueryClient` on the edge** — not relevant; the client runs in Node. Do not raise.
- **Calling `useQuery` in a Server Component** — not a thing; `useQuery`/`useQueryClient` are client-only by definition. Mention only as a watch-out if a student might try `useQueryClient()` server-side.

**Prerequisites to redefine in one line each (concise, not re-taught):** React's `cache()` for per-request memoization (ch032 L5) — the anchor for the server branch; Next.js 16 async `params`/`searchParams` (Unit 4); the route handler as the public read seam (ch046); `revalidateTag`/`updateTag` and the Next 16 required `cacheLife` second arg (ch072); `activeOrganizationId` and org switching (ch056); the shared Zod response schema between route handler and client (ch046 L2).

---

## Code-conventions alignment notes (for downstream agents)

- Providers path is `app/_components/providers.tsx` (Code conventions §File layout — `_components/` private folder); **not** `src/components/providers.tsx`. This resolves the continuity-notes conflict; canonical for L4/ch077.
- `getQueryClient()` lives in `src/lib/query-client.ts`. It is **not** `server-only` (the browser branch must ship) — this is the deliberate carve-out; flag it so a reviewer doesn't "fix" it by adding `import 'server-only'`.
- `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false` — set once on the `QueryClient`, per-query overrides require a comment (Code conventions §Client server state).
- `commentKeys` shape is fixed by L2 and Code conventions: `{ all, lists(invoiceId), detail(id) }` with `as const`. Use `lists` (plural) — match L2 exactly; do not drift to `list`.
- Dual fetcher branches on `typeof window`; both branches parse the **same** Zod schema (Code conventions §dual fetcher split). The `typeof window` branch is canonical over fetcher-injection.
- Devtools: dynamically imported behind `process.env.NODE_ENV !== 'production'`.
- `revalidateTag`/`updateTag` calls use the Next 16 two-arg form (`'max'` as senior default) wherever shown.
- Filenames kebab-case; `'use client'` only on the provider and the leaf, never the page.
