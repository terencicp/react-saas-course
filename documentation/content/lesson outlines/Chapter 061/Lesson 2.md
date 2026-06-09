# Lesson 2 — Making the missing filter impossible

- **Title (h1):** Making the missing filter impossible
- **Sidebar label:** The lifecycle query helper

---

## Lesson framing

This is Lesson 2 of Chapter 061 (Soft delete, archive, and concurrency).
Lesson 1 landed the two-timestamp schema (`deletedAt`/`archivedAt`), the three lifecycle actions, and — deliberately — left one pain unsolved: every read is now a place that can forget `deleted_at IS NULL`, and the worst version of that omission, in a multi-tenant app, leaks one org's deleted rows into another's view.
This lesson builds the structural fix: a small per-entity query helper, layered on `tenantDb` from Ch 056, that exposes `active()`, `archived()`, and `includingDeleted()` so the lifecycle filter is supplied by construction and the unscoped read becomes a visibly-different, search-flaggable shape.

**The single most important pedagogical lever, decided in brainstorming:** the student already owns this exact move.
Ch 056 Lesson 2 taught "make the missing *org* filter impossible to write" — two clients, scope baked into the call shape, *optional correctness is the bug*, defense-by-call-shape-not-diligence.
This lesson is that identical idea applied a *second* time, to a *second* filter (lifecycle), *stacked on the first*.
The lesson must open by naming this explicitly and lean on it the whole way through.
The win condition: the student sees lifecycle scoping not as a new technique but as "the tenancy move again, composed" — two filters, one helper, neither hand-typed.
This framing is what lets the lesson be short (the chapter outline budgets 35–45 min) — the mental model is transfer, not new acquisition; the lesson's value is the *composition*, the three-method API, and the two genuinely-new wrinkles (joins, the escape hatch).

Pedagogical spine:

- **Decision before syntax.** Open on the senior question: "the list filters `deleted_at IS NULL`, the detail page filters it, the count filters it, every join filters it — how do you make missing it physically impossible?" Resolve it conceptually (transfer the Ch 056 move) before any new Drizzle.
- **Transfer, don't re-derive.** The runtime mechanism (inject a predicate via `and(...)`, return a builder the caller extends) is *exactly* what `tenantDb` already does. Restate the principle in one or two lines, then show the new surface. Do not re-teach closures, mapped types, or `and(predicate, undefined)` drop behavior — those are Ch 056's, used as known.
- **Composition is the headline.** `tenantDb(orgId)` supplies the org filter; this helper supplies the lifecycle filter on top. The mental model to land: *both filters come from the helper layer, neither is hand-typed at the call site, and a refactor of either touches one file.*
- **Three states, named to feel weighty.** `active()` / `archived()` are the everyday surface; `includingDeleted()` is the intentionally heavy, grep-able, role-gated escape hatch. The naming *is* the design — resist `withTrashed()`/`onlyDeleted()`.
- **The honest edges.** Two places the helper does NOT fully cover, taught plainly so the student doesn't over-trust it: (1) joins — single-table reads are clean, joins need a discipline (named functions in `db/queries/` sharing one filter predicate); (2) raw SQL / hand-tuned perf queries — they bypass the helper, so they live in a known place, carry the predicate explicitly, and are unit-tested. A helper sold as airtight that silently leaks through joins is itself the bug.
- **Symmetry with writes.** The same scoping the helper applies to reads already applies to the action UPDATEs via `tenantDb` (Lesson 1). State the symmetry; it sets up Lesson 3's `version` precondition (which adds a third predicate to the same `WHERE`).
- **Connect to prior knowledge constantly.** `tenantDb(orgId)` (Ch 056), `db/queries/<entity>.ts` (code standard + Lesson 1's foreshadow), the `authedAction` RBAC wrapper gating the escape hatch (Ch 057), `Result` (Ch 043), the tri-state `?status=` filter (Ch 060 / Lesson 1), `db.query.<table>.findMany`/`and`/`isNull`/`isNotNull` (Unit 5/6). All already known — restate shape in one line, never re-teach.

Components and load-bearing visuals:
the core is `AnnotatedCode` on the small factory (the headline is how *little* code it is) and a `CodeVariants` wrong-vs-right at the call site.
A layered-filter diagram (`ArrowDiagram` or a simple HTML/CSS stack figure) is the conceptual anchor — it shows the two predicates stacking onto one `WHERE`.
A `CodeReview` exercise (the chapter's established teaching beat — Ch 056 used one for the same bug class) is the highest-value check: spot the raw `from(invoices)`, the ungated escape hatch, the un-filtered join.
Code is mostly small `Code`/`AnnotatedCode`; the helper module is ~12 lines by design.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely and in production terms.
A teammate adds a new route, writes `db.query.invoices.findMany({ where: eq(invoices.status, 'open') })` through the *scoped* `tenantDb` client (so tenancy is fine — the org filter is there), ships.
The query returns rows the user soft-deleted last week, because nobody added `isNull(invoices.deletedAt)`.
It's invisible in dev (no soft-deleted rows yet) and surfaces the day a customer notices their "deleted" invoice in a report.
Land the thesis in two sentences: the lifecycle filter has the *same failure signature* as the org filter from Ch 056 — the bug is the absence of a line — and the fix is the *same move*: change the call shape so the filter is supplied by construction.
Preview the deliverable: by the end, the student has a per-entity helper exposing `active()`/`archived()`/`includingDeleted()` that stacks the lifecycle filter on top of `tenantDb`'s org filter, and the un-filtered read is a visibly-different shape.
~4 sentences, adult tone, no celebration.

Reasoning: the pedagogical guidelines require the senior question implicit up front and a concrete motivating problem. Anchoring it as "the same bug you already learned to kill, one layer up" is the lesson's entire leverage and must be set in the first paragraph.

`Term` candidates in this section: **soft delete** (one-line redefinition: "sets a `deletedAt` timestamp instead of removing the row" — prerequisite from Lesson 1, restate concisely), **multi-tenant** (only if not already glossed nearby; Ch 056 defined it — prefer not to repeat unless flow needs it).

### You already learned this move — now do it twice

The transfer section. Make the connection to Ch 056 explicit and turn it into the lesson's spine.

- Recall, in ~3 lines, the Ch 056 result the student owns: tenant reads go through `tenantDb(orgId)`, which bakes `and(eq(invoices.organizationId, orgId), callerWhere)` into every query; the unscoped read is a *different client* (`db`), visible at the import. The principle: **optional correctness is the bug; defense is a call shape, not diligence.**
- The pivot: the lifecycle filter (`deleted_at IS NULL`) is a *second* predicate with the *same* properties — its omission compiles, passes review, and leaks. So apply the *same* move. The only differences: (1) it's a different predicate (`isNull(deletedAt)` instead of `eq(organizationId, orgId)`), and (2) there are *three* visibility intents, not one, so the surface is three named methods instead of a single transparent passthrough.
- The composition picture, stated plainly: `tenantDb(orgId)` already pins the org. This helper sits *on top* and pins the lifecycle state. A call like `scoped.invoices.active()` produces a `WHERE` with **both** predicates `and`-ed together — org from the lower layer, lifecycle from this one — and the caller typed neither.

Diagram (the conceptual anchor): a **layered-filter / stacking** figure showing one `WHERE` clause being assembled from two contributed predicates.
Recommended: `ArrowDiagram` inside `<Figure>`, OR a simpler HTML/CSS stack figure (a labeled vertical stack: "your call: `.where(status = 'open')`" → "+ lifecycle layer: `deleted_at IS NULL`" → "+ tenancy layer (`tenantDb`): `organization_id = :orgId`" → resolved `WHERE org AND lifecycle AND your-predicate`).
Per diagrams INDEX, a simple visual aid counts as a diagram; this is annotated-illustration shape → HTML/CSS top pick (use `ArrowDiagram` only if you want lines mapping each source predicate to its slot in the final clause).
Pedagogical goal: make "two filters stack into one `WHERE`, neither hand-typed" literally visible — this is the single image the rest of the lesson refers back to.
Keep it horizontal/compact (cap ~800px height per the vertical-space constraint).

Reasoning: the documented way to minimize cognitive load here is to frame the whole lesson as transfer of a model the student already has, not acquisition of a new one. This section does that work and earns the rest of the lesson its short length. The diagram makes the abstract "composition" concrete before any code.

### The three-method surface: active, archived, includingDeleted

Define the API contract — what each method filters — before showing the implementation.

- `active()` → `deleted_at IS NULL AND archived_at IS NULL`. The default surface; the everyday list and detail reads.
- `archived()` → `deleted_at IS NULL AND archived_at IS NOT NULL`. The Archived tab from Lesson 1's tri-state filter.
- `includingDeleted()` → no lifecycle predicate at all (org scope from `tenantDb` still applies). The escape hatch for admin recovery tooling, GDPR exports, audit views — never the default.
- The naming discipline, taught as a design decision (not a tip): the three states *are* the product surface (they map directly to Lesson 1's `?status=active|archived|all`), so resist adding `onlyDeleted()` / `withTrashed()` / a `trashed` flag. The escape hatch is named loud (`includingDeleted`) on purpose — a `grep includingDeleted` returns every place the unscoped lifecycle read fires, which is exactly the review surface you want. (Per Architectural Principle #5, the escape hatch is *part of the API*, not a workaround — same posture as Ch 056's raw `db` for cross-org reads.)
- The mapping to Lesson 1's UI, stated once: `active()` backs the Active tab, `archived()` backs the Archived tab, `includingDeleted()` backs the role-gated All view. The helper and the URL-state tri-state are the same three states from two angles.

Component: a compact 3-row table (or `CardGrid` with three `Card`s) — method · resulting predicate · when to reach for it. A table is the right tool: it's a reference the student will scan, and the three-way contrast is the content. Keep the predicate column in inline code.

`Term` candidate: **escape hatch** (one-line: "a deliberately-named, gated way out of a discipline, kept visible rather than hidden — like Ch 056's raw `db` for cross-org reads").

Reasoning: naming the contract before the code lets the implementation read as "the obvious way to produce these three predicates," not as a puzzle. Mapping the three methods back to Ch 060's `?status=` values closes the loop with what the student built last chapter and prevents the "why three?" question.

### Building the helper: a small predicate factory

Show the implementation. The headline is how little code it is — that *is* the senior signal, same as Lesson 1's three-line actions.

- Two passes, to keep cognitive load honest (mirror Ch 056's runtime-first structure): first the shared filter predicates, then the per-entity object that uses them.
- **The shared predicates**, exported from the helper module so one definition flows everywhere:
  - `activeFilter(table)` → `and(isNull(table.deletedAt), isNull(table.archivedAt))`
  - `archivedFilter(table)` → `and(isNull(table.deletedAt), isNotNull(table.archivedAt))`
  - These are plain SQL-fragment builders (take the table, return an `SQL`), reused by both the helper methods and any hand-written join (next section). Senior anchor: one definition, used by the helper *and* the carve-out queries — adding a third lifecycle state later touches one file.
- **The per-entity helper** in `db/queries/invoices.ts` (the home Lesson 1 foreshadowed): a small factory that closes over the scoped client and exposes the three methods, each returning a *chainable Drizzle builder* pre-filtered by org (via `tenantDb`) + lifecycle (via the shared predicate). The caller then adds `.orderBy(...)`, `.limit(...)`, etc. Critical design call: **return a builder, not a fully-formed query** — composability is the point; a fully-formed query forces callers to construct a second path and tempts a hand-rolled fallback.
- **Load-bearing Drizzle mechanic the writer must get right (fact-checked):** a helper that returns a builder the caller keeps chaining must build on the **`select()` core API** and call **`.$dynamic()`** on it — e.g. `db.select().from(invoices).where(and(eq(invoices.organizationId, orgId), activeFilter(invoices))).$dynamic()`. Without `.$dynamic()`, Drizzle restricts `.where()`/`.limit()`/etc. to a single invocation, so the caller adding a *second* `.where()` (or a helper that pre-set `where` then the caller refining it) is a **compile-time type error** — `.$dynamic()` lifts that restriction precisely for reusable scoped-query helpers (it's the documented idiom). Note this is the `select()` builder, *not* the relational `db.query.<table>.findMany({...})` config-object API (which is not chainable — it takes `{ where, orderBy, limit }` and returns a promise). The helper here uses `select(...).$dynamic()` so the chapter framing's `scoped.invoices.active().where(...).orderBy(...).limit(20)` actually type-checks. (The org predicate is shown inline above for clarity; if the helper closes over Ch 056's `tenantDb` client, that client already supplies the org `and` — keep whichever composition the writer picks consistent with Ch 056, and flag it inline.)
- The composition seam to make explicit: the method's filter and the caller's extra predicates combine with `and(...)`, exactly the way `tenantDb` combines the org predicate with the caller's `where`. The org predicate is already inside the scoped client; the lifecycle predicate is added here; the caller's refinements ride last. Three predicates, one `WHERE`, the caller typed one.
- Shape note for downstream (align with the project's established seam): the helper composes on the Ch 056 `tenantDb(orgId)` client. Two viable shapes — (a) functions that take the scoped client / `tx`, or (b) a factory `createScopedQuery(orgId)` returning `{ invoices: { active, archived, includingDeleted } }`. **Recommend the factory shape** `tenantDb(orgId).invoices.active()` reads to extend the Ch 056 call shape the student already knows, and the chapter framing/continuity use that exact surface. Whichever the writer picks, keep it consistent with Ch 056's `tenantDb` and the `db/queries/<entity>.ts` location; flag any divergence inline as deliberate.

Code: `AnnotatedCode` on the combined module (~12 lines: the two shared predicate builders + the per-entity helper with its three methods). Steps (≤6 lines prose each, `color="blue"` for focus, `color="green"` on the predicate-composition line):
1. the two shared filter builders, and that they return reusable `SQL` fragments;
2. the per-entity factory closing over the scoped client (one line: "this is the Ch 056 `tenantDb` client — org scope is already inside it");
3. `active()` building a `select().from(invoices).where(activeFilter(invoices))` and calling `.$dynamic()` so it returns a *builder the caller keeps chaining*;
4. the `.$dynamic()` line gets its own focus — name why: without it a second `.where()`/`.limit()` from the caller is a type error; with it the helper is a reusable scoped builder (same composition spirit as `tenantDb`).

Convention notes for the writer:
file is `db/queries/invoices.ts`, starts with `import 'server-only'` (it reaches the DB client through `tenantDb`); arrow-const named exports; explicit return types on the exported helpers (the signature is part of the lesson).
Use `isNull`/`isNotNull`/`and` from `drizzle-orm` (the student knows these).
Snake-case is client-level, so columns are `deletedAt`/`archivedAt` in TS (stored `deleted_at`/`archived_at`) — show camelCase, mention SQL name once if at all.
Keep the helper minimal — no `onlyDeleted`, no `.raw` passthrough (that would re-open the unscoped shape, same watch-out as Ch 056's no-`allOrgs`-flag rule).

A small live exercise is appropriate here if it fits the runtime: a `DrizzleCoding` task where the student writes a query that returns only *active* invoices for an org — i.e. they must add `isNull(deletedAt)` (and the org predicate) themselves against a seeded PGlite, *feeling* the filter they're about to make structural.
Seed a few rows mixing `deleted_at` set/null and `archived_at` set/null across two orgs; `expectedRows` pins the active set for org 1.
Heed the known DrizzleCoding/PGlite limits (plain `integer` PKs, explicit snake_case column names, no `casing`/`uuidv7()` in the editor schema; no `tenantDb` global — the student writes the predicates by hand here, which is the point: they hand-write it once so the helper's value lands).
Flag the editor-schema simplification inline as deliberate.
This is optional but high-value; place it right after the `AnnotatedCode` so "write it by hand once" immediately precedes "now it's structural."

Reasoning: the implementation is intentionally anticlimactic — twelve lines — and that is the lesson, same as Lesson 1's three-line actions. Returning a builder (not a query) is the one genuinely-load-bearing API decision and gets its own annotated step. The hand-write-it-once exercise makes the subsequent "and now you never write it again" land as relief.

### The call site: the unscoped read becomes a different shape

Show the payoff at the point of use and make the wrong shape visibly wrong — the Ch 056 "call shape, not diligence" argument cashing out for lifecycle.

- The canonical read, three lines, mirroring Lesson 1's action opener: `requireOrgUser()` → scoped client → `scoped.invoices.active().orderBy(desc(invoices.createdAt)).limit(20)`. No `isNull(deletedAt)` anywhere in the caller; no `eq(organizationId, …)` either. Both filters are upstream; the caller adds only ordering/pagination. (Author the caller's refinement as `.orderBy(...).limit(...)` — *different* clauses from the helper's own `.where()` — to avoid the two-`.where()`-don't-merge subtlety; if the caller needs an *extra* predicate, the cleanest shape is to pass it into the helper method, e.g. `active(extraPredicate)`, which `and`-s it into the single `where`. Note this for downstream.)
- The contrast: a hand-written `db.query.invoices.findMany({ where: eq(invoices.status, 'open') })` (or `db.select().from(invoices)`) is now wrong *by its shape* — it reaches for the raw `db` client and an entity table directly, which is the same red flag Ch 056 established for the org filter. You don't audit the `where` for a missing `isNull`; you check one thing: did this read go through the entity helper, or did it touch bare `db`/`from(invoices)`?
- The review reflex, stated once: a tenant-entity read through raw `db` in a request handler is the smell — route handlers reach for the scoped entity helper, not `db` from `@/db`. (This is the same mechanical check the student already applies for tenancy; lifecycle just rides the same signal because both filters live in the same helper layer.)

Code: `CodeVariants`, two tabs — **Hand-written (leaks)** vs **Through the helper (scoped)** — at the call site.
Keep both tabs in the same Drizzle API family (the `select()` core API) so the contrast is honest, not an apples-to-oranges API swap.
Tab 1: bare `db.select().from(invoices).where(eq(invoices.status, 'open'))`, first sentence states the consequence ("returns this org's *and* last week's soft-deleted open invoices — the lifecycle filter is the line that isn't here, and the org filter too"). Use `del=`/orange marks.
Tab 2: `scoped.invoices.active().orderBy(desc(invoices.createdAt)).limit(20)`, first sentence states the win ("both the org and lifecycle filters are supplied upstream; the caller adds only ordering and a page size"). Use `ins=`/green marks.
Reuse the Ch 056 framing deliberately so the student recognizes the pattern.

`CodeTooltips` candidates on the scoped call: `active` ("returns a `$dynamic()` builder already filtered to `deleted_at IS NULL AND archived_at IS NULL` plus the org scope; you chain ordering/pagination onto it"), the scoped client identifier ("the Ch 056 `tenantDb` client — org scope already inside; this helper adds the lifecycle scope").

Reasoning: this is where the abstract helper becomes a concrete reflex. Showing the wrong shape next to the right one — the chapter's established teaching beat — is the most effective way to make "the unscoped read is a different shape" stick. The one-question review check (helper vs bare `db`) is the durable senior takeaway.

### Joins and raw SQL: where the helper stops, and the discipline that takes over

The honest-edges section. Teach plainly that the helper covers single-table reads and that two cases need an explicit discipline — so the student doesn't over-trust it.

- **Joins are the trickier case.** A query joining `invoices` to `invoice_lines` needs the lifecycle filter on *both* tables. The single-table helper handles each table's read cleanly, but a join is one query touching two tables — and a helper that silently covers only the driving table leaks deleted child rows. Two ways out; the course picks the second:
  - a join-aware variant on the helper (`scoped.invoices.active().withLines()`) — rejected as scope-creep; every join shape would need its own method.
  - **the discipline:** any join goes through a *named function* in `db/queries/<entity>.ts` (e.g. `listInvoicesWithLines`), and that function applies the shared `activeFilter(invoices)` *and* `activeFilter(invoiceLines)` explicitly via the same exported predicates. Reviewed once, lives in a known place, uses the one shared definition. Senior anchor: the helper covers the 80% (single-table reads); joins get named, reviewed functions that reuse the same filter predicate — so a refactor of the lifecycle shape still touches one file.
- **Raw / hand-tuned perf queries.** A reporting query hand-tuned with `EXPLAIN ANALYZE` (Ch 039) may not fit through the helper, and raw `db.execute(sql\`...\`)` bypasses it entirely. The senior call (defaults-before-conditionals): performance escapes are *fine*; escaping the discipline *silently* is the bug. Hand-tuned queries live in a known location (`db/queries/reports/*.ts`), each carries a comment naming the perf reason and the `WHERE` clauses that replace the helper's filters, and each is unit-tested for the lifecycle *and* tenancy predicates. Name the lint/review backstop in one line: a check that flags direct `db.select().from(<entityTable>)` / `db.query.<entity>` outside the helper module catches the raw-bypass case the type system can't — this is the same "when types can't enforce it, lint can" posture, and lint setup itself is owned elsewhere (Unit 1), so name the rule, don't implement it inline.

Code: a single `Code` (or compact `AnnotatedCode`) of one named join function in `db/queries/invoices.ts` that applies `activeFilter` to both joined tables, with the shared predicate visibly reused on each. The teaching point is the *reuse of the one predicate on both tables* — highlight both `activeFilter(...)` calls.

Exercise: this is the right home for the lesson's **`CodeReview`** (the chapter's established beat; Ch 056 used one for the org-filter bug). A short diff with ~3 plants, all the exact bugs this lesson exists to stop:
1. a new read on `db.query.invoices.findMany(...)` / `db.select().from(invoices)` (raw client, no helper) — `kernel`: "tenant-entity read bypasses the lifecycle helper — leaks soft-deleted rows" (and it's also unscoped for tenancy);
2. an `includingDeleted()` call *not* wrapped in the `authedAction` role gate — `kernel`: "escape hatch used without the RBAC gate — exposes deleted rows to non-admins";
3. a join that filters the driving table but not the joined child table — `kernel`: "join applies the lifecycle filter to only one table — soft-deleted child rows leak through".
Add a `ReviewWhy` debrief: the skill is spotting the *shape* (raw client, ungated escape hatch, half-filtered join), not auditing each predicate.
Grading is the seeded `kernel` per plant.
Place after the join `Code`.

Reasoning: a helper sold as airtight that leaks through joins is itself the failure this lesson warns against — so the section must teach its own boundary honestly. The `CodeReview` is the highest-value check in the lesson: it rehearses recognizing the three bug-shapes in a diff, which is the durable senior skill (and continues the chapter's review-driven assessment rhythm). The lint mention stays a one-liner per the scope boundary (Unit 1 owns lint).

### The escape hatch is gated, not free

Tie `includingDeleted()` to the RBAC wrapper so the student doesn't ship the very leak the helper was built to prevent.

- `includingDeleted()` returns rows regardless of lifecycle state (org scope still applies). That is exactly the data the helper exists to keep out of normal views — so calling it is a privileged operation, not a convenience.
- The rule: every `includingDeleted()` call is gated at the action/route layer by the `authedAction(role, …)` wrapper (Ch 057), restricted to the role that owns recovery/admin tooling (e.g. `admin`/`owner`). The helper makes the *data* reachable; the wrapper decides *who* may reach it. State the division cleanly: helper = "this read includes deleted rows"; `authedAction` = "and only an admin may run it."
- The watch-out, taught here (not as a trailing tip): an ungated `includingDeleted()` is the bug the helper was meant to prevent, re-introduced through the escape hatch. The grep-able name is the review surface — `includingDeleted` outside an admin-gated action is a finding on sight.
- One-line forward/lateral pointer: audit-log entries around the escape hatch (who pulled deleted data, when) are owned later (Ch 081) — name the touch-point, don't build it.

Code: small `Code` fragment — an admin recovery action: `authedAction('admin', schema, …)` wrapping a `scoped.invoices.includingDeleted(eq(invoices.id, id))` read (pass the id predicate into the method so it `and`-s into the single `where`, consistent with the `select().$dynamic()` shape above), with the role gate highlighted. No new component.

`CodeTooltips` / `Term` candidate: `authedAction` ("Ch 057 RBAC wrapper: lifts session, role check, and Zod parse out of the body — here it restricts the escape hatch to admins").

Reasoning: the escape hatch is the helper's most dangerous surface; pairing it with the known RBAC wrapper closes the loop and prevents the "I added `includingDeleted()` to a normal route" mistake. Keeping this its own short section (rather than folding it into the API table) gives the gating the weight it needs.

### One helper, both filters — and the write side already matches

Short consolidation that names the write-side symmetry and points to Lesson 3.

- Recap the composition in one picture/paragraph: a request-handled read now carries *two* filters it never typed — org (from `tenantDb`, Ch 056) and lifecycle (from this helper) — combined into one `WHERE`. Adding a tenant table means wiring it through the helper once; the missing-filter bug is no longer reachable through the normal path.
- The write-side symmetry, stated explicitly: the action UPDATEs from Lesson 1 already go through the scoped client, so tenancy is on the `WHERE` of every `update`/`delete` too — a request crafting a different `orgId` or targeting a soft-deleted row affects **zero rows**. The reads and the writes are scoped by the *same* layer.
- The forward pointer to Lesson 3, exactly once: Lesson 3 adds a *third* predicate to that same UPDATE `WHERE` — a `version` precondition — so two tabs editing the same row can't silently clobber each other; zero rows affected becomes an honest 409. Name it; do not preview the mechanics.

Component: optional — a one-line restatement of the layered-filter diagram from the transfer section, or just prose. Keep it tight; this is consolidation, not new teaching.

Reasoning: the chapter framing threads "both filters get added by the helper, neither hand-typed" and "the version precondition lives in the UPDATE's WHERE" — naming the read/write symmetry here makes Lesson 3's `version` predicate land as "a third thing in a `WHERE` you already understand," minimizing cognitive load at the chapter's most senior lesson.

### External resources (optional)

If a current (≤6 months at authoring), authoritative source exists, one or two `ExternalResource` cards: Drizzle docs on `db.query` / filter operators (`isNull`/`and`) and/or the partial-index discussion already linked in Lesson 1 if relevant.
A `VideoCallout` is **not** recommended — this is a small-API, composition-shaped lesson better served by the stacking diagram and the `CodeReview` than by video.
(Ch 056 already embedded the multi-tenancy video; do not repeat it.)
Only include resources that are current and authoritative.

---

## Scope

**This lesson covers:** the per-entity lifecycle query helper layered on `tenantDb`; its three-method API (`active()` / `archived()` / `includingDeleted()`) and the predicates each produces; the shared `activeFilter`/`archivedFilter` predicate builders; returning a chainable builder (not a fully-formed query); the call-site payoff (the unscoped read as a visibly-different, review-flaggable shape); the join discipline (named functions in `db/queries/` reusing the shared predicates) and the raw/perf-query carve-out (known location, explicit predicates, unit-tested, lint backstop named); the role-gating of `includingDeleted()` via `authedAction`; and the read/write scoping symmetry that sets up Lesson 3.

**This lesson does NOT cover (reserve for stated owners):**

- The soft-delete-vs-archive distinction, the two-timestamp schema, the lifecycle actions, partial indexes, restore/cascade semantics — **Lesson 1 of this chapter.** Used as known; the helper consumes the `deletedAt`/`archivedAt` columns Lesson 1 shipped.
- The `version` column, optimistic concurrency, the 409 `Result`, the React 19 refresh-and-retry UX — **Lesson 3 of this chapter.** This lesson only names that a third predicate joins the same UPDATE `WHERE` and does not preview the mechanics.
- The `tenantDb(orgId)` factory internals — closures, the `TENANT_TABLES` registry, the mapped type, the `and(predicate, undefined)` drop, the two-clients argument — **Ch 056.** This lesson *transfers* that mental model and composes on the client; it restates the principle in one or two lines but does not re-derive the mechanism.
- The Drizzle query-builder mechanics (`db.query.<table>.findMany`, `select().from()`, operators) — **Ch 038 / Unit 5.** `isNull`/`isNotNull`/`and` used as known.
- The `authedAction(role, schema, fn)` RBAC wrapper internals and role semantics — **Ch 057.** Used as a known wrapper to gate the escape hatch.
- The `Result<T>` type and `ok`/`err` helpers — **Ch 043.** Restated in one line if referenced.
- The URL-state tri-state filter (`parseAsStringEnum(['active','archived','all'])`, `router.replace`, server-read/client-write) — **Ch 060 / Lesson 1.** The three methods are *mapped* to the three `?status=` values; the URL mechanics are not re-taught.
- ESLint rule authoring / lint setup — **Unit 1.** The `no-restricted-syntax`/custom-rule backstop is *named* as the type-system gap-filler, not implemented.
- `EXPLAIN ANALYZE` / query tuning — **Ch 039.** Named as the reason a perf query may carve out of the helper.
- Audit logs around the escape hatch and the GDPR export path — **Ch 081.** Named as touch-points only.
- Postgres Row-Level Security as the database-layer alternative enforcement — **Ch 056's territory.** Named once as the database-side backstop if natural; not implemented or re-taught here.
- `db.transaction` mechanics — **Ch 043.** Not central to this lesson; only relevant inside named join/report functions, used as known.

**Prerequisite one-liners (redefine concisely, do not re-teach):**
soft delete = sets a `deletedAt` timestamp instead of removing the row (Lesson 1);
`tenantDb(orgId)` = the Ch 056 helper that scopes every read/write to the active org by baking the org predicate into the call shape — this lesson stacks the lifecycle filter on top of it;
`authedAction(role, …)` = the Ch 057 wrapper that lifts session + role check + Zod parse out of action bodies, used here to gate `includingDeleted()`;
the tri-state `?status=` filter = the Ch 060 / Lesson 1 URL state whose `active`/`archived`/`all` values map one-to-one onto this helper's three methods;
`Result` = the `{ ok: true, data } | { ok: false, error }` action return contract (Ch 043).

Estimated student time: 35–45 minutes. The lesson is short because the API surface is small and the mental model is transferred from Ch 056, not newly acquired; the value is the composition and the discipline, not the code.
