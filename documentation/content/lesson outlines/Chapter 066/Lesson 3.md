# When Trigger.dev earns its weight

- Title: When Trigger.dev earns its weight
- Sidebar label: When Trigger.dev earns its weight

## Lesson framing

This is the chapter's **pivot lesson** and the "defend the decision" lesson. Lessons 1–2 taught the cheap tiers (inline `await`, `after()`, Vercel Cron) and, crucially, taught the student to *defend not escalating*. This lesson names the exact line past which staying cheap stops being defensible, and what specifically a durable background-job platform buys that earns the operational cost of a second platform. The deliverable is a **decision skill**, not an API skill: by the end the student can stand at a fork and say both "no, Vercel Cron is enough" and "yes, Trigger.dev, because of this exact property" — and name *which* property.

Hard scope discipline (this is the lesson's biggest risk): **no SDK syntax**. `task`, `schemaTask`, `tasks.trigger`, `wait.forToken`, queue declarations, retry config — all deferred to L4–L6. This lesson may *name* a capability ("durable runs", "waitpoints", "code-defined queues") as the answer to a condition, but must not show how to write it. The temptation to demo `schemaTask` here must be resisted; if the writer reaches for a task definition, that belongs in L4. Code in this lesson is near-zero — at most a 3–5 line *trigger-site* sketch (`await tasks.trigger('export-csv', { organizationId, since })`) to make the org-context-in-payload point concrete, and even that is illustrative, not taught.

Pedagogical spine: this is a **systems-design lesson**, the course's home turf (senior mindset over syntax). Lead with the senior question, force the reasoning, make the threshold observable. Three load-bearing teaching moves:
1. **The five trigger conditions**, each named so a junior can *test for it* against a real workload ("does this exceed the function time wall? yes/no"). These are the spine of the whole lesson.
2. **The decision tree**, delivered as an interactive `StateMachineWalker` that *extends L2's schedule walker* into the full ladder. The continuity notes call L2's walker "the canonical decision tool for the chapter; Lesson 3's full Trigger.dev decision tree extends it" — so this walker must contain L2's schedule branch as one path and add the four other condition-paths around it. The lesson lives in the *order* the senior asks the questions, not in any single leaf.
3. **The org-versus-app separation** tasks inherit — the one genuinely new mental model the student must leave with (tasks run with no session, no `tenantDb` middleware; org context lives in the payload). This foreshadows L4's schema-task shape and is the bridge from "should I use it" to "how I'll wire it".

Cognitive-load management: build the ladder incrementally. The student already holds tiers 0 / 0.5 / 1 (cron) from L1–L2. Open by re-drawing that ladder (one compact visual, not re-taught) and pose: "what does this ladder still fail at?" Then introduce the five conditions one at a time, each as a concrete workload that breaks the cheap tiers. Only after the five are solid does the decision tree assemble them, and only then do alternatives and cost get named. Never present all five conditions as an undifferentiated list up front.

Tone: adult, terse, decision-first. The most common real-world mistake this lesson inoculates against is **premature escalation** — reaching for a job platform for aesthetics or slight slowness. Give that failure mode equal billing with the legitimate triggers; the "conditions that do NOT justify it" beat is as important as the five that do.

## Lesson sections

### Introduction (no header)

State the lesson goal warmly and briefly. Anchor in what the student already owns: "You can already keep work off the request path three ways — inline `await` for work the user waits on, `after()` for same-invocation cleanup, Vercel Cron for schedules. You can also defend *not* reaching for anything heavier. This lesson draws the line those three still can't cross." Name the deliverable: a decision skill — at the end you can defend both directions of the fork. Preview that the chapter's later lessons (L4–L6) teach the SDK; this lesson decides *whether you should be holding the SDK at all*. Set the frame that the answer is usually "no, you don't need it yet" — and that knowing why is the senior skill.

Re-draw the ladder the student already holds as a single compact visual to anchor the escalation. Use a **Mermaid `flowchart LR`** (horizontal, vertical-space-friendly) wrapped in `<Figure>`: four stacked tiers (`inline await` → `after()` → `Vercel Cron` → `?`) with the fourth tier a question mark / blank, captioned "Three tiers cover same-invocation and scheduled work. What lives in the fourth?" Pedagogical goal: frame the entire lesson as filling in that fourth tier, and make explicit this is *extending* a ladder, not starting fresh. Keep it tiny — this is a recap, not a new diagram.

### The senior question — what the cheap tiers still can't do

The framing beat. Pose the senior question explicitly (decisions-before-syntax filter): inline `await` and `after()` cover same-invocation work; Vercel Cron covers schedules. **What workloads do those two combined still fail at, and what specifically does a durable job platform provide that earns the operational cost of running a second platform?** Make the cost real: a second platform means a second deploy in CI, a second dashboard, a second secret, a second failure surface to reason about — that cost has to be *bought*. Set the rule that governs the rest of the lesson, restated from L1's continuity ("code stays at the lowest tier that meets the durability, latency, and time-budget requirement"): you escalate only when a *named, testable* condition crosses, never on a hunch. Tee up the next section: there are exactly five.

Reasoning, not code. Two–three sentences of prose plus the rule. No component.

### Five conditions that justify a job platform

The spine of the lesson. Introduce the **five trigger conditions**, each named so the student can *test a real workload against it* (the test is binary — does this workload trip this condition, yes or no). Teach them one at a time, each paired with a concrete workload that breaks the cheap tiers and the cheap-tier failure made visible. Use the L1-established Fluid Compute caps (**5 min Hobby / 13 min Pro**) — do NOT reintroduce the chapter outline's stale "1 min / 14 min"; the continuity notes flag these as corrected, and later lessons must not introduce different numbers without noting a plan-tier distinction.

The five, in escalation order:
1. **Past the function time wall.** Work needing more than the per-invocation cap (13 min Pro / 5 min Hobby). Concrete: a 50,000-row export that can't finish before the wall. Cheap-tier failure: the function is killed mid-work, output truncated, no resume. This is the most *observable* condition — there's a hard number.
2. **Multi-step orchestration with intermediate state.** Step A, then wait for an external response or a delay, then step B — where re-running A on failure would be wrong or expensive (double-charge, duplicate export). Concrete: charge a card, then provision, then email — each step must not redo the prior on a retry. Cheap-tier failure: a Server Action runs once and returns; there's nowhere for "step B after a pause" to live.
3. **Automatic retries with backoff.** Work that must survive a transient downstream outage *on its own schedule, not the user's*. Concrete: a Resend or partner API 503 that should be retried in 2s, then 6s, then 20s. Cheap-tier failure: `after()` is one shot, Vercel Cron logs a 5xx and moves on — neither retries, and a hand-rolled retry loop inside a request burns the user's time budget.
4. **Fan-out with concurrency control.** A single trigger spawning many child runs (hundreds to tens of thousands) with a cap on how many run at once. Concrete: a digest that emails 50,000 users without blowing Resend's rate limit. Cheap-tier failure: one cron tick = one invocation; emailing one-by-one inside it times out (condition 1 again), and firing them unbounded melts the downstream.
5. **Event-driven / human-in-the-loop pauses.** Work blocking on a third-party callback, a human approval, or a wall-clock delay measured in hours or days. Concrete: kick off a partner video render and resume only when the partner calls back; or hold a refund until an admin approves. Cheap-tier failure: there's no way to pause an invocation for 6 hours — you'd have to poll, and polling burns compute and can miss the completion.

Component choice: deliver the five as a `<DiagramSequence>` — one condition per step, the student scrubs forward through them. Rationale: the conditions are inherently sequential (the escalation order *is* the lesson — cheapest-breaking to heaviest), and stepping them one at a time enforces the one-at-a-time cognitive pacing this lesson needs. Each step: condition name as heading, the concrete workload, and the cheap-tier failure called out (an `Aside` of type `caution` inside the step, or just emphasized prose). If `<DiagramSequence>` proves awkward for mostly-prose steps, fall back to five short `###`-free prose beats under this `##` with a bold lead-in per condition — but prefer the sequence for the pacing. (Note for writer: keep each step text-light; the goal is recognition of the *shape* of each condition, not exhaustive coverage.)

After the five, immediately add the **classification exercise** so the student practices *testing workloads against the conditions* — this is the skill, so check it here. Use `<Buckets>` with the five condition names (plus a sixth "stays on the cheap tier" bucket) as buckets, and ~7–8 workload chips the student sorts: e.g. "Send one invitation email (~200 ms)" → cheap tier; "Export 80k invoices to CSV" → past time wall; "Email a weekly digest to every user" → fan-out; "Wait for a partner's render webhook" → event-driven pause; "Retry a flaky payment-provider call with backoff" → retries; "Charge, then provision, then email — no step repeats on retry" → multi-step; "Nightly 4-minute trial sweep" → cheap tier (Vercel Cron). Two-column layout (`twoCol`). Instructions: "Sort each workload into the condition that forces it off the cheap tiers — or into the cheap-tier bucket if none do." Grading is built into Buckets (green/red on Check). Pedagogical goal: force the binary test per condition and catch the student who over-escalates (the cheap-tier chips are the trap).

### Conditions that do not justify a job platform

Give the anti-pattern equal billing — premature escalation is the #1 real-world mistake. Name the non-triggers crisply, each with the *correct* cheaper answer:
- A slow API call **under the time wall** → `after()` if the user doesn't need the result, or just accept the latency if they do. Slowness alone is not a trigger.
- A nightly job that **fits the function budget** (e.g. 4 minutes) → Vercel Cron. A schedule alone is not a trigger.
- "**I want a separate worker for cleanliness / separation**" → no. The platform is not an aesthetic; a second platform is operational cost you must justify with a condition, not a preference.

Land the rule as a one-liner the student can quote in a code review: **escalate on a condition, never on a vibe.** Reasoning prose plus possibly one `<MultipleChoice>` (single-correct) to catch the aesthetic trap — a scenario where a junior proposes Trigger.dev "to keep the Server Action clean" and the student picks the senior response (decline, name the missing condition). Answers must not be verbatim from the prose (per MCQ guidance — make the student reason, not pattern-match).

### The decision tree — from request to durable job

The synthesis beat: assemble the five conditions plus the cheap tiers into a single walkable decision tree. This is the lesson's centerpiece interactive and the explicit extension of L2's schedule walker.

Component: `<StateMachineWalker kind="decision">` (the default decision framing — terminal leaves are recommendations). Do **not** wrap in `<Figure>` (it's its own card). Structure the walk as the *order a senior asks the questions*, narrowing from cheapest to heaviest:
- Root question: "Does the user need to see this work complete before the response?" → **yes** leads toward inline; → **no** continues down.
- Branch the way through the conditions: must it complete on this same invocation (→ `after()` leaf) / is it a fixed schedule that fits one invocation (→ Vercel Cron leaf — this is L2's branch, reused) / does it exceed the time wall / need retries / fan out / pause on an external signal (→ Trigger.dev leaves, each leaf naming *which condition* drove it).
- Make several distinct Trigger.dev leaves so the verdict carries the *reason*: "Trigger.dev — past the time wall", "Trigger.dev — durable retries", "Trigger.dev fan-out (triggered by Vercel Cron)", "Trigger.dev waitpoint". The hybrid leaf ("Vercel Cron triggers a Trigger.dev fan-out") matters — it teaches that the tiers compose, the cron does the *scheduling* and Trigger.dev does the *work*, closing the L2 bridge ("the cron handler's job becomes 'enqueue a fan-out'").

Leaf bodies (rich MDX slot) state the verdict reason in one or two sentences — *why this tier*, tied to the condition. Pedagogical goal: the student internalizes the *sequence* of senior questions (user-visible? → same-invocation? → schedule? → which condition?), so that faced with a novel workload they run the same funnel. The walker forces the committed-walk experience — one path at a time — which mirrors how the decision is actually made.

Map the worked branches explicitly in surrounding prose so the writer hits them (these come straight from the chapter outline): "single email synchronously → inline"; "log analytics after response → `after()`"; "nightly 5-min job → Vercel Cron"; "send 50k emails on a schedule → Vercel Cron triggers a Trigger.dev fan-out"; "wait for third-party webhook → Trigger.dev waitpoint"; "multi-hour data export → Trigger.dev durable task".

### Why Trigger.dev, and what else is out there

Now that the student knows *when* to escalate, justify *which tool* the course picks — and name the field so the choice is informed, not dogmatic (the "mention alternatives so the student understands why we choose this" pedagogical move). Keep it to one pass, no deep comparison (out of scope per chapter outline).

Two parts:
1. **The 2026 alternatives**, one line each, with the niche each wins:
   - **Inngest** — serverless-native event system with step functions; similar shape, strong for event-driven teams.
   - **Vercel Queues** (public beta as of Feb 2026, at-least-once delivery) — Vercel-native durable pub/sub: publish to topics, consumer groups process in the background with retries and sharding. Lighter than a full orchestration runtime; weaker fit for multi-step jobs with intermediate state. Writer: re-confirm beta-vs-GA at write time — this is volatile, and architecting on beta delivery semantics is itself a watch-out worth a sentence.
   - **BullMQ + Redis** — self-managed, full control, but you run Redis and a worker yourself; wins on persistent-infra hosts (Render / Railway).
   - **AWS SQS + Lambda** — enterprise scale, heavy operational surface, wins inside an existing AWS footprint.
2. **Why the course picks Trigger.dev v4** (v4 is GA as of 2026, built on the new Run Engine): best 2026 DX for a small team — typed payloads, durable runs, visible run timelines, waitpoints, a local-CLI debugging loop — plus an **Apache-2.0 self-host off-ramp** (full platform via Docker + Postgres, no run limits, no feature gating) if cost or data-residency ever forces it. Frame as: the course optimizes for a junior shipping a SaaS solo, and Trigger.dev's observability-for-free and typed surface lower the senior-judgment bar the most. Confirmed facts (do not contradict): Apache 2.0, full Docker self-host with no run limits, v4 GA.

Then, briefly, **what Trigger.dev v4 provides mapped back to the five conditions** — the payoff that closes the "what does it buy" question from the senior-question section. Keep this a tight mapping, NOT an API tour (no syntax): durable runs that survive crashes/redeploys (conditions 1–2), declared retries with exponential backoff + jitter (condition 3), code-defined queues for concurrency/fan-out (condition 4), waitpoints + `wait.for`/`wait.until` for pauses (condition 5), typed payloads and a run dashboard across all of them. Name `wait.forToken`, queues, etc. as *capabilities*; defer their code to L4–L6 explicitly in a forward-pointer sentence.

Component: a `<CardGrid>` of `<ExternalResource>` cards is *not* for the alternatives inline (that's prose) — but DO drop one `<ExternalResource>` to the Trigger.dev docs here or in External resources. The alternatives are a short bulleted list in prose. Optionally a `<Buckets>`-style or `<Matching>` exercise pairing each alternative to its winning niche — but only if it adds value; a small `<Matching>` (alternative ↔ "wins when…") is a clean fit and low-risk. Keep optional; prose is sufficient.

### Where the run lives — Trigger.dev's architecture

A short, honest topology beat so "second platform" is concrete, not hand-wavy. Cover:
- Trigger.dev runs as a **separate service** (cloud or self-hosted). The app *triggers* tasks via the SDK over HTTPS; the tasks *execute* on Trigger.dev's workers, not in the Vercel function.
- Tasks live in the codebase (`src/trigger/`) and deploy via the Trigger.dev CLI — so it's **two deploys, one codebase**: `vercel deploy` and `trigger deploy`, types flowing through the shared SDK. (Mention deploy *ordering* — Trigger first — only as a one-line forward pointer to L7; don't drill it here.)
- **Cost shape**, in operational terms only (no pricing tables — volatile, out of scope): billed per *run*, per *run-minute*, per *concurrency seat* — a different unit than Vercel's per-invocation. The senior reflex: watch per-task run count weekly; a spike usually means a missing idempotency key or a retry storm, not real growth. Name the watch-out that comparing "Trigger.dev cost per run" to "Vercel cost per invocation" is a category error — not the same unit.

Component: a small **D2 system-architecture diagram** (D2 is the top pick for services + traffic) wrapped in `<Figure>`, OR an `<ArrowDiagram>` if the writer wants custom HTML boxes — three boxes: **App (Vercel function)** → triggers over HTTPS → **Trigger.dev service / workers** → both read/write the **shared Postgres**. Pedagogical goal: kill the misconception that a task "runs inside" the Server Action, and show that the DB is shared (which sets up the next section's org-context point — the task hits the same Postgres but with *no* session). Keep height capped (~horizontal layout). If `<ArrowDiagram>`, remember `expandable={false}` on its `<Figure>` (leader-line constraint).

### Tasks run outside your app's context

The single most important *new* mental model in the lesson, and the bridge to L4. Tasks execute on Trigger.dev's workers with **no Better Auth session, no `tenantDb` middleware, no cookies, no headers** — none of the request-scoped context the student has leaned on since the auth and multi-tenancy units. The implication, stated as a rule the student will reuse in every later task lesson: **every task payload carries `{ organizationId, ... }`, and every DB call inside the task re-derives tenant scope explicitly via `tenantDb(organizationId)`** (per code conventions: "Tasks inherit no auth context. Pass `{ userId, orgId }` in the payload… `requireOrgUser()` does not exist inside a task — DB scoping uses `tenantDb(orgId)` directly").

This is where the lesson's *one* code sketch earns its place — a tiny `<CodeVariants>` (before/after, or two panels) contrasting the two halves of the boundary:
- Panel "From the app (has context)": a Server Action that already has `orgId` from `requireOrgUser()` and passes it into the trigger call — `await tasks.trigger('export-csv', { organizationId, since })`. The point: the org id is *handed across the boundary* in the payload.
- Panel "Inside the task (no context)": a 3–4 line task body *sketch* that reads `organizationId` from the payload and calls `tenantDb(organizationId)` — with a comment marking "no session here". The point: scope is re-derived from the payload, never assumed.

Keep the code minimal and clearly flagged as illustrative-not-taught (the SDK shapes — `tasks.trigger`, `schemaTask` — are L4's job). Use a `del`/`ins` or a comment to mark the seam, not to teach the API. Pedagogical goal: the student leaves with the reflex "a task is its own world; org context is cargo, not ambient." Watch-outs to fold in: assuming tasks share request context with the caller (they don't — pass the org id); running tasks against the same Postgres without thinking about pool contention (one-line pointer to PgBouncer / chapter 039, don't drill).

### The course's jobs — and the ones that stay cheap

Concrete payoff and forward-loading for the project. Show the decision applied to the actual app the student is building, both directions:
- **Goes on Trigger.dev:** the CSV export job (chapter 067 project) — trips *all five* conditions (multi-step, paginated past the time wall, must resume on crash, fans out per page, emails at the end). This is the canonical "yes" and the thing the next chapter builds; name it as the worked target.
- **Stays cheap (deliberately):** the R2 upload (chapter 069) — a direct presigned PUT, inline, no task. The single-invitation email — inline `await`. The hourly trial sweep — Vercel Cron (L2). Land the closing line: **not every job is a Trigger.dev job**, and the student now has the test to tell them apart.

Component: prose plus possibly a compact two-column `<Buckets>` or a small table contrasting "Trigger.dev" vs "platform default" for ~5 of the app's jobs — but a `<Buckets>` here would duplicate the earlier classification exercise, so prefer a simple two-column comparison table (`<TabbedContent>` not needed; a markdown table or `<CardGrid>` is fine) or just prose with the two lists. Keep it short — this is a bridge, the real wiring is L7 and the build is chapter 067. End by pointing forward: L4 teaches the SDK to actually write the export task.

### External resources (optional)

A small `<CardGrid>` of `<ExternalResource>` cards: Trigger.dev v4 docs (overview / "what is a task"), and optionally the Trigger.dev "vs alternatives" or pricing page for the curious. Use `simple-icons:` brand icons where available. Keep to 2–3 cards — docs the student can probe, not a reading list.

## Terms for Tooltip (`<Term>`)

Strategic, lesson-supporting only:
- **Fan-out** — one trigger spawning many child runs (concurrency-limited). Non-obvious term, central to condition 4.
- **Waitpoint** — a durable, resumable pause token; the run parks, the worker frees, an external signal resumes it. Named here, drilled in L6 — a one-line tooltip lets the lesson reference it without breaking flow.
- **Idempotency key** — a stable key that makes a retried trigger or side effect run once, not twice. Re-anchors the chapter 063 discipline without re-teaching it.
- **Backoff (exponential, with jitter)** — retry delays that grow geometrically with randomization, so retries spread out instead of stampeding. Supports condition 3.
- **Durable run** — a run that survives worker crashes, redeploys, and platform restarts by checkpointing between steps. The core property the whole lesson sells.
- **Concurrency limit** — the cap on how many runs of a queue execute simultaneously; back-pressure. Supports condition 4.

Do **not** Term-define `after()`, Vercel Cron, `maxDuration`, `tenantDb`, `requireOrgUser` — all established in prior lessons/units; reference them plainly.

## Scope

**Prerequisites to reference concisely, not re-teach** (the student already holds these):
- The three-tier ladder, inline `await`, `after()`, `maxDuration`, and the Fluid Compute caps (5 min Hobby / 13 min Pro) — chapter 066 L1. Re-draw the ladder once as a recap visual; do not re-explain the tiers.
- Vercel Cron topology, `CRON_SECRET`, at-least-once delivery, the schedule decision walker — chapter 066 L2. Reuse the schedule branch inside this lesson's decision tree; do not re-teach cron.
- Idempotency / dedup-and-transact discipline — chapter 063 L2/L4. Reference as the discipline tasks will carry; do not re-derive.
- `requireOrgUser()` → `{ user, orgId, role }` and `tenantDb(orgId)` — multi-tenancy unit. Reference as the context a task *lacks*; do not re-teach tenancy.
- Server Action canonical shape / Result type — chapter 043. Assume solid.

**Deferred to later lessons / chapters — name, do not teach:**
- Trigger.dev SDK surface — `task`, `schemaTask`, `tasks.trigger`/`triggerAndWait`, queue declarations, `trigger.config.ts`, the CLI, schedules — **chapter 066 L4**. This lesson names capabilities only; **zero SDK syntax**.
- Durable-execution mechanics — checkpoints, `retry` config, `AbortTaskRunError`, `wait.for`/`wait.until`, `idempotencyKey` as a runtime primitive — **chapter 066 L5**.
- Waitpoints in depth — `wait.forToken`, `publicAccessToken`, `wait.completeToken`, timeouts, multi-token aggregation — **chapter 066 L6**.
- The CSV export task's actual code and the starter — **chapter 067**. This lesson names it as the canonical "yes" target only.
- Wiring all three app workloads (export, Stripe reconciliation, notification dispatcher), the env surface, deploy ordering — **chapter 066 L7**. Mention deploy ordering as a one-line forward pointer only.
- Self-hosting Trigger.dev — named as an Apache-2.0 off-ramp, not drilled.
- Detailed alternative comparison (Inngest/BullMQ/SQS deep dives), full pricing model — out of scope; one line each.
- DB pool tuning / PgBouncer under high task concurrency — **chapter 039**; one-line pointer only.
- Stripe reconciliation flow — Unit 11 / L7 forward note; do not build here.

**Out of this lesson entirely:** any task definition, any retry/wait/idempotency *code*, any dashboard walkthrough, any deploy pipeline. The student should finish able to *decide and justify*, holding no SDK syntax yet.
