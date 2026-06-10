# Lesson 1 outline — Inline, then after()

## Titles

- Title: `Inline, then after()`
- Sidebar label: `Inline, then after()`

## Lesson framing

This is the chapter's **opening, anti-over-engineering lesson**. It introduces the latency/durability *ladder* the whole chapter climbs, but only the bottom two rungs: tier 0 (inline `await` inside the Server Action) and tier 0.5 (`after()`, Next.js's same-invocation post-response primitive). Everything above (Cron, Trigger.dev) is named once as "later rungs" and deferred. The pedagogical win condition: the student leaves able to *defend keeping work inline* and able to *recognize the four conditions that break inline*, reaching for `after()` only in its narrow band — and crucially knowing that `after()` is NOT a job queue.

Core mental model to install (state it, draw it, reinforce it):

> Tier 0 — blocks the response (`await` inline). Tier 0.5 — same invocation, after the response (`after()`). Tier 1+ — outside the invocation entirely (later lessons). Code stays at the lowest tier that meets the durability, latency, and time-budget requirement.

This lesson is unusually well-anchored in prior work — lean on it hard rather than re-teaching:
- **Ch.043 L5** ("After the write") shipped the exact `createInvoice` action this chapter's invite flow mirrors: the five-seam shape `parse → authorize → mutate → revalidate → return`, the `Result<T>` / `ok` / `err` contract, `db.transaction(async (tx) => …)`, the **"external side effects fire after the transaction commits, never inside it"** rule, and the idempotency hidden-input seam. That lesson *explicitly foreshadowed this one* (its closing note: "if the process dies between the commit and the external call, the effect never fires… the durable answer is a background job… That's a later chapter"). **Open this lesson by collecting that promissory note.** Reuse its vocabulary verbatim; do not re-derive `Result`, transactions, or the commit-ordering rule.
- **Ch.057 L5** shipped `logAudit(tx, { action, … })` — the audit row written *inside the same transaction as the work*. This is the canonical counter-example to deferring with `after()`: the audit row must be atomic with the mutation, so it is the wrong thing to push into `after()`. Use it.
- **Ch.092** ships `pino` structured logging (`logger.child({ seam })`, `requestId` via AsyncLocalStorage). This lesson needs it for the "errors in `after()` must be caught and logged or they vanish" point. The logger is forward (ch.092 > ch.066 in number), so reference it as "your structured logger" / "the logger from the observability chapter" without assuming the API is in hand — name the discipline (catch + log), not the exact `pino` call.

Target student: junior dev, some web exposure, building real SaaS with AI. They over-reach for "background jobs" because tutorials glamorize queues. The senior corrective is the spine of the lesson: the cheapest correct shape wins, and the cheapest shape here is usually a plain `await`. Frame every threshold in production stakes (the user staring at a spinner; the email that silently never sends; the audit row that vanished on a function timeout).

Tone: adult, terse, decision-first (per pedagogical guidelines). No "what is async." The student knows `await`, Server Actions, transactions, Zod. The new surface area is small: `after()`, the `waitUntil` lifecycle, four thresholds, and a fistful of watch-outs. Keep it to 35–45 min.

Single worked example threaded through the lesson: an **`inviteMember` Server Action** (org sends an invitation). It is the perfect vehicle because it has all the pieces — a transactional DB write (`org_invitations` row), an audit log write (atomic, stays inside the txn), an external email send (Resend, ~200ms, belongs inline because the user wants to know it sent), and a *genuinely* deferrable side effect (a fire-and-forget analytics event) that earns `after()`. One example demonstrates every rule and every anti-pattern by contrast. Carry it the whole lesson; do not invent a second domain.

A note on a stale figure that downstream agents MUST get right: the chapter outline says Vercel Fluid Compute caps are "1 min Hobby / 14 min Pro". **That is outdated.** Per Vercel's official duration docs (updated 2026-05-14): Hobby = 300s default / **300s (5 min) max**; Pro = 300s default / **800s (13 min) max**; Enterprise same as Pro. Use **5 min Hobby / 13 min Pro** everywhere in this lesson. Phrase the cap as "minutes, not seconds — but still a hard wall," because the *exact* number is a chapter-098 concern; what matters here is that a wall exists and every second before it is the user's.

