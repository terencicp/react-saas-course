# Lesson 3 — Scoped reads and the view tabs

- **Sidebar title:** Scoped reads and view tabs
- **Type:** Implementation

The chapter-outline title fits; keep it.

## Lesson framing

The student installs the read discipline the whole project leans on: a tenant-scoped, lifecycle-aware base-query helper whose three views (`active` / `archived` / `includingDeleted`) are *honest*, with the RBAC gate enforced at the data layer — not merely hidden in the UI. The payoff is a read path where "I forgot the org filter" and "a member hand-typed `?view=all`" are both structurally impossible at sanctioned reads, and the Active / Archived / All tabs each return the right rows against the already-seeded archived and soft-deleted invoices.

## Codebase state

### Entry (after lesson 2)

- `search-params.ts` parsers and `searchParamsCache` are real; toolbar, view-tabs, chips, pagination all write their slice to the URL via nuqs setters.
- `view-tabs.tsx` writes `{ view, cursor: null }` on click but renders **all three tabs regardless of role** (the `role` prop is `_role`, unused).
- `scoped-query.ts` is **dishonest**: `active()`, `archived()`, and `includingDeleted()` all return the same org-filtered list (`makeQuery(inOrg(), false)` ×3). The `activeFilter` / `archivedFilter` predicates are already exported and used by the inspector's count panels.
- `queries.ts` `listInvoices` ignores `view` and `role` (always reads `scopedInvoices(orgId).active()`); `getInvoiceDetail` ignores `role` and reads `active()` only.
- `table.tsx` renders rows with **no lifecycle badges** and no "Archived on …" line; row menu has only "Edit".
- Net effect: switching tabs writes the URL but every tab shows the same rows; archived/soft-deleted seed rows leak into Active.

### Exit (after lesson 3)

- `scoped-query.ts`: `active()` applies `activeFilter`, `archived()` applies `archivedFilter`, `includingDeleted()` returns the full org slice.
- `queries.ts`: `listInvoices` has `resolveView(view, role)` collapsing `all` → `active` for non-admins, then routes to `archived()` / `includingDeleted()` / `active()`; status/search/sort/cursor compose on the chosen builder. `getInvoiceDetail` checks `archived()` → `active()` → admin-gated `includingDeleted()`.
- `view-tabs.tsx`: the All tab renders only when `role === 'admin'`.
- `table.tsx`: renders `Deleted` / `Archived` badges and, in the Archived view, the "Archived on …" date line.
- Net effect: Active hides archived+deleted rows; Archived shows the seeded archived row; All (admin) shows the seeded soft-deleted row with a Deleted badge; a member hand-typing `?view=all` is served active rows at the read. Lifecycle *actions* (the writes that create these states) are still unimplemented — lesson 4.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: make the view tabs return the right rows by making the scoped helper's three views honest and routing the read on `view` with RBAC at the data layer. Then a one-paragraph description of the finished behavior: switching tabs returns the correct row set — Active hides archived and deleted rows, Archived shows the seeded archived row, All (admin only) shows the seeded soft-deleted row with a "Deleted" badge — while a member who hand-types `?view=all` is quietly served `active` rows. Optionally a `Screenshot` of the Archived tab showing the seeded archived row with its "Archived on …" line, and the admin All tab showing the Deleted badge.

### Your mission (header: "Your mission")

Prose paragraph in project terms, no implementation hints, no subsection headers. Cover, woven together:

- **Feature:** make the Active / Archived / All view tabs each return their correct row set, and refuse `view=all` to non-admins at the read.
- **Constraint — defense at the data layer:** the RBAC gate lives in the read (`resolveView`), not only in the tab-hide; a member hand-typing the URL is refused by the query, the hidden tab is cosmetic on top of that. The org filter stays spelled inline (`inv.orgId === orgId`) inside the helper rather than threaded through a tenant client — this in-memory builder is the analogue of a Drizzle `.$dynamic()` builder, and routing all reads through it makes the forgotten-filter bug structurally impossible at sanctioned reads; the convention that a bare `store.invoices` read elsewhere is a review red flag is the second-layer defense.
- **Out of scope:** the actions that *create* archived/deleted states (archive/restore/soft-delete) are lesson 4; this lesson leans on the already-seeded archived and soft-deleted rows to confirm the tabs.

Then the requirements checklist (a `Checklist`, the only list in the section), each item one verifiable outcome phrased as behavior, tagged `[tested]` / `[untested]`:

1. Switching to the Archived tab returns the seeded archived row and only archived rows; switching to Active hides both archived and soft-deleted rows. `[tested]`
2. As an admin, the All tab returns every row including the seeded soft-deleted one. `[tested]`
3. As a member, hand-typing `?view=all` serves `active` rows — the refusal happens at the read in `resolveView`. `[tested]`
4. `getInvoiceDetail` loads an archived invoice's detail page for everyone (so it can be restored) and a soft-deleted invoice's detail page only for an admin. `[tested]`
5. The soft-deleted row is marked with a "Deleted" badge and archived rows with an "Archived" badge; the Archived view shows an "Archived on …" date line. `[untested]`
6. As a member, the All tab is absent from the rendered tabs. `[untested]`

