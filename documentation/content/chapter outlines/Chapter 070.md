# Chapter 070 — Background work — climbing the durability ladder

## Chapter framing

Chapter 070 lands the senior question students dodged through Units 1 to 12: where does "work that runs after the user's request" live, and when does shipping it inside the request itself stop being defensible. The chapter walks the ladder from cheapest to heaviest — inline `await` inside a Server Action, `after()` for same-invocation post-response work, Vercel Cron for schedules, then Trigger.dev v4 once durability, multi-step execution, fan-out, long-running compute, or human-in-the-loop pauses enter the picture. The threshold is named once and revisited at every escalation: code stays at the lowest tier that meets the durability, latency, and time-budget requirements. The chapter inherits the idempotency discipline from lesson 4 of chapter 067 — every retried job carries a stable key — and the dedup-and-transact shape from lesson 2 of chapter 067 — every external side effect is guarded by a unique constraint or a provider idempotency key.

Threads through every lesson: the request-response budget is sacred — user-visible work blocks the response, everything else does not; durability means "this work survives a crash, redeploy, function timeout, and transient downstream outage"; the platform default is the right answer until a named threshold is crossed (function time limit, retries, multi-step orchestration, human pauses, fan-out); idempotency is the same DB-constraint discipline from chapter 067, expressed through `idempotencyKey` at trigger and wait boundaries; retries are exponential with jitter, never linear; observability comes free with Trigger.dev and must be built by hand at lower tiers, which is part of the threshold calculus. Seven teaching lessons plus a quiz, ordered from the platform default outward: the lessons before Trigger.dev exist so the student can defend *not* reaching for it; the Trigger.dev lessons exist so the student can wield it without dragging in features they do not need.

---

## Lesson 1 — Inline, then `after()`

Teaches the 0-tier (inline `await`) and 0.5-tier (`after()`) defaults for post-request work in Server Actions, the four thresholds that break them, and the `maxDuration` / error-swallow gotchas of running after the response.

**Vercel Fluid Compute — the invocation model this chapter assumes.** On Vercel, every request becomes a function-per-request invocation with a hard wall-clock cap set by the `maxDuration` config key (per-route or per-action). Tier caps in 2026: 1 minute on Hobby, 14 minutes on Pro Fluid Compute. The implication threads every lesson below — every second on the request path is the user's, and "background work" means work that does not block that budget. Full deployment depth in lesson 3 of chapter 102.

Topics to cover:

- **The senior question.** A user clicks "Send invitation". The Server Action inserts the row, sends the email, returns. What part of this work belongs inside the request-response cycle, what part belongs after the response, what part should not be on the request path at all? The lesson lands the 0-tier (inline `await`) and the 0.5-tier (`after()`).
- **The default — sequential `await` inside the action.** A Server Action that does a DB write and one external call (one Resend send, one Stripe API call) runs entirely inside the action body and returns the Result shape from chapter 047 after both complete. Synchronous-from-the-user's-perspective is the cheapest, most observable, most debuggable shape — no "queued for sending" half-state, no dispatcher to debug, no separate worker.
- **The thresholds that break the default.** Four named limits: (1) downstream latency that bloats the user-visible response (Resend p99 ~400ms is fine; a 5s API is not); (2) the function time limit — Vercel fluid compute caps at 14 minutes on paid, 1 minute on Hobby, and every second is on the user's request; (3) work that must continue if the user closes the tab — fire-and-forget cannot use request scope; (4) work that must survive transient downstream failures with retries — the action returns once, retries need somewhere else to live.
- **`after()` — Next.js 16's after-response primitive.** `import { after } from 'next/server'`. Schedules a callback to run after the response, inside the same serverless invocation. Stable since Next.js chapter 076. Usable in Server Components, Server Actions, Route Handlers, and Proxy. The senior anchor: `after()` is for "the user does not need to see this happen, but it must happen on this same invocation" — analytics events, structured logs that depend on the rendered response, fire-and-forget cache warming.
- **What `after()` is not.** Not a job queue. Runs once, in the same invocation, bounded by the same `maxDuration`. If the function times out or crashes, the callback is lost. No retries, no durability, no cross-process visibility. The most common 2026 mistake is reaching for `after()` for work that needed Trigger.dev. Threshold: lose-once-in-a-thousand acceptable → fine; not acceptable → escalate.
- **Lifecycle mechanics.** `after()` extends the invocation past the response via Vercel's `waitUntil` primitive — invocation stays alive up to `maxDuration` even after the response ships. Same behavior on self-hosted Node; on platforms without `waitUntil`, it's a no-op or runs synchronously.
- **Reading request data inside `after()`.** Inside Route Handlers and Server Actions, `cookies()` and `headers()` work inside the callback. Inside Server Components, they do not — read them before the call and close over the values (partial prerendering reason). Names the gotcha and the fix.
- **The three-tier mental model.** Tier 0: blocks the response (`await` inline). Tier 0.5: same invocation, after the response (`after()`). Tier 1+: outside the invocation entirely (Vercel Cron, Trigger.dev). The lesson draws the ladder once; the rest of the chapter climbs it.
- **Worked example — invite flow.** The `inviteMember` Server Action: insert the `org_invitations` row inside `db.transaction`, send the email inline with `await sendEmail(...)`, write the audit log in the same transaction, return Result. Then a variant deferring the audit log via `after()` — flagged as the wrong default here (the user wants to know the invite actually sent).
- **Where `after()` actually earns its weight.** Logging user agent and structured fields after a checkout completes, warming a `cacheTag` for a list the user is about to navigate to, posting a PostHog analytics event from a Server Action where the analytics failure must not roll back the DB transaction.
- **Error handling.** Errors inside `after()` do not propagate to the user — response is already sent. Must be caught and logged via chapter 096's structured logger or they vanish. `after()` is not fire-and-forget, it is fire-and-log.
- **Watch-outs:** putting the user-visible side effect inside `after()` so the user sees "success" before the email sends — race with reload, no failure path; using `after()` for work that exceeds `maxDuration` — silently truncated; "fixing" slow Server Actions by hiding latency in `after()` — the action is still slow; relying on `after()` for retries — none, one shot; calling `cookies()` inside `after()` in a Server Component — runtime error, read it outside.

