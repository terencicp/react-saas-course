# Chapter 067 — Project: Durable CSV export with Trigger.dev

## Chapter framing

Chapter 067 takes the Trigger.dev primitives lessons lesson 3 of chapter 066–lesson 6 of chapter 066 installed (schemaTask, code-defined queues, `wait.for`, run-level retries, idempotency keys, lifecycle hooks) and lands them as one runnable durable job: a paginated CSV export of an org's invoices that survives a worker kill, serializes per-org via a `concurrencyKey` lane on one predeclared queue, and ends in an `ExportReadyEmail` send through the Unit 7 Resend adapter.
The student writes the three task files and the `startExport` action, not the surrounding infrastructure — the cloud-linked project, the local-dev CLI, the inspector page that triggers and polls runs, and the React Email template are all provided.

Threads that run through every lesson: every Server Action call site triggers a task and returns immediately — the user never waits on the export; the task receives `organizationId` in its payload because it has no request context, and re-derives tenancy via `tenantDb(organizationId)` inside the body; `schemaTask` validates the payload at the trigger boundary, never inside the body, and payload ids are `z.string().min(1)` (the seed and Better Auth assign base62 text ids like `org_acme`, which `z.uuid()` would reject); the queue is predeclared in code at module scope, never named or limited at trigger time (the v3-to-v4 break from lesson 4 of chapter 066); per-org serialization uses one predeclared queue at `concurrencyLimit: 1` plus `concurrencyKey: organizationId` at trigger time, not a dynamically-named queue; durability lives at step boundaries — every page is its own `triggerAndWait` child run with a `scope: 'run'` idempotency key from `idempotencyKeys.create([organizationId, 'page', String(page)])`, so a retried parent re-issues the same keys and the runtime returns prior results instead of re-running; the email send is its own `triggerAndWait` child with `idempotencyKeys.create([organizationId, 'export-email'])`, guarding the Resend call against a parent-level retry; `metadata` (the module-level `@trigger.dev/sdk` import, not a field on the run's second arg) carries live progress (`{ pagesDone, pagesTotal, downloadUrl }`) for the inspector's poller; the inspector reads run state via the Trigger.dev REST API by `run.id`, never by scanning logs; the local CLI (`npx trigger.dev@latest dev`) is the only worker that can be killed mid-run, so the durability proof requires it specifically.

### Project goals

The finished project is one runnable durable job that the student can defend primitive by primitive. It is done when:

- Firing the inspector "Export invoices" button kicks off a run that drives the progress bar through the count→loop machinery to `N/N` and the Trigger.dev dashboard shows one `paginate-page` child run per page. (The shipped seed gives each invoice org 200–240 rows at `PAGE_SIZE` 500, so an export is a single page — the count/loop/metadata machinery still runs end to end; the multi-page narrative is the reasoned walk-through of what a larger org would do.)
- The per-page `triggerAndWait` checkpoint and run-scoped idempotency key make the parent resumable: on a parent retry each completed page returns cached on the re-issued key rather than re-running, and the run reaches `completed` with the same `runId`. The kill-the-local-worker-mid-run drill is the durability story the lesson walks through; with the single-page seed the reproducible proof is the cached-on-retry behaviour, not a mid-page kill.
- Firing the same export twice for the same org serializes the second behind the first (the per-org `concurrencyKey` lane runs at concurrency 1).
- Firing exports across different orgs runs them in parallel (one `concurrencyKey` lane per org on the shared queue).
- A duplicate same-day trigger short-circuits on the business idempotency key — the second call returns the first run's `runId`, no second `exports` row, no second audit entry.
- The `ExportReadyEmail` lands in the student's inbox with the right `rowCount` and a working download URL, exactly once even across a parent retry.
- The task validates its payload structurally before any work — a malformed payload fails immediately at the `schemaTask` boundary with no body execution.
- Exporting the empty seeded org (`org_empty`) aborts immediately via `AbortTaskRunError` with no retries and no `paginate-page` children — the reproducible permanent-failure proof.

Scope cuts the project notes explicitly: no R2 upload yet — the email's `downloadUrl` is a placeholder `https://example.com/exports/{runId}.csv` and chapter 069 wires the real upload; no streaming generation — the CSV is materialized in memory across pages because the rows-per-org cap keeps this safe, with the streaming alternative referenced; no schedule — exports fire from the inspector, the scheduled-export pattern is a forward note to Chapter 14; no per-user rate limit on `startExport` — Unit 15b lands that; no failure-email path — a permanently-failed export logs but does not email a failure notification (Unit 13's dispatcher will).

This is the canonical Trigger.dev shape every later durable job (Stripe reconciliation in Unit 11 forward note, notification dispatcher in chapter 071) will copy — `schemaTask` at the boundary, a predeclared queue with `concurrencyKey` per tenant for back-pressure, `triggerAndWait` per step for durability, `idempotencyKeys.create` keys guarding side effects across retries, `run.metadata` for live progress to the watching client.

### Dependency carry-in

