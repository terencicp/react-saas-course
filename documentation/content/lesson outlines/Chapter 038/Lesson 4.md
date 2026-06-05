# Aggregations and grouping

- **Title (h1):** Aggregations and grouping
- **Sidebar label:** Aggregations & grouping

---

## Lesson framing

This lesson answers one senior question: **when the answer the UI needs is a number per group — invoices per org, revenue per month, top tags by usage — what does the query shape look like?**
It's the lesson that produces every dashboard tile and reporting read later in the course.

Pedagogical spine — **"collapse, then filter the collapse."**
An aggregate query collapses many rows into one number; `groupBy` says *what to collapse within*; `where` filters rows *before* the collapse; `having` filters the collapsed groups *after*.
Every concept in the lesson hangs off this one mental model. Introduce it with a tiny concrete visual (rows folding into per-group rows) before any helper API, so the API reads as labels on a model the student already pictures.

Why this framing and not "here are the eight aggregate functions": the helpers (`count`, `sum`, …) are trivial — a junior who's seen SQL knows them. The two things that genuinely trip people are (1) the **`groupBy`-completeness rule** (every non-aggregated selected column must be grouped, Postgres rejects otherwise) and (2) the **`where` vs `having` timing** distinction. The lesson spends its weight there.

Build complexity in one direction, never branching:
1. one number over a whole table (`count()` alone, no group) — the simplest possible aggregate,
2. one number *per group* (add `groupBy`),
3. group over a join (group by the FK side, the join-inflation trap),
4. filter the groups (`having`),
5. several conditional numbers in one pass (`FILTER (WHERE …)`),
6. the "first row per group" idiom (`distinctOn`) — adjacent, named, not over-invested.

Senior-mindset threads to keep live throughout (these are the durable takeaways, the syntax is commodity):
- **`sum`/`avg` over `numeric` return `string`, not `number`** — this is the single highest-value watch-out in the lesson because it silently produces `"NaN"` or string concatenation in a dashboard. Tie it back hard to the Ch 037 "money is `numeric`→`string` end-to-end, never `parseFloat`" reflex the student already owns. `count` returns `number` — the asymmetry is the point.
- **`sum` over zero rows returns `null`, not `0`** — the empty-state bug that ships to the first customer with no data. `coalesce(sum(...), 0)` or handle the absent case in app code.
- **Aggregates are still `db.select` (the SQL builder), not the relational query API** — reinforce L3's "describe the tree → RQB; compute over rows → SQL builder" boundary. This is *the* lesson the L2/L3 forward-pointers were aiming at; close the loop explicitly.
- **The result type still follows the projection** — `db.select({ count: count() })` infers `{ count: number }[]`; the TS key names the aggregate. Reuse the L1 "type follows the projection" slogan verbatim.

Format mix: this is a query-shape lesson, so **runnable code + one DrizzleCoding exercise** carry the load, not diagrams. One small HTML/CSS "fold" figure for the core model is worth it; everything else is code the student can read and one place they write it. Keep total to 40–50 min.

Schema reuse (Ch 037, **never redeclare** — reference only): `invoices` (`id`, `amountDue` `numeric(12,2)`→string, `status` enum `draft|sent|paid|void`, `dueDate`, `createdAt`, `organizationId` FK, `assignedToId` nullable FK), `organizations` (`id`, `name`), `users`, `invoiceLineItems` (`invoiceId`, `quantity`), `tags` (`id`, `name`), `invoiceTags` junction. Inferred types `Invoice`/`Organization` reused. `amountDue` is the canonical money column (continuity).

---

## Lesson sections

### Introduction (no header — Starlight lead paragraphs)

