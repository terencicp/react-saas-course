# Reading EXPLAIN ANALYZE

- **Title:** Reading EXPLAIN ANALYZE
- **Sidebar label:** Reading EXPLAIN ANALYZE

## Lesson framing

This is the **evidence lesson** of the chapter. Lesson 1 declared indexes on four senior triggers; lesson 2 spotted N+1 by call-site shape. Both planted the same debt: *"feels slow" is not evidence — `EXPLAIN ANALYZE` is the only acceptable proof an index is needed and that it's actually used.* This lesson pays that debt. By the end the student can take any suspect query, ask the planner what it does, read the answer top-to-bottom, name the expensive node, and run the measure → hypothesize → change-one-thing → re-measure loop.

The senior question driving the whole lesson (stated implicitly in the intro, never as a heading): **"This query is slow — what does the database say about why, and what's the one change that fixes it?"** The deliverable is a *diagnostic skill*, not a feature. Frame it as the reflex any senior reaches for before touching a query — and the discipline that separates a real fix from cargo-cult index-spraying.

Pedagogical spine and how to manage cognitive load:

1. **The plan is the database's answer to "how did you run that?"** Lead with this mental model before any syntax. A query says *what* you want; the planner decides *how*; `EXPLAIN` prints that decision; `EXPLAIN ANALYZE` runs it and prints decision-vs-reality side by side. Everything downstream hangs off this one frame.
2. **Build the reading skill on a deliberately simple plan first** (a single `Seq Scan`), then add one layer of complexity at a time (add a `WHERE` → `Index Scan`; add an `ORDER BY` → `Sort`; add a join → `Nested Loop`/`Hash Join`). Never open with a five-node plan — that's the cognitive-load trap that makes students bounce off `EXPLAIN`.
3. **Reading direction is the #1 beginner stumble.** The plan is an inverted tree: indentation = depth, the *most-indented* node runs *first*, output flows *up* to its parent. Spend a dedicated visual on this. Students who skip it read the plan backwards and misdiagnose every time.
4. **The numbers are where decisions live, not the node names.** Teach a small, fixed set: `actual rows` vs estimated `rows` (the planner's self-grade), `loops=` (the silent multiplier), `actual time`, and buffer `hit`/`read` (RAM vs disk). Resist cataloguing every plan field — the senior reads four numbers, not forty.
5. **Pattern-match plans to diagnoses.** The payoff is recognition: `Seq Scan` + `Filter` on a big table = missing/unused index; `Sort` dominating = no index produces the order; high `loops=` on a nested loop's inner side = N+1-shaped join. Each pattern points at a fix the student already learned in lesson 1.
6. **One change at a time, always.** The loop is the lesson's behavioral takeaway. Hammer it: changing two things destroys the signal. Pair the worked example with a real before/after so the student *sees* the plan flip.

Boundaries to honor (from continuity notes): lesson 2 established that **`EXPLAIN ANALYZE` is the wrong tool for application-level N+1** — each individual statement's plan looks fine; the N+1 cost is round-trip count, surfaced by `logger: true`, not by the plan. Restate this explicitly so the two lessons don't contradict. The *database-side* nested-loop-with-high-`loops` is a different thing that the same shape, and the lesson must draw that line cleanly.

Hands-on is essential here — plan reading is a skill you can only learn by reading plans. **`SQLCoding` runs full Postgres in WASM (PGlite), so `EXPLAIN ANALYZE` works in the browser.** This is the lesson's superpower: the student runs real `EXPLAIN ANALYZE` against a seeded table, with and without an index, and reads the actual output. Most of the interactivity budget goes here. **Verified fact for builders (June 2026):** PGlite is on **Postgres 17** (`REL_17_5-pglite`), *not* 18 — so BUFFERS is **not** on by default in the exercises and `EXPLAIN (ANALYZE, BUFFERS)` must be written explicitly there. The production target is Postgres 18 (GA on Neon since May 2026), where `ANALYZE` enables BUFFERS automatically. This split is exactly why the lesson teaches "always write `(analyze, buffers)`" as the portable habit — correct on both.

The tone is senior and terse — the student has written every query type in chapter 038 and declared every index in 039.1. This lesson assumes all of it. No re-teaching of indexes, query shapes, or N+1; only how to *prove* claims about them.

## Lesson sections

### Introduction (no heading)

Warm, brief, concrete. Open on the scenario the student is now equipped to hit: the invoices list page from chapter 038 was fast on 50 seeded rows, ships, and at 200k rows the page takes three seconds. Lesson 1 said "add the composite index" and lesson 2 said "it's not N+1." But *how do you know* the index is the fix, and how do you confirm it worked? State the goal: by the end you can ask Postgres exactly how it ran a query and read the answer well enough to act. Name the one rule that frames everything: **a query says what, the planner decides how, `EXPLAIN ANALYZE` shows the how with real numbers.** Preview the worked payoff — the cursor-pagination query from 038.6, its plan before and after the index from 039.1, two orders of magnitude, visible in the plan.

### The planner decides how, EXPLAIN shows the decision

Establish the core mental model before any output. Content:

- A SQL query is **declarative** — it states the result, not the algorithm. The **query planner** (reuse `Term`) considers the available access paths (scan the table, walk an index, which join algorithm) and picks the one with the lowest estimated cost. Two different plans can produce identical results at wildly different speeds — the index never changes *what* comes back, only *how the engine reaches it* (callback to 039.1's mental model, stated once, not re-taught).
- `EXPLAIN <query>` prints the chosen plan with **cost estimates** — the planner's guess, query not run.
- `EXPLAIN ANALYZE <query>` **actually runs the query** and prints the plan annotated with **real timings and row counts** beside the estimates. The senior reaches for `ANALYZE`: the gap between estimate and reality is frequently the bug itself.
- The cost numbers (`cost=0.00..25.4`) are in an **arbitrary planner unit**, not milliseconds — useful only for comparing two nodes/plans, never as an absolute. Name this so students don't try to convert cost to time. `actual time=` is the real milliseconds.

Visual — a small **three-panel diagram** using `TabbedContent` (alternatives of one idea): tab 1 "The query" (the SQL), tab 2 "EXPLAIN" (plan with `cost=` estimates, query not run, fast), tab 3 "EXPLAIN ANALYZE" (same plan, now with `actual time`/`rows` and a note "query was executed"). Pedagogical goal: cement that the three are the same plan at three levels of evidence. Keep each panel to a few lines. Wrap is automatic (TabbedContent is its own card).

`Term` tooltips here: **query planner**, **declarative**, **cost estimate**.

### Running it: copy the SQL, prefix it, read the output

The practical "how do I get a plan" section. Lead with the reflex, keep it short — the real depth is the *reading*, not the running.

- The course reflex: **turn on `logger: true` (from 039.2), copy the exact SQL Drizzle logged, prefix it with `EXPLAIN (ANALYZE, BUFFERS)`, run it in a SQL console** (Neon's SQL editor, `psql`, or Drizzle Studio — the latter named, owned by 040.1). This is the senior's everyday path: Drizzle builds the query, you diagnose the raw SQL.
- The in-app path, named and shown once: `await db.execute(sql\`explain (analyze, buffers) select ...\`)`. Honest about the friction — you're hand-writing or interpolating the SQL, and the result is rows of plan text, not a typed shape. Good for a one-off probe in a script; the SQL-console path is cleaner for interactive diagnosis. Show this with a small `Code` block, not `AnnotatedCode` — it's one line of mechanics, not a walkthrough.
- **The `BUFFERS` option.** Adds shared/local/temp block `hit` (from RAM) and `read` (from disk) counts to every node — the single best signal for whether slowness is a cache miss. **Postgres 18 turns `BUFFERS` on automatically whenever `ANALYZE` runs** (verify, Fact-check); on any older Postgres, `(analyze, buffers)` is explicit. Course rule: **always write `(analyze, buffers)`** — it's a no-op on 18 and mandatory everywhere else, so it's the portable habit.
- **Safety watch-out, stated firmly here (not bundled at the end):** `EXPLAIN ANALYZE` *executes the query*. On a `SELECT` that's harmless. On an `UPDATE`/`DELETE`/`INSERT` it **performs the write**. To plan a destructive statement without committing it, wrap it: `BEGIN; EXPLAIN ANALYZE DELETE ...; ROLLBACK;` — or use plain `EXPLAIN` (no `ANALYZE`) for an estimate-only plan. This is a real production footgun; give it an `Aside` (caution).

`Term` tooltips: **BUFFERS**, **shared buffers** (one line: Postgres's in-RAM page cache).

### Reading the plan tree top to bottom

The keystone reading-skill section. This is where the most care goes.

- The plan is an **inverted tree printed as indented text.** Each node names an operation, followed by its estimates and (with `ANALYZE`) actuals. **Indentation is depth.** The execution order is the part beginners get wrong: **the most-indented (deepest) node runs first; its output feeds its parent; results flow upward to the root.** Reading the top line first and stopping is the classic mistake — the top line is the *last* thing that happens.
- The reading recipe (give it as a short numbered `Steps`): (1) find the deepest node — that's where data first enters; (2) walk outward/up, tracking how `actual rows` changes at each node; (3) find the node where time concentrates or row counts explode/collapse unexpectedly — that's your suspect.

Visual — the centerpiece. A **`DiagramSequence`** that takes one real plan (3–4 nodes, e.g. `Sort` → `Hash Join` → `Seq Scan` / `Index Scan`) and walks execution **in actual run order, deepest-first**, highlighting one node per step with a caption explaining what that node does and what its rows/time mean. Step 1 highlights the deepest scan ("runs first, reads rows from disk/index"); each subsequent step moves up one level ("its parent receives those rows and…"); final step highlights the root ("the result you get back"). Pedagogical goal: make the "deepest-first, flows-up" rule *kinetic* so it sticks. Author the plan as a styled monospace block where each node is a targetable element; reuse the same plan text across steps with a different node lit. This single widget does more for comprehension than any prose. Build as a lesson-specific component under `src/components/lessons/039/3/` if a plain styled block won't cleanly support per-node highlighting across steps.

Pair it immediately with a tiny `SQLCoding` **sandbox** (no `expectedRows`): seed one small table, starter query is `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM ...;`, instruction "run it, then read the plan top-to-bottom — which line ran first?" Let the student see real PGlite plan output for the first time in a low-stakes context before any grading.

### The four numbers that decide

Narrow the firehose to the small set of numbers a senior actually reads. Teach each against a real node line so the student maps name → position in the output.

- **`actual rows` vs estimated `rows` — the planner's self-grade.** The planner picks the plan from row *estimates* drawn from table statistics. If `actual rows` is off from estimated `rows` by more than ~10×, the statistics are stale or the predicate is too complex to estimate, and the planner may have chosen a bad plan on bad information. Fix: `ANALYZE <table>;` refreshes statistics (auto-vacuum does it on a schedule too — name the connection to 039.1's "the planner decides via statistics"). Re-check after.
- **`loops=` — the silent multiplier.** `(actual time=0.01..0.04 rows=5 loops=200)` means this node executed **200 times**; the displayed per-loop time and rows are **per execution**, so the real cost is `loops × time` and the real row total is `loops × rows`. The most-missed number — a node that looks cheap (`0.04ms`) is expensive at `loops=200`. This is the database-side cousin of N+1.
- **`actual time=start..end`** — startup time before the first row, then total time to the last row, **per loop**. Used with `loops=` for true cost.
- **Buffer `hit` vs `read`.** `Buffers: shared hit=120 read=8` — 120 pages served from RAM, 8 fetched from disk. On a query that should be hot, lots of `read` means the data doesn't fit in cache or the index isn't covering. Watch-out, stated inline: **buffer numbers are per-loop too** — multiply by `loops=` for the real I/O.

Use `AnnotatedCode` here: the `code` is one realistic node line (or two), `lang="text"`, and each `AnnotatedStep` highlights one number with `color` and a one-paragraph explanation (estimated vs actual blue; `loops=` orange — the trap; `actual time` neutral; buffers green). This is exactly the "direct focus to multiple parts of one block" case `AnnotatedCode` exists for.

`Term` tooltips: **statistics** (the planner's sampled column distributions), **ANALYZE** (the command that refreshes them — distinguish from the `EXPLAIN ANALYZE` option, a common name collision; call this out in the tooltip).

### The node types you'll meet

A focused field guide — only the nodes a SaaS dev actually sees, each tied to the query shape from 038 that produces it. Resist exhaustiveness. Present as teaching prose grouped into scans, joins, and post-processing, each node 2–4 lines: what it does, the shape that produces it, and whether it's a smell.

- **Scans.** `Seq Scan` — full-table read; fine on small tables, a smell when the table is large and a `WHERE` should have filtered. `Index Scan` — walk the index, fetch matching rows from the heap; the shape a selective B-tree predicate produces (039.1). `Index Only Scan` — answered entirely from the index, no heap fetch (a covering index; `INCLUDE` named, deferred). `Bitmap Index Scan` + `Bitmap Heap Scan` — combine one or more indexes via a bitmap for medium-selectivity or multi-predicate queries.
- **Joins.** `Nested Loop` — for each outer row, probe the inner side; wins on small outer sets, dangerous when the inner side is an unindexed scan looped many times. `Hash Join` — build a hash of one side, probe with the other; the workhorse for medium/large equality joins. `Merge Join` — for two already-sorted inputs. The planner picks; the senior reads. Tie back to 038.2 joins.
- **Post-processing.** `Sort` — orders rows; watch for `Sort Method: external merge Disk: …` meaning it spilled to disk (slow). `Aggregate`/`HashAggregate`/`GroupAggregate` — the fold from 038.4's `count`/`sum`/`groupBy`. `CTE Scan`/`Subquery Scan` — CTE and subquery results from 038.7.

Exercise — **`Matching`**: left column = node type (`Seq Scan`, `Index Scan`, `Hash Join`, `Sort`, `Aggregate`), right column = the plain-language thing it does ("reads every row in the table", "walks an index then fetches matching rows", "builds a hash table of one side and probes it", …). Quick recall drill that locks the vocabulary before the diagnosis section leans on it.

`Term` tooltips: **heap** (the table's row storage, vs the index), **covering index** (one that includes every column the query needs, enabling Index Only Scan).

### From plan to diagnosis

The payoff: turn plan patterns into fixes the student already knows. This is recognition training. Present each pattern as *symptom in the plan → what it means → the fix (and which earlier lesson owns it)*.

- **`Seq Scan` with a `Filter` on a large table, `actual rows` ≪ rows scanned.** The engine read the whole table and threw most away. Missing or unused index on the filter column → add/fix it (039.1). The high `Rows Removed by Filter` line is the tell.
- **`Index Scan` returning far more rows than the final result needs.** Index is used but not selective enough, or it's the wrong composite — a better composite (leftmost-prefix, 039.1) may help.
- **`Sort` consuming most of the time, especially `external merge`.** No index produces the required order. Add the composite `(sortKey, id)` index in the query's exact direction (039.1, the cursor-pagination shape) so the rows arrive pre-sorted and the `Sort` node disappears.
- **`Nested Loop` with high `loops=` on the inner side scanning an unindexed table.** The database-side N+1-shaped plan. **Draw the line to lesson 2 here explicitly:** this is *not* application N+1 (that's round-trip count, invisible to the plan, found via `logger`); this is one query whose join probes a missing FK index — the fix is the FK index (039.1), and the plan *does* show it, because it's a single statement. Resolving the two "N+1"s is a senior clarity moment.
- **Stale stats — estimated vs actual off by orders of magnitude.** `ANALYZE <table>;`, re-check.

Two reinforcement widgets:

1. **`StateMachineWalker`** (`kind="decision"`), a **diagnostic funnel** — exactly the use case the component doc calls out. Root: "Your query is slow — what does the plan show?" Branches: "A `Seq Scan` on a big table with a `Filter`" → leaf "Add an index on the filtered column (039.1); confirm the plan flips to `Index Scan`." / "A `Sort` eating the time" → leaf "Add a composite index in the sort's direction; the `Sort` node should vanish." / "A `Nested Loop` with high `loops=` on an unindexed inner scan" → leaf "Missing FK index — this is the database-side shape, not app N+1." / "Estimates wildly off actuals" → leaf "Stale statistics — run `ANALYZE`." Pedagogical goal: drill the *order* a senior asks questions and bind each symptom to one fix. Each leaf names the owning lesson.
2. **`SQLCoding`, graded (the load-bearing exercise of the lesson).** Seed a table large enough that PGlite picks a `Seq Scan` (a few thousand rows generated via `generate_series` in the seed) with a selective predicate. Starter: `EXPLAIN (ANALYZE, BUFFERS) SELECT ... WHERE <selective col> = <value>;` returning a `Seq Scan`. Task in two moves within one editor: the student adds `CREATE INDEX ... ;` *then* re-runs the `EXPLAIN` — and the grader checks the plan output now contains `Index Scan` (or `Bitmap`). Because grading matches result rows, the criterion is a row from the plan output containing the index-scan node text. **Builder notes:** confirm PGlite (a) runs `EXPLAIN (ANALYZE, BUFFERS)`, (b) returns the plan as queryable rows (column `QUERY PLAN`), and (c) at the seeded volume actually chooses `Seq Scan` pre-index and an index scan post-index — PGlite's planner on a small in-WASM dataset may favor seq scan regardless; if it won't flip reliably, fall back to a non-graded sandbox that asks the student to read and compare the two plans they produce, plus a `PredictOutput`/`MultipleChoice` on "which node appears after the index?". This is the single most important interactive moment — budget verification time for it. Same PGlite staging conventions as chapter 038 exercises (integer PKs, explicit snake_case column strings, seeded ids).

`Term` tooltip: **Rows Removed by Filter**.

### One change, one re-run: the diagnostic loop

The behavioral takeaway, given its own short section so it lands as a discipline, not a footnote.

- The loop: (1) `EXPLAIN ANALYZE` the slow query; (2) form a hypothesis — *which node is expensive and why*; (3) apply **exactly one** change (an index, a query rewrite, a `WHERE` tightening); (4) re-run `EXPLAIN ANALYZE` and confirm *that node* changed as predicted. Then repeat if still slow.
- **Change two things at once and you've destroyed the signal** — you can't attribute the improvement, and you may have shipped a useless index that taxes every write (callback to 039.1's cost-of-over-indexing). This is the senior discipline that separates a fix from cargo-cult tuning.
- **The dev-vs-prod data trap.** A plan on 100 dev rows tells you nothing about the 10-million-row production plan — the planner *changes strategy* with table size (the very flip the graded exercise demonstrates). Reflex: diagnose against production-shaped data — a seeded realistic volume (seed lesson named, 040.2) or a production-shaped Neon branch. State this as the reason the worked example below uses a populated table, not a toy.

Present the loop as a compact `Steps`. Keep prose tight — the concept is simple, the value is in naming it.

### Worked example: the cursor-pagination query, before and after

The capstone that ties the chapter together. Reuse the **exact** cursor-pagination query and index from the continuity record so it's continuous with what the student already built:

- Query (038.6): list invoices for an org, `where` carrying the compound cursor predicate `or(lt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), lt(id, c.id)))`, `orderBy(desc(createdAt), desc(id))`, `limit(pageSize + 1)`. (Show the emitted SQL form, since `EXPLAIN` runs on SQL.)
- Index (039.1): `idx_invoices_org_created_at_id` on `(organizationId, createdAt desc, id desc)`.

Structure as a **before/after** using `CodeVariants` (the before/after comparison is exactly its job) with two tabs, each tab holding the plan text plus a short read-out:

- **Tab "Before the index"** — plan shows `Seq Scan` on invoices + a `Sort` node doing the ordering; high `actual time`, high `read` buffers, `Rows Removed by Filter` large. Read-out walks the two suspects bottom-up.
- **Tab "After the index"** — plan shows an `Index Scan` using `idx_invoices_org_created_at_id`, **no `Sort` node** (the index already produces the order — the punchline of pairing cursor pagination with its composite index, the "correct here, fast there" boundary from 038.6 finally closed), `actual time` two orders of magnitude lower, buffer `read` collapsed to near-zero. Read-out names exactly which node changed and why.

Emphasize the **disk-read drop** as the headline metric (buffers `read` → ~`hit` only) and the **disappeared `Sort`** as the structural win. Close by connecting back: this is the loop in action — one change (the index), one re-run, the predicted node (`Sort`) gone. Explicitly mark this as the proof of the debt lesson 1 and 038.6 deferred to this lesson.

Optionally precede the variants with a one-line callback: "this is the index you declared in lesson 1 — now you can *prove* it earns its weight."

### auto_explain and the tools beyond the console (brief)

Close the lesson by naming the production-grade affordances so the student recognizes them later, without teaching them at depth.

- **`auto_explain`** — a Postgres extension that logs the plan of any query slower than a threshold (`auto_explain.log_min_duration = '500ms'`) automatically. The production version of this lesson's manual loop — you don't hand-run `EXPLAIN` on prod, you let slow queries log their own plans. Named for recognition; it's a server-config concern, deferred.
- One line naming **pganalyze / Datadog DB monitoring** as the hosted "plans + trends over time" tier, deferred.
- Point to **Drizzle Studio** (040.1) and the Neon SQL editor as the consoles where the student will actually run these.

Keep to a few sentences. `Term` tooltip: **auto_explain**.

### External resources

A small `CardGrid` of `ExternalResource` cards:

- Postgres docs — *Using EXPLAIN* (the canonical reference): `https://www.postgresql.org/docs/current/using-explain.html`.
- *Postgres EXPLAIN visualizer* (explain.dave.cm or pev2 / explain.depesz.com) — a paste-your-plan visual tool, genuinely useful for big plans; pick one and verify it's current at build time.
- Optionally a Drizzle docs link if a current page documents `db.execute` + `sql` for raw statements.

Optional `VideoCallout`: only if the resourcer finds a current, high-quality "reading Postgres EXPLAIN ANALYZE" walkthrough (Hussein Nasser and similar have strong ones). Not required — the `DiagramSequence` and `SQLCoding` carry the lesson. If included, place it in *Reading the plan tree top to bottom*, not at the end.

## Scope

**Already taught — assume, do not re-teach (redefine in one line at most):**
- All query shapes: `select`/joins/relational API/aggregates/upserts/cursor pagination/subqueries/CTEs/FTS/JSONB (chapter 038). Reference them as the queries being explained; never re-explain the query itself.
- Index types, the four triggers, declaration syntax, composite/leftmost-prefix, partial/expression/GIN, the cost of over-indexing, the canonical invoices index set (039.1). This lesson *uses* those indexes as the fix; it does not re-derive when to add them.
- The cursor-pagination query and its composite index shape/name (038.6, 039.1) — reused verbatim in the worked example.
- Application-level N+1, `logger: true` as its diagnostic, and that `EXPLAIN ANALYZE` is the *wrong* tool for it (039.2). Restate the boundary; don't re-teach N+1.
- `db.execute` + `sql\`\`` parameterization is safe (038.4/038.10 reflex) — assume; this lesson only adds the `explain` prefix.

**Deferred — name at most, do not teach:**
- `CREATE INDEX CONCURRENTLY` and the migration hand-edit (040.2). Adding an index in the *exercise* is fine (it's a console, not a migration); the production lock-out story is not this lesson's.
- Drizzle Studio mechanics (040.1) — named as a console only.
- The seed lesson / realistic-volume seeding (040.2) — named as the answer to the dev-vs-prod trap.
- `INCLUDE`/covering indexes at depth — `Index Only Scan` is named; building covering indexes is not drilled.
- `auto_explain`, pganalyze, Datadog — named for recognition only.
- Postgres server config tuning (`shared_buffers`, `work_mem`, `random_page_cost`) — DBA-side; mention `work_mem` only as the reason a `Sort` spills, never as a thing the student tunes.
- Transactions / isolation (039.4) — out of this lesson entirely.
- Query-rewriting techniques as a catalogue — case-by-case in the diagnoses, not a systematic topic.
- `MATERIALIZED` CTEs, planner internals (genetic query optimization, join-order search) — out of scope.

## Code conventions notes

- `EXPLAIN (ANALYZE, BUFFERS)` written explicitly in all examples — portable across Postgres majors and a no-op where BUFFERS is already default. Deliberate; downstream agents should not "simplify" to bare `EXPLAIN ANALYZE`.
- In-app probe form is `db.execute(sql\`explain (analyze, buffers) ...\`)` — matches the §Data-layer rule that raw fragments use the `sql\`\`` tagged template. SQL keywords lowercase in the `sql\`\`` template per the chapter-038 house style; plan *output* is shown verbatim as Postgres prints it (mixed case: `Seq Scan`, `Index Scan`).
- `SQLCoding` exercises follow the chapter-038 PGlite staging conventions (integer PKs, explicit `snake_case` column-name strings, seeded ids) so they're consistent with the prior chapter's widgets; this is a deliberate widget-runtime divergence from the app's `casing: 'snake_case'` client, already documented in the 038 continuity notes — do not "correct" it.
- Index added in the graded exercise uses the `idx_<table>_<col>` naming convention from §Data-layer / 039.1.
