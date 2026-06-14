# Chapter 091 — Lesson 1 outline

## Lesson title

- Page title: **Project overview** (chapter-outline title fits; no change)
- Sidebar: **Project overview**

## Lesson type

`Project overview` — first lesson of a project chapter. No feature built. Student leaves with a running test harness: both Postgres DBs up + seeded, both empty suites confirmed booting. The test-coder does NOT run for this lesson.

## Lesson framing

The student walks away understanding the *shape* of the test suite they're about to build — why integration tests sit at the center of gravity for a money-handling webhook and why exactly one Playwright test guards the full Upgrade-to-Pro path — and with a harness that boots clean before a single assertion is written. The senior payoff is reading a layered suite as a deliberate coverage decision (honeycomb shape, not a pyramid), and arriving at the green-on-empty baseline that proves the rollback discipline and the provided fixtures are alive. Every piece of infrastructure ships in the starter; the student writes only the four test files across lessons 3–6.

## Codebase state

First lesson — no Entry/Exit pair. The chapter starts from the Chapter 065 codebase (the Stripe webhook + Checkout money path under test), augmented with a complete provided test harness (`src/test/**`, `tests/e2e/**` infra, the two-project `vitest.config.ts`, `playwright.config.ts`, the `postgres-test` Docker service). The four test files (`webhook-checkout-completed.int.test.ts`, `webhook-idempotency.int.test.ts`, `webhook-signature-rejected.int.test.ts`, `checkout-money-path.spec.ts`) ship as TODO stubs (`describe.todo` / `test.fixme`). At lesson exit the harness boots: `pnpm test:integration` collects three todo files and runs nothing; `pnpm test:e2e` runs `auth.setup.ts` (API sign-in, writes `.auth/admin.json`) then finds only the fixme spec; both DBs alive and seeded.

## Lesson sections

Follow the contract's **Project overview** section list, in order. Concise prose throughout — this is orientation, not instruction.

### What we're building (intro, no header)

One paragraph: a layered test suite proving the Chapter 065 Stripe webhook and Checkout money path. Integration tests drive signed webhook events through the real route handler against a real test Postgres (per-test transaction rollback); one Playwright test drives the full Upgrade-to-Pro money path against a production build. Name that this chapter continues the Chapter 065 project (the webhook the student already shipped) — now they prove it.

One figure: `Screenshot` (desktop) of `pnpm test:integration` green beside the Playwright HTML report showing a passing run with an attached trace. If two images, wrap in `TabbedContent`. Caption: the two terminal commands that frame the chapter's daily work.

### What we'll practice (h2: "What we'll practice")

Skills the student develops, phrased as practice not features. Bulleted list:
- Reading a test as a behavior contract — naming what each test proves from its name alone.
- Mocking at the network boundary — MSW intercepts Resend; Stripe's `subscriptions.retrieve` is stubbed at the SDK seam (MSW cannot intercept `stripe@22`'s `NodeHttpClient`) — never reaching into handler internals.
- Integration tests against real Postgres with per-test transaction rollback — the suite runs green twice with no cleanup between runs.
- Driving a money path end to end with Playwright on the production build — `storageState` auth, role-first locators, Stripe Checkout iframe handling, the trace viewer as debugger.
- Proving a suite is behavior-anchored by mutating the handler and watching failure localize to one test.

Keep to skills; do not preview implementation detail (that lives in lessons 2–6).

### Architecture (h2: "Architecture")

Shape only. The honeycomb shape (from the testing unit): integration tests at the center of gravity, covering the webhook seam where the framework, Postgres, the Stripe signature contract, and the outbound Resend call all meet — the bug-density layer. One Playwright test sits above, covering the composition (auth + upgrade action + Stripe round-trip + webhook + UI poll) no integration test can reach. Two terminal commands frame the work: `pnpm test:integration` (Vitest, real test Postgres, per-test rollback) and `pnpm test:e2e` (Playwright, production build via `webServer`, separate `saas_e2e` Postgres).

Diagram justified here — a labeled box-and-arrow shows the layering and the SUT seam better than prose. Use `ArrowDiagram` inside a `Figure`: boxes for the two test layers and what each covers (integration → the webhook route seam: framework + Postgres + Stripe signature + Resend; Playwright → the full money path composition). Keep it shape-level; do not draw the request internals (lesson 2 owns the harness internals). Alternatively a labeled list if the diagram adds little — the writer chooses, but a diagram is appropriate here.

State plainly: the student writes only the four test files; every harness piece ships in the starter (two-project Vitest config, the `@/db` Proxy mock, the Stripe SDK stub + retrieve registry, the MSW Resend server, auth fixtures, the rollback helper, the Stripe event/subscription factories, `postWebhook`, the Playwright config, auth setup, the Stripe-card helper).

### Starting file tree (h2: "Starting file tree")

`FileTree` component. Annotate one line each ONLY on files the chapter touches or that differ from the Chapter 065 project; leave the rest uncommented. Mark the four TODO test files as the highlighted focus.

Highlighted focus (the only files the student edits):
- `tests/integration/webhook-checkout-completed.int.test.ts` — TODO (lesson 3)
- `tests/integration/webhook-idempotency.int.test.ts` — TODO (lesson 4)
- `tests/integration/webhook-signature-rejected.int.test.ts` — TODO (lesson 5)
- `tests/e2e/checkout-money-path.spec.ts` — TODO (lesson 6)