What this lesson does not cover:

- Scheduled jobs and cron — lesson 2 of chapter 070.
- Durable retries and multi-step orchestration — Lessons lesson 3 of chapter 070 through lesson 6 of chapter 070.
- Server Action canonical shape and Result type — Chapter 047.
- `cacheTag` / `revalidateTag` mechanics — Chapters 036 and chapter 076.
- Structured logging and observability of background errors — Chapter 096.

Estimated student time: 35 to 45 minutes. The "do not over-engineer" lesson — most students will write more inline awaits than Trigger.dev tasks and need to know why that is correct.

---

## Lesson 2 — Vercel Cron as the schedule default

Teaches the Vercel Cron topology and `vercel.json` shape, `CRON_SECRET` verify-first auth, at-least-once delivery with dedup keys, UTC expressions, and the time-budget threshold that bumps a job up to Trigger.dev.

Topics to cover:

- **The senior question.** A SaaS has a handful of recurring jobs — nightly digests, weekly rollups, expired-trial sweeps, Stripe reconciliation. They run on a schedule, do not need cross-hour retries, fit inside a function timeout. Where does this work live? The lesson lands Vercel Cron as the 2026 default for schedules and pins the threshold that bumps a job up to Trigger.dev.
- **What Vercel Cron is.** A `vercel.json` entry maps a cron expression to a Route Handler path. The scheduler hits the path at the cadence; the handler runs as a normal serverless invocation, bounded by the same `maxDuration`. Topology: scheduler → HTTP GET to `/api/cron/<name>` → function executes → returns.
- **Config shape.** `{ "crons": [{ "path": "/api/cron/daily-digest", "schedule": "0 9 * * *" }] }`. Five-field expressions in UTC — never local time, schedules drift with DST.
- **Handler location.** `app/api/cron/daily-digest/route.ts` exporting `GET`. One folder per cron job, one `route.ts` per folder — shows up in deploy preview and in logs grouped by path.
- **Auth — `CRON_SECRET`.** A cron handler is a public URL; anyone can hit it. Vercel sets `Authorization: Bearer ${CRON_SECRET}` on every cron invocation; the handler verifies and returns 401 on mismatch. Non-optional — same trust-boundary discipline as lesson 1 of chapter 067.
- **The canonical verify-first shape.** Read `Authorization`, constant-time-compare against `process.env.CRON_SECRET`, 401 on mismatch, then do the work. Restates the constant-time discipline from lesson 1 of chapter 067.
- **Idempotency.** Vercel guarantees at-least-once cron delivery, not exactly-once. A network blip can produce two invocations seconds apart. Cron handlers use the chapter 067 dedup-and-transact shape with a key like `cron:<name>:<yyyy-mm-dd>`. Jobs that mutate idempotent state (SQL UPDATE on a predicate) often need none; jobs that send emails or charge cards do.
- **Time budget.** A cron job is a function invocation — same caps as any route. A 50 000-user digest that emails one-by-one times out. If work does not fit the budget, the cron handler's job becomes "enqueue a Trigger.dev fan-out task" and the real work moves out. Bridge to lesson 3 of chapter 070.
- **What Vercel Cron does not give.** No automatic retries (a 5xx is logged, not retried), no backoff, no intermediate-state visibility, no human pauses, no waitpoints, no fan-out — one invocation per tick. Each absence ties to a threshold for escalation.
- **Cron expressions students write.** `0 9 * * *` daily 09:00 UTC; `*/15 * * * *` every 15 minutes; `0 0 * * 0` weekly Sunday midnight UTC; `0 0 1 * *` monthly first. No seconds field, no `L` / `W` extensions.
- **Cost shape.** Metered as invocations plus compute. Every minute = 43 200 invocations/month; daily = 30. Frequency drives cost, not work — a once-per-minute "do nothing" job costs more than a daily heavy one.
- **Worked example — trial-expiry sweep.** `app/api/cron/sweep-trials/route.ts`. Cron `0 * * * *` hourly. Handler: verify `CRON_SECRET`, open transaction, `UPDATE plan_entitlements SET status = 'expired' WHERE plan = 'trial' AND trial_end_at < now() AND status = 'active' RETURNING organizationId`, audit-log each row, return 200 with the count. Closes the chapter 065 lifecycle-aware-UPDATE thread.
- **Local development.** Vercel does not run crons against `next dev`. Loop: hit the URL with `curl -H 'Authorization: Bearer $CRON_SECRET' http://localhost:3000/api/cron/<name>`. Write as a normal route, test via curl, deploy and watch the cron logs.
- **Watch-outs:** skipping `CRON_SECRET` "because it's just a cron URL" — public URLs get found within hours; local time in the cron — DST drift; inline heavy work exceeding `maxDuration` — silent truncation; ignoring at-least-once for side-effect jobs — duplicate emails; checking the secret without constant-time-compare — wastes the boundary; running crons more often than needed.

