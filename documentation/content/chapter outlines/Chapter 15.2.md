# Chapter 15.2 — Project: caching the invoices list with tag-driven invalidation

## Chapter framing

Chapter 15.2 cashes in the decision discipline of 15.1 — the route-class checklist and cacheable shortlist (15.1.1), the four tag shapes funneled through `tags.ts` (15.1.1), the `fetchedAt` diagnostic (15.1.1), the four-way invalidation tree (15.1.2), the `updateTag`-Server-Action-only rule (15.1.2), the after-commit-then-redirect sequence (15.1.2) — as one runnable surface on top of the Unit 11.3 invoices list. The student adds `use cache` boundaries to two cached reads (the list and the per-org summary), defines the `tags.ts` helper that mirrors `org:${orgId}:invoices`, `invoice:${id}`, and `org:${orgId}:summary`, emits a `fetchedAt` timestamp inside each cached function as the cache-state proxy, calls `updateTag` from the edit and lifecycle actions (read-your-writes — the same user is sitting on the redirect), and calls `revalidateTag` from a Trigger.dev daily summary task (eventual — no user is watching). Each build closes on a runnable state: 15.2.3 ends with cached reads emitting `fetchedAt` and the tag scheme in place; 15.2.4 ends with both invalidation paths firing at their seams; 15.2.5 walks the "Done when" clause-by-clause.

Threads through every lesson: caching is opt-in and the senior default for the authenticated SaaS surface is dynamic — only the list query and the summary widget take `use cache`, the rest stays dynamic; `tags.ts` is the only place tag strings exist — read sites and write sites import the same functions, a grep for raw `'org:'` strings outside `tags.ts` is a red flag; the cached read is a function whose tags depend only on its arguments — `orgId` is passed in, never read from `auth()` inside the cached function; `fetchedAt` is the verification proxy because Next.js doesn't surface cache hit/miss to user code — stable timestamp across requests means hit, advancing timestamp means miss; the invalidation call runs after commit, then the redirect — never inside the transaction; `updateTag` only inside Server Actions for read-your-writes, `revalidateTag` from the Trigger.dev task for the eventual path; misusing `revalidateTag` from the Server Action is the deliberate failure-mode demo in 15.2.5; the inspector's `fetchedAt` strip is the on-page reading of cache state for every verification step.

### Dependency carry-in

- **From 11.3 (the starter base):** `app/(app)/invoices/page.tsx` Server Component reading `invoiceListSearchParamsCache`, the `<Toolbar />` / `<Table />` / `<Pagination />` shells, `listInvoices({ orgId, view, status, sort, q, cursor, pageSize })` in `src/lib/invoices/queries.ts`, the scoped-query helper `invoiceScope(orgId).active()/.archived()/.includingDeleted()`, the four Server Actions (`updateInvoice`, `archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`) all returning the canonical Result shape with the `version` precondition and tenancy + lifecycle in every `WHERE`.
- **From 11.3 (concurrency surface):** the `version` column on `invoices`, the conflict banner with `current` payload, `useActionState` + `useOptimistic`; the partial indexes `invoices_org_number_active_uq` and `invoices_org_status_created_id_active_idx`.
- **From 10.4 (tenancy + RBAC):** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, the active-org slot in the session, `logAudit(tx, event)`, `audit_logs` (table).
- **From 6.6 (schema):** `invoices`, `invoice_lines`, `customers`, `organizations`, `org_members`; the unique `(organizationId, number)` and the composite index `(organizationId, status, createdAt desc, id desc)`.
- **From 5.4.1:** `cacheComponents: true` flag — already in `next.config.ts`, every route dynamic by default; opt-in only via `use cache`.
- **From 5.4.3:** `use cache` directive on three placements (page / component / function), serializable arguments, closure rules — cached function cannot read `cookies()` / `headers()` / `auth()` inside.
- **From 5.4.4:** `cacheLife` profiles (`'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`), `cacheTag(...)` call inside the cached function.
- **From 5.4.6:** `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (eventual), `revalidatePath`, `router.refresh`.
- **From 15.1.1:** the four tag shapes (entity / record / org-scoped / user-scoped), `tags.ts` helper convention, tag-string conventions (lowercase, colon-delimited, scope first), the `fetchedAt` discipline, the "no closures over request data — tags are arguments" rule.
- **From 15.1.2:** the four-call decision tree, the user-expectation question as the primary driver, the after-commit-then-redirect rule, the redirect-then-invalidate anti-pattern, multiple-tags-per-mutation fan-out.
- **From 13.1.4 / 13.1.7:** Trigger.dev v4 `schemaTask`, code-defined queues, scheduled task; the starter provides a stub `summaryRecomputeTask` so the project does not require a working Trigger.dev cloud account (an inspector button invokes the task body directly for verification).
- **From 7.2 + 7.6:** canonical Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided: cacheComponents: true; experimental.useCache enabled
.env.example                    # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET,
                                #           TRIGGER_SECRET_KEY (optional — inspector mocks the task)
package.json                    # provided: db:migrate, db:seed, dev, build, trigger:dev (optional)
scripts/
  seed.ts                       # provided: two orgs, 60 invoices per org from 11.3, one pre-archived,
                                #           one pre-soft-deleted, one duplicated-number row
src/
  db/
    schema.ts                   # provided: full 11.3 schema + new `org_invoice_summaries` table
                                #           (orgId pk, totalCount, totalAmount, updatedAt) — empty in seed
    client.ts                   # provided
    relations.ts                # provided
    cursor.ts                   # provided
  lib/
    tenant-db.ts                # provided (10.1)
    authed-action.ts            # provided (10.2)
    audit-log.ts                # provided
    cache/
      tags.ts                   # TODO student: orgInvoicesTag, invoiceTag, orgSummaryTag helpers
    invoices/
      schema.ts                 # provided from 11.3
      scoped-query.ts           # provided from 11.3
      queries.ts                # provided shell; TODO student: add `use cache` + cacheTag + fetchedAt
                                #           to listInvoices and getOrgInvoiceSummary
      actions.ts                # provided from 11.3; TODO student: add updateTag calls after commit
      search-params.ts          # provided from 11.3
  trigger/
    summary-recompute.ts        # TODO student: schemaTask body, revalidateTag call
  app/
    (app)/
      invoices/
        page.tsx                # provided shell; renders <FetchedAtStrip /> + existing list
        fetched-at-strip.tsx    # provided: reads listFetchedAt + summaryFetchedAt from server props
        toolbar.tsx             # provided from 11.3
        table.tsx               # provided from 11.3
        pagination.tsx          # provided from 11.3
        [id]/edit/
          page.tsx              # provided from 11.3
          edit-form.tsx         # provided from 11.3
    inspector/
      page.tsx                  # provided: fetchedAt strip, edit-one-invoice button (uses updateTag),
                                #           run-summary-task button (uses revalidateTag),
                                #           "misuse revalidateTag from action" debug toggle,
                                #           tag-invalidation log tail, reset-and-re-seed,
                                #           current cacheLife profile readout per cached function
```

