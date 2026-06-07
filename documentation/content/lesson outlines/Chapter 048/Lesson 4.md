# Lesson title

- Title: The suppression list as a send-time chokepoint
- Sidebar label: Suppression list

# Lesson framing

Fourth and final teaching lesson of Chapter 048. L1 shipped `lib/email.ts` with the `sendEmail` wrapper and the empty `// suppression check lands here` seam; L2/L3 shipped zero application code (DNS + addresses). This lesson fills that seam: it's the lesson where the deliverability discipline becomes *code the student writes*.

Archetype: **pattern lesson**. The deliverable is (a) the `emailSuppressions` Drizzle table and (b) the read-before-send check inside `sendEmail`. The webhook that *populates* the table is Ch 063 L5 — out of scope, named as the other half of the loop.

Core mental model the student must leave with: **a bounce or complaint is the receiving mailbox provider telling you "do not send here." The suppression list is the app's memory of those signals, and the send wrapper is the single chokepoint that consults that memory before every send.** Two halves of one loop: the webhook *writes* the table (Ch 063), every send path *reads* it (here). The student only builds the read half but must see the whole loop so the schema choices make sense.

Senior framing threads (carry through, do not bundle into a "tips" section):
- The check lives at the **wrapper, not the call site**. One forgotten call site is a real reputation incident; centralizing makes "never send to suppressed" structural rather than a thing every caller must remember. This is the lesson's spine — it reuses the same "make it structural, not a discipline people must remember" reasoning the course applies to tenancy (`tenantDb`) and idempotency.
- **Fail-closed, not fail-open.** A DB error during the suppression read must return `err`, never silently fall through to a send. A missed transactional email is recoverable (user retries); a send to a complained address is not (the reputation damage is done). This is the lesson's sharpest senior-judgment moment and the strongest exercise candidate.
- **The complaint rate is a reputation budget**, not a vanity metric: <0.1% healthy, 0.1–0.3% warning, >0.3% throttling at Gmail with a 7-day clean-streak recovery. The number is owned jointly — engineering owns the suppression discipline + the data; the team owns content/segmentation.
- **`bypassSuppression` is a privilege, not a default.** Verification and security-critical flows may send to a suppressed address; the option is explicit per call and auditable in review.

Where students struggle / what beginners get wrong (address head-on):
- They put the check at each call site (or worse, only on the "important" sends) — frame the wrapper-chokepoint as the fix before showing code.
- They store the email un-normalized, so `User@x.com` and `user@x.com` are two rows and the unique index doesn't dedupe — normalize at write *and* read.
- They fail-open on a DB error "to be safe for the user" — invert that instinct explicitly.
- They conflate "the user unsubscribed from marketing" with "do not send password resets" — the `reason` distinction is why the wrapper branches on reason, not just presence.

