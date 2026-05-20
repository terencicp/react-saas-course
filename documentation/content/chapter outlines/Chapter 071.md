# Chapter 071 — Project: Durable CSV export with Trigger.dev

## Chapter framing

Chapter 071 takes the Trigger.dev primitives lessons lesson 3 of chapter 070–lesson 6 of chapter 070 installed (schemaTask, code-defined queues, `wait.for`, run-level retries, idempotency keys, lifecycle hooks) and lands them as one runnable durable job: a paginated CSV export of an org's invoices that survives a worker kill, serializes per-org via a dynamic queue, and ends in a `ExportReadyEmail` send through the Unit 8 Resend adapter. The student writes the task body, not the surrounding infrastructure — the cloud-linked project, the local-dev CLI, the inspector page that triggers and polls runs, and the React Email template are all provided. Each "Build it" lesson closes on a runnable state: lesson lesson 3 of chapter 071 ends with a fireable empty task validated by Zod; lesson 4 of chapter 071 ends with a full multi-page run completing and `console.log`-ing the would-be URL; lesson 5 of chapter 071 ends with the email landing in the student's inbox. The verify lesson then walks the three deterministic proofs — visible run progress, mid-run kill resumes, per-org serialization — clause by clause against the project's "Done when."

Threads that run through every lesson: every Server Action call site triggers a task and returns immediately — the user never waits on the export; the task receives `organizationId` in its payload because it has no request context, and re-derives tenancy via `tenantDb(organizationId)` inside the body; `schemaTask` validates the payload at the trigger boundary, never inside the body; the queue is declared in code (`trigger.config.ts`), never at trigger time (the v3-to-v4 break from lesson 4 of chapter 070); per-org serialization uses dynamic queues keyed by `organizationId`, not the static queue; durability lives at step boundaries — every page is its own `triggerAndWait` child run with `idempotencyKey = ${ctx.run.id}:page:${page}`, so a retried parent re-issues the same keys and the runtime returns prior results instead of re-running; the email send is its own `triggerAndWait` child with `idempotencyKey = ${ctx.run.id}:email`, guarding the Resend call against a parent-level retry; `run.metadata` carries live progress (`{ pagesDone, pagesTotal }`) for the inspector's poller; the inspector reads run state via the Trigger.dev REST API by `run.id`, never by scanning logs; the local CLI (`npx trigger.dev@latest dev`) is the only worker that can be killed mid-run, so the durability proof requires it specifically.

### Dependency carry-in

