# Chapter 077 — Lesson 3 outline

## Lesson title

**Full title:** Infinite scroll, polling, and the route handler
**Sidebar title:** Infinite scroll and polling

The chapter-outline title fits — it names the three things shipped (the public read seam, cursor paging, the poll). Keep it.

## Lesson type

`Implementation`

The student builds the read side against a generated test file, then runs it. The test-coder runs for this lesson.

## Lesson framing

The student installs the senior discipline that **client reads travel through a public HTTP seam, not the store**: a route handler (`GET /api/invoices/[id]/comments`) wrapped in `authedRoute`, fetched by a client-only module that can never reach `server-only` code, while the Server Component's prefetch keeps reading the store in-process. On top of that seam they wire `useInfiniteQuery` for cursor paging with a bounded retained-page cap and a 10-second poll that pauses when the tab is hidden. The payoff: the thread goes live — "Load older" pages in earlier comments through a real endpoint and a coworker's comment surfaces on its own within the poll window — and the student can articulate why the read path is split in two and why polling (not WebSockets) is the threshold-met choice here.

## Codebase state

### Entry

Lesson 2 is done. The provider is wired (`QueryClientProvider` + gated devtools + `ClearCacheOnFlag`), `getQueryClient()` branches per-request server / singleton client, `commentKeys` exists, and the invoice detail page prefetches the first page via the server-only `listCommentsPage`, dehydrates, and wraps the thread in `<HydrationBoundary>`. The seeded first page paints with no client loading state. Still stubbed: `fetcher.ts` throws `'TODO(L3) — client fetcher not wired yet'`; `route.ts` returns a static empty response; `comment-thread.tsx` is the minimal read shape (renders hydrated pages, no `getNextPageParam`, no poll, no "Load older"). Posting is still inert (`actions.ts` stub, `comment-form.tsx` unwired) — that is lesson 4.

### Exit

The client fetcher is implemented (builds the URL with optional `cursor`, fetches `same-origin`, throws on `!res.ok`, parses `commentsPageSchema.parse(json.data)`, no `server-only` import). The route handler is `authedRoute('member', commentsQuerySchema, fn)` calling `listCommentsPage({ orgId: ctx.orgId, invoiceId: ctx.params.id, cursor, pageSize: 20 })` and returning `{ data }`. `comment-thread.tsx` is the full read shape: `useInfiniteQuery` with `getNextPageParam` / `getPreviousPageParam`, `initialPageParam: null`, `refetchInterval: 10_000`, `refetchIntervalInBackground: false`, `maxPages: 10`; a "Load older" button (`data-testid="load-older"`); a poll indicator distinct from the per-page spinner; an error state (`data-testid="thread-error"`). "Load older" and the poll travel as visible `GET` requests; the first-paint data does not. Writing is still inert — lesson 4.

## Lesson sections

Implementation type. Section order per the contract: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Intro (Goal + Finished result, no header)

One sentence in user terms: scroll to the bottom and a "Load older" button pages in earlier comments; a coworker's comment shows up on its own within ten seconds. Then a one-paragraph description of the finished result — seeded first page still paints instantly, "Load older" appends earlier pages through a real HTTP endpoint, a background poll refreshes the head every ten seconds, polling stops while the tab is hidden. No screenshot required (the visible change is behavioral, hard to capture in a still); a one-line note that the network tab is the surface where the seam is observable.

### Your mission

Prose paragraph weaving the brief, no subsection headers, **no implementation hints**. Cover as coherent prose:

- **Feature** (user terms): the read side comes alive — "Load older" pages earlier comments in, and the thread polls so a coworker's comment arrives on its own within ten seconds.
- **Constraints** (the senior decisions that shape the solution): client reads travel through a *public* route handler so the same data is reachable by a future mobile/third-party client; the client fetcher must never import the store, `getSession`, or `queries.ts` — any transitive `server-only` reach fails `next build` from a Client Component (in a real Postgres app it would also bundle the DB driver into the browser). The handler is `authedRoute`-wrapped so the tenancy boundary holds at the read seam exactly as at the write seam. Both handler and fetcher parse through the *shared* Zod schema so response drift fails loudly. Retained pages cap at ten (chat-style threads bound memory, unlike feed-style read-once surfaces). Polling is `refetchInterval: 10_000` + `refetchIntervalInBackground: false` so the browser pauses when the tab is hidden; ten seconds is deliberate — faster floods the pool and burns mobile battery, slower feels stale. "Load older" is an explicit button, not an `IntersectionObserver` auto-load (right for feeds, wrong for a thread a user might scroll past by accident). Surface poll-in-flight state with an `isFetching` chip distinct from the per-page spinner (the `isPending`-vs-`isFetching` distinction).
- **Out of scope** (one line): posting stays unwired this lesson — read-only. Live updates are polling, not WebSockets or SSE (out of scope for the course; polling is the threshold-met case).

