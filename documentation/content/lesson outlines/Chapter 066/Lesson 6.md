# Lesson 6 outline — Waitpoints for callbacks and approvals

## Lesson title

- **Title:** Waitpoints for callbacks and approvals
- **Sidebar label:** Waitpoints

## Lesson framing

This is the "pause and resume" lesson — the v4 primitive a student reaches for the moment a real workflow has a human decision or a third-party callback in it. It is the last teaching lesson before the wiring lesson (L7) and the project (Ch.067), so it closes the durable-execution arc: L4 defined and triggered tasks, L5 made them survive crashes with retries/waits/idempotency, L6 makes them *block on the outside world* without burning compute.

**The one mental model to land:** a waitpoint is a durable, resumable token. The run hits `await wait.forToken(...)`, the runtime checkpoints, the worker is freed, and the run parks on the token consuming nothing. Some *external* event completes the token — an HTTP POST from a third party, a `wait.completeToken` call from a Server Action, or a timeout — and the parked run resumes with the completion payload. This is the structural replacement for "poll a status endpoint in a loop until it's done": no polling, no held worker, no missed completion, no glue webhook handler.

**The senior frame** (decisions over syntax, per the pedagogical guidelines): the lesson is built around three concrete workflow shapes a 2026 SaaS actually has — (1) hand work to a third party and wait for its callback, (2) block on a human approval, (3) fan out N sub-jobs and wait for all of them. For each, the senior question is *where does the run live while it waits, and how does it resume without polling.* The answer is the same primitive seen from three angles. Contrast against `wait.for` (L5, time-based, no external signal) and `triggerAndWait` (L4/L5, child task, runtime owns the waitpoint) is the discriminator that tells the student which tool to grab — `wait.forToken` is specifically "an external system or human will signal; *you* manage the token."

**This lesson assumes a solid L4/L5 foundation and must not re-teach it:** task definition, `schemaTask`, `tasks.trigger`/`triggerAndWait`, `ctx`, durable checkpoints, retries, `wait.for`/`wait.until`, `idempotencyKeys.create`, and the org-context-as-cargo rule are all established. L6 adds exactly one new capability — the externally-completed waitpoint token — plus its two unmissable disciplines: a **mandatory timeout** on every token, and **keeping token completion out of any DB transaction that may roll back.**

**Server-runtime constraint (chapter-wide, confirmed in L1–L5 continuity notes):** Trigger.dev code cannot run in the `ReactCoding` iframe (server runtime, no third-party npm). Every code sample is a static `Code` / `AnnotatedCode` / `CodeVariants` block. Understanding is checked with non-coding exercises (`Sequence`, `MultipleChoice`, `Buckets`), not a live sandbox.

