# Chapter 104 — Project plan: review a PR, write the ADR

## Design decision (resolved — read first)

This project's deliverable is **not application code**. It is two committed Markdown artifacts:

1. `reviews/chapter 104.md` — five line-anchored review comments in the four-part Conventional-Comments shape, a `## Summary` with severity totals, and a `Verdict:` line.
2. `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` — an ADR in the Nygard shape, plus its one-line entry appended to `docs/adr/README.md`.

The codebase is a **seeded audit target**: a small running SaaS app whose `feature/customer-plan-overview` change has already landed — a `/plan` overview surface carrying **five review-worthy defects plus one design decision worth an ADR**. The target is run **read-only**. The student never patches it; the proposed fix lives in each comment body, the recorded decision in the ADR.

**Mapping the chapter outline's git-branch + `degit` + `v1.0-answer-key` model onto this pipeline's `solution/` + `start/` split.** The pipeline boots `solution/` directly — it does not check out a git branch. So the "seeded PR" is **committed source in `solution/src/`**, not a diff on a branch: the audit target ships the change already merged (the nine diff files present, defects intact, building green). The branch / `degit` / answer-key-tag mechanics are described in the **README** as the real-course student workflow; in this repo the answer key is `solution/reviews/` + `solution/docs/adr/0007-*.md`.

- **The audit target** (the app with all five defects + the cache decision intact) is the *substrate*, **byte-identical** in `start/` and `solution/`. The scaffolding-coder builds it whole — including the defects — because no slice edits target code.
- **`solution/reviews/chapter 104.md` + `solution/docs/adr/0007-*.md`** = the answer key (the `v1.0-answer-key` content).
- **`start/reviews/chapter 104.md` + `start/docs/adr/0007-*.md`** = the scaffold the student gets: the pass-order header stub and the empty Nygard scaffold, each with a `TODO(L<n>)` marker.
- **Each slice authors one answer-key artifact** (Markdown) on top of the scaffolded target. The slice "codes" prose, not TS. The defect/decision it documents already exists in the target.
- **`start/` derivation** strips the artifact bodies back to scaffolds (the inverse of a normal start derivation: here the "student work" is the Markdown, and the slices produce the answer key).

Consequence threaded through the plan: **artifact correctness is verified by static checks** (grep for the four comment parts, the five `blocking:` labels, the four ADR `##` sections, the no-hedging Decision, the enumerated `updateTag` seams) — Markdown does not render in a browser. **Rendered checks verify only that the audit target boots and the `/plan` surface paints** (so the student can open the change in a running app and the L1 figure can be captured). Every other fingerprint of every finding is **source shape**, checked by grep, never by render.

**Why a 073 fork, not 082/085.** The dependency map lists 073 + 082 + 085, but the audit target's only jobs are (a) build green, (b) render `/plan` with **no login and no external services** so the inspector/screenshotter can reach it, and (c) host the nine diff files + the five canonical helpers at the exact paths the review cites, so the finding greps hit. **073** is the only base that renders protected routes with **no auth wall** (its cookie dev-identity `getSession()` never redirects) and **no Docker/Postgres** (in-memory store), and it already ships the **entire cache layer** the ADR is about (`'use cache'`, `cacheTag`, `cacheLife`, `updateTag`, `revalidateTag`, `lib/cache/tags.ts`) plus `authedAction`. Forking 082 (real Better Auth → `/plan` redirects to `/sign-in` at render; Docker Postgres; Stripe/Resend/Upstash env) would bury a two-Markdown-file project under a backend the student never touches. So: **fork 073**, then graft the four small seams the diff references that 073 lacks — `lib/temporal.ts` (from 085), an in-memory `lib/audit-log.ts` (`logAudit(tx, event)`), a thin `lib/tenant-db.ts` facade, and a `getPlanEntitlement` read — then plant the nine-file change. None of the grafted helpers is executed by a test; they exist so the change references real seams and the greps are falsifiable.

## Project goals

The project cements Unit 21 by running the two disciplines the unit installed — the five-layer review stack with the principle-and-pattern map (chapter 103) and the Nygard ADR template with the three-test inclusion check (lesson 4 of chapter 101) — against a seeded PR, end-to-end. The student practices the load-bearing senior review skills, none of which is keystrokes: (1) **read a diff top-down on the review stack, not top-down on the file** — the pass-order header is committed in writing before the diff is opened, and findings are surfaced correctness/security → principles → patterns → tests/contracts → style; (2) **write a review comment in the four-part anatomy** — severity label, observation in code terms, the principle/pattern it violates *with its lesson ID*, and a one-sentence proposed action — where naming the rule is the load-bearing part that makes the comment portable to the author; (3) **draw the blocking-vs-suggesting cut** — all five seeded findings are `blocking:` because each violates an established rule with security, correctness, or contract consequences, and the bonus `suggestion:`/`nit:`/`praise:` findings are kept honestly labeled so `blocking:` stays trustworthy; (4) **address the code, not the author** — every comment is phrased so the receiving author reads it without defensiveness; (5) **run the three-test inclusion check** to decide what earns an ADR (architectural reach + reasonable alternative + costly to reverse), reject the candidates that don't, and write the one that does with a crisp unhedged Decision and an honest Consequences list that enumerates every mutation seam that must call `updateTag`. The skill being assimilated is the disciplined PR-review muscle of a senior: the diff is the textbook, the five comments + the ADR are the exam, and the discipline is naming the rule, severing the severity, and recording the one decision that outlives the PR.

The point is not to write code; it is to walk a realistic review workflow and cement the two chapters' rules by applying them. The target is deliberately the smallest surface that lands one finding per review-stack layer plus one ADR-worthy decision — five comments, one ADR — so the student completes the pass quickly and the structural lesson ("name the rule, sever the severity, propose the action, record the one decision") lands without app-feature noise.

## Student position

