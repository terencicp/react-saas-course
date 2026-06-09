# Lesson 2 — Move every control to the URL

**Sidebar title:** Move controls to the URL

## Lesson type

Implementation

(The test-coder generates `lesson-verification/Lesson 2.ts`; the writer renders the Implementation section list.)

## Lesson framing

The student installs the senior reflex that view-state belongs in the URL, not in component state: filter, sort, search, the visibility tab, and the pagination cursor all become URL params, so any view is a paste-able link that survives a refresh, a share, and the back button. The payoff is the share-and-refresh contract — the bare `/invoices` is the home state, only differences from default appear, and the one invariant that keeps pagination honest (every reordering/shrinking setter bundles `cursor: null`) is wired into every control. They ship the read page reading the URL through a `nuqs` `searchParamsCache` and four Client Components writing back through `nuqs` setters, with a deferred-search rhythm that keeps the input responsive while the URL write is debounced.

## Codebase state

### Entry

The starter runs (`pnpm install`, `pnpm dev`) from lesson 1. The `/invoices` list and `/inspector` render. `src/lib/invoices/search-params.ts` exports a no-op `invoiceListSearchParams = {}` and a fake `invoiceListSearchParamsCache` returning hard-coded defaults. `toolbar.tsx` drives status/sort/q with local `useState` — changes never reach the URL and a refresh wipes them. `view-tabs.tsx` renders three tab buttons with no `onClick`. `active-filter-chips.tsx` returns `null`. `pagination.tsx` renders two permanently-disabled buttons. `clear-chip.tsx` does not exist. The page wiring is already provided: `page.tsx` parses via the cache, calls `listInvoices` with `...parsed` plus the session `orgId`/`role`, and renders Toolbar / ViewTabs / ActiveFilterChips / InvoicesTable / Pagination. The root layout is already wrapped in `<NuqsAdapter>`. The scoped helper does not yet branch on `view` (lesson 3), lifecycle actions are stubs (lesson 4), and the update path overwrites silently (lesson 5).

### Exit

`search-params.ts` exports the five real parsers (`status`, `sort`, `q`, `view`, `cursor`) and `invoiceListSearchParamsCache` via `createSearchParamsCache`. The toolbar writes status/sort/search to the URL through `useQueryStates(..., { shallow: false, limitUrlUpdates: debounce(300) })`, bundling `cursor: null` on every change; the search input stays responsive via `useDeferredValue` + `useTransition`. The view tabs write `{ view, cursor: null }` on click (all three tabs still shown — the admin gate is lesson 3). The new `clear-chip.tsx` exists; `active-filter-chips.tsx` renders a chip per non-default `status`/`q`/`sort`. Pagination's Next/First-page buttons advance and reset the cursor. `pnpm test:lesson 2` passes. The known partial state at exit: the view tabs write `view`, but every tab still returns the same rows (the scoped helper does not branch yet — lesson 3).

## Lesson sections

