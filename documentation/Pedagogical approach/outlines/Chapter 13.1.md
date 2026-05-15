## Concept 1 — The durability ladder

**Why it's hard.** Students arrive with two implicit categories — "in the request" and "background." The chapter's frame is finer-grained: four tiers separated by named thresholds (downstream latency, function time, retries needed, multi-step orchestration, fan-out, human pauses), each tier carrying a specific cost in operational surface. The misconception this fixes is "background means Trigger.dev" — the right reflex is to stay on the lowest tier that meets the requirements and to be able to name the exact threshold that bumps work up.

**Ideal teaching artifact.** A *climbable ladder diagram* that the chapter returns to at every lesson. Four labeled rungs — Tier 0 (`await` inline), Tier 0.5 (`after()`), Tier 1 (Vercel Cron), Tier 1+ (Trigger.dev) — laid out vertically with the "what survives" property growing as the rungs go up (response budget → invocation budget → schedule cadence → durable runs). Between each pair of rungs, the *threshold* that justifies the climb is labeled on the gap: "downstream latency bloats response," "exceeds `maxDuration`," "needs retries / multi-step / fan-out / pauses." The student should walk away with the rule that you climb only when a threshold is crossed, never for aesthetics. Concept archetype delivered as a single anchor figure.

**Engagement.** A Buckets sort: the student drops eight workloads (Resend invite send, hourly trial sweep, 50 000-row nightly digest, audit log inside transaction, analytics event after response, three-hour data export, third-party callback wait, password-reset email) into the four tiers. Decoys: "I want a separate worker for cleanliness" goes to "no climb justified."

**Components.**
- Primary: a static `Figure` with a hand-SVG of the four-rung ladder, threshold labels on the gaps, two-column annotations per rung ("survives" / "loses"). Single-figure, but recurs as the chapter's anchor in every later lesson — not single-use within the chapter.
- Closing recall: `Buckets` with four target columns (Tier 0 / 0.5 / 1 / 1+) and the eight workloads as draggables.

**Project link.** Chapter 13.2's first beat is "where does the export sit on this ladder, and why" — the ladder figure is the answer key for the student's defense of the Trigger.dev pick.

---

## Concept 2 — `after()` is post-response, not background

**Why it's hard.** The name is misleading — "after" reads as "later, separately." It is neither. `after()` runs inside the same serverless invocation as the response, bounded by the same `maxDuration`, on the same worker. The misconception is that `after()` adds durability; it adds *scheduling within an invocation*. The student needs to feel that the response shipping and the work continuing are concurrent inside a single function, not two stages of a pipeline.

**Ideal teaching artifact.** A *single-invocation timeline* — a horizontal lane diagram. One lane labeled "Vercel invocation" runs the full `maxDuration` budget. Inside the lane, three coloured segments: green for "before response" (the action body), a vertical line where `Response` ships to the client, then a yellow segment for "after-response work" continuing on the same lane until the lane's right edge (the `maxDuration` cap). The student toggles between three scenarios: `after()` completes inside the budget (yellow ends before edge), `after()` runs past `maxDuration` (yellow hits the wall, work truncated silently), function crashes mid-yellow (yellow stops, work lost, no retry). Each scenario annotates the user's experience versus the system's state. Concept archetype.

**Engagement.** A `PredictOutput` round on three Server Actions: one inline `await sendEmail`, one `after(() => sendEmail())`, one `after(() => slowJob())` where `slowJob` exceeds `maxDuration`. For each, predict what the user sees, what the database state is, and whether the email arrived. Three rows, three columns, predictions before reveal.

**Components.**
- New `InvocationTimeline` — inputs: `before` and `after` work descriptors with durations, `maxDuration` cap, optional `crashAt` marker. Renders a horizontal lane with response-line marker, coloured segments, and a wall on the right. Forward-link: 21.3.3 (deploy chapter) reuses the same lane visual for cold start / streaming response framing.
- Closing recall: `PredictOutput` table over three Server Action variants.
- Alternative: hand-SVG `Figure` with three static frames of the timeline (in-budget, truncated, crashed) — loses the toggle but keeps the lane metaphor.

**Project link.** None directly — `after()` does not appear in the 13.2 project. The concept earns its place by defending why the project does *not* reach for `after()` when triggering the export task.

---

## Concept 3 — `after()` is fire-and-log

**Why it's hard.** A subtle but production-biting trap: errors inside `after()` cannot propagate to the user (the response is already gone). Unhandled throws inside `after()` vanish from the user's view and, without structured logging, from the team's view too. Layered on top: `cookies()` and `headers()` work inside `after()` in Server Actions and Route Handlers but *not* in Server Components — the partial-prerendering reason matters less than the rule "read request data before the call, close over the values." Two failure modes the student has to register together.

