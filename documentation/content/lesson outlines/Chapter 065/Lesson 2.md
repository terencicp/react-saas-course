# Chapter 065 — Lesson 2 outline

## Lesson title

Keep **Verify before you parse** — it names the senior rule (order of operations at the trust boundary) better than any restatement.
Sidebar: **Verify before you parse**

## Lesson type

Implementation

## Lesson framing

The student installs the discipline that makes a webhook seam safe: at an untrusted HTTP boundary, you read the raw body once, verify the signature, and only then trust the payload — never the reverse.
They ship the `/api/webhooks/stripe` POST handler's verification skeleton, so a genuine Stripe delivery logs `verified` and answers 200, while a tampered or unsigned request answers 400 `application/problem+json` with no body parsed, no body logged, and no state mutated.
The payoff is the ordering rule itself (verify → parse) and the failure-mode reasoning that comes with it: why 400 not 401, why the body is read exactly once, why nothing attacker-controlled touches a log before verification.

## Codebase state

**Entry.** Starter from lesson 1 is cloned and running: Postgres up, schema migrated and seeded (`plan: 'free'` per org), Stripe test-mode catalog created, `stripe listen` tunnel forwarding to the dev server, inspector live at `/inspector`.
`src/app/api/webhooks/stripe/route.ts` is the lesson-1 starting line — `POST` returns a bare `404` with two TODO markers (`L2` verify, `L3` claim+dispatch). Firing `stripe trigger checkout.session.completed` 404s.
Everything the handler leans on is provided: `stripe` singleton (`lib/billing/stripe.ts`, sole `stripe` importer, `apiVersion` pinned), `problemJson(status, title)` (`lib/problem.ts`, RFC 9457, no body echo), the Pino `logger` (`lib/logger.ts`), `env.STRIPE_WEBHOOK_SECRET` (validated `whsec_` prefix at boot). The inspector's `tamperSignature` and `missingHeader` dev actions already exist and render their 400 response inline.

**Exit.** `route.ts` reads `await request.text()` once, null-checks the `stripe-signature` header, runs `stripe.webhooks.constructEvent`, and returns 400 `invalid_signature` on a `StripeSignatureVerificationError` (re-throwing anything else). On success it logs `verified` with the event id and type and answers 200 — but performs no claim, no dispatch, no DB write (those land lesson 3). The `L2` TODO is cleared; the `L3` TODO remains. `stripe trigger` now returns 200 with no `processed_events` row; the two inspector debug buttons return 400.

## Lesson sections

Implementation type — sections in contract order.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: the webhook endpoint now accepts genuine Stripe deliveries and slams the door on forged ones, before any payload is trusted.
One-paragraph description of it working: a `stripe trigger checkout.session.completed` returns 200 and the structured log carries a single `verified` line keyed by event id and type; the inspector's "Tamper signature" and "Missing header" buttons each return 400 `application/problem+json` with `title: 'invalid_signature'`, rendered inline in the debug panel; the `processed_events` panel stays empty (no business effect yet).
No screenshot needed — the inspector debug panel rendering the inline 400 is the verifiable surface; describe it in prose.

### Your mission