### Reference solution signatures lessons display

- **Tag helper** (`src/lib/cache/tags.ts`):
  - `orgInvoicesTag = (orgId: string) => \`org:${orgId}:invoices\`` — list-level invalidation for an org.
  - `invoiceTag = (id: string) => \`invoice:${id}\`` — record-level invalidation.
  - `orgSummaryTag = (orgId: string) => \`org:${orgId}:summary\`` — aggregate-level invalidation.
  - Each helper is a pure function of its argument. The module exports nothing else; the string template is the contract.
- **Cached list read** (`src/lib/invoices/queries.ts`):
  - `listInvoices(args: ListArgs): Promise<{ rows; nextCursor; hasPrev; fetchedAt }>` — body opens with `'use cache'`, then `cacheLife('minutes')`, then `cacheTag(orgInvoicesTag(args.orgId))`. Returns `{ rows, nextCursor, hasPrev, fetchedAt: new Date().toISOString() }`. The `view`, `status`, `sort`, `q`, `cursor`, `pageSize` are serializable arguments — they participate in the cache key.
  - `args.orgId` is always passed in by the page; the cached function does not read session inside.
- **Cached summary read** (`src/lib/invoices/queries.ts`):
  - `getOrgInvoiceSummary(orgId: string): Promise<{ totalCount: number; totalAmount: number; updatedAt: Date; fetchedAt: string }>` — body opens with `'use cache'`, then `cacheLife('hours')`, then `cacheTag(orgSummaryTag(orgId))`. Reads from `org_invoice_summaries` for the precomputed aggregate; falls back to a `count(*) + sum(total)` query if the row is absent (first run before the task lands).