**Ideal teaching artifact.** A *misconception-first ambush*. Open with a Server Component that calls `after(() => logUserAgent(headers().get('user-agent')))`. The code looks correct; the page renders; production users see no error. The reveal pane shows the actual runtime error in the Vercel logs — `cookies() called outside request scope` — that the user never saw. The same component is then rewritten with `const ua = headers().get('user-agent')` read *before* `after()` and closed over inside the callback; the logs go clean. A second beat in the same artifact: a Server Action with `after(() => sendAnalytics(...))` where `sendAnalytics` throws on a network blip. The user got a 200; the analytics event silently disappeared. Wrap the callback body in `try/catch` with `logger.error`; the event still failed but the team now knows. Pattern archetype named for what it prevents.

**Engagement.** A two-pane `Tokens` exercise. Pane one: a Server Component snippet where the student clicks the line that must move *outside* the `after()` callback (the `headers()` read). Pane two: a Server Action snippet where the student clicks the missing piece — the absent `try/catch` and `logger.error` around the callback body. Decoys: clicking the inline `await` would have made it not run after the response.

**Components.**
- `CodeVariants` with two tabs (broken / fixed) for the Server Component `headers()` mistake.
- `CodeVariants` with two tabs (silent / logged) for the analytics catch-and-log.
- Closing recall: `Tokens` over the corrected versions.
- `Aside` (`caution`) summarizing the two rules in one beat: read before, log inside.

**Project link.** None — `after()` is not used in 13.2.

---

## Concept 4 — Vercel Cron is a public URL with a shared secret

**Why it's hard.** Two misconceptions sit on top of each other. First, students treat `/api/cron/<name>` as if the scheduler had a private channel — it does not, the URL is publicly reachable by anyone who finds it. Second, "verify the secret" sounds like an arbitrary token comparison, but it is the same trust-boundary discipline as the webhook chapter: constant-time-compare, return 401 before the body runs, no logging of the bearer string. The teaching has to make those two land together so the student stops treating the cron URL as "internal."

**Ideal teaching artifact.** A *trust-boundary walkthrough* layered over the Cron topology. Beat one: a small topology figure — scheduler box, arrow labeled "HTTP GET with `Authorization: Bearer ${CRON_SECRET}`", route handler box, function invocation. The scheduler arrow is solid; a dashed "anyone on the internet" arrow points at the same URL with no bearer. The student sees the URL is one entry point for both. Beat two: the handler source with a six-step `AnnotatedCode` walkthrough — read header, missing-header 401, constant-time compare, mismatch 401, log the entry (not the secret), do the work. Each step has a "what an attacker tries here" annotation.

**Engagement.** A `Sequence` exercise: order the operations inside the handler (read `Authorization`, constant-time-compare, return 401 on mismatch, open DB transaction, do work, return 200). Any order that puts work before the compare fails with a callout naming the bug (attacker can execute the handler).

**Components.**
- Primary: hand-SVG `Figure` of the cron topology with the dashed "attacker" arrow.
- `AnnotatedCode` walkthrough of the verify-first handler.
- Closing recall: `Sequence`.
- This concept reuses the `WebhookAttackReplay` framing from 12.1 — explicitly link back so the student sees one discipline at two surfaces.

**Project link.** Indirectly — 13.2 uses Trigger.dev, not Vercel Cron, but the trial-expiry sweep example in this lesson is the same shape the student would reach for if they shipped a cron later in their own app.

---

## Concept 5 — At-least-once means duplicates are normal

**Why it's hard.** The same misconception as webhook delivery (12.1, concept 4), now at the cron seam. A cron handler that emails users does not get one invocation per tick — it can get two, seconds apart, on a network blip between Vercel's scheduler and the function. The fix is not new (`processed_events`-style dedup keyed by `cron:<name>:<yyyy-mm-dd>` for daily jobs), but the student has to recognize the same discipline at a different surface — and recognize when a job *doesn't* need it (an idempotent SQL UPDATE on a predicate already self-dedupes).

**Ideal teaching artifact.** A *callback to the webhook lesson*. Show the same `processed_events`-style dedup table the student wrote in 12.1.4, now with `eventId` replaced by `cron:daily-digest:2026-05-15`. Side by side, two cron handlers: one that emails users (needs dedup — duplicate sends are visible), one that runs `UPDATE plan_entitlements SET status = 'expired' WHERE ... AND status = 'active'` (does not need dedup — the second invocation finds no rows to update). The decision rule is named: *does the work mutate idempotent state on its own, or does it have an external side effect?* Decision archetype delivered as a comparison.

**Engagement.** A `Buckets` two-column sort: classify eight cron jobs as "needs dedup key" vs "self-dedupes via SQL." Examples: send digest emails (needs), expire trials (self), Stripe reconciliation that POSTs to Stripe (needs), nightly aggregation `INSERT ON CONFLICT DO UPDATE` (self), Slack alert on stuck rows (needs), `UPDATE plans SET version = version + 1 WHERE active` (self — but flag the cumulative case as a watch-out).

