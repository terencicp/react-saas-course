# Chapter 063 — Webhook ingestion

## Lesson 1 — Verify before parse

**Taught.** The Stripe webhook route handler as a trust boundary: HMAC-SHA-256 over `${t}.${rawBody}` (hand-rolled then replaced with `stripe.webhooks.constructEvent`), constant-time compare, 5-minute timestamp tolerance, raw-body-once rule, 400 + RFC 9457 problem+json on failure, and the `stripe listen` / `stripe trigger` local dev loop.

**Cut.** Nothing significant cut; all chapter-outline scope was delivered. The success path is deliberately a stub (`// hand off to dedup + business logic`) — dedup, transactions, and business logic are explicitly Lesson 2's job.

**Debts.** Lesson 1 closes the Web Crypto HMAC thread from ch016 L1 and the RFC 9457 error contract from ch046 (both restated in one line, not re-taught). Forward references: dedup ledger + `processed_events` → L2; out-of-order delivery → L3; Svix / Resend verification → L5; deeper Stripe SDK surface (Checkout, subscriptions) → ch064.

**Terminology.**
- `stripe.webhooks.constructEvent(rawBody, signature, secret)` — the production one-liner; throws `Stripe.errors.StripeSignatureVerificationError` on any failure, returns typed `Stripe.Event` on success.
- `constructEvent` is **synchronous** (Node runtime); `constructEventAsync` exists for Edge/Web Crypto environments.
- Signed payload shape: `` `${t}.${rawBody}` `` — timestamp, dot, exact raw body bytes.
- `Stripe-Signature` header format: `t=<unix>,v1=<hexdigest>` (multiple `v1` entries possible during rotation).
- **Trust boundary** — the route handler line where open internet meets trusted code; verify before anything else runs.
- **One-shot stream** — `request.text()` (or `.json()`) drains the body; a second read returns empty silently.
- **400, not 401** for signature failures — 4xx is terminal to senders; 401 invites retry storms.
- `whsec_` prefix on webhook signing secrets (both Stripe CLI local and Svix/Resend).

**Patterns and best practices.**
- `src/lib/stripe.ts` exports a singleton `export const stripe = new Stripe(env.STRIPE_SECRET_KEY)` — never `new Stripe()` per request.
- `env.ts` additions: `STRIPE_SECRET_KEY: z.string().startsWith('sk_')` and `STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_')` — two distinct secrets (outbound auth vs. inbound signature trust root).
- Handler skeleton at `app/api/webhooks/stripe/route.ts`: `export const runtime = 'nodejs'`; read `rawBody = await request.text()` once; read `stripe-signature` header; verify inside `try/catch`; `catch` → return 400 problem+json with title `"invalid_signature"`, no body echo, no logging of untrusted input; success → stub returning 200.
- `JSON.parse(rawBody)` only **after** `constructEvent` passes — never `request.json()` before verification (re-stringify bug: whitespace/key-order drift breaks HMAC).
- Local CLI secret (`whsec_` from `stripe listen`) ≠ dashboard production secret — one `STRIPE_WEBHOOK_SECRET` value per environment.
- Secret rotation pattern: two env entries (`STRIPE_WEBHOOK_SECRET` + `STRIPE_WEBHOOK_SECRET_OLD`), `try { new } catch { old }`, retire old after cutover.

**Misc.** The hand-rolled `verifyStripeSignature` helper is a **teaching device only** — the lesson explicitly closes it and adopts `constructEvent` as the production call. Later lessons must not resurrect or reference the hand-rolled helper as the production path.

---

## Lesson 2 — Claim once, mutate once

**Taught.** The `processed_events(provider, eventId)` dedup ledger, `INSERT ... ON CONFLICT DO NOTHING RETURNING` as atomic check-and-claim closing the select-then-insert TOCTOU race, wrapping the claim + business mutation in a single `db.transaction`, the full status-code surface (200 on dedup-hit, 200 on processed, 400 on sig failure, 5xx on genuine error only), the split-work timing discipline (DB-only inside transaction, side-effects queued), and the reference `verify → claim → mutate → 200` scaffold.

