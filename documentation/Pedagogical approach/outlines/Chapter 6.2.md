# Chapter 6.2 — Schema as source of truth with Drizzle: pedagogical approach

## Concept 1 — Principle #2: the schema is the canonical root, every other shape is generated

**Why it's hard.** The student has lived in codebases where the same row exists as a Drizzle table, a hand-typed `Invoice` interface, a Zod validator, a form-field set, and an API DTO — five drift candidates with no named winner. Without a load-bearing principle naming `db/schema.ts` as the root, the student will keep re-typing rows by hand and the type system will silently rot one layer at a time.

**Ideal teaching artifact.** Pattern archetype delivered as a **drift simulator**. The student sees a single domain (`invoices`) rendered as five files side by side: `db/schema.ts`, `lib/types.ts`, `lib/zod/invoice.ts`, `app/invoices/form.tsx`, `app/api/invoices/route.ts`. A control toggles one mutation — *rename `total` to `amountCents`*. Two modes: **"hand-typed everywhere"** (the student watches one file change and the other four sit untouched in red — the exact production-500 scenario), and **"derived from schema"** (the same toggle ripples through every consumer because each file imports from `db/schema.ts` via `$inferSelect` / drizzle-zod / shared field references). The student feels the asymmetry — one principle, five files saved — before any prose names it. The "every fact in one place" reflex from 6.1 returns here as "every shape in one place."

**Engagement.** A `MultipleChoice` round of four PR-review scenarios — *a teammate adds `type Invoice = { ... }` to `lib/types.ts`*, *a teammate copies the Zod field list from the Drizzle schema by hand*, *a teammate writes a Server Component prop type from the column list*, *a teammate exports `type Invoice = typeof invoices.$inferSelect`*. The student picks the one a senior approves. Wrong answers each name the drift class.

**Components.**
- New: `SchemaDriftSim` — props: `mutation` (label of the column change), `files` (ordered list of consumer files with two states each: drifted and derived), `mode` (toggleable between "hand-typed" and "derived"). Renders the five-file grid, the toggle, and a red/green status badge per file. Pure client state.
- `MultipleChoice` for the post-simulator PR-review round.
- Alternative if the bespoke simulator can't ship in time: `TabbedContent` with two tabs ("hand-typed", "derived"), each rendering a `Figure`-wrapped hand-SVG five-file grid with the diff state baked in. Loses the toggle's kinetic punch but keeps the side-by-side reveal.

**Project link.** The 6.6 project codebase is built around this principle from line one — every type the student writes for queries, props, or Zod traces back to `db/schema.ts`.

---

## Concept 2 — The `db/` folder anatomy: schema, relations, client, and what each file feeds

**Why it's hard.** Drizzle's three-file split (`schema.ts`, `relations.ts`, `index.ts`) looks like ceremony to a junior coming from a single-file ORM model. Without a clear picture of *which downstream consumer reads which file*, the student conflates them — putting relations in `schema.ts`, importing tables from `index.ts`, or losing tables to migrations because they weren't exported. The folder's shape is itself an architectural claim.

**Ideal teaching artifact.** Concept archetype rendered as an **annotated dependency map**. A single diagram with three boxes on the left (`db/schema.ts`, `db/relations.ts`, `db/index.ts`) and five boxes on the right naming the consumers (Drizzle Kit migrations, queries via `db.select`, queries via `db.query`, drizzle-zod, RLS policies). Arrows connect each source file to every consumer that reads it, with the arrow labeled by *what* it carries (column definitions, traversal graph, configured client). A second annotation track names which consumer arrives in which chapter — Drizzle Kit at 6.5, queries at 6.3, drizzle-zod at 7.1.7, RLS at 10.1 — so the student leaves with a forward-map of where each file gets cashed in.

**Engagement.** A `Matching` drill — five consumer descriptions on one side ("the migration generator", "the relational query API", "the Zod schema generator", "the RLS policy reader", "the typed insert call") matched to the file each one reads.

**Components.**
- `Figure` wrapping a hand SVG of the three-source / five-consumer dependency map with the chapter-arrival annotations.
- `FileTree` showing the canonical `db/` layout above the diagram.
- `Matching` for the consumer-to-source drill.

