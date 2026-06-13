# Rulesets that enforce the workflow

- Title: Rulesets that enforce the workflow
- Sidebar label: Branch rulesets

## Lesson framing

Final teaching lesson of Chapter 096 (quiz is L5). L1–L3 taught the workflow as *discipline*: trunk-based, small PRs, squash-merge, CODEOWNERS routing. This lesson makes it *mechanically true*. The spine, set by the chapter's thread, is **structural enforcement over discipline** — a rule the platform refuses to let you break beats a team norm everyone hopes holds.

The single load-bearing mental model the student must leave with: **where each piece lives, and what gives it teeth.** Two surfaces:
1. The `.github/` directory — in-repo, version-controlled, changes ride the normal PR review. Holds *configuration* (CODEOWNERS, PR template, workflows, `dependabot.yml`).
2. Repo Settings → Rules → Rulesets — lives in GitHub, *not* in the repo tree. Holds the *enforcement*.

The recurring "aha" is the **enforcement gap**: a `.github/` file alone is a *suggestion*; the same file paired with the matching ruleset clause is *required*. CODEOWNERS is the canonical case — without `Require review from Code Owners` it only auto-requests reviewers who can be ignored; with it, their approval blocks the merge. Teach every config-plus-rule pair through this lens.

Second framing: **the minimum-viable baseline vs. the senior reach.** Six rules every production `main` ships with, justified one line each by "what breaks the day you don't have it." Then ~five reach rules introduced trigger-first (the pedagogical "trigger before tool" rule) — named, with the threshold that earns each, not dumped as a checklist.

Target student: junior dev who has been merging their own PRs at will and has never configured a repo's settings. They have followed the workflow in L1–L3 by hand. The pain this relieves: "one bad Friday undoes the whole discipline" — a force-push to `main`, an unreviewed hotfix, a CI that ran but didn't gate. The skill at the end: stand up the six-rule ruleset on a fresh repo, wire CODEOWNERS to it, know which reach rules to add and when, and diagnose the silent-gate-disappears failure modes.

This lesson is config/settings-heavy, almost no application code. Two consequences for authoring:
- **GitHub's UI is volatile** — screenshots age within months. Use *exactly one* orienting `Screenshot` of the ruleset creation panel as a visual anchor; carry everything else with conceptual diagrams and the exported ruleset JSON (stable where pixels aren't).
- The ruleset *is* the artifact. Show it as **JSON via AnnotatedCode** so "those six clicks" become a concrete, inspectable object — this also de-mystifies the settings-as-code option named later.

Keep cognitive load down: build the six-rule baseline first (concrete, do-it-now), *then* layer reach rules, *then* the failure modes. Don't front-load the legacy-vs-rulesets history — name it once early so the student isn't confused by stale tutorials, then move on.

Estimated time 35–45 min (per chapter outline). Pacing is Setup/wiring + Pattern; the six-rule baseline is the load-bearing artifact.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. Three one-line disaster scenes from the chapter outline: a teammate force-pushes `main` to fix a typo and rewrites everyone's history; a Friday-evening fix lands with zero review; CI is green but was configured to gate nothing. Land the thesis: the L1–L3 workflow is only as real as its enforcement. Name the mechanism — GitHub **rulesets** — and preview the deliverable: the six-rule baseline every production repo runs, plus the reach past it. Connect back: L3 left CODEOWNERS as a suggestion and promised L4 would give it teeth — this is that lesson. Keep it warm, ~2 short paragraphs.

### Rulesets, not branch protection rules

Short orienting section, deliberately brief — its job is to inoculate against stale tutorials, not to teach two systems.

- GitHub has two mechanisms for the same job: **branch protection rules** (the original, per-branch, still functional) and **rulesets** (the newer replacement). Rulesets are what the course teaches and what new repos surface in the UI.
- Why rulesets win for a 2026 team, three bullets max: multiple branch patterns in one rule, layered/stackable enforcement, and **bypass lists with an audit trail** (named here, detailed later). Both mechanisms enforce the same primitives — the migration is mechanical, so a tutorial showing the old "Branches → Add rule" screen teaches the same concepts under an older UI.
- One sentence: GitLab/Bitbucket have equivalents (push rules, merge-request approval rules); the course teaches GitHub. Do not expand.

