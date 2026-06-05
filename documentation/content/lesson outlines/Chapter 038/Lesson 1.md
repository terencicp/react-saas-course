# Lesson 1 — CRUD and the four chain methods

## Title

- Title (h1): `CRUD and the four chain methods`
- Sidebar label: `CRUD basics`

## Lesson framing

First mechanics lesson of Chapter 038. Chapter 037 built `db/schema.ts` and ended at types (`$inferSelect`/`$inferInsert`); this lesson is the student's first time *running a query* against that schema. It must land the four CRUD entry points (`db.select`, `db.insert`, `db.update`, `db.delete`), the four chain methods (`where`, `orderBy`, `limit`, `offset`), the operator-helper vocabulary, and two threads that run through the entire chapter: **automatic parameterization** (named the first time a value enters a `where`) and **the missing-`where` failure mode** on `update`/`delete`. Everything else in the chapter (joins, relational API, aggregates, upserts, pagination) layers on these shapes.

Pedagogical conclusions that apply lesson-wide:

- **Senior frame, stated implicitly in the intro:** "given a schema, what's the smallest set of call shapes that covers ~90% of a feature's data access?" The answer *is* the lesson's structure. Don't enumerate exhaustively — land the durable shapes and the judgment around them.
- **This is the most hands-on lesson in the chapter.** The `DrizzleCoding` widget (TS Drizzle query → PGlite, result-row grading) is the primary teaching vehicle, not prose. The student should write a `select`, a `where`, an `insert…returning`, and a guarded `update` with their own hands. Reading syntax does not build the muscle; typing it does. Budget 3–4 `DrizzleCoding` exercises.
- **Minimize cognitive load by building one shape at a time.** `select` → `where` → `orderBy`/`limit`/`offset` → then the three writes. Each new piece attaches to the running query, never a fresh example. The query the student ends with reads like real feature code.
- **The chainable builder is the mental model:** `db.select()` returns a builder object; each method returns the builder again; nothing runs until awaited. Make the laziness explicit once — it explains why chaining order doesn't matter and why `await` (or `.execute()`) is the trigger.
- **Two failure modes carry real production stakes and deserve emotional weight, not a footnote:** (1) a `delete`/`update` with no `where` silently hits every row — Drizzle does not warn; (2) dropping a value outside the `sql` tag (or into `sql.raw`) drops parameterization. Both are framed as code-review triggers a senior internalizes.
- **Running domain (from Ch 037, reuse verbatim, never redeclare in prose):** `invoices` (`id`, `amountDue` numeric→`string`, `status` pgEnum `'draft'|'sent'|'paid'|'void'`, `dueDate` date, `createdAt` timestamptz, `organizationId` FK notNull, `assignedToId` FK nullable), `organizations` (`id`, `name`), `users`. Type names: `Invoice`/`NewInvoice`. Money is a `string` end-to-end — never `parseFloat`. `amountDue` is the canonical money column name.
- **Tenancy note (deliberate staging):** Code conventions forbid bare `db.select(...).from(invoices)` *once `tenantDb(orgId)` exists* (Unit 10). It does not exist yet. Bare `db` is correct here. Show `where(eq(invoices.organizationId, orgId))` as the manual tenant filter so the student already sees org-scoping at the query layer, and plant a one-sentence forward pointer that Unit 10 will fold this into a factory. Do **not** teach `tenantDb`.

## Lesson sections

### Introduction (no header)

Warm, brief, 2–3 short paragraphs. The hook: Chapter 037 made the schema the source of truth and derived the types; a schema you can't read from or write to is inert. This lesson turns those tables into a data-access surface. State the senior question implicitly — a SaaS feature needs to read rows, filter them, sort them, page them, and write them back; that's a surprisingly small, fixed set of call shapes, and they're the same four verbs SQL has always had (SELECT/INSERT/UPDATE/DELETE) wearing a typed, autocompleted TypeScript coat. Preview the end state: by the end the student writes every basic read and write a feature needs, knows the one omission that wipes a table, and knows why SQL injection isn't a thing they have to think about on these paths. Name `CRUD` and `ORM` with `Term` tooltips on first use.

