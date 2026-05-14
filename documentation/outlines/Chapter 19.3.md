# Chapter 19.3 — Integration tests at the seams

## Chapter framing

Chapter 19.3 fills the **middle band of the honeycomb** installed in 19.1. The bug-density argument from 19.1.2 lands here in code: most production regressions in a Next.js SaaS hit at the seams — the Server Action wrapper that parses input, checks the session, and writes to Postgres; the route handler that verifies a Stripe webhook signature and dedupes against `processed_events`; the Drizzle query that depends on a column nullability the unit test didn't see. Integration tests cover those seams **against a real test Postgres** with **the network mocked at its boundary** through MSW. The runtime cost is real (tens of milliseconds, not microseconds) and the discipline that contains it is structural: transaction rollback per test, per-worker DB isolation, zero shared mutable state.

Threads through every lesson. **The integration project is a separate Vitest project** (`environment: 'node'`, glob `*.int.test.ts`) with its own setup file that opens the test-DB connection and registers the transaction wrapper. **Tests run against a real Postgres** — PGlite, fake drivers, "stub Drizzle" never appear. **Transaction rollback per test is the isolation contract** — every test opens `db.transaction`, runs against `tx`, rolls back unconditionally. **The network is mocked at the boundary, not the function** — MSW intercepts `fetch` so the SDK's serialization, signing, retry, and parsing stay under test. **Auth is a fixture, not a setup ceremony** — `signedInAs({ role, plan, orgId })` returns a `cookies()` stub and a session row in one call. **Webhooks and Server Actions are the canonical seams** — the chapter's worked examples land in code the student already shipped. **Flake is structural** — every flake has a named cause (shared state, run-order dependency, unawaited promise, real-time clock) and a structural fix.

---

## Lesson 19.3.1 — Integration tests against a real test Postgres

Topics to cover:

- **The senior question.** A Server Action calls `db.insert(invoices).values(...).returning()`. A unit test with a mocked `db` proves the call shape, not the behavior — column nullability, unique constraints, default values, generated columns, RLS policies, and the actual SQL Drizzle emits are invisible. The reach: run the test against a **real Postgres** with the production schema, isolate via **transaction rollback per test**, accept the ms-not-µs cost as the price of catching what mocks miss.
- **Integration vs. unit boundary.** Unit (19.2) owns `/lib`'s pure logic. Integration owns anything crossing a process boundary the runtime cares about — Drizzle against Postgres, Server Actions through their full wrapper, route handlers including request/response serialization, webhook receivers including signature verification. The line: if mocking the collaborator means the test wouldn't catch a column-rename, schema-drift, or constraint-violation regression, it's an integration test.
- **The transaction-rollback-per-test pattern.** Every test runs inside `db.transaction(async (tx) => { ... })`; the `tx` is passed where production passes `db`; the wrapper throws a sentinel to force Drizzle to roll back. Sub-millisecond rollback, no truncate/reseed cycle, hundreds of tests in seconds.
- **The `withRollback` helper.** `src/test/db/withRollback.ts` exports a wrapper used as `it('...', withRollback(async ({ tx }) => { ... }))`. Inside: open the transaction, run the body, throw a sentinel error to roll back, swallow only the sentinel. Drizzle's `TransactionRollbackError` is the surface; everything else propagates.
- **Threading `tx` through production code — the seam.** Production accepts a DB handle: `createInvoice(input, { db = defaultDb }: { db?: DbOrTx } = {})`. Default is the singleton; the test passes `tx`. The alternative — async-local-storage context — works but pays a complexity tax for a pattern that's already explicit at the call site. Course default: explicit handle.
- **What does NOT roll back.** Sequences advance and stay advanced. `pg_notify` fires regardless. External side effects (`fetch`, queue enqueues, email sends) are not transactional; they go through MSW (19.3.5) or in-memory stubs. The test asserts on *intent* (the MSW handler was called with shape X), not the side effect.
- **Test data — seed once, override per test.** Worker setup migrates the schema and inserts a tiny baseline (a `seed_org`, a `seed_admin_user`). Per-test factories (19.2.2, extended in 19.3.3) insert fresh rows inside the transaction. Don't reseed per test; don't seed heavy realistic data — that's `drizzle-seed` for dev (6.5.3).
- **Test file convention — `.int.test.ts`.** The `integration` project glob from 19.1.1 picks up `src/**/*.int.test.ts`. The suffix is the discriminator: `invoice.test.ts` is unit, `invoice.int.test.ts` is integration. Prevents accidental promotion of a unit test into the slow lane.
- **`db` vs. `tx` typing.** `DbOrTx = NodePgDatabase | PgTransaction`. Catches the "called `db` inside `tx`" bug — queries on the singleton `db` inside a transaction bypass rollback and commit real rows.
- **Structural enforcement.** ESLint `no-restricted-imports` on `@/db/client` from `*.int.test.ts` files. A test that passes despite *not threading `tx`* is the same class of bug as one that mocks the DB.
- **Cost shape.** `/lib` unit test: 5 ms. Integration with rollback: 20–80 ms. Truncate-and-reseed: 500 ms. The two-orders-of-magnitude gap is why rollback-per-test is the reach.
- **Watch-outs.** Calling the global `db` instead of `tx` commits real rows — the rollback is silent on data outside the transaction; nested transactions become savepoints with subtle semantics — flatten to one level; assertions on auto-incrementing IDs are fragile (sequences advance) — assert on shape; `SELECT ... FOR UPDATE` against a single-connection pool deadlocks against itself; triggers and `pg_notify` fire pre-rollback — assert through other observable state; Postgres extensions requiring autocommit (`pg_cron`, some `pg_partman` ops) don't fit the rollback pattern — those run in a separate truncate-and-reseed lane.

