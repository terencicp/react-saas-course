# Chapter 038 — Querying and mutating

## Lesson 1 — CRUD and the four chain methods

**Taught:** the four CRUD entry points (`db.select`/`insert`/`update`/`delete`) and four chain methods (`where`, `orderBy`, `limit`, `offset`), operator helpers + `and`/`or`/`not`, automatic parameterization (SQL injection impossible), `.returning()` as a round-trip eliminator, single-row reads via `.limit(1)` + destructure, and the missing-`where` data-loss failure mode.

**Cut:** nothing significant — `.then(...)`/`.at(0)` alt forms dropped; operator reference ships as a styled `OperatorReference.astro` component (helper→SQL→example), not a plain/`Figure` markdown table; coverage otherwise matches outline. Shipped an optional `VideoCallout` (NetworkChuck `' OR '1'='1` injection demo) in the parameterization beat — the only video in the lesson.

**Debts (forward pointers planted, later lessons must honor):**
- `tenantDb(orgId)` factory folding the manual org-`where` → Unit 10 (list views).
- `sql.raw` / `sql\`\`` raw escape hatch at depth → L10.
- relational query API + `db.query.…findFirst` (the missing `.findFirst` on the SQL builder) → L3.
- cursor pagination (depends on the tiebreaker reflex taught here) → L6.
- upserts + `.returning()` at depth (`excluded`, conflict target) → L5.
- soft delete (`update` setting `deletedAt`) + query-time filtering → Ch 039.
- indexing `where`/`orderBy` columns → Ch 039 L1.
- `db/index.ts` wiring to Neon → "Ch 040 setup" (lesson refers to it as a setup chapter "a little later"; outline says Ch 040).

**Terminology / mental models established (reuse verbatim):**
- "query builder" is lazy/thenable; `await` (or `.execute()`) is the trigger; chaining *order* never changes emitted SQL.
- "the type follows the projection" — projecting columns yields a narrowed inferred shape, never `Pick<Invoice,…>`.
- money is `numeric` → `string` end-to-end, never `parseFloat`; `amountDue` is the canonical money column.
- tiebreaker reflex: pair any non-unique sort column with the PK (`orderBy(desc(createdAt), asc(id))`) for *deterministic* order.
- `parameterized query` / `placeholder` (`$1`) / `SQL injection` Term tooltips defined here.
- single-row idiom: `const [row] = await …limit(1)` yields `Invoice | undefined`.

**Patterns / best practices (project chapters must follow):**
- every `update`/`delete` carries a `where`; treat an unqualified one as a bug on sight. Enable `eslint-plugin-drizzle` rules `enforce-update-with-where` + `enforce-delete-with-where`.
- org-scope every multi-tenant query explicitly at the query layer (`eq(invoices.organizationId, orgId)`) until `tenantDb` exists.
- prefer `.returning()` over a follow-up select; a select-after-write is the smell.

