# Deterministic seeding with drizzle-seed

- Title: `Deterministic seeding with drizzle-seed`
- Sidebar label: `Seeding with drizzle-seed`

## Lesson framing

Closes Unit 5. The senior question: a fresh dev branch or a CI test DB — how does it get enough realistic, repeatable data to render list pages, paginate, and exercise edge cases, **without hand-writing `INSERT`s**? Answer: `drizzle-seed`, the schema-aware, deterministic, FK-resolving seeder Drizzle ships.

Mental model the student must leave with: **the seed script is a function of (schema, seed number) → database state.** Same inputs, same rows, every run, every machine. Two reflexes hang off that: (1) the script is `reset` + `seed` wrapped together so it's idempotent — re-runnable to a clean baseline; (2) the seed number is pinned, varied only to explore shapes.

Connect to prior knowledge aggressively — this lesson is almost entirely a payoff of Ch037–039. The seeder reads the **same `db/schema.ts`** (Principle #2, Ch037), resolves `references()` / `onDelete` (Ch037 L6) into insertion order, and fills `pgEnum` / `numeric` / `timestamptz` columns (Ch037 L3) with type-appropriate values. The student already wrote `INSERT`s by hand in Ch038 L1 — frame the seeder as the bulk, FK-aware version of that, and the "missing-`where` on a mutation" footgun (Ch038 L1) as the cousin of the `reset`/`TRUNCATE CASCADE` footgun here.

Teaching stance: **decisions before syntax.** The generator catalog is reference material, not the lesson — do not enumerate all 35 generators in prose. Teach the *call shape*, the *determinism guarantee*, the *reset reflex*, the *FK model*, and 6–8 generators that carry the worked example; point to the docs for the rest. Lead the section on distributions with *why* (a uniformly-random status column makes a flat, fake-looking demo) before the `valuesFromArray` weighting syntax.

Cognitive-load order: minimal call → default behavior → refine (counts, columns, distributions) → FK fanout with `with` → determinism → reset/idempotency → the `db:seed` script → boundaries (tests, what it seeds badly, prod). Build the worked example incrementally across these sections rather than dropping a 40-line script at the end.

Shortest lesson in the chapter (35–45 min). Load-bearing for the Ch041 project (the two-org, 50+-invoice seed is a deliverable) and every integration test from Unit 18 on.

This lesson is **CLI/filesystem-shaped** (a `tsx` script against a real Postgres). PGlite live-coding widgets can't run `drizzle-seed`'s reset/insert pipeline against a schema bag the way a real script does, so do **not** attempt a `DrizzleCoding` widget for the seed call itself. Use static code blocks + a config-completion `Dropdowns` drill + a `Sequence` ordering drill instead. Anchor table stays `invoices` (continued from L1/L2), with `organizations` as the parent and `lineItems` as the child — a three-level FK chain that makes `with` and topological ordering concrete.

### Fact-check corrections the writer MUST apply (verified June 2026)

The chapter-outline draft predates the current API. Override it on these points:

- **No standalone `f.weightedRandom(...)` generator exists.** Weighting is built into `valuesFromArray`: `f.valuesFromArray({ values: [{ weight: 0.6, values: ['paid'] }, { weight: 0.4, values: ['pending', 'overdue'] }] })`. Write it this way; do not use the outline's `f.weightedRandom` shape.
- **Generators are function calls, not bare properties.** `f.firstName()`, `f.email()`, `f.companyName()`, `f.int()`, `f.number()`, `f.boolean()`, `f.date()`, `f.timestamp()`, `f.valuesFromArray()`, `f.default()`. The outline's `f.firstName` / `f.country` (no parens) is wrong.
- **`f.email()` and `f.phoneNumber()` are unique by default.** So the "emails collide" watch-out applies to `valuesFromArray` (and `f.string()`), not to `f.email()`. For non-unique generators that must not collide, pass `isUnique: true`.
- **`f.uuid()` generates v4.** The project's PKs are UUIDv7 via `.$defaultFn(() => uuidv7())` (Ch037 L5 + conventions). For those PK columns, let the column default fill the id (don't override with `f.uuid()`), or the time-ordering property is lost — name this.
- **`version` option, current latest is `'2'` (LTS).** `seed(db, schema, { seed: 1, version: '2' })`. Pin it so a library upgrade can't silently change generator output. Mention as the senior reflex; the bare `{ seed: 1 }` is fine for the first teaching example. NB: the `version` *option* (`'2'`, the generator-logic version) is **not** the npm package version — `drizzle-seed` itself is stable at `0.3.x` (`drizzle-seed@0.3.1`, requires `drizzle-orm@0.36.4+`). Don't conflate the two; don't print a package version in lesson prose unless wiring `pnpm add -D`.
- **`count` is also a global `seed()` option** (`seed(db, schema, { seed: 1, count: 50 })`), overridable per-table in `.refine`. Default is 10.

