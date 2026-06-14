# Chapter 091 — Lesson 6 outline

## Lesson title

- Page title: **Driving Checkout end to end** (chapter-outline title fits — keep it).
- Sidebar (short): **Checkout E2E**

## Lesson type

`Implementation`

(Last lesson of the chapter. Test-coder runs for the one `[tested]` Playwright spec. This is also the chapter capstone: the *Moment of truth* runs suite-wide behavior-anchoring drills against all four tests, not just this one.)

## Lesson framing

The student installs the senior judgment that ends the testing pyramid: the one path that gets a Playwright test is the one whose failure moves money — a user pays and gets nothing, or gets the plan without paying. They ship a single browser test that drives the full Upgrade-to-Pro money path against a production build (sign-in via `storageState`, Stripe Checkout iframe, the redirect-vs-webhook race, the success-page poller) and assert only on what the user sees, because the integration suite already owns the DB write. Then — as the chapter capstone — they run the mutation, refactor, network-boundary, coverage, and trace-artifact drills that prove the whole four-test suite is anchored to behavior, not implementation, and walk away able to tell an over-asserting test from a real regression.

## Codebase state

### Entry
- Lessons 3-5 complete: the three integration tests (`webhook-checkout-completed.int.test.ts`, `webhook-idempotency.int.test.ts`, `webhook-signature-rejected.int.test.ts`) are written and green — `pnpm test:integration` reports `3 passed`, twice in a row.
- `tests/e2e/checkout-money-path.spec.ts` is still the starter stub: `// TODO(L6)` + `test.fixme('admin can upgrade to Pro via Stripe Checkout', async () => {})`. `pnpm test:e2e` runs the `setup` project (writes `.auth/admin.json`) and the chromium project finds only the fixme'd spec.
- All harness is provided and untouched from lesson 2: `tests/e2e/fixtures.ts` (`adminPage`, `orgSlug`), `tests/e2e/auth.setup.ts` (API sign-in), `tests/e2e/helpers/fill-stripe-card.ts`, `playwright.config.ts` (`webServer: pnpm build && pnpm start -p 3001`, `storageState`, `trace: on-first-retry`). The carried 065 app (`/inspector`, `checkout-button.tsx`, `/billing/success` Poller, the webhook route + `lib/webhooks/**`, `lib/billing/**`) is unchanged.
- `saas_e2e` is seeded (`pnpm db:e2e:reset`): one `e2e-org`, `admin@e2e.test`, a `free` `plan_entitlements` row. `.env.test.local` carries the student's real `sk_test_` key and `E2E_ADMIN_PASSWORD`.

### Exit
- `tests/e2e/checkout-money-path.spec.ts` is the one written Playwright test; `pnpm test:e2e` reports `1 passed` with a per-step trace in `playwright-report/index.html`.
- No production code changed (mutation drills are reverted via `git checkout`). The chapter's full deliverable is complete: 3 integration tests + 1 E2E test, all behavior-anchored, all green twice in a row.
- The student has run the suite-wide drills (mutation localization, refactor-without-break, network-boundary proof, branch-coverage diagnostic, trace artifact on failure) and named the homework gaps the suite is structured to absorb (`onSubscriptionUpdated`/`onSubscriptionDeleted`/Portal-cancellation tests, the ordering-predicate test, the `unknown_plan` throw).

## Lesson sections

