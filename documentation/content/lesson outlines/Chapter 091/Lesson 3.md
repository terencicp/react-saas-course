# Chapter 091 — Lesson 3 outline

## Lesson title

**Page title:** The happy-path webhook test
**Sidebar title:** Happy-path webhook test

The chapter-outline title fits; sentence case, no markup. Keep it.

## Lesson type

`Implementation`

The student writes one integration test file against the harness; the test-coder generates the assertions in the next step. This is not a Walkthrough — the test *is* the exercise, no step-by-step scaffolding.

## Lesson framing

The student installs the senior reflex that an integration test asserts on the *contract surface a caller observes* — the rows written, the response body, the boundary left untouched — never on the handler's private helpers. They drive a real signed `checkout.session.completed` delivery through the unedited production route handler against real Postgres, stub exactly the two network boundaries the seam crosses (Stripe `subscriptions.retrieve` at the SDK seam, Resend at the wire), and prove the webhook upserts the entitlement, claims the event, and writes an audit log — leaving zero state behind via per-test transaction rollback. The payoff is a first green seam test that survives a rename of every internal helper.

## Codebase state

### Entry
- The harness from lessons 1–2 is fully provided and confirmed booting: the two-project `vitest.config.ts` (`lesson` + `integration`), `src/test/integration-setup.ts` (the `@/db` Proxy mock, the `vi.mock('@/lib/billing/stripe')` SDK stub, the MSW Resend lifecycle, the `DATABASE_URL_TEST` fail-fast guard), `src/test/db/with-rollback.ts`, `src/test/fixtures/{auth,stripe-events,stripe-subscription}.ts`, `src/test/stripe-retrieve-registry.ts`, `src/test/msw/handlers/resend.ts`, `src/test/helpers/post-webhook.ts`.
- Both Postgres DBs (`saas_int_test`, `saas_e2e`) are up, migrated, seeded.
- `tests/integration/webhook-checkout-completed.int.test.ts` is a stub: `// TODO(L3)` + `describe.todo('happy-path checkout.session.completed webhook')`. The other two `.int.test.ts` files and the e2e spec are still `describe.todo` / `test.fixme`.
- `pnpm test:integration` runs and reports zero executed tests.
- The route handler (`app/api/webhooks/stripe/route.ts`), `lib/webhooks/stripe.ts`, `lib/billing/projection.ts` are the unchanged Chapter 065 code under test.

### Exit
- `tests/integration/webhook-checkout-completed.int.test.ts` is complete: one `it` inside the `describe`, wrapped in `withRollback`, AAA-shaped, asserting on the response, the `processed_events` row, the `plan_entitlements` row, the `audit_logs` row, and the empty `resendCalls`.
- `pnpm test:integration` reports `1 passed`, green again on immediate re-run (rollback leaves no rows).
- No production code touched; the other three test files remain stubs (lessons 4–6).

## Lesson sections

Implementation type. Section order from the contract: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in the student's terms: write the first integration test that drives a signed checkout webhook through the real handler and proves the rows it writes. One-paragraph finished result: `pnpm test:integration` reports `1 passed`; under `--reporter=verbose` a single `it` line reads as the behavior ("upserts the entitlement, claims the event, and writes an audit log when a valid checkout completes"). No screenshot needed — the pass output is the artifact; the writer may show the verbose terminal line as a `Code` block.

### Your mission
Prose paragraph + one requirements checklist. No subsection headers, no implementation hints.

Prose weaves: the student is testing the webhook ingest seam in isolation — the path a real Stripe `checkout.session.completed` delivery takes through the production route handler down to the rows it writes. **Constraints that shape the solution:** the whole test wraps in `withRollback(async ({ tx }) => { ... })` so it leaves no state behind; it follows Arrange / Act / Assert with blank-line separation; reads must use `tx` (the transactional handle the route shares via the `@/db` mock + `testTxContext`), never the global `db`, or the test sees missing state; use `it`, not `it.concurrent`. Exactly two network boundaries are stubbed and nothing else — Stripe `subscriptions.retrieve` (fed by `registerSubscription(fixtureSubscription(...))`, *not* an MSW handler) and Resend's POST (MSW, already wired); `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, and every internal helper run as real code, because a test that mocks them proves nothing about the seam. One behavior only — "the handler processed the event" — asserted across every surface it touches. **Out of scope:** no email fires off the webhook in this project (Unit 13's dispatcher owns that), so the Resend boundary is asserted as untouched rather than as a second behavior; duplicate-delivery and signature-tampering are lessons 4 and 5.

Requirements checklist — render with `Checklist`/`ChecklistItem`, each tagged `[tested]` / `[untested]`. Phrase as observable outcomes, never files/exports:

1. `[tested]` A valid signed `checkout.session.completed` returns `200` with a body matching `{ received: true, duplicate: false }`.
2. `[tested]` The event is claimed exactly once — a `processed_events` row exists for the event id with `provider: 'stripe'` and `eventType: 'checkout.session.completed'`.
3. `[tested]` The org's `plan_entitlements` row reflects the subscription: `plan: 'pro'`, `status: 'trialing'`, the matching `subscriptionId`, `cancelAtPeriodEnd: false`, and `lastEventAt` equal to `new Date(event.created * 1000)`.
4. `[tested]` An `audit_logs` row is written for the org with `action: 'billing.subscription.activated'` and `actorUserId: null`.
5. `[tested]` No outbound email is triggered off this path — `resendCalls` stays empty.
6. `[untested]` The `it` name, read aloud, names the behavior without reading the body (the read-aloud test from lesson 4 of chapter 086).
7. `[untested]` A no-op rename of `subscriptionToEntitlement` and its internal helpers leaves the test green — proof it asserts on the contract, not internals.

