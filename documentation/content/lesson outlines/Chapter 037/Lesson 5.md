# Lesson 5 — Primary keys: UUIDv7 and identity bigint

Title (h1): `Primary keys: UUIDv7 and identity bigint`
Sidebar label: `Primary keys`

---

## Lesson framing

This is a **decision lesson**, not a mechanics lesson. The mechanics are tiny — three `.primaryKey()` shapes the student already half-knows from L2's bare `.primaryKey()` and L4's `$defaultFn`/`$default` modifier vocabulary. The weight is the *decision*: which key strategy each table picks, and why a 2026 SaaS picks it from day one rather than discovering the cost at scale. The senior question driving the whole lesson: **which primary-key strategy does this table want — and what does choosing wrong cost later?**

The student arrives having written `id: ... .primaryKey()` since L2 but never finalized what fills it (deliberate staging — L2/L3/L4 all left `id` as bare `.primaryKey()` and named L5 as the finalizer). This lesson closes that loop: it is the first time the chapter writes the *canonical* PK shape. After this lesson every table in the chapter (FKs in L6, junctions in L8) and in the chapter-041 project uses these shapes verbatim.

Mental model to install: **a primary key is a permanent identity decision, and the two axes that decide it are (1) who sees the ID — a user/URL/API boundary or only the database, and (2) is the value the database's to mint or the outside world's to own.** Axis 1 splits UUIDv7 (exposed) from `bigint identity` (internal). Axis 2 splits surrogate (database mints) from natural (domain owns) — and the senior default is *surrogate, always*, because a value the domain owns can change, and a changing PK detonates through every foreign key.

Three pain points to make visceral, because they are the "why" the student must feel, not just read:
1. **UUIDv4's write-amplification trap** — random keys scatter B-tree inserts; the cost compounds with table size and is nearly invisible at 1k rows, brutal at 10M. This is the single most important "choose right from day one" moment in the lesson. UUIDv7 fixes it by making the key time-sortable so inserts land at the index's tail like a sequence.
2. **Sequential integers leak business volume** — `/invoices/47` tells a competitor (or a scraper) your invoice count and your growth rate between two requests. A side benefit of UUIDs, and a real reason they're the default for anything in a URL.
3. **Mutable natural keys cascade pain** — make `email` or `slug` a PK and the day it changes, every FK row pointing at it must change too. The rule the student leaves with: *"would I be comfortable if this value changed?"* If not, it's not a PK.

The lesson should lead with the decision (the decision tree is the spine), make the UUIDv4→v7 locality argument with a visual, then land the three canonical code shapes, then drill the decision with an exercise. Keep the tone senior-terse; the student has competence and four prior schema lessons behind them.

