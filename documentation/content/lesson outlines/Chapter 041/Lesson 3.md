# Lesson 3 — Authoring the schema and shipping the init migration

## Lesson title

Chapter-outline title fits. Keep: **Authoring the schema and shipping the init migration**.
Sidebar (short): **Schema and init migration**.

## Lesson type

`Implementation` — the student builds `db/schema.ts` + `db/relations.ts` against the Lesson 3 test file, generates and runs the init migration. Test-coder runs for this lesson.

## Lesson framing

The student installs the senior habit that the rest of the course rests on: the database schema is the single source of truth, authored once in TypeScript and projected into Postgres through one reviewed migration. They translate a tenant-aware invoicing model into six Drizzle tables — making FK `ON DELETE` a per-edge decision, scoping every uniqueness constraint and index to the tenant, and letting `$inferSelect` derive the row types instead of hand-writing them — then run the generate-read-migrate loop that turns the schema into committed DDL. They leave with a fresh database holding all six tables, their constraints, and the three query-justified indexes, and with the muscle memory of reading emitted SQL before it touches a database.

## Codebase state

### Entry
The starter runs locally (Lesson 1) and reads config through the typed `env` boundary (Lesson 2). Docker Postgres is up on `:5432`; the database is empty (no `drizzle/` directory yet). `src/db/schema.ts` has the six `pgTable` skeletons present but incomplete: no `pgEnum` declarations, `organizations.slug` and `users.email` lack `.unique()`, `orgMembers` lacks both `.references()`/composite `primaryKey` and uses `text()` for `role`, `customers`/`invoices`/`invoiceLines` lack FK `.references()`, `invoices.status` is `text()` with no enum/unique/check/indexes and `currency` has no default. `src/db/relations.ts` has all six `*Relations` consts stubbed as empty `({})`. The shared `timestamps` group (`db/columns.ts`), the `db`/`dbUnpooled` client (`db/index.ts`, schema+relations already wired), `drizzle.config.ts`, and the `db:generate`/`db:migrate`/`db:studio` scripts are all provided. The inspector renders with empty banners. `lib/invoices/queries.ts`, `scripts/seed.ts` are still stubs (later lessons).

### Exit
`src/db/schema.ts` declares the two `pgEnum`s and all six fully-constrained tables with `$inferSelect`/`$inferInsert` type exports; `src/db/relations.ts` declares all six `relations()` with the `createdByUser` disambiguation. `drizzle/0000_init_schema.sql` is generated and committed; `pnpm db:migrate` has run cleanly against the empty database, leaving exactly one row in `__drizzle_migrations` and all six tables (FKs, uniques, the `total >= 0` check, the three indexes) live in Postgres. A second `pnpm db:generate` reports no changes. The inspector still shows empty banners (no data yet). Seed (Lesson 4) and reads (Lessons 5–6) remain stubbed.

## Lesson sections