**Project link.** The 6.6 starter ships exactly this folder shape — opening it on day one, the student should already know what each file owns.

---

## Concept 3 — The camelCase-to-snake_case bridge: one config, one convention, no per-column noise

**Why it's hard.** Two valid conventions exist on either side of the wire — TS camelCase, SQL snake_case — and Drizzle lets the student pick column names manually per builder. Juniors who type `text('created_at')` once start typing it everywhere; the noise hides bugs and the next reader can't tell where the convention is enforced. The senior posture is to set the bridge once at the client level and let every column inherit it silently.

**Ideal teaching artifact.** Mechanics archetype rendered as a **before-and-after side-by-side**. Two `pgTable` blocks for the same `organizations` table: the left without `casing: 'snake_case'`, every builder carrying a snake_case string argument; the right with the config, every builder bare. Below each, the generated SQL DDL for the same table is identical. The teaching is the visible cleanliness of the right column plus the proof that the wire format hasn't changed. One annotation line names the silent failure mode: *mixing the SQL-name argument with the casing config drifts between tables — pick one.*

**Engagement.** A `Tokens` round on the un-configured table block — the student clicks every snake_case string that becomes redundant once the config is set. Forces the student to spot the noise the convention removes.

**Components.**
- `CodeVariants` with two tabs ("manual snake_case", "casing config") rendering the same table in both forms, each tab carrying a one-line caption.
- `Code` block beneath, showing the identical generated SQL.
- `Tokens` for the redundant-string identification round.

**Project link.** Every table in the 6.6 schema relies on this convention; the student should never write a snake_case string in a column builder by the end of the chapter.

---

## Concept 4 — The per-column type decision: which Postgres type is correct for which fact

**Why it's hard.** A junior with a JS background reaches for `varchar(255)` (because that's what the bootcamp showed), `float` (because money is "decimal"), `timestamp` (because timezones are "complicated"), and `string` for IDs (because UUIDs are "just strings"). Each pick is wrong in production for a different reason, and the survey-the-API style of teaching ("here are 30 column types") fails to install the *trigger* for each correct pick. The teaching has to lead with the column-fact, not the type.

**Ideal teaching artifact.** Decision archetype rendered as a **type triage round**. The student is presented with a sequence of eight column-facts from a real SaaS domain — *an organization name*, *an invoice total in USD*, *the moment an invoice was created*, *a status from `draft / sent / paid / void`*, *a webhook payload*, *a list of tag names on an invoice*, *a customer's primary key*, *an audit-log row count past two billion*. For each, the student picks the column builder from a curated set (`text`, `numeric(12,2)`, `timestamp({ withTimezone: true })`, `pgEnum`, `jsonb`, `text().array()`, `uuid`, `bigint`). After each pick, a short reveal names the correct trigger and the failure mode of the common wrong reach (e.g., `varchar(n)` is not type safety, it's a Postgres anti-pattern; `float` rounds money in binary). The round itself is the survey — the student earns the catalog by deciding.

**Engagement.** The triage round is the assessment. Confirm with one `Buckets` sort after — six new column-facts dropped into the eight type buckets — to verify the trigger sticks beyond the seen examples.

**Components.**
- `MultipleChoice` reused eight times in sequence (one per column-fact), each with the wrong-answer reveal naming the failure mode.
- `Buckets` for the post-round generalization sort.
- `Aside` (`tip`) at the end summarizing the per-column defaults table for reference (`text`, `numeric(12,2)`, `timestamptz`, `uuid`, `pgEnum`, `jsonb`).

**Project link.** Every column in the 6.6 schema falls out of this decision — the student writing the schema should pause on each column for one beat and name the trigger before typing the builder.

---

## Concept 5 — `numeric` for money and `timestamptz` for time: the two non-negotiable defaults

**Why it's hard.** These two types each have a wrong-answer that *looks correct* and survives unit tests — `float` for money rounds in binary at scale, `timestamp` without `withTimezone` stores server-local time and the bug only surfaces when a region changes. Both are catastrophic in production, both are common, and both deserve their own beat outside the broader type survey because the failure modes are subtle enough that a one-line mention in a catalog won't lock them in.

