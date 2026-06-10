# Lesson title

- Title: Wiring our app — which workloads go where
- Sidebar label: Wiring our app

# Lesson framing

This is the chapter's **bridge / synthesis lesson** (est. 20–30 min). The student has, across L1–L6, climbed the whole ladder: inline `await` (tier 0), `after()` (tier 0.5), Vercel Cron (schedule default), and the full Trigger.dev v4 surface — `schemaTask`, queues + `concurrencyKey`, retries, `wait.*`, idempotency keys, waitpoints. L7 teaches **no new API**. Its single job is to apply the chapter's decision discipline to the course's *actual* app and produce a durable mental artifact: a map of every recurring/async workload in the SaaS and the tier each one lives at, with the *reason* attached to each placement.

Pedagogical conclusions that shape the whole lesson:

- **This is a decisions lesson, not a syntax lesson.** Per the pedagogy doc's first pillar, the senior contribution here is the *placement table* and the *reasoning behind each cell* — not code. Code appears only as small illustrative trigger seams the student has already seen in L4–L6; never re-teach the API. Mark every snippet "illustrative — taught in L4/L5/L6" so downstream agents don't re-explain it.
- **The marquee artifact is a two-column classification.** Seven concrete workloads sort into "Trigger.dev (3)" vs "platform default (4)". The lesson's value is that the student can *defend each placement against the chapter's named thresholds* — both directions ("yes, because condition X" / "no, no condition crossed"). Build this as a `Buckets` exercise so the student commits to a placement before seeing the answer, then debrief each cell in prose.
- **Two of the three Trigger.dev workloads are forward notes, not builds.** Only the CSV export is built (Ch.067). Stripe reconciliation (extends Unit 11) and the notification dispatcher (Ch.070) are *named as upcoming* — the lesson uses them to show the conditions generalize beyond the one project, but must not teach their code. Be explicit about what is build vs. preview so the student isn't left expecting code that isn't there.
- **The senior watch-out the whole lesson defends against:** "drag every async Server Action into Trigger.dev for consistency." Most of the app's async work correctly stays on the platform default. The 4-item "stays put" column is as load-bearing as the 3-item "moves" column — arguably more, because over-engineering is the more common 2026 mistake (re-anchor L1's "do not over-engineer" thread and L3's "escalate on a condition, never on a vibe").
- **Two operational facts the student must leave with** (both are real production footguns, both deferred-for-depth to later units but *named with the consequence* here): the env surface (`TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`, `CRON_SECRET`) and the **deploy ordering rule** — `trigger deploy` *before* `vercel deploy`, because the app must never reference a task version that hasn't landed on the workers yet. The ordering rule gets a tiny temporal diagram; it's the one genuinely new mental model in the lesson.
- **"One codebase, two runtimes."** Correct the likely misconception that Trigger.dev is a separate codebase/repo. Tasks live in `trigger/` *in the same repo*, import the same `lib/email.ts` / `lib/billing.ts` / `tenant-db.ts`, hit the same Postgres, write the same audit log. Trigger.dev is a *runtime* for code that already lives in the app. This reframes the whole chapter and lowers the perceived cost of reaching for it once a condition is genuinely crossed.
- **Close the chapter.** This lesson is the last teaching lesson before the quiz (L8). End by restating the one-sentence decision rule that threaded every lesson — "code stays at the lowest tier that meets the durability, latency, and time-budget requirement" — and hand off to the Ch.067 project.

No live coding sandbox anywhere in this lesson — server/Trigger.dev runtime can't run in the ReactCoding iframe (confirmed constraint for the whole chapter). Interactivity comes from `Buckets` + an MCQ, not editors.

# Lesson sections

## Introduction (no header)

Warm, brief, ~2 short paragraphs. Frame the senior question directly (pedagogy: introduction states the question implicitly): *You now own the full ladder. Where in our actual app does each rung get used — and, just as important, where does the cheapest rung stay the right answer?* Name the deliverable: by the end the student holds a placement map of every async/recurring workload in the course's SaaS, each cell defended by a named threshold. Re-anchor the chapter's spine in one sentence (the lowest-tier rule). State plainly this lesson adds no new API — it's the wiring decision.

## The app's workloads, on one table