**Cut.** Retention sweep implementation deferred to ch066; structured logging internals deferred to ch092; concrete `onCheckoutCompleted` bodies left as stubs (ch064 + project ch065); generalization to Server Actions / jobs / public-route `Idempotency-Key` deferred to L4.

**Debts.** Forward-references: out-of-order delivery / `last_event_at` predicate → L3; idempotency pattern on four surfaces → L4; Resend reuse of `processedEvents` / `claimEvent` helper → L5; background job enqueue with idempotency key `webhook:${event.id}:${step}` → ch066; structured logging / per-seam child logger → ch092.

**Terminology.**
- `processed_events(provider, eventId)` — append-only dedup ledger; composite unique constraint `(provider, eventId)` is the entire dedup guarantee; `eventType` column is observability-only, not part of the key.
- `onConflictDoNothing({ target: [processedEvents.provider, processedEvents.eventId] }).returning({ id })` — one-row result = claimed; zero-row result = duplicate, short-circuit.
- **Atomic claim** — check-and-claim collapsed into one INSERT statement; no gap for a concurrent worker.
- **TOCTOU** (time-of-check-to-time-of-use) — the race in select-then-insert; the unique constraint eliminates it structurally.
- **Claim row + effect = one commit** — receipt and business mutation share the `db.transaction` boundary; crash rolls both back; retry re-claims and heals.
- `db`-vs-`tx` discipline — everything inside the transaction closure must use `tx`, never `db`.
- **Constraint-first reflex** — lean on the DB unique constraint for concurrency correctness; no app-level locks, no `serializable`.
- `isUniqueViolation` helper (ch039 L4) — alternative conflict detection when `DO NOTHING` is not pre-empted; named but not used here.

**Patterns and best practices.**
- `processedEvents` schema: `provider text notNull`, `eventId text('event_id') notNull`, `eventType text('event_type') notNull`, `receivedAt timestamp({ withTimezone: true }).defaultNow() notNull`, surrogate PK `id bigint generatedAlwaysAsIdentity`, table-level `unique('processed_events_provider_event_id_unique').on(t.provider, t.eventId)`. Production code uses Drizzle client-level `casing: 'snake_case'`; DrizzleCoding sandbox requires explicit SQL names on every column.
- Full handler shape: `export const runtime = 'nodejs'` → `verifyStripeEvent(request)` → `db.transaction(async (tx) => { claim → if (claimed.length === 0) return; → switch(event.type) → onX(tx, event) stubs })` → `return new Response(null, { status: 200 })` (covers both paths) → outer `catch { return new Response(null, { status: 500 }) }`.
- `claimEvent(tx, provider, eventId, eventType)` named as the natural extraction for L5 reuse; not yet shipped.
- Log `event.id` + disposition (`claimed` / `duplicate` / `error`) on every branch via `logger.child({ seam: 'webhook.stripe' })`.
- Retention sweep: scheduled background job deletes rows older than 30–90 days; document policy in schema comment; never a foreground delete.

**Misc.** Lesson elides the verify block to `verifyStripeEvent(request)` call in the scaffold for readability; L3 and L5 extend the same scaffold. The chapter-outline's "30-second window" is treated as stale — lesson teaches "short, bounded, not contractually published; treat as seconds" and links Stripe docs rather than citing a fixed number. DrizzleCoding exercise grades the **won-claim** case (`expectedRows={[{ id: 'row_2' }]}`, claiming a fresh `evt_new`) and prompts the student to flip to `evt_existing` as a manual exploration of the zero-row lost-claim path; sandbox uses explicit SQL column names (`text('id')` PK with string seed literals, `text('event_id')`, `text('event_type')`) and table-level unique constraint due to PGlite harness limits.

---

## Lesson 3 — Newer wins, single writer

**Taught.** The `last_event_at` high-water-mark column on state-bearing entities + `or(isNull, lt(lastEventAt, event.created))` predicate inside the UPDATE WHERE as the atomic ordering guard; UPDATE-RETURNING zero-row stale no-op; the redirect-vs-webhook race on the success page; `FinalizePoller` Client Component using `router.refresh()` on a 1s / 30s-budget interval until `isFinalized` flips; the single-writer rule; the `retrieve`-fast-path as a conditional reach.

