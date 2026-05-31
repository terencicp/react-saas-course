# Chapter 091 — Project: testing the Stripe webhook and Checkout money path

## Chapter framing

Chapter 091 takes the Chapter 065 webhook surface and proves it with the testing discipline installed across Chapters 090–094: integration tests running against a real test Postgres with per-test transaction rollback, MSW stubbing the outbound Resend call at the network boundary, the auth-fixture factory from lesson 3 of chapter 088 minting signed-in admin sessions, and assertions on the typed `Result` shape, the `plan_entitlements` row, the `processed_events` claim row, and the `audit_logs` write. One Playwright test then drives the full money path against a production build: sign-in via `storageState`, click Upgrade, complete Stripe Checkout with the `4242` test card, return to `/billing/success`, watch the poller flip the UI to Pro.

The chapter's stated goals — each a test the student writes, runs green, and proves localizes failure:

- The integration suite runs green on a clean DB and runs green again on an immediate re-run with no reset — the rollback discipline leaves zero rows behind (the student confirms no orphan rows in `processed_events`, `plan_entitlements`, `audit_logs`, `users`, `organizations`).
- A happy-path integration test drives a signed `checkout.session.completed` event through the real route handler and asserts on the contract surface — `Response.status`, the `plan_entitlements` row fields, the `processed_events` claim row, the `audit_logs` row, and `resendCalls` — never on `lib/webhooks/stripe.ts` internals or private helpers.
- A duplicate-event test sends the same event twice and proves idempotency: first call `200`, `processed_events` rows = 1, entitlement updated, audit row written; second call `200` with `{ duplicate: true }`, `processed_events` rows still 1, `plan_entitlements.updatedAt` unchanged, `audit_logs` rows still 1.
- A signature-tampered test proves rejection before any work: `400` with `application/problem+json`, `processed_events` rows = 0, no DB writes, `resendCalls.length === 0`.
- A Playwright test covers the full money path: sign in via `storageState`, navigate to `/billing`, click "Upgrade to Pro", land on `checkout.stripe.com`, fill `4242 4242 4242 4242` in the card iframe, submit, return to `/billing/success`, poll until "you're on Pro" is visible.
- Deliberate handler mutations fail only the expected test: removing `claimEvent` fails only the duplicate-event test, skipping signature verification fails only the signature-tampered test, forcing `subscriptionToEntitlement` to return `plan: 'free'` fails only the happy-path plan assertion — the structural proof the suite is behavior-anchored.

Threads that run through every lesson. The honeycomb shape from lesson 2 of chapter 086 maps directly: integration tests cover the webhook seam where the framework, the database, the Stripe signature contract, and the outbound email all meet — the bug-density layer; the one Playwright test covers the composition (auth + Server Action + Stripe round-trip + webhook + UI poll) that no integration test alone can catch. **Mock at the network boundary, not the function** (lesson 4 of chapter 088) — MSW intercepts the Resend POST; the test never reaches into `lib/email.ts`. **Real Postgres, transaction rollback per test** (lesson 1 of chapter 088) — the integration suite shares one test DB across files, each test wraps in a Postgres transaction that rolls back at teardown, leaving no state between tests. **One behavior per test, behavior over implementation** (lesson 4 of chapter 086) — each test asserts on the `plan_entitlements` row, the `processed_events` row, the `audit_logs` row, and the Resend handler call surface — every assertion is a contract the caller observes, none on private helpers. **Playwright against the production build via `webServer`** (lesson 2 of chapter 090), `storageState` for auth (one-time login), role-first locators, `trace: 'on-first-retry'`, `retries: 1` in CI, separate `saas_e2e` Postgres with deterministic seed. The chapter's two terminal commands the student types daily: `pnpm test:integration` (Vitest) and `pnpm test:e2e` (Playwright).

Forward references. **Unit 20 (CI):** the integration and Playwright suites both run on every PR; the JUnit reporter feeds GitHub Actions; the HTML report and trace zips are uploaded as artifacts; merge is gated on green — chapter 097 owns the wiring. **Unit 19 (observability):** in production the webhook handler emits structured logs the integration suite asserts on indirectly (via the disposition string in the response body); chapter 092 reads those logs and surfaces them in Sentry/PostHog. **Homework extensions:** a fourth integration test for the ordering predicate (`subscription.updated` with an older `created` than `lastEventAt` no-ops), a fifth for the `subscription.deleted` path, and a Portal-cancellation projection test — all reuse this chapter's helpers and cost minutes apiece; the suite is structured to absorb them.

### Dependency carry-in