(Test-coder note: items 1–4 target observable query/RBAC behavior callable directly against `listInvoices` / `getInvoiceDetail` and `scopedInvoices`; items 5–6 are React rendering covered only in the reference solution.)

### Coding time (header: "Coding time", solution in `<details>`)

One line directing the student to make the helper honest and route the reads against the brief and the tests before reading on.

Reference implementation, organized as it appears in the repo:

- **`src/lib/invoices/scoped-query.ts`** — the three views in `scopedInvoices`: `active: () => makeQuery(inOrg().filter(activeFilter), false)`, `archived: () => makeQuery(inOrg().filter(archivedFilter), false)`, `includingDeleted: () => makeQuery(inOrg(), false)`. Note the `activeFilter` / `archivedFilter` predicates are pre-exported and shared with the inspector's count panels (so the list and the counts agree by construction), and the `InvoiceQuery` builder is provided — the student only swaps the predicate into each view. Use `AnnotatedCode` to focus attention on the three differing lines against the otherwise-identical baseline.
- **`src/lib/invoices/queries.ts`** — `listInvoices`: add `resolveView(view, role) = view === 'all' && role !== 'admin' ? 'active' : view`, then `const base = resolved === 'archived' ? scoped.archived() : resolved === 'all' ? scoped.includingDeleted() : scoped.active()`; status filter, `q` substring match (against `customerName` or `number`), sort, and `cursorAfter` compose on `base`. `getInvoiceDetail`: check `archived().find(...)` first (so an archived row's detail page loads for restore), then `active().find(...)`, then `role === 'admin' ? includingDeleted().find(...) : null`.
- **`src/app/(app)/invoices/view-tabs.tsx`** — render the `all` tab only when `role === 'admin'` (`...(role === 'admin' ? [{ value: 'all' as const, label: 'All' }] : [])`).
- **`src/app/(app)/invoices/table.tsx`** — the `Deleted` (variant `destructive`) and `Archived` (variant `secondary`) badges keyed on `row.deletedAt` / `row.archivedAt && !row.deletedAt`, plus the `view === 'archived' && row.archivedAt` "Archived on {date}" line. The provided baseline already has the table shell; this is the badge/label addition only (the row *actions* are lesson 4 — note that so the writer doesn't pull L4 wiring into the sample).

Decision rationale to surface (one or two sentences each, covers the `[untested]` items):

- Why the RBAC gate lives at the read and not only at the tab-hide: defense at the data layer survives a hand-typed URL or a forged client; the hidden tab is cosmetic.
- Why `archived()` is checked first in `getInvoiceDetail`: an archived row's edit/detail page must load so the row can be restored later.
- Why the shared `activeFilter` / `archivedFilter` predicates are exported: the inspector's counts and the list read the same predicate, so they cannot disagree.
- Code organization: the org filter spelled inline keeps the tenant boundary visible at the helper instead of hidden in a client wrapper.

For the base-query helper *pattern* itself (the `active()`/`archived()`/`includingDeleted()` API, soft-delete vs. archive semantics) link to lesson 2 of chapter 061 rather than re-deriving. For the read-layer RBAC wrapper concept link to chapter 059. Close the section noting this completes the view-tab behavior the toolbar wired in lesson 2 but could not yet satisfy.

`CodeVariants` (before/after) is a good fit for the `scoped-query.ts` and the `listInvoices` view-routing changes — the dishonest baseline vs. the honest version makes the lesson's point visible. Keep the rest as plain `Code`.

### Moment of truth (header: "Moment of truth")

The test command: `pnpm test:lesson 3`. State the expected pass output (the per-lesson vitest run reports its suites passing). Then a by-hand `Checklist` mirroring the requirements, ticked as the student goes:

- Switch to Archived; the seeded archived row appears and active rows do not. Switch to Active; archived and soft-deleted rows are hidden.
- As admin (via the inspector's identity switcher), switch to All; the seeded soft-deleted row appears with a "Deleted" badge. Open its detail page (loads for admin); confirm an archived invoice's detail page also loads.
- Switch to `org-acme:member`; confirm the All tab is hidden; hand-type `?view=all` and confirm the list still returns `active` rows.
- Read the inspector's index panel to connect the in-memory shapes to the SQL-backed partial composite index the list query would scan (verification here is the row sets, not a live query plan).

## Scope

This lesson does not cover:

- The **actions** that move rows between lifecycle states (archive / restore / soft-delete) and the row-action menu wiring + optimistic archive — lesson 4.
- The `version` precondition on `updateInvoice` and the conflict banner — lesson 5.
- The URL-state wiring (parsers, `searchParamsCache`, toolbar, chips, pagination, deferred search) — lesson 2 (already in place at entry).
- The live SQL index / `EXPLAIN`: the data layer is the in-memory store; the partial composite index is *described* in the inspector's index panel, not run. The SQL-backed soft-delete + partial unique index is taught in lesson 1 of chapter 061.
