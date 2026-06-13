# Reflog, bisect, and the rescue toolkit

Sidebar label: Reflog, bisect & rescue

## Lesson framing

This is the chapter's hands-on Git-mechanics lesson. L1 landed the everyday loop and the trunk-based defaults; L2 is the toolkit the student reaches for *when something goes wrong* (lost work, a regression, a commit on the wrong branch) or *before history leaves the branch* (shaping messy WIP into one clean change). L3 (the PR) and L4 (rulesets) follow; this lesson must stay at the command-line level and not drift into PR/enforcement territory.

Conclusions from brainstorming that shape the whole lesson:

- **Organize by problem, not by command.** A reference list of twelve `git` verbs is exactly the shape a student forgets. Each tool is introduced by the *trigger* that earns it ("a bad rebase wiped four hours" → reflog), per the course's "trigger before tool" filter. The command is the payoff, not the headline.
- **One mental model gates everything: "history is mutable until pushed and merged."** Teach this *first* and refer back to it at every tool. It's the single idea that tells the student which tools are safe where — rewrite freely while local, `--force-with-lease` on your own pushed branch, never rewrite `main` (revert instead). Without this spine the toolkit is twelve disconnected tricks; with it, it's one decision (where does this commit live?) plus the matching move.
- **Teach reflog *before* the student needs it — this is explicit in the chapter framing.** The trigger for reflog is "I think I lost work," and by then it's too late to go learn it. Front-load it as the safety net so the rest of the lesson (rebase, reset, cherry-pick) can be taught fearlessly: "you can't permanently lose a committed snapshot, so experiment."
- **Pair the tools with L1's squash-merge discipline where it pays off.** Bisect is trivial on a one-commit-per-PR `main`; revert is clean on an atomic squash commit. Call this out — it's the chapter's reward for the discipline, and the "bisect-friendly main" is a load-bearing reflex per the chapter framing.
- **Mental model target:** the student ends able to answer "where does this commit live (local / my pushed branch / shared `main`)?" and pick the right move; reaches for `reflog` reflexively the moment work feels lost; runs `bisect run` instead of bisecting by hand; reverts on `main` instead of rewriting it; shapes a feature branch with `rebase -i` + `--fixup`/`--autosquash` before pushing.
- **Cognitive-load staging:** safety net (reflog/stash) → blame hunting (bisect) → surgical moves (cherry-pick/revert) → history shaping (amend → `rebase -i` → autosquash) → the cross-cutting plumbing every tool needs (conflict resolution, `log`/`blame`, `switch`/`restore`) → a capstone that drills the five recovery scenarios. Each tool's "watch-out" lives inside the section teaching it, never bundled at the end.
- **Interactivity:** the `learngitbranching.js.org` embed (`GitBranchingEmbed`) is the ideal vehicle for the *graph-mutating* tools (rebase, cherry-pick, reset/reflog mental model) — the student sees the commit graph change as they type, which is exactly what makes these commands click. Use it for the conceptual "commits are nodes, branches are pointers, nothing is deleted" intuition and for interactive-rebase/cherry-pick reps. It can't run `reflog`/`bisect`/`stash` (not in LGB's command surface), so those stay as terminal `Code` blocks + diagrams. The capstone is a decision-walker (match scenario → recovery move), not a live sandbox, because the recovery commands are destructive and not reproducible in a toy.
- All terminal examples use `bash` Code blocks. Reuse L1's running branch `feat/invoice-status` for continuity. pnpm is the package manager (relevant only if a `bisect run` example invokes a test script — use `pnpm test` / `pnpm vitest run`).

## Lesson sections

### Introduction (no header)

Open with three one-line war stories drawn from the chapter framing, framed as the senior question: a bad rebase wiped four hours of work; a test broke last week and nobody knows which of 40 commits did it; a fix lives on a feature branch that won't merge for a week but prod needs it now. State the lesson's promise: four power tools — `reflog` (recovery), `bisect` (regression hunt), `cherry-pick`/`revert` (surgical moves), `rebase -i` (history shaping) — plus the supporting cast, each earned by a trigger. Connect to L1: "you now ship via small PRs and squash-merge; this lesson is what you do when a ship goes sideways, and why that squash-merge discipline makes recovery cheap." Keep it warm and brief. Do **not** preview the mental model here as a section — let the first body section own it.

