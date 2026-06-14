# Chapter 097 — The CI gate on GitHub Actions

## Lesson 1 — GitHub Actions primitives

**Taught:** GHA mental model (workflow → job → step/action), the trigger surface, a single-job minimal `ci.yml` (typecheck only), and four production reflexes: `permissions: contents: read`, `--frozen-lockfile`, `concurrency:` cancel-in-progress, and action pinning by SHA vs. major tag.

**Cut:** `actionlint` mentioned in the chapter outline but explicitly routed to lesson 3; `.next/cache` manual cache step named but deferred to lesson 2; parallel-four-jobs vs. one-fat-job trade-off deferred to lesson 2; `pnpm audit signatures` / `minimumReleaseAge` deferred to lesson 3; OIDC wiring deferred to chapter 098.

**Debts:**
- Lesson 2 owns: the four-job `ci.yml`, per-command rationale (what each of typecheck/lint/test/build catches), the five-minute speed budget, `.next/cache` caching, and the fat-job vs. parallel trade-off.
- Lesson 3 owns: `pnpm audit`, `actionlint`, scheduled link-check, Dependabot config, `pnpm audit signatures` / `minimumReleaseAge` / `strictDepBuilds`.
- Chapter 098 owns: OIDC trust policies, environment-scoped secrets, deploy workflows.
- Lesson 1 states SHA-pinned actions are kept current by Dependabot's `github-actions` ecosystem — lesson 3 must deliver that config.

**Terminology:**
- **workflow** — YAML file under `.github/workflows/`; one concern per file (`ci.yml`, `deploy.yml`).
- **job** — runs on a fresh Ubuntu runner; its id string becomes the PR status-check name matched by the ruleset.
- **runner** — clean VM GitHub provisions per job, then destroys.
- **step** — either `run:` (shell) or `uses:` (action), never both.
- **action** — reusable step referenced by `uses:`; supply-chain risk entry point.
- **`GITHUB_TOKEN`** — auto-provisioned per-run token; default was historically broad write.
- **`github.ref`** — the ref that triggered the run (branch or PR ref); used in concurrency group key.
- **OIDC** — short-lived identity token alternative to long-lived secrets for cloud credentials (named, not wired here).
- Mental model phrase: "the job's name string is the contract the ruleset enforces."

