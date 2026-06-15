# Chapter 100 — Lesson 6 outline

## Lesson title

- Full: **Rollback rehearsal and the schema caveat** (chapter-outline title fits — it names both the gesture and the non-obvious lesson; keep it).
- Sidebar: **Rollback rehearsal**

## Lesson type

`Implementation`

This drives the branch: the test-coder runs (turns `tests/lessons/Lesson 6.test.ts` from its `describe.todo` skeleton into real assertions), and the writer renders the Implementation section list.

## Lesson framing

The student walks away having rehearsed the production rollback gesture *before* an incident demands it, and having internalized the chapter's sharpest non-obvious lesson: an alias re-point swaps the running code instantly but the database stays on whatever schema the forward-only migrations already applied — so a code rollback against a contracted schema is its own outage, not a recovery. The senior payoff is the muscle memory and the discriminator (application-bug rollback vs. schema-mistake forward-fix), captured in a durable on-call runbook addressed to the engineer who arrives at 2 AM with none of today's context. No app code changes; the deliverable is the rehearsal and `docs/runbooks/rollback.md`.

## Codebase state

### Entry

Production is live on the PR-3 target schema from Lesson 5: `invoices` carries `subtotal numeric(12,2) NOT NULL` + `tax numeric(12,2) NOT NULL`, no `total`. Four production deployments exist on the Vercel dashboard (first deploy + expand + migrate/promotion + contract), each prod deployment's SHA matching its merge commit. The inspector shows the target shape, split-coverage 100%, empty data-integrity diff (renders "n/a — total dropped"). The launch checklist's eight rows are green except the rollback-rehearsal row, which Lesson 2 explicitly deferred to here. `docs/runbooks/rollback.md` ships as a stub: the bolded forward-only-migration caveat under `## The caveat`, plus three empty section headers (`## The four-step alias re-point`, `## The \`git revert\` follow-up`, `## Re-enabling auto-assignment`) with a `TODO(L6)` comment. `tests/lessons/Lesson 6.test.ts` is a `describe.todo` skeleton. No source files carry TODOs for this lesson — the cadence is code-complete.

### Exit

`docs/runbooks/rollback.md` is filled end to end: the four-step alias re-point, the `git revert` follow-up, re-enabling auto-assignment, the expanded forward-only-migration caveat, and the application-bug-vs-schema-mistake discriminator. The rollback rehearsal has been run (promote post-PR-2 deployment → observe the `column total does not exist` error + Sentry catch → re-promote PR-3). Production is restored to the PR-3 target schema and code, Sentry quiet. The launch checklist's eighth row (rollback rehearsal) is now green, so all eight hold. No source code changed; `Lesson 6.test.ts` now asserts the runbook's load-bearing structure.

## Lesson sections

Implementation section list. No diagram needed — the flow is a four-step dashboard gesture better carried by the runbook's numbered prose than a box-and-arrow figure. No new components beyond the project-lesson defaults.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: rehearse rolling back production, prove the schema caveat with your own eyes, and write the runbook the future on-call engineer will read. One-paragraph description of the working result (no screenshot strictly required, but a `Screenshot` of the inspector's deployment panel showing the PR-2 commit SHA live during the rehearsal, paired with the `curl -sI` `x-vercel-id` output, would make the alias swap concrete — optional). State plainly: the only artifact that changes on disk is `docs/runbooks/rollback.md`; everything else is a dashboard/CLI gesture and its verification.

### Your mission

