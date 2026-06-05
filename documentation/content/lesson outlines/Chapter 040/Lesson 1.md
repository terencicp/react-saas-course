# Lesson title

- Title: The Drizzle Kit daily loop
- Sidebar label: The Drizzle Kit loop

# Lesson framing

This is lesson 1 of chapter 040 (Migrations and seeding), opening Unit 5's close. The student arrives with a working `db/schema.ts` (chapter 037) and the ability to query/mutate (chapters 038/039), but has run zero migrations — the schema has never touched a real Postgres. This lesson installs the muscle memory: edit schema → `generate` → review SQL → `migrate` → commit, plus Drizzle Studio as the dev GUI.

Core pedagogical conclusions that apply lesson-wide:

- **The senior question drives the whole lesson and must open it (implicitly, not as a heading):** a one-line change to `db/schema.ts` — how does it become a SQL file checked into the repo and applied identically to every environment? Frame this as the gap the student has right now: they can describe the schema in TypeScript but have no mechanism to make Postgres match it, and no record of how it got that way.
- **This is a mechanics lesson, but the course thesis is decisions-over-syntax.** The decisions that earn weight here: (1) migrations are checked-in, reviewed, immutable source code, not a thing the ORM does invisibly; (2) `generate` (a reviewable file) is the senior default, `push` (direct apply, no file) is named but deferred to lesson 2; (3) migrations run against the **unpooled** URL. Lead each command with why-it-exists before its flags.
- **The mental model to leave the student with:** Drizzle Kit is a *diff engine*. It compares the current `db/schema.ts` against a saved snapshot of the last known schema state (in `meta/`), and the difference becomes a numbered SQL file. The schema is the source of truth for *intent*; the migration files are the source of truth for the *database's actual history*. Once you internalize "generate = diff schema vs snapshot," the folder layout, the immutability rule, and the merge-conflict footgun all follow.
- **Cognitive-load staging:** introduce the diff-engine model with one diagram first, then the config (the contract that makes it run), then the two daily commands, then the supporting cast (Studio, the other CLI commands, scripts). Do not front-load the full CLI command table — it lands at the end as a reference once each command has context.
- **Where beginners go wrong (call these out at point of use, never bundled):** editing an already-applied/committed migration file (snapshot drifts, next `generate` produces garbage); forgetting to commit the `meta/` snapshot alongside the `.sql`; running `migrate` against the pooled URL; treating Studio's edit affordance as harmless (it writes to the real dev DB). Each watch-out lives in the section that teaches the concept it qualifies.
- **What the student should be able to do by the end:** given a schema change, run the generate→review→migrate loop, read the emitted SQL well enough to know what will run, name what gets committed, open Studio to confirm, and recite the CLI surface. Production-safety editing of that SQL is explicitly lesson 2 — this lesson builds the reflex, lesson 2 sharpens the judgment.
- **Code's role:** the lesson is config-and-CLI heavy. Real code samples: `drizzle.config.ts` (AnnotatedCode — the contract has 6 distinct parts worth pausing on), the emitted `.sql` (plain Code), the `package.json` scripts (plain Code), one `migrate()`-in-app snippet (plain Code). A worked example runs end-to-end as the spine. No live-coding widget fits — Drizzle Kit is a filesystem CLI; the PGlite-backed DrizzleCoding widget can't shell out to `generate`/`migrate`. Use non-runtime exercises (Sequence, Buckets) instead.
- **Diagrams earn their place** for the diff-engine model and the folder layout; both are abstract and benefit from a visual.

# Lesson sections

## Introduction (no heading — lesson intro prose)

