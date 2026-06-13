# Chapter 090 — Continuity notes

## Lesson 1 — The money-path filter

**Taught:** Established the money-path filter (money moves wrong / identity breaks / unrecoverable data lost or exposed) as the sole gate for writing a Playwright E2E test; installed the thesis "Playwright is a money-path tool, not a coverage tool"; delivered cost-shape numbers (unit 5 ms → integration 20–80 ms → component 100–300 ms → E2E 2–10 s), the flake-is-structural-not-retriable principle, the composition-only justification, the 20–30 path ceiling, the "production build not next dev" rule, year-one zero as correct default, and the four-step ordered gate (money? → cheaper-tests compose? → third-party drivable? → deterministic without sleeps?).

**Cut:** Config knobs (`retries`, `trace`, `storageState`, locators, `webServer` full walkthrough), the four-path catalog specifics, browser projects — all deferred to Lessons 2–3 as scoped. Only a one-line `webServer` fragment appeared as a motivating preview.

**Debts:**
- Promised Lesson 2 owns: full `playwright.config.ts`, `webServer` wiring, `auth.setup.ts`, `storageState`, fixtures, role-first locators, auto-waiting `expect` matchers, trace viewer, `retries`/`trace`/`screenshot` config knobs, the E2E test DB and seed, sharding.
- Promised Lesson 3 owns: the four canonical money paths walked test-by-test (sign-in, Stripe checkout round-trip, invitation acceptance, primary value loop), Stripe iframe selectors, per-test data hygiene, CI workflow, reviewer checklist.
- Forward-referenced Unit 19 (Sentry observability) as the production safety net justifying year-one zero — that unit has not shipped yet.

**Terminology:**
- **money-path filter** — the three-class gate: money moves wrong, identity breaks, unrecoverable data lost/exposed.
- **Playwright** — Microsoft's browser-automation test runner; 2026 E2E default on this stack; pinned to 1.x line (1.60.0 as of May 2026).
- **flaky test** — passes and fails on identical code; caused by real-world nondeterminism.
- **seam** — framework/DB/auth/third-party boundary; where integration tests (ch088) live.
- **composition bug** — a bug that lives in how the full stack's pieces fit together; the only justification for an E2E test.
- **trigger before tool** — recurring course pattern (TanStack Query → RTL → Playwright); named explicitly as "the third instance."
- **year-one zero** — correct default for small teams with disciplined integration tests + production observability.
- **20–30 path ceiling** — upper bound on money paths; past 30 signals coverage-chasing drift.

**Patterns and best practices:**
- E2E suite is off by default; add a test only when the money-path filter fires.
- Flake gets a structural fix (better locators, auto-waiting assertions, deterministic seed), never a retry bump.
- Playwright must drive a production build (`pnpm build && pnpm start`), never `next dev`.
- "Fewer, better-chosen tests" is the senior review note for a junior's first Playwright PR.
- Four-step gate is ordered cheap-to-expensive so most candidates stop before question 3.

**Misc.:**
- The four canonical money paths (sign-in, Stripe checkout round-trip, invitation acceptance, primary value loop) were named in the Buckets exercise and the 20–30 shape section; Lesson 3 owns walking them in full.
- `retries: 3` as anti-pattern was named here but the config knob itself is Lesson 2's surface — do not re-teach the discipline in Lesson 2, just wire the config.
- Playwright "Best Practices" external resource note: its "don't test third parties you don't control" line tensions with the course's stance of driving real Stripe Checkout test mode — Lesson 3 owns the nuance; Lesson 2 should not address it.
- VideoCallout was dropped entirely from the final build — no video slot in the lesson.

## Lesson 2 — Config, storageState, and the trace viewer

**Taught:** Assembled the full Playwright wiring kit: complete `playwright.config.ts` (all top-level keys, `webServer`, `projects`), `auth.setup.ts` with `storageState`, the separate `saas_e2e` test database with `pnpm db:e2e:reset`, role-first auto-waiting locators and `expect` matchers, `test.extend` fixtures, and the trace viewer as the debugging workflow.

