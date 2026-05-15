## Concept 1 — The workflow / job / step / runner model

**Why it's hard.** Students arrive expecting CI to be one big script. The actual shape — many fresh runners executing parallel jobs that each run a sequence of steps, all bound by a YAML schema with its own trigger surface and expression syntax — has five moving parts and the names matter for everything downstream in the chapter.

**Ideal teaching artifact.** A single annotated walkthrough of the smallest-viable `ci.yml` (~30 lines, one typecheck job), where each region of the YAML is stepped through in order: trigger surface, workflow-level metadata, the job map, the runner, the step sequence, and the three foundational actions (`checkout`, `pnpm/action-setup`, `setup-node`). The student doesn't read it as a wall — they advance through it one highlighted region at a time with prose explaining what that region controls and which downstream concept depends on it. This is a Mechanics archetype, but framed as a guided tour rather than a feature dump.

**Engagement.** A Tokens round on the same file: click every place a runner-side cost is paid (checkout, install, the actual command), then click every place a *name string* is declared (workflow, job, step) — the second click prepares Concept 2.

**Components.**
- `AnnotatedCode` on the worked `ci.yml` skeleton — stepped highlight regions for trigger, permissions, concurrency, jobs, steps, and the three setup actions.
- `Tokens` on the same code block for the runner-cost / name-string follow-up.

**Project link.** The skeleton walked through here is the exact starting point the student extends in Chapter 21.5.2 to wire production CI; the lesson's worked file becomes the project's `ci.yml` scaffold.

---

## Concept 2 — The gate is a name string, not a feature

**Why it's hard.** Branch protection looks like it enforces "tests must pass." It doesn't. It enforces "a check with the literal string `test` reported success." Rename the job to `tests` and the ruleset's required-checks list silently matches nothing, the PR shows green, the gate disappears. This is the thread that runs through the whole chapter and the failure mode most likely to bite a team six months in.

**Ideal teaching artifact.** A wrong-by-default ambush. The student is shown a PR that merged with a broken build and asked to find the bug — *not* in the code, in the CI configuration. Two panels side by side: the branch-protection ruleset (with `test` in its required-checks list) and the workflow YAML (where the job is now named `tests`). The reveal is that GitHub reports the PR as fully green because there is no check named `test` to wait for, and "required checks must pass" is satisfied vacuously when none exist. A Pattern archetype where the structural enforcement (name-string discipline + two-file PRs) is named for what it prevents.

**Engagement.** A `MultipleChoice` immediately after: given four diff snippets (workflow rename, ruleset rename, both renamed in one PR, only the job's `name:` field changed), pick the ones that break the gate. The trick is that `name:` is cosmetic — only the job *ID* matters — and that the two-file paired PR is the only safe shape.

**Components.**
- Primary: `Figure` containing a hand-authored two-panel SVG (ruleset YAML on the left, workflow YAML on the right) with a visual connector line drawn between the required-check string and the matching job ID; the "after rename" state shows the connector severed.
- `MultipleChoice` for the diff-recognition follow-up.
- Alternative (deferred): a bespoke `RulesetWorkflowMatcher` widget that lets the student type into either panel and watch the connector live-attach or detach. Demoted because the moment is single-use within the chapter and the static SVG carries the same teaching weight.

**Project link.** In Chapter 21.5.2 the student wires the ruleset and the workflow in the same PR; this concept is what makes that pairing non-negotiable rather than ceremonial.

---

## Concept 3 — Why exactly these four jobs

**Why it's hard.** Students reach for the four-job baseline because the chapter prescribes it, not because they have a model for why these four catch orthogonal failure modes. "Tests cover correctness" feels like it should subsume typecheck; "build runs typecheck again" feels like it should subsume the standalone typecheck job. The orthogonality is real but invisible without examples.

**Ideal teaching artifact.** A Decision archetype framed as a bug-attribution drill. Six to eight realistic bug scenarios — an import cycle that `pnpm dev` misses, an unused-await Biome rule violation, a regression in an org-membership query, a build-time RSC/client-boundary violation, an env var read at build that's only set in prod, a typed-but-wrong call signature — each laid out with what the developer was doing when they introduced it. The student is shown which of the four jobs catches each, with the catch-mechanism named (TS-loader laziness, Biome's correctness rules band, Vitest's assertion, `next build`'s static analysis pass). The point is not memorization; it's the realization that removing any one of the four creates a class of bug that ships.

**Engagement.** A `Buckets` sort with the same scenarios as items and the four jobs as bins. The friction case — a bug that two jobs would catch — is the teaching moment: the *first* job to fail is the one that earns the gate slot.

