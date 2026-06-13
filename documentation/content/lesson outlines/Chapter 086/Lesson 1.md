# Picking Vitest and wiring the runner

Title: Picking Vitest and wiring the runner
Sidebar label: Wiring the test runner

---

## Lesson framing

This is the unit's first lesson and a **setup-and-wiring** lesson: it puts `vitest.config.ts` and the scripts on disk so chapters 087–090 can lean on them without re-justifying. The whole unit (chapters 086–091) depends on the decisions made here, so the lesson must be correct and durable, not exhaustive.

Senior framing (the implicit senior question per the pedagogical guidelines): *a Next.js 16 SaaS in 2026 needs a test runner — which one, and how is it wired so one config runs the node-environment and jsdom-environment tests the codebase actually has?* Lead with the decision, then the config. The student already knows the stack (React 19, Next.js 16, Drizzle, TypeScript), knows ESM and `tsconfig` path aliases, and has met `pnpm` package scripts. Frame Vitest against that existing knowledge: it is the test counterpart of the Vite/ESM/TS world they already build in.

**The single hardest thing about this chapter outline is scope.** The Chapter 086 brainstorm for this lesson lists almost the entire unit's API surface (`expectTypeOf`, fake timers, the full matcher catalog, `expect.assertions`, `vi.mock` hoisting depth, coverage thresholds, `it.concurrent` mechanics). Those belong to later lessons and **must not be taught here** — see Scope. This lesson teaches: why Vitest over Jest, the install, the config surface (`globals: false` + `vite-tsconfig-paths`), the test-projects node/jsdom split, the runner's execution model, watch mode, the setup file, and `vitest run` vs `vitest`. Everything else is at most a one-line "named once, forward-referenced" pointer.

Mental model the student should leave with: *Vitest is one config that defines several projects; each project is an environment + a glob; files run in parallel workers, tests inside a file run in order; `vitest` watches while I code, `vitest run` is what CI calls.* They should be able to read and explain the project's `vitest.config.ts`, run a single project slice, and know why `globals: false` and `vitest run`-in-CI are deliberate.

Cognitive-load plan: build the config up in stages. Start with the smallest possible single-environment config, then add path aliases, then split into projects — never drop the full file as a wall. Use one diagram for the execution model (the one genuinely non-obvious idea) and a FileTree+config pairing for the project split. Keep matcher/mocking API to a one-screen "this is the small surface every test imports" reference, not a tutorial.

The canonical contract this lesson must match (from `documentation/code standards/Code conventions.md`, Testing section, lines 475–486): `globals: false`, `vite-tsconfig-paths`, three projects `unit` (node) / `integration` (node, real DB) / `component` (jsdom); colocation `name.ts` next to `name.test.ts`; integration tests under `tests/integration/`. Treat this as the source of truth wherever it and the chapter brainstorm disagree.

---

## Lesson sections

### Introduction (no header)

Per the pedagogical structure, open warm and brief, no h2. State the goal: by the end the student has Vitest installed, a `vitest.config.ts` they understand line by line, and the muscle memory for `vitest` vs `vitest run`. Motivate with the concrete problem: the codebase has two kinds of tests — pure `/lib` logic that runs in plain Node, and (later) component tests that need a DOM — and a 2026 runner has to serve both from one config without a hundred lines of Babel/ts-jest plumbing. Name that this is the foundation the rest of Unit 18 builds on. One sentence connecting to prior knowledge: they already build in Vite + ESM + TS; Vitest is that same toolchain pointed at tests.

### Why Vitest, not Jest

The runner decision, framed as the senior question. Two candidates: Jest (the historical default) and Vitest (Vite-native, Jest-compatible API). The decision criteria are what to teach, not a feature dump:

