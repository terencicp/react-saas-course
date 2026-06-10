# Lesson outline — Chapter 066, Lesson 4

## Lesson title

- **Title:** Defining and triggering Trigger.dev tasks
- **Sidebar label:** Tasks, queues, schedules

## Lesson framing

This is the API-surface lesson of the chapter — the biggest one, because every later lesson (L5 retries/waits, L6 waitpoints, Ch.067 project) assumes the student can already define, type, trigger, queue, and schedule a task. L1–L3 built the *decision* layer (the latency ladder, the five trigger conditions, the `StateMachineWalker`); they deliberately did not teach a single line of SDK. L3 left an explicit debt: "the SDK surface is L4's job," and flagged its own code sketches as illustrative-not-taught. This lesson pays that debt.

Core stance, inherited from the chapter and the pedagogical guidelines: **decisions before syntax**, but here the decision work is mostly done, so the lesson is allowed to be syntax-forward — with one twist that keeps it senior. The dominant pedagogical hazard this lesson exists to neutralize is **v3-to-v4 drift**: search results, blog posts, and AI completions in 2026 are saturated with Trigger.dev v3 examples, and the two biggest v4 breaks (queues declared in code, not at trigger time; concurrency split per-tenant via `concurrencyKey`, not a dynamically-named queue) are exactly where a student copying old code will write something that *deploys* but behaves wrong. So the lesson's spine is: teach the v4 shape, and at each break, name the v3 shape the student will encounter and why it no longer works. This is the "teach the form they will write" filter applied defensively.

**Critical correction the writer must honor (verified against current Trigger.dev docs, June 2026):**
- **Directory:** tasks live in `trigger/` at the **project root** (not `src/trigger/`). The chapter outline says `src/trigger/`; the Code conventions doc and the actual v4 default (`dirs: ["./trigger"]`, auto-detected by folder name) both say `trigger/`. Use `trigger/`. The path is configurable via `dirs` in `trigger.config.ts`, but the course default is root-level `trigger/`. State this once; do not belabor.
- **Per-tenant concurrency:** the chapter outline's pattern — `tasks.trigger(..., { queue: { name: \`org-${orgId}\`, concurrencyLimit: 1 } })` — is **v3-flavored and wrong for v4**. v4 does **not** let you set `concurrencyLimit` (or declare a new queue) at trigger time. The correct v4 pattern is a **predeclared queue** plus a **`concurrencyKey`** passed at trigger time: `myQueue.trigger(payload, { concurrencyKey: organizationId })` (or `tasks.trigger('id', payload, { queue: 'export', concurrencyKey: organizationId })`). The `concurrencyKey` splits the queue's concurrency limit into an independent lane per key — sequential per org (with `concurrencyLimit: 1`), parallel across orgs. Teach `concurrencyKey`. Mention the fairness caveat lightly (a high-volume tenant can still consume environment concurrency; v4.4.x added master-queue fairness) as a one-line forward note, not a drill.
- **Triggering API:** v4's first-class trigger is the **task-instance method** — `exportCsv.trigger(payload)` / `exportCsv.triggerAndWait(payload)` / `exportCsv.batchTriggerAndWait([...])`. The string form `tasks.trigger<typeof exportCsv>('export-csv', payload)` exists and is what you use when you can't import the task (e.g. triggering across a service boundary). The chapter outline leads with the `tasks.trigger` string form; lead instead with the **instance method** as the default (cleaner types, no string id to drift), and present `tasks.trigger` as the import-free escape hatch. Both carry full payload types.

Mental model the student should leave with: **a task is a durably-identified function you call from anywhere; its `id` is its API, its schema is its contract, its queue is its back-pressure valve, and it runs in its own world with no request context.** Five concrete capabilities by the end: (1) scaffold `trigger.config.ts` + a `trigger/` file; (2) write a `schemaTask` with a Zod payload; (3) trigger it fire-and-forget from a Server Action and read back the handle; (4) put it on a queue with a concurrency limit and split that limit per tenant with `concurrencyKey`; (5) declare both a static and a dynamic schedule. Retries, waits, and waitpoints are explicitly *not* here — L5/L6.

