## Concept 1 — Why three integration tests and one Playwright test

**Why it's hard.** Students arriving from a pyramid-shaped instinct want to test everything at every level: a projection unit test, a Drizzle wrapper test, a route-handler test, a Server Action test, a component test, and four E2E paths. The honeycomb cut is counter-intuitive — the project deliberately *skips* the unit and component layers here, and ships exactly one Playwright path. Without internalizing that cut the student treats every "Done when" omission as a gap to be filled.

**Ideal teaching artifact.** A static *budget map* (Concept archetype) that lays out the same Stripe-Checkout money path drawn three times: once as a pyramid (12 tests, six redundant), once as a trophy (8 tests, integration plus heavy E2E), once as a honeycomb (the project's 4 tests). Each shape is annotated with where the bugs actually live for *this* feature — the webhook seam (signature, dedup, projection, audit), the Stripe-Checkout round-trip composition — and the budget line "minutes to run / minutes to write / bugs caught." The student sees the same four bugs caught by the honeycomb's 4 tests, the pyramid's 12, and the trophy's 8. The point lands geometrically: the cut isn't austerity, it's where coverage actually compounds for an async-ingest seam.

**Engagement.** A short `Buckets` round sorting eight candidate tests (e.g., "unit-test `subscriptionToEntitlement` with three plan inputs," "component-test the Upgrade button," "E2E the Portal cancellation flow," "integration-test idempotency") into *in budget* / *out of budget — covered elsewhere* / *out of budget — bug density too low*.

**Components.**
- Hand-SVG inside `Figure` — three labeled test-shape silhouettes (pyramid, trophy, honeycomb) with the same four bugs annotated and the four-test honeycomb highlighted. Single-use composition, no forward-link, so `Figure`-wrapped SVG over a bespoke component.
- `Buckets` — three-column classification of candidate tests against this chapter's budget.

**Project link.** Lands the brief in 19.6.1: the deliverable's three integration + one Playwright count is the honeycomb at this seam, not a starter quota.

## Concept 2 — The starter ships the harness; you write the tests

**Why it's hard.** A student who has only ever set up testing infrastructure once reads "starter ships every piece of testing infrastructure" as boilerplate and skims. They then write the first test against the wrong abstraction — calling `db` instead of `tx`, mocking `lib/email.ts`, building a fresh `Request` instead of using `postWebhook` — and the test fails in confusing ways. The harness is the lesson; reading it is the work.

**Ideal teaching artifact.** A guided *contract-surface tour* (new archetype: *Harness Reading*) — the file tree is presented as a clickable diagram where each provided file is annotated with the *contract it exposes to the test* (not the implementation). The student doesn't read `with-rollback.ts` to learn how rollback works (19.3.1 owned that); they read it to learn that `withRollback(async (tx) => { ... })` returns whatever the callback returns, and that `tx` is the handle to pass everywhere DB work happens. Eight files, eight contract signatures the student must internalize before writing a line of test code: `withRollback`, `createAdmin`, `postWebhook`, `callAction`, the Stripe event factories, the Resend MSW handler's `resendCalls` array, the Playwright `adminPage` fixture, the auth setup's `.auth/admin.json`.

**Engagement.** A `Matching` drill: eight harness functions on the left, the eight one-line contract descriptions on the right. The student must connect each helper to "what it gives a test" before writing the first test in 19.6.3. Failed matches reveal which helpers the student misread the responsibility of.

**Components.**
- `FileTree` (Starlight built-in) — the starter tree with provided vs. TODO marked, sets context.
- `AnnotatedCode` — the eight contract signatures (one signature per step), each step focuses on inputs and return shape, never on internals.
- `Matching` — eight helpers ↔ eight contracts.

**Project link.** Sets 19.6.2 up. The student finishes the lesson having read the harness as a black box, not as code to absorb.

## Concept 3 — Transaction-per-test is structural, not procedural

**Why it's hard.** A student who has only ever written tests with `beforeEach(() => db.delete().from(allTables))` or with `truncate` in a teardown reads `withRollback` as a fancier version of the same idea. They miss the load-bearing claim: rollback is *structural* — there is no commit, no state to clean up, and crucially the route handler under test sees the *same* transaction the test reads from. Without that mental model the student wonders why `tx.select()` works and `db.select()` returns nothing, or writes a test that re-reads with the wrong handle and sees an empty table.

**Ideal teaching artifact.** A *split-screen state visualizer* (Mechanics archetype, animated): on the left a "Postgres" panel showing committed rows (always empty in this lesson — the dramatic point); on the right a "transaction `tx`" panel showing rows visible inside the open transaction. A scrubbable timeline advances through five frames: `BEGIN` (both empty) → `createAdmin(tx)` inserts user+org+session (right side fills, left stays empty) → `postWebhook(event)` fires the route handler which writes `processed_events`, `plan_entitlements`, `audit_logs` *inside `tx`* (right side fills further) → `tx.select(...)` from the test reads those rows (the read arrow originates from `tx`) → `ROLLBACK` (right side empties; left was always empty). The animation makes the "route handler writes into the same tx the test reads from" claim visible — it's the async-local-storage seam shown as a single shared bucket, not as two parallel databases.

A second beat, brief: a *wrong-by-default* variant where the route handler is wired to the global `db` instead of `tx`. Same scrub: the route handler's writes land in the *left* panel; the test's `tx.select()` reads the *right* panel; assertion fails because the test can't see the row that *did* commit. The student diagnoses the mismatch by watching where the arrows land.

**Engagement.** `PredictOutput`: given a snippet with `withRollback(async (tx) => { await postWebhook(event); const rows = await db.select().from(planEntitlements); return rows; })` — predict the length. The wrong-then-right reveal explains why reading with `db` inside `withRollback` is the canonical bug, and points at the `tx.select()` correction.

**Components.**
- New: `TxScrubber` — two panels (committed vs. transaction-scoped), a timeline of operations, each frame shows which writes/reads went where. Inputs: ordered list of operations with `{ op: 'insert'|'select'|'rollback', table, target: 'db'|'tx' }`. Renders side-by-side state and an arrow for the active operation.
- `PredictOutput` for the canonical bug.

**Project link.** Lands in 19.6.3's Arrange step — the student writes `withRollback(async (tx) => { ... })` and reads with `tx.select()` knowing why.

## Concept 4 — Mock at the network boundary, not at the function

**Why it's hard.** A student trained on Jest `jest.mock('./lib/email')` reads MSW as "the same idea, just at a different file." That collapses the entire point. Mocking `lib/email.ts` means the test never exercises the serialization, the auth header, the retry behavior, or the Resend SDK's request shape — every one of which has shipped bugs in real codebases. Mocking at `http.post('https://api.resend.com/emails', ...)` means the SDK runs in full and the test asserts on the wire-shape contract a real Resend server would assert on.

**Ideal teaching artifact.** A *two-route diagram* (Concept archetype): the same call path drawn twice, side by side. Path A — *mock the function*: an arrow from `webhook handler` → `lib/email.ts (mocked)` with a "✗" mark on the seam, and a list of things the test stops covering (Resend SDK call shape, auth header, retry, serialization, even `lib/email.ts`'s own logic). Path B — *mock the wire*: an arrow from `webhook handler` → `lib/email.ts` (real) → `Resend SDK` (real) → `fetch` → `MSW intercept`, with the MSW boundary marked at the last hop and a list of what the test now covers. The same diagram applies to Stripe API: production path goes through `stripe.subscriptions.retrieve` which the test exercises end-to-end down to the HTTP boundary.

A small *what-flows-through* table beneath the diagram: for each layer (handler, projection, Drizzle, email lib, Resend SDK, fetch), whether the *real* code runs under Path A vs. Path B. The asymmetry — Path B has one "fake" cell, Path A has five — is the senior payoff.

**Engagement.** `MultipleChoice` (multi-correct): "Which of these are observable by the test under MSW-at-the-wire but invisible under `vi.mock('./lib/email')`?" Options: SDK auth header, retry on 429, request body JSON shape, the `to` field the email lib forwards, the email lib's own validation. Several correct; the student must select all.

**Components.**
- Hand-SVG inside `Figure` — two-route diagram with the boundary marked. Single-use composition, no forward-link.
- A simple HTML table or `TabbedContent` for the what-flows-through comparison.
- `MultipleChoice` for the observability check.

**Project link.** Lands across 19.6.3 (Resend handler), 19.6.4 (tamper case asserts zero MSW calls), and 19.6.5 (no MSW — Playwright hits real Stripe test mode).

## Concept 5 — A test signs the request the same way Stripe does

**Why it's hard.** Webhook handlers feel untestable to students who think "I can't run the test because Stripe isn't sending the request." The lesson has to install a different mental model: the handler doesn't care who sent the request, it cares whether the `stripe-signature` header verifies against the body and the shared secret. A test that signs the body with the same secret is *structurally* indistinguishable from production — same code path, same verification, same outcome.

**Ideal teaching artifact.** A *handshake diagram* (Mechanics archetype) showing the production path and the test path overlaid. Stripe (production) and the test runner (test) both: serialize `event` to bytes, compute HMAC-SHA256 with the shared secret, set the header, POST. The webhook handler receives both identically. The diagram emphasizes the byte-for-byte path: production and test diverge only at the *origin* of the bytes, not at the verification. A tamper variant shows one character of the signature flipped — the diagram traces the verify step rejecting the request *before* any body parse, any DB write, any side effect.

**Engagement.** `Sequence` — given seven scrambled steps (`construct event object`, `serialize to JSON string`, `compute HMAC with secret`, `build Request with signature header`, `call POST handler`, `verify signature`, `process event`), order them. The constraint: serialize-then-sign matters (signing the parsed object instead of the raw bytes is the canonical bug the helper prevents).

**Components.**
- Hand-SVG inside `Figure` — handshake diagram, production and test paths overlaid with the divergence point marked.
- `Sequence` for the seven-step ordering drill.

**Project link.** Sets up 19.6.3's `postWebhook(event)` Act step and 19.6.4's `postWebhook(event, { tamperSignature: true })` rejection drill.

## Concept 6 — Assertions land on the contract surface, not on internals

**Why it's hard.** Students fresh from "I wrote a test for that function" reach for assertions on the helpers they can name: did `claimEvent` run, did `subscriptionToEntitlement` return the right shape, did the dispatch pick the right branch. Those assertions break the moment someone renames a helper, and they miss the actual contract — the response, the rows that survive the transaction, the audit log, the network call MSW caught. The teaching has to flip the instinct: caller-observable surface only.

**Ideal teaching artifact.** A *contract perimeter* diagram (Pattern archetype): the webhook handler drawn as a black box. Around its perimeter, every caller-observable surface is marked with a green dot — `Response` status and body, the `processed_events` row, the `plan_entitlements` row, the `audit_logs` row, the `resendCalls` array, the Stripe MSW call count. Inside the box, every internal — `claimEvent`, `subscriptionToEntitlement`, the `switch`, `dispatch`, the helper imports — is grayed out and marked with a red "✗ not an assertion target." Beside the diagram, a side-by-side `CodeVariants`: the *wrong* test (asserting on a spy of `subscriptionToEntitlement`, asserting `dispatch` was called with the right branch) next to the *right* test (asserting on the four rows and the MSW count). Same coverage, opposite robustness under refactor.

**Engagement.** `CodeReview` — the student is shown a draft happy-path test that mixes contract assertions with two implementation assertions (a spy on `claimEvent`, an assertion that `subscriptionToEntitlement` was called). The student leaves inline comments naming which assertions are contract and which are internal; the rubric checks they flagged both internal assertions.

**Components.**
- Hand-SVG inside `Figure` — contract-perimeter diagram with green-dot surfaces and grayed-out internals.
- `CodeVariants` — wrong test vs. right test, both passing today, one fragile under rename.
- `CodeReview` — student leaves comments on the mixed-assertion draft.

**Project link.** Anchors 19.6.3's four-surface assertion block and 19.6.6's refactor-rename drill where the contract-only test survives the rename.

## Concept 7 — Idempotency tests pin the dedup key

**Why it's hard.** A student who writes "send the event twice, assert one row" almost always forgets to pin the `eventId` — the factory's `nanoid` default generates a fresh ID per call, both events are processed, the assertion fails, and the student starts hunting in the wrong place (the handler must be broken). The trap is that the factory default is *right* for the happy path and *wrong* for the replay test. The student has to learn to read the test's intent and override the default.

**Ideal teaching artifact.** A *wrong-by-default sandbox*: the student is shown an idempotency test as drafted by a colleague — looks fine, calls `checkoutCompleted({ orgId })` twice, calls `postWebhook` twice, asserts one `processed_events` row, asserts `updatedAt` unchanged. The test fails. The student diagnoses why before reading the fix. The teaching artifact is the failed-test output side by side with the factory source (showing `eventId: opts.eventId ?? \`evt_test_${Date.now()}_${nanoid(6)}\``) and the diff that fixes it: `{ orgId, eventId: 'evt_test_idempotency_fixed' }`. The artifact carries the assessment — the student must spot the missing override before continuing.

**Engagement.** After the diagnosis, a confirming `MultipleChoice`: "Which of these tests are correctly set up for what they assert?" Three short scenarios — happy path with default `eventId`, idempotency with default `eventId`, signature-tamper with default `eventId`. Student picks the two that pin or don't need to pin, names why the third is wrong.

**Components.**
- New: `BrokenTestDrill` — a two-pane widget. Left pane: a small code block (the buggy test). Right pane: the test runner output showing the failure (rows count = 2). A "show factory source" toggle reveals the default-generating line. A "show fix" toggle reveals the one-line `eventId:` addition. Inputs: the buggy snippet, the failure output, the source excerpt, the fix.
- `MultipleChoice` for the confirming round.

**Project link.** Lands in 19.6.4 Part one — the student writes the fixed `eventId` knowing why every factory default that helps the happy path can sabotage a replay test.

## Concept 8 — A tampered-signature test proves verification runs first

**Why it's hard.** Students read "rejects on bad signature" and write a test that asserts `response.status === 400`. That assertion alone doesn't prove the load-bearing claim: that the handler verified the signature *before any side effect* — no DB write, no audit log, no body parse, no email send. A handler that returns 400 *after* writing the row would pass a status-only assertion and ship a security bug.

**Ideal teaching artifact.** A *negative-surface checklist* (Pattern archetype) — same contract perimeter diagram from Concept 6, but every green dot is now a *zero assertion*: `processed_events.length === 0`, `plan_entitlements` unchanged from the seed, `audit_logs.length === 0`, `resendCalls.length === 0`, no Stripe MSW call. The diagram is overlaid with a "verify gate" drawn *before* the perimeter — the request must pass that gate to reach any of the surfaces. A tampered signature fails the gate; every surface stays at zero. The teaching point: the proof isn't 400, it's the cumulative zero.

A second beat: a side-by-side of two handler implementations, both returning 400 on tampered signatures. Implementation A verifies first then writes; B writes then verifies and rolls back. Both pass a status-only test. Only A passes the negative-surface checklist. The student sees the assertion set as the structural enforcement.

**Engagement.** `TrueFalse` — five claims about the tamper test ("400 status alone proves verification ran first," "zero MSW calls is the proof of no body parse," "zero `processed_events` rows is the proof no DB transaction started for the event," "the audit-log zero assertion is redundant with the entitlement zero," "implementation B above would fail this test"). The student must hit four correct to confirm they read the cumulative-zero pattern.

**Components.**
- Hand-SVG inside `Figure` — negative-surface checklist with the verify gate, green dots replaced with zero assertions.
- `CodeVariants` — implementation A vs. B, both returning 400, one passing the negative-surface test.
- `TrueFalse` round.

**Project link.** Lands in 19.6.4 Part two — every assertion in the tamper test is a node on the negative-surface checklist.

## Concept 9 — A test is behavior if it survives a no-op refactor and dies on a real mutation

**Why it's hard.** "Behavior over implementation" reads as a slogan until the student feels the cost of the wrong choice. The teaching artifact has to make the slogan *operational* — the student needs a procedure they can run to know whether their suite is behavior-anchored. Without it, the rule is just rhetoric the student nods at and then writes an implementation-coupled test in the next lesson.

**Ideal teaching artifact.** A *mutation-isolation matrix* (Pattern archetype, possibly interactive). Rows: five deliberate mutations of the handler (comment out `claimEvent`; skip signature verify; force projection to return `plan: 'free'`; remove `lastEventAt` ordering predicate; remove `audit_logs` write). Columns: the three integration tests (happy, idempotency, tamper). Cells: green (pass) or red (fail). The matrix is the *signature* of a behavior-anchored suite — each mutation lights up exactly the test(s) that assert on its outcome. A diagonal-ish pattern means the suite isolates failures correctly; a column that stays all-green means a behavior nobody asserts on; an all-red row means a test that over-asserts.

A second short beat — a *no-op refactor* drill: rename `subscriptionToEntitlement` to `projectSubscription`, restructure the dispatch switch into a Record. The matrix should now be all green. A test that breaks on the rename is implementation-coupled.

**Engagement.** The matrix itself carries the diagnostic. After the student fills in the matrix from a real `pnpm test:integration` run for each mutation, a confirming `Buckets` round: sort five hypothetical test diffs into *behavior change worth a test edit* / *no-op refactor — test must not break* / *internal rename — test must not break*. The categorization confirms the student internalized the procedure.

**Components.**
- New: `MutationMatrix` — a 5×3 grid populated by the student from `pnpm test:integration` runs. Inputs: rows (mutations with `git`-restorable diff text), columns (test names). Renders an empty grid the student clicks to mark pass/fail, then reveals the expected pattern with a discrepancy callout if the student's run disagrees.
- `Buckets` — three buckets, five diffs to sort.

**Project link.** Lands in 19.6.6's mutation drill. The matrix is the verify recipe rendered as a tool the student fills in.

## Concept 10 — One Playwright path, and it's the one that costs money

**Why it's hard.** The student finishes the integration suite, feels the dopamine, and wants to write more E2E — sign-in path, invitation path, primary-value loop. The 19.5.1 filter has to fire *here*, when the temptation is real, not as an abstract rule. The lesson must make the cost concrete: 30-90 seconds per Playwright test, the `stripe listen` orchestration, the iframe-locator fragility, the cross-browser matrix. Then the filter — *failure that moves money, breaks identity, or loses unrecoverable data* — picks exactly one path for this chapter.

**Ideal teaching artifact.** A *decision tree* (Decision archetype): four candidate Playwright paths (sign-in, Stripe Checkout, invitation, primary-value loop) each pass through three gates — "does failure move money / break identity / lose data?", "is the same bug caught at the integration layer?", "does the path cross a seam no integration test reaches?" Each path gets a yes/no through each gate. Only Stripe Checkout passes all three gates *for this project*. Sign-in is covered by the integration layer's auth fixtures and isn't being changed; invitation is the same; primary-value loop's failure mode is recoverable. The tree makes the cut visible — this isn't austerity, it's the filter doing its job for this codebase at this moment.

**Engagement.** `Dropdowns` filling in the decision tree: given each path, the student picks each gate's answer from a dropdown. A wrong pick (e.g., marking sign-in's identity-break as "no") gets immediate feedback explaining why the project's *current* state lets that bug be caught elsewhere.

**Components.**
- Hand-SVG inside `Figure` — four-path decision tree with three gates. Single-use here but the four-path / three-gate framing is exactly the 19.5.3 catalog, so the SVG renders the catalog the student already saw — `Figure` over a bespoke component, the diagram doesn't recur in another shape.
- `Dropdowns` for the gate-by-gate fill-in.

**Project link.** Sets up 19.6.5 — the student knows why this chapter ships one Playwright test and not four before writing it.

## Concept 11 — `storageState` makes auth a one-time setup, not a per-test step

**Why it's hard.** A student's first Playwright instinct is to write `await page.goto('/sign-in'); await page.fill('email', ...); ...` at the top of every spec. That works, takes 3 seconds per test, multiplies by N specs, and pollutes the trace with the same six steps every time. The `storageState` move is a structural shift: sign in *once* via a setup project, write the cookie to disk, every subsequent test starts already signed in. The pattern only clicks when the student sees the *timing* difference and the *trace clarity* difference.

**Ideal teaching artifact.** A *before-and-after timeline* (Mechanics archetype): two horizontal time bars showing four hypothetical Playwright tests in sequence. Bar A: each test starts with a six-step UI-login block (red bars, ~3s each), then the actual test (green bar, ~5s each). Total runtime ~32s, traces littered with login noise. Bar B: a one-time setup step at t=0 (the `auth.setup.ts` writing `.auth/admin.json`), then four tests starting at the actual test step. Total runtime ~22s, traces start at the meaningful action. The visualization makes the "auth is infrastructure, not test content" claim measurable. A small inset shows the `.auth/admin.json` cookie surviving across test invocations until the cookie expires.

**Engagement.** `Tokens` on a small `playwright.config.ts` snippet — the student clicks the four tokens that wire `storageState`: the `setup` project's `testMatch`, the `chromium` project's `dependencies: ['setup']`, the `use.storageState` line, the `.auth/admin.json` path. Decoy tokens include `webServer`, `baseURL`, `trace`, `retries`.

**Components.**
- Hand-SVG inside `Figure` — two stacked timelines with red login blocks vs. one setup block plus four clean test bars. Single-use, no forward-link.
- `Tokens` on the config to lock in the four wiring points.

**Project link.** Lands in 19.6.5 — the student uses `adminPage` from `fixtures.ts` without re-deriving why the UI login isn't in the spec.

## Concept 12 — The Stripe Checkout iframe and the redirect-vs-webhook race

**Why it's hard.** The student writes `page.fill('input[name="cardNumber"]', '4242 ...')` and the locator fails — the input lives inside a Stripe-hosted iframe the test's DOM tree doesn't traverse without `frameLocator`. Worse, after submitting and returning to `/billing/success`, the test asserts "you're on Pro" and times out — because the redirect happens *before* the webhook has landed, and the entitlement is still `free` at the moment of the assertion. Two distinct failure modes, both invisible without a model of what's happening behind the scenes.

**Ideal teaching artifact.** A *scrubbable sequence diagram* (Mechanics archetype) of the money path, with the iframe boundary and the redirect-vs-webhook race both made visible. Frames: (1) `click "Upgrade"` — `billing.upgrade` Server Action creates a Checkout session, returns redirect URL; (2) browser navigates to `checkout.stripe.com` — Stripe-hosted page loads; (3) iframe inside the Stripe page loads the card input — the test must reach *inside* the iframe via `frameLocator` to fill it; (4) submit — Stripe processes the test card, fires `checkout.session.completed` to the local webhook endpoint (via `stripe listen --forward-to`); (5) Stripe redirects the browser back to `/billing/success` — *this can land before the webhook fires*; (6) `/billing/success` polls `getEntitlement` every N ms; (7) webhook arrives at the local server, writes `plan_entitlements`, the next poll sees `plan: 'pro'`, the UI flips. The scrub makes step 5's race visible: the redirect and the webhook are two independent network paths and their order is not guaranteed. The poller is the structural fix.

The second beat — a *broken test* the student fixes: the assertion `await expect(page.getByText(/pro/i)).toBeVisible()` without a timeout fails roughly half the time on a slow webhook delivery. The fix is `{ timeout: 30_000 }` on the success assertion and (more importantly) the `getByText(/finalizing/i)` assertion in between to capture the intermediate state. The diagram makes the timeout choice obvious — it must cover the worst-case webhook latency.

**Engagement.** `PredictOutput` on a stripped-down test: given the sequence (`click Upgrade`, navigate, fill card, submit, expect "Pro" with default 5s timeout), what does the run report — pass, fail with timeout, or flaky? The reveal traces back to the scrubbable diagram's step 5.

**Components.**
- `DiagramSequence` (existing) — seven scrubbable frames of the money path, iframe and race made explicit.
- `PredictOutput` for the timeout-flake reveal.

**Project link.** Lands in 19.6.5 — the student writes the `frameLocator` chain and the staged `expect.toBeVisible` with `timeout: 30_000` knowing what each guards against.

## Component proposals

- **`TxScrubber`** — two side-by-side panels (committed DB vs. open transaction `tx`) with a timeline scrubber. Inputs: ordered ops `{ op, table, target }`. Renders which writes/reads land where per frame.
  - Uses in this chapter: Concept 3.
  - Forward-links: useful for any future lesson that teaches transaction semantics or per-test rollback (Unit 21's migration content uses transactions; 19.3.1 itself owns the pattern and could reuse this). Moderate compounding.
  - Leanest v1: two static panels and a numbered next/previous chevron (no slider, no animation). The "where did the write land" arrow is the load-bearing element; everything else is decoration.

- **`BrokenTestDrill`** — two-pane widget showing a buggy test + its real failure output, with toggles to reveal the factory/source excerpt and then the one-line fix. Inputs: snippet, failure text, source excerpt, fix diff.
  - Uses in this chapter: Concept 7.
  - Forward-links: every testing chapter has at least one "factory default fights the test intent" moment (19.2.2 factories, 19.3.6 webhook signing, 19.3.8 flake taxa). High compounding across Unit 19.
  - Leanest v1: a `CodeVariants` with three tabs (Buggy / Why it fails / Fix) and inline prose. No interactive toggle, no embedded runner output. Passes the teaching bar if the failure output is shown as a pre-rendered text block in the middle tab.

- **`MutationMatrix`** — an N×M grid the student fills in by running `pnpm test:integration` against each pre-staged mutation. Inputs: mutation rows with restorable diffs, test columns, expected pattern. Reveals discrepancies between student-marked results and the canonical pattern.
  - Uses in this chapter: Concept 9.
  - Forward-links: mutation testing is a generally applicable diagnostic; any chapter doing "prove the suite catches the bug" (19.1.4, 19.3.1, 19.3.6) could reuse this. The mutation-isolation procedure is *the* operational definition of behavior-over-implementation. High compounding.
  - Leanest v1: a static pre-filled matrix in a `Figure` with one row of student-action ("run drill 1: comment out `claimEvent`, re-run, confirm idempotency test fails alone") rendered as a `Steps` block beside it. The interactive grid is the polished version; the static matrix plus `Steps` already teaches the procedure.

## Build priority

`MutationMatrix` carries the most teaching weight in this chapter and forward across Unit 19 — it operationalizes the "behavior over implementation" rule the unit returns to repeatedly. `BrokenTestDrill` is the next priority: the wrong-by-default ambush is reusable across nearly every testing chapter, and the v1 (a three-tab `CodeVariants`) is cheap. `TxScrubber` is the most narrowly targeted of the three; build it last, and only if the static SVG explanation in Concept 3 demonstrably leaves students confused on first contact.

## Open pedagogical questions

- Concept 9's `MutationMatrix` interactivity may be overkill if the student is already at the terminal running `pnpm test:integration` for each mutation. The leanest v1 (static matrix + `Steps`) may be the right ceiling here; the interactive grid earns its cost only if it surfaces *discrepancies* between the student's run and the canonical pattern in a way that catches a misconception the steps-and-static-table form doesn't.
- Concept 12's `DiagramSequence` covers the redirect-vs-webhook race conceptually; whether students also need a parallel `stripe listen` orchestration diagram (a side terminal forwarding events to localhost:3001) is unclear. The outline names the seam but doesn't dwell. Defer until first-pass feedback shows whether the orchestration confuses students or reads as obvious.
