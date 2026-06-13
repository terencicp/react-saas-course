sources:
  88.1: Transaction rollback against real Postgres
  88.2: One database per worker
  88.3: The signedInAs fixture
  88.4: Mock the wire, not the SDK
  88.5: MSW mechanics in practice
  88.6: Webhook receivers under test
  88.7: Server Actions through the full wrapper
  88.8: Flake has a structural cause

questions:
  - source: 88.1
    question: |
      A `createInvoice` action defaults its DB handle: `createInvoice(input, { db = defaultDb } = {})`. Inside a `withRollback` test, a teammate writes the action's query against the imported singleton `db` instead of the passed-in `tx`. The test's own assertion reads back through `tx`. What actually happens?
    choices:
      - text: |
          The write commits for real outside the transaction, the rollback can't touch it, and the test still passes — because its `tx` read can't see the committed row. A real row leaks into later tests.
        correct: true
      - text: |
          The test fails immediately, because writing on `db` while a transaction is open on `tx` deadlocks the pool.
        correct: false
      - text: |
          The rollback still catches it — `withRollback` wraps the whole connection, so any write during the test body is undone regardless of which handle made it.
        correct: false
    why: |
      The rollback only undoes what ran on `tx`. A write on the singleton `db` commits, and the test's `tx`-scoped assertion is blind to it, so the test goes green while a phantom row leaks forward. This is exactly the silent-commit bug the `DbOrTx` type and the `no-restricted-imports` lint rule exist to make loud.

  - source: 88.6
    question: |
      A Stripe webhook test signs a captured event with `generateTestHeaderString`, then re-`JSON.stringify`s the event object a second time to build the request body it POSTs to the handler. Every test 400s. What's the cause?
    choices:
      - text: |
          The signature covers the exact bytes that were signed; a second `JSON.stringify` can produce a different byte string (key order, spacing), so the handler's `constructEvent` verifies against bytes that don't match the signature.
        correct: true
      - text: |
          `generateTestHeaderString` must be called after the request is built, not before, or the timestamp is stale.
        correct: false
      - text: |
          You can't sign a captured event — only events freshly created by `stripe.events.create` carry a verifiable signature.
        correct: false
    why: |
      Sign the bytes you send, send the bytes you sign. Stripe verifies the raw body, so the payload that gets signed and the payload that gets POSTed must be the identical string — serialize once, hold the result, sign and send that. Re-stringifying is the classic raw-body bug from the test's side of the wire.

  - source: 88.4
    question: |
      A subscription test does `vi.mock('stripe')` and asserts `checkout.sessions.create` was called with the right `line_items`. It's green. Which production failure can this test **never** catch?
    choices:
      - text: |
          A regression that drops the SDK-generated `Idempotency-Key`, so a double-clicked subscribe charges the customer twice.
        correct: true
      - text: |
          The action passing the wrong `priceId` into `line_items`.
        correct: false
      - text: |
          The action reaching checkout for a member whose plan shouldn't allow it.
        correct: false
    why: |
      The mock receives the object you handed `create`, so your own arguments and control flow stay visible to it. Anything the SDK manufactures *below* the call site — the idempotency key, the form encoding, the negotiated `Stripe-Version` — is thrown away by a function-level mock. Only intercepting the wire can assert on it.

  - source: 88.2
    question: |
      Why does the integration setup create one database per *worker* (`test_w1`…`test_wN`) rather than one per test file or one per test?
    choices:
      - text: |
          A worker is long-lived and runs many files, so per-worker lands at exactly `maxWorkers` migration runs; per-test isolation is then handled cheaply by `withRollback` inside each worker's database.
        correct: true
      - text: |
          Per-test databases are the ideal, but `CREATE DATABASE` isn't transactional, so per-worker is the closest approximation Postgres allows.
        correct: false
      - text: |
          Per-worker is required because `VITEST_POOL_ID` changes on every test, so a database can only be pinned to a worker.
        correct: false
    why: |
      Per-test or per-file would run the full migration stack hundreds or thousands of times — orders of magnitude too slow. Per-worker migrates once per worker and reuses that database across every file it runs; the per-test rollback supplies the fine-grained isolation on top. Two isolation layers, stacked.

  - source: 88.3
    question: |
      You're writing a cross-tenant test: prove a user in org A can't see org B's invoices. Which setup actually exercises the tenant scoping?
    choices:
      - text: |
          Name the org explicitly on both sides — `signedInAs({ orgId: 'org_A' })` and build the other invoice under `org_B` — so the scoped query has a real boundary to enforce.
        correct: true
      - text: |
          Sign in with the default `signedInAs({})` and build the foreign invoice under an explicit `org_B`; relying on the default org for one side keeps the test simpler.
        correct: false
    why: |
      Leaning on the default seed org for either side collapses both ends into the same tenant. The org-A-scoped query then finds nothing because there *is* nothing under a second tenant, and the test passes without testing isolation at all — a false negative. Name the org on both sides so the scoping does real work.

  - source: 88.5
    question: |
      A retry test needs the Stripe endpoint to fail three times with `503` and then succeed. A teammate stacks three `http.post(url, …503, { once: true })` handlers via `server.use` but omits a final non-`once` handler. What goes wrong?
    choices:
      - text: |
          The first three requests drain the `once` handlers and get `503`; the fourth finds no handler left and hits `onUnhandledRequest: 'error'`, failing the test with a confusing "no handler" error right where success was expected.
        correct: true
      - text: |
          MSW loops back to the first `once` handler, so the SDK gets `503` forever and the retry never succeeds.
        correct: false
      - text: |
          Nothing — three `once` handlers describe "fail three times," and MSW returns a default `200` for any request past them.
        correct: false
    why: |
      A `{ once: true }` handler answers one matching request then retires; once all three are spent there's nothing underneath. The non-`once` "sticky tail" is what catches the fourth (successful) retry. Without it the request falls through to the fail-loud policy and the test dies on the wrong error.

  - source: 88.7
    question: |
      In this codebase, how does a Server Action behave for an **unauthenticated** caller versus an **authenticated but underprivileged** one, and how do you test each?
    choices:
      - text: |
          Unauthenticated *throws* `NEXT_REDIRECT` (the auth ladder redirects to sign-in) — assert `rejects.toThrow('NEXT_REDIRECT')`. Underprivileged returns `err('forbidden')` in place — assert `toBeErrResult('forbidden')`.
        correct: true
      - text: |
          Both return a `Result.err` — `'unauthenticated'` for no session and `'forbidden'` for the wrong role — so both are asserted with `toBeErrResult(...)`.
        correct: false
      - text: |
          Both throw — `NEXT_REDIRECT` for no session and a `ForbiddenError` for the wrong role — so both are asserted with `rejects.toThrow(...)`.
        correct: false
    why: |
      The two refusals take opposite exits because they fit different callers. A session-less caller has no identity to show a permission error to, so the ladder redirects — which `redirect()` implements by throwing. An authenticated caller is already in the app, so the gate refuses in place with a `Result` code the UI can render. There is no `'unauthenticated'` code in this codebase.

  - source: 88.8
    question: |
      A `createInvoice` test goes red on an unrelated PR, then passes on re-run. CI offers a `--retry=3` flag that would make the build green. Why is reaching for it the wrong move here?
    choices:
      - text: |
          `--retry` re-runs until one attempt passes and reports green, silencing the suite's one honest signal — and it hides real intermittent regressions (a genuine race) exactly the same way it hides a leaked mock.
        correct: true
      - text: |
          `--retry` is fine for test-logic flake; it's only forbidden for infrastructure flake like container startup, where a real failure must surface.
        correct: false
      - text: |
          `--retry` mutates the shared test database between attempts, so the retried run starts from dirty state and the result is meaningless.
        correct: false
    why: |
      Retry on test-logic flake mutes the cause instead of removing it, and it'll wave a real production race through just as readily. The disciplined path is to reproduce the rate with `{ repeats: 100 }`, read the bucket off the symptom, and apply the structural fix. The one legitimate retry is scoped to *infrastructure*, never your test logic.