Code-sample strategy: this lesson is code-dense, so the components do heavy lifting. `Code` for short canonical shapes; `AnnotatedCode` for the two anchor task definitions (the structure is the lesson, and attention needs steering line-by-line); `CodeVariants` for the v3-vs-v4 contrasts (the single highest-value teaching device in this lesson) and for static-vs-dynamic schedules; `FileTree` for the directory topology; `DiagramSequence` for the trigger→enqueue→worker→run lifecycle and for the queue/`concurrencyKey` fan-out; one D2 system diagram is *not* re-drawn (L3 owns the architecture diagram — reference it). Exercises are static-graded (the Trigger.dev SDK is server-runtime and can't execute in the browser ReactCoding/Sandpack iframes — see scope), except the payload-schema exercise which uses `ZodCoding` (real Zod runs in-browser). No YouTube video — the topic is too version-volatile for an embedded third-party video to stay correct; an `ExternalResource` link to the official v4 docs is the right external pointer.

## Lesson sections

### Introduction (no header)

Open on the senior question, phrased as continuity from L3: the student has decided (via the `StateMachineWalker`) that a workload *earns* Trigger.dev — now what is the minimum API surface to actually define, type, trigger, queue, and schedule it? Name the lesson's one recurring hazard up front in one sentence: most Trigger.dev code the student will find online is v3, and the few places v4 broke compatibility are exactly the places that bite silently. Preview the five capabilities. Re-anchor the "task is its own world — org context is cargo, not ambient" reflex from L3 in one line so the payload shape later feels inevitable. Keep it to ~4 short paragraphs, warm and terse.

Reasoning: the guidelines want the senior question implicit in the intro and a concrete motivating problem; the v3-drift framing *is* the motivating problem and it differentiates this from a docs dump.

### Project setup — `trigger.config.ts` and the `trigger/` folder

Goal: orient the student in the file topology before any task code, so every later snippet has a home.

Content:
- `npx trigger.dev@latest init` is the one-time bootstrap — names the project, writes `trigger.config.ts`, creates the `trigger/` folder. Topology only; the project lesson (Ch.067 L2) walks the generated starter. Do not reproduce the full init transcript.
- `trigger.config.ts` lives at the **repo root** and declares: `project` (the project ref, e.g. `proj_...`), `dirs: ["./trigger"]` (where tasks are found — auto-detected by folder name but declare it explicitly per Code conventions), `runtime: "node"`, and build/runtime config. Show a minimal `defineConfig({...})` via `Code`.
- **Flag the directory decision explicitly** (the writer should keep this as a short `Aside` note, not bury it): the course puts tasks in **root-level `trigger/`**, one file per task (`trigger/notify-org-members.ts`), the task exported as a named export. This is the v4 default and the Code-conventions rule. (Some older examples and the chapter's own brainstorm say `src/trigger/` — that's a non-default `dirs` value; the course uses root `trigger/`.) Reasoning for surfacing it: this is a real ambiguity in the wild and the task-finding CLI silently ignores files outside `dirs`, so a student who guesses wrong gets "no tasks found" with no error pointing at the cause.
- CLI loop, named only (Ch.067 drills it): `npx trigger.dev@latest dev` runs a local worker that registers tasks and streams logs; `npx trigger.dev@latest deploy` ships them. Two deploy steps in CI — Trigger.dev and Vercel — one codebase; deploy ordering is L7's job, name it as a forward note.

Components:
- `FileTree` showing the repo root with `trigger.config.ts`, `trigger/notify-org-members.ts`, `trigger/export-csv.ts`, alongside `app/`, `lib/`, `db/` — makes "separate folder, same codebase" visual and concrete. Caption: tasks share the codebase (same Drizzle schema, same `lib/`), they just live in their own folder and deploy on their own pipeline.
- `Code` (ts) for the minimal `trigger.config.ts`.
- `Aside` (note) for the `trigger/` vs `src/trigger/` flag.

`Term` candidates: **project ref** (the `proj_...` identifier tying local code to a Trigger.dev cloud project), **task-finding / `dirs`** (the config array Trigger.dev scans for task files).

### `task` and `schemaTask` — defining the unit of work

Goal: the student can write a typed task and knows why `schemaTask` is the course default.

Content, staged simple→complex:
1. **`task()` — the base primitive first** (simplified model). `task({ id, run })`. The `id` is **durable identity** — runs reference the task by this string, it persists across deploys, the dashboard groups by it. The teaching line: *treat `id` like a route path or a DB table name — stable, code-reviewed, never renamed casually.* `run: async (payload, { ctx }) => {...}`. Note `payload` is untyped (`unknown`-ish) on bare `task` unless you annotate — which is the motivation for the next step.
2. **`schemaTask()` — the course default** (add complexity). Same shape plus `schema:` a Zod 4 object. The payload is **parsed before the body runs**; an invalid payload throws at *trigger time*, not three minutes into the run. Frame this as the exact same discipline as Server Action input validation from Ch.042 — validate at the boundary, trust the body. The schema is also rendered in the dashboard as the task's input contract. Note v4 accepts any **Standard Schema** validator (Zod, Valibot, ArkType), so the choice is structural, not locked — Zod 4 is the course's.
3. Payload schema *location*: lives next to the task by default; hoist to `lib/triggers/<task>.schema.ts` only when a caller needs to import it too (Code conventions rule). One line.
4. The **`ctx` argument**: `ctx.run.id` (durable run id — the natural idempotency key, foreshadow L5), `ctx.attempt.number` (which retry — foreshadow L5), `ctx.environment` (dev/staging/prod). The hard rule restated: **no `headers()`, no `cookies()`, no session, no `requireOrgUser()`** — the task is its own world, so org context must arrive in the payload. This is the L3 reflex made concrete.

Components:
- `CodeVariants` with two tabs, **"Bare `task`"** vs **"`schemaTask` (course default)"**, same `notify-org-members` task in both — the diff is the `schema` key and the now-typed `payload`. Each tab's prose makes the trade explicit: bare task = you hand-validate or trust blindly; schemaTask = parsed-at-boundary, typed body, dashboard contract. This is the cleanest way to show *why* the default is `schemaTask` without a wall of prose.
- `AnnotatedCode` (ts, ~12 lines) stepping through the canonical `schemaTask`: step 1 the `id` (durable API, color blue); step 2 the `schema` with `z.object({ organizationId: z.uuid(), eventType: z.string() })` (boundary contract, color green); step 3 `run(payload, { ctx })` with the destructured typed payload (color blue); step 4 the `ctx` fields and the "no request context" rule (color orange — this is the watch-out). Use the `notify-org-members` task as the anchor so it threads to the worked example.
- `CodeTooltips` is optional on the `schemaTask` block to surface the inferred `payload` type (`{ organizationId: string; eventType: string }`) on hover — reinforces that the schema *is* the type with no parallel interface. Recommend it lightly; the writer can use `AnnotatedCode` alone if combining is awkward.

Exercise: **`ZodCoding`** — give the student the prose spec of a payload ("an export task needs the organization id as a UUID, a `since` ISO date, and an optional `format` that is `'csv'` or `'json'`, defaulting to `'csv'`") and have them write the Zod 4 schema; pinned `safeParse` scenarios check a valid payload, a bad UUID, and the default applying. This is runnable (real Zod in-browser) and drills the v4 top-level builders (`z.uuid()`, `z.iso.date()`, `z.enum`) the Code conventions mandate. Reasoning: the schema is the one part of a task that genuinely executes in a browser sandbox, so it's the one place a live-coding exercise is honest.

`Term` candidates: **durable identity** (the task `id` persists across deploys; runs reference it), **Standard Schema** (the validator-agnostic interface v4 accepts — Zod/Valibot/ArkType), **`ctx`** (per-run context object: run id, attempt, environment — not request context).

### Triggering a task from your app

Goal: the student can fire a task from a Server Action, knows it's fire-and-forget, and knows which trigger method to use where.

Content:
- **Lead with the instance method** (the v4 default): import the task, call `await exportCsv.trigger({ organizationId, since })`. Returns a **handle** (`{ id, ... }`) — the run id you can later look up, cancel, or surface. The generic/typing is automatic because you imported the typed task. Frame: this is the call you make from a Server Action once a workload has crossed a `StateMachineWalker` threshold.
- **`trigger` is fire-and-forget**: it returns the moment the run is *enqueued*, not when it *completes*. The Server Action gets the handle back in milliseconds and returns its `Result` to the user; the work happens off the request. This is the whole point — restate the L1 "every second on the request path is the user's" thread: triggering is how you get off it.
- **`triggerAndWait`** — only ever *inside another task body*, never from request code. It pauses the parent run until the child completes and returns the child's result (typed). Calling it from a Server Action would block the request and hit `maxDuration` — name this as the single most common misuse. Deep mechanics (it's a waitpoint, it's durable) are L5/L6; here just the "where it's legal" rule.
- **`batchTriggerAndWait`** — named once: many children, one wait, for parallel fan-out with typed results. Drilled in L5/Ch.067.
- **The string-id escape hatch**: `tasks.trigger<typeof exportCsv>('export-csv', payload)`. Use only when you can't import the task instance (cross-service, or the trigger site shouldn't pull the task's deps). The generic recovers the payload type from a `typeof` import even without calling the instance. Present as the fallback, not the default — this inverts the chapter outline's ordering deliberately (flag: writer should note the chapter outline led with the string form; instance-first is the better v4 teaching default).

Components:
- `Code` (ts) for the Server Action snippet: inside an action that has already called `requireOrgUser()`, destructure `orgId`, `await exportCsv.trigger({ organizationId: orgId, since })`, return `ok(...)`. Keep it tiny — this is the seam, not a full action (Ch.043 owns the action shape; reference it).
- `DiagramSequence` — the **trigger lifecycle**, 4–5 steps, the single most important visual in the lesson. Steps: (1) Server Action calls `.trigger(payload)`; (2) payload validated against the schema, run enqueued, handle returned to the action (action returns to user *now*); (3) a Trigger.dev worker picks the run off the queue; (4) `run()` executes in its own world (no request, payload is all it has); (5) status + logs + payload visible in the dashboard. Pedagogical goal: cement that the response and the work are decoupled, and that the worker is a *separate process* with only the payload — which is why org context must be cargo. Per-step captions; reuse L3's three-box architecture mentally but do not re-draw the static diagram.

Exercise: **`Sequence`** (ordering drill) — give the shuffled lifecycle steps (action validates input → `.trigger()` enqueues → action returns Result to user → worker dequeues → `run()` executes → dashboard shows the run) and have the student order them. Reasoning: the decoupling of "action returns" from "work runs" is the conceptual core and ordering drills it without needing executable code. Optionally a small **`MultipleChoice`**: "You need the export's row count to show in the action's response. Which trigger call?" — correct answer: *none from the action; the action can't wait — trigger fire-and-forget and surface the result later (dashboard/metadata/realtime)*, with `triggerAndWait` as the tempting wrong answer that would time out. This directly inoculates the top misuse.

`Term` candidates: **handle** (the object `trigger` returns — carries the run id for later lookup/cancel), **fire-and-forget** (returns on enqueue, not on completion).

### Queues and concurrency — back-pressure you declare in code

Goal: the student can declare a queue, set a concurrency limit as back-pressure, and — the headline — split that limit per tenant with `concurrencyKey`. This section carries the chapter's most important v3→v4 correction.

Content, staged:
1. **Why queues exist**: by default every task runs against the environment's concurrency. A queue lets you *cap* how many runs execute at once — back-pressure to protect a downstream (Resend's rate limit, a third-party quota, your DB pool). The senior framing: *set the concurrency limit to the smallest number that keeps the downstream happy.* Concurrency lives on the **queue**, never on the task body — there is no "limit inside `run`."
2. **The v4 break — queues declared in code** (the headline trap). In v3 you could pass a queue with a concurrency limit *at trigger time*. In v4 that is rejected: queues are declared at **module scope** with `queue({ name, concurrencyLimit })`, *before* `dev`/`deploy`, and tasks reference them. The teaching line: *treat a queue like a database table — declared in code, "migrated" at deploy, not conjured at call time.* This is the single highest-value sentence in the lesson because v3 code is everywhere and the failure is a runtime rejection, not a type error.
3. **Assigning a queue to a task**: `task({ id, queue: myQueue, run })` (or inline `queue: { concurrencyLimit: 1 }` when the queue is task-private). Show the named-queue form as the default so it threads into per-tenant.
4. **The SaaS problem — one global queue starves tenants.** A single `export` queue with `concurrencyLimit: 5` serializes *all* orgs through 5 slots; one org dumping 1000 exports blocks everyone. State the problem before the fix.
5. **The v4 fix — `concurrencyKey`** (the second big correction). Pass `concurrencyKey: organizationId` **at trigger time** against the *predeclared* queue: `exportCsv.trigger(payload, { queue: 'export', concurrencyKey: organizationId })`. This splits the queue's limit into an **independent lane per key** — with `concurrencyLimit: 1`, each org runs strictly sequentially, but orgs run in parallel with each other. Contrast hard with the v3-flavored anti-pattern the chapter outline reaches for (`queue: { name: \`org-${id}\`, concurrencyLimit: 1 }` at trigger time) — that does not work in v4 because you can neither name a new queue nor set its limit at trigger time. The *key*, not the queue *name*, is what's parameterized per tenant.
6. **The fairness caveat** (one line, forward note): `concurrencyKey` isolates lanes but each lane still draws from environment concurrency, so a tenant with many keys can still consume capacity; Trigger.dev v4.4.x added master-queue fairness to bound this. Name it so the student knows the edge exists; do not drill.