**Ideal teaching artifact.** Misconception-first ambush, two parallel beats. **Beat one (money):** the student sees a tiny TS snippet adding `0.1 + 0.2` against a column declared as `real`, predicts the stored value, and watches `0.30000000000000004` come back. The lesson then shows `numeric(12, 2)` storing the same sum as `0.30` exactly. The reveal lands the rule: money is `numeric`, period; the precision/scale arguments are the whole decision; values arrive in TS as strings because arbitrary precision is honest. **Beat two (timestamps):** the same shape — the student sees a `timestamp` column without `withTimezone` populated by `now()` on a server in `America/Los_Angeles`, then queried from a server in `Europe/London`. The displayed time is wrong by eight hours and no error fired. The fix — `timestamp({ withTimezone: true })` — stores UTC and converts on I/O. Each beat is a `PredictOutput` followed by a one-line rule.

**Engagement.** A `TrueFalse` round of four statements after both beats: *`varchar(255)` is safer than `text`*, *`real` is fine for money under $1000*, *`timestamp` without `withTimezone` stores UTC*, *`numeric(12, 2)` arrives in TS as a string*. Designed to ambush the misconceptions the lesson just addressed plus one orthogonal one.

**Components.**
- `PredictOutput` for the money-rounding ambush.
- `PredictOutput` for the timestamp-region ambush.
- `Aside` (`caution`) immediately after each ambush stating the rule plainly.
- `TrueFalse` for the four-statement round.

**Project link.** The 6.6 schema's `invoices.total` is `numeric(12, 2)` and every `createdAt`/`updatedAt` is `timestamp({ withTimezone: true })`. The student should refuse a PR that ships either differently.

---

## Concept 6 — NOT NULL as the senior default, nullability is opt-in

**Why it's hard.** Drizzle's column builders are nullable by default — `text()` produces `string | null`. A junior writes the schema, types are inferred, and now every consuming function pays a narrowing cost forever, for columns the data never actually misses. The teaching is the inverted default: *unless absence is a meaningful state, the column is `.notNull()`*. This has to be installed as muscle memory before the student writes their first table, because retrofitting NOT NULL through a populated database is painful.

**Ideal teaching artifact.** Pattern archetype framed as a **type-narrowing demonstration**. The student sees a single `invoices` table written nullable-by-default (every column lacking `.notNull()`), then a small Server Component that reads `invoice.total` and tries to render it as a currency string. The TS error chain — `string | null` is not `string`, narrow first, decide what `null` means here — makes the cost visible at the call site. The lesson then shows the same component against the `.notNull()` schema: no narrowing, no decision, no branch. Below, a one-paragraph framing of the inverted default and the one carve-out (a `deletedAt` where null *means* "live row").

**Engagement.** A `DrizzleSchemaCoding` exercise: the student is handed a four-column `customers` table with no modifiers and asked to add `.notNull()` to the columns where absence has no meaning, and to leave it off for the one column where absence is real (`deletedAt`). The grader checks the flag per column.

**Components.**
- `CodeVariants` with two tabs ("nullable by default", "NOT NULL by default") showing the same table and the same downstream consumer in each, with the type errors highlighted in the first tab.
- `DrizzleSchemaCoding` for the per-column nullability decision.
- `Aside` (`note`) naming the carve-out (`deletedAt`, `assignedToId` on a task, etc.) as the only legitimate `null`.

**Project link.** Every NOT NULL decision in the 6.6 schema cashes in to the query layer in 6.3 — the student's `listInvoices` and `getInvoiceDetail` should never narrow a column the schema already guaranteed.

---

## Concept 7 — DEFAULT in three forms: SQL-side, app-side, and when SQL-side wins

**Why it's hard.** The three forms (`.default(literal)`, `.defaultNow()`, `.$defaultFn(() => …)`) look interchangeable in a tutorial. They aren't. SQL-side defaults apply to migrations, raw `psql`, third-party tools, and anything bypassing the app; app-side defaults exist only in the Drizzle layer and silently disappear the moment a script writes to the database directly. The teaching has to install the trigger for each — and the senior reflex of preferring SQL-side whenever Postgres can compute it.

