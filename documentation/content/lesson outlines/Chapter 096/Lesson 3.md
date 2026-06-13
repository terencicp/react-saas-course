# The pull request as designed artifact

- Title: The pull request as designed artifact
- Sidebar label: The pull request

## Lesson framing

This is the third lesson of Chapter 096 (Git as shipping discipline). L1 taught the trunk-based loop (branch → `add -p` → commit → push → `pull --rebase` → squash-merge) and L2 taught the rescue toolkit (reflog, bisect, cherry-pick, revert, `rebase -i`, `--fixup`). The student already opens PRs mechanically; this lesson reframes the PR from a bookkeeping step into **the designed artifact** that is the team's unit of change — the thing reviewers read, CI runs against, the preview binds to, and the squash-merge commit memorializes on `main`.

Pedagogical stance, decisions-before-syntax. The senior contribution here is not `gh` syntax; it is the *shape* of the change and the *quality of the explanation*. Lead with the senior question (you've been merging at will; on a team the PR is the unit everyone else reads) and keep returning to the three-word rule **small, reviewable, reversible** as the spine. Almost everything else in the lesson is a consequence of, or a tool in service of, that rule. The student should leave able to (1) size and scope a change so it reviews in one sitting, (2) write a PR description a reviewer can act on without a synchronous conversation, (3) run the everyday review loop (fixup commits + squash-merge) from both author and reviewer seats.

Where beginners go wrong, target these explicitly. The 800-line "and while I was in there" PR; the description that says "see commits"; merging your own PR on a team; pushing after approval without re-requesting; never deleting branches; opening a draft as a default and getting ignored; treating every reviewer comment as a blocker. Each watch-out lives *in the section that teaches the concept it qualifies*, never bundled.

Mental model to install: a PR is a **proposal with an argument attached**. The diff is the proposal; the description is the argument (why, what to look at, how it was verified); the review is the negotiation; the squash-merge is the ratified result that becomes one line of `main`'s changelog. This connects directly to L1's "good history = one commit per shipped change" and L2's "bisect-friendly main."

Code/visual posture. This is a mostly-conceptual lesson — the artifacts are shell/`gh` command snippets and a markdown description template, not TS/JS application code. Use plain `Code` fences for shell and markdown; reserve `AnnotatedCode` for the one place focus must move across multiple parts of a single artifact (the description template). Use a `DiagramSequence` for the PR lifecycle (the load-bearing mental scaffold) and a small HTML/CSS "size ladder" figure for small-reviewable-reversible. The lesson's interactive centerpiece is a `CodeReview` exercise — it has the student *be* the reviewer, which is the most durable way to internalize what makes a PR reviewable. A short `Sequence` exercise checks the lifecycle ordering. Cognitive-load management: introduce the lifecycle first (the map), then drill into each stage; introduce the description template one section as a whole then walk it field-by-field.

Continuity. Reuse the running example branch `feat/invoice-status` from L1/L2 (commit subjects `Add invoice status filter` / `Wire filter to the query` / `Add status filter dropdown`) so PR examples land on familiar ground. The `gh` CLI is named with one line per command (web UI is the course default). Forward-reference CI (Ch097), preview deployments + the preview URL closing the screenshots section (Ch098 L5), and the deep review methodology (Ch103) — name, don't teach.

## Lesson sections

### Introduction (no header)

Open with the senior question, warmly and briefly. The student has been pushing to a personal branch and merging at will — fine for solo work. On a two-to-five-person team that breaks: the PR is now the **unit of change** that a teammate reads, CI runs against, the preview deployment binds to, and the squash-merge commit memorializes on `main`. Motivate with the concrete failure it prevents: the reviewer who opens a 900-line diff, can't hold it in their head, and rubber-stamps it — shipping the bug nobody caught. State the practical payoff: by the end the student can size, describe, and shepherd a PR so it lands in *one round of review*. Connect back to L1 ("one PR per logical change" was asserted there; this lesson is the *why* and the *how*) and L2 (the fixup-commit loop was named there; it's the everyday review mechanic here). Preview the spine: small, reviewable, reversible.

