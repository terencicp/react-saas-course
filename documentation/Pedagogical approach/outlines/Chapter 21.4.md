## Concept 1 — The deploy is not atomic with the migration

**Why it's hard.** Students who've internalized Vercel's atomic alias swap from 21.3.1 assume the migration commits at the same instant the new code goes live. The truth — the schema commits before the function fleet finishes warming, and old code keeps serving requests for seconds after — is the entire reason the cadence exists. Without this picture, every later lesson reads as overkill.

**Ideal teaching artifact.** A scrubbable deploy-window timeline. The horizontal axis is time, from "build green" to "fleet fully warm." Stacked rows show: the alias state, the v1 function fleet (still warm, still serving), the v2 function fleet (warming, taking traffic), the database schema state, and a live "what would break right now" annotation. The student drags through three preset timelines — migration-before-swap, migration-after-swap, and the cadence's "schema satisfies both" version — and sees the danger window light up red in the first two and stay green in the third. This is a Concept-archetype artifact: the mental model is the lesson, and a static three-panel comparison can't show how brief and inevitable the overlap window is.

**Engagement.** A short `PredictOutput`-style drill follows: given three schema-change scenarios (drop column, add nullable column, rename column), the student predicts whether the danger window is fatal before the answer is revealed.

**Components.**
- `DiagramSequence` (existing) with three steps, each holding a hand-SVG timeline with rows for alias, v1 fleet, v2 fleet, schema state, and a red/green "current breakage" band.
- `PredictOutput` (existing) for the three-scenario prediction round after the artifact.

**Project link.** 21.5.2 lights up a real production URL; the race window is no longer hypothetical the moment the student deploys against it.

---

## Concept 2 — Expand, migrate, contract as a three-act reversibility chain

**Why it's hard.** The cadence is easy to memorize as three words and hard to internalize as three independently shippable PRs, each of which must leave production runnable on the deploy *before* it. Students collapse the three acts into "one migration with extra steps" and lose the property that makes the cadence work — that every step is a `git revert` away from safe.

**Ideal teaching artifact.** A three-act scrubber. The student advances through the three deploys; at each act, four parallel panels show: the schema state, the application code state, what's reversible right now, and what would break if the previous deploy's code hit the current schema (it must always be "nothing"). Hovering the "reversible" panel reveals the rollback gesture for that act (revert the app PR, forward-fix the schema, etc.). The student sees that the chain is unbroken — at every position in the cadence, the system is runnable on the previous deploy. This is a Mechanics/Pattern hybrid; the four-panel structure is what carries the meaning, and a flat prose walkthrough loses the parallelism.

**Engagement.** A `Sequence` exercise drops the student into a column-rename scenario with six PR snippets (schema edits, dual-write code, backfill, drop column, dual-read fall-through, contract cleanup); they must arrange them into the three correct PRs in the correct order, and the grader rejects any order that breaks the "runnable on the previous deploy" rule.

**Components.**
- `DiagramSequence` (existing) with three acts, each containing a four-panel hand-SVG composition wrapped in `Figure`.
- `Sequence` (existing) for the six-snippet PR-ordering drill.
- `Aside` (existing) for the explicit "the contract step's column drop is the cadence's only irreversible move" callout.

**Project link.** 21.5.3 / 21.5.4 / 21.5.5 are the three PRs the artifact previews; the student should recognize each as an instance of the act they scrubbed through.

---

## Concept 3 — Dual-write is a code pattern, not a database feature

**Why it's hard.** Students reach for the words "shadow column" or "trigger" and assume the database is doing the work. The cadence's dual-write lives in the server action — every mutation path in app code writes to both columns in one statement, and the dual-write code is born to be deleted in the contract deploy. Missing a single mutation site silently breaks the cadence; the type system can't see that you forgot one.

