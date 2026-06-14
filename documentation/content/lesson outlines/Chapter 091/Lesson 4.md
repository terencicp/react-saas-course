# Chapter 091 — Lesson 4 outline

## Lesson title

The chapter-outline title "The replay/idempotency test" fits — it names the behavior the test proves.

- **Page title:** The replay/idempotency test
- **Sidebar:** Replay/idempotency test

## Lesson type

Implementation

(Drives downstream branching: the test-coder runs for this lesson; the writer renders the Implementation section list.)

## Lesson framing

The student installs the senior reflex that **at-least-once delivery is a guarantee you must defend against, not a bug you tolerate** — proving in a test that a replayed Stripe `checkout.session.completed` event is an exact no-op. They write the second integration test: send the same signed event twice, assert the first claims-and-dispatches (`duplicate:false`) and the second is a clean dedup hit (`duplicate:true`) that writes zero new rows. The durable payoff is learning to *deliberately construct the failure input* — pinning the dedup key so the replay is a true replay — and to *assert the absence of mutation* across every surface a replay must leave untouched. They walk away with `pnpm test:integration` reporting `2 passed`.

## Codebase state

### Entry

The harness (Lesson 2) is fully read and booting. Lesson 3 is complete: `tests/integration/webhook-checkout-completed.int.test.ts` holds the full happy-path test and `pnpm test:integration` reports `1 passed`. The student has the `withRollback` → `signedInAs` → set `stripeCustomerId` → `checkoutCompleted()` + `registerSubscription(fixtureSubscription(...))` → `postWebhook` → multi-surface-assert pattern in muscle memory. `tests/integration/webhook-idempotency.int.test.ts` is still the start stub: `// TODO(L4)` + `describe.todo('replayed checkout event is a no-op')` (collected as todo, runs nothing). All harness, fixtures, helpers, route handler, and `lib/webhooks/**` are provided and unchanged.

### Exit

`tests/integration/webhook-idempotency.int.test.ts` holds the complete replay test: pins `eventId = 'evt_test_idempotency_fixed'`, sends the event through `postWebhook` twice, captures `plan_entitlements.updatedAt` between sends, and asserts first→`{duplicate:false}`, second→`{duplicate:true}`, `processed_events` count stays 1, `updatedAt` unchanged, `audit_logs` count stays 1. `pnpm test:integration` reports `2 passed`, green again on an immediate re-run with no reset. The signature-rejection stub (`// TODO(L5)`) and the e2e stub remain untouched.

## Lesson sections

