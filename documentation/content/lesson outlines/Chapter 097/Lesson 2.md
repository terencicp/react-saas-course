# Lesson 2 — The four-job merge gate

## Lesson title

- Title: The four-job merge gate
- Sidebar label: Four-job merge gate

## Lesson framing

The load-bearing artifact of this lesson — and of the whole chapter — is the complete `.github/workflows/ci.yml`: four parallel jobs (`typecheck`, `lint`, `test`, `build`) that run on every PR and produce the four status checks the chapter 096 ruleset already requires by name. Lesson 1 shipped the spine of this file: the exact `name`/`on`/`permissions`/`concurrency` header plus a single `typecheck` job. This lesson grows that one job into four. **The header is frozen** — `name: CI`, the `pull_request` + `push: branches: [main]` trigger pair, `permissions: contents: read`, and the `concurrency` group string must stay byte-for-byte identical to lesson 1's file. The student is editing one file across three lessons, not authoring three files.

The senior question that organizes the lesson: *what is the smallest set of checks that makes the branch-protection ruleset structurally enforceable, and why these four and no others?* The answer is the spine — each of the four catches a class of regression none of the others can, so dropping any one leaves a blind spot the gate is supposed to cover. Everything else (audit, link-check, actionlint, Dependabot) is signal, not gate, and belongs to lesson 3.

Central pedagogical risk: this is a wiring-heavy lesson and could collapse into a YAML dump. The countermeasure runs through every section — **lead each command with the bug it catches, not its syntax.** The student already learned the job shape (checkout → pnpm → node+cache → frozen install → command) in lesson 1; that shape is now a known quantity they assemble four times, not new material. So the new teaching surface is narrow and sharp: (1) the per-command rationale — what each of `tsc --noEmit`, `biome ci`, `vitest run`, `next build` proves that the others can't; (2) the parallel-vs-fat-job trade-off and why parallel is the default; (3) the five-minute speed budget as a load-bearing senior reflex; (4) the job-name discipline that ties the workflow to the ruleset. Keep the four scripts themselves as black boxes — the test framework (Unit 18), Biome config (Unit 1), and the type-check/build commands (Unit 1) were all taught earlier; this lesson *uses* them, it does not re-teach them.

Mental model the student should leave with: "Four jobs, named once, listed in the ruleset by string. Each catches what the others miss. Parallel so a red typecheck doesn't hide a red lint. Under five minutes on warm cache or the gate gets bypassed. Rename a job and the gate silently disappears — that's always a two-file PR." By the end the student can write the full `ci.yml` from the lesson-1 spine, justify the four-job choice to a skeptical teammate, name what each job catches, and recognize the failure modes (env-at-build-time, flaky tests, name drift) before they bite.

Tone and level per pedagogical guidelines: adult, terse, decisions-before-syntax, no bootcamp scaffolding. The student is a junior dev from another field with web basics, here to build production SaaS with senior judgment.

## Lesson sections

### Introduction (no header)

Open by cashing in lesson 1's promise. Lesson 1 ended with one `typecheck` job and the explicit line "in the next lesson this single job grows into the full four-job gate." Reconnect there in one or two sentences: the spine is built, the header is frozen, now we assemble the gate.

State the senior question implicitly (per guidelines — not as a labeled section): the chapter 096 ruleset refuses to merge until `typecheck`, `lint`, `test`, and `build` are green, but so far only `typecheck` exists. The other three checks the ruleset names are still phantoms — the gate is three-quarters hollow. This lesson makes all four real.

Preview the concrete deliverable: by the end the student will have written the complete `ci.yml` and will be able to defend *why exactly these four*. Motivate with the stakes: this file is the difference between a `main` branch you can deploy on faith and one where a green PR can still break production. Keep it warm and brief — three short paragraphs max.

Reasoning: the guidelines mandate the introduction state the goal, connect to prior knowledge, preview the deliverable, and motivate with a concrete problem. The "phantom checks" framing is the concrete problem and ties directly to the artifact the student built last lesson.

### Why these four checks, and no others

The conceptual heart of the lesson. This section earns the rest — if the student believes *why these four*, the wiring that follows is just execution.