Then the **Functional requirements** as a numbered list, the only list in the section, each phrased as a verifiable outcome (not a file/export), tagged `[tested]` / `[untested]`. Render with `Checklist` / `ChecklistItem` carrying the `tested`/`untested` chip:

1. Clicking "Load older" appends the next earlier page below the existing rows; the already-loaded head stays in place with no refetch or flicker. `[tested]`
2. Repeated "Load older" clicks keep appending until the thread runs out, at which point the control shows an end-of-thread state. `[tested]`
3. Retained pages stay capped at ten so deep scroll-back does not grow memory without bound. `[tested]`
4. A comment inserted from another session (inspector "Insert coworker comment") appears at the top of the open thread within ten seconds, no manual refresh. `[tested]`
5. Switching to another tab pauses the polling network traffic; switching back resumes it within ten seconds. `[untested]` — `document.hidden` / focus behavior is not deterministically assertable in the runner; verified by hand.
6. "Load older" and the poll both travel as `GET /api/invoices/[id]/comments` requests; the first-paint data does not. `[tested]`
7. A read request for an invoice in another org is rejected before any data is returned (empty page for cross-org; 403 Problem Details for sub-`member`). `[tested]`
8. A drifted response (an unexpected field) surfaces as a visible error state in the thread rather than rendering silently. `[tested]`

Note for the test-coder: assertions target observable behavior (rendered rows, the error state, the `GET` request shape, the cap on `data.pages.length`, cross-org empty page), not file paths or imports. The `[untested]` background-pause item is left to the manual checklist.

### Coding time

One line directing the student to implement against the brief and the tests, then read the walkthrough. The writer wraps the solution in `<details>` (collapsed). Organize as it appears in the repo. Reference implementation, three files:

- **`src/lib/comments/fetcher.ts`** — the client-only fetcher. Build the URL with `new URL(\`/api/invoices/${invoiceId}/comments\`, window.location.origin)`, set `cursor` as an optional search param, `fetch` with `credentials: 'same-origin'`, throw on `!res.ok` (so `useInfiniteQuery` surfaces the error) with a message carrying the status, validate with `commentsPageSchema.parse(json.data)` (the `{ data }` envelope from chapter 046). Rationale callout: this module branches on nothing server-ish and imports no `server-only` code — that is the load-bearing constraint, not an accident. Use `Code` (single focused block).

- **`src/app/api/invoices/[id]/comments/route.ts`** — `export const GET = authedRoute('member', commentsQuerySchema, (query, ctx) => { ... })`, positional args. Inside: `listCommentsPage({ orgId: ctx.orgId, invoiceId: ctx.params.id, cursor: query.cursor ?? null, pageSize: 20 })`, return `Response.json({ data: commentsPageSchema.parse(page) })`. Rationale (one-two sentences): `authedRoute` resolves the session and gates `roleAtLeast` before the read; scoping to `ctx.orgId` means a cross-org `invoiceId` returns an empty page and a sub-`member` role gets a 403 Problem Details — defense in depth alongside the data and cache-tag layers. Link to chapter 046 (route handlers / `authedRoute` / Problem Details) and chapter 059 rather than re-explaining. Use `Code`.