Implementation section order from the contract: intro (Goal + Finished result, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: drive the full Upgrade-to-Pro money path in a real browser and prove the user ends up on Pro. Then a one-paragraph (or `Screenshot`) description of the feature working: `/inspector` reads `free` → click Upgrade → Stripe Checkout → fill `4242` card → land on `/billing/success` ("finalizing" → "you are all set / your plan is now pro") → reload `/inspector`, now `pro`. State the finished result: `pnpm test:e2e` → `1 passed`, `playwright-report/index.html` opens with a trace per step. Optionally a `Screenshot` of the green Playwright HTML report.

### Your mission (header)
Prose paragraph (no subsection headers, no implementation hints). Weave in:
- **Feature (user terms):** an end-to-end browser test for the Upgrade-to-Pro money path — the one flow whose failure costs money (user pays, gets nothing; or gets the plan without paying). This is money path #2 (link to lesson 1 of chapter 090 for the money-path filter).
- **Constraints that shape the solution:** assert only on what the *user sees* in the browser — the integration tests already own the row write, so a DB assertion here covers the same bug at higher cost (link lesson 3 of chapter 090). Runs against the production build via `webServer` on 3001, signs in once via `storageState` (the `adminPage` fixture), role-first locators + testids throughout, no `waitForTimeout` (rely on auto-waiting `expect.toHaveURL/toHaveText/toBeVisible`). Entry is `/inspector` (carried 065 app has no standalone `/billing` page); return lands on `/billing/success`.
- **The two pieces of orchestration named as constraints, not hints:** the Stripe Checkout iframe is fragile third-party HTML centralized in the provided `fill-stripe-card.ts`; and the webhook must actually reach the local server — `pnpm stripe:listen` (`stripe listen --forward-to localhost:3001/api/webhooks/stripe`) must run in a second terminal or the poller times out. The success page polls for the webhook-written entitlement (webhook-as-single-writer, chapter 065), not Stripe's API.
- **Out of scope (one line):** Portal cancellation (lives at `billing.stripe.com`, Playwright can't drive reliably; its projection is integration-test homework). Chromium only (WebKit/Firefox deferred to CI cost discipline).

Then the requirements checklist (`Checklist`/`ChecklistItem`, the only list in this section). Tag each `[tested]` — the test-coder asserts all of these in the one spec:
1. `[tested]` On `/inspector`, the admin sees the `entitlement-plan` testid reading `free` (the e2e seed).
2. `[tested]` Clicking "Upgrade to Pro" redirects the browser to `checkout.stripe.com`.
3. `[tested]` Filling the card iframe with `4242 4242 4242 4242` and submitting returns the browser to `/billing/success`.
4. `[tested]` During the redirect-vs-webhook race, the success page shows its "finalizing" copy.
5. `[tested]` Once the webhook lands and `plan_entitlements` updates, the poller flips the page to the "you are all set / your plan is now pro" copy.
6. `[tested]` Reloading `/inspector` shows `entitlement-plan` reading `pro` — the entitlement persisted.

(No `[untested]` requirements — this single E2E test asserts every step it claims. The behavior-anchoring proofs that are not test assertions are run in *Moment of truth* as a by-hand capstone, not as requirements of this feature.)

### Coding time (header; writer wraps the solution in `<details>`)
One line directing the student to implement `tests/e2e/checkout-money-path.spec.ts` against the brief and the harness; reference solution follows for after the attempt.

Reference solution — a single `test('admin can upgrade to Pro via Stripe Checkout', async ({ adminPage }) => {...})` importing `{ test, expect }` from `./fixtures` (not `@playwright/test` directly). Present as one `Code` block, organized exactly as it runs:
- `adminPage.goto('/inspector')`; `await expect(adminPage.getByTestId('entitlement-plan')).toHaveText('free')`.
- `adminPage.getByRole('button', { name: /upgrade to pro/i }).click()`; `await expect(adminPage).toHaveURL(/checkout\.stripe\.com/)`.
- `await fillStripeCard(adminPage)` — the provided helper drives `frameLocator('iframe[src*="js.stripe.com"]').first()`, `getByPlaceholder(/card number/i)`, `/mm \/ yy/i` (`12 / 34`), `/cvc/i` (`123`), best-effort `/zip|postal/i`. Do not re-explain the helper internals — link to lesson 2's walkthrough.
- `adminPage.getByRole('button', { name: /(start trial|subscribe|pay)/i }).click()`.
- `await expect(adminPage).toHaveURL(/\/billing\/success/, { timeout: 30_000 })`; `await expect(getByText(/finalizing/i)).toBeVisible()`; `await expect(getByText(/you are all set|your plan is now pro/i)).toBeVisible({ timeout: 30_000 })`.
- `adminPage.goto('/inspector')`; `await expect(adminPage.getByTestId('entitlement-plan')).toHaveText('pro')`.

If the solution `Code` block benefits from directing attention to the iframe seam and the two 30s timeouts, use `AnnotatedCode` instead of plain `Code`; otherwise plain `Code` is enough (the test is short and linear).

Decision rationale (one or two sentences each):
- Asserts on browser state, never the DB — integration tests own the row assertion; this test owns the composition (Stripe round-trip + webhook arrival + UI poll) no integration test can reach.
- The webhook reaches the local server only because `stripe listen` forwards to `localhost:3001`; without it the poller times out. Name this seam explicitly.
- The submit-button regex `/(start trial|subscribe|pay)/i` covers Stripe's trial-vs-no-trial label — 065 sets `trial_period_days: 14`, so the button reads "Start trial."
- `retries: 1` in CI is the *signal*, not the fix: a pass-on-retry leaves a trace for the failed attempt; the reviewer files a structural fix (better locator, longer webhook-race timeout) and removes the flake (link lesson 2 of chapter 090, trace-as-debugger).

`Aside` (caution) callout: a `pnpm test:e2e` run creates a real test-mode Checkout session + subscription in the student's Stripe dashboard (`dashboard.stripe.com/test/checkouts`). Test-mode data persists and needs no cleanup.

External resources, if any, are appended here after the `<details>` with no header (added later by the resourcer) — candidates: Playwright iframe/`frameLocator` docs, the Stripe test-card reference. A `VideoCallout` may sit in the body.

### Moment of truth (header)
This is the chapter capstone — run the full verification top to bottom, confirming not just this test but that the whole four-test suite is behavior-anchored. Lay the commands out with `Steps` and the by-hand drills as a `Checklist`.

Command sequence (`Steps`):
1. **Integration suite green twice:** `pnpm db:test:setup` (idempotent) → `pnpm test:integration` → `3 passed`; immediately again → `3 passed`. Then `psql $DATABASE_URL_TEST` and confirm `processed_events`, `plan_entitlements`, `organization`, `audit_logs` are all empty — rollback left nothing behind.
2. **Playwright suite green:** `pnpm db:e2e:reset` → start `pnpm stripe:listen` in a second terminal (forwards webhooks to `localhost:3001`) → `pnpm test:e2e` → `1 passed`. Note the run takes ~30-90s (webhook arrival is the bottleneck, usually 2-5s, can spike).
3. Open `playwright-report/index.html` and walk the trace — every action, locator, screenshot, and the network log showing the redirect to `checkout.stripe.com` and back. The trace is the debugger (lesson 2 of chapter 090); no `console.log`.

Then a by-hand `Checklist` of the behavior-anchoring proofs (each item phrased as a verifiable outcome; restore via `git checkout` after each mutation):
- **Mutation drills isolate failure.** Comment out `claimEvent` in the route transaction → only the idempotency test fails (`processed_events` = 2, entitlement written twice, two audit rows); happy-path and signature tests stay green. Skip signature verification → only the signature-rejection test fails on `status === 400`. Force `subscriptionToEntitlement` to return `plan: 'free'` → only the happy-path plan assertion fails. Remove the `audit_logs` write from `onCheckoutCompleted` → only the happy-path audit assertion fails. Remove the `lastEventAt < event.created` predicate → all three stay green (the ordering case is a named homework gap, not covered here).
- **Refactor without breaking.** Rename `subscriptionToEntitlement` → `projectSubscription`, rename dispatch helpers, restructure the switch into a Record dispatch → all three integration tests stay green (lesson 4 of chapter 086).
- **Network-boundary proof.** `resendCalls` is empty in all three integration tests (no email off the webhook in this project; Unit 13 owns that); `subscriptions.retrieve` resolved through the registered fixture exactly where expected (the signature-rejected test registers none — the retrieve is never reached); `onUnhandledRequest: 'error'` would have failed the suite on any stray outbound call.
- **Coverage diagnostic.** `pnpm test:integration --coverage`, open `coverage/index.html`, read the **branch** column (not line — lesson 3 of chapter 086) for `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, the route. Name the uncovered branches as homework: `onSubscriptionUpdated`, `onSubscriptionDeleted`, the `resolveOrgIdFromCustomer` not-found path, the `subscriptionToEntitlement` `unknown_plan` throw.
- **Trace artifact discipline.** Force the Playwright test to fail (assert `entitlement-plan` reads `'team'`), re-run, then `pnpm exec playwright show-trace test-results/.../trace.zip` and walk the DOM/network/screenshot at the failed assertion; restore.

Closing rule (prose, not a checklist item): if a mutation drill does not localize failure, the test is over- or under-asserting (a lesson 4 of chapter 086 violation) — point back to the owning lesson.

Component note for the writer: consider a `PlaywrightEmbed` (trace viewer prefilled with a public `trace.zip`) in either the Finished-result intro or step 3 of *Moment of truth*, so the student can scrub a passing trace inline before producing their own. Use only if a public trace is available; otherwise a `Screenshot` of the HTML report.

## Scope

- Does **not** write or modify the three integration tests — they are lessons 3, 4, 5; this lesson only runs them (as the capstone proof). Reference those lessons, do not re-explain webhook signing, idempotency, or the rollback harness.
- Does **not** re-explain the Playwright config, `storageState`, `webServer`, role-first locators, or the trace viewer — those are lesson 2 of chapter 090; reference them.
- Does **not** re-explain the `fill-stripe-card.ts` helper internals or the `/billing/success` Poller — both are walked in lesson 2 of this chapter; reference them.
- Does **not** cover the Portal-cancellation flow, the `subscription.updated`/`subscription.deleted` paths, or the ordering-predicate test — named as homework gaps only; the suite is structured to absorb them.
- CI wiring of these suites (PR gating, `github` reporter annotations, artifact upload) is **out of scope** — chapter 097 owns it (Unit 20). Mention only as a forward reference.
- Sentry/PostHog surfacing of the webhook's structured logs is chapter 092 (Unit 19) — forward reference only.