Prose paragraph (no subsection headers, no implementation hints) weaving:
- **Feature.** The webhook route handler's trust boundary — it accepts Stripe-signed deliveries and rejects everything else before reading the payload.
- **The senior rule** front and center: read the raw body exactly once, verify the signature, then trust the payload — order is the whole lesson.
- **Constraints that shape the solution** (state as reasoning, not steps): a bad signature and a missing signature header are the *same* answer; answer 400 not 401 (a 4xx is terminal to Stripe — it stops retrying — and a 401 misleads operators reading the dashboard's failed-delivery panel); never read the body twice (a second consume of the stream returns empty — the canonical chapter 063 bug); never log the body before verify (attacker-controlled strings in a structured log are a log-injection vector); the signature verification primitive does the timestamp parse, HMAC compute, constant-time compare, and 5-minute tolerance for you, throwing one specific error type on failure — any *other* thrown error is a genuine 500, not a 400.
- **Out of scope** (one line): claiming the event, the dispatch switch, and every DB write land in lesson 3; the route answers 200 on a valid event but does no business work.

Then the **Functional requirements** numbered list (the only list in the section), each item an observable outcome tagged `[tested]` / `[untested]`:
1. A valid `stripe trigger checkout.session.completed` returns 200. **[tested]**
2. The inspector's "Tamper signature" debug returns 400 `application/problem+json` with `title: 'invalid_signature'`. **[tested]**
3. A POST with no `stripe-signature` header (inspector "Missing header" or `curl`) returns the same 400 `invalid_signature`. **[tested]**
4. Firing a trigger adds no `processed_events` row — the 200 carries no business effect yet. **[tested]**
5. The structured log records one disposition per request keyed by event id — `verified` on success, `invalid_signature` on a bad signature, `missing_header` on a null header — and no request body is logged before the signature verifies. **[untested]** (log inspection / not asserted by the suite; covered in the solution)

Note for the test-coder: assertions target observable behavior (HTTP status, `content-type`, problem+json `title`, absence of a `processed_events` row), never file paths or function names. The tamper/missing-signature cases are driven through real HTTP POSTs to the route with a forged/absent `stripe-signature` header. A genuinely-signed body can be produced with `stripe.webhooks.generateTestHeaderString` (Stripe SDK test helper) against `env.STRIPE_WEBHOOK_SECRET`, inlined in the test file.

### Coding time

One line directing the student to implement against the brief and the lesson tests, then read the reference solution. Writer wraps the solution in `<details>` (collapsed).

Reference implementation, organized as the repo has it — a single file, `src/app/api/webhooks/stripe/route.ts`. Present the lesson-2 slice only: the `log = logger.child({ seam: 'webhook.stripe' })` scope, the `POST` reading `request.text()` then the header, the null-header `missing_header` → `problemJson(400, 'invalid_signature')` branch, the `try`/`catch` around `constructEvent` with the `instanceof stripe.errors.StripeSignatureVerificationError` discrimination (`invalid_signature` log + 400) and the bare `throw error` for anything else, the `verified` log, and a plain `200` return.
Important: the real solution file already contains the lesson-3 transaction/claim/dispatch block and a `duplicate` flag — present the handler **truncated at the `verified` log**, returning `Response.json({ received: true }, { status: 200 })` for this lesson, and note in one line that lesson 3 wraps everything below the `verified` log in `db.transaction`. Do not show the claim/dispatch code here.

Component choice: use **AnnotatedCode** for `route.ts` — the file has several distinct trust-boundary moves (read-once, null-check, verify/catch discrimination, log dispositions) that each need the student's focus directed at the specific lines. Reach for **CodeVariants** only if the writer wants a tight before/after on the read-once rule (the broken `await request.json()` after `request.text()` vs. the single `request.text()` read) — brief it as the one "broken shape vs. fix" comparison. Keep `problemJson` itself shown with a plain **Code** block (it ships in the starter; show it once for reference, don't re-derive).

Decision rationale to cover (one or two sentences each, all `[untested]`-requirement coverage and senior callouts):
- **400 not 401.** Stripe retries 5xx and treats 4xx as terminal; a 401 also misleads operators reading the dashboard's failed-delivery panel into thinking it's an auth-config problem.
- **Read the body once, parse only after verify.** Show the broken `request.json()`-after-`request.text()` shape that returns empty, and why `constructEvent` needs the raw text (signature is over the exact bytes). The event object the SDK returns *is* the parsed payload — no separate parse step.
- **No body logging before verify.** The structured log on a tampered request must contain no body content — log-injection vector.
- **Missing header == bad signature.** The signature is the contract; a null header gets the identical 400, only the log disposition differs (`missing_header` vs `invalid_signature`).
- **No `runtime` segment export.** Node is the Next 16 default (the Stripe SDK is Node-only, `constructEvent` is synchronous on Node), and with `cacheComponents` enabled Next *rejects* an explicit `runtime` export. Link lesson 1 of chapter 063 for the hand-rolled HMAC path an Edge runtime would otherwise need.
- **5-minute tolerance left at the SDK default.** Tightening it produces false-positive `invalid_signature` errors under clock skew that look exactly like an attack.
- **Logger scoping.** `logger.child({ seam: 'webhook.stripe' })` so 2am debugging filters by seam and event id (chapter 092 discipline, restated not re-taught).

For topics owned by a regular lesson, link rather than re-explain: lesson 1 of chapter 063 for the verification primitives (constant-time compare, HMAC, raw-body rule); chapter 092 for the structured logger.

External resources slot (no header) appended after the `<details>` by the resourcer later.

### Moment of truth

Test command: `pnpm test:lesson 2`.
Expected pass output: the lesson-2 suite green — the valid-trigger 200, the tampered-signature 400 + `invalid_signature` title, the missing-header 400, and the no-`processed_events`-row assertion all passing.
Plus a short by-hand checklist (Checklist component) for the untested requirement: fire `stripe trigger checkout.session.completed` and confirm one `verified` log line keyed by event id/type; click the inspector's "Tamper signature" and "Missing header" buttons and confirm each renders the 400 problem+json inline; confirm the `processed_events` panel stays empty.

## Scope

- **Claiming the event, the `db.transaction` wrapper, the dispatch switch, any DB write** — lesson 3 (Claim the event inside one transaction). The valid-event path answers 200 here with no business effect.
- **The projection, the three handlers, the `plan_entitlements` columns, audit logs, the ordering predicate** — lesson 4.
- **The metadata cross-check / forged-tenancy hardening** — lesson 6.
- **The verification primitives themselves** (HMAC, constant-time compare, raw-body rule) — taught in lesson 1 of chapter 063; this lesson applies them, linking not re-explaining.
- **The structured logger internals** — chapter 092; used here, not taught.