**Ideal teaching artifact.** Decision archetype rendered as a **three-way comparison panel** plus a **boundary demonstration**. The panel: three columns side by side — `.default('draft')` for an enum literal, `.defaultNow()` for `createdAt`, `.$defaultFn(() => generateSlug(name))` for an app-derived slug. Each column carries the call-site, the generated SQL (or the absence of it for the app-side case), and the trigger ("Postgres can compute it" vs "the app must compute it"). Below the panel, a short scenario: a teammate writes a one-off SQL migration that `INSERT`s a seed row, bypassing Drizzle. The student is asked which of the three defaults survive. The answer — only the first two — installs the SQL-side preference as a reflex, not a rule.

**Engagement.** A `MultipleChoice` round of three scenarios — *generating UUIDv7 IDs at insert*, *stamping `createdAt` at insert*, *stamping a slug derived from a name field*. The student picks SQL-side or app-side per scenario. UUIDv7 is the trick question: Postgres 18's native `uuidv7()` makes it SQL-side now, where in 2024 it was app-side.

**Components.**
- `TabbedContent` with three tabs (one per default form), each rendering the call-site, the generated SQL, and the failure mode if the wrong form were used.
- `MultipleChoice` for the three-scenario round.
- `Aside` (`tip`) naming the rule below the round: "prefer SQL-side; reach for `.$defaultFn` only when TS code is the only place the value can be computed."

**Project link.** The 6.6 schema's IDs are SQL-side `uuidv7()`, the timestamps are SQL-side `defaultNow()`, and any slug column should default app-side from the name — the student should be able to defend each choice on the trigger.

---

## Concept 8 — Generated columns and the reusable-columns pattern

**Why it's hard.** Generated columns are a senior reach the student has rarely seen — most courses skip them — and the reusable-columns pattern (defining `id`, `createdAt`, `updatedAt`, `deletedAt` once and spreading into every table) is one of those small architectural moves that pays off across thirty tables but is invisible at one. Both belong in the chapter because both are load-bearing for the rest of the unit (full-text in 6.3.8, soft-delete in 6.4) and the student needs to recognize them, not invent them later.

**Ideal teaching artifact.** Pattern archetype with two beats. **Beat one (generated column, worked example):** the case-insensitive email problem. The student is shown three approaches side by side — application code lowercasing on every read, a `LOWER(email)` expression index, and `emailLowercased` as a STORED generated column with a unique index. The third wins because it's a real column the app reads, the database guarantees consistency, and the unique constraint enforces case-insensitive uniqueness without app code. The trade-off is named: STORED costs disk and recomputes on input update. **Beat two (reusable columns):** a `db/columns.ts` exporting `const baseColumns = { id: ..., createdAt: ..., updatedAt: ... }` plus a `pgTable` using `{ ...baseColumns, name: text().notNull() }`. Below, a four-table schema rewritten with and without the pattern — the visual repetition collapse is the teaching.

**Engagement.** A `DrizzleSchemaCoding` exercise: the student is handed a `users` table with `email` and asked to add the generated `emailLowercased` column with a unique index on it. The grader checks the column shape and the unique constraint fires with case-insensitive duplicates.

**Components.**
- `CodeVariants` with three tabs ("app-side lowercasing", "expression index", "generated column + unique") for beat one.
- `Figure` wrapping a side-by-side hand-coded mockup of the four-table schema with and without the reusable-columns spread for beat two.
- `DrizzleSchemaCoding` for the case-insensitive email exercise.

**Project link.** The 6.6 schema can use `baseColumns` for `id`, `createdAt`, `updatedAt` across all six tables, and the generated-column pattern is the path the student will take in 6.3.8 for full-text.

---

## Concept 9 — The primary-key decision tree: UUIDv7, identity bigint, or natural

**Why it's hard.** This is one of the chapter's load-bearing decisions and one of the most common places a junior gets it wrong. UUIDv4 looks correct, runs fine in development, and silently destroys B-tree write performance at scale. Sequential integers leak business volume in URLs. Natural keys (email, slug) cascade pain when domain values change. The senior posture has three legitimate picks and a clear trigger for each — and the teaching has to make the failure mode of each wrong reach concrete enough that the student doesn't fall back to the easy default.