### A PR moves through checkpoints

Teach the PR lifecycle as the map before any drill-down. Each stage is a checkpoint whose goal is "this lands in one round." Stages: `git push -u origin feat/invoice-status` → open PR (`gh pr create` or web UI) → reviewers requested (auto via CODEOWNERS, taught later) → CI runs (Ch097, forward-ref) → preview deployed (Ch098 L5, forward-ref) → discussion + push fixups → approval → **squash-merge** → branch auto-deleted.

Vehicle: a `DiagramSequence` (it provides its own card, do not wrap in `Figure`). One `DiagramStep` per stage, each highlighting the active stage in a horizontal strip of nodes (reuse the simple `.node`/`.is-on` HTML-div pattern from the component docs; keep it horizontal and short for the laptop-viewport height cap). Per-step captions name what happens and who acts. Pedagogical goal: give the student a spatial scaffold so every later section can be located ("this is the discussion stage"). Keep CI/preview stages visibly "forward-referenced" in their captions so the student knows those mechanics arrive in later chapters.

Follow the diagram with a short `Code` block (bash, terminal frame) showing the bare push→create→merge happy path with `gh`, each command one line, to ground the stages in real commands without over-teaching the CLI here (the CLI gets its own short section later).

Close the section with a `Sequence` exercise: the student drags the lifecycle stages into order. This is a low-stakes recall check right after the map is drawn. Instructions: "Order the stages a PR moves through, from first push to merged." Steps in correct order = the lifecycle above. Reason: ordering drills are cheap and the lifecycle is inherently sequential, so it's a natural fit.

### Small, reviewable, reversible

The spine of the lesson. Teach the three-word rule as three mutually-reinforcing constraints, each with its concrete threshold and failure mode:

- **Small** — under roughly 400 changed lines is the rough ceiling for a serious review in one sitting; past it, reviewer attention drops and review degrades into rubber-stamping. Frame 400 as a soft heuristic, not a lint rule. Name the failure mode: the 800+-line PR gets skimmed.
- **Reviewable** — one logical change. No drive-by formatting, no "and while I was in there." A reviewer should be able to state the PR's purpose in one sentence. Failure mode: the mixed PR where a bug fix hides inside a refactor and the reviewer can't tell which lines are load-bearing.
- **Reversible** — atomic enough that one `git revert` (L2) undoes it cleanly. This pays directly into L1's bisect-friendly main and L2's revert-on-shared-history. Failure mode: the PR that bundles three concerns, so reverting it to fix one regression also rips out two working features.

Make the reinforcement explicit: small enables reviewable, reviewable enables reversible. This is the senior diff — most juniors optimize for "fewer PRs," seniors optimize for "each PR holds in one head."

Vehicle: a small HTML+CSS "size ladder" figure inside `<Figure>` — a horizontal bar/segment graphic showing three bands (e.g. green "~under 400: reviews well", amber "400–800: review degrades", red "800+: rubber-stamped") with one-line callouts. Pedagogical goal: make the abstract "small" concrete and memorable without implying a hard numeric gate. Keep it compact (well under the height cap). This is a "simple visual aid" diagram, not a system graph — exactly the kind the guidelines encourage.

Watch-outs belong here, inline: "and while I was in there" drive-by changes (split them into their own PR); bundling unrelated concerns (defeats reversibility). Do not make a separate watch-outs section.

### Splitting a big change into a stack

The natural follow-on to "small": what do you do when the real change is genuinely big? Teach the **stack of PRs** pattern. A large change splits into a dependency chain where each link is small and independently reviewable: PR 1 (pure refactor, no behavior change) → PR 2 (extract a helper) → PR 3 (use the helper at the call site) → PR 4 (the user-facing feature). Each PR is small, each reviews on its own, each merges in order.