`Term`: ruleset; branch protection rule. Keep this section to ~3 short paragraphs — resist teaching the legacy UI in parallel.

### The two surfaces: `.github/` files and the ruleset

This is the mental-model anchor. Lead with it before any specific rule so the student has the frame to hang every rule on.

Teach the split explicitly:
- **`.github/` directory** — lives in the repo tree, version-controlled, every change goes through the same PR review as code. This is *enforcement configuration*: `CODEOWNERS`, `pull_request_template.md` (named in L3), `workflows/*.yml` (Ch097), `dependabot.yml` (Ch081/Ch097). The pattern and the *why*: putting policy config in-repo means changes to who-must-review and what-CI-runs are themselves reviewed, diffable, and revertable.
- **Repo Settings → Rules** — lives in GitHub's settings, *not* in the repo tree. This is the *enforcement itself* (the ruleset). The reason it sits apart: GitHub does not yet auto-apply a ruleset JSON committed to the repo, so the active rule lives in settings. (This sets up the settings-as-code note later — the gap is real and tools try to close it.)
- The relationship: the ruleset *references* things defined in `.github/` — it names the status checks that `workflows/*.yml` produces, and it activates the `CODEOWNERS` file. The file is the *data*; the rule is the *switch*.

**Diagram — the two surfaces (HTML+CSS in `<Figure>`).** Two side-by-side labeled zones. Left zone "In the repo (`.github/`)" listing `CODEOWNERS`, `pull_request_template.md`, `workflows/ci.yml`, `dependabot.yml`, each tagged "reviewed in PRs." Right zone "In repo settings (not in the tree)" holding a single "Ruleset: main" card listing the six rule names. Two thin arrows from the ruleset back to the left zone: one to `CODEOWNERS` labeled "activates," one to `workflows/ci.yml` labeled "references checks by name." Pedagogical goal: the student physically sees that config and enforcement live in different places and the rule is the thing that wires them together. Cap height; horizontal layout. Use HTML+CSS (two color-coded zones + callouts) per the diagram index's "color-coded segments with callouts" row.

`Term`: head branch (used later; can introduce here if natural — otherwise defer).

### The minimum-viable ruleset for `main`

The core section and the load-bearing artifact. Teach the six rules as a set, each with its one-line "what breaks without it." Order them as the chapter outline lists (it builds logically: the gate, then who, then freshness, then ownership, then CI, then history).

