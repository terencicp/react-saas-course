# Chapter 073 — Project: caching the invoices list with tag-driven invalidation

## Chapter framing

Chapter 073 cashes in the decision discipline of chapter 072 — the route-class checklist and cacheable shortlist (lesson 1 of chapter 072), the four tag shapes funneled through `tags.ts` (lesson 1 of chapter 072), the `fetchedAt` diagnostic (lesson 1 of chapter 072), the four-way invalidation tree (lesson 2 of chapter 072), the `updateTag`-Server-Action-only rule (lesson 2 of chapter 072), the after-commit-then-redirect sequence (lesson 2 of chapter 072) — as one runnable surface on top of the chapter 062 invoices list.
The student adds `use cache` boundaries to the cached reads (the list, the per-org summary, and the detail page), defines the `tags.ts` helpers that mirror `org:${orgId}:invoices`, `org:${orgId}:invoice:${id}`, and `org:${orgId}:summary` through the namespaced `invoiceTags` object, emits a `fetchedAt` timestamp inside each cached function as the cache-state proxy, calls `updateTag` from the edit and lifecycle actions (read-your-writes — the same user is sitting on the redirect), and calls `revalidateTag` from an in-process summary-recompute job (eventual — no user is watching).
The data layer is a deterministic in-memory store (`src/server/store.ts`) standing in for Postgres, and the "background job" is a plain async function (`recomputeOrgSummary`) standing in for a Trigger.dev `schemaTask` — neither dependency is built, only named, so the project boots with `pnpm dev` and nothing else.
Each build closes on a runnable state the student confirms through the inspector.

The senior calls that thread through every lesson:

- Caching is opt-in and the senior default for the authenticated SaaS surface is dynamic — only the list query, the summary widget, and the detail read take `use cache`, the rest stays dynamic.
- `tags.ts` is the only place tag strings exist — read sites and write sites import the same functions, a grep for raw `'org:'` strings outside `tags.ts` is a red flag.
- The cached read is a function whose tags depend only on its arguments — `orgId` is passed in, never read from the session inside the cached function.
- `fetchedAt` is the verification proxy because Next.js doesn't surface cache hit/miss to user code — stable timestamp across requests means hit, advancing timestamp means miss.
- The invalidation call runs after commit, then the redirect — never inside the transaction.
- `updateTag` only inside Server Actions for read-your-writes, `revalidateTag` from the recompute job for the eventual path; misusing `revalidateTag` from the Server Action is the deliberate failure-mode demo.
- The inspector's `fetchedAt` strip is the on-page reading of cache state for every verification step.

### Project goals

The finished surface satisfies these outcomes, each confirmable through `/invoices` and the inspector:

- First list visit shows one `listFetchedAt`; a prompt reload keeps it stable (cache hit) — the inspector's hit/miss probe links to `/invoices` so the student can observe the stable timestamp.
- Editing an invoice and returning to the list shows a fresh `listFetchedAt` and the new value on the same render (read-your-writes via `updateTag`), with `updateTag` fired for list + record + summary.
- Firing the summary-recompute job leaves `summaryFetchedAt` unchanged on the current visit; the next visit shows the new aggregate with a fresh `summaryFetchedAt` (eventual via `revalidateTag`, stale-while-revalidate).
- Misusing `revalidateTag` from the server action leaves `listFetchedAt` stale and the edited value invisible on the submitting request — the deterministic demonstration of why read-your-writes needs `updateTag`.
- Archive, restore, and soft-delete each invalidate both the list and the summary: the row enters or leaves `view=active`, `listFetchedAt` advances, and `summaryFetchedAt` advances as totals shift.
- A record-level edit invalidates only the affected invoice's detail: after editing invoice A, detail B's `fetchedAt` stays stable while detail A's advances, because `invoiceTags.record(orgId, A)` is a distinct tag from `invoiceTags.record(orgId, B)`.
- Invalidation in org A does not invalidate org B's caches — the org-B list `listFetchedAt` is unchanged after an org-A edit, because `org:${A}:invoices` is a distinct tag from `org:${B}:invoices`.
- Tag strings exist only in `tags.ts`: a grep for `org:.*:invoices` and `org:.*:invoice:` outside `tags.ts` and the cached read sites returns zero raw hits at write sites.
- The inspector's `cacheLife` readout shows `listInvoices: 'minutes'`, `getInvoiceDetail: 'minutes'`, and `getOrgInvoiceSummary: 'hours'` — short for the high-edit list and detail, long for the job-refreshed summary.
- The cached reads take `orgId` as an explicit argument and never close over session — a grep for `getSession()` / `cookies()` / `headers()` inside the cached bodies returns zero hits.
- Each action commits its in-store write, then fires its `updateTag` calls, then redirects — the after-commit ordering is visible in the source.

The starter does not depend on Postgres, Drizzle, Docker, Better Auth, or Trigger.dev — those chapter-line dependencies are reproduced as deterministic in-memory analogs so the project boots with `pnpm dev` and nothing else. The carry-in below names both the conceptual lineage and the concrete stand-in each one ships as.