The student has finished Units 1–20 plus all three Unit 21 teaching chapters (101 docs, 102 docs-in-code, 103 review) — the chapters this project *consumes*. They know, and the review reads against, the full lineage: TypeScript 6 strict, React 19 (Server/Client Components, the derive-don't-sync rule against `useEffect`-driven derived state from chapter 025), Next.js 16 App Router (`cacheComponents`, `'use cache'` + `cacheTag` + `cacheLife`, `updateTag` for read-your-writes in Server Actions, `revalidateTag(tag, profile)` for webhooks/jobs with the **mandatory** second profile arg, `proxy.ts`), Tailwind v4 + shadcn/ui, Postgres + Drizzle (`tenantDb`, transactions), Zod 4, the `Result<T>` + seven-code `ErrorCode` union, Better Auth + the organization plugin (`authedAction(role, schema, fn)` SaaS pattern #2, `roleAtLeast`, RBAC roles), `logAudit(tx, event)` + the canonical `entity.verb-pasttense` audit-event set, the Stripe webhook + `plan_entitlements`, `Temporal` over `Date` for user-visible time math (chapter 083), and — the Unit 21 carry-in this project *is* — the **review disciplines**: the five-layer review stack and the principle-and-pattern map with diff signatures and lesson IDs (lesson 1 of chapter 103), the four-part comment anatomy and the five severity labels as a Conventional Comments subset (lesson 2 of chapter 103), the blocking-vs-suggesting cut and the address-the-code-not-the-author reflex (lesson 2 of chapter 103), the PR-size threshold of ~400 LOC (lesson 1 of chapter 103), the doc-ships-with-the-PR rule and the five-check reviewer pass over the seven-surface doc-change map (lesson 3 of chapter 102), and the Nygard ADR template (Title/Status/Context/Decision/Consequences, three load-bearing sections), the one-decision-per-file rule, the supersede-in-place lifecycle, the `/docs/adr/README.md` index discipline, and the three-test inclusion check (lesson 4 of chapter 101).

**Not yet known — coder agents must NOT introduce these into the artifacts or the target:**
- **The Vercel AI SDK, AI Gateway, tool calling, RAG, token quotas.** Unit 22 (chapters 105–108). The review is non-AI; do not reference AI features.
- **The chapter-104 review is the first hands-on PR review.** The student has *read about* the review stack and comment anatomy but has not yet *written* a real review or authored an ADR from a diff — that is exactly what this project trains. Slices model the cadence; they must not assume prior review-writing fluency.
- **The seeded change ships green and is read-only.** No artifact ships a fix as a diff. A structural snippet in a comment's Action line is allowed (and is in the reference comments); a pushed commit is not. The target source is never modified.
- **The conventional-comments full spec.** The course's five labels are a deliberate trimmed subset where `blocking:` is promoted to a top-level label (in the full spec it is a decoration). Do not "correct" `blocking:` back to `suggestion (blocking):`.
- **Self-grading mechanics beyond the honor-system note.** The `v1.0-answer-key` checkout dance is the student's manual workflow; the answer key is `solution/reviews/` + `solution/docs/adr/`. Slices author the answer key, not the grading ritual.

## Scaffolding recipe

Build a single `solution/` that contains (a) the **seeded audit target** — a healthy fork of the 073 lineage with the nine-file `/plan` change planted (five defects + one cache decision) — and (b) the **filled answer-key artifacts**. The target must boot with **no login and no external services**, serve `/plan` and the carried-in `/invoices` surface, and exhibit the change; `pnpm verify` must pass **with the defects in place** (every defect compiles, type-checks, and renders — an audit reads a *running* target, so the bugs ship green). The answer-key Markdown is authored by the slice-coders, not here — scaffold only the **artifact scaffolds** (the review header stub + the empty ADR Nygard scaffold + the ADR index), exactly as `start/` will carry them; the slices overwrite the bodies with the answer key.

This recipe is the only section the scaffolding-coder reads. Build everything below now; leave only the two answer-key artifact bodies as scaffolds for the slice-coders.

### Fork and graft

1. **Fork the 073 `solution/`** (`projects/Chapter 073/solution/`) wholesale via `rsync` (exclude `node_modules`, `.next`). It carries the in-memory store + cookie dev-identity (`getSession()`, never redirects), `authedAction`, the full cache layer (`lib/cache/tags.ts`, `lib/cache/profiles.ts`, `'use cache'` reads in `lib/invoices/queries.ts`, `updateTag`/`revalidateTag` in `lib/invoices/actions.ts`, the summary-recompute job), the `/invoices` + `/inspector` surfaces, the UI primitives, and the toolchain pinned. Rename the package to `chapter-104-pr-review`.
2. **Graft `lib/temporal.ts`** from `projects/Chapter 085/solution/src/lib/temporal.ts` verbatim, and add `temporal-polyfill@^0.3.0` to dependencies. This is the primitive finding 3's fix names; the seeded `renewal-countdown.ts` deliberately does **not** use it.
3. **Add an in-memory `src/lib/audit-log.ts`** exporting `logAudit(tx, event)` where `event` is `{ action: string; subjectType?: string; subjectId?: string; payload?: Record<string, unknown> }`; it pushes an `AuditLog` row to the store (reuse the 073 store's `auditLogs` array + `pushAudit`, or add them if absent). The `tx` parameter is the in-memory store handle (a typed alias). This is the canonical audit seam finding 5 cites as missing on the plan-label mutation; existing lifecycle actions in `lib/invoices/actions.ts` may stay as-is (they use the cache log, not `logAudit` — that is fine, the review only audits the plan change).
4. **Add a thin `src/lib/tenant-db.ts`** exporting `tenantDb(orgId)` returning an org-scoped facade over the store (a minimal `{ update, query }` shape sufficient for `updatePlanLabel`'s healthy alternative to compile in the reference; the seeded action bypasses it). This is SaaS pattern #1, named in finding 1's observation as a dropped guarantee.

### The seeded change — the nine diff files (planted, NOT stubbed — they ship working-but-wrong)

Plant these as real, compiling, rendering code so the review reads against a live target. Co-locate the plan feature under `src/lib/plan/` + `src/app/(app)/plan/` per Principle #1 (this co-location is itself the `praise:` bonus). The five defects are deviations from the healthy 073 lineage and its grafted seams.

1. **`src/app/(app)/plan/page.tsx`** — the new Server Component surface. Reads `getPlanEntitlement(orgId)` and renders the entitlement, the seat counter (`<SeatUsage />`), and the renewal-countdown block (which carries `data-testid="renewal-countdown"`). **Seeded defect 2 (side-effect import, Principle #6):** the file's **first import** is a bare `import '@/lib/analytics/page-view-tracker'` whose module top-level body fires a network call at server render time. `data-testid="plan-page"` on the page root; the page resolves to **one** root element (single-slot invariant). Ships a sibling `loading.tsx` (Cache Components Suspense seam, since the page reads request-time data).
2. **`src/app/(app)/plan/seat-usage.tsx`** — `'use client'` seat counter. **Seeded defect 4 (derived state synced with an effect, Principle #7 / derive-don't-sync ch025):** holds `seatsRemaining` in `useState` and updates it from props `seatsAllocated`/`seatsUsed` via `useEffect`. Also carries the bonus `nit:` target: a handler poorly named `handlePlanThing`. `data-testid="seat-usage"`.
3. **`src/app/(app)/plan/actions.ts`** — the plan-label mutation `updatePlanLabel`. **Seeded defect 1 (missing `authedAction`, SaaS pattern #2 / Principle #5):** `'use server'` directive followed by a hand-rolled `const session = await getSession()` + `if (!session) throw`, no role check, no `tenantDb` scope, no rate limit, then a direct store update of `organizations.planLabel`. **Seeded defect 5 (missing audit-log write, audit-log catalog):** the label update runs with **no** `logAudit(tx, ...)` call, so the change is silent to the compliance trail. (The mutation must compile and run against the in-memory store; it builds green and behaves wrong.)
4. **`src/lib/plan/get-plan-entitlement.ts`** — `getPlanEntitlement(orgId)`: the cached read and the **ADR target**. Carries `'use cache'` + `cacheTag(orgPlanEntitlementTag(orgId))` + `cacheLife('minutes')`. Reads a plan-entitlement shape from the store. **Bonus `suggestion:` target:** no TSDoc on this exported cross-module read.
5. **`src/lib/plan/renewal-countdown.ts`** — `renewalCountdownDays(renewsAt)`. **Seeded defect 3 (`Date` arithmetic, SaaS pattern #13):** computes `new Date(renewsAt).getTime() - Date.now()` then divides by `1000 * 60 * 60 * 24`. Breaks at DST boundaries, ignores the user timezone. (`lib/temporal.ts` exists in the repo but this file deliberately does not import it.)
6. **`src/lib/analytics/page-view-tracker.ts`** — the tracker module whose **top-level body fires a network call** (e.g. a top-level `fetch('/api/track', ...)` or `void track()` at module scope, swallowed). This is what makes defect 2's bare import a side effect. Must compile; the call may fail at runtime harmlessly (no real endpoint needed — render does not depend on it succeeding).
7. **`src/lib/plan/schemas.ts`** — the Zod schema `updatePlanLabelSchema` for the mutation input (`{ planLabel: string }`). Healthy; named in finding 1's Action line as the schema the wrapper would take.
8. **`src/server/store.ts` (edited)** — add the plan-entitlement shape + an `organizations` record carrying `planLabel`, seeded so `/plan` renders deterministically (entitlement plan, seats allocated/used, `renewsAt`). Keep all existing 073 store exports.
9. **The cache-tag helper** — add `orgPlanEntitlementTag(orgId)` returning `org:{orgId}:plan-entitlement` to `src/lib/cache/tags.ts` (alongside the existing `invoiceTags`). This is the tag the ADR's Decision and Consequences name.

Plus, so the ADR's "existing `'use cache'` patterns" calibration read is real: the 073 `lib/invoices/queries.ts` already carries `'use cache'` reads — that is the existing pattern the new `getPlanEntitlement` mirrors. No new billing module is needed.

### The deliverable scaffolds (the artifacts the slices fill)

At the repo root (NOT under `src/`):

- `reviews/template.md` — **provided in full** (the four-part comment scaffold, verbatim from the chapter outline):
  ```
  **[severity]:** `path/to/file.ts` L[line] — one-line observation.
  Principle/pattern: #N from Chapter X.Y.Z.
  Action: one sentence proposing the fix or asking the question.
  ```
  Never a scaffold — it is the contract.
- `reviews/chapter 104.md` — **scaffold**: ships only the pass-order header line and a one-line `TODO(L2)` marker for the body. Header content: `Pass order: correctness/security → principles → patterns → tests/contracts → style` plus a blank "Started at:" note line. The slices append the five comment blocks, the `## Summary`, and the `Verdict:` line. Marker: `<!-- TODO(L2) — write comment 1 (auth bypass) under the pass-order header; comments 2-5 + Summary + Verdict in L3 -->`.
- `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` — **scaffold**: the empty Nygard scaffold (the literal four `##` sections with placeholder bodies) under the H1 title, plus a `TODO(L4)` marker. Body:
  ```
  # ADR 0007 — Cache entitlement reads with cacheTag

  ## Status

  ## Context

  ## Decision

  ## Consequences

  <!-- TODO(L4) — fill Status (Accepted + date), Context (read pattern + rejected alternative), Decision (one unhedged sentence naming cacheTag + updateTag), Consequences (enumerate every updateTag seam + revalidateTag job path + reversal cost); add the 0007 row to docs/adr/README.md -->
  ```
- `docs/adr/README.md` — **provided with the 0001–0006 index rows** (the six course-stack ADRs from lesson 4 of chapter 101: Drizzle, Better Auth, Biome, R2, Node runtime, native forms), each one line `NNNN — <title> — Accepted — <date>`. The **0007 row is absent** (the student appends it in S3). The six prior ADR files themselves are **not** needed as separate files — only the README index rows (the review never opens them). Optionally ship `docs/adr/0001-use-drizzle-not-prisma.md` as a one-screen specimen for context; not required.
- `AGENTS.md` — carried/adapted from the lineage; one line referencing the principle/pattern map and the `reviews/` + `docs/adr/` artifacts.

### README

A `README.md` at the solution root documents: the setup ladder (`pnpm install`, `pnpm dev`, app on `:3000`, `/plan` is the surface under review), the real-course workflow described as narrative (clone via `degit`, `git checkout feature/customer-plan-overview`, the `v1.0-answer-key` honor-system rule — *in this repo the change is already merged and the answer key is `reviews/` + `docs/adr/0007-*.md`*), a pointer to `reviews/template.md` and the principle-and-pattern map, and the pass-order reflex (review top-down on the stack, not on the file). No environment variables (the target needs none).

### Scripts and lesson test runner

Keep all 073 scripts. `package.json` defines `"verify": "biome ci . && tsc --noEmit && next build"` (the locked string; do not add `next typegen` — the locked tsconfig `include` carries both `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`, and runtime hrefs are cast `as Route`).

Ship the **Vitest** lesson-test runner so the lesson-test-coder need not bootstrap it:
- `vitest@^4.1.8` in `devDependencies` (carried from 073).
- `"test:lesson": "node scripts/test-lesson.mjs"` in scripts.
- `scripts/test-lesson.mjs` — the node wrapper that reads the lesson number from `process.argv[2]` and runs **exactly one** file by absolute path: `pnpm exec vitest run "<solutionRoot>/lesson-verification/Lesson <n>.ts"`. **The path is `lesson-verification/Lesson <n>.ts`** (the current convention the `project-lesson-test-coder` writes to — NOT the older `tests/lessons/Lesson <n>.test.ts`). Confirm it narrows to one file (a bare `vitest run` glob OR-matches every `Lesson *.ts`; the explicit absolute path narrows). Exact body:
  ```js
  import { spawnSync } from 'node:child_process';
  import { resolve } from 'node:path';

  const lesson = process.argv[2];
  if (!lesson) {
    console.error('Usage: pnpm test:lesson <lesson-number>');
    process.exit(1);
  }
  const testFile = resolve('lesson-verification', `Lesson ${lesson}.ts`);
  const result = spawnSync('pnpm', ['exec', 'vitest', 'run', testFile], {
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
  ```
- `vitest.config.ts` — carried verbatim from 073: node env, no DOM, `include: ['lesson-verification/**/*.ts']`, and `@/`-alias resolution via the `vite-tsconfig-paths` plugin (`plugins: [tsconfigPaths()]`, the devDep below). (Vitest 4 emits an advisory recommending the native `resolve: { tsconfigPaths: true }` in its place; the plugin still works, so keep the 073 form — do not also set the native option, pick one.) The runner must work in `start/` with no extra config.
- Do **not** create `lesson-verification/` test files here — the `project-lesson-test-coder` fills `lesson-verification/Lesson 2.ts` … `Lesson 4.ts` later. Each gate inlines its own helpers; no shared helpers module. Tests are node-env (no DOM): they observe SSR/first-paint output and **source shape** of the deliverable Markdown, not interaction.
- **tsconfig:** exclude `lesson-verification` from the `tsconfig.json` `include` (or add it to `exclude`) so a forward-referencing lesson test never fails `start/`'s `tsc --noEmit` (the test files reference the student's not-yet-written Markdown by reading files, but keep them out of the typecheck either way — they are run by vitest, not built).
- **One runner, not three.** The chapter outline names per-lesson checkers `pnpm test:review` (L2/L3) and `pnpm test:adr` (L4); there is **no** separate `test:review`/`test:adr` script. They are all `pnpm test:lesson <n>` against `lesson-verification/Lesson <n>.ts` (L2 = comment 1 + header shape, L3 = five comments + Summary + Verdict shape, L4 = the four ADR `##` sections + the Decision-no-hedging rule per the ADR normalization in Locked decisions). Lesson writers should reference `pnpm test:lesson 2|3|4`, mapping the outline's `test:review`/`test:adr` names onto it.

### Dependencies

073's set, carried at pinned versions, plus `temporal-polyfill@^0.3.0`: `next@16.2.7`, `react`/`react-dom@19.2.4`, `nuqs@^2.8.9`, `next-themes@^0.4.6`, `zod@^4.4.3`, `radix-ui@^1.4.3`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `lucide-react@^1.17.0` (no brand icons), `sonner@^2.0.7`, `tw-animate-css@^1.4.0`, `uuidv7@^1.0.2`, `temporal-polyfill@^0.3.0`. Dev: `@biomejs/biome@2.4.16`, `tailwindcss@^4.3.0`, `@tailwindcss/postcss@^4.3.0`, `typescript@^6.0.3`, `vitest@^4.1.8`, `vite-tsconfig-paths@^5.1.4`, `babel-plugin-react-compiler@1.0.0`, `@types/node@^25.9.1`, `@types/react@^19.2.16`, `@types/react-dom@^19.2.3`.

### Scaffold acceptance

After scaffolding, `pnpm verify` passes in `solution/` **with all five defects + the cache decision in place** (they compile, type-check, and build green — that is the premise). `pnpm dev` renders `/plan` (no login) showing the entitlement, the seat counter, and the renewal countdown, with `data-testid="plan-page"`, `data-testid="seat-usage"` present and `/plan` resolving to one root element. `reviews/` holds `template.md` (full) + `chapter 104.md` (header + TODO). `docs/adr/` holds `0007-*.md` (Nygard scaffold + TODO) + `README.md` (0001–0006, no 0007 row). `pnpm test:lesson 2` runs only `lesson-verification/Lesson 2.ts` (errors cleanly "no test file" until the test-coder writes it — that is expected; confirm the runner resolves one path, not a glob).

## Slices

Each slice authors **one answer-key artifact** (Markdown) by overwriting the matching scaffold body, against the chapter outline's per-lesson "Your mission" brief, the `reviews/template.md` shape, and the Nygard scaffold. The slice **does not modify target code** — the seeded change already exists; the slice documents it. Slices run in order; S1 is the reference comment that sets the cadence every later comment reuses.

The canonical reference content (the exact comment blocks and ADR body the answer key reproduces) is in the chapter outline's "Reference-solution signatures" and per-lesson `<details>` blocks — slices reproduce that content faithfully, adapting file paths/line ranges to the actual planted source.

### Slice S1 — Comment 1: the auth bypass (the reference comment)

Scope: **Lesson 2.** Author the pass-order header confirmation + **comment 1** in `reviews/chapter 104.md` — the worked reference that models the review cadence and the four-part template shape.

In scope:
- Keep the **pass-order header** (`Pass order: correctness/security → principles → patterns → tests/contracts → style`) and fill the "Started at:" note (one line naming where the student starts — correctness/security, the top of the stack).
- **Comment 1**, pinned to `src/app/(app)/plan/actions.ts` and the line range of the hand-rolled `getSession()`/`auth()` call in `updatePlanLabel`, in the four-part template:
  - **Severity:** `blocking:` — justified by the security-and-correctness consequence, not preference.
  - **Observation:** names the bypass in code terms and names **all three** dropped guarantees — the role check, the `tenantDb` tenant scope, and the rate limit. Address the code, not the author (`updatePlanLabel` hand-rolls `auth()`, not "you hand-rolled").
  - **Principle/pattern:** SaaS pattern #2 (lesson 2 of chapter 057 — `authedAction(role, schema, fn)`) and Principle #5 (chapter 029 / chapter 042), with the lesson ID.
  - **Action:** one sentence — wrap in `authedAction('admin', updatePlanLabelSchema, async (input, ctx) => { ... })`.
- Remove the `TODO(L2)` marker for comment 1 (the L3 work — comments 2-5, Summary, Verdict — may stay as a trailing `TODO(L3)` note, or be added by S2).

Out of scope: comments 2-5, the Summary, the Verdict (S2); the ADR (S3); patching the target.

Contracts: `reviews/chapter 104.md` carries the pass-order header + comment 1 in the four-part template; the review cadence established for S2.

Screenshot:
- L1 (`/plan`, desktop 1280×900, state settled): the plan overview surface under review — the entitlement, the seat counter, and the renewal countdown — so the L1 Project Overview lesson can show what the surface being reviewed looks like in the running app. `data-testid="plan-page"`. (Owned by S1: the first slice; the `/plan` surface is built whole by the scaffolder before any slice runs, and S1 owns the target-boots render checkpoint.)

### Slice S2 — Comments 2-5, the Summary, and the Verdict

Scope: **Lesson 3.** Append **comments 2 through 5**, the `## Summary`, and the closing `Verdict:` line to `reviews/chapter 104.md`, completing the review file.

In scope (each comment in the four-part template, address-the-code voice, `blocking:`):
- **Comment 2** — `src/app/(app)/plan/page.tsx` L1: bare `import '@/lib/analytics/page-view-tracker'` fires a network call at server render time; the side effect is invisible at the call site. Principle #6 explicit-over-magic (chapter 029). Action: move the tracker to a named `trackPlanPageView()` call in an event handler in a Client Component, or remove if PostHog auto-capture covers the page view.
- **Comment 3** — `src/lib/plan/renewal-countdown.ts`: `new Date(...).getTime() - Date.now()` divided by `1000*60*60*24` returns the wrong day count across a DST boundary and ignores the user's profile timezone. SaaS pattern #13 time/dates/timezones (chapter 083). Action names **both** fixes: switch to `Temporal.PlainDate.from(...).until(today, { largestUnit: 'days' })` **and** read the timezone from the user profile.
- **Comment 4** — `src/app/(app)/plan/seat-usage.tsx`: `seatsRemaining` held in `useState` and synced from `seatsAllocated`/`seatsUsed` via `useEffect`; the two can disagree for one frame. Principle #7 impossible-states-unrepresentable / derive-don't-sync (chapter 025). Action **deletes** the state and the effect; compute `seatsRemaining = seatsAllocated - seatsUsed` inline (not "memo it").
- **Comment 5** — `src/app/(app)/plan/actions.ts`: the `planLabel` update runs with no `logAudit` call; the compliance trail is silent on a security-relevant mutation. Canonical audit-log event catalog (lesson 5 of chapter 057 / lesson 3 of chapter 081). Action: add `logAudit(tx, { action: 'organization.plan-label-changed', ... })` **inside the transaction**, naming the `organization.plan-label-changed` slug and the payload shape.
- **`## Summary`:** severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the PR-size note (~220 LOC, under the 400 threshold from lesson 1 of chapter 103 — no structural "split this" comment), and a one-line pass-order recap.
- **`Verdict: request changes`** naming the five blocking issues (e.g. "request changes — five blocking issues, see comments 1–5").
- Bonus comments (`suggestion:` TSDoc on `getPlanEntitlement`, `nit:` rename `handlePlanThing`, `praise:` the `src/lib/plan/` co-location) are **optional extra credit** — may be included after the verdict or in a clearly-marked bonus block; never required, never promoted to `blocking:`.

Out of scope: the ADR (S3); patching the target; inflating bonus findings to blockers.

Contracts: `reviews/chapter 104.md` complete — five `blocking:` comments + `## Summary` + `Verdict:` — ready to commit.

Screenshot: none (the deliverable is Markdown; the `/plan` surface figure was captured in S1).

### Slice S3 — ADR 0007 and the index entry

Scope: **Lesson 4.** Author `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (the four Nygard `##` sections filled) and append the 0007 row to `docs/adr/README.md`.

In scope:
- Apply the **three-test inclusion check** implicitly: only the caching decision earns the ADR (architectural reach across every plan-touching surface + reasonable alternative of per-request reads or `revalidatePath` + costly-to-reverse sweep of `updateTag` seams); the `planLabel` column add and the `lib/plan/` co-location are rejected (no real alternative / convention application). The check's reasoning lives in the lesson prose; the ADR file records the selected decision.
- **`## Status`:** `Accepted — <date>`.
- **`## Context`:** one to two paragraphs naming the entitlement read's access pattern and scale, the surfaces that need fresh reads vs the ones that tolerate staleness, and the **rejected alternative** (per-request reads with no cache; `revalidatePath` ties invalidation to routes not data) with the reason it was rejected.
- **`## Decision`:** a single declarative sentence, **no hedging** ("we will cache `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` and `cacheLife('minutes')`, and invalidate via `updateTag(orgPlanEntitlementTag(orgId))` from every mutation seam that touches plan or entitlement state").
- **`## Consequences`:** 3–7 bullets, honest mix of upsides and costs — **enumerate every mutation seam** that must now own an `updateTag` call (the plan-label action plus every plan/entitlement mutation the codebase has or will have), name the `revalidateTag(tag, 'max')` background-job path with its lesson reference (chapter 032) and the **mandatory second profile argument**, state the staleness window bounded by the `'minutes'` profile, name the failure mode (a mutation that forgets `updateTag` leaves the entitlement stale), and state the reversal cost honestly (one PR to delete the annotation + the `updateTag` calls).
- Append the index row to `docs/adr/README.md`: `0007 — Cache entitlement reads with cacheTag — Accepted — <date>`.
- Remove the `TODO(L4)` marker.

Out of scope: choosing a different cache-key strategy or re-litigating the caching decision (the ADR records the decision the change made); patching the target.

Contracts: `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` populated with all four `##` sections and an unhedged Decision; `docs/adr/README.md` carries the 0007 row. The answer key is complete (review + ADR).

Screenshot: none (Markdown deliverable).

## Start derivation

Derive `start/` from the completed `solution/` by reverting **only** the two answer-key artifact bodies to scaffolds; **every other file is byte-identical** (the entire seeded audit target — all five defects + the cache decision intact — config, store, the `/plan` + `/invoices` + `/inspector` surfaces, `lib/*`, the grafted seams, the lesson-test runner, `reviews/template.md`, `docs/adr/README.md` rows 0001–0006, README/AGENTS — is unchanged between `start/` and `solution/`). This is the inverse of a normal start derivation: the audit target is read-only, so it never stubs; the "student work" is the two Markdown artifacts.

Revert these to scaffolds (each body emptied to its scaffold shape + a `TODO(L<n>)` marker so `rg TODO start/` enumerates the work):

- `reviews/chapter 104.md` (L2/L3) — revert to: the pass-order header line + a blank "Started at:" line + `<!-- TODO(L2) — write comment 1 (auth bypass) under the pass-order header; comments 2-5 + Summary + Verdict in L3 -->`. Strip all five comment blocks, the Summary, and the Verdict.
- `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (L4) — revert to: the H1 title + the four empty `##` sections (Status/Context/Decision/Consequences) + `<!-- TODO(L4) — fill Status (Accepted + date), Context (read pattern + rejected alternative), Decision (one unhedged sentence naming cacheTag + updateTag), Consequences (enumerate every updateTag seam + revalidateTag job path + reversal cost); add the 0007 row to docs/adr/README.md -->`. Strip the filled bodies.
- `docs/adr/README.md` (L4) — **remove the 0007 row** added by S3 (rows 0001–0006 stay; the student appends 0007). Add a `<!-- TODO(L4) — append the 0007 index row when the ADR lands -->` comment at the end of the index.

Provided-and-identical in `start/` (never reverted): `reviews/template.md` (the contract), `docs/adr/README.md` rows 0001–0006, and the **entire seeded audit target** with all five defects + the cache decision in place. The student's job in `start/` is to *review and document*, not to fix.

## Locked decisions

- **The deliverable is two Markdown artifacts; the audit target is read-only.** No slice modifies target code. No artifact ships a fix as a diff — a structural snippet in a comment's Action line is allowed (it is in the reference comments), never a patch. The target runs unchanged at the end of every lesson; only `reviews/chapter 104.md` and `docs/adr/0007-*.md` (+ the `docs/adr/README.md` 0007 row) grow. (Chapter framing.)
- **The seeded change ships green.** All five defects + the cache decision compile, type-check, and build (`pnpm verify` passes) and `/plan` renders — a review reads a *running* target, so the change must be live, not stubbed. The defects are deviations from the healthy 073 lineage + the grafted seams (`authedAction`, `logAudit`, `tenantDb`, `lib/temporal.ts`, the cache layer), planted at real call sites referencing the real seams.
- **The seeded PR is committed source in `solution/src/`, not a git branch.** The pipeline boots `solution/` directly. The `feature/customer-plan-overview` branch / `degit` / `v1.0-answer-key` mechanics are README narrative (the real-course workflow), never a pipeline step. The change is already merged in this repo; the answer key is `solution/reviews/` + `solution/docs/adr/0007-*.md`.
- **Deliverables live at the repo root**, not under `src/`: `reviews/` (`template.md` provided in both trees; `chapter 104.md` scaffold in `start/`, filled in `solution/`) and `docs/adr/` (`0007-*.md` scaffold in `start/`, filled in `solution/`; `README.md` rows 0001–0006 in both, 0007 row only in `solution/`).
- **Review-comment contract** (every comment, enforced by static checks + lesson gates): each of the five comments carries all four parts — a **severity label** (`blocking:` for all five), an **observation** in code terms pinned to a `path L[line]` reference, a **`Principle/pattern:` line** naming the rule + lesson ID, and an **`Action:` line** with one proposed fix. Comment 1 names all three dropped guarantees (role, tenant, rate limit). Comment 3's Action names both fixes (Temporal + profile timezone). Comment 4's Action deletes the state and effect (not "memo it"). Comment 5's `logAudit` sits inside the transaction and names the `organization.plan-label-changed` slug. Every comment is in the address-the-code-not-the-author voice. The `## Summary` records `5 blocking` + the ~220-LOC/400-threshold note; the `Verdict:` reads `request changes`.
- **ADR section normalization** (resolving the outline-aligner's note — "three Nygard sections" vs "all four"): the taught template (lesson 4 of chapter 101) is the **five-section** Nygard shape (Title / Status / Context / Decision / Consequences) with **three load-bearing** sections (Context / Decision / Consequences). In the file, **Title is the `#` H1; the four `##` sections are Status, Context, Decision, Consequences.** The ADR checker (`pnpm test:adr` / the lesson gate) requires **all four `##` sections present and non-empty** and the **Decision section free of hedging tokens** (`we should`, `we're considering`, `maybe`, `we could`). "All four" = the four `##` headings; "three load-bearing" = Context/Decision/Consequences. Slices and the checker use this normalization.
- **ADR filename + index discipline:** the file is `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` — a **noun phrase** of the decision (not a verb phrase like `add-use-cache-...`), zero-padded, numbered after 0006. The `docs/adr/README.md` index row is appended in the same slice (S3) the ADR lands.
- **Canonical content the artifacts must use** (from the continuity notes + the verified Next.js 16 surface, overriding any chapter-outline drift): the five severity labels are exactly `blocking:` / `suggestion:` / `question:` / `nit:` / `praise:` (lowercase, trailing colon); `blocking:` is a top-level label (the course's deliberate promotion — do not "correct" to `suggestion (blocking):`). The audit event is `organization.plan-label-changed` (`entity.verb-pasttense`, single dot). The cache tag is `org:{orgId}:plan-entitlement` via `orgPlanEntitlementTag(orgId)`. Invalidation: `updateTag(...)` for read-your-writes from a Server Action; `revalidateTag(tag, 'max')` for webhooks/background jobs — **the second `cacheLife` profile argument is mandatory in Next.js 16; the single-argument `revalidateTag(tag)` form is deprecated and a TypeScript error** (verified June 2026). `cacheLife`/`cacheTag` are stable (no `unstable_` prefix). The fix for finding 1 maps to `authedAction('admin', updatePlanLabelSchema, fn)`; finding 4's fix is inline computation + deletion (never `useMemo`).
- **Structural single-slot / single-element invariants** (carried from the 073 lineage; the target must not render-break):
  - The app shell that wraps `/plan` — the **root `app/layout.tsx`** (the 073 `(app)` route group is layout-less and inherits the root layout; do **not** add an `(app)/layout.tsx`) — resolves to one `<nav>` + one `<main>{children}</main>`, never a bare sibling fragment dropped into a flex/grid parent (the ch035 fragment-flatten footgun).
  - `/plan` resolves to **one** root element under `data-testid="plan-page"` — the page must not return a top-level fragment that flattens into the layout's content slot.
- **Stable selectors via `data-testid`.** Rendered checks read `data-testid`, never positional/text selectors. Canonical ids for the surfaces the checks touch: `plan-page` (the `/plan` root), `seat-usage` (the seat counter), and `renewal-countdown` (the renewal-countdown block — so the r-target-boots assertion has a stable selector for the third rendered region, not unselectorable prose). The 073 carry-in selectors stay as-is.
- **Real third parties are NOT live in the render pipeline.** The target has **no** Docker, Postgres, Stripe, Resend, Upstash, or Trigger.dev — it is an in-memory-store app (073 lineage). `/plan` and `/invoices` render deterministically at first paint from the seeded store with no login (the cookie dev-identity defaults to `org-acme:admin` and never redirects). The seeded `page-view-tracker` network call may fail harmlessly; render does not depend on it. Rendered checks target only the deterministic first paint.
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`), carried from the 073 fork unless noted:**
  - `tsconfig.json`: `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, **both** `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` in `include`, `"allowJs": false`, **no `baseUrl`** (TS 6 errors on it — `"paths": { "@/*": ["./src/*"] }` resolves under `moduleResolution: "bundler"`), `next-env.d.ts` excluded from Biome via `files.includes`. `lesson-verification/` kept out of `include` (run by vitest, not built) so forward-referencing tests never fail `start/` tsc.
  - `next.config.ts`: `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true` (needs `babel-plugin-react-compiler@1.0.0`), `turbopack: { root: __dirname }`. `/plan` reads request-time data → ships `app/(app)/plan/loading.tsx` (the Cache Components Suspense seam) so prerender does not fail with "Uncached data accessed outside `<Suspense>`". Any `redirect()`/`router.push` built from runtime strings uses `import type { Route } from 'next'` + cast `as Route`; `/plan` links are static literals.
  - `biome.json`: `"css": { "parser": { "tailwindDirectives": true } }`, `files.includes` ignores without trailing `/**` (`["**", "!next-env.d.ts", "!.next", "!node_modules"]`), `noImgElement: "off"` if any carried UI uses raw `<img>`. The seeded code must pass `biome ci` (the first verify gate): the `useEffect`-derived-state defect (#4), the `Date` arithmetic (#3), the bare side-effect import (#2), the hand-rolled auth (#1), and the missing audit write (#5) are all **lint-clean** (biome's recommended set does not flag any of them — they are review-stack findings, not linter findings, which is the whole pedagogical point). Confirm `biome ci` is green on the seeded target; if any planted defect happens to trip a recommended rule, add a per-line `// biome-ignore <rule>: seeded review-target defect` rather than altering the defect.
  - `pnpm-workspace.yaml`: `allowBuilds: { sharp: true }` (Next pulls `sharp` transitively; pnpm 11 won't build it unattended → cold-install `next build` fails without it). No `pnpm` key in `package.json`. (073 carries this; confirm it survived the fork.)
  - lucide-react 1.x: no brand icons (`Github`/`Twitter`/… removed) — use non-brand glyphs only.
  - `verify` is exactly `biome ci . && tsc --noEmit && next build` (the locked string; the 073 lineage's extra `next typegen` is dropped — the locked tsconfig `include` covers the generated route types).
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, nuqs `^2.8.9`, next-themes `^0.4.6`, lucide-react `^1.17.0`, temporal-polyfill `^0.3.0`, babel-plugin-react-compiler `1.0.0`, pnpm `11.3.0`, tailwindcss `^4.3.0`.

## File tree

Tree after the last slice (`solution/`). Provided/seeded files carry no slice tag; the two deliverable artifacts tag the slice that fills them. The audit target is the 073 lineage + grafts + the nine-file change — only the review-relevant and seeded files are enumerated; the unchanged carry-in (`/invoices` + `/inspector` surfaces, UI primitives, the full cache/result/utils lineage, configs) is elided as `… (073 lineage, unchanged)`.

```
projects/Chapter 104/solution/
├── package.json                              — chapter-104-pr-review; 073 deps + temporal-polyfill; verify = biome ci && tsc --noEmit && next build
├── pnpm-workspace.yaml                       — allowBuilds { sharp: true }
├── next.config.ts                            — cacheComponents/typedRoutes/reactCompiler/turbopack (073 carry)
├── tsconfig.json                             — locked includes (.next/types + .next/dev/types); lesson-verification excluded; no baseUrl
├── biome.json                                — 073 carry
├── vitest.config.ts                          — node env; include lesson-verification/**/*.ts
├── README.md                                 — setup ladder, /plan is the review surface, real-course workflow narrative, template/map pointers
├── AGENTS.md                                 — references the principle/pattern map + reviews/ + docs/adr/ artifacts
├── reviews/                                  — ← deliverable (root, not src/)
│   ├── template.md                           — provided (the four-part comment contract)
│   └── chapter 104.md                        [pass-order header + comment 1 by: S1; comments 2-5 + Summary + Verdict by: S2]
├── docs/
│   └── adr/
│       ├── README.md                         — index rows 0001-0006 provided; 0007 row [appended by: S3]
│       └── 0007-cache-entitlement-reads-with-cacheTag.md   [filled by: S3]
├── scripts/
│   └── test-lesson.mjs                       — node wrapper (runs one lesson-verification/Lesson <n>.ts)
├── lesson-verification/                      — (empty here; project-lesson-test-coder fills Lesson 2.ts … Lesson 4.ts later)
└── src/
    ├── server/
    │   ├── store.ts                          — 073 store + organizations(planLabel) + plan-entitlement shape seeded (SEEDED, edited)
    │   ├── session.ts                        — 073 cookie dev-identity; never redirects (unchanged)
    │   └── types.ts                          — 073 types + plan-entitlement/AuditLog shapes (unchanged/extended)
    ├── lib/
    │   ├── temporal.ts                       — grafted from 085 (the primitive finding 3's fix names)
    │   ├── audit-log.ts                      — logAudit(tx, event) → in-memory store (the seam finding 5 cites as missing)
    │   ├── tenant-db.ts                      — tenantDb(orgId) scoped facade (SaaS pattern #1, finding 1's dropped guarantee)
    │   ├── authed-action.ts                  — authedAction wrapper (073 carry; finding 1's canonical wrapper)
    │   ├── cache/
    │   │   ├── tags.ts                        — invoiceTags (073) + orgPlanEntitlementTag(orgId) → org:{orgId}:plan-entitlement (SEEDED, edited)
    │   │   └── … (profiles.ts, log.ts — 073 lineage, unchanged)
    │   ├── plan/
    │   │   ├── get-plan-entitlement.ts        — 'use cache' + cacheTag + cacheLife (ADR target; SEEDED; bonus: no TSDoc)
    │   │   ├── renewal-countdown.ts           — Date arithmetic, no Temporal (SEEDED defect #3)
    │   │   └── schemas.ts                     — updatePlanLabelSchema (healthy; named in finding 1's Action)
    │   ├── analytics/
    │   │   └── page-view-tracker.ts           — top-level body fires a network call (SEEDED; powers defect #2)
    │   ├── invoices/                          — … (073 lineage: queries 'use cache', actions updateTag/revalidateTag — the existing cache pattern the ADR mirrors)
    │   └── … (result, utils — 073 lineage, unchanged)
    ├── app/
    │   ├── (app)/
    │   │   ├── plan/
    │   │   │   ├── page.tsx                    — Server Component; bare side-effect import first (SEEDED defect #2); data-testid="plan-page" (root) + data-testid="renewal-countdown"; one root element
    │   │   │   ├── seat-usage.tsx              — 'use client'; useState+useEffect derived state (SEEDED defect #4); handlePlanThing (bonus nit); data-testid="seat-usage"
    │   │   │   ├── actions.ts                  — updatePlanLabel: hand-rolled auth, no authedAction/tenantDb (SEEDED #1); no logAudit (SEEDED #5)
    │   │   │   └── loading.tsx                 — Cache Components Suspense seam for /plan
    │   │   └── invoices/ …                     — (073 lineage, unchanged)
    │   ├── inspector/ …                        — (073 lineage, unchanged)
    │   ├── _components/ …                      — (073 lineage: providers, submit-button)
    │   ├── layout.tsx                          — root layout: one <nav> + one <main>{children} (single-slot invariant; the (app) route group is layout-less and inherits this; 073 carry)
    │   └── page.tsx                            — redirect / → /invoices (073 carry)
    └── components/ui/*                         — (shadcn primitives, unchanged)
```

`start/` is identical except `reviews/chapter 104.md` (header + TODO scaffold), `docs/adr/0007-*.md` (Nygard scaffold + TODO), and `docs/adr/README.md` (no 0007 row, + TODO note); `reviews/template.md`, the `docs/adr/README.md` 0001–0006 rows, and the entire seeded audit target are byte-identical.

## Verification

### Static checks (the reviewer executes)

Scope tagged per check. Artifact checks run against `solution/` (filled) and `start/` (scaffolds) as noted. Paths use the literal `reviews/chapter 104.md` (a space in the filename — quote it).

- **(both) `pnpm verify` passes** in `solution/` and `start/` with the seeded change in place — `biome ci . && tsc --noEmit && next build` green. The defects ship green by design.
- **(both) `rg "TODO" start/reviews/ start/docs/adr/` enumerates exactly the deliverable markers** (the `chapter 104.md` TODO + the `0007-*.md` TODO + the `README.md` 0007-row TODO note); `solution/reviews/` + `solution/docs/adr/0007-*.md` have **zero** `TODO` markers (bodies filled).
- **(solution) the review file carries five comment blocks, each with all four parts** (load-bearing — fails if a comment ships inert without a rule or an action):
  - exactly five `blocking:` labels: `grep -c '\*\*blocking:\*\*' "reviews/chapter 104.md"` returns `5` (or `rg -c 'blocking:'` ≥ 5; the five required findings are all blocking).
  - five `Principle/pattern:` lines and five `Action:` lines: `grep -c 'Principle/pattern:' "reviews/chapter 104.md"` ≥ 5 and `grep -c 'Action:' "reviews/chapter 104.md"` ≥ 5.
  - each comment pins a file+line: `rg 'L[0-9]' "reviews/chapter 104.md"` hits (at least five `L<n>` references).
- **(solution) each finding names its target seam + the rule** (fails if a finding ships inert prose with no rule or no fix seam):
  - comment 1: `grep -q "authedAction" "reviews/chapter 104.md" && grep -qi "tenant" "reviews/chapter 104.md" && grep -qi "rate" "reviews/chapter 104.md"` (names the wrapper + all three dropped guarantees) and `grep -qi "pattern #2\|SaaS pattern" "reviews/chapter 104.md"`.
  - comment 2: `grep -q "page-view-tracker" "reviews/chapter 104.md" && grep -qi "Principle #6\|explicit" "reviews/chapter 104.md"`.
  - comment 3: `grep -q "Temporal" "reviews/chapter 104.md" && grep -qi "timezone\|time zone" "reviews/chapter 104.md" && grep -qi "pattern #13\|DST" "reviews/chapter 104.md"` (names Temporal **and** the timezone fix).
  - comment 4: `grep -qi "useEffect\|derive" "reviews/chapter 104.md" && grep -qi "Principle #7\|impossible state\|inline" "reviews/chapter 104.md"` (names the derive-don't-sync rule + the inline fix).
  - comment 5: `grep -q "logAudit" "reviews/chapter 104.md" && grep -q "organization.plan-label-changed" "reviews/chapter 104.md"` (names the missing call + the exact slug).
- **(solution) the Summary + Verdict hold:** `grep -qi "5 blocking" "reviews/chapter 104.md"` and `grep -qE "220|400" "reviews/chapter 104.md"` (the PR-size note) and `grep -qi "request changes" "reviews/chapter 104.md"`.
- **(solution) the ADR carries all four `##` sections:** `grep -q "^## Status" docs/adr/0007-*.md && grep -q "^## Context" docs/adr/0007-*.md && grep -q "^## Decision" docs/adr/0007-*.md && grep -q "^## Consequences" docs/adr/0007-*.md`. Each must be non-empty (the body between a heading and the next `##` is not blank).
- **(solution) the Decision line is unhedged** — scope the hedging check to the **Decision section only** (Context legitimately discusses considered-and-rejected alternatives, so a whole-file grep false-positives): extract the lines between `## Decision` and the next `## ` heading and assert no hedging token — e.g. `awk '/^## Decision/{f=1;next} /^## /{f=0} f' docs/adr/0007-*.md | rg -qi "we should|we're considering|we are considering|maybe|we could"` must **fail** (no match). The reference Decision is a single declarative "we will cache…" sentence.
- **(solution) the ADR names the cache contract + the invalidation seams** (load-bearing — fails if the ADR is all-upside hand-waving): `grep -q "cacheTag" docs/adr/0007-*.md && grep -q "updateTag" docs/adr/0007-*.md && grep -qi "revalidateTag" docs/adr/0007-*.md && grep -q "org:{orgId}:plan-entitlement\|orgPlanEntitlementTag" docs/adr/0007-*.md` and the Consequences enumerate at least the plan-label seam (`grep -qi "plan-label\|updatePlanLabel\|mutation seam" docs/adr/0007-*.md`).
- **(solution) the ADR index carries the 0007 row:** `grep -q "0007" docs/adr/README.md`. **(start) it does not:** `! grep -qE "^0007|— 0007" start/docs/adr/README.md` (rows 0001–0006 present, 0007 absent).
- **(both) the seeded change is present in the target** (each a one-line grep that fails if the defect was "fixed" — the target is read-only, so these must hold in both trees). **The #1/#3/#5 checks are whole-file *negative* token greps** (`! grep -q "authedAction"` / `"Temporal"` / `"logAudit"`), so the scaffolder must keep those tokens out of the seeded files' **comments** — a "the review proposes `authedAction(...)`"-style comment in `actions.ts` or a "does not import `Temporal`" comment in `renewal-countdown.ts` would false-trip its own presence check. Describe the defect in the comment without naming the forbidden token (the fix names live only in `reviews/chapter 104.md`).
  - #1 (hand-rolled auth, no wrapper): `grep -q "'use server'" "src/app/(app)/plan/actions.ts" && ! grep -q "authedAction" "src/app/(app)/plan/actions.ts"` (the action exists, the wrapper is bypassed).
  - #2 (bare side-effect import): `grep -q "import '@/lib/analytics/page-view-tracker'" "src/app/(app)/plan/page.tsx"` and the tracker fires at module scope: `rg "fetch\(|track\(" "src/lib/analytics/page-view-tracker.ts"` hits at top level.
  - #3 (`Date` arithmetic, no Temporal): `grep -q "Date.now()" "src/lib/plan/renewal-countdown.ts" && ! grep -q "Temporal" "src/lib/plan/renewal-countdown.ts"`.
  - #4 (`useState`+`useEffect` derived state): `grep -q "useState" "src/app/(app)/plan/seat-usage.tsx" && grep -q "useEffect" "src/app/(app)/plan/seat-usage.tsx"`.
  - #5 (no audit write on the plan-label mutation): `grep -qi "planLabel" "src/app/(app)/plan/actions.ts" && ! grep -q "logAudit" "src/app/(app)/plan/actions.ts"`.
  - the cache decision (the ADR target): `grep -q "'use cache'" "src/lib/plan/get-plan-entitlement.ts" && grep -q "cacheTag" "src/lib/plan/get-plan-entitlement.ts"`.
  - the cache tag helper exists: `grep -q "orgPlanEntitlementTag" "src/lib/cache/tags.ts"`.
- **(both) the canonical seams the review cites exist** (so the findings reference real code): `test -f src/lib/audit-log.ts && test -f src/lib/tenant-db.ts && test -f src/lib/temporal.ts && test -f src/lib/authed-action.ts && test -f src/lib/plan/schemas.ts`.
- **(both) `reviews/template.md` exists in both trees** (the contract): `test -f reviews/template.md`.
- **(both) the lesson-test runner narrows to one file:** `pnpm test:lesson 2` resolves and runs only `lesson-verification/Lesson 2.ts` (one absolute path, no glob OR-match) — until the test-coder writes it, expect a clean "no test files found" for that one path, not a multi-file run.

### Rendered checks (slice coders + inspector run against the running app)

The pipeline boots the in-memory-store app (no Docker, no third-party round-trip, no login). Only the deterministically-rendered `/plan` surface is checked; every finding's defect fingerprint is **source shape** (the static greps above), not a rendered assertion — a derived-state effect, a `Date` calc, a bare import, a missing wrapper, and a missing audit write paint nothing distinct on screen, which is exactly why the review reads the source, not the render.

| field | r-target-boots | r-plan-single-root |
|---|---|---|
| **slice** | S1 | S1 |
| **route** | `/plan` | `/plan` |
| **viewport** | 1280×900 | 1280×900 |
| **state** | settled (default dev identity) | settled |
| **intent** | the audit target boots and the `/plan` surface the student reviews paints end-to-end with no login | the `/plan` page resolves to a single root element (the single-slot invariant), not a fragment that flattens into the layout |
| **selectors** | `plan-page`, `seat-usage`, `renewal-countdown` | `plan-page` |
| **assertion** | all three of `plan-page`, `seat-usage`, and `renewal-countdown` resolve to exactly one element each and are all descendants of `plan-page` (the surface painted end-to-end), and the page did not crash into Next's error boundary (`plan-page` present ⇒ no thrown render — there is no custom `error.tsx`); `seat-usage` shows the seat counter text and `renewal-countdown` shows a non-empty day count | the element matched by `plan-page` is the single child the layout's content slot (`<main>` in the root `app/layout.tsx`) renders — i.e. `document.querySelector('main').children.length === 1` and that child is `plan-page` (the page's top-level return is one element, not a sibling fragment); holds at any width (child-count condition, not geometric) |

- **r-target-boots (S1):** owned by S1 — the first slice's render checkpoint is that the seeded target the whole review reads against actually boots and `/plan` paints. Tagged to S1 because the target is fully built by the scaffolder before any slice runs; visiting `/plan` renders the surface end-to-end from the seeded store.
- **r-plan-single-root (S1):** owned by S1 — guards the single-slot invariant on the page the screenshot captures (a fragment-flattened `/plan` would split into multiple children of the root layout's `<main>` and the L1 figure would render wrong). Child-count condition (`<main>` has exactly one child, which is `plan-page`), holds at any width; the 1280×900 tag is for consistency with the screenshot, not layout dependence.

Every slice with a screenshot (S1) owns a rendered check (r-target-boots / r-plan-single-root) covering that surface.
