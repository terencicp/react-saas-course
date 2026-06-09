# Chapter 062 — Lesson 1 outline

## Lesson title

- **Full title:** Project overview
- **Sidebar title:** Project overview

The chapter-outline title fits the contract (the first project lesson is always titled "Project Overview"). Use sentence case in the rendered page.

## Lesson type

`Project overview`

(First lesson of a project chapter. No feature built, no test file — the test-coder does not run for this lesson.)

## Lesson framing

The student leaves with the production-list-view starter running locally on `pnpm dev` alone — no Docker, no Postgres, no env — and a clear mental model of the four senior moves the chapter installs: promoting view-state into the URL, a lifecycle-aware tenant-scoped read helper, version-preconditioned writes, and a conflict-and-retry update surface. The payoff of this lesson is orientation: the student understands the in-memory store stands in for Postgres so the SQL-backed *shapes* stay the focus, knows the `/inspector` page is the verification surface every later lesson leans on, and can see in the unfinished starter exactly which behaviors are broken and which lesson repairs each one.

## Codebase state

This is the first lesson — no Entry/Exit pair. The relevant state is the starter the student boots:

- The `/invoices` list view and `[id]/edit` form render, but: toolbar filters are local `useState` only (refresh wipes them), view tabs and pagination buttons do nothing, every tab shows the same rows (the scoped helper does not branch on `view`), there are no archive/restore/delete actions, and the update path silently overwrites on a two-tab race (chapter-047 last-write-wins baseline).
- The in-memory store (`src/server/store.ts`) seeds deterministically on import: 45 active `org-acme` rows, 1 pre-archived, 1 pre-soft-deleted, 6 `org-globex` rows; `version` seeded at 1 on fresh rows, 2/3 on the seeded archived/soft-deleted rows to make drift observable; a colliding pair (`inv-0001` live and `inv-deleted-1` soft-deleted, both numbered `ACME-1001`).
- Session is a cookie (`acting-identity`) naming one of four seeded identities; default `org-acme:admin`.
- `/inspector` is provided in full (row counts, identity switcher, reset-and-reseed, force-version-drift, audit tail, index panel).

## Lesson sections

Follow the Project-overview section list from the contract: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.

### What we're building (intro, no header)

One short paragraph framing the chapter: take the Unit 6 invoice CRUD surface and ship the production list view every SaaS app grows into — URL-state filter/sort/search/cursor pagination, soft delete plus archive as two distinct lifecycle states, restore from an Archived tab, and optimistic concurrency that turns a silent two-tab overwrite into a recoverable conflict. A second sentence: the data layer is an in-memory store standing in for Postgres, so the project boots with `pnpm dev` alone and the patterns (one scoped read helper, version-preconditioned writes, `authedAction`, audit writes) stay the focus.

Close with a single figure: one `Screenshot` (desktop variant) of the finished `/invoices` page showing the toolbar, table, active-filter chips, pagination row, and view tabs all visible. Wrap in `Figure` with a one-line caption. This is the only figure in the intro.

### What we'll practice

A short bulleted list (skills framing, not features). Pull the four bullets from the chapter outline:

- Promoting view-state (filter, sort, search, cursor, visibility) out of component state and into the URL so a view is shareable and survives refresh.
- Composing a lifecycle-aware, tenant-scoped base-query helper so reads cannot forget the org filter or the `deletedAt`/`archivedAt` lifecycle filter.
- Adding tenancy + lifecycle + `version` preconditions to every write and turning a stale precondition into an honest conflict.
- Wiring `useActionState` for the success path and the conflict banner in one shape, and layering `useOptimistic` on archive (the optimistic value expires when the transition ends on a returned `{ ok: false }` — not a throw-triggered rollback).

### Architecture

Shape only — a labeled list of the moving parts and how they connect (a box-and-arrow diagram is optional; the list is sufficient and preferred for a fast read). If a diagram is added, an `ArrowDiagram` inside `Figure` showing the request loop (URL → Server Component `searchParamsCache` → `listInvoices` → `scopedInvoices` → store; client setters writing back to the URL) clarifies the round-trip prose can carry, but keep it minimal. Default to the labeled list:

- The `/invoices` page is a Server Component that parses the URL via the `nuqs` `searchParamsCache`, reads the session, and calls `listInvoices` with the parsed slice plus the session's `orgId`/`role`.
- The toolbar and view-tabs are Client Components that write filter/sort/search/view/cursor back to the URL via `nuqs` setters (`{ shallow: false }`), bundling `cursor: null` on any change that re-orders or shrinks the result set.
- `listInvoices` reads exclusively through `scopedInvoices(orgId).active() / .archived() / .includingDeleted()`, routing on the `view` param (with `all` collapsed to `active` for non-admins at the read).
- The lifecycle and update actions are `authedAction`-wrapped, apply their store mutation only when the tenancy + lifecycle + `version` precondition holds, and `pushAudit` in the same atomic step.
- The edit form carries a hidden `version` field; on a conflict it renders a banner built from the `current` payload the action returns in the same round trip.
- The `/inspector` page is the verification surface: row counts, identity switcher, reset-and-reseed, force-version-drift, audit tail.