- **From chapter 062 (the starter base):** `app/(app)/invoices/page.tsx` Server Component reading `invoiceListSearchParamsCache` (nuqs), the `<Toolbar />` / `<InvoicesTable />` / `<Pagination />` / `<ViewTabs />` shells, `listInvoices({ orgId, view, status, sort, q, cursor, role, pageSize? })` in `src/lib/invoices/queries.ts`, the scoped-query helper `scopedInvoices(orgId).active()/.archived()/.includingDeleted()`, the four Server Actions (`updateInvoice`, `archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`) all returning the canonical `Result<Invoice>` shape with the `version` precondition and tenancy + lifecycle filtering in every read.
- **From chapter 062 (concurrency surface):** the `version` field on each `Invoice`, the `<ConflictBanner />` with the `current` payload, `useActionState` + `useOptimistic` in `<InvoicesTable />` and `<EditForm />`.
- **From chapter 059 (tenancy + RBAC):** the tenant-scoped read path `scopedInvoices(orgId)` (the in-memory analog of `tenantDb`), `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, the active-org slot carried on the dev `Session`, `pushAudit(entry)` writing the in-memory `auditLogs` array (the `audit_logs` analog).
- **From chapter 041 (schema):** the `Invoice` and `AuditLog` types in `src/server/types.ts`, the seeded `invoices` array in `src/server/store.ts` (45 acme + one pre-archived + one pre-soft-deleted with a number colliding a live row + 6 globex), and `OrgInvoiceSummary` (`orgId`, `totalCount`, `totalAmount`, `updatedAt`) held in the `summaries` Map — the in-memory `org_invoice_summaries` analog, empty after seed.
- **From lesson 1 of chapter 032:** `cacheComponents: true` flag — already in `next.config.ts`, every route dynamic by default; opt-in only via `use cache`.
- **From lesson 3 of chapter 032:** `use cache` directive on three placements (page / component / function), serializable arguments, closure rules — cached function cannot read `cookies()` / `headers()` / session inside.
- **From lesson 4 of chapter 032:** `cacheLife` profiles (`'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`), `cacheTag(...)` call inside the cached function.
- **From lesson 6 of chapter 032:** `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (eventual), `revalidatePath`, `router.refresh`.
- **From lesson 1 of chapter 072:** the four tag shapes (entity / record / org-scoped / user-scoped), `tags.ts` helper convention, tag-string conventions (lowercase, colon-delimited, scope first), the `fetchedAt` discipline, the "no closures over request data — tags are arguments" rule.
- **From lesson 2 of chapter 072:** the four-call decision tree, the user-expectation question as the primary driver, the after-commit-then-redirect rule, the redirect-then-invalidate anti-pattern, multiple-tags-per-mutation fan-out.
- **From lesson 4 of chapter 066:** the Trigger.dev `schemaTask` / code-defined-queue concept, named not built — the starter ships a plain in-process `recomputeOrgSummary({ orgId })` async function (`src/server/jobs/summary-recompute.ts`) that the inspector's "Run summary task" button invokes directly, so the project needs no Trigger.dev account.
- **From chapter 043 + chapter 047:** canonical `Result<T>` shape (`src/lib/result.ts`), Zod 4 at the action boundary, `'use server'`.

### Starter file tree (stubs marked with TODO)

The `start/` and `solution/` trees are identical — all differences are in source file contents (no degit step, no separate-repo clone). The five TODO files carry inline `TODO(L2)` / `TODO(L3)` / `TODO(L4)` markers; everything else is provided.

```
next.config.ts                  # provided: cacheComponents: true; typedRoutes, reactCompiler, turbopack
package.json                    # provided: dev, build, verify, test:lesson (no db scripts — in-memory store)
vitest.config.ts                # provided
src/
  server/
    types.ts                    # provided: Invoice, AuditLog, InvoiceStatus, Role; roleAtLeast()
    store.ts                    # provided: in-memory store (Postgres analog) — invoices, auditLogs,
                                #           summaries Map, invalidationLog, misuseFlag; reseed() + seed
    session.ts                  # provided: cookie-based dev identity getSession() / setActingIdentity()
    jobs/
      summary-recompute.ts      # TODO(L4): recomputeOrgSummary({orgId}) body — recompute, upsert, revalidateTag
  lib/
    result.ts                   # provided: Result<T>, ok/err/conflict
    authed-action.ts            # provided: authedAction(role, schema, fn) wrapper (chapter 057 analog)
    utils.ts                    # provided: cn()
    cache/
      tags.ts                   # TODO(L2): invoiceTags namespaced helpers (.list / .record / .summary)
      profiles.ts               # TODO(L2): cacheProfiles map for the readout panel
      log.ts                    # provided: logCacheInvalidation(tag, source) → pushInvalidation
    invoices/
      scoped-query.ts           # provided from chapter 062: scopedInvoices(orgId) fluent builder
      queries.ts                # provided shell; TODO(L2): add `use cache` + cacheLife + cacheTag + fetchedAt
                                #           to listInvoices, getOrgInvoiceSummary, getInvoiceDetail
      actions.ts                # provided from chapter 062; TODO(L3): add updateTag fan-out after commit
      search-params.ts          # provided from chapter 062: nuqs parsers + invoiceListSearchParamsCache
  app/
    layout.tsx / page.tsx / globals.css   # provided
    _components/                # provided: providers.tsx, submit-button.tsx
    (app)/invoices/
      page.tsx                  # provided shell; renders <FetchedAtStrip /> + existing list
      loading.tsx               # provided
      fetched-at-strip.tsx      # provided: reads listFetchedAt + summaryFetchedAt + detailFetchedAt from props
      toolbar.tsx               # provided from chapter 062 (Client, nuqs)
      view-tabs.tsx             # provided from chapter 062 (Client, RBAC-gated All tab)
      active-filter-chips.tsx / clear-chip.tsx   # provided from chapter 062
      table.tsx                 # provided from chapter 062 (InvoicesTable, optimistic archive)
      pagination.tsx            # provided from chapter 062 (cursor-based, nuqs)
      [id]/edit/
        page.tsx                # provided from chapter 062
        loading.tsx             # provided
        edit-form.tsx           # provided from chapter 062
        conflict-banner.tsx     # provided from chapter 062
    inspector/
      page.tsx                  # provided: store counts, cache panels, identity switcher, audit tail
      loading.tsx               # provided
      actions.ts                # provided: resetAndReseed, switchIdentity, forceVersionDrift
      cache-actions.ts          # provided: editOneInvoice, archive/restore/deleteOneInvoice,
                                #           runSummaryJob, toggleMisuseRevalidate
      force-updatetag/route.ts  # provided: Route Handler — calls updateTag to prove it throws outside an action
      _components/              # provided: cachelife-readout, cache-buttons, invalidation-log,
                                #           hitmiss-probe, force-updatetag-island, misuse-toggle
  components/ui/                # provided: shadcn/ui primitives
