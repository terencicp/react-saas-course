# Lesson 8 — Many-to-many junction tables

- **Title:** Many-to-many junction tables
- **Sidebar label:** Junction tables

## Lesson framing

This is the relationship-modeling lesson that L6 (foreign keys) and L7 (constraints) were building toward.
The student already knows: how to declare an FK with `.references(() => other.id, { onDelete })` (L6), that `cascade` means "child owned by parent," the three free guarantees of `.primaryKey()` (L5), and the **composite-PK mechanic** `primaryKey({ columns: [t.a, t.b] })` — seeded in L5 *specifically for this lesson* using `invoiceTags`.
This lesson's job is to assemble those pieces into the one correct shape for N:M, then teach the *senior decision* that actually matters: **when a junction stays a junction vs. when it must graduate to a first-class entity.**

**The senior question (state implicitly in the intro, do not label it).** An invoice carries many tags; a tag applies to many invoices. Neither table can hold the other's id — a column is one value. So *where does the relationship live?* Answer: in its own table, the junction.

**The core mental model the student must leave with.** A junction table is a relationship *reified as rows*. One row = one link between one parent and one parent. The composite PK `(invoiceId, tagId)` is what makes "this exact pair links at most once" a database guarantee, not app discipline. This reuses L5's "a PK is three free guarantees" framing and L7's "a constraint is the rule a stray code path can't skip."

