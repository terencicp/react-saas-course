sources:
  76.1: When TanStack Query earns its weight
  76.2: The four primitives the project reaches for
  76.3: Wiring TanStack Query without leaking the cache across requests
  76.4: The per-invoice comment thread clears the bar
questions:
  - source: 76.1
    question: |
      A teammate wants to add TanStack Query for a "mark as favorite" star that flips instantly and snaps back on a failed request. Run the funnel: does it earn the library, and what owns it instead?
    choices:
      - text: |
          No — it's one component, one optimistic value, one rollback path, which is exactly `useOptimistic`. No separate cache is involved, so no library.
        correct: true
      - text: |
          Yes — instant-feedback-with-rollback is the optimistic-mutation trigger, which is one of the four reasons to reach for the library.
        correct: false
      - text: |
          No — but the right owner is `nuqs`, since a favorite is shareable view state that should live in the URL.
        correct: false
    why: |
      The optimistic trigger isn't "optimism" — `useOptimistic` does optimism perfectly. The trigger is optimism *into a separate cache*: the rolled-back value has to land inside a query other parts of the screen read from. A single local toggle has no such cache, so `useOptimistic` is the correct, lighter tool. A favorite is server state, not URL state, so `nuqs` is also wrong.
  - source: 76.2
    question: |
      You set `staleTime: 60_000` on a SaaS read instead of leaving the library default of `0`. What's the symptom of the default you're avoiding, and what still gets fresh data despite the longer stale time?
    choices:
      - text: |
          The default refetches on every mount and tab refocus — a "refetch storm" when the user glances away and back. Polling and explicit `invalidateQueries` still override staleness, so live data stays fresh.
        correct: true
      - text: |
          The default never refetches until the entry is garbage-collected, so data goes permanently stale; raising `staleTime` is what re-enables background refetches.
        correct: false
      - text: |
          The default disables the cache entirely, so every read hits the network; `staleTime: 60_000` is what turns caching on in the first place.
        correct: false
    why: |
      `staleTime: 0` marks data stale the instant it lands, so every remount and every window focus fires a refetch — the storm. A longer `staleTime` just serves the cache for that window; it doesn't freeze the data, because polling (`refetchInterval`) and explicit invalidation force a refetch regardless. `staleTime` controls *freshness*, not whether the cache exists (`gcTime` governs eviction).
  - source: 76.2
    question: |
      Which situations *force* the cache-update optimistic shape (`onMutate` + `setQueryData`) rather than the simpler via-variables shape? Select all that apply.
    choices:
      - text: |
          The pending comment must appear at the top of an infinite thread whose first page already lives in the cache (`data.pages[0]`).
        correct: true
      - text: |
          A second panel on the same screen reads the same query key and must also show the pending comment.
        correct: true
      - text: |
          One comment box adds a row inline and removes it on a failed POST, and nothing else on the page reads that list.
        correct: false
      - text: |
          A single "Resolve" switch on one row flips instantly and snaps back if the request fails.
        correct: false
    why: |
      The dividing line is *where the optimistic value has to live*. If anything beyond this one component's render must see it — a sibling query on the same key, or a cached `useInfiniteQuery` page that must include it — the value belongs in the cache, so you reach for cache-update. When the optimism is local to one render and one rollback path, via-variables (or `useOptimistic`) is the lighter, correct shape.
  - source: 76.2
    question: |
      In a `getNextPageParam`, what value signals "there are no more pages," and why specifically that value?
    choices:
      - text: |
          `undefined` — because `null` is a valid first cursor (`initialPageParam`), so it can't double as the stop signal; `undefined` is reserved for "done."
        correct: true
      - text: |
          `null` — returning `null` clears the cursor, which the library reads as the end of the list.
        correct: false
      - text: |
          `false` — `getNextPageParam` returns a boolean, mirroring `hasNextPage`.
        correct: false
    why: |
      `getNextPageParam` must return `undefined` to stop paging. `null` can't be the signal because it's a perfectly valid *first* cursor sitting in `initialPageParam` right above it — if `null` meant "done," a thread that starts at `null` could never load. The library reserves `undefined` for "no more pages."
  - source: 76.3
    question: |
      On your multi-tenant server, one tenant's comments render inside another tenant's page. Which line is the cause?
    choices:
      - text: |
          ```ts
          export const queryClient = new QueryClient();
          ```
        correct: true
      - text: |
          ```ts
          const getServerQueryClient = cache(makeQueryClient);
          ```
        correct: false
      - text: |
          ```ts
          if (isServer) return getServerQueryClient();
          ```
        correct: false
    why: |
      A `new QueryClient()` at module scope runs once per *process*, not once per *request*. Every tenant's render shares that one client, so rows one request prefetched are still in the cache when the next tenant renders against it — a data-isolation bug at the cache layer. The `cache()`-wrapped helper exists precisely to hand each server request its own client; wrapping `makeQueryClient` in `cache()` is the fix, not the bug.
  - source: 76.3
    question: |
      A Server Action posts a comment and calls `updateTag(invoiceTag(invoiceId))` internally, but the `useInfiniteQuery` comment thread stays stale. What's the fix?
    choices:
      - text: |
          After the action resolves, fire `queryClient.invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })` on the client — the TanStack cache is a separate cache that `updateTag` can't reach.
        correct: true
      - text: |
          Switch the action's `updateTag` to `revalidateTag(invoiceTag(invoiceId), 'max')`, which reaches both the Server Component cache and the TanStack cache.
        correct: false
      - text: |
          Add the matching `cacheTag` to the `useInfiniteQuery` config so `updateTag` can find and expire it.
        correct: false
    why: |
      `updateTag` and `revalidateTag` speak only to the Server Component cache; the browser's TanStack cache is a completely separate cache reachable only through the query client. A mutation touching data both layers hold must invalidate both — `updateTag` inside the action for the server-rendered parts, and a client-side `invalidateQueries` for the thread. Neither flavor of `revalidateTag` crosses into the TanStack cache.
  - source: 76.4
    question: |
      The comment thread clears the bar, so a teammate suggests dropping the Server Action and posting via `useMutation` + `invalidateQueries` — "one system, fewer moving parts." What's the strongest reason that's the worse design here?
    choices:
      - text: |
          It throws away the progressive-enhancement form contract, the server-side Zod validation, and the audit-log write the action already owns — work you'd rebuild by hand to dodge an `invalidateQueries` call you'd make anyway.
        correct: true
      - text: |
          `useMutation` can't call `invalidateQueries`, so the thread would never refetch after the post.
        correct: false
      - text: |
          A route-handler `POST` can't reach the database, so the comment would never persist.
        correct: false
    why: |
      The "one system" pitch loses everything the action gives for free: the form contract that submits before JS loads, Zod validation, the audit-log write where session and tenant context already live, and the canonical `Result`. You'd reimplement all of it just to avoid a single `invalidateQueries` call. The senior split holds: reads through TanStack Query, the mutation through the Server Action, and the two meet at the invalidate seam.
