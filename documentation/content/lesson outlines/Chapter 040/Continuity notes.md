# Chapter 040 — Migrations and seeding

## Lesson 1 — The Drizzle Kit daily loop

**Taught** — the Drizzle Kit diff-engine model (`generate` = diff `db/schema.ts` against the latest `meta/` snapshot → numbered `.sql` + refreshed snapshot), the `drizzle.config.ts` contract, the `drizzle/` folder layout, the edit→`generate`→review→`migrate`→commit loop, naming with `--name`, the PR-review/immutability discipline, and Drizzle Studio as the dev GUI.

**Cut** — none of substance; the lesson covered the outline's scope. Studio screenshot diagram left optional/unused (no real asset).

**Debts**
- Push-vs-generate decision in depth, hand-editing emitted SQL, `CONCURRENTLY` + `--> statement-breakpoint`, column-change patterns, forward-fix/down migrations, `drop` production rule, migration-failure recovery, CI/deploy depth, `__drizzle_migrations` post-deploy verification → all promised to **lesson 2**.
- Seeding (`drizzle-seed`, reset-and-seed, `db:seed`) → **lesson 3**; Studio's "verify a seed run" forward-refs it.
- Build-time env validation (`@t3-oss/env-nextjs`) explaining the `!` non-null assertion on `process.env.DATABASE_URL_UNPOOLED` → **chapter 041 lesson 2** (named, not taught).
- Expand-backfill-contract full choreography → chapter 099.

**Terminology / decisions established**
- "Generate is a diff" is the load-bearing mental model; three-element diagram = `db/schema.ts (intent)` / `snapshot (last known state)` / Postgres cylinder.
- `DDL` defined (CREATE/ALTER/DROP) vs DML.
- Migrations use **`DATABASE_URL_UNPOOLED`** (long DDL transactions die under transaction-mode pooling); restated, not re-derived (origin: chapter 036 lesson 4).
- The migration unit = **three artifacts committed together**: the `db/schema.ts` edit, the `.sql`, the `meta/` snapshot. `meta/` is source, never gitignored.
- "Applied migration = frozen" (immutable once run/merged); fix-forward, never edit/reorder. The reviewer reads the **SQL**, not the schema diff.
- Folder layout pinned to Drizzle **0.x flat `meta/`** (sequential `0000_` prefix default), NOT the 1.0 per-directory layout. `timestamp` prefix named as opt-in alternative for merge-collision avoidance.
- In-app migrator import path is **`drizzle-orm/neon-serverless/migrator`** (NOT the `node-postgres` path the chapter outline and generic docs show — corrected here; driver-specific, course uses Neon serverless). The `migrate()` snippet passes **`dbUnpooled`** (outline showed `db`; corrected — unpooled rule holds in code too).
- `casing: 'snake_case'` is a valid top-level config key (drizzle-kit ≥0.25, under-documented) — must match the `db` client's casing.
- `drizzle-kit check` + renumber-on-conflict is the course's two-branch-collision fix.

**Patterns / best practices for the project chapter (041)**
- `drizzle.config.ts` at repo root with the exact keys shown: `dialect`, `schema: './src/db/schema.ts'`, `out: './drizzle'`, `dbCredentials.url: process.env.DATABASE_URL_UNPOOLED!`, `casing: 'snake_case'`, `verbose: true`, `strict: true`.
- `package.json` wrapper scripts: `db:generate`, `db:migrate`, `db:studio`, `db:push` (bare `drizzle-kit <cmd>`; env loaded by the runner). Starters ship these.
- Always pass `--name <verb_noun>` to `generate` for production migrations.

