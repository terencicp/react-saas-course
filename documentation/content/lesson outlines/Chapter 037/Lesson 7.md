# UNIQUE and CHECK constraints

- Title (h1): `UNIQUE and CHECK constraints`
- Sidebar label: `UNIQUE and CHECK`

---

## Lesson framing

The chapter's second constraint lesson, extending the exact theme L6 opened with: **the database is the last line of defense.**
L6 pushed *referential* integrity into Postgres (no orphan rows); this lesson pushes *value* and *uniqueness* invariants in — "no two orgs share a slug", "no invoice total below zero", "one primary contact per org".
Like the FK, each of these is one short declaration whose weight is the **decision** behind it: which invariants are important enough that the app must never be trusted to enforce them alone.

**Senior question driving the lesson** (state implicitly in the intro, do not label it): *Beyond the primary key, which rules about my data do I refuse to let a stray code path break — and how do I make the database the one that refuses?*

**The mental model the student should leave with:** application-side validation (Zod, a service-layer check) only runs on the path that *calls* it. A raw SQL migration, a `psql` session, a seed script, a second service, or a future code path that forgets — all bypass it and write the bad row silently. A **database constraint cannot be skipped**: it fires on every write from every source. So the senior split is *both/and*, not either/or — Zod is the **user experience** (friendly, field-level errors at the boundary), the constraint is the **safety net** (the guarantee of last resort). Reach for a constraint whenever a broken invariant would corrupt data, not merely annoy a user.

**The two tools, and how they differ:**
- `UNIQUE` — "this value (or combination of values) appears at most once." Four shapes the lesson must distinguish: single-column, composite (multi-column), case-insensitive (via the generated column from L4), and partial (uniqueness only for rows matching a predicate).
- `CHECK` — "every row must satisfy this boolean predicate." A per-row value rule: `total >= 0`, `endDate >= startDate`, array length bounds.

**Why this matters / pain it relieves:** a duplicate-billing-email or a negative invoice total is not a cosmetic bug — it's corrupt data that downstream reads, reports, and money math all inherit. Catching it at the boundary with Zod is good UX but is *not a guarantee*; the moment one writer skips the boundary the invariant is gone, and the corruption is usually discovered long after the row was written. Constraints make the guarantee structural.

**Where beginners go wrong (address these head-on):**
- **Trusting application validation as the guarantee.** "I already check this in Zod" — true, but Zod is one code path; the constraint is the floor under all of them. The reflex to install: *a rule that must always hold lives in the schema, not only in the validator.*
- **The `NULL ≠ NULL` surprise on composite/partial uniques.** In SQL two NULLs are *not* equal, so a `UNIQUE (org_id, slug)` lets unlimited `(org_id, NULL)` rows coexist. Beginners assume the unique blocks them. This is the single most important watch-out in the lesson.
- **Case-sensitivity blind spot.** A plain `UNIQUE` on `email` treats `Ada@x.com` and `ada@x.com` as different — two accounts, same person. Real systems need case-insensitive uniqueness; a naive unique gives a false sense of safety.
- **Reaching for `CHECK` to encode a set of allowed strings.** `CHECK (status IN ('draft','sent',...))` works but `pgEnum` (L3) is the right tool — it gives a TS union for free. Name this so the student doesn't reinvent enums with checks.
- **Expecting constraints to police cross-row or cross-table rules.** "Total revenue per org under quota", "at most 5 seats" — these are *aggregate* invariants a single-row CHECK cannot see. They need application logic in a transaction (Ch 039). Drawing this boundary prevents the student from trying (and failing) to express them as constraints.

