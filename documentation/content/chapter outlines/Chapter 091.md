# Chapter 091 — Project: testing the Stripe webhook and Checkout money path

## Chapter framing

Chapter 091 takes the Chapter 065 webhook surface and proves it with the testing discipline installed across Chapters 086–090: integration tests running against a real test Postgres with per-test transaction rollback, MSW stubbing the outbound Resend call at the network boundary, Stripe's `subscriptions.retrieve` stubbed at the SDK seam (MSW cannot intercept `stripe@22`'s `NodeHttpClient`), the `signedInAs` fixture from lesson 3 of chapter 088 seeding an org and its `plan_entitlements` row, and assertions on the `plan_entitlements` row, the `processed_events` claim row, the `audit_logs` write, and the JSON response body. One Playwright test then drives the full money path against a production build: sign-in via `storageState`, click Upgrade on the inspector page, complete Stripe Checkout with the `4242` test card, return to `/billing/success`, watch the poller flip the UI to Pro.

The chapter's stated goals — each a test the student writes, runs green, and proves localizes failure:

- The integration suite runs green on a clean DB and runs green again on an immediate re-run with no reset — the rollback discipline leaves zero rows behind (the student confirms no orphan rows in `processed_events`, `plan_entitlements`, `audit_logs`, `user`, `organization`).
- A happy-path integration test drives a signed `checkout.session.completed` event through the real route handler and asserts on the contract surface — `Response.status`, the JSON body, the `plan_entitlements` row fields, the `processed_events` claim row, the `audit_logs` row, and `resendCalls` — never on `lib/webhooks/stripe.ts` internals or private helpers.
- A duplicate-event test sends the same event twice and proves idempotency: first call `200`, `processed_events` rows = 1, entitlement updated, audit row written; second call `200` with `{ duplicate: true }`, `processed_events` rows still 1, `plan_entitlements.updatedAt` unchanged, `audit_logs` rows still 1.
- A signature-tampered test proves rejection before any work: `400` with `application/problem+json`, `processed_events` rows = 0, no DB writes, `resendCalls.length === 0`.
- A Playwright test covers the full money path: sign in via `storageState`, navigate to `/inspector`, confirm the `entitlement-plan` testid reads `free`, click "Upgrade to Pro", land on `checkout.stripe.com`, fill `4242 4242 4242 4242` in the card iframe, submit, return to `/billing/success`, poll until the "you are all set / your plan is now pro" copy is visible, then confirm `/inspector` now reads `pro`.
- Deliberate handler mutations fail only the expected test: removing `claimEvent` fails only the duplicate-event test, skipping signature verification fails only the signature-tampered test, forcing `subscriptionToEntitlement` to return `plan: 'free'` fails only the happy-path plan assertion — the structural proof the suite is behavior-anchored.

Threads that run through every lesson. The honeycomb shape from lesson 2 of chapter 086 maps directly: integration tests cover the webhook seam where the framework, the database, the Stripe signature contract, and the outbound email all meet — the bug-density layer; the one Playwright test covers the composition (auth + the upgrade Server Action + Stripe round-trip + webhook + UI poll) that no integration test alone can catch. **Mock at the network boundary, not the function** (lesson 4 of chapter 088) — MSW intercepts the Resend POST; the test never reaches into `lib/email.ts`. Stripe is the one exception forced by the runtime: `stripe@22`'s `NodeHttpClient` never dispatches over MSW's mock socket, so `subscriptions.retrieve` is stubbed at the SDK seam via `vi.mock('@/lib/billing/stripe')` reading a per-test registry, while `webhooks.*` stay real (signature verification is local). **Real Postgres, transaction rollback per test** (lesson 1 of chapter 088) — the integration suite shares one test DB across files, each test wraps in a Postgres transaction that rolls back at teardown, leaving no state between tests; the real route's `db.transaction` joins the same `tx` because `@/db` is mocked with a Proxy that resolves to the `testTxContext`-current transaction, so the route runs unedited. **One behavior per test, behavior over implementation** (lesson 4 of chapter 086) — each test asserts on the `plan_entitlements` row, the `processed_events` row, the `audit_logs` row, and the Resend handler call surface — every assertion is a contract the caller observes, none on private helpers. **Playwright against the production build via `webServer`** (lesson 2 of chapter 090), `storageState` for auth (one-time login), role-first locators, `trace: 'on-first-retry'`, `retries: 1` in CI, separate `saas_e2e` Postgres with deterministic seed. The chapter's two terminal commands the student types daily: `pnpm test:integration` (Vitest) and `pnpm test:e2e` (Playwright).

Forward references. **Unit 20 (CI):** the integration and Playwright suites both run on every PR; the Playwright `github` reporter annotates the Actions run; the HTML report and trace zips are uploaded as artifacts; merge is gated on green — chapter 097 owns the wiring. **Unit 19 (observability):** in production the webhook handler emits structured logs the integration suite asserts on indirectly (via the disposition string in the response body); chapter 092 reads those logs and surfaces them in Sentry/PostHog. **Homework extensions:** a fourth integration test for the ordering predicate (`subscription.updated` with an older `created` than `lastEventAt` no-ops), a fifth for the `subscription.deleted` path, and a Portal-cancellation projection test — all reuse this chapter's helpers and cost minutes apiece; the suite is structured to absorb them.

### Dependency carry-in