- **`src/app/(app)/invoices/[id]/comment-thread.tsx`** (full read shape) — the central file; use `AnnotatedCode` to step the student through the four load-bearing parts (the `useInfiniteQuery` config, the newest-first render, the "Load older" button, the poll indicator):
  - `useInfiniteQuery({ queryKey: commentKeys.lists(invoiceId), queryFn: ({ pageParam }) => fetchCommentsPage({ invoiceId, cursor: pageParam }), initialPageParam: null as string | null, getNextPageParam: (last) => last.nextCursor ?? undefined, getPreviousPageParam: (first) => first.prevCursor ?? undefined, refetchInterval: 10_000, refetchIntervalInBackground: false, maxPages: 10 })`. Callouts: `initialPageParam: null` must match the lesson-2 prefetch exactly or the first render fetches cold despite the hydration boundary; `getPreviousPageParam` is mandatory whenever `maxPages` is set (chapter 076 lesson 2) so a page dropped by the cap re-fetches on scroll-back.
  - Render `data?.pages.flatMap(p => p.comments)` newest-first (the store returns descending; the component renders top-down).
  - "Load older" button: `<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>`, "End of thread" when `hasNextPage` is false, a small spinner when `isFetchingNextPage`. `data-testid="load-older"`.
  - An `isFetching` indicator (subtle dot / "Updating…" chip) at the top, distinct from the per-page spinner. The thread renders the error state via `data-testid="thread-error"` when the query errors.

  Decision rationale + `[untested]` coverage (prose after the blocks):
  - The two-read-paths split is load-bearing: server prefetch reads the store in-process (zero HTTP hop), client reads go through the public seam. Unifying them drags `server-only` into the client bundle and erases the HTTP contract a future client depends on.
  - `maxPages: 10` caps retained pages for a chat-style thread; an unbounded `useInfiniteQuery` accumulates pages until the tab closes. Feed-style read-once surfaces leave it unbounded.
  - `refetchIntervalInBackground: false` lets the framework's `document.hidden` check pause polling when the tab is hidden; the inspector's "Open thread with polling OFF" (`?poll=off`) link is the manual-demo entry point.
  - The client-side `commentsPageSchema.parse` is the chapter 042 / 046 contract enforcement; the schema is imported by handler, fetcher, and (next lesson) action, so drift fails loudly in every context.

  Reference the `data-testid` set so the test-coder and student agree on selectors: `poll-indicator`, `comment-thread`, `comment-row` (with `data-comment-id`), `load-older`, `thread-error`.

  No external resources here unless the resourcer adds them (appended after the `<details>`, no header).

### Moment of truth

The test command and expected pass output, then a by-hand `Checklist` for the requirements the tests don't cover.

- Command: `pnpm test:lesson 3`. Expected: the lesson-3 suite passes (all green, pass summary line). Note the exact pass output ships with the starter.
- Manual checklist (`Checklist` / `ChecklistItem`), mirroring the chapter outline's Moment of truth:
  - Open a focal invoice; first paint shows 20 seeded comments instantly. Click "Load older" — network tab shows `GET /api/invoices/[id]/comments?cursor=...`, the response renders below the head, the head stays put; devtools shows `data.pages.length` growing.
  - From a fresh load, click past page 10 and confirm `data.pages.length` caps at 10 (oldest retained page drops), head page unchanged. (240 seeded comments = 12 pages at `pageSize: 20`; "End of thread" is reachable only after the cap drops earlier pages.)
  - Keep the page open; from the inspector (another tab) click "Insert coworker comment" — within 10 seconds a `GET` fires, the new row appears at the top, the comment audit tail shows the insert, no manual refresh.
  - Switch to another tab for 30 seconds — no `GET .../comments` requests fire; switch back, a poll fires within 10 seconds. (This is the `[untested]` requirement 5.)
  - In devtools, craft `fetch('/api/invoices/<a-globex-invoice-id>/comments')` while acting as an acme user — the handler scopes to the acting org and returns an empty page (no foreign rows leak). The `roleAtLeast('member')` gate runs first; all four seeded identities pass, but the 403 Problem-Details branch is the same `authedRoute` enforcement that fires for a sub-`member` caller.
  - Temporarily add a phantom field to the handler's response — `strictObject` rejects it, the client surfaces `data-testid="thread-error"`, reverting recovers on the next poll.

## Code sample handling

- `fetcher.ts` and `route.ts`: `Code` — each is a single focused block, the student reads top to bottom.
- `comment-thread.tsx`: `AnnotatedCode` — one complex block where attention must be directed to four distinct parts (query config, render, "Load older", poll chip) in sequence.
- No `CodeVariants` (no before/after worth tabbing), no `CodeTooltips` (types are explicit, not inferred-and-surprising), no `FileTree` (lesson 1 owns the starter tour).

## Diagram

None. The two-read-paths split and the polling cadence are carried fully by prose plus the network-tab manual checks; lesson 1's Architecture section already gives the structural picture. Adding a diagram here would duplicate it.

## Scope

- The optimistic write path — `addCommentAction`, `useMutation`, `onMutate`/`onError`/`onSettled`, two-system invalidation — is **lesson 4** of this chapter. The form stays unwired here.
- The provider, per-request `getQueryClient()`, `commentKeys`, prefetch, and `<HydrationBoundary>` were installed in **lesson 2**; this lesson reuses them, does not re-derive them.
- `useInfiniteQuery` / `getNextPageParam` / `maxPages` / `refetchInterval` mechanics and the `isPending`-vs-`isFetching` distinction are taught in **chapter 076 lesson 2**; link, do not re-teach.
- Route-handler mechanics, the `{ data }` envelope, and RFC 9457 Problem Details are **chapter 046**; `authedRoute` tenancy/role gating is **chapter 059**. Link, do not re-teach.
- WebSockets / Server-Sent Events for live updates are out of scope for the course entirely; polling is the threshold-met choice and the only live-update mechanism taught.