- **Native ESM and TypeScript, near-zero config.** Jest needs `babel-jest`/`ts-jest` plumbing to handle ESM and TS; Vitest reads the project's existing Vite/TS pipeline and runs `.ts`/`.tsx` directly. This is the load-bearing reason for a 2026 stack — connect it to the ESM-first world the student already builds in.
- **Jest-compatible API.** `describe`, `it`, `expect`, `beforeEach` are identical; the only rename a Jest reader notices is `vi.fn()` where Jest writes `jest.fn()`. So skills transfer both ways and any future migration is mechanical.
- **Watch mode is "HMR for tests."** A saved file re-runs only that file and its dependents, not the whole suite — fast enough to leave running while editing. Tie this to the HMR they already know from the dev server.

State the pin explicitly: **the project is on the Vitest 4 line** (current stable is 4.1.x as of 2026; the chapter brainstorm predates v4 and says "pin to v3" — that is outdated, pin to v4). Do **not** describe v4's awaited-assertion enforcement as an "upcoming" change; in v4 it has already landed, and async-assertion depth is chapter 087 L5's job regardless. Name Jest exactly once here as "the predecessor"; per the chapter thread, the unit never returns to it.

Component to use a short two-tab `CodeVariants` ("Jest config" vs "Vitest config") is the most effective way to make the "no plumbing" claim concrete: a Jest setup needing `transform`/`ts-jest` preset beside a Vitest `defineConfig` that is a few lines. Keep both panes short (the point is volume, not detail). Reasoning: the senior decision is best argued by showing the config delta, not asserting it.

`Term` candidates in this section: **ESM** (ECMAScript Modules — the `import`/`export` standard, vs CommonJS `require`), **HMR** (Hot Module Replacement — swapping changed modules without a full reload). Both re-explain prerequisites without breaking flow.

### Installing Vitest

The install, on the project's toolchain (pnpm). Do not pin a hard Node version in prose — it ages and is a distraction in a runner lesson; if a version must appear, note Node 24 is Active LTS in 2026 (Node 26 is the Current line, not yet LTS). Keep it to exactly what this lesson needs:

- `pnpm add -D vitest @vitest/coverage-v8` — the baseline. Note in one line that the coverage provider is installed now but configured two lessons later (086 L3); it is here so the dependency is present. Do **not** teach coverage config.
- One sentence each, not installed here: `@vitest/ui` (dashboard, opt-in), and `jsdom` + `@testing-library/react` (arrive conditionally with chapter 089). Naming them now prevents the student from installing them prematurely.
- `package.json` scripts, as a `Code` block:
  - `"test": "vitest"` — watch, the local reflex.
  - `"test:run": "vitest run"` — single pass, what CI calls.
  - `"test:coverage": "vitest run --coverage"` — single pass with coverage.

Use `Steps` for the install procedure (install deps → add scripts → create config, which threads into the next section). Reasoning: `Steps` is the right component for an ordered setup the reader follows.

`Term` candidate: **dev dependency** (a package needed only to build/test, not at runtime — the `-D` flag) if not already over-explained earlier in the course; use judgment, skip if redundant.

### The config, one piece at a time

The heart of the lesson. Build `vitest.config.ts` in stages to keep cognitive load low — never present the finished file first.

Stage 1 — the minimal config. A `defineConfig({ test: { ... } })` with just `environment: 'node'`, `include: ['src/**/*.{test,spec}.{ts,tsx}']`, and `globals: false`. Explain each:

- `globals: false` is the senior reach: every test imports `{ describe, it, expect }` from `'vitest'` explicitly. No ambient globals means the codebase stays grep-able and refactor tools keep a real import to follow. Contrast briefly with `globals: true` (Jest-style ambient) and say why the course rejects it. This is a genuine senior-mindset decision — give it weight.
- `environment: 'node'` is the default because most tests are pure `/lib` logic that never touches a DOM.
- `include`/`exclude` (`exclude` adds `node_modules`, `dist`, `.next`) scope what gets collected.