The conceptual core. Present the seven workloads and the tier each lives at, with the deciding reason per row. Lead with a compact reference table (use `Code`-style markdown table in MDX, or a simple two-column layout) so the student has the whole map at a glance before the drill:

| Workload | Tier | Deciding reason |
| --- | --- | --- |
| Invitation email from `inviteMember` | inline `await` | one ~200ms Resend call, user must know it sent |
| Analytics event after checkout | `after()` | fire-and-log, must not roll back the DB txn |
| Audit-log row | inside `db.transaction` | atomic with the mutation, never deferred |
| Hourly trial-expiry sweep | Vercel Cron | fixed UTC schedule, predicate-idempotent `UPDATE`, fits the function budget |
| CSV export | **Trigger.dev** | all five conditions — multi-step, paginated, past budget, retries, final email |
| Stripe reconciliation sweep | **Trigger.dev** | durability — partial reconciliation is *wrong*, must resume on crash |
| Notification dispatcher fan-out | **Trigger.dev** | fan-out to N channels × N users, per-org serialization |

Explain *how* to teach this: walk the table top-down as a single sweep of the ladder — the first three rows recap L1 (the cheap tiers), row four recaps L2 (cron), the last three are the escalations. For each of the three Trigger.dev rows, name *which* of L3's five conditions trips and why the platform default fails. For the export, all five — call it the canonical "yes". For reconciliation, lead with the durability condition (partial reconciliation corrupts state). For the dispatcher, lead with fan-out + per-tenant `concurrencyKey`.

Crucial framing to land here: **the four "stays put" rows are the lesson's spine, not filler.** Each is a place a junior would over-reach. Make the reason explicit each time: the invite send is *one* call under the time wall → no condition crossed; the trial sweep is a predicate-idempotent `UPDATE` that fits the budget → Cron, not Trigger.dev. Re-anchor L3's "escalate on a condition, never on a vibe."

`<Term>` candidates introduced/re-anchored here (all defined in earlier lessons — keep tooltips to one line, these are re-anchors not new teaching): **predicate-idempotent** (L2), **fan-out** (L3), **`concurrencyKey`** (L4), **durable run** (L3/L5).

### Three workloads that earn Trigger.dev

Sub-section drilling the "yes" column with just enough specificity to make the conditions concrete — *without* teaching code. For each, 2–4 sentences naming the workload, the condition(s), and a one-line note on what's build vs. preview:

- **CSV export (built next, Ch.067).** Multi-step paginated read, bursts past the function budget on a large org, each page is a checkpoint, retries on transient DB/Resend failure, sends the "export ready" email at the end — every one of L3's five conditions. This is the canonical target the chapter has pointed at since L3. Ch.067 ships it end-to-end; this lesson only places it.
- **Stripe reconciliation sweep (forward note, extends Unit 11).** A nightly job reads Stripe for any org whose `lastEventAt` is older than 24h and reconciles drift back into `plan_entitlements`. *Why not just a cron?* — it could *start* as a Vercel Cron that triggers the work, but the reconciliation itself needs durability: a crash mid-reconcile must resume, not restart from a half-applied state. Names the L2→L3 bridge ("cron schedules, Trigger.dev does the durable work") concretely. Not built in this course; named so the student sees the pattern recurs.
- **Notification dispatcher fan-out (forward note, Ch.070).** One domain event (e.g. "comment added") fans out to N channels across N org members. A per-org queue with `concurrencyKey: organizationId` serializes within a tenant so one noisy org can't starve others, parallel across tenants. Triggered from a `notifyEvent` Server Action helper (Ch.070 builds the helper; L4's `notify-org-members` was the warm-up shape). Names fan-out + per-tenant isolation as the deciding conditions.

Reasoning: this sub-section proves the five conditions aren't a one-off for the export — they generalize. But it must stay disciplined about build-vs-preview so the student's expectations match Ch.067 (which only builds the export).

### Drill: sort the workloads

`Buckets` exercise, two buckets, placed right after the table so the student commits before fully internalizing the debrief (productive retrieval). Two columns (`twoCol`), `instructions`: "Sort each of our app's workloads into where it runs — the platform default (inline / after() / Cron) or Trigger.dev."

