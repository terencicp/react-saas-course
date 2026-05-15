# Chapter 21.1 — Pedagogical approach

## Concept 1 — Workflow shape decides what `main` means

**Why it's hard.** The student has been pushing to `main` alone since 1.4 and never had to ask whether a merge is "deployable" or "integration-ready." On a team, that question is the whole game — and most students arrive carrying half-remembered Git Flow diagrams (develop, release/*, hotfix/*) from a 2017 tutorial. The misconception isn't ignorance, it's *outdated muscle memory*: thinking that long-lived branches buy safety when in 2026 they only buy merge pain.

**Ideal teaching artifact.** A side-by-side workflow diagram — Git Flow on the left, GitHub Flow / trunk-based on the right — but the diagrams aren't decorative. Each one is annotated with what `main` *means* in that workflow ("integration-ready, deploys quarterly after QA" vs. "every commit deploys, no exceptions") and what protections each shape *requires* to actually work (Git Flow needs QA gates and release windows; trunk-based needs preview-per-PR + CI + flags). The student sees the same feature ship through both pipelines and notices that Git Flow's four branches solve problems that previews-per-PR (21.3), CI (21.2), and feature flags (20.2.4) already solve structurally. Decision archetype.

**Engagement.** A Buckets sort: ten scenarios ("a hotfix needs to ship today," "a release is scheduled for Friday," "two features ship together," "an experimental UI hides behind a flag") dropped into "stays trunk-based" or "would have needed Git Flow." Locks the trigger-map in.

**Components.**
- Two side-by-side `Figure`-wrapped diagrams. Mermaid `gitGraph` for both workflows, annotated with the meaning of `main` and the structural prerequisites each shape demands.
- `Buckets` for the scenario sort.

**Project link.** Chapter 21.5's three-PR live migration *only works* under trunk-based — each expand/migrate/contract step is a small PR landing on `main`. Naming this here means the project doesn't have to re-justify its shape.

## Concept 2 — The four objects, with staging as a slicing tool

**Why it's hard.** Students who have used Git as bookkeeping see four nouns (commit, branch, staging, remote) as a flat list of things-to-memorize. The senior view is that three of them are storage and one — the staging area — is *operational*: it's the only place where you can split "two unrelated changes I made in the same hour" into two reviewable commits. Without that shift, `git add -p` looks like ceremony.

**Ideal teaching artifact.** A small interactive visualizer of the four object zones: **working tree → staging → local commit → remote**. The student sees a working tree with two clearly unrelated changes (e.g., a bug fix in `lib/money.ts` and a feature in `app/invoices/page.tsx`). They walk a guided sequence — stage hunk A, commit it, stage hunk B, commit it, push — and watch each change move through the zones into two distinct commits. Then they replay the same starting state with `git add .` and see the single jumbled commit that *would* have shipped. The artifact's whole point is that staging *enables a senior reflex*; the visualization makes that reflex visible. Concept archetype.

**Engagement.** A short PredictOutput: given a working tree state and three staged-vs-unstaged hunks, predict what `git status` shows and what the next `git commit` will record. Confirms the student internalized the four-zone model after seeing it move.

**Components.**
- New component **`GitZoneVisualizer`**: a four-column zone display (working tree, staging, local commits, remote) with named hunks/files as draggable or step-advanced tokens. Author seeds a starting working tree and a script of operations; student scrubs or advances steps.
- `PredictOutput` for the recall.

## Concept 3 — Rebase locally, squash-merge on PR

**Why it's hard.** This is the single most load-bearing senior diff in the chapter and the one students get wrong by default. "Rebase vs. merge" is taught online as a religious war; the 2026 answer is a *combination* (rebase locally to keep the branch clean, squash on PR to collapse it to one commit on `main`) and the payoff is invisible until the student tries to read `main`'s history or run `bisect` six weeks later. The misconception to defuse is that rebase and merge are alternatives; they're orthogonal — one is a local hygiene tool, the other is the PR-landing strategy.