Implementation type — section order: Goal + Finished result (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: write the integration test that sends the same `checkout.session.completed` event twice and proves the second send changes nothing. One-paragraph finished result: `pnpm test:integration` reports `2 passed`; under `--reporter=verbose` the new `it` line reads as "returns 200 with duplicate=true and does not mutate state on a replayed event." No screenshot needed — the terminal pass count is the result; render the expected output with `Code`.

### Your mission

Coherent prose paragraph (no subsection headers, no implementation hints), weaving:

- **Feature (project terms):** Prove the webhook handler is idempotent — Stripe's at-least-once delivery cannot double-apply a subscription change.
- **Constraints / shape:** Mirrors Lesson 3 verbatim — `withRollback(async ({ tx }) => {...})`, `signedInAs({ role: 'admin' }, tx)`, set `stripeCustomerId`, `registerSubscription(fixtureSubscription(...))` with the same `course_pro_monthly` / `trialing` subscription, AAA with blank-line separation, `it` (not `it.concurrent`), read with `tx` not the global `db`. Reuse helpers verbatim — the infrastructure was built once, so this test costs minutes (link Lesson 1 of Chapter 088's cost-amortization argument rather than re-explaining).
- **The one load-bearing difference (framed as a constraint, not a hint):** the failure input must be *deliberately constructed* — the same dedup key must survive both sends. Name the trap without naming the variable name as a hint: if each send minted a fresh event id, the second call would be a new event, not a replay, and the test would prove nothing. (The brief carries no implementation hints; this is the senior reasoning about *why* the input shape matters, which is what the mission must surface — keep it to the principle, leave `eventId` pinning to Coding time.)
- **Scope:** keep it to one behavior — "the second send changes nothing" — asserted across every surface a replay must leave untouched.

Then the **Functional requirements** numbered list (render with `Checklist` / `ChecklistItem`, each item carrying a `tested`/`untested` chip). Every item here is `[tested]` — the test-coder asserts on all of them:

1. The first send returns `200` with `{ received: true, duplicate: false }` (claim-and-dispatch path). `[tested]`
2. The second send returns `200` with `{ received: true, duplicate: true }` (dedup-hit path). `[tested]`
3. The event is claimed exactly once — `processed_events` rows for `event.id` stay at 1 across both sends. `[tested]`
4. The entitlement is not re-written — `plan_entitlements.updatedAt` is identical before and after the second send. `[tested]`
5. The audit log is not appended twice — `audit_logs` rows for the org stay at 1. `[tested]`

No **Out of scope** line beyond the one-behavior framing; the ordering-predicate, `subscription.deleted`, and Portal-cancellation tests are homework extensions (Scope section below).

### Coding time

One line directing the student to implement `tests/integration/webhook-idempotency.int.test.ts` against the brief and the harness; reference solution follows for after the attempt. Writer wraps the solution in `<details>` (collapsed by default).

Reference implementation, organized AAA as it appears in the file. Render the full test with `AnnotatedCode` — direct focus to the three load-bearing parts in sequence: (1) the pinned `eventId` in the Arrange, (2) the capture of `updatedAt` between the two `postWebhook` calls in the Act, (3) the `toEqual(captured)` equality assertion. Plain `Code` would bury these among the Lesson-3-identical boilerplate.

- **Arrange:** `signedInAs({ role: 'admin' }, tx)`; `tx.update(organization).set({ stripeCustomerId }).where(...)` with a deterministic customer id; `checkoutCompleted({ orgId, customerId, subscriptionId, eventId: 'evt_test_idempotency_fixed' })`; `registerSubscription(fixtureSubscription({ id: subscriptionId, lookupKey: 'course_pro_monthly', status: 'trialing', currentPeriodEnd, orgId }))`.
- **Act:** `const first = await postWebhook(event)`; read `plan_entitlements` and capture `afterFirst?.updatedAt`; `const second = await postWebhook(event)`.
- **Assert:** `first.status` 200 / body `toMatchObject({ received: true, duplicate: false })`; `second.status` 200 / body `toMatchObject({ received: true, duplicate: true })`; `processed_events` count for `eventId` = 1 (`tx.query.processedEvents.findMany`); post-second-send `updatedAt` `toEqual(captured)`; `audit_logs` count = 1 (`tx.query.auditLogs.findMany`).
- **Names:** `it('returns 200 with duplicate=true and does not mutate state on a replayed event', ...)` inside `describe('replayed checkout event is a no-op', ...)`.

Decision rationale (one or two sentences each):

- The fixed `eventId` is the load-bearing setup — idempotency tests pin the dedup key explicitly so the second delivery is a true replay, not a new event.
- Comparing `updatedAt` across the two reads is the cleanest mutation-free assertion: an exact-value `toEqual(someTimestamp)` would couple the test to `now()` at the first call, whereas equality across two reads reads as "nothing changed in between."
- Asserting on the `duplicate: true` flag ties the test to a response-shape contract operators depend on in logs (the route handler from Lesson 4 of Chapter 065 returns it on the dedup-hit path); if the team later drops the flag this test breaks, which is correct — the shape change deserves a test change.

No `[untested]` requirements to cover. For topics owned by regular lessons, link rather than re-explain: idempotency / `claimEvent` semantics → Lesson 4/5 of Chapter 065 and Lesson 6 of Chapter 088; the `@/db` Proxy + `testTxContext` seam → Lesson 1 of Chapter 088 (and Lesson 2 of this chapter's harness read). No external resources expected (resourcer appends here if any).

No diagram — the AAA prose plus annotated test carries the flow; a box diagram would add nothing over the two-call sequence already legible in the code.

### Moment of truth

Test command and expected pass output:

- Run `pnpm test:integration`. Expected: `2 passed`. Render with `Code`.
- Re-run immediately with no reset — still `2 passed` (the rollback discipline holds; reinforces the chapter-wide invariant).

Hand-check list (the structural-proof drills the tests don't assert; render with `Checklist`):

- With `--reporter=verbose`, the two `it` names list the two behaviors (happy path, replay) without reading the bodies.
- Swapping the route handler for a different implementation that still satisfies the contract (verify → claim → mutate → audit) leaves both tests green — the Lesson 4 of Chapter 086 black-box rule (restore after).

## Scope

- **Signature-tampered rejection** (forged/corrupted signature → 400 problem+json, nothing written) — Lesson 5 of this chapter.
- **The full money path through the browser** (Stripe Checkout iframe, `/billing/success` poller) — Lesson 6 of this chapter.
- **The ordering predicate** (`subscription.updated` with an older `created` than `lastEventAt` no-ops), the **`subscription.deleted`** path, and **Portal-cancellation** projection — homework extensions named in the Chapter framing; this test does not cover them but the harness absorbs them in minutes apiece.
- **Why idempotency / `claimEvent` exists** (the `processed_events` claim-row pattern, at-least-once delivery) — taught in Lesson 4/5 of Chapter 065 and tested-as-pattern in Lesson 6 of Chapter 088; this lesson proves it on the project, it does not re-teach it.
