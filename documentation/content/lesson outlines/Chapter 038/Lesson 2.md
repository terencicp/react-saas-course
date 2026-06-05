# Lesson title

- **Title:** Joining tables
- **Sidebar label:** Joining tables

# Lesson framing

This lesson teaches the SQL join through Drizzle's `db.select(...).join(...)` builder: how to pull columns from two (or more) tables in one query, and — the organizing idea — what each join shape does when a row on one side has no match on the other. **Absence is the through-line.** Inner, left, right, full each answer a different question about "what if there's no match?", and that single axis is the mental model the student should leave with. Lead every join with its absence behavior, not its Venn-diagram picture.

The senior framing (Pedagogical Principle: decisions before syntax): when a result needs columns from two tables, which join shape is correct, and what does the type system say afterward? The reach is `innerJoin` and `leftJoin` — `rightJoin` and `fullJoin` are named for recognition and immediately deprioritized (right-join → flip the tables and use left). Do not give the four shapes equal weight; weight by real SaaS frequency.

The second load-bearing idea is **the type follows the join**: the labeled selection object produces `{ alias: Row }[]`, a flat projection produces a narrowed flat shape, and a `leftJoin` flips every right-side column to `T | null` in the inferred result. The student must see that the type checker is *surfacing the "did this match?" question* and that skipping the null branch is the bug. This connects directly to L1's established slogan "the type follows the projection."

Crucial positioning constraint from the chapter outline and the L3 forward-pointer: this lesson is the **lower-level** join tool. Lesson 3 (the relational query API, `db.query.…with`) is the senior default for tree-shaped nested reads. So this lesson must repeatedly frame raw `db.select().join()` as the *reach* — for irregular flat projections, predicates spanning multiple joined tables, and (later) aggregates — and explicitly hand the typical "invoice with its line items" tree-read to L3. Plant that pointer without teaching the relational API here.

Target student: has L1 (CRUD, `where`, operator helpers, `.returning()`, tiebreaker reflex, org-scoping, money-as-string) fresh, and the Ch 037 schema (organizations, invoices, line items, tags, the `invoice_tags` junction, relations) in hand. Assume all of it; redefine nothing from L1 beyond a one-line callback. Reuse the exact schema entities and the established `Invoice` / `Organization` inferred-type names.

Where beginners get this wrong in the real world, and what the lesson must pre-empt:
- Forgetting the `on` predicate → silent cross product (Cartesian explosion). This is the join analogue of L1's missing-`where`, and deserves the same severity treatment.
- Reaching for `innerJoin` when they mean `leftJoin`, silently dropping rows that have no match (invoices with no assignee vanish from the list). Frame via a concrete SaaS bug.
- Ignoring left-join `null` because "it'll always match" — until it doesn't.
- Defaulting to hand-written joins for tree reads that L3 does better.

Pedagogy / cognitive-load plan: build complexity in one direction (simple two-table inner join → labeled vs. flat selection → left join + nullability → self-join → many-to-many through the junction). One visual anchors the four-shape absence model. Code is the primary vehicle; the student writes joins in `DrizzleCoding` exercises (the syntax only sticks by typing it). Keep `rightJoin`/`fullJoin`/`USING` to recognition-depth prose so they don't inflate cognitive load. Estimated 40–50 min.

# Lesson sections

## Introduction (no header)

Open by connecting to L1: the student can read, filter, sort, page, and write — but every query so far hit one table. Real features don't: an invoice list shows the *organization name*, a line-item view shows the *product*, a dashboard needs columns that live in two tables at once. Foreign keys (Ch 037) wired the tables together; the join is how a query walks that wire and returns columns from both sides in one trip.

State the senior question implicitly: when a result needs columns from two tables, which join do you pick — and what does each one do when a row on one side has no partner? Preview the end state: by the end the student writes inner and left joins with both selection shapes, reads the nullability the type checker hands back, and knows when to flip a right-join or reach for the relational API instead. Keep it warm and brief (Pedagogical guidelines §3). End the intro by naming the absence axis as the spine of the whole lesson.