**Patterns and best practices:**
- Canonical single-job `ci.yml` shape (lessons 2 and 3 extend this exact file — names, trigger pair, permissions block, and concurrency group string must stay byte-for-byte):
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
  ```
- Action major versions fact-checked June 2026: `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v4`.
- `pnpm/action-setup` **must** precede `actions/setup-node` — setup-node's `cache: pnpm` shells out to `pnpm` to find the store.
- `setup-node@v6` requires explicit `cache: pnpm`; auto-caching is npm-only on v6 (silent regression if omitted).
- `pnpm/action-setup` with no `version:` input reads from `package.json`'s `packageManager` field — one source of truth.
- `--frozen-lockfile`: fails loudly when `package.json` and lockfile disagree instead of silently rewriting and testing a different dep tree.
- `permissions: contents: read` at workflow level = floor; grant additional scopes at job level only where needed.
- Pin utility actions (`actions/*`, `pnpm/*`) by major tag when the job holds no secrets; pin by full 40-char commit SHA when the action is in scope of secrets or elevated permissions.
- `concurrency:` with `cancel-in-progress: true` is appropriate for pure CI; must be scoped more tightly once deploy jobs enter the workflow (deploy cancellation mid-flight is dangerous — chapter 098 owns that).

**Misc:**
- The `tj-actions/changed-files` CVE-2025-30066 (March 2025) is the live supply-chain incident used to motivate SHA pinning — 23,000+ repos affected by force-pushed version tags v1–v45.0.7.
- Chapter outline listed `checkout@v4`/`setup-node@v4` but lesson used the June 2026 verified majors (`@v6`); lesson 2/3 authors must use `@v6` to match.
- Trigger rationale taught: `pull_request` tests the branch; `push: branches: [main]` tests the post-merge state (catches semantic conflicts no rebase catches).

---

## Lesson 3 — Signal checks and dependency hygiene

**Taught:** Gate-vs-signal discipline (gate = production-broken predicate, fast, blocking; signal = health, never blocks); four signal checks wired: `pnpm audit --audit-level=high` and `actionlint` as non-required jobs in `ci.yml`, a scheduled `links.yml` (Monday cron + `workflow_dispatch`), and `dependabot.yml` with `groups:` collapsing minor+patch per ecosystem; supply-chain layering (release-age delay, provenance scepticism, exotic-subdep blocking); `minimumReleaseAge`/`blockExoticSubdeps` confirmed in `pnpm-workspace.yaml` only (not `.npmrc`).

**Cut:** `pnpm audit signatures` mentioned but not wired (chapter outline listed it; lesson defers to pnpm docs); bundle-size check, CodeQL, license scanning named and deferred to Unit 19/Unit 16; pre-commit hook for actionlint mentioned in one clause only; `audit-ci` allowlisting named but not walked; Renovate named and deferred; docker Dependabot stream named and deferred; Lesson 3 chapter-outline cite of `strictDepBuilds` — lesson used `blockExoticSubdeps` only, which is the correct current pnpm 11 key.

**Debts:**
- Chapter 098 owns: OIDC wiring, deploy workflow, env scoping across dev/preview/prod.
- Chapter 099 owns: migration testing against Neon preview branch; CI `DATABASE_URL` wiring.
- Unit 19 owns: bundle-size check, Lighthouse, perf budgets in CI.
- Auto-merge mechanics (`gh pr merge --auto`, merge queue) are taught in Ch096/L3 — this lesson references them, does not re-teach.

**Terminology:**
- **gate** — blocking checks in the required-status-check list; predicate for "this merge breaks production."
- **signal** — non-required checks that run and report but never hold a merge.
- **status check** — pass/fail result reported against a commit; the ruleset's required list matches by name string.
- **CVE** — Common Vulnerabilities and Exposures; the advisory-database ID unit.
- **transitive dependency** — a package not directly installed; dependency of a dependency.
- **supply-chain attack** — compromising software by poisoning something upstream (dep, build tool, published package).
- **provenance** — cryptographic SLSA attestation of where/how a package was built; necessary but not sufficient when the pipeline itself is compromised (May 2026 wave).
- **SLSA** — Supply-chain Levels for Software Artifacts; pronounced "salsa."
- **yank** — un-publishing/deprecating a bad package version from the registry.
- **cron** — `* * * * *` time-schedule syntax; used in `on: schedule`.
- **semver** — `major.minor.patch` contract; basis for Dependabot grouping risk split.
- **auto-merge** — merging a PR automatically once required checks pass (mechanics in Ch096/L3).
- **shellcheck** — static analyzer for shell scripts; actionlint runs it over `run:` blocks.
- One-way ratchet framing: "a check earns its place in the gate; it isn't granted it."

**Patterns and best practices:**
- `pnpm audit --audit-level=high` as the audit command (exits non-zero on high/critical only); `--prod` as the scoping refinement for production-only signal; `audit-ci` as the allowlisting escalation for long-tail harmless advisories.
- `minimumReleaseAge` and `blockExoticSubdeps` live in **`pnpm-workspace.yaml`**, not `.npmrc`. pnpm 11 defaults: `minimumReleaseAge: 1440` (24h), `blockExoticSubdeps: true`. Senior move: raise `minimumReleaseAge` to `4320` (72h) and document it explicitly.
- `dependabot.yml` canonical shape: `version: 2`, two `updates:` entries (`npm` and `github-actions`), each with `directory: '/'`, `schedule: { interval: 'weekly' }`, and a `groups:` block: `applies-to: version-updates`, `patterns: ['*']`, `update-types: ['minor', 'patch']`. Majors fall out and get individual PRs.
- `github-actions` Dependabot stream is the answer to "pin by SHA but keep pins current" — closes the debt Lesson 1 left open.
- Scheduled workflow rule: always add `workflow_dispatch: {}` alongside `on: schedule` so the workflow can be triggered manually for testing (scheduled workflows run on the default branch's version, not feature branches).
- Workflow file split rule: **split workflows when their triggers differ; fold when one trigger covers all.** (`audit` + `actionlint` → fold into `ci.yml`; link-check → own `links.yml`; Dependabot → `dependabot.yml` config, not a workflow.)
- Auto-merge scope: patch updates only; require human for minor and major; the four-job gate runs on Dependabot PRs too — the gate is what makes automated merges safe.
- `permissions: issues: write` required in `links.yml` to open issues on failure (raised above the `contents: read` floor for that scope only).
- actionlint uses: a maintained wrapper action around `rhysd/actionlint`; pinned by tag (no secrets in scope); no pnpm/node setup needed — just checkout + the lint action.

**Misc:**
- The Shai-Hulud worm (Sept 2025, 500+ npm packages, `@ctrl/tinycolor`) and Mini Shai-Hulud waves (May 2026, AntV/`echarts-for-react`, dumped CI/CD secrets) are the named supply-chain incidents motivating the release-age layer. May 2026 wave: first malicious npm packages carrying valid SLSA provenance — provenance is necessary not sufficient.
- Code conventions §Supply chain is stale: it still lists `minimumReleaseAge`/`blockExoticSubdeps` under `.npmrc`. This lesson deliberately teaches `pnpm-workspace.yaml`. Flag for curator.
- Code conventions phrase the audit job as `pnpm audit --prod`; lesson leads with `--audit-level=high` and presents `--prod` as a refinement — compatible, not contradictory.
- `actions/cache@v4` (introduced in Lesson 2 for `.next/cache`) was NOT covered under supply-chain/SHA-pinning in either lesson — it was a performance lever, not a security discussion. Quiz/future authors: don't assume SHA-pinning reasoning was applied to it here.
- The `dependabot.yml` `github-actions` entry uses `directory: '/'`, NOT a `.github/workflows` path — verified June 2026.
- Action slugs confirmed in final MDX: actionlint wrapper = `reviewdog/action-actionlint@v1` (tag pin, no secrets); link-checker = `lycheeverse/lychee-action@v2`; create-issue = `peter-evans/create-issue-from-file@v5` (reads `./lychee/out.md`). Chapter outline cited `markdown-link-check` by name; lesson uses lychee instead.
- VideoCallout embedded at top of supply-chain section: Fireship video `gwTQLZSIlsU`, ~6 min — framed as the May 2026 TanStack wave showing how a `pull_request_target` workflow leaked a publish token through signed provenance, and why pnpm 11 defaults would have stopped it.

---

## Lesson 2 — The four-job merge gate

**Taught:** Completed `ci.yml` with four parallel jobs (`typecheck`, `lint`, `test`, `build`); per-command rationale (what each catches the others can't); parallel-vs-fat-job trade-off (parallel default for failure granularity); job-name-equals-check-name discipline and silent gate failure on rename; env-at-build-time problem and its two fixes (prefer dynamic rendering first, then `env:` from `secrets:` scoped minimally); five-minute speed budget as a load-bearing senior reflex; `.next/cache` via `actions/cache@v4`; test sharding named and cut; flaky-test anti-reflex (fix, don't retry).

**Cut:** `--reporter=github-actions` on Vitest (named in chapter outline, not taught here — black-boxed as "vitest run"); `biome ci` vs `biome check --write` dev-side workflow (chapter outline detail, not surfaced); reporting/annotations detail (tsc `--pretty`, Biome problem-matcher format); reporter wiring for sharded runs (`blob` reporter + `--merge-reports`) — dropped with the shard cut.

**Debts:**
- Lesson 3 owns: supplementary/signal checks (`pnpm audit`, `actionlint`, link-check, Dependabot); the gate-vs-signal split is stated in one sentence here (forward-referenced to lesson 3) but not elaborated.
- Chapter 098 owns: full env-scoping story across dev/preview/prod; OIDC replacing long-lived secrets; deploy workflow triggered on `needs: [typecheck, lint, test, build]`. Lesson explicitly defers env-scoping to "chapter 098 lesson 6" and OIDC to that chapter.
- Chapter 099 owns: migration testing against Neon preview branch; CI database wiring for `DATABASE_URL`.

**Terminology:**
- **wall-clock time** — real elapsed time from start to finish, vs. total compute time summed across parallel jobs.
- **static pre-rendering / pre-render** — Next.js generating page HTML at build time rather than per request (used to explain why `next build` hits the DB).
- **flaky test** — a test that passes or fails non-deterministically on identical code.
- Gate-vs-signal line: "four checks gate the merge; everything else informs without blocking."
- Composite action: earns weight at 5+ repos, not a single repo — the repeated setup is the price of isolation.

**Patterns and best practices:**
- Complete canonical `ci.yml` (extends lesson 1's frozen spine exactly — same name, trigger pair, permissions, concurrency group string):
  ```yaml
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
      # ...same setup steps...
      - run: pnpm lint
    test:
      # ...same setup steps...
      - run: pnpm test
    build:
      # ...same setup steps...
      - run: pnpm build
  ```
- Any rename of a CI job requires a two-file PR (workflow + ruleset); job id = the exact string the ruleset matches, no tooling covers this seam.
- `SKIP_ENV_VALIDATION=true` used only at build time when build-time DB read would block; never at runtime, never in production.
- `.next/cache` via `actions/cache@v4` (pin `@v4` — v1–v3 sunset Feb 2025): cache keyed on `pnpm-lock.yaml` + `**/*.{ts,tsx}` hash; restore-keys on lockfile alone. Reach when build time > 2 min.
- Speed budget: baseline must finish under 5 min wall-clock on warm cache (cold ~6–8 min, warm ~3–5 min); slow gate gets bypassed.
- Test sharding threshold: >500 tests or >2 min — past typical SaaS startup surface area, not in baseline.
- Flaky tests: retry-on-failure hides the flake; only durable fix is fix the test.
- Build env: prefer dynamic rendering for DB-backed pages (eliminates build-time DB dependency); when build genuinely needs a value, expose as job-level `env:` from `secrets:` scoped minimally.

**Misc:**
- Chapter outline mentioned `--reporter=github-actions` for Vitest and "reporting/annotations" as a topic; lesson treats `pnpm test` / `vitest run` as a black box (Unit 18 owns the framework). Lesson 3/quiz authors: do not assume the reporter was taught here.
- Deliberate divergences in lesson components (do not "fix"): CodeVariants "Four parallel jobs" tab trims repeated setup to `# ...same setup steps...` comment (full file is in AnnotatedCode); Dropdowns exercise shows a single job with blanks, not the full four-job file.
- `actions/cache@v4` pin called out explicitly in lesson; lesson 3 authors note this was NOT covered under the supply-chain/SHA-pinning discussion — it was introduced as a performance lever.