### Coding time
One line directing the student to implement `tests/integration/webhook-checkout-completed.int.test.ts` against the brief and the harness, then the solution (writer wraps in `<details>`, collapsed). Use `AnnotatedCode` for the full test file so each AAA block can carry its own focus text; the file is a single block where attention needs directing to three distinct phases.

Reference implementation, organized as it appears in the repo — one `describe` with one `it(..., withRollback(async ({ tx }) => { ... }))`:

- **Arrange:** `const { org } = await signedInAs({ role: 'admin' }, tx)` (admin user + org + seeded `free` entitlement); `tx.update(organization).set({ stripeCustomerId }).where(eq(organization.id, org.id))` with a deterministic `customerId` (e.g. `cus_test_checkout_happy`) so `resolveOrgIdFromCustomer` finds the org; `const event = checkoutCompleted({ orgId: org.id, customerId, subscriptionId })`; `registerSubscription(fixtureSubscription({ id: subscriptionId, lookupKey: 'course_pro_monthly', status: 'trialing', currentPeriodEnd, orgId: org.id }))`.
- **Act:** `const response = await postWebhook(event)`.
- **Assert:** `expect(response.status).toBe(200)`; `await expect(response.json()).resolves.toMatchObject({ received: true, duplicate: false })`; `processed_events` via `tx.query.processedEvents.findMany({ where: eq(processedEvents.eventId, event.id) })` (length 1, `toMatchObject({ provider: 'stripe', eventType: 'checkout.session.completed' })`); `plan_entitlements` via `tx.query.planEntitlements.findFirst` (field assertions above; `lastEventAt` via `toEqual(new Date(event.created * 1000))`); `audit_logs` via `tx.query.auditLogs.findMany` (`toMatchObject({ action: 'billing.subscription.activated', actorUserId: null })`); `expect(resendCalls).toHaveLength(0)`.
- Test name: `it('upserts the entitlement, claims the event, and writes an audit log when a valid checkout completes', ...)` inside `describe('happy-path checkout.session.completed webhook', ...)`.

Decision rationale (one or two sentences each):
- The `lastEventAt` assertion is the load-bearing ordering proof — without it an order regression in Chapter 065's `WHERE lastEventAt < ?` predicate could ship green; the rule (lesson 6 of chapter 088) is that a webhook test asserts on the `processed_events` row *and* the ordering column, not just the business-state mutation.
- Reading with `tx` not the global `db` is required because `tx` is the transactional handle the route shares via the `@/db` Proxy mock and the `testTxContext` store; the global `db` resolves to a different connection that can't see the in-flight transaction.
- The single `it` asserting on four surfaces is one behavior with multiple observable surfaces — lesson 4 of chapter 086 permits multiple `expect`s for one behavior; `expect(resendCalls).toHaveLength(0)` is a negative boundary assertion, not a second behavior.
- The registered `fixtureSubscription` deliberately matches the event's claims (same `subscriptionId`, same `lookup_key`); drift between event and retrieved subscription is what production sees on a Stripe outage — out of scope here, but the registry is the contract a later test could drift on purpose.

Untested-requirement coverage: name that the `it` string is written to pass the read-aloud test (req 6), and that nothing in the test references `subscriptionToEntitlement` or any internal helper by name — only the observable rows — which is what makes the rename in req 7 a no-op for the test.

Callout (`Aside`): prefer the structural matcher `toMatchObject` over field-by-field `toBe` where the rendered failure diff is more readable (lesson 4 of chapter 086).

Cross-references rather than re-explaining: AAA and behavior-over-implementation → lesson 4 of chapter 086; the `@/db` Proxy mock, `withRollback`, the SDK-seam Stripe stub, MSW Resend → lesson 2 of this chapter (the harness walkthrough); transaction rollback depth → lesson 1 of chapter 088; the webhook → DB → audit transaction being tested → Chapter 065.

### Moment of truth
Test command and expected output, plus the by-hand checklist for the untested requirements.

- Run `pnpm test:integration`. Expected: `1 passed`. Show the pass summary as a `Code` block.
- Re-run immediately with no reset — also `1 passed` (rollback discipline holds, no orphan rows).
- Run `pnpm test:integration -- --reporter=verbose` and confirm the `describe` / `it` line names the behavior.
- By-hand checklist (`Checklist`, the untested reqs 6–7): the `it` name read aloud names the behavior without reading the body; a no-op rename of `subscriptionToEntitlement` and its internal helpers leaves the test green (restore after).

## Code samples — component guidance
- Full test file → `AnnotatedCode` (direct focus to Arrange / Act / Assert in turn).
- Pass-output terminal blocks and the verbose `it` line → `Code`.
- Matcher-choice note → `Aside` (tip).
- Requirements list and by-hand checklist → `Checklist` / `ChecklistItem` with `tested` / `untested` chips.
- No diagram: the seam shape and harness flow are owned by lesson 2; prose carries this lesson.

## Scope

- Duplicate-delivery / idempotency (replaying the same `eventId`) — lesson 4 of this chapter.
- Signature tampering and fail-closed rejection — lesson 5 of this chapter.
- The full browser money path (Upgrade → Stripe Checkout → poller flips to Pro) and the suite-wide mutation/coverage drills — lesson 6 of this chapter.
- How the harness itself works (`@/db` Proxy mock, SDK-seam Stripe stub, `withRollback`, the fixtures and `postWebhook`) — lesson 2 of this chapter; this lesson consumes them, does not re-explain.
- Transaction-rollback theory and real-Postgres integration setup — lesson 1 of chapter 088.
- The webhook handler's own verify → claim → dispatch logic — Chapter 065 (the code under test, not modified here).
