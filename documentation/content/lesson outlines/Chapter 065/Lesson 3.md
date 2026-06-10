# Chapter 065 — Lesson 3 outline

## Lesson title

Chapter-outline title "Claim the event inside one transaction" fits — it names the senior payoff (atomic claim + work) precisely. Keep it.

- Page title: `Claim the event inside one transaction`
- Sidebar (short): `Claim in one transaction`

## Lesson type

`Implementation`

(Drives downstream: the project-lesson-test-coder fills `tests/lessons/Lesson 3.test.ts`; the writer renders the Implementation section list.)

## Lesson framing

The student installs the discipline that makes idempotency *structural* instead of hopeful: the dedup claim and the business work share one `db.transaction`, so a crash mid-handler rolls back both and a replayed event id can never mutate twice. They wrap the verified-but-not-yet-trusted path from lesson 2 in a transaction, claim the event against `processed_events` via the provided `claimEvent`, route it through an exhaustive `dispatch` switch, and answer 200-on-replay (never a retry-inducing 4xx/5xx). The payoff is the single transaction boundary as the unit of atomicity for any async ingest — the pattern carries to every webhook, retried job, and event bus the student writes next.

## Codebase state

### Entry

The route handler `app/api/webhooks/stripe/route.ts` carries lesson 2's verification skeleton: reads `request.text()` once, null-checks `stripe-signature`, calls `stripe.webhooks.constructEvent`, returns `400 application/problem+json` on `StripeSignatureVerificationError`, logs `verified`/`invalid_signature`/`missing_header`. After a successful verify it currently just returns 200 with no business effect — no transaction, no claim, no dispatch call.
`lib/webhooks/stripe.ts` exports a stub `dispatch(_tx, event)` that logs `unhandled` for every event type and ignores its `tx` arg (`_tx`); `resolveOrgIdFromCustomer`, `onCheckoutCompleted`, `onSubscriptionUpdated`, `onSubscriptionDeleted` all `throw new Error('not implemented')`.
Provided and unchanged: `lib/webhooks/processed-events.ts` exporting `claimEvent(tx, provider, eventId, eventType): Promise<boolean>` (onConflictDoNothing insert; `true` = freshly claimed, `false` = duplicate), the `processedEvents` table with `unique(provider, eventId)`, `db.transaction` + the `Transaction` type from `@/db`, the inspector's `processed_events` tail and "Replay last event" debug.

### Exit

`route.ts` opens `db.transaction(async (tx) => {...})` after a successful verify: calls `claimEvent(tx, 'stripe', event.id, event.type)`, on `false` sets `duplicate = true`, logs `duplicate`, returns from the transaction body; on `true` logs `claimed` then calls `dispatch(tx, event)`. The route returns `Response.json({ received: true, duplicate }, { status: 200 })`.
`lib/webhooks/stripe.ts`'s `dispatch` is now an exhaustive switch over the three subscription event types routing each to its (still-throwing) handler, with `default` logging `unhandled` and returning, and a final `dispatched` log on the routed path; `tx` is now threaded (no longer `_tx`). The three handlers still `throw new Error('not implemented')` — they land in lesson 4.
A first-seen event writes exactly one `processed_events` row; a replay of the same `event.id` writes none and returns `{ received: true, duplicate: true }`. The `plan_entitlements` panel stays `free`.

## Lesson sections

Implementation type — render the contract's four sections in order. Project lessons carry no inline exercises (the tests are the exercise) and no diagram is needed here (the transaction-boundary flow is short prose; the sequence diagram belongs to lesson 4's projection).

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: wrap the post-verify path in one transaction so the webhook lands each event exactly once and dedupes replays. Then a one-paragraph description of the feature working: firing `stripe trigger checkout.session.completed` lands one row in the inspector's `processed_events` tail; the inspector's "Replay last event" re-fires the same `event.id` and the panel stays at one row, the response being 200 `{ received: true, duplicate: true }`; the `plan_entitlements` panel stays `free` because the handlers the switch routes to are still stubs (lesson 4). No screenshot needed — describe the inspector tail and the response shape in prose.

