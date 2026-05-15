# Chapter 6.3 — Querying and mutating: pedagogical approach

## Concept 1 — The four CRUD shapes plus four chain methods cover 90% of reads and writes

**Why it's hard.** A returning dev has lived through three ORM dialects and a hand-written SQL phase, and approaches Drizzle expecting either an ActiveRecord-style object soup or a method-chain maze. The teaching has to install the *cut* — four call shapes, four chain methods — as a recognizable surface before any one method is taught at depth. Otherwise the student keeps probing the API for hidden complexity and never trusts the shape.

**Ideal teaching artifact.** Concept archetype rendered as a **four-by-four grid**. Rows: `select`, `insert`, `update`, `delete`. Columns: `where`, `orderBy`, `limit`, `offset`. Each cell is either a checkmark (the chain method applies — `select` takes all four; `update`/`delete` take `where`; `insert` takes none) or a strike-through. Above the grid, one paragraph names the cut: every read and write you write today fits in one of these sixteen cells, the rest is operator helpers and projection. Below, a single worked example renders one of each call shape — `select` with all four chains, `insert` with `.values`, `update` with `where + set`, `delete` with `where`. The grid is the picture the student walks back to whenever they're lost.

**Engagement.** A `Tokens` round on a small mixed code block — five Drizzle calls jumbled together. The student clicks the `where` clause that's missing on a destructive call (planted), the `from()` that's missing on a `select` (planted), the `set()` that's missing on an `update` (planted). Forces the student to read the call shapes off muscle memory.

**Components.**
- `Figure` wrapping a hand-coded HTML table for the four-by-four grid (no bespoke component — the grid is set dressing for one beat).
- `Code` block for the four worked examples, side by side.
- `Tokens` for the missing-piece spotting round.

**Project link.** Every query in 6.6.5's `listInvoices` and `getInvoiceDetail` lives inside one of these sixteen cells; the student should be able to point at the cell each call comes from.

---

## Concept 2 — Automatic parameterization: every value is `$1`, and where the guarantee stops

**Why it's hard.** SQL injection is the bug a junior has heard about, never seen, and assumes is a solved problem. Drizzle solves it structurally — every value through `eq(col, value)` and every `${value}` inside a `sql\`\`` template becomes a `$1` placeholder bound separately by the driver. The student needs to *see* the SQL with placeholders to trust the guarantee, *and* to recognize the one escape hatch (`sql.raw`) where the guarantee stops. Without that recognition, `sql.raw(req.query.column)` ships in a side project.

**Ideal teaching artifact.** Concept archetype delivered as a **side-by-side SQL reveal**. The student sees the same logical query in three forms: (1) `eq(invoices.id, id)`, (2) `sql\`${invoices.id} = ${id}\``, (3) `sql.raw(\`${invoices.id} = '${id}'\`)`. Below each, the SQL Drizzle emits — the first two render `where "id" = $1` with the value bound; the third renders the value spliced into the string. The student then sees what `id = "x'; drop table invoices; --"` does in each case: harmless in the first two, catastrophic in the third. The teaching is the visible difference between a placeholder and a string-spliced value, plus the named rule: `sql.raw` is the only path that drops the guarantee, and it's reserved for fixed-string identifiers.

**Engagement.** A `Buckets` sort: eight code fragments dropped into "parameterized" or "vulnerable to injection." The vulnerable bucket includes `sql.raw(userInput)`, a JS template literal without the `sql` tag (`db.execute(\`select ... ${input}\`)`), and `sql.identifier(req.query.col)` from a non-allowlisted source. The parameterized bucket includes `eq`, `sql\`...${value}...\``, `inArray(col, [...userIds])`.

**Components.**
- `CodeVariants` with three tabs (`eq` builder, `sql\`\`` template, `sql.raw`) showing the call site, the emitted SQL, and the injection scenario per tab.
- `Buckets` for the parameterization classification sort.
- `Aside` (`caution`) below the round naming the rule: "If user input touches the SQL string outside an `sql\`\`` interpolation, it bypasses parameterization."

**Project link.** The 6.6 project's queries all run through `eq` and `sql\`\``-tagged predicates; the student should never see a code-review reason to reach for `sql.raw` in the project starter.

---

## Concept 3 — The missing-`where` bug: a silent table wipe

**Why it's hard.** This is the production failure that ages a junior overnight. `db.update(invoices).set({ status: 'paid' })` without `.where(...)` updates every row in the table. Drizzle does not warn. The TypeScript checker does not warn. The query runs in milliseconds and the rollback story depends on whether anyone took a backup. The teaching has to make the failure mode tangible enough that the student installs the missing-`where` check as muscle-memory at the keyboard, not as a rule they remember.

**Ideal teaching artifact.** Misconception-first ambush rendered as a **predict-the-impact drill**. The student sees a five-row `invoices` table fixture and a Drizzle call: `await db.update(invoices).set({ status: 'paid' })`. They're asked: how many rows just changed? Most will say "one" or "the matching one." The reveal: all five. The lesson then shows the same call with `.where(eq(invoices.id, id))` and replays the count — one. Below, the same shape for `delete`: a `db.delete(users)` with no `where` empties the table; with a `where`, it removes one row. The teaching beat is the two-line difference: a missing chain method is the difference between a single-row write and a table wipe. Closing rule: every `update`/`delete` PR-reviewed by a senior has the `where` highlighted before the `set`.

**Engagement.** A `CodeReview` exercise: the student is shown a four-call PR diff that includes one `update` missing its `where`, one `delete` correctly scoped, one `update` with a `where` on a non-unique column (concerning but legal), and one `select` (decoy). The student leaves an inline comment on the missing-`where` line. AI grades against the rubric "names the missing where clause and the table-wipe consequence."

**Components.**
- `PredictOutput` for the row-count ambush (the predicted value is "1," the actual is "5").
- `CodeVariants` with two tabs ("missing where", "scoped where") showing the same call and the row count badge.
- `CodeReview` for the PR review exercise.
- `Aside` (`caution`) stating the rule below the exercise.

