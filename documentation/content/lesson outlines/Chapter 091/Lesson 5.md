# Chapter 091 — Lesson 5 outline

## Lesson title

The chapter-outline title "The signature-tampered rejection test" fits — it names the input (tampered signature) and the proof (rejection). Keep it.

- Page title: `The signature-tampered rejection test`
- Sidebar title: `Signature rejection test`

## Lesson type

`Implementation`

(Not the first lesson, not the last — lesson 6 is the final lesson. Test-coder runs for this lesson; the writer renders the Implementation section list.)

## Lesson framing

The student installs the fail-closed front-door proof: an integration test that feeds a well-formed event with a corrupted signature through the real route handler and asserts that *nothing* downstream ran — no claim row, the seeded entitlement untouched, no audit row, no outbound call. The senior payoff is the discipline of proving a *negative*: a security boundary is only as trustworthy as the test that asserts no work leaks past it, and the cumulative emptiness of every downstream surface is what "rejected before any work" means. This is the third and last integration test in the suite; the student reuses the lesson 3/4 scaffold verbatim and flips one helper flag, so the test costs minutes — the amortization argument made concrete one more time.

## Codebase state

### Entry

- Lessons 3 and 4 done: `tests/integration/webhook-checkout-completed.int.test.ts` (happy path) and `webhook-idempotency.int.test.ts` (replay) are complete and green; `pnpm test:integration` reports `2 passed`.
- `tests/integration/webhook-signature-rejected.int.test.ts` is still the start stub — `// TODO(L5)` + `describe.todo('tampered signature is rejected before any work')` (collected as todo, runs nothing).
- The Playwright spec `tests/e2e/checkout-money-path.spec.ts` is still `test.fixme` (lesson 6).
- All harness ships in the starter (lesson 2 walked it): the two-project `vitest.config.ts`, `integration-setup.ts` (`@/db` Proxy mock + Stripe SDK stub + MSW lifecycle), `withRollback`, `signedInAs`, `checkoutCompleted`, `postWebhook` with its `tamperSignature` option, the Resend MSW handler with `resendCalls`, the `problemJson` helper, and the unchanged Chapter 065 route handler. No production code changes this lesson.

### Exit

- `webhook-signature-rejected.int.test.ts` is complete: one `it` inside `describe('tampered signature is rejected before any work')`, wrapped in `withRollback`, asserting 400 / `application/problem+json` / `{ title: 'invalid_signature', status: 400 }` and the empty downstream state (`processed_events` = 0, entitlement still `free`, `audit_logs` = 0, `resendCalls` = 0).
- `pnpm test:integration` reports `3 passed`; re-run with no reset still `3 passed` (rollback holds).
- The integration suite is complete. Only lesson 6 (the Playwright money path + mutation/coverage drills) remains.

## Lesson sections

Implementation type. Section order: intro (no header) → **Your mission** → **Coding time** (wrapped in `<details>` by the writer) → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: write the integration test that tampers the Stripe signature and proves the request is rejected before any work happens. Then the finished result in one paragraph: `pnpm test:integration` reports `3 passed`, and `--reporter=verbose` shows the new `it` reading as "rejects with 400 problem+json and writes nothing when the signature is tampered." No screenshot needed — the pass count and the verbose `it` line are the artifact (a one-line `Code` block of the expected verbose output is enough).

### Your mission

Prose paragraph framing the capability in the project's terms — proving the handler's fail-closed front door, that a forged or corrupted signature is rejected before a single byte of the body is trusted. Weave in, with no implementation hints and no subsection headers:

- The input construction: the event itself is well-formed; the corruption lives only in the signature, which `postWebhook(event, { tamperSignature: true })` produces by flipping one character of the real signed header.
- The deliberate omission: register **no** `fixtureSubscription` here on purpose — a verified payload never reaches the handler, so `subscriptions.retrieve` must never be called; if the front door let the body through, the missing registration would surface as a loud lookup failure, reinforcing the proof.
- The shape of the proof: cumulative and negative — assert on the *empty* state of every downstream surface, because that emptiness is what "rejected before any work" means.
- The watch-out it catches (link, don't re-explain — owned by lesson 3 of chapter 065): if the route logged the body before verifying, `resendCalls` would still be empty but a structured log would carry attacker-controlled content; the test's value is in asserting that nothing downstream ran.
- The backstop: `onUnhandledRequest: 'error'` (lesson 5 of chapter 088) — a future handler change adding an outbound call fails the suite loudly with an un-stubbed-network error.
- The scaffold reuse: same `withRollback` + `signedInAs({ role: 'admin' }, tx)` + AAA with blank-line separation (lesson 4 of chapter 086); one behavior — "the request is rejected before any work."

**Constraints:** `withRollback` (no state left behind), `it` not `it.concurrent` (lesson 8 of chapter 088), read with `tx` not the global `db`. **Out of scope:** one line — the Playwright money path and the suite-wide mutation/coverage drills are lesson 6.

Then the requirements checklist (the only list in the section), each phrased as a verifiable outcome, tagged `[tested]`/`[untested]`. Use the `Checklist`/`ChecklistItem` component with the `tested`/`untested` chip:

1. `[tested]` A tampered-signature request returns `400`.
2. `[tested]` The response is `application/problem+json` with a body matching `{ title: 'invalid_signature', status: 400 }`.
3. `[tested]` No event is claimed — `processed_events` rows for the org = 0.
4. `[tested]` No entitlement is touched — the org's `plan_entitlements` row still reads `plan: 'free'` (the seed).
5. `[tested]` No audit log is written — `audit_logs` rows for the org = 0.
6. `[tested]` No outbound call fires — `resendCalls.length === 0`.
7. `[untested]` The `it` name, read aloud, names the behavior without reading the body (lesson 4 of chapter 086 read-aloud test).

Note for the writer: items 1–6 are all directly asserted in the test body — the test-coder asserts every one. Item 7 is a by-hand verification the test can't make, so it lands in **Moment of truth** rather than the brief checklist; keep it there, not duplicated here.

### Coding time

One line directing the student to implement `tests/integration/webhook-signature-rejected.int.test.ts` against the brief and the harness; the reference solution follows for after the attempt. Wrapped in `<details>` (collapsed) by the writer.

Present the full reference test (it is short — ~60 lines). Use `AnnotatedCode` to direct focus across the three load-bearing parts the student must understand, each step its own explanation:

1. **Arrange** — `signedInAs({ role: 'admin' }, tx)` seeds the org and its `free` entitlement; the event is built normally via `checkoutCompleted({ orgId, customerId, subscriptionId })` (well-formed; only the signature is corrupted at send time); **no `registerSubscription`** — the deliberate omission.
2. **Act** — `const response = await postWebhook(event, { tamperSignature: true })`.
3. **Assert** — the positive contract (`response.status` 400, `content-type` `'application/problem+json'`, body `toMatchObject({ title: 'invalid_signature', status: 400 })`) then the negative downstream sweep (`processed_events` count 0 via `tx.query.processedEvents.findMany`, entitlement still `plan: 'free'` via `tx.query.planEntitlements.findFirst`, `audit_logs` count 0, `resendCalls` length 0).

Test name: `it('rejects with 400 problem+json and writes nothing when the signature is tampered', ...)` inside `describe('tampered signature is rejected before any work', ...)`.

Decision rationale (one or two sentences each):

- Asserting on the empty state of every downstream surface is the cumulative proof that verification happens before any work — it is the test that would catch a regression where the route logs or processes the body before verifying. (The route's actual ordering: read body → check signature header → `constructEvent` → only then open the `db.transaction`. Reference the route, don't re-explain it — owned by lesson 4 of chapter 065.)
- The `{ title: 'invalid_signature', status: 400 }` body shape is the RFC 9457 `problem+json` contract from the `problemJson` helper — a verification failure carries only `type`/`title`/`status`, never an echo of the request body (the log-injection guard). `toMatchObject` (not `toEqual`) so the test pins the contract fields without coupling to `type: 'about:blank'`.
- The missing-header path and the bad-signature path return the *same* answer in the route (both `problemJson(400, 'invalid_signature')`); the test exercises the bad-signature path via `tamperSignature`, the more attacker-realistic case.

Coverage of `[untested]` requirement: there is none that the test body doesn't cover — items 1–6 are all asserted. The only by-hand item (the read-aloud name check) is covered in Moment of truth; the writer needn't add untested-requirement code commentary here.

Callout worth making: this test registers no `fixtureSubscription` on purpose — at a glance that looks like a missing arrange step, but it is load-bearing. If the signature check ever regressed and let the body through, `onCheckoutCompleted` would call the stubbed `subscriptions.retrieve`, `lookupSubscription` would throw "not registered," and the test would fail loudly — a second, independent signal that the front door held. Use an `Aside` (note) for this.

A short scope note: the three integration tests live in **separate files** (one per behavior story) rather than one file with three `it` blocks — the trade-off is `--reporter=verbose` readability versus parallel runtime; the starter chose separate files. One sentence, no need to belabor.

No `CodeVariants` or `CodeTooltips` needed — there is no before/after and no inferred-type teaching here. A plain `Code` block would also serve if `AnnotatedCode`'s three-step focus feels heavy; prefer `AnnotatedCode` because the no-registration omission and the negative-assertion sweep are exactly the two things a student skims past.

No diagram — the prose and the three-step annotation carry the flow; the route's verify→claim→dispatch ordering is owned by lesson 4 of chapter 065 and was diagrammed there.

### Moment of truth

The test command and expected pass output, plus the by-hand check for the one requirement the test doesn't assert.

- Run `pnpm test:integration`. Expected: `3 passed`. (`Code` block showing the Vitest summary line.)
- Re-run immediately with no reset — still `3 passed` (rollback discipline holds across the now-complete suite).
- Run `pnpm test:integration -- --reporter=verbose` and confirm the new `describe` / `it` line names the behavior.

By-hand checklist (`Checklist`/`ChecklistItem`, `untested` chip), the student ticks as they confirm:

- `[untested]` With `--reporter=verbose`, the `it` name read aloud names the behavior ("rejects with 400 problem+json and writes nothing when the signature is tampered") without reading the body (lesson 4 of chapter 086 read-aloud test).
- `[untested]` Temporarily delete the signature-verification `try/catch` in the route so an unsigned/tampered body flows through, re-run — this test fails on the 400 assertion while the happy-path and idempotency tests stay green (failure localizes to this behavior). Restore after. (This is the mutation drill previewed for lesson 6's suite-wide pass, but doing the one-mutation version here makes the negative-proof point land; keep it optional/by-hand so it doesn't bleed into lesson 6's scope.)

## Scope

- The Playwright money-path test (`checkout-money-path.spec.ts`), Stripe Checkout iframe driving, and the suite-wide mutation + coverage drills — **lesson 6 of chapter 091**.
- The route handler's verify → claim → dispatch transaction discipline being tested here — built and explained in **lesson 4 of chapter 065**; this lesson tests it, doesn't re-teach it.
- The `@/db` Proxy mock, the Stripe SDK stub, `withRollback`, `signedInAs`, `postWebhook`, and MSW wiring — all walked in **lesson 2 of chapter 091**; reference, don't re-explain.
- Mocking at the network boundary and `onUnhandledRequest: 'error'` — **lessons 4 and 5 of chapter 088**.
- AAA, one-behavior-per-test, behavior-over-implementation, the read-aloud name test — **lesson 4 of chapter 086**.
- The happy-path and idempotency tests — **lessons 3 and 4 of chapter 091** (the scaffold this lesson reuses).
