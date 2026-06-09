# Chapter 062 — Project: The production list view

## Chapter framing

Chapter 062 takes the Unit 6 CRUD surface (Chapter 047's invoices) and turns it into the production list view every SaaS app eventually ships: filter, sort, search, and cursor pagination all in the URL through `nuqs`; soft delete plus archive as two distinct lifecycle states; restore from an Archived tab; optimistic concurrency via a `version` field that turns silent last-write-wins into a real conflict with a refresh-and-retry surface.
The data layer here is an in-memory singleton store (`src/server/store.ts`), not Postgres — it stands in as the "database" so the project boots with `pnpm dev` alone, no Docker, no migrations, no env. Every read still goes through one sanctioned helper (`scopedInvoices(orgId)`, a tenant-scoped fluent builder over the store), every write carries its tenancy + lifecycle + `version` precondition, and every privileged action runs through the `authedAction` wrapper — the same shapes the SQL-backed units teach, executed against arrays so the patterns stay the focus.
This chapter wires `searchParams` to the read, makes the `scopedInvoices(orgId)` helper's `active()` / `archived()` / `includingDeleted()` views honest, adds the three lifecycle actions, and adds the `version` precondition to the update path.
The output is a list view a coworker can paste a URL of, refresh a hundred times, archive rows from, restore them, and race two tabs against — every behavior holds.

### Project goals

The finished list view is "done" when every one of these behaviors holds. They are the outcomes the build lessons each carry one slice of, and the architect should treat the set as the chapter's acceptance bar:

- Filter, sort, and page changes update the URL; defaults stay implicit (stripped from the URL).
- Refresh and share both reproduce the view: copying a URL into a fresh tab renders the identical list; a hard reload preserves filter, sort, cursor, and view.
- Deleting an invoice (admin only) removes it from the default `active` list; it reappears under `view=all` with a "Deleted" badge.
- `view=all` is RBAC-gated to admin: a member sees only `active` and `archived` tabs, and a member who hand-types `?view=all` is served `active` rows (the gate lives at the read, in `listInvoices`'s `resolveView`).
- Archive removes a row from the default list and surfaces it in the Archived tab with an "Archived on …" label and a Restore button; Restore returns the row to active and writes an audit entry.
- A partial unique index on `(orgId, number) WHERE deleted_at IS NULL` is what lets a soft-deleted invoice number be re-created in the SQL-backed version; the seed ships a colliding pair (a live `ACME-1001` and a soft-deleted `ACME-1001`) to demonstrate the recovery, and the inspector's index panel describes the SQL constraint that enables it.
- Editing the same invoice from two tabs returns a conflict on the second submit, with a banner showing the current server values and "Use latest" / admin-gated "Overwrite anyway" affordances; "Use latest" pulls `current` into the form and the keyed remount resets the hidden `version` so the resubmit succeeds.
- The optimistic value (on archive) expires when the pending transition ends on a returned `{ ok: false }` — the real state was never advanced, so the row reappears; this is expiry, not a throw-triggered rollback.
- The search input stays responsive while URL writes are debounced (settling roughly every 300ms, no back-button spam).
- Any change that re-orders or shrinks the result set bundles `cursor: null`, so a filter/sort/search/view change drops the cursor and shows page one of the new result set.

Threads that run through every lesson: the URL is the source of truth for filter + sort + search + cursor + visibility; defaults are implicit; the page is a Server Component reading a `nuqs` `searchParamsCache`, the client writes via `nuqs` setters with `{ shallow: false }` (history `replace` and `{ scroll: false }` are nuqs defaults — not re-set); any change that shrinks or re-orders the result set bundles `cursor: null` in the same setter call; the base-query helper `scopedInvoices(orgId).active() / .archived() / .includingDeleted()` is the only sanctioned way reads touch the store — a bare `store.invoices` read elsewhere (outside the helper and the inspector's count panels) is a code-review red flag; every write carries tenancy + lifecycle + `version` preconditions, and a stale precondition returns the canonical conflict Result with a `current` payload so the client renders the conflict without a second fetch; `useActionState` drives the success path and the conflict banner; the table layers `useOptimistic` on archive, where the optimistic value expires when the transition ends — not a throw-triggered rollback; `useDeferredValue` + `useTransition` keep the search box responsive while `nuqs`'s `limitUrlUpdates: debounce(ms)` bounds the URL write.
The chapter ships 1 overview + 4 implementation lessons; each implementation lesson ends on a runnable, verifiable state.

### Dependency carry-in

This project models the SQL-backed units' shapes against an in-memory store, so the carry-ins below are *concepts and contracts* — the runtime artifacts (Postgres, Drizzle, Better Auth) are stood in for by `src/server/store.ts` (the "database"), `src/server/session.ts` (a cookie-driven dev session), and `pushAudit` (the audit writer).

- **From chapter 047 (the CRUD baseline):** the `updateInvoice` action returning the canonical Result shape, the `useActionState`-driven edit form, the shadcn form primitives. The starter ships this baseline already wired (the update applies edits unconditionally — the silent last-write-wins bug fixed in lesson 5).
- **From chapter 041 (the data shape):** the `Invoice` type (`src/server/types.ts`) with `customerName`, `total` (string), `status`, plus the lifecycle fields `deletedAt` / `archivedAt` / `version`; the `listInvoices` + `getInvoiceDetail` reads in `src/lib/invoices/queries.ts`; the keyset-cursor concept (here implemented as `cursorAfter(id)` over the sorted array). The composite index `(orgId, status, createdAt desc, id desc)` and the partial unique index are described in the inspector's index panel, not run against a live DB.
- **From chapter 059 (tenancy + RBAC):** the `authedAction(role, schema, fn)` wrapper in `src/lib/authed-action.ts` (session → `roleAtLeast` gate → Zod parse → `fn`), the active-org slot in the session, `pushAudit(entry)` as the audit writer. `tenantDb` is replaced by spelling the org filter inline (`inv.orgId === orgId`) inside `scopedInvoices`.
- **From chapter 060 (URL-state):** `nuqs` installed, `<NuqsAdapter>` wrapped at the root layout, the `searchParamsCache` pattern, `useQueryState` / `useQueryStates`, `parseAsStringEnum` / `parseAsString`, the `{ shallow: false }` write policy, the cursor-reset-on-other-change rule, the `useDeferredValue` + `useTransition` + `limitUrlUpdates: debounce(ms)` search rhythm.
- **From chapter 061 (lifecycle + concurrency):** the `deletedAt` / `archivedAt` / `version` fields (already on the `Invoice` type), the base-query helper API surface (`active()`, `archived()`, `includingDeleted()`), the version-precondition write shape, the conflict Result shape with `current`, the `useActionState`-driven conflict UX.
- **From chapter 033:** the Server Component `searchParams` async prop. The list page is a single Server Component with a two-column grid and `loading.tsx` skeletons — no parallel routes or `@list` / `@detail` slots in this starter.
- **From chapter 004 / chapter 005 / chapter 042:** Zod 4 schemas, `z.strictObject`, `z.infer`, `z.coerce` at the FormData boundary.
- **Audit discipline (forward to lesson 3 of chapter 081):** `pushAudit` is invoked from the update, archive, restore, and soft-delete actions in the same atomic step as the store mutation.

### Starter file tree (stubs marked with TODO)

```
package.json                   # provided: dev, build, verify, test:lesson scripts (no db:migrate/db:seed — no DB)
src/
  server/
    types.ts                   # provided: Invoice, InvoiceStatus, Role, AuditLog types + roleAtLeast
    store.ts                   # provided: in-memory singleton "database" — seeded invoices/auditLogs + findInvoice/pushAudit/reseed
    session.ts                 # provided: cookie-driven dev session — getSession + setActingIdentity
  lib/
    result.ts                  # provided: Result<T> union + ok/err/conflict constructors
    authed-action.ts           # provided: authedAction(role, schema, fn) wrapper
    utils.ts                   # provided: cn()
    invoices/
      search-params.ts         # TODO(L2): nuqs parsers + createSearchParamsCache for status, sort, q, view, cursor
      queries.ts               # TODO(L3) ×2: route listInvoices + getInvoiceDetail on view, gate `all` to admin
      scoped-query.ts          # TODO(L3): make active() / archived() / includingDeleted() honest
  app/
    layout.tsx                 # provided: NuqsAdapter + ThemeProvider + nav
    page.tsx                   # provided: redirect to /invoices
    _components/               # provided: providers.tsx, submit-button.tsx
    (app)/
      invoices/
        page.tsx               # provided: RSC reads searchParamsCache, calls listInvoices, renders Toolbar/ViewTabs/Chips/Table/Pagination
        loading.tsx            # provided: list skeleton
        toolbar.tsx            # TODO(L2): lift status/sort/search into the URL via useQueryStates
        view-tabs.tsx          # TODO(L2): write view via nuqs setter; TODO(L3): hide the All tab for non-admins
        active-filter-chips.tsx# TODO(L2): render a chip per non-default filter (uses ClearChip)
        clear-chip.tsx         # absent in start — new file the student creates in L2
        pagination.tsx         # TODO(L2): wire cursor next/first via useQueryState
        table.tsx              # TODO(L3): lifecycle badges + "Archived on …"; TODO(L4): row actions + optimistic archive
        [id]/edit/
          page.tsx             # provided: loads invoice via getInvoiceDetail, renders EditForm
          loading.tsx          # provided: edit-form skeleton
          edit-form.tsx        # TODO(L5): render ConflictBanner on the conflict branch
          conflict-banner.tsx  # TODO(L5): show current values + Use latest / admin Overwrite
    inspector/
      page.tsx                 # provided: row counts, identity switcher, reset-and-reseed, force-version-drift, audit tail, index panel
      loading.tsx              # provided: inspector skeleton
      actions.ts               # provided: resetAndReseed, switchIdentity, forceVersionDrift
lesson-verification/           # absent in start — test harness lives in solution only
```

`src/lib/invoices/actions.ts` is provided with the chapter-047 `updateInvoice` baseline (applies edits unconditionally — the silent last-write-wins bug) plus three `err('internal', 'Not implemented')` lifecycle stubs: `TODO(L4)` ×3 implement archive / restore / softDelete, `TODO(L5)` adds the version precondition + conflict + overwrite to `updateInvoice`.
There is no Docker, no Postgres, no migrations, and no `.env`: the store seeds itself deterministically on import and the session is a cookie naming one of four seeded identities (default `org-acme:admin`).
`version` is seeded at 1 on every fresh row (the seeded archived/soft-deleted rows ship at 2/3 to make their drift observable).
The scoped helper is wired but dishonest in the starter: `active()`, `archived()`, and `includingDeleted()` all return the same full org list, so the view tabs render but never branch — the bug the student fixes in lesson 3. A bare `store.invoices` read outside the helper (and the inspector's count panels) is the review red flag.

### Reference solution signatures lessons display

- **Parsers and search-params cache** (`src/lib/invoices/search-params.ts`):
  - `status: parseAsStringEnum(['draft', 'sent', 'paid', 'overdue'])` — nullable, no default (a non-matching value strips).
  - `sort: parseAsStringEnum(['-createdAt', 'createdAt', '-total', 'total', '-customer', 'customer']).withDefault('-createdAt')`
  - `q: parseAsString.withDefault('')` — the URL-write rhythm is the search input's concern, set on the `useQueryStates` hook as `{ shallow: false, limitUrlUpdates: debounce(300) }` (chapter 060 lesson 3; `throttleMs` is deprecated in nuqs 2.5.0, and history `replace` / `scroll: false` are already nuqs defaults — don't re-set them)
  - `view: parseAsStringEnum(['active', 'archived', 'all']).withDefault('active')` — `all` is RBAC-gated at the read.
  - `cursor: parseAsString` — nullable, no default.
  - `invoiceListSearchParams = { status, sort, q, view, cursor }`
  - `invoiceListSearchParamsCache = createSearchParamsCache(invoiceListSearchParams)`
- **Scoped query helper** (`src/lib/invoices/scoped-query.ts`):
  - `scopedInvoices(orgId: string)` returns `{ active(), archived(), includingDeleted() }`, each an `InvoiceQuery` — a chainable in-memory builder (`.filter()`, `.sort()`, `.cursorAfter()`, `.take()`, `.hasPrev()`, `.hasMoreThan()`, `.find()`) over the store rows pre-filtered by `inv.orgId === orgId` plus the lifecycle predicate. This is the in-memory analogue of a Drizzle `.$dynamic()` builder; the org filter is spelled inline rather than threaded through a tenant client.
  - `activeFilter(inv) = inv.deletedAt === null && inv.archivedAt === null`
  - `archivedFilter(inv) = inv.archivedAt !== null && inv.deletedAt === null`
- **List query** (`src/lib/invoices/queries.ts`):
  - `listInvoices({ orgId, view, status, sort, q, cursor, role, pageSize = 20 }): { rows: Invoice[]; nextCursor: string | null; hasPrev: boolean }` — `resolveView(view, role)` collapses `all` → `active` for non-admins, then routes to `active() / archived() / includingDeleted()`; composes status filter, `q` substring match against `customerName` or `number`, sort, and `cursorAfter`; reads `hasMoreThan(pageSize)` to compute `nextCursor`. Synchronous (no `Promise` — the store is in-memory).
  - `getInvoiceDetail({ orgId, id, role }): Invoice | null` — checks `archived()` first (so a row can be restored), then `active()`, then `includingDeleted()` gated to admin.
- **Actions** (`src/lib/invoices/actions.ts`):
  - `archiveInvoice = authedAction('member', z.strictObject({ id: z.string(), version: z.coerce.number().int() }), archive)` — `findInvoice(ctx.orgId, id)`; if `version` mismatches or `archivedAt`/`deletedAt` already set, return `conflict(message, row)`; else set `archivedAt = new Date().toISOString()`, `version += 1`, `pushAudit(...)`, `revalidatePath('/invoices')`, return `ok(row)`.
  - `restoreInvoice = authedAction('member', lifecycle, restore)` — clears both `archivedAt` and `deletedAt` (the admin path may restore a soft-deleted row); restoring an already-live row is itself a conflict.
  - `softDeleteInvoice = authedAction('admin', lifecycle, softDelete)` — sets `deletedAt`, gated on admin at the action.
  - `updateInvoice = authedAction('member', updateInvoiceSchema, ...)` — schema adds `version: z.coerce.number().int()` and `overwrite: z.coerce.boolean().default(false)`; on `!overwrite && row.version !== input.version` returns `conflict(message, row)`; `overwrite` is re-gated to admin inside the action (`roleAtLeast(ctx.role, 'admin')`).
- **Form** (`edit-form.tsx`):
  - Hidden uncontrolled `<input type="hidden" name="version" defaultValue={seed.version} />`; the field block is `key`ed on `` `${seed.id}:${seed.version}` `` so it remounts with fresh defaults when the seed advances (on `ok` to the returned row, or on "Use latest" to `current`).
  - `useActionState(updateInvoice, null)` returns `Result<Invoice>`; a `useEffect` mirrors the result into `seed`/`conflictRow` state; the conflict branch reads `error.current` and renders `<ConflictBanner current={...} onUseLatest={...} onOverwrite={...} canOverwrite={roleAtLeast(role, 'admin')} />`.
  - The form's `action` is a thin client wrapper that calls the `useActionState` dispatcher (`action(formData)`) so React's `$ACTION_*` progressive-enhancement inputs do not leak into the `z.strictObject` parse; "Overwrite anyway" builds `FormData` from a `formRef` and sets `overwrite=true`.
- **Env entries:** none — there is no `.env` in this project.

### Inspector page spec

A single Server Component at `/inspector` for verification, reading the current identity from the session cookie:

- **Row-counts banner:** counts of `total` / `active` / `archived` / `deleted` invoices for the current org, computed from `store.invoices` via `activeFilter` / `archivedFilter` (one of the two sanctioned direct-read surfaces). Updates after every action.
- **Acting-identity switcher:** a `<select>` over the four seeded identities (`org-acme:admin/member`, `org-globex:admin/member`) posting to `switchIdentity`, which writes the `acting-identity` cookie — drives both the org boundary and RBAC verification.
- **Reset and re-seed:** a form posting to `resetAndReseed` (calls `reseed()` + revalidates), restoring the deterministic seed.
- **"Force version drift" tool:** a debug control posting to `forceVersionDrift`, which bumps a target row's `version` directly (bypassing the action layer) — used in the two-tabs lesson to reproduce the conflict deterministically. It targets a stable always-live row (`inv-0001`) and includes an "Open in two tabs (edit this invoice)" link to that row's edit page.
- **Audit-log tail:** the last 20 `auditLogs` entries for the current org, refreshed on Server Component re-render. Each update / archive / restore / soft-delete writes here.
- **Index & query-plan panel:** a static explainer describing the SQL-backed version's partial unique index (`UNIQUE (org_id, number) WHERE deleted_at IS NULL`) and the index-scan list query — there is no live `EXPLAIN ANALYZE` because the data layer is the in-memory store; the project runs the same *shapes* against arrays.

The inspector is provided in full; the student writes only the actions and parsers it exercises.

### Concepts demonstrated → owning lesson

- URL-vs-component state for list views, share-and-refresh contract — lesson 1 of chapter 060.
- `router.replace` + `{ scroll: false }` policy — lesson 1 of chapter 060.
- `nuqs` parsers, defaults, `createSearchParamsCache`, `useQueryState` / `useQueryStates` — lesson 1 of chapter 060.
- Filter, sort, view-tab encoding; the cursor-reset rule on other-change — lesson 2 of chapter 060.
- Search with `useDeferredValue` + `useTransition` + `nuqs` `limitUrlUpdates: debounce(ms)` — lesson 3 of chapter 060.
- Cursor pagination URL shape, next-extra-row trick — lesson 4 of chapter 060 (built on lesson 6 of chapter 038).
- Soft delete vs. archive vs. restore semantics; partial unique index (described in the inspector, demonstrated via the seeded colliding pair) — lesson 1 of chapter 061.
- Base-query helper (`scopedInvoices(orgId)`, org filter inline) exposing `active()` / `archived()` / `includingDeleted()` — lesson 2 of chapter 061.
- `version`-field optimistic concurrency, conflict Result with `current`, refresh-and-retry — lesson 3 of chapter 061.
- `useActionState` for the conflict surface, plus `useOptimistic` on archive (the optimistic value expires when the transition ends) — lesson 5 of chapter 044, lesson 3 of chapter 061.
- `authedAction(role, schema, fn)`, the org filter inline in the helper, `pushAudit` in the same atomic step as the mutation — chapter 057, chapter 059.
- Server-side `searchParams` reads in a Server Component — lesson 4 of chapter 033.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — chapter 042.

---

## Lesson 1 — Project Overview

The student leaves with the starter running locally — the list view and edit form render, but the toolbar filters are local state only, the view tabs and pagination do nothing, the scoped helper returns the same rows for every view, the lifecycle actions are unimplemented, and the update path silently overwrites on a two-tab race. No feature is built.

### What we're building

We take the Unit 6 invoice CRUD surface and ship the production list view every SaaS app eventually grows into: URL-state filter, sort, search, and cursor pagination; soft delete plus archive as two distinct lifecycle states; restore from an Archived tab; and optimistic concurrency on update that turns a silent two-tab overwrite into a real conflict with a refresh-and-retry surface.
The data layer is an in-memory store standing in for Postgres, so the whole project boots with `pnpm dev` — no database, no Docker, no env — and the patterns (one scoped read helper, version-preconditioned writes, an `authedAction` wrapper, audit writes) stay the focus.
Show one screenshot of the finished `/invoices` page with the toolbar, the table, the active-filter chips, the pagination row, and the view tabs all visible.

### What we'll practice

- Promoting view-state (filter, sort, search, cursor, visibility) out of component state and into the URL so a view is shareable and survives refresh.
- Composing a lifecycle-aware, tenant-scoped base-query helper so reads cannot forget the org filter or the `deletedAt`/`archivedAt` lifecycle filter.
- Adding tenancy + lifecycle + `version` preconditions to every write and turning a stale precondition into an honest conflict.
- Wiring `useActionState` to handle the success path and the conflict banner in one shape, and layering `useOptimistic` on archive so a row leaves the table on click and reappears when the optimistic value expires on a returned `{ ok: false }` (not a throw-triggered rollback).

### Architecture

A labeled list of the moving parts and how they connect:

- The `/invoices` page is a Server Component that parses the URL via a `nuqs` `searchParamsCache`, reads the session, and calls `listInvoices` with the parsed slice plus the session's `orgId`/`role`.
- The toolbar and view-tabs are Client Components that write filter/sort/search/view/cursor back to the URL via `nuqs` setters (`{ shallow: false }`), bundling `cursor: null` on any change that re-orders or shrinks the result set.
- `listInvoices` reads exclusively through `scopedInvoices(orgId).active() / .archived() / .includingDeleted()`, routing on the `view` param (with `all` collapsed to `active` for non-admins at the read).
- The lifecycle and update actions are `authedAction`-wrapped, apply their store mutation only when the tenancy + lifecycle + `version` precondition holds, and `pushAudit` in the same atomic step.
- The edit form carries a hidden `version` field; on a conflict it renders a banner built from the `current` payload the action returns in the same round trip.
- The `/inspector` page is the verification surface: row counts, an identity switcher, reset-and-reseed, force-version-drift, and the audit tail.

### Starting file tree

See the annotated tree in the Chapter framing above. The files carrying TODOs the student fills are `search-params.ts`, `scoped-query.ts`, `queries.ts`, `actions.ts`, `toolbar.tsx`, `view-tabs.tsx`, `active-filter-chips.tsx`, `pagination.tsx`, `table.tsx`, `edit-form.tsx`, and `conflict-banner.tsx`, plus the new `clear-chip.tsx`; everything else is provided.

### Roadmap

One Card per lesson in a CardGrid:

- **Lesson 2 — Move every control to the URL.** Adds the `nuqs` parsers, the `searchParamsCache`, the toolbar, the view-tabs setter, active-filter chips (and the new `ClearChip`), and cursor pagination, with the deferred-search rhythm, so filter/sort/search/view/page all live in the URL.
- **Lesson 3 — Scoped reads and the view tabs.** Makes `scopedInvoices(orgId)`'s three views honest and routes `listInvoices` / `getInvoiceDetail` on the `view` param with RBAC gating, so the Active / Archived / All tabs each return the right rows.
- **Lesson 4 — Archive, restore, and delete.** Implements the `archiveInvoice`, `restoreInvoice`, and `softDeleteInvoice` actions with audit writes and wires them into the row action menu, with optimistic archive in the table.
- **Lesson 5 — Two tabs, one winner.** Adds the `version` precondition to `updateInvoice`, returns a conflict with `current`, and renders the conflict banner with "Use latest" and an admin-gated "Overwrite anyway".

### Setup

The starter is the project folder for this chapter; list the bring-up in a Steps component: `pnpm install`, then `pnpm dev`. There is no Docker, no Postgres, no migration, and no `.env` — the in-memory store seeds itself on first import and the session is a cookie naming one of the seeded identities (default `org-acme:admin`).
On success, `pnpm dev` serves the list view and edit form, but in the unfinished starter state: the toolbar filters are local state only (refresh wipes them), the view tabs and pagination buttons do nothing, every tab shows the same rows (the scoped helper does not branch), there are no archive/restore actions, and the update path silently overwrites on a two-tab race.
Point the student at `/inspector` as the verification surface every later lesson uses: the row-counts banner, the acting-identity switcher (to verify org and RBAC behavior), reset-and-reseed, the "Force version drift" tool with its "open in two tabs" link, and the audit-log tail.
Each implementation lesson is verified with `pnpm test:lesson <n>` against `lesson-verification/Lesson <n>.ts`.

---

## Lesson 2 — Move every control to the URL

Take the toolbar's local filter state and lift filter, sort, search, view, and cursor into the URL, so any view is a paste-able link that survives a refresh.
Finished result: clicking any control rewrites the URL, the active-filter chips render above the table, pagination advances the cursor, and the search box stays responsive while it writes — and pasting that URL into a fresh tab reproduces the view exactly.

### Your mission

This is the URL-state layer of the production list view.
The URL is the source of truth for every piece of view-state that should survive a refresh, a share, or the back button — filter, sort, search, cursor, and the visibility tab — and the page is a Server Component that reads that URL through a `nuqs` `searchParamsCache` while the toolbar, view-tabs, chips, and pagination Client Components write back through `nuqs` setters.
Default values stay out of the URL: `nuqs` strips them, so the bare `/invoices` is the home state and only differences from default appear.
The invariant that keeps pagination honest is that every setter which re-orders or shrinks the result set bundles `cursor: null` in the same call — miss it on a single setter and you ship the canonical stale-cursor bug.
History `replace` and `{ scroll: false }` are already nuqs defaults (don't re-set them), so a fast-changing filter does not bury the back button under fifty entries; keep the search box responsive with `useDeferredValue` + `useTransition` driving the URL write while `nuqs`'s `limitUrlUpdates: debounce(300)` bounds how often it commits, rather than a hand-rolled debounce.
Out of scope for this lesson: the view tabs write `view` to the URL but every tab still returns the same rows — making the scoped helper branch on `view` is the next lesson; lifecycle actions and the version precondition come later still.

- Clicking a status, sort, or view control rewrites the URL to reflect it, and clearing back to defaults leaves the bare `/invoices` URL with no query string.
- Copying the URL into a fresh tab reproduces the identical list, and a hard reload preserves filter, sort, cursor, and view.
- The active-filter chips render above the table for every non-default filter, and each chip's clear control removes that filter (and the cursor) from the URL.
- Clicking Next advances the list by carrying a new `cursor` in the URL; the cursor is dropped whenever the status, sort, search, or view changes, so the new result set starts at page one.
- Typing a long query fast keeps the input perfectly responsive while the URL settles roughly every 300ms, leaving only one or two back-button entries rather than one per keystroke.

### Coding time

Direct the student to fill the parsers, the page wiring, the toolbar, the pagination control, and the chips against the brief and the tests, then attempt it before opening the solution.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/search-params.ts`: define the five parsers (`status`, `sort`, `q`, `view`, `cursor`) and export `invoiceListSearchParams` plus `invoiceListSearchParamsCache` via `createSearchParamsCache`, matching the reference signatures above. (The page wiring and the `listInvoices` arg shape are already provided — the page passes `...parsed` plus the session's `orgId`/`role` into `listInvoices`, and `q` already matches `customerName` or `number` as a substring; this lesson only fills the parsers and the client write-back.)
- `app/(app)/invoices/toolbar.tsx`: replace the local `useState` controls with `useQueryStates(invoiceListSearchParams, { shallow: false, limitUrlUpdates: debounce(300) })` — status select, sort select, and a search input. Every setter bundles `cursor: null`. The search input holds typed state in `useState` and syncs via `useDeferredValue` + `useTransition` to `setQueryStates({ q: deferred || null, cursor: null })` (empty coerces to `null` so the param strips). `shallow: false` is load-bearing (the default `shallow: true` is client-only and never re-queries the server); chapter 060 lesson 3.
- `app/(app)/invoices/view-tabs.tsx`: add the `onClick` handler that writes `{ view, cursor: null }` via `useQueryStates`. (The All-tab-for-admins gate is lesson 3; for now render all three.)
- `app/(app)/invoices/pagination.tsx`: read `cursor` via `useQueryState('cursor', ...withOptions({ shallow: false }))`; receive `nextCursor` and `hasPrev` as props from the server. "Next" calls `setCursor(nextCursor)`, "First page" calls `setCursor(null)`; explain the senior call to take the simpler "next + first" path for this lesson versus a full bidirectional cursor stack.
- `app/(app)/invoices/active-filter-chips.tsx` + the new `clear-chip.tsx`: the chips are a Server Component reading `parsed` and emitting a chip for each non-default `status` / `q` / `sort`; each chip embeds a Client `<ClearChip param="status" label="…" />` (new file) calling `setQueryStates({ [param]: null, cursor: null })`.
- The root layout is already wrapped in `<NuqsAdapter>` (chapter 060) — note it is load-bearing, not something to add.
- Decision rationale to surface: why defaults are stripped (clean shareable URLs), why `cursor: null` rides along on every shrinking/reordering setter, why the deferred value (not the raw input) drives the URL write. For the `nuqs` parser and `searchParamsCache` mechanics link to chapter 060 rather than re-explaining.

### Moment of truth

Run `pnpm test:lesson 2` (state the expected pass output) covering the URL-encoding and cursor-reset behavior.
Then confirm by hand, ticking each off:

- Click status `paid`, sort by total descending, click Next; the URL shows `?status=paid&sort=-total&cursor=...`. Clear filters; the URL becomes a bare `/invoices`.
- Copy any URL into a fresh tab; the list renders identically. Hard reload; filter, sort, cursor, and view all survive.
- With a non-null cursor, change the status; the URL drops `cursor` and the list shows page one of the new filter (repeat for sort, search, and view).
- Type a fast 30-character query; the input never lags, the URL writes settle roughly every 300ms, and the back-button count stays at one or two entries rather than thirty.
- Note the expected partial state: the view tabs now write `view` to the URL, but every tab still returns the same rows (the scoped helper does not yet branch on `view`) — fixed in lesson 3.

---

## Lesson 3 — Scoped reads and the view tabs

Make the scoped helper's three views honest and route the read on the `view` param, so the Active / Archived / All tabs each return the right rows.
Finished result: switching tabs returns the correct row set — Active hides archived and deleted rows, Archived shows the seeded archived row, and All (admin only) shows the seeded soft-deleted row with a "Deleted" badge — while a member who hand-types `?view=all` is quietly served `active` rows.

### Your mission

This lesson installs the read discipline the whole project leans on.
Right now `scopedInvoices(orgId)`'s `active()`, `archived()`, and `includingDeleted()` all return the same full org list — they are tenant-scoped but not lifecycle-aware, so every view tab shows the same rows.
You make them honest: `active()` applies `activeFilter` (no `deletedAt`, no `archivedAt`), `archived()` applies `archivedFilter` (archived but not deleted), `includingDeleted()` returns the whole org slice. The org filter is spelled inline (`inv.orgId === orgId`) inside the helper rather than threaded through a tenant client — this in-memory builder is the analogue of a chainable Drizzle `.$dynamic()` builder, and it makes "I forgot the filter" structurally impossible at sanctioned reads; the convention that a bare `store.invoices` read elsewhere is a review red flag is the second-layer defense.
Route `listInvoices` and `getInvoiceDetail` on the `view` param, and enforce the RBAC gate at the read, not just in the toolbar: `resolveView(view, role)` drops `all` to `active` unless `role === 'admin'`, so a member who hand-types the URL is refused at the data layer.
The status filter, search, sort, and cursor compose onto whichever builder the helper returns.
Also gate the All tab to admins in `view-tabs.tsx` and add the lifecycle badges ("Deleted" / "Archived") and the "Archived on …" line in `table.tsx`.
Lean on the already-seeded archived and soft-deleted rows to confirm the tabs; the actions that create new lifecycle states come in the next lesson.

- Switching to the Archived tab returns the seeded archived row (and only archived rows); switching to Active hides both archived and soft-deleted rows.
- As an admin, the All tab returns every row including the seeded soft-deleted one, marked with a "Deleted" badge; the detail page for an archived invoice loads (for everyone), and for a soft-deleted invoice loads only for admin.
- As a member, the All tab is absent from the tabs, and hand-typing `?view=all` serves `active` rows — the refusal happens at the read in `resolveView`.
- The inspector's index panel describes the partial composite index the SQL-backed list query would use; verification here is the row sets, not a live query plan.

### Coding time

Direct the student to make the helper honest and route the reads against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/scoped-query.ts`: implement the three views so each pre-filters the org slice by its lifecycle predicate — `active()` → `activeFilter`, `archived()` → `archivedFilter`, `includingDeleted()` → no lifecycle filter. The `activeFilter` / `archivedFilter` predicates are already exported and shared with the inspector's count panels; the `InvoiceQuery` builder (`filter`/`sort`/`cursorAfter`/`take`/`hasPrev`/`hasMoreThan`/`find`) is provided.
- `listInvoices`: add `resolveView(view, role)` (collapses `all` → `active` for non-admins) and route to `scoped.archived()` / `scoped.includingDeleted()` / `scoped.active()`. Status filter, search, sort, and `cursorAfter` compose on the returned builder.
- `getInvoiceDetail`: check `archived()` first (so an archived row's detail page loads for restore), then `active()`, then `includingDeleted()` gated to `role === 'admin'` for a soft-deleted row.
- `view-tabs.tsx`: conditionally render the All tab only when `role === 'admin'`. `table.tsx`: render the `Deleted` / `Archived` badges and, in the Archived view, the "Archived on …" date line.
- Decision rationale to surface: why the RBAC gate lives at the read and not only at the tab-hide (defense at the data layer), and why exporting the shared filter predicates keeps the inspector's counts consistent with the list. Link to lesson 2 of chapter 061 for the helper pattern itself rather than re-deriving it.
- This lesson completes the view-tab behavior the toolbar wired in lesson 2 but could not yet satisfy.

### Moment of truth

Run `pnpm test:lesson 3` (state the expected pass output) covering the `view` routing and the RBAC gate.
Then confirm by hand:

- Switch to Archived; the seeded archived row appears and active rows do not. Switch to Active; the archived and soft-deleted rows are hidden.
- As admin (via the inspector's identity switcher), switch to All; the seeded soft-deleted row appears with a "Deleted" badge. Open its detail page (loads for admin); confirm an archived invoice's detail page also loads.
- Switch to `org-acme:member`; confirm the All tab is hidden; hand-type `?view=all` and confirm the list still returns `active` rows.
- Read the inspector's index panel to connect the in-memory shapes to the SQL-backed index scan they model.

---

## Lesson 4 — Archive, restore, and delete

Implement the three lifecycle Server Actions — archive, restore, and soft-delete — each writing an audit entry in the same atomic step, and wire them into the row action menu with optimistic archive.
Finished result: archiving a row from the Active tab makes it vanish and reappear under Archived with a Restore button; Restore returns it to Active; and an admin can soft-delete a row so it disappears from the default list and surfaces under All with a "Deleted" badge — every action recorded in the audit-log tail.

### Your mission

With reads routed on lifecycle state, this lesson adds the writes that move rows between those states.
The three actions are `authedAction`-wrapped so role enforcement and Zod parsing happen at the boundary: archive and restore are open to `member`, soft-delete is gated to `admin` at the action.
Each action loads its row through `findInvoice(ctx.orgId, id)` (tenancy is not hand-typed — the org comes from the session ctx), checks its `version` + lifecycle precondition (archive only touches rows that are active, restore only rows in a non-live state, soft-delete only rows not already deleted), then mutates the store and `pushAudit(...)` in the same atomic step — in real Postgres this would be one `db.transaction`. A stale precondition returns `conflict(message, row)` rather than a silent clobber (the rich conflict UX for the edit path lands next lesson; the lifecycle actions surface a toast).
The partial unique index on `(orgId, number) WHERE deleted_at IS NULL` is what lets a soft-deleted `ACME-1001` and a live `ACME-1001` coexist in the SQL-backed version; the seed already ships that colliding pair (`inv-0001` live and `inv-deleted-1` soft-deleted, both numbered `ACME-1001`), and the inspector's index panel describes the constraint that enables it.
Wiring `useOptimistic` on archive so the row leaves the table the instant the user clicks (and reappears when the optimistic value expires at the end of the transition on a returned `{ ok: false }` — not a throw-triggered rollback, per chapter 061 lesson 3) is the senior reach taken here.

- Archiving a row from the Active tab removes it from the default list and surfaces it under the Archived tab with an "Archived on …" label and a Restore button; the audit-log tail records the event.
- Clicking Restore from the Archived tab returns the row to Active, and the audit-log tail records it.
- As an admin, soft-deleting a row removes it from the default list and surfaces it under All with a "Deleted" badge; the soft-delete control is absent for a member.
- The seed's colliding pair (a live and a soft-deleted invoice sharing number `ACME-1001`) demonstrates the number-reuse the partial unique index enables.
- Each lifecycle action writes its audit entry in the same atomic step as the mutation, so the inspector's row-counts banner and audit-log tail both move together after every action.

### Coding time

Direct the student to implement the three actions and the row-menu wiring against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/actions.ts` (the `archive` / `restore` / `softDelete` `Not implemented` stubs):
  - `archive`: `findInvoice(ctx.orgId, input.id)`; if missing → `err('not_found', …)`; if `row.version !== input.version || row.archivedAt !== null || row.deletedAt !== null` → `conflict(CONFLICT_MESSAGE, row)`; else `row.archivedAt = new Date().toISOString()`, `row.version += 1`, `pushAudit({ orgId, actorUserId, action: 'invoice.archive', subjectId })`, `revalidatePath('/invoices')`, `ok(row)`.
  - `restore`: refuse if `version` mismatches or the row is already live (`archivedAt === null && deletedAt === null`); else clear both `archivedAt` and `deletedAt` (the admin path may restore a soft-deleted row — one action branches on the row's state rather than two), bump version, audit, revalidate.
  - `softDelete`: refuse on `version` mismatch or already-deleted; else set `deletedAt`, bump version, audit, revalidate. Admin-gating is on the `authedAction('admin', …)` wrapper.
- `app/(app)/invoices/table.tsx`: lift one `useActionState` per lifecycle action to the table (so the result/toast survives the row's optimistic removal); add `useOptimistic(rows, (current, removedId) => current.filter(r => r.id !== removedId))` and a shared `useTransition` for archive. The Radix menu items unmount on select, so a `<button form=…>` submit never fires — instead each `DropdownMenuItem`'s `onSelect` calls the matching dispatcher directly with hand-built `id`+`version` FormData. Gate the menu items: Archive when active, Restore when `archivedAt && !deletedAt`, "Restore deleted" (also `restoreInvoice`) when `deletedAt && admin`, Delete when active && admin.
- Decision rationale to surface: why the audit write shares the action's atomic step (atomic with the lifecycle change), why the precondition is checked before the mutation, and why `useOptimistic` on archive is the senior reach (instant disappearance, with the optimistic value expiring at the end of the transition on a returned `{ ok: false }` rather than a throw-triggered rollback). The partial-unique-index recovery is described against the seeded colliding pair.

### Moment of truth

Run `pnpm test:lesson 4` (state the expected pass output) covering the three actions, the role gate, and the audit write.
Then confirm by hand:

- Archive a row from Active; it vanishes from the default list (instantly, via the optimistic update) and appears under Archived with the archive date and a Restore button; the audit-log tail shows the event.
- Click Restore from Archived; the row returns to Active; the audit-log tail shows the event.
- As admin, soft-delete a row; it vanishes from the default list and appears under All with a "Deleted" badge. As `org-acme:member`, confirm the Delete control is absent.
- Inspect the seeded colliding pair under All (a live and a soft-deleted invoice both numbered `ACME-1001`); read the inspector's index panel for why the partial unique index permits the reuse.
- Watch the inspector's row-counts banner and audit-log tail move together after each action, confirming the audit write rides with the mutation.

---

## Lesson 5 — Two tabs, one winner

Add the `version` precondition to `updateInvoice` so a two-tab edit returns an honest conflict, and render a conflict banner that lets the student refresh-and-retry without a second fetch.
Finished result: editing the same invoice in two tabs lets the first save win; the second submit renders a conflict banner with the current server values and "Use latest" / admin-gated "Overwrite anyway" affordances, and "Use latest" reloads the form so the resubmit succeeds.

### Your mission

This is the optimistic-concurrency layer that turns silent last-write-wins into a visible, recoverable conflict.
Every write in the project now checks tenancy + lifecycle + `version`, and missing any one is a distinct bug class — missing tenancy is the cross-tenant overwrite, missing lifecycle is the edit-a-soft-deleted-row bug, missing version is silent last-write-wins — so name all three. Tenancy is already enforced because the row is loaded via `findInvoice(ctx.orgId, id)` (a row from another org is simply not found); lifecycle is the `deletedAt !== null` guard; this lesson adds the `version` check.
The precondition is checked atomically against the freshly loaded row — never a `SELECT` in one request and an `UPDATE` in a later one, which would have a TOCTOU race; a mismatch is the honest conflict.
On that conflict the action returns the row it holds now as the `current` payload, sparing the client a refetch — the senior anchor from lesson 3 of chapter 061 — and the form rebuilds the conflict banner from it.
The table already layers `useOptimistic` on archive (lesson 4); name how the optimistic value expires when the transition ends on a returned `{ ok: false }` rather than throwing-and-rolling-back (the course returns Results, not throws — chapter 061 lesson 3). The edit form itself stays `useActionState`-only; it mirrors the result into seed/conflict state via `useEffect`.
"Overwrite anyway" is a sharp edge gated to admin (show-to-admin, hide-for-member), and the gate is re-checked inside the action (`roleAtLeast(ctx.role, 'admin')`) — a forged `overwrite=true` from a member is refused, and client-side tampering with the hidden `version` field just produces another conflict, with the server-side Zod parse as the front-line defense.
`updatedAt`-as-version is named as the existing-tables alternative, but the course default is the `version` field for its cheap, unambiguous precision.

- Editing the same invoice in two tabs lets the first submit succeed; the second submit returns a conflict and renders the conflict banner with the current server values.
- The conflict banner's "Use latest" pulls `current` into the form (the keyed remount resets the hidden `version` to `current.version`), so resubmitting succeeds; "Overwrite anyway" appears only for admins and resends the user's edits with `overwrite=true`, bypassing the precondition.
- Forcing version drift via the inspector's tool, then archiving the same row, shows the optimistic removal briefly before the row reappears as the conflict returns (the optimistic value expires when the transition ends) and a conflict toast fires.
- A lifecycle action (archive / restore / soft-delete) that hits a stale `version` surfaces a conflict toast ("This invoice changed elsewhere — refresh to retry") rather than the full banner.
- A forged submit carrying another org's invoice ID is not found in the acting org and takes the not-found path, so tenant isolation holds at the write just as it does at the read.

### Coding time

Direct the student to add the precondition, the conflict branch, and the conflict banner against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `updateInvoice` (`actions.ts`): add `version: z.coerce.number().int()` and `overwrite: z.coerce.boolean().default(false)` to `updateInvoiceSchema`. Load the row via `findInvoice(ctx.orgId, input.id)`; `not_found` if missing or `deletedAt !== null`; if `input.overwrite && !roleAtLeast(ctx.role, 'admin')` return `err('forbidden', …)`; if `!input.overwrite && row.version !== input.version` return `conflict(CONFLICT_MESSAGE, row)` (the `conflict` helper from `result.ts` carries `current`); else apply the edits, `row.version += 1`, `pushAudit`, `revalidatePath`, `ok(row)`. The `current` row is returned in the same Server Action call — one round trip.
- `edit-form.tsx`: the hidden `version` field and the keyed field block are provided; add `conflictRow` state, mirror the action result via `useEffect` (on `ok` set `seed` to the returned row so the next save does not self-conflict; on a `conflict` code set `conflictRow` from `error.current`), wire `onUseLatest` (swap `seed` to `conflictRow`, clear it — the keyed remount resets the hidden version) and `onOverwrite` (build `FormData` from `formRef`, `set('overwrite', 'true')`, dispatch), and render `<ConflictBanner … canOverwrite={roleAtLeast(role, 'admin')} />`. Keep the form's `action` as the thin wrapper that calls the dispatcher so React's `$ACTION_*` inputs do not leak into the strict parse.
- `conflict-banner.tsx`: render `current.customerName` / `status` / `total`, a "Use latest" button always, and an "Overwrite anyway" button only when `canOverwrite`.
- Lifecycle actions' conflict path (already implemented in lesson 4): archive / restore / soft-delete return `conflict(message, row)` on a stale precondition; the table's `useResultToast` surfaces the conflict line as a toast (the row UI has no controlled form state to merge against) rather than the banner.
- Decision rationale to surface: the atomic precondition vs. a cross-request TOCTOU `SELECT`-then-`UPDATE`, the `current` payload as the one-round-trip refresh source, and the admin gate on overwrite re-checked server-side. Link to lesson 3 of chapter 061 for the concurrency pattern and to chapter 042 / lesson 4 of chapter 043 for the Zod boundary rather than re-explaining.

### Moment of truth

Run `pnpm test:lesson 5` (state the expected pass output) covering the version precondition, the conflict `current` payload, and the conflict branch.
Then confirm by hand:

- Open an invoice in two tabs (use the inspector's "open in two tabs" link); edit and save the first (confirm the version bumped in the inspector and audit log); edit and save the second; the conflict banner renders with the current server values. Click "Use latest"; the form reloads with the server's values and the new version; resubmit; it succeeds. Use the "Force version drift" tool to reproduce the race without a second tab.
- Force version drift on a row, then archive it from the table; the optimistic removal shows briefly, the row reappears when the conflict returns, and a conflict toast fires.
- Trigger a stale-version lifecycle action; confirm it surfaces a conflict toast rather than the full banner.
- Switch to `org-globex:admin` and hand-construct an edit URL for an `org-acme` invoice ID; the detail page is not found (the read is org-scoped). Submit a forged form with the other org's ID; the action's `findInvoice(ctx.orgId, id)` misses and the not-found path fires — tenant isolation holds at both read and write.
- Confirm the chapter acceptance bar end to end: every Project-goals behavior in the framing now holds. Forward references for the curious: Unit 13 wires a notification on archive/restore, Unit 14 adds tag-driven cache invalidation to the lifecycle actions, lesson 3 of chapter 081 hardens the audit discipline, and chapter 088 writes integration tests for the conflict path and the cross-tenant probe.
