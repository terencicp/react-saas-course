# Chapter 6.3 — Querying and mutating

## Chapter framing

Chapter 6.3 turns the schema from 6.2 into a data-access surface. By the end the student writes every shape of read and write a SaaS feature needs against the `db/schema.ts` from the previous chapter — single-row and multi-row selects, four kinds of joins, the relational query API for nested reads, aggregations with grouping and filtering, upserts with `RETURNING`, cursor and offset pagination, subqueries and CTEs for layered logic, light Postgres full-text search, JSONB read paths, and the narrow raw-SQL escape hatch. No new schema artifacts are introduced; every query consumes the tables, types, and relations from 6.2. The chapter sits between 6.2 (schema as source of truth) and 6.4 (performance and integrity) — it teaches what to write, then 6.4 teaches how to make it fast and transactional.

Threads that run through every lesson: Drizzle's query builder parameterizes by default — every `${value}` interpolation in the `sql\`\`` template and every `eq(col, value)` becomes a `$1` placeholder, so SQL injection is a non-issue and that's named explicitly the first time the student writes a `where`; queries return `$inferSelect` shapes when the projection is the whole row and narrower inferred shapes when columns are picked, never hand-typed; the relational query API (`db.query.table.findMany`) is the senior default for tree-shaped nested reads, hand-written `db.select().from().leftJoin(...)` is the reach for aggregates, complex predicates, and non-tree shapes; `RETURNING` on every mutation that needs the post-write row — round-trip elimination is the default, a separate select is the smell; cursor pagination is the default for any list that will grow past a few hundred rows or shows live data, offset is the carve-out for small admin tables; raw `sql\`\`` is the last resort, always parameterized, never `sql.raw` with user input. The chapter ships ten teaching lessons plus a quiz, ordered by dependency: CRUD basics, joins, relational API, aggregations, upserts, pagination, subqueries/CTEs, full-text, JSONB, raw SQL, quiz.

---

## Lesson 6.3.1 — Select, insert, update, delete; where, orderBy, limit; parameterization

Topics to cover:

- **The senior question.** Given a Drizzle schema, what's the smallest set of call shapes that covers 90% of a SaaS feature's data access? The lesson lands `db.select`, `db.insert`, `db.update`, `db.delete` plus the four chain methods `where`, `orderBy`, `limit`, `offset` — and why every dynamic value flows through Drizzle's parameterization.
- **The `db` client, recapped.** `db` from `db/index.ts` (wired in 6.5 setup) is the only call site for queries. Imported alongside the schema tables.
- **`db.select` — the read shape.** `db.select().from(invoices)` returns `Invoice[]`. Column projection: `db.select({ id: invoices.id, total: invoices.total }).from(invoices)` narrows the inferred return type to exactly those fields — no `Pick<Invoice, ...>` restated. `.from()` is mandatory; missing it is the most common first error.
- **`where` and the operator helpers.** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `like`, `ilike`, `between` from `drizzle-orm`. Combined with `and(...)`, `or(...)`, `not(...)`. Example: `where(and(eq(invoices.organizationId, orgId), eq(invoices.status, 'sent')))`.
- **Parameterization, named explicitly.** Every value in `eq(col, value)` and every `${value}` in a `sql\`\`` template becomes a `$1` placeholder bound separately by the driver. SQL injection is structurally impossible through these paths. The escape hatch where it isn't: `sql.raw(userInput)` — never use with untrusted input (owned at depth in 6.3.10).
- **`orderBy` — the sort.** `orderBy(asc(invoices.createdAt))` or `desc(...)`. Multiple keys: `orderBy(desc(invoices.createdAt), asc(invoices.id))` — a tiebreaker is what makes ordering deterministic, the same trick cursor pagination depends on (6.3.6).
- **`limit` and `offset`.** `limit(20).offset(40)`. Senior reach: offset is fine for fixed small lists (admin tables under a few hundred rows); cursor wins for everything else. Full decision in 6.3.6.
- **`db.insert`.** `db.insert(invoices).values({ ... })` or `.values([{...}, {...}])` for batch. Defaults from 6.2.4 (`.defaultNow()`, `.$defaultFn(...)`) fill in; `.notNull()` without a default is required; generated columns rejected. Types come from `$inferInsert`.
- **`db.update`.** `db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, id))`. A missing `where` updates every row — Drizzle does not warn. The senior pattern: every update has a `where` clause; lint rule or code-review discipline catches the omission.
- **`db.delete`.** `db.delete(invoices).where(eq(invoices.id, id))`. Same missing-`where` failure mode. Soft delete (`update` with `deletedAt`) is the senior default for most SaaS rows; hard delete is for tenant offboarding and audit-log expiry (Chapter 6.4 owns the pattern at depth).
- **`.returning()` — the round-trip.** Attaches a `RETURNING` clause to insert/update/delete. Returns the affected rows with full `$inferSelect` shape (or a projected subset). Eliminates a follow-up select for the just-written row. Full coverage in 6.3.5 (upserts) but introduced here because every mutation in the chapter uses it.
- **Reading one vs. many.** `.limit(1)` then destructure the first element, or `await query` and `.at(0)`. There's no `.findFirst` on the SQL builder — that lives on the relational API (6.3.3).
- **Async shape.** Every query is a thenable — `await db.select()...` works, `.then(...)` works. The query builder is lazy; nothing executes until awaited or `.execute()`-d.
- **Watch-outs:** missing `where` on `update`/`delete` updates or deletes every row silently — make this a code-review trigger; chaining order doesn't matter in Drizzle (`.where().orderBy()` vs. `.orderBy().where()` build the same SQL), but consistency aids readability; `.limit(0)` returns an empty array — distinct from forgetting `.limit` entirely; `like` is case-sensitive, `ilike` is the case-insensitive form Postgres provides natively; passing a raw template literal with `\`${userInput}\`` outside the `sql` tag drops parameterization — use `sql\`...${userInput}...\`` so the binding fires.