- **From Chapter 065 (the project under test):** the `app/api/webhooks/stripe/route.ts` handler (verify → claim → dispatch in one transaction); `lib/webhooks/stripe.ts` (the three handlers and `dispatch`); `lib/billing/projection.ts` (`subscriptionToEntitlement`); `lib/billing/entitlement.ts` (`getEntitlement`, `hasActiveAccess`); `lib/billing/upgrade.ts` (the `authedAction` that creates the Checkout session and writes `organization_id` into `subscription_data.metadata`); `lib/billing/portal.ts` and `require-plan.ts`; the `processed_events`, `plan_entitlements`, `audit_logs`, `organizations` tables; the inspector page that the Playwright test does not use but the student does for debugging.
- **From lesson 1 of chapter 086 (Vitest setup):** the `vitest.config.ts` root with `test.projects`, the `globals: false` rule, the `vitest.setup.ts`, `pnpm test` (watch) and `pnpm test:run` (CI) scripts. The starter adds a separate `vitest.integration.config.ts` (or an `integration` project under the root) with `environment: 'node'`, `include: ['src/**/*.int.test.ts']`, `setupFiles: ['./vitest.integration.setup.ts']`.
- **From lesson 4 of chapter 086 (AAA, behavior over implementation):** every test in the chapter follows Arrange / Act / Assert with blank-line separation; the assertions hit the contract surface (row in DB, Result shape, MSW handler call count), never private helpers.
- **From lesson 1 of chapter 088 + lesson 2 of chapter 088 (real test Postgres, per-worker isolation):** the starter ships `scripts/test-db-setup.ts` and `scripts/test-db-teardown.ts`; per-test wrapping is a `withRollback(async (tx) => { ... })` helper installed in the integration setup, built on Postgres `BEGIN; ... ROLLBACK;` so no migrations run between tests.
- **From lesson 3 of chapter 088 (auth fixtures):** the starter ships `src/test/fixtures/auth.ts` exporting `createAdmin({ orgId? })` and `createMember({ orgId? })`, each returning `{ user, session, headers }` where `headers` carries a valid `cookie` Better Auth recognizes. The Server-Action test calls `upgrade(...)` after `withSession(adminFixture)` swaps the session context.
- **From lesson 4 of chapter 088 + lesson 5 of chapter 088 (MSW at the network boundary):** the starter ships `src/test/msw/server.ts` and `src/test/msw/handlers/resend.ts` — the latter intercepts `POST https://api.resend.com/emails` and records the request. `server.listen()` runs once in setup; `server.resetHandlers()` runs `afterEach`. Per-test overrides via `server.use(http.post(...))` for the failure cases.
- **From lesson 6 of chapter 088 (webhook signature + idempotency testing):** the helper `signStripeBody(body, secret)` that produces the `stripe-signature` header for a constructed body (uses `Stripe.webhooks.generateTestHeaderString`), and the canonical request-builder `postWebhook(event, { tamperSignature? })` calling the route handler directly via Next's `app/api/webhooks/stripe/route` import.
- **From lesson 7 of chapter 088 (Server Action e2e):** the `callAction(action, input, ctx)` helper that wraps a Server Action call with a signed-in context so tests don't reach into `'use server'` plumbing.
- **From lesson 8 of chapter 088 (test isolation, flake budget):** `it.concurrent` is off by default in the integration project; tests are serial within a file, parallel across files; the rollback boundary makes cross-test isolation structural.
- **From lesson 1 of chapter 090 + lesson 2 of chapter 090 (Playwright primitives):** `playwright.config.ts` with `webServer: 'pnpm build && pnpm start'`, `storageState` per role, `trace: 'on-first-retry'`, role-first locators, `expect`'s auto-waiting matchers. The chapter installs one new piece — driving Stripe Checkout's iframe.
- **From lesson 3 of chapter 090 (the money-path catalog):** the Stripe Checkout round-trip is money path #2; the chapter implements it concretely.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml                       # provided: postgres:18 (the dev DB); a second service `postgres-test`
                                         #           on a non-default port for the integration test DB
playwright.config.ts                     # provided: webServer, storageState wiring, Chromium project,
                                         #           trace on first retry, retries 1 in CI / 0 local
vitest.config.ts                         # provided (from lesson 1 of chapter 086): root with test.projects
vitest.integration.config.ts             # provided: integration project — environment: 'node',
                                         #           include: ['src/**/*.int.test.ts'], setupFiles
package.json                             # provided: test, test:run, test:integration, test:e2e,
                                         #           db:test:setup, db:test:reset, db:e2e:reset,
                                         #           seed:stripe scripts
.env.test                                # provided: DATABASE_URL_TEST, DATABASE_URL_E2E,
                                         #           STRIPE_SECRET_KEY (sk_test_...),
                                         #           STRIPE_WEBHOOK_SECRET (whsec_test_...),
                                         #           RESEND_API_KEY=fake_for_msw, APP_URL
scripts/
  test-db-setup.ts                       # provided: creates DATABASE_URL_TEST, runs migrations
  test-db-teardown.ts                    # provided
  e2e-db-reset.ts                        # provided: resets DATABASE_URL_E2E, runs migrations + e2e seed
  seed-e2e.ts                            # provided: one org, one admin user owner@e2e.test,
                                         #           one member member@e2e.test, free entitlement