Components:
- `CodeVariants`, **two tabs, "v3 (won't work in v4)"** vs **"v4 (`concurrencyKey`)"** — the marquee teaching device. Tab 1: the trigger-time dynamic-queue shape with a caption "this is what most search results and AI completions still produce — v4 rejects it: you can't declare a queue or set its limit at trigger time." Tab 2: predeclared `export` queue at module scope + `trigger(payload, { concurrencyKey: organizationId })`, caption explaining the per-key lane. Mark Tab 1 with `color`/title making clear it's the wrong/old shape (CodeVariants supports a per-tab title). Reasoning: a before/after on the exact trap is worth more than any prose; this is the place the lesson most earns its keep.
- `DiagramSequence` **or** an `ArrowDiagram` for the per-tenant lanes: show one `export` queue with `concurrencyLimit: 1`, three orgs (A/B/C) each triggering 3 runs; visualize three independent lanes each draining one-at-a-time in parallel, vs the global-queue version where all 9 runs share one lane. Pedagogical goal: make "sequential per org, parallel across orgs" a picture, not a sentence. If `DiagramSequence`: step 1 the naive shared queue (9 runs, 1 lane, B and C wait on A); step 2 the `concurrencyKey` version (3 lanes, all progress). Keep it inside a `Figure` if using `ArrowDiagram`; `DiagramSequence` brings its own card.

