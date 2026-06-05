# Lesson 3 — Nested reads with the relational API

- **Title:** Nested reads with the relational API
- **Sidebar label:** Nested reads (RQB)

## Lesson framing

This is L3 of the querying chapter. L1 taught the four CRUD shapes + chain methods on the SQL builder (`db.select().from()…`); L2 taught the four joins as the way to pull columns from two tables and the left-join nullability tax. This lesson teaches the **third read shape — the relational query builder (RQB)**, `db.query.<table>.findMany/findFirst({ with })` — the senior default whenever the read is a **tree**: an entity plus its related rows, returned as one typed nested object, in one SQL statement.

**The senior question (state implicitly in the intro, do not label it).** L2 can join an invoice to its line items, its tags, and its org — but the result is a *flat* row set the app has to regroup by hand, and the moment you want the children as a nested array you're hand-threading nulls and writing the same join three times. So when the read is shaped like a tree, what call returns the tree directly? RQB. It consumes the `defineRelations` graph from Ch 037 L9 and assembles the nested object server-side, one statement, N+1-safe by construction.

**The load-bearing mental model the student must leave with — "describe the tree, get the tree."** With the SQL builder the student composes the *operation* (select these columns, join on this predicate, group like so) and shapes the result themselves. With RQB the student **declares the shape they want** (this entity, with these relations, filtered like so) and Drizzle plans the SQL. RQB is the **declarative, shape-first** read; the SQL builder is the **imperative, operation-first** read. This framing is the spine: every "when to use which" decision later in the lesson falls out of it.

**The single most important correction this lesson makes (CRITICAL for downstream agents).** The Ch 038 chapter outline for this lesson was written against the **v1 callback `where`** form (`where: (invoices, { eq, and, gt }) => and(...)`). That is **wrong for this course.** Ch 037 L9 committed the course to **Relations v2** (`defineRelations`, `db.query`), and the v2 RQB uses an entirely different **object-syntax** `where` and `orderBy`. The lesson MUST teach the **v2 object syntax**:
- `where: { status: 'sent', amountDue: { gt: '0' } }` — keys are columns, values are either a literal (sugar for `eq`) or an operator object (`{ gt, gte, lt, lte, ne, in, notIn, like, ilike, isNull, … }`).
- Boolean combinators are object keys: `where: { OR: [...], AND: [...], NOT: {...} }`.
- The escape hatch is `where: { RAW: (t) => sql\`…\` }` (NOT a top-level callback).
- `orderBy: { createdAt: 'desc', id: 'desc' }` (object, multiple keys in insertion order).
- `columns: { id: true, amountDue: true }` (or `{ secret: false }` to exclude).

This also obsoletes the outline's "filtering parent rows by joined-table values needs `db.select` + `exists()`" claim. **v2 supports filtering parents by relation conditions natively** — `where: { lineItems: { quantity: { gt: 0 } } }` (parents that have a matching child) and `where: { lineItems: true }` (parents that have at least one child). This is a **headline new v2 capability** and a primary reason the lesson is worth teaching as its own thing rather than "joins, but nicer." Teach it as a first-class feature, not a footnote. (Source: orm.drizzle.team/docs/rqb-v2 and /docs/relations-v1-v2, verified June 2026.)

**Pedagogical spine.** Motivate from the L2 pain (flat rows + manual regroup) → introduce the call shape on the simplest read (`findMany`/`findFirst`, no options) → add `with` for one relation → nested `with` → `columns` projection (top-level and inside `with`) → `where`/`orderBy` in v2 object syntax → filtering children (`where` inside `with`) → filtering parents by children (the new v2 power) → many-to-many `with: { tags: true }` walking the junction invisibly → the one-statement / N+1-safe payoff with a peek at the emitted SQL → the result-type capstone (inferred nested type as a prop) → the "when to drop to the SQL builder" boundary. Each step adds exactly one new idea to a query the student already understands — strict cognitive-load discipline.

**Tone / level.** Adult, terse, decision-first. The student already writes `db.select` fluently (L1/L2) and already declared the relations graph (Ch 037 L9), so mechanics move fast. The lesson spends its weight on (a) the declarative-vs-imperative mental model, (b) the v2 object-`where` syntax (genuinely new surface), and (c) the parent-by-child filtering capability — the three places a student coming from L2 or from v1 tutorials will stumble.

