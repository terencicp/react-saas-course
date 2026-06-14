# GitHub Actions primitives

- **Title (h1):** GitHub Actions primitives
- **Sidebar label:** GHA primitives

## Lesson framing

This is the first lesson of Chapter 097 (Unit 20). The continuity notes are empty — nothing in this chapter has been authored yet, so this lesson sets the chapter's vocabulary and code shape that lessons 2 and 3 build on.

**The through-line (the senior question, stated implicitly in the intro, never as a section header).** In chapter 096 lesson 4 the student wrote a branch-protection ruleset that lists *required status checks by name string* — `typecheck`, `lint`, `test`, `build`. That ruleset is hollow: until a workflow runs and reports checks under those exact names, the gate enforces nothing. This lesson answers "where do those names come from, and what is the smallest slice of GitHub Actions I need to author the workflow that produces them." Every primitive is motivated by that one job. Open the lesson by reconnecting to the 096 ruleset (the student just wrote it) and naming the gap: the ruleset names checks; this lesson builds the machine that emits them.

**Scope discipline is the hardest part of this lesson.** Lesson 2 owns the four-job `ci.yml` baseline and the per-command rationale (what typecheck vs lint vs test vs build each catch). Lesson 3 owns supplementary jobs (`pnpm audit`, `actionlint`, link-check, Dependabot). This lesson stops at a **single-job** worked workflow (checkout → setup pnpm+node → frozen install → `pnpm typecheck`). The job count is deliberately one, not four, so the student learns the *anatomy* before the *composition*. State this constraint to downstream agents explicitly: do not write a four-job file here; the four-job file is lesson 2's load-bearing artifact and writing it here steals the payoff.

**Pedagogical stance.** Foreground decisions over syntax (course pillar). The student can read YAML and knows Git, pnpm, and the project's `package.json` scripts (Unit 1, Unit 3). So the teaching value is *not* "here is YAML syntax" — it is the mental model (workflow→job→step→action, parallel-by-default, fresh runner per job) and the four senior reflexes that travel with these primitives: least-privilege `permissions:`, `--frozen-lockfile`, `concurrency:` on PR workflows, and SHA-pinning actions that touch secrets. Each reflex is taught at the moment its primitive appears, never bundled into a "watch-outs" section.

**Cognitive-load sequencing.** Build the mental model first (diagram + vocabulary), then introduce the trigger surface (when does a workflow run), then walk one complete minimal file line-by-line with `AnnotatedCode` (this is the spine of the lesson), then layer the four reflexes onto that file one at a time. Each reflex lesson-section shows the *diff* from the bare file, so complexity is added incrementally to an artifact the student already understands rather than dropped in whole.

**Mental model the student leaves with.** "A workflow is a YAML file under `.github/workflows/`. GitHub watches my repo for events; a matching `on:` trigger starts the workflow. Each job gets a clean Ubuntu VM and runs steps top-to-bottom; jobs run in parallel unless I chain them with `needs:`. A step is either a shell command (`run:`) or a packaged action (`uses:`). The job's name becomes a status check on the PR — and *that name string* is the contract the ruleset enforces."

**What the student can do at the end.** Read any JS-project CI workflow and explain every line; author a minimal single-job workflow from scratch; know which actions every JS CI uses and in what order; set `permissions` to the floor; add `concurrency` to a PR workflow; explain why `--frozen-lockfile` and SHA-pinning are non-negotiable. They are *primed* to write the four-job gate in lesson 2.

**Real production stakes to weave in (not as a section, as motivation at the relevant points).** The March 2025 `tj-actions/changed-files` supply-chain incident (CVE-2025-30066 — an attacker force-pushed every version tag v1–v45.0.7 to a malicious commit that dumped CI runner memory, exposing secrets in the logs of 23,000+ repos) is the live reason SHA-pinning is a reflex, not pedantry — land it in the pinning section. Burned CI minutes and PR-queue pileups are the reason `concurrency:` exists. Silent lockfile drift (CI green against a different dep tree than `main`) is the reason for `--frozen-lockfile`.

## Lesson sections

### Introduction (no header — lesson intro prose)