Components leaned on: `CodeVariants` (before/after and right/wrong contrasts — the lesson's primary device), `AnnotatedCode` (the full `inviteMember` walk), `StateMachineWalker` `kind="decision"` (the three-tier ladder as a walkable decision — its docs name "trigger before tool decision trees" as the intended use), one small custom `<Figure>` HTML/SVG diagram for the request-timeline (response line + `waitUntil` tail), and `MultipleChoice` / `Buckets` for the "does this belong inline, in `after()`, or neither" check. No live-coding sandbox — `after()` and request lifecycle can't run in the React-only iframe, and a Sandpack of a Server Action would be more setup than signal; the understanding checks carry the practice load.

## Sections

### Introduction (no header)

Collect the ch.043 promissory note. Open on the concrete moment: a user clicks **"Send invitation."** The `inviteMember` action inserts the `org_invitations` row, sends the email, returns. State the senior question plainly (per guidelines, implicitly, not as a labeled section): *which parts of this work belong inside the request-response cycle, which belong after the response, and which should not be on the request path at all?* Name that ch.043 left exactly this question open ("the durable answer is a background job — a later chapter"). Say what this lesson delivers: the bottom two rungs of the ladder (`await` inline, then `after()`) and the precise thresholds that break them — and, just as important, the discipline to *not* climb higher than needed. Preview the `inviteMember` example. Keep warm, ~3 short paragraphs.

### The default is a plain await

Teach tier 0 first and make it the hero, not the strawman. The cheapest correct shape for "DB write + one external call" is to do both inside the action body with sequential `await` and return the `Result` once both complete.

- Show the `inviteMember` action in its inline form. Reuse the ch.043 five-seam spine exactly: parse the FormData with `safeParse`, authorize, `db.transaction` for the `org_invitations` insert **plus** the `logAudit(tx, …)` call (both atomic), commit, then `await sendInvitationEmail(invite)` *after* the commit (the ch.043 external-calls-outside-the-txn rule — restate in one line, do not re-derive), then `revalidatePath` and `return ok(...)`.
- Use `AnnotatedCode` here. Steps to highlight: the transaction boundary (DB row + audit row together), the email send sitting *after* the commit, the single `return ok`. Each step's text ties back to a ch.043 rule by name so the student feels the continuity, not a new lecture.
- The senior argument, stated as the section's thesis: **synchronous-from-the-user's-perspective is the most observable, most debuggable shape there is.** No "queued for sending" half-state to reconcile, no dispatcher to debug, no separate worker to deploy, no second place for the work to fail silently. The error path is the action's own `Result`. Make the student *want* this shape before showing them anything fancier.
- One precise nuance worth a line: the email is `await`ed and *blocks the response* on purpose — because the user genuinely wants to know the invite was sent. That is the correct call here. This sets up the contrast in the next section where some work genuinely does *not* need to block.

`Term` candidates in this section: none new — `idempotent`, `atomically`, `rolls back` were all defined in ch.043/057. Do not redefine.

### Four thresholds that break inline

The conditional half of tier 0. Name the four limits that take work *off* the blocking path — each observable, each tied to production pain. This is the decision content; spend real words here.

1. **Downstream latency bloats the user-visible response.** Resend p99 ~400ms is fine to block on; a 5s third-party API is not — the user sits on a spinner for work they don't need to wait for. The number to anchor: anything the user must *see the result of* can block; anything they don't, shouldn't, once it's slow enough to feel.
2. **The function time limit.** A Vercel function has a hard wall-clock cap — minutes, not seconds (5 min Hobby / 13 min Pro on Fluid Compute; use these corrected figures), and **every second of it is on the user's request.** Work that risks the wall cannot live on the request path. Defer the *exact* numbers and deployment depth to ch.098; here the point is "a wall exists, and it's the user's time."
3. **Work that must continue if the user closes the tab.** Fire-and-forget cannot rely on request scope — once the response ships and the client disconnects, anything tied to the request is at risk. This is the seam `after()` fills (and the seam it *fails* to fill durably — foreshadow).
4. **Work that must survive transient downstream failures with retries.** The action returns exactly once. Retries need somewhere that outlives the request to live. Inline `await` gives you one attempt; a flaky downstream needs more. **This is the threshold inline cannot meet at all — and, spoiler, neither can `after()`.** Plant this flag now; it's the lesson's sharpest point and the bridge to the rest of the chapter.

Presentation: a compact list with a one-line production-failure vignette each — not a table (these are arguments, not data). After the four, a one-sentence synthesis: thresholds 1–3 push work to `after()` (still same invocation, just not blocking); threshold 4 (durability/retries) blows *past* `after()` entirely to the later rungs. This sentence is the hinge of the lesson — make it land.

`Term` candidate: `p99` (dashed-underline tooltip: "99th-percentile latency — 99% of requests finish at least this fast; the slow tail users actually feel"). Non-obvious to a junior, supports the latency argument.

### after() runs your code after the response

Introduce the tool for thresholds 1–3. Lead with the import and the one-sentence contract, then mechanics.

- `import { after } from 'next/server'`. `after(() => { … })` schedules a callback to run **after the response is sent, inside the same serverless invocation.** Stable in Next.js (it graduated from experimental — note it's been stable for several Next majors, so it's a safe default; don't pin a version number the student will see drift). Usable in Server Components, Server Actions, Route Handlers, and `proxy.ts`.
- The senior anchor, stated as a quotable rule: **`after()` is for "the user does not need to see this happen, but it must happen on this same invocation."** Examples that fit: analytics events, structured logs that depend on the rendered response, fire-and-forget cache warming for a page the user is about to hit.
- Show it on `inviteMember`: the analytics event (`trackEvent('invitation_sent', …)`) moves into `after()`, *after* the `return`/`redirect`, so a flaky analytics endpoint can never slow the response or roll back the DB transaction. Use `CodeVariants`: tab A "analytics inline" (blocks the response on a non-essential call), tab B "analytics in `after()`" (response ships immediately, analytics fires on the same invocation after). The contrast *is* the lesson.

#### How after() stays alive — the waitUntil tail

Mechanics, kept simple-then-precise.

- `after()` extends the invocation past the response via the platform's `waitUntil` primitive: the function stays alive up to `maxDuration` even after the bytes have shipped to the client. The user has their response; the box is still running your callback.
- Same behavior self-hosted on Node. On platforms with no `waitUntil` equivalent, it degrades (runs before the response or is a no-op) — name this so the student isn't surprised on an unusual host, one sentence.
- **Diagram (custom `<Figure>`, hand-coded HTML/SVG): the request timeline.** A single horizontal time axis. Left segment: action body runs (DB txn + email), labelled "user is waiting." A vertical marker "response sent" / "user sees success." Then a lighter-shaded tail to the right labelled "`after()` callback — `waitUntil` keeps the box alive" ending at a dashed wall labelled "`maxDuration`." Pedagogical goal: make "same invocation, but past the response, bounded by the same wall" *visual* in one glance — this is the single hardest thing to grasp about `after()` and prose alone won't do it. Horizontal, short, well under the 800px height cap. Wrap in `<Figure>` with a caption restating the one rule.

`Term` candidate: `waitUntil` (tooltip: "platform primitive that keeps a serverless function alive after its response is sent, until the work finishes or the time budget runs out").

### after() is not a job queue

The most important section in the lesson — the chapter outline flags "reaching for `after()` for work that needed Trigger.dev" as *the* common 2026 mistake. Make the boundary unmissable.

- State the four things `after()` is NOT, each as a hard fact tied back to a mechanic: runs **once**; in the **same invocation**; bounded by the **same `maxDuration`**; if the function times out or crashes, **the callback is lost.** No retries, no durability, no cross-process visibility. It is not a queue, a worker, or a scheduler.
- The decision rule, stated crisply: **`after()` is acceptable when losing the work once in a thousand is acceptable.** Analytics event dropped on a rare timeout? Fine. Cache warm that didn't happen? The next request pays a cold read, no harm. **Not** acceptable: the invitation email, a payment side effect, anything a user or auditor will ask about. Those are threshold-4 work and belong on a later rung.
- Reconnect to threshold 4 explicitly: `after()` solves "don't block the response" (thresholds 1–3); it does **nothing** for "survive a crash and retry" (threshold 4). A junior conflates the two because both feel like "background." Separate them in the student's head here, permanently.
- Reinforce with a `Buckets` exercise (two buckets: "OK in `after()`" / "needs a durable job — not `after()`"). Items drawn from the running domain and adjacent SaaS work: analytics event (OK), warm a list's cache before navigation (OK), structured access log (OK), **send the invitation email** (needs durable — user must know), **charge a card** (needs durable), **the audit-log row** (trick item — neither: it belongs *inside the transaction*, not deferred at all), a webhook to a partner that must retry on 5xx (needs durable). The audit-log trick item is the highest-value teaching moment — it forces the student to distinguish "defer it" from "it was never supposed to leave the transaction."

### Reading request data inside after()

The concrete gotcha most likely to produce a runtime error in the student's own code. Keep tight, it's a single rule with a fix.

- Inside **Route Handlers and Server Actions**, `cookies()` and `headers()` work *inside* the `after()` callback — call them freely.
- Inside **Server Components**, they do **not** — calling `cookies()`/`headers()` inside `after()` there throws, because Next.js must know which part of the tree reads request data to support Partial Prerendering, and `after()` runs past React's render lifecycle. (Verified against Next.js `after` docs — this is current behavior.)
- The fix, one line: read the values *before* the `after()` call and close over them. Show with `CodeVariants`: tab "throws in a Server Component" (`cookies()` called inside the callback) vs tab "read outside, close over" (`const ua = (await headers()).get('user-agent'); after(() => log(ua))`).
- Why the student cares: the `inviteMember` action is a Server Action, so it's in the *safe* band — but the moment they reach for `after()` in a layout or page to log something, this bites. Name where each rule applies so they can place their own code.

### Where after() earns its weight

Land the positive use cases so the student has a concrete "reach for it here" list, not just prohibitions. Short, example-driven, ties the rules together.

- Three canonical fits, each one line of why: (1) structured access logging after a checkout — log user-agent and request fields *after* the response, never blocking it; (2) warming a `cacheTag` for a list the user is about to navigate to — fire-and-forget, a miss just costs a cold read; (3) posting a PostHog/analytics event from a Server Action where **the analytics failure must not roll back the DB transaction** — the strongest argument, because it's about *isolation*, not just latency.
- Make the isolation point explicit and senior: putting a non-essential external call inside the action's try-path couples its failure to the mutation's success. `after()` decouples them — the write commits, the user gets their answer, and the soft side effect lives or dies on its own. That decoupling is *why* `after()` exists, beyond mere speed.

#### Errors in after() must be caught, or they vanish

Sub-point of the same idea, because it's where the isolation cuts the other way.

- Errors thrown inside `after()` do **not** propagate to the user — the response already shipped. An unhandled throw there just disappears. **`after()` is not fire-and-forget; it is fire-and-log.**
- The discipline: wrap the callback body in try/catch and log failures through your structured logger (the `requestId`-tagged child logger from the observability chapter — name the discipline, don't assume the API). Otherwise the work silently failed and nobody knows.
- One-line `Code` block showing the shape: `after(async () => { try { await track(evt); } catch (e) { logger.error({ err: e }, 'after: analytics failed'); } });`. Mark it as the canonical shape so the student copies the try/catch, not a bare callback.

### The wrong way to use after()

Consolidate the failure modes as a deliberate counter-example pass — but per the guidelines these live *here, attached to the concept*, not bundled as a generic "watch-outs" appendix. Use one `CodeVariants` (red/green) carrying the single most dangerous mistake, then a tight list of the rest.

- **The dangerous one (red/green `CodeVariants`):** deferring the *user-visible* side effect — moving `sendInvitationEmail` into `after()` so the user sees "invitation sent!" *before* the email actually sends. Red tab: invite "succeeds" instantly, email send is in `after()`, and if it throws there's no failure path and the user was already told it worked — a lie to the user, racing a page reload, no recovery. Green tab: email stays inline and `await`ed; the user's success message is *true*. This is the chapter outline's flagged "wrong default" for the invite flow — make it the centerpiece. The lesson's thesis in one contrast: defer what the user doesn't need to see; never defer what they do.
- Tight list of the remaining traps, one line each (each phrased as the symptom, per "tell them what to do" — frame as "don't, because X"): using `after()` for work that exceeds `maxDuration` (silently truncated when the box hits the wall); "fixing" a slow action by hiding its latency in `after()` (the action is still slow on its critical path — `after()` only moves *non-essential* work); relying on `after()` for retries (there are none — one shot); calling `cookies()` inside `after()` in a Server Component (runtime error — read it outside, per the earlier section).

### The ladder, and where this leaves you

Close by drawing the full three-tier ladder once and pinning the student at the bottom of it.

- **Diagram / interactive: the tier ladder as a `StateMachineWalker` (`kind="decision"`).** Root question: "Does the user need to see this work's result before you respond?" → yes → **Leaf: inline `await` (tier 0).** → no → next question: "Can you afford to lose it on a rare crash/timeout, and does it fit the function's time budget?" → yes → **Leaf: `after()` (tier 0.5).** → no (must survive crashes / retry / run long / on a schedule) → **Leaf: a later rung — Cron or Trigger.dev (tiers 1+), covered next.** Pedagogical goal: the student internalizes the *order the senior asks the questions in* (visibility first, then durability+budget), and sees that "reach for a job queue" is the *last* answer, not the first. The walker's committed-walk format (one question at a time) is exactly right — it forces the decision sequence. Per its docs, do **not** wrap in `<Figure>`.
- Prose wrap: restate the three tiers (blocks the response / same invocation after the response / outside the invocation), and state the chapter's through-line: **code stays at the lowest tier that meets the durability, latency, and time-budget requirement.** Most of the student's real work will be tier 0 — and that is correct, not lazy. Name what's next: lesson 2 takes the first step off the invocation entirely (Vercel Cron for schedules); the durability/retry rung (threshold 4) is Trigger.dev, later in the chapter.
- Optionally one `ExternalResource` card to the Next.js `after` docs. Keep external links minimal — this lesson's value is the decision frame, not API reference.

## Scope

**Prerequisites to redefine in one line each (do NOT re-teach):**
- The five-seam Server Action shape, `Result<T>`/`ok`/`err`, `safeParse` on entry — ch.043, in hand. Reference, don't derive.
- `db.transaction(async (tx) => …)`, rollback atomicity, and **external-calls-after-commit** — ch.043 L5. Restate the commit-ordering rule in one sentence as it's load-bearing here; don't re-explain transactions.
- `logAudit(tx, { action, … })` written inside the work's transaction — ch.057 L5. Used as the "atomic, don't defer this" counter-example.
- `revalidatePath` after the write — ch.043 L5. Used as-is.
- Idempotency / `idempotencyKey` discipline — ch.063 L4. Name it when threshold 4 comes up ("retries need a stable key — you met this with webhooks"); the *implementation* is not this lesson.

**Explicitly OUT of scope (defer, name the destination):**
- Scheduled jobs / Vercel Cron, `vercel.json` crons, `CRON_SECRET` — **lesson 2 of this chapter.** When threshold-4/schedule work comes up, point forward, do not teach.
- Durable retries, multi-step orchestration, `wait.for`/`wait.until`, waitpoints, the five Trigger.dev conditions, `schemaTask`, queues — **lessons 3–6 of this chapter.** `after()`-is-not-a-queue *motivates* these; it does not teach them. Resist explaining what durability mechanics look like.
- The full `maxDuration` config surface, regions, Fluid Compute concurrency tuning — **ch.098 L3.** Use only the headline fact (a hard minutes-scale wall exists; every second is the user's) and the corrected caps (5 min Hobby / 13 min Pro).
- `cacheTag`/`revalidateTag` mechanics — ch.036 / ch.072. `after()`-warms-a-cache is an *example* of fit; don't teach tag invalidation.
- `pino` setup, `requestId`/AsyncLocalStorage, redaction — ch.092. Name "your structured logger" + the catch-and-log discipline only.
- Sentry / error monitoring of background failures — ch.092. Out.
- The forms layer (`useActionState`, `useFormStatus`, `<SubmitButton>`, optimistic UI) — ch.044. The action is shown server-side only; do not render the client form.
- Building the `org_invitations` schema or the invite feature end-to-end — this lesson uses it as an illustrative action, not a feature build. Keep the row shape minimal and illustrative.

## Notes for downstream agents

- **Corrected platform figures (highest priority):** Fluid Compute caps are **5 min Hobby / 13 min Pro / 13 min Enterprise** (Vercel docs, 2026-05-14), NOT the chapter outline's "1 min / 14 min." Do not propagate the stale numbers. Prefer phrasing that emphasizes "minutes, a hard wall, every second is the user's" over a number the student will see drift.
- **Code-convention alignment:** lesson code follows the conventions — single quotes, `safeParse`, `db.transaction(async (tx) => …)`, external IO outside the transaction, `Temporal` not `Date` if any time value appears (it likely won't in this lesson; if a timestamp is shown, use the `timestamptz`/Temporal convention, not raw `Date`). `after` imports from `'next/server'`.
- **Directory-path caveat:** Code conventions say tasks live in `trigger/<task-name>.ts`; the chapter outline says `src/trigger/`. This lesson does NOT write any task files, so it doesn't matter here — but if any agent shows a task path in passing, prefer `trigger/` per the conventions and leave the reconciliation to lesson 4.
- **No live-coding sandbox.** `after()`/request-lifecycle can't run in the React-only ReactCoding iframe, and a Server Action Sandpack is more setup than signal. Carry the practice load with `MultipleChoice` / `Buckets`. (Per the project memory: ReactCoding is react-only; don't try to run server code in it.)
- Keep the `inviteMember` example as the single spine. One domain, reused in every section.
