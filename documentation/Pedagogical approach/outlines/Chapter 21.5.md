## Concept 1 — The three-PR cadence as a no-incompatible-moment invariant

**Why it's hard.** Students hear "expand-migrate-contract" in 21.4.1 as three words; they have to feel it as three *production states*, each of which must individually be a survivable cross-section of app code and schema. The misconception to break: that the cadence is about the migration. The cadence is about the *gaps between PRs*, where the running app and the live schema must remain compatible.

**Ideal teaching artifact.** A scrubbable timeline (Concept archetype, scrollytelling form) where the student drags a playhead across four production states: baseline, post-expand, post-migrate, post-contract. At each tick, two adjacent panels render side by side — the *running app code* (its read site and its write site) and the *live schema* (column list with `NOT NULL` flags). A third panel reads "compatibility check" and turns red the instant the student tries to construct an illegal cross-section (e.g. dragging the schema to post-contract while the code still reads `total`). The whole artifact is a single piece of explorable evidence that no PR-merge moment crosses the red line.

**Engagement.** After the scrub, a `Sequence` exercise where the student orders the five sub-moves (add nullable columns, deploy dual-write app code, run backfill, promote to `NOT NULL`, drop old column) — with two plausible-but-wrong alternative orderings seeded as decoys.

**Components.**
- New component: `CadenceTimeline` — props are the migration's column-evolution stages and the app's read/write call sites per stage; renders the scrubbable playhead with three panels and a compatibility light.
- `Sequence` from the existing catalog for the ordering recall.

**Project link.** This is the chapter's spine. The timeline previews the four states the student will actually produce in PRs 1–3 and verify in production.

## Concept 2 — The build command is the migration gate

**Why it's hard.** "The git push is the deploy" is muscle memory by 21.3; what's new here is that `pnpm db:migrate && next build` makes the migration *part of the deploy*, and that a migration failure must fail the build before the function fleet rolls. Students who've shipped with separate-migration-jobs assume the chain is loose; the chain is *the* safety property.

**Ideal teaching artifact.** A Setup walkthrough of the Vercel project-import flow with the Build Command override called out as the single load-bearing field. A small adjacent diagram (Mermaid sequence) of `git push → build start → install → db:migrate → next build → deploy → alias swap`, with the migration step highlighted and the failure arrow at that step looping back to "no deploy."

**Engagement.** A `MultipleChoice` immediately after the diagram: "PR 1's migration has a typo. Which of these is true at the moment the typo is committed and pushed?" — with correct answer "the preview branch fails to build, the previous preview deployment remains live, and no production change occurs," and decoys that conflate preview and production, or that assume the bad SQL hits production.

**Components.**
- Existing `Steps` for the import-walkthrough.
- Mermaid sequence diagram inside a `Figure` for the build chain.
- `MultipleChoice` for the recall.

## Concept 3 — Reading the failing build log as the first deploy outcome

**Why it's hard.** The deliberate skip-env-vars-on-first-deploy is a pedagogical ambush — most students never see the env validator fail because they front-load secrets. The lesson here is that *a failed first build is the safety net working*, and that reading a Vercel build log is a senior literacy skill in itself.