### Where a commit lives decides what you can do to it

The load-bearing mental model, taught first because it gates every tool. Three zones of mutability:

- **Local-only commits** — fully mutable. Rewrite, reorder, squash, drop freely. Nobody else has them.
- **Pushed to your feature branch, not merged** — mutable *with care*. Your branch only; rewrite then `git push --force-with-lease` (the reflex from L1). The lease check is what protects a teammate who pushed in between.
- **Merged to `main`** — immutable. Others have pulled it; rewriting shared history is off the table. The only undo is `git revert`, which adds an inverse commit (covered later).

Frame the whole toolkit through this: every tool below operates in "local or feature-branch-only" by default; `revert` is the one exception that touches shared history, and it does so *additively*, never by rewrite.

Reinforce with a key supporting intuition the student needs for reflog/reset to make sense: **a commit is a snapshot that isn't deleted just because no branch points at it** (callback to L1's "commit = snapshot, branch = movable pointer"). Reset/rebase move pointers; the old snapshots linger (until GC) and the reflog remembers where they were.

Components:
- A simple diagram: three labeled zones (Local · My pushed branch · Shared `main`) as a left-to-right strip with a "mutability" gradient and the allowed move under each (rewrite freely / force-with-lease / revert only). HTML+CSS phase-strip (per diagrams INDEX, "sequential phase strip" → HTML+CSS), wrapped in `<Figure>`. Pedagogical goal: one glance encodes the decision the student will make for every recovery.
- `GitBranchingEmbed` here (level `intro1` or a `command=` that builds a few commits then a branch) to ground "branch is a pointer, commits are nodes" *before* the scary tools — let the student type `git commit`/`git checkout -b`/`git reset` and watch pointers move. Caption frames it as "moving pointers never deletes commits."

Terms (`Term`): GC (garbage collection — "Git eventually prunes commits no branch or reflog can reach; until then they're recoverable"), HEAD (re-explain briefly: "pointer to your current commit/branch").

### The reflog is your undo history, and you set it up by knowing it exists

Teach reflog as the safety net *before* the destructive tools, per chapter framing. Content:

- What it records: every move of `HEAD` — commits, checkouts, resets, rebases, merges. It's a local, per-repo journal of where you've been.
- The recovery flow: `git reflog` to read the list (each line `HEAD@{n}: <action>`), find the hash from *before* the disaster, then `git reset --hard <hash>` to jump back, or the safer `git branch recover-work <hash>` to park it on a new branch without moving the current one.
- The trigger: the instant you *think* "I lost work." Emphasize the meta-point — the student must already know the command exists, because panic is not when you learn a new tool.
- Retention: roughly 90 days for reachable entries, ~30 for unreachable, before GC can prune. Plan accordingly; the reflog is a recent-history net, not an archive.
- Watch-out (inline): the reflog is *local* — it doesn't help recover something only a teammate had, and a fresh clone has an empty reflog.

Components:
- `Code` (bash) showing a realistic `git reflog` excerpt (with a `reset --hard` and a `rebase` visible in the log) and the two recovery commands. Annotate with `AnnotatedCode` if directing attention to the action labels vs. the hash vs. the recovery line earns it; a plain `Code` with a short walkthrough is acceptable if simpler.
- A small DiagramSequence (optional, only if it adds over prose) showing: (1) HEAD at commit C with work, (2) `reset --hard HEAD~2` moves HEAD back to A — C and B now "dangling," (3) reflog still lists C's hash, (4) `git reset --hard <C>` restores. Pedagogical goal: make "nothing was deleted, the pointer just moved" visceral. Reuse the snapshot/pointer intuition from the prior section.

### git stash parks unfinished work when the branch has to change

The scratchpad tool, taught right after reflog because both are "hold onto work safely." Content:

- The trigger: an emergency context-switch arrives (urgent review, hotfix) and the current working tree isn't commit-shaped.
- `git stash push -m "wip: invoice filter"` saves and cleans the tree; `git stash pop` restores (and drops); `git stash list` shows the pile.
- Note the L1 config `rebase.autoStash=true` already auto-stashes around `git pull --rebase` — connect it so the student sees stash isn't an isolated trick.
- Watch-out (inline): stashes accumulate silently and lose their context fast; a stash older than a day is usually abandoned work — turn it into a commit or `git stash drop` it. Prefer a throwaway WIP commit on a branch over a long-lived stash.

Component: one `Code` (bash) block, push → switch branch → pop. Keep it tight; this is a small tool.

### git bisect finds the commit that broke it by binary search

The regression-hunting power tool. Content:

- The problem class: a test passed on a known-good baseline and fails now; the change set since is non-trivial. This is *not* "I just wrote a bug" — it's "a regression hides somewhere in N commits."
- Manual flow: `git bisect start`, `git bisect bad HEAD`, `git bisect good <known-good-sha>`. Git checks out the midpoint; the student runs the test, marks `git bisect good`/`bad`; repeat. Stress the cost: `log2(N)` steps — 1000 commits in ~10 marks. End with `git bisect reset` to return to where you were.
- The automation that makes it a senior reflex: `git bisect run pnpm test` (or a script). Bisect drives the whole search itself, marking each step by the command's exit code (0 = good, non-zero = bad, 125 = skip). Frame `bisect run` as the default — manual marking is for non-scriptable repros.
- **The bisect-friendly `main` payoff (load-bearing reflex).** L1's squash-merge means every commit on `main` is one whole shipped change — bisect lands on a single PR with a green, deployable tree, never a "wip"/"fix typo" commit with a broken intermediate state. Contrast explicitly with a merge-commit history full of half-built commits that bisect can't trust. This is the chapter rewarding the discipline.
- Watch-out (inline): intermediate broken commits poison a manual bisect (use `git bisect skip`); squash-merge prevents this structurally — another reason for the L1 discipline.

Components:
- `Code` (bash) for the manual session and the `bisect run` one-liner, side by side or sequential.
- A diagram of the binary search itself: a row of ~16 commit dots (good…?…bad), DiagramSequence stepping the search — step 1 marks the whole range good→bad, each subsequent step halves the suspect window and re-colors, final step isolates the culprit dot. Pedagogical goal: make "log(N) not N" concrete and show *why* you only test the midpoint. This visual is the heart of the section.

### cherry-pick and revert move and undo individual commits

Group the two "surgical commit" tools; they're conceptually paired (apply a commit vs. apply a commit's inverse) and the student must learn *which zone each belongs to* — the through-line from section 2.

- **`git cherry-pick <sha>`** — replay one commit from another branch onto the current branch. Triggers: a fix sitting on a not-yet-mergeable feature branch needs to ship *now* via its own small PR; pulling one commit out of an abandoned branch; (rare in trunk-based) backporting to a release branch. Mechanics: creates a *new* commit, same content, different hash. Watch-out (inline): cherry-picking a commit that later merges normally creates a duplicate (same diff, two hashes) — usually harmless; `git cherry-pick -x <sha>` appends "(cherry picked from commit …)" so the lineage is traceable. Anti-pattern call-out: cherry-picking from `main` onto a feature branch instead of rebasing the branch — diverges history; rebase to stay current, cherry-pick only to *move* a commit.
- **`git revert <sha>`** — the undo-on-shared-history primitive. A bad commit shipped to `main`; rewriting is off the table (section 2). `revert` creates a *new* commit applying the inverse — clean rollback that preserves the audit trail. The reflex: **production rolls back via `revert`; feature-branch mistakes get fixed by `rebase -i`/`amend`.** Forward-ref (one line, no detail): the Ch098 rollback story has two layers — Vercel re-promotes the previous deployment for the running app, `git revert` undoes the code that produced it.

Reinforce the zone model: cherry-pick is a feature-branch/local move; revert is *the* tool the moment a commit is on shared `main`.

Components:
- `CodeVariants` contrasting the two on the same scenario ("a bad commit") — tab "It's only on my branch → `rebase -i`/drop or amend" vs. "It already shipped to `main` → `git revert`." First sentence of each variant states the zone. This A/B is the cleanest way to lock in the decision.
- `GitBranchingEmbed` with a `command=` that sets up two branches, for the student to practice `git cherry-pick` and watch the commit copy across. Caption: "Same change, new hash — cherry-pick copies, it doesn't move."