lesson-verification/
  Lesson 2.ts / Lesson 3.ts / Lesson 4.ts   # provided: per-lesson Vitest suites (run via pnpm test:lesson)
```

The starter ships chapter 062 working end-to-end: URL state, scoped query helper, version-precondition actions, audit log, conflict banner.
This project layers the cache on top — no rewrites to the existing surface, only additions inside the query functions and the actions plus the recompute job, `tags.ts`, and `profiles.ts`.
The highlighted focus files (TODOs) are `src/lib/cache/tags.ts`, `src/lib/cache/profiles.ts`, `src/lib/invoices/queries.ts`, `src/lib/invoices/actions.ts`, and `src/server/jobs/summary-recompute.ts`.

### Reference solution signatures lessons display

- **Tag helper** (`src/lib/cache/tags.ts`) — the namespaced `invoiceTags` object from lesson 1 of chapter 072:
  - `invoiceTags.list = (orgId: string) => \`org:${orgId}:invoices\`` — list-level invalidation for an org.
  - `invoiceTags.record = (orgId: string, id: string) => \`org:${orgId}:invoice:${id}\`` — record-level invalidation, org-scoped.
  - `invoiceTags.summary = (orgId: string) => \`org:${orgId}:summary\`` — aggregate-level invalidation.
  - Each helper is a pure function of its arguments. The string template is the contract; tag strings live nowhere else.
- **Cached list read** (`src/lib/invoices/queries.ts`):
  - `listInvoices(args: ListInvoicesArgs): Promise<ListInvoicesResult & { fetchedAt: string }>` where `ListInvoicesArgs = { orgId, view, status, sort, q, cursor, role, pageSize? }` and `ListInvoicesResult = { rows, nextCursor, hasPrev }` — body opens with `'use cache'`, then `cacheLife('minutes')`, then `cacheTag(invoiceTags.list(args.orgId))`. Returns `{ rows, nextCursor, hasPrev, fetchedAt: new Date().toISOString() }`. The `view`, `status`, `sort`, `q`, `cursor`, `role`, `pageSize` are serializable arguments — they participate in the cache key.
  - `args.orgId` is always passed in by the page; the cached function does not read session inside.
- **Cached summary read** (`src/lib/invoices/queries.ts`):
  - `getOrgInvoiceSummary(orgId: string): Promise<{ totalCount: number; totalAmount: number; updatedAt: string; fetchedAt: string }>` — body opens with `'use cache'`, then `cacheLife('hours')`, then `cacheTag(invoiceTags.summary(orgId))`. Reads the precomputed aggregate from the `summaries` Map via `getSummaryRow(orgId)`; falls back to a live count + sum over the active invoices if the row is absent (first run before the job lands).
- **Cached detail read** (`src/lib/invoices/queries.ts`):
  - `getInvoiceDetail({ orgId, id, role }): Promise<(Invoice & { fetchedAt: string }) | null>` — body opens with `'use cache'`, then `cacheLife('minutes')`, then both `cacheTag(invoiceTags.record(orgId, id))` and `cacheTag(invoiceTags.list(orgId))` so either a record-level or an org-level invalidation hits it (the tag-union rule from lesson 1 of chapter 072).
