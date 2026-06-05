# Chapter 037 — Schema as source of truth with Drizzle

## Lesson 1 — Principle #2: the schema is the source of truth

**Taught:** Architectural Principle #2 as a mental model — `db/schema.ts` is the single source of truth from which all other typed shapes (row type, insert type, Zod validator, form field set, RLS column names) are *generated*, never hand-copied; the four-way silent drift hand-copies cause; the two legitimate hand-write carve-outs; the schema-first order of operations.

**Cut:** None of substance — the lesson covered the outline's full scope. All mechanics (`pgTable`, `$inferSelect`/`$inferInsert` resolution, drizzle-zod) were deferred by design, not cut.

**Debts (forward-references made, must be honored):**
- `$inferSelect` (row type) and `$inferInsert` (insert type) — named as generators, mechanics owed to **Lesson 10**.
- Zod generation via `createInsertSchema` / `createSelectSchema` from the `drizzle-orm/zod` subpath — owed to **Ch 042 L8**.
- Form field set derived from that Zod — **Ch 047**; Server Actions parse with it — **Ch 043**.
- RLS policy column names reference the same file — **Ch 056** (multi-tenancy/security).
- Drizzle Kit migration generation — **Ch 040**.
- Public API DTOs at depth (carve-out 1) — **Chapter 16** / Unit 16.
- The schema file itself — built across **Lessons 2–9**, capstone-inferred in L10.

**Terminology / mental models established (later lessons should reuse, not redefine):**
- "**The schema is the root of a derivation tree**" — one root node (`db/schema.ts`), every typed shape a *branch* generated from it; hand-editing a branch creates a *fork* that drifts.
- "**One shape, five spellings**" framing — the five surfaces: Drizzle table, Server Component prop, Zod validator, Server Action args, form field set.
- "**Four-way drift**" / "hand-typed restatements drift silently" — the named failure mode (rename `total`→`amountDue`, four hand-copies stay stale, TS silent, production 500 on first insert).
- The carve-out test: "does this shape **restate a field name *and* its type** the schema already knows?" Yes = fork/smell; projecting/narrowing inferred members (`Pick`, `Omit`, `&`, `Type['field']` indexed access) = legitimate.
- Two carve-outs: **external API DTOs** (deliberately narrower public contract) and **derived view shapes** (composed from inferred pieces, e.g. `InvoiceSummary = Pick<Invoice, …> & { organizationName: Organization['name'] }`).
- Three named anti-patterns for review vocabulary: hand-typed row interfaces, `as any` to bridge a stale type, copying a Zod field list off the Drizzle table by hand.

**Misc.:**
- Worked domain is **invoices** (columns used illustratively: `id`, `total`/`amountDue`, `status`, `dueDate`, `organizationId`). The `total`→`amountDue` rename is the chapter's running drift example; later lessons settle on `amountDue` as the money column name.
- Connects Principle #2 to the existing principle family the student has met: #1 (co-locate by feature, Ch 029), #6 (explicit over magic, Ch 030), #7 (impossible states unrepresentable, Ch 005) — through-line "one place each fact lives."
- Snippets here are illustrative teasers only; the lesson writes **no** `pgTable` syntax. Per the outline's code-convention note, any future snippets follow the forward-looking **Drizzle 1.0** shapes (`drizzle-orm/zod` subpath, not standalone `drizzle-zod`; `InferModel` is deprecated — use `$inferSelect`/`$inferInsert`).
- **Build complete** — all components final (no stubs): three hand-coded figures (`FiveSurfaces` neutral five-surfaces problem picture, `DerivationTree` resolution, `DriftFrame` 5-step `DiagramSequence`), the `Buckets` classification exercise, and a single `MultipleChoice`. The drift timeline's step 5 carries the counterfactual (generated world → red compile errors). One `VideoCallout` (`hIYNOiZXQ7Y`, Neon's 13-min Drizzle tour) + two Drizzle-docs `ExternalResource` cards.

## Lesson 2 — pgTable and the snake_case bridge

**Taught:** First mechanics lesson — the `db/` folder layout, the minimal `pgTable(name, columns)` call, column builders, and the `casing: 'snake_case'` client config that bridges TS camelCase keys to SQL snake_case columns. The exported `const` is the handle every downstream tool imports; `logger: true` is the dev-only flag that makes the bridge observable. `pgSchema` named and dropped (course pins all tables to `public`).

**Cut:** None of substance — covered the outline's full scope. All deferrals (types, modifiers, keys, FKs, constraints, junctions, relations, `$infer*`, full client wiring, Drizzle Kit) are by-design forward references.

**Debts (forward-references made):**
- Per-column overrides, `.notNull()`, `.primaryKey()` modifiers — named at call site, owned by **L4/L5**.
- Which Postgres type per column (`uuid`/`text`/`integer`/`timestamp` used illustratively only) — **L3** (cliff-hanger in closing).
- Full `db/index.ts` client wiring (`client`/`pool`/`schema`, pooling, connection string) — **Ch 040 setup**. Only the isolated `casing`/`logger` config line shown.
- `db/relations.ts` contents / Relations v2 — **L9**; `db/index.ts` re-export namespace — **Ch 040**.
- Drizzle Kit migration generation — **Ch 040**; drizzle-zod validator generation — **Ch 042 L8** (both named as `schema.ts` consumers).
- `logger`'s real payoff (N+1 diagnosis, `EXPLAIN`-copy reflex) — **Ch 039**.