Term (`Term`): backport ("applying a fix made on a newer line of work back onto an older release line").

### Shaping history before it leaves the branch

The history-editing cluster, staged simplest → most powerful so cognitive load ramps. All of it lives in the "local / my-branch" mutable zone — open the section by re-anchoring there ("everything here rewrites commits, so it's only safe before merge"). The senior workflow framing: write commits messily as you work, then clean them into a readable narrative with `rebase -i` right before pushing.

#### git commit --amend fixes the most recent commit

The one-commit revision and the gateway to history editing. "I forgot to add a file" or "the subject has a typo": stage the fix, `git commit --amend` (opens editor for the message) or `git commit --amend --no-edit` (content only, keep message). Past the *latest* commit, it's the wrong tool — that's `rebase -i`. Watch-out (inline): amend after pushing rewrites the pushed commit → needs `git push --force-with-lease`, and forgetting the force-push leaves local and remote silently diverged.

Component: short `Code` (bash) — stage, `--amend --no-edit`, force-with-lease.

#### git rebase -i rewrites a run of commits

The core history-shaping tool. Content:

- `git rebase -i origin/main` (or `HEAD~5`) opens an editor: one line per commit, each prefixed with a verb. Walk the verb menu: **pick** (keep), **reword** (keep, edit message), **edit** (stop after applying so you can amend/split), **squash** (fold into previous, combine messages), **fixup** (fold into previous, drop message), **drop** (remove), and reordering by moving lines. The list is top-to-bottom = oldest-to-newest — a common point of confusion, call it out.
- The senior workflow, concretely: collapse three "fix typo" commits into the feature commit (`fixup`), reword a vague subject (`reword`), reorder so commits read as the logical story, split an over-large commit (mark `edit`, `git reset HEAD~`, restage in pieces, `git rebase --continue`).
- Watch-out (inline): `rebase -i` on commits others have already pulled rewrites *their* history — only do it on your own un-merged branch; this is the section-2 rule made operational.

Components:
- `AnnotatedCode` on the rebase-todo editor buffer (the `pick … / pick … / pick …` list). Steps highlight each verb line and explain the action — this is exactly the "one block, focus attention on different lines" case `AnnotatedCode` is for. Use color: green for keep/squash, red for drop, blue for reword/edit.
- A before/after diagram of the commit graph: messy branch (5 dots: feat, "wip", "fix typo", feat, "fix review") → clean branch (2 meaningful dots) after the rebase. `TabbedContent` (Before / After) or a two-panel `Figure`. Goal: show that rebase reshapes the *shape* of history, and that the cleaned branch is what reviewers should see.
- `GitBranchingEmbed` for an interactive `rebase -i`-style rep (LGB supports `git rebase` and the interactive flows in `rebase` levels — e.g. open at a relevant level or `command=`). Let the student squash/reorder and watch the graph linearize. This is the single highest-value interactive moment in the lesson.

#### Autosquash turns review fixes into the commit they belong in

The shortcut that makes `rebase -i` low-friction in the PR loop (and the L1 debt: L1 deliberately omitted `rebase.autoSquash` from its config block, to be added here). Content:

- A review comment lands; the fix belongs *in* the original commit, not in a noise commit. `git commit --fixup=<sha>` creates a `fixup! <subject>` commit; `--squash=<sha>` the same for squash. Then `git rebase -i --autosquash origin/main` auto-reorders each fixup directly under its target and pre-marks it `fixup` — you just save.
- Set it once: `git config --global rebase.autoSquash true` so plain `git rebase -i` always autosquashes. **Explicitly note this is the sixth config line, extending L1's five-line block** (L1 left it out on purpose).
- Forward-ref (one line): L3 uses this in the PR review loop — fixup commit → push → reviewer sees "compare since last review" → squash-merge collapses the rest. Don't teach the PR loop here.

Component: `Code` (bash) — `git commit --fixup=<sha>` then `git rebase -i --autosquash`, plus the config line.

### Resolving the conflicts these tools create

Cross-cutting plumbing every history tool needs — merge, rebase, cherry-pick, and revert can all stop on a conflict. Taught once here so the earlier sections don't each re-explain it. Content:

- What a conflict looks like: Git writes `<<<<<<<` / `=======` / `>>>>>>>` markers into the file (ours / theirs). Briefly decode which side is which during a rebase (it can feel inverted — "ours" is the branch being replayed onto).
- The universal resolve loop: edit to the intended result, `git add <file>`, then continue the operation with the matching verb — `git rebase --continue`, `git merge --continue`, `git cherry-pick --continue`, `git revert --continue` — or bail with the `--abort` form (and reflog as the net if `--abort` came too late, callback to section 3).
- Tooling reflex: VS Code's three-way merge editor beats the terminal for non-trivial conflicts (visual ours/theirs/result panes). No religion — terminal for trivial, GUI for gnarly.
- The `rerere` payoff (L1 enabled `rerere.enabled=true`; L1 forward-referenced this exact moment): "reuse recorded resolution" remembers how you resolved a given conflict and replays it automatically on the *same* conflict in a later rebase — real time saved on a long-lived branch rebased repeatedly. Close the L1 debt explicitly.

Components:
- `Code` showing a conflicted file with markers, then the resolve-and-continue sequence. `AnnotatedCode` is a good fit to highlight the three marker lines separately, then the resolved version.
- Term (`Term`): rerere ("reuse recorded resolution — Git replays a conflict fix it has seen before"), three-way merge ("merge that consults the common ancestor plus both sides, not just the two tips").

### Reading history: log, blame, and the modern checkout split

A compact reference of the read-and-navigate commands a senior actually types — grouped because they're investigation tools, not mutations, and the student needs them to *find* the sha the other tools operate on. Keep it terse (reference register), but each with its trigger.

