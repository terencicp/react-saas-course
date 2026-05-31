# Chapter 067 — Project: Durable CSV export with Trigger.dev

## Chapter framing

Chapter 067 takes the Trigger.dev primitives lessons lesson 3 of chapter 066–lesson 6 of chapter 066 installed (schemaTask, code-defined queues, `wait.for`, run-level retries, idempotency keys, lifecycle hooks) and lands them as one runnable durable job: a paginated CSV export of an org's invoices that survives a worker kill, serializes per-org via a dynamic queue, and ends in a `ExportReadyEmail` send through the Unit 7 Resend adapter.
The student writes the task body, not the surrounding infrastructure — the cloud-linked project, the local-dev CLI, the inspector page that triggers and polls runs, and the React Email template are all provided.

Threads that run through every lesson: every Server Action call site triggers a task and returns immediately — the user never waits on the export; the task receives `organizationId` in its payload because it has no request context, and re-derives tenancy via `tenantDb(organizationId)` inside the body; `schemaTask` validates the payload at the trigger boundary, never inside the body; the queue is declared in code (`trigger.config.ts`), never at trigger time (the v3-to-v4 break from lesson 4 of chapter 066); per-org serialization uses dynamic queues keyed by `organizationId`, not the static queue; durability lives at step boundaries — every page is its own `triggerAndWait` child run with `idempotencyKey = ${ctx.run.id}:page:${page}`, so a retried parent re-issues the same keys and the runtime returns prior results instead of re-running; the email send is its own `triggerAndWait` child with `idempotencyKey = ${ctx.run.id}:email`, guarding the Resend call against a parent-level retry; `run.metadata` carries live progress (`{ pagesDone, pagesTotal }`) for the inspector's poller; the inspector reads run state via the Trigger.dev REST API by `run.id`, never by scanning logs; the local CLI (`npx trigger.dev@latest dev`) is the only worker that can be killed mid-run, so the durability proof requires it specifically.

### Project goals

The finished project is one runnable durable job that the student can defend primitive by primitive. It is done when:

- Firing the inspector "Export invoices" button kicks off a run that visibly progresses across pages — the progress bar advances `1/N → ... → N/N` and the Trigger.dev dashboard shows one `paginate-page` child run per page.
- Killing the local dev worker mid-run resumes cleanly after restart: the run picks up from the next uncompleted page, previously-completed pages return cached on the parent's retry-issued keys, and the final state is `completed` with the same `runId`.
- Firing the same export twice for the same org serializes the second behind the first (the per-org dynamic queue runs at concurrency 1).
- Firing exports across different orgs runs them in parallel (one dynamic queue per org).
- A duplicate same-day trigger short-circuits on the business idempotency key — the second call returns the first run's `runId`, no second `exports` row, no second audit entry.
- The `ExportReadyEmail` lands in the student's inbox with the right `rowCount` and a working download URL, exactly once even across a parent retry.
- The body validates its payload structurally before any work — a malformed payload fails immediately at the Zod boundary with no child runs spawned.

Scope cuts the project notes explicitly: no R2 upload yet — the email's `downloadUrl` is a placeholder `https://example.com/exports/{runId}.csv` and chapter 069 wires the real upload; no streaming generation — the CSV is materialized in memory across pages because the rows-per-org cap keeps this safe, with the streaming alternative referenced; no schedule — exports fire from the inspector, the scheduled-export pattern is a forward note to Chapter 14; no per-user rate limit on `startExport` — Unit 15b lands that; no failure-email path — a permanently-failed export logs but does not email a failure notification (Unit 13's dispatcher will).

This is the canonical Trigger.dev shape every later durable job (Stripe reconciliation in Unit 11 forward note, notification dispatcher in chapter 071) will copy — `schemaTask` at the boundary, dynamic per-tenant queue for back-pressure, `triggerAndWait` per step for durability, cross-step idempotency keys guarding side effects across retries, `run.metadata` for live progress to the watching client.

### Dependency carry-in

