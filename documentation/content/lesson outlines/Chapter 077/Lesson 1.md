# Chapter 077 — Lesson 1 outline

## Lesson title

- Page title: **Project overview** (the contract fixes this title for the first project lesson; the chapter-outline "Project Overview" only needs sentence-casing).
- Sidebar title: **Project overview**

## Lesson type

`Project overview`

## Lesson framing

The student leaves with the chapter 062 invoicing app running locally as the base they will bolt a polling, infinite-scrolling, optimistically-added comment thread onto — and with a clear mental map of the senior decision the project exists to install: TanStack Query is a power tool you scope to a single client leaf, not a page-wide default, and bringing it in means owning two caches (the Server Component cache and the TanStack cache) and two read seams (a direct in-process store read on the server, a public route handler for the client). No feature is built this lesson; the payoff is a running starter and the architecture brief that frames every build that follows.

## Lesson sections

This is a Project overview lesson. Sections follow the contract order: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No `<details>`, no exercises, no tests in this lesson.

### What we're building (intro, no header)

One paragraph: a per-invoice comment thread layered onto the chapter 062 invoice detail page. Name the three user-visible behaviors that define "done" — the seeded thread paints instantly with no loading state, a posted comment appears at the top the instant you submit (and survives once the server confirms, or rolls back with an error banner if it fails), and a coworker's comment shows up on its own within ten seconds. State plainly that TanStack Query is scoped to the thread leaf only; the rest of the page stays Server Components. End by naming that the data layer is a deterministic in-memory store (no Postgres, no Docker, no `.env`) that mirrors the SQL shapes the inspector documents in prose.

One figure: a `Screenshot` (desktop variant) of the finished invoice detail page — chapter 062 header plus customer and total cards, with the comment thread below showing a freshly-posted optimistic row at the top. Wrap in `Figure` with a one-line caption. Placeholder for the screenshot to be captured against the solution.

### What we'll practice

Bulleted list (skills, not features). Lift the four from the chapter outline, phrased as the senior capabilities being installed:

- Wiring TanStack Query into an App Router surface the senior way: a `<QueryClientProvider>` with production defaults, a per-request `QueryClient` on the server, and `'use client'` pushed to the leaf rather than the page.
- Bridging server and client caches: prefetch on a Server Component, dehydrate, hydrate the client cache so the first paint carries data with no loading state.
- Reading a paginated, polling list with `useInfiniteQuery` — cursor paging, a bounded retained-page count, and a poll cadence that pauses when the tab is hidden.
- Writing through a Server Action with the cache-update optimistic shape — snapshot, optimistic write, rollback on failure — and reconciling the two caches that now hold the same data.

### Architecture