**Staging continuity (carry forward, do not re-litigate).**
- Reuse the running domain verbatim from Ch 037: `organizations`, `invoices`, `invoiceLineItems`, `users`, `tags`, `invoiceTags`, `memberships`. Never redeclare — reference columns/relations only.
- The relations graph is **already declared** (Ch 037 L9): `invoices.lineItems` (many), `invoices.organization` (one), `invoices.tags` (many, via `.through(invoiceTags)`), `invoices.assignedTo` (one → users), etc. This lesson **consumes** that graph; it writes **zero `defineRelations` code**. If a relation needs naming, name it as "declared in L9," don't rebuild it.
- Money is `amountDue` `numeric` → `string` end-to-end (Ch 037 L3 canon); operator values for money columns are strings (`{ gt: '0' }`), never `parseFloat`. Reuse the established "two worlds" reflex.
- Inferred types: Ch 037 L10 established `$inferSelect` is **flat** (no relations). This lesson teaches the RQB's **own** inferred nested type as the way to type a nested read — the explicit continuation of L10's "relations gap" pointer.
- `db` is the client from `db/index.ts`; full wiring (pooling, env) stays owed to Ch 040. Show only `db.query.…`.
- Tenant scoping: every multi-tenant read still carries `organizationId` explicitly in `where` (`where: { organizationId: orgId }`) until `tenantDb` exists (Unit 10) — same rule as L1.