Tone: adult, terse, decisions-first. Concrete production stakes throughout (a complained address re-emailed = measurable reputation hit affecting *every other user's* deliverability — the externality framing lands the "stay in the inbox for everyone else" point).

CRITICAL CONTRACT NOTE for downstream agents — this lesson **owns** the `emailSuppressions` schema; Ch 063 L5 writes to it and explicitly defers the schema to here. The Ch 063 outline sketches a thinner shape (`reason: 'bounce' | 'complaint'`, `permanent: boolean`, `suppressed_at`, boolean `bypassSuppression`). Reconcile toward a single canonical schema (see Scope + the schema section): keep `bypassSuppression` a **boolean** at the `sendEmail` boundary (that's the established L1/063 API), model `reason` as a pgEnum, and store the bounce/complaint distinction in `reason` rather than a separate `permanent` flag. Flag any residual drift to the reviewer rather than inventing a parallel API.

# Lesson sections

## Introduction (no header)

Open with the senior question, concretely: three sends that all "succeed" from the app's side but damage the sending reputation — a welcome email to a mailbox that hard-bounced last week, a newsletter to someone who hit "report spam" yesterday, a password-reset to an address that bounced six months ago. State the goal: install the one data structure that holds "must not send" and wire the one chokepoint that consults it before every send. Connect back: L1 left a `// suppression check lands here` comment in `sendEmail` — this lesson fills it. Preview the deliverable (the `emailSuppressions` table + the read in `sendEmail`) and name the boundary up front: the webhook that *writes* this table arrives in Ch 063; today is the schema and the read.
Keep warm and brief (~5 lines).

## A bounce is the mailbox provider saying "stop"

Pure mental-model section, no code. Reframe suppression away from "being polite" toward "staying in the inbox for everyone else." Teach:
- A bounce/complaint is a **signal from the receiving provider**, not feedback about your content. Sending again — even different content, even for a different reason — tells the provider you ignore signals, and it down-ranks your *next* message to *every* recipient.
- The metric providers actually score is the *sender's obedience*, surfaced as the complaint rate. The externality framing: one complained address re-emailed isn't a per-user problem, it's a shared-reputation problem — it pushes the welcome email of an unrelated new signup toward spam.
- Therefore the app's job is mechanical: the instant a signal arrives, remove that address from the send-eligibility set, permanently for complaints/hard bounces.

This section sets up *why* a persistent table (not an in-memory cache, not a per-send API call to Resend) is the right structure: the truth must survive restarts and be queryable in one indexed lookup on the hot send path.

Tooltips (`Term`): FBL (feedback loop), sender reputation.
No diagram here — prose carries it; the loop diagram lands in the next section where it pays off.

## The two halves of the loop: who writes, who reads

Introduce the architecture with a **diagram** before any code, so the student has the whole loop in mind while building only one half.

Diagram: **D2 system diagram**, `direction: right`, wrapped in `<Figure>`. Two flows converging on one central `email_suppressions` table node (use `shape: sql_table` or a plain rounded rectangle for the table; the surrounding nodes are services):
- Write path (de-emphasized / dashed stroke, labelled "Chapter 063"): `Mailbox provider` → `Resend` → `email.bounced / email.complained webhook` → `email_suppressions` (INSERT).
- Read path (solid, the lesson's focus): `Server Action` → `sendEmail()` → `email_suppressions` (SELECT) → branch to `Resend.emails.send` (allowed) or short-circuit `{ ok: false }` (suppressed).
Caption: the webhook is the single writer; every send is a reader. This lesson builds the read; Ch 063 builds the write.
Pedagogical goal: make "single writer, many readers" visible, and visually justify why the schema lives here even though the writer ships later. Use `expandable={false}` only if leader lines are involved — this is plain D2 so default `expandable` is fine.

Prose: name the single-writer principle (the webhook owns this table; the app reads-and-branches). Forward-link Ch 063 for the write side explicitly so the student isn't left wondering how rows appear.

## The bounce taxonomy that decides what gets suppressed

Teach the three signal types and the rule for each — this is the domain knowledge that justifies the `reason` enum in the schema. Structure as prose with a compact reference (a small `<table>` in MDX or a `CardGrid` of three cards — prefer a plain markdown table for density):
- **Hard bounce** (permanent: mailbox/domain doesn't exist, blocked). Suppress on the **first** occurrence — re-sending is what providers punish hardest. Arrives as Resend `email.bounced` with `data.bounce.type: 'Permanent'`.
- **Soft / transient bounce** (mailbox full, server temporarily down, greylisted). Do **not** suppress on first occurrence; the rule of thumb is suppress after ~5 consecutive soft signals to the same address. Arrives primarily as Resend `email.delivery_delayed` (and `email.bounced` may also carry `data.bounce.type: 'Temporary'` for some failures). FACT-CHECKED: `email.bounced` is the permanent-rejection event; temporary issues are the dedicated `email.delivery_delayed` event — do NOT teach "soft bounce = `email.bounced` with transient type" as the only path; the chapter outline conflated these and the Ch 063 outline is loose on it too. Keep the lesson's framing event-name-light (the taxonomy is hard/soft/complaint; the exact event wiring is Ch 063's job) but if event names appear, get this mapping right.
- **Complaint / FBL** (recipient hit "report spam" — fires only after successful delivery). Suppress **immediately, permanently** — a single complaint costs more than a single bounce. Arrives as Resend `email.complained`.
- Name in one line that `email.delivered` / `email.opened` / `email.clicked` exist but are telemetry, not suppression signals — so the student doesn't expect them in the table.

Senior note: the hard-vs-soft distinction is *why* the schema stores a `reason`, not just an email — the write side (Ch 063) needs to record why, and the read side may treat reasons differently (see the `manual_unsubscribe` branch later).

Exercise — **`Buckets`** (`twoCol`), the natural fit for a taxonomy. Three buckets: "Suppress on first occurrence", "Suppress only after a threshold", "Never suppress (telemetry)". Items: hard bounce / mailbox doesn't exist; complaint (report spam); mailbox full; server temporarily unavailable; `email.delivered`; `email.opened`. Goal: cement that not every negative-sounding event suppresses, and complaints/hard-bounces are immediate. Put it right after the taxonomy prose.

Tooltips (`Term`): greylisting, transient vs permanent (if not obvious from context).

## Modeling the suppression list: the `email_suppressions` table

The schema section. This is the lesson's first code. Present the Drizzle table with **`AnnotatedCode`** so each column's *reasoning* gets its own step (the column choices ARE the senior content — don't just dump the table).

Canonical schema to teach (downstream agents: this is the source of truth for Ch 063):
```ts
export const suppressionReason = pgEnum('suppression_reason', [
  'hard_bounce',
  'soft_bounce_threshold',
  'complaint',
  'manual_unsubscribe',
]);

export const emailSuppressions = pgTable('email_suppressions', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  email: text('email').notNull().unique(),         // normalized: lowercased + trimmed
  reason: suppressionReason('reason').notNull(),
  providerEventId: text('provider_event_id'),       // Resend event.id that wrote the row; dedup + traceability
  bypassUntil: timestamp('bypass_until', { withTimezone: true }), // optional carve-out window
  metadata: jsonb('metadata'),                      // raw provider payload, for debugging
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

AnnotatedCode steps (each ≤6 lines prose, color-coded):
1. `id` + `$defaultFn(uuidv7())` — recall the course's UUIDv7 convention (Ch 037) in half a sentence; don't re-teach it. Link to the convention, move on.
2. `email ... .unique()` — **the load-bearing column.** The unique constraint is what lets the read answer "is this suppressed?" in one index lookup, and what lets the Ch 063 INSERT use `ON CONFLICT (email) DO NOTHING` for idempotent writes. State the normalization requirement here: the value is always lowercased + trimmed, enforced at write AND read — otherwise the unique index doesn't dedupe case variants. This is the most important step.
3. `reason` pgEnum — maps the taxonomy from the previous section to stored values. Note `soft_bounce_threshold` (not raw soft bounces — only the promoted ones land here) and `manual_unsubscribe` (the marketing layer's writer, Ch 063+, distinguished because transactional sends bypass it).
4. `providerEventId` — the Resend `event.id`; dual purpose (traceability + the webhook's dedup key). One sentence; forward-link Ch 063 dedup.
5. `bypassUntil` — the time-boxed carve-out (explained fully in the bypass section). Just introduce the column here.
6. `metadata` jsonb — raw payload for debugging without re-querying Resend.
7. `createdAt` / `updatedAt` timestamptz + `defaultNow()` — course timestamp convention (Temporal-at-the-seam, Ch storage convention); one line.

After AnnotatedCode, one line on where it lives (`db/schema.ts`, Architectural Principle #2 single-source-of-truth) and one line that the Zod validator is derived via `drizzle-zod` `createSelectSchema` (so Ch 063's webhook parses the row shape from the same source) — name it, don't build the Zod schema here; that's a one-liner the project chapter wires.

Code conventions to honor: `withTimezone: true` for timestamptz, `defaultNow()`, snake-case via client `casing` (so column args could be omitted — but show explicit snake-case names in the lesson for clarity, and NOTE to downstream agents this is a deliberate teaching choice; the project repo relies on `casing: 'snake_case'`). UUIDv7 via `$defaultFn(() => uuidv7())`.

Exercise — **`DrizzleSchemaCoding`** (live schema practice; the schema is the deliverable, so let the student build the load-bearing part). Scope it tightly to avoid PGlite limits (per project notes: no `casing`, `uuidv7()` unsupported in the sandbox, drop pgEnum from probes):
- Starter: the table with `id`, `reason` (as plain `text` in the sandbox to dodge the enum-probe limit — NOTE this divergence to the student in `instructions`: "in the real schema `reason` is a pgEnum; here it's text so the in-browser DB can run the checks"), `createdAt`. Student must add `email text not null unique`.
- `requirements`: `email` column, `type: 'text'`, `notNull: true`, `unique: true`.
- `probes`: (a) insert two distinct emails succeeds (`mustSucceed: true`); (b) insert the same email twice fails (`mustSucceed: false`) — proves the unique constraint is the dedupe guarantee.
- Use `gen_random_uuid()` / a plain default for `id` in the sandbox starter, not `uuidv7()`.
Goal: the student feels the unique constraint do its job. Keep `maxHeight` modest.

Tooltips (`Term`): pgEnum, `ON CONFLICT DO NOTHING` (brief — full treatment is Ch 063), idempotent.

## The read-before-send check inside `sendEmail`

The behavioral core. This is where the L1 seam gets filled. Show the wrapper with the suppression read inserted, using **`CodeVariants`** for a before/after framing (the L1 skeleton vs. the filled version) — this is exactly the before/after case CodeVariants is for, and it visually anchors "we are completing earlier code."

Variant "Before (Chapter 048 L1)": the `sendEmail` body with the `// suppression check lands here` comment and the direct `resend.emails.send` call, returning `Result`.
Variant "After (with the chokepoint)": the same function with the four-step gate inserted before the Resend call.

The four steps inside the gate (teach as the senior algorithm — also reinforced by the Sequence exercise below):
1. Normalize the recipient: `const email = input.to.toLowerCase().trim();`
2. Query `emailSuppressions` for that email (single indexed lookup).
3. If a row exists and is not inside an active `bypassUntil` window (and the reason isn't bypassable for this send type — see bypass section), return `err('forbidden', ...)` / the `{ ok: false, reason: 'suppressed' }` shape **without calling Resend**.
4. Otherwise call `resend.emails.send` as before.

Reconcile the return shape with L1: L1's `sendEmail` returns `Result<{ id }>` with `err(code, userMessage)`. The suppressed outcome should map onto that `Result` — use `err('forbidden', 'This address is on the suppression list.')` (the `forbidden` code from `lib/result.ts`) OR a dedicated `reason: 'suppressed'` — downstream agents: pick the `Result` mapping, keep it consistent with L1's `ok`/`err` helpers, and note the choice. The caller branches on it exactly like any other failure.

Then the **wrapper-not-call-site argument**, given full weight (it's the lesson's spine): show (in prose or a tiny `CodeVariants` "anti-pattern" tab) the tempting wrong shape — each Server Action checking suppression itself — and name why it fails: the check that lives at N call sites is forgotten at call site N+1, and that single omission is a production reputation incident. Centralizing in the wrapper makes the guarantee structural. Tie to the course-wide pattern (same reasoning as `tenantDb` for tenancy): when correctness must hold at every call, make it impossible to skip, not a rule to remember.

Convention note: the suppression SELECT is a normal `db` read — but per conventions, never `await` the suppression read *inside* a DB transaction that also does other work along with the external Resend call (no external calls inside transactions). `sendEmail` isn't transactional; the read is a standalone query. One line so downstream agents don't wrap it wrongly.

Exercise — **`Sequence`** ordering drill. Show the gate's body as a fixed code block (with the four logical regions), steps shuffled: "Normalize the address (lowercase + trim)", "Look up the address in email_suppressions", "If suppressed and not bypassed, return ok:false without sending", "Call resend.emails.send". Goal: lock in the order — normalization *before* the lookup is the subtle one (a non-normalized lookup misses the row). Reinforces why step 1 precedes step 2.

Tooltips (`Term`): chokepoint (if treated as jargon), short-circuit.

## When a DB error means "don't send": failing closed

The sharpest senior-judgment beat — give it its own section because it inverts a beginner instinct.

Teach: what should `sendEmail` do if the suppression *query itself* throws (DB timeout, connection blip)?
- The naive instinct: "the user is waiting, let the email through" — **fail-open**. This silently defeats the whole discipline: under a DB hiccup, suppressed addresses get mailed.
- The senior call: **fail-closed** — return `err('internal', ...)` and surface the error to the operator. Justification via asymmetry of consequences: a *missed* transactional send is recoverable (the user retries the action, an operator can replay), but a send *to a suppressed address* is irreversible — the complaint/bounce is already counted against you. When consequences are asymmetric, default to the cheaper failure.
- Connect to the course's gate convention (`Code conventions.md` error-handling): "every gate that controls access treats an exception inside the check as a refusal — wrap in try/catch that defaults to deny." Suppression is such a gate. This is a named principle the student has met; cite it, don't re-derive from scratch.

Use an `<Aside type="caution">` for the crisp rule statement ("On a suppression-read error, fail closed") so it's scannable, but the reasoning lives in prose, not the aside.

Exercise — **`MultipleChoice`** (single-correct, click-reveal). Stem: the suppression query throws inside `sendEmail`; what should the wrapper return? Options: send anyway (user is waiting); retry the query 3 times then send; return `ok:false` and log the error for the operator (correct); skip the check only for this one send. `McqWhy`: the asymmetry argument in two sentences. Answers must not be verbatim from the prose (per MCQ guidance) — phrase the correct option around behavior, not the term "fail closed."

## The `bypassSuppression` carve-out

Teach the deliberate exception. Two halves: the boundary API and the stored window.

The boundary API: `sendEmail` accepts `bypassSuppression?: boolean` (keep it boolean — matches L1 and Ch 063). When `true`, the gate skips the suppression short-circuit. Two flows justify it:
- The user is actively **verifying a new email** — the verification code goes through even if that address bounced last month, because the user may have just fixed the mailbox.
- A **security-critical alert** — a new-device sign-in on an admin account.
Senior framing: bypass is a privilege granted per flow, explicit in code, auditable in review. The option exists; it is never the default; a handful of call sites set it and each justifies itself in a comment. Show one call site, e.g. the verification send with `bypassSuppression: true` and a one-line comment.

The stored window (`bypassUntil`): explain the column from the schema now that the motivation is clear. The Ch 063 ingestion can write `bypassUntil = now() + 5 minutes` for a verification flow so the *immediate* re-send is allowed but a marketing path can't ride a long-lived bypass. Contrast the watch-out: a 24-hour window lets bulk paths sneak through — the production default is minutes, scoped to one flow. Frame `bypassUntil` as the time-boxed, data-driven complement to the per-call boolean: the boolean is "this caller is allowed to try," the window is "this address is temporarily exempt regardless of caller." Forward-link Ch 063 for who writes the window.

The `reason`-aware branch: name that `manual_unsubscribe` rows are honored by marketing sends but **bypassed by transactional sends** (you can't opt out of your own password reset while keeping the account). So the gate's "is this bypassable?" decision considers both the explicit boolean AND the row's `reason` for the send's classification (transactional vs marketing, from L3). Keep this tight — the full marketing implementation is out of scope; the rule lands here as the reason the wrapper branches on `reason`, not just presence.

Tooltips (`Term`): carve-out (if jargon).

## The complaint-rate budget the team manages against

Close the operational loop. Mostly prose; one compact visual.

Teach the three zones (the 2026 thresholds):
- **< 0.1%** — healthy; inbox placement reliable.
- **0.1%–0.3%** — warning; providers down-rank newly-added recipients toward spam while engaged older recipients still see the inbox.
- **> 0.3%** — throttling (Gmail's documented line); recovery requires staying under 0.3% for ~7 consecutive days, and the domain loses delivery-support eligibility during the violation window.

Visual: a simple **HTML+CSS horizontal band** (three color-coded segments green/amber/red with the threshold numbers) inside `<Figure>` — a lightweight gauge, not a system diagram. Pedagogical goal: make the budget feel like a dial with a redline. (Per diagram guidance, a simple visual aid counts; keep it short, well under the height budget.)

Senior framing of ownership: the number tracks marketing sends almost exclusively (transactional rarely complains). When it spikes, the engineering question is "did suppression run / is the write rate climbing?" and the team's question is "what changed in the segment or copy?" Then the **leading-indicator** insight: the provider dashboard is lagged; the *suppression-table write rate* (rows/day, watched in the same DB dashboard the app already has) is the leading signal — watch its derivative, not just the postmaster number. This is the senior reach that distinguishes "we found out from Gmail" from "we caught it ourselves."

Tie back to L2/L3 in one sentence: L2 set up authentication so you're *allowed* in the inbox; L3 split subdomains so marketing can't poison transactional; this lesson keeps you in the inbox *over time* by obeying the signals. That's the chapter's arc.

Tooltips (`Term`): postmaster tools, throttling.

## Cheap defense at the form boundary

Short closing section — the pre-emptive complement to suppression. A typo'd address (`user@gnail.com`) hard-bounces and burns a suppression entry; the cheapest defense is to never send to it.
- Validate the address shape at the form with Zod `z.email()` (recall Ch 042; one line, don't re-teach Zod).
- For high-stakes flows only (new-customer signup), an optional MX-record probe at the action layer (`dns.resolveMx`) catches domains that can't receive mail at all.
Frame as reducing the *denominator* (fewer bounces to begin with), explicitly **not** a substitute for suppression. Name third-party verifiers (Kickbox / NeverBounce) in one line as the senior reach for very high-stakes signup, not built here.

Keep this to ~6 lines; it's a "and one more cheap win" coda, not a major beat.

## Wrap-up / External resources

One-paragraph recap of the loop: webhook writes (Ch 063), wrapper reads (here), fail-closed, bypass is a privilege, complaint rate is the budget. Restate the single deliverable. Forward-link Ch 063 L5 as the lesson that completes the loop and Ch 049 as where the placeholder `WelcomeEmail` becomes a real template.
`ExternalResource` LinkCards (1–2): Resend webhooks / event types doc; the Gmail/Yahoo sender guidelines (postmaster) page (reuse whatever canonical URL L2 cited for consistency).

# Scope

Prerequisites to recall briefly (do NOT re-teach — one line each, with a link):
- `lib/email.ts` + `sendEmail` wrapper, the `Result`/`ok`/`err` shape, the `// suppression check lands here` seam — all from **Ch 048 L1**. This lesson assumes the wrapper exists and fills the seam.
- Resend `email.bounced` / `email.complained` events exist and carry a bounce type — named in L2 as "feedback flows back"; this lesson uses them as the *source* of suppression rows but does not build the handler.
- Transactional vs marketing classification — from **L3**; used here only for the `reason`-aware bypass branch.
- Drizzle table conventions (UUIDv7 `$defaultFn`, `casing: 'snake_case'`, `db/schema.ts` as source of truth) — **Ch 037/038**; recall, don't re-teach.
- `drizzle-zod` `createSelectSchema` — **Ch 042 L7**; named as how the row's validator is derived, not built here.
- Zod `z.email()` — **Ch 042**; one-line recall in the form-boundary section.
- The "gate exceptions = refusal" error-handling principle — `Code conventions.md`; cited in the fail-closed section.

Out of scope (defer, name the owner):
- **The webhook handler that writes `email_suppressions`** — Svix signature verification, dedup with `processed_events`, the `ON CONFLICT DO NOTHING` INSERT, the transaction shape, soft-bounce counting/escalation. All **Ch 063 L5** (and L1/L2 for verify + dedup mechanics). This lesson defines the table and the read; it must NOT teach the write. Mention `ON CONFLICT DO NOTHING` only as the one-line reason the `email` unique constraint matters.
- **Signature verification fundamentals / HMAC** — Ch 063 L1.
- **Marketing-mail unsubscribe header wiring** (RFC 8058 `List-Unsubscribe-Post`) — out of scope; the project sends transactional only. Named once in L2/L3 already; here only the `manual_unsubscribe` reason value is named as the future writer.
- **Self-serve un-suppression / support un-suppress flow** — Ch 063 L5 names it; out of scope here.
- **Third-party address-verification services** (Kickbox, NeverBounce) — named once in the form-boundary coda, not built.
- **Batch/digest sends and the notification dispatcher** — Unit 13.
- Re-teaching the verified-domain ceremony, DNS/SPF/DKIM/DMARC, the subdomain split, the full address-convention table — L1/L2/L3 own these.

# Notes for downstream agents (delete before publish)

- This lesson is the schema source of truth for Ch 063 L5. If the reviewer finds the Ch 063 outline's thinner schema (`permanent` flag, `suppressed_at`, two-value reason) already shipped in code, surface the drift — do not silently fork. The reconciliation intent: `reason` pgEnum carries the hard/soft/complaint/manual distinction; `bypassSuppression` stays a boolean at the call boundary; `bypassUntil` is the stored window.
- Live-coding constraint: ReactCoding can't load Drizzle/Resend, so the read-before-send logic is taught with static code + Sequence + MCQ, not a runnable exercise. Only the schema gets a runnable exercise (DrizzleSchemaCoding), and it must dodge PGlite limits (no `casing`, no `uuidv7()`, `reason` as plain `text` not pgEnum in the sandbox, no enum in probes).
- Keep total length aligned with the 35–45 min estimate: the schema section + the read-before-send section + the fail-closed beat are the load-bearing thirds; the complaint-budget and form-boundary sections are lighter.