Frame it as four blind spots, one per check. The teaching move is to show that each catches a class of regression the others provably cannot, so the set is minimal-and-complete, not arbitrary. Walk them in this order (cheapest/most-foundational first):

- **Type-check (`tsc --noEmit`)** — catches everything the type system can *prove* wrong: a renamed field still referenced, a function called with the wrong shape, a null that isn't handled. It's the floor the rest of the codebase trusts. The specific failure it catches that `pnpm dev` misses: dev's type-loader is lazy and only checks files you actually touched, so an import cycle or a type error in an untouched module sails through dev — `tsc --noEmit` checks the *whole* project at once and finds it.
- **Lint (`biome ci`)** — catches a band of correctness-and-style issues types don't model: unused imports, a forgotten `await` (a floating promise), `==` where `===` was meant, accidental `console.log`. Frame the senior diff established in Unit 1 in one line — Biome is formatter + linter in one tool, replacing the old ESLint+Prettier pair, ~10x faster — but do not re-teach Biome config; it's a black box here.
- **Test (`vitest run`)** — catches behavioral regressions: code that type-checks and lints clean but does the wrong thing. This is the safety net that makes refactors safe. Test framework internals belong to Unit 18; here it's the job that proves behavior didn't break.
- **Build (`next build`)** — catches the cross-module and environment integration problems the other three miss: bad imports that only fail when the bundler resolves the whole graph, a missing build-time env var, an RSC/client-boundary violation (a server-only import pulled into a client component). And it produces the artifact the deploy job will consume in chapter 098 — so build is doing double duty as both a check and a build.

After the four, draw the line explicitly: anything else — `pnpm audit`, link-check, actionlint, Dependabot — is *supplementary*. Useful, but it doesn't catch a class of merge-blocking regression, so it's signal, not gate. Forward-reference lesson 3 owns those. This sentence is load-bearing because it sets up the gate-vs-signal split lesson 3 will formalize, and it justifies why the gate stops at four.

**Diagram — the four blind spots.** A custom HTML+CSS figure wrapped in `<Figure>` (default `expandable`, no caption — explained in prose). Pedagogical goal: make "each catches what the others miss" visible at a glance, so the set reads as complete rather than arbitrary. Layout: four columns (one per check, horizontal — laptop viewports are short), each a card with the check name as a header (`typecheck` / `lint` / `test` / `build`), a one-line "catches:" summary, and a tiny representative example of a bug only it catches (e.g. typecheck → "field renamed, still referenced"; lint → "forgotten `await`"; test → "off-by-one in a refund calc"; build → "server import in a client component"). Use four distinct saturated mid-tone header fills with white text so each column is visually its own concern in both themes. Cap height; apply the `margin: 0` prose-reset on every inner element. Keep it compact — four short cards in a row, not tall.

Reasoning: this is the senior-mindset payload of the lesson (decisions before syntax). The four-blind-spots frame is the durable mental model; the diagram makes minimality concrete. Per guidelines, lead with *why this approach* before any code.

**Exercise — Buckets, "which check catches this?".** A `Buckets` exercise with four buckets (`typecheck`, `lint`, `test`, `build`), instructions: "Each defect slips past every check but one. Which job catches it?" Items phrased so they're not lifted verbatim from prose and so each is unambiguously one bucket:
- `typecheck`: "A function is called with an argument of the wrong shape."
- `typecheck`: "A property was renamed in one file but still read in another." (distinct from the build item below — pure type error, resolves without bundling)
- `lint`: "A promise is never awaited, so an error vanishes silently."
- `lint`: "An imported helper is never used."
- `test`: "A discount is applied twice, so the total is wrong — but every type is correct."
- `build`: "A server-only module is imported into a client component."
- `build`: "A page reads an environment variable that exists locally but isn't set in the build."

Reasoning: classification drill is exactly right for "minimal-and-complete set" — it forces the student to internalize the boundaries between the four rather than recite a list. Two items per bucket (mostly) reinforces the partition. Confirmed `Buckets` is already imported and used in lesson 1, so the pattern is consistent within the chapter.

### Four parallel jobs versus one fat job

The structural decision. The student knows the single-job shape from lesson 1; the question now is how to arrange four of them.