**The decision that carries the lesson — junction vs. entity.** Beginners reach for a junction and stop. The senior move is recognizing the *trigger* that says "this is no longer a pure link, it's a thing": the relationship grows its own data (`role`, `joinedAt`, `quantity`), or — the sharper test — **something else needs to FK *to* the relationship itself.** The moment either is true, you promote: add a surrogate `id` (UUIDv7), demote the composite PK to a `unique(...)` constraint, spread `...timestamps`. This is the highest-value 10 minutes of the lesson; the pure-junction mechanics are the setup for it. Frame the promotion as the same call the student already makes elsewhere (impossible-states / Principle #7 lineage: model the thing the domain actually has).

**Pedagogical spine.** Two worked examples carry everything, both from the running domain:
1. `invoiceTags` — the *pure* junction (two FKs + composite PK, zero metadata). The textbook shape.
2. `memberships` (user ↔ organization, with `role` + `joinedAt`) — the *entity* the pure junction becomes under pressure. Explicitly foreshadowed as the seam Unit 10 tenancy is built on, so the student meets it once here as a data-modeling decision before it returns as an auth concern.

The contrast between the two **is** the lesson. Use a `CodeVariants` (pure vs. promoted) as the centerpiece so the student sees the exact diff: `+ id`, `- primaryKey({columns})`, `+ unique().on(...)`, `+ ...timestamps`, `+ role`.

**Where this sits in the chapter arc.** L8 produces *data* — inert FK columns Postgres enforces. It does **not** make `db.query.invoices.findFirst({ with: { tags: true } })` work; that traversal needs the Relations v2 layer, which is L9's whole job. End on that cliff-hanger explicitly (it's the chapter's narrative hook into L9). Also flag, without solving, that the composite PK indexes `(invoiceId, tagId)` left-to-right — great for `WHERE invoiceId = …`, useless for `WHERE tagId = …` — and that the second-direction index is owed to Ch 039 L1. This is the single most common junction-table performance bug and the student should leave *aware of it*, not fixing it here.

**Tone / level.** Adult, terse, decision-first per the guidelines. No "what is a relationship." Mechanics are shown fast because the FK and composite-PK syntax are already known; the lesson spends its weight on *which shape and why*.

**Staging continuity (carry forward, do not re-litigate).** Lesson prose uses **bare builders** under the `casing: 'snake_case'` client policy (no positional SQL-name strings). PK shape is `uuid().primaryKey().default(sql\`uuidv7()\`)` verbatim from L5 (SQL-side, the course canon — do not switch to `$defaultFn`). Both junction FKs are `.notNull()` and `cascade`. The `DrizzleSchemaCoding` exercise starter uses explicit snake_case name strings (no `casing` client in the sandbox) so probe SQL lines up — consistent with L3–L7.

---

## Lesson sections

### A relationship a column can't hold

**Goal:** motivate the junction table from the failure of the obvious approaches. Short, concrete, sets up the whole lesson.

- Open on the running domain: `invoices` and `tags` (the `tags` table exists from L7 — slug, single-column unique; reference it, don't redeclare). An invoice has many tags; a tag is on many invoices.
- Walk the two instinctive-but-wrong attempts the student would actually try, and why each breaks:
  - **A `tagId` column on `invoices`** (or `invoiceId` on `tags`). A column holds one value — this is 1:N, it can't express "many on both sides." Name it as the one-to-many shape they already know from L6.
  - **A `tags` array column** (`text().array()`, from L3). Revisit L3's exact verdict: array elements "aren't real database rows" — no FK, no referential integrity, a deleted tag leaves dangling strings, and you can't ask "which invoices have this tag" with an index/join. This is the **graduation trigger L3 promised** ("switch to a junction table when the elements need attributes or JOINs") — call that callback explicitly so the chapter coheres.
- Land the resolution in one line: the relationship needs *its own table*. Each row records one (invoice, tag) pairing.
- **Diagram — the shape, before any code.** A small **D2 ER diagram** (`shape: sql_table`, `direction: right`) with three tables: `invoices`, `tags`, and `invoice_tags` between them. `invoice_tags` shows two `foreign_key` columns and the composite PK. Two `1 → many` edges fanning into the junction from each parent. Pedagogical goal: the student sees *N:M is two 1:N relationships pointing inward at a middle table* — the single most clarifying visual for this topic. Wrap in `<Figure>`, caption ties it to the lesson (Unit 6). Keep it to three tables, font bumped per D2 doc guidance.

Why this section: the guidelines demand "trigger before tool." The junction table is the tool; the column/array failure is the trigger. Leading with the diagram-of-the-shape gives the student the target picture before syntax.

### The junction table: two foreign keys and a composite key

**Goal:** build `invoiceTags`, the canonical pure junction, and justify every line.

- Present the full `invoiceTags` table. Both FK columns reuse L6 verbatim: `invoiceId: uuid().notNull().references(() => invoices.id, { onDelete: 'cascade' })`, same for `tagId → tags.id`. Composite PK in the table-callback third arg: `(t) => [primaryKey({ columns: [t.invoiceId, t.tagId] })]` — the exact mechanic L5 seeded. Note the standalone `primaryKey` import from `drizzle-orm/pg-core` (distinct from the chained `.primaryKey()` method) — L5 already drew this distinction; one-line reminder, don't re-teach.
- **Use `AnnotatedCode`** (single block, the student's focus must move across several parts in order). Steps, blue default tint unless noted:
  1. `{1}` the table name `invoice_tags` + the naming rule (covered fully in its own micro-section below, here just point forward).
  2. The `invoiceId` FK line, color green — "FK #1, points at the first parent."
  3. The `tagId` FK line, green — "FK #2, the second parent. A junction is *exactly* two of these in the pure case."
  4. `onDelete: 'cascade'` on both (highlight both occurrences via quoted-string meta), color orange — "a link is **garbage without either endpoint**. Delete the invoice, its tag-links vanish; delete the tag, same. This is the textbook `cascade` case from L6." Reuse L6's exact heuristic phrasing: "if the parent is gone, is the child garbage?" — for a junction the answer is always yes on *both* sides.
  5. The `primaryKey({ columns: [...] })` line, color violet — the keystone step. Explain what the composite PK *buys*: (a) **uniqueness of the pair** — Postgres rejects a duplicate `(invoiceId, tagId)`, so you can't tag the same invoice twice with the same tag, no app check needed (tie to L7's "constraint, not discipline"); (b) **NOT NULL on both columns for free** (L5's three guarantees); (c) **an index on `(invoiceId, tagId)`** for free.
- **Why composite PK and not a surrogate `id` here.** Make this an explicit decision, not an omission. A pure junction has no identity worth minting — the pair *is* the identity, and the composite PK gives uniqueness + index in one stroke. Adding a surrogate `id` to a pure junction is a (mild) smell: it costs a column and an index and still needs a separate `unique(invoiceId, tagId)` to prevent dupes, so you've paid more for the same guarantee. (Foreshadow: the *one* reason to add the `id` is the promotion in the next section — when something must FK to the link.) This reuses L5's "composite PKs belong on junction tables and almost nowhere else" rule, now from the junction's side.
- **What the database now enforces — restate as a tight list** (the student should be able to recite it): duplicate pair rejected; orphan invoiceId rejected; orphan tagId rejected; deleting either parent cascades the links away. This is the payoff of pushing the relationship into the schema.

Why `AnnotatedCode` here: this one block contains four distinct decisions (two FKs, the cascade choice, the composite PK) and the student needs each spotlighted in sequence — exactly the component's purpose. Colors map decision-types so the eye learns the structure.

#### Naming the junction

**Goal:** the naming convention, as its own tight beat (it's a real decision, not a footnote).

- **Pure junction → `{parent1}_{parent2}`, alphabetized:** `invoice_tags` (not `tag_invoices`). Alphabetical removes the bikeshed. Plural snake_case per L2's table convention; exported `const` matches (`invoiceTags`).
- **Entity-with-identity → a domain noun:** when the relationship *is* a thing the business names, name it that — `memberships`, `subscriptions`, `enrollments` — not `users_organizations`. The name is a tell: if you'd naturally say the noun out loud, it's probably an entity (foreshadows the next section's promotion test).
- Keep to ~4 lines of prose. A tiny inline `Code` block showing the two styles side by side is enough; no heavy component.

### When a junction becomes an entity

**Goal:** the lesson's center of gravity — the promotion decision and the exact mechanical diff. Give this the most space.

- **The trigger, stated as two questions** (mirror L5/L6's "the lesson lives in the question order" style):
  1. Does the relationship carry **its own data** — a `role`, a `joinedAt`, a `quantity`, a `status`? (Data that belongs to the *link*, not to either endpoint.)
  2. Would **anything else need to FK *to* the relationship**? (e.g. an `invitations` row pointing at a specific membership.) This is the sharper, less-obvious test — surface it as the senior insight beginners miss.
  - Either "yes" ⇒ promote to an entity. Both "no" ⇒ it stays a pure junction. Phrase the reflex: **"a pure junction is a link; the moment the link has properties or a referent, it's a thing."**
- **The mechanical promotion — show the diff with `CodeVariants`** (this is the section's centerpiece; before/after of the *same* relationship is exactly what `CodeVariants` is for):
  - **Tab "Pure junction"** — `invoiceTags` from the previous section (two FKs + composite PK), recapped.
  - **Tab "Promoted to entity"** — `memberships`: surrogate `id: uuid().primaryKey().default(sql\`uuidv7()\`)` (verbatim L5 shape); `userId` + `organizationId` FKs (still `cascade` — a membership is garbage without either side); a `role` column via `pgEnum` (`'owner' | 'admin' | 'member'`, reuse L3's pgEnum shape); `joinedAt` (or just `...timestamps` from L4's `db/columns.ts` — `createdAt` *is* the joined-at, point that out); and the demoted composite — now a **named `unique('memberships_user_org_unique').on(t.userId, t.organizationId)`** (L7's composite-unique shape) so a user still can't join the same org twice.
  - Use `ins=`/`del=` meta inside the fences to make the four-part diff pop: `+ id`, `− primaryKey({columns})` becomes `+ unique().on(...)`, `+ role`, `+ ...timestamps`. The first sentence of each tab's prose states the framing ("pure link" / "first-class entity"), per the component's convention.
- **Why each promotion step is necessary (prose under the variants):**
  - The surrogate `id` exists **so other rows can point at this membership** (an invite, an audit row) — you can't FK cleanly to a composite key. This is the deep reason promotion adds an `id`; lead with it.
  - The composite *doesn't disappear* — it survives as a `unique` constraint. Same guarantee (no duplicate pairs), demoted from PK to unique because the PK slot now belongs to `id`. Tie to L7: "the uniqueness invariant didn't change, only which column owns the row's identity."
  - `...timestamps` (L4): an entity has a lifecycle; a pure link doesn't. **Adding `createdAt` is itself a promotion signal** — if you're tempted to stamp when the link was made, you've already decided it's an entity. Make this the memorable one-liner.
- **`memberships` is Unit 10's foundation — say so.** One or two sentences: this exact table is how the course models who-belongs-to-which-org and at what role; tenancy enforcement (the `tenantDb` query scoping) is built on it later. The student meets it here as a *data-modeling* decision, uncoupled from auth, which is the right order. Do not teach any tenancy mechanics — just plant the flag.

Why this is the biggest section: per the chapter framing, "metadata on the junction is the upgrade path to a first-class entity" is the lesson's senior payload. The pure junction is mechanically trivial once L5/L6 are done; the *judgment* of when to promote is the durable skill. The before/after `CodeVariants` makes the abstract trigger concrete in code the student can diff at a glance.

### What the junction can't do yet, and one index you still owe

**Goal:** two honest forward-pointers that prevent real bugs and set up L9. Keep tight — this is a closer, not a new topic.

- **The relations cliff-hanger (the chapter hook into L9).** The junction is *data only*. Right now reading "an invoice with its tags" still means a manual join (Ch 038 L2) — the FK columns don't give you `db.query.invoices.findFirst({ with: { tags: true } })` for free. That ergonomic traversal needs a *second* declaration layer, **Drizzle Relations v2** (the `through(...)` junction syntax), which is the entire next lesson. L8 names it as the hook but writes **no** relations code — do not commit to the exact `defineRelations` call shape here (L9 owns it; the v2 form is `r.many.tags({ from: r.invoices.id.through(r.invoiceTags.invoiceId), to: r.tags.id.through(r.invoiceTags.tagId) })`, richer than a bare `through:` key). Make the reader want L9: "you've modeled the relationship; next lesson you teach Drizzle to *walk* it." Reuse L6's already-made distinction (`.references()` = DB constraint, ≠ traversal) — one-line reminder.
- **The half-indexed junction (the bug they'd actually ship).** The composite PK creates an index on `(invoiceId, tagId)`. A B-tree composite index serves a prefix: `WHERE invoiceId = …` is fast; **`WHERE tagId = …` is a full table scan** because `tagId` isn't a left prefix. So "tags on an invoice" is indexed but "invoices with a tag" is not. The fix is a second index on `tagId` — **owed to Ch 039 L1**, do not write it here. Pedagogical goal: the student leaves *knowing this exists*, so when their "find all invoices with tag X" query is slow in production they recognize it instead of guessing. Optionally render this as a one-row two-direction visual (the composite index as an arrow that only reads left-to-right) — a small HTML/CSS `<Figure>` if it earns its space; otherwise prose + a `:::caution` is fine.
- **One guardrail watch-out, inline (not a separate section):** a junction with **three or more FKs** is almost always two relationships hiding as one — split it. (e.g. "user tagged invoice" mixing user+invoice+tag is really `invoice_tags` plus an actor column on an entity.) State the smell and the fix in two sentences.

Why combine these: each is a one-paragraph forward-reference, not a teachable unit. Grouping them as the lesson's "edges" keeps L9's scope clean while discharging the chapter's debts (L9 traversal, Ch 039 index) exactly where the student will remember them.

### Exercise — model the relationship, then promote it

**Goal:** the student builds a pure junction *and* makes the promotion call themselves — the lesson's two skills, assessed.

- **Component: `DrizzleSchemaCoding`** (the chapter's standing exercise type; grader reads composite PKs via `primaryKey: string[]` and composite uniques via `uniques: string[][]`, and runs SQL probes).
- **Two-part task (one editor, or two stacked instances — prefer one with both tables required):**
  1. **Build the pure junction.** Starter gives `invoices` and `tags` (parent tables, with fixed `id`s for seeding). Student writes `invoice_tags`: two `.notNull()` FKs with `onDelete: 'cascade'`, composite PK on `(invoice_id, tag_id)`. Starter uses **explicit snake_case name strings** (no `casing` client in sandbox), per chapter staging.
  2. **Promote a relationship.** Student writes `memberships` as an *entity*: surrogate `id` PK, `user_id` + `organization_id` FKs, a `role` (text/enum), and a **named composite `unique` on `(user_id, organization_id)`**. This forces the student to *perform* the promotion, not just read it.
- **`requirements`:** `invoice_tags` with `primaryKey: ['invoice_id','tag_id']`, both columns `notNull` + `references`; `memberships` with single-column `id` `primaryKey`, the two FK columns, and `uniques: [['user_id','organization_id']]`.
- **Probes (the grader can't read `onDelete` or assert the unique *fires* from config — verify by INSERT, per chapter pattern):**
  - `mustSucceed: false` — inserting a duplicate `(invoice_id, tag_id)` pair into `invoice_tags` (composite PK rejects it).
  - `mustSucceed: false` — inserting an `invoice_tags` row with a non-existent `tag_id` (FK rejects orphan).
  - `mustSucceed: true` — delete a parent `invoices` row; a probe then confirms its `invoice_tags` rows are gone (cascade fired). Keep this minimal per the grader notes.
  - `mustSucceed: false` — inserting a duplicate `(user_id, organization_id)` into `memberships` (the demoted unique still guards the pair).
  - `seedSQL`: a couple of `invoices`, `tags`, `users`, `organizations` parent rows with fixed UUID literals so probes have referents.
- **`instructions`:** one paragraph — "model the invoice↔tag link as a pure junction, then model the user↔org relationship as an entity because it carries a role."
- Grading criteria the checklist surfaces: each missing column/PK/unique named on ✗; each probe's success/failure proves the constraint behavior. This is a TODO-stub-friendly spec; hand the probe SQL minimal.

Why this exercise: it's the only way to assess the *judgment* (promote or not) — a recall quiz can't. Building both shapes back-to-back makes the diff muscle-memory. `DrizzleSchemaCoding`'s probe mechanic is the only grader that can prove the composite PK and the cascade actually behave, which is the whole point.

### Tooltips (`Term`)

Strategic, only where a prior-lesson term needs a no-flow-break refresher or a new term lands:
- **junction table** — "A table whose only job is to record links between two other tables. One row = one link." (the lesson's central term; define on first use.)
- **composite primary key** — "A primary key spanning two or more columns; the *combination* must be unique." (introduced mechanically in L5; one refresher here.)
- **reify** — if used in prose ("the relationship reified as rows"), gloss it: "make an abstract relationship into a concrete, storable thing." Only if the word is used.
- Reuse, do **not** redefine, terms the chapter already established with `Term` or in prose: `cascade`, `referential integrity`, `orphan row`, `surrogate key`, `invariant`, `constraint` (L5–L7 own these). A one-clause inline reminder is fine; a fresh tooltip is redundant.

---

## Scope

**Prerequisites — assume taught, restate in ≤1 clause only if load-bearing:**
- FK declaration `.references(() => other.id, { onDelete })` and the four `onDelete` rules — **L6**. Especially `cascade` = "child owned, garbage without parent."
- `.primaryKey()`'s three free guarantees (NOT NULL + UNIQUE + index) and the composite-PK mechanic `primaryKey({ columns })` — **L5** (seeded with `invoiceTags` *for this lesson*).
- The canonical PK shape `uuid().primaryKey().default(sql\`uuidv7()\`)` — **L5** (reuse verbatim, no re-litigation).
- Composite/named `unique(...).on(...)` constraint shape and "NULL ≠ NULL" — **L7**.
- `pgEnum` shape, `text().array()` and its "graduate to a junction" trigger — **L3**.
- `...timestamps` / `db/columns.ts` — **L4**.
- Bare-builder-under-`casing` prose convention + exercise-starter snake_case staging — **L2–L7**.

**This lesson does NOT cover (hand off, name the owner):**
- **The Drizzle Relations v2 API** (`defineRelations`, `r.many.tags({ through: r.invoiceTags })`) and `db.query.…({ with })` traversal — **L9**. L8 ends on this as a cliff-hanger but writes *zero* relations code.
- **Indexing the junction's second column** (`tagId`) and index strategy generally — **Ch 039 L1**. Named as an owed fix, not built.
- **Querying through a junction** — manual joins (`innerJoin` on the junction) are **Ch 038 L2**; the relational `with` read is **Ch 038 L3**. No query code in this lesson.
- **Multi-tenancy / memberships at depth** — the `role`-based access model, `tenantDb` query scoping, org switching — **Unit 10 (Ch 056+)**. `memberships` appears here only as a data-modeling example; plant the flag, teach no auth.
- **Soft-delete interaction with junctions** (does deleting a parent soft- or hard-delete links) — **Ch 061**. The lesson teaches `cascade` as the hard-purge rule per L6's framing; don't re-open soft-delete.
- **`$inferSelect`/`$inferInsert` on junction rows** — **L10**. (A junction row infers like any table; no special note needed here.)

---

## Notes for downstream agents

- **Do not re-teach** FK or composite-PK syntax from scratch — L5/L6 own it; this lesson *applies* it. Spend the saved space on the junction-vs-entity decision.
- **Running domain is fixed:** `invoices`, `tags`, `invoiceLineItems`, `organizations`, `users` already exist across L4–L7. `tags` is from L7 (don't redeclare its slug-unique). `invoiceTags` was seeded in L5 and named in L6 — this lesson is where it's finally built in full. `memberships` is new here and is Unit 10's seam.
- **PK / FK shapes are verbatim from L5/L6** — `uuid().primaryKey().default(sql\`uuidv7()\`)`, FKs `.notNull().references(() => …, { onDelete: 'cascade' })`. `sql` imported from `drizzle-orm`, `primaryKey`/`unique` from `drizzle-orm/pg-core`.
- **Centerpiece is the pure-vs-promoted `CodeVariants` diff** — that single A/B is the lesson's most load-bearing component. The `AnnotatedCode` build of `invoiceTags` and the D2 ER diagram support it.
- **Two cliff-hangers must land explicitly:** (1) "data only — L9 teaches the traversal"; (2) "composite PK half-indexes the junction — Ch 039 L1 adds the second index." These discharge chapter debts.
- **Exercise grader reality:** `DrizzleSchemaCoding` reads composite PK (`primaryKey: string[]`) and composite unique (`uniques: string[][]`) from config, but **cannot read `onDelete` or whether a unique fires** — cascade and dup-rejection are **probe-only**. Keep probe SQL minimal; `seedSQL` uses fixed UUID literals.