**Misc.:**
- Schema columns referenced (from Ch 037, never redeclared): `invoices` (`id`, `amountDue`, `status` enum `draft|sent|paid|void`, `dueDate` date, `createdAt`, `organizationId`, `assignedToId`), `organizations` (`id`, `name`), `users`. Shipped prose names the row type `Invoice` (`typeof invoices.$inferSelect`) and refers to the insert shape only as `$inferInsert` — it does *not* use a `NewInvoice` alias (outline's name); insert examples carry a `dueDate` field. `assignedToId` unused in this lesson.
- DrizzleCoding sandbox staging (carry to any future Ch 038 exercises): no native `uuidv7()` and no `casing` client in PGlite → use `integer` PK with explicit seeded ids and explicit snake_case column-name strings; keep money as `numeric` so it grades as a string; prefer the deterministic *update* variant over insert for `.returning()` grading. Lesson ships 4 DrizzleCoding exercises (select-projection, where-and-filter, sort-page-tiebreaker, update-returning).

## Lesson 2 — Joining tables

**Taught:** the four join shapes as answers to one axis — *what happens to a row with no match* (`innerJoin` drops unmatched, `leftJoin` keeps left + nulls right, `rightJoin`/`fullJoin` named for recognition only); labeled-selection object (`{ invoice, org }` → `{ invoice: Invoice; org: Organization }[]`) vs. flat projection; left-join nullability (labeled → whole grouped object `T | null`, flat → each right column nullable on its own); missing/trivially-true `on` predicate → silent cross product; self-joins via `alias(table, 'name')`; many-to-many via two explicit joins through the `invoice_tags` junction; the shape-driven choice between hand-written joins and the relational API.

**Cut:** `USING`/natural-join and `useIndex`/`forceIndex` join hints (outline marked recognition-only) dropped entirely; no harm — nothing depends on them.

**Debts (forward pointers planted, later lessons must honor):**
- relational query API as the tree-read default (`with: { tags: true }` walks the junction via Ch 037 `through:`; returns nested shape, no null-threading, N+1-safe) → L3. Lesson explicitly hands "row plus its related rows" tree reads to L3 and never shows the `db.query.…` call shape.
- aggregates over joins (count/sum, group-by) named as the trigger to drop to a hand-written join → L4.
- FK-column indexes that make joins fast ("correct first here, fast there") → Ch 039 L1.

**Terminology / mental models established (reuse verbatim):**
- "the absence axis" / "the row with no match" — the C-row (left, no match) and Y-row (right, no match) from the opening figure; every join example refers back to it.
- "the type follows the join" — the L1 "type follows the projection" slogan stretched across two tables.
- `join`, `cross product` (Cartesian product), `junction table` Term tooltips defined here.
- labeled shape is the escape hatch for column-name collisions (both tables have `id`/`createdAt`); alternative is aliasing keys (`invoiceId: invoices.id, orgId: organizations.id`).
- senior reach is `innerJoin` + `leftJoin`; `rightJoin` → flip tables and write `leftJoin`.

**Patterns / best practices (project chapters must follow):**
- every join needs a real `on` predicate (FK = PK); treat a missing/always-true one with the same suspicion as a mutation's missing `where` — it's a runtime perf incident, not a compile error.
- prefer the relational API for tree reads; reach for hand-written `db.select().join()` only for irregular flat projections, multi-table predicates, or aggregates.
- handle the left-join `null` branch (narrow / `?.` / `?? fallback`) before reading right-side fields; skipping it is the bug.

**Misc.:**
- Schema entities used (Ch 037, never redeclared): `invoices` (`organizationId`, `assignedToId` nullable FK → `users.id`, `amountDue`), `organizations` (`id`, `name`), `users` (`id`, `name`), `comments` (`parentId` self-ref FK → `comments.id`), `tags` (`id`, `name`), `invoiceTags` junction (`invoiceId`, `tagId`). Inferred types `Invoice`/`Organization`/`User` reused.
- New imports surfaced: `alias` from `drizzle-orm`.
- DrizzleCoding: ships 1 exercise (left-join-assignees) — `leftJoin` vs. the tempting `innerJoin`, graded on the two null-assignee rows surviving (`ordered: false`). Same PGlite staging rules as L1 (integer PKs, seeded ids, snake_case strings, money-as-string).
- Opening figure is a hand-built HTML+CSS `<Figure>` (not a Venn) showing the four shapes against one shared example; `inner`/`left` panels full-saturation, `right`/`full` de-emphasized.

## Lesson 3 — Nested reads with the relational API

**Taught:** the relational query builder (RQB) `db.query.<table>.findMany`/`findFirst` as the tree-read default — `with` (depth/relation traversal, `true` to load), nested `with`, `columns` projection (include vs. exclude mode, top-level and per-relation); the **v2 object** `where`/`orderBy` syntax (bare value = equality, operator object `{ gt: '0' }`, multi-key AND, `OR`/`AND`/`NOT` combinator keys, `RAW: (t) => sql\`…\`` escape hatch); the two relation-filter positions (`where` *inside* `with` shapes the child array and keeps the parent; a relation *as a key* in the parent `where` is an existence filter that drops parents); many-to-many via `with: { tags: true }` walking the junction invisibly; one-statement / N+1-safe-by-construction; deriving the nested result type via `NonNullable<Awaited<ReturnType<typeof fn>>>`; the "is the read a tree?" boundary for RQB vs. SQL builder.

**Cut:** the outline's nested example used `lineItems → product`; lesson uses the `lineItem → invoice → organization` two-hop instead (`product` not in the running domain). No optional video embedded.

**Debts (forward pointers planted, later lessons must honor):**
- aggregates / `GROUP BY` / aggregate-existence predicates ("more than 5 line items") → L4 (named as the RQB→SQL-builder trigger).
- set operations, window functions, CTEs, remaining `exists()` escape hatch → L7.
- cursor pagination leans on the tiebreaker reflex seeded here (object form) → L6.
- spotting/fixing N+1 in code that *bypasses* RQB → Ch 039 L2; `EXPLAIN ANALYZE` / plan reading → Ch 039 L3; indexing FK/`where`/`orderBy` columns RQB relies on → Ch 039 L1.
- `db/queries/` verb-led read-helper files closing over a tenant-scoped client → Unit 10 / Code conventions (lesson shows only the type-extraction pattern).
- `memberships` (junction-with-data) walked *to* as a first-class relation (`organization.memberships` → `membership.user`) → Unit 10 / organizations.
- JSONB read paths inside RQB results → L9.

**Terminology / mental models established (reuse verbatim):**
- **"describe the tree, get the tree"** — the spine: RQB is the **declarative, shape-first** read; SQL builder is the **imperative, operation-first** read. Every "which one?" decision falls out of this.
- **tree read** = an entity plus its nested related rows (vs. a flat row set/rectangle).
- depth vs. width: `with` is depth, `columns` is width; a tree read is a tree of `{ columns, with }` choices, one per node.
- a relation in `where` reads as an **existence question** — "does a related row matching this exist?"; `{ … }` constrains the match, bare `true` asks any-exists.
- silent-`undefined` rule: a `with` key that isn't a declared relation **doesn't error** — it's absent from result and inferred type; editor autocomplete (declared relations only) is the real signal. FK = write-time guarantee; relation = separate read-time declaration (reused from Ch 037 L9).
- `relational query builder (RQB)`, `RAW`, `N+1` Term tooltips defined here.
- `findFirst` returns `… | undefined` (not null, doesn't throw) — the RQB form of L1's `const [row] = …limit(1)` idiom.

**Patterns / best practices (project chapters must follow):**
- RQB (`db.query.…({ with })`) is the default for tree-shaped reads; reach for the SQL builder only for aggregates, flat/irregular projections, aggregate-existence, or set/window/CTE shapes. Mixing both APIs in one feature is normal.
- project `columns` down to what the UI renders on read paths (compounds per child row on nested reads) — default reflex, not advanced tuning.
- never hand-write a nested result type — derive it from the query (`NonNullable<Awaited<ReturnType<typeof getX>>>`); the query owns its result type, the same "one shape, one source" principle the schema applies to rows.
- tenant scope still carried by hand in every multi-tenant `where` (`organizationId: orgId`) until `tenantDb` exists.
- course teaches **v2 only** (`db.query`); v1 callback `where` lives on `db._query` `[OLD]`, named only so older tutorials don't confuse.

**Misc.:**
- Consumes the `defineRelations` graph from Ch 037 L9 (`invoices.lineItems` many, `invoices.organization` one, `invoices.tags` many via `.through(invoiceTags)`); writes zero `defineRelations` code.
- Money operator values are strings (`{ gt: '0' }`) — `amountDue` is `numeric`→`string` (Ch 037 L3 reflex).
- **Convention divergences flagged for maintainer (both still pending):** (1) Ch 038 chapter outline (this lesson) described `where`/`orderBy` as v1 callbacks and claimed parent-by-child filtering needs `db.select`+`exists()` — both superseded by v2; downstream agents must NOT normalize back to v1. (2) `Code conventions.md` §Data layer (~line 274) still lists v1 `relations()` + callback `db.query` as stable — should move to v2 (`defineRelations` + object syntax).
- DrizzleCoding (nested-invoice-read) **shipped as the `leftJoin` form** — the DrizzleCoding/PGlite runtime can't wire a `defineRelations` graph into its `db`, so `db.query` doesn't resolve in the sandbox. Exercise is the SQL-builder equivalent of the tree read (finish `.where(eq(invoices.id, 1)).orderBy(invoiceLineItems.id)`; seeded org 1 + invoices 1/2 + 4 line items; `expectedRows` = invoice-1's 3 line-item rows, `ordered: true`). A `:::note` frames the sandbox limitation and the flat-rectangle cost; the reference-solution `<details>` shows the equivalent RQB `findFirst({ where, with: { lineItems: { orderBy: { id: 'asc' } } } })` so both forms are visible. **The chapter's RQB syntax is assessed only via `Dropdowns`/`MultipleChoice`/`TrueFalse`, never a live RQB run** — any future Ch 038/039 exercise needing `db.query` in the sandbox hits the same wall; use SQL-builder live + concept checks for RQB. Same PGlite staging as L1/L2 (integer PKs, seeded ids, snake_case strings, money-as-string, no `casing`, no `uuidv7()`).

## Lesson 4 — Aggregations and grouping

**Taught:** aggregation as `db.select` with a different projection + one new clause — the helper set (`count()`/`count(col)`/`countDistinct`, `sum`/`sumDistinct`, `avg`, `min`/`max`, all from `drizzle-orm`); `groupBy` (one number per group) and the **completeness rule** (every non-aggregated selected column must be grouped, else a *runtime* Postgres error naming the column); grouping across a `leftJoin` driven from the parent side; `having` (filter groups after the fold) vs. `where` (filter rows before); filtered aggregates via `sql\`count(*) filter (where …)\``; `selectDistinct` (row dedupe) vs. `selectDistinctOn([col])` (first row per group, leading-`orderBy` rule); `date_trunc('month', …)` bucketing; the `numeric`→`string` precision boundary resolved definitively (do money math in SQL, format in JS).

**Cut:** "top N tags by usage" promised in the intro is set up but the actual top-tags query is not written out (the dashboard exercise covers per-org instead); window functions named only as the `distinctOn` cousin, deferred to L7 as outlined.

**Debts (forward pointers planted, later lessons must honor):**
- raw `sql\`\`` escape hatch at depth (typing with `sql<T>`, `db.execute`, `sql.raw`) → L10; this lesson uses `sql\`\`` only for `filter (where …)` and `date_trunc`, with a parameterization-is-safe reassurance.
- window functions (`row_number() over (partition by …)`) for top-N-per-group / ranking → L7; `distinctOn` is the only per-group-row idiom taught here.
- indexing aggregate/`groupBy`/`orderBy` columns for speed → Ch 039 L1; `EXPLAIN ANALYZE` on aggregate plans → Ch 039 L3. Performance mentioned only where a *wrong query* gives a *wrong answer*.

**Terminology / mental models established (reuse verbatim):**
- **"collapse, then filter the collapse"** — the lesson's spine: an aggregate collapses many rows to one number; `groupBy` says *what to collapse within*; `where` filters *before* the collapse, `having` *after*. Referenced by the "fold figure" across every section.
- **"the type follows the projection"** (from L1) reused: the aggregate rides in the projection where a column used to; `{ total: count() }` → `{ total: number }[]`.
- the **count/sum asymmetry**: `count()` arrives as a JS `number` (Drizzle casts the `bigint`); `sum`/`avg` arrive as `string | null` to preserve `numeric` precision — the single highest-value watch-out.
- `count()` vs `count(col)`: rows vs. non-null values of `col` — diverge on nullable columns; counting the right side of a `leftJoin` **must** use `count(invoices.id)` so all-null padding rows score 0, not 1.
- `sum` over zero rows is `null`, not `0` — the empty-state bug; `coalesce(sum(…), 0)` at the DB is the canonical fix.
- the `having` callback receives projected fields by their `select` keys — `having(({ outstanding }) => gt(outstanding, '1000'))`; name the aggregate once, reference the key.
- `sql<T>` is a TS-side claim, not a runtime check (like `as`); keep it honest.
- `aggregate function`, `COUNT(*)` (= "every row", not "all columns"), `DISTINCT ON` (Postgres-only) Term tooltips defined here.

**Patterns / best practices (project chapters must follow):**
- aggregates are **always the SQL builder** (`db.select`), never the relational API — there is no first-class RQB aggregate; "give me a number about the rows" → `db.select`, "give me the rows nested" → `db.query`. Closes the L2/L3 forward-pointer.
- money: do arithmetic in Postgres where `numeric` stays exact; in JS only format the string (`Intl.NumberFormat`, `Number()` at the display edge only) — never `parseFloat` for money math.
- wrap every dashboard `sum` in `coalesce(…, 0)` at the DB so callers never receive `null`.
- extract a repeated `sql\`\`` expression to a `const` (e.g. `monthExpr`) when it appears across `select`/`groupBy`/`orderBy` (no `GROUP BY 1` positional shortcut in the builder).
- raw-column predicates → `where` (cheaper, pre-group); aggregate predicates → `having`.

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `invoices` (`id`, `amountDue` `numeric(12,2)`→string, `status` enum, `createdAt`, `organizationId`, `assignedToId` nullable), `organizations` (`id`, `name`).
- The aggregate-helper reference (`count`/`sum`/`avg`/`min`/`max` + distinct variants → SQL / TS return / note) **shipped as a styled `AggregateHelpers.astro` component**, not a markdown table — markdown tables don't render in this pipeline. Future Ch 038/039 reference tables should follow this component pattern (cf. L1's `OperatorReference.astro`).
- DrizzleCoding (dashboard-aggregate) **shipped with the `FILTER` form** — per-org `count(invoices.id)` + `coalesce(sum(amountDue) filter (where status='sent'), 0)`, `leftJoin`, `groupBy` org, `orderBy … desc`, `ordered: true`; seeds 3 orgs (Initech has 0 sent → `outstanding: '0'`, exercises the `coalesce`). **PGlite confirmed to run `count(*) filter (where …)`** — no fallback needed; future Ch 038/039 exercises may rely on `FILTER` in the sandbox. Same staging rules as L1–L3 (integer PKs, seeded ids, snake_case strings, money-as-string, no `casing`, no `uuidv7()`).
- All teaching widgets shipped (fold `FoldFigure`, `AggregateHelpers`, 2 `AnnotatedCode`, 3 `CodeVariants`, `CodeTooltips`, `Buckets`, the `DrizzleCoding`, 1 `VideoCallout` — Database Star `GROUP BY`, videoId `x2_mOJ3skSc`) — none change the continuity facts above.

## Lesson 5 — Upserts and RETURNING

**Taught:** the read-then-write race (two-trip `findFirst`+`insert` lets two concurrent requests both see "absent" and both insert → duplicate or unique-violation crash, invisible single-threaded); upsert (`INSERT ... ON CONFLICT`) as the *single atomic* fix (Postgres holds the row lock for the whole statement); `onConflictDoNothing({ target })` for idempotent ingestion (webhook redelivery dedupe on a delivery-id unique); `onConflictDoUpdate({ target, set })` as the find-or-create (`memberships` on the composite `unique(userId, organizationId)`); the `excluded` pseudo-table (`sql\`excluded.role\`` = the value the insert proposed, written as a raw `sql` fragment — no typed Drizzle accessor); `.returning()` generalized as the universal mutation tail (rides on `insert`/`update`/`delete`/upsert, full `$inferSelect` shape, accepts a projection that narrows the type, returns bulk rows in insertion order); the synthesis "upsert + `.returning()` = atomic create-or-update that hands back its row" across three canonical homes (webhook idempotency, find-or-create, settings save).

**Cut:** `targetWhere`/`setWhere` (conditional upsert against a partial unique) and the "set-all-from-`excluded`" helper are named-for-recognition with one illustrative paragraph each, not drilled — deliberate scope cap (the budget is the three canonical shapes); optional `Sequence` ordering drill dropped in favor of the single `DrizzleCoding`.

**Debts (forward pointers planted, later lessons must honor):**
- transactions wrapping multi-statement write workflows (this lesson's upsert is one *single* statement) → Ch 039 L4.
- webhook ingestion end-to-end (signature verification, replay protection, full handler) → Ch 063; this lesson teaches only the write *shape*.
- soft delete at depth (`update` setting `deletedAt` + query-time filtering) → Ch 039; surfaced only as a `delete().returning()` / soft-delete `update().returning()` example.
- cross-row conflict resolution (one row's update needs a *sibling* row's data) is where `ON CONFLICT` stops → CTE in L7 (boundary named).
- `$inferInsert` / drizzle-zod write validation (values assumed validated upstream) → Ch 042.

**Terminology / mental models established (reuse verbatim):**
- **"insert if new, update if it already exists" as one statement, not two** — the lesson's spine; the naive `select`→branch→`insert` is the *read-then-write race* with an exploitable gap.
- **the conflict target references a unique the schema already declared — it does not create one.** No `UNIQUE`/`PRIMARY KEY` behind the target → *runtime* error `there is no unique or exclusion constraint matching the ON CONFLICT specification` (Drizzle can't see it, type checker stays silent). The #1 watch-out; reuses Ch 037's "push the guarantee into the database" reflex.
- **`excluded`** = the row the insert proposed but couldn't write; SQL-level only, written `sql\`excluded.col\``; preferred over restating a literal because it's a single source for the incoming value and stays correct for bulk upserts.
- **`.returning()` makes a skip observable**: `onConflictDoNothing().returning()` gives `[row]` on a real insert, `[]` on a skip — an empty result *is* the "already seen this" signal.
- **a `select` immediately after a write is a smell** (reused from L1) — `.returning()` collapses the two trips, closes the race window, and returns the row already typed.
- `upsert`, `idempotent`, `race condition`, `atomic`, `excluded` Term tooltips defined here.
- leave insert-only columns (`id`, `createdAt`) out of the `set` — copying `createdAt` from `excluded` erases the original creation time on every conflict.
- name the `target` (Drizzle allows omitting it = any unique conflict) — required once a table has >1 unique.

**Patterns / best practices (project chapters must follow):**
- create-or-update writes use a single `onConflictDo*` statement, never read-then-branch-then-write; every `onConflictDoUpdate` target points at a nameable `UNIQUE`/`PK` (if you can't name it, that's the bug — add the constraint).
- webhook/idempotent inserts use `onConflictDoNothing(...).returning()` and branch on the empty array to do downstream work only on first delivery.
- prefer `set: { col: sql\`excluded.col\` }` over restating literals; exclude immutable columns from the `set`.
- every mutation in this chapter (and downstream) ends in `.returning()` by default; a follow-up `select` is the exception that needs justifying.

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `memberships` composite `unique(userId, organizationId)` is the confirmed-real find-or-create star; `webhookDeliveries` (`deliveryId` unique, `payload` jsonb) and a per-org settings `unique(organizationId)` are *illustrative* (one-clause "assume a unique on …" notes, tables not redeclared — Ch 037 L7 owns declaration).
- Drizzle conflict API + `.returning()` are version-neutral across 0.45 and 1.0 — no v1/v2 split flag (unlike L3 RQB). No `relations()` used.
- Upsert is SQL-builder-only — no relational-API upsert (mirrors L4's "aggregates are always `db.select`").
- DrizzleCoding (find-or-create-membership) **shipped with the composite-unique form** — `unique('memberships_user_org_unique').on(userId, organizationId)` in the `schema` prop, upsert `(id:2, userId:1, organizationId:1, role:'admin')` over a seeded `member` row (id 1), `expectedRows=[{userId:1,organizationId:1,role:'admin'}]`, `ordered:false`. **PGlite confirmed to honor a composite `unique(...)` as an `ON CONFLICT` target** — no single-column fallback needed; future Ch 038/039 exercises may rely on composite-unique conflict targets in the sandbox. Same PGlite staging as L1–L4 (integer PKs, explicit seeded ids, snake_case strings, money-as-string, no `casing`, no `uuidv7()`).
- Shipped widgets: 1 `DiagramSequence` race (lesson-specific `race-frame.astro` at `src/components/lessons/038/5/`), 1 `AnnotatedCode` upsert-walkthrough, 2 `CodeVariants` (`DoNothing` no-signal-vs-returning, two-trips-vs-returning), 1 `CodeTooltips` (`excluded`/`sql`), the `DrizzleCoding`, 2 `VideoCallout` (Web Dev Cody concurrency-race `wEsPL50Uiyo`, Alex Hyett idempotency `XAccGbtl3Z8`), 2 `ExternalResource` cards (Drizzle upsert guide, Postgres INSERT docs) — none change the continuity facts above.

## Lesson 6 — Cursor pagination

**Taught:** offset's two failure modes (deep-page re-scan cost grows with depth; positional shift under live inserts/deletes shows duplicate or skipped rows) and offset's narrow carve-out (small + bounded + read-mostly + wants random page access / total count); cursor pagination as the seek-not-scan, anchor-not-count default for any list that grows or moves; the compound cursor predicate `or(lt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), lt(id, c.id)))` with the `(createdAt, id)` pair as a total order, descending form because the list is newest-first; the **first-page-is-`undefined`-cursor** branch (Drizzle drops an `undefined` condition); the **predicate-and-`orderBy`-are-one-design** rule (same columns, same directions); sort-on-a-stable-key-only (never `updatedAt`); tenant scope rides on the request not the cursor (leak vector); opaque base64url token round-trip (`Buffer.from(JSON.stringify(cursor)).toString('base64url')` out, decode-then-Zod-`safeParse`-validate in → typed error/400 on bad cursor); fetch-n+1 has-next-page (`limit(pageSize+1)`, slice off the probe, next cursor = `items.at(-1)`); the `{ items, nextCursor }` return shape; the hard composite-index dependency (shape shown, mechanic deferred); the same cursor through both SQL builder and RQB (query *shape*, not API feature).

**Cut:** the optional `Sequence` reinforcement for the fetch-n+1 flow and the optional keyset-pagination external explainer card were dropped (only the two Drizzle docs cards shipped); `MultipleChoice` decision drill realized as the `Buckets` exercise instead.

**Debts (forward pointers planted, later lessons must honor):**
- composite-index *declaration / column+direction choice / `EXPLAIN ANALYZE`* — this lesson shows the index shape (`index('idx_invoices_org_created_at_id').on(organizationId, createdAt.desc(), id.desc())`) and states the dependency only → Ch 039 L1 (declare/tune), Ch 039 L3 (`EXPLAIN ANALYZE` confirms seek-not-scan). **Hard boundary: this lesson owns "correct," next chapter owns "fast" — they must ship together.**
- Zod `cursorSchema.safeParse` validation of the decoded cursor (named, `safeParse`-shaped, not taught) → Ch 042.
- `err('validation', …)` typed-error *return* channel (a bad cursor returns a failure, caller turns it into a 400, not a throw) → error-handling chapter (named, not built).
- the `searchParams`/opaque-base64 cursor-in-URL *primitive* is **already taught in Ch 033 L4** (URL state, Unit 4) — shipped MDX references it as "the URL-state lesson back in Unit 4 read `?cursor=` from `searchParams` … the cursor token is opaque base64 on purpose"; the production **list-view application** (wiring `?cursor=` to client nav, syncing it as the user pages, URL-as-source-of-truth, `nuqs`) → **Unit 10** list-view chapters. Both forward refs in the MDX are **unit-level** (Unit 4 / Unit 10), no hard lesson numbers. **Correction: the earlier draft's "Ch 041 L4 owns opaque-base64 cursors" was FABRICATED — Ch 041 is a project chapter and owns no such primitive. Do not reinstate it. Primitive = Ch 033 L4 (already covered); application = Unit 10.**
- `parseCursor` / `encodeCursor` helper pair living in `lib/` (named, not built) → Code conventions / later structure lessons.
- tenant scoping at the query layer in depth (`tenantDb(orgId)` factory) → Unit 10; org-`where` carried by hand here.
- bidirectional / previous-page cursors and exact-total-count strategies → named-for-recognition only, implementation deliberately cut.

**Terminology / mental models established (reuse verbatim):**
- **the spine:** "a cursor remembers the last row you saw and asks for the rows after it; offset counts from the front and re-counts every time." Every property (depth speed, write stability, the tiebreaker, the index) falls out of it.
- **offset re-scans / cursor seeks** (the performance half); **offset is positional / cursor is anchored** (the stability half — the one that files the bug report).
- the tiebreaker reflex from L1 turned **load-bearing**: without `(createdAt, id)` the boundary lands ambiguously between timestamp-tied rows and one is silently skipped at every seam. The unique PK makes the pair a total order.
- **opaque token** = hidden-*from-the-client*, not encrypted; server still decodes. Keeps you free to change sort/encoding without breaking callers.
- **the cursor is just another request parameter** → same validate-at-the-boundary defense as any query string/body field; decoded values still flow through `lt`/`eq` as `$1` placeholders, so decoding reopens no injection door (reuses L1 parameterization reassurance).
- **the probe row**: fetch `pageSize+1`, its mere existence signals "next page"; next cursor comes from the last *returned* row, never the probe.
- `cursor pagination`, `cursor`, `keyset pagination`, `base64url` Term tooltips defined here.
- `base64url` (not plain `base64`) — URL-safe (`-`/`_`, no padding) so the token drops into a query string with no escaping.

**Patterns / best practices (project chapters must follow):**
- cursor pagination is the default for any list that grows past low thousands *or* mutates under the user (feed/inbox/activity log); offset is the justified exception for small + bounded + read-mostly + random-page-access/total-count lists.
- cursor predicate and `orderBy` are one matched design — same columns, same directions; sort cursor lists only on immutable keys (creation time), never `updatedAt`.
- the cursor carries **only** `{ sortKey, id }` — never `organizationId` or any tenant/identity field (horizontal-access-control leak); tenant scope comes from auth context in the `where`.
- decode-then-validate every incoming cursor before it touches the query; a bad cursor is expected input → typed error/400, not a crash.
- paginated reads return `{ items, nextCursor }` (array + cursor metadata); `nextCursor` is `null` at the end.
- ship the cursor query and its composite index together — a cursor query with no covering index is *slower* than the offset it replaced.
- cursor rides on whichever read API the feature already uses: flat list → `db.select`, tree → `db.query` with the compound predicate under the documented v2 `RAW: (t) => sql\`(${t.createdAt} < ${cursor.createdAt} or (${t.createdAt} = ${cursor.createdAt} and ${t.id} < ${cursor.id}))\`` template-string escape (L3 form — **a `sql\`\`` template, NOT bare operator helpers**), with tenant scope + `orderBy: { createdAt: 'desc', id: 'desc' }` staying in object syntax; first page omits the `RAW` key.

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `invoices` (`id`, `organizationId`, `status`, `amountDue` `numeric`→string, `createdAt`), `organizations` (`id`, `name`). Cursor sorts on `(createdAt, id)`; tenant scope `organizationId`.
- Cursor query is version-neutral (`db.select`/`db.query` + `or`/`and`/`eq`/`lt`/`desc`); only the RQB tab is v2-sensitive — mirrors L3's shipped v2 object syntax: the compound predicate ships as a `RAW: (t) => sql\`…\`` **template string** (not `or(...)` helpers inside the callback), `orderBy: { … }` object. Do not normalize to v1, and do not rewrite the `RAW` body back into operator-helper form.
- Encoding uses Node `Buffer` `base64url` (native, URL-safe, padding omitted); `pageSize` travels as its own `?pageSize=` param with a server-side cap (~100) and a default in a constants file.
- **DrizzleCoding (compound-cursor-where) — the load-bearing assessment. Exact shipped seed/cursor (per outline's verification note):** one org (id 1, 'Acme'); invoices all `status='sent'`, distinct `amount_due` strings, ids/`created_at`: id 10 `2026-05-10`, id 9 `2026-05-09`, id 8 `2026-05-08`, id 7 `2026-05-08` (SAME timestamp as id 8 — the tied row), id 6 `2026-05-07`, id 5 `2026-05-06` (all 10:00:00Z). Order under `desc(created_at), desc(id)` = 10,9,8,7,6,5 (id 8 before id 7 on the tie). Cursor given in starter = `{ createdAt: '2026-05-08 10:00:00Z', id: 8 }`; correct next page = `[7, 6, 5]` (`ordered: true`). The graded trap: naive `lt(createdAt, …)` drops id 7 (ties the cursor timestamp) → returns only `[6, 5]` → fails. Runtime exposes `or`/`and`/`eq`/`lt`/`desc` as globals. Same PGlite staging as L1–L5 (integer PKs, seeded ids, snake_case strings, money-as-string, no `casing`, no `uuidv7()`). **Confirm under PGlite that `desc(created_at), desc(id)` orders id 8 before id 7 deterministically and the compound predicate returns exactly `[7,6,5]`** before shipping.
- Teaching widgets still TODO stubs at time of writing (2 `Figure`, 1 `DiagramSequence`, 1 `Buckets`, 1 `AnnotatedCode`, 1 `CodeTooltips`, 1 `CodeVariants`, the `DrizzleCoding`) — none change the continuity facts above.

## Lesson 7 — Subqueries and CTEs

**Taught:** the "intermediate result" mental model — a two-pass query computes a prior set/value, and that result can live in three homes (inline subquery / named CTE / app-code two-query); inline subqueries in `where` (`inArray(col, db.select({id}).from(...))`, the projection must select exactly one column; scalar form `gt(col, db.select({avg}))`); `exists`/`notExists` (imported from `drizzle-orm`) as the short-circuiting default for existence yes/no, contrasted with the wasteful L4 join+group+having; the **correlated subquery** (subquery references an outer column, conceptually re-runs per outer row); derived tables (`db.select(...).as('alias')` in `from`, columns read through the alias); CTEs (`db.$with('name').as(<select>)` defines, `db.with(cte).select()...` consumes; multi-CTE chaining `db.with(a, b)` where `b` references `a`); window functions written in `sql<number>\`row_number() over (partition by ${col} order by ${col} desc)\`` (no Drizzle builder); the capstone "top-3-tags-per-org" two-CTE chain (`tag_counts` → `ranked` with `row_number()` → outer `where(lte(rank, 3))`); recursive CTEs named-for-recognition only; the decision ladder for picking the shape.

**Cut:** nothing material — coverage matches/exceeds the outline. Lesson corrects two outline errors rather than cutting (see Misc.).

**Debts (forward pointers planted, later lessons must honor):**
- `EXPLAIN ANALYZE` proof of when a correlated subquery / `exists` on a large outer set / `inArray(subquery)` on thousands of ids is the wrong (slow) shape → **Ch 039 L3**. This lesson names *where* cost lives, refuses to benchmark, and says so explicitly (`:::note`).
- indexing the columns subqueries/CTEs/window-orderings lean on → **Ch 039 L1**.
- the raw `sql\`\`` escape hatch *at depth* (`db.execute`, `sql.raw`, typing rules) → **L10**; this lesson uses `sql\`\`` only for window functions and the recursive-CTE mention, and names `db.execute(...)` as the runner for raw `WITH RECURSIVE`.
- `WITH ... AS MATERIALIZED` as a power tool justified only by measurement → Ch 039 L3 (named, not drilled).
- cross-row conflict resolution where `ON CONFLICT` stops (the L5 boundary) is cashed here — a CTE is the answer.

**Terminology / mental models established (reuse verbatim):**
- **the spine:** "name the intermediate result only when naming earns its keep." Three placements ranked by reach: inline (used once, reads better inline) → CTE (used >once, *or* naming untangles an inside-out query into a top-to-bottom read) → app code (small result, two short reads beat one clever one).
- **the load-bearing honesty:** for an intermediate used **exactly once**, an inline subquery and a single-use CTE compile to the **same plan** (PG inlines non-recursive, side-effect-free, once-referenced CTEs) — so the inline-vs-CTE choice is *readability, not speed*. A CTE used **more than once** is computed once and reused (a real win). `WITH ... AS MATERIALIZED` blocks the inlining.
- `exists`/`notExists` is the **default** for existence yes/no; short-circuits at the first match; reach for join+group only when you need the matched rows or a real count.
- **`groupBy` collapses; a window function annotates each row without collapsing** — the contrast that motivates `row_number()`. `partition by` = "group, but nothing collapses"; the window's `order by` decides what rank 1 means.
- **windows run after `where`** — so you can't filter on `row_number()` in the same query; compute the rank in one CTE layer, filter it in the next. This is *why* CTEs and window functions travel together.
- `subquery`, `common table expression (CTE)`, `derived table`, `correlated subquery`, `window function`, `materialized`, `recursive CTE` Term tooltips defined here.
- reuses L4 verbatim-in-spirit: parameterization still holds inside `sql\`\`` (values bind as `$1`); `sql<number>` is a TS-side **claim**, not a check. Reuses L1/L6 tiebreaker reflex *inside* the window `order by` (`order by count desc, tagId`) for deterministic ranks.

**Patterns / best practices (project chapters must follow):**
- pick the layered shape on **readability first**: a CTE nobody can read is a worse outcome than two queries that read straight. Layer into SQL only when the intermediate is big enough that round-tripping it through TS costs real latency — never to look clever.
- existence checks use `exists`/`notExists`, not join+group+`having(count > 0)`.
- name a CTE only when used >once or when naming untangles the read; a single-use CTE named for show is *noise* (extra name + forward reference for no gain).
- derived tables / CTEs are SQL-builder-only (`db.select`/`db.$with`); no relational-API equivalent (mirrors L4 aggregates, L5 upserts).
- result types stay inferred from the final `select` projection through CTEs + window functions — never hand-type the report shape ("derive, don't declare", from L1/L3/L4).

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `invoices` (`id`, `organizationId`, `amountDue` `numeric`→string, `status`, `dueDate`, `createdAt`), `organizations` (`id`, `name`), `tags` (`id`, `name`), `invoiceTags` junction (`invoiceId`, `tagId`). Money stays `string` through derived tables/CTEs (`sum(amountDue)` → string).
- New imports surfaced: `exists`, `notExists` from `drizzle-orm`. CTE/derived-table/window APIs (`db.$with`/`db.with`/`.as()`/`sql\`\`` windows) are **version-neutral across 0.45 → 1.0** — no v1/v2 split (unlike L3 RQB); no `relations()`/`defineRelations` used.
- **Two outline errors corrected (downstream agents must NOT normalize back):** (1) the chapter outline names `db.$withRecursive(...)` as a real builder — **it does not exist** in the version line taught; recursive CTEs are written as raw `sql\`\`` run via `db.execute(...)`, taught named-for-recognition only, no `$withRecursive` example shipped. (2) the outline's loose "PG inlines simple CTEs unless MATERIALIZED" is tightened to the precise rule: inlined only when non-recursive, side-effect-free, **and referenced exactly once**; referenced >once stays materialized by default.
- **DrizzleCoding (`top-n-per-group`) — the load-bearing assessment, SHIPPED as `DrizzleCoding` (PGlite confirmed to run `db.$with(...)` + `row_number() over (partition by ...)`; no SQLCoding fallback needed — later Ch 038 CTE/window exercises can also stay on `DrizzleCoding`).** Task: "top 2 tags per org by invoice count," tie broken by lower `tag_id`. Starter provides schema + the `tag_counts` CTE pre-written; student writes the `ranked` CTE (`row_number() over (partition by org order by count desc, tag_id)`), the `db.with(tagCounts, ranked)` wiring, and the final `where(lte(rank, 2))` + `orderBy(orgId, rank)`. Graded trap: a `groupBy`+max (one row per org) returns too few rows; only the window-ranked version yields the top-2 set. Seed (deterministic, with a deliberate count-tie the `tag_id` tiebreaker resolves): Org 1 'Acme' — urgent×3, billing×2, support×2 (urgent rank 1; lower-id of {billing=2, support=3} → billing rank 2, support dropped); Org 2 'Globex' — design×4, urgent×1 (design rank 1, urgent rank 2). `expectedRows` = `[{1,urgent,3,1},{1,billing,2,2},{2,design,4,1},{2,urgent,1,2}]`, `ordered: true`. Same PGlite staging as L1–L6 (integer PKs, explicit seeded ids, snake_case strings, no `casing`, no `uuidv7()`).
- All teaching widgets built (1 `Figure`/`WhereTheResultLives` `where-the-result-lives`, 2 `AnnotatedCode` [`inline-subquery-walkthrough` blue, `top-tags-capstone` violet — capstone split into two adjacent blocks: CTE defs, then final select], 2 `CodeVariants` [`exists-vs-join-count`, `inline-vs-cte`], 1 `Buckets` `pick-the-shape` `twoCol`, the `DrizzleCoding`, 2 `VideoCallout` [Alice Zhao CTEs `LJC8277LONg`, window functions `rIcB4zMYMas`], 1 `CardGrid` of 4 `ExternalResource`) — none change the continuity facts above.

## Lesson 8 — Full-text search in Postgres

**Taught:** the build-vs-buy framing (reach for Postgres FTS first; external engine is the threshold tool — comfortable into the low-millions of docs at modest query rates); the lexeme model — FTS normalizes *both* stored text and query into the same lexeme space then compares with `@@`, it is **not** substring/exact match (`lexeme`/`tsvector`/`tsquery`/`@@`, stemming + stop-word drop, `'english'` vs `'simple'` text search config); the staged build — query-time `to_tsvector(...) @@ websearch_to_tsquery(...)` shape *first* (condemned as per-row re-tokenization, no index), then moved off the hot path into a STORED generated `tsvector` column; the **Drizzle `customType` idiom** (no native `tsvector` builder — `customType<{ data: string }>({ dataType(){ return 'tsvector'; } })`); `generatedAlwaysAs((): SQL => sql\`…\`)` recomputing the vector at write time with `coalesce(col,'')` nullable guards + `.notNull()`; **`websearch_to_tsquery` is the only function for raw user input** (`to_tsquery` throws on a bare space and leaks operator syntax — server-built queries only); ranking with `ts_rank` (+ `ts_rank_cd` named) ordered `desc`, paired with the PK tiebreaker for deterministic pagination; DRY the repeated query expression to a `const queryExpr = sql\`…\``; highlighting with `ts_headline` on the **raw text column** (not the vector), returning `<b>` markup; the leave-Postgres threshold + `pg_trgm` as the in-database typo-tolerance escape hatch.

**Cut:** weighted search (`setweight('A'|'B')` to boost `customerName` over `description`) — outline-scoped, deliberately omitted to protect focus; `pgvector`/semantic search pushed to Unit 22 (one-line pointer only).

**Debts (forward pointers planted, later lessons must honor):**
- **GIN index — shape shown (`index('idx_invoices_search_vector_gin').using('gin', t.searchVector)`), declaration/tuning/cost owned by Ch 039 L1.** Hard boundary: this lesson owns "correct," next chapter owns "fast" — the generated `tsvector` column and its GIN index ship together in one migration (same pairing as L6 cursor + composite index).
- `EXPLAIN ANALYZE` to confirm the GIN index is used → Ch 039 L3.
- `sql<T>` typing at depth (`db.execute`, `sql.raw`) → L10; used here only as one-line `sql<string>`/`sql<number>` claims with the "TS-side claim, not a check" caveat.
- controlled rendering of `ts_headline`'s server `<b>` markup in a React surface (not raw injection) → later UI lesson; this lesson is the data layer only.
- multilingual FTS (per-row language column passed to the config dynamically) → named, not built.
- `pg_trgm` operators (`similarity`, `%`, `<->`) drilled at depth → named-for-recognition only (lives next to FTS, often pairs with it).

**Terminology / mental models established (reuse verbatim):**
- **the spine:** "FTS normalizes both sides into lexemes, then compares" — every later behavior (plural matches singular, "the" vanishes, exact-substring surprises) is downstream of this one move.
- `to_tsvector('english', 'The cats are running')` → `'cat':2 'run':4` (stop words dropped, stemmed, positions kept); `@@` returns boolean.
- `lexeme`, `tsvector`, `tsquery`, `stemming`, `stop word`, `text search configuration`, `customType`, `coalesce`, `GIN index`, `websearch_to_tsquery`, `ts_rank`, `ts_rank_cd`, `ts_headline`, `pg_trgm`, `faceted search` Term tooltips defined here.
- tiebreaker reflex (L1/L6) returns load-bearing a third time: `ts_rank` ties → pair with `asc(invoices.id)` for total order; ranking without it is the silent pagination-reshuffle bug.
- DRY repeated `sql\`\`` to a `const` (L4 `queryExpr` pattern) — no positional `ORDER BY 1` in the builder.
- trigger-based `tsvector` maintenance (`BEFORE INSERT/UPDATE` calling `to_tsvector`) is the pre-generated-columns pattern — recognize in legacy code, don't write it.

**Patterns / best practices (project chapters must follow):**
- `tsvector` columns are declared via the `customType` helper + `generatedAlwaysAs` STORED, never maintained by trigger or app code; a query-time `to_tsvector(col)` predicate is a scaling bug, not an option, at any real volume.
- point `websearch_to_tsquery` at every user-facing search box; `to_tsquery` only for server-constructed queries from trusted parts.
- generated `tsvector` + GIN index are a pair shipped together; the column is mandatory before search goes to production.
- every FTS query still org-scoped by hand in the `where` (tenant reflex from L1) until `tenantDb` exists; `ts_headline` rides only the already-filtered/ranked result set, never the whole table.

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `invoices` (`id`, `description` text **nullable**, `customerName` text, `organizationId`, `createdAt`), `organizations` (`id`, `name`). FTS searches `description` + `customerName`; `coalesce` guards the nullable `description`.
- New imports surfaced: `customType` from `drizzle-orm/pg-core`; `SQL` (type, via `import type` for `verbatimModuleSyntax`) and `sql` from `drizzle-orm`.
- **Outline error corrected (downstream agents must NOT copy):** Ch 038 chapter outline (line 235) wrote `tsvector('search_vector')` as if a Drizzle builder exists — it does **not**; the `customType` shape is canonical (matches Drizzle's own FTS guide).
- FTS APIs (`customType`, `generatedAlwaysAs`, `sql\`\`` FTS functions) are version-neutral across Drizzle 0.45 → 1.0; no v1/v2 split, no `relations()` used.
- **Exercise shipped as `SQLCoding`, not `DrizzleCoding`** (the deliberate divergence from prior Ch 038 exercises — flagged in outline): `customType` + `generatedAlwaysAs(sql\`…\`)` are outside the `DrizzleCoding` widget's exposed globals/auto-DDL, so the exercise uses raw SQL on PGlite (full Postgres). Seed: `invoices` with a STORED generated `search_vector` (`to_tsvector('english', coalesce(description,'') || ' ' || coalesce(customer_name,''))`), 6 rows for org 1. Task: org-1 invoices matching `'consulting'`, `WHERE search_vector @@ websearch_to_tsquery('english','consulting')` + `ORDER BY ts_rank(...) DESC, id ASC` + `organization_id = 1`. Graded trap: row 3 "We consult monthly" stems to `consult` so FTS matches it where `ILIKE '%consulting%'` would miss; row 5 "Consultancy" correctly excluded (different stem). `expectedRows` = ids `[1,2,3,6]`, `ordered: true`, subset-matched on `id`. Row 6 (NULL description, matches via `customer_name`) proves the `coalesce`. Same PGlite staging as L1–L7 (integer PKs, seeded ids, snake_case strings).
- Widgets shipped live (not stubs): lesson-component figure `FtsLexemeFlow` (`src/components/lessons/038/8/fts-lexeme-flow.astro`); inline `AnnotatedCode` walks (query-time vector blue, generated column violet, ranked DRY'd query green); `CodeVariants` for the `to_tsquery` vs `websearch_to_tsquery` A/B; **`TabbedContent`** (not `CodeVariants`) for the query-time-vs-generated-column before/after; the `StateMachineWalker` decision tree (`scale` → `matching` → FTS / pg_trgm / external leaves); the `SQLCoding` exercise.
- **A `VideoCallout` shipped** (Supabase, `videoId="GRwIa-ce7RA"`, "Master Postgres Full-text Search in 5 Minutes") despite the outline's default-skip — it walks the same arc; current enough at ship time.

## Lesson 9 — JSONB columns

**Taught:** the read/write/filter paths into a `jsonb` column whose *contents* the builder can't type — whole-column read carries `$type<WebhookEvent>` through the projection (fully typed, no cast); reaching inside drops to raw `sql\`\`` (no typed accessor builder exists); accessors `->` (returns `jsonb`, for descending) vs `->>` (returns `text`, for landing on a leaf) + the deep-path `#>>'{a,b,c}'` shortcut; the **`->>`-is-always-text** silent bug (`'90' > '500'` lexically true → cast `::numeric`/`::int` *in SQL* before comparing) and `sql<T>` to re-claim the TS type (claim, not check); `@>` containment as the senior-default filter (matches subset, not equality; RHS **must** carry explicit `::jsonb` cast or binding fails — Drizzle issue #4935) + key-existence `?`/`?|`/`?&`; whole-value writes (`$type` checks shape at compile time) and partial writes — `||` shallow top-level merge vs `jsonb_set(target, path, new_value)` for one nested path (both preserve the rest of the blob); the **promotion trigger** (a JSONB path appearing in a hot/every-list `WHERE` = normalization debt → promote to a real indexed column).

**Cut:** nothing material — `jsonb_path_query`/SQL-JSON path language and `pg_trgm` named for recognition only (one line each), per outline.

**Debts (forward pointers planted, later lessons must honor):**
- GIN index on the `jsonb` column (`@>` degrades unindexed past a few thousand rows; shape not shown, only named) → **Ch 039 L1**; `EXPLAIN ANALYZE` confirmation → Ch 039 L3. Same "correct here, fast next chapter" boundary as L6/L8.
- Zod validation of the JSONB payload at the **write boundary** — the runtime gate that makes the read-side `$type` honest; `$type` *assumes* a validated boundary, it is not the boundary → **Ch 042**. Named repeatedly, never built.
- expand→backfill→contract migration that safely promotes a JSONB field to a real column (mechanic Ch 040) → **Ch 099**; this lesson teaches only *recognizing* the trigger, not running it.
- `sql\`\`` escape hatch at depth (`db.execute`, `sql.raw`, `sql<T>` rules) → **L10**; this lesson uses `sql\`\`` only for JSONB operators + one-line `sql<T>` claims.
- webhook ingestion end-to-end (signature verification, idempotency, handler) → **Ch 063**; `webhookDeliveries` is only a payload carrier here.

**Terminology / mental models established (reuse verbatim):**
- **the spine:** *"Drizzle types the whole column, but the moment you reach inside it you're in raw `sql\`\`` — typed at the boundary, untyped in the middle."* Every section is a consequence.
- **the column is a fully-typed object to TS the instant you select it whole; untyped territory begins only when you index into it in SQL.**
- `->` descends + keeps `jsonb` (chainable); `->>` lands a leaf as `text` (last hop, always); `#>>'{path}'` is the deep-leaf shortcut.
- **`->>` returns text, always** — the #1 silent bug; cast in SQL (`::numeric`) before any numeric/boolean compare.
- **`@>` is containment, not equality** — partial match against a fat third-party payload; never anchors on exact shape; RHS cast `${obj}::jsonb` is load-bearing, not decoration.
- decision: `||` for a **top-level** field, `jsonb_set` for a **nested** path; both leave the rest of the document intact (vs. replacing `payload` wholesale, which loses concurrent edits).
- **`$type` does not validate writes** — a raw `sql\`\`` write can store a shape violating `WebhookEvent`; TS stays silent, the next typed read lies. Read-trust is only earned by write-discipline (Zod at the boundary).
- reuses L1/L4/L8 reassurances: values in JSONB `sql\`\`` fragments still bind as `$1` (no injection); `sql<T>` is a TS-side claim, not a check.
- `jsonb`, `->`, `->>`, `@>`, `?`, `||`, `jsonb_set` Term tooltips defined here.

**Patterns / best practices (project chapters must follow):**
- whole-column read whenever the consumer needs >1 field off the payload (typed, autocompletes, one fewer raw fragment); save single-field `->>` accessors for `WHERE` predicates.
- always cast `->>` numeric/boolean leaves in SQL before comparing; always cast the `@>` RHS object `::jsonb`.
- partial JSONB updates use `||`/`jsonb_set` (surgical), never read-modify-rewrite the whole `payload` (clobbers concurrent edits).
- every JSONB write path is validated by Zod at the boundary before the `sql\`\`` write — this is what keeps `$type` honest on read.
- the course is **`jsonb`-only, end to end**; a `json()` in a schema is a bug (not binary, not indexable, operators differ).
- in review, a JSONB path inside a hot `WHERE`/`ORDER BY` is a promote-to-column smell, not an accepted state.

**Misc.:**
- Schema reuse (Ch 037, never redeclared): `webhookDeliveries` (`id`, `deliveryId` unique, `payload jsonb().$type<WebhookEvent>().notNull()`, `receivedAt`); `WebhookEvent` from `@/lib/webhooks`. `WebhookEvent` shape used throughout: `{ eventType, data: { status, amount }, customer?: { email, tier }, refundedAt?, processedAt? }`. `audit_logs.details` (`$type<AuditDetails>`) named illustratively, table not redeclared.
- **JSON key casing:** payload JSON keys stay **camelCase** (`eventType`, `data`, `status`, `amount`, `refundedAt`) to match `WebhookEvent`; only SQL *column* names are snake_case (`delivery_id`, `received_at`).
- **Exercise shipped as `SQLCoding`, not `DrizzleCoding`** (deliberate divergence, same as L8 — JSONB operators are outside the widget's exposed builder globals; PGlite is full Postgres so raw runs). **Downstream agents must NOT normalize back to `DrizzleCoding`.** Seed: `webhook_deliveries` (integer PK, snake_case cols, ~6 rows, camelCase JSON keys). Task: return `eventType` of deliveries that are `status:'paid'` (nested under `data`) AND `data.amount > 500`, `ORDER BY id`. Reference solution: `payload @> '{"data":{"status":"paid"}}'::jsonb AND (payload->'data'->>'amount')::numeric > 500`. Traps: row 2 (amount 90, paid — lexical `'90' > '500'` includes it if uncast → fails), rows 3 & 5 (high amount, not paid — excluded by status). Correct id set `{1,4,6}`, all `event_type='invoice.paid'`, `ordered: true`. **Verify under PGlite the `::jsonb` RHS binds and `::numeric` cast resolves before shipping.**
- APIs version-neutral across Drizzle 0.45 → 1.0 — **no v1/v2 split**, no `relations()`/`defineRelations` code written here. **Confirmed June 2026: Drizzle ships no typed JSONB-accessor builder** — do not author one.
- Teaching widgets shipped: `Buckets` (jsonb-vs-column triage, 6 items, `twoCol`); `CodeTooltips` (whole-column read typed); the stepped nested-read-and-cast block ships as a **lesson-specific component** `src/components/lessons/038/9/NestedReadAndCast.astro` (the outline's `AnnotatedCode`); 2 `CodeVariants` (containment-vs-key-existence, merge-vs-jsonb-set, blue/orange tabs); the `SQLCoding`; `VideoCallout` (Supabase JSON-in-Postgres, `nxeUiRz4G-M`); `CardGrid` of 4 `ExternalResource` cards. None change the continuity facts above.

## Lesson 10 — The raw SQL escape hatch

**Taught:** the consolidation/decision lesson — promotes the chapter's scattered `sql\`\`` usage into one governed model (builder = floor, raw SQL = exception, `sql.raw` = dangerous corner); the three legitimate triggers (a Postgres feature with no Drizzle helper, a sub-expression inside a builder query, a one-off statement) vs. the anti-trigger ("builder felt verbose / I remember the SQL"); the reach-is-a-spectrum-not-a-cliff model (shallow `where(sql\`…\`)` drop keeps surrounding result type; full `db.execute(sql\`…\`)` drop leaves the typed world); the parameter boundary as the safety story — `sql\`${x}\`` binds `$1` (safe), plain backtick `` `${x}` `` concatenates (injectable), `sql.raw(\`…${x}…\`)` concatenates *inside* the tag (camouflaged-injectable); table/column interpolations become quoted identifiers, values become bound params; re-claiming the dropped type with `sql<T>` (a TS-side claim, not a runtime check, like `as`); `db.execute` returns the raw driver result (not a typed array), has no missing-`where` guard, and is driver-shape-specific; `sql.raw` interpolates without binding (identifiers only, never user input), `sql.identifier` is the right tool for runtime identifiers (quotes, but quoting ≠ defense — allow-list is); migrations as the *one* surface where hand-written SQL is the authoring norm, not a smell; the four itemized costs of dropping to raw (type inference, builder safety, forward-compatibility, reader cost).

**Cut:** nothing material — coverage meets/exceeds the outline. No query-writing coding exercise (`DrizzleCoding`/`SQLCoding`) — deliberate: this is a judgment lesson, exercises are decision/identification drills only (`StateMachineWalker`, `Tokens`, two `CodeVariants`, `Buckets`); the chapter's load-bearing coding assessments live in L1–L9.

**Debts (forward pointers planted, later lessons must honor):**
- prepared statements / `sql.placeholder('foo')` at depth (`.prepare()`) → Ch 039; named-for-recognition here only, explicitly distinguished from `sql.raw`.
- migration file structure, Drizzle Kit `generate`/`migrate`, journal/`--name` discipline → "Ch 040 setup" (the chapter wiring `db/index.ts`); this lesson establishes only *that* migrations are raw-SQL-normal and *which* artifacts live there.
- every deferred index from the chapter (GIN for `tsvector` L8 + JSONB L9, partial, composite cursor L6, expression) → Ch 039 L1 declares/tunes; this lesson names the *vehicle* (hand-written `create index` in a migration), not the mechanic.
- the Neon-serverless vs node-postgres `db.execute`-return divergence → Ch 036 L4 / setup chapter (named, not resolved).
- Zod validation of the allow-list input feeding a dynamic identifier → Ch 042 ("validated upstream").
- `EXPLAIN ANALYZE` for when a raw query is slow → Ch 039 L3.

**Terminology / mental models established (reuse verbatim):**
- **the spine:** "the builder is the floor you stand on; raw SQL is a rope you lower yourself on — useful, deliberate, and you keep both hands on it." One-line takeaway: reach **rarely, deliberately, at the shallowest depth that works, always parameterized, and never `sql.raw` with input you can't trace to an allow-list.**
- **the reach is a spectrum, not a cliff** — prefer the shallowest drop that solves the problem (fill the gap, don't abandon the builder).
- **a bound parameter travels beside the query, never inside it** (`$1` placeholder + separate params array) — the picture behind injection-safety; `sql.raw`/plain-literal splices the value into the executable string. The plain-literal injectable shape is shown via node-postgres `pool.query(\`…${userInput}…\`)` (NOT `db.execute` with a plain string — `db.execute` takes an SQLWrapper, not a raw string, so a plain literal won't compile there); reuse `pool.query` for the injectable-no-tag case if revisited.
- the governance review reflex (reuses L1/L2/L5 "X-in-a-diff-is-a-question"): a `sql\`\`` invites "what does the builder not do here?"; a `sql.raw`/`sql.identifier`-on-a-runtime-value invites "where did this name come from?" — the only acceptable answer is "a fixed set in our code."
- **`sql.identifier` quoting is necessary but not sufficient** — the allow-list is the control, the quoting is the seatbelt.
- reuses verbatim: `sql<T>` is a TS-side claim not a check (L4/L7/L8/L9); parameterization holds inside `sql\`\`` (L1/L4/L6/L8/L9); the missing-`where` guard is gone under `db.execute` (L1 data-loss framing).
- `sql\`\`` tagged template, `sql.raw`, `sql.identifier`, `db.execute`, `dynamic identifier` Term tooltips defined here; does NOT re-Term `SQL injection`/`parameterized query`/`placeholder` (L1 owns).

**Patterns / best practices (project chapters must follow):**
- raw `sql\`\`` is the governed exception in feature/query code — reach only when the builder is *missing a feature*, never when it merely feels verbose; prefer the shallowest drop.
- never pass user-influenced input to `sql.raw` or `sql.identifier`; validate against a fixed allow-list (hardcoded set / map keyed by a validated value) *first*, then build the identifier.
- keep Drizzle patched ≥ 0.45.2 / 1.0.0-beta.20 (the `sql.identifier` escaping floor), but treat the allow-list as the real control regardless of patch level.
- inside a migration file, hand-authored `create extension`/`create index`/`create trigger`/`alter` is normal and expected — the discipline is *read every migration before it ships*, not *avoid SQL*.
- every multi-tenant example still carries `eq(invoices.organizationId, orgId)` by hand (no `tenantDb` until Unit 10).

**Misc.:**
- **Real CVE used as the safety capstone — verified June 2026:** `CVE-2026-39356` / **GHSA-gpj5-g38j-94v9**, a SQL injection *through* `sql.identifier()` (older `escapeName()` didn't double an embedded `"`), fixed in Drizzle **0.45.2** and **1.0.0-beta.20**; canonical vulnerable line `orderBy(sql.identifier(req.query.sort))`. The patched-version floor is stated as fact and the `ExternalResource` links the verified-real GitHub advisory (`https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9`); downstream agents must not soften or fabricate the GHSA slug.
- Schema reuse only (Ch 037, never redeclared): `invoices` (`id`, `amountDue`, `status`, `organizationId`, `createdAt`, `searchVector` from L8), `organizations`. Every example recycles a fragment the student already wrote earlier in the chapter (`ts_rank` L8, FTS `@@`/`websearch_to_tsquery` L8, window/JSONB fragments L7/L9, `count(*) filter` L4); zero new domain.
- Migration excerpt uses the chapter's established names (`search_vector` column, `idx_invoices_search_vector_gin` index, `pg_trgm`, the `set_updated_at()`/`invoices_set_updated_at` `updatedAt` trigger from Ch 037 L4) and is labeled as a migration file (`title="drizzle/0003_search_and_audit.sql"`) so it isn't read as app code.
- Allow-list sort example introduces `SORTABLE = ['created_at', 'amount_due'] as const` + `find`/`??` validation, and a `SORT_COLUMNS` map for the `sql.raw`-from-a-map variant — illustrative shapes for the dynamic-identifier discipline.
- APIs version-neutral across Drizzle 0.45 → 1.0 (no v1/v2 split); no `relations()`/`defineRelations` code. **Confirmed June 2026: Drizzle ships no typed builder for the FTS/window/operator/JSONB fragments cited as "no Drizzle helper" — that absence is why the escape hatch exists; do not invent builders.**
- Built widgets (final state): `StateMachineWalker` (`kind="decision"`, "When do you reach for raw SQL?"); 2 `CodeVariants` (syncKeys `param-boundary` [Parameterized / Plain template literal / sql.raw] and `identifier-allowlist` [From the request / Allow-list then sql.identifier / sql.raw from a map]); custom astro figure `param-bind-vs-splice` (lesson component at `src/components/lessons/038/10/param-bind-vs-splice.astro`, NOT a wrapped `<Figure>`); `Tokens` (bound-vs-spliced, target `${term}`, decoys `${sortColumn}`/`${status}`/`${orgId}`); `CodeTooltips` on `sql<number>`; 2 plain `Code` (`refresh materialized view` one-liner, migration excerpt); `Buckets` (reach-or-builder); 3 `ExternalResource` (GHSA advisory, magic-`sql` docs, `db.execute` docs).