- **From lesson 4 of chapter 070 (Trigger.dev v4 primitives):** the `src/trigger/` folder convention, `trigger.config.ts` with `queues:` declared in code, `schemaTask` with Zod payloads, `tasks.trigger` (fire-and-forget) vs `tasks.triggerAndWait` (in-task, returns the child's result), `ctx.run.id` / `ctx.attempt.number` / `ctx.run.metadata`, dynamic per-tenant queues via `queue: { name: \`org-${organizationId}\`, concurrencyLimit: 1 }`.
- **From lesson 5 of chapter 070 (durable execution):** checkpoints at every `wait.*` and `triggerAndWait`, run-level retries with exponential backoff and jitter (declared in `retry: {...}`), `AbortTaskRunError` for permanent failures, `idempotencyKey` + `idempotencyKeyTTL` on `tasks.trigger` / `triggerAndWait` / `wait.for`, `idempotencyKeys.create([...keyArray])`, the `${ctx.run.id}:step:...` cross-step key shape.
- **From lesson 7 of chapter 070 (workload picking):** the three Trigger.dev-bound jobs named (CSV export is the one this chapter builds; Stripe reconciliation and notification dispatcher are forward references), the `TRIGGER_SECRET_KEY` + `TRIGGER_PROJECT_REF` env surface, the deploy-Trigger-first-then-app order.
- **From chapter 054 (Resend):** `sendEmail({ to, subject, react })` lives in `lib/email.ts`; the React Email runtime is installed; the verified domain is configured in `.env.local`; the suppression read is wired (skipped sends return an `err('suppressed', ...)` Result, i.e. `{ ok: false, error: { code: 'suppressed', ... } }`).
- **From chapter 063 (tenancy):** `organizations` and `org_members` tables, `tenantDb(orgId)` returning a Drizzle handle scoped to the org, `audit_logs` and `logAudit(tx, event)`.
- **From chapter 066 (list queries):** the invoices schema with cursor-paginatable reads; the project ships a thin starter wrapper `listInvoicesPage` over `listInvoices` from chapter 066 as the source of CSV rows.
- **From chapter 047 (Server Actions + Result):** the canonical `{ ok: true, data } | { ok: false, error: { code, userMessage } }` shape returned by the `startExport` action; `authedAction('member', schema, fn)` wraps the trigger call.
- **From chapter 045 (schema) and chapter 066 (concurrency):** no schema changes in this chapter beyond a small `exports` table the starter ships (id, organizationId, status, runId, requestedBy, requestedAt, completedAt, idempotencyKey unique on `(organizationId, requestedBy, dayBucket)`).
- **From chapter 013 (Error classes):** `ExportError` subclass with codes `EMPTY_RESULTSET | UNKNOWN_PLAN` (the latter forward-referenced, named here so the union is open).

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
    email.ts                    # provided (Unit 8)
    invoices/
      list-page.ts              # provided: listInvoicesPage({ orgId, cursor, limit }) — starter-only wrapper over listInvoices from chapter 066
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

### Reference solution signatures lessons display

- **`trigger.config.ts`** — exports default config with `project: env.TRIGGER_PROJECT_REF`, `runtime: 'node'`, `queues: [{ name: 'notifications', concurrencyLimit: 5 }]` (static queue named but unused this chapter; the export queue is dynamic per-org), and `retries: { default: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 1000, maxTimeoutInMs: 60_000, randomize: true } }`.
- **`startExport`** (`lib/exports/start.ts`) — `authedAction('member', z.strictObject({}), async (_, ctx) => ...): Promise<Result<{ runId: string }>>`. Inserts an `exports` row with `status: 'queued'`, calls `tasks.trigger<typeof exportInvoices>('export-invoices', { organizationId: ctx.orgId, requestedBy: ctx.user.id }, { idempotencyKey: \`org:${ctx.orgId}:user:${ctx.user.id}:${dayBucket()}\`, idempotencyKeyTTL: '24h' })`, updates the `exports` row with the returned `runId`, returns `{ ok: true, data: { runId } }`.
- **`exportInvoices`** (`trigger/export-invoices.ts`) — `schemaTask({ id: 'export-invoices', schema: z.strictObject({ organizationId: z.uuid(), requestedBy: z.uuid() }), queue: ({ payload }) => ({ name: \`org-${payload.organizationId}\`, concurrencyLimit: 1 }), retry: { maxAttempts: 3 }, run: async ({ organizationId, requestedBy }, { ctx, metadata }) => ... })`. Body: count total pages via a `count(*)` read, set `metadata.set('pagesTotal', total)`, loop pages 0..n calling `paginatePage.triggerAndWait(...)` with per-page idempotency key, accumulate CSV strings, then `sendExportEmail.triggerAndWait(...)` with the email idempotency key.
- **`paginatePage`** (`trigger/paginate-page.ts`) — `schemaTask({ id: 'paginate-page', schema: z.strictObject({ organizationId: z.uuid(), page: z.int().nonnegative(), cursor: z.string().nullable() }), run: async ({ organizationId, page, cursor }) => { const { rows, nextCursor } = await listInvoices({ orgId: organizationId, view: 'active', cursor, pageSize: 500 }); return { csv: rowsToCsv(rows), nextCursor, rowCount: rows.length }; } })`.
- **`sendExportEmail`** (`trigger/send-export-email.ts`) — `schemaTask({ id: 'send-export-email', schema: z.strictObject({ organizationId: z.uuid(), recipientUserId: z.uuid(), rowCount: z.int(), downloadUrl: z.string() }), run: async ({ organizationId, recipientUserId, rowCount, downloadUrl }) => { /* read org, read recipient email, render template, sendEmail */ } })`.
- **Per-page idempotency key** — `\`${ctx.run.id}:page:${page}\`` (cross-step shape from lesson 5 of chapter 070).
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
- **No log scraping** — the panel reads run state structurally via the Trigger.dev REST API (`runs.retrieve` in `lib/trigger-client.ts`), so the verify lesson can assert against state, not log strings.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Firing the inspector "Export invoices" button kicks off a run that visibly progresses across pages in the Trigger.dev dashboard | Click the button for org A. Inspector run panel switches to `runId`, status moves `queued → executing`, progress bar advances `1/N → 2/N → ... → N/N` within the polling window. Open the Trigger.dev dashboard at the deep-link — each `paginatePage.triggerAndWait` shows as a child run with payload + output. |
| Killing the local dev worker mid-run resumes after restart | Start `pnpm trigger:dev` in a side terminal. Trigger an export. When the inspector shows `pagesDone: 2 / 7`, hit Ctrl-C in the trigger terminal. Wait 5s. Re-run `pnpm trigger:dev`. The inspector panel resumes advancing from page 3; previously-completed pages return cached on the parent's retry-issued keys; the final state is `completed` with the same `runId`. |
| Firing the same export twice for the same org enqueues the second behind the first | Click "Trigger 2 parallel exports for this org" (debug). Two runs appear in the panel list; the first goes `executing`, the second sits at `queued`. When the first hits `completed`, the second transitions `queued → executing`. The dashboard confirms both ran on the `org-<id>` queue with concurrency 1. |
| Firing parallel exports across orgs runs them in parallel | Click "Trigger 3 parallel exports across orgs" (debug). All three runs transition to `executing` within ~1s; the dashboard shows three distinct dynamic queues `org-A`, `org-B`, `org-C`. |
| Idempotency key short-circuits a duplicate same-day trigger | Click "Export invoices" twice in quick succession (no debug bypass). The second click's `startExport` returns the same `runId` as the first; the inspector does not add a second row to the run list; the `exports` table shows one row with the unchanged `idempotencyKey`. |
| The email lands in the student's inbox with the right rowCount and a working download URL | After a completed run, the student's Resend-verified inbox receives the `ExportReadyEmail` render with `orgName`, `rowCount`, and the placeholder `downloadUrl` (a `https://example.com/exports/{runId}.csv` URL for this chapter — R2 lands in chapter 073). The audit-log tail in the inspector shows `export.invoices.completed`. |
| The body validates payload structurally before any work | Use the Trigger.dev dashboard's "Run task" tool to fire `export-invoices` with `{ organizationId: 'not-a-uuid' }`. The dashboard shows the run failing immediately with a Zod error, no body work attempted, no `paginate-page` child runs spawned. |

### Concepts demonstrated → owning lesson

- Inline `await` vs. `after()` vs. Vercel Cron vs. Trigger.dev as the four-tier ladder, with the five trigger conditions — lesson 3 of chapter 070.
- `schemaTask` for Zod-validated payloads at the trigger boundary — lesson 4 of chapter 070.
- `tasks.trigger` (fire-and-forget from Server Actions) vs `tasks.triggerAndWait` (in-task child runs) — lesson 4 of chapter 070.
- Queues declared in code (the v3-to-v4 break) — lesson 4 of chapter 070.
- Dynamic per-tenant queues keyed by `organizationId` (the SaaS pattern) — lesson 4 of chapter 070.
- `ctx.run.id`, `ctx.attempt.number`, `ctx.run.metadata` — lesson 4 of chapter 070 / lesson 5 of chapter 070.
- Durable checkpoints at every `triggerAndWait` boundary — lesson 5 of chapter 070.
- Run-level retries with exponential backoff and jitter (declared in `retry`) — lesson 5 of chapter 070.
- `idempotencyKey` on `tasks.trigger` (business-key at the action) and `triggerAndWait` (cross-step `${ctx.run.id}:page:N`) — lesson 5 of chapter 070.
- `idempotencyKeyTTL` to scope the dedup window — lesson 5 of chapter 070.
- `AbortTaskRunError` for permanent failures (the empty-resultset case) — lesson 5 of chapter 070.
- Mutable `run.metadata` as the live-progress channel for an inspecting client — lesson 6 of chapter 070.
- Task body has no request context — payload carries `organizationId`, `tenantDb(orgId)` re-derives tenancy inside the body — lesson 3 of chapter 070 / lesson 7 of chapter 070.
- `authedAction(role, schema, fn)` wrapping the trigger call from app code — chapter 061.
- `tenantDb(orgId)` for org-scoped reads inside the task — chapter 060.
- Canonical Server Action Result shape returned by `startExport` — chapter 047.
- `audit_logs` append-only on every completed run, written from the task body inside the same transaction as the `exports` row update — chapter 063.
- Resend send through `lib/email.ts` from inside a task (no request context) — chapter 054.
- React Email template render passed as `react:` to `sendEmail` — chapter 054.

---

## Lesson 1 — The export job, end to end

Frame the durable paginated CSV export, state the "Done when" clauses, name the scope cuts (no R2 yet, no streaming, no schedule), and clone the starter.

Goals:

- Frame what is being built: a paginated, durable CSV export task fired from a Server Action, serialized per-org via a dynamic queue, ending in a `ExportReadyEmail` send. One screenshot of the inspector showing a run completed, progress bar at `7/7`, the audit-log row, and the email arriving in the student's inbox.
- State the "Done when" in one paragraph (runs visibly progress, mid-run worker kill resumes, parallel triggers per org serialize, parallel across orgs parallelize, idempotency key short-circuits same-day duplicate, email arrives with the right rowCount, payload validates structurally).
- Name the scope cuts: no R2 upload yet — the email's `downloadUrl` is a placeholder `https://example.com/exports/{runId}.csv` and the project notes chapter 073 wires the real upload; no streaming generation — the CSV is materialized in memory across pages because the rows-per-org cap keeps this safe (the senior call is named, the streaming alternative referenced); no schedule — exports fire from the inspector, the scheduled-export pattern is a forward note to Chapter 14; no per-user rate limit on `startExport` — Unit 15b lands that; no failure-email path — a permanently-failed export logs but does not email the student a failure notification (Unit 14's dispatcher will).
- Set the senior payoff: this is the canonical Trigger.dev shape every later durable job (Stripe reconciliation in Chapter 12 forward note, notification dispatcher in chapter 075) will copy — `schemaTask` at the boundary, dynamic per-tenant queue for back-pressure, `triggerAndWait` per step for durability, cross-step idempotency keys guarding side effects across retries, `run.metadata` for live progress to the watching client. The student writes one job here and can defend every primitive.
- Show the end UX: a short animated capture of clicking Export → progress bar advancing → the Ctrl-C-and-restart drill resuming cleanly → email arriving.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The Trigger.dev cloud project must be created first (`npx trigger.dev@latest init` in the starter folder runs the interactive flow); the starter ships the project skeleton but the student's account creates the project ref and pastes it into `.env.local`. Named here so it does not surprise them in lesson 2 of chapter 071.
- Local dev requires the trigger CLI side terminal (`pnpm trigger:dev`) running alongside `pnpm dev` — without it tasks queue forever. The lesson names the daily two-terminal rhythm.
- Re-running the starter's seed is idempotent (the seed checks `organizations.id` existence first) — students can reset state safely. Trigger.dev's run history is not reset by the seed; old runs accumulate in the dashboard.
- The free tier covers everything this chapter runs (3 runs × ~10 pages × 3 orgs = 90 child runs total). Named so the student is not anxious about hitting the cap during the kill-resume drill.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, `pnpm install` clean, `docker compose up -d` running Postgres, `pnpm db:migrate && pnpm db:seed` populated three orgs, Trigger.dev account created and `npx trigger.dev@latest init` linked, `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` pasted into `.env.local`, `pnpm dev` shows the inspector with the per-org Export buttons, `pnpm trigger:dev` running in a side terminal showing "Waiting for tasks" — clicking Export returns an error because the task file is empty.