Annotate the harness top-level (provided, not student-edited), at the granularity the contract wants — top-level layout, one-line comments only on touched/changed paths:
- `vitest.config.ts` — two projects (`lesson` + `integration`)
- `playwright.config.ts` — `webServer` prod build, `storageState`, setup + chromium projects
- `docker-compose.yml` — adds the `postgres-test` service on 55432 (both test DBs)
- `.env.test` (committed, no real secrets) / `.env.test.local.example` (template the student copies)
- `scripts/test-db-setup.ts`, `scripts/e2e-db-reset.ts`, `scripts/seed-e2e.ts`
- `src/test/**` — the harness (integration-setup, load-test-env, empty-module, stripe-retrieve-registry, db/worker-db, db/with-rollback, fixtures/{auth, stripe-events, stripe-subscription}, helpers/post-webhook, msw/{server, handlers/resend}) — name these as "walked in lesson 2", do not explain here
- `tests/e2e/{auth.setup.ts, fixtures.ts, helpers/fill-stripe-card.ts}` — provided e2e infra
- The Chapter 065 app (`src/app/api/webhooks/stripe/route.ts`, `src/lib/billing/**`, `src/lib/webhooks/**`, the `(protected)/inspector` page) — carried unchanged; name once as "the system under test", do not enumerate.

Keep the tree shallow — collapse the app surface to a few labeled nodes. Do not reproduce the full solution tree; this is orientation.

### Roadmap (h2: "Roadmap")

`CardGrid` with one `Card` per lesson 2–6 (number + title + one sentence on what it adds):
- **Lesson 2 — Reading the test harness.** Walks every provided fixture, helper, and config, then boots both empty suites to confirm the harness is alive.
- **Lesson 3 — The happy-path webhook test.** Drives a signed `checkout.session.completed` event through the real handler and asserts on the rows it writes.
- **Lesson 4 — The replay/idempotency test.** Sends the same event twice and proves the second send is a no-op.
- **Lesson 5 — The signature-tampered rejection test.** Tampers the signature and proves the request is rejected before any work.
- **Lesson 6 — Driving Checkout end to end.** Drives the full Upgrade-to-Pro money path with Playwright, then runs the suite-wide mutation and coverage drills.

(Confirm titles against the chapter outline at author time; use the chapter-outline lesson titles verbatim.)

### Setup (h2: "Setup")

`Steps` component, exact commands in order. First step is the canonical starter-clone line.

Context the writer states before the steps (brief): two Postgres DBs are needed — `saas_int_test` (integration, transaction rollback) and `saas_e2e` (Playwright, full reset) — both inside the one `postgres-test` Docker service on port 55432. `.env.test` is committed (no real secrets) and the integration tests load it directly; `.env.test.local` (gitignored) carries the student's own test-mode Stripe key + chosen admin password. The integration tests sign/verify with a fixed `STRIPE_WEBHOOK_SECRET=whsec_test_fixed_for_tests` (not a `stripe listen` dynamic secret), so the contract is deterministic.

Steps:
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 091/start/`.
2. `pnpm install`.
3. `docker compose up -d` — brings up the `db` (dev) and `postgres-test` (both test DBs) services.
4. `cp .env.test.local.example .env.test.local` and fill in the student's Stripe test key and a chosen admin password.
5. `pnpm db:test:setup` — creates and migrates `saas_int_test`.
6. `pnpm db:e2e:reset` — creates, migrates, and seeds `saas_e2e`.

Env vars the student supplies in `.env.test.local` (name / purpose / where to get it):
- `STRIPE_SECRET_KEY` — the student's own Stripe **test-mode** secret key; needed only for the Playwright Checkout test to open a real test-mode session; obtain from `dashboard.stripe.com/test/apikeys`.
- `E2E_ADMIN_PASSWORD` — any password the student chooses for the seeded admin user; `seed-e2e.ts` hashes the same value into the seeded credential and `auth.setup.ts` signs in with it.

Note: `pnpm seed:stripe` from Chapter 065 was already run when the student shipped the webhook; the products/prices exist in their Stripe account and the Playwright test reuses them — no additional Stripe seeding needed here.

Expected result (one sentence + the two commands' output): `pnpm test:integration` runs and reports zero tests executed (the three `.int.test.ts` stubs are `describe.todo`); `pnpm test:e2e` runs `auth.setup.ts` (signs in via the Better Auth API, writes `.auth/admin.json`) then the chromium project finds only the `test.fixme` spec. Both DBs alive and seeded; the harness boots clean before any test is written. Show the expected terminal output with `Code`.

Technology rationale (why integration vs E2E, why honeycomb, why real Postgres) belongs to the testing unit's teaching chapters, not here — link, do not re-explain.

## Code samples handling

- File tree: `FileTree`.
- Setup commands: `Steps` + `Code` for the expected output blocks.
- Finished-result figure: `Screenshot` (one or two images; `TabbedContent` if two).
- Architecture: `ArrowDiagram` inside `Figure` (or a labeled list if the writer judges the diagram adds little).
- Roadmap: `CardGrid` / `Card`.
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` here — no code is read or compared in an overview; the harness walkthrough is lesson 2.

## Scope

- Does NOT explain any harness internals (the `@/db` Proxy mock, `withRollback`, the Stripe SDK stub, MSW lifecycle, fixtures, `postWebhook`) — lesson 2 (Reading the test harness) walks them file by file.
- Does NOT write or explain any test — lessons 3–6 own the four test files.
- Does NOT teach the testing concepts themselves (honeycomb shape, integration vs E2E, real-Postgres rollback, MSW boundary, Playwright primitives) — those are the testing unit's teaching chapters (chapters 086, 088, 090); link rather than re-teach.
- Does NOT cover CI wiring (the suites run on every PR) — Unit 20 / chapter 097.
- Does NOT cover the Chapter 065 webhook implementation itself — that project is the system under test, carried in unchanged.
