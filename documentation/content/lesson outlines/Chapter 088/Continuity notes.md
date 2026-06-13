# Chapter 088 — Integration tests at the seams

## Lesson 1 — Transaction rollback against real Postgres

**Taught.** The full rollback-per-test pattern: why a mocked `db` proves nothing at the seam, the `withRollback` helper using a private `RollbackSignal` sentinel to force rollback via Drizzle's throw-to-rollback contract, threading `tx` through production code via an options-object handle, AsyncLocalStorage as the route-handler escape hatch, what does not roll back (sequences, `pg_notify`, external side effects), and two structural guards (`DbOrTx` type + `no-restricted-imports` lint rule) against the silent-commit bug.

**Cut.** Watch-outs for nested transactions (savepoints), `SELECT ... FOR UPDATE` deadlocks, autocommit extensions (`pg_cron`), and the full `tx.rollback()` / `TransactionRollbackError` built-in alternative — all from the chapter outline but omitted as out of scope for the pattern lesson. Test-data seed-once strategy mentioned only as a forward pointer to lesson 2.

**Debts.** Lesson 1 explicitly defers to lesson 2 for: `db.transaction` wiring to a real per-worker connection, `globalSetup`, migrations, `.env.test`, Docker, baseline seed. Defers to lesson 3 for auth fixtures (`signedInAs`). Defers to lessons 4–5 for MSW (named as the tool for external side effects). Defers to lesson 6 for applied route-handler / webhook receiver tests using ALS. Defers to lesson 7 for Server Action end-to-end. Defers to lesson 8 for flake taxonomy.

**Terminology.**
- `withRollback` — helper exported from `src/test/db/with-rollback.ts`; used as `it('…', withRollback(async ({ tx }) => { … }))`.
- `RollbackSignal` — module-private sentinel class; thrown after body runs to force Drizzle rollback; swallowed by the wrapper.
- `DbOrTx` — `type DbOrTx = typeof db | Transaction`; defined in `src/db/types.ts`; uses `typeof db` (not re-derived `NodePgDatabase` generics) to avoid a known Drizzle `$client` incompatibility.
- `testTxContext` / `getDb()` — `AsyncLocalStorage<DbOrTx>` in `src/db/test-tx-context.ts`; `getDb()` returns `als.getStore() ?? defaultDb`; route handlers call `getDb()` instead of importing `db`.
- `.int.test.ts` suffix — discriminator for the `integration` Vitest project glob (`src/**/*.int.test.ts`) and the lint rule target; `invoice.test.ts` = unit, `invoice.int.test.ts` = integration.
- Explicit handle pattern — `(input, { db = defaultDb }: { db?: DbOrTx } = {})` — default is singleton, test passes `{ db: tx }`; course default over ALS wherever signature is controllable.
- `no-restricted-imports` — ESLint rule blocking `@/db/client` import from any `*.int.test.ts` file.
- Litmus test — "if mocking the collaborator would stop the test from catching a column-rename, schema-drift, or constraint-violation, it's an integration test."
- Cost tier — `~5 ms` unit / `~20–80 ms` rollback-per-test / `~500 ms` truncate-and-reseed.

**Patterns and best practices.**
- Integration tests colocate under `src/**/*.int.test.ts`, not `tests/integration/` (chapter-086 glob governs, supersedes older Code conventions note).
- Query helpers and action functions take `DbOrTx` — never the concrete `db` type or a raw `PgTransaction` — so both production and test callers type-check.
- Actions use an options-object handle `{ db = defaultDb }` (respects two-positional-args-max); `db/queries/` helpers may take `tx` as first argument.
- Never assert on exact auto-incrementing or sequence-derived IDs inside integration tests; assert on shape (`expect.stringMatching(…)`, `expect.any(String)`).
- The `RollbackSignal` catch block must rethrow anything that is not the sentinel; a swallow-all catch is the one bug a test helper must never have.
- ALS (`testTxContext`) is reserved strictly for framework-fixed signatures (route handlers, webhook receivers); all other code uses the explicit handle.

**Misc.**
- Driver is node-postgres (`NodePgQueryResultHKT` / `NodePgDatabase`) for the local test DB; Neon serverless driver is a lesson-2 CI concern.
- `PgTransaction` may be renamed `PgAsyncTransaction` in recent Drizzle releases; downstream agents should verify against the project's pinned version before writing `src/db/types.ts`.
- Running example throughout the chapter is `createInvoice` / `invoices` — lesson authors should continue using this domain to let the student see one example deepen rather than a new toy per lesson.

## Lesson 2 — One database per worker

**Taught.** Per-worker database isolation via `VITEST_POOL_ID`; the `globalSetup` / `setupFiles` lifecycle dichotomy; programmatic `migrate()` once per worker against the production `drizzle/` folder; a minimal two-row baseline seed (`seed_org` + `seed_admin_user`) vs. per-test factories; `.env.test` isolation with a production-URL fail-fast guard; fsync-off Docker Postgres on port 5433; the GitHub Actions `services: postgres` default job shape with health-check; and Neon copy-on-write branch-per-CI-run as the conditional move when seed time exceeds ~5s or RLS depth requires it.

**Cut.** Full `docker-compose up -d` orchestration step shown explicitly in CI (lesson defers matrix builds, caching, and `--reporter=junit` to Ch 097; `lefthook` wiring for `--changed` pre-push to Ch 096). `postgresql.conf` shown only inline via `command:` flags, not as a separate conf file tab. `WORKER_DATABASE_URL_PATTERN` interpolation helper not implemented (pattern shown as a string template, not a utility).

