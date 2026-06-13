# Chapter 086 — The shape of a test suite

## Lesson 1 — Picking Vitest and wiring the runner

**Taught.** Installed Vitest 4 (v4.1 current stable), walked `vitest.config.ts` built in three stages (minimal → `vite-tsconfig-paths` → `setupFiles`), defined three test projects (`unit`/`integration`/`component`), covered the file-parallel/test-sequential execution model, the shared `vitest.setup.ts`, and the `vitest` (watch) vs `vitest run` (CI) distinction.

**Cut.** `it.concurrent`/`describe.concurrent` mechanics, `expect.assertions(n)`, `expectTypeOf`/`assertType`, `vitest --typecheck`, `vi.mock` hoisting depth, fake timers, coverage config beyond the install of `@vitest/coverage-v8` — all deferred to later chapters per the lesson outline scope.

**Debts.**
- `@testing-library/react` and `jsdom` not installed; `component` project is commented-out stub — lands in ch089.
- Integration project DB lifecycle not built — lands in ch088.
- `afterEach(cleanup)` not registered in `vitest.setup.ts` yet — lands in ch089.
- CI reporter flag (`--reporter=junit`) named but not wired — lands in ch097.
- `it.only` lint rule referenced but not configured — lands in ch097.
- Coverage thresholds and exclusions not configured — lands in ch086 L3.

**Terminology.**
- `globals: false` — per-file explicit `import { describe, it, expect } from 'vitest'`; no ambient globals.
- Test projects — named slices in `test.projects` array, each with own `environment` and `include` glob; replaces deprecated `vitest.workspace.ts`/`workspaces` (removed in Vitest 3.2).
- `vitest` = watch mode; `vitest run` = single pass + exit (CI).
- `vite-tsconfig-paths` plugin — required for `@/` alias resolution under Vitest; Vite 8's built-in `resolve.tsconfigPaths` does NOT work under Vitest.
- `setupFiles` — runs once before each test file.
- Worker isolation — file-level isolation is free (separate threads); test-level isolation within a file is the author's responsibility.

**Patterns and best practices.**
- `vitest.config.ts` uses `globals: false`, `environment: 'node'`, `vite-tsconfig-paths` plugin, `setupFiles: ['./vitest.setup.ts']`.
- Three projects: `unit` (`src/**/*.test.ts`, node), `integration` (`tests/integration/**/*.test.ts`, node), `component` (`src/**/*.test.tsx`, jsdom — commented out until ch089).
- `vitest.setup.ts` loads `.env.test` via dotenv and pins `process.env.TZ = 'UTC'`; never imports DB client here.
- `package.json` scripts: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`.
- No shared mutable state across `it` blocks; no run-order dependencies within a file.

**Misc.**
- Vitest version: **4.x line** (4.1 stable as of 2026). Chapter brainstorm references v3 — treat all subsequent lessons as v4.
- `@vitest/coverage-v8` installed now; zero coverage config until L3.
- Jest is named once as the predecessor; never referenced again in Unit 18.

## Lesson 3 — Coverage as a diagnostic, not a target

**Taught.** Established branch-over-line as the senior read, the "diagnostic not target" frame for coverage, per-directory CI thresholds as a backstop on load-bearing surfaces only, and the absence-of-tests audit via `coverage.include`.

**Cut.** Chapter outline mentioned `coverage.all: true` for the absence audit — this was Vitest 3 behavior, **removed in Vitest 4**; the lesson correctly uses `coverage.include` instead. The quiz lesson (Lesson 5) still references `coverage.all: true` and will need updating.

**Debts.**
- CI wiring (JUnit reporter, PR coverage comment, merge gate) deferred to ch097.
- `coverage.thresholds.autoUpdate` named and declined; not wired anywhere.

**Terminology.**
- `coverage.include` — globs that pull untested files into the report at 0%; replaces the removed `coverage.all` option.
- "Coverage is a map of un-exercised paths, not a scoreboard" — the diagnostic frame; read by location (per-file), never by average.
- "Backstop, not a goal" — threshold framing: a floor that catches regressions, not a target to climb.
- `perFile` — must be set on each glob threshold individually in Vitest 4; glob thresholds no longer inherit the top-level `perFile`.
- Theatre test — a test that adds coverage but no behavioral signal; fails only if deleted.
- "What would have to change for this test to fail meaningfully?" — the portable heuristic for spotting theatre.
- Mutation testing / Stryker — mental model only: coverage = what ran, mutation = what was checked. Not installed; named once and set down.
- Differential coverage — per-PR view ("this PR added 20 lines and covered 15"), the signal a reviewer wants; contrasted with the meaningless whole-codebase average.
- `safeLimit` — one-line reminder in lesson: the rate-limit wrapper from ch081; fail-open on Redis-auth error, fail-closed on real quota exhaustion.

**Patterns and best practices.**
- Course coverage baseline (canonical source — not yet in Code conventions.md):
  - `src/lib/**`: `{ lines: 90, branches: 85 }`
  - `src/app/api/webhooks/**`: `{ branches: 85, perFile: true }`
  - `src/lib/auth/**`, `src/lib/error-mapping.ts`, `src/lib/rate-limit.ts`: `{ branches: 85 }`
  - Everything else: unthresholded.
- `coverage.exclude` list: `**/*.config.{ts,js}`, `**/*.d.ts`, `**/types.ts`, `**/index.ts`, `app/**/{page,layout}.tsx`, `**/*.stories.tsx`, `scripts/**`, `**/__mocks__/**` — each exclusion carries a recorded reason.
- `coverage.include`: `['src/lib/**/*.ts', 'src/app/api/**/*.ts']` — surfaces untested files at 0%.
- Run coverage periodically (once a sprint / when touching a seam), not on every save.
- Mocking Drizzle/Stripe/Resend is forbidden (reinforced via the CodeReview theatre exercise).