**Cut:** `page.route` in-browser network mocking, per-test data hygiene patterns (unique identifiers, deferred cleanup), the `playwright.yml` CI workflow file, Page Object Model, cleanup/per-test isolation patterns beyond fixtures — all deferred to Lesson 3 or the project chapter. `page.clock` named as "it exists" only. Sharding named as a future seam, not set up. MSW-vs-Playwright distinction fully omitted (not even one line — the lesson simply drives a real server; Lesson 3 can introduce the "MSW does not run here" framing if needed).

**Debts:**
- Lesson 3 owns: the four money-path tests walked test-by-test, `page.route` in-browser mocking, Stripe iframe selectors (`frameLocator`), OAuth redirect-URL vs. full-round-trip trade-off, per-test data hygiene (`test.info().title` + `Date.now()` identifiers), the CI `playwright.yml` workflow, the reviewer checklist.
- Rate-limit counter reset in the seed forward-referenced to Lesson 3 ("the seed also clears Upstash counters for `*@e2e.test`").
- Playwright "Best Practices" external resource linked without addressing the "don't test third parties" tension — Lesson 3 owns that nuance.

**Terminology:**
- **storageState** — JSON snapshot of browser-context cookies + localStorage + sessionStorage; replayed to restore auth without the login UI.
- **auto-waiting** — Playwright retries locator actions and `expect` matchers until the element/condition is ready or a timeout fires; replaces `waitForTimeout` and `waitForSelector`.
- **trace viewer** — post-mortem GUI opened from `trace.zip`; per-action DOM snapshot, network log, console log, screenshot, source-mapped stack.
- **`forbidOnly`** — config key that fails CI on a stray `test.only`.
- **`reuseExistingServer`** — `webServer` flag; `true` locally (reuse running `pnpm start`), `false` on CI (always build fresh).
- **`saas_e2e`** — dedicated Playwright-owned Postgres, separate from dev and per-worker integration DBs.
- **`pnpm db:e2e:reset`** — runs migrations + deterministic seed before the suite; the isolation seam between full Playwright runs.
- **`test.extend`** — fixture factory; setup above `await use(value)`, teardown below; per-test by default.
- **`setup` project** — Playwright project running `*.setup.ts` first; `chromium` project declares `dependencies: ['setup']` to enforce ordering.

**Patterns and best practices:**
- `playwright.config.ts` deliberate divergence from scaffold: `retries: process.env.CI ? 1 : 0` (scaffold ships `2`); reporter `[['github'], ['html']]`. Do not "correct" these to scaffold defaults.
- `webServer.command` is always `pnpm build && pnpm start` — never `next dev`.
- One `auth.setup.ts` per role; `.auth/` directory is gitignored (live session cookies).
- Every spec imports `test` and `expect` from a local `fixtures.ts`, not from `@playwright/test` directly.
- `await expect(locator).toBeVisible()` — must `await`; omitting silently passes.
- Locator priority: `getByRole` → `getByLabel` → `getByText` → `getByTestId` (last resort); no CSS class locators.
- WebKit and Firefox are opt-in projects (`PLAYWRIGHT_PROJECTS=all`), run only for auth and checkout money paths.
- E2E test database must stay separate from both the dev DB and the integration per-worker DBs — shared DB causes write conflicts.

**Misc.:**
- Process-boundary explanation (why per-test transaction rollback is impossible in E2E) is taught here; Lesson 3 can reference without re-explaining.
- `trace: 'on-first-retry'` means a trace exists only when a test retries — "why is there no trace?" means the test passed on first try or config is wrong.
- Codegen introduced as a "first-draft" tool; its CSS selectors need rewriting to role-based locators before review.
- `page.clock` mentioned as "it exists, reach for it when a money path needs to freeze time" — not demonstrated; Lesson 3 can use it without prior setup needed.