**Ideal teaching artifact.** A misconception-first reveal. The student is told: "deploy now without the env vars; predict what happens." They predict, then see a real build-log excerpt (annotated, with the env-validator's error line highlighted). The `AnnotatedCode` walkthrough steps through the log: pnpm install line, the `db:migrate` line that *would* have run, the `next build` line that aborts on the validator's `ZodError`, and the exit code.

**Engagement.** A `PredictOutput`-shaped prompt before the reveal: "what's the first thing the build log will print after `pnpm install` finishes?" — with the validator's specific error format as the correct answer.

**Components.**
- `PredictOutput` for the misconception ambush.
- `AnnotatedCode` for the annotated log walkthrough.

## Concept 4 — PR 1 discipline: additive-only, app code untouched

**Why it's hard.** The temptation in PR 1 is "while I'm in `schema.ts`, let me also wire the new fields in `actions.ts`." That conflation collapses the cadence: the rehearsal stops being a rehearsal of *one move*, and the rollback story becomes "revert two concerns at once." The discipline is structural, not aesthetic.

**Ideal teaching artifact.** A Pattern artifact: a `CodeVariants` block titled by the failure it prevents, with three tabs — "PR 1 as the cadence requires" (schema-only diff plus the additive migration SQL), "PR 1 with premature dual-write" (the bad conflation, marked with the resulting rollback complication), and "PR 1 with `NOT NULL` from the start" (the bad conflation that breaks the migration against existing rows). Each tab's caption names the specific consequence — not "wrong," but *what concretely breaks* in the next 24 hours.

**Engagement.** `Buckets` sort: a list of candidate edits ("add `subtotal` nullable to schema," "add `subtotal` to Zod input on `createInvoice`," "rename `total` column," "write `--> statement-breakpoint`," "set `subtotal NOT NULL`") into two buckets — "belongs in PR 1" / "wait for a later PR."

**Components.**
- `CodeVariants` for the three-tab comparison.
- `Buckets` for the sort.

**Project link.** This is the PR-1 lesson's structural enforcement — students who pass the bucket sort have internalized the cadence's scope discipline before they open the PR.

## Concept 5 — The rehearsal checklist as a closed loop on the preview branch

**Why it's hard.** 21.4.3 introduces the four-check rehearsal abstractly; in this chapter the student must run it three times against three different preview branches, and each run is a different shape (additive-only verify, dual-write probe, contract verify). The skill is treating the inspector panels as a *production proxy* and trusting them more than the local feel of "everything renders."

**Ideal teaching artifact.** A Mechanics walkthrough of the inspector page (already provided in the starter) framed as a *checklist execution surface*. A static annotated screenshot/SVG of the inspector with each panel labeled by which rehearsal check it serves — schema-state probe → "migration applied"; dual-write probe → "every mutation writes all three columns"; split-coverage → "backfill complete"; data-integrity diff → "no dual-write divergence"; deployment-environment indicator → "you're looking at the right environment." The annotations are the *teaching*; the inspector is the *artifact*.

**Engagement.** `Matching` exercise — left column: the four rehearsal-checklist clauses from 21.4.3. Right column: the specific inspector panel (named) that confirms each. Reinforces the panel-to-clause mapping the student will execute three times in the chapter.

**Components.**
- `Figure` wrapping a hand-authored annotated SVG of the inspector layout — single chapter use, but the inspector is the chapter's stage; the annotated callouts compound across 21.5.3, 21.5.4, 21.5.5 by recall.
- `Matching` for the panel-to-clause drill.

## Concept 6 — Structural dual-write: one `set({...})` carrying all three columns

**Why it's hard.** The natural shape of "write to two places" suggests two statements; the cadence requires one. Two statements admit a partial-failure window where `subtotal` writes but `total` doesn't, which is the precise failure the data-integrity diff panel exists to catch. The lesson is that *atomicity is the structural property*, not the developer's diligence.

**Ideal teaching artifact.** A Pattern artifact: a `CodeVariants` with two tabs — "structural dual-write" (one Drizzle `set({ subtotal, tax, total })` inside the action's transaction) and "split dual-write" (two sequential `update().set(...)` calls). The split tab has a `// new` highlight on the failure window between statements and the caption names the inspector panel that catches it ("data-integrity diff: `subtotal + tax <> total`").

**Engagement.** A `Tokens`-style click in the structural-dual-write block: the student clicks the three column names being written in the single `set({...})` call — proving they read the atomicity, not just the shape.

**Components.**
- `CodeVariants` for the wrong/right comparison.
- `Tokens` for the column-click recall.

**Project link.** PR 2 lives or dies by this single `set({...})` shape; the inspector's data-integrity diff is the empirical test.

## Concept 7 — Backfill ordering: app code first, then backfill

**Why it's hard.** "Run the backfill" sounds like a discrete operation, but the cadence requires it run *strictly after* PR 2's dual-write code is live in production. A backfill that runs before the dual-write deploy leaves a window where new mutations create rows with `subtotal NULL`, defeating the split-coverage invariant the next PR depends on.

**Ideal teaching artifact.** A Mermaid sequence diagram (Concept archetype) of three actors — `git`, `Vercel function fleet`, `Neon production branch` — across two timelines: "correct ordering" and "backfill-first ordering." Each timeline shows the same five events (PR 2 merged, build runs, alias flips, backfill script runs, new mutation arrives) in different orders. The wrong timeline ends in a red box: "row created with `subtotal NULL`, split-coverage never reaches 100%."

**Engagement.** `TrueFalse` round on three statements: "the backfill is safe to run before PR 2 merges," "the backfill is idempotent because of `WHERE subtotal IS NULL`," "re-running the backfill after a concurrent mutation can overwrite a freshly-written `subtotal`" — each tied back to the ordering and idempotency invariants.

**Components.**
- Mermaid sequence diagram inside `Figure`.
- `TrueFalse` for recall.

## Concept 8 — Idempotency, batching, and the unpooled URL

**Why it's hard.** Three independent properties bundled into one script — and each, individually, is a senior reflex the junior doesn't have yet. Idempotency via the `WHERE subtotal IS NULL` guard, bounded batches so the script doesn't bloat the transaction log or hold locks for minutes, and `DATABASE_URL_UNPOOLED` because PgBouncer's transaction-pooled mode breaks long-lived scripts.

**Ideal teaching artifact.** A Mechanics artifact: the backfill script shown as a single `Code` block with `CodeTooltips` on three substrings — `WHERE subtotal IS NULL` (tooltip: "the idempotency guard; without it, re-running the script overwrites concurrent dual-writes"), the batch size literal (tooltip: "bounded batch; long transactions hold row locks and bloat WAL"), and `DATABASE_URL_UNPOOLED` (tooltip: "the pooled URL routes through PgBouncer in transaction mode, which terminates long sessions; the unpooled URL is direct").

**Engagement.** A `MultipleChoice` immediately after: "you re-run the backfill an hour after the first run completed, while production is taking writes. What happens?" — correct: "rows updated since the first run keep their fresh values; rows still at `NULL` (none, in this case) would be populated." Decoys exercise the misconception that re-runs overwrite.

**Components.**
- `Code` with `CodeTooltips` for the three-property reveal.
- `MultipleChoice` for the re-run reasoning.

## Concept 9 — One concern per PR: why `SET NOT NULL` ships alone

**Why it's hard.** The promotion to `NOT NULL` looks like a trivial follow-up; the temptation is to bundle it with the dual-write PR. The discipline says: the dual-write PR's *job* is to land app code that populates the new columns and run the backfill; the `SET NOT NULL` is a separate, reviewable, individually-rollback-able schema move. The student must feel the trade-off, not just accept the rule.

**Ideal teaching artifact.** A Decision artifact: two short prose paragraphs side by side in a `TabbedContent` block — "separate PR" (the chapter's choice; the promotion is one ALTER, one CI run, one merge, individually revertable) vs. "bundled into contract" (the alternative the chapter names; one less PR but the `SET NOT NULL` lands with the `DROP COLUMN`, so a failure of either takes the other with it). Each tab names the trigger that flips the choice.

**Engagement.** A short `TextAnswer` or `MultipleChoice` prompt: "you're shipping a third migration class in your next quarter and the `SET NOT NULL` will scan a 10M-row table. Which path do you choose, and why?" — the senior reflex is to separate-PR *and* swap the promotion for a `CHECK ... NOT VALID` → `VALIDATE` two-step (named once in the lesson). `MultipleChoice` is the cleaner form here.

**Components.**
- `TabbedContent` for the decision comparison.
- `MultipleChoice` for the recall.

## Concept 10 — The contract PR and the type system as completeness check

**Why it's hard.** Dropping `total` is the "easy" PR mechanically — one SQL statement, type errors guide the cleanup. The subtle lesson is that *Drizzle's typed query builder is the cadence's completeness oracle*: any code still reading `total` produces a build error, so the build itself proves the cleanup is total. External readers (scripts, analytics, integrations) slip through this oracle and are the contract step's actual production risk.

**Ideal teaching artifact.** A two-beat Concept artifact. Beat one: an `AnnotatedCode` walkthrough of the `queries.ts` cleanup diff, with the Drizzle column reference highlighted as "the type system catches every remaining reference." Beat two: a short prose paragraph plus a small static diagram (a producer-consumer arrow diagram inside `Figure`) showing the `invoices` table with four arrows leaving it — the app (type-checked), a hypothetical analytics pipeline (not), a one-off report script (not), an external integration (not). The diagram is the *visualization of what the type system doesn't catch* — the actual risk of the contract step.

**Engagement.** A `CodeReview`-style exercise: a small diff is presented as "the PR-3 cleanup," but it contains one remaining reference to `total` inside a raw SQL string in a separate analytics file the type system can't reach. The student leaves a review comment naming the surviving reference and the grep discipline that would have caught it.

**Components.**
- `AnnotatedCode` for the cleanup walkthrough.
- `Figure` with a hand-authored producer-consumer SVG (single chapter use, but the "type system as oracle, with exceptions" pattern recurs in any contract-step lesson; demoted from bespoke component because static suffices).
- `CodeReview` for the missed-reference exercise.

## Concept 11 — Alias rollback does not undo migrations

**Why it's hard.** This is the chapter's most important non-obvious lesson and the one most likely to be misremembered. "Rollback" is mentally one word; the platform makes it two — code rollback (alias re-point, instant) and data rollback (a separate forward-fix migration, expensive). The student who internalizes the cadence but skips this lesson assumes rollback "just works."

**Ideal teaching artifact.** A wrong-by-default rehearsal the student walks through in real time. The lesson directs the student to actually promote the previous deployment in their own Vercel dashboard, against the contract PR. They watch their own production page render briefly, then break with a Drizzle error reading "column `total` does not exist," visible in their own Sentry dashboard within seconds. The gesture is the artifact; the artifact carries the assessment.

**Engagement.** Because the artifact is the assessment, the recall confirmation is a short `TrueFalse` round after the re-promotion: three statements like "alias rollback restores the schema to the previous deploy's shape," "the rollback's failure mode is a runtime error against the current schema," "the forward-fix for a contract-PR rollback is another migration." The round confirms the lesson stuck.

**Components.**
- Existing `Steps` for the rehearsal walkthrough.
- `TrueFalse` for the post-rehearsal confirmation.
- New component candidate considered (`RollbackRehearsalScrubber`) and rejected — the *real* rehearsal in the student's own dashboard is more durable than any simulator could be, and the simulator would dilute the lesson by giving the student a safe sandbox where the live-fire stakes belong.

## Concept 12 — The runbook as the durable artifact

**Why it's hard.** Students treat runbooks as documentation overhead. The senior reflex is that the runbook is the *only thing* that survives the migration in the team's collective memory — it's what gets opened at 2 AM by an engineer with none of the context.

**Ideal teaching artifact.** A Pattern artifact with a Reference shape: the runbook itself, shown as a Markdown template the student fills in. A `Code` block displays the runbook's six required sections (identify previous green deploy, promote, verify, the caveat in bold, `git revert` PR, re-enable auto-assignment), each section a one-line prompt the student completes during the lesson. The artifact is the artifact — the student authors the runbook for the future engineer, in the voice the future engineer needs.

**Engagement.** A `Dropdowns` exercise: a fragment of an unfinished runbook with three blanks — the verify command (`curl -sI` with the right header), the caveat sentence's bold phrase ("does NOT undo schema migrations"), and the step that re-enables auto-assignment. Filling the blanks correctly confirms the student knows what each section earns its place by.

**Components.**
- `Code` with the runbook Markdown template.
- `Dropdowns` for the blanks.

## Component proposals

- **`CadenceTimeline`** — scrubbable playhead across N migration states; each tick renders app-code panel, schema panel, and a compatibility light. Inputs: an ordered list of states, each with `{ appReadSite, appWriteSite, schemaColumns }`; optional "illegal cross-section" prop that flags impossible draggings.
  - **Uses in this chapter** — Concept 1.
  - **Forward-links** — every future cadence-class migration teaching moment (any later chapter that revisits expand-migrate-contract, plus any course extension covering rename-class or FK-add-class migrations). The shape generalizes to any "the state between deploys is the load-bearing observation" lesson.
  - **Leanest v1** — static `DiagramSequence` driven by an ordered set of slide snapshots (app code + schema columns side by side), without a real compatibility-check engine. The student scrubs through pre-rendered states; the red-light is a hard-coded property of each slide, not a computed check. This thinner version still teaches the invariant; the computed compatibility engine is the v2 unlock.

## Build priority

`CadenceTimeline` is the only proposed bespoke component and earns the build. It carries Concept 1, which is the chapter's spine and the only concept that students can't physically execute in their dashboard — every other concept either has an existing component fit or is taught best by the real Vercel/Neon/Sentry surfaces. Build the v1 (slide-driven `DiagramSequence` snapshots) first; defer the computed compatibility engine until a second chapter reuses the component.

## Open pedagogical questions

- Concept 5's annotated-inspector SVG is single-chapter; if a future chapter revisits inspector-style debugging surfaces (e.g. a Sentry-walkthrough chapter), the same annotation pattern could compound — worth checking before building it bespoke versus inlining annotations as captions on a screenshot.
- Concept 11's rehearsal asks the student to deliberately break their own production for ~30 seconds. The chapter outline names this trade-off explicitly, but the pedagogical doc should flag whether the live-fire version is the default or whether a `CadenceTimeline`-shaped simulator is offered as an opt-out for students whose "production" is shared with collaborators.