- **Update action with `updateTag` fan-out** (`src/lib/invoices/actions.ts`):
  - `updateInvoice` (all four return `Result<Invoice>` and validate FormData via `authedAction`), after the in-store write commits and before `redirect`:
    - `await updateTag(invoiceTags.list(ctx.orgId))` — invalidates the list.
    - `await updateTag(invoiceTags.record(ctx.orgId, id))` — invalidates the record.
    - `await updateTag(invoiceTags.summary(ctx.orgId))` — invalidates the summary (totals changed).
    - `logCacheInvalidation(tag, 'action')` after each `updateTag` returns; then `redirect('/invoices')`.
  - `archiveInvoice` / `restoreInvoice` / `softDeleteInvoice` route the same after-commit fan-out through a shared `invalidateInvoice(orgId, id)` helper: list + record + summary. Restoring fires the same three calls (the row's visibility changes for both the list and the summary).
- **In-process summary-recompute job** (`src/server/jobs/summary-recompute.ts`):
  - `recomputeOrgSummary(input: { orgId: string }): Promise<{ orgId: string; totalCount: number; totalAmount: number }>` — a plain server-only async function standing in for a Trigger.dev `schemaTask` (named, not built).
  - Body: Zod-validate the `{ orgId }` input at the boundary; compute `totalCount` and `totalAmount` over the org's active (non-deleted) invoices; `upsertSummaryRow(...)` into the `summaries` Map; `await revalidateTag(invoiceTags.summary(orgId), 'max')`; `logCacheInvalidation(invoiceTags.summary(orgId), 'job')`; return `{ orgId, totalCount, totalAmount }`.
  - The inspector's "Run summary task" button (`runSummaryJob` in `cache-actions.ts`) calls `recomputeOrgSummary({ orgId: session.orgId })` directly — no Trigger.dev account, no `tasks.trigger`, no env key.
- **`summaries` Map (the `org_invoice_summaries` analog):**
  - `OrgInvoiceSummary = { orgId: string; totalCount: number; totalAmount: number; updatedAt: string }`, one entry per org, empty after seed; accessed via `getSummaryRow` / `upsertSummaryRow`.
- **Env entries:** none — the project boots with `pnpm dev` and no `.env`; dev identity comes from the `acting-identity` cookie (default `org-acme:admin`).

### Inspector page spec

Server Component at `/inspector` (`src/app/inspector/page.tsx`) with provided `_components/`, `actions.ts`, and `cache-actions.ts` — the verification surface for every project outcome. Server-side reads; refreshes via Server-Action redirects and `revalidatePath`.

- **Identity switcher:** the `switchIdentity` Server Action writes the `acting-identity` cookie (admin / member per seeded org, two orgs). "Reset and re-seed" (`resetAndReseed`) calls `reseed()`, clearing the `summaries` Map and `invalidationLog` and re-loading the seed. `forceVersionDrift` bumps a row's `version` for the conflict demo.
- **`fetchedAt` strip:** the same `<FetchedAtStrip />` component the list page renders, fed `listFetchedAt` (from `listInvoices`) and `summaryFetchedAt` (from `getOrgInvoiceSummary`).
- **"Edit one invoice" button:** `editOneInvoice` runs `updateInvoice` on `inv-0001` for the active org with a small amount delta, fires `updateTag` for list + record + summary (after commit), redirects to `/inspector`. The redirected render shows fresh `fetchedAt` values for both cached reads.
- **"Archive / restore / soft-delete one invoice" buttons:** `archiveOneInvoice` / `restoreOneInvoice` / `deleteOneInvoice`, same pattern against the seeded lifecycle rows, each verifying its action's `updateTag` fan-out via `invalidateInvoice`.
- **"Run summary task" button:** `runSummaryJob` calls `recomputeOrgSummary({ orgId: session.orgId })` directly (in-process — no Trigger.dev). The job upserts the `summaries` row and calls `revalidateTag(invoiceTags.summary(orgId), 'max')`. The inspector renders **before** the next visit's read sees the new value — `summaryFetchedAt` stays stable on this render, then advances on the next refresh.
- **"Misuse `revalidateTag` from action" toggle:** `toggleMisuseRevalidate` flips the in-store `misuseFlag.misuseRevalidateFromAction`. When on, `updateInvoice` routes the list tag through `revalidateTag` instead of `updateTag`. On the immediate redirect, `listFetchedAt` stays stale (the row's edit is not visible) — the deterministic demonstration of why read-your-writes needs `updateTag` from Server Actions.
- **Tag-invalidation log tail:** the `<InvalidationLog />` Server Component renders the tail of the in-memory `invalidationLog` array (each entry `{ seq, tag, source: 'action' | 'job', firedAt }`, pushed by `logCacheInvalidation` next to the `updateTag`/`revalidateTag` call). The tail is the structured-log surface foreshadowed in lesson 2 of chapter 072.
- **`cacheLife` readout:** `<CacheLifeReadout />` renders one row per cached function with its profile string, sourced from the `cacheProfiles` map in `lib/cache/profiles.ts` (the student populates it alongside `tags.ts`). It shows the dash placeholder until S1 fills the map; no resolved stale/revalidate/expire triple — just the profile name.
- **"Hit/miss probe":** `<HitMissProbe />` links to `/invoices` in a new tab. A stable `list-fetched-at` across prompt reloads (within the `minutes` window) is a hit; an advancing one is a miss.
- **"Force `updateTag` from a Route Handler" island:** `<ForceUpdateTagIsland />` (Client) fetches `/inspector/force-updatetag` (a Route Handler that calls `updateTag` inside try/catch) and renders the caught framework error message — `updateTag` is unavailable outside a Server Action. This works correctly even before S1, since the throw is about the call context, not the tag string.

The inspector is provided in full; the student writes only `tags.ts`, `profiles.ts`, the `use cache` annotations on the three queries, the invalidation calls in the four actions, and the `recomputeOrgSummary` job body.

### Concepts demonstrated → owning lesson

- `cacheComponents: true` and dynamic-by-default — lesson 1 of chapter 032 (carried in; surfaced in lesson 1 of chapter 073).
- `use cache` directive, serializable args, closure rules — lesson 3 of chapter 032; applied in lesson 2 of chapter 073.
- `cacheLife` profile selection — lesson 4 of chapter 032 + lesson 1 of chapter 072 (UX framing); applied in lesson 2 of chapter 073.
- `cacheTag` and the four tag shapes — lesson 4 of chapter 032 + lesson 1 of chapter 072; applied in lesson 2 of chapter 073.
- `tags.ts` helper as the structural enforcement — lesson 1 of chapter 072; built in lesson 2 of chapter 073.
- The `fetchedAt` diagnostic — lesson 1 of chapter 072; emitted in lesson 2 of chapter 073.
- The "tags are arguments, not ambient" rule — lesson 1 of chapter 072; enforced in lesson 2 of chapter 073.
- The four-call invalidation surface and the decision tree — lesson 6 of chapter 032 + lesson 2 of chapter 072; applied across lessons 3 and 4 of chapter 073.
- The user-expectation question as the primary driver — lesson 2 of chapter 072; surfaced in lessons 3 and 4 of chapter 073.
- `updateTag` Server-Action-only restriction — lesson 2 of chapter 072; applied in lesson 3 of chapter 073.
- `revalidateTag` from webhooks and background jobs — lesson 2 of chapter 072; applied in lesson 4 of chapter 073 (from the in-process `recomputeOrgSummary` job).
- Multiple tags per mutation (the fan-out) — lesson 2 of chapter 072; applied in lesson 3 of chapter 073.
- After-commit-then-redirect ordering — lesson 2 of chapter 072; applied in lesson 3 of chapter 073.
- Org-scoping the tag mirrors data-layer scoping — chapter 056 + lesson 1 of chapter 072; applied in lessons 2 and 3 of chapter 073.
- Trigger.dev `schemaTask` and queue declaration — lesson 4 of chapter 066; named in lesson 4 of chapter 073 as the production shape the in-process `recomputeOrgSummary` job stands in for.
- `authedAction`, tenant-scoped reads, audit-log writes — chapter 057 / chapter 059; carried in as in-memory analogs (`authedAction`, `scopedInvoices`, `pushAudit`).

### Forward references

- Chapter 074 — Upstash for distributed cache and rate limiting; the cache backend on Vercel deployments is the cross-process variant of what runs locally here.
- Chapter 081 — security baseline; cached reads must never include per-user PII keyed by org scope (a real concern once caching enters the picture).
- Chapter 088 — integration tests for the invalidation paths; the "`fetchedAt` advances after edit" assertion is mechanical.
- Chapter 092 — structured logs; the in-memory `invalidationLog` is the development-time analog of the production dashboard for invalidation rate per tag.
- Chapter 099 — schema migrations against a live app; cached reads that close over schema shape need the expand-migrate-contract discipline.

---

## Lesson 1 — Project Overview

The starter is the chapter 062 invoices list — URL state, scoped queries, version-precondition actions, audit log — running dynamically with no caching, on a deterministic in-memory store (no Postgres, no Docker).
This project layers a tag-driven cache on top: `use cache` on the list, the per-org summary, and the detail read; a three-helper `tags.ts`; `updateTag` fan-out from the four lifecycle actions for read-your-writes; and `revalidateTag` from an in-process summary-recompute job for the eventual path.
The finished `/invoices` page carries a `<FetchedAtStrip />` at the top showing the `fetchedAt` timestamps, and the inspector reads the `cacheLife` profile per cached function — the on-page reading of cache state.

### What we'll practice

- Choosing what earns a `use cache` directive on an authenticated SaaS surface and what stays dynamic.
- Centralizing tag strings in a single `tags.ts` module that read sites and write sites share.
- Keeping a cached read pure: its tags depend only on its arguments, never on ambient session state.
- Reading cache hit/miss off a `fetchedAt` proxy because the framework does not surface it.
- Picking between `updateTag` (read-your-writes, from Server Actions) and `revalidateTag` (eventual, from background work) by asking who is waiting on the result.
- Fanning a single mutation out to every cached read it affects, after commit and before redirect.

### Architecture

The shape, read-to-write:

- The `/invoices` Server Component reads the session, then calls the cached reads with `orgId` passed in as an argument — `listInvoices(args)`, `getOrgInvoiceSummary(orgId)`, and `getInvoiceDetail({ orgId, id })` on the detail route.
- Each cached read opens with `'use cache'`, sets a `cacheLife` profile, emits its tags through `tags.ts`, and returns a `fetchedAt` timestamp frozen into the cache entry.
- The four lifecycle Server Actions (`updateInvoice`, `archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`) commit their in-store write, then fan `updateTag` out to the list, record, and summary tags, then redirect — the same user lands on a fresh read.
- The in-process `recomputeOrgSummary` job recomputes the `summaries` row and calls `revalidateTag` for the summary tag — no user is waiting, so the next visit picks up the new aggregate.
- The `/inspector` Server Component drives every cache-state observation: the `fetchedAt` strip, the hit/miss probe link, one-click edit and lifecycle buttons, the run-summary-task button, the misuse toggle, the force-`updateTag`-from-Route-Handler island, and the tag-invalidation log tail.

### Starting file tree

See the **Starter file tree** in the chapter framing above for the full annotated layout.
The five TODO files are the focus: `src/lib/cache/tags.ts` (empty-string stubs) and `src/lib/cache/profiles.ts` (empty map), `src/lib/invoices/queries.ts` (chapter 062 reads with no `use cache`), `src/lib/invoices/actions.ts` (chapter 062 actions with only `revalidatePath`, no `updateTag`), and `src/server/jobs/summary-recompute.ts` (a body that throws `summary job not implemented`).
Everything else — the in-memory `store.ts` (including the `summaries` Map, seeded empty), `next.config.ts` with `cacheComponents: true` already set, the seed, the `invalidationLog` array with its `logCacheInvalidation(tag, source)` helper, the `<FetchedAtStrip />`, and the entire inspector — is provided.

The starter's `getOrgInvoiceSummary` falls back to a live count + sum over the active invoices when the summary row is absent, so the cached read works from minute one; once the job lands and populates the `summaries` row, the query reads from it.
The `<FetchedAtStrip />` is provided — the student threads the `fetchedAt: new Date().toISOString()` line through each cached function's return so the strip has a value to show, rather than authoring the component.

### Roadmap

- **Lesson 2 — Cache the reads.** Write `tags.ts` and `profiles.ts`, annotate the list, summary, and detail reads with `use cache` + `cacheLife` + `cacheTag`, and emit `fetchedAt` so the strip shows stable timestamps across refreshes.
- **Lesson 3 — Read-your-writes invalidation.** Fan three `updateTag` calls out of the four lifecycle actions after commit, so editing or moving an invoice refreshes the list and summary on the same render; wire the misuse-`revalidateTag`-from-action branch as the failure-mode demo.
- **Lesson 4 — Eventual invalidation.** Implement the `recomputeOrgSummary` job that recomputes the aggregate and calls `revalidateTag`, so the background job lands the new summary on the next visit (stale-while-revalidate).

### Setup

Install and run the dev server — no Postgres, no Docker, no env file:

1. `cd start` (the starter is the `start/` directory; the `solution/` directory holds the reference).
2. `pnpm install`
3. `pnpm dev`

No environment variables: the project boots against the in-memory store, and dev identity comes from the `acting-identity` cookie (default `org-acme:admin`), switched on the inspector.

On success, `pnpm dev` serves `/invoices` rendering the chapter 062 list dynamically, with the `<FetchedAtStrip />` showing `fetchedAt` timestamps that advance on every refresh (the reads are not yet cached).
`/inspector` loads; "Edit one invoice" commits at the store (the audit log writes) but fires no `updateTag` yet; "Run summary task" throws because the job body is unimplemented.

---

## Lesson 2 — Cache the reads

Instrument the chapter 062 reads so the list, the per-org summary, and the detail page serve from cache, and the `<FetchedAtStrip />` reads stable timestamps across refreshes.

The finished state: opening `/invoices` shows a `listFetchedAt` and a `summaryFetchedAt` that hold steady on refresh, and an invoice detail page shows a `fetchedAt` that holds steady on refresh — the framework is serving cached values.

### Your mission

Take the three reads the invoices surface depends on — the paginated list, the per-org totals summary, and the single-invoice detail — and turn them into cached functions without touching their existing chapter 062 query logic.
A cached read opens its body with `'use cache'`, picks a `cacheLife` profile, and emits its invalidation tags through the shared `tags.ts` helpers; the directives wrap the existing scoped query rather than replacing it.
The senior call you are making here is which reads earn the directive at all: the list, the summary, and the detail are read often and tolerate brief staleness, so they take `use cache`; the toolbar and any Client Component stay dynamic because they read request-scoped URL state, and adding `use cache` to them is the trap to avoid.
The cache backend does not expose hit/miss to user code, so each cached function returns a `fetchedAt` timestamp computed once when the function runs and frozen into the entry — a stable timestamp across requests means a hit, an advancing one means a miss; this is your only window into cache state and the rest of the project leans on it.
Two constraints shape the tags: every tag string lives only in `tags.ts` (lowercase, colon-delimited, scope first) so read sites and write sites import the same function, and a cached function's tags depend only on its arguments — `orgId` is passed in by the page, never read from the session inside the cached body, or the cache key would silently leak request state.
The detail read is the one place a read carries two tags, the record tag and the org tag, so that either a single-invoice write or an org-wide change invalidates it.
Out of scope: any `updateTag` or `revalidateTag` wiring (the next two lessons), per-user `'use cache: private'` caches (a senior call deferred until a workload justifies it), and edge or CDN tuning.

- The three tag helpers in `tags.ts` each return their documented string and are imported wherever a tag is needed — a grep for raw `org:` or `invoice:` strings outside `tags.ts` and the cached reads returns zero hits.
- Opening `/invoices` shows a `listFetchedAt` that stays identical across a prompt reload (within the `minutes` window) — the inspector's hit/miss probe links to `/invoices` so the student can watch the stable timestamp.
- The per-org summary shows a `summaryFetchedAt` that stays identical across reloads, and reads correctly whether or not the `summaries` row exists yet (the live-aggregate fallback covers the empty seed).
- Changing a URL filter (for example `?status=paid`) produces a new `listFetchedAt` for the new arguments, which then stays stable on reload — the filter, sort, cursor, view, and role participate in the cache key.
- An invoice detail page shows a `fetchedAt` that stays stable across reloads.
- The inspector's `cacheLife` readout shows `listInvoices: 'minutes'`, `getInvoiceDetail: 'minutes'`, and `getOrgInvoiceSummary: 'hours'`.
- A grep of the three cached bodies for session reads, `cookies()`, or `headers()` returns zero hits — the page passes `orgId` in.

### Coding time

Implement the three cached reads, `tags.ts`, and `profiles.ts` against the brief and the test suite, then read the reference walkthrough.

The reference signatures are in the chapter framing. The decisions worth narrating in the walkthrough:

- `cacheLife('minutes')` for the list and detail versus `cacheLife('hours')` for the summary: the list and detail are read and edited often, so a few minutes is the right staleness ceiling if an invalidation ever fails to fire; the summary is refreshed explicitly by the job and only matters on the dashboard, so hours is the right call. Populate the `cacheProfiles` map in `profiles.ts` so the inspector readout matches.
- The `fetchedAt` line goes inside the cached function's return so it is computed once per cache entry, not per request — this is what makes a stable timestamp meaningful as a hit signal.
- The detail read carries both `invoiceTags.record(orgId, id)` and `invoiceTags.list(orgId)` so it invalidates on either a record-level write (`updateInvoice`) or a future org-level write — tagging at the granularity of the writes that should reach it, not just the read's own identity.
- The page-level wiring is a single-line change: the parent already calls `listInvoices(args)` and `getOrgInvoiceSummary(orgId)`; pass the returned `fetchedAt` values through to `<FetchedAtStrip listFetchedAt={...} summaryFetchedAt={...} />`.
- Keep the directive off the toolbar and any Client Component — it reads URL state, which is request-scoped, and is dynamic by definition.

### Moment of truth

Run the lesson's test suite:

- `pnpm test:lesson 2` — runs the `lesson-verification/Lesson 2.ts` Vitest suite; expect all assertions green, covering stable `fetchedAt` across repeated reads, distinct cache entries per filter argument, and the absence of session reads inside the cached bodies.

Confirm by hand the requirements the tests do not cover:

- [ ] Open `/invoices`; note `listFetchedAt` and `summaryFetchedAt`. Reload promptly; both unchanged.
- [ ] Open the inspector's hit/miss probe link to `/invoices`; reload promptly; the same `listFetchedAt`.
- [ ] Change the URL filter to `?status=paid`; `listFetchedAt` is new for the new args; reload; it holds stable.
- [ ] Open an invoice detail page; note its `fetchedAt`; reload; it holds stable.
- [ ] The inspector `cacheLife` readout shows `listInvoices: 'minutes'`, `getInvoiceDetail: 'minutes'`, `getOrgInvoiceSummary: 'hours'`.
- [ ] Grep for `org:` and `invoice:` strings outside `tags.ts` and the cached reads — zero hits at any other site.

Caching demonstrably works at this point; no invalidation paths exist yet, so a write leaves the cache stale until the entry's `cacheLife` expires — the next two lessons close that gap.

---

## Lesson 3 — Read-your-writes invalidation

Make every edit and lifecycle change refresh the list and summary on the same render, so a user who edits an invoice and lands back on the list sees the new value immediately.

The finished state: from the inspector, "Edit one invoice" redirects to `/invoices` with `listFetchedAt` and `summaryFetchedAt` both advanced and the edited amount visible; archive, restore, and soft-delete behave the same against their seeded rows.

### Your mission

The four lifecycle actions already commit correctly against the chapter 062 version-precondition write; your job is to make each one invalidate every cached read it affects, so the user who triggered the write reads their own change on the redirect.
An invoice edit touches three cached entries — the org list, that invoice's record, and the org summary totals — so each action fans `updateTag` out to all three; missing one is the silent stale-read bug, and the three-tag fan-out is the minimum complete set for an invoice mutation.
Ordering is load-bearing and is the discipline this lesson exists to teach: the write commits, then the `updateTag` calls fire, then the redirect runs — invalidating before commit risks invalidating a change that then rolls back, and redirecting before invalidating produces a one-render stale view on the destination.
`updateTag` is the right primitive here precisely because a specific user is sitting on the redirect and expects read-your-writes; it only works inside Server Actions, and you are calling it from the four actions through the `tags.ts` helpers, never with a raw string.
To make the contrast deterministic, wire one branch — in `updateInvoice` only — that reads the in-store `misuseFlag.misuseRevalidateFromAction` (the inspector toggle flips it) and calls `revalidateTag` instead of `updateTag` for the list tag when the flag is on; this is a teaching surface, not production code, and the walkthrough should say so plainly.
The lifecycle actions (`archive` / `restore` / `softDelete`) route their fan-out through a shared `invalidateInvoice(orgId, id)` helper; each invalidation call also goes through the provided `logCacheInvalidation(tag, 'action')` helper, placed after the actual `updateTag` call returns so a failed invalidation never produces a misleading log entry.
Out of scope: the summary-recompute job and its `revalidateTag` call (the next lesson) — here every invalidation is the in-band, user-facing path.

- From the inspector, "Edit one invoice" redirects to `/invoices` with `listFetchedAt` advanced and the edited amount reflected on the redirected render.
- The same edit advances `summaryFetchedAt` on the redirected render (the totals shifted), and the invalidation log tail shows three entries — list, record, summary — sourced as `action`.
- Editing invoice A and then visiting invoice B's detail leaves B's `fetchedAt` stable, while invoice A's detail `fetchedAt` advances — the record tag scopes to the affected invoice.
- Archive, restore, and soft-delete each redirect with both `listFetchedAt` and `summaryFetchedAt` advanced, and the row correctly enters or leaves `view=active` and the summary totals.
- Editing as admin in org A and switching the inspector session to org B leaves org B's `listFetchedAt` unchanged — the org-scoped tags are distinct.
- With the misuse toggle on, "Edit one invoice" redirects with `listFetchedAt` stale and the edited amount not visible on that render; with the toggle off, the same edit advances `listFetchedAt` and shows the new amount.
- Reading any action's source shows the order: in-store commit, then the `updateTag` calls, then the redirect.

### Coding time

Implement the `updateTag` fan-out across the four actions and the misuse branch against the brief and the tests, then read the reference walkthrough.

The reference signatures are in the chapter framing. The decisions worth narrating:

- The three-tag fan-out per action (list + record + summary): narrate why each lifecycle action needs all three — archive, restore, and soft-delete each move a row in or out of the active set, change the record's display, and shift the summary totals.
- After-commit ordering, named as a lint rule a senior runs by eye: the in-store write, then the `await updateTag(...)` calls, then `redirect(...)`. Name both inverse bugs — invalidate-then-commit and redirect-then-invalidate — and why each is wrong.
- `updateTag` is Server-Action-only by design: outside an action no specific user is sitting on the redirect, so read-your-writes is the wrong semantic and the framework rejects the call. This is the API enforcing the architectural rule.
- The misuse branch reads `misuseFlag.misuseRevalidateFromAction` (the inspector toggle flips it) and swaps `revalidateTag` in for `updateTag` on the list tag only; the other two tags stay on `updateTag`. Call out that production code never reads a misuse flag — the branch exists solely as the teaching surface.
- `logCacheInvalidation(tag, 'action')` is called after the real invalidation returns, not before, so a throwing `updateTag` does not leave a log row claiming success.

### Moment of truth

Run the lesson's test suite:

- `pnpm test:lesson 3` — runs the `lesson-verification/Lesson 3.ts` Vitest suite; expect all assertions green, covering `fetchedAt` advancing after an edit, the record-tag scoping, cross-org isolation, and the after-commit ordering.

Confirm by hand the requirements the tests do not cover:

- [ ] Inspector "Edit one invoice"; the redirect lands on `/inspector` with `listFetchedAt` and `summaryFetchedAt` advanced and the edited amount visible on `/invoices`; the log tail shows three `action` entries.
- [ ] Edit invoice A, then open invoice B's detail; B's `fetchedAt` is stable. Open invoice A's detail; its `fetchedAt` advanced.
- [ ] Archive a row; the redirect drops it from `view=active` and advances both timestamps. Restore it; both advance and the row returns. Soft-delete (as admin); switch to `view=all`; the row shows with a "Deleted" badge and the summary excludes it.
- [ ] As admin in org A, edit; switch the inspector identity to org B; org B's `listFetchedAt` is unchanged from before.
- [ ] Flip "Misuse `revalidateTag` from action" on; "Edit one invoice"; the redirect shows `listFetchedAt` stale and the old amount. Flip it off; repeat; `listFetchedAt` advances and the new amount shows.
- [ ] Read `updateInvoice`'s source: in-store commit, then the three `await updateTag(...)`, then `redirect(...)`.

Both the read-your-writes path and its deliberate failure mode are now wired; the eventual path follows in the next lesson.

---

## Lesson 4 — Eventual invalidation

Recompute the per-org summary off a background job, so the new aggregate lands on the next visit without any user waiting on it.

The finished state: from the inspector, "Run summary task" recomputes the `summaries` row and redirects to `/inspector` with `summaryFetchedAt` still stable on that render; a second refresh advances `summaryFetchedAt` and shows the new totals.

### Your mission

The summary aggregate is the one read in this project that a background job owns rather than a user action, and that ownership picks the invalidation primitive: no specific user is sitting on the recompute, so the job calls `revalidateTag` for the summary tag and the framework serves the stale value on the in-flight render, then refreshes on the next visit — stale-while-revalidate is the correct UX here, exactly because no one is waiting.
Implement `recomputeOrgSummary({ orgId })` as a plain server-only async function (the in-process stand-in for a Trigger.dev `schemaTask` — the production shape is named, not built): Zod-validate the `{ orgId }` input at the boundary so a misconfigured caller surfaces as a parse error rather than a silent recompute of the wrong org.
The body recomputes the totals from the org's active invoices (excluding soft-deleted), upserts the one `summaries` row for the org via `upsertSummaryRow`, and then calls `revalidateTag(invoiceTags.summary(orgId), 'max')` through the `tags.ts` helper — never with a raw string — and logs the invalidation via `logCacheInvalidation(invoiceTags.summary(orgId), 'job')`.
Note the contrast the job makes concrete: `updateTag` is unavailable here because it only works inside Server Actions, while `revalidateTag` works in background work — the API itself enforces which path a non-interactive recompute may take.
The inspector's "Run summary task" button is wired to the provided `runSummaryJob` Server Action, which already calls `recomputeOrgSummary({ orgId: session.orgId })` — once you implement the function body, the button works; there is no Trigger.dev account, `tasks.trigger`, or env key to wire.
Out of scope: scheduling the job on a real cron and any change to the action-side invalidation from the previous lesson. The production framing (a Trigger.dev `schemaTask` with a code-defined queue and concurrency limit) is named in the walkthrough but not built.

- From the inspector, "Run summary task" executes the job body and redirects to `/inspector` with `summaryFetchedAt` unchanged on that render (the stale value served).
- A manual refresh of `/inspector` after the job advances `summaryFetchedAt` and shows the recomputed totals.
- The invalidation log tail shows the summary-tag entry sourced as `job`.
- A payload with a malformed `orgId` is rejected at the job boundary rather than recomputing the wrong org.
- The inspector's "Force `updateTag` from a Route Handler" island shows a thrown framework error with a clear message — `updateTag` is unavailable outside a Server Action.

### Coding time

Implement the `recomputeOrgSummary` body against the brief and the tests, then read the reference walkthrough.

The reference signature is in the chapter framing. The decisions worth narrating:

- `revalidateTag` lands the new summary on the next visit, not the current one, and that is correct: no specific user is waiting on the job, so stale-while-revalidate is the right behavior. The inspector's "stable on this render, fresh on the next refresh" sequence is the demonstration of the concept lesson 2 of chapter 072 named.
- The Zod-validated `{ orgId }` payload is the Zod-at-the-boundary discipline from lesson 4 of chapter 066 and chapter 042 — a typoed `orgId` from a misconfigured caller is a parse error, not a silent wrong-org recompute.
- The production framing — a Trigger.dev `schemaTask` with a code-defined queue and a concurrency limit to keep a burst of recomputes from overwhelming the database — is named here as the shape this in-process function stands in for; the project does not build it, so no Trigger.dev account is needed.
- `logCacheInvalidation(invoiceTags.summary(orgId), 'job')` distinguishes job-sourced invalidations from action-sourced ones in the log tail.

### Moment of truth

Run the lesson's test suite:

- `pnpm test:lesson 4` — runs the `lesson-verification/Lesson 4.ts` Vitest suite; expect all assertions green, covering the recompute math, the upsert, the payload validation, and the eventual (next-visit) refresh.

Confirm by hand the requirements the tests do not cover:

- [ ] Inspector "Run summary task"; the redirect to `/inspector` shows `summaryFetchedAt` stable on that render.
- [ ] Refresh `/inspector` again; `summaryFetchedAt` advances and the new totals are visible.
- [ ] The invalidation log tail shows the summary tag sourced as `job`.
- [ ] The "Force `updateTag` from a Route Handler" island shows a thrown framework error with a clear message.

With both invalidation paths wired, the four-call decision tree is now real end-to-end: `updateTag` from actions for read-your-writes, `revalidateTag` from the job for eventual, and the inspector reads every cache-state change off the `fetchedAt` strip.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