Teach the default first (defaults before conditionals, per guidelines): **four jobs in the `jobs:` map, no `needs:` between them, so they run in parallel.** Each job is the lesson-1 shape — checkout, pnpm setup, node+cache, `pnpm install --frozen-lockfile`, then the single command that *is* the job. State the trade plainly: each job pays its own install cost, but with the pnpm store cached that's ~30s, and the total wall-clock is bounded by the *slowest* job (usually `build`) instead of the *sum* of all four. Concrete number to anchor: ~3–5 minutes wall-clock for the four parallel jobs on a warm cache for a typical 2026 SaaS app.

Then the conditional alternative and its trigger: **one fat job that runs all four commands sequentially.** It installs once, so it saves the duplicated install cost — but its wall-clock is the *sum*, and worse, it loses failure granularity. State the threshold the default crosses: reach for the fat job only when CI minutes are genuinely constrained (a cheap plan with few concurrent jobs) or when install cost dominates and caching can't fix it. Otherwise parallel wins, and the deciding reason is failure granularity: with parallel jobs, a failing `typecheck` shows up *alongside* the lint, test, and build results — you see every failure at once. With the fat job, a failed `typecheck` aborts the run before `test` or `build` even start, so you fix one thing, re-push, wait, discover the next. The senior reflex: optimize for *how fast the developer learns everything that's wrong*, not for raw CI minutes.