What this lesson does not cover:

- Dynamic per-tenant schedules — lesson 4 of chapter 070 (Trigger.dev `schedules.create`).
- Durable multi-step jobs — Lessons lesson 4 of chapter 070 through lesson 6 of chapter 070.
- Fan-out and concurrency control — lesson 4 of chapter 070.
- Long-running jobs past function time — lesson 3 of chapter 070.
- Stripe webhook reconciliation flow — Chapter 12.

Estimated student time: 35 to 45 minutes. The "the platform already does this" lesson — proves the student can defend not reaching for Trigger.dev for schedule alone.

---

## Lesson 3 — When Trigger.dev earns its weight

Teaches the five named conditions that justify Trigger.dev (past function time, multi-step orchestration, automatic retries, fan-out, event-driven pauses), the 2026 alternatives, the decision tree, and the org-context separation tasks inherit.

Topics to cover:

- **The senior question.** Inline `await` and `after()` cover same-invocation work. Vercel Cron covers schedules. What workloads do those two combined still fail at, and what specifically does Trigger.dev provide that earns the operational cost of a second platform? Threshold named explicitly so the student can defend the decision both ways.
- **The five trigger conditions.** Each named and observable. **(1) Past function time limit** — work needing more than 14 minutes on Pro fluid compute (1 minute on Hobby). **(2) Multi-step orchestration with intermediate state** — step A, wait for external response or delay, step B, where re-running A on failure would be incorrect or expensive. **(3) Automatic retries with backoff** — work that must survive a transient downstream outage on its own schedule, not the user's. **(4) Fan-out** — a single trigger spawns 50 000 child runs with concurrency control. **(5) Event-driven / human-in-the-loop pauses** — work blocking on a third-party callback URL, human approval, or wall-clock delay measured in hours or days.
- **Conditions that do not justify Trigger.dev.** A slow API under a minute → `after()` or accept latency. A nightly job that fits in 5 minutes → Vercel Cron. "I want a separate worker for cleanliness" → no, the platform is not your aesthetic.
- **2026 alternatives.** **Inngest** — serverless-native event system with step functions, similar shape, edge for event-driven teams. **Vercel Queues** (beta March 2026) — managed pub/sub on Vercel, lighter on multi-step orchestration. **BullMQ + Redis** — self-managed, full control, requires running Redis and a worker, wins on Render/Railway with persistent infra. **AWS SQS + Lambda** — enterprise-scale, heavy operational surface, wins inside AWS. Course picks Trigger.dev v4 — best 2026 DX for small teams (typed payloads, waitpoints, visible run timelines, local-CLI debugging) and Apache 2.0 self-host option if cost shifts. Names the alternatives once.
- **What Trigger.dev v4 provides, against the five conditions.** Durable runs surviving worker crashes and redeploys. Per-task retries with exponential backoff and jitter, declared. `wait.for` and `wait.until` — run pauses, worker frees, run resumes. Waitpoints for external callbacks and human approval. Code-defined queues for concurrency and fan-out. Typed payloads via `schemaTask`. A dashboard showing every run, step, retry, payload. A local dev CLI streaming live logs with kill-mid-run to prove durability.
- **Architectural shape.** Trigger.dev runs as a separate service (cloud or self-hosted). The app triggers tasks via the SDK over HTTPS. Tasks live in `src/trigger/`, deploy via the Trigger.dev CLI alongside Vercel deploys. Two CI steps (`vercel deploy` and `trigger deploy`), one codebase, types flow via the SDK.
- **Cost shape.** Per run, per run-minute, per concurrency seat. Free tier covers small SaaS (5 000 runs/month, 6 hour-equivalent compute). Senior reach: track per-task run count and duration weekly — bill grows linearly with work.
- **Decision tree.** Mermaid flowchart with the threshold at every fork. "Single email synchronously" → inline. "Log analytics after response" → `after()`. "Nightly 5-minute job" → Vercel Cron. "Send 50 000 emails on a schedule" → Vercel Cron triggers a Trigger.dev fan-out. "Wait for third-party webhook" → Trigger.dev waitpoint. "Multi-hour data export" → Trigger.dev task with `wait.for` between pages.
- **The course's triggers — preview.** Export job (chapter 071): multi-step, paginated, must resume on crash, sends email — all five conditions, Trigger.dev wins. R2 upload (chapter 073): not Trigger.dev — direct presigned PUT, inline. Not every job is a Trigger.dev job.
- **Org-versus-app separation.** Trigger.dev tasks run with no Better Auth session and no `tenantDb` middleware; org context must be in the payload and re-derived inside the task. Every payload is `{ organizationId, ... }`, every DB call uses `tenantDb(organizationId)` explicitly. Foreshadows the schema-task shape in lesson 4 of chapter 070.
- **Watch-outs:** reaching for Trigger.dev before any of the five conditions actually triggers — operational complexity for nothing; assuming tasks share request context with calling code — they do not, pass the org ID; running tasks against the same Postgres without considering pool contention — points at PgBouncer / chapter 043; using Trigger.dev for work that must happen *before* responding to the user — inverted model, user is now waiting; comparing Trigger.dev cost per run to Vercel cost per invocation — not the same unit.

