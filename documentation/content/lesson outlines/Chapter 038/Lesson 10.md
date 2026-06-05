# The raw SQL escape hatch

**Title (h1):** The raw SQL escape hatch
**Sidebar label:** Raw SQL escape hatch

---

## Lesson framing

Closing teaching lesson of Chapter 038, and a deliberate short one (30–40 min, reference/decision register). This lesson does **not introduce** `sql\`\`` from scratch — the student has already *written* it many times across the chapter: `filter (where …)` and `date_trunc` in L4, `row_number() over (…)` windows in L7, `to_tsvector`/`websearch_to_tsquery`/`ts_rank` in L8, `->>`/`@>`/`||`/`jsonb_set` in L9. The job here is to **promote that scattered usage into one governed mental model**: the query builder is the default, raw `sql\`\`` is the *named exception*, and `sql.raw` is the *dangerous corner* of that exception. The student leaves able to (a) decide when the reach is justified, (b) state precisely why `sql\`\`` is injection-safe and `sql.raw` is not, and (c) re-claim a type and a runtime when they drop below the builder.

The spine, stated once and referenced everywhere: **"the builder is the floor you stand on; raw SQL is a rope you lower yourself on — useful, deliberate, and you keep both hands on it."** Three properties hang off it — *parameterization* (the rope is rated, `sql\`\`` binds `$1`; `sql.raw` cuts the rope), *typing* (dropping below the builder loses inference, you re-claim it with `sql<T>`), and *governance* (every `sql.raw` is a code-review trigger that must trace its input to a fixed allow-list).

Pedagogical decisions for the lesson as a whole:

- **Lead with the decision, not the API.** The senior question — "when does the builder stop and raw SQL begin?" — is the introduction's hook and the first body section. The student has felt the friction (every `sql\`\`` they've written this chapter was a small escape); name the pattern they've been doing implicitly.
- **The single highest-stakes concept is the parameterization boundary.** Not "raw SQL exists" — the student knows. The novel, dangerous distinction is **`sql\`${x}\`` (the tag binds `x` as a parameter) vs the plain template literal `` `${x}` `` (string concatenation, injectable) vs `sql.raw(x)` (concatenation *inside* the tag).** This is where a junior ships a vulnerability. It earns the lesson's only diagram and its before/after `CodeVariants`.
- **Reframe, don't re-teach, the chapter's existing fragments.** Reuse `ts_rank` (L8) and a window/JSONB fragment (L7/L9) as the worked "legitimate reach" examples so the student sees their prior work *was* the escape hatch, correctly used. Zero new domain.
- **`sql.raw` gets a tight, fear-calibrated treatment.** One legitimate use (fixed-string identifier interpolation from an allow-list), `sql.identifier` named as the safer tool for the *common* case of that need, and a hard "never with user input" rule. Don't over-dwell — the danger is real but the surface is small.
- **`db.execute` is the runtime, framed as "leaving the typed world."** Returns a driver-shaped result; the builder is the better default whenever shape matters. Keep brief — it's a tool, not a concept.
- **The migration boundary is the *one place raw SQL is normal, not a smell.*** The `updatedAt` trigger (Ch 037 L4), GIN/partial indexes (the whole chapter has deferred these to Ch 039 L1), `create extension`. This closes the loop on every "owned by a migration / Ch 039" pointer the chapter planted. Frame it as: the builder governs *queries*; migrations are hand-authored SQL by design.
- **Low cognitive load via the existing reflexes.** Reuse verbatim: "parameterization still holds inside `sql\`\``" (L1/L4/L8/L9), "`sql<T>` is a TS-side claim, not a check" (L4/L7/L8/L9). The lesson is mostly *consolidation* — lean hard on what's already built.
- **Exercise:** one decision-drill (`StateMachineWalker` or `Buckets`) for "reach or don't," plus a token-identification (`Tokens`) drill on a code block to cement the parameterized-vs-raw distinction visually. No `DrizzleCoding`/`SQLCoding` query-writing exercise — this is a judgment lesson, not a query-shape lesson, and the chapter's load-bearing coding assessments live in L1–L9. (Confirm this scoping with the maintainer; see Scope.)

---

## Lesson sections

### Introduction (no header)