Implementation type. Section order per contract: Goal + Finished result (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: the six tables, their relations, and the indexes the project's reads demand land in Postgres through one reviewed migration. Then a one-paragraph description of the working result: `pnpm db:migrate` creates `organizations`, `users` (stub), `org_members`, `customers`, `invoices`, `invoice_lines` on a fresh database; every FK, unique, check, and index is visible in Studio; a second `db:generate` reports no changes. No screenshot needed (inspector still empty) — describe the Studio table list / migration success instead.

### Your mission
Coherent prose, no subsection headers, no implementation hints. Weave:

- **Feature** (user terms): the invoicing data model becomes real database structure — six tables shaped so every tenant-owned row is org-scoped, money and timestamps use the right column types, and the database itself enforces the domain (enums, uniques, the non-negative check).
- **Framing**: this is where the schema becomes the source of truth for the whole project — row types come from `$inferSelect`, never hand-written; every later query and downstream unit derives from `db/schema.ts`. Name the structural rule that outlives this project: every tenant-owned table carries `organizationId` as a NOT NULL FK; the sole exception is `users`, global across orgs and reached through the `org_members` junction.
- **Constraints** (non-functional, shape the solution): UUIDv7 PKs via `default(sql\`uuidv7()\`)` for sortable non-guessable IDs; `timestamp({ withTimezone: true })` for every timestamp, `numeric({ precision: 12, scale: 2 })` for money; named `pgEnum`s so the database enforces the domain; FK `ON DELETE` decided per edge (cascade for owned children that lose meaning without their parent, restrict for referenced entities the schema can't make sense of without — a customer must not vanish under an invoice); every uniqueness scope and index made tenant-aware, with composite index column order matching the list query's `where` + `orderBy` direction. The tooling the starter provides (`drizzle.config.ts` → unpooled URL + snake-case casing, the `db:*` scripts wrapping their tools through `dotenv-cli`) is build-on, not build.
- **Out of scope** (one line): writing the reads (Lessons 5–6) and seeding data (Lesson 4); the inspector stays empty after this lesson.
- **Traps to pre-empt**: reaching for `drizzle-kit push` even on a fresh database (the generate-and-commit loop is the muscle; push is the prototype-only escape hatch from Chapter 040), and skipping the read of the emitted SQL before migrating.

Then the **Functional requirements** numbered list (use `Checklist` with `tested`/`untested` chips). Phrase each as a verifiable outcome, never as a file/export:

1. `pnpm db:migrate` runs cleanly on the empty database and leaves exactly one row in `__drizzle_migrations`. `[tested]`
2. After migrating, all six tables exist with their FKs (each carrying the intended `ON DELETE`), tenant-scoped uniques, the `total >= 0` check, and the three named indexes. `[tested]`
3. A second `pnpm db:generate` immediately after reports no changes — the snapshot is in sync with the schema. `[untested]`
4. The two `invoices → users` edges resolve distinctly (membership vs. invoice author), so a nested read of an invoice's author and its org's members does not cross-wire. `[untested]`
5. The exported row types are derived from the schema (`$inferSelect`), so a query that selects an invoice returns the typed shape `queries.ts` and the inspector consume. `[untested]`

> Note for the test-coder: tests assert observable DB state (introspect after migrate: six tables present; FK `confdeltype` per edge — `c` cascade / `r` restrict; unique + check constraints by name; three index definitions with correct columns and `DESC` ordering; exactly one `__drizzle_migrations` row). They must NOT assert on file paths, export names, or imports. The "no changes on re-generate" and the relation-disambiguation items are `[untested]` (covered only in the reference solution); a test would need to shell out to `drizzle-kit` or probe internals.

### Coding time
One line directing the student to author `db/schema.ts` and `db/relations.ts` against the reference signatures and the tests, then `pnpm db:generate --name init_schema`, read the emitted `0000_init_schema.sql`, then `pnpm db:migrate`. Then the hidden `<details>` solution walkthrough (writer wraps in `<details>`, collapsed by default):

**`src/db/schema.ts`** — present in repo order: the two `pgEnum`s, then `organizations`, `users` (stub), `orgMembers`, `customers`, `invoices`, `invoiceLines`, built in the order FKs demand. Use **`AnnotatedCode`** on the `invoices` table specifically (the richest one) to direct focus across its parts: the three FKs with their differing `ON DELETE`, the `invoiceStatus` enum column with `.default('draft')`, `numeric(12,2)` money columns, the tenant-scoped `unique('invoices_org_number_unique')`, the `check('invoices_total_nonneg', ...)`, and the three indexes with `.desc()` ordering. The other tables can use plain **`Code`** blocks. Decision rationale (one or two sentences each, not re-teaching — link to owning lessons):
  - UUIDv7 / `timestamptz` / `numeric` / `pgEnum` choices — name them at the call site; link Chapter 037 (lessons 3, 5) rather than re-explain.
  - Per-edge `ON DELETE` rationale, named once at the `customers → invoices` / `invoices → customers` edge: cascade owned children (`org_members`, `customers`, `invoices`, `invoice_lines`), restrict referenced entities (`invoices.customerId`, `invoices.createdBy`). Link Chapter 037 lesson 6.
  - Tenant-aware uniques (`customers_org_email_unique`, `invoices_org_number_unique` both scoped on `organizationId`) and `invoice_lines_invoice_position_unique` on `(invoiceId, position)`.
  - The three indexes declared in the table's second-arg callback, column order matching the list `orderBy` (`organizationId, [status,] createdAt desc, id desc`) plus the `customerId` index for the detail join. Callout: the composite column order is verified against the live query plan in **Lesson 5 of this chapter** — flag, don't prove here.
  - The shared `timestamps` group spread (`...timestamps`) into every table.
  - Cover `[untested]` req 5: the `$inferSelect`/`$inferInsert` exports per table are the canonical row types — show the export lines, one sentence that nothing downstream hand-types rows.

**`src/db/relations.ts`** — all six `relations()` consts (per-table style with `fields`/`references`). Callout the `relationName: 'createdByUser'` tag on BOTH sides (`usersRelations.invoices` and `invoicesRelations.createdByUser`) that disambiguates the two `invoices → users` edges — covers `[untested]` req 4. Note these consts are spread into the schema object in the provided `db/index.ts` (`{ ...tables, ...relations }`), not passed as a separate option. Use plain **`Code`**; optionally a one-line note that this per-table `relations()` form is what `db.query.*` reads to resolve `with: {...}` (used in Lessons 5–6).
  - Naming note for the writer/test-coder: Units.md calls this "Relations v2" while the chapter outline says "v1"; describe it from the code as the per-table `relations()` form with `fields`/`references` and avoid asserting a version label in prose.

**Generate → read → migrate walkthrough** — brief the emitted `drizzle/0000_init_schema.sql` structure so the student knows what to look for when reading before applying: two `CREATE TYPE ... AS ENUM`, six `CREATE TABLE` (with inline PK/unique/check), then the `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE {cascade|restrict}` block, then three `CREATE INDEX ... USING btree (...)` with `DESC NULLS LAST` on the composite columns. Use **`Code`** with sql syntax showing a representative slice (the `invoices` CREATE TABLE plus its FK ALTERs and index DDL); the load-bearing detail is the `ON DELETE cascade` vs `ON DELETE restrict` distinction and the `DESC NULLS LAST` index ordering. Show the `pnpm db:generate --name init_schema` and `pnpm db:migrate` commands.

**Callouts** (use `Aside`):
  - The provided `drizzle.config.ts`: the unpooled URL drives Drizzle Kit (DDL) while the pooled URL drives the app's runtime queries; locally the same URL with `dbUnpooled` aliasing `db`. The watch-out that survives: never run long DDL against a pooled URL — the rule becomes real once Unit 20 swaps Neon in, so any future migrate/seed script reaches `dbUnpooled`.
  - The generate-and-commit loop vs. `drizzle-kit push`: link Chapter 040 lesson 1 rather than re-explaining; one line that push stays a prototype-only escape hatch.

External resources slot: appended here after the `<details>` with no header (resourcer adds later).

### Moment of truth
- Test command: `pnpm test:lesson 3`. Expected pass output: the Lesson 3 suite passes (the placeholder `describe.todo` is now real assertions) — show a green Vitest summary. Tests cover reqs 1–2.
- By-hand checklist (use `Checklist`, student ticks as they go), covering the `[untested]` reqs and the hands-on verification:
  - Drop and re-create the database, run `pnpm db:migrate`, confirm no errors and exactly one row in `__drizzle_migrations`.
  - Open `pnpm db:studio` and confirm the six tables, their FKs, the tenant uniques, the `total >= 0` check, and the three indexes.
  - Run `pnpm db:generate` again and confirm it reports no changes (req 3).
  - Read the emitted `0000_init_schema.sql` and confirm each FK's `ON DELETE`, each tenant-scoped unique, the check, and the three named indexes with `DESC` ordering.

## Scope

This lesson does not cover:
- Writing the reads (`listInvoices`, `getInvoiceDetail`) — **Lessons 5 and 6 of this chapter**.
- Seeding data; the inspector stays empty — **Lesson 4 of this chapter**.
- Proving the composite index is actually used by the planner — **Lesson 5 of this chapter** (EXPLAIN plan panel).
- The pooled/unpooled URL split becoming real with Neon and the production migrate flow — **Unit 20**.
- Re-teaching `pgTable`, column types, FK/`ON DELETE`, UNIQUE/CHECK, junction tables, Relations, `$inferSelect`, or `drizzle-kit generate`/`migrate` — owned by **Chapter 037** (lessons 2–10) and **Chapter 040** (lesson 1); link, don't re-explain.
- Authoring Zod schemas, env validation depth — **Chapter 042** and **Lesson 2 of this chapter**.