What this lesson does not cover:

- Trigger.dev SDK and task definitions — lesson 4 of chapter 070.
- Durable execution mechanics — Lessons lesson 5 of chapter 070 and lesson 6 of chapter 070.
- Self-hosting Trigger.dev — named as option, not drilled.
- Detailed comparison with alternatives — out of scope.
- DB pool tuning under high concurrency — Chapter 043.

Estimated student time: 40 to 50 minutes. The "defend the decision" lesson — equips the student to say "no, Vercel Cron is enough" and "yes, Trigger.dev because of this exact property".

---

## Lesson 4 — Tasks, schemaTask, queues, schedules

Teaches the v4 API surface — `task` and `schemaTask` with Zod payloads, `tasks.trigger` versus `triggerAndWait`, code-defined queues as the v3-to-v4 break, per-tenant dynamic queues, and static and dynamic schedules.

Topics to cover:

- **The senior question.** Trigger.dev v4 is the chosen runtime. What is the minimum API surface to define, trigger, type, and operate a task, and where is the v3-to-v4 break the student must know because search results and AI completions are full of v3 examples?
- **Directory and setup.** `src/trigger/` folder, one task per file or grouped by domain. `trigger.config.ts` at the root declares the project ref, runtime, build target, queues. `npx trigger.dev@latest init` first-time setup. CLI: `pnpm trigger dev` local worker, `pnpm trigger deploy` production. Topology only; lesson 2 of chapter 071 walks the starter.
- **`task()` — the base primitive.** `task({ id: 'send-digest', run: async (payload, { ctx }) => { ... } })`. The `id` is durable identity — runs reference it by ID, persists across deploys. Treat `id` like a route path; do not rename casually.
- **`schemaTask()` — the default for everything in the course.** Plus a Zod 4 schema for the payload. `schemaTask({ id: 'export-csv', schema: z.object({ organizationId: z.uuid(), since: z.iso.date() }), run: ... })`. Payload parsed before the body runs; invalid payload throws at trigger time, not three minutes in. Same discipline as Server Action inputs from chapter 046. v4 supports Standard Schema (Zod, Valibot, ArkType) — future swap is structural.
- **Triggering from the app.** `await tasks.trigger<typeof exportCsv>('export-csv', { organizationId, since })`. The generic carries inferred payload type. Returns a `handle` with `id`. `tasks.trigger` is fire-and-forget — returns once enqueued, not on completion. Use `tasks.triggerAndWait` only inside another task body, never from request code (action would block and time out).
- **The `ctx` argument.** `ctx.run.id` (durable run ID, natural idempotency key), `ctx.attempt.number` (retry number), `ctx.environment` (dev / staging / production). No request context, no session, no cookies, no headers — the task is its own world.
- **Queues — the v4 break from v3.** In v3, queues were declared at trigger time. In v4, queues are declared in code, at project level, before the deploy. `trigger.config.ts` exports `queues: [{ name: 'export', concurrencyLimit: 5 }]`. Tasks reference queues by name. Treat queues like database tables — declared in code, migrated at deploy. Most-likely-to-bite v3-to-v4 trap because old examples will not work.
- **Concurrency limits.** A queue with `concurrencyLimit: 5` runs at most 5 simultaneously, regardless of enqueue depth. Extras queue and wait. Back-pressure primitive — set to the smallest number that keeps downstream services happy (Resend rate limit, third-party quota, DB pool size). Concurrency at the queue, not the task body.
- **Per-tenant queues — the SaaS pattern.** A single static queue serializes all tenants and one noisy tenant starves everyone. The v4 pattern is dynamic queues keyed by `organizationId`: `tasks.trigger('export-csv', payload, { queue: { name: \`org-\${organizationId}\`, concurrencyLimit: 1 } })`. Sequential per org, parallel across orgs. Project (chapter 071) demonstrates.
- **Scheduled tasks.** Static: `schedules.task({ id: 'nightly-digest', cron: '0 9 * * *', run: ... })` — one global schedule, declared in code. Dynamic: `await schedules.create({ task: 'nightly-digest', cron: '0 9 * * *', externalId: organizationId })` — at runtime per tenant or resource, with `externalId` for later lookup and cancel.
- **`cron` as object — timezone-aware schedules.** Both the static and dynamic forms accept `cron` as an object instead of a plain string: `cron: { pattern: '0 9 * * 1-5', timezone: 'America/New_York' }`. The `timezone` argument takes an IANA zone name and makes the schedule DST-aware (UTC `cron` strings drift through DST transitions). Default to the object form for any business-hours schedule; the plain string is fine for UTC-anchored sweeps.
- **Schedules versus Vercel Cron — second look.** A scheduled Trigger.dev task earns its place when the schedule needs to be dynamic (per-org) or when the work needs Trigger.dev's durability anyway. Static daily jobs that fit Vercel's budget stay on Vercel Cron. Do not migrate a working Vercel cron for uniformity.
- **The `init` lifecycle hook.** Per-run pre-body setup returning a value passed to the body. One-line example: `init: async () => ({ db: createDbForOrg(payload.organizationId) })`. Named, not drilled.
- **What the dashboard shows.** Every run with payload, status (queued, executing, completed, failed, retrying), start, duration, every log line, every retry's stack, every wait. Observability for free — equivalent on Vercel Cron is `console.log` plus hope. Part of the threshold calculus from lesson 3 of chapter 070.
- **Worked example — `notify-org-members`.** `schemaTask({ id: 'notify-org-members', schema: z.object({ organizationId: z.uuid(), eventType: z.string() }), queue: 'notifications', run: async ({ organizationId, eventType }, { ctx }) => { /* read members, send emails */ } })`. Triggered from a Server Action via `tasks.trigger`. Full lifecycle: action triggers, task enqueued, worker picks up, run executes, logs in dashboard.
- **Watch-outs:** copy-pasting v3 examples declaring queues at trigger time — v4 needs them in code; using `task` instead of `schemaTask` and validating in the body — duplicates work; `tasks.trigger` instead of `tasks.triggerAndWait` when you needed the result; concurrency at the task level (does not exist in v4); `tasks.triggerAndWait` from a Server Action — blocks and times out; renaming a task `id` without migrating in-flight runs — orphans; placing tasks outside `src/trigger/` — CLI does not find them.