Exercise: **`CodeReview`** — present a short diff/snippet of a teammate's PR that triggers an export with the v3-style `{ queue: { name: \`org-${orgId}\`, concurrencyLimit: 1 } }` at trigger time, and have the student leave the review comment. Kernel rubric phrase: *"queues must be predeclared in code; per-tenant isolation uses `concurrencyKey`, not a trigger-time queue name/limit."* Reasoning: this is a senior-mindset, review-the-PR moment and CodeReview is built exactly for catching a plausible-looking wrong pattern. Fallback if CodeReview feels heavy here: a **`Buckets`** sorting "declared at module scope" vs "passed at trigger time" across {`queue name`, `concurrencyLimit`, `concurrencyKey`, `priority`} — but CodeReview is the stronger fit for the v3 trap.

`Term` candidates: **concurrency limit** (cap on simultaneous runs of a queue — back-pressure; re-anchor from L3), **`concurrencyKey`** (splits a queue's limit into one independent lane per key value — the per-tenant primitive), **back-pressure** (limiting in-flight work so a downstream isn't overwhelmed).

### Scheduled tasks — static and dynamic

Goal: the student can declare a code-defined recurring task (static) and create per-tenant schedules at runtime (dynamic), and knows when a Trigger.dev schedule beats Vercel Cron (the L2 second look).