Estimated student time: 15 to 25 minutes.

---

## Lesson 2 — Tour the starter and the two-terminal loop

Walk the provided files and the three TODO task stubs, read the inspector and `exports` table, and run the `pnpm trigger:dev` + `pnpm dev` loop to confirm the cloud link.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on the three TODO task files (`trigger/export-invoices.ts`, `trigger/paginate-page.ts`, `trigger/send-export-email.ts`), the stub `startExport` in `lib/exports/start.ts`, and `trigger.config.ts` (mostly scaffolded — the student fills the queue declaration in lesson 3 of chapter 071).
- Read the provided pieces end-to-end: `lib/email.ts` (Unit 8 carry-in), `lib/invoices/list-page.ts` (cursor-paginated reader the task calls), `lib/exports/to-csv.ts` (pure function the student does not need to write), `emails/ExportReadyEmail.tsx` (the React Email template with `{ orgName, rowCount, downloadUrl }` props), `lib/trigger-client.ts` (the typed REST helper the inspector route uses to read run state).
- Read the inspector: confirm the per-org Export buttons, the run-status polling panel, the progress bar wired to `run.metadata`, the parallel-debug buttons, the audit-log tail.
- Read the `exports` table in `db/schema.ts`: `id`, `organizationId`, `requestedBy`, `status` (`queued | running | completed | failed`), `runId`, `idempotencyKey` (unique on `(organizationId, requestedBy, dayBucket)`), `requestedAt`, `completedAt`. Names the rule: the row exists for app-side audit and dedup; Trigger.dev's run record is the operational truth, the `exports` row is the app's reference.
- Run the local CLI loop once: in one terminal, `pnpm trigger:dev`; in another, `pnpm dev`. Visit `/inspector`. Click "Export invoices" for org A — `startExport` throws because the action is empty, the inspector renders the error fallback. Names the next step.
- Verify the dashboard link: the `pnpm trigger:dev` terminal prints a `https://cloud.trigger.dev/orgs/<...>/projects/<ref>/dashboard` URL; open it once to confirm the project is linked and shows zero runs.

