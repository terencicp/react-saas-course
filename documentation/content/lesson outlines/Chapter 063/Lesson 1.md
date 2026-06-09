# Lesson 1 — Verify before parse

- Title: `Verify before parse`
- Sidebar label: `Verify before parse`

---

## Lesson framing

This is the chapter's foundation lesson: it establishes the webhook route handler as a **trust boundary** and lands the single rule every later lesson assumes — verify the signature on the raw body before doing anything else. The whole lesson hangs off one senior question: a public POST at `/api/webhooks/stripe` accepts unauthenticated internet traffic, so what lets the handler trust the payload is Stripe-sent?

Pedagogical spine (minimize cognitive load by staging):
1. **Motivate with the threat first.** Before any crypto, show the forged-webhook attack (post `checkout.session.completed`, get a free entitlement). The student must feel the stakes before learning the mechanism. This is the "pain the tech relieves."
2. **Open the box, then close it.** The chapter's stated policy is to use the SDK helper (`stripe.webhooks.constructEvent`) in production but hand-roll the HMAC **once** so the student knows what's inside. This is the lesson's defining structure: build the mechanism by hand to earn understanding, then reveal the one-liner that replaces it and adopt it as the real shape. Do not invert this order — the hand-rolled version is the teaching device, the SDK is the answer.
3. **The raw-body rule is the load-bearing gotcha.** Most real "works locally, fails in prod" webhook bugs are body-mangling. Give it dedicated weight: `await request.text()` once, HMAC the exact bytes, `JSON.parse` only after the signature passes.
4. **Land the handler shape last.** Once verify + raw-body + tolerance + constant-time are understood in isolation, assemble the canonical `POST` skeleton (verify → 400-on-failure → continue), which the next four lessons extend.

Mental model the student leaves with: *the route handler is a door with a lock; the webhook secret is the key; the signature is proof the caller holds the key; you check the proof against the exact bytes on the wire before you let the payload through; a failed check is a 400 and silence — no body work, no logging of untrusted input.* The senior framing throughout: treat the webhook secret like a session secret, and the HMAC is the only proof that matters (IP allowlists behind a CDN are theater).

What the student can do by the end: wire the Stripe SDK singleton, add the two env entries, write a verifying `POST` handler that returns RFC 9457 problem+json on failure, run the local `stripe listen` / `stripe trigger` loop, and explain why each defense (raw body, tolerance, constant-time, 400-not-401) exists.

Prereqs to lean on (restate in one line, never re-teach): Web Crypto HMAC + constant-time compare (ch016 L1), route handler file shape + RFC 9457 error contract (ch046), `env.ts` with `@t3-oss/env-nextjs` + Zod (code conventions). These are *closed loops* — the lesson names where the student already met them and lands them in production code.

This lesson is verification-only. The dedup ledger, the transaction, out-of-order handling, and the business work are explicitly the next lessons' jobs; the handler here ends at "signature passed, now hand off." Keep that boundary sharp.

---

## Lesson sections

### Introduction — the unlocked door

Open with the concrete scene, no preamble. We are about to accept Stripe's webhooks at `/api/webhooks/stripe`. This URL is public and unauthenticated — there is no session cookie, no bearer token, anyone on the internet can POST to it. State the senior question plainly: what is the trust contract that lets the rest of the handler treat the body as Stripe-sent? Preview the answer in one sentence (signature verification on the raw body, first and only thing before business logic) and the practical deliverable (a verifying handler + the local dev loop). Keep it warm and short. Name what this lesson deliberately stops at: once the signature passes, handing the event to the dedup/transaction machinery is the next lesson.

### What a forged webhook would buy an attacker

The threat model, made visceral. Walk the attack concretely: an attacker reads Stripe's public docs, hand-writes a `checkout.session.completed` JSON, and POSTs it to the endpoint. If the handler parses and trusts it, the attacker just granted themselves a paid entitlement for free — or flipped someone else's subscription, or triggered a fulfillment. The point lands: an unverified public webhook is a self-service entitlement grant.

Then state the defense at a high level (mechanism comes later): Stripe signs every webhook with a secret only Stripe and you share; the signature makes the request *only-Stripe-could-have-sent*. The senior anchor: **the webhook secret is the trust root — treat it like a session secret.** If it leaks, forgery is back on the table; it lives in `env.ts`, never in client code, never logged.

Use a small **Figure with an `ArrowDiagram`** (or plain HTML boxes) contrasting two flows side by side: top row "no verification" — `Attacker → POST forged JSON → handler trusts → free entitlement` (red); bottom row "with verification" — `Stripe → POST signed → verify → process` / `Attacker → POST forged → verify fails → 400` (green). Pedagogical goal: one glance fixes *why* before *how*.

`Term` candidates here: **trust boundary**, **webhook** (one-line: an HTTP callback a third party POSTs to your app when something happens on their side).

