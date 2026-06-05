# Lesson 9 — Drizzle Relations v2

- **Title:** Drizzle Relations v2
- **Sidebar label:** Relations v2

## Lesson framing

This is the chapter's second-to-last lesson and the one that turns the inert FK columns of L6/L8 into a *traversable graph*.
The student already knows: an FK declared `.references(() => other.id, { onDelete })` (L6) is a database constraint Postgres enforces; the `invoiceTags` junction is two cascade FKs + a composite PK (L8); the running domain (`organizations`, `invoices`, `invoiceLineItems`, `users`, `tags`, `invoiceTags`, `memberships`).
This lesson's job: declare the **TS-side traversal layer** in a new file `db/relations.ts` using `defineRelations`, so that Ch 038 L3 can write `db.query.invoices.findMany({ with: { lineItems: true, tags: true } })` and get a typed nested object back. The lesson writes the *graph*, not the *queries* — the query API is named as the payoff but owned by Ch 038 L3.

**The senior question (state implicitly in the intro, do not label it).** L6 connected rows with foreign keys. So why can't `db.query.invoices.findFirst({ with: { lineItems: true } })` already work? Because an FK is a *write-time guarantee* the database keeps; it says nothing to the *query API* about how to walk the join in TypeScript. The traversal graph is a separate, TS-only declaration — and that is what this lesson builds.

**The core mental model the student must leave with — two layers, one database.** `db/schema.ts` says *what is in the database* (tables, columns, FKs — the only thing Postgres ever sees). `db/relations.ts` says *how the relational query API walks it* (a convenience graph that never touches Postgres). The FK and the relation are two independent declarations of the *same edge* for two different audiences: the FK for the database's integrity engine, the relation for Drizzle's query builder. **Declaring one does not declare the other.** This is the lesson's load-bearing distinction and the source of the #1 beginner bug (`db.query.…({ with: { tags: true } })` returns `undefined` for `tags` because the relation was never declared, even though the FK is right there).

