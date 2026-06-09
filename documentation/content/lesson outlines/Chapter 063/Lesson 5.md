# Resend bounces and complaints

Title: Resend bounces and complaints
Sidebar label: Resend webhooks

## Lesson framing

This is the chapter's payoff lesson: it proves the webhook pattern (verify → claim → transact → mutate) built across L1–L4 is portable by shipping a **second concrete instance** for Resend.
The pedagogical spine is contrast, not novelty.
By now the student has the full Stripe handler in muscle memory; the senior insight to land is that adding a new provider changes only three lines — the verification SDK, the provider string in the claim, and the event-type switch — and everything structural (the `processed_events` claim, the single transaction, the 200/400 status surface) is identical.
Frame the lesson around that diff. The student should leave able to (a) wire a Svix-signed webhook, (b) recognize bounce-vs-complaint-vs-soft-bounce and apply the right suppression rule to each, and (c) explain why suppressions are append-only *facts* that need dedup but not the `last_event_at` ordering guard from L3.

Two real-production stakes motivate the lesson and should be stated early: every send to a bounced or complained address pushes the team's complaint rate toward the 0.3% Gmail throttling cliff (ch048), and a single complaint costs more than a single bounce because it damages reputation for *every* customer on the shared sending domain. The webhook is the inbound mechanism that keeps the `email_suppressions` table (shipped read-only in ch048 L4) honest — ch048 built the *read* side (the send-time chokepoint), this lesson builds the *write* side.

Keep the lesson short (the outline budgets 35–45 min). It is deliberately the lightest in the chapter because most of its machinery is reuse. Resist re-teaching verification mechanics (L1), dedup mechanics (L2), or the suppression schema (ch048). Restate each in one line and link; spend the student's attention on what is genuinely new: the Svix scheme, the bounce taxonomy→suppression mapping, and the `bypassSuppression` carve-out.

Cognitive-load sequencing: open with the "same shape, different provider" frame so the student knows most of this is recognition; teach the one new primitive (Svix verification) against the Stripe one they know; walk the full handler once; then the two new business branches (bounce, complaint); then the carve-out that closes the loop with the send helper; end with the portability test that generalizes to a third provider.

**Canonical contracts (ground truth — do not let downstream agents drift):**
- The dedup key is the **`svix-id` request header** (the Svix message id), NOT `event.data.email_id`. Resend payloads have no top-level event id, and the same logical email emits distinct events (bounced, later complained) each with its own `svix-id` — deduping on `email_id` would wrongly collapse them. Claim row: `processed_events(provider: 'resend', eventId: svixId, eventType: event.type)`.
- Primary verification is **`resend.webhooks.verify({ payload, headers, webhookSecret })`** reusing the `resend` singleton already exported from `lib/email.ts` (ch048 L1) — no extra dependency. The raw `svix` package (`new Webhook(secret).verify(payload, headers)`) is the provider-agnostic alternative, named once.
- `email_suppressions` schema is owned by **ch048 L4** — restate, never redefine. Columns the handler writes: `email` (normalized, unique), `reason` (pgEnum: `'hard_bounce' | 'soft_bounce_threshold' | 'complaint' | 'manual_unsubscribe' | 'invalid_address'`), `providerEventId` (the `svix-id`, for traceability), `metadata` (jsonb raw payload). `id` is `uuidv7()`, `createdAt`/`updatedAt` default. The insert sets `reason` to `'hard_bounce'` or `'complaint'`.
- Bounce payload shape (current, verified): top-level `type` + `created_at`; `data.to` is an **array**; `data.bounce.{ type, subType, message }`. `data.bounce.type` ∈ `'Permanent' | 'Transient' | 'Undetermined'`. Suppress on `Permanent`; log/count `Transient`; treat `Undetermined` conservatively (log, do not suppress on first occurrence).
- The handler reuses the `claimEvent(tx, provider, eventId, eventType)` helper named for extraction in L2 and the same `verify → claim → mutate → 200` scaffold. The Resend route lives at `app/api/webhooks/resend/route.ts`, separate from Stripe's route (the course chose two routes, shared helpers).