### The Stripe signature scheme

Now the mechanism, built up gradually. Three pieces, introduced one at a time:

1. **The header.** Stripe sends a `Stripe-Signature` header shaped `t=1700000000,v1=<hexdigest>` (note there may be multiple `v1` values during secret rotation, and a legacy `v0` exists — mention briefly, don't dwell). Parse it into the timestamp `t` and the `v1` digest(s).
2. **The signed payload.** The string that was signed is the literal concatenation `` `${t}.${rawBody}` `` — the timestamp, a dot, and the *exact raw request body bytes*. Flag now (full treatment next section) that "exact bytes" is the whole game.
3. **The verification.** Compute `HMAC-SHA-256` over that signed-payload string, keyed by the webhook secret, and constant-time-compare your hex digest against the `v1` value. Match → authentic. No match → forged or misconfigured.

This is where the Web Crypto thread from ch016 L1 closes. Restate in one line that HMAC is a keyed hash — same input + same key → same digest, and you can't forge the digest without the key — then point at the call surface: `crypto.subtle.importKey` → `crypto.subtle.sign('HMAC', ...)`, and a constant-time compare. One line: "you met these primitives in [ch016 L1]; here they earn their keep."

Use **AnnotatedCode** for the hand-rolled `verifyStripeSignature(rawBody, sigHeader, secret)` helper (the "open the box" moment). Steps walk: (1) parse `t` and `v1` from the header; (2) reject if header missing/malformed; (3) build the `` `${t}.${rawBody}` `` signed payload; (4) `importKey` the secret as an HMAC key; (5) `sign` to get the digest; (6) constant-time compare against `v1`; (7) check the timestamp tolerance. Keep each step's prose ≤6 lines. Color the signed-payload-construction step distinctly — it's the one students get wrong. Note for the writer: because `crypto.subtle` is async, this helper is `async` and uses a constant-time compare over the digest buffers (Web Crypto has no `timingSafeEqual`; either compare via a length-checked XOR loop or, if the handler commits to Node runtime, `crypto.timingSafeEqual` from `node:crypto`). State this runtime nuance explicitly so the SDK section can resolve it. This is a deliberate teaching shape — flag it so downstream agents don't "simplify" away the constant-time compare.

`Term` candidates: **HMAC** (hash-based message authentication code — a keyed hash proving both integrity and authenticity), **digest**.

### The raw body is sacred

The lesson's most important practical rule, given its own section. The failure mode first (wrong-then-right): a tempting handler does `const event = await request.json()`, then re-stringifies to verify. This breaks because `JSON.stringify` does **not** reproduce the original bytes — whitespace, key order, and number formatting all differ — so the recomputed HMAC no longer matches the `v1` Stripe signed over the original bytes. Verification fails on legitimate events, or worse, a sloppy fix disables verification to "make it work."

The fix, stated as the senior pattern: read the body **once** as text, verify against those exact bytes, parse **after** the signature passes.

```
const rawBody = await request.text();
// verify(rawBody, signature, secret)  ← exact bytes
const event = JSON.parse(rawBody);     // only after verify passes
```

Two named hazards in this section:
- **Reading the body twice.** The request body is a one-shot stream. Calling `request.json()` (or a second `request.text()`) after the first read returns empty — the bytes are gone. Read once, hold the string, reuse it.
- **Double-stringify is the canonical "but it works locally" bug.** Locally the synthetic payload may round-trip by luck; in production with real Stripe bytes it diverges. The raw bytes on the wire are the single source of truth.

Use **CodeVariants** (before/after) with `del`/`ins` marks: tab "Broken — parse then re-stringify" vs tab "Correct — text once, parse later." Prose ≤6 lines each. This A/B is the highest-leverage visual in the lesson.

`Term` candidate: **idempotent read / one-shot stream** (optional — the request body can only be consumed once).

### The replay window: timestamp tolerance

Why the `t` in the signature exists. Without a freshness check, a *valid* signature captured off the wire (proxy logs, a leaked request) is replayable forever — the attacker resends the exact bytes and signature and the HMAC still matches. The timestamp closes that window: the handler rejects any event where `|now − t| > 300s` (Stripe's default 5-minute tolerance). A captured signature is only useful for 5 minutes.

State the trade-off explicitly (defaults-with-a-reason): tighter tolerance is safer but breaks under clock skew between your server and Stripe; looser is forgiving but enlarges the replay window. 5 minutes is the canonical balance — name it, don't invent a different number.

Small inline note: this check is *inside* `constructEvent` and inside the hand-rolled helper's final step. It is not optional — a hand-rolled verify that skips it has a forever-replay hole.

### `constructEvent`: the box, closed

Now reveal the SDK one-liner that does everything the hand-rolled helper did. `stripe.webhooks.constructEvent(rawBody, signature, secret)` performs the header parse, HMAC compute, constant-time compare, and tolerance check in one call, throwing `Stripe.errors.StripeSignatureVerificationError` on any failure and returning the typed `Stripe.Event` on success.

The framing: the hand-rolled version was to understand the mechanism; **production code uses the SDK helper.** State the chapter policy here so it's anchored once — SDK helper for Stripe (here) and Svix for Resend ([ch063 L5]); hand-rolled HMAC exactly once (this lesson).

Runtime nuance worth one line (verified current): `constructEvent` is synchronous and is the standard for the Node runtime; Stripe also ships `constructEventAsync` for environments whose crypto is async (Edge/Web Crypto). The course runs this handler on the Node runtime, so `constructEvent` is the call.

**Stripe SDK singleton wiring** (subsection or inline `Steps`):
- `pnpm add stripe`.
- Create `src/lib/stripe.ts` exporting one shared client: `export const stripe = new Stripe(env.STRIPE_SECRET_KEY)`. Every call site imports this singleton — no per-request `new Stripe(...)`. The senior reason: one configured client, one place to set the API version, no duplicated config drift. Note the deeper SDK surface is owned by [ch064 L1]; here it exists only to expose `webhooks.constructEvent`.
- Add both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `env.ts` (server vars, Zod-validated, fail the build if missing). One line restating the `@t3-oss/env-nextjs` discipline; don't re-teach env.

Use **Code** (simple block) for `src/lib/stripe.ts` and the `env.ts` additions — they're short and not focus-split.

### The canonical handler shape

Assemble everything into the reference `POST` for `app/api/webhooks/stripe/route.ts`. This skeleton is the chapter's backbone — every later lesson extends it. Build it as the verify-first, return-early shape:

1. `const rawBody = await request.text()` — raw bytes, once.
2. `const signature = request.headers.get('stripe-signature')` — and treat **null as a verification failure** (no "benefit of the doubt" branch; null means not-from-Stripe or misconfigured → same 400).
3. `try { event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET) }`.
4. `catch` → return `400` with RFC 9457 problem+json, title `"invalid_signature"`, **no body echo, no detail leakage, no logging of the raw body**.
5. On success → continue to dedup/transact (pointer to [ch063 L2]); for this lesson the success path can be a `// hand off to dedup + business logic` marker returning `200`.

Use **AnnotatedCode** for the full handler so the writer can spotlight each decision (the raw-body read, the null-header guard, the try/catch boundary, the problem+json return). Pair it with the error-as-refusal convention from code standards: a thrown error inside the verify gate defaults to deny (the `catch` *is* the deny). One line.

Three sub-points to fold in here (each at the moment its code line appears, not bundled):

- **400, not 401 — the retry semantics.** A signature failure is a *malformed proof* (bad request), not *missing identity* (unauthorized). The deeper reason is operational: third parties retry on 5xx and treat 4xx as terminal. A 401 invites retry storms from a misconfigured sender; a 400 cleanly says "stop sending this." The course uses 400 for all signature failures uniformly. State the rule.
- **RFC 9457 problem+json body.** Restate the ch046 contract in one line: `Content-Type: application/problem+json`, body `{ type, title, status, instance }`. Don't re-teach; show the exact failure response and move on. Emphasize: the error body carries *nothing user-controlled* — no echo of the payload, no internal detail.
- **The Node runtime reach.** Add `export const runtime = 'nodejs'` and name why (verified: Node is already the App Router default in Next.js 16, so this is an explicit-for-clarity declaration, not a flip). The honest framing: Edge's Web Crypto handles HMAC verify fine, so either runtime is defensible; the course picks Node because the Stripe SDK and `constructEvent` are most ergonomic there. State the choice and its one consequence (Node APIs available, slightly cold-start-ier than Edge). Don't overweight — one short paragraph.

`Term` candidates: **RFC 9457** (the Problem Details for HTTP APIs spec — the standard JSON error shape), **route handler** (one-liner if not already familiar from ch046).

### The local development loop

The daily iteration mechanism, so the student can actually run what they built. Stripe events don't reach `localhost` on their own — the Stripe CLI bridges them:

- `stripe listen --forward-to localhost:3000/api/webhooks/stripe` opens a tunnel from Stripe to your local handler and **prints a local webhook signing secret** (`whsec_...`) to paste into `STRIPE_WEBHOOK_SECRET` for local dev.
- `stripe trigger checkout.session.completed` fires a synthetic event through that tunnel so you can exercise the handler without a real checkout.

The load-bearing detail (and a watch-out): **the local signing secret printed by `stripe listen` is different from the production secret configured in the Stripe Dashboard.** Using the test-mode/local secret in production (or vice versa) silently fails every event with a 400 — the HMAC never matches. This is the most common "all my webhooks are failing" cause. Tie it back to the per-environment env discipline: one `STRIPE_WEBHOOK_SECRET` value per environment.

Use **Code** (bash) blocks for the two commands. Optionally a one-line `ExternalResource`/`LinkCard` to the Stripe CLI docs.

`Term` candidate: **`whsec_`** (the prefix Stripe/Svix webhook signing secrets carry).

### Secret rotation without downtime

Brief, named-not-drilled — but it's a real senior concern and follows naturally from "the secret is the trust root." Stripe lets multiple signing secrets be active during a rotation window. Since `constructEvent` verifies against one secret, the senior pattern is to keep two env entries during the window and `try { constructEvent(body, sig, NEW) } catch { constructEvent(body, sig, OLD) }`, retiring the old once traffic has cut over. The takeaway: rotation is a planned, zero-downtime operation, not an outage. Keep to a short paragraph; optionally a small **Code** snippet of the try/catch fallback.

### Check your understanding

Two complementary exercises, placed here so the student consolidates before moving on.

1. **`Sequence` (ordering drill)** — fix a code block of the handler steps above the draggable rows, then have the student order the correct boundary sequence: read raw body once → read `stripe-signature` header → `constructEvent` (verify) → on failure return 400 problem+json → parse JSON → hand off to business logic. Goal: cement *verify before parse before process* as a temporal invariant. The shuffle plus the "parse JSON" step sitting after verify makes the ordering meaningful.

2. **`MultipleChoice` (or `TrueFalse` round)** — target the high-value misconceptions: (a) signature failure should return 400, not 401 [why: 4xx is terminal to senders, 401 invites retries]; (b) you must verify the raw text body, not the re-stringified parsed JSON; (c) a missing `stripe-signature` header is a verification failure, not a pass; (d) the timestamp tolerance exists to stop replay of captured-but-valid signatures. Each with a one-line rationale on reveal.

Note for the writer: a hands-on `ScriptCoding` to implement the HMAC verify is tempting but not worth it here — the vanilla runner can't do the Stripe SDK or `node:crypto`, and the Web Crypto async/constant-time subtleties make a graded sandbox fragile. The `Sequence` + `MultipleChoice` pair checks the *decisions*, which is what this lesson is about. If a coding interaction is desired, prefer a small `Sequence` over a sandbox per the guidelines.

---

## Scope

**This lesson covers:** the route-handler trust boundary; the forged-webhook threat model; the Stripe `t=/v1=` signature scheme; HMAC-SHA-256 over `` `${t}.${rawBody}` ``; the raw-body-once rule and the re-stringify bug; constant-time comparison (restated, landed in code); the 5-minute timestamp tolerance; `stripe.webhooks.constructEvent` and the `stripe.ts` singleton + env wiring; the canonical verify-first `POST` handler returning 400 problem+json on failure; 400-vs-401; the Node runtime choice; null-header handling; the `stripe listen` / `stripe trigger` local loop; and webhook-secret rotation (named).

**Out of scope — do not teach (redefine prereqs in one line only):**
- The `processed_events` dedup ledger, `INSERT ... ON CONFLICT DO NOTHING RETURNING`, and the outer transaction — [ch063 L2]. End this lesson at "signature passed, hand off."
- Out-of-order delivery, `event.created` + `last_event_at`, the redirect-vs-webhook race — [ch063 L3].
- Idempotency generalized to Server Actions / jobs / `Idempotency-Key` header — [ch063 L4].
- Resend/Svix verification and `email_suppressions` — [ch063 L5].
- The full Stripe object graph, event-type catalog, and what the business logic does — [ch064] and the project.
- Web Crypto fundamentals (HMAC mechanics, `subtle.sign`, why constant-time) — taught in [ch016 L1]; restated in one line only.
- Route-handler file shape, Zod wire-contract parsing, and the RFC 9457 error contract — taught in [ch046]; restated in one line only.
- `env.ts` / `@t3-oss/env-nextjs` mechanics — established in code conventions; restated in one line only.
- The `email_suppressions` schema — [ch048 L4].

---

## Notes for downstream agents (deliberate divergences)

- The hand-rolled HMAC helper is a **teaching device**, intentionally written before the SDK reveal. Do not delete it or move the SDK before it. Do not "simplify" away the constant-time compare or the tolerance check — those are the point.
- Because the hand-rolled path uses Web Crypto (`crypto.subtle`, async), it correctly diverges from a synchronous `node:crypto` shape; state the runtime nuance rather than papering over it. The production handler uses the synchronous `constructEvent` on the Node runtime.
- Keep the success path a stub (`// hand off → dedup` ) — resist writing any dedup/transaction code; that's [ch063 L2] and writing it here creates cross-lesson contract drift.
- Cross-references use the course's lesson-link convention (resolve `[ch063 L2]` etc. to real slugs); avoid triple-dash artifacts in slugs.