**Misc.**
- Config conventions: coverage block always shown in isolation with `// inside test: { ... }` comment; full assembled block shown once at the end — matches L1's staged-config treatment.
- `coverage.all` was removed in Vitest 4 entirely; any reference to it in older docs/brainstorm is wrong. Use `coverage.include`.
- The quiz lesson (Lesson 5) still cites `coverage.all: true` as a fact — needs correction before the quiz is written.
- Code conventions flag: the coverage thresholds baseline established here is not yet folded into `documentation/code standards/Code conventions.md`; curator decision pending.

---

## Lesson 4 — Arrange, act, assert one behavior

**Taught.** Installed the AAA shape (blank-line-separated Arrange/Act/Assert), the one-behavior-per-test rule, the `it('<observable outcome> when <conditions>')` naming pattern, the behavior-over-implementation rule with the black-box thought experiment as the writing reflex, a per-layer observable-surface table (pure fn → Server Action → route handler → webhook → component), and the matcher-choice principle (assertion failure as documentation).

**Cut.** Chapter outline included a "three or four asserts max" soft heuristic and "test the public surface, not the private helper" (exported-helper guidance) and "test the unhappy path" as a direct watchout — all were either omitted or only name-forwarded; none are critical for later lessons beyond what the outline's scope section already deferred. "mock the network, not the function" was name-forwarded to ch088 L4 without MSW code, as scoped.

**Debts.**
- Determinism seams (pinning time/IDs/randomness) — `expect.any(String)` named as a stopgap; real fix deferred to ch087 L3.
- Unhappy-path depth — two-tests-per-seam habit named, depth deferred to ch087 L6.
- MSW machinery — "mock at the boundary" principle stated; build deferred to ch088 L4.
- Async-test mechanics (`resolves`/`rejects` depth, forgotten-`await`) — observable surface named in layer table; mechanics deferred to ch087 L5.
- Component-test observable surface — one row in the layer table, full treatment deferred to ch089.
- Snapshot mechanics — valid/invalid line drawn (email templates + RFC 9457 shapes only); mechanics deferred to ch087/ch089.
- Quiz (Lesson 5) still cites `coverage.all: true` as a fact (flagged in L3 continuity notes) — needs correction before the quiz is written; L4 does not repeat this.

**Terminology.**
- AAA (Arrange / Act / Assert) — three blank-line-separated sections; one Act per test.
- `it('<observable outcome> when <conditions>')` — canonical test-name pattern; `describe` carries the unit, `it` carries the behavior.
- Black-box thought experiment — "swap the implementation for one satisfying the same contract; does the test still pass?" Yes = behavior test, No = implementation test. The course's writing reflex.
- Spy smell — asserting `toHaveBeenCalledWith(...)` on a value the test itself wired in; verifies setup, not behavior.
- Seam — boundary where app code meets an external system (reuse of L2 tooltip definition).
- Observable surface — per-layer: pure fn = return value/thrown error; Server Action = `Result` shape + DB row + audit-log entry; route handler = HTTP status + RFC 9457 body + headers; webhook receiver = HTTP status + `processed_events` row + business-table side effects; component = rendered text + controls + click effect.
- `vitest run --reporter=verbose` — outputs the full `describe`/`it` behavior catalog.
- `mapError(error): Result` — canonical AAA example in this lesson; lives in `lib/error-mapping.ts`; takes any thrown error and returns a `Result` keyed by a stable `code` string enum; `ZodError` maps to `{ ok: false, error: { code: 'validation' } }`. Later lessons writing unit tests for `/lib` should use this as the reference pattern.
- `safeLimit(limiter, key)` — two-arg signature from `@/lib/rate-limit`; returns Upstash `RateLimitResult` (has `success` boolean field); fail-open on transport throw (catches the error and returns `{ success: true }`). The CodeVariants and CodeReview exercises in this lesson assert `toMatchObject({ success: true })` as the correct observable — ch087/ch088 tests for `safeLimit` must use this two-arg call and assert the `RateLimitResult` shape.