**Components.**
- `Figure` with a hand-authored 4-quadrant SVG mapping each job to its canonical catch class (one representative bug name per quadrant).
- `Buckets` (two-column layout, four bins) for the recall sort.

**Project link.** Chapter 21.5 builds on exactly these four; 21.5.4's dual-write PR exercises every one of them (typecheck on the new column shape, lint on the unused-old-field path, test on the coalesce fall-through, build on the route that consumes both).

---

## Concept 4 — The five-minute budget and what it dictates

**Why it's hard.** The speed budget reads as a soft preference; it isn't. CI past five minutes wall-clock gets bypassed — by "merge anyway, I'll fix on main," by branch-protection exceptions, by frustration. The budget is the constraint that *decides* whether to cache, whether to parallelize, whether something belongs in the gate at all. Students who internalize "CI is slow because CI is slow" never learn the senior reflex of investigating builds past three minutes.

**Ideal teaching artifact.** A Concept archetype delivered as a stacked-bar comparison. Four wall-clock timings shown side by side: (a) one fat sequential job with cold cache, (b) one fat job with warm pnpm cache, (c) four parallel jobs cold, (d) four parallel jobs warm. Concrete numbers from the outline — cold install ~80s, warm ~30s, build ~2 min — make the trade visible. The slowest bar crosses the five-minute line; the warmest-parallel bar sits at ~4 minutes. The student sees that parallelism buys failure-granularity but not wall-clock against the slowest job, that caching is the only lever that moves the floor, and that adding a fifth blocking job pushes back past the line.

**Engagement.** Three short scenarios delivered as `MultipleChoice`: given a job that takes 90s and adds a check the gate genuinely needs, where does it go (fifth blocking job / signal-only / fold into existing)? Given a build that's grown to 4 minutes, what's the senior's first move (add `.next/cache`, shard tests, drop the gate to three jobs, upgrade runners)? Given a 7-minute warm CI, what's the bypass risk?

**Components.**
- `Figure` with a hand-authored stacked-bar SVG showing the four timings, with the 5-minute threshold drawn as a horizontal line. Cold-install / install / typecheck / build / test segments labeled within the bars.
- `MultipleChoice` cluster for the three trade-off scenarios.

**Project link.** Chapter 21.5.2 inherits this budget verbatim; the student measures their own pipeline against the threshold before merging the deploy PR.

---

## Concept 5 — Least privilege as a workflow posture

**Why it's hard.** Two failure modes converge here and most students recognize neither. First, `GITHUB_TOKEN`'s default permissions historically span more than they need, so any compromised step in any job inherits write access to issues, packages, and more. Second, `uses: some/action@v4` resolves to a *tag*, and tags can be force-pushed — the March 2026 trivy-action incident leaked every secret in scope of every workflow that pinned by tag. The defense layers (workflow-level `contents: read`, per-job raises, SHA-pinning for secret-handling actions, OIDC over long-lived secrets) are individually small but only work together.

**Ideal teaching artifact.** A misconception-first incident narrative paired with a hands-on hardening pass. The student sees a workflow YAML that *looks* normal — `permissions:` unset, actions pinned to `@v4`, secrets passed through `env:` to a step that echoes a derived JWT for debugging — and reads a short reconstruction of how each weakness amplifies a compromise. Then the student hardens the same file with a Tokens-style click-the-vuln drill: every clickable target is a defensible-by-default weakness (the implicit permissions, the unpinned secret-handling action, the echoed secret derivation, the missing OIDC reference for the deploy step forward-linked to 21.3). A Pattern archetype where each clicked weakness names the structural fix that prevents the class.

**Engagement.** The Tokens drill itself is the assessment — every correct click reveals the fix. The follow-up is a one-question `MultipleChoice`: "Which actions in your `ci.yml` should be SHA-pinned?" with the senior cut (only the ones in scope of `secrets:`; `checkout` and `setup-node` stay on `@v4`).

**Components.**
- `Figure` with the incident-reconstruction prose adjacent to the vulnerable workflow YAML.
- `Tokens` on the vulnerable workflow — targets cover implicit broad permissions, unpinned `uses:` for the secret-handling action, the `env: TOKEN: ${{ secrets.X }}` followed by an `echo` in a later step, and the long-lived `AWS_SECRET_ACCESS_KEY` that should be OIDC.
- `MultipleChoice` for the SHA-pinning cut.

**Project link.** Chapter 21.3 picks up OIDC for the Vercel deploy; the SHA-pinning and `permissions:` posture set here is what 21.5.2's production workflow inherits without re-derivation.

---

## Concept 6 — Gate versus signal