**Ideal teaching artifact.** Decision archetype delivered in two beats. **Beat one (the failure-mode reveal):** a side-by-side **B-tree write simulator** — the student inserts 100 rows into two tables, one with a UUIDv4 PK and one with a UUIDv7 PK, and watches the index visualizer. The v4 inserts scatter across the tree (random-position writes, page splits compounding); the v7 inserts append at the rightmost leaf like a sequence. Two read-only counters — *page splits* and *write amplification factor* — climb dramatically on the v4 side. The student feels the cost they'd otherwise read past. **Beat two (the decision tree):** a clean three-branch flow — *user-facing ID in URLs or API* → UUIDv7; *high-volume internal nobody sees by ID* → `bigint generatedAlwaysAsIdentity`; *externally-defined immutable domain key* → natural PK. Each branch carries one trigger sentence and a one-line shape.

**Engagement.** A `Buckets` sort of seven entities from the 6.6 domain — *organizations, users, invoices, invoice_lines, audit_events, countries, sessions* — into the three PK strategies. Wrong-answer feedback names the trigger that should have driven the call (volume, exposure, immutability).

**Components.**
- New: `BTreeInsertSim` — props: `mode` ("uuidv4" | "uuidv7"), `rowCount` (default 100). Renders a small B-tree visualizer showing leaf nodes filling with IDs, a page-split counter, and a write-amplification meter. A "play" control runs the inserts at a steady rate. Pure client-side state.
- `Figure` wrapping a hand SVG of the three-branch decision tree below the simulator.
- `Buckets` for the entity-to-strategy sort.
- Alternative if `BTreeInsertSim` can't ship: `Figure` wrapping a hand SVG showing two static B-tree end-states (after 100 v4 inserts vs after 100 v7 inserts) with the page-split count rendered as a number per panel — loses the kinetics, keeps the comparison.

**Project link.** Every PK in the 6.6 schema uses `uuid('id').primaryKey().default(sql\`uuidv7()\`)` — the student should be able to defend why UUIDv4 isn't on the table even though Drizzle's `defaultRandom()` would compile.

---

## Concept 10 — Foreign keys and the four ON DELETE behaviors as a per-relationship decision

**Why it's hard.** `onDelete` is where a junior either picks `cascade` for everything (and accidentally wipes a year of invoices when an org is offboarded) or omits the clause entirely (and the app handles cleanup in every code path forever). The four behaviors — `cascade`, `set null`, `restrict`, `set default` — each have a *meaning* the student has to read off the relationship: ownership, optionality, preservation. The decision is per-relationship, not per-table, and the teaching has to install the *question* the student asks before picking.

**Ideal teaching artifact.** Decision archetype delivered through a **relationship audit**. The student sees the full relationship graph of the 6.6 invoice domain rendered as an ER diagram with five FKs visible: `invoices.organizationId → organizations.id`, `invoice_lines.invoiceId → invoices.id`, `invoices.createdById → users.id`, `invoice_tags.invoiceId → invoices.id`, `invoice_tags.tagId → tags.id`. For each arrow, the student is asked: *when the parent goes away, what should happen to the child?* The student picks one of `cascade / set null / restrict`, and the lesson reveals the senior call with the trigger that drove it (ownership → cascade; optional reference → set null; preserve-and-block → restrict). The wrong-answer reveal for "set null" on a `notNull` column also catches the structural mismatch — set null requires nullability.

**Engagement.** The audit is the assessment. Confirm with one `MultipleChoice` after — *"a teammate's PR adds a `restrict` cascade on `invoice_lines.invoiceId → invoices.id`. The senior reviewer asks for what change?"* — with the right answer being `cascade` and the reasoning being ownership.

**Components.**
- `Figure` wrapping a hand SVG (or `ArrowDiagram`) of the five-relationship ER graph with each FK arrow numbered.
- `MultipleChoice` reused five times, one per FK, each scoped to the single relationship's question.
- `MultipleChoice` for the post-audit confirmation.

**Project link.** The 6.6 schema's six FKs are exactly this audit — the student writes them by walking the same five-question pass.

---

## Concept 11 — UNIQUE and CHECK as the database safety net Zod can't replace

**Why it's hard.** Juniors lean on application-side validation (Zod, custom validators) and treat the database as dumb storage. The senior posture is the inverse: Zod is the user-experience layer, the database is the *correctness* layer, and any invariant that matters has to live where it can't be skipped — by a raw SQL migration, by a future code path, by a third-party tool. The teaching has to install the principle (database is the last line) and the four UNIQUE shapes (single-column, composite, partial, case-insensitive via generated column) plus CHECK as the predicate that catches what the schema's type system can't.