**Components.**
- `TabbedContent` with two panels showing the two handler shapes side by side.
- Closing recall: `Buckets`.
- Optional: `Aside` (`note`) explicitly linking back to 12.1.4 — same discipline, second surface, named on purpose.

**Project link.** The 13.2 export task uses a daily idempotency key on `startExport`; this concept is one input into why.

---

## Concept 6 — The five conditions that earn Trigger.dev

**Why it's hard.** This is the chapter's pivotal decision moment. Students reach for Trigger.dev for the wrong reasons (aesthetics, "separation of concerns," vague slowness) and avoid it for the wrong reasons (one more service to manage, cost anxiety). The discipline is to name five observable conditions — past function time, multi-step orchestration with intermediate state, automatic retries with backoff, fan-out, event-driven / human pauses — and to evaluate every candidate workload against that exact checklist. The misconception this fixes is "I'll add Trigger.dev because it feels right"; the correct posture is "I can name which of the five conditions applies, and if none does, I do not climb."

**Ideal teaching artifact.** A *two-beat decision artifact*. Beat one: a checklist-driven decision tree, rendered as a Mermaid flowchart. Root node: "Does any of these five conditions apply?" Five branches, each ending at "yes → Trigger.dev" or "no → stay on platform default." Below the chart, six concrete workloads from a SaaS (single-call invite email; nightly 5-minute aggregation; 50 000-row digest fan-out; partner video render with callback; three-hour data export; trial-expiry hourly sweep). Beat two: the student walks each workload through the tree, watching it bottom out at the right tier — the *same* tree is reused six times, the *answer* differs by workload. This is the "defend the decision" lesson, so the artifact's job is to make the student rehearse the defense aloud, six times.

**Engagement.** A `MultipleChoice` round, three questions. (1) "A Server Action sends one Resend email per click — does Trigger.dev earn its weight?" Correct: no — inline. (2) "A nightly 5-minute aggregation that fits in `maxDuration` — Trigger.dev or Cron?" Correct: Cron. (3) "Which condition applies to the CSV export? Pick all that fit." Multi-select: past function time, multi-step orchestration, retries, fan-out (all four).

**Components.**
- Primary: Mermaid flowchart inside `Figure` for the decision tree.
- New `WorkloadCaseTable`: rows are workloads, columns are the five conditions plus a "verdict" column. Each cell shows ✓ / ✗ for whether the condition applies, with hover tooltip naming why. Forward-link: 13.2 chapter opening reuses the table to defend the project's pick; 17.1 (audit pass) revisits the same table for the notification dispatcher in 14.
- Closing recall: `MultipleChoice` triplet.
- Alternative for `WorkloadCaseTable`: a static `Figure` with a fully-populated grid and prose walking three rows. Loses the per-row reveal cadence; keeps the visual comparison.

**Project link.** Direct — 13.2 opens by walking the export through this table and arriving at "all five conditions present, Trigger.dev wins."

---

## Concept 7 — `schemaTask` is the boundary, payload carries org context

**Why it's hard.** Two ideas have to land together. First: `schemaTask` validates the payload at the trigger boundary, not three minutes into the run — the same Zod-at-the-edge discipline from 7.1 Server Action inputs, re-expressed at a different seam. The misconception is treating `task` as the default and validating inside the body. Second: tasks have *no* request context. No session, no cookies, no `tenantDb` middleware. Every piece of org context the task needs has to be in the payload and re-derived inside the body. The second misconception — assuming task code can call `auth()` or `tenantDb()` ambient-style — is the cause of the worst cross-org bugs in Trigger.dev codebases.

**Ideal teaching artifact.** A *two-pane "world boundary" diagram* paired with a wrong-then-right code sequence. Left pane: the request-scoped world (Server Action, `auth()`, `tenantDb()`, `cookies()` all available, all ambient). Right pane: the task-scoped world (none of those available, only `ctx` and the payload). Between them, a single arrow labeled `tasks.trigger(...)` — and the payload is the *only thing that crosses*. Below the diagram, two code blocks side by side. Wrong version: `task({ id: 'export', run: async () => { const org = await auth().org; ... } })` — looks fine, throws at runtime, would silently exfiltrate cross-org if the SDK were forgiving. Right version: `schemaTask({ id: 'export', schema: z.object({ organizationId: z.uuid() }), run: async ({ organizationId }) => { const db = tenantDb(organizationId); ... } })`. The arrow between panes is the seam where the student has to learn to pass everything explicitly.

**Engagement.** A `CodeReview` exercise on a PR diff that introduces a `task` (not `schemaTask`) with an `organizationId` read from `auth()` inside the body. The student leaves two inline comments: one naming the validation-at-the-boundary miss, one naming the cross-org leak risk. The AI grader matches against a short kernel rubric.