### The db client and the query builder

Short grounding section so every later snippet has a referent.

- `db` is imported from `db/index.ts` (wired in the Ch 040 setup — name it, don't build it) alongside the schema tables from `db/schema.ts`. It's the single call site for every query.
- **The builder mental model.** `db.select()` doesn't run a query — it returns a *query builder*. Each method (`.from()`, `.where()`, …) returns the builder again, so calls chain. The SQL is assembled lazily and only sent to Postgres when the builder is `await`-ed (it's a thenable) or `.execute()`-d. Two payoffs to state now and cash later: (1) nothing fires by accident, (2) chaining *order* doesn't change the emitted SQL.
- Keep this tight — one small `Code` block showing the import line + a bare `await db.select().from(invoices)`. No deep dive.

Tooltip candidates: `thenable` (an object with a `.then`, so `await` works on it).

### Reading rows with db.select

The anchor section. Build the read shape incrementally.

- **Whole-row select.** `await db.select().from(invoices)` returns `Invoice[]` — the full `$inferSelect` row shape, inferred, no hand-typing (callback to Ch 037 L10). `.from()` is mandatory and omitting it is the single most common first error — say so plainly.
- **Column projection narrows the type.** `db.select({ id: invoices.id, amountDue: invoices.amountDue }).from(invoices)` returns `{ id: string; amountDue: string }[]` — exactly those fields, inferred from the projection. No `Pick<Invoice, …>` restated (callback to the Ch 037 carve-out test: projecting inferred members is fine, restating field+type is the smell). The projection *key* is the TS field name.
- Use **`CodeTooltips`** on this projection block to surface the two inferred return types inline (`db.select()` → `Invoice[]`; the projected form → the narrowed shape) without breaking into prose. Keys: `select`, `amountDue`. This is the cheapest way to show "the type follows the projection."
- **Async shape, briefly.** Every query is awaited; `.then(...)` works too. Don't belabor — the builder section already set this up.

First **`DrizzleCoding`** exercise here (pure read + projection): seed a handful of `invoices` rows for one org; ask the student to return `id` and `amountDue` for all invoices. Pins the projection-narrows-the-type lesson with their hands. Schema/seed authoring constraints below in Scope.

### Filtering with where and the operator helpers

The largest teaching block. This is where parameterization gets named.