What this lesson does not cover:

- Test-DB lifecycle, migrations, per-worker isolation, Neon — Lesson 19.3.2.
- Auth fixtures — Lesson 19.3.3.
- Network-boundary mocking — Lessons 19.3.4 and 19.3.5.
- Webhook receiver testing — Lesson 19.3.6.
- Server Action end-to-end — Lesson 19.3.7.
- Flake taxonomy — Lesson 19.3.8.
- Drizzle transaction basics — Chapter 6.
- RLS testing — Chapter 11.

Estimated student time: 45 to 55 minutes. Foundational pattern; every later lesson uses `withRollback` and the `tx` seam.

---

## Lesson 19.3.2 — Test database lifecycle and per-worker isolation

Topics to cover:

- **The senior question.** Vitest runs files in parallel workers (19.1.1). Two workers writing to the same Postgres race on advisory locks, sequences, and migration runs. The reach: **per-worker isolated database** — each worker gets its own logical database, `drizzle-kit migrate` runs once per database, the pool maps `VITEST_POOL_ID` to a DB URL. CI swaps this construction for a **Neon branch per workflow run** when realistic data volume earns the cost.
- **Local lifecycle — Docker Compose + per-worker DBs.** `docker-compose.test.yml` brings up Postgres 17 on port `5433`. `globalSetup` connects as superuser and creates `test_w1`…`test_wN` where `N = poolOptions.threads.maxThreads`. Each worker's setup reads `VITEST_POOL_ID` and connects to its own database.
- **`drizzle-kit migrate` against the test DB.** Same migration files (`drizzle/*.sql`) production runs. The programmatic `migrate(db, { migrationsFolder })` from `drizzle-orm/node-postgres/migrator` runs once per worker per suite, not per test.
- **`globalSetup` vs. per-worker `setupFiles`.** `globalSetup` runs once before the entire suite, outside the pool — used for Docker bring-up and database creation. `setupFiles` runs inside each worker — used for migrations, MSW setup, `withRollback` registration.
- **Seed step — one baseline.** After migrations, insert a tiny baseline: one `seed_org`, one `seed_admin_user`. Heavy realistic data belongs in `drizzle-seed` (6.5.3), not test setup. Per-test data comes from factories inside the transaction.
- **The `.env.test` surface.** Separate `DATABASE_URL`, `WORKER_DATABASE_URL_PATTERN=postgres://...:5433/test_w{id}`. Loaded by `dotenv` in global setup. Production `.env` never leaks into tests; `.env.local` is excluded.
- **Schema drift detection.** A pre-test `drizzle-kit check` fails if a developer added a migration locally without running it. CI runs the same check.
- **CI fork.** Two viable shapes: (a) `services: postgres` per GitHub Actions job, migrated fresh at start (course default — simple, free, fast); (b) Neon branch created from `main` at job start, deleted at job end. (b) lands when data volume or RLS-policy depth makes schema-only insufficient.
- **Neon branching as the conditional move.** Neon's O(1) copy-on-write branching gives every CI run a full-data copy of staging in under a second. Reach via `neondatabase/create-branch-action`; the branch URL replaces `DATABASE_URL`; cleanup on workflow completion. Trigger: local Postgres seeding > 5s, or assertions need production-shaped row counts.
- **GitHub Actions wiring.** Job runs `pnpm install`, `docker-compose up -d postgres` (or Neon action), `pnpm drizzle-kit migrate`, `pnpm vitest run --project integration`. Reporter is JUnit (21.2). Cleanup on `if: always()`.
- **Test DB performance — fsync off.** Test Postgres runs `fsync=off`, `synchronous_commit=off`, `full_page_writes=off`. Order-of-magnitude faster than production-tuned. Baked into the Docker `postgresql.conf` — never on a production server.
- **Runner commands.** Local: `vitest --project integration` (watch). CI: `vitest run --project integration --reporter=junit`. Pre-push (lefthook from 21.1): `vitest run --project integration --changed` for affected tests only.
- **Worker count tuning.** Default `maxThreads = Math.min(4, cpus)`. Sweet spot is "as many as the DB handles without contention" — usually 4–8 on a laptop, more in CI runners.
- **Watch-outs.** Running migrations per test file ten-x's the suite — once per worker is correct; sharing one DB across workers serializes everything; using production `DATABASE_URL` in `.env.test` drops production tables on first migration — fail-fast assertion on URL prefix is cheap insurance; sequence advancements leak across rollbacks — never assert exact IDs; `setupFiles` opening the Drizzle pool at module-eval time on a worker whose DB doesn't exist yet fails — lazy-open inside `beforeAll`; Docker image bound to port 5432 collides with local dev — pin 5433; Neon free-tier branch limits queue CI runs — upgrade trigger.