- **`git log` invocations:** `git log --oneline -20` (recent history as a changelog), `git log --graph --oneline --all` (what the branch topology actually looks like), `git log -p <file>` (one file's changes with diffs), `git log -S "someString"` (the pickaxe — commits that added/removed a literal string), `git log --author=<name>`. Reflex: `git log` answers most "when did this change / where did this sha come from" questions before `blame` does — and it's how you get the `<known-good-sha>` for bisect and the `<sha>` for cherry-pick/revert.
- **`git blame <file>`** — sha + author + date per line; `git blame -L 40,80 <file>` for a slice; GitLens in VS Code for inline. Trigger: "who/why does this line exist." Pair with `git log -p` (or `git show <sha>`) on the resulting commit to read the *whole* change, not just the line.
- **`git switch` / `git restore` — the split that retired `checkout`'s overload.** Modern Git split the overloaded `git checkout`: `git switch <branch>` changes branch, `git switch -c <branch>` creates+switches, `git restore <file>` discards working-tree changes, `git restore --staged <file>` unstages. The student *can* keep using `checkout`, but the senior reflex prefers `switch`/`restore` because the intent is unambiguous (one verb, one job). **Present these as stable, not experimental** — they shed the long-standing "experimental" label in Git 2.51 (2025); any older tutorial calling them experimental is out of date. Named and used in this lesson's examples (introduced in L1 as the loop already; here they're the explicit reflex).

Components:
- `Code` (bash) with the annotated `git log` invocation menu — a comment per line stating what each answers. (Inline `#` comments are the right call here despite the repo's "rare comments" rule; note this is a deliberate teaching divergence — these are reference-card annotations, not code narration.)
- A small `Buckets` exercise (optional, if it earns its place): sort a handful of `checkout` usages into "becomes `switch`" vs. "becomes `restore`" — drills the split without prose. Cut if it bloats the lesson.

### The recovery muscle memory

The capstone, tying the toolkit back to the chapter framing's five scenarios. This is where the student practices *matching a situation to the move* — the actual skill, since in a real incident the hard part is picking the tool, not typing it.

Lead with the "I committed to the wrong branch" rescue in full prose (the most common real case), two paths:
- **Path A (not pushed):** `git log` to grab the sha → `git reset --hard HEAD~N` to undo locally → `git switch -c correct-branch` → `git cherry-pick <sha>`.
- **Path B (pushed, no PR yet):** same, plus `git push --force-with-lease` on the original branch.
- Reflog is the net if any step goes sideways.

Then the five-scenario drill as the assessment:

1. Lost a commit after `reset --hard` → reflog → reset.
2. Committed to the wrong branch → reset + cherry-pick (Path A/B above).
3. Committed a secret → reflog shows it, but the file in history is irrelevant once you **rotate the secret** (the secret leaked the instant it hit the remote; deletion from history is theater). One-line pointer: removing it from history (`git filter-repo`/BFG) is a security-playbook step, *not* the primary fix — rotation is. (Callback to L1's secret-in-history rule.)
4. Rebase went sideways → `git rebase --abort`; past the abort window → reflog.
5. A test started failing sometime last week → `git bisect run`.

Components:
- `StateMachineWalker` (`kind="decision"`) as the capstone exercise: root question "What went wrong?" branches to each scenario; each leaf names the recovery move and the *why*. This is the perfect fit — it forces the student through the senior's triage order (where does the commit live? is it pushed? is it on `main`?) and the lesson lives in the *matching*, exactly what the walker is for. Verdicts: "reflog → reset", "reset + cherry-pick", "rotate the secret", "rebase --abort (else reflog)", "bisect run".
- Reinforce with one `MultipleChoice` or `Sequence` if a second checkpoint is wanted — e.g. a `Sequence` ordering the wrong-branch Path-A steps. Keep the capstone walker as the centerpiece; add at most one supporting exercise.

### External resources (optional)

`ExternalResource` cards: the official `git-reflog`, `git-bisect`, and `git-rebase` docs; Atlassian's rewriting-history tutorial as a strong secondary. Optionally a short YouTube via `VideoCallout` if a high-quality, recent (<~2 yr) "git reflog / bisect saved me" walkthrough is found — the resourcer can source it; not load-bearing.

## Scope

**Prerequisites to redefine in one line each (taught in L1, do not re-teach):** commit = snapshot / branch = movable pointer / staging area = slicer / remote; `git pull --rebase` and the everyday loop; `--force-with-lease` over `--force`; squash-merge → one-commit-per-PR `main`; the five global config lines; secret-in-history → rotate. Touch each only as far as the current tool needs it.

**This lesson owns:** `reflog`, `stash`, `bisect` (+ `bisect run`), `cherry-pick` (+ `-x`), `revert`, `commit --amend`, `rebase -i` (full verb menu + split), `--fixup`/`--squash`/`--autosquash` (+ the sixth config line `rebase.autoSquash`), the conflict-resolution loop, `rerere` payoff, `git log` invocations, `git blame`, `git switch`/`git restore`, the "mutable until pushed and merged" model, the wrong-branch rescue, the five recovery scenarios.

**Out of scope — do not teach:**
- PR mechanics (description template, draft PRs, CODEOWNERS, `gh` CLI, fixup-in-review loop) → L3. The autosquash section may *forward-ref* the review loop in one line only.
- Branch protection / rulesets, squash-merge-only enforcement → L4.
- CI on push/PR (bisect's `pnpm test` invocation is just a command, not a CI lesson) → Ch097.
- Preview deployments / the Vercel-promote rollback layer → Ch098 (revert section forward-refs in one line only).
- `git filter-repo`/BFG history scrubbing → named once in scenario 3 as a security-playbook pointer, deferred; rotation is the fix.
- Signed commits (GPG/SSH) → named once in L1, cut here.
- `git worktree`, submodule recovery, Git internals (objects/refs/packfiles), GitLab/Bitbucket → out of scope (worktree and internals named at most once if natural, otherwise cut).
- Conventional Commits → L1 deferred it to the team's call; not revisited.

## Code conventions notes

- `Code conventions.md` is a code-style doc with no Git-specific rules; nothing to align beyond package manager. Use **pnpm** for any script invocation (`pnpm test` / `pnpm vitest run` in the `bisect run` example) — the repo blocks npm/yarn via `only-allow pnpm`.
- Deliberate divergence from the repo's "comments are rare / never narrate code" rule: the `git log` invocation menu uses inline `#` comments as reference-card annotations. This is a teaching aid on shell commands (not application code) — flagged here so downstream agents keep them intentionally.
- Branch name `feat/invoice-status` reused from L1 for continuity per the continuity notes.
