# Lesson 2 — Vercel Cron as the schedule default

- Title: `Vercel Cron as the schedule default`
- Sidebar label: `Vercel Cron`

---

## Lesson framing

This is the tier-1 lesson: the first time the chapter moves work **off the request invocation entirely**. Lesson 1 drew the three-tier ladder (inline `await` → `after()` → off-invocation) and ended at tier 0.5. This lesson lands the cheapest tier-1 tool — Vercel Cron — and, just as importantly, pins the named threshold that bumps a scheduled job up to Trigger.dev (lesson 3). The whole lesson hangs off one senior question: a SaaS has a handful of recurring jobs (nightly digest, weekly rollup, expired-trial sweep, Stripe reconciliation) that run on a schedule, don't need cross-hour retries, and fit inside a function timeout — where does that work live, and when does it stop fitting?

The pedagogical thesis (per AGENTS.md): **the platform already does this.** A junior reaches for a queue or a worker the moment they hear "scheduled job." The senior move is to recognize that Vercel ships a scheduler that maps a cron expression to a route handler, and that for the common case this is the entire answer — no second platform, no infra. The lesson's job is to make the student able to *defend not reaching for Trigger.dev* for a schedule alone, while naming the exact properties (retries, durability past the function wall, fan-out, intermediate state) whose absence forces the escalation.

Pedagogical spine (stage to minimize cognitive load):
1. **Topology first, one diagram.** A cron is not magic — it's an external scheduler making an HTTP GET to a URL you own, on a cadence. Once the student sees "scheduler → GET `/api/cron/<name>` → your handler runs as a normal invocation → returns," every later property (it's public, it's bounded by `maxDuration`, it can be hit twice) follows mechanically. Lead with this.
2. **Then the trust boundary**, because the topology just revealed the handler is a public URL. This reuses the chapter-063 verify-first reflex (the cron is the *third* trust boundary the course has built, after the Stripe and Resend webhooks) — `CRON_SECRET` is the key, the `Authorization: Bearer` header is the proof. Restate, don't re-teach.
3. **Then delivery reality**, because the handler is now wired and secured: Vercel cron delivery is **best-effort** — it can both **miss** runs and **duplicate** them. This is the load-bearing correction over the naive "at-least-once" framing and it dictates the handler's shape (idempotent + reconciliation-based, catch-up-safe). This closes the chapter-063 dedup thread and the chapter-061 lifecycle-aware-UPDATE thread in one worked example.
4. **Then the threshold**, last: a cron handler is a function invocation, so it inherits every function limit. No retries on a 5xx, no backoff, bounded by `maxDuration`, overlapping runs on long jobs, one invocation per tick. Each absence is a named fork to lesson 3. This is the "trigger before tool" payoff.

Mental model the student leaves with: *Vercel Cron is a scheduled GET to a route handler you own. It is the right default for any recurring job that (a) fits one function invocation, (b) tolerates a missed-or-duplicated run, and (c) needs no automatic retry. The handler verifies `CRON_SECRET` first, then does idempotent, reconciliation-based work that is safe to run twice and safe to skip once. The moment the work outgrows one invocation, needs retries on failure, or fans out, the cron handler's job becomes "enqueue the real work elsewhere" — and that elsewhere is Trigger.dev.*

What the student can do by the end: add a `crons` entry to `vercel.json`, write a `GET` route handler at `app/api/cron/<name>/route.ts` that verifies `CRON_SECRET` before doing anything, write the trial-expiry sweep as an idempotent catch-up UPDATE, reason about UTC and the day-of-month/day-of-week constraint, test the handler locally with `curl`, and name which of the five missing properties would force the job up to Trigger.dev.

Plan-tier discipline (load-bearing, corrects the chapter outline): **Hobby crons run once per day only** (more-frequent expressions fail deployment) and may fire anywhere in the specified hour; **Pro and above** run at any frequency and fire within the specified minute. The chapter outline's `*/15 * * * *` and hourly `0 * * * *` examples are **Pro-only** — every sub-daily example in this lesson must carry that flag. The course's running SaaS is a Pro-tier app, so sub-daily examples are valid for it, but the Hobby restriction is stated plainly so a student on the free tier isn't surprised by a failed deploy.