src/
  test/
    integration-setup.ts                 # provided: starts MSW, wires withRollback, loads .env.test
    fixtures/
      auth.ts                            # provided: createAdmin, createMember, withSession
      stripe-events.ts                   # provided: factories for checkout.session.completed,
                                         #           customer.subscription.updated, .deleted
                                         #           (deterministic event.id, event.created,
                                         #           subscription_data.metadata.organization_id)
      with-rollback.ts                   # provided: BEGIN / fn(tx) / ROLLBACK wrapper
    msw/
      server.ts                          # provided: setupServer with default handlers
      handlers/
        resend.ts                        # provided: records POST /emails calls; returns 200 with id
    helpers/
      post-webhook.ts                    # provided: builds Request with Stripe-signature header,
                                         #           invokes app/api/webhooks/stripe POST handler
      call-action.ts                     # provided: wraps a Server Action with a session context
  app/api/webhooks/stripe/route.ts       # provided from Chapter 065 (unchanged)
  lib/billing/**                         # provided from Chapter 065 (unchanged)
  lib/webhooks/stripe.ts                 # provided from Chapter 065 (unchanged)
tests/
  integration/
    webhook-checkout-completed.int.test.ts   # TODO student (lesson 3 of chapter 091)
    webhook-idempotency.int.test.ts          # TODO student (lesson 4 of chapter 091)
    webhook-signature-rejected.int.test.ts   # TODO student (lesson 5 of chapter 091)
  e2e/
    auth.setup.ts                            # provided: signs in admin user, writes .auth/admin.json
    checkout-money-path.spec.ts              # TODO student (lesson 6 of chapter 091)
    fixtures.ts                              # provided: extends Playwright's test with seeded org +
                                             #           per-test invoice tag generator
.auth/                                       # gitignored — populated by auth.setup.ts
```

### Reference-solution signatures lessons display

- **The integration setup file** (`src/test/integration-setup.ts`):
  - `import { server } from './msw/server'; beforeAll(() => server.listen({ onUnhandledRequest: 'error' })); afterEach(() => server.resetHandlers()); afterAll(() => server.close());`
  - Loads `.env.test` via `dotenv` before anything else; sets `process.env.TZ = 'UTC'`.
- **The rollback helper** (`src/test/fixtures/with-rollback.ts`):
  - `withRollback<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>` — opens a transaction on the test DB, calls `fn(tx)`, throws inside a `finally` that issues `ROLLBACK`. Returns whatever `fn` returned for assertion convenience.
- **The auth fixture** (`src/test/fixtures/auth.ts`):
  - `createAdmin(tx, { orgId? }: { orgId?: string } = {}): Promise<{ user, session, ctx }>` — inserts a user, an org if not supplied, an `org_members` row with `role: 'admin'`, a session row, returns the bundle. `ctx` is `{ orgId, userId, role: 'admin' }` ready to pass to `callAction`.
  - `createMember(tx, { orgId? } = {})` — same shape, `role: 'member'`.
- **The webhook request helper** (`src/test/helpers/post-webhook.ts`):
  - `postWebhook(event: Stripe.Event, opts?: { tamperSignature?: boolean; secret?: string }): Promise<Response>` — serializes `event` to a string body, signs with `Stripe.webhooks.generateTestHeaderString({ payload, secret })`, optionally mutates one character of the signature when `tamperSignature: true`, builds a `Request` with `content-type: application/json` and `stripe-signature: <sig>`, calls `POST(request)` imported from `app/api/webhooks/stripe/route`. Returns the raw `Response` for assertions on status + body.
- **The Stripe event factory** (`src/test/fixtures/stripe-events.ts`):
  - `checkoutCompleted({ orgId, customerId, subscriptionId, lookupKey = 'course_pro_monthly', eventId?, createdAt? }): Stripe.Event` — produces a fully-typed event object with `subscription_data.metadata.organization_id = orgId`.
  - `subscriptionUpdated({ orgId, subscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd, eventId?, createdAt? })`.
  - `subscriptionDeleted({ orgId, subscriptionId, eventId?, createdAt? })`.
  - Default `eventId` is `evt_test_${Date.now()}_${nanoid(6)}`; default `createdAt` is `Math.floor(Date.now() / 1000)`. Tests override both for ordering / idempotency drills.
- **The action-call helper** (`src/test/helpers/call-action.ts`):
  - `callAction<I, O>(action: (input: I) => Promise<O>, input: I, ctx: SessionCtx): Promise<O>` — installs `ctx` into the test's async-local session before invoking `action`; reads the same way the real `authedAction` wrapper reads in production.
- **The Resend MSW handler** (`src/test/msw/handlers/resend.ts`):
  - Exports `resendHandlers: HttpHandler[]` and `resendCalls: Array<{ to: string; subject: string; html: string }>`. The handler records every call into `resendCalls`; tests `expect(resendCalls).toHaveLength(1)` and `expect(resendCalls[0]).toMatchObject({ to: 'admin@e2e.test' })`. The `afterEach` resets the array.
- **The Playwright fixtures** (`tests/e2e/fixtures.ts`):
  - `export const test = base.extend<{ adminPage: Page; orgSlug: string }>({ adminPage: async ({ browser }, use) => { const ctx = await browser.newContext({ storageState: '.auth/admin.json' }); const page = await ctx.newPage(); await use(page); await ctx.close(); }, orgSlug: async ({}, use) => { await use('e2e-org'); } });`
- **The Playwright config's key lines** (`playwright.config.ts`):
  - `testDir: 'tests/e2e'`, `webServer: { command: 'pnpm build && pnpm start -p 3001', url: 'http://localhost:3001', reuseExistingServer: !process.env.CI }`, `use: { baseURL: 'http://localhost:3001', trace: 'on-first-retry', screenshot: 'only-on-failure' }`, `projects: [{ name: 'setup', testMatch: /auth\.setup\.ts/ }, { name: 'chromium', dependencies: ['setup'], use: { ...devices['Desktop Chrome'], storageState: '.auth/admin.json' } }]`.
- **The auth setup** (`tests/e2e/auth.setup.ts`):
  - `test('admin sign-in', async ({ page }) => { await page.goto('/sign-in'); await page.getByLabel(/email/i).fill('admin@e2e.test'); await page.getByLabel(/password/i).fill(env.E2E_ADMIN_PASSWORD); await page.getByRole('button', { name: /sign in/i }).click(); await expect(page).toHaveURL(/\/dashboard/); await page.context().storageState({ path: '.auth/admin.json' }); });`
- **Env entries** (`.env.test`):
  - `DATABASE_URL_TEST=postgres://test:test@localhost:55432/saas_int_test`
  - `DATABASE_URL_E2E=postgres://test:test@localhost:55432/saas_e2e`
  - `STRIPE_SECRET_KEY=sk_test_...` (student's own key — required for the Playwright Checkout test only; the integration tests do not call live Stripe)
  - `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` (a fixed test-only secret used by `postWebhook` and the handler in test mode)
  - `RESEND_API_KEY=fake_intercepted_by_msw`
  - `APP_URL=http://localhost:3001`
  - `E2E_ADMIN_PASSWORD=...` (provided in `.env.test.local`, gitignored)

### Concepts demonstrated → owning lesson

- Vitest config, `test.projects`, `vitest.config.ts` and the integration project — lesson 1 of chapter 086.
- Honeycomb shape, integration as center of gravity, bug density at the seams — lesson 2 of chapter 086.
- Arrange / Act / Assert, one behavior per test, behavior over implementation, assertion on the caller-observable contract — lesson 4 of chapter 086.
- Integration tests against real Postgres with per-test transaction rollback — lesson 1 of chapter 088, lesson 2 of chapter 088.
- Auth fixtures for signed-in admin/member with an org — lesson 3 of chapter 088.
- Mocking at the network boundary, not the function (Resend via MSW) — lesson 4 of chapter 088, lesson 5 of chapter 088.
- Webhook handler testing: signing requests, replay, tamper — lesson 6 of chapter 088.
- Server Action end-to-end testing (`callAction` against the production action body) — lesson 7 of chapter 088.
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
- Mocking at the network boundary (MSW intercepts Resend and the Stripe API), never reaching into `lib/`.
- Integration tests against real Postgres with per-test transaction rollback, so the suite runs green twice with no cleanup between runs.
- Driving a money path end to end with Playwright on the production build — `storageState` auth, role-first locators, iframe handling for Stripe Checkout, the trace viewer as debugger.
- Proving a suite is behavior-anchored by mutating the handler and watching failure localize to the one test that asserts the mutated behavior.

### Architecture

The honeycomb shape from lesson 2 of chapter 086: integration tests sit at the center of gravity, covering the webhook seam where the framework, Postgres, the Stripe signature contract, and the outbound Resend call meet. One Playwright test sits above it, covering the composition (auth + Server Action + Stripe round-trip + webhook + UI poll) no integration test can reach. Two terminal commands frame the work — `pnpm test:integration` (Vitest, real test Postgres, per-test rollback) and `pnpm test:e2e` (Playwright, production build via `webServer`, separate `saas_e2e` Postgres). The student writes only the four test files; every piece of harness — Vitest config, MSW server, auth fixtures, the rollback helper, the Stripe event factory, the `postWebhook` and `callAction` helpers, the Playwright config, the auth setup — ships in the starter.

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

The student needs **two** Postgres databases — `saas_int_test` (integration tests, transaction rollback) and `saas_e2e` (Playwright, full reset), both on port 55432; `docker compose up` brings both up and `.env.test` points each at its own database name. The `.env.test.local` (gitignored) carries the student's own test-mode `STRIPE_SECRET_KEY` — needed only for the Playwright Checkout test to create a real test-mode session — and a chosen `E2E_ADMIN_PASSWORD`. The integration tests use a **fixed** `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` (not the `stripe listen` dynamic secret); the route handler and the `postWebhook` helper sign with the same env, so the contract is deterministic.

Command sequence (Steps component):

1. `degit` the starter and `cd` in.
2. `pnpm install`.
3. `docker compose up -d` — brings up both Postgres services.
4. `cp .env.test.local.example .env.test.local` and fill in the student's Stripe test key and a chosen admin password.
5. `pnpm db:test:setup` — migrates the integration DB.
6. `pnpm db:e2e:reset` — migrates and seeds the e2e DB.

Env vars the student supplies in `.env.test.local`: `STRIPE_SECRET_KEY` (their own Stripe test-mode key, from `dashboard.stripe.com/test/apikeys`) and `E2E_ADMIN_PASSWORD` (any password the student chooses for the seeded admin user).

Expected result: `pnpm test:integration` runs and reports zero test files (no `.int.test.ts` files yet); `pnpm test:e2e` runs `auth.setup.ts`, signs in, writes `.auth/admin.json`, then reports zero spec files. Both databases are alive and seeded; the harness boots clean before any test is written.

---

## Lesson 2 — Reading the test harness

A walkthrough of every provided file in the starter — Vitest integration config, MSW handlers, auth fixtures, the rollback helper, the Stripe event factory, `postWebhook`, `callAction`, Playwright config, and the auth setup — closing on a run of both empty suites that confirms the harness boots. No exercise; the student reads the contract surface before writing tests against it.

Walk the file tree, calling out provided vs. stubbed, then read the load-bearing files end to end:

- `vitest.integration.config.ts`: `environment: 'node'`, `include: ['tests/integration/**/*.int.test.ts']`, `setupFiles: ['./src/test/integration-setup.ts']`, `pool: 'forks'` (the senior reach — `forks` avoids the rare Drizzle-on-workers connection-recycling bug; named once), `fileParallelism: false` for the integration project (one file at a time — the test DB has one schema and rollback discipline is per-test within a file, not across files concurrently). Note when `fileParallelism` earns its weight: when the test DB is per-worker (lesson 2 of chapter 088), not per-suite.
- `src/test/integration-setup.ts`: loads `.env.test`, sets `process.env.TZ = 'UTC'` (matches lesson 1 of chapter 083's production discipline), starts MSW (`server.listen({ onUnhandledRequest: 'error' })` — fail loudly when a test hits an un-stubbed network call), resets handlers `afterEach`, closes MSW `afterAll`. Names the discipline from lesson 5 of chapter 088: the un-stubbed-call failure is the test telling you a network call snuck in.
- `src/test/fixtures/with-rollback.ts`: opens a transaction on `DATABASE_URL_TEST`, yields the `tx` to `fn`, throws unconditionally inside a `finally` after calling `ROLLBACK`. The senior anchor: every integration test wraps its DB work in `withRollback`; the route handler (which uses the global `db`) gets pointed at the same transaction via an async-local-storage shim. The starter wires this in `src/db/test-tx-context.ts` so a request begun inside `withRollback`'s callback sees the same `tx`; lesson 1 of chapter 088 teaches the depth.
- `src/test/fixtures/auth.ts`: `createAdmin(tx, { orgId? })` inserts a user, an org (if not supplied), an `org_members` row, a session row keyed to a deterministic session ID; returns `{ user, session, ctx: { orgId, userId, role: 'admin' } }`. The `ctx` shape matches the production `authedAction` context — the test exercises the same wrapper the real action uses.
- `src/test/fixtures/stripe-events.ts`: three factories (`checkoutCompleted`, `subscriptionUpdated`, `subscriptionDeleted`) returning fully-typed `Stripe.Event` objects. Defaults are deterministic enough that two invocations with the same arguments produce events with different `id`s (Date.now + nanoid) — the senior reach: `eventId` is the dedup key, and reusing one across tests breaks isolation. Names the convention used in later lessons: idempotency tests override `eventId` explicitly; happy-path tests let it auto-generate.
- `src/test/msw/handlers/resend.ts`: a `http.post('https://api.resend.com/emails', async ({ request }) => { const body = await request.json(); resendCalls.push(body); return HttpResponse.json({ id: 'fake_resend_id' }); })` handler. `resendCalls` is a module-scoped array reset in setup's `afterEach` — forgetting that reset would leak one test's calls into the next test's assertion; the starter wires it. Restates the rule from lesson 4 of chapter 088: MSW is at the network boundary, not at `lib/email.ts`.
- `src/test/msw/handlers/stripe.ts`: intercepts `GET https://api.stripe.com/v1/subscriptions/...` and returns a fixture subscription matching the event the test fired. The integration tests do NOT call live Stripe: `stripe.webhooks.constructEvent` only verifies the signature (no network), but `onCheckoutCompleted` calls `stripe.subscriptions.retrieve` (a real network call) — this handler is the boundary stub for it, the same lesson 5 of chapter 088 pattern.
- `src/test/helpers/post-webhook.ts`: constructs a `Request` with the right headers, signs with `Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp })`, optionally mutates a character of the signature, calls the route's `POST` export. The senior anchor: the test exercises the same `POST` function production runs — no fake route handler, no test-only branch in production code.
- `src/test/helpers/call-action.ts`: wraps a Server Action call with a synthesized session context, reusing the production `authedAction` wrapper's async-local-storage seam — the test does not subvert the action, it plants the session the action would have read from cookies.
- `playwright.config.ts`: `webServer` boots `pnpm build && pnpm start -p 3001` (the e2e port — different from dev's 3000 so a local dev server doesn't conflict, and the canonical guard against the "my test is hitting dev data" bug); the `setup` project signs in once; the `chromium` project depends on `setup` and inherits the `storageState`. The `webServer.env` block sets `DATABASE_URL=$DATABASE_URL_E2E`, `STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY`, etc. — the test server runs against the e2e DB and the student's Stripe test account, not the dev or integration DB.
- `tests/e2e/auth.setup.ts`: a Playwright test that signs in the admin user via the UI, then calls `page.context().storageState({ path: '.auth/admin.json' })`. Runs once per `playwright test` invocation as a dependency of every chromium-project test — names the lesson 2 of chapter 090 rule that UI-login-per-test is the anti-pattern. The `.auth/` directory holds a real session cookie and is gitignored; remind the student to confirm before commit.
- `tests/e2e/fixtures.ts`: extends Playwright's `test` with `adminPage` (a `Page` with `storageState` applied) and `orgSlug` (the seeded org's slug). Tests import `{ test, expect }` from this file, not from `@playwright/test` directly.

