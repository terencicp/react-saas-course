# Lesson outline — Chapter 037, Lesson 4

## Lesson title

- Title: `NOT NULL, defaults, and generated columns`
- Sidebar label: `Modifiers & defaults`

## Lesson framing

This is the **column-modifier** lesson: the student already knows the file shape (L2) and which Postgres type to pick per column (L3). Now they learn the three decisions that hang off *every* column after the type is chosen — **can it be null, does it carry a default, is it derived** — by chaining modifiers onto the builders from L3.

Pedagogical spine, established up front and reused in every section: **every column answers three questions in order.** Frame the whole lesson as that three-question checklist (nullability → default → derived), then teach one question per section. This is the mental model the student should leave with — when they write any future column they run the checklist. Keep cognitive load low by teaching each question in isolation against the running domain before combining them.

Teaching stance per the guidelines: decisions before syntax. The syntax here is trivial (method chaining); the senior content is *which* modifier and *why*, and the downstream cost of the wrong default. Two costs recur and should be made concrete, not abstract:

1. **Nullability is a tax paid downstream.** A nullable column becomes `T | null` in `$inferSelect`, and every read site pays a narrowing cost forever. This is the lesson's strongest "senior default" argument — `.notNull()` everywhere unless absence is a *meaningful state*. Connect explicitly to Principle #2 (the schema is the root, L1): the null/not-null choice here propagates into the inferred row type (L10), the drizzle-zod validator's required/optional field (Ch 042 L8), and the form field. One decision, four layers.

2. **App-side vs SQL-side defaults bypass each other.** `.default(...)`/`.defaultNow()` emit a SQL `DEFAULT` clause (fires for psql, migrations, any tool); `.$defaultFn(...)` and `.$onUpdate(...)` run *inside the Drizzle client* and are invisible to direct SQL. The senior reach is SQL-side when Postgres can compute it, because it survives tools that bypass the app. This "where does the default actually run" boundary is the section's key insight and a frequent beginner trap.

The lesson also delivers two reusable artifacts the rest of the chapter (and the Ch 041 project) builds on:

- **The reusable-columns pattern** (`db/columns.ts`): `id`, `createdAt`, `updatedAt`, sometimes `deletedAt` defined once and spread into every table. This is the payoff that makes NOT-NULL-everywhere + sensible defaults a one-line decision per table instead of 30 repetitions. It also pins the canonical `createdAt`/`updatedAt` shapes the whole course reuses.
- **The case-insensitive-email worked example** — `email` + an `emailLowercased` generated column — which is a *cliff-hanger into L7* (the unique index that makes it enforce case-insensitive uniqueness). The student leaves L4 with the generated column written and the reason it exists half-told; L7 closes it.

Critical accuracy points the writer must honor (fact-checked, see Scope/notes):

- **Drizzle's pg `.generatedAlwaysAs()` always emits `STORED`** and takes **no** `{ mode }` argument (that's MySQL/SQLite only). Postgres 18 changed the *raw SQL* default for bare generated columns to **VIRTUAL** (computed on read, **not indexable**). Teach STORED as what the Drizzle builder produces and what you want for the indexable email case; mention VIRTUAL as a raw-Postgres-18 platform note the student should recognize, not a Drizzle toggle they flip today. Getting this wrong (claiming `{ mode: 'stored' }` in pg, or that the Drizzle builder gives you a choice) is the single biggest factual risk in this lesson.
- `.$onUpdate(() => new Date())` is the runtime updatedAt mechanism (alias `$onUpdateFn`); it does **not** affect Drizzle Kit / migrations and is bypassed by raw SQL — same caveat as `$defaultFn`.

Stay on the **stable Drizzle surface** the continuity notes pinned for L2/L3 (object-form options like `numeric({ precision, scale })`, `bigint({ mode })`; no Drizzle 1.0 beta APIs). No version parenthetical is needed in this lesson — every modifier taught here is unchanged in 1.0 — except the one already-established `$inferInsert` forward-reference convention.

Estimated length matches the outline's 40–50 min: four teaching sections, one or two diagrams, two interactive checks. Decisions-first, terse, no bootcamp scaffolding.

## Lesson sections

### Introduction (no header)

