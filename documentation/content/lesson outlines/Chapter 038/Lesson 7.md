# Lesson 7 — Subqueries and CTEs

- **Title (h1):** Subqueries and CTEs
- **Sidebar label:** Subqueries & CTEs

---

## Lesson framing

This is a **where-does-the-logic-live** lesson, not a syntax tour.
By now (L1–L6) the student can write single-pass reads, joins, nested reads, aggregates, upserts, and paginated lists.
This lesson is the first time a query needs **two passes**: filter-then-group, rank-then-take-top-per-group, or reuse one sub-result in several places.
The senior question is the decision, not the keyword: *when a query needs an intermediate result, does it belong in app code, in an inline subquery, or in a named CTE?*

**The spine (state it in the intro, reference it in every section):** "name the intermediate result only when naming earns its keep."
Three placements, ranked by reach:
1. **Inline subquery** — the intermediate is referenced once and the query reads better with it inline (`inArray`, `exists`, a scalar in a comparison, a derived table in `from`).
2. **CTE (`WITH`)** — the intermediate is referenced more than once, *or* naming it makes a layered query readable top-to-bottom.
3. **App code (two queries)** — the intermediate is small, the round-trip is cheap, and two short queries read straighter than one clever one.

The fourth shape is specialized, not a fourth tier: **`exists` / `notExists`** answer an *existence* question ("does a related row exist?") and short-circuit — the senior reach over the L4 join-plus-group when the answer is yes/no, not a count.

**Cost framing carries the readability call.** The lesson's recurring honesty: Postgres' planner usually produces the *same plan* for an inline subquery and an equivalent single-reference CTE (CTEs referenced once are inlined since PG 12), so the choice is overwhelmingly about the human reading it. The two places cost *does* decide: a **correlated** subquery re-runs per outer row (fine on small outer sets, a trap on large ones — the EXPLAIN proof is deferred to Ch 039 L3), and `inArray(subquery)` returning thousands of ids loses to a join. Performance is named only where a *wrong shape* is the issue; *measuring* it is Ch 039's job — say so explicitly so the student doesn't expect benchmarks here.