Reconnect to chapter 096 lesson 4: the student wrote a ruleset that requires status checks named `typecheck`, `lint`, `test`, `build`, but nothing produces them yet — the gate is currently decorative. Name the lesson's job: learn the slice of GitHub Actions needed to author the workflow that emits those checks. Preview the concrete deliverable: by the end they will have read and understood a complete minimal workflow and know the four reflexes that make it production-shaped. Keep it to two short paragraphs, warm and terse, assumes competence. Forward-promise that the full four-job gate is lesson 2 so the student isn't surprised this lesson stops at one job.

### Workflows, jobs, steps, and runners

The core mental model. Teach the four-level hierarchy bottom-up in prose, then lock it with a diagram.

Concepts, in order:
- **Workflow** — a YAML file in `.github/workflows/`. One concern per file (`ci.yml` for the PR gate; `deploy.yml` later in chapter 098). Version-controlled, reviewed in PRs like any other code.
- **Job** — a workflow has one or more. Each job runs on its **own fresh runner** — a clean Ubuntu VM (`runs-on: ubuntu-latest`) with nothing carried over from other jobs. This isolation is *why* every job re-checks-out and re-installs; make this explicit because it's the thing beginners find wasteful and misunderstand.
- **Parallel by default; `needs:` to sequence.** Jobs in one workflow start simultaneously. `needs: [build]` makes a job wait for another to succeed first. State the senior reflex here in one line — parallelize aggressively, sequence only for true dependencies (e.g. a deploy that needs build to finish) — but do NOT expand into the four-parallel-vs-one-fat-job trade-off; that is lesson 2's decision. Just plant that jobs are independent VMs that run at once.
- **Step** — a job is an ordered list of steps, run top-to-bottom on that one runner. A step is *either* `run:` (a shell command) *or* `uses:` (a packaged action). One or the other, never both.
- **Action** — a reusable unit referenced by `uses:`, from the Marketplace (`actions/checkout`) or a path in the repo. Foreshadow one sentence: the same `uses:` mechanism is how the supply-chain risk enters, returned to in the pinning section.
- **The payoff line that ties back to the senior question:** each job's identifier becomes a **status check** on the PR, and that check's name is exactly what the ruleset matches against. This is the sentence the whole chapter hangs on — state it plainly here.

**Diagram (HTML+CSS, wrapped in `<Figure>`).** A nested-box containment diagram showing the hierarchy: outer box = the workflow file (`ci.yml`), containing two job boxes side by side (illustrating parallelism — label one `typecheck`, one `lint` so it reads as plausible CI), each job box containing a vertical strip of step rows (checkout → setup → install → run), and each job box stamped with a small "→ status check: typecheck" pill on its edge to make the job-name-becomes-check-name mapping visible. Horizontal layout for the two parallel jobs, capped height. Pedagogical goal: make "fresh runner per job," "steps are sequential within a job," "jobs are parallel," and "job name → check name" all visible in one glance. Prefer HTML+CSS over D2 here because the containment + the edge-pill annotation is a custom illustration, not a graph; follow the prose-margin reset gotcha (`margin: 0` on every inner element). `expandable` can stay default (no LeaderLine). Use saturated mid-tone fills with white text for the job boxes so it reads in both themes.

Consider a small `Buckets` exercise at the end of this section to check the model cheaply: two buckets, "Runs in parallel" vs "Runs in sequence," with items like "Two jobs with no `needs:`", "A deploy job with `needs: [build]`", "Three steps inside one job", "Two jobs where one lists the other in `needs:`". This forces the student to apply the parallel/sequential rule rather than recite it. Keep items phrased so they're not verbatim from prose.

### When a workflow runs: the trigger surface

The `on:` key. Name the five triggers a SaaS repo actually uses, then state which two the CI gate uses and why.

- `on: push` — fires on any push to any branch.
- `on: pull_request` — fires when a PR is opened, updated (synchronized), or reopened.
- `on: schedule` — cron-driven (named here; lesson 3 uses it for the weekly link-check, so keep it one line).
- `on: workflow_dispatch` — a manual "Run workflow" button in the Actions tab.
- `on: workflow_call` — makes a workflow callable from another (named once; the reusable-workflow abstraction earns weight at org scale, cut here).