Stage 2 — path aliases. Add `vite-tsconfig-paths` to `plugins`. Explain the problem it solves: tests import `@/lib/...` exactly like app code; without this plugin Vitest can't resolve the alias because the alias lives in `tsconfig.json`, not in Vite. One sentence: the plugin reads `tsconfig` paths so test and app resolution match. Watch-out worth one line (confirmed current, April 2026): Vite 8's built-in `resolve.tsconfigPaths: true` does **not** resolve aliases under Vitest — the explicit `vite-tsconfig-paths` plugin is still the answer, so don't tell the student to drop it in favor of the Vite-native flag.

Stage 3 — the setup file. Add `setupFiles: ['./vitest.setup.ts']` and forward to the dedicated section below.

Component: present each stage as a `CodeVariant` tab ("Minimal" → "With aliases" → "With setup"), or as successive `Code` blocks with `ins=` highlights marking the added lines. Prefer the `ins=` successive-blocks approach so the student sees exactly what each stage adds. Reasoning: staged reveal is the cognitive-load mechanism the guidelines call for.

After the stages, show the assembled config once as a single `AnnotatedCode` walkthrough — every option re-touched with a one-line "why," reinforcing the senior anchor that no default is blindly accepted. Keep `maxLines` within the component's 18-line ceiling; the config is short.

`Term` candidates: **path alias** (the `@/` → `src/` mapping declared in `tsconfig`), **ambient global** (a name available without importing it).

### One config, many environments: test projects

The test-projects pattern — the lesson's signature concept and the reason Vitest was the pick. Teach the *why* before the *how*: the codebase has two test environments (plain Node for `/lib` and the seams; jsdom for components later), and one root config can define separate **projects**, each with its own `environment`, `setupFiles`, and `include` glob.

The three projects to define (matching the code-conventions contract):

- `unit` — `environment: 'node'`, `include: ['src/**/*.test.ts']` (the `/lib` and pure-logic surface).
- `integration` — `environment: 'node'`, real DB, files under `tests/integration/`. DB lifecycle is chapter 088 — name it, do not build it.
- `component` — `environment: 'jsdom'`, conditional, lands in chapter 089. Define the slot, leave it commented or stubbed.

Mechanics: `test.projects` is the current API (confirmed) — it replaced `workspace`/`workspaces` (deprecated since Vitest 3.2; the separate `vitest.workspace.ts` file is gone, projects live in the root config). `vitest --project unit` runs one slice; bare `vitest` runs all. Note the rename in a watch-out so a student who finds an older `workspaces`/`vitest.workspace.ts` tutorial isn't confused.

Component: pair a `FileTree` (showing `vitest.config.ts`, `src/lib/foo.test.ts`, `tests/integration/...`, a future `src/**/*.test.tsx`) beside the `projects` config block so the student maps each project to the files it claims. A `Code` block for the `projects` array is enough; if it grows past ~18 lines, use `AnnotatedCode` to step through the three project entries one at a time.

Reasoning: the file-to-project mapping is the thing students get wrong (they expect one flat glob); the FileTree makes the partition visible.

`Term` candidate: **jsdom** (an in-memory DOM implementation that lets Node run code expecting a browser).

### How the runner executes your tests

The one genuinely non-obvious mental model, and worth a diagram. The rules:

- Each **test file** runs in its own **worker** (`worker_threads` by default; `forks` is the fallback for code that misbehaves under threads — name it in one line, don't elaborate).
- **Files run in parallel** across workers; **tests within a single file run sequentially** by default.

The implications are the senior payload, teach these as consequences:

- File-level isolation is free — a module mock or env tweak in file A cannot leak into file B because they are different workers.
- Test-level isolation *inside* a file is the author's job — shared mutable state across `it` blocks in the same file is run-order-dependent and fragile. This is why the unit teaches "no shared state, no run-order dependency" from day one (depth on flake is chapter 088 L8 — forward-reference, don't pre-empt).

Diagram: a `Figure` wrapping a simple HTML/CSS illustration — three columns (Worker 1/2/3), each holding one file box, and inside each file box a vertical stack of test boxes labeled "runs in order." A small caption contrasts "files: parallel" with "tests in a file: sequential." Pedagogical goal: cement that parallelism is at the *file* boundary, which is what makes isolation free and shared state dangerous. This is a static conceptual illustration, not a system graph — exactly the "simple visual aid" the diagram guidance endorses; HTML+CSS is the right engine (color-coded boxes, devtools-inspectable). Do **not** over-build it into an animation; a single static figure carries the idea.

