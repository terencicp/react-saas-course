# Tables, rows, and 3NF

- Title: Tables, rows, and 3NF
- Sidebar label: Tables, rows, 3NF

## Lesson framing

This is the conceptual opener for Unit 5. It teaches the **relational model** (tables, rows, typed columns, primary keys, foreign keys) and **3NF as the default schema shape**, with the three legitimate triggers for denormalization. It writes **zero Drizzle** — no `pgTable`, no queries, no Drizzle Kit. Those are chapters 037, 038, 040. This lesson installs the *mental model* the rest of the unit encodes and is load-bearing for every schema, query, and migration in Units 5–23.

The spine is one **senior question**: given a SaaS feature spec, what shape does the data take *on disk*, before any code is written? Lead every section with the decision, not the syntax. The thesis the student should internalize: the schema is decided up front, in the relational shape Postgres expects, and that shape constrains every component, query, and API surface downstream. Name (don't teach) the forward link — this is why chapter 037 makes `db/schema.ts` the source of truth.

Pedagogical strategy, tuned to the two places beginners struggle:

1. **Normalization theory is over-taught academically and feels abstract.** Do not lead with functional-dependency notation or formal definitions. Lead with the *failure it prevents* — the update anomaly — shown concretely on rows. Give the course's working definition early and repeat it: **"every fact lives in exactly one place."** Treat 1NF/2NF/3NF as three named checks against that one idea, not three separate theories. Name BCNF/4NF/5NF once and drop them.
2. **Beginners over-denormalize because it feels easier up front.** Comma-separated columns and `jsonb`-everything look simpler when you start; the pain (update anomalies, lost type safety) lands months later in production. Make that delayed cost visible. Frame denormalization as a *measured response to a read pattern, never a starting point.*

Mental model the student ends with: a database is a set of tables; a table is a set of rows; a row is a set of typed columns; one column (or composite) is the primary key; foreign keys wire rows to rows. Start at 3NF. Denormalize only against a measurement. Postgres is the engine.

Keep cognitive load low: build the worked four-table schema incrementally (one table at a time) rather than dropping the finished ER diagram at once. Code samples are **illustrative SQL DDL** (`CREATE TABLE`) so the student sees the concrete shape behind the abstract model — but the lesson never asks them to *write* Drizzle. Diagrams (ER schema, the three cardinalities) carry the relational structure; one decision-tree widget carries the denormalization call; small classification/recall exercises check the normalization rules.

Connect to prior knowledge: by Unit 5 the student has built UI and routes (the list-plus-detail project, ch035). The hook: what *backs* that list of items? This lesson answers "what shape is the data underneath."

## Lesson sections

### Introduction (no header)

Open on the senior question with a concrete spec the lesson reuses throughout: a billing feature — organizations have invoices, each invoice has line items, invoices can be tagged. Before a single component or query exists, a senior decides the *shape of the data on disk*. State the payoff: by the end the student can take a feature spec and sketch the tables, columns, keys, and relationships it needs, normalized so every fact lives in one place — the blueprint chapter 037 will encode in code. Keep it to a short paragraph or two; warm, terse, no bootcamp throat-clearing. Name that this shape constrains everything built on top of it, which is why it's decided first.

### A database is tables, rows, and typed columns

Teach the relational model in its simplest form, one layer at a time to minimize load. Sequence: database → set of tables; table → set of rows; row → set of typed columns. No graph, no document, no objects — just sets and references. Emphasize **typed columns** as the load-bearing idea: each column declares a type (`text`, `integer`, `timestamptz`, `boolean`, `numeric`) and Postgres rejects anything that doesn't fit, at the boundary, on write.

Why typed columns matter (senior framing): the database is the **last line of defense** when application code, a Zod schema, or a migration drifts. A type declared in TypeScript can be bypassed; a column type in Postgres cannot. This is the seed of the later anti-pattern — "stringly-typed everything" / `jsonb` for all the things — which moves the constraint up into application code where it can be skipped. Plant it here, pay it off in the denormalization section.

Visual: a single small annotated `organizations` table rendered as an HTML table (header row = column names + their types, two or three data rows). Wrap in `<Figure>`. Pedagogical goal: make "rows and typed columns" literal before any SQL or ER notation. Keep it tiny (3 columns, 3 rows).

Show the concrete shape with an illustrative SQL DDL block (`Code`, `lang="sql"`) — a minimal `CREATE TABLE organizations` with `id`, `name text not null`, `created_at timestamptz not null default now()`. Frame it explicitly as "this is what the shape looks like in raw SQL; you won't write this by hand — chapter 037 generates it from a Drizzle schema." This keeps the student oriented (they see SQL exists) without teaching DDL authoring.

Version note for the author: the lesson should make **no claim about which Postgres major is current** — the relational model is version-agnostic and that's lesson 2's territory. If a version must appear anywhere, it is **Postgres 18** (current stable since Oct 2025; Neon supports 14–18). Do not write `postgres:17` — that image tag belongs to lesson 2's Docker setup, not here.

`Term` tooltips here: `DDL` (Data Definition Language — the SQL that defines table shapes, as opposed to the SQL that reads/writes rows). Optionally `timestamptz` (Postgres timestamp-with-time-zone) if it reads as noise.

### Primary keys and foreign keys: how rows point at rows

Two short subsections under one header — the vocabulary of identity and relationship. Keep both deliberately shallow; the deep decisions are chapter 037 and must not be pre-empted.

**Primary key.** Every row needs a unique identifier — one column (or a composite) that names that row unambiguously. Give the one-line definition and stop. Explicitly defer the surrogate-vs-natural decision (UUID/bigserial vs email/slug) to chapter 037 with a single forward-pointing sentence — name it so the student has the word "primary key" when normalization needs it, nothing more.

**Foreign key.** A column in table A whose values must exist as a primary key in table B — the database-level expression of "this row belongs to that one." One-line definition, one concrete instance from the worked spec ("each invoice carries the `id` of the organization it belongs to"). Defer cascade behavior (`ON DELETE` / `ON UPDATE`) to chapter 037 in one sentence.

Tiny visual: two boxes (`invoices.organization_id` → `organizations.id`) with a single arrow, conveying "FK points at PK." A minimal `<ArrowDiagram>` inside `<Figure expandable={false}>` (ArrowDiagram must opt out of expand), or a two-table D2 `sql_table` snippet with one edge. Prefer the D2 `sql_table` mini-diagram for consistency with the larger ER diagram later. Pedagogical goal: cement the direction of the reference (many-side holds the FK) before the worked example scales it up.

`Term` tooltips: `primary key`, `foreign key` only if the prose doesn't already define them inline (it does — so likely skip, to avoid redundancy). Lean on inline definitions over tooltips here.

### Every fact in one place: normalizing to 3NF

The conceptual heart of the lesson. Lead with the **problem**, not the theory.

Open with a deliberately bad table: a single `invoices` table that crams in the organization's name, the organization's billing email, and a comma-separated `tags` column. Show it as rows (HTML table in a `<Figure>`, or a `CodeVariants` "Denormalized" tab). Then demonstrate the **update anomaly** concretely: the organization renames itself, and now the same fact (org name) is duplicated across twelve invoice rows — update eleven, miss one, and the data lies. And the comma-separated `tags` can't be queried, constrained, or indexed sanely. This is the felt pain that motivates everything below. Name it: **the same fact stored in two places will eventually disagree.**

Then introduce the course's working definition as the fix: **every fact lives in exactly one place.** Normalization is the discipline of getting there.

Now the three normal forms, framed as three checks against that one idea (pragmatic, not academic):

- **1NF — atomic columns.** One value per cell. No comma-separated lists (`tags: "urgent,paid,q3"`), no numbered repeating groups (`address1`, `address2`, `address3`). The comma-separated `tags` column from the bad example is the 1NF violation; fixing it means a separate row per tag.
- **2NF — every non-key column depends on the *whole* primary key.** Only bites when the primary key is **composite**. Give the canonical example: a junction-style table keyed on `(invoice_id, product_id)` that also stores `product_name` — `product_name` depends only on `product_id`, half the key, so it belongs in a `products` table. Keep it short; flag that with single-column surrogate keys (the common case) 2NF is usually satisfied for free.
- **3NF — no non-key column depends on another non-key column.** The "city implies zip" trap, or in the worked domain: storing `organization_name` on `invoices` when it's really a fact about the organization (a non-key column determined by the FK to another non-key fact). The fix: move it to `organizations`, reference by FK.

Use `AnnotatedCode` (lang `sql`) over the bad single-table DDL to walk the three violations one at a time — step 1 highlights the comma-separated `tags` (1NF), step 2 the duplicated `organization_name`/`organization_email` (3NF), with a short note that 2NF needs a composite key to even apply. One code block, focused attention on each violation in turn — exactly AnnotatedCode's purpose. Color the highlights (red for the violating columns).

Name and drop: **BCNF, 4NF, 5NF** exist; the course stops at 3NF because most SaaS data fits 3NF without strain and the higher forms rarely earn their complexity. One sentence.

`Term` tooltips: `atomic` (single, indivisible value — not a list or struct packed into one cell), `update anomaly` (when duplicated data is changed in one place but not another, leaving the database internally inconsistent), `composite key` (a primary key made of two or more columns together).

Exercise — `Buckets` (two-column): classify a set of column/table designs into **"Fine as-is"** vs **"Normalization failure"** (or three buckets: `1NF violation` / `3NF violation` / `Properly normalized`). Items: a comma-separated `roles` column; `city` + `zip` + `state` all on a `users` table where zip determines city/state; a clean `order_id` FK on a `line_items` table; a `full_name` split the student must judge; `tag_csv text`. Goal: active recall of *which violation each smell is*, not pattern-matching prose. Keep item phrasings different from the lesson's wording (per MultipleChoice guidance, applies here too).

### The worked schema: invoices, organizations, line items, tags

Pay off the running spec by building the normalized four-table shape incrementally — the concrete picture of "every fact in one place." This is the section that turns the rules into a real schema.

Build it up one table at a time to keep load low, then show the whole. Tables:

1. `organizations` — the tenant. `id` (PK), `name`, `billing_email`.
2. `invoices` — FK `organization_id` → `organizations.id`. `id` (PK), `number`, `status`, `issued_at`, `total`.
3. `invoice_line_items` — FK `invoice_id` → `invoices.id`. `id` (PK), `description`, `quantity`, `unit_price`. (This is where the 1:N from invoice to line items lives.)
4. `tags` + `invoice_tags` — `tags` (`id`, `name`), and the **junction** `invoice_tags(invoice_id, tag_id)` wiring the N:M. Note that the junction's PK is the composite `(invoice_id, tag_id)` — tying back to the 2NF discussion. Explicitly defer junction *mechanics* (how Drizzle expresses it) to chapter 037 in one sentence.

Centerpiece diagram: an **ER diagram** of all four+junction tables, D2 `shape: sql_table` (top pick for ER per the diagram index), with `{constraint: primary_key}` / `{constraint: foreign_key}` on the relevant columns and labeled edges showing the relationships. Wrap in `<Figure caption=...>`. Because laptop viewports are short, let the tables stack/flow naturally (ER schemas are the documented exception to `direction: right`); bump font size if the viewBox downscales hard. Pedagogical goal: the student sees what "every fact in one place" *looks like* as a whole schema before chapter 037 expresses it in Drizzle — org name lives only in `organizations`, a tag name only in `tags`, each invoice's org is a single FK.

Optional enhancement: present the incremental build as a `DiagramSequence` (step 1 = just `organizations`; step 2 add `invoices` + FK edge; step 3 add `invoice_line_items`; step 4 add `tags` + `invoice_tags`). Each step is the growing ER diagram. This directly serves the "simplified first, add complexity gradually" guideline. If a DiagramSequence of four D2 blocks is too heavy to author, fall back to a single final ER `<Figure>` plus prose walking the build order. Author's call — note this is a deliberate either/or.

Exercise — `SQLCoding` **sandbox** (no `expectedRows`, `instructions` framing it as exploration): seed the four-table schema with a handful of rows and let the student run a read that joins invoices to their organization and tags. Frame strictly as "see that normalized data is still easy to read back" — *not* a query-writing lesson (queries are chapter 038). Keep `starter` as a working `SELECT ... JOIN` the student can tweak. Pedagogical goal: dispel the beginner fear that normalization makes data hard to get at — the join is one line. Set `hideSeed={false}` so they can inspect the schema/rows. If including this risks reading as "teaching queries," demote to a single read against one table, or cut — flag for the author to judge against scope.

### One-to-one, one-to-many, many-to-many

The three cardinalities, each as a one-line shape the student can recognize and reach for. Tie each back to the worked schema.

- **1:1** — collapses into one table, or two tables sharing a key (one row in A ↔ at most one row in B). Example: a `user` and its `user_settings` row. Note it's the rarest; often a sign the two should be one table unless there's a reason to split (optional/large/separately-permissioned columns).
- **1:N** — one foreign-key column on the **many** side. The worked case: one `invoice` has many `invoice_line_items`; the FK lives on the line item. This is the workhorse relationship — most relationships are 1:N.
- **N:M** — a **junction table** with two foreign keys, one to each side. The worked case: `invoice_tags`. Reiterate (don't re-teach) that the junction PK is the composite of the two FKs. Defer junction-table mechanics to chapter 037.

Visual: `TabbedContent` with three tabs (`1:1`, `1:N`, `N:M`), each holding a minimal D2 `sql_table` ER mini-diagram of just the two (or three) tables and the edge(s) for that cardinality, with a one-line caption. Pedagogical goal: a compact, switchable reference that isolates each shape — the student leaves able to map "this entity has many of those" to "FK on the many side" and "these two relate many-to-many" to "junction table." TabbedContent provides its own card; do not wrap in `<Figure>`.

`Term` tooltip: `junction table` (a table whose only job is to connect two other tables, holding a foreign key to each; the relational way to express many-to-many). `cardinality` if it reads as jargon.

### Start at 3NF, denormalize only on a measurement

The senior judgment section — the payoff of the whole lesson and the part juniors get most wrong. Two moves: assert the default, then gate the exception behind a measurement.

**The default is 3NF.** Start normalized. The engine, the query planner, and foreign-key constraints all earn their weight on a normalized schema, and most SaaS data fits 3NF without strain. Normalized is the *correct* default, not a beginner simplification you grow out of.

**Denormalization is a measured response to a read pattern, never a starting point.** This is the line to hammer. The three **legitimate triggers**:

1. **A hot read path where the join cost is measured and material.** The example: a high-traffic feed showing a username next to every comment — if profiling shows the join to `users` is the bottleneck, copying the username onto the comment row is a defensible trade. Stress *measured* — you've run the numbers, not guessed.
2. **Reporting/aggregate tables built by jobs, not by hand.** Precomputed rollups (daily revenue per org) maintained by a scheduled job, kept separate from the source-of-truth tables. The denormalized copy is derived and rebuildable, never the authority.
3. **`jsonb` for genuinely shapeless data.** Audit-log payloads, raw third-party webhook bodies — data with no stable schema worth modeling. Name that querying `jsonb` is chapter 038 (lesson 9); here it's only "this is the one place a shapeless blob is the right call." Tie back to the typed-columns lesson: this is the *exception* that proves the rule — you accept losing column-level type safety precisely because there's no schema to enforce.

**The wrong trigger:** "joins feel slow" without evidence. Vibes are not a measurement. State plainly that the actual bottleneck is almost always missing **indexes** (chapter 039), not the number of joins, and that `EXPLAIN ANALYZE` (also chapter 039) is how you'd find out — named, not taught. Premature denormalization is premature optimization: you pay the update-anomaly cost up front for a performance win you never measured.

Decision widget — `StateMachineWalker` (`kind="decision"`), titled e.g. "Should I denormalize this?". The walk forces the senior question order:
- root: "Is the normalized schema actually a measured bottleneck?" → No → **Leaf: Stay normalized** (3NF is the default; the join cost you're imagining is usually an index problem — chapter 039).
- Yes → "What kind of pressure?" branches:
  - hot read path, profiled → **Leaf: Targeted denormalization** (copy the specific hot column; keep the normalized source authoritative).
  - reporting/aggregates → **Leaf: A rollup table built by a job** (derived, rebuildable, never the source of truth).
  - the data has no stable shape → **Leaf: `jsonb` column** (shapeless payloads only; you're trading column type safety for flexibility — chapter 038 covers querying it).
Pedagogical goal: encode the reflex "measurement before denormalization, and the *kind* of pressure picks the *kind* of denormalization." The lesson lives in the order of the questions, not any single leaf. StateMachineWalker is its own card; don't wrap in `<Figure>`.

Exercise — `MultipleChoice` (single correct): present a junior's PR description that denormalizes "because the invoice list felt slow with the join," and ask what a senior asks for first. Correct answer ≈ "an `EXPLAIN ANALYZE` / a measurement showing the join is the bottleneck (likely a missing index)." Distractors: "add a `jsonb` column," "merge the tables," "cache the page." `McqWhy` reinforces: denormalization without a measurement is premature optimization; the usual culprit is a missing index. Phrase choices so they're not verbatim from the prose.

### Why Postgres is the engine

Close by naming the engine the whole unit (and course) commits to, framed as a decision with alternatives — so the student understands *why* Postgres, not just *that* it's used.

Why Postgres for a 2026 SaaS: full SQL with real constraints (the normalized model above is enforceable, not advisory); `jsonb` for the shapeless 5% (so the one escape hatch is built in); generated columns and partial indexes (named, not taught — they pay off later); and a mature ecosystem the rest of the course rides on — Drizzle, Neon, Supabase, RDS. The senior summary: Postgres gives you the strict relational core *and* the pressure-valve for the rare unstructured case, in one engine.

The alternatives, each one line for recognition only (per chapter scope — "one line for recognition"):
- **MySQL** — also a capable relational SQL database; Postgres wins on `jsonb`, extensions, and constraint richness for this stack.
- **SQLite** — great embedded/local database, not the default for a multi-user cloud SaaS backend.
- **Document stores (MongoDB et al.)** — the wrong default for inherently relational data; you end up re-implementing joins and constraints in application code (echo the "constraint moves into app code where it can be skipped" thread).

No diagram needed — this is a short prose decision close. Optionally a tiny `CardGrid` (one card per engine, one-line verdict each) if a visual aids scanning; otherwise plain prose. Keep it brief; the chapter is Postgres-only and this section just justifies that.

### External resources (optional)

One or two `ExternalResource` cards if a genuinely high-quality, durable explainer fits: the official Postgres docs landing page, and/or a well-regarded normalization explainer. Skip rather than pad. No YouTube embed is warranted — the concepts are better served by the ER diagram, the worked schema, and the decision widget than by a talking-head video; do not add a `VideoCallout` just to have one.

## Scope

**This lesson covers:** the relational model (tables, rows, typed columns, primary keys, foreign keys — defined, not deeply decided); normalization to 3NF via the "every fact in one place" working definition; the three cardinalities (1:1, 1:N, N:M) as recognizable shapes; the worked invoices/organizations/line-items/tags schema as an ER diagram; the three legitimate denormalization triggers and the wrong one; and Postgres named as the engine with alternatives for recognition.

**Out of scope — do not teach (name with a one-line forward pointer at most):**
- **Any Drizzle** — `pgTable`, columns, modifiers, `relations`, `$inferSelect`/`$inferInsert`. Chapter 037. Illustrative raw SQL DDL is allowed *only* to show the concrete shape; never frame it as "how you'll write tables."
- **Writing queries** — `SELECT`/`JOIN` authoring as a skill, query syntax, the query builder. Chapter 038. The one SQLCoding sandbox (if kept) is exploration of a pre-written read, not a query lesson.
- **Postgres data types in depth** — the per-column type catalog and money/timestamp conventions. Lesson 3 of chapter 037. Here: only enough to make "typed columns" concrete (`text`, `integer`, `timestamptz`, `numeric`, `boolean`).
- **Primary keys: surrogate vs. natural** (UUIDv7 vs. bigserial vs. natural keys). Lesson 5 of chapter 037. Named, deferred.
- **Foreign keys: cascade behavior** (`ON DELETE`/`ON UPDATE`). Lesson 6 of chapter 037. Named, deferred.
- **Junction-table mechanics** (how the N:M is expressed in code). Lesson 8 of chapter 037. The *shape* is taught here; the mechanics are not.
- **`jsonb` querying.** Lesson 9 of chapter 038. Here `jsonb` is only named as the shapeless-data denormalization trigger.
- **Indexes and `EXPLAIN ANALYZE`.** Chapter 039. Named as "what the measurement would use" and "the usual real bottleneck," never taught.
- **The schema-as-source-of-truth principle (#2) in depth.** Chapter 037 lesson 1. Connect to it conceptually ("the shape is decided first and constrains everything downstream"); do not state or teach the principle.
- **`DATABASE_URL`, local-dev database choice, Neon branching, the serverless driver, connection pooling.** Lessons 2–4 of this chapter. This lesson is pure modeling; the database is conceptual, not yet running.
- **Multi-tenant scoping patterns** (row-level tenancy, the `organization_id` scoping discipline). Unit 9. The worked schema *has* an `organizations` table, but tenancy-as-a-pattern is not taught here.

**Prerequisites to redefine briefly (concise, assume competence):** none requiring real re-teaching. The student has built UI and routes; this is their first encounter with the data layer. Define every relational term inline on first use (table, row, column, primary key, foreign key, normalization) — assume zero prior database knowledge but adult competence, no bootcamp scaffolding.