## Lesson sections

### Introduction (no header)

Warm, brief, 2–3 short paragraphs. Open on the concrete pain: you've shipped the schema (Ch037) and the queries (Ch038–039), you run the app against a fresh Neon dev branch — and every list page is empty. You could hand-write `INSERT`s, but you need 50 invoices across 2 orgs with line items, realistic statuses, dates spread over months — and you need the *same* data tomorrow when you re-run, and your teammate needs *your* data to reproduce a bug. State the goal: by the end you'll write one re-runnable `db:seed` script that fills the dev/test DB deterministically. Name `drizzle-seed` as the tool and the three properties that make it the senior reach — schema-aware, deterministic, FK-resolving. No code yet.

### A schema-aware seeder, named

What `drizzle-seed` *is* and why it beats the alternatives — keep it to the decision, ~3 short paragraphs, no code.

- A `devDependencies` package that reads **the same `db/schema.ts`** and generates fake data shaped to each column's type and constraints. Tie explicitly to Principle #2: one schema, and now the *fixtures* derive from it too — alongside row types, Zod, RLS columns.
- Three load-bearing properties, each one sentence: **schema-aware** (column types → value shapes, no field-by-field mapping), **deterministic** (a fixed seed → byte-identical data every run), **FK-aware** (reads `references()`, inserts parents before children, no manual id math).
- Alternatives, named and dropped in one line: Faker.js / Mockoon / snaplet are the out-of-stack options; `drizzle-seed` wins for the dev/test workload because it's wired to the schema and needs no separate data model. Course uses it; don't reach for Faker for this job. (Filter: minimum viable stack — one tool, not two.)

Tooltips here: `Term` on "fixtures" (pre-defined data a dev/test environment starts from), "deterministic" (same inputs always produce the same output — no randomness leaks between runs).

### The minimal call and its default behavior

Land the smallest thing that works, then show why it's not enough. This is the "simplest version first" rung.

`Code` block (lang `ts`), the four-line minimal call:

```ts
import { seed } from 'drizzle-seed';
import { db } from '@/db';
import * as schema from '@/db/schema';

await seed(db, schema, { seed: 1 });
```