**Cut.** Stale-event alerting mechanism (log fields named, but alert wiring deferred to ch092); real-time alternatives to polling (WebSockets, SSE) named-and-dismissed only; `revalidateTag` mentioned as "webhook should call it" but mechanics deferred to ch032.

**Debts.** `plan_entitlements` schema (column types, `last_event_at` final type) → ch064 L4. `revalidateTag(tag, profile)` and cache-invalidation mechanics → ch032. Structured logging / alerting rate-based → ch092. Idempotency generalization to four surfaces → L4.

**Terminology.**
- **`last_event_at`** — high-water-mark column (`integer` Unix-seconds at the third-party seam; final column type owned by ch064); records `event.created` of the most recently applied event.
- **High-water mark** — `<Term>` defined as "a stored marker of the furthest-along value seen so far; any event older than it is stale by definition."
- **Single-writer rule** — "the webhook is the only writer for the entity it owns; everything else reads." Hard rule; the success page's `retrieve`-fast-path is the documented violation.
- **State vs. fact asymmetry** — ordering predicate for mutable-state entities; dedup alone for append-only fact logs. `Buckets` exercise cements the discrimination.
- **`FinalizePoller`** — `'use client'` component accepting `isFinalized: boolean`; calls `router.refresh()` on 1s interval; hard-stops at 30s; clears interval on unmount.
- `router.refresh()` — clears the **client** router cache and re-runs Server Components; does **not** invalidate `'use cache'` server data → success-page entitlement read must be **dynamic/uncached**.
- Two Next.js 16 refresh primitives: Server-Action-only `refresh()` vs. Client-Component `useRouter().refresh()` — poller uses the latter.
- **TOCTOU** — named by reference (L2 term); not redefined.

**Patterns and best practices.**
- Ordering UPDATE shape: `.update(entity).set({ status, lastEventAt: event.created }).where(and(eq(entity.orgId, orgId), or(isNull(entity.lastEventAt), lt(entity.lastEventAt, event.created)))).returning({ id })`. The high-water mark advances in the **same** `.set(...)` as the mutated state — never a separate follow-up UPDATE.
- Zero rows from `.returning()` = stale no-op; log `event.id`, `event.type`, `event.created`, row `lastEventAt`; return 200 (same as dedup-hit).
- Handler growth: L2's `verify → claim → mutate → 200` scaffold unchanged; `mutate` step grows the ordering predicate alongside the claim inside the same `db.transaction`.
- Success page: `isFinalized = entitlement.status === 'active'`; render `<FinalizePoller isFinalized={isFinalized} />` when not finalized; entitlement read must be **uncached** (`getEntitlement()` with no `'use cache'`).
- Webhook handler should `revalidateTag(tag, profile)` the entitlement on write so the rest of the app's cached reads update (success-page poll handles the immediate screen; tag handles eventual consistency elsewhere).
- `retrieve`-fast-path (conditional): `stripe.checkout.sessions.retrieve(sessionId)` via singleton client; only valid if the second writer applies the same `last_event_at` predicate + `processed_events` claim, making it idempotent and convergent.

**Misc.** `plan_entitlements` used only as a shape-demo sketch; lesson explicitly states the schema is ch064 L4's job. DrizzleCoding exercise stores `last_event_at` as `integer` Unix-seconds (not `timestamptz`) to keep the `<` predicate literal and unambiguous in PGlite; `expectedRows={[]}` (stale no-op is the insight). Lesson explicitly defers Temporal codec depth — `event.created` Unix-seconds integer compared directly as a deliberate simplification at the third-party seam.

---

## Lesson 4 — One pattern, four surfaces

**Taught.** The single idempotency discipline — unique-on-key DB constraint + atomic INSERT in the same transaction as the work — generalized from webhooks to four surfaces: webhooks (`event.id`), Server Actions (Client Component UUID hidden input), retried background jobs (runtime `runId`), and public route handlers (`Idempotency-Key` header with response caching); plus the orthogonality of provenance (signature/auth) vs. attempt identity (idempotency key), and the 90%-test for when to skip an explicit key.

**Cut.** Full IETF `Idempotency-Key` draft details (fingerprinting mismatched payloads, `Idempotency-Replayed` header, concurrency 409s) — referenced, not drilled. Background job `runId` lifecycle depth deferred to ch066. `authedRoute` wrapper and `tenantDb` scoping for the route-handler example deferred to Unit 10+. `processed_events` retention sweep implementation deferred to ch066/ch092.