- **`where` takes a condition built from operator helpers** imported from `drizzle-orm`: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `like`, `ilike`, `between`. Don't dump all twelve as prose — show `eq` first in a worked line (`where(eq(invoices.status, 'sent'))`), then present the rest compactly. A small **two-column reference table** (helper → SQL it emits, e.g. `eq → =`, `inArray → IN (…)`, `isNull → IS NULL`) is the right vehicle — scannable, not a wall of prose. Wrap it in a `Figure` if rendered as a styled table, or just a markdown table.
- **Combining conditions** with `and(...)`, `or(...)`, `not(...)`. The canonical multi-tenant read: `where(and(eq(invoices.organizationId, orgId), eq(invoices.status, 'sent')))`. This is the shape they'll write hundreds of times; make it the worked example.
- **Parameterization, named explicitly — its own beat with a danger framing.** Every value passed to `eq(col, value)` (and every `${value}` inside a `sql\`\`` template, previewed for L10) is sent to Postgres as a bound `$1` placeholder, *separate* from the SQL text. The value is never spliced into the query string, so it can never be interpreted as SQL — **SQL injection is structurally impossible on these paths.** This is the single most important security property of the whole data layer and the student gets it for free.
  - Vehicle: a **`CodeVariants`** (two tabs) contrasting the string-concatenation anti-pattern the student may have seen elsewhere (`` `... where status = '${input}'` `` — a classic injection, mark with `del=`) against the Drizzle form (`eq(invoices.status, input)` — mark with `ins=`). The prose under the safe tab states the placeholder is bound by the driver. This A/B makes "why is this safe" concrete instead of asserted.
  - State the one escape hatch where it does *not* hold: `sql.raw(userInput)` interpolates verbatim — owned at depth in L10 of this chapter. One sentence, forward pointer.
  - Use a **`Term`** tooltip on `SQL injection` (attacker-supplied input that changes the query's meaning) and on `parameterized query` / `placeholder`.
- **Watch-out, inline here (not bundled):** `like` is **case-sensitive**; `ilike` is the case-insensitive form Postgres provides natively. Show both in one line. This belongs in the operator section, not a tips appendix.

Second **`DrizzleCoding`** exercise: org-scoped filter — return invoices for org 1 with `status = 'sent'` and `amountDue` above a threshold, using `and(...)`. Forces `eq` + `gt` + `and` composition and the tenant-filter habit. Provide a partial starter with the `and(...)` skeleton and a `/* finish */` marker (mirror the component doc's example shape).

### Sorting and paging with orderBy, limit, and offset

The remaining three chain methods, grouped because they shape the result set rather than filter it.

- **`orderBy`** with `asc(...)` / `desc(...)` (also from `drizzle-orm`): `orderBy(desc(invoices.createdAt))`.
- **The tiebreaker, taught as a senior reflex.** Multiple keys: `orderBy(desc(invoices.createdAt), asc(invoices.id))`. Explain *why*: sorting by a non-unique column alone leaves rows that share a value in an undefined order — the database may return them differently between runs. A unique tiebreaker (the PK) makes ordering **deterministic**. Plant the forward pointer once: this exact trick is what cursor pagination depends on (L6 of this chapter). This is a high-leverage idea; give it a sentence of weight, not a clause.
- **`limit` and `offset`.** `limit(20).offset(40)` — page 3 at page-size 20. Mention the senior carve-out without teaching it: `offset` is fine for fixed, small lists (admin tables under a few hundred rows); cursor pagination wins for anything that grows or shows live data — full decision in L6. One sentence, trigger named, tool deferred.
- **Watch-outs inline:** `.limit(0)` returns an empty array — distinct from forgetting `.limit` entirely (which returns everything); chaining *order* among these is irrelevant (`.where().orderBy()` and `.orderBy().where()` emit identical SQL) — pick one for readability. State the chaining-order point here since it's where students first chain three methods and wonder if sequence matters.

Third **`DrizzleCoding`** exercise (optional, fold into the previous if budget is tight): "five most recent sent invoices for this org, newest first, ties broken by id" — `where` + `orderBy(desc, asc)` + `limit(5)`. Locks the tiebreaker habit. `ordered: true` (default) since the query has a deterministic `orderBy`.

### Writing rows: insert, update, and delete

The three mutations, taught together because they share the `RETURNING` and missing-`where` threads. This is the section with the highest production stakes.

- **`db.insert`.** `db.insert(invoices).values({ … })`; batch with `.values([{…}, {…}])`. What the student must supply is exactly `$inferInsert` (Ch 037 L10 callback): columns with a default (`createdAt` via `.defaultNow()`, `id` via the PK default) are optional; `.notNull()` columns without a default are required; generated columns are rejected. Don't re-derive the asymmetry — point at it. One `Code` block, a realistic `NewInvoice` values object (`organizationId`, `amountDue: '0.00'`, `status: 'draft'`, `dueDate`).
- **`db.update`.** `db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, id))`. `.set()` takes the columns to change.
- **`db.delete`.** `db.delete(invoices).where(eq(invoices.id, id))`.
- **The missing-`where` failure mode — the section's centerpiece, maximum weight.** `db.update(invoices).set({ status: 'void' })` with **no** `where` sets *every invoice in the table* to void. `db.delete(invoices)` with no `where` empties the table. Drizzle does **not** warn, the types are happy, it compiles, it runs, and in production it's a data-loss incident. The senior pattern: every `update` and every `delete` carries a `where`; the omission is a code-review trigger and Drizzle ships a real lint guard for it — the `drizzle/enforce-update-with-where` and `drizzle/enforce-delete-with-where` rules in `eslint-plugin-drizzle` flag an unqualified `update`/`delete` at lint time. Name the rules concretely (verified current); the student should leave knowing the failure mode *and* that the tooling exists to catch it.
  - Vehicle: a **`Code` block** showing the two dangerous statements with a `<Aside type="danger">` calling out "this is not a typo the compiler catches — it's a deploy that wipes the table." The danger aside is the right intensity here; this is the one place in the lesson that warrants it.
  - Optionally reinforce with a **`PredictOutput`**-style framing is *not* ideal (no stdout); instead consider a tiny **`MultipleChoice`**: "Which of these statements modifies more than one row?" with the missing-`where` update as the answer and a guarded one as a distractor. Cheap recall check on the highest-stakes idea.
- **`.returning()` — the round-trip eliminator, introduced here because every mutation in the chapter uses it.** Append `.returning()` to insert/update/delete to get the affected rows back with full `$inferSelect` shape (or a projected subset: `.returning({ id: invoices.id })`). Without it, the app issues a *second* query to learn the generated `id` or the post-update values — two round-trips and a race window; with it, one statement, typed result, no follow-up select. Frame the follow-up select as the smell. Depth (the `excluded` table, conflict targets) is L5 — this lesson teaches only the `.returning()` attachment.
- **Soft delete, named not taught.** The senior default for most SaaS rows is a *soft* delete — `update` setting `deletedAt` rather than a hard `delete` — so the row survives for audit and recovery; hard `delete` is for tenant offboarding and audit-log expiry. Ch 039 owns the pattern and the query-time filtering. Two sentences, forward pointer. (The `softDelete`/`deletedAt` column already exists from Ch 037 L4 — the student has seen it.)

Vehicle for the three writes: an **`AnnotatedCode`** stepping through one `insert…returning` then one guarded `update…where…returning`, 4–5 colored steps (insert green, the `where` guard blue/orange, the `returning` violet). One block, attention directed to each part in turn — exactly the AnnotatedCode use case. Keep each step ≤6 lines of prose.

Fourth **`DrizzleCoding`** exercise (write path): insert a new draft invoice for an org and **return its generated row**, OR update one invoice's status to `'paid'` with a correct `where` and `.returning()` the updated row. Grade on the returned row (`expectedRows`). Because PGlite has no native `uuidv7()`, the exercise schema must use a literal-friendly PK — see Scope. If `returning()` result-row grading is awkward for an insert (generated id varies), prefer the **update** variant where the returned row is deterministic, or `.returning({ status: invoices.status })` so the expected row is stable.

### Reading one row vs. many

Short, practical section closing a gap students immediately hit.

- The SQL builder always returns an **array**. To read a single row: `.limit(1)` then destructure — `const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)` — or `await query` then `.at(0)`. `invoice` is then `Invoice | undefined`.
- **There is no `.findFirst` on the SQL builder.** That method lives on the *relational* query API (`db.query.<table>.findFirst`), which is L3 of this chapter. Name it so the student doesn't hunt for it here. One sentence, forward pointer.
- Show the destructure idiom in a small `Code` block; note the `| undefined` so the not-found case is on the student's radar (guarding it is downstream).

## Scope

**This lesson teaches:** the four CRUD entry points (`db.select`/`insert`/`update`/`delete`), the four chain methods (`where`, `orderBy`, `limit`, `offset`), the operator helpers and `and`/`or`/`not`, automatic parameterization (and the `sql.raw` exception, named only), `.returning()` as an attachment, single-row reads via `limit(1)` + destructure, and the missing-`where` failure mode.

**Prerequisites to restate concisely (do not re-teach):**
- The schema tables and their canonical columns exist from Ch 037 — reference `invoices`/`organizations`/`users`, never redeclare them in prose. `amountDue` is `numeric → string`; `status` is a pgEnum union.
- `$inferSelect`/`$inferInsert` (Ch 037 L10) — the row and insert shapes. Point at them as "the types you already have"; this lesson shows queries *return* those shapes, it does not re-derive inference. The carve-out test (projecting is fine, restating field+type is a smell) is a one-line callback.
- `casing: 'snake_case'` (Ch 037 L2) bridges TS camelCase to SQL — already understood; don't re-explain.

**Explicitly out of scope (defer with at most a one-sentence pointer):**
- Joins across tables → L2.
- The relational query API `db.query.…` and `.findFirst` → L3.
- Aggregations, `groupBy`, `having` → L4.
- Upserts (`onConflictDoUpdate`/`DoNothing`), the `excluded` table, conflict `target`, and `.returning()` *at depth* → L5. (Only the bare `.returning()` attachment is taught here.)
- Cursor vs. offset pagination decision and encoding → L6. (Only `limit`/`offset` mechanics + the carve-out trigger here.)
- Subqueries, CTEs, `exists` → L7.
- The `sql\`\`` tagged template and `sql.raw` at depth → L10. (Parameterization is *named* here; the raw escape hatch is named as the one exception, not taught.)
- Indexing the columns used in `where`/`orderBy` → Ch 039 L1.
- Soft-delete query filtering and the `deletedAt` lifecycle → Ch 039 (named as the senior default, not built).
- `tenantDb(orgId)` factory → Unit 10. (Manual `where(eq(invoices.organizationId, orgId))` is shown; the factory is only foreshadowed.)
- Transactions → Ch 039 L4.

## DrizzleCoding sandbox authoring notes (apply to every exercise in this lesson)

- **No native `uuidv7()` in PGlite** (per Ch 037 L5 continuity): do **not** use `uuid().primaryKey().default(sql\`uuidv7()\`)` in exercise schemas — the PK default won't resolve. Use a simple `integer('id').primaryKey()` (or `text` PK) and supply explicit `id` values in the `seed` INSERTs. The lesson *prose* still shows the production UUIDv7 shape; only the sandbox schema simplifies, and that staging matches Ch 037's exercise precedent.
- **No `casing` client in the sandbox runtime:** pass explicit snake_case name strings in the exercise `schema` builders (`timestamp('created_at')`, `integer('organization_id')`) so the emitted DDL columns line up with `seed` SQL — same staging Ch 037 L3–L9 used. Lesson prose uses bare builders.
- **Money as `numeric`:** keep `amountDue` as `numeric('amount_due', { precision: 12, scale: 2 })` so the returned value is a `string`; expected rows compare against string values (`amountDue: '120.00'`). Reinforces the never-`parseFloat` rule.
- **`status` as a real enum** is fine in PGlite if declared via `pgEnum` in the schema; if the grader's prefix-match makes it noisy, a plain `text('status')` column with seeded `'draft'`/`'sent'` values grades identically — acceptable simplification.
- Set `ordered: false` on exercises whose query has no deterministic `orderBy`; `true` (default) when there is one (the sort/paging exercise).
- Provide `expectedRows` on graded exercises so the result-row checklist and AI feedback render; subset-match per column means pinning two columns accepts a wider `select`.

## External resources (closing, optional)

2–3 `ExternalResource` cards, current at authoring time: Drizzle "Select" / "Insert" / "Update & Delete" query docs (the canonical API reference the student will return to), and the Drizzle "Filters" operators page. A `VideoCallout` is optional and low-priority — this is a hands-on mechanics lesson; the `DrizzleCoding` widgets carry the learning better than a video would. Only add one if the Resourcer finds a tight (<15 min) Drizzle-queries walkthrough.

## Component inventory (summary for downstream agents)

- `DrizzleCoding` ×3–4 — the spine of the lesson (read+projection; org-scoped filter; sort/page+tiebreaker; write+returning).
- `CodeVariants` ×1 — concat-injection (del) vs parameterized `eq` (ins), in the parameterization beat.
- `AnnotatedCode` ×1 — the insert…returning / guarded update…returning walkthrough (writes section).
- `CodeTooltips` ×1 — inferred return types on the projection block (`select` → `Invoice[]`, projected → narrowed).
- `Aside type="danger"` ×1 — the missing-`where` data-loss callout.
- `MultipleChoice` ×1 (optional) — "which statement hits more than one row?" recall check on the missing-`where` idea.
- `Code` blocks — db import/builder, operator reference table, single-row destructure.
- `Term` tooltips — `CRUD`, `ORM`, `thenable`, `SQL injection`, `parameterized query`/`placeholder`.
- `ExternalResource` ×2–3 — Drizzle select/insert/update-delete/filters docs.