Open with the concrete gap: the student has a `db/schema.ts` describing organizations, invoices, and line items, but if they pointed `db.select()` at a fresh Neon branch right now it would error — no tables exist. The schema is a description; nothing has built the database to match. And even once it's built, how does a teammate's machine, CI, and production all end up with the *same* tables, in the same way, with a record of every change? That is the migration problem, and Drizzle Kit is the tool. State the end goal: by the end you'll run the edit→generate→review→migrate loop and inspect the result in Drizzle Studio. Keep it to ~2 short paragraphs, warm and terse. Connect explicitly to Principle #2 from chapter 037 (schema is source of truth) — this lesson is *how* that truth propagates to the actual database.

## Drizzle Kit is a diff engine

Establish the mental model before any command. Drizzle Kit is a standalone CLI (lives in `devDependencies`, separate from `drizzle-orm` which is the runtime query layer — name this distinction explicitly so the student doesn't conflate them) that reads `db/schema.ts` and emits versioned SQL migration files. The senior reason it's the default in this stack: the migration tool lives in the same TypeScript codebase as the schema — no separate migration DSL, no hand-maintained SQL that drifts from the types.

The key idea: **`generate` diffs the current schema against a saved snapshot of the last known state, and the difference is a new SQL file.** This is the load-bearing sentence of the lesson; everything else is a consequence of it.

**Diagram (DiagramSequence, 4 steps).** Pedagogical goal: make the diff-and-snapshot loop concrete so the folder layout and immutability rule later feel inevitable. Each step is a simple horizontal box row (plain HTML+CSS inside DiagramStep, wrapped per the DiagramSequence card — do not wrap in Figure).
- Step 1: `db/schema.ts` (intent) and `meta/ snapshot` (last known state) side by side, identical — "in sync, no pending changes."
- Step 2: schema gains a new column (highlight it) — now schema ≠ snapshot. Caption: "you edit the schema; the snapshot is now stale."
- Step 3: `generate` runs — an arrow from the diff (schema minus snapshot) produces a new `0001_*.sql` file AND an updated snapshot. Caption: "generate diffs the two, writes the SQL, and refreshes the snapshot."
- Step 4: `migrate` runs — the `.sql` file flows into the Postgres cylinder; a `__drizzle_migrations` row appears. Caption: "migrate applies pending files to the database and records them."

This diagram is referenced back to in every later section ("recall the snapshot from step 3...").

Tooltip terms in this section: `DDL` (Data Definition Language — the `CREATE`/`ALTER`/`DROP` subset of SQL that changes structure, not rows), `devDependencies` only if not already a settled term by this point in the course (it is by Unit 5 — skip unless framing demands it).

## The drizzle.config.ts contract

This file is the contract that drives all four commands (`generate`, `migrate`, `push`, `studio`) — one config, four commands. Establish that framing first.

Show the full config with **AnnotatedCode** (the file has ~6 distinct, individually-meaningful keys — exactly the case AnnotatedCode is for; default grey is wrong, tint steps blue). The file:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
```

AnnotatedCode steps:
1. `dialect: 'postgresql'` — Drizzle Kit speaks several dialects; this pins Postgres so the emitted SQL is Postgres SQL.
2. `schema: './src/db/schema.ts'` — the input. Drizzle Kit reads *only* what this path exports; a table not exported here does not exist for migrations (callback to chapter 037 lesson 2's watch-out). Note the glob form (`'./src/db/*.ts'`) when the schema is split across files.
3. `out: './drizzle'` — the output folder for SQL files and `meta/`. Forward-reference the next section.
4. `dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! }` — the connection `migrate`/`push`/`studio` use. **This is the unpooled URL** (from chapter 036 lesson 4). Why here and not the pooled URL: migration DDL holds long transactions that don't survive PgBouncer transaction-mode pooling — full reasoning was chapter 036; restate in one sentence, don't re-derive. The `!` is a non-null assertion because env typing can't prove it's set (env validation is chapter 041 lesson 2 — name, don't teach).
5. `casing: 'snake_case'` — mirrors the same setting on the `db` client (chapter 037 lesson 2). It makes Drizzle Kit emit `created_at` for a TS `createdAt` field. Both the client and the config must agree or the generated SQL won't match what the client queries. **Downstream-agent note:** this top-level key is supported (drizzle-kit ≥0.25) but under-documented in the official config page (it's only shown under `introspect`); it is correct here — do not "fix" it by moving it.
6. `verbose: true` + `strict: true` — `verbose` prints the SQL statements Kit will run; `strict` makes `push` ask for confirmation before applying. Both are senior defaults for safety.

Watch-out (inline, at step 4): pointing `dbCredentials.url` at the pooled URL is the first footgun — long DDL gets truncated/fails under transaction-mode pooling. Always the unpooled URL.

## What lives in the drizzle folder

The `out` folder is checked-in source. Show its layout with **FileTree**:

```
- drizzle/
  - 0000_lively_punisher.sql
  - 0001_add_invoices_archived_at.sql
  - meta/
    - _journal.json     ordered list of applied migrations
    - 0000_snapshot.json
    - 0001_snapshot.json