## Lesson sections

### The inbound half of the suppression list

Introduction. Open with the senior question: ch048 built `email_suppressions` and made every send read it first, but who *writes* to it? Answer: Resend announces every undeliverable or unwanted send via webhook (`email.bounced`, `email.complained`), and this handler is the writer.
Draw the loop in two sentences: webhook populates the table, `sendEmail` reads it — two halves of one discipline shipped a unit apart.
State the production stakes (0.3% complaint cliff, complaints damage shared-domain reputation) tersely; ch048 owns the depth, link it.
Then the reframe that sets up the whole lesson: this handler is the **same shape** as the Stripe handler from L1–L2 — verify, claim, transact, mutate. Only the provider differs. Preview the three lines that change.

No diagram needed here; a tight paragraph plus a one-line forward map ("Svix verification → next section; bounce/complaint branches → after") is enough. Keep it warm and brief per the pedagogy guideline.

Terms to define inline with `<Term>`: **FBL** (Feedback Loop — the channel by which a mailbox provider reports a spam complaint back to the sender). Restate **suppression list** in one clause rather than a Term (the student met it in ch048).

### Svix verification: the same boundary, a different SDK

Teach the one genuinely new primitive. Lead with the parallel: Stripe's `constructEvent` and Resend's verify do the *same job* (timestamp parse + HMAC-SHA-256 + constant-time compare + tolerance window) behind the same boundary contract — verify the raw body before parsing. What changes is the header set and the SDK call.

