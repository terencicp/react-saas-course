# Trunk-based Git for teams

- Title: Trunk-based Git for teams
- Sidebar label: Trunk-based Git

## Lesson framing

First lesson of Chapter 096 (Unit 20) and the chapter's first lesson — continuity notes are empty, so this lesson sets the chapter's vocabulary and tone. It opens Git-as-shipping-discipline.

**The senior reframe is the whole point.** The student has typed `git add` / `commit` / `push` since Chapter 004 as bookkeeping next to "real" work. This lesson reframes the same three commands plus a handful more as *the shipping discipline* — the thing that decides what merging to `main` means, what reviewers see, and whether the CI gate (Ch097) and previews (Ch098) are load-bearing. Lead every section with the decision, not the syntax. The student already knows the keystrokes; what they lack is the team-scale mental model and the reasons behind the defaults.

**Target student.** Experienced-enough dev, solo so far, about to (or imagining) working on a 2–5-person SaaS team. They have never had a teammate force-push over their work or had to explain why `main`'s history is a swamp. The pain points are abstract to them — the lesson must make the failure modes concrete (the "Merge branch 'main' into..." clutter, the un-bisectable history, the overwritten teammate) so the defaults feel earned, not cargo-culted.

**The load-bearing senior diff (state this is the lesson's spine):** `git config --global pull.rebase true` locally + **squash-merge on the PR** = `main`'s history is exactly one commit per shipped change. Everything else in the lesson orbits this. Bisect-friendliness, clean revert, changelog-readable `git log` all fall out of it. Do not let the four-objects review or the config dump bury this.

**Mental model the student should end with.** Trunk = one long-lived `main`; feature branches are short-lived scratchpads that get *collapsed* onto trunk; local history is messy-and-yours, `main`'s history is clean-and-shared; the staging area is a slicing tool, not a checkpoint. They should be able to: run the everyday loop (branch → slice with `git add -p` → commit → push → PR → rebase → squash-merge), set the global config once, and explain why Git Flow's long-lived branches are dead weight in a preview-per-PR world.

**Pedagogy & cognitive-load plan.** This is a concept + setup lesson (est. 50–60 min). Three pillars: (1) the four objects, named once as a fast shared-vocabulary pass — not a tutorial, the student has used all four; (2) rebase vs. merge as a *visual* decision — this is where beginners' intuition fails, so it gets the heaviest visual treatment (gitGraph diagrams + the LGB embed to *feel* it); (3) the trunk-based workflow + the config that makes it automatic. Build complexity gradually: objects → the local loop → the integration decision → the team workflow → the one-time config. Defer all power tools (reflog/bisect/rebase -i) to L2 — name them as "next lesson" and move on. Keep the GUI/GitLab/signed-commits/Conventional-Commits topics to one line each (named, cut) so they don't dilute the spine.

**Interactivity.** Git is muscle memory; reading about rebase doesn't stick. Use `GitBranchingEmbed` (LGB) at least once so the student *does* a rebase and watches the graph linearize. Use Mermaid `gitGraph` for the static rebase-vs-merge and squash-merge contrasts. Close with a couple of fast comprehension checks (Buckets for command/workflow classification, MultipleChoice for the rebase-vs-merge decision and the `--force-with-lease` reflex). No live-coding component fits raw Git CLI (none of the runners are Git), so LGB carries the hands-on load.

## Lesson sections

### Introduction (no header)

Open with the senior question, warmly and briefly. Frame: you've used `git add`/`commit`/`push` since Chapter 004 without thinking about workflow — fine when it's just you. The moment a second person commits to the same repo, the *shape* of the workflow starts deciding things: whether merging to `main` means "deployable" or "maybe-integrated," what a reviewer has to wade through, whether next chapter's CI can actually block a bad merge. Promise the concrete payoff: by the end you'll run the team loop, set five config lines once, and know why `main`'s history should read like a changelog. Name the chapter arc in one sentence (this lesson = the workflow and defaults; L2 = rescue tools; L3 = the PR; L4 = enforcement). Keep it to ~2 short paragraphs.

### The four objects you've been using all along

Fast shared-vocabulary pass, NOT a beginner tutorial — the framing is "name what you already touch." Cover the four objects, each in 2–3 sentences, leading with what it *is* structurally:
- **Commit** — a snapshot of the working tree + author + message + parent(s). The unit of change. Emphasize *snapshot*, not diff (common misconception; Git stores snapshots, computes diffs).
- **Branch** — a movable pointer at one commit. Cheap: no copy of the tree, just a 40-char ref in a file. This cheapness is *why* trunk-based works — branches are disposable.
- **Staging area (index)** — the set of changes that *will* go in the next commit. Plant the seed here that this is a *slicing tool* (expanded in its own section), not ceremony.
- **Remote** — a named URL at a hosted repo, usually `origin` → GitHub. `push`/`fetch` move commits between local and remote.

Component: a single **Mermaid `gitGraph`** in a `<Figure>` showing two commits on `main`, a branch pointer, and a note that the remote mirrors it — anchors "branch = pointer." Keep the diagram minimal (3–4 commits max, horizontal). Reasoning: the student needs the four words pinned before the workflow sections lean on them; a diagram makes "pointer" concrete where prose alone reinforces the (wrong) "branch = copy" intuition.

`Term` candidates here: **working tree** (the files as they exist on disk right now), **index** (alias for staging area), **HEAD** (the pointer to the commit/branch you're currently on) — these get used in later sections without re-explanation.

### The everyday loop

The local-to-PR cycle as a numbered procedure. Use `<Steps>` with a `bash` `Code` block (or short fences) per step. The loop: `git checkout -b feat/invoice-status` → edit → `git add -p` (or `git add path/`) → `git commit -m "..."` → `git push -u origin feat/invoice-status` → open PR → after review `git pull --rebase origin main`, force-push if rewritten, squash-merge. State the reflex explicitly: **one branch per PR, one PR per logical change.** Keep commands real and copy-pasteable; use a consistent example branch name (`feat/invoice-status`) reused across the whole lesson so the student tracks one story.

Forward-reference lightly: opening/reviewing the PR is L3, so don't teach PR mechanics here — just show where it sits in the loop.

Reasoning: giving the student the end-to-end skeleton early means every later section ("why rebase here?", "why squash there?") attaches to a concrete step they've already seen.

### The staging area is a slicing tool

The senior reframe of `git add`. Most students treat staging as a redundant step before commit. Show the real value: when the working tree holds two unrelated changes (a bug fix you noticed + the feature you're shipping), `git add -p` walks each hunk asking include/skip, letting you commit them *separately* — or push them as separate PRs. The staging area is *what makes one-logical-change-per-commit possible*.

Component: **`AnnotatedCode`** of a short `git add -p` terminal session (the hunk + the `Stage this hunk [y,n,q,a,d,...]?` prompt), stepping through: (1) here are two unrelated edits in one file, (2) the patch prompt for the bug-fix hunk → `y`, (3) skip the feature hunk → `n`, (4) commit just the staged slice. `color="green"` on the staged hunk. Reasoning: `git add -p` is the senior reflex beginners never discover; a stepped walkthrough of the actual prompt demystifies it. Keep prose per step ≤ 6 lines.

`Term`: **hunk** (a contiguous block of changed lines Git treats as one unit in patch mode).

### Rebase vs. merge, made visual

The conceptual crux of the lesson — where beginner intuition fails. Teach the two integration shapes as graph transformations, not definitions:
- **Merge** — preserves both histories, ties them with a merge commit; the graph forks and rejoins.
- **Rebase** — rewinds the feature branch's commits and replays them on top of `main`; the graph stays linear. Critically: **rebased commits are *new* commits** (new hashes, same content) — this is the fact that explains force-pushing later and the "don't rebase shared history" rule in L2.

Component: a **`DiagramSequence`** that animates the rebase, since the *motion* is the insight. Steps (each a small Mermaid `gitGraph` or hand-built HTML graph in a `DiagramStep`): (1) `main` advanced while you worked — your branch forks from an old commit; (2) merge option → a merge commit joins them, diamond shape, caption notes the fork-join; (3) rebase option → your commits lift off and replay on `main`'s tip, linear, caption notes the hashes changed. Alternatively two side-by-side `gitGraph`s in `TabbedContent` (Merge / Rebase tabs) if the sequence proves hard to author cleanly — note to the writer: prefer DiagramSequence for the "lift and replay" motion; fall back to TabbedContent of two gitGraphs if the animation can't be made legible. Reasoning: this single visual does more than paragraphs; "graph stays linear" is the takeaway the whole workflow rests on.

Then the **hands-on**: a `GitBranchingEmbed` so the student performs a rebase and watches it linearize. Use `level="rampup1"` or a prefilled `command` that sets up a divergence (e.g. `git checkout -b feature; git commit; git checkout main; git commit; git checkout feature`) and prompt them to type `git rebase main` in the caption. Reasoning: doing the rebase once and seeing the tree move is what makes it stick; LGB is purpose-built for exactly this and is the only Git-runtime tool available.

`Term`: **fast-forward** (when `main` hasn't diverged, the merge is just moving the pointer forward — no merge commit).

### The 2026 team default: rebase locally, squash-merge on the PR

THE load-bearing section. State the rule up front as the lesson's spine, then justify each half:
- **Rebase locally** — `git pull --rebase origin main` keeps the feature branch current without scattering "Merge branch 'main' into feat/x" merge commits through your branch.
- **Squash-merge on the PR** — GitHub's "Squash and merge" button collapses the whole PR into *one* commit on `main`, dropping the internal "wip" / "fix typo" / "address review" noise.

The payoff, stated explicitly: `main`'s history becomes one commit per shipped change → reads like a changelog → every commit deploys cleanly → `git bisect` (L2) lands on a single PR, never a broken intermediate state → `git revert` (L2) undoes a whole feature atomically.

Component: a **before/after `gitGraph` pair** — messy feature branch (5 noisy commits + a merge commit from a careless `pull`) vs. the single squashed commit that lands on `main`. Use `TabbedContent` ("PR branch" / "main after squash-merge") or two `<Figure>`s. Reasoning: the contrast *is* the argument; seeing the swamp collapse to one line sells the discipline better than any sentence.

When the merge-commit option earns its weight: rare — a deliberate multi-commit refactor where each commit is structurally a meaningful step and you want them all on `main`. Name it as the exception, default stays squash.

Reasoning for placement: this comes right after the visual rebase-vs-merge section so "rebase keeps it linear" flows directly into "...and here's the team policy that uses that."

### Make it automatic with `git pull --rebase`

Zoom in on the everyday-hygiene config. Without `pull.rebase`, *every* `git pull` on a branch with local commits manufactures a merge commit — the clutter the previous section warned about, multiplied by every sync. Show the one-time fix: `git config --global pull.rebase true`. Pair with a short `CodeVariants` ("default pull" vs "pull --rebase") showing the resulting two-graph difference, or just a `Code` block + one sentence if the gitGraph above already made the point (writer's call — don't over-diagram the same idea twice). Mention `rebase.autoStash true` here as the companion that lets `pull --rebase` work even with a dirty tree (auto-stashes, replays, un-stashes). This naturally bridges into the full config section.

### The trunk-based workflow (and why not Git Flow)

Now name the workflow the loop has been demonstrating. **Trunk-based / GitHub Flow:** one long-lived branch, `main`; feature branches live hours-to-days and merge back; no `develop`, no `release/*`, no `hotfix/*`; releases = deploying `main`; hotfixes = normal fast PRs against `main`.

Then **why not Git Flow**, framed as a historical-context cut (the course teaches no historical detours, so this is the *one* place Git Flow is named — to inoculate the student who'll see it in old tutorials). Git Flow's long-lived branches existed for quarterly, QA-gated shipping. In 2026 the things those branches solved are solved better elsewhere: Vercel previews per PR (Ch098), CI per PR (Ch097), feature flags for risky merges (Ch093 L4). So `develop`/`release`/`hotfix` are pure overhead. Named once, cut.

Component: a **side-by-side branch-topology contrast** — Git Flow's five-lane tangle vs. trunk's single line with short feature stubs. `TabbedContent` of two Mermaid `gitGraph`s (or one combined figure). Reasoning: the visual density difference is the argument — Git Flow *looks* like overhead next to trunk. Keep Git Flow's graph deliberately busy to make the point, but small.

`Term`: **trunk** (the single shared mainline, here `main`), **GitHub Flow** (the lightweight trunk-based workflow: branch off main, PR, squash-merge, deploy).

Optional `VideoCallout`: if a recent, high-quality short explainer on trunk-based vs Git Flow exists, embed it here as supplementary — writer's discretion, not required; the diagrams carry the concept.

### Branch names and commit messages: convention, not enforcement

Two conventions the student should adopt, both explicitly framed as *review readability, nothing technical hangs on them*:
- **Branch naming:** `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` prefixes; kebab-case body; optional ticket ID (`feat/INV-412-status-filter`). Note hooks/rulesets *can* enforce shape; the senior call is usually don't bother.
- **Commit messages:** imperative mood ("Add invoice status filter," not "Added"); subject ≤ 72 chars, no trailing period; body wraps at 72, explains *why* not *what*. Then **Conventional Commits** (`feat:`/`fix:`/`chore:`...) named as the optional structural layer that *only* earns its weight paired with automated changelog/semver tooling — for an internal SaaS shipping no public package, skip it and just write good messages. Named, deferred to the team.

Component: a small **`Code` block** of a good commit (subject + body) vs a one-liner, or a `CodeVariants` good/bad. Light touch — this is convention, not mechanics; don't over-invest.

`Term`: **imperative mood** (phrased as a command — "Add", "Fix" — as if completing "This commit will...").

### `.gitignore`, `.gitattributes`, and the `.env` rule

The repo artifacts the Chapter 004 scaffold already ships — the senior diff is knowing *what's in them and why*, not authoring from scratch.
- **`.gitignore`** ignores `node_modules/`, `.next/`, `.env*` (except `.env.example`), `*.log`, coverage output, OS junk (`.DS_Store`).
- **`.gitattributes`** pins line endings with `* text=auto eol=lf` so a Windows contributor doesn't ship `\r\n` into a Linux-deployed repo.

Then **the `.env` rule, with teeth**: `.env*` ignored except `.env.example`. The watch-out that matters: if a secret lands in a commit, removing the file from the working tree does **not** remove it from history — it's leaked the instant it hits the remote, and **rotation is the only fix** (deleting the file is theater). Cross-reference: the rotation playbook is Ch081 L6; the *prevention* is the gitignore line. (`git filter-repo`/BFG for scrubbing history is L2's one-line mention — don't teach it here.)

Component: a `<FileTree>` or short `Code` block showing the two files' key lines. Use an **`Aside type="caution"`** for the secret-in-history rule — it's the one watch-out in this section a beginner gets catastrophically wrong. Reasoning: this is the highest-stakes mistake in the lesson (real leaked credentials), so it earns a visual callout even though the topic is otherwise low-key.

### Set these five defaults once

The one-time global config, framed as "set it and forget it, lifelong payoff." Present as a single `bash` `Code` block of the five `git config --global` lines, then a one-line *why* per line (a tight list, not a section each):
- `init.defaultBranch main` — new repos start on `main`.
- `pull.rebase true` — the everyday hygiene from earlier; no merge commits on pull.
- `push.autoSetupRemote true` — `git push` on a new branch sets upstream automatically (no `-u` dance).
- `rebase.autoStash true` — `pull --rebase` works with a dirty tree.
- `rerere.enabled true` — re-uses your previous conflict resolutions when the same conflict recurs across repeated rebases (pays off on long-lived branches; the mechanic gets used in L2).

Reasoning: consolidating the config into one copy-paste block respects the student's time and makes it a real setup action, not scattered trivia. `rebase.autoSquash` is intentionally *deferred to L2* (it pairs with `--fixup`, taught there) — note this to the writer so they don't pre-empt L2.

`Term`: **rerere** ("reuse recorded resolution" — Git records how you resolved a conflict and replays it automatically next time the identical conflict appears).

### Never `--force`, always `--force-with-lease`

The one push-safety reflex this lesson must land (the rest of the rewrite-safety story is L2). After a local rebase, the branch's history diverges from the remote, so a normal `push` is rejected and you need to force. `--force` overwrites the remote *unconditionally* — destructive if a teammate pushed in between. `--force-with-lease` checks the remote pointer still matches what you last fetched and **aborts if it changed** — so it can't silently clobber a teammate's commits. Reflex: never `--force`, always `--force-with-lease`. On a personal feature branch the practical risk is low; the *habit* is what saves a teammate's work the one day it matters.

Component: a tiny `CodeVariants` ("--force / dangerous" vs "--force-with-lease / safe") with one-line prose each. Reasoning: it's a single command swap with a big consequence — a two-tab A/B is the tightest way to pin the muscle memory.

### The Git GUI question (named, cut)

One short paragraph, no diagram. All the GUIs are valid — VS Code's source-control pane, GitHub Desktop, GitKraken, Lazygit, Tower. Senior reflex: terminal for everything *except* line-by-line staging and conflict resolution, where VS Code's visual hunk/diff editor is genuinely faster. No religion; the commands are what you must know, the UI is interchangeable. (GitLab/Bitbucket also get their one line somewhere — "the course teaches GitHub; the concepts port directly" — either here or in the workflow section.) Reasoning: the student will wonder "do I have to use the terminal?" — answer it once, briefly, and move on so it doesn't become a tangent.

### Check your understanding

Close with fast self-checks (place inline if a section is better served locally, but a small cluster here is fine for a concept lesson). Proposed:
- **`Buckets`** — classify items into "stays messy & local (your feature branch)" vs "stays clean & shared (`main`)": e.g. "wip commits", "fix typo commits", "one commit per shipped change", "merge commits from a careless pull", "the squashed PR commit", "freely rewritable history". Reasoning: reinforces the mutable-local / clean-shared mental model that is the lesson's spine.
- **`MultipleChoice`** (single-correct) — the rebase-vs-merge decision: "Your feature branch has fallen behind `main`. What's the team default to catch it up?" with `git pull --rebase` correct and `git merge main` / `git pull` (no flag) as distractors. Make distractors plausible, not paraphrases of prose.
- **`MultipleChoice`** (single-correct) — the `--force-with-lease` reflex: "Why prefer `--force-with-lease` over `--force` after a rebase?" Correct answer = it aborts if the remote moved (won't clobber a teammate); distractors = "it's faster", "it skips the prompt", "it's required by GitHub".

Reasoning: a concept-heavy lesson needs recall checks on the two reflexes (rebase-to-sync, lease-not-force) and the one mental model (local-messy / shared-clean) — the three things that must survive to L2. Keep to ~3 checks; don't pad.

### External resources (optional)

1–2 `ExternalResource` cards: the official Git book chapter on branching/rebasing (git-scm.com), and optionally GitHub's docs on "About merge methods" (squash vs merge vs rebase). Keep to genuinely canonical references.

## Scope

**Prerequisites (redefine in one line each, don't re-teach):** the student has used `git add`/`commit`/`push`/`clone` since Chapter 004 and knows what a remote and a commit are at a using-it level — this lesson names the objects formally and adds the team layer. The Chapter 004 scaffold already ships `.gitignore`/`.gitattributes`. Feature flags (Ch093 L4) and secret rotation (Ch081 L6) are referenced, not taught.

**Deferred to later lessons in this chapter — name as "next lesson," do NOT teach:**
- `reflog`, `bisect`, `cherry-pick`, `revert`, interactive rebase (`rebase -i`), `stash`, `commit --amend`, `restore`/`switch`, conflict-resolution flow, `git log`/`blame` invocations, `rebase.autoSquash` + `--fixup` → **L2**. This lesson may *name* `revert`/`reflog` in passing (the `.env` rule, the rewrite-safety reflex) but teaches none of them.
- PR mechanics: creating/reviewing PRs, draft PRs, the description template, CODEOWNERS, `gh` CLI, fixup-commit-plus-squash review loop → **L3**. This lesson shows where "open PR" and "squash-merge" sit in the loop but does not teach the PR as an artifact.
- Branch protection / rulesets, required status checks, enforcing squash-merge-only at the repo setting → **L4**. This lesson teaches the *convention*; L4 makes it mechanical. Squash-merge is presented as the team's chosen default, not yet as an enforced rule.

**Deferred to later chapters:**
- CI on push/PR → **Ch097**. Reference only ("the CI gate next chapter relies on this workflow").
- Preview deployments per PR, Neon branch per preview, two-layer rollback → **Ch098**. Reference only.
- Schema-migration PR cadence → **Ch099**.

**Named once, then cut (one line max, do not expand):** Git Flow (cut as historical overhead), GitLab/Bitbucket (course teaches GitHub), signed commits (GPG/SSH — valid for sensitive enterprise repos, not minimum-viable), Conventional Commits (only with changelog/semver automation), Git GUIs (interchangeable).

**Out of scope entirely (do not mention):** submodules, subtrees, monorepo tooling, worktrees, Git internals beyond the four objects (refs/packfiles/object store), `git filter-repo`/BFG (that's L2's one-liner for the secret case), the stacked-PR pattern (L3 territory), merge queue (L3).

**Code-conventions note:** `Code conventions.md` has no Git-workflow section (it's code-style + tooling-config focused); nothing there constrains this lesson's commands. The lesson's commands and config are themselves part of what would seed such a section later. No deliberate divergences to flag.