Optional `Sequence` exercise (ordering drill): give the student shuffled statements ("file B's worker starts", "file A's tests run top to bottom", "files A and B start together") to order — cheap reinforcement of the execution model. Include only if it doesn't bloat the lesson; the diagram is the priority.

### The setup file every test shares

`vitest.setup.ts` — what runs once before each test file, wired via `setupFiles`. Keep the baseline tight and justify each line:

- Load env for tests (`dotenv` for `.env.test`) so tests get test config, never production secrets.
- `process.env.TZ = 'UTC'` — pin the timezone so date-dependent tests match production behavior. Connect explicitly to chapter 083 lesson 1 (the student set production to UTC there); this is the same decision applied to the test runtime.
- One line: global cleanups (e.g. `afterEach(cleanup)`) get registered here *when jsdom arrives* (chapter 089) — not now.

The rule to install: **setup is for things every test needs.** Per-feature fixtures and factories do not go here — they live next to the code and are imported where used (factories are chapter 087 L2; forward-reference, don't teach). State the critical watch-out inline (it belongs to this concept, not a tips section): a `setupFiles` import that evaluates the Drizzle client at module load opens a DB connection on *every* test file — keep DB setup in the integration project's own setup, never the shared one. This is the most expensive beginner mistake in this file.

Component: a `Code` block for `vitest.setup.ts` is sufficient; it is short and every line is already annotated by surrounding prose.

`Term` candidate: **`setupFiles`** is self-explanatory in context; skip. Consider `Term` on **dotenv** if the student may not recall it.

### Running tests: `vitest` while you code, `vitest run` in CI

The operational reflex, and a real production-stakes watch-out. Two modes:

- `vitest` (no args) — **watch**. Re-runs dependent tests on save. The interactive keys worth naming: `p` filter by filename pattern, `t` filter by test name, `q` quit. Frame as the default local loop.
- `vitest run` — **single pass, then exit.** This is what CI runs.

The load-bearing rule, stated as the watch-out it is: **never run bare `vitest` in CI** — watch mode never exits, so the CI job hangs until it times out. CI always calls `vitest run`. One line: CI adds reporters (`--reporter=junit`) for GitHub Actions, wired in chapter 097 — name it, don't build it. One line: `vitest --ui` opens the dashboard for heavy local debugging (requires `@vitest/ui`).

Exercise: a `MultipleChoice` ("Which command does the CI test job run?") or a 3–4 statement `TrueFalse` round covering watch-vs-run and `globals: false`. This is the right place for a quick recall check because the watch-vs-run distinction is a concrete, high-consequence fact. Prefer `TrueFalse` (covers more ground: "`vitest` exits after one run" → false, "CI should call `vitest run`" → true, "`globals: false` means tests import from `'vitest'`" → true, "leaving watch mode on in CI is fine" → false).

### The small API surface every test imports

A brief reference section, *not* a tutorial — the point is to show how little the student needs to learn, reinforcing the "Jest-compatible, small surface" thesis. List the imports-from-`'vitest'` the whole course uses, grouped, with one-line each:

- Structure: `describe`, `it` (and `it.skip` / `it.only` for focus — one line, with the watch-out that `it.only` left in a commit is caught by an ESLint rule in chapter 097).
- Assertions: `expect` with the everyday matchers `toBe` / `toEqual` / `toContain` / `toThrow` / `toMatchObject`. One line: `expect` is typed — comparing mismatched types is a compile error, which catches bugs at authoring time.
- Lifecycle: `beforeEach` / `afterEach` / `beforeAll` / `afterAll`.
- Test doubles: `vi.fn()`, `vi.spyOn(obj, 'method')`, `vi.mock(specifier)` — named only, with one line that depth (hoisting behavior, `vi.hoisted`, fake timers) lives in chapters 087–088.

Component: a single `Code` block showing one tiny but complete example test (a 5-line AAA test of a pure function) with explicit `import { describe, it, expect } from 'vitest'` at the top — this doubles as proof of `globals: false` in action and previews the AAA shape that chapter 086 L4 formalizes. Keep the example trivial; the AAA *rule* is not this lesson's job.

Reasoning for keeping this section a reference and not a deep-dive: every concept here (matchers, mocking, lifecycle) is owned in depth by a later lesson per the TOC. Teaching them now would both bloat lesson 1 and steal those lessons' material. The value of listing them is the "see how small this is" payoff and giving the student the import they will type.

`Term` candidates: **test double** (a stand-in for a real dependency — mock/spy/stub), **matcher** (the `expect(...).toX()` assertion method).

### External resources (optional)

If a current, high-quality short video exists (e.g. an official Vitest "getting started" walkthrough, dated within the last year), embed one `VideoCallout` near the install or projects section as supplementary. Resourcer should verify it exists and is current; do not invent an ID. Add 1–2 `ExternalResource` cards: the official Vitest config reference and the test-projects guide. Per pedagogical structure these go at the end as optional links.

---

## Scope

Prerequisites the student already has (redefine in one line max, do not re-teach): ESM `import`/`export`; `tsconfig` path aliases (`@/` → `src/`); `pnpm` and `package.json` scripts; the project stack (React 19, Next.js 16, Drizzle, TS); production timezone pinned to UTC (chapter 083 L1). Assume all of these.

This lesson does **not** cover (cut from the over-scoped brainstorm; each is owned elsewhere):

- The honeycomb suite-shape rationale — chapter 086 L2.
- Coverage thresholds, branch-vs-line, `coverage.all`, exclusions, "100% as theatre" — chapter 086 L3. (This lesson only *installs* `@vitest/coverage-v8` and names the `test:coverage` script; zero coverage config.)
- The AAA single-test shape and behavior-over-implementation rule — chapter 086 L4. (This lesson shows one trivial AAA example as a syntax sample only.)
- Matcher selection by value shape, `describe` nesting discipline, the unhappy-path two-path rule — chapter 087.
- Factories and fixtures — chapter 087 L2 (this lesson only states the rule that fixtures do *not* belong in the shared setup file).
- Fake timers, `vi.useFakeTimers`, `vi.setSystemTime`, the clock/ids/random seams — chapter 087 L3.
- `expectTypeOf`, `assertType`, `*.test-d.ts`, `vitest --typecheck` — chapter 087 L4. (Name only if the student asks "what about types"; prefer to omit entirely to protect scope.)
- `await expect().resolves`, `expect.assertions(n)`, the forgotten-await trap, the Vitest 4 awaited-assertion change — chapter 087 L5. (Do not preview the v4 change here; it belongs with the async-assertion lesson.)
- `vi.mock` hoisting, `vi.hoisted`, `vi.importActual`, the TDZ-in-factory trap — chapters 087–088.
- `it.concurrent` / `describe.concurrent` mechanics — out of scope for this lesson; the default sequential-within-file model is all that is taught. (Name `it.concurrent` at most once as "opt-in, advanced," no rules.)
- Real test Postgres, `withRollback`, one-DB-per-worker, `VITEST_POOL_ID`, `globalSetup` — chapter 088. (This lesson names the `integration` project slot and stops.)
- MSW, mock-the-wire — chapter 088.
- React Testing Library, the `render` helper, the query ladder, jsdom config depth — chapter 089. (This lesson names the `component` project slot and the future `@testing-library/react` install only.)
- Playwright / E2E — chapter 090 (separate runner).
- CI wiring (GitHub Actions, JUnit reporter, PR coverage comment, merge gate) — chapter 097. (Name `vitest run --reporter=junit` once as the CI form; do not wire it.)

Estimated student time: 35–45 minutes (per the chapter outline). This is intentionally a lighter, foundational lesson.
