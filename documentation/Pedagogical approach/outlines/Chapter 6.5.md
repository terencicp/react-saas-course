# Chapter 6.5 — Migrations and seeding: pedagogical approach

## Concept 1 — The migration file is checked-in source code, generated then reviewed

**Why it's hard.** A returning dev who has lived in `db push`-style ORMs treats migrations as a runtime side effect — something the tool figures out. The senior shift is the inverse: the SQL file is *the artifact*, generated from the schema diff, reviewed in a PR, immutable once merged, and replayed byte-for-byte against every environment. Without that frame, the student edits applied files, ignores the snapshot, and the team's migration history rots in the first week.

**Ideal teaching artifact.** Pattern archetype delivered as a **lifecycle scrub** of one schema change, told as the artifact's biography. Six steps, each rendered as the state of the working tree at that moment: (1) edit `db/schema.ts` (add `invoices.archivedAt`); (2) run `drizzle-kit generate --name add_invoices_archived_at` — a new `0007_add_invoices_archived_at.sql` and an updated `meta/0007_snapshot.json` appear; (3) the dev opens the SQL file and reads it as the diff that will run; (4) commit both files together in the same PR as the schema change; (5) reviewer reads the SQL (not the schema diff) — that's what runs; (6) merge → CI applies it to staging → deploy applies it to production → row appended to `__drizzle_migrations`. The student scrubs the timeline; each step calls out *what would be wrong* if skipped (snapshot uncommitted = teammate's next `generate` produces nonsense; PR reviewing the schema instead of the SQL = silent-drop slips through; editing the file post-merge = drift).

**Engagement.** A `Sequence` drag-and-order drill: seven action cards from a real workflow — *edit the schema*, *run `generate`*, *open the emitted SQL*, *commit the SQL and the snapshot together*, *open the PR*, *the reviewer reads the SQL*, *CI applies against staging* — plus two trap cards (*edit the SQL after merge to fix a typo*, *commit only the `.sql` and not the `meta/` snapshot*) the student must reject by leaving them out of the order.

**Components.**
- `DiagramSequence` for the six-step lifecycle scrub. Each step renders the working-tree state (file list + the touched file's content) plus a one-line "what's wrong if you skip this" callout.
- `Sequence` for the action-ordering drill with reject-cards.
- `Aside` (`caution`) below: "the SQL file is the artifact under review; the schema is just where you author it."

**Project link.** Project 6.6.3 ships an init migration generated this way — the student commits the SQL and the snapshot from the first lesson and recognizes both as the artifacts the rest of the unit's work rests on.

---

## Concept 2 — The migration folder anatomy: SQL files plus the snapshot ledger that makes diffs work

**Why it's hard.** `drizzle/0000_*.sql` files are obvious. The `meta/` folder — `_journal.json` plus per-snapshot JSON files — looks like noise. The student deletes it to "clean up," doesn't commit it, or treats it as Drizzle's internal cache. The snapshot is the *previous schema state* `generate` diffs against; without it, every `generate` re-emits the entire schema as if it were new. The teaching has to make the snapshot's role visible — it's the ledger entry that makes the next diff correct.

**Ideal teaching artifact.** Concept archetype delivered as an **annotated folder tour with the diff arrow drawn explicitly**. The student sees a `drizzle/` tree (three SQL files + `meta/_journal.json` + three snapshot JSONs). One arrow drawn between `db/schema.ts` and `meta/0002_snapshot.json`, labeled *"`generate` diffs these two."* A second arrow from the diff result to a hypothetical `0003_*.sql` + `0003_snapshot.json` pair, labeled *"emits this."* The journal is shown as a small ordered list of applied filenames. Below the diagram, a one-beat scenario: a teammate forgets to commit `0003_snapshot.json`. The next `generate` on another machine reads `0002_snapshot.json` as the latest, diffs against it, and re-emits the same column add as `0004_*.sql` — duplicate column, migration fails. The student sees why both files travel together.

**Engagement.** A `Matching` drill: five files (`drizzle/0001_*.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0001_snapshot.json`, `db/schema.ts`, `__drizzle_migrations` table in Postgres) matched to five roles (*ordered ledger of applied migrations*, *previous schema state for the next diff*, *the SQL that runs*, *authoring source of truth*, *runtime-applied state in the database*).

**Components.**
- `FileTree` for the `drizzle/` folder layout above the diagram.
- `Figure` wrapping a hand SVG of the schema-and-snapshot-to-diff arrow with the journal sidebar. Single-use for this concept; the static SVG is the right scope.
- `Matching` for the file-to-role drill.
- `Aside` (`caution`) below: "the `meta/` folder is committed source code, not Drizzle's cache — losing it loses every future `generate`'s correctness."

**Project link.** Project 6.6.3's PR includes both the `0000_*.sql` and the `meta/0000_snapshot.json` — the student should be able to defend why both travel together.

---

## Concept 3 — Push versus generate: the silent-column-drop failure mode

**Why it's hard.** `drizzle-kit push` looks faster — no file, no PR, no review. The student reads the docs, sees both options, picks `push` because it has fewer moving parts, and the first column rename in a shared dev branch silently drops the column and everyone's local data. Push isn't *wrong* — it's right for a specific narrow window (solo prototype, throwaway database) and catastrophic everywhere else. The teaching has to install the *trigger* and make the silent-drop concrete enough that the student feels the bug, not just hears about it.

**Ideal teaching artifact.** Misconception-first ambush in two beats. **Beat one — the rename ambiguity.** The student is shown a schema diff: `userName: text()` becomes `displayName: text()`. They're asked: *what does Drizzle do with this?* Most will say "rename the column." The reveal: a rename and a drop-and-add look *identical* at the schema-text level — Drizzle Kit can't tell which the dev meant. With `generate`, the emitted SQL is `ALTER TABLE ... DROP COLUMN user_name; ADD COLUMN display_name text;` — visible in PR review, the reviewer flags it and asks for a `renamedFrom` annotation or a multi-step migration. With `push`, the same `DROP` + `ADD` runs immediately against the database; no review step exists; the column's data is gone. **Beat two — the trigger panel.** A short three-row table: *solo prototype, schema not stable yet, throwaway database* → push is fine; *shared dev branch, staging, production* → generate, no exceptions; *adopting Drizzle on an existing database* → `pull` first (named, deferred). One closing rule: push only against a database whose data you'd happily wipe.

**Engagement.** A `MultipleChoice` round of three scenarios after the ambush — *solo weekend prototype against a Neon branch you'll delete Monday*, *Tuesday standup mentions the staging branch is "slow today," your PR adds a column*, *production hotfix needs a new index by lunchtime* — the student picks `push` or `generate` for each. Wrong-answer feedback names which axis (data the team cares about, review step, replayability) drove the call.

**Components.**
- `CodeVariants` with two tabs ("`push` against the shared branch", "`generate` then review") showing the same rename diff in both flows, with a "data lost?" badge per tab.
- `Figure` wrapping a hand-coded HTML table for the three-row trigger panel.
- `MultipleChoice` reused three times for the scenario round.
- `Aside` (`caution`) below: "`push` skips the file *and* the review — the second is what catches the silent drop, not the first."

**Project link.** Project 6.6 uses `generate` exclusively from the first migration onward; the student should be able to defend that as the senior default and name the one window where `push` would be acceptable.

---

## Concept 4 — Why migrations need the unpooled URL: DDL holds long transactions

**Why it's hard.** The student wired the pooled `db` client in 6.1.4 and learned to default to it for everything app-side. Migrations break that default and the reason is invisible until a migration silently truncates: PgBouncer transaction-mode (the pooled URL) returns the connection to the pool at every transaction boundary. A migration's `BEGIN ... ALTER TABLE ... CREATE INDEX ... COMMIT` holds a single transaction for seconds to minutes; the pooler can't multiplex DDL onto a shared backend, and behavior under that load includes silent statement truncation. The student needs the *why* under the rule, not just the rule.

**Ideal teaching artifact.** Concept archetype rendered as a **two-lane connection diagram** that builds on the pool model from Chapter 6.1. Lane one (pooled URL): a 30-second migration's `BEGIN` hits the pooler, the pooler hands it a backend, but the next statement in the same transaction may land on a *different* backend — the transaction's session state is gone, DDL silently misbehaves. Lane two (unpooled URL): the migration opens a direct connection to Postgres, holds the same backend for the full transaction, every statement runs in the same session, the migration completes correctly. Below the lanes, a small `drizzle.config.ts` snippet pinning `dbCredentials.url` to `process.env.DATABASE_URL_UNPOOLED!`. The senior call lands as one rule: *anything that holds a transaction longer than a single round-trip uses the unpooled URL.* The same reasoning forward-loads the seed-script discussion in Concept 9.

**Engagement.** A `Buckets` sort: six call-sites — *Server Component reading 50 invoices*, *`drizzle-kit migrate` in the deploy pipeline*, *`drizzle-kit studio` browsing rows*, *Server Action wrapping three writes in `db.transaction(...)`*, *the seed script's `reset` + `seed` run*, *a webhook handler's single `insert ... returning`* — sorted into "pooled URL" or "unpooled URL." Wrong-answer feedback names the trigger (transaction duration, single-statement-or-not).

**Components.**
- `Figure` wrapping a hand SVG of the two-lane diagram (pooled = transaction split across backends, unpooled = same backend held). Reuses the visual vocabulary established by `ConnectionPoolSim` in 6.1 without rebuilding the simulator — the failure mode here is not "pool exhausted" but "transaction state lost across rebinding," which the static diagram carries.
- `Code` block for the `drizzle.config.ts` snippet pinning the unpooled URL.
- `Buckets` for the call-site sort.
- `Aside` (`caution`) below: "if the operation holds a transaction across multiple statements, it gets the unpooled URL — migrations always, seeds always, app reads never."

**Project link.** Project 6.6.4's seed script and 6.6.3's init migration both load `DATABASE_URL_UNPOOLED`; the project starter ships the env wiring and the student should recognize it as the same rule the chapter just installed.

---

## Concept 5 — The five-question SQL review checklist

**Why it's hard.** Reading SQL in a PR is the *moment* the senior catches what `push` would have shipped silently — but the junior reviewer doesn't know what to look for. Without a closed checklist, the review degrades into "looks fine to me" and destructive operations sail through. The five questions (DROPs, true-rename vs. drop-and-add, `CONCURRENTLY` on hot indexes, table-rewriting type changes, `NOT NULL` without default on existing rows) are the load-bearing recall. They have to land as a *reflex pass*, not a list to memorize.

**Ideal teaching artifact.** Pattern archetype delivered as a **PR-review training round**. Three real Drizzle-Kit-emitted migration files presented in sequence, each one the diff of a `db/schema.ts` change the student has seen before. For each file, the student walks the five-question checklist explicitly — five checkboxes, each labeled with the question — and flags the violations. Migration A: drops a column on a populated table (question 1 fires). Migration B: renames a column (question 2 fires — visible as `DROP` + `ADD`). Migration C: adds a `NOT NULL` column with no default (question 5 fires) *and* adds a `CREATE INDEX` on a hot table (question 3 fires) — two violations in one file, the trick case. After each file, a reveal walks each question against the SQL and names the hand-edit or multi-step rollout that fixes it. The five questions become muscle memory because the student applies them three times in a row before leaving the artifact.

**Engagement.** The training round is itself the assessment. Confirm with a `MultipleChoice` after: *"a teammate's PR adds `ALTER TABLE invoices ALTER COLUMN total TYPE numeric(14, 2);` to a 5M-row migration. Which checklist question fires?"* — correct answer is question 4 (table-rewriting type change holds `ACCESS EXCLUSIVE` for the rewrite duration), with wrong-answer feedback naming the *expand-backfill-contract* shape that fixes it (forward link to Concept 7).

**Components.**
- New: `MigrationReview` — props: `migrations` (array of `{ filename, sql, checklist: { question: string, fires: boolean, why: string }[] }`). Renders the SQL file with the five checklist questions as toggleable checkboxes the student ticks when they spot the violation. After the student commits their picks, the component reveals the correct answers and per-question rationale. Reuses `CodeReview`'s grading shape but specialized to a fixed five-question rubric. *Demoted to alternative bullet — see below.*
- `CodeReview` reused three times (one per migration), with the rubric kernel for each fixed on which checklist question fires. The five-question structure lives in surrounding prose plus a sticky `Aside` reference card at the top of the round.
- `Aside` (`tip`) below: "the five questions take ten seconds per migration; the production incident takes a weekend."
- `MultipleChoice` for the post-round confirmation.
- Alternative if `CodeReview` can't carry the structured five-question pass: bespoke `MigrationReview` as above. Demoted because the five-question structure recurs only in this chapter and the existing `CodeReview` plus a fixed-position checklist callout already does the work.

**Project link.** Project 6.6.3's init migration is small enough that all five questions answer "no" — the student walks the checklist against their own work and feels the discipline as a passable bar, not a wall.

---

## Concept 6 — `CREATE INDEX CONCURRENTLY` and the statement-breakpoint mechanic

**Why it's hard.** Chapter 6.4 Concept 5 already showed the lock-out timeline — the student knows *why* `CONCURRENTLY` matters. What 6.5.2 owns is the *file mechanic*: Drizzle Kit emits `CREATE INDEX` (no `CONCURRENTLY`) wrapped in a transaction, but `CONCURRENTLY` cannot run inside a transaction. The fix is two hand-edits — add `CONCURRENTLY` to the index, and add `--> statement-breakpoint` markers around it so the runner commits the surrounding work first and runs the index outside the transaction. The student who only knows the rule from 6.4 will type `CONCURRENTLY` and see the migration fail at runtime; the breakpoint is the load-bearing detail.

**Ideal teaching artifact.** Mechanics archetype delivered as a **before-and-after migration file with the runner's transaction boundaries drawn on**. The student sees the Drizzle-Kit-emitted file: a single `BEGIN ... CREATE INDEX ... COMMIT` block, with a translucent box drawn around the whole thing labeled *"one transaction."* Below it, the hand-edited version: the `CREATE INDEX` line changed to `CREATE INDEX CONCURRENTLY` and bracketed by `--> statement-breakpoint` markers; the box now shows three transactions — one before the breakpoint, one for the `CONCURRENTLY` index *outside* any transaction, one after. A side annotation names what each breakpoint causes the runner to do (commit, restart). The teaching is the visible relationship between the comment-style directive and the runner's transaction boundaries — the marker is *not* a Drizzle convention, it's a runtime control. One follow-up beat names the other DDL that needs the same treatment: `CREATE EXTENSION`, some `ALTER TYPE` patterns.

**Engagement.** A `DrizzleCoding`-shaped exercise (or a `Dropdowns` if the runner can't grade DDL): the student is given a Drizzle-Kit-emitted migration file with a `CREATE INDEX` on a populated table and asked to make it production-safe. The grader checks for `CONCURRENTLY` on the index *and* the two `--> statement-breakpoint` markers around it. Confirm with a `MultipleChoice`: *"the runner's behavior at `--> statement-breakpoint` is"* → "commit the current transaction and start a new one for the next statement."

**Components.**
- `CodeVariants` with two tabs ("emitted by `generate`", "production-safe hand-edit") rendering the same migration file in both forms, with the transaction-boundary boxes drawn as background overlays in the code block (or as a side comment column if the overlay isn't tractable).
- `DrizzleCoding` for the hand-edit exercise (or `Dropdowns` if the SQL grader doesn't accept DDL — the four blanks: the `CONCURRENTLY` keyword, the opening breakpoint, the closing breakpoint, and a confirm of the index name).
- `MultipleChoice` for the breakpoint-semantics confirmation.
- `Aside` (`note`) below: "the breakpoint marker is a Drizzle-runner directive in a SQL comment — Postgres ignores it, the migrator splits on it."

**Project link.** Project 6.6's init migration ships the indexes against a freshly-seeded local table where concurrency cost is zero; the 6.6.6 Done-when checks include a forward-pointer to the `CONCURRENTLY` + breakpoint hand-edit the student would make in production. The mechanic from this concept is what they'd type.

---

## Concept 7 — The three column-change patterns that bite, and expand-backfill-contract as the reflex

**Why it's hard.** Three patterns each fail differently in production: a `NOT NULL` column with no default fails on existing rows; a column rename in the same deploy breaks the cutover (old code queries the old name, new code queries the new name, the migration runs at the boundary); a column-type change rewrites the whole table under `ACCESS EXCLUSIVE`. Each looks correct in dev, where the table has six rows and one app version. The teaching has to make the *deploy boundary* visible — the migration doesn't run in isolation, it runs while two app versions are live — and install expand-backfill-contract as the named shape every safe destructive change takes.

**Ideal teaching artifact.** Misconception-first ambush rendered as a **deploy-boundary timeline** for the rename case (the most visceral of the three). Three lanes drawn vertically aligned across time: *old app version (vN)*, *migration runner*, *new app version (vN+1)*. The student watches a single naive deploy: at t=0 the migration runs `ALTER TABLE invoices RENAME COLUMN total TO amount_cents`; at t=0+ε the new app starts but old app instances are still serving requests. For the next few seconds, every old-app request that queries `invoices.total` raises *"column does not exist."* The failure is not a code bug, not a migration bug — it's a *deploy choreography* bug, invisible until two app versions overlap. Below the timeline, the expand-backfill-contract reframe: three deploys, three migrations. Deploy 1: add `amount_cents` alongside `total`, dual-write from app code. Deploy 2: backfill `amount_cents` for existing rows, switch reads to `amount_cents`. Deploy 3: drop `total`. The student sees the new shape replace the broken one, with the rule landing as: destructive change in one deploy = pain; expand-backfill-contract = boring deploys. A short panel below names the other two patterns (`NOT NULL` no default, type rewrite) with their own one-line "the fix" — both fall out of the same expand-backfill-contract reflex.

**Engagement.** A `Buckets` sort: eight column-change descriptions sorted into "ships in one migration" or "needs expand-backfill-contract." Trick items: *adding a nullable column with a default* (one migration — fine), *adding a `NOT NULL` column with a sensible default* (one migration — the default applies to existing rows), *adding a `NOT NULL` column with no default to a populated table* (expand-backfill-contract — start nullable, backfill, alter), *changing a column from `text` to `varchar(255)`* (expand-backfill-contract — type rewrite), *renaming a column* (expand-backfill-contract — deploy-boundary trap), *adding a new index on a cold table* (one migration — no boundary), *splitting a `fullName` column into `firstName`/`lastName`* (expand-backfill-contract — multi-stage), *dropping a column nothing reads anymore* (one migration — the contract step of an earlier expand-backfill-contract). Wrong-answer feedback names which fail-mode the change would hit.

**Components.**
- `DiagramSequence` for the three-lane deploy-boundary timeline scrub (six ticks: pre-migration, migration runs, vN+1 starts, vN still serving, requests fail, vN drained). Each tick renders the three lanes' state.
- `Figure` wrapping a hand SVG of the three-deploy expand-backfill-contract sequence below the ambush. Single-use composition; the static SVG is the right scope.
- `Buckets` for the change-type sort.
- `Aside` (`caution`) below: "the migration doesn't run alone — it runs with two app versions live. Every destructive change needs expand-backfill-contract; Chapter 21.4 owns the choreography."

**Project link.** Project 6.6's schema is built once and the student doesn't refactor it within the project; the reflex installs for Chapter 7.6 onward, where the first column rename on the live invoice table triggers the muscle memory from this concept.

---

## Concept 8 — Three migration-history rules: never edit applied files, forward-fix only, manual SQL block for what `generate` can't emit

**Why it's hard.** Three small disciplines compound. (1) **Never edit an applied migration file.** The snapshot in `meta/` reflects what was applied; editing the SQL after-the-fact drifts the snapshot from the database state, the next `generate` produces nonsense, the team's history is corrupted. (2) **Forward-fix, never roll back.** Drizzle Kit emits `up` migrations only; production never reverses, the next migration corrects the previous one. (3) **The manual SQL block at the bottom.** Triggers (the `updatedAt` trigger from 6.2.4), generated columns with complex expressions, `CREATE EXTENSION`, partial unique with computed `WHERE` — Drizzle Kit doesn't emit these; the dev hand-writes them at the bottom of the generated file. All three rules are senior-mindset moves the student rarely sees taught and easily violates without consequence in dev.

**Ideal teaching artifact.** Decision archetype delivered as a **three-rule audit pass** on a multi-scenario panel. Six small scenarios presented in sequence, each with a one-line description of what a teammate did and a free-form "approve or ask for changes" pick: (a) *teammate edits `0003_*.sql` after merge to fix a typo in a column comment* — block, snapshot has drifted, generate a corrective migration instead; (b) *teammate runs `drizzle-kit drop` on a production-applied migration to "roll back" a bad schema change* — block, forward-fix only, never reverse in production; (c) *teammate adds a `CREATE OR REPLACE TRIGGER set_updated_at ...` block at the bottom of the generated file for the new `audit_events` table* — approve, that's the manual SQL pattern; (d) *teammate hand-writes a `CREATE EXTENSION pgcrypto;` at the top of the generated file* — approve, with the breakpoint discipline (the `CREATE EXTENSION` needs to commit before use); (e) *teammate amends a previously-merged migration with a `WHERE deleted_at IS NULL` predicate to make a partial unique* — block, append a new corrective migration; (f) *teammate uses `drizzle-kit drop` in dev to remove the most recent unapplied migration before re-generating* — approve, that's the legitimate use of `drop`. Each reveal names the rule. The senior pass lands as: the migration history is append-only after merge; the manual SQL block extends what `generate` knows; the forward-fix is the only correction shape in production.

**Engagement.** The audit is itself the assessment — six picks scored. Confirm with a `TrueFalse` round of four statements: *"`drizzle-kit drop` is the production rollback tool"* (false), *"editing an applied migration in dev is fine because no one else has run it yet"* (false — the snapshot drifts, your next `generate` produces nonsense), *"triggers belong in the manual SQL block at the bottom of the generated file"* (true), *"production rolls back via `drizzle-kit drop` only when no app version depends on the column"* (false — production never rolls back, forward-fix only).

**Components.**
- `Figure` wrapping a hand SVG of the six-scenario audit panel, each scenario as a one-line code/action sketch with an approve-or-block slot. Single-use composition; the static SVG is the right scope.
- `MultipleChoice` reused six times, one per scenario, with the rule reveal in the wrong-answer feedback.
- `TrueFalse` for the four-statement confirmation.
- `Aside` (`note`) below: "the migration folder is append-only after merge; `generate` extends, the manual block extends, `drop` is dev-only, rollback is forward-fix."

**Project link.** Project 6.6.3 ships the init migration with no triggers (the schema doesn't need an `updatedAt` trigger in scope), but the manual-SQL-block pattern is named so the student recognizes it the first time they ship a trigger in a Unit 7 chapter.

---

## Concept 9 — `drizzle-seed`'s call shape: schema-aware, FK-resolving, `.refine` for the per-table generators

**Why it's hard.** A junior who has hand-written `INSERT` statements for fixtures sees `drizzle-seed` and either treats it as a black box ("call it, get data") or over-configures it (every column refined, every relationship hand-specified). The senior shape lives in the middle: the seeder reads the schema and the FKs, picks topological insertion order automatically, generates type-appropriate values by default, and uses `.refine` only for the columns where realism matters (status distributions, curated names) and the parent-child fanout (`with`). Without the call-shape mental model, the student writes more configuration than the seeder needs and still gets unrealistic data because they refined the wrong columns.

**Ideal teaching artifact.** Mechanics archetype delivered as a **layered call-shape walkthrough** on one worked example. The starting beat: `await seed(db, schema, { seed: 1 });` — three arguments, ten rows per table by default, FK order auto-resolved. The student sees the result in a small `Figure` that shows three tables (`organizations`, `invoices`, `invoice_lines`) populated with ten rows each, with arrows showing the FK resolution (every `invoice` row's `organizationId` pointing at a real `organizations` row). One annotation at the top: *the seeder reads `references()` and inserts parents before children — the student writes nothing.*

The next beat layers `.refine` in three steps, each step adding one feature and showing the resulting data shape: (1) `count: 200` on `invoices` — now 200 invoices, still default values; (2) `columns: { status: f.weightedRandom([...]) }` — the status distribution shifts to 60% paid / 40% pending+overdue, visible in a small bar chart; (3) `with: { lineItems: 5 }` — each invoice now has five line items, total `invoice_lines` count = 1000 (named explicitly: *the `with` count is per parent, not total*, the most common gotcha). Each layer adds ~3 lines of code; the student watches the data shape evolve under the layers. Closing rule: refine the columns the dev experience surfaces (status, names, dates), let the seeder default everything else.

**Engagement.** A `DrizzleCoding`-shaped exercise (or a `Dropdowns` if the seeder doesn't run in the grader): the student is given a `customers` table and a target spec ("100 rows, 30% with `tier: 'enterprise'`, 70% with `tier: 'free'`, names from a curated list of ten company names, `createdAt` spread across the last year") and writes the `.refine` block. The grader checks the resulting row count, the tier distribution, and that the names come from the allowed list.

**Components.**
- `AnnotatedCode` walking the four-step layering (default → `count` → `columns` → `with`) with one annotation per step. Shows the resulting row shape inline.
- `Figure` wrapping a hand SVG of the three-table FK-resolution diagram for the default-call beat (parent rows on the left, children with FK arrows on the right).
- `DrizzleCoding` (or `Dropdowns`) for the customers `.refine` exercise.
- `Aside` (`note`) below: "`with: { lineItems: 5 }` is per parent — 200 invoices × 5 = 1000 line items, not 5 line items total."

**Project link.** Project 6.6.4's seed script is exactly this layered shape — two orgs (`count: 2`), 100+ invoices per org (`with: { invoices: 50 }` on `org_members` shape, or `count: 100` on `invoices` with org-scoped weighting), weighted statuses, curated customer names. The student writes the script from this concept, not from copy-paste.

---

## Concept 10 — Determinism, idempotent reset-and-seed, and the test-factory boundary

**Why it's hard.** Three properties have to land together for the seed script to be safe in dev and in CI. (1) **Determinism** — the same `{ seed: 1 }` produces identical data across every run, every machine, every CI invocation; the team debugs against the same fixture. (2) **Idempotent reset-and-seed** — running the script twice ends in the same database state; the dev's reflex when local data goes weird is `pnpm db:seed` with no fear. (3) **The test-factory boundary** — the seeder produces the *baseline dataset*; per-test factories produce the *one-off rows* a specific test needs on top. Confusing the two leads to either tests that depend on the seed's exact distribution (fragile) or seed scripts that try to encode every test's setup (bloated). The teaching has to install all three as a single coherent workflow.

**Ideal teaching artifact.** Pattern archetype delivered as a **two-beat workflow demo** plus a **boundary-line panel**. **Beat one — the determinism + reset-and-seed demo.** A single script (`scripts/seed.ts`) shown as a small file: `await reset(db, schema); await seed(db, schema, { seed: 1 }).refine(...);`. The student sees the script run twice in sequence — first run: empty database becomes seeded with N rows; second run: reset truncates everything in FK-safe order, seed re-inserts the *exact same* N rows, byte-identical. A side panel shows the row count and three sample IDs after each run; they match. The reflex lands: the script is safe to re-run, the dataset is reproducible, the dev never fears `pnpm db:seed`.

**Beat two — the test-factory boundary.** A small comparison panel, two columns. Left column: an integration test's `beforeEach` calls the full seeder (reset + seed with `{ seed: 1 }`) — the test runs against the known baseline, all 200 invoices and 5 orgs are present, the test asserts against a specific known invoice id. Right column: a unit test that needs a single specific row (an overdue invoice with a specific total) calls a `makeInvoice({ status: 'overdue', total: '500.00' })` factory — direct `db.insert`, returns the row, the test runs against that one row plus whatever the seed left. The senior call lands as a one-liner: *seed for the dataset shape, factories for the per-test row shape.* A short closing beat names what `drizzle-seed` is *not* for: production fixture data (default workspace on signup, system organization) — that's a one-shot data migration, hand-written, run once.

**Engagement.** A `Buckets` sort: eight test-setup descriptions sorted into "use the seeder", "use a per-test factory", or "neither — write a one-shot data migration." Trick items: *integration test that lists the first page of invoices for an org* (seeder — relies on the seeded baseline volume), *unit test that asserts an overdue-invoice formatter outputs the right currency string* (factory — needs one specific row), *seeding the production database with the system organization on first deploy* (one-shot data migration — not the seeder), *integration test that asserts pagination works at the page boundary* (seeder — needs the seeded volume), *unit test that handles the empty-state of the list* (neither — the test mocks the data layer or runs against a freshly-reset table with no seed). Wrong-answer feedback names the boundary the choice crossed.

**Components.**
- `AnnotatedCode` walking the `scripts/seed.ts` file with the reset-then-seed shape and the determinism guarantee called out as annotations.
- `Figure` wrapping a hand SVG of the two-run-byte-identical demo (two database snapshots side by side, sample-ids matching). Single-use static composition.
- `CodeVariants` with two tabs ("integration test using the seeder", "unit test using a factory") for the boundary panel.
- `Buckets` for the test-setup sort.
- `Aside` (`note`) below: "seeder for the dataset shape; factory for per-test rows; one-shot migration for production fixtures — three tools, three different jobs."

**Project link.** Project 6.6.4's seed script is exactly this shape — `reset` + `seed` with `{ seed: 1 }`, idempotent, two orgs with overlapping members and 100+ invoices each. The 6.6.6 Done-when check "idempotent seed" verifies the determinism property directly. Per-test factories appear in Unit 18 (integration tests); the boundary lands here so the student doesn't reach for `drizzle-seed` to set up per-test rows in 18.

---

## Component proposals

None. Every concept reaches a strong fit with `Figure` + hand SVG, `AnnotatedCode`, `CodeVariants`, `DiagramSequence`, `FileTree`, the live-coding components (`DrizzleCoding`, `Dropdowns`), and the existing exercise components (`Buckets`, `Sequence`, `MultipleChoice`, `TrueFalse`, `Matching`, `CodeReview`).

The chapter's most ambitious teaching beats — the lifecycle scrub (Concept 1), the rename deploy-boundary timeline (Concept 7), the unpooled-vs-pooled transaction-rebinding diagram (Concept 4) — each ride on `DiagramSequence` or `Figure`-wrapped hand SVG without a bespoke component earning its weight. The single bespoke candidate considered (`MigrationReview` in Concept 5) was demoted in favor of `CodeReview` reused three times with a sticky checklist callout, because the five-question structure recurs only in this chapter and the existing component carries the rubric grading.

The chapter also reuses two components from earlier in the unit by reference rather than by import — Concept 4's pooled-vs-unpooled diagram trades on the connection-pool vocabulary `ConnectionPoolSim` (6.1) installed, and Concept 6's `CONCURRENTLY` mechanic trades on the lock-out reveal Concept 5 of 6.4 already landed. Neither requires the original component to be embedded again; the visual vocabulary is the reuse.

## Open pedagogical questions

- Concept 6's hand-edit exercise (`CREATE INDEX CONCURRENTLY` + breakpoint markers) wants to be a `DrizzleCoding`-shaped exercise but `DrizzleCoding` grades typed Drizzle queries against a Postgres-in-WASM result, not raw SQL files with runner directives. Confirm whether a SQL-text-edit grader exists or whether the fallback to `Dropdowns` (four blanks) is the right call.
- Concept 7's three-lane deploy-boundary timeline (`DiagramSequence` with three rows per step) may strain the component's slot model the same way 6.1 Concept 6's two-lane scrub did. If the component carries one row per step naturally, the three-lane variant ships as a hand SVG inside each `DiagramSequence` step instead.
- Concept 8's six-scenario audit panel is the third instance in the unit of the "scenario round" shape (after 6.1 Concept 3's denormalization triage and 6.2 Concept 4's per-column-type triage). If the course settles on a "scenario round" wrapper that scores N MultipleChoice cards as one unit, this concept is the cleanest candidate for the third use.