**Component — CodeVariants for the trade-off.** Two variants of the same four commands, A/B. This is the canonical before/after the component is built for.
- Variant "Four parallel jobs" (the default): show a *trimmed* `jobs:` map — the four job ids each with `runs-on` and a `# ...same setup steps...` comment standing in for the repeated checkout/pnpm/node/install block, then the single distinguishing command. Trimming the repeated setup is deliberate and should be noted to downstream agents (a pedagogical divergence from full runnable code — the full file appears in the next section; here the point is *structure*, so the repeated steps are noise). First-sentence framing: "Independent jobs, parallel by default — you see all four results at once."
- Variant "One fat job": one job, the setup steps once, then `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (or four sequential `run:` steps). First-sentence framing: "Installs once, but the wall-clock is the sum and the first failure hides the rest."

Keep each variant's prose to one paragraph. Note for the agent: do NOT show the full four-job file here with all setup steps repeated — that's the next section's job via AnnotatedCode; showing it twice bloats the lesson.

Reasoning: CodeVariants is purpose-built for two versions of the same code with per-variant framing (confirmed in component doc). The parallel/fat split is a real senior decision with a named threshold — exactly the "defaults before conditionals, name the trigger" shape the guidelines require.

**Exercise — MultipleChoice on the trade-off.** Single-correct, testing the *reason* parallel is the default, not the definition. Question: "Your CI runs the four checks as four parallel jobs. A teammate proposes collapsing them into one job to 'save time on installs.' What's the strongest argument for keeping them parallel?" Choices (one correct): the correct one names failure granularity (you see all failures in one run instead of fixing-and-re-pushing through them one at a time); distractors include "parallel jobs always finish faster" (false — wall-clock can be similar, and the fat job genuinely saves install time), "you can't cache the pnpm store in a single job" (false), "the ruleset requires separate jobs" (false but tempting — clarify in the `McqWhy` that the ruleset matches check *names*, which a fat job could still produce as one combined check, and that's exactly the problem). The `McqWhy` reinforces: the install saving is real, so "saves time" isn't wrong on its face — the decisive counter is feedback quality.

Reasoning: `MultipleChoice` (imported in lesson 1) is right for a decision with a tempting-but-wrong distractor. The wrong distractors are seeded from real misconceptions, which is more instructive than obviously-false decoys.

### Building the workflow: four jobs

The payload section. Here the student writes the complete `ci.yml`. This is the load-bearing artifact, so it gets the full walkthrough treatment.

**Component — AnnotatedCode for the full file.** `<AnnotatedCode lang="yaml" maxLines={18}>` so the ~50-line file scrolls within the capped frame as the student steps through. The `code` prop is the *complete, runnable* `ci.yml`. This is the canonical file — it MUST extend lesson 1's exact spine. Author exactly:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

Note to the agent on action pins: keep `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v4` exactly — these are the June-2026 verified majors lesson 1 used; matching is mandatory (the continuity notes flag that the chapter outline's `@v4` examples are stale). Tag-pinning these utility actions by major is correct here because no job holds secrets (the rationale was taught in lesson 1; restate in one clause, do not re-teach the SHA-pinning gradient).

AnnotatedSteps (each one short paragraph, ≤6 lines; vary `color`):
1. meta `{1-10}`, color `blue` — the frozen header. One sentence: this is byte-for-byte the spine from lesson 1 — name, the test-the-branch-then-test-`main` trigger pair, the read-only permissions floor, the concurrency cancel. We're not touching it; we're adding jobs under it.
2. meta `{11-22}`, color `green` — the `typecheck` job, already familiar from lesson 1. Use it to re-anchor the shape the next three jobs repeat: checkout, pnpm, node+cache, frozen install, the one command.
3. meta `{23-32}`, color `green` — `lint`. Identical shape; the only line that differs is `pnpm lint`. Make the repetition the point: every job is the same five setup beats and one command.
4. meta `{33-42}`, color `green` — `test`, same shape, `pnpm test`.
5. meta `{43-52}`, color `green` — `build`, same shape, `pnpm build`. Note it's the slowest, so it sets the wall-clock.
6. meta `{11} "lint" "test" "build"` (or four separate line refs for the job ids), color `orange` — the punchline step: these four job ids — `typecheck`, `lint`, `test`, `build` — are the exact strings the ruleset matches. This is the contract. Set up the name-discipline section that follows.

After the AnnotatedCode, one short paragraph naming the obvious objection — "every job repeats the same setup four times" — and resolving it: yes, and that's the price of isolation and parallelism (callback to lesson 1's clean-runner argument). The DRY fix (a composite action) was named-and-cut in lesson 1; restate in one clause that it earns weight at 5+ repos, not here.

Reasoning: AnnotatedCode is the right component when one block is complex and attention must be directed part-by-part (per component doc). The file is long but highly repetitive, so the walkthrough leans on the repetition — steps 3–5 are deliberately brief because the shape is already known. This keeps cognitive load low: the student isn't learning four new things, they're confirming one known thing repeats. Confirmed lesson 1 imports AnnotatedCode/AnnotatedStep.

**Exercise — Dropdowns to assemble a job from memory.** Fenced-code mode. Give a single job skeleton with blanks at the load-bearing decision points, so the student proves they can write the shape, not copy it. Blanks (in source order) target the things that actually bite: the cache value, the install flag, the ordering of the two setup actions. Example fenced block with `___` placeholders and an `answers` prop:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: ___          # install pnpm — must come first
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: ___
      - run: pnpm install --___
      - run: pnpm test
```