Senior calls and watch-outs:

- The `TRIGGER_SECRET_KEY` is per-environment (dev / staging / production). The starter ships only the dev key; trying to run `pnpm trigger:deploy` requires the production key in CI — named, not exercised this chapter.
- The local dev CLI registers tasks via filesystem watch — saving any file in `src/trigger/` re-registers; do not move task files around mid-run, the CLI logs "task not found" until restart.
- The `paginate-page` and `send-export-email` files are stubs because each becomes its own `triggerAndWait` child task (durability lives at the boundaries between steps — lesson 5 of chapter 070). The lesson names the alternative ("one long body with `wait.for` between pages") and the trade-off: child tasks give dashboard-visible per-page progress and free per-step retries.
- The inspector reads run state by `runId` through the Trigger.dev REST API, not by tailing logs. Names the rule from the framing: state-based verification is the senior shape.
- The starter does not ship `npx trigger.dev@latest init` — the student runs it once before this lesson. The CLI writes `trigger.config.ts` defaults and registers `src/trigger/` as the task folder; the starter ships a version of `trigger.config.ts` that matches what the init produces plus a TODO marker for the queue declaration in lesson 3 of chapter 071.

Codebase state at entry: starter cloned, deps installed, Postgres up, schema migrated and seeded, Trigger.dev project linked, both terminals running.
Codebase state at exit: student has read every provided file, confirmed the inspector renders, fired one click that errored cleanly (action empty), confirmed the dashboard shows the project with zero runs. No task code written.

Estimated student time: 20 to 30 minutes.

---

## Lesson 3 — The task boundary: schemaTask and the per-org queue

Write the `exportInvoices` `schemaTask` with a Zod payload and a dynamic per-org queue, plus the `startExport` Server Action that fires it with a daily idempotency key.

Goals:

- Write `trigger/export-invoices.ts` as a `schemaTask` per the reference signature. Payload schema: `z.strictObject({ organizationId: z.uuid(), requestedBy: z.uuid() })`. `id: 'export-invoices'` — names the rule from lesson 4 of chapter 070 that `id` is the durable API.
- Declare the dynamic queue inline: `queue: ({ payload }) => ({ name: \`org-${payload.organizationId}\`, concurrencyLimit: 1 })`. Names the per-tenant pattern from lesson 4 of chapter 070: serialize within an org, parallelize across orgs, no one tenant starves another.
- Body for this lesson is a placeholder: read `organizationId` from the payload, log it via the structured logger, write a `run.metadata.set('pagesDone', 0)` so the inspector's progress bar has something to read, return `{ ok: true, organizationId }`. The body grows in lesson 4 of chapter 071.
- Fill `lib/exports/start.ts` with the `startExport` action per the reference signature: `authedAction('member', z.strictObject({}), ...)`, insert the `exports` row, call `tasks.trigger<typeof exportInvoices>('export-invoices', { organizationId: ctx.orgId, requestedBy: ctx.user.id }, { idempotencyKey, idempotencyKeyTTL: '24h' })`. The `idempotencyKey` is built via `idempotencyKeys.create([ctx.orgId, ctx.user.id, dayBucket()])` (helper in the starter, returns the calendar-day string in the org's tz).
- Update the `exports` row with the returned `runId`. Return `{ ok: true, data: { runId } }`.
- Verify:
  - Click "Export invoices" for org A. The inspector run panel switches to the new `runId`, the dashboard shows one run with `status: completed`, payload `{ organizationId, requestedBy }`, the structured log line. Progress bar reads `0/?` — `pagesTotal` not set yet, that lands in lesson 4 of chapter 071.
  - Click "Export invoices" twice in quick succession. The second click's `startExport` returns the same `runId` (idempotency-key short-circuit at trigger boundary). The `exports` table shows one row. The dashboard shows one run.
  - Use the Trigger.dev dashboard's "Run task" tool to fire `export-invoices` with `{ organizationId: 'not-a-uuid' }`. The dashboard immediately shows the run failed at the schema-parse boundary with a Zod error; the body never executed. Names the rule: `schemaTask` validates before retries are spent.
  - Click "Trigger 2 parallel exports for this org" (debug, which bypasses the natural daily key by injecting a synthetic `idempotencyKey` suffix). Two runs appear. The first is `executing`, the second is `queued`. After the first completes, the second transitions to `executing`. Names the per-org serialization proof — fully demonstrated even before the body does real work.
  - Click "Trigger 3 parallel exports across orgs". All three transition to `executing` within ~1s. The dashboard shows three distinct dynamic queues.

Senior calls and watch-outs:

- The `queue:` callback receives `payload`, parsed; the function shape is structural. Static queues would put `queue: { name: 'exports', concurrencyLimit: 5 }`; the per-tenant dynamic shape is the v4-native pattern from lesson 4 of chapter 070. Copy-pasting v3 examples that declare queues at trigger time (`tasks.trigger('export-invoices', payload, { queue: {...} })`) will not work in v4 — names the v3-to-v4 break once more.
- The `concurrencyLimit: 1` per dynamic queue is the back-pressure choice — the export is read-heavy, one-at-a-time per org keeps the DB pool friendly. Doubling to 2 would let two concurrent exports per org run; the senior call is "stay at 1 unless a specific tenant repeatedly stacks up."
- `tasks.trigger` is called from a Server Action — this is the correct shape (fire-and-forget, action returns immediately). Calling `tasks.triggerAndWait` from a Server Action would block the request until the run completes and time out — the inverted-model failure mode named in lesson 4 of chapter 070. The lesson restates the rule.
- The `idempotencyKey` on `tasks.trigger` lives at the trigger boundary; the cross-step keys land in lesson 4 of chapter 071. Two different shapes, same discipline (lesson 5 of chapter 070).
- The `dayBucket()` helper is intentional — the natural-key shape `(orgId, userId, day)` means a user who hits Export twice on the same calendar day gets one run; a user who hits it next day gets a new run (and yesterday's `exports` row carries its own key, still unique). The debug button injects a `:debug:<random>` suffix to bypass for proof-of-serialization tests.
- The `exports` row write happens *before* `tasks.trigger`, but the `runId` is only known after. The row is inserted with `runId: null` first and updated immediately after the trigger returns. Names the small two-step write; production hardening would wrap both in a transaction and accept the rare orphan-row-on-trigger-failure (Trigger.dev's API throws on failure, the catch-and-cleanup is named, not built).
- `authedAction('member', ...)` — the role is `member`, not `admin`. Exports are a member-level capability per the SaaS norms (chapter 061); the role-pinning here is the structural enforcement.

Codebase state at entry: empty task, empty action.
Codebase state at exit: `export-invoices` task fires end-to-end with a placeholder body, the per-org dynamic queue serializes correctly, schema validation rejects malformed payloads at the boundary, the inspector's idempotency-key short-circuit works, parallel-across-orgs runs in parallel. The body does no real work yet — that lands in lesson 4 of chapter 071. **Runnable.**

Estimated student time: 45 to 55 minutes.

---

## Lesson 4 — One checkpoint per page

Spawn each page as a `paginatePage.triggerAndWait` child with `${ctx.run.id}:page:N` keys, drive progress through `metadata.set`, and abort permanently on empty resultsets with `AbortTaskRunError`.

Goals:

- Write `trigger/paginate-page.ts` as its own `schemaTask` per the reference signature. Payload: `{ organizationId, page, cursor }`. Body: call `listInvoices({ orgId: organizationId, view: 'active', cursor, pageSize: 500 })`, pipe rows through `rowsToCsv`, return `{ csv, nextCursor, rowCount }`. The function is short (10 lines); the senior value is "every page is its own checkpointed child run."
- Grow the `exportInvoices` body to drive the page loop:
  - Read the page count: `const { total } = await tenantDb(organizationId).invoices.countAll()` (helper provided), then `const pagesTotal = Math.ceil(total / 500)`. Throw `new AbortTaskRunError('EMPTY_RESULTSET')` if `total === 0` — names the permanent-failure-no-retry shape from lesson 5 of chapter 070.
  - Write `metadata.set('pagesTotal', pagesTotal)` and `metadata.set('pagesDone', 0)` — the inspector's progress bar reads these.
  - Loop pages 0 to `pagesTotal - 1`: `const { csv, nextCursor } = await paginatePage.triggerAndWait({ organizationId, page, cursor }, { idempotencyKey: \`${ctx.run.id}:page:${page}\` })`. Append `csv` to an accumulator string. Update `cursor = nextCursor`. `metadata.set('pagesDone', page + 1)`.
  - After the loop, `console.log` the CSV size and a placeholder URL (`https://example.com/exports/${ctx.run.id}.csv`) — the real upload to R2 lands in chapter 073. Store the URL on `metadata.set('downloadUrl', url)` so the inspector picks it up and so the next lesson (lesson 5 of chapter 071) can pass it to the email step.
- Verify:
  - Click "Export invoices" for org A (200+ seeded invoices, ~5-7 pages at limit 500). The inspector progress bar advances `0/N → 1/N → 2/N → ... → N/N` over ~10-20s; the dashboard shows N child `paginate-page` runs, each with payload + output, parented under the export run.
  - **Kill-resume drill:** start an export. When the panel shows `pagesDone: 2 / 7`, hit Ctrl-C in the `pnpm trigger:dev` terminal. Wait 5s. Re-run `pnpm trigger:dev`. The inspector resumes; the dashboard shows the parent run picked up after the failed worker, the previously-completed `paginate-page` child runs were not re-executed (idempotency-key cache hit returned the prior outputs), pages 3 onward execute fresh. Final state: `completed` with the same `runId`. **This is the durability proof of the chapter.**
  - Trigger an export against an empty-data org (use a debug button that creates an empty fourth org). The body throws `AbortTaskRunError('EMPTY_RESULTSET')`; the dashboard shows the run failed once with no retry attempts. Names the senior call.
- (Optional senior reach.) Inspect the dashboard to confirm one `paginate-page` child's `idempotencyKey` is exactly `${parent.id}:page:0`; restart the parent (force a retry by throwing transient error inside a synthetic debug path) and confirm the same key returns the cached output rather than re-executing.

Senior calls and watch-outs:

- Every `triggerAndWait` is a durable checkpoint (lesson 5 of chapter 070). A 7-page export has 7 checkpoints; a crash between pages 3 and 4 resumes at page 4, not page 0. Restarting the parent run re-issues the same idempotency keys; the runtime returns prior results for completed children instead of re-executing. This is the load-bearing pattern of the chapter.
- The cross-step key shape is `${ctx.run.id}:page:${page}`. Using `${page}` alone (no `ctx.run.id` prefix) would collide across runs — every export would return the first export's page-0 result. Using `Date.now()` would break the cache on retry. The lesson shows the broken shape and the fix.
- `AbortTaskRunError` is the only "stop retrying" signal. A naked `throw new Error('empty')` would retry three times (the configured `maxAttempts`) before failing; the empty-resultset case is permanent on the same inputs, so wasted retries cost runtime and dashboard noise. Names the rule from lesson 5 of chapter 070: `AbortTaskRunError` for permanents, plain throws for transients.
- `listInvoices` uses cursor pagination (from chapter 066); the cursor is the natural restart point. If a row is inserted between pages 3 and 4, the page-4 cursor still covers it correctly (cursor-keyed reads are stable across writes). The lesson restates the rule from chapter 042 once.
- Accumulating CSV strings in memory across pages is bounded by `pagesTotal × 500 × avg-row-size`. For the project's seed (~200 invoices), the accumulator fits in a few MB; for a production org of 100k+ invoices, this would need a streaming write to R2 inside each page's child task. Names the threshold and points to chapter 073 for the real upload.
- The `metadata.set` channel is "fire and forget" — the runtime persists it, the dashboard renders it, the inspector reads it. Setting `pagesDone` from the parent run, not from the child, is intentional — the parent's view of progress is the user-facing one.
- The body is `async function` and uses `await` throughout — `tasks.triggerAndWait`-inside-loop is the durable parallel-or-sequential decision point. Sequential (`for...of` + `await`) is the safe default; parallel (`Promise.all` of `triggerAndWait`) would race the queue concurrency limit and reorder pages — the senior call is "sequential unless the rows-by-page have no order requirement and concurrency is fine to consume."
- Forgetting `metadata.set('pagesDone', ...)` is the common bug — the inspector still completes correctly but the progress bar stays at zero. The lesson names the symptom and the fix.

Codebase state at entry: skeleton task, empty page child task.
Codebase state at exit: full paginated body, runs progress through all pages, kill-resume drill resumes cleanly, empty-resultset orgs abort without retries, the `metadata.downloadUrl` is a `console.log`-shaped placeholder. The email step is empty. **Runnable.**

Estimated student time: 60 to 75 minutes. The chapter's heaviest lesson — the durability proof lives here.

---

## Lesson 5 — Send the email, write the audit log

Add the `sendExportEmail` child task guarded by a `${ctx.run.id}:email` key, then close the parent run by updating the `exports` row and writing `export.invoices.completed` to `audit_logs` in one tenant transaction.

Goals:

- Write `trigger/send-export-email.ts` as the third `schemaTask`. Payload: `{ organizationId, recipientUserId, rowCount, downloadUrl }`. Body: read the org name and the recipient email via `tenantDb(organizationId)` (read-only), render `ExportReadyEmail({ orgName, rowCount, downloadUrl })`, call `sendEmail({ to: recipientEmail, subject: \`Your ${orgName} export is ready\`, react: <ExportReadyEmail .../>, idempotencyKey: \`export-email:${ctx.run.id}\` })` from the Unit 8 adapter, return `{ id }`.
- Add the final step to the parent task body: after the page loop, `const downloadUrl = ...`, then `await sendExportEmail.triggerAndWait({ organizationId, recipientUserId: requestedBy, rowCount: totalRows, downloadUrl }, { idempotencyKey: \`${ctx.run.id}:email\` })`. The per-run email idempotency key guards the send across parent retries.
- Open a `tenantDb(organizationId).transaction` and: update the `exports` row to `status: 'completed', completedAt: now()`, write `audit_logs` `{ action: 'export.invoices.completed', subjectType: 'export', subjectId: ctx.run.id, actorUserId: requestedBy, orgId: organizationId, payload: { runId: ctx.run.id, rowCount } }` via `logAudit(tx, ...)`. Return `{ ok: true, runId: ctx.run.id, rowCount }` from the parent body.
- Verify:
  - Run a full export against org A. The progress bar runs to completion; the inspector's run panel flips to `status: completed` with the `downloadUrl` rendered; the audit-log tail gains one row; the student's Resend-verified inbox receives the `ExportReadyEmail` render within ~10 seconds (Resend's typical p99).
  - Force a parent retry (use the dashboard's "Replay run" or a debug button that throws a transient error after `sendExportEmail.triggerAndWait` returns). The parent retries; the email child task's `triggerAndWait` returns the cached `{ id }` from the idempotency-key cache; no second email is sent. The structured log inside the email child shows "cached return, did not call Resend." Names the proof.
  - Confirm the email lands once even when the parent retries — the idempotency-key short-circuit lives at the child-task boundary, the email send happens exactly once per parent run.
  - Confirm a Resend suppression on the recipient (use the seeded suppression row from chapter 054 — temporarily move the seeded user's email into the suppression list) returns an `err('suppressed', ...)` Result (i.e. `{ ok: false, error: { code: 'suppressed', ... } }`) from `sendEmail`; the email child task returns the suppressed result, the parent run still completes (the suppressed-recipient case is not a failure), the audit-log notes the suppression.

Senior calls and watch-outs:

- The email step is a child task, not inline in the parent body, for two reasons: (1) durability — a Resend transient failure retries with backoff via the child's own retry policy; (2) idempotency — the per-step key `${ctx.run.id}:email` guards against parent retries re-issuing the send. Inlining the `sendEmail` call in the parent body would lose both; the lesson shows the inline-shaped wrong version and the child-task right version.
- The audit-log write lives inside a `tenantDb` transaction in the parent body, *after* the email returns. Writing the audit log before the email risks claiming "completed" when the email never sent; writing after gives at-least-once "we sent the email and audited it" semantics. The senior call is "audit the user-facing outcome, not the intent."
- The email payload carries `downloadUrl` from the parent's `metadata.downloadUrl`, not a re-derivation. The parent owns the URL; the child consumes it. Forecasts chapter 073 where the URL becomes a real R2 presigned link.
- The Resend suppression path is named explicitly so the student sees how an "expected failure" composes with Trigger.dev — the child task does not throw on suppression, it returns the suppressed Result; the parent treats the run as completed-but-skipped-email. A different choice (throw on suppression to surface in the dashboard) is named as alternative.
- The `recipientUserId` is `requestedBy` from the original payload — the user who clicked Export gets the email. A future variant (email the org owner regardless of who triggered) is named, not implemented. The senior call is "default to the triggering user; allow an override at the action level."
- The structured log inside the email child shows `messageId`, `to` (hashed in production), and `disposition`. The lesson restates the 3am-rule discipline from chapter 084: useful enough to debug, no PII.

Codebase state at entry: page loop runs, no email.
Codebase state at exit: full end-to-end run — Server Action triggers parent, parent loops paginate-page children, parent loops sendExportEmail child, parent updates `exports` row + writes audit log, inspector reflects every state. Email lands in inbox. **Runnable end-to-end.**

Estimated student time: 45 to 60 minutes.

---

## Lesson 6 — Verify: progress, kill-resume, serialization, exactly-once email

Walk each "Done when" clause clause-by-clause: visible per-page progress, the Ctrl-C kill-resume drill, per-org serialization vs. cross-org parallelism, schema-boundary validation, and email-send-once across parent retries.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- Visible run progress:
  - Click "Export invoices" for org A. The inspector run panel polling cycle (every 1s) shows status `queued → executing`, progress bar advancing `1/N → ... → N/N`, then `executing → completed`. The Trigger.dev dashboard deep-link shows the parent run with N `paginate-page` children + 1 `send-export-email` child, each with payload, output, and duration. Confirm the audit-log tail gained one `export.invoices.completed` row.
- Mid-run kill resumes:
  - Trigger an export against org B. When the inspector shows `pagesDone: 2 / 7`, Ctrl-C the `pnpm trigger:dev` terminal. The dashboard shows the parent run paused (no active worker). Restart `pnpm trigger:dev`. Within 5-10s, the parent run picks up on the new worker, pages 3-7 execute fresh, the email child sends, final state `completed`. The `runId` is unchanged. Confirm one row in `audit_logs`, one row in `exports`, one email in inbox. **The chapter's load-bearing proof — every paginate-page child completed before the kill returned its cached output from the idempotency-key cache; no row was double-counted.**
- Per-org queue serialization:
  - Click "Trigger 2 parallel exports for this org" (debug bypass of the daily key). Two runs appear in the panel list; the first is `executing`, the second is `queued`. Wait. When the first hits `completed`, the second transitions `queued → executing`. The dashboard shows both runs on the same dynamic queue `org-<id>` with `concurrency: 1`.
- Across-org parallelism:
  - Click "Trigger 3 parallel exports across orgs". All three transition to `executing` within ~1s. The dashboard shows three distinct dynamic queues. All three complete in roughly the same wall-clock window — proves the per-org queue is per-org, not global.
- Idempotency-key short-circuit:
  - Click "Export invoices" twice in quick succession (no debug). The second click's `startExport` returns the same `runId` as the first; the inspector shows one run, not two; the `exports` table shows one row. The `tasks.trigger` idempotency-key short-circuit happens at the SDK boundary, before any task runs.
  - Wait until the next calendar day (or change the system clock for the test); click "Export invoices" again. A new `runId` returns, a new `exports` row lands. The day-bucket scope of the key is the lifetime control.
- Payload validation:
  - Use the Trigger.dev dashboard's "Run task" tool to fire `export-invoices` with `{ organizationId: 'not-a-uuid', requestedBy: 'also-not' }`. The dashboard immediately shows the run failed at the schema-parse boundary; the body never executed; no `paginate-page` child runs spawned; no `exports` row appears. Names the rule from lesson 4 of chapter 070: `schemaTask` validates *before* retries are spent.
- Permanent-failure shape:
  - Trigger an export against the empty fourth org (debug). The body throws `AbortTaskRunError('EMPTY_RESULTSET')`; the dashboard shows one attempt, no retries, status `failed`. No email is sent. No audit-log row is written. The `exports` row sits at `status: 'failed'`. Contrast: throw a plain `Error` in the same path and watch three retries fire before failure.
- Email idempotency:
  - Force a parent retry after the email step (debug button injects a transient throw at the very end of the parent body). The parent retries; the email child's `triggerAndWait` returns the cached `messageId` from the idempotency-key cache; no second email lands in the inbox. The structured log on the cached return shows "from cache, did not call Resend."
- Cross-tenant defense:
  - Click Export as a member of org A. The action's `authedAction('member', ...)` reads `ctx.orgId` from the session — there is no way to pass a different org from the action's call site. Try fabricating a `tasks.trigger` call from the dashboard's "Run task" tool with `organizationId` pointing at org B: the task runs (Trigger.dev does not enforce app tenancy), so the lesson names the structural defense — the body trusts the payload (no choice in a worker context), the only entry point that takes user input is `startExport`, and `authedAction` is the boundary. Trigger.dev's project is treated as a privileged service inside the trust boundary; the dashboard's "Run task" UI is admin-only and the senior call is "rotate `TRIGGER_SECRET_KEY` like any privileged secret."
- Forward references the chapter project hands off:
  - **Unit 13b (R2 upload, chapter 073):** the parent body's `console.log`-shaped `downloadUrl` becomes a real R2 presigned PUT; the `paginate-page` child task pipes its CSV directly to R2 via the presigned URL; the email's `downloadUrl` is the matching presigned GET. The `metadata.downloadUrl` channel stays unchanged.
  - **Unit 14 (notifications):** the `export.invoices.completed` audit log fires the notification dispatcher (one event, the dispatcher fans out to email-or-inbox-or-both per user preferences). The current direct `sendExportEmail` child task becomes redundant; the dispatcher owns the channel choice.
  - **Unit 15a (cache):** the inspector's `exports` list reads (`use cache` + `cacheTag('exports', orgId)`) gets `updateTag('exports', orgId)` from the parent task after every completion; the user's next visit shows fresh state without a hand-rolled refresh.
  - **Unit 15b (rate limit):** `startExport` gets wrapped in an Upstash limiter (`5 per user per hour`) so a misbehaving client cannot fill the dynamic queue with synthetic-key debug runs.
  - **Stripe reconciliation (12 forward note):** the per-org dynamic queue shape lifts directly — `org-reconcile-${organizationId}` with `concurrency: 1`, a nightly `schedules.task` cron triggers one run per org, the body reads `subscriptions.list` and reconciles drift against `plan_entitlements`.
- Name the senior calls one more time:
  - The task body has no request context — payload carries `organizationId`, `tenantDb(orgId)` re-derives.
  - `schemaTask` validates before retries — invalid payloads fail at the boundary, not three minutes in.
  - Dynamic per-tenant queues serialize within an org and parallelize across orgs.
  - Durability lives at `triggerAndWait` boundaries — every page is a checkpoint.
  - Cross-step idempotency keys (`${ctx.run.id}:step:identifier`) guard side effects against parent retries.
  - `AbortTaskRunError` is for permanents only; plain throws are for transients.
  - `run.metadata` is the live-progress channel for the watching client.
  - `tasks.trigger` (fire-and-forget) is for app-side calls; `tasks.triggerAndWait` (durable wait) is for in-task children.

Senior calls and watch-outs:

- The verify lesson rehearses each failure mode and names what would break without the disciplines installed. If a verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- The kill-resume drill is the chapter's headline proof — running it slowly enough to actually time the Ctrl-C in the middle of a page is the senior call. Killing during a `paginate-page` body (not between pages) is also durable but resumes by re-executing that one page (the cache miss is at the in-flight child, not the parent boundary).
- Running the parallel-across-orgs proof needs all three orgs seeded — the lesson confirms the seed populated three distinct orgs each with 200+ invoices.

Codebase state at entry: full export job wired (parent + page child + email child + audit log).
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (payload validation, dynamic per-tenant queues, `triggerAndWait` durability, cross-step idempotency keys, `AbortTaskRunError`, `metadata`-driven live progress, fire-and-forget action-side triggers) and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.