**Ideal teaching artifact.** Concept archetype framed by an **escape-the-Zod scenario**. The lesson opens with a working Zod validator that rejects duplicate slugs at the API boundary. The student is then shown three paths that bypass it: a one-off SQL migration that backfills slugs, a CSV import script written in Python, a future Server Action a teammate forgets to validate. In each case, the duplicate slips in and the data drifts. The reveal: the database constraint catches all three at the write boundary, in one line, without trusting any code path. From there, the four UNIQUE shapes are introduced through the same lens — *"slug unique within an organization"* needs composite, *"one primary contact per org"* needs partial, *"case-insensitive email"* needs the generated-column pattern from Concept 8. CHECK lands last as the predicate constraint for invariants that aren't uniqueness — *positive total*, *end date after start date*. One closing line draws the boundary against Zod: same invariants stated twice, two different jobs (UX vs correctness).

**Engagement.** A `DrizzleSchemaCoding` exercise: the student is handed a `customers` table and asked to add (a) a composite unique on `(organizationId, slug)`, (b) a partial unique on `(organizationId)` where `isPrimary = true`, and (c) a CHECK that `creditLimit >= 0`. The grader runs SQL probes that attempt to violate each constraint and verifies the database rejects.

**Components.**
- `Figure` wrapping a hand SVG of the "three bypass paths around Zod" scenario, with the database-constraint catch-point drawn at the write boundary.
- `CodeVariants` with four tabs (single-column unique, composite unique, partial unique, case-insensitive via generated column) for the UNIQUE shapes.
- `DrizzleSchemaCoding` for the three-constraint exercise.
- `Aside` (`caution`) noting the composite-unique-on-nullable-columns trap (`NULL ≠ NULL` in SQL).

**Project link.** The 6.6 schema needs at least one composite unique (org-scoped slugs or sequence numbers), and the student should reach for it without prompting.

---

## Concept 12 — Junction tables and the entity-promotion trigger

**Why it's hard.** N:M is the cardinality where juniors stall — they reach for an array column, a comma-separated string, or a `jsonb` list of IDs because the junction-table shape doesn't yet feel native. Worse, even when they reach for a junction, they don't recognize the *promotion trigger*: the moment the relationship grows metadata (a `role`, a `joinedAt`, a `quantity`), the junction stops being a junction and becomes a first-class entity with a surrogate `id` of its own. Both the shape and the trigger have to land here so 6.2.9's relations API and 10.x's tenancy model both have a clean substrate.

**Ideal teaching artifact.** Concept archetype delivered as a **shape evolution sequence**. Three side-by-side panels of the same domain. **Panel one: pure junction.** `invoice_tags` with two FKs and a composite PK on `(invoiceId, tagId)`, both `onDelete: cascade`. The shape is minimal; the database guarantees no duplicate pairs and no orphans. **Panel two: the promotion trigger.** A teammate adds `addedAt` and `addedById` to the junction. The student is asked: *what changed?* The answer — the junction now carries facts the relationship didn't have, and other rows might want to FK to it. **Panel three: promoted to entity.** `invoice_tags` becomes `invoice_tag_assignments` with a surrogate `id` (UUIDv7), the composite demoted to a `unique(...).on(...)` constraint, and `createdAt`/`updatedAt` added. The trigger is named explicitly: *if anything would FK to the relationship, or the relationship has its own data, it's an entity.*

**Engagement.** A `Buckets` sort of six relationship descriptions — *invoices and tags*, *posts and categories*, *users and organizations with a role*, *products and orders with a quantity*, *follower and followed users*, *students and courses with an enrollment date* — into "pure junction" or "entity-with-metadata". Wrong-answer feedback names the trigger that flipped the call.

**Components.**
- `Figure` wrapping a hand SVG of the three-panel shape evolution, with the promotion trigger called out between panels two and three.
- `Buckets` for the relationship-classification sort.
- `Aside` (`note`) naming the canonical examples in the course (`memberships`, `subscriptions`) as entities that started as junctions.

**Project link.** The 6.6 schema's `org_members` is the canonical entity-with-metadata case — the student should recognize the role and the joinedAt as the trigger that promoted it, not as casual fields.