**Ideal teaching artifact.** A wrong-by-default sandbox. The student opens a small repository: three server actions mutate `invoices` (create, update, transfer), and a fourth path — a cron-style reconciliation job — also writes. Only two of the four have been updated to dual-write. A "run all paths" button mutates rows; an inline Studio-style table shows that some rows have both `customer_name` and `customer_id` populated, some only have `customer_name`. The student must find the two missing dual-write sites, add them, and re-run until every row shows both columns. The artifact carries the assessment — the failing rows are the test. A follow-up `MultipleChoice` confirms the model: "Why didn't TypeScript catch this?" with the correct answer naming the structural-vs-opt-in distinction.

**Engagement.** The wrong-by-default sandbox is itself the assessment; the `MultipleChoice` follow-up confirms the student names the underlying reason rather than just patching by trial.

**Components.**
- `ReactCoding` or `ScriptCoding` (existing) configured with three pre-written action files and a tests-mode grader that asserts every row in the mock table has both columns populated after running all mutation paths.
- `MultipleChoice` (existing) for the "why didn't the type system catch this?" confirmation.
- `Code` (existing) for the canonical dual-write snippet shown before the sandbox.

**Project link.** 21.5.4 is the lesson's project mirror — the student lands a real dual-write across the chapter-11 app's actions; the sandbox rehearsed the exact failure mode.

---

## Concept 4 — The backfill: bounded, batched, idempotent

**Why it's hard.** A backfill is the only piece of the cadence that runs against the full production table at once. Naive students write a single `UPDATE` and lock the table for minutes; cautious students batch but forget idempotency and double-write on a retry. The decision of where it runs (one-shot script vs. Trigger.dev) is sized by the table, not by preference.

**Ideal teaching artifact.** A two-run side-by-side, statically composed. The left panel is the naive backfill — one `UPDATE invoices SET customer_id = ...`, no `WHERE`, no batching — annotated with the lock duration ("table locked for 4m 12s, every write times out"). The right panel is the disciplined version — `WHERE customer_id IS NULL`, `LIMIT 5000`, looped — annotated with the cumulative runtime and the "safe to retry" property. A third small panel maps the row-count thresholds to the runner choice (one-shot tsx for under 1M, Trigger.dev past it). This is a Pattern archetype: the wrong version is shown alongside the right one because the failure mode *is* the lesson.

**Engagement.** A short `Buckets` exercise sorts six backfill scripts (varying in batching, idempotency guard, and runner) into "ship it" / "rewrite it" / "move to Trigger.dev," with one-line feedback per card.

**Components.**
- `Figure` (existing) wrapping a hand-SVG/HTML two-column composition for the naive-vs-disciplined comparison.
- `Code` with collapsible regions (existing) for the two backfill scripts inside the figure panels.
- `Buckets` (existing) for the six-script classification drill.
- Alternative: a bespoke **BackfillSimulator** widget — inputs for table size, batch size, write traffic, runner choice; outputs runtime, lock duration, and idempotency-on-retry behavior. Demoted because it appears only here and the static two-run comparison teaches the rule cleanly.

**Project link.** 21.5.4 ships the batched idempotent script the artifact spec'd.

---

## Concept 5 — The trigger map and the 30-second decision tree

**Why it's hard.** The cadence costs three PRs and weeks of calendar time; reaching for it on every migration burns the team, and skipping it on the wrong change burns production. The senior diff is reading a Drizzle Kit diff and answering correctly inside thirty seconds. The three-question tree is the spine, but recognition speed comes from reps on real diffs, not from memorizing the questions.

**Ideal teaching artifact.** Two beats. First, an `AnnotatedCode` walkthrough of one real generated SQL diff (a column rename), stepping the student through the three questions (additive only? long lock? running code reads the disappearing shape?) and showing how each answer routes the migration. Then a `Buckets` drill: twelve diff cards covering the trigger map's full spread — new table, new nullable column, `CREATE INDEX CONCURRENTLY`, `NOT VALID` + `VALIDATE` FK, column rename, `int` → `bigint`, `SET NOT NULL` on a populated column, `ADD VALUE` to an enum, drop a column the code still reads, table rename, default-add on Postgres 16, tightening a `CHECK`. The student sorts each into "one PR" / "three PRs" / "depends." This is a Decision archetype; the bucket sort drills the asymmetry — false-positive cadence wastes a week, false-negative cadence is an outage — through repetition.

