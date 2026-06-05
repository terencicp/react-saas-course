# Indexes that earn their weight

- Title (h1): `Indexes that earn their weight`
- Sidebar label: `Indexes`

## Lesson framing

This is lesson 1 of chapter 039 and the first lesson the student meets after writing schemas (037) and queries (038). The student can already write `db.select`/joins/the relational API, declared FK constraints with `onDelete`, declared `.unique()` and `CHECK` constraints, built a cursor-paginated list with a `(sortKey, tiebreaker)` order, generated a `tsvector` column for FTS, and used `jsonb` with `@>`. They have **never** added an index. Every list query and join they wrote so far does a sequential scan, and on dev-sized tables that's invisible.

The lesson's spine is a **senior decision**, not a syntax tour: *given a schema and a set of queries, which columns get an index, what kind, and when?* The whole lesson is two decision frames stacked — (1) the four reach-for **triggers** that say "add one," and (2) the index-**type** decision tree that says "which one." Everything else (Drizzle declaration syntax, cost, the worked example) hangs off those two frames.

Pedagogical priorities, lesson-wide:

- **Mental model before mechanics.** The student must end with one durable picture: an index is a sorted on-disk lookup structure the *planner may choose* to skip a full-table scan; it never changes results, only the path to them; and it taxes every write. Land this picture with a concrete physical analogy (book index / phone-book) and a simple diagram before any Drizzle syntax. Minimize cognitive load: introduce the simple model (sorted shortcut), then add the cost dimension, then add type variation — never all at once.
- **Triggers before tools** (course filter). The four triggers are the heart of the lesson and the most reusable senior reflex. Frame each as a *code-review reflex* — the thing a senior notices reading a PR — because that matches how the skill is actually used. The missing-FK-index trap is the single highest-value takeaway: Postgres does **not** auto-index FK columns, gives no warning, and the symptom (slow cascade deletes / join probes) appears only at scale. Give it weight.
- **Cost is half the lesson.** Beginners over-index: they add an index to "make it fast" reflexively. The senior counter-reflex is that every index is a standing tax on inserts/updates/deletes plus disk plus planner search space, so indexes are a *measured response to a read pattern*, never preemptive. The two correctness-adjacent exceptions (FK + unique) ship day one; everything else waits for evidence. State this explicitly and repeatedly — it's the thread the whole chapter shares.
- **Defer the proof to 039.3.** This lesson is about *deciding* to add an index. *Verifying* the planner actually uses it (`EXPLAIN ANALYZE`) is lesson 3. Name the loop ("you'll prove it next lesson") but don't teach plan-reading here. Likewise name the production lock-out (adding an index on a hot table locks writes → `CONCURRENTLY`) as the reflex but defer the migration mechanics to 040.2.
- **Tie to what they built.** Use the invoices domain from 037/038 throughout (organizationId, customerId, createdAt cursor, externalId webhook idempotency, the FTS tsvector). The worked example is a payoff that re-touches each prior lesson's artifact, making the chapter feel cumulative.
- **Interaction over prose for the two decision frames.** The type decision is naturally a tree → a `StateMachineWalker` (decision kind) is the ideal vehicle. The triggers are a classification → a `Buckets` exercise tests "does this column earn an index?". A `DrizzleSchemaCoding` exercise lets the student actually write `index(...)`/`uniqueIndex(...)` with a partial-unique probe — the only way to make the syntax stick.

Estimated student time: 50-60 min. Keep it tight; the chapter outline brainstorm is exhaustive — cut BRIN/GiST/SP-GiST/hash to a single "named for recognition" aside, don't belabor them.

## Lesson sections

### Introduction (no header)

Two short paragraphs, warm and terse. Open with the concrete problem: the invoice-list and detail queries from 038 *work*, and on a 50-row dev seed they're instant — but every one of them is reading the whole table top to bottom, and at 50,000 invoices that page crawls. The senior fix isn't "add an index to be safe"; it's knowing exactly which columns earn one and which don't. State the lesson's payoff: by the end the student can look at a schema plus its queries and call the indexes — the four triggers that say *add one*, the decision tree that says *which kind*, and the cost that says *not that one*. Name that lesson 3 will prove the call with `EXPLAIN ANALYZE`; this lesson is the decision.