### Your mission

Prose paragraph + one requirements checklist. No subsection headers, no implementation hints, no code.

Weave into the prose (coherent paragraph, project terms):
- **Feature** (one sentence): the webhook claims each Stripe event against `processed_events` and routes it through a dispatch switch, all inside one database transaction.
- **The senior decision the brief surfaces:** idempotency is structural, not hopeful — the dedup claim and the business work must live in the *same* transaction. Spell out the failure mode without naming the fix: claiming outside the transaction and dispatching inside (or the reverse) re-opens the partial-state bug — the claim row commits, the work fails, the next retry sees "already processed" and skips, and the database is left permanently wrong.
- **Constraints that shape the solution:** every DB call inside a handler rides the transaction handle, never the global `db` (mis-routing to `db` opens a second transaction that races the inner one); a duplicate delivery is a *success* path answered 200, never a 4xx/5xx (a 4xx tells Stripe to retry the same event forever); the dispatch switch is exhaustive over the three subscription events with a `default` that logs and returns 200 (Stripe sends events from dashboard misconfigurations the app never subscribed to — refusing them is noise); structured logging covers every disposition (`verified`, `duplicate`, `claimed`, `dispatched`, `unhandled`), each keyed by `event.id`, because the log is the live forensic surface and the inspector panels are the user-visible one.
- **The timing budget, named here so lesson 4's Stripe call does not look accidental:** Stripe waits ~30s for a 2xx and any side effect inside the transaction holds a DB connection across network IO — the one allowed reach (`subscriptions.retrieve`) lands next lesson; anything heavier queues to a background job (forward note to chapter 066).
- **Out of scope** (one line): the projection and the entitlement mutations — the handlers the switch routes to still throw `'not implemented'` until lesson 4.

Then the **Functional requirements** checklist (the only list). Tag each `[tested]`/`[untested]`. The test harness drives the real `POST` over `Request` objects with `@/db`, `claimEvent`, and `dispatch` mocked (it does not run the throwing handlers or live Postgres), so the automated gates assert the route's claim/dispatch orchestration; the live `stripe trigger` / inspector behaviors are hand-verified.

1. A first-seen verified event opens exactly one `db.transaction` and, on a fresh claim, calls `dispatch` with the same transaction handle the claim used. `[tested]`
2. A lost claim (`claimEvent` returns `false`) is a success: the route answers 200 with body `{ received: true, duplicate: true }`, calls `dispatch` zero times, and never returns a 4xx/5xx. `[tested]`
3. A fresh claim (`claimEvent` returns `true`) answers 200 with `{ received: true, duplicate: false }` and routes through `dispatch`. `[tested]`
4. `dispatch` routes `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` each to its own handler, and an unsubscribed event type hits the `default` branch and returns without error. `[tested]`
5. Firing `stripe trigger checkout.session.completed` once adds exactly one row to the inspector's `processed_events` tail (`eventId`, `eventType`, `receivedAt`), and the structured log shows `verified` then `claimed`. `[untested]` (manual — live Stripe CLI + inspector)
6. The inspector's "Replay last event" (`stripe events resend <eventId>`) re-delivers the same `event.id`, the tail stays at one row, and the disposition logs `duplicate`. `[untested]` (manual — live replay)
7. Every disposition is logged with its `event.id`, and the `plan_entitlements` panel stays `free` because the handlers are still stubs. `[untested]` (manual — log + panel inspection)

(Note for the test-coder: requirements 1–4 are unit-level orchestration gates over the mocked route; the throwing handlers are never invoked because `dispatch` is mocked at the route boundary, and the dispatch-switch routing gate (req 4) mocks the three handler exports and asserts which one each event type calls. Reuse the Lesson 2 env-boot + `vi.mock('server-only')` + signed-header fixture scaffold; this file inlines its own helpers.)