- Bucket `default` — label "Platform default", description "inline `await`, `after()`, or Vercel Cron"
- Bucket `trigger` — label "Trigger.dev", description "durable, multi-step, fan-out, or waitable"

Items (chips, inline code where natural):
- `default`: "Invitation email from `inviteMember`"; "Analytics event after checkout"; "Audit-log row inside the transaction"; "Hourly trial-expiry sweep"
- `trigger`: "Paginated CSV export with final email"; "Nightly Stripe reconciliation"; "Notification fan-out to N members"

Goal: the student must *apply* the threshold, not recognize a label. Grading is the component's built-in green/red. Reasonable as a `Buckets` because there are exactly two target categories and the discrimination is the whole point.

## Two runtimes, one codebase

Corrects the "Trigger.dev is a separate project" misconception — the lesson's main *reframing* beat. Teach: tasks live in `trigger/` **in the same repository** as the Next.js app; they `import` the same `lib/email.ts`, `lib/billing.ts`, the same Drizzle schema and `tenant-db.ts`, and hit the **same Postgres**. The only thing that differs is *where the code runs* — a Trigger.dev worker process, not a Vercel function. Trigger.dev is a runtime, not a codebase.

Re-anchor (don't re-teach) the L3 "org context is cargo, not ambient" rule as the one seam that *is* different: a task has no Better Auth session and no `tenantDb` middleware, so the org id rides in the payload and tenancy is re-derived inside `run` via `tenantDb(organizationId)`. One illustrative two-line snippet (marked "illustrative — taught in L3/L4"): app side `exportCsv.trigger({ organizationId, … })`, task side `const db = tenantDb(payload.organizationId)`.

**Diagram — "one repo, two runtimes".** Reuse the chapter's established three-box architecture mental model (set up in L3) but reframe for *shared code*. `ArrowDiagram` inside `<Figure>`:
- Box A: the Next.js app on Vercel (Server Actions, route handlers).
- Box B: Trigger.dev workers (tasks in `trigger/`).
- Box C (bottom, spanning): shared `lib/` + Drizzle schema + Postgres.
- Arrows: A → B labeled "trigger over HTTPS (payload carries `organizationId`)"; A → C and B → C both labeled "same `tenant-db.ts`, same audit log".
Pedagogical goal: make "two runtimes, one codebase" *visible* — the two compute boxes, the single shared data/lib box underneath. This is the reframe that lowers the perceived cost of Trigger.dev. Keep it horizontal, cap height (~320px). If `ArrowDiagram`'s cross-region arrows get fussy at the responsive breakpoint, a D2 system-architecture diagram is an acceptable fallback (nodes are plain labels here) — note this for the diagram agent.

Self-host off-ramp: one sentence. Trigger.dev v4 is Apache-2.0 — self-host once a SaaS outgrows the free tier or has data-residency constraints; the *code pattern doesn't change*, only where the workers run. Named, not drilled (out of scope, ties to "two runtimes" — the workers move, the codebase doesn't).

## What ships alongside the app