**Components.**
- New `WorldBoundary` figure: a two-pane hand-SVG composed inside `Figure`, with an arrow labeled `tasks.trigger(payload)` crossing between panes. Forward-link: every later lesson in 13.1.4–13.1.6 returns to the "what crosses the seam" question (`ctx.run.id`, idempotency keys, waitpoint tokens). Recurring chapter motif.
- `CodeVariants` with two tabs (ambient — wrong, payload — right) for the org-context fix.
- Closing recall: `CodeReview` over the bad PR.
- Alternative for `WorldBoundary`: a static `Figure` with a single labeled hand-SVG of the two panes, no toggle. The diagram is already at its lean form.

**Project link.** 13.2.3 ships `exportInvoices` with the exact `schemaTask` shape — Zod-validated payload, `organizationId` re-derived for `tenantDb` inside the body. This concept is the load-bearing principle the project step asserts.

---

## Concept 8 — Code-defined queues and the per-tenant pattern

**Why it's hard.** The v3-to-v4 break is the most common copy-paste trap in 2026 because search results and AI completions still surface v3 examples that declare queues at trigger time. The student has to register that queues live in `trigger.config.ts`, declared in code, deployed alongside tasks — like database tables, not function arguments. Layered on top: the SaaS-specific pattern is that a single shared queue serializes all tenants and one noisy org starves the rest; the right shape is dynamic queues keyed by `organizationId`. Two misconceptions, one teaching beat.

**Ideal teaching artifact.** A *fan-in / fan-out simulation*. The student picks a queue topology from a toggle — "single queue, concurrencyLimit 5" or "per-org dynamic queues, concurrencyLimit 1." A control fires 50 simultaneous `tasks.trigger('export', { organizationId: orgN })` calls across five orgs (10 per org). An animated runner lane shows tasks executing under each topology. Under the single-queue toggle, the five most-recently-triggered orgs dominate the lane; org A's first task waits behind org E's tenth. Under the per-org dynamic-queues toggle, every org gets exactly one in flight at a time, and all five orgs make progress in parallel. The student watches the starvation problem and the fix happen in one frame. Concept archetype delivered as a simulator.

**Engagement.** A `DrizzleCoding`-style fill-in (using `ScriptCoding` since this is TS, not SQL): the student writes the second argument to `tasks.trigger('export-csv', payload, ___)` so that runs from the same org serialize but orgs run in parallel. The criterion runs three triggers across two orgs and asserts the dispatch order matches per-org serialization with cross-org parallelism. Then a `Buckets` follow-up sorts six queue declarations into "valid v4" vs "v3 — will not work" — surfacing the most-common copy-paste mistake.

**Components.**
- New `QueueTopologySim` — inputs: queue topology (`single` / `per-org`), concurrency limit, list of triggers (each with `orgId`). Renders runner lanes with executing / waiting tasks, animates progress, shows per-org throughput. Forward-link: 13.2.6 reuses for the per-org serialization proof; 14.1 (notification dispatcher) reuses for the dispatcher's queue shape.
- `ScriptCoding` for the fill-in exercise.
- Closing recall: `Buckets` (v4 valid / v3 obsolete).
- Alternative for `QueueTopologySim`: a `DiagramSequence` with four Mermaid frames (single queue early, single queue late, per-org early, per-org late) — loses the live-fire feel but keeps the contrast.

**Project link.** 13.2.3 ships `queue: { name: \`org-\${organizationId}\`, concurrencyLimit: 1 }` exactly; 13.2.6's verification step triggers exports from two orgs concurrently and watches the dashboard split them. This concept is the dry run.

---

## Concept 9 — Durability lives at the boundaries between steps

**Why it's hard.** "Durable" sounds like a global property of the runtime. It is not. Trigger.dev checkpoints state at specific *seams* — every `await wait.*`, every `await tasks.triggerAndWait`, end of every retry. Between checkpoints, the worker holds in-memory state; if it crashes, anything since the last checkpoint replays. The implication is structural, not procedural: a long synchronous CPU loop with no waits is *not* durable, regardless of how many `try/catch` blocks wrap it. The student has to feel that durability is a property of *how the work is split into steps*, not of the runtime promising magic.

**Ideal teaching artifact.** A *scrubbable run-replay timeline* paired with a worker-kill drill. The artifact shows a task body as a sequence of beads on a string — code regions between checkpoints. A "worker crash" indicator can be dragged along the string. Wherever it lands, the playback resumes from the *previous* bead's right edge (the prior checkpoint). The student drags the crash marker into three regions: between checkpoints (clean resume — only that bead replays), inside a long unbroken bead (the entire bead replays — the lesson lands), at the very end (no replay needed). A second beat refactors the long unbroken bead into two beads with a `wait.for({ seconds: 1 })` between them; dragging the crash marker into the now-split region shows the saved progress.