### Coding time

One line directing the student to implement against the brief and the lesson's tests, then read the reference solution. The writer wraps the solution in `<details>` (collapsed by default).

Present two files, organized as they appear in the repo:

**`src/app/api/webhooks/stripe/route.ts`** — show the diff from lesson 2: the post-verify block becomes `let duplicate = false;` + `await db.transaction(async (tx) => { ... })` (the `claimEvent` call, the `duplicate = true` + `log.info(..., 'duplicate')` + `return` on a lost claim, the `log.info(..., 'claimed')` then `await dispatch(tx, event)` on a fresh claim), and the final `return Response.json({ received: true, duplicate }, { status: 200 })`. Use **`CodeVariants`** (before = lesson-2 "verified → bare 200" tail; after = the transaction-wrapped tail) so the student sees exactly what the transaction adds on top of the verification skeleton.

**`src/lib/webhooks/stripe.ts`** — show the `dispatch` switch: three `case`s routing to `onCheckoutCompleted`/`onSubscriptionUpdated`/`onSubscriptionDeleted` (each `await` + `break`), the `default` logging `unhandled` and `return`, the trailing `dispatched` log on the routed path, and the signature change from `_tx` to `tx`. Use **`AnnotatedCode`** to direct focus across three parts: (a) the `tx` thread now in the signature, (b) the exhaustive `case` arms, (c) the `default`-returns-200 arm. The handlers below the switch stay as `throw new Error('not implemented')` — call this out explicitly so the student is not surprised the panel does not move yet.

Decision rationale (one or two sentences each, covering the `[untested]` choices):
- **One transaction is one boundary** — restate the partial-state failure mode concretely (claim commits, work fails, retry skips, DB wrong) to justify why claim + dispatch share `tx`.
- **`tx` not `db` inside handlers** — passing `tx` is what makes the boundary real; a bare `db` call opens a sibling transaction that does not roll back with the claim.
- **`default` returns 200 not 400** — an unsubscribed event type is dashboard noise, not a client error; a 4xx would make Stripe retry it forever.
- **Why the response carries a `duplicate` flag** — operators reading the response and the chapter 091 test both depend on the shape; it makes the dedup-hit observable without a log dive.
- **(Optional) `processed_events.eventType` stored for observability** — an analyst can count event types from the table without a Stripe round-trip.

For the claim-and-transaction pattern itself, **link** to lesson 2 of chapter 063 rather than re-explaining; `claimEvent` and the `processed_events` table are carry-in, not re-derived here.

No external resources expected (the resourcer appends any, with no header, after the `<details>`).

### Moment of truth

The test command and expected pass output, plus the hand-verify checklist for the `[untested]` requirements.

- Command: `pnpm test:lesson 3` (runs `tests/lessons/Lesson 3.test.ts` via vitest).
- Expected: all suites green (the orchestration gates 1–4 above) — show the passing vitest summary line.
- Hand-verify checklist (ticked as the student goes, covering reqs 5–7): with `stripe listen` forwarding and `pnpm dev` running, `stripe trigger checkout.session.completed` lands exactly one `processed_events` row in the inspector tail; "Replay last event" leaves it at one row and logs `duplicate`; the `plan_entitlements` panel still reads `free`.

## Scope

This lesson stops at the transaction boundary, the claim, and the dispatch *routing*. It does not cover:
- The projection (`subscriptionToEntitlement`), the three handler bodies, the `plan_entitlements` schema columns, the ordering predicate, or audit logging — lesson 4 of chapter 065.
- The one allowed `stripe.subscriptions.retrieve` inside a handler — lesson 4 of chapter 065 (named here only as a forward note for the timing budget).
- The signature-verification skeleton it builds on — lesson 2 of chapter 065.
- The metadata cross-check against forged tenancy — lesson 6 of chapter 065.
- The `billing.*` interface, Checkout, and Portal — lesson 5 of chapter 065.
