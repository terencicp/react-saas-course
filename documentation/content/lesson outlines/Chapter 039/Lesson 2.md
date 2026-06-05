# Spotting and fixing N+1

- Title: `Spotting and fixing N+1`
- Sidebar label: `Spotting N+1`

## Lesson framing

Conclusions from brainstorming that shape the whole lesson:

**This is a recognition lesson, not an API lesson.** The student already knows the *fix tools* — the relational query API (`with`) and joins from chapter 038. Nothing new in the query surface is taught here. The whole value is the senior reflex: scanning a chunk of data-access code and asking *"is this query running once, or once per row?"* The mental model the student should leave with is a shape, not a syntax: **one parent query that triggers one child query per returned row is N+1, and the cure is always to collapse the children into the parent query — never to cache, never to parallelize.** Frame every section around training that pattern-match.

**The hardest misconception to dislodge is that `Promise.all` fixes it.** Juniors see N sequential `await`s, feel the slowness, reach for `Promise.all`, watch it get faster, and conclude the bug is gone. It is not — it went from sequential-N+1 to parallel-N+1. The database still parses, plans, and runs N+1 statements; the pool still pays N+1 round-trips; and the latency floor is now the *slowest* statement of the batch plus pool-contention, not one query's cost. This deserves its own section with a concrete timing/round-trip contrast, because it's the single most common place this topic is taught wrong. Lead the "why parallel isn't a fix" with a visual that separates *JavaScript concurrency* (what `Promise.all` collapses) from *database round-trips* (what it doesn't).

**Real production stakes are the motivator, not a footnote.** The bug is invisible on a dev seed of 20 rows and catastrophic on a tenant with 5,000. The recurring line: *design for the load, not for the dev sample.* This is also what makes the bug pernicious — it ships green, passes review if the reviewer isn't trained, and only surfaces as a slow page (or a connection-pool exhaustion incident) once a customer grows. Tie it to the pool-starvation framing the student will meet again in lesson 4.

**Anchor everything to one running domain example: an invoices list, each invoice with its line items.** This is the same `invoices`/`lineItems`/`organizations` schema threaded through chapters 037–039, and the same example lesson 3 of chapter 038 used to introduce `with`. Reusing it means zero schema cognitive load — the student spends all attention on the *shape of the call*, which is the point. The worked fix shows the round-trip count dropping from 21 to 1 on a 20-invoice page.

**Diagnosis is hands-on, not theoretical.** The student must leave able to *prove* an N+1 exists, not just suspect it. Drizzle's `logger: true` is the lever: turn it on, render the page, count the near-identical SQL statements scrolling past. This is the bridge to lesson 3 — but draw the boundary sharply: `EXPLAIN ANALYZE` is the *wrong* tool for N+1, because each individual statement's plan looks fine. N+1 lives at the call-site shape, not in any single query's plan. Stating this explicitly prevents the student from conflating the two diagnostic skills the chapter teaches.

**Pedagogical load management.** Start with the simplest, worst shape (a `for` loop with `await` inside) so the cost is obvious and sequential. Then introduce `Promise.all` as the "tempting wrong fix" — this ordering makes the parallel-isn't-a-fix point land because the student just felt the sequential pain. Then generalize to the four shapes, then the structural fix, then diagnosis, then the boundaries (cache isn't the fix, DataLoader is a different world, RSC trees are foreshadowed). Each step adds one idea.

**Cognitive-load note for downstream agents:** resist the urge to re-teach `with` or join mechanics — link back to chapter 038 and keep the fix code minimal. The fix should feel anticlimactic ("oh, it's just the API I already know") — that anticlimax *is* the lesson: the right data-access tool makes N+1 a non-event.

## Lesson sections

### Introduction (no header)