**Drizzle reality check (research-confirmed, diverges from the chapter outline — flag for downstream agents):**
- CTEs: `db.$with('name').as(<select>)` then `db.with(name).select()...`. Correct.
- Derived table in `from`: `<select>.as('alias')`, columns read as `alias.column`. Correct.
- `exists` / `notExists`: imported from `drizzle-orm`, wrap a `db.select()` subquery. Confirmed exported (they're in the DrizzleCoding global set).
- **Recursive CTEs: there is NO `db.$withRecursive`.** The chapter outline names it; it does not exist in the 0.45/1.0 line (PR open, unmerged as of mid-2026). Teach `WITH RECURSIVE` as **named-for-recognition only, written via raw `sql\`\``** — one short paragraph, no builder call. Do not ship a `$withRecursive(...)` example; it would not compile.
- **Window functions have no dedicated helper** — `row_number()`, `rank()`, `partition by` are written inside `sql\`\`` (typed with `sql<number>` when consumed). This is the L10 escape hatch arriving early; lean on L4's "parameterization still holds inside `sql\`\``" reassurance and the L4 `sql<T>`-is-a-claim note rather than re-teaching them.

**Teaching shape:** lead each placement with the problem that forces it, show the Drizzle call, then the decision rule. The capstone ("top 3 tags per org") is the synthesis — a CTE feeding a window function feeding an outer rank filter — and should land *after* the three placements and `exists` are individually understood, so it reads as assembly, not novelty. Keep money as `string` (`amountDue`, `numeric`→`string`), org-scope every `where` by hand (no `tenantDb` yet), and reuse the running domain (`invoices`, `organizations`, `tags`, `invoiceTags`, `invoiceLineItems`).

Cognitive-load order: app-code baseline → inline subquery → `exists` → derived table → CTE → window-function-in-CTE capstone → recursive (named) → decision recap. Each step adds exactly one new idea on top of a shape the student already owns from L1–L4.

---

## Lesson sections

### Introduction (no header)

State the lesson's job: the first queries that need an intermediate result, and the senior call about where that result lives.
Open with a concrete forcing problem in the running domain — e.g. "list the organizations that have at least one overdue invoice" (an existence question) and "rank each org's top three tags" (a two-pass rank) — two reads the student *cannot* yet write with L1–L6 tools.
Connect to what they know: this is still `db.select` (L1) and joins (L2) and aggregates (L4); the new move is composing one query out of another.
Preview the practical skill: by the end, pick inline-subquery vs CTE vs app-code on real criteria, write each in Drizzle, use `exists` for the existence question, and assemble a CTE-plus-window-function report.
State the spine ("name the intermediate result only when naming earns its keep") and the three placements before any code.
Warm, brief, terse-adult per the guidelines. Render `<CourseProgressBar value={frontmatter['course-progress']} />` first, matching sibling lessons.

### The intermediate result, and where it can live

**Goal:** install the mental model before any Drizzle syntax — that a "two-pass" query has an intermediate result, and that result can physically live in one of three places, each with a readability/cost profile.

Content:
- Define the shape: a query whose answer depends on a *prior* computed set of rows/values. Concrete example walked in prose: "invoices belonging to orgs on a paid plan" — you need the set of paid-plan org ids first, then the invoices.
- Lay out the three placements as a ranked default, tying each to the criterion that selects it (referenced-once-and-reads-better → inline; referenced-many-or-needs-a-name → CTE; small-and-reads-straighter → app code). This is the spine; everything downstream is an instance of it.
- The honesty up front: for a sub-result referenced **once**, an inline subquery and a CTE usually compile to the **same plan** (PG 12+ inlines single-reference, side-effect-free, non-recursive CTEs), so readability is the deciding factor, not speed. State this as the load-bearing fact that keeps the student from cargo-culting CTEs.

**Diagram — `Figure` wrapping hand-coded HTML+CSS (`where-the-result-lives`).** Pedagogical goal: make "same intermediate result, three homes" visible before syntax. Horizontal three-panel strip, capped ~360px tall. Center concept: one small "intermediate result" chip (e.g. a tiny 3-row mini-table "paid-plan org ids"). Three panels each show that same chip placed differently: (1) **App code** — chip sits between two stacked query boxes (`query 1 → ids → query 2`), labeled "two round-trips, reads straight"; (2) **Inline subquery** — chip nested *inside* a single query box's `where`, labeled "one statement, referenced once"; (3) **CTE** — chip named (`WITH recent AS …`) at the *top* of a single query box with an arrow down into the main `select`, labeled "named, reusable". Use the established Figure HTML+CSS style from sibling lessons (status-pill / mini-table vocabulary). This is the picture every later section points back to.

`Term` candidates here: `subquery` (a SELECT nested inside another statement), `common table expression (CTE)` (a named subquery introduced with `WITH`, referenced by the main query), `derived table` (a subquery used in the `FROM` clause as if it were a table). Define on first use.

### Inline subqueries in `where`

**Goal:** the most common and lowest-ceremony shape — a `db.select` nested inside a `where`, referenced once.

Content:
- The `inArray(col, subquery)` shape: "rows whose id is in this set." Worked example: invoices whose `organizationId` is in the set of orgs matching some condition. Show the subquery is itself a `db.select({ id: ... }).from(...)` — Drizzle types the projection so the outer `where` knows the column.
- The scalar-comparison shape: `gt(col, sq)` / `lt(col, sq)` where the subquery returns a single value (e.g. "invoices above the org's average amount"). Name that a single-column single-row subquery acts as a scalar.
- Parameterization reassurance (reuse L1/L4 verbatim mental model): values inside the subquery are still `$1` placeholders; nesting a `select` opens no injection door. One sentence, not a re-teach.
- The decision rule restated: inline when referenced once and the sentence "rows whose X is in (this set)" reads cleanly inline. The moment you'd have to read the subquery *twice* to follow the query, that's the CTE signal (forward-pointer to the CTE section).
- The cost watch-out, scoped honestly: `inArray` with a subquery returning **thousands** of ids is slower than the equivalent join — the shape should match the data size; *proving* it is Ch 039 L3. Name it, don't benchmark it.

**Component — `AnnotatedCode` (`inline-subquery-walkthrough`), color blue.** One `ts` block (≤14 lines): a `db.select().from(invoices).where(inArray(invoices.organizationId, db.select({ id: organizations.id }).from(organizations).where(...)))`. Steps: (1) the outer read and its `where`; (2) the nested `db.select({ id })` — "this is a complete query, used as a value"; (3) `inArray` consuming it — "rows whose org id is in that set"; (4) the projection inside the subquery narrows what the outer query compares against. Direct attention to the boundary between outer and inner query, which is where beginners lose the thread.

### Asking whether a related row exists

**Goal:** the existence question as a first-class, short-circuiting shape — and why it beats the L4 join-plus-group when the answer is yes/no.

Content:
- The forcing problem from the intro: "organizations that have at least one overdue invoice." With L4 tools the student would `innerJoin` + `groupBy` + `having count > 0` — correct but wasteful, and it inflates rows before collapsing them.
- `exists(subquery)` and `notExists(subquery)` (imported from `drizzle-orm`): the subquery is **correlated** — it references the outer row (`eq(invoices.organizationId, organizations.id)`). Postgres stops at the **first** matching row, so it's the fastest way to ask the existence question. Worked example: orgs with `exists(...)`, then the symmetric `notExists(...)` for "orgs with no invoices at all."
- Define **correlated subquery** as a `Term`: a subquery that references a column from the outer query, so it conceptually re-runs per outer row. This is the lever for the cost note.
- Cost honesty (the one real trap, deferred for proof): because it's per-outer-row, `exists` is excellent on small/medium outer sets and can get expensive on very large ones — the EXPLAIN that shows the per-row cost is Ch 039 L3. Frame `exists` as the *default* for existence-yes/no; reach for a join only when you also need the matched data.
- Tie back to the relational API (L3): the RQB can filter parents by a related-row predicate too (the existence-filter position from L3); `db.select(...).where(exists(...))` is the SQL-builder form for when the predicate gets gnarly or spans tables irregularly. One sentence — the L3 forward-pointer is being cashed here.

**Component — `CodeVariants` (`exists-vs-join-count`).** Two tabs, same question ("orgs with at least one overdue invoice"), to make the senior preference legible:
- Tab "Join + group + having" — `innerJoin` → `groupBy(organizations.id)` → `having(gt(count(invoices.id), 0))`. First sentence: "Correct, but it builds every matched pair and then collapses them — work you don't need for a yes/no."
- Tab "`exists`" (preferred) — `db.select().from(organizations).where(exists(db.select().from(invoices).where(and(eq(invoices.organizationId, organizations.id), <overdue predicate>))))`. First sentence: "Asks the question directly and stops at the first hit." Use `data-mark-color="green"` on this pane.

### Subqueries in `from` — the derived table

**Goal:** when the intermediate is a *set of rows* (often aggregated or windowed) that the main query needs to join against, name it with `.as('alias')` and select from it.

Content:
- The forcing problem: you've aggregated something (per-org invoice totals, L4) and now need to join that aggregate back to another table (e.g. join per-org totals to `organizations` to attach the org name, or filter the aggregate). You can't put an aggregate directly in a `where`; you make it a derived table.
- The shape: `const orgTotals = db.select({ orgId: invoices.organizationId, total: sum(invoices.amountDue) }).from(invoices).groupBy(invoices.organizationId).as('org_totals')`, then `db.select({...}).from(orgTotals).innerJoin(organizations, eq(orgTotals.orgId, organizations.id))`. Columns are referenced through the alias (`orgTotals.total`).
- The senior trigger: reach for a derived table when an **aggregated or windowed** sub-result needs to participate in a join or an outer filter — that's the case a plain `where` subquery can't express.
- Bridge to CTE: a derived table used **once** and a CTE are interchangeable in plan; if the same derived set is needed **twice**, or the `from` clause is getting hard to read top-down, promote it to a named CTE (forward-pointer to the next section).

**Component — `Code` (single `ts` block).** A derived table is a smaller idea than the inline subquery; one clean annotated-by-comment block suffices (reserve `AnnotatedCode` budget for the inline subquery and the capstone). Keep money as `sum(...)` → string; note the `numeric`→`string` reflex inline.

### Naming the result with a CTE

**Goal:** `WITH` as the readability tool — name an intermediate result, reference it (once or many), read the query top-to-bottom.

Content:
- The Drizzle shape, exact: `const recentInvoices = db.$with('recent_invoices').as(db.select({...}).from(invoices).where(...))` then `db.with(recentInvoices).select({...}).from(recentInvoices).innerJoin(...)`. Walk the two halves: `$with(name).as(query)` *defines* the CTE; `db.with(cte)` makes it available to the main statement; the CTE is referenced by its variable like a table.
- Multiple CTEs chain: `db.with(cteA, cteB).select()...` — name as many intermediates as the query needs; each can reference earlier ones. Keep this to a mention plus one small illustration; the capstone shows a real two-stage chain.
- The decision rule, sharpened (this is the section that owns the spine's payoff): **reach for a CTE when (a) the sub-result is referenced more than once, or (b) naming it turns a nested, inside-out query into a top-to-bottom read.** Do *not* reach for a CTE to "look professional" — a CTE nobody needs is a worse read than the inline subquery it replaced.
- The materialization nuance, accurate (research-corrected): Postgres **inlines** a CTE that is non-recursive, side-effect-free, and **referenced once** (PG 12+), so a single-use CTE costs the same as the inline form — the choice there is purely readability. A CTE referenced **multiple times** is materialized once and reused, which is part of why naming a reused sub-result is a genuine win, not just cosmetic. `WITH ... AS MATERIALIZED` forces materialization and blocks the planner's inlining — a power tool used only when a measurement (Ch 039 L3) justifies it; name it, don't drill it.

**Component — `CodeVariants` (`inline-vs-cte`), shared `syncKey` optional.** Same logical query expressed two ways to make the readability call concrete:
- Tab "Inline subquery" — the sub-result written inline, getting visibly nested/hard to scan when referenced twice (repeat the subquery in two spots to show the duplication pain).
- Tab "CTE" — the same sub-result named once with `$with`, referenced twice cleanly. First sentence names the trigger: "Referenced twice — naming it removes the duplication and reads top-down."

`Term`: `materialized` (Postgres computes the CTE's rows once and stores them for the statement, rather than inlining the query). Define on first use in the materialization paragraph.

### Window functions: ranking within groups

**Goal:** the one SQL feature this lesson needs that has no Drizzle builder — `row_number() over (partition by …)` — introduced *as* the engine for "top N per group," written inside `sql\`\``.

Content:
- The forcing problem: "top three tags per organization by invoice count." `groupBy` (L4) collapses to one row per group — it can't keep three. A window function computes a value (here, a rank) *per row* while still seeing the whole partition. State the contrast crisply: **`groupBy` collapses; a window function annotates each row without collapsing.**
- The shape, written in `sql\`\``: `sql<number>\`row_number() over (partition by ${col} order by ${rankExpr} desc)\``.aspect — explain `partition by` = "restart the numbering per group," `order by` inside the window = "what determines the rank." Reuse L4's two reassurances verbatim-in-spirit: parameterization holds inside `sql\`\``, and `sql<number>` is a TS-side **claim** (like `as`), not a checked type — keep it honest.
- Name the family for recognition only — `rank()`, `dense_rank()`, `lag()`, `lead()`, `sum() over (...)` — one line, no enumeration, no per-function examples. The course shows the *shape*; Ch 038 does not turn into a window-function reference.
- This section is the on-ramp to the capstone; keep it tight (the capstone is where it pays off). Do **not** over-explain frames/`ROWS BETWEEN` — out of scope, name nothing the lesson won't use.

`Term`: `window function` (a function that computes a value across a set of rows related to the current row — the "window" — without collapsing them into one). Define here.

### Putting it together: top three tags per organization

**Goal:** the capstone synthesis — assemble CTE + window function + outer rank filter into one real report, demonstrating that the three placements are composable, not competing.

Content:
- Build it in stages (this is the section's pedagogical heart — show the assembly, not the finished blob):
  1. **Stage 1 CTE** — `tag_counts`: per-(org, tag) invoice count. A `db.select` over `invoices → invoiceTags → tags` (two joins from L2, the many-to-many shape) with `groupBy(org, tag)` and `count(invoices.id)`. Named via `$with('tag_counts')`.
  2. **Stage 2 CTE** — `ranked`: select from `tag_counts`, adding `row_number() over (partition by org order by count desc)` as `rank` via `sql\`\``. Named via `$with('ranked')`, referencing `tag_counts`.
  3. **Final select** — `db.with(tagCounts, ranked).select().from(ranked).where(lte(ranked.rank, 3))` — keep only ranks 1–3 per org.
- Explain *why* this needs both a CTE and a window function: the rank has to exist as a column before you can filter on it, and `where` can't reference a window function directly (SQL evaluates windows after `where`) — so you compute the rank in one layer and filter it in the next. This is the canonical "why CTEs + windows travel together" lesson; state it plainly.
- Reuse domain types: result rows are org id, tag name, count, rank — all inferred, no hand-typed interface (reuse L3/L4's "the type follows the projection / derive don't declare" reflex).
- Tiebreaker honesty: ties in `count` make `row_number` pick an arbitrary winner; add a stable tiebreaker to the window `order by` (e.g. `tags.id`) for deterministic ranks — the same tiebreaker reflex from L1/L6, now inside a window.

**Component — `AnnotatedCode` (`top-tags-capstone`), `maxLines={18}`, color violet (or stage-colored steps).** The full three-stage query as one block, stepped: (1) `tag_counts` CTE definition — the count per org+tag; (2) the `row_number() over (partition by ...)` line — "rank within each org"; (3) `ranked` CTE wrapping it; (4) `db.with(...)` wiring both CTEs in; (5) the outer `where(lte(rank, 3))` — "keep the top three." This is the lesson's most complex block; `AnnotatedCode` is the right tool to walk it one stage at a time. If 18 lines is tight, split the CTE definitions and the final select into two adjacent blocks rather than exceeding the cap.

**Exercise — `DrizzleCoding` (`top-n-per-group`), the load-bearing assessment.** Student writes (or completes) a "top 2 tags per org by invoice count" query using a CTE + `row_number()`.
- *Mechanics:* starter provides the schema panel and a scaffold with the `tag_counts` CTE written and the window/outer-filter left to finish (don't make them author all three stages cold — grade the rank-and-filter insight, the lesson's actual payload).
- *Grading:* `expectedRows` pinned to a small deterministic seed; `ordered: true` (the query has an `orderBy`). The graded trap: a naive solution that `groupBy`s and takes the max tag (one per org) returns too few rows / wrong shape; only the window-ranked version yields exactly the top-2-per-org set.
- **PGlite staging caveats (carry L1–L6 rules, plus a window-function/CTE verification):** integer PKs with explicit seeded ids, snake_case column-name strings, money-as-`numeric`→string, no `casing` client, no `uuidv7()`. **Verify before shipping that PGlite supports (a) `db.$with`/`db.with` CTE compilation and (b) `row_number() over (...)` inside `sql\`\`` against the generated DDL.** If `db.$with` does not resolve in the widget's Drizzle build, fall back to a **`SQLCoding`** card (raw SQL `WITH ... SELECT ... WHERE rank <= 2`) testing the identical CTE+window skill — PGlite is full Postgres, so raw SQL will run even if the Drizzle CTE builder is unavailable in-sandbox. Confirm in the continuity notes which form shipped.
- *Seed design:* one org or two small orgs; 3–4 tags; invoice→tag rows arranged so the per-org tag counts have a clear top-2 and at least one **tie** that the `tags.id` tiebreaker resolves deterministically (mirror the L6 tied-row discipline so the assessment actually tests the tiebreaker).

### Recursive queries, named for recognition

**Goal:** close the "what about hierarchies?" loop honestly — name `WITH RECURSIVE`, set the expectation that it exists and where it's used, and tell the truth that Drizzle's builder doesn't cover it.

Content:
- One short paragraph: `WITH RECURSIVE` walks self-referential trees — org charts, threaded comments, category hierarchies — by repeatedly joining a query to its own prior results until no new rows appear (a **base case** plus a **recursive step**).
- The Drizzle reality (research-confirmed, the correction): there is **no `db.$withRecursive`** in the version line this course teaches — a recursive CTE is written as raw `sql\`\`` and run via `db.execute(...)` (the L10 escape hatch, named here). Do **not** show a `$withRecursive(...)` call; it does not exist and would mislead.
- The senior framing: deep tree recursion is rare in early SaaS; when it appears, it's a raw-SQL `WITH RECURSIVE` with a guaranteed **termination** (the base case plus a depth guard) — an unterminated recursive CTE loops until it hits a row cap. Name the watch-out; don't drill the syntax.
- Keep this section to ~3–4 sentences. It's a recognition beat, not a teaching beat — its job is to prevent the student from hunting for a Drizzle method that isn't there, and to flag the termination trap for the day they need it.

`Term`: `recursive CTE` (a CTE that references itself, used to walk hierarchical/tree data via a base case and a repeating step).

### Choosing the shape

**Goal:** consolidate the decision into a reusable senior reflex the student can apply on the next two-pass query — and reinforce that this was a *decision* lesson.

Content:
- Recap the spine as a short decision ladder: existence yes/no → `exists`/`notExists`; referenced once and reads better inline → inline subquery / derived table; referenced many or needs a name to be readable → CTE; small result and two queries read straighter → app code. Rank > "ranks per group" → CTE + window function. Hierarchy → raw `WITH RECURSIVE` (rare).
- The senior closing principle (reuse the chapter's voice): "a CTE that nobody reads is a worse outcome than two queries that read straight" — layer in SQL when the intermediate is large enough that round-tripping it through TS costs latency, *not* to look clever. Readability first; reach for SQL layering when the data size makes the round-trip the real cost.
- Forward-pointer, explicit and bounded: this lesson owns *correct and readable* layering; **whether** a correlated subquery or a deep CTE is actually fast is an `EXPLAIN ANALYZE` question owned by **Ch 039 L3**, and indexing the columns these queries lean on is **Ch 039 L1**. Say it in one sentence so the student knows the performance chapter is where "is this fast?" gets answered.

**Exercise — `Buckets` (`pick-the-shape`), `twoCol`.** Classification drill cementing the decision ladder. Buckets: "Inline subquery / `exists`", "CTE", "App code (two queries)". Items are short query *situations* (not code), e.g.:
- "Filter parents by whether any child row exists" → exists bucket
- "The same per-org total is needed in three places in one query" → CTE
- "Rank rows and keep the top N per group" → CTE
- "Fetch ~10 ids, then fetch those 10 rows; both reads are tiny" → app-code
- "Keep invoices whose org is in a small computed set, referenced once" → inline
- "A clever single query nobody on the team can read at a glance" → app-code (the senior gotcha — the readability trap)
Place this in this section (not at lesson end) so the recap and the check sit together.

### External resources (optional, end of lesson)

A small `CardGrid` of `ExternalResource` cards, matching sibling lessons' close:
- Drizzle docs — Select / `with` clause (CTEs and subqueries).
- Drizzle docs — Magic `sql` operator (window functions, raw fragments).
- Optionally a Postgres docs link on `WITH` / `WITH RECURSIVE` for the student who wants the hierarchy depth.
Keep to 2–3 cards; these are the load-bearing references for the APIs the lesson can't fully enumerate.

---

## Scope

**Prerequisites to restate briefly (one line each, do not re-teach):**
- `db.select` projection narrows the return type ("type follows the projection", L1).
- Joins and the many-to-many-through-junction shape (`invoices → invoiceTags → tags`), L2 — the capstone reuses it.
- Aggregates (`count`, `sum`, `groupBy`, `having`) and the `numeric`→`string` money reflex, L4 — the existence section contrasts with join+group, the capstone counts per group.
- The relational API's existence-filter position (parent-by-child), L3 — `exists` is the SQL-builder form; one-sentence callback.
- The tiebreaker reflex (pair a non-unique sort with the PK for determinism), L1/L6 — reused inside the window `order by`.
- Parameterization holds inside `sql\`\`` and `sql<T>` is a TS claim not a check, L4 — reused for window functions; do not re-derive.

**Out of scope — hand forward, do not teach here:**
- `EXPLAIN ANALYZE` / plan inspection for correlated subqueries and layered queries → **Ch 039 L3**. This lesson names *where* cost lives; it does not measure it. Be explicit that benchmarks are not in this lesson.
- Indexing the columns subqueries/CTEs/window-orderings depend on → **Ch 039 L1**.
- The N+1 problem and spotting it in code that bypasses the relational API → **Ch 039 L2** (the app-code-vs-SQL-layering call here is about readability/round-trip cost, not N+1).
- Aggregations as the primary topic (helpers, `having`, filtered aggregates, `distinctOn`) → already taught in **L4**; reuse, don't re-explain.
- The raw `sql\`\`` escape hatch *at depth* (`sql.raw`, `db.execute` shapes, `sql.identifier`, typing rules) → **L10**. This lesson uses `sql\`\`` only for window functions and the named recursive-CTE mention, leaning on L4's reassurances.
- Window functions enumerated (`lag`/`lead`/frames/`ROWS BETWEEN`/`sum() over`) → named for recognition only; the course teaches the `row_number()` shape, not a window-function catalog.
- Materialized **views** as cross-query caches → out of scope for the chapter entirely (don't introduce; only `WITH ... AS MATERIALIZED` is named, and only as a power-tool caveat).
- Recursive CTE syntax drilled / any `$withRecursive` builder call → **named for recognition only**; the builder method does not exist, and depth is out of scope.
- Transactions wrapping multi-statement work → **Ch 039 L4** (not relevant here; every query in this lesson is a single statement).

---

## Notes for downstream agents

- **Convention divergence from the chapter outline (must honor):** the outline names `db.$withRecursive(...)` and treats it as a real builder. It is **not** — recursive CTEs go through raw `sql\`\``. Do not normalize back to a `$withRecursive` call. (Surfaced for the maintainer like the L3 v1/v2 divergence note.)
- **Materialization claim — use the precise version:** PG inlines a CTE only when it's non-recursive, side-effect-free, **and referenced once** (PG 12+). A CTE referenced more than once stays materialized by default. The outline's looser phrasing ("inlines simple CTEs unless MATERIALIZED is forced") should be tightened to the referenced-once rule.
- Keep the lesson **version-neutral** where possible: `db.$with`/`db.with`, `.as()`, `exists`/`notExists`, `inArray`, and `sql\`\`` window functions are stable across the 0.45 → 1.0 line (no v1/v2 RQB split applies — these are SQL-builder APIs, unlike L3's `db.query`). No `relations()`/`defineRelations` needed.
- Reuse the established **spine-mental-model + forcing-problem** lesson rhythm from L4/L6 (state the one-sentence model in the intro, reference it per section). Match the warm-but-terse intro voice and the `<CourseProgressBar>`-first frontmatter/import block of sibling MDX files.