**Debts.** MSW `server.listen()` is listed as a `setupFiles` task (in the lifecycle table and seed section) but its mechanics are explicitly deferred to lesson 5. The `withApiKey` fixture parallel is deferred to Ch 091 / the project chapter.

**Terminology.**
- `VITEST_POOL_ID` — Vitest env var; stable small integer 1..N (≤ `maxWorkers`) identifying which worker a test runs on; the per-worker routing key.
- `globalSetup` — runs once in the Vitest main process before any worker; no `VITEST_POOL_ID`, no test globals; owns `CREATE DATABASE` and teardown.
- `setupFiles` — runs once per worker inside the worker; `VITEST_POOL_ID` is set; owns lazy pool open, `migrate()`, baseline seed, MSW `server.listen()`.
- `maxWorkers` — top-level flat key on the Vitest `test` block (Vitest 4); `poolOptions.threads.maxThreads` is stale pre-v4 syntax.
- `VITEST_MAX_WORKERS` — env override for `maxWorkers` (Vitest 4).
- `getWorkerDb(workerId)` — lazy getter in `src/test/db/worker-db.ts`; opens the pool on first call, returns the worker's Drizzle instance connected to `test_w{id}`.
- `seedBaseline(db: DbOrTx)` — exported from `src/test/db/seed.ts`; inserts one org + one admin user; committed outside any test transaction; treat as immutable in tests.
- `docker-compose.test.yml` — Postgres 17 on host port 5433 (`5433:5432`) with `fsync=off synchronous_commit=off full_page_writes=off` in `command:`.
- `.env.test` — `DATABASE_URL` (superuser, for globalSetup) + `WORKER_DATABASE_URL_PATTERN` (per-worker template); loaded by the harness; `.env.local` is never loaded.
- `isNeonBranch(url)` — guard helper; URL must contain `localhost:5433` or pass `isNeonBranch` to proceed; throws at top of globalSetup otherwise.
- `drizzle-kit check` — detects schema/journal drift before the suite; distinct from `migrate` (which applies files).
- copy-on-write (Neon branching) — branch shares parent's storage pages until written; fork is near-instant regardless of database size.