Open with the three-question checklist as the lesson's organizing promise: *the type tells Postgres what can be stored; three more decisions per column decide what's allowed, what fills in, and what's computed.* Connect to L3's keeper-defaults table (the student just chose types) and frame this as "now finish each column." Preview the payoff: by the end they have a `db/columns.ts` they spread into every table, and the start of case-insensitive email uniqueness.

One short visual aid here earns its place: a **labeled anatomy of a single column declaration** showing the chain `builder → .notNull() → .default(...) → ...` with each link tagged by the question it answers (type / null? / default? / derived?). Use **hand-coded SVG inside a `<Figure>`** (per diagrams index: "picture of a specific thing", an annotated illustration of one line of code). Pedagogical goal: give the student the mental "slot machine" of a column before any prose, so each later section snaps into a known slot. Keep it one row, under ~200px tall.

### NOT NULL is the senior default

The lesson's most load-bearing section — teach it first and at most depth.

- **The default is backwards from intuition.** A bare `text()` from L3 is *nullable*. Show the contrast: `text()` vs `text().notNull()`. State the rule: `.notNull()` on every column unless "this fact is genuinely unknown / absent is a meaningful state" applies.
- **Make the downstream cost concrete with a `CodeTooltips` block** on a tiny two-column table (`name: text()` vs `name: text().notNull()`), tooltips on each `name` showing the inferred member — `string | null` vs `string`. This is the cheapest way to show the tax without yet teaching `$inferSelect` mechanics (L10 owns those). Goal: the student *sees* `| null` appear and understands "every read site now narrows." Tie back to Principle #2: this `| null` is generated, not chosen at the read site — fix it at the schema or pay forever.
- **The Zod-boundary parallel** (brief, forward-ref only): the same default reappears at validation — Zod fields are required unless `.optional()`; drizzle-zod (Ch 042 L8) *reads* NOT NULL from this column and emits the matching required/optional field. One decision here = the validator's shape later. Do not teach drizzle-zod syntax.
- **When null is right.** The carve-out: `deletedAt: timestamp({ withTimezone: true })` left nullable on purpose — null *means* "live row", a timestamp means "soft-deleted". Absence is the meaningful state. This both justifies the rule's exception and plants `deletedAt` (used by the reusable-columns pattern below and by soft-delete in Ch 039 / L6's hard-vs-soft mention). Optional/nullable assignees (`assignedToId`) as a second example.
- Watch-out, inline: nullable columns proliferate `?.`/narrowing across the whole codebase; the cost is invisible at write time and unbounded at read time.

Components: `Code` for the bare contrast; `CodeTooltips` for the inferred-type reveal. Terms: see term list.

### Three kinds of default

Teach the **DEFAULT trio** as a decision, not three isolated APIs. The organizing question: *who computes the fill-in value, and does it survive code paths that skip the app?*

- **The three forms**, each with its one-line "reach when":
  - `.default(literal)` — a constant SQL `DEFAULT` (`status` → `'draft'`, `quantity` → `1`). Postgres fills it.
  - `.defaultNow()` — the canonical `createdAt` default; Postgres fills `now()`. Reuse L3's `timestamp({ withTimezone: true })`.
  - `.$defaultFn(() => ...)` — runs in TS in the Drizzle client *before* insert, for values that need code (a slug derived from another field, a client-side id generator). Names L5's `uuidv7()` PK as the headline case *without* teaching the PK decision (L5 owns it) — just "this is the hook L5 uses."
