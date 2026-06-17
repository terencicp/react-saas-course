# Chapter 066 — Background work

## Lesson 1 — Inline, then after()

**Taught:** The three-tier background-work ladder (tier 0 inline `await`, tier 0.5 `after()`, tier 1+ off-invocation), the four thresholds that break inline, `after()` mechanics and limitations, and the `inviteMember` Server Action as the running example.

**Cut:** The chapter outline's stale Fluid Compute caps ("1 min Hobby / 14 min Pro") were corrected to "5 min Hobby / 13 min Pro" per Vercel docs 2026-05-14; exact figures were de-emphasized in favor of "minutes-scale hard wall, every second is the user's." No live sandbox (server-context can't run in ReactCoding iframe).

**Debts:**
- Structured logger (`pino`, `requestId` via AsyncLocalStorage) referenced as "your structured logger from the observability chapter" — actual API deferred to Ch.092.
- `cacheTag`/`revalidateTag` mechanics referenced only as an `after()` fit example — deferred to Ch.072.
- Cron / Vercel Cron explicitly deferred to Lesson 2.
- Durable retries, Trigger.dev, multi-step orchestration explicitly deferred to Lessons 3–6.
- `idempotencyKey` discipline named as a threshold-4 requirement, implementation deferred back to Ch.063 L4.

**Terminology:**
- **Tier 0 / Tier 0.5 / Tier 1+**: inline `await` / same-invocation post-response / off-invocation entirely.
- **`after()`**: `import { after } from 'next/server'`; schedules a callback after the response, on the same invocation, bounded by the same `maxDuration`.
- **`waitUntil`**: platform primitive that keeps the serverless function alive past the response until the callback finishes or `maxDuration` hits.
- **"fire-and-log, not fire-and-forget"**: `after()` errors must be caught and logged or they vanish silently.
- **Four thresholds**: (1) slow non-essential downstream, (2) function time wall, (3) must outlive the tab, (4) must retry on failure — threshold 4 is the one neither inline nor `after()` meets.
- **The decision rule**: "code stays at the lowest tier that meets the durability, latency, and time-budget requirement."

**Patterns and best practices:**
- Canonical `after()` shape: always wrap the callback body in `try/catch` and log via structured logger — `after(async () => { try { await …; } catch (err) { logger.error({ err }, 'after: …'); } })`.
- Analytics/logging events → `after()`; invitation email → inline `await`; audit-log row → inside `db.transaction`, never deferred.
- Request-context rule: `cookies()`/`headers()` work inside `after()` in Server Actions and Route Handlers; in Server Components, read the value before the `after()` call and close over it.

**Misc:**
- `inviteMember` is the chapter's running example: `org_invitations` insert + `logAudit(tx, …)` atomic in one transaction, `sendInvitationEmail` inline after commit, analytics event in `after()`.
- The lesson explicitly re-anchors the Ch.043 L5 five-seam Server Action shape and the "external calls after commit" rule — later lessons can assume both are solid without re-teaching.
- The lesson explicitly re-anchors the Ch.057 L5 `logAudit(tx, …)` pattern as the "never defer via `after()`" counter-example.
- Vercel Fluid Compute corrected caps (**5 min Hobby / 13 min Pro**) are now established; later lessons should not introduce different numbers without noting a plan-tier distinction.

---

## Lesson 2 — Vercel Cron as the schedule default

**Taught:** Vercel Cron topology (external scheduler → HTTP GET → serverless route handler); securing the public cron path with `CRON_SECRET` / `Authorization: Bearer` and `timingSafeEqual`; best-effort delivery semantics (miss + duplicate); idempotent reconciliation-based handler design; predicate-vs-side-effect dedup discriminator; the trial-expiry sweep as a worked example; cron expression syntax and Vercel-specific limits; the four thresholds that escalate to Trigger.dev; and the `curl`-based local test loop.

**Cut:** The chapter outline sketched a Stripe reconciliation sweep as a second worked example — the lesson names it only as a recurring-job example; the actual build is deferred to Lesson 7. The outline's stale function-time figures ("1 min / 14 min") were replaced with the Lesson 1-established caps (5 min Hobby / 13 min Pro) and not re-derived.

