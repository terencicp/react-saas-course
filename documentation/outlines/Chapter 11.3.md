# Chapter 11.3 — Project: URL-state list with soft delete and concurrency

## Chapter framing

Chapter 11.3 takes the Unit 7 CRUD surface (Chapter 7.6's invoices) and turns it into the production list view every SaaS app eventually ships: filter, sort, search, and cursor pagination all in the URL through `nuqs`; soft delete plus archive as two distinct lifecycle states; restore from an Archived tab; optimistic concurrency via a `version` column that turns silent last-write-wins into a real 409 with a refresh-and-retry conflict surface. The schema layer (Unit 6), the Server Action shape (7.2), the tenant helper (10.1's `tenantDb`), and the RBAC wrapper (10.2's `authedAction`) are all in place — this chapter wires `searchParams` to the read, layers the soft-delete/archive base-query helper on top of `tenantDb`, and adds the `version` precondition to the update path. The output is a list view a coworker can paste a URL of, refresh a hundred times, archive rows from, restore them, and race two tabs against — every behavior holds.

Threads that run through every lesson: the URL is the source of truth for filter + sort + search + cursor + visibility; defaults are implicit (stripped from the URL); the page is a Server Component reading a `nuqs` `searchParamsCache`, the client writes via `nuqs` setters with `replace` and `{ scroll: false }`; any change that shrinks or re-orders the result set bundles `cursor: null` in the same setter call; the base-query helper `tenantDb(orgId).invoices.active() / .archived() / .includingDeleted()` is the only way reads touch the table — hand-written `.from(invoices)` is a code-review red flag; every UPDATE has tenancy + lifecycle + `version` preconditions in the `WHERE`; zero rows affected returns the canonical 409 Result with `current` payload so the client renders the conflict without a second fetch; `useActionState` + `useOptimistic` handle the success path, the rollback, and the conflict banner; `useDeferredValue` + `useTransition` keep the search box responsive without a hand-rolled debounce. The chapter ships 1 brief + 1 starter walkthrough + 4 build lessons + 1 verify lesson; each build ends on a runnable state.

### Dependency carry-in

- **From 7.6 (the CRUD starter):** `app/invoices/page.tsx`, the `invoiceFormSchema` in `src/lib/invoices/schema.ts`, the three Server Actions (`createInvoice`, `updateInvoice`, `deleteInvoice`) returning the canonical Result shape from 7.2.2, the `useActionState`-driven form components, the `useOptimistic` create wiring, the shadcn `<Form>` primitives.
- **From 6.6 (the schema):** `invoices`, `invoice_lines`, `customers`, `organizations`, `org_members` tables; the `listInvoices` + `getInvoiceDetail` reads in `src/lib/invoices/queries.ts`; the cursor encode/decode helpers in `src/db/cursor.ts`; the composite index `invoices_org_status_created_id_idx` on `(organizationId, status, createdAt desc, id desc)` and `invoices_org_created_id_idx` on `(organizationId, createdAt desc, id desc)`.
- **From 10.4 (tenancy + RBAC):** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, the active-org slot in the session, the `audit_logs` table and the `writeAuditLog(tx, event)` helper.
- **From 11.1 (URL-state):** `nuqs` installed, `<NuqsAdapter>` wrapped at the root layout, the `searchParamsCache` pattern, `useQueryState` / `useQueryStates`, `parseAsStringEnum` / `parseAsString` / `parseAsArrayOf`, the `replace`-only history policy, the cursor-reset-on-other-change rule, the `useDeferredValue` + `useTransition` search rhythm.
- **From 11.2 (lifecycle + concurrency):** the `deletedAt` / `archivedAt` / `version` columns added in a migration (already in the starter — running the migration was a 11.2 exercise), the base-query helper API surface (`active()`, `archived()`, `includingDeleted()`), the version-precondition UPDATE shape, the 409 Result shape with `current`, the `useActionState` + `useOptimistic` conflict UX.
- **From 5.5 / 5.7:** the Server Component `searchParams` async prop, parallel routes (`@list` + `@detail` from 5.7's project — reused in the starter), `Suspense` boundaries with slot-specific skeletons.
- **From 2.4 / 2.5 / 7.1:** Zod 4 schemas, `z.strictObject`, `z.infer`.
- **From 17.2.3 (forward dependency, helper provided):** the `writeAuditLog` helper is invoked from the soft-delete, archive, restore, and update actions; the table is already in the schema.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml             # provided: postgres:18 service
drizzle.config.ts              # provided
.env.example                   # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET, RESEND_API_KEY, SEED
package.json                   # provided: db:migrate, db:seed, dev, build, test scripts
src/
  db/
    schema.ts                  # provided: full Unit 6 + 11.2 schema with deletedAt, archivedAt, version, partial unique indexes
    client.ts                  # provided
    relations.ts               # provided
    cursor.ts                  # provided
  lib/
    tenant-db.ts               # provided: tenantDb(orgId) from 10.1
    authed-action.ts           # provided: authedAction wrapper from 10.2
    audit-log.ts               # provided: writeAuditLog(tx, event)
    invoices/
      schema.ts                # provided: invoiceFormSchema + new TODOs for listInputSchema and listSearchParams parsers
      queries.ts               # provided as-is from 6.6; TODO student: refactor to go through scoped query helper, add archive/restore branches
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
  seed.ts                      # provided from 6.6, plus a seeded "already archived" row and a "already soft-deleted" row
```

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
  - `archiveInvoice = authedAction('member', z.strictObject({ id: z.string().uuid(), version: z.number().int() }), async ({ id, version }, ctx) => ...)` — UPDATE with `WHERE id = id AND organizationId = ctx.orgId AND version = version AND archivedAt IS NULL AND deletedAt IS NULL`, `SET archivedAt = NOW(), version = version + 1, updatedAt = NOW()`, returns `{ ok: true, data: row }` or `{ ok: false, error: { code: 'CONFLICT', userMessage, current } }`.
  - `restoreInvoice = authedAction('member', z.strictObject({ id, version }), ...)` — clears whichever of `archivedAt` / `deletedAt` is set; same precondition shape.
  - `softDeleteInvoice = authedAction('admin', z.strictObject({ id, version }), ...)` — sets `deletedAt = NOW()`, gated on admin role.
  - `updateInvoice` is the existing 7.6 action, refactored to add the `version` precondition and the `CONFLICT` branch.
- **Form** (`edit-form.tsx`):
  - Hidden `<input type="hidden" name="version" value={invoice.version} />`.
  - `useActionState(updateInvoice, initialState)` returns `{ ok, error?, data? }`; conflict branch reads `error.current` and renders a `<ConflictBanner current={...} onUseLatest={...} onOverwrite={...} />`.
- **Env entries:** unchanged from 7.6 / 10.4 — no new entries.

### Inspector page spec

A single Server Component at `/inspector` for verification, all read from `searchParams`:

- **Header:** Org switcher (two seeded orgs), session-user switcher (admin user / member user — drives RBAC verification), "Reset and re-seed" form posting to a Server Action.
- **Row-counts banner:** counts of `invoices` total / `active` / `archived` / `soft-deleted` for the current org, computed via `includingDeleted()` plus filtered counts. Updates after every action.
- **Audit-log tail:** the last 20 `audit_logs` rows for the current org, streamed via Server Component refresh. Each archive / restore / soft-delete / update writes here.
- **"Force version drift" tool:** a debug control that runs a raw `UPDATE invoices SET version = version + 1 WHERE id = :id` against a target row, bypassing the action layer — used in 11.3.7 to reproduce the 409 deterministically without juggling two real tabs.
- **"Open this invoice in two tabs" helper:** a button that opens `/invoices/:id/edit` in a new window plus copies the URL — convenience for the manual two-tab race.
- **Live partial-index probe:** a small panel running `EXPLAIN ANALYZE` on the current list query and printing the index name used; verifies the `WHERE deletedAt IS NULL` partial index gets picked.

The inspector is provided in full; the student writes only the actions and parsers it exercises.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Filter + sort + page changes update the URL | Click status `paid`; URL shows `?status=paid`. Sort by total; URL shows `?sort=-total`. Click Next; URL carries `?cursor=...`. Defaults stay implicit. |
| Refresh and share both reproduce the view | Copy any URL, paste in a private window (signed in as the same user); list renders identically. Hard reload preserves filter, sort, cursor, view. |
| Deleting an invoice removes it from the default list | As admin, click "Delete" on an active row; row vanishes from the default `view=active` list. Switch to `view=all`; the row appears with a "Deleted" badge. |
| Soft-deleted row appears under "show deleted" | `view=all` is RBAC-gated to admin; member sees only `active` and `archived` tabs; admin sees `all`. |
| Editing from two tabs returns 409 on the second submit | Open the same invoice in two tabs; edit and save the first; edit and save the second; the second renders the conflict banner with the current server values and the "Use latest" / "Overwrite" affordances. |
| Conflict banner offers refresh-and-retry | Click "Use latest"; form state resets to `current`, the hidden `version` advances; resubmitting succeeds. |
| Archive removes from default list, surfaces in Archived tab | Click "Archive" on an active row; row vanishes from `view=active`; switch to `view=archived`; row appears with the "Archived on …" label and a "Restore" button. |
| Restore returns the row to active | From `view=archived`, click "Restore"; row reappears in `view=active`; audit log shows the event. |
| Partial unique index allows re-creating a soft-deleted invoice number | As admin, soft-delete invoice `INV-0001`; create a new invoice with `number = INV-0001`; the create succeeds (because the partial unique index excludes the soft-deleted row). |
| `useOptimistic` rolls back on action failure | Force the update to fail via the inspector's "drift version" tool, submit the edit; the optimistic state rolls back automatically; the conflict banner renders. |
| Search input stays responsive while the URL writes are throttled | Type a long query fast; the input never lags; the URL writes settle every ~200ms; no history-entry spam. |
| Cursor reset on filter / sort / search change | With a non-null `cursor`, change status; URL drops `cursor`; list shows page 1 of the new filter. |

### Concepts demonstrated → owning lesson

- URL-vs-component state for list views, share-and-refresh contract — 11.1.1.
- `router.replace` + `{ scroll: false }` policy — 11.1.1.
- `nuqs` parsers, defaults, `createSearchParamsCache`, `useQueryState` / `useQueryStates` — 11.1.1.
- Filter, sort, view-tab encoding; the cursor-reset rule on other-change — 11.1.2.
- Search with `useDeferredValue` + `useTransition` + `nuqs` `throttleMs` — 11.1.3.
- Cursor pagination URL shape, next-extra-row trick — 11.1.4 (built on 6.3.6).
- Soft delete vs. archive vs. restore semantics; partial unique indexes — 11.2.1.
- Base-query helper composed with `tenantDb`; `active()` / `archived()` / `includingDeleted()` API — 11.2.2.
- `version`-column optimistic concurrency, 409 Result with `current`, refresh-and-retry — 11.2.3.
- `useActionState` + `useOptimistic` with conflict rollback — 7.3.6, 11.2.3.
- `authedAction(role, schema, fn)`, `tenantDb(orgId)`, audit-log writes in the same transaction — 10.2, 10.4.
- Server-side `searchParams` reads in a Server Component — 5.5.4.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — 7.1.

---

## Lesson 11.3.1 — Project brief

Goals:

- Frame what's being built: take the Unit 7 invoice CRUD surface and ship the production list view — URL-state filter/sort/search/pagination, soft-delete + archive + restore, optimistic concurrency on update. Show one screenshot of the finished `/invoices` page with the toolbar, the table, the active-filter chips, the pagination row, and the view tabs visible.
- State the "Done when" verifications in one paragraph (URL captures every view-state piece; share-and-refresh holds; archive moves rows to the archived tab and restore brings them back; soft-delete hides rows from default but surfaces under `view=all` for admins; two-tab edit returns 409 with a conflict banner; optimistic rollback fires on action failure).
- Name the scope cuts: no bulk actions (a senior would add multi-select + bulk archive but that's a separate UX pass — out of scope); no saved views / named presets (out of scope); no real-time list updates (no notifications wiring — Unit 14); no full-text search (Postgres `ilike` is enough for the seeded data — FTS lives in 6.3.8 if the student wants it); no Row-Level Security (application-layer tenancy is the course default — RLS named in 11.2 as the alternative).
- Set the senior payoff: the list view is the canonical SaaS screen — every internal tool, dashboard, and admin app becomes one. The patterns shipped here (URL state, base-query helper, version precondition, refresh-and-retry conflict UX) carry into every subsequent feature the student writes.
- Show the end UX: a short animated capture of the toolbar interactions and the two-tab conflict flow.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships everything from 7.6 working — this project is layering URL state on top and adding the lifecycle + concurrency disciplines. Resist the urge to rewrite the form or the actions wholesale.
- The `view=all` tab is admin-only; the inspector intentionally shows the tab regardless of role so the student can verify the server-side refusal (defense-in-depth, not a missed UX hide — the 10.4 lesson).

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, `docker compose up -d` running Postgres, `pnpm install` clean, `pnpm db:migrate && pnpm db:seed` populated, `pnpm dev` shows the existing Unit 7 list view and edit form working — but with no URL state (filters are local, no archive/restore buttons, update silently overwrites on a two-tab race).

Estimated student time: 10 to 15 minutes.

---

## Lesson 11.3.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on five files: the `searchParams.ts` stub (where the `nuqs` parsers go), `scoped-query.ts` (the empty helper module), `actions.ts` (the existing `updateInvoice` from 7.6 that still needs the `version` precondition + the three new lifecycle actions), `app/(app)/invoices/page.tsx` (the Server Component shell that already calls `searchParamsCache.parse(props.searchParams)` — but the cache is empty), and `app/(app)/invoices/[id]/edit/edit-form.tsx` (the 7.6 form, no hidden `version` field yet, no conflict banner).
- Read the schema: confirm `deletedAt`, `archivedAt`, `version` columns on `invoices`; confirm the partial unique index `invoices_org_number_active_uq` on `(organizationId, number) WHERE deletedAt IS NULL`; confirm the partial composite index `invoices_org_status_created_id_active_idx` on `(organizationId, status, createdAt desc, id desc) WHERE deletedAt IS NULL AND archivedAt IS NULL`. These were added in a migration as part of Chapter 11.2's reading — verify by opening Drizzle Studio.
- Read the seed: 60+ invoices per org, one row pre-archived (`archivedAt` set), one row pre-soft-deleted (`deletedAt` set), one row with a duplicated `number` against a soft-deleted row to prove the partial unique index works.
- Read the inspector: confirm the row-counts banner, the "Force version drift" tool, the "Open this invoice in two tabs" helper, the audit-log tail. The inspector is the verification surface for every later lesson.
- Run the app: confirm the existing list view renders, the existing edit form saves successfully (no concurrency), the filters in the toolbar are local state only (refresh wipes them).
- Read `src/lib/tenant-db.ts` and `src/lib/authed-action.ts` end-to-end — the helpers from 10.4 are load-bearing for every action this project writes; the student should remember the call shape.

Senior calls and watch-outs:

- The migration that added `deletedAt`, `archivedAt`, `version`, and the partial indexes is already applied. The `version` defaults to 1 across every existing row — the senior call from 11.2.3.
- The base-query helper is empty intentionally; the existing `listInvoices` still uses raw `db.select().from(invoices).where(eq(invoices.organizationId, orgId))` — a bug by 11.2.2's standard. The student fixes it in 11.3.4.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: student has read every provided file, run the app, clicked through the existing surface, opened the inspector. No code written. The list view still has no URL state, no archive button, and no version precondition.

Estimated student time: 20 to 25 minutes.

---

## Lesson 11.3.3 — Lift filter, sort, search, and cursor to the URL

Goals:

- Fill `src/lib/invoices/search-params.ts`: define the five parsers (`status`, `sort`, `q`, `view`, `cursor`) and export `invoiceListSearchParams` and `invoiceListSearchParamsCache` via `createSearchParamsCache`. Match the parsers to the reference signatures.
- Wire `app/(app)/invoices/page.tsx`: replace the empty-cache call with `const parsed = await invoiceListSearchParamsCache.parse(props.searchParams)`. Pass `parsed` slices into `listInvoices`. Pass the parsed values as props into `<Toolbar parsed={parsed} />` so the Client Component renders controlled inputs without re-reading the URL.
- Refactor `listInvoices` to accept `{ status, sort, q, view, cursor, pageSize }` matching the parsed shape. Translate `sort` to a Drizzle `orderBy` tuple (one helper `resolveSort(sort)` mapping the enum string to `[column, direction]`). Apply `ilike(invoices.number, \`%${q}%\`)` or join-and-`ilike` against `customers.name` when `q` is non-empty.
- Fill `app/(app)/invoices/toolbar.tsx`: a single Client Component using `useQueryStates(invoiceListSearchParams)`. Render the status dropdown (`<Select>`), the sort dropdown, the search input, the view tabs (`active` / `archived` / `all`). Every setter bundles `cursor: null` for the reset invariant. The search input holds typed state in `useState`, syncs via `useDeferredValue` + `useTransition` to `setQueryStates({ q: deferred, cursor: null })`.
- Fill `app/(app)/invoices/pagination.tsx`: read `cursor` via `useQueryState`. Receive `nextCursor` and `hasPrev` as props from the server. "Next" calls `setCursor(nextCursor)`; "Previous" is conditional on `hasPrev` and pops to the prior page (or, simpler for this lesson, clears the cursor — the senior call to take the "next-only" path is named explicitly).
- Render the active-filter chips above the table: a small Server Component that reads `parsed` and emits `<Chip key="status" label="Status: Paid" />` etc. Each chip's "x" is a Client `<ClearChip param="status" />` that calls `setQueryStates({ status: null, cursor: null })`.
- Wrap the root layout in `<NuqsAdapter>` if the starter hasn't already (sanity check — it should be wrapped from 11.1).
- Run the app: click through every control, watch the URL change, refresh the page, copy and paste the URL into a new tab, verify the view reproduces. The view tabs work but only `active` returns rows (the helper still hand-filters; the archived rows already exist but the existing `listInvoices` doesn't yet branch on `view` — that's 11.3.4).

Senior calls and watch-outs:

- Default values stay out of the URL — `nuqs` strips them. The empty `/invoices` URL is the home state; only differences from default appear.
- Every setter that re-orders or shrinks the result set bundles `cursor: null` — the invariant from 11.1.2 and 11.1.4. Missing this on one setter is the canonical bug.
- The search input's typed state lives in the component; the deferred value drives the URL. Wrapping the URL write in `useTransition` keeps the input responsive without a hand-rolled debounce — the 11.1.3 rhythm.
- `replace` only — `nuqs`'s default for `useQueryStates` is `replace`, but the search parser explicitly sets `history: 'replace'` for clarity. Filter chip changes producing 50 back-button entries is the easy regression.

Codebase state at entry: parsers stub empty, toolbar uses local `useState`, page reads no URL state.
Codebase state at exit: every interaction in the toolbar updates the URL; refresh and share reproduce the view; the active-filter chips render; pagination wires the cursor; the search input is responsive. The view tabs render but `archived` and `all` still return active rows only (helper not yet branching) — fixed in 11.3.4.

Estimated student time: 50 to 65 minutes.

---

## Lesson 11.3.4 — The scoped query helper and the lifecycle actions

Goals:

- Fill `src/lib/invoices/scoped-query.ts`: implement `invoiceScope(orgId)` returning `{ active(), archived(), includingDeleted() }`. Each method returns a chainable Drizzle builder pre-scoped to `eq(invoices.organizationId, orgId)` plus the lifecycle predicate. Export the shared `activeFilter` and `archivedFilter` `sql` fragments so hand-written joins can reuse them.
- Wire the helper through `tenantDb`: the call site is `tenantDb(ctx.orgId).invoices.active()` — same shape Chapter 10.1 used; this project layers the lifecycle methods on the tenant-scoped table. Show the composition in one place; the rest of the project uses the named shape.
- Refactor `listInvoices` to route on `view`: `'active'` → `active()`, `'archived'` → `archived()`, `'all'` → `includingDeleted()` (RBAC-gated at the page layer — `view=all` is dropped to `active` unless `ctx.role === 'admin'`). The pagination filter, status filter, sort, and cursor predicate compose on the builder returned by the helper.
- Refactor `getInvoiceDetail` similarly: route on `view` (or accept `includeArchived` / `includeDeleted` booleans). The detail page for an archived invoice still loads (so restore works); the detail page for a soft-deleted invoice only loads for admin.
- Fill the three lifecycle Server Actions in `src/lib/invoices/actions.ts`:
  - `archiveInvoice = authedAction('member', z.strictObject({ id: z.string().uuid(), version: z.number().int() }), async ({ id, version }, ctx) => { ... })`. The UPDATE uses the scoped query — `tenantDb(ctx.orgId).invoices.active().update({ archivedAt: sql\`NOW()\`, version: sql\`version + 1\`, updatedAt: sql\`NOW()\` }).where(and(eq(invoices.id, id), eq(invoices.version, version))).returning()`. Zero rows means 409; one row means success. Wrap in `db.transaction` with `writeAuditLog(tx, { event: 'invoice.archive', invoiceId: id, orgId: ctx.orgId })`.
  - `restoreInvoice`: clears whichever of `archivedAt` / `deletedAt` is set. Uses `includingDeleted()` for the read leg (an admin restoring a soft-deleted row) but `archived()` for the typical member-restoring-archived path — the senior call to write two variants vs. one is named (one action, branch on role inside).
  - `softDeleteInvoice = authedAction('admin', z.strictObject({ id, version }), ...)`. Sets `deletedAt = NOW()`. Cascade soft-delete on `invoice_lines` is handled inside the same transaction via a second UPDATE (or relies on `ON DELETE CASCADE` not firing — name the application-level cascade explicitly).
- Wire the three actions to the row action menu in `app/(app)/invoices/table.tsx`: each `<form action={archiveInvoice}>` (or `<button formAction={...}>`) with hidden `id` and `version` fields. Use `useActionState` for the in-flight indicator and the conflict surface.
- Optional: an `<RestoreButton />` in the archived tab that calls `restoreInvoice` and an `<UnDeleteButton />` (admin-only) on `view=all` rows with `deletedAt` set.
- Run the app: switch between view tabs, archive a row from `active`, see it move to `archived`, click restore, see it return. As admin, soft-delete a row; switch to `view=all`; see it with a "Deleted" badge. The list query now uses the partial composite index on the active hot path — verify in the inspector's index probe.

Senior calls and watch-outs:

- The helper composes with `tenantDb` — both filters land in the same `where`, neither is hand-typed at the call site. Hand-writing `.from(invoices).where(eq(orgId, ...))` is the failure mode 11.2.2 named; the lint rule is the second-layer defense.
- `view=all` is RBAC-gated at the page layer, not just at the toolbar. A member who hand-types `?view=all` gets `view=active` rows back — defense at the read, not at the UI hide.
- The lifecycle actions write an audit log in the same transaction as the UPDATE. Failure to write the audit log rolls back the lifecycle change — the discipline from 17.2.3. The starter's `writeAuditLog` helper takes the transaction as a parameter to make this composition mechanical.
- The partial unique index on `(orgId, number) WHERE deletedAt IS NULL` is what lets a soft-deleted `INV-0001` and a new `INV-0001` coexist — verify by creating one (already in the seed) and watching the create succeed.
- `useOptimistic` on archive/restore is optional but a senior reach — the row disappears from the table the moment the user clicks, rolls back on a 409. Wire it on archive; the rollback is automatic.

Codebase state at entry: parsers + toolbar wired, list query doesn't yet branch on `view`, lifecycle actions don't exist.
Codebase state at exit: scoped query helper in place, list query branches on `view` and respects the RBAC gate, three lifecycle actions live and audit-log-writing, row action menu exposes them, archive / restore / soft-delete all work end-to-end. The update action still has no `version` precondition — silent last-write-wins still possible — fixed in 11.3.5.

Estimated student time: 60 to 80 minutes.

---

## Lesson 11.3.5 — The version precondition and the 409 surface

Goals:

- Refactor `updateInvoice` to add the `version` precondition. The input schema gets a `version: z.number().int()` field. The UPDATE's `where` becomes `and(eq(invoices.id, id), eq(invoices.organizationId, ctx.orgId), eq(invoices.version, clientVersion), isNull(invoices.deletedAt))`. The `set` clause bumps `version: sql\`version + 1\`` and `updatedAt: sql\`NOW()\``. `.returning()` gives zero or one row.
- Branch on the result: one row → `{ ok: true, data: updated }`; zero rows → fetch the current row via `tenantDb(ctx.orgId).invoices.active().findFirst({ where: eq(invoices.id, id) })` and return `{ ok: false, error: { code: 'CONFLICT', userMessage: 'This invoice was changed in another tab. Refresh to see the latest version.', current } }`. The fetch happens inside the same Server Action — the client gets one round trip.
- Wire the form: add `<input type="hidden" name="version" value={invoice.version} />` to `edit-form.tsx`. The `useActionState` reducer already returns the Result shape — extend the type to include the `CONFLICT` branch and the `current` payload.
- Build the conflict banner: a new `<ConflictBanner current={current} onUseLatest={...} onOverwrite={...} />` Client Component. "Use latest" replaces the form's controlled state with `current` and resets the hidden `version` to `current.version`. "Overwrite anyway" is gated on `ctx.role === 'admin'` and calls the action with a `force: true` flag that bypasses the precondition — the rare carve-out, named loud.
- `useOptimistic` interaction: the optimistic state rolls back automatically on `{ ok: false }` — React's documented behavior. The conflict banner renders alongside the rolled-back form values. The senior anchor: the optimistic UI is fine for the common case; the rollback is automatic.
- Wire the lifecycle actions' 409 path the same way: archive / restore / soft-delete also return `{ ok: false, error: { code: 'CONFLICT', current } }` on zero-rows-affected. The row action menu surfaces a toast on conflict ("This invoice changed elsewhere — refresh to retry") rather than the full banner — the row UI has no controlled form state to merge against.
- Run the app: open an invoice in two tabs; edit and save the first; edit and save the second; see the conflict banner; click "Use latest"; the form reloads with the server's values and the new version; resubmit; success. Use the inspector's "Force version drift" tool to reproduce the conflict deterministically.

Senior calls and watch-outs:

- The precondition lives in the `WHERE`, not as a separate `SELECT ... THEN UPDATE` round trip — the latter has a TOCTOU race. One statement, atomic.
- Every UPDATE has tenancy + lifecycle + version in the `where`. Missing any one is a distinct bug class: missing tenancy is the cross-tenant overwrite, missing lifecycle is the "edit a soft-deleted row" bug, missing version is silent last-write-wins. Name all three.
- "Overwrite anyway" is a sharp edge. Gate it on role; consider hiding it entirely for non-admin product surfaces. The course's default is "show to admin, hide for member".
- `updatedAt` as the alternative to `version` is named for the existing-tables case (11.2.3); the course default is `version` because the column is cheap and the precision is unambiguous.
- The `current` payload in the 409 Result saves the client a second round trip — the senior anchor from 11.2.3. Without it, the client either renders stale state or fires a refetch.
- Tampering with the hidden `version` field at the client just produces a 409 — bounded impact. Zod parses on the server (7.1, 7.2.4) is the defense; the version precondition is the back-stop.

Codebase state at entry: lifecycle actions live, update action still silently overwrites on race.
Codebase state at exit: update action has the version precondition, returns 409 with `current` on conflict, the form renders the conflict banner, "Use latest" and "Overwrite anyway" both work, lifecycle actions surface conflicts as toasts. Every UPDATE in the project has tenancy + lifecycle + version in its `WHERE`.

Estimated student time: 55 to 70 minutes.

---

## Lesson 11.3.6 — Verify

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- URL behavior: click status `paid`, sort by `-total`, click Next page; URL shows `?status=paid&sort=-total&cursor=...`. Copy the URL to a private window (signed in as the same user); the view reproduces. Hard reload; reproduces. Click "Clear filters"; URL becomes `/invoices` (defaults stripped).
- Cursor reset on other-change: with a non-null cursor, change status; URL drops `cursor`; first page of the new filter loads. Same for sort and search.
- Search responsiveness: type a fast 30-character query; the input never lags; the URL writes settle every ~200ms; back-button count stays sane (one or two entries, not 30). Confirm the partial composite index `invoices_org_status_created_id_active_idx` is picked via the inspector's `EXPLAIN ANALYZE` panel.
- Archive flow: archive a row from `view=active`; row vanishes; switch to `view=archived`; row appears with the archive timestamp; click restore; row returns to active. The audit log tail shows both events.
- Soft-delete flow (as admin): delete a row from `view=active`; row vanishes; switch to `view=all` (admin-only tab); row appears with a "Deleted" badge. As member, hand-type `?view=all`; the read drops to `view=active` (server-side refusal). Verify the `view=all` tab is hidden for the member role in the toolbar.
- Partial unique index: soft-delete invoice `INV-0001`; create a new invoice with `number = INV-0001`; create succeeds. Drop the partial index temporarily (via `psql`); re-run the create; it fails with a unique-constraint error — proving the partial index is what makes the recovery possible.
- Two-tab concurrency: open an invoice in two tabs; edit and save the first; verify the version bumped in the audit log and in the inspector; edit and save the second; conflict banner renders; "Use latest" loads `current`, hidden version updates, resubmit succeeds. Use the "Force version drift" tool to reproduce the race deterministically.
- Optimistic rollback: enable the inspector's "force next update to fail with 409"; edit a row; the optimistic UI shows the change briefly, then rolls back when the action returns the conflict; banner appears.
- Cross-tenant probe: as a user in org A, hand-construct an edit URL for an invoice ID from org B; the detail page returns 404 (tenant filter holds at the read). As the same user, submit a forged form with the org-B invoice's ID; the action's `where` filters by `ctx.orgId`, the UPDATE affects zero rows, conflict path fires (or a `NOT_FOUND` error if the action distinguishes). Tenant isolation holds at both the read and the write.
- Index plan check: open the inspector's index-probe panel; confirm the active-rows list query uses `invoices_org_status_created_id_active_idx` (the partial composite). Confirm `view=archived` uses a different plan (or the same composite without the partial filter). No `Seq Scan` on any list view.
- Name the senior calls one more time:
  - URL state is the source of truth for any view-state piece that survives refresh, share, or back button.
  - The base-query helper plus `tenantDb` makes "I forgot the `deletedAt IS NULL` filter" or "I forgot the tenancy filter" structurally impossible at hand-written reads.
  - Every UPDATE carries tenancy + lifecycle + version preconditions in its `WHERE`. Zero-rows-affected is the honest 409.
  - `useActionState` + `useOptimistic` handles success, rollback, and conflict in one shape; the conflict's `current` payload spares the client a refetch.
  - The cursor reset on every filter / sort / search change is the invariant that keeps pagination correct.
- Forward references:
  - Unit 14 (notifications) wires a notification on archive / restore so collaborators see lifecycle changes in real time.
  - Unit 15 (cache) adds `cacheTag('invoices', orgId)` invalidation to the lifecycle actions so the list cache refreshes correctly.
  - Unit 17.2.3 hardens the audit-log discipline (append-only, retention policy).
  - Unit 19.3 writes integration tests for the conflict path and the cross-tenant probe.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the disciplines the student just installed.
- If a verification fails, the lesson points at the owning build lesson, not at "debug it yourself".

Codebase state at entry: full URL state, lifecycle, and concurrency wired.
Codebase state at exit: same surface, verified clause-by-clause; the student can articulate every decision (URL vs. component state, helper vs. raw query, version vs. updatedAt, archive vs. soft delete) and which forward unit will lean on it.

Estimated student time: 30 to 40 minutes.