- **The boundary that matters — where the default runs.** This is the section's senior insight. Use a **two-column `CodeVariants`** (or a small two-panel `TabbedContent` diagram) contrasting *SQL-side* (`.default`/`.defaultNow`) vs *app-side* (`.$defaultFn`): for each, mark whether it fires on (a) `db.insert` via Drizzle, (b) a raw `INSERT` in psql, (c) a Drizzle Kit migration seed. SQL-side: all three. App-side: only via Drizzle. Pedagogical goal: cement "`.$defaultFn` is invisible to anything that bypasses Drizzle" as a *picture*, not a sentence — this is the most-missed fact. State the senior rule: **prefer SQL-side when Postgres can compute the value**; reach for `.$defaultFn` only when the value genuinely needs TS.
- **`$inferInsert` foreshadow** (one sentence, the chapter's standing convention): any column with a default becomes *optional* in the insert type — you may omit it. L10 owns the mechanics. This motivates "defaults are also an ergonomics decision."
- Watch-outs, inline: `.defaultNow()` is correct **only** on `timestamptz` — on plain `timestamp` (L3's named anti-pattern) it silently stores server-local time and the bug hides until a region changes; `.$defaultFn` does not run for raw SQL inserts.

Components: `CodeVariants` for the SQL-side/app-side firing comparison. Keep each pane ≤ a few lines.

### The updatedAt pattern

A focused sub-case of defaults that every SaaS table needs, kept as its own short section because it introduces a *new* modifier (`$onUpdate`) and a real production caveat.

- **The canonical shape**, presented as one line to memorize:
  `timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date())`.
  Walk it with `AnnotatedCode` (the chain is the whole point and each link answers a different question): step 1 the type+tz, step 2 `.defaultNow()` (initial value on insert), step 3 `.notNull()`, step 4 `.$onUpdate(() => new Date())` (re-stamped on every Drizzle update). Color the `$onUpdate` step to flag it as the new piece. Goal: the student can reproduce this exact line and knows what each modifier contributes.
- **The caveat that makes it a senior topic.** `.$onUpdate` runs at the **Drizzle layer only** — a raw `UPDATE` in psql, a bulk SQL migration, or a different service writing the table will **not** re-stamp `updatedAt`. Same family as `$defaultFn`. Name the prod-grade fix once: a Postgres `BEFORE UPDATE` trigger that stamps `updated_at` regardless of who writes — added as a one-time migration in **Ch 040 setup**, not built here. State the tradeoff plainly so the student knows the app-layer version is the pragmatic default and the trigger is the upgrade.

Components: `AnnotatedCode` for the four-link chain.

### Define your boilerplate columns once

Cash in the previous three sections into the **reusable-columns pattern** — the artifact the project depends on.

- **Motivation:** `id`, `createdAt`, `updatedAt` (and often `deletedAt`) appear on essentially every table. Restating them 30 times invites drift (one table forgets `.notNull()` on `updatedAt`) and buries the decision. Define once, spread everywhere.
- **The file:** `db/columns.ts` exporting plain objects (or a small builder) of column definitions, e.g. a `timestamps` object (`createdAt`, `updatedAt`) and a `softDelete` object (`deletedAt`). Show the canonical contents — these pin the course-standard shapes:
  - `createdAt: timestamp({ withTimezone: true }).defaultNow().notNull()`
  - `updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date())`
  - `deletedAt: timestamp({ withTimezone: true })` (nullable, the meaningful-absence exception from §2)
- **The spread:** show a `pgTable` consuming it via `...timestamps` in the column map. Use `CodeVariants` (or two `Code` blocks) before/after: a table with the four columns hand-written vs the same table with `id, ...timestamps`. The "after" is dramatically shorter — that contrast *is* the lesson.
- **Boundaries to state:** the `id` column shape is *named here but owned by L5* (UUIDv7) — in this lesson show `id` as a placeholder or reuse L2's bare `.primaryKey()` and note L5 finalizes it (matches the L2 deliberate-staging divergence; flag it so downstream agents don't "fix" it). Keep the pattern about the timestamp columns, which this lesson fully owns.
- Watch-out: spreading is a shallow copy of *column builders*; each table gets its own columns (builders are per-table definitions, not shared mutable state) — head off the "are they aliased?" worry in one sentence.

Components: `CodeVariants` for the before/after table. `FileTree` optional to show `db/columns.ts` joining `schema.ts`/`relations.ts`/`index.ts` (only if it aids orientation; L2 already established the folder).

### Generated columns: let Postgres compute the value

The third checklist question — *is this column derived?* — and the lesson's most novel material.

- **Definition first, simplest version:** a generated column is one **Postgres computes from other columns in the same row**; you never insert or update it directly. Start with a trivial example (`fullName generatedAlwaysAs(sql\`first_name || ' ' || last_name\`)`) so the concept lands before the real use case.
- **The Drizzle shape:** `.generatedAlwaysAs(sql\`...\`)`, with the SQL expression referencing sibling columns. Show all three input forms briefly (string literal, `sql` tag, callback returning `SQL` for column refs) but standardize on the `sql` tag / callback. **Accuracy gate:** in Drizzle pg this **always emits `STORED`**; there is **no `{ mode }` argument** in pg-core (that's MySQL/SQLite). Do not imply the student picks the mode in the builder.
- **STORED vs VIRTUAL — the platform note.** Brief, framed as recognition not a toggle:
  - STORED = computed on write, persisted to disk, **indexable**, costs storage and recomputes when inputs change. This is what Drizzle's builder gives you and what you want for anything you'll index or filter.
  - VIRTUAL = computed on read, no storage, **not indexable**. **Postgres 18 made VIRTUAL the default for bare `GENERATED ALWAYS AS` in raw SQL** — a real gotcha if you hand-write DDL expecting the old STORED default. Drizzle's pg builder still produces STORED, so the student's schema is unaffected, but they should recognize the raw-SQL default flipped. (One sentence; this is the fact-checked correction to the outline's "STORED is the production default" framing — STORED is still the *Drizzle* default, but no longer the *raw Postgres* default.)
- **The worked example — case-insensitive email (cliff-hanger to L7).** Build it:
  - `email: text().notNull()`
  - `emailLowercased: text().generatedAlwaysAs(sql\`lower(${users.email})\`)`
  Explain the *why* only halfway: storing a lowercased copy means a future **unique index on `emailLowercased`** enforces "no two users with the same email regardless of case" with zero application code — and **L7 (UNIQUE constraints) adds that index.** Explicitly tee up L7 so the student expects the payoff. This is cleaner than a `LOWER(email)` expression index because it's a real column the app can also read. Goal: the student writes a generated column for a concrete reason and carries an open loop into L7.
- **The read-only consequence + `$inferInsert`.** A generated column **cannot be supplied on insert** — and `$inferInsert` *omits it entirely* (not optional — absent), so TS won't even let you pass it; raw SQL inserts that try will be rejected by Postgres. One forward-sentence to L10. Also: updating any input column **recomputes** the stored value (and rewrites that row) — the STORED tradeoff.
- Other senior reaches, named not built: derived totals; `tsvector` for full-text (the STORED-generated-column pattern, **Ch 038 L8** owns it). One line each.
- Watch-outs, inline: can't insert/update a generated column (the type system enforces it via `$inferInsert`); STORED recomputes on every input update (write cost on hot columns); the expression can only reference columns in the *same row* (no subqueries/other tables).

Components: `AnnotatedCode` on the email example (highlight the `email` source, the `generatedAlwaysAs(sql\`lower(...)\`)` link, and a callout that the unique index is coming in L7). `CodeTooltips` optional to show `emailLowercased` absent from `$inferInsert`.

### Practice: finish the columns

An interactive check placed at the end of the body (not a trailing quiz — it consolidates the four decisions). Two complementary pieces:

1. **A `Buckets` classification drill** (fast, low-friction, checks the *decisions*): sort a set of column descriptions into **`.notNull()` / nullable** or into **SQL-side default / app-side default / generated / no default**. Items drawn from the running domain: "an invoice's `status`, always starts at draft" → SQL-side default; "a user's `deletedAt`" → nullable / no default; "`createdAt`" → SQL-side default + notNull; "`emailLowercased` from `email`" → generated; "a slug computed in TS from the title at insert" → app-side default. Pedagogical goal: rehearse the three-question checklist as pure judgment before syntax.

2. **A `DrizzleSchemaCoding` exercise** (the real skill — writing the modifiers): give a starter `users`/`invoices` schema from the running domain with bare columns and have the student add the modifiers. `requirements` assert `notNull`/`hasDefault` per column; add a **probe** pair to prove the generated column works — an INSERT that omits `emailLowercased` succeeds, and a `SELECT` (via seedSQL + probe) showing `lower()` was applied; optionally a probe that an INSERT *supplying* `email_lowercased` is rejected (proves read-only). Note for the builder: `DrizzleSchemaCoding`'s `ColumnRequirement` has `notNull` and `hasDefault` but **no** generated-column flag — so the generated column must be verified via **probes**, not a requirement field. Keep the schema small (two tables) to stay under the editor height.

Place the `Buckets` drill right after the defaults sections conceptually fits, but grouping both at the end keeps one consolidation beat; the writer may split the bucket drill up into §3 if flow is better. Prefer the guided `DrizzleSchemaCoding` over any sandbox.

### External resources (optional)

One or two `ExternalResource` cards: Drizzle's Generated Columns doc and the PG column-types page. Optionally the Postgres 18 generated-columns docs page given the VIRTUAL-default change is recent and load-bearing. No YouTube video proposed — the material is short, syntax-light, and better served by the inline diagrams and the live exercise than by video.

## Terms (Tooltip / `Term` candidates)

Strategic, only those that support the goals without breaking flow:

- **DEFAULT clause** — the SQL `DEFAULT` Postgres attaches to a column; fires on insert when the column is omitted. (Distinguishes SQL-side from app-side.)
- **STORED (generated column)** — computed on write and persisted to disk; indexable.
- **VIRTUAL (generated column)** — computed on read, not stored, not indexable; Postgres 18's new default for bare generated columns.
- **`timestamptz`** — re-explain in one line (Postgres timestamp-with-time-zone; stores UTC) since `.defaultNow()`/`updatedAt` correctness depends on it; established in L3 but worth a probe-able reminder at the `defaultNow` watch-out.
- **soft delete** — marking a row deleted with a `deletedAt` timestamp instead of removing it; justifies the nullable carve-out. (Brief; Ch 039 owns depth.)
- **B-tree index** — only if referenced when explaining why STORED (indexable) matters for the email case; otherwise skip (L5/L7 territory).

Do **not** add Terms for `notNull`, `default`, or other modifiers shown directly in code — they're taught in prose, not defined in tooltips.

## Scope

**Prerequisites (assume taught, restate in ≤1 sentence if needed):**
- The `db/` folder, `pgTable(name, columns)`, the key→builder pairing, and `casing: 'snake_case'` on the client — **L2**. This lesson chains modifiers onto those builders; do not re-teach the file shape or casing.
- Which Postgres type per column, and the per-column defaults table — **L3**. Reuse `text`, `timestamp({ withTimezone: true })`, `numeric({ precision, scale })`, `pgEnum` shapes as given; do not re-survey types. The plain-`timestamp` anti-pattern is L3's; cite it, don't re-derive it.
- Principle #2 / the derivation tree, `$inferSelect`/`$inferInsert` as *named generators* — **L1**. Reference the propagation; don't teach inference mechanics.

**Explicitly out of scope (owned elsewhere — name and defer, do not teach):**
- **Primary-key generation** (UUIDv7 via `uuidv7()`, `bigint generatedAlwaysAsIdentity`) — **L5**. Show `id` as a staged placeholder/bare `.primaryKey()` in `db/columns.ts`; flag the divergence.
- **Foreign keys, `.references()`, `onDelete`** — **L6**. (Hard-vs-soft delete is L6/Ch 039; this lesson only introduces the nullable `deletedAt` column, not the delete strategy.)
- **The UNIQUE index that makes `emailLowercased` enforce case-insensitive uniqueness** — **L7**. This lesson writes the generated column and tees up the index as a cliff-hanger; it must **not** write `unique()`/`uniqueIndex()`.
- **`$inferSelect`/`$inferInsert` mechanics** — how defaults make insert fields optional and generated columns omitted — **L10**. One-sentence foreshadows only.
- **drizzle-zod** turning NOT NULL into required/optional Zod fields — **Ch 042 L8**. Parallel named, syntax deferred.
- **Postgres triggers** for `updatedAt` — **Ch 040 setup**. Named once as the prod-grade upgrade; not built.
- **`tsvector` full-text generated columns** and `jsonb` query operators — **Ch 038 L8 / L9**.
- **Soft-delete query filtering** (`where deletedAt is null`, partial uniques on it) — **Ch 039 / L7**.

**Deliberate code divergences (flag for downstream agents, do not "fix"):**
- `id` left as a placeholder/bare `.primaryKey()` (L5 owns the UUIDv7 shape) — mirrors L2's staging.
- Stays on the stable Drizzle surface (object-form options, no 1.0 beta) per L2/L3 continuity; every modifier here is 1.0-stable so no version parenthetical needed.
