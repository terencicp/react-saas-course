# pgTable and the snake_case bridge

- **Title (h1):** The smallest table: `pgTable` and the snake_case bridge
- **Sidebar label:** pgTable and snake_case

---

## Lesson framing

This is the chapter's first **mechanics** lesson. Lesson 1 installed the principle (`db/schema.ts` is the source of truth — the root of a derivation tree); this lesson opens that empty file and writes the first table into it. The senior question it answers: *given an empty `db/schema.ts`, what is the smallest valid table, and what casing convention bridges TS and Postgres?* Everything past that — types, modifiers, keys, constraints, relations — is owned by later lessons and must stay foreshadowed-not-taught here.

**The two load-bearing ideas.** (1) `pgTable(name, columns)` — the call shape, and the fact that the **exported `const` is the unit the rest of the system imports** (queries, relations, Drizzle Kit, drizzle-zod all read it). (2) The **camelCase ↔ snake_case impedance mismatch** between TS and SQL, and how `casing: 'snake_case'` set once on the `db` client resolves it so the student writes `createdAt` in TS and Postgres stores `created_at` — with no per-column string to maintain. Idea (2) is the lesson's centerpiece and its title; it is the moment that most rewards a diagram, because "two naming worlds, one declaration bridging them" is inherently visual.

**Why this framing.** The student has never written Drizzle. The temptation a beginner falls into — and the thing this lesson must inoculate against — is typing snake_case strings into every column builder (`text('first_name')`), which works but scatters a convention across hundreds of columns and silently drifts the day one table forgets. The lesson's job is to make the *bridge* the default reflex so the student never reaches for the manual string. Frame `casing` as the senior move that turns a per-column chore into a one-line policy.

**Mental model the student leaves with.** "A `pgTable` is a TS object whose keys are my code's column names and whose values are column builders; I export it as a `const`, and a single `casing: 'snake_case'` policy on the client translates every key to its SQL spelling on the way to Postgres and back. The file I put these in — `db/schema.ts` — is the only thing the migration generator looks at, so a table that isn't exported doesn't exist." By the end the student can write a minimal two-column table from a blank file, read it as TS-keys-to-SQL-columns, and explain why mixing manual SQL-name strings with the `casing` policy is a drift trap.

**Cognitive-load staging.** Start from a four-line table with two columns and zero modifiers — the smallest thing that compiles. Only *after* the student can read that do we introduce the casing problem (show what snake_case-in-strings looks like, then collapse it to the policy). Modifiers (`.notNull()`, `.primaryKey()`, `.references()`), specific types beyond `text`, and the third-argument constraints callback are all named at their call site and explicitly deferred — the student sees the shape exists without being taught it. The `db/index.ts` client wiring (`drizzle({ casing, logger })`) is **foreshadowed, not built** — Chapter 040 owns the setup walkthrough; here we show the one config line in isolation so the casing policy has a home, with a clear "you wire this up later" signpost.

**Version note for downstream agents (deliberate, verified June 2026).** Teach the **stable** Drizzle shape: `casing: 'snake_case'` as an option on the `drizzle({...})` client, and the modern key-as-column-name table form `pgTable('users', { firstName: text() })` (no SQL-name string when `casing` is set). Drizzle **1.0 is in beta and explicitly breaking** ("something will definitely break"), and it reworks casing (moving it toward a table-builder/`pgTableCreator` form) — do **not** teach the 1.0 beta surface. Keep one forward-looking parenthetical (≤1 sentence) acknowledging 1.0 will move this config, mirroring the Code-conventions doc's parenthetical, but the primary wording is the stable client-side option. This intentionally aligns with the chapter outline and Code conventions over Lesson 1's "forward-looking 1.0" continuity note, because that note was about the `drizzle-orm/zod` subpath and `$inferSelect` (which we honor), not about destabilizing the casing surface onto a beta API.

**Tone.** Adult, terse, decisions-first per the pedagogical guidelines. No "what is a table." The student knows SQL tables from Chapter 036 (Postgres on Neon) — this lesson is about *declaring* one in TS, not about what a table is.