**Why it's hard.** The instinct is "if it's important, block on it." The senior cut is the opposite: blocking on the wrong thing trains bypass behavior that corrodes the *real* gates. A CVE in a dev-only transitive dep that fails `pnpm audit` should not block a Friday hotfix; a broken README link should not block a security patch. The student needs a clear principle for which side of the line a new check belongs on.

**Ideal teaching artifact.** A Decision archetype delivered as a sort. Eight to ten candidate checks — typecheck, lint, test, build, `pnpm audit`, `actionlint`, scheduled link-check, Dependabot version PRs, bundle-size delta, CodeQL — get sorted into "blocks merge" and "reports but does not block." The framing principle is stated once before the sort: *block when failure means production-broken; otherwise the cost of a false-positive gate is bypass habit.* The sort surfaces the edge cases — `actionlint` looks like infrastructure but isn't production-broken; a critical CVE in a *production* path is the rare case that flips audit into the gate; bundle-size has product-dependent answers.

**Engagement.** The `Buckets` sort is the assessment. The follow-up is a single prediction: "Your team adds CodeQL as a required check. Six months later, what is the most likely failure mode?" delivered as `MultipleChoice` with the senior answer being bypass-habit on the original four.

**Components.**
- `Buckets` two-column sort with the candidate checks as items and "gate" / "signal" as bins. Each item carries a short rationale that reveals on placement.
- `MultipleChoice` for the six-month follow-up.

**Project link.** Chapter 21.5's PR sequence runs the four-job gate plus the signal jobs from this concept; the student sees the split in practice when a Dependabot patch lands during the migration.

---

## Concept 7 — Dependabot grouping and the 2026 supply-chain layer

**Why it's hard.** Two distinct senior reflexes get bundled into "dependency hygiene" and students conflate them. First, the *noise* problem: ungrouped Dependabot opens one PR per dep per week, the team stops reading them, and the supply chain effectively goes unwatched. The fix is the `groups:` block with `update-types: ["minor", "patch"]` collapsing the flood into one weekly PR per ecosystem. Second, the *trust* problem: package signatures, release-age windows, and SHA-pinned actions are the post-spring-2026 defense layer against compromised publishes that pre-2024 tooling didn't even attempt. Each setting (`pnpm audit signatures`, `minimumReleaseAge: 72h`, `strictDepBuilds`) is one line; the value is in knowing *which line* defends *which attack*.

**Ideal teaching artifact.** Two paired artifacts. The first is an annotated `.github/dependabot.yml` and `.npmrc` walkthrough — Setup/wiring archetype — showing the grouping config and the supply-chain settings in their canonical 2026 shape, with each setting's role named inline. The second is a brief attack-and-defense pairing table: spring-2026 incident class → which setting catches it (compromised publish → `minimumReleaseAge`; force-pushed action tag → SHA pinning; registry tampering → `audit signatures`; malicious install script → `strictDepBuilds`). The pairing is what makes the settings memorable; alone they read as configuration trivia.

**Engagement.** A `Matching` drill linking each setting on the left to the attack class it defends on the right. Five to six pairs. The friction case is `minimumReleaseAge` being too aggressive — set to 14 days it slows legitimate fast-fix updates, so the senior cut (72h) is itself a teaching point delivered in the rationale on placement.

**Components.**
- `AnnotatedCode` on the worked `.github/dependabot.yml` (grouping block, ecosystems, weekly cadence) and `.npmrc` (release-age, signatures, strict builds).
- `Figure` containing a two-column attack→defense table laid out as hand-SVG with arrows.
- `Matching` for the recall pairing.

**Project link.** The Dependabot config from this lesson ships unchanged into the 21.5 starter; the student watches a real patch PR auto-merge during the migration as the gate-vs-signal split holds.

---

## Component proposals

None. Every concept maps cleanly to existing components (`AnnotatedCode`, `Tokens`, `Buckets`, `MultipleChoice`, `Matching`, `Figure` with hand-SVG). The single bespoke candidate — a live `RulesetWorkflowMatcher` widget for Concept 2 — was demoted because the moment is single-use within the chapter and the static SVG carries the same teaching weight.

## Open pedagogical questions

- Concept 5's Tokens drill assumes the student can recognize a derived-secret leak (echoing a JWT signed by `secrets.X`); if Unit 17 doesn't establish that pattern, the lesson needs a one-line frame before the drill.
- Concept 7's attack→defense pairing references the spring 2026 incidents by class but not by name — confirm whether the course's voice convention names specific incidents (the trivy-action compromise is named in the chapter outline) or stays at the class level for longevity.