The two operational facts the student must leave with. Both are real footguns; both get *named with their consequence* but their deep coverage is deferred (env validation → the app's `env.ts` discipline from Unit 11; deploy pipelines → Unit 20).

**Env surface.** Three variables, what each is for, where each lives:
- `TRIGGER_SECRET_KEY` — app-side, lets the SDK trigger tasks over HTTPS. Server-only secret. Distinct per environment (dev / staging / production) — sharing it across environments is the same blast-radius mistake as sharing a webhook secret (re-anchor L7-of-Ch.063 / the webhook-secret discipline).
- `TRIGGER_PROJECT_REF` — the `proj_…` ref in `trigger.config.ts` tying local code to the cloud project (re-anchor L4).
- `CRON_SECRET` — already met in L2; listed here so the student sees the *complete* background-work env surface in one place.
Present as a small annotated list or a 3-row table. Note these foreshadow Ch.067's `.env.example`. Keep it a *surface*, not a setup tutorial.

**Deploy ordering — the one new mental model.** The *principle*: when a deploy introduces a *new* task version that a Server Action triggers, the callee (the task) must be live before the caller (the app). If the app ships first, there's a window where it calls `tasks.trigger('new-task-id')` for a task version the workers don't have yet — that call fails at runtime. So the manual rule is **deploy Trigger.dev first** (`pnpm trigger deploy`), **then** the app (`vercel deploy`).

Then the *2026 reality* (one short paragraph — do not teach the manual workaround as the only story): Trigger.dev v4 ships **atomic deployments** and a first-party **Vercel integration** that automate exactly this. With them enabled, the Vercel deploy is gated until the task build completes, the matching task version is pinned (via `TRIGGER_VERSION`), and the two go live in lockstep — so the app never references a mismatched task version. Frame the manual ordering as *the principle the automation encodes*: the student should understand **why** callee-before-caller matters even when the platform handles the sequencing. Deeper CI/CD depth → Unit 20.

**Diagram — deploy ordering.** A tiny two-step temporal strip (the genuinely *new* idea here, so it earns a visual). `DiagramSequence` with two frames, or a simpler horizontal HTML phase strip inside `<Figure>` (two labeled steps with an arrow):
1. task version lands on Trigger.dev workers (`trigger deploy`, or the atomic-deploy gate).
2. app that references it goes live (`vercel deploy`).
Caption: deploy the callee before the caller — manually, or via atomic deployments that enforce it for you; the app must never reference a task version that isn't live yet. Pedagogical goal: turn an abstract ordering rule into a left-to-right "callee before caller" picture the student will remember at deploy time. `DiagramSequence` lets the student scrub the wrong-order failure too if the agent wants a second frame-pair, but two static steps suffice — keep it minimal.

Cost in operational terms (one short paragraph, no numbers/table — pricing is volatile, re-anchor L3): Trigger.dev bills per run, per run-minute, per concurrency seat — a different unit from Vercel's per-invocation. Monitor per-task run count weekly the same way you watch Vercel function invocations; a spike almost always means a missing idempotency key or a retry storm, not real growth (re-anchor L5's idempotency discipline). Do **not** compare Trigger.dev cost-per-run to Vercel cost-per-invocation — category error (re-anchor L3).

## Check your placement instinct

A single `MultipleChoice` to verify the student internalized the *defend-both-directions* skill, not just the table. Scenario-based stem (the senior question shape), e.g.: *"A teammate proposes moving the invitation email out of `inviteMember` and into a Trigger.dev task 'for consistency with the export job.' What's the right call?"* Correct answer names that no condition is crossed (one sub-second call, user must know it sent) so it stays inline; distractors include "yes, all async work should be durable" (the over-engineering trap the lesson exists to kill) and a plausible-but-wrong "yes, because emails can fail" (rebuttable: a single inline send surfaces the failure to the user immediately; retries would *hide* it). This checks the load-bearing skill: defending *not* escalating. Keep to one question — this is a short lesson.

## Where this goes next (no header / short closing)

Close the chapter's teaching arc. Restate the one-line decision rule that threaded all seven lessons. Hand off concretely to Ch.067: the project clones the starter, writes the `export-csv` `schemaTask` with payload validation, runs one `triggerAndWait` checkpoint per page with per-page idempotency keys, sends the final email, verifies runs in the dashboard, and *kills the worker mid-run to prove durability*. One or two `ExternalResource` / `LinkCard` cards: Trigger.dev v4 docs (canonical, version-volatile per the chapter's standing note) and the Vercel deploy/cron docs. Note L8 is the chapter quiz.

## Tooltip (`<Term>`) summary

All re-anchors of earlier-lesson terms (this lesson introduces none) — one-line definitions, used to keep flow without re-teaching:
- **`after()`** (L1) — same-invocation post-response callback, no durability.
- **predicate-idempotent** (L2) — a job whose `WHERE` clause the first run invalidates, so it needs no dedup key.
- **fan-out** (L3) — one trigger spawning many concurrency-limited child runs.
- **durable run** (L3/L5) — survives worker crashes and redeploys via checkpoints.
- **`concurrencyKey`** (L4) — splits a predeclared queue's limit into one lane per key (per-tenant isolation).
- **idempotency key** (L5) — stable key making a retried trigger/side-effect run once.

Be strategic: apply each `<Term>` only on first use in the lesson body, skip if the surrounding prose already defines it.

# Scope

**This lesson teaches no new Trigger.dev / Next.js API.** It is pure synthesis + two operational facts (env surface, deploy order). Everything below is *named or re-anchored*, never re-taught:

- Tier ladder mechanics, `after()` internals, `maxDuration` — taught L1. Re-anchor in one line only.
- Vercel Cron topology, `CRON_SECRET` verify-first, at-least-once — taught L2. `CRON_SECRET` reappears only in the env-surface list.
- The five conditions and the decision funnel (`StateMachineWalker`) — taught L3. Re-anchor by *applying* them to the three workloads; do **not** re-draw the funnel.
- `schemaTask`, queues, `concurrencyKey`, instance-method trigger form, schedules — taught L4. Illustrative snippets only, marked as such.
- Retries, `wait.*`, `idempotencyKeys.create`, durability mechanics — taught L5. Referenced for the cost/anomaly note only.
- Waitpoints (`wait.forToken`, `wait.completeToken`) — taught L6. Not needed here; mention only if a forward workload (approval flow) is referenced, and only by name.

**Deferred forward (name only, do not teach):**
- The CSV export task's **code** — Ch.067 (this lesson *places* it, Ch.067 *builds* it).
- The notification dispatcher's code, registry, channels, preferences, dedup — Ch.070 (dispatcher) / Ch.071 (project). This lesson names it as a fan-out workload only.
- Stripe reconciliation sweep implementation — forward note extending Unit 11; not built in the course.
- R2 / object storage as the *counter-example* (a job that is **not** Trigger.dev — presigned PUT inline) — that contrast is Ch.068 L5's job; if mentioned here, one clause max ("not every async job is a Trigger.dev job — the R2 upload in Ch.069 is a direct presigned PUT"), no detail.
- Full env-validation discipline (`@t3-oss/env-nextjs` in `env.ts`) — established Unit 11 / L2; here just list the three vars.
- Deploy pipelines / CI depth — Unit 20. Here: the *ordering rule* and its reason only.
- Self-hosting infrastructure — out of scope; one-sentence off-ramp (Apache-2.0).
- Cost/pricing numbers — volatile; operational framing only, no figures.

**Prerequisites to assume solid (do not re-teach, re-anchor in ≤1 line if load-bearing):** the whole L1–L6 ladder; `inviteMember` (L1 running example) and `notify-org-members` (L4 anchor) as known shapes; `tenantDb(organizationId)` tenancy (Unit 9-ish) and the org-context-as-cargo rule (L3); the webhook-secret-per-environment discipline (Ch.063) for the env blast-radius analogy; the Result-shape Server Action (Ch.043) as the inline trigger call site.

# Notes for downstream agents

- **Corrected forward references vs. chapter outline.** The chapter outline loosely says the notification dispatcher is "Chapter 071 forward note" and "Chapter 14 and beyond." Per the live Table of contents, the **dispatcher is Chapter 070** (Unit 13 — *The notification dispatcher*) and **071 is its project**. Use Ch.070 for the dispatcher concept, Ch.071 for its build. Do not write "Chapter 14."
- **Follow the continuity-notes corrections, not the chapter outline's stale phrasing**, on every Trigger.dev detail: per-tenant isolation is **`concurrencyKey`** (not dynamic queue names — v4 rejects those); the default trigger form is the **instance method** (`exportCsv.trigger(payload)`), string-id form is the cross-service escape hatch; tasks live in root **`trigger/`** declared via `dirs` in `trigger.config.ts`. The Code conventions doc's "dynamic per-tenant queue name" phrasing is stale — prefer `concurrencyKey`.
- **Deploy ordering, verified June 2026.** The manual "trigger deploy before vercel deploy" rule is correct, but Trigger.dev v4 now ships **atomic deployments** + a first-party **Vercel integration** that automate the lockstep (gate the Vercel deploy on the task build, pin `TRIGGER_VERSION`). The lesson teaches the *principle* (callee-before-caller) and *names* the automation — do not present the manual CLI ordering as the only 2026 path. Source: trigger.dev/docs/deployment/atomic-deployment, trigger.dev/changelog/vercel-integration.
- Keep the lesson short (20–30 min). Resist expanding any re-anchor into a re-teach. If a section starts re-explaining an API, cut it back to a `<Term>` + a forward/back reference.
- Every code snippet is illustrative and already-taught — label it so no downstream agent treats it as the place the API is introduced.