## Lesson 3 — The four-path catalog

**Taught:** Walked the four canonical money paths in spec form — sign-in (fresh context, no storageState), Stripe Checkout round-trip (storageState owner, frameLocator for Stripe iframes), invitation acceptance (fresh user, no storageState, cross-org 404 boundary assertion), and the invoice value loop (unique-id data hygiene on a shared DB); delivered the catalog-vs.-cheaper-home classification, the OAuth redirect-URL trade-off, CI workflow shape and runtime budget, and the six-point reviewer checklist.

**Cut:** Full multi-assertion spec files — each path was shown as a focused excerpt (one or two behaviors); Ch091 owns full production-grade specs. `page.route` in-browser network mocking mentioned in Lesson 2 but not demonstrated here. Stripe Test Clocks named as integration territory only. Page Object Model and sharding not set up (named as "premature for a 4-path suite"). The full send-and-pay invoice loop was represented only by the create-and-list excerpt (the complete Stripe-payment half is Ch091's build).

**Debts:**
- Ch091 hardens the Stripe Checkout spec into a full graded suite; framed explicitly as "the template this lesson leaves."
- Lesson 1 forward-referenced rate-limit counter reset in `db:e2e:reset` — fulfilled here (the `note` callout in path 1).

**Terminology:**
- **`frameLocator`** — Playwright handle for elements inside an `<iframe>` (e.g., Stripe's hosted card fields); `page.frameLocator('iframe[name^="..."]').getByLabel(...)`.
- **multi-tenant guard** — per-org scoping that returns 404 when a member reaches another org's resource; the load-bearing boundary assertion in the invitation spec.
- **Stripe test mode** — Stripe's parallel sandbox; test API keys + `4242 4242 4242 4242` card; no real money moves; a stable, documented contract.
- **`4242 4242 4242 4242`** — Stripe's universal test card; load-bearing literal, not a placeholder.
- **unique-id data hygiene** — `` `invoice-${test.info().title}-${Date.now()}` `` pattern; prevents parallel-worker row collisions on a shared saas_e2e DB.

**Patterns and best practices:**
- Sign-in spec uses a fresh browser context with NO storageState — it is the sole exception; every other money-path spec inherits auth via storageState.
- Stripe Checkout: drive real test-mode checkout.stripe.com; `frameLocator` to reach card fields inside iframes; assert role+name WITHIN the frame, never CSS.
- Invitation acceptance: seed-insert the token in a fixture; drive the "signed-out, no account" arrival shape; the cross-org 404 is the mandatory boundary assertion.
- Value-loop tests: unique identifier per test (title + timestamp); no afterEach cleanup — defer to `pnpm db:e2e:reset`; assert on own named row, never by position.
- OAuth: assert the redirect URL your app constructs (client_id, scopes, callback); stop there for per-PR suite; full round-trip is quarterly manual QA only.
- CI: e2e job `needs: build`; `pnpm db:e2e:reset` before the run; `upload-artifact` on `if: failure()` with `playwright-report/`.
- Six-point reviewer checklist: (1) name the money path, (2) role-first locators, (3) storageState not UI login, (4) passes --retries=0 ten times, (5) third-party in test mode, (6) trace.zip reviewed.

**Misc.:**
- Spec excerpts are intentionally not full files — explicitly called out in the lesson; Ch091 ships the fuller versions.
- `locator.contentFrame()` named as an equivalent to `frameLocator` in one clause; `page.frameLocator(...)` is the course's primary shape.
- Runtime budget established: ~3–6 min Chromium-only, ~8–10 min with WebKit+Firefox for sign-in and checkout; shard past 15 min.
- "Year-one zero → year-two four" trajectory used as the closing frame; the four-path catalog is a destination, not a day-one checklist.
