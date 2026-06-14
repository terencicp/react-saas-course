# Signal checks and dependency hygiene

**Title:** Signal checks and dependency hygiene
**Sidebar label:** Signal checks & dep hygiene

---

## Lesson framing

This is the third and final teaching lesson of Chapter 097. Lessons 1–2 built the **merge gate**: the frozen `ci.yml` spine (name / trigger pair / `permissions: contents: read` / concurrency cancel) and the four parallel jobs (`typecheck`, `lint`, `test`, `build`) whose names the branch-protection ruleset matches string-for-string. Lesson 2 ended by drawing the line this lesson is built around — "four checks gate the merge; everything else informs without blocking" — and naming the four supplementary categories: `pnpm audit`, a docs link-checker, a workflow linter, and Dependabot. **This lesson cashes that forward reference in.**

The lesson type is **Reference/survey + Decision**, ~40–50 min. It is NOT another "assemble a big YAML file" lesson — the load-bearing artifact (`ci.yml`) already exists. The two load-bearing senior diffs here are conceptual: (1) the **gate-vs-signal split** as a discipline, not a feature, and (2) **dependency hygiene as a closed loop** — keep deps current (Dependabot, grouped) *and* keep the act of updating them safe (release-age delay, signature/provenance scepticism, SHA-pinned actions kept current by Dependabot's own `github-actions` stream). Everything the student adds is small: two non-blocking jobs, one scheduled workflow, one Dependabot config, a few lines in `pnpm-workspace.yaml`.

Brainstorm conclusions that shape the whole lesson:

- **The central mental model the student leaves with:** a CI pipeline has two tiers with two different jobs. The **gate** answers "is this merge safe?" — small, fast, blocking, every check a true production-broken predicate. **Signal** answers "is the codebase healthy?" — broader, advisory, runs and reports but never blocks. The senior error this prevents: dragging a noisy check (a transitive-dep CVE with no exploit path, a 404 in the README) into the required list, training the team to bypass red checks, which corrodes the *real* gates. Frame this as a one-way ratchet: the cost of a false-positive gate is bypass habit.
- **Why the senior cares about dep hygiene at all** (the pain it relieves): an un-updated dep tree rots silently — security patches you never took, a major-version cliff that gets worse every month you defer it, and a fleet of one-PR-per-dep noise that the team learns to ignore. The relief is a *loop*: updates arrive grouped and on a cadence, each runs the full gate, patches can auto-merge themselves, and the few risky bumps get human eyes. Hygiene is keeping that loop turning, not a one-time `pnpm update`.
- **The 2026 supply-chain reality is the emotional hook.** Use the **Shai-Hulud worm** (Sept 2025, 500+ npm packages poisoned including `@ctrl/tinycolor`) and the **Mini Shai-Hulud waves of May 2026** (AntV ecosystem, `echarts-for-react`, dumped CI/CD secrets to thousands of public repos) as the concrete motivation. The killer detail for the senior mindset: the May 2026 wave produced the **first malicious npm packages carrying valid SLSA provenance** — so "it has provenance" is necessary, not sufficient. This is *why* the defense is layered (delay + scepticism + pinning), not a single checkbox. This complements Lesson 1, which already used the `tj-actions/changed-files` CVE (March 2025) for the *actions* SHA-pinning story — this lesson owns the *npm package* layer.
- **MAJOR factual correction the writer MUST honor (verified June 2026, see Fact-checking).** The chapter outline and the current Code conventions doc both say `minimumReleaseAge` / `blockExoticSubdeps` live in `.npmrc`. **That is now wrong.** In current pnpm, `.npmrc` is auth/registry only; these supply-chain settings live in **`pnpm-workspace.yaml`** (or the new global `config.yaml`). Also: pnpm 11 turns them **ON by default** (`minimumReleaseAge: 1440` = 24h, `blockExoticSubdeps: true`). Teach the `pnpm-workspace.yaml` location, frame the senior move as *raising* the default (e.g. 1440 → 4320 = 72h) and *verifying it's on*, not "adding it from scratch." Do not teach the `.npmrc` location.
- **Cognitive-load staging.** Open with the gate-vs-signal split (the organizing idea), then walk the four signal categories one at a time, each as: what it catches → the senior threshold it must cross to earn its weight → how it's wired (small code). Save the closed-loop synthesis (Dependabot + auto-merge + the safety net being the gate itself) for last, because it ties every prior thread together.
- **Code's role:** illustrative and small. No giant files. The biggest single block is the ~15-line `dependabot.yml`. Everything else is 2–6 line snippets. The interactive load is carried by one decision-walker (gate vs signal) and one classification drill, because the *judgment* is the lesson, not the syntax.
- **Scope discipline against re-teaching.** SHA-pinning gradient, `permissions`, concurrency, the four-job file, `--frozen-lockfile`, the trigger surface — all taught in Lessons 1–2. Reference them in one clause; never re-explain. `gh` CLI for Dependabot, auto-merge *mechanics* (the `gh pr merge --auto` / branch-protection queue) were taught in Chapter 096 lesson 3 — reference, don't re-teach.

---

## Lesson sections

### Introduction (no header)

Open by cashing in Lesson 2's closing line. Recall in one or two sentences: the gate is done — four jobs, named, blocking. Then pose the senior question implicitly: *a CI pipeline can run a dozen more things — vulnerability scans, link checks, workflow linting, automated dependency PRs — so which of those block a merge, and which just inform you?* State the lesson's payoff: by the end the student can (a) decide whether any new check belongs in the gate or as signal, (b) wire the four supplementary checks the way a 2026 SaaS repo actually does, and (c) close the dependency-hygiene loop so the dep tree stays current *and* the act of updating stays safe in a post-Shai-Hulud world. Keep it warm, ~5 sentences. Name the three concrete files they'll touch: two extra jobs in `ci.yml`, a scheduled `links.yml`, a `dependabot.yml`, plus a few lines in `pnpm-workspace.yaml`.

Rationale: the pedagogy doc wants the senior question implicit in the intro and the practical payoff previewed. This connects directly to what they just built rather than starting cold.

---

### Gate or signal: which checks get to block a merge

**The organizing idea of the lesson — teach this first and let everything hang off it.**

Content:
- Define the two tiers crisply. **Gate** = blocking, in the required-status-check list, every member a predicate for "this merge breaks production." **Signal** = runs and reports (may comment on the PR or open an issue), never blocks. Reuse Lesson 2's exact phrasing as the anchor: "four checks gate the merge; everything else informs without blocking."
- The senior reasoning for keeping the gate small: a false-positive *gate* is far more expensive than a false-positive *signal*, because a gate that cries wolf trains the team to bypass red — via "merge anyway," via branch-protection exceptions, via frustration — and that habit then leaks onto the *real* gates. One-way ratchet framing: it is cheap to promote a signal to a gate later once it's proven a true production predicate; it is expensive to walk back a bypass culture.
- The test to apply to any candidate check: *does a failure here mean production is broken (or will be on merge)?* Yes → gate. No → signal. Walk two worked examples to make the line concrete: a `tsc` error (gate — the type contract the whole codebase relies on is violated) vs. a moderate CVE in a transitive build-time dep with no exploitable path (signal — real to triage, wrong to block a Friday hotfix on).
- Name the four signal checks this lesson wires, as a roadmap: `pnpm audit` (known CVEs), a docs link-checker (rot), `actionlint` (workflow typos), Dependabot (keeping deps alive). Tell the student each is examined as: what it catches → when it earns its weight → how it's wired.

**Component — `StateMachineWalker` (`kind="decision"`, no `<Figure>` wrapper).** This is the centerpiece interactive and the right tool because the lesson IS the order of the senior's questions. Title e.g. "Gate or signal?". The walk:
- Root question: *"Does a failure here mean the merged code is broken in production?"* Branches: "Yes, provably" → next question; "No / only sometimes / needs triage" → leaf `signal`.
- Second question (the "yes" path): *"Can the check be fast and deterministic enough to run on every PR?"* Branches: "Yes" → leaf `gate`; "No — slow or flaky" → leaf `signal-for-now` (a check that *would* qualify but must be proven/sped-up before it's allowed to block; e.g. E2E, a long perf suite).
- Leaves: `gate` (verdict "Required status check" — typecheck/lint/test/build live here; promote a signal here only once it's a proven production predicate AND fast/deterministic). `signal` (verdict "Runs but never blocks" — audit, link-check, actionlint, Dependabot PRs; report, comment, or open an issue). `signal-for-now` (verdict "Signal until it earns the gate" — the honest home for checks that are real but too slow or too flaky to block today; flakes get fixed, not retried — callback to Lesson 2's anti-reflex).

Rationale: a committed one-path-at-a-time walk forces the *judgment sequence* (production-impact first, then feasibility) rather than presenting a flat table. The walker doc explicitly recommends this for "which do I reach for here" senior filters.

`Term` candidates in this section: **status check** (a pass/fail result a system reports against a commit; the ruleset's "required" list matches these by name — quick re-anchor from Ch096/L1, since the gate-vs-signal line depends on it).

---

### `pnpm audit`: known vulnerabilities as signal

Content:
- What it does: checks the installed dependency tree against the registry's advisory database, reporting vulnerabilities by severity (low / moderate / high / critical) with the affected dependency paths.
- The CI shape: a job in `ci.yml`, **deliberately not in the required-status-check list**. Command `pnpm audit --audit-level=high` — exits non-zero only on high/critical so moderate/low noise doesn't dominate. This is the first concrete instance of the gate-vs-signal split: same file as the gate jobs, but absent from the ruleset.
- The senior tuning decisions (this is where the judgment lives, not the command):
  - **Severity threshold.** `--audit-level=high` is the default starting point; the reflex is to tune the floor so the signal stays *read*. An audit that screams on every low-severity transitive advisory becomes an audit nobody reads — and "ignore the report" is the failure mode that defeats the whole point of having it.
  - **Prod vs. all.** `--prod` scopes to production dependencies, dropping dev-only tooling (test frameworks, build tools) from the report. Name the trade: a critical CVE in a dev dep is real but rarely production-exposed; `--prod` is the right lens when the signal you care about is "what ships to users."
  - **Triaged-but-unfixed advisories.** When a flagged CVE has been triaged as not-a-real-risk (no exploitable path, upstream is slow to patch), the IBM `audit-ci` tool allowlists by advisory ID with an expiry date so the rest of the signal stays meaningful. Name it as the escalation when plain `pnpm audit` has long-tail unfixed-but-harmless advisories; the default is plain `pnpm audit`. One sentence, not a walkthrough.

**Component — `Code` (single bash block).** The audit job: id, `runs-on: ubuntu-latest`, the same checkout / pnpm / setup-node+cache / `pnpm install --frozen-lockfile` setup beats (show them, but in prose note this is the identical setup spine from Lesson 2 — do NOT re-explain why pnpm precedes setup-node or why `--frozen-lockfile`; that was Lesson 1), then `- run: pnpm audit --audit-level=high`. Keep it tight. Use a one-line comment in the YAML marking it as not-in-the-gate (e.g. `# signal job — intentionally absent from the required-checks ruleset`).

Rationale: a plain `Code` block suffices because the job shape is already familiar from Lesson 2; the new information is one command plus the not-in-the-gate framing, which belongs in prose, not in stepped annotations.

`Term` candidates: **CVE** (Common Vulnerabilities and Exposures — a public catalog of known security flaws, each with an ID; the unit the advisory database speaks in). **transitive dependency** (a package you didn't install directly — a dependency of a dependency; the bulk of a real tree and where most advisories land).

---

### Keeping the supply chain honest: release age, provenance, and pinning

**The 2026-specific senior layer. This is the section that dates the lesson to "after Shai-Hulud" and is one of the two load-bearing diffs.** It sits right after `pnpm audit` because audit catches *known* CVEs *after* they're cataloged — this section is about the window *before* a compromise is known, which audit can't help with.

Content:
- **Motivate with the incident, briefly and concretely.** The Shai-Hulud worm (Sept 2025) stole maintainer credentials and self-propagated, poisoning 500+ packages including `@ctrl/tinycolor`; the Mini Shai-Hulud waves of May 2026 hit the AntV ecosystem and `echarts-for-react` and dumped stolen CI/CD secrets to thousands of public repos. The mental shift: the threat isn't only "a dep with a known bug" (that's `pnpm audit`'s job) — it's "a *legitimate* package whose latest version was published an hour ago by a compromised account." The whole defense is about the unknown-bad window.
- **Layer 1 — `minimumReleaseAge` (the highest-leverage, cheapest defense).** A package version must be at least N minutes old before pnpm will resolve it. Most malicious versions are detected and yanked within hours, so a delay filters the smash-and-grab waves automatically — you simply never install the bad version because you wait out its lifespan. **Location and default, taught correctly (verified June 2026):** this lives in **`pnpm-workspace.yaml`**, not `.npmrc` (`.npmrc` is auth/registry only now; `auditLevel` can also live in `pnpm-workspace.yaml`). pnpm 11 ships it **on by default at `1440`** (24h). The senior move is therefore *verify it's on and consider raising it* (e.g. `4320` = 72h for a team that can tolerate the lag), not "add it." Name the trade-out: too aggressive (e.g. two weeks) and you can't take a genuinely urgent same-day security fix — so the value is a dial, not a maximum.
- **Layer 2 — provenance and signatures, with the senior caveat.** `pnpm audit signatures` verifies installed packages against registry signatures; npm provenance (SLSA) attests where/how a package was built. **The crucial 2026 caveat that makes this a *layer* and not *the answer*:** the May 2026 wave produced the first malicious npm packages carrying *valid* SLSA provenance. So provenance proves "built by this pipeline from this source," which is necessary but not sufficient when the *pipeline itself* is compromised. Teach scepticism: signatures/provenance raise the bar, they don't close the door — which is exactly why you also delay (Layer 1) and pin (Layer 3).
- **Layer 3 — `blockExoticSubdeps` and pinned actions, named as the install-time / CI-time floors.** `blockExoticSubdeps: true` (also on by default in pnpm 11, also in `pnpm-workspace.yaml`) refuses sub-dependencies resolved from outside the configured registries — closing a quiet injection path. Then the one-clause callback: SHA-pinning GitHub Actions that touch secrets (Lesson 1's `tj-actions` lesson) is the *same instinct applied to the CI layer* — and the next section's Dependabot `github-actions` stream is what keeps those pins current instead of frozen-and-rotting. This sentence is the bridge into Dependabot.
- Senior synthesis for the section: no single control is sufficient — provenance can be forged, a pin can rot, audit only sees the known. Defense is the *stack*: delay the unknown (release age), distrust the single signal (provenance scepticism), constrain resolution (block exotic subdeps), pin and refresh the CI surface (SHA + Dependabot). The win is the layering.

**Component — `CodeVariants` (two tabs), to make the `.npmrc`-vs-`pnpm-workspace.yaml` correction unmissable.** Because the most likely failure (the writer's *and* the student's, given the stale convention) is putting these in the wrong file, surface it as an explicit wrong/right comparison:
- Tab "Wrong file (`.npmrc`)" — show `minimumReleaseAge` / `blockExoticSubdeps` written into `.npmrc` with `del=` strikethrough framing; prose first sentence: **"Silently ineffective."** `.npmrc` is auth/registry only now; pnpm doesn't read supply-chain settings from it, so the protection you think you set never engages.
- Tab "Right file (`pnpm-workspace.yaml`)" — the same two keys in `pnpm-workspace.yaml` with `ins=` framing, values shown as the *raised* senior choice (`minimumReleaseAge: 4320`); prose first sentence: **"Where pnpm actually reads them."** Note pnpm 11 already defaults these on (1440 / true); this file *raises and documents* the floor.

Rationale: a before/after CodeVariants is the doc's recommended shape for "incorrect vs correct," and it directly inoculates against the single most likely mistake given the outdated convention. One paragraph per tab, per the component's 6-line cap.

`Term` candidates: **provenance** (cryptographic attestation of where and how a package was built — the source repo and CI pipeline behind a published artifact). **SLSA** (Supply-chain Levels for Software Artifacts — the framework npm provenance attestations follow; pronounced "salsa"). **supply-chain attack** (compromising software by poisoning something upstream of you — a dependency, a build tool, a published package — rather than attacking you directly). **yank** (un-publishing or deprecating a bad package version from the registry so it stops resolving).

**Optional embedded video:** if the resourcer finds a short (<10 min), reputable, recent (post-Sept-2025) explainer on the Shai-Hulud npm worm or npm provenance, a `VideoCallout` fits well at the top of this section to make the threat vivid. Not required; only if a genuinely good, current one exists. Flag for resourcer.

---

### `actionlint`: linting the workflows that run everything

Content:
- The gap it closes: the workflow YAML is *itself* code that can be wrong, and its errors surface at **run time, not commit time** — a typo'd `uses:` reference, an undefined `${{ }}` expression, an invalid event trigger, a shell bug in a `run:` block all sail past commit and only blow up when the workflow fires. Frame the stakes precisely: this is a bug in the thing that runs the gate — "the gate's gate." A `pnpm/action-setup@v4` typo'd to `@v5` doesn't fail a job; it fails the *setup*, so the whole gate can't run.
- What `actionlint` does: a static checker that understands the Actions schema deeply (not a generic YAML linter) — it type-checks expressions, validates action inputs and runner labels, and runs shellcheck over `run:` blocks. Catches the above class at the speed of a lint.
- How it's wired: a job in `ci.yml`, scoped to PRs that touch `.github/workflows/**` (no point linting workflows on a PR that didn't change them). Mention the dev-side mirror — it also runs locally / as a pre-commit hook — in one clause; pre-commit hooks themselves are out of scope (Unit 1).
- Senior note on the action reference: use the maintained action wrapper for `rhysd/actionlint` so it's kept current via Dependabot's `github-actions` stream rather than a manual download-and-update dance. (Resourcer confirms the exact `uses:` slug and current version; do not hardcode an unverified one.) Consistent with Lesson 1's pinning posture: a utility lint action holding no secrets is fine pinned by tag.

**Component — `Code` (single bash/yaml block)** for the `actionlint` job: id, the `on`/path filter note (the path scoping can be shown as a comment or described in prose, since the file's top-level `on:` already fires on all PRs — keep this simple and don't introduce per-job trigger complexity that contradicts the frozen header; describe the `paths:` intent in prose and show just the job body with the `uses:` step). Keep the block to the job stanza.

Rationale: again a plain block — the novelty is one `uses:` step and the "gate's gate" framing, which is prose. Avoid over-engineering the trigger story; the frozen `ci.yml` header fires on all PRs and that's acceptable for a fast lint.

`Term` candidates: **shellcheck** (a static analyzer for shell scripts; actionlint runs it over `run:` blocks to catch quoting and command bugs). **linter** — likely already familiar from Unit 1; include only if the writer judges a quick re-anchor helps, otherwise skip.

---

### Catching docs rot on a schedule

Content:
- The problem: links in `README.md`, `AGENTS.md`, and `docs/**` go stale — 404s, moved domains, renamed repos. Low stakes individually, corrosive in aggregate (a README whose every third link is dead reads as an abandoned project).
- **Why this one is scheduled, not per-PR — the teachable judgment.** Running a link-check on every PR is the wrong cadence: a docs PR would re-check the whole tree and flag links it never touched, and a hotfix shouldn't wait on the README's external links resolving. The right shape is a **scheduled sweep** (e.g. Monday mornings) that checks `**/*.md` and **opens a GitHub issue** when something breaks — async, batched, doesn't sit in anyone's PR. This is a second concrete face of gate-vs-signal: not just "doesn't block," but "doesn't even run on the PR."
- The `schedule` trigger and its one sharp gotcha: `on: schedule: - cron: '...'` runs the workflow **as it exists on the default branch** — so a change to a scheduled workflow won't take effect until it's merged, and you can't test it on a branch by waiting for the cron. The senior hook: add `workflow_dispatch` to the same workflow so you can trigger a one-off run manually to test it. Name this explicitly — it's the standard "my scheduled workflow change isn't running" trap.
- Implementation sketch: a separate `links.yml` (this concern is independent of the PR gate, so it earns its own file — name the senior split rule: split workflows when triggers differ, fold when one trigger covers all). Runs a markdown link checker over `**/*.md`; on failure, opens an issue via a maintained create-issue action. Threshold: earns its weight once the docs surface is more than a handful of files; cut for a single-README repo.

**Component — `Code` (single yaml block)** showing the skeleton of `links.yml`: `name`, `on: { schedule: [cron], workflow_dispatch: {} }`, a single job with checkout + the link-check step + the open-issue-on-failure step (the latter two as `uses:` with resourcer-confirmed slugs, or as clearly-labelled placeholders if unconfirmed). Highlight (via `{}` meta) the `schedule` + `workflow_dispatch` pair — that pairing is the lesson of the block.

Rationale: the cron + `workflow_dispatch` pairing is the one genuinely new YAML idea in this section; a single annotated-via-meta block carries it. AnnotatedCode would be overkill for a ~12-line skeleton with one focal point.

`Term` candidates: **cron** (the `* * * * *` time-schedule syntax Unix inherited; GitHub uses it for `on: schedule`). Re-anchor only briefly — many students will know it.

---

### Closing the dependency loop with Dependabot

**The synthesis section — it ties hygiene (keep current), the supply-chain layer (keep safe), and the gate (the safety net) into one loop. Second load-bearing diff of the lesson.**

Content:
- The pain it relieves, stated as a loop not a tool: dependencies drift out of date the moment you stop looking; the fix isn't a heroic quarterly `pnpm update` but a turning loop — updates arrive on a cadence, grouped, each running the full gate, low-risk ones merging themselves, risky ones getting human review. Dependabot is the GitHub-native engine for that loop.
- **The three update streams worth enabling**, each with its reason:
  - `npm` — the JS dependency tree (the obvious one).
  - `github-actions` — **this is the answer to Lesson 1's open question**: "pin actions for safety, but how do you keep pins current instead of frozen-and-rotting?" Dependabot watches your `uses:` SHAs/tags and opens PRs to bump them. Call this back explicitly — it closes a debt Lesson 1 left open. (Fact-check note: the `github-actions` ecosystem entry uses `directory: '/'`, not a `.github/workflows` path — confirmed June 2026.)
  - `docker` — only if the repo has a Dockerfile; name and move on.
- **The grouping decision — the senior diff that makes Dependabot usable.** The old default opened one PR per dependency, drowning teams in 50 PRs/week, which the team then learned to ignore (note: same failure mode as a noisy audit — an ignored signal is worse than no signal). The modern config: a `groups:` block per ecosystem that collapses **minor + patch** updates into **one PR per ecosystem on a weekly cadence**, while **major** bumps stay as separate PRs because they carry API breakage and deserve individual review. Teach the *why* of the minor+patch-vs-major split (semver risk gradient), not just the keys.
- **Auto-merge, scoped to the lowest risk.** GitHub's auto-merge (the mechanics were taught in Chapter 096 lesson 3 — reference, do not re-teach the `gh`/branch-protection queue) pairs with Dependabot: a patch-update PR opens, runs the full four-job gate, and merges itself when green. **The senior boundary: auto-merge patch updates only; require human approval for minor and major.** The watch-out and its resolution in one move: a patch with a sneaky behavior change can slip through — and the answer is *the gate runs on Dependabot's PRs too*, so the test suite is the safety net. This is the moment the whole chapter closes on itself: the gate you built in Lesson 2 is what makes automated dependency updates safe to merge unattended.
- **Renovate, named and deferred.** The more configurable alternative (multi-platform, regex managers for non-package version pinning, shared org presets, finer auto-merge rules with stability windows). Reach for it when Dependabot's ceiling is real — auto-merging with a maturity window, updating versions in arbitrary files, shared config across many repos. The course default is Dependabot for simplicity. One short paragraph; do not tutorialize.

**Component — `AnnotatedCode` (single yaml block: `dependabot.yml`).** This is the one config in the lesson complex enough to warrant a stepped walkthrough, because the `groups:` + `update-types` structure is exactly the kind of multi-part block AnnotatedCode exists for. The block: `version: 2`, then two `updates:` entries (`npm` and `github-actions`), each with `directory`, `schedule: { interval: weekly }`, and a `groups:` block collapsing minor+patch. Steps (use `color`, prefer blue/green/orange per the doc):
1. `version: 2` and the `updates:` list shape — Dependabot reads one entry per ecosystem.
2. The `npm` ecosystem entry — `package-ecosystem: 'npm'`, `directory`, weekly schedule.
3. The `groups:` block on `npm` — `applies-to: version-updates`, `patterns: ['*']`, `update-types: ['minor', 'patch']`. **The focal step**: this is what collapses the flood into one weekly PR; majors fall out of the group and get their own PRs. Explain the semver-risk reasoning here. (All four keys verified against GitHub Docs June 2026: `applies-to` ∈ {`version-updates`, `security-updates`}; `update-types` ∈ {`patch`, `minor`, `major`}; `patterns` supports `*`; `schedule.interval` ∈ {`daily`, `weekly`, `monthly`, …}.)
4. The `github-actions` entry — same shape, and the callback: this is the stream that keeps Lesson 1's SHA pins current.

Verify exact key names/values (`package-ecosystem`, `applies-to`, `update-types` enum spelling) against current GitHub docs before finalizing — see Fact-checking; the writer must not invent keys.

Rationale: AnnotatedCode lets the single `dependabot.yml` be written once and the student's attention walked across its four meaningful regions — ideal when "one code block is complex and you need to focus attention on specific parts at a time" (the component's stated purpose). The `groups:` step is where the senior diff lives, so it gets the focal treatment.

`Term` candidates: **semver** (Semantic Versioning — the `major.minor.patch` contract where patch = fixes, minor = backward-compatible features, major = breaking changes; the basis for which Dependabot updates are safe to group and auto-merge). **auto-merge** — taught in Ch096/L3; re-anchor in one clause only, do not define at length.

---

### Putting the supplementary surface together

A short closing-synthesis section (not a watch-out dump — a content section that lands the mental model).

Content:
- **The file layout decision, stated as a rule.** Three steady-state files: signal jobs that share the PR trigger (`audit`, `actionlint`) fold into `ci.yml` as non-required jobs; the link-check rides its own `links.yml` because its trigger (schedule) is different; `dependabot.yml` is config, not a workflow. The rule: **split workflows when their triggers differ; fold when one trigger covers all.** (`pnpm-workspace.yaml` is dependency *resolution* policy, a fourth concern, separate again.)
- **The one mental model to leave with**, restated: two tiers. The gate is small, fast, and blocking because every member is a true production predicate. Signal is broad, advisory, and on its own cadence because its job is health, not safety. Dependency hygiene is the loop that keeps the tree current (Dependabot, grouped) *and* safe (release-age delay, provenance scepticism, pinned-and-refreshed actions) — and the gate you already built is what makes that loop safe to run unattended.
- The discipline that protects all of it: never quietly drag a noisy signal into the required list — it trains the bypass habit that corrodes the real gates. Promote a signal to the gate only once it's a proven production predicate and fast/deterministic.

**Component — `Buckets` (classification drill, `twoCol`).** This checks the lesson's core judgment directly. Two buckets: **"Gate (blocks merge)"** and **"Signal (runs, never blocks)."** Items (chips) to sort:
- Gate: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Signal: `pnpm audit --audit-level=high`, `actionlint`, the weekly link-check, a Dependabot version-update PR.
Instructions string: "Sort each check into the tier it belongs in on a 2026 SaaS repo." This is the cleanest possible assessment of the organizing idea and reuses the exact commands taught.

Rationale: `Buckets` is purpose-built for two-category classification, and the gate/signal split is inherently a sorting task — better than an MCQ because it forces a decision on every item, mirroring the real call a senior makes per check.

**Optional second exercise — `Dropdowns` (fenced, `dependabot.yml`).** If a knowledge check on the Dependabot config earns its weight, a fenced `dependabot.yml` with 2–3 blanks: the ecosystem value (`'npm'` vs decoys), the `update-types` array (`['minor', 'patch']` vs `['major']` vs `['*']`), and optionally the `schedule.interval` (`'weekly'`). Reinforces the grouping config's load-bearing values. Keep to one card; cut if the section is already long.

---

### External resources

`CardGrid` of 3–4 `ExternalResource` cards, matching the closing pattern of Lessons 1–2 (icon + iconColor, title, href, one-line description). Resourcer curates/confirms exact URLs and current versions. Candidates:
- pnpm — "Mitigating supply chain attacks" / supply-chain-security docs (grounds `minimumReleaseAge`, `blockExoticSubdeps`, `pnpm audit signatures`, and the `pnpm-workspace.yaml` location). icon `simple-icons:pnpm`, iconColor `#F69220`.
- GitHub Docs — "Optimizing the creation of pull requests for Dependabot version updates" (grounds the `groups:` + `update-types` config). icon `simple-icons:dependabot`, iconColor `#025E8C`.
- GitHub Docs — Dependabot options reference (the canonical `dependabot.yml` key reference). icon `simple-icons:github`.
- actionlint — `rhysd/actionlint` repo / usage docs (grounds the workflow-lint job and the maintained action wrapper). icon `simple-icons:github`.

---

## Scope

**Prerequisites — redefine in one clause each, do not re-teach:**
- The frozen `ci.yml` spine and four-job gate (`typecheck`/`lint`/`test`/`build`), the SHA-vs-tag pinning gradient, `permissions: contents: read`, `concurrency` cancel, the trigger surface, `pnpm install --frozen-lockfile`, the job-name = check-name discipline — all Lessons 1–2. Reference by name only.
- Auto-merge mechanics (`gh pr merge --auto`, branch-protection merge queue) and the `gh` CLI for Dependabot ops — Chapter 096 lesson 3. Reference, never re-explain.
- Biome / Vitest / `tsc` as tools — Units 1 and 18. Black-boxed here.

**This lesson does NOT cover (route elsewhere):**
- The four-job merge gate itself — Lesson 2 of this chapter.
- GHA primitives (workflow/job/step/action, runners, expressions) — Lesson 1.
- OIDC, environment-scoped secrets, deploy workflows — Chapter 098.
- Migration testing against a Neon preview branch, CI `DATABASE_URL` wiring — Chapter 099.
- Bundle-size checks, Lighthouse, perf budgets in CI — Unit 19. (May be named in one clause as "the same supplementary-check pattern extends to bundle reports," no more.)
- CodeQL / SAST / full security scanning — out of scope (Unit 16 at most). Name once if it helps frame `pnpm audit`'s lane; do not teach.
- License scanning — out of scope.
- Pre-commit hooks (Husky / lefthook) — Unit 1 / out of scope. The dev-side mirror of actionlint is one clause only.
- Renovate setup/config — named and deferred only; the course default is Dependabot.
- `audit-ci` setup — named once as the allowlisting escalation; not walked.

**Deliberate divergences from Code conventions (flag so downstream agents don't "fix"):**
- Code conventions §Supply chain still lists `minimumReleaseAge` / `blockExoticSubdeps` under `.npmrc`. This lesson **deliberately teaches `pnpm-workspace.yaml`** instead, because that is the current (June 2026) correct location — `.npmrc` is auth/registry only. The conventions doc is stale on this point; the lesson is right. (Worth a separate note to the human curator that §Supply chain needs updating.)
- Conventions phrase the audit job as `pnpm audit --prod`; this lesson leads with `pnpm audit --audit-level=high` and presents `--prod` as the scoping refinement. Compatible, not contradictory — flag as intentional emphasis.

---

## Notes for downstream agents

- The frozen `ci.yml` header (name / `on` pair / `permissions: contents: read` / `concurrency`) and the action pins (`actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v4`, Node 24) are **byte-for-byte fixed** by Lessons 1–2. Any `ci.yml` snippet here that shows setup steps must match exactly. Do not re-derive or re-teach the spine; reference it.
- Node 24, pnpm via the `packageManager` field, single quotes, 2-space indent — match the established stack. YAML uses 2-space indent.
- Do NOT re-teach the SHA-pinning gradient — Lesson 1 owns it (with the `tj-actions/changed-files` CVE-2025-30066). This lesson uses the *npm package* supply-chain incidents (Shai-Hulud) for the *package* layer, and references SHA-pinning only as the parallel CI-layer instinct that Dependabot's `github-actions` stream keeps current.
- Verify all `uses:` action slugs/versions and every `dependabot.yml` key (`package-ecosystem`, `applies-to`, `update-types`, `schedule.interval`, `groups`) against current docs before finalizing — the resourcer/fact-check pass owns this. Never ship an invented key.