Present the six rules as **prose with each rule as a tight sub-point** (a `Steps` or a definition-style list — author's call; Steps reads well as "the six you enable"). For each:

1. **Require a pull request before merging.** Disables direct pushes to `main`. The keystone — without it every other rule is optional. Everything below only triggers because changes must arrive as PRs.
2. **Require approvals: 1.** One reviewer minimum. Note the team-size reality: two-person team → pair across each other's PRs; solo project → drop this rule consciously or self-review (acknowledge the honest trade-off, don't pretend solo enforcement works). Mention that team-level required-reviewer granularity now layers on top of CODEOWNERS — the **Required reviewer rule** went GA Feb 17 2026 (verified), letting you require a number of approvals from designated teams on specific file/folder globs, with `!` negation to exclude paths. Frame it as "CODEOWNERS defines ownership; this rule enforces policy" — they complement, not replace.
3. **Dismiss stale pull request approvals when new commits are pushed.** Approval was for commit A; author pushed B and C; the approval no longer describes what merges. Forces re-review of substantive changes. Tie back to L3's fixup-commit loop — this is what makes "re-request review after pushing fixups" structural instead of polite.
4. **Require review from Code Owners.** The teeth for `CODEOWNERS` from L3. State the enforcement gap explicitly here (it's the canonical example): file alone = auto-request that can be ignored; file + this rule = named owners' approval required to merge.
5. **Require status checks to pass before merging.** The CI gate from Ch097. The checks are listed **by name string** — the four jobs Ch097 produces (`typecheck`, `lint`, `test`, `build`). PRs can't merge until all four are green. Introduce **strict mode** (require branches up-to-date with `main` before merging) as a sub-decision: pairs with the rebase workflow but re-runs CI every time `main` moves — enable when CI is fast (≤ a few min), disable when CI is slow (10+ min) or busy `main` makes it thrash. This is a "trigger before tool" call, name the threshold.
6. **Require linear history.** Forbids merge commits on `main`. The structural backstop for squash-merge from L1/L3 — without it, a teammate who hits "Create a merge commit" anyway pollutes the one-commit-per-change history.

**Code — the ruleset as JSON, via `AnnotatedCode`.** After the prose walk, show the exported ruleset JSON (rulesets export/import via API) and step through it with AnnotatedCode, highlighting the clause for each of the six rules in turn. Pedagogical goal: collapse "six checkboxes in a UI that will look different next year" into one stable, version-controllable object the student can read. This is the single best artifact in the lesson — it survives UI churn and previews the settings-as-code idea. Keep the JSON realistic but trimmed (don't include every default field); flag in a comment/caption that it's abbreviated. Note this is a deliberate divergence from "teach the form they write" — the student will mostly *click* this, not author JSON — so frame the JSON as "what the clicks produce," the inspectable truth, not the primary authoring surface.

`Term`: required status check; strict mode (require up-to-date); linear history; GA (general availability) — the Feb-2026 required-reviewer capability is mentioned, so define GA. Note (verified): `Require linear history` needs squash or rebase merging enabled on the repo first — the L3 squash-only setting satisfies this; call the dependency out so the student isn't confused if the toggle is greyed out.

### Wiring CODEOWNERS to the rule

Deepen the L3 CODEOWNERS material specifically through the enforcement lens (L3 defined the term and basic syntax — do not re-define, reference it). This section closes the L3 debt: "CODEOWNERS as suggestion vs. as structural requirement."

- Recap in one line that `.github/CODEOWNERS` maps path globs to reviewers, gitignore-style, **last match wins** (this gotcha was flagged in L3 — restate briefly, it's the #1 mistake).
- Show a realistic `CODEOWNERS` as a small `Code` block: `* @org/eng` (default), then more-specific lines for the high-stakes zones — `/app/billing/ @org/billing-leads`, `/db/schema.ts @org/dba`, `/.github/ @org/platform`. Emphasize ordering general→specific because last match wins.
- The senior judgment: assign codeowners only to **zones with clear ownership and real stakes** — auth, billing, schema, infra. Don't codeowner UI surfaces or general feature work — it diffuses responsibility and slows every PR. Cut it entirely on a two-person team without specialization.
- The two-places reflex: ownership requires *both* the file (in `.github/`) *and* the rule (in settings). Introducing an ownership zone means touching both; verify both when you do. This re-grounds the two-surfaces model from earlier on a concrete case.

**Diagram — the merge gate as a funnel (HTML+CSS phase strip in `<Figure>`).** A horizontal strip: a "PR" chip on the left flows rightward through five gates in sequence — `1 approval` → `no stale approval` → `code-owner approved` → `4 checks green` → `linear history` → and only then a green "Merge" button on the right. Each gate is a labeled segment; a red "blocked here" state shown on one gate (e.g. code-owner not yet approved) so the student sees the merge button stays grey until *all* gates pass. Pedagogical goal: the six rules aren't independent toggles, they *compose into a single gate* a PR must clear. Horizontal, capped height. (HTML+CSS sequential phase strip — diagram index's "sequential phase strip / timeline without parallelism" row.)

**Exercise — `Buckets`, the two-surfaces drill.** Two buckets: "Lives in `.github/` (reviewed in PRs)" and "Lives in repo settings (the ruleset)." Items to sort: `CODEOWNERS`, `pull_request_template.md`, `dependabot.yml`, `ci.yml` workflow, "Require linear history," "Require code-owner review," "Dismiss stale approvals," "Required status checks list." Goal: cement the load-bearing mental model that configuration and enforcement live in different surfaces. This is the highest-value exercise in the lesson — place it right after the two concepts have both been taught (here, after CODEOWNERS wiring makes the pairing concrete).

### Rules to reach for as the repo grows

The "senior reach" set, taught **trigger-first** per the pedagogical guideline — each rule introduced by the condition that earns it, named, one to two lines, not a checklist to enable blindly. Keep tight; these are awareness-level, not do-it-now.

Cover, each with its trigger:
- **Require signed commits** — when the repo is audit-grade / handles sensitive data and the team has GPG/SSH signing configured. Watch-out: enabling it on a team *without* signing set up blocks every push. Named, optional (consistent with L1/L2 cutting signing from the baseline).
- **Require deployments to succeed before merging** — list the Vercel preview deployment (Ch098 L5) as a required check so a PR can't merge unless its preview built. Forward-reference Ch098, don't teach it.
- **Restrict who can push to matching branches** — an explicit allow-list. Rare for trunk-based `main`; useful for release-tagged or protected branches.
- **Block force pushes** — enabled by default in rulesets (verified); the reach action is to *verify* it's set, not to add it.
- **Restrict deletions** — verify `main` can't be deleted by accident; also typically on by default — verify.

Then **bypass actors** as its own beat (it's the senior-judgment piece): rulesets let you list specific users/teams/apps that may bypass the rules, **and every bypass is recorded in the audit log**. The trigger: a genuine production emergency where the normal PR flow won't ship the fix in time, handled by the on-call account. The discipline: default to an *empty* bypass list; a bypass is rare and visible; an after-action review checks the audit log. The anti-pattern: a standing bypass actor nobody reviews defeats the entire point of structural enforcement.

One sentence on **multiple rulesets layered** (general ruleset on all branches, stricter one on `main`, stricter still on `release/*`): trunk-based teams need exactly the `main` ruleset; the layering capability exists, named once.

**Exercise — `Buckets`, baseline vs. reach.** Two buckets: "Ship in the baseline (every production `main`)" and "Add when the trigger fires." Items: the six baseline rules vs. signed commits / required deployment / restrict-push / bypass actor / second layered ruleset. Goal: drill the trigger-before-tool judgment — the student should *not* enable everything; they should know the minimum and recognize what each extra rule is for. Place at the end of this section.

`Term`: bypass actor.

### Standing up the ruleset on a fresh repo

The concrete worked example — turn the abstract six rules into the actual procedure. This is the do-it-yourself payoff that makes the lesson actionable.

- **The "first push is direct" exception.** Frame the bootstrap sequence: the repo's very first commit (the scaffold from Ch004) is pushed straight to `main` *before any ruleset exists* — there's nothing to protect yet. The ruleset lands on commit 2 onward. After that, the only path onto `main` is a PR. Make this explicit so the student isn't confused about how the first commit got there.
- **The procedure, as `Steps`.** Open repo → Settings → Rules → Rulesets → New branch ruleset. Name it (e.g. `main`). Target branch: `main` (default branch / pattern). Enforcement status: **Active**. Enable the six: require PR (with 1 approval + dismiss stale + require code-owner), require linear history, require status checks (add `typecheck`, `lint`, `test`, `build` by name), confirm block-force-pushes and restrict-deletions are on. Save.
- **One orienting `Screenshot`** (`viewport="desktop"`, wrapped in `<Figure caption>`) of the New ruleset panel, placed inside or beside the Steps — the *only* screenshot in the lesson, as the visual anchor for where these toggles live. Capture must be stored under `public/screenshots/096/`. Caption should note the UI evolves; the JSON shown earlier is the durable reference.
- **Verify it's live** — the proof reflex. Attempt `git push origin main` directly; show the rejection in a `Code` block (terminal output): `remote: error: GH006: Protected branch update failed ... Changes must be made through a pull request.` Pedagogical goal: a rule you haven't watched reject something is a rule you don't know is on. This is the senior habit — confirm the gate fires.

`Term`: none new (reuse earlier).

### When the gate silently disappears

The failure-modes section — the watch-outs from the chapter outline, taught as *diagnosable symptoms* rather than a list of don'ts, because these are exactly where juniors get burned and the failures are *silent* (the gate looks present but enforces nothing).

Frame each as "symptom → cause → fix":
- **CI runs on every PR but never blocks a merge** → the required-status-checks list is empty (or the check was never added). The workflow producing green checkmarks is not the same thing as the ruleset *requiring* them. Fix: add each job name to the list.
- **The renamed-CI-job trap** (the subtle one, worth the most attention). The ruleset names checks *by string*. Rename a CI job (`test` → `unit-tests`) and the ruleset's old name no longer matches any check — the required check is silently satisfied/skipped and the gate vanishes with no error. Fix/reflex: when you rename a job, update the ruleset in the *same PR*; the platform owner owns this as the repo grows.
- **CODEOWNERS that does nothing** → the file exists but `Require review from Code Owners` is off → auto-requests only, ignorable. The enforcement gap again. Fix: enable the rule.
- **Required reviews of 2 on a two-person team** → deadlock (author can't be their own second reviewer). Fix: 1 on small teams.
- **Strict mode + slow CI** → every PR re-runs the full suite each time `main` moves, the team thrashes. Fix: disable strict mode until CI is fast.
- **Signed-commit rule without signing configured** → every push blocked team-wide. Fix: configure signing first, or don't enable the rule.
- **"Disable the ruleset for this one PR" that never gets re-enabled** → the gate is off and nobody notices. The reflex: a disabled ruleset is an incident with an after-action review, not a casual ops habit.

**Exercise — `Dropdowns` (inline-prose diagnosis), optional but recommended.** Three or four short "symptom → pick the cause" prose blanks drawn from the list above (e.g. "CI is green on the PR but the merge button is enabled with no review — the most likely cause is `___`" → options: required-checks list empty / CODEOWNERS missing the rule / strict mode off). Goal: turn the failure modes into recognition the student can apply under pressure. Alternatively a small `MultipleChoice` on the renamed-job trap specifically (the highest-value single gotcha). Author's call which; keep it to one compact exercise — the section is already dense.

### Settings-as-code, named once (brief closing)

Two-to-three sentence wind-down, not a full section if it bloats — fold into the prior section if tighter. The point: rulesets can be defined in the UI *or* exported/managed as JSON via the API; tools like Terraform or a GitHub App can manage them as code across many repos. For a single SaaS-startup repo, the UI is correct and settings-as-code is overhead; it earns its weight at org scale with dozens of repos. This closes the loop opened by the JSON artifact earlier (the student already saw the JSON — now they know *why* it can exist as a file even though GitHub doesn't auto-apply it). Then a one-line forward look: Ch097 authors the CI whose checks this ruleset requires; Ch098 L5 adds the preview deployment as another required check — the ruleset is the seam those chapters plug into.

`ExternalResource` (LinkCard): GitHub Docs "About rulesets" (`https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets`) and "Available rules for rulesets" (`.../managing-rulesets/available-rules-for-rulesets`) — verified live, the canonical reference the student returns to.

## Scope

Prerequisites to restate concisely (taught earlier, do not re-teach):
- Trunk-based / GitHub Flow, squash-merge, `--force-with-lease`, linear history as a *goal* (L1) — assume known; the rule *enforces* what L1 taught as habit.
- PR lifecycle, small/reviewable/reversible, the fixup-commit + squash-merge review loop, CODEOWNERS *definition and basic syntax* (L3) — reference, restate only the last-match-wins gotcha in one line. The `<Term>` for CODEOWNERS ships in L3; reference, don't redefine.
- Squash-only repo settings (Settings → General → Pull Requests) were set in L3 — this lesson assumes that and adds the *ruleset-level* `Require linear history` as the structural backstop. Mention the pairing, don't re-teach the General-settings toggle.

Explicitly out of scope (defer, name at most once):
- **The CI workflow itself** — how `ci.yml` is authored, the four jobs, caching, `permissions:`, the speed budget → Ch097. This lesson only *names the check strings* the ruleset requires and treats the workflow as a black box that produces them.
- **Preview deployments as a required check** — the Vercel preview per PR, Neon branch per preview → Ch098 L5. Named once as a reach rule ("require deployments to succeed"), not taught.
- **GPG/SSH commit signing setup** — how to generate and configure signing keys → out of scope; the signed-commits *rule* is named as a reach rule only.
- **Settings-as-code tooling** (Terraform, Probot/GitHub Apps) — named once, cut. No worked example.
- **Organization-level rulesets and enterprise policy** — named once (layering), cut. The lesson targets a single repo's `main`.
- **Merge queue, auto-merge** — auto-merge was named in L3; do not re-introduce. Merge queue is out of scope (higher team-size threshold).
- **Branch protection rules in depth** — named once as the legacy mechanism for tutorial-orientation; the legacy UI is not taught step-by-step.
- **AI-driven review-bot tooling** — out of scope.
- **Deep PR review methodology** (five-layer review, severity labels) → Ch103; do not introduce.

Running example continuity: L1–L3 used `feat/invoice-status` and an invoice/billing SaaS framing. Reuse the same project framing for CODEOWNERS examples (`/app/billing/`, `/db/schema.ts`) so the repo feels continuous; the `git push origin main` rejection demo can use any branchless direct-push, no specific feature branch needed.