**The CI baseline's trigger combo, explained.** `pull_request` + `push: branches: [main]`. Reason it out, don't just state it: every PR must run the gate (that's the whole point); and re-running on the merge to `main` verifies the *post-merge* state, because a PR that was green against a slightly stale base can still break `main` after the squash-merge (semantic conflict no rebase catches). This is a senior-diff worth one or two sentences. This trigger pair is the one the worked file below uses.

Small visual aid (optional, author's call): a compact two-column HTML mapping of trigger → "when it fires," styled as a simple definition strip inside `<Figure>`. Only add it if it reads cleaner than a prose list; a tight bulleted list may be enough. Do not over-build.

`Tooltip`/`Term` candidates in this section: **cron** (define inline since the student may not know the five-field syntax — one-line definition, don't teach the syntax, that's lesson 3's link-check job). **synchronize** (the PR event name for "new commits pushed to the PR branch" — non-obvious).

### Reading a minimal workflow line by line

The spine of the lesson. One complete, runnable ~30-line workflow that triggers on PR + push-to-main, sets `permissions: contents: read`, has a `concurrency` block, and runs a single job that checks out, sets up pnpm then Node with caching, installs with `--frozen-lockfile`, and runs `pnpm typecheck`. Present it with **`AnnotatedCode`** (`lang="yaml"`, `maxLines={18}` so the capped frame scrolls), stepping through it region by region. This is the right component because the file is one cohesive unit and the student's attention must be directed to each region in turn while the whole stays on screen.

The file (author the exact YAML to current conventions; this is the canonical shape downstream agents must reuse):

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

**Version note for the writer (fact-checked June 2026):** `actions/checkout@v6` and `actions/setup-node@v6` are the current majors; `pnpm/action-setup@v4` is current. Critically, **setup-node v6 changed caching behavior** — automatic caching now auto-enables only for npm; for pnpm the `cache: pnpm` input must be set *explicitly* (it is, in the file above). This makes the "caching the right way" section's `cache: pnpm` line load-bearing on v6, not optional. Re-verify these majors at authoring time and bump if newer majors shipped.

`AnnotatedStep` breakdown (each step one short paragraph, color-tinted, blue as default; vary color to separate concerns):
1. `name:` + `on:` block — the workflow's display name and its triggers. Tie `on:` back to the previous section.
2. `permissions: contents: read` — flag this is the least-privilege floor; one sentence here, full treatment in the dedicated section below (forward-reference it). Tint orange to mark "security reflex."
3. `concurrency:` block — flag it cancels superseded runs; one sentence, full treatment below. Tint orange.
4. `jobs:` → `typecheck:` → `runs-on: ubuntu-latest` — the single job and its runner. Point out `typecheck` is the job id and therefore the status-check name the ruleset matches.
5. `actions/checkout@v5` — clones the repo at the PR head SHA so the runner has the code.
6. `pnpm/action-setup@v4` then `actions/setup-node@v5` with `node-version: 24` + `cache: pnpm` — the ordering is load-bearing (pnpm action *before* setup-node so setup-node's cache integration can find pnpm). Flag the order explicitly; full caching treatment below. Tint green.
7. `pnpm install --frozen-lockfile` — the CI install invocation; one sentence, full treatment below.
8. `pnpm typecheck` — the command that *is* the job. Note this maps to the `tsc --noEmit` script defined in Unit 1 / the project's `package.json`; do not re-teach what typecheck does (that's lesson 2's per-command rationale) — here it's just "the one thing this job runs."

After the annotated walkthrough, add a one-paragraph "you can now read every line" beat and forward-reference that lesson 2 turns this single job into the four-job gate.

`CodeTooltips` candidate inside the block (if it doesn't fight `AnnotatedCode` — if it does, prefer prose): `${{ github.workflow }}` and `${{ github.ref }}` could carry hover definitions. Cleaner option: cover expression syntax in its own short subsection (below) rather than tooltips, since the file uses two expressions and the student will see more. Decide in favor of the subsection.

### The three actions every JavaScript CI uses

Zoom in on `actions/checkout`, `pnpm/action-setup`, and `actions/setup-node` — the trio that appears in every JS workflow — because the student will copy this setup block into every workflow they ever write. Teach what each does and the one ordering rule.

- **`actions/checkout`** — clones the repo into the runner at the commit under test (PR head SHA). Without it the runner is empty. Current major `@v6`.
- **`pnpm/action-setup`** — installs pnpm. With no `version:` input it reads the version from `package.json`'s `packageManager` field (the project pins it there per the supply-chain conventions) — call this out as the senior default: one source of truth for the pnpm version, the repo's `packageManager` field, not a hardcoded number in the workflow. Current major `@v4`.
- **`actions/setup-node`** — installs Node (pin `node-version: 24` to match the project's pinned Node 24 LTS) and, with `cache: pnpm`, wires the built-in dependency cache against `pnpm-lock.yaml`. Current major `@v6`. Note: on v6, pnpm caching is no longer automatic — `cache: pnpm` is required (see the caching section).
- **The ordering rule, stated as a rule:** `pnpm/action-setup` must come *before* `actions/setup-node`, because setup-node's `cache: pnpm` integration shells out to `pnpm` and needs it already on PATH. Reversed, the cache step fails. This is the single most common setup bug; give it its own sentence.

Pin-by-major here (`@v4`/`@v6`) is fine because these are first-party `actions/*` and trusted `pnpm/*` utility actions that don't receive `secrets`. Plant a one-line forward-reference to the pinning section: the calculus changes for actions that *do* touch secrets.

**Exercise:** a `Sequence` ordering drill — give the student the four setup steps shuffled (checkout, pnpm/action-setup, setup-node, `pnpm install --frozen-lockfile`) and have them order them. Source order = correct order. This directly drills the load-bearing ordering rule. Optionally include the bare step lines as a fixed code context block above the steps. This is preferable to an MCQ because ordering *is* the skill being tested.

### Caching the pnpm store the right way

Why caching matters and the senior diff: don't hand-roll it. Frame in production stakes — every uncached run pays the full cold-install cost, and a CI that's slow gets bypassed (the chapter's "fast feedback or the gate gets bypassed" thread, plant it here even though lesson 2 owns the five-minute budget).

- What `cache: pnpm` does: setup-node caches pnpm's content-addressable store directory, keyed on the hash of `pnpm-lock.yaml`; restores it before install, saves it after. Cold install on a 2026 SaaS app ≈ 80s; warm ≈ 30s. Give the numbers as ballparks (label them approximate) — concrete numbers make the value legible.
- **The v6 wrinkle (teach this — it's the senior diff that's easy to miss):** as of `setup-node@v6`, automatic dependency caching only auto-enables for npm; pnpm and yarn must opt in via the `cache:` input. So `cache: pnpm` is not boilerplate you could drop — omit it and you silently get *zero* caching and pay the cold-install cost every run. This is a recent breaking change; a workflow copied from an older v5-era example that relied on auto-caching will quietly regress.
- **The senior diff:** do not add a manual `actions/cache` step for the pnpm store. The built-in handles the common case; a hand-rolled cache with a wrong key is a *source of bugs* (stale cache → green CI that ships broken). Reach for manual `actions/cache` only when the built-in genuinely misses — rare.
- **One forward-pointer, kept to a sentence:** the Next.js *build* cache (`.next/cache`) is a separate concern from the pnpm store and may warrant a manual `actions/cache` when build time grows; that decision belongs to lesson 2's build job, so just name it and move on. Do not author a `.next/cache` cache step here.

Keep this section tight — it's one primitive (the `cache: pnpm` option already shown in the worked file) plus one reflex (don't hand-roll). No new code block needed beyond referencing the line already annotated above; if a code fragment helps, show only the three-line `setup-node` `with:` block via inline `Code`.

### Frozen installs: `pnpm install --frozen-lockfile`

The CI install invocation and the bug it prevents. This is short but load-bearing.

- What it does: installs strictly from `pnpm-lock.yaml`, refusing to mutate the lockfile. If `package.json` and the lockfile disagree, it *fails* instead of silently resolving a new tree.
- **The bug it prevents (lead with this):** without it, a stale lockfile silently gets rewritten during install, and CI passes against a *different dependency tree* than `main` actually has — the canonical "works in CI, breaks in prod" class. Frame as: CI's job is to test what will ship, and only a frozen install guarantees the dep tree under test equals the committed one.
- Note pnpm auto-enables frozen mode when it detects `CI=true`, but naming the flag explicitly is the senior reflex: intent is visible in the file, and the same workflow behaves identically when re-run outside CI. Tie to the conventions doc (the project commits `pnpm-lock.yaml` and CI runs `--frozen-lockfile` — this is the canonical rule, the student is implementing it).

No diagram. One or two `MultipleChoice` questions could check the *consequence* understanding (e.g. "what happens if the lockfile is out of date and the flag is omitted?") — but only add if it earns its place; a single well-phrased MCQ whose distractors are plausible (rewrites silently / errors loudly / installs nothing / ignores package.json) tests real understanding. Phrase so the answer isn't lifted verbatim from prose.

### Least-privilege permissions

The `permissions:` reflex. Teach the default-is-too-broad problem, then the rule.

- The `GITHUB_TOKEN` is an auto-provisioned token every workflow gets, scoped to the repo. Historically its default grant was broad write access; a compromised step (or a malicious dependency invoked in a step) could use it to push code, open releases, etc.
- **The rule:** set `permissions: contents: read` at the **workflow level** (the floor), and grant additional scopes at the **job level** only where a specific job needs them. Floor at the top, raise per job, never the reverse. A typecheck/lint/test/build CI needs only `contents: read`. A job that posts a PR comment needs `pull-requests: write` — and *only that job* gets it.
- Tie back to the worked file: the `permissions: contents: read` block they already saw is this floor. Reinforce that setting it explicitly also *overrides* whatever the org/repo default is, so the workflow is self-documenting and not at the mercy of org settings.

**Diagram (small, optional — author's call).** A simple two-row HTML strip inside `<Figure>`: top row "workflow default: `contents: read`" spanning full width; below it one job tile that adds `pull-requests: write` highlighted, the others inheriting read-only. Pedagogical goal: make "floor at workflow, raise per job" spatial. Keep it minimal; if prose + the already-shown code line suffice, skip the diagram rather than pad.

`Term` candidate: **`GITHUB_TOKEN`** (the auto-provisioned per-run token — non-obvious to a newcomer that it exists at all).

### Cancelling superseded runs with concurrency

The `concurrency:` reflex, framed in the CI-minutes/queue-pileup production stake.

- The problem: a developer pushes twice in two minutes; without concurrency control, both runs execute to completion, the first wasting a runner on already-stale code, the queue backing up, CI minutes burning.
- **The pattern (already in the worked file — reference it):** `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`. The `group` keys on workflow + ref so runs for the *same branch/PR* form one group; a new run in the group cancels the in-progress one. Walk what `github.ref` evaluates to so the grouping is concrete (the PR branch ref).
- **Reach:** set it on every PR-triggered workflow.
- **The watch-out, taught inline (not in a watch-out dump):** be careful scoping concurrency on a workflow that also runs production deploys — `cancel-in-progress: true` will kill a deploy mid-flight if a fast follow-up lands. The senior reflex is to scope concurrency tighter (or exclude the deploy job) once deploys are in the workflow. Keep this to two sentences and forward-reference chapter 098 for the deploy story; do not teach deploy concurrency here.

`Term` candidates: **`github.ref`** (the ref that triggered the run — branch or PR ref).

### Pinning actions, and the secrets they can reach

This section carries the chapter's "security defaults are non-negotiable" thread and the live-stakes incident. It folds together **secrets** and **action pinning** because they're the same risk surface: an action you trust with `secrets` can betray you if its tag is rewritten.

**Secrets, first (kept to what this lesson needs):**
- Where they live: repo settings → Secrets and variables → Actions (repo-level); environment-level secrets are gated to deployment environments (name once, chapter 098 owns environments).
- How they're read: `${{ secrets.NAME }}`, injected as step-level `env:` — `env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }`. The typecheck job in the worked file needs *no* secrets — say so, so the student doesn't cargo-cult them in.
- **The redaction caveat:** GitHub masks known secret *values* in logs, but a *derived* value (a JWT signed with the secret, a URL with the secret embedded) is not masked — echoing it leaks. One sentence, concrete.
- **OIDC, forward-referenced in one sentence:** for cloud credentials (Vercel deploys, AWS roles), prefer OIDC-issued short-lived tokens over long-lived secrets; chapter 098 lesson 6 owns the wiring. Name it, don't teach it.

**Action pinning, second (the payoff):**
- The risk: `uses: some/action@main` (or `@v1`) resolves a *moving* reference. If an attacker force-pushes that tag or branch to point at malicious code, every workflow referencing it by name runs the attacker's code on the next run — with whatever `secrets` are in scope.
- **The live incident (the motivation, fact-checked):** in March 2025 the popular `tj-actions/changed-files` action was compromised (CVE-2025-30066) — an attacker force-pushed every version tag (v1 through v45.0.7) to point at a malicious commit that dumped the CI runner's memory into the workflow logs, exposing secrets across 23,000+ repositories that referenced the action by mutable tag. This is *why* SHA-pinning is a reflex. Use these specifics; they're confirmed.
- **The rule, stated as a gradient:** pin trusted first-party utility actions (`actions/*`, `pnpm/*`) by **major tag** (`@v6`) for readability when they don't touch secrets; pin *any* action that is in scope of `secrets:` (or runs in a job that has elevated `permissions`) by **full commit SHA** (`@<40-char-sha>`), because a SHA is immutable — a tag is not. Connect back: this is exactly why the worked file's `actions/checkout@v6` / `setup-node@v6` are tag-pinned (no secrets in that job) and would be SHA-pinned in a deploy job that holds credentials. (Note the `tj-actions` attack rewrote *tags*, so a major-tag pin would not have saved a repo that gave that action secrets — only a SHA pin would; this is the crux, state it.)
- One sentence: keeping SHA-pinned actions current is Dependabot's `github-actions` ecosystem job — lesson 3 owns it. Name, don't teach.

**`CodeVariants` for the pinning gradient** — three tabs showing the same `uses:` line: `@main` (labeled "Mutable — runs whatever the ref points at today"), `@v6` (labeled "Major tag — fine for trusted utility actions with no secrets"), `@<sha>` (labeled "Immutable — required for anything that can read secrets"). Use `del`/neutral/`ins` framing and per-pane mark colors (red / blue / green). This is the right component: it's an A/B/C of the same line with a risk verdict per variant, exactly what `CodeVariants` is for. Keep each variant's prose to one sentence.

`Term` candidate: **OIDC** (acronym — "OpenID Connect; lets a workflow exchange a short-lived identity token for cloud credentials instead of storing a long-lived secret").

### Expression syntax, briefly

A short reference beat so the `${{ ... }}` the student saw isn't magic. Not a memorization section — name the surface and point to the docs.

- `${{ ... }}` is GitHub Actions expression interpolation, evaluated before the step runs.
- The handful that recur: `${{ github.* }}` (context about the event/repo — `github.workflow`, `github.ref`, `github.sha`, `github.event.pull_request.number`), `${{ secrets.* }}`, `${{ env.* }}`, `${{ matrix.* }}`. Used in `if:` conditions, `env:` values, and the `concurrency` group they already wrote.
- One sentence: the full context reference lives in the GHA docs; a senior reads it when needed rather than memorizing it. Add an `ExternalResource` card to the GitHub Actions contexts/expressions docs at the end of the lesson (External resources block) rather than inline.

Keep this section to a few lines — its job is to demystify, not to drill. No exercise.

### Naming the cuts: matrix, reusable workflows, runner choice

A single short "what a senior knows exists but the SaaS default skips" beat, so the student isn't surprised these exist and knows the threshold. Per the pedagogy's "trigger before tool" filter, name the threshold each crosses. Keep each to one or two sentences — this is a survey, not a teaching section.

- **Matrix strategy** (`strategy: matrix:`) — runs a job once per combination of variables (e.g. multiple Node versions). The legitimate use is *library* cross-version testing; a SaaS product ships one Node version on one OS, so the course defaults to single-config jobs. Named, cut.
- **Reusable workflows / composite actions** — `workflow_call` and `.github/actions/<name>/` extract repeated setup into one reference; earns weight at ~5+ repos that must share CI. For a single-repo SaaS the inline form is clearer. Named, cut.
- **Runner image pinning** — `ubuntu-latest` is a moving target (currently Ubuntu 24.04 in 2026); pin to `ubuntu-24.04` only once a runner upgrade has burned the team. Accept the moving target until then. State the senior call (pin-when-burned) rather than a blanket rule.
- **Self-hosted runners** — for specialized hardware or private-network access; the course defaults to GitHub-hosted. Named once, cut.

Group these so the section reads as "here's the surface you're deliberately not using yet, and why." Do not let it sprawl.

### External resources (optional LinkCards / ExternalResource)

`ExternalResource` cards (place at the very end, after the body):
- GitHub Actions — "Workflow syntax for GitHub Actions" (the `on`/`jobs`/`steps`/`permissions` reference).
- GitHub Actions — "Contexts" / "Expressions" reference (the `${{ }}` surface named above).
- GitHub Actions — "Security hardening for GitHub Actions" (the SHA-pinning + `permissions` + `GITHUB_TOKEN` source).
- Optional `VideoCallout`: only if a current, high-quality (2025–2026) GHA primitives walkthrough is found that genuinely adds over the prose; the resourcer can drop one in. Do not require it — the worked-file walkthrough already carries the visual load. If included, it must cover workflow/job/step + caching, not a generic "intro to CI" talk.

## Scope

**Prerequisites to restate concisely (one line each, do not re-teach):** the student wrote a branch-protection ruleset in chapter 096 lesson 4 that names required status checks by string (the gap this lesson fills); pnpm is the package manager with the version pinned in `package.json`'s `packageManager` field and `pnpm-lock.yaml` committed (Unit 3 / supply-chain conventions); the project's `package.json` defines a `typecheck` script (`tsc --noEmit`) (Unit 1); Node 24 LTS is the pinned runtime (Unit 1); YAML syntax (assumed, do not teach).

**This lesson does NOT cover (route each to its owner):**
- The four-job `ci.yml` baseline and the per-command rationale (what typecheck/lint/test/build each catch) — **lesson 2**. This lesson stops at a single typecheck job.
- The parallel-four-jobs-vs-one-fat-job trade-off and the five-minute speed budget — **lesson 2**. Plant only "jobs run in parallel" here.
- `pnpm audit`, `actionlint`, scheduled link-check, Dependabot config + grouping + patch auto-merge — **lesson 3**. The 2026 supply-chain *signature* layer (`pnpm audit signatures`, `minimumReleaseAge`, `strictDepBuilds`) is also lesson 3 / the conventions doc; this lesson covers only action *pinning* and the secrets surface.
- OIDC trust policies, environment-scoped secrets, env vars across dev/preview/prod, and deploy workflows — **chapter 098**. Name OIDC and environments in one sentence each, no wiring.
- The `.next/cache` build-cache step — **lesson 2** (named, not authored here).
- Required-status-check naming *as branch protection* (the ruleset side) — **chapter 096 lesson 4** (already taught; reference it).
- The `typecheck`/`lint`/`build` *commands themselves* — **Units 1 and 3**.
- The test framework — **Unit 18**.
- `cron` five-field syntax — touched as a named trigger only; the scheduled link-check that uses it is **lesson 3**.

Define prerequisite concepts in a clause, not a paragraph. The single biggest scope risk is drifting into the four-job file or the per-command rationale — downstream agents must keep the worked artifact to one job.

## Code conventions notes for downstream agents

- The worked workflow above is the **canonical shape** for the chapter — lessons 2 and 3 extend it, so keep names (`CI`, job id `typecheck`), trigger pair, `permissions: contents: read`, and the `concurrency` group string identical to what's authored here.
- Use **single job `typecheck`** deliberately; this is a pedagogical staging decision (anatomy before composition), noted here so a downstream agent doesn't "complete" it into four jobs.
- Pin action majors as shown (`checkout@v6`, `setup-node@v6`, `pnpm/action-setup@v4`, fact-checked current June 2026); re-verify at authoring time and bump if a new major shipped. `node-version: 24` matches the project's pinned Node 24 LTS. `setup-node@v6` requires explicit `cache: pnpm` (auto-caching is npm-only on v6) — keep the input.
- `--frozen-lockfile`, the `packageManager`-sourced pnpm version, and `pnpm-lock.yaml` committed are straight from the supply-chain section of the conventions doc — present them as the course's existing rule the student is now wiring into CI, not as new policy.
- YAML, not TS, so the TS function-form/naming rules don't apply; the relevant conventions are the supply-chain/tooling section (pnpm, frozen install, pinning) and the security baseline (least privilege, secrets never logged).