Implementation contract order: Goal + Finished result (intro, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: lift filter, sort, search, view, and the pagination cursor out of local state and into the URL, so any view is a paste-able link that survives a refresh. Follow with a one-paragraph description of the finished behavior: clicking any control rewrites the URL, the active-filter chips render above the table, pagination advances the cursor, the search box stays responsive while it writes, and pasting the URL into a fresh tab reproduces the view exactly. A single `Screenshot` of `/invoices` with the toolbar, chips row, table, pagination row, and view tabs visible, with a non-default filter active so a chip and a non-bare URL show.

### Your mission

Brief in the project's terms; no implementation hints; weave Feature / Functional requirements / Constraints / Out-of-scope as coherent prose, then the requirements as the section's only list. Render the list with `Checklist`/`ChecklistItem`, each item carrying its `tested`/`untested` chip.

**Feature (one–two sentences):** Make the URL the source of truth for every piece of view-state that should survive a refresh, a share, or the back button — filter, sort, search, the visibility tab, and the pagination cursor — so the page reads that URL on the server while the toolbar, view-tabs, chips, and pagination write it back from the client.

**Constraints to weave (non-functional, shape the solution):**
- Default values stay out of the URL — `nuqs` strips them, so bare `/invoices` is the home state and only differences from default appear.
- Every setter that re-orders or shrinks the result set bundles `cursor: null` in the same call — miss it on a single setter and you ship the stale-cursor bug.
- History `replace` and `{ scroll: false }` are already `nuqs` defaults — don't re-set them — so a fast-changing filter doesn't bury the back button.
- Keep the search box responsive with `useDeferredValue` + `useTransition` driving the URL write while `nuqs`'s `limitUrlUpdates: debounce(300)` bounds how often it commits — not a hand-rolled debounce.

**Out of scope (one line):** The view tabs write `view` to the URL, but every tab still returns the same rows — making the scoped helper branch on `view` is lesson 3; lifecycle actions and the version precondition come later.

**Functional requirements (numbered, each tagged):**
1. Clicking a status, sort, or view control rewrites the URL to reflect it, and clearing back to defaults leaves the bare `/invoices` URL with no query string. `[tested]`
2. Copying the URL into a fresh tab reproduces the identical list, and a hard reload preserves filter, sort, cursor, and view. `[tested]`
3. The active-filter chips render above the table for every non-default filter, and each chip's clear control removes that filter (and the cursor) from the URL. `[tested]`
4. Clicking Next advances the list by carrying a new `cursor` in the URL; the cursor is dropped whenever status, sort, search, or view changes, so the new result set starts at page one. `[tested]`
5. Typing a long query fast keeps the input responsive while the URL settles roughly every 300ms, leaving only one or two back-button entries rather than one per keystroke. `[untested]` (timing/responsiveness — verified by hand in Moment of truth)

Note for the test-coder: requirements 1–4 assert observable URL/list outcomes (param presence, cursor reset on other-change, chip-clear). Requirement 5 (debounce timing and input responsiveness) is hand-verified — covered only in the reference solution and the by-hand checklist.

### Coding time

One line directing the student to fill the parsers, the toolbar, the view-tabs setter, the chips (and new `ClearChip`), and the pagination control against the brief and the tests, attempting it before opening the solution. The reference solution is wrapped in `<details>` (writer adds the wrapper). Present files in repo order; surface decision rationale for non-obvious choices; cover the `[untested]` requirement (the debounce rhythm) in full here.

Files and what each contains, with rationale:

- **`src/lib/invoices/search-params.ts`** — the five parsers and the cache. Match the reference signatures: `status: parseAsStringEnum([...])` (nullable, no default — a non-matching value strips); `sort: parseAsStringEnum([...]).withDefault('-createdAt')`; `q: parseAsString.withDefault('')`; `view: parseAsStringEnum(['active','archived','all']).withDefault('active')`; `cursor: parseAsString` (nullable, no default); export `invoiceListSearchParams = { status, sort, q, view, cursor }` and `invoiceListSearchParamsCache = createSearchParamsCache(invoiceListSearchParams)`. Use `AnnotatedCode` — direct attention to which parsers carry `.withDefault(...)` (stripped from the URL) versus the nullable ones, since that distinction is what makes defaults implicit. For parser/cache mechanics link to chapter 060 rather than re-explaining.
- **`app/(app)/invoices/toolbar.tsx`** — replace the local `useState` controls with `useQueryStates(invoiceListSearchParams, { shallow: false, limitUrlUpdates: debounce(300) })`: status select, sort select, search input. Every setter bundles `cursor: null`. The search input holds typed text in `useState` and syncs via `useDeferredValue` + `useTransition` to `setQueryStates({ q: deferred || null, cursor: null })` — empty coerces to `null` so the param strips. Rationale to state: `shallow: false` is load-bearing (the default `shallow: true` is client-only and never re-queries the server); the deferred value (not the raw input) drives the URL write so keystrokes never block; link chapter 060 lesson 3 for the search rhythm. Use `CodeVariants` here for the before/after — the local-`useState` toolbar (refresh wipes it) vs. the `useQueryStates` toolbar — since the contrast is the whole lesson.
- **`app/(app)/invoices/view-tabs.tsx`** — add the `onClick` writing `{ view, cursor: null }` via `useQueryStates`. Render all three tabs for now (the admin gate on All is lesson 3). `Code`.
- **`app/(app)/invoices/pagination.tsx`** — read `cursor` via `useQueryState('cursor', ...withOptions({ shallow: false }))`; receive `nextCursor` and `hasPrev` as props from the server. Next → `setCursor(nextCursor)`; First page → `setCursor(null)`. Surface the senior call: take the simpler next-plus-first path this lesson rather than a full bidirectional cursor stack (no back-stack to maintain, no off-by-one on the first page). `Code`.
- **`app/(app)/invoices/active-filter-chips.tsx` + new `app/(app)/invoices/clear-chip.tsx`** — chips are a Server Component reading `parsed`, emitting a chip for each non-default `status` / `q` / `sort`; each embeds a Client `<ClearChip param="status" label="…" />` calling `setQueryStates({ [param]: null, cursor: null })`. Note the split: the chip list is server-rendered (no client JS to enumerate filters), only the clear button is a client island. `Code` for each.
- **Note (not a code block):** the root layout is already wrapped in `<NuqsAdapter>` (chapter 060) — load-bearing, not something to add.

Decision rationale to surface across the section (one–two sentences each): why defaults are stripped (clean, shareable URLs); why `cursor: null` rides along on every shrinking/reordering setter (a kept cursor points past the end of a different result set — page-one is the only safe landing); why the deferred value, not the raw input, drives the URL write. For `nuqs` parser/`searchParamsCache` mechanics and the `{ shallow: false }` policy, link chapter 060 rather than re-explaining.

**Optional diagram (one, in this section):** an `ArrowDiagram` inside a `<Figure>` showing the one-way data round-trip — *URL* → server `searchParamsCache.parse` → `listInvoices` → rendered list; and the client write-back *toolbar/tabs/chips/pagination setters* → URL (closing the loop). It earns its place only because the read-on-server / write-on-client split is the lesson's core mental model and prose alone leaves it abstract. Keep it horizontal and compact. If the writer judges prose sufficient, omit it.

### Moment of truth

The test command and expected pass output, then the by-hand checklist. Render the checklist with `Checklist`/`ChecklistItem`.

- Command: `pnpm test:lesson 2`. Expected: the Lesson 2 suite passes (all green; state that the suite covers URL-encoding and the cursor-reset-on-other-change behavior).
- By-hand checklist (the student ticks as they go):
  1. Click status `paid`, sort by total descending, click Next; the URL shows `?status=paid&sort=-total&cursor=...`. Clear filters; the URL becomes a bare `/invoices`.
  2. Copy any URL into a fresh tab; the list renders identically. Hard reload; filter, sort, cursor, and view all survive.
  3. With a non-null cursor, change the status; the URL drops `cursor` and the list shows page one of the new filter (repeat for sort, search, and view).
  4. Type a fast 30-character query; the input never lags, the URL writes settle roughly every 300ms, and the back-button count stays at one or two entries rather than thirty.
  5. Note the expected partial state: the view tabs now write `view` to the URL, but every tab still returns the same rows (the scoped helper does not yet branch on `view`) — fixed in lesson 3.

## Scope

This lesson covers only the URL-state write/read wiring. It does **not** cover:
- Making the scoped helper branch on `view` or the RBAC gate on the All tab — lesson 3 of this chapter (Scoped reads and the view tabs).
- The lifecycle actions (archive/restore/soft-delete) and optimistic archive — lesson 4.
- The `version` precondition and conflict UX on update — lesson 5.
- The `nuqs` parser / `searchParamsCache` / `useQueryState(s)` mechanics and the `{ shallow: false }` policy themselves — taught in chapter 060 (Unit 10); link rather than re-derive.