- **From Chapter 065 (the project under test):** the `app/api/webhooks/stripe/route.ts` handler (verify → claim → dispatch in one `db.transaction`); `lib/webhooks/stripe.ts` (the three handlers, `dispatch`, and `resolveOrgIdFromCustomer`) and `lib/webhooks/processed-events.ts` (`claimEvent`); `lib/billing/projection.ts` (`subscriptionToEntitlement`); `src/db/queries/entitlements.ts` (`getEntitlement`, `hasActiveAccess`); `lib/billing/upgrade.ts` (the `authedAction` that creates/reuses the Stripe Customer, resolves the Price by `lookup_key`, and opens the Checkout session); `lib/billing/portal.ts` and `require-plan.ts`; the `processed_events`, `plan_entitlements`, `audit_logs`, `organization` tables (the `organization` table carries the app-added `stripeCustomerId` column); the `(protected)/inspector` page — the upgrade and portal controls live here (the carried app has no standalone `/billing` page), so the Playwright test enters at `/inspector` and the student uses the same page for debugging.
- **From lesson 1 of chapter 086 (Vitest setup):** the single `vitest.config.ts` root with `test.projects` and the `globals: false` rule. This chapter adds a second project — `integration` — alongside the `lesson` project, both inside the same `vitest.config.ts`: `environment: 'node'`, `include: ['tests/integration/**/*.int.test.ts']`, `setupFiles: ['./src/test/integration-setup.ts']`, `fileParallelism: false`, and a `server-only`/`client-only` → empty-module alias so the route's transitive `server-only` import does not throw under Node. `vite-tsconfig-paths` must sit inside each project's `plugins` (Vitest 4 does not propagate root plugins into `test.projects`). The integration suite runs via `pnpm test:integration` (`vitest run --project integration`); the e2e suite via `pnpm test:e2e` (`playwright test`).
- **From lesson 4 of chapter 086 (AAA, behavior over implementation):** every test in the chapter follows Arrange / Act / Assert with blank-line separation; the assertions hit the contract surface (row in DB, Result shape, MSW handler call count), never private helpers.
- **From lesson 1 of chapter 088 + lesson 2 of chapter 088 (real test Postgres, transaction rollback):** the starter ships `scripts/test-db-setup.ts` (creates `saas_int_test`, runs migrations); per-test wrapping is the `withRollback(async ({ tx }) => { ... })` helper at `src/test/db/with-rollback.ts`, which opens a transaction on the lazily-memoized test client (`src/test/db/worker-db.ts`), runs the body inside `testTxContext.run(tx, …)`, then throws a private `RollbackSignal` to discard everything. The test DB is one schema shared across files, so isolation is per-test rollback, not per-worker (`fileParallelism: false`).
- **From lesson 3 of chapter 088 (auth fixtures):** the starter ships `src/test/fixtures/auth.ts` exporting exactly `signedInAs(opts, tx)` and `anonymous()` — `signedInAs({ role: 'admin' }, tx)` inserts the user, org, membership, session, and a `free` `plan_entitlements` row inside `tx` and returns `{ user, org, session, cookieJar }`. Note the project-specific reality: the Stripe webhook route is session-less, so the three integration tests use `signedInAs` only to seed the org and its entitlement (plus a follow-up `tx.update` to set `stripeCustomerId`); the session stub is inert on the webhook path.
- **From lesson 4 of chapter 088 + lesson 5 of chapter 088 (MSW at the network boundary):** the starter ships `src/test/msw/server.ts` and `src/test/msw/handlers/resend.ts` — the latter intercepts `POST https://api.resend.com/emails` and records the request into `resendCalls`. `server.listen({ onUnhandledRequest: 'error' })` runs once in setup; `server.resetHandlers()` runs `afterEach`. MSW carries only Resend; Stripe's `subscriptions.retrieve` is stubbed at the SDK seam (`vi.mock('@/lib/billing/stripe')`) reading a per-test registry (`src/test/stripe-retrieve-registry.ts`), because `stripe@22`'s `NodeHttpClient` never dispatches over MSW's mock socket and would hang.
- **From lesson 6 of chapter 088 (webhook signature + idempotency testing):** the canonical request-builder `postWebhook(event, { tamperSignature?, secret? })` at `src/test/helpers/post-webhook.ts` serializes the event once, signs that exact string with the real `stripe.webhooks.generateTestHeaderString({ payload, secret })`, optionally flips one character of the signature, and calls the route handler directly via the `POST` import from `app/api/webhooks/stripe/route`.
- **From lesson 7 of chapter 088 (Server Action e2e):** the chapter does not exercise a Server Action directly in the integration suite — the system under test is the session-less webhook route, not an `authedAction`. The `{ db: tx }`-handle convention is named as the pattern a Server-Action test would use, but no integration test here calls it; the upgrade Server Action is exercised only through the browser in the one Playwright money-path test.
- **From lesson 8 of chapter 088 (test isolation, flake budget):** `it.concurrent` is off by default in the integration project; files run one at a time (`fileParallelism: false`); the per-test rollback boundary makes cross-test isolation structural.
- **From lesson 1 of chapter 090 + lesson 2 of chapter 090 (Playwright primitives):** `playwright.config.ts` with `webServer: 'pnpm build && pnpm start'`, `storageState` per role, `trace: 'on-first-retry'`, role-first locators, `expect`'s auto-waiting matchers. The chapter installs one new piece — driving Stripe Checkout's iframe.
- **From lesson 3 of chapter 090 (the money-path catalog):** the Stripe Checkout round-trip is money path #2; the chapter implements it concretely.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml                       # provided: `db` (postgres:18, the dev DB on 5432); a second
                                         #           service `postgres-test` on 55432 holding BOTH test DBs
                                         #           (saas_int_test + saas_e2e), with fsync/commit tuned off
playwright.config.ts                     # provided: webServer (pnpm build && pnpm start -p 3001 against
                                         #           DATABASE_URL_E2E), storageState wiring, setup + chromium
                                         #           projects, trace on first retry, retries 1 in CI / 0 local
vitest.config.ts                         # provided: ONE root config with two projects — `lesson`
                                         #           (lesson-verification/**) + `integration`
                                         #           (tests/integration/**/*.int.test.ts, setupFiles,
                                         #           fileParallelism: false, server-only → empty-module alias)
package.json                             # provided: test:integration, test:integration:watch, test:e2e,
                                         #           db:test:setup, db:e2e:reset, seed:stripe, stripe:listen
.env.test                                # provided (committed, no real secrets): DATABASE_URL_TEST,
                                         #           DATABASE_URL_E2E, STRIPE_WEBHOOK_SECRET (whsec_test_...),
                                         #           STRIPE_SECRET_KEY (sk_test_ placeholder),
                                         #           RESEND_API_KEY=fake_intercepted_by_msw, APP_URL, ...065 env
.env.test.local.example                  # provided: template for the gitignored .env.test.local —
                                         #           student's real sk_test_ key + E2E_ADMIN_PASSWORD
scripts/
  test-db-setup.ts                       # provided: creates saas_int_test, runs migrations (idempotent)
  e2e-db-reset.ts                        # provided: resets saas_e2e, runs migrations + e2e seed
  seed-e2e.ts                            # provided: one org (e2e-org), admin@e2e.test, member@e2e.test,
                                         #           one free plan_entitlements row