Open with the concrete failure: a list page that loads invoices and, for each, its line items. On the dev seed it's instant. In production, a customer with 800 invoices loads the same page and it takes 6 seconds — or the connection pool errors out. State the senior question implicitly: *when a list of N rows produces N+1 database round-trips, what code shape caused it and what's the fix?* Preview the takeaway skill: spotting the shape in code review and collapsing it into one query. Keep it to a short warm paragraph. Connect to what they know: they wrote both the fix tools (`with`, joins) in chapter 038 — this lesson is about *recognizing when they forgot to use them.*

### The shape of the bug

Teach the canonical shape with the worst, most legible version first: the `for`-loop-with-`await`.

- Show the naive code: `const invoices = await db.select().from(invoices)...` returns N rows, then `for (const inv of invoices) { const items = await db.select().from(lineItems).where(eq(lineItems.invoiceId, inv.id)); ... }`. Use a plain `Code` block — the shape is short and the badness should be immediately visible.
- Name the arithmetic: 1 query for the parent list + N queries for the children = **N+1**. For a 20-invoice page, 21 statements. For 800, 801.
- Drive home *why each round-trip costs*: every statement is a separate parse + plan + execute in Postgres plus a network round-trip across the connection pool. Even at ~2ms each, 800 of them serially is well over a second of pure waiting, most of it network latency the database isn't even busy for.
- Introduce the diagnostic question that the whole lesson trains: **"Is this query running once, or once per row?"** Put it in an `Aside` (tip) so it stands out as the reusable reflex.

Use a **`DiagramSequence`** here to make the round-trip cost tangible. Pedagogical goal: turn an abstract "N+1" into a felt count of trips between app and database. Steps:
1. App sends query 1 → DB returns 20 invoice rows. Caption: one round-trip, the parent list.
2. App loops, sends a line-items query for invoice #1 → DB returns its rows. Caption: round-trip 2.
3. Same for invoice #2 → round-trip 3. Caption: and again.
4. Collapsed view showing "…round-trips 4 through 20…" then the total: 21 round-trips for one page. Caption: each row paid its own trip to the database.

Render the app and DB as two labeled columns with arrows between them (simple HTML/CSS inside each `DiagramStep`, two boxes + an arrow that lights up per step). Keep it horizontal and compact per the vertical-space constraint.

### Why `Promise.all` doesn't fix it

The crux section. The student's instinct after the previous section is "make the loop parallel." Show that instinct, then dismantle it.

- Show the rewrite with **`CodeVariants`** (two tabs, before/after framing of the *same wrong idea at two speeds*):
  - Tab "Sequential loop": the `for`-`await` from the previous section. Prose: "N+1, run one at a time — slowest form."
  - Tab "`Promise.all`": `await Promise.all(invoices.map((inv) => db.select().from(lineItems).where(eq(lineItems.invoiceId, inv.id))))`. Prose: "Faster, *still* N+1 — the database does the exact same N+1 work, now concurrently."
- The core explanation, in prose: **`Promise.all` parallelizes JavaScript awaits; it does not collapse database queries.** The database still parses, plans, and executes N statements. The connection pool still serves N round-trips (and now N *concurrent* checkouts, which can starve the pool — foreshadow lesson 4). The win over the sequential loop is real (parallel network instead of serial), but the structural problem — N+1 statements — is untouched. The new latency floor is the slowest statement in the batch, not one query's worth.

Use a **`Figure`** with a simple HTML/CSS diagram to separate the two layers the student is conflating. Pedagogical goal: make visible that `Promise.all` operates on the *JS-await layer* while the *database round-trip layer* below it is unchanged. Two stacked lanes:
- Top lane "JavaScript": sequential version shows awaits end-to-end in a line; parallel version shows them stacked/overlapping. This layer *did* change.
- Bottom lane "Database round-trips": both versions show the same N+1 tick marks. This layer *did not* change.
Caption: `Promise.all` rearranges the top lane and leaves the bottom lane — the one that actually costs — identical.