```

Explain each: the numbered `.sql` files are the migrations (sequential `0000_`, `0001_`… prefix is the default — name that the prefix is configurable to `timestamp` for teams, see naming section). `meta/_journal.json` is the ordered ledger Drizzle Kit and the runner read to know what's next. The per-migration `*_snapshot.json` files are the saved schema states — *these* are what `generate` diffs against (callback to the diagram). 

The senior rule, stated plainly: **both the `.sql` and the `meta/` files are committed, together, in the same commit as the schema change.** Three artifacts move as one unit: the `db/schema.ts` edit, the `.sql`, the snapshot.

Watch-out (inline): leaving `meta/` out of the commit (a `.gitignore` mistake) breaks every teammate's next `generate` — their Kit diffs against a snapshot that doesn't exist and re-emits migrations that already ran. The `meta/` folder is not build output; it's source.

**Downstream-agent note on versions:** drizzle-kit's *default* prefix is `index` → sequential `0000_<word>_<word>.sql` with a top-level `meta/` directory holding `_journal.json` + per-id `*_snapshot.json`. (The conventions doc's phrasing "drizzle-kit 0.31 generates `<timestamp>_<name>.sql`" describes the opt-in `prefix: 'timestamp'`, not the default — teach the sequential default.) Drizzle 1.0 switches to per-migration directories (`drizzle/<id>_<name>/{migration.sql, snapshot.json}`, no top-level `meta/`); the course pins the 0.x flat layout — note this so the agent doesn't author the 1.0 shape.

## generate: turning a schema change into a SQL file

The daily move. `drizzle-kit generate` (run via the `db:generate` script, see scripts section): reads `db/schema.ts`, diffs it against the latest snapshot, emits a new numbered `.sql` plus an updated snapshot. Reinforce the reflex from the model: **the migration file is generated, not hand-written from scratch — but it can be edited before commit** (the hand-edits are lesson 2; here just plant that the file is editable, not sacred-on-generation).

Worked-example spine (this is the running example for the rest of the lesson): add an `archivedAt` column to the `invoices` table. Show the schema delta with a small plain Code block (just the added line in context):

```ts
export const invoices = pgTable('invoices', {
  // ...existing columns
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
```

Then the command, with `--name`:

```bash
pnpm db:generate --name add_invoices_archived_at
```

Then the emitted SQL (plain Code, sql lang):

```sql
ALTER TABLE "invoices" ADD COLUMN "archived_at" timestamptz;
```

Point out: `archivedAt` → `archived_at` (the `casing` config at work), `timestamp({ withTimezone: true })` → `timestamptz` (chapter 037's timestamp convention). The student sees the schema-to-SQL mapping concretely.

### Naming migrations with --name

`--name` makes the filename grep-able: `0001_add_invoices_archived_at.sql` instead of the random `0001_brave_phoenix.sql`. The senior reach: named migrations turn `git log -- drizzle/` into a readable changelog. The random name is fine for a throwaway example but production migrations are always named. (Tie-in: this is why sequential prefixes plus names work — `git log` on the folder reads top-to-bottom as history.)

## migrate: applying pending files to the database

`drizzle-kit migrate` (via `db:migrate`): connects to `DATABASE_URL_UNPOOLED`, applies every pending file in journal order, and records each in a `__drizzle_migrations` table the runner manages. Two properties to land:
- **Idempotent.** Running `migrate` again with nothing pending is a no-op — it checks `__drizzle_migrations`, sees everything's applied, exits. Safe to run on every deploy.
- **Ordered.** Files apply in journal order, never out of sequence.

Where it runs (the reach, stated as a progression): `pnpm db:migrate` locally after generating; CI runs it against a staging branch; the production deploy pipeline runs it against production *before* the new app version goes live. Name this seam; the depth is lesson 2 and Unit 20.

Watch-out (inline, restate from config section but in the migrate context where it bites hardest): the pooled URL trips on `migrate`'s long DDL transactions — unpooled only.

Complete the worked example: run `pnpm db:migrate`, the `archived_at` column now exists on the real table.

### The in-app migrate() function

Named for recognition, not the default. The migrator exports `migrate(db, { migrationsFolder: './drizzle' })` — the same operation, programmatic. The import path is **driver-specific**: this course uses the Neon serverless driver (chapter 036/037), so the path is `drizzle-orm/neon-serverless/migrator`, not the `node-postgres` path the generic docs show. **Downstream-agent note:** verify the exact subpath matches the driver the course's `db/index.ts` actually wires; do not copy `drizzle-orm/node-postgres/migrator` by reflex. Show a tiny snippet (plain Code):

```ts
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { db } from './db';

await migrate(db, { migrationsFolder: './drizzle' });
```

When to reach: a CI script or app-startup hook that applies migrations without spawning the CLI. Same `__drizzle_migrations` table, same journal — interchangeable with the CLI. The course's default remains the CLI in the deploy pipeline; this is the escape hatch when you need it in code.

## The migration is code: the PR review loop

This section carries the chapter's central thread for lesson 1. A schema-changing PR includes three things: the `db/schema.ts` edit, the generated `.sql`, and the `meta/` snapshot. **The reviewer reads the SQL, not the schema diff** — the SQL is what actually runs against production. State the reasoning: a one-line schema change can emit a destructive `DROP`, and the SQL is the only place that's visible. This is the moment a team catches the silent-column-drop failure mode that `push` has no review step for (full treatment lesson 2 — name the hook here).

Reinforce the immutability rule here, because it's a review-discipline rule: **once a migration file is merged, it is never edited and never re-ordered.** It's a permanent record of what ran. If it was wrong, the fix is a *new* forward migration that corrects it (forward-fix, owned in lesson 2). 

Watch-out (inline, the worst footgun in this stack — give it weight): editing an already-applied migration file — even just on your own laptop after running it once — drifts the `meta/` snapshot from the database's actual state. The next `generate` diffs against a snapshot that no longer matches reality and emits nonsense. The rule: applied migration = frozen.

**Exercise (Sequence).** Place after this section as a checkpoint on the whole loop. `instructions`: "Order the steps of shipping a schema change with Drizzle Kit." Steps in correct order:
1. Edit `db/schema.ts` to add the column
2. Run `drizzle-kit generate --name ...`
3. Review the emitted `.sql` file
4. Run `drizzle-kit migrate` against the unpooled URL
5. Commit the schema, the `.sql`, and the `meta/` snapshot together
Rationale: ordering drills the loop into procedural memory better than recall; the generate-before-review-before-migrate-before-commit sequence is exactly the reflex this lesson exists to build.

## Drizzle Studio: the in-stack dev GUI

`drizzle-kit studio` (via `db:studio`) spins up a local web UI at `https://local.drizzle.studio` that talks to whatever database is in `dbCredentials.url`. It shows tables, browses/filters/sorts rows, runs ad-hoc queries, and edits/creates/deletes rows inline. The edge over a generic SQL client: it's **schema-aware** — it reads the relations (chapter 037's `defineRelations`/relations file) and lets you traverse from an invoice to its line items by clicking, and it knows column types. Zero setup beyond `drizzle.config.ts`.

The senior framing: Studio is for *dev-database inspection* — sanity-checking a migration applied, eyeballing a query result, verifying a seed run (forward-ref lesson 3). Close the worked example here: open Studio, confirm `invoices` now has an `archived_at` column of type `timestamptz`.

**Not a production tool.** State the reason plainly: credentials sit in plaintext in `drizzle.config.ts` and the UI has no auth model — it's bound to your local machine and the dev database.

Watch-out (inline): Studio's inline row-edit writes straight to the connected database. Pointed at a shared dev branch, a careless delete is the same footgun as a `DELETE` with no `WHERE` — just behind a friendly button. Treat edits as real.

**Diagram option (optional, low priority): a single annotated Screenshot** of Studio showing the invoices table with the new column, using the `Screenshot` component (desktop variant). Only include if a real screenshot asset is available to the asset agent; otherwise skip — a fabricated screenshot is worse than none. Leave as a clearly-optional suggestion.

### Studio vs external GUI tools

Brief, decision-framed. TablePlus, pgAdmin, DataGrip, and Neon's web console all work against the same Postgres. Studio's edge: schema-aware relation traversal and zero setup. Their edge: power features (query-plan visualization — tie to chapter 039 lesson 3's EXPLAIN work, schema export, multi-tab editing). The takeaway is "pick one; the course uses Studio because it's already wired and schema-aware" — not an exhaustive comparison. Keep to a short paragraph or a tight 2-column table; do not over-invest.

## The package.json scripts

The senior shape: wrapper scripts so the team types one short command, not the full CLI invocation, and so the unpooled URL gets loaded consistently. Show plain Code:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push"
  }
}
```

Note that the env (`DATABASE_URL_UNPOOLED`) is loaded by the runner — typically the framework's env loader or `dotenv`-style wrapper; the script doesn't restate the URL. The course's project starters ship these scripts (forward-ref chapter 041). Keep this short — it's the "how the team actually invokes it" coda, and it's why every command above was shown as `pnpm db:*`.

## The Drizzle Kit commands at a glance

Now that each command has context, land the full surface as a reference table (plain markdown table). One row each:
- `generate` — emit a migration file from the schema diff (this lesson, the daily move).
- `migrate` — apply pending files to the database (this lesson).
- `push` — skip the file, apply the diff directly. Local-prototype only; the silent-drop footgun. **Owned by lesson 2.**
- `pull` — introspect an existing database into a schema file. Reach when adopting Drizzle on a database that already exists. Named for recognition.
- `studio` — the GUI (this lesson).
- `drop` — remove a migration from the journal. Dev-only for an unapplied migration; **the production rule against it is lesson 2.**
- `check` — lint the migration history for collisions (two branches each added a migration). See the merge-conflict watch-out below.

### When two branches each add a migration

The team-scale failure this lesson must name (it's the consequence of sequential numbering). Two PRs both branch from `0005`, each generates a `0006_*.sql`. At merge, the journal has two `0006`s — a conflict. `drizzle-kit check` flags it. The senior fix: the second-merged branch renumbers — delete its `0006`, re-`generate` so it becomes `0007` on top of the now-merged `0006`. Mention `migrations: { prefix: 'timestamp' }` as the structural alternative some teams adopt to sidestep numeric collisions (timestamps rarely collide), but the course default is sequential + `check` + renumber. Keep this tight; it's a known pain point worth naming but not a deep-dive.

**Exercise (Buckets, optional — include if section budget allows).** Two buckets: "This lesson's daily loop" vs "Named for recognition / owned later." Items: `generate`, `migrate`, `studio` → daily loop; `push`, `pull`, `drop`, `check`, `migrate()` in-app → recognition/later. Goal: cement which commands are the everyday reflex versus the situational/deferred ones, reinforcing the lesson's scope boundaries. If the Sequence exercise above is judged sufficient, drop this to avoid exercise fatigue — author's call.

## External resources (optional)

Up to 2 `ExternalResource` cards: Drizzle Kit migrations overview (orm.drizzle.team/docs/kit-overview) and the `drizzle-kit studio` docs page. Only the official docs; no third-party tutorials.

# Scope

**Prerequisites the student already has (redefine in one sentence max, do not re-teach):**
- `db/schema.ts` with `pgTable`, columns, types, `casing: 'snake_case'` on the client, and the relations file — all chapter 037.
- The pooled vs unpooled URL decision and `DATABASE_URL_UNPOOLED` — chapter 036 lesson 4. This lesson *uses* the unpooled URL and restates the one-sentence reason (long DDL transactions); it does not re-derive PgBouncer transaction-mode pooling.
- Querying/mutating with the `db` client — chapters 038/039.
- The `db` client wiring itself (`db/index.ts`, `drizzle-orm/neon-*`) — chapter 037. Drizzle Kit is a *separate* CLI tool; make that distinction but don't re-teach the client.

**Explicitly out of scope (defer, name the owner):**
- The push-vs-generate decision in depth, hand-editing emitted SQL, `CREATE INDEX CONCURRENTLY`, `--> statement-breakpoint`, the column-change patterns that bite, expand-backfill-contract, down migrations / forward-fix at depth, the `drop` production rule, migration-failure recovery, the CI/deploy pipeline at depth, post-deploy verification of `__drizzle_migrations` — **all lesson 2 of chapter 040.** This lesson may *name* these as hooks (the file is editable, forward-fix exists, push has a failure mode) but teaches none of them.
- Seeding with `drizzle-seed`, the reset-and-seed script, `db:seed` — **lesson 3 of chapter 040.** Studio's "verify a seed run" use forward-refs it without teaching it.
- Expand-backfill-contract full choreography with app-code dual-writes — chapter 099.
- Type-safe env validation (`@t3-oss/env-nextjs`, the `!` on `process.env`) — chapter 041 lesson 2. Name why the `!` is there; don't teach the validator.
- Schema authoring (`pgTable`, columns, relations, constraints, indexes) — chapter 037. The worked example adds one trivial column; it does not teach column design.
- Index types and *when* to add an index — chapter 039 lesson 1. This lesson's index mentions are about the migration mechanic only (and indexes proper are lesson 2's `CONCURRENTLY` topic).
- Production deployment pipelines at depth — Unit 20.

# Notes for downstream agents

- No live-coding widget is appropriate: Drizzle Kit is a filesystem CLI and the PGlite-backed `DrizzleCoding`/`SQLCoding` widgets can't run `generate`/`migrate`. Use the non-runtime exercises specified (Sequence, optional Buckets). Do not attempt to fake a CLI in a code widget.
- Version-sensitive claims verified June 2026: default migration prefix is `index` (sequential `0000_`); `casing: 'snake_case'` is a valid top-level `drizzle.config.ts` key (drizzle-kit ≥0.25, under-documented officially); Studio URL is `https://local.drizzle.studio`. The course pins Drizzle 0.x's flat `meta/` migration layout, not the 1.0 per-directory layout. If a future agent sees the conventions doc say "timestamp prefix is the default," treat that as the opt-in, not the default — teach sequential.
- The `db` client's two exports are `db` (pooled) and `dbUnpooled` per the code-conventions doc; the migration config reaches the unpooled connection via `DATABASE_URL_UNPOOLED` directly in `dbCredentials.url`, not by importing `dbUnpooled`.