What this lesson does not cover:

- Joins across tables — Lesson 6.3.2.
- The relational query API (`db.query.…`) — Lesson 6.3.3.
- Upserts and `RETURNING` at depth — Lesson 6.3.5.
- Cursor pagination — Lesson 6.3.6.
- Aggregations and grouping — Lesson 6.3.4.
- Soft-delete patterns at depth — Chapter 6.4.
- Indexing the columns used in `where` and `orderBy` — Chapter 6.4.1.

Estimated student time: 45 to 55 minutes. Load-bearing for every later lesson in the chapter.

---

## Lesson 6.3.2 — Joins: inner, left, right, full

Topics to cover:

- **The senior question.** When the result needs columns from two tables, what join shape does the senior pick — and what does each one do when a side is missing? Inner, left, right, full each answer a different question about absence.
- **The four join shapes.** `innerJoin` returns only matched pairs; `leftJoin` returns every left row and `null` for missing right; `rightJoin` is the symmetric form (rare in practice — re-order tables instead); `fullJoin` returns both sides with `null` where missing. The senior reach is `innerJoin` and `leftJoin`; the other two are named for recognition.
- **The call shape.** `db.select({ invoice: invoices, org: organizations }).from(invoices).innerJoin(organizations, eq(invoices.organizationId, organizations.id))`. The selection object groups columns under a label per joined table; the result is `{ invoice: Invoice; org: Organization }[]`.
- **Selecting columns from a join.** Project explicitly: `db.select({ id: invoices.id, total: invoices.total, orgName: organizations.name }).from(invoices).innerJoin(...)` — a flat shape, narrower types, no `null` for inner join columns.
- **Left join and nullability.** `leftJoin` makes every column from the right side `T | null` in the inferred result. The type system surfaces the "did this match?" question. Senior pattern: pick what you need, narrow with a `where` if the relationship must exist anyway, or use the relational API (6.3.3) for the typical case.
- **The relational-API parallel.** Most join-heavy reads in this course go through the relational query API; raw `db.select(...).join(...)` is the reach when the projection is irregular, the predicate references multiple joined tables, or aggregates enter (6.3.4).
- **Self-joins.** Same table twice — needs aliasing. `const replyTo = alias(comments, 'replyTo')` then `leftJoin(replyTo, eq(comments.replyToId, replyTo.id))`. Brief mention; rare in SaaS day-to-day.
- **Many-to-many through a junction.** Two joins: `invoices` → `invoice_tags` → `tags`. Worked example with `innerJoin` on both legs. Foreshadows the relational API's `through` shortcut (6.3.3).
- **`USING` and natural joins.** Postgres supports both; Drizzle exposes `useIndex`/`forceIndex` on joins but not a Drizzle-level `USING` shortcut — write the `on` predicate explicitly. Named for recognition, not used.
- **Watch-outs:** `rightJoin` reads worse than the equivalent `leftJoin` with tables flipped — flip; missing a `where` on the join key produces a cross product silently — every join needs an `on` predicate; left-join nullability is structural, the type checker enforces it but downstream code often skips the narrowing — keep result types honest by handling the `null` branch; joining many large tables without indexes on FK columns is the slowest query in the chapter — 6.4.1 owns the fix; column-name collisions between joined tables force the labeled selection shape — name groups by table.

What this lesson does not cover:

- The relational query API as the higher-level join alternative — Lesson 6.3.3.
- Aggregations across joins (`GROUP BY` with joined columns) — Lesson 6.3.4.
- Indexing FK columns for join performance — Chapter 6.4.1.
- The N+1 problem when joins are avoided — Chapter 6.4.2.
- `EXPLAIN ANALYZE` on join plans — Chapter 6.4.3.

Estimated student time: 40 to 50 minutes. Load-bearing for 6.3.4 (aggregations) and 6.3.7 (subqueries/CTEs).

---

## Lesson 6.3.3 — The relational query API for nested reads

Topics to cover:

- **The senior question.** When the read is a tree — an invoice with its line items, its tags, and its organization — what call shape returns a typed nested object without hand-writing three joins? Drizzle's relational query API (`db.query.…`) is the senior default for tree-shaped reads; it consumes the `defineRelations` graph from 6.2.9 and emits one SQL statement that solves N+1 by construction.
- **`db.query.<table>.findMany` and `findFirst`.** `findMany` returns an array, `findFirst` returns the single row or `undefined`. Both accept `where`, `orderBy`, `limit`, `offset`, `columns` (projection), `with` (relation traversal) options. The function-callback form of `where`: `where: (invoices, { eq, and, gt }) => and(eq(invoices.organizationId, orgId), gt(invoices.total, '0'))`.
- **`with` — traversal.** `with: { lineItems: true, organization: true }` loads each relation declared in `db/relations.ts`. Returns a typed nested shape: `Invoice & { lineItems: LineItem[]; organization: Organization }`.
- **Nested `with`.** Recurse: `with: { lineItems: { with: { product: true } } }`. Postgres handles it in one query; types stay inferred.
- **Column projection on nested results.** `with: { organization: { columns: { id: true, name: true } } }` narrows the joined shape — the same narrowing pattern as the top-level `columns` option.
- **Filtering joined rows.** `with: { lineItems: { where: (li, { gt }) => gt(li.quantity, 0) } }` — filters which line items load per invoice without dropping the parent.
- **Filtering by joined-table values.** The relational API now supports filtering parent rows by joined-table predicates: `where: (invoices, { exists }) => exists(...)` — fall back to `db.select(...).where(exists(...))` if the predicate gets gnarly.
- **One SQL statement, not N+1.** Drizzle compiles the relational query to a single statement with subqueries that aggregate child rows into JSON arrays. The result is shaped on the client. No round-trip per row — the relational API is N+1-safe by construction. Contrast with hand-written code that fetches invoices then loops issuing per-invoice line-item queries (the classic N+1 — owned at depth in 6.4.2).
- **Many-to-many traversal.** Relations declared with `through: r.invoiceTags` (6.2.9) are walked automatically: `with: { tags: true }` on an invoice resolves the junction without the student naming it.
- **When to skip the relational API.** Drop to `db.select().from().leftJoin(...)` (6.3.2) when: aggregates enter the projection (6.3.4); predicates span multiple joined tables in irregular ways; the projection is irregular (a flat shape with columns from three tables); the query plan needs hand-tuning. Both APIs return Drizzle-typed results; the choice is shape-driven.
- **The result-type capstone.** `Awaited<ReturnType<typeof db.query.invoices.findMany<{ with: { lineItems: true } }>>>` — the relational API's inferred return type is reusable as a Server Component prop, no hand-typed `InvoiceWithItems` interface needed.
- **Watch-outs:** `db.query` returns `undefined` for relations not declared in `defineRelations` — the compiler doesn't warn, the field is just missing from the inferred shape; large `with` trees can produce wide JSON aggregations — `EXPLAIN ANALYZE` (6.4.3) when something feels slow; nested `where` clauses filter child rows, not parent rows — to drop parents based on child existence, fall back to `db.select` with `exists(...)`; `findFirst` returns `undefined`, not throws — guard or use `findFirstOrThrow` (when offered) for the not-found-is-a-bug path.

What this lesson does not cover:

- The schema-side `defineRelations` API — Chapter 6.2.9.
- Aggregations across the relational API — Lesson 6.3.4 (uses `db.select`).
- The N+1 problem and how to spot it in code that bypasses this API — Chapter 6.4.2.
- Plan inspection — Chapter 6.4.3.

Estimated student time: 45 to 55 minutes. Load-bearing for every nested read in Units 5 through 23.

---

## Lesson 6.3.4 — Aggregations: count, sum, GROUP BY, HAVING

Topics to cover:

- **The senior question.** When the answer is a number per group — invoices per org, revenue per month, top tags by usage — what does the query shape look like? `db.select` with `count`, `sum`, `avg`, `min`, `max`, `countDistinct`, `sumDistinct` helpers, `groupBy`, and `having`.
- **The aggregate helpers.** From `drizzle-orm`: `count(column)`, `count()` for `COUNT(*)`, `countDistinct(column)`, `sum(column)`, `sumDistinct(column)`, `avg(column)`, `min(column)`, `max(column)`. Inferred return types: `number` for counts, `string` for `sum`/`avg` over `numeric` (precision preserved, same as 6.2.3).
- **The shape.** `db.select({ orgId: invoices.organizationId, total: sum(invoices.total) }).from(invoices).groupBy(invoices.organizationId)`. Every non-aggregated column in the selection must appear in `groupBy` — Postgres enforces this, Drizzle surfaces the error at query time.
- **`groupBy` over joined columns.** `db.select({ orgName: organizations.name, count: count(invoices.id) }).from(invoices).innerJoin(organizations, ...).groupBy(organizations.id, organizations.name)` — group by the FK side, not the inflated row count from the join. Worked example.
- **`having` — predicates on aggregates.** `having(gt(sum(invoices.total), '1000'))` filters groups, runs after grouping. Contrast with `where` (filters rows before grouping). The mental model: `where` reduces rows in, `having` reduces groups out.
- **Counting with conditions — `count(case...)` and filtered aggregates.** Postgres 9.4+ supports `FILTER (WHERE …)` on aggregates — `sql\`count(*) filter (where ${invoices.status} = 'paid')\`` returns the paid count alongside the total. The senior reach when one query needs several conditional counts.
- **`distinct` and `distinctOn`.** `db.selectDistinct(...)` for row-level distinct; `db.selectDistinctOn([invoices.organizationId])` for Postgres' "first per group" idiom — pairs with `orderBy` to control which row wins per group.
- **Common SaaS aggregate queries.** Per-org invoice count and total; monthly revenue (group by `date_trunc('month', createdAt)` via `sql\`\``); top N tags by usage with a `having count > threshold`.
- **Numeric precision boundary.** `sum` over `numeric(12,2)` returns a string in TS (as in 6.2.3). Application formats on display; arithmetic in JS only after conversion (and with caveats).
- **Inferred-type behavior.** `db.select({ count: count() })` infers `{ count: number }[]`; the projection key is the TS field name. Naming the aggregate explicitly is part of the API.
- **Watch-outs:** missing a non-aggregated column in `groupBy` is the most common aggregate error — Postgres rejects, the diagnostic message names the missing column; aggregates over a left-joined table count `null`s as zero rows (joined `null` rows don't contribute) — verify with a small fixture if the count looks off; `count(*)` and `count(column)` differ when the column is nullable — count(*) counts rows, count(column) counts non-null values; `sum` over an empty result returns `null`, not `0` — handle the absent case in app code or `coalesce(sum(...), 0)`.

What this lesson does not cover:

- Window functions (`OVER`, `PARTITION BY`) — named once, deferred to 6.3.7 only if useful for CTEs.
- The relational query API for aggregates — drop to `db.select` for aggregates.
- Materialized views and pre-aggregated summary tables — out of scope.
- Index strategy for aggregate queries — Chapter 6.4.1.

Estimated student time: 40 to 50 minutes. Load-bearing for dashboard queries and reporting reads later in the course.

---

## Lesson 6.3.5 — Upserts with ON CONFLICT and RETURNING

Topics to cover:

- **The senior question.** When the write is "insert if new, update if exists" — webhook idempotency, user-by-email creation, settings save — what's the atomic shape? `INSERT ... ON CONFLICT (...) DO UPDATE SET ...` is Postgres' answer; Drizzle's `onConflictDoUpdate` and `onConflictDoNothing` wrap it. `RETURNING` rounds out the call by handing back the post-write row.
- **Why upsert, not select-then-insert.** Read-then-write across two statements is a race — two requests can both see "absent" and both insert, producing a duplicate or a unique-violation error. Upsert is one statement, atomic in Postgres.
- **`onConflictDoNothing`.** `db.insert(events).values(payload).onConflictDoNothing({ target: events.externalId }).returning()` — webhook ingestion's idempotent-insert shape. `returning()` returns the new row if inserted, empty array if skipped — the way to tell which branch fired.
- **`onConflictDoUpdate`.** `db.insert(users).values({ email, name }).onConflictDoUpdate({ target: users.email, set: { name: sql\`excluded.name\` } }).returning()`. The `excluded` pseudo-table references the row that would have been inserted; using it instead of restating the value is the canonical "set the new value" pattern.
- **Target — what counts as a conflict.** `target` is the column or set of columns with the unique constraint or primary key. Composite: `target: [orgMembers.userId, orgMembers.organizationId]`. The constraint must already exist on the table (6.2.5/6.2.7); upsert doesn't define it, it references it.
- **`targetWhere` and `setWhere` — conditional upsert.** `targetWhere: sql\`deleted_at is null\`` constrains which rows count as a conflict (paired with a partial unique index, 6.2.7); `setWhere: sql\`...\`` constrains which rows get the update — useful for "update only if newer." Both rarely used in basic SaaS; named for recognition.
- **`RETURNING` — the round-trip eliminator.** Append `.returning()` to insert, update, delete, and upsert. Returns the affected rows with `$inferSelect` shape. Projection: `.returning({ id: invoices.id, createdAt: invoices.createdAt })` narrows the result.
- **Why `RETURNING` matters.** Without it, the app issues a follow-up `select` to know the auto-generated id or updated columns — two round-trips, a race window, and code that bypasses Drizzle's inferred return type. With it, one statement, one type, no race.
- **Worked examples.** Webhook idempotent insert (`onConflictDoNothing` on `externalId` + `returning`); user-by-email find-or-create (`onConflictDoUpdate` setting `lastSeenAt` on conflict); settings upsert (one row per org, target on `organizationId`, set on every settings column from `excluded`).
- **Bulk upsert.** `.values([...])` accepts an array. The conflict resolution applies per row. Order matters for `RETURNING` — Postgres returns rows in insertion order.
- **The "set all from excluded" pattern.** Building the `set` object by mapping non-PK columns to `sql\`excluded.column_name\`` — a helper is the senior shape for tables with many columns. The course names the helper, doesn't ship it.
- **Watch-outs:** `target` must point at an existing unique or primary-key constraint — without it, Postgres raises "no unique or exclusion constraint matching the ON CONFLICT specification"; `onConflictDoNothing` without `returning()` gives no signal whether the row was new or skipped — use returning to branch; `excluded.column` is SQL-level — Drizzle exposes it via `sql\`excluded.${col.name}\``, not a typed builder; updating `createdAt` on conflict erases the original creation timestamp — usually wrong, exclude it from the set; bulk upserts where one row's conflict-set references another row's data don't fit this shape — use a CTE (6.3.7).

What this lesson does not cover:

- The schema-side unique and primary-key constraints — Chapter 6.2.5 / 6.2.7.
- Transactions wrapping multi-statement upsert workflows — Chapter 6.4.4.
- Webhook ingestion at depth (idempotency keys, replay protection) — Chapter 12.1.
- `db.update` with `where`-based "update or insert" patterns when upsert doesn't fit — covered inline above.

Estimated student time: 40 to 50 minutes. Load-bearing for webhook handlers, user-by-email find-or-create, and settings tables across the course.

---

## Lesson 6.3.6 — Pagination: cursor by default, offset when small

Topics to cover:

- **The senior question.** When a list could grow past a few hundred rows or shows data that changes while a user paginates, what's the right page-iteration shape? Cursor pagination is the senior default; offset is the carve-out for stable, small data.
- **Offset, recapped.** `limit(20).offset(40)` — works, easy to think about, fails at scale and on moving data. Two failure modes: (1) deep pages cost O(offset + limit) in Postgres because the engine still scans and discards skipped rows; (2) a row inserted or deleted between pages shifts every subsequent page by one, producing duplicates or skipped rows in the user's view.
- **When offset is fine.** Admin tables under a few hundred rows; total-count needs (offset pagination plays nicely with a "page 3 of 12" UI); read-mostly stable data. The threshold for switching to cursor: any list that could grow past low thousands, or any list users see during active mutation (a live feed, an inbox).
- **Cursor — the model.** A cursor is an opaque token that says "the last row I saw had this sort-key and this tiebreaker." The next page asks "rows after that." The query has the form `where: (t, { or, and, lt, eq }) => or(lt(t.createdAt, cursor.createdAt), and(eq(t.createdAt, cursor.createdAt), lt(t.id, cursor.id)))` paired with `orderBy(desc(t.createdAt), desc(t.id))` and `limit(pageSize)`. The tiebreaker (`id`) is mandatory — without it, rows sharing a sort-key value cause skipped or duplicated rows at the page boundary.
- **The tiebreaker rule.** Cursor stability requires deterministic ordering. Sort by the user-visible key (`createdAt`, `priority`); break ties with a unique column (the primary key); both directions in the cursor predicate. Same rule the relational query API obeys when it sorts.
- **Encoding the cursor — opaque base64.** Serialize the sort-key and tiebreaker to JSON, base64-encode, ship as a query-string token (`?cursor=eyJ…`). Opaque so clients don't depend on the encoding; reversible so the server can decode. The course encodes via `Buffer.from(JSON.stringify(...)).toString('base64url')`.
- **Decoding and validation.** Decode on entry; validate the decoded shape (Zod, 7.1) so a malformed cursor produces a 400, not a crash. The cursor is untrusted client input — same defense as any other parameter.
- **Page size as a query parameter.** `?pageSize=20` with a server-side cap (typical 100). Default page size lives in a constants file, not scattered through queries.
- **"Has next page" — fetch n+1.** Query `limit(pageSize + 1)`, then slice the first `pageSize` and check whether the extra row exists. If it does, there's a next page and its cursor is the last returned row's key. Cleaner than a separate count query.
- **Index requirement.** Cursor pagination is only fast when an index covers `(sortKey, tiebreaker)` in the same direction as the order. The composite index lives next to the schema (6.4.1 owns the mechanic). Worked example: `index('invoices_org_created_at_id_idx').on(invoices.organizationId, desc(invoices.createdAt), desc(invoices.id))`.
- **Tenant scoping inside the cursor.** Multi-tenant lists include `organizationId` in the `where` — the cursor doesn't carry it, the request does (from auth context). Putting `organizationId` in the cursor is a leak waiting to happen.
- **Bidirectional cursors.** Forward-only by default; "previous page" usually re-issues from the user's last known anchor. Twoidirectional cursors exist but the implementation cost rarely justifies the UX win.
- **Total counts.** Cursor pagination drops the "page 3 of 12" affordance. SaaS lists in 2026 generally show "200+" or skip the count; an exact count requires a separate `count()` query, sometimes cached.
- **Drizzle relational API and cursors.** Same model works through `db.query.table.findMany` — `where: (t, ops) => ...`, `orderBy: [desc(t.createdAt), desc(t.id)]`, `limit`.
- **URL-state pairing.** The cursor lives in the URL search params (full pattern in Chapter 5.5 and Chapter 11.1). Named here, owned later.
- **Watch-outs:** missing tiebreaker is the silent cursor bug — rows with equal sort-key values get skipped or duplicated, surfaces as "user reports missing rows"; sorting by a mutable column (e.g., `updatedAt`) means a row can hop pages — sort by stable timestamps for cursor lists; missing index turns cursor pagination into a sequential scan, undoing the whole win — verify with `EXPLAIN ANALYZE` (6.4.3); cursor reuse across schema changes (added or removed columns in the order key) silently breaks — version the cursor encoding if the sort changes.

What this lesson does not cover:

- URL-state synchronization for the cursor — Chapters 5.5 and 11.1.
- The composite index that makes cursor pagination fast — Chapter 6.4.1.
- Plan inspection on paginated queries — Chapter 6.4.3.
- Tenant scoping at the query layer in depth — Chapter 10.

Estimated student time: 50 to 60 minutes. Load-bearing for every list view in Units 7 through 18.

---

## Lesson 6.3.7 — Subqueries, CTEs, and when to layer the query

Topics to cover:

- **The senior question.** When the query needs two passes — filter rows first, then group; rank rows then take the top per group; reuse a sub-result — does it belong in app code, in a subquery, or in a CTE? The lesson teaches the three layered shapes and the cost trade-off.
- **Inline subquery — `db.select` inside a `where`.** `where(inArray(invoices.id, db.select({ id: invoices.id }).from(invoices).where(...)))`. Reads as "rows whose id is in this set." The same shape works with `exists`, `notExists`, `gt(col, (subquery))`. Drizzle types the subquery's projection so the surrounding query knows the column shape.
- **Subquery in `from` — the derived table.** `const recent = db.select({...}).from(invoices).where(...).as('recent')` then `db.select().from(recent).innerJoin(...)`. The `.as('alias')` names the derived table; columns reference `recent.column`. The senior reach when an aggregated or windowed sub-result needs to be joined.
- **`WITH` — common table expressions.** `db.with(...).select(...)`. A CTE is a named query the main statement references; multiple CTEs chain. Drizzle: `const recentInvoices = db.$with('recent_invoices').as(db.select({...}).from(invoices).where(...))` then `db.with(recentInvoices).select(...).from(recentInvoices).innerJoin(...)`. The CTE is materialized in Postgres by default (Postgres 12+ inlines simple CTEs unless `MATERIALIZED` is forced).
- **Subquery vs. CTE — the decision.** Inline subquery when the sub-result is referenced once and the query reads better with it inline; CTE when the sub-result is referenced multiple times, or when naming the sub-result makes the query readable. Postgres' planner generally produces equivalent plans for both; readability is the deciding factor.
- **Recursive CTEs.** `WITH RECURSIVE` for tree traversal (org-chart, comment threads, category hierarchies). Drizzle: `db.$withRecursive(...)`. Named, with a one-paragraph illustration; full recursion in a tree-heavy domain is rare in early SaaS.
- **`exists` and `notExists`.** `where(exists(db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoices.id))))` — "invoices that have at least one line item." Faster than a join + group for the existence question because Postgres short-circuits at the first match.
- **The app-code alternative.** When the sub-result is "give me these ids, then query for those rows" and the result-set is small, two app-code queries can be clearer than a CTE. Senior call: a CTE that nobody reads is a worse outcome than two queries that read straight. The rule: layer in SQL when the sub-result is large enough that round-tripping it through TS costs latency.
- **Worked example.** "Top three tags per organization by invoice count" — uses a CTE that computes per-org-tag counts, then `row_number() over (partition by ...)` to rank, then a final select with `where rank <= 3`. Demonstrates CTE plus window function in one shape.
- **Window functions, named.** `row_number()`, `rank()`, `dense_rank()`, `lag()`, `lead()`, `sum() over (partition by ...)`. Drizzle exposes them via `sql\`row_number() over (partition by ${col} order by ${col2})\``. Used inside a CTE or subquery; the chapter shows the shape, doesn't enumerate every function.
- **Watch-outs:** correlated subqueries (subquery references the outer row) run per outer row — fast on small outer sets, slow on large ones, the EXPLAIN plan shows the cost (6.4.3); `WITH ... AS MATERIALIZED` forces materialization and blocks planner optimization — use only when measurements justify it; `inArray` with a subquery that returns thousands of ids is slower than a join — pick the shape that matches the data; recursive CTEs without a termination condition loop until they hit a row limit — always include the base case and a guard.

What this lesson does not cover:

- Aggregations as the primary lesson — Chapter 6.3.4.
- Plan inspection for layered queries — Chapter 6.4.3.
- Materialized views as cross-query caches — out of scope.
- Window functions enumerated — named for recognition only.

Estimated student time: 45 to 55 minutes. Load-bearing for the project's report-style queries and any later analytics work.

---

## Lesson 6.3.8 — Light Postgres full-text search

Topics to cover:

- **The senior question.** When the SaaS app needs "search across invoice descriptions and customer names," is it a Postgres feature or a separate service (Algolia, Meilisearch, OpenSearch)? Postgres full-text search via `tsvector`/`tsquery` covers the workload up to roughly one to three million documents and modest query throughput — the senior default. External search wins beyond that, or when relevance tuning, faceting, and typo tolerance become the product.
- **The mental model — lexemes.** Postgres tokenizes text into lexemes (normalized word stems), stores them in a `tsvector`, and matches against a `tsquery` with the `@@` operator. Stop words and language-specific stemming are configured per language (`english`, `simple`, etc.).
- **The schema — generated `tsvector` column.** A STORED generated column from 6.2.4: `searchVector: tsvector('search_vector').generatedAlwaysAs(sql\`to_tsvector('english', coalesce(${invoices.description}, '') || ' ' || coalesce(${invoices.customerName}, ''))\`).notNull()`. Generated keeps it in sync with the source columns automatically; `coalesce` handles nullable inputs. The chapter covers the column shape here, the index lives in 6.4.1.
- **The GIN index — named, owned later.** `tsvector` columns need a GIN index for matching to be fast. Pointed at; full index lesson in 6.4.1.
- **`websearch_to_tsquery` — the user-input function.** `to_tsquery` requires manual operator syntax (`&`, `|`, `!`) — user-hostile. `websearch_to_tsquery('english', input)` parses Google-style queries (`quoted phrases`, `or`, `-excluded`) and is safe for direct user input. The 2026 default.
- **The query shape.** `where(sql\`${invoices.searchVector} @@ websearch_to_tsquery('english', ${searchTerm})\`)`. The `searchTerm` interpolation is parameterized — same SQL-injection safety as any Drizzle value.
- **Ranking — `ts_rank` and `ts_rank_cd`.** `orderBy(desc(sql\`ts_rank(${invoices.searchVector}, websearch_to_tsquery('english', ${term}))\`))`. Ranks results by relevance. Pair with a tiebreaker (PK) for stable pagination.
- **Headline / highlighting.** `ts_headline('english', invoices.description, websearch_to_tsquery(...))` returns the matched fragment with `<b>` tags around hits. Useful for search-result rendering.
- **Language and config.** The `'english'` argument selects the text search configuration — stop words and stemmer per language. For multilingual SaaS, store the language per row and pass it dynamically; for single-language, hardcode.
- **When to leave Postgres.** External search earns its weight when: dataset above a few million documents and query rate above a handful per second; advanced relevance (boost rules, learning-to-rank); typo tolerance and synonyms (Postgres' `pg_trgm` extension is the in-database escape hatch — named, deferred); faceted search across many fields; multi-language with on-the-fly language detection.
- **`pg_trgm` for fuzzy match — named.** Trigram similarity (`similarity(a, b)`, `a % b`, `a <-> b` distance) handles typos and partial matches. Lives next to full-text search; complements it. Mentioned for recognition, not taught at depth.
- **Worked example.** Add the generated `tsvector` column to `invoices`; write the `where ... @@ websearch_to_tsquery(...)` query; order by `ts_rank` with a tiebreaker; return a typed result.
- **Watch-outs:** querying `tsvector` without a GIN index falls back to a sequential scan — slow even at a few thousand rows (6.4.1 fixes); building `tsvector` at query time (`to_tsvector(...) @@ ...`) instead of indexing a generated column rebuilds the vector per row per query — generated column is mandatory at any real volume; `websearch_to_tsquery` and `to_tsquery` are different functions with different parsing rules — pick `websearch_to_tsquery` for user input; the `'english'` config drops stop words and stems aggressively — exact-match expectations need the `'simple'` config or a different strategy.

What this lesson does not cover:

- The GIN index on the `tsvector` column — Chapter 6.4.1.
- `pg_trgm` fuzzy matching at depth — named for recognition.
- External search services (Algolia, Meilisearch, OpenSearch) — out of scope.
- Vector / embedding search for semantic queries — Chapter 23 (AI integration) touches it.

Estimated student time: 40 to 50 minutes. Load-bearing for search affordances in the project chapters and later UI lessons.

---

## Lesson 6.3.9 — JSONB columns and querying

Topics to cover:

- **The senior question.** When does flexible structured data belong in a `jsonb` column vs. promoted to real columns? And once it's there, what's the read path that stays fast and typed? The lesson lands the trigger (heterogeneous payloads, audit details, third-party webhook bodies) and the operator set (`->`, `->>`, `@>`, `jsonb_path_query`).
- **When to reach for `jsonb`, restated.** Webhook bodies (the third-party owns the shape); audit-log details (a polymorphic payload per event type); user-provided metadata where the keys aren't fixed. Skip when: anything you'd filter on across all rows — promote to a real column with an index; anything you'd sort on; anything two consumers need to agree about the shape of.
- **`jsonb` column with `$type<…>`.** From 6.2.3: `payload: jsonb('payload').$type<WebhookEvent>().notNull()`. Drizzle reads the column as the annotated TS type; Zod (7.1) validates on write. The `$type` is a TS-side claim — Postgres still stores arbitrary JSON; the contract holds only as far as the write path enforces it.
- **Reading whole-column.** `db.select({ payload: events.payload }).from(events)` returns the full object, typed as `WebhookEvent`. No special operator needed.
- **Reading nested fields — `->` and `->>`.** `->` returns a JSON value (still JSONB), `->>` returns text. In Drizzle: `sql\`${events.payload}->>'eventType'\`` — interpolated key is a string literal in SQL. The result is text; cast with `::int` or via Drizzle's `sql<number>\`...::int\`` for typed retrieval. Senior pattern: read narrow fields via `->>` when only a piece is needed.
- **Containment — `@>` for matching.** `where(sql\`${events.payload} @> ${{ status: 'paid' }}::jsonb\`)` — "rows whose payload contains this object." The most-used JSONB query operator; GIN-indexable (6.4.1). Drizzle binds the right-hand side as a parameter.
- **Key existence — `?`, `?|`, `?&`.** `?` checks one key, `?|` any of several, `?&` all. Less common than `@>` but the right tool when "this key is set" is the question.
- **Path queries — `jsonb_path_query`.** SQL/JSON path expressions (`$.items[*] ? (@.qty > 10)`) for navigating nested arrays. Named; the worked example uses `@>` instead because containment covers most needs.
- **Indexing JSONB — named, owned by 6.4.1.** GIN indexes for general containment; `jsonb_path_ops` operator class for a smaller index when only `@>` is needed; expression indexes on specific extracted fields when one path is hot. Pointed at; 6.4.1 owns the lesson.
- **Migrating `jsonb` to columns — the promotion path.** A field starts in `jsonb`, gains a query predicate, becomes hot — promote to a real column. The 6.5 migration mechanic (expand → backfill → contract) is what makes this safe; named here, owned by Chapter 21.4.
- **Writing JSONB.** `db.insert(events).values({ payload: { eventType: 'invoice.paid', ... } })` — Drizzle serializes the object. Partial updates: `set({ payload: sql\`${events.payload} || ${{ status: 'paid' }}::jsonb\` })` merges with the `||` operator; `jsonb_set` is the path-targeted update.
- **The boundary with Zod.** drizzle-zod (7.1.8) doesn't infer the JSONB inner shape — `$type<...>` is a TS claim only. Hand-wire a Zod schema for the inner payload; parse on write; trust the `$type` on read.
- **Watch-outs:** `->>` returns text — comparisons to numbers without casting are string comparisons (`'10' < '9'` is true); querying `jsonb` columns without a containment-friendly index degrades quickly past a few thousand rows; the `$type` claim is only as strong as the write path's validation — a `db.execute(sql\`insert ...\`)` that bypasses Zod can poison the column; `json` (non-binary) and `jsonb` differ in storage and indexability — never reach for `json`; nested arrays in `jsonb` are queryable but slower than promoted columns at scale — the senior signal to promote.

What this lesson does not cover:

- GIN and `jsonb_path_ops` indexes — Chapter 6.4.1.
- Migrating JSONB fields to real columns at depth — Chapter 21.4.
- Zod validation of the JSONB payload shape — Chapter 7.1.
- Webhook ingestion patterns end-to-end — Chapter 12.1.
- Vector / embedding columns (`pgvector`) — Chapter 23.

Estimated student time: 40 to 50 minutes. Load-bearing for the webhook lessons in Unit 12 and any flexible-payload table later.

---

## Lesson 6.3.10 — When to drop to raw SQL via `sql\`\``

Topics to cover:

- **The senior question.** Drizzle's query builder covers most reads and writes; when does the senior reach for the `sql\`\`` template, and what's the cost? The lesson lands the triggers, the parameterization rules, and the boundary with `sql.raw`.
- **The triggers — when raw SQL earns its weight.** Postgres-specific features without a Drizzle builder (some window functions, `LATERAL` joins, custom operators, extension functions like `pg_trgm`'s `<->`); query hints; one-off DDL inside a migration; a sub-expression inside a Drizzle query that doesn't have a typed helper. Senior signal: most days, you don't reach. When you do, it's because the builder is missing a feature, not because raw feels expressive.
- **The `sql` tagged template — parameterization recap.** `sql\`select * from ${invoices} where ${invoices.id} = ${id}\``. Tables and columns interpolate as quoted identifiers (Drizzle knows their names from the schema); values interpolate as `$1` parameters bound by the driver. The whole-string parameterization is the safety net that keeps user input non-executable. Same guarantee as `eq(col, value)` from 6.3.1, just at a lower level.
- **Embedding raw SQL inside a Drizzle query.** `where(sql\`${invoices.total} > ${threshold}\`)` — most common shape. The builder owns the surrounding structure; the `sql\`\`` fills the predicate. Typed return preserved because the builder still knows the columns.
- **Typing a raw SQL expression — `sql<T>\`...\``.** `sql<number>\`ts_rank(...)\`` claims the inferred return type. Drizzle can't validate the claim — it's a TS-side hint, like `as`. Use when the expression has a known type and the surrounding builder needs to consume it.
- **`db.execute(sql\`...\`)` — the runtime.** Runs an arbitrary statement against the pool. Returns the driver-level result (rows + metadata). Reach: maintenance scripts, migration helpers, one-off queries. The return shape is `unknown`-ish until refined; Drizzle's typed builders are the better default when shape matters.
- **`sql.raw(...)` — the unsafe escape hatch.** Interpolates without parameterization — the whole input becomes part of the SQL string. The only legitimate use is constructing dynamic identifiers (a table or column name) from a fixed allow-list. Never with untrusted input. The cost: lose injection protection. The signal: if `sql.raw` appears in a code review, the reviewer asks where the input came from and confirms it's from a controlled set.
- **`sql.identifier(...)` and `sql.placeholder(...)`.** `sql.identifier(tableName)` quotes a dynamic identifier safely. `sql.placeholder('foo')` creates a named placeholder for prepared statements (perf detail, deferred to 6.4). Named for recognition.
- **The migration boundary — when raw SQL belongs.** Custom indexes (GIN, partial), triggers (the `updatedAt` trigger from 6.2.4), extensions (`create extension pg_trgm`), constraint tweaks Drizzle Kit doesn't emit. The migration's `.sql` file is the right place; a hand-written ALTER inside a migration file is normal, not a smell.
- **The cost of dropping to raw.** Lose Drizzle's type inference (must be re-claimed); lose builder-level safety against forgotten clauses (a raw `delete from ... where ...` doesn't surface a missing `where`); lose the future-proofing if Postgres versions change syntax; cost the next reader who has to context-switch between builder and SQL.
- **Worked examples.** A `where` predicate using a Postgres operator without a Drizzle helper (`<->` trigram distance); an `orderBy` with `ts_rank` from 6.3.8; a maintenance `db.execute(sql\`refresh materialized view ...\`)`.
- **Watch-outs:** `sql.raw(input)` with anything touched by user input is the classic injection — only fixed-string identifier interpolation; passing a value as a JavaScript template-literal interpolation (without the `sql` tag) drops parameterization — it's the difference between `\`select ... ${x}\`` (unsafe) and `sql\`select ... ${x}\`` (parameterized); `sql<T>\`...\`` is a claim, not a check — wrong claims surface as runtime cast errors; `db.execute` returns driver-specific shapes — Neon's serverless driver vs. node-postgres differ slightly, the schema lesson (6.5 setup) standardizes which one the course uses.

What this lesson does not cover:

- Migration file structure and Drizzle Kit — Chapter 6.5.1.
- Prepared statements as a performance technique — Chapter 6.4.
- Custom Postgres extensions (PostGIS, pg_trgm at depth) — out of scope.
- The Neon serverless vs. node-pg driver decision — Chapter 6.1.4 / 6.5 setup.

Estimated student time: 30 to 40 minutes. Reference / decision lesson — short by design.

---

## Lesson 6.3.11 — Chapter quiz

Top 10 topics to quiz:

- The four CRUD shapes (`db.select`, `db.insert`, `db.update`, `db.delete`); the four chain methods (`where`, `orderBy`, `limit`, `offset`); the missing-`where` failure mode on update and delete; the parameterization guarantee and where it doesn't apply (`sql.raw`).
- The four join shapes (`innerJoin`, `leftJoin`, `rightJoin`, `fullJoin`); when each is the right answer; left-join nullability in the inferred result; the labeled selection shape vs. flat projection.
- The relational query API (`db.query.<table>.findMany` / `findFirst`); `with` for traversal; nested `with` and column projection inside it; how the API solves N+1 by emitting one query; when to drop back to `db.select(...).join(...)`.
- The aggregate helpers (`count`, `sum`, `avg`, `min`, `max`, `countDistinct`, `sumDistinct`); the `groupBy`-must-include-non-aggregated-columns rule; `having` vs. `where`; filtered aggregates (`count(*) filter (where ...)`); the numeric-precision boundary (`sum` over `numeric` returns string).
- Upserts with `onConflictDoUpdate` and `onConflictDoNothing`; the `target` requirement (must reference an existing unique or primary-key constraint); the `excluded` pseudo-table; `RETURNING` to eliminate the read-after-write round trip; the canonical webhook idempotent-insert shape.
- Cursor vs. offset pagination; when offset is fine (small, stable, admin); the mandatory tiebreaker for cursor stability; opaque base64 cursor encoding; the fetch-n+1 trick for "has next page"; the index that makes cursor pagination fast; the leak vector if `organizationId` is in the cursor instead of the request.
- Subqueries and CTEs; the readability decision (CTE when named, inline when read-once); `exists` / `notExists` for the existence question; window functions named (`row_number`, `rank`, `partition by`); when app code is the right answer instead of layered SQL.
- Postgres full-text search; the generated `tsvector` column; `websearch_to_tsquery` for user input vs. `to_tsquery`; `ts_rank` for ordering; the GIN-index dependency (owned by 6.4.1); when Postgres FTS is enough vs. when an external search service earns its weight.
- JSONB querying — `->` vs. `->>`; `@>` containment as the senior default; `$type<...>` as a TS-side claim that Zod backs at the boundary; the promote-to-column trigger when a JSONB field becomes hot; the indexing options named (GIN, `jsonb_path_ops`, expression index).
- The `sql\`\`` tagged template — parameterization is implicit, tables and columns interpolate as identifiers, values as `$1` placeholders; `sql.raw` is the unsafe escape hatch reserved for fixed-string identifiers; `sql<T>\`...\`` is a TS claim, not a runtime check; the senior signal that says "drop to raw" (missing builder feature, custom Postgres operator, one-off maintenance) vs. the smell (raw SQL because builder felt verbose).