Number discipline: the function-time wall is the corrected Fluid Compute figure established in lesson 1 — **5 min Hobby / 13 min Pro** — never the chapter outline's stale "1 min / 14 min." Reference it as "the same wall lesson 1 established," don't re-derive.

---

## Lesson sections

### Introduction — the jobs nobody clicks

Open with the concrete scene, no preamble. List the recurring jobs a real SaaS accumulates: email the nightly digest, roll up last week's usage, sweep trials that expired overnight, reconcile against Stripe. Nobody triggers these — they run on a clock. State the senior question plainly: where does work that runs on a schedule live, and when does it stop fitting the simplest answer? Preview the answer in one sentence (Vercel Cron is a scheduled GET to a route handler you already know how to write) and the deliverable (a secured, idempotent trial-expiry sweep, tested locally). Connect back: lesson 1 climbed the ladder to `after()` and stopped at "same invocation"; this lesson takes the first step *off* the invocation. Keep it warm and brief. Name the deliberate stop: dynamic per-tenant schedules and durable multi-step jobs are later lessons — this is the static-schedule, fits-in-one-invocation tier.

### How a cron job actually runs

The topology, made concrete so nothing downstream is magic. A Vercel cron is an **external scheduler** that, at the cadence you declare, makes a plain **HTTP GET** to a path in your project's production deployment. The handler at that path runs as an ordinary serverless function invocation — same runtime, same `maxDuration`, same logs — and returns. That's the whole mechanism: `scheduler → GET /api/cron/<name> → handler runs → returns`. Three consequences the student should derive from the topology (state them as "because it's just an HTTP GET to a public URL…"): it is a **public URL** (anyone can hit it → trust boundary, next section); it is **bounded by `maxDuration`** (it's a function → time wall applies); it can be **hit more than once** (network delivery → idempotency, two sections down).

Two facts that ride the topology: every cron request carries the user agent `vercel-cron/1.0` and an `x-vercel-cron-schedule` header containing the exact expression that fired it (useful when several schedules share one path — mention briefly, it's a real disambiguation tool, don't dwell). Crons run against the **production deployment only**, never preview or local dev (sets up the local-testing section).

**Diagram — the cron round-trip.** A small horizontal `ArrowDiagram` inside a `<Figure>` (set `expandable={false}` per the ArrowDiagram constraint — leader lines break when relocated). Three boxes left-to-right: `Vercel Scheduler` (clock glyph) → `GET /api/cron/sweep-trials` → `Route handler (one invocation)`. Label the first arrow with the cadence (`0 * * * *`), the second with `Authorization: Bearer CRON_SECRET`. Pedagogical goal: fix the "external scheduler hitting a URL I own" model in one glance, and pre-place the secret on the wire so the trust-boundary section has a visual anchor. Keep it one row, capped height.

`Term` candidates: **cron expression** (the five-field schedule string), **serverless function invocation** (one-line: a single short-lived execution of your handler, spun up per request and torn down after — restate, established earlier in the unit).

### The config and the handler file

The two artifacts, shown together. Use **CodeVariants** with two tabs (label them `vercel.json` and `route.ts`) so the student sees the schedule declaration and the handler it points at as one unit — this is the "multiple related files" case the component is for.

Tab 1 — `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/sweep-trials", "schedule": "0 * * * *" }]
}
```
Prose: each entry maps one cron expression to one path; the `path` is hit by GET at the cadence. Flag the `0 * * * *` (hourly) as **Pro-tier** inline here — the first place a sub-daily expression appears.

Tab 2 — `app/api/cron/sweep-trials/route.ts` (skeleton only here — the verify and the work land in the next two sections; show just the `export function GET` shell with a `// verify, then work` marker). Per code conventions: one handler file per route, `GET` as a named export, file is framework-named (`route.ts`, the default-export carve-out does **not** apply — route handlers use named `GET`/`POST` exports).

Handler-location convention (short prose, not a separate section): one folder per cron job, one `route.ts` per folder (`app/api/cron/<name>/route.ts`). The path then shows up grouped in deploy config and in logs filtered by `requestPath:/api/cron/<name>`. A small `<FileTree>` showing `app/api/cron/sweep-trials/route.ts` and a sibling `app/api/cron/daily-digest/route.ts` makes the one-folder-per-job convention concrete.

### A cron handler is a public door

The trust boundary, reusing the chapter-063 reflex. The topology already exposed it: `/api/cron/sweep-trials` is a public, unauthenticated URL — anyone who finds it can trigger your sweep. State the senior anchor: **this is the third trust boundary the course has built.** The Stripe webhook (ch063 L1) and the Resend webhook (ch063 L5) proved identity with an HMAC signature; a cron has no signature, so Vercel uses a **shared secret**. Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on every cron invocation; the handler verifies it and refuses on mismatch.

The canonical verify-first shape, given dedicated weight as an **AnnotatedCode** walkthrough of the guard:
1. Read the `authorization` header.
2. Compare against `Bearer ${process.env.CRON_SECRET}`.
3. On mismatch (or missing secret), return **401** and stop — no work, no logging of the request.
4. Only past the guard does any work run.

Two senior points to fold in at the line they apply to (never bundled):

- **401 here, not 400 — and why it differs from the webhook.** This is the deliberate contrast students will trip on. A webhook signature failure returns **400** (ch063: a malformed *proof* is a bad request, and 4xx tells the sender to stop retrying). A cron auth failure returns **401**: it's *missing/invalid identity* on a private endpoint, and the caller is either Vercel-with-the-right-secret or an attacker — there's no legitimate retrying third party to discourage. Vercel's own docs use 401. State the rule and the one-line reason; point back to ch063's 400 so the student files them as two different boundaries, not a contradiction.
- **Constant-time compare — the course hardening.** Vercel's docs show a plain `authHeader !== \`Bearer ${secret}\`` string comparison. The course tightens this to a **constant-time** compare (`crypto.timingSafeEqual` on the Node runtime, length-checked first), the same discipline landed in ch063 L1. The honest framing: a timing attack on a bearer token is low-severity and Vercel's plain compare is defensible, but the course's reflex is "compare secrets in constant time, every time" — it costs one helper and removes the whole class. Flag this as a **deliberate divergence** from the Vercel docs example so a downstream agent doesn't "simplify" it back to `!==`. Restate the constant-time rule in one line; the mechanism was taught in ch016 L1 / ch063 L1.

Env wiring (short prose + a one-line **Code** block): add `CRON_SECRET` to `env.ts` as a server var, Zod-validated, fail-the-build-if-missing — the same `@t3-oss/env-nextjs` discipline as the webhook secrets, one line, don't re-teach. Vercel recommends a random string ≥16 chars. Note it lives only in the Vercel project env + `.env` locally, never client-bundled, never logged.

`Term` candidates: **`CRON_SECRET`** (the shared secret Vercel injects as a bearer token on cron invocations), **bearer token** (one-line, if not already a live term: a secret string presented in the `Authorization` header that grants access by possession alone).

### Delivery is best-effort: design for missed and duplicate runs

The correction that shapes the whole handler, and the close of the chapter-063 dedup thread. State the reality precisely (this is the verified 2026 behavior, and it corrects the naive "at-least-once" framing): **Vercel cron delivery is best-effort.** Two failure modes, both of which the handler must tolerate:

- **Missed runs.** A transient network error can prevent the request reaching your function — the run simply doesn't happen, and no log is produced for it. The handler cannot assume "I ran an hour ago."
- **Duplicate runs.** Delivery can occasionally invoke the same scheduled run more than once, seconds apart. The handler cannot assume "this is the only time I'm running for this tick."

The senior pattern that satisfies both at once: **idempotent and reconciliation-based.** Don't compute a delta from "last time I ran"; instead, each run **queries and processes all outstanding work since the last successful completion**, in a way that is safe to run twice. Vercel's own framing nails the contrast — "set status to active" (safe to repeat) vs "increment credit by 10" (doubles on a duplicate). A reconciliation query handles a missed run for free (the next run catches up) and a duplicate run for free (the second run finds nothing left to do).

Tie this back explicitly to the dedup discipline from ch063: for jobs whose effect is a **SQL UPDATE on a predicate** (the trial sweep), the predicate *is* the idempotency — re-running re-evaluates the same `WHERE` and finds nothing matching the second time, so **no extra dedup key is needed.** For jobs whose effect is an **external side effect** (sending an email, charging a card), repetition is visible to the user, so those need the ch063 dedup-and-transact shape — a claim row under a unique key (`cron:<name>:<yyyy-mm-dd>` granularity) inside the same transaction as the work, exactly the `processed_events` pattern. State the rule as a one-line discriminator: *idempotent-by-predicate jobs need no key; user-visible-side-effect jobs need the claim.*

**Exercise — `Buckets` (classification).** Two columns: "Safe to run twice as-is" vs "Needs a dedup key / claim." Items to sort: `UPDATE trials SET status='expired' WHERE trial_end < now() AND status='active'` (safe — predicate idempotent), `send the weekly digest email to every active org` (needs key — duplicate inboxes), `INSERT a usage-rollup row for last week` (needs key / unique constraint — duplicate rows), `recompute and SET each org's seat count from members` (safe — derived/converging), `charge each past-due invoice` (needs key — double charge). Goal: cement the predicate-vs-side-effect discriminator, which is the single most useful judgment in the lesson. One-line rationale on each item's reveal.

`Term` candidates: **idempotent** (restate, ch063: an operation whose repeated application has the same end effect as one application), **reconciliation** (one-line: processing all outstanding work from a known-good baseline rather than a remembered delta, so a missed or duplicated run self-heals).

### Worked example — the trial-expiry sweep

The chapter's tier-1 anchor, end to end, and the close of the chapter-061 lifecycle-aware-UPDATE thread. Build `app/api/cron/sweep-trials/route.ts` in full: hourly schedule (`0 * * * *`, **Pro-tier** — flag once more at the schedule line), verify `CRON_SECRET`, then one transaction doing a lifecycle-aware UPDATE that expires every still-active trial whose end has passed, audit-logs each affected row, and returns 200 with the count.

The UPDATE is the payoff — it is *naturally* reconciliation-based, so it needs no dedup key:
```ts
const expired = await tx
  .update(planEntitlements)
  .set({ status: 'expired' })
  .where(and(
    eq(planEntitlements.plan, 'trial'),
    lt(planEntitlements.trialEndsAt, /* now */),
    eq(planEntitlements.status, 'active'),
  ))
  .returning({ organizationId: planEntitlements.organizationId });
```
Use **AnnotatedCode** for the whole handler so each decision gets a spotlight: (1) the `GET` signature and the early `CRON_SECRET` guard returning 401; (2) opening the `db.transaction`; (3) the predicate-guarded UPDATE, with the `status = 'active'` clause colored — it's what makes the second run a no-op (a re-run finds zero `active` trials past their end because the first run already flipped them); (4) `.returning()` to get the affected org IDs; (5) `logAudit(tx, …)` per affected row, inside the same transaction (the ch057 pattern — audit writes are never deferred); (6) return `Response.json({ expired: expired.length })` with 200. Keep each step's prose ≤6 lines, color the idempotency-bearing predicate clause distinctly.

Senior points to fold in at the relevant lines:
- **No external calls inside the transaction.** The audit-log writes are DB rows and belong inside `tx`; if this sweep also needed to *email* each expired org, that send would move outside the transaction (ch063 / code-standards rule) — and at email-per-row volume it would be the thing that bumps the job to a Trigger.dev fan-out (forward pointer to the threshold section). Name it, don't build it.
- **`.returning()` gives both the work and the receipt.** Same shape as the ch061 L3 ordering UPDATE — the count of returned rows is the observable result the handler reports and logs.
- **The predicate is the idempotency.** Re-state at the colored line: because the `WHERE` filters on `status = 'active'`, the operation is safe to run twice with no claim row — this is the predicate-idempotent case from the previous section, made concrete.

Note the Temporal seam in one line (don't re-teach): the "now" comparison and `trialEndsAt` storage follow the course's Temporal-at-the-domain, `Date`-only-at-the-Drizzle-seam convention from earlier units; the lesson treats the comparison value as established plumbing and keeps focus on the cron + idempotency shape. Downstream agents should not invent a new time API here.

Schema note for the writer: `planEntitlements` is owned by ch064 L4 — use it only as a shape sketch (the columns referenced: `plan`, `status`, `trialEndsAt`, `organizationId`), exactly as ch063 L3 treated it. Do not define or migrate the table in this lesson.

### Cron expressions you will actually write

The expression syntax, scoped tightly to what's real on Vercel — and this is where the plan-tier and the two genuine gotchas live. Show a compact reference (a small table or a tight `Code` list), each with its plain-English meaning and a Pro/Hobby flag:
- `0 9 * * *` — daily at 09:00 UTC. **Hobby-OK** (daily is the only Hobby cadence).
- `0 0 * * 0` — weekly, Sunday 00:00 UTC (numeric `0` = Sunday).
- `0 0 1 * *` — monthly, first of the month 00:00 UTC.
- `0 * * * *` — hourly. **Pro-only.**
- `*/15 * * * *` — every 15 minutes. **Pro-only.**

Three load-bearing rules, each given a sentence (these correct/extend the chapter outline):
- **UTC always.** Vercel cron expressions are evaluated in UTC, full stop — there is no timezone field. A "9am" schedule is 9am UTC, which drifts relative to any local wall-clock across DST. For UTC-anchored sweeps (the trial sweep, reconciliation) this is fine. For *business-hours* schedules ("email at 9am the customer's local time"), a plain UTC cron is the wrong tool — that need is what timezone-aware Trigger.dev schedules solve (forward pointer to lesson 4). State the limitation here as a named threshold, not a workaround.
- **No alphabetic aliases.** Vercel does **not** support `MON`/`SUN`/`JAN`/`DEC` — numbers only. (Corrects the implicit assumption that standard-cron niceties are available.) No `L`/`W`/`#` step-extensions either, and no seconds field.
- **Day-of-month and day-of-week are mutually exclusive.** When one of the two day fields has a value, the other **must** be `*`. You cannot say "the 1st *and* every Monday" in one Vercel expression. This is a real deploy-time constraint and a common surprise.

Plan-tier accuracy, stated once and plainly: on **Hobby**, only once-per-day expressions deploy at all (more-frequent ones fail the build), and the job may fire anywhere within the specified hour. On **Pro and above**, any frequency is allowed and the job fires within the specified minute. Up to **100 cron jobs per project on every plan** (the Jan-2026 limit lift). Frame this as "know your tier before you write a sub-daily expression."

Optional `ExternalResource` card to [crontab.guru](https://crontab.guru) for validating expressions — the standard tool, worth a pointer.

### Where Vercel Cron stops — and what it costs

The threshold section, the "trigger before tool" payoff and the bridge to lesson 3. A cron handler is a function invocation, so it inherits every function limit — and each gap is a named fork. Present the gaps as a tight list, each tied to the escalation it forces (this is the lesson's senior thesis crystallized):
- **No automatic retries.** A 5xx response is logged, not retried — Vercel will not re-invoke a failed cron. Work that *must* survive a transient downstream outage on its own schedule needs a runtime that retries (→ lesson 3/5).
- **The function-time wall.** The handler is bounded by `maxDuration` — the same **5 min Hobby / 13 min Pro** wall lesson 1 established. A 50,000-user digest that emails one-by-one will time out. When the work doesn't fit, the cron handler's job becomes *"enqueue the real work"* and the heavy lifting moves to a Trigger.dev fan-out (→ lesson 3/4). State this inversion explicitly: the cron stays, but it shrinks to a trigger.
- **Overlapping runs.** If a job runs longer than its interval, Vercel can start a second instance while the first is still running — a race. Mitigations are reduce time / increase interval / a lock; needing a distributed lock here is itself a signal the work wants a real queue with concurrency control (→ lesson 4's code-defined queues).
- **No intermediate-state visibility, no pauses, no fan-out.** One invocation per tick, no step timeline, no waitpoints. Observability is `console.log` plus the Vercel logs view — which you build by hand, versus the run timeline Trigger.dev gives for free. That observability gap is itself part of the threshold calculus (→ lesson 3).

Cost shape (short, concrete): crons are metered as **invocations plus compute**, and **frequency drives cost, not the work**. Every-minute = 43,200 invocations/month; daily = 30. A once-per-minute "do nothing" job costs more than a daily heavy one. The senior takeaway: run jobs no more often than the freshness requirement actually demands.

**Diagram — the schedule decision, walkable.** A `StateMachineWalker` (`kind="decision"`, no `<Figure>` wrapper — it's its own card) that walks the student through "I have a recurring job — where does it live?" The walk forces the *order* a senior asks the questions in:
- Root: *"Does the whole job finish inside one function invocation (minutes-scale)?"* → No → leaf **Trigger.dev** ("past the function-time wall — lesson 3").
- Yes → *"If a run fails, is a missed run acceptable until the next tick (no automatic retry needed)?"* → No → leaf **Trigger.dev** ("needs durable retries with backoff").
- Yes → *"Does one tick fan out into many independent units (N emails, N tenants) needing concurrency control?"* → Yes → leaf **Vercel Cron triggers a Trigger.dev fan-out** ("cron stays as the trigger; the work moves").
- No → *"Is the schedule fixed and UTC-anchored (not per-tenant, not business-hours-local)?"* → No → leaf **Trigger.dev dynamic / timezone-aware schedules** ("lesson 4").
- Yes → leaf **Vercel Cron** ("the platform default — you're done").

Pedagogical goal: the lesson lives in the *order of the questions*, not any single leaf. Each leaf names the exact missing property, so the student can defend both "no, Vercel Cron is enough" and "yes, escalate, because of this property." This is the chapter's central decision made interactive. (The full five-condition Trigger.dev decision tree is lesson 3's; keep this one scoped to the schedule decision and forward-point.)

### Running and watching a cron locally

The daily iteration loop, so the student can run what they built. The constraint first: **Vercel does not run crons against `next dev`** (no `vercel dev` / `next dev` support for cron triggers). Because the handler is just a route, you test it by hitting the URL yourself:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sweep-trials
```
Use a **Code** (bash) block. The workflow stated as a loop: write it as a normal `GET` route, exercise it locally with `curl` carrying the bearer header (a request *without* the header should 401 — a quick way to confirm the guard works), deploy, then watch the real invocations in the Vercel **Logs** view filtered by `requestPath:/api/cron/<name>` (or the cron job's "View Logs" button).

Two watch-outs that live naturally here:
- **Cron does not follow redirects.** If your handler returns a 3xx, the cron treats it as final and stops — a redirected cron silently never does its work. Return a 2xx (or an error status), never a redirect.
- **A nonexistent path still "runs."** A cron pointed at a path that 404s still counts as an invocation (and logs a 404) — a typo'd `path` in `vercel.json` fails silently as "it ran but did nothing." Check the path matches the route folder exactly.

`Term` candidate: **`curl`** only if not already a live term in the course (almost certainly is by this unit — skip if so).

### Check your understanding

Two complementary checks, placed here to consolidate before the chapter climbs to Trigger.dev.

1. **`MultipleChoice` / `TrueFalse` round** on the high-value decisions: (a) a `CRON_SECRET` mismatch returns 401, and *why it differs from the webhook's 400* [identity-gating vs malformed-proof]; (b) Vercel cron delivery can both miss and duplicate runs, so handlers must be idempotent **and** catch-up-based [not just "at-least-once / handle duplicates"]; (c) Vercel does **not** retry a failed cron — a 5xx is logged, not re-invoked; (d) on Hobby, a `*/15 * * * *` expression fails to deploy (sub-daily is Pro-only); (e) the trial-sweep UPDATE needs no dedup key because its `WHERE status='active'` predicate makes a second run a no-op. One-line rationale on each reveal.

2. **`Dropdowns` (fenced-code fill-in)** over the canonical handler skeleton with three blanks: the cron `schedule` string for "hourly" (`0 * * * *`), the missing piece of the auth guard (`Bearer ${process.env.CRON_SECRET}`), and the predicate clause that makes the sweep idempotent (`status = 'active'` / `eq(planEntitlements.status, 'active')`). Goal: make the student *produce* the three load-bearing tokens (cadence, secret check, idempotency predicate) rather than just recognize them.

Note for the writer: a graded live-coding sandbox is **not** worth it here. The server-context handler (route handler, `db.transaction`, `crypto.timingSafeEqual`, env access) cannot run in the `ReactCoding` iframe, and a SQL/Drizzle sandbox would test the UPDATE in isolation while the lesson's real content is the *decisions* (trust boundary, delivery semantics, the threshold). The `Buckets` + `MultipleChoice` + `Dropdowns` trio checks judgment and the load-bearing syntax, which is what this lesson is about. If a coding interaction is later desired, a `DrizzleCoding` of *just* the predicate-idempotent UPDATE (won-claim style, PGlite-limited schema) is the only viable candidate — but it duplicates the ch061 L3 exercise's shape and isn't recommended as a first add.

---

## Scope

**This lesson covers:** the Vercel Cron topology (scheduler → GET → route handler invocation); the `vercel.json` `crons` config shape and the `app/api/cron/<name>/route.ts` handler location; the cron handler as a public trust boundary; `CRON_SECRET` + `Authorization: Bearer` verify-first auth returning **401** on mismatch (contrasted with the webhook's 400) with a constant-time compare; the `env.ts` entry; best-effort delivery (missed **and** duplicate runs) and the idempotent-reconciliation handler shape; the predicate-vs-side-effect dedup discriminator (predicate-idempotent jobs need no key; user-visible-side-effect jobs reuse the ch063 claim); the trial-expiry sweep worked example (lifecycle-aware predicate UPDATE with `.returning()` + per-row `logAudit` in one transaction); five-field UTC cron expressions and their Vercel-specific limits (no alphabetic aliases, no `L`/`W`/seconds, day-of-month/day-of-week mutual exclusivity); the Hobby-daily-only vs Pro-any-frequency plan distinction and the 100-cron-per-project limit; the no-retries / function-time-wall / overlapping-runs / no-fan-out thresholds that escalate to Trigger.dev; the invocation+compute cost shape; and the local `curl` test loop plus the redirect / nonexistent-path watch-outs.

**Out of scope — do not teach (redefine prereqs in one line only):**
- **Dynamic per-tenant schedules and timezone-aware (`cron` object) schedules** — Trigger.dev `schedules.create` / `schedules.task` → **lesson 4 of ch066**. This lesson is static, UTC-anchored schedules only; name the per-tenant and business-hours-local needs as thresholds and forward-point.
- **Durable multi-step jobs, fan-out with concurrency control, and long-running work past the function wall** — **lessons 3–4 of ch066**. The cron handler here is single-invocation; the "enqueue the real work" inversion is named, not built.
- **Automatic retries, backoff, `wait.for`/`wait.until`, waitpoints** — **lessons 3, 5, 6 of ch066**. Named only as the properties Vercel Cron lacks.
- **The five named Trigger.dev trigger conditions and the full decision tree** — **lesson 3 of ch066**. This lesson's `StateMachineWalker` is scoped to the *schedule* decision only.
- **Inline `await` and `after()`** — **lesson 1 of ch066** (established: the three-tier ladder, corrected 5 min/13 min caps, `inviteMember`, the `logAudit`-never-deferred rule). Restate the ladder in one line as the climb-from context; do not re-teach `after()`.
- **HMAC signature verification, constant-time compare mechanics, the `processed_events` ledger, `ON CONFLICT DO NOTHING RETURNING`** — **ch063 L1/L2/L4**. Restate the constant-time rule and the claim-and-transact shape in one line each; reuse, don't re-teach. The cron's bearer-token check is *not* an HMAC — make that distinction, don't re-explain HMAC.
- **The lifecycle-aware UPDATE / `.returning()` zero-rows pattern and the `sql` tagged-template increment** — **ch061 L3**. The trial sweep reuses the predicate-UPDATE-with-returning shape; cite it, don't re-derive.
- **`logAudit(tx, event)` internals** — **ch057** (and ch063 reuse). Use the call; the signature forcing a transaction is assumed known.
- **`planEntitlements` schema (columns, `trialEndsAt`/`status` types, `last_event_at`)** — **ch064 L4**. Shape sketch only; never define or migrate the table here.
- **Stripe reconciliation sweep wiring** — named as a recurring-job example only; the actual reconciliation job lives in **lesson 7 of ch066** (forward note) / Unit 11. Do not build it.
- **Structured logging internals, `requestId`/AsyncLocalStorage, stale-event alerting** — **ch092**. Reference "your structured logger" in one line.
- **Temporal API depth / the `lib/temporal.ts` codec** — established earlier in the course. The "now" comparison is plumbing; keep focus off it.
- **`maxDuration` deployment configuration depth** — **lesson 3 of ch098**. The time wall is named (5/13 min) and used as a threshold, not configured.
- **`env.ts` / `@t3-oss/env-nextjs` mechanics** — code conventions. One line.

---

## Notes for downstream agents (deliberate divergences)

- **401, not 400, on the cron auth guard** — this is intentional and *differs* from ch063's webhook 400. The lesson must explain the difference (identity-gating a private endpoint vs rejecting a malformed signature proof). Vercel's docs confirm 401. Do not "align" it to the webhook's 400.
- **Constant-time compare is a deliberate divergence from Vercel's docs example**, which uses a plain `!==`. Keep the constant-time compare (course discipline from ch063 L1) and flag in-prose that it diverges from (and hardens) the official snippet. Do not simplify it back to `!==`.
- **Plan-tier flags are mandatory on every sub-daily expression.** Hobby = once-per-day only (sub-daily expressions *fail deployment*) and fires within the hour; Pro = any frequency, fires within the minute. The chapter outline's `*/15` and hourly examples are Pro-only — never present a sub-daily cron without the tier flag. (Corrects the chapter outline, which omitted the Hobby restriction.)
- **Delivery is "best-effort" (miss + duplicate), not plain "at-least-once."** The handler must be idempotent **and** reconciliation/catch-up based. This is the verified 2026 Vercel behavior and it corrects the chapter outline's duplicate-only framing. The predicate-vs-side-effect discriminator is the load-bearing judgment — keep the `Buckets` exercise.
- **Function-time wall is 5 min Hobby / 13 min Pro** (lesson 1's corrected figures), never the chapter outline's stale "1 min / 14 min." Reference, don't re-derive.
- **`planEntitlements` is a shape sketch only** (owned by ch064 L4) — using it for the sweep must not drift into defining or migrating it. Same posture ch063 L3 took.
- **No graded server-context sandbox** — the handler can't run in the React iframe and the lesson's value is the decisions. Stick to `Buckets` / `MultipleChoice` / `Dropdowns`.
- Cross-references use the course's lesson-link convention; resolve `[ch063 L1]` etc. to real slugs and avoid triple-dash artifacts in slugs.