Warm, brief, ~2 short paragraphs. Open on the senior question: the builder has covered every read and write the chapter needed — so why does Drizzle ship a `sql\`\`` template at all, and when does a senior actually type it? Name the lived experience: *the student has already reached for it* — `filter (where …)`, `row_number()`, `websearch_to_tsquery`, `@>` — each was a small, correct drop below the builder. This lesson makes that reflex explicit and governed: the triggers that justify it, the one rule that keeps it safe, and the corner (`sql.raw`) that doesn't get that safety for free. Preview the takeaway: a senior reaches rarely, reaches deliberately, and can always answer "where did this string come from?" State the spine (builder = floor, raw = rope, both hands on it).

### When the builder stops and raw SQL begins

The decision section — leads, per "decisions before syntax." Establish the **default-first framing**: most days you don't reach; the builder owns the surrounding query structure and you only ever fill a *gap*. Then enumerate the legitimate triggers, grouped so they're memorable rather than a flat list:

- **A Postgres feature with no Drizzle helper** — a custom operator (trigram distance `<->`, the `@@` FTS match from L8), a function without a builder wrapper, `LATERAL` joins, set-returning functions. The signal: the builder is *missing a feature*, not *too verbose*.
- **A sub-expression inside an otherwise-builder query** — the most common shape by far, and the one the student already knows: `where(sql\`…\`)`, `orderBy(desc(sql\`ts_rank(…)\`))`. The builder keeps the structure and the types; the `sql\`\`` fills one predicate or one ordering key.
- **A one-off statement** — maintenance (`refresh materialized view …`), a migration helper, an ad-hoc admin query via `db.execute`.

Then the **anti-trigger**, stated as the smell: *reaching for raw SQL because the builder "felt verbose" or because you remember the SQL and not the builder method.* That's the wrong reason — the cost (below) isn't worth saving a lookup. Senior signal: a `sql\`\`` in a diff invites the question "what does the builder not do here?" and there should be a real answer.

Mental model to land: **the reach is a spectrum, not a cliff.** Embedding `sql\`\`` in one `where` is a one-inch drop (types and structure intact); a full `db.execute(sql\`select … \`)` is a full drop (no inference, no builder safety). Prefer the shallowest drop that solves the problem — fill the gap, don't abandon the builder.

Optional `StateMachineWalker` (`kind="decision"`) realizing this section's decision: root "Does the builder have a method for this?" → branches to "use the builder" / "is it a sub-expression or a whole statement?" → leaves recommending `where(sql\`…\`)` (shallow drop), `db.execute(sql\`…\`)` (one-off), or "it's a migration → hand-write the SQL." Pedagogical goal: force the student through the *order* a senior asks — builder first, shallowest drop next, raw only at the leaf. Place it at the end of this section as the section's synthesis. (Component provides its own card; do **not** wrap in `<Figure>`.)

### Inside the `sql` template: identifiers, values, and the parameter boundary

The conceptual heart of the lesson. Recap the tag's two interpolation behaviors precisely (the student has used both without necessarily naming the distinction):

- **Tables and columns interpolate as quoted identifiers.** `sql\`select * from ${invoices} where ${invoices.id} = …\`` — Drizzle knows their SQL names from the schema and emits `"invoices"."id"`. The interpolation is structural, not a value.
- **Values interpolate as bound `$1` parameters.** `sql\`… = ${id}\`` — `id` never enters the SQL string; the driver binds it separately. This is the **same guarantee as `eq(col, value)` from L1**, one level lower. Reuse the L1 parameterization reflex verbatim.

Then the **load-bearing distinction**, the thing a junior gets wrong and ships as a vulnerability. Three shapes side by side:

1. `sql\`… ${userInput}\`` — **parameterized.** The tag intercepts the interpolation and binds it. Safe.
2. `` `… ${userInput}` `` (a plain template literal, no `sql` tag, passed somewhere raw) — **string concatenation.** The input becomes part of the SQL text. This is classic injection. The `sql` tag is exactly what was missing.
3. `sql.raw(userInput)` — **concatenation inside the tag.** Looks safe because `sql` is present, but `.raw` *opts out* of binding. The danger is camouflaged.

Use `CodeVariants` (three tabs: "Parameterized", "Plain template literal", "`sql.raw`") with `del=`/`ins=` and per-pane mark colors — green for the safe form, red for the two unsafe ones. First sentence of each tab states the verdict ("Bound as `$1` — safe", "Concatenated into the string — injectable", etc.). This is the single most important widget in the lesson.