- **From lesson 4 of chapter 066 (Trigger.dev v4 primitives):** the root-level `trigger/` folder convention (registered via `dirs: ['./trigger']`), queues declared in code at module scope via `queue({ name, concurrencyLimit })` (not in `trigger.config.ts`), `schemaTask` with Zod payloads, `tasks.trigger` (fire-and-forget) vs `tasks.triggerAndWait` (in-task, returns the child's result), `ctx.run.id` / `ctx.attempt.number` / `ctx.run.metadata`, per-tenant concurrency via one predeclared `queue({ name, concurrencyLimit: 1 })` at module scope plus `concurrencyKey: organizationId` passed at trigger time (the v3 dynamically-named-queue shape is rejected by v4).
- **From lesson 5 of chapter 066 (durable execution):** checkpoints at every `wait.*` and `triggerAndWait`, run-level retries with exponential backoff and jitter (declared in `retry: {...}`), `AbortTaskRunError` for permanent failures, `idempotencyKey` + `idempotencyKeyTTL` on `tasks.trigger` / `triggerAndWait` / `wait.for`, `idempotencyKeys.create([...parts], { scope })` with `scope: 'run'` (cross-step keys, namespaced to the parent run id) vs `scope: 'global'` (business keys from the app).
- **From lesson 7 of chapter 066 (workload picking):** the three Trigger.dev-bound jobs named (CSV export is the one this chapter builds; Stripe reconciliation and notification dispatcher are forward references), the `TRIGGER_SECRET_KEY` + `TRIGGER_PROJECT_REF` env surface, the deploy-Trigger-first-then-app order.
- **From chapter 050 (Resend):** `sendEmail({ to, subject, react, idempotencyKey })` lives in `src/lib/email.ts`; the React Email runtime is installed; the verified domain is configured in `.env`; the suppression read is wired (skipped sends return an `err('forbidden', ...)` Result, i.e. `{ ok: false, error: { code: 'forbidden', ... } }`).
- **From chapter 059 (tenancy):** the Better Auth `organization` and `member` tables (in `src/db/schema/auth.ts`), `tenantDb(orgId)` (in `src/db/tenant.ts`) returning a Drizzle handle scoped to the org plus a `transaction()` helper over `withTenant`, `auditLogs` (in `src/db/audit.ts`, RLS-guarded) and `logAudit(tx, event)` (in `src/db/audit-log.ts`) — the latter takes an explicit-context shape `{ ...event, organizationId, actorUserId }` for session-less task code, written with `actorUserId: null` (system actor).
- **From chapter 062 (list queries):** the invoices schema with cursor-paginatable reads; the `paginate-page` child reads CSV rows directly through `listInvoices({ orgId, view: 'active', cursor, pageSize })` from `src/db/queries/invoices.ts` (createdAt-desc cursor), and the parent computes `pagesTotal` from `countInvoices({ orgId })`.
- **From chapter 043 (Server Actions + Result):** the canonical `{ ok: true, data } | { ok: false, error: { code, userMessage } }` shape (codes `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`) returned by the `startExport` action; `authedAction('member', schema, fn)` (in `src/lib/auth/authed-action.ts`) wraps the trigger call and hands the body an `AuthedCtx` (`user`, `orgId`, `role`, `db: tenantDb(orgId)`, `ip`, `userAgent`).
- **From chapter 041 (schema) and chapter 062 (concurrency):** no schema changes in this chapter beyond the `exports` table the starter ships (id, organizationId, requestedBy, status `queued|running|completed|failed`, runId, rowCount, idempotencyKey, dayBucket, pagesDone, pagesTotal, downloadUrl, requestedAt, completedAt; unique index on `(organizationId, requestedBy, dayBucket)`).
- **From chapter 009 (Error classes):** `ExportError` subclass (in `src/lib/exports/errors.ts`) with codes `EMPTY_RESULTSET | UNKNOWN_PLAN` (the latter forward-referenced, named here so the union is open). The empty-resultset abort throws `new AbortTaskRunError(new ExportError('EMPTY_RESULTSET', ...).message)` — the class's message, not the instance.

### Starter file tree (stubs marked with TODO)

The start and solution share an identical file tree — no files are added or removed; the four student files below ship as stubs.

```
docker-compose.yml              # provided: postgres:18 (volume mounts /var/lib/postgresql)
drizzle.config.ts               # provided
trigger.config.ts               # provided: project, dirs: ['./trigger'], runtime, maxDuration: 300,
                                #           retries.default — no queues field (queues are declared
                                #           at module scope in the task file)
.env.example                    # provided: copy to .env. DATABASE_URL(+_UNPOOLED), BETTER_AUTH_*,
                                #           RESEND_API_KEY, EMAIL_FROM/REPLY_TO, INVITATION_SIGNING_SECRET,
                                #           TRIGGER_SECRET_KEY (tr_…), TRIGGER_PROJECT_REF (proj_…), APP_URL
package.json                    # provided: db:migrate, db:seed, trigger:dev, trigger:deploy, dev,
                                #           test:lesson (name: chapter-067-durable-csv-export)
trigger/                        # root-level, registered via dirs: ['./trigger'] in trigger.config.ts
  export-invoices.ts            # TODO student: module-scope queue() + the schemaTask body
  paginate-page.ts              # TODO student: child task — read one page, return CSV fragment
  send-export-email.ts          # TODO student: child task — lookup recipient, render template + sendEmail
scripts/
  seed.ts                       # provided: 4 orgs (3 with 200–240 invoices, org_empty with none),
                                #           6 users, fixed base62 ids; runSeed() reused by resetExports
src/
  env.ts                        # provided: T3 env boundary validating all server + client vars
  db/
    index.ts                    # provided: db + dbUnpooled + Transaction type
    schema.ts                   # provided: invoices, exports, emailSuppressions tables + types
    schema/auth.ts              # provided: Better Auth generated schema (user, organization, member, …)
    audit.ts                    # provided: auditLogs table + RLS policies + AuditEvent type
    audit-log.ts                # provided: logAudit() (session + explicit-context overloads)
    tenant.ts                   # provided: tenantDb() facade + withTenant() tx helper
    queries/
      invoices.ts               # provided: listInvoices() (cursor) + countInvoices()
      audit.ts                  # provided: recentAuditLogs() + auditLogCount()
  lib/
    result.ts                   # provided: Result<T>, ok(), err()
    auth/authed-action.ts       # provided: authedAction() factory
    email.ts                    # provided (Unit 7): sendEmail() with suppression check
    suppressions.ts             # provided: suppression-list read
    trigger-client.ts           # provided: retrieveRun() + listRunsForOrg() over the Trigger.dev REST API
    exports/
      to-csv.ts                 # provided: pure rowsToCsv(rows): RFC-4180 string
      day-bucket.ts             # provided: dayBucket() → 'YYYY-MM-DD' (UTC)
      errors.ts                 # provided: ExportError class
      start.ts                  # TODO student: startExport authedAction → tasks.trigger
  emails/
    ExportReadyEmail.tsx        # provided: React Email template, takes { orgName, rowCount, downloadUrl }
  app/
    (protected)/inspector/
      page.tsx                  # provided: Suspense panels — export controls, recent-exports table,
                                #           run panel, audit tail
      _data.ts                  # provided: getInspectorContext(), recentExports(), latestExport()
      actions.ts                # provided: dev-only simulateRun/resetExports/switchIdentity
      _components/              # provided: run-console, run-panel (1s poller), debug-controls,
                                #           acting-user-switcher
    api/exports/[runId]/route.ts  # provided: GET reads retrieveRun, returns
                                #             { status, metadata, attemptCount, completedAt, error }
```

The three highlighted focus files — `trigger/export-invoices.ts`, `trigger/paginate-page.ts`, `trigger/send-export-email.ts` — plus the `startExport` stub in `src/lib/exports/start.ts` are the only files the student writes; the module-scope `queue()` declaration lives in `export-invoices.ts`, not in `trigger.config.ts`.
Everything else is provided and explained in the Implementation lesson that first touches it. (The starter is a full Better Auth + Drizzle app, not a minimal stub; the export work is the only incomplete slice.)

### Reference solution signatures lessons display

- **`trigger.config.ts`** — exports `defineConfig({ project: process.env.TRIGGER_PROJECT_REF ?? 'proj_placeholder', dirs: ['./trigger'], runtime: 'node', maxDuration: 300, retries: { default: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 1000, maxTimeoutInMs: 60_000, randomize: true } } })`. Queues are not a config field in v4 — the export queue is declared at module scope in `export-invoices.ts`. The SDK is imported from `@trigger.dev/sdk/v3` (the v4 package keeps the `/v3` entry path).
- **`startExport`** (`src/lib/exports/start.ts`) — `authedAction('member', z.strictObject({}), async (_input, ctx): Promise<Result<{ runId: string }>> => ...)`, exposed as `(prev, formData) => Promise<Result<{ runId: string }>>`. Inserts an `exports` row via `ctx.db` with `status: 'queued'` and `dayBucket`, calls `tasks.trigger<typeof exportInvoices>('export-invoices', { organizationId: ctx.orgId, requestedBy: ctx.user.id }, { concurrencyKey: ctx.orgId, idempotencyKey: await idempotencyKeys.create([ctx.orgId, ctx.user.id, dayBucket()], { scope: 'global' }), idempotencyKeyTTL: '24h', tags: [\`org:${ctx.orgId}\`] })`, updates the `exports` row with the returned `handle.id`, calls `revalidatePath('/inspector')`, returns `ok({ runId: handle.id })`.
- **`exportInvoices`** (`trigger/export-invoices.ts`) — a module-scope `export const exportQueue = queue({ name: 'export', concurrencyLimit: 1 })`, then `schemaTask({ id: 'export-invoices', schema: z.strictObject({ organizationId: z.string().min(1), requestedBy: z.string().min(1) }), queue: exportQueue, retry: { maxAttempts: 3 }, run: async ({ organizationId, requestedBy }, { ctx }) => ... })`. `metadata` is the module-level `@trigger.dev/sdk` import, not destructured off the run's second arg (which exposes `ctx`/`init`/`signal` only). The per-org lane comes from `concurrencyKey: organizationId` passed at the trigger call, not from the queue declaration. Body: `countInvoices` → `AbortTaskRunError` on `total === 0`, `pagesTotal = Math.ceil(total / PAGE_SIZE)` with `PAGE_SIZE = 500`, `metadata.set('pagesTotal', pagesTotal)`, sequential page loop calling `paginatePage.triggerAndWait(...).unwrap()` with a per-page `idempotencyKeys.create([organizationId, 'page', String(page)])` key, accumulate CSV strings and advance the cursor, `metadata.set('pagesDone', page + 1)`, set a placeholder `downloadUrl` on metadata, then `sendExportEmail.triggerAndWait(...).unwrap()`, then one `tenantDb(organizationId).transaction` updating the row and writing the audit entry; returns `{ ok: true, runId: ctx.run.id, rowCount: total }`.
- **`paginatePage`** (`trigger/paginate-page.ts`) — `schemaTask({ id: 'paginate-page', schema: z.strictObject({ organizationId: z.string().min(1), page: z.int().nonnegative(), cursor: z.string().nullable() }), run: async ({ organizationId, cursor }) => { const { rows, nextCursor } = await listInvoices({ orgId: organizationId, view: 'active', cursor, pageSize: 500 }); return { csv: rowsToCsv(rows), nextCursor, rowCount: rows.length }; } })`.
- **`sendExportEmail`** (`trigger/send-export-email.ts`) — `schemaTask({ id: 'send-export-email', schema: z.strictObject({ organizationId: z.string().min(1), recipientUserId: z.string().min(1), rowCount: z.int(), downloadUrl: z.string() }), run: async ({ organizationId, recipientUserId, rowCount, downloadUrl }): Promise<Result<{ id: string }>> => { /* tenant-scoped member→user join for the recipient email, global organization read for the name, render ExportReadyEmail, sendEmail(...) returning ok or the suppressed err Result */ } })`.
- **Per-page idempotency key** — `await idempotencyKeys.create([organizationId, 'page', String(page)])` (`scope: 'run'` default, namespaced to the parent run id — the v4 shape that replaces the manual `${ctx.run.id}:page:N` prefix; the parts array is `string[]`, so the numeric page is stringified; lesson 5 of chapter 066).
- **Per-email idempotency key** — `await idempotencyKeys.create([organizationId, 'export-email'])`.
- **Env entries** (`.env.example`, copied to `.env`):
  - `TRIGGER_SECRET_KEY=tr_dev_...` (validated `startsWith 'tr_'`, per environment)
  - `TRIGGER_PROJECT_REF=proj_...` (validated `startsWith 'proj_'`)
  - `APP_URL=http://localhost:3000`
  - existing `DATABASE_URL`(+`_UNPOOLED`), `RESEND_API_KEY`, `EMAIL_FROM`/`EMAIL_REPLY_TO`, `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `INVITATION_SIGNING_SECRET`, `NEXT_PUBLIC_APP_NAME`/`NEXT_PUBLIC_APP_URL`

### Inspector page spec

A Server Component at `(protected)/inspector/page.tsx` provided in full, behind the app's auth guard; the active org and acting user come from the session (`getInspectorContext`). The student writes only the task code and `startExport` action it exercises.

- **Header (`RunConsole`):** an **Export invoices** button plus two debug buttons — **Trigger 2 (same org)** and **Trigger 3 (cross org)** — that all fire the same `startExport` Server Action via `useActionState`; on `{ ok: true }` the run panel switches to the returned `runId` and starts polling `/api/exports/[runId]` every 1s. (Because all three submit the one daily-keyed action, the same-org/cross-org serialization story is the lesson's by-hand checklist rather than an automatic effect of distinct keys.) In dev the header also renders the `ActingUserSwitcher` island.
- **Run panel (`RunPanel`):** shows `runId`, `status`, `attempt` (from `attemptCount`), a progress bar driven by the poller's `metadata.pagesDone / metadata.pagesTotal`, and (on completion) the `downloadUrl` from metadata plus a deep-link to `https://cloud.trigger.dev/runs/${runId}`. With no live `runId` it falls back to the most-recent `exports` row (`SeededRunState`) — so the seed and the dev-only simulate path render a panel without a live worker.
- **Recent-exports table (`ExportsTable`):** the active org's recent `exports` rows (runId/id, status, rowCount).
- **Audit tail (`AuditTail`):** last 20 `auditLogs` rows for the active org via `recentAuditLogs`; every completed export writes one (`export.invoices.completed`, `actorUserId: null`) and every fired-but-deduped action writes none (the idempotency-key short-circuit returns the prior run handle, no second audit row).
- **Debug card (dev-only `DebugControls`):** simulate buttons (`simulateRun` writes an `exports` row directly to `queued`/`running (3/7)`/`completed` — no Trigger.dev call — so the panel figures are reproducible without a worker) and a **Reset exports** button (`resetExports` clears + re-seeds). These are figure drivers, not export primitives.
- **No log scraping** — the panel reads run state structurally via the Trigger.dev REST API (`retrieveRun` in `src/lib/trigger-client.ts`, surfaced by `GET /api/exports/[runId]`), so each lesson's Moment of truth can assert against state, not log strings.

### Concepts demonstrated → owning lesson

- Inline `await` vs. `after()` vs. Vercel Cron vs. Trigger.dev as the four-tier ladder, with the five trigger conditions — lesson 3 of chapter 066.
- `schemaTask` for Zod-validated payloads at the trigger boundary — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- `tasks.trigger` (fire-and-forget from Server Actions) vs `tasks.triggerAndWait` (in-task child runs) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067 and lesson 3 of chapter 067.
- Queues declared in code (the v3-to-v4 break) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- Per-tenant concurrency via a predeclared queue plus `concurrencyKey: organizationId` at trigger time (the SaaS pattern; the v3 dynamically-named queue is rejected by v4) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- `ctx.run.id`, `ctx.attempt.number`, `ctx.run.metadata` — lesson 4 of chapter 066 / lesson 5 of chapter 066; applied across lesson 2 of chapter 067–lesson 4 of chapter 067.
- Durable checkpoints at every `triggerAndWait` boundary — lesson 5 of chapter 066; applied in lesson 3 of chapter 067.
- Run-level retries with exponential backoff and jitter (declared in `retry`) — lesson 5 of chapter 066; applied in lesson 2 of chapter 067.
- `idempotencyKey` on `tasks.trigger` (business-key at the action, `idempotencyKeys.create([...], { scope: 'global' })`) — lesson 5 of chapter 066; applied in lesson 2 of chapter 067. Cross-step `idempotencyKeys.create([organizationId, 'page', String(page)])` (`scope: 'run'`) keys — applied in lesson 3 of chapter 067.
- `idempotencyKeyTTL` to scope the dedup window — lesson 5 of chapter 066; applied in lesson 2 of chapter 067.
- `AbortTaskRunError` for permanent failures (the empty-resultset case) — lesson 5 of chapter 066; applied in lesson 3 of chapter 067.
- Mutable `run.metadata` as the live-progress channel for an inspecting client — lesson 6 of chapter 066; applied in lesson 3 of chapter 067.
- Task body has no request context — payload carries `organizationId`, `tenantDb(orgId)` re-derives tenancy inside the body — lesson 3 of chapter 066 / lesson 7 of chapter 066; applied in lesson 2 of chapter 067.
- `authedAction(role, schema, fn)` wrapping the trigger call from app code — chapter 057; applied in lesson 2 of chapter 067.
- `tenantDb(orgId)` for org-scoped reads inside the task — chapter 056; applied in lesson 3 of chapter 067 and lesson 4 of chapter 067.
- Canonical Server Action Result shape returned by `startExport` — chapter 043; applied in lesson 2 of chapter 067.
- `auditLogs` append-only on every completed run, written from the task body (explicit-context `logAudit` with `actorUserId: null`, the system actor) inside the same `tenantDb` transaction as the `exports` row update — chapter 059; applied in lesson 4 of chapter 067.
- Resend send through `src/lib/email.ts` from inside a task (no request context) — chapter 050; applied in lesson 4 of chapter 067.
- React Email template render passed as `react:` to `sendEmail` — chapter 050; applied in lesson 4 of chapter 067.

### Forward references the chapter project hands off

- **Unit 13b (R2 upload, chapter 069):** the parent body's `console.log`-shaped `downloadUrl` becomes a real R2 presigned PUT; the `paginate-page` child task pipes its CSV directly to R2 via the presigned URL; the email's `downloadUrl` is the matching presigned GET. The `metadata.downloadUrl` channel stays unchanged.
- **Unit 13 (notifications):** the `export.invoices.completed` audit log fires the notification dispatcher (one event, the dispatcher fans out to email-or-inbox-or-both per user preferences). The current direct `sendExportEmail` child task becomes redundant; the dispatcher owns the channel choice.
- **Unit 15a (cache):** the inspector's `exports` list reads (`use cache` + `cacheTag('exports', orgId)`) get `updateTag('exports', orgId)` from the parent task after every completion; the user's next visit shows fresh state without a hand-rolled refresh.
- **Unit 15b (rate limit):** `startExport` gets wrapped in an Upstash limiter (`5 per user per hour`) so a misbehaving client cannot fill the export queue with synthetic-key debug runs.
- **Stripe reconciliation (Unit 11 forward note):** the predeclared-queue-plus-`concurrencyKey` shape lifts directly — one `reconcile` queue at `concurrencyLimit: 1` with `concurrencyKey: organizationId`, a nightly `schedules.task` cron triggers one run per org, the body reads `subscriptions.list` and reconciles drift against `plan_entitlements`.

---

## Lesson 1 — Project Overview

A durable, paginated CSV export of an org's invoices, fired from a Server Action and built on Trigger.dev v4.
The finished project: clicking "Export invoices" in the inspector kicks off a run that drives the count→loop→email machinery to completion, is resumable across a parent retry, serializes per org while parallelizing across orgs, and ends with an `ExportReadyEmail` in the student's inbox — all visible in the inspector's run panel and the Trigger.dev dashboard.

Figure: the inspector showing a completed run — the progress bar full, the `export.invoices.completed` audit-log row, the rendered `downloadUrl`, and the email arrived in the student's inbox. A short animated capture pairs with it: clicking Export → the progress bar advancing → the run completing → the email arriving.

### What we'll practice

- Modeling a long-running job as a Trigger.dev `schemaTask` fired fire-and-forget from a Server Action that returns immediately.
- Designing for durability — placing checkpoints at step boundaries so a killed worker resumes instead of restarting.
- Reasoning about multi-tenant back-pressure with a predeclared queue and per-tenant `concurrencyKey` lanes.
- Guarding side effects (a duplicate trigger, a re-sent email) with idempotency keys at two different scopes.
- Streaming live progress from a worker to a watching client through `run.metadata`.

### Architecture

The shape, end to end:

- The inspector (a Server Component) calls the **`startExport`** Server Action.
- `startExport` fires **`exportInvoices`** fire-and-forget via `tasks.trigger`, records an `exports` row, and returns the `runId` immediately.
- **`exportInvoices`** (the parent task) runs on the predeclared `export` queue, in this org's `concurrencyKey` lane at concurrency 1. It counts pages, then loops, awaiting one **`paginatePage`** child run per page through `triggerAndWait`, accumulating CSV.
- When the loop finishes it awaits the **`sendExportEmail`** child, then updates the `exports` row and writes the audit log in one tenant transaction.
- The inspector polls `/api/exports/[runId]`, which reads run state structurally from the Trigger.dev REST API (`retrieveRun`) — `status`, `attemptCount`, and the `pagesDone / pagesTotal` progress carried on `metadata`.

### Starting file tree

See the annotated tree in the Chapter framing. The three task files under the root-level `trigger/` folder are the highlighted focus, alongside the `startExport` stub in `src/lib/exports/start.ts`; every other file is provided.
The pieces the student leans on most — `src/lib/email.ts`, `src/db/queries/invoices.ts` (`listInvoices`/`countInvoices`), `src/lib/exports/to-csv.ts`, `src/emails/ExportReadyEmail.tsx`, `src/lib/trigger-client.ts`, the inspector page, and the `exports` table in `src/db/schema.ts` — are each explained in the Implementation lesson that first touches them.

The `exports` table carries `id`, `organizationId`, `requestedBy`, `status` (`queued | running | completed | failed`), `runId`, `rowCount`, `idempotencyKey`, `dayBucket` (the unique index is on `(organizationId, requestedBy, dayBucket)`), `pagesDone`, `pagesTotal`, `downloadUrl`, `requestedAt`, `completedAt`. The row exists for app-side audit and dedup; Trigger.dev's run record is the operational truth and the `exports` row is the app's reference.

### Roadmap

<CardGrid>
  <Card title="Lesson 2 — The task boundary">
    Confirm the `exportInvoices` schemaTask boundary (the shipped Zod payload + predeclared queue), then write the `startExport` action that fires it with `concurrencyKey: orgId` and a daily idempotency key.
  </Card>
  <Card title="Lesson 3 — One checkpoint per page">
    Spawn each page as a durable `paginatePage` child run, drive the progress bar through `metadata`, and abort permanently on an empty resultset.
  </Card>
  <Card title="Lesson 4 — Send the email, write the audit log">
    Add the `sendExportEmail` child guarded by a per-run key, then close the run by updating the `exports` row and writing the audit log in one transaction.
  </Card>
</CardGrid>

### Setup

The Trigger.dev cloud project must be created first: the student's account creates the project ref, and `npx trigger.dev@latest init` links the project folder to it.
Local dev needs two terminals — the trigger CLI worker alongside the Next.js dev server — and without the worker, tasks queue forever.

Steps:

1. Open the `projects/Chapter 067/start` folder. Expected: the file tree above (the four student files ship as stubs; everything else is complete).
2. `pnpm install` — install dependencies. Expected: a clean install (the repo enforces pnpm via `only-allow`).
3. `cp .env.example .env`, then fill the secrets. `docker compose up -d` — start Postgres 18 (`docker-compose.yml` ships `postgres:18`). Expected: the container reports healthy.
4. `pnpm db:migrate && pnpm db:seed` — apply the schema and seed four orgs (three with 200–240 invoices each, plus the empty `org_empty`) and six users with fixed base62 ids. Expected: the seed completes. It truncates and re-inserts deterministically (via `runSeed`), so re-running is safe; Trigger.dev's run history is separate and the seed does not reset it.
5. Create a Trigger.dev account, then `npx trigger.dev@latest init` in the project folder — runs the interactive flow that writes the `trigger.config.ts` defaults, registers the root-level `trigger/` folder as the task folder via `dirs: ['./trigger']`, and prints the project ref. The starter already ships a `trigger.config.ts` matching what init produces.
6. Paste `TRIGGER_SECRET_KEY` (validated `startsWith 'tr_'`) and `TRIGGER_PROJECT_REF` (validated `startsWith 'proj_'`) into `.env`. The secret key is per-environment (dev / staging / production); the starter uses the dev key only. Obtain both from the Trigger.dev dashboard for the project just created.
7. `pnpm trigger:dev` in one terminal — the local worker. Expected: it prints the dashboard URL and shows "Waiting for tasks". Open the dashboard once to confirm the project is linked and shows zero runs.
8. `pnpm dev` in a second terminal — the app. Expected: `/inspector` renders (behind the auth guard) with the Export buttons. (The `env.ts` validation also lets `next build` pass against the dummy `.env` values without ever reaching the cloud.)

Env vars: `TRIGGER_SECRET_KEY` (authenticates the worker and the REST reads; from the dashboard, per environment), `TRIGGER_PROJECT_REF` (identifies the linked project; from the dashboard), `APP_URL` (the app's base URL, `http://localhost:3000` locally), plus the carried-over `DATABASE_URL`(+`_UNPOOLED`), `RESEND_API_KEY`, `EMAIL_FROM`/`EMAIL_REPLY_TO`, `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `INVITATION_SIGNING_SECRET`, and the public app vars.

The free tier covers everything this chapter runs, so the kill/retry drills will not hit a cap.

On success the starter runs locally: the inspector shows the Export buttons and the worker shows "Waiting for tasks". Clicking Export returns an error because `startExport` still returns `err('internal', 'Not implemented')` — that is the next lesson.

---

## Lesson 2 — The task boundary: schemaTask and the per-org queue

Confirm the `exportInvoices` boundary and write the `startExport` action so clicking Export fires a real, validated, per-org-serialized run.
Finished result: clicking "Export invoices" in the inspector produces a run that appears in the dashboard with a validated payload and completes; a duplicate same-day click returns the same run (the daily key dedups); exports across different orgs run in parallel in their own `concurrencyKey` lanes — all before the body does any real export work.

### Your mission

This first build stands up the boundary between the app and the durable job: a Server Action that fires the task and returns immediately, and a task that validates its payload and lands on the right queue.
The `exportInvoices` boundary — the module-scope `queue()`, the `schemaTask` shell with the strict payload, `queue: exportQueue`, `retry: { maxAttempts: 3 }`, and a placeholder body (`metadata.set('pagesDone', 0); return { ok: true }`) — already ships in the starter; this lesson is about understanding and confirming it, then writing the `startExport` action that fires it. The real work in the body lands in the next two lessons.
The task has no request context, so `organizationId` and `requestedBy` travel in the payload, and `schemaTask` validates that payload with `z.strictObject` at the trigger boundary — before any retries are spent — never inside the body. The payload ids are `z.string().min(1)`, not `z.uuid()`, because the seed assigns base62 text ids like `org_acme` that `z.uuid()` would reject.
The queue is one predeclared `queue({ name: 'export', concurrencyLimit: 1 })` at module scope, attached to the task via `queue: exportQueue`; per-tenant isolation comes from passing `concurrencyKey: organizationId` at the trigger call, which splits that one queue's limit into an independent lane per org — sequential within an org, parallel across orgs. This is the v4-native shape — naming a brand-new queue or setting a `concurrencyLimit` at trigger time (the v3 dynamically-named-queue pattern) is rejected by v4.
`concurrencyLimit: 1` is the back-pressure choice for a read-heavy export; staying at 1 keeps the DB pool friendly, and you would only raise it if a specific tenant repeatedly stacks up.
The action fires with `tasks.trigger` (fire-and-forget) — calling `tasks.triggerAndWait` from a Server Action would block the request until the run finished and time out — and carries a business idempotency key built from `(orgId, userId, dayBucket())` with a 24h TTL, so a second click on the same calendar day returns the first run instead of starting a new one.
The action is pinned to the `member` role via `authedAction('member', ...)`, because exports are a member-level capability, and the role is the structural boundary that decides who may trigger; `authedAction` hands the body an `AuthedCtx` carrying `user`, `orgId`, and a pre-scoped `db: tenantDb(orgId)`.
Out of scope here: the body does no pagination, no email, and no audit write yet — the shipped placeholder sets `pagesDone: 0` so the progress bar has something to read and returns `{ ok: true }`; the cross-step idempotency keys and the real work land in the next two lessons.
One trap to avoid: the `exports` row is inserted before the trigger (so it exists for dedup) but the `runId` is only known after the trigger returns, so the row is written with a null `runId` and updated immediately after — production hardening would wrap both in a transaction and accept the rare orphan row on trigger failure, named but not built. The action ends with `revalidatePath('/inspector')`.

Requirements — by the end the student can confirm:

- [ ] Clicking "Export invoices" for an org starts a run that appears in the Trigger.dev dashboard with payload `{ organizationId, requestedBy }` and reaches `status: completed`.
- [ ] The inspector run panel switches to the new `runId` after the click and reflects the run's status.
- [ ] Firing `export-invoices` with a malformed payload (e.g. `{ organizationId: '' }`, which fails `.min(1)`, or an extra key, which `z.strictObject` rejects) from the dashboard's "Run task" tool fails immediately at the schema boundary, with the body never executing.
- [ ] Clicking Export twice in quick succession returns the same `runId` both times, leaves a single `exports` row, and shows one run in the dashboard.
- [ ] Firing exports across different orgs (the cross-org debug button, after switching the acting org) runs them in parallel, each in its own `concurrencyKey` lane on the shared `export` queue.
- [ ] The student can explain how the per-org `concurrencyKey` lane at `concurrencyLimit: 1` serializes two concurrent runs in one org — the queue mechanism — even though the shipped daily key dedups two same-org clicks to one run rather than queueing the second.

### Coding time

Confirm the boundary in `trigger/export-invoices.ts` (already shipped) and implement `src/lib/exports/start.ts` against the brief, the reference signatures in the framing, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `exportInvoices` boundary as shipped (id `export-invoices`, the module-scope `export const exportQueue = queue({ name: 'export', concurrencyLimit: 1 })`, the strict-object `z.string().min(1)` payload schema, `queue: exportQueue`, `retry: { maxAttempts: 3 }`, and the placeholder body that sets `metadata.set('pagesDone', 0)` and returns `{ ok: true }`) and for `startExport` (the `authedAction('member', z.strictObject({}), ...)` wrapper, the pre-trigger `ctx.db.insert(exports)` with `status: 'queued'` and `dayBucket`, the `tasks.trigger<typeof exportInvoices>` call with `concurrencyKey: ctx.orgId`, the `idempotencyKeys.create([ctx.orgId, ctx.user.id, dayBucket()], { scope: 'global' })` key, `idempotencyKeyTTL: '24h'`, and `tags`, the post-trigger `runId` update, `revalidatePath('/inspector')`, and the `ok({ runId: handle.id })` return).

Rationale to cover:
- `id: 'export-invoices'` is the durable API — the string identity, not the symbol, is what Trigger.dev keys on across deploys (lesson 4 of chapter 066).
- The predeclared `queue({ name, concurrencyLimit })` at module scope, referenced via `queue: exportQueue`; `concurrencyKey: organizationId` at the trigger call is the per-tenant knob, and the v3 dynamically-named / trigger-time-limit queue shape is shown as the break that no longer works.
- `tasks.trigger` from the action vs the `triggerAndWait`-from-an-action timeout failure mode (lesson 4 of chapter 066).
- The business-key idempotency shape `idempotencyKeys.create([orgId, userId, day], { scope: 'global' })` and why the same daily key dedups two same-org clicks to one run (so the inspector's "2 same-org" button returns the existing run rather than queueing a second).
- The two-step `exports` write (insert with null `runId`, update after trigger) and the named production hardening.
- Why payload ids are `z.string().min(1)` not `z.uuid()` (base62 seed ids).
- The `member` role pin as the structural enforcement of who may export (chapter 057).

</details>

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 2`); expect all tests to pass, reporting the action fires the task with a validated payload, writes the `exports` row, and the business idempotency key short-circuits a duplicate.

Confirm by hand the outcomes the tests can't reach:

- [ ] Click "Export invoices" for the active org. The inspector switches to the new `runId`; the dashboard shows one run, `status: completed`, payload `{ organizationId, requestedBy }`, and the structured log line. The progress bar reads `0/0` — `pagesTotal` lands in the next lesson.
- [ ] Click Export twice in quick succession. The second click returns the same `runId` (the daily key dedups); the `exports` table shows one row; the dashboard shows one run.
- [ ] From the dashboard's "Run task" tool, fire `export-invoices` with `{ organizationId: '' }` (or an extra key). The run fails immediately at the schema-parse boundary with a Zod error; the body never executes.
- [ ] Click "Trigger 2 (same org)" (debug). Both submits share the daily key, so they collapse to the one run — observe the dedup, and reason about how the `concurrencyKey` lane at limit 1 *would* serialize two genuinely-distinct runs.
- [ ] Switch the acting org (dev switcher) and click "Trigger 3 (cross org)" across different orgs. Each org's run reaches `executing` in its own `concurrencyKey` lane on the shared `export` queue, in parallel.

---

## Lesson 3 — One checkpoint per page

Turn the placeholder body into a real paginated export where every page is its own durable child run.
Finished result: clicking Export against a seeded org drives the progress bar to full while the dashboard shows one `paginate-page` child per page (one page for the seed's 200–240-row orgs at `PAGE_SIZE` 500); the empty org aborts immediately, and on a parent retry every completed page returns cached on its run-scoped key rather than re-running.

### Your mission

This is where durability becomes real: instead of one long body, each page is spawned as its own `paginatePage` child through `triggerAndWait`, and every `triggerAndWait` is a checkpoint.
A multi-page export has one checkpoint per page, so a crash between pages three and four would resume at page four — when the parent retries it re-issues the same idempotency keys and the runtime returns the prior results for completed children instead of re-running them. (With the shipped seed each org is a single page, so this multi-page narrative is the reasoned walk-through; the reproducible proof is the cached-on-retry behaviour of the one page's key.)
The cross-step key is `idempotencyKeys.create([organizationId, 'page', String(page)])` with the default `scope: 'run'`, which hashes the parts together with the parent run id so the cache is per-run — this replaces hand-splicing `${ctx.run.id}:page:${page}`. The parts array is `string[]`, so the numeric page must be stringified (passing a raw number is rejected). Dropping `scope: 'run'` for `'global'` would collide across runs and hand every export the first one's page result, while folding in `Date.now()` would break the cache on retry and re-run everything.
The page child reads through `listInvoices({ orgId, view: 'active', cursor, pageSize: 500 })` with cursor pagination (from chapter 062): the cursor is the natural restart point and stays stable across writes, so a row inserted between pages is still covered correctly.
The parent drives the progress bar by writing `metadata.set('pagesTotal', pagesTotal)` once (after a `countInvoices` read, `pagesTotal = Math.ceil(total / PAGE_SIZE)`) and `metadata.set('pagesDone', page + 1)` each iteration — from the parent, because the parent's view of progress is the user-facing one; forgetting the `pagesDone` write is the common bug where the export completes but the bar stays at zero. `metadata` is the module-level `@trigger.dev/sdk` import, not a field on the run's second arg.
An empty resultset is a permanent failure on the same inputs, so on `total === 0` the body throws `AbortTaskRunError` (wrapping `new ExportError('EMPTY_RESULTSET', ...).message`) rather than a plain `Error`: a plain throw would burn all three configured retries before failing, while `AbortTaskRunError` stops immediately — the rule is permanents abort, transients throw.
The loop is sequential (`for` + `await`) by default: parallelizing the pages with `Promise.all` would race the queue's concurrency limit and reorder rows, so sequential is the safe choice unless the rows have no order requirement.
Out of scope: the CSV is accumulated in memory across pages, which is bounded by the per-org row cap and fits in a few MB for the seed; a production org of 100k+ invoices would need a streaming write to object storage inside each child, which chapter 069 introduces. The email step is still empty; the body ends by logging the CSV size and storing a placeholder `downloadUrl` on `metadata` for the next lesson.

Requirements — by the end the student can confirm:

- [ ] Clicking Export against a seeded org drives the progress bar to full, and the dashboard shows one `paginate-page` child run per page (one for the seed's single-page orgs), each with its payload and output, parented under the export run.
- [ ] The student can defend the kill-resume story: a parent retry re-issues each page's run-scoped key, completed children return cached rather than re-running, and the run reaches `completed` with the same `runId`.
- [ ] Exporting the empty seeded org (`org_empty`) fails on the first attempt with no retries, via `AbortTaskRunError`, and spawns no `paginate-page` children.
- [ ] The progress bar reflects real per-page advancement driven by `metadata`, not a fixed or fabricated value.

### Coding time

Implement `trigger/paginate-page.ts` and grow the `exportInvoices` body against the brief, the reference signatures, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `paginatePage` schemaTask (the strict-object `{ organizationId, page, cursor }` payload — `z.string().min(1)`, `z.int().nonnegative()`, `z.string().nullable()` — the `listInvoices({ orgId, view: 'active', cursor, pageSize: 500 })` read, `rowsToCsv`, and the `{ csv, nextCursor, rowCount }` return) and for the grown parent body (the `countInvoices` read and `pagesTotal = Math.ceil(total / PAGE_SIZE)`, the `AbortTaskRunError` guard on `total === 0`, the `metadata.set('pagesTotal' / 'pagesDone')` writes, the sequential page loop calling `paginatePage.triggerAndWait(..., { idempotencyKey: await idempotencyKeys.create([organizationId, 'page', String(page)]) }).unwrap()` while accumulating CSV and advancing the cursor, and the closing `console.log` plus `metadata.set('downloadUrl', \`https://example.com/exports/${ctx.run.id}.csv\`)`).

Rationale to cover:
- Every `triggerAndWait` is a durable checkpoint; the worked example walks the resume-at-page-4 story, and shows the broken key shapes (`scope: 'global'`, folding in `Date.now()`) next to the correct `idempotencyKeys.create([organizationId, 'page', String(page)])` with `scope: 'run'` (lesson 5 of chapter 066).
- `.unwrap()` on the `triggerAndWait` result, and the `String(page)` requirement on the key parts.
- `AbortTaskRunError` vs a plain throw and the wasted-retry cost (lesson 5 of chapter 066).
- Cursor pagination's stability across writes (chapter 038 / chapter 062).
- Why `pagesDone` is set from the parent, not the child, and the zero-bar symptom of omitting it.
- The in-memory accumulation bound and the pointer to chapter 069 for the streaming write.
- The sequential-vs-parallel loop decision.

</details>

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 3`); expect all tests to pass, reporting per-page progress advances, the run-scoped key returns cached on retry without re-running, and an empty resultset aborts without retries.

Confirm by hand the outcomes the tests can't reach:

- [ ] Click Export for org A (one page at limit 500 with the seed). The progress bar advances to full; the dashboard shows the `paginate-page` child with payload + output, under the parent.
- [ ] Retry-cache drill: complete an export, then replay/retry the parent run from the dashboard. The completed page's child returns cached (not re-executed) on its run-scoped key, and the final state is `completed` with the same `runId`. (The kill-the-worker-mid-page variant needs a multi-page org, which the seed does not ship — reason it through against the single page.)
- [ ] Trigger an export against the empty seeded org (`org_empty`). The body throws `AbortTaskRunError`; the dashboard shows one attempt, no retries, no children.
- [ ] Optional senior reach: confirm one child's `idempotencyKey` comes from `idempotencyKeys.create([organizationId, 'page', 0])` (run-scoped to the parent), then force a parent retry and confirm the same key returns the cached output instead of re-executing.

---

## Lesson 4 — Send the email, write the audit log

Close the run: send the ready-email as its own guarded child, then update the `exports` row and write the audit log in one tenant transaction.
Finished result: a full export now ends with the `ExportReadyEmail` arriving in the student's inbox within ~10s, the inspector flipping to `completed` with the `downloadUrl` rendered, and one fresh `export.invoices.completed` row in the audit-log tail — and the email lands exactly once even if the parent retries.

### Your mission

This last build closes the loop with two side effects that must each happen exactly once: the email send and the audit write.
The email is its own `sendExportEmail` child task, not an inline call, for two reasons — durability (a Resend transient failure retries with backoff on the child's own policy) and idempotency (the per-step key `idempotencyKeys.create([organizationId, 'export-email'])`, run-scoped to the parent, guards against a parent retry re-issuing the send); inlining `sendEmail` in the parent body would lose both.
The child reads the recipient email through a tenant-scoped `member`→`user` join (`tenantDb(organizationId).query.member.findFirst` with `with: { user: true }` — so a non-member id can never reach a send) and the org name from the global `organization` row, renders `ExportReadyEmail`, and sends via the Unit 7 `sendEmail` adapter (passing a stable `idempotencyKey`); the `downloadUrl` it emails is the one the parent already put on `metadata`, consumed not re-derived, and it becomes a real R2 presigned link in chapter 069.
The recipient is `requestedBy` — the user who clicked Export gets the email — with an org-owner override named as a future variant, not built.
After the email returns, the parent opens one `tenantDb(organizationId).transaction` to update the `exports` row to `completed` and write the `export.invoices.completed` audit entry via `logAudit(tx, { ..., organizationId, actorUserId: null })`: the audit write comes after the email, because auditing the user-facing outcome (we sent it) beats auditing the intent (we meant to); `actorUserId: null` is the system actor — a task has no session, so null is information, not a missing value.
A Resend suppression is an expected failure, not a crash: `sendEmail` returns `err('forbidden', ...)` for a suppressed recipient, the child returns that Result rather than throwing, the parent records `emailSuppressed` in the audit payload and still treats the run as completed-but-skipped-email — throwing to surface it in the dashboard is named as the alternative.
The structured logs inside the child carry `messageId` and `disposition` only — no recipient address, no PII (the discipline from chapter 080).
Out of scope: there is still no failure-email path (a permanently-failed export logs but does not notify), and Unit 13's dispatcher will later own channel choice and make this direct child redundant.

Requirements — by the end the student can confirm:

- [ ] A full export run ends with the inspector at `status: completed`, the `downloadUrl` rendered, and one new `export.invoices.completed` row in the audit-log tail.
- [ ] The `ExportReadyEmail` arrives in the student's Resend-verified inbox with the right `orgName`, `rowCount`, and download URL, within ~10s of completion.
- [ ] Forcing a parent retry after the email step sends no second email — the child returns the cached result and does not call Resend again.
- [ ] When the recipient is on the suppression list (`emailSuppressions`), the run still completes, no email is sent, and the audit payload records `emailSuppressed: true`.

### Coding time

Implement `trigger/send-export-email.ts` and the closing steps of the `exportInvoices` body against the brief, the reference signatures, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `sendExportEmail` schemaTask (the strict-object `{ organizationId, recipientUserId, rowCount, downloadUrl }` payload with `z.string().min(1)`/`z.int()` parts and a `Promise<Result<{ id: string }>>` return, the tenant-scoped `member`→`user` lookup for the recipient email plus the global `organization` read for the name, the `ExportReadyEmail` render, and the `sendEmail({ to, subject, react, idempotencyKey })` call returning `ok({ id })` or the suppressed `err('forbidden', ...)` Result) and for the parent's closing steps (the `sendExportEmail.triggerAndWait(..., { idempotencyKey: await idempotencyKeys.create([organizationId, 'export-email']) }).unwrap()` call, then the single `tenantDb(organizationId).transaction` that updates the `exports` row to `completed` and writes the `export.invoices.completed` audit entry via `logAudit(tx, { ..., organizationId, actorUserId: null, payload: { rowCount, emailSuppressed } })`, and the `{ ok: true, runId: ctx.run.id, rowCount: total }` return).

Rationale to cover:
- Why the email is a child task (durability + per-step idempotency); the inline-shaped wrong version shown next to the child-task right version.
- Audit-after-email ("audit the outcome, not the intent") and the at-least-once semantics it buys.
- The `downloadUrl` flowing parent → child (parent owns it), forecasting the chapter 069 presigned link.
- The suppression path returning a Result rather than throwing, with the throw-to-surface alternative named.
- `recipientUserId = requestedBy` and the org-owner override variant.
- The structured-log fields and the no-PII discipline (chapter 080).

</details>

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 4`); expect all tests to pass, reporting the run completes with the audit row written, the email is guarded once across a parent retry, and a suppressed recipient completes without sending.

Confirm by hand the outcomes the tests can't reach:

- [ ] Run a full export against org A. The progress bar runs to completion; the run panel flips to `completed` with the `downloadUrl`; the audit-log tail gains one `export.invoices.completed` row; the student's inbox receives the `ExportReadyEmail` within ~10s.
- [ ] Force a parent retry (dashboard "Replay run" or a debug throw after the email returns). The email child's `[organizationId, 'export-email']` key returns the cached `{ id }`, no second email lands.
- [ ] Insert the seeded recipient's email into `emailSuppressions` and run an export. `sendEmail` returns `{ ok: false, error: { code: 'forbidden', ... } }`; the run still completes; the audit payload records `emailSuppressed: true`.

---

## Project wrap-up

With the three task files and the `startExport` action written, the student has built the canonical Trigger.dev durable-job shape and can articulate every primitive it rests on — payload validation at the boundary, one predeclared queue plus a per-tenant `concurrencyKey` lane that serializes within an org and parallelizes across orgs, `triggerAndWait` checkpoints for durability, cross-step idempotency keys that guard side effects across retries, `AbortTaskRunError` for permanents only, `metadata` as the live-progress channel, and `tasks.trigger` (fire-and-forget) for app-side calls versus `tasks.triggerAndWait` for in-task children — and which forward unit (R2 upload, notifications, cache, rate limit, Stripe reconciliation) will lean on each.
