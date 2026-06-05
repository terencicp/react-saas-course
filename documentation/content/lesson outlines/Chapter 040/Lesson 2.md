# Production-safe migrations

- **Title (h1):** Production-safe migrations
- **Sidebar label:** Production-safe migrations

---

## Lesson framing

This is lesson 2 of chapter 040. Lesson 1 already taught the daily loop: edit `db/schema.ts`, run `drizzle-kit generate`, review, `drizzle-kit migrate`, commit the three artifacts together. This lesson teaches the **review** step that lesson 1 deliberately black-boxed — what a senior actually looks for when reading the generated SQL, and what they hand-edit before it ships.

**Load-bearing mental model (state it early, return to it):** `drizzle-kit generate` emits SQL that is *correct in form* (it produces the schema you asked for) but *not always safe under live traffic*. The generator diffs two schema snapshots; it has no idea which tables have a million rows, which are being written to right now, or which app version is mid-deploy. The dev is the one piece of the pipeline that knows those things. So the senior reflex isn't "trust the generated file" or "hand-write SQL" — it's **read every generated migration through a lock-and-data lens, and hand-edit the handful of cases the generator can't see.**

**The spine of the lesson is the five-question review checklist.** Every other topic is one of the five questions expanded into its fix:
- Q1 (does anything DROP?) → destructive-op awareness, feeds the rename pattern.
- Q2 (true rename vs. remove-and-add?) → the push silent-drop failure mode + the rename-in-deploy trap.
- Q3 (new index on a hot table?) → `CREATE INDEX CONCURRENTLY` + `--> statement-breakpoint`.
- Q4 (table-rewriting type change?) → `ACCESS EXCLUSIVE` lock, the add-new-column fix.
- Q5 (`NOT NULL` without a default?) → fails on existing rows, the nullable-then-backfill fix.

This framing keeps the lesson from being a grab-bag of "watch-outs." Each watch-out earns its place as the answer to a checklist question. Author the checklist once, early, then let the body walk it.

**Pedagogical stance.** The student is a junior who has never run a migration against a database with real traffic. The pain they haven't felt yet: a `CREATE INDEX` that locked the orders table for 40 minutes during peak hours; a column rename that 500'd every request for the 90 seconds between the migration and the new deploy. The lesson's job is to **install the reflex before they feel the pain** — to make "is this safe under load?" an automatic second read of every migration. Frame everything in production stakes (an outage, lost data, a 3am page), because that's what makes a checklist stick. Avoid abstraction; every rule is anchored to a concrete failure.

**Decisions before syntax.** Lead each section with the decision (when do I hand-edit? is `push` ever right? do I roll back or forward-fix?), then show the minimal SQL. The syntax here is tiny — `CONCURRENTLY`, a breakpoint comment, an extra migration. The lesson is in *knowing when*.

**Build on what they know.** They already have: DDL vs DML (lesson 1), the unpooled URL rule (chapter 036 L4, restated lesson 1), the immutability/forward-only discipline (lesson 1 — "applied migration = frozen"), index types and when to add one (chapter 039 L1), the `updatedAt` trigger (chapter 037 L4), `ACCESS EXCLUSIVE` / lock vocabulary and `auto_explain` (chapter 039 L3). This lesson connects those into a single "ship it safely" workflow. Restate prerequisites in one line, never re-teach.

**Reuse the lesson-1 anchor.** Lesson 1's worked example was adding `invoices.archivedAt`. Keep `invoices` as the running table so the student isn't re-learning a domain. New examples this lesson: an index on `invoices`, renaming `invoices.customerName`, a type change, a `NOT NULL` add, the `updatedAt` trigger as the manual-SQL case.