**Why v2 only — and the deliberate divergence to flag.** The course teaches the **v2** API (`defineRelations`) exclusively, per the chapter framing. This is a *deliberate, reasoned divergence from `Code conventions.md` §Data layer*, which currently still lists the **v1** per-table `relations(<table>, ({ many, one }) => …)` helper as the stable shape with v2 as a parenthetical "Drizzle 1.0 replaces this." The lesson author must NOT normalize back to v1; instead, surface the version reality honestly in one tight aside: v2 ships in `drizzle-orm@1.0.0-beta` (the forward-looking shape L1's continuity note already committed the chapter to), v1 is now labelled "[OLD]" in the docs, its import moved to `drizzle-orm/_relations` and its query helper to `db._query`. Flagged for the conventions maintainer — see Scope. The student should leave knowing v2 is what they write and *why* (more compact, no double-declaration, native `through`, better inference), and recognize v1 only enough to not be confused by older code/tutorials.

**Pedagogical spine.** Build `db/relations.ts` incrementally on the running domain, simplest edge first, in this order: (1) the file scaffold + `defineRelations(schema, (r) => ({...}))` signature; (2) a one-to-many / many-to-one pair (`organizations` ↔ `invoices`) — the bread-and-butter shape, taught with the `from`/`to` direction made explicit; (3) the v2 *one-sided declaration* convenience (the reverse side can be declared bare, Drizzle infers it); (4) many-to-many through the junction (`invoices` ↔ `tags` via `invoiceTags`) — the `.through()` chain on **both** `from` and `to`, the genuinely new v2 capability; (5) self-referential as a brief recognition note. Close with the payoff preview (`db.query` nested read) and the "when to drop to manual joins" boundary.

**The single most clarifying visual** is an interactive graph: a `<GraphExplorer>` of the domain where nodes are tables and labelled edges are the *relations* the student is declaring, with `<Traversal>` play buttons that walk a nested read (`invoices → lineItems`, `invoices → tags via invoiceTags`). The student sees the traversal graph as a graph, then writes it as `defineRelations`. This is the right component because the lesson *is* "each table's relations and how they connect," and the edges carry the lesson (the `from`/`to`/`through` distinction).

**Tone / level.** Adult, terse, decision-first. The FK syntax and junction shape are known, so mechanics move fast; the lesson spends its weight on the *two-layers* mental model and the `from`/`to`/`through` direction semantics, which are where beginners actually stumble.

**Staging continuity (carry forward, do not re-litigate).** Schema-side code reuses the running domain verbatim from L4–L8 — do **not** redeclare tables, only `import` them into `db/relations.ts` and reference their columns. Lesson prose uses **bare builders** under the `casing: 'snake_case'` client policy. PK shape stays `uuid().primaryKey().default(sql\`uuidv7()\`)` (L5 canon) where a table is shown at all. The `db/index.ts` wiring (`drizzle(client, { relations })`) is shown only as the *isolated config line* — full client setup (pooling, connection string, env validation) remains owed to **Ch 040 setup**, exactly as L2 staged.

---

## Lesson sections

### Why the foreign key isn't enough

**Goal:** motivate the entire lesson from the gap between an FK and a traversable query. Trigger-before-tool: the failing `db.query` call is the trigger, `defineRelations` is the tool.

- Open on a concrete want from the running domain: "give me this invoice *with* its line items and its tags, as one typed object" — the read every detail page needs. Show the *aspirational* call the student would reach for: `db.query.invoices.findFirst({ with: { lineItems: true, tags: true } })`. State plainly it does not work yet, and that's surprising precisely because L6 already declared the FKs.
- Explain the gap directly: a foreign key is a **write-time integrity guarantee** — Postgres rejects an orphan on every insert/update. It is *not* a map the query builder can read to assemble a nested object. The relational query API needs a *separate, TS-side declaration* of which edges to walk. Reuse L6's framing ("an FK is a promise the database keeps") and extend it: "that promise is about *writes*; the query API needs a second declaration about *reads*."
- Introduce the two-file split as the mental model up front (it governs the whole lesson):
  - `db/schema.ts` — **what's in the database.** The only file Postgres ever sees (via migrations, Ch 040). FKs live here.
  - `db/relations.ts` — **how the query API walks it.** A pure-TypeScript graph. Never touches Postgres; emits no SQL; generates no migration. Its only consumer is the `db.query` builder.
- Land the one-sentence thesis the student carries: **the FK and the relation are two declarations of the same edge for two audiences — the database's integrity engine and Drizzle's query builder — and declaring one never declares the other.**
- **Diagram — the two layers, before any `defineRelations` code.** A small side-by-side **D2** (or plain HTML two-column) `<Figure>`: left column "schema.ts → Postgres" showing two tables joined by an FK arrow labelled `ON DELETE`; right column "relations.ts → db.query" showing the same two tables joined by a relation arrow labelled `with`. Same two boxes, two different edges, two different readers. Pedagogical goal: cement that the relation is a *parallel* declaration, not a property of the FK. Keep it to two tables; cap height per the diagrams vertical-space rule.

**Why this section:** the guidelines demand the senior question be implicit in the intro and "trigger before tool." The non-working `db.query` call is the most visceral possible trigger, and the two-layer split is the frame everything else hangs on.

### The relations file and `defineRelations`

**Goal:** establish the file scaffold, the `defineRelations(schema, (r) => ({...}))` signature, and how it consumes the schema.

- Present the new file `db/relations.ts` and its shape: import the tables from `./schema`, call `defineRelations(schema, (r) => ({...}))`, export the result as a single `relations` const. Reuse L2's "fourth-file-beside-schema" framing — `db/` now holds `schema.ts`, `columns.ts` (L4), `relations.ts`, `index.ts`.
- Break down the signature precisely:
  - **First argument** — the schema object: `{ organizations, invoices, invoiceLineItems, users, tags, invoiceTags, memberships }` (all tables, passed as one object). This is what gives `r` autocomplete for every table and column.
  - **Second argument** — a callback `(r) => ({...})` returning a map keyed by **table name**, each value an object of that table's relations. `r` is the relation builder: `r.one.<table>(…)`, `r.many.<table>(…)`, and `r.<table>.<column>` to reference a column inside `from`/`to`.
- Show where the file plugs in — **the isolated wiring line only**: `drizzle(client, { relations })`. State that `relations` carries the table+graph info the `db.query` builder needs, and that the full client setup (connection, pooling, env) is Ch 040. One sentence, no full `db/index.ts`.
- **Use `Code` (single simple block)** for the empty scaffold — it's a structural skeleton, not yet a focus-walk. The first *real* relations get the `AnnotatedCode` treatment in the next section.
- `Tooltip` candidates introduced here: **`defineRelations`** (one-line: "v2 API that declares the whole traversal graph in one call"), **relational query API / RQB** (the `db.query.…` builder these relations feed).

**Why this section:** the student needs the container and the call signature before any edge makes sense. Keeping it a plain `Code` block (not annotated) reserves the heavier component for the edge that actually teaches direction.

### One-to-many: an organization and its invoices

**Goal:** teach the bread-and-butter relation pair and make the `from`/`to` direction unambiguous.

- Use `organizations` (one) ↔ `invoices` (many) — the FK is `invoices.organizationId → organizations.id` with `restrict` (L6 canon). Present both ends inside `defineRelations`:
  - On `organizations`: `invoices: r.many.invoices()` — "an org has many invoices."
  - On `invoices`: `organization: r.one.organizations({ from: r.invoices.organizationId, to: r.organizations.id })` — "an invoice belongs to one org."
- **Use `AnnotatedCode`** (single block, focus moves across the two declarations and the `from`/`to` line). Steps, colored:
  1. `{1-…}` the `organizations` key with `invoices: r.many.invoices()`, color blue — "the *many* side names the relation (`invoices`) and the target table; the array shape is implied by `r.many`."
  2. The `invoices` key with the `r.one.organizations({...})` line, color green — "the *one* side; `r.one` means a single object, not an array."
  3. `"from: r.invoices.organizationId"` quoted, color orange — **the FK-holding column.** Reuse the doc's own wording: `from` is the column on *this* side that points outward. Emphasize: `from` is always the table that *holds the foreign key*.
  4. `"to: r.tags.id"`→ here `"to: r.organizations.id"` quoted, color violet — **the column it points at**, the referenced PK. `from` → `to` mirrors the FK's own direction (`organizationId → organizations.id`).
- **Naming convention** (reuse `Code conventions.md` §Naming verbatim): **singular for `one`, plural for `many`** — `organization` (the one side), `invoices` (the many side). The relation key is what the student types in `with: { … }`, so it should read like the data: `with: { organization: true }`, `with: { invoices: true }`.
- **The `from`/`to`-only-on-one-side rule.** Make explicit which side carries `from`/`to`: the side declared with `r.one` that *holds the FK column* (here `invoices`). The `r.many` reverse side (`organizations.invoices`) needs **no** `from`/`to` in v2 — Drizzle infers it from the forward declaration. Teach this as the next subsection so it lands as a feature, not an accident.
- **`Tooltip` candidates:** **`from`** ("the column on this side — the FK holder"), **`to`** ("the column it references — the target PK").

**Why this section:** one-to-many/many-to-one is ~80% of every real schema's relations; getting `from`/`to` direction reflexive here is what makes the rest trivial. Coloring `from` and `to` differently in the annotated walk is the clearest way to fix the direction in memory.

### One declaration, both directions

**Goal:** teach the v2 convenience that the reverse side can be declared bare, and the trade-off of declaring it at all.

- State the v2 improvement directly (it's a headline reason the course picks v2): unlike v1 — which required `fields`/`references` on **both** ends — v2 lets you fully specify the edge **once** (on the FK-holding side, with `from`/`to`) and declare the reverse side as a bare `r.many.invoices()` / `r.one.organizations()`. Drizzle matches them by table and infers the reverse direction.
- Show the contrast compactly with **`CodeVariants`** (two tabs):
  - **"Bare reverse"** — `organizations: { invoices: r.many.invoices() }`, no `from`/`to`. One-paragraph prose: the common case; Drizzle infers the join from the forward `invoices.organization` declaration. `del=`/`ins=` not needed; highlight the bare call.
  - **"Explicit reverse"** — `organizations: { invoices: r.many.invoices({ from: r.organizations.id, to: r.invoices.organizationId }) }`. Prose: legal and sometimes clearer, but redundant when one side already pins it; reach for it only when disambiguation is needed (multiple edges between the same two tables — see next note).
- **Both directions are usually declared, even if the reverse is bare.** Reuse the chapter framing's watch-out: declare *both* ends so the next reader can traverse either way (`org.invoices` *and* `invoice.organization`) without guessing. A missing reverse isn't an error — that relation simply doesn't exist in `with: {…}` — so the cost of omitting it is a silent "why can't I traverse this?" later.
- **Disambiguation with `alias`** — a brief, named mechanic (not a deep dive). When two relations connect the same pair of tables (e.g. an `invoices.createdById` *and* `invoices.assignedToId` both → `users`), Drizzle can't tell them apart by table alone; pass `alias: 'creator'` / `alias: 'assignee'` on each so the `with` keys stay distinct. One example, one sentence on *why* (ambiguity), then move on — full multi-edge modeling is out of scope.

**Why this section:** the one-sided-declaration ergonomics is the concrete "v2 is nicer" payoff and directly prevents the over-typing v1 forced. The `alias` note is the minimum needed so a student with two FKs to `users` (which the domain already has, per L6's `assignedToId`) isn't blocked.

### Many-to-many: walking the junction with `through`

**Goal:** teach the genuinely new v2 capability — traversing a junction table automatically with `.through()` — using `invoices` ↔ `tags` via `invoiceTags`.

- Reconnect to L8: `invoiceTags` is *data* — two cascade FKs + composite PK — and L8 ended on exactly this cliff-hanger ("the junction is inert until the relations layer walks it"). This section is that walk.
- Present the many-to-many relation. The key insight that **corrects a natural wrong guess**: there is **no** top-level `through: invoiceTags` option. Instead, `.through()` chains onto **both** the `from` and the `to` column, naming the junction column on each side:
  ```ts
  invoices: {
    tags: r.many.tags({
      from: r.invoices.id.through(r.invoiceTags.invoiceId),
      to: r.tags.id.through(r.invoiceTags.tagId),
    }),
  }
  ```
  Read it aloud as the lesson should: "from `invoices.id`, hop *through* `invoiceTags.invoiceId`; to `tags.id`, arriving *through* `invoiceTags.tagId`." The junction is named twice because the API walks it as two hops — one to the junction, one out of it.
- **Use `AnnotatedCode`** (single block; the `.through()` chain is exactly the multi-part focus this component is for). Steps:
  1. `{1-…}` the whole `tags: r.many.tags({…})` declaration, blue — "still `r.many` — an invoice has many tags."
  2. `"from: r.invoices.id.through(r.invoiceTags.invoiceId)"`, green — the entry hop: this table's PK, *through* its column in the junction.
  3. `"to: r.tags.id.through(r.invoiceTags.tagId)"`, violet — the exit hop: the target PK, *through* the other junction column. Emphasize symmetry: both sides chain `.through()`, each naming *its own* FK column in the junction.
  4. (optional) the reverse side on `tags` — `invoices: r.many.invoices()` bare, or the mirror `through`. Note the junction itself usually needs **no** relations of its own for this traversal — the student does not declare anything *on* `invoiceTags`.
- **Contrast with v1 to justify the API** (one tight aside, not a section): in v1 the junction was traversed by declaring a relation *on the junction table* to each parent and chaining two `with`s; v2's `.through()` collapses that into a single direct `invoices.tags` relation — the headline ergonomic win and a reason the course standardizes on v2. Recognition only; no v1 code.
- **What this buys, stated as the payoff:** with this one declaration, `db.query.invoices.findFirst({ with: { tags: true } })` (Ch 038 L3) returns the invoice with a `tags: Tag[]` array, the junction invisible. The student does not write that query here — name it as the cash-in, owed to Ch 038 L3.
- **`memberships` aside (brief):** the *promoted entity* from L8 (user ↔ org with `role`) is **not** traversed with `.through()` — because it has its own `id` and data, you relate to it as a first-class table (one-to-many from each parent to `memberships`, then `memberships` one-to-one back to `user`/`organization`). One sentence contrasting "pure junction → `through`" vs "promoted entity → relate to it directly." Ties L8's junction-vs-entity decision to its querying consequence. Do not build the full `memberships` relation set — name the shape, defer depth.

**Why this section:** `.through()` is the one piece of genuinely new v2 syntax with a real wrong-guess attached (the top-level `through:` the chapter outline itself guessed). Correcting it explicitly, with both-sides symmetry colored in the walk, is the highest-value syntax moment in the lesson.

### Self-referential relations

**Goal:** recognition-level coverage of a table relating to itself, so the student isn't stuck when a tree/thread appears.

- Brief. Motivate with a concrete shape from common SaaS domains: a comment that replies to another comment, a category with a parent category, an org chart. Same table on both ends of the edge.
- Show the shape compactly with a plain `Code` block (no annotation needed — the student now reads `from`/`to` fluently): a `comments` table with `parentId: uuid().references(() => comments.id)`, related as `parent: r.one.comments({ from: r.comments.parentId, to: r.comments.id })` and `replies: r.many.comments({ from: r.comments.id, to: r.comments.parentId })`. Point out `alias` may be needed if multiple self-edges exist.
- Keep it to ~4 lines of prose + the block. Explicitly out-of-scope: recursive *querying* (fetching a whole tree to arbitrary depth) — that's a query concern, not a relations-declaration one.

**Why this section:** self-reference is common enough that omitting it leaves a gap, but it introduces no new mechanic — so it earns only a short recognition pass, not a worked build.

### When to skip the relations layer

**Goal:** name the boundary — relations + `db.query` is the senior reach for *nested tree reads*, but not for everything — so the student doesn't over-apply it.

- State the division of labor (forward-looking, the queries themselves are Ch 038):
  - **Reach for the relational API (`db.query.…({ with })`)** when the read is a *tree*: an entity and its children/related rows, shaped as a nested object. This is what `defineRelations` exists for and the N+1-safe default (Ch 038 L3; the N+1 angle is Ch 039 L2).
  - **Drop to manual joins (`db.select(...).leftJoin(...)`, Ch 038 L2)** when the read is *not* a tree: aggregates (`COUNT`, `SUM` over joined rows), complex predicates that filter on a joined table, arbitrary column projections across tables, set operations. The relational API plans its own SQL and isn't built for those shapes.
- One honest watch-out (reuse chapter framing): the relational API **plans its own SQL**, so a deeply nested `with` can emit a heavier query than you'd expect — `EXPLAIN ANALYZE` (Ch 039 L3) is the diagnostic, and the `logger: true` flag from L2 is how you see the emitted SQL. Name, don't solve.
- Keep this short and as the closing frame — it positions relations as *one tool with a clear job*, satisfying the guidelines' "defaults-before-conditionals, name the threshold the tool crosses."

**Why this section:** beginners who just learned the relational API tend to force *every* read through it, including aggregates it handles poorly. Naming the boundary now (before the student writes any query, in Ch 038) sets the right reflex.

### Check your understanding

**Goal:** verify the two highest-value ideas — the FK-vs-relation distinction and `from`/`to`/`through` direction — with quick interactive checks. (Not a coding exercise: `defineRelations` is a *declaration* graders can't probe via SQL, and the schema-coding grader checks tables/columns/constraints, not the relations graph — so live-coding isn't the right tool here. See Scope.)

- **`MultipleChoice`** (single question, the load-bearing misconception): "`db.query.invoices.findFirst({ with: { tags: true } })` returns `tags: undefined` even though `invoiceTags` has both foreign keys with `cascade`. Why?" Correct: the relation was never declared in `db/relations.ts` — the FK is a write-time guarantee, not a traversal hint. Distractors: "the FKs need an index," "`with` only works on one-to-one," "the junction needs a surrogate `id`." Reinforces the lesson's core distinction.
- **`Dropdowns`** (fill-in on a fenced `invoices ↔ tags` many-to-many declaration with `___` for the two `through` halves and the `from`/`to` columns): the student picks `r.invoices.id` / `r.invoiceTags.invoiceId` / `r.tags.id` / `r.invoiceTags.tagId` into the right slots. Verifies they internalized that `.through()` names *each side's own* junction column. Provide the `answers` prop.
- (Optional, if a third check is wanted) **`Matching`** — left: `r.one` / `r.many` / `.through()` / `from` / `to`; right: "single object" / "array" / "walk a junction" / "FK-holding column" / "referenced PK". A fast vocabulary lock.

**Why this section:** the two checks map exactly onto the two places students stumble (the silent-`undefined` cause and the `through` direction). Multiple-choice nails the *concept*, dropdowns drill the *syntax* — together they cover understanding and recall without a sandbox the topic can't support.

### External resources

- **`ExternalResource`** cards (place at lesson end per guidelines):
  - Drizzle Relations v2 docs (`orm.drizzle.team/docs/relations-v2`) — the canonical `from`/`to`/`through` reference.
  - Drizzle RQB v2 / query docs (`orm.drizzle.team/docs/rqb-v2`) — forward pointer to what these relations enable (Ch 038 L3).
  - Drizzle v1→v2 migration guide (`orm.drizzle.team/docs/relations-v1-v2`) — for students who hit v1 code in the wild.
- No YouTube embed proposed: the topic is API-declaration detail best served by the interactive `GraphExplorer` + annotated code; a video would add length without adding clarity. (If the resourcer finds a current, high-quality Drizzle v2 relations walkthrough, a single `VideoCallout` near the `through` section is acceptable — optional, not required.)

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- An FK is `.references(() => other.id, { onDelete })`, a write-time integrity guarantee (L6) — one sentence, as the contrast the lesson is built on.
- The `invoiceTags` junction = two cascade FKs + composite PK (L8) — referenced, not rebuilt.
- `db/` holds `schema.ts`, `columns.ts`, `index.ts` (L2/L4) — `relations.ts` is the new fourth file.
- The running domain tables — imported, never redeclared.

**This lesson does NOT cover (owned elsewhere):**
- **Writing queries through the relational API** (`db.query.…({ with, where, columns })`, nested filtering/projection) — **Ch 038 L3**. This lesson declares the graph; it shows the `db.query` *call* only as motivation/payoff, never as a worked query.
- **Hand-written joins** (`db.select(...).leftJoin(...)`) — **Ch 038 L2**. Named only in the "when to skip" boundary.
- **The N+1 problem** at the relations layer and how `with` avoids it — **Ch 039 L2**. Named once as a forward pointer.
- **`EXPLAIN ANALYZE`** and SQL inspection of a relational query — **Ch 039 L3** (the `logger: true` flag from L2 is the only inspection tool named here).
- **Full `db/index.ts` client wiring** (`drizzle(client, { relations })` with pooling, connection string, env validation) — **Ch 040 setup**. Only the isolated `{ relations }` config fragment is shown.
- **Drizzle Kit migrations** — relations emit **no** SQL and no migration; reinforce that `db/relations.ts` is invisible to Drizzle Kit (only `schema.ts` is read). Ch 040.
- **The v1 relations API at depth** — the course teaches **v2 only**. v1 is named for recognition (so students aren't confused by older tutorials), including its `[OLD]` status, the `drizzle-orm/_relations` import, and the `db._query` helper — no v1 code is written.
- **Multi-edge / polymorphic modeling at depth** (`where` predefined filters, multiple `alias`ed relations beyond the single `creator`/`assignee` example) — named for recognition only.
- **`$inferSelect`/`$inferInsert`** and inferred *relational result* types — **L10** / **Ch 038 L3** (inferred types don't include relations; the relational query API has its own inferred shapes).

**Convention divergence to flag (for the maintainer, surface in the lesson as a one-line aside):** `Code conventions.md` §Data layer (line ~274) still lists **v1** `relations(<table>, ({ many, one }) => …)` as the stable shape with v2 as a parenthetical. This chapter teaches **v2 (`defineRelations`)** as canonical, consistent with L1's "forward-looking Drizzle 1.0" continuity note. Downstream agents should not normalize the lesson back to v1; the conventions doc's Data-layer relations bullet should be updated to v2 when the maintainer next passes through.