What this lesson does not cover:

- The rollback pattern — Lesson 19.3.1.
- Auth fixtures — Lesson 19.3.3.
- Migration authoring — Chapter 6.4.
- Dev seeding — Chapter 6.5.3.
- CI depth (matrix, caching, reporters) — Chapter 21.2.
- RLS testing — Chapter 11.

Estimated student time: 45 to 55 minutes. Setup-and-wiring lesson; the pattern is one-time but durable.

---

## Lesson 19.3.3 — Auth fixtures for signed-in user with role and org

Topics to cover:

- **The senior question.** Every Server Action and protected route handler reads `await auth()` (Chapter 10) and checks `user.role` and `user.orgId`. Without a fixture, every test re-implements the session stub — five lines of `vi.mock('next/headers', ...)`, a fake cookie, a faked session row, a forgotten `orgId`. The reach: **one factory call returns a signed-in test context** — `await signedInAs({ role, plan, orgId })`.
- **The shape.** `signedInAs({ role, plan, orgId? }, tx) → { user, org, session, cookieJar }`. Inserts a `User`, an `Organization` (or reuses the seed org), a `Session` row; returns a `cookieJar` the Server Action wrapper reads. All inserts happen inside `tx`; rollback cleans up.
- **Stubbing `cookies()`.** Server Actions read cookies via `await cookies()`. The test mocks: `vi.mock('next/headers', () => ({ cookies: () => cookieJar }))`. The jar wraps `Map<string, string>` with `.get`/`.set`/`.delete` — exactly the surface `cookies()` returns. Registered once in the integration `setupFiles`.
- **Stubbing the session helper.** If the codebase reads `await auth()` (Auth.js / Better Auth — wherever Chapter 10 landed), mock at that level: `vi.mock('@/auth', () => ({ auth: () => ({ user, session }) }))`. The fixture sets per-test implementation via `vi.mocked(auth).mockResolvedValue(...)`. Mocking *deeper* — Auth.js internals, the JWT verifier — is the wrong seam and breaks across library updates.
- **Where the fixture lives.** `src/test/fixtures/auth.ts`. Imports factories from 19.2.2, the test `tx`, and the cookie/auth mocks. Exports `signedInAs` and `anonymous` — nothing else.
- **Role and plan matrix.** Defaults `role: 'member'`, `plan: 'free'`. Tests name the override (`signedInAs({ role: 'admin' })`). Failing-authz tests use `signedInAs({ role: 'guest' })` and assert `Result.err({ code: 'FORBIDDEN' })`.
- **Multi-tenant scoping.** Every cross-tenant test names the org explicitly: `signedInAs({ orgId: 'org_A' })`, then asserts a query scoped to `org_A` doesn't see `org_B`. The fixture creates both orgs in setup. RLS depth is Chapter 11.
- **CSRF / Origin headers.** Next.js 16 Server Actions validate `Origin` against the host. The `cookieJar` extends to a `headers` jar (or a `requestContext`) the Server Action runner reads. Without this, every test fails the CSRF check and the failure reads as "auth broken."
- **Token-based parallel.** Session cookies are the course default. API-key auth (Unit 12) has a parallel fixture: `withApiKey({ scope: 'invoices:write' })` returns headers, not cookies. Same pattern, different surface.
- **The `anonymous` context.** A test for the unauthenticated path asserts `Result.err({ code: 'UNAUTHENTICATED' })` without a session. `anonymous()` makes the intent explicit at the call site.
- **Type-safety.** `signedInAs<R extends Role, P extends Plan>(opts, tx) → SignedInContext<R, P>`. Adding a role to the schema breaks the fixture at compile time — desired.
- **What the fixture does not own.** "Who is signed in" — not "what the user did." Test setup of "the user has 3 invoices" is per-test factory calls (`await buildInvoice({ userId: ctx.user.id }, tx)` ×3), not a `signedInAs` parameter. Conflating grows the fixture into a god-object.
- **Watch-outs.** `signedInAs` outside `tx` inserts real users — every test leaks rows; mocking `next/headers` at file scope leaks identity into the next test — reset implementation in `afterEach`; forgetting `orgId` lands users in the seed org and cross-tenant tests pass by accident; mocking `auth()` *and* setting a cookie creates two sources of truth; dynamic-import of the session in production bypasses `vi.mock` hoisting — keep imports static; mocking the JWT library is the wrong seam — mock `auth()`; reusing the same `userId` across two `signedInAs` calls creates aliasing — fresh user per call by default.

