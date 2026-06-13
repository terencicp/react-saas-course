# Lesson title

- Title: `Webhook receivers under test`
- Sidebar label: `Webhook receivers under test`

# Lesson framing

This is the chapter's longest lesson and its first **inbound-boundary** integration test. Every prior lesson tested code the student calls (`createInvoice`, `createSubscription`); here the third party calls *us*. The student integration-tests the Stripe webhook receiver they already shipped in chapters 063/065 — calling the exported `POST` with a real signed `Request`, against the real test Postgres, asserting both the HTTP `Response` and the committed (or skipped) DB state.

**The one idea the student must leave with:** a webhook receiver is a multi-step trust boundary (verify → claim → mutate, all over raw bytes), and an integration test must drive the *whole* boundary the way Stripe drives it — a real signed payload through the exported handler — because every step has a distinct production failure mode and a function-level mock catches none of them. The test produces an authentic signature with Stripe's own `generateTestHeaderString`, never a hand-rolled HMAC.

**This lesson composes the whole chapter so far, applied to one seam:**
- `withRollback` + threaded `tx` (lesson 1) — but the route handler can't take a `db` param, so this is where the **AsyncLocalStorage escape hatch** (`getDb()`, established as the route-handler reach in lesson 1 + chapter framing) finally gets *applied*. This is the lesson's one genuinely new mechanism.
- Real per-worker DB + `processed_events` schema (lesson 2) — the dedupe table is a real table, asserted against inside `tx`.
- The clock seam from chapter 087 lesson 3 — controls the signature timestamp for the tolerance test.
- No MSW here. This is *inbound*; lessons 4-5 were *outbound*. Make the distinction explicit early so the student doesn't reach for `server.use`.

**Pedagogical spine — establish the seam shape, then walk the path matrix:**
1. *The receiver is a four-step boundary* — recall the production handler shape (verify, claim, dispatch, respond) from chapters 063/065 as the thing under test, and name the four failure modes that motivate testing it end-to-end rather than per-function. Motivation beat.
2. *Two new mechanics, then reuse* — (a) producing an authentic signature with `generateTestHeaderString`; (b) reaching the route's `tx` via the ALS escape hatch because `POST(request)` has a fixed signature. Both are short; everything else is the lesson-1-5 toolkit applied.
3. *The path matrix* — the heart of the lesson. Six paths, each a `describe`/`it`: valid happy path, invalid signature, expired timestamp, idempotent replay, malformed payload, unhandled event type. Each path = one production bug it catches + one assertion shape (Response + DB state). This is where the student internalizes "test the boundary, not the function."
4. *Portability* — the same shape transfers to any signed webhook (Resend/Svix), with the signing primitive swapped.

**Framing stance:** decisions before syntax, adult and terse. The student has written ~5 integration tests by now and shipped this exact receiver. Lead each path with the production incident it prevents ("a body parser ran before the verifier", "Stripe redelivered and we double-charged"), then the test that catches it. The stakes are real money — frame them that way.

**Cognitive-load management:** the receiver is already familiar (built in 063/065), so spend zero budget re-teaching *how it works* — recall it in one diagram and move straight to *how to test it*. The genuinely new load is (a) `generateTestHeaderString` and (b) the ALS wiring; isolate those two before the path matrix so the matrix is pure application. Within the matrix, the valid path is taught in full; the other five reuse its skeleton and vary one thing each — present them as deltas, not fresh tests.

**Critical code-shape correction for downstream agents:** the chapter outline proposes a hand-rolled `src/test/fixtures/stripe/sign.ts` that re-implements the `t=...,v1=hmac` header. **Do not teach this.** Stripe's SDK ships `stripe.webhooks.generateTestHeaderString({ payload, secret })` for exactly this purpose, and the project's own chapters 065 lesson 2/3 tests already use it. Hand-rolling the HMAC in test fixtures repeats the crypto the course spent chapter 063 lesson 1 telling students never to reimplement, and it would drift from Stripe's scheme. Use `generateTestHeaderString` as the single signing primitive. (The hand-rolled HMAC from 063 lesson 1 was a one-time teaching device; it is not the test tool.) An event *factory* layered on a captured JSON fixture is still correct — that parameterizes the payload; signing the payload is the SDK's job.