**Pedagogical load-management.** Start simple — "every table needs one column that names a row; `.primaryKey()` declares it" — then layer the two axes one at a time (surrogate-vs-natural first because it's the universal default, then exposed-vs-internal as the surrogate sub-choice). Do not present all three strategies flat; present the *questions* and let each answer fall out. The decision tree component carries this ordering so the student internalizes the *order a senior asks the questions in*, not a lookup table.

**Canonical-shape decision (load-bearing for downstream agents — read before writing code).** The chapter outline and the code conventions disagree on the UUIDv7 default shape. Resolve in favor of **SQL-side native generation**:

```ts
id: uuid().primaryKey().default(sql`uuidv7()`)
```

Rationale: Chapter 036 put the project on **Neon Postgres 18**, which ships native `uuidv7()` (no extension). L4 taught "prefer SQL-side defaults — they apply to migrations, psql, and any tool that bypasses Drizzle." A SQL-side `default(sql\`uuidv7()\`)` honors that principle; the app-side `$defaultFn(() => uuidv7())` (npm `uuidv7` package) does not — it is invisible to raw inserts and seed scripts. So **native SQL-side is canonical for this course**, and the app-side `$defaultFn` shape is taught as the **portability fallback** for teams not on Postgres 18 (mirroring the conventions' own "teams without that pressure may prefer…" carve-out). This is a deliberate, reasoned divergence from the literal `$defaultFn` line in `Code conventions.md` §Data layer; flag it but do not "fix" it back. Note for the conventions maintainer surfaced in the final feedback.

(`Drizzle's .defaultRandom()` generates UUIDv4 only — feature request open for native v7 — so it is *not* the v7 path; name it once as the v4 generator and move on.)

---

## Lesson sections

### Introduction (no header)

Open with the senior question and the staging payoff: "Since Lesson 2 every table has carried `id: ...primaryKey()` with the fill left blank. This lesson fills it — and the choice you make here is the most permanent one in the schema." State why permanence matters: a PK is referenced by every foreign key, baked into every URL and API response, and effectively un-renameable once data exists. Preview the destination: a three-way decision (UUIDv7, identity bigint, natural) the student will be able to make per-table, and the canonical Drizzle shapes for each. Connect back: builds directly on L4's modifier vocabulary (`.default`, `$defaultFn`) and L3's `uuid`/`bigint` builders. One concrete hook: contrast `/invoices/47` vs `/invoices/0193b5...` and ask which one you'd ship to customers — seeds both the exposure and the locality threads. Keep to ~5 lines.

### What a primary key buys you

Restate the concept tightly (the student has met `.primaryKey()` syntactically but not its full semantics). A PK uniquely identifies a row; every foreign key points at exactly one. The load-bearing payoff: **`.primaryKey()` is three constraints in one** — implicit `NOT NULL`, `UNIQUE`, and an index, all for free. Rule to state explicitly: **never add a separate `.unique()` or index on a PK column** — it's redundant and a review smell. This frames the rest of the lesson as "we're choosing what *fills* a slot whose guarantees are already settled."

Use a small inline `Code` block showing `.primaryKey()` on a column and a one-line caption naming the three implicit guarantees. No need for AnnotatedCode here — single concept.

Tooltip candidates in this section: `B-tree` (Term — "Postgres's default index structure; a sorted tree, so ordered inserts are cheap and random inserts force page splits"). Define it here since the locality section leans on it.

### Surrogate or natural: the first fork

Teach axis 2 first because it's the universal default that applies before the exposed/internal question.

- **Surrogate** = a meaningless ID the database mints (UUID, bigint). **Natural** = a domain value that already identifies the thing (email, slug, ISO-3166 country code, ISBN).
- **The senior default is surrogate, everywhere user-facing.** The reason, stated as the rule the student keeps: domain values *change*. An email rotates, a slug gets renamed, a "permanent" external code gets reissued. A PK that changes cascades through every FK that points at it — a schema-wide rewrite triggered by a routine edit.
- **The natural-key carve-out is narrow:** only genuinely *immutable, externally-defined* identifiers — country codes (`'US'`), currency codes (`'USD'`), ISBNs. Even then, only when you'll never want to attach a renamable display layer. The test to leave the student with (state it as a quotable heuristic): **"would I be comfortable if this value changed and every row pointing at it had to change too?"** If the answer is anything but a confident yes, it's surrogate.
- **The composite-as-PK smell**, foreshadowing L8: `(orgId, slug)` as an *entity's* PK is a tenancy-modeling mistake — use a surrogate `id` plus a `unique(orgId, slug)` constraint (L7). Composite PKs belong on junction tables and almost nowhere else. Name it here in one sentence so the student doesn't over-reach for composites after meeting the mechanic later in this lesson.

Present this as prose with one short before/after `CodeVariants` is overkill — instead a single small table or two-line `Code` contrasting `slug` (mutable, bad PK) vs surrogate `id` + unique. Keep light; the depth is in the heuristic, not syntax.

### Why UUIDv4 is a trap and v7 isn't

This is the conceptual heart — the one place the lesson must build genuine intuition, not assert. Both are 16-byte UUIDs that look identical at a glance; the difference is *where new values land in the index*.

- **UUIDv4 is fully random.** Every insert targets a random spot in the B-tree, forcing page splits and scattering writes across the whole index. At small tables this is invisible; the cost is **write amplification that compounds with table size** — the bigger the table, the more the random insert thrashes. This is the trap: a choice that's free in development and expensive exactly when you can least afford to change it (a populated production table).
- **UUIDv7 prefixes a 48-bit millisecond timestamp.** New values sort *after* all earlier ones, so inserts append at the index's tail — the same locality a sequential `bigserial` gets. You keep the global-uniqueness and non-enumerability of a UUID and recover sequence-like insert performance.
- **Standards/version grounding (one sentence each, don't dwell):** RFC 9562 standardized UUIDv7 (May 2024); Postgres 18 (released Sept 2025) ships a native `uuidv7()` function — no extension, works on Neon (the chapter-036 host).
- Name **ULID/KSUID** in one clause as the pre-standard predecessors that solved the same problem — recognition only, not taught (scope rule from chapter outline).

**Diagram — UUID byte-layout comparison (HTML+CSS annotated illustration, in `<Figure>`).** Pedagogical goal: make "where does the timestamp live" and "where do inserts land" visible in one glance. Two stacked horizontal byte strips of equal width:
- **v4 strip:** segments all labeled "random", tinted one flat color; a caption row below shows three example v4 values with their leading bytes scattered (e.g. `f47ac10b…`, `9c3e…`, `2b6f…`) and a small note "inserts scatter across the index."
- **v7 strip:** the leading ~6 bytes tinted as a distinct "timestamp (ms)" segment, the trailing bytes a second "random" color; caption row shows three example v7 values minted seconds apart sharing a near-identical prefix (`0193b5a1…`, `0193b5a2…`, `0193b5a4…`) with a note "shared prefix → inserts append at the tail."
Use saturated mid-tones with white labels (theme-safe per html-css.md); split `column-gap`/`row-gap`; cap height well under 800px. The *contrast between the two caption rows* — scattered prefixes vs shared prefixes — is the whole lesson of the figure, so make those example values prominent. Apply the `margin: 0` reset to every inner element (prose-margin gotcha).

Optionally pair with a tiny second panel inside a `TabbedContent` showing a stylized B-tree where v4 writes hit random leaves (red scatter) and v7 writes hit the rightmost leaf (green column) — only if it reads cleanly at small height; if it risks clutter, the byte-layout figure alone carries the point. Author's judgment; the byte strips are the priority.

Tooltip candidates: `write amplification` (Term — "one logical insert causing many physical page writes because the new key lands mid-index and splits a page"); `RFC 9562` (Term — "the 2024 IETF spec that standardized UUID versions 6, 7, and 8").

### The three canonical shapes

The mechanics payoff. Present all three PK shapes the course ships, each with its "reach for it when." Use **`CodeVariants`** with three tabs (UUIDv7 / identity bigint / natural) — this is the canonical A/B/C-comparison use case, and each tab's prose carries the "reach when" trigger.

- **Tab 1 — UUIDv7 (the default for user-facing entities).** Canonical shape:
  ```ts
  id: uuid().primaryKey().default(sql`uuidv7()`)
  ```
  Prose: this is the course default — any entity whose ID appears in a URL, an API response, or a client payload. SQL-side `default(sql\`uuidv7()\`)` (not `$defaultFn`) so the default fires for migrations, seeds, and psql too, per L4's SQL-side preference. One parenthetical: teams not on Postgres 18 fall back to the app-side `id: uuid().primaryKey().$defaultFn(() => uuidv7())` (npm `uuidv7`); same logical result, app-only generation. Mention `sql` is imported from `drizzle-orm` (the student met the `sql` tag in L4's generated-columns work).
- **Tab 2 — `bigint generatedAlwaysAsIdentity` (the high-volume internal reach).** Canonical shape:
  ```ts
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()
  ```
  Prose: the modern SQL-standard replacement for legacy `bigserial`. Reach when *all* hold: high-volume internal table (event log, analytics rows, a pure junction nobody fetches by ID), no system-boundary exposure of the ID, no sharding on the roadmap. Why bigint over UUID here: 8 bytes vs 16, tighter B-tree, and these rows are never enumerated by an outsider so the leak/locality arguments don't apply. Note `mode: 'number'` is required (JS number, safe to 2^53) — naming it pre-empts the runtime "cannot read 'mode'" error and the "why not plain bigint" question. One clause: `bigserial` still works but `generatedAlwaysAsIdentity` is the shape to write in new code.
- **Tab 3 — natural key (the narrow carve-out).** Shape: a domain column carrying `.primaryKey()` directly, e.g.
  ```ts
  code: text().primaryKey() // ISO-3166, e.g. 'US' — immutable, externally defined
  ```
  Prose: only for immutable external identifiers. The example should be a lookup/reference table (countries, currencies) so the student sees the *kind* of table this is — small, static, externally-owned — not a user-facing entity.

Keep each tab's prose to the six-line ceiling. After the variants, one sentence tying back: the choice between tab 1 and tab 2 is axis 1 (exposed vs internal); tab 3 is the axis-2 escape hatch.

Tooltip candidates: `bigserial` (Term — "Postgres's legacy auto-incrementing 8-byte integer; superseded by the SQL-standard `GENERATED ALWAYS AS IDENTITY`"); `identity column` (Term — "a column whose values Postgres auto-generates from an internal sequence, per the SQL standard").

### The decision tree

The spine of the lesson, placed *after* the shapes so the student decides with the shapes in hand. Use **`StateMachineWalker`** (`kind="decision"`) — it forces the student through the *order* a senior asks the questions, one commit at a time, which is exactly the skill (the lesson lives in the order, per the walker's own guidance).

Walk topology (root → leaves), reusing the two-axis framing:
- **Q1 (root): "Does this row's ID ever leave the database — a URL, an API response, a client payload?"**
  - Yes → **Q2**
  - No, only the database joins on it → **Q3**
- **Q2: "Is the identifier an immutable value the outside world already owns (country code, ISBN)?"**
  - Yes → **Leaf: natural key** (`text().primaryKey()`; reason body: externally owned + immutable, the only time the domain value is safe as the key).
  - No, it's ours to mint → **Leaf: UUIDv7** (`uuid().primaryKey().default(sql\`uuidv7()\`)`; reason body: exposed but ours → surrogate that's non-enumerable *and* time-sortable; the day-one default for entities).
- **Q3: "High volume, internal-only, no sharding planned?"**
  - Yes → **Leaf: identity bigint** (`bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()`; reason body: nobody fetches by this ID, so spend the fewest bytes and the tightest index).
  - Not sure / might expose it later → **Leaf: UUIDv7 (default to it)** (reason body: when in doubt, UUIDv7 — exposure tends to creep in, and retrofitting a UUID onto an integer PK after launch is painful; the cost of an unnecessary UUID is low).

The "when in doubt, UUIDv7" leaf is deliberate senior guidance — it teaches that the default has gravity and `bigint identity` is the *opt-in* for a justified case, not a coin flip. Each leaf's `verdict` is the shape; the reason body (1–3 sentences) names the trigger. Do not wrap the walker in `<Figure>` (it's its own card).

### Composite primary keys, for junction tables only

Introduce the mechanic here because L6 (FKs) and L8 (junctions) both need it, but cap the depth — this lesson teaches the *syntax and the boundary*, L8 owns the full junction pattern.

- The shape, in `pgTable`'s third (callback) argument:
  ```ts
  (t) => [primaryKey({ columns: [t.invoiceId, t.tagId] })]
  ```
- What it does: declares a PK across two (or more) columns; the pair is unique-and-indexed together, same free guarantees as a single-column PK.
- **The boundary, stated as a hard rule:** composite PKs belong on junction tables and almost nowhere else. The pair *is* the row's identity — there's nothing else to mint. Re-cite the smell from the surrogate section: a composite PK on a first-class *entity* is a modeling mistake; reach for surrogate `id` + unique constraint instead.
- One-line cliff-hanger to L8: "the full two-FK junction shape — and when to promote it to a `id`-carrying entity — is Lesson 8."

Single `Code` block for the composite shape (no AnnotatedCode — one construct). Show it in the context of a minimal `invoiceTags` table so the columns named match L8's running example.

### Practice: pick the key for each table

Cap the lesson with active recall on the *decision*, since the decision is the lesson. Two-part close:

1. **`Buckets` exercise (decision drill).** Three buckets — `UUIDv7`, `identity bigint`, `natural key`. Items are table/column descriptions the student sorts:
   - UUIDv7 bucket: "an `invoices` row shown at `/invoices/:id`", "a `users` row returned in an API response", "an `organizations` row whose id is in every client payload".
   - identity bigint bucket: "an append-only `audit_logs` row nobody fetches by id", "a high-volume `analytics_events` row", "a pure `invoice_tags` junction row" (note: junction PK is *composite* — but each FK side is itself a `bigint`/`uuid` per its parent; keep this item phrased as "the internal counter on an events table" to avoid muddying it with the composite case, OR drop the junction item to keep the buckets clean — author's call, lean toward clean).
   - natural key bucket: "an ISO-3166 country code", "an ISO-4217 currency code", "a US state abbreviation".
   Use `twoCol` if it reads better. `instructions`: "Sort each table's id column into the primary-key strategy it should use." This drills axis-1 + axis-2 reasoning without syntax overhead.

2. **`DrizzleSchemaCoding` exercise (write the shapes).** Give a starter with two or three tables whose `id` columns are stubbed (bare `.primaryKey()` or a `TODO`), and have the student finalize each with the correct canonical shape. Suggested tables: `organizations` (UUIDv7 — user-facing), `auditLogs` (identity bigint — internal/high-volume), and optionally `countries` (natural `code` PK). `requirements` can verify `primaryKey: true` and column `type` (`uuid` / `bigint`) per the grader's prefix-match. **Grader caveat (from L3 continuity, must honor):** `DrizzleSchemaCoding`'s `ColumnRequirement` has *no* flag for the default *expression* — it can confirm `hasDefault` but not that the default is specifically `uuidv7()` vs `gen_random_uuid()`, and it doesn't distinguish identity columns. So pin the high-stakes choices with **SQL probes**: an INSERT into the UUIDv7 table that omits `id` and succeeds (proving the DB-side default fires) and a `SELECT` asserting the generated value is a v7 (first hex digit of the version nibble is `7`) — or, more robustly, two timed inserts whose returned ids sort in insertion order (proving time-ordering). For the identity table, an INSERT omitting `id` that succeeds, and an INSERT *supplying* `id` that's rejected (proving `GENERATED ALWAYS`). Spell the probe intent out for the exercise-builder agent; the schema-shape grader alone can't catch a v4/v7 mix-up. The sandbox passes explicit snake_case column-name strings (no `casing` client in the editor scope) so probe SQL lines up — same convention L3/L4 used.

Place the Buckets drill first (cheap, reinforces the decision), DrizzleSchemaCoding second (writes the shapes, harder). Both inline in this section, not appended at lesson end.

### External resources (optional)

One or two `ExternalResource`/`LinkCard`s if a high-quality, current source exists: the Neon "PostgreSQL 18 UUIDv7 support" explainer (confirmed current, good locality visuals) and/or the Postgres 18 release note for `uuidv7()`. A `VideoCallout` is *not* needed — the concept is well-served by the byte-layout figure and the decision tree; only add one if a genuinely strong, recent UUIDv7-vs-v4 explainer surfaces. Resourcer agent's call; do not force it.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `.primaryKey()` as a column modifier (met since L2) — this lesson finalizes what fills the column but assumes the modifier itself is known.
- `uuid()` and `bigint({ mode })` builders and the `sql` tagged template (L3 + L4) — used, not re-introduced.
- `.default()` (SQL-side) vs `.$defaultFn()` (app-side) and the "prefer SQL-side" principle (L4) — *cited* as the reason native `uuidv7()` wins; not re-explained.
- `casing: 'snake_case'` on the client (L2) — assumed; bare builders with no positional name args, except the exercise sandboxes (which pass explicit name strings, per L3/L4 convention).

**Owned by other lessons — name and defer, do not teach:**
- **Foreign keys, `.references()`, `onDelete`** → L6. This lesson may *say* "every FK points at one PK" but writes no `.references()`.
- **`UNIQUE` and `CHECK` constraints** (including the surrogate-`id`-plus-`unique` alternative to a composite-entity PK) → L7. Name the pattern; the `unique()` syntax is L7's.
- **Junction tables at depth** (two FKs, cascade on both, promotion to entity-with-metadata) → L8. This lesson teaches only the `primaryKey({ columns })` *mechanic* and the "junctions only" boundary.
- **`$inferSelect`/`$inferInsert`** behavior with generated/identity columns → L10. Do not preview inference here.
- **The `db.transaction` shape for monotonic ID assignment** → ch 039 L4.
- **Index strategy / FK-column indexing** → ch 039 L1. The "PK is indexed for free" fact is in-scope; broader indexing is not.
- **Drizzle Kit migration generation** (how `default(sql\`uuidv7()\`)` lands in a migration) → ch 040. Mention SQL-side defaults "apply to migrations" as a *benefit*; don't show migration output.

**Explicitly out of scope (recognition-only or cut):**
- **Snowflake / KSUID / ULID** — one-clause name-drop for recognition, never taught (chapter-outline rule).
- **UUIDv1/v6, `gen_random_uuid()` internals** — `gen_random_uuid()`/`.defaultRandom()` named once as the v4 generator (the foil); no deep dive.
- **Sharding mechanics** — named as a tiebreaker ("no sharding on the roadmap" gates `bigint identity`); not explained.
- **PK type changes / migrating an existing table's PK** — out; the lesson's whole thesis is "choose right from day one so you never do this."

---

## Code conventions alignment

- **PK shapes** follow `Code conventions.md` §Data layer with the one **deliberate, reasoned divergence** documented in Lesson framing: native SQL-side `default(sql\`uuidv7()\`)` is canonical (Postgres 18 / Neon), app-side `$defaultFn(() => uuidv7())` is the named fallback — *not* the literal conventions ordering. Downstream agents: do not normalize back to `$defaultFn` as primary.
- `bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()` and natural `text().primaryKey()` match conventions verbatim.
- Bare builders, object-option form, no positional SQL-name args (conventions §casing-on-the-client) — except exercise sandboxes, which pass explicit snake_case names because no `casing` client is in editor scope (matches L3/L4 staging).
- `sql` tag imported from `drizzle-orm`; never raw-string SQL except this fixed-identifier default.