**Ideal teaching artifact.** A scrubbable three-panel comparison showing the same feature branch landing on `main` under three integration shapes: (A) `git pull` without `--rebase`, then merge-commit; (B) `git pull --rebase`, then merge-commit; (C) `git pull --rebase`, then squash-merge. After each scrub, the right-hand panel shows `git log --oneline main` for the resulting `main` — A is unreadable, B is cleaner, C reads like a changelog. A second beat under the same artifact: a fourth panel with a *bisect attempted on each* — the student sees that on C the bisect lands on a single PR commit, on A it lands inside a "wip" intermediate state. The artifact carries the comparison; the second beat carries the payoff that makes the choice mechanical. Decision archetype.

**Engagement.** A Dropdowns drill on the team-defaults config: fill in `pull.rebase`, `rebase.autoStash`, `rerere.enabled`, `push.autoSetupRemote`, `rebase.autoSquash`, and pick `--force-with-lease` over `--force` from a multiple-choice. Locks the config that makes the discipline automatic.

**Components.**
- New component **`GitHistoryCompare`**: takes three (or four) named integration strategies, renders each as a `gitGraph` plus the resulting `git log --oneline` plus an optional "what bisect would land on" overlay. Student scrubs strategies via tabs or a slider.
- Alternative: `TabbedContent` with three Mermaid `gitGraph` panels and accompanying log blocks — single-use scope, but the comparison teaches even without animation.
- `Dropdowns` for the config drill.

**Project link.** Every PR in 21.5 lands as one squash-merged commit on `main`; the rollback story in 21.5.6 depends on that one-commit-per-change shape to make `git revert` clean.

## Concept 4 — History is mutable until pushed and merged

**Why it's hard.** Every rewrite tool (`commit --amend`, `rebase -i`, `reset`, force-push) is safe in one context and catastrophic in another. Without a single internalized rule, the student has to memorize a rule-per-command. The rule that unlocks all of them: *local is mutable, your-own-branch-with-`--force-with-lease` is mutable-with-care, shared-`main` is immutable and gets `revert`*.

