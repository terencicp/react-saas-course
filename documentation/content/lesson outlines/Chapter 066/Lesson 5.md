# Lesson 5 outline — Surviving crashes: retries, waits, idempotency keys

## Lesson title

- **Title:** Surviving crashes: retries, waits, and idempotency keys
- **Sidebar label:** Retries, waits, idempotency

## Lesson framing

This is the chapter's payoff lesson. L1–L4 established the ladder (inline → `after()` → Cron → Trigger.dev) and the SDK surface to *define, type, trigger, queue, and schedule* a task. This lesson teaches what makes a task **survive production**: the worker crashes mid-run, a downstream rate-limits, a third party is slow. The student must leave able to write a multi-step task that resumes after a crash without re-doing committed work or re-sending emails.

**The single most important idea**, returned to at every turn: **durability lives in the seams between steps, not inside them.** The runtime checkpoints at every `await wait.*` and every `await *.triggerAndWait`. A crash resumes from the last checkpoint. Therefore (a) a long synchronous loop inside one step is *not* durable — split it; and (b) any step with a side effect (DB write, Resend send, charge) runs *again* on a retry unless guarded by an idempotency key. Every "duplicate email" production bug is this one missing key. This lesson closes the idempotency thread the chapter has carried since Ch.063 L4 and L1's "threshold 4" by turning it into a concrete runtime primitive.

**Pedagogical spine — three movements, escalating:**
1. **What durable means** (checkpoints, resume) — the mental model everything else hangs on. Visualize with a crash-and-resume `DiagramSequence`; this is the load-bearing diagram of the lesson.
2. **Retries** (declarative backoff; retry-vs-abort; run-level vs call-level) — and the duplicate-side-effect trap that retries create.
3. **Idempotency keys + waits** — the fix for the trap (`idempotencyKey`, `scope`, the cross-step loop pattern) and the durable-pause primitives (`wait.for` / `wait.until`) that make multi-step tasks possible in the first place. Cancellation is a short coda, named not drilled.

**Why this order.** The student should feel the *problem* (a retry silently re-sends N emails) before the *fix* (per-step keys). So retries come before idempotency, and the duplicate-email trap is the bridge between them. Waits sit last because they are how you *create* the step boundaries that retries and keys operate on — and because `wait.until(pastDate)` and `setTimeout`-vs-`wait.for` are the two gotchas that land best once durability is already understood.

**Tone / level.** This is a senior-mindset lesson: the API is small, the *reasoning* is everything. Lead each section with the failure it prevents. Frame in production stakes — "the worker died at 8 of 10 minutes," "the third party returned 429 on call 3 of 50." The student already knows the SDK (L4) and the Ch.063 dedup-and-transact discipline; this lesson re-expresses that discipline at the task boundary, so explicitly connect back to it rather than re-teaching it.

**Mental model to end with.** "A durable task is a chain of small, idempotent steps separated by checkpoints. The runtime owns resume and retry; I own making each step safe to run twice and choosing where the boundaries go."