**Teaching approach (whole-lesson):**
- Lead with the **principle as a continuation of L6**, not a fresh idea: "L6 made the database refuse orphan rows; now we make it refuse duplicates and impossible values." One short framing, then straight into `UNIQUE`.
- Teach `UNIQUE` as a **ladder of four shapes**, simplest first, each motivated by a concrete invariant the running domain actually has — single-column (a global slug) → composite (slug-within-org, the multi-tenant default) → case-insensitive (closing L4's `emailLowercased` loop) → partial (one primary contact per org). Build complexity gradually; do not show all four at once.
- The **`NULL ≠ NULL`** behavior is the lesson's highest-value gotcha and is best *seen*, not told — carry it with a tiny truth-table-style diagram and reinforce it inside the practice probes.
- `CHECK` is a smaller section: the builder, three canonical predicates, the "use `pgEnum` not CHECK for enums" boundary, and the authoring footgun that parameterized values can mis-generate (use column references / `sql.raw` for literals).
- The **Zod-vs-constraint division of labor** is a recurring through-line, surfaced at the principle and again at CHECK — both correct, different jobs. Foreshadow drizzle-zod (Ch 042) but do not teach it; explicitly note drizzle-zod does **not** generate Zod from a `CHECK`, so that predicate is hand-mirrored at the boundary if you want a friendly error too.
- Code: `Code` blocks for each single declaration as it's introduced; `CodeVariants` for the **single-vs-composite unique** comparison (the "add the org_id" delta is exactly a before/after) and again to contrast the **two case-insensitive approaches** (generated-column unique vs functional `lower()` index); `AnnotatedCode` is *not* needed — the declarations are short and better shown inline at the point of teaching.
- One `DrizzleSchemaCoding` exercise with **probes** is the assessment, and probes are load-bearing here: the grader reads `uniques` and single-column `unique` from config but the *enforcement* (and the `NULL ≠ NULL`, partial, and CHECK behaviors) is only provable by INSERTs that must succeed or must throw.
- Keep cognitive load low: one invariant → one constraint shape at a time, each with its "reach for it when". Resist a second exercise; the budget is the four-shape ladder + CHECK + one schema exercise.
- Estimated 35–45 min, matching the chapter outline.

---

## Lesson sections

### Introduction (no header)

Open by continuing L6's thread explicitly: a foreign key made Postgres refuse a row that points at a parent that doesn't exist — orphan-prevention moved out of app code and down to the database boundary. The same move applies to a whole other class of rules: *no two organizations may share a URL slug*, *an invoice total may never be negative*, *a customer's billing email is unique even across capitalization*. Pose the senior question implicitly: which of your data's rules are important enough that you refuse to let any stray code path — a migration, a seed, a forgotten branch — break them? Preview the two tools (`UNIQUE`, `CHECK`) and the punchline that they're the *safety net* under Zod, not a replacement for it. Warm, ~3–4 sentences. Reuse the running domain (`organizations`, `users`, `invoices`) with no re-introduction.

### A constraint is the rule a stray code path can't skip

The principle section. Short, sets up everything after it. No new syntax yet — establish *why* before *what*.

- State the core asymmetry plainly: **application validation runs only on the path that calls it.** Zod in a Server Action guards *that* action; it does nothing for a raw `INSERT` in a migration, a `psql` session, a seed script, a second service hitting the same database, or next quarter's code path that forgets to validate. A **database constraint runs on every write, from every source** — it physically cannot be bypassed without dropping it.
- The senior reframe, stated once and reused at CHECK: this is **not either/or**. Zod is the **user experience** (a friendly "Slug already taken" tied to the right form field, caught before the round-trip); the constraint is the **guarantee** (the floor under every writer, the thing that makes the invariant *true* rather than *usually true*). Reach for a constraint whenever a broken invariant would **corrupt data**, not merely produce a poor message.
- Frame the practical consequence: when a constraint *does* fire from app code, Postgres throws an error carrying the **constraint's name** — which is why naming constraints well matters (the action layer maps that name back to a friendly field error; Ch 043 owns that mapping, name it in one clause and move on).
- Connect to the principle family the student already holds: this is the schema-as-source-of-truth principle (#2, L1) extended to *invariants*, and it shares L6's "database is the last line of defense" reflex. One sentence.

Tooltip (`Term`) candidates in this section: **invariant** (a rule about the data that must hold for every row, at all times, no matter who writes it), **constraint** (a rule the database itself enforces on every write — as opposed to a check the application performs).

No code block here; this section is the *why*. First syntax appears in the next section.

### UNIQUE: no two rows share this value

The first and largest of the two tool sections. Teach the **four shapes as a ladder**, each introduced by the concrete invariant that motivates it. Use `Code` for each first appearance; `CodeVariants` for the single→composite delta.

**1. Single-column unique.** The invariant: a `tags.slug` (or a global `organizations.slug`) must be unique across the whole table.
- Column-level chained modifier:
  ```ts
  slug: text().notNull().unique(),
  ```
- Explain what it buys: a UNIQUE constraint *and* a backing unique index (so lookups on it are fast — tie back to "PK gives you an index for free" from L5; unique is the same deal for a non-PK column).
- The optional **name argument**: `.unique('tags_slug_unique')`. State the convention from `Code conventions.md`: name constraints explicitly once the schema settles — auto-generated names rotate when columns are reordered and make migration diffs noisy, and the name is what surfaces in the violation error (ties back to the principle section). Convention shape: `<table>_<col>_unique`.

**2. Composite (multi-column) unique — and why it's the multi-tenant default.** The invariant: a slug need only be unique *within an organization* — Acme and Globex can both have a `home` page. This is the canonical SaaS shape.
- Table-level, third `pgTable` argument returning an array:
  ```ts
  (t) => [unique('pages_org_slug_unique').on(t.organizationId, t.slug)]
  ```
- **Pedagogically central point (from conventions):** in a multi-tenant app, uniqueness almost always carries the tenant column — `unique on (org_id, slug)`, *not* `unique on (slug)`. A bare global unique on a tenant-owned value is usually a modeling bug: it would stop two different customers from picking the same slug. State this as the default reflex.
- Use **`CodeVariants`** here for the single-vs-composite contrast (`label="Global unique"` / `label="Unique per org"`), since the change is exactly an additive delta (add `organizationId` to the `.on(...)`). First sentence of each variant names the invariant it enforces. This A/B makes the tenancy point concrete.

**3. The `NULL ≠ NULL` trap.** The lesson's highest-value gotcha, placed right after composite unique because that's where it bites.
- The rule: in SQL, `NULL` is never equal to `NULL`, so a unique constraint treats every NULL as distinct. A `UNIQUE (org_id, slug)` therefore permits **unlimited** rows with the same `org_id` and a `NULL` slug — the unique does *not* block them, surprising nearly everyone.
- Carry it with a **small diagram** (see Diagram 1 below) — a compact truth-style table showing which `(org_id, slug)` pairs collide and which slip through. Seeing the NULL rows pass is far stickier than a sentence.
- The fix when you *do* want NULLs treated as equal: `nullsNotDistinct()` (Postgres 15+) — `unique().on(...).nullsNotDistinct()`. Name it as the escape hatch, one line; the more common real answer is "make the column `.notNull()` so the question never arises" (ties to L4's NOT-NULL-as-default).

**4. Case-insensitive unique — closing L4's loop.** The invariant: `ada@x.com` and `Ada@x.com` are the same person; the unique must see them as equal. **This is the explicit pay-off of L4's `emailLowercased` generated column** (the continuity note pins this as L7's job).
- The course's chosen pattern: the `emailLowercased` STORED generated column (`generatedAlwaysAs(() => sql\`lower(${users.email})\`)`, already on the `users` table from L4) gets the unique:
  ```ts
  emailLowercased: text().notNull().generatedAlwaysAs(() => sql`lower(${users.email})`).unique('users_email_lowercased_unique'),
  ```
  Why this shape: it's a real, readable column the app can also `select`, and the unique is an ordinary column unique — no expression-index machinery.
- Present the **alternative** Drizzle officially documents — a *functional* unique index on the expression directly, via a `lower()` helper — using **`CodeVariants`** (`label="Generated column (course default)"` / `label="Functional index"`):
  ```ts
  // helper
  export function lower(col: AnyPgColumn): SQL { return sql`lower(${col})`; }
  // table-level
  (t) => [uniqueIndex('users_email_lower_unique').on(lower(t.email))]
  ```
  First sentence of each variant states the trade-off: generated column = readable extra column + plain unique (course default, set up in L4); functional index = no extra column, but the same `lower()` must be repeated at every query site to hit the index. Name that querying-must-match-the-index detail as the functional-index gotcha. Keep the variant prose ≤6 lines; both are correct, the course standardizes on the generated column for readability.
- This is also the first place `uniqueIndex` (as opposed to the `unique()` constraint) appears — note in one clause that a unique *index* and a unique *constraint* give the same correctness guarantee; the index form is what you reach for when uniqueness is over an *expression* or a *subset of rows* (next shape). Defer general index strategy to Ch 039 L1.

**5. Partial unique index — uniqueness for a subset of rows.** The invariant: *one primary contact per organization* — many contacts may have `isPrimary = false`, but at most one `isPrimary = true` per org. A plain composite unique can't express "only when isPrimary".
- The `.where(...)` predicate on a unique index:
  ```ts
  (t) => [uniqueIndex('contacts_one_primary_per_org').on(t.organizationId).where(sql`${t.isPrimary} = true`)]
  ```
- Explain: the unique index only includes rows satisfying the `where` predicate, so uniqueness is enforced *only* among primary contacts; non-primary rows are exempt. This is necessarily a unique *index* (constraints can't be partial), reinforcing the index-vs-constraint note above.
- The **other canonical use, named and deferred:** soft-delete lifecycle — `unique on (org_id, slug) where deleted_at is null` lets a slug be reused once the old row is tombstoned. This is the conventions-file pattern; name it in one sentence and **defer the full soft-delete treatment to Ch 061** (the student met `deletedAt` in L4/L6 but the lifecycle is later). It motivates *why* partial uniques matter without opening the soft-delete rabbit hole.

Tooltip (`Term`) candidate: **partial index** (an index — here a unique one — that includes only the rows matching a `WHERE` predicate, so the rule applies to that subset only).

### CHECK: every row must satisfy this predicate

The second, smaller tool section. The builder, the canonical predicates, the boundaries.

- The builder, table-level third argument, with a name and a boolean `sql` expression:
  ```ts
  (t) => [check('invoices_amount_due_nonneg', sql`${t.amountDue} >= 0`)]
  ```
  Postgres evaluates the predicate on **every insert and update**; a row that fails is rejected. Imports: `check` from `drizzle-orm/pg-core`, `sql` from `drizzle-orm`.
- **Three canonical reaches**, each one line + example, drawn from the running domain:
  - Monetary positivity: `amountDue >= 0` (the `numeric({ precision: 12, scale: 2 })` money column from L3).
  - Date ordering: a date range where `endDate >= startDate`.
  - Bounded values / array length: e.g. a rating `1..5`, or `cardinality(tags) <= 10` on a `text().array()` column (the array type from L3).
- **The `pgEnum`-not-CHECK boundary** (address the common mistake head-on): you *can* write `check(..., sql\`status IN ('draft','sent','paid','void')\`)`, but for a fixed set of allowed strings `pgEnum` (L3) is the right tool — it enforces membership *and* hands you a TS string-literal union for free, which a CHECK does not. Reach for CHECK for *ranges and relationships between columns*, for `pgEnum` for *membership in a fixed set*. One short paragraph.
- **The Zod parallel, restated for CHECK** (callback to the principle section): length caps, ranges, and regex are also Zod's job at the boundary (Ch 042) — Zod gives the friendly "Amount must be positive" message before the round-trip; the CHECK guarantees it even when Zod is bypassed. Both correct, different jobs. **Important note to surface:** drizzle-zod does **not** read a `CHECK` and emit a matching Zod refinement — if you want the friendly message *and* the guarantee, the predicate is **mirrored by hand** in the Zod schema (Ch 042). State this so the student doesn't assume the CHECK auto-propagates to validation.
- **Authoring footgun to flag for the writer (verified live, Drizzle issue #4661):** a CHECK that interpolates a *parameterized value* can emit invalid SQL in current Drizzle Kit. Keep CHECK predicates built from **column references** (`${t.amountDue}`) and bare SQL literals inside the tagged template, not interpolated JS variables. The course's predicates (`>= 0`, `endDate >= startDate`, `IN (...)` literals) all stay on the safe side; add a one-sentence caution and a small `Aside` (`caution`) noting "keep CHECK expressions to column refs and literal SQL; don't interpolate runtime values."

Tooltip (`Term`) candidate: **predicate** (a boolean expression Postgres evaluates per row — true means the row is allowed, false means the write is rejected).

### What constraints can't see: cross-row and cross-table rules

A short boundary section — prevents the student from over-reaching and trying to express aggregate rules as constraints. Conceptual, no new mechanic.

- The limit: a `CHECK` sees **one row at a time**; a `UNIQUE` sees one column-tuple's duplication. Neither can evaluate a rule that depends on **other rows** or **other tables**: "total outstanding per org under a credit limit", "at most 5 active seats per plan", "sum of line items equals the invoice total".
- Why: enforcing those correctly requires reading the current aggregate *and* writing atomically so a concurrent writer can't slip between the read and the write — that's a **transaction** with application logic, not a declarative constraint. Name the tool and **defer to Ch 039 L4** (transactions); one sentence, do not teach it.
- The senior heuristic to leave the student with: *if the rule can be checked by looking at the single row being written, it's a constraint; if it needs to count or sum across rows, it's transaction logic.* This cleanly partitions "what goes in the schema" from "what goes in an action."

No code, no exercise — framing only. Keep to ~4–5 sentences plus the heuristic.

### Practice: push the invariants into the schema

`DrizzleSchemaCoding` exercise — the assessment. The student adds the constraints; **probes prove they fire** (and prove the `NULL ≠ NULL` and CHECK behaviors the requirements can't read).

- **Starter:** `organizations` and `users` (PKs in place, UUIDv7 shape from L5) plus a `pages` table (`organizationId` FK, `slug`, `title`) and the `invoices` table with `amountDue`. Constraint slots present but empty (the `(t) => []` table-callback stub). Instruction: add a composite unique so a slug is unique *per org* but reusable across orgs, and a CHECK so `amountDue` can't go negative.
- **`requirements`:** the grader *can* read composite uniques (`uniques: [['organization_id','slug']]`) and single-column `unique`/`notNull` — assert those. Note for the exercise author: the grader **cannot** read a CHECK predicate or the `NULL ≠ NULL` / partial behavior — those are probe-only.
- **`probes`** (load-bearing):
  1. `mustSucceed: true` — two `pages` rows with the same `slug` under **different** `organization_id` → allowed (proves the unique is *per-org*, not global). Mirrors the component-doc example.
  2. `mustSucceed: false` — two `pages` rows with the same `slug` under the **same** `organization_id` → rejected (proves the composite unique fires).
  3. `mustSucceed: false` — insert an `invoices` row with `amount_due = -5` → rejected (proves the CHECK).
  4. `mustSucceed: true` — insert an `invoices` row with `amount_due = 0` → allowed (proves the boundary is `>= 0`, not `> 0`).
  - Use `seedSQL` for the parent `organizations` rows the page probes reference, fixed UUID literals (matching the L6 exercise pattern).
- Mirror the established staging note (L3–L6): the exercise **starter passes explicit snake_case column-name strings** (`text('slug')`, `organizationId: uuid('organization_id')`) because the sandbox has no `casing` client — so the probe SQL column names line up. The lesson *prose* uses bare builders under the `casing` policy; only the sandbox diverges. This is deliberate, not an inconsistency to fix.
- Optionally add **one stretch probe** for the writer to consider (keep the exercise from bloating): a `NULL ≠ NULL` demonstration — two `pages` rows with the same `organization_id` and `slug = NULL` succeed despite the unique. Only include if the slug column is left nullable in the starter; if it's `.notNull()`, skip it and rely on the diagram + prose for that point.

### External resources (optional)

One or two `ExternalResource` cards if current and high-quality: the Drizzle ORM "Indexes & Constraints" docs page (the `unique`/`uniqueIndex`/`check` API) and/or the Drizzle "Unique and case-insensitive email handling" guide (the functional-`lower()`-index pattern shown as the alternative). No YouTube video proposed — this is a decision-and-syntax topic that reads better than it watches; the resourcer may add a short explainer only if a genuinely strong one surfaces.

---

## Diagrams

**Diagram 1 — the `NULL ≠ NULL` collision table.** Goal: make the most counter-intuitive rule in the lesson *visible*. A compact HTML+CSS table (wrapped in `<Figure>`) listing candidate `(org_id, slug)` rows being inserted against an existing set, with a clear ✓/✗ column showing which are accepted and which are rejected by a `UNIQUE (org_id, slug)`. Include at least two rows with `slug = NULL` under the same `org_id`, both marked ✓ (accepted) with a callout "NULL ≠ NULL — every NULL counts as distinct, so the unique doesn't block these." Keep it short (5–6 rows), horizontal, well under the height cap. This is the right vehicle because the behavior is a *data table* truth, and seeing two NULL rows both pass is the sticky moment. (HTML+CSS per the diagram index's "color-coded segments / table-like layout" guidance; not a graph, so no D2/Mermaid.)

No other diagram is warranted — the constraint declarations are short and best shown as code at the point of teaching, and the four-shape ladder is carried by the `CodeVariants` A/B comparisons rather than a diagram. A `StateMachineWalker` is *not* a good fit here (unlike L5/L6): UNIQUE-vs-CHECK isn't a branching decision tree, it's two distinct tools each with their own "reach for it when" — prose with clear triggers serves better than forcing an artificial decision graph.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- `pgTable`, column builders, the `casing` policy, the table-level third-argument `(t) => [...]` shape (L2 / L5 / L6) — assume fluent; the third-argument syntax was introduced for composite PKs (L5) and FKs/`onDelete` (L6), so composite `unique`/`check` reuse a known shape.
- Postgres types: `text`, `numeric({ precision: 12, scale: 2 })` for money, `text().array()`, `pgEnum`, `boolean` (L3) — referenced, not re-explained.
- `.notNull()` and nullability (L4) — load-bearing for the `NULL ≠ NULL` discussion and the "make it not-null so the question never arises" fix; one-line callbacks only.
- The `emailLowercased` STORED generated column on `users` (L4) — **reference it as already existing**; this lesson attaches the `.unique()` that L4 deferred. Do **not** redeclare the generated column or re-teach `generatedAlwaysAs`; show it only as the line that now carries the unique.
- PK-gives-an-index-for-free (L5) — reused as the analogy for "unique gives you a backing index too." One sentence.
- The "database is the last line of defense" reflex and FK-as-guarantee (L6) — this lesson *continues* that theme; restate in one sentence, don't re-derive.

**This lesson does NOT cover (defer, with owner named where it helps the writer hold the line):**
- **Junction tables / many-to-many and their composite PKs** (which double as a uniqueness guarantee) — L8. A composite PK already enforces uniqueness of the pair; this lesson teaches standalone `unique`, not the junction's PK. Name the connection in at most one clause if it aids the composite-unique section; do not build a junction.
- **The Drizzle Relations v2 API** — L9. Out of scope entirely.
- **General index strategy** — Ch 039 L1. This lesson uses `uniqueIndex` only for *uniqueness* (case-insensitive and partial); the backing index a unique creates is "for free." Do **not** teach B-tree/GIN choice, composite-index column order, `index()` for performance, or `.where()` for non-unique partial indexes — name that "indexes have a bigger story in Ch 039" in one clause and stop. (The index *naming* convention is in scope only insofar as it names the unique constraints here.)
- **Transactions for cross-row / aggregate invariants** — Ch 039 L4. The "what constraints can't see" section *names* this boundary and defers; it must not show transaction code.
- **Soft-delete lifecycle** (the `where deleted_at is null` partial-unique use, restore/archive, query filtering) — Ch 061. Name the partial-unique-on-`deleted_at` pattern in one sentence as *a* motivation for partial uniques; defer the lifecycle.
- **Zod refinement at the API boundary** and **drizzle-zod** — Ch 042. Surface the Zod-vs-constraint division of labor and the fact that drizzle-zod does *not* generate Zod from a CHECK (so it's hand-mirrored), but write **no** Zod or drizzle-zod code.
- **Catching a constraint-violation error at the Server Action layer** and mapping the constraint name to a friendly field error — Ch 043. Name *why* constraints should be named well (the error carries the name); do not write the catch/handler.
- **Migrations** — how a `UNIQUE`/`CHECK` lands in a generated migration file is Ch 040. This lesson writes schema, runs no migration. (May note in one clause that current Drizzle Kit generates CHECK automatically, since the chapter outline flags older versions needed a hand-written `ALTER TABLE` — but do not walk a migration.)
- **`$inferSelect` / `$inferInsert`** interaction — L10. A constraint doesn't change the inferred row/insert type (a generated column is still omitted from insert, but that's L4/L10's point, not this lesson's). No special note needed.

---

## Notes for downstream agents

- **Continuity must-honors:** running domain is `organizations` / `users` / `invoices` / `invoiceLineItems` / `invoiceTags` (+ a `pages` and/or `contacts` table introduced here for the per-org-slug and one-primary-per-org invariants). PK shape is `id: uuid().primaryKey().default(sql\`uuidv7()\`)` (L5). `amountDue` is `numeric({ precision: 12, scale: 2 })` (L3) and is the CHECK target. `users` already has `email` + `emailLowercased` (a STORED generated column, L4) — **L7 attaches the `.unique()` to `emailLowercased`, closing L4's explicit cliff-hanger; do not redeclare the generated column.** `deletedAt` lives in `db/columns.ts` `softDelete` (L4) — reference it only for the deferred partial-unique-on-soft-delete mention.
- **Reconciled fact (verified June 2026):** Drizzle's *official* case-insensitive-email guide uses a **functional `uniqueIndex().on(lower(email))`** with a `lower(col: AnyPgColumn): SQL` helper, **not** a generated column. The course deliberately diverges to the **generated-column** approach (set up in L4, gives a readable column) as the *default*, and presents the functional index as the documented *alternative* in a `CodeVariants`. Flagged so the writer presents both honestly and doesn't "correct" the course default back to the docs idiom. (Source: orm.drizzle.team/docs/guides/unique-case-insensitive-email.)
- **Verified API shapes (June 2026, current Drizzle):** single `.unique()` / `.unique('name')` chained; composite `unique('name').on(t.a, t.b)` table-level; `nullsNotDistinct()` (Postgres 15+); `uniqueIndex('name').on(...).where(sql\`...\`)` partial; `check('name', sql\`...\`)` table-level. `check`/`unique`/`uniqueIndex`/`index`/`AnyPgColumn` import from `drizzle-orm/pg-core`; `sql` from `drizzle-orm`. All exposed in the `DrizzleSchemaCoding` sandbox globals.
- **Authoring footgun (verified, Drizzle issue #4661):** CHECK predicates that interpolate *parameterized JS values* can mis-generate SQL. Keep all CHECK expressions to **column references and literal SQL** inside the tagged template (the course's `>= 0`, `endDate >= startDate`, `IN (...)` all comply). Surface as a one-line `Aside` caution.
- **Deliberate staging divergence (don't "fix"):** lesson prose code uses bare builders (no positional SQL-name strings) under the `casing` policy; the `DrizzleSchemaCoding` starter passes explicit snake_case name strings because the sandbox has no `casing` client — consistent with L3–L6. Probe SQL must use the snake_case names.
- **Convention divergence to inherit, not re-litigate:** L5's note records using `default(sql\`uuidv7()\`)` over the conventions file's `$defaultFn(() => uuidv7())`; reuse L5's PK shape verbatim in starters/examples.
- **Constraint naming is in scope and load-bearing:** follow `Code conventions.md` — name every `unique`/`uniqueIndex`/`check` explicitly (`<table>_<col>_unique`, `<table>_<col>_partial`, a descriptive name for checks), because auto-names rotate on reorderings (noisy diffs) and the name is what the violation error carries (Ch 043 maps it). Tie the "name them" guidance to that error-mapping payoff, not just diff hygiene.
- Keep the lesson at ~35–45 min. Budget: the four-shape UNIQUE ladder (two small `CodeVariants` A/Bs) + the `NULL ≠ NULL` diagram + the CHECK section + the one `DrizzleSchemaCoding` exercise. Resist a second exercise and resist a `StateMachineWalker` (this topic is two tools with triggers, not one branching decision).