**Engagement.** A `PredictOutput` triplet: given a task with three code regions (page-1 work — 10s, no wait, page-2 work — 10s, no wait, page-3 work) versus the same task with `await wait.for({ seconds: 1 })` between pages, predict what re-runs after a worker crash at 15s in each version. Three scenarios, two task shapes, six predictions.

**Components.**
- New `RunReplayTimeline` — inputs: an array of `{ label, durationMs, isCheckpoint }` regions, a draggable crash marker. Animates resume from the prior checkpoint. Forward-link: 13.2.6 reuses for the kill-resume drill verification; concept 11 (idempotency keys) and concept 12 (`wait.for`) both reference it.
- Closing recall: `PredictOutput` triplet.
- Alternative: a static `Figure` with three hand-SVG frames (run, crash, resume) for each of the two task shapes (long bead, split into checkpoints) — loses the drag-the-crash feel but keeps the structural contrast.

**Project link.** Direct — 13.2.4 ships the paginated export as one `triggerAndWait` per page precisely because each child run is a checkpoint. The project's "kill the worker mid-run" verification step is this artifact made flesh.

---

## Concept 10 — Retry by default, abort by exception

**Why it's hard.** Two opposite reflexes have to land. First, do *not* wrap external calls in `try/catch` to "retry inside" — the runtime already does it with exponential backoff and jitter, and a hand-rolled retry loop fights the runtime. Second, do *throw* `AbortTaskRunError` when the failure is unrecoverable (400 with a stable payload, validation error, programmer mistake) — otherwise the runtime burns five retries on something that will never succeed. The misconception is "any error is a transient error"; the discipline is to classify *every* throw at the call site as transient (let it propagate, runtime retries) or permanent (`throw new AbortTaskRunError(...)`, runtime stops).

**Ideal teaching artifact.** A *classification drill on real errors*. A grid of eight realistic error shapes the student will see in production: 429 from Resend (transient), 401 from a misconfigured Stripe key (permanent), Zod parse failure on a webhook payload (permanent), `ECONNRESET` mid-fetch (transient), 503 from a partner (transient), 404 from a stable resource lookup (permanent — the row was deleted), 5xx generic (transient), 422 with `{ code: 'invalid_amount' }` (permanent). Each row has two columns — "transient, let throw propagate" vs "permanent, throw `AbortTaskRunError`." The student commits a classification per row before the reveal, which walks through *why* per row in one line. Pattern archetype.

**Engagement.** The classification grid is the recall. Follow-up: a one-question `MultipleChoice` confirming the principle — "What happens if you wrap a transient 503 in `try/catch` and swallow it inside the task body?" Correct answer: the runtime sees success, no retry fires, the work silently completes wrong.

**Components.**
- New `ErrorClassifier` — a grid component with rows of error shapes, two columns (transient / permanent), per-row commit, per-row reveal with rationale. Forward-link: any later observability or error-handling lesson (20.1 in particular). Plausible reuse.
- `MultipleChoice` follow-up.
- Alternative for `ErrorClassifier`: a static `Figure` with a fully-populated table and prose walking three illustrative rows — single-table cost is low, but the commit-then-reveal cadence is what makes the classification stick. Prefer the bespoke if 20.1 picks it up; otherwise the static fallback is acceptable.

**Project link.** 13.2.4 ships `AbortTaskRunError` on empty-result pages (permanent — the export is done, do not retry the empty page); the discipline applies the moment the student writes that throw.

---

## Concept 11 — `idempotencyKey` is the runtime's version of the dedup discipline

**Why it's hard.** This is the chapter's promotion moment of the 12.1 idempotency discipline. The student already knows dedup-and-transact for webhooks; now the *same* discipline appears as a runtime primitive on `tasks.trigger`, `wait.for`, `wait.until`. The trap is that retries of an outer run re-execute every step inside it — including the side-effect-bearing children. Without per-step keys (`${ctx.run.id}:user:${userId}`), a retry of an outer run re-sends every email. The risk in teaching is that this reads like a new API surface; the senior framing is "you already learned this in 12.1, this is the runtime saying it natively."

**Ideal teaching artifact.** A *retry replay simulation*. A parent task triggers 10 child sends in a loop. Variant A: no `idempotencyKey` on the child trigger. Variant B: `idempotencyKey: \`\${ctx.run.id}:user:\${userId}\`` on the child trigger. The student fires the parent, watches 10 children execute, then triggers a parent-level retry (worker died at child 7). Variant A: the retry runs all 10 again — 17 sends total, 7 duplicates. Variant B: the retry hits cached results for children 1–7, only 3 new sends — 10 total, no duplicates. The same numeric outcome the student saw at the webhook seam (one entitlement, four no-ops) re-appears at the task seam. The artifact's job is to make that *parallel* unmistakable.