**Debts:**
- Dynamic per-tenant / timezone-aware schedules (Trigger.dev `schedules.create`) explicitly deferred to Lesson 4.
- Durable retries, fan-out with concurrency control, waitpoints, multi-step jobs deferred to Lessons 3–5.
- The full five-condition Trigger.dev decision tree deferred to Lesson 3 (this lesson's `StateMachineWalker` covers only the schedule decision).
- Stripe reconciliation sweep build deferred to Lesson 7.

**Terminology:**
- **Vercel Cron**: an external scheduler that fires a plain HTTP GET to a declared path in your production deployment on a cron cadence; the handler runs as an ordinary serverless invocation.
- **`CRON_SECRET`**: server-only env var (min 16 chars); Vercel injects it as `Authorization: Bearer ${CRON_SECRET}` on every cron request; validated via `@t3-oss/env-nextjs` in `env.ts`.
- **Bearer token**: a secret string in the `Authorization` header that grants access by possession alone.
- **`isFromVercelCron(request)`**: the factored guard helper (`@/lib/cron`); reads the `Authorization` header, compares against `Bearer ${env.CRON_SECRET}` with `timingSafeEqual` (length-checked first), returns boolean.
- **Reconciliation**: processing all outstanding work from a known-good baseline on every run rather than a remembered delta — a missed run is caught up by the next, a duplicate finds nothing left to do.
- **Predicate-idempotent job**: a cron whose work is a SQL UPDATE filtered by a `WHERE` clause the first run invalidates — needs no dedup key; the predicate is the idempotency.
- **User-visible-side-effect job**: a cron that sends email / charges a card / inserts rows — needs a Ch.063-style dedup claim row under a `cron:<name>:<yyyy-mm-dd>` key inside the same transaction.
- **`vercel-cron/1.0`**: user-agent Vercel attaches to every cron request; `x-vercel-cron-schedule` header carries the fired expression.

**Patterns and best practices:**
- Cron handler location: `app/api/cron/<name>/route.ts`; one folder per job; named `GET` export (not default export); `export const runtime = 'nodejs'` (for `timingSafeEqual`).
- Guard shape: `if (!isFromVercelCron(request)) return new Response('Unauthorized', { status: 401 })` — first line of the handler, before any DB call or logging.
- Auth status is **401** (missing identity on a private door), deliberately distinct from the webhook's **400** (malformed signature proof) — do not align them.
- `timingSafeEqual` compare is the course hardening over Vercel docs' plain `!==`; treat a reversion to `!==` as a regression.
- Trial-expiry sweep shape: single `db.transaction` wrapping a predicate-guarded `.update().set({ status: 'past_due' }).where(and(eq(...status, 'trialing'), lt(...currentPeriodEnd, now))).returning()` + per-row direct `tx.insert(auditLogs).values({ organizationId, actorUserId: null, action: 'system.trial-expired', subjectType: 'organization', subjectId: organizationId, payload: { source: 'cron:sweep-trials' } })` inside `tx`; return `Response.json({ expired: expired.length })`.
- "now" uses the `Temporal.Now.instant()` → `dateFromInstant()` seam from `@/lib/temporal`; treat as plumbing, not a teaching point.
- No external calls inside the transaction; if the sweep ever needs to email, the send moves outside `tx` and the job escalates to a Trigger.dev fan-out.
- Sub-daily cron expressions are **Pro-only** — Hobby is once-per-day only, and a sub-daily expression fails deployment.
- Day-of-month and day-of-week fields are mutually exclusive; all expressions are UTC only (no timezone field).
- Local testing: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/<name>` — a request without the header must 401.
- Never return a 3xx from a cron handler (scheduler does not follow redirects); a 404 path still counts as a completed invocation.

**Misc:**
- `planEntitlements` schema (columns `status`, `currentPeriodEnd`, `organizationId`) is used as a shape sketch only — defined in Ch.064 L4; do not re-define or migrate.
- **System-actor audit writes**: a cron has no session, so `logAudit()` (which calls `requireOrgUser()` + `headers()`) cannot be used inside a cron handler. Instead, insert into `auditLogs` directly with `actorUserId: null`; this is the Ch.057 L5 "system actor" pattern — a null actor is information (machine acted), not a missing value. Action string is `'system.trial-expired'` (not `'trial.expired'`). Any future lesson writing a cron audit must follow this direct-insert / null-actor shape.
- The four Trigger.dev escalation thresholds established here: (1) job exceeds function-time wall → Trigger.dev; (2) needs automatic retry on failure → Trigger.dev; (3) fans out to N controlled child runs → Cron triggers Trigger.dev fan-out; (4) needs per-tenant / local-time schedule → Trigger.dev dynamic schedules.
- Cost shape: crons are metered as invocations + compute; frequency drives cost more than work volume — run no more often than freshness requires.
- The schedule decision `StateMachineWalker` (root → fits one invocation? → retries needed? → fan-out? → fixed UTC schedule? → Vercel Cron or Trigger.dev leaf) is the canonical decision tool for the chapter; Lesson 3's full Trigger.dev decision tree extends it.

---

## Lesson 3 — When Trigger.dev earns its weight

**Taught:** The five named conditions that justify a durable job platform (past function time wall, multi-step orchestration with intermediate state, automatic retries with backoff, fan-out with concurrency control, event-driven / human-in-the-loop pauses); the conditions that do not justify it (slow call under the time wall, schedule that fits the budget, aesthetic separation); the full four-question escalation funnel (`StateMachineWalker`) extending L2's schedule branch; Trigger.dev v4 as the course's choice with its Apache-2.0 self-host off-ramp; the architectural fact that tasks run on Trigger.dev workers outside the Vercel function; and the org-context-as-cargo mental model for tasks.

**Cut:** The chapter outline's Vercel Queues beta flag was repeated ("public beta as of Feb 2026, at-least-once delivery"); the lesson noted it's "in public beta with at-least-once delivery" as a risk watch-out, without deep comparison. Detailed alternative comparisons (Inngest, BullMQ, SQS) were one line each as specified. No cost table (volatile); cost shape named in operational terms only. The chapter outline's stale function-time figures ("1 min / 14 min") did not appear — lesson used the L1-established caps throughout.

**Debts:**
- Trigger.dev SDK surface (`task`, `schemaTask`, `tasks.trigger`, queue declarations, `trigger.config.ts`, CLI) — explicitly deferred to L4.
- Durable-execution mechanics (`retry` config, `AbortTaskRunError`, `wait.for`/`wait.until`, `idempotencyKey` as runtime primitive) — deferred to L5.
- Waitpoints in depth (`wait.forToken`, `publicAccessToken`, `wait.completeToken`) — deferred to L6.
- CSV export task's actual code — deferred to Chapter 067.
- Wiring all three app workloads, env surface (`TRIGGER_SECRET_KEY`), deploy ordering (`trigger deploy` before `vercel deploy`) — deferred to L7.
- DB pool contention under high task concurrency / PgBouncer — one-line pointer to Chapter 039; not drilled.

**Terminology:**
- **Five trigger conditions**: (1) past the function time wall, (2) multi-step orchestration with intermediate state, (3) automatic retries with backoff, (4) fan-out with concurrency control, (5) event-driven / human-in-the-loop pauses.
- **Fan-out**: one trigger spawning many child runs, concurrency-limited — defined via `<Term>`.
- **Waitpoint**: a durable, resumable pause token; run parks, worker freed, external signal resumes — defined via `<Term>`, drilled in L6.
- **Durable run**: a run that survives worker crashes, redeploys, and platform restarts by checkpointing between steps — defined via `<Term>`.
- **Idempotency key**: a stable key that makes a retried trigger or side effect run exactly once — re-anchored from Ch.063 via `<Term>`.
- **Exponential backoff with jitter**: retry delays that grow geometrically with randomization so retries spread out instead of stampeding — defined via `<Term>`.
- **Concurrency limit**: the cap on how many runs of a queue execute simultaneously; back-pressure — defined via `<Term>`.
- **"escalate on a condition, never on a vibe"**: the one-liner for code review when a teammate proposes a job with no condition crossed.
- **"a task is its own world; org context is cargo, not ambient"**: the reflex for the no-request-context mental model.
- **Four-question funnel**: user-visible? → finishes on this invocation? → fixed schedule within budget? → which of the five conditions?

**Patterns and best practices:**
- Every task payload carries `{ organizationId, ... }`; every DB call inside the task calls `tenantDb(organizationId)` re-derived from the payload — `requireOrgUser()` does not exist inside a task.
- App side hands `orgId` (from `requireOrgUser()`) into `tasks.trigger(...)` payload; task side reads it back out — the seam is explicit, never assumed.
- Trigger.dev and Vercel tiers compose: Vercel Cron does the scheduling, its handler's only job is to enqueue a Trigger.dev fan-out that does the work, metered by a concurrency limit.
- Do not use Trigger.dev for work that must complete before responding to the user — the caller would block and time out.
- Do not compare "Trigger.dev cost per run" to "Vercel cost per invocation" — different units, a category error.
- Watch the per-task run count weekly; a spike almost always means a missing idempotency key or a retry storm, not real growth.

**Misc:**
- The `StateMachineWalker` in this lesson is the chapter's canonical full decision tree; it contains L2's schedule branch as one path (unchanged) plus the four Trigger.dev condition-paths. L4–L6 can reference it without re-building it.
- The illustrative code sketch (`tasks.trigger('export-csv', { organizationId, since })` / `tenantDb(organizationId)` in the task body) is flagged as "illustrative-not-taught" — the SDK shapes are L4's job; later lessons must not assume these snippets taught the API.
- The tasks architecture diagram (three-box: App → HTTPS trigger → Trigger.dev workers; both → shared Postgres) is established here; L4–L6 and Ch.067 can reference it without re-drawing.
- The CSV export is named as the canonical "yes" target that trips all five conditions — Ch.067 builds it; L4 teaches the SDK to write it.
- Vercel Queues flagged as at-least-once-delivery public beta as of early 2026 — architecting on its delivery semantics is a stated risk; if the course ever switches to it, this flag is the entry point.
- The closing workload table names the R2 direct presigned PUT (future Ch.068/069) as "inline — no task"; later lessons introducing that upload flow should confirm it stays off-tier.

---

## Lesson 4 — Defining and triggering Trigger.dev tasks

**Taught:** The minimum v4 SDK surface to define, type, trigger, queue, and schedule a task: `trigger.config.ts` + `trigger/` folder topology; `task` vs `schemaTask` (course default); triggering via the task-instance method (fire-and-forget, handle returned on enqueue); predeclared queues with `concurrencyLimit`; per-tenant concurrency isolation via `concurrencyKey`; static schedules (`schedules.task` with DST-safe object-form `cron`) and dynamic per-tenant schedules (`schedules.create`); dashboard observability as a free platform benefit; worked example `notify-org-members` assembling all pieces.

**Cut:** The chapter outline's v3 per-tenant queue pattern (`queue: { name: \`org-${orgId}\`, concurrencyLimit: 1 }` at trigger time) was explicitly taught as **wrong in v4** and replaced with `concurrencyKey`; this is the lesson's marquee v3→v4 correction. The chapter outline led with the string-id trigger form (`tasks.trigger('id', payload)`) — lesson inverted this to instance-method-first, string form as escape hatch only. The per-task `init:` hook (chapter outline called it out as named-not-drilled) was omitted entirely — it is deprecated in v4; `locals`/middleware is the current mechanism (named once). No YouTube video — topic too version-volatile; official docs linked instead.

**Debts:**
- Send loop in worked example (`notify-org-members`) is **not** idempotent — marked `// TODO: make each send idempotent with a per-recipient key`; idempotency keys as a runtime primitive deferred to L5.
- `triggerAndWait` / `batchTriggerAndWait` deep mechanics (they are durable waitpoints) — named "legal only inside a task body, not from a Server Action"; drilled in L5/Ch.067.
- `ctx.run.id` and `ctx.attempt.number` named as ctx fields; their idempotency/retry use deferred to L5.
- `metadata.set(...)` named once as live-progress channel; drilled in L6/Ch.067.
- `locals` / middleware for per-run resource scoping, and a global `init.ts` at `trigger/` root for environment-wide lifecycle hooks — named once; not drilled.
- Env surface (`TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`), deploy ordering (trigger deploy before Vercel deploy), and which app workloads go where — deferred to L7.
- The `notifyEvent` Server Action helper generalisation — L7 will generalise the direct trigger call shown here into a reusable helper.

**Terminology:**
- **`trigger/` (root-level)**: the course-default task folder, declared in `trigger.config.ts` as `dirs: ['./trigger']`; files outside `dirs` are silently ignored — caution note included.
- **`trigger.config.ts`**: repo-root config; fields: `project` (proj_… ref), `dirs`, `runtime`.
- **project ref**: the `proj_…` identifier tying local code to a Trigger.dev cloud project.
- **`schemaTask`**: `task` + `schema` (Zod/Standard Schema); validates payload before `run` executes; payload is typed in the body; schema renders as dashboard input contract. Course default for any payload task.
- **Standard Schema**: validator-agnostic interface (Zod, Valibot, ArkType all implement it).
- **durable identity**: the task `id` string — persists across deploys, dashboard groups history under it, never rename casually (treat like a DB table name or route path).
- **`ctx`**: per-run context (`ctx.run.id`, `ctx.attempt.number`, `ctx.environment`) — not request context; no session, headers, or `requireOrgUser()`.
- **handle**: the object returned by `trigger` — carries `id` for later lookup/cancel; it is not the run's result.
- **fire-and-forget**: `trigger` returns the moment the run is enqueued, not when it completes.
- **`concurrencyKey`**: value passed at trigger time to split a predeclared queue's limit into one independent lane per key — sequential within a tenant, parallel across tenants.
- **`externalId`**: your domain id attached to a `schedules.create` entry for later lookup/cancel.
- **`deduplicationKey`**: makes `schedules.create` idempotent — same key updates instead of duplicating.
- **IANA timezone**: named-zone string for DST-safe schedules (object-form `cron: { pattern, timezone }`).

**Patterns and best practices:**
- One task per file in `trigger/`; task exported as a named export.
- `schemaTask` over `task` for any payload task; schema inline next to the task; hoist to `lib/triggers/<task>.schema.ts` only if callers import it.
- Queues declared at module scope via `queue({ name, concurrencyLimit })`; never at trigger time.
- Per-tenant concurrency: one predeclared queue + `concurrencyKey: organizationId` at trigger time — not a dynamically-named queue (v3 anti-pattern, rejected by v4).
- Set `concurrencyLimit` to the smallest number that keeps the downstream happy (Resend rate limit, DB pool, third-party quota).
- `triggerAndWait` / `batchTriggerAndWait` are legal **only inside another task body** — never from a Server Action (blocks the request, exceeds `maxDuration`).
- Instance method (`exportCsv.trigger(payload)`) is the default trigger form; string-id form (`tasks.trigger<typeof T>('id', payload)`) is the escape hatch for cross-service boundaries only.
- Static `schedules.task` cron: use object form `cron: { pattern, timezone }` for any wall-clock or business-hours schedule (DST-safe); plain string form only for genuinely UTC-anchored sweeps.
- Dynamic `schedules.create` cron: `cron` is always a plain **string**, `timezone` is a separate top-level field — not nested in `cron` (shape differs from static form).
- Always pass `deduplicationKey` to `schedules.create` to prevent duplicate schedules on retried calls.
- Task payload must carry `organizationId`; re-derive tenancy inside `run` via `tenantDb(organizationId)` — no `requireOrgUser()` inside a task.
- Idempotency keys on every trigger are required (Code conventions); this lesson marks that pattern as a forward debt (L5) where the worked example deliberately omits it.
- `ExportPayload` ZodCoding exercise used `z.uuid()`, `z.iso.date()`, `z.enum(['csv','json']).default('csv')` — Zod 4 top-level builders confirmed as the course pattern for task payload schemas.

**Misc:**
- The `notify-org-members` task is the chapter's second anchor example (alongside `inviteMember` from L1); Ch.067 builds the real `export-csv` task using the same API surface taught here.
- Vercel Cron vs Trigger.dev schedule decision closed: use Trigger.dev schedule only when cadence must be dynamic/per-tenant or the work needs Trigger.dev's durability; fixed UTC sweeps within budget stay on Vercel Cron.
- Code conventions §Background work note: the per-tenant queue pattern there implies dynamic queue names — v4 rejects that; `concurrencyKey` is the current mechanism. Later lessons and Ch.067 should follow `concurrencyKey`, not the conventions doc's stale phrasing.

---

## Lesson 6 — Waitpoints for callbacks and approvals

**Taught:** `wait.createToken` / `wait.forToken<T>` / `wait.completeToken` lifecycle; `token.url` (server-to-server, no CORS) vs `token.publicAccessToken` (browser Bearer) as the two completion handles; mandatory explicit `timeout` (default `'10m'`, almost always wrong for real waits); the `{ ok, output, error }` result shape plus `.unwrap()` shorthand; idempotency on `createToken` via `idempotencyKey` + `isCached`; `createToken` idempotency key TTL defaults to `'1h'` (vs 30-day default for `tasks.trigger` keys); one-shot token guarantee; "commit first, complete last" as the transaction rule; three workflow shapes (third-party HTTP callback, human-approval Server Action, fan-in via `batchTriggerAndWait`); discriminator table (`wait.for/until` = clock, `triggerAndWait/batchTriggerAndWait` = child task, `wait.forToken` = external/human).

**Cut:** The chapter outline's `wait.forWaitpoint([...], { all })` multi-token API does not exist in v4 — explicitly corrected away. The outline's `token.publicAccessToken`-in-path completion URL is wrong; corrected to `token.url` for server-to-server and `publicAccessToken` as a Bearer token for the CORS-enabled completion endpoint. The outline's `{ ok: false, timedOut: true }` result shape is wrong; corrected to `{ ok, output, error }` (no `timedOut` field). The outline's `ctx.run.metadata` mutable-object live-progress phrasing is wrong; corrected to `metadata.set(...)`. The `Promise.all`-over-`wait.forToken` pattern for N external completions was taught as the documented escape hatch but not as a primary pattern. `onSuccess`/`onFailure` hooks not mentioned.

**Debts:**
- Admin UI for surfacing `pending_approvals` and run state in-app — deferred to Ch.070.
- `metadata.set(...)` for live progress named in `batchTriggerAndWait` annotated step and forwarded to Ch.067 for drill.
- `browser/publicAccessToken` CORS-completion path named but no code example; if a later lesson shows browser-initiated token completion, it uses `publicAccessToken` as a Bearer header on the CORS-enabled endpoint.

**Terminology:**
- **Waitpoint**: a durable, resumable pause token; run parks on `wait.forToken`, worker freed, external signal (HTTP callback, `completeToken` SDK call, or timeout) wakes it.
- **`wait.createToken({ timeout, idempotencyKey? })`**: mints a token handle with `{ id, url, publicAccessToken, isCached }`. `id` starts with `waitpoint_`.
- **`token.url`**: server-to-server completion webhook (no CORS) — hand to backend partners.
- **`token.publicAccessToken`**: Bearer token for browser/CORS completion — do NOT pass to backend partners, do NOT splice into a URL path.
- **`wait.forToken<T>(token.id)`**: checkpoint that parks the run; returns `{ ok, output, error }` + `.unwrap()`.
- **`wait.completeToken(tokenId, payload)`**: programmatic completion from your own code (Server Action, Route Handler, another task). Called **programmatic completion**.
- **Human-in-the-loop**: a workflow that pauses for a person's decision before continuing.
- **One-shot token**: a token completes exactly once; second `completeToken` call is a no-op.
- **"Commit first, complete last"**: external side effect (`completeToken`) goes after the DB transaction commits, never inside it — same rule as Resend/Stripe calls.
- **`createToken` idempotency key TTL**: defaults to `'1h'` (distinct from 30-day default for `tasks.trigger` idempotency keys established in L5).
- **Discriminator table**: which wait primitive to use is determined solely by "who completes the wait" (clock / child task / external+human).

**Patterns and best practices:**
- Every `wait.createToken` call must include an explicit `timeout` sized to the slowest acceptable completion; the `'10m'` default is almost always wrong for real waits.
- The `!result.ok` branch on every `wait.forToken` is mandatory, never a TODO — timeout means the run must branch or `AbortTaskRunError`.
- Use `.unwrap()` when a timeout is genuinely fatal and needs no custom handling; branch on `result.ok` when a timeout has semantic meaning (auto-reject, escalate).
- Pass `idempotencyKey: ctx.run.id` to `createToken` so a task retry returns the same token rather than orphaning the first.
- Server Action completing a token: `requireOrgUser()` authz first, look up `pending_approvals` row for `token.id`, then `wait.completeToken(...)` outside any `db.transaction`.
- `batchTriggerAndWait` is for fan-in over your own tasks; `Promise.all` over `wait.forToken` is for fan-in over external/human completers. Per-child idempotency key pattern: `idempotencyKeys.create([item.id, 'label'], { scope: 'run' })` — the `scope: 'run'` namespacing handles the parent-run prefix automatically; do not manually prefix with `ctx.run.id`.
- After `batchTriggerAndWait` resolves, inspect per-child `{ ok }` — resolution means settled, not succeeded.
- Never call `wait.completeToken` inside a `db.transaction` that may roll back.

**Misc:**
- The `pending_approvals` table pattern (columns: `refundId`, `waitpointTokenId`) is illustrative; Ch.067 or later lessons implementing a real approval UI need this shape.
- `metadata.set('failedSections', failures.length)` established as a `batchTriggerAndWait` post-processing pattern; Ch.067 drills `metadata.set` for live progress.
- No live coding sandbox — server runtime constraint confirmed for all Trigger.dev lessons in this chapter.
- Trigger.dev API surface flagged as version-volatile; official docs are the canonical reference over any tutorial.

---

## Lesson 7 — Wiring our app — which workloads go where

**Taught:** Applied the chapter's decision rule to seven concrete app workloads, producing a placement table (four on platform default, three on Trigger.dev) with a named reason per row; corrected the "Trigger.dev is a separate codebase" misconception; named the three-variable env surface; established the callee-before-caller deploy ordering rule and its automation via Trigger.dev atomic deployments + Vercel integration.

**Cut:** The chapter outline named the Stripe reconciliation sweep and notification dispatcher as workloads the course "wires through Trigger.dev" — both are forward notes only, neither is built in this lesson or this chapter. The outline listed `trigger/` as `src/trigger/` — the course-established path is root-level `trigger/` (per L4 continuity notes). No R2 presigned-PUT counter-example contrast was included (deferred to Ch.068 L5).

**Debts:**
- Notification dispatcher code, registry, channels, preferences, dedup — Ch.070/071.
- Stripe reconciliation sweep implementation — forward note, not built in this course.
- Full deploy pipeline / CI depth — Unit 20.
- `@t3-oss/env-nextjs` validation of the three background-work env vars — established pattern from Unit 11; named here, not drilled.
- Admin UI for surfacing run state / `pending_approvals` — Ch.070.
- `notifyEvent` Server Action helper generalisation — Ch.070 (L4's direct trigger call is the warm-up shape).

**Terminology:**
- **"Two runtimes, one codebase"**: tasks in `trigger/` import the same `lib/`, Drizzle schema, `tenant-db.ts`, and write the same Postgres/audit log — only the compute surface differs (Vercel function vs Trigger.dev worker).
- **"Org context is cargo, not ambient"** (re-anchor from L3): no Better Auth session in a task; `organizationId` rides in the payload, tenancy re-derived via `tenantDb(payload.organizationId)`.
- **"Escalate on a condition, never on a vibe"** (re-anchor from L3): the placement decision must name a crossed threshold; consistency with another workload is not a threshold.
- **"Predicate-idempotent"** (re-anchor from L2): trial-expiry sweep's `UPDATE WHERE` invalidates its own `WHERE` clause on first run — no dedup key needed, Vercel Cron stays correct.
- **"Callee before caller"**: deploy the task to Trigger.dev workers before deploying the app that triggers it; Trigger.dev v4 atomic deployments + Vercel integration automate this ordering.
- **`TRIGGER_SECRET_KEY`**: server-only, distinct per environment (dev/staging/prod); sharing across environments is the same blast-radius mistake as sharing a webhook signing secret.
- **`TRIGGER_PROJECT_REF`**: `proj_…` identifier in `trigger.config.ts` tying the repo to the cloud project.
- **`CRON_SECRET`**: re-anchored from L2; listed here to show the complete background-work env surface in one place.

**Patterns and best practices:**
- Canonical placement rule (re-anchor): "code stays at the lowest tier that meets the durability, latency, and time-budget requirement."
- Audit-log row: always inside `db.transaction` with the mutation — never deferred via `after()` or a task.
- Analytics event after checkout: `after()` — must not roll back the DB transaction on failure.
- Invitation email: inline `await` — single sub-second call, user must know it sent; surfacing a failure immediately is preferable to hiding it behind a queue.
- Trial-expiry sweep: Vercel Cron — predicate-idempotent `UPDATE`, fits function budget, no condition crossed.
- `TRIGGER_SECRET_KEY` must be **distinct per environment** — never shared across dev/staging/production.
- App-side trigger seam: Server Action reads `organizationId` from session via `requireOrgUser()` and passes it as payload cargo; task re-derives `tenantDb(payload.organizationId)` — the seam is explicit, never assumed.

**Misc:**
- Trigger.dev v4 is Apache-2.0; self-hosting is a one-sentence off-ramp (workers move, codebase stays).
- Trigger.dev billing unit is per-run / per-run-minute / per-concurrency-seat — different from Vercel's per-invocation; do not compare them directly (category error, established in L3).
- A per-task run-count spike almost always signals a missing idempotency key or retry storm, not real growth.
- Ch.067 project: clone starter, write `export-csv` `schemaTask`, one checkpoint per page with per-page idempotency key, final "export ready" email, verify in dashboard, kill worker mid-run to prove durability.
- L8 is the chapter quiz.

---

## Lesson 5 — Surviving crashes: retries, waits, and idempotency keys

**Taught:** Durable execution (checkpoints at `await wait.*` and `triggerAndWait`), declarative retry config with exponential backoff + jitter, `AbortTaskRunError` for permanent failures, the duplicate-side-effect trap from run-level retries, `idempotencyKeys.create` with `scope: 'run'` / `'global'` / `'attempt'`, `idempotencyKeyTTL` as a duration string (default 30 days), the cross-step loop key pattern, `wait.for` / `wait.until` durable pauses and their gotchas, and cooperative cancellation via `AbortSignal`.

**Cut:** The chapter outline's `ctx.run.abortSignal` / `ctx.signal` accessor was intentionally kept prose-only (accessor name unconfirmed across v4 releases; a downstream-agent note embeds the caution directly in the lesson). Run priority (`priority` integer on `tasks.trigger`) was not taught — chapter outline listed it as "named, not drilled" and the lesson omitted it entirely. `onSuccess` / `onFailure` lifecycle hooks were also omitted (chapter outline flagged them; lesson's synthesis example did not need them). `wait.forToken` was forward-linked but not introduced — deferred to L6 as planned.

**Debts:**
- `metadata.set(...)` used in the synthesis example (`metadata.set('page', page)`) with a one-line note; drilled in L6 / Ch.067.
- Mandatory `timeout` on external-signal waits forward-linked in a `:::caution` note — drilled in L6 (`wait.forToken`).
- Cancellation UI and surfacing run state in-app deferred to Ch.070.
- The accessor for the in-task abort signal (`ctx.signal` vs `ctx.run.abortSignal`) was deliberately left prose-only; Ch.070 or a later lesson must confirm the field name against live v4 docs before adding a code snippet.

**Terminology:**
- **Durable run**: a run that survives worker crashes, redeploys, and platform restarts by checkpointing between steps and resuming a new worker from the last checkpoint.
- **Checkpoint**: a saved snapshot of run progress written at every `await wait.*`, every `await *.triggerAndWait`, and at the end of every attempt.
- **Worker**: the Trigger.dev compute process running a task — separate from the Vercel function that triggered it.
- **Run-level retry**: the runtime re-running the whole task from the most recent checkpoint on an unhandled throw, per the task's `retry` config.
- **Call-level retry**: an SDK or HTTP client quietly retrying a single failed request (e.g. a 429 on one fetch) — restarts only that call, not the run.
- **`AbortTaskRunError`**: throw to fail the run immediately, skipping all remaining retries. For permanent failures that retrying cannot fix.
- **Exponential backoff with jitter**: retry delays that grow geometrically (`factor`) and are randomized (`randomize: true`) so retries spread out instead of stampeding a recovering service.
- **Idempotency key**: a stable key passed to `trigger` / `triggerAndWait` / `wait.forToken`; within its TTL, the same key returns the original run instead of starting a new one.
- **`idempotencyKeyTTL`**: duration string (`'60s'`, `'5m'`, `'24h'`, `'3d'`), **not** milliseconds; default is **30 days**.
- **`idempotencyKeys.create(parts[], { scope })`**: hashes an array of parts into a stable key; `scope: 'run'` (default) namespaces to the parent run id; `scope: 'global'` namespaces to the key alone.
- **`scope: 'run'`**: default scope — key is tied to the parent run id, so a retry regenerates the same key and the child run returns cached.
- **`scope: 'global'`**: key hashed alone — "this trigger runs once, ever" — for business keys from the app (e.g. one export per org per day).
- **`wait.for`**: durable relative pause (`await wait.for({ seconds: 2 })`); checkpoints, frees the worker, resumes after the duration. Not `setTimeout` — `setTimeout` holds the worker and evaporates on crash.
- **`wait.until`**: durable absolute pause to a wall-clock `Date`; same checkpoint/free/resume semantics; resolves **immediately** if the date is already in the past (does not error).
- **Cooperative cancellation**: the runtime stops new steps on cancel; an in-flight step halts only if it honors the `AbortSignal` forwarded from the run.
- **"Durability lives in the seams, not the steps"**: the lesson's central mental model — checkpoints exist only at `wait.*` / `triggerAndWait` boundaries; code inside a single step is not snapshotted line by line.
- **Retry on transients, abort on permanents**: the code-review heuristic — transients (5xx, network, 429) throw normally; permanents (validation, 400 stable payload) throw `AbortTaskRunError`.

**Patterns and best practices:**
- Idempotency keys are **required** on every `trigger`, `triggerAndWait`, and `wait.forToken` — non-optional, same discipline as Server Action input schemas.
- Cross-step loop pattern: `for (const item of items) { const key = await idempotencyKeys.create([item.id, 'action'], { scope: 'run' }); await childTask.triggerAndWait(payload, { idempotencyKey: key }); }` — `scope: 'run'` means a parent retry regenerates the same keys, completed sends return cached.
- Final side effects (e.g., the "export ready" email) also need their own idempotency key — not just per-step keys inside the loop.
- `wait.for` between loop iterations serves double duty: checkpoint boundary (save point) and pacing (prevents hammering the DB/downstream).
- Retry config: set `randomize: true` always; `maxAttempts: 5, factor: 1.8` is the lesson's established curve — use as the baseline.
- Never wrap an external call in a manual `try/catch` + retry loop when run-level retries already apply — stacking two retry layers multiplies attempts and corrupts the backoff.
- `wait.until` with a past date resolves immediately — always check the date before deciding to act if "do nothing after this date" is the intent.

**Misc:**
- The paginated export synthesis (`exportInvoices` schemaTask) in this lesson is the direct precursor to Ch.067's CSV export build — Ch.067 can reference it as established shape without re-deriving the mechanics.
- `metadata.set('page', page)` established as the live-progress pattern in the synthesis example; Ch.067 / L6 drill it as a topic.
- The chapter outline's `ctx.run.id` manual string-prefix pattern (`\`${ctx.run.id}:page:${page}\``) was superseded by `idempotencyKeys.create([...], { scope: 'run' })` — the manual prefix is named only as the underlying mental model; actual code in Ch.067 must use `idempotencyKeys.create`.
- No live coding sandbox in this lesson (server runtime; confirmed constraint for any later lesson in the chapter that touches Trigger.dev).
