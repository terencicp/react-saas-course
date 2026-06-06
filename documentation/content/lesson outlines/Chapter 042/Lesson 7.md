# Lesson 7 outline — drizzle-zod: one source of truth

## Titles

- **Title (h1):** drizzle-zod: one source of truth
- **Sidebar label:** drizzle-zod

## Lesson framing

This is the chapter capstone. Every previous L042 lesson taught Zod as a thing the student *writes by hand*. This lesson's whole pitch is the inversion: when the entity is a database row, you don't write the schema at all — you **generate** it from `db/schema.ts` (the Architectural Principle #2 root from Ch037) and refine on top. It closes the source-of-truth loop the chapter has been circling since L1's "one declaration, two outputs": now the *database* is the one declaration, and Zod schemas, TS types, and form field names all fall out of it.

The senior payload is a single reflex with a sharp boundary: **generate when the entity is a row; hand-write a `z.object` when it isn't** (session payloads, webhook envelopes, third-party API responses correspond to no table). The student already knows `.pick`/`.omit`/`.partial`/`.refine` from L4 and L3 — this lesson is mostly *where the canonical schema comes from*, not new Zod surface. The new surface is small: three generators (`createSelectSchema`/`createInsertSchema`/`createUpdateSchema`), the second-argument override map, the `jsonb` pairing, and `createSchemaFactory` (named once).

Target student: a junior who has now written ~six lessons of Zod by hand and just spent five chapters (037–041) building a Drizzle invoicing data layer. They feel the drift pain acutely — they have an `invoices` table AND they've been hand-writing `createInvoiceSchema`. The "aha" is that those were the same fact written twice. The pain this relieves: a column type/nullability change silently breaking validation, caught only at runtime in production.

Where beginners go wrong (these must be taught explicitly, they are the lesson's senior content, not footnotes):
1. **Reaching for the wrong generator at a boundary** — using `createSelectSchema` to validate an insert (defaulted columns are required in select but optional in insert), or reusing one generated schema everywhere.
2. **The override-replaces-nullability footgun** (v0.8 behavior, verified June 2026): the two override forms differ in *when* they run relative to nullability. The **callback** form `(schema) => schema.max(50)` runs **before** drizzle-zod applies the column's nullability/optionality — it refines the base, then drizzle-zod still wraps the result in `.nullable()`/`.optional()` for you, so nullability is preserved. The **direct-schema** form (passing `z.object({...})`) **replaces the column entirely and drizzle-zod does NOT re-apply nullability** — a nullable column overridden this way silently loses its `.nullable()`. Callback = safe default; direct-schema = you own the nullability. This is the single sharpest watch-out.
3. **Treating the generated schema as the whole contract** — it encodes the database's *types and nullability*, but NOT the database's `CHECK` constraints, NOT API-tighter rules (max lengths beyond the column, format validation tighter than `text`), NOT cross-field rules. Refine on top.
4. **`numeric` comes back as a `string`** — the generated type for a money column is `string`, not `number`. This is correct (arbitrary-precision, no float lossiness) and the conversion happens at the boundary with a decimal lib, never on the schema.
5. **`jsonb` generates a wide JSON union, not a contract** — every consumer would have to narrow. The fix is the override pairing: the same Zod schema serves as both the `$type<...>` on the column (Ch037) and the override here. Two sources, one truth — the lesson's title made literal.

Mental model the student leaves with: **the database schema is the root; `drizzle-zod` is the projection of that root into the validation layer; the student's job is the thin refinement layer on top, not the base schema.** A diagram makes this concrete (one box → many derived arrows).

Tone/depth: adult, terse, decision-first. No "what is a schema" — they know. Lead each section with the senior question. Code-sample-heavy because the syntax IS small and the value is in seeing the generated-then-refined shape. One graded `ZodCoding` exercise to make the refinement-on-top reflex muscle memory. The running example is the chapter's `invoices` table (+ an `events` table with a `jsonb` payload for the JSON pairing) — already built in Ch037/Ch041, so the student recognizes it.

Version reality (verified June 2026, see Fact-check): the course is on the **pre-1.0 Drizzle line** (drizzle-orm 0.45 per Code conventions), so the package is the **separate `drizzle-zod` install** imported `from 'drizzle-zod'`, latest ~0.8.x, targeting **Zod 4**. Drizzle 1.0 (RC as of June 2026, not yet stable) folds these into `drizzle-orm/zod` and deprecates the separate package — name this once as the imminent forward-path so the student isn't surprised by package.jsons, but TEACH the `from 'drizzle-zod'` form the rest of the course uses. Pin `version="4.4.3"` on any Zod playground/coding callout to match the chapter.

## Lesson sections

### Introduction (no header, opens the page)

Open on the drift the student is living in. They have `db/schema.ts` declaring the `invoices` table — every column, type, nullability, default (Ch037). They ALSO have been hand-writing `createInvoiceSchema` as a `z.object`. State the senior question plainly: *those are the same fact written twice, and when the column changes the validation breaks silently — so why is the student maintaining both?* Preview the inversion: when the entity is a row, the database schema becomes the schema's source of truth, and `drizzle-zod` generates the base. Name the end state: the student will generate insert/select/update validators from a table and refine API rules on top, and know exactly when NOT to (non-row shapes). Keep it to ~5 sentences. Connect explicitly back to L4's "derive, don't duplicate" — this is that reflex one layer up, with the database as the canonical source instead of a hand-written base schema.

### The three generators

**Senior question:** the table already declares every column — what three schemas does `drizzle-zod` hand you, and why are they three and not one?

Teach the core API. Frame the three generators as **three boundaries of the same table**, each matching a `$infer*` type the student already met in Ch037 L10:

- `createSelectSchema(invoices)` — the **read** shape. Every non-nullable column required, nullable columns `.nullable()`, **columns with defaults are still required** (the row already exists; the default was applied before the read). Inferred type matches `typeof invoices.$inferSelect`. Used for: validating a row's shape in a test, deriving public-API response schemas via `.omit`/`.pick`.
- `createInsertSchema(invoices)` — the **write** shape. Columns with DB defaults or `$defaultFn` become **optional** (the DB fills them), generated columns are **absent**, nullable columns optional. Inferred type matches `typeof invoices.$inferInsert`. Used for: validating action inputs that create rows.
- `createUpdateSchema(invoices)` — the **partial-write** shape. Every column optional, generated columns absent. Roughly `createInsertSchema(invoices).partial()` but cleaner at the call site. Used for: PATCH-style actions.

**How to convey:** the single most important thing here is *why select and insert diverge on defaulted columns* — that's the whole reason there are three. Use a small side-by-side. **`CodeVariants`** with three tabs (`createSelectSchema` / `createInsertSchema` / `createUpdateSchema`), each tab showing the same `invoices` table call and the resulting inferred type's relevant lines, with the prose calling out what flips: `id`/`createdAt` (defaulted) go required→optional→optional across the three; the prose's first sentence names the boundary each serves ("validate a row coming back" / "validate a row going in" / "validate a patch"). This A/B/C glance is exactly what `CodeVariants` is for.

Then a tiny `invoices` table excerpt as a plain `Code` block first (so the student sees the source columns — `id` uuid default, `organizationId` uuid, `number` text, `status` pgEnum, `total` numeric, `createdAt` timestamptz default, `notes` text nullable), then the three-tab variants derive from it. Keep the table excerpt to ~8 lines, reuse the Ch037/Ch041 shape.

**Term candidates:** none new here (the student knows `$inferSelect`/`$inferInsert`).

### Refining on top of the generated base

**Senior question:** the generated insert schema accepts any `text` for `number` and any `numeric` string for `total` — but the API wants `number` ≤ 50 chars and `total` ≥ 0. The DB types don't carry those. Where do the extra rules go?

This is the conceptual center. Teach the **refinement-on-top reflex** and the **second-argument override map**. Two distinct things the student must not conflate:

1. **The override map (second argument)** adds per-column rules to the *generated base before* it's assembled. Two forms, and the difference between them is the lesson's sharpest watch-out:
   - **Callback form** `{ number: (schema) => schema.min(1).max(50) }` — receives the column's *base* generated schema (its type, e.g. a string schema for `text`) and chains onto it; drizzle-zod then re-applies the column's nullability/optionality *after* the callback runs, so you don't lose it. **This is the safe default.** The student does NOT rebuild from `z.string()` in the callback — `.min`/`.max`/`.refine` chain onto what's handed in.
   - **Direct-schema form** `{ payload: eventPayloadSchema }` — *replaces* the column's schema entirely, and drizzle-zod does **NOT** re-apply nullability afterward (v0.8+, verified June 2026 — see watch-out). Reach for it only when you genuinely want to supply the whole shape (the `jsonb` pairing below), and re-add `.nullable()`/`.optional()` yourself if the column had it.
2. **`.omit`/`.pick`/`.extend`/`.partial` after generation** — the L4 composition algebra, applied to the generated schema. The dominant move: `.omit` the columns the action sets server-side (`organizationId` from session, `createdBy` from auth, `id`/`createdAt` from the DB) so the action's input contract is exactly the user-supplied subset.

**How to convey:** this is where **`AnnotatedCode`** earns its place — one realistic `createInvoiceInputSchema` declaration walked step by step, because the student's focus needs to land on several distinct parts of one block in sequence. Author the canonical shape once:
```
const createInvoiceInputSchema = createInsertSchema(invoices, {
  number: (schema) => schema.min(1).max(50),
  total: (schema) => schema.refine((n) => Number(n) >= 0, { error: 'Total must be non-negative' }),
}).omit({ id: true, organizationId: true, createdBy: true, createdAt: true });

type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;
```
Annotated steps (each ≤6 lines prose, prefer blue, use green for the "this is the safe callback form", orange for the `.omit`):
1. `createInsertSchema(invoices, …)` — start from the generated insert base, not a hand-written `z.object`.
2. `number: (schema) => schema.min(1).max(50)` (green) — callback form: refine the *generated* `number` schema; it arrives as a string schema already, you chain on top.
3. `total: (schema) => schema.refine(...)` — `numeric` arrives as a `string` (watch-out section explains why), so the refine coerces with `Number(...)` to check the floor; the DB `CHECK` constraint isn't visible to Zod (this previews the "generated ≠ full contract" beat).
4. `.omit({ id, organizationId, createdBy, createdAt })` (orange) — strip the columns set server-side from session/auth/DB; what remains is the user-supplied input contract.
5. `type CreateInvoiceInput = z.infer<...>` — the inferred type the Server Action's parameter uses (forward-point to Ch043, do not write the action).

Follow the AnnotatedCode with a short prose para nailing the reflex: **generated covers the database's constraints (types, nullability, generated columns); you refine the API's additional constraints on top.** Name the line being crossed: cross-*resource* rules (number unique within org, customer exists) are NOT here — they're database lookups, they live in the action body after the parse (Architectural Principle #3, formally Ch043 L4; the L3 boundary re-drawn one more time). Keep this to the named-once level; Ch043 owns it.

**Exercise — `ZodCoding`, the refinement-on-top drill.** Best fit: the student should *feel* that they don't rebuild the schema, they refine the generated one. Mechanics: the starter imports a (provided) `invoices`-like table and a half-built `createInvoiceInputSchema` that's missing the `number` length cap and the `.omit`. Fixtures: a valid full input passes; an input with a 60-char `number` should fail (forces the `.max(50)` callback); an input carrying `organizationId` should still pass *and the inferred type must not include it* (forces the `.omit` — proved because a fixture relying on the omitted shape passes). Include a `^?` query on `type CreateInvoiceInput` so the student watches `organizationId` disappear from the type when they add `.omit`. `errorContains` on the failing fixture to assert it's the length rule firing. Grading is the fixtures table (ZodCoding has no separate criteria pane). Pin `version="4.4.3"`. NOTE for the builder: ZodCoding runs real Zod from esm.sh but does NOT run drizzle-zod — so the exercise must either (a) inline a tiny hand-written `z.object` base named to *look* like the generated schema and have the student refine/omit on it (pedagogically the same muscle), or (b) be authored as a plain `ZodPlaygroundCallout` if drizzle-zod can't load. Prefer (a): a `ZodCoding` where the "base" is a pre-written object schema standing in for `createInsertSchema(invoices)`, with a one-line callout that in the real codebase that base is generated, not typed. This keeps the graded interactivity while staying honest. Flag this constraint prominently so the builder picks the right path.

**Term candidates:** `Term` on "override map" (the second argument to the generators) — non-obvious name for a first-time reader.

### What drizzle-zod infers — and where it stops

**Senior question:** the student passes a `numeric` money column through `createInsertSchema` and the inferred type is `string`, not `number`. Bug or correct? And what does each Postgres type become?

Teach the **type-mapping table** and, more importantly, the **three places generation stops** so the student knows what they're still on the hook for.

The mapping (verified against current drizzle-zod docs, June 2026 — these are the *actual* outputs, correct any stale memory):
- `text`, `varchar` → `z.string()`
- `integer`, `serial` → `z.number().int()` *with int32 min/max bounds baked in* (`z.number().min(-2147483648).max(2147483647).int()`) — name that the bounds come for free.
- `numeric` / `decimal` → **`z.string()`** (the headline surprise — arbitrary-precision, Drizzle returns numerics as strings to avoid float lossiness).
- `boolean` → `z.boolean()`
- `timestamp` / `timestamptz` (date mode) → `z.date()`
- `uuid` → **`z.string().uuid()`** (the v3-*style* chain, NOT `z.uuid()` — drizzle-zod emits the legacy form; the override is where the student swaps to strict `z.uuid()` if they want it. This is the one place the chapter's "always top-level format builders" reflex meets a tool that doesn't follow it — name the tension, give the override fix `id: (schema) => z.uuid()` — but note it drops nullability per the footgun, so usually you leave the generated `z.string().uuid()` alone unless the column is non-nullable).
- `jsonb` → a **wide recursive JSON union** (`z.union([...primitives..., z.record(z.string(), z.any()), z.array(z.any())])`) — effectively "any JSON". NOT a contract (corrects the chapter-outline's "`z.unknown()`" claim — verified the current output is the union, not `unknown`). The override is where the real shape lands (next section).
- `pgEnum('status', [...])` → `z.enum([...])` matching the enum's options exactly — this one's clean, the generated enum is the contract.
- custom/unknown column types → fall through to a permissive shape; need an explicit override.

**Where generation stops (the senior content):**
1. **`CHECK` constraints are invisible.** A `check(total >= 0)` exists in the DB but the generated Zod lets `-100` through — that's why the previous section refined `total`. The DB constraint is the backstop (Ch037 L7), Zod is the boundary guard; they're not the same layer and Zod doesn't read the DB's checks.
2. **`numeric` is a `string` at the type level.** Do the money conversion at the boundary with `decimal.js`/`bignumber.js` (the production money pattern, named once — Ch037 L3 established numeric-as-string), never on the schema.
3. **Nullable becomes `.nullable()`, but the form often wants `.optional()`.** The override callback flips it: `notes: (schema) => schema.optional()`. Name when each is right (a form field that can be blank → optional; a domain value that's deliberately `null` → nullable; the L1 reflex re-applied).

**How to convey:** a compact two-column table (Postgres type → generated Zod) authored as a normal markdown table or `Buckets`-style reference — but the *teaching* is the three "stops", not the table. Lead with the `numeric → string` surprise as the hook (it's the most counterintuitive and the most production-relevant). Consider a tiny `Code` block showing the generated insert schema's inferred type for the `invoices` table with the `total: string` and `id: string` lines highlighted so the surprise is concrete.

**Optional check — `Buckets` or `Matching`:** a quick "match the Postgres column to its generated Zod schema" drill could cement the table. Reach for `Matching` (column type ↔ Zod output) only if the section feels thin without interactivity; the table + three-stops prose may be enough. Builder's call — note it as optional.

**Term candidates:** `Term` on "int32 bounds" if used; `Term` on "arbitrary-precision" (why numeric is a string).

### Pairing a jsonb column with its schema

**Senior question:** the `events` table has a `jsonb` `payload` column. Generation makes it "any JSON" — every consumer would have to narrow. How do you make the column AND the validation share one shape?

This is the section that makes the lesson title literal — *two sources, one truth*. Teach the **jsonb override pairing**:

- Declare the Zod schema for the JSON shape *once*, next to the table: `const eventPayloadSchema = z.object({ kind: z.enum([...]), actorId: z.uuid(), meta: z.record(z.string(), z.unknown()) })` (a discriminated union if the payload is tagged — callback to L1's `z.discriminatedUnion` for event variants).
- Pass it as the column's `$type<...>` in Drizzle (Ch037 L3/L9): `jsonb('payload').$type<z.infer<typeof eventPayloadSchema>>()` — now the database's TS type matches the Zod inferred type.
- Pass the *same* schema as the override here: `createInsertSchema(events, { payload: eventPayloadSchema })` — now the validation matches too.
- One schema, three surfaces: the column's TS type, the insert validation, and the inferred input type all resolve to the same shape.

**The footgun lives here, teach it at the point of pain:** passing `payload: eventPayloadSchema` is the *direct-schema* override form, which **replaces nullability** (v0.8). If `payload` is nullable in the table, the generated `.nullable()` is gone — re-add it: `payload: eventPayloadSchema.nullable()`. This is THE place students hit the v0.8 behavior in real code, so put the watch-out right next to the pairing, not in a footnote.

**How to convey:** **`CodeVariants`** (or a single `Code` with the three files if cleaner) showing the same `eventPayloadSchema` used in (tab 1) the table definition's `$type<...>`, (tab 2) the `createInsertSchema` override, (tab 3) the inferred type — making the "one schema, every surface" point visually. The shared identity is the lesson; consider color-matching the `eventPayloadSchema` token across panels (per ArrowDiagram color-match guidance) if using arrows, but tabs are simpler here. A short prose para drives it home: the `jsonb` column is the one place the database's type system can't see inside the value — the Zod schema is what gives it a shape, on both the DB-type side and the validation side, from one declaration.

**Term candidates:** none new.

### When the generated schema is the wrong reach

**Senior question:** the app validates a Better Auth session payload, a Stripe webhook envelope, and a third-party API response. None of those is a table. Does the student generate or hand-write?

Short but load-bearing section — it draws the boundary that keeps the reflex from being over-applied. Teach the **generate-vs-hand-write rule**:

- **Generate** when the entity *is a row* — the validation should track the table, and drift is the enemy.
- **Hand-write a `z.object`** when the shape corresponds to no table — session payloads, webhook event envelopes, third-party API responses, internal RPC shapes, `searchParams`. These have their own source of truth (the upstream system's contract), not your database, so generating from a table would be wrong.

**The senior nuance:** mixing the two cleanly is the pattern, not a smell. A real Server Action might `safeParse` a hand-written `webhookEnvelopeSchema` AND, after extracting the data, build a row with a generated `createInvoiceInputSchema`. They coexist; each schema's source matches its boundary.

**How to convey:** a `StateMachineWalker` (decision mode) or a simple two-branch `Buckets` exercise — "is this shape a database row?" → generate / hand-write. Given the binary clarity, a small `Buckets` drill ("sort these shapes into Generated vs Hand-written": invoice insert, session payload, Stripe webhook, customer row, `searchParams` filter, audit-log row) is a clean, fast cement. Reach for `Buckets`. Two columns, ~6 items. This also rehearses the rule as recall, not just recognition.

Also name `createSchemaFactory` **once** here (it's a power-tool, fits the "when the default isn't enough" framing): when the project extends Zod (e.g. `@hono/zod-openapi` for API docs in Ch046), `createSchemaFactory({ zodInstance: customZ })` returns generators bound to the custom instance. It also accepts a `coerce` config (`createSchemaFactory({ coerce: { date: true } })`) that makes the generators emit `z.coerce.date()` for date columns automatically — a clean tie-back to L6's FormData coercion. Name both, drill neither — rare in line-of-business code.

**Term candidates:** `Term` on "envelope" (webhook envelope — the outer `{ type, data }` wrapper around a payload) if used.

### The source-of-truth chain

**Senior question:** zoom out — where does a column change *ripple to*, and what makes drift a compile error instead of a runtime surprise?

The closing synthesis. This is the chapter's payoff and deserves a **diagram**. Show the full chain as a single flow:

`db/schema.ts` (the root, Ch037) → `drizzle-zod` generates base Zod schemas → student refines on top (this lesson) → `z.infer` produces TS types (L4) → Server Actions consume typed inputs (Ch043) → form `name` attributes match the schema keys (Ch044) → **a column change becomes a compile error, not a silent runtime bug.**

**Diagram spec — D2 `flowchart LR` (horizontal, nodes are labels), wrapped in `<Figure>`.** One source box on the left (`db/schema.ts — invoices table`) with arrows fanning right to the derived artifacts. Pedagogical goal: make "one root, everything derived" *spatial* — the student should see that all arrows originate from the single database-schema box, so changing it propagates everywhere by construction. Keep it ≤6 nodes so it stays a clean horizontal strip under the 800px height cap. Caption: a column rename or type change forces every downstream consumer to update or fail to compile — that's the drift bug turned into a build error. **Fallback:** if the agent wants live code in the nodes (showing the actual `total` column flowing to `total: string` in the type), use `ArrowDiagram` with HTML code-line boxes per the cross-region anchor rules; but D2 flowchart is the default since the nodes are labels.

Close the section (and lesson) by naming what this buys: the rest of Unit 6 is now cheap to write — every action's input contract is a three-line derive from the table, not a hand-maintained parallel schema. This is Architectural Principle #2 (Ch037) fully cashed in at the validation layer. One sentence connecting back to the chapter's opening thesis (every untrusted boundary parsed against a schema) — those schemas, for row-shaped data, are now free.

**Optional external resource:** an `ExternalResource` / `LinkCard` to the official drizzle-zod docs (orm.drizzle.team/docs/zod) so the student can check the live type-mapping table and the version-specific override behavior. Worth including given the API surface shifts with versions.

### Quick recall (optional closing micro-check)

If the lesson feels like it needs a final recall beat beyond the two embedded exercises, a 3–4 statement `TrueFalse` round hits the headline traps: "`createSelectSchema` is the right choice for validating an insert" (F), "passing a Zod schema directly in the override map keeps the column's nullability" (F — the footgun), "a `numeric` column generates a `z.number()`" (F — string), "you generate a schema for a Stripe webhook payload" (F — hand-write). Builder's call; the chapter has a dedicated quiz lesson (L8) so this is genuinely optional and should be cut if the two interactive exercises already carry recall.

## Scope

**Prerequisites to redefine concisely (do NOT re-teach):**
- `$inferSelect`/`$inferInsert` (Ch037 L10) — name as "the row/insert types the table already gives you"; the generators' inferred types match these. One sentence.
- `.pick`/`.omit`/`.partial`/`.extend`/`.refine`/`z.infer`/`z.input` (L3, L4) — assume fluent; this lesson *applies* them to a generated schema, doesn't teach them. The override-callback `.refine` is the L3 refine, same syntax.
- `$type<...>` on a `jsonb` column (Ch037 L3/L9) — name as "the TS-type claim on a jsonb column"; the pairing reuses it. One sentence.
- `pgEnum`, `numeric`, `uuid`, `timestamptz` columns (Ch037 L3) — assume known; reference by name.
- Architectural Principle #2 (Ch037 L1) — name it, don't re-derive.

**Explicitly OUT of scope (defer, do not teach):**
- **The Drizzle schema itself** — Ch037 owns `pgTable`, column builders, constraints. Show table excerpts as *given*, never teach how to author them.
- **Server Actions consuming these schemas** — Ch043 (next chapter). Every snippet stops at the schema declaration or the `z.infer` type. NO `'use server'`, no action body, no `safeParse`-in-an-action, no DB write. Forward-point only.
- **Cross-resource validation** (uniqueness, slug-taken, customer-exists, plan-permits) — these are DB lookups that live in the action body (Architectural Principle #3, formally Ch043 L4). Name the boundary, don't implement.
- **Form-side rendering** of these schemas' errors via `useActionState` — Ch044.
- **The full `$type<...>` end-to-end jsonb story** — named here for the pairing, the complete pattern is Ch037 L9.
- **OpenAPI generation** from schemas — Ch046 names it for route handlers; `createSchemaFactory` is named here only as the seam.
- **Real money math** with `decimal.js`/`bignumber.js` — named once as the boundary conversion; the production money pattern is its own concern, not taught here.
- **Drizzle 1.0's first-class `drizzle-orm/zod` generation** — named once as the imminent forward-path (the package the student will see in newer codebases), but the course teaches the `from 'drizzle-zod'` pre-1.0 form it's built on. Do not migrate the lesson to the 1.0 API.
- **`z.coerce` mechanics / FormData boundary** — L6 owns it; only referenced via `createSchemaFactory({ coerce: { date: true } })` named once.

## Code conventions alignment

Per `Code conventions.md` §"Schemas with Zod 4" and §"Data layer (Drizzle)":
- `createSelectSchema`/`createInsertSchema`/`createUpdateSchema` from `drizzle-zod` are the canonical derive-from-table path; per-column override map adds refinements; hand-writing a parallel schema for a table is a smell. **(Directly this lesson's thesis.)**
- Naming convention (continuity-note override, load-bearing): schema const **camelCase** (`createInvoiceInputSchema`, `eventPayloadSchema`), inferred type alias **PascalCase on the line directly below** (`type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>`), same file, in `/lib`. Do NOT use the chapter-outline's PascalCase `InvoiceSchema` form — it was overridden chapter-wide.
- Top-level format builders reflex (`z.uuid()` not `z.string().uuid()`) — but note the deliberate tension: drizzle-zod *generates* the v3-style `z.string().uuid()`, and the lesson teaches leaving it or overriding to `z.uuid()` with the nullability caveat. Flag this divergence as deliberate for downstream agents.
- `numeric` → string at the boundary, convert with a decimal lib, never on the schema (§Data layer reinforces).
- The `db` client / table imports come from `db/schema.ts`; schemas live in `/lib` (or co-located per project convention). Snippets reference `invoices`/`events` as imported from the schema module.
- The Drizzle-1.0-moves-to-`drizzle-orm/zod` note in conventions matches the "name once as forward-path" decision.

**Deliberate divergences to flag for downstream agents:**
- Snippets use `createInsertSchema(...)` and stop before any action — pre-Ch043, no `safeParse`/`'use server'`. Do not "complete" them into actions.
- The ZodCoding exercise stands in a hand-written base object for the generated schema (drizzle-zod won't load in the esm.sh runtime) — this is intentional, with a callout that the real base is generated. Do not "fix" it to import drizzle-zod.
- The v3-style `z.string().uuid()` appearing in generated output is correct tool behavior, not a convention violation — do not "upgrade" generated-output examples to `z.uuid()`.