**Engagement.** A `Tokens` click on a fixed child-trigger snippet: the student clicks the per-step idempotency key construction. Decoys: `ctx.attempt.number` (changes per retry — broken), a freshly-generated UUID (changes per call — broken), `\${ctx.run.id}:user:\${userId}` (correct), `\${userId}` alone (correct only if no two parent runs ever process the same user — fragile). Then a `Sequence` exercise: order the parent body's operations (compute user list, loop over users, build per-user key, trigger child with key, await) — surfaces the "build the key from stable parent state" rule.

**Components.**
- Reuse `RunReplayTimeline` from concept 9 with a second layer: a "retry now" control and a per-child cache hit/miss readout. Same component, extended inputs.
- Closing recall: `Tokens` on the key-construction snippet; `Sequence` on the loop shape.
- Alternative if `RunReplayTimeline` is not yet extended: `DiagramSequence` with two-frame scenarios (variant A retry — duplicates; variant B retry — cached), built static.

**Project link.** Direct — 13.2.4 ships `${ctx.run.id}:page:N` keys on the per-page child triggers; 13.2.5 ships `${ctx.run.id}:email` on the final send. The chapter's idempotency story bottoms out in the project's exact shape.

---

## Concept 12 — `wait.for` is durable, `setTimeout` is not

**Why it's hard.** The two APIs look interchangeable. `setTimeout(resolve, 5000)` and `await wait.for({ seconds: 5 })` both "pause for five seconds." Only one survives a worker crash. Worse: under load, `setTimeout` *appears* to work for weeks until the day a redeploy mid-wait drops every paused task. The misconception is performance-shaped ("why pay for a runtime call when JS has a timer?"); the senior reframe is that `wait.for` checkpoints and frees the worker, while `setTimeout` holds the worker hostage *and* dies with it.

**Ideal teaching artifact.** A *worker-occupancy timeline*. Show two concurrent task runs on a worker with concurrency limit 1. Run A uses `setTimeout(resolve, 60_000)` between steps. Run B uses `await wait.for({ minutes: 1 })`. Two lanes — top is the worker's busy state, bottom is the run's progress. Under run A, the worker stays pinned busy for the full minute, blocking run B. Under run B, the worker becomes free during the wait — run B parks on the runtime side, and another task can slot in. A redeploy marker in the middle of the lane kills the worker; with `setTimeout` the run is lost, with `wait.for` it resumes on a new worker. Two pedagogical points (occupancy, durability) in one frame.

**Engagement.** A `MultipleChoice` two-part question. Part 1: "A task pauses 10 seconds between API calls using `setTimeout`. What is the cost?" Multi-select: holds the worker, lost on redeploy, charges per second of compute, no observable record. Part 2: "Same pause via `wait.for`." Multi-select: frees the worker, survives redeploy, recorded in the dashboard, no compute cost while paused.

**Components.**
- Extend `RunReplayTimeline` (concept 9) with a worker-occupancy lane. Same component, deeper input shape. If extension is infeasible, build as `WorkerOccupancyTimeline` — but the overlap with concept 9 is large enough that a single component is the right call.
- Closing recall: `MultipleChoice` two-part.
- Alternative: a hand-SVG `Figure` with two stacked lanes (worker, runs) shown twice (with and without redeploy crash) — four panels in total. Loses the "watch the worker free" effect.

**Project link.** Indirectly — the export's per-page rate-limiting between Resend sends in 14.2 will reach for `wait.for`. Forward-loaded, not 13.2-direct.

---

## Concept 13 — Waitpoints replace polling with structural pausing

**Why it's hard.** Three misconceptions stack. First, students reach for polling ("poll the partner's status endpoint every 30s") when the partner already supports callbacks — wasting compute and missing completions. Second, even when they accept callbacks, they hand-roll an inbound webhook handler with its own dedup table, doubling the surface area Chapter 12 just locked down. Third, "human-in-the-loop" sounds like a different problem than third-party callbacks, when it is the same primitive (a token, externally completed) with a different completer. The student has to register that one mechanism — `wait.forToken` with a `publicAccessToken` — covers both the partner-callback case and the human-approval case.

**Ideal teaching artifact.** A *two-scenario waitpoint walkthrough* with the same primitive driving both. Scenario one: video render. The task creates a token, hands `publicAccessToken` to the partner as `callback_url`, `await wait.forToken(token.id)`. A timer ticks; the partner posts back; the run resumes with the result. The artifact shows the worker's state — busy during create, free during wait, busy again on resume. Scenario two: human approval. The same task shape — create token, write `pending_approvals` row carrying the token ID, send Slack notification, `await wait.forToken(token.id)`. An admin clicks "Approve" in a mock UI; the Server Action calls `wait.completeToken(tokenId, ...)`; the run resumes. Identical primitive, different completer — the student sees the unification. A third mini-beat covers the mandatory timeout: scrub the timer past 48h and watch the wait resolve with `{ ok: false, timedOut: true }`. Concept archetype with a two-pane walkthrough.

