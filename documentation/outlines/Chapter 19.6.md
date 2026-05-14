# Chapter 19.6 — Project: testing the Stripe webhook and Checkout money path

## Chapter framing

Chapter 19.6 takes the Chapter 12.3 webhook surface and proves it with the testing discipline installed across Chapters 19.1–19.5: three integration tests (happy path, duplicate-event idempotency, signature-tampered rejection) running against a real test Postgres with per-test transaction rollback, MSW stubbing the outbound Resend call at the network boundary, the auth-fixture factory from 19.3.3 minting signed-in admin sessions, and assertions on the typed `Result` shape, the `plan_entitlements` row, the `processed_events` claim row, and the `audit_logs` write. One Playwright test then drives the full money path against a production build: sign-in via `storageState`, click Upgrade, complete Stripe Checkout with the `4242` test card, return to `/billing/success`, watch the poller flip the UI to Pro. The chapter ships 1 brief + 1 starter walkthrough + 3 build lessons + 1 verify lesson; each build closes on a runnable, green slice.

Threads that run through every lesson. The honeycomb shape from 19.1.2 maps directly: integration tests cover the webhook seam where the framework, the database, the Stripe signature contract, and the outbound email all meet — the bug-density layer; the one Playwright test covers the composition (auth + Server Action + Stripe round-trip + webhook + UI poll) that no integration test alone can catch. **Mock at the network boundary, not the function** (19.3.4) — MSW intercepts the Resend POST; the test never reaches into `lib/email.ts`. **Real Postgres, transaction rollback per test** (19.3.1) — the integration suite shares one test DB across files, each test wraps in a Postgres transaction that rolls back at teardown, leaving no state between tests. **One behavior per test, behavior over implementation** (19.1.4) — the happy-path test asserts on the `plan_entitlements` row, the `processed_events` row, the `audit_logs` row, and the Resend handler having been called with the right recipient — every assertion is a contract the caller observes, none on private helpers. **Playwright against the production build via `webServer`** (19.5.2), `storageState` for auth (one-time login), role-first locators, `trace: 'on-first-retry'`, `retries: 1` in CI, separate `saas_e2e` Postgres with deterministic seed. The chapter's two terminal commands the student types daily: `pnpm test:integration` (Vitest) and `pnpm test:e2e` (Playwright).

### Dependency carry-in

- **From Chapter 12.3 (the project under test):** the `app/api/webhooks/stripe/route.ts` handler (verify → claim → dispatch in one transaction); `lib/webhooks/stripe.ts` (the three handlers and `dispatch`); `lib/billing/projection.ts` (`subscriptionToEntitlement`); `lib/billing/entitlement.ts` (`getEntitlement`, `hasActiveAccess`); `lib/billing/upgrade.ts` (the `authedAction` that creates the Checkout session and writes `organization_id` into `subscription_data.metadata`); `lib/billing/portal.ts` and `require-plan.ts`; the `processed_events`, `plan_entitlements`, `audit_logs`, `organizations` tables; the inspector page that the Playwright test does not use but the student does for debugging.
- **From 19.1.1 (Vitest setup):** the `vitest.config.ts` root with `test.projects`, the `globals: false` rule, the `vitest.setup.ts`, `pnpm test` (watch) and `pnpm test:run` (CI) scripts. The starter adds a separate `vitest.integration.config.ts` (or an `integration` project under the root) with `environment: 'node'`, `include: ['src/**/*.int.test.ts']`, `setupFiles: ['./vitest.integration.setup.ts']`.
- **From 19.1.4 (AAA, behavior over implementation):** every test in the chapter follows Arrange / Act / Assert with blank-line separation; the assertions hit the contract surface (row in DB, Result shape, MSW handler call count), never private helpers.
- **From 19.3.1 + 19.3.2 (real test Postgres, per-worker isolation):** the starter ships `scripts/test-db-setup.ts` and `scripts/test-db-teardown.ts`; per-test wrapping is a `withRollback(async (tx) => { ... })` helper installed in the integration setup, built on Postgres `BEGIN; ... ROLLBACK;` so no migrations run between tests.
- **From 19.3.3 (auth fixtures):** the starter ships `src/test/fixtures/auth.ts` exporting `createAdmin({ orgId? })` and `createMember({ orgId? })`, each returning `{ user, session, headers }` where `headers` carries a valid `cookie` Better Auth recognizes. The Server-Action test calls `upgrade(...)` after `withSession(adminFixture)` swaps the session context.
- **From 19.3.4 + 19.3.5 (MSW at the network boundary):** the starter ships `src/test/msw/server.ts` and `src/test/msw/handlers/resend.ts` — the latter intercepts `POST https://api.resend.com/emails` and records the request. `server.listen()` runs once in setup; `server.resetHandlers()` runs `afterEach`. Per-test overrides via `server.use(http.post(...))` for the failure cases.
- **From 19.3.6 (webhook signature + idempotency testing):** the helper `signStripeBody(body, secret)` that produces the `stripe-signature` header for a constructed body (uses `Stripe.webhooks.generateTestHeaderString`), and the canonical request-builder `postWebhook(event, { tamperSignature? })` calling the route handler directly via Next's `app/api/webhooks/stripe/route` import.
- **From 19.3.7 (Server Action e2e):** the `callAction(action, input, ctx)` helper that wraps a Server Action call with a signed-in context so tests don't reach into `'use server'` plumbing.
- **From 19.3.8 (test isolation, flake budget):** `it.concurrent` is off by default in the integration project; tests are serial within a file, parallel across files; the rollback boundary makes cross-test isolation structural.
- **From 19.5.1 + 19.5.2 (Playwright primitives):** `playwright.config.ts` with `webServer: 'pnpm build && pnpm start'`, `storageState` per role, `trace: 'on-first-retry'`, role-first locators, `expect`'s auto-waiting matchers. The chapter installs one new piece — driving Stripe Checkout's iframe.
- **From 19.5.3 (the money-path catalog):** the Stripe Checkout round-trip is money path #2; the chapter implements it concretely.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml                       # provided: postgres:18 (the dev DB); a second service `postgres-test`
                                         #           on a non-default port for the integration test DB
