# Lesson 2 — Reading the test harness

## Lesson title

Keep the chapter-outline title: **Reading the test harness** — accurate and senior-framed (read the contract before writing against it).
Sidebar short title: **Test harness tour**

## Lesson type

`Walkthrough`

No exercise. The starter ships every fixture/helper/config complete; the student writes nothing this lesson. They read the contract surface, understand the two seams that make the real route testable with zero SUT edits, and boot both empty suites to confirm the harness is alive. (Per the contract, the test-coder does not run for this lesson — no new test file is produced here; lessons 3–6 own the four TODO files.)

## Lesson framing

The student walks away able to read this test harness as a set of contracts rather than magic: they can name what every provided file does, articulate *why* the integration suite mocks at exactly two seams (`@/db` and `stripe.subscriptions.retrieve`) and nothing else, and explain how the `@/db` Proxy + `testTxContext` let the unedited production route join the test's rollback transaction. The senior payoff: before writing a single assertion, you know which lines are load-bearing and which would silently break verification if touched — so the tests you write in lessons 3–6 are deliberate, not cargo-culted. The lesson closes by booting both suites green-but-empty, proving the harness boots before any test exists to fail.

## Codebase state

**Entry.** The starter is cloned and installed (lesson 1). Both Postgres databases are up and seeded — `saas_int_test` migrated via `pnpm db:test:setup`, `saas_e2e` reset+seeded via `pnpm db:e2e:reset`, both on the `postgres-test` Docker service (port 55432). `.env.test` is committed; `.env.test.local` carries the student's `STRIPE_SECRET_KEY` and `E2E_ADMIN_PASSWORD`. The full Chapter-065 app is present and unchanged. All four TODO test files are stubs: the three `*.int.test.ts` are `describe.todo(...)`, `checkout-money-path.spec.ts` is `test.fixme(...)`. Every harness file (`vitest.config.ts`, `playwright.config.ts`, `src/test/**`, `tests/e2e/auth.setup.ts`, `tests/e2e/fixtures.ts`, the two helpers) is complete. The student has not yet read any of them.

**Exit.** No files changed — this is a reading lesson. The student has read every load-bearing harness file end to end and run both suites once: `pnpm test:integration` reports zero executed tests (three `describe.todo` blocks collected as todo), `pnpm test:e2e` runs the `setup` project (signs in via the Better Auth API, writes `.auth/admin.json`), then the `chromium` project finds only the `test.fixme` spec. `.auth/admin.json` now exists (gitignored). The harness is confirmed alive; lesson 3 writes the first real test against it.

## Lesson sections

Walkthrough structure — step-by-step sections, one per surface, no exercises. Order tracks the chapter framing: orient on the file tree, then read the load-bearing files (config → setup → rollback → fixtures → MSW → request helper → Playwright config → auth setup → Playwright fixtures → card helper), then boot both suites.

### Intro (no header)

Two-command frame: `pnpm test:integration` (Vitest, real test Postgres, per-test rollback) and `pnpm test:e2e` (Playwright, production build via `webServer`, separate `saas_e2e` DB). State the lesson's stance: the student writes only four test files all chapter; everything else ships in the starter, so the job now is to read the harness as a contract. Name the single senior anchor up front — the `@/db` Proxy mock is the seam that makes the *unedited* production route testable. Keep it brief and warm.

### The two-project Vitest config

`vitest.config.ts`. Walk the two `test.projects` — `lesson` (`include: ['lesson-verification/**/*.ts']`, no DB) and `integration` (`environment: 'node'`, `globals: false`, `include: ['tests/integration/**/*.int.test.ts']`, `setupFiles: ['./src/test/integration-setup.ts']`, `fileParallelism: false`). Three senior reaches, one sentence each:
- `vite-tsconfig-paths` must sit inside *each* project's `plugins` — Vitest 4 does not propagate root plugins into `test.projects`, so root-only placement leaves every `@/…` import unresolved.
- The integration project aliases `server-only`/`client-only` → `src/test/empty-module.ts` so the route's transitive `server-only` import does not throw under the Node test env.
- `fileParallelism: false` because the test DB is one schema shared across files — isolation is per-test rollback, not per-worker (contrast lesson 2 of chapter 086's per-worker model where files run parallel; link, don't re-teach).