---

## Lesson sections

### Introduction (no header)

Open by handing the student the empty file Lesson 1 promised. Callback: *last lesson named `db/schema.ts` the root of the derivation tree but wrote no syntax into it; this lesson writes the first table.* State the concrete end-state: by the end you can open a blank `db/schema.ts` and write a table Postgres will accept, and you'll understand the casing bridge that lets you write TS-natural names while Postgres gets SQL-natural ones. Motivate with the beginner's hidden fork: you can name columns the SQL way in every builder, or you can set one policy — and the second is the only one that scales past ten tables. Keep it to two short paragraphs. Continue the chapter's running domain: `organizations` and `invoices` (the `amountDue` money column from Lesson 1).

### Where the schema lives: the `db/` folder

**Goal:** orient the student to the folder before the file, so the table has a home and the student sees the three files that will fill up across the chapter.

- Use a Starlight **`<FileTree>`** (the diagrams index's top pick for file/dependency trees) showing the `db/` folder at project root with three files, each with a dimmed inline comment:
  - `db/schema.ts` — **bold/highlighted** (the focus) — all tables; the source of truth.
  - `db/relations.ts` — the Relations v2 graph (built lesson 9 of this chapter).
  - `db/index.ts` — the `db` client (wired in Chapter 040 setup).
- Prose: explain **why `db/` sits at project root, not inside a feature folder** — the schema is shared by every feature, so it can't live under any one of them. Tie this back to Principle #1 (co-locate by feature) that the student met earlier: the schema is the deliberate exception because it's cross-cutting. One sentence.
- State the rule that pays off in the next section and in migrations: **`db/schema.ts` is the only file the migration generator reads** (Drizzle Kit, Chapter 040) — anything not exported from it is invisible to migrations. Plant it here; reinforce it in the exports-flow section.
- Keep the relations/index files as one-line signposts; do **not** explain their contents. They're shown so the student has a map, not so they learn them now.

**Reasoning:** showing the folder first prevents the student from wondering "where does this file go" mid-syntax. The FileTree is a low-effort, high-orientation visual aid — exactly the kind the diagrams guidance says counts as a worthwhile diagram.

### `pgTable`: the smallest table that runs

**Goal:** the student reads and can reproduce a minimal table. This is the syntactic floor; build it before any complexity.

- Introduce the signature in prose: **`pgTable(name, columns)`**. `name` is the SQL table name — snake_case, plural (state the naming convention here: plural snake_case, `organizations`, and the exported `const` matches the table). `columns` is an object literal whose **keys are the TS property names your code uses** and whose **values are column builders**.
- Show the minimal `organizations` table as a single **`Code`** block (simple block — it's short and the focus is the whole shape, not parts):

  ```ts
  import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

  export const organizations = pgTable('organizations', {
    id: uuid().primaryKey(),
    name: text().notNull(),
  });
  ```

  - Keep it to `id` + `name` — the smallest thing that's a believable table. Use `uuid().primaryKey()` and `text().notNull()` so the shape is honest (a real table has a PK and a non-null name), but **explicitly defer** the *why* of each: a one-line "`.primaryKey()`, `.notNull()`, and the choice of `uuid` are decisions later lessons own — for now read them as `this column is the key` and `this column can't be empty`." This honors the chapter outline's "minimal table" while not teaching modifiers/types/keys out of turn. (Per code conventions the real PK shape adds a UUIDv7 default; that's lesson 5's call — keep the bare `.primaryKey()` here and flag the divergence in one clause so downstream agents know it's deliberate staging.)
- The single most important sentence of the section: **the exported `const organizations` is the unit everything else imports** — your queries (next chapter), your relations file, the migration generator, the Zod generator. The export is not a formality; it's the handle. Connect forward to the exports-flow section.
- Drive attention with an **`AnnotatedCode`** walkthrough over this same block (the component is built for "focus the student on specific parts of one block, one at a time"). Steps, `color="blue"` as the default:
  1. `{1}` — the import line; column builders come from `drizzle-orm/pg-core`, one named import per type you use.
  2. `"pgTable"` + the string `'organizations'` — the call and its first argument, the SQL table name.
  3. `"export const organizations"` — the exported handle; *this name is what the rest of the codebase imports*.
  4. The `id:` line — a key (TS name) paired with a column builder; `.primaryKey()` named, deferred.
  5. The `name:` line — same pattern; `.notNull()` named, deferred. Emphasize the key→builder pairing is the repeating unit of every table.
- Keep prose between steps minimal; the AnnotatedCode carries the dissection.

**Reasoning:** AnnotatedCode here (not CodeTooltips) because the teaching is a *sequence* — read the import, then the call, then the export, then the column pattern — which is precisely the stepped-walkthrough use case. The plain `Code` block first gives the student the whole gestalt before the dissection.

### Two naming worlds: camelCase in TS, snake_case in SQL

**Goal:** name the impedance mismatch explicitly and make the student *feel* it before offering the fix. This is the conceptual heart of the lesson.

- State the two conventions as a fact of the ecosystem, not a preference:
  - **TS/JS convention:** `camelCase` for properties — `createdAt`, `organizationId`, `firstName`. This is what every linter, every React prop, every object the student has written so far uses.
  - **SQL/Postgres convention:** `snake_case` for identifiers — `created_at`, `organization_id`, `first_name`. Unquoted identifiers in Postgres fold to lowercase, so `createdAt` becomes a footgun (`createdat`); snake_case is the portable, idiomatic choice and what every SQL tool, DBA, and `psql` session expects.
- A small **diagram** to anchor the mismatch. Use a **hand-coded SVG or HTML+CSS annotated illustration** inside a `<Figure>` (the diagrams index lists annotated illustration → HTML+CSS / SVG; this is a "picture of a specific thing," not a graph). Shape: two labeled lanes side by side, **"Your TypeScript"** (left) and **"Your Postgres"** (right), three rows bridging them with a short connector arrow each:
  - `createdAt` ↔ `created_at`
  - `organizationId` ↔ `organization_id`
  - `amountDue` ↔ `amount_due`
  - Center the connector arrows on a single highlighted label: **`casing: 'snake_case'`** — the one declaration that does every row's translation. Caption: *one config line translates every camelCase key to its snake_case column, both directions — reads and writes.*
  - Keep it horizontal and short (well under the 800px cap). Pedagogical goal: convert an abstract "naming convention" into a literal two-column picture so the student sees `casing` as a *bridge*, not a setting.
- Now show the **problem the bridge solves** with a **`CodeVariants`** before/after (the component's explicit before/after use case). Two variants, `maxLines` modest:
  - **Variant "Manual strings (drifts)":** every builder carries its SQL name — `text('first_name')`, `uuid('organization_id')`, `timestamp('created_at')`. Prose (≤6 lines, lead with the verdict): *works, but you now maintain a snake_case string on every column across every table; the day one table types `text('firstname')` or forgets the string entirely, that table silently drifts from the convention and nothing flags it.* Use a `del`/red mark hint on the inline strings to signal "this is the cost."
  - **Variant "One policy (`casing`)":** the same columns as bare builders — `text()`, `uuid()`, `timestamp()` — with the SQL name inferred. Prose: *set `casing: 'snake_case'` once on the client and every key is translated automatically; the column names live in one decision, not scattered across hundreds of builders.* Green `ins` mark hint on the (absent-string) builders / the config line.
- Then show **where the policy is set** — a tiny isolated **`Code`** block, clearly labeled as foreshadowing:

  ```ts
  // db/index.ts — you'll wire this up properly in a later chapter
  export const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  ```

  - One sentence: this is set **once, on the client, not per table** — that's the whole point; the table file stays clean. Explicitly signpost: *the `client`/`schema`/`pool` wiring is Chapter 040's job; the load-bearing token here is `casing: 'snake_case'`.* Do not explain pooling or the connection string.
- Close with the rule that ties the two worlds together for the rest of the chapter: **queries read the TS name, Postgres sees the SQL name.** `db.select().from(organizations)` referencing `organizations.createdAt` in TS emits `created_at` in the SQL. The student writes one world and Drizzle speaks the other.

**Reasoning:** the felt-problem-then-fix order is the cognitive-load discipline from the guidelines — show the pain of manual strings, *then* collapse it. CodeVariants is the right component because this is a genuine A/B of the same columns. The SVG/HTML bridge diagram earns its place by making the central metaphor literal.

### The per-column escape hatch — and the trap of mixing it

**Goal:** teach that the manual SQL-name string still exists for the rare override, and that *mixing* it with the policy is the lesson's headline watch-out.

- State it plainly: the first argument to a column builder (`text('legacy_name')`) is still available as a **deliberate per-column override** — for when one column must map to a name the `casing` policy wouldn't produce (a legacy table you don't control, a column whose SQL name predates your convention). It's an escape hatch, not the default.
- The watch-out, given its own teaching moment because the chapter outline flags it as the silent-drift trap: **mixing the SQL-name argument with the `casing` config across a schema is how tables drift apart.** If most columns rely on `casing` but a few carry hand-written strings, you now have two sources of truth for column names; a typo in one string, or a half-migrated table, diverges silently. Rule: **pick one policy per schema.** `casing` everywhere, with the explicit string reserved for the genuinely exceptional column and commented as to *why*.
- Render the watch-out as an **`<Aside type="caution">`** so it's set apart from prose but lives inside the section that teaches the concept it qualifies (per the outline rule: watch-outs belong with their concept, never bundled).

**Reasoning:** the escape hatch must be taught (it's real and the student will see it), but immediately fenced with the mixing trap so the student leaves with "policy by default, string as rare exception" rather than treating the string as a coin-flip alternative.

### A second column you'll write on every table: `logger` for seeing the SQL

**Goal:** introduce the `logger: true` client option as the tool that makes the casing bridge *observable* — the student can confirm `createdAt` really emits `created_at`.

- Motivate it as the natural next question: *how do I know the bridge is working — that my TS `createdAt` actually becomes `created_at` in the SQL Postgres runs?* Answer: turn on the logger.
- Show it as a one-line addition to the same foreshadowed client config (a small **`Code`** block or a one-line `ins` on the prior block):

  ```ts
  export const db = drizzle({ client: pool, schema, casing: 'snake_case', logger: true });
  ```

- Explain: `logger: true` prints every SQL statement Drizzle emits to stdout. Pedagogically, it's the fastest way to *see* the casing translation — write a query against `organizations.createdAt`, watch `created_at` appear in the logged SQL.
- Frame it as **dev-only, off by default**, and forward-reference its real payoff without teaching it: it's the same flag that makes **N+1 query diagnosis** and the **`EXPLAIN`-copy reflex** possible in Chapter 039. One sentence each, named not taught.

**Reasoning:** `logger` is in this lesson's scope per the chapter outline, and it pairs perfectly with casing as "the tool that lets you verify the bridge." Teaching it as an observability companion to casing (rather than a standalone setting) gives it a pedagogical reason to be here now.

### Where the file's exports flow

**Goal:** close the loop from Lesson 1 — make concrete that the exported table is the root every downstream tool reads, reinforcing why "export it" matters and why unexported tables don't exist.

- A small **diagram**: the exported `db/schema.ts` table fanning out to its consumers. Use **`<ArrowDiagram>` inside `<Figure>`** (box-and-arrow, custom-HTML boxes — the diagrams index's annotated-illustration arrow option) or a Mermaid `flowchart LR` (decision/flow shape) — author's call; keep it horizontal, left source → right consumers. This deliberately **rhymes with Lesson 1's derivation-tree diagram** (same left-source-right-branches layout, color-match the root box) so the student reads it as the same picture, now grounded in a concrete file.
  - Root (left): **`db/schema.ts`** — the exported tables.
  - Branches (right), each arrow labeled with what it pulls:
    - **`db/relations.ts`** — imports the tables to declare the traversal graph (lesson 9).
    - **`db/index.ts`** — re-exports them as the `schema` namespace for the `db` client (Chapter 040).
    - **Drizzle Kit** — reads the file to generate migrations (Chapter 040). Label: *input for migrations.*
    - **drizzle-zod** — reads the same exports to generate validators (Chapter 042).
  - Caption: *one exported file, every tool downstream reads it — which is why a table you forget to export doesn't exist for any of them.*
- Prose: restate the migration consequence as the load-bearing takeaway — **Drizzle Kit treats `db/schema.ts` as its input; an unexported table is invisible to migrations** (a real, confusable failure: the table compiles, the query can't find it, the migration never creates it). This is the section's keeper rule.
- One sentence connecting back to Principle #2: this fan-out *is* the derivation tree from Lesson 1, now with a real file at its root.

**Reasoning:** this section pays off Lesson 1's promise with concrete plumbing and reinforces the export rule at the exact moment it's most motivated. The diagram rhyme is intentional continuity — the student should feel the abstract Lesson-1 picture snap onto real files.

### Schema namespaces: named and dropped

**Goal:** acknowledge `pgSchema` exists so the student isn't surprised by it elsewhere, then close the door — the course pins everything to `public`.

- One short paragraph: Postgres has a `SCHEMA` qualifier (a namespace inside a database, e.g. `marketing.events`), and Drizzle exposes it as `pgSchema('marketing')` for multi-schema setups. **The course keeps every table in the default `public` schema**, so you'll use `pgTable`, never `pgSchema`. Named for recognition only.
- No diagram, no code, no exercise. This is a recognition signpost, kept to a few sentences so it doesn't inflate cognitive load. Use a **`<Term>`** on "schema" here if the namespace sense risks colliding with the file-named-schema sense the chapter uses everywhere else (disambiguate: *here "schema" means the Postgres namespace, not your `db/schema.ts` file*).

**Reasoning:** the chapter outline explicitly wants this "named, dropped." Keeping it as a terminal recognition paragraph (not a full section with scaffolding) respects the minimum-viable-stack filter while still inoculating against confusion.

### Practice: write the smallest table (exercise)

**Goal:** the student writes a `pgTable` from near-scratch and confirms the casing bridge fires — active recall of the lesson's two load-bearing ideas.

- Use **`DrizzleSchemaCoding`** (the schema-design live-coding component — student writes the schema, grader walks tables/columns/flags via `getTableConfig`, optional SQL probes verify constraints fire). This is the ideal fit: the lesson *is* schema declaration, and a guided graded exercise beats a sandbox per the guidelines.
- **Starter:** an `organizations` table already written (mirrors the lesson), plus a stubbed `invoices` table the student completes — a comment block where they add the columns. Keep it to columns this lesson has earned: an `id` (uuid, primary key), a `name`/`amountDue`-style column, and a `createdAt`-style timestamp **whose whole point is to exercise casing** (the student writes `createdAt` as the key, the grader/probe confirms the SQL column is `created_at`).
- **`requirements`:** assert the `invoices` table exists with the expected columns by their **SQL (snake_case) names** — `created_at`, `organization_id` — and the right flags (`notNull`, `primaryKey`). This makes the grader itself the proof that the casing bridge maps `createdAt` → `created_at`. (Note for the building agent: `DrizzleSchemaCoding` emits DDL from the schema; ensure the exercise harness applies the `casing: 'snake_case'` policy so the requirement column names match — if the harness can't set client-side casing, fall back to having the student write the keys and assert via a probe `INSERT ... (created_at) ...` that must succeed, which proves the column exists under its snake_case name.)
- **`instructions`:** one paragraph — "complete the `invoices` table: add an id, a money column, and a created-at timestamp, writing camelCase keys; the grader checks the emitted SQL uses snake_case column names."
- **Goal/grading criteria:** table present; columns present under their snake_case SQL names; `notNull`/`primaryKey` flags set; (optional probe) an insert naming `created_at` succeeds. Each ✗ names the missing piece.

**Reasoning:** this exercise checks both ideas at once — the `pgTable` shape *and* the casing translation — and its grading-on-snake_case-names is itself a demonstration that the bridge works, which is more convincing than prose. Guided + criteria-driven, per the exercise-selection guidance.

### Quick check: which name goes where (exercise)

**Goal:** a fast, low-friction recall on the camelCase/snake_case split and the export rule, for students who want a non-coding checkpoint.

- Use **`Buckets`** (classification drag-and-drop). Two buckets: **"What you write in `db/schema.ts` (TS key)"** vs **"What Postgres stores (SQL column)"**. Chips: `createdAt` / `created_at`, `organizationId` / `organization_id`, `amountDue` / `amount_due`. Student sorts each spelling to the world it belongs in.
- Optionally fold in one or two **`TrueFalse`** or a single **`MultipleChoice`** on the export rule ("A table defined but not exported from `db/schema.ts` — what does the migration generator do with it?" → it never sees it). Keep total exercise load light; the `DrizzleSchemaCoding` above is the main assessment.

**Reasoning:** a 30-second sorting drill cements the central distinction without code, complementing the heavier coding exercise. Optional and short to respect cognitive load.

### Closing

One tight paragraph mirroring Lesson 1's closing cadence: you opened the empty `db/schema.ts`, wrote the smallest table — an exported `const` from `pgTable(name, columns)` — and set one `casing: 'snake_case'` policy that bridges your camelCase TS keys to Postgres's snake_case columns, so you never hand-maintain a SQL-name string. The exported table is the handle every downstream tool reads. **Next**, you decide *which Postgres type* each column should be — the durable 2026 type subset (cliff-hanger into lesson 3).

### External resources

Keep to two **`<ExternalResource>`** cards (mechanics lesson, not a reference dump):

1. Drizzle ORM docs — **Schema declaration** page (`pgTable`, the minimal table, the `casing` option). The canonical reference for this lesson's syntax.
2. Drizzle ORM docs — the **`casing` / column-name inference** section (or the client-config page documenting `casing` and `logger`). Where the student confirms the policy and the logger flag.

---

## Tooltip terms (`<Term>` / `CodeTooltips`)

Be strategic — only terms that support this lesson's goals and that the student may not hold yet at this point in the course:

- **`<Term>` in prose:**
  - *impedance mismatch* — if used: "the friction when two systems use different conventions for the same thing (here, TS camelCase vs SQL snake_case)." (Optional — only if the phrase is used; it's evocative but may read as jargon.)
  - *snake_case* / *camelCase* — likely already familiar; tooltip only if the lesson's audience-of-career-changers warrants. Author's call; lean toward not over-defining.
  - *schema* (in the "named and dropped" section) — disambiguate the Postgres-namespace sense from the `db/schema.ts`-file sense, as noted in that section. This one is worth it.
  - *Drizzle Kit* — "Drizzle's migration generator; reads `db/schema.ts` and emits SQL migrations. Set up in a later chapter." (Named repeatedly as the consumer of the file; a one-line tooltip keeps flow.)
- **`CodeTooltips` inside the minimal-table block (optional, light):** `pgTable` → "declares a Postgres table; first arg is the SQL table name, second is the column map"; `text()` → "a text-column builder from `drizzle-orm/pg-core`"; the bare `uuid()` → "a uuid-column builder; the SQL column name is inferred from the key via `casing`." Keep to ≤3 if used; AnnotatedCode already carries the dissection, so prefer not to double up — use CodeTooltips only on the `CodeVariants` blocks if the inline strings need a quick gloss.

---

## Scope

**Prerequisites to redefine *briefly* (one clause each, not re-teach):**
- A Postgres table / columns / NOT NULL / primary key exist as SQL concepts (Chapter 036, Postgres on Neon) — assume known; this lesson declares them in TS, it does not teach what they are.
- `db/schema.ts` as the source of truth / derivation-tree root, and the `$inferSelect`/`$inferInsert` names (Lesson 1) — reference, don't re-explain; their *mechanics* are lesson 10.
- camelCase as the TS property convention — the student has written it for chapters; state it as fact.

**This lesson does NOT cover (owned elsewhere — keep these foreshadowed-not-taught):**
- **Specific Postgres data types and the "reach for it when" rule** (`text` vs `numeric` vs `timestamptz` vs `jsonb` vs `pgEnum` vs arrays) — **lesson 3 of this chapter.** Here, use only `text`/`uuid`/`timestamp` illustratively, no type-selection reasoning.
- **Column modifiers in depth** — `.notNull()`, `.default()`/`.defaultNow()`/`.$defaultFn()`, generated columns, the reusable-columns pattern — **lesson 4.** Name `.notNull()` at the call site; don't teach nullability-as-default.
- **Primary keys** — the UUIDv7 vs `bigint identity` decision, `.primaryKey()`'s free NOT NULL/UNIQUE/INDEX, the UUIDv7 default — **lesson 5.** Use bare `.primaryKey()` as a placeholder; the production UUIDv7-default shape is lesson 5's (note the deliberate staging divergence from code conventions).
- **Foreign keys** — `.references()`, `onDelete` — **lesson 6.** May appear only as a named arrow in the exports/relations diagram, never as taught syntax.
- **UNIQUE / CHECK constraints and the third-argument constraints callback** (`(t) => [...]`) — **lesson 7** (and the array-callback shape generally). Mention the third argument exists when introducing the signature, defer its contents entirely.
- **Junction tables / composite PKs** — **lesson 8.**
- **Relations v2 / `defineRelations` / `db/relations.ts` contents** — **lesson 9.** The file is shown in the FileTree and as an export consumer; its API is not taught.
- **`$inferSelect` / `$inferInsert` mechanics** — **lesson 10.**
- **The `db` client wiring, pooling, connection string, full `drizzle({...})` setup** — **Chapter 040 setup.** Show only the isolated `casing`/`logger` config line as foreshadowing; do not teach `client`/`pool`/`schema` wiring.
- **Drizzle Kit migration generation** — **lesson 1 of Chapter 040.** Named as the file's consumer; the generate/migrate flow is not taught.
- **drizzle-zod / schema-to-Zod** — **lesson 8 of Chapter 042.** Named as an export consumer only.
- **`logger`'s real payoff (N+1 diagnosis, EXPLAIN)** — **Chapter 039.** One-sentence forward reference, not taught.
- **Drizzle 1.0 beta casing/`pgTableCreator` surface** — out of scope by version policy; one parenthetical acknowledging the future move, no teaching of the beta API.

---

## Code-convention alignment notes (for downstream agents)

- **Single quotes, 2-space indent, semicolons, trailing commas** per Biome config — all code blocks.
- **Drizzle table naming:** plural for the exported const matching the SQL name (`organizations`, `invoices`); SQL is snake_case via `casing: 'snake_case'` set on the client — this lesson teaches exactly that conventions rule, so align tightly.
- **`import type`** not needed here (no type-only imports in the minimal examples).
- **Deliberate, flagged divergences** (note so downstream agents don't "fix" them): (1) bare `.primaryKey()` without the UUIDv7 `$defaultFn`/`.default(sql\`uuidv7()\`)` — code conventions specify the UUIDv7 default, but that's lesson 5's teaching; staging it out keeps this lesson's floor minimal. (2) the `db/index.ts` client snippet is intentionally partial (no env validation, no `dbUnpooled`) because Chapter 040 owns the real wiring — show only `casing`/`logger`.
- **Stable Drizzle surface, not 1.0 beta** — see the framing's version note. `casing: 'snake_case'` on the `drizzle({...})` client; key-as-column-name table form.