**Engagement.** A `Sequence` exercise: order the operations for the human-approval flow (start parent task, create token with 48h timeout, write pending row with token ID, send Slack, await token, on resume apply decision). Then a `Matching` round pairing four scenarios (partner callback, human approval, time-based pause, child task result) with the right wait primitive (`wait.forToken` / `wait.forToken` / `wait.for` / `triggerAndWait`) — surfaces the "use the right wait for the right shape" decision.

**Components.**
- New `WaitpointFlow` — two-pane figure: left, the task code with a callout on the `wait.forToken` line; right, an external-system or human-UI panel that "completes" the token via a button. Animates worker free state during the wait. Two scenario presets (partner callback, human approval) toggled by a switch.
- Closing recall: `Sequence` + `Matching`.
- Alternative for `WaitpointFlow`: a `DiagramSequence` with three Mermaid frames per scenario (create, wait, resume) — loses the worker-occupancy story already established in concept 9, keeps the topology. Acceptable if the existing `RunReplayTimeline` extension does not cover the wait-on-token shape.

**Project link.** None directly — the 13.2 project does not include a waitpoint workload. The concept earns its weight by being the v4 primitive the student will reach for the moment they ship a real partner integration in their own app.

---

## Concept 14 — The app's workload map: where each job lives and why

**Why it's hard.** The chapter has loaded the student with primitives. The final teaching beat is the inverse — given the course's app as it stands, where does each background workload actually live, and which deliberately stays on the platform default? The risk is the lesson reading as a recap; the discipline is to make the *placement decision* explicit per workload so the student carries away a map they can apply to their own apps, not a list of facts.

**Ideal teaching artifact.** A *populated workload map* — the chapter's ladder figure from concept 1, now annotated with seven concrete workloads from the course's app. Tier 0 (inline): `inviteMember` Resend send, audit log inside transaction. Tier 0.5 (`after()`): analytics event from a Server Action. Tier 1 (Vercel Cron): hourly trial-expiry sweep. Tier 1+ (Trigger.dev): CSV export, Stripe reconciliation sweep, notification dispatcher fan-out. Each workload card carries one line on *which* threshold from concept 1 it crossed (or did not). The figure is the chapter's exit artifact — the student takes a snapshot of it. Reference archetype delivered as the chapter's anchor diagram, completed.

**Engagement.** A `TrueFalse` round on the placement decisions: "The invite-member Resend send belongs on Trigger.dev for consistency with the export task" (false — single call, sub-second, no threshold crossed). "The trial-expiry sweep migrates to Trigger.dev when the org count grows past 100k" (true — the SQL UPDATE may exceed `maxDuration`). Four to six statements, each forcing the student to reason from the workload to the tier.

**Components.**
- Reuse the ladder `Figure` from concept 1, populated with workload cards on each rung. Same hand-SVG, second authoring pass.
- Closing recall: `TrueFalse` round on placement decisions.

**Project link.** The map names the export job as Trigger.dev's anchor case; 13.2 opens by referencing this map and walking the export through the five-conditions table from concept 6.

---

## Component proposals

- **`InvocationTimeline`**
  - Horizontal lane diagram for a single serverless invocation with response-line marker and after-response segment; optional `crashAt` and `maxDuration` cap. Three scenario toggles.
  - Uses in this chapter: Concept 2.
  - Forward-links: 21.3.3 (Vercel deploy depth) for cold start / streaming response framing.
  - Leanest v1: three static frames inside `Figure` (in-budget, truncated, crashed) — no toggle, hand-SVG lane with coloured segments. Cuts to a single hand-SVG figure with three slides.

- **`WorkloadCaseTable`**
  - Rows are workloads, columns are the five Trigger.dev conditions plus a verdict column; per-cell ✓/✗ with a one-line tooltip per cell.
  - Uses in this chapter: Concept 6, reused as anchor in Concept 14.
  - Forward-links: 13.2 chapter opening, 14.1 dispatcher workload defense, 17.1 audit pass.
  - Leanest v1: a static fully-populated table as a hand-SVG inside `Figure` with prose walking three rows. Per-row commit-and-reveal is polish; the cross-workload visual comparison is the teaching.

- **`WorldBoundary`**
  - Two-pane figure showing request-scoped world (auth, cookies, tenantDb) and task-scoped world (only `ctx` + payload) with a single `tasks.trigger(payload)` arrow crossing between them.
  - Uses in this chapter: Concept 7, motif returns in Concepts 11, 13.
  - Forward-links: 14.1 notification dispatcher payload design.
  - Leanest v1: this is already the lean shape — a single hand-SVG inside `Figure`, no interactivity. Author it as drawn.