Use `AnnotatedCode` — the config has multiple non-obvious parts (the two `plugins` arrays, the alias, the parallelism flag) that each need student focus on a specific line.

### The integration setup — the heart of the harness

`src/test/integration-setup.ts`. The most important file in the lesson; read it end to end. Cover, in source order:
- First line `import '@/test/load-test-env'` — a side-effect import that loads `.env.test` and pins `process.env.TZ = 'UTC'` *before* any `@/…` module body reads `process.env` (matches lesson 1 of chapter 083's production discipline; link).
- The fail-fast guard that throws unless `DATABASE_URL_TEST` includes `localhost:55432` — refuses to run the destructive suite against a real DB.
- `vi.mock('@/db', …)` — **the senior anchor of the whole chapter.** A Proxy whose `get` resolves every member to `testTxContext.getStore() ?? getTestDb()` and whose `transaction(fn)` runs `fn(tx)` directly on the in-scope tx. This is the single seam that makes the real route testable with zero SUT edits: the route imports `{ db }` and opens `db.transaction(...)`; the mock turns that into a no-op join onto the outer `withRollback` transaction, so the rollback owns cleanup. Spend the most prose here.
- `vi.mock('@/lib/billing/stripe', …)` — replaces only `stripe.subscriptions.retrieve` (reads `lookupSubscription` from the registry); `webhooks.*` stay real, so `generateTestHeaderString` (in `postWebhook`) and `constructEvent` (in the route) both verify for real. Name *why* Stripe is not on MSW: `stripe@22`'s `NodeHttpClient` never dispatches over MSW's mock socket and would hang — the lesson 5 of chapter 088 network-boundary discipline still holds, the seam just moves to the SDK (link).
- MSW lifecycle: `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))` (fail loudly on any un-stubbed call), `afterEach` resets handlers + clears `resendCalls` + calls `resetSubscriptions()`, `afterAll` closes MSW.

Use `AnnotatedCode` for the file — step through the load-env import, the guard, each `vi.mock`, and the lifecycle block, each with its own focused explanation.

A diagram earns its place here. Brief one `ArrowDiagram` inside a `Figure` showing the request path: `postWebhook` → real `POST` route → `db.transaction` → (intercepted by `@/db` Proxy) → the `testTxContext` tx opened by `withRollback` → Postgres, with `RollbackSignal` discarding at teardown. The prose can describe the indirection, but the "the route thinks it owns a transaction; the harness owns it" inversion is exactly the kind of flow a box-and-arrow makes click. One figure only.

### Real Postgres, transaction rollback

`src/test/db/with-rollback.ts` and `src/test/db/worker-db.ts`. `withRollback(body)` opens `getTestDb().transaction`, runs the body inside `testTxContext.run(tx, …)` (so the `@/db` Proxy resolves to *this* tx), then throws a private `RollbackSignal` to discard every write the test and the route made. The senior callout: the `catch` swallows **only** `RollbackSignal` and rethrows everything else — a catch-all would silently eat a real assertion failure. `worker-db.ts` is the lazy memoized test client against `DATABASE_URL_TEST`. Note the `testTxContext` AsyncLocalStorage lives at `src/db/test-tx-context.ts`, stored on `globalThis` so the mocked `@/db` and the harness share one store; lesson 1 of chapter 088 owns the depth (link, don't re-teach). Show the `it('…', withRollback(async ({ tx }) => { … }))` call shape so the student recognizes it in lessons 3–6.

`Code` for the helper body, with the `catch`-only-`RollbackSignal` line called out in prose.

### The auth fixture

`src/test/fixtures/auth.ts`. `signedInAs(opts, tx)` inserts user + org (if `orgId` not supplied) + membership + session + **a `plan_entitlements` row** (default `plan: 'free'`) inside `tx`, returning `{ user, org, session, cookieJar }`; `signedInAs({ role: 'admin' }, tx)` is the admin case. The honest project-specific note (the file says so itself): the Stripe webhook route is **session-less** — it never calls `getSession` — so the three integration tests use `signedInAs` only to seed the org + entitlement the handler reads/writes; the returned `session`/`cookieJar` are inert here and exist only to satisfy the lesson-3-of-chapter-088 fixture shape (link). `anonymous()` is the signed-out marker; the module exports exactly these two.

`Code` for the signature; emphasize the session-less reality in prose.

### The Stripe fixtures and the retrieve registry

`src/test/fixtures/stripe-events.ts`, `src/test/fixtures/stripe-subscription.ts`, `src/test/stripe-retrieve-registry.ts`. Three event factories (`checkoutCompleted`, `subscriptionUpdated`, `subscriptionDeleted`) returning fully-typed `Stripe.Event` with `subscription_data.metadata.organization_id` set — the carry-channel from lesson 6 of chapter 065 (link). Senior reach: defaults make `eventId`/`createdAt` deterministic-but-unique per call — `eventId` is the dedup key, reusing one across tests breaks isolation; idempotency tests override `eventId` explicitly (foreshadow lesson 4), happy-path tests let it auto-generate. `fixtureSubscription(...)` builds a minimal `Stripe.Subscription` with item-level `lookup_key` / `current_period_end` (what the projection reads); `registerSubscription(sub)` → per-test `Map`, `lookupSubscription(id)` reads it (throws if unregistered), `resetSubscriptions()` clears it in `afterEach`. The mocked `subscriptions.retrieve` resolves through `lookupSubscription` — so each test declares exactly the subscription the handler will retrieve, and the signature-tampered test (lesson 5) registers none on purpose (foreshadow).

`Code` for the factory signatures; keep the registry flow in prose.

### MSW at the network boundary

`src/test/msw/handlers/resend.ts` and `src/test/msw/server.ts`. `http.post('https://api.resend.com/emails', …)` records the call into the module-scoped `resendCalls` array and returns `200`; the `afterEach` reset (wired in setup) keeps one test's calls from leaking into the next. Restate the rule from lesson 4 of chapter 088: MSW intercepts at the network boundary, never at `lib/email.ts` (link). Project-specific reality: no email fires off the webhook in this project (Unit 13's dispatcher owns notification fan-out), so every test asserts `resendCalls` is **empty** — a negative boundary assertion proving the path stayed quiet.

`Code` for the handler.

### The webhook request helper

`src/test/helpers/post-webhook.ts`. `JSON.stringify`s the event **once** (a second stringify could produce different bytes and break verification), signs that exact string with the real `stripe.webhooks.generateTestHeaderString({ payload, secret })` (secret defaults to `env.STRIPE_WEBHOOK_SECRET`), optionally flips one signature character when `tamperSignature: true`, builds a `Request` with `content-type: application/json` + `stripe-signature: <sig>`, calls the `POST` export imported from `app/api/webhooks/stripe/route`. The senior anchor: the test exercises the **same** `POST` function production runs — no fake handler, no test-only branch in production code. Note the `tamperSignature` path is what lesson 5 drives.

`Code` for the signature + a one-line note on the stringify-once trap.

### Calling Server Actions (not used here)

One short paragraph, no code. The integration suite's SUT is the session-less webhook route, so no Server Action is called directly. The `{ db: tx }`-handle convention from lesson 7 of chapter 088 (link) is the pattern a Server-Action test *would* use; the upgrade `authedAction` is exercised only through the browser in lesson 6. This pre-empts the "where's the action test?" question.

### The Playwright config

`playwright.config.ts`. `webServer` boots `pnpm build && pnpm start -p 3001` — a production build, never `next dev`; the e2e port (3001) differs from dev's 3000 so a local dev server doesn't conflict (the canonical guard against the "my test hit dev data" bug). The `webServer.env` block sets `DATABASE_URL=$DATABASE_URL_E2E`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL` — the test server runs against the e2e DB and the student's Stripe test account. The `setup` project signs in once; the `chromium` project depends on `setup` and inherits `storageState`. Chromium-only by default — WebKit/Firefox are CI cost discipline, named not built. `trace: 'on-first-retry'`, `retries: process.env.CI ? 1 : 0`. Link Playwright primitives to lesson 2 of chapter 090, don't re-teach.

`AnnotatedCode` — focus the student on `webServer` (build+port), the `env` block, and the `setup`→`chromium` project dependency separately.

### The auth setup

`tests/e2e/auth.setup.ts`. Signs the admin in via the Better Auth **API** (`page.request.post('/api/auth/sign-in/email', { data: { email, password } })`), confirms the session by loading `/dashboard`, then writes `page.context().storageState({ path: '.auth/admin.json' })`. Name *why* API-based setup, not form-driving: under Playwright the form's React-Compiler `useActionState` submit leaks React's internal action-encoding fields into the strict-parsed FormData and is unreliable — API auth setup is the robust, recommended pattern (and still avoids lesson 2 of chapter 090's UI-login-per-test anti-pattern; link). `.auth/` holds a real session cookie and is gitignored — remind the student to confirm before commit.

`Code` for the setup body; the React-Compiler caveat in prose.

### The Playwright fixtures and the Stripe-card helper

`tests/e2e/fixtures.ts` and `tests/e2e/helpers/fill-stripe-card.ts`. The fixtures file extends Playwright's `test` with `adminPage` (a `Page` built from the `storageState` the setup project wrote) and `orgSlug` (constant `'e2e-org'`), re-exporting `expect`; tests import `{ test, expect }` from this file, not `@playwright/test` directly. `fill-stripe-card.ts` centralizes the one fragile third-party seam — `frameLocator('iframe[src*="js.stripe.com"]').first()`, then `getByPlaceholder(/card number/i)` (auto-waited visible before fill), `/mm \/ yy/i`, `/cvc/i`, best-effort `/zip|postal/i`. Senior reach: Stripe owns these selectors; keeping them in one file makes a break a one-file fix. Foreshadow lesson 6 uses both.

`Code` for both. Note in prose: `pnpm seed:stripe` from chapter 065 already ran when the webhook project shipped — products and prices exist in the student's Stripe account and the Playwright test reuses them; no additional Stripe-side seeding for this chapter.

### Boot both suites

Close the walkthrough by running both, proving the harness is alive before any test exists:
- `pnpm test:integration` against the three `describe.todo` stubs — Vitest collects them as todo and runs nothing. Show the expected "no tests executed / N todo" output.
- `pnpm test:e2e` — the `setup` project signs in via the API and writes `.auth/admin.json`; the `chromium` project finds only the `test.fixme` spec (skipped). Show the expected output.
- Optionally `pnpm dev` and walk to `/inspector` from chapter 065 — still present, useful for debugging an integration-test failure against the dev DB later.

Use `Steps` for the command sequence with `Code` blocks for expected output. End by confirming `.auth/admin.json` now exists (gitignored).

### External resources (no header)

Appended by the resourcer after the body — leave a placeholder note. Candidate topics: Vitest `test.projects` / workspace, MSW `setupServer` Node usage, Playwright `webServer` + `storageState` docs, AsyncLocalStorage. The resourcer selects.

## Scope

This lesson only *reads* the harness and boots it empty. It does not:
- Write any integration assertion — lesson 3 (happy path), lesson 4 (idempotency), lesson 5 (signature rejection) own those.
- Write the Playwright money-path test or run the mutation/coverage drills — lesson 6.
- Teach the depth behind reused infrastructure: AsyncLocalStorage transaction rollback (lesson 1 of chapter 088), per-worker vs per-test isolation (lesson 2 of chapter 088), MSW network-boundary mocking (lessons 4–5 of chapter 088), the honeycomb shape (lesson 2 of chapter 086), Playwright primitives (lessons 1–2 of chapter 090). Link to those lessons; this lesson assumes they are done.
- Set up the databases or env — lesson 1 (Project Overview) owns setup.
- Explain the production webhook handler's internals (verify → claim → dispatch) beyond what reading the test contract requires — chapters 063–065 own the build.