## What a join does, and the four ways to handle a missing match

Goal: install the absence mental model *before* any Drizzle syntax, so the four shapes hang off one axis instead of being four memorized recipes.

Teach: a join matches rows from a left table to rows from a right table on a predicate (the `on` clause, almost always FK = PK). The only interesting question is what happens to a left row whose predicate matches *nothing* on the right (and vice-versa). The four answers:
- `innerJoin` — drop unmatched rows from both sides; only matched pairs survive.
- `leftJoin` — keep every left row; fill right-side columns with `null` when no match.
- `rightJoin` — symmetric to left (keep every right row). Named, then immediately: in practice you flip the tables and use `leftJoin`, which reads better.
- `fullJoin` — keep both sides; `null` on whichever side is missing. Rare; named for recognition.

Land the senior reach explicitly: `innerJoin` and `leftJoin` cover the overwhelming majority of SaaS joins; the other two are recognition-only. State the frequency, don't bury it.

**Diagram (load-bearing, this section's anchor).** A small visual showing the four shapes side by side as the absence axis, NOT a generic Venn diagram. Build as **plain HTML + CSS inside a `<Figure>`** (per diagrams/INDEX.md: "annotated illustration" → HTML+CSS; and HTML+CSS lets the result stay compact and theme-aware). Concept: two short stacked lists of rows — left table `invoices` (rows A, B, C where C has no org) and right table `organizations` (rows X, Y where Y matches nothing) — and four compact result panels, one per join, each showing exactly which combined rows come back and where `null` appears. Use a saturated mid-tone fill for matched rows and a muted/`null` swatch for the gap cells (html-css.md theme-adaptation guidance: saturated 600-range fills with white text, or Starlight gray vars for chrome). Pedagogical goal: make "what happens to the unmatched row" *visible* per shape, so the student maps shape → absence behavior at a glance. Cap height per the vertical-space budget; lay the four panels in a wrapping flex row (`column-gap`/`row-gap` split). Keep `rightJoin`/`fullJoin` panels visually de-emphasized to signal "recognition only." Caption ties the picture to the reach: "inner and left are the daily tools; right and full are for recognition."

Reasoning: a single visual that encodes the organizing axis pays for itself across the whole lesson; every later code example can refer back to "the left row with no match." HTML+CSS over D2 here because this is an annotated illustration of row-presence, not a graph or schema.

## Your first join: matched pairs with `innerJoin`

Goal: the simplest real join, end to end, with the call shape and the labeled selection object.

Teach the canonical shape against the real schema — invoices with their organization:
```
db.select({ invoice: invoices, org: organizations })
  .from(invoices)
  .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
```
Walk every part: `.from(invoices)` is the left table; `.innerJoin(organizations, …)` names the right table and its `on` predicate; the predicate is `eq(invoices.organizationId, organizations.id)` — FK equals PK, the same `eq` from L1, same parameterization story (one-line callback to L1, do not re-teach injection). The selection object `{ invoice: invoices, org: organizations }` groups each table's full row under a label, so the result type is `{ invoice: Invoice; org: Organization }[]` — reuse the L1 inferred-type names. Land "the type follows the join": you didn't annotate the nested shape, Drizzle built it from the two tables and the labels you chose.

**Component: `AnnotatedCode`** for this block. The labeled-selection join is exactly the "one block, focus attention on several parts in turn" case the component exists for. Steps (≤6 lines prose each, colors per AnnotatedStep convention, blue default):
1. `.from(invoices)` + the selection object — "left table and what comes back, grouped by label."
2. `.innerJoin(organizations, …)` — "right table joined in."
3. the `on` predicate `eq(invoices.organizationId, organizations.id)` (color green) — "FK = PK; this is the match rule."
4. the inferred result type `{ invoice: Invoice; org: Organization }[]` (color violet, via a trailing comment line or prose) — "the shape follows the labels; nested, typed, free."

Then the watch-out that belongs here, not in a bucket: **a join with no `on` predicate is a cross product.** Show that omitting (or wrongly writing) the predicate pairs *every* left row with *every* right row — N×M rows, silently, no error. Frame it as the join sibling of L1's missing-`where` (callback to that severity). Use an `:::danger` aside: every join needs an `on` predicate; an accidental cross product is a performance incident, not a compile error. Keep the example honest — Drizzle's typed builder makes a *fully* missing predicate awkward, so frame it as "a wrong or trivially-true predicate (`eq(a.x, a.x)`) produces the cross product" so the danger is real and reachable.

Reasoning: leading with `innerJoin` + the labeled shape gives the student a complete, correct, typed join immediately; the cross-product warning lands while the `on` clause is on screen.

## Two selection shapes: labeled rows vs. a flat projection

Goal: the choice that confuses beginners most — when to nest under labels and when to flatten — and the type each produces.

Teach both shapes against the same join, side by side:
- **Labeled** (from the previous section): `{ invoice: invoices, org: organizations }` → `{ invoice: Invoice; org: Organization }[]`. Use when you want whole rows, or when both tables have columns with the same name (`id`, `createdAt`) — labels disambiguate the collision.
- **Flat projection**: `{ id: invoices.id, amountDue: invoices.amountDue, orgName: organizations.name }` → `{ id: string; amountDue: string; orgName: string }[]`. Use when you want a handful of named columns from across the tables — narrower type, flatter to consume in a component. Reuse L1's "type follows the projection" verbatim; this is the same rule extended across a join. Keep money as `string` (L1 rule) to reinforce it.

Name the collision trigger explicitly (it's in the chapter outline watch-outs): two joined tables both have an `id` column; a flat `{ id: … }` can only pick one, so when you need both ids you either alias the keys (`invoiceId: invoices.id, orgId: organizations.id`) or fall back to the labeled shape. Frame the labeled shape as the escape hatch for name collisions.

**Component: `CodeVariants`** with two tabs ("Labeled rows" / "Flat projection"), same join, each tab's prose naming when to reach for it and showing the resulting type in the first sentence. This is the textbook before/after-style A/B the component is for. Per-pane: no del/ins needed — just the two shapes; consider a `CodeTooltips` inside each fence (or a trailing comment) to surface the inferred result type on the selection object, since the type is the whole point of the comparison.

Reasoning: this is the highest-friction concept in the lesson (the projection-object shape is non-obvious and the types differ), so it gets its own section and a direct A/B, not a buried mention.

## Left joins and the `null` the type checker hands you

Goal: the second load-bearing concept — left join keeps unmatched left rows, and every right-side column becomes `T | null` in the inferred type. Make the nullability a feature, not a surprise.

Motivate with a concrete SaaS bug (decisions/real-stakes framing): you want "every invoice with the name of the user it's assigned to." Use `innerJoin` on `users` via `invoices.assignedToId` and *unassigned invoices silently disappear from the list* — because `assignedToId` is nullable (an invoice can be unassigned) and inner join drops the rows whose predicate finds no user. The fix is `leftJoin`: keep every invoice, get `null` for the assignee columns when there's no assignee.

Teach the shape and the type:
```
db.select({ invoice: invoices, assignee: users })
  .from(invoices)
  .leftJoin(users, eq(invoices.assignedToId, users.id))
```
Result type: `{ invoice: Invoice; assignee: User | null }[]` — with the **labeled** shape the entire grouped object becomes nullable: `assignee` is `User | null` (the whole object, not its fields one by one — this is Drizzle's documented behavior and worth stating precisely). With a **flat** projection instead, each individual right-side column becomes nullable on its own (`assigneeName: string | null`). Either way the type checker now *forces* the question "did this invoice have an assignee?" — you cannot read `row.assignee.name` without first handling the `null`. That's the type system surfacing absence, the same idea the opening diagram drew. (Writer: keep this labeled-object-vs-flat-column distinction explicit — it's the single most confusing part of left-join typing.)

**Component: `CodeTooltips`** on this block to pin the `assignee: User | null` inference directly on the token (mirrors L1's use of CodeTooltips to show inferred types on `select`/`amountDue`). Then a short prose beat on handling the branch: narrow with `if (row.assignee)` / optional chaining / nullish fallback before reading assignee fields. Name the senior discipline (chapter outline watch-out): the type is honest about the `null`; downstream code that skips the narrowing is the bug — keep result types honest by handling the `null` branch.

Then the forward pointer that this section must plant (chapter outline + L3 dependency): when the relationship *must* exist and the typical shape is "this row plus its related rows as a tree," the relational query API (next lesson) is the cleaner reach — it returns the nested shape without you threading `null` through a flat join. Hand the tree-read case to L3 explicitly here; keep raw `leftJoin` as the reach for irregular/flat/aggregate shapes.

**Exercise: `DrizzleCoding`** (left-join + nullability, the core skill of the lesson). Honor the Ch 038 PGlite staging rules from the continuity notes: integer PKs with explicit seeded ids, explicit snake_case column-name strings, `numeric` money graded as string, no `uuidv7()`/`casing`.
- Schema: `users` (id integer PK, name text), `invoices` (id integer PK, organization_id, assigned_to_id integer nullable → references users.id, amount_due numeric, status text). (Organizations optional here; keep the schema to the two tables the join needs.)
- Seed: ~5 invoices, two of them with `assigned_to_id = NULL` (unassigned), the rest assigned to seeded users.
- Instructions: "Return every invoice with the name of its assignee — including invoices that have no assignee yet." Forces `leftJoin` (an `innerJoin` drops the two unassigned rows → fails the row check).
- Starter: a `db.select({...}).from(invoices)` with the join line stubbed (`/* join users so unassigned invoices survive */`) and a flat projection picking `invoiceId`, `amountDue`, and `assigneeName: users.name`.
- expectedRows: all 5 invoices; the two unassigned rows have `assigneeName: null`. ordered: false.
- Grading goal: the result set must include the `null`-assignee rows, which only `leftJoin` produces — this is what distinguishes a correct answer from the tempting `innerJoin`.

Reasoning: a guided coding exercise (preferred over a sandbox) where the *wrong* join silently passes a naive eyeball but fails the row-count check is the most effective way to make left-join-vs-inner stick.

## Joining a table to itself with `alias`

Goal: brief, recognition-plus-once-applied coverage of self-joins; rare in SaaS day-to-day (chapter outline says "brief mention").

Teach: when the same table appears twice in one query (a comment and the comment it replies to, a category and its parent), Postgres needs two distinct names for it; Drizzle gives you `alias(table, 'name')` from `drizzle-orm`. Show the shape with the self-referential relation Ch 037 established (a `comments` table with `replyToId` → `comments.id`, or a `categories.parentId` tree — pick comments to match the Ch 037 self-reference example):
```
const parent = alias(comments, 'parent');
db.select({ reply: comments, parent })
  .from(comments)
  .leftJoin(parent, eq(comments.replyToId, parent.id));
```
`leftJoin` (not inner) is right here — a top-level comment has no parent, so the parent side is `null`, reinforcing the previous section's nullability point. Keep it to one worked block + 2–3 sentences; no exercise. Use a plain `Code` block (not AnnotatedCode) — the shape is short and the aliasing is the only new idea.

Reasoning: self-joins are genuinely uncommon early but the `alias` mechanic is unguessable, so showing it once (and reusing the left-join nullability lesson) earns its keep without over-investing.

## Many-to-many: two joins through the junction table

Goal: the most common multi-table real query — walking an N:M relationship — done with explicit joins through the `invoice_tags` junction from Ch 037.

Teach: an invoice has many tags, a tag applies to many invoices; the relationship lives in the `invoice_tags` junction (two FKs, composite PK — recap in one line from Ch 037, don't re-teach). To get an invoice's tags you join twice: `invoices` → `invoice_tags` (on `invoice_tags.invoiceId = invoices.id`) → `tags` (on `invoice_tags.tagId = tags.id`). Worked example with `innerJoin` on both legs:
```
db.select({ invoiceId: invoices.id, tagName: tags.name })
  .from(invoices)
  .innerJoin(invoiceTags, eq(invoiceTags.invoiceId, invoices.id))
  .innerJoin(tags, eq(invoiceTags.tagId, tags.id))
  .where(eq(invoices.id, id));
```
Name the shape of the result honestly: this returns one row *per tag* (an invoice with three tags → three rows), each carrying the repeated `invoiceId`. That row-multiplication is exactly why a tree read (one invoice object with a `tags` array) is awkward with raw joins — and the natural segue to the relational API.

**Component: `DiagramSequence`** OR `AnnotatedCode` to show the two-hop walk. Prefer **`AnnotatedCode`** on the query block (the two `.innerJoin` lines highlighted in turn), since it keeps the code as the artifact and is cheaper than a custom sequence:
1. `.from(invoices)` + the projection — "start at invoices, want id + tag name."
2. first `.innerJoin(invoiceTags, …)` (green) — "hop one: into the junction, matching on invoice id."
3. second `.innerJoin(tags, …)` (green) — "hop two: junction → tags, matching on tag id."
4. the `.where` + the per-tag result shape (violet) — "one row per tag; the invoice id repeats."

Then the forward pointer the chapter outline calls for: the relational API's `with: { tags: true }` (next lesson) walks this exact junction automatically via the Ch 037 `through:` relation and hands back a real `tags` array on one invoice object — no double join, no row multiplication. Foreshadow, don't teach. Keep raw double-join framed as the reach for flat/irregular shapes and (later) tag aggregates.

Reasoning: m:n is the join shape students will actually need constantly (tags, memberships); doing it explicitly here makes the relational API's `through` shortcut feel earned in L3 rather than magic.

## When to reach for a join — and when not to

Goal: the decision lesson that closes the loop and enforces the chapter's positioning. Short, prose-first, no new syntax.

Teach the call (chapter outline "relational-API parallel" + "when to skip"): both `db.select().join()` and the relational query API return Drizzle-typed results, so the choice is *shape-driven*, not capability-driven.
- Reach for the **relational API** (L3) when the read is a **tree**: a row plus its related rows as nested objects/arrays (invoice + line items + tags + org). It's N+1-safe, returns the nested shape, and you don't thread `null` or de-duplicate rows by hand.
- Reach for **hand-written joins** (this lesson) when: the projection is an **irregular flat shape** (a few columns from three tables), the predicate **references multiple joined tables** in ways the relational API can't express cleanly, or **aggregates** enter the projection (L4 — group-by over joined columns).

Make the default explicit, in the chapter's own words: most join-heavy reads in this course go through the relational API; raw `db.select(...).join(...)` is the reach. End by pointing forward: L3 owns the relational API, L4 owns aggregations over joins, and Ch 039 L1 owns the FK indexes that make any of these joins fast (name the perf debt, don't teach it).

**Exercise (optional, recognition check): `MultipleChoice`** or `Buckets` — sort/identify a handful of concrete read requirements into "relational API (tree)" vs. "hand-written join (flat/irregular/aggregate)." `Buckets` fits the two-category classification well (twoCol). Items e.g.: "an invoice with its line items as a nested array" → relational; "a flat list of `invoice_id, org_name, assignee_name` for a CSV export" → join; "total revenue per organization" → join (aggregate); "a comment thread with each reply's author" → relational. Grading: each item in the correct bucket. This converts the decision rule into a checkable skill.

Reasoning: the chapter outline is emphatic that this lesson must position itself *under* L3; a closing decision section (plus a classification drill) is the cleanest way to make the student internalize "join = the reach" rather than "join = the default."

## Keep these close (External resources)

Goal: per Pedagogical guidelines §3, optional outbound references. A small `CardGrid` of `ExternalResource` cards, matching L1's closing pattern:
- Drizzle — Joins (`https://orm.drizzle.team/docs/joins`) — the four join methods, aliasing, selection shapes.
- Drizzle — `alias` / self-joins (link to the joins or operators page anchor if distinct).
- (Optional) Postgres docs — Joined tables, for the underlying SQL semantics.
Keep to 2–3 cards; verify exact URLs at fact-check time. Use the Drizzle icon as L1 did (`simple-icons:drizzle`, `iconColor="#C5F74F"`).

# Terms (Tooltip candidates)

Define with `<Term>` only what's new in this lesson and not already defined in L1 (L1 already owns: ORM, CRUD, parameterized query, placeholder, SQL injection, thenable — do NOT redefine):
- **join** — first use: "combining rows from two tables into one result by matching them on a predicate." (Brief, since the section title teaches it; a Term tooltip on the first inline mention helps the reader who jumps in.)
- **cross product / Cartesian product** — "every row of one table paired with every row of the other — what a join returns when its match predicate is missing." Define at the cross-product danger aside.
- **junction table** — one-line recall from Ch 037: "a table whose only job is to connect two others in a many-to-many relationship, via one FK to each." Define at the m:n section (prerequisite recap, kept concise).
Skip Term tooltips for `innerJoin`/`leftJoin` etc. — the section prose defines them directly. Be strategic (guidance §"List terms"): three terms, all supporting the absence/multi-table goals.

# Scope

**This lesson teaches:** `innerJoin`, `leftJoin` (the reach pair, taught at depth); `rightJoin`, `fullJoin` (named for recognition, not used); the labeled-selection object vs. the flat projection and the inferred type each yields; left-join nullability (`T | null`) and the discipline to handle the null branch; the missing-`on` cross product as a silent failure mode; self-joins via `alias`; many-to-many via two explicit joins through the `invoice_tags` junction; and the shape-driven decision between hand-written joins and the relational API.

**Already taught — recap in one line at most, do not re-teach:**
- L1 (Ch 038): `db.select`/`.from`/`.where`, the operator helpers (`eq`, `gt`, …), `and`/`or`/`not`, automatic parameterization & SQL injection (Term-defined in L1), the tiebreaker reflex, org-scoping every multi-tenant query, money as `numeric` → `string`, `.returning()`, the lazy/thenable query builder, "the type follows the projection." Reuse these; the join examples should *use* `where`, `eq`, and the money rule without explaining them again.
- Ch 037: the schema entities (organizations, invoices, line items, tags), FK declarations via `references()`, the `invoice_tags` junction (two FKs + composite PK), the self-referential relation pattern, and `$inferSelect`/`$inferInsert` types (`Invoice`, `Organization`, etc.). One-line recall only.

**Deliberately NOT in this lesson (defer, name the owner):**
- The relational query API (`db.query.<table>.findMany` / `with`) as the tree-read default — **L3 of Ch 038.** Foreshadow as "next lesson"; never show its call shape here.
- Aggregations across joins (`GROUP BY` with joined columns, `count`/`sum` over a join) — **L4 of Ch 038.** Name as the trigger to reach for hand-written joins; don't teach group-by.
- Indexing FK columns for join performance / composite indexes — **Ch 039 L1.** Name the perf debt at the closing section; don't teach indexes.
- The N+1 problem when joins are avoided / when to spot it — **Ch 039 L2.**
- `EXPLAIN ANALYZE` on join plans — **Ch 039 L3.**
- `USING` and natural joins — mention once in prose for recognition (Postgres has them; Drizzle has no `USING` shortcut, write the `on` explicitly), if it fits without inflating the lesson; otherwise drop entirely (chapter outline marks it "named for recognition, not used"). Keep to a single sentence at most, likely inside the `innerJoin` or self-join section.
- `useIndex`/`forceIndex` join hints — out of scope (mention only if `USING` is mentioned and it reads naturally; otherwise omit).
- Subqueries/CTEs and `exists`/`notExists` as alternatives to joins — **L7 of Ch 038.**

**Schema staging note for DrizzleCoding (deliberate divergence from Code conventions, per continuity notes):** exercises use integer PKs with explicit seeded ids and explicit snake_case column-name strings (no `casing` client in PGlite, no `uuidv7()`), `numeric` money graded as a string. This diverges from the production conventions (UUIDv7 PKs, `casing: 'snake_case'`) on purpose so the in-browser grader is deterministic — downstream agents should not "fix" it to match the conventions doc.