playwright.config.ts                     # provided: webServer, storageState wiring, Chromium project,
                                         #           trace on first retry, retries 1 in CI / 0 local
vitest.config.ts                         # provided (from 19.1.1): root with test.projects
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
  app/api/webhooks/stripe/route.ts       # provided from Chapter 12.3 (unchanged)
  lib/billing/**                         # provided from Chapter 12.3 (unchanged)
  lib/webhooks/stripe.ts                 # provided from Chapter 12.3 (unchanged)
tests/
  integration/
    webhook-checkout-completed.int.test.ts   # TODO student (Lesson 19.6.3)
    webhook-idempotency.int.test.ts          # TODO student (Lesson 19.6.4)
    webhook-signature-rejected.int.test.ts   # TODO student (Lesson 19.6.4)
  e2e/
    auth.setup.ts                            # provided: signs in admin user, writes .auth/admin.json
    checkout-money-path.spec.ts              # TODO student (Lesson 19.6.5)
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

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| `pnpm test:integration` runs green on a clean DB | `pnpm db:test:setup && pnpm test:integration` exits 0; three `*.int.test.ts` files report all tests passing. |
| `pnpm test:integration` runs green on a re-run with no reset | `pnpm test:integration` immediately afterwards exits 0; the rollback discipline left zero rows behind. The student inspects the test DB after the first run and confirms no orphan rows in `processed_events`, `plan_entitlements`, `audit_logs`, `users`, `organizations`. |
| `pnpm test:e2e` runs green | `pnpm db:e2e:reset && pnpm test:e2e` exits 0; the single Playwright test reports `1 passed`; `playwright-report/index.html` opens with the trace. |
| Happy-path integration test asserts on the contract surface | Reviewer reads `webhook-checkout-completed.int.test.ts`: assertions hit Response.status, `plan_entitlements` row fields, `processed_events` row presence, `audit_logs` row, and `resendCalls.length` — never on `lib/webhooks/stripe.ts` internals or on private helpers. |
| Duplicate-event test proves idempotency | Sends the same event twice via `postWebhook`; first call: `200`, `processed_events` rows = 1, `plan_entitlements` row updated, `audit_logs` row written; second call: `200` with `{ duplicate: true }`, `processed_events` rows still = 1, `plan_entitlements.updatedAt` unchanged, `audit_logs` rows still = 1. |
| Signature-tampered test proves rejection | `postWebhook(event, { tamperSignature: true })` returns `400` with `application/problem+json`; `processed_events` rows = 0; no body parsing happened (assert via `resendCalls.length === 0` and no DB writes). |
| Playwright test covers the full money path | `tests/e2e/checkout-money-path.spec.ts` signs in via `storageState`, navigates to `/billing`, clicks "Upgrade to Pro", lands on `checkout.stripe.com`, fills `4242 4242 4242 4242` in the card iframe, submits, returns to `/billing/success`, polls until "you're on Pro" is visible. |
| Deliberate handler mutations fail the expected tests only | Comment out the `claimEvent` call in the dispatch → only the duplicate-event test fails (the happy path still passes because the row is still written). Restore. Skip the signature verification → only the signature-tampered test fails. Restore. Make `subscriptionToEntitlement` return `plan: 'free'` regardless → only the happy-path assertion on `plan === 'pro'` fails. Each mutation localizes failure to the test that asserts the specific behavior — the structural proof that the suite is behavior-anchored. |

### Concepts demonstrated → owning lesson

- Vitest config, `test.projects`, `vitest.config.ts` and the integration project — 19.1.1.
- Honeycomb shape, integration as center of gravity, bug density at the seams — 19.1.2.
- Arrange / Act / Assert, one behavior per test, behavior over implementation, assertion on the caller-observable contract — 19.1.4.
- Integration tests against real Postgres with per-test transaction rollback — 19.3.1, 19.3.2.
- Auth fixtures for signed-in admin/member with an org — 19.3.3.
- Mocking at the network boundary, not the function (Resend via MSW) — 19.3.4, 19.3.5.
- Webhook handler testing: signing requests, replay, tamper — 19.3.6.
- Server Action end-to-end testing (`callAction` against the production action body) — 19.3.7.
- Test isolation, no shared mutable state, the cost of flake — 19.3.8.
- The money-path filter; Playwright is off by default; one path here because failure costs money — 19.5.1.
- Playwright config with `webServer`, `storageState`, role-first locators, auto-waiting `expect`, `trace: 'on-first-retry'` — 19.5.2.
- Stripe Checkout iframe locators, the `4242 4242 4242 4242` test card, the redirect-versus-webhook race resolved by the success-page poller — 19.5.3, 12.1.3.
- The webhook → DB → audit-log → email-send transaction discipline being tested — 12.1.2, 12.3.4, 12.3.5.
- The `subscription_data.metadata.organization_id` carry-channel — 12.2.1, 12.3.6.

---

## Lesson 19.6.1 — Brief and Done-when

Frames the deliverable: three webhook integration tests plus one Playwright money-path test, the scope cuts, and the "Done when" clauses that gate the chapter.

Goals:

- Frame what's being built: three integration tests over the Stripe webhook handler (happy path, duplicate idempotency, signature tampering) plus one Playwright test driving the full Checkout money path. One screenshot of `pnpm test:integration` green and one of the Playwright HTML report with a passing run and an attached trace.
- State the "Done when" in one paragraph (integration suite green twice in a row on a clean DB, Playwright suite green, deliberate handler mutations isolate failure to the expected test, every assertion on caller-observable contract).
- Name the scope cuts: no unit tests for `/lib/billing/projection.ts` here — those are exercised in chapter 19.2 material and the senior reach is the integration + E2E layers this project budgets time for; no component tests for the billing UI — 19.4's conditional trigger is not met by a static button row; no Playwright tests for sign-in, invitation, or the primary-value loop — the four-path catalog from 19.5.3 is the destination; this project ships one path (the Stripe round-trip) and notes the other three as homework; no testing of the Portal flow end-to-end via Playwright — the Portal lives at `billing.stripe.com` outside the production-build server-under-test, and the cancellation projection is covered by the integration test layer; no Stripe Test Clocks for full billing cycles; no visual regression; no load testing; no cross-browser matrix (Chromium only); no real Resend send in any test — MSW intercepts every call.
- Set the senior payoff: the webhook seam is the production async edge of every modern SaaS — and a green test suite that asserts on framework plumbing instead of behavior gives false confidence. The patterns shipped here (transaction-rollback per test, MSW at the network boundary, signed-event factories, Server-Action end-to-end via `callAction`, Playwright on the production build with `storageState`) carry into every async ingest the student tests — payment webhooks, email-bounce webhooks, third-party callbacks, internal event buses. The reviewer reads a test file and can name the behavior from the test name alone; running the file proves the behavior holds.
- Show the end UX: a short animated capture of (a) running `pnpm test:integration` and watching three tests go green; (b) commenting out `claimEvent` and re-running, only the idempotency test fails; (c) `pnpm test:e2e` opens Chromium, drives the Checkout flow, lands on the success page, asserts "you're on Pro."
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships every piece of testing infrastructure (Vitest config, MSW server, auth fixtures, the rollback helper, the Stripe event factory, the `postWebhook` and `callAction` helpers, the Playwright config, the auth setup file). The student writes only the four test files. The discipline from 19.1–19.5 is the carry-in, not something re-derived.
- The student needs **two** Postgres databases for this project — `saas_int_test` on port 55432 (used by integration tests via transaction rollback) and `saas_e2e` on the same port (used by Playwright with full reset). The `docker compose up` brings both up; the `.env.test` file points each at its own database name.
- The `.env.test.local` carries the student's actual `STRIPE_SECRET_KEY` (for the Playwright Checkout test to create a real test-mode Checkout session) and `E2E_ADMIN_PASSWORD`. Both are gitignored; the lesson reminds the student to copy `.env.test.local.example` and fill in their own values.
- The integration tests use a **fixed** `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` rather than the `stripe listen` dynamic secret. The route handler reads the env, the `postWebhook` helper signs with the same env, the contract is deterministic. The Playwright Checkout test does *not* go through this path — it goes through a real Stripe-test-mode Checkout, returns to the success page, and the page's polling read of the entitlement is the assertion (no webhook fires in this test because the production build is on `localhost:3001`, unreachable from Stripe's cloud — the test exercises the redirect-and-poll path, the webhook path is integration-tested separately).
- Forward note: Unit 21 wires this suite into GitHub Actions. The chapter ships the local discipline; CI is 21.2's job.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, `pnpm install` clean, `docker compose up -d` runs both Postgres services, `pnpm db:test:setup` migrates the integration DB, `pnpm db:e2e:reset` migrates and seeds the e2e DB, `.env.test.local` filled with the student's Stripe test key and a chosen admin password, `pnpm test:integration` runs zero tests (no `.int.test.ts` files yet), `pnpm test:e2e` runs the `auth.setup.ts` and then reports zero spec files. No test code written. Both databases are alive and seeded.

Estimated student time: 15 to 20 minutes.

---

## Lesson 19.6.2 — Reading the test harness

Walks every provided file in the starter — Vitest integration config, MSW handlers, auth fixtures, the rollback helper, the Stripe event factory, `postWebhook`, `callAction`, Playwright config, and the auth setup — and runs both empty suites to confirm the harness boots.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: the empty `tests/integration/*.int.test.ts` slots (three files), the empty `tests/e2e/checkout-money-path.spec.ts`, the provided `src/test/integration-setup.ts`, and the provided `src/test/helpers/post-webhook.ts`. Read each of the helpers end-to-end so the student knows the contract surface before writing tests against it.
- Read `vitest.integration.config.ts`: `environment: 'node'`, `include: ['tests/integration/**/*.int.test.ts']`, `setupFiles: ['./src/test/integration-setup.ts']`, `pool: 'forks'` (the senior reach — `forks` avoids the rare Drizzle-on-workers connection-recycling bug; named once), `fileParallelism: false` for the integration project (one file at a time — the test DB has one schema and rollback discipline is per-test within a file, not across files concurrently). Forward reference to the chapter-end "when does fileParallelism earn its weight" note: when the test DB is per-worker (19.3.2), not per-suite.
- Read `src/test/integration-setup.ts`: loads `.env.test`, sets `process.env.TZ = 'UTC'` (matches 18.1.1's production discipline), starts MSW (`server.listen({ onUnhandledRequest: 'error' })` — fail loudly when a test hits an un-stubbed network call), resets handlers `afterEach`, closes MSW `afterAll`. Names the discipline from 19.3.5: the un-stubbed-call failure is the test telling you a network call snuck in.
- Read `src/test/fixtures/with-rollback.ts`: opens a transaction on `DATABASE_URL_TEST`, yields the `tx` to `fn`, throws unconditionally inside a `finally` after calling `ROLLBACK`. The senior anchor: every integration test wraps its DB work in `withRollback`; the route handler (which uses the global `db`) gets pointed at the same transaction via an async-local-storage shim (the starter wires this — names the technique, references 19.3.1 where the lesson teaches the depth).
- Read `src/test/fixtures/auth.ts`: `createAdmin(tx, { orgId? })` inserts a user, an org (if not supplied), an `org_members` row, a session row keyed to a deterministic session ID; returns `{ user, session, ctx: { orgId, userId, role: 'admin' } }`. The `ctx` shape matches the production `authedAction` context — the test exercises the same wrapper the real action uses.
- Read `src/test/fixtures/stripe-events.ts`: three factories (`checkoutCompleted`, `subscriptionUpdated`, `subscriptionDeleted`) returning fully-typed `Stripe.Event` objects. Defaults are deterministic enough that two test invocations with the same arguments produce events with different `id`s (Date.now + nanoid) — the senior reach: `eventId` is the dedup key, and reusing one across tests breaks isolation. Names the convention: tests that exercise idempotency explicitly override `eventId`; tests that exercise the happy path let it be auto-generated.
- Read `src/test/msw/handlers/resend.ts`: a `http.post('https://api.resend.com/emails', async ({ request }) => { const body = await request.json(); resendCalls.push(body); return HttpResponse.json({ id: 'fake_resend_id' }); })` handler. `resendCalls` is a module-scoped array reset in setup's `afterEach`. The lesson restates the rule from 19.3.4: MSW is at the network boundary, not at `lib/email.ts`.
- Read `src/test/helpers/post-webhook.ts`: constructs a `Request` with the right headers, signs with `Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp })`, optionally mutates a character of the signature, calls the route's `POST` export. The senior anchor: the test exercises the same `POST` function production runs — no fake or mock route handler, no test-only branch in production code.
- Read `src/test/helpers/call-action.ts`: wraps a Server Action call with a synthesized session context. The starter's implementation reuses the production `authedAction` wrapper's async-local-storage seam — the test does not subvert the action, it just plants the session the action would have read from cookies in production.
- Read `playwright.config.ts`: `webServer` boots `pnpm build && pnpm start -p 3001` (the e2e port — different from dev's 3000 so a local dev server doesn't conflict); the `setup` project signs in once; the `chromium` project depends on `setup` and inherits the `storageState`. The `webServer.env` block sets `DATABASE_URL=$DATABASE_URL_E2E`, `STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY`, etc. — the test server runs against the e2e DB and the student's Stripe test account, not the dev DB and not the integration DB.
- Read `tests/e2e/auth.setup.ts`: a Playwright test that signs in the admin user via the UI, then calls `page.context().storageState({ path: '.auth/admin.json' })`. Runs as a dependency of every chromium-project test. Names the 19.5.2 rule: UI-login-per-test is the anti-pattern; this file runs once per `playwright test` invocation.
- Read `tests/e2e/fixtures.ts`: extends Playwright's `test` with `adminPage` (a `Page` with `storageState` applied) and `orgSlug` (the seeded org's slug). Tests import `{ test, expect }` from this file, not from `@playwright/test` directly.
- Run `pnpm test:integration` with zero spec files: Vitest reports "No test files found." Run `pnpm test:e2e`: Playwright runs `auth.setup.ts`, signs in, writes `.auth/admin.json`, then reports "No tests found." Both runs prove the harness is alive before the student writes a test.
- Run the dev server (`pnpm dev`) and walk to the inspector from 12.3 — the same inspector is still present, useful for debugging an integration-test failure against the dev DB.