Note that the `pnpm seed:stripe` from chapter 065 was already run during the project that ships the webhook; the products and prices exist in the student's Stripe account and the Playwright test reuses them — no additional Stripe-side seeding for this project.

Close the walkthrough by booting both suites: run `pnpm test:integration` with zero spec files (Vitest reports "No test files found"), then `pnpm test:e2e` (Playwright runs `auth.setup.ts`, signs in, writes `.auth/admin.json`, then reports "No tests found"). Both runs prove the harness is alive before the student writes a test. Finally, run `pnpm dev` and walk to the inspector from chapter 065 — still present, useful for debugging an integration-test failure against the dev DB.

The lesson may carry supporting videos in the body and a closing external-resources section.

---

## Lesson 3 — The happy-path webhook test

Write the first integration test: drive a signed `checkout.session.completed` event through the real route handler and prove it writes the right rows. Finished result: `pnpm test:integration` reports `1 passed`, and `--reporter=verbose` shows a single `it` whose name reads as the behavior — the entitlement is upserted, the event claimed, and an audit log written when a valid checkout completes.

### Your mission

You are testing the webhook ingest seam in isolation — the path a real Stripe `checkout.session.completed` delivery takes through your production route handler down to the rows it writes. The whole test wraps in `withRollback(async (tx) => { ... })` so it leaves no state behind, and it follows the Arrange / Act / Assert shape with blank-line separation (lesson 4 of chapter 086). You mock exactly two network boundaries and nothing else: Stripe's HTTP API (MSW intercepts the `subscriptions.retrieve` call `onCheckoutCompleted` makes) and Resend's (MSW, already wired) — `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, and every internal helper run as real code against real Postgres, because a test that mocks them proves nothing about the seam. Read inside the transaction with `tx`, never the global `db`, or you will see uncommitted or missing state depending on the isolation mode. Use `it`, not `it.concurrent` — concurrent runs within a file race against the shared MSW handler array (lesson 8 of chapter 088). Keep this one test to one behavior: "the handler processed the event," asserted across every surface that one behavior touches; the welcome-email send is not wired off the webhook in this project (Unit 13's dispatcher owns that), so the Resend boundary is asserted as untouched here rather than as a second behavior.

This test confirms, when it passes:

- [ ] A valid signed `checkout.session.completed` returns `200` with a body matching `{ received: true }`.
- [ ] The event is claimed exactly once — a `processed_events` row exists for `event.id` with `eventType: 'checkout.session.completed'`.
- [ ] The org's `plan_entitlements` row reflects the subscription: `plan: 'pro'`, `status: 'trialing'`, the right `subscriptionId`, `cancelAtPeriodEnd: false`, and `lastEventAt` equal to `new Date(event.created * 1000)`.
- [ ] An `audit_logs` row is written for the org with event `billing.subscription.activated`.
- [ ] No outbound email is triggered off this path — `resendCalls` stays empty.
- [ ] The test reads as its behavior when run with `--reporter=verbose`, and survives a rename of `subscriptionToEntitlement` and its internal helpers.

### Coding time

Implement `tests/integration/webhook-checkout-completed.int.test.ts` against the brief and the harness; the reference solution and walkthrough follow for after the attempt.

The reference solution shows the full test:

- **Arrange:** `createAdmin(tx)` for the admin user + org; UPDATE `organizations.stripeCustomerId` to a deterministic `cus_test_${ctx.orgId}` so the customer-resolution fallback has something to look up; `const event = checkoutCompleted({ orgId: ctx.orgId, customerId: 'cus_test_...', subscriptionId: 'sub_test_...' })`; `server.use(http.get(\`https://api.stripe.com/v1/subscriptions/sub_test_...\`, () => HttpResponse.json(fixtureSubscription({ id: 'sub_test_...', lookupKey: 'course_pro_monthly', status: 'trialing', currentPeriodEnd: 1763577600 }))))` (the `fixtureSubscription` factory ships in the starter).
- **Act:** `const response = await postWebhook(event)`.
- **Assert:** `expect(response.status).toBe(200)` and `toMatchObject({ received: true })`; the `processed_events` row by `eq(processedEvents.eventId, event.id)` (length 1, right `eventType`); the `plan_entitlements` row by org (the field assertions above); the `audit_logs` row by org + event; `expect(resendCalls).toHaveLength(0)`.
- Test name: `it('upserts the entitlement, claims the event, and writes an audit log when a valid checkout completes', ...)`.

Decision rationale to cover:

- The assertion on `lastEventAt` is the load-bearing ordering proof — without it, an order regression in lesson 5 of chapter 065's `WHERE lastEventAt < ?` predicate could ship green; lesson 6 of chapter 088's rule is that every webhook test asserts on the `processed_events` row AND the ordering column, not just the business-state mutation.
- Reading with `tx` (not the global `db`) is required because `tx` is the transactional handle the route handler shares via the async-local context.
- The single `it` asserting on four surfaces is one behavior with multiple observable surfaces (lesson 4 of chapter 086 allows multiple `expect`s for one behavior); the `expect(resendCalls).toHaveLength(0)` is a negative assertion that names the boundary, not a second behavior.
- The Stripe MSW fixture matches the event's claims (same `subscriptionId`, same `lookup_key`); drift between event and API is what production sees on a Stripe outage — out of scope here, but the MSW handler is the contract a later test can drift deliberately.

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

You are proving the webhook handler's idempotency — that Stripe's at-least-once delivery cannot double-apply a subscription change. The shape mirrors lesson 3: `withRollback`, `createAdmin(tx)`, the Stripe MSW override returning the same `course_pro_monthly` / `trialing` fixture, AAA with blank-line separation. The one load-bearing difference is the deliberate construction of the failure input: you pin an explicit `eventId` (e.g. `evt_test_idempotency_fixed`) so the same dedup key survives both sends — without it each `postWebhook` would mint a fresh ID and the second call would be a *new* event, not a replay. This is the whole point of the test, so the pin is not optional. Keep it to one behavior — "the second send changes nothing" — asserted across every surface a replay must leave untouched. Reuse the helpers verbatim; the infrastructure was built once, so this test costs minutes, not hours (lesson 1 of chapter 088's cost-amortization argument).

This test confirms, when it passes:

- [ ] The first send returns `200` with `{ received: true }`.
- [ ] The second send returns `200` with `{ received: true, duplicate: true }` — the dedup-hit path.
- [ ] The event is claimed exactly once — `processed_events` rows for the org stay at 1 across both sends.
- [ ] The entitlement is not re-written — `plan_entitlements.updatedAt` is identical before and after the second send.
- [ ] The audit log is not appended twice — `audit_logs` rows for the org stay at 1.

### Coding time

Implement `tests/integration/webhook-idempotency.int.test.ts` against the brief and the harness; the reference solution follows.

The reference solution:

- **Arrange:** `createAdmin(tx)`; set `stripeCustomerId`; `checkoutCompleted({ ..., eventId: 'evt_test_idempotency_fixed' })`; the same Stripe MSW override as lesson 3.
- **Act:** `const first = await postWebhook(event); const second = await postWebhook(event);` — capturing `plan_entitlements.updatedAt` from a read taken between the two sends.
- **Assert:** `first.status` 200 / `{ received: true }`; `second.status` 200 / `{ received: true, duplicate: true }`; `processed_events` count = 1; the captured `updatedAt` equals the post-second-send `updatedAt`; `audit_logs` count = 1.
- Test name: `it('returns 200 with duplicate=true and does not mutate state on a replayed event', ...)`.

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

You are proving the handler's fail-closed front door — that a forged or corrupted signature is rejected before a single byte of the body is trusted. The event itself is well-formed; the corruption lives only in the signature, which `postWebhook(event, { tamperSignature: true })` produces by mutating one character of the real signed header. The proof is cumulative and negative: you assert on the *empty* state of every downstream surface — no claim row, no entitlement mutation, no audit row, no outbound call — because that emptiness is what "rejected before any work" means. This is also where the lesson 3 of chapter 065 watch-out bites: if the route logged the body before verifying, `resendCalls` would still be empty but a structured log would carry attacker-controlled content, so the test's value is in asserting that *nothing* downstream ran. The `onUnhandledRequest: 'error'` MSW setting backs this up — a future handler change that adds an outbound call fails the suite loudly with an un-stubbed-network error (lesson 5 of chapter 088). Same `withRollback` + `createAdmin` scaffold, one behavior: "the request is rejected before any work."

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

- **Arrange:** `createAdmin(tx)`; build the event normally (well-formed; only the signature is corrupted at send time).
- **Act:** `const response = await postWebhook(event, { tamperSignature: true })`.
- **Assert:** `response.status` 400; `content-type` is `application/problem+json`; body `toMatchObject({ title: 'invalid_signature', status: 400 })`; `processed_events` count = 0; `plan_entitlements` still `plan: 'free'`; `audit_logs` count = 0; `resendCalls.length === 0`.
- Test name: `it('rejects with 400 problem+json and writes nothing when the signature is tampered', ...)`.

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

Write the single Playwright test that signs in via `storageState`, clicks Upgrade, fills the Stripe Checkout iframe with `4242 4242 4242 4242`, returns to `/billing/success`, and watches the poller flip the UI to Pro — then run the suite-wide drills that prove the whole suite is behavior-anchored. Finished result: `pnpm test:e2e` reports `1 passed`, and `playwright-report/index.html` opens with a trace per step.

### Your mission

You are covering the one money path that costs money if it breaks — a user pays and doesn't get the plan, or doesn't pay and does (lesson 1 of chapter 090's trigger; this is money path #2). The integration tests already prove the database write, so this test asserts only on what the **user sees** in the browser — duplicating the DB assertion here would cover the same bug at higher cost (lesson 3 of chapter 090). It runs against the production build via `webServer` on port 3001, signs in once via `storageState`, and uses role-first locators throughout; `expect.toHaveURL` and `expect.toBeVisible` auto-wait, so there is no `waitForTimeout`. The two pieces of orchestration that make or break the run: the Stripe Checkout iframe (driven through `frameLocator` against Stripe's `__privateStripeFrame` naming, centralized in the starter's `tests/e2e/helpers/fill-stripe-card.ts` so the one fragile third-party seam lives in one file), and the webhook delivery (`stripe listen --forward-to localhost:3001/api/webhooks/stripe` must be running, or the poller times out at 30s — the starter's `test:e2e:with-stripe` script boots and tears down the listener). The course's reach is the webhook-as-single-writer pattern from chapter 065, so the success page polls for the webhook-written entitlement rather than reading Stripe's API directly. The Portal cancellation flow is out of scope: it lives at `billing.stripe.com`, which Playwright cannot reliably drive, and its projection is integration-test homework. Chromium only; WebKit/Firefox are one project line each but deferred to CI cost discipline.

This test confirms, when it passes:

- [ ] On `/billing`, the admin sees the billing heading and "current plan: free" (the e2e seed).
- [ ] Clicking "Upgrade to Pro" redirects the browser to `checkout.stripe.com`.
- [ ] Filling the card iframe with `4242 4242 4242 4242` and submitting returns the browser to `/billing/success`.
- [ ] During the redirect-versus-webhook race, the success page shows its "finalizing" copy.
- [ ] Once the webhook lands and `plan_entitlements` updates, the poller flips the page to "you're on Pro".
- [ ] Reloading `/billing` shows "current plan: pro" — the entitlement persisted.

### Coding time

Implement `tests/e2e/checkout-money-path.spec.ts` against the brief and the harness; the reference solution follows.

The reference solution is a single `test('admin can upgrade to Pro via Stripe Checkout', ...)` using `adminPage` from `tests/e2e/fixtures.ts`:

- `goto('/billing')`; assert the heading and `getByText(/current plan: free/i)`.
- `getByRole('button', { name: /upgrade to pro/i }).click()`; assert `toHaveURL(/checkout\.stripe\.com/)`.
- Fill the card via `fill-stripe-card.ts` (read it and inline it): `frameLocator('iframe[name^="__privateStripeFrame"]').first()` then `getByPlaceholder('1234 1234 1234 1234').fill('4242 4242 4242 4242')`, plus CVC / exp / ZIP frames.
- `getByRole('button', { name: /(start trial|subscribe|pay)/i }).click()` — the regex covers Stripe's trial-vs-no-trial label.
- `toHaveURL(/\/billing\/success/, { timeout: 30_000 })`; `getByText(/finalizing/i)` visible (5s); `getByText(/you're on pro/i)` visible (30s).
- `goto('/billing')`; `getByText(/current plan: pro/i)` visible.

Decision rationale to cover:

- The test asserts on browser state, not the DB — the integration tests own the row assertion; this test owns the composition (Stripe round-trip + webhook arrival + UI poll).
- The webhook reaches the local server only because `stripe listen` forwards to `localhost:3001`; without it the poller times out — name the seam.
- `retries: 1` in CI is the *signal*, not the fix: a pass-on-retry produces a trace for the failed attempt, the reviewer files a structural fix (better locator, longer webhook-race timeout) and removes the flake.

Callout worth making: a `pnpm test:e2e` run creates a real test-mode Checkout session and subscription in the student's Stripe dashboard (`dashboard.stripe.com/test/checkouts`); test-mode data persists and needs no cleanup.

### Moment of truth

Run the full verification, top to bottom — this is the chapter's capstone, so it confirms not just this test but that the whole suite is behavior-anchored.

Integration suite green twice in a row: `pnpm db:test:setup` (idempotent), `pnpm test:integration` → `3 passed`, immediately again → `3 passed`. Open `psql $DATABASE_URL_TEST` and confirm `processed_events`, `plan_entitlements`, `organizations`, `audit_logs` are all empty — the rollback discipline left nothing behind.

Playwright suite green: `pnpm db:e2e:reset`, then `pnpm test:e2e` → `1 passed`. The test takes 30-90s (the webhook arrival is the bottleneck — usually 2-5s, can spike). Open `playwright-report/index.html` and walk the trace: every action, locator, screenshot, and the network log showing the redirect to `checkout.stripe.com` and back. The trace is the debugger (lesson 2 of chapter 090); no `console.log`.

Then tick off the behavior-anchored proofs by hand:

- [ ] **Mutation drills isolate failure** (each via `git checkout` after). Comment out `claimEvent` in the route's transaction → only the idempotency test fails (`processed_events` = 2, entitlement written twice, two audit rows); happy path and signature tests stay green. Skip signature verification → only the signature-rejection test fails on `status === 400`. Force `subscriptionToEntitlement` to return `plan: 'free'` → only the happy-path plan assertion fails. Remove the `audit_logs` write from `onCheckoutCompleted` → only the happy-path audit assertion fails. Remove the `lastEventAt < event.created` predicate → all three stay green (the ordering case is a named homework gap, not covered here).
- [ ] **Refactor without breaking** — rename `subscriptionToEntitlement` to `projectSubscription`, rename dispatch helpers, restructure the switch into a Record dispatch; all three tests stay green (lesson 4 of chapter 086).
- [ ] **Network-boundary proof** — `resendCalls` is empty in all three integration tests (no email off the webhook in this project; Unit 13 owns that), and the Stripe MSW handler fired exactly once per test; `onUnhandledRequest: 'error'` would have failed the suite on any stray outbound call.
- [ ] **Coverage diagnostic** — `pnpm test:integration --coverage`, open `coverage/index.html`, read the **branch** column (not line — lesson 3 of chapter 086) for `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, the route. Name the uncovered branches as homework: `onSubscriptionUpdated`, `onSubscriptionDeleted`, `resolveOrgIdFromCustomer` fallback, the `subscriptions.retrieve` error path.
- [ ] **Trace artifact discipline** — force the Playwright test to fail (assert "you're on Team"), re-run, then `pnpm exec playwright show-trace test-results/.../trace.zip` and walk the DOM/network/screenshot at the failed assertion; restore.

If a mutation drill does not localize failure, the test is over- or under-asserting (a lesson 4 of chapter 086 violation) — point back to the owning lesson.