Diagram: a small **HTML+CSS `<Figure>`** showing the same `sql\`… where email = ${input}\`` flowing two ways — top track: the `sql` tag splits it into a SQL string `… where email = $1` plus a separate params array `[input]` handed to the driver (input never touches the executable string); bottom track: `sql.raw` / plain literal splices `input` directly into the string, with a malicious `'; drop table users; --` value shown landing *inside* the executable SQL. Pedagogical goal: make "the value is bound *beside* the query, not *into* it" a picture, not a sentence. Per diagram guidance prefer a horizontal, compact layout; wrap in `<Figure>`. (HTML+CSS is the right engine here — it's an annotated illustration of a string splitting, not a system graph.)

`Tokens` exercise at the end of this section: a code block mixing several interpolations; prompt "click every interpolation that reaches the driver as a bound parameter (not spliced into the SQL string)." Targets = the `${value}` interpolations under the `sql` tag; decoys = a `${tableName}` passed to `sql.raw(...)` and a value in a plain backtick literal. Goal: the student physically separates bound values from spliced strings, cementing the distinction the `CodeVariants` taught.

### Re-claiming the type you dropped

Short section. Dropping below the builder loses its inferred return type — so you put it back by hand. `sql<T>\`…\`` claims the type of the expression: `sql<number>\`ts_rank(${invoices.searchVector}, …)\`` tells the surrounding builder the ordering key is a number. **Reuse verbatim the chapter's reflex: `sql<T>` is a TS-side claim, not a runtime check — like `as`.** Drizzle can't validate it; a wrong claim surfaces as a runtime cast error or a silently-wrong type downstream. The discipline: claim only when you know the real Postgres return type, and keep the claim honest (the FTS `ts_rank` → `number`, a `count(*) filter` → `number`, a `->>` leaf → `string` until cast). Pull the L8/L9 examples back as the illustrations — the student has written these `sql<T>` claims already; name what they were doing.

Brief note on the **shallow vs full drop** consequence for types: inside `where(sql\`…\`)` the *surrounding* result type is untouched (the builder still projects the columns) — only the fragment is untyped, and often it doesn't even need a `<T>` because it returns a boolean predicate. A full `db.execute(sql\`select …\`)` returns a driver-shaped, essentially-`unknown` result — there's no projection to lean on, so the typed builder is the better default whenever the *shape of returned rows* matters. This motivates the next section.

Use a single `Code` block or a small `CodeTooltips` (tooltip on `sql<number>` → "TS-side claim, not a check — Drizzle trusts it") — keep it light, this is reinforcement.

### `db.execute` and the one-off statement

Tool section, kept brief. `db.execute(sql\`…\`)` runs an arbitrary statement against the pool and returns the **driver-level result** (rows plus metadata), not a builder-typed array. Frame: this is the *full drop* — you've left the typed world entirely, so reserve it for statements that don't have a meaningful row-shape to type or that the builder can't express: `refresh materialized view …`, a maintenance `update`, a raw `with recursive …` (named in L7 as the runner for recursive CTEs — cash that pointer here). Reaches: maintenance scripts, migration helpers, ad-hoc admin queries.

Two watch-outs to surface inline (not as a bundled list):

- **A raw `delete from … where …` via `db.execute` has no missing-`where` guardrail.** The builder's "every mutation carries a `where`" reflex (L1) is gone — `db.execute` will happily run an unqualified delete. Reuse the L1 data-loss framing: dropping to `db.execute` for a mutation means *you* are now the guardrail.
- **The result shape is driver-specific.** Neon's serverless driver and node-postgres differ slightly in what `db.execute` returns; the setup chapter (the chapter that wires `db/index.ts`) standardizes which one the course uses. Point at it, don't resolve it here.

`Code` block: the `refresh materialized view` one-liner — the canonical "legitimate `db.execute`" shape.

### The unsafe corner: `sql.raw` and dynamic identifiers

The dangerous-tool section, fear-calibrated but not bloated. `sql.raw(input)` interpolates **without** parameterization — the whole string becomes part of the SQL. State the rule first and hardest: **never with anything user input has touched.** That's the injection vector the section before drew as a picture.

Then the **one legitimate use**: building a *dynamic identifier* — a table or column name chosen at runtime — that genuinely can't be a bound parameter (Postgres won't accept a `$1` where an identifier goes). Even then, the value must come from a **fixed allow-list in your own code**, never from the request. Worked shape: a sort column picked from a hardcoded `{ created_at, amount_due }` map keyed by a validated enum, never the raw query-string value.

