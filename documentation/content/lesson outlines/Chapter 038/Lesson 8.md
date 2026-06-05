# Lesson 8 — Full-text search in Postgres

Title (h1): `Full-text search in Postgres`
Sidebar label: `Full-text search`

---

## Lesson framing

The senior question is a build-vs-buy decision before it's a syntax lesson: a SaaS app needs "search the invoices by description and customer name" — is that a Postgres feature or a separate service (Algolia, Meilisearch, OpenSearch, Elastic)? The lesson's spine is **reach for Postgres first; an external search service is a conditional power tool with a real threshold.** Postgres full-text search (FTS) covers the workload up to roughly low-millions of documents at modest query rates — the 2026 default for a SaaS that already runs Postgres. Naming that threshold up front satisfies the "trigger before tool / default before conditional" filter and frames the whole lesson as a decision, not a feature tour.

Second spine, the mental model that everything else hangs off: **FTS does not do `LIKE` on raw strings — it matches normalized `tsvector` lexemes against a normalized `tsquery`, both run through a language config.** The student already knows `ilike '%term%'` from L1; the lesson's job is to make them feel why that breaks (no stemming, no ranking, no index for leading-wildcard, no stop-word handling) and why a lexeme model fixes it. Lead with that contrast — it's the pain point the tech relieves and the hook into the new model.

Pedagogically this is a **reuse-and-assemble** lesson, not a from-scratch one. The student met `generatedAlwaysAs` STORED columns in Ch 037 L4 and `sql\`\`` parameterization in L1/L4/L7 of this chapter. FTS is those two tools pointed at a new problem plus four new Postgres functions (`to_tsvector`, `websearch_to_tsquery`, `ts_rank`, `ts_headline`) and one new Drizzle idiom (`customType` for `tsvector`, because Drizzle ships no native `tsvector` builder). Keep cognitive load down by building the simplified model first (a single `to_tsvector(...) @@ to_tsquery(...)` against one column, computed at query time) then upgrading it twice: (1) swap `to_tsquery` for `websearch_to_tsquery` once user input enters, (2) move the vector off the hot path into a generated column once "at query time" is named as the scaling bug. Each upgrade is motivated by a concrete failure of the prior step, never presented as "the right way" out of nowhere.

Where beginners get this wrong in production, surface explicitly as the lesson's load-bearing watch-outs (each lives in the section that teaches the concept it qualifies, never bundled):
- Building the `tsvector` at query time (`to_tsvector(col) @@ ...`) instead of indexing a generated column — re-tokenizes every row on every query, the #1 scaling mistake. The generated column is mandatory at any real volume.
- Reaching for `to_tsquery` with raw user input — it throws on bare spaces/punctuation and exposes operator syntax. `websearch_to_tsquery` is the only safe-for-user-input choice; this is the single highest-value takeaway.
- Expecting substring/exact match — the `'english'` config stems and drops stop words, so a search for "running" matches "run" but a search for a stop word matches nothing. Set expectations correctly (and name `'simple'` as the no-stemming config).
- Querying a `tsvector` with no GIN index — sequential scan, slow even at a few thousand rows. The lesson **names the dependency and shows the index shape** but Ch 039 L1 owns declaring/tuning it — hard boundary: this lesson owns "correct," next chapter owns "fast," they ship together (same pattern L6 established for cursor + composite index).

Mental model the student leaves with: *text → lexemes (`tsvector`, generated + GIN-indexed) ; query → lexemes (`tsquery`, via `websearch_to_tsquery`) ; match with `@@` ; order by `ts_rank` + a PK tiebreaker ; highlight with `ts_headline`. Postgres does this well into the millions; past that, or when relevance tuning / typos / faceting become the product, an external engine earns its weight.*

What the student can do at the end: add a generated `tsvector` column to an existing table via the `customType` idiom, write a parameterized ranked search query through Drizzle that's safe for raw user input, return a typed result, and articulate the threshold where they'd leave Postgres.

Tone per pedagogical guidelines: terse, adult, decision-first. No "what is search." Money/`numeric` and tenant-`where` reflexes from earlier lessons are reused verbatim where examples touch invoices, never re-explained.