Walk the three arguments inline in prose (not AnnotatedCode — it's three tokens): `db` is the Drizzle client; `schema` is the **bag of all `pgTable` exports** (`import * as schema`); the options object carries `seed`, the determinism knob. Note `@/db` / `@/db/schema` are the path aliases from the project (foreshadows the `tsx` requirement later).

Then the default behavior: with no `.refine`, the seeder inserts **10 rows per table** with type-appropriate values. Frame it as a smoke test — proves the wiring, rarely enough for a real dev experience (10 invoices won't exercise pagination; you can't see a weighted status distribution in 10 rows). This is the trigger that motivates `.refine` in the next section. Mention the global `count` option as the one-knob bump (`{ seed: 1, count: 50 }`) before introducing per-table control.

One watch-out, stated here because it bites on the very first run: **pass the whole schema bag.** If you pass a subset and a NOT-NULL foreign-key column's parent table isn't in the bag, the seeder throws ("can't fill a NOT NULL FK with no exposed parent"). `import * as schema` and pass all of it; the partial-exposure pattern is an advanced escape hatch (link the Drizzle "partially exposed tables" guide as an `ExternalResource`). This is a verified, common first-run error — worth the inline callout.

### Shaping data with refine: counts, columns, and realistic distributions

The core teaching section. `.refine((f) => ({ ... }))` is the per-table fine-tuning knob. Build it up in three rungs so the object never lands all at once.

Rung 1 — **counts.** Show `.refine` setting a row count on one table:

```ts
await seed(db, schema, { seed: 1 }).refine((f) => ({
  invoices: { count: 200 },
}));
```

Explain `.refine` takes a callback receiving `f` (the generator catalog) and returns an object keyed by table name; each table value accepts `count`, `columns`, `with`. Per-table `count` overrides the global default.

Rung 2 — **column generators.** Add a `columns` map. Introduce the catalog by *category*, not exhaustively — name the 6–8 the example uses and point to the docs for the rest:

- People/orgs: `f.firstName()`, `f.lastName()`, `f.fullName()`, `f.email()`, `f.companyName()`.
- Numbers/dates: `f.int()`, `f.number({ minValue, maxValue, precision })`, `f.boolean()`, `f.date({ minDate, maxDate })`, `f.timestamp()`.
- Set-driven: `f.valuesFromArray({ values: [...] })` (pick from a fixed set), `f.default()` (use the column's schema default).

State the senior signal explicitly: **reach for `valuesFromArray` whenever a `pgEnum` column is involved** — it's the seeder analog of the enum you defined in Ch037. Note `f.email()` is unique by default (no collisions); for any other generator that must not repeat, pass `isUnique: true`.

Rung 3 — **weighted distributions** (the rung that makes data feel real). Lead with the *why*: a status column filled by a uniform random pick produces ~⅓ paid / ⅓ pending / ⅓ overdue — which looks nothing like a real invoicing app where most invoices are paid. The fix is weighting, built into `valuesFromArray`:

```ts
status: f.valuesFromArray({
  values: [
    { weight: 0.6, values: ['paid'] },
    { weight: 0.3, values: ['pending'] },
    { weight: 0.1, values: ['overdue'] },
  ],
}),
```

Use **AnnotatedCode** for this rung's full `invoices` refine block (it's the one place focus must jump between `count`, the weighted `status`, the `numeric` `total` via `f.number({ precision })`, the curated `customerName` via `valuesFromArray`, and a `createdAt` spread via `f.date`). 4–5 steps, ≤6 lines each, `color` per concern. This is the densest object in the lesson — AnnotatedCode is the right tool to keep it digestible.

Money column reminder (ties to Ch037 L3): `total` is `numeric`, so use `f.number({ precision })` or a `valuesFromArray` of string amounts — not a float that loses cents. UUIDv7 PK reminder: don't put `f.uuid()` on the `id` column; let `.$defaultFn` fill it so the v7 time-ordering survives.

`Dropdowns` exercise (fenced-code mode) at the end of this section: a `.refine` skeleton with `___` blanks for the generator on an enum column (`valuesFromArray` vs `int` vs `default`), the `count` key, and the option key inside `number` (`precision` vs `digits`). Goal: check the student can map a column to the right generator. 3–4 blanks.

### How drizzle-seed resolves foreign keys

The conceptual heart — make the FK magic visible so it stops being magic. The student spent Ch037 L6 declaring `references()` and `onDelete`; this section shows the seeder *reading* those.

Two ideas:

1. **Topological insertion order.** The seeder reads every `references()` in the schema, builds the dependency graph, and inserts parents before children automatically — `organizations` → `invoices` → `lineItems`. The student never computes or assigns ids; the seeder picks a valid existing parent id for each child. Contrast with the hand-written `INSERT` pain from Ch038 (you had to insert orgs first, capture ids, reference them) — the seeder does this for you.
2. **`with` declares the fanout.** `with: { lineItems: 5 }` on the `invoices` refine makes **each** invoice get 5 line items. Stress the multiplication, because it's the #1 seeding surprise: 5 orgs with `invoices: { count: 200 }` is **200 invoices total** (count is global across the table, not per-parent), but `invoices` with `with: { lineItems: 5 }` is **5 per invoice**. Spell out the arithmetic with the worked numbers.

**Diagram** (`Figure` + D2 ER-style or a simple HTML three-tier strip): a horizontal three-box chain `organizations → invoices → lineItems`, each box annotated with its count (`5`, `200`, `with: 5 → 1000`), and a small label on each arrow reading "references() ⇒ insert order". Pedagogical goal: make "FK declaration drives both insertion order and the fanout count" a single glanceable picture. Cap height; horizontal layout per the diagram guidance. Keep it simple — this is an annotated illustration, not a system graph.

`Sequence` exercise: "Order the inserts drizzle-seed performs for this schema" — steps are the three tables plus a distractor (a table with no relations can go anytime). Reinforces topological order. Source order = correct order.

Tooltip: `Term` on "topological order" (an ordering of nodes in a dependency graph where every node comes after the things it depends on).

### Determinism: the same-seed guarantee

Short, high-value section — the property that justifies the whole approach. ~2 paragraphs + one tiny illustration.

- Two runs with `{ seed: 1 }` produce **identical** rows. Why it matters, concretely: your teammate runs the same script and debugs against *your* exact dataset; CI's seed produces the same data as your laptop, so a test that passes locally isn't flaky on a different machine. This is the reproducibility backbone for Unit 18's integration tests.
- The reflex: **pin the seed number** in the script. Vary it only to explore a different shape (a different spread of statuses/dates), then pin again.
- The `version` pin, as the senior layer: `{ seed: 1, version: '2' }`. The library versions its value-generation logic; pinning `version` means a `drizzle-seed` upgrade can't silently shift your "deterministic" output. Name v2 as the current LTS; the bare `{ seed: 1 }` defaults to latest. One sentence on the determinism-break trigger: changing `.refine` in a way that alters table count or column order can shift output on the same seed — bump the seed value (or accept new data) when the shape changes.

Illustration (optional, low-cost): a tiny `Figure` showing `{ seed: 1 }` → [run A rows] and `{ seed: 1 }` → [run B rows] as two identical 3-row tables side by side, vs `{ seed: 2 }` → a different table. Drives "same knob, same data" visually. Can be a `TabbedContent` (seed 1 / seed 2) if cleaner.

### A re-runnable seed script: reset, then seed

Assemble the production-shape script. This is where idempotency lands.

The problem: run `seed` twice against a non-empty DB and you double the data — or hit unique/FK violations from the prior run. The fix is two steps in one script:

```ts
import { reset, seed } from 'drizzle-seed';
import { dbUnpooled } from '@/db';
import * as schema from '@/db/schema';

await reset(dbUnpooled, schema);
await seed(dbUnpooled, schema, { seed: 1, version: '2' }).refine((f) => ({
  /* ... */
}));
```

Key decisions, each called out:

- **`reset(db, schema)`** clears every row in FK-safe order, leaving the schema (tables, columns) intact — it is *not* a migration, it doesn't drop tables. Re-runnable: reset+seed always lands the same state. The dev reflex: "local data got weird → `pnpm db:seed` → clean slate."
- **Use `dbUnpooled`, not `db`.** Tie to the conventions + Ch036 L4: `reset` runs `TRUNCATE ... CASCADE`, which holds locks and is exactly the long-DDL-ish work transaction-mode pooling chokes on. The two-client split (`db` pooled / `dbUnpooled` unpooled, from `db/index.ts`) exists for this. (Migrations used `dbUnpooled` too — same rule, restated, not re-derived.)
- **Order matters:** `reset` before `seed`, always wrapped together. Forgetting `reset` on a non-empty DB is the canonical seeding bug.

Watch-out: `reset` deletes everything in the schema — it's the seed-script cousin of the missing-`where` `DELETE` from Ch038 L1. Safe because the script is dev/test-only and named as such; **never wire it to a production credential.**

Use **CodeVariants** here for the before/after contrast: tab 1 "seed alone (run twice → duplicates / FK errors)", tab 2 "reset + seed (idempotent)". Two tabs, each with a one-paragraph explanation. This before/after is exactly CodeVariants' use case.

### Wiring the db:seed script

The `package.json` contract — short, mechanical, ties the script to the team workflow.

- The script lives at `scripts/seed.ts`, invoked by a `db:seed` package.json script: `"db:seed": "tsx scripts/seed.ts"`.
- **Why `tsx`, not bare `node`** (ties to conventions, Supply chain): the script uses path aliases (`@/db`), and Node's native type-stripping doesn't resolve aliases — that's a named `tsx` trigger. Keep this to one sentence; the *decision rule* (aliases ⇒ `tsx`) is the takeaway.
- The script imports `dbUnpooled`, the schema, runs reset+seed, and **exits explicitly**: `process.exit(0)` on success, `process.exit(1)` in a `.catch`, so CI can gate on it and the unpooled connection doesn't keep the process alive. Show the top-level shape.
- Production never runs `db:seed`. The script's env is dev or test only.

`Code` block (lang `ts`) for the full final `scripts/seed.ts` — the worked-example payoff, ~25–30 lines, top-to-bottom: imports, async main with reset + refined seed, `.then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); })`. This is the one place the student sees the *whole* file assembled. Follow with one line: "run `pnpm db:seed`, open Drizzle Studio (L1), eyeball the invoices list; run again, confirm identical rows."

### Seeding for tests, and where the seeder stops

The boundaries section — three sub-points, each a "reach for X when" rule. Keeps the student from over-applying the seeder. ~1 paragraph each, minimal code.

1. **Tests: seed in `beforeEach`, then targeted inserts.** Integration tests (Vitest, Unit 18) reset + seed a small dataset in `beforeEach`; determinism keeps them reproducible. When the seeded distribution doesn't match a scenario, the test does small targeted `db.insert`s *on top of* the known baseline. Frame: the seeder is the *baseline shape*; per-test inserts are the *specific rows under test*. Forward-ref Unit 18 (Ch086–087) for the full pattern — name, don't teach.
2. **The test-factory boundary.** For unit-level tests wanting one or two ad-hoc rows (no full seed), a factory helper — `buildInvoice({ status: 'paid', total: '100.00' })` — that inserts via Drizzle and returns the row is the cleaner reach. Rule: **seeder for datasets/fixtures, factories for per-test rows.** Forward-ref Ch087 L2 ("Factories over shared fixtures") as the owner — name only.
3. **What `drizzle-seed` seeds badly, and prod.** (a) Domain-specific text — an invoice description, a support-ticket body — comes out lorem-grade: fine for *shape*, flat for *screenshots/demos*. Senior fix: a hand-curated `valuesFromArray` of realistic strings for the few columns a demo surfaces; lorem-grade for the rest. (b) **Production "fixture" data** — the default workspace on signup, seed RBAC roles, a system org — is **not** the seeder's job. That's a one-shot data migration written by hand, run once, then tombstoned (Ch099). Name it so the student never points `drizzle-seed` at production.

`Buckets` exercise (2-column, "seeder vs factory" or "seeder handles it vs reach elsewhere"): sort items — "50 invoices for the dev list page", "one paid invoice for this test's assertion", "the default workspace created at signup", "a weighted status spread", "the exact 3 rows a pagination test needs", "realistic company names". Goal: cement the three boundaries. Grading: seeder bucket = datasets/distributions/fixtures; other bucket = single test rows + prod fixtures.

### External resources (optional)

`ExternalResource` cards: Drizzle Seed overview, the Generators reference (so the student has the full catalog), and the "seeding with partially exposed tables" guide (the FK-subset escape hatch named in the default-behavior section). Keep to 2–3.

## Scope

Prerequisites to restate **concisely** (one clause each, do not re-teach):
- `db/schema.ts` is the source of truth (Ch037, Principle #2) — the seeder reads it.
- `references()` / `onDelete` declare FKs (Ch037 L6) — the seeder reads them for order.
- `numeric` for money, `timestamptz`, `pgEnum`, UUIDv7 PKs via `$defaultFn` (Ch037 L3/L5) — generator choices key off these.
- The two-client split `db`/`dbUnpooled` and why migrations use unpooled (Ch036 L4 / conventions) — restated as the rule, not re-derived.
- Drizzle Studio for eyeballing the result (Ch040 L1) — referenced, not re-explained.
- Hand-written `INSERT` and the missing-`where` footgun (Ch038 L1) — used as contrast/analogy only.

Out of scope (belongs elsewhere — name at most, usually nothing):
- **Schema authoring** (`pgTable`, columns, constraints, relations) — Ch037. Don't teach schema here.
- **Migrations / Drizzle Kit** (`generate`, `migrate`, `push`, `drizzle.config.ts`, `meta/`) — Ch040 L1/L2. The seed script is *not* a migration; `reset` ≠ drop+recreate. Draw the line once, move on.
- **Integration-testing patterns at depth** (Vitest config, the per-test DB harness, `beforeEach` mechanics) — Unit 18 (Ch086–087). Name the seeder's role in tests; don't build a test suite.
- **The test-factory pattern at depth** — Ch087 L2 owns it. Name the boundary only.
- **Production one-shot data migrations** — Ch099. Name as "not the seeder's job."
- **Type-safe env vars** (`@t3-oss/env-nextjs`, the `!` on `process.env`) — Ch041 L2. The script reads `dbUnpooled` from `db/index.ts`; don't open env validation here.
- **Large-scale / performance-volume seeding** (millions of rows) — out of course scope; `drizzle-seed` handles dev/test volumes only. One line if at all.
- **Faker.js / Mockoon / snaplet** — named and dropped in the "named, characterized" section; not compared at length.
- Do **not** build the Ch041 seed deliverable here — this lesson teaches the tool with the `invoices` example; the project chapter applies it.

## Code conventions notes

- Seed script reads **`dbUnpooled`** from `db/index.ts` (the two-named-export rule). Never the pooled `db` for reset/seed.
- `import * as schema from '@/db/schema'` (the whole bag) — required by the seeder's FK resolution; also the partial-exposure failure-mode fix.
- `db:seed` package.json script runs via **`tsx`** (path-alias trigger), `process.exit(0/1)` for CI gating. Matches the Supply-chain `.ts` execution-path rule.
- Generator calls use the current function-call API (`f.email()`, `f.valuesFromArray({...})`), not the outline's property-access shape. Pin `version: '2'`.
- Money stays `numeric` → `f.number({ precision })` or string `valuesFromArray`; UUIDv7 PKs filled by `$defaultFn`, not `f.uuid()`. Consistent with the Data-layer conventions.
- Deliberate divergence to note for downstream agents: the minimal first example omits `version` and `.refine` for teaching simplicity — the final assembled script adds both. This staging is intentional, not an oversight.