Open on the concrete problem: the org dashboard needs "23 invoices, $48,200 outstanding, broken down by status." A `db.select().from(invoices)` returns 23 rows; the UI needs the *numbers*, not the rows. That gap is what aggregation closes.
State the practical end-state: by the end the student writes per-org counts, monthly revenue, and top-tags-by-usage queries — the literal queries behind a dashboard.
Connect to prior knowledge: they already have `db.select`, `where`, `groupBy`-adjacent `orderBy`, and joins (L1, L2); aggregation is `db.select` with a different *projection* and one new clause (`groupBy`/`having`).
Name the API home up front in one line so the reader isn't hunting: aggregate helpers (`count`, `sum`, …) import from `drizzle-orm` alongside the operators they already use.

### Collapsing rows into one number

**Goal:** install the core mental model and the simplest aggregate before any grouping.

Lead with the **fold figure** (see below) so "aggregate = collapse many rows to one" is visual first.

Then the simplest shape — a single number over the whole (org-scoped) table:
```ts
const [{ total }] = await db
  .select({ total: count() })
  .from(invoices)
  .where(eq(invoices.organizationId, orgId));
```
Teach via this block:
- `count()` with no argument is `COUNT(*)` — counts rows. Returns `number` (Drizzle maps it for you; note in one clause that Postgres' `count` is `bigint`, Drizzle casts to JS `number` so the student never sees a string here — contrast deliberately with `sum`/`avg` two sections down).
- No `groupBy` ⇒ the whole filtered set collapses to **exactly one row** — hence the `const [{ total }]` single-row destructure (the L1 idiom, reused).
- The projection still drives the type: `{ total: count() }` ⇒ `{ total: number }[]`. Reuse "the type follows the projection" verbatim.

Then enumerate the helper set compactly (a plain markdown table, not a `Figure` — it's reference, not a concept):

| Helper | SQL | Returns in TS | Note |
| --- | --- | --- | --- |
| `count()` | `count(*)` | `number` | rows |
| `count(col)` | `count(col)` | `number` | non-null values of `col` |
| `countDistinct(col)` | `count(distinct col)` | `number` | distinct non-null |
| `sum(col)` | `sum(col)` | `string \| null` | `numeric` precision preserved |
| `sumDistinct(col)` | `sum(distinct col)` | `string \| null` | |
| `avg(col)` | `avg(col)` | `string \| null` | |
| `min(col)` / `max(col)` | `min`/`max` | column's type | preserves type |

All from `drizzle-orm`. Keep the `string`/`null` cells visually loud — they're the trap, flagged here and paid off below.

Surface the **`count(*)` vs `count(col)`** distinction inline (a one-liner, not a watch-out dump): `count(*)` counts rows, `count(col)` counts rows where `col` is non-null — they diverge on nullable columns (e.g. `count(invoices.assignedToId)` = assigned-invoice count, smaller than `count(*)`).

**Term tooltips:** `aggregate function`, `COUNT(*)` (the `*` doesn't mean "all columns" here — it means "every row").

### One number per group

**Goal:** add `groupBy`; land the completeness rule, the lesson's #1 error.

The shape:
```ts
const byStatus = await db
  .select({ status: invoices.status, total: count() })
  .from(invoices)
  .where(eq(invoices.organizationId, orgId))
  .groupBy(invoices.status);
// → { status: 'draft' | 'sent' | 'paid' | 'void'; total: number }[]
```
Use **`AnnotatedCode`** here — this is the first block with two interacting moving parts (the grouped key in the projection, and the same column in `groupBy`); stepping focuses attention:
1. `{status:…}` blue — the grouped key rides in the projection as a normal column; the result is now one row *per distinct status*, not one row total.
2. `count()` green — the aggregate computed *within each group*.
3. `.groupBy(invoices.status)` orange — names the buckets. **The rule:** every non-aggregated column in the selection (`status`) must appear here.

Then the **completeness rule** as its own beat — this is where students get the Postgres error and stall:
> Every selected column that *isn't* wrapped in an aggregate must appear in `groupBy`. Postgres rejects a violation at query time (Drizzle surfaces it at runtime, not compile time), with a message naming the offending column: `column "invoices.id" must appear in the GROUP BY clause or be used in an aggregate function`.

Show the broken variant so the student recognizes the error in the wild — **`CodeVariants`**, two tabs:
- ❌ selects `invoices.id` alongside `count()` with no `id` in `groupBy` → quote the exact Postgres error string.
- ✅ either drop `id` from the projection, or (if per-id rows are wanted) you don't want an aggregate at all.

Drive the timing intuition home with the fold figure's vocabulary: `where` ran *before* the fold (it's in the code above, filtering to one org), so the org filter is "free" — it reduced the rows that get folded.

**Watch-out (inline, tied to the model):** grouping by a high-cardinality column (e.g. `createdAt` raw) makes a group per distinct timestamp — almost one row per invoice, defeating the point. Group by a *bucket* (a status, a truncated month — next section's `date_trunc`), not a raw continuous value.

### Grouping across a join

**Goal:** the join-inflation trap — group by the FK/PK side, not the inflated row.

Motivate: "invoices per organization, with the org's name" needs a join (the name lives on `organizations`). But a join *multiplies* rows, and aggregating over the multiplied set is where counts go wrong.

The correct shape (per-org invoice count + outstanding total):
```ts
const perOrg = await db
  .select({
    orgId: organizations.id,
    orgName: organizations.name,
    invoiceCount: count(invoices.id),
    outstanding: sum(invoices.amountDue),
  })
  .from(organizations)
  .leftJoin(invoices, eq(invoices.organizationId, organizations.id))
  .groupBy(organizations.id, organizations.name);
```
Teach via this block:
- **Group by the org side** (`organizations.id`), not by anything on `invoices` — one row per org is the goal.
- Both `id` *and* `name` go in `groupBy` (completeness rule — both are selected, neither aggregated). Note the senior shorthand intuition: grouping by the PK already determines `name` functionally, but Postgres still requires `name` listed unless you group by the PK *and* Postgres' functional-dependency rule kicks in (it does when grouping by a PK) — **keep it simple for the student: list every non-aggregated column**. Mention the PK-functional-dependency shortcut in one sentence as a "you may see this work without `name`" aside, don't teach it as the pattern.
- **`leftJoin` deliberately**: an org with zero invoices still appears, with `invoiceCount: 0`. Tie to L2's left-join nullability — *but* here's the subtle, high-value beat:

**The left-join counting trap (the lesson's sharpest watch-out):** for an org with no invoices, the left join produces one row with `invoices.*` all `null`. `count(invoices.id)` correctly returns `0` (it counts non-null `id`s — zero of them). But `count(*)` would return `1` (one row exists, even though it's the all-null padding row). This is exactly why you write `count(invoices.id)`, not `count(*)`, when counting the right side of a left join. Make this concrete with a one-org-no-invoices example and the two numbers side by side.

**`sum` over the empty side:** that same zero-invoice org gets `outstanding: null` from `sum` (sum of no rows is `null`). Foreshadow the `coalesce` fix (next section closes it).

Use **`AnnotatedCode`** for this block — three things to isolate (the join, the FK-side group key, the `count(invoices.id)` choice). The counting trap deserves its own step with the `0` vs `1` contrast called out in the prose.

### Filtering groups with `having`

**Goal:** the `where` vs `having` distinction, framed by the fold model.

The shape — orgs whose outstanding balance exceeds a threshold:
```ts
const bigDebtors = await db
  .select({ orgId: invoices.organizationId, outstanding: sum(invoices.amountDue) })
  .from(invoices)
  .where(eq(invoices.status, 'sent'))
  .groupBy(invoices.organizationId)
  .having(({ outstanding }) => gt(outstanding, '1000'));
```
The mental model, stated as the section's spine:
> **`where` reduces the rows going *in*; `having` reduces the groups coming *out*.** `where` runs before the fold, `having` after — so `having` is the only clause that can filter on an aggregate (the aggregate doesn't exist until the fold happens).

**The `having` callback form** (current Drizzle, teach this — not a bare expression): `having` takes a callback that receives the **projected aggregate fields** by their selection keys, so you reference `outstanding` (the key you named in `select`) rather than restating `sum(invoices.amountDue)`. Same single-source-of-truth instinct as everything else — name the aggregate once in the projection, reference the name. Call this out as the reason the aggregate rides in the `select` even when the UI only needs the filtered groups.

Pin the practical consequences:
- A predicate on a *raw column* (`status = 'sent'`) belongs in `where` — cheaper, filters before grouping. Putting it in `having` would be wrong (the column may not even be available post-group) and slower.
- A predicate on an *aggregate* (the `outstanding` sum) **must** be in `having` — `where` can't see aggregates.
- Note the money literal is a **string** (`'1000'`), because `amountDue` is `numeric` and `sum` returns a string — the comparison is in `numeric` space. Tie to the money reflex again.

Quick **`Buckets` exercise** (or `MultipleChoice` if simpler to ship): give ~6 predicates ("only paid invoices", "groups with more than 5 invoices", "invoices created this year", "orgs whose total > $10k", "assigned invoices only", "tags used more than 3 times") and have the student sort each into **`where`** vs **`having`**. Grading: raw-column predicates → `where`; aggregate predicates → `having`. This directly drills the one distinction the section exists to teach.

### Several numbers in one pass: filtered aggregates

**Goal:** `FILTER (WHERE …)` for conditional counts/sums in a single query — the senior reach for a dashboard row.

Motivate concretely: a status-breakdown tile wants *paid count*, *sent count*, and *total* — three numbers, one query, no three round-trips.

Postgres' `FILTER (WHERE …)` clause attaches a per-aggregate predicate. Drizzle has no first-class builder for it, so it's the **`sql\`\`` template** (foreshadow L10's raw-SQL escape hatch — this is a legitimate, parameterized use, not the smell):
```ts
const [breakdown] = await db
  .select({
    total: count(),
    paid: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`,
    outstanding: sql<number>`coalesce(sum(${invoices.amountDue}) filter (where ${invoices.status} = 'sent'), 0)`,
  })
  .from(invoices)
  .where(eq(invoices.organizationId, orgId));
```
Teach via this block (use **`CodeTooltips`** to annotate the `sql<number>` and `${invoices.status}` substrings inline — short definitions without breaking the line):
- `sql<number>\`…\`` — the `<number>` is a **TS-side claim** about the result type, not a runtime check (Drizzle can't verify it). Frame as "you're telling TS what this column will be." Forward-link L10 for the full raw-SQL treatment.
- `${invoices.status}` interpolates as a **quoted identifier** (Drizzle knows the column); a value would interpolate as a `$1` **placeholder**. Reuse the parameterization-is-automatic guarantee from L1 in one clause — `filter (where …)` is still injection-safe.
- The `coalesce(…, 0)` wrapper **closes the empty-`sum` bug** from earlier sections — the canonical fix, shown in context. Call this out explicitly: this is how you turn the `null` into a `0` at the database, so the dashboard never sees `null`.

Keep `FILTER` as a single worked block — it's a "recognize and reach for it" tool, not a deep dive. One sentence that the older idiom was `sum(case when … then … end)`; `FILTER` reads cleaner and is the 2026 default. Don't teach the `CASE` form.

### The top-N-per-group shape: `distinctOn`

**Goal:** name Postgres' "first row per group" idiom; keep it adjacent and light (the chapter outline marks this recognition-tier, the heavy ranking lives in L7).

Distinguish two distinct needs up front so the student picks right:
- **`selectDistinct(...)`** — row-level dedupe, like SQL `SELECT DISTINCT`. One line, the easy case.
- **`selectDistinctOn([col])`** — Postgres-only: keep the *first* row per distinct `col`, where "first" is decided by `orderBy`. This is the idiom for "the latest invoice per org" without a window function.

The shape — latest invoice per org:
```ts
const latestPerOrg = await db
  .selectDistinctOn([invoices.organizationId])
  .from(invoices)
  .orderBy(invoices.organizationId, desc(invoices.createdAt));
```
The one rule that makes it work (and the silent bug if missed):
> The `distinctOn` column(s) **must be the leading `orderBy` key(s)**; the next `orderBy` key decides which row wins per group (here `desc(createdAt)` → newest). Get the `orderBy` order wrong and Postgres errors or returns an arbitrary row.

Position this as the lighter cousin of `row_number() over (partition by …)` (L7) — for "one row per group" `distinctOn` is shorter; for "top *N* per group" or ranking, L7's window functions are the tool. One sentence, forward-pointer, move on. Don't over-invest — a single example and the ordering rule is enough.

**Term tooltip:** `DISTINCT ON` (Postgres-specific, not standard SQL).

### Common dashboard queries (worked, with the precision boundary)

**Goal:** consolidate into the two queries the student will actually copy into a real dashboard, and resolve the `numeric`→`string` boundary definitively.

**Monthly revenue** — `groupBy` over a derived bucket via `date_trunc`:
```ts
const monthlyRevenue = await db
  .select({
    month: sql<string>`date_trunc('month', ${invoices.createdAt})`,
    revenue: sql<string>`coalesce(sum(${invoices.amountDue}), '0')`,
  })
  .from(invoices)
  .where(and(eq(invoices.organizationId, orgId), eq(invoices.status, 'paid')))
  .groupBy(sql`date_trunc('month', ${invoices.createdAt})`)
  .orderBy(sql`date_trunc('month', ${invoices.createdAt})`);
```
- `date_trunc('month', …)` is the bucket — it collapses each timestamp to the first of its month, so all of a month's invoices share a group key. This is the canonical "per month" pattern; raw `createdAt` would never group (cardinality watch-out, callback to §"One number per group").
- The same `sql\`\`` expression appears in `select`, `groupBy`, and `orderBy` — note that you repeat it (no `groupBy(1)` positional shortcut in Drizzle's builder); a `const monthExpr = sql\`date_trunc(...)\`` extracted to a variable is the senior cleanup. Show the variable-extraction form as the recommended shape.

**The numeric precision boundary — resolve it here as a dedicated beat** (highest-value durable lesson):
> `sum`/`avg` over `numeric(12,2)` arrive in TypeScript as **`string`**, exactly like every `numeric` column since Ch 037. The database preserves full decimal precision; JavaScript's `number` (IEEE-754 float) would corrupt cents. So: **format the string for display, never `parseFloat` it for money math.** If you must compute in JS, that's the moment to reach for a decimal library — but for a dashboard you're displaying, the string goes straight to a currency formatter.

Show the right and wrong handling with **`CodeVariants`**:
- ❌ `revenue * 1.2` or `parseFloat(row.revenue)` to add tax in JS → float corruption, the money bug.
- ✅ keep it a string to the formatter (`new Intl.NumberFormat(...).format(...)` consumes it as-is after a `Number()` *only at the display edge*, or compute in SQL). Frame the senior rule: do money math in Postgres (`numeric` stays exact), do formatting in JS.

This section is where the `string` cells in the helper table from §1 pay off — point back to them.

### Practice: build a dashboard query

**Goal:** the student writes a grouped aggregate end-to-end and the result is checked.

One **`DrizzleCoding`** exercise. Task: "Return each organization's invoice count and total outstanding (`sum` of `amountDue` for `status = 'sent'`), highest-outstanding first, including orgs with zero outstanding as `0`." Forces: `groupBy` on the org, `leftJoin` (so zero-orgs survive — or `where status='sent'` with a `having`/`coalesce` choice), `count`, `sum`, `coalesce` for the `null`→`0`, `orderBy desc`.

**PGlite staging (carry from L1/L2/L3 continuity, mandatory):** integer PKs with explicit seeded ids; snake_case column-name strings; **money stays `numeric` so it grades as a string** (`expectedRows` totals are strings like `'1500.00'`); no `casing` client, no `uuidv7()`. Seed 2–3 orgs, one with zero `sent` invoices to exercise the `coalesce`/left-join path. `ordered: true` (the query has an `orderBy`). Pin `expectedRows` with string money values and `number` counts.

Grading criteria for the agent: result rows match per-column subset — `{ orgName, invoiceCount: <number>, outstanding: '<string>' }`; the zero-org row must show `'0'` not `null` (this is what verifies the student handled the empty-sum case). If the relational graph can't wire into the widget, this is a pure SQL-builder exercise anyway (no RQB needed for aggregates) — no fallback concern here, which is a point in this exercise's favor.

---

## Figures

**The fold figure (core mental model) — HTML + CSS, in a `<Figure>`.**
Pedagogical goal: make "aggregate = collapse rows into one number, `groupBy` = collapse *within* buckets" visible before any API. Per the diagrams index, this is an annotated illustration / phase-strip → plain HTML+CSS, not a graph engine.
Shape: left column = a short stack of raw invoice rows (each tagged with a status color: 2 draft, 3 sent, 1 paid). An arrow labeled `groupBy(status)` → right column = three collapsed rows, one per status, each showing `count` and `sum`. A caption ties the picture to the vocabulary: "rows fold into one row per group; `where` thins the left stack, `having` thins the right." Keep under ~400px tall (vertical-space constraint), horizontal left→right layout. This single figure is referenced by name across §2–§5, so the whole lesson shares one mental picture — high leverage for one small visual.

No other diagrams — the remaining concepts are code-shaped and better taught as runnable/annotated blocks than pictures.

---

## Term tooltips (consolidated)

- `aggregate function` — a function that computes one value across many rows.
- `COUNT(*)` — counts rows; the `*` is "every row," not "all columns."
- `DISTINCT ON` — Postgres-specific "first row per group" selector, not standard SQL.

(Parameterization terms `placeholder`/`$1`/`SQL injection` were defined in L1 — reuse, don't redefine; reference in one clause when `FILTER`/`date_trunc` interpolation comes up.)

---

## Scope

**Prerequisites to restate briefly (already owned, one line each — do not re-teach):**
- `db.select({...}).from(...).where(...)` and operator helpers `eq`/`gt`/`and` (L1).
- "The type follows the projection"; the single-row `const [row] = …` destructure (L1).
- `leftJoin` and left-join nullability — every right-side column becomes `T | null` (L2).
- Money is `numeric`→`string` end-to-end, never `parseFloat`; `amountDue` is the money column (Ch 037).
- The relational query API (`db.query`) is the tree-read default; the SQL builder is for compute-over-rows (L3) — this lesson *is* the SQL-builder case.

**Explicitly out of scope (defer, do not teach here):**
- **Window functions** (`OVER`, `PARTITION BY`, `row_number`, `rank`) — named once as the "top-N-per-group / ranking" tool in §`distinctOn`; owned by L7. `distinctOn` is the only per-group-row idiom taught here.
- **CTEs and subqueries** as the multi-pass shape (rank-then-filter) — L7.
- **Aggregates through the relational query API** — there isn't a first-class one; the lesson's answer is "drop to `db.select`." State this once, don't explore RQB aggregation workarounds.
- **Indexing aggregate / `groupBy` / `orderBy` columns for speed** — every "is this fast?" question defers to Ch 039 L1. Mention performance only where a *wrong query* (high-cardinality group, `count(*)` over a left join) gives a *wrong answer*, never to optimize a correct one.
- **`EXPLAIN ANALYZE`** on aggregate plans — Ch 039 L3.
- **Materialized views / pre-aggregated summary tables** — out of course scope entirely; don't gesture at them.
- **The raw `sql\`\`` template at depth** (`sql.raw`, `db.execute`, typing rules) — L10. Here `sql\`\`` is used only for `FILTER` and `date_trunc`, with a one-line parameterization reassurance and a forward-pointer.
- **`coalesce` as a general null-handling tool** — introduced narrowly for the empty-`sum`→`0` case; not a general SQL-functions tour.
- **Decimal/money arithmetic libraries** — named once at the precision boundary as "the tool if you must compute money in JS"; not taught.