**Grounded contract (do not redrive — read from production):**
- Handler: `export const POST = async (request: Request): Promise<Response>` in `src/app/api/webhooks/stripe/route.ts`.
- Verify: `stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)`; catch `stripe.errors.StripeSignatureVerificationError` → `problemJson(400, 'invalid_signature')`; rethrow anything else (it's a 500).
- Post-verify body runs inside `db.transaction(async (tx) => ...)`: `claimEvent(tx, 'stripe', event.id, event.type)` returns `boolean` (true = freshly claimed); on `false` set `duplicate = true`, log `duplicate`, return early; on `true` log `claimed`, `await dispatch(tx, event)`.
- Response on success: `Response.json({ received: true, duplicate }, { status: 200 })`.
- `processedEvents` table (SQL `processed_events`): `id` bigint identity PK, `provider` text, `eventId` text, `eventType` text, `receivedAt` timestamptz; `unique(provider, eventId)`.
- `dispatch` switches over `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; `default` logs `unhandled`, returns clean (→ 200).
- No `export const runtime` (Cache Components rejects it; Node is the default).
- Running example domain stays Stripe billing / `processed_events`, consistent with the chapter.

# Lesson sections

## The receiver is a four-step trust boundary

**Goal:** install the senior question and frame the receiver (already built) as the thing under test. Motivation beat — no test code yet.

**Content:**
- Open with the senior question: the student shipped `app/api/webhooks/stripe/route.ts` two units ago. It does four things in strict order — verify the signature on raw bytes, parse, claim against `processed_events`, run the side effect in a transaction. It is the single most security- and money-critical route in the app, it is publicly reachable, and it has zero session auth. How do you prove it's correct *before* Stripe sends a real `checkout.session.completed` in production?
- The answer framing: a unit test of any one inner function proves that function; it cannot prove the *boundary*, because the boundary's correctness lives in the seams between the steps and in the bytes crossing the wire. Reach: drive the exported `POST` with a real signed `Request` against the real test DB — the same way Stripe drives it, minus the network hop.
- Enumerate the four failure modes, each as a one-line production incident (this is the payload that motivates the path matrix): (1) a body parser runs before the verifier → signatures fail in prod, green locally; (2) the verifier is bypassed/misconfigured → forged "give me pro" event accepted; (3) Stripe redelivers (at-least-once is the contract) → side effect runs twice, customer double-provisioned; (4) the dedupe insert and the side effect don't share one transaction → permanent partial state. Each maps to a path later in the lesson.
- State the inbound/outbound distinction sharply: lessons 4-5 mocked *outbound* HTTP (we call Stripe) with MSW. This is *inbound* (Stripe calls us). There is no MSW here — the "network" is a `Request` object the test constructs by hand. The mock surface from the last two lessons does not apply.

**Components:** A `DiagramSequence` recalling the production handler as a four-step pipeline (Verify raw body → Claim in `processed_events` → Dispatch side effect → Respond), highlighting one step per panel with its failure mode in the caption. Pedagogical goal: refresh the already-built handler's shape *and* pre-load the four bugs the path matrix will catch, in one scrubbable visual, without re-teaching the implementation. Keep panels lean — the student built this; this is recall, not instruction. Mermaid `flowchart LR` inside a `<Figure>` is an acceptable alternative if the sequence feels heavy, but the per-step failure-mode caption is the value, so `DiagramSequence` is preferred.

**Tooltips (`Term`):** `at-least-once delivery` (Stripe guarantees each event arrives one *or more* times, never zero — duplicates are the contract, not an anomaly), `raw body` (the exact bytes off the wire, before any parse — the signature covers these and only these), `trust boundary` (re-use the 063 definition concisely: the line where untrusted input meets trusted code).

## Signing a payload the way Stripe does

**Goal:** give the student the one signing primitive the whole lesson depends on, and kill the hand-rolled-HMAC instinct.

**Content:**
- The problem: to test the *valid* path, the test must hand the handler a payload that `constructEvent` accepts — i.e. a real `Stripe-Signature` header (`t=...,v1=<hmac>`) computed with the same `STRIPE_WEBHOOK_SECRET` the handler verifies against. The temptation is to recompute the HMAC by hand (the student saw exactly how in chapter 063 lesson 1).
- The decision, stated plainly: **don't.** The 063 hand-rolled HMAC was a teaching device for *understanding* the scheme; it is the wrong tool for *signing test fixtures*. Re-implementing it in tests re-introduces the crypto the course told you to trust the library for, and any drift from Stripe's exact scheme (header format, tolerance, encoding) ships false-negative tests. Stripe ships the tool for this: `stripe.webhooks.generateTestHeaderString({ payload, secret })` returns a header string that `constructEvent` verifies, because it is the exact inverse of `constructEvent`. Mock the contract you don't own at its *published* test seam, not by re-deriving its internals — the same seam-depth instinct from lessons 3-4.
- Show the canonical pairing: `generateTestHeaderString` produces the header, `constructEvent` (inside the handler) consumes it; both keyed by the same test secret from `.env.test`. The secret matching is load-bearing — a mismatched secret is the #1 "all webhooks 400" bug, and the test must fail-fast if `STRIPE_WEBHOOK_SECRET` is missing.
- The event factory layered on a captured fixture: a real `checkout.session.completed` JSON (captured once from `stripe trigger` or the dashboard, stored at `src/test/fixtures/stripe/checkout-session-completed.json`) is the spine; a `buildStripeEvent({ type, data })` factory parameterizes the variant fields (the event `type`, the inner object) per test. The factory makes the *payload*; `generateTestHeaderString` signs whatever payload the factory produced. Note the factory must regenerate `event.id` per call (a fresh `evt_...`) so replay tests can control identity deliberately — reusing one id across tests is aliasing.
- Tie the timestamp to the clock seam: `generateTestHeaderString` accepts a `timestamp` option (seconds). Default uses now; the expired-path test passes a timestamp 10 minutes in the past. The frozen clock from chapter 087 lesson 3 keeps "now" deterministic so the tolerance test isn't racing wall-clock.

**Components:**
- `AnnotatedCode` walking the sign-and-call helper once: build payload via factory → `JSON.stringify` it → `generateTestHeaderString({ payload, secret, timestamp })` → construct `new Request(url, { method: 'POST', headers: { 'stripe-signature': header }, body: payload })`. Highlight (a) the *same string* is both signed and sent as the body — the raw-body invariant the handler depends on; (b) the secret comes from `.env.test`; (c) the optional `timestamp`. Color the raw-body line distinctly — it's the trap from 063 restated from the test side: sign the bytes you send, send the bytes you sign.
- A short `Aside` (caution) on the secret-mismatch failure mode: local CLI secret vs. dashboard secret vs. `.env.test` secret are three different `whsec_` strings; the test uses the `.env.test` one, and `generateTestHeaderString` + `constructEvent` must read the *same* value or every test 400s with a symptom that looks like a broken verifier.

**Tooltips (`Term`):** `generateTestHeaderString` (Stripe SDK helper that builds a valid `Stripe-Signature` header for a payload + secret — the inverse of `constructEvent`, intended for tests), `false negative` (re-use chapter context: a green test over broken code — here, a signing helper that drifts from Stripe's scheme).

## Reaching the handler's transaction through AsyncLocalStorage

**Goal:** solve the one structural problem unique to route-handler testing — you can't pass `tx` into a fixed `POST(request)` signature — and apply the ALS escape hatch lesson 1 reserved for exactly this.

**Content:**
- The problem, stated as the seam tension: every integration test so far threaded `tx` by *passing it* — `createInvoice(input, { db: tx })`. The route handler can't accept it: its signature is `POST(request: Request)`, fixed by Next.js. Inside, it calls `db.transaction` on the imported singleton `db`. If the test can't substitute `tx`, the handler's writes commit for real and rollback-per-test is defeated for this one seam.
- Recall the lesson-1 resolution without re-teaching it: production route handlers don't import `db` directly — they call `getDb()`, which returns `als.getStore() ?? defaultDb` (the `AsyncLocalStorage<DbOrTx>` in `src/db/test-tx-context.ts`). In production the store is empty, so `getDb()` is the real singleton. In a test, the test runs the handler *inside* `als.run(tx, () => POST(request))`, so every `getDb()` call inside the handler — and inside `claimEvent`, `dispatch`, and the side effects — returns the test's `tx`. One context entry, threaded implicitly through the whole call tree, rolled back by `withRollback`.
- Name why this is the *contained* escape hatch, not the default: explicit handles win everywhere the signature is controllable (cheaper to read, visible at the call site); ALS pays a small complexity tax that's only justified when the framework fixes the signature. Route handlers and webhook receivers are exactly that case. This keeps the student from reaching for ALS in Server Action tests (lesson 7), where the explicit handle is correct.
- The test-side wrapper: a small helper — `callWebhook(request, tx)` or the `withRollback` body wrapping `als.run(tx, () => POST(request))` — so each path test is one line to invoke the handler under the right context. Show that the production handler code is **unchanged**; the test reaches in through the seam production already exposes, never by mocking `db`.

**Components:**
- `DiagramSequence` or `ArrowDiagram` (inside `<Figure>`, `expandable={false}` if `ArrowDiagram`): show the call tree once — test calls `als.run(tx, () => POST(req))`; inside, `POST` → `getDb()` → returns `tx` (not `defaultDb`) because the store is populated → `db.transaction` runs on `tx` → `claimEvent`/`dispatch` all ride `tx` → `withRollback` rolls it back. Pedagogical goal: make the *implicit* threading visible, because "where did `tx` go?" is the exact confusion ALS creates for someone used to explicit passing. Two states (production: store empty → `defaultDb`; test: store = `tx`) shown side by side makes the `?? defaultDb` fallback click.
- `CodeVariants` contrasting the wrong reach (test does `vi.mock('@/db/client')` to swap `db` → defeats integration, proves nothing about real SQL) vs. the right reach (`als.run(tx, ...)` → real handler, real SQL, rolled back). First sentence of the wrong pane: *mocks the database the whole chapter exists to avoid mocking*.

**Tooltips (`Term`):** `AsyncLocalStorage` (Node API that carries a value implicitly through an async call tree without passing it as an argument — like a per-request global that's actually scoped to one logical execution), `escape hatch` (a deliberately-narrow exception to a default rule, used only where the default can't apply).

## The six paths a webhook test must cover

**Goal:** the heart of the lesson. Walk the valid path in full, then the five variants as deltas. Each path = the production bug it catches + the Response assertion + the DB-state assertion. This is where the student learns to test a boundary instead of a function.

This section has one h3 per path. Teach the **valid** path completely (it establishes the AAA skeleton every other path reuses); present the other five as "change one thing, assert one thing."

**Shared skeleton (state once before the h3s):** every path is `it('<outcome> when <condition>', withRollback(async ({ tx }) => { ... }))`. Arrange: build + sign a payload, construct the `Request`. Act: `await als.run(tx, () => POST(request))` → `Response`. Assert: (a) `response.status` and parsed `response.json()`; (b) DB state via `tx.select(...).from(processedEvents)` / the side-effect table. Two assertion axes — the HTTP contract Stripe sees, and the persisted truth — and most paths assert on both.

### The valid event commits exactly one side effect

- The production win: a genuine, correctly-signed `checkout.session.completed` is verified, claimed, dispatched, and persisted.
- Arrange: `buildStripeEvent({ type: 'checkout.session.completed', data: {...} })`, sign with the `.env.test` secret at current (frozen) time. Act: call through ALS. Assert: `status === 200`, body `{ received: true, duplicate: false }`; **and** exactly one `processed_events` row with the event's `eventId`/`eventType`, **and** the dispatched side effect (the entitlement/subscription row, or whatever the handler writes) present in `tx`.
- Teaching note: assert on *shape*, never on the auto-increment `id` of `processed_events` (sequences advance and don't roll back — the lesson-1 rule). Match `eventId` (the Stripe `evt_...`), which the test controls.
- This is the full `AnnotatedCode` of the lesson — the one test written end-to-end, every line annotated (factory, sign, Request, `als.run`, status assert, body assert, DB assert). Every later path references "the same skeleton".

### A forged signature is refused and writes nothing

- The production win: an attacker (or a misconfigured sender) posts a body Stripe never signed; the handler must reject before any business logic.
- Delta: sign with a *different* secret (or tamper one byte of the header). Assert: `status === 400`, body `title: 'invalid_signature'` (`application/problem+json`); **and** zero `processed_events` rows, zero side effects — the table is untouched. The "writes nothing" assertion is the one that actually proves verify-before-everything; a 400 alone doesn't prove the side effect was skipped.
- Note: assert the response body carries no echo of the payload (063's no-reflection rule) — optional but a good senior reflex to verify.

### A stale-but-authentic event is rejected on the tolerance window

- The production win: an attacker replays a *genuinely-signed* request captured from a log. The signature is real; only freshness stops it.
- Delta: sign with `generateTestHeaderString({ ..., timestamp: now - 600 })` (10 minutes past) under the frozen clock. Assert: `status === 400` (`constructEvent` throws on >300s skew), zero side effects. Contrast with a within-tolerance timestamp asserting 200, so the student sees the boundary is the 5-minute window, not "old = bad".
- Teaching note: this is *why* the clock seam matters — without frozen time, "10 minutes ago" drifts and the test flakes. Pair the timestamp option with the fixed clock explicitly. Forward-points to lesson 8's "real clock" flake taxon.

### A replayed event is deduped to a single side effect

- The production win: Stripe's at-least-once delivery sends the same `event.id` twice; the side effect must run once.
- Delta (this path acts *twice* in one test): sign one payload, call the handler → assert 200 `{ duplicate: false }` and one row + one side effect. Call the **same** signed payload again → assert 200 `{ duplicate: true }` and **still one row, still one side effect**. The second call short-circuits at `claimEvent` returning false.
- Teaching note: the subtle correctness this proves is that the claim insert and the side effect share *one* `tx` per delivery — re-emphasize that a duplicate is a 200 success (not 4xx/5xx), because a 4xx tells Stripe to stop retrying a real event and a 5xx tells it to retry one already handled. Both wrong. This is the path that most directly exercises the `processed_events` ledger the student built.
- Optional `Sequence` exercise: order the events of the replay test (sign once → call → assert one row → call same payload → assert still one row → assert duplicate:true) to lock in the "act twice, count once" shape.

### A malformed payload is rejected after the signature passes

- The production win: a body that is correctly signed but fails the handler's downstream parse (e.g. Zod on the event shape, or a missing `data.object`) — Stripe won't retry a valid signature with a malformed body, so the handler must not 500-loop or half-commit.
- Delta: build a payload that *signs fine* (so verification passes) but is structurally wrong for the dispatch path; assert the handler's defined behavior (the project returns 400 / refuses; confirm against the real handler's parse step). Assert zero partial side effects — the transaction rolled back. Distinguish from the forged-signature path: here the *signature is valid*, the *content* is bad — a different seam, a different failure.
- Honesty note for the writer: verify what the *actual* shipped handler does with a malformed-but-signed body before asserting a status — the 063/065 handler's parse behavior is the contract, not an invented one. If the handler treats unknown shapes via the `default` dispatch arm rather than a parse-throw, fold this into the next path instead of inventing a 400.

### An unhandled event type is acknowledged without side effects

- The production win: the dashboard is subscribed to more event types than the app acts on; an unsubscribed type (e.g. `customer.updated`) must be acknowledged so Stripe stops retrying, but must do nothing.
- Delta: `buildStripeEvent({ type: 'customer.updated', ... })`, sign, call. Assert: `status === 200` (the `default` dispatch arm returns clean), **and** zero side effects (no entitlement write), **and** — per the real handler — the event *is* still claimed (it reached dispatch) or *isn't*, whichever the shipped code does; assert what's true, then note the reasoning. The key contract: 2xx on unhandled types prevents Stripe's retry storm.
- Teaching note: returning 200 here is a deliberate design choice, not laziness — name it. Contrast with the 400 paths: a forged event is *malformed* (400, terminal); an unhandled-but-valid event is *fine, just not ours* (200, acknowledged).

**Closing the matrix:** a `Buckets` or `Matching` exercise mapping each of the six payloads to its expected `(status, side-effect)` outcome — e.g. drag `forged signature` / `10-min-old timestamp` / `duplicate event.id` / `customer.updated` / `valid checkout` into buckets `200 + write` / `200 + no write` / `400 + no write`. Pedagogical goal: force the student to internalize that status code and persistence are *independent* axes, which is the whole mental model of boundary testing. This is the section's understanding-check.

**Components across the matrix:** the valid path is one full `AnnotatedCode`. The five deltas are best as short `Code` blocks showing only the changed Arrange line + the changed assertions (not the full test each time) — reinforces "same skeleton, one variable". Consider a single `CodeVariants` with six tabs (one per path) holding just the distinguishing Arrange+Assert for a compact side-by-side, if it stays within the six-line-per-pane budget; otherwise inline `Code` per h3. Do not re-show `als.run`/`withRollback` boilerplate in every delta — state it once in the skeleton.

**Tooltips (`Term`):** `idempotent` (an operation that produces the same result whether run once or many times — the property the dedupe ledger gives the receiver), `tolerance window` (Stripe's 300-second freshness bound on the signature timestamp; older authentic signatures are rejected as replays).

## The same shape covers every signed webhook

**Goal:** generalize the pattern so the student sees it as transferable, not Stripe-specific. Short closing section.

**Content:**
- The shape — capture a real payload, sign it with the provider's *own* test helper, drive the exported handler, assert Response + DB state across the valid/forged/stale/replay/unhandled paths — is provider-agnostic. What changes per provider is only the signing primitive and the header names.
- One concrete second example: Resend bounce/complaint webhooks (shipped in chapter 049/063 lesson 5) verify via **Svix**, not Stripe's HMAC scheme — different headers (`svix-id`, `svix-timestamp`, `svix-signature`) and a different test-signing helper (Svix's `Webhook` sign method). Same six-path matrix, same ALS reach, same `processed_events` dedupe assertion. The student's webhook-test instinct ports; only the boundary's crypto helper swaps.
- Do not re-teach Svix — name it as the parallel and point forward. The takeaway is the *transferable test shape*, not a second implementation.

**Components:** none required — prose closing. Optionally a tiny two-row `Code`/table contrast of the Stripe vs. Svix signing call to make "only the primitive changes" concrete, but keep it to a glance.

**Tooltips (`Term`):** `Svix` (the webhook-delivery service Resend uses; ships its own signature scheme and verification/signing SDK, analogous to Stripe's `constructEvent`/`generateTestHeaderString`).

# Scope

**This lesson owns:** integration-testing an *inbound* webhook receiver end-to-end — signing a real payload with the provider's official test helper, reaching the route handler's transaction through the ALS escape hatch, and the six-path matrix (valid, forged, stale, replay, malformed, unhandled) asserting on both the HTTP Response and committed DB state inside `tx`.

**Assume built / taught — recall concisely, do not re-teach:**
- The Stripe receiver itself (`POST` handler, `constructEvent`, `claimEvent`, `dispatch`, `processed_events`) — built in **chapters 063 and 065**. This lesson tests it; it does not build or redesign it. Recall its shape in one diagram only.
- The HMAC signature scheme, raw-body rule, constant-time compare — **chapter 063 lesson 1**. The student understands these; this lesson does not re-derive them and explicitly does *not* hand-roll signing.
- `withRollback`, the `tx` seam, `DbOrTx`, and the ALS module `getDb()`/`src/db/test-tx-context.ts` — **lesson 1**. This lesson *applies* the ALS hatch (its first real use) but the mechanism's design (`?? defaultDb`, why-explicit-is-default) is lesson 1's; recall, don't re-argue.
- Per-worker DB, migrations, `.env.test`, baseline seed — **lesson 2**. The `processed_events` table is migrated and ready; don't touch lifecycle.
- The clock/timer seam (`vi.useFakeTimers`, frozen `Date.now()`) — **chapter 087 lesson 3**. Used to fix the signature timestamp; not re-taught.
- AAA, factories-over-fixtures, assert-on-shape-not-id, custom `Result` matchers — **chapters 086-087**.

**Out of scope — defer explicitly:**
- Outbound HTTP / MSW (`setupServer`, `http.*`, `server.use`) — **lessons 4-5**. This lesson is inbound-only; MSW does not appear. Make the inbound/outbound line explicit so the student doesn't conflate them.
- Server Action end-to-end testing (auth fixtures + `revalidatePath` + `NEXT_REDIRECT` + `Result` assertions) — **lesson 7**. The `signedInAs` fixture and Server Action wrapper are *not* used here; webhooks have no session.
- Flake taxonomy (`--shuffle`, `--repeat`, the nine taxa) — **lesson 8**. Forward-point only where the frozen-clock-for-timestamp naturally raises the real-clock flake; don't enumerate taxa.
- Stripe receiver *implementation*, `processed_events` *design*, billing projection — **chapters 063/064/065**. Already shipped.
- Resend/Svix receiver *implementation* — **chapter 049/063 lesson 5**. Named as the portability parallel; not built.
- The full Stripe Checkout + webhook *project* (end-to-end money path, Playwright Checkout drive) — **chapter 091**. This lesson is the unit-level receiver test that project builds on.
- Production retry/queueing of webhook consequences (Trigger.dev fan-out) — **chapters 063/066, Unit 13**. The test asserts the synchronous record-and-apply only.
- RLS-policy testing on the dedupe/entitlement tables — **Chapter 11**.

# Code conventions notes (for downstream agents)

- **Filename:** test file is `src/app/api/webhooks/stripe/route.int.test.ts` (colocated, `.int.test.ts` discriminator per lesson 1 / chapter-086 glob — this supersedes the older `tests/integration/` line in Code conventions, as the lesson-1 continuity notes already recorded).
- **Signing primitive is `stripe.webhooks.generateTestHeaderString`** — the deliberate divergence from the chapter outline's hand-rolled `sign.ts`, flagged above. This is the senior-correct shape and matches the project's existing 065 tests.
- **Handler signature is `POST(request: Request): Promise<Response>`** (Web `Request`/`Response`, not `NextRequest`/`NextResponse`) — match the shipped 065 handler, not the 063-lesson-1 `NextRequest` sketch.
- **Assert on `eventId` (the Stripe `evt_...`), never on `processed_events.id`** (bigint identity — sequences advance and don't roll back; the lesson-1 rule).
- **No `export const runtime`** anywhere — Cache Components rejects it and Node is the default; don't add it to any code sample.
- **`request.text()` reads the body once** — sign-and-send the *same string*; restate the raw-body invariant from the test's side, don't re-explain the crypto.
- **Fail-fast on missing `STRIPE_WEBHOOK_SECRET`** in the test setup so a misconfigured secret surfaces as a clear error, not a wall of 400s.
- One `describe` for the receiver, one `it` per path (six), AAA each, one behavior per `it`.