Senior calls and watch-outs:

- The MSW handler records calls into a module-scoped array. The `afterEach` reset (`resendCalls.length = 0`) is in the setup file; forgetting to reset would let a previous test's calls leak into the next test's assertion. The starter wires the reset — the lesson names the trap.
- The `withRollback` discipline depends on the route handler's `db` calls landing inside the test's transaction. The starter wires async-local-storage so a request begun inside `withRollback`'s callback sees the same `tx`. This is a 19.3.1 technique; the lesson does not re-teach it, but does name the wiring file (`src/db/test-tx-context.ts`) so the student knows where the seam lives.
- The Playwright server runs on **port 3001** so the student can keep `pnpm dev` running on 3000 for debugging. Forgetting that distinction is the canonical "my test is hitting dev data" bug; the starter's `.env.test` points the e2e DB at the right database and the Playwright `webServer.env` overrides explicitly.
- The Stripe test-mode key is the student's own. The `pnpm seed:stripe` from 12.3 was already run; the products and prices exist in the student's Stripe account; the Playwright test reuses them. No additional Stripe-side seeding for this project.
- The `.auth/admin.json` file contains a real session cookie. The `.gitignore` excludes the `.auth/` directory; the lesson reminds the student to check before commit.
- The integration tests do NOT call live Stripe. The webhook handler imports `stripe.webhooks.constructEvent` (which only verifies the signature, no network), and the `onCheckoutCompleted` handler calls `stripe.subscriptions.retrieve` (which IS a network call — the lesson names the workaround: the starter's `src/test/msw/handlers/stripe.ts` intercepts `GET https://api.stripe.com/v1/subscriptions/...` and returns a fixture subscription that matches the event the test fired). This is also a 19.3.5 pattern: MSW at the boundary, including for Stripe's API.

Codebase state at entry: starter cloned, deps installed, databases up and seeded.
Codebase state at exit: student has read every helper, fixture, and config file in the test harness; run both test commands against an empty suite and confirmed the harness boots. No test code written.

Estimated student time: 30 to 40 minutes.

---

## Lesson 19.6.3 — The happy-path webhook test

Writes the first integration test that drives a signed `checkout.session.completed` event through the real route handler and asserts on the `processed_events`, `plan_entitlements`, and `audit_logs` rows that result.

Goals:

- Write `tests/integration/webhook-checkout-completed.int.test.ts`. Single `describe` block, single happy-path `it`. AAA shape with blank-line separation.
- **Arrange:** open `withRollback(async (tx) => { ... })`. Inside, create an admin user + org via `createAdmin(tx)` returning `{ ctx }`. UPDATE `organizations.stripeCustomerId` to a deterministic test value (`cus_test_${ctx.orgId}`) so the handler's resolution path has something to look up if the metadata fallback fires. Construct the event: `const event = checkoutCompleted({ orgId: ctx.orgId, customerId: 'cus_test_...', subscriptionId: 'sub_test_...' })`. Set up the MSW override for the `subscriptions.retrieve` call: `server.use(http.get(\`https://api.stripe.com/v1/subscriptions/sub_test_...\`, () => HttpResponse.json(fixtureSubscription({ id: 'sub_test_...', lookupKey: 'course_pro_monthly', status: 'trialing', currentPeriodEnd: 1763577600 }))))`. The `fixtureSubscription` factory ships in the starter.
- **Act:** `const response = await postWebhook(event)`.
- **Assert (one behavior — the webhook ingest):**
  - `expect(response.status).toBe(200)` and `await expect(response.json()).resolves.toMatchObject({ received: true })`.
  - `const claimed = await tx.select().from(processedEvents).where(eq(processedEvents.eventId, event.id))` → length 1, `eventType: 'checkout.session.completed'`.
  - `const entitlement = await tx.select().from(planEntitlements).where(eq(planEntitlements.organizationId, ctx.orgId))` → `plan: 'pro'`, `status: 'trialing'`, `subscriptionId: 'sub_test_...'`, `lastEventAt` matches `new Date(event.created * 1000)`, `cancelAtPeriodEnd: false`.
  - `const audit = await tx.select().from(auditLogs).where(and(eq(auditLogs.organizationId, ctx.orgId), eq(auditLogs.event, 'billing.subscription.activated')))` → length 1.
- Verify the test name reads as the behavior: `it('upserts the entitlement, claims the event, and writes an audit log when a valid checkout completes', async () => { ... })`. The name passes the 19.1.4 read-aloud test.
- Walk the failure-message shape: replace the `expect(...).toMatchObject({ plan: 'pro' })` with `expect(entitlement.plan).toBe('pro')` and run with a deliberately broken handler — observe the diff Vitest renders. Restore the structural matcher; names the rule from 19.1.4 (prefer the matcher with the most readable diff).
- Run `pnpm test:integration`. The test should pass. Re-run immediately — also pass (the rollback discipline holds). Run `pnpm test:integration -- --reporter=verbose` — the `describe` / `it` lines list the behavior catalog.

Senior calls and watch-outs:

- The test does NOT mock `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, or any internal helper. It exercises the real route handler's `POST` export. The mocking surface is exactly two boundaries: Stripe's HTTP API (MSW) and Resend's HTTP API (MSW). Everything else is real code against real Postgres.
- The assertion on `lastEventAt` is the load-bearing ordering proof — without it, an order regression in 12.3.5's `WHERE lastEventAt < ?` predicate could ship green. Names the rule from 19.3.6: every test on a webhook handler asserts on the `processed_events` row AND on the ordering column, not just on the business-state mutation.
- The assertion uses `tx.select()` because `tx` is the transactional handle the route handler shares (via the async-local context). Reading with `db` (the global) would see *uncommitted* state in some Postgres isolation modes and *missing* state in others — always read with `tx` inside `withRollback`.
- The single happy-path `it` asserts on four contract surfaces (response, `processed_events`, `plan_entitlements`, `audit_logs`). The 19.1.4 rule allows multiple `expect`s when they describe the same behavior — "the handler processed the event" is one behavior with multiple observable surfaces. If the test added an `expect(resendCalls)` block too, it would be testing two behaviors (ingest + downstream notification) — the right move would be a separate test, but in this chapter the welcome-email send is not wired off the webhook (Unit 14's notification dispatcher takes that on), so the Resend handler is asserted on with `expect(resendCalls).toHaveLength(0)` in this test — a negative assertion that names the boundary.
- The Stripe API mock returns a fixture that matches the event's claims (same `subscriptionId`, same `lookup_key`). A drift between the event and the API response is what production sees on Stripe API outages — the test does not exercise that today (out of scope), but the lesson names the fact that the MSW handler is the contract and any drift between event and API is a deliberate test case the team can add later.
- The test serializes inside `withRollback`. Multiple tests in this file would each call `withRollback` separately; the outer transactions do not nest. The `fileParallelism: false` setting (from 19.6.2) keeps a single test file's tests serial; cross-file parallelism is fine because each file's tests roll back their own writes.
- The test uses `it` (not `it.concurrent`) — the rule from 19.1.1 and 19.3.8. Concurrent within a file would race against the shared MSW handler array.

Codebase state at entry: harness verified, zero test files.
Codebase state at exit: `tests/integration/webhook-checkout-completed.int.test.ts` exists and passes; `pnpm test:integration` reports `1 passed`; running twice in a row produces two green runs without state cleanup between them.

Estimated student time: 60 to 75 minutes.

---

## Lesson 19.6.4 — Replay and tamper tests

Adds two integration tests proving that a replayed event is a no-op (`duplicate: true`, no extra rows) and that a tampered signature returns 400 problem+json with zero downstream writes.

Goals:

- Write two test files in sequence, each in its own `*.int.test.ts` slot, each with a single `describe` and a single behavior-named `it`. They share the helpers from 19.6.3 — most of the lesson's work is the deliberate construction of the failure inputs.

**Part one — `webhook-idempotency.int.test.ts`:**

- **Arrange:** `withRollback(async (tx) => { ... })`. `createAdmin(tx)`; set `stripeCustomerId`; build event with explicit `eventId: 'evt_test_idempotency_fixed'` so the same ID survives the second send. MSW override for `subscriptions.retrieve` returning a fixture (same as 19.6.3 — `course_pro_monthly`, `trialing`).
- **Act:** `const first = await postWebhook(event); const second = await postWebhook(event);`.
- **Assert (one behavior — the second send is a no-op):**
  - `expect(first.status).toBe(200)` and `await expect(first.json()).resolves.toMatchObject({ received: true, duplicate: false })`.
  - `expect(second.status).toBe(200)` and `await expect(second.json()).resolves.toMatchObject({ received: true, duplicate: true })`.
  - `processed_events` row count = 1.
  - `plan_entitlements.updatedAt` from the row read after the first call equals `plan_entitlements.updatedAt` from the row read after the second call (capture before the second `postWebhook` runs; assert equality).
  - `audit_logs` row count for the org = 1.
- Test name: `it('returns 200 with duplicate=true and does not mutate state on a replayed event', async () => { ... })`.

**Part two — `webhook-signature-rejected.int.test.ts`:**

- **Arrange:** `withRollback(async (tx) => { ... })`. `createAdmin(tx)`; build event normally (the event is well-formed; the corruption is in the signature).
- **Act:** `const response = await postWebhook(event, { tamperSignature: true })`.
- **Assert (one behavior — the request is rejected before any work):**
  - `expect(response.status).toBe(400)`.
  - `expect(response.headers.get('content-type')).toBe('application/problem+json')`.
  - `await expect(response.json()).resolves.toMatchObject({ title: 'invalid_signature', status: 400 })`.
  - `processed_events` row count = 0.
  - `plan_entitlements` row for the org still reflects the seed (`plan: 'free'`).
  - `audit_logs` row count for the org = 0.
  - `resendCalls.length === 0`.
- Test name: `it('rejects with 400 problem+json and writes nothing when the signature is tampered', async () => { ... })`.
- Run `pnpm test:integration`. Three tests green. Re-run; still three green.
- Read both tests against the 19.1.4 black-box rule: replace the route handler implementation with an entirely different one that satisfies the same contract (verify → claim → mutate → audit). Do the tests still pass? Yes — they assert on the contract, not on the implementation.

Senior calls and watch-outs:

- The fixed `eventId` in the idempotency test is the load-bearing setup — without it, each `postWebhook` call would generate a different ID and the second call would be a *new* event, not a replay. Names the rule: idempotency tests pin the dedup key explicitly.
- Comparing `plan_entitlements.updatedAt` across the two calls is the cleanest mutation-free assertion. A test could also `expect(plan_entitlements.updatedAt).toEqual(<exact value>)` but the value depends on `now()` at the time the first call ran — equality across the two reads is more robust and reads as "no mutation happened in between."
- The signature-tampered test is the structural proof that **verification happens before any work**. If the route logged the body before verifying (the watch-out from 12.3.3), `resendCalls` would still be empty but the structured log would carry attacker-controlled content. The test asserts on the empty state of every downstream surface — DB, audit log, MSW — as the cumulative proof.
- The duplicate test asserts on a `duplicate: true` flag in the response body. The route handler from 12.3.4 returns `{ received: true, duplicate: true }` on the dedup-hit path. If the team later changes the response shape (e.g., to omit the flag in production), this test breaks — which is the right behavior: the response shape is a contract callers (and operators reading logs) depend on, and changing it deserves a test change.
- Both tests use the same `withRollback` + `createAdmin` + Stripe MSW override pattern. The lesson reuses the helpers verbatim — the senior reach is that the test infrastructure was built once (in the starter and in 19.6.3) and three tests then cost minutes apiece, not hours. Names the cost-amortization argument from 19.3.1.
- The tests are in separate files because each is its own behavior story (idempotency vs. signature rejection). One file with two `it` blocks would also be fine; the lesson names the trade-off (one file = easier `--reporter=verbose` read; two files = parallel runtime). The starter chose two files to surface file-parallel structure.
- The `onUnhandledRequest: 'error'` in MSW setup catches a regression where a future change to the route handler adds a new outbound call — the test fails loudly with an un-stubbed-network error pointing at the new call. That's the 19.3.5 contract surface.

Codebase state at entry: one happy-path test green.
Codebase state at exit: three integration tests green. `pnpm test:integration -- --reporter=verbose` lists three behaviors, each described in the `it` name. Running twice in a row produces two green runs.

Estimated student time: 60 to 75 minutes.

---

## Lesson 19.6.5 — Driving Checkout end to end

Writes the single Playwright test that signs in via `storageState`, clicks Upgrade, fills the Stripe Checkout iframe with `4242 4242 4242 4242`, returns to `/billing/success`, and watches the poller flip the UI to Pro.

Goals:

- Write `tests/e2e/checkout-money-path.spec.ts`. Single `test('admin can upgrade to Pro via Stripe Checkout', ...)` block. Uses `adminPage` from `tests/e2e/fixtures.ts` (the page with `storageState` applied).
- **Steps in the test:**
  - `await adminPage.goto('/billing')`. `await expect(adminPage.getByRole('heading', { name: /billing/i })).toBeVisible()`. `await expect(adminPage.getByText(/current plan: free/i)).toBeVisible()` — anchor: the entitlement starts as free per the e2e seed.
  - `await adminPage.getByRole('button', { name: /upgrade to pro/i }).click()` — `billing.upgrade('pro')` fires; the action's redirect lands the browser on `checkout.stripe.com/...`.
  - `await expect(adminPage).toHaveURL(/checkout\.stripe\.com/)` — anchor: the redirect happened.
  - Inside Stripe Checkout: fill the card iframe. `const cardFrame = adminPage.frameLocator('iframe[name^="__privateStripeFrame"]').first()` then `await cardFrame.getByPlaceholder('1234 1234 1234 1234').fill('4242 4242 4242 4242')`; CVC, exp, ZIP via additional `frameLocator` chains. The starter ships `tests/e2e/helpers/fill-stripe-card.ts` (a small abstraction over the iframe selectors); the lesson reads it and uses it inline.
  - `await adminPage.getByRole('button', { name: /(start trial|subscribe|pay)/i }).click()` — Stripe's button label varies with whether a trial is active; the regex covers both.
  - `await expect(adminPage).toHaveURL(/\/billing\/success/, { timeout: 30_000 })` — the return.
  - `await expect(adminPage.getByText(/finalizing/i)).toBeVisible({ timeout: 5_000 })` — the poller's "finalizing" copy is visible during the redirect-versus-webhook race.
  - `await expect(adminPage.getByText(/you're on pro/i)).toBeVisible({ timeout: 30_000 })` — the poller eventually flips the UI when the webhook lands and `plan_entitlements` is updated.
  - `await adminPage.goto('/billing')` — return to the dashboard.
  - `await expect(adminPage.getByText(/current plan: pro/i)).toBeVisible()` — the persistent confirmation that the entitlement is now Pro.
- Run `pnpm test:e2e`. The test takes 30-90 seconds (real network round-trip to Stripe; the webhook arrival is the bottleneck — Stripe's local-mode delivery is usually 2-5s but can spike). Confirm green.
- Read the `playwright-report/index.html` after a green run. Open the trace — every action, every locator, the screenshot at each step, the network log showing the redirect to `checkout.stripe.com` and back, the request to the webhook endpoint. The trace IS the debugger from 19.5.2.
- Read the test against the 19.5.1 trigger filter: this is money path #2. Failure means a user pays and doesn't get the plan, or doesn't pay and does. The trigger is met.
- Read the test against the 19.5.2 idiom checklist: role-first locators (the Upgrade button by role+name), `frameLocator` for Stripe's iframes (necessary, not stylistic), `expect.toHaveURL` and `expect.toBeVisible` are auto-waiting (no `waitForTimeout`), `storageState` (no UI login), the test runs against the production build via `webServer` (the config).

Senior calls and watch-outs:

- The Playwright test does NOT assert on the database directly. The assertions are on what the **user sees** in the browser. The integration tests already prove the database write; the Playwright test proves the composition (Stripe round-trip + webhook arrival + UI poll) renders the right thing. Duplicating the DB assertion at the Playwright layer is the 19.5.3 anti-pattern (covering the same bug at higher cost).
- The Stripe webhook reaches the Playwright server because the server is running locally with `stripe listen --forward-to localhost:3001/api/webhooks/stripe` started in a side terminal before the test runs. The starter's `package.json` ships a `test:e2e:with-stripe` script that boots `stripe listen` in the background, runs `pnpm test:e2e`, and tears down the listener. The lesson names the seam: without the CLI forwarding, the webhook never arrives and the poller times out at 30s.
- An alternative shape is to skip the webhook entirely and have the success page read directly from Stripe's API via `stripe.checkout.sessions.retrieve`. The course's reach (from 12.3) is the webhook-as-single-writer pattern; the test exercises that pattern, not a workaround.
- The Stripe Checkout iframe locators (`iframe[name^="__privateStripeFrame"]`) are pinned to Stripe's current frame-naming convention. Stripe occasionally adjusts this; the starter's `fill-stripe-card.ts` helper is the centralized seam where the breakage would be fixed. Names the rule: every fragile third-party seam lives in one file.
- `retries: 1` in CI is on by default (the config from 19.5.2). A flaky run that passes on retry produces a trace artifact for the failed attempt — the reviewer reads the trace, files a structural fix (better locator, longer timeout for the webhook race), removes the flake. The retry is the *signal*, not the fix.
- The Playwright test runs Chromium only. WebKit and Firefox are opt-in for money paths per 19.5.2; the lesson notes the addition is one project line (`projects: [..., { name: 'webkit', dependencies: ['setup'], use: { ...devices['Desktop Safari'] } }]`) but defers the cross-browser run to CI cost discipline.
- The `STRIPE_SECRET_KEY` in `.env.test.local` is the student's own test-mode key. A `pnpm test:e2e` run creates a real Checkout session in the student's Stripe dashboard (visible at `dashboard.stripe.com/test/checkouts`); the test card produces a real subscription on the test side. Cleanup is none — Stripe test-mode data persists; the student can ignore it or delete it from the dashboard.
- The test does not exercise the Portal cancellation flow. The lesson names the reason: the Portal lives at `billing.stripe.com` and Playwright cannot reliably drive it (the Portal UI evolves more aggressively than Checkout, the deep-links and confirmation modals are not officially documented as automation-stable). The cancellation projection (`customer.subscription.updated` with `cancel_at_period_end: true`) is covered by an extension of the integration suite the student can add as homework — the test infrastructure supports it trivially.

Codebase state at entry: three integration tests green, no e2e spec yet.
Codebase state at exit: one Playwright test green; `pnpm test:e2e` reports `1 passed`; `playwright-report/index.html` opens with the run summary and a trace per step. The full test suite (integration + e2e) covers the webhook seam in isolation AND the money-path composition.

Estimated student time: 75 to 90 minutes. The chapter's heaviest lesson; the iframe locators and the `stripe listen` orchestration are the load-bearing setup.

---

## Lesson 19.6.6 — Verify and mutation drills

Walks every "Done when" clause, runs the deliberate-handler-mutation drills that prove each test isolates the right failure, and names the coverage gaps to absorb as homework.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- **Integration suite green twice in a row.** `pnpm db:test:setup` (idempotent — drops and recreates the test DB, runs migrations). `pnpm test:integration` → 3 passed. Immediately `pnpm test:integration` again → 3 passed. The student opens `psql $DATABASE_URL_TEST` and queries `select count(*) from processed_events; select count(*) from plan_entitlements; select count(*) from organizations; select count(*) from audit_logs;` — all zero. The rollback discipline left no state behind.
- **Playwright suite green.** `pnpm db:e2e:reset` (drops, migrates, seeds — the e2e DB is reset between full runs, not per test). `pnpm test:e2e` → 1 passed. The HTML report opens; the trace shows the full step-by-step.
- **Behavior-anchored proof: deliberate handler mutations isolate failure.** Five drills, each rolled back via `git checkout`:
  - Comment out `claimEvent` in `lib/webhooks/stripe.ts`'s dispatch. Re-run `pnpm test:integration`. Result: the happy-path test passes (the entitlement is still written, the audit log is still written, the response is still 200 — the dedup never gets a chance to fire); the idempotency test fails (`processed_events` row count is now 2, not 1; `plan_entitlements` was updated twice; `audit_logs` has two rows); the signature-rejection test still passes (signature check still runs first). The failure is localized to the test that asserts on dedup. Restore.
  - Skip the signature verification (`try { ... } catch` returns 200 with `{ tampered: true }` instead of 400). Re-run. Result: the happy-path and idempotency tests pass; the signature-rejection test fails on `response.status === 400`. Localized. Restore.
  - Make `subscriptionToEntitlement` return `plan: 'free'` regardless. Re-run. Result: the happy-path test fails on the assertion `entitlement.plan === 'pro'`; the idempotency test passes (the no-mutation-on-replay rule still holds); the signature-rejection test passes. Localized. Restore.
  - Remove the `lastEventAt < event.created` predicate from the UPDATE WHERE clause. Re-run. Result: all three tests still pass (the project's tests don't exercise the ordering case — name the gap as a homework extension for a fourth integration test). Restore.
  - Remove the `audit_logs` write from `onCheckoutCompleted`. Re-run. Result: the happy-path test fails on the audit-log assertion; the other two pass. Localized. Restore.
- **Behavior-over-implementation proof: refactor without breaking tests.** Apply a no-op refactor — rename `subscriptionToEntitlement` to `projectSubscription`, rename internal helpers in the dispatch, restructure the switch into a Record dispatch. Re-run `pnpm test:integration`. Result: all three tests still pass. The 19.1.4 rule held — the tests asserted on the contract, not on internals. The lesson restates: a test that breaks on a rename is testing implementation; a test that survives the rename is testing behavior.
- **Network-boundary proof: every MSW handler caught the right call.** Read `resendCalls` in each test — happy-path test asserts `length === 0` (no email triggered off the webhook in this project; Unit 14 wires the dispatcher); idempotency test asserts the same; signature test asserts the same. The MSW Stripe handler was called exactly once per integration test (for the `subscriptions.retrieve` call inside `onCheckoutCompleted`) — `onUnhandledRequest: 'error'` would have failed the suite if any other outbound network call slipped in. Names the discipline.
- **Coverage diagnostic.** Run `pnpm test:integration --coverage`. Open `coverage/index.html`. Drill into `lib/webhooks/stripe.ts`, `lib/billing/projection.ts`, `app/api/webhooks/stripe/route.ts`. Read the branch-coverage column (not the line column — the 19.1.3 rule). Identify branches the three tests don't exercise: the `onSubscriptionUpdated` and `onSubscriptionDeleted` handlers (named as gap), the `resolveOrgIdFromCustomer` fallback path (named as gap), the `subscriptions.retrieve` error path (named as gap). The lesson names these as the next set of tests to write; this project doesn't ship them but the coverage HTML tells the team where the bug-density-vs-coverage gap is.
- **Trace artifact discipline.** Force the Playwright test to fail (change the assertion to expect "you're on Team" instead of "Pro"). Re-run `pnpm test:e2e`. The test fails on retry; the trace zip is in `test-results/.../trace.zip`. `pnpm exec playwright show-trace test-results/...` opens the GUI. Walk the trace — see the DOM at every action, the network log, the screenshot at the failed assertion. Restore the assertion. Names the rule: the trace is the debugger; no `console.log`s.
- Forward references:
  - **Unit 21 (CI):** the integration and Playwright suites both run on every PR; the JUnit reporter feeds GitHub Actions; the HTML report and trace zips are uploaded as artifacts; merge is gated on green. 21.2 owns the wiring.
  - **Unit 20 (observability):** in production, the webhook handler emits structured logs the integration suite asserts on indirectly (via the disposition string in the response body); 20.1 reads those logs and surfaces them in Sentry/PostHog.
  - **The homework extension:** a fourth integration test for the ordering predicate (`subscription.updated` with an older `created` than `lastEventAt` no-ops); a fifth for the `subscription.deleted` path; both reuse the helpers from this chapter and cost minutes apiece. Named explicitly; the suite is structured to absorb them.
- Name the senior calls one more time:
  - The honeycomb's center of gravity is integration; this project's three integration tests cover the webhook seam where the bugs live.
  - Mock at the network boundary, not the function — Resend and Stripe API are MSW'd; nothing inside `lib/` is mocked.
  - One Playwright test on the money path that costs money; everything else is integration or off the menu.
  - The rollback discipline makes per-test isolation structural; the e2e reset is per-full-run.
  - Behavior over implementation — the deliberate-mutation drill is the proof the team can run any time the suite feels stale.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and confirming the test that should fail does fail, and others stay green. If a mutation drill doesn't isolate failure correctly, the test is over-asserting (testing too many behaviors in one `it`) or under-asserting (missing the assertion that catches the mutation). Either is a 19.1.4 rule violation; the lesson points the student back to the owning lesson.
- The coverage gap — `onSubscriptionUpdated`, `onSubscriptionDeleted`, and the ordering predicate — is named explicitly rather than fixed. The project's budget is the three named integration tests + one Playwright; the suite is designed to absorb more, and naming the gap as homework is more honest than tacking on shallow tests.
- The Playwright test takes 30-90 seconds. CI cost discipline (from 19.5.1) suggests one path is the right count for this project; a real production codebase reaches four (the catalog from 19.5.3) only when the team can afford the runtime.
- The student leaves the chapter with the muscle memory of `withRollback`, `postWebhook`, `callAction`, the MSW boundary, role-first Playwright locators, and the trace viewer. Those skills generalize to every async ingest and every money path the codebase grows into.

Codebase state at entry: 3 integration + 1 e2e test green.
Codebase state at exit: every "Done when" clause verified; every mutation drill confirmed the expected localization; the coverage gap named; the student can articulate every decision (honeycomb shape, network-boundary mocking, transaction rollback per test, signed-body helper, `callAction` for actions, `storageState` for Playwright, the production build via `webServer`, the trace viewer as debugger) and which forward unit will lean on it.

Estimated student time: 35 to 45 minutes.