**Misc.**
- No live-coding widget (Drizzle Kit is a filesystem CLI; PGlite widgets can't shell out); exercises used: one `Sequence` (ship-a-change order) + one `Buckets` (daily vs recognize/deferred).
- Worked-example spine = adding `invoices.archivedAt` (`timestamp('archived_at', { withTimezone: true })` → `timestamptz`); reuse-able anchor for later lessons.
- Studio URL: `https://local.drizzle.studio`; dev-only (plaintext creds, no auth); inline edits write straight to the DB.

## Lesson 2 — Production-safe migrations

**Taught** — the load-bearing model "generated SQL is correct in form, not safe under live traffic"; the five-question review checklist (Q1 DROP, Q2 true-rename vs remove-and-add, Q3 hot-table index, Q4 table-rewriting type change, Q5 NOT NULL no default) split into two failure families (Q1-2 data loss, Q3-5 locks/downtime); push-vs-generate decision + `push`'s silent-column-drop failure mode; `CREATE INDEX CONCURRENTLY` in its own migration file; the `--custom` migration as the seam for DDL the schema can't model; the three column-change patterns (NOT NULL no-default, rename-in-deploy, table-rewriting type change) named and shaped; expand-backfill-contract named; forward-only/fix-forward recovery; CI/deploy seam + `__drizzle_migrations` post-deploy hash verification.

**Cut** — none of substance; covered the outline's scope.

**Debts**
- Expand-backfill-contract **full app-code choreography** (dual-writes, migration-by-migration cutover, read-switch) → chapter 099. This lesson only names + shapes it; the hardest scope boundary, do not author cutover code in 041.
- `cutover` term and dual-write coordination → forward-ref'd to chapter 099.
- Production deployment pipelines at depth (Vercel hooks, env promotion) → Unit 20.

**Terminology / decisions established**
- Five-question checklist is the lesson's spine; reused as the `CodeReview` capstone (planted: plain index on hot table=Q3, NOT NULL no-default=Q5, rename-in-place=Q1/Q2; plus a safe nullable `timestamptz` ADD COLUMN decoy).
- **`CONCURRENTLY` fix = its own dedicated migration file** (Drizzle wraps each file in one transaction; `CREATE INDEX CONCURRENTLY` can't run in a transaction). Generated via `drizzle-kit generate --custom --name <name>`. Do NOT teach "breakpoints around CONCURRENTLY in a shared file" — that's wrong (fact-checked, issue #860).
- `--> statement-breakpoint` = multi-statement-per-file splitter only; NOT the transaction-escape for concurrent indexes. The separate file is.
- `drizzle-kit generate --custom --name <verb_noun>` = documented seam for hand-written SQL (triggers, `CREATE EXTENSION`, custom constraints, complex generated columns, computed-`WHERE` partial uniques) → emits an empty numbered migration to fill, not a `sql\`\`` block appended to a generated file.
- **Source-of-truth split**: migration files = source of truth for *database state*; `db/schema.ts` = source of truth for *Drizzle types*. A trigger lives only in a migration; a column lives in both. Resolves "won't the next `generate` clobber my custom SQL?" — no, `generate` writes a new numbered file, never rewrites a committed one.
- expand-backfill-contract (a.k.a. expand-contract): **expand** (new shape alongside old) / **backfill** (populate existing rows, batched) / **contract** (drop old once nothing reads it); three deploys minimum for any destructive change.
- Rename-in-place is **forbidden in a live system** — the canonical "I broke prod" footgun; broken deploy window (old app queries the gone column).
- Type changes: not all dangerous — some widenings are metadata-only. Reflex is *check whether this one rewrites the table*, not fear every type change. `ACCESS EXCLUSIVE` = strongest lock, blocks reads + writes (restated from chapter 039 L3).
- **Forward-only**: Drizzle emits up-only migrations, no down file. Never reverse in production; the next migration is a forward-fix. `drizzle-kit drop` = dev-only carve-out (removes most-recent *unapplied* migration before re-generate).
- Mid-run failure: most failures roll back inside the file's transaction (no `__drizzle_migrations` row, DB untouched, re-run); the exception is `CREATE INDEX CONCURRENTLY` (outside a transaction) → leaves an **invalid index**, recovery = `DROP INDEX` + recreate.
- `__drizzle_migrations` tracks applied migrations by **content hash**; post-deploy verify with `select * from __drizzle_migrations order by created_at desc limit 5;` — latest row's hash must match latest committed file.

**Patterns / best practices for the project chapter (041)**
- Every index on a table with write traffic = `CREATE INDEX CONCURRENTLY` in its own single-statement migration file; index naming `idx_<table>_<col>`.
- NOT NULL columns added to a table with rows = nullable-then-backfill-then-`NOT NULL` (one extra migration) or ship with a `DEFAULT`.
- The `updatedAt` trigger reaches the DB via a `--custom` migration (the schema declares the column, the migration wires the trigger — owned by chapter 037 L4 for the function body).
- Production migrate run = `db:migrate:prod` package.json script, against `DATABASE_URL_UNPOOLED` (restated rule), grep-able in the pipeline.
- CI runs `migrate` against the long-lived staging Neon branch on merge to `main`; production deploy runs `migrate` as a pre-deploy step before the new app version swaps in.

**Misc.**
- Code blocks here are mostly `lang="sql"` (ALTER TABLE, CREATE INDEX, CREATE TRIGGER), not TS. Staged fragments deliberately show partial/single-statement files (intentional, not the "whole file" convention).
- Centerpiece exercise = `CodeReview` (review a migration PR); supporting: `StateMachineWalker` (push-vs-generate decision order), `CodeVariants` (naive vs `CONCURRENTLY`), bespoke lesson components `RenameCutoverRace` (the cutover-window scrubber) + `ExpandBackfillContractStrip` + `ChecklistTwoFamilies` (under `src/components/lessons/040/2/`), `Buckets` (ships-as-is vs hand-edit), `AnnotatedCode` (custom trigger migration). Build added a `VideoCallout` (Web Dev Cody, `name`→`first_name`/`last_name` expand-contract walk) despite the outline planning none.
- Running anchor table stays `invoices` (continued from lesson 1's `archivedAt` example).

## Lesson 3 — Deterministic seeding with drizzle-seed

**Taught** — the seed-script-as-function mental model `(schema, seed number) → database state`; `drizzle-seed`'s three load-bearing properties (schema-aware, deterministic, FK-aware); the minimal `seed(db, schema, { seed: 1 })` call + default 10-rows-per-table behavior + global `count`; `.refine((f) => ({...}))` per-table tuning in three rungs (`count`, `columns` generators, weighted distributions via `valuesFromArray`); FK resolution = topological insert order from `references()` plus `with` for per-parent fanout; the same-seed determinism guarantee + `version` pin; the idempotent `reset` + `seed` script; the `db:seed` package.json contract via `tsx`; and the seeder's three boundaries (tests, factories, prod).

**Cut** — none of substance; covered the outline's scope. Per-test/factory mechanics named only (owned downstream).

**Debts**
- Integration-testing patterns at depth (Vitest, per-test DB harness, `beforeEach` reset+seed) → **Unit 18 (chapters 086–087)**; this lesson names the seeder's role only.
- Test-factory pattern (`buildInvoice({...})`) at depth → **chapter 087 lesson 2** ("Factories over shared fixtures"); named as the per-test-row boundary only.
- Production one-shot "fixture" data migrations (default workspace, seed RBAC roles, system org) → **chapter 099**; named as "not the seeder's job."
- Build-time env validation explaining `process.env...!` → **chapter 041 lesson 2** (not opened here; script reads `dbUnpooled` from `db/index.ts`).
- Reaffirms lesson-1/2 debts: Drizzle Studio (L1) used to eyeball the seed run; `dbUnpooled` rule restated (chapter 036 L4).

**Terminology / decisions established**
- Mental model phrasing: "the seed script is a function of (schema, seed number) → database state."
- Two reflexes hang off determinism: (1) wrap `reset` + `seed` as one idempotent script; (2) **pin the seed number**, vary only to explore a shape then re-pin.
- **`count` is total-per-table; `with` is per-parent (multiplies)** — the #1 seeding surprise. `invoices: { count: 200 }` + `with: { lineItems: 5 }` = 1,000 line items. Spelled out explicitly.
- `reset(db, schema)` clears all rows in FK-safe order, leaves schema intact — **not a migration, not a drop**. Reset-then-seed = idempotency. Cousin of the missing-`where` `DELETE` footgun (chapter 038 L1); never point at production.
- **Generator API is function calls** (`f.email()`, `f.valuesFromArray({...})`, `f.number({minValue,maxValue,precision})`, `f.date({minDate,maxDate})`, `f.companyName()`), NOT the chapter-outline's property-access shape. ~3 dozen generators — teach by category, defer the rest to docs.
- **No `f.weightedRandom` generator exists** — weighting is built into `valuesFromArray` via `{ weight, values }` entries. (Chapter outline's `f.weightedRandom` shape is wrong; corrected.)
- `f.email()` (and `f.phoneNumber()`) are **unique by default**; other generators that must not collide take `isUnique: true`.
- **`f.uuid()` emits v4** — never put it on a UUIDv7 PK column; omit `id` from `columns` and let the schema's `$defaultFn` fill it so v7 time-ordering survives.
- `pgEnum` columns → reach for `valuesFromArray` (the seeder analog of the schema enum). `numeric` money → `f.number({ precision: 100 })` (cents), never a raw float.
- **`version: '2'`** option pins generator-logic behavior (current LTS) so a library upgrade can't silently shift "deterministic" output. Distinct from the npm package version (`drizzle-seed@0.3.x`). Bare `{ seed: 1 }` is fine for the first teaching example; the committed script pins both `seed` and `version`.
- Determinism is tied to config *shape*, not just the seed number: changing `.refine` count/column-order can shift output on the same seed — bump the seed or accept new rows.
- `Term` tooltips defined: "fixtures", "deterministic", "topological order".
- Staging note for downstream agents: minimal first example deliberately omits `version` and `.refine`; the final script adds both — intentional, not an oversight.

**Patterns / best practices for the project chapter (041)**
- Seed script lives at `scripts/seed.ts`, invoked via `"db:seed": "tsx scripts/seed.ts"` (path-alias trigger → `tsx`, not bare `node`).
- Script imports **`dbUnpooled`** (reset runs `TRUNCATE ... CASCADE`, long locks → unpooled, same rule as migrations) + `import * as schema from '@/db/schema'` (whole bag required for FK resolution).
- Shape: async `main` doing `await reset(dbUnpooled, schema)` then `await seed(dbUnpooled, schema, { seed: 1, version: '2' }).refine(...)`, then `.then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })` — explicit exit for CI gating + so the unpooled connection doesn't hang the process.
- Import grouping: external (`drizzle-seed`) then `@/` aliases.
- Production never runs `db:seed`; dev/test only.
- The chapter-041 deliverable (two orgs, 50+ invoices each with line items, weighted statuses, dates over months) is **applied in 041, not built here** — this lesson teaches the tool on the `invoices` example.

**Misc.**
- **No live-coding widget** (CLI/filesystem-shaped; PGlite can't run reset/insert against a schema bag). Exercises: `Dropdowns` (config completion: `count`/`valuesFromArray`/`precision`), `Sequence` (FK insert order, `taxRates` distractor floats free), `Buckets` (seeder vs reach-elsewhere). Visuals: `AnnotatedCode` (full invoices refine block), `Figure` wrapping a bespoke `FkThreeTierStrip` (three-tier FK strip `organizations → invoices → lineItems` with count/`with` annotations, at `src/components/lessons/040/3/fk-three-tier-strip.astro`), `TabbedContent` (same-seed vs different-seed tables, inline HTML tables), `CodeVariants` (seed-alone vs reset+seed).
- Anchor stays the three-level FK chain `organizations` (parent) → `invoices` → `lineItems` (child), continuing the chapter's `invoices` spine.
- Faker.js / Mockoon / snaplet named and dropped (out-of-stack; the seeder wins by reading the one schema).
- Closes Unit 5.
