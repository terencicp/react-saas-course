# Chapter 041 — Schema as source of truth with Drizzle

## Chapter framing

Chapter 041 turns the relational model from chapter 040 into a Drizzle schema file, the artifact the rest of the course derives from. By the end the student writes a `db/schema.ts` for a small SaaS domain — organizations, invoices, line items, tags — with the right columns, the right types, the right constraints, and the right relationship graph; runs no migrations yet (Chapter 044 owns Drizzle Kit); writes no queries yet (Chapter 042 owns the data-access surface); and can hand the file's `$inferSelect` types to a Server Component, a Server Action, or a Zod schema (Unit 7) without restating the shape. The chapter installs Architectural Principle #2 — the schema is the source of truth — at lesson one and cashes it in at the last teaching lesson when the inferred types replace every hand-written row interface in the codebase.

Threads that run through every lesson: Drizzle is the only data-access layer the course teaches; `db/schema.ts` is the single source of truth — column names, types, defaults, and constraints flow from this file into migrations (chapter 044), queries (chapter 042), Zod via drizzle-zod (lesson 8 of chapter 046), and RLS (chapter 060); TS camelCase maps to SQL snake_case via Drizzle's `casing: 'snake_case'` config; `timestamptz` with `defaultNow()` is the only timestamp type; UUIDv7 via Postgres 18's built-in `uuidv7()` is the default PK for user-facing entities, `bigint generatedAlwaysAsIdentity` is the reach for high-volume internal tables; FKs declared column-level via `references(() => other.id, { onDelete: 'cascade' })`, with the cascade rule a deliberate per-relationship decision; NOT NULL is the senior default, nullability is opt-in; the Drizzle Relations v2 API (`defineRelations`) sits next to the schema, separate from FK declaration, and feeds the relational query API in lesson 3 of chapter 042; `$inferSelect` / `$inferInsert` are the canonical row types — a hand-typed `Invoice` interface is the smell that says Principle #2 was skipped. The chapter ships ten teaching lessons plus a quiz, ordered by dependency: principle, schema file anatomy, types, column modifiers, primary keys, foreign keys, constraints, junction tables, the relations API, and inferred types.

---

## Lesson 1 — Principle #2: schema is the source of truth

Establishes Architectural Principle #2 by naming `db/schema.ts` as the canonical root from which row types, insert types, Zod validators, form fields, and RLS column names all derive.

Topics to cover:

- **The senior question.** When the same row shape appears in five places — Drizzle insert, Server Action args, Zod validator, form field set, Server Component prop — which one is canonical and which four derive? Answer: `db/schema.ts` is the root, every other shape is generated, hand-written restatements drift.
- **Principle #2 stated.** The schema is the source of truth for every typed shape downstream. Row types from `$inferSelect`; insert types from `$inferInsert`; Zod validators from drizzle-zod (lesson 8 of chapter 046); form field sets from the same Zod; RLS policies (chapter 060) reference the same column names. One file changes, every downstream layer's type checker catches the drift.
- **What the principle prevents.** The four-way drift: column renamed in Postgres, migration applied, Drizzle schema updated — but a hand-typed `Invoice` interface in `lib/types.ts` left stale; Server Action accepts a payload Drizzle no longer maps; form posts a field Zod doesn't know about; production 500s on next deploy.
- **Where the principle bites later.** Named ahead, not taught: chapter 042 queries return `$inferSelect` types; lesson 8 of chapter 046 drizzle-zod turns schema into Zod; chapter 047 Server Actions parse with that Zod; chapter 051 forms read the Zod; chapter 060 RLS reads column names; 16 API contracts derive from the schema.
- **The carve-out.** Two legitimate divergences: external API DTOs (Chapter 16) — a public shape intentionally narrower than the row; derived view shapes (a "dashboard summary") — built from `$inferSelect` pieces, not hand-typed. Named so the student doesn't read the principle as "never write a type."
- **The order of operations.** Change the column in `db/schema.ts` first; generate the migration (lesson 1 of chapter 044); the type checker walks the codebase and surfaces every consumer; ship.
- **Watch-outs:** hand-typed row interfaces rot silently; `as any` to bridge a stale type and a new schema amplifies the bug; copying a Zod schema's field list from Drizzle instead of generating via drizzle-zod is the same drift in slow motion.

What this lesson does not cover:

- The `pgTable` API surface and the schema file's anatomy — lesson 2 of chapter 041.
- drizzle-zod and the schema-to-Zod pipeline — lesson 8 of chapter 046.
- `$inferSelect` / `$inferInsert` mechanics — lesson 10 of chapter 041.
- RLS policies reading the schema — Chapter 060.
- Public API DTOs and the carve-out at depth — Chapter 16.

Estimated student time: 20 to 25 minutes. Short by design; this is a principle lesson, not a mechanics lesson. Load-bearing for every later lesson in the chapter and for Chapters 7, 10, and 16.

---

## Lesson 2 — pgTable and the snake_case bridge

Introduces the `db/` folder layout, the minimal `pgTable` call, column builders, and the `casing: 'snake_case'` config that maps TS camelCase to SQL snake_case.

