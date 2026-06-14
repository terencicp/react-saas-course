# Indexes and N+1 in production

- Title: Indexes and N+1 in production
- Sidebar label: DB perf in production

## Lesson framing

Final lesson of Ch094 (Performance vigilance) and the chapter's load-bearing server-side DB lesson. This is a **production-vigilance re-frame, not a re-teach.** The student already owns every mechanic from Ch039: index types + the four triggers + composite `(org_id, created_at, id)` leftmost-prefix + the day-one-vs-evidence rule + write cost + `CONCURRENTLY` (L1); the N+1 shape in 4 disguises + the `with`/join cure + query logging (L2); reading `EXPLAIN ANALYZE` — Seq Scan, Rows Removed by Filter, BUFFERS, Postgres 18 on Neon (L3). And from this chapter's L6: `Promise.all` fan-out at the RSC layer, React `cache()`, and the connection-pool-saturation caution that L6 *explicitly handed to this lesson*.

So the new content is NOT "what is an index" or "what is N+1." It is the **vigilance discipline layered on top**: how these two failure classes *present in a production trace* (one slow span vs. many small spans), the diagnose→fix→confirm loop run against production-shaped data, three production shapes that weren't in Ch039 (the limit-offset deep-page scan, connection-pool saturation as the *shifted* bottleneck from L6's fix, and the hot-query monitoring surface), and the two cadences that close the chapter: the **pre-launch DB checklist** (one-off) and the **weekly slow-query review** (recurring). The senior question is "production traces show one consistently slow page — which of the two SQL failure classes is it, and what's the structural fix that holds past launch?"

Pedagogical conclusions that apply lesson-wide:

- **Anchor every section in the trace/monitoring surface, not the SQL.** The Ch039 lessons taught the mechanics in isolation (a query, a plan). The senior skill this lesson adds is *recognizing which failure class you're looking at from its production signature* before you ever open a plan. Lead with the signature, then route to the (already-known) fix. This is the through-line: missing index = one fat span; N+1 = a staircase of identical thin spans.
- **Two failure classes, one diagnostic table.** The spine of the lesson is a single mental model: each class has (a) a production signature, (b) a confirming tool the student already knows, (c) a structural fix the student already knows. Build this as an explicit two-column comparison early and refer back to it.
- **Cash in debts, don't re-open them.** Pool saturation is L6's planted debt — pay it here in full (sizing, the Neon HTTP-proxy sidestep, WebSocket `Pool` when you need it, bounded concurrency as the escape hatch). The N+1 component-layer cousin was named in L6; here name the *SQL-layer* fix and stop (don't re-teach `with`). Cursor/keyset pagination shape is owned upstream (ch038/Unit 10) — name it as the fix for the limit-offset trap, don't teach the shape.
- **Correct one stale chapter-outline claim.** The outline's watch-out "Drizzle relations silently N+1 on older versions" is outdated: Drizzle relational queries v2 *always* emit one SQL statement (lateral joins of subqueries + JSON aggregation). Replace with the real watch-outs: verify the emitted SQL with `db.query…toSQL()` when in doubt, and `with` over-fetching heavy columns (narrow with `columns`). Flag this divergence for downstream agents.
- **The vigilance framing is the payload.** Per the chapter thesis (defaults before audits; field data is truth; each failure has a primary cause and primary fix; vigilance is recurring), the load-bearing takeaway is the *discipline*: a 4-check pre-launch pass and a weekly top-N review, both run over existing primitives. End on these, not on a new API.
- **Code-light, consistent with L1–L6.** Snippets are fragments, not full compilable files. The student has seen the full `next/image`/Drizzle surfaces elsewhere. Use the same helper names L6 established: `getOrganization(orgId)`, `listInvoices(orgId, …)`, `listTeamMembers(orgId)`, `requireOrgUser()` → `{ user, orgId, role }`.
- **Practice = recognition + one diagnosis, not syntax drilling.** The student wrote indexes and N+1 fixes in Ch039 exercises. Here the exercise should test the *new* skill — reading a signature and routing to the right class/fix — plus one PGlite plan-confirmation that proves a composite `(org_id, created_at)` index flips a deep-page scan. Don't re-run Ch039's "write the index" or "write the join" drills.
- **Target student.** Junior dev who can write the queries but has never operated one in production. The pain this relieves: the dread of "the app got slow and I don't know why." The mental model to leave them with: *production gives you a signature; the signature names the class; the class names the fix; you confirm the fix; you schedule the next look.*

## Lesson sections

### Introduction (no header)

State the senior question concretely (per pedagogical guidelines — implicit, warm, brief). Production has been live for months; traces show **one** page consistently slow: the org invoice list, ~280ms. Separately, the audit-log page is slow in a *different way* — 50 tiny queries where there should be one. Two slow pages, two different shapes, two different fixes. Connect explicitly to prior work: "You learned to build indexes and kill N+1 in Ch039, and you fixed RSC waterfalls last lesson. This lesson is about *operating* those skills — recognizing which of the two SQL failure classes a real production trace is showing you, confirming it, and the recurring checks that keep both from coming back." Preview the end state: a pre-launch DB checklist and a weekly review habit. Set the frame that this is the chapter's closer and the DB half of the same vigilance discipline.

Include the `CourseProgressBar` (frontmatter `course-progress`, copy the chapter's value pattern from sibling lessons).

### Two failure classes, two signatures

The spine. Establish the single mental model the whole lesson hangs on **before** any fix: at production scale, almost all SQL slowness is one of two classes, and **you tell them apart by how they look in a trace**, not by reading SQL.

- **Missing/wrong index** → *one fat span*. A single query taking 100ms+ because it scans far more rows than it returns. Confirming tool: `EXPLAIN ANALYZE` (Ch039 L3) showing `Seq Scan` or `Rows Removed by Filter` ≫ rows returned. Structural fix: the right index (Ch039 L1) — usually the composite `(org_id, …)` for multi-tenant tables.
- **N+1** → *a staircase of identical thin spans*. Many sub-millisecond-to-few-ms queries, same shape, different bound param — the visual signature from Ch039 L2's query log, now seen in a trace. Confirming tool: count statements-per-render (query log) or read the span staircase. Structural fix: collapse to one statement via Drizzle relations `with` or a join (Ch039 L2).

Deliver this as a **`TabbedContent` of two diagrams** (one tab per class), each a simple HTML+CSS span/bar figure inside the tab, wrapped per the diagram doc. Pedagogical goal: make the two *visual signatures* unmistakable and side-by-side comparable — this is the recognition skill the lesson teaches.
- Tab 1 "Missing index — one fat span": a single wide bar (~280ms) labeled `select … from invoices where org_id=$1 order by created_at desc limit 20`, annotated "scans 50,000 rows to return 20."
- Tab 2 "N+1 — a staircase": ~6 short stacked bars, same query text with `$1…$6`, annotated "1 parent + N children; each its own round-trip."
Reuse the chapter's bar/Gantt visual vocabulary (L6 used HTML+CSS bars for waterfalls) for continuity.

Follow the figure with the **diagnostic table** in prose or a compact two-column layout (a plain markdown table is fine here): rows = {Production signature, Confirming tool, Structural fix, Owned in}, columns = {Missing index, N+1}. This table is the artifact the student should carry out the door; reference it by name ("the two-class table") in later sections. Explicitly note both are visible in traces and both have fixes that *hold past launch* (vs. a cache, which just hides them — callback to L2/L6).

Terms for `Term` tooltips in this section: **span** (one timed operation in a trace — back-ref L6, brief re-def), **trace** (the tree of spans for one request — brief). Keep these short since L6 defined them; this is a courtesy re-def to avoid a flip-back.

### The slow invoice list: a missing composite index

Take the first signature (one fat span) through the full **diagnose → fix → confirm loop**, but framed as production operation, not first-time learning.

- **Diagnose.** The trace shows the one fat span. Copy the SQL Drizzle logged (Ch039 L2 `logger: true` habit), paste into the Neon SQL editor, prefix `explain (analyze, buffers)` (Ch039 L3's portable habit). The plan shows `Seq Scan on invoices` + `Rows Removed by Filter: 49,980`. Name the cause in one line: the query filters `org_id` and orders by `created_at` but the table has no index serving that shape — at 50-row dev scale this was invisible; at 50k it's a full scan per page load.
- **The fix is the composite you already know.** `(org_id, created_at desc, id desc)` — equality column first, sort key next, tiebreaker last (Ch039 L1's leftmost-prefix rule, restated in ONE line, not re-taught). The *production* emphasis: this is THE load-bearing index for multi-tenant SaaS, because every tenant-scoped list query has this exact shape, and the symptom only ever appears at multi-tenant scale (one tenant's rows are a sliver of the table). Show the Drizzle declaration as a short fragment (the third-arg array form), `data-mark-color="green"` on the index line.
- **Confirm.** Re-run `explain (analyze, buffers)`; plan flips to `Index Scan using idx_invoices_org_created_at_id`; 280ms → ~4ms. The discipline beat: *you don't ship an index on faith, you confirm the plan flipped* (Ch039 L3's loop, now as a production reflex). Note field-vs-lab continuity: this is a server-side fix, so it lands in TTFB immediately (L1's TTFB→LCP chain) — connect back to why the page *felt* slow.

Code handling: a `CodeVariants` before/after is overkill here since the fix is one line; use a single `Code` fragment for the index declaration and a `TabbedContent` (or two `Code` blocks) for the before/after plan text (Seq Scan vs Index Scan), mark-colored blue (before) / green (after) to match Ch039 L3's plan-panel convention. Do NOT re-derive column-order rules — one-sentence restatement + link-back only.

Term tooltips: **composite index** (brief re-def, back-ref Ch039 L1), **sequential scan** (brief re-def). Keep terse — these are re-defs.

### The audit log's staircase: N+1 at production scale

Take the second signature (the staircase) through diagnosis and fix, again as operation not first-teach.

- **Diagnose from the trace.** The audit-log page shows ~50 identical thin spans: one query listing audit entries, then one query per entry to fetch the actor's name (`users where id = $1`, `$2`, …). This is the **many-to-one** disguise (Ch039 L2's shape #4, `findMany` then a lookup per row) — name it as a recognized disguise, don't re-teach the four shapes. The tell: statements-per-render grows with row count (Ch039 L2's metric, restated in one line).
- **The fix is the collapse you already know.** Drizzle relations `with: { actor: { columns: { id: true, name: true } } }` → one SQL statement; or an `innerJoin`. State the decision rule in one line (nested tree → relations; flat/aggregate → join — Ch039 L2). Show as a short fragment. **Production emphasis** = the production shapes Ch039 didn't drill:
  - *List-with-children* (invoice list each needing line-item count) → fix with relations `with` + a `columns` projection, or a left join + group-by for the aggregate.
  - *Check-per-row* (each row needs a permission/scope check that hits the DB) → lift the check to one query per scope, not one per row. This is a fresh production shape worth a sentence — it's the N+1 that hides as authorization, not data loading.
- **Confirm.** Query log drops from 51 statements to 1 (Ch039 L2's proof). One sentence on *why a cache wasn't the fix* (callback to L2/L6: cache hides, doesn't collapse; cold request still pays N+1).

Watch-out woven in (not a separate section): **`with` over-fetch.** Drizzle relations v2 always emits one statement (lateral joins + JSON aggregation), so the old "relations silently N+1" fear is dead — but a wide `with` that pulls heavy text/jsonb columns trades N+1 for a fat-payload query. Fix = narrow with a `columns` projection. When unsure what SQL a relation emits, inspect it via Drizzle's `.toSQL()` or the dev query log (`logger: true`) — writer should confirm `.toSQL()` is exposed on the relational-query builder in the pinned Drizzle version; the query log is the always-safe fallback. This is the corrected version of the outline's stale watch-out — flag for downstream.

Term tooltips: **N+1** (brief re-def, back-ref Ch039 L2). One only — the student knows this term.

### When parallel queries become the new bottleneck: the connection pool

**This is L6's planted debt, paid in full** — the chapter's continuity note names L7 as the explicit continuation point. New material (Ch039 only mentioned pool exhaustion in passing; L6 deferred sizing here).

- **The setup.** Last lesson's fix for RSC waterfalls was `Promise.all` — fire independent reads in parallel. Good fix. But a wide `Promise.all` fan-out (or many concurrent requests each firing several) can **saturate the connection pool**: every in-flight query holds one connection; a fixed pool has only so many; exhaust it and other requests *queue for a connection*, turning a fast app slow under load. The bottleneck *shifted* from serialization (L6) to connection supply (here). Frame as: the senior doesn't accept a new failure mode silently when adopting a fix.
- **Why Neon changes the calculus (the modern default).** Neon's serverless driver over **HTTP** routes each query through Neon's SQL-API proxy, which keeps its *own* pre-warmed pool to the compute — so a serverless/edge function never holds a persistent Postgres connection, sidestepping the classic per-function connection-exhaustion problem for one-shot queries. This is the course's default transport and why the pool problem is *mostly* designed away for the common read path. Name the trade: HTTP is for single queries / non-interactive work; **interactive transactions need the WebSocket `Pool`/`Client`** path (node-postgres-compatible) — and *that* path is where pool sizing matters again.
- **When sizing still bites + the escape hatch.** If you're on the WebSocket pool (or classic `pg` + PgBouncer), a small pool + wide fan-out still saturates. Two reaches, named not built: (1) size the pool against expected concurrency; (2) **bounded concurrency** — cap the fan-out width (e.g. a `pMap`-style limit) so a single request can't grab the whole pool. L6 deferred `pMap`/bounded concurrency here explicitly; name it as the tool, point to load-testing on a Neon branch to find the real ceiling. Don't build the machinery — this is a "know the failure mode and the two reaches" section.

Diagram: a small **`ArrowDiagram` or HTML+CSS figure** contrasting the two transports — "HTTP query → Neon proxy (its own pool) → compute" vs "WebSocket Pool (N app-held connections) → compute". Pedagogical goal: make concrete *why* the HTTP path sidesteps the pool problem and the WebSocket path doesn't. Wrap in `<Figure>`. Keep it horizontal and compact.

Terms: **connection pool** (brief re-def, back-ref Ch039 L2), **bounded concurrency** (define: capping how many async operations run at once), **interactive transaction** (define briefly: a multi-statement transaction held open across round-trips, needs a persistent connection).

Caution `Aside`: `Promise.allSettled` vs `Promise.all` under fan-out was L6's point; here add the *pool* angle — a wide parallel fan-out that's correct latency-wise can still be wrong at the connection layer. One line, link back to L6.

### The deep-page scan: the limit-offset trap

A production shape Ch039 did **not** cover (Ch039 L1 mentioned `order by` for pagination but not the offset cost). Short, sharp section.

- **The trap.** `limit/offset` pagination re-scans every skipped row on every page: page 100 with page-size 10 scans ~1,010 rows to return 10. Cheap on page 1, linear-degrading by depth. In a trace it looks like a missing-index slow span that *gets worse the deeper users page* — a distinctive production signature. Even *with* the right index, offset still pays the skip.
- **The fix is keyset/cursor pagination — which you've already built.** `where created_at < $cursor order by created_at desc, id desc limit 10`. With the composite `(org_id, created_at, id)` from earlier this lesson, it's O(limit) regardless of depth. Cursor pagination *shape* is owned upstream (ch038 / Unit 10) — name it and link back, **do not re-teach the cursor mechanics**. The production-vigilance point: the composite index from the first section is *also* what makes keyset pagination fast — one index, two payoffs.
- Watch-out woven in: cursor on `created_at` alone breaks on timestamp collisions — break ties with the secondary `id` (which the composite already carries). One line.

Tiny figure optional: a one-row HTML+CSS strip showing "offset 1000 → scans 1010 rows, discards 1000" vs "cursor → scans 10." Only if it earns its space; a `data-mark-color` annotated `CodeVariants` (offset vs cursor) may serve better. Prefer `CodeVariants` here: two query fragments, red (offset, deep-page cost) / green (cursor, O(limit)), each tab explaining the scan cost. This directs the student to the exact SQL difference.

### Watching for the next slow query: the monitoring surface

Pivot from *reactive* (a trace told you) to *proactive* (you go looking). New material — the hot-query surface and the recurring cadence.

- **The surface.** Neon's Monitoring / Query-performance page is powered by `pg_stat_statements`; it surfaces top-N queries by total/mean execution time over a window — the slowest and most-frequent queries, ranked. (Generic Postgres: `pg_stat_statements` directly.) This is where you find the *next* slow query before a user reports it.
- **Critical Neon gotcha (fact-checked, fresh).** Neon's `pg_stat_statements` data is **lost when the compute suspends/scales to zero** (e.g. after inactivity). Implication for the cadence: don't expect a long unbroken history on a scale-to-zero branch; review against a compute that's been warm, or accept the window resets. Worth a `Aside` caution — this is a real, non-obvious operational trap.
- **The weekly review cadence.** The recurring vigilance beat that mirrors L6's "one slow trace per week": eyeball the top three slowest queries; if one is a regression, run `explain (analyze, buffers)`, then route it through the two-class table — index it or collapse it. Discipline is *the weekly look*, not a one-shot. This is the DB analogue of the chapter's recurring-CI-gate / weekly-review thread.

`ExternalResource` card to Neon's "Monitor query performance" doc here. Term: **`pg_stat_statements`** (define: a Postgres extension tracking per-statement execution stats — counts, total/mean time).

### The pre-launch DB checklist

The chapter's closing artifact — the *one-off deep pass* that pairs with the weekly cadence, and the lesson's load-bearing takeaway alongside the two-class table. Mirrors L5's pre-launch Lighthouse pass and L4's pre-launch bundle pass, closing the chapter's "pre-launch deep pass + recurring vigilance" structure for the DB.

Deliver as a **`Checklist` component** (tickable, persists per page) so it reads as an operational artifact the student can actually run before shipping. Items (five queries + four structural checks, per the outline, fact-grounded):

1. `explain (analyze, buffers)` on the five most-frequent queries — primary-entity list, detail, dashboard aggregation, search, login/auth lookup. (Run against a **production-shaped** branch — dev stats lie; Ch039 L3 hinted, restate.)
2. Verify the composite `(org_id, …)` index exists on every org-scoped table (the multi-tenant load-bearing index).
3. Verify every foreign-key column is indexed (Ch039 L1's day-one trap — Postgres doesn't auto-index FKs; one-line restatement).
4. Check pagination on every large list uses keyset, not deep offset.
5. Confirm connection transport/pool sizing matches expected concurrency (HTTP for one-shot reads; sized WebSocket pool only where interactive transactions need it).
6. Set up the Neon slow-query alert / bookmark the monitoring page for the weekly review.

Close the section (and lesson) by tying both artifacts to the chapter thesis: **defaults before audits** (the structural indexes and the keyset shape move the metric; the monitoring page just surfaces where a default leaked), and **vigilance is recurring** (the checklist runs once at launch; the weekly review runs forever). One or two sentences max — this is the chapter's final beat, so it should land the discipline, not introduce anything new.

Optional final exercise placement — see Scope/exercise note below; the recognition exercise could live here or after the two-class section.

### Recognition exercise (placement: after "Two failure classes" or near the end)

The lesson's primary check-for-understanding, testing the **new** skill (routing a signature to a class+fix), not Ch039 syntax. Use a **`Buckets`** drag-and-drop: chips are short production signatures / trace descriptions; two buckets = "Missing index (one fat span → index it)" and "N+1 (staircase → collapse it)". Example chips:
- "One 240ms span, plan shows `Rows Removed by Filter: 49,900`" → missing index
- "48 near-identical 2ms spans, same SQL with `$1…$48`" → N+1
- "A `findMany` then a `findFirst` per row for the parent org" → N+1
- "A tenant list query scanning the whole table because nothing indexes `(org_id, created_at)`" → missing index
- "Statements-per-render grows with the number of rows on the page" → N+1
- "One slow span that gets *worse the deeper the user pages*" → (missing index family — the offset trap; or add a third bucket if the offset trap deserves its own — but two buckets is cleaner; place offset under missing-index since the fix touches the index + keyset)

Consider a second small exercise — a **PGlite `SQLCoding`** plan-confirmation — only if it adds value over Ch039's drills: seed an `invoices` table with enough rows that a deep-page `limit/offset` query is visibly costed, have the student run `explain (analyze, buffers)` and observe the scan, OR add the composite index and re-confirm the plan flips. Caveat: PGlite plan output and row counts won't match production scale (Ch039 L3 already flagged PGlite's `BUFFERS`/version quirks). Given that limitation, **prefer the `Buckets` recognition exercise as the primary** and make any SQLCoding optional/secondary. If SQLCoding is cut, the `Buckets` + the inline MCQs carry the assessment. A single `MultipleChoice` on "you found a slow query in the monitoring page — what's the first command you run?" (answer: `explain (analyze, buffers)` on it) reinforces the loop.

### External resources (LinkCards)

`ExternalResource`/`CardGrid` at the end (per lesson structure). Candidates:
- Neon — Monitor query performance (https://neon.com/docs/introduction/monitor-query-performance) — the monitoring surface this lesson's weekly cadence uses.
- Neon serverless driver (https://neon.com/docs/serverless/serverless-driver) — HTTP vs WebSocket, the pool section's grounding.
- Drizzle — Relational queries v2 (https://orm.drizzle.team/docs/rqb-v2) — the one-statement `with` cure (already cited Ch039 L2; re-cite for the production-shape framing).
- Use The Index, Luke! (https://use-the-index-luke.com) — already in Ch039 L1; optional re-cite for the composite/keyset model. Pick 3, avoid over-citing what Ch039 already linked.

## Scope

**Already taught — name and link-back, do NOT re-teach:**
- Index types, the four triggers, leftmost-prefix column ordering, B-tree/partial/GIN/expression, write cost, `CONCURRENTLY`, day-one-vs-evidence rule — **Ch039 L1**. This lesson restates only the *composite `(org_id, …)` for multi-tenant* in one line as the production-load-bearing index.
- N+1 definition, the four disguises, the `with`/join cure, why `Promise.all`/cache/DataLoader aren't the fix, query logging + statements-per-render metric — **Ch039 L2**. This lesson names the disguises it shows (many-to-one, list-with-children, check-per-row) as *recognized*, not new.
- `EXPLAIN ANALYZE` reading depth, Seq Scan, Rows Removed by Filter, cost vs actual time, BUFFERS, Postgres 18 auto-BUFFERS on Neon — **Ch039 L3**. This lesson *uses* the `explain (analyze, buffers)` habit; it does not teach plan-reading.
- Cursor/keyset pagination *shape* and mechanics — **ch038 / Unit 10**. This lesson names keyset as the fix for the offset trap and links; it does not teach the cursor mechanics.
- React `cache()` internals, `'use cache'`, RSC waterfalls + `Promise.all` at the component layer, the dependency-check reflex — **Ch094 L6 / ch036 / ch072 / ch032**. This lesson cashes the *pool-saturation* debt L6 planted and references the waterfall fix as the setup for it.
- Neon serverless driver first-install — **ch036**. This lesson discusses transport choice (HTTP vs WebSocket) for the pool section, assuming the driver is live.
- Sentry/Vercel trace install, `tracesSampleRate` — **ch092**. Traces are assumed live; this lesson reads them.
- Speed Insights, Core Web Vitals definitions, TTFB→LCP chain — **ch093 L1 / Ch094 L1**. Referenced as the field-data context for why a DB fix shows up in TTFB; not re-explained.
- Multi-tenancy filter discipline (the `org_id` scoping itself) — **Unit 9**. Assumed; this lesson treats `org_id` as a given on every query.

**In scope (the lesson's actual new content):**
- The two production *signatures* and the recognition skill (one fat span vs. staircase).
- The diagnose→fix→confirm loop run as *production operation* over both classes.
- Three production shapes Ch039 didn't drill: limit-offset deep-page scan, connection-pool saturation as L6's shifted bottleneck, check-per-row N+1.
- The Neon HTTP-proxy pool sidestep + WebSocket `Pool` trade-off + bounded concurrency as the escape hatch.
- The hot-query monitoring surface (`pg_stat_statements` / Neon Monitoring page) + the suspend-loses-history gotcha.
- The two cadences: pre-launch DB checklist (one-off) + weekly slow-query review (recurring).

**Explicitly out of scope (defer / do not open):**
- Transactions, isolation levels, locking — **Ch039 L4 / Unit 5**. Touch interactive transactions only as the reason WebSocket `Pool` exists; do not teach transaction semantics.
- Drizzle migrations / how the index migration is written + `CONCURRENTLY` migration mechanics — **next chapter after Ch039 (migrations)**. Show the schema declaration, not the migration.
- Drizzle relations API depth / `with` traversal mechanics — **ch038**. Use `with` as a known tool.
- Query-builder depth, raw `sql` escape hatches beyond a one-line mention — **Ch038**.
- Load-testing tooling depth — name "load-test on a Neon branch" as the way to find the pool ceiling; don't teach a load-test harness.
- Read replicas, sharding, materialized views, caching layers (Redis/Upstash) as scaling reaches — out of this chapter entirely; the fixes here are index + query-shape + pool, the "minimum viable" set.

## Code conventions notes

Skimmed the relevant slices of Code conventions for this lesson's topics (Drizzle/SQL, async). Alignment:
- Helper names follow the chapter's established contract (`getOrganization(orgId)`, `listInvoices(orgId, …)`, `requireOrgUser()` → `{ user, orgId, role }`) — keep consistent with L6 so cross-lesson code reads coherently.
- Index declarations use the explicit-name convention from Ch039 L1 (`idx_<table>_<col>_<col2>`, e.g. `idx_invoices_org_created_at_id`) — reuse the exact name Ch039 L1 shipped for the invoices composite to avoid cross-lesson drift.
- Partial-index predicates (if any appear) use raw ``sql`…` `` templates, not `eq()` (Ch039 L1's documented bug) — unlikely to recur here but note for the writer.
- All code is **fragments** (no import blocks, no full files) — deliberate divergence from "compilable" convention, consistent with the chapter's code-light pattern (L1–L6). Flag so downstream agents don't "complete" them.
- Plan-text panels use the blue (before/estimate) / green (after/actual) mark-color convention Ch039 L3 established; N+1 before = red, fix = green, matching Ch039 L2.
