## Concept 1 — The shape of a durable job

**Why it's hard.** A student arriving from 13.1 has the primitives in hand but not yet a picture of how they compose into one end-to-end durable job. The instinct is to imagine the export "running" the way a Server Action runs — one process, one call stack, one request scope. The chapter's whole architecture (Server Action fire-and-forget → parent task → per-page children → email child → audit log inside the same tenant transaction) breaks if the student doesn't internalize the boundary lines: where the request ends, where the worker picks up, what crosses, what doesn't.

**Ideal teaching artifact.** A *Concept* archetype delivered as a single annotated anatomy of the export job, scrubbed across three phases. Phase 1: the request — the inspector POSTs to `startExport`, `authedAction` runs, `tasks.trigger` returns a `runId` in milliseconds, the response goes back, the request scope dies. Phase 2: the worker — the Trigger.dev runtime picks up the queued parent run on a worker process with no inbound HTTP, no session, no `cookies()`, only the validated payload; the parent loops `paginatePage.triggerAndWait` per page, each one its own child run on the runtime; the email child sends; the parent writes the audit log inside `tenantDb(orgId).transaction`. Phase 3: the observer — the inspector's polling `GET /api/exports/[runId]` reads structural state through the REST API, never logs. The annotations name every primitive at its place: `schemaTask`, dynamic queue, `triggerAndWait`, `metadata.set`, `tenantDb`. The visual is the chapter's load-bearing mental model and every later concept slots into a labeled box on this diagram.