**Patterns and best practices.**
- The per-worker DB pool must be opened lazily (inside `beforeAll` or a memoized getter), never at module-eval time in `setupFiles` — `globalSetup`'s `CREATE DATABASE` must complete before any worker connects.
- Seed rows are committed outside any test transaction and must be treated as read-only; tests that need to mutate a row build their own via a factory inside `tx`.
- The production-URL guard (`throw` if URL does not match a known test pattern) goes at the very first line of `globalSetup`, before any `CREATE DATABASE` or `migrate` call.
- `fsync=off` / `synchronous_commit=off` / `full_page_writes=off` are baked into the test Docker image only — never set on any server holding real data.
- The GitHub Actions `services.postgres` block requires the health-check options (`--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5`) — without them the migrate step races container boot.
- `if: always()` on the CI cleanup step so teardown runs even on a failed test run.
- Two isolation layers stack: per-worker database (files can't interfere across workers) + per-test `withRollback` (tests can't interfere within one worker's DB).

**Misc.**
- Test Postgres runs on port **5433** to avoid colliding with a local dev Postgres on 5432; this port is also the load-bearing value in the production-URL guard regexp.
- Vitest 4 removed `poolOptions` entirely; `maxWorkers` is a flat top-level key. Any tutorial referencing `poolOptions.threads.maxThreads` predates Vitest 4.
- CI default job uses `DATABASE_URL: postgres://test:test@localhost:5432/postgres` (5432 in CI because the sidecar Postgres is the only one); local `.env.test` uses 5433. Both pass the URL guard because the guard checks for the test pattern, not a fixed port (or uses `isNeonBranch`).
- Neon CI path uses `neondatabase/create-branch-action@v6` and `neondatabase/delete-branch-action@v3`; the branch's `db_url` output replaces `DATABASE_URL` for the run; `branch_id` output is used for cleanup.
- Local Docker uses node-postgres; Neon CI path may use the Neon serverless driver — but test code is unchanged because it talks to `db`/`tx`, not the driver directly.

## Lesson 3 — The signedInAs fixture

**Taught.** Built `src/test/fixtures/auth.ts` from first principles: started with a hand-rolled five-line auth stub showing three failure modes (missing `organizationId` on membership → false negative, reused hardcoded id → aliasing, file-scope `vi.mock` → identity leak), then extracted `signedInAs(opts, tx)` one responsibility at a time — real row inserts via `tx`, session stub at `auth.api.getSession`, cookie jar, CSRF Origin/Host headers, and `anonymous()` as the named unauthenticated context.

**Cut.** `withApiKey({ scope })` fixture parallel (deferred to Ch 091); RLS / `auth.uid()` tenant scoping at the DB-policy level (Ch 11); E2E auth through the real UI (Ch 090); full CSRF/Origin mechanism at depth (Unit 8 — lesson teaches only the operational fix). Chapter outline's `auth()` / `@/auth` (Auth.js idiom) was corrected to the project's real surface (`auth.api.getSession` via `@/lib/auth`).

**Debts.** Lesson forward-crumbs MSW for external side effects (L4–L5). Lesson forward-crumbs the flake taxonomy (L8) when naming "leftover session = textbook flake." L7 owns full Server Action assertions beyond the authorize seam (parse-fail field errors, `revalidatePath` spy, multi-branch matrix) — but the `NEXT_REDIRECT` throw model is already canonicalized here in L3; L7 applies it, not re-teaches it.

**Terminology.**
- `signedInAs(opts, tx)` — exported from `src/test/fixtures/auth.ts`; inserts user + org + membership + session inside `tx`; returns `{ user, org, session, cookieJar }`. Signature: `signedInAs<R extends Role = 'member', P extends Plan = 'free'>({ role?, plan?, orgId? }, tx: DbOrTx): Promise<SignedInContext<R, P>>`.
- `anonymous()` — counterpart to `signedInAs`; sets `getSession` to `null`, sets Origin/Host, leaves cookie jar empty; makes "no session" explicit and reset-safe.
- `SignedInOptions` — `{ role?: Role; plan?: Plan; orgId?: string }`. Defaults: `role: 'member'`, `plan: 'free'`.
- `SignedInContext<R, P>` — `{ user: User; org: Organization; session: Session; cookieJar: CookieJar }`. Generic so downstream code sees the literal role/plan.
- `CookieJar` — `Map<string, string>` wrapped to expose `get(name) → { name, value } | undefined`, `set`, `delete`, `has` — matches the `cookies()` read surface; returned from `buildCookieJar()`.
- `auth.api.getSession` — the single funnel call the entire session ladder (`getCurrentUser` / `requireUser` / `requireOrgUser`) resolves through; this is the chosen stub seam. Mocked via `vi.mock('@/lib/auth')` registered in `setupFiles` as `vi.fn()` placeholder; per-call value set with `vi.mocked(auth.api.getSession).mockResolvedValue({ user, session })`.
- `TEST_ORIGIN` — `'http://localhost:3000'`; set as both `origin` and `host` headers to satisfy Next.js 16 CSRF gate on Server Actions.
- `FROZEN` — (carried from 087 L3) used for `session.expiresAt` so the session is never "expired relative to wall-clock" under frozen time.
- `seam` — deliberate swap point in the call chain (reused from 087 context).
- `false negative` — green test, broken code (reused from 087 context).
- `aliasing` — two tests sharing the same hardcoded row id; a write in one silently changes the state the other reads.
- `hoisting` — Vitest lifts `vi.mock()` above imports; factory must register only `vi.fn()` and cannot close over per-call variables.
- `NEXT_REDIRECT` — sentinel error thrown by `redirect()`; `requireUser`/`requireOrgUser` call it when no session is found, so the unauthenticated path *throws* rather than returning a `Result`. Assert as `rejects.toThrow('NEXT_REDIRECT')`. There is no `'unauthenticated'` Result code in this codebase.

**Patterns and best practices.**
- Mock registered once in integration `setupFiles` (`vi.fn()` placeholder only); per-call session set inside `signedInAs` body via `mockResolvedValue`. Never bake a session into the `vi.mock` factory.
- `afterEach(() => vi.mocked(auth.api.getSession).mockReset())` in `setupFiles` prevents identity from leaking between tests; `vi.resetAllMocks()` covers it if already in place from clock seam setup.
- `signedInAs` must be called inside a `withRollback` body — calling outside commits real rows.
- The fixture owns identity ("the user *is*…"); per-test factories own activity ("the user *has*…"). Fixture never accepts `invoiceCount`, subscription state, etc.
- `src/test/fixtures/auth.ts` exports exactly `signedInAs` and `anonymous` — nothing else. A growing export list is the god-object smell.
- In cross-tenant tests always name `orgId` on both sides; relying on the default seed org makes both users land in the same tenant and the isolation test passes vacuously.
- `Role` and `Plan` unions derive from Drizzle enum columns (`$inferSelect`), never hand-listed; schema addition breaks call sites at compile time.
- Always set `Origin` = `Host` = `TEST_ORIGIN` in fixtures (both `signedInAs` and `anonymous`); omitting it fails the CSRF gate before the action body runs, producing a failure that mimics an auth bug.
- Keep `@/lib/auth` import static in production files; a dynamic `import('@/lib/auth')` dodges `vi.mock` hoisting and the stub silently does nothing.
- Assert in-place refusals on `Result` code strings (`'forbidden'`), never on user-facing message text. The unauthenticated path is **not** a `Result` — `requireUser`/`requireOrgUser` redirect (throw `NEXT_REDIRECT`) before the body runs; assert with `rejects.toThrow('NEXT_REDIRECT')` plus zero DB rows.
- Seam-depth heuristic taught explicitly: mock at the boundary your code calls (`auth.api.getSession`), not the library's guts (cookie verifier / JWT); same instinct applies to Stripe in L4.

**Misc.**
- `requireOrgUser` returns `{ user, orgId, role }` — no org object; fixture returns full `org` in `SignedInContext` for factory convenience, not because `requireOrgUser` hands it back.
- `cookies()` is async in Next.js 16 (`await cookies()`); the `next/headers` mock must return the jar from an `async` function.
- Do not stub `getSession` *and* set a real signed cookie — two sources of truth for identity.
- Running example domain remains `createInvoice` / `invoices` / `organizations` / `users` (chapter convention).

## Lesson 4 — Mock the wire, not the SDK

**Taught.** The decision layer for integration isolation of third-party HTTP: why mocking the SDK function or class can't catch wire-shape bugs (serialization, SDK-generated headers, encoding), the SDK-as-tower mental model (serialize → sign/add headers → retry → network call → parse), the two anti-patterns ("mock the function" / "mock the SDK class") each pinned to a concrete shipped-bug class, and the unifying ownership rule: mock the boundary you don't own (Stripe, Resend, AI providers), roll back the boundary you do own (Postgres). MSW named as the network-boundary tool; mechanics deferred to L5.

**Cut.** Chapter outline's framing of the boundary as "bottoms out at `fetch`" was deliberately softened to "the network" throughout — the default Stripe Node SDK routes through Node's `https` module, not the Web Fetch API, and MSW only reliably intercepts it when the client is constructed with `Stripe.createFetchHttpClient()`. This accuracy constraint was honored in prose but the lesson does not teach the `createFetchHttpClient()` call (that lives in the `/lib/clients` typed wrapper, Ch 13). Chapter outline watch-outs for `vi.spyOn(global,'fetch')` ergonomics, double-mocking MSW+fetch, and pathname matcher pitfalls were all deferred to L5.

**Debts.** L5 owns all MSW API surface: `setupServer`, `http.*`, `HttpResponse`, `server.use`, `resetHandlers`, `{ once: true }`, request capture (`request.clone()`, `await request.text()`), `onUnhandledRequest: 'error'` wiring. L5 also owns where `onUnhandledRequest: 'error'` is configured (stated here only as a policy). L6 owns inbound webhook receiver testing (explicitly distinguished from L4's outbound-only scope). L7 owns the full Server Action assembly (auth fixture + tx + MSW + revalidatePath + Result assertions in one test). L13 (Ch 013) owns the `/lib/clients` typed wrapper and the `Stripe.createFetchHttpClient()` configuration that makes MSW interception reliable.

**Terminology.**
- `mock the wire` — intercept at the outgoing network request rather than at an SDK method; the real SDK serializer, signer, retry, and parser all run.
- `on the wire` — the actual bytes sent over the network (method, URL, headers, body); the only thing a third-party service observes.
- SDK — typed client library wrapping a provider's HTTP API; sits above the network call; everything the SDK does between your call and the network is "the tower."
- `application/x-www-form-urlencoded` — Stripe v1's body encoding (not JSON); the SDK flattens `line_items[0][price]=price_x&line_items[0][quantity]=1`; invisible to any function-level mock.
- `Idempotency-Key` — header auto-generated by the Stripe SDK on every request; prevents double-charges on retries; only checkable by asserting on the intercepted request, not on the function call.
- `Stripe-Version` — header the SDK attaches to pin the API shape; changes can break real requests without affecting function-level mocks.
- `contract test` — separate, scheduled (nightly) test that runs against the provider's live sandbox to detect assumption drift; too slow/flaky for the per-test loop; explicitly out of scope for this chapter.
- `ownership rule` — the deciding question for every collaborator: "is this test exercising a contract I write, or one someone else writes?"
- hand-written fixtures — course default: five explicit lines of `HttpResponse.json({ ... })` naming only the fields the test asserts on; preferred over recorded (HAR-style) fixtures which bloat with unasserted fields and rot silently.

**Patterns and best practices.**
- Assert on the *intercepted request* (URL, method, headers, decoded body), never on an SDK method call; `expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(...)` is always the wrong assertion for third-party integration tests.
- `onUnhandledRequest: 'error'` is non-negotiable on the MSW server; a silent 200 on an unhandled request recreates the green-but-wrong failure pattern.
- All production HTTP to a third party goes through a typed client in `/lib/clients`; a raw `fetch` inside a route handler or action is a refactor target before it's a test target.
- Never depict the default `new Stripe(key)` constructor and claim MSW intercepts it — the default SDK uses `node:https`, not `fetch`; the `/lib/clients` wrapper must use `Stripe.createFetchHttpClient()` for MSW interception to work.
- The three-tab CodeVariants pattern (mock the function / mock the SDK class / mock the wire) is a recurring reviewer checklist: if the assertion names an SDK method, the mock is at the wrong height.

**Misc.**
- Running example extended to `createSubscription` (a Stripe checkout sibling of `createInvoice`) for the outbound-HTTP context; `createInvoice` / `invoices` remains the primary domain for DB-side examples.
- The seam-depth heuristic first taught in L3 (`auth.api.getSession`) is explicitly called back here: too-deep (mocking JWT guts) and too-shallow (mocking the SDK function) are the same error — wrong boundary.
- Lesson is scoped to **outbound** HTTP only; inbound webhook testing (signature verification, raw-body signing, `processed_events`) is L6 and must not be conflated.
- Two custom diagram components built for this lesson: `SdkTower` (the serialize→sign→retry→network→parse tower) and `OwnershipBoundary` (action in the center, Postgres/MSW zones either side) — both at `src/components/lessons/088/4/`; reusable in later review or project lessons if the same mental model needs illustration.

## Lesson 5 — MSW mechanics in practice

**Taught.** Full MSW v2 Node mechanics: `setupServer` singleton module pattern, lifecycle hooks (`server.listen({ onUnhandledRequest: 'error' })` / `server.resetHandlers()` / `server.close()`) added to the L2 integration `setupFiles`; per-provider default handler files as the happy-path contract; per-test unhappy overrides via `server.use`; single-use `{ once: true }` handler option for sequenced retry responses; clone-and-capture pattern (`request.clone()` → `seen` array → post-act assertions on body, params, query, headers); MSW v2 vs. legacy API translation; and the MSW + `vi.useFakeTimers()` interaction with three fixes (`shouldAdvanceTime`, scoped fakes, `toFake` exclusion list).

**Cut.** Chapter outline's `pathname matcher pitfall` (`/v1/customers` not matching `/v1/customers/cus_x`) was mentioned only in the URL-pinning prose, not built as an exercise. `HttpResponse.error()` and the slow-upstream resolver were taught as one-line shapes in the override section without a dedicated worked example (chapter outline listed them as fuller topics). `restoreHandlers()` named in one clause only; no scenario built on it. `nock` named once as the legacy alternative without a comparison exercise.

**Debts.** L6 owns inbound webhook receiver testing (explicitly named as the flip side at lesson close). L7 owns the full Server Action assembly composing L1+L3+L5 fixtures into one complete test. L8 (flake taxonomy) owns `resetHandlers` promoted to a first-class named flake cause; L5 forward-crumbed it twice ("`afterEach` reset" as the no-leak line; "handler-leak" named in wrap section).

**Terminology.**
- `setupServer` — MSW Node-side interceptor; constructed once per module; the same import everywhere returns the same `server` switchboard instance per Vitest worker.
- `server` — the singleton exported from `src/test/msw/server.ts`; the single place `setupServer` is called.
- `src/test/msw/handlers/{stripe,resend,posthog}.ts` — per-provider default handler arrays; spread into `setupServer`; represent the happy-path contract.
- `stripeHandlers` / `resendHandlers` / `posthogHandlers` — named arrays exported from those files and spread into `setupServer(...)`.
- `http` — MSW v2 namespace (`import { http } from 'msw'`); replaced the pre-Oct-2023 `rest` export.
- `HttpResponse` — MSW v2 response builder; constructors: `.json(body, { status })`, `.text(body, { status })`, `.error()` (network-level failure), `new HttpResponse(body, { headers })` (raw escape hatch).
- resolver — the function passed as the second argument to `http.*`; receives `{ request, params, cookies, requestId }`; returns an `HttpResponse` directly (v2 — no `res`/`ctx` wrapper).
- `server.use(...)` — stacks one or more handlers on top of defaults for the current test; stripped by `resetHandlers()` after each test.
- `{ once: true }` — third argument (handler option) to `http.*`; makes the handler single-use (answers one request then retires); *not* a `.once()` method.
- sticky tail — the final non-`once` handler in a retry stack; answers all remaining requests once the `once` handlers are drained.
- `seen` pattern — `const seen: Request[] = []` declared inside the test body; resolver does `seen.push(request.clone())`; assertions use `seen[0]` after the act.
- `request.clone()` — required before any read when capturing; `Request` body is a single-use stream; reading twice without clone throws "body already consumed."
- `application/x-www-form-urlencoded` — Stripe v1 body encoding; read with `await request.text()` (not `.json()`); form string like `metadata[userId]=u_1`.
- `onUnhandledRequest: 'error'` — option to `server.listen()`; makes any request with no matching handler throw immediately instead of silently passing.
- MSW v2 cutoff — October 2023; `rest` → `http`, `(req, res, ctx) => res(ctx.json(...))` → `() => HttpResponse.json(...)`.
- `vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'Date'] })` — durable fix for MSW + fake-timers hang: leaves `queueMicrotask` off the faked list so MSW's internals run on the real microtask queue.

**Patterns and best practices.**
- `server` is a module singleton per Vitest worker; never call `setupServer` more than once — import from `src/test/msw/server.ts`.
- `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))` / `afterEach(() => server.resetHandlers())` / `afterAll(() => server.close())` — three lifecycle hooks, wired once in the integration `setupFiles`.
- Default handler array = the happy-path contract; `server.use` = the per-test exception. Never use `server.use` for an endpoint that has no default handler underneath — that means the contract is incomplete.
- Every endpoint the suite calls must have a default happy-path handler; an override that stands alone without a default is a smell.
- Declare `const seen: Request[] = []` inside the test body, never at module scope; module-scope capture arrays are shared mutable state and a flake source.
- Always `request.clone()` before pushing to `seen`; read the clone's body after the act, never inside the resolver.
- Assertions belong after the act, never inside the resolver; keep resolvers about responding, assertions about verifying.
- Do not combine `vi.spyOn(global, 'fetch')` or `vi.mock('node:https')` with MSW — two interception layers produce baffling double-mock behavior; use MSW exclusively.
- When using fake timers with MSW: use `toFake` to exclude `queueMicrotask`; without this MSW's internal async work stalls and the test hangs until timeout.

**Misc.**
- `src/test/msw/` directory established in this lesson; canonical layout: `server.ts` + `handlers/{stripe,resend,posthog}.ts`.
- Running example: `createSubscription` for all outbound MSW capture tests; test file is `src/server/actions/create-subscription.int.test.ts` (colocated, `.int.test.ts` suffix). `createInvoice` / `invoices` remains the DB-side domain.
- Stripe v1 sends `application/x-www-form-urlencoded`, not JSON; `await request.text()` is always correct for Stripe body assertions.
- The `Idempotency-Key` and `Stripe-Version` headers are SDK-generated and only assertable via request capture, not via function-level mocks — this concretizes L4's wire-assertion argument.
- `toBeErrResult('conflict')` — the concrete example used in L5's duplicate-customer override test; `'conflict'` is lowercase (consistent with the chapter's Result code convention; there is no uppercase `'CONFLICT'` code).

## Lesson 7 — Server Action tests

**Taught.** Complete action-test discipline: calling the exported action via `await action(inputObject, { db: tx })`, wiring `next/cache` mocks (`revalidatePath`, `revalidateTag`, `updateTag` as `vi.fn()`), and asserting on three independent axes — returned `Result`, DB rows read through `tx`, cache-spy calls — across the full branch matrix (happy path, validation failure, unauthenticated redirect, insufficient role, body-level entitlement refusal, outbound HTTP with MSW). Cross-action workflow pattern also covered (two actions sharing one `tx`).

**Cut.** Chapter outline's `'UNAUTHENTICATED'`, `'PLAN_REQUIRED'`, and `'VALIDATION_FAILED'` error codes (SCREAMING_CASE) never existed in this codebase; the lesson corrects to lowercase (`'validation'`, `'forbidden'`). Chapter outline's `PLAN_REQUIRED` wrapper-level plan gate does not exist; the lesson correctly frames plan checks as body-level. No cross-tenant multi-tenant scenario in this lesson (Ch 11 / L3 scope).

**Debts.** Forward-crumbed to L8: mock-history leaking between tests (`vi.clearAllMocks()` / `afterEach` reset) as a named flake taxon. Forward-crumbed to Ch 089: form/`useActionState` component tests. Forward-crumbed to Ch 090: browser E2E of the same action. Ch 091 project owns `checkout.session.completed` composed inbound + outbound path.

**Terminology.**
- `NEXT_REDIRECT` — sentinel error `redirect()` throws; `digest` is `NEXT_REDIRECT;<type>;<url>;<status>;`. **Canonical chapter decision: the unauthenticated path throws `NEXT_REDIRECT`, there is NO `'unauthenticated'` Result code.** `requireUser`/`requireOrgUser` redirect session-less callers; they never return `err('unauthenticated')`.
- assertion axis — one of three independent things an action test verifies: returned `Result`, DB rows (`tx.select`), cache-spy calls.
- branch matrix — full set of behaviors an action owes a test: happy · validation · unauthenticated (redirect) · forbidden · plan-gated · (outbound only) third-party wire.
- `isRedirectError(error)` — Next.js production predicate for distinguishing a redirect throw from a real error; test-side reflex is `rejects.toThrow('NEXT_REDIRECT')`.
- `revalidatePath(path)` — single argument (Next.js 16); what `createInvoice` calls; what the happy-path cache axis asserts.
- `revalidateTag(tag, profile)` — **requires a cacheLife profile as second arg in Next.js 16** (e.g. `'max'`); single-arg form is a TS error. Assert as `expect(revalidateTag).toHaveBeenCalledWith('invoices', 'max')`.
- `updateTag(tag)` — read-your-writes within-request companion; third spy; assert only if the action calls it.

**Patterns and best practices.**
- Import actions directly (never via barrel `index.ts`) — barrel imports drag the Next.js runtime into the test bundle.
- Every action call inside a test must be `await`ed — unawaited races the `withRollback` rollback.
- Call `signedInAs` inside each `it`, never once for the file — reuse shares mutable user state across tests.
- Thread `tx` via `{ db: tx }` on every action call — mocking `db` or calling the global `db` defeats integration isolation and risks silent commits.
- Assert unauthenticated branches as `rejects.toThrow('NEXT_REDIRECT')` plus zero DB rows — never `toBeErrResult('unauthenticated')`, which does not exist.
- Assert `Result` error codes, never `result.error.message` / user-facing text (localizable copy).
- For validation failures assert `result.error.fieldErrors` is present (`expect.any(Object)`), not its wording — field messages are localizable copy, presence is the contract.
- Assert DB state through the same `tx` (not the global `db`) — the action's write is uncommitted and invisible to the global connection.
- Assert `revalidatePath`/`revalidateTag` spy alongside `Result` and DB rows; a correct return + correct row does not prove the cache was told.
- Do not mock `redirect` itself — let it throw and assert the throw; catching/swallowing `NEXT_REDIRECT` in production breaks navigation.
- A `try/catch` in production code that swallows `NEXT_REDIRECT` breaks navigation — the same must-propagate rule applies in test code; `rejects.toThrow` is the safe way to observe a redirect without eating it.

**Misc.**
- `AsyncLocalStorage` is explicitly NOT the tool for Server Actions — explicit `{ db: tx }` handle is correct. ALS remains the route-handler / webhook-receiver escape hatch only (L1/L6).
- `authedAction` wrapper is session + role + schema only — no plan check at wrapper level (Ch 057). Plan gates belong in the action body.
- Running domain: `createInvoice` / `invoices` for DB-side examples; `createSubscription` for outbound HTTP examples. `deleteInvoice` used for the `admin`-floor forbidden branch.
- File convention: `src/server/actions/create-invoice.int.test.ts` colocated with `create-invoice.ts`; `.int.test.ts` suffix routes to the integration Vitest project.
- `next/cache` mock lives in integration `setupFiles` alongside the session mocks from L3; `afterEach(() => vi.clearAllMocks())` covers call-history reset for all three.

## Lesson 6 — Webhook receivers under test

**Taught.** Inbound-boundary integration testing of the Stripe webhook receiver: signing test payloads with `stripe.webhooks.generateTestHeaderString` (not hand-rolled HMAC), reaching the route handler's transaction via the ALS escape hatch (`testTxContext.run(tx, () => POST(request))`), and a six-path matrix (valid, forged signature, stale timestamp, idempotency replay, malformed payload, unhandled event type) asserting on both the HTTP `Response` Stripe sees and the DB state inside `tx`.

**Cut.** Chapter outline's `src/test/fixtures/stripe/sign.ts` hand-rolled HMAC helper was explicitly rejected in favor of `generateTestHeaderString`. The outline's `ON CONFLICT DO NOTHING RETURNING id` shape for `claimEvent` was kept as background but the lesson asserts against the actual shipped handler (`claimEvent` returning boolean, dispatch inside the same transaction). No assertion on "no payload echo" in the 400 response body (mentioned in outline as "optional senior reflex"). The within-tolerance mirror path for the stale-timestamp test (asserting 200 for a fresh timestamp) appears only as a one-line note, not a full test block. `checkout.session.completed` used in the outline's valid path example was switched to `customer.subscription.updated` because its dispatch is pure inbound and avoids the outbound `stripe.subscriptions.retrieve` call.

**Debts.** Lesson explicitly defers the `checkout.session.completed` path (which composes inbound + outbound MSW) to Ch 091 (the Stripe money-path project). L7 owns Server Action testing; the lesson explicitly names that the ALS escape hatch is not the right tool there — explicit handle remains correct for Server Actions. L8 is forward-crumbed at the stale-timestamp path as the lesson that catalogs the real-clock flake taxon.

**Terminology.**
- `buildSignedRequest(event, { timestamp?, secret? })` — test helper in the webhook test file; serializes the event exactly once, calls `generateTestHeaderString`, wraps in a `Request` with `stripe-signature` header; the only signing code in the suite.
- `buildStripeEvent({ type, data })` — factory layered on a captured fixture at `src/test/fixtures/stripe/customer-subscription-updated.json`; mints a fresh `evt_...` `event.id` on every call so replay tests can control identity.
- `stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp? })` — Stripe SDK helper; the exact inverse of `constructEvent`; the published seam for producing a verifiable `Stripe-Signature` header in tests.
- `testTxContext.run(tx, () => POST(request))` — ALS invocation shape for webhook handler tests; every `getDb()` call anywhere in the call tree returns `tx`.
- `request.clone()` — required for replay test because `Request` body is a single-use stream; each delivery needs its own readable copy.
- Two-axis assertion model — HTTP `Response` (status + JSON body) and DB state (`tx.select()`) are independent axes; a 200 does not prove a write happened.
- `duplicate: false` / `duplicate: true` — JSON body fields the handler returns on first vs. subsequent delivery of the same `event.id`.
- `tolerance window` — Stripe's 300-second freshness bound; a genuine signature older than 300s is rejected as a replay by `constructEvent`.
- `escape hatch` — ALS used only where the framework fixes the signature; not the default for Server Actions or `/lib` helpers.

**Patterns and best practices.**
- Never hand-roll `t=...,v1=<hmac>` signing in test fixtures; always use `stripe.webhooks.generateTestHeaderString` — drift from Stripe's exact scheme produces false-negative tests.
- Sign the payload string *once* and use that exact string as the `Request` body — `JSON.stringify` twice produces different bytes and breaks verification.
- Always assert on the Stripe `evt_...` `event.id` (controlled by the test), never on `processedEvents.id` (bigint identity sequence that advances and does not roll back).
- A valid-signature duplicate returns **200**, not 4xx/5xx — 4xx tells Stripe the event is terminal, 5xx triggers retry of an already-applied event; both wrong.
- The `claimEvent` insert and the dispatch side effect must share one transaction — a malformed-payload test proves co-rollback: the claim disappears with the failed dispatch.
- Assert zero rows in `processedEvents` (not just response status) for the forged-signature path — a 400 alone does not prove verify-before-everything; the empty table does.
- For unhandled event types, assert 200 (acknowledges, stops retry storm) and zero side effects — name the deliberate design choice in comments.
- For the malformed-payload path, read the shipped handler's dispatch code to discover the actual status and persistence behavior before asserting — the lesson deliberately does not prescribe a status here; pin what the code exhibits.
- For unhandled event types, whether `processed_events` is claimed depends on whether dispatch runs before the switch default — assert what the shipped handler actually does, not a presumed shape.

**Misc.**
- Test file is `src/app/api/webhooks/stripe/route.int.test.ts` (colocated, `.int.test.ts` suffix).
- Handler signature is `export const POST = async (request: Request): Promise<Response>` (Web `Request`/`Response`, not `NextRequest`/`NextResponse`).
- No MSW in this lesson — the lesson is inbound; MSW is for outbound calls. The inbound/outbound distinction is made explicit early to prevent students from reaching for `server.use`.
- Three distinct `whsec_...` strings exist in a real Stripe project (CLI `stripe listen`, dashboard endpoint, `.env.test`); they are not interchangeable; the test reads from `.env.test` and must fail-fast if `STRIPE_WEBHOOK_SECRET` is missing.
- Svix named as the parallel signing primitive for Resend webhook tests (different headers: `svix-id`, `svix-timestamp`, `svix-signature`); the six-path matrix transfers unchanged — only the signing primitive swaps.

## Lesson 8 — Flake is structural

**Taught.** Framed flake as determinism not yet found (not bad luck); established a two-bucket mental model (state leak vs. order/nondeterminism); catalogued nine taxa sorted into the two buckets; taught the four-step diagnostic loop (quantify → locate → fix structurally → re-prove); declared `--retry` forbidden for test-logic flake with one narrow exception (infrastructure flake only); and introduced disciplined quarantine (`it.skipIf(process.env.CI)` with owner + issue comment) as the release valve. Custom components: `FlakeTwoBuckets` (two-bucket decision diagram, `src/components/lessons/088/8/FlakeTwoBuckets.astro`) and `FlakeDiagnosticLoop` (worked four-step loop, `src/components/lessons/088/8/FlakeDiagnosticLoop.astro`) — the outline planned a `DiagramSequence`; a dedicated component was built instead.

**Cut.** CI infrastructure for measuring flake rates at scale (JUnit reporters, GitHub Actions matrix, flaky-test dashboards) — deferred to Ch 097. Playwright/E2E-specific flake (auto-waiting, locator races, trace-based debugging) — deferred to Ch 090. `it.concurrent` within-file parallelism — not developed (off by default, risky with shared fakes). The forgotten-`await` trap (async assertion without `await`, `expect.assertions(n)`) — named in the taxonomy as a one-liner cross-ref to Ch 087 L5, not re-taught.

**Terminology.**
- `flake` / `flaky test` — a test that passes or fails non-deterministically across runs of the same code with no code change between runs.
- `isolation` — each test runs against a clean world with no leftovers (row, mock, handler, timer) from an earlier test.
- `nondeterministic` — producing a different result across runs because it depends on a hidden variable input (time, run order, random value).
- `repeats` — per-test Vitest option: `it('…', { repeats: 100 }, fn)`; runs the test N times in one invocation to measure the flake rate. **Not a CLI flag** — there is no `--repeat` CLI flag in Vitest 4.
- `--sequence.shuffle.files` — Vitest CLI flag that randomizes file execution order; surfaces cross-file leaks and order dependencies. Form is dot-notation, not `--shuffle`.
- `--sequence.shuffle.tests` — randomizes test order within a file.
- `--sequence.seed <n>` — replays the exact shuffled order that produced a failure; Vitest prints the seed on every shuffled run.
- `seed` — the value Vitest used to compute a shuffled run order; feed it back with `--sequence.seed` to replay deterministically.
- `--retry` / `retry` — Vitest flag/config that re-runs a failing test up to N times; **forbidden for test-logic flake**; legitimate only for infrastructure boundaries (container startup, CI network).
- state leak — a test leaves a mutation behind (DB row, MSW handler, mock implementation, fake timers, shared module-scope array, bound port) that a later test inherits.
- order dependency — a test passes only because of when it ran relative to other tests; surfaces via `--sequence.shuffle.files`.
- quarantine — skipping a test visibly (`it.skipIf(process.env.CI)` or a `*.flaky.test.ts` excluded glob) with a mandatory comment: date, owner handle, and tracking-issue link. A quarantine without a follow-up issue is equivalent to `--retry`.

**Patterns and best practices.**
- The two-bucket diagnostic order: first decide which bucket (state leak vs. order/nondeterminism), then the fix shape follows. Never jump to a taxon before landing in a bucket.
- Reproduce before theorizing: get a rate with `{ repeats: 100 }` before investigating. A flake you cannot make fail in 100 runs is not reproduced.
- Fix shape for bucket A (state leak): reset or isolate structurally in `afterEach` or a fixture — never in the test body where the next author forgets it.
- Fix shape for bucket B (order/nondeterminism): remove the dependency (seam the clock/IDs/randomness, make tests self-contained); prove it gone with `--sequence.shuffle.files`; replay the exact failing order via `--sequence.seed <reported>`.
- `vi.resetAllMocks()` in `afterEach` in the integration `setupFiles` clears all mock implementations between tests; setup-file mocks are not auto-reset by Vitest.
- Module-scope mutable state (`const seen = []`, singletons) is always a state-leak source; declare capture arrays inside the test body.
- Enable `test.sequence.shuffle` on a schedule in CI (every run or weekly) so order dependencies surface the day they are introduced.
- A quarantine list that only grows is a suite rotting in slow motion; the health metric is the list trends to zero.
- The flake rate bar for an integration suite is well under 1% — a measured number, not a vibe.

**Misc.**
- **Course rule, canonical wording:** "Flake has a structural cause. `--retry` is forbidden. Use `{ repeats: 100 }` and `--sequence.shuffle.files` to locate; fix the structure." This matches the Code conventions thesis line.
- The worked example throughout is `create-invoice.int.test.ts` / `createInvoice` / `signedInAs`, consistent with the chapter convention.
- `afterEach(() => vi.resetAllMocks())` is the structural fix demonstrated in the lesson's `DiagramSequence`; if L3 or L7's `setupFiles` do not already include it, later project lessons should add it.
- The nine taxa collapse to two rules: all six "reset in `afterEach`" taxa are one rule (leaked state); all three nondeterminism taxa are one rule (hidden non-deterministic input → seam it).
- Ch 090 (Playwright) and Ch 097 (CI) are the explicit forward destinations for E2E flake and CI-level flake measurement respectively.