**Runtime constraint (drives all exercise choices).** Trigger.dev tasks are a *server* runtime; they cannot execute in the ReactCoding or Sandpack browser iframes (see project memory: ReactCoding is react-only; SDK iframes can't load third-party npm). So **no live coding sandbox in this lesson.** Code is taught through `Code`, `AnnotatedCode`, and `CodeVariants`; understanding is checked with conceptual exercises (`Buckets`, `PredictOutput`, `Sequence`, `MultipleChoice`) that need no runtime. State this constraint to downstream agents so nobody reaches for a sandbox.

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the concrete senior question, not a definition. A task exports ten minutes of invoices. The worker is redeployed (or OOM-killed, or the platform recycles it) at minute eight. A third party rate-limits the third API call. Three plain questions: *What does Trigger.dev do automatically? What must you do? Where do the production bugs hide in the seam between the two?* State the payoff: by the end you can write a multi-step task that survives all three and never double-sends. Connect back: L4 gave you `schemaTask`, queues, triggering; this lesson makes those tasks crash-proof. One sentence linking forward: this is the exact shape Ch.067's CSV export build uses.

Keep it to ~4 short paragraphs. No section header — per pedagogical guidelines the intro is unlabeled prose.

### Durability is a property of the seams, not the steps

The conceptual core. Teach in three beats:

**Beat 1 — what "durable run" means.** A durable run survives worker crashes, redeploys, and platform restarts. Define `Term`: **durable run**, **checkpoint**. The mechanism: the runtime serializes run state and checkpoints at every `await wait.*`, every `await *.triggerAndWait`, and at the end of every attempt. On crash, a *new* worker rehydrates from the last checkpoint and continues. Make explicit this was foreshadowed in L3 ("durable run" Term) — now we see how.

**Beat 2 — the load-bearing consequence.** Durability lives *between* steps. State it as a rule and stress it: code *inside* a single step is not checkpointed mid-execution. A 9-minute synchronous CPU loop in one step is not durable — kill the worker at minute 5 and the whole loop restarts from zero. The fix: split long work into small steps separated by `wait` or `triggerAndWait`, so each completed step is a checkpoint you never re-cross. This is the design principle the whole lesson serves.

**Beat 3 — visualize it.** Primary diagram of the lesson. **`DiagramSequence`** (scrubbable; it provides its own card — do not wrap in `<Figure>`). Pedagogical goal: make "resume from last checkpoint" *visible and kinetic* so the abstract claim becomes intuition. Suggested steps (HTML/CSS panels, horizontal step-strip, ~6 steps):
  1. Run starts: step A (write page 1) executing; a checkpoint marker after A is dim.
  2. Step A completes → checkpoint A lights up (durable boundary crossed).
  3. `wait.for` / step B (write page 2) executing.
  4. **Worker crashes** mid-step-B — show the worker box going dark, step B aborted, but checkpoint A still lit.
  5. New worker spins up, rehydrates from checkpoint A — step A is *not* re-run (greyed "skipped, cached"), step B re-executes.
  6. Run completes; all checkpoints lit. Caption hammers the takeaway: "completed steps are never re-run; the step in flight at crash time is."
Keep panels visually simple (boxes + light/dark states + a crash bolt). Caption each step with one sentence.

Close the section with the one-line reflex to carry forward: **"split long work at `wait` / `triggerAndWait` boundaries — each boundary is a save point."**

`Term` candidates here: **durable run**, **checkpoint**, **worker** (one line: the Trigger.dev compute process that runs your task, separate from the Vercel function).

### Retries are the runtime's job, declared not coded

Teach retries as configuration the student declares once, then leaves alone.

**The config.** Show the `retry` block on a task with `Code` (simple block is enough; the shape is small and self-explanatory):
```ts
retry: { maxAttempts: 5, factor: 1.8, minTimeoutInMs: 1_000, maxTimeoutInMs: 60_000, randomize: true }
```
Walk each field in prose (not AnnotatedCode — too small to warrant stepping): `maxAttempts` total attempts; `factor` the exponential multiplier; min/max timeout the backoff floor/ceiling; `randomize: true` adds jitter. Re-anchor the L3 `Term` **exponential backoff with jitter** and say *why* jitter matters in one line — without it, every retry of every run fires at the same instant and stampedes the downstream that just recovered. Note retries can also be set project-wide in `trigger.config.ts` and overridden per task (named, one line).

**The discipline: retries are declarative, not imperative.** State the rule plainly: a `throw` triggers a retry with the configured backoff — you do **not** write `try/catch` + manual retry loops around an external call. The runtime already owns it; hand-rolling a second retry layer multiplies attempts and corrupts the backoff. `ctx.attempt.number` (re-anchor from L4) tells the body which attempt it is on if it ever needs to branch.

**Retry vs abort — what gets retried.** The key decision. Any `throw` retries by default. The exception: `AbortTaskRunError` skips all remaining retries and fails the run immediately. The rule, stated as a heuristic the student will reuse in code review: **retry on transients, abort on permanents.** Transients = 5xx, network errors, 429 rate-limits — they'll likely succeed later. Permanents = a 400 with a stable payload, a validation failure, a programmer bug — retrying five times just wastes five backoff windows and delays the inevitable failure. Show both throws side by side with **`CodeVariants`** (label "Transient → retry" vs "Permanent → abort"), each ~5 lines, using `del`/`ins` or color to contrast a bare `throw`/auto-retry against `throw new AbortTaskRunError(...)`. First sentence of each variant carries the framing.

**Exercise — `Buckets` (retry vs abort).** Right after the heuristic, while it's fresh. Two buckets: "Retry (transient)" / "Abort with AbortTaskRunError (permanent)". ~6 chips: `Resend returns 429`, `Postgres connection reset`, `Stripe 500`, `Zod payload failed to parse`, `404 from a resource that will never exist`, `third-party 503`. Grading is exact bucket match. Goal: cement the transient/permanent split as a reflex, not trivia.

`Term` candidates: **`AbortTaskRunError`** (throw this to fail a run immediately with no further retries), **jitter** (if not already covered by the L3 backoff Term — prefer reusing L3's phrasing).

### Run-level vs call-level retries — and the duplicate-side-effect trap

This is the conceptual hinge of the lesson — it *creates* the problem that idempotency keys solve. Make the student feel the bug before the fix.

**Two retry layers.** Distinguish clearly:
- **Run-level retry** — the `retry` config above. On an unhandled throw, the runtime re-runs the task **from the top of the current attempt's checkpoint**. Crucially for a body with no internal checkpoints: *every line re-executes.*
- **Call-level retry** — the SDK's own automatic retry of an individual rate-limited API call (e.g. an SDK wrapper that retries a 429 on a single `fetch`), which restarts only the failing call, not the run.

The student mostly configures and reasons about run-level; name call-level so they don't confuse the two or stack a third manual layer.

**The trap, made vivid.** A run-level retry re-executes side-effecting lines. So a task that loops over N users and sends an email each, if it throws on user 200 and retries, **re-sends to users 1–199.** State this as the cause of essentially every duplicate-email incident in production background jobs. 

**Exercise — `PredictOutput` (feel the duplicate).** Strongly recommended here; it makes the trap unforgettable. A tiny illustrative task body that `console.log`s a "sent to user N" line in a loop, then `throw`s on iteration 3, with `maxAttempts: 2`. Ask the student to predict stdout. Expected output shows users 1, 2 logged, the throw, then on retry users 1, 2 logged *again* before reaching 3 — the duplication is right there in the output. `PredictWhy`: run-level retry restarts the body from the top; without a per-iteration idempotency key, every completed send repeats. This sets up the very next section as the resolution. (Code is illustrative pseudo-runtime — fine for PredictOutput, which runs nothing; label it as conceptual.)

Close with the one-line bridge: *"the runtime will happily run your side effects twice — the next section is how you make twice safe."*

`Term` candidates: **run-level retry**, **call-level retry**, **side effect** (only if the audience needs it — likely already known; skip if so).

### Idempotency keys make a retried step run once

The payoff. Re-frame, do not re-teach, the Ch.063 L4 dedup-and-transact discipline: same idea (a stable key makes repeated work happen once), now a first-class runtime primitive instead of a DB claim row.

**The primitive.** Every `trigger`, `triggerAndWait`, and `batchTriggerAndWait` accepts `idempotencyKey` and `idempotencyKeyTTL`. Within the TTL, the *same key returns the same run handle* — no new run, no re-execution, the original (or in-flight) result comes back. Show the basic shape with `Code`:
```ts
await chargeCustomer.trigger(payload, { idempotencyKey, idempotencyKeyTTL: '24h' });
```
**Fact-checked specifics to get right (downstream agents must not drift):**
- `idempotencyKeyTTL` is a **duration string** (`'60s'`, `'5m'`, `'24h'`, `'3d'`), **not** a number of ms. Default TTL is **30 days**.
- Keys are created with **`idempotencyKeys.create(key | key[], { scope })`**. A key array (`[organizationId, 'export', day]`) is hashed into a stable 64-char key — the ergonomic way to build keys from parts. (This supersedes the chapter outline's manual `` `${a}:${b}` `` string-concatenation sketch; mention the manual form only as the underlying mental model.)
- **`scope`** is the clean way to express intent — teach it as the primary mechanism:
  - `scope: 'run'` (the default) hashes the key **with the parent run id**, so the *same logical key re-issued by a retry of the same parent maps to the same child run* — exactly what you want for per-step keys inside a retrying task. This replaces hand-prefixing `ctx.run.id`.
  - `scope: 'global'` hashes the key alone — "this task runs once, ever" — for a stable business key triggered from the app (e.g. one export per org per day).
  - `scope: 'attempt'` (name only, one line) re-allows the work on each retry attempt — rarely what you want for side effects.

**`AnnotatedCode` — the canonical app-side and in-task keys.** One short block (~10–12 lines) showing both the app-side global key and an in-task per-step key, stepped so attention lands on each:
  - Step 1: app-side — `idempotencyKeys.create([orgId, 'export', day], { scope: 'global' })`, passed to `.trigger(...)`. Prose: one export per org per day, no matter how many times the action fires (double-click, retried POST).
  - Step 2: in-task — building a per-step key with `scope: 'run'` (default) so a parent retry reuses it. Highlight the key construction and the `triggerAndWait` call.
  - Step 3: the `idempotencyKeyTTL` argument and what "within the TTL" means for late duplicates.
Keep each step ≤6 lines of prose (component constraint).

**The cross-step loop pattern — the fix for the previous section's trap.** This is the concrete shape that closes the chapter's idempotency thread. A task that fans work over N users, called inside a run that may retry, guards each child with its own key so a parent retry returns prior results instead of re-sending. Show with `Code`:
```ts
for (const member of members) {
  const key = await idempotencyKeys.create([member.id, 'notify'], { scope: 'run' });
  await sendOne.triggerAndWait({ memberId: member.id }, { idempotencyKey: key });
}
```
Explain: `scope: 'run'` ties the key to the parent run, so on a retry of the outer task the same N keys are regenerated; the runtime sees they already completed and returns the cached results — users 1–199 are *not* re-emailed. Explicitly call back to the `PredictOutput` trap: this is the line that would have prevented the duplicates. State the convention (Code conventions §Background work, re-anchored): **idempotency keys are required on every `trigger` / `triggerAndWait` / `wait.forToken`** — non-optional, the same way the Server Action input schema is non-optional.

**Exercise — `Sequence` or `MultipleChoice` (key choice).** A short `MultipleChoice` is the better fit here: "Which key + scope correctly dedupes per-recipient sends across a parent retry?" with distractors — a `scope: 'global'` key (wrong: collides across all runs / wrong namespace), a key missing the member id (wrong: all recipients share one key, only the first sends), and the correct `scope: 'run'` per-member key. Goal: verify the student can *pick* the right scope+composition, the exact decision they'll make in real code.

`Term` candidates: **idempotency key** (re-anchor from L3/Ch.063 phrasing), **`idempotencyKeyTTL`** (how long the same key keeps returning the original run; default 30 days), **`scope`** (whether a key is unique per-run, per-attempt, or globally).

### Durable pauses: wait.for and wait.until

The primitive that *creates* the step boundaries everything above depends on, plus the two gotchas that bite hardest.

**`wait.for` — relative pause.** `await wait.for({ seconds: 2 })` / `{ minutes: 5 }`. Semantics: checkpoints, **frees the worker** (no compute billed while waiting), resumes after the duration on a (possibly new) worker. Because it checkpoints, it survives crashes and redeploys. Use cases: a polling interval between export pages, backing off until a rate-limit window reopens. 

**`setTimeout` vs `wait.for` — the gotcha.** Contrast directly with **`CodeVariants`** (label "`setTimeout` — wrong" vs "`wait.for` — durable"), ~4 lines each. The `setTimeout` version holds the worker doing nothing (you pay for the wait) **and** evaporates on crash (the timer dies with the process, the run never resumes). `wait.for` frees the worker and is crash-safe. First sentence of each variant states the verdict. This is the single most common wait mistake and deserves the A/B treatment.

**`wait.until` — absolute pause.** `await wait.until({ date })`. Same checkpoint/free/resume semantics, but waits *to a wall-clock time*. Use cases: "send the welcome email 24h after signup," "act at the trial's period end." 

**`wait.until(pastDate)` gotcha.** If the date is already in the past, the wait resolves **immediately** — it does not error or skip. Name it explicitly so the student doesn't assume a guard; if "do nothing when the date has passed" is the intent, they must check it themselves.

**Mandatory timeout reflex (forward-link).** State the convention now even though `timeout` is drilled with `wait.forToken` in L6: every wait that depends on an *external* signal carries a `timeout` — an indefinite wait is a resource leak. `wait.for` / `wait.until` are bounded by their own duration so they're self-terminating; the timeout rule bites in L6. One sentence, forward-pointer to L6.

`Term` candidates: **`wait.for`** (durable relative pause; frees the worker, resumes after a duration), **`wait.until`** (durable pause to an absolute `Date`).

### A paginated export that survives a crash

Synthesis section — assemble checkpoints + retries + per-step keys + `wait.for` into one realistic task that is the direct precursor to Ch.067's build. This is where the student sees the whole lesson cohere.

**The task.** A `schemaTask` (re-anchor L4) that exports an org's invoices in pages of 500. Present with **`AnnotatedCode`** (~14–18 lines, capped at `maxLines={18}`), stepping through the durability-relevant lines:
  - The page loop calling a `pageStep.triggerAndWait({ organizationId, page }, { idempotencyKey })` per page, with a `scope: 'run'` key built from the page number so a retry of the export reuses completed pages.
  - A `wait.for({ seconds: 2 })` between pages (checkpoint boundary + gentle pacing on the DB / downstream).
  - `metadata.set(...)` updating progress after each page (re-anchor L4's one-line mention; one line of prose — live progress visible in the dashboard).
  - A final step (send the "your export is ready" email) — note it too needs a key so a late retry of the whole task doesn't re-send.
  - Payload carries `organizationId`; inside, `tenantDb(organizationId)` (re-anchor L3/L4 "org context is cargo, not ambient" — one line, do not re-teach).

**Then narrate the crash.** Immediately after the code, a short prose walkthrough (or reuse the section-1 `DiagramSequence` mental model in words): worker dies at page 7 of 20. New worker resumes from the last checkpoint; pages 1–6 return cached via their idempotency keys (no re-export, no duplicate email), page 7 re-executes, the run finishes. Tie every claim back to a named mechanism from the lesson — checkpoint (durability section), run-level retry (retries section), per-step key (idempotency section), `wait.for` (waits section). This recap *is* the lesson's summary; make it explicit that this exact shape is what Ch.067 ships.

No exercise here — the section is the integrative example; the assessment is Ch.067 itself (project chapter, no quiz per the chapter being a teaching chapter with its own quiz at L8). Keep the prose tight.

### Cancellation, briefly

Short coda — named, not drilled (chapter outline defers the cancellation *UI* and surfacing run state to Ch.070). Two paragraphs max.

- A run can be canceled from the dashboard or programmatically via `runs.cancel(runId)` (one line).
- Inside the body, the run exposes an **`AbortSignal`** that fires on cancel; propagate it to `fetch`/SDK calls so in-flight HTTP actually stops. Cancellation is **cooperative** — the runtime stops scheduling new steps, but a step already running only halts if you wired the signal through. 
- **Downstream-agent note:** the exact accessor (`ctx.signal` vs `ctx.run.abortSignal`) shifted across v4 releases and my sources didn't pin it definitively — the build agent must confirm the current field name against the live Trigger.dev v4 docs before writing the code line, and prefer prose over a copy-paste snippet if unsure.

One-line takeaway: cancellation is best-effort unless you forward the signal; check it at step boundaries.

`Term` candidates: **cooperative cancellation** (the runtime stops new steps; an in-flight step stops only if it honors the abort signal).

### External resources (optional)

One or two `ExternalResource` cards to the official Trigger.dev v4 docs: the **Idempotency** page and the **Retrying / errors** (or **Wait**) page. Rationale: this API is version-volatile (v4 GA is recent; v3 examples litter the web), so pointing the student at the canonical current docs is high-value. No YouTube video — the topic is too version-specific and changes faster than video content; an outdated v3 walkthrough would mis-teach. Skip video deliberately.

---

## Scope

**This lesson covers:** durable execution (checkpoints, crash-resume), the `retry` config (backoff + jitter), retry-vs-abort (`AbortTaskRunError`), run-level vs call-level retries, the duplicate-side-effect trap, `idempotencyKey` / `idempotencyKeyTTL` / `idempotencyKeys.create` / `scope`, the cross-step loop key pattern, `wait.for` / `wait.until` (durable pauses) and their two gotchas, and a brief cancellation coda.

**Out of scope — do not teach (defer):**
- **Waitpoints** — `wait.forToken`, `publicAccessToken`, `wait.completeToken`, multi-token aggregation, human-in-the-loop approval, third-party callback URLs, mandatory `timeout` *drilling*. All of L6. This lesson only forward-points the timeout reflex; it does not introduce token-based waits.
- **Task definition / queues / schedules** — `task` vs `schemaTask` shape, `trigger.config.ts`, the `trigger/` folder, queue declarations, `concurrencyKey`, static/dynamic schedules. All taught in L4 — *re-anchor by name only*, never re-derive. (When referencing per-tenant concurrency, use **`concurrencyKey`**, not dynamic queue names — L4's marquee v3→v4 correction; the Code conventions doc's `queue({ name: \`org:${orgId}\` })` phrasing is stale on this point.)
- **The escalation decision** (five conditions / `StateMachineWalker`) — L3. Assume settled.
- **Webhook signature verification and the DB dedup-claim-row pattern** — Ch.063. *Re-anchor the discipline* ("a stable key makes work happen once") in one sentence as the conceptual parent of `idempotencyKey`; do not re-teach the claim-row or `processed_events` mechanics.
- **DB transaction semantics inside tasks / pool contention / PgBouncer** — Ch.039. The export example uses `tenantDb(organizationId)` as established plumbing (one line); the "no external calls inside `db.transaction`, split into steps" rule may be stated in one line if the export example needs it, but transaction internals are not re-taught.
- **Cancellation UI and surfacing run/progress state in-app** — Ch.070. This lesson names `runs.cancel` and the abort signal mechanically; it builds no UI.
- **The CSV export's full production code, the starter clone, env surface, deploy ordering** — Ch.067 / L7. The export example here is an illustrative excerpt of the *durability mechanics*, explicitly flagged as "Ch.067 builds the full task."
- **`metadata.set` as a topic** — L6 / Ch.067 drill the live-progress channel; here it's one line inside the export example.

**Prerequisites to redefine concisely (one line each, do not expand):** `schemaTask` and the `id`-as-durable-identity idea (L4); `ctx` fields `ctx.run.id` and `ctx.attempt.number` (L4, named there, *used* here); `tasks.trigger` vs `triggerAndWait` (L4); org-context-as-cargo + `tenantDb(orgId)` inside a task (L3/L4); "durable run / checkpoint / fan-out / idempotency key / exponential backoff with jitter" `Term`s (introduced L3, *operationalized* here).

---

## Notes for downstream agents (deltas from chapter outline + must-not-drift)

1. **Idempotency API is fact-checked (June 2026):** `idempotencyKeyTTL` is a **duration string** not ms; default TTL **30 days**; keys via **`idempotencyKeys.create(key | key[], { scope })`** with `scope: 'run' | 'attempt' | 'global'`. **Teach `scope` as the primary mechanism** — it is cleaner than the chapter outline's manual `` `${ctx.run.id}:...` `` prefixing, which should appear only as the underlying intuition. `scope: 'run'` is the default and is what aligns per-step keys across a parent retry.
2. **No live sandbox** (server runtime can't boot in ReactCoding/Sandpack). Exercises are conceptual only: `Buckets` (retry/abort), `PredictOutput` (duplicate-send trap), `MultipleChoice` (key+scope choice). Do not propose a coding sandbox.
3. **Cancellation accessor unconfirmed:** verify `ctx.signal` vs `ctx.run.abortSignal` against live v4 docs before writing the line; prefer prose if unsure. Keep cancellation a 2-paragraph coda.
4. **`concurrencyKey`, not dynamic queue names**, on the rare per-tenant reference (L4 correction; conventions doc stale here).
5. **Diagram priority:** the crash-and-resume `DiagramSequence` in section 1 is load-bearing — invest there. Other sections lean on `CodeVariants` A/B contrasts (`AbortTaskRunError`, `setTimeout` vs `wait.for`) which carry their pedagogy in the first prose sentence.
6. **Lead every section with the failure it prevents**; the API is small, the reasoning is the lesson.