**Debts.** Background job retries, `runId` lifecycle, Trigger.dev `schemaTask`/queues/idempotency-key naming (`${ctx.run.id}:${step}`) → ch066. `authedRoute` wrapper production form → Unit 10+. PII redaction and retention sweep internals → ch092. Resend second instance of the pattern → L5.

**Terminology.**
- **Idempotent** — `<Term>` defined as "an operation you can apply many times with the same end effect as applying it once."
- **At-least-once delivery** — restated from L2: the transport may deliver the same message more than once; the receiver must tolerate it.
- **`Idempotency-Key`** HTTP header — opaque client-chosen token re-sent on retry; scoped per client; 24-hour cache horizon.
- **Key origin rule** — the key is generated at the source that owns the definition of "this attempt" and re-sent on replay; generating it server-side per request is the canonical bug.
- **Provenance axis** — who sent this? answered by signature (webhook) or auth (public route).
- **Attempt-identity axis** — is this the same attempt? answered by the idempotency key. The two axes are independent and both are required.
- **Response cache** — the public-route surface stores `(status, responseBody)` on the claim row and returns those bytes verbatim on replay; the other three surfaces only confirm "already done."

**Patterns and best practices.**
- Server Action idempotency: key in `FormData` validated by the same `safeParse` schema (field `idempotencyKey: z.uuid()`); scoped composite unique `unique(orgId, idempotencyKey)` on the `actionClaims` table; separate from the row's UUIDv7 PK; claim + business INSERT in a single `db.transaction`.
- Client Component generates the UUID once per form render (`crypto.randomUUID()`), in a hidden input; React 19 form state preserves it through pending and double-submit.
- Background job: `insert(jobResults).values({ runId: ctx.run.id, ... }).onConflictDoNothing({ target: [jobResults.runId] })` — no key-generation code needed; runtime is the source.
- Route-handler shape: read `Idempotency-Key` header → 400 RFC 9457 if required-but-missing; open `db.transaction`; claim under `(clientId, idempotencyKey)` composite unique; if not claimed → select + return cached `{ status, responseBody }` verbatim; if claimed → do work → `update(idempotencyKeys).set({ status, responseBody })` in the same transaction → return.
- 90% test: natural domain unique (`(orgId, slug)`, `email`) already enforces dedup for free — no extra column needed. Add `idempotencyKey` only when no natural unique exists and the operation "would be bad to do twice." Naturally idempotent verbs (PUT/DELETE) need nothing.
- Cache horizon 24 hours; same retention sweep + PII rules as `processed_events`.

**Misc.** DrizzleCoding exercise uses `idempotencyKeys` table with explicit SQL column names, table-level `unique('idempotency_keys_client_key_unique').on(t.clientId, t.idempotencyKey)`, plain `integer` PK, plain `text` key columns — PGlite harness limits. Exercise grades the **won-claim** case (`expectedRows={[{ id: 2 }]}`, fresh key `req-9b2c`), then instructs the student to flip to the seeded `req-7f3a` as a manual exploration of the zero-row lost-claim path (not auto-graded). Chapter-outline said "no YouTube video"; lesson ships a VideoCallout (Software Developer Diaries, 7 min on idempotency) placed in "The pattern, stated once" section. Background-job surface is intentionally a "third data point" sketch; ch066 owns the depth.

---

## Lesson 5 — Resend bounces and complaints

**Taught.** The Resend/Svix webhook handler as the second concrete instance of the chapter's verify→claim→transact→mutate pattern: `resend.webhooks.verify` signature check (three Svix headers), dedup via the existing `claimEvent(tx, 'resend', svixId, event.type)` helper keyed on the `svix-id` request header, `email.bounced` (Permanent→suppress, Transient/Undetermined→return) and `email.complained` (always suppress) business branches writing to `email_suppressions` via `ON CONFLICT DO NOTHING`, the `bypassSuppression` carve-out for critical transactional sends, the portability generalization (a new provider is three diff lines), and the state-vs-fact asymmetry explaining why suppressions need dedup but not the `last_event_at` ordering predicate.

