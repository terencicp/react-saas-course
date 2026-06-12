# Lesson 4 — Optimistic add and rollback with useMutation

## Lesson title

Chapter-outline title fits. Keep: **Optimistic add and rollback with useMutation**.
Sidebar (short): **Optimistic add & rollback**.

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior reflex that justifies pulling TanStack Query into the surface at all: a cache-update optimistic write with exact rollback. They ship the comment post — a Server Action write seam (`addCommentAction`) wired through `useMutation` so `onMutate`/`onError`/`onSettled` drive an instant-then-canonical row, with a wide snapshot restored on failure and `cancelQueries` guarding against an in-flight poll clobbering the optimism. The payoff is the two-system invalidation reality, named once at the seam (the action's `updateTag` for the Server Component cache, the client's `invalidateQueries` for the TanStack cache) — the architectural price tag of running two caches over one row, paid deliberately rather than papered over. With the write side closed the full project becomes verifiable end to end.

## Codebase state

### Entry

The provider, per-request `QueryClient` factory, `commentKeys`, SSR prefetch + `<HydrationBoundary>` (L2) and the read side (L3) are live: the seeded thread paints with no client loading state, `useInfiniteQuery` pages older comments through `GET /api/invoices/[id]/comments`, and a 10-second `refetchInterval` (background-paused) surfaces coworker inserts. The write path is still stubbed — `comments/actions.ts`'s `addCommentAction` returns `{ ok: false, error: { code: 'internal', userMessage: 'Not implemented' } }`; `comment-form.tsx` is a static disabled form with no props; `comment-thread.tsx` has no `useMutation`. Posting a comment does nothing.

### Exit

`addCommentAction` is the full write seam: consumes the force-failure flag first, `pushComment` + `pushAudit`, `updateTag(invoiceCommentsTag)`, returns the canonical `Result`. `comment-thread.tsx` owns a `useMutation` with the cache-update optimistic shape (`cancelQueries` → wide snapshot → page-0 prepend of an `optimistic-<uuid>` row → `onError` restore → `onSuccess` clear body → `onSettled invalidateQueries`). `comment-form.tsx` is fully controlled and props-driven (`body`/`onBodyChange`/`onPost`/`isPending`/`error`). The project matches the solution tree; all chapter project goals hold.

## Lesson sections

Implementation contract order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: type a comment and it lands at the top of the thread the instant you submit, settles into the canonical server row, and vanishes with an error banner if the server rejects it. Then one paragraph (or a `Screenshot` of the thread with a freshly posted row at the top and an inline error-banner state) describing the feature working: instant post, persists once the action returns, clean rollback on failure, and the full thread now verifiable against every project goal. Keep it to a few sentences — no mechanics here, those live in the mission.

### Your mission

Prose paragraph + one requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints, no key/function names beyond the capability framing.