**Project link.** Project 6.6 has no mutations (it's read-only by scope), but 7.6 ships the first writes — the student carries the missing-`where` reflex into that chapter.

---

## Concept 4 — `where` composition: operator helpers, `and`/`or`/`not`, and the small predicate DSL

**Why it's hard.** Coming from raw SQL, the student expects to type `where status = 'sent' and total > 1000`. Drizzle replaces the operators with helper calls (`and(eq(...), gt(...))`) and the syntax shift feels like ceremony. Without seeing the shape compose cleanly across realistic predicates, the student writes the helpers awkwardly — over-nesting `and`, forgetting `inArray` exists and reaching for a join, missing `ilike` and reaching for `lower(col) = lower(value)`. The teaching has to install the helper set as a *vocabulary*, not a list.

**Ideal teaching artifact.** Mechanics archetype delivered as a **SQL-to-Drizzle translation panel**. Six predicates on the left, each a one-line SQL `WHERE` clause from a real SaaS query: `status = 'sent' and total > 1000`; `id in (1, 2, 3)`; `name ilike '%acme%'`; `deleted_at is null`; `created_at between '2026-01-01' and '2026-12-31'`; `(status = 'sent' or status = 'overdue') and organization_id = $1`. On the right, the Drizzle equivalent for each, with the operator helper imports collected at the top once. Below the panel, a one-paragraph framing of the helper set as a closed vocabulary — `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `like`, `ilike`, `between`, `and`, `or`, `not`. That's the whole DSL; everything else falls back to `sql\`\``.

**Engagement.** A `DrizzleCoding` exercise: the student is given an `invoices` table and three prose specifications ("sent invoices over $1000 from this org", "any status except void", "names containing 'acme' case-insensitively, created this year") and writes the `where` clause for each. The grader runs each query against a seeded fixture and compares result rows.

**Components.**
- `Figure` wrapping a two-column table (SQL on the left, Drizzle on the right) for the translation panel.
- `DrizzleCoding` for the three-predicate exercise.
- `Aside` (`tip`) listing the helper vocabulary as a one-line reference below the exercise.

**Project link.** The 6.6 `listInvoices` `where` filters by `organizationId` and an optional `status`; the student writes it with `and(eq(...), eq(...))` straight from this vocabulary.

---

## Concept 5 — Labeled vs. flat selection: the projection shape determines the return type

**Why it's hard.** Joining two tables forces the question: do you want `{ invoice: Invoice; org: Organization }[]` or `{ id: string; total: string; orgName: string }[]`? Drizzle exposes both and the choice has structural consequences for every consumer. The student writes the first one because it's easier to type, then fights the nested shape in every component that consumes the result. The teaching has to make the trade visible: the labeled shape preserves table boundaries (good when you'll pass whole rows around), the flat shape gives you a narrower type (good when you only need a few columns from each side and the consumer is a list cell).

**Ideal teaching artifact.** Mechanics archetype rendered as a **side-by-side projection comparison**. Two `db.select(...)` calls for the same `invoices innerJoin organizations` query, one with labeled selection (`select({ invoice: invoices, org: organizations })`) and one with flat (`select({ id: invoices.id, total: invoices.total, orgName: organizations.name })`). Below each, the inferred TypeScript type rendered explicitly. To the right of each, a tiny consumer snippet — a list cell rendering one row — showing the shape difference at the call site (`row.invoice.total` vs. `row.total`). The teaching is the visible asymmetry: labeled is the right reach when the whole rows travel; flat is the right reach when only a few columns do.

**Engagement.** A `MultipleChoice` round of three scenarios: (a) a list cell rendering invoice number, total, and org name — flat; (b) a detail page hydrating a typed `Invoice` and a typed `Organization` for downstream forms — labeled; (c) an export query writing CSV columns — flat. Each pick names the trigger (consumer needs whole-row vs. consumer needs columns).

**Components.**
- `CodeVariants` with two tabs ("labeled", "flat") rendering the call, the inferred type, and a one-line consumer.
- `MultipleChoice` reused three times for the scenario round.

**Project link.** The 6.6 list query uses a flat projection (the list cell only needs a handful of columns); the detail query uses the relational API directly, which is structurally labeled.

---

## Concept 6 — Left-join nullability is structural, not a hint

**Why it's hard.** `leftJoin` makes every column from the right side `T | null` in the inferred result. The TS checker enforces it. The student's reflex is to silence the warning with `!` and move on, because the relationship "should always exist" — and silently strips the only check that catches the row where it didn't. The teaching has to make the nullability *meaningful*: it's the type system telling you the join may not have matched, and that's a shape your consumer has to handle.

**Ideal teaching artifact.** Concept archetype delivered as a **type-narrowing demonstration**. The student sees a `leftJoin` query — invoices joined to a (sometimes-missing) `assigned_to_user`. The inferred result is `{ invoice: Invoice; assignedToUser: User | null }[]`. Two consumers below: the *wrong* one types `row.assignedToUser!.name` and crashes the moment a row has no assignee; the *right* one narrows with `row.assignedToUser?.name ?? 'Unassigned'`. To the side, the two alternative call shapes if the join must always match: switch to `innerJoin` (drops unmatched rows entirely, narrows the type), or filter with `where(isNotNull(users.id))` after the left join (keeps the type narrow). Three escape valves, one rule: the type is the truth.

**Engagement.** A `MultipleChoice` round: "you join invoices to organizations via a non-null FK and the inferred type still says `org: Organization | null`. Why?" Options: the FK doesn't enforce join matching at the type level (correct — `leftJoin` always nullifies regardless of the underlying FK); Drizzle has a bug; the schema is missing `.notNull()`; the relational API would fix it. The wrong-answer feedback names that the FK enforces *referential integrity*, not *join matching*.

**Components.**
- `CodeVariants` with three tabs ("`!` and crash", "narrow with `??`", "switch to `innerJoin`") rendering the same call and consumer in each.
- `MultipleChoice` for the FK-vs-join-type confusion.
- `Aside` (`note`) below: "the type system is naming a real possibility, not a quirk — narrow or switch joins."

**Project link.** Project 6.6's `getInvoiceDetail` joins customer to invoice via a non-null FK; the student uses `innerJoin` (or the relational API, which fires the same constraint), not `leftJoin` with a `!`.

---

## Concept 7 — Many-to-many traversal: two joins through a junction

**Why it's hard.** N:M relationships were named in 6.2.8 as a junction-table shape; here they cash in as two consecutive joins. Juniors who recognize the shape but haven't written the call still hesitate at "how do I get all tags for an invoice?" — the answer is `invoices` `innerJoin` `invoice_tags` `innerJoin` `tags`, but the chain reads like ceremony until you've written it once.

**Ideal teaching artifact.** Mechanics archetype delivered as a **walkthrough of one query**. The student sees the three-table topology rendered as a small ER fragment (`invoices` ↔ `invoice_tags` ↔ `tags`), with the join keys called out. Below it, the Drizzle query is built up in three steps, each step adding one chain link, each step's intermediate result type rendered: after `from(invoices)`, the rows are invoices; after the first `innerJoin`, the rows are `{ invoice, tag_link }`; after the second `innerJoin`, the rows are `{ invoice, tag_link, tag }`. The student watches the result type grow with each join. Closing line: this is the call shape `with: { tags: true }` will replace once `defineRelations` has the `through` declared (Concept 8).

**Engagement.** A `DrizzleCoding` exercise: given the three tables, the student writes the query that returns all tags for a given `invoiceId`. The grader runs it against a fixture and matches the tag set.

**Components.**
- `Figure` wrapping a hand SVG of the three-table ER fragment with join keys labeled.
- `AnnotatedCode` walking the three-step query build, one step per join, showing the intermediate result type at each step.
- `DrizzleCoding` for the tag-lookup exercise.

**Project link.** Project 6.6 doesn't use M:N tags directly (`org_members` is the junction-with-metadata case), but the same two-join shape is what the chapter's later relational `with: { tags: true }` example replaces.

---

## Concept 8 — `db.query` as the senior default for tree-shaped reads

**Why it's hard.** Drizzle ships two query APIs against the same schema. The student needs to leave the chapter knowing that `db.query.<table>.findMany({ with: ... })` is the senior default for any read that returns a tree (parent + children, parent + children + grandchildren), and that hand-written `db.select().from().leftJoin(...)` is the reach for irregular projections, aggregates, and predicates that span multiple joined tables. Without that decision installed, the student picks based on which API they remember first and writes hand-joins for cases the relational API solves in two lines.

**Ideal teaching artifact.** Decision archetype delivered as a **same-result, two-implementations contest**. The student sees the same product requirement: "list this organization's invoices, each with its line items and its customer." Tab one: hand-written `db.select(...).leftJoin(invoiceLines, ...).leftJoin(customers, ...)` plus the client-side regrouping code that turns the flat join result back into a nested shape. Tab two: `db.query.invoices.findMany({ where: ..., with: { lineItems: true, customer: true } })` — eight lines, no regrouping, types nested. Below the tabs, line counts, type-shape diff, and the senior call: relational API is the default for this shape; the hand-join wins only when irregular projection, aggregate, or cross-join predicate enters. Two follow-up bullets name the carve-outs.

**Engagement.** A `Buckets` sort: six query descriptions dropped into "relational API" or "hand `db.select`". Tree-shaped reads bucket left; aggregates, irregular flat projections, predicates spanning multiple joined tables bucket right. Wrong-answer feedback names which trigger drove the call.

**Components.**
- `CodeVariants` with two tabs (hand-join + regrouping vs. `db.query` with `with`) showing the line-count badge per tab.
- `Buckets` for the API-choice sort.
- `Aside` (`tip`) below stating the default and the three carve-outs.

**Project link.** Project 6.6's `getInvoiceDetail` is the canonical relational `findFirst` with `lines` and `customer` — the shape this concept makes the student reach for first.

---

## Concept 9 — One SQL statement, not N+1: the relational API as a structural fix

**Why it's hard.** N+1 is the read-side performance bug juniors write the most often and recognize the least. The pattern: fetch parents in one query, then loop and issue a child query per parent. The relational API solves it by emitting a *single* SQL statement with subqueries that aggregate child rows into JSON arrays — but the student can't trust the fix until they've seen the difference, both in code shape and in the SQL that hits the wire. (Chapter 6.4.2 owns N+1 at depth; this concept's job is to install the structural-fix recognition so the student reaches for the relational API by reflex, not after the bug.)

**Ideal teaching artifact.** Concept archetype rendered as a **two-trace comparison**. Left trace: hand-written N+1 — fetch invoices (1 query), loop, per-invoice fetch line items (N queries), total `1 + N` round-trips, render. The trace shows the wire calls as a stack of round-trip bars, each labeled with the SQL. Right trace: `db.query.invoices.findMany({ with: { lineItems: true } })` — one round-trip, one bar, the SQL expanded to show the subquery aggregating line items into a JSON array per parent. A counter at the bottom of each trace shows the round-trip count for 50 invoices: 51 vs. 1. The student sees the structural cost in numbers, not in prose.

**Engagement.** A `PredictOutput`-shaped drill: given a code fragment that loops over 100 fetched invoices and awaits a per-invoice `findFirst`, predict the round-trip count. The student answers, the reveal shows 101, and one line of follow-up shows the relational rewrite as a single round-trip. Confirm with one `MultipleChoice`: "the structural property that makes the relational API N+1-safe is" → "it compiles to a single SQL statement with child-aggregating subqueries."

**Components.**
- New (or escalation of an existing diagram): `RoundTripTrace` — props: `traces` (array of `{ label, queries: { sql: string, latencyMs?: number }[] }`), optional `parentCount` to scale the N visually. Renders two stacked column traces side by side, each query as a bar, with a round-trip-count badge at the bottom. Pure static rendering — no real timing, just a teaching diagram.
- `PredictOutput` for the round-trip-count drill.
- `MultipleChoice` for the structural-property recall.
- Alternative if the bespoke component doesn't earn its weight: `Figure` wrapping a hand SVG of the two stacked traces with the round-trip counts as numbered labels on each bar.

**Project link.** Project 6.6's `getInvoiceDetail` is single-round-trip by construction — one of the seven Done-when checks (6.6.6) is exactly "single round-trip detail," verified via query log inspection.

---

## Concept 10 — `groupBy` must include every non-aggregated column

**Why it's hard.** This is the most common aggregate error — the student writes `db.select({ orgName: organizations.name, count: count(invoices.id) }).from(invoices).innerJoin(organizations, ...).groupBy(organizations.id)` and Postgres rejects with "column `organizations.name` must appear in the GROUP BY clause or be used in an aggregate function." The fix (add `organizations.name` to the `groupBy` arg list) is mechanical, but the *reason* is structural: an aggregate query reduces multiple rows to one per group, and Postgres needs to know whether each non-aggregated column collapses to a single value per group (group it) or summarizes (aggregate it). Without the model, the student stops trusting `groupBy`.

**Ideal teaching artifact.** Concept archetype delivered as a **row-collapse visualization**. The student sees a small fixture — six invoice rows, three organizations. Three side-by-side panels walk the same query through three states: (1) raw join — six rows, every column visible; (2) imagined "group by `organizations.id` alone" with `organizations.name` left dangling — Postgres can't pick one name per group, error highlighted; (3) correct group with `organizations.id` *and* `organizations.name` in the `groupBy` — three rows, one per org, the `count(invoices.id)` collapsed correctly. The teaching is the visible row collapse and the visible column dangling.

**Engagement.** A `DrizzleCoding` exercise: the student is given an `invoices` and `organizations` schema and asked to "return one row per organization with the org name and the invoice count." The grader runs the query and compares; if the student omits `organizations.name` from `groupBy`, the Postgres error message surfaces directly in the grader feedback (the live SQL runtime makes this real, not a synthetic check).

**Components.**
- `Figure` wrapping a hand SVG of the three row-states (raw, broken-group, correct-group) as small data tables.
- `DrizzleCoding` for the group-by-name exercise.
- `Aside` (`note`) below stating the rule: "every column in the projection that isn't wrapped in an aggregate must appear in `groupBy`."

**Project link.** Not directly used in 6.6's read scope, but the same shape appears in any "invoices per org" or dashboard query in Units 11+ that this chapter prepares.

---

## Concept 11 — `where` reduces rows in, `having` reduces groups out

**Why it's hard.** `where` and `having` filter at different stages of query execution, but the syntax difference is one keyword and the conceptual difference is invisible to a student who hasn't internalized the aggregate pipeline. The trap: filtering on an aggregate (`having sum(total) > 1000`) inside `where` produces an error; filtering on a row column (`where status = 'sent'`) inside `having` works but runs after grouping and is slower. The teaching has to make the *order* visible: rows are filtered first, then grouped, then groups are filtered.

**Ideal teaching artifact.** Mechanics archetype rendered as a **pipeline diagram**. A horizontal flow: input rows → `where` filter → `groupBy` → `having` filter → output rows. Below the flow, the same query in two correct shapes: filter sent invoices first then group by org and sum (`where(eq(status, 'sent'))` then `groupBy(orgId)`); filter to orgs with more than $1000 of sent invoices (`where(eq(status, 'sent'))` then `groupBy(orgId)` then `having(gt(sum(total), '1000'))`). Above the diagram, the wrong shapes called out: `having(eq(status, 'sent'))` runs but is slower; `where(gt(sum(total), '1000'))` doesn't compile.

**Engagement.** A `Buckets` sort: eight predicate descriptions dropped into "where" or "having." Predicates on aggregates go right; predicates on row columns go left. One trick item — "filter to invoices created this year" — is structurally a `where`, not a `having`, even when it appears in a `groupBy` query.

**Components.**
- `Figure` wrapping a hand SVG of the four-stage pipeline (input → where → groupBy → having → output).
- `CodeVariants` with two tabs ("rows-first then group", "rows-first, group, then groups") for the worked queries.
- `Buckets` for the where-vs-having sort.

**Project link.** No direct link in 6.6's scope, but the pipeline mental model lands so that the dashboard queries in Unit 11 don't reinvent this beat.

---

## Concept 12 — Upsert is one atomic statement; select-then-insert is a race

**Why it's hard.** The "find or create" pattern is the most-written multi-statement workflow in SaaS — webhook idempotency, user-by-email, settings save — and the obvious implementation (read first, then insert if absent) carries a race window the student has never hit because they've never tested it under concurrency. The teaching has to make the race visible enough that the student's reflex when they next write "find or create" is `onConflictDoUpdate`, not two queries.

**Ideal teaching artifact.** Misconception-first ambush rendered as a **race-window timeline**. Two parallel request lanes (Request A, Request B) execute the same "find user by email, create if absent" code against an empty table. The timeline ticks: A reads (no row) → B reads (no row) → A inserts → B inserts. Two outcomes shown side by side: (1) the email column is unique → B's insert raises a unique-violation error and the request 500s; (2) the email column is *not* unique → both inserts succeed and the table now has two users with the same email, neither tagged as the duplicate. Below, the same workflow as one `db.insert(users).values(...).onConflictDoUpdate({ target: users.email, set: { ... } }).returning()` — single statement, atomic, no race. The teaching is the visible interleaving in the wrong shape and its disappearance in the right one.

**Engagement.** A `Sequence` exercise: the student orders six interleaved steps from the two-request scenario into the order that produces the duplicate. Then a confirming `MultipleChoice`: "the smallest change that closes this race window is" → "wrap both reads and writes in a transaction" (no — race still possible without `FOR UPDATE`); "use a unique constraint on email" (partial — turns the race into a 500); "use `onConflictDoUpdate`" (correct — the only single-statement fix); "retry on failure" (no — silent corruption with no unique constraint).

**Components.**
- `Figure` wrapping a hand SVG (or `DiagramSequence`) of the two-lane race-window timeline with both outcomes.
- `Sequence` for the interleaving-order drill.
- `MultipleChoice` for the closing recall.
- `CodeVariants` with two tabs ("read-then-write race", "upsert atomic") below the diagram.

**Project link.** Project 6.6 has no mutations, but every webhook handler in Unit 12 lands on this shape — installing the reflex now means the student doesn't write a race-y find-or-create in 12.1.

---

## Concept 13 — The `excluded` pseudo-table and the `target` constraint dependency

**Why it's hard.** Two things in `onConflictDoUpdate` look like magic until they're named: the `target` argument that points at a unique constraint (and silently fails if no constraint exists), and the `excluded` pseudo-table that references "the row that would have been inserted." Both are SQL-level concepts surfaced through Drizzle, and both are common stumbling points — the student writes an upsert without a unique constraint on `target` and Postgres rejects with "no unique or exclusion constraint matching the ON CONFLICT specification." Or they restate the value verbatim in `set` instead of using `excluded`, and the upsert works but the next reader doesn't know the pattern.

**Ideal teaching artifact.** Mechanics archetype rendered as an **annotated upsert call**. One worked example: webhook idempotency. The call is `db.insert(events).values({ externalId, type, payload }).onConflictDoUpdate({ target: events.externalId, set: { payload: sql\`excluded.payload\`, processedAt: sql\`excluded.processed_at\` } }).returning()`. Five annotations walk through it in order: (1) `target` points at `events.externalId` and assumes the unique constraint on that column declared in 6.2.7; (2) `excluded` is the row that would have been inserted, scoped to this conflict; (3) `set` references `excluded.payload`, not the literal — same value, but the pattern communicates intent; (4) `returning()` hands back the post-write row in either branch; (5) the bulk-upsert variant (`.values([...])`) applies the conflict resolution per row. To the side, the failing scenario: same call but the schema's `external_id` is not unique — Postgres rejects, the error message is the diagnostic.

**Engagement.** A `Dropdowns` exercise on a partial upsert call with four blanks: the `target` column, the `excluded.<col>` reference inside `set`, the trailing `.returning()`, and the unique-constraint declaration on the schema side (the student picks `.unique()` from a dropdown to make the upsert legal).

**Components.**
- `AnnotatedCode` walking the five annotations on the worked upsert call.
- `Dropdowns` for the four-blank exercise.
- `Aside` (`caution`) below: "if the target column lacks a unique constraint, Postgres rejects the upsert at runtime — this is a schema dependency, not a Drizzle one."

**Project link.** Project 6.6 doesn't mutate, but the `org_members` upsert pattern (org-by-user composite target) is the canonical shape the student will reach for in Unit 10.

---

## Concept 14 — `RETURNING` as the round-trip eliminator

**Why it's hard.** Without `.returning()`, the natural shape after a write is a follow-up `select` to read back the auto-generated id, the timestamp the database stamped, or the columns the upsert set. Two round-trips, a race window, and a return type the student has to hand-build. With `.returning()`, one statement, one inferred type, no race. The teaching has to make the *separate-select smell* visible — the student should leave the chapter unable to write a `db.insert` without `.returning()` for the post-write row.

**Ideal teaching artifact.** Pattern archetype rendered as a **before-and-after refactor**. The student sees a Server Action that creates an invoice: insert the row, then `select` the just-inserted row by id to get its `createdAt` and the assigned `invoiceNumber`. Two queries, two round-trips, and the second query's `where(eq(invoices.id, newId))` fires on a value the first query just wrote — a small race window where another request could have read the row in a transitional state (or a transaction wrapping both adds latency). The refactor: append `.returning()` to the insert, destructure the result, drop the second query. Below, the inferred type — `Invoice` (full row) by default, narrowable with `.returning({ id: invoices.id, createdAt: invoices.createdAt })`.

**Engagement.** A `CodeReview` exercise: the student is given a four-call PR diff that includes one insert followed by a separate select-by-id (correct: flag and suggest `.returning()`), one update with `.returning()` (correct), one delete without `.returning()` (acceptable — no post-write data needed), and one upsert without `.returning()` after `onConflictDoNothing` (correct: flag — without `.returning()` the caller can't tell whether the row was inserted or skipped). AI grades against a four-rubric kernel.

**Components.**
- `CodeVariants` with two tabs ("insert + select by id", "insert + returning") rendering the same Server Action in both forms.
- `CodeReview` for the four-call PR review.
- `Aside` (`tip`) below: "any time you write a select right after a write, the right shape is a `.returning()` on the write."

**Project link.** Project 6.6 is read-only, but every action in 7.6 will use `.returning()` — installing this reflex now means the student doesn't write a select-after-insert in the next chapter.

---

## Concept 15 — Why offset breaks: deep pages and moving data

**Why it's hard.** Offset pagination is the obvious shape: `limit(20).offset(40)` reads as "give me page 3." It works. It scales linearly until it doesn't, and then it fails in two ways the student hasn't seen: (1) deep pages cost O(offset) — Postgres scans and discards every skipped row, so page 500 of a million-row table reads ten thousand rows to return twenty; (2) a row inserted between requests for page 1 and page 2 shifts every subsequent page by one, and the user sees a duplicated or skipped row. The teaching has to make both failures *felt*, not stated, before cursor pagination can land as the answer.

**Ideal teaching artifact.** Misconception-first ambush delivered as a **two-failure simulator**. The student sees a small list of 10 rows numbered 1–10, with a `pageSize=3` and a "next page" button that walks the offset forward. Two modes: (1) **deep-page cost** — a slider sets the row count from 10 to 1,000,000; a "scan cost" meter under the page-display climbs as offset grows, the page-display shows "scanned 30 rows" on page 1, "scanned 500,030 rows" on page 17,000, the actual returned rows always 3; (2) **moving data** — between page 1 and page 2, an inserted row appears at the top of the result set; the "next page" button now shows row 3 again on page 2 (duplicate) or skips row 4 (skip), depending on insert position. The student watches both failures play out under their fingers.

**Engagement.** A `MultipleChoice` round of three scenarios after the simulator: (a) admin table of 200 rows that doesn't change → offset is fine; (b) public feed of 100k posts where users scroll deep → cursor; (c) inbox showing live mail with new arrivals during pagination → cursor. Wrong-answer feedback names which axis (data size or active mutation) flipped the call.

**Components.**
- New: `OffsetVsCursorSim` — props: `mode` (`"deep"` | `"moving"`), `rowCount` (default 100), `pageSize` (default 3). Renders a list, a page-display with current page, a "next page" button, an optional row-count slider in `"deep"` mode, an optional "insert row" button in `"moving"` mode, and a scan-cost meter under the page-display. Pure client state. Toggle between modes inside the simulator.
- `MultipleChoice` for the three-scenario round.
- Alternative if the simulator can't ship: `Figure` wrapping a hand SVG showing four panels (page 1 stable, page 2 stable, page 1 with insert, page 2 after insert showing the duplicate) plus a static cost-curve graph for deep-page scan cost. Loses the tactile reveal but keeps both failures visible.

**Project link.** Project 6.6's `listInvoices` is cursor-paginated by construction; the seven Done-when checks include a cursor-stability verification. The student must understand why offset *would have failed* before the cursor shape feels earned.

---

## Concept 16 — Cursor pagination: sort key + tiebreaker as the stable predicate

**Why it's hard.** Cursor pagination's `where` clause looks weird the first time: `or(lt(t.createdAt, cursor.createdAt), and(eq(t.createdAt, cursor.createdAt), lt(t.id, cursor.id)))`. The student stares at it, reads it as ceremony, and either omits the tiebreaker (silent skip-or-duplicate at page boundaries when sort-key values tie) or copies the shape without understanding why both halves of the `or` are needed. The teaching has to make the *tiebreaker* the load-bearing concept: cursor stability requires deterministic ordering, and ordering is deterministic only when the sort keys are unique together.

**Ideal teaching artifact.** Concept archetype delivered as a **boundary-walk diagram**. Six rows ordered by `createdAt desc`, with two rows sharing the same `createdAt` value at positions 3 and 4 (the page boundary if `pageSize=3`). Three panels walk the boundary: (1) **no tiebreaker** — `where(lt(t.createdAt, cursor.createdAt))` after page 1 — row 4 is silently skipped because its `createdAt` equals the cursor's; (2) **tiebreaker on `id`, naive `where(lt(t.id, cursor.id))`** — drops every row with a smaller id regardless of `createdAt`, producing the wrong page; (3) **the correct compound `or(lt(createdAt, c), and(eq(createdAt, c), lt(id, c.id)))`** — row 4 is the next row, page 2 starts cleanly. Below, one paragraph: the predicate reads as "anything strictly older, or anything tied on `createdAt` but strictly smaller `id`." That's the whole shape.

**Engagement.** A `DrizzleCoding` exercise: the student is given an `invoices` schema and asked to write the cursor `where` clause for a cursor `{ createdAt: Date, id: string }`, ordering by `desc(createdAt), desc(id)`. The grader runs the query against a fixture with tied `createdAt` values and checks that no rows are skipped or duplicated across pages.

**Components.**
- `Figure` wrapping a hand SVG of the six-row boundary-walk with three panels.
- `DrizzleCoding` for the cursor-where-clause exercise.
- `Aside` (`caution`) below: "every cursor needs a unique tiebreaker; the primary key is the safe default."

**Project link.** Project 6.6.5's `listInvoices` is exactly this shape — `desc(createdAt), desc(id)` with the compound `where` predicate. The student writes it from this concept, not from copy-paste.

---

## Concept 17 — Opaque base64 cursors, the n+1 trick, and tenant scoping

**Why it's hard.** Once the cursor predicate is understood, three smaller-but-load-bearing details remain: the cursor must be opaque (so clients don't depend on its shape), the "is there a next page?" affordance is solved with `limit(pageSize + 1)` not a separate count query, and `organizationId` belongs in the request context (auth), not in the cursor (where it's a leak vector). Each is a small reflex; together they're the difference between a cursor implementation that ships and one that leaks tenant data on the first audit.

**Ideal teaching artifact.** Pattern archetype delivered as a **complete worked endpoint**, three annotations long. The endpoint: `GET /api/invoices?cursor=...&pageSize=...`. Annotation one: cursor is decoded from base64 → JSON, validated with Zod, untrusted input — the same defense as any query parameter. Annotation two: the query runs `limit(pageSize + 1)`; the response slices the first `pageSize` and uses the extra row's keys as the next cursor (or omits `nextCursor` if the extra row didn't exist). Annotation three: `organizationId` is read from auth context inside the handler, not from the cursor; putting it in the cursor would let a client edit the cursor and read another tenant's data. Below, the encoding helper (`Buffer.from(JSON.stringify(...)).toString('base64url')`) and the decoding helper, both four lines.

**Engagement.** A `MultipleChoice` round of three scenarios: (a) "the team adds an `organizationId` field to the cursor JSON to scope the query — what's the smell?" → tenant-leak vector, the request context owns scoping; (b) "the API needs a 'has next page' affordance — what's the cheapest implementation?" → fetch n+1, no separate count; (c) "the cursor JSON includes only the sort keys with no signing — is that fine?" → yes, opaque-but-unsigned is fine because the server validates the decoded shape against the query (the cursor cannot escalate access).

**Components.**
- `AnnotatedCode` walking the three annotations on the endpoint.
- `MultipleChoice` reused three times for the scenario round.
- `Aside` (`note`) below: "cursors are untrusted client input — validate the decoded shape, never the encoded blob."

**Project link.** Project 6.6.5's `listInvoices` ships this exact pattern — base64 cursor, n+1 trick, `organizationId` from auth. Two of the seven Done-when checks (cross-org tenant guard, cursor pagination) verify it.

---

## Concept 18 — CTEs and inline subqueries: the readability call

**Why it's hard.** Subqueries and CTEs cover the same ground in most cases — Postgres' planner produces equivalent plans for both since 12+ — and the student picks based on syntax preference rather than the readability call. The teaching has to install the rule: CTE when the sub-result is named (it appears more than once, or the name itself communicates intent); inline subquery when the sub-result is referenced once and the query reads cleanly with it embedded. The wrong reach is a CTE that nobody reads (over-engineered) or a deeply nested subquery the next reader can't unpack (under-engineered).

**Ideal teaching artifact.** Decision archetype rendered as a **same-result, two-shapes pair**. The query: "top three tags per organization by invoice count." Shape A: one CTE computing per-org-tag counts, then `row_number() over (partition by orgId order by count desc)` ranking, then a final select with `where rank <= 3` — three named layers, the CTE is `withTopTagsPerOrg`. Shape B: the same logic as nested subqueries in `from`, no name, three levels of indentation. Both queries return the same result with the same plan. The student reads both side by side; the CTE wins on readability for this one because the sub-result has a *name worth saying*. Below, the inverse case: a one-line "rows whose id is in this filtered set" — the inline subquery reads cleaner than a CTE for that. The rule lands: name when naming helps; inline when it doesn't.

**Engagement.** A `MultipleChoice` round of three small queries — for each, the student picks "CTE" or "inline subquery" based on whether naming the sub-result earns its weight. Wrong-answer feedback names the readability call.

**Components.**
- `CodeVariants` with two tabs ("CTE shape", "nested subquery shape") for the top-three-tags query.
- `MultipleChoice` reused three times for the readability round.
- `Aside` (`tip`) below: "CTEs are for readability, not performance — Postgres usually inlines them anyway."

**Project link.** Project 6.6 doesn't ship a CTE in scope, but the dashboard queries in Unit 11 will, and the readability call is the load-bearing reflex from this concept.

---

## Concept 19 — `exists` and the existence question

**Why it's hard.** "Show me invoices that have at least one line item" is a junior trap — the student writes a join and a `groupBy` with `having count > 0`, which works but reads like ceremony and runs slower because the join materializes every match before the count discards them. The right shape is `where(exists(subquery))` — Postgres short-circuits on the first match and the predicate stays readable. The teaching has to install `exists`/`notExists` as the *answer to the existence question*, distinct from joins (which answer "give me the matched rows") and aggregates (which answer "how many").

**Ideal teaching artifact.** Mechanics archetype delivered as a **three-shape comparison** for the same question. The question: "invoices with at least one line item." Shape A: `innerJoin` and `distinct` on invoice id — works, materializes every match, distinct discards. Shape B: `groupBy(invoice.id)` then `having(gt(count(...), 0))` — works, computes the count, throws it away. Shape C: `where(exists(db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoices.id))))` — short-circuits on first match per parent. The plan for each is sketched briefly (no `EXPLAIN ANALYZE` yet — that's 6.4.3); the student sees that C is the readable shape and the cheap shape simultaneously. Closing line: existence questions belong in `exists`; matched-rows questions belong in joins; counts belong in aggregates.

**Engagement.** A `Buckets` sort: six query descriptions ("invoices with line items", "invoices with their line items", "count of invoices per org", "invoices without any line items", "the line items of a specific invoice", "orgs that have ever invoiced") sorted into "join", "exists / notExists", or "aggregate." Wrong-answer feedback names the question shape that drove the call.

**Components.**
- `CodeVariants` with three tabs (`distinct join`, `groupBy + having`, `exists`) for the same question.
- `Buckets` for the question-shape sort.

**Project link.** Not directly in 6.6's scope; the pattern lands so reporting reads in Unit 11 don't reach for the wrong shape.

---

## Concept 20 — `tsvector` generated columns + `websearch_to_tsquery` for safe user input

**Why it's hard.** Postgres full-text search has two adoption traps: (1) computing `to_tsvector(...)` at query time instead of indexing a generated column — works in dev, sequential-scans in production at any real volume; (2) using `to_tsquery` with raw user input — `to_tsquery` requires manual operator syntax (`&`, `|`, `!`) that user input doesn't follow, and a single unmatched parenthesis raises a syntax error from inside Postgres. The senior shape — generated `tsvector` column + `websearch_to_tsquery` for input — sidesteps both traps but isn't obvious from the docs.

**Ideal teaching artifact.** Pattern archetype delivered as a **wire-up of one search query**. Three pieces, named in order: (1) the schema — a `searchVector: tsvector('search_vector').generatedAlwaysAs(sql\`to_tsvector('english', coalesce(${invoices.description}, '') || ' ' || coalesce(${invoices.customerName}, ''))\`).notNull()` column added to `invoices`, with the GIN index named but deferred to 6.4.1; (2) the query — `where(sql\`${invoices.searchVector} @@ websearch_to_tsquery('english', ${searchTerm})\`)`, with the user term as a parameterized interpolation; (3) the ordering — `orderBy(desc(sql\`ts_rank(${invoices.searchVector}, websearch_to_tsquery('english', ${term}))\`), desc(invoices.id))` with the PK tiebreaker for cursor stability. Below, the misuse comparison: `to_tsquery('hello world')` (raises syntax error — needs `&`); `websearch_to_tsquery('hello world')` (parses Google-style, returns the right query). The three-piece wire-up is the senior shape; the student leaves with the picture, not a survey of FTS functions.

**Engagement.** A `DrizzleSchemaCoding` exercise: the student adds the `searchVector` generated column to a `posts` table whose `title` and `body` are searchable, with the GIN-index hint as a follow-up comment (the index itself is 6.4.1's territory). The grader checks the column shape and that the generated expression covers both source fields with `coalesce`.

**Components.**
- `AnnotatedCode` walking the three pieces (schema, query, ordering) in order.
- `CodeVariants` with two tabs (`to_tsquery` failure, `websearch_to_tsquery` success) for the input-safety reveal.
- `DrizzleSchemaCoding` for the generated-column exercise.
- `Aside` (`note`) below: "the GIN index that makes this fast lives in 6.4.1; without it, FTS is a sequential scan."

**Project link.** Not in 6.6's scope, but the search affordance in the project chapters of Units 11+ uses this exact wire-up.

---

## Concept 21 — JSONB: read paths, the `@>` containment operator, and the promote-to-column trigger

**Why it's hard.** JSONB is the column type juniors over-reach for (every flexible-looking shape becomes JSONB) and under-tool when they do reach (they read the whole column out and filter in app code instead of using `@>` in the database). The teaching has two beats: install the *trigger* for when JSONB is the right reach (heterogeneous payloads, third-party shapes, audit details), and install the *read operators* — `->`, `->>`, `@>` — that keep the work in the database where it belongs. The capstone trigger is the *promote* signal: a JSONB field that gains a query predicate becomes a hot column, which means it should be promoted to a real column.

**Ideal teaching artifact.** Two-beat concept. **Beat one — the trigger panel.** A small comparison panel: three shapes the student might use JSONB for, with a verdict on each. (1) Webhook payload from Stripe — yes, third-party owns the shape, JSONB. (2) User profile with name, email, settings — no, name and email are query targets, real columns; only settings might earn JSONB. (3) Custom form-builder field values — yes, the shape is per-form, no schema can describe it ahead of time. The verdict-per-shape pattern installs the trigger.

**Beat two — the read shape and the promote signal.** A worked `events` table with `payload: jsonb('payload').$type<WebhookEvent>().notNull()`. Three reads side by side: whole-column (`select payload`, returns the typed object), nested field via `->>` (`sql\`${events.payload}->>'eventType'\``, returns text), containment query (`where(sql\`${events.payload} @> ${{ status: 'paid' }}::jsonb\`)`). The promote signal lands at the end: the moment a JSONB field gets a regular `where` predicate against it, that field should be promoted to a real column with an index — `eventType` in the worked example crosses that line and earns its own column.

**Engagement.** A `Buckets` sort for beat one: eight column-facts dropped into "JSONB", "real column", or "JSONB now, promote later." Then a `DrizzleCoding` for beat two: the student writes the containment query that returns events whose payload matches `{ status: 'paid' }`. The grader runs against a fixture.

**Components.**
- `Figure` wrapping a hand-coded HTML table for the trigger panel (three rows, three columns: shape, verdict, reason).
- `Buckets` for the JSONB-vs-real-column sort.
- `CodeVariants` with three tabs (whole-column, `->>`, `@>`) for the read operators.
- `DrizzleCoding` for the containment query exercise.
- `Aside` (`note`) below beat two: "if a JSONB field gains a `where`, it earns a real column."

**Project link.** Project 6.6 doesn't use JSONB in scope; the pattern lands so the audit-log table in Unit 17 and the webhook tables in Unit 12 reach for the right shape.

---

## Concept 22 — `sql\`\`` is the safe escape hatch; `sql.raw` is the unsafe one

**Why it's hard.** The student lands at the chapter's last lesson with a builder that solves 95% of queries and a `sql\`\`` template that solves the rest, and needs to leave with two things straight: (1) the `sql\`\`` template *preserves* parameterization — values become `$1` placeholders, identifiers become quoted names; (2) `sql.raw` *drops* parameterization — the input becomes part of the SQL string verbatim, and the only legitimate use is fixed-string identifier interpolation from a controlled allow-list. Conflate the two and you ship injection.

**Ideal teaching artifact.** Decision archetype delivered as a **safety-versus-expressiveness ladder**. Four rungs from safest to most dangerous: (1) builder helpers (`eq`, `inArray`, etc.) — typed, parameterized, ergonomic; (2) `sql\`\`` template inside the builder (`where(sql\`${col} > ${val}\`)`) — parameterized, integrates with builder types; (3) `db.execute(sql\`...\`)` — parameterized, but the return shape is `unknown` and you've left the typed builder; (4) `sql.raw(input)` — *unparameterized*, the input becomes SQL verbatim, only legitimate for fixed-string identifiers. Each rung carries one example and one trigger. Below the ladder, the senior reflex: most days you stay on rungs 1 and 2; rung 3 is for maintenance scripts and migrations; rung 4 needs a code-review challenge ("where did this string come from?") every time it appears.

**Engagement.** A `Buckets` sort: eight call-site sketches dropped into one of the four rungs. Includes traps: `db.execute(\`select ... ${input}\`)` (no `sql` tag — drops parameterization, belongs in rung 4 / "wrong"); `sql.raw(allowedColumnName)` from a `as const` allow-list (rung 4, legitimate); `sql\`select * from ${tableName}\`` where `tableName` is a Drizzle table object (rung 2 — table is interpolated as identifier, safe).

**Components.**
- `Figure` wrapping a hand SVG of the four-rung ladder, each rung carrying a one-line example and a one-line trigger.
- `Buckets` for the rung-classification sort.
- `Aside` (`caution`) below: "if `sql.raw` appears in a code review, the reviewer's first question is *where did this string come from?*"

**Project link.** Project 6.6 has zero `sql.raw` usages by design; the student should be able to defend that absence as the senior default, not a missing feature.

---

## Component proposals

- **`OffsetVsCursorSim`** — interactive offset-pagination failure-mode simulator. Props: `mode` (`"deep"` | `"moving"` — toggleable inside the widget), `rowCount` (default 100, slider 10 → 1,000,000 in `"deep"` mode), `pageSize` (default 3). Renders a row list, a current-page indicator, a "next page" button, an optional row-count slider, an optional "insert row at top" button (in `"moving"` mode), and a scan-cost meter that grows with offset. Pure client state.
  - **Uses in this chapter** — Concept 15.
  - **Forward-links** — revisited in Chapter 11.1 (production list patterns) when cursor pagination ships at scale; potentially in Chapter 15.2 (caching) when stale-list invalidation interacts with the moving-data failure. Two credible re-use points; clears the single-use bar.
  - **Leanest v1** — drop the `"moving"` mode. The deep-page cost-curve is the single most load-bearing reveal (it converts "offset is fine" into "offset costs O(offset)"); the moving-data failure can ship as a static `Figure` with two row-list snapshots before/after insert. Build the deep-cost simulator first; escalate to dual-mode if the moving-data static doesn't carry.

- **`RoundTripTrace`** — round-trip visualization for read-shape comparisons. Props: `traces` (array of `{ label, queries: { sql: string, latencyMs?: number }[] }`), optional `parentCount` to scale N visually, optional `roundTripBadge`. Renders two stacked-column traces side by side, each query as a labeled bar, with a round-trip-count badge at the bottom. No live timing — it's a teaching diagram, not a profiler.
  - **Uses in this chapter** — Concept 9.
  - **Forward-links** — re-used in Chapter 6.4.2 (N+1 at depth) where the trace shape is the canonical illustration of the problem and the structural fix; potentially in Chapter 15.2 (caching) when comparing cold-cache and warm-cache round-trips; potentially in Chapter 16.2 (TanStack Query) for client-side request deduplication. Three credible re-use points; clears the bar comfortably.
  - **Leanest v1** — render two static SVG traces (no animation, no scaling, no `parentCount` slider) with hardcoded query bars and a round-trip-count badge. The visible asymmetry (51 bars vs. 1 bar) carries the lesson; everything else is polish.

No other new components proposed. Concepts 1, 5, 6, 7, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22 each reach a strong fit with `Figure` + hand SVG, `AnnotatedCode`, `CodeVariants`, `TabbedContent`, and the existing exercise components. Concepts 2 and 4 use `CodeVariants` plus `Buckets`/`DrizzleCoding`; Concept 3 uses `PredictOutput` + `CodeReview`. The bespoke proposals are reserved for the two concepts where existing components genuinely cannot carry the kinetic reveal (`OffsetVsCursorSim`) or the structural cost comparison (`RoundTripTrace`).

## Build priority

`OffsetVsCursorSim` is the higher-leverage build. The deep-page cost reveal is the load-bearing teaching moment that motivates *every* later cursor-paginated list in the course (Units 11, 13, 16, 18) — the student has to *feel* the offset cost grow before cursor pagination earns its weight as the default. Build the lean v1 first (deep-page mode only); the moving-data failure can ship as a static figure unless playtesting shows otherwise.

`RoundTripTrace` is the second priority. It carries Concept 9 in this chapter and it's the canonical illustration in Chapter 6.4.2 (N+1 at depth), so the build cost amortizes across two chapters in the same unit. The lean v1 (two static traces with hardcoded bars) is dramatically cheaper than the full prop-driven version and almost certainly enough — escalate only if 6.4.2's later use needs the parent-count scaling or the trace count to grow dynamically.

Both proposals follow the same rule the chapter teaches: ship the smallest shape that does the work, escalate when the next reader's signal demands it.

## Open pedagogical questions

- Concept 12's race-window timeline could ride on `DiagramSequence` (two-lane scrubbable timeline) or a hand SVG. The scrub is structurally the right form because the *interleaving order* is the lesson, but `DiagramSequence`'s slot model may not naturally express two parallel lanes — confirm whether the existing component can carry two parallel rows per step or whether the hand SVG with sequential ticks is the right call.
- Concept 17's tenant-scoping recall ("`organizationId` in the cursor is a leak vector") may merit a stronger artifact than a `MultipleChoice` if the leak vector turns out to be a recurring teaching beat in Chapter 10's tenancy lessons. If 10.x carries the same concept at depth, the cursor-leak example might be the right place to introduce the *concept* of "request-context inputs vs. client-controlled inputs" with an artifact reusable in Unit 10.
- Concept 21's beat-one trigger panel ("JSONB vs. real column vs. promote later") is the same structural shape as 6.2.4's per-column-type triage and 6.1.1's denormalization triage. If the course settles on a "verdict panel" or "scenario round" wrapper, this is the third candidate for it.