No code here. One sentence connecting back: they've spent two chapters making queries *correct* and *expressive*; this chapter makes them *fast*, starting with indexes.

### How an index actually works

**Goal:** install the durable mental model before any syntax. This is the simplified-model-first section.

Build the picture in three additive layers (explicitly staged to limit cognitive load):

1. **The shortcut.** A table with no index is an unordered pile of rows; finding `where id = 42` means reading every row until a match (a sequential scan). An index is a separate, *sorted* on-disk structure mapping key → row location, so the engine jumps to the key instead of scanning. Analogy: the index at the back of a book vs. flipping every page. Keep it physical and concrete.
2. **The planner chooses.** The engine doesn't blindly use an index. The **query planner** estimates the cost of each path (scan vs. index) using table statistics and picks the cheaper one. So an index is an *option offered to the planner*, not a command. This matters because it explains two later facts: a "useless" index just sits unused (still taxing writes), and the planner sometimes *correctly* skips an index when a scan is cheaper (small table, low selectivity). Foreshadow 039.3 lightly: "you confirm which path it picked with `EXPLAIN ANALYZE` — next lesson."
3. **The cost.** Indexes don't change query *results* — only the path. But they aren't free: the sorted structure lives on disk (space), and every `insert`/`update`/`delete` that touches an indexed column must update the index too (write amplification). This is the seed of the over-indexing lesson later.

**Diagram (Figure + custom HTML/CSS, or hand-coded SVG):** a side-by-side "find row 42" comparison — left panel a sequential scan walking every row (8 rows, arrow stepping through all), right panel an index jumping straight to the key. Pedagogical goal: make "skip the scan" visceral in one glance. Keep it horizontal, compress vertically (laptop viewport rule). Caption: indexes change the *path*, never the *result*. Author as plain HTML+CSS per the diagrams guidelines (color-coded segments, devtools-inspectable) — this is a simple visual aid, not a system graph.