---

## Concept 13 — Relations v2: the TS-side traversal graph that lives next to the FK graph

**Why it's hard.** The split between `references()` (database FK) and `defineRelations(...)` (TS-side traversal) reads as redundant — the student thinks the FK already declared the relationship. The trap is that `db.query.invoices.findMany({ with: { tags: true } })` returns undefined without `defineRelations`; the FK is necessary but not sufficient. The teaching has to make the *two layers* visible so the student stops treating the relations file as duplicate work.

**Ideal teaching artifact.** Concept archetype delivered as a **two-graph overlay**. The student sees one ER diagram with two layers toggleable on top of it. **Layer one (database):** the FK arrows the migrations would emit, declared by `references()`. **Layer two (TypeScript):** the traversal hints that `defineRelations` adds — `r.one`, `r.many`, `r.many.through` — drawn as colored ribbons on top of the same arrows. Toggling between layers shows what each one knows: the database knows enough to enforce orphan rejection; the TS layer knows enough to walk the graph in `db.query`. A short follow-up demo: the same `invoices` query under both layers, with `db.query.invoices.findFirst({ with: { lineItems: true, tags: true, organization: true } })` returning the typed nested object only when the relations file is present. The teaching is the *separation* — two graphs over the same arrows, owned by two different files, consumed by two different layers.

**Engagement.** A `Dropdowns` exercise on a partial `db/relations.ts` with four blanks: the relation kind for `organizations → invoices` (`r.many`), the relation kind for `invoices → organizations` (`r.one`), the `from`/`to` columns on the `invoices.organization` relation, and the `through` argument for `invoices → tags`. Filling the four correctly is the recall test.

**Components.**
- `Figure` wrapping a hand SVG of the two-layer ER diagram, with a toggle hint indicating the layers (or rendered as `TabbedContent` with two tabs if the toggle complicates the SVG).
- `CodeVariants` showing the `db.query.invoices.findFirst({ with: ... })` call returning undefined vs the typed nested object across the "no relations file" and "relations file" tabs.
- `Dropdowns` for the four-blank `defineRelations` exercise.
- `Aside` (`note`) naming the v1-vs-v2 cliff (course teaches v2 only; v1 compiles but is deprecated).

**Project link.** The 6.6 schema's `db/relations.ts` is what enables the `getInvoiceDetail` relational `findFirst` with `lines` and `customer` — the student should recognize the file as enabling the API, not as repeating the FKs.

---

## Concept 14 — `$inferSelect` and `$inferInsert`: the call sites that cash Principle #2 in

**Why it's hard.** This is the chapter's capstone — the moment the principle introduced in Concept 1 becomes a one-liner the student writes every day. The risk is that the student treats `$inferSelect` as a typing convenience rather than the architectural commitment it is. Two specific traps deserve explicit teaching: the *asymmetry* between select and insert (defaulted columns are optional in `$inferInsert`, generated columns are omitted entirely), and the *composition pattern* (derived shapes still root in inferred types via `Pick`/`Partial`, never via re-typed field lists).

**Ideal teaching artifact.** Pattern archetype delivered as a **before-and-after refactor**. The student is shown a small codebase fragment — a Drizzle table, a hand-typed `Invoice` interface in `lib/types.ts`, a Server Component prop type re-listing the fields, a Server Action arg type doing the same, an update helper accepting `Partial<Invoice>`. Every type shape is hand-written; total field-name surface is around fifteen restatements. The refactor: replace `lib/types.ts` with `export type Invoice = typeof invoices.$inferSelect; export type NewInvoice = typeof invoices.$inferInsert` next to the table, then watch every consumer collapse to `Invoice`, `NewInvoice`, `Partial<NewInvoice>`, or `Pick<Invoice, ...>`. Below, a small **type-asymmetry probe** — the student hovers over `NewInvoice` and sees `id?: string` (defaulted), `createdAt?: Date` (defaulted), `total: string` (required, no default), and no `slug` field at all (generated). The asymmetry is the lesson: insert is what the app must supply, select is what the row stores. The closing beat is the principle cashed: change a column in `db/schema.ts`, the type checker walks every consumer, the codebase rewrites itself.