src/
  test/                                  # test harness — not imported by production code
    empty-module.ts                      # provided: blank stub aliased to server-only/client-only
    load-test-env.ts                     # provided: side-effect — dotenv .env.test + TZ=UTC
    integration-setup.ts                 # provided: vi.mock('@/db') Proxy + vi.mock('@/lib/billing/stripe')
                                         #           subscriptions.retrieve + MSW lifecycle + prod-URL guard
    stripe-retrieve-registry.ts          # provided: per-test Map<id, Stripe.Subscription>
    db/
      worker-db.ts                       # provided: lazy memoized test Drizzle client (DATABASE_URL_TEST)
      with-rollback.ts                   # provided: testTxContext.run + RollbackSignal wrapper
    fixtures/
      auth.ts                            # provided: signedInAs(opts, tx), anonymous()
      stripe-events.ts                   # provided: checkoutCompleted, subscriptionUpdated,
                                         #           subscriptionDeleted event factories
      stripe-subscription.ts             # provided: fixtureSubscription(opts) — minimal Stripe.Subscription
    msw/
      server.ts                          # provided: setupServer (Resend only)
      handlers/
        resend.ts                        # provided: records POST /emails into resendCalls; returns 200
    helpers/
      post-webhook.ts                    # provided: signs event + invokes the real POST route handler
                                         #           (the handler joins the test tx via the @/db mock)
  app/api/webhooks/stripe/route.ts       # provided from Chapter 065 (unchanged)
  lib/billing/**                         # provided from Chapter 065 (unchanged)
  lib/webhooks/**                        # provided from Chapter 065 (unchanged)
tests/
  integration/
    webhook-checkout-completed.int.test.ts   # TODO student (lesson 3 of chapter 091)
    webhook-idempotency.int.test.ts          # TODO student (lesson 4 of chapter 091)
    webhook-signature-rejected.int.test.ts   # TODO student (lesson 5 of chapter 091)
  e2e/
    auth.setup.ts                            # provided: API sign-in of admin, writes .auth/admin.json
    fixtures.ts                              # provided: adminPage (storageState) + orgSlug constant
    checkout-money-path.spec.ts              # TODO student (lesson 6 of chapter 091)
    helpers/
      fill-stripe-card.ts                    # provided: fills the Stripe Checkout card iframe
.auth/                                       # gitignored — populated by auth.setup.ts
```

### Reference-solution signatures lessons display

- **The integration setup file** (`src/test/integration-setup.ts`):
  - First line is `import '@/test/load-test-env'` (side-effect — `dotenv` `.env.test` + `process.env.TZ = 'UTC'` before any `@/…` body reads `process.env`).
  - A fail-fast guard throws unless `DATABASE_URL_TEST` includes `localhost:55432` (refuses to run the destructive suite against anything else).
  - `vi.mock('@/db', …)` returns a Proxy whose `get` resolves every member to `testTxContext.getStore() ?? getTestDb()` and whose `transaction(fn)` runs `fn(tx)` directly on the in-scope tx — so the route's `db.transaction` becomes a no-op join and the outer `withRollback` owns the rollback.
  - `vi.mock('@/lib/billing/stripe', …)` replaces only `stripe.subscriptions.retrieve` (reads `lookupSubscription` from the registry); `webhooks.*` stay real.
  - `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`; `afterEach` runs `server.resetHandlers()`, `resendCalls.length = 0`, `resetSubscriptions()`; `afterAll(() => server.close())`.
- **The rollback helper** (`src/test/db/with-rollback.ts`):
  - `withRollback(body: (ctx: { tx: Transaction }) => Promise<void>): () => Promise<void>` — opens `getTestDb().transaction`, runs the body inside `testTxContext.run(tx, …)`, then throws `RollbackSignal`; the `catch` swallows only that signal and rethrows everything else (so a real assertion failure still fails the test). Used as `it('…', withRollback(async ({ tx }) => { … }))`.
- **The auth fixture** (`src/test/fixtures/auth.ts`):
  - `signedInAs(opts: SignedInOptions, tx: Transaction): Promise<SignedIn>` — inserts user + org + membership + session + a `plan_entitlements` row (default `plan: 'free'`) inside `tx`, returns `{ user, org, session, cookieJar }`. `SignedInOptions` is `{ role?, plan?, orgId? }`, defaulting to `role: 'member'`, `plan: 'free'`; pass `{ role: 'admin' }` for the admin case. The session/cookieJar exist only to satisfy the 088 fixture shape — the webhook route is session-less and never reads them.
  - `anonymous(): { cookieJar: {} }` — the signed-out marker. The module exports exactly these two.
- **The webhook request helper** (`src/test/helpers/post-webhook.ts`):
  - `postWebhook(event: Stripe.Event, opts?: { tamperSignature?: boolean; secret?: string }): Promise<Response>` — `JSON.stringify(event)` once, signs that exact string with `stripe.webhooks.generateTestHeaderString({ payload, secret })` (secret defaults to `env.STRIPE_WEBHOOK_SECRET`), optionally flips one character of the signature when `tamperSignature: true`, builds a `Request` with `content-type: application/json` and `stripe-signature: <sig>`, calls `POST(request)` imported from `app/api/webhooks/stripe/route`. Returns the raw `Response`.
- **The Stripe event factory** (`src/test/fixtures/stripe-events.ts`):
  - `checkoutCompleted({ orgId, customerId, subscriptionId, eventId?, createdAt? }): Stripe.Event` — fully-typed event with `subscription_data.metadata.organization_id = orgId`.
  - `subscriptionUpdated({ orgId?, subscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd, lookupKey?, eventId?, createdAt? }): Stripe.Event`.
  - `subscriptionDeleted({ subscriptionId, eventId?, createdAt? }): Stripe.Event`.
  - Defaults make `eventId`/`createdAt` deterministic-but-unique per call; tests override `eventId` explicitly for ordering / idempotency drills.
- **The Stripe subscription fixture** (`src/test/fixtures/stripe-subscription.ts`):
  - `fixtureSubscription({ id, lookupKey?, status?, currentPeriodEnd?, cancelAtPeriodEnd?, quantity?, orgId? }): Stripe.Subscription` — populates item-level fields only (the projection reads item-level `lookup_key` / `current_period_end`). Registered per test via `registerSubscription(...)`.
- **The Stripe retrieve registry** (`src/test/stripe-retrieve-registry.ts`):
  - `registerSubscription(sub)`, `lookupSubscription(id)` (throws if not registered), `resetSubscriptions()` (called in `afterEach`). The `vi.mock`'d `subscriptions.retrieve` reads through `lookupSubscription`.
- **Calling Server Actions** — not used in the integration suite. The system under test is the session-less webhook route; the upgrade `authedAction` is exercised only through the browser in the Playwright money-path test.
- **The Resend MSW handler** (`src/test/msw/handlers/resend.ts`):
  - Exports `resendHandlers: HttpHandler[]` and `resendCalls: ResendCall[]` (`ResendCall = { to; subject; html? }`). The handler records every call; tests `expect(resendCalls).toHaveLength(0)` (no email fires off the webhook in this project). The `afterEach` resets the array.
- **The Playwright fixtures** (`tests/e2e/fixtures.ts`):
  - `export const test = base.extend<{ adminPage: Page; orgSlug: string }>({ adminPage: async ({ browser }, use) => { const context = await browser.newContext({ storageState: '.auth/admin.json' }); const page = await context.newPage(); await use(page); await context.close(); }, orgSlug: 'e2e-org' });` and `export { expect } from '@playwright/test';`.
- **The Playwright config's key lines** (`playwright.config.ts`):
  - `testDir: 'tests/e2e'`, `fullyParallel: true`, `retries: process.env.CI ? 1 : 0`, `reporter: [['github'], ['html']]`, `use: { baseURL: 'http://localhost:3001', trace: 'on-first-retry', screenshot: 'only-on-failure' }`, `webServer: { command: 'pnpm build && pnpm start -p 3001', url: 'http://localhost:3001', reuseExistingServer: !process.env.CI, env: { DATABASE_URL: DATABASE_URL_E2E, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL } }`, `projects: [{ name: 'setup', testMatch: /auth\.setup\.ts/ }, { name: 'chromium', dependencies: ['setup'], use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' } }]`.
- **The auth setup** (`tests/e2e/auth.setup.ts`):
  - `setup('authenticate as admin', async ({ page }) => { const password = process.env.E2E_ADMIN_PASSWORD; … const response = await page.request.post('/api/auth/sign-in/email', { data: { email: 'admin@e2e.test', password } }); expect(response.ok()).toBe(true); await page.goto('/dashboard'); await expect(page).toHaveURL(/\/dashboard/); await page.context().storageState({ path: '.auth/admin.json' }); });` — authenticates via the Better Auth API endpoint (the form's React-Compiler `useActionState` submit is unreliable under Playwright).
- **The Stripe card helper** (`tests/e2e/helpers/fill-stripe-card.ts`):
  - `fillStripeCard(page: Page, card = '4242 4242 4242 4242'): Promise<void>` — `frameLocator('iframe[src*="js.stripe.com"]').first()`, then `getByPlaceholder(/card number/i)` (auto-waited visible), `/mm \/ yy/i` (`12 / 34`), `/cvc/i` (`123`), and best-effort `/zip|postal/i`.
- **Env entries** (`.env.test`, committed):
  - `DATABASE_URL_TEST=postgres://test:test@localhost:55432/saas_int_test`
  - `DATABASE_URL_E2E=postgres://test:test@localhost:55432/saas_e2e`
  - `DATABASE_URL` / `DATABASE_URL_UNPOOLED` point at `saas_int_test` (so `import { env }` succeeds in-process)
  - `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` (fixed test-only secret; `postWebhook` and the route sign/verify with the same value)
  - `STRIPE_SECRET_KEY=sk_test_EXAMPLE_NOT_REAL` (placeholder; integration tests never call live Stripe — `subscriptions.retrieve` is stubbed; the Playwright test needs a real `sk_test_` key from `.env.test.local`)
  - `RESEND_API_KEY=fake_intercepted_by_msw`, `APP_URL=http://localhost:3001`, plus test-safe literals for the remaining 065 env
  - `.env.test.local` (gitignored): the student's real `STRIPE_SECRET_KEY` and `E2E_ADMIN_PASSWORD`

### Concepts demonstrated → owning lesson

- Vitest config, `test.projects`, `vitest.config.ts` and the integration project — lesson 1 of chapter 086.
- Honeycomb shape, integration as center of gravity, bug density at the seams — lesson 2 of chapter 086.
- Arrange / Act / Assert, one behavior per test, behavior over implementation, assertion on the caller-observable contract — lesson 4 of chapter 086.
- Integration tests against real Postgres with per-test transaction rollback — lesson 1 of chapter 088, lesson 2 of chapter 088.
- Auth fixtures for signed-in admin/member with an org — lesson 3 of chapter 088.
- Mocking at the network boundary, not the function (Resend via MSW; Stripe `subscriptions.retrieve` stubbed at the SDK seam because `stripe@22` won't dispatch over MSW) — lesson 4 of chapter 088, lesson 5 of chapter 088.
- Webhook handler testing: signing requests, replay, tamper — lesson 6 of chapter 088.
- Server Action end-to-end testing convention (`{ db: tx }` handle) — named, but exercised only through the browser here, since the integration suite's SUT is the session-less webhook route — lesson 7 of chapter 088.
- Test isolation, no shared mutable state, the cost of flake — lesson 8 of chapter 088.
- The money-path filter; Playwright is off by default; one path here because failure costs money — lesson 1 of chapter 090.
- Playwright config with `webServer`, `storageState`, role-first locators, auto-waiting `expect`, `trace: 'on-first-retry'` — lesson 2 of chapter 090.
- Stripe Checkout iframe locators, the `4242 4242 4242 4242` test card, the redirect-versus-webhook race resolved by the success-page poller — lesson 3 of chapter 090, lesson 3 of chapter 063.
- The webhook → DB → audit-log → email-send transaction discipline being tested — lesson 2 of chapter 063, lesson 4 of chapter 065, lesson 5 of chapter 065.
- The `subscription_data.metadata.organization_id` carry-channel — lesson 1 of chapter 064, lesson 6 of chapter 065.

---

## Lesson 1 — Project Overview

The student leaves with the test harness cloned, both Postgres databases up and seeded, and both empty suites confirmed booting. No test is written yet.

### What we're building

A layered test suite that proves the Chapter 065 Stripe webhook and Checkout money path: a set of integration tests that drive signed webhook events through the real route handler against a real test Postgres, plus one Playwright test that drives the full Upgrade-to-Pro money path against a production build. One figure: a screenshot of `pnpm test:integration` green beside the Playwright HTML report showing a passing run with an attached trace.

### What we'll practice

- Reading a test as a behavior contract — naming what each test proves from its name alone, and running it to confirm the behavior holds.
- Mocking at the network boundary — MSW intercepts Resend; Stripe's `subscriptions.retrieve` is stubbed at the SDK seam (MSW cannot intercept `stripe@22`'s `NodeHttpClient`) — never reaching into the handler internals.
- Integration tests against real Postgres with per-test transaction rollback, so the suite runs green twice with no cleanup between runs.
- Driving a money path end to end with Playwright on the production build — `storageState` auth, role-first locators, iframe handling for Stripe Checkout, the trace viewer as debugger.
- Proving a suite is behavior-anchored by mutating the handler and watching failure localize to the one test that asserts the mutated behavior.

### Architecture

The honeycomb shape from lesson 2 of chapter 086: integration tests sit at the center of gravity, covering the webhook seam where the framework, Postgres, the Stripe signature contract, and the outbound Resend call meet. One Playwright test sits above it, covering the composition (auth + upgrade action + Stripe round-trip + webhook + UI poll) no integration test can reach. Two terminal commands frame the work — `pnpm test:integration` (Vitest, real test Postgres, per-test rollback) and `pnpm test:e2e` (Playwright, production build via `webServer`, separate `saas_e2e` Postgres). The student writes only the four test files; every piece of harness — the two-project Vitest config, the `@/db` Proxy mock, the Stripe SDK stub + retrieve registry, the MSW Resend server, auth fixtures, the rollback helper, the Stripe event/subscription factories, the `postWebhook` helper, the Playwright config, the auth setup, the Stripe-card helper — ships in the starter.

### Starting file tree

See the annotated starter file tree in the Chapter framing above; the four TODO test files (`webhook-checkout-completed.int.test.ts`, `webhook-idempotency.int.test.ts`, `webhook-signature-rejected.int.test.ts`, `checkout-money-path.spec.ts`) are the highlighted focus. Everything else is provided.

### Roadmap

One Card per lesson in a CardGrid:

- **Lesson 2 — Reading the test harness.** Walks every provided fixture, helper, and config, then boots both empty suites to confirm the harness is alive.
- **Lesson 3 — The happy-path webhook test.** Drives a signed `checkout.session.completed` event through the real handler and asserts on the rows it writes.
- **Lesson 4 — The replay/idempotency test.** Sends the same event twice and proves the second send is a no-op.
- **Lesson 5 — The signature-tampered rejection test.** Tampers the signature and proves the request is rejected before any work.
- **Lesson 6 — Driving Checkout end to end.** Drives the full Upgrade-to-Pro money path with Playwright, then runs the suite-wide mutation and coverage drills.

### Setup

The student needs **two** Postgres databases — `saas_int_test` (integration tests, transaction rollback) and `saas_e2e` (Playwright, full reset), both inside the one `postgres-test` Docker service on port 55432; `docker compose up` brings up that service and `.env.test` points each `DATABASE_URL_*` at its own database name. `.env.test` is committed (it carries no real secrets) — the integration tests load it directly. The `.env.test.local` (gitignored) carries the student's own test-mode `STRIPE_SECRET_KEY` — needed only for the Playwright Checkout test to create a real test-mode session — and a chosen `E2E_ADMIN_PASSWORD`. The integration tests use a **fixed** `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` (not the `stripe listen` dynamic secret); the route handler and the `postWebhook` helper sign with the same env, so the contract is deterministic.

Command sequence (Steps component):

1. `degit` the starter and `cd` in.
2. `pnpm install`.
3. `docker compose up -d` — brings up the `db` and `postgres-test` services.
4. `cp .env.test.local.example .env.test.local` and fill in the student's Stripe test key and a chosen admin password.
5. `pnpm db:test:setup` — creates and migrates `saas_int_test`.
6. `pnpm db:e2e:reset` — creates, migrates, and seeds `saas_e2e`.

Env vars the student supplies in `.env.test.local`: `STRIPE_SECRET_KEY` (their own Stripe test-mode key, from `dashboard.stripe.com/test/apikeys`) and `E2E_ADMIN_PASSWORD` (any password the student chooses for the seeded admin user — `seed-e2e.ts` hashes the same value into the seeded credential, and `auth.setup.ts` signs in with it).

Expected result: `pnpm test:integration` runs and reports zero test files (the three `.int.test.ts` stubs are `describe.todo`, so no test executes); `pnpm test:e2e` runs `auth.setup.ts`, signs in via the Better Auth API, writes `.auth/admin.json`, then the chromium project finds only the `test.fixme` spec. Both databases are alive and seeded; the harness boots clean before any test is written.

---

## Lesson 2 — Reading the test harness

A walkthrough of every provided file in the starter — the two-project Vitest config, the integration setup (the `@/db` Proxy mock and the Stripe SDK stub), MSW Resend handler, auth fixtures, the rollback helper, the Stripe event/subscription factories, `postWebhook`, the Playwright config, the auth setup, and the Stripe-card helper — closing on a run of both empty suites that confirms the harness boots. No exercise; the student reads the contract surface before writing tests against it.

Walk the file tree, calling out provided vs. stubbed, then read the load-bearing files end to end:

- `vitest.config.ts`: one root config with two `test.projects` — `lesson` (`include: ['lesson-verification/**/*.ts']`) and `integration` (`environment: 'node'`, `globals: false`, `include: ['tests/integration/**/*.int.test.ts']`, `setupFiles: ['./src/test/integration-setup.ts']`, `fileParallelism: false`). Two senior reaches named once: `vite-tsconfig-paths` must sit inside *each* project's `plugins` (Vitest 4 does not propagate root plugins into `test.projects`, so a root-only placement leaves every `@/…` import unresolved); and the integration project aliases `server-only`/`client-only` to `src/test/empty-module.ts` so the route's transitive `server-only` import does not throw under the Node test env. `fileParallelism: false` because the test DB is one schema shared across files — isolation is per-test rollback, not per-worker (contrast lesson 2 of chapter 088's per-worker model, where files run parallel).
- `src/test/integration-setup.ts` (the heart of the harness): first imports `@/test/load-test-env` (side-effect — loads `.env.test` and pins `process.env.TZ = 'UTC'` before any `@/…` module body reads `process.env`; matches lesson 1 of chapter 083's production discipline). Then a fail-fast guard that throws unless `DATABASE_URL_TEST` includes `localhost:55432` (refuses to run the destructive suite against a real DB). Then the two mocks — read both end to end:
  - `vi.mock('@/db', …)`: a Proxy whose `get` resolves to `testTxContext.getStore() ?? getTestDb()` and whose `transaction(fn)` runs `fn(tx)` *directly* on the in-scope tx. This is the single seam that makes the real route testable with **zero SUT edits** — the route imports `{ db }` from `@/db` and opens `db.transaction(...)`; the mock makes that a no-op join onto the `withRollback` transaction, so the outer rollback owns cleanup. The senior anchor of the whole chapter.
  - `vi.mock('@/lib/billing/stripe', …)`: replaces only `stripe.subscriptions.retrieve` (reads `lookupSubscription` from the registry); `webhooks.*` stay real, so `generateTestHeaderString` (in `postWebhook`) and `constructEvent` (in the route) both verify for real. Names *why* Stripe is not on MSW: `stripe@22`'s `NodeHttpClient` never dispatches over MSW's mock socket and would hang — the lesson 5 of chapter 088 boundary still holds, but the seam moves to the SDK.
  - MSW lifecycle: `server.listen({ onUnhandledRequest: 'error' })` in `beforeAll` (fail loudly on any un-stubbed network call — the lesson 5 of chapter 088 discipline), `afterEach` resets handlers, clears `resendCalls`, and calls `resetSubscriptions()`; `afterAll` closes MSW.
- `src/test/db/with-rollback.ts`: opens `getTestDb().transaction`, runs the body inside `testTxContext.run(tx, …)` (so the `@/db` Proxy resolves to this tx), then throws a private `RollbackSignal` to discard every write the test and the route made. The senior callout: the `catch` swallows **only** `RollbackSignal` and rethrows everything else — a helper that catches-all would silently eat a real assertion failure. `src/test/db/worker-db.ts` is the lazy memoized test client it opens against `DATABASE_URL_TEST`. The `testTxContext` AsyncLocalStorage lives at `src/db/test-tx-context.ts` (stored on `globalThis` so the mocked `@/db` and the harness share one store); lesson 1 of chapter 088 teaches the depth.
- `src/test/fixtures/auth.ts`: `signedInAs(opts, tx)` inserts a user, an org (if `orgId` not supplied), a membership row, a session row, **and a `plan_entitlements` row** (default `plan: 'free'`) inside `tx`, returning `{ user, org, session, cookieJar }`; `signedInAs({ role: 'admin' }, tx)` is the admin case. The honest project-specific note (the file says so itself): the Stripe webhook route is **session-less** — it never calls `getSession` — so these three tests use `signedInAs` only to seed the org + entitlement the handler reads/writes; the returned `session`/`cookieJar` are inert here and exist only to satisfy the 088 fixture shape. `anonymous()` is the signed-out marker; the module exports exactly these two.
- `src/test/fixtures/stripe-events.ts`: three factories (`checkoutCompleted`, `subscriptionUpdated`, `subscriptionDeleted`) returning fully-typed `Stripe.Event` objects with `subscription_data.metadata.organization_id` set. Defaults make `eventId`/`createdAt` deterministic-but-unique per call — the senior reach: `eventId` is the dedup key, and reusing one across tests breaks isolation. Names the convention: idempotency tests override `eventId` explicitly; happy-path tests let it auto-generate.
- `src/test/fixtures/stripe-subscription.ts` + `src/test/stripe-retrieve-registry.ts`: `fixtureSubscription(...)` builds a minimal `Stripe.Subscription` (item-level `lookup_key` / `current_period_end` — what the projection reads); `registerSubscription(sub)` puts it in a per-test `Map`, `lookupSubscription(id)` reads it (throws if unregistered), `resetSubscriptions()` clears it in `afterEach`. The mocked `subscriptions.retrieve` resolves through `lookupSubscription` — so each test declares exactly the subscription `onCheckoutCompleted` will retrieve, and the signature-tampered test registers none on purpose.
- `src/test/msw/handlers/resend.ts`: `http.post('https://api.resend.com/emails', …)` records the call into the module-scoped `resendCalls` array and returns `200`. The `afterEach` reset (in setup) is what keeps one test's calls from leaking into the next — the starter wires it. Restates the rule from lesson 4 of chapter 088: MSW is at the network boundary, not at `lib/email.ts`. In this project no email fires off the webhook (Unit 13's dispatcher owns that), so every test asserts `resendCalls` is **empty** — a negative boundary assertion.
- `src/test/helpers/post-webhook.ts`: `JSON.stringify`s the event **once** (a second stringify would produce different bytes and break verification), signs that exact string with the real `stripe.webhooks.generateTestHeaderString({ payload, secret })`, optionally flips one signature character when `tamperSignature: true`, builds the `Request`, and calls the route's `POST` export. The senior anchor: the test exercises the same `POST` function production runs — no fake route handler, no test-only branch in production code.
- Calling Server Actions: not exercised in the integration suite. The SUT here is the session-less webhook route. The `{ db: tx }`-handle convention (lesson 7 of chapter 088) is the pattern a Server-Action test would use; the upgrade action is exercised only through the browser in lesson 6.
- `playwright.config.ts`: `webServer` boots `pnpm build && pnpm start -p 3001` (a production build, never `next dev`; the e2e port differs from dev's 3000 so a local dev server doesn't conflict — the canonical guard against the "my test is hitting dev data" bug); the `webServer.env` block sets `DATABASE_URL=$DATABASE_URL_E2E`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL` — the test server runs against the e2e DB and the student's Stripe test account. The `setup` project signs in once; the `chromium` project depends on `setup` and inherits the `storageState`. Chromium-only by default (WebKit/Firefox are CI cost discipline, named not built).
- `tests/e2e/auth.setup.ts`: signs the admin in via the Better Auth **API** (`page.request.post('/api/auth/sign-in/email', { data: { email, password } })`), confirms the session by loading `/dashboard`, then writes `page.context().storageState({ path: '.auth/admin.json' })`. Names *why* API-based setup, not form-driving: under Playwright the form's React-Compiler `useActionState` submit leaks React's internal action-encoding fields into the strict-parsed FormData and is unreliable — API auth setup is the robust, recommended pattern (and still lesson 2 of chapter 090's UI-login-per-test anti-pattern avoidance). The `.auth/` directory holds a real session cookie and is gitignored; remind the student to confirm before commit.
- `tests/e2e/fixtures.ts`: extends Playwright's `test` with `adminPage` (a `Page` built from the `storageState` the setup project wrote) and `orgSlug` (a constant, `'e2e-org'`); re-exports `expect`. Tests import `{ test, expect }` from this file, not from `@playwright/test` directly.
- `tests/e2e/helpers/fill-stripe-card.ts`: the one fragile third-party seam centralized — `frameLocator('iframe[src*="js.stripe.com"]').first()`, then `getByPlaceholder(/card number/i)` (auto-waited visible before fill), `/mm \/ yy/i`, `/cvc/i`, best-effort `/zip|postal/i`. Stripe owns these selectors; keeping them in one file makes a break a one-file fix.

Note that the `pnpm seed:stripe` from chapter 065 was already run during the project that ships the webhook; the products and prices exist in the student's Stripe account and the Playwright test reuses them — no additional Stripe-side seeding for this project.

Close the walkthrough by booting both suites: run `pnpm test:integration` against the three `describe.todo` stubs (Vitest collects them as todo, runs nothing), then `pnpm test:e2e` (the `setup` project signs in via the API and writes `.auth/admin.json`; the chromium project finds only the `test.fixme` spec). Both runs prove the harness is alive before the student writes a test. Finally, run `pnpm dev` and walk to `/inspector` from chapter 065 — still present, useful for debugging an integration-test failure against the dev DB.

The lesson may carry supporting videos in the body and a closing external-resources section.

---

## Lesson 3 — The happy-path webhook test

Write the first integration test: drive a signed `checkout.session.completed` event through the real route handler and prove it writes the right rows. Finished result: `pnpm test:integration` reports `1 passed`, and `--reporter=verbose` shows a single `it` whose name reads as the behavior — the entitlement is upserted, the event claimed, and an audit log written when a valid checkout completes.

### Your mission

You are testing the webhook ingest seam in isolation — the path a real Stripe `checkout.session.completed` delivery takes through your production route handler down to the rows it writes. The whole test wraps in `withRollback(async ({ tx }) => { ... })` so it leaves no state behind, and it follows the Arrange / Act / Assert shape with blank-line separation (lesson 4 of chapter 086). You stub exactly two network boundaries and nothing else: Stripe's `subscriptions.retrieve` (already mocked at the SDK seam — you feed it by calling `registerSubscription(fixtureSubscription(...))`, *not* an MSW handler) and Resend's POST (MSW, already wired) — `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, and every internal helper run as real code against real Postgres, because a test that mocks them proves nothing about the seam. Read inside the transaction with `tx`, never the global `db`, or you will see missing state — `tx` is the transactional handle the route shares via the `@/db` mock and the `testTxContext`. Use `it`, not `it.concurrent` (lesson 8 of chapter 088). Keep this one test to one behavior: "the handler processed the event," asserted across every surface that one behavior touches; no email is wired off the webhook in this project (Unit 13's dispatcher owns that), so the Resend boundary is asserted as untouched (`resendCalls` empty) rather than as a second behavior.

This test confirms, when it passes:

- [ ] A valid signed `checkout.session.completed` returns `200` with a body matching `{ received: true, duplicate: false }`.
- [ ] The event is claimed exactly once — a `processed_events` row exists for `event.id` with `provider: 'stripe'` and `eventType: 'checkout.session.completed'`.
- [ ] The org's `plan_entitlements` row reflects the subscription: `plan: 'pro'`, `status: 'trialing'`, the right `subscriptionId`, `cancelAtPeriodEnd: false`, and `lastEventAt` equal to `new Date(event.created * 1000)`.
- [ ] An `audit_logs` row is written for the org with `action: 'billing.subscription.activated'` and `actorUserId: null`.
- [ ] No outbound email is triggered off this path — `resendCalls` stays empty.
- [ ] The test reads as its behavior when run with `--reporter=verbose`, and survives a rename of `subscriptionToEntitlement` and its internal helpers.

### Coding time

Implement `tests/integration/webhook-checkout-completed.int.test.ts` against the brief and the harness; the reference solution and walkthrough follow for after the attempt.

The reference solution shows the full test:

- **Arrange:** `const { org } = await signedInAs({ role: 'admin' }, tx)` for the admin user + org (and its seeded `free` entitlement); `tx.update(organization).set({ stripeCustomerId }).where(eq(organization.id, org.id))` with a deterministic `customerId` (e.g. `cus_test_checkout_happy`) so `resolveOrgIdFromCustomer` finds the org; `const event = checkoutCompleted({ orgId: org.id, customerId, subscriptionId })`; `registerSubscription(fixtureSubscription({ id: subscriptionId, lookupKey: 'course_pro_monthly', status: 'trialing', currentPeriodEnd, orgId: org.id }))` — register the subscription the mocked `subscriptions.retrieve` will return; there is no MSW Stripe handler.
- **Act:** `const response = await postWebhook(event)`.
- **Assert:** `expect(response.status).toBe(200)` then `await expect(response.json()).resolves.toMatchObject({ received: true, duplicate: false })`; the `processed_events` row via `tx.query.processedEvents.findMany({ where: eq(processedEvents.eventId, event.id) })` (length 1, `{ provider: 'stripe', eventType: 'checkout.session.completed' }`); the `plan_entitlements` row via `tx.query.planEntitlements.findFirst` (the field assertions above, with `lastEventAt` via `toEqual(new Date(event.created * 1000))`); the `audit_logs` row via `tx.query.auditLogs.findMany` (`{ action: 'billing.subscription.activated', actorUserId: null }`); `expect(resendCalls).toHaveLength(0)`.
- Test name: `it('upserts the entitlement, claims the event, and writes an audit log when a valid checkout completes', ...)` inside `describe('happy-path checkout.session.completed webhook', ...)`.

Decision rationale to cover:

- The assertion on `lastEventAt` is the load-bearing ordering proof — without it, an order regression in lesson 5 of chapter 065's `WHERE lastEventAt < ?` predicate could ship green; lesson 6 of chapter 088's rule is that every webhook test asserts on the `processed_events` row AND the ordering column, not just the business-state mutation.
- Reading with `tx` (not the global `db`) is required because `tx` is the transactional handle the route handler shares via the `@/db` Proxy mock and the `testTxContext` store.
- The single `it` asserting on four surfaces is one behavior with multiple observable surfaces (lesson 4 of chapter 086 allows multiple `expect`s for one behavior); the `expect(resendCalls).toHaveLength(0)` is a negative assertion that names the boundary, not a second behavior.
- The registered `fixtureSubscription` matches the event's claims (same `subscriptionId`, same `lookup_key`); drift between event and the retrieved subscription is what production sees on a Stripe outage — out of scope here, but the registry is the contract a later test can drift deliberately.

Callout worth making: prefer the structural matcher (`toMatchObject`) over a field-by-field `toBe` where the rendered diff is more readable on failure (lesson 4 of chapter 086).

### Moment of truth

Run `pnpm test:integration`. Expected: `1 passed`. Re-run immediately with no reset — also `1 passed` (the rollback discipline holds). Run `pnpm test:integration -- --reporter=verbose` and confirm the `describe` / `it` line names the behavior.

Tick off by hand the requirements the test does not assert:

- [ ] The `it` name, read aloud, names the behavior without reading the body (lesson 4 of chapter 086 read-aloud test).
- [ ] A no-op rename of `subscriptionToEntitlement` and its internal helpers leaves the test green — proof it asserts on the contract, not internals (restore after).

---

## Lesson 4 — The replay/idempotency test

Write the integration test that sends the same `checkout.session.completed` event twice and proves the second send is a no-op. Finished result: `pnpm test:integration` reports `2 passed`; the new test's `it` name reads as "returns 200 with duplicate=true and does not mutate state on a replayed event."

### Your mission

You are proving the webhook handler's idempotency — that Stripe's at-least-once delivery cannot double-apply a subscription change. The shape mirrors lesson 3: `withRollback`, `signedInAs({ role: 'admin' }, tx)`, set `stripeCustomerId`, `registerSubscription(fixtureSubscription(...))` with the same `course_pro_monthly` / `trialing` subscription, AAA with blank-line separation. The one load-bearing difference is the deliberate construction of the failure input: you pin an explicit `eventId` (`evt_test_idempotency_fixed`) so the same dedup key survives both sends — without it each `postWebhook` would mint a fresh ID and the second call would be a *new* event, not a replay. This is the whole point of the test, so the pin is not optional. Keep it to one behavior — "the second send changes nothing" — asserted across every surface a replay must leave untouched. Reuse the helpers verbatim; the infrastructure was built once, so this test costs minutes, not hours (lesson 1 of chapter 088's cost-amortization argument).

This test confirms, when it passes:

- [ ] The first send returns `200` with `{ received: true, duplicate: false }` — the claim-and-dispatch path.
- [ ] The second send returns `200` with `{ received: true, duplicate: true }` — the dedup-hit path.
- [ ] The event is claimed exactly once — `processed_events` rows for the org stay at 1 across both sends.
- [ ] The entitlement is not re-written — `plan_entitlements.updatedAt` is identical before and after the second send.
- [ ] The audit log is not appended twice — `audit_logs` rows for the org stay at 1.

### Coding time

Implement `tests/integration/webhook-idempotency.int.test.ts` against the brief and the harness; the reference solution follows.

The reference solution:

- **Arrange:** `signedInAs({ role: 'admin' }, tx)`; set `stripeCustomerId`; `checkoutCompleted({ orgId, customerId, subscriptionId, eventId: 'evt_test_idempotency_fixed' })`; `registerSubscription(fixtureSubscription(...))` as in lesson 3.
- **Act:** `const first = await postWebhook(event);` then read and capture `plan_entitlements.updatedAt` (`afterFirst?.updatedAt`); then `const second = await postWebhook(event);`.
- **Assert:** `first.status` 200 / body `{ received: true, duplicate: false }`; `second.status` 200 / body `{ received: true, duplicate: true }`; `processed_events` count for `eventId` = 1; the post-second-send `updatedAt` `toEqual` the captured `updatedAt`; `audit_logs` count = 1.
- Test name: `it('returns 200 with duplicate=true and does not mutate state on a replayed event', ...)` inside `describe('replayed checkout event is a no-op', ...)`.

Decision rationale to cover:

- The fixed `eventId` is the load-bearing setup — idempotency tests pin the dedup key explicitly.
- Comparing `updatedAt` across the two calls is the cleanest mutation-free assertion: an exact-value `toEqual` would depend on `now()` at the first call, whereas equality across two reads reads as "nothing changed in between."
- Asserting on the `duplicate: true` flag ties the test to a response-shape contract operators depend on in logs (the route handler from lesson 4 of chapter 065 returns it on the dedup-hit path); if the team later drops the flag, this test breaks, which is correct — the shape change deserves a test change.

### Moment of truth

Run `pnpm test:integration`. Expected: `2 passed`. Re-run immediately with no reset — still `2 passed`.

Tick off by hand:

- [ ] With `--reporter=verbose`, the two `it` names list the two behaviors (happy path, replay) without reading the bodies.
- [ ] Swapping the route handler for a different implementation that still satisfies the contract (verify → claim → mutate → audit) leaves both tests green — the lesson 4 of chapter 086 black-box rule (restore after).

---

## Lesson 5 — The signature-tampered rejection test

Write the integration test that tampers the Stripe signature and proves the request is rejected before any work happens. Finished result: `pnpm test:integration` reports `3 passed`; the new test's `it` name reads as "rejects with 400 problem+json and writes nothing when the signature is tampered."

### Your mission

You are proving the handler's fail-closed front door — that a forged or corrupted signature is rejected before a single byte of the body is trusted. The event itself is well-formed; the corruption lives only in the signature, which `postWebhook(event, { tamperSignature: true })` produces by flipping one character of the real signed header. Register **no** `fixtureSubscription` here on purpose: a verified payload never reaches the handler, so `subscriptions.retrieve` must never be called — if the front door let the body through, the missing registration would surface as a loud lookup failure, reinforcing the proof. The proof is cumulative and negative: you assert on the *empty* state of every downstream surface — no claim row, the seeded `free` entitlement untouched, no audit row, no outbound call — because that emptiness is what "rejected before any work" means. This is also where the lesson 3 of chapter 065 watch-out bites: if the route logged the body before verifying, `resendCalls` would still be empty but a structured log would carry attacker-controlled content, so the test's value is in asserting that *nothing* downstream ran. The `onUnhandledRequest: 'error'` MSW setting backs this up — a future handler change that adds an outbound call fails the suite loudly with an un-stubbed-network error (lesson 5 of chapter 088). Same `withRollback` + `signedInAs({ role: 'admin' }, tx)` scaffold, one behavior: "the request is rejected before any work."

This test confirms, when it passes:

- [ ] A tampered-signature request returns `400`.
- [ ] The response is `application/problem+json` with a body matching `{ title: 'invalid_signature', status: 400 }`.
- [ ] No event is claimed — `processed_events` rows for the org = 0.
- [ ] No entitlement is touched — the org's `plan_entitlements` row still reads `plan: 'free'` (the seed).
- [ ] No audit log is written — `audit_logs` rows for the org = 0.
- [ ] No outbound call fires — `resendCalls.length === 0`.

### Coding time

Implement `tests/integration/webhook-signature-rejected.int.test.ts` against the brief and the harness; the reference solution follows.

The reference solution:

- **Arrange:** `signedInAs({ role: 'admin' }, tx)`; build the event normally via `checkoutCompleted(...)` (well-formed; only the signature is corrupted at send time). Register no subscription.
- **Act:** `const response = await postWebhook(event, { tamperSignature: true })`.
- **Assert:** `response.status` 400; `response.headers.get('content-type')` is `'application/problem+json'`; body `toMatchObject({ title: 'invalid_signature', status: 400 })`; `processed_events` count = 0; `plan_entitlements` still `plan: 'free'`; `audit_logs` count = 0; `resendCalls.length === 0`.
- Test name: `it('rejects with 400 problem+json and writes nothing when the signature is tampered', ...)` inside `describe('tampered signature is rejected before any work', ...)`.

Decision rationale to cover:

- The test is the structural proof that verification happens before any work; asserting on the empty state of every downstream surface (DB, audit log, MSW) is the cumulative proof, and it is the test that would catch a regression where the route logs the body before verifying.
- The tests live in separate files (idempotency vs. signature rejection) because each is its own behavior story; one file with two `it` blocks would also work — the trade-off is `--reporter=verbose` readability (one file) versus parallel runtime (separate files), and the starter chose separate files to surface file-parallel structure.

### Moment of truth

Run `pnpm test:integration`. Expected: `3 passed`. Re-run immediately with no reset — still `3 passed`; `--reporter=verbose` lists three behaviors, one per `it` name.

Tick off by hand:

- [ ] Swapping the route handler for a different contract-satisfying implementation leaves all three tests green (lesson 4 of chapter 086 black-box rule; restore after).
- [ ] After the first run, `psql $DATABASE_URL_TEST` shows zero rows in `processed_events`, `plan_entitlements`, `organizations`, `audit_logs` — the rollback discipline left nothing behind.

---

## Lesson 6 — Driving Checkout end to end

Write the single Playwright test that signs in via `storageState`, opens `/inspector`, clicks Upgrade, fills the Stripe Checkout iframe with `4242 4242 4242 4242`, returns to `/billing/success`, and watches the poller flip the UI to Pro — then run the suite-wide drills that prove the whole suite is behavior-anchored. Finished result: `pnpm test:e2e` reports `1 passed`, and `playwright-report/index.html` opens with a trace per step.

### Your mission

You are covering the one money path that costs money if it breaks — a user pays and doesn't get the plan, or doesn't pay and does (lesson 1 of chapter 090's trigger; this is money path #2). The integration tests already prove the database write, so this test asserts only on what the **user sees** in the browser — duplicating the DB assertion here would cover the same bug at higher cost (lesson 3 of chapter 090). It runs against the production build via `webServer` on port 3001, signs in once via `storageState` (the `adminPage` fixture), and uses role-first locators and testids throughout; `expect.toHaveURL`, `expect.toHaveText`, and `expect.toBeVisible` auto-wait, so there is no `waitForTimeout`. Entry is `/inspector` — the carried 065 app has no standalone `/billing` page; the Upgrade control is the inspector's checkout-pro-button — and the return lands on `/billing/success`. The two pieces of orchestration that make or break the run: the Stripe Checkout iframe (driven through `frameLocator('iframe[src*="js.stripe.com"]')`, centralized in the starter's `tests/e2e/helpers/fill-stripe-card.ts` so the one fragile third-party seam lives in one file), and the webhook delivery (`stripe listen --forward-to localhost:3001/api/webhooks/stripe` must be running, or the poller times out — the starter's `pnpm stripe:listen` script runs the listener; start it in a second terminal before `pnpm test:e2e`). The course's reach is the webhook-as-single-writer pattern from chapter 065, so the success page polls for the webhook-written entitlement rather than reading Stripe's API directly. The Portal cancellation flow is out of scope: it lives at `billing.stripe.com`, which Playwright cannot reliably drive, and its projection is integration-test homework. Chromium only; WebKit/Firefox are one project line each but deferred to CI cost discipline.

This test confirms, when it passes:

- [ ] On `/inspector`, the admin sees the `entitlement-plan` testid reading `free` (the e2e seed).
- [ ] Clicking "Upgrade to Pro" redirects the browser to `checkout.stripe.com`.
- [ ] Filling the card iframe with `4242 4242 4242 4242` and submitting returns the browser to `/billing/success`.
- [ ] During the redirect-versus-webhook race, the success page shows its "finalizing" copy.
- [ ] Once the webhook lands and `plan_entitlements` updates, the poller flips the page to the "you are all set / your plan is now pro" copy.
- [ ] Reloading `/inspector` shows `entitlement-plan` reading `pro` — the entitlement persisted.

### Coding time

Implement `tests/e2e/checkout-money-path.spec.ts` against the brief and the harness; the reference solution follows.

The reference solution is a single `test('admin can upgrade to Pro via Stripe Checkout', async ({ adminPage }) => {...})` importing `{ test, expect }` from `./fixtures`:

- `adminPage.goto('/inspector')`; `expect(adminPage.getByTestId('entitlement-plan')).toHaveText('free')`.
- `adminPage.getByRole('button', { name: /upgrade to pro/i }).click()`; `expect(adminPage).toHaveURL(/checkout\.stripe\.com/)`.
- `await fillStripeCard(adminPage)` — the helper drives `frameLocator('iframe[src*="js.stripe.com"]').first()`, `getByPlaceholder(/card number/i).fill('4242 4242 4242 4242')`, `/mm \/ yy/i` (`12 / 34`), `/cvc/i` (`123`), best-effort `/zip|postal/i`.
- `adminPage.getByRole('button', { name: /(start trial|subscribe|pay)/i }).click()` — the regex covers Stripe's trial-vs-no-trial label (065 sets `trial_period_days: 14`, so the button reads "Start trial").
- `expect(adminPage).toHaveURL(/\/billing\/success/, { timeout: 30_000 })`; `expect(getByText(/finalizing/i)).toBeVisible()`; `expect(getByText(/you are all set|your plan is now pro/i)).toBeVisible({ timeout: 30_000 })`.
- `adminPage.goto('/inspector')`; `expect(adminPage.getByTestId('entitlement-plan')).toHaveText('pro')`.

Decision rationale to cover:

- The test asserts on browser state, not the DB — the integration tests own the row assertion; this test owns the composition (Stripe round-trip + webhook arrival + UI poll).
- The webhook reaches the local server only because `stripe listen` forwards to `localhost:3001`; without it the poller times out — name the seam.
- `retries: 1` in CI is the *signal*, not the fix: a pass-on-retry produces a trace for the failed attempt, the reviewer files a structural fix (better locator, longer webhook-race timeout) and removes the flake.

Callout worth making: a `pnpm test:e2e` run creates a real test-mode Checkout session and subscription in the student's Stripe dashboard (`dashboard.stripe.com/test/checkouts`); test-mode data persists and needs no cleanup.

### Moment of truth

Run the full verification, top to bottom — this is the chapter's capstone, so it confirms not just this test but that the whole suite is behavior-anchored.

Integration suite green twice in a row: `pnpm db:test:setup` (idempotent), `pnpm test:integration` → `3 passed`, immediately again → `3 passed`. Open `psql $DATABASE_URL_TEST` and confirm `processed_events`, `plan_entitlements`, `organization`, `audit_logs` are all empty — the rollback discipline left nothing behind.

Playwright suite green: `pnpm db:e2e:reset`, start `pnpm stripe:listen` in a second terminal (forwards webhooks to `localhost:3001`), then `pnpm test:e2e` → `1 passed`. The test takes 30-90s (the webhook arrival is the bottleneck — usually 2-5s, can spike). Open `playwright-report/index.html` and walk the trace: every action, locator, screenshot, and the network log showing the redirect to `checkout.stripe.com` and back. The trace is the debugger (lesson 2 of chapter 090); no `console.log`.

Then tick off the behavior-anchored proofs by hand:

- [ ] **Mutation drills isolate failure** (each via `git checkout` after). Comment out `claimEvent` in the route's transaction → only the idempotency test fails (`processed_events` = 2, entitlement written twice, two audit rows); happy path and signature tests stay green. Skip signature verification → only the signature-rejection test fails on `status === 400`. Force `subscriptionToEntitlement` to return `plan: 'free'` → only the happy-path plan assertion fails. Remove the `audit_logs` write from `onCheckoutCompleted` → only the happy-path audit assertion fails. Remove the `lastEventAt < event.created` predicate → all three stay green (the ordering case is a named homework gap, not covered here).
- [ ] **Refactor without breaking** — rename `subscriptionToEntitlement` to `projectSubscription`, rename dispatch helpers, restructure the switch into a Record dispatch; all three tests stay green (lesson 4 of chapter 086).
- [ ] **Network-boundary proof** — `resendCalls` is empty in all three integration tests (no email off the webhook in this project; Unit 13 owns that), and `subscriptions.retrieve` resolved through the registered fixture exactly where expected (the signature-rejected test registers none — the retrieve is never reached); `onUnhandledRequest: 'error'` would have failed the suite on any stray outbound (Resend) call.
- [ ] **Coverage diagnostic** — `pnpm test:integration --coverage`, open `coverage/index.html`, read the **branch** column (not line — lesson 3 of chapter 086) for `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, the route. Name the uncovered branches as homework: `onSubscriptionUpdated`, `onSubscriptionDeleted`, the `resolveOrgIdFromCustomer` not-found path, the `subscriptionToEntitlement` `unknown_plan` throw.
- [ ] **Trace artifact discipline** — force the Playwright test to fail (assert the `entitlement-plan` testid reads `'team'`), re-run, then `pnpm exec playwright show-trace test-results/.../trace.zip` and walk the DOM/network/screenshot at the failed assertion; restore.

If a mutation drill does not localize failure, the test is over- or under-asserting (a lesson 4 of chapter 086 violation) — point back to the owning lesson.
