sources:
  96.1: Trunk-based Git for teams
  96.2: Reflog, bisect, and the rescue toolkit
  96.3: The pull request as designed artifact
  96.4: Rulesets that enforce the workflow

questions:
  - source: 96.1
    question: |
      Your team squash-merges every PR by default. For which one of these PRs would a senior actually reach for a *real merge commit* instead, preserving the branch's individual commits on `main`?
    choices:
      - text: |
          A normal feature branch with the usual "wip", "fix typo", and "address review" commits on it.
        correct: false
      - text: |
          A deliberate refactor where each commit is a self-contained step — "rename the type", then "move the file", then "update the call sites" — that you genuinely want recorded separately on `main`.
        correct: true
      - text: |
          A large PR that touches a lot of files, so squashing it would produce one commit with a big diff.
        correct: false
    why: |
      Squash-merge is the default precisely *because* feature branches are scratchpad noise. The exception is the rare multi-commit refactor where each commit is a meaningful, deployable checkpoint worth keeping on `main` — not "this PR is big". Size alone is never the trigger; whether the individual commits are each a clean story is.

  - source: 96.2
    question: |
      A test that passed on a known-good commit weeks ago is failing now, and there are roughly forty commits in between with no obvious culprit. Which tool is built for exactly this, and why does the chapter's squash-merge habit make it trustworthy here?
    choices:
      - text: |
          `git bisect` — and because every commit on `main` is one complete, deployable change, each midpoint it checks out genuinely worked or genuinely didn't.
        correct: true
      - text: |
          `git reflog` — and because it keeps a 90-day journal of every commit, the broken one is still recoverable.
        correct: false
      - text: |
          `git blame` — and because squash-merge keeps one commit per change, the annotation points straight at the PR that introduced the regression.
        correct: false
    why: |
      `bisect` binary-searches a known-good-to-bad range — log₂(N) tests instead of N. On a messy history its midpoints can be half-built "wip" commits that fail for unrelated reasons, poisoning the search; squash-merge guarantees each midpoint is a whole, deployable PR, so its result is meaningful. `reflog` recovers lost work, and `blame` answers "who wrote this line" — neither searches a range for a regression.

  - source: 96.2
    question: |
      Why does this chapter teach `git reflog` *before* you've ever lost work, rather than when you need it?
    choices:
      - text: |
          The reflog has to be enabled with a config flag before it starts recording, so you must set it up in advance.
        correct: false
      - text: |
          The moment you'd reach for it is the moment you think "I just lost my work" — the worst possible time to be reading docs for a command you've never run.
        correct: true
      - text: |
          Reflog entries for unreferenced commits expire after 30 days, so you have to recover work the same day you create it.
        correct: false
    why: |
      The reflog records automatically — no setup flag — so it's already capturing your history. The point of front-loading it is psychological: by the time a sinking feeling tells you work is gone, you need to *already* know `git reflog` exists, not be discovering it under stress. (The 30/90-day expiry is real, but it's a limit, not the reason to learn it early.)

  - source: 96.3
    question: |
      A junior optimizes for shipping *fewer* PRs because batching feels efficient. Why does an experienced engineer optimize for the opposite — more, smaller PRs?
    choices:
      - text: |
          Smaller PRs run CI faster, so the team merges more changes per hour.
        correct: false
      - text: |
          GitHub ranks smaller PRs higher in reviewers' queues, so they get attention sooner.
        correct: false
      - text: |
          Small forces one logical change, which makes the PR reviewable, which makes it cleanly revertible — the three properties reinforce each other so each PR fits in one reviewer's head.
        correct: true
    why: |
      Small, reviewable, reversible aren't three separate goals — they're one property seen from three angles. Small almost forces a single logical change; a single logical change is one a reviewer can hold in their head *and* one a single `git revert` undoes cleanly. CI speed and queue ordering aren't the reason; reviewability and reversibility are.

  - source: 96.3
    question: |
      You're unsure your approach is right and want a colleague to sanity-check the direction before you build the rest. You're tempted to just open a draft PR "to be safe" on most of your work. Why is making drafts your default a mistake?
    choices:
      - text: |
          Drafts can't run CI, so you'd lose the early-warning signal from the checks.
        correct: false
      - text: |
          Reviewers learn that drafts aren't ready and skip them, so a PR you open as a draft can sit ignored for days.
        correct: true
      - text: |
          A draft PR can't be linked to a CODEOWNERS file, so the right reviewers never get auto-requested.
        correct: false
    why: |
      A normal PR gets attention; a draft signals "not ready" and gets skipped. Drafts earn their weight only on a specific trigger — uncertain approach, dependency on an unmerged PR, or using CI as an early-warning signal — not as a blanket default. (Drafts *do* run CI and *do* honor CODEOWNERS routing.)

  - source: 96.4
    question: |
      You add `/app/billing/ @org/billing-leads` to `.github/CODEOWNERS` and confirm the billing leads now get auto-requested on every billing PR. Yet those PRs keep merging without their approval. What's missing?
    choices:
      - text: |
          The `Require review from Code Owners` rule in the ruleset — without it, CODEOWNERS only auto-requests reviewers who can be ignored.
        correct: true
      - text: |
          The line needs to move to the top of the file, since CODEOWNERS uses first-match-wins ordering.
        correct: false
      - text: |
          The `Require approvals: 1` rule, which is what actually counts a code owner's approval.
        correct: false
    why: |
      The file is the *data* (who owns what); the rule is the *switch* (whether that data blocks a merge). Without `Require review from Code Owners`, owners are auto-requested but ignorable. CODEOWNERS is also *last*-match-wins, not first; and `Require approvals: 1` would be satisfied by *any* reviewer, not specifically the owner.

  - source: 96.4
    question: |
      GitHub offers two mechanisms for protecting `main`: branch protection rules and rulesets. For a team standing up a repo in 2026, which is the right default, and what's true of the other?
    choices:
      - text: |
          Use rulesets — the newer default that targets multiple branch patterns, layers, and audits bypasses; branch protection rules are the legacy mechanism, still functional, that older tutorials show.
        correct: true
      - text: |
          Use branch protection rules — the stable, battle-tested mechanism; rulesets are still in preview and shouldn't gate production merges.
        correct: false
      - text: |
          They're interchangeable aliases for the same settings page, so it makes no difference which you pick.
        correct: false
    why: |
      Rulesets are GitHub's newer replacement and what a new repo surfaces today — they can target multiple branch patterns, stack, and carry an audited bypass list. Branch protection rules still work and aren't deprecated, but they're the legacy mechanism behind the old "Branches → Add rule" screen. Both enforce the same primitives, so they're not interchangeable UIs of one thing.