- **From lesson 4 of chapter 066 (Trigger.dev v4 primitives):** the `src/trigger/` folder convention, `trigger.config.ts` with `queues:` declared in code, `schemaTask` with Zod payloads, `tasks.trigger` (fire-and-forget) vs `tasks.triggerAndWait` (in-task, returns the child's result), `ctx.run.id` / `ctx.attempt.number` / `ctx.run.metadata`, dynamic per-tenant queues via `queue: { name: \`org-${organizationId}\`, concurrencyLimit: 1 }`.
- **From lesson 5 of chapter 066 (durable execution):** checkpoints at every `wait.*` and `triggerAndWait`, run-level retries with exponential backoff and jitter (declared in `retry: {...}`), `AbortTaskRunError` for permanent failures, `idempotencyKey` + `idempotencyKeyTTL` on `tasks.trigger` / `triggerAndWait` / `wait.for`, `idempotencyKeys.create([...keyArray])`, the `${ctx.run.id}:step:...` cross-step key shape.
- **From lesson 7 of chapter 066 (workload picking):** the three Trigger.dev-bound jobs named (CSV export is the one this chapter builds; Stripe reconciliation and notification dispatcher are forward references), the `TRIGGER_SECRET_KEY` + `TRIGGER_PROJECT_REF` env surface, the deploy-Trigger-first-then-app order.
- **From chapter 050 (Resend):** `sendEmail({ to, subject, react })` lives in `lib/email.ts`; the React Email runtime is installed; the verified domain is configured in `.env.local`; the suppression read is wired (skipped sends return an `err('suppressed', ...)` Result, i.e. `{ ok: false, error: { code: 'suppressed', ... } }`).
- **From chapter 059 (tenancy):** `organizations` and `org_members` tables, `tenantDb(orgId)` returning a Drizzle handle scoped to the org, `audit_logs` and `logAudit(tx, event)`.
- **From chapter 062 (list queries):** the invoices schema with cursor-paginatable reads; the project ships a thin starter wrapper `listInvoicesPage` over `listInvoices` from chapter 062 as the source of CSV rows.
- **From chapter 043 (Server Actions + Result):** the canonical `{ ok: true, data } | { ok: false, error: { code, userMessage } }` shape returned by the `startExport` action; `authedAction('member', schema, fn)` wraps the trigger call.
- **From chapter 041 (schema) and chapter 062 (concurrency):** no schema changes in this chapter beyond a small `exports` table the starter ships (id, organizationId, status, runId, requestedBy, requestedAt, completedAt, idempotencyKey unique on `(organizationId, requestedBy, dayBucket)`).
- **From chapter 009 (Error classes):** `ExportError` subclass with codes `EMPTY_RESULTSET | UNKNOWN_PLAN` (the latter forward-referenced, named here so the union is open).

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
trigger.config.ts               # TODO student: declare the `notifications` queue,
                                #              the project ref + runtime — most of file scaffolded
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY,
                                #           TRIGGER_SECRET_KEY, TRIGGER_PROJECT_REF, APP_URL
package.json                    # provided: db:migrate, db:seed, trigger:dev, trigger:deploy, dev
scripts/
  seed.ts                       # provided: three orgs, each with 200+ seeded invoices
src/
  db/
    schema.ts                   # provided: organizations, org_members, invoices, audit_logs,
                                #           and an `exports` table (id, orgId, status, runId,
                                #           idempotencyKey unique, requestedBy, ...)
  lib/
    tenant-db.ts                # provided
    authed-action.ts            # provided
    audit-log.ts                # provided
    email.ts                    # provided (Unit 7)
    invoices/
      list-page.ts              # provided: listInvoicesPage({ orgId, cursor, limit }) — starter-only wrapper over listInvoices from chapter 062
    exports/
      to-csv.ts                 # provided: pure rowsToCsv(rows): string
      errors.ts                 # provided: ExportError class
      start.ts                  # TODO student: startExport authedAction → tasks.trigger
    trigger-client.ts           # provided: typed runs.retrieve, runs.list-for-org helpers
  trigger/
    export-invoices.ts          # TODO student: the schemaTask — payload, queue, body
    send-export-email.ts        # TODO student: child task — render template + sendEmail
    paginate-page.ts            # TODO student: child task — read one page, accumulate CSV
  emails/
    ExportReadyEmail.tsx        # provided: React Email template, takes { orgName, rowCount, downloadUrl }
  app/
    inspector/
      page.tsx                  # provided: per-org "Export invoices" button, run-status panel
                                #           polling /api/exports/[runId] every 1s,
                                #           pagesDone/pagesTotal progress bar from run.metadata,
                                #           "Trigger 2 parallel exports" debug button
    api/
      exports/
        [runId]/route.ts        # provided: GET reads runs.retrieve, returns
                                #           { status, metadata, completedAt, error }
```

The three highlighted focus files — `trigger/export-invoices.ts`, `trigger/paginate-page.ts`, `trigger/send-export-email.ts` — plus the `startExport` stub in `lib/exports/start.ts` and the queue-declaration TODO in `trigger.config.ts` are the only files the student writes.
Everything else is provided and explained in the Implementation lesson that first touches it.

### Reference solution signatures lessons display

- **`trigger.config.ts`** — exports default config with `project: env.TRIGGER_PROJECT_REF`, `runtime: 'node'`, `queues: [{ name: 'notifications', concurrencyLimit: 5 }]` (static queue named but unused this chapter; the export queue is dynamic per-org), and `retries: { default: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 1000, maxTimeoutInMs: 60_000, randomize: true } }`.
- **`startExport`** (`lib/exports/start.ts`) — `authedAction('member', z.strictObject({}), async (_, ctx) => ...): Promise<Result<{ runId: string }>>`. Inserts an `exports` row with `status: 'queued'`, calls `tasks.trigger<typeof exportInvoices>('export-invoices', { organizationId: ctx.orgId, requestedBy: ctx.user.id }, { idempotencyKey: \`org:${ctx.orgId}:user:${ctx.user.id}:${dayBucket()}\`, idempotencyKeyTTL: '24h' })`, updates the `exports` row with the returned `runId`, returns `{ ok: true, data: { runId } }`.
- **`exportInvoices`** (`trigger/export-invoices.ts`) — `schemaTask({ id: 'export-invoices', schema: z.strictObject({ organizationId: z.uuid(), requestedBy: z.uuid() }), queue: ({ payload }) => ({ name: \`org-${payload.organizationId}\`, concurrencyLimit: 1 }), retry: { maxAttempts: 3 }, run: async ({ organizationId, requestedBy }, { ctx, metadata }) => ... })`. Body: count total pages via a `count(*)` read, set `metadata.set('pagesTotal', total)`, loop pages 0..n calling `paginatePage.triggerAndWait(...)` with per-page idempotency key, accumulate CSV strings, then `sendExportEmail.triggerAndWait(...)` with the email idempotency key.
- **`paginatePage`** (`trigger/paginate-page.ts`) — `schemaTask({ id: 'paginate-page', schema: z.strictObject({ organizationId: z.uuid(), page: z.int().nonnegative(), cursor: z.string().nullable() }), run: async ({ organizationId, page, cursor }) => { const { rows, nextCursor } = await listInvoices({ orgId: organizationId, view: 'active', cursor, pageSize: 500 }); return { csv: rowsToCsv(rows), nextCursor, rowCount: rows.length }; } })`.
- **`sendExportEmail`** (`trigger/send-export-email.ts`) — `schemaTask({ id: 'send-export-email', schema: z.strictObject({ organizationId: z.uuid(), recipientUserId: z.uuid(), rowCount: z.int(), downloadUrl: z.string() }), run: async ({ organizationId, recipientUserId, rowCount, downloadUrl }) => { /* read org, read recipient email, render template, sendEmail */ } })`.
- **Per-page idempotency key** — `\`${ctx.run.id}:page:${page}\`` (cross-step shape from lesson 5 of chapter 066).
- **Per-email idempotency key** — `\`${ctx.run.id}:email\``.
- **Env entries** (`.env.example`):
  - `TRIGGER_SECRET_KEY=tr_dev_...` (per environment)
  - `TRIGGER_PROJECT_REF=proj_...`
  - `APP_URL=http://localhost:3000`
  - existing `DATABASE_URL`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`

### Inspector page spec

A single Server Component at `/inspector` provided in full; the student writes only the task code and `startExport` action it exercises.

- **Header:** active-org switcher (three seeded orgs each with 200+ invoices), session-user switcher (one admin per org), the active org's last export status read from the `exports` table.
- **"Export invoices" button per org:** calls `startExport()` Server Action, on `{ ok: true }` the run panel below switches to the returned `runId` and starts polling `/api/exports/[runId]` every 1s.
- **Run panel:** shows `runId`, status (`queued | executing | completed | failed | retrying`), `attempt.number`, a progress bar driven by `run.metadata.pagesDone / run.metadata.pagesTotal`, the duration since trigger, and (on completion) the `downloadUrl` from `run.output` plus a deep-link to the Trigger.dev dashboard run page.
- **"Trigger 2 parallel exports for this org" debug button:** fires `startExport` twice with hand-rolled distinct idempotency keys (the debug bypasses the natural daily key) so the per-org queue serialization is observable — the second run shows `status: queued` until the first finishes.
- **"Trigger 3 parallel exports across orgs" debug button:** fires for orgs A, B, C simultaneously; all three should reach `status: executing` immediately (different dynamic queues).
- **Audit-log tail:** last 20 `audit_logs` rows for the active org; every completed export writes one (`export.invoices.completed`) and every fired-but-deduped action writes none (the idempotency-key short-circuit returns the prior run handle, no second audit row).
- **No log scraping** — the panel reads run state structurally via the Trigger.dev REST API (`runs.retrieve` in `lib/trigger-client.ts`), so each lesson's Moment of truth can assert against state, not log strings.

### Concepts demonstrated → owning lesson

- Inline `await` vs. `after()` vs. Vercel Cron vs. Trigger.dev as the four-tier ladder, with the five trigger conditions — lesson 3 of chapter 066.
- `schemaTask` for Zod-validated payloads at the trigger boundary — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- `tasks.trigger` (fire-and-forget from Server Actions) vs `tasks.triggerAndWait` (in-task child runs) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067 and lesson 3 of chapter 067.
- Queues declared in code (the v3-to-v4 break) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- Dynamic per-tenant queues keyed by `organizationId` (the SaaS pattern) — lesson 4 of chapter 066; applied in lesson 2 of chapter 067.
- `ctx.run.id`, `ctx.attempt.number`, `ctx.run.metadata` — lesson 4 of chapter 066 / lesson 5 of chapter 066; applied across lesson 2 of chapter 067–lesson 4 of chapter 067.
- Durable checkpoints at every `triggerAndWait` boundary — lesson 5 of chapter 066; applied in lesson 3 of chapter 067.
- Run-level retries with exponential backoff and jitter (declared in `retry`) — lesson 5 of chapter 066; applied in lesson 2 of chapter 067.
- `idempotencyKey` on `tasks.trigger` (business-key at the action) — lesson 5 of chapter 066; applied in lesson 2 of chapter 067. Cross-step `${ctx.run.id}:page:N` keys — applied in lesson 3 of chapter 067.
- `idempotencyKeyTTL` to scope the dedup window — lesson 5 of chapter 066; applied in lesson 2 of chapter 067.
- `AbortTaskRunError` for permanent failures (the empty-resultset case) — lesson 5 of chapter 066; applied in lesson 3 of chapter 067.
- Mutable `run.metadata` as the live-progress channel for an inspecting client — lesson 6 of chapter 066; applied in lesson 3 of chapter 067.
- Task body has no request context — payload carries `organizationId`, `tenantDb(orgId)` re-derives tenancy inside the body — lesson 3 of chapter 066 / lesson 7 of chapter 066; applied in lesson 2 of chapter 067.
- `authedAction(role, schema, fn)` wrapping the trigger call from app code — chapter 057; applied in lesson 2 of chapter 067.
- `tenantDb(orgId)` for org-scoped reads inside the task — chapter 056; applied in lesson 3 of chapter 067 and lesson 4 of chapter 067.
- Canonical Server Action Result shape returned by `startExport` — chapter 043; applied in lesson 2 of chapter 067.
- `audit_logs` append-only on every completed run, written from the task body inside the same transaction as the `exports` row update — chapter 059; applied in lesson 4 of chapter 067.
- Resend send through `lib/email.ts` from inside a task (no request context) — chapter 050; applied in lesson 4 of chapter 067.
- React Email template render passed as `react:` to `sendEmail` — chapter 050; applied in lesson 4 of chapter 067.

### Forward references the chapter project hands off

- **Unit 13b (R2 upload, chapter 069):** the parent body's `console.log`-shaped `downloadUrl` becomes a real R2 presigned PUT; the `paginate-page` child task pipes its CSV directly to R2 via the presigned URL; the email's `downloadUrl` is the matching presigned GET. The `metadata.downloadUrl` channel stays unchanged.
- **Unit 13 (notifications):** the `export.invoices.completed` audit log fires the notification dispatcher (one event, the dispatcher fans out to email-or-inbox-or-both per user preferences). The current direct `sendExportEmail` child task becomes redundant; the dispatcher owns the channel choice.
- **Unit 15a (cache):** the inspector's `exports` list reads (`use cache` + `cacheTag('exports', orgId)`) get `updateTag('exports', orgId)` from the parent task after every completion; the user's next visit shows fresh state without a hand-rolled refresh.
- **Unit 15b (rate limit):** `startExport` gets wrapped in an Upstash limiter (`5 per user per hour`) so a misbehaving client cannot fill the dynamic queue with synthetic-key debug runs.
- **Stripe reconciliation (Unit 11 forward note):** the per-org dynamic queue shape lifts directly — `org-reconcile-${organizationId}` with `concurrency: 1`, a nightly `schedules.task` cron triggers one run per org, the body reads `subscriptions.list` and reconciles drift against `plan_entitlements`.

---

## Lesson 1 — Project Overview

A durable, paginated CSV export of an org's invoices, fired from a Server Action and built on Trigger.dev v4.
The finished project: clicking "Export invoices" in the inspector kicks off a run that progresses page by page, survives a mid-run worker kill, serializes per org while parallelizing across orgs, and ends with an `ExportReadyEmail` in the student's inbox — all visible in the inspector's run panel and the Trigger.dev dashboard.

Figure: the inspector showing a completed run — progress bar at `7/7`, the `export.invoices.completed` audit-log row, the rendered `downloadUrl`, and the email arrived in the student's inbox. A short animated capture pairs with it: clicking Export → the progress bar advancing → the Ctrl-C-and-restart drill resuming cleanly → the email arriving.

### What we'll practice

- Modeling a long-running job as a Trigger.dev `schemaTask` fired fire-and-forget from a Server Action that returns immediately.
- Designing for durability — placing checkpoints at step boundaries so a killed worker resumes instead of restarting.
- Reasoning about multi-tenant back-pressure with dynamic per-tenant queues.
- Guarding side effects (a duplicate trigger, a re-sent email) with idempotency keys at two different scopes.
- Streaming live progress from a worker to a watching client through `run.metadata`.

### Architecture

The shape, end to end:

- The inspector (a Server Component) calls the **`startExport`** Server Action.
- `startExport` fires **`exportInvoices`** fire-and-forget via `tasks.trigger`, records an `exports` row, and returns the `runId` immediately.
- **`exportInvoices`** (the parent task) runs on a dynamic per-org queue at concurrency 1. It counts pages, then loops, awaiting one **`paginatePage`** child run per page through `triggerAndWait`, accumulating CSV.
- When the loop finishes it awaits the **`sendExportEmail`** child, then updates the `exports` row and writes the audit log in one tenant transaction.
- The inspector polls `/api/exports/[runId]`, which reads run state structurally from the Trigger.dev REST API — `status`, `attempt.number`, and the `pagesDone / pagesTotal` progress carried on `run.metadata`.

### Starting file tree

See the annotated tree in the Chapter framing. The three task files under `src/trigger/` are the highlighted focus, alongside the `startExport` stub in `lib/exports/start.ts` and the queue-declaration TODO in `trigger.config.ts`; every other file is provided.
The pieces the student leans on most — `lib/email.ts`, `lib/invoices/list-page.ts`, `lib/exports/to-csv.ts`, `emails/ExportReadyEmail.tsx`, `lib/trigger-client.ts`, the inspector page, and the `exports` table in `db/schema.ts` — are each explained in the Implementation lesson that first touches them.

The `exports` table carries `id`, `organizationId`, `requestedBy`, `status` (`queued | running | completed | failed`), `runId`, `idempotencyKey` (unique on `(organizationId, requestedBy, dayBucket)`), `requestedAt`, `completedAt`. The row exists for app-side audit and dedup; Trigger.dev's run record is the operational truth and the `exports` row is the app's reference.

### Roadmap

<CardGrid>
  <Card title="Lesson 2 — The task boundary">
    Write the `exportInvoices` schemaTask with a Zod payload and a dynamic per-org queue, plus the `startExport` action that fires it with a daily idempotency key.
  </Card>
  <Card title="Lesson 3 — One checkpoint per page">
    Spawn each page as a durable `paginatePage` child run, drive the progress bar through `run.metadata`, and abort permanently on an empty resultset.
  </Card>
  <Card title="Lesson 4 — Send the email, write the audit log">
    Add the `sendExportEmail` child guarded by a per-run key, then close the run by updating the `exports` row and writing the audit log in one transaction.
  </Card>
</CardGrid>

### Setup

The Trigger.dev cloud project must be created first: the student's account creates the project ref, and `npx trigger.dev@latest init` links the starter folder to it.
Local dev needs two terminals — the trigger CLI worker alongside the Next.js dev server — and without the worker, tasks queue forever.

Steps:

1. `npx degit <starter-repo> csv-export` — clone the starter. Expected: the file tree above.
2. `pnpm install` — install dependencies. Expected: a clean install.
3. `docker compose up -d` — start Postgres 18. Expected: the container reports healthy.
4. `pnpm db:migrate && pnpm db:seed` — apply the schema and seed three orgs with 200+ invoices each. Expected: the seed prints three org ids. The seed is idempotent (it checks `organizations.id` first), so re-running it is safe; Trigger.dev's run history is separate and the seed does not reset it.
5. Create a Trigger.dev account, then `npx trigger.dev@latest init` in the project folder — runs the interactive flow that writes the `trigger.config.ts` defaults, registers `src/trigger/` as the task folder, and prints the project ref. The starter already ships a `trigger.config.ts` matching what init produces, plus the queue-declaration TODO.
6. Paste `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` into `.env.local`. The secret key is per-environment (dev / staging / production); the starter uses the dev key only. Obtain both from the Trigger.dev dashboard for the project just created.
7. `pnpm trigger:dev` in one terminal — the local worker. Expected: it prints the dashboard URL (`https://cloud.trigger.dev/orgs/<...>/projects/<ref>/dashboard`) and shows "Waiting for tasks". Open the dashboard once to confirm the project is linked and shows zero runs.
8. `pnpm dev` in a second terminal — the app. Expected: `/inspector` renders with the per-org Export buttons.

Env vars: `TRIGGER_SECRET_KEY` (authenticates the worker and the REST reads; from the Trigger.dev dashboard, per environment), `TRIGGER_PROJECT_REF` (identifies the linked project; from the dashboard), `APP_URL` (the app's base URL, `http://localhost:3000` locally), plus the carried-over `DATABASE_URL`, `RESEND_API_KEY`, and `BETTER_AUTH_SECRET`.

The free tier covers everything this chapter runs (3 runs × ~10 pages × 3 orgs = 90 child runs total), so the kill-resume drill will not hit a cap.

On success the starter runs locally: the inspector shows the Export buttons and the worker shows "Waiting for tasks". Clicking Export returns an error because the task file is still empty — that is the next lesson.

---

## Lesson 2 — The task boundary: schemaTask and the per-org queue

Write the `exportInvoices` task and the `startExport` action so clicking Export fires a real, validated, per-org-serialized run.
Finished result: clicking "Export invoices" in the inspector produces a run that appears in the dashboard with a validated payload and completes; a duplicate same-day click returns the same run; two clicks for one org serialize while clicks across orgs run in parallel — all before the body does any real export work.

### Your mission

This first build stands up the boundary between the app and the durable job: a Server Action that fires the task and returns immediately, and a task that validates its payload and lands on the right queue.
The task has no request context, so `organizationId` and `requestedBy` travel in the payload, and `schemaTask` validates that payload with `z.strictObject` at the trigger boundary — before any retries are spent — never inside the body.
The queue is declared in code as a dynamic per-tenant queue keyed by `organizationId` at `concurrencyLimit: 1`: this serializes exports within an org while letting different orgs run in parallel, and it is the v4-native shape — declaring a queue at trigger time, or copy-pasting a v3 example that does, will not work.
`concurrencyLimit: 1` is the back-pressure choice for a read-heavy export; staying at 1 keeps the DB pool friendly, and you would only raise it if a specific tenant repeatedly stacks up.
The action fires with `tasks.trigger` (fire-and-forget) — calling `tasks.triggerAndWait` from a Server Action would block the request until the run finished and time out — and carries a business idempotency key built from `(orgId, userId, dayBucket())` with a 24h TTL, so a second click on the same calendar day returns the first run instead of starting a new one.
The action is pinned to the `member` role, because exports are a member-level capability, and the role is the structural boundary that decides who may trigger.
Out of scope here: the body does no pagination, no email, and no audit write yet — it sets a `pagesDone: 0` so the progress bar has something to read and returns a placeholder; the cross-step idempotency keys and the real work land in the next two lessons.
One trap to avoid: the `exports` row is inserted before the trigger (so it exists for dedup) but the `runId` is only known after the trigger returns, so the row is written with a null `runId` and updated immediately after — production hardening would wrap both in a transaction and accept the rare orphan row on trigger failure, named but not built.

Requirements — by the end the student can confirm:

- [ ] Clicking "Export invoices" for an org starts a run that appears in the Trigger.dev dashboard with payload `{ organizationId, requestedBy }` and reaches `status: completed`.
- [ ] The inspector run panel switches to the new `runId` after the click and reflects the run's status.
- [ ] Firing `export-invoices` with a malformed payload (e.g. `{ organizationId: 'not-a-uuid' }`) from the dashboard's "Run task" tool fails immediately at the schema boundary, with the body never executing.
- [ ] Clicking Export twice in quick succession returns the same `runId` both times, leaves a single `exports` row, and shows one run in the dashboard.
- [ ] Firing two exports for the same org (debug button) serializes them: the first runs while the second sits at `queued`, and the second starts only once the first completes.
- [ ] Firing exports across three orgs (debug button) runs all three in parallel, each on its own dynamic queue.

### Coding time

Implement `trigger/export-invoices.ts` and `lib/exports/start.ts` against the brief, the reference signatures in the framing, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `exportInvoices` schemaTask (id `export-invoices`, the strict-object payload schema, the dynamic `queue: ({ payload }) => ({ name: \`org-${payload.organizationId}\`, concurrencyLimit: 1 })`, `retry: { maxAttempts: 3 }`, and the placeholder body that logs and sets `metadata.set('pagesDone', 0)`) and for `startExport` (the `authedAction('member', z.strictObject({}), ...)` wrapper, the pre-trigger `exports` insert, the `tasks.trigger` call with the `idempotencyKeys.create([ctx.orgId, ctx.user.id, dayBucket()])` key and `idempotencyKeyTTL: '24h'`, the post-trigger `runId` update, and the `{ ok: true, data: { runId } }` return).

Rationale to cover:
- `id: 'export-invoices'` is the durable API — the string identity, not the symbol, is what Trigger.dev keys on across deploys (lesson 4 of chapter 066).
- The `queue:` callback receives the parsed `payload`; the static-queue alternative (`queue: { name: 'exports', concurrencyLimit: 5 }`) is shown alongside to mark the dynamic-per-tenant choice, and the v3 trigger-time-queue shape is shown as the break that no longer works.
- `tasks.trigger` from the action vs the `triggerAndWait`-from-an-action timeout failure mode (lesson 4 of chapter 066).
- The business-key idempotency shape `(orgId, userId, day)` and how the debug button injects a `:debug:<random>` suffix to bypass it for the serialization proofs.
- The two-step `exports` write (insert with null `runId`, update after trigger) and the named production hardening.
- The `member` role pin as the structural enforcement of who may export (chapter 057).

</details>

### Moment of truth

Run the lesson's test suite (`<command>`); expect all tests to pass, reporting the task fires with a validated payload, the dynamic queue serializes per org, and the business idempotency key short-circuits a duplicate.

Confirm by hand the outcomes the tests can't reach:

- [ ] Click "Export invoices" for org A. The inspector switches to the new `runId`; the dashboard shows one run, `status: completed`, payload `{ organizationId, requestedBy }`, and the structured log line. The progress bar reads `0/?` — `pagesTotal` lands in the next lesson.
- [ ] Click Export twice in quick succession. The second click returns the same `runId`; the `exports` table shows one row; the dashboard shows one run.
- [ ] From the dashboard's "Run task" tool, fire `export-invoices` with `{ organizationId: 'not-a-uuid' }`. The run fails immediately at the schema-parse boundary with a Zod error; the body never executes.
- [ ] Click "Trigger 2 parallel exports for this org" (debug). Two runs appear; the first is `executing`, the second `queued`; after the first completes the second transitions to `executing`. The dashboard confirms both ran on the `org-<id>` queue at concurrency 1.
- [ ] Click "Trigger 3 parallel exports across orgs" (debug). All three transition to `executing` within ~1s, on three distinct dynamic queues.

---

## Lesson 3 — One checkpoint per page

Turn the placeholder body into a real paginated export where every page is its own durable child run.
Finished result: clicking Export against a seeded org drives the progress bar from `0/N` to `N/N` over ~10–20s while the dashboard fills with one `paginate-page` child per page; killing the worker mid-run and restarting it resumes cleanly from the next uncompleted page with the same `runId`.

### Your mission

This is where durability becomes real: instead of one long body, each page is spawned as its own `paginatePage` child through `triggerAndWait`, and every `triggerAndWait` is a checkpoint.
A seven-page export has seven checkpoints, so a crash between pages three and four resumes at page four — when the parent retries it re-issues the same idempotency keys and the runtime returns the prior results for completed children instead of re-running them.
The cross-step key shape is `${ctx.run.id}:page:${page}`: prefixing with `ctx.run.id` is what keeps the cache per-run — `${page}` alone would collide across runs and hand every export the first one's page-0 result, while `Date.now()` would break the cache on retry and re-run everything.
The page child reads through `listInvoices` with cursor pagination (from chapter 062): the cursor is the natural restart point and stays stable across writes, so a row inserted between pages is still covered correctly.
The parent drives the progress bar by writing `metadata.set('pagesTotal', ...)` once and `metadata.set('pagesDone', page + 1)` each iteration — from the parent, because the parent's view of progress is the user-facing one; forgetting the `pagesDone` write is the common bug where the export completes but the bar stays at zero.
An empty resultset is a permanent failure on the same inputs, so the body throws `AbortTaskRunError` rather than a plain `Error`: a plain throw would burn all three configured retries before failing, while `AbortTaskRunError` stops immediately — the rule is permanents abort, transients throw.
The loop is sequential (`for...of` + `await`) by default: parallelizing the pages with `Promise.all` would race the queue's concurrency limit and reorder rows, so sequential is the safe choice unless the rows have no order requirement.
Out of scope: the CSV is accumulated in memory across pages, which is bounded by the per-org row cap and fits in a few MB for the seed; a production org of 100k+ invoices would need a streaming write to R2 inside each child, which chapter 069 introduces. The email step is still empty; the body ends by logging the CSV size and storing a placeholder `downloadUrl` on `metadata` for the next lesson.

Requirements — by the end the student can confirm:

- [ ] Clicking Export against a seeded org advances the progress bar from `0/N` to `N/N`, and the dashboard shows one `paginate-page` child run per page, each with its payload and output, parented under the export run.
- [ ] Killing the worker mid-run (Ctrl-C at `pagesDone: 2 / 7`) and restarting it resumes from page 3, re-uses the completed pages from cache rather than re-running them, and reaches `completed` with the same `runId`.
- [ ] Exporting an org with no invoices fails on the first attempt with no retries, via `AbortTaskRunError`, and spawns no `paginate-page` children.
- [ ] The progress bar reflects real per-page advancement driven by `run.metadata`, not a fixed or fabricated value.

### Coding time

Implement `trigger/paginate-page.ts` and grow the `exportInvoices` body against the brief, the reference signatures, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `paginatePage` schemaTask (the strict-object `{ organizationId, page, cursor }` payload, the `listInvoices({ orgId, view: 'active', cursor, pageSize: 500 })` read, `rowsToCsv`, and the `{ csv, nextCursor, rowCount }` return) and for the grown parent body (the `count(*)` read and `pagesTotal = Math.ceil(total / 500)`, the `AbortTaskRunError('EMPTY_RESULTSET')` guard on `total === 0`, the `metadata.set('pagesTotal' / 'pagesDone')` writes, the sequential page loop calling `paginatePage.triggerAndWait(..., { idempotencyKey: \`${ctx.run.id}:page:${page}\` })` while accumulating CSV and advancing the cursor, and the closing `console.log` plus `metadata.set('downloadUrl', \`https://example.com/exports/${ctx.run.id}.csv\`)`).

Rationale to cover:
- Every `triggerAndWait` is a durable checkpoint; the worked example shows resume-at-page-4, and shows the broken key shapes (`${page}` alone, `Date.now()`) next to the correct `${ctx.run.id}:page:${page}` (lesson 5 of chapter 066).
- `AbortTaskRunError` vs a plain throw and the wasted-retry cost (lesson 5 of chapter 066).
- Cursor pagination's stability across writes (chapter 038 / chapter 062).
- Why `pagesDone` is set from the parent, not the child, and the zero-bar symptom of omitting it.
- The in-memory accumulation bound and the pointer to chapter 069 for the streaming write.
- The sequential-vs-parallel loop decision.

</details>

### Moment of truth

Run the lesson's test suite (`<command>`); expect all tests to pass, reporting per-page progress advances, the kill-resume drill resumes from the next page without re-running completed pages, and an empty resultset aborts without retries.

Confirm by hand the outcomes the tests can't reach:

- [ ] Click Export for org A (~5–7 pages at limit 500). The progress bar advances `0/N → ... → N/N` over ~10–20s; the dashboard shows N `paginate-page` children, each with payload + output, under the parent.
- [ ] Kill-resume drill: start an export, and at `pagesDone: 2 / 7` Ctrl-C the `pnpm trigger:dev` terminal. Wait 5s and re-run `pnpm trigger:dev`. The parent picks up on the new worker, completed children return cached (not re-executed), pages 3 onward run fresh, and the final state is `completed` with the same `runId`.
- [ ] Trigger an export against the empty fourth org (debug). The body throws `AbortTaskRunError('EMPTY_RESULTSET')`; the dashboard shows one attempt, no retries.
- [ ] Optional senior reach: confirm one child's `idempotencyKey` is exactly `${parent.id}:page:0`, then force a parent retry and confirm the same key returns the cached output instead of re-executing.

---

## Lesson 4 — Send the email, write the audit log

Close the run: send the ready-email as its own guarded child, then update the `exports` row and write the audit log in one tenant transaction.
Finished result: a full export now ends with the `ExportReadyEmail` arriving in the student's inbox within ~10s, the inspector flipping to `completed` with the `downloadUrl` rendered, and one fresh `export.invoices.completed` row in the audit-log tail — and the email lands exactly once even if the parent retries.

### Your mission

This last build closes the loop with two side effects that must each happen exactly once: the email send and the audit write.
The email is its own `sendExportEmail` child task, not an inline call, for two reasons — durability (a Resend transient failure retries with backoff on the child's own policy) and idempotency (the per-step key `${ctx.run.id}:email` guards against a parent retry re-issuing the send); inlining `sendEmail` in the parent body would lose both.
The child reads the org name and recipient email through `tenantDb(organizationId)`, renders `ExportReadyEmail`, and sends via the Unit 7 `sendEmail` adapter; the `downloadUrl` it emails is the one the parent already put on `metadata`, consumed not re-derived, and it becomes a real R2 presigned link in chapter 069.
The recipient is `requestedBy` — the user who clicked Export gets the email — with an org-owner override named as a future variant, not built.
After the email returns, the parent opens one `tenantDb` transaction to update the `exports` row to `completed` and write the `export.invoices.completed` audit entry via `logAudit(tx, ...)`: the audit write comes after the email, because auditing the user-facing outcome (we sent it) beats auditing the intent (we meant to).
A Resend suppression is an expected failure, not a crash: the child returns the `err('suppressed', ...)` Result rather than throwing, the parent still treats the run as completed-but-skipped-email, and the audit note records the suppression — throwing to surface it in the dashboard is named as the alternative.
The structured logs inside the child carry `messageId`, `to` (hashed in production), and `disposition` — useful enough to debug at 3am, no PII (the discipline from chapter 080).
Out of scope: there is still no failure-email path (a permanently-failed export logs but does not notify), and Unit 13's dispatcher will later own channel choice and make this direct child redundant.

Requirements — by the end the student can confirm:

- [ ] A full export run ends with the inspector at `status: completed`, the `downloadUrl` rendered, and one new `export.invoices.completed` row in the audit-log tail.
- [ ] The `ExportReadyEmail` arrives in the student's Resend-verified inbox with the right `orgName`, `rowCount`, and download URL, within ~10s of completion.
- [ ] Forcing a parent retry after the email step sends no second email — the child returns the cached result and does not call Resend again.
- [ ] When the recipient is on the Resend suppression list, the run still completes, no email is sent, and the audit note records the suppression.

### Coding time

Implement `trigger/send-export-email.ts` and the closing steps of the `exportInvoices` body against the brief, the reference signatures, and the tests. Read the solution after attempting.

<details>

Reference implementation for the `sendExportEmail` schemaTask (the strict-object `{ organizationId, recipientUserId, rowCount, downloadUrl }` payload, the read-only `tenantDb` lookups for org name and recipient email, the `ExportReadyEmail` render, and the `sendEmail({ to, subject, react })` call returning `{ id }` or the suppressed Result) and for the parent's closing steps (the `sendExportEmail.triggerAndWait(..., { idempotencyKey: \`${ctx.run.id}:email\` })` call, then the single `tenantDb(organizationId).transaction` that updates the `exports` row to `completed` and writes the `export.invoices.completed` audit entry via `logAudit(tx, ...)`, and the `{ ok: true, runId, rowCount }` return).

Rationale to cover:
- Why the email is a child task (durability + per-step idempotency); the inline-shaped wrong version shown next to the child-task right version.
- Audit-after-email ("audit the outcome, not the intent") and the at-least-once semantics it buys.
- The `downloadUrl` flowing parent → child (parent owns it), forecasting the chapter 069 presigned link.
- The suppression path returning a Result rather than throwing, with the throw-to-surface alternative named.
- `recipientUserId = requestedBy` and the org-owner override variant.
- The structured-log fields and the no-PII discipline (chapter 080).

</details>

### Moment of truth

Run the lesson's test suite (`<command>`); expect all tests to pass, reporting the run completes with the audit row written, the email is sent once across a parent retry, and a suppressed recipient completes without sending.

Confirm by hand the outcomes the tests can't reach:

- [ ] Run a full export against org A. The progress bar runs to completion; the run panel flips to `completed` with the `downloadUrl`; the audit-log tail gains one row; the student's inbox receives the `ExportReadyEmail` within ~10s.
- [ ] Force a parent retry (dashboard "Replay run" or the debug throw after the email returns). The email child returns the cached `{ id }`, no second email lands, and the child's log reads "cached return, did not call Resend".
- [ ] Move the seeded recipient's email into the suppression list and run an export. `sendEmail` returns `{ ok: false, error: { code: 'suppressed', ... } }`; the run still completes; the audit note records the suppression.

---

## Project wrap-up

With the three task files written, the student has built the canonical Trigger.dev durable-job shape and can articulate every primitive it rests on — payload validation at the boundary, dynamic per-tenant queues that serialize within an org and parallelize across orgs, `triggerAndWait` checkpoints for durability, cross-step idempotency keys that guard side effects across retries, `AbortTaskRunError` for permanents only, `run.metadata` as the live-progress channel, and `tasks.trigger` (fire-and-forget) for app-side calls versus `tasks.triggerAndWait` for in-task children — and which forward unit (R2 upload, notifications, cache, rate limit, Stripe reconciliation) will lean on each.
