# Foreign keys and ON DELETE

- Title (h1): `Foreign keys and ON DELETE`
- Sidebar label: `Foreign keys`

---

## Lesson framing

The chapter's relationship lesson. L1–L5 built columns and finalized every table's `id`; this lesson is the first to **connect** two tables. The mechanic (`.references(() => other.id, { onDelete })`) is one line — the lesson's weight is the **decision attached to it**: when a parent row is deleted, what happens to its children? That decision (`cascade` / `set null` / `restrict` / `set default`) is a per-relationship modeling call a senior makes deliberately, and getting it wrong is a data-integrity bug that ships silently.

**Senior question driving the lesson** (state implicitly in the intro, do not label it): *When a parent row goes away — an org deleted, a user offboarded — what happens to the rows that point at it?*

**The mental model the student should leave with:** a foreign key is two things at once — (1) a **guarantee** Postgres enforces on every write (you cannot point at a parent that doesn't exist), and (2) a **deletion policy** (`onDelete`) that fires when the parent is removed. The policy is not a default to accept blindly; it's chosen from the *meaning of the relationship*. The reflex: for each FK, ask "does the child mean anything once the parent is gone?" — that answer picks the rule.

**Why this matters / pain it relieves:** without an FK, orphan rows (a line item whose invoice no longer exists, a task assigned to a deleted user) accumulate and every read path has to defensively handle them. The FK pushes that integrity down to the database boundary so application code stays clean — the same "database is the last line" theme L7 will extend to UNIQUE/CHECK. The `onDelete` rule then decides cleanup *once, declaratively*, instead of the app re-implementing cascade logic in every delete code path.

**Where beginners go wrong (address these head-on):**
- Omitting `onDelete` entirely — the silent default is `NO ACTION`, which means the app must clean up children before every parent delete or the delete throws. Most beginners *want* `cascade` or `restrict` and get `NO ACTION` by accident.
- Reaching for `cascade` reflexively because it "just works" in dev — then a cascade wipes more than expected when the graph branches (deleting an org silently deletes its invoices, line items, tags…). Cascade is correct for *ownership*, dangerous everywhere else.
- Confusing the FK (a Postgres constraint) with a Drizzle *relation* (L9, the TS-side traversal hint). They are separate declarations; this lesson is **only** the constraint.
- Assuming `cascade` is how you "delete" things in a SaaS — most production SaaS **soft-deletes** (sets `deletedAt`) and never hard-deletes the parent at all, so cascade never fires. The hard-vs-soft split is the lesson's reframe that keeps cascade in its lane.

**Teaching approach (whole-lesson):**
- Lead with the **problem** (orphan rows) before the syntax, using two tables the student already has from L1–L5 (`invoices` → `organizations`, `invoiceLineItems` → `invoices`).
- The four `onDelete` behaviors are the core. Teach them as a **decision**, not a feature list: a `StateMachineWalker` is the spine of this section — it forces the student through the *order* the senior asks questions in (is the child owned? is the pointer optional? must the parent be blocked?) and lands on a recommended rule. This matches L5's decision-tree treatment and is the single most important interactive in the lesson.
- Cash the decision out on a **worked example with four relationships of different rules on one entity** (`invoices`), so the student sees that one table legitimately mixes `restrict`, `cascade`, and `set null`. This is the "aha": the rule is per-edge, not per-table.
- The hard-vs-soft-delete split is a **reframe**, not a new mechanic — keep it tight, name `deletedAt` (already in `db/columns.ts` from L4), and defer the query-filtering depth to Ch 061. Its job here is to stop the student over-applying cascade.
- Code: small `Code` blocks for the single-FK declaration; `AnnotatedCode` for the four-relationship worked example (one block, focus shifts to each FK + its rule in turn). No `CodeVariants` needed — the variants here are *rules*, which the walker carries better than tabs.
- One `DrizzleSchemaCoding` exercise with **probes** is the assessment: the student wires FKs with the right `onDelete`, and probes prove the constraints fire (cascade cleans children; restrict blocks the delete). Grader can't read `onDelete` from config, so probes are load-bearing, not decorative.
- Keep cognitive load low: introduce the FK as guarantee first (one rule: reject dangling writes), *then* layer the deletion policy on top. Don't show all four rules before the student has seen one FK work.

---

## Lesson sections

### Introduction (no header)

Open on the orphan problem with two tables the student already wrote: `invoiceLineItems` has an `invoiceId` column that's *supposed* to point at an `invoices` row — but right now it's just a `uuid` column. Nothing stops an insert with a garbage `invoiceId`, and nothing happens to the line items when the invoice is deleted. Name the two jobs a foreign key does: **enforce the link** and **decide what happens on parent delete**. Preview the four-way `onDelete` decision and the hard-vs-soft-delete reframe as the lesson's payoff. Connect back: L5 said "every FK points at one PK" — this lesson is the FK end of that sentence. Warm, ~3 sentences.

### A foreign key is a promise the database keeps

Teach the FK as a **guarantee** first, before any deletion policy.

- The declaration, column-level, callback form:
  ```ts
  organizationId: uuid().notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  ```
  Use a `Code` block. Walk the three parts in prose: the column (`uuid`, matching the PK type), `.references(() => organizations.id, …)`, and the `onDelete` option (introduce it here as "the deletion policy — covered next section", don't explain all four values yet).
- **Why the callback `() => organizations.id`?** It defers resolution past module evaluation so two tables that reference each other don't hit a circular-import / temporal-dead-zone error. State this as the reason, not a ritual — it's a real footgun the student will hit. (One-sentence; this is the "explicit over magic" payoff.)
- **What the FK buys**, three concrete guarantees:
  1. Postgres **rejects any write** (insert or update) whose `organizationId` doesn't match an existing `organizations.id`. Orphans are impossible at the boundary.
  2. **Column types must match the referenced PK exactly** — `uuid` FK → `uuid` PK, `bigint` FK → `bigint` PK. A type mismatch is a migration-time error, not a runtime surprise. (Ties to L5's PK shapes.)
  3. The FK column is **not automatically indexed** — declaring the constraint does not create an index, and an unindexed FK makes cascade deletes and reverse lookups slow. Name this explicitly and **defer the fix to Ch 039 L1** (cliff-hanger, one sentence). This is a common senior gotcha the student must at least *know exists*.
- **The reflex framing to establish here (reuse later):** "The FK moves orphan-prevention from app code to the database boundary." App code no longer has to defensively check that a parent exists — the write would have failed.
- Brief mention, named for recognition only: **multi-column FKs** use the table-level `foreignKey({ columns, foreignColumns })` helper (third `pgTable` argument). Rare; the course's surrogate-`id` PKs (L5) mean single-column FKs are nearly always the shape. One sentence, do not demonstrate.

Tooltip (`Term`) candidates in this section: **orphan row** (a child row whose referenced parent no longer exists), **referential integrity** (the database guarantee that every FK value points at a real row).

### Choosing what happens on delete: the four ON DELETE rules

The core of the lesson. Frame as a decision, taught via prose + a `StateMachineWalker`.

First, in prose, establish the question precisely: `onDelete` controls what Postgres does to the **child** rows when the **parent** row they point at is deleted. The four values and when each is right:

- **`cascade`** — delete the children too. Reach when the child **has no meaning without the parent**: line items under an invoice, junction rows under either endpoint. This is the *ownership* relationship. Mental check: "if the parent is gone, is the child garbage?" Yes → cascade.
- **`set null`** — keep the child, null out the pointer. Reach when the relationship is **optional and orphaning is the desired outcome**: an invoice's `assignedToId` when the assigned user is offboarded — the invoice survives, it's just unassigned. **Requires the FK column to be nullable** (no `.notNull()`); pair this fact with L4's nullability lesson. Calling `set null` on a `.notNull()` column is a contradiction Postgres rejects.
- **`restrict`** (and its near-twin `no action`) — **block the parent delete** while any child exists. Reach when deleting the parent out from under live children would be a mistake the system should refuse: an organization that still has invoices. The delete throws; the app must remove or reassign children first (or, more likely, soft-delete the parent instead — next section). **Precise framing for the writer:** when you write *no* `onDelete` clause at all, Postgres applies `NO ACTION` (the true implicit default) — *not* `restrict`. The course writes `restrict` *explicitly* so the blocking intent is on the page rather than inferred from an omission. State the `restrict` vs `no action` nuance in one sentence: both block the delete, but `no action` can be deferred to end-of-transaction (so a sibling `cascade` can run first and clear the children before the check) while `restrict` is checked immediately per-statement; the course standardizes on `restrict` for clarity and treats the difference as out of scope.
- **`set default`** — set the child's pointer to a column default. Named for completeness; **rarely worth the wiring** (needs a sentinel default row to point at). One sentence, do not demonstrate.

Then the `StateMachineWalker` (`kind="decision"`) as the decision spine. It walks the senior's question order and lands on a rule per leaf. Proposed shape:

- Root `Question` "Does the child row mean anything once its parent is deleted?"
  - Branch "No — it's owned by the parent (line item, junction row)" → `Leaf` **CASCADE**.
  - Branch "Yes — it can stand alone" → `Question` "Should deleting the parent be allowed at all while children exist?"
    - Branch "No — block it; the parent shouldn't vanish under live children" → `Leaf` **RESTRICT**.
    - Branch "Yes — but the child's pointer should be cleared" → `Question` "Is the FK column nullable?"
      - Branch "Yes (optional relationship)" → `Leaf` **SET NULL**.
      - Branch "No — it's required" → `Leaf` **Make it nullable first, or reconsider — `set null` needs a nullable column** (teaching leaf: this is the contradiction; if the relationship is truly required, you probably want `restrict` or `cascade`, not `set null`).
  - (Mention `set default` in the SET NULL leaf body as the rare sibling, not its own branch, to keep the tree legible.)

Each leaf body: one line restating the rule + the canonical example. The pedagogical goal of the walker: the lesson lives in the *order of the questions* (ownership → blockability → nullability), not in any single leaf — the student internalizes the reflex, not a lookup table.

Tooltip (`Term`) candidate: **`NO ACTION`** (Postgres's implicit default — blocks the delete if children exist; the course writes `restrict` explicitly instead).

### `onUpdate`, and why this course never needs it

Short section, named for recognition, prevents a "what about onUpdate?" gap.

- `references(…, { onDelete, onUpdate })` also takes an `onUpdate` rule that fires when the **referenced PK value changes**.
- In this course it's **effectively dead weight**: PKs are immutable surrogates (UUIDv7, `bigint identity` — L5), they never change, so `onUpdate` never fires. The only place it matters is **mutable natural keys** — exactly the anti-pattern L5 told the student to avoid.
- Conclusion as a one-liner reflex: "Immutable PKs (the course default) make `onUpdate` a non-decision. If you ever find yourself needing it, that's a signal your PK should have been a surrogate." Connects directly to L5's "would I be comfortable if this value changed?" heuristic.
- Keep to ~3–4 sentences. No code block needed (mention the option inline).

### Hard delete vs. soft delete: which deletions even happen

The reframe that keeps cascade in its lane. **Conceptual, not a new mechanic.** Defer depth to Ch 061.

- The premise cascade quietly assumes: that the parent gets **hard-deleted** (the row physically removed with `DELETE`). In a lot of SaaS, that's the rare path.
- **Soft delete:** instead of removing the row, set a `deletedAt` timestamp (the nullable column already in `db/columns.ts` from L4's `softDelete` spread). The row stays; queries filter out tombstoned rows. The parent is never `DELETE`d, so **`onDelete` never fires** — `cascade` and `restrict` are irrelevant on the soft-delete path.
- **The senior split — teach as a per-table decision:**
  - **Hard delete + cascade** for genuinely scrubbing a relationship graph: tenant offboarding (org and everything it owns is permanently removed, e.g. for a deletion/GDPR request), or ephemeral owned children where no audit trail is needed.
  - **Soft delete** for almost everything user-facing: invoices, customers, anything where "deleted" must be recoverable, auditable, or referenced historically. Here `onDelete` is a backstop for the rare true purge, not the everyday path.
- **The reconciliation the student needs:** declaring `onDelete: 'cascade'` and soft-deleting are **not in conflict** — the FK rule defines what happens *if* a hard delete ever runs (a purge job, an admin action, a GDPR erase); the application's normal flow soft-deletes and the rule simply doesn't trigger. So you still choose `onDelete` deliberately for every FK even in a soft-delete-first app.
- Explicitly **defer**: the `deletedAt` query-filtering pattern, partial-unique-on-`deleted_at-is-null`, restore/archive lifecycle, and the `softDelete`/`restore` actions all belong to **Ch 061** (name it). This section only plants the *distinction* so cascade isn't over-applied.

Optional `Aside` (`note`): the one-line takeaway — "Choose `onDelete` for the purge that might happen; choose soft delete for the deletes that actually happen day to day."

No exercise here; this is a framing section.

### Wiring an invoice's relationships end to end

The worked example that cashes the decision out — **one entity, multiple FKs, different rules**. This is the section that makes "the rule is per-edge" land.

- Present `invoices` and its neighbors with their FK rules, each justified by walking the same question order from the walker:
  - `invoices.organizationId` → `organizations.id`, **`restrict`** — an org with live invoices must not be deletable out from under them (and it'll be soft-deleted anyway). `.notNull()` (every invoice belongs to an org).
  - `invoiceLineItems.invoiceId` → `invoices.id`, **`cascade`** — a line item is meaningless without its invoice; ownership. `.notNull()`.
  - `invoices.assignedToId` → `users.id`, **`set null`** — optional pointer (the nullable column L4 introduced precisely for this, deferring `.references` here); offboarding a user un-assigns their invoices rather than deleting them. No `.notNull()`.
  - Name `invoiceTags` (`invoiceId` + `tagId`, both **`cascade`**) in one sentence and **defer to L8** — the junction table is L8's territory; this lesson just notes both FKs cascade because junction rows are owned by both endpoints.
- Use **`AnnotatedCode`** for the `invoices` + `invoiceLineItems` schema block (one block, written once; steps focus the student on each FK column + its `onDelete` in turn, color-coded — e.g. `restrict` blue, `cascade` green, `set null` orange to visually reinforce the three rules). Each step's prose: which rule, why, one line. Keep `assignedToId`'s step paired with "nullable because `set null` requires it."
- **Multi-tenancy foreshadow** (one sentence, named not taught): every tenant-owned table carries an `organizationId` FK with `restrict`; *enforcing* that scope at the query layer is Unit 10. Just plant that the FK is where tenancy starts in the schema.
- Reinforce the FK-index gotcha once more in context: deleting an org would scan `invoices` for matching `organizationId` without an index — Ch 039 L1. (One clause, don't repeat the whole point.)

Code conventions to honor in this example (from `Code conventions.md` §Data layer): explicit `onDelete` on every FK; `cascade`/`restrict`/`set null` matched to ownership/cross-aggregate/optional exactly as the conventions list them. Use bare builders under the `casing` policy (no positional SQL-name strings) consistent with L3–L5 lesson code — **except** inside the `DrizzleSchemaCoding` exercise, where snake_case name strings are passed explicitly (no `casing` client in the sandbox), matching the L3–L5 staging note.

### Practice: enforce the relationships

`DrizzleSchemaCoding` exercise — the assessment. Goal: the student declares the FKs with the correct `onDelete` and the probes prove the rules fire.

- **Starter:** `organizations`, `users`, `invoices`, `invoiceLineItems` with PKs already in place (UUIDv7 shape from L5) and the FK columns present but **without** `.references(...)`. Instruction: add the three FKs with the right `onDelete` rule each.
- **`requirements`:** the FK columns with `references: { table, column }` and `notNull` where required (`organizationId`, `invoiceId` not-null; `assignedToId` nullable). Note in the outline for the exercise author: the grader's `ColumnRequirement.references` verifies the FK *exists* but **cannot read `onDelete`** — so the rule itself is verified only by probes.
- **`probes`** (the load-bearing part):
  1. `mustSucceed: false` — delete an `organizations` row that has invoices → **must throw** (proves `restrict`).
  2. `mustSucceed: true` — delete an `invoices` row that has line items, then a follow-up `SELECT` (or rely on the cascade) → the line items are gone (proves `cascade`). Author as: delete the invoice succeeds; a probe inserting/checking confirms no orphaned line items remain. Keep probe SQL simple.
  3. `mustSucceed: true` — delete a `users` row that an invoice points at via `assignedToId` → succeeds, and the invoice's `assignedToId` is now null (proves `set null`). Use `seedSQL` to insert the org/user/invoice/line-item rows the probes act on.
- Mirror the established grader note from L3–L5: high-stakes `onDelete` choices are pinned with probes, not requirements. The exercise author should pass explicit snake_case column-name strings in the starter so probe SQL lines up (no `casing` client in the sandbox scope).
- This exercise checks both *that the student attached FKs* (requirements) and *that they chose the right rule* (probes) — the two halves of the lesson.

### External resources (optional)

One or two `ExternalResource` cards if a high-quality, current source fits: Drizzle ORM foreign-keys docs (the `references`/`onDelete` API) and/or the Postgres `CREATE TABLE` foreign-key constraint reference (the `ON DELETE` action semantics). No YouTube video proposed — this topic is decision-driven and reads better than it watches; skip the video unless the resourcer finds a genuinely strong short explainer on referential actions.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- `pgTable`, column builders, `casing` policy (L2) — assume fluent.
- Postgres types incl. `uuid` (L3) — referenced for FK type-matching, not re-explained.
- `.notNull()` / nullability and the `db/columns.ts` `softDelete`/`deletedAt` column (L4) — `set null` and soft-delete lean on these; one-line callbacks only.
- PK shapes and "every FK points at one PK" (L5) — the FK is the other end; restate in one sentence, don't re-derive UUIDv7.

**This lesson does NOT cover (defer, with owner named where it helps the writer hold the line):**
- **UNIQUE and CHECK constraints** — L7. (Do not push any other invariant into the DB here; FK is the only constraint this lesson teaches.)
- **Junction tables / many-to-many** as a modeled pattern — L8. (Name `invoiceTags`' cascade-on-both in one sentence only; do not build the junction or its composite PK.)
- **The Drizzle Relations v2 API (`defineRelations`)** — L9. **Critical boundary:** `references()` is the database constraint; a *relation* is the separate TS-side traversal hint. Make this distinction explicit (it's a top confusion) but do **not** write any `defineRelations` / `db.query.…({ with })` code — that's L9. The student should leave knowing the FK alone does *not* enable `db.query` traversal.
- **Indexing FK columns** — Ch 039 L1. Name the not-auto-indexed gotcha twice (it's important and load-bearing for cascade performance) but defer the `index()` declaration entirely.
- **Soft-delete depth** — Ch 061 (and the `tenantDb` query scoping — Unit 10). This lesson teaches the *hard-vs-soft distinction* as a reframe for cascade; the `deletedAt` filtering pattern, partial uniques on the lifecycle, restore/archive actions, and concurrency are all later.
- **Migrations** — how `onDelete: 'cascade'` lands as `ON DELETE CASCADE` in a migration file is Ch 040. This lesson writes schema, runs no migration.
- **`$inferSelect` / `$inferInsert`** interaction with FK columns — L10. An FK column is just its underlying type (`uuid`) in the inferred shape; no special note needed here.
- **`deferrable` / circular FKs** — name once (the course breaks cycles by structure, e.g. nullable FK or moving the reference to a junction) as the reason `no action` exists, but do not teach deferrable constraint configuration.

---

## Notes for downstream agents

- **Continuity must-honors:** running domain is `organizations` / `users` / `invoices` / `invoiceLineItems` / `invoiceTags`; PK shape is `id: uuid().primaryKey().default(sql\`uuidv7()\`)` (L5, SQL-side canonical); `amountDue` is `numeric({ precision: 12, scale: 2 })`; `assignedToId` is the **nullable** FK introduced in L4 expressly so L6 could attach `.references(..., { onDelete: 'set null' })` — use it as the `set null` example. `deletedAt` already lives in `db/columns.ts` `softDelete` (L4) — reference it, don't redeclare it.
- **Deliberate staging divergence (don't "fix"):** lesson prose code uses bare builders (no positional SQL-name strings) under the `casing` policy, but the `DrizzleSchemaCoding` exercise starter passes explicit snake_case name strings because the sandbox has no `casing` client — consistent with L3/L4/L5.
- **Convention divergence to be aware of:** L5's continuity note records a deliberate divergence using `default(sql\`uuidv7()\`)` over the conventions file's `$defaultFn(() => uuidv7())`. This lesson reuses L5's PK shape verbatim in starters/examples; do not re-litigate.
- Keep the lesson at ~40–50 min. The walker + the one annotated worked example + the one schema exercise is the right interactive budget — resist adding a second exercise.