Then the **safer tool for the common case**: `sql.identifier(name)` quotes a dynamic identifier (doubles the embedded delimiter and wraps it), so most "I need a dynamic column name" needs reach for `sql.identifier`, not `sql.raw`. Name `sql.placeholder('foo')` in one line as the prepared-statement placeholder (a performance detail, deferred to Ch 039) so the student recognizes it and doesn't confuse it with `sql.raw`.

**The load-bearing correction — `sql.identifier` is necessary but NOT sufficient.** This is the lesson's strongest real-production moment, and it's current: **CVE-2026-39356** (fixed in Drizzle **0.45.2** and **1.0.0-beta.20**) was a real SQL injection *through* `sql.identifier()` — older `escapeName()` implementations wrapped the identifier in quotes but didn't double an embedded `"`, so an attacker-controlled value could terminate the quoted identifier and inject. The canonical vulnerable pattern is *exactly* the naive dynamic-sort: `orderBy(sql.identifier(req.query.sort))`. The lesson must land the two-part lesson the CVE teaches: (1) keep Drizzle patched (the quote-escaping fix is the floor), and (2) **the identifier-quoting tool is not your defense — the allow-list is.** Even with a patched `sql.identifier`, never pass request input to it; validate against a fixed set of permitted names first. Frame this not as fear of Drizzle but as the durable senior reflex: *quoting helpers reduce blast radius; allow-lists are the actual control.* (Pull the Drizzle security advisory as the `ExternalResource` here — a real CVE the student can read is worth more than a hypothetical.)