Content:
- **Static — `schedules.task`**: `schedules.task({ id, cron, run })`. One global schedule, declared in code, deployed with the task. The `run` receives a scheduled-payload (`timestamp`, `lastTimestamp`, `externalId`, `upcoming`). Frame as the Trigger.dev analog of a Vercel Cron entry, but durable and observable for free.
- **`cron` as string vs object — DST safety**: the string form is **UTC only** (`cron: "0 9 * * *"`), which drifts through DST. The **object form** is timezone-aware: `cron: { pattern: "0 9 * * 1-5", timezone: "America/New_York" }` (IANA zone, optional `environments`). The senior rule: **default to the object form for any business-hours / wall-clock schedule; the plain string is fine only for UTC-anchored sweeps.** This ties to the L2 "UTC cron drifts through DST" thread and the Temporal `ZonedDateTime` discipline from Code conventions (zone matters → name the zone).
- **Dynamic — `schedules.create`**: created at runtime, per tenant or per resource. **Note the shape difference (verified):** the imperative form is a *flat* object — `cron` is **always a string** here and `timezone` is a separate top-level field: `await schedules.create({ task: nightlyDigest.id, cron: "0 9 * * *", timezone: "America/New_York", externalId: organizationId, deduplicationKey })`. `externalId` ties the schedule to your domain row for later lookup/cancel (`schedules.list({ externalId })`, `schedules.deactivate`, `schedules.del`). `deduplicationKey` makes the create idempotent — same key updates rather than duplicates. This is the primitive behind "each org picks its own digest time."
- **Schedules vs Vercel Cron — the second look** (closes L2's deferral): a Trigger.dev schedule earns its place when the cadence must be **dynamic/per-tenant** or the work needs Trigger.dev's durability/retries anyway. A fixed daily UTC sweep that fits Vercel's function budget **stays on Vercel Cron** — do not migrate a working cron for uniformity. One paragraph; reference the `StateMachineWalker` from L2/L3 as the canonical decider rather than re-drawing it.

Components:
- `CodeVariants`, **"Static (`schedules.task`)"** vs **"Dynamic (`schedules.create`)"** — two tabs, each with its prose. This is the clearest way to show that the *declaration site* differs (module scope vs runtime call) and that the `cron`/`timezone` *shape* differs between the two forms (object-with-`timezone` in static, flat-`timezone`-sibling in dynamic). The shape asymmetry is a real gotcha; the side-by-side makes it impossible to miss. The writer must keep the static tab using `cron: { pattern, timezone }` and the dynamic tab using top-level `cron` string + `timezone` — getting this right is the point.
- `Code` (ts) inline for the `schedules.create` call from a Server Action (e.g. an org settings "set my digest time" action), showing `externalId: organizationId`.

Exercise: **`Dropdowns`** over a fenced code block with blanks — a static `schedules.task` and a `schedules.create` call with the `cron`/`timezone`/`externalId`/`pattern` fields blanked, student selects the right token for each blank (forcing the object-vs-flat distinction and the timezone placement). Reasoning: the failure mode here is *shape confusion* (putting `timezone` inside the `cron` object on the imperative form, or passing a string where the static form wanted an object); a fill-in-the-blank targets exactly that without executable code.

`Term` candidates: **`externalId`** (your domain id attached to a dynamic schedule for later lookup/cancel), **`deduplicationKey`** (makes `schedules.create` idempotent — same key updates instead of duplicating), **IANA timezone** (named-zone string like `America/New_York` that makes a cron DST-aware).

### What the dashboard gives you for free

Goal: cement observability as part of the threshold calculus — the payoff that justified the second platform back in L3.

Content (short, ~2–3 paragraphs):
- Every run is visible with its **payload, status** (queued / executing / completed / failed / retrying), start time, duration, **every log line**, and (preview of L5) every retry and wait. The contrast that lands it: the equivalent on Vercel Cron is `console.log` plus hope — you built observability by hand at the lower tiers, and that hand-building cost *was* part of the L2/L3 threshold. Here it's free.
- Name **`metadata.set(...)`** once as the live-progress channel (write `"47 of 200"` to the run, watch it update in the dashboard/in-app inspector) — drilled in L6/Ch.067, named here so the worked example can gesture at it.
- **Per-run setup** named in one line, using the **current v4 mechanism**: **middleware + the `locals` API** (`locals.create<T>()` for a per-run resource like a DB connection, set up in middleware), with a global `init.ts` at the `trigger/` root for global lifecycle hooks. Named, not drilled. **Do NOT name the per-task `init:` hook — it is deprecated in v4** (verified June 2026: replaced by `locals`/middleware). The chapter outline's `init: async () => ({...})` line is the deprecated v3 shape; skip it.

Components:
- `Screenshot` of the Trigger.dev run detail (a run with payload + status + a couple log lines) **if** a clean asset is available; otherwise an `ArrowDiagram`/HTML mock of the run row (payload chip, status pill, duration, log lines) inside a `Figure`. Pedagogical goal: make "observability for free" concrete and tangible rather than asserted. The writer should prefer a real screenshot; per project memory, verify any embedded screenshot via DOM, and do not block the lesson on a blank-frame capture artifact.

`Term` candidates: **`metadata`** (mutable per-run object the dashboard renders live — progress channel), **`locals`** (v4 per-run resource container, populated in middleware — the current replacement for the deprecated `init` hook).

### Worked example — the `notify-org-members` task end to end

Goal: assemble every piece of the lesson into one coherent, realistic task the student could ship — the "I can define and run a task" proof.

Content — walk the full path:
1. **The task** (`trigger/notify-org-members.ts`): `schemaTask({ id: 'notify-org-members', schema: z.object({ organizationId: z.uuid(), eventType: z.string() }), queue: notificationsQueue, run })`. Inside `run`: re-derive tenancy from the payload via `tenantDb(organizationId)` (the L3 "org context is cargo" reflex, now executed), read the org's members, send each an email via the shared `lib/email.ts`. Keep the body realistic but lean — the *send-loop with per-recipient idempotency keys* is explicitly L5's material, so here the body can be a straight loop with a `// L5 will make each send idempotent` marker rather than the full guarded shape. Flag this staging so the writer doesn't prematurely import L5.
2. **The queue**: `const notificationsQueue = queue({ name: 'notifications', concurrencyLimit: 5 })` at module scope in the same file.
3. **The trigger**: from a `notifyEvent` Server Action helper (the one L7 will generalize), `await notifyOrgMembers.trigger({ organizationId: orgId, eventType }, { concurrencyKey: orgId })` — fire-and-forget, per-org lane, returns the handle.
4. **The lifecycle**: action triggers → enqueued on the `notifications` queue under the org's `concurrencyKey` lane → worker picks it up → `run` reads members and sends → dashboard shows the run with its payload and logs.

Components:
- `AnnotatedCode` (ts, ~16 lines, cap `maxLines` ~16) over the full `trigger/notify-org-members.ts` — the capstone walkthrough. Steps: queue declaration at module scope (back-pressure, blue); `schemaTask` id + schema (contract, green); `tenantDb(organizationId)` re-derivation (the cargo reflex, orange — this is the senior point); the member read + send loop (blue) with the L5 idempotency marker called out; the trigger call from the action in a final step showing `concurrencyKey` (violet). This single block ties the schema section, the queue section, and the trigger section together.
- Optionally a second small `Code` block for the Server Action side if folding it into the `AnnotatedCode` makes that block exceed ~16 lines — split rather than overflow.

Exercise (capstone check): **`Tokens`** over the finished task block — ask the student to click {the durable `id`, the payload contract `schema`, the back-pressure `concurrencyLimit`, the per-tenant `concurrencyKey`, the tenancy re-derivation `tenantDb(organizationId)`} — i.e. identify each load-bearing v4 element by role. Decoys: a `console.log`, an import line, the `eventType` field. Reasoning: a recognition drill over the exact capstone code verifies the student can *name the moving parts by their job*, which is the lesson's stated end state, and it reuses the anchor code one last time. Alternative: a `TrueFalse` round over the chapter's v3-vs-v4 misconceptions ("queues can be declared at trigger time in v4" → false; "`triggerAndWait` is safe to call from a Server Action" → false; "the task `id` can be renamed freely between deploys" → false; "a `schemaTask` validates its payload before the body runs" → true) — strong as a recall closer and cheap to author; the writer may include both if pacing allows, leading with `Tokens`.

### External resources (optional, end)

One or two `ExternalResource` cards: the official Trigger.dev v4 **Tasks** and **Concurrency & Queues** docs. Rationale: the topic is version-volatile, so a direct pointer to the canonical, continuously-updated v4 docs is more durable than any embedded video. No YouTube `VideoCallout` — third-party Trigger.dev videos in 2026 are overwhelmingly v3 and would actively teach the trap this lesson exists to prevent. State this reasoning is *not* for the lesson body; it's guidance to the writer.

## Scope

**Prerequisites to restate briefly, not re-teach** (one line each, link/reference only):
- The five trigger conditions and the `StateMachineWalker` decision tool (L3) — the student arrives having *already decided* a workload earns Trigger.dev; this lesson does not re-justify the platform.
- "A task is its own world; org context is cargo, not ambient" + every payload carries `{ organizationId, ... }` and DB calls use `tenantDb(orgId)` (L3) — restated as the reason the payload schema looks the way it does, not re-argued.
- Server Action canonical shape, `requireOrgUser()`, and the `Result` type (Ch.042/043) — the trigger-from-action snippets assume these; reference, don't rebuild.
- Zod 4 top-level builders (`z.uuid()`, `z.iso.date()`, `z.enum`) (Unit on validation) — used, not taught; the `ZodCoding` exercise drills application, not introduction.
- Vercel Cron, `CRON_SECRET`, UTC cron expressions, at-least-once delivery (L2) — referenced only in the "schedules vs Vercel Cron" second look.
- `tenantDb(orgId)` factory and the Drizzle data layer (Unit 10) — called inside the task body; assumed.

**Explicitly deferred — do NOT teach here:**
- **Retries, backoff, `AbortTaskRunError`, run-vs-call-level retries** → L5. The worked-example send loop is deliberately *not* made idempotent here; leave the `// L5` marker.
- **`wait.for` / `wait.until` durable pauses, idempotency keys as runtime primitive, `idempotencyKey`/`idempotencyKeyTTL`, `idempotencyKeys.create`, cancellation/`abortSignal`, `onSuccess`/`onFailure`, `priority`** → L5. (`ctx.run.id` and `ctx.attempt.number` are *named* as ctx fields here but their idempotency/retry use is L5.)
- **Waitpoints — `wait.forToken`, `publicAccessToken`, `wait.completeToken`, multi-token aggregation, the `metadata` channel in depth** → L6. (`metadata.set` is named once for observability; not drilled.)
- **`triggerAndWait` / `batchTriggerAndWait` deep mechanics** (that they're durable waitpoints, the per-page export pattern) → L5/Ch.067. Here only the "where it's legal to call them" rule.
- **The CSV export task's real code, the paginated `triggerAndWait`-per-page loop, mid-run kill durability proof, parallel-trigger serialization test** → Ch.067 project.
- **Env surface (`TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`), deploy ordering (trigger-before-app), which app workloads go where** → L7.
- **Self-hosting Trigger.dev, full pricing model, DB pool/PgBouncer tuning under task concurrency** → named-only / Ch.039 pointer; out of scope.
- **The architecture diagram** (App → HTTPS → workers → shared Postgres) — established in L3; reference, do not re-draw.

## Code conventions — alignment notes for the writer

Followed (call these out so downstream agents keep them):
- **Directory `trigger/<task-name>.ts`**, one file per task, task as named export (Code conventions §Background work). This *overrides* the chapter outline's `src/trigger/` — flagged above; the writer must use `trigger/`.
- **`schemaTask` over `task`** for any payload task; payload schema next to the task, hoist to `lib/triggers/<task>.schema.ts` only if callers import it.
- **Queues at module scope** via `queue({ name, concurrencyLimit })`; dynamic per-tenant via **`concurrencyKey` at the call site**, not a dynamic queue name. (Code conventions phrase the per-tenant case as "dynamic per-tenant `queue({ name: \`org:${orgId}:exports\` })`" — but the *current v4 mechanism* for per-tenant concurrency isolation is `concurrencyKey` against a static queue; teach `concurrencyKey`, and flag this as a place the conventions doc predates the v4.4.x fairness model. Note for the user below.)
- **Tasks inherit no auth context** → `{ organizationId }` in payload, `tenantDb(orgId)` directly (Code conventions §Background work + §Data layer).
- **Idempotency keys required on every trigger** — *named as a forward note pointing to L5*; the worked example does not yet apply them (deliberate staging), so the writer should add a one-line "L5 makes this idempotent" rather than silently violating the convention. Flag this divergence so it reads as intentional.
- Zod 4 **top-level format builders** (`z.uuid()`, `z.iso.date()`), `z.object` default (§Schemas with Zod 4).
- **Temporal/zone discipline** surfaces in the schedule section: zone matters → name the IANA zone (object-form `cron`), mirroring the `ZonedDateTime`-for-recurring-schedules rule (§Async/time).

Deliberate divergences (noted so they read as intentional, not as errors):
- Worked-example send loop is **not** idempotent (L5 owns that); marked inline.
- `triggerAndWait`/`batchTriggerAndWait` are **named, not drilled** (L5/Ch.067).
- The chapter outline's `tasks.trigger` string-form-first ordering is **inverted** to instance-method-first (better v4 default); flagged.

---

### Note to the user / orchestrator (feedback)

Two corrections this outline makes against source docs the writer must carry, both verified against current Trigger.dev docs (June 2026):

1. **`src/trigger/` → `trigger/`.** The chapter outline says `src/trigger/`; the Code conventions doc and the v4 default (`dirs: ["./trigger"]`, root-level, auto-detected) both say `trigger/`. Decision: **root-level `trigger/`** (configurable via `dirs`, but that's the course default). The `src/trigger/` value is just a non-default `dirs` and the CLI silently ignores files outside `dirs`, so the ambiguity is worth one explicit `Aside`.

2. **Per-tenant queue pattern is the chapter outline's biggest staleness.** The outline (and, less severely, the Code conventions doc) describe per-tenant isolation as a *dynamically-named queue with `concurrencyLimit` set at trigger time*. **v4 rejects setting a queue or its limit at trigger time** — queues are predeclared at module scope, and per-tenant isolation is done with **`concurrencyKey`** passed at trigger time against a static queue. This is also the chapter's marquee v3→v4 teaching break, so getting it wrong would invert the lesson's whole thesis. The outline teaches `concurrencyKey` and contrasts it against the v3 shape. Recommend updating the Code conventions §Background work bullet on per-tenant queues to lead with `concurrencyKey` (it currently implies dynamic queue names), and updating the chapter outline's L4 per-tenant snippet, so later chapters (Ch.067) don't inherit the stale pattern.

3. **The per-task `init:` hook is deprecated in v4.** The chapter outline lists `init: async () => ({...})` as a "named, not drilled" lifecycle hook. Verified (June 2026): v4 deprecated the per-task `init` option in favor of **middleware + the `locals` API** (`locals.create<T>()`), with an auto-loaded `init.ts` at the `trigger/` root for global hooks. The outline swaps the mention to `locals`/middleware. Minor (it was only a named-not-drilled item), but flagged so the chapter outline isn't treated as current here.