**Cut.** Soft-bounce counter implementation and the full escalation-to-`soft_bounce_threshold` policy (named, deferred to ch048 policy). Un-suppression / `manual_unsubscribe` handling named-and-dismissed. Unified single-route multi-provider handler named-and-dismissed (course ships two routes).

**Debts.** Structured logging internals and stale-event alerting → ch092. Background job offload for post-webhook work and `processed_events` retention sweep → ch066. Soft-bounce counter depth / `soft_bounce_threshold` escalation policy → ch048. `bypass_until` time-boxed window mechanism → ch048.

**Terminology.**
- **Svix** — webhooks-as-a-service layer; standardizes signature headers across many SaaS providers; Resend uses it.
- Svix headers: `svix-id` (delivery message id, the dedup key), `svix-timestamp` (tolerance window), `svix-signature` (`v1,<base64 hmac-sha256>`). Signed payload: `` `${svix-id}.${svix-timestamp}.${rawBody}` ``.
- `resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret })` — verification call; reuses the `resend` singleton from `lib/email.ts`; strips the `whsec_` prefix and runs the HMAC internally.
- `RESEND_WEBHOOK_SECRET: z.string().startsWith('whsec_')` — env entry added alongside `RESEND_API_KEY`.
- Dedup key for Resend: the **`svix-id` request header** (not `event.data.email_id`); same logical email emits separate `svix-id`s per event type (bounce, then complaint), so both process.
- `data.bounce.type` — `'Permanent' | 'Transient' | 'Undetermined'`; handler suppresses only on `Permanent`.
- `data.to` — **array** of recipient addresses; iterate even though almost always length 1.
- **FBL** (Feedback Loop) — channel by which a mailbox provider reports a spam complaint back to the sender.
- `normalizeEmail(address)` — lowercase + trim; matches the ch048 unique-on-email constraint.
- **`bypassSuppression: true`** — call-site flag on `sendEmail`; grants delivery to suppressed addresses; privilege not convenience; requires inline justification comment; 3-4 audited call sites max (password reset, email verification, security alerts).
- **State vs. fact asymmetry** — mutable state needs `last_event_at` ordering predicate; append-only facts (suppressions) need only dedup (claim + `ON CONFLICT`).

**Patterns and best practices.**
- Route at `app/api/webhooks/resend/route.ts`; separate from Stripe route; `export const runtime = 'nodejs'`.
- Handler shape: read `rawBody = await request.text()` and `svixId = request.headers.get('svix-id')` once; verify inside `try/catch` → `problem(400, 'invalid_signature')`; `db.transaction` → `claimEvent(tx, 'resend', svixId, event.type)` → switch on `email.bounced` / `email.complained`.
- `onBounced(tx, event, svixId)`: guard `if (event.data.bounce.type !== 'Permanent') return;`; iterate `event.data.to`; call `suppress(tx, { email: normalizeEmail(addr), reason: 'hard_bounce', providerEventId: svixId, metadata: event.data })`.
- `onComplained(tx, event, svixId)`: no type branch; iterate `event.data.to`; call `suppress` with `reason: 'complaint'`.
- `suppress` helper: `tx.insert(emailSuppressions).values(row).onConflictDoNothing({ target: emailSuppressions.email })` — single-column target (suppression table is global, not tenant-scoped; intentional exception to tenant-scoped-unique convention).
- Two dedup layers compose: `processed_events` claim stops the same delivery twice; `ON CONFLICT` on `email_suppressions.email` makes different events for the same address a no-op. Both in the same transaction.
- No external IO (network calls) inside `db.transaction`; `resend.webhooks.verify` is local crypto — allowed.

**Misc.** Chapter outline named the dedup key as `event.data.email_id`; lesson corrects this to `svix-id` header (canonical contract). DrizzleCoding exercise uses sandbox-divergent schema (explicit SQL column names, `text` PK, `text` reason instead of pgEnum, table-level `unique`) due to PGlite limits — noted in lesson as intentional. `ResendWebhookEvent` is a discriminated union on `type`; lesson treats its derivation as plumbing (one line), not lesson focus. The provider-agnostic alternative (`import { Webhook } from 'svix'; new Webhook(secret).verify(...)`) named once; course prefers `resend.webhooks.verify` to avoid extra install.