The governance close, stated as a review reflex (reuse the chapter's "X in a diff is a question" pattern from L1/L2/L5): **when `sql.raw` *or* `sql.identifier` on a runtime value appears in review, the reviewer's first question is "where did this name come from?" and the only acceptable answer is "a fixed set in our code."** If it can't be traced to an allow-list, it's the bug — patched quoting or not.

`CodeVariants` (three tabs, escalating): "`sql.identifier` from the request" (red — `orderBy(sql.identifier(searchParams.sort))`, the CVE pattern, injectable even patched), "`sql.identifier` + allow-list" (green — validate `sort` against a hardcoded `['created_at', 'amount_due']` set, *then* pass it), "`sql.raw` from an allow-list" (green/amber — the same allow-list discipline at the lower-level `sql.raw`, for the rarer case `sql.identifier` doesn't fit). First sentence states the verdict. This trio is the lesson's safety capstone — it carries the CVE lesson concretely.

### Migrations: where hand-written SQL is the default, not the exception

The reframe that closes the chapter's many deferred pointers. Everywhere else the lesson treats raw SQL as the governed exception — but **inside a migration file, hand-authored SQL is normal and expected**, not a smell. Drizzle Kit emits the table/column/constraint DDL; the things it *doesn't* emit are exactly the chapter's running "owned by a migration / Ch 039 L1" debts:

- **Custom indexes** — GIN for the `tsvector` column (L8) and `jsonb` containment (L9), partial indexes, the composite cursor index (L6), expression indexes. The chapter has deferred *every* index to Ch 039 L1; name that the index *mechanic* and *tuning* live there, but the *vehicle* — a hand-written `create index` in a migration — is this category.
- **Triggers** — the `updatedAt` trigger from Ch 037 L4. Cash that pointer: it's a hand-written `create trigger` in a migration, and that's correct.
- **Extensions** — `create extension if not exists pg_trgm` (named in L8) / `pgcrypto`, etc.
- **Constraint tweaks Drizzle Kit doesn't generate** — a `check` shape or exclusion constraint beyond what the schema expresses.

Mental model: **the builder governs *queries*; migrations are a different surface where SQL is the authoring language.** A hand-written `ALTER`/`CREATE` inside a generated migration's `.sql` file is expected; the discipline there is *review every generated migration and any hand edits* (Ch 037 L7 / Code conventions reflex — never ship an unread migration), not *avoid SQL*. Keep the actual migration-file structure and Drizzle Kit mechanics pointed at the migrations chapter (the setup/migrations chapter) — this lesson only establishes *that* migrations are raw-SQL-normal and *which* artifacts live there.

`Code` block (sql): a representative migration excerpt showing a `create extension`, a GIN `create index`, and the `updatedAt` trigger together — the "this is what hand-written migration SQL looks like, and it's fine" picture. Mark it clearly as migration-file SQL, not application code.

### What dropping to raw actually costs

Short consolidation section — make the trade-off explicit so the "reach rarely" rule has teeth. Four costs, framed as what you give up (tie each back to a capability the chapter built):

- **Type inference** — gone, re-claimed by hand with `sql<T>` (and the claim is unchecked). The chapter's "derive, don't declare" result-typing (L1/L3/L4/L7) doesn't reach inside a raw fragment.
- **Builder-level safety** — a raw mutation has no missing-`where` guard (L1); a raw query has no schema-aware column checking. You inherit the guardrails the builder was holding.
- **Forward-compatibility** — the builder tracks Postgres/Drizzle version changes; hand-written SQL is yours to migrate if syntax shifts.
- **Reader cost** — the next reader context-switches between builder and SQL; a `sql\`\`` that didn't need to exist taxes everyone who reads the file later.

Land the synthesis (the lesson's spine, restated): a senior reaches for raw SQL **rarely, deliberately, at the shallowest depth that works, always parameterized, and never `sql.raw` with input they can't trace to an allow-list.** That sentence is the lesson's one-line takeaway.

`Buckets` exercise (two buckets: **"Reach for raw SQL"** / **"Stay in the builder"**) as the section's check, sorting concrete situations: trigram `<->` distance ordering → reach; `where status = 'sent'` → builder; `refresh materialized view` → reach (`db.execute`); paginated list with a tiebreaker → builder; a `create index … using gin` → reach (migration); selecting a user by id → builder; `ts_rank` ordering → reach (shallow `sql\`\``); a dynamic column name from a fixed allow-list → reach (but `sql.identifier`). Goal: the student practices the *judgment* the whole lesson is about, on situations drawn from the chapter they just finished. Place at the end of this section as the lesson's capstone check. (If the maintainer prefers a single decision widget, fold this into the section-1 `StateMachineWalker` and drop one — flagged in feedback.)

### External resources (optional)

One or two `ExternalResource` cards: Drizzle's "Magic `sql` operator" / SQL-template docs page, and (optionally) the Drizzle `db.execute` / `sql.raw` reference. Keep to genuinely canonical sources.

---

## Term tooltips

Strategic, only what supports the lesson's goals and isn't already a chapter-defined term:

- **`sql\`\`` tagged template** — "A JS tagged template; Drizzle reads the interpolations — tables/columns become quoted identifiers, values become bound `$1` parameters." (The student has used it; name it formally here.)
- **`sql.raw`** — "Interpolates a string into SQL *without* parameter binding. Safe only for fixed identifiers from your own code, never user input."
- **`sql.identifier`** — "Quotes a runtime-chosen table or column name. The right tool for a dynamic identifier — but quoting is not your defense; still validate the name against a fixed allow-list."
- **bound parameter** / **`$1` placeholder** — only if not already covered by the L1 Term definitions; L1 defined `parameterized query` / `placeholder` / `SQL injection`, so **reuse those, don't redefine.** Add a tooltip only for the *new* contrast term if needed.
- **`db.execute`** — "Runs an arbitrary statement on the pool, returning the raw driver result (not a typed builder array)."
- **dynamic identifier** — "A table or column name chosen at runtime rather than written literally — the one thing a bound parameter can't be."

Do **not** re-Term `SQL injection`, `parameterized query`, `placeholder` (L1 owns them), or `materialized` / `window function` / `tsvector` / `jsonb` (L7/L8/L9 own them) — link by reuse, not redefinition.

---

## Scope

**Prerequisite, redefine in one line only:** the student already knows the `sql\`\`` tag parameterizes values (L1 named it; L4/L8/L9 used it) and that `sql<T>` is a TS-side claim (L4/L7/L8/L9). This lesson *consolidates* those; it does not re-teach them from zero.

**This lesson does NOT cover (owned elsewhere — do not re-teach or pull forward):**

- **Migration file structure, Drizzle Kit `generate`/`migrate`, the `meta/_journal.json` layout, `--name` discipline.** This lesson establishes only *that migrations are the home for hand-written SQL* and *which artifacts live there*; the mechanics belong to the migrations/setup chapter (the chapter that wires `db/index.ts` and runs Drizzle Kit — referenced by the chapter outline as "Ch 040 setup" / lesson 1 of the migrations chapter). Point, don't teach.
- **Prepared statements as a performance technique** (`sql.placeholder` at depth, `.prepare()`) — named for recognition only; owned by Ch 039.
- **`EXPLAIN ANALYZE` / plan inspection** for when a raw query is slow — Ch 039 L3.
- **Index declaration and tuning** (GIN, partial, composite, expression) — Ch 039 L1. This lesson names *that* these indexes are hand-written migration SQL; it does **not** teach how to declare or tune them.
- **The Neon serverless vs node-postgres driver decision** and what each makes `db.execute` return — Ch 036 L4 / the setup chapter. Name the divergence, don't resolve it.
- **Custom Postgres extensions at depth** (PostGIS, `pg_trgm` operators drilled) — out of scope; `pg_trgm`/`<->` appears only as an *example of a feature with no Drizzle helper*, exactly as L8 named it.
- **`customType` for `tsvector`** (L8 owns it), **JSONB operators and `$type`** (L9 owns them), **window functions and CTEs** (L7 owns them), **aggregates and `filter (where …)`** (L4 owns them) — these reappear *only* as reuse-examples of the escape hatch correctly applied. Do not re-teach the feature; reference the student's prior work.
- **Zod validation of the allow-list input** that feeds a dynamic identifier — named as "validated upstream," owned by Ch 042. The lesson's point is the allow-list discipline, not the validator.
- **A query-writing coding exercise** (`DrizzleCoding`/`SQLCoding`). This is a judgment lesson; the chapter's load-bearing coding assessments are L1–L9. The proposed exercises are decision/identification drills (`StateMachineWalker`, `Buckets`, `Tokens`), not query authoring. **Flag for maintainer:** confirm a non-coding exercise set is acceptable for this lesson, or whether a small `SQLCoding` (e.g. an `ORDER BY ts_rank` via raw SQL on PGlite, reusing L8's seed) should anchor it.

---

## Notes for downstream agents

- **Version posture:** the `sql\`\`` template, `sql.raw`, `sql.identifier`, `sql.placeholder`, and `db.execute` are **version-neutral across Drizzle 0.45 → 1.0** — no v1/v2 split flag (unlike L3's RQB). No `relations()`/`defineRelations` code appears in this lesson. **One version floor matters:** `sql.identifier`'s quote-escaping fix (CVE-2026-39356) landed in **0.45.2 / 1.0.0-beta.20** — the lesson should state the patched-version floor as fact (verified June 2026), and the allow-list reflex stands regardless of patch level.
- **Confirmed June 2026 (carry from L9):** Drizzle ships **no typed JSONB-accessor builder** and no typed builder for the FTS/window/operator fragments this lesson cites as "no Drizzle helper" — that absence is *the reason* the escape hatch exists; do not invent builders.
- **Code register:** application-code samples follow Code conventions §Data layer (every mutation a `where`, `sql\`\`` for fragments, `sql.raw` only for fixed identifiers — line 276). Migration-file SQL samples are deliberately raw and must be **labeled as migration files**, not application code, so the student doesn't read a hand-written `create index` as an in-app query.
- **Schema reuse only** (Ch 037, never redeclared): `invoices` (`id`, `amountDue`, `status`, `organizationId`, `createdAt`, `searchVector` from L8), `organizations`. No new tables, no new domain — every example recycles a fragment the student already wrote earlier in the chapter.
- **Tenant reflex still by hand:** any multi-tenant example carries `eq(invoices.organizationId, orgId)` explicitly (the `tenantDb` factory doesn't exist until Unit 10) — consistent with L1–L9.
- **Widget budget (short lesson — keep tight):** 1 `CodeVariants` (parameterized-vs-raw, the keystone), 1 HTML+CSS `<Figure>` (the bind-beside-vs-splice-into picture), 1 `Tokens` (bound vs spliced), 1 `CodeVariants` (`sql.raw` allow-list vs request), 1 `Buckets` (reach-or-builder capstone), optionally 1 `StateMachineWalker` (the section-1 decision). Plain `Code` blocks for the `db.execute` one-liner and the migration excerpt. If trimming, the keystone `CodeVariants` + the `<Figure>` + the `Buckets` are non-negotiable; the `StateMachineWalker` is the first cut.