**API accuracy is the highest risk in this lesson.** The chapter outline predates v4 GA and contains several now-wrong shapes; the fact-check (June 2026, official docs) corrected them and downstream agents MUST follow the corrected shapes below, not the chapter-outline phrasings:
- Token creation returns `{ id, url, publicAccessToken, isCached }`. The `id` starts with `waitpoint_`. The **`url`** is the server-to-server completion webhook (no CORS) — this is what a third party POSTs to. The **`publicAccessToken`** is a Bearer token for browser/CORS completion, *not* a value you splice into a URL path.
- The completion HTTP endpoint is `POST https://api.trigger.dev/api/v1/waitpoints/tokens/{tokenId}/complete` with body `{ "data": { … } }`. (The chapter outline's `…/v1/tokens/${publicAccessToken}/complete` is wrong.)
- `wait.forToken<T>(tokenId)` returns a **result object** `{ ok, output, error }` with an `.unwrap()` helper. On timeout `ok` is `false` and `error` is a timeout error. (The chapter outline's `{ ok: false, timedOut: true }` is wrong — there is no `timedOut` field.)
- `wait.completeToken<T>(tokenId, output)` completes programmatically; the payload is passed directly (the HTTP form wraps it in `{ data }`).
- `createToken` `timeout` **defaults to `'10m'`** — far too short for human/third-party waits, so every real waitpoint sets it explicitly. `idempotencyKeyTTL` on a token defaults to **`'1h'`** (note: differs from the 30-day default for `tasks.trigger` idempotency keys taught in L5 — call this difference out).
- **There is no `wait.forWaitpoint([...], { all })` multi-token API.** It does not exist in v4. Aggregating "wait for all of N" uses `batchTriggerAndWait` (the conventions-sanctioned parallel-children-one-wait shape), not a fictional multi-token wait. The two-direction topology (many runs on one token / one run on many tokens) is taught **conceptually** as how waitpoints generalize, but only the documented APIs get code.
- Live progress is `metadata.set(...)` (established L4/L5, per conventions), **not** a mutable `ctx.run.metadata` object (chapter-outline phrasing — wrong).

---

## Lesson sections

### Introduction (no header)

Warm, brief, 2–3 short paragraphs. Open on the concrete gap L5 leaves: L5's `wait.for`/`wait.until` handle a *known* delay ("wait 2 seconds, wait until period end"), but real workflows wait on something whose timing you don't control — a partner's render farm finishing, an admin clicking "Approve", a batch of sub-jobs all reporting back. You don't know *when*; you only know *what* will signal you.

State the naive shape the student would otherwise write — trigger the third party, then loop `wait.for({ seconds: 10 })` and re-check a status endpoint until it flips — and name its three costs: wasted run-minutes polling, a race window between polls, and a status endpoint the partner may not even expose. Then preview the fix in one sentence: the waitpoint token, a durable pause the *outside world* completes. Preview the end state: by the lesson's end the student can pause a run on a third-party callback, on a human approval, and on a batch of sub-jobs, each with a mandatory timeout, no polling.

Connect to prior knowledge explicitly: this is the fifth trigger condition from L3 ("event-driven / human-in-the-loop pauses") finally getting its mechanism, and it reuses L5's checkpoint model — a token wait is just another checkpoint boundary where the worker is freed.

**Tooltips here:** `Term` on **waitpoint** (definition: "a durable, resumable pause token; the run parks and the worker is freed until an external signal — HTTP callback, SDK call, or timeout — completes it"). `Term` on **human-in-the-loop** (definition: "a workflow that pauses for a person to make a decision before continuing").

### A token a run can park on

Goal: install the core mental model and the lifecycle before any of the three workflow shapes. Keep it conceptual + one minimal code shape; the three shapes that follow are the application.

Teach the lifecycle as four beats: **create** a token (`wait.createToken`), **hand it out** (give a completer a way to complete it), **park** the run (`await wait.forToken`), **resume** when completed/timed-out. Emphasize the checkpoint reuse from L5: parking is a checkpoint, the worker is released, the run survives crashes/redeploys while parked, and it resumes on any worker when the token completes.

Minimal code shape with `AnnotatedCode` (lang `ts`, blue default), the smallest possible create-then-wait so the two calls and the result are isolated before real-world noise:

```ts
const token = await wait.createToken({ timeout: '1h' });
// … hand token.url or token.publicAccessToken to whoever completes it …
const result = await wait.forToken<{ approved: boolean }>(token.id);
if (!result.ok) {
  // timed out — no one completed the token in time
  throw new AbortTaskRunError('approval timed out');
}
const { approved } = result.output;
```

Annotated steps: (1) `wait.createToken` returns the token handle; mention the returned fields exist (`id`, `url`, `publicAccessToken`, `isCached`) but defer *which* completer uses *which* to the next two sections. (2) the `timeout` is **mandatory in practice** — flag that it defaults to `'10m'` and that 10 minutes is almost never what you want, so you always set it. (3) `wait.forToken<T>(token.id)` parks the run; the generic `<T>` types the eventual `output`. (4) the result is `{ ok, output, error }` — `ok: false` means it timed out, and that is the *only* failure, so the resume path always has exactly two branches: completed-in-time vs timed-out. Mention `.unwrap()` as the terse alternative (`const { approved } = (await wait.forToken<…>(token.id)).unwrap();`) that throws a timeout error instead of branching — useful when "timed out" should just fail the run.

**The discriminator table** — the single highest-value artifact in the lesson because choosing the wrong wait primitive is the most common real mistake. Render as a 3-row `Code`-free comparison (a small markdown table is fine, or a `Buckets`-style framing in prose). Columns: *primitive · who completes it · use when*.
- `wait.for` / `wait.until` — **the clock** completes it — you know the delay/deadline up front (L5).
- `triggerAndWait` / `batchTriggerAndWait` — **a child task** completes it — the runtime owns the waitpoint, you get the child's typed result (L4/L5).
- `wait.forToken` — **an external system or a human** completes it — *you* own the token and hand it out (this lesson).

End the section with the two-direction topology as a concept (no code, it generalizes the model): a single token *can* unblock work, and a run can depend on multiple completions. Use one small `Figure` + `ArrowDiagram` (or color-matched HTML boxes) to show "one run → one token → one completer (third party / human / timeout)" as the base case, with a caption noting the generalizations (many runs could listen on one token; one run could wait on several tokens) and that the second of those — wait-for-all-of-N — is built in v4 with `batchTriggerAndWait`, covered later in this lesson. **Do not** draw or describe a `wait.forWaitpoint([...])` API; it does not exist.

**Tooltips:** `Term` on **checkpoint** (re-anchor from L5: "a saved snapshot of run progress; on a worker crash the run resumes from here on a new worker") — re-explain without breaking flow since it's load-bearing here.

### Handing work to a third party and waiting for the callback

Goal: the cleanest waitpoint application — the "we call out, they call back" shape — and why it's structurally better than an inbound webhook handler.

Motivate with the senior question: a task kicks off a long third-party job (video transcode, document render, partner data import). That job takes minutes-to-hours and reports completion by calling a URL you give it. Where does your run live in the meantime? Naively you'd expose an inbound webhook route, persist a correlation row tying the partner's job id to your run, dedup the callback, and resume the run somehow. The waitpoint collapses all of that: `token.url` *is* the callback URL, and completing it *is* the resume.

Teach the integration shape with `AnnotatedCode` (lang `ts`), a ~15-line `schemaTask` body:

```ts
export const renderVideo = schemaTask({
  id: 'render-video',
  schema: z.object({ organizationId: z.uuid(), sourceUrl: z.url() }),
  run: async ({ organizationId, sourceUrl }) => {
    const token = await wait.createToken({ timeout: '6h' });

    await fetch('https://api.partner.example/render', {
      method: 'POST',
      body: JSON.stringify({ source: sourceUrl, callbackUrl: token.url }),
    });

    const result = await wait.forToken<{ renderUrl: string }>(token.id);
    if (!result.ok) throw new AbortTaskRunError('render callback timed out after 6h');

    const db = tenantDb(organizationId);
    await db.insert(renders).values({ url: result.output.renderUrl });
  },
});
```

Annotated steps emphasizing the decisions:
1. `createToken({ timeout: '6h' })` — the timeout is sized to the partner's worst-case SLA, not guessed; name the rule "size the timeout to the slowest acceptable completion."
2. POST to the partner with **`callbackUrl: token.url`** — drill that `token.url` is the *server-to-server* webhook (no CORS), which is exactly the right surface for a backend partner. Explicitly warn: do **not** pass `token.id` or `token.publicAccessToken` here — `id` isn't a completion URL, and `publicAccessToken` is for browsers.
3. `wait.forToken<{ renderUrl }>(token.id)` parks the run; worker is freed for the (possibly hours-long) wait — contrast one line against the polling alternative ("a `wait.for` poll loop would wake the worker every N seconds for nothing").
4. the `!result.ok` branch is the timeout path — a silent partner must not park the run forever; `AbortTaskRunError` fails it cleanly (ties back to L5's abort-on-permanent rule) and lets `onFailure`/alerting fire.
5. tenancy re-derived from the payload (`tenantDb(organizationId)`) inside the body — re-anchor the org-as-cargo rule from L3/L4 in one clause, don't re-teach it.

**The "no glue webhook handler" payoff** — a short prose beat (this is the senior insight worth pausing on): contrast with Ch.063's webhook ingestion. A normal inbound webhook needs a public route, signature verification, a `processed_events` dedup row, and a transactional handler. The waitpoint callback needs *none of that on your side* — the runtime owns the URL, the auth, the dedup (a token completes once; a duplicate POST is a no-op), and the resume. Frame it as: "you didn't build a webhook receiver; you handed the partner a one-shot resume button." One `Aside` (note) can carry the cross-reference to Ch.063 so it doesn't bloat the prose.

**Observability beat** (short): a parked run shows "Waiting" in the dashboard with the token id and a live timeout countdown. When a third-party integration goes silent, that's the first place to look — you can see at a glance whether *you* failed to call them or *they* failed to call back. This is the free-observability thread from L3/L4 paying off again.

**Tooltips:** `Term` on **callback URL** (definition: "a URL you give a third party so it can notify you when an async job finishes, instead of you polling"). `Term` on **CORS** (definition: "browser rule that blocks cross-origin requests unless the server opts in; `token.url` has no CORS headers, so only servers can call it").

### Pausing for a human approval

Goal: the human-in-the-loop shape — the most *product-shaped* use of waitpoints — and the one new hard rule (don't complete a token inside a transaction that can roll back).

Senior question: a refund above a threshold, a destructive admin action, a plan change — some operations must wait for a person to approve before they continue. The work can't run synchronously (the approver might take hours), and it can't be fire-and-forget (the decision must actually gate the action). The waitpoint is the join: the task parks on a token, a human's click completes it, the task resumes and applies the decision.

Teach the two halves with `CodeVariants` (two tabs — *Task side* and *Server Action side* — because the power of the pattern is seeing the two ends of the same token, and they're two different files):

- **Tab "Task side"** — a `schemaTask` (e.g. `processRefund`) that: creates a token with a `'48h'` timeout, writes a `pending_approvals` row carrying `token.id` (so the admin UI can find which token a given approval maps to), sends the approver a notification (Slack/email — one line, `await notify(...)`), then `await wait.forToken<{ decision: 'approve' | 'reject' }>(token.id)`. Branch on `result.ok` (timeout → auto-reject or escalate) and on `result.output.decision`. Prose: "the run is alive but consuming nothing — no worker held, no polling, for up to 48 hours."
- **Tab "Server Action side"** — the `approveRefund(approvalId, decision)` Server Action (re-anchor the Ch.043 Result-shape action in one clause, don't re-teach it): `requireOrgUser()` for authz, look up the `pending_approvals` row to get the `token.id`, then `await wait.completeToken(tokenId, { decision })`. Prose: "completing the token *is* the resume — the parked task wakes on a new worker and continues from the line after `wait.forToken`."

Drill `wait.completeToken(tokenId, payload)` as the **programmatic** completer (the counterpart to `token.url`): used from anywhere with the SDK and an auth context — a Server Action, a Route Handler, another task. This is the human-in-the-loop completer because the click goes through *your* authenticated Server Action, not directly to Trigger.dev.

**The one new hard rule — completion must not sit inside a rollback-able transaction.** This is the production bug specific to this section and deserves its own short beat with a tiny before/after, because it is non-obvious and silent. If you call `wait.completeToken` *inside* a `db.transaction` and the transaction later rolls back, the token is **already completed** (the resume is out of your DB's control) but your DB never committed — the task resumes acting on state that doesn't exist. The fix: do the DB write and commit first, *then* complete the token as the last step, outside the transaction. Show with `CodeVariants` (two short tabs, `del`/`ins` framing): "Wrong — complete inside tx" vs "Right — commit, then complete." Tie back to the L1 rule "external calls after commit, never inside the transaction" — completing a token is an external side effect and obeys the same rule. (Conventions-aligned: this is the same discipline as "no external IO inside `db.transaction`.")

**Idempotency-on-completion beat** (short, reassuring): tokens complete **once**. A second `wait.completeToken` (double-click, retried Server Action) is a no-op and returns without effect. So the *callback itself* needs no dedup table on your side — the only thing you still guard with an idempotency key is whatever *work* the resume kicks off (re-anchor L5: the resumed task's downstream `tasks.trigger`/sends still carry keys). Distinguish crisply: the token's at-least-once-completion is handled by the runtime; your idempotency discipline applies to the resumed work, exactly as in L5.

**Exercise — `Sequence`** (ordering drill, strong fit for a multi-actor flow). Title: "Order the refund-approval flow." Steps to order (scrambled), with a fixed `Code` block of the two function signatures shown above the steps for reference:
1. Task creates the waitpoint token with a 48h timeout.
2. Task writes the `pending_approvals` row with the token id.
3. Task notifies the approver and parks on `wait.forToken`.
4. Admin clicks "Approve" in the dashboard.
5. The Server Action looks up the token id and calls `wait.completeToken`.
6. The task resumes and applies the decision after committing.
Grading: exact order. Goal: cement the create→park→complete→resume causality across the two files and the human in the middle.

**Tooltips:** `Term` on **programmatic completion** (definition: "completing a waitpoint token from your own code via the SDK — e.g. a Server Action — rather than a third party hitting the callback URL").

### Waiting for many sub-jobs to finish

Goal: the fan-in shape — "spawn N, resume when all N are done" — and the explicit correction that v4 does this with `batchTriggerAndWait`, **not** a multi-token wait API.

Senior question: a task fans out work (export each of 12 report sections, process each of N uploaded files) and must run a final step only after *all* children finish. This is the "one run waits on many completions" direction of the topology teased earlier.

Lead with the **API-honesty beat** (this is a correction the student would otherwise get wrong from stale AI completions and the chapter's own older framing): there is no `wait.forWaitpoint([t1, t2, t3], { all })` in v4. The right tool is `batchTriggerAndWait` — established in L4/conventions as "parallel children with one wait." The runtime creates and manages the waitpoints for every child internally; you get back a typed array of results when all have settled.

Teach with `AnnotatedCode` (lang `ts`), a compact parent body:

```ts
const results = await sectionTask.batchTriggerAndWait(
  sections.map((s) => ({
    payload: { organizationId, sectionId: s.id },
    options: { idempotencyKey: `${ctx.run.id}:section:${s.id}` },
  })),
);
const failures = results.runs.filter((r) => !r.ok);
metadata.set('failedSections', failures.length);
```

Annotated steps: (1) `batchTriggerAndWait` parks the parent on *all* children at once — one checkpoint, worker freed, resumes when the last child settles. (2) each child carries a **per-child idempotency key** `${ctx.run.id}:section:${s.id}` — re-anchor L5's cross-step key pattern in one clause: a parent retry re-issues the same keys, so already-completed children return cached instead of re-running. (3) the result is per-child `{ ok, output }` (and `error` when `!ok`) — you inspect failures explicitly rather than assuming all succeeded (the batch resolving does **not** mean every child succeeded). (4) `metadata.set(...)` writes live progress the dashboard/in-app inspector renders — re-anchor from L4/L5, name it as the "47 of 200" channel, one line, deferred drilling to Ch.067.

Author caution (do not surface as a lesson topic, but keep the sample honest): there is a known open v4 bug (triggerdotdev/trigger.dev#2015, still open as of June 2026) where a child run returned from cache via an idempotency key can report `ok: true` regardless of its original outcome. Don't write prose claiming cached children faithfully replay their original `ok`. The sample's failure-inspection line stays correct for the fresh-run case; keep the framing to "inspect `ok` per child," not "cached children always reflect their true result."

**When a raw token still wins over `batchTriggerAndWait`** (short discriminator beat so the student knows the boundary): use `batchTriggerAndWait` when the parallel work is *your own tasks*. Reach for raw `wait.createToken` when each unit of work is completed by an *external* system or human (e.g., N partner jobs each calling back, or N approvers) — then you create N tokens, hand each out, and `await Promise.all(tokens.map((t) => wait.forToken(t.id)))`. Present this `Promise.all`-of-`forToken` as the documented composition for "one run, many external completions" (it's just parking on several checkpoints), and contrast it crisply with the non-existent `wait.forWaitpoint`. Keep this to a few sentences + maybe a 3-line snippet; the batch path is the common one.

**Exercise — `MultipleChoice`** (single question, can be multi-select if two answers qualify). Stem: "A task must run 200 image-resize sub-jobs (your own task) and continue only after all finish. Which is correct in Trigger.dev v4?" Options: (a) `wait.forWaitpoint(tokenIds, { all: true })` — *wrong, no such API*; (b) `batchTriggerAndWait` over the 200 payloads, each with a per-child idempotency key — *correct*; (c) a `wait.for` poll loop checking a counter row — *wrong, polling, the thing waitpoints replace*; (d) 200 separate `wait.createToken` + `Promise.all(forToken)` — *technically works but is the external-completion tool, overkill for your own tasks*. Feedback explains why (b) is idiomatic and (d) is the right tool for the *wrong* problem. Goal: lock in the `batchTriggerAndWait`-for-own-tasks vs token-for-external discrimination and inoculate against the fictional API.

### Where waitpoints bite — timeouts, leaks, and rollbacks

Goal: a content section, not a watch-out dump — these are the failure modes that produce real production incidents, each tied to its cause and fix. Frame each as "symptom → cause → fix," kept tight.

- **The forever-parked run (missing/oversized timeout).** Cause: no `timeout`, or a `timeout` longer than the work could ever legitimately take. Symptom: runs accumulate in "Waiting," concurrency seats and run-minutes leak. Fix: every token has a timeout sized to the slowest *acceptable* completion; the `!result.ok` branch is mandatory, never a TODO. Restate the conventions rule verbatim: "an indefinite wait is a leak."
- **The wrong handle to the third party.** Cause: passing `token.id` (not a URL) or `token.publicAccessToken` (a browser Bearer token) where the partner expects a server callback URL. Symptom: the partner can't complete the token; the run times out for no obvious reason. Fix: server partner → `token.url`; browser/client → `publicAccessToken` as a Bearer on the CORS endpoint. A 2-row mapping (`completer → handle`) makes this stick.
- **Completion inside a rollback-able transaction.** Re-state from the approval section as the canonical instance of "external side effect after commit." Symptom: task resumes on state the DB rolled back. Fix: commit first, complete last.
- **Reaching for a token when the clock or a child task was the answer.** Cause: `wait.forToken` for a *known* delay (use `wait.for`) or for *your own* child task's result (use `triggerAndWait`/`batchTriggerAndWait`). Symptom: you hand-roll a completer for something the runtime would have completed for you. Fix: the discriminator table from §1.
- **Assuming a token is many-shot or that a batch resolving means success.** Cause: expecting to complete one token repeatedly, or trusting `batchTriggerAndWait` resolution to imply every child succeeded. Fix: a token is one-shot (second completion is a no-op); inspect per-child `ok` after a batch.

**Closing synthesis** (2–3 sentences, no header): restate the mental model one last time — a waitpoint is a durable token the *outside world* completes, sized with a mandatory timeout, completed exactly once, and never inside a transaction that can roll back. Forward-point to L7 (which of the app's workloads actually use this) and Ch.067 (the export build uses `metadata.set` for live progress; the human-approval and callback shapes are the patterns a real product layers on next). Do **not** introduce the export task's code here — that's Ch.067.

**Exercise (optional, end-of-section) — `MultipleChoice` or `TrueFalse` round** on the failure modes (e.g., "T/F: completing a token twice resumes the run twice" → false; "T/F: a token with no explicit timeout waits forever" → false, it defaults to 10m, which is its own bug). Only include if it doesn't bloat the lesson past ~55 min; the `Sequence` and the fan-in `MultipleChoice` already carry the assessment load.

### External resources (optional, end of lesson)

One or two `ExternalResource` cards: the official **Trigger.dev "Wait for token"** docs page (canonical API surface, since this is the most version-volatile lesson) and the **"Human-in-the-loop / wait for HTTP callback"** guide/changelog. Keep to docs the student can trust as a live reference; no random tutorials.

---

## Scope

**This lesson teaches:** externally-completed waitpoint tokens — `wait.createToken`, `wait.forToken<T>` and its `{ ok, output, error }` result, `wait.completeToken` for programmatic/human completion, `token.url` vs `publicAccessToken` for the two completion paths, mandatory timeouts and the timeout branch, the one-shot/idempotent nature of completion, the "commit-then-complete" transaction rule, and the three workflow shapes (third-party callback, human approval, fan-in via `batchTriggerAndWait`). It re-anchors (one clause each, no re-teaching) the L5 checkpoint/idempotency-key model, the L4 trigger/`metadata.set` surface, the L3/L4 org-as-cargo rule, and the L1 external-call-after-commit rule.

**Out of scope — deliberately not covered (prerequisites assumed solid; do not re-teach):**
- Task definition, `schemaTask`, queues, `concurrencyKey`, schedules — **L4**.
- Retry config, `AbortTaskRunError` semantics, `wait.for`/`wait.until`, `idempotencyKeys.create`/`scope`/TTL mechanics, the duplicate-side-effect trap — **L5**. (L6 *uses* `AbortTaskRunError` and idempotency keys but does not re-derive them.)
- The five trigger conditions and the escalation decision tree — **L3** (only the fifth condition is referenced as this lesson's motivation).
- `after()`, Vercel Cron — **L1/L2**.

**Out of scope — reserved for later (forward-point, do not pre-teach):**
- *Which* of the app's real workloads use waitpoints, the env/deploy surface — **L7**.
- The CSV export task's actual code and the `metadata.set` live-progress build — **Ch.067** (referenced as the next step only).
- The admin UI that renders pending approvals and surfaces run state in-app — **Ch.070 / Unit 14**; this lesson shows the *Server Action* that completes a token, not the React UI around it.
- Partner-side handshake specifics (auth, payload schema of a real partner) — partner-specific, out of scope; the partner is a stub.
- Self-hosting Trigger.dev — named once in earlier lessons as an off-ramp; not covered.

**Explicitly corrected away from the chapter outline (downstream agents: follow these, not the outline):**
- No `wait.forWaitpoint([...], { all })` — fictional in v4; fan-in is `batchTriggerAndWait`, many-external-completions is `Promise.all` over `wait.forToken`.
- Completion URL is `…/api/v1/waitpoints/tokens/{tokenId}/complete` with `{ data }` body; the third party receives `token.url`, not a `publicAccessToken`-in-path URL.
- Result is `{ ok, output, error }` + `.unwrap()`; there is no `timedOut` boolean.
- Live progress is `metadata.set(...)`, not a mutable `ctx.run.metadata` object.
- Token `timeout` default is `'10m'` and `idempotencyKeyTTL` default is `'1h'` (distinct from the 30-day trigger-key default).

---

## Code-handling notes for downstream agents

- **Component choices:** base lifecycle and each worked task body → `AnnotatedCode` (one block, stepped focus, blue marks default, `maxLines` ≤ 18). The two-ended approval flow (task side + action side) and the two before/after rollback panels → `CodeVariants`. Simple one-shot snippets (the `Promise.all` composition, signatures shown above an exercise) → plain `Code`. The discriminator (wait primitives) → a small markdown table or prose, not a component.
- **Diagrams:** one `Figure` + `ArrowDiagram` (or color-matched HTML boxes — prefer color-match if any arrow would cross code/prose, per the ArrowDiagram doc) for the base create→park→complete→resume topology in §1. Optionally a `DiagramSequence` (4 steps: create / hand out / park / resume) if the static diagram feels too dense — but a single static figure plus the annotated code is likely enough; do not over-build. No Mermaid sequence needed unless the approval two-actor flow reads better as one (`sequenceDiagram`: Task → Trigger.dev → Admin → Server Action → Trigger.dev → Task); if used, wrap in `<Figure>` and keep actors ≤ 5.
- **Exercises:** `Sequence` (refund-approval ordering) in the human-approval section; `MultipleChoice` (fan-in / inoculate against `wait.forWaitpoint`) in the fan-in section; optional `TrueFalse`/`MultipleChoice` round on failure modes in the final section. No live-coding sandbox (server runtime — confirmed constraint).
- **Tooltips (`Term`) inventory:** waitpoint, human-in-the-loop (intro); checkpoint (§1, re-anchor); callback URL, CORS (third-party section); programmatic completion (approval section). Keep definitions plain-text, one line, no markup.
- **Code conventions alignment:** follow `Code conventions §Background work` — `schemaTask` with payload schema, idempotency keys required on triggers/waits, mandatory `timeout` on every wait, `wait.completeToken`/`token.url` for the two completion paths, `tenantDb(orgId)` from the payload, external completion after commit. **Deliberate divergence to flag:** per the L4 continuity note, the per-tenant pattern is `concurrencyKey` (not dynamic queue names); L6 doesn't introduce queues, so this only matters if a sample shows a trigger — keep any such sample queue-agnostic.
- **Estimated student time:** 45–55 minutes (chapter-outline estimate; holds — one new primitive plus three applications and the failure modes).