- **`QueueTopologySim`**
  - Animated runner-lane visualizer for two queue topologies (single shared queue with concurrency limit; per-org dynamic queues); fires N triggers across M orgs, shows fairness and throughput.
  - Uses in this chapter: Concept 8.
  - Forward-links: 13.2.6 per-org serialization proof, 14.1 dispatcher queue shape, any future rate-limit / back-pressure lesson.
  - Leanest v1: a `DiagramSequence` with four Mermaid frames (single queue early / late, per-org early / late) — loses the live-fire feel but keeps the contrast. Build the simulator only if 14.1 confirms reuse; otherwise the sequence is enough.

- **`RunReplayTimeline`**
  - Scrubbable bead-on-a-string visualization of a task run with checkpoints, draggable crash marker, resume animation; optional worker-occupancy lane below; optional retry control with per-step cache-hit readout.
  - Uses in this chapter: Concept 9 (base), Concept 11 (retry layer), Concept 12 (worker lane).
  - Forward-links: 13.2.6 kill-resume drill verification; 14.1 dispatcher run inspection; any later durable-execution teaching.
  - Leanest v1: a `DiagramSequence` with three frames (run, crash, resume) for the base concept, plus a second three-frame sequence for the retry/idempotency layer. Build the timeline only if the chapter authoring confirms two or more lessons need the scrub feel.

- **`ErrorClassifier`**
  - Two-column commit-and-reveal grid (transient / permanent) with rows of realistic error shapes and per-row rationale on reveal.
  - Uses in this chapter: Concept 10.
  - Forward-links: 20.1 structured logging and error handling — plausible reuse.
  - Leanest v1: a static `Figure` with the fully-populated table and prose walking three rows; close with a `Buckets` two-column sort over the same items for the commit-then-reveal cadence. Build the bespoke commit-grid only if 20.1 picks it up.

- **`WaitpointFlow`**
  - Two-pane figure: task code on the left, external completer (partner UI or human approval UI) on the right; preset toggle (partner callback / human approval); worker-occupancy indicator animates free state during the wait.
  - Uses in this chapter: Concept 13.
  - Forward-links: none identified within the curriculum — single-use risk.
  - Leanest v1 (preferred): a `DiagramSequence` with three Mermaid frames per scenario (create, wait, resume) ×2 scenarios = 6 frames total. The worker-occupancy effect is already taught by `RunReplayTimeline`; do not re-build it here. Demote the bespoke component; ship the sequence.

## Build priority

Three proposals carry weight across this chapter and the chapters that follow.

- **`WorldBoundary`** (Concept 7) — the chapter's most-cited motif, returning in Concepts 11 and 13 and forward-linking to 14.1's dispatcher payload design. It is also the leanest of the proposals (already at v1 — a single hand-SVG). Build first.
- **`WorkloadCaseTable`** (Concepts 6 and 14) — used twice within the chapter as anchor figures and twice forward (13.2 opening, 14.1 dispatcher defense). High reuse across the unit. The static-table v1 is the right scope.
- **`RunReplayTimeline`** (Concepts 9, 11, 12) — three uses in one chapter and the central artifact for the chapter's biggest lesson (13.1.5). The lean v1 is a `DiagramSequence` per layer; build the bespoke scrubber only if authoring confirms the scrub motion adds beyond what three static frames per layer carry.

Lower priority but worth building if budget allows: **`QueueTopologySim`** (Concept 8) and **`ErrorClassifier`** (Concept 10). Both have plausible forward-links (14.1 and 20.1 respectively) and both have credible static-figure fallbacks.

Demote and do not build: **`InvocationTimeline`** (Concept 2) and **`WaitpointFlow`** (Concept 13). Both are single-use or weakly forward-linked; the hand-SVG `Figure` and `DiagramSequence` fallbacks carry the teaching at a fraction of the cost.

## Open pedagogical questions

- Concept 9's `RunReplayTimeline` is the chapter's most ambitious bespoke proposal and the one whose scrub-the-crash interaction most clearly outperforms static frames. Three concepts depend on it. Is the scrubber justified, or do three sets of static-frame `DiagramSequence` panels teach the same thing for a third of the build cost? The recommendation defaults to the bespoke; flag for a build review against the static-frame baseline.
- Concept 12 (`wait.for` vs `setTimeout`) and Concept 9 (durability at boundaries) overlap structurally — both teach "checkpoint at the right seam." Are they two concepts, or one concept with two beats? The recommendation keeps them split because the misconception in Concept 12 (the timer-is-a-timer reflex) is distinct from the misconception in Concept 9 (durability is global). Confirm.
- Concept 13 (waitpoints) has no project link in 13.2 and weak forward-link weight in the rest of the curriculum. The pedagogical case is strong (it is the v4 primitive students will reach for first when shipping a real workflow with a partner or human), but the build-cost case is weak. Confirm the static-sequence v1 is acceptable rather than the bespoke `WaitpointFlow`.