Weave into the prose:
- **Feature.** Posting a comment: it appears at the top instantly, persists once the write returns, and rolls back with an inline error if the server rejects.
- **Constraints that shape the solution** (state as senior reasoning, not as code): the write composes through `useMutation` rather than `<form action>` + `useActionState`, because TanStack Query already owns the read side and the optimistic lifecycle needs `onMutate`/`onError`/`onSettled` — mixing the two would put two sources of truth on one form (the chapter 062 edit/lifecycle forms keep `useActionState`, which is the redirect-and-revalidate tool). The optimistic update must be the cache-update shape (the new row lands inside the infinite-query cache's first page), not the via-variables shape. An in-flight poll must be cancelled before the optimistic write or it overwrites the optimism with data the server does not yet know about. The snapshot is restored exactly on failure. The two-system invalidation is the deliberate cost of two caches over one row — both must fire. On the forced failure the action returns before any insert or audit write, so the audit tail stays clean.
- **Out of scope** (one line, named so the student does not over-build): no comment edit/delete/moderation, no @-mention notifications (Unit 13), no rich-text body (plain string, Zod `min(1).max(2000)`), no fan-out optimistic writes to other queries.

Requirements checklist — each a verifiable user-facing outcome, phrased as the outcome, tagged:
1. Submitting a comment shows the new row at the top synchronously, before the server responds, and the form clears. `[tested]`
2. Once the action returns, the optimistic row is replaced by the canonical server row (the temporary id becomes the server-generated store id) and a new `comment.added` row appears in the inspector's comment audit tail. `[tested]` for the row swap; `[untested]` for the audit-tail entry (inspector hand-check).
3. When the server rejects the submit (inspector "Force 500 on next POST"), the optimistic row disappears, the prior thread state is restored exactly, an inline error banner surfaces, and the audit tail is unchanged. `[tested]`
4. A successful add invalidates both caches — the thread refetches the canonical row and the Server Component's cached thread refreshes; skipping either is observable as a stale layer. `[untested]` (two-cache hand-check via inspector + delete-and-observe).
5. A coworker's comment arriving mid-submit does not produce a duplicate once settled — canonical rows replace the optimistic placeholder. `[tested]`
6. Every query-key reference across read and write paths comes from `commentKeys`; no raw key arrays exist outside it. `[untested]` (grep check).

Note for the test-coder: assert observable behavior, not file/function names — synchronous prepend, id-swap after settle, rollback-to-snapshot on a forced reject, no-duplicate after a concurrent insert. The forced-failure path is driven through the inspector control / the test's own arm-then-submit. Items 4 and 6 are inspector/grep hand-checks (the reference solution covers them), not assertions.

### Coding time

One line directing the student to implement against the brief and the tests, then read the walkthrough. Writer wraps the reference solution in `<details>` (collapsed). Organize as it appears in the repo.

Files, in repo order:

- **`src/lib/comments/actions.ts`** — `addCommentAction = authedInputAction('member', addCommentInput, async (input, ctx) => { ... })`. Order is load-bearing: `consumeForceFailure(ctx.userId)` FIRST → early `return { ok: false, error: { code: 'internal', userMessage: 'Forced failure for verification' } }` so a forced failure writes no audit row; then `authorName = findUser(ctx.userId)?.name ?? ctx.userId`, `pushComment(...)`, `pushAudit({ action: 'comment.added', subjectId: row.id, ... })`, `await updateTag(invoiceCommentsTag(input.invoiceId))`, return `{ ok: true, data: { id: row.id, createdAt: row.createdAt } }`. Rationale callouts: `authedInputAction` (plain-object, callable straight from `useMutation`) not the FormData `authedAction`; `updateTag` (read-your-writes, lesson 4 of chapter 076's standard) not `revalidateTag(tag, 'max')` (the webhook/background variant) — link to chapter 076 / the closing Note rather than re-explain; a `[untested]` aside that in a real Postgres app the insert+audit pair would run inside one `tenantDb(orgId).transaction` (here the store is in-memory).
- **`src/app/(app)/invoices/[id]/comment-form.tsx`** — controlled `<textarea>` + submit button, child of `<CommentThread />` so it shares the query-client scope; props-driven `{ body, onBodyChange, onPost, isPending, error }`, NOT a `<form action>`. `onPost(body)` triggers the mutation; `isPending` disables the button and dims the textarea (`data-testid="comment-submit"`); `error` renders in an inline banner (`data-testid="post-error"`). Parent owns the `body` `useState` and clears it in `onSuccess`.
- **`src/app/(app)/invoices/[id]/comment-thread.tsx`** (the `useMutation` block; the L2/L3 read shape already exists) — the four lifecycle callbacks:
  - `mutationFn`: `await addCommentAction({ invoiceId, body: text })`; `if (!result.ok) throw new Error(result.error.userMessage)`; return `result.data`.
  - `onMutate`: `cancelQueries({ queryKey: commentKeys.lists(invoiceId) })` first; `snapshot = getQueryData<InfiniteData<CommentsPage>>(...)` (wide); build `optimistic: Comment` with `id: \`optimistic-${crypto.randomUUID()}\``; `setQueryData` prepending into `pages[0].comments`, preserving `nextCursor`/`prevCursor`; `return { snapshot }`.
  - `onError`: `if (ctx?.snapshot) setQueryData(commentKeys.lists(invoiceId), ctx.snapshot)`.
  - `onSuccess`: `setBody('')`.
  - `onSettled`: `invalidateQueries({ queryKey: commentKeys.lists(invoiceId) })`.

Component handling:
- `AnnotatedCode` for the `useMutation` block — direct attention across the four callbacks in sequence (cancel → snapshot/write → restore → settle/invalidate), since the optimistic shape's correctness is in the ordering and the snapshot-wide choice.
- `Code` for `actions.ts` and `comment-form.tsx` (simple, linear).
- Consider `CodeVariants` only if contrasting `useMutation` vs the `<form action>` + `useActionState` shape adds clarity beyond the prose; the mission already makes the call, so prefer prose + a single `Code` block unless the contrast reads cleanly.

Decision rationale / `[untested]` coverage to fold in (one or two sentences each):
- `cancelQueries` is the load-bearing first line: without it an in-flight poll resolving between the optimistic write and the settle overwrites the optimistic row with stale data.
- Snapshot wide, restore wide: `ctx.snapshot` is the entire `InfiniteData`, not just page 0, because invalidation may reshape `data.pages` between the optimistic write and the error.
- `onSettled` (always fires) owns `invalidateQueries` — success pulls the canonical row, failure refetches the genuine post-rollback state; skipping it leaves the optimistic row in the cache until the next poll (the bug behind requirement 4).
- Two-system invalidation surfaced once: `updateTag(invoiceCommentsTag(invoiceId))` for the Server Component cache, `invalidateQueries` for the TanStack cache — both layers hold the row, both must invalidate (covers requirement 4's second half).
- The `optimistic-` prefix doubles as the dedup anchor if a coworker's poll lands mid-flight (covers requirement 5); name that production might key on a true UUID and compare, then stop — do not fan the write out to other queries.
- `commentKeys` is the only place key arrays live (covers requirement 6) — the structural parallel to `tags.ts` from lesson 1 of chapter 072; link, don't re-explain.

External resources placeholder: none required; resourcer appends after the `<details>` if any.

No diagram needed — the optimistic lifecycle is carried by the annotated `useMutation` block and the existing read-side framing; a box-and-arrow of cache layers would restate prose. If the writer judges the two-cache flow needs a visual, a small `Figure` contrasting "Server Component cache (updateTag)" vs "TanStack cache (invalidateQueries)" over one row is the only candidate — optional, not briefed as required.

### Moment of truth

`pnpm test:lesson 4` and the expected pass output (command + pass surface ship with the starter; the writer renders the exact pass block). Then the hand-check checklist (`Checklist`/`ChecklistItem`) covering what the tests don't, with the instruction to run each deliberate-failure demo as a single named change and revert before the next:
- Type + submit → optimistic `optimistic-...` id visible in `data.pages[0].comments` in devtools; after settle `invalidateQueries` flips it to the server store id; form clears; audit tail shows the new `comment.added` row.
- Inspector "Force 500 on next POST" → submit → optimistic row appears briefly, `onError` restores the snapshot, inline banner shows the error, audit tail unchanged; devtools shows the pre-mutation snapshot fully restored.
- Delete `updateTag` → Server-Component thread stays stale until next visit while the client thread still updates; restore. Delete `invalidateQueries` → optimistic row lingers (its `optimistic-...` id) until the next poll; restore.
- With a debug delay on the action in flight, fire inspector "Insert coworker comment" → on settle the refetch returns both rows, no duplicate.
- Grep for raw `['comments', ...]` arrays outside `keys.ts` → zero hits.

Close: after this lesson the full project is done — re-run the chapter project goals end to end and confirm each holds. Forward pointer (name, don't build): production clears the client cache at the tenancy boundary by wiring `queryClient.clear()` (or per-org `removeQueries`) into the identity/active-org-switch action; the inspector's `switchIdentity` + "Clear client cache" (`?clearCache=1` / `ClearCacheOnFlag`) is this project's stand-in, and lesson 3 of chapter 076's framing names this discipline. Do not reach into that action here.

## Scope

This lesson does not cover:
- The provider, per-request factory, keys, SSR prefetch/hydration — built in lesson 2 of chapter 077.
- The route handler read seam, `useInfiniteQuery`, infinite scroll, and polling — built in lesson 3 of chapter 077.
- Wiring `queryClient.clear()` into the real identity-switch action (tenancy-boundary cache reset) — named as a forward pointer; the discipline is framed in lesson 3 of chapter 076.
- Genuinely shared client state (the `useMutation`-vs-store threshold) — chapter 078 (Zustand).
- Component tests for the optimistic-add/rollback flow against a mocked `addCommentAction` — Unit chapter 089.
- WebSockets / Server-Sent Events for live updates — out of course scope; polling is the threshold-met case (established in lesson 3 of chapter 077).