**Version reality (one tight aside, reuse Ch 037 L9's framing, do not re-litigate).** RQB v2 ships in `drizzle-orm@1.0.0-beta`; `db.query` is the v2 builder. v1's per-table-callback `db.query` was moved to `db._query` and is `[OLD]`. The student writes v2 only; v1 is named so older tutorials (which show the callback `where`) don't confuse them. One sentence, near the first `where` example. Flag for the conventions maintainer (see Scope) — `Code conventions.md` §Data layer still shows the v1 callback-traversal shape.

---

## Lesson sections

### When a join gives you the wrong shape

**Goal:** motivate RQB from the gap between what a join *returns* (flat rows) and what a feature *needs* (a nested object). Trigger-before-tool: the flat join result is the trigger, `db.query` is the tool.

- Open on a concrete want from the running domain — "render an invoice detail page: the invoice, its line items as a list, and its org name." The L2 way: `db.select({ invoice: invoices, lineItem: invoiceLineItems, org: organizations }).from(invoices).leftJoin(invoiceLineItems, …).leftJoin(organizations, …)`. Show it briefly with a plain `Code` block.
- Name the two costs the student now feels from L2: (1) **the result is flat and duplicated** — one row *per line item*, the invoice columns repeated on every row; the app must `reduce` them back into `{ invoice, lineItems: [...] }` by hand. (2) **left-join nullability** — every right-side column is `T | null`, so reading them means null-threading the L2 way.
- **Diagram — flat rows vs. the tree (the key visual).** A `<Figure>` with plain HTML+CSS, two panels side by side: **left**, the flat join result as a small table — an invoice's columns repeated across 3 line-item rows (visually show the duplication with a tinted "repeated" column); **right**, the same data as a nested object tree (`invoice { …, lineItems: [ {…}, {…}, {…} ], organization: {…} }`). An arrow/label between them: "RQB returns the right shape directly." Pedagogical goal: make the *shape mismatch* visceral before any new API — the student should *want* the tree. Cap height per the diagrams vertical-space rule; keep it horizontal.
- Land the thesis the student carries: **when the read is a tree — an entity and its related rows — describe the tree and let Drizzle build it. That's what the relational query builder is for.** Name that it reads the `defineRelations` graph from Ch 037 L9 (the payoff that lesson promised, now cashed).
- `Term` candidates: **relational query builder (RQB)** ("Drizzle's `db.query.…` API that reads the relations graph and returns nested objects"); **tree read** ("a read shaped as an entity plus its nested related rows, as opposed to a flat row set").

**Why this section:** the guidelines demand the senior question implicit in the intro and "trigger before tool." A join the student *just learned* producing the *wrong shape* is the most concrete possible trigger, and the flat-vs-tree figure is the frame the rest of the lesson pays off.

### findMany, findFirst, and the with traversal

**Goal:** establish the call shape on the simplest reads, then add `with` for one relation — the bread-and-butter RQB query.

- Introduce the two entry points plainly:
  - `db.query.invoices.findMany()` → `Invoice[]` (every invoice, no relations — equivalent to `db.select().from(invoices)` but the RQB entry).
  - `db.query.invoices.findFirst()` → `Invoice | undefined` (adds `LIMIT 1`; returns the row or `undefined` when none matches). Call out `undefined`, not throw, not null — and tie it to L1's single-row idiom (`const [row] = await …limit(1)`): RQB's `findFirst` is the relational-API version of that, no destructure needed. (Verified: v2 `findFirst` return type carries `| undefined`.)
  - Note `db.query.<table>` exists for **every table in the schema** — the entry is generated, like `db.select`.
- Add the first relation. **Use `AnnotatedCode`** (single block; focus moves from the entry to the `with` key to the inferred result). The block:
  ```ts
  const invoice = await db.query.invoices.findFirst({
    where: { id: invoiceId },
    with: { lineItems: true, organization: true },
  });
  ```
  Steps, colored:
  1. `{1-2}` the entry + `findFirst`, blue — "RQB entry on `invoices`; `findFirst` returns one row or `undefined`."
  2. `"where: { id: invoiceId }"`, orange — preview the object `where` (full treatment two sections down): "keys are columns; a bare value means equals." One sentence, defer depth.
  3. `"with: { lineItems: true, organization: true }"`, green — **the traversal**: each key is a relation **declared in `db/relations.ts` (Ch 037 L9)**; `true` means "load it." `lineItems` resolves to an array (it's a `many` relation), `organization` to a single object (a `one` relation).
  4. (result note, no highlight or `{whole}`) the inferred shape: `Invoice & { lineItems: LineItem[]; organization: Organization }` — typed, nested, no hand-written interface. Forward-point the capstone section.
- **The relation-name = `with`-key rule (reuse Ch 037 L9 verbatim).** The key inside `with` is the **exact relation name** declared in `defineRelations` — `lineItems`, `organization`, `tags`. Singular relation (`one`) → single object; plural (`many`) → array. This is why L9 insisted relation keys "read like the data."
- **The silent-`undefined` watch-out (the #1 RQB bug, reuse L9's core distinction).** A `with` key that isn't a declared relation **doesn't error** — the field is simply absent from the inferred shape (and TS autocompletes only declared relations, so a typo is your signal). The deeper version: if the FK exists but the *relation* was never declared in L9, `with: { tags: true }` won't type-check / won't return `tags`. Reuse L9's one-liner: "the FK is a write-time guarantee; the relation is a separate read-time declaration." Keep it to two sentences and a forward/back-pointer to L9 — don't re-teach L9.
- `Term` candidates: **`with`** ("the RQB option that loads declared relations into the result").

**Why this section:** the student needs the call shape and one working `with` before options pile on. Using `AnnotatedCode` here (not a plain block) is justified — the `where`/`with` split and the one-vs-many result distinction are exactly the multi-part focus the component is for, and coloring `with` green fixes "this is the traversal" in memory.

### Nesting deeper and picking columns

**Goal:** teach recursive `with` and the `columns` projection (top-level and inside `with`), so the student can shape both depth and width.

- **Nested `with`.** Relations chain: an invoice's line items, and each line item's product.
  ```ts
  with: {
    lineItems: {
      with: { product: true },
    },
  }
  ```
  State plainly: Postgres assembles the whole tree in **one** statement; the inferred type nests to match (`lineItems: (LineItem & { product: Product })[]`). One paragraph, one block (`Code` is fine — it's an additive shape, not a focus-walk). (If `product` isn't in the running domain, use `lineItems → invoice → organization` round-trip or any declared two-hop; keep entities from Ch 037.)
- **Column projection — top level.** `columns: { id: true, amountDue: true, status: true }` narrows the selected columns; the inferred row type narrows to exactly those keys (the L1 "type follows the projection" slogan, now on RQB). Drizzle does the partial select at the SQL level — unselected columns aren't transferred. Mention the exclude form (`columns: { internalNote: false }`) in one clause — include-mode and exclude-mode don't mix (include wins).
- **Column projection inside `with`.** The same `columns` option lives on a relation: load the org but only its `id` and `name`.
  ```ts
  with: {
    organization: { columns: { id: true, name: true } },
  }
  ```
  Frame it as the same narrowing applied to a child — "shape every level independently."
- **Use `CodeVariants`** (two or three tabs) to show the progression compactly: tab "Whole rows" (`with: { organization: true }`), tab "Projected child" (`with: { organization: { columns: { id: true, name: true } } }`), optional tab "Nested + projected" combining both. First-sentence framing per tab ("everything," "just what the card renders"). This A/B/C is exactly what `CodeVariants` is for and keeps the three shapes glanceable.
- **The why (senior framing).** Projecting isn't premature optimization theater — it's the difference between shipping the invoice's 20 columns to render a dropdown label and shipping 2. On a nested read the savings compound per child row. Name it as the default reflex for read paths that feed a specific UI.
- `Term` candidates: **`columns`** ("the RQB option that includes/excludes fields per level; narrows the inferred type to match").

**Why this section:** depth (`with`) and width (`columns`) are orthogonal knobs; teaching them back-to-back, each as one delta on the prior query, keeps the load low and lets the student see that "every level is shaped independently" — the generalization that makes the rest obvious.

### Filtering and ordering, the v2 way

**Goal:** teach the **v2 object syntax** for `where` and `orderBy` at the top level — the genuinely new surface, and the part most likely to trip a student who has seen v1 tutorials.

- **Lead with the version note (one tight aside).** "If you've seen `where: (t, { eq }) => eq(t.id, x)` in a tutorial, that's the **v1** callback form — moved to `db._query` and now `[OLD]`. The course uses **v2** (`db.query`), which takes a **filter object** instead. Same power, less ceremony." Reuse Ch 037 L9's version framing; do not re-litigate.
- **`where` as an object — the core shapes.** Build them up:
  - **Equality sugar:** `where: { status: 'sent' }` — a bare value means `=`.
  - **Operator object:** `where: { amountDue: { gt: '0' } }` — keys are operators (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `like`, `ilike`, `isNull`, `isNotNull`, plus array ops). Money value is a `string` (Ch 037 L3 reflex).
  - **Implicit AND across keys:** multiple keys in one object are AND-ed: `where: { organizationId: orgId, status: 'sent' }`.
  - **Explicit combinators as keys:** `where: { OR: [ { status: 'sent' }, { status: 'paid' } ] }`; `AND: [...]`, `NOT: {...}` likewise.
  - **The RAW escape hatch:** `where: { RAW: (t) => sql\`${t.amountDue} > ${threshold}\` }` for predicates the object syntax can't express (a Postgres operator, a function). Parameterized — same SQL-injection safety as L1 (reuse "every `${value}` becomes `$1`"). Forward-point L10 for raw at depth.
- **`orderBy` as an object.** `orderBy: { createdAt: 'desc' }`; multiple keys → multiple sort columns in insertion order: `orderBy: { createdAt: 'desc', id: 'desc' }`. **Reuse L1's tiebreaker reflex verbatim** — pair a non-unique sort column (`createdAt`) with the PK (`id`) for deterministic order; this is the same trick cursor pagination (L6) depends on, now in RQB object form.
- **`limit` / `offset`.** `limit: 20, offset: 40` as plain options — same semantics as L1; offset's "fine for small/stable, cursor for the rest" carve-out is L6, name only.
- **Use `AnnotatedCode`** on one realistic combined query (the component's sweet spot — several parts, each a step):
  ```ts
  const sent = await db.query.invoices.findMany({
    where: { organizationId: orgId, status: 'sent', amountDue: { gt: '0' } },
    orderBy: { createdAt: 'desc', id: 'desc' },
    limit: 20,
    with: { organization: { columns: { name: true } } },
  });
  ```
  Steps: (1) the object `where` with three AND-ed keys, blue — equality sugar + operator object + tenant scope; (2) the operator object `{ gt: '0' }`, orange — "operators are keys; money is a string"; (3) `orderBy` two-key, green — the tiebreaker reflex; (4) `limit` + the projected `with`, violet — page size + shaped child.
- **`Dropdowns` exercise (syntax drill).** A fenced RQB query with `___` blanks for: the equality-sugar value, an operator key (`gt`/`gte`/…), the `orderBy` direction, and the tiebreaker column. The student fills the v2 object slots. Provide the `answers` prop. Goal: lock the v2 object shape against the v1 callback muscle-memory. This is the right tool — it drills *exact syntax* the student must reproduce, which an MCQ can't.
- `Term` candidates: **`RAW`** ("the RQB `where` escape hatch — a `(t) => sql\`…\`` callback for predicates the object syntax can't express; still parameterized").

**Why this section:** the v2 object `where`/`orderBy` is the single largest new API surface in the lesson and the highest-risk for confusion (every pre-2026 tutorial shows the callback). Front-loading the version note, building the object shapes one at a time, and drilling them with `Dropdowns` is the load-minimizing path. Coloring the combined query's parts in `AnnotatedCode` keeps the four ideas separable.

### Filtering the children, filtering by the children

**Goal:** teach the two relation-filtering powers — `where` *inside* `with` (which children load) and `where` on a *relation key at the parent level* (which parents survive based on their children). The second is the **new v2 capability** and the lesson's standout.

- **Filtering children — `where` inside `with`.** Load each invoice but only its non-zero-quantity line items:
  ```ts
  with: {
    lineItems: { where: { quantity: { gt: 0 } } },
  }
  ```
  The key insight (reuse the chapter framing watch-out): this filters **which children load per parent** — it does **not** drop the parent. An invoice with zero matching line items still comes back, with `lineItems: []`. Same object `where` syntax as the top level, just scoped to the relation. Pair with per-relation `orderBy`/`limit` (e.g. "the 3 most recent comments per post") in one clause — these compose.
- **Filtering parents by their children — the v2 headline.** State the old limitation honestly: in v1 (and in raw joins) "give me invoices that *have* a paid line item" meant `db.select` + `exists()` or a join+group. **v2 lets you filter the parent by a relation condition directly:**
  ```ts
  // invoices that have at least one line item over 100
  where: { lineItems: { amountDue: { gt: '100' } } }
  // invoices that have any line items at all (existence)
  where: { lineItems: true }
  ```
  Read it as the lesson should: a relation *as a `where` key* asks "does a related row matching this exist?" — `{ … }` constrains the match, `true` just asks existence. This is the structural answer to the question L2 punted ("drop a parent based on a child"). Make explicit this **replaces** the old `db.select` + `exists()` reach for the common case.
- **Distinguish the two unmistakably (the core confusion to pre-empt).** Same predicate, two positions, two meanings:
  - `with: { lineItems: { where: {…} } }` → **keep every parent**, filter the child array.
  - `where: { lineItems: {…} }` → **drop parents** that have no matching child; children come back unfiltered (or as separately specified in `with`).
  **Use `CodeVariants`** (two tabs, "Filter the children" vs. "Filter the parents") with one-sentence first-line framing on each, so the position→meaning contrast is the whole point of the figure. This A/B is exactly the component's job.
- **The remaining escape hatch (named, not deep).** Genuinely gnarly parent predicates (correlated across multiple relations, aggregate thresholds like "more than 5 line items") still drop to `db.select` + `exists()`/a join+`having` (L2/L4). Name the boundary in one sentence — v2 relation filters cover the common existence/match case, not arbitrary aggregate existence. Forward-point L4 for aggregate thresholds.
- `Term` candidates: none new (reuses `where`, relation names).

**Why this section:** the two filtering positions are the subtlest part of RQB and the place students conflate "filter the list" with "filter the rows." Teaching them as the *same syntax in two positions* — and showing the position flips the meaning — is the clearest framing. The parent-by-child power is also the strongest "RQB earns its own lesson" argument, so it gets full first-class treatment, corrected away from the outline's obsolete `exists()`-only claim.

### Many-to-many without naming the junction

**Goal:** show that a `.through()` relation (Ch 037 L9) is walked by RQB with a single `with` key — the junction stays invisible — and close the L9/L8 cliff-hanger.

- Reconnect to Ch 037 L8/L9: `invoiceTags` is a pure junction (two cascade FKs + composite PK); L9 declared `invoices.tags` as a `many` relation with `.through(invoiceTags)` on both `from` and `to`. L8 ended on "the junction is inert until something walks it"; L9 declared the walk; **this is where the student finally reads it.**
- The payoff, stated as the cash-in:
  ```ts
  const invoice = await db.query.invoices.findFirst({
    where: { id: invoiceId },
    with: { tags: true },
  });
  // invoice.tags: Tag[] — the junction never appears
  ```
  `with: { tags: true }` returns `tags: Tag[]`; the student **never names `invoiceTags`**, never writes the two-join hop, never sees the junction in the result. The `.through()` declaration from L9 did that work once. One short paragraph + the block (`Code` — it's the payoff, not a focus-walk).
- **Contrast with L2's manual many-to-many (one tight aside).** L2 walked the same N:M with two explicit `innerJoin`s through `invoiceTags` and a flat, regroup-by-hand result. RQB collapses both joins and the regroup into `with: { tags: true }`. This is the concrete "describe the tree, get the tree" payoff for the hardest L2 shape. Recognition only; don't rebuild the L2 join.
- **`memberships` aside (brief, reuse L9's distinction).** The *promoted entity* (user ↔ org with `role`) is **not** a `.through()` walk — it's a first-class table you relate *to*. So you traverse it as a relation in its own right (`organization.memberships` → `membership.user`), not as an invisible junction. One sentence tying L8's junction-vs-entity decision to its read consequence; defer depth (Unit 10).
- `Term` candidates: none new.

**Why this section:** many-to-many is the read where RQB's value is most dramatic (it erases the most boilerplate), and it closes a two-lesson cliff-hanger (L8 → L9 → here). Keeping it short and payoff-framed — the hard work was the L9 declaration — is the right weight.

### One statement, no N+1

**Goal:** make concrete *why* RQB is the safe default — it emits **one** SQL statement and is N+1-safe by construction — by contrasting it with the loop that produces N+1, and peeking at the emitted SQL.

- **State the guarantee.** A `findMany` with `with` compiles to a **single** SQL statement: Drizzle uses correlated subqueries that aggregate each relation's rows into JSON, then shapes the nested object client-side. No per-parent round trip. (Source-verified: "a single SQL statement is outputted by Drizzle.")
- **Contrast with the N+1 shape (the thing RQB prevents).** Show the naive hand-written alternative in prose/`Code`: fetch invoices (1 query), then `for`/`map` each invoice and query its line items (N queries) — 1 + N round trips. Name it: **the N+1 problem**. Then state RQB does the same read in **1**. Keep it a motivating contrast, not a deep treatment — **forward-point Ch 039 L2** (spotting/fixing N+1 in code that bypasses RQB) and Ch 039 L3 (`EXPLAIN`) explicitly; this lesson plants the reflex ("reach for RQB and N+1 doesn't arise"), Ch 039 owns the diagnosis.
- **Peek at the emitted SQL (the `logger: true` callback).** Reuse Ch 037 L2's `logger: true` flag: with it on, the student sees RQB emit *one* statement with subqueries — the proof. One sentence + optionally a trimmed log snippet in a `Code` block (`sql` lang). Don't dwell on plan reading (Ch 039 L3).
- **Diagram — `DiagramSequence` (N+1 vs. one statement).** A short scrubbable sequence contrasting the two read strategies. Step 1: "Naive — query invoices" (1 box → DB). Step 2: "Naive — loop: query line items per invoice" (N arrows fanning to DB, badge "1 + N round trips", tinted as the cost). Step 3: "RQB — one statement" (single box → DB, badge "1 round trip", tinted as the win). Pedagogical goal: the round-trip count *is* the lesson; an animated fan-out of N queries collapsing to one is the clearest way to feel it. (`DiagramSequence` provides its own card — do not wrap in `<Figure>`.) Keep boxes simple, horizontal, height-capped.
- **The honest watch-out (reuse chapter framing).** RQB **plans its own SQL**, so a deeply nested `with` over wide tables can emit a heavier-than-expected JSON-aggregating query. The fix isn't to avoid RQB — it's to *measure* when something feels slow: `logger: true` to see the SQL, `EXPLAIN ANALYZE` (Ch 039 L3) to read the plan. Name, don't solve.
- `Term` candidates: **N+1** ("one query for the parents plus one per parent for the children — the round-trip explosion RQB avoids by emitting a single statement").

**Why this section:** "N+1-safe by construction" is the headline reason RQB is the senior default for tree reads, but it's abstract until the student *sees* the round-trip count collapse. The `DiagramSequence` makes the cost tangible; bounding the N+1 depth here (reflex now, diagnosis in Ch 039) respects the scope split.

### The result type is your prop type

**Goal:** cash the L10 "relations gap" pointer — the RQB call's **inferred nested return type** is the type you thread into a Server Component, no hand-written `InvoiceWithItems` interface.

- Restate the L10 fact in one line: `typeof invoices.$inferSelect` is **flat** — `Invoice` has `organizationId: string`, no nested `organization`/`lineItems`/`tags`. So a nested read needs a *different* type. The wrong reflex is to hand-write `interface InvoiceWithItems { … }` — that restates fields the schema already knows (Ch 037 Principle #2, the hand-typed-interface smell).
- The right reflex: **derive the type from the query.** The RQB call's return type already *is* the nested shape — extract it:
  ```ts
  const getInvoiceDetail = (id: string) =>
    db.query.invoices.findFirst({
      where: { id },
      with: { lineItems: true, organization: true },
    });

  type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>;
  ```
  `Awaited<ReturnType<…>>` unwraps the Promise to the result type; `NonNullable<…>` strips the `findFirst` `| undefined`. `InvoiceDetail` is the fully-typed nested shape, generated — rename a column or change the `with`, and the prop type updates with zero edits.
- **Use `CodeTooltips`** on this block to define the type utilities inline without breaking flow: `Awaited` ("unwraps a Promise's resolved type"), `ReturnType` ("the return type of a function"), `NonNullable` ("removes `null`/`undefined` from a type"). These are short, precise, and exactly what `CodeTooltips` is for (in-code defs vs. a prose digression).
- Frame the senior payoff: this is the chapter's "one shape, one source" principle (Ch 037 L1) applied to *reads* — the query is the source of truth for its own result type, the same way the schema is the source for the row type. The component prop, the function return, and the query all stay in lockstep by construction.
- **Scope guard:** name that the *factory-into-a-`db/queries/` file* pattern (verb-led read helpers that close over the tenant client) is Unit 10 / Code-conventions territory — here, just show the type extraction. Don't build the queries-file structure.
- `Term` candidates: none new (utilities covered via `CodeTooltips`).

**Why this section:** it's the direct continuation of L10's deferred "relational result types" pointer, and it's where the chapter's source-of-truth principle finally covers reads. `CodeTooltips` keeps the three type utilities inline so the prose stays about the *idea* (derive, don't restate), not about TS plumbing.

### When to reach for the SQL builder instead

**Goal:** name the boundary so the student doesn't force every read through RQB — closing the lesson with the "defaults-before-conditionals, name the threshold" frame.

- Restate the division cleanly, both sides as one mental test — **is the read a tree?**
  - **Reach for RQB (`db.query…({ with })`)** when the result is an **entity + its related rows as a nested object** — detail pages, list-with-children, anything you'd render as a tree. The N+1-safe default. (Now includes parent-by-relation filtering, per this lesson.)
  - **Drop to the SQL builder (`db.select(...).leftJoin(...)`, L2)** when the read is **not** a tree:
    - **aggregates** (`COUNT`, `SUM`, `AVG` over related rows, `GROUP BY`) — L4's job; RQB doesn't shape aggregate rollups.
    - **flat/irregular projections** — columns from three tables in one flat row (a report row), not a nested object.
    - **aggregate-existence predicates** ("invoices with more than 5 line items") — beyond v2 relation filters; `exists`/`having` on the SQL builder (L4/L7).
    - **set operations, window functions, CTEs** — L7's territory.
- **The decision is shape-driven, not capability-driven (reuse L9's framing).** Both APIs return Drizzle-typed results; the question is "what shape do I want back?" Tree → RQB. Flat/aggregated/irregular → SQL builder. State that mixing is normal in a real feature (RQB for the detail object, a `db.select` aggregate for the "total billed" number on the same page).
- **Optional `Matching` exercise (closing check).** Left: "invoice + its line items + tags" / "revenue per month" / "the 3 newest comments per post" / "invoices that have any paid line item" / "a flat report: invoice id, org name, line-item count". Right: "RQB `with`" / "SQL builder aggregate" / "RQB `with` + per-relation `orderBy`/`limit`" / "RQB parent relation filter" / "SQL builder join + projection". Fast lock on the tree-vs-not reflex. (If only one closing check is wanted, prefer this over a second MCQ — it drills the *decision*, the lesson's senior takeaway.)
- `Term` candidates: none new.

**Why this section:** beginners who just learned RQB tend to force aggregates and flat reports through it. Naming the threshold as a single "is it a tree?" test — and legitimizing mixing both APIs in one feature — sets the right reflex and satisfies the defaults-before-conditionals guideline. Closing on the boundary (not new mechanics) leaves the student with the *judgment*, which is the course's thesis.

### Check your understanding

**Goal:** verify the highest-value ideas with one runnable query and one concept check. RQB **can** be exercised in the sandbox (it runs real SQL against PGlite), so a live query is appropriate here — unlike Ch 037 L9 where the relations *graph* couldn't be probed.

- **`DrizzleCoding` (the load-bearing live exercise).** The student writes a v2 RQB query against a seeded `invoices` + `invoiceLineItems` (+ org) schema. Task: "Return the invoice with id 1 together with its line items, ordered by line-item id." Expected: the nested result. Grading: `expectedRows` matched per-column subset on the returned shape; `ordered: false` unless the query has a deterministic `orderBy` (it does, so `ordered: true`).
  - **Critical PGlite staging note for the exercise agent (carry Ch 037 L1/L2 precedent):** the `DrizzleCoding` sandbox has **no `casing` client** and **no native `uuidv7()`** in PGlite, AND — load-bearing here — **the relations graph must be wired into the sandbox's `db` for `db.query` to resolve.** Confirm `DrizzleCoding` supports passing `relations` / `defineRelations` to its embedded client before authoring an RQB exercise; if the widget only wires `schema` (not `relations`), `db.query.<table>` will be `undefined` and the exercise can't run. **If the widget can't wire relations, fall back to a `db.select().leftJoin()` framing of the same tree read, or make this a `Dropdowns`/`MultipleChoice` check instead, and flag the gap.** Use `integer` PKs with explicit seeded ids and explicit snake_case column-name strings; money as `numeric` (grades as string). This is a real build risk — the exercise agent must verify capability first.
- **`MultipleChoice` (the conceptual misconception).** "`db.query.invoices.findFirst({ with: { tags: true } })` returns an invoice but `tags` is missing from the type. The `invoiceTags` junction has both FKs. Why?" Correct: the `tags` **relation** was never declared in `db/relations.ts` (the FK is a write-time guarantee, not a traversal hint — Ch 037 L9). Distractors: "`findFirst` doesn't support `with`"; "you must name the `invoiceTags` junction in `with`"; "many-to-many needs `db.select`." Reinforces the lesson's core distinction and the junction-is-invisible point.
- **(Optional) `TrueFalse` round** on the two filtering positions: "`with: { lineItems: { where: {…} } }` can drop an invoice that has no matching line items" (false — filters children, keeps parent); "`where: { lineItems: {…} }` drops invoices with no matching line item" (true); "RQB emits one SQL statement per `findMany`, even with nested `with`" (true); "the v2 `where` takes a `(t, ops) => …` callback" (false — object syntax). A fast lock on the four subtlest facts.

**Why this section:** the two filtering positions and the silent-`undefined` cause are exactly where students stumble; a runnable `DrizzleCoding` proves the happy path, the MCQ nails the misconception, and the optional `TrueFalse` drills the position→meaning distinction. The PGlite-relations caveat is flagged loudly because it's a genuine build blocker the downstream agent must resolve before committing to a live exercise.

### External resources

- **`ExternalResource`** cards (place at lesson end per guidelines):
  - Drizzle RQB v2 / Query docs (`orm.drizzle.team/docs/rqb-v2`) — the canonical `findMany`/`findFirst`, object `where`/`orderBy`, `with`, `columns` reference.
  - Drizzle Relations v1→v2 guide (`orm.drizzle.team/docs/relations-v1-v2`) — for students who hit the v1 callback `where` in older tutorials; documents the object-syntax migration.
  - Drizzle Relations v2 docs (`orm.drizzle.team/docs/relations-v2`) — back-reference to the graph (Ch 037 L9) these queries consume, incl. predefined relation `where` filters.
- **YouTube:** no embed proposed by default — the lesson's value is hands-on query shapes best served by `AnnotatedCode` + the `DrizzleCoding` exercise + the N+1 `DiagramSequence`; a video would add length without clarity. If the resourcer finds a *current* (post-`1.0.0-beta`) Drizzle RQB v2 walkthrough that demonstrates the object `where`/parent-filtering, a single optional `VideoCallout` near "Filtering and ordering, the v2 way" is acceptable — optional, not required, and must show **v2** syntax (reject v1-callback videos, which would teach the wrong API).

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The relations graph is **declared** in `db/relations.ts` via `defineRelations` (Ch 037 L9) — this lesson consumes it; writes no `defineRelations` code. Reference relations (`invoices.lineItems`, `invoices.tags` via `.through()`, `invoices.organization`) by name.
- `db.select().from().leftJoin()`, the four joins, labeled vs. flat selection, left-join nullability (L2) — named only as the *flat-shape* contrast RQB improves on.
- The four chain methods and object/operator semantics (`where`/`orderBy`/`limit`/`offset`), parameterization, the tiebreaker reflex, single-row idiom (L1) — reused, not re-explained; the novelty here is the **v2 object form** of `where`/`orderBy`.
- `$inferSelect` is flat / never carries relations (Ch 037 L10) — restated in one line as the reason a nested read needs its own derived type.
- Money is `numeric` → `string`; operator values for money are strings (Ch 037 L3).
- The running domain tables — imported, never redeclared.

**This lesson does NOT cover (owned elsewhere):**
- **Declaring relations** (`defineRelations`, `from`/`to`/`through`) — **Ch 037 L9**. Consumed only.
- **Aggregations across related rows** (`count`/`sum`/`avg`, `groupBy`, `having`, filtered aggregates) — **Ch 038 L4**. RQB doesn't shape aggregate rollups; named as a "drop to the SQL builder" trigger. Aggregate-existence parent predicates ("more than 5 line items") also defer here.
- **Hand-written joins at depth** (when the flat/irregular projection is the goal) — **Ch 038 L2**. Named in the "when to reach for the SQL builder" boundary.
- **Subqueries, CTEs, `exists`/`notExists`, window functions** — **Ch 038 L7**. The remaining `exists()` escape hatch for gnarly parent predicates is named, not built.
- **Cursor pagination** through RQB (`where`/`orderBy`/`limit` cursor predicate in object form) — **Ch 038 L6**; the tiebreaker reflex is seeded here, the cursor model is L6.
- **The N+1 problem at depth** — spotting its four shapes and fixing code that bypasses RQB — **Ch 039 L2**. This lesson plants the "RQB is N+1-safe" reflex only.
- **`EXPLAIN ANALYZE` / plan reading** on a relational query — **Ch 039 L3** (`logger: true` from Ch 037 L2 is the only inspection tool shown).
- **Indexing** the FK/`where`/`orderBy` columns RQB relies on — **Ch 039 L1**.
- **`db/queries/` read-helper file structure** and `tenantDb`-scoped factories — **Unit 10 / Code conventions**; this lesson shows the type-extraction pattern only, not the file layout.
- **JSONB read paths** (`->`/`->>`/`@>`) inside RQB results — **Ch 038 L9**.
- **The v1 RQB API at depth** — course teaches **v2 only**; v1 callback `where` named for recognition (so older tutorials don't confuse the student), including its `db._query` relocation and `[OLD]` status — no v1 query code is written.

**Convention divergences to flag (for the maintainer, surface in the lesson as one-line asides):**
1. **v2 RQB object syntax vs. the chapter outline.** The Ch 038 chapter outline (lines ~82, 87) describes this lesson's `where` as the **v1 callback** form (`where: (invoices, { eq, and, gt }) => …`) and says parent-by-child filtering "now supports … `exists(...)`; fall back to `db.select`." Both are **superseded by v2**: `where` is an object (`{ column: { gt }, OR, AND, NOT, RAW }`), `orderBy` is an object, and **v2 filters parents by relation conditions natively** (`where: { lineItems: {…} }` / `where: { lineItems: true }`). This lesson teaches the v2 forms (consistent with Ch 037 L9's v2 commitment); downstream agents must **not** normalize back to the v1 callback. Source-verified June 2026 (orm.drizzle.team/docs/rqb-v2, /docs/relations-v1-v2).
2. **`Code conventions.md` §Data layer** (line ~274) still lists the **v1** `relations(<table>, …)` + callback-`db.query` traversal as stable, with v2 a parenthetical. This chapter teaches **v2** (`defineRelations` + object-syntax `db.query`) as canonical. The doc's Data-layer relations/traversal bullets should be updated to v2 on the next maintainer pass.