What this lesson does not cover:

- Retries, backoff, `wait.for` / `wait.until` — lesson 5 of chapter 070.
- Waitpoints for callbacks and approval — lesson 6 of chapter 070.
- Project walkthrough and starter — Chapter 071.
- Self-hosting infrastructure — out of scope.
- Full pricing model — referenced, not drilled.

Estimated student time: 55 to 65 minutes. The "I can define and run a task" lesson — biggest in the chapter because it is the API surface every later lesson assumes.

---

## Lesson 5 — Surviving crashes — retries, waits, idempotency keys

Teaches checkpoints at step boundaries, exponential retries with jitter and `AbortTaskRunError`, `wait.for` / `wait.until` for durable pauses, `idempotencyKey` and `idempotencyKeyTTL` on every trigger and wait, and cooperative cancellation via `ctx.run.abortSignal`.

Topics to cover:

- **The senior question.** A task runs ten minutes. The worker crashes at eight. A third-party rate-limits the third call. What does Trigger.dev do, what does the student do, and where do production bugs hide in the seam?
- **What "durable" means.** A durable run survives worker crashes, redeploys, platform restarts. The runtime checkpoints at every `await wait.*`, every `await tasks.triggerAndWait`, every `await ctx.run.*`, and at the end of every retry. On crash, the run resumes from the last checkpoint on a new worker. Durability is a property of the *boundaries between steps*, not the steps — a long synchronous CPU loop in one step is not durable; the worker dies, the loop restarts. Split long work into small steps separated by `wait` or `triggerAndWait`.
- **Retries — declarative.** Every task has `retry: { maxAttempts: 5, factor: 1.8, minTimeoutInMs: 1000, maxTimeoutInMs: 60000, randomize: true }`. Exponential backoff with jitter. A throw triggers retry with the configured backoff. `ctx.attempt.number` tells the body which retry it is on. Retries are the runtime's job, not the body's — never `try/catch` around an external call to "retry inside" when the runtime already does it.
- **What gets retried, what does not.** Any throw retries by default. Exception: `AbortTaskRunError` skips retries and fails the run immediately — for unrecoverable errors (400 with a stable payload, validation, programmer errors). Rule: retry on transients (5xx, network, rate-limit), abort on permanents.
- **Run-level versus call-level retries.** Run-level restarts the task from the top — every step re-runs. Call-level (the SDK's automatic retries for rate-limited calls) restarts only the failing call. Implication: a step with side effects (DB write, Resend send) inside a retrying task executes twice unless guarded by an idempotency key. The cause of every "duplicate email" production bug.
- **`wait.for(duration)` — wall-clock waits.** `await wait.for({ minutes: 5 })` checkpoints, frees the worker, resumes after duration. Wall clock — survives crashes and redeploys. Use for "wait for a third-party rate-limit window" or "polling interval between export pages". Contrast: `setTimeout` holds the worker for nothing and dies on crash.
- **`wait.until(date)` — wait to a wall-clock time.** Same checkpoint semantics. Useful for "send the welcome email 24h after signup" or "expire trial at period end".
- **`idempotencyKey` on `tasks.trigger`, `wait.for`, `wait.until`.** Every trigger and wait accepts an `idempotencyKey` and `idempotencyKeyTTL`. Same key within the TTL returns the same run handle / waitpoint — no new run, no new wait. The dedup-and-transact discipline from lesson 4 of chapter 067 re-expressed as a runtime primitive. Use `ctx.run.id` as the key for retrying a step within a run; use a stable business key (`org:${orgId}:export:${date}`) when triggering from the app.
- **`idempotencyKeys.create` — key construction.** `await idempotencyKeys.create([organizationId, eventType, day])` produces a stable key from a key array. Named once; the project uses it.
- **Cross-step idempotency — the loop pattern.** A task that emails N users in a loop, called inside a run that may retry, needs each per-user send guarded by its own key: `for (const user of users) { await tasks.triggerAndWait('send-one', { userId: user.id }, { idempotencyKey: \`\${ctx.run.id}:user:\${user.id}\` }) }`. A retry of the outer run re-issues the same keys; the runtime returns prior results instead of re-sending. Closes the lesson 4 of chapter 067 idempotency thread with a concrete shape.
- **Run priority.** Every `tasks.trigger` accepts `priority` integer. Higher jumps ahead modulo concurrency. User-initiated → priority. Scheduled → default. Backfills → low. Named, not drilled.
- **Lifecycle hooks for cleanup.** `onSuccess` and `onFailure` per task — run after body succeeds or all retries exhaust. For "always write a final audit log" or "always clean up the temporary R2 object". Hooks themselves are not retried — their bodies should be idempotent.
- **Cancellation — `runs.cancel`.** A run can be canceled from dashboard or via `runs.cancel(runId)`. Inside the body, `ctx.run.abortSignal` is an `AbortSignal` that fires on cancel — propagate to `fetch` calls. Cancellation is cooperative; check the signal at step boundaries.
- **Worked example — paginated export with retries.** A `schemaTask` exporting invoices in batches of 500. `for (let page = 0; page < totalPages; page++) { await pageStep.triggerAndWait({ orgId, page }, { idempotencyKey: \`\${ctx.run.id}:page:\${page}\` }); await wait.for({ seconds: 2 }); }`. Mid-export worker crash resumes on a new worker, completed pages return cached, next page re-executes. Same shape as the project (chapter 071) build steps.
- **Watch-outs:** retrying a Resend-calling body without an idempotency key — guaranteed duplicate emails across retry; `setTimeout` instead of `wait.for` — durability lost; `Error` for permanent failure that should not retry — five wasted retries; `wait.until` with a past date — fires immediately, not skipped; assuming `ctx.run.id` is stable across child runs — every `triggerAndWait` spawns a new run with a new ID, use the parent's for keys that must align; mixing run- and call-level retries by adding manual retry loops — redundant; not propagating `ctx.run.abortSignal` — cancellation does not stop in-flight HTTP.

What this lesson does not cover:

- Waitpoints for external callbacks and human approval — lesson 6 of chapter 070.
- Task definition and queue setup — lesson 4 of chapter 070.
- Webhook signature verification and dedup — Chapter 067.
- DB transaction semantics inside tasks — Chapter 043.
- Cancellation UI and surfacing run state — Chapter 074.

Estimated student time: 50 to 60 minutes. The "I can write a task that survives production" lesson — every senior-level production task hangs on this material.

---

## Lesson 6 — Waitpoints for callbacks and approvals

Teaches `wait.forToken` with `publicAccessToken` as a third-party callback URL, programmatic `wait.completeToken` for human-in-the-loop approval, mandatory timeouts, multi-token aggregation, and live progress via `ctx.run.metadata`.

Topics to cover:

- **The senior question.** A task triggers a third-party long-running job (video render, payment authorization, partner API import) and must resume only when the third party calls back. Or a workflow needs human approval before continuing. Or N parallel sub-jobs must all finish before a final step. Where does the run live in the meantime, and how does resume work without polling?
- **What a waitpoint is.** A durable resumable token. The run hits `await wait.forToken(...)`; the runtime checkpoints, frees the worker, parks the run on the token. The token is completed externally — HTTP callback, programmatic SDK call, timeout — and any blocked run resumes. Replaces "poll a status endpoint until done" with structural pausing — no polling, no wasted compute, no missed completions.
- **The two-direction relationship.** A single waitpoint can block multiple runs (a feature-flag flip unblocks every run waiting on "feature enabled"). A single run can wait on multiple waitpoints ("any of these three" or "all of these N"). Small topology diagram.
- **`wait.forToken` — basic shape.** `const token = await wait.createToken({ timeout: '24h' })`. `token.publicAccessToken` is the URL-completion handle; `token.id` is the internal ID. Pass `publicAccessToken` to the third party as `callback_url`. Then `await wait.forToken<{ result: string }>(token.id)`. The runtime resumes with the value when the third party posts. Generic types the resumed payload.
- **Completing externally — the callback URL.** Trigger.dev exposes `https://api.trigger.dev/v1/tokens/${publicAccessToken}/complete` accepting a POST with the completion payload. The third party posts directly. Cleanest "we hand off to a third party and wait for callback" surface in the stack — no inbound webhook handler, no dedup table for the callback.
- **Completing programmatically.** `await wait.completeToken(tokenId, { result: 'approved' })` from anywhere — another task, Server Action, Route Handler. The human-in-the-loop pattern.
- **Timeouts.** Every waitpoint can carry `timeout` (`'24h'`, `'7d'`, ISO duration). On timeout, the wait resolves with `{ ok: false, timedOut: true }` and the run resumes with an explicit signal. Every external waitpoint has a timeout — no "wait forever" in production.
- **Human-in-the-loop — approval workflow.** A refund task triggers, creates a waitpoint with 48h timeout, writes a `pending_approvals` row carrying the token ID, sends a Slack notification, awaits the token. An admin clicks "Approve" / "Reject" in the admin UI, the Server Action calls `wait.completeToken(tokenId, { decision })`, the task resumes and applies the decision. The run is alive but consuming nothing — worker free, no polling.
- **Third-party callback — integration shape.** A video transcoding task posts to the partner with `callback_url = token.publicAccessToken`, then `await wait.forToken(token.id)`. Partner finishes, posts back, run resumes with partner's response. Partner's API surface and wait-token URL match perfectly — no glue webhook handler.
- **Multiple waitpoints — `wait.forWaitpoint`.** `await wait.forWaitpoint([token1.id, token2.id, token3.id], { all: true })` waits for all; `{ all: false }` (default) waits for any. Fan-out aggregation: trigger N sub-tasks, each completes its own token on success, parent waits on all. Alternative shape: `triggerAndWait` with `Promise.all` for typed sub-task results.
- **Waitpoints versus `wait.for` versus `triggerAndWait`.** `wait.for` for time-based pauses with no external completion. `triggerAndWait` for "child task, get its result" — runtime manages the waitpoint. `wait.forToken` for "external system or human will signal" — student manages the token.
- **Idempotency on completion.** Tokens complete once; a second completion call is a no-op (returns original result). The at-least-once callback story is handled by the runtime — no dedup table on the SaaS side for the callback itself, only for the work the resume triggers.
- **Observability.** A run blocked on a token shows "Waiting" with token ID, timeout countdown, and the URL the third party should call. When a third-party integration goes silent, the dashboard is the first place to look.
- **The `metadata` channel.** Inside the body, `ctx.run.metadata` is a mutable object the run writes to and the dashboard renders live. Useful for "47 of 200" progress to a watching admin or polling client. Project (chapter 071) uses it.
- **Worked example — third-party render callback.** A `schemaTask` triggers a partner video render and waits for completion. Body: create token with 6h timeout, POST to partner with `callback_url = publicAccessToken`, `wait.forToken<{ renderUrl: string }>(token.id)`, save `renderUrl` to DB. 30 lines, structural pause, no polling, full durability.
- **Watch-outs:** waitpoints without a timeout — run lives forever; trusting the third party to call the right URL — log token creation and resume, alert if wait expires; completing a token inside a transaction that may roll back — wait resumed but DB did not commit, split the completion out; `wait.forToken` for a time-based wait — use `wait.for`; passing internal `token.id` to the third party instead of `publicAccessToken` — exposes the internal ID; assuming a completed token is one-shot per run — one-shot per token, multiple runs can listen and all resume.

What this lesson does not cover:

- Task definition primitives — lesson 4 of chapter 070.
- Retry and idempotency mechanics — lesson 5 of chapter 070.
- Admin UI for human approval — Chapter 14 and beyond.
- Partner-side third-party integration handshake — partner-specific.
- Self-hosting — out of scope.

Estimated student time: 45 to 55 minutes. The "I can pause and resume" lesson — the v4 primitive students will reach for the moment a real workflow has a human or callback in it.

---

## Lesson 7 — Wiring our app — which workloads go where

Teaches which three jobs in the course's app run on Trigger.dev (CSV export, Stripe reconciliation, notification dispatcher), which four stay on the platform default, the env surface, and the deploy-Trigger.dev-before-the-app ordering rule.

Topics to cover:

- **The senior question.** Student has threshold, primitives, retries, waits, waitpoints. Where in the course's app does Trigger.dev get wired in, and where deliberately not?
- **The three workloads the course wires through Trigger.dev.** **(1)** CSV export job (chapter 071 project) — multi-step, paginated, time-budget-bursting, sends email at the end, must survive crashes — all five conditions present. **(2)** Stripe reconciliation sweep (forward note — extends chapter 067 / chapter 068) — nightly schedule reading Stripe state for any org with `lastEventAt` older than 24h and reconciling drift; durability matters because partial reconciliation is wrong. **(3)** Notification dispatcher fan-out (Chapter 075 forward note) — one event fans out to N channels per N users, per-org queue serializes, dispatcher runs as a Trigger.dev task triggered from `notifyEvent` Server Action helper.
- **The workloads the course keeps on the platform default.** Resend send from `inviteMember` Server Action — inline, single call, ~200ms. Hourly trial-expiry sweep from lesson 2 of chapter 070 — fits Vercel's budget, idempotent SQL UPDATE. Audit log writes — inside the action's transaction, never deferred. Analytics events from a Server Action — `after()`, fire-and-forget.
- **Env surface.** `TRIGGER_SECRET_KEY` for the SDK app-side, `TRIGGER_PROJECT_REF` in `trigger.config.ts`. `CRON_SECRET` for Vercel crons. Foreshadows chapter 071's `.env.example`.
- **Deploy surface.** Two CI deploys: `vercel deploy` and `pnpm trigger deploy`. Order matters when a Server Action triggers a new task version — deploy Trigger.dev first, then the app, so the app never references a task version that has not landed. Deeper coverage in Chapter 21.
- **Cost in operational terms.** Per-run cost small; per-run-minute adds up for long tasks; concurrency seats add up for high fan-out. Monitor Trigger.dev's per-task run count weekly the same way you monitor Vercel function invocations — anomalies usually indicate a missing idempotency key or retry storm.
- **Two services, one codebase.** Tasks in `src/trigger/`, single SDK import, types flow. Postgres shared — same Drizzle schema, same `tenant-db.ts`, same audit log. Task bodies call the same `lib/email.ts`, `lib/billing.ts`, DB helpers. Trigger.dev is a *runtime* for code that already lives in the codebase, not a separate codebase.
- **Self-host off-ramp.** Trigger.dev v4 is Apache 2.0; self-host once a SaaS scales past free tier or has data-residency constraints. Course uses cloud; pattern does not change.
- **Forward note for chapter 071.** The project ships the CSV export task end-to-end: starter clone, schema-task with payload validation, paginated `triggerAndWait` per page with per-page idempotency keys, final email send, dashboard verification, mid-run worker kill to prove durability, parallel-trigger test for per-org serialization.
- **Watch-outs:** dragging every async Server Action into Trigger.dev "for consistency" — operational complexity for nothing; deploying the app before the new task version — `tasks.trigger('new-task-id')` fails at runtime; running the local dev CLI against the production project — production runs trigger on every save; sharing `TRIGGER_SECRET_KEY` between staging and production — same blast radius as sharing webhook secrets.

What this lesson does not cover:

- The export task's code — Chapter 071.
- Notification dispatcher — Chapter 14.
- Stripe reconciliation — Chapter 12 forward note.
- Deploy pipelines — Chapter 21.
- Self-hosting infrastructure — out of scope.

Estimated student time: 20 to 30 minutes. The bridge lesson — short, names workloads and pre-loads the project.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

- The latency ladder — inline `await`, `after()` for same-invocation post-response work, Vercel Cron for schedules, Trigger.dev for durable / multi-step / fan-out / waitable — and the named threshold promoting work to each next tier.
- `after()` mechanics — same invocation, bounded by `maxDuration`, no retries, no durability, errors caught and logged or they vanish; the Server-Component `cookies()/headers()` constraint (read before, close over).
- Vercel Cron's `CRON_SECRET` trust boundary, at-least-once delivery and `processed_events`-style dedup when side effects are involved, function-time cap on cron handlers.
- The five Trigger.dev trigger conditions — past function time, multi-step orchestration with intermediate state, automatic retries with backoff, fan-out, event-driven / human-in-the-loop pauses — and conditions that do not qualify (aesthetics, slight slowness, separation alone).
- `schemaTask` as default — Zod payload validation at trigger boundary, `id` as durable API, queues declared in code (the v4 break from v3), `tasks.trigger` vs `tasks.triggerAndWait`.
- Code-defined queues and concurrency limits as back-pressure; per-tenant dynamic queues (`org-${organizationId}`) as the SaaS-tenancy pattern.
- Durable execution — checkpoints at every `wait.*` and `triggerAndWait`, run-level retries with exponential backoff and jitter, `AbortTaskRunError` for permanent failures, `ctx.run.id` as natural idempotency key.
- `idempotencyKey` on `tasks.trigger`, `wait.for`, `wait.until` — the unifying discipline from lesson 4 of chapter 067 as a runtime primitive; per-step keys (`${ctx.run.id}:user:${userId}`) guarding side effects across retry boundaries.
- Waitpoints — `wait.forToken` with public access token for third-party callback URLs, `wait.completeToken` for programmatic / human-in-the-loop completion, mandatory timeouts, many-runs-on-one-token and one-run-on-many-tokens topologies.
- The course's wiring — CSV export, Stripe reconciliation, notification dispatcher in Trigger.dev; Resend-from-action, hourly trial sweep, audit logs, analytics on platform default; per-tenant queues, `TRIGGER_SECRET_KEY` env, deploy-Trigger.dev-before-the-app order.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