State plainly: the store is in-memory and stands in for Postgres; the shapes (scoped reads, version preconditions, audit writes) are the SQL-backed shapes the rest of the course teaches, run against arrays. Do not include technology rationale here — that lives in the regular lessons (chapters 060/061). Link rather than re-explain.

### Starting file tree

Annotated top-level layout using `FileTree`. Comment one line each only on the files the lessons touch or that changed from the previous project; leave the rest uncommented. Mark the TODO-carrying files as the highlighted focus. Source the tree and the TODO annotations from the chapter outline's "Starter file tree" block and the project code outline's TODO list.

Highlighted focus files (carry TODOs the student fills): `search-params.ts`, `scoped-query.ts`, `queries.ts`, `actions.ts`, `toolbar.tsx`, `view-tabs.tsx`, `active-filter-chips.tsx`, `pagination.tsx`, `table.tsx`, `edit-form.tsx`, `conflict-banner.tsx`, plus the new `clear-chip.tsx` (absent in start, created in L2). Note `lesson-verification/` is absent in start (test harness ships per lesson). Everything else is provided.

Use `FileTree` (not `Code`) so the tree renders with the highlight/comment affordances. Keep comments terse (one clause each).

### Roadmap

One `Card` per implementation lesson inside a `CardGrid`. Each card: lesson number + title, one sentence naming what it adds. Use the four roadmap cards from the chapter outline verbatim in substance:

- **Lesson 2 — Move every control to the URL.** Adds the `nuqs` parsers, the `searchParamsCache`, the toolbar, the view-tabs setter, active-filter chips (and the new `ClearChip`), and cursor pagination with the deferred-search rhythm, so filter/sort/search/view/page all live in the URL.
- **Lesson 3 — Scoped reads and the view tabs.** Makes `scopedInvoices(orgId)`'s three views honest and routes `listInvoices` / `getInvoiceDetail` on `view` with RBAC gating, so Active / Archived / All each return the right rows.
- **Lesson 4 — Archive, restore, and delete.** Implements the three lifecycle actions with audit writes and wires them into the row action menu, with optimistic archive in the table.
- **Lesson 5 — Two tabs, one winner.** Adds the `version` precondition to `updateInvoice`, returns a conflict with `current`, and renders the conflict banner with "Use latest" and an admin-gated "Overwrite anyway".

### Setup

Bring-up in a `Steps` component. The contract's mandated first step plus the (minimal) sequence:

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 062/start/`.
2. `pnpm install`
3. `pnpm dev`

No env var list (omit — there is no `.env` in this project; the store seeds itself on import and the session is the `acting-identity` cookie, default `org-acme:admin`). State this explicitly: no Docker, no Postgres, no migration, no `.env`.

Expected result (one paragraph): `pnpm dev` serves the list view and edit form, but in the unfinished starter state — toolbar filters are local state only (refresh wipes them), view tabs and pagination do nothing, every tab shows the same rows, there are no archive/restore actions, and the update path silently overwrites on a two-tab race.

Close with a short paragraph (or `Aside` tip) pointing the student at `/inspector` as the verification surface every later lesson uses: the row-counts banner, the acting-identity switcher (verifies org + RBAC behavior), reset-and-reseed, the "Force version drift" tool with its "open in two tabs" link, and the audit-log tail. Mention each implementation lesson is verified with `pnpm test:lesson <n>` against `lesson-verification/Lesson <n>.ts`.

The lesson ends when the starter runs locally.

## Component usage summary

- `Screenshot` (in `Figure`) — the single finished-app figure in the intro.
- `FileTree` — the annotated starting tree.
- `CardGrid` + `Card` — the roadmap.
- `Steps` — the setup sequence.
- `Aside` (tip) — optional, for the `/inspector` pointer.
- Optional `ArrowDiagram` (in `Figure`) for the Architecture round-trip, only if the labeled list reads as insufficient; default to the list.
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` — there are no code blocks to teach in this lesson (no feature is built).

## Scope

This lesson only boots the starter and orients the student; it builds no feature and ships no test file.

- The URL-state wiring (parsers, toolbar, chips, pagination, deferred search) belongs to lesson 2.
- Making the scoped helper branch on `view` and the RBAC read gate belong to lesson 3.
- The lifecycle actions and optimistic archive belong to lesson 4.
- The `version` precondition and conflict banner belong to lesson 5.
- The *why* behind `nuqs`, the scoped-helper pattern, and version-based optimistic concurrency is taught in chapters 060 and 061 (regular lessons) — link, do not re-derive.
- No technology rationale, no quiz (project chapters carry no quiz — the project is the assessment).