Answers: `pnpm/action-setup@v4` (options include `actions/setup-node@v6` as the tempting wrong order), `pnpm` (options: `npm`, `pnpm`, `yarn` — reinforce lesson 1's "v6 only auto-caches npm, you must opt in" point), `frozen-lockfile` (options: `frozen-lockfile`, `no-save`, `prod`). Keep blanks to three — enough to test judgment, not a typing exercise.

Reasoning: `Dropdowns` fenced mode is ideal for "fill the load-bearing tokens" recall on a code block (per doc). The three blanks are precisely the lesson-1 reflexes that recur here, so this exercise also reinforces continuity. Note: lesson 1 used `Sequence` for setup-step ordering; using `Dropdowns` here varies the format and tests recall at the token level rather than the step level.

### The job names are the contract with the ruleset

Short, sharp section — the through-line that ties this file back to chapter 096 and forward to chapter 098. Lesson 1 already planted "job name becomes check name"; this section makes it operational for the four-job set and drills the failure mode.

State the mechanism crisply: each job id (`typecheck`, `lint`, `test`, `build`) surfaces on the PR as a status check of that exact name. The chapter 096 ruleset's "required status checks" line names those same four strings. The two are joined by string equality and nothing else — no type system, no compiler, no test covers this seam.

Then the failure mode, with a concrete scenario: a developer renames the `test` job to `tests` (plural — a totally reasonable-looking edit) in a PR. The workflow still runs, the `tests` check goes green, everything *looks* fine. But the ruleset still requires a check named `test`, which no longer exists. Depending on the ruleset config, GitHub either waits forever for a check that will never report, or — worse, and more common — treats the missing check as not-applicable and lets the PR merge *without the test suite ever having gated it*. The gate didn't error. It silently stopped protecting that case. This is the single nastiest failure mode in CI configuration because nothing tells you it happened.

The reflex, stated as a rule: **any rename of a CI job is a two-file PR — the workflow and the ruleset, changed together.** Treat the job id as a published API. This was flagged as a watch-out in chapter 096 lesson 4 and lesson 1; it *lands in code here*, so it gets its full treatment in this lesson.

**Diagram — the name as a wire.** A small custom HTML+CSS figure wrapped in `<Figure>` (default `expandable`, no caption). Pedagogical goal: make the string-equality seam literal and show the break. Layout: two side-by-side panels with a connecting line between matching names. Left panel: `ci.yml` showing the four job ids stacked. Right panel: the ruleset's "required checks" showing the four required strings stacked. Draw four connector lines, one per matching pair, all green/solid. Then — either a second state or a visually distinct row below — show the `test` → `tests` rename: the left side now reads `tests`, the connector to the ruleset's `test` is broken/red/dangling, and a small label flags "ruleset still requires `test` — no check reports it." Keep compact, horizontal, `margin: 0` reset on every inner element. (If a single figure gets cluttered, use `TabbedContent` with two tabs — "Matched" and "After rename" — rather than cramming both states into one panel. Author's call.)

Reasoning: this seam is invisible in code (it spans two files in two different systems — a YAML workflow and a GitHub ruleset), so a diagram is the only way to make it concrete. The "broken wire" visual is the durable memory hook for the watch-out. This is the chapter's repeated through-line, so it deserves its own visual landing here where the code exists.

**Exercise — MultipleChoice on the rename failure mode.** Single-correct. Scenario: "You rename the `build` job to `build-app` in `ci.yml`. You forget to update the branch-protection ruleset, which still lists `build` as required. What happens to the gate?" Correct choice: the ruleset's required `build` check is never reported, so the gate stops enforcing the build — and depending on config, PRs may become merge-eligible without it. Distractors: "GitHub auto-detects the rename and updates the ruleset" (false — there's no such link), "the PR is blocked because `build-app` isn't in the ruleset" (tempting — clarify in `McqWhy` that *extra* checks don't block; only *missing required* ones do, and missing-required often resolves as merge-eligible), "the workflow fails to run" (false — the job runs fine). `McqWhy` drives home: the dangerous part is the silence.

Reasoning: this is the most important watch-out in the lesson and recurs across three lessons; an MCQ on the *consequence* (not the rule) is the right check. Reinforces decisions-before-syntax: the student must reason about the system, not recite a flag.

### When the build needs the environment

The most common real-world way a four-job gate that's green-locally goes red-in-CI, and the one place the build job diverges from the simple "run one command" shape. Worth its own section because it's where students get genuinely stuck.

Lead with the symptom, not the config (decisions before syntax): `pnpm build` passes on your laptop and fails in CI with a missing-environment-variable error. Why? Because `next build` reads certain env vars *at build time* — `NEXT_PUBLIC_*` values that get inlined into the client bundle, and any value the app reads during static pre-rendering (e.g. a `DATABASE_URL` hit while pre-rendering a public page). Your laptop has a `.env` file; the fresh CI runner does not. The build that worked locally fails in the clean room.

Two senior responses, in order of preference:
1. **Prefer dynamic rendering for anything DB-backed.** The cleanest fix is architectural: pages that read the database should render dynamically (per request), not be pre-rendered at build time — then `next build` never touches the DB and needs no `DATABASE_URL`. Reserve build-time DB reads for genuinely static public pages. State the senior diff: the env-at-build-time problem is often a signal that something is being statically rendered that shouldn't be.
2. **When build genuinely needs a value, provide it — scoped minimally.** For env the build legitimately requires, expose it as a job-level `env:` sourced from `secrets:` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, etc. — granting only what *this* build needs (callback to lesson 1's least-privilege secrets framing). Show the shape briefly with a `Code` block: a `build` job step with an `env:` map pulling from `${{ secrets.X }}`. Mention the project's Zod-based env validator (the `@t3-oss/env-nextjs`-style validator from Unit 4) and `SKIP_ENV_VALIDATION=true` as the narrow escape hatch — used *only* for build when build-time DB access would otherwise fail, never at runtime, never in production.

Forward-reference clearly: the full env-scoping story across dev/preview/prod, and OIDC as the replacement for long-lived cloud secrets, is owned by chapter 098 (lesson 6 specifically). Here we only cover *enough* to get the `build` job green, and we name where the real treatment lives.

**Component — Code, not CodeVariants.** A single small `Code` block (the canonical component for a simple block) showing the `build` job's command step with a job-scoped `env:` map. Keep it minimal — three or four lines. Do not re-show the whole job; this is a focused excerpt. Author note: this is the one job that legitimately carries an `env:` block, so present it as a *targeted addition* to the build job, not a rewrite.

Reasoning: this is the highest-friction real-world failure for the four-job gate, and it's pure senior judgment (the architectural "prefer dynamic" answer over the quick "add the secret" hack). It earns prose and one focused code block but not a heavy walkthrough — the mechanism (job-level `env:` from `secrets:`) was already taught in lesson 1. The Unit-4 env validator and chapter-098 ownership are restated, not re-taught.

### The five-minute speed budget

The load-bearing senior reflex of the lesson, framed as a number with consequences. Place it near the end because it's a property of the whole assembled gate, not of any one job.

State the budget plainly: **the baseline should run under five minutes wall-clock on a warm cache.** Anchor the numbers: cold cache ~6–8 minutes, warm ~3–5. Then the *why it's load-bearing*, which is the real teaching: a slow gate gets bypassed. Not maliciously — by ordinary human friction. People start merging without waiting ("I'll fix it after"), reach for branch-protection exceptions, or just resent the gate. A gate nobody waits for protects nothing. (This is the same "fast feedback keeps the gate respected" argument lesson 1 made for caching; here it's elevated to an explicit budget for the whole pipeline.) The budget isn't a nicety — it's what keeps the structural enforcement actually enforcing.

Then: what to do when the budget breaks. Frame as diagnosis, not panic. If the build alone exceeds ~3 minutes, investigate rather than just upgrading the runner: the project may have changed shape, a route may now fetch everything at build time (callback to the previous section), or the test suite may have outgrown a single job. Two concrete levers, each with its trigger:
- **Next.js build cache (`.next/cache`).** This was named-and-deferred in lesson 1; here's where it's delivered. `next build` keeps an incremental cache in `.next/cache`, separate from the pnpm store. An `actions/cache@v4` step against `.next/cache`, keyed on `pnpm-lock.yaml` plus a hash of source files, makes incremental builds significantly faster — this is the pattern in Next.js's official CI-build-caching guide. Trigger: reach for it when build time exceeds ~2 minutes; cut it when build is already fast. The watch-out, stated sharply: a stale build cache can produce a *passing CI run that ships broken code* — the worst failure mode — so key it carefully and accept occasional cache misses over a wrong key. Show the cache step as a short `Code` block (added to the build job, before install or before build as appropriate). Agent note: pin `actions/cache@v4` — v1–v3 were sunset Feb 2025.
- **Test sharding.** Named and cut at the baseline. `vitest run --shard=1/4` plus a matrix splits a large suite across parallel jobs. Trigger: >500 tests or >2 minutes. State it earns weight past the typical SaaS startup's surface area, so the baseline doesn't include it — one sentence, then move on. Agent note: do NOT pair `--shard` with the `github-actions` reporter — sharded runs use the `blob` reporter plus `--merge-reports`; since this is a one-sentence cut, don't show the reporter wiring at all.

Also name the *anti*-reflex: flaky tests in the gate. The wrong fix is retry-on-failure (auto-rerun until green) — that hides the flake and lets a real intermittent bug ship. The only durable answer is to fix the test. State this as a one-line senior reflex; it's a quiz topic so it must land clearly.

**Diagram — the speed budget as a horizontal bar.** A custom HTML+CSS figure wrapped in `<Figure>` (default `expandable`, optional one-line caption). Pedagogical goal: make "wall-clock is the slowest job, not the sum" and "the budget" both visible. Layout: a horizontal time axis (0 to ~6 min). Four parallel bars, one per job, all starting at t=0 (parallel), each ending at its duration — `typecheck` and `lint` short (~1–1.5 min), `test` medium, `build` longest (~3 min), so `build` visibly sets the wall-clock. A vertical line at 5 min marked "budget"; the parallel bars finish to its left (warm cache, in budget). Optionally a faint "fat job = the sum" bar below, stretching past the 5-min line, to contrast. Horizontal layout fits the short-viewport constraint perfectly. `margin: 0` reset on every inner element; saturated fills for the bars with the `build` bar in the most prominent color since it's the constraint.

Reasoning: the "wall-clock = max, not sum" insight is genuinely spatial and the parallel-bars-on-a-time-axis visual nails it in one glance — far better than prose. It also visually re-justifies the parallel-over-fat-job decision from the earlier section, reinforcing the lesson's spine. A bar/timeline diagram is well within the html-css diagram engine's wheelhouse (sequential phase strips / bar grids are listed uses).

### External resources

A short `<CardGrid>` of `<ExternalResource>` cards, matching lesson 1's closing pattern. Candidates (the resourcer agent confirms/curates):
- GitHub Actions — using jobs (the official reference for the `jobs:` map, `needs:`, and job-level config).
- Next.js — `next build` / build output and caching docs (grounds the env-at-build-time and `.next/cache` material).
- Vitest CLI reference (`vitest run`, `--shard`, the GitHub Actions reporter) — grounds the test job.

Keep to three or so. Per guidelines this section is optional but lesson 1 set the precedent and the official references genuinely help; include it.

**Optional VideoCallout.** Only if the resourcer finds a current (2025–2026), high-quality walkthrough that specifically covers a multi-job JavaScript CI pipeline on GitHub Actions (not a generic "intro to CI"). It must add over the lesson's worked file — e.g. demonstrating the parallel jobs running live in the Actions UI. If nothing clears that bar, drop the placeholder; the AnnotatedCode walkthrough carries the load.

### Tooltip terms

Use `<Term>` for terms that support the lesson's goals without interrupting flow. Most GHA vocabulary (workflow, job, runner, step, action, `GITHUB_TOKEN`, `github.ref`, OIDC, cron) was already defined with `<Term>` in lesson 1 — do NOT redefine those; the student met them one lesson ago. New or worth-a-light-gloss in *this* lesson:
- **wall-clock time** — gloss as "real elapsed time from start to finish, as opposed to total compute time summed across parallel jobs." This distinction is the crux of the parallel-vs-fat-job and speed-budget sections; a one-line tooltip keeps the prose moving.
- **static pre-rendering / pre-render** — gloss as "Next.js generating a page's HTML at build time rather than per request." Needed in the env-at-build-time section; the student may not carry a crisp definition, and it's the reason build hits the env.
- **flaky test** — gloss as "a test that passes or fails non-deterministically on identical code." Light gloss in the speed-budget section so the anti-retry reflex lands.
- **incremental build** — optional light gloss in the `.next/cache` discussion ("a build that reuses unchanged work from a previous build") if it reads as jargon.

Be sparing — four terms max. Skip anything lesson 1 already defined.

## Scope

**This lesson covers:** the complete four-job `ci.yml` (extending lesson 1's frozen spine); the per-command rationale (what `typecheck`/`lint`/`test`/`build` each catch that the others can't); the parallel-jobs-vs-one-fat-job trade-off and why parallel is the default; the job-name-equals-check-name discipline and the silent-gate-failure mode on rename; the env-at-build-time problem and its two fixes; the five-minute speed budget, the `.next/cache` lever, and the flake anti-reflex.

**Explicitly out of scope — do not teach (redirect or omit):**
- **GHA primitives** (workflow/job/step/runner model, triggers, `permissions`, `concurrency`, secrets mechanics, action pinning gradient, pnpm caching basics, `--frozen-lockfile`'s bug, expression syntax) — all owned by lesson 1 of this chapter and already taught. Restate any of these in at most one clause as a callback; never re-explain. The `ci.yml` header is frozen from lesson 1.
- **Supplementary / signal checks** — `pnpm audit`, `actionlint`, scheduled `markdown-link-check`, Dependabot config and grouping, the 2026 supply-chain layer (`pnpm audit signatures`, `minimumReleaseAge`, `strictDepBuilds`) — all owned by lesson 3. This lesson only draws the gate-vs-signal *line* (one sentence) to justify stopping at four; it does not teach the signal side.
- **The deploy workflow, OIDC trust policies, environment-scoped secrets** — owned by chapter 098 (deploy: lessons throughout; env scoping + OIDC: lesson 6; Neon-branch-per-preview: lesson 5; two-layer rollback: lesson 7). This lesson forward-references these for the env-at-build-time and "CI gate as release gate" points but wires none of them. Mention only that build produces the artifact deploy will consume.
- **The test framework itself** — Vitest config, `vitest.config.ts`, test projects, the honeycomb shape, AAA, factories, time/ID seams — all owned by Unit 18 (chapters 086–087+). `pnpm test` / `vitest run` is a black box here.
- **Biome configuration** — `biome.json`, rule selection, the formatter — owned by Unit 1. `pnpm lint` / `biome ci` is a black box.
- **The `tsc`/`next build` commands themselves and the `package.json` scripts** — the existence and meaning of `typecheck`, `lint`, `test`, `build` scripts is assumed from earlier units (TypeScript and the Next.js build are Unit 1). Reference the scripts; don't teach what `tsc --noEmit` or `next build` *are* from scratch — only what they *catch* in the CI context.
- **Required-status-check configuration as branch protection** — the ruleset itself (PR-required, approvals, code-owner review, linear history, the "required status checks" UI) is owned by chapter 096 lesson 4. This lesson references the ruleset as the consumer of the job names but does not teach how to author rulesets.
- **Bundle-size checks, Lighthouse, perf budgets, E2E tests in CI** — owned by Unit 19 and Unit 18 respectively. The speed budget here is about the four-job gate's wall-clock, not bundle/perf budgets; name nothing from those domains except the one-line `--shard` cut.
- **Migration testing against a Neon preview branch** — owned by chapter 099. The env-at-build-time section may mention a `DATABASE_URL` secret but does not wire a CI database or migrations.

**Prerequisites to restate concisely (one line each, not re-teach):** the lesson-1 single-job shape (checkout → pnpm setup → node+cache → frozen install → command); that the chapter 096 ruleset lists four required checks by name string; that the project commits `pnpm-lock.yaml` and CI installs with `--frozen-lockfile`; that the project has a Zod-based env validator from Unit 4.

## Code conventions notes

- **YAML / workflow files** are governed by lesson 1's canonical shape and the continuity notes, not by the TS-focused Code conventions doc. The frozen header and the verified action majors (`checkout@v6`, `setup-node@v6`, `action-setup@v4`) are the binding contract — match them exactly.
- The Code conventions doc confirms the surrounding project facts to keep consistent: pnpm 11+ with `packageManager` pinning and committed `pnpm-lock.yaml`; CI runs `pnpm install --frozen-lockfile`; `pnpm audit --prod` is a *non-blocking signal* job (reinforces this lesson's gate-vs-signal line — but the audit job itself is lesson 3); Node 24 LTS; Vitest as the runner with node/jsdom projects (black-boxed here). Integration tests run against a real Postgres — "Docker for local, **Neon branch for CI**" — which corroborates the env-at-build-time / `DATABASE_URL`-secret discussion; keep the CI-database wiring itself deferred to chapter 099 per scope.
- **Deliberate divergences to flag for downstream agents:** (1) the CodeVariants "four parallel jobs" tab trims the repeated setup steps to a `# ...same setup...` comment — this is a pedagogical simplification for clarity; the full runnable file is in the AnnotatedCode section. (2) The Dropdowns exercise shows a single job in isolation with blanks — a staged shape, not a full file. Both are intentional; note them so a reviewer doesn't "fix" them into full files.