Prose paragraph (project terms, no headers, no implementation hints): the cadence is complete, so the final exercise is not to change production but to practice recovering it — building muscle memory so the dashboard is not new the first time an incident hits. Weave the constraints: you rehearse against the *contract* deployment deliberately, because contract is the one move whose schema change a rollback cannot reverse, making it the sharpest demonstration of the caveat. Promoting the post-PR-2 deployment restores code that reads through the dual-read fall-through, but `total` is gone, so production errors for the few seconds before you re-promote — a deliberate, transient break to expect and recover from, which doubles as proof that Sentry observability works (the launch-checklist Sentry row cashed in). Out of scope: this casualness is only acceptable because the project has no live users; name (don't exercise) the real-world version — same rehearsal in a maintenance window against a throwaway deployment. The runbook must be addressed to the 2 AM on-call engineer and must name the discriminator between an application-bug rollback (alias re-point + code-only `git revert`, schema intact) and a schema mistake (a forward-fix migration, e.g. re-adding `total` as `GENERATED ALWAYS AS (subtotal + tax) STORED` — named, not run).

Then **Functional requirements** as a numbered list, each tagged. Phrase as outcomes, not files/exports. Render via `Checklist`/`ChecklistItem` with `tested`/`untested` chips:

1. `docs/runbooks/rollback.md` carries the four-step alias re-point gesture, the `git revert` follow-up section, the re-enable-auto-assignment section, and the bolded "does not undo migrations" caveat. **[tested]** — this is the on-disk structural assertion the test-coder writes; it is the only test-reachable requirement in the lesson.
2. The runbook names the application-bug-vs-schema-mistake discriminator and the forward-fix-migration option for a schema mistake. **[tested]** — assert the runbook text references both recovery paths (e.g. the `GENERATED ALWAYS` / forward-fix phrase and the `git revert` code-only path). Keep the assertion on durable phrases, not exact prose.
3. Promoting the previous (post-PR-2) production deployment flips the alias in seconds, confirmed by `curl -sI` returning the PR-2 `x-vercel-id` and the inspector's build-source panel showing the PR-2 commit SHA. **[untested]** — live Vercel/Neon, by-hand.
4. With the older code live against the contract schema, production raises a `column total does not exist` error and Sentry receives it — demonstrating the caveat firsthand. **[untested]** — live, by-hand.
5. Auto-assignment is off after the promote, so the next merge to `main` will not silently re-ship the contract code until re-enabled. **[untested]** — live, by-hand.
6. Re-promoting the contract (PR-3) deployment restores production to the target schema and code, inspector showing the target shape, Sentry quiet after a refresh window. **[untested]** — live, by-hand.
7. The launch checklist's eight rows remain green at the URL. **[untested]** — by-hand, closes Lesson 2's deferred row.

Note the test-coder constraint clearly: tests target the **runbook artifact's observable structure** only (read the markdown file, assert the four headers exist, the bolded caveat survives, both discriminator paths are named). Tests cannot reach Vercel/Sentry/Neon — every live gesture is `[untested]` and confirmed by hand in *Moment of truth*. This matches the `describe.todo` skeleton's note ("the on-disk artifact is the rollback runbook; this gate asserts its load-bearing structure").

### Coding time

Wrapped in `<details>` (writer collapses by default). Build prompt: run the rehearsal against the brief, then write the runbook and restore production.

The reference "solution" here is the **rehearsal procedure plus the filled runbook** (the start and solution `rollback.md` ship identical as a stub — the fill is genuinely the student's work, graded by structure). Organize:

- **The rehearsal**, as a `Steps` sequence: Vercel dashboard → Deployments → current prod is the PR-3 merge → find the previous prod deployment (post-PR-2 merge) → its menu → Promote to Production. Watch the alias swap under ~30s. Confirm `x-vercel-id` and the inspector's commit-SHA panel point at PR-2. Hit `/invoices`, watch the PR-2 dual-read reach for the dropped `total` and the Drizzle query fail. Confirm Sentry caught it. Confirm auto-assignment flipped off (Settings → Domains). Then re-promote the PR-3 deployment; confirm the inspector shows the target shape and Sentry goes quiet.
- **The filled runbook** (`docs/runbooks/rollback.md`): show the completed file as a `Code` block (markdown). It fills the three empty headers under the pre-shipped caveat. Decision rationale (one or two sentences each): the four-step gesture (identify previous green prod via dashboard or `vercel ls --prod`; promote via UI or `vercel promote <url>`; verify via `curl -sI` `x-vercel-id` + inspector commit-SHA + Sentry error rate; the bolded reminder that this does NOT undo schema migrations); the `git revert` follow-up (the Chapter 096 Lesson 2 gesture — open a revert PR for the bad commit, merge after CI, next prod deploy ships reverted code); re-enabling auto-assignment from the new prod deployment after a smoke test. Append the discriminator paragraph: application-bug rollback (alias re-point + code-only `git revert`, schema untouched) vs. schema mistake (forward-fix migration — e.g. re-add `total` as `numeric GENERATED ALWAYS AS (subtotal + tax) STORED`, expensive next to an alias re-point, cheap next to true data-loss recovery, warranted only when the contract itself was wrong).

Callout (`Aside` caution): the transient `column total does not exist` error during the rehearsal is *expected* and *deliberate* — it is the proof, not a mistake; never run this rehearsal against a production with live users. For the `git revert` mechanics, link to Chapter 096 Lesson 2 rather than re-explaining. For two-layer rollback / auto-assignment-off / the data-state caveat, link to Chapter 098 Lesson 7 (the owning lesson) rather than re-deriving.

Use `Code` for the runbook markdown and for the `curl -sI` / `vercel promote` command snippets. No `AnnotatedCode`/`CodeVariants` needed — there is no app code to compare or step through.

### Moment of truth

The test command and expected pass output:

```sh
pnpm test:lesson 6
```

Expected: the suite passes, confirming the runbook carries its load-bearing structure (four-step alias re-point, bolded caveat, `git revert` follow-up, re-enable-auto-assignment, and the discriminator paths). State the pass surface plainly (pass/fail only).

Then a by-hand `Checklist` for the `[untested]` requirements the test cannot reach (mirror requirements 3–7):
- Promoting the post-PR-2 deployment flips the alias in seconds; `curl -sI` / the inspector confirm the PR-2 SHA is live.
- Production raises `column total does not exist` and Sentry receives it during the rehearsal window.
- Auto-assignment is off after the promote.
- Re-promoting the PR-3 deployment restores the target schema and code; inspector shows the target shape, Sentry quiet.
- The launch checklist's eight rows are still green at the URL.

## Scope

- **No code or schema change** — the cadence is complete (owned by Lessons 3–5). This lesson is the rollback rehearsal and runbook only.
- **Two-layer rollback model, alias semantics, auto-assignment-off, the data-state caveat** — taught canonically in Chapter 098 Lesson 7; link, don't re-derive.
- **`git revert` mechanics** — Chapter 096 Lesson 2; link.
- **Forward-fix migration as a recovery primitive** — named here as the schema-mistake discriminator but not exercised; the expand-migrate-contract cadence itself is Chapter 099 Lesson 1 / this chapter's Lessons 3–5.
- **Maintenance-window / throwaway-deployment rehearsal for live-user systems** — named as the real-world version, out of scope at this project's zero-user scale.
- **Custom domain / alias-to-domain** — deliberately skipped chapter-wide (Chapter 098 Lesson 4); the `*.vercel.app` URL is production here.