Running domain (Ch 037, never redeclared): `invoices` (`id`, `description` text nullable, `customerName` text, `organizationId`, `amountDue` `numeric`→string, `status` enum, `createdAt`), `organizations` (`id`, `name`). FTS searches `description` + `customerName`; every query is org-scoped in the `where` (tenant reflex from L1).

---

## Lesson sections

### Introduction (no header)

Open on the concrete problem: the invoices list now needs a search box. Show the obvious first move the student already knows — `where(ilike(invoices.description, \`%${term}%\`))` — and puncture it in four bullets the student can feel: searching "invoices" won't match "invoice"; searching "overdue payment" won't match "payment overdue"; a leading `%` can't use a normal index; "the" matches every row. That's the gap FTS fills. State the senior framing immediately after: this is build-vs-buy — Postgres FTS is the default, external search is the threshold tool, and this lesson lands the Postgres path plus the line where you'd cross it. Preview the end state (a ranked, highlighted, injection-safe search query over a generated column) in one sentence. Keep to ~4 short paragraphs.

Reasoning: satisfies "motivate with a concrete problem" + "senior question implicitly in the intro" + "connect to what they know" (the `ilike` they just learned). The four-bullet puncture is the cognitive hook the rest of the lesson resolves.

### Lexemes, vectors, and queries: the mental model

Teach the core abstraction before any Drizzle. Three terms, one operator:
- **Lexeme** — a normalized word stem. `running`, `ran`, `runs` all reduce to the lexeme `run`. The normalization (stemming + lowercasing + stop-word removal) is what makes search match meaning, not characters.
- **`tsvector`** — a document pre-processed into its sorted set of lexemes with positions. `to_tsvector('english', 'The cats are running')` → `'cat':2 'run':4` (stop words `the`/`are` dropped, `cats`→`cat`, `running`→`run`).
- **`tsquery`** — a search expression in the same lexeme space. `'run'` matches the vector above; `'cat & run'` matches (both present); `'dog'` doesn't.
- **`@@`** — the match operator. `tsvector @@ tsquery` → boolean. This is the whole engine in one line.

Vehicle: a **`<Figure>` with hand-built HTML+CSS** showing one sentence flowing left-to-right through three boxes: raw text → `to_tsvector('english', …)` → the lexeme chips (`'cat':2 'run':4`), and beneath it the query text → `websearch_to_tsquery('english', …)` → its lexeme chips, the two meeting at a central `@@` → ✓/✗. Pedagogical goal: make "both sides are normalized to the same lexeme space, then compared" visually obvious — this is the single insight that explains every later behavior (why stemming helps, why stop words vanish, why exact-match surprises). Horizontal, compressed, well under the 800px cap. This is an annotated-illustration shape → HTML+CSS per the diagrams index, not a graph engine.

Make the language-config point here, concisely: the `'english'` argument selects the **text search configuration** — the stemmer and stop-word list. `'simple'` does no stemming and keeps stop words (useful when you want near-exact tokens). For single-language SaaS, hardcode `'english'`; for multilingual, store the language per row and pass it dynamically (named, not drilled).

Watch-out lives here (it qualifies the model): the `'english'` config stems aggressively and drops stop words — so FTS is *not* substring or exact match. If the product needs exact-token or code-identifier search, that's `'simple'` or a different strategy (`pg_trgm`, named later). Set this expectation now so the stemming doesn't read as a bug later.

Reasoning: this is the lesson's conceptual spine — everything downstream is mechanics on top of it. Teaching it abstractly first (no Drizzle noise) keeps load low; the figure does the heavy lifting because lexeme normalization is inherently visual.

Tooltip terms (`<Term>`): `lexeme`, `tsvector`, `tsquery`, `stemming`, `stop word`, `text search configuration`. These are non-obvious vocabulary the student has never met; defining inline keeps prose flowing.

### A first search, computed at query time

Now make it runnable — but deliberately with the **simplified, not-yet-optimized** shape, so the optimization later has something to fix. Write the query that builds the vector inline:

```ts
db.select()
  .from(invoices)
  .where(sql`to_tsvector('english', coalesce(${invoices.description}, '') || ' ' || coalesce(${invoices.customerName}, '')) @@ websearch_to_tsquery('english', ${term})`)
```