**Patterns and best practices.**
- Every test: three AAA sections separated by blank lines; one Act call; name reads as `describe('unit') + it('outcome when condition')`.
- Assertion target is always the observable surface of the caller's layer; never private helpers, internal data structures, or call order.
- Mocks/spies are legitimate in Arrange; asserting that the spy was called with values the test itself set up is the anti-pattern.
- Matcher hierarchy: `toBe` for primitives, `toMatchObject` for partial-shape match on `Result`/DB rows (preferred — documents the failure diff), `toEqual` for full deep equality, `toContainEqual` for arrays, `toThrow` for error path, `expect.any(String)` for legitimately varying fields (IDs/timestamps — stopgap until ch087 L3 determinism).
- Snapshots valid only for caller-facing contracts (email template HTML, RFC 9457 bodies); snapshot churn = implementation coupling.
- Tests stop at the framework boundary — no tests for `<Link>`, `redirect()`, `notFound()`, `page.tsx` rendering (consistent with L2 rule).
- Each seam earns two tests minimum: observable success path + fail-closed branch (depth in ch087 L6).

**Misc.**
- AAA step colors in the `AnnotatedCode` walkthrough: blue = Arrange, green = Act, violet = Assert — deliberately different from L2's layer palette (unit=blue, integration=teal, component=violet, E2E=orange); a later consistency pass should leave them as-is per the lesson-outline note.
- BDD given/when/then is acknowledged as the same shape under a different label; the course pins to AAA + this naming pattern and does not use BDD vocabulary.

---

## Lesson 2 — The honeycomb shape for a Next.js SaaS

**Taught.** Established "shape follows the bug" as the governing rule: four bug layers of a Next.js SaaS (pure `/lib` logic, seams, components, E2E money paths); why the test pyramid is wrong for this architecture (framework owns orchestration, logic is shallow, bugs are boundary-heavy); the honeycomb as the integration-centered shape that falls out of that bug density; what lives in each band; the conditional-trigger pattern for component and E2E layers; and what earns no test (framework surface, behaviourless UI).

**Cut.** Chapter outline referenced Mermaid for the honeycomb diagram — the lesson used HTML+CSS horizontal band figures instead (TabbedContent pyramid vs. honeycomb comparison). All three figures are built and wired: `BugLayersStack` (four-layer stack with color-coded bands), `PyramidVsHoneycomb` (TabbedContent pyramid vs. honeycomb), and `CostVsBugs` (cost/bug-yield bar chart).

**Debts.**
- Integration mechanics (`withRollback`, MSW, auth fixtures, real test Postgres) named-forward only — ch088.
- Component-test trigger depth and React Testing Library — named-forward only, ch089.
- E2E trigger depth and Playwright — named-forward only, ch090.
- Snapshot test depth (email templates, RFC 9457 bodies) — gestured at, owned by ch087/ch089.
- Coverage mechanics explicitly deferred to L3 ("we have tests is not the bar" closes L2 but coverage numbers, thresholds, and `coverage.all` are L3's job).

**Terminology.**
- "Shape follows the bug" — the durable rule: find where bugs cluster, put tests there; shape is a consequence, not a prescription.
- "The seams" — boundary where app code meets external system (framework, DB, auth, third-party); defined inline with a tooltip on first use.
- "The `/lib` surface" — all pure deterministic code in `/lib`; the unit-test band.
- "Center of gravity" — integration is the widest honeycomb band because seam bug density is highest.
- "Fail-closed branch" / "message-split branch" — the two coverage targets per seam.
- "Zero or four E2E tests by year one, nothing in between" — course convention: a half-built E2E suite flakes and destroys signal.
- "No test" — explicit fifth bucket; not everything earns a test.
- The four layer colors (blue = unit, teal = integration, violet = component, orange = E2E) — introduced in bug-layers figure; reused in honeycomb figure and must be consistent across any future diagrams in the unit.

**Patterns and best practices.**
- Integration-test catalog is the six seams from ch080 L3: `authedAction`, `authedRoute`, `requireOrgUser`, webhook receiver, `safeLimit`, `error.tsx` boundaries — each covered on its fail-closed and message-split branches.
- Every file in `/lib` ships a unit test; every Drizzle query helper gets an integration test against real Postgres.
- Server Actions and webhook receivers are integration tests, never unit tests — they read session, parse input, hit DB, write audit log; none is pure.
- Component and E2E tests are conditional (trigger before tool): component triggers are shared library piece / complex stateful / critical UX path; E2E trigger is "does failure cost money."
- Tests stop at the framework boundary — no tests for `<Link>`, `redirect()`, `notFound()`, App Router segment behavior, or `page.tsx`/`layout.tsx` rendering.
- Snapshot tests valid only for contracts a caller depends on (email template HTML, RFC 9457 response bodies) — not for every `<Card>`.

**Misc.**
- Trophy shape addressed and distinguished from honeycomb: both are integration-centered; trophy emphasizes static base (types + lint) and client-app framing; course pins to honeycomb because server-side seams are the primary bug surface. Do not mischaracterize trophy as "fat component layer."
- Honeycomb presented as a four-band adaptation (unit / integration / component / E2E) of Spotify's three-band original — framed honestly as an adaptation, not a claim Spotify drew four bands.
- The "default by capability, conditional reach with a named trigger" pattern is explicitly linked back to TanStack Query/Zustand (ch076-079) and RLS (framed as ch079 in the lesson text) — later lessons should continue invoking this pattern by name.