End the section by naming the legitimate use so the student doesn't over-correct into fearing `Promise.all`: it is correct and senior when the queries are *different* — fetching invoices, the current org, and the user's notifications concurrently for one page. The smell is specifically `Promise.all` over the *same query shape parameterized by id*. Connect to the code convention: `Promise.all` for *independent* parallel awaits; the dependency-and-sameness check is the reflex before adding it.

### The four shapes N+1 hides in

Generalize the recognition skill. The student has seen two shapes (loop, `Promise.all`); name all four so they recognize the bug regardless of disguise. Keep each tight — one short code fragment + one line. Consider a compact `Code` block per shape, or group as four short fragments in prose.

- **Loop with `await` inside** — sequential N+1, the worst and most obvious form.
- **`Promise.all` over a parameterized map** — parallel N+1; faster, same bug, hardest to spot because it *looks* like good concurrent code.
- **An RSC tree where each card fetches its own data** — `<InvoiceCard id={inv.id} />` and the card awaits its own line-items query. The N+1 is spread across the component tree instead of one function, so it's invisible in any single file. Name that chapter 094 owns the component-tree (RSC waterfall) version at depth; here it's just one more disguise to recognize.
- **A `findMany` followed by a `findFirst` per row** — the relational-API version of the same bug. Ironic because the tool that *prevents* N+1 (`db.query`) is being used in the shape that *causes* it.

Close with the code-review heuristic as the section's payload: scan for `Promise.all`, `for (const … of …)`, and `.map(` sitting near a `db.` call; and for component trees where a leaf fetches. Then ask the once-or-once-per-row question. Put the heuristic in an `Aside`.

**Exercise — `Buckets`** at the end of this section. Goal: drill the recognition reflex across disguises. Two buckets: "N+1 (one query per row)" and "Fine (one query, or independent queries)". Chips (short code snippets in backticks): the four bad shapes above; plus correct foils — `db.query.invoices.findMany({ with: { lineItems: true } })`, a single `innerJoin`, and a `Promise.all` over *three different* queries (invoices + org + user). Grading: each chip's `bucket` is its correct category. This forces the student to distinguish "same query parameterized by id" (bad) from "different queries in parallel" (fine) — the exact line the lesson draws.

### One query instead of N

The fix. Make it deliberately anticlimactic: the tools are the ones they already wrote in chapter 038.

- **The relational query API — the default for tree-shaped reads.** Show `db.query.invoices.findMany({ with: { lineItems: true } })`. It emits *one* SQL statement that aggregates child rows into a JSON array per parent; the result is a typed `Invoice & { lineItems: LineItem[] }[]`. One round-trip. Reference lesson 3 of chapter 038 for the mechanics rather than re-teaching them.
- **A join with `db.select` — when the shape is flat or aggregates enter.** When you need a flat projection (columns from both tables) or a `count`/`sum`, hand-write the `innerJoin`/`leftJoin` (lesson 2 of chapter 038) and group in app code if the parent-with-children shape matters. One statement either way.
- The decision is shape-driven, not performance-driven: tree-shaped nested read → relational API; flat or aggregated → join. Both are one round-trip; both are fully typed.

**Worked example — fix in place.** Use **`CodeVariants`** (three tabs) on the running invoices example:
- Tab "N+1 (`Promise.all`)": the broken parallel version. Prose: "21 statements for a 20-invoice page."
- Tab "Fixed (relational API)": `db.query.invoices.findMany({ with: { lineItems: true } })`. Prose: "1 statement. Note: no hand-written `InvoiceWithItems` type — the shape is inferred."
- Tab "Fixed (join)": the `innerJoin` flat version for when a projection or aggregate is needed. Prose: "1 statement, flat rows, group in app code if you need the nested shape."

Call out two wins explicitly in prose after the variants: (1) round-trips drop 21 → 1; (2) the **inferred-type win** — the relational result type is reusable as a Server Component prop, no hand-typed `InvoiceWithItems` interface (tie back to the chapter 038 inferred-types thread).