**Engagement.** A `TypeCoding` exercise: the student is handed an `invoices` table with one column defaulted, one column generated, one nullable, and one required. They write the four type aliases (`Invoice`, `NewInvoice`, `InvoiceUpdate`, `InvoiceSummary`) using `$inferSelect`/`$inferInsert`/`Pick`/`Partial` and the grader's twoslash queries verify each is correct. This is the chapter's closing assessment — the principle from Concept 1 lands at the keyboard.

**Components.**
- `CodeVariants` with two tabs ("hand-typed everywhere", "inferred from schema") showing the same five-file fragment in both forms, with the field-restatement count rendered as a badge in each tab.
- `AnnotatedCode` walking the type-asymmetry probe — defaulted, generated, required, nullable — with one annotation step per column.
- `TypeCoding` for the four-alias exercise.
- `Aside` (`tip`) naming the smell rule below the exercise: *if a row type appears in a file, it came from `$inferSelect` or it's wrong.*

**Project link.** Every type the 6.6 project exports from `db/schema.ts` — `Invoice`, `NewInvoice`, `Customer`, `OrgMember` — is born here. The 6.6 starter ships exactly this shape.

---

## Component proposals

- **`SchemaDriftSim`** — interactive five-file simulator. Props: `mutation` (string label for the column change), `files` (ordered list of consumer files, each with a `drifted` and `derived` rendering), optional `defaultMode`. Renders a five-pane grid with a drift/derived toggle and a per-file red/green status badge. Pure client state, no network.
  - **Uses in this chapter** — Concept 1.
  - **Forward-links** — Chapter 7.1.7 (drizzle-zod) revisits the same chain with the Zod link materialized; Chapter 10.1 (RLS) adds the column-name dependency; Chapter 16 (public API) carves out the DTO exception. Plausibly reused or extended in three to four places across the course — clears the single-use bar.
  - **Leanest v1** — drop the per-file diff rendering; keep the toggle and the five status badges (red/green per file, with the file name and one line of what would break). The kinetic moment is the toggle flip; the file content is set dressing.
- **`BTreeInsertSim`** — small B-tree insertion visualizer. Props: `mode` (`"uuidv4"` | `"uuidv7"`), `rowCount` (default 100), `playSpeed` (rows/sec). Renders a leaf-row of nodes filling with IDs, a page-split counter, and a write-amplification meter. A play/pause control runs the inserts. Pure client state.
  - **Uses in this chapter** — Concept 9.
  - **Forward-links** — Chapter 6.4.1 (indexes) revisits B-tree behavior under different access patterns; Chapter 6.4.3 (EXPLAIN ANALYZE) references the same tree shape when reading index scan plans. Two credible re-use points; clears the single-use bar narrowly.
  - **Leanest v1** — drop the animated insertion; render two static end-state trees side by side (after 100 v4 inserts vs after 100 v7 inserts) with the page-split count rendered as a number per side and a single "play" button that swaps the two end-states with a 500ms transition. The cost-comparison reveal is what teaches; the per-insert animation is dramatization.

## Build priority

`SchemaDriftSim` is the higher-leverage build of the two. It's the artifact for Principle #2 — the chapter's load-bearing thesis — and it's the one with the strongest forward-links (drizzle-zod in 7.1.7, RLS in 10.1, public API in 16 each plausibly extend it). Build the lean v1 first: the toggle plus the five status badges already does the teaching, and the per-file diff rendering is polish.

`BTreeInsertSim` is the second priority. It carries one concept and re-appears twice in 6.4. Its lean v1 (two static end-states with a swap button) is dramatically cheaper than the full simulator and probably enough — build that and only escalate if the swap-button reveal underdelivers in playtesting.

## Open pedagogical questions

- Concept 4's eight-MultipleChoice triage round is the same structural shape as Chapter 6.1's six-scenario denormalization round. If the course settles on a "scenario round" wrapper that scores N MultipleChoice cards as one unit, Concept 4 is the second strong candidate for it.
- Concept 13's two-layer ER overlay (database FKs vs TS traversal hints) needs either a toggleable SVG or a `TabbedContent` with two tabs of the same diagram. The toggleable SVG carries the teaching better but is a one-off authoring cost; the tabbed alternative is cheaper but loses the "same arrows, two readings" punch. Confirm which is worth the asymmetry.