**Terminology / mental models (reuse, don't redefine):**
- "**The casing bridge**" / "two naming worlds" — TS camelCase keys ↔ SQL snake_case columns; `casing: 'snake_case'` is the one-line policy translating both directions (reads and writes). "You write one world; Drizzle speaks the other."
- A `pgTable` is "a TS object whose **keys are your code's column names**, **values are column builders**" — the key→builder pairing is the repeating unit of every table.
- "**Export it or it doesn't exist**" — Drizzle Kit reads only `db/schema.ts`'s *exports*; an unexported table type-checks but is never created (query fails at runtime).
- The exports fan-out diagram deliberately **rhymes with L1's derivation-tree** (same left-source/right-consumers layout, color-matched root box).
- "**Per-column escape hatch**" — the first string arg to a builder (`uuid('organization_id')`) is a deliberate override for legacy/fixed SQL names only; **mixing it with `casing` across a schema = silent drift**. Rule: one policy per schema.

**Patterns and best practices (for project chapters):**
- `db/` lives at **`src/` root** (sibling of `app/`, `lib/`), never inside a feature folder — schema is cross-cutting (the deliberate exception to Principle #1 co-location). Three files: `schema.ts` (tables), `relations.ts` (Relations v2), `index.ts` (client).
- Table SQL name = **plural snake_case**; exported `const` name matches.
- `casing: 'snake_case'` set **once on the client, never per table**; reserve explicit per-column SQL strings for genuine exceptions, commented with *why*.

**Misc.:**
- **Deliberate version divergence from L1's continuity note:** this lesson teaches the **stable** Drizzle surface — `casing: 'snake_case'` as a `drizzle({...})` client option and the key-as-column-name `pgTable` form — **not** the Drizzle 1.0 beta (which reworks casing toward a table-builder/`pgTableCreator` form). One ≤1-sentence parenthetical acknowledges 1.0 will move this config. L1's "forward-looking 1.0" note applied to the `drizzle-orm/zod` subpath + `$infer*` (still honored), not to destabilizing the casing surface onto a beta API.
- **Deliberate staging divergences** (don't "fix"): bare `.primaryKey()` without the UUIDv7 `$defaultFn`/`default(sql\`uuidv7()\`)` that code conventions specify (L5 owns it); the `db/index.ts` snippet is intentionally partial (no env validation, no pooling).
- Running domain continues: `organizations` (id, name) and `invoices` (id, amountDue, createdAt, organizationId). `amountDue` shown as `integer` here illustratively — **L3 will make money `numeric(12,2)`**; future agents should not treat the `integer` money column as canonical.
- **Exercise-sandbox staging precedent set here (L3–L9 all inherit it):** the `DrizzleSchemaCoding` in-browser editor has **no `db` client**, so the `casing: 'snake_case'` policy isn't running — the starter therefore passes **explicit snake_case name strings** as the builder's first arg (`timestamp('created_at')`), and the grader checks the *emitted SQL column name* is snake_case (direct proof the bridge spelling is right). Lesson prose uses bare builders; only exercise sandboxes carry the explicit strings.
- **Build complete** — all components final (no stubs): `CasingBridge` (hand-coded two-lane casing-bridge figure with the highlighted `casing: 'snake_case'` pill), `ExportsFanout` (the L1-derivation-tree-rhyming fan-out inside a `Figure`), one `AnnotatedCode` (5 blue steps over the minimal `organizations` table), one before/after `CodeVariants` (manual-strings-drift vs one-policy), the `DrizzleSchemaCoding` exercise (`invoices` completion), a `Buckets` classification + a single `MultipleChoice` (the unexported-table-invisible-to-migrations trap). One `VideoCallout` (`hIYNOiZXQ7Y`, Neon's 13-min Drizzle tour, shared with L1) + four `ExternalResource` cards (2 Drizzle docs, 2 Postgres identifier-folding refs).

## Lesson 3 — Postgres data types, the 2026 subset

**Taught:** Survey of the ~8-type 2026 `pg-core` subset, each as "default + trigger + the named anti-pattern it shadows": `text` (not `varchar(n)`/`char(n)`); `numeric({ precision: 12, scale: 2 })` for money (not float — the silent-corruption foil) plus `integer`/`bigint({ mode })`; `boolean` with the orthogonal-booleans-vs-enum modeling test; `timestamp({ withTimezone: true })` = `timestamptz` (never plain `timestamp`) plus `date`/`time`/`interval`; `uuid` surrogate keys with both generators named; `pgEnum` (two-step declare-then-call shape) vs lookup table; `jsonb().$type<T>()` (never `json`); `text().array()`; `inet`. Closes with the keeper per-column defaults table.

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- Column modifiers `.notNull()`/`.defaultNow()`/`.default()` shown at face value, owned by **L4**; reusable `createdAt`/`updatedAt` columns pattern named, **L4**.
- UUIDv7-vs-v4 generator decision and `bigint` as identity PK — **L5**.
- `numeric → string` and `jsonb → $type`/`unknown` *inference mechanics* (`$inferSelect`) — **L10** (previewed as motivation only).
- Junction-table graduation from `text().array()` — **L8**.
- Zod at the boundary as the runtime gate for length caps + `$type` payloads — **Ch 042**; enum-value add/remove migrations — **Ch 040**; `jsonb` query operators (`->`,`->>`,`@>`) — **Ch 038 L9**; `tsvector` full-text — **Ch 038 L8**; binary in R2 not `bytea` — **Unit 13/Ch 14**.

**Terminology / mental models (reuse, don't redefine):**
- "**~8 defaults, each shadowed by one tempting-but-wrong alternative**" — the lesson's organizing frame; the four headline traps are `varchar(n)`, plain `timestamp`, float-for-money, `jsonb`-for-things-you-filter-on.
- "**The database type says what *can* be stored; the validator says what's *allowed* in**" — type/Zod division of labor; length limits are a UX concern, not storage.
- `numeric` is "the one type where TS and SQL disagree about the runtime value" — comes back as `string` (a JS `number` is a float); reuses L2's "two worlds" boundary framing. Never `parseFloat` money.
- **`precision`** = total significant digits; **`scale`** = digits after the decimal. Course money default is `numeric({ precision: 12, scale: 2 })` (object form, not positional).
- `pgEnum('name', [...])` is a **two-step shape**: one call both declares a named Postgres enum type and returns a column builder you `export` and call like `text()`. Yields a TS string-literal union (impossible-states-unrepresentable, Principle #7). "**Easy to add, painful to remove**" enum values.
- `$type<T>()` is a **compile-time promise, not a runtime check** — Postgres stores whatever bytes; Zod is the enforcer.
- `text().array()` elements "aren't real database rows" (no FKs, no JOIN, no referential integrity) → graduate to a **junction table** when they need attributes or JOINs.
- `jsonb` you keep querying into = "**normalization debt**" — promote to a real column.

**Patterns and best practices (for project chapters):**
- Per-column type defaults the project schema must follow: `text()` for strings (length caps live in Zod, never `varchar`); `numeric({ precision: 12, scale: 2 })` for all money; `integer()` counts / `bigint({ mode: 'number' })` big numbers; `boolean()`; `timestamp({ withTimezone: true }).defaultNow()` for instants; `date()` calendar days; `uuid()` surrogate keys; `pgEnum(...)` for small stable mutually-exclusive state sets; `jsonb().$type<T>()` for shapeless/third-party payloads; `text().array()` for light scalar lists; `inet()` for IP addresses.
- Bare builders under the `casing` policy (object option form, e.g. `numeric({ ... })`, `bigint({ mode: 'number' })`) — no positional SQL-name args.

**Misc.:**
- **`amountDue` money column upgraded `integer` → `numeric({ precision: 12, scale: 2 })`** here, explicitly called out — this is now canonical for the running domain (supersedes the L2 note's illustrative `integer`).
- New domain tables introduced illustratively: `webhookDeliveries` (`payload: jsonb().$type<WebhookEvent>()`) and an `invoiceStatus` `pgEnum` (`draft`/`sent`/`paid`/`void`) used for `invoices.status`. `invoices` gains `customerName`/`dueDate`/`tags` columns in the practice exercise.
- Narrow carve-out taught: a recurring *local* time-of-day ("opens 9am local") is `time` + separate `timezone` text column, not `timestamptz`.
- `DrizzleSchemaCoding` grader: `ColumnRequirement.type` is prefix-match only — does NOT distinguish `numeric` precision/scale, `timestamp` with/without tz, or array-ness. **As built, the exercise uses `requirements` only — no probes** (contrary to the outline's probe suggestion); `tags` is asserted as `type: 'text[]'` and `status` as `type: 'invoice_status'`, which the prefix match does catch, so requirements sufficed. (L4–L8 continuity notes reference an "L3 probe precedent" — that precedent is the *exercise-sandbox snake_case-strings* staging from L2, not probes; L3 itself ships none.)
- Stays on the **stable** Drizzle surface (matching L2); all builders here unchanged in 1.0, no version parenthetical. Postgres 18 native `uuidv7()` (no extension) confirmed.
- **Build complete** — all components final (no stubs): the `DefaultsTable` keeper figure (hand-coded two-col lookup), four default-vs-trap `CodeVariants` (`varchar`/`text`, float/`numeric`, plain/tz `timestamp`, v4/v7 generators), one `AnnotatedCode` (3 steps on `jsonb().$type<WebhookEvent>()`), the `DrizzleSchemaCoding` `invoices` exercise, a `Buckets` (twoCol) recall sort + one `MultipleChoice` (the float-for-money trap), a `CardGrid` of deferred types (PostGIS/`tsvector`/`bytea`), one `VideoCallout` (`oWF5jTFBSHw`, Aaron Francis timezones, 14 min) + four `ExternalResource` cards (Drizzle pg types, PG18 types, the 0.30000000000000004 float demo, PG wiki "Don't Do This").

## Lesson 4 — NOT NULL, defaults, and generated columns

**Taught:** The per-column checklist after type — **null? → default? → derived?** — chained as modifiers. `.notNull()` is the senior default (bare builder is nullable); `| null` propagates into `$inferSelect` and taxes every read site. Three defaults split by *who computes*: SQL-side `.default(literal)` / `.defaultNow()` (baked into Postgres `DEFAULT`, fires for every writer) vs app-side `.$defaultFn(() => …)` / `.$onUpdate(() => …)` (run inside Drizzle only). The canonical `updatedAt` chain `…defaultNow().notNull().$onUpdate(() => new Date())`. The **reusable-columns file `db/columns.ts`** (`timestamps` and `softDelete` objects spread with `...` into each table). **Generated columns** via `.generatedAlwaysAs(() => sql\`…\`)` — always `STORED` in Drizzle pg; the case-insensitive-email setup (`email` + `emailLowercased`).

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- `.$defaultFn(() => uuidv7())` PK hook named, UUIDv7 decision owed to **L5**.
- `.references(...)` on the nullable `assignedToId` example — **L6**.
- The **unique index on `emailLowercased`** that closes the case-insensitive-email loop — **L7** (explicit cliff-hanger; this lesson must not write `unique()`/`uniqueIndex()`).
- `$inferInsert` mechanics — defaults make a column *optional*, generated columns *omitted entirely* — **L10** (one-sentence foreshadows only).
- drizzle-zod turning `.notNull()` into a *required* Zod field, nullable into *optional* — **Ch 042 L8**.
- Postgres `BEFORE UPDATE` **trigger** as the prod-grade `updatedAt` fix (survives raw SQL) — **Ch 040 setup** (named, not built).
- `tsvector` full-text as a STORED generated column — **Ch 038 L8**; soft-delete query filtering / `deletedAt` depth — **Ch 039**.

**Terminology / mental models (reuse, don't redefine):**
- "**Four questions per column, always in order: type → null? → default? → derived?**" — the chapter's column checklist; type was L3, this lesson owns the other three.
- "**`.notNull()` is the default you reach for**" — builder defaults to nullable (loosest option); tightening is the schema author's job. A nullable column must pass the test "`null` here means ___" with a real domain meaning (else it's a missing-value bug).
- "**Nullability is a tax paid downstream**" — `| null` is generated upstream from the schema; the read site can only cope, never remove it. One decision, four layers (row type, insert type, validator, form field).
- "**Who computes the default**" / **SQL-side vs app-side** boundary — the `$` prefix (`$defaultFn`, `$onUpdate`) is Drizzle's deliberate marker for "runs in the JS client, not in SQL." App-side defaults are **invisible to anything that bypasses Drizzle** (psql, SQL seeds, other services).
- "**The reusable-columns pattern**" — `db/columns.ts` exports plain column-builder objects spread with `...timestamps` / `...softDelete`; spreading copies builders per-table (not shared instances). "Encode the decision in one place, spread it forever."
- **Generated column** = Postgres computes it from *same-row* columns; read-only. **STORED** (on write, persisted, indexable) vs **VIRTUAL** (on read, not indexable). Drizzle pg **always emits STORED, no `{ mode }` arg** (that's MySQL/SQLite only). **Postgres 18 flipped the *raw-SQL* bare-`GENERATED` default to VIRTUAL** — recognition note, Drizzle schema unaffected.

**Patterns and best practices (for project chapters):**
- **`db/columns.ts`** is a 4th file beside `schema.ts`/`relations.ts`/`index.ts`. Canonical shapes (pinned, reuse verbatim): `createdAt: timestamp({ withTimezone: true }).defaultNow().notNull()`; `updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date())`; `softDelete = { deletedAt: timestamp({ withTimezone: true }) }` (deliberately nullable). Every table spreads `...timestamps`; soft-delete tables also spread `...softDelete`.
- `.notNull()` on every column unless absence is an explainable state; prefer SQL-side defaults whenever Postgres can compute the value.
- `.defaultNow()` only on `timestamptz` (never plain `timestamp` — silently stores server-local time).
- Generated columns written as `() => sql\`…\`` **callback** form (defers column refs past table definition, avoids circular-ref error); interpolate sibling columns by TS reference (`${users.email}`).

**Misc.:**
- **Deliberate staging divergence (don't "fix"):** `id` left as bare `.primaryKey()` — `columns.ts` omits it entirely, each table declares its own until **L5** finalizes the UUIDv7 shape. Mirrors L2's staging.
- New illustrative columns on the running domain: `users` table (`email`, `emailLowercased`), `invoices.status` defaults `'draft'`, `assignedToId` (nullable), `deletedAt` (nullable). `softDelete`/`deletedAt` is the textbook nullable carve-out.
- `DrizzleSchemaCoding` grader note: `ColumnRequirement` has `notNull`/`hasDefault` but **no generated flag** — generated columns verified via INSERT/SELECT **probes** (omit-then-computed success, supply-then-rejected failure). Exercise sandbox passes explicit snake_case name strings (no `casing` client in scope) so probe SQL lines up; the "casing lives on the client" rule still holds in real schema files.
- **Build complete** — all components final (no stubs): one hand-coded `ColumnAnatomy` figure (`src/components/lessons/037/4/ColumnAnatomy.astro` — the opening four-decision pill-chain mental model, derived monospace geometry like `UrlAnatomy` 012/1, type/null?/default? live + a ghosted derived slot); two `AnnotatedCode` (the `updatedAt` four-link chain; the `emailLowercased` build); two `CodeTooltips` (the `string | null` vs `string` inferred-member reveal); two `CodeVariants` (SQL-side/app-side default firing; hand-written-vs-spread `columns.ts`); a `Buckets` (twoCol) default-classification drill + the `DrizzleSchemaCoding` `users`/`invoices` exercise (two `status` probes, generated column probe-checked per the grader note). **No quiz, no video, no `MultipleChoice`** — five `ExternalResource` cards (2 Drizzle docs, PG18 generated columns, a NULLs-traps article, PG `citext` as the email alternative). The `DrizzleSchemaCoding` built as `requirements` + two probes (lighter than L5–L8's probe-heavy exercises, since only `status`'s default and the generated column needed runtime proof).

## Lesson 5 — Primary keys: UUIDv7 and identity bigint

**Taught:** The decision lesson that finalizes the bare `.primaryKey()` slot staged since L2. `.primaryKey()` = three free guarantees (NOT NULL + UNIQUE + B-tree index); never add a separate `.unique()`/`.index()` to a PK column. Two ordered axes: (1) surrogate vs natural (DB mints vs domain owns), (2) exposed vs internal. The three canonical shapes the course ships, each with its trigger. UUIDv4 write-amplification trap → UUIDv7 time-sortable fix (48-bit ms prefix → inserts append at index tail). Composite-PK mechanic (`primaryKey({ columns })`) introduced **for junction tables only**.

**Cut:** UUID-exposure-leaks-business-volume (`/invoices/47` reveals count/growth) demoted to the introduction hook only, not given its own treatment; outline listed it as a standalone watch-out.

**Debts (forward-references made):**
- `.references()` / foreign keys (the "every FK points at one PK") — **L6** (explicit next-lesson cliff-hanger).
- `unique(orgId, slug)` constraint as the alternative to a composite *entity* PK — **L7**.
- Full two-FK junction shape + promotion to entity-with-metadata — **L8** (composite-PK mechanic seeded here with `invoiceTags`).
- `$inferSelect`/`$inferInsert` with identity/generated columns — **L10**.
- `db.transaction` for monotonic ID assignment — **Ch 039 L4**; FK-column index strategy — **Ch 039 L1**; how `default(sql\`uuidv7()\`)` lands in a migration — **Ch 040**.

**Terminology / mental models (reuse, don't redefine):**
- "**Two questions in a fixed order**": (1) does the id leave the DB? (2 of axis-2) is it ours to mint? The skill is the *order*, carried by the `StateMachineWalker` decision tree.
- **Surrogate key** = meaningless DB-minted value (course default everywhere user-facing); **natural key** = real domain value the outside world owns. The keeper heuristic: "**would I be comfortable if this value changed — and every row pointing at it had to change too?**" Anything short of a confident yes ⇒ surrogate.
- "**A changing PK detonates through every FK**" — the danger rule motivating surrogate-default.
- **Write amplification** (Term) = one logical insert → many physical page writes; UUIDv4 randomness scatters B-tree inserts, cost **compounds with table size** (free in dev, brutal in prod). UUIDv7 = time-sortable, appends at the tail like a sequence.
- "**The default has gravity**" — UUIDv7 is the when-in-doubt landing; `bigint identity` is a defensible opt-in, not a per-table coin flip.
- `RFC 9562` (May 2024) standardized UUIDv7; **ULID/KSUID** named once as pre-standard ancestors (recognition only).
- `generatedAlwaysAsIdentity()` = modern SQL-standard identity column; **`bigserial`** named as legacy/superseded.

**Patterns and best practices (for project chapters) — the three canonical PK shapes, reuse verbatim:**
- **UUIDv7 (default, any user-facing entity):** `id: uuid().primaryKey().default(sql\`uuidv7()\`)`. SQL-side native generation (Postgres 18 / Neon) is **canonical** — fires for migrations, seeds, psql. App-side `id: uuid().primaryKey().$defaultFn(() => uuidv7())` (npm `uuidv7`) is the **named portability fallback** for teams not on PG 18. **Never `.defaultRandom()`** for a PK — it generates UUIDv4 (the trap). `sql` imported from `drizzle-orm`. *(Deliberate, reasoned divergence from `Code conventions.md` §Data layer, which lists `$defaultFn` first — do not normalize back; flagged for the conventions maintainer.)*
- **identity bigint (high-volume internal reach):** `id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`. Earned only when **all** hold: high-volume + internal-only + id never crosses a boundary + no sharding planned. `mode: 'number'` required.
- **natural key (narrow carve-out):** `code: text().primaryKey()` — only immutable, externally-owned reference-table values (countries, currencies); never a user-facing entity.
- **composite PK (junction tables only):** `(t) => [primaryKey({ columns: [t.invoiceId, t.tagId] })]` — standalone `primaryKey` import from `drizzle-orm/pg-core`, distinct from the chained `.primaryKey()` method.

**Misc.:**
- **Loop closed:** every chapter table now has a finalized `id` shape; `columns.ts` (L4) still omits `id` so each table declares its own PK.
- **As built — exercise ships `requirements`-only, NO probes** (diverges from the outline's probe plan): the `DrizzleSchemaCoding` (`organizations`/`auditLogs`/`countries`) checks only column **shape** (type prefix, `.primaryKey()`, `hasDefault`). The grader **cannot** distinguish `uuidv7()` from v4 `gen_random_uuid()` nor detect identity columns, so the **lesson prose is the grader** for those high-stakes choices — a `:::note` spells out "`organizations.id` wants `uuidv7()`, never `.defaultRandom()`" and the answer `<details>` carries the exact shapes. The sandbox's mini-Postgres **predates native `uuidv7()`**, so a correct shape shows a green checklist *plus* a "function uuidv7() does not exist" note — called out in-lesson as the sandbox, not the student's schema (works on Neon PG 18).
- Exercise sandbox passes explicit snake_case name strings (no `casing` client in scope), per L3/L4 staging.
- **Build complete** — all components final (no stubs): `UuidByteLayout` (`src/components/lessons/037/5/UuidByteLayout.astro`, the v4-vs-v7 byte-strip `Figure` whose load-bearing payoff is the example-value caption rows); the `StateMachineWalker` decision tree (Q exposed? → Q owned?/Q volume? → 4 leaves, the "when in doubt UUIDv7" leaf deliberate); three-tab `CodeVariants` (UUIDv7/identity bigint/natural, color-marked green/blue/orange); a `Buckets` (3-bucket strategy sort) + the `requirements`-only `DrizzleSchemaCoding`. One `VideoCallout` (`DHtf_46OxY8`, Database Star UUID-vs-INT ~10 min) + four `ExternalResource` cards (Neon PG18 uuidv7, PG18 release note, an interactive UUIDv7 generator/decoder, RFC 9562). **No quiz, no `MultipleChoice`** here.

## Lesson 6 — Foreign keys and ON DELETE

**Taught:** The first lesson to *connect* two tables. An FK is two things at once: (1) a **guarantee** Postgres enforces on every write (no orphan rows), declared `.references(() => other.id, { onDelete })`; (2) a **deletion policy** chosen per-edge from the *meaning* of the relationship. The four `onDelete` rules and the senior question-order that derives them (ownership → blockability → nullability), carried by a `StateMachineWalker`. The hard-vs-soft-delete reframe that keeps `cascade` in its lane. Worked example: one entity (`invoices`) legitimately carries three different rules at once — the rule is per-edge, not per-table.

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- **FK columns are not auto-indexed** (cascade deletes + reverse lookups degrade to full-table scans); the `index()` fix — **Ch 039 L1** (named twice, load-bearing cliff-hanger).
- The `invoiceTags` junction (two FKs, both `cascade`, owned by both endpoints) — **L8** (named one sentence only, not built).
- FK vs Drizzle **relation** distinction made explicit: `.references()` is the DB constraint and does **not** enable `db.query.…({ with })` traversal; `defineRelations` — **L9**.
- UNIQUE/CHECK as the next "database is the last line of defense" extension — **L7**.
- Soft-delete depth (`deletedAt` query filtering, partial-unique-on-deleted, restore/archive lifecycle, `softDelete`/`restore` actions) — **Ch 061**; query-layer tenancy scoping — **Unit 10**.
- How `onDelete: 'cascade'` lands as `ON DELETE CASCADE` in a migration file — **Ch 040**.
- `$inferSelect`/`$inferInsert` treat an FK column as just its underlying `uuid` — **L10** (no special note).

**Terminology / mental models (reuse, don't redefine):**
- "**A foreign key is a promise the database keeps**" — moves orphan-prevention from app code down to the database boundary; the question "does this parent exist?" becomes unnecessary because a bad write fails before app code runs.
- The three FK guarantees: rejects dangling writes (insert *and* update); **column types must match the referenced PK exactly** (caught at schema-apply, ties to L5's PK shapes); the FK column is **not indexed automatically**.
- **The callback form `() => other.id`** is load-bearing, not ritual — defers the lookup past module evaluation so mutually-referencing tables don't hit "cannot access before initialization."
- The four rules: **`cascade`** (child owned, garbage without parent — "if the parent is gone, is the child garbage?"); **`set null`** (optional pointer, orphaning desired — *requires* a nullable column, else Postgres rejects the contradiction); **`restrict`** (block the parent delete while children exist); **`set default`** (named, almost never used).
- **The lesson lives in the question *order* (ownership → blockability → nullability), not in any single leaf** — internalize the reflex, not a four-row lookup table.
- **`NO ACTION`** (Term) = Postgres's *true* implicit default when no clause is written (NOT `restrict`); also blocks, but its check can be deferred to end-of-transaction vs `restrict`'s immediate per-statement check. Course **always writes `restrict` explicitly**; the deferred-vs-immediate difference is out of scope.
- **`onUpdate`** is a non-decision in this course — immutable surrogate PKs (L5) never change, so it never fires; needing it signals a PK that should have been a surrogate.
- **Hard delete** (`DELETE`, row physically removed — the rare path) vs **soft delete** (stamp `deletedAt`, row stays, queries filter it out — the common path). Because soft-deleted rows are never `DELETE`d, **`onDelete` never fires** on that path. The reconciliation: declaring `cascade` and soft-deleting are *not* in conflict — the rule defines what the *rare purge* does, not the everyday delete. "Choose `onDelete` for the purge that *might* happen; choose soft delete for the deletes that *actually* happen."
- **referential integrity** (Term) and **orphan row** (Term) established.
- **Multi-tenancy starts at the FK:** every tenant-owned table carries `organizationId` → `organizations.id` with `restrict`; *enforcing* that scope at the query layer is later (Unit 10). The FK is the seed.

**Patterns and best practices (for project chapters):**
- Explicit `onDelete` on **every** FK, even in a soft-delete-first app — you're choosing what the rare purge does. Match rule to relationship: `cascade` = ownership, `restrict` = cross-aggregate / tenant-owned parent, `set null` = optional pointer.
- The three canonical edges for the running domain (reuse verbatim): `invoices.organizationId` → `organizations.id` `restrict` (`.notNull()`); `invoices.assignedToId` → `users.id` `set null` (nullable, no `.notNull()`); `invoiceLineItems.invoiceId` → `invoices.id` `cascade` (`.notNull()`). Junction FKs (`invoiceTags`) both `cascade` (L8).
- Lesson prose uses **bare builders** under the `casing` policy (no positional SQL-name strings); only the `DrizzleSchemaCoding` starter uses explicit snake_case strings (no `casing` client in sandbox), per L3–L5 staging.
- Multi-column FKs use the table-level `foreignKey({ columns, foreignColumns })` helper — recognize, don't reach for it (course keys on single surrogate `id`).

**Misc.:**
- Reuses L4's nullable `assignedToId` as the `set null` example, and L4's `deletedAt`/`softDelete` (from `db/columns.ts`) for the soft-delete reframe — referenced, not redeclared. PK shape reused verbatim from L5 (`uuid().primaryKey().default(sql\`uuidv7()\`)`); no re-litigation. Worked-example `invoices`/`invoiceLineItems` use `amountDue`/`amount` as `numeric({ precision: 12, scale: 2 })` (L3 canon).
- `users` table now in the running domain (from L4); `invoiceLineItems` formalized with `invoiceId` + `description` + `amount`.
- **Build complete** — all components final (no stubs). The `DrizzleSchemaCoding` exercise is the assessment: student adds three FKs to `invoices`/`invoiceLineItems`, verified by `requirements` (FK *existence* via `references: { table, column }`) **plus three probes** (the `onDelete` rule itself is probe-only — `ColumnRequirement.references` cannot read it): restrict-blocks-org-delete `mustSucceed:false`; cascade-removes-line-item and set-null-keeps-invoice `mustSucceed:true`, the latter two proven by self-asserting `DO $$ … RAISE EXCEPTION` blocks. `seedSQL` gives **each probe its own org** (fixed UUIDv7-shaped literals) so one probe's parent delete can't disturb another's rows. Starter uses explicit snake_case name strings (no `casing` client), per L3–L5 staging.
- Lesson interactives as built: prose `Code` block for the single-FK declaration; the `StateMachineWalker` decision tree (3 questions ownership→blockability→nullability + 4 leaves incl. the "make it nullable first" contradiction leaf); one `AnnotatedCode` worked example (3 color-coded steps — restrict blue, set null orange, cascade green) on `invoices`+`invoiceLineItems`; a `:::note` carrying the purge-vs-everyday-delete takeaway. **One `VideoCallout` shipped** (`lDYXtj95Jy8`, Derek Comartin / CodeOpinion, "Should you Delete or Soft Delete?", ~7 min) — the outline had proposed *no* video; the build added this soft-delete explainer. Four `ExternalResource` cards: Drizzle FK docs, Postgres FK-constraint reference, and **two opposing soft-delete essays** (thoughtbot "hard truth about soft deletion" + cultured.systems "avoiding the soft delete anti-pattern") to sharpen the senior judgment call. **No quiz, no `MultipleChoice`.**

## Lesson 7 — UNIQUE and CHECK constraints

**Taught:** The second "database is the last line of defense" lesson (continues L6), pushing *value* and *uniqueness* invariants into Postgres. Core split: a database constraint fires on every write from every source and cannot be bypassed; app validation (Zod) only guards the path that calls it — so it's *both/and* (Zod = UX, constraint = guarantee), reach for a constraint whenever a broken invariant would *corrupt data*. `UNIQUE` taught as a four-shape ladder: single-column `.unique('name')`, composite table-level `unique('name').on(t.a, t.b)`, case-insensitive (the `.unique()` on L4's `emailLowercased` generated column), and partial `uniqueIndex('name').on(...).where(sql\`...\`)`. `CHECK` taught as `check('name', sql\`predicate\`)` (per-row boolean, every insert/update). Closes with the cross-row/cross-table boundary constraints can't see.

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- Action layer catches the constraint-violation error, reads the **constraint name**, maps it to a friendly field error — **Ch 043** (this is why naming is load-bearing).
- drizzle-zod does **not** read a `CHECK` and emit a matching Zod refinement — the predicate is **hand-mirrored** in Zod if you want both the friendly message and the guarantee — **Ch 042** (drizzle-zod itself **Ch 042 L8**).
- Composite PK on a junction table doubles as a uniqueness guarantee (distinct from standalone `unique`) — **L8** (named in one clause only).
- General index strategy (B-tree/GIN, composite column order, `index()` for performance, non-unique partials, FK-column indexing) — **Ch 039 L1**; `uniqueIndex` here is *only* for uniqueness over an expression/subset.
- Transactions for cross-row / aggregate invariants ("≤5 seats", "sum of line items = total", credit limits) — **Ch 039 L4** (named, no transaction code shown).
- Partial-unique-on-`deleted_at` (`where deleted_at is null` lets a tombstoned slug be reused) — soft-delete lifecycle owned by **Ch 061**; named as *a* motivation only.
- How `UNIQUE`/`CHECK` land in a generated migration (current Drizzle Kit auto-generates `CHECK`) — **Ch 040**.

**Terminology / mental models (reuse, don't redefine):**
- "**A constraint is the rule a stray code path can't skip**" — app validation runs on *one path* (the caller); a constraint runs on *all paths* (every writer: migration, seed, psql, second service, future code). "The constraint stands in front of every door."
- **Zod = user experience / constraint = guarantee** — the recurring both/and split, surfaced at the principle and again at CHECK. "A rule that must *always* hold lives in the schema, not only in the validator."
- **invariant** (Term) = a rule that must hold for every row at all times no matter who writes it; **constraint** (Term) = a rule the DB itself enforces on every write; **predicate** (Term) = a per-row boolean (true = allowed, false = rejected); **partial index** (Term) = an index including only rows matching a `WHERE` predicate.
- "**Unique *within what*?**" — in a multi-tenant app uniqueness almost always carries the tenant column (`unique on (organizationId, slug)`, not bare `unique on (slug)`); a bare global unique on a tenant-owned value is usually a modeling bug.
- "**NULL ≠ NULL**" — the lesson's highest-value gotcha: SQL treats every NULL as distinct, so `UNIQUE (org_id, slug)` permits *unlimited* `(org_id, NULL)` rows. Fix is upstream — make the column `.notNull()` (the question never arises); `nullsNotDistinct()` (Postgres 15+) is the rare escape hatch when NULLs must count as equal.
- **Unique *index* vs unique *constraint*** — same correctness guarantee; reach for the *index* form (`uniqueIndex`) specifically when uniqueness is over an *expression* (`lower(email)`) or a *subset of rows* (partial). Constraints can't be partial.
- "**Constraint, or transaction logic?**" heuristic — *if the rule can be checked by looking at the single row being written, it's a constraint; if it needs to count or sum across rows, it's transaction logic.* This partitions schema from application code.

**Patterns and best practices (for project chapters):**
- **Name every `unique`/`uniqueIndex`/`check` explicitly** once the schema settles — auto-generated names derive from column position and *rotate* on reorderings (noisy migration diffs), and the name is what the violation error carries (Ch 043 maps it). Convention shapes: `<table>_<column>_unique`, descriptive names for partials (`contacts_one_primary_per_org`) and checks (`invoices_amount_due_nonneg`).
- **Multi-tenant uniqueness carries the tenant column** by default — composite `unique` on `(organizationId, <value>)`.
- **Case-insensitive uniqueness = course default is the generated column** (`.unique()` on the L4 `emailLowercased` STORED column), *not* Drizzle's documented functional `uniqueIndex().on(lower(email))` — the generated column gives a real readable column the app can `select`/order by. The functional index is shown as the recognized alternative only (its gotcha: the same `lower()` must be repeated at every query site to hit the index).
- **CHECK reaches:** monetary positivity (`amountDue >= 0`), cross-column date ordering (`endDate >= startDate`), bounded/array-length (`cardinality(tags) <= 10`). For a fixed set of allowed strings use **`pgEnum`, not a CHECK** (`pgEnum` also yields a TS union); "a CHECK that lists string literals is an enum waiting to be one."

**Misc.:**
- **L4's `emailLowercased` cliff-hanger is now closed** — L7 attaches `.unique('users_email_lowercased_unique')` to the existing generated column; future agents must not redeclare the column.
- New illustrative tables introduced for the invariant examples: `tags` (single-column slug unique), `pages` (`organizationId`, `slug`, `title` — the per-org composite-unique canonical example), `contacts` (`isPrimary` boolean — the partial-unique one-primary-per-org example). `amountDue` (`numeric({ precision: 12, scale: 2 })`, L3) is the CHECK target.
- **Authoring footgun (Drizzle issue #4661):** CHECK predicates that interpolate a *parameterized JS value* can mis-generate SQL — keep CHECK expressions to **column references** (`${t.amountDue}`) and literal SQL only. Surfaced as a `:::caution`.
- **`DrizzleSchemaCoding` exercise** (`exercise-push-invariants`): student adds a composite unique on `(organization_id, slug)` to `pages` and a CHECK `amount_due >= 0` to `invoices`. Grader can read composite uniques via `uniques: [[...]]` but **cannot read the CHECK predicate or whether the unique fires** — those are probe-only (per-org-slug-allowed `mustSucceed:true`; same-org-dup-slug-rejected `false`; `amount_due = -5` rejected `false`; `amount_due = 0` allowed `true`, proving the `>= 0` boundary). `seedSQL` inserts two parent `organizations` (Acme/Globex) with fixed UUIDv7-shaped literals. The proposed `NULL ≠ NULL` stretch probe was **not** added (starter `slug` is `.notNull()`); that point rides on the diagram + prose only.
- **Deliberate staging divergence (don't "fix"):** lesson prose uses bare builders under the `casing` policy; the exercise starter passes explicit snake_case name strings (no `casing` client in sandbox) so probe SQL lines up — consistent with L3–L6.
- **Build complete** — all components final (no stubs): one hand-coded `NullNotDistinct` figure (`src/components/lessons/037/7/NullNotDistinct.astro` — the `NULL ≠ NULL` collision truth-table, two NULL rows both ✓); two `CodeVariants` (single→composite "add the tenant column" delta; generated-column-default vs functional-`lower()`-index, the latter carrying the `lower(col: AnyPgColumn): SQL` helper); the `DrizzleSchemaCoding` exercise with a `<details>` answer; a `:::caution` for the CHECK-interpolation footgun; four `Term` tooltips (invariant/constraint/predicate/partial index). **One `VideoCallout` shipped** (`hjrQb029LEE`, Supabase CHECK-constraints walkthrough, ~8 min) — the outline proposed *no* video. Four `ExternalResource` cards (2 Drizzle docs incl. the case-insensitive-email guide, 2 Postgres docs — constraints + partial indexes). **No quiz, no `MultipleChoice`.** The four-shape ladder is carried by `Code` blocks + the two `CodeVariants`, not a `StateMachineWalker` (deliberate — two tools with triggers, not a branching decision).

## Lesson 8 — Many-to-many junction tables

**Taught:** N:M as a placement problem — neither parent column can hold the other's list, so the relationship lives in its own **junction table**. Two failed instincts motivate it: a single `tagId` FK column (that's 1:N) and `text().array()` (L3's exact verdict: array elements aren't rows, no FK, no JOIN). The canonical **pure junction** `invoiceTags` = exactly two `.notNull()` `cascade` FKs + a composite PK `primaryKey({ columns: [t.invoiceId, t.tagId] })` (L5's seeded mechanic, cashed in); the composite PK buys three things at once (pair-uniqueness, NOT NULL on both, index on the pair). The lesson's center of gravity is the **junction-vs-entity promotion decision**, decided by two ordered questions, and the exact four-part schema diff promotion forces.

**Cut:** None of substance — full outline scope delivered. (`joinedAt` as a standalone column folded into `...timestamps`, per outline's own "`createdAt` *is* the joined-at" guidance — not a cut.)

**Debts (forward-references made):**
- **Drizzle Relations v2 traversal** — junction is *data only*; `db.query.invoices.findFirst({ with: { tags: true } })` needs `defineRelations` — **L9** (explicit chapter-hook cliff-hanger; writes zero relations code, does **not** commit to the v2 `through(...)` call shape, L9 owns it).
- **The half-indexed junction (second-direction index)** — composite PK indexes `(invoice_id, tag_id)` left-to-right, so `WHERE tag_id = …` is a full scan until a second index leads with `tag_id` — **Ch 039 L1** (named as owed, not built; surfaced as a `:::caution`).
- Manual join through the junction to read "an invoice with its tags" — **Ch 038 L2** (relational `with` read **Ch 038 L3**).
- `memberships` at depth — `role`-based access, `tenantDb` query scoping, org switching — **Unit 10 / Ch 056+** (flag planted; teaches **no** auth/tenancy mechanics here).
- `$inferSelect`/`$inferInsert` on junction rows — **L10** (a junction row infers like any table; no special note).

**Terminology / mental models (reuse, don't redefine):**
- "**N:M is two 1:N relationships pointing inward at a junction table**" — the load-bearing visual/mental model; the junction is where the two inward-fanning one-to-manys meet. A junction is **a relationship reified as rows**: one row = one link between one row on each side.
- **junction table** (Term) = a table whose only job is to record links between two other tables. **composite primary key** (Term) = a PK over two-or-more columns; the *combination* must be unique, either column alone may repeat.
- "**A pure junction has no identity worth minting — the pair *is* the identity.**" Adding a surrogate `id` to a pure junction is a mild smell (extra column + index, *still* needs a `unique(pair)` to block dupes). This is L5's "composite PKs belong on junction tables and almost nowhere else," from the junction's side.
- **The promotion test — two ordered questions:** (1) does the link **carry its own data** (`role`, `joinedAt`, `quantity`, `status`)? (2 — the sharper one) does **anything else need to FK *to* the link** (an `invitations` row, an audit row)? Either "yes" ⇒ promote to entity; both "no" ⇒ stays pure. Reflex: "**a pure junction is a link; the moment the link has properties or a referent, it's a thing.**"
- "**You can't cleanly aim a foreign key at a composite key**" — the *deep* reason promotion adds a surrogate `id`: a referent needs one column to point at. The composite PK isn't deleted on promotion, it's **demoted** to a named `unique` (same no-double-join guarantee, different slot — `id` now owns identity).
- "**The moment you want to stamp *when* a link was made, you've already decided it's an entity**" — `createdAt`/`...timestamps` on a link is itself the promotion signal; a pure link has no lifecycle.
- **Junction naming is a real decision:** pure junction → `{parent1}_{parent2}` **alphabetized** (`invoice_tags`, not `tag_invoices` — alphabetical is just the bikeshed-killer); promoted entity → the **domain noun** the business says out loud (`memberships`, not `users_organizations`). The name is a tell.
- **Composite B-tree index serves a *left prefix*** — `(invoice_id, tag_id)` answers `WHERE invoice_id = …` but not `WHERE tag_id = …` (buried in second position → full scan). The single most common junction performance bug.
- **Three-or-more-FK junction = smell** — almost always two relationships disguised as one ("user tagged invoice" = `invoice_tags` + an actor column on an entity); split it.

**Patterns and best practices (for project chapters):**
- **Pure junction shape (reuse verbatim):** two `uuid().notNull().references(() => parent.id, { onDelete: 'cascade' })` FKs (cascade on **both** — a link is garbage without either endpoint) + `(t) => [primaryKey({ columns: [t.a, t.b] })]`. `primaryKey` imported from `drizzle-orm/pg-core`. **No surrogate `id`** on a pure junction.
- **Promoted-entity shape:** surrogate `id: uuid().primaryKey().default(sql\`uuidv7()\`)` (L5 canon) + the two FKs (still cascade) + the data column(s) (e.g. `role` via `pgEnum`) + `...timestamps` (L4) + demoted `unique('<table>_<a>_<b>_unique').on(t.a, t.b)` (L7 named-composite-unique shape). Drop the mashed name for the domain noun.
- `memberships` (user ↔ organization, with `role: pgEnum('member_role', ['owner','admin','member'])`) is the course's **canonical promoted-entity example and Unit 10's tenancy seam** — future agents building org/tenancy chapters should treat this exact table as the foundation, met first here purely as a data-modeling decision.
- Lesson prose uses bare builders under the `casing` policy; only the `DrizzleSchemaCoding` starter uses explicit snake_case strings (no `casing` client in sandbox), per L3–L7 staging.

**Misc.:**
- **`invoiceTags` finally built in full here** — seeded as a mechanic in L5, named in L6; this lesson is its canonical home. `tags` (L7, slug-unique) reused, not redeclared.
- New tables introduced: `memberships` + its `member_role` pgEnum (the promotion example); `users`/`organizations` already in domain. Both junctions' FKs are `cascade`.
- **Centerpiece component is the pure-vs-promoted `CodeVariants` diff** (two tabs, `ins=`/`del=` meta showing `+ id`, `− primaryKey({columns})` → `+ unique().on(...)`, `+ role`, `+ ...timestamps`). Supported by an `AnnotatedCode` build of `invoiceTags` (5 color-coded steps) and a D2 ER diagram (three tables, two edges fanning into the junction).
- **`DrizzleSchemaCoding` grader reality**: grader reads composite PK via `primaryKey: string[]` and composite unique via `uniques: string[][]` from config, but **cannot read `onDelete` or whether a unique/PK *fires*** — duplicate-pair rejection and cascade are **probe-only** (dup `(invoice_id, tag_id)` `mustSucceed:false`; orphan `tag_id` `false`; cascade-delete proven via a self-asserting `DO` block that errors if the link row survives, `true`; dup `(user_id, organization_id)` on `memberships` `false`). `seedSQL` uses fixed UUIDv7-shaped literals; all probe SQL snake_case. The exercise **reveal answer** uses plain `text('role')` (parenthetical notes `pgEnum('member_role', …)` is the production choice and grades identically) — pgEnum appears only in the CodeVariants centerpiece.
- **Build complete:** all components final — D2 ER diagram (`<Figure>`), `AnnotatedCode` (5 color-coded steps), pure-vs-promoted `CodeVariants`, half-index `<Aside type="caution">` + `<HalfIndexedJunction />` lesson component (`src/components/lessons/037/8/`), `DrizzleSchemaCoding` exercise, three `ExternalResource` cards (Drizzle Indexes & Constraints, Beekeeper Studio, DataCamp).

## Lesson 9 — Drizzle Relations v2

**Taught:** The chapter's TS-side traversal layer. A new fourth file `db/relations.ts` built incrementally on the running domain via `defineRelations(schema, (r) => ({...}))`: one-to-many/many-to-one (`organizations` ↔ `invoices`) with explicit `from`/`to`; the v2 one-sided-declaration convenience (bare reverse side, Drizzle infers it); `alias` to disambiguate two relations between the same pair of tables; many-to-many via `.through()` chained on **both** `from` and `to`; self-referential relations; and the "when to drop to manual joins" boundary. Writes the *graph*, not the queries.

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- Writing queries through the relational API (`db.query.…({ with })`, nested `where`/`columns`) — **Ch 038 L3** (shown only as motivation/payoff, never as a worked query; the `tags: Tag[]` cash-in is owed here).
- Hand-written joins (`db.select(...).leftJoin(...)`) — **Ch 038 L2** (named in the "when to skip" boundary only).
- The N+1 problem and how `with` avoids it — **Ch 039 L2** (named once as a forward pointer).
- `EXPLAIN ANALYZE` on a relational query — **Ch 039 L3** (the `logger: true` flag from L2 is the only inspection tool named here).
- Full `db/index.ts` client wiring (`drizzle(client, { relations })` with pooling, connection string, env validation) — **Ch 040 setup**. Only the isolated `{ relations }` config fragment is shown.
- Drizzle Kit migrations — relations emit **no** SQL and no migration; `db/relations.ts` is invisible to Drizzle Kit (only `schema.ts` is read) — **Ch 040**.
- `memberships` relation set built in full — named as shape only; depth (role-based access, tenancy scoping) — **Unit 10 / Ch 056+**.
- Inferred *relational result* types (`$inferSelect` does **not** include relations) — **L10 / Ch 038 L3**.

**Terminology / mental models (reuse, don't redefine):**
- "**Two declarations of the same edge for two audiences**" — the FK (write-time integrity guarantee, in `schema.ts`, the only file Postgres sees) and the relation (read-time traversal map, in `relations.ts`, only the `db.query` builder reads) are independent; **declaring one never declares the other.** This is the lesson's load-bearing distinction and the source of the #1 beginner bug (`with: { tags: true }` returns `undefined` because the relation was never declared, even with the FK right there).
- **`defineRelations(schema, (r) => ({...}))`** — two args: (1) the whole schema module passed as one object (gives `r` autocomplete for every table/column); (2) a callback returning a map **keyed by table name**, each value that table's relations. `r.one.<table>(…)` resolves to a single object, `r.many.<table>(…)` to an array, `r.<table>.<column>` references a column.
- **`from`/`to` go on the FK-holding side only.** `from` = the column on *this* table that holds the FK; `to` = the referenced PK it points at; `from → to` runs the same direction as the FK itself. The reverse (`r.many`) side is declared **bare** — Drizzle infers it by matching tables. v1 forced `fields`/`references` on *both* ends; dropping that is a headline reason the course picks v2.
- **Naming: singular for `one`, plural for `many`** (`organization` / `invoices`) — the relation key is the exact word typed inside `with: { … }`, so it should read like the data returned.
- **Declare both directions even when the reverse is bare** — a missing reverse isn't an error, it's a silent gap (that direction simply doesn't exist in `with`).
- **`alias`** — when two relations connect the same pair of tables (e.g. `invoices.assignedToId` *and* a future `createdById`, both → `users`), "match by table" is ambiguous; pass `alias: 'assignee'` / `alias: 'creator'` so the `with` keys stay distinct. Also applies to a table with two self-edges.
- **`.through()` chains onto BOTH `from` and `to`** — there is **no** top-level `through:` option. `from: r.invoices.id.through(r.invoiceTags.invoiceId)` (entry hop, into the junction) and `to: r.tags.id.through(r.invoiceTags.tagId)` (exit hop, out of it); the junction is named twice because the builder walks it as two joins. Nothing is declared *on* the junction table itself.
- **Pure junction → reach *through*; promoted entity → relate *to*.** `invoiceTags` (pure) is walked with `.through()`; `memberships` (carries `role` + own `id`) is related to directly (one-to-many from each parent in, `r.one` back to each parent) — the querying half of L8's junction-vs-entity decision.
- **Self-referential** = same `from`/`to`, both columns on one table (`parent: r.one` walks up, `replies: r.many` walks down via `parentId`). Recursive *tree* querying is out of scope (a query concern).
- **When to skip the relational API:** it's for **nested *tree* reads** (entity + its children as a nested object) — the safe default there. Drop to hand-written joins for non-trees: aggregates (`COUNT`/`SUM`), filtering *on* a joined table, arbitrary projections. The relational builder plans its own SQL toward assembling nested objects.

**Patterns and best practices (for project chapters):**
- **`db/relations.ts` is a fourth file** beside `schema.ts`/`columns.ts`/`index.ts`: import tables via `import * as schema from './schema'`, call `defineRelations(schema, (r) => ({...}))`, export a single `relations` const. Wired into the client with `drizzle(client, { relations })` (full setup Ch 040).
- Declare **both ends** of every relation; pin the edge **once** on the FK-holder with `from`/`to`, leave the reverse bare; reach for explicit-reverse or `alias` only to resolve genuine ambiguity.
- Many-to-many uses `.through()` on both sides; **no relations declared on a pure junction table**.
- Relational API for tree reads; manual joins for aggregates/projections/joined-table filters.

**Misc.:**
- **The course teaches v2 exclusively** (`defineRelations`, `from`/`to`/`through`), shipping in `drizzle-orm@1.0.0-beta` — consistent with L1's "forward-looking Drizzle 1.0" note. v1 surfaced for recognition only: now `[OLD]` in the docs, import moved to `drizzle-orm/_relations`, query helper to `db._query`, per-table `relations(<table>, ({ one, many }) => …)` shape. **No v1 code is written.**
- **Convention divergence flagged for the maintainer:** `Code conventions.md` §Data layer still lists v1 per-table `relations()` as the stable shape (v2 a parenthetical) — downstream agents must **not** normalize this lesson back to v1; the doc's relations bullet should be updated to v2 on the next maintainer pass.
- **Outline-vs-build correction:** the chapter outline guessed a top-level `r.many.tags({ through: r.invoiceTags })` — that is **not** the real shape. The lesson corrects it to `.through()` chained on both `from` and `to`; future lessons referencing junction traversal must use the chained form.
- Staging continuity held: tables reused verbatim from L4–L8 (imported, never redeclared), bare builders under the `casing` policy, PK shape `uuid().primaryKey().default(sql\`uuidv7()\`)`, `db/index.ts` wiring shown only as the isolated `{ relations }` line.
- **Check-your-understanding is interactive, not a coding exercise** (a relations graph can't be probed via SQL): one `MultipleChoice` (the silent-`undefined` cause), one `Dropdowns` (the four `.through()`/`from`/`to` blanks), one `Matching` (vocabulary lock). Centerpiece visual is a `<GraphExplorer>` (7 table nodes, relation edges, two `<Traversal>` walks: `invoice → lineItems`, `invoice → tags` through the junction).
- **Build complete.** Centerpiece visual shipped as `<GraphExplorer direction="LR">` (lesson-local component import; 7 table nodes, ~7 relation edges, two `<Traversal>` walks); the two-layer split shipped as a lesson-specific `<TwoLayers />` component at `src/components/lessons/037/9/two-layers.astro` (not a generic `<Figure>`). Both `AnnotatedCode` walks, the `CodeVariants` (bare vs explicit reverse), and the three CYU checks are all final. A `<VideoCallout videoId="N4-VDia4NcI">` (Nev the Dev, v1→v2 migration, 14 min) was added near the version-note section.

## Lesson 10 — $inferSelect and $inferInsert

**Taught:** The chapter capstone — cashes Principle #2 by deriving every downstream type from the schema. `type X = typeof table.$inferSelect` (full read row) and `typeof table.$inferInsert` (write shape), both at the **type level** via `typeof`. Per-column inference map (`text/uuid → string`, `numeric → string`, `timestamptz → Date`, `pgEnum → literal union`, `.array() → T[]`, `.notNull() → bare`, nullable → `T | null`). The read/write asymmetry via three rules: **default → optional**, **generated → omitted entirely**, **`.notNull()`-no-default → required** (optional ≠ omitted; optional ≠ nullable). Canonical placement/naming, composing narrower shapes from inferred types without restating fields, the prop-threading pattern, inference quirks, and the relations gap. A **types lesson, not a querying lesson** — zero runtime queries written.

**Cut:** None of substance — full outline scope delivered.

**Debts (forward-references made):**
- **drizzle-zod** mirrors the read/write split at runtime — `createSelectSchema` / `createInsertSchema` (`drizzle-orm/zod` subpath) — **Ch 042 L8** (named twice as the runtime half).
- Writing actual queries (`db.select`/`db.insert`, `where`/`orderBy`) — **Ch 038 L1**; elided query bodies only.
- **Custom-select result types** (a projecting `db.select({...})` infers narrower than `$inferSelect`; don't restate) — **Ch 038 L1**.
- **Relational-query nested result types** (`db.query.…({ with })`) — **Ch 038 L3**; this lesson only states `$inferSelect` is flat and points there.
- Server Action arg typing + `Result<T>` return shape — **Ch 043**; consumed in the schema→`$inferInsert`→drizzle-zod→action chain (names only).
- Migration half of the "edit schema, run tsc" loop — **Ch 040**.

**Terminology / mental models (reuse, don't redefine):**
- **`$inferSelect` = "everything stored, fully known"; `$inferInsert` = "only what the app must supply."** The asymmetry is the schema's own facts (defaults, generated, nullability) projected into TS, not Drizzle cleverness. **WRITE is a projection/subset of READ** (`select ⊇ insert`).
- Both accessed at the **type level** through `typeof table.$infer*` — never as a runtime value (the #1 beginner trip).
- **Three insert rules:** default (`.default`/`.defaultNow`/`.$defaultFn`) → **optional**; `.generatedAlwaysAs`/`generatedAlwaysAsIdentity` → **omitted**; `.notNull()` + no default → **required**. **`?: T` (optional, may omit) ≠ `: T | null` (nullable, may pass `null`).**
- **`numeric → string`** restated as the deliberate money/precision guarantee, never `parseFloat`'d (callback to L3); **`jsonb` without `$type<T>` → `unknown`** (fix upstream with `$type`, a compile-time promise Zod enforces at runtime); **enum-as-`text` → `string`** loses the union (fix = `pgEnum`). The reflex: **when inference is too wide, fix the schema, never cast at the consumer.**
- **`$inferSelect` is flat — it never carries relations.** An inferred `Invoice` has `organizationId: string` (raw FK), no nested `organization`/`lineItems`/`tags`. Nested shapes are a query-time concern (Ch 038 L3). The chapter's most common wrong expectation; guarded by the lesson's MCQ.
- **Composition tools** (reused from TS lessons, not re-taught): `Pick`, `Omit`, `Partial`, `&` intersection, `Type['field']` indexed access. Rule: **every derived shape roots in `$inferSelect`/`$inferInsert`; restate no field name.**
- **One type, one source** — the same `Invoice` threads schema export → query return → component prop → destructured param; a schema rename breaks every layer at compile time (the L1 counterfactual resolved).
- `InferSelectModel<T>` / `InferInsertModel<T>` named once as the **older generic-helper spelling** of the same types; course uses the `$infer*` property form throughout.

**Patterns and best practices (for project chapters):**
- **Co-locate type exports directly under each `pgTable` in `db/schema.ts`:** `export type Invoice = typeof invoices.$inferSelect;` / `export type NewInvoice = typeof invoices.$inferInsert;`. This is the one place writing a row `type` is correct (re-export of a derived shape, restates zero fields).
- **Naming convention (course standard, reuse verbatim):** select type = the **entity noun** (`Invoice`, `Organization`, `Membership`); insert type = **`New`-prefixed** (`NewInvoice`, `NewOrganization`, `NewMembership`).
- Downstream files import these as **`import type { … } from '@/db/schema'`** (type-only symbols; `verbatimModuleSyntax`/`import type` rule from Code conventions).
- **Update shapes:** `Partial<NewInvoice>` is the 80% default; the `id`-pinned `{ id: Invoice['id'] } & Partial<Omit<NewInvoice, 'id'>>` is the precise reach when "which row?" must be enforced — name the trade-off, don't reach reflexively.
- **Derived view shapes** root in inferred types via `Pick`/`Omit`/`&`/indexed access (canonical: `InvoiceSummary = Pick<Invoice, 'id'|'status'|'amountDue'> & { organizationName: Organization['name'] }`) — never hand-typed.

**Misc.:**
- **Chapter closed** — L1 named Principle #2, L2–L9 built `db/schema.ts`, L10 makes every downstream shape a branch of it; the hand-typed `type Invoice` is now *unnecessary*, not merely discouraged. No quiz here (Ch 037 L11 is separate).
- **Exercise vehicle is `TypeCoding`** (Twoslash `^?` + `@ts-expect-error`), a deliberate departure from L3–L8's `DrizzleSchemaCoding` — the answer is a *type*, not runtime SQL. Three `TypeCoding` exercises (read shape, write shape, compose) + one `MultipleChoice` (relations gap).
- **Deliberate divergences preserved:** uses the chapter-canonical SQL-side PK default `uuid().primaryKey().default(sql\`uuidv7()\`)` (L5), diverging from Code conventions' `$defaultFn` form — the `$inferInsert` asymmetry teaching is identical either way. drizzle-zod forward pointer uses the `drizzle-orm/zod` subpath (Drizzle 1.0). No version parenthetical on the `$infer*` helpers (stable + 1.0 identical).
- Tables reused illustratively, never redeclared: `invoices`, `organizations`, `users` (+ `emailLowercased` generated column from L4), `webhookDeliveries` (`payload: jsonb().$type<WebhookEvent>()` from L3). Canonical columns honored (`amountDue` numeric → `string`, `assignedToId` nullable → `string | null`).
- **Reusable infra added by this build (for future inference exercises in Units 5+):** TypeCoding's in-browser vfs ships only TS stdlib (no `node_modules`), so a real Drizzle import resolves to `any` and `$inferSelect`/`$inferInsert` never infer concrete shapes. Two pieces fix this and are reusable:
  - **`src/components/live-coding/_shared/drizzle-shim.ts`** — a **type-only** ambient shim modeling Drizzle's `pg-core` builders as `Col<T, Null, HasDefault>` phantoms, seeded into the Program root (same mechanism as ZodCoding's `zod-shim`). Models the per-column map, `.notNull()`/`.primaryKey()` flipping nullability, `.default*()` flipping HasDefault, and the select/insert asymmetry. **Generated columns are intentionally NOT modeled** (this lesson's tables use none) — add `generatedAlwaysAs()` to the shim if a later lesson's exercise needs the omit case.
  - **`ambient="drizzle"` prop on `src/components/live-coding/TypeCoding/TypeCoding.astro`** — opt-in flag that seeds the drizzle-shim; all three of this lesson's TypeCoding exercises pass `ambient="drizzle"`. Future Drizzle-type exercises set the same prop.