**Ideal teaching artifact.** A traffic-light diagram of the three zones — **green** (local-only), **yellow** (pushed feature branch, your work only), **red** (merged to `main`, shared) — with the tools allowed in each zone listed inside the corresponding light. A second beat layers the consequence: hovering or stepping into "red" shows what happens if you `rebase` shared history (teammates' clones diverge, force-push needed, broken trust). The artifact's job is to compress eight commands' worth of safety rules into one shape the student carries around. Concept archetype.

**Engagement.** A TrueFalse round: ten statements of the form "I rebased a branch I pushed yesterday but haven't opened a PR for — safe?" / "I `commit --amend`'d after pushing — needs force-with-lease?" / "Production shipped a bad commit; rebase `main` to remove it." Each statement maps directly onto a zone. Confirms the rule generalizes.

**Components.**
- Hand-authored SVG inside `Figure`: three colored zones, tools listed per zone, with an inline annotation per zone naming the recovery move if the rule is broken.
- `TrueFalse` for the round.

## Concept 5 — The reflog is a safety net, taught before disaster

**Why it's hard.** The reflog has a perverse teaching order — by the time the student *needs* it (botched `reset --hard`, force-pushed-over branch, lost rebase), they don't know it exists, panic, and either lose work or post a Slack apology. The senior reflex is to know the reflog *before* the disaster, the way you know where the fire extinguisher is before you smell smoke. Teaching this concept means manufacturing the disaster in a controlled environment so the muscle memory lands.

**Ideal teaching artifact.** A wrong-by-default sandbox: the student is dropped into a guided terminal-shaped scenario with a pre-staged "I lost four hours of work" state — a feature branch that just got `git reset --hard`'d by mistake. The artifact walks them through `git reflog` → spot the pre-disaster HEAD → `git branch recover <hash>` → verify the work is back. Then it replays the scenario for the four other canonical losses (wrong-branch commit, force-push overwrite, abandoned rebase, committed-then-deleted file). The artifact *is* the assessment — the student can't proceed without recovering. Pattern archetype, recast as a recovery puzzle.

**Engagement.** Because the artifact carries the assessment, the follow-up beat is a short Matching exercise pairing five "lost work" symptoms ("my branch is empty," "my rebase deleted my commits," "I committed to main by accident") with the right first reach (reflog / reflog / reset+cherry-pick / etc.). Confirms recall after the puzzle.

**Components.**
- New component **`GitRecoveryPuzzle`**: a guided shell-shaped widget with pre-loaded repo state, a fixed prompt ("recover your lost commits"), and a step grader on the commands the student types or selects. Five canonical scenarios, each replayable. Leanest v1: a multi-step `Sequence` exercise per scenario, with the commands as draggable steps and the broken-then-fixed state as captioned panels.
- Alternative: a `DiagramSequence` walkthrough of the reflog recovery for one scenario plus a `Sequence` ordering exercise for the other four — covers the pedagogical bar without the bespoke widget.
- `Matching` for the recall.

## Concept 6 — Bisect on a bisect-friendly main, and the surgical toolkit

**Why it's hard.** Students reach for `bisect` once a year and forget the workflow each time. Worse, they don't realize that bisect *only works well* when each commit on `main` is a known-shippable change — which is the structural payoff of squash-merge from Concept 3. The misconception is that bisect is a clever debugging trick; the senior view is that it's a discipline payoff that depends on `main`'s shape, and that `cherry-pick`/`revert`/`rebase -i` round out a surgical toolkit each with one trigger.

**Ideal teaching artifact.** Two beats. First, a binary-search animation over a row of 16 commits on `main`: a known-good commit at the start, a known-bad commit at HEAD, the bug appeared somewhere in between. The student watches `git bisect` checkpoint the midpoint, mark good/bad, re-checkpoint, until the offending commit is isolated in four steps. The animation runs once on a bisect-friendly `main` (one commit per PR) and once on a "wip"-polluted `main` (intermediate broken states); the second run lands on a non-shippable commit and the student sees the discipline payoff directly. Second beat: a Reference-shaped trigger map for the rest of the toolkit — `cherry-pick` ("a commit needs to move"), `revert` ("a shipped commit needs undoing"), `rebase -i` with `fixup`/`squash`/`reword`/`drop` ("history needs shaping before push"). The map is short, dense, and lives in the same lesson because the four tools share the "history is mutable until pushed" rule from Concept 4.

**Engagement.** A short PredictOutput: given a 7-commit history with one bad commit, predict which commit `bisect` checks at step 1, 2, 3. Then a Matching of five scenarios ("hotfix on feature branch needs to ship now," "bad commit shipped to main," "review left a fix-this comment, the fix belongs in the original commit") to the right tool. Two assessments because the lesson carries two beats.

**Components.**
- New component **`BisectAnimation`**: takes a commit list, a bad-commit index, and renders the binary-search walk with good/bad markers. Two presets — bisect-friendly and wip-polluted. Leanest v1: a `DiagramSequence` with hand-authored SVG panels showing each step's checkpoint.
- `Figure`-wrapped table for the trigger map (cherry-pick / revert / rebase -i / amend), one row per tool, columns for "reach when," "watch-out."
- `PredictOutput` + `Matching` for the recall.

## Concept 7 — The PR as designed artifact

**Why it's hard.** Students see PRs as "the thing GitHub makes you do" — a bureaucratic wrapper around `git push`. The senior view is that the PR is the *unit of change* — what reviewers read, what CI runs against, what the preview deploy binds to, what `revert` will undo as one commit. That reframe is the lesson, and it's invisible until the student tries to review someone else's 1200-line PR and notices their attention collapse. Two sub-misconceptions to defuse: that PR size is a matter of taste (it's not, ~400 lines is a measurable review-quality cliff), and that "the diff speaks for itself" is acceptable description (it isn't — the *why* never lives in the diff).

**Ideal teaching artifact.** A misconception-first ambush: the student opens a real PR-shaped artifact — a 900-line PR with a one-sentence description ("Refactor invoices") and the diff inline. The artifact asks them to *review it* — leave inline comments, approve or request changes — with a 5-minute soft timer. After they submit, the artifact reveals what a senior reviewer would have flagged that the student missed (a leaked secret in line 412, a missing migration, an unrelated formatting drive-by) and the descriptive cause: the PR was too big and the description gave them nothing to anchor on. Then the artifact replays the *same change* split into three small PRs each with the six-section description filled in, and the student reviews one of them — and notices the review takes 4 minutes, catches the issues, and feels good. The artifact carries the lesson; the prose afterward names the small/reviewable/reversible rule that the artifact already proved. Pattern archetype.

**Engagement.** A Buckets sort that follows: twelve PR descriptions (some empty, some "see commits," some with the six sections, some over-templated with theater checkboxes) sorted into "would land in one review round" vs. "would bounce." Confirms the description template is internalized as a tool, not ceremony.

**Components.**
- `CodeReview` for the ambush — it already supports inline-comment review with rubric grading; seed it with a deliberately-bad PR and a known-good rubric, then a second pass with the small version. The artifact is one of the few existing components that already does what this concept needs.
- A `Figure`-wrapped six-section PR description template, annotated with one-liner senior reasons per section.
- `Buckets` for the sort.

**Project link.** Chapter 21.5 ships three PRs, each with a description following this template. The chapter assumes the discipline; this concept is where it lands.

## Concept 8 — Structural enforcement: the six-rule ruleset

**Why it's hard.** Everything in lessons 21.1.1–21.1.3 is *discipline* — a team norm that one bad Friday breaks. The senior reframe is that the workflow shouldn't depend on memory; it should be mechanically true because GitHub refuses to merge a PR that violates it. The misconception is that protection rules are bureaucratic friction; the senior view is that they're how the team scales past two people without breaking. The lesson lands the *minimum* six-rule ruleset and the senior-reach extensions, plus the CODEOWNERS-as-data-plus-rule-as-enforcement split (the file alone is a suggestion, the rule makes it structural).

**Ideal teaching artifact.** A buildable replica of the GitHub Rulesets UI — the student configures the six rules one at a time on a mock `main` branch, then attempts a sequence of bad pushes (`git push origin main` directly, a force-push, a PR with no approval, a PR with failing CI, a PR with a stale approval after new commits) and watches each one rejected with the specific rule that blocked it. The artifact's job is to make the rules *feel* like a physical fence, not a YAML setting. A second beat overlays CODEOWNERS: the student edits a `.github/CODEOWNERS` file and watches the "require code-owner review" rule activate it; toggles the rule off and watches the file become a suggestion that can be ignored. The point is the file-rule interplay. Setup/wiring + Pattern archetype.

**Engagement.** A Sequence ordering exercise: order the six rules by which one would fail to enforce the workflow first if removed. (Result: "require PR" is load-bearing; without it, every other rule is bypassed by direct push.) Forces the student to reason about which rule does what mechanical work.

**Components.**
- New component **`RulesetSimulator`**: a mock repo-settings UI with the six rules as toggles, a mock `git push` / PR-merge action panel, and a rejection-or-success result for each attempt. Leanest v1: a `TabbedContent` widget where each tab is "rule X enabled" with a labeled set of "what these pushes would do" outcomes — covers the teaching without the simulator.
- Alternative for the second beat: a `DiagramSequence` showing CODEOWNERS-then-rule activation across three panels.
- `Sequence` for the load-bearing-order recall.

**Project link.** Chapter 21.5.2 wires the ruleset on the real production repo. Landing it here means the project step is mechanical, not a new concept.

## Component proposals

- **`GitZoneVisualizer`** — four-column zone display (working tree / staging / local / remote) with named hunks moving through under student-driven steps. Inputs: starting working tree, named hunks, an operation script. Shows hunks flowing through zones.
  - Uses in this chapter: Concept 2.
  - Forward-links: useful in Chapter 21.2 for showing what CI runs against (the staged-vs-committed-vs-pushed distinction), and in 21.3.5 for the deploy-from-`origin/main` story.
  - Leanest v1: a `DiagramSequence` with hand-authored SVG panels showing the same hunks at each zone — drops the drag affordance, keeps the teaching.

- **`GitHistoryCompare`** — three or four side-by-side `gitGraph`-shaped panels showing the same feature landing under different integration strategies, each paired with the resulting `git log` and an optional "what bisect lands on" overlay. Inputs: a feature-branch commit list, a `main` commit list, the integration strategy enum per panel.
  - Uses in this chapter: Concept 3.
  - Forward-links: 21.5.6 (rollback rehearsal) could reuse the comparison shape for "what does `git revert` look like on `main`'s graph vs. `git reset`." Plausible.
  - Leanest v1: `TabbedContent` with three Mermaid `gitGraph` diagrams and accompanying log blocks. Loses the side-by-side scrub but the comparison still teaches; this is the right starting point.

- **`GitRecoveryPuzzle`** — guided shell-shaped widget with five pre-loaded "lost work" scenarios, a fixed recovery prompt, and a grader on commands typed or selected. Inputs: starting repo state, the disaster operation, the recovery goal.
  - Uses in this chapter: Concept 5.
  - Forward-links: 21.5.6 has a rollback rehearsal that could reuse the same puzzle shape ("production shipped a bad commit, recover"). Real forward-link.
  - Leanest v1: a multi-step `Sequence` exercise per scenario with the recovery commands as draggable steps, plus a single `DiagramSequence` walkthrough of the reflog mechanic. Strongly preferred for v1 — it covers the teaching without inventing a terminal sandbox.

- **`BisectAnimation`** — animated binary-search walk over a commit list, with good/bad checkpoint markers, run twice on bisect-friendly vs. wip-polluted `main`. Inputs: commit list, bad-commit index, `main`-shape preset.
  - Uses in this chapter: Concept 6.
  - Forward-links: None — single-use. Demoted; the primary recommendation for Concept 6 is the `DiagramSequence` v1.
  - Leanest v1: a `DiagramSequence` of hand-authored SVG panels showing each bisect step. Keeps the teaching.

- **`RulesetSimulator`** — mock GitHub Rulesets UI with six toggleable rules and a "try a bad push" action panel that returns rule-specific rejections. Inputs: rule states, push attempts.
  - Uses in this chapter: Concept 8.
  - Forward-links: 21.2 ships CI as a required status check that the ruleset names by string; 21.3.5 ships preview deploys as another required check. Both could plug into the same simulator. Real forward-link, compounds across the unit.
  - Leanest v1: `TabbedContent` panels per rule-on/rule-off configuration with labeled push outcomes. Drops the toggle interactivity; the rejection-text teaching survives.

## Build priority

Two components carry the most load across Unit 21 and are worth building first:

1. **`GitHistoryCompare`** — Concept 3 is the load-bearing senior diff of the entire chapter, and the comparison is the artifact that makes the squash-merge discipline click. The leanest v1 (`TabbedContent` + Mermaid `gitGraph`) is genuinely close to the full proposal; build the v1, evaluate whether the scrub interaction earns the upgrade after authoring.
2. **`RulesetSimulator`** — compounds forward into 21.2 (required status checks) and 21.3.5 (required deployments). The simulator's value is making structural enforcement *feel* mechanical, which prose can't do. Build past the v1 here.

`GitZoneVisualizer` is one-chapter-deep with plausible 21.2/21.3 reuse — build the v1 (`DiagramSequence`) first, promote only if the reuse materializes. `GitRecoveryPuzzle` should ship as the `Sequence`-plus-`DiagramSequence` v1; the bespoke shell widget is over-engineered for one chapter even with the 21.5.6 forward-link. `BisectAnimation` stays at v1 — single-use, no forward-link.

## Open pedagogical questions

- Concept 5's wrong-by-default sandbox is the most ambitious artifact in the chapter and the one most likely to slip toward "cool demo, weak teaching." The v1 (`Sequence` + `DiagramSequence`) is probably enough; the question is whether the recovery muscle memory actually needs the terminal feel or whether the ordering drill suffices.
- Concept 7 uses `CodeReview` for the misconception-first ambush, which is the right tool, but the chapter is asking the student to *fail* a review and then read the senior reveal — confirm `CodeReview`'s grading kernel supports the "score is intentionally low, here's what you missed" reveal shape, or extend it.