What this lesson does not cover:

- The transaction wrapper — Lesson 19.3.1.
- Auth.js / Better Auth setup — Chapter 10.
- API-key auth depth — Unit 12.
- RLS and `auth.uid()` — Chapter 11.
- E2E auth via the UI — Chapter 19.5.
- Password-hashing unit tests — Chapter 10.

Estimated student time: 40 to 50 minutes. Pattern lesson; the fixture is used by every Server Action and route-handler test.

---

## Lesson 19.3.4 — Mock at the network boundary, not the function

Topics to cover:

- **The senior question.** A unit calls `stripeClient.checkout.sessions.create(...)`. The test reaches for `vi.mock('stripe', ...)` and asserts the mocked method was called with `{ line_items: [...] }`. The test passes. Stripe rotates the request shape; production breaks; the test is still green. The mock asserted *the function call*, not *the wire shape*. The reach: **mock at the network boundary** — at `fetch`, the actual process exit — so the SDK's serializer, signer, retry, and parser stay under test.
- **Where the boundary is.** Every HTTP call in a Node SaaS — Stripe SDK, Resend SDK, internal RPC, AI providers — bottoms out at `fetch`. Mock `fetch` and the SDK runs unchanged; the test verifies what the third party actually sees on the wire.
- **The "mock the function" anti-pattern.** Three failure modes: (1) the SDK changes its call site, the test passes against the stale shape; (2) the SDK adds telemetry/retry the test misses; (3) the function-level mock conflates "did the SDK get called" with "did Stripe get the right body."
- **The "mock the SDK class" anti-pattern.** `vi.mock('stripe', ...)` returning a fake class is the same trap one level deeper. Request building, idempotency-key generation, error mapping are now untested. The test ships a fictional Stripe.
- **What boundary mocks catch.** SDK-added headers (`Idempotency-Key`, `Stripe-Version`). Exact URL paths. Form encoding (Stripe v1 uses URL-encoded forms, not JSON). Retry pattern on 502. Response decoder. All of these have shipped real production bugs.
- **MSW as the boundary tool.** Mock Service Worker (`setupServer` for Node) intercepts at the request layer; the SDK runs unchanged. Handlers describe what the wire looks like. Practical setup in 19.3.5.
- **Boundary mocking vs. dependency injection.** DI wins for `/lib`'s pure logic (no I/O). Boundary mocking wins for integration: production wiring stays unchanged.
- **The rule.** **Mock the boundary you don't own** (Stripe, Resend, AI providers). **Don't mock the boundary you do own** (your Postgres — roll back instead). Line: "is the test exercising contracts I write or contracts someone else writes?"
- **Recording vs. handwriting fixtures.** Course defaults to hand-coded — five lines of `HttpResponse.json({...})`, explicit field-by-field. Recordings inflate fixtures with fields you don't assert on and rot quickly.
- **Contract-test relationship.** Boundary mocks describe what *you assume* the third party does. Separate **contract tests** run against the live sandbox on a schedule to detect drift. Too slow/flaky for the per-test loop; one nightly run is the reach.
- **The shape.** "When the user clicks 'Subscribe,' the Server Action posts to Stripe with `metadata.userId`, `metadata.orgId`, an `Idempotency-Key` header." Assert on the *intercepted request*, not the SDK's internal calls. Pattern: capture inside the MSW handler, return canned response, assert after the test body.
- **No internal fetches.** Production code goes through a typed client in `/lib/clients` (Stripe, Resend, internal RPC). Hand-rolled `fetch` in a route handler is a refactor target before it's a test target.
- **Watch-outs.** `vi.spyOn(global, 'fetch', ...)` loses MSW's request-matching ergonomics; mocking the SDK class and the network at once creates two sources of truth; unhandled requests silently returning 200 is a misconfiguration — set `onUnhandledRequest: 'error'`; asserting on SDK call shape defeats the purpose; hand-rolled `fetch` outside `/lib/clients` resists assertion — refactor first.

What this lesson does not cover:

- MSW API surface — Lesson 19.3.5.
- Webhook receiver testing — Lesson 19.3.6.
- Contract testing — out of scope.
- E2E network mocking — Chapter 19.5.
- DI in unit tests — Chapter 19.2.

Estimated student time: 30 to 40 minutes. Decision lesson; sets the threshold the next lesson's mechanics live under.

---

## Lesson 19.3.5 — MSW handlers, matchers, and per-test overrides

Topics to cover:

- **The senior question.** A Stripe checkout test needs `POST /v1/checkout/sessions` to return a canned URL. A duplicate-customer test needs the same endpoint to return 400 with a specific `error.code`. A retry test needs three 503s followed by a 200. The reach: **handlers per scenario, matchers per shape, per-test overrides without leaking** — and the discipline that the `server` instance lives in one place, handlers reset between tests, unhandled requests fail loud.
- **Install and server.** `pnpm add -D msw`. `src/test/msw/server.ts` exports `setupServer(...defaultHandlers)`. Integration setup calls `server.listen({ onUnhandledRequest: 'error' })` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`. `'error'` is the senior reach — a request without a handler is a bug.
- **Default handlers in `src/test/msw/handlers/`.** Per-third-party file (`stripe.ts`, `resend.ts`, `posthog.ts`). Each exports an array covering the happy paths the suite uses. Spread into the `server` constructor.
- **The `http.*` surface.** `http.get`/`post`/`put`/`patch`/`delete`/`all`. URL supports pathname matchers (`https://api.stripe.com/v1/customers/:customerId`). The `request` argument is a real `Request` — `await request.text()` for form bodies (Stripe v1), `await request.json()` for JSON.
- **`HttpResponse` shapes.** `HttpResponse.json(body, { status })`, `HttpResponse.text`, `HttpResponse.error()` for network failure (engages SDK retry). Binary: `new HttpResponse(buffer, { headers })`.
- **Per-test overrides — `server.use`.** Stacks on top of defaults; `resetHandlers` strips before the next test. Reach for unhappy paths; keep happy paths in defaults.
- **The `once` qualifier for sequenced responses.** `server.use(http.post(url, ..., { once: true }), http.post(url, ..., { once: true }), http.post(url, ...))` — three sequential responses, the last sticks. Models flaky upstream for retry tests. `.once` is a handler option, not a method.
- **Capturing the request — the `seen` pattern.** `const seen: Request[] = []; server.use(http.post(url, async ({ request }) => { seen.push(request.clone()); return HttpResponse.json(...) }))`. After the act, `await seen[0].text()` recovers the body. `request.clone()` is required — the original is consumed by the framework.
- **Matchers — params, search, headers.** `({ params })` for captured segments; `new URL(request.url).searchParams.get(...)` for query; `request.headers.get('Idempotency-Key')` for headers. Assert after the test.
- **Failure injection.** `HttpResponse.error()` for network failure; `await new Promise((r) => setTimeout(r, 5000))` for slow upstream — pair with `vi.useFakeTimers()` (19.2.3) and `advanceTimersByTimeAsync`. Status codes (`{ status: 503 }`) test the SDK's real retry.
- **Vitest worker model + MSW.** `server` is module-singleton per worker. Two tests in the same file share it; `resetHandlers` keeps them independent. Across workers, each has its own `server`.
- **MSW v2 vs. legacy.** v2 (October 2023) replaced `rest` with `http`; response signatures shifted from `(req, res, ctx) => res(ctx.json(...))` to returning `HttpResponse` directly. Course writes against v2; legacy snippets on the internet need translation.
- **MSW vs. `nock`.** MSW's advantages: works the same in node, jsdom, and browser; declarative request matching; `onUnhandledRequest: 'error'` is built in. Course pins MSW; `nock` is named once.
- **The "every handler, somewhere" reflex.** Per-test `server.use` overriding a handler with no default is a smell — the default array is the contract; overrides are exceptions. A reviewer reflex.
- **Watch-outs.** Forgetting `await request.text()` returns empty; reading the body twice throws ("body already consumed") — `clone()` first; per-test `server.use` without `resetHandlers` leaks; `onUnhandledRequest: 'warn'` (default) hides URL typos as silent 200s — set `'error'`; pathname matchers — `/v1/customers` doesn't match `/v1/customers/cus_x`; SDK calling a different host (regional endpoint, sandbox) silently misses — pin the exact base URL; `vi.mock('fetch', ...)` and MSW together produce double-mocking — pick MSW.

What this lesson does not cover:

- Boundary-mocking rationale — Lesson 19.3.4.
- Webhook receiver (incoming) testing — Lesson 19.3.6.
- jsdom/browser MSW — Chapter 19.4.
- Playwright network mocking — Chapter 19.5.
- Contract testing — out of scope.
- Typed `/lib/clients` — Chapter 13.

Estimated student time: 45 to 55 minutes. Mechanics lesson; MSW is the day-one reflex for every outbound HTTP call.

---

## Lesson 19.3.6 — Webhook handler testing: signatures and idempotency

Topics to cover:

- **The senior question.** A Stripe webhook at `app/api/webhooks/stripe/route.ts` does four things: verifies signature from `Stripe-Signature` against the raw body, parses, dedupes against `processed_events` by `event.id`, runs the side effect in a transaction. Every step has a failure mode that bites production. Reach: **integration-test the handler end-to-end** — call the exported `POST` with a real `Request`, a real signed payload, against the real test DB.
- **The handler under test.** `import { POST } from '@/app/api/webhooks/stripe/route'`. The test calls `POST(new Request(url, { method: 'POST', headers, body }))` directly — no Next.js dev server, no network hop. Assertions: returned `Response` (status, body) and DB state (committed side effect, or idempotently skipped).
- **The signed fixture — captured once.** `src/test/fixtures/stripe/checkout-session-completed.json` holds a real event captured from `stripe trigger` or the test dashboard. A `src/test/fixtures/stripe/sign.ts` helper takes the JSON and the test secret and produces a `Stripe-Signature` header using the same algorithm Stripe verifies against: `t=<timestamp>,v1=<hmac-sha256>`. The `.env.test` secret matches the one the test sets.
- **The raw-body trap.** Stripe verifies against *raw* request body bytes. Next.js 16 route handlers read `await request.text()`; the test must construct the `Request` with a string body that exactly matches the signed bytes. The most common production bug here is a body parser running before the verifier; the test catches it by signing the same bytes the handler sees.
- **The signature-valid happy path.** Sign, call `POST`, assert `status === 200`, assert the side effect (subscription row, audit log) inside `tx`.
- **The signature-invalid path.** Sign with a *different* secret, call `POST`, assert 400/401, assert *no side effect* (table empty).
- **The timestamp-tolerance path.** Stripe rejects signatures older than 5 minutes. Sign with timestamp 10 minutes in the past — assert 400. Sign within tolerance — assert 200. Clock seam from 19.2.3 controls the timestamp.
- **The idempotency replay path.** Call `POST` with the signed payload — assert 200 and one side-effect row. Call again with the *same* payload — assert 200 (or 202) and *still one row*. `processed_events` recorded `event.id` on first call; the second short-circuits before the side effect.
- **The `processed_events` shape.** Columns `id` (Stripe event ID), `received_at`, `provider`. Handler does `INSERT INTO processed_events (id, provider) VALUES (...) ON CONFLICT DO NOTHING RETURNING id`; empty `RETURNING` means seen — short-circuit. Transaction wraps both the dedupe insert and the side effect.
- **The malformed-payload path.** Sign valid JSON that *fails Zod parsing* (missing `data.object`) — assert 400. Stripe won't retry valid signatures with malformed bodies.
- **The unhandled-event-type path.** Sign a `customer.updated` payload when the receiver only cares about `checkout.session.completed` — assert 200 and zero side effects. Returning 2xx on unhandled types prevents Stripe's retry storm.
- **Event factories.** `buildStripeEvent({ type, data })` layered on the captured JSON. The fixture is the spine; the factory parameterizes variant fields. Pair with `sign()`.
- **Multi-provider portability.** Same shape for Resend bounce webhooks, Auth.js email events, internal queue webhooks.
- **Watch-outs.** Signing the parsed object instead of the literal payload bytes produces different bytes on the second run — sign and send the same string; body parsers (`bodyParser.json()`) between request and handler invalidate signatures — Next.js 16 doesn't run them by default but custom middleware can; clock-skew tests need fake timers; the dedupe table not being part of the transaction is the subtle bug — receiver and dedupe insert must share `tx`; asserting on `event.id` requires production code to use exactly that column — schema drift breaks the test; signing with the wrong secret in `.env.test` ships false-negatives — fail-fast on missing `STRIPE_WEBHOOK_SECRET`; multiple providers in one file share a `vi.mock('next/headers')` of the wrong shape — keep one provider per file.

What this lesson does not cover:

- Outbound MSW mocking — Lessons 19.3.4, 19.3.5.
- Server Action testing — Lesson 19.3.7.
- Stripe receiver implementation — Chapter 13.
- Resend receiver — Chapter 8.
- `processed_events` design — Chapter 13.
- Full Stripe project — Chapter 19.6.
- Production retries/queueing — Chapters 13, 15.

Estimated student time: 50 to 60 minutes. Pattern lesson; the longest in the chapter because the seam runs deep.

---

## Lesson 19.3.7 — Testing Server Actions end-to-end

Topics to cover:

- **The senior question.** A Server Action `createInvoice(input)` does six things: parse input through Zod, read the session via `await auth()`, check the plan, write to Postgres, revalidate a path, return a typed `Result`. A unit test for the inner function skips the wrapper, the session check, the revalidate. Reach: **test the exported action itself**, with auth fixtures (19.3.3), real `tx` (19.3.1), boundary network mocks (19.3.5), and assertions on return, DB, and revalidate.
- **The action under test.** `export const createInvoice = authedAction(InvoiceSchema, async (input, { user, db }) => { ... })`. The `authedAction` wrapper from 7.5 handles session, parsing, error mapping. The test imports the *exported* action and calls it as production calls it.
- **Mocks installed.** `next/headers` (cookies), `@/auth` (session), `next/cache` (`revalidatePath`/`revalidateTag`). All three in the integration `setupFiles`; per-test overrides via `vi.mocked(...).mockImplementation(...)`.
- **Happy-path shape.** Arrange: `await signedInAs({ role: 'admin', plan: 'pro' }, tx)`. Act: `const result = await createInvoice({ amount: 100, ... })`. Assert: `toBeOkResult({ id: expect.stringMatching(/^inv_/) })`; DB row via `tx.select(...).where(...)`; `expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith('/invoices')`.
- **Zod parse failure.** Invalid input — assert `toBeErrResult('VALIDATION_FAILED')`, `result.error.fieldErrors` shape, zero DB writes. The wrapper short-circuits before the body.
- **Unauthenticated.** `vi.mocked(auth).mockResolvedValue(null)`. Assert `toBeErrResult('UNAUTHENTICATED')`, zero DB writes. Wrapper's job, validated through the action.
- **Insufficient permission.** `signedInAs({ role: 'guest' }, tx)`. Assert `toBeErrResult('FORBIDDEN')`, zero DB writes. `requireRole('admin')` fires before the body.
- **Plan boundary.** `signedInAs({ plan: 'free' }, tx)` on a `pro`-required action. Assert `toBeErrResult('PLAN_REQUIRED')`. Assert the code, not the user message.
- **Outbound HTTP from inside the action.** A `createSubscription` action calls Stripe. Set an MSW handler for `POST /v1/subscriptions`. Capture the request, assert body and headers, assert DB row, assert typed return. End-to-end in one test.
- **`revalidatePath`/`revalidateTag` assertions.** `vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))`. Assert `toHaveBeenCalledWith('/invoices')`. The revalidate is part of the contract.
- **`redirect()` path.** Server Actions that `redirect()` throw `NEXT_REDIRECT` from `next/navigation`. Test: `await expect(action(...)).rejects.toThrow('NEXT_REDIRECT')`; inspect `error.digest.startsWith('NEXT_REDIRECT;')`. Don't mock `redirect` — let it throw, assert the throw.
- **Typed return assertions.** Actions return `Result<TData, ErrorCode>` (7.2). Type tests (19.2.4) cover the shape; integration asserts values via custom `toBeOkResult` / `toBeErrResult` (19.2.6).
- **Cross-action workflows.** "Checkout succeeds, then subscription updates" — two actions in sequence inside one `tx`. The second sees the first's writes via the same `tx`. One test, multi-act narrative.
- **File layout.** `src/server/actions/createInvoice.int.test.ts` next to `createInvoice.ts`. One `describe` per action; one `it` per branch (happy, validation-fail, unauth, forbid, plan-gated). Six to ten `it` blocks per file is healthy.
- **Watch-outs.** Barrel imports pull Next.js runtime into the test bundle — direct imports; un-`await`ed actions race with rollback — every act is `await`ed; unmocked `revalidatePath` runs real cache invalidation against a fake router — always mock `next/cache`; mocking `db` instead of threading `tx` defeats integration; testing the inner function bypasses the wrapper — the action *export* is the unit; reusing one `signedInAs` context across two tests shares mutable user state — call inside each test; asserting on `result.error.message` couples to user copy — assert on `result.error.code`.

What this lesson does not cover:

- `authedAction` implementation — Chapter 7.5.
- The `Result` shape — Chapter 7.2.
- MSW setup — Lesson 19.3.5.
- Auth fixtures — Lesson 19.3.3.
- Transaction wrapper — Lesson 19.3.1.
- Browser E2E — Chapter 19.5.
- Component form tests — Chapter 19.4.
- Server Action security (CSRF, origins) at depth — Chapter 9.

Estimated student time: 50 to 60 minutes. Pattern lesson; the action-test shape is the most common file in the integration suite.

---

## Lesson 19.3.8 — Test isolation, ordering, and the cost of flake

Topics to cover:

- **The senior question.** A test that passes alone, fails in the suite, passes on re-run is the most expensive bug a team ships — minutes per developer per week, lost trust in CI, "just re-run it" culture. Flake is structural, not bad luck. Every flake has a named cause and a structural fix.
- **No shared state.** No top-of-file `const seenEvents = []` mutated by tests. No module-level singletons tests reach into. No `beforeAll` mutating global state without `afterAll` reset. The factory + `tx` pattern enforces this.
- **No run-order dependency.** Tests must pass in any order. Vitest's `--shuffle` randomizes; a senior CI runs `vitest run --shuffle` weekly (or on every CI run) to surface order dependencies.
- **Vitest concurrency recap.** Files run in parallel workers (one DB each). Tests within a file run sequentially by default. `it.concurrent` opts in to parallel within a file — risky when tests share fakes; default off.
- **Transaction-rollback isolation.** From 19.3.1: every test in `tx` and rolls back. Eliminates 80% of integration flake.
- **MSW handler reset.** From 19.3.5: `server.resetHandlers()` in `afterEach`. Override leaking into the next test is the bug class.
- **Mock-implementation reset.** `vi.mocked(auth).mockImplementation(...)` in test A leaks to B unless reset. `afterEach(() => vi.mocked(auth).mockReset())` or `vi.resetAllMocks()`. Setup file's `globalSetup` doesn't reset by default — name it.
- **Clock and timer reset.** From 19.2.3: `vi.useFakeTimers()` without `vi.useRealTimers()` in `afterEach` leaks fake time forward. A later "after 1s" test hangs indefinitely.
- **MSW + fake timers interaction.** MSW uses real timers internally; fake timers can stall request resolution. Pattern: fake timers only inside the test body, real timers around setup. Or `vi.useFakeTimers({ shouldAdvanceTime: true })`.
- **The `vitest --repeat N` reflex.** A test passing 1/10 is 10% flaky. `vitest run path/file.int.test.ts --repeat 100` quantifies the flake rate. Repeat *before* "investigating"; the rate localizes the cause.
- **The `--retry` anti-pattern.** Vitest's `--retry` re-runs failing tests; CI reaches for it to "stabilize" flake. Retry hides the bug. Reach for retry only on *infrastructure* flake (CI network, container startup), never test logic.
- **Common flake taxa.** (1) DB-state leak — `signedInAs` outside `tx`. (2) Timer leak — no `useRealTimers` in `afterEach`. (3) MSW handler leak — no `resetHandlers`. (4) Mock-implementation leak — no `mockReset`. (5) Real-time clock — code reads `Date.now()` without the seam. (6) Unawaited promise — Vitest 3 silent pass. (7) Random data — `Math.random()` inline. (8) Port collision — two suites on the same port. (9) Order dependency — `--shuffle` catches it.
- **Cost of flake.** 200 PRs/week × 5% flake = 10 spurious failures/week. Each "re-run" costs 5 min CI + lost attention + eroded trust. 30 minutes to fix pays back in a week.
- **Quarantine, with discipline.** When a flake hits main and the fix isn't immediate: `it.skipIf(process.env.CI)('flaky test', ...)` or move to `*.flaky.test.ts` excluded from CI. Every quarantined test has an issue link and an owner. Quarantine without follow-up is debt.
- **CI signals.** GitHub Actions surfaces re-run rates; a JUnit reporter with retry counts prioritizes work. Integration flake rate < 0.5% — measured, not vibes.
- **Watch-outs.** Reaching for `--retry` instead of fixing the cause; "just re-run CI" culture; copy-pasting a test that "works" without understanding the mocks; debugging flake on `main` instead of reverting; treating flake as "the framework's fault" — Vitest 4 turns silent-pass into hard-fail, the team is the source; fake timers in `globalSetup` leak across every test in the worker; trusting the suite when `--shuffle` hasn't run in a year — schedule it.

What this lesson does not cover:

- Rollback pattern — Lesson 19.3.1.
- MSW setup — Lesson 19.3.5.
- Clock/timer fakes — Lesson 19.2.3.
- `expect.assertions(n)` / forgotten-`await` — Lesson 19.2.5.
- CI infrastructure flake — Chapter 21.2.
- Playwright flake — Chapter 19.5.

Estimated student time: 30 to 40 minutes. Pattern lesson closing the chapter; the discipline lands across every later integration test.

---

## Lesson 19.3.9 — Chapter quiz

Top 10 topics to quiz:

- Transaction-rollback-per-test — `withRollback` opens `db.transaction`, threads `tx` through production code, throws to force rollback; isolates state without truncate-and-reseed.
- Per-worker database isolation — `VITEST_POOL_ID` maps to `test_w1`/`test_w2`/…; `globalSetup` creates databases; per-worker `setupFiles` runs `drizzle-kit migrate` once per worker; Neon branch-per-CI-run as the conditional move.
- The `signedInAs` auth fixture — one factory call inserts user, org, session, returns a `cookieJar`; mocks `next/headers` and `@/auth`; defaults `role: 'member'`, `plan: 'free'`.
- Boundary mocking over function mocking — mock at `fetch` via MSW so the SDK's serialization, signing, retry stay under test; never `vi.mock('stripe', ...)`; the wire shape is the contract.
- MSW v2 handler shape — `http.post(url, async ({ request }) => HttpResponse.json(...))`; `setupServer`, `server.listen({ onUnhandledRequest: 'error' })`, `resetHandlers` in `afterEach`; `server.use` for per-test overrides; `{ once: true }` for sequenced responses.
- Webhook receiver testing — call exported `POST(request)` directly; sign the *raw body bytes*; test signature-valid/invalid, timestamp-tolerance, idempotency replay, malformed-payload, unhandled-type paths; dedupe insert and side effect share one transaction.
- Server Action testing — call the exported action; mock `next/headers`, `@/auth`, `next/cache`; assert `Result.ok`/`Result.err` shape, DB row in `tx`, `revalidatePath` calls; `redirect()` throws `NEXT_REDIRECT` — assert the throw.
- Nine flake taxa — DB-state leak, timer leak, MSW handler leak, mock-impl leak, real-time clock, unawaited promise, random data, port collision, order dependency; each has a structural fix, not `--retry`.
- `vitest run --shuffle` as the order-dependency audit; `--repeat N` as the flake-rate quantifier; never `--retry` to hide a test-logic bug.
- Integration project scope — `.int.test.ts` files under `src/**`; `vitest run --project integration` in CI; faster than E2E (19.5), slower than `/lib` unit tests (19.2), placed where bug density is highest.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