**Exercise — `DrizzleCoding`** at the end of this section. Goal: the student converts an N+1 into one query, hands-on, and the grader proves the result shape is right. Setup: seed `invoices` + `lineItems` (a few invoices, a few line items each, one org). `instructions`: "This page fetches each invoice's line items in a separate query. Rewrite it as a single query that returns each invoice with its `lineItems` array." `starter`: the relational `findMany` with `with:` left blank (or a `db.select` they must extend) — give them the scaffold so they practice the *fix shape*, not blank-page syntax (guided over sandbox). `expectedRows`: invoices each carrying their nested `lineItems`. Note for the builder: confirm PGlite + DrizzleCoding supports the relational `with` traversal (needs the relations graph available to the widget); **if `with` isn't supported in the widget runtime, fall back to a join-based `DrizzleCoding` where the expected rows are the flat joined shape**, and teach the relational-API fix via `CodeVariants` prose only. Flag this clearly so the build agent verifies before committing.

### Proving it with query logging

Make diagnosis hands-on. The student should leave able to *catch* N+1, not just reason about it.

- **Drizzle's `logger: true`.** Setting `logger: true` on the Drizzle client logs every emitted SQL statement to the console. Turn it on in dev, load the page, and N+1 announces itself: N near-identical `select … from line_items where invoice_id = $1` lines scrolling past back-to-back. Show a `Code` block of representative logged output — 1 invoices query followed by ~5 identical line-items queries — so the student knows the *visual signature* to look for.
- Note this is wired in the chapter 040 project setup; here it's introduced as the diagnostic lens. The metric to watch is **statements-per-render**, not statements-per-user (a request-scoped cache can hide repeat statements within one render — see next section).

**The `EXPLAIN ANALYZE` boundary — why it's the wrong tool here.** Critical conceptual point, give it real space:
- Plan-level work does *not* appear N times in any one plan. Each individual statement in the N+1 batch has a *fine* plan — a fast index scan on `invoice_id`. The cost of N+1 is round-trip latency and connection overhead summed across N statements, none of which shows up in a single query's plan.
- Therefore N+1 is **invisible to plan inspection alone**. It lives at the call-site shape, not in the SQL. State the division of labor plainly: lesson 3 of chapter 039 teaches `EXPLAIN ANALYZE` for when *one* query is slow; *this* lesson's diagnostic (statement counting via the logger) is for when *many* queries are firing. Different bug, different tool. Put the one-line summary in an `Aside` (note).

### Why caching, batching, and DataLoader aren't the answer here

Close the loop by ruling out the tempting non-fixes, so the student's mental model is precise: the *only* fix is to reshape the data access.

- **The cache is not the fix.** A request-scoped cache (React's `cache`, Next's `'use cache'`) hides the N+1 from the *user on a warm hit* but doesn't fix it: the database still ran N queries the first time, the cache still expires, and the structural shape is still wrong. Worse, a cache *masks the bug in dev* — when the same component renders twice and only the first render pays, the logger shows fewer statements than production will. Cache is for cross-component reuse of the *same* query, not for collapsing N *parameterized* queries into one. (Reference chapter 033 for caching proper; don't teach it here.)
- **DataLoader — named and deferred.** The DataLoader pattern (batching `.load(id)` calls within a tick into one query) is the GraphQL/resolver world's answer to N+1. In a Server Component + Server Action codebase with Drizzle, the relational query API solves the same problem at the query layer with full typing and no extra machinery. DataLoader earns its weight in resolver-style codebases (GraphQL servers, deeply-nested tRPC routers) where the call sites can't see each other. Name it for recognition; the course does not teach it.
- **Don't regress the fix.** Dropping `with` "for performance" and re-introducing the per-row fetch by hand is a regression, not an optimization. If a wide `with` tree over-fetches (pulls child columns you don't need), the fix is `columns: { … }` projection on the relation — *re-shape* the one query, don't split it back into N.

