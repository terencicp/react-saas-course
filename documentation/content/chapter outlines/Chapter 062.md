# Chapter 062 — Project: The production list view

## Chapter framing

Chapter 062 takes the Unit 6 CRUD surface (Chapter 047's invoices) and turns it into the production list view every SaaS app eventually ships: filter, sort, search, and cursor pagination all in the URL through `nuqs`; soft delete plus archive as two distinct lifecycle states; restore from an Archived tab; optimistic concurrency via a `version` column that turns silent last-write-wins into a real 409 with a refresh-and-retry conflict surface.
The schema layer (Unit 5), the Server Action shape (chapter 043), the tenant helper (chapter 056's `tenantDb`), and the RBAC wrapper (chapter 057's `authedAction`) are all in place — this chapter wires `searchParams` to the read, layers the soft-delete/archive base-query helper on top of `tenantDb`, and adds the `version` precondition to the update path.
The output is a list view a coworker can paste a URL of, refresh a hundred times, archive rows from, restore them, and race two tabs against — every behavior holds.

### Project goals

The finished list view is "done" when every one of these behaviors holds. They are the outcomes the build lessons each carry one slice of, and the architect should treat the set as the chapter's acceptance bar:

- Filter, sort, and page changes update the URL; defaults stay implicit (stripped from the URL).
- Refresh and share both reproduce the view: copying a URL into a fresh private window (same signed-in user) renders the identical list; a hard reload preserves filter, sort, cursor, and view.
- Deleting an invoice (admin only) removes it from the default `active` list; it reappears under `view=all` with a "Deleted" badge.
- `view=all` is RBAC-gated to admin: a member sees only `active` and `archived` tabs, and a member who hand-types `?view=all` is served `active` rows.
- Archive removes a row from the default list and surfaces it in the Archived tab with an "Archived on …" label and a Restore button; Restore returns the row to active and writes an audit-log entry.
- A partial unique index lets a soft-deleted invoice number be re-created: soft-delete `INV-0001`, create a fresh `INV-0001`, and the create succeeds.
- Editing the same invoice from two tabs returns a 409 on the second submit, with a conflict banner showing the current server values and "Use latest" / "Overwrite" affordances; "Use latest" resets the form to `current` and advances the hidden `version` so the resubmit succeeds.
- `useOptimistic` rolls back automatically on action failure, and the conflict banner renders alongside the rolled-back state.
- The search input stays responsive while URL writes are throttled (settling roughly every 200ms, no back-button spam).
- Any change that re-orders or shrinks the result set bundles `cursor: null`, so a filter/sort/search change drops the cursor and shows page one of the new result set.

Threads that run through every lesson: the URL is the source of truth for filter + sort + search + cursor + visibility; defaults are implicit; the page is a Server Component reading a `nuqs` `searchParamsCache`, the client writes via `nuqs` setters with `replace` and `{ scroll: false }`; any change that shrinks or re-orders the result set bundles `cursor: null` in the same setter call; the base-query helper `tenantDb(orgId).invoices.active() / .archived() / .includingDeleted()` is the only way reads touch the table — hand-written `.from(invoices)` is a code-review red flag; every UPDATE has tenancy + lifecycle + `version` preconditions in the `WHERE`; zero rows affected returns the canonical 409 Result with `current` payload so the client renders the conflict without a second fetch; `useActionState` + `useOptimistic` handle the success path, the rollback, and the conflict banner; `useDeferredValue` + `useTransition` keep the search box responsive without a hand-rolled debounce.
The chapter ships 1 overview + 4 implementation lessons; each implementation lesson ends on a runnable, verifiable state.

### Dependency carry-in

- **From chapter 047 (the CRUD starter):** `app/invoices/page.tsx`, the `createInvoiceInputSchema` / `updateInvoiceInputSchema` / `deleteInvoiceInputSchema` in `src/lib/invoices/mutation-schemas.ts`, the three Server Actions (`createInvoice`, `updateInvoice`, `deleteInvoice`) returning the canonical Result shape from lesson 2 of chapter 043, the `useActionState`-driven form components, the `useOptimistic` create wiring, the shadcn `<Form>` primitives.
- **From chapter 041 (the schema):** `invoices`, `invoice_lines`, `customers`, `organizations`, `org_members` tables; the `listInvoices` + `getInvoiceDetail` reads in `src/lib/invoices/queries.ts`; the cursor encode/decode helpers in `src/db/cursor.ts`; the composite index `invoices_org_status_created_id_idx` on `(organizationId, status, createdAt desc, id desc)` and `invoices_org_created_id_idx` on `(organizationId, createdAt desc, id desc)`.
- **From chapter 059 (tenancy + RBAC):** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, the active-org slot in the session, the `audit_logs` table and the `logAudit(tx, event)` helper.
- **From chapter 060 (URL-state):** `nuqs` installed, `<NuqsAdapter>` wrapped at the root layout, the `searchParamsCache` pattern, `useQueryState` / `useQueryStates`, `parseAsStringEnum` / `parseAsString` / `parseAsArrayOf`, the `replace`-only history policy, the cursor-reset-on-other-change rule, the `useDeferredValue` + `useTransition` search rhythm.
- **From chapter 061 (lifecycle + concurrency):** the `deletedAt` / `archivedAt` / `version` columns added in a migration (already in the starter — running the migration was a chapter 061 exercise), the base-query helper API surface (`active()`, `archived()`, `includingDeleted()`), the version-precondition UPDATE shape, the 409 Result shape with `current`, the `useActionState` + `useOptimistic` conflict UX.
- **From chapter 033 / chapter 035:** the Server Component `searchParams` async prop, parallel routes (`@list` + `@detail` from chapter 035's project — reused in the starter), `Suspense` boundaries with slot-specific skeletons.
- **From chapter 004 / chapter 005 / chapter 042:** Zod 4 schemas, `z.strictObject`, `z.infer`.
- **From lesson 3 of chapter 081 (forward dependency, helper provided):** the `logAudit` helper is invoked from the soft-delete, archive, restore, and update actions; the table is already in the schema.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml             # provided: postgres:18 service
drizzle.config.ts              # provided
.env.example                   # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET, RESEND_API_KEY, SEED
package.json                   # provided: db:migrate, db:seed, dev, build, test scripts
src/
  db/
    schema.ts                  # provided: full Unit 5 + chapter 061 schema with deletedAt, archivedAt, version, partial unique indexes
    client.ts                  # provided
    relations.ts               # provided
    cursor.ts                  # provided
  lib/
    tenant-db.ts               # provided: tenantDb(orgId) from chapter 056
    authed-action.ts           # provided: authedAction wrapper from chapter 057
    audit-log.ts               # provided: logAudit(tx, event)
    invoices/
      schema.ts                # provided: listInvoicesInputSchema (from chapter 041) plus new TODOs for the listSearchParams parsers
      queries.ts               # provided as-is from chapter 041; TODO student: refactor to go through scoped query helper, add archive/restore branches
      scoped-query.ts          # TODO student: the active() / archived() / includingDeleted() helper layered on tenantDb
      actions.ts               # TODO student: archive, restore, softDelete actions + version precondition on updateInvoice
      search-params.ts         # TODO student: nuqs parsers + createSearchParamsCache for status, sort, q, view, cursor
  app/
    (app)/
      invoices/
        page.tsx               # provided shell: reads searchParamsCache, calls listInvoices, renders <Toolbar /> + <Table /> + <Pagination />
        toolbar.tsx            # TODO student: <Filters /> + <Sort /> + <Search /> + <ViewTabs /> Client Component
        table.tsx              # provided shell; TODO student: row actions (archive, restore, edit, delete) wired to actions
        pagination.tsx         # TODO student: next/prev cursor wiring
        [id]/
          edit/
            page.tsx           # provided shell; reads invoice + version
            edit-form.tsx      # TODO student: useActionState + useOptimistic, hidden version field, conflict banner
    inspector/
      page.tsx                 # provided: row counts, "Reset and re-seed" button, RBAC switcher, "Force version drift" debug tool, audit-log tail
scripts/
  seed.ts                      # provided from chapter 041, plus a seeded "already archived" row and a "already soft-deleted" row
```

The starter ships everything from chapter 047 working: the existing Unit 6 list view and edit form render, but with no URL state (filters are local), no archive/restore buttons, and an update path that silently overwrites on a two-tab race.
The route segment moved from `app/invoices/[invoiceId]/edit-invoice-form.tsx` to `app/(app)/invoices/[id]/edit/edit-form.tsx` as part of the starter packaging (`[invoiceId]` → `[id]`); same component contract, new path, so the list and edit routes coexist cleanly.
The migration that added `deletedAt`, `archivedAt`, `version`, and the partial indexes is already applied, and `version` defaults to 1 across every existing row (the senior call from lesson 3 of chapter 061).
The base-query helper is empty intentionally; the existing `listInvoices` still uses raw `db.select().from(invoices).where(eq(invoices.organizationId, orgId))` — a bug by lesson 2 of chapter 061's standard that the student fixes in lesson 3.

### Reference solution signatures lessons display

- **Parsers and search-params cache** (`src/lib/invoices/search-params.ts`):
  - `statusParser = parseAsStringEnum(['draft', 'sent', 'paid', 'overdue']).withDefault(null)`
  - `sortParser = parseAsStringEnum(['-createdAt', 'createdAt', '-total', 'total', '-customer', 'customer']).withDefault('-createdAt')`
  - `qParser = parseAsString.withDefault('').withOptions({ throttleMs: 200, history: 'replace' })`
  - `viewParser = parseAsStringEnum(['active', 'archived', 'all']).withDefault('active')` — `all` is RBAC-gated.
  - `cursorParser = parseAsString.withDefault(null)`
  - `invoiceListSearchParams = { status: statusParser, sort: sortParser, q: qParser, view: viewParser, cursor: cursorParser }`
  - `invoiceListSearchParamsCache = createSearchParamsCache(invoiceListSearchParams)`
- **Scoped query helper** (`src/lib/invoices/scoped-query.ts`):
  - `invoiceScope(orgId: string)` returns `{ active(), archived(), includingDeleted() }`, each a chainable Drizzle builder pre-filtered by `eq(invoices.organizationId, orgId)` + the lifecycle predicate.
  - `activeFilter = sql\`${invoices.deletedAt} IS NULL AND ${invoices.archivedAt} IS NULL\``
  - `archivedFilter = sql\`${invoices.deletedAt} IS NULL AND ${invoices.archivedAt} IS NOT NULL\``
- **List query** (`src/lib/invoices/queries.ts`):
  - `listInvoices({ orgId, view, status, sort, q, cursor, pageSize = 20 }): Promise<{ rows: InvoiceWithCustomer[]; nextCursor: string | null; hasPrev: boolean }>` — routes to `active() / archived() / includingDeleted()` based on `view`; applies status filter; resolves sort to `orderBy` tuple; applies cursor predicate; `limit(pageSize + 1)`.
- **Actions** (`src/lib/invoices/actions.ts`):
  - `archiveInvoice = authedAction('member', z.strictObject({ id: z.string().uuid(), version: z.number().int() }), async ({ id, version }, ctx) => ...)` — UPDATE with `WHERE id = id AND organizationId = ctx.orgId AND version = version AND archivedAt IS NULL AND deletedAt IS NULL`, `SET archivedAt = NOW(), version = version + 1, updatedAt = NOW()`, returns `{ ok: true, data: row }` or `{ ok: false, error: { code: 'conflict', userMessage, current } }`.
  - `restoreInvoice = authedAction('member', z.strictObject({ id, version }), ...)` — clears whichever of `archivedAt` / `deletedAt` is set; same precondition shape.
  - `softDeleteInvoice = authedAction('admin', z.strictObject({ id, version }), ...)` — sets `deletedAt = NOW()`, gated on admin role.
  - `updateInvoice` is the existing chapter 047 action, refactored to add the `version` precondition and the `conflict` branch.
- **Form** (`edit-form.tsx`):
  - Hidden `<input type="hidden" name="version" value={invoice.version} />`.
  - `useActionState(updateInvoice, initialState)` returns `{ ok, error?, data? }`; conflict branch reads `error.current` and renders a `<ConflictBanner current={...} onUseLatest={...} onOverwrite={...} />`.
- **Env entries:** unchanged from chapter 047 / chapter 059 — no new entries.

### Inspector page spec

A single Server Component at `/inspector` for verification, all read from `searchParams`:

- **Header:** Org switcher (two seeded orgs), session-user switcher (admin user / member user — drives RBAC verification), "Reset and re-seed" form posting to a Server Action.
- **Row-counts banner:** counts of `invoices` total / `active` / `archived` / `soft-deleted` for the current org, computed via `includingDeleted()` plus filtered counts. Updates after every action.
- **Audit-log tail:** the last 20 `audit_logs` rows for the current org, streamed via Server Component refresh. Each archive / restore / soft-delete / update writes here.
- **"Force version drift" tool:** a debug control that runs a raw `UPDATE invoices SET version = version + 1 WHERE id = :id` against a target row, bypassing the action layer — used in the two-tabs lesson to reproduce the 409 deterministically without juggling two real tabs.
- **"Open this invoice in two tabs" helper:** a button that opens `/invoices/:id/edit` in a new window plus copies the URL — convenience for the manual two-tab race.
- **Live partial-index probe:** a small panel running `EXPLAIN ANALYZE` on the current list query and printing the index name used; verifies the `WHERE deletedAt IS NULL` partial index gets picked.

The inspector is provided in full; the student writes only the actions and parsers it exercises.

### Concepts demonstrated → owning lesson

- URL-vs-component state for list views, share-and-refresh contract — lesson 1 of chapter 060.
- `router.replace` + `{ scroll: false }` policy — lesson 1 of chapter 060.
- `nuqs` parsers, defaults, `createSearchParamsCache`, `useQueryState` / `useQueryStates` — lesson 1 of chapter 060.
- Filter, sort, view-tab encoding; the cursor-reset rule on other-change — lesson 2 of chapter 060.
- Search with `useDeferredValue` + `useTransition` + `nuqs` `throttleMs` — lesson 3 of chapter 060.
- Cursor pagination URL shape, next-extra-row trick — lesson 4 of chapter 060 (built on lesson 6 of chapter 038).
- Soft delete vs. archive vs. restore semantics; partial unique indexes — lesson 1 of chapter 061.
- Base-query helper composed with `tenantDb`; `active()` / `archived()` / `includingDeleted()` API — lesson 2 of chapter 061.
- `version`-column optimistic concurrency, 409 Result with `current`, refresh-and-retry — lesson 3 of chapter 061.
- `useActionState` + `useOptimistic` with conflict rollback — lesson 6 of chapter 044, lesson 3 of chapter 061.
- `authedAction(role, schema, fn)`, `tenantDb(orgId)`, audit-log writes in the same transaction — chapter 057, chapter 059.
- Server-side `searchParams` reads in a Server Component — lesson 4 of chapter 033.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — chapter 042.

---

## Lesson 1 — Project Overview

The student leaves with the chapter 047 starter running locally — the existing Unit 6 list view and edit form working, but with no URL state, no archive/restore, and a silent last-write-wins update path. No feature is built.

### What we're building

We take the Unit 6 invoice CRUD surface and ship the production list view every SaaS app eventually grows into: URL-state filter, sort, search, and cursor pagination; soft delete plus archive as two distinct lifecycle states; restore from an Archived tab; and optimistic concurrency on update that turns a silent two-tab overwrite into a real 409 with a refresh-and-retry conflict surface.
Show one screenshot of the finished `/invoices` page with the toolbar, the table, the active-filter chips, the pagination row, and the view tabs all visible.

### What we'll practice

- Promoting view-state (filter, sort, search, cursor, visibility) out of component state and into the URL so a view is shareable and survives refresh.
- Composing a lifecycle-aware base-query helper on top of the tenant helper so reads cannot forget the tenancy or the `deletedAt IS NULL` filter.
- Adding tenancy + lifecycle + `version` preconditions to every UPDATE and turning zero-rows-affected into an honest 409.
- Wiring `useActionState` + `useOptimistic` to handle the success path, the automatic rollback, and the conflict banner in one shape.

### Architecture

A labeled list of the moving parts and how they connect:

- The `/invoices` page is a Server Component that parses the URL via a `nuqs` `searchParamsCache` and calls `listInvoices` with the parsed slice.
- The toolbar is a Client Component that writes filter/sort/search/view/cursor back to the URL via `nuqs` setters (`replace`, `{ scroll: false }`), bundling `cursor: null` on any change that re-orders or shrinks the result set.
- `listInvoices` reads exclusively through `tenantDb(orgId).invoices.active() / .archived() / .includingDeleted()`, routing on the `view` param (with `all` gated to admin at the read).
- The lifecycle and update actions are `authedAction`-wrapped, run their UPDATE with tenancy + lifecycle + `version` preconditions, and write an audit-log row inside the same transaction.
- The edit form carries a hidden `version` field; on a 409 it renders a conflict banner built from the `current` payload the action returns in the same round trip.

### Starting file tree

See the annotated tree in the Chapter framing above. The highlighted focus — the files carrying TODOs the student fills — are `search-params.ts`, `scoped-query.ts`, `actions.ts`, `queries.ts`, `toolbar.tsx`, `table.tsx`, `pagination.tsx`, and `edit-form.tsx`; everything else is provided.

### Roadmap

One Card per lesson in a CardGrid:

- **Lesson 2 — Move every control to the URL.** Adds the `nuqs` parsers, the `searchParamsCache`, the toolbar, active-filter chips, cursor pagination, and the deferred-search rhythm so filter/sort/search/page all live in the URL.
- **Lesson 3 — Scoped reads and the view tabs.** Adds the `invoiceScope` helper on `tenantDb` and routes `listInvoices` on the `view` param with RBAC gating, so the Active / Archived / All tabs each return the right rows.
- **Lesson 4 — Archive, restore, and delete.** Adds the `archiveInvoice`, `restoreInvoice`, and `softDeleteInvoice` actions with audit-log writes and wires them to the row action menu.
- **Lesson 5 — Two tabs, one winner.** Adds the `version` precondition to `updateInvoice`, returns a 409 with `current`, and renders the conflict banner with "Use latest" and an admin-gated "Overwrite".

### Setup

The student runs `degit` to clone the starter, then the standard bring-up. List the exact command sequence in a Steps component: clone via `degit`, `docker compose up -d` (Postgres), `pnpm install`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`.
Env vars are unchanged from chapter 047 / chapter 059 — copy `.env.example` to `.env` (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SEED`); no new entries this chapter.
On success, `pnpm dev` serves the existing Unit 6 list view and edit form: the filters in the toolbar are local state only (refresh wipes them), there are no archive/restore buttons, and the update path silently overwrites on a two-tab race.
Point the student at `/inspector` as the verification surface every later lesson uses: the row-counts banner, the "Force version drift" tool, the "Open this invoice in two tabs" helper, and the audit-log tail.

---

## Lesson 2 — Move every control to the URL

Take the toolbar's local filter state and lift filter, sort, search, view, and cursor into the URL, so any view is a paste-able link that survives a refresh.
Finished result: clicking any control rewrites the URL, the active-filter chips render above the table, pagination advances the cursor, and the search box stays responsive while it writes — and pasting that URL into a fresh tab reproduces the view exactly.

### Your mission

This is the URL-state layer of the production list view.
The URL is the source of truth for every piece of view-state that should survive a refresh, a share, or the back button — filter, sort, search, cursor, and the visibility tab — and the page is a Server Component that reads that URL through a `nuqs` `searchParamsCache` while the toolbar Client Component writes back through `nuqs` setters.
Default values stay out of the URL: `nuqs` strips them, so the bare `/invoices` is the home state and only differences from default appear.
The invariant that keeps pagination honest is that every setter which re-orders or shrinks the result set bundles `cursor: null` in the same call — miss it on a single setter and you ship the canonical stale-cursor bug.
Use `replace`-only history (the search parser sets `history: 'replace'` explicitly) so a fast-changing filter does not bury the back button under fifty entries, and keep the search box responsive with `useDeferredValue` + `useTransition` driving the throttled URL write rather than a hand-rolled debounce.
Out of scope for this lesson: the view tabs render but only `active` returns rows — branching `listInvoices` on `view` is the next lesson; lifecycle actions and the version precondition come later still.

- Clicking a status, sort, or view control rewrites the URL to reflect it, and clearing back to defaults leaves the bare `/invoices` URL with no query string.
- Copying the URL into a fresh private window signed in as the same user reproduces the identical list, and a hard reload preserves filter, sort, cursor, and view.
- The active-filter chips render above the table for every non-default filter, and each chip's clear control removes that filter (and the cursor) from the URL.
- Clicking Next advances the list by carrying a new `cursor` in the URL; the cursor is dropped whenever the status, sort, or search changes, so the new result set starts at page one.
- Typing a long query fast keeps the input perfectly responsive while the URL settles roughly every 200ms, leaving only one or two back-button entries rather than one per keystroke.

### Coding time

Direct the student to fill the parsers, the page wiring, the toolbar, the pagination control, and the chips against the brief and the tests, then attempt it before opening the solution.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/search-params.ts`: define the five parsers (`status`, `sort`, `q`, `view`, `cursor`) and export `invoiceListSearchParams` plus `invoiceListSearchParamsCache` via `createSearchParamsCache`, matching the reference signatures above.
- `app/(app)/invoices/page.tsx`: replace the empty-cache call with `const parsed = await invoiceListSearchParamsCache.parse(props.searchParams)`, pass the parsed slices into `listInvoices`, and pass the parsed values as props into `<Toolbar parsed={parsed} />` so the Client Component renders controlled inputs without re-reading the URL.
- `listInvoices`: accept `{ status, sort, q, view, cursor, pageSize }` matching the parsed shape; translate `sort` to a Drizzle `orderBy` tuple via one `resolveSort(sort)` helper; apply `ilike(invoices.number, \`%${q}%\`)` (or a join-and-`ilike` against `customers.name`) when `q` is non-empty. (Reads still hand-filter tenancy here; the scoped helper lands next lesson.)
- `app/(app)/invoices/toolbar.tsx`: a single Client Component using `useQueryStates(invoiceListSearchParams)` — status dropdown, sort dropdown, search input, view tabs (`active` / `archived` / `all`). Every setter bundles `cursor: null`. The search input holds typed state in `useState` and syncs via `useDeferredValue` + `useTransition` to `setQueryStates({ q: deferred, cursor: null })`.
- `app/(app)/invoices/pagination.tsx`: read `cursor` via `useQueryState`; receive `nextCursor` and `hasPrev` as props from the server. "Next" calls `setCursor(nextCursor)`; explain the senior call to take the simpler "next-only" path for this lesson (Previous clears the cursor) versus a full bidirectional cursor stack.
- Active-filter chips: a small Server Component that reads `parsed` and emits `<Chip key="status" label="Status: Paid" />` etc., each chip's "x" a Client `<ClearChip param="status" />` calling `setQueryStates({ status: null, cursor: null })`.
- Sanity-check that the root layout is wrapped in `<NuqsAdapter>` (it should be, from chapter 060).
- Decision rationale to surface: why defaults are stripped (clean shareable URLs), why `cursor: null` rides along on every shrinking/reordering setter, why the deferred value (not the raw input) drives the URL write. For the `nuqs` parser and `searchParamsCache` mechanics link to chapter 060 rather than re-explaining.

### Moment of truth

Run the lesson's test suite (state the command and the expected pass output) covering the URL-encoding and cursor-reset behavior.
Then confirm by hand, ticking each off:

- Click status `paid`, sort by total, click Next; the URL shows `?status=paid&sort=-total&cursor=...`. Clear filters; the URL becomes a bare `/invoices`.
- Copy any URL into a private window signed in as the same user; the list renders identically. Hard reload; filter, sort, cursor, and view all survive.
- With a non-null cursor, change the status; the URL drops `cursor` and the list shows page one of the new filter (repeat for sort and search).
- Type a fast 30-character query; the input never lags, the URL writes settle roughly every 200ms, and the back-button count stays at one or two entries rather than thirty.
- Note the expected partial state: the view tabs render but `archived` and `all` still return active rows only (the helper does not yet branch on `view`) — fixed in lesson 3.

---

## Lesson 3 — Scoped reads and the view tabs

Replace the hand-written list query with a lifecycle-aware, tenant-scoped helper and route the read on the `view` param, so the Active / Archived / All tabs each return the right rows.
Finished result: switching tabs returns the correct row set — Active hides archived and deleted rows, Archived shows the seeded archived row, and All (admin only) shows the seeded soft-deleted row with a "Deleted" badge — while a member who hand-types `?view=all` is quietly served `active` rows.

### Your mission

This lesson installs the read discipline the whole project leans on.
Right now `listInvoices` reaches the table through a raw `db.select().from(invoices).where(eq(invoices.organizationId, orgId))` — a bug by the chapter 061 standard, because nothing stops a read from forgetting the tenancy filter or the `deletedAt IS NULL` lifecycle filter.
You replace that with `invoiceScope(orgId)`, a helper layered on `tenantDb` that returns `active()`, `archived()`, and `includingDeleted()` builders, each pre-filtered by org and the matching lifecycle predicate, so the base-query helper plus `tenantDb` makes "I forgot the filter" structurally impossible at hand-written reads — and a lint rule against bare `.from(invoices)` is the second-layer defense.
Route `listInvoices` (and `getInvoiceDetail`) on the `view` param, and enforce the RBAC gate at the read, not just in the toolbar: `view=all` drops to `active` unless `ctx.role === 'admin'`, so a member who hand-types the URL is refused at the data layer.
The status filter, sort, cursor predicate, and pagination compose onto whichever builder the helper returns.
Lean on the already-seeded archived and soft-deleted rows to confirm the tabs; the buttons that create new lifecycle states come in the next lesson.

- Switching to the Archived tab returns the seeded archived row (and only archived rows); switching to Active hides both archived and soft-deleted rows.
- As an admin, the All tab returns every row including the seeded soft-deleted one, marked with a "Deleted" badge; the detail page for an archived invoice loads, and for a soft-deleted invoice loads only for admin.
- As a member, the All tab is absent from the toolbar, and hand-typing `?view=all` serves `active` rows — the refusal happens at the read.
- The active-rows list query is served by the partial composite index (no `Seq Scan`), confirmed in the inspector's `EXPLAIN ANALYZE` probe.

### Coding time

Direct the student to implement the scoped helper and the `view` routing against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/scoped-query.ts`: implement `invoiceScope(orgId)` returning `{ active(), archived(), includingDeleted() }`, each a chainable Drizzle builder pre-scoped to `eq(invoices.organizationId, orgId)` plus its lifecycle predicate. Export the shared `activeFilter` and `archivedFilter` `sql` fragments so hand-written joins can reuse them.
- Composition with `tenantDb`: the call site is `tenantDb(ctx.orgId).invoices.active()` — the same shape chapter 056 used, with the lifecycle methods layered on the tenant-scoped table. Show the composition once; the rest of the project uses the named shape.
- `listInvoices`: route on `view` — `'active'` → `active()`, `'archived'` → `archived()`, `'all'` → `includingDeleted()` — with `view=all` dropped to `active` at the page layer unless `ctx.role === 'admin'`. The status filter, sort, cursor predicate, and pagination compose on the returned builder.
- `getInvoiceDetail`: route on `view` (or accept `includeArchived` / `includeDeleted` booleans) so an archived invoice's detail page loads for restore, and a soft-deleted invoice's detail page loads only for admin.
- Decision rationale to surface: why the RBAC gate lives at the read and not only at the toolbar hide (defense at the data layer), and why exporting the `sql` fragments lets the rare hand-written join stay consistent with the helper. Link to lesson 2 of chapter 061 for the helper pattern itself rather than re-deriving it.
- This lesson completes the view-tab behavior the toolbar wired in lesson 2 but could not yet satisfy.

### Moment of truth

Run the lesson's test suite (state the command and expected pass output) covering the `view` routing and the RBAC gate.
Then confirm by hand:

- Switch to Archived; the seeded archived row appears and active rows do not. Switch to Active; the archived and soft-deleted rows are hidden.
- As admin, switch to All; the seeded soft-deleted row appears with a "Deleted" badge. Open its detail page (loads for admin); confirm an archived invoice's detail page also loads.
- As a member, confirm the All tab is hidden in the toolbar; hand-type `?view=all` and confirm the list still returns `active` rows.
- Open the inspector's index-probe panel; confirm the active-rows list query uses `invoices_org_status_created_id_active_idx` with no `Seq Scan`.

---

## Lesson 4 — Archive, restore, and delete

Ship the three lifecycle Server Actions — archive, restore, and soft-delete — each writing an audit-log row in the same transaction, and wire them into the row action menu.
Finished result: archiving a row from the Active tab makes it vanish and reappear under Archived with a Restore button; Restore returns it to Active; and an admin can soft-delete a row so it disappears from the default list and surfaces under All with a "Deleted" badge — every action recorded in the audit-log tail.

### Your mission

With reads routed on lifecycle state, this lesson adds the writes that move rows between those states.
The three actions are `authedAction`-wrapped so role enforcement and Zod parsing happen at the boundary: archive and restore are open to `member`, soft-delete is gated to `admin`.
Each action's UPDATE goes through the scoped helper and carries its lifecycle precondition in the `WHERE` (archive only touches rows that are active, restore only rows that are in the state it clears), and each runs inside `db.transaction` alongside a `logAudit(tx, …)` call — so a failure to write the audit log rolls back the lifecycle change, the discipline from lesson 3 of chapter 081, made mechanical by the helper taking the transaction as a parameter.
The partial unique index on `(orgId, number) WHERE deletedAt IS NULL` is what lets a soft-deleted `INV-0001` and a fresh `INV-0001` coexist; the seed already contains the colliding pair, so creating the new one demonstrates the recovery.
Wiring `useOptimistic` on archive so the row leaves the table the instant the user clicks (and rolls back on failure) is a senior reach worth taking here; the conflict surface for these actions is finished in the next lesson.
Out of scope: the `version` precondition on the edit/update path and the conflict banner are the next lesson — these lifecycle actions return their 409 shape but the rich conflict UX comes later.

- Archiving a row from the Active tab removes it from the default list and surfaces it under the Archived tab with an "Archived on …" label and a Restore button; the audit-log tail records the event.
- Clicking Restore from the Archived tab returns the row to Active, and the audit-log tail records it.
- As an admin, soft-deleting a row removes it from the default list and surfaces it under All with a "Deleted" badge; the soft-delete control is absent for a member.
- After soft-deleting `INV-0001`, creating a fresh invoice numbered `INV-0001` succeeds, because the partial unique index excludes the soft-deleted row.
- Each lifecycle action writes its audit-log row in the same transaction as the UPDATE, so the row-counts banner and the audit-log tail both move together after every action.

### Coding time

Direct the student to implement the three actions and the row-menu wiring against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `src/lib/invoices/actions.ts`:
  - `archiveInvoice = authedAction('member', z.strictObject({ id: z.string().uuid(), version: z.number().int() }), async ({ id, version }, ctx) => { ... })`. The UPDATE goes through the scoped query — `tenantDb(ctx.orgId).invoices.active().update({ archivedAt: sql\`NOW()\`, version: sql\`version + 1\`, updatedAt: sql\`NOW()\` }).where(and(eq(invoices.id, id), eq(invoices.version, version))).returning()`. Zero rows means 409; one row means success. Wrap in `db.transaction` with `logAudit(tx, { action: 'invoice.archive', subjectType: 'invoice', subjectId: id, orgId: ctx.orgId, actorUserId: ctx.user.id, payload: {} })`.
  - `restoreInvoice`: clears whichever of `archivedAt` / `deletedAt` is set — `includingDeleted()` for the read leg when an admin restores a soft-deleted row, `archived()` for the typical member-restoring-archived path. Surface the senior call to keep one action that branches on role versus two separate actions.
  - `softDeleteInvoice = authedAction('admin', z.strictObject({ id, version }), ...)`: sets `deletedAt = NOW()`. Handle the `invoice_lines` cascade explicitly inside the same transaction (a second UPDATE) and name why the application-level cascade is explicit rather than relying on `ON DELETE CASCADE`.
- `app/(app)/invoices/table.tsx`: wire each action into the row action menu via `<form action={archiveInvoice}>` (or `<button formAction={...}>`) with hidden `id` and `version` fields; use `useActionState` for the in-flight indicator. Add the `<RestoreButton />` in the Archived tab and the admin-only un-delete control on `view=all` rows with `deletedAt` set.
- Decision rationale to surface: why the audit-log write shares the transaction (atomic with the lifecycle change), why the lifecycle precondition lives in the `WHERE`, and why `useOptimistic` on archive is the senior reach (instant disappearance, automatic rollback). The partial-unique-index recovery is demonstrated against the seeded colliding pair.

### Moment of truth

Run the lesson's test suite (state the command and expected pass output) covering the three actions, the role gate, and the audit-log write.
Then confirm by hand:

- Archive a row from Active; it vanishes from the default list and appears under Archived with the archive timestamp and a Restore button; the audit-log tail shows the event.
- Click Restore from Archived; the row returns to Active; the audit-log tail shows the event.
- As admin, soft-delete a row; it vanishes from the default list and appears under All with a "Deleted" badge. As a member, confirm the soft-delete control is absent.
- Soft-delete `INV-0001`, then create a fresh invoice numbered `INV-0001`; the create succeeds. (Optionally drop the partial index via `psql` and re-run to watch it fail, proving the index is what enables recovery.)
- Watch the inspector's row-counts banner and audit-log tail move together after each action, confirming the shared transaction.

---

## Lesson 5 — Two tabs, one winner

Add the `version` precondition to `updateInvoice` so a two-tab edit returns an honest 409, and render a conflict banner that lets the student refresh-and-retry without a second fetch.
Finished result: editing the same invoice in two tabs lets the first save win; the second submit renders a conflict banner with the current server values and "Use latest" / admin-gated "Overwrite" affordances, and "Use latest" reloads the form so the resubmit succeeds.

### Your mission

This is the optimistic-concurrency layer that turns silent last-write-wins into a visible, recoverable conflict.
Every UPDATE in the project now carries tenancy + lifecycle + `version` in its `WHERE`, and missing any one is a distinct bug class — missing tenancy is the cross-tenant overwrite, missing lifecycle is the edit-a-soft-deleted-row bug, missing version is silent last-write-wins — so name all three.
The precondition lives in the `WHERE`, never as a separate `SELECT … THEN UPDATE`, because the two-statement form has a TOCTOU race; one atomic statement, and zero rows affected is the honest 409.
On that 409 the action fetches the current row in the same round trip and returns it as the `current` payload, sparing the client a refetch — the senior anchor from lesson 3 of chapter 061 — and the form rebuilds the conflict banner from it.
`useOptimistic` rolls back automatically on `{ ok: false }`, so the banner renders alongside the rolled-back values; the optimistic UI stays fine for the common case while the rollback is free.
"Overwrite anyway" is a sharp edge gated to admin (the course default is show-to-admin, hide-for-member), and client-side tampering with the hidden `version` field just produces another 409 — bounded impact, with the server-side Zod parse as the front-line defense and the version precondition as the back-stop.
`updatedAt`-as-version is named as the existing-tables alternative, but the course default is the `version` column for its cheap, unambiguous precision.

- Editing the same invoice in two tabs lets the first submit succeed; the second submit returns a 409 and renders the conflict banner with the current server values.
- The conflict banner's "Use latest" replaces the form's state with `current` and advances the hidden `version`, so resubmitting succeeds; "Overwrite anyway" appears only for admins and forces the write past the precondition.
- Forcing the update to fail via the inspector's "Force version drift" tool makes the optimistic UI show the change briefly, then roll back automatically as the conflict returns, with the banner rendering on the rolled-back form.
- A lifecycle action (archive / restore / soft-delete) that hits a stale `version` surfaces a conflict toast ("This invoice changed elsewhere — refresh to retry") rather than the full banner.
- A forged submit carrying another org's invoice ID affects zero rows and takes the conflict (or not-found) path, so tenant isolation holds at the write just as it does at the read.

### Coding time

Direct the student to add the precondition, the 409 branch, and the conflict banner against the brief and the tests before reading on.

Solution walkthrough (hidden in `<details>`):

- `updateInvoice`: add `version: z.number().int()` to the input schema; the UPDATE's `where` becomes `and(eq(invoices.id, id), eq(invoices.organizationId, ctx.orgId), eq(invoices.version, clientVersion), isNull(invoices.deletedAt))`, the `set` clause bumps `version: sql\`version + 1\`` and `updatedAt: sql\`NOW()\``, and `.returning()` yields zero or one row.
- Branch on the result: one row → `{ ok: true, data: updated }`; zero rows → fetch the current row via `tenantDb(ctx.orgId).invoices.active().findFirst({ where: eq(invoices.id, id) })` and return `{ ok: false, error: { code: 'conflict', userMessage: 'This invoice was changed in another tab. Refresh to see the latest version.', current } }`. The fetch is in the same Server Action, so the client gets one round trip.
- `edit-form.tsx`: add `<input type="hidden" name="version" value={invoice.version} />`; extend the `useActionState` Result type to include the `conflict` branch and the `current` payload.
- `<ConflictBanner current={current} onUseLatest={...} onOverwrite={...} />` Client Component: "Use latest" replaces the controlled state with `current` and resets the hidden `version` to `current.version`; "Overwrite anyway" is gated on `ctx.role === 'admin'` and calls the action with a `force: true` flag that bypasses the precondition — the rare carve-out, named loud.
- Lifecycle actions' 409 path: archive / restore / soft-delete return `{ ok: false, error: { code: 'conflict', current } }` on zero rows; the row action menu surfaces a toast (the row UI has no controlled form state to merge against) rather than the banner.
- Decision rationale to surface: precondition-in-`WHERE` vs. TOCTOU `SELECT`-then-`UPDATE`, the `current` payload as the one-round-trip refresh source, and the admin gate on overwrite. Link to lesson 3 of chapter 061 for the concurrency pattern and to chapter 042 / lesson 4 of chapter 043 for the Zod boundary rather than re-explaining.

### Moment of truth

Run the lesson's test suite (state the command and expected pass output) covering the version precondition, the 409 `current` payload, and the conflict branch.
Then confirm by hand:

- Open an invoice in two tabs; edit and save the first (confirm the version bumped in the inspector and audit log); edit and save the second; the conflict banner renders with the current server values. Click "Use latest"; the form reloads with the server's values and the new version; resubmit; it succeeds. Use the "Force version drift" tool to reproduce the race deterministically.
- Enable the inspector's force-fail tool; edit a row; the optimistic UI shows the change briefly, then rolls back when the conflict returns, and the banner appears.
- Trigger a stale-version lifecycle action; confirm it surfaces a conflict toast rather than the full banner.
- As a user in org A, hand-construct an edit URL for an org-B invoice ID; the detail page returns 404. Submit a forged form with the org-B ID; the UPDATE affects zero rows and the conflict (or not-found) path fires — tenant isolation holds at both read and write.
- Confirm the chapter acceptance bar end to end: every Project-goals behavior in the framing now holds. Forward references for the curious: Unit 13 wires a notification on archive/restore, Unit 14 adds `cacheTag('invoices', orgId)` invalidation to the lifecycle actions, lesson 3 of chapter 081 hardens the audit-log discipline, and chapter 088 writes integration tests for the conflict path and the cross-tenant probe.