**Engagement.** A `Buckets` sort immediately after — twelve labeled responsibilities (validate payload, write audit row, render React Email, call Resend, read invoices page, write `pagesDone` to metadata, return `runId` to the user, hold the user session, read `cookies()`, retry the Resend call on transient failure, decide the queue name from `organizationId`, parse the URL query string) into three columns: "request-time (Server Action)", "worker-time (task body)", "neither — would be a bug here." The distractors are the bugs the worker-side instinct would make (reading `cookies()` from the task, retrying Resend by hand instead of via the child task's retry policy).

**Components.**
- `Figure` wrapping a hand-authored SVG of the three-phase anatomy with annotation callouts. Single-frame static — no bespoke component needed.
- `Buckets` for the sort.

---

## Concept 2 — No request context in the body

**Why it's hard.** The Server Action world taught the student that `ctx.orgId`, `cookies()`, and `headers()` are "just there" because the framework wires them. A task body is a different runtime — it has no HTTP, no session, no cookies, no `headers()` adapter. Forgetting this is the failure mode that makes a student reach for `auth.api.getSession({ headers: await headers() })` inside a task and watch it return `null` in production. The fix is structural: the payload carries `organizationId` and the body re-derives tenancy with `tenantDb(orgId)`.

**Ideal teaching artifact.** A *Pattern* archetype shaped as a side-by-side `CodeVariants` with two tabs, both compiling. Left tab — the wrong shape: a task body that calls `auth.api.getSession({ headers: await headers() })`, reads `session.activeOrganizationId`, and proceeds. The prose names the failure: `headers()` resolves to an empty bag at worker time, `getSession` returns `null`, the body throws a null-deref three minutes into the run after the page-0 read landed. Right tab — the right shape: `schemaTask` payload declares `organizationId: z.uuid()`, the body destructures it, calls `tenantDb(organizationId)` directly, never touches the auth subsystem. The two tabs visualize the inversion: in a Server Action, identity *flows from the request*; in a task, identity *travels on the payload*.

**Engagement.** A `MultipleChoice` immediately after: "The task body re-derives tenancy with `tenantDb(organizationId)` because (a) Trigger.dev doesn't ship a Better Auth adapter, (b) the worker has no request scope so no session-read primitive applies, (c) calling `getSession()` inside a task is a tenancy bug regardless of whether it returned a value, (d) tasks are stateless." Two correct (b, c) flip it to multi-select.

**Components.**
- `CodeVariants` with the two tabs (wrong shape, right shape).
- `MultipleChoice` for the recall.

**Project link.** Every task body in this chapter — `exportInvoices`, `paginatePage`, `sendExportEmail` — re-derives the tenant DB from `organizationId` carried on the payload.

---

## Concept 3 — `schemaTask` validates at the boundary, before retries burn

**Why it's hard.** Validation-inside-body is the natural shape a student writes — it works locally, the tests pass, and the cost is invisible until production. The cost surfaces in two places: a malformed payload retries three times with exponential backoff (waste runtime, dashboard noise, paging fatigue) before failing on the same Zod error each time; and a partial side-effect can fire between the body's first line and the validation line. `schemaTask` moves the parse to the trigger boundary where invalid payloads fail *before any attempt is counted*.

**Ideal teaching artifact.** A *Mechanics* archetype delivered as a `DiagramSequence` with three frames. Frame 1: validation inside the body — the dashboard shows attempt 1 of 3 firing 1s after trigger, body line 1 logs "starting export," line 2 throws the Zod error; attempt 2 fires 2s later, same shape; attempt 3 fires 4s later, same shape; final state failed with three identical error traces. Frame 2: validation at the boundary via `schemaTask` — the dashboard shows the run failing immediately with `status: failed, attempts: 0`, the body never executed, no side-effect logs. Frame 3: the same `schemaTask` with a *valid* payload — the body runs once with parsed-and-typed `organizationId: string`, no defensive `safeParse` inside the body. The student sees the three retries the wrong shape wastes and the zero retries the right shape needs.

**Engagement.** A `Tokens` exercise on the `schemaTask({ id, schema, queue, retry, run })` call site. The student clicks the fields that "validate before retries burn" (`schema`), the field that "decides where the run executes" (`queue`), the field that "controls how many retries fire on transient failures" (`retry`), with decoy clicks on `id` and on positions inside the `run:` arrow body.

**Components.**
- `DiagramSequence` with three hand-authored SVG frames inside `Figure` wrappers — each frame is the Trigger.dev dashboard run-detail view with attempt count + body trace.
- `Tokens` on the `schemaTask` call signature.

---

## Concept 4 — `tasks.trigger` vs `tasks.triggerAndWait`: which from where

**Why it's hard.** Two functions with similar names do opposite things in opposite contexts. `tasks.trigger` fires from app code (Server Action, route handler) and returns a `runId` in milliseconds — the request continues, the user gets a response, the task runs later. `tasks.triggerAndWait` fires from inside another task and blocks the parent until the child returns — durable wait, durable result, durable retry on transient failure. The inverted-model trap is calling `tasks.triggerAndWait` from a Server Action: the request blocks until the run completes, hits the Vercel function timeout, returns a 504, but the run keeps going on the worker and eventually completes anyway. The student sees a broken UI and a successful dashboard run and has no model for why.

**Ideal teaching artifact.** A *Decision* archetype delivered as a 2×2 matrix inside `Figure`: rows are call-site contexts ("from a Server Action / route handler / `after()` body" vs. "from inside a task body"); columns are the two API choices (`trigger` / `triggerAndWait`). Three cells are correct in different ways, one cell is the trap. Each cell shows: what the call does, what the caller sees, what the run dashboard shows. The trap cell (Server Action × `triggerAndWait`) is annotated with the 504 timeout symptom and the orphaned-completion behavior. A second beat — a one-line decision rule lives below the matrix: "from app code → `trigger`; from a task body → `triggerAndWait`."

**Engagement.** A `Matching` exercise: four call-site contexts ("the `startExport` Server Action firing the parent task," "the parent body looping per page," "the parent body sending the email," "an admin debug script firing a single run from the CLI") paired with the right API choice (`trigger` / `triggerAndWait`). The fifth distractor row is "a React component effect firing on mount" — correctly paired with "neither, this is a client and tasks can only be triggered from server contexts."

**Components.**
- `Figure` wrapping a hand-authored 2×2 matrix SVG with the trap cell visually marked.
- `Matching` for the call-site-to-API pairing.

---

## Concept 5 — Dynamic per-tenant queues: serialize within, parallelize across

**Why it's hard.** Static queues are the v3 shape and every search result still teaches them; v4 wants queues declared in code, and the SaaS shape wants them declared *dynamically per tenant*. The pattern fights two simultaneous instincts: "one big queue with concurrency 5" (the static-queue reflex, which means one noisy tenant starves the rest), and "no queue, let the runtime parallelize everything" (the unbounded-concurrency reflex, which blows up the DB pool). The senior shape — one queue per `organizationId`, concurrency 1 inside each queue, unbounded across queues — is invisible until the student sees the noisy-neighbor failure mode.

**Ideal teaching artifact.** A *Concept* archetype delivered as an interactive simulator inside the chapter — three "tenants" (Org A, B, C), a button to "submit an export job" for each, and a visualization of the queue layout. Three modes the student toggles: (1) "static queue, concurrency 1" — every submitted job lines up in a single queue, Org B's job waits behind Org A's even though they share nothing; (2) "static queue, concurrency 5" — five jobs run in parallel but a single tenant can hog all 5 slots; (3) "dynamic queue per org, concurrency 1 each" — Org A's jobs serialize within A, Org B's jobs serialize within B, A and B run in parallel. The student submits jobs and watches the queue swimlanes fill, waits, and drain in each mode. The visual makes the noisy-neighbor problem concrete and the dynamic-queue fix obvious.

**Engagement.** The simulator's mode-3 round is the assessment — the student must produce a state where Org A has two queued jobs (one running, one waiting) while Org B and C are both running fresh jobs, all three orgs progressing independently. Follow-up beat: a `MultipleChoice` "an org with a runaway export loop submits 50 jobs in a minute. Under the dynamic per-org queue with concurrency 1, what happens?" with four options exercising "all 50 run in parallel," "all 50 queue behind each other in that org's queue, other orgs unaffected," "the runtime caps at 5 and rejects the rest," "other orgs' queues also slow down."

**Components.**
- New bespoke component `<QueueSimulator>` — see proposals. Renders three swimlanes (one per org), a per-mode toggle, "submit job" buttons, and animated job tokens that flow through the queue and drain. The dynamic-queue mode visualizes the per-tenant fan-out.
- `MultipleChoice` for the follow-up.

**Project link.** The exported `exportInvoices` task declares its queue as `({ payload }) => ({ name: \`org-${payload.organizationId}\`, concurrencyLimit: 1 })` — the load-bearing pattern this concept teaches.

---

## Concept 6 — Two idempotency keys, two jobs

**Why it's hard.** `idempotencyKey` shows up twice in this chapter with two completely different roles, and the student needs to hold both shapes in mind without conflating them. At the trigger boundary (the Server Action firing the parent), the key is a *business natural key* — `(orgId, userId, dayBucket)` — so two clicks of the Export button on the same calendar day collapse to one run. At the cross-step boundary (the parent firing a child page or the email), the key is a *cross-step identifier* — `${ctx.run.id}:page:N` or `${ctx.run.id}:email` — so a parent retry returns the cached child result instead of re-executing. The same primitive, two distinct teaching shapes; the student must learn which key shape lives at which boundary and why.

**Ideal teaching artifact.** A *Pattern* archetype delivered as a two-row decision table inside `Figure`. Row 1: trigger-boundary key — example `idempotencyKeys.create([orgId, userId, dayBucket()])`, scope "user-facing dedup window," TTL "24h to match the day bucket," what it prevents "two clicks of Export becoming two parallel runs." Row 2: cross-step key — example `${ctx.run.id}:page:${page}`, scope "this run's retries only," TTL "default (run lifetime)," what it prevents "a parent retry re-issuing the same child run and re-executing completed work." Below the table, a single anti-shape: `${page}` alone (no `ctx.run.id` prefix) — what breaks: every export collides on the first export's cached output. A second anti-shape: `Date.now()` as the key suffix — what breaks: the retry cache misses because the key changed.

**Engagement.** A `Dropdowns` exercise: the student fills in the key expression at four call sites — `tasks.trigger` from `startExport` (answer: `idempotencyKeys.create([orgId, userId, dayBucket()])`), `paginatePage.triggerAndWait` from the parent body (answer: `\`${ctx.run.id}:page:${page}\``), `sendExportEmail.triggerAndWait` from the parent body (answer: `\`${ctx.run.id}:email\``), and a debug call site that *intentionally bypasses* the daily dedup (answer: a synthetic suffix `:debug:${crypto.randomUUID()}`). Each dropdown shows the correct shape and at least two plausible wrong shapes (the anti-shapes from above).

**Components.**
- `Figure` wrapping a hand-authored two-row decision table comparing the trigger-boundary and cross-step key shapes, with the two anti-shapes annotated below.
- `Dropdowns` for the four-call-site fill-in.

---

## Concept 7 — One checkpoint per page: durability lives at `triggerAndWait`

**Why it's hard.** "Durable execution" sounds like magic until the student has to point at where, mechanically, the durability lives. The answer is structural: every `triggerAndWait` is a persisted checkpoint. The runtime records "parent at line X called child Y with payload Z and idempotency key K; child Y returned R." On a worker crash mid-run, the parent retries from the top — but every previously-completed child returns its cached result on the same key. The work between checkpoints (the body code between two `triggerAndWait` calls) re-executes; the work *inside* each completed child does not. Forgetting to make page reads their own child task (writing the page loop inline with `await listInvoices(...)` instead of `await paginatePage.triggerAndWait(...)`) means the kill-resume re-runs every page from zero.

**Ideal teaching artifact.** A *Concept* archetype with a paired second beat. First, an interactive timeline simulator: the student watches a 7-page export run, with each `triggerAndWait` checkpoint visualized as a save-point on a horizontal progress bar; a "Kill worker" button lets the student crash the run mid-execution; on restart, the simulator re-renders the parent's retry from the top, showing each already-completed page returning *cached* (greyed out, "from idempotency-key cache") while the next page runs fresh. The student kills mid-page-3, restarts, sees pages 0-2 cache-hit in milliseconds and page 3 onward execute. Then the student toggles to the "no checkpoints" mode — the page loop runs as inline `await` calls inside the parent body — and watches the same kill-resume re-execute every page from zero. The visual makes the checkpoint geometry tactile.

Second beat — the kill-resume drill itself in the real codebase, as 13.2.4 specifies: trigger a real export, watch the inspector show `pagesDone: 2/7`, hit Ctrl-C in the `pnpm trigger:dev` terminal, restart, watch the dashboard show pages 3-7 execute on the new worker while pages 0-2 sit cached on the parent's retry. The simulator builds the model; the real drill ratifies it.

**Engagement.** A `Sequence` exercise after the simulator — the student orders six events to describe what happens on a mid-page-3 kill: (1) parent's retry begins, (2) parent re-issues `triggerAndWait` for page 0 with the same key, (3) the runtime returns the cached page-0 result without re-executing, (4) parent re-issues for pages 1-2, also cached, (5) parent re-issues for page 3 — key cache miss, page-3 child runs fresh, (6) page-3 result lands, parent continues with page 4. Decoys include "parent restarts from page 4 directly" (wrong — the parent always retries from the top) and "the runtime replays the parent's variables from before the crash" (wrong — only `triggerAndWait` results are durable, not body locals).

**Components.**
- New bespoke component `<CheckpointTimeline>` — see proposals. Renders a horizontal page-bar with save-point markers at each `triggerAndWait` boundary, animated execution flow, a "Kill worker" button, and a mode toggle between "checkpointed (right shape)" and "inline (wrong shape)."
- `Sequence` for the post-simulator ordering drill.

**Project link.** This concept *is* the chapter's headline proof — the kill-resume drill in 13.2.4 and 13.2.6 is the demonstration the student carries into every later durable job.

---

## Concept 8 — `AbortTaskRunError` vs plain throws: permanents and transients

**Why it's hard.** "Throw to fail" is one of the deepest reflexes in JavaScript, and Trigger.dev's retry policy weaponizes it — a plain `throw new Error('empty resultset')` retries three times with exponential backoff before failing, wasting wall-clock and creating dashboard noise on a failure that will never recover. The student needs to distinguish *transient* (network blip, DB hiccup, Resend 503) from *permanent* (the input is empty, the plan is unknown, the row was deleted) and reach for the right primitive: plain `throw` for transients (let the retry policy do its work), `AbortTaskRunError` for permanents (fail once, do not retry).

**Ideal teaching artifact.** A *Decision* archetype delivered as a two-column comparison inside `Figure`. Left column — transient failure (a Resend 503): plain `throw`, the runtime retries with the configured `retry: { maxAttempts: 3, factor: 1.8, randomize: true }`, the second or third attempt succeeds, the dashboard shows three attempts and final state `completed`. Right column — permanent failure (`EMPTY_RESULTSET`): `throw new AbortTaskRunError('EMPTY_RESULTSET')`, the runtime fails immediately with `attempts: 1`, no retry fires, the dashboard shows one attempt and final state `failed`. Below the columns, a decision rule: "if a different input would succeed → transient, throw plain; if the same input will always fail → permanent, throw `AbortTaskRunError`." A third row shows the wrong shape: a permanent failure thrown plain — three wasted retries, same Zod error every time, three pager rings on dashboard alerts that fire on attempt count.

**Engagement.** A `Buckets` sort with two columns ("plain throw — let the retry policy work" / "`AbortTaskRunError` — fail once, do not retry"). Items: ten realistic failure causes — empty resultset, Resend 503, Postgres connection reset, unknown plan code, malformed UUID (this would have been caught by `schemaTask` but the student must reason it through), DNS timeout to Resend, R2 `AccessDenied` (permanent), R2 `InternalError` (transient), `OrganizationDeletedError` (permanent), and a generic `fetch` failure with no body (transient).

**Components.**
- `Figure` wrapping a hand-authored two-column comparison with the wrong-shape row annotated below. Single-frame static.
- `Buckets` for the failure-cause sort.

---

## Concept 9 — `run.metadata` as the live-progress channel

**Why it's hard.** A task body has no direct line to the watching UI — no WebSocket, no callback. The student's instinct is to "log it" (write a `console.log` and let the inspector tail the logs) or "store it in a row" (write a `progress` column on `exports` and have the inspector poll the row). Both are wrong shapes in this runtime: log scraping is brittle and the chapter explicitly forbids it; row-polling creates a write storm during the page loop. The right shape is `run.metadata` — a mutable per-run KV that the runtime persists, the dashboard renders natively, and the REST API exposes via `runs.retrieve(runId).metadata`. The student needs to see that metadata is a *runtime-provided channel*, not a roll-your-own.

**Ideal teaching artifact.** A *Mechanics* archetype delivered as an annotated three-actor sequence diagram inside `Figure` (Mermaid `sequenceDiagram`): three actors are the parent task body, the Trigger.dev runtime, and the inspector page. The diagram walks one full export: the parent calls `metadata.set('pagesTotal', 7)` at the start; the runtime persists; the inspector polls `GET /api/exports/[runId]` every 1s, hits `runs.retrieve`, reads `metadata.pagesTotal` and renders "0 / 7"; the parent calls `metadata.set('pagesDone', 1)` after the first page; the runtime persists; the inspector's next poll renders "1 / 7"; the loop repeats; on the last page the parent calls `metadata.set('downloadUrl', url)`; the inspector reads it and renders the download link. The diagram makes the indirection visible — body writes, runtime stores, observer reads, never log-scraping.

**Engagement.** A `MultipleChoice` immediately after, multi-select: "`run.metadata` is the right channel for which of these?" with six options — (a) the live progress bar driving the inspector, (b) a structured log line "started page 3" for debugging, (c) the final download URL for the email child, (d) the recipient email address, (e) the parent's local accumulator string for the CSV, (f) the audit-log payload. Correct: a, c. The recipient email and CSV accumulator are body locals; the structured log goes to the logger; the audit-log payload is its own row.

**Components.**
- `Figure` wrapping a Mermaid `sequenceDiagram` with three actors and the annotated set/persist/read cycle.
- `MultipleChoice` (multi-select) for the recall.

**Project link.** The inspector's progress bar (`pagesDone / pagesTotal`) and the email child's `downloadUrl` both flow through `run.metadata` — without this channel the inspector cannot animate and the email cannot reference the URL.

---

## Concept 10 — Exactly-once email via a child task with `${ctx.run.id}:email`

**Why it's hard.** The student's natural shape is `await sendEmail(...)` inline at the end of the parent body. It works on the happy path. Under a parent retry — a transient failure thrown in the body *after* the email send — the inline shape re-sends the email on the retry, and the user receives two copies of the same export notification. The fix is structural: make the email send its own `triggerAndWait` child task guarded by `${ctx.run.id}:email`. On parent retry, the child's idempotency-key cache returns the prior `{ messageId }` without calling Resend, so the email lands exactly once per parent run regardless of how many parent attempts fire.

**Ideal teaching artifact.** A *Pattern* archetype shaped as a wrong-by-default sandbox the student repairs. The student is given a parent body that calls `await sendEmail(...)` inline at the end, plus a debug button that injects a transient throw immediately after the send returns. The student fires the export, watches the email arrive, watches the parent retry on the injected throw, watches the *second* email arrive in the inbox — two copies, same content, same `runId`. Then the student is shown the corrected shape: extract the send into `sendExportEmail` as its own `schemaTask`, call it via `triggerAndWait` with `idempotencyKey: \`${ctx.run.id}:email\``. The student reruns the same debug button — the parent retries, the child's `triggerAndWait` returns the cached `{ messageId }` from the prior attempt, no second email lands. The repair makes the cache mechanism tangible.

**Engagement.** The wrong-by-default repair is the assessment — the student must produce a single-email outcome under retry. Follow-up beat: a `TrueFalse` round with four statements — ("the cross-step idempotency key on the email child guards against parent retries re-sending" — true; "Resend has its own server-side idempotency, so the cross-step key is redundant" — false, Resend's idempotency window is different and the cross-step key is the structural defense; "if the cross-step key were `${page}` only, the email would still land once" — false, would collide across runs; "the email child task can be inlined as a function call as long as the function checks a `sent` flag in the DB" — false, that's a rebuild of what `idempotencyKey` does for free).

**Components.**
- The wrong-by-default sandbox uses the live codebase plus the debug button described in the chapter's inspector spec. No new component needed — the inspector and its debug controls are project-provided.
- `TrueFalse` for the follow-up round.

**Project link.** This concept lands the third primitive the parent body composes (parent → page children → email child → audit log) and produces the chapter's exactly-once email proof in the verify lesson.

---

## Concept 11 — Audit log inside the body's tenant transaction, after the side effect

**Why it's hard.** The instinct is to write the audit log "before, to be safe" or "in a separate transaction, to keep concerns clean" or "as a fire-and-forget after, for performance." All three are wrong for an export job. Before — the audit row says "completed" when the email never sent. Separate transaction — a crash between the email send and the audit write leaves a sent email with no audit trail. Fire-and-forget after — same orphan-mode, plus a window where the user receives the email and reloads the inspector and sees the export still showing `status: 'running'`. The senior shape is one transaction in the parent body that wraps the `exports` row update and the `audit_logs` insert, opened *after* the email child's `triggerAndWait` returns successfully, so the audit-log row is the proof the user-visible outcome happened.

**Ideal teaching artifact.** A *Pattern* archetype shaped as a four-row decision table inside `Figure`, each row a candidate placement of the audit-log write: (1) before the page loop, (2) before the email child, (3) in a separate transaction after the email, (4) inside one transaction with the `exports` row update, after the email child. Columns: "what state is the system in if the runtime crashes here," "what does the user see," "is the audit log truthful." Only row 4 lands all three columns correctly. Row 1's failure mode is the most counterintuitive — "audit says completed, email never sent" — and the column makes the asymmetry visible. The decision rule below: "audit the user-facing outcome, not the intent."

**Engagement.** A `Sequence` exercise — the student orders five operations inside the parent body's final step: (a) `sendExportEmail.triggerAndWait`, (b) open `tenantDb(orgId).transaction`, (c) update `exports` row with `status: 'completed'`, `completedAt`, (d) `logAudit(tx, { action: 'export.invoices.completed', ... })`, (e) commit. Two decoy steps: "log the audit row before opening the transaction" (placement bug) and "send the email inside the transaction" (transaction-spanning-IO bug — the email send is a network call that should never sit inside an open transaction).

**Components.**
- `Figure` wrapping a hand-authored four-row decision table with the truthful-vs-lying audit annotations.
- `Sequence` for the body-ordering drill.

**Project link.** Every completed export writes one `audit_logs` row inside the same transaction as the `exports` row update — the chapter's `export.invoices.completed` event is consumed by Unit 14's dispatcher and by 15.2's `cacheTag('exports', orgId)` updates.

---

## Concept 12 — State-based verification: read `runs.retrieve`, never tail logs

**Why it's hard.** The student's debug instinct is to tail logs — the `pnpm trigger:dev` terminal is right there, the lines stream, the temptation is to grep for "page 3 done" and call that verification. The chapter rules this out and the student needs to feel why: logs are unstructured strings that change shape across Trigger.dev versions, lose order under parallel execution, and break the moment a developer renames a log line. The senior shape is to read structured state through `runs.retrieve(runId)` — `status`, `attempts`, `metadata`, `output`, `error` — the same fields the dashboard renders, the same fields the inspector polls. State-based verification is the durable contract; log strings are the brittle one.

**Ideal teaching artifact.** A *Decision* archetype delivered as a side-by-side `CodeVariants` with two tabs, both ostensibly verifying that the export reached page 3. Left tab — log-grep verification: `pnpm trigger:dev 2>&1 | grep "page 3 done"`. Right tab — state-read verification: `await runs.retrieve(runId).then(r => r.metadata.pagesDone)`. Below each, a list of "what breaks this": for log-grep, log-line rename, log buffering under load, parallel pages logging out of order, log truncation; for `runs.retrieve`, a versioned REST contract with a typed return shape. The visual makes the brittleness asymmetry concrete.

**Engagement.** A `MultipleChoice` exercising the verify-lesson's "Done when" clauses: "to assert that the second of two parallel same-org exports was queued behind the first, you read (a) the `pnpm trigger:dev` terminal output for a 'queued' line, (b) `runs.retrieve(runId)` for each run and check the `status` field, (c) the `exports` table for the `status` column, (d) the dashboard UI." Correct: b. The `exports` table is the app-side reference, not the operational truth; the dashboard is the human-facing version of (b); the terminal is a log scrape.

**Components.**
- `CodeVariants` with the two verification approaches and the brittleness annotations below.
- `MultipleChoice` for the recall.

**Project link.** The inspector's run-status panel and every verify-lesson assertion read through `lib/trigger-client.ts`'s typed `runs.retrieve` helper — no log tailing anywhere in the project.

---

## Component proposals

### `<QueueSimulator>`

- **Sketch.** Renders three labeled "tenant" swimlanes (Org A, B, C), each with a "submit job" button and an animated row of job tokens that flow left-to-right through the queue and drain at concurrency. A mode toggle at the top: "static queue, concurrency 1" / "static queue, concurrency 5" / "dynamic queue per org, concurrency 1 each." Inputs: `{ tenants: { id, label, color }[], modes: QueueMode[] }`. What it shows: how the same submission pattern produces different cross-tenant fairness outcomes depending on the queue topology — the noisy-neighbor problem in modes 1 and 2, the per-tenant isolation in mode 3.
- **Uses in this chapter.** Concept 5.
- **Forward-links.** The dynamic per-tenant queue pattern recurs in Chapter 12 forward note (Stripe reconciliation, `org-reconcile-${orgId}`) and Chapter 14.2 (notification dispatcher, per-recipient queue). The simulator is reusable as the visual for any per-tenant-queue concept; the swimlane layout fits the notification fan-out diagram by relabeling axes.
- **Leanest v1.** Three fixed swimlanes (A, B, C), a single "submit to org A" / "submit to org B" / "submit to org C" button trio, two modes only ("one big queue, concurrency 1" vs "per-org queue, concurrency 1"). Skip the concurrency-5 middle mode in v1 — the contrast that teaches the concept is single-queue-vs-per-tenant, not the concurrency-level dial. Animated tokens reduce to simple colored pills that move left-to-right along a track. This still produces the noisy-neighbor demonstration the concept needs.

### `<CheckpointTimeline>`

- **Sketch.** Renders a horizontal page-bar (default 7 pages) with save-point markers at each `triggerAndWait` boundary. A "play" / "pause" / "kill worker" / "restart worker" button row controls execution. A mode toggle: "checkpointed (each page is `triggerAndWait`)" vs. "inline (each page is `await listInvoices`)." The animation shows the parent's execution pointer crossing checkpoints, persisting at each one, and on restart re-running from the start with completed checkpoints cache-hitting (greyed, fast) while uncompleted ones execute fresh (animated, slow). Inputs: `{ pageCount: number, killAtPage?: number }`. What it shows: the geometry of where durability lives and what re-runs on retry.
- **Uses in this chapter.** Concept 7 (and the verify lesson 13.2.6 references the same drill in real code).
- **Forward-links.** Durable execution with `triggerAndWait` checkpoints recurs in Chapter 14.2 (notification dispatcher's per-recipient send is its own child for the same reason), and the checkpoint-vs-inline visual lifts directly. Stripe reconciliation in Chapter 12 forward note has the same shape per subscription. The component compounds across every "fan-out durable job" concept in the curriculum.
- **Leanest v1.** Fixed 5-page bar, two modes (checkpointed vs inline), one "kill at page 2" button (no scrubbing, no variable kill point). Auto-play on first interaction. Cached checkpoints render as filled grey squares with a "cached" tooltip; fresh executions render as animated filling squares. No real Trigger.dev connection — pure client-side animation driven by the mode + kill-point. The teaching geometry (kill mid-run, watch cached pages skip on retry) lands at this scope.

---

## Build priority

The two proposed components carry different teaching loads. `<CheckpointTimeline>` is the higher-priority build: it teaches the chapter's headline mental model (durability lives at `triggerAndWait` boundaries) and forward-links to every other durable-job chapter (14.2 notification dispatcher, the Stripe reconciliation forward note in 12, anywhere `triggerAndWait` fan-out appears). `<QueueSimulator>` is lower-priority but still earns its weight: dynamic per-tenant queues recur in 14.2 and 12, and the noisy-neighbor visual is hard to convey in any static form. If only one component ships, ship `<CheckpointTimeline>`; the queue concept can fall back to a Mermaid `sequenceDiagram` with three swimlanes inside `Figure` at a teaching cost.

## Open pedagogical questions

- Concept 5's `<QueueSimulator>` mode-3 assessment ("produce a state where Org A has two queued jobs while B and C are running fresh") requires the simulator to support submission timing the student controls and the visualization to hold a state long enough for the student to read it. Confirm whether the interaction model (click-to-submit with manual pacing) lands cleanly or whether the simulator needs an auto-replay button to let the student review the produced state.
- Concept 7's `<CheckpointTimeline>` is the chapter's load-bearing teaching artifact and also the one most likely to be cut for v1 scope. Confirm: if the simulator slips, does the kill-resume drill in 13.2.4 carry enough teaching weight on its own to land the concept, or does the absence of the pre-built mental model leave the student under-prepared for the real-codebase drill?