End with the production-stakes callback as the lesson's closing line: an N+1 across 20 dev rows is fine until production scales it to 5,000. Design for the load, not the dev sample. A trained reviewer catches this shape before it ships — that reviewer reflex is what this lesson bought you.

### Terms for `Term` tooltips

Be strategic — only these:
- **N+1** — first use: "One query to fetch N parent rows, then one more query per row to fetch its children — N+1 queries where one would do."
- **round-trip** — "One request-and-response cycle between the app and the database over the connection pool; its cost is mostly network latency, paid per statement."
- **connection pool** — brief: "A fixed set of reused database connections shared across requests; each in-flight query holds one until it returns." (Prerequisite from chapter 036; redefine concisely, don't re-teach.)
- **DataLoader** — "A batching utility from the GraphQL world that coalesces many per-id loads within one tick into a single query."

## Scope

**Prerequisites to restate concisely, not re-teach:**
- The relational query API (`db.query.<table>.findMany`, `with`) — mechanics owned by lesson 3 of chapter 038. Here: use it as the fix, link back, show only the call shape.
- Joins (`innerJoin`/`leftJoin`, labeled vs. flat selection) — owned by lesson 2 of chapter 038. Here: the flat-shape alternative fix, link back.
- `Promise.all` for independent parallel awaits — the student met it in chapter 038 and it's in the code conventions. Here: only the *misuse* (parameterized-by-id) is the subject.
- Connection pool / pooled connection — from lesson 4 of chapter 036. One-line `Term` redefinition only.

**Explicitly out of scope (do not teach here):**
- Relational query API mechanics at depth (nested `with`, relation filtering, projection internals) — lesson 3 of chapter 038.
- Join algorithms and join syntax at depth — lesson 2 of chapter 038.
- `EXPLAIN ANALYZE`, plan trees, node types — lesson 3 of chapter 039. Mention *only* to draw the boundary (N+1 is invisible to plan inspection); do not teach how to read a plan.
- Index strategy (FK indexes that make the *fixed* join fast) — lesson 1 of chapter 039. The fixed query benefits from the FK index on `invoiceId`, but that's lesson 1's territory — at most a one-line pointer, no index teaching.
- The RSC waterfall / component-tree parallel-data problem at depth — chapter 094. Named here as the fourth disguise only.
- Caching strategy (`cache`, `'use cache'`, tags) — chapter 033. Named here only to rule it out as the fix.
- DataLoader implementation — out of scope entirely; named for recognition.
- Transactions and pool starvation at depth — lesson 4 of chapter 039. The pool-contention angle of `Promise.all` N+1 is a one-line foreshadow, not a transactions lesson.
- Setting up the Drizzle client / `logger` wiring — chapter 040 project setup. Here `logger: true` is used as a diagnostic, not configured from scratch.

## Code conventions notes

- Data-access code should read like the project's `db/queries/` helpers (verb-led functions, e.g. `listInvoicesWithItems`), per the Drizzle conventions. Keep examples in that shape where it doesn't add noise.
- Snake-case mapping is on the client (`casing: 'snake_case'`), so example code references camelCase TS properties (`lineItems.invoiceId`) while logged SQL shows `line_items.invoice_id` — this is expected and worth a one-line note when showing logged output, so the camelCase-vs-snake_case gap doesn't confuse the student.
- **Deliberate divergence for pedagogy:** the project forbids bare `db.<table>` once `tenantDb(orgId)` exists (Unit 10+), but tenancy hasn't been taught yet at chapter 039. Use plain `db.query.invoices` / `db.select().from(invoices)` here; do *not* introduce `tenantDb`. Downstream agents: this is intentional, not a convention miss.
- `Promise.all` examples align with the convention (independent parallel awaits good; the lesson's contribution is naming the parameterized-by-id misuse).