Shape only, per the contract — a labeled list, not a diagram (the flows are linear and prose carries them; reserve the build's interactivity for the implementation lessons). Cover these five points from the chapter outline:

- The chapter 062 invoice detail page stays a Server Component; the comment thread is a single client leaf (`<CommentThread />`) at the bottom. Nothing else on the page touches TanStack Query.
- Two read paths, one wire shape, two functions: the route handler `GET /api/invoices/[id]/comments` is the public HTTP contract the **client** polls and scroll-fetches through; the Server Component's prefetch reads the store **directly** via the server-only `listCommentsPage`. Two distinct functions because the client fetcher must never import server-only code (it would fail `next build`).
- Write seam: the Server Action `addCommentAction` owns the input parse, the comment insert, the audit write, and `updateTag`. The client posts through it via `useMutation` and invalidates the TanStack cache once it resolves.
- The `QueryClient` is per-request on the server (React `cache()`) and a module singleton on the client; `commentKeys` is the only source of query-key arrays.
- An `/inspector` Server Component is the verification surface the implementation lessons drive: identity switcher plus "Force 500 on next POST", "Insert coworker comment", "Clear client cache", "Open thread with polling OFF", and a comment audit tail.

Keep this terse; do not pre-explain the optimistic shape or polling internals — those are owned by lessons 3 and 4.

### Starting file tree

Use `FileTree`. Render the student-facing tree from the chapter outline's "Starting file tree" subsection (the focus-marked version), not the full provided tree. Comment one line each only on the TODO files and the directly-touched provided files; leave the rest uncommented. Mark the seven TODO focus files: `query-client.ts`, `comments/keys.ts`, `comments/fetcher.ts`, `_components/providers.tsx`, `api/invoices/[id]/comments/route.ts`, `(app)/invoices/[id]/page.tsx`, `comment-thread.tsx`, plus `comment-form.tsx` (TODO in L4). Provided-but-touched: `schema.ts`, `queries.ts`, `force-failure.ts`, `layout.tsx` (doc-only TODO), `inspector/page.tsx`.

After the tree, one short paragraph on the directory rationale (from the chapter outline): `src/lib/comments/` is a feature-shaped directory grouping schema, keys, fetcher, queries, action, and force-failure flag so the read/write seams sit together; `getQueryClient` lives at top-level `src/lib/query-client.ts` because the factory is shared infrastructure, not comment-specific; `commentKeys` lives beside the comment feature as that feature's query-system identifiers — the parallel to `tags.ts` from lesson 1 of chapter 072.

### Roadmap

`CardGrid` with one `Card` per implementation lesson (lessons 2–4). Lift the three cards verbatim from the chapter outline's Roadmap:

- **Lesson 2 — Provider, per-request factory, and the SSR-hydrated first page** — wires the provider, keys, per-request factory, and the prefetch-plus-hydration bridge so the seeded thread paints with no client loading state.
- **Lesson 3 — Infinite scroll, polling, and the route handler** — adds the public read seam and the leaf's `useInfiniteQuery` so "Load older" pages in and a coworker's comment arrives within the poll window.
- **Lesson 4 — Optimistic add and rollback with useMutation** — adds the Server Action write seam and the optimistic post (instant row, rollback on failure, two-system invalidation), then verifies the full flow.

### Setup

`Steps` component. Lead with the repo-clone step the contract mandates, then install and dev. There are no env vars — state explicitly that there is no `.env`, no Postgres, no Docker, and that the store self-seeds deterministically on first import.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 077/start/`.
2. Install dependencies — `pnpm install`. Note `@tanstack/react-query` and `@tanstack/react-query-devtools` already ship in the starter's `package.json`.
3. Start the dev server — `pnpm dev`.

Before the steps (or as a short lead-in), one or two sentences of setup context from the chapter outline: the starter is the chapter 062 codebase plus the in-memory `invoiceComments` store (a `(createdAt, id)` keyset cursor; the inspector documents the equivalent Postgres composite index in prose) and a deterministic seed of 240 comments per focal invoice; `cacheComponents: true` stays on from chapter 062.

Expected result (close the lesson on it, per the contract — the lesson ends when the starter runs locally): `/invoices/[id]` renders the chapter 062 invoice detail page working end-to-end, and the comment-thread leaf shows its "not wired yet" stub because the hooks are unimplemented. `/inspector` loads with the identity switcher and comment controls, but posting and polling do nothing yet because the provider, hooks, and seams are unwritten. Use a small `Code` block for each command; an `Aside` (note) may carry the "no `.env`" point so it stands out.

## Scope

- No code is written this lesson; the provider, factory, keys, fetcher, route handler, action, prefetch, and thread are all built across lessons 2–4. This is the running-starter-plus-architecture-brief lesson only.
- Technology rationale (why TanStack Query, why a route handler as the client seam, why per-request server clients) belongs to the teaching chapter 076, not here — the contract bars tech rationale from the overview. Reference chapter 076 rather than re-explaining.
- The provider wiring, per-request factory, and SSR-hydration bridge are lesson 2 of chapter 077.
- The route handler, `useInfiniteQuery`, cursor paging, and polling are lesson 3 of chapter 077.
- The Server Action write seam, the cache-update optimistic shape, rollback, and the two-system invalidation are lesson 4 of chapter 077.
- The forward-looking discipline (clearing the client cache at the tenancy boundary; @-mentions through the notifications dispatcher; component/security/observability follow-ups) is named at the end of lesson 4, not here.