Cover:
- **Svix** is the webhooks-as-a-service standard Resend uses for signing. Define with a `<Term>`: a hosted webhook layer that standardizes signature headers and delivery across many SaaS providers.
- The three headers: `svix-id`, `svix-timestamp`, `svix-signature`. The signed payload is `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA-256, base64 digest in `v1,<digest>` form. State this as "what's inside the box" — one sentence, not a hand-rolled reimplementation (L1 already did the hand-rolled HMAC once; do not resurrect it).
- The raw-body rule is identical and non-negotiable: `await request.text()` once, verify, parse later. Restate in one line and link L1 — this is the single most-repeated webhook bug and worth the reminder, but not a re-teach.
- The secret: `RESEND_WEBHOOK_SECRET`, `whsec_`-prefixed (same prefix family as Stripe's local secret, noted in L1). Add to `env.ts` as `z.string().startsWith('whsec_')`. The SDK strips the prefix; hand-rolling would require base64-decoding the remainder as the key — named once to justify using the SDK.

Present the verification call with **`CodeVariants`** to make the "same boundary, different SDK" point land visually — this is the core insight of the section and a side-by-side is the right vehicle:
- Variant **Stripe** (recognition): `const event = stripe.webhooks.constructEvent(rawBody, request.headers.get('stripe-signature')!, env.STRIPE_WEBHOOK_SECRET)` inside try/catch → 400 problem+json on throw. Prose: "what the student already shipped in L1."
- Variant **Resend** (the new one): `const event = resend.webhooks.verify({ payload: rawBody, headers: { id, timestamp, signature }, webhookSecret: env.RESEND_WEBHOOK_SECRET })` where the three header values come from `request.headers.get('svix-id')` etc. Prose: "same try/catch, same 400, reuses the `resend` singleton from `lib/email.ts` — no new dependency."

Use `del=`/`ins=` or per-pane mark color to highlight that only the SDK line and the header names differ; the surrounding try/catch + 400 return are byte-identical. Cap with `maxLines`.

In prose below the variants, name the provider-agnostic alternative once: `import { Webhook } from 'svix'; new Webhook(secret).verify(payload, headers)` — same contract, separate npm install; the course prefers `resend.webhooks.verify` because the singleton already exists. Note that Svix headers arrive lowercased through `request.headers.get(...)` in the Node runtime, so read them lowercase (closes a watch-out without a separate section).

Restate `export const runtime = 'nodejs'` in one line (L1 owns the reasoning).

### The Resend handler, end to end

The worked example — the whole point of the lesson made concrete. Show the full route file once, then walk it. Because the file has several focus points (verify block, claim, the switch, the two business branches) and the student needs attention directed to each in turn, use **`AnnotatedCode`** rather than a plain block.

The file (`app/api/webhooks/resend/route.ts`), ~25–30 lines, must reuse the exact L2 scaffold so the student sees the reuse:
```
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: ResendWebhookEvent;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get('svix-id')!,
        timestamp: request.headers.get('svix-timestamp')!,
        signature: request.headers.get('svix-signature')!,
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return problem(400, 'invalid_signature');
  }

  const svixId = request.headers.get('svix-id')!;
  try {
    await db.transaction(async (tx) => {
      const claimed = await claimEvent(tx, 'resend', svixId, event.type);
      if (claimed.length === 0) return;            // duplicate → 200
      switch (event.type) {
        case 'email.bounced':    await onBounced(tx, event); break;
        case 'email.complained': await onComplained(tx, event); break;
      }
    });
  } catch {
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}
```

AnnotatedSteps (blue default; color the diff-from-Stripe steps to draw the eye):
1. `{1}` runtime line — one clause, links L1.
2. `{5-16}` verify block, **colored** (this is the Resend-specific surface) — reuse the prior section's framing in one sentence; note the `catch {}` deliberately ignores the error object (no logging of unverified input — restate L1's "verify before log" in a clause).
3. `{19} "svix-id"` the claim key — **emphasize**: dedup is on the `svix-id` header, the Svix message id, not anything in the body. One sentence on *why*: distinct events for the same email get distinct svix-ids, so bounce and a later complaint both process.
4. `{21-23} "claimEvent"` — the identical L2 claim inside the identical `db.transaction`; zero-row claim short-circuits to 200. "This block is copy-pasted from the Stripe handler."
5. `{24-27}` the switch — the only other Resend-specific line; only two cases because the course acts on only two events.
6. `{29}`/`{30}` the 500-on-throw / 200-otherwise return surface — identical to L2; link the full status-code table rather than re-deriving it.

After the walkthrough, a one-paragraph callout of the "three lines that changed" (verify SDK, provider string `'resend'`, the switch cases) to bank the portability thesis. This is the sentence the student should remember from the lesson.

Mention the typed event shape (`ResendWebhookEvent`) is a discriminated union on `type`; the course derives it from the payload (a hand-written `z.discriminatedUnion('type', …)` parsed after verify, or the SDK's return type if typed) — keep this to one line, it is not the lesson's focus. Note `problem(...)` is the ch046 RFC 9457 helper, restated in a clause.

### Bounce, complaint, and the rule for each

The new business logic. Two short subsections under this header, then the classification exercise.

Frame first: a bounce and a complaint are both the mailbox provider saying "stop," but they differ in severity and in whether they're permanent. Suppression is the response to both; the *taxonomy* decides whether you suppress now or count-and-wait. ch048 L4 defined this taxonomy — this lesson *applies* it in handler code. Restate the taxonomy in a compact table or tight prose, do not re-derive.

#### `email.bounced` — permanent suppresses, transient counts

Cover, grounded in the real payload (`data.bounce.type`):
- `data.bounce.type === 'Permanent'` (hard bounce: mailbox doesn't exist, domain rejects) → insert into `email_suppressions` with `reason: 'hard_bounce'`. First occurrence suppresses; re-sending is what providers punish hardest.
- `data.bounce.type === 'Transient'` (soft bounce: mailbox full, temporary) → do **not** suppress on first occurrence. Resend retries transient bounces itself. The course's rule: log and increment a soft-bounce counter; escalate to `reason: 'soft_bounce_threshold'` after ~5 consecutive soft bounces (the ch048 threshold). Name the escalation as a per-product call; the handler's default is "suppress on Permanent only." Keep the counter mechanism light — point at ch048 for the policy, don't build a full counter here.
- `data.bounce.type === 'Undetermined'` → conservative: log, do not suppress on first occurrence (Resend couldn't classify it). This is a real third value from the current payload — name it so the student's `switch`/`if` is exhaustive and doesn't accidentally suppress on an ambiguous signal.
- `data.to` is an **array** — iterate and suppress each address (almost always length 1, but the field is plural; writing the loop is the correct shape).

Show the `onBounced` body as a small **`Code`** block (it's short and single-focus, AnnotatedCode would be overkill): read `data.bounce.type`, branch, normalize each `data.to` address (lowercase/trim — restate ch048's normalization rule in a clause), and on Permanent do the suppression insert (next subsection's pattern). Use `CodeTooltips` on `bounce.type` to surface the three literal values inline without a prose detour.

#### `email.complained` — always permanent

Cover:
- A complaint = recipient hit "report spam" (the FBL signal). Always treated as permanent: insert with `reason: 'complaint'`, no soft/transient distinction.
- The senior anchor: complaints are catastrophic, not informational — a single complaint hurts deliverability for every customer on the shared domain, which is why there's no "count and wait" branch. Re-sending to a complainer is the single worst thing the app can do for its sender reputation.
- `onComplained` is even simpler than `onBounced` (no type branch) — one sentence, optionally a two-line `Code` block, or fold it into the suppression-insert example below to avoid redundancy.

#### Classify the signal — exercise

A **`Buckets`** exercise (two-column) cements two discriminations at once: the suppress-now-vs-count distinction *and* the state-vs-fact framing from L3. This is the best fit — the skill being checked is classification, and Buckets is the classification drill.
- Bucket **Suppress immediately**: hard bounce (`Permanent`), spam complaint.
- Bucket **Log / count, don't suppress yet**: soft bounce (`Transient`), undetermined bounce, `email.delivered`, `email.opened`.
Instructions prompt: "Sort each Resend signal by what the handler should do." Items are short prose/code chips. This also quietly teaches "subscribe only to events you act on" by including telemetry-only events as the don't-suppress bucket.

Add a `<Term>` on **FBL** here if not already introduced, and one on **idempotent** if the student needs the reminder (likely already solid from L4 — use judgment, prefer not to over-Term).

### Writing the suppression: `ON CONFLICT DO NOTHING`, again

The recurrence of the chapter's core pattern, now at the *business-work* layer (the claim dedups the event; this dedups the suppression row). The pedagogical goal is recognition: the same atomic-claim shape the student saw for `processed_events` in L2 reappears for `email_suppressions`.

Cover:
- The insert: `tx.insert(emailSuppressions).values({ email, reason, providerEventId: svixId, metadata: event.data }).onConflictDoNothing({ target: emailSuppressions.email })`. A bounce of an already-suppressed address is a silent no-op — exactly the L2 story, different table.
- Why both layers dedup and why it's not redundant: the `processed_events` claim stops the *same webhook delivery* from processing twice (event-level); `ON CONFLICT` on `email_suppressions.email` handles the *different events for the same address* case (a bounce then a complaint for the same email both land, the second is a clean no-op). Name this composition explicitly — it's the subtle senior point.
- Both writes live in the **same transaction** opened in the handler: claim + suppression-insert commit together or not at all (restate L2's "claim row + effect = one commit" in a clause). Thread `tx`, never `db` (restate the db-vs-tx discipline in a clause).

This is a **`DrizzleCoding`** exercise — the student writes the suppression insert and sees `ON CONFLICT DO NOTHING` produce a no-op against a pre-seeded suppressed address. Per the PGlite harness limits noted across this chapter's exercises: use explicit SQL column names on every column, a plain `text` PK or `integer` (no `uuidv7()` default in the sandbox), drop the pgEnum (use `text` for `reason`), and a table-level `unique('email_suppressions_email_unique').on(t.email)`. Seed one already-suppressed row; `expectedRows={[]}` is the insight (the insert claims nothing because the row exists). Instructions: "Suppress this bounced address; the row already exists, so your insert should change nothing." This mirrors the L2/L4 lost-claim exercises so the student feels the pattern, not a new mechanic.

Note for the agent: `DrizzleCoding`/`SQLCoding` is the only viable sandbox here — `ReactCoding` can't load third-party npm (`resend`/`svix`), so do not attempt a live verification or handler sandbox. The handler code stays as static `Code`/`AnnotatedCode`.

### The `bypassSuppression` carve-out

Closes the loop with ch048's send helper and lands the senior nuance: the suppression list has a deliberate, audited exception. This is conceptual, not new mechanism, so keep it prose-led with one small code reference.

Cover:
- The problem: some transactional flows must reach even a suppressed address. The canonical case is **password reset to an account whose address bounced** — suppressing it locks the user out of recovery. Email verification (the user may have just fixed a typo'd address) is the second case.
- The mechanism (restate from ch048 L4, don't redefine): `sendEmail(...)` reads `email_suppressions` before calling Resend and returns a `'suppressed'` failure unless `bypassSuppression: true` is passed. Show the *call site*, not the helper internals: `await sendEmail({ to, subject, react, bypassSuppression: true })` in the reset flow. One small `Code` block.
- The senior anchor: bypass is a privilege, not an ergonomic default — three or four audited call sites in the whole codebase, each justified in a comment, all transactional (never marketing). The carve-out is auditable in code review precisely because it's an explicit argument, not a config flag.
- Tie back to the two halves: the webhook *writes* the suppression; the send helper *reads* it and honors `bypassSuppression`. The exception lives at the read side, not the write side — the handler always records the truth; the send decides what to do with it. This is the clean separation worth stating.

Connect to the data model in one clause: ch048's `bypass_until` column scopes a time-boxed bypass window for verification flows (e.g. 5 minutes) — name it as the more precise mechanism, but the boolean flag is the teachable default. Don't drill the window logic; it's ch048's.

### One more provider is one more file

The portability payoff — the lesson's thesis stated as a closing generalization, connecting back to L4's "one pattern, four surfaces." Brief; this is synthesis, not new teaching.

Cover:
- The portability test: adding a third webhook provider (a future integration, Trigger.dev callbacks) means a new route file, a new verification SDK call, the *same* `processed_events(provider, eventId)` claim, the *same* outer transaction, a new event-type switch. Nothing structural is reinvented.
- Why two routes, not one unified `/api/webhooks` with provider-detection: separate verification config, separate observability, separate failure isolation. The unification lives in the shared helpers (`claimEvent`, the `processedEvents` table), not the route file. State this as the deliberate design call (restate, the course already chose this).
- State-vs-fact callback to L3: suppressions are append-only *facts*, so they need dedup (the claim + `ON CONFLICT`) but **not** the `last_event_at` ordering predicate — there's no mutable state to reorder, a bounce that arrives "late" is still a true bounce. Naming this explicitly resolves the question a sharp student will have ("where's the ordering guard from L3?") and reinforces the L3 asymmetry. This is the one place to invoke L3 and it's a one-paragraph callback.

Use a small **`Figure`** with a compact three- or four-column compare (plain HTML+CSS table-like grid, capped height) summarizing the portability point: columns Stripe / Resend / (next provider), rows "verify SDK", "claim key source", "business work" — showing the claim row and transaction are constant while the other rows vary. Pedagogical goal: one glance that banks "the spine is invariant, the edges vary." This echoes L4's four-surfaces diagram but scoped to webhook providers specifically, so it complements rather than duplicates.

Optional close: an `ExternalResource` LinkCard to Resend's webhooks docs (the payload reference) and the Svix verification docs. Two cards max.

## Scope

**This lesson teaches:** the Resend/Svix webhook handler as the second instance of the chapter's pattern — `resend.webhooks.verify` signature verification, dedup on the `svix-id` header via the existing `processed_events` claim, the `email.bounced` (Permanent/Transient/Undetermined) and `email.complained` business branches, the `ON CONFLICT DO NOTHING` write to `email_suppressions`, the `bypassSuppression` carve-out call site, and the portability generalization.

**Restate in one line each, do not re-teach (prerequisites):**
- Signature-verification fundamentals, the raw-body rule, 400-not-401, the hand-rolled HMAC — **L1**. (The hand-rolled helper is a closed teaching device; do not reference it as production.)
- `processed_events` schema, `INSERT … ON CONFLICT DO NOTHING RETURNING` atomic claim, the `claimEvent` helper, the single-transaction wrap, the 200/400/500 status surface, the db-vs-tx discipline — **L2**.
- The `email_suppressions` schema, the bounce/complaint taxonomy, the read-before-send chokepoint in `lib/email.ts`, the `bypassSuppression` flag and `bypass_until` window, address normalization, the 0.3% complaint-rate budget — **ch048 L4**. (Schema is owned there; reference its columns, never redefine.)
- The `resend` singleton and `lib/email.ts` wrapper, `sendEmail` shape — **ch048 L1**.
- RFC 9457 problem+json (`problem(...)` helper) — **ch046**.
- `ON CONFLICT`/`RETURNING` SQL mechanics — **ch038 L5**.
- The four-surfaces idempotency generalization — **L4** (callback only).

**Explicitly out of scope (defer, do not teach):**
- The `last_event_at` ordering predicate and the redirect race — **L3** (referenced once to explain why suppressions, being facts, don't need it).
- Resend setup, DKIM/SPF/DMARC, sender identity, subdomain strategy — **ch048 L1–L3**.
- React Email composition — **ch049**.
- Soft-bounce counter implementation depth and the full escalation policy — named, deferred to **ch048** policy; do not build a counter here.
- Background-job offload / retries for post-webhook work and the `processed_events` retention sweep — **ch066**.
- Structured logging internals and stale-event alerting — **ch092** (log the disposition; don't build the logger).
- Self-serve un-suppression / manual-unsubscribe handling — out of scope (support flow; `manual_unsubscribe` reason is named in the schema, not handled here).
- A unified single-route multi-provider handler — named and dismissed; the course ships two routes.

## Code conventions notes

- Webhook handler shape follows the Route handlers + Data layer sections: `runtime = 'nodejs'`, verify raw body before parse, claim in `processed_events` inside one transaction, handler is the single writer for `email_suppressions`. Errors as RFC 9457 (400 invalid signature; 500 server bug). Aligned, no divergence.
- Drizzle: `casing: 'snake_case'` on the client means production code reads `emailSuppressions`/`createdAt` while SQL is `email_suppressions`/`created_at` — show the camelCase TS form in lesson code. The **DrizzleCoding sandbox deliberately diverges** (explicit SQL column names, `text` instead of pgEnum, `text`/`integer` PK instead of `uuidv7()`, table-level `unique`) due to PGlite harness limits — note this divergence in the exercise so downstream agents know it's intentional, consistent with this chapter's other exercises.
- `env.ts`: add `RESEND_WEBHOOK_SECRET: z.string().startsWith('whsec_')` via `@t3-oss/env-nextjs` + Zod, alongside the `RESEND_API_KEY` from ch048.
- `onConflictDoNothing({ target: emailSuppressions.email })` matches the unique-on-email constraint from ch048's schema — single-column target (the suppression table is global, not tenant-scoped, so no composite key here; this is an intentional exception to the tenant-scoped-unique convention and worth a one-clause note since the table predates tenancy concerns).
- Logging: one child logger per seam — `logger.child({ seam: 'webhook.resend' })` — log `svix-id` + disposition (claimed/duplicate/suppressed/error) per branch. Restate from the Logging section in a clause; internals are ch092.
- No external call (the `resend.webhooks.verify` is local crypto, not IO — fine; but a real `resend.emails.send` would be forbidden inside the transaction) — the handler does DB-only work inside `db.transaction`, consistent with the "no external IO in a transaction" rule.