Use **`AnnotatedCode`** (blue) to walk it in 3-4 steps: (1) the `to_tsvector(...)` building a vector from two columns joined with `||`, with `coalesce(col, '')` guarding nullable `description` (reuse the Ch 037 nullability awareness); (2) the `@@` match against the query side; (3) `websearch_to_tsquery('english', ${term})` parsing the user's raw string — flag that `${term}` is a bound `$1` parameter, same injection safety as every `eq(col, value)` from L1 (reuse the parameterization reassurance verbatim in spirit, don't re-derive it); (4) the whole thing lives in a normal Drizzle `where` via `sql\`\`` — the builder owns the structure, the template fills the predicate (the embedding pattern from L7).

Immediately name the problem this shape has, as the bridge to the next section: `to_tsvector(...)` runs **per row, per query** — Postgres re-tokenizes every invoice's text on every search. Fine for this demo, a sequential-scan disaster at volume. That's the watch-out that motivates the generated column. (This is "decisions before syntax" — the student sees the naive shape *and why it's naive* before the fix.)

`websearch_to_tsquery` gets its own focused beat here because it's the highest-value takeaway. Contrast it with `to_tsquery` in two lines: `to_tsquery('english', 'overdue payment')` **throws** (bare space is a syntax error — it expects `overdue & payment`); `websearch_to_tsquery('english', 'overdue payment')` parses Google-style input safely — quoted `"exact phrases"`, bare words AND-ed, `or`, `-excluded`. **`websearch_to_tsquery` is the only function you point at raw user input**; `to_tsquery` is for server-constructed queries from trusted parts. Use a **`CodeVariants`** ("`to_tsquery` (raw input → throws)" vs "`websearch_to_tsquery` (raw input → safe)") to make the difference a one-glance A/B, red vs green marks.

Tooltip terms here: `websearch_to_tsquery`, `coalesce`.

Reasoning: building the inline version first, then condemning it, is the staged-complexity move from the framing — the generated column reads as a fix to a felt problem, not a rule. The `websearch_to_tsquery` vs `to_tsquery` A/B is the single most important practical decision in the lesson, so it gets a dedicated comparison component.

### Moving the vector off the hot path: the generated tsvector column

The fix: precompute the `tsvector` once, at write time, in a STORED generated column — exactly the `generatedAlwaysAs` mechanic from Ch 037 L4, now pointed at FTS. But surface the Drizzle-specific gotcha that trips everyone: **Drizzle ships no `tsvector` column builder.** You define one with `customType`:

```ts
import { customType } from 'drizzle-orm/pg-core';

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});
```

Then the column on the table:

```ts
searchVector: tsvector('search_vector')
  .notNull()
  .generatedAlwaysAs(
    (): SQL => sql`to_tsvector('english', coalesce(${invoices.description}, '') || ' ' || coalesce(${invoices.customerName}, ''))`,
  ),
```

Vehicle: **`CodeVariants`** with three tabs to stage the build — "1. customType" / "2. generated column" / "3. the column in the table" — OR a single **`AnnotatedCode`** (violet) over the full table excerpt highlighting (a) the `customType` definition, (b) the `.generatedAlwaysAs((): SQL => sql\`…\`)` callback form, (c) `coalesce` guarding the nullable input, (d) `.notNull()`. Prefer `AnnotatedCode` — it's one coherent file the student should read top-to-bottom with attention steered, which is exactly that component's job. Keep the excerpt to the new column + the customType helper, not the whole Ch 037 table (don't redeclare it).

Drive home *why generated*: the column stays in sync automatically — every insert/update recomputes the vector from the source columns, no trigger to maintain, no app code to remember. Contrast in one line with the old hand-rolled approach (a `BEFORE INSERT/UPDATE` trigger calling `to_tsvector`) — name it as the pre-generated-columns pattern the student will see in older code, not what they write. (Reuse Ch 037 L4's framing that generated columns replace the trigger boilerplate.)

The GIN index — **named, shape shown, owned by Ch 039 L1.** State the dependency plainly: a `tsvector` column is only fast to query with a GIN index; without one Postgres sequentially scans. Show the Drizzle shape so the student recognizes it, using the correct API and the project's naming convention from Code conventions (`idx_<table>_<col>_gin`):

```ts
(t) => [
  index('idx_invoices_search_vector_gin').using('gin', t.searchVector),
]
```

Then hard-stop: declaring and tuning indexes is Ch 039 L1; here we only establish that the FTS query *needs* it. Cross-reference explicitly. (Mirror L6's "owns correct here, fast next chapter; they ship together" boundary.)

Now rewrite the query against the generated column — the payoff:

```ts
db.select()
  .from(invoices)
  .where(sql`${invoices.searchVector} @@ websearch_to_tsquery('english', ${term})`)
```

Use **`CodeVariants`** for the before/after: "Query-time vector (re-tokenizes every row)" vs "Generated column (`@@` hits the GIN index)", `del`/`ins` framing. Pedagogical goal: the student sees the predicate collapse from a giant `to_tsvector(...)` expression to a bare column reference, and connects that to the performance win.

Watch-out (qualifies this section): building the vector at query time vs. indexing a generated column is the difference between a search that scales and one that melts at a few thousand rows — the generated column is mandatory at any real volume, not an optimization you defer.

Tooltip terms: `customType`, `generated column` (re-explain briefly as a prerequisite from Ch 037 without breaking flow), `GIN index`.

Reasoning: this section cashes the "reuse Ch 037 L4" plan. The `customType` gotcha is the one thing the chapter outline got factually wrong (it wrote `tsvector('search_vector')` as if a builder exists) — correcting it is load-bearing, so it gets prominent placement and a code component. The GIN boundary is drawn sharply to avoid stealing Ch 039's lesson.

### Ranking results with ts_rank and a tiebreaker

A search that returns matches in arbitrary order is half-built. `ts_rank(vector, query)` scores relevance (term frequency, proximity, weights); `ts_rank_cd` is the cover-density variant that rewards matched terms appearing close together. Order by it descending:

```ts
db.select()
  .from(invoices)
  .where(sql`${invoices.searchVector} @@ websearch_to_tsquery('english', ${term})`)
  .orderBy(
    desc(sql`ts_rank(${invoices.searchVector}, websearch_to_tsquery('english', ${term}))`),
    asc(invoices.id),
  )
```

Two beats:
1. **The tiebreaker reflex returns, now load-bearing for search.** `ts_rank` produces ties (many rows score identically), and a list ordered only by rank pages non-deterministically — the exact bug L1 and L6 hammered. Pair the rank with the PK (`asc(invoices.id)`) for a total order. Reuse the established framing verbatim in spirit; this is the same reflex, third appearance, now in a search context.
2. **DRY the query expression.** `websearch_to_tsquery('english', ${term})` now appears in both `where` and `orderBy`. Extract it to a `const queryExpr = sql\`websearch_to_tsquery('english', ${term})\`` and reference it in both places — the same "extract a repeated `sql\`\`` expression to a const" pattern L4 established (no positional `ORDER BY 1` shortcut in the builder). Show this as the senior shape, not an afterthought.

Vehicle: **`AnnotatedCode`** (green) over the DRY'd version — step through the `const queryExpr`, its reuse in `where`, its reuse inside `ts_rank` in `orderBy`, and the PK tiebreaker. One file, attention steered.

Type note (brief, reuse L4/L7): `ts_rank` returns a float; if the projection needs it typed, claim it with `sql<number>\`ts_rank(...)\`` — a TS-side claim, not a runtime check, same honesty caveat as every `sql<T>` so far. Keep to one line; `sql<T>` at depth is L10.

Watch-out: ranking without a tiebreaker is the silent pagination bug — surfaces as "results reshuffle between pages." (Qualifies ranking, lives here.)

Tooltip terms: `ts_rank`, `ts_rank_cd`.

Reasoning: ranking is what separates "FTS" from "a `WHERE` clause," so it earns a full section. Folding the tiebreaker reflex and the DRY-the-expression pattern in here ties the lesson back to the chapter's through-lines rather than teaching them anew.

### Highlighting matches with ts_headline

The search UI wants to show *why* a row matched. `ts_headline('english', invoices.description, websearch_to_tsquery('english', ${term}))` returns a snippet of the source text with the matched lexemes wrapped (default `<b>…</b>`, configurable via options like `StartSel`/`StopSel`, `MaxWords`). Add it to the projection:

```ts
db.select({
  id: invoices.id,
  customerName: invoices.customerName,
  snippet: sql<string>`ts_headline('english', ${invoices.description}, ${queryExpr})`,
})
  .from(invoices)
  .where(sql`${invoices.searchVector} @@ ${queryExpr}`)
  .orderBy(desc(sql`ts_rank(${invoices.searchVector}, ${queryExpr})`), asc(invoices.id))
```

Vehicle: a simple **`Code`** block (this is additive, not conceptually dense — no stepped walkthrough needed) plus one or two lines of prose. Show the `sql<string>` claim on the projected snippet (it's text). 

Two honesty notes (brief, qualify the feature):
- `ts_headline` operates on the **raw text column** (`description`), not the `tsvector` — the vector has no original text to excerpt. So it re-reads the source column; that's expected, but it means `ts_headline` is not free and should ride on the already-filtered result set, not be computed across the whole table.
- Server-rendered `<b>` tags from `ts_headline` are markup the UI must render intentionally; in a React surface that means controlled rendering, not raw injection — name the concern, defer the how (this lesson is the data layer, not the render).

Reasoning: `ts_headline` is a small, high-utility addition that makes the search feel real, so it's worth a short section — but it doesn't carry new conceptual weight, so it stays light (plain `Code`, no heavy component). The "operates on raw text" note prevents a common misconception.

Tooltip term: `ts_headline`.

### When Postgres is enough, and when to leave it

Close on the build-vs-buy decision the lesson opened with — now the student has the context to weigh it. Frame as a threshold, not a verdict.

**Postgres FTS is the default and stays the answer when:** the corpus is up to ~low-millions of documents; query rate is modest (handful/sec, not search-as-you-type at scale); relevance needs are "rank by match," not tuned boosting; the data already lives in Postgres (no separate sync pipeline, no second source of truth, transactional consistency for free). For the overwhelming majority of SaaS apps, this is the whole story — and you avoid an entire extra service, its cost, and the dual-write consistency problem.

**An external engine (Algolia, Meilisearch, Typesense, OpenSearch/Elastic) earns its weight when:** corpus into many millions with high query throughput; typo tolerance / synonyms / "did you mean" as a product requirement; faceted search across many fields; learning-to-rank or per-tenant boost rules; instant search-as-you-type latency budgets; multi-language with on-the-fly detection. The cost you take on: a second datastore to keep in sync (every write fans out), eventual-consistency between Postgres and the index, and operational surface.

**The in-database escape hatch before you leave: `pg_trgm`.** Trigram similarity (`similarity(a, b)`, the `%` operator, `<->` distance) handles typos and partial/substring match — the one thing FTS lexeme-matching can't do — without leaving Postgres. Named for recognition (it complements FTS, lives right next to it); the extension + operators are not drilled here. Point at it as "the next thing you'd try before adopting Algolia, if typo-tolerance is the only gap."

Vehicle: a **`StateMachineWalker`** in decision-tree mode (or **`Buckets`** if a walker is overkill) — a 2-3 question walk ("Corpus into the millions?" → "Need typo tolerance / synonyms / faceting?" → recommendation) ending on one of: *Postgres FTS* / *`pg_trgm` first* / *external search engine*. Pedagogical goal: turn the prose threshold into an interactive decision the student executes, reinforcing that this is a judgment call with named inputs, not a default to memorize. If a walker isn't warranted, a `MultipleChoice` ("which workload should leave Postgres?") with scenario options is the lighter fallback.

Tooltip terms: `pg_trgm`, `faceted search`. (`vector search` / embeddings explicitly *out of scope* — one-line forward pointer to Unit 22 if it helps, no tooltip.)

Reasoning: this section is the lesson's reason for existing per the "decisions over syntax" pillar — the syntax serves the build-vs-buy call. Putting it last lets the student decide with full knowledge of what Postgres FTS actually does. The interactive decision component makes the threshold sticky.

### Practice: write a ranked search query

A live-coding exercise where the student writes the FTS query themselves. **Exercise-vehicle decision (verify before building, see Scope):** prefer **`SQLCoding`** over `DrizzleCoding` for this lesson specifically, because the `tsvector` path depends on `customType` and a `generatedAlwaysAs(sql\`…\`)` column — neither is in the `DrizzleCoding` widget's exposed globals (its column-builder/operator allow-list per the component doc has no `customType`), and the widget auto-generates DDL from the schema, so a `customType`-based generated column may not emit. PGlite is full Postgres, so **raw SQL FTS (`to_tsvector`, `websearch_to_tsquery`, `@@`, `ts_rank`) runs natively** — `SQLCoding` sidesteps both risks.

`SQLCoding` design:
- **Seed:** `invoices` table with `id` (int PK, seeded), `organization_id`, `description` text, `customer_name` text, plus a STORED generated `search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(description,'') || ' ' || coalesce(customer_name,''))) STORED` column (raw DDL in the seed — `SQLCoding` takes arbitrary DDL). Seed ~6 invoices for one org (id 1) with descriptions that exercise stemming and ranking: e.g. one row "Overdue invoice for consulting services", another "Consulting retainer, paid", another "Hardware purchase" (non-matching), one with `customer_name = 'Consulting Partners LLC'`, one NULL description. PGlite staging carried from L1–L7: integer PKs, explicit seeded ids, snake_case column strings, money-as-string if `amount_due` included (incidental here).
- **Task:** "Return invoices for org 1 matching the search `consulting`, most relevant first." Student writes `WHERE search_vector @@ websearch_to_tsquery('english', 'consulting')` + `ORDER BY ts_rank(search_vector, websearch_to_tsquery('english','consulting')) DESC, id ASC` + the `organization_id = 1` scope.
- **Graded trap:** the stem — the row whose text says "consulting" and the row via `customer_name` both match; a student who reaches for `ILIKE '%consulting%'` (the L1 reflex) would *also* work here, so design the seed so FTS's stemming is what's tested: include a row "Consultancy agreement" that `ILIKE '%consulting%'` would **miss** but is acceptable to also-not-match (consultancy≠consulting stem), and ensure at least one expected row only matches via stemming/the generated vector path (e.g. description "We consult monthly" → stems `consult`, matches `consulting`→`consult`), which a naive `ILIKE '%consulting%'` would miss. `expectedRows` pinned to the FTS-correct set, `ordered: true` (rank order matters), tiebreaker by `id` makes it deterministic.
- `expectedRows` returns `id` (+ optionally `customer_name`); subset-matched.

If verification shows the `DrizzleCoding` widget *can* wire a `customType` tsvector + generated column into its auto-DDL, the Drizzle form is preferable for course consistency (every prior Ch 038 exercise is `DrizzleCoding`) — record which shipped. Default expectation: `SQLCoding`.

Pedagogical goal: the student proves they can (a) match on a `tsvector`, (b) use `websearch_to_tsquery` for the input, (c) rank with a tiebreaker — the three load-bearing skills — and feels the stemming difference vs the `ILIKE` they'd have reached for.

Reasoning: a guided live-coding exercise beats a sandbox (per guidelines: guided > sandbox); the stemming trap is what makes it *teach* rather than just *check syntax*. `SQLCoding` chosen over `DrizzleCoding` on a concrete capability gap, flagged for verification exactly as prior lessons flag their exercise risks.

### External resources (optional)

`CardGrid` of `ExternalResource` cards: Drizzle's official "Full-text search with generated columns" guide (the canonical pattern this lesson teaches); Postgres docs "Controlling Text Search" (12.3) for `websearch_to_tsquery` / `ts_rank` / `ts_headline` reference; optionally the `pg_trgm` docs for the fuzzy-match escape hatch. Keep to 2-3.

Optional video: skip unless a short, current (≤6-month) FTS walkthrough surfaces — the topic is well-served by the figure + exercise, and a stale video on `to_tsquery` would teach the wrong function. Do not embed by default.

---

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- `generatedAlwaysAs` STORED generated columns (Ch 037 L4) — one-line recap ("computed at write time, stays in sync automatically"); the *mechanic* is owned there.
- `sql\`\`` parameterization (L1, L4, L7) — reuse the "values bind as `$1`, injection-safe" reassurance in one clause; don't re-derive.
- The tiebreaker reflex (L1, L6) — reuse verbatim in spirit ("pair the sort with the PK for a total order"); it's an established reflex, applied here, not new.
- `coalesce` for nullable columns — one-line, it's a guard not a topic.
- Tenant `where`-scoping (`organizationId`) carried by hand (L1) — `tenantDb` doesn't exist yet (Unit 10).

**Explicitly out of scope (owned elsewhere — do not teach):**
- **The GIN index — declaring and tuning it → Ch 039 L1.** This lesson shows the index *shape* and states the FTS query *depends* on it; it does not teach index types, `.using('gin', …)` at depth, or write/disk cost. Hard boundary.
- **`pg_trgm` fuzzy/trigram matching at depth** — named for recognition as the in-database typo-tolerance escape hatch; operators (`%`, `<->`, `similarity`) shown by name only, not drilled.
- **External search services** (Algolia, Meilisearch, Typesense, OpenSearch, Elastic) — covered only as the *threshold decision* (when to adopt, the consistency cost); zero integration code.
- **Vector / embedding / semantic search** (`pgvector`) — entirely out of scope; one-line forward pointer to Unit 22 (AI integration) at most.
- **Weighted search** (`setweight('A'|'B'|…)` to rank `customerName` matches above `description`) — a real FTS feature but a niche refinement; **cut** to protect the lesson's focus on the core path. Mention in a single optional aside at most, or omit. (Downstream agent: do not expand into a full section.)
- **Trigger-based `tsvector` maintenance** — named once as the pre-generated-columns pattern the student will see in old code; not taught (generated columns replace it).
- **`to_tsquery` / `plainto_tsquery` / `phraseto_tsquery` at depth** — `to_tsquery` is contrasted against `websearch_to_tsquery` to justify the choice; the others are named in one line at most. `websearch_to_tsquery` is the one the student writes.
- **`sql<T>` typing at depth, `db.execute`, `sql.raw`** → L10. Used here only as a one-line `sql<string>`/`sql<number>` claim with the "TS-side claim, not a check" caveat.
- **`EXPLAIN ANALYZE` to prove the GIN index is used** → Ch 039 L3.
- **Controlled rendering of `ts_headline`'s `<b>` markup in React** — named as a downstream concern; this is the data layer, the render is a later UI lesson.

---

## Code conventions notes for downstream agents

- **`customType` tsvector is mandatory** — there is **no `tsvector(...)` column builder in Drizzle** (the Ch 038 chapter outline's `tsvector('search_vector')` on line 235 is factually wrong; do **not** copy it). The correct shape is `customType<{ data: string }>({ dataType() { return 'tsvector'; } })`, then call that helper. This is the canonical pattern in Drizzle's own FTS guide. Surface `customType` as a new import from `drizzle-orm/pg-core`.
- **GIN index naming** follows Code conventions §Data layer: `idx_<table>_<col>_gin`, declared `index('idx_invoices_search_vector_gin').using('gin', t.searchVector)`. Show the shape, don't teach the lesson (Ch 039 L1).
- **`generatedAlwaysAs` callback returns `SQL`** — `generatedAlwaysAs((): SQL => sql\`…\`)`; import `SQL` (type) and `sql` from `drizzle-orm`.
- **DRY repeated `sql\`\`` expressions** to a `const` (the `queryExpr` pattern) per L4's established convention — no positional `ORDER BY 1` in the builder.
- **Deliberate pedagogical divergence:** the lesson teaches the query-time `to_tsvector(...)` shape *first* (the un-optimized form) before the generated column. This is intentional staged complexity, not a convention violation — the inline form is condemned in the same breath. Downstream agents must keep the ordering (problem → naive shape → felt failure → fix).
- Money/`numeric`→string and tenant-`where` reflexes reused verbatim where examples touch `invoices`; never re-explained.