**Exercises and visuals carry real weight here** because the skill is judgment, not recall:
- A `StateMachineWalker` for the push-vs-generate decision (forces the *order* of the senior's questions).
- A `CodeReview` exercise where the student reviews a real multi-file migration PR and must flag the unsafe operations — this *is* the checklist, practiced. This is the centerpiece exercise.
- `CodeVariants` for naive-vs-safe SQL (the `CONCURRENTLY` hand-edit, the column-type fix).
- A `DiagramSequence` for the rename-in-deploy race (the cutover window where old and new app versions disagree) and for expand-backfill-contract.
- A `Buckets` drill to sort operations into "ships as-is" vs. "needs a hand-edit / multi-step."

**Scope discipline is critical.** Expand-backfill-contract is *named and shaped* here (the student must recognize the trigger and have the vocabulary) but the full app-code dual-write choreography is chapter 099's. Keep the rename/type-change patterns at "here's the shape and why, here's the migration count" depth — do not write the app-code dual-write logic. This is the single most important scope boundary; state it to downstream agents explicitly.

---

## Lesson sections

### Introduction (no header)

Open on the gap lesson 1 left. Restate the loop in one sentence (edit → generate → review → migrate → commit), then zoom in on **review**: lesson 1 said "read the SQL before you commit" but never said *what to read for*. Motivate with a concrete two-line horror story: the generated SQL was correct, it built the schema exactly as asked — and it locked the `invoices` table for half an hour mid-afternoon, because the table has two million rows and `CREATE INDEX` takes a write lock. Land the mental model paragraph (generated SQL = correct in form, not always safe under load; the dev is the only part of the pipeline that knows the table size and the traffic). Preview the deliverable: by the end the student runs every migration through a five-question checklist and knows the three hand-edits that keep a deploy from taking the site down.

Keep it warm, terse, adult. No "in this lesson we will."

### Generate by default, push only for throwaway data

The first fork, before any checklist: do you even produce a reviewable file? This section settles push-vs-generate so the rest of the lesson can assume a generated file exists.

Content:
- Recap `drizzle-kit push` from lesson 1's command list (named there, owned here): reads the schema, applies the diff **directly** to the database, skips the `.sql` file entirely. No file, no snapshot to review, no PR artifact.
- Why `generate` is the default for anything real, as three properties (this is the senior justification, state it crisply): the file is **reviewable** (a human reads the SQL in a PR and catches destructive ops), **replayable** (CI applies the same bytes to staging, prod applies the same bytes — drift is zero), and **editable** (the hand-edits this lesson teaches survive in the file). Any team larger than one defaults to generate.
- The `push` failure mode, named explicitly — this is the durable warning: an **ambiguous diff**. A column rename and a drop-and-add look identical to a snapshot differ. `generate` pauses and asks the dev to disambiguate (it shows an interactive prompt); `push` resolves it by **dropping the column and creating a new empty one** — data silently gone, no review step to catch it. This is the single reason `push` is dangerous.
- The senior rule, stated as a one-liner the student can memorize: **`push` only against a database whose data you'd happily wipe** — a solo prototype before the schema stabilizes, a throwaway ephemeral Neon branch, demo work. `generate` for everything with data the team cares about, including a *shared* dev branch and staging. Call out the trap directly: "it's only staging" still loses data when staging is shared across the team.

**Exercise — `StateMachineWalker` (kind="decision"), placed at the end of this section.** Forces the order of the senior's questions. This is a better fit than prose because the lesson is in the *sequence* of the decision, and it's a clean 2-3 question tree.
- Root Question: "Is there data in this database you'd be upset to lose?" → No → branch to a second Question; Yes → leaf "Use `generate`."
- Second Question (the "No" path): "Is anyone else on the team using this database?" → No (solo throwaway / ephemeral branch) → Leaf "`push` is fine — faster, no file to review." → Yes → Leaf "Use `generate` — shared means someone else's data."
- Leaves restate the one-liner rule. Keep it short; this is reinforcement, not the main exercise.

Tooltip candidates in this section: `DDL` (re-define in one line: SQL that changes structure — CREATE/ALTER/DROP; established lesson 1, restate via `Term`), `ephemeral branch` (a short-lived Neon database branch thrown away when the feature merges).

### Reading the generated SQL: the five-question checklist

The spine. Introduce the checklist as a single scannable list, then the rest of the lesson is the expansion of each item. Author this as the conceptual heart of the lesson.

Content:
- Frame it: every PR that touches `db/schema.ts` carries a generated `.sql`. The reviewer reads the **SQL**, not the schema diff (restate from lesson 1 — the SQL is what runs). These five questions are what they read for. Present them as a numbered list with a one-line "if yes →" pointer to the fix taught later:
  1. **Does anything `DROP`** — column, table, constraint, index? → is the drop safe *in this deploy*, or does it strand the old app version? (feeds the rename pattern)
  2. **Is every rename a true rename**, or is Drizzle Kit being asked to disambiguate a remove-and-add? → check the prompt; a wrong answer is silent data loss.
  3. **Does any new index sit on a table with write traffic?** → it needs `CONCURRENTLY` + a breakpoint.
  4. **Does any column-type change rewrite the table?** → `ACCESS EXCLUSIVE` lock, every read and write blocks; needs the add-new-column pattern.
  5. **Does any new `NOT NULL` column lack a default?** → it fails against existing rows; needs nullable-then-backfill.
- Make the meta-point: questions 1-2 are about **data loss**, questions 3-5 are about **locks and downtime**. Two failure families, one checklist. This is the framing that makes it memorable — say it explicitly.
- Present the checklist visually as a `Figure` wrapping a simple two-column HTML list (Data-loss risks | Lock/downtime risks) so the student has a glanceable artifact. This is a low-effort, high-value visual aid (per the diagrams guidance — a visual scaffold, not a system graph). Keep height small.

Render the checklist itself as plain prose + the `Figure`; the *practice* comes at the end of the lesson in the `CodeReview`. Forward-reference it ("you'll run this checklist against a real PR at the end").

Tooltip candidates: `ACCESS EXCLUSIVE` (the strongest Postgres lock — blocks reads and writes both; established chapter 039 L3, restate via `Term`).

### Building indexes without locking writes

Checklist Q3, expanded. The most common and most teachable hand-edit, so it goes first among the fixes.

Content:
- The problem: Drizzle Kit emits `CREATE INDEX "idx_..." ON "invoices" (...)`. Plain `CREATE INDEX` takes a lock that **blocks writes** to the table for the entire build — seconds on a small table, minutes-to-hours on a large one. Reads continue; writes queue. On a hot table that's a partial outage. (Connect to chapter 039 L1: they know *which* index to add and *why*; this is the *migration-file mechanic* for adding it safely.)
- The fix, one word: `CREATE INDEX CONCURRENTLY`. Postgres builds the index without the write lock (it does extra passes instead). The cost: it's slower and **can't run inside a transaction block**.
- The catch that makes this a real hand-edit: Drizzle's migrate runner **wraps each migration file in a single transaction**. So a `CREATE INDEX CONCURRENTLY` sitting in a file alongside other DDL fails at runtime — it's inside the file's transaction. (This was a long-standing sharp edge in the tool; the resolution is a discipline, not a flag.)
- The senior pattern (state this as the primary fix — **corrected during fact-check**): **put the `CREATE INDEX CONCURRENTLY` in its own migration file**, generated with `drizzle-kit generate --custom --name add_invoices_status_index` (the `--custom` flag emits an empty migration for hand-written SQL — see the next section). A file containing only the concurrent index, with nothing else to wrap in a transaction with it, runs cleanly. The reflex: a concurrent index is *always its own migration*, never bundled with table changes.
- `--> statement-breakpoint`, named and scoped accurately (do **not** overstate it): it's the directive Drizzle Kit inserts to split a file into multiple statements for engines that can't run several DDL statements per transaction. The student will see it in generated files; it's the marker that separates statements. The Postgres-`CONCURRENTLY` fix is the *separate file*, not relying on a breakpoint to escape the wrapping transaction. Mention breakpoint as "the thing you'll see between statements," then move on.
- Course rule, stated plainly: **every index on a table with write traffic uses `CONCURRENTLY`, in its own migration file.** That's the senior reflex.

**Code presentation — `CodeVariants` (before/after), the centerpiece of this section.** Two tabs:
- Tab "What Drizzle Kit emits": the plain `CREATE INDEX` line in a migration alongside other statements. Prose: correct, builds the right index, takes a write lock for the whole build.
- Tab "The production hand-edit": a dedicated migration file containing only `CREATE INDEX CONCURRENTLY ...` (`ins=` on the changed line). Prose: one keyword, isolated in its own file so it isn't trapped in a transaction — no write lock. Use `data-mark-color="green"` on the safe pane.
This is the ideal use of `CodeVariants` — same intent, naive vs. safe, side by side.

Note for downstream agent: the load-bearing point is **isolation in its own file**, not breakpoint gymnastics. Show the concurrent index as a standalone one-statement migration. Use the index naming convention from code standards (`idx_invoices_status` style). Do not author a fragile "breakpoints around CONCURRENTLY in a shared file" example — fact-check showed that's not the clean documented path.

Tooltip candidates: `CONCURRENTLY` is taught inline, no tooltip needed. `--> statement-breakpoint` — explain in one line of prose; it is *not* the section's hero anymore.

### Migrations Drizzle Kit can't write: the manual SQL block

Q3's cousin — the generator's blind spots. The student already met the `updatedAt` trigger in chapter 037 L4; here's how that trigger reaches the database. Establishes the source-of-truth split that resolves the obvious confusion ("if I hand-edit the SQL, won't the next `generate` clobber it?").

Content:
- The category: Drizzle Kit reads `db/schema.ts` and emits DDL for what the schema can express — tables, columns, FKs, plain indexes. It **does not emit** things the schema can't represent: triggers (the `updatedAt` trigger from chapter 037 L4), `CREATE EXTENSION`, generated columns with complex expressions, custom check constraints, partial unique indexes whose `WHERE` references computed values. List these as recognition items; the `updatedAt` trigger is the worked one.
- The first-class pattern (**confirmed during fact-check**): `drizzle-kit generate --custom --name <verb_noun>` emits an **empty migration file** for exactly this — hand-written SQL for DDL Drizzle Kit can't express. This is the documented seam, not an afterthought. Write the schema for the parts Drizzle Kit handles; write the trigger / extension / custom constraint SQL into a `--custom` migration. (This is the same flag the `CONCURRENTLY` section used to isolate a concurrent index — tie the two together.)
- The source-of-truth split, stated crisply: the **migration files** are the source of truth for the *database state*; `db/schema.ts` is the source of truth for the *Drizzle types*. A trigger lives only in a migration (the schema can't model it); a column lives in both (the schema models it, the migration applies it). They don't conflict — each owns a different surface.
- Resolve the confusion head-on (this is the section's payoff): "won't the next `generate` overwrite my custom SQL?" No — `generate` writes a *new* numbered file for the *next* diff; it never rewrites an existing committed migration (restate immutability from lesson 1). The custom migration is frozen the moment it's committed. The two sources stay in sync because the next `generate` re-reads the schema for the next change.
- Keep this concept-level. Do not teach how to *write* the trigger function (chapter 037 L4 owns that) — show that it lives in a `--custom` migration and why.

**Code presentation — `AnnotatedCode`.** One short `--custom` migration file holding the `CREATE TRIGGER` block, stepped: step 1 frames it as a `--custom`-generated empty file the dev filled in; step 2 highlights the trigger DDL (the dev wrote this — the schema can't express it); step 3 highlights how the next `generate` for an unrelated column change leaves this file untouched (immutability + the source-of-truth split). `AnnotatedCode` fits because attention moves across regions of one file in sequence. Use `color` per step (blue for framing, green for hand-added DDL).

### Three column changes that break a live deploy

Checklist Q4 and Q5, plus the rename trap from Q1/Q2. The judgment-heavy core. Group the three patterns that share a root cause: **the migration runs at a single instant, but the deploy is a window where two app versions coexist, and existing rows already have values.**

State the unifying insight first, then three subsections (h3). Frame each as: the naive generated SQL → why it breaks → the fix → the migration/deploy count.

#### Adding a NOT NULL column with no default

- Naive: Drizzle Kit emits `ALTER TABLE "invoices" ADD COLUMN "..." text NOT NULL`. Fails immediately — every existing row would violate `NOT NULL` the instant the column exists.
- Fix, two options: (a) add the column **nullable**, backfill the values, then a *later* migration alters it to `NOT NULL`; or (b) ship with a `DEFAULT` the existing rows accept. The generator emits the naive form; recognizing it is the dev's job (Q5).
- Cost: one extra migration if you go the nullable route. Cheap. Lowest-stakes of the three — teach it first to build the pattern.

#### Renaming a column

- The auto-generated `ALTER TABLE ... RENAME COLUMN` is *correct SQL*. The trap is the **deploy window**, not the SQL. This is the canonical "I broke prod" mistake — give it weight.
- Walk the race: old app version queries `customer_name`; migration renames it to `client_name` at one instant; new app version queries `client_name`. Between the rename and the new version going live (or for any old version still serving), one of them queries a column that no longer exists → errors. A same-deploy rename guarantees a broken window.
- The safe shape (name it, shape it, **do not write the app code**): add the new column, **dual-write** from app code so both stay populated, backfill existing rows, switch reads to the new column, drop the old column in a *later* deploy. Three migrations, two deploys minimum.
- Explicitly defer the dual-write choreography to chapter 099. Here the student needs: this is why rename-in-place is forbidden in a live system, and the expand-contract shape is the fix.

**Visual — `DiagramSequence`, placed in this subsection.** This is the single best place for a temporal diagram because the bug *is* a timing problem. Steps scrub through the cutover window:
- Step 1: Old app version running, querying `customer_name`. DB has `customer_name`. All green.
- Step 2: Migration runs — column renamed to `client_name`. Old app version *still serving traffic* now queries a missing column → red, 500s.
- Step 3: New app version deploys, queries `client_name`. Green again — but there was a broken window between steps 2 and 3.
- Step 4 (contrast / the fix in miniature): with expand-contract, the new column is added *alongside* the old — both versions find a column they can read, no red window.
Pedagogical goal: make the invisible cutover window visible. A static diagram can't show "for these 90 seconds, prod is down"; the scrub does. Keep each step a simple two-box (app version | DB columns) layout with a status pill.

#### Changing a column type

- Naive: an incompatible type change (e.g. `text` → `integer`, or widening rules that don't apply) makes Postgres **rewrite the entire table**, holding `ACCESS EXCLUSIVE` the whole time — every read and write blocks until it finishes. On a large table that's a full outage (Q4).
- Note the nuance briefly so the student isn't over-cautious: some type changes are cheap (Postgres can do certain widenings without a rewrite). The reflex is to *check whether this one rewrites*, not to fear every type change. (Connect to chapter 039 L3: they can use `EXPLAIN`/`auto_explain`-style tooling and lock awareness to reason about it.)
- The fix is the same expand-contract shape: add a new column with the new type, backfill in batches, switch reads, drop the old column. Same three-deploy pattern as the rename.

#### Closing the section: the pattern has a name

After the three, name the shared shape: **expand-backfill-contract** (a.k.a. expand-contract). Define it once, crisply: **expand** (add the new shape alongside the old), **backfill** (populate the new shape for existing rows, in batches for big tables), **contract** (drop the old shape once nothing reads it). Three deploys minimum for any destructive change. State plainly that this lesson gives the student the *vocabulary and the trigger recognition*; the full app-code choreography (dual-writes, the migration-by-migration walk) is chapter 099. The point for now: when the checklist flags a drop, rename, or rewriting type change, the answer is "this is an expand-contract, not a one-shot."

**Visual — a small `DiagramSequence` or a three-panel HTML strip for expand → backfill → contract.** Three phases, each showing the table's columns and which the app reads/writes. Goal: cement the three-phase shape as one picture. If `DiagramSequence` is already used above for the rename race, consider a simpler static three-column HTML `Figure` here to avoid two scrubbers back-to-back — downstream agent's call, but flag the preference for variety.

Tooltip candidates: `backfill` (writing values into a newly added column for rows that already existed), `cutover` (the instant a deploy swaps the old app version for the new).

### When a migration fails, fix forward

The recovery model. Junior instinct is "roll it back"; the senior 2026 reflex is forward-only. Correct the instinct directly.

Content:
- Down migrations: Drizzle Kit emits **`up` only** — there is no down file. State this as a fact, then the rationale: in 2026 the senior default is **forward-only** migrations. You never roll back in production; the *next* migration corrects the previous one (a **forward-fix**). A rollback would itself be a destructive operation running against data that's changed since — riskier than going forward.
- The one carve-out: `drizzle-kit drop` (named in lesson 1's command list) removes the most-recent **unapplied** migration in **dev** before re-generating — useful when you generated a file you didn't mean to and haven't run it anywhere. The production rule is absolute: **never reverse, always forward-fix.** (Restate the lesson-1 footgun: editing a migration that's been applied *anywhere* — even your laptop — drifts the snapshot from the DB; the fix is revert-the-edit + generate a corrective forward migration.)
- Mid-run failure recovery, the shape (not a procedure to memorize, a model):
  - Most failures happen *inside* the transaction → Postgres rolls the file back, `__drizzle_migrations` gets no row for it, the database is untouched. The dev fixes the SQL or the data and re-runs `migrate`.
  - The exception is anything that ran *outside* a transaction — a `CONCURRENTLY` index that built halfway then failed. Postgres leaves an **invalid** index behind (it's not rolled back because it wasn't in a transaction). Recovery: `DROP INDEX` the invalid one, fix the cause, re-create. Tie back to the `CONCURRENTLY` section — the thing that makes it safe (no transaction) is the thing that complicates its failure.
- The senior reflex, one line: **rehearse every migration's failure mode against staging before it touches production.** You should never first discover a migration locks a table when it's locking the production table.

This is prose-led; no exercise. A short `Aside` (caution) on the invalid-index recovery is appropriate.

Tooltip candidates: `__drizzle_migrations` (the table Drizzle's runner uses to track which migrations have been applied; established lesson 1, restate via `Term`).

### Shipping the migration: CI, deploy, and verifying it applied

Closes the loop from "reviewed file" to "running in production." Where the migration actually executes in a real pipeline. Keep it concrete but don't over-build — deployment pipelines at depth are Unit 20.

Content:
- The two seams:
  - **CI** runs `drizzle-kit migrate` against the **staging** Neon branch (the long-lived branch from chapter 036 L3) on every merge to `main`. Staging gets the change first; if the migration misbehaves, it misbehaves on staging.
  - The **production deploy pipeline** runs `migrate` as a **pre-deploy step**, before the new app version swaps in. Name Vercel's build-and-deploy hook as the typical seam. The ordering matters: schema migrates, *then* the new app version that depends on it goes live. (This is also why expand-contract exists — for destructive changes even "migrate then deploy" isn't enough, because the *old* version is still up during the migrate.)
- The script convention: `db:migrate:prod` in `package.json` so the command is grep-able in the pipeline (restate lesson 1's wrapper-script pattern). The **unpooled** `DATABASE_URL_UNPOOLED` is wired into the deploy env, separate from the pooled URL the app uses — restate the lesson-1 / chapter-036 rule in one line (long DDL transactions die under transaction-mode pooling), don't re-derive.
- **Verifying it applied — the production reflex.** After a deploy, query `select * from __drizzle_migrations order by created_at desc limit 5;` against the production branch. The latest row's hash should match the latest committed migration file's hash. If they don't match, the deploy applied something other than what you reviewed — **investigate before serving traffic.** This is the "trust but verify" close.

This is prose + one short `Code` block for the verification query. No exercise.

### Putting it together: review this migration PR

The capstone — the checklist practiced on a realistic PR. Placed last so it integrates every fix the lesson taught. This is the lesson's primary assessment of the durable skill.

**Exercise — `CodeReview`.** The student reviews a multi-file migration PR and leaves inline comments flagging the unsafe operations. This is the perfect component for this lesson: the skill *is* reviewing a migration diff, and the kernels map one-to-one to the checklist questions.

Construct the PR with 3-4 planted issues, each mapping to a checklist question, mixed with at least one *safe* operation (so the student must discriminate, not just flag everything):
- File `drizzle/0007_<name>.sql` (the generated migration) containing:
  - A plain `CREATE INDEX` on `invoices`, bundled with other DDL → **plant**, kernel: "index on a write-heavy table needs `CONCURRENTLY` in its own migration file or it locks writes for the whole build." (Q3)
  - An `ALTER TABLE "invoices" ADD COLUMN "..." text NOT NULL` with no default → **plant**, kernel: "`NOT NULL` with no default fails against existing rows; add nullable then backfill." (Q5)
  - A `RENAME COLUMN` (or a `DROP COLUMN` + `ADD COLUMN` pair) → **plant**, kernel: "rename-in-place breaks the deploy window; this needs expand-contract across deploys, not a one-shot rename." (Q1/Q2)
  - A safe `ADD COLUMN ... timestamptz` (nullable, no traffic concern) → **not a plant**; the decoy that proves discrimination.
  - Optionally: a `DROP COLUMN` that's genuinely fine because the column was already deprecated and unread → a judgment decoy (downstream agent's call; only include if it doesn't muddy grading).
- `<ReviewWhy>`: the overall takeaway — a reviewer who reads the SQL through the five-question lens catches all of these *before* they reach production; the schema diff alone wouldn't have shown the locks or the deploy window.

Author each `<ReviewIssue>` with a single-sentence `kernel` (the defect) and a longer slot reveal (the fix + which checklist question it answers). Count rendered lines carefully for the `line` props.

Follow the exercise with a short closing paragraph: the checklist is the senior reflex; once it's automatic, every migration PR gets a second read for locks and data loss, and the generated-SQL-is-correct-but-not-safe model is the thing to carry forward.

### External resources (optional)

A small set of `ExternalResource` cards, only if they're current and authoritative:
- Drizzle Kit docs — the `generate`/`migrate`/`push` overview and the `--> statement-breakpoint` / `CONCURRENTLY` note.
- Postgres docs on `CREATE INDEX CONCURRENTLY` (the canonical source for the lock behavior and the invalid-index recovery).
- Optionally a well-regarded write-up on zero-downtime/expand-contract migrations (forward-reference chapter 099). Only include if a current, high-quality source is found during fact-check; otherwise drop.

No `VideoCallout` planned — this is a judgment/checklist lesson, not a procedural one; a talking-head video adds little over the `CodeReview` practice. Downstream agent may add one only if a genuinely strong, current "Postgres migration safety" talk surfaces.

---

## Scope

**This lesson owns:** the push-vs-generate decision and `push`'s silent-drop failure mode; the five-question SQL review checklist (the spine); `CREATE INDEX CONCURRENTLY` + `--> statement-breakpoint`; the manual-SQL-block-at-the-bottom pattern and the schema/migration source-of-truth split; the three column-change patterns (NOT NULL no-default, rename-in-deploy, table-rewriting type change) at *shape and trigger-recognition* depth; expand-backfill-contract **named and shaped** (not the full choreography); forward-only / fix-forward and `drizzle-kit drop`'s dev-only carve-out; mid-run failure recovery shape; the CI/staging + production-deploy seam and `__drizzle_migrations` post-deploy hash verification.

**Explicitly out of scope (do not teach; reserved or already taught):**
- **The daily loop** — `drizzle.config.ts`, the `drizzle/` folder layout, the edit→generate→review→migrate→commit mechanic, `--name`, Drizzle Studio, the full CLI command list. Owned by **lesson 1**. Restate only in one-line recaps (the loop, immutability, the unpooled-URL rule).
- **Expand-backfill-contract at full depth** — the app-code dual-write logic, the migration-by-migration choreography, the read-switch cutover code. Owned by **chapter 099**. This is the most important boundary: name and shape the pattern, give the vocabulary, *do not* write the app code. State this to the writer explicitly.
- **Seeding** — `drizzle-seed`, reset-and-seed, the `db:seed` script. Owned by **lesson 3**.
- **The pooled vs. unpooled URL derivation** — owned by **chapter 036 L4**, restated as a one-liner here (already restated in lesson 1).
- **Index types / when to add an index** — owned by **chapter 039 L1**. This lesson is the *migration-file mechanic* for adding one safely (`CONCURRENTLY`), not the "which index" decision.
- **Writing the `updatedAt` trigger function / generated columns mechanics** — owned by **chapter 037 L4**. Here the trigger is only the example of the manual-SQL-block case; show *where it lives in the migration*, not how to author the trigger.
- **`ACCESS EXCLUSIVE` and lock theory, `auto_explain`** — owned by **chapter 039 L3**. Restate the lock name in one line; reference the tooling as something they already have.
- **Schema authoring** (`pgTable`, columns, relations, `casing`) — owned by **chapter 037**.
- **Production deployment pipelines at depth** (the full CI/CD, environment promotion, rollback strategy) — owned by **Unit 20**. Here, only the migration's seam in the pipeline.
- **The `migrate()` in-app programmatic function** — named in lesson 1; not re-covered here (the CLI in the deploy pipeline is this lesson's default).

**Prerequisites to restate in one line each (concise, never re-teach):** DDL = structural SQL (CREATE/ALTER/DROP); migrations run against `DATABASE_URL_UNPOOLED`; an applied migration is frozen/immutable, fix forward never edit; `ACCESS EXCLUSIVE` is the lock that blocks reads and writes; `__drizzle_migrations` tracks applied migrations.

---

## Notes for downstream agents

- **Drizzle version pinning** (from lesson 1's continuity notes — hold these, do not regress): the course targets Drizzle **0.45 / drizzle-kit 0.31**, **flat `meta/`** migration layout with the `<timestamp>_<name>.sql` + `meta/_journal.json` + `meta/<id>_snapshot.json` shape (NOT the 1.0 per-directory layout). The in-app migrator import path the course uses is `drizzle-orm/neon-serverless/migrator` (driver-specific; the generic docs show `node-postgres`). `casing: 'snake_case'` is a valid top-level config key. The index naming convention is `idx_<table>_<col>` (code standards). If fact-check surfaces a 1.0-era change, keep the 0.45 wording as primary and note the 1.0 form parenthetically — match lesson 1.
- **Fact-check corrections baked into this outline (do not revert):**
  - The `CONCURRENTLY` fix is **a dedicated migration file** (`drizzle-kit generate --custom`), because Drizzle's runner wraps each file in one transaction and `CREATE INDEX CONCURRENTLY` can't run inside one. Do **not** teach "breakpoints around CONCURRENTLY in a shared file" as the clean path — `--> statement-breakpoint` is primarily the multi-statement-per-file splitter (its documented purpose is engines that can't run several DDL per transaction), not a reliable transaction-escape for the Postgres concurrent-index case. Confirmed against Drizzle docs + issue #860.
  - `drizzle-kit generate --custom --name <name>` is the **documented** way to author hand-written SQL (triggers, extensions) — an empty migration file, not a `sql` block appended to a generated file. Confirmed against the Drizzle custom-migrations doc.
  - `generate` prompts the dev to disambiguate a rename vs. drop-and-add; `push` skips that prompt/file entirely — the silent-data-loss vector is real and current.
  - Drizzle emits **up-only** migrations; reversal = a new hand-written forward migration. Current.
  - `__drizzle_migrations` tracks applied migrations by **content hash** — the post-deploy hash-comparison verification is sound.
- **The single hardest scope line:** expand-backfill-contract is *named and shaped only*. No app-code dual-write. If the writer starts authoring the cutover logic, that's chapter 099's job.
- **Code-block shapes are mostly SQL**, not TS — `CONCURRENTLY`, `ALTER TABLE`, `CREATE TRIGGER`. Use `lang="sql"` on `AnnotatedCode` / `Code`. The pedagogically-staged migration fragments deliberately show partial / single-statement files, which diverges from "show the whole file" — that's intentional, not sloppiness.