Show the mechanic minimally: `gh pr create --base feat/step-1` chains a PR against another branch rather than `main`. Name the tooling that automates stack mechanics — Graphite, git-spice, Sapling — in **one line**; manual chaining is fine for most 2026 SaaS teams (trigger-before-tool: name the threshold — you reach for stack tooling when you're routinely juggling 3+ dependent PRs, not before).

Vehicle: a plain `Code` (bash) snippet for the `--base` chaining, plus optionally a one-line `FileTree`-style or inline list showing the four-PR chain. Keep it light — this is a named pattern the student should recognize, not a deep skill for this lesson. Reason for inclusion: it resolves the obvious objection to "keep PRs small" (some changes are big) and is a real senior move.

### The description is the argument for the diff

The highest-leverage section. The diff shows *what changed*; the description tells the reviewer *why*, *what to look at first*, and *how it was verified*. Without it the reviewer reverse-engineers intent from code — slow and error-prone. Frame the description as the author's argument that the change is correct and safe.

Teach the six-section template as a whole first, then walk it. Sections:
1. **What** — one-paragraph summary of the user-visible change.
2. **Why** — link the ticket / decision / thread; state the problem solved.
3. **How** — the non-obvious implementation choices and alternatives considered (skip the obvious; the diff covers it).
4. **Test plan** — what the author actually ran (the seeded test, the manual flow, the migration against a preview branch).
5. **Screenshots / video** — for UI changes; note the preview-deployment URL closes this in Ch098 L5 (forward-ref).
6. **Risks / rollback** — what could break and how to roll it back (ties to L2 `git revert`).

Vehicle: present the filled-in template as a single markdown artifact via `AnnotatedCode` (`lang="md"`). Author the full example description once on the `code` prop (a realistic `feat/invoice-status` PR description), then one `AnnotatedStep` per section highlighting that section's lines with a one-paragraph explanation of what earns its place and what to leave out. This is the textbook `AnnotatedCode` use case: one artifact, focus moving across multiple parts. Use `color="blue"` as default tint. Pedagogical goal: the student sees a *good* description in full, then learns to read its structure — better than six disconnected snippets.

After the annotated template, mention the repo's `.github/pull_request_template.md` that pre-populates the description box: name it here, note it ships with the repo as one-time setup, and that authoring it deeply is Ch102 L3's job (forward-ref). Senior shape: the six headings, **no required-checkbox theater** — a tooling "I ran the tests" checkbox is bypassed in seconds; the CI status check (Ch097) is the real structural enforcement. This is a senior-judgment point worth stating plainly.

Watch-out, inline: the "see commits" description wastes the reviewer's time; the description that restates the diff line-by-line adds nothing — explain the *why*, not the *what*.

### Review your own PR first

A small high-value reflex that deserves its own short section. Before assigning reviewers, open the PR's "Files changed" tab and read the diff as if you were the reviewer. Half the comments a reviewer would make surface in self-review. Leave inline comments on your *own* PR for context ("intentionally not handling X here because Y"). The reflex saves a full review round and signals care to the team.

Vehicle: prose only, short. No component needed. Reason: it's a behavioral habit, not a syntax or a system — over-illustrating it would add load. Place it right after the description section because self-review is the author's last step before requesting review.

### Draft PRs and when they earn their weight

Trigger-before-tool. A draft PR opens with "Draft" status, can't be merged, and signals "feedback wanted, not approval." Name the three triggers that earn it: (1) the approach is uncertain and an early reviewer can save a day of rework; (2) the PR depends on another not-yet-merged PR; (3) CI is the early-warning signal and reviewers shouldn't read yet. State the threshold the default crosses: non-draft PRs get attention, drafts get ignored — so **don't open drafts by default**, only when one trigger holds.

Vehicle: prose + a one-line `gh pr create --draft` snippet (`Code`, bash). Reason: it's a conditional tool, so the lesson must name the threshold (per the pedagogical guideline on conditional power tools), and the failure mode (drafts-as-default get ignored) is the watch-out, stated inline.

### Conversational review from both seats

Teach the review *conversation* at a working level — enough for the student to participate competently as author and reviewer — while explicitly deferring the deep review-methodology (the five-layer stack, formal severity taxonomy) to Ch103 (forward-ref, one line). Two subsections.

#### The comment styles that keep a review moving

The reviewer's vocabulary. Four comment shapes:
- **Suggestion** — GitHub's `suggestion` code-fence that renders as one-click apply; reach for typos and tiny refactors so the author accepts in one click.
- **Question** — "why this and not that?" Legitimate when the reviewer lacks context; illegitimate as a disguised demand.
- **Blocking comment** — "this must change before approval"; mark it with the **Request changes** review action so it's structural, not buried in a thread.
- **Nit** — explicit "non-blocking, optional"; signals the reviewer cares about the bar but won't hold the PR for style.

The author's reflex: respond to *every* comment, even with "good catch, fixed" or "deferred to follow-up issue #N." Silence reads as dismissal.

Vehicle: a `Code` (markdown) snippet showing the GitHub `suggestion` fenced block so the student recognizes the one-click-apply syntax. The rest is prose. Reason: the suggestion fence is a concrete syntactic thing worth seeing; the styles are vocabulary best taught in prose with a crisp definition each.

#### The 60-second pass and the 30-minute pass

The reviewer's two-gear job. **60-second pass**: read the description, scan the diff, flag the obvious (missing tests, missing migration, leaked secret). Exists so a dead-on-arrival PR doesn't burn 30 minutes. **30-minute pass**: re-read with full attention, follow each change to its callers, run the preview deployment, leave the review. The 30-minute pass is the *actual* review; the 60-second pass is triage.

Vehicle: prose, optionally a tiny two-column `TabbedContent` (label "60-second triage" / "30-minute review") listing what each pass checks — only if it reads cleaner than prose; otherwise prose. Reason: the two-gear framing is the senior diff (juniors do one undifferentiated slow pass or one undifferentiated fast pass).

#### Exercise: be the reviewer

The lesson's interactive centerpiece — a `CodeReview` exercise. The student reviews a small multi-file PR diff and leaves inline comments; the AI grades each against the plant's `kernel`. This is the highest-fidelity way to internalize "what makes a diff reviewable" because the student practices the reviewer's eye directly.

Design it on the `feat/invoice-status` storyline so it's continuous with the lesson. Two files, three plants, each a *senior-flaggable* defect that this lesson's content primes:
- A **scope** plant — an unrelated drive-by change smuggled into the diff (e.g. a formatting/rename churn in an untouched file), `kernel`: "unrelated drive-by change — belongs in its own PR" (tests the small/reviewable rule).
- A **reversibility/risk** plant — a change with no test and no mention in a (described) test plan, or a destructive change with no rollback note, `kernel`: "no test covers the new branch — the PR isn't safely revertible without it."
- A **correctness** plant — a real bug the reviewer should catch on the 30-minute pass (e.g. a filter that drops a status case, or a missing tenant scope consistent with course conventions), `kernel`: "filter omits the `archived` status — silent data loss in the list."

Use `ReviewIssue` long-form reveals to teach the senior reasoning behind each, and a `ReviewWhy` debrief tying the three back to small/reviewable/reversible. Author `kernel` as one crisp sentence each (only the kernel is sent to the grader). Count diff lines carefully for `line` props (every rendered line counts, including `ins`/`del`). Keep each file well under the size ceiling so the exercise itself models a reviewable PR. Grading note: degrades to "Lines graded" without a key — acceptable.

Reason for this exercise over alternatives: a `CodeReview` is purpose-built for PR review and forces active production (leaving real comments) rather than recognition. It directly assesses the lesson's load-bearing skill.

### The everyday loop: fixup commits and squash-merge

Close the author/reviewer cycle by connecting it to L1 and L2. The everyday loop: reviewer leaves a comment → author makes the fix as `git commit --fixup=<sha>` (L2) so the fix attaches to the original commit, pushes → reviewer re-reviews just the new commits via GitHub's **changes-since-last-review** filter on the Files changed tab (label may render as "Changes since your last review" — confirm exact wording at author time) → approve → **squash-merge** collapses the fixup noise → `main` shows one clean commit and the PR preserves the conversation for posterity.

Make the payoff explicit: this is *why* L1 chose squash-merge and *why* L2 taught `--fixup`. The messy in-progress commits and review-response commits never reach `main`; the reviewer still sees incremental changes; `main` stays bisect-friendly. The two disciplines from earlier lessons converge here.

Vehicle: `CodeVariants` (or a short `Code` sequence) contrasting the two author responses to a review comment:
- Variant "Plain fixup commit" — `git commit -m "address review"` then push (works, but adds a noise commit the squash will absorb).
- Variant "Targeted `--fixup`" — `git commit --fixup=<sha>` then push, and `git rebase -i --autosquash` if reshaping before a non-squash merge (the senior reflex; the fix is logically attached to its origin).
Prose for each makes the trade-off: with squash-merge both collapse to the same clean `main`, but `--fixup` keeps the *intent* legible during review. Reason for `CodeVariants`: it's a clean A/B of two related command sequences.

Watch-out, inline: pushing to the PR branch after approval without re-requesting review is a silent risk (the approval no longer covers the new commits) — note that the *structural* fix for this is the "dismiss stale approvals" ruleset in L4 (forward-ref).

### `gh`, CODEOWNERS, and the squash-merge setting

A consolidated "tools and repo settings that make the workflow real" section. Three subsections, each named at working depth with the deep enforcement deferred to L4.

#### The `gh` CLI, one line per command

The course defaults to the web UI; the CLI is faster once muscle memory lands and composes with shell aliases. Name the commands one line each: `gh pr create`, `gh pr view`, `gh pr checkout 123` (check out a teammate's PR locally to test it), `gh pr review`, `gh pr merge --squash --delete-branch`. Vehicle: a single `Code` (bash) reference block listing them with terse inline intent. Reason: the student should *recognize* these; this is a reference card, not a tutorial — explicitly a deliberate light touch.

#### CODEOWNERS routes reviewers automatically

`.github/CODEOWNERS` maps file-path globs to GitHub usernames/teams, so changes to owned files auto-request the right reviewers. Teach the data shape and the suggestion-vs-structural distinction: **without** the `require_code_owner_review` ruleset (L4) it only auto-*requests* (ignorable); **with** it, the owners' approval is *required*. State the design clearly: the file is the data, the rule is the enforcement, and the rule is L4's job (forward-ref). Pattern by ownership zones — auth, billing, schema, infra get codeowners; ordinary UI/feature work usually doesn't.

Vehicle: a `Code` (no language / `text`, titled `.github/CODEOWNERS`) snippet with a few realistic lines (`* @org/eng`, `/app/billing/ @org/billing-leads`, `/db/schema.ts @org/dba`). Note the globs are gitignore-style, **last match wins** — call this out as the single most common authoring mistake (ordering general-to-specific). Reason: CODEOWNERS is small but its last-match-wins semantics is a real gotcha worth a line.

`Tooltip`/`Term` candidate: CODEOWNERS (define inline as "the `.github` file mapping path globs to required/suggested reviewers").

#### Squash-and-merge as the repo's only merge button

The repo setting that makes L1's squash-merge discipline structural. In Settings → General → Pull Requests, enable **Squash and merge only** and disable "Allow merge commits" and "Allow rebase merging." Result: one commit per PR on `main`, no exceptions, no undocumented merge-button choices. Pair with **Automatically delete head branches** so merged feature branches don't pile up. Name **Allow auto-merge** in one line (queues the PR to merge when checks pass + reviews approve; reach when it's ready and you trust CI). Name **merge queue** in one line as a higher-team-size tool (serialized rebase-and-recheck to prevent landing-broken-main races) — cut at the 2026 SaaS-startup minimum (trigger-before-tool: name the threshold).

Vehicle: prose + a `Screenshot` of the GitHub repo PR settings *only if* a clean asset is readily available; otherwise prose with a short bulleted list of the toggles. Do not block on producing a screenshot. Reason: these are repo-settings facts; the mental model (the team's discipline is enforced by the button choices, not by hoping everyone picks the right one) is what matters, and that ties back to L1 and forward to L4's "structural enforcement over discipline" thread.

Watch-outs, inline across this section: merging your own PR without review on a team (defeats the gate — L4 enforces); not deleting branches after merge (stale-branch landfill — the auto-delete setting fixes it); assigning four reviewers when one suffices (diffuses responsibility); using a merge-commit button when squash is the convention (undocumented exception that pollutes history).

### Where the PR becomes the spine of everything (closing)

A short forward-looking close, not a new concept. The PR-as-unit-of-change discipline this lesson lands is the assumption every following chapter builds on: Ch097 wires CI to run on every PR (those checks become required gates); Ch098 L5 binds a Vercel preview deployment per PR with its own URL and Neon branch (closing the description's screenshots section); L4 of this chapter makes review and squash-merge *mechanically* enforced with rulesets; Ch099/Ch100 ship schema migrations across a series of small PRs; Ch103 teaches the deep review surface. One paragraph, each a single sentence, so the student sees the PR as the hub it is.

Optional `ExternalResource` cards: GitHub Docs "About pull requests" and "About code owners," and the GitHub CLI manual. Only durable official docs — no blog posts.

## Scope

Prerequisites to redefine *briefly* (already taught, do not re-teach): the trunk-based loop and squash-merge rationale (L1 — one line); `git commit --fixup` + `rebase -i --autosquash` and `git revert` (L2 — name and link, don't re-derive); `git push -u origin <branch>` and `--force-with-lease` (L1 — assume known).

This lesson does **not** cover:
- **Branch protection rules and rulesets** — L4 of this chapter. This lesson *names* `require_code_owner_review`, "dismiss stale approvals," and "require status checks" as the structural counterparts to the suggestions it teaches, but every enforcement rule and its setup is L4's job. Be careful to consistently frame CODEOWNERS and the squash-merge setting as "the data / the button" with "the rule" deferred.
- **CI status checks as required / the CI workflow itself** — Ch097. Reference CI running on the PR as a lifecycle stage and as the real enforcement behind "no checkbox theater," but author no workflow YAML and name no job specifics.
- **Preview deployments per PR and the preview URL** — Ch098 L5. Reference it as the lifecycle stage that closes the description's screenshots section; do not teach Vercel/Neon mechanics.
- **Authoring the PR template and the five-artifact docs-in-PR reflex** — Ch102 L3. This lesson *names* `.github/pull_request_template.md` and shows the six-section description it should contain, but the template's authoring and the docs-ship-in-the-PR discipline are Ch102's.
- **The deep review surface — the five-layer review stack, the formal severity labels (`blocking:`/`suggestion:`/`question:`/`nit:`/`praise:`), the principles-and-patterns review lens** — Ch103, applied in the Ch104 project. This lesson teaches the comment styles and the two-pass triage at a *working participant* level only; the review *methodology* is Ch103. (Note: the chapter outline says "Chapter 104" for the principles/patterns lens; the TOC places that teaching in Ch103 with Ch104 as the project — defer to Ch103 as the teaching home.)
- **Schema-migration PR cadence** — Ch099 / Ch100.
- **Issue templates and labels** — named in one line as a "grows past two people" tool; the course doesn't ship them as a lesson.
- **Merge queue mechanics at scale** — named once, cut.
- **AI-assisted review tooling** — out of scope.
- **GitLab/Bitbucket PR equivalents** — the course teaches GitHub only.