- **Update action with `updateTag` fan-out** (`src/lib/invoices/actions.ts`):
  - `updateInvoice` body, after the transaction commits and before `redirect`:
    - `await updateTag(orgInvoicesTag(ctx.orgId))` — invalidates the list.
    - `await updateTag(invoiceTag(id))` — invalidates the record.
    - `await updateTag(orgSummaryTag(ctx.orgId))` — invalidates the summary (totals changed).
    - `redirect('/invoices')`.
  - `archiveInvoice` / `restoreInvoice` / `softDeleteInvoice` follow the same after-commit fan-out: list + record + summary. Restoring fires the same three calls (the row's visibility changes for both the list and the summary).
- **Trigger.dev summary task** (`src/trigger/summary-recompute.ts`):
  - `summaryRecomputeTask = schemaTask({ id: 'org-summary-recompute', schema: z.strictObject({ orgId: z.string().uuid() }), queue: { name: 'summary', concurrencyLimit: 5 }, run: async ({ orgId }) => { ... } })`.
  - Body: compute `totalCount = count(invoices WHERE orgId AND deletedAt IS NULL)` and `totalAmount = sum(total ...)`; UPSERT into `org_invoice_summaries` on `orgId`; `await revalidateTag(orgSummaryTag(orgId), 'max')`; return `{ orgId, totalCount, totalAmount }`.
  - The inspector's "Run summary task" button calls the task via `tasks.trigger('org-summary-recompute', { orgId })` when `TRIGGER_SECRET_KEY` is set, or imports and invokes the run function inline when it is not — the verification surface is identical either way.
- **`org_invoice_summaries` table:**
  - `orgId uuid pk references organizations(id) on delete cascade`, `totalCount int not null default 0`, `totalAmount numeric(14,2) not null default 0`, `updatedAt timestamptz not null default now()`. No composite index — one row per org.
- **Env entries:** unchanged from 11.3; `TRIGGER_SECRET_KEY` optional — the inspector falls back to in-process invocation when absent.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every "Done when" clause. Server-side reads; refreshes on submit via `router.refresh()` and on Server-Action redirects.

- **Header:** session-user switcher (admin / member per seeded org), org switcher (two seeded orgs), "Reset and re-seed" Server Action (truncates `org_invoice_summaries`, re-runs the 11.3 seed).
- **`fetchedAt` strip:** the same `<FetchedAtStrip />` component the list page renders. Two timestamps: `listFetchedAt` (from `listInvoices`) and `summaryFetchedAt` (from `getOrgInvoiceSummary`). Each row labels its `cacheLife` profile and the tags emitted.
- **"Edit one invoice" button:** posts a Server Action that picks a seeded invoice for the active org, runs `updateInvoice` with a small amount delta, commits, calls `updateTag` for list + record + summary, redirects to `/inspector`. The redirected render shows fresh `fetchedAt` values for both cached reads.
- **"Archive / restore / soft-delete one invoice" buttons:** same pattern as above against the seeded lifecycle rows, each verifying its action's `updateTag` fan-out.
- **"Run summary task" button:** invokes `summaryRecomputeTask` (either via Trigger.dev or in-process — see signatures above). The task mutates `org_invoice_summaries` and calls `revalidateTag(orgSummaryTag(orgId), 'max')`. The inspector renders **before** the next visit's read sees the new value — the strip's `summaryFetchedAt` stays stable on this render, then advances on the next manual refresh.
- **"Misuse `revalidateTag` from action" toggle:** when on, the "Edit one invoice" Server Action calls `revalidateTag` instead of `updateTag` for the list tag. On the immediate redirect, `listFetchedAt` stays stale (the row's edit is not visible) — the deterministic demonstration of why read-your-writes needs `updateTag` from Server Actions.
- **Tag-invalidation log tail:** a Server Component panel reading the last 20 lines from a starter-provided `cache_invalidation_log` table (the actions write a row `{ tag, source: 'action' | 'task', firedAt }` next to the `updateTag`/`revalidateTag` call). The tail is the structured-log surface foreshadowed in 15.1.2.
- **`cacheLife` readout:** per cached function, the profile string and the resolved (stale / revalidate / expire) triple. Sourced from a small `lib/cache/profiles.ts` map the student populates alongside `tags.ts`.
- **"Hit/miss probe":** five consecutive refreshes of `/invoices`; the strip captures each `fetchedAt` reading. Identical timestamps prove hits; one new timestamp followed by four stable ones proves a miss then four hits.

The inspector is provided in full; the student writes only `tags.ts`, the `use cache` annotations on the two queries, the invalidation calls in the four actions, and the Trigger.dev task body.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| First list visit shows one `fetchedAt`; refresh shows the same `fetchedAt` (cache hit) | Open `/invoices`; note `listFetchedAt`. Hard-refresh; `listFetchedAt` unchanged. Five consecutive refreshes via the inspector hit/miss probe; same timestamp every time. |
| Editing an invoice and returning to the list shows a fresh `fetchedAt` and the new value | Inspector "Edit one invoice"; redirect lands on `/invoices`; `listFetchedAt` advances; the edited row's amount reflects the delta. `updateTag` for list + record + summary all fired. |
| Firing the background job leaves `fetchedAt` unchanged on the current visit but the next visit shows the new aggregate with a fresh `fetchedAt` | Inspector "Run summary task"; redirect to `/inspector` shows `summaryFetchedAt` stale (the task fired `revalidateTag`, not `updateTag` — stale-while-revalidate). Next manual visit to `/inspector` (or `/invoices` summary section) → `summaryFetchedAt` advances; new totals visible. |
| Misusing `revalidateTag` from the server action shows a stale `fetchedAt` and value on the submitting request | Toggle "Misuse `revalidateTag` from action" on; "Edit one invoice"; redirect lands on `/invoices`; `listFetchedAt` stale, edited row's amount still old. Toggle off; repeat; `listFetchedAt` advances, new amount visible. The deterministic demo of why read-your-writes needs `updateTag`. |
| Archive / restore / soft-delete all invalidate list and summary | Inspector "Archive one invoice"; redirect to list; row missing from `view=active`, `listFetchedAt` advances, `summaryFetchedAt` advances (totals dropped). Restore; redirect; row back, both timestamps advance. Soft-delete (admin); switch to `view=all`; row visible with "Deleted" badge; summary excludes it. |
| Record-level tag invalidates only the affected invoice's detail | Edit invoice A; visit detail B; B's `fetchedAt` stable (the record tag for A did not invalidate B). Detail A's `fetchedAt` advances. |
| Cross-org isolation: invalidation in org A does not invalidate org B's caches | As admin in org A, edit an invoice; switch session to org B; the org-B list `listFetchedAt` is unchanged from before. The org-scoped tag `org:${A}:invoices` is distinct from `org:${B}:invoices`. |
| Tags only exist in `tags.ts` | Grep `org:.*:invoices` and `invoice:` outside `lib/cache/tags.ts` and the cached read sites — zero raw string hits at write sites. Every write site imports the helper. |
| `cacheLife` profile readout matches expectations | Inspector readout shows `listInvoices: 'minutes'` and `getOrgInvoiceSummary: 'hours'`. Senior call: list cache profile is short because users edit and view; summary cache profile is long because the task refreshes it. |
| The cached function does not close over session | Cached function signatures take `orgId` as an explicit argument. Grep `auth()` / `cookies()` / `headers()` inside `listInvoices` and `getOrgInvoiceSummary` bodies — zero hits. |
| Invalidate-after-commit, not before | The action's source orders: `await db.transaction(...)`, then `await updateTag(...)` (multiple), then `redirect(...)`. The inverse order is the deliberate failure mode in 15.2.5. |

### Concepts demonstrated → owning lesson

- `cacheComponents: true` and dynamic-by-default — 5.4.1.
- `use cache` directive, serializable args, closure rules — 5.4.3.
- `cacheLife` profile selection — 5.4.4 + 15.1.1 (UX framing).
- `cacheTag` and the four tag shapes — 5.4.4 + 15.1.1.
- `tags.ts` helper as the structural enforcement — 15.1.1.
- The `fetchedAt` diagnostic — 15.1.1.
- The "tags are arguments, not ambient" rule — 15.1.1.
- The four-call invalidation surface and the decision tree — 5.4.6 + 15.1.2.
- The user-expectation question as the primary driver — 15.1.2.
- `updateTag` Server-Action-only restriction — 15.1.2.
- `revalidateTag` from webhooks and background jobs — 15.1.2.
- Multiple tags per mutation (the fan-out) — 15.1.2.
- After-commit-then-redirect ordering — 15.1.2.
- Org-scoping the tag mirrors data-layer scoping — 10.1 + 15.1.1.
- Trigger.dev `schemaTask` and queue declaration — 13.1.4.
- `authedAction`, `tenantDb`, audit-log writes — 10.2 / 10.4.

---

## Lesson 15.2.1 — Brief and the finished cache shape

Frame the build: two `use cache` reads (list and per-org summary), a three-helper `tags.ts`, `updateTag` fan-out from four actions, `revalidateTag` from a Trigger.dev summary task, and the `<FetchedAtStrip />` as the on-page cache-state readout.

Goals:

- Frame the build: take the 11.3 invoices surface and instrument it with `use cache` on the list query and a per-org summary aggregate, lay down a three-helper `tags.ts` (`orgInvoicesTag`, `invoiceTag`, `orgSummaryTag`), fire `updateTag` from the four user-facing actions for the read-your-writes path, fire `revalidateTag` from a Trigger.dev daily summary task for the eventual path. Show one screenshot of the finished `/invoices` page with the `<FetchedAtStrip />` visible at the top — two timestamps labeled and the resolved `cacheLife` triple per cached function.
- State the "Done when" in one paragraph: first visit shows one `listFetchedAt`; refresh keeps it stable (cache hit); editing through the inspector advances it on the next render (read-your-writes via `updateTag`); running the summary task leaves the current visit's `summaryFetchedAt` stable but advances it on the next visit (eventual via `revalidateTag`); toggling the "misuse `revalidateTag` from action" debug shows the stale read the framework's restriction is designed to prevent.
- Scope cuts: no `'use cache: private'` per-user caches (named, deferred — per-user reads are dynamic by default and a senior call until the workload justifies it); no edge-cache or CDN tuning (out of scope, Vercel data-cache layer named once); no full prerendered route segments — the chapter is about the dynamic-with-cached-subtree shape that fits the SaaS list view; no `revalidatePath` worked example (named in 15.1.2; the chapter chooses tags over paths because the tag scheme captures the cases); no notification on edit (Unit 14 territory).
- Senior payoff: this is the canonical cache shape for the rest of the course. Lists, detail pages, and per-org aggregates all follow the same pattern: cached function takes its scoping as an argument, emits a tag through `tags.ts`, mutations fan out invalidations to every affected tag after commit, background work uses `revalidateTag`. Adding a cached read later is a three-line change in queries.ts plus one helper in `tags.ts`.
- Show the end UX: a short capture of the inspector — five refreshes (stable `fetchedAt`), edit one invoice (timestamp advances on next render), run summary task (summary timestamp stays stable, then advances on the next visit), toggle misuse (stale read, deliberate).
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 11.3 working end-to-end: URL state, scoped query helper, version-precondition actions, audit log, conflict banner. This project layers the cache on top — no rewrites to the existing surface, only additions inside the two query functions and the four actions plus the new task file and `tags.ts`.
- `next.config.ts` already has `cacheComponents: true`. No code in the starter currently opts in — the entire list view is dynamic until 15.2.3 lands the directives.
- `TRIGGER_SECRET_KEY` is optional. The inspector mocks the task in-process when absent so students without a Trigger.dev cloud account can complete the verification. The task code is identical either way — only the invocation differs.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded, `pnpm dev` shows the 11.3 list view working dynamically; `/inspector` loads; `<FetchedAtStrip />` renders with two `fetchedAt` timestamps that advance on every request (the queries are not yet cached); the "Edit one invoice" button works (the 11.3 update action commits) but no `updateTag` calls fire yet; "Run summary task" produces a console error (the task body is empty).

Estimated student time: 10 to 15 minutes.

---

## Lesson 15.2.2 — Starter tour and inspector surface

Walk the 11.3-based starter, the new `org_invoice_summaries` table, the empty stubs (`tags.ts`, queries directives, action invalidations, task body), and every inspector panel that will verify later lessons.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on four files: `src/lib/cache/tags.ts` (empty — 15.2.3), `src/lib/invoices/queries.ts` (provided from 11.3 with no `use cache` — 15.2.3), `src/lib/invoices/actions.ts` (provided from 11.3 with no invalidation calls — 15.2.4), `src/trigger/summary-recompute.ts` (empty `schemaTask` skeleton — 15.2.4).
- Read the schema: confirm the new `org_invoice_summaries` table (one row per org, `totalCount`, `totalAmount`, `updatedAt`), seeded empty. The 11.3 tables (`invoices`, `invoice_lines`, `customers`, `organizations`, `org_members`, `audit_logs`) are unchanged.
- Read `next.config.ts`: `cacheComponents: true` flag set, `experimental.useCache` enabled. The framework is ready; the code has not opted in yet.
- Read the inspector end-to-end — every panel, button, debug tool. It is the verification surface for every later lesson. Confirm `<FetchedAtStrip />` reads `listFetchedAt` and `summaryFetchedAt` from its props, which the page wires from the two query return values.
- Read the seed: two orgs, 60+ invoices per org from 11.3 (one pre-archived, one pre-soft-deleted, one duplicated-number row), `org_invoice_summaries` empty. The student's `revalidateTag` task populates it on first run.
- Read the provided `cache_invalidation_log` table and the small `logCacheInvalidation(tag, source)` helper. The helper is exported from `src/lib/cache/log.ts` for the actions and the task to import alongside the actual `updateTag` / `revalidateTag` calls.
- Run the app: `/invoices` renders, the list-page `fetchedAt` strip shows two timestamps that advance on every refresh (no cache); `/inspector` loads; "Edit one invoice" succeeds at the database (audit log writes); "Run summary task" throws.

Senior calls and watch-outs:

- `lib/cache/tags.ts` will be the only place tag strings exist. The 15.1.1 rule: read sites and write sites both import the helper, the raw string never leaks. The student should commit this convention from the first line written.
- The starter's `getOrgInvoiceSummary` falls back to a live `count(*) + sum(total)` query when the summary row is absent. Once the task lands and populates the row, the query reads from the precomputed table. The fallback is the bootstrap path so the cached read works from minute one.
- The `<FetchedAtStrip />` is provided. The student does not author the strip — they just thread the `fetchedAt: new Date().toISOString()` line through each cached function's return so the strip has a value to show. The 15.1.1 discipline made operational.
- The inspector's "misuse `revalidateTag` from action" toggle requires the action to branch on a flag — the starter provides the flag wiring (an env var the inspector flips); the student adds the branch alongside the correct `updateTag` call in 15.2.4.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, list page tried, summary task button errors as expected. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 15.2.3 — Tag helpers, cached reads, and `fetchedAt`

Write `tags.ts`, annotate `listInvoices`, `getOrgInvoiceSummary`, and `getInvoiceDetail` with `'use cache'` + `cacheLife` + `cacheTag`, return `fetchedAt`, and verify hits through the inspector's hit/miss probe.

Goals:

- Fill `src/lib/cache/tags.ts`: define the three helpers per reference (`orgInvoicesTag`, `invoiceTag`, `orgSummaryTag`). Pure arrow functions, lowercase colon-delimited strings, scope first. Add the `cacheLife` profile map (`listInvoices: 'minutes'`, `getOrgInvoiceSummary: 'hours'`) in a sibling `profiles.ts` if the readout panel needs it.
- Annotate `listInvoices` in `src/lib/invoices/queries.ts`: open the function body with `'use cache'`, then `cacheLife('minutes')`, then `cacheTag(orgInvoicesTag(args.orgId))`. Return `{ rows, nextCursor, hasPrev, fetchedAt: new Date().toISOString() }` so the strip has a value. The existing 11.3 implementation (scoped query, view/status/sort/cursor handling) stays unchanged — the directives wrap it.
- Annotate `getOrgInvoiceSummary` the same way: `'use cache'`, `cacheLife('hours')`, `cacheTag(orgSummaryTag(orgId))`. Return `{ totalCount, totalAmount, updatedAt, fetchedAt: new Date().toISOString() }`. Implement the fallback live-aggregate read for the case where the row is missing (first run before the task lands).
- Verify the closure rule: the cached function signatures take `orgId` (and the other filter args for `listInvoices`) explicitly. Grep the bodies for `auth()`, `cookies()`, `headers()` — zero hits. The caller (page-level Server Component) reads the session and passes `orgId` in.
- Add a third cached read for the detail page: `getInvoiceDetail({ orgId, id })` gets the same treatment with `cacheTag(invoiceTag(id))` and `cacheTag(orgInvoicesTag(orgId))` — both tags so either an org-level or record-level invalidation hits it. The 15.1.1 union-of-tags rule applied.
- Wire the page-level Server Component (`app/(app)/invoices/page.tsx`): the parent already calls `listInvoices(args)` and `getOrgInvoiceSummary(orgId)`; pass the returned `fetchedAt` values through to `<FetchedAtStrip listFetchedAt={...} summaryFetchedAt={...} />`. Single-line wiring change.
- Run the app: open `/invoices`; note `listFetchedAt` and `summaryFetchedAt`. Refresh; both timestamps stable — the cache is hitting. Open the inspector hit/miss probe; five refreshes; same timestamps every time. Change a URL filter (`?status=paid`); a new `listFetchedAt` (different cache key for the new args); refresh again; that timestamp stable. Open a detail page; note its `fetchedAt`; refresh; stable.

Senior calls and watch-outs:

- `cacheLife('minutes')` for the list is the senior call from 15.1.1's UX framing — the list is read often, edited often, "a few minutes of staleness if the action chain fails to invalidate" is the right ceiling. `cacheLife('hours')` for the summary is the right call because the task refreshes it explicitly and the underlying totals only matter on the dashboard.
- The cached function's argument list is part of the cache key. Filter / sort / cursor changes produce distinct cache entries — verify by switching filters in the URL and watching `fetchedAt` advance for the new args, then stable on refresh. This is correct behavior, not a bug; the cache is keyed on the args, the org-scoped tag invalidates every entry across all arg combinations.
- The `fetchedAt` value lives inside the cached function's return — it is computed once when the function runs and frozen into the cache entry. A stable timestamp across requests means the framework served the cached value. An advancing timestamp means the function re-ran. The 15.1.1 discipline is now the diagnostic.
- The detail page tags itself with both `invoiceTag(id)` and `orgInvoicesTag(orgId)` because either a record-level write (`updateInvoice`) or an org-level write (a future bulk import) should invalidate it. Tagging at the granularity of the affected writes, not just the read's identity.
- Resist the temptation to add `'use cache'` to the toolbar render or any Client Component piece. The toolbar is dynamic by definition (it reads URL state, which is request-scoped). Only the two query functions take the directive — the cacheable shortlist from 15.1.1 holds.

Codebase state at entry: `tags.ts` empty, queries dynamic, `fetchedAt` advances on every request.
Codebase state at exit: tag helpers in place, two cached reads with `cacheLife` and `cacheTag` set, detail page cached with the union tag, `fetchedAt` strip shows stable timestamps across refreshes for the same args. **Runnable — caching demonstrably works, no invalidation paths exist yet so writes leave the cache stale until the entry's `cacheLife` expires.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 15.2.4 — Wiring both invalidation paths

Fan out three `updateTag` calls after commit in the four lifecycle actions, implement the `summaryRecomputeTask` that calls `revalidateTag`, and wire the deliberate misuse-`revalidateTag`-from-action branch as the failure-mode demo.

Goals:

- Edit `updateInvoice` in `src/lib/invoices/actions.ts`: after the existing transaction commits (the 11.3 version-precondition UPDATE), and before the (existing) redirect, call the three-tag fan-out in order:
  - `await updateTag(orgInvoicesTag(ctx.orgId))` — the list cache invalidates.
  - `await updateTag(invoiceTag(id))` — the record cache invalidates.
  - `await updateTag(orgSummaryTag(ctx.orgId))` — the summary cache invalidates (totals shift).
  - Each call also goes through `logCacheInvalidation(tag, 'action')` so the inspector log tail captures the event.
  - Then `redirect('/invoices')`. The 15.1.2 sequence: commit → invalidate → redirect.
- Edit `archiveInvoice`, `restoreInvoice`, `softDeleteInvoice` with the same three-tag fan-out. Each lifecycle change moves a row in or out of the active set — the list filter result changes, the record's display changes, the summary totals change.
- Add the "misuse `revalidateTag` from action" branch in `updateInvoice` (and only `updateInvoice` — one place is enough to demonstrate the bug deterministically). Read the `INSPECTOR_MISUSE_REVALIDATE` env var the inspector toggle flips; when on, call `revalidateTag(orgInvoicesTag(ctx.orgId), 'max')` instead of `updateTag` for the list tag. The other two tags still use `updateTag`. The lesson surfaces this as the deliberate failure-mode wiring — 15.2.5 walks the demo.
- Fill `src/trigger/summary-recompute.ts`: implement `summaryRecomputeTask` per reference. `schemaTask` declaration with `id`, the Zod payload schema (`z.strictObject({ orgId: z.string().uuid() })`), a code-defined queue (`{ name: 'summary', concurrencyLimit: 5 }`), and the `run` body that recomputes totals, UPSERTs `org_invoice_summaries`, and calls `await revalidateTag(orgSummaryTag(orgId), 'max')`. Log the invalidation via `logCacheInvalidation(orgSummaryTag(orgId), 'task')`.
- Wire the inspector's "Run summary task" button: provided shell that posts to a Server Action; the action calls the task (`tasks.trigger` when `TRIGGER_SECRET_KEY` is set, else imports the run function directly). The student adds the import and the call inside the provided action shell.
- Run the app: open `/invoices`, note both `fetchedAt` values. From the inspector, "Edit one invoice"; the redirect lands on `/invoices` with both `listFetchedAt` and `summaryFetchedAt` advanced and the edited row's amount reflecting the delta. From the inspector, "Run summary task"; the task body executes; the inspector redirects to itself; `summaryFetchedAt` is **unchanged** (stale-while-revalidate — the framework will serve the previous value on this render and refresh on the next visit). Refresh `/inspector` again; now `summaryFetchedAt` advances and the new totals are visible.

Senior calls and watch-outs:

- The action's order is load-bearing: transaction commits, then the invalidations fire, then `redirect`. Inverting any pair is a distinct bug: invalidate-then-commit risks invalidating-then-rolling-back (the inverse of the 14.1.2 dispatcher's after-commit rule); redirect-then-invalidate produces a one-render stale view on the destination (the 15.1.2 anti-pattern). Name both.
- Multiple `await updateTag` calls are sequential — each is cheap. The senior call from 15.1.2: list every cached read the mutation affects, invalidate each. Missing one is the silent stale-read bug. The three-tag fan-out here is the minimum complete set for an invoice edit.
- `updateTag` only works inside Server Actions. The Trigger.dev task body cannot use it — the framework rejects the call. `revalidateTag` works everywhere. The lesson surfaces this as the API enforcing the architectural rule: outside an action, no specific user is sitting on the redirect, so read-your-writes is the wrong semantic.
- The task's `revalidateTag` lands the new summary on the **next** visit, not the current one. This is correct: no specific user is waiting on this task; stale-while-revalidate is the right UX. The inspector's "next refresh shows fresh" verification is the demonstration of stale-while-revalidate that 15.1.2 named conceptually.
- The `INSPECTOR_MISUSE_REVALIDATE` toggle is deliberately user-facing. A senior reading this code asks: "Why is there a branch here?" The answer is the teaching surface — production code never reads a misuse flag. Strip the branch in any real codebase. The lesson surfaces the convention explicitly.
- The `cache_invalidation_log` writes happen after the actual `updateTag` / `revalidateTag` call returns. Logging before the call is the small bug where a failing invalidation produces a misleading log; logging after is the discipline.
- The summary task's payload schema is the discipline from 13.1.4 and 7.1 (Zod at the boundary). A typoed `orgId` from a misconfigured trigger surfaces as a Zod parse error, not a silent recompute of the wrong org.

Codebase state at entry: cached reads in place, no invalidation paths, writes silently stale the cache until `cacheLife` expires.
Codebase state at exit: four actions fan out three `updateTag` calls each after commit; the Trigger.dev task body recomputes the summary and calls `revalidateTag`; the misuse toggle wires a deterministic failure-mode demo; the inspector's tag-invalidation log tail captures every call. **Runnable — every inspector button produces the expected cache-state change; the four-way decision tree is now wired against real flows.**

Estimated student time: 55 to 75 minutes. The chapter's heaviest lesson — the read-your-writes path and the eventual path land together because the decision tree is only verifiable end-to-end once both are real.

---

## Lesson 15.2.5 — Verify clause-by-clause

Walk every "Done when" clause via the inspector: cache hits, read-your-writes through `updateTag`, record-level scoping, cross-org isolation, lifecycle fan-out, eventual via `revalidateTag`, the misuse demo, and the tag-string and closure-rule disciplines.

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **Cache hit baseline:** open `/invoices` as admin in org A; note `listFetchedAt`. Refresh five times via the inspector's hit/miss probe; the same timestamp every time. The `cache_invalidation_log` is empty. Pure hits.
- **Read-your-writes via `updateTag`:** inspector "Edit one invoice"; the action commits, fires three `updateTag` calls, redirects. The redirected `/invoices` render shows `listFetchedAt` advanced, the edited amount reflected, `summaryFetchedAt` advanced (totals shifted). The invalidation log tail shows three entries — list, record, summary — sourced as `action`. Refresh; both timestamps stable again (the post-invalidate read is now the cached entry).
- **Record-level scoping:** edit invoice A; visit invoice B's detail; `fetchedAt` on B is stable from before — the record tag `invoice:A` did not invalidate B's cached entry. Visit invoice A's detail; `fetchedAt` advances (both the record tag and the org-level tag invalidated it). The 15.1.1 granularity rule is the on-page reading.
- **Cross-org isolation:** as admin in org A, edit; switch the inspector session to org B; the org-B list `listFetchedAt` is unchanged from before. Different org-scoped tag, different cache entry, untouched. Tenant isolation holds at the cache layer the same way it does at the data layer.
- **Lifecycle fan-out:** archive a row; redirect; `listFetchedAt` advances (`view=active` row count dropped), `summaryFetchedAt` advances. Restore from the archived tab; both advance again. Soft-delete; both advance and the summary totals exclude the row.
- **Eventual via `revalidateTag`:** inspector "Run summary task"; the task body fires `revalidateTag(orgSummaryTag(orgId), 'max')`; the redirect to `/inspector` shows `summaryFetchedAt` **stable** — the stale entry served on this render. Refresh `/inspector`; `summaryFetchedAt` advances; new totals visible. The invalidation log shows the entry sourced as `task`. The senior anchor: stale-while-revalidate is the correct UX when no specific user is sitting on the redirect.
- **The misuse demo (the chapter's load-bearing failure):** flip "Misuse `revalidateTag` from action" on; "Edit one invoice"; redirect; `listFetchedAt` **stable**, the edited amount **not visible** on this render. The other two tags (record + summary) still used `updateTag`, so their entries refresh — but the list is the user-facing surface the redirect lands on. Refresh once; the list catches up. Flip the toggle off; repeat the edit; `listFetchedAt` advances on the redirected render and the new amount is there. The demo is the operationalization of 15.1.2's `updateTag` vs. `revalidateTag` framing — `updateTag` gives read-your-writes, `revalidateTag` gives one stale render.
- **Tag-string discipline:** open `lib/cache/tags.ts`; the only place the strings exist. Grep `'org:.*:invoices'` and `'invoice:'` outside `tags.ts` and the cached read sites — zero raw hits at write sites. Every action imports the helper.
- **The closure-rule check:** open `listInvoices`, `getOrgInvoiceSummary`, `getInvoiceDetail`; grep the bodies for `auth()`, `cookies()`, `headers()` — zero hits. Org scoping is an argument, not ambient state.
- **`cacheLife` readout:** the inspector's per-function readout shows `listInvoices: 'minutes'` with the resolved triple, `getOrgInvoiceSummary: 'hours'` with the longer triple. The UX framing from 15.1.1 is the on-page reading: short for the high-edit list, long for the task-refreshed summary.
- **After-commit ordering:** read `updateInvoice`'s source aloud — `await tx...`, then three `await updateTag(...)`, then `redirect(...)`. The 15.1.2 sequence is the lint rule a senior reader runs by eye.
- **The `updateTag`-outside-action error (forced):** the inspector's "force `updateTag` from task" debug button calls `updateTag` inside the task body; the framework throws at runtime with a clear message. The API enforces the architectural rule — the bug is impossible to ship.
- **Index plan unchanged:** the existing 11.3 partial composite index on `(organizationId, status, createdAt desc, id desc) WHERE deletedAt IS NULL AND archivedAt IS NULL` still gets picked on the cached list query's underlying SELECT. Caching does not bypass the index; the cached payload is the result the index produced.
- Name the senior calls one more time:
  - Caching is opt-in; the default for the authenticated SaaS surface is dynamic; only the list and the summary earned their `use cache` directives.
  - `tags.ts` is the only place tag strings exist; write sites and read sites share the helper.
  - The cached function takes its scoping as an argument; closing over session is the leak bug.
  - `fetchedAt` inside the cached function's return is the cache-state proxy; Next.js does not surface hit/miss, the timestamp does.
  - `updateTag` from Server Actions for read-your-writes; `revalidateTag` from background work for stale-while-revalidate; the user-expectation question picks between them.
  - Invalidate after commit, then redirect; fan out to every affected tag; multiple `await updateTag` calls are the right shape.
  - The misuse demo proves why the framework restricts `updateTag` to actions — read-your-writes requires the in-band redirect path.
- Forward references:
  - Unit 15.3 — Upstash for distributed cache and rate limiting; the cache backend on Vercel deployments is the cross-process variant of what's running locally here.
  - Unit 17.2 — security baseline; cached reads must never include per-user PII keyed by org scope (a real concern when caching enters the picture).
  - Unit 19.3 — integration tests for the invalidation paths; the "fetchedAt advances after edit" assertion is mechanical.
  - Unit 20.1 — structured logs; the `cache_invalidation_log` table is the development-time analog of the production dashboard for invalidation rate per tag.
  - Unit 21.4 — schema migrations against a live app; cached reads that close over schema shape need the expand-migrate-contract discipline.

Senior calls and watch-outs:

- The verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- The misuse demo must run with the toggle deliberately — flipping it in the middle of an unrelated verification produces confusing results. Use it as its own dedicated step.

Codebase state at entry: full cache + invalidation paths + verifying surface wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`use cache`, `cacheLife`, `cacheTag`, `tags.ts`, `fetchedAt`, `updateTag`, `revalidateTag`, after-commit ordering, multi-tag fan-out, the closure rule) and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