**Tooltips (`Term`):** `sequential scan` (read every row in a table, no shortcut), `query planner` (the Postgres component that estimates each execution path's cost and picks one), `selectivity` (the fraction of rows a predicate keeps — low fraction = selective). Define `selectivity` here because the triggers section leans on it.

Do **not** introduce B-tree internals (page splits, tree depth) — out of scope, pure cognitive load. The "sorted structure" abstraction is enough.

### The four triggers: when a column earns an index

**Goal:** the senior reflex — the core of the lesson. Frame the whole section as the question a senior asks reading a schema-plus-queries PR: *does this column earn an index?* The default answer is **no** (indexes are a measured response); these four triggers flip it to yes.

Teach each trigger as a short subsection with the *signal* (what you see in code/schema), the *why*, and the *call*. Lead with FKs because it's the trap.

Use a brief intro line stating the frame: most columns never get an index; you reach for one only when the read pattern demands it, and these are the four patterns that do.

#### Foreign-key columns

The trap, given top billing. **Postgres does not automatically index foreign-key columns.** `references(() => orgs.id)` creates the *constraint* (referential integrity) but no index. Consequence: every join that probes the child by FK, and every cascade delete on the parent, becomes a sequential scan of the child table — silently, with no warning, invisible on dev data. Call: **every FK column gets a B-tree index by default.** This is the one index that's nearly correctness-adjacent — ship it day one. Make it the code-review reflex: see a `.references(...)` with no matching `index(...)` → flag it.

Connect to 037.6 (they wrote `onDelete: 'cascade'` for invoice lines) and 038.2 (they joined on FKs) — those exact queries are the ones that suffer.

#### Selective `where` predicates

A column the planner can use to skip most of the table earns an index — but only if it's **selective**. `where status = 'pending'` when 5% of rows are pending is worth indexing; `where status = 'paid'` when 90% are paid loses to a sequential scan (reading the index then most of the heap is slower than just scanning). The rough threshold: the predicate should slice the table to ~5-10% or less. The planner decides at query time from statistics (`ANALYZE`/auto-vacuum keep them current) — name this but don't go deep, stats live in 039.3's orbit. Set up the partial-index payoff: a low-selectivity column *as a whole* can still earn a *partial* index on its rare slice (covered later).

#### `order by` keys for pagination

The cursor-pagination order from 038.6 needs an index in the **exact order it sorts** or the engine sorts the entire table on every page. Restate briefly (it's owned by 038.6): the `(sortKey, tiebreaker)` shape, e.g. order by `createdAt desc, id desc`. The matching index is a composite in the same directions — covered in depth in the composite subsection below; here just establish that an `order by` that runs on every request is a trigger. Don't re-teach cursor pagination.

#### Unique constraints

`.unique()` (037.7) already creates a unique B-tree index under the hood — uniqueness *requires* an index to enforce it. Call: **never add a separate `index(...)` for a column that already has `.unique()`** — you'd have two indexes doing one job, double the write cost. This is also the first "what you get for free" note. Foreshadow the partial-unique variant (conditional uniqueness) in the types section.

**Exercise (`Buckets`, two columns):** "Does this column earn an index?" Buckets: *Index it* / *Leave it*. Items drawn from the invoices schema — `invoices.organizationId` (FK → index), `invoices.customerId` (FK → index), `invoices.status` on a table where pending is 5% (selective → index, partial), `invoices.status` where paid is 90% (low selectivity → leave / partial only), a `notes` free-text column never filtered (leave), `email` already `.unique()` (leave — already indexed), `createdAt` used as the cursor sort key (index). Pedagogical goal: force the student to apply all four triggers *and* the negative cases (the discipline of *not* indexing) in one drill. Items should require reasoning, not prose-matching.

### Declaring indexes in Drizzle

**Goal:** the syntax, now that the student knows *what* to declare. Keep it mechanical and short — the decisions are the lesson, this is how you write them.

The table-level third argument returns an array of index builders:

```ts
export const invoices = pgTable('invoices', {
  // columns…
}, (t) => [
  index('idx_invoices_org_id').on(t.organizationId),
  uniqueIndex('invoices_external_id_unique').on(t.externalId),
]);
```

Use `AnnotatedCode` here — the callout-per-part fits: step 1 the third-argument callback shape (returns an array; this is where indexes live, alongside composite uniques/checks they saw in 037.7); step 2 `index(name).on(col)` emits a **B-tree** by default; step 3 the explicit `name` argument; step 4 `uniqueIndex` vs `index`. Color the new lines.

**Naming convention (load-bearing — from code standards §Data layer):** always pass an explicit `name`. Convention: `idx_<table>_<col>[_<col2>]` for B-tree, `idx_<table>_<col>_gin` for GIN, `idx_<table>_<col>_partial` for partial; uniques as `<table>_<col>[_<col2>]_unique`. Why explicit: Drizzle's auto-generated names rotate on schema reorderings and make migration diffs noisy; Drizzle Kit (040) emits the name verbatim, so a stable name keeps diffs clean and naming collisions become real, actionable diagnostics. State this as a rule with the why — it's a convention the downstream projects enforce.

Note the convention divergence for downstream agents: the chapter-outline brainstorm uses `<table>_<columns>_<kind>` ordering (`invoices_created_at_idx`); the **code standards prefix form** (`idx_invoices_created_at`) is canonical and wins. Use the `idx_`-prefix form throughout the lesson.

**What you get for free** (consolidate the freebies into one tight callout, `Aside` note): primary keys are unique + indexed automatically; `.unique()` constraints are indexed; `.references(...)` is **not** indexed. The last one is the FK trap restated — repetition is deliberate, it's the highest-value fact.

### B-tree and the index-type decision tree

**Goal:** the second decision frame — once you've decided to add an index, which *kind*? Establish B-tree as the default that covers ~95% of SaaS indexes, then teach the four conditional types as deviations, each with its trigger. End with a decision-tree widget that encodes the whole frame.

Open with **B-tree** as the workhorse: sorted, serves `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `IS NULL`, `IS NOT NULL`, and `ORDER BY` in either direction. Drizzle's `index(...).on(col)` is B-tree. The mental rule: *if you're not sure, it's B-tree.* The other types are each a specific deviation triggered by a specific query shape.

Then four conditional-type subsections:

#### Composite indexes and the leftmost-prefix rule

The cursor-pagination index from the triggers section, now in depth. An index on multiple columns `(a, b, c)` is sorted by `a`, then `b` within equal `a`, then `c`. The **leftmost-prefix rule**: it serves `where a = ?`, `where a = ? and b = ?`, the full triple, and `order by a, b, c` — but **not** `where b = ?` alone (b isn't sorted globally, only within each a-group). This asymmetry is the watch-out: column order is a decision, not arbitrary.

The senior ordering rule: **equality predicate first, range/sort key second, tiebreaker last.** The canonical shape is the tenant-scoped cursor index: `index('idx_invoices_org_created_id').on(t.organizationId, t.createdAt.desc(), t.id.desc())` — org equality leads (every tenant query filters it; code standards: tenant column always leads composite indexes for the tenant-data tier), then the createdAt sort, then the id tiebreaker, in the exact directions the query orders. Tie back to 038.6: this is the index that pagination query depends on.

**Diagram (Figure + HTML/CSS table):** a tiny sorted `(org_id, created_at)` index visualized as a sorted list, showing how `where org_id = 7` lands a contiguous block but `where created_at = X` (without org_id) can't use the sort. Goal: make leftmost-prefix *spatial* rather than a rule to memorize. Optional — if the StateMachineWalker + prose carry it, this can be cut to keep length down; prefer keeping it, the asymmetry is the #1 composite-index bug.

Use `Code` (simple block) or `AnnotatedCode` for the `.on(...)` ordering, highlighting the three-column order with the equality/range/tiebreaker labels.

#### Partial indexes: index only the rows that matter

`index('idx_invoices_pending_partial').on(t.dueDate).where(sql\`status = 'pending'\`)`. The index covers **only** rows matching the predicate — smaller on disk, cheaper to maintain, and (the rescue for the low-selectivity case from the triggers section) it makes a globally-non-selective column indexable on its rare slice. The reach-for signals: soft-delete filtering (`where deleted_at is null`), status workflows where the hot state is rare (`pending`), tenant carve-outs that can't be a column.

**The strict-match watch-out (critical):** the planner uses a partial index *only* when the query's `where` includes the same predicate. `where status = 'pending'` uses `idx_..._pending_partial`; `where status = 'active'` does not; even `where status in ('pending')` may not match. The predicate must line up. State this firmly — it's the partial-index footgun.

`CodeVariants` fits well here: tab "Full index" (indexes all rows, big, mostly wasted when you only query pending) vs. tab "Partial index" (`.where(...)`, small, only the hot slice) — before/after framing with the size/maintenance trade in the prose.

#### Expression indexes: index a computed value

`index('idx_users_email_lower').on(sql\`lower(${t.email})\`)`. Now `where lower(email) = ?` can use the index — without it, wrapping the column in a function (`lower`, `date_trunc`, a cast) makes any plain index on that column unusable, forcing a scan. The senior signal: a `where` predicate wraps a column in a function. **The character-for-character watch-out:** the index expression must match the query expression exactly — a `coalesce` wrapper, an extra cast, a different function defeats reuse.

The cleaner-alternative note (one sentence, defer the mechanic): a **generated column** (037.4) with a normal index on it is often cleaner when the value is read often — expression-index for one-off reads, promote to a generated column when the value is hot. Don't re-teach generated columns; just name the trade and point to 037.4.

#### Unique indexes vs. unique constraints, and the partial unique

`.unique()` (037.7) and `uniqueIndex(...)` both create a unique B-tree — nearly equivalent. The one difference that matters: `uniqueIndex` accepts a `.where(...)` clause (a **partial unique index**), `.unique()` does not. The senior reach: **conditional uniqueness** — "one primary contact per org *where* `is_primary = true`":
`uniqueIndex('org_members_one_primary_unique').on(t.organizationId).where(sql\`is_primary = true\`)`. This is the tool for "unique only among the rows matching a predicate," which a plain constraint can't express. Tie to code standards (partial uniques for soft-delete lifecycle: `unique on (org_id, slug) where deleted_at is null`).

#### GIN: the index for composite-value columns

B-tree indexes one scalar value per row; it can't index "is this element *inside* this array/document/text." **GIN** (generalized inverted index) maps each *contained* value back to its rows — the structure for the two query shapes the student already built:

- `tsvector` full-text columns (038.8): `index('idx_invoices_search_gin').using('gin', t.searchVector)` — this is the index that 038.8's FTS query was waiting for; wire it here.
- `jsonb` containment (038.9): `index('idx_events_payload_gin').using('gin', t.payload)` for `@>` queries. Also covers arrays.

The trade: GIN is slower to write than B-tree (it indexes every contained token), but it's the *only* viable structure for these shapes — a B-tree can't answer them at all. The `jsonb_path_ops` variant: a smaller, faster GIN operator class when the queries use *only* `@>` containment (no key-existence `?` operators) — name it and prefer it for pure-containment jsonb.

Note for downstream agents: verify the current Drizzle syntax for GIN (`index().using('gin', col)` vs `.on(col)` with an `.using()` modifier — Drizzle's API is `index(name).using('gin', table.col)` or `.on(...).using(...)`; the `using` form is the one that selects the access method). Flag this for fact-check in step 6.

**The decision-tree widget (`StateMachineWalker`, `kind="decision"`):** this is the section's centerpiece and the lesson's second-frame payoff. The walk:
- Root: "What does the query do with the column?"
  - Branch "Equality / range / sort on a scalar" → "Single column or multi-column predicate?"
    - "One column" → Leaf **B-tree** (the default).
    - "Multiple columns / a sort+tiebreaker" → Leaf **Composite B-tree** (leftmost-prefix; equality-first ordering).
  - Branch "Filters to a rare slice (most rows excluded)" → Leaf **Partial index** (predicate must match the query's `where`).
  - Branch "Wraps the column in a function (`lower`, cast, `date_trunc`)" → Leaf **Expression index** (or a generated column if read often).
  - Branch "Full-text search on a `tsvector`" → Leaf **GIN**.
  - Branch "`jsonb` containment / array membership" → Leaf **GIN** (`jsonb_path_ops` if only `@>`).
  - Branch "Conditional uniqueness (unique among a subset)" → Leaf **Partial unique index**.
Each leaf's body: one line on what it is + the one watch-out. Pedagogical goal: the lesson lives in the *order of the questions* — the senior asks "what's the query shape?" first, and the type falls out. The walker forces that order. Do not wrap in `<Figure>` (it's a self-contained card).

**Named for recognition, deferred (one tight `Aside`):** BRIN (block-range, tiny, for very large naturally-ordered columns like an append-only event log past tens of millions of rows — not a 2026 SaaS default), GiST/SP-GiST (geometric and range types), hash (crash-safe since PG10 but B-tree usually wins). One sentence each. The point is the student recognizes the name if they meet it and knows it's not a default reach — don't teach them.

**Tooltips (`Term`):** `B-tree` (balanced sorted tree; the default Postgres index), `GIN` (Generalized Inverted Index — maps each contained value to the rows holding it), `composite index` (an index over more than one column, sorted left to right), `operator class` (the per-type strategy an index uses to compare values, e.g. `jsonb_path_ops`).

### The cost of an index, and the day-one rule

**Goal:** the over-indexing counter-reflex — the lesson's discipline, pulled into its own section so it lands as a decision, not a footnote. (Per the outline rule: this is content-driven, not a bag of watch-outs.)

State the three standing costs of every index, concretely:
1. **Write tax.** Every `insert`/`update`/`delete` touching an indexed column updates the index too. Ten indexes on a hot table = ten extra writes per row mutation. Write-heavy tables pay this constantly.
2. **Disk.** Each index is a full sorted copy of its key columns. They add up.
3. **Planner cost.** More indexes = a larger search space the planner evaluates on every query — a small but real per-query tax, and more chances it picks wrong.

The senior synthesis (the chapter-wide thread): **indexes are a measured response to a read pattern, never preemptive.** The decision rule the course adopts:
- **Ship day one:** FK indexes and unique indexes — they're correctness-adjacent (FKs prevent the silent slow-cascade trap; uniques are mandatory for the constraint). These you don't wait for evidence on.
- **Add on evidence only:** everything else waits until `EXPLAIN ANALYZE` (039.3) shows the query needs it. "Feels slow" is not evidence. This is where the chapter's measure-don't-guess thread starts.

Two more watch-outs, each tied to its concept (not bundled):
- **Low-cardinality columns** (booleans, three-state enums) are usually *worse* indexed than scanned — the index isn't selective enough to beat the scan. The rescue is a **partial** index on the rare value (callback to partial indexes). Pull this into the cost discussion because it's a "don't add that index" case.
- **The production lock-out** (named here, mechanic in 040.2): adding an index to a table with live write traffic **locks writes for the whole build** unless built `CONCURRENTLY`. The reflex: any index added to a table with material write traffic uses `CONCURRENTLY` in the migration. State the rule and the reason; defer the migration hand-edit to 040.2 explicitly ("you'll write that migration in chapter 40").

**Exercise (`MultipleChoice`, single-correct, standalone):** a scenario question that tests the discipline, not recall — e.g. "A table takes 10,000 inserts/minute and one rare admin report filters `where status = 'archived'` (0.5% of rows). What's the right index?" with options: a plain B-tree on `status` (wrong — write tax on a hot table for a low-selectivity column), a partial index on the archived slice (correct), no index / accept the scan (defensible but the report is slow at scale), index everything (wrong — over-indexing). The `McqWhy` reinforces the measured-response thread. Options must require reasoning across triggers + cost + partial, not match a sentence.

### Worked example: indexing the invoices table

**Goal:** synthesis — apply both frames to a real table the student already has, re-touching every prior-lesson artifact so the chapter feels cumulative. This is the payoff.

Walk the invoices schema and call every index with its trigger and type, building up the full third-argument array:

```ts
export const invoices = pgTable('invoices', {
  // … columns from 037
}, (t) => [
  index('idx_invoices_org_id').on(t.organizationId),                          // FK
  index('idx_invoices_customer_id').on(t.customerId),                         // FK
  uniqueIndex('invoices_org_external_id_unique')                              // webhook idempotency (038.5)
    .on(t.organizationId, t.externalId),
  index('idx_invoices_org_created_id')                                        // cursor pagination (038.6)
    .on(t.organizationId, t.createdAt.desc(), t.id.desc()),
  index('idx_invoices_pending_partial').on(t.dueDate)                         // hot pending query
    .where(sql\`status = 'pending'\`),
  index('idx_invoices_search_gin').using('gin', t.searchVector),             // FTS (038.8)
]);
```

Use `AnnotatedCode` so each index gets its own callout naming **which trigger fired and which type was chosen and why** — that's the whole lesson, exercised once:
- org/customer FK indexes → FK trigger, B-tree default, the silent-scan trap avoided.
- `(org_id, external_id)` unique → webhook idempotency from 038.5 (the second insert of a duplicate event-id is rejected), unique constraint carries tenancy (code standards), and note it's *also* the index serving lookups by external id — one index, two jobs.
- `(org_id, created_at desc, id desc)` composite → the cursor index from 038.6, equality-first ordering, exact sort directions.
- partial on `dueDate where status = 'pending'` → selective-predicate + partial, the hot dashboard query, low write cost.
- GIN on `searchVector` → the FTS index 038.8 was waiting for.

Close the section by pointing forward: every one of these is a *hypothesis* that the query needs the index — lesson 3 proves it with `EXPLAIN ANALYZE`, and chapter 40 ships the DDL (with `CONCURRENTLY` where writes are hot).

**Exercise (`DrizzleSchemaCoding`):** the hands-on payoff — the student writes the index declarations themselves. Starter: the invoices (or a trimmed `org_members`) schema with columns present and an empty `(t) => []` third arg, plus an `orgs` parent. Requirements/instructions: add the FK index, the composite unique with tenancy, and one partial **unique** index for conditional uniqueness (e.g. one primary member per org). Use `probes` to prove the partial unique fires: a probe that inserts two non-primary members in one org (`mustSucceed: true`), and one that inserts two primary members in one org (`mustSucceed: false`). This is the highest-value exercise because partial-unique is the subtlest type and a SQL probe makes its behavior concrete. Note for the builder: confirm PGlite/the schema-coding grader supports `uniqueIndex(...).where(...)` partial indexes; if a probe limitation surfaces, fall back to a composite-unique probe and teach the partial-unique via `Code` + prose only (flag in continuity notes).

### External resources (optional)

One or two `ExternalResource` cards: the Drizzle indexes doc and the Postgres "Indexes" chapter (or use-the-index-luke.com for the B-tree/leftmost-prefix mental model — it's the canonical free explainer and matches this lesson's framing). Keep to two max.

## Scope

**Prerequisites to restate briefly (do not re-teach):**
- FK constraints and `onDelete` (037.6) — assumed; the lesson only adds that they need a separate index.
- `.unique()` / `CHECK` / composite & partial unique *constraints* (037.7) — assumed; restate only the "unique already indexes" fact.
- Cursor pagination's `(sortKey, tiebreaker)` order (038.6) — restate the *shape* in one line only, to motivate the composite index; do not re-teach pagination mechanics, cursors, or the n+1 has-next trick.
- `tsvector` generated column + FTS query (038.8) and `jsonb` + `@>` (038.9) — assumed; the lesson only adds the GIN index that serves them.
- Tenant-scoping / `tenantDb` is Unit 10+ — the composite-index "org leads" rule can reference org-scoping as the read pattern without teaching the `tenantDb` factory.

**Explicitly out of scope (owned elsewhere):**
- **`EXPLAIN ANALYZE` and plan reading** — 039.3. Name the verify loop ("prove it next lesson"); teach zero plan-reading here. No `Seq Scan`/`Index Scan` node interpretation.
- **N+1** — 039.2. Not mentioned beyond the chapter framing; indexes don't fix round-trip count.
- **Transactions / isolation** — 039.4. Untouched.
- **Drizzle Kit migration generation, the `CONCURRENTLY` hand-edit, statement breakpoints** — 040.2. Name the lock-out reflex and the rule; defer the *how you write the migration* entirely.
- **Drizzle Studio / seeding realistic volumes** — 040.1/040.3. Don't cover.
- **Generated columns as the expression-index alternative** — mechanic owned by 037.4; name the trade in one line only.
- **`ANALYZE`/auto-vacuum statistics internals, `work_mem`, `shared_buffers`** — DBA-side, 039.3's orbit at most. Name `ANALYZE` keeps stats current in one clause; no depth.
- **Index tuning at extreme scale** (partitioning, sharding) — out of scope, course-wide.
- **Vector / `pgvector` HNSW indexes** — Unit 22. Not mentioned.
- **`INCLUDE`/covering indexes (`Index Only Scan`)** — touches 039.3's node-types territory; keep out of this lesson or mention only as a one-line "named, lesson 3" if it comes up naturally. Default: omit to control length.

## Code conventions applied

- **Index naming**: `idx_<table>_<col>[_<col2>]` (B-tree), `idx_<table>_<col>_gin` (GIN), `idx_<table>_<col>_partial` (partial), `<table>_<col>[_<col2>]_unique` (unique) — the §Data-layer prefix form, **not** the chapter-outline's suffix form. Always explicit `name`.
- **Composite tenant indexes lead with the tenant/org column** (§Data layer).
- **`sql\`\`` tagged template** for partial-index predicates and expression-index bodies (no raw SQL except fixed-string identifiers via `sql.raw`).
- **Partial-index predicate gotcha (verified against live Drizzle docs/issues, June 2026):** write the `.where()` predicate as a raw `sql\`...\`` template (`sql\`status = 'pending'\``, `sql\`${t.isPrimary} = true\``), **never** with the `eq()` helper. There's a known Drizzle Kit bug where `eq()` inside a partial-index `where` emits a parameterized placeholder (`$1`) instead of a literal, producing invalid `CREATE INDEX ... WHERE` SQL. Downstream agents must not "tidy up" the `sql\`\`` form into `eq()`. The directional composite form `.on(t.createdAt.desc(), t.id.desc())` and the GIN form `.using('gin', t.searchVector)` are both confirmed current (Drizzle ≥0.31).
- **`type` over `interface`**, arrow-function consts, single quotes, 2-space indent, trailing commas — baseline; matters only in any TS shown.
- **Deliberate divergence to flag for downstream agents:** lesson code shows `pgTable` with explicit snake_case column names *implicitly via `casing: 'snake_case'`* (set on the client, per §Data layer) — index `.on(t.camelCaseCol)` references the TS property, the emitted SQL is snake_case; don't write snake_case in the `.on()` call. Also: schema-coding/DrizzleCoding widgets don't set client `casing`, so column names inside those widgets are written explicitly snake_case in the builder (`text('org_id')`) — this is a widget constraint, not a convention break.