**Engagement.** The `Buckets` drill is the assessment; each card reveals a one-line "why" on placement, calling out the question in the tree that decided it.

**Components.**
- `AnnotatedCode` (existing) for the one worked diff walking the three questions.
- `Buckets` (existing) for the twelve-card classification.
- `Aside` (existing) calling out the `NOT VALID` + `VALIDATE` two-step as the senior reach that converts otherwise-cadence-class changes into one-PR changes.

**Project link.** 21.5.3 opens with the student running the three-question tree against the `customer_name` → `customer_id` diff; the chapter's job is to make that answer reflexive.

---

## Concept 6 — The Neon rehearsal as a falsifiable test

**Why it's hard.** Students treat preview deployments as a check that "the code builds." The senior framing is sharper: the per-PR Neon branch is a falsifiable hypothesis stage — each cadence step *claims* the migration applies cleanly, the dual-write reaches every path, the backfill completes in window, and the old shape still works where it should. The rehearsal exists to break that claim before production does, and most failure modes have a specific symptom the student can name.

**Ideal teaching artifact.** A guided "diagnose the broken PR" walkthrough. Four panels, each holding a different broken PR against a preview-branch rehearsal: (1) the FK rejection during backfill (Studio query shows the orphan rows), (2) a missed dual-write mutation site (Studio inspection of a freshly-written row shows only `customer_name`), (3) a backfill that extrapolates to 40 minutes against production (timed run against the branch), (4) a contract PR with a raw SQL string still reading the dropped column (build log shows the error). For each, the student is shown the symptom *first*, must pick the failure mode from a four-option list, and then sees the fix. This is the chapter's Pattern/Setup hybrid — the rehearsal checklist is the load-bearing artifact, and the four-panel structure mirrors the four cadence-failure classes.

A second short beat lists what the rehearsal *cannot* catch — production-scale write contention, data added since the branch was taken, long-running production transactions — to prevent over-trusting the green preview.

**Engagement.** The four-panel symptom-to-cause exercise carries the assessment; a follow-up `TrueFalse` round of six statements (e.g. "a green preview build means the production migration will not fail," "the typecheck catches every leftover read of a dropped column") confirms the student holds the limits of the rehearsal as firmly as the rehearsal itself.

**Components.**
- `TabbedContent` (existing) with four tabs, each holding a symptom panel (hand-SVG of a Studio query result or build log excerpt) plus an inline `MultipleChoice` for the cause and a reveal of the fix.
- `TrueFalse` (existing) for the rehearsal-limits confirmation round.
- `Aside` (existing, "caution" variant) for the "necessary, not sufficient" framing on what the rehearsal can't see.

**Project link.** 21.5.3 / 21.5.4 / 21.5.5 each run the four-check rehearsal against the real preview branch; the chapter installs the muscle the project then executes three times.

---

## Component proposals

None. Every concept lands inside the existing toolkit (`DiagramSequence`, `TabbedContent`, `Figure`, `AnnotatedCode`, `Buckets`, `Sequence`, `PredictOutput`, `MultipleChoice`, `TrueFalse`, `ReactCoding`/`ScriptCoding`) plus hand-authored SVG inside `Figure`. The one bespoke candidate considered — a backfill simulator — was demoted as single-use without a forward-link; the naive-vs-disciplined static composition teaches the rule cleanly enough.

## Open pedagogical questions

- The wrong-by-default sandbox in Concept 3 needs a runtime that can both execute a mutation against a mock data store and show a Studio-style row inspector. `ReactCoding` or `ScriptCoding` can be coerced into this with custom assertions, but a small purpose-built widget would teach more clearly; worth a call on whether to fit the existing component or accept a one-off.
- Concept 6's symptom-first panels assume the student can read a Studio query result and a Vercel build log on sight. If the chapter-21.3.5 lesson hasn't already shown those surfaces in screenshot form, the artifact may need a brief "here's what you're looking at" preamble.