Topics to cover:

- **The senior question.** Given an empty `db/schema.ts`, what does the smallest valid table look like and what casing convention bridges TS and Postgres? The lesson establishes the file's shape, the `pgTable` call, and the `casing: 'snake_case'` config that maps TS camelCase to SQL snake_case automatically.
- **The `db/` folder layout.** `db/schema.ts` for tables, `db/relations.ts` for the Relations v2 declarations (lesson 9 of chapter 041), `db/index.ts` for the `db` client (wired in chapter 044 setup). Lives at project root — schema is shared by every feature.
- **`pgTable` — the signature.** `pgTable(name, columns)`: `name` is the SQL table name (snake_case, plural), `columns` maps camelCase TS properties to column builders. The exported `const` is what queries import.
- **The minimal table.** A four-line `organizations` with an `id` and a `name text` — the smallest thing that runs before any modifier or relationship enters.
- **Column builders.** Each Postgres type has a builder from `drizzle-orm/pg-core` (`text`, `integer`, `boolean`, …). The first argument (SQL column name) is optional when `casing: 'snake_case'` is set. Modifiers chain: `.notNull()`, `.default(…)`, `.primaryKey()`, `.references(…)` — each owned later.
- **The `casing` config.** `drizzle({ casing: 'snake_case' })` wired once in `db/index.ts` (foreshadowed). TS `createdAt` becomes SQL `created_at`; queries read `users.createdAt` in TS and emit `users.created_at` in SQL. Without it, the student types snake_case strings in every builder or pollutes the database with camelCase column names.
- **The `logger` option.** `drizzle({ casing, logger: true })` is the opt-in flag that logs every emitted SQL statement to stdout — invaluable for N+1 diagnosis (lesson 2 of chapter 043) and the EXPLAIN-copy reflex (lesson 3 of chapter 043); off by default, dev-only.
- **Naming convention for tables.** Plural snake_case (`organizations`, `invoice_line_items`); the exported `const` matches.
- **Where the file's exports flow.** `db/schema.ts` exports tables; `db/relations.ts` imports them; `db/index.ts` re-exports as a namespace for the Drizzle client; Drizzle Kit (lesson 1 of chapter 044) reads the file for migrations; drizzle-zod (lesson 8 of chapter 046) reads the same exports.
- **Schema namespaces named, dropped.** Postgres `SCHEMA` qualifier maps to Drizzle's `pgSchema('marketing')` for multi-schema setups; the course pins everything to `public`.
- **Watch-outs:** mixing the SQL-name argument with `casing` config silently drifts between tables — pick one; bare `text()` is nullable (lesson 4 of chapter 041 fixes the default); Drizzle Kit treats the schema file as input — unexported tables do not exist for migrations.

What this lesson does not cover:

- Specific Postgres data types and which to reach for — lesson 3 of chapter 041.
- Column modifiers (`.notNull()`, `.default()`, generated columns) — lesson 4 of chapter 041.
- Primary keys, foreign keys, unique/check constraints — Lessons lesson 5 of chapter 041–lesson 7 of chapter 041.
- Many-to-many junction tables — lesson 8 of chapter 041.
- The Relations v2 API — lesson 9 of chapter 041.
- The `db` client wiring, `drizzle({ casing })`, `db/index.ts` — Chapter 044 setup walkthrough.
- Drizzle Kit migrations from the schema — lesson 1 of chapter 044.

Estimated student time: 35 to 45 minutes. Load-bearing for every later lesson in the chapter.

---

## Lesson 3 — Postgres data types, the 2026 subset

Surveys the durable `pg-core` types — `text`, `numeric` for money, `timestamptz`, `uuid`, `jsonb` with `$type<…>`, `pgEnum`, arrays — with a "reach for it when" rule per type.

Topics to cover:

- **The senior question.** For each column in the domain — names, prices, timestamps, IDs, enums, payloads — what Postgres type is correct and which Drizzle builder maps to it? Reference/survey of the durable `pg-core` subset for 2026, with a "reach for it when" line per type.
- **Text and strings.** `text` is the default — variable-length, no length cap, identical performance to `varchar(n)` in Postgres. Length limits belong in Zod, not the column. `varchar(n)` and `char(n)` named once; never the right answer.
- **Numbers — the four-way decision.** `integer` (32-bit) for counts and small IDs; `bigint` (64-bit) for IDs past 2 billion, counters, Unix ms; `numeric(precision, scale)` for money and any value where binary rounding corrupts the answer — the only safe currency type; `real` / `double precision` named once for analytics. Course default for prices: `numeric(12, 2)`.
- **Boolean.** `boolean`. Senior reach: two booleans over a three-state enum when meanings are orthogonal; enum when states are mutually exclusive.
- **Timestamps — `timestamptz` only.** `timestamp('createdAt', { withTimezone: true })` maps to Postgres `timestamptz` — stores UTC, converts on I/O. `timestamp` without `withTimezone` is never the right answer. Narrow exception: a recurring local time-of-day ("opens at 9am local") — store as `time` plus a separate `timezone` text column. `.defaultNow()` on `createdAt`; every SaaS table carries `createdAt`/`updatedAt` (reusable-columns pattern in lesson 4 of chapter 041).
- **Date and time-only.** `date` for calendar dates (birthdate, billing date). `time` and `interval` named once.
- **UUID.** `uuid` for surrogate keys; `.defaultRandom()` generates UUIDv4, Postgres 18's `uuidv7()` is the senior reach for time-sortable keys (lesson 5 of chapter 041 owns the decision). Drizzle maps `uuid` to a string.
- **JSON — `jsonb` only.** `jsonb('payload').$type<WebhookEvent>()` for structured data that's still indexable. `$type<…>` tells Drizzle the TS shape; Zod still validates on the way in. `json` (non-binary) named once; never the right answer. Reach for `jsonb` when: third-party webhook bodies, audit-log details, flexible metadata. Skip when: anything you'd filter or sort on — promote those to real columns.
- **Enums via `pgEnum`.** `pgEnum('invoice_status', ['draft', 'sent', 'paid', 'void'])` returns a Postgres enum type and a Drizzle column builder. Reach when: small, stable, mutually-exclusive states. Use a lookup table when the set grows, rows need metadata, or it's user-editable.
- **Arrays.** `text('tags').array()` for a small ordered list of primitives where a junction table would be overkill. Watch-out: arrays can't be foreign-keyed; the moment you'd join, switch to a junction table.
- **Geographic, full-text, binary — named, deferred.** `point`/`polygon`/`geography` (PostGIS, out of scope); `tsvector` + generated columns (lesson 8 of chapter 042); `bytea` (the course stores binary in R2, keeps a URL).
- **Network addresses — `inet`.** `inet('actor_ip')` maps to Postgres `inet` for IPv4/IPv6 addresses; the right reach for audit-log actor IPs and request-origin columns. Indexed and queryable as a real network type rather than a `text` column.
- **Per-column defaults — the lookup.** Names: `text`. IDs: `uuid` + `uuidv7()`. Money: `numeric(12, 2)`. Counts: `integer`. Timestamps: `timestamp({ withTimezone: true }).defaultNow().notNull()`. Status: `pgEnum`. Flexible payloads: `jsonb` with `$type<…>`.
- **Watch-outs:** `varchar(n)` is a Postgres anti-pattern dressed up as type safety; `timestamp` without `withTimezone` is the most common Drizzle timezone bug; `numeric` arrives in TS as a string for arbitrary precision — money math handles that boundary; `jsonb` filter predicates that proliferate are a normalization debt; `pgEnum` values are easy to add but painful to remove.

What this lesson does not cover:

- Column modifiers (`.notNull()`, `.default()`, generated columns) — lesson 4 of chapter 041.
- Primary keys and the UUIDv7 vs. bigserial decision at depth — lesson 5 of chapter 041.
- `jsonb` query syntax (`->`, `->>`, `@>`) — lesson 9 of chapter 042.
- Full-text search columns — lesson 8 of chapter 042.
- Zod validation of payload shapes at the boundary — Chapter 046.
- Object storage for binary — Chapter 14.

Estimated student time: 45 to 55 minutes. Load-bearing for every column the student writes in this chapter, in chapter 045's project, and in every later schema.

---

## Lesson 4 — NOT NULL, defaults, and generated columns

Teaches the three per-column decisions — nullability, defaults (`.default`, `.defaultNow`, `.$defaultFn`, `$onUpdate`), and `generatedAlwaysAs` — plus the reusable-columns pattern.

Topics to cover:

- **The senior question.** Every column needs three decisions: can it be null, does it carry a default, is it derived? The lesson covers `.notNull()`, `.default(…)` / `.defaultNow()` / `.$defaultFn(…)`, and `.generatedAlwaysAs(…)`.
- **NOT NULL is the senior default.** `.notNull()` on every column unless "this fact is genuinely unknown" applies. Without it, `text()` is nullable and `string | null` propagates downstream — every read site pays the narrowing cost. Rule: type the absence (a `deletedAt` that's null on live rows) only when "absent" is a meaningful state.
- **The Zod boundary parallel.** Same default at the validation layer (chapter 046) — `.optional()` is opt-in. drizzle-zod (lesson 8 of chapter 046) reads NOT NULL from the schema and emits the matching required/optional Zod field.
- **DEFAULT — three forms.** `.default(literal)` for a constant (`status` defaulting to `'draft'`); `.defaultNow()` for `timestamptz` where Postgres fills `now()` (canonical for `createdAt`); `.$defaultFn(() => …)` for application-side defaults computed in TS. The first two emit SQL `DEFAULT` clauses; `.$defaultFn(…)` runs in the Drizzle client before insert and is invisible to direct SQL.
- **`.$defaultFn(…)` vs. `.default(…)`.** App-side when the value needs TS code (UUIDv7 generator, slug from another field). SQL-side when Postgres can compute it. Senior reach: prefer SQL-side — they apply to migrations, psql, and any tool bypassing the app.
- **The `updatedAt` pattern.** `timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date())`. `$onUpdate` runs at the Drizzle layer — direct SQL bypasses it. Prod-grade reach: a Postgres trigger (named once; chapter 044 setup adds it as a one-time migration).
- **Reusable columns pattern.** Every table carries `id`, `createdAt`, `updatedAt`, often `deletedAt`. Define once in `db/columns.ts` and spread into each `pgTable`. Removes repetition across 30 tables and centralizes the choice.
- **Generated columns — `.generatedAlwaysAs(…)`.** A column Postgres computes from other columns. `STORED` (persisted, indexable, costs disk) is the production default; `VIRTUAL` (Postgres 18, computed on read) is named but newer. Senior reaches: lowercased email for case-insensitive uniqueness; `tsvector` for full-text (lesson 8 of chapter 042); derived totals. Trade-off: read-only — inserts can't supply it; updating inputs recomputes.
- **Worked example — case-insensitive email.** `email text not null` plus `emailLowercased text generatedAlwaysAs(sql\`lower(email)\`)`. A unique index on `emailLowercased` (lesson 7 of chapter 041) enforces case-insensitive uniqueness without application code.
- **Watch-outs:** nullable columns proliferate narrowing across the codebase; `.defaultNow()` is correct only on `timestamptz` — on plain `timestamp` it stores server-local time and the bug hides until a region changes; `.$defaultFn(…)` does not run when raw SQL bypasses Drizzle; generated columns can't be inserted (`$inferInsert` knows; raw inserts will reject); STORED generated columns recompute on every input update.

What this lesson does not cover:

- Primary-key generation specifically — lesson 5 of chapter 041.
- Foreign keys and cascade — lesson 6 of chapter 041.
- UNIQUE indexes that pair with generated columns — lesson 7 of chapter 041.
- `$inferInsert` type behavior with defaults and generated columns — lesson 10 of chapter 041.
- Postgres triggers for `updatedAt` — Chapter 044 setup mentions, not in this chapter.
- Full-text `tsvector` generated columns — lesson 8 of chapter 042.

Estimated student time: 40 to 50 minutes. Load-bearing for every table in the chapter.

---

## Lesson 5 — Primary keys: UUIDv7 and identity bigint

Lands the surrogate-key decision tree — UUIDv7 for user-facing entities, `bigint generatedAlwaysAsIdentity` for high-volume internals, natural keys only for immutable external identifiers.

Topics to cover:

- **The senior question.** Which primary-key strategy does a 2026 SaaS pick for each table — user-visible IDs, internal join tables, high-volume logs? The lesson lands on UUIDv7 for user-facing entities, `bigint generatedAlwaysAsIdentity` for high-volume internal, and the narrow natural-key carve-out.
- **Primary keys, restated.** A column (or composite) that uniquely identifies a row; Postgres enforces uniqueness and indexes it for free; every foreign key points at one. Declared with `.primaryKey()`.
- **Surrogate vs. natural.** Surrogate: a meaningless ID the database mints (UUID, bigint). Natural: a domain value (email, slug, ISO-3166 code). Default is surrogate everywhere user-facing; naturals only for genuinely immutable, externally-defined identifiers (country codes, ISBN). Reason: domain values change — an email rotates, a slug is renamed — and a changing PK cascades through every FK.
- **UUIDv4 vs. UUIDv7.** v4 is fully random — terrible B-tree locality, write amplification climbs with table size. v7 prefixes a millisecond timestamp — inserts go to the end of the index like a sequence, matching `bigserial` behavior. RFC 9562 standardized v7 in May 2024; Postgres 18 (September 2025) ships native `uuidv7()`. Course default: `uuid('id').primaryKey().default(sql\`uuidv7()\`)`.
- **`bigint generatedAlwaysAsIdentity` — the high-volume reach.** Modern SQL standard, replaces legacy `bigserial`. Smaller (8 vs. 16 bytes), faster on B-tree. Reach when: high-volume internal table (event log, analytics, junction), no system-boundary ID exposure, no sharding on the roadmap. Shape: `bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`.
- **The decision tree.** User-facing ID in URLs or API responses → UUIDv7. High-volume internal nobody sees by ID → `bigint identity`. Externally-defined immutable domain key → natural PK.
- **Composite primary keys.** Junction tables and only them: `primaryKey({ columns: [t.invoiceId, t.tagId] })` in `pgTable`'s third argument. Full pattern in lesson 8 of chapter 041; mechanic introduced here so the next two lessons can use it.
- **What `.primaryKey()` does for free.** Implicit NOT NULL, UNIQUE, and INDEX. Never add a separate unique index on a PK column.
- **UUID exposure as a side benefit.** Sequential integer IDs leak business volume (`/invoices/47` tells a competitor your count); UUIDs don't.
- **Watch-outs:** UUIDv4 as a PK is a write-amplification trap that compounds with table size — choose v7 from day one; `bigserial` still works but `generatedAlwaysAsIdentity` is the modern shape; sequence-based IDs leak counts; mutable natural keys (email, slug) cascade pain through every FK — the rule is "would I be comfortable if this value changed?"; composite PKs belong on junction tables and almost nowhere else — `(orgId, slug)` as an entity's PK is a tenancy-modeling smell, use surrogate `id` plus unique constraint.

What this lesson does not cover:

- Foreign keys, `references()`, and cascade — lesson 6 of chapter 041.
- UNIQUE constraints that aren't primary keys — lesson 7 of chapter 041.
- Junction tables at depth — lesson 8 of chapter 041.
- The `db.transaction` shape for monotonic ID assignment — lesson 4 of chapter 043.
- Snowflake / KSUID / ULID variants — named once for recognition, not taught.

Estimated student time: 35 to 45 minutes. Load-bearing for the project schema in chapter 045 and every later table the student creates.

---

## Lesson 6 — Foreign keys and ON DELETE

Covers `.references(() => other.id, { onDelete })` and the four-way cascade/set null/restrict/set default decision per relationship, plus the hard-delete vs. soft-delete split.

Topics to cover:

- **The senior question.** When a parent row goes away — an org deleted, a user offboarded, an invoice voided — what happens to its children? The lesson teaches the four-way `onDelete` decision (`CASCADE`, `SET NULL`, `SET DEFAULT`, `RESTRICT`/`NO ACTION`).
- **Declaring a foreign key.** Column-level: `organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' })`. The callback form avoids circular-import traps. Multi-column FKs use table-level `foreignKey(...)` — rare, named for recognition.
- **What an FK buys.** Postgres rejects writes pointing at a non-existent parent; column types must match the PK type exactly; an index on the FK column is not automatic (lesson 1 of chapter 043 owns indexing).
- **The four `onDelete` behaviors.**
  - `CASCADE` — child has no meaning without parent (line items, junction rows). Ownership relationships.
  - `SET NULL` — relationship is optional, orphaning is desired (assignee on a task). Requires the column to be nullable.
  - `RESTRICT` / `NO ACTION` — parent must not be deleted while children exist (a customer with invoices). Postgres default when no clause is given.
  - `SET DEFAULT` — named once; rarely worth the wiring.
- **`onUpdate`.** Almost always unused — PKs are immutable in this course (UUIDv7, bigint identity), so `onUpdate` never fires. Named once for natural-key edge cases.
- **Hard-delete vs. soft-delete.** Cascade assumes hard delete. Many SaaS domains soft-delete with a `deletedAt` column and queries filter tombstoned rows. Course teaches both: cascade for genuinely scrubbing relationships (tenant offboarding); soft-delete for everything else. Per-table decision; full pattern in chapter 043.
- **Orphan prevention.** FKs reject dangling references at the database boundary — the safety net that lets app code stay clean.
- **Worked example — invoices' four relationships.** `invoices.organizationId` → `organizations.id` (`restrict`); `invoice_line_items.invoiceId` → `invoices.id` (`cascade`); `invoices.createdById` → `users.id` (`set null`); `invoice_tags.*` (cascade on both — lesson 8 of chapter 041 owns).
- **Multi-tenancy foreshadowed.** Every tenant-owned table carries an `organizationId` FK with `restrict`; tenancy enforcement at the query layer is Chapter 10.
- **Watch-outs:** missing `onDelete` means `NO ACTION` — the app handles cleanup every time, in every code path; cascade can wipe more than expected when relationship graphs branch — model first; missing FK indexes make cascade deletes table scans (lesson 1 of chapter 043); circular FKs need deferrable constraints — the course breaks cycles by structure instead.

What this lesson does not cover:

- UNIQUE and CHECK constraints — lesson 7 of chapter 041.
- Junction tables (the canonical many-to-many shape) — lesson 8 of chapter 041.
- Indexing foreign-key columns — lesson 1 of chapter 043.
- The Drizzle Relations v2 API (separate from `references()`) — lesson 9 of chapter 041.
- Soft-delete patterns and `deletedAt` filtering at depth — Chapter 043.
- Multi-tenancy scoping with `organizationId` — Chapter 10.

Estimated student time: 40 to 50 minutes. Load-bearing for the project schema in chapter 045 and every later table that has a parent.

---

## Lesson 7 — UNIQUE and CHECK constraints

Pushes invariants into the database with single-column, composite, partial, and case-insensitive UNIQUE constraints plus `CHECK` predicates as the safety net Zod can't replace.

Topics to cover:

- **The senior question.** Beyond primary keys, what invariants does the senior push into the database instead of relying on app code? The lesson covers `UNIQUE` (single-column, composite, partial, case-insensitive) and `CHECK` (predicate constraints).
- **The principle.** A database constraint can't be accidentally skipped. Application-side checks (Zod, custom validators) hold only on the path that runs them — a raw SQL migration, a third-party tool, or a future code path that forgets, will violate silently. The database is the last line.
- **`UNIQUE` — single-column.** Column-level `.unique()` adds the constraint and an auto-named unique index. Optional name argument: `.unique('slug_unique')` — name explicitly once the schema settles.
- **`UNIQUE` — composite.** Table-level third argument: `unique('org_slug_unique').on(t.organizationId, t.slug)`. Canonical use: "slug unique within an organization."
- **Partial unique indexes — `.where(…)`.** `uniqueIndex(...).on(...).where(sql\`…\`)` enforces uniqueness only for rows matching a predicate. Canonical use: "one primary contact per org where `isPrimary = true`." This is technically a unique index (lesson 1 of chapter 043 owns indexes), not a `UNIQUE` constraint — same correctness.
- **Case-insensitive uniqueness — generated-column pattern.** `emailLowercased` as STORED generated column (lesson 4 of chapter 041), then `.unique()` on it. Cleaner than `LOWER(email)` expression indexes; emits a real column the app can read.
- **`CHECK` — the predicate constraint.** Table-level `check('positive_total', sql\`${t.total} > 0\`)`. Reaches: monetary positivity, date ordering (`endDate >= startDate`), array length bounds. (Enum-like text values: prefer `pgEnum`.)
- **Drizzle Kit `CHECK` support.** Generated automatically in current pinned versions; older Drizzle Kit needs a hand-written `ALTER TABLE` in the migration. Course's pins support it.
- **The Zod parallel.** Length caps, ranges, regex — Zod (chapter 046) catches them at the API boundary with friendly errors; database `CHECK` catches them if Zod is bypassed. Both correct: database is the safety net, Zod is the user experience. drizzle-zod does not generate Zod from `CHECK` — that's hand-wired.
- **What these are not for.** Cross-row invariants ("revenue per org under quota") — application logic plus a transaction (lesson 4 of chapter 043); not constraints. Multi-table predicates — same.
- **Watch-outs:** unnamed `.unique()` produces auto-names that are stable only while column names are stable — name them explicitly once the schema settles; composite uniques on nullable columns surprise — `NULL ≠ NULL` in SQL, so multiple `(orgId, NULL)` rows pass; `CHECK` runs on every write — keep expressions cheap; constraint-violation errors surface with the constraint name in the message — name them well so action-boundary error handling can map cleanly.

What this lesson does not cover:

- Many-to-many junction tables and their composite primary keys (which double as uniques) — lesson 8 of chapter 041.
- The Drizzle Relations v2 API — lesson 9 of chapter 041.
- Index strategy beyond what unique constraints add for free — lesson 1 of chapter 043.
- Transactions for cross-row invariants — lesson 4 of chapter 043.
- Zod refinement at the API boundary — Chapter 046.
- Error catching at the Server Action layer when a constraint fires — Chapter 047.

Estimated student time: 35 to 45 minutes. Load-bearing for the project schema in chapter 045 and every later table with multi-column invariants.

---

## Lesson 8 — Many-to-many junction tables

Models N:M with two FKs and a composite PK, names the junction-vs-entity trigger, and shows the promotion path when the relationship grows metadata.

Topics to cover:

- **The senior question.** When an invoice carries many tags and a tag applies to many invoices, what does that look like in tables? The junction-table pattern — two FKs with a composite PK — is the only correct shape for N:M, and metadata on the junction is the upgrade path to a first-class entity.
- **The shape.** Two parents (`invoices`, `tags`). One junction (`invoice_tags`) with two FK columns; composite PK on `(invoiceId, tagId)`; both FKs `onDelete: 'cascade'` — junction rows depend entirely on both endpoints.
- **Composite PK in Drizzle.** Table-level third argument: `(t) => [primaryKey({ columns: [t.invoiceId, t.tagId] })]`. Replaces individual `.primaryKey()` calls; supplies the implicit unique-and-indexed pair.
- **Naming.** `{parent1}_{parent2}` alphabetized (`invoice_tags`) when the relationship is pure; a domain name when it has identity (`memberships`, `subscriptions`).
- **Upgrading to entity-with-metadata.** When the relationship carries data — `joinedAt`, `role`, `quantity` — promote: add a surrogate `id` (UUIDv7) so other rows can FK to it; demote the composite to a `unique(...).on(...)` constraint; add `createdAt`/`updatedAt`. Trigger: if anything would FK to the relationship, or it has temporal/role/quantity data, it's an entity.
- **Worked examples.** `invoice_tags` as pure junction (two FKs + composite PK, no metadata). `memberships` as entity (surrogate `id`, `userId` + `organizationId` FKs, `role` enum, `joinedAt`, `unique(...)` on the pair) — foreshadowed for Unit 10 tenancy.
- **Relations v2 cliff-hanger.** The junction is data; lesson 9 of chapter 041 wires `db.query.invoices.findFirst({ with: { tags: true } })` to traverse it automatically.
- **What the database enforces.** Composite PK rejects duplicate pairs; both FKs reject orphans; cascade on both cleans junction rows when either endpoint goes.
- **Watch-outs:** three-or-more FK junctions are almost always two relationships hiding as one — split them; FK indexes aren't automatic — the composite PK indexes `(invoiceId, tagId)` and serves `WHERE invoiceId = …` but not `WHERE tagId = …`, so add the second index (lesson 1 of chapter 043); cascade on both is right for ownership but switch to `restrict` if either endpoint should block deletion while the relationship exists; adding `createdAt` is the trigger that says "promote to entity."

What this lesson does not cover:

- The Drizzle Relations v2 API and `db.query.…({ with: … })` traversal — lesson 9 of chapter 041.
- Indexing the second column of a junction — lesson 1 of chapter 043.
- Querying through junctions with explicit joins — lesson 2 of chapter 042 / lesson 3 of chapter 042.
- Multi-tenancy via memberships at depth — Chapter 10.

Estimated student time: 35 to 45 minutes. Load-bearing for tag relationships, user-org memberships, and every later N:M relationship in the course.

---

## Lesson 9 — Drizzle Relations v2

Declares the TS-side traversal graph with `defineRelations` in `db/relations.ts` — one/many/through shapes — that enables `db.query.…({ with: … })` nested reads in lesson 3 of chapter 042.

Topics to cover:

- **The senior question.** FKs connect rows; how does the application traverse them? `references()` (lesson 6 of chapter 041) declares the database constraint but does not enable Drizzle's relational query API. The v2 declarative relations layer (`defineRelations(...)` in `db/relations.ts`) does, feeding `db.query.invoices.findFirst({ with: { lineItems: true, tags: true } })` in lesson 3 of chapter 042.
- **Two layers.** `db/schema.ts` says what's in the database; `db/relations.ts` says how the relational query API walks it. Postgres only sees the FKs from lesson 6 of chapter 041; the relations file is a TS-side traversal graph.
- **The v2 API — `defineRelations`.** `defineRelations(schema, (r) => ({ … }))` returns an object the `db` client consumes. The callback's relation builder declares each table's relations to others. v2 terminology: `from` (this table's column) and `to` (the other's) — replacing v1 `fields`/`references` (the course teaches v2 only).
- **The four shapes.** Declared with `r.one.tableName(...)` or `r.many.tableName(...)`. One-to-many: `invoices: r.many.invoices()` on the org. Many-to-one (the reverse): `organization: r.one.organizations({ from: r.invoices.organizationId, to: r.organizations.id })`. Both ends usually declared so traversal works either direction.
- **Many-to-many through a junction.** `tags: r.many.tags({ through: r.invoiceTags })` — the API walks the junction automatically.
- **Self-referential relations.** A table pointing at itself (replies thread, category tree) — same API, both ends on the same table. Brief mention.
- **v2 vs. v1, why v2 only.** v1 (`relations(table, …)`) compiles but is deprecated. v2 is more compact, infers better types, and is what `db.query` (lesson 3 of chapter 042) reads; v1's query helper moved to `db._query` as compatibility.
- **Where the file plugs in.** `db/index.ts` wires `drizzle(connectionString, { schema, relations })` so the client sees both columns and traversal graph (chapter 044 setup ties it).
- **What lesson 3 of chapter 042 buys.** `db.query.invoices.findMany({ where: …, with: { lineItems: true, tags: true, organization: { columns: { name: true } } } })` returns a typed nested object — the join graph as data. Without `defineRelations`, the same result needs hand-written joins (lesson 2 of chapter 042). Both work; relational API is the senior reach for nested reads.
- **When to skip the relations layer.** Aggregates, complex predicates across joined tables, non-tree shapes — drop to `db.select(...).leftJoin(...)` (lesson 2 of chapter 042).
- **Watch-outs:** `references()` alone does not declare a relation — `db.query.…` returns undefined without `defineRelations`; both directions of a one-to-many usually declared so the next reader doesn't have to guess; v1 and v2 in one project produce inconsistent call shapes — pick one; the relational API plans its own SQL — large joins can surprise on performance, `EXPLAIN ANALYZE` (lesson 3 of chapter 043) is the diagnostic.

What this lesson does not cover:

- Actually writing queries through the relational API (`db.query.…`) — lesson 3 of chapter 042.
- Hand-written joins via `db.select(...).leftJoin(...)` — lesson 2 of chapter 042.
- The N+1 problem at the relations layer — lesson 2 of chapter 043.
- `db/index.ts` wiring of `drizzle(...)` with `schema` and `relations` — Chapter 044 setup.
- The v1 relations API at depth — the course teaches v2 only.

Estimated student time: 40 to 50 minutes. Load-bearing for lesson 3 of chapter 042 (the relational query API), lesson 2 of chapter 043 (N+1 at this layer), and every nested read in Units 7 through 23.

---

## Lesson 10 — `$inferSelect` and `$inferInsert`

Cashes Principle #2 in by deriving every row, insert, and prop type from `typeof table.$inferSelect`/`$inferInsert`, replacing every hand-written row interface in the codebase.

Topics to cover:

- **The senior question.** The schema is the source of truth — what's the call site that hands a row's TS type to a Server Component, action, or helper? Answer: `typeof table.$inferSelect` and `typeof table.$inferInsert`. The lesson cashes Principle #2 in.
- **`$inferSelect` — the read shape.** `type Invoice = typeof invoices.$inferSelect` produces the TS type of a row returned by a Drizzle select. Each Postgres type maps: `text` → string, `numeric` → string (arbitrary precision), `timestamp` → Date, `jsonb` → the `$type<…>` annotation or `unknown`.
- **`$inferInsert` — the write shape.** `type NewInvoice = typeof invoices.$inferInsert` is what `db.insert(invoices).values(...)` accepts. `.default(…)`, `.defaultNow()`, `.$defaultFn(…)` columns become optional; generated columns are omitted; `.notNull()` without a default stays required.
- **Why the two differ.** Read returns everything stored; write accepts the subset the app must supply. The asymmetry is what the schema knows and TS couldn't infer otherwise.
- **Canonical placement.** Re-export next to the table: `export type Invoice = typeof invoices.$inferSelect; export type NewInvoice = typeof invoices.$inferInsert`. Naming: entity name for select, `New` prefix for insert.
- **The "do not hand-write" rule.** A `type Invoice = { id: string; total: string; … }` anywhere is the Principle-#2 smell. Standard: if a row type appears in a file, it came from `$inferSelect` or it's wrong.
- **Composing derived shapes.** Summary types still root in inferred types: `type InvoiceSummary = Pick<Invoice, 'id' | 'total' | 'status'> & { organizationName: Organization['name'] }` — no field name restated.
- **Prop pattern.** Page reads `Invoice[]` from a query, hands it to a Client Component whose prop type is `Invoice[]`. One type, one source. Updates accept `Partial<NewInvoice>`; the matching Zod via drizzle-zod (lesson 8 of chapter 046) ships from the same table — every layer aligns.
- **drizzle-zod foreshadowed.** lesson 8 of chapter 046 owns `createInsertSchema(invoices)` / `createSelectSchema(invoices)` — same field names, same nullability, same enums. Chain: Drizzle schema → `$inferInsert` for the type → drizzle-zod for the validator → both consumed by the Server Action.
- **When inference is wrong — refinements.** `jsonb` without `$type<…>` infers as `unknown` — supply `$type<WebhookEvent>()` when the app knows the shape; `numeric` stays as string in the schema (precision claim honest); enum-like text columns should be `pgEnum` instead.
- **The capstone — Principle #2 cashed in.** Change a column in `db/schema.ts`, run the type checker, every consumer surfaces. The codebase rewrites itself.
- **Watch-outs:** `$inferSelect` returns the full-row shape — partial selects produce narrower inferred shapes, don't restate them; `$inferInsert` makes defaulted columns optional, not nullable (passing `undefined` is fine, `null` only if the column is nullable); `Partial<NewInvoice>` for updates is fine, `Required<Pick<Invoice, 'id'>> & Partial<NewInvoice>` is more accurate; inferred types don't include relations — the relational query API has its own inferred shapes (lesson 3 of chapter 042).

What this lesson does not cover:

- drizzle-zod and the Zod-from-schema pipeline — lesson 8 of chapter 046.
- Inferring result types from custom `db.select(...)` shapes — lesson 1 of chapter 042.
- The relational query API's nested-result types — lesson 3 of chapter 042.
- Server Action argument typing and the Result return shape — Chapter 047.
- Branded ID types layered on `$inferSelect` — Chapter 009 (recap site if needed).

Estimated student time: 30 to 40 minutes. Load-bearing as the chapter's capstone — every later unit consumes types through these two helpers.

---

## Lesson 11 — Quizz

Top 10 topics to quiz:

- Principle #2 — the schema is the source of truth, what it prevents (four-way drift), where it bites downstream (queries, Zod, forms, RLS).
- `pgTable` — the call shape, the `casing: 'snake_case'` config mapping TS camelCase to SQL snake_case, why the `db/schema.ts` file is the only thing Drizzle Kit reads.
- Postgres data types — the durable per-column defaults: `text`, `numeric(12, 2)` for money, `timestamp({ withTimezone: true })` for timestamps, `uuid` for IDs, `jsonb` with `$type<…>` for flexible payloads, `pgEnum` for stable states.
- Column modifiers — NOT NULL as the senior default; `.defaultNow()` vs. `.$defaultFn(…)` and when the SQL-side default wins; generated columns (`STORED`) for derived data like lowercased emails and full-text vectors.
- Primary keys — UUIDv7 (via Postgres 18's `uuidv7()`) as the default for user-facing entities; `bigint generatedAlwaysAsIdentity` for high-volume internal; the surrogate-vs-natural decision and why mutable naturals cascade pain.
- Foreign keys — `.references(() => other.id, { onDelete: … })`; the four `onDelete` modes and when each is right (`cascade` for ownership, `set null` for optional relations, `restrict` for "must not orphan", `set default` rarely).
- UNIQUE constraints — column-level, composite (table-level), partial (with `.where(…)`), case-insensitive via generated columns; the principle that the database is the safety net the application can't skip.
- CHECK constraints — predicate-level invariants (`total > 0`, `endDate >= startDate`); the Drizzle Kit support story; the Zod parallel at the API boundary.
- Many-to-many junctions — two foreign keys with composite primary key, cascade on both; the upgrade to entity-with-metadata when the relationship gains its own data; naming convention for the junction table.
- The Drizzle Relations v2 API — `defineRelations` in a separate file; the difference between `references()` (database FK) and a relation (TS-side traversal hint); how the relations file enables `db.query.…({ with: … })` nested reads in lesson 3 of chapter 042.
- `$inferSelect` and `$inferInsert` — the canonical row and insert types; the asymmetry (defaults and generated columns affect `$inferInsert` only); the "never hand-write a row type" rule.
