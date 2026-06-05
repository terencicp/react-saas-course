# $inferSelect and $inferInsert

- **Title (h1):** `$inferSelect and $inferInsert`
- **Sidebar label:** `Inferred row types`

---

## Lesson framing

This is the **chapter capstone**. Lessons 2–9 built `db/schema.ts`; this lesson cashes in Principle #2 (installed in L1) by showing the *call site* that hands a schema-derived type to every downstream consumer. The deliverable: the student can replace any hand-written row interface with `typeof <table>.$inferSelect` / `$inferInsert`, knows precisely why the two shapes differ, and can compose narrower view types without restating a single field name. The lesson **closes the chapter** — the through-line "the schema is the root of a derivation tree" (L1) resolves into the two helpers that *are* the derivation.

**The one mental model to leave with:** read and write are two different shapes of the same row, and the schema already knows both — `$inferSelect` is "everything stored, fully known"; `$inferInsert` is "only what the app must supply." The asymmetry is not Drizzle being clever; it's the schema's own facts (defaults, generated columns, nullability) projected into TypeScript. **A hand-typed `type Invoice` is the smell that says someone retyped what the schema already knew.**

**Pedagogical spine:**
- This is a **types lesson, not a mechanics-of-querying lesson** — the student writes no queries (Ch 038 owns those). The artifact is the `type` alias and where it flows. This is the single most important framing constraint: every code sample is about a *type*, never a runtime query result.
- **`TypeCoding` is the ideal exercise vehicle** — student code is never executed, the LanguageService surfaces the inferred type via Twoslash `^?`. The whole lesson is "what does the compiler infer here," which is exactly what `TypeCoding` checks. This is the lesson's headline interactive and a deliberate departure from the `DrizzleSchemaCoding` exercise used L3–L8 (which probes runtime SQL — wrong tool when the answer is a *type*).
- **Lead with the payoff (`$inferSelect` replacing a hand-typed interface), then earn the asymmetry.** Cognitive-load order: (1) the read shape — simplest, one-to-one with the row; (2) the write shape — introduce the three things that make it *differ*; (3) composition + props — the real-world payoff; (4) when inference is wrong — the honest edges. Do not open with the asymmetry; the student needs the read shape solid first.
- **Reuse, do not re-derive, the running domain.** `invoices`, `organizations`, `invoiceLineItems`, `tags`, `users`, `memberships`, `invoiceTags` are all built across L2–L9. This lesson *imports* them illustratively and never redeclares a table. Canonical columns settled in earlier lessons: `amountDue` is `numeric({ precision: 12, scale: 2 })` (L3), `id` is `uuid().primaryKey().default(sql\`uuidv7()\`)` (L5), `status` is the `invoiceStatus` pgEnum (L3), `createdAt`/`updatedAt` from `...timestamps` (L4), `assignedToId` nullable (L4/L6).
- **Honesty about inference quirks is a feature, not a footnote.** `numeric → string` and `jsonb → unknown`-without-`$type` are real, current Drizzle behavior (verified June 2026). The senior framing already seeded in L3 ("`numeric` is the one type where TS and SQL disagree about the runtime value") pays off here — the student should *expect* `amountDue: string` and read it as the precision guarantee, not a bug to fix.
- **Voice + format:** match the chapter — warm-but-terse intro, `CourseProgressBar` at top, prose-complete MDX with components authored as `{/* TODO START … */}` stubs carrying full specs for the downstream component-build pass. Inline `Term`-style parentheticals `((…))` for quick definitions, matching L1's established style.
- **No quiz** (the chapter's L11 quiz is separate). This lesson ends the teaching content; its closing paragraph should land the "codebase rewrites itself around a schema edit" capstone beat and hand off to the chapter quiz.

---

## Lesson sections

### Intro (no header)

`CourseProgressBar` first. Then the senior question, framed as a callback to L1: across L2–L9 the student built the whole schema, and L1 promised every downstream typed shape would be *generated* from it — "but with which keystrokes?" The intro names the two helpers as the answer and the practical end-state: by the end, the student deletes the hand-typed `type Invoice` they'd otherwise write and replaces it with one line that can never drift. Motivate concretely: a Server Component needs an `Invoice[]` prop type — where does that type come from? Keep it to ~2 short paragraphs; connect explicitly to L1's "derivation tree" and the four-way-drift fear so this reads as the resolution, not a new topic.

---

### `$inferSelect`: the row you read back

**Goal:** the student writes `type Invoice = typeof invoices.$inferSelect` and trusts it as the full-row shape.

Content:
- Define `$inferSelect` plainly: a property *on the table object itself* that resolves to the TypeScript type of one row as a `db.select()` returns it. Stress `typeof` — `$inferSelect` is accessed at the *type level* (`typeof invoices.$inferSelect`), a point beginners trip on (they try to use it as a value). Call this out explicitly.
- The one-line replacement: a hand-typed `type Invoice = { id: string; amountDue: string; … }` becomes `type Invoice = typeof invoices.$inferSelect`. Frame as the literal cash-in of L1's "hand-typed row interfaces rot silently" smell — this is the line that makes the whole category disappear.
- **The per-column type map** — the load-bearing reference of this section. Show how each Postgres builder (from L3) lands in TS: `text → string`, `integer → number`, `boolean → boolean`, `numeric → string` (the precision boundary, callback to L3), `timestamp({ withTimezone: true }) → Date`, `uuid → string`, `pgEnum → the string-literal union`, `jsonb().$type<T>() → T` (or `unknown` without `$type`), `.array() → T[]`. Nullability: `.notNull()` → bare type, nullable column → `T | null` (callback to L4's "nullability is a tax paid downstream" — `$inferSelect` is *where* that tax is collected).

**How to convey — components:**
- **`AnnotatedCode`** centerpiece: one block showing the `invoices` table (abbreviated to ~6 representative columns: `id` uuid, `amountDue` numeric, `status` enum, `assignedToId` nullable uuid, `createdAt` timestamptz, `tags` text array) *above* a `type Invoice = typeof invoices.$inferSelect` and the resolved type written as a comment/companion. Color-code 3–4 steps each mapping a column to its inferred member: step on `numeric → string` (orange — the surprise), step on the nullable column → `| null`, step on `pgEnum → union`, step on the array. Goal: make the column→type projection *visible* one row at a time. `maxLines` budget — keep the table abbreviated so it fits.
- A **`CodeTooltips`** pass *or* inline parentheticals on the resolved type tokens is optional but helpful: tooltip `string` on the `amountDue` line as "numeric comes back as a string to preserve arbitrary precision — never `parseFloat` money" (reinforces L3).
- **`TypeCoding` exercise** to close the section: give the student a schema (pre-written `invoices` table in the starter, non-editable conceptually) and a `type Invoice = typeof invoices.$inferSelect` with a Twoslash `^?` on `Invoice`; criterion pins `contains` to a substring of the resolved object type (e.g. `amountDue: string`). Variation that earns the section: a should-fail line using `// @ts-expect-error` — e.g. assigning `invoice.amountDue` to a `number`-typed variable — proving `numeric` is `string`, with the directive itself as the "make errors go away" criterion (per `TypeCoding` doc's recommended polarity). Keep it small and focused on *reading* the inferred type, not constructing it.

**Terms for tooltips:** `$inferSelect` (define inline first use). No new acronyms here.

---

### `$inferInsert`: only what you must supply

**Goal:** the student understands `$inferInsert` is the *narrower* write shape and can predict which columns are optional/omitted/required from the schema modifiers.

Content (this is the section where the asymmetry is taught — invest here):
- Define `$inferInsert`: the type `db.insert(<table>).values(...)` accepts. Same `typeof <table>.$inferInsert` access pattern.
- **The three rules that make insert differ from select** — teach as an ordered checklist mirroring L4's column-modifier checklist (deliberate structural rhyme so it feels familiar):
  1. **Has a default → optional.** Columns with `.default(literal)`, `.defaultNow()`, or `.$defaultFn(…)` become optional on insert (you *may* supply, the DB/Drizzle fills it otherwise). Tie to L4's SQL-side-vs-app-side default split: both kinds make the column optional on `$inferInsert`, but for different reasons (SQL `DEFAULT` clause vs Drizzle running `$defaultFn` before the insert). `id` is the headline example — `uuid().primaryKey().default(sql\`uuidv7()\`)` (L5) → optional, you almost never pass it.
  2. **Generated → omitted entirely.** `.generatedAlwaysAs(…)` columns (L4's `emailLowercased`) and `generatedAlwaysAsIdentity()` (L5's bigint reach) are *absent* from `$inferInsert` — supplying one is a type error, because the DB computes it. Distinguish sharply from rule 1: optional ≠ omitted.
  3. **`.notNull()` with no default → required.** The columns the app *must* provide. Everything else falls out of rules 1–2.
- **Nullability nuance (high-value gotcha):** a defaulted column is made *optional* (`undefined` is fine), not *nullable* — passing `null` is only legal if the column is itself nullable. This is the chapter-outline watch-out; surface it explicitly. `?: T` ≠ `: T | null`.

**How to convey — components:**
- **`CodeVariants`** as the centerpiece — two tabs, **`$inferSelect` vs `$inferInsert`** for the *same* `invoices` table, each tab showing the resolved type so the diff is eye-level. Use the prose to name what changed per tab: select has `id`/`createdAt`/`status` as required members; insert has them as `?:` (optional) and the generated column gone. This A/B is the single clearest way to show the asymmetry — prefer it over two separate blocks. (Per component docs, `CodeVariants` is the right pick for before/after / two-version comparison over `Tabs`.)
- Optional supporting **`AnnotatedCode`** on the *insert* type alone: 3 colored steps, one per rule (green = required, blue = optional-via-default, red/grey = omitted-generated), each step landing on the columns that hit that rule. Use only if the `CodeVariants` diff needs reinforcement; don't duplicate.
- **`TypeCoding` exercise**: starter has the table + `type NewInvoice = typeof invoices.$inferInsert` and a `const draft: NewInvoice = { … }` the student must complete so tsc goes quiet. Design the object so the *required* fields are missing (student adds `organizationId`, `amountDue`) and a *generated* or *defaulted* field is wrongly supplied (student removes it). Criteria: implicit "fix all errors" (no explicit queries needed) — leftover errors are loud in the diagnostics pane. This drills rules 1–3 by construction. This is the strongest single exercise in the lesson — the student *feels* the asymmetry by satisfying the insert type.

**Terms for tooltips:** none new; reuse `$inferInsert` definition inline.

---

### Why read and write are two shapes

**Goal:** lock the *reason* for the asymmetry so the student can reason about a column they've never seen.

Content — short, conceptual, no new mechanics:
- The principle in one line: **read returns everything stored; write accepts only the subset the app is responsible for.** The DB owns the rest (defaults it fills, columns it computes).
- This is "what the schema knows that plain TypeScript couldn't infer on its own" — a hand-written interface can't express "this field is required to read but optional to write" without two separate hand-maintained types; the schema expresses both from one declaration. Frame as the deeper *why* behind L1's "generate, don't hand-copy."
- One-sentence forward hook: this same asymmetry is why **drizzle-zod** ships *two* generators (`createSelectSchema` / `createInsertSchema`) — same split, runtime layer (owned Ch 042 L8; name only, no Zod code).

**How to convey:**
- A small **`Figure` with a hand-coded HTML/CSS visual** (or `ArrowDiagram`): the row as a set of column chips; a "READ (`$inferSelect`)" lane that includes *all* chips; a "WRITE (`$inferInsert`)" lane where defaulted chips are dimmed/optional-tagged and generated chips are struck out/absent. One picture that makes "select ⊇ insert" spatial. Keep under 800px, horizontal. Pedagogical goal: convert the verbal asymmetry into a containment relationship the student can *see* (insert is a subset/projection of select's required surface). This is a simple visual aid, not a system graph — exactly the kind of low-effort enriching diagram the guidelines endorse.
- No exercise here; this is the conceptual glue between the two mechanics sections and the composition section.

---

### Place the types next to the table, name them well

**Goal:** the canonical placement + naming convention, so the project chapters and the student's own code are consistent.

Content:
- **Co-locate the type exports with the table** in `db/schema.ts`: directly under each `pgTable`, `export type Invoice = typeof invoices.$inferSelect;` and `export type NewInvoice = typeof invoices.$inferInsert;`. Reasoning: the type and its source live in one file, so a reader never hunts for "the Invoice type." This is the deliberate, *correct* place to write a `type` — it's a re-export of the derived shape, not a hand-copy (ties back to L1's carve-out test: it restates *no* field name).
- **Naming convention (pin this):** entity noun for the select type (`Invoice`, `Organization`, `Membership`); `New` prefix for the insert type (`NewInvoice`, `NewMembership`). This is the course standard; reuse verbatim in projects.
- Note on `import type`: downstream consumers import these with `import type { Invoice } from '@/db/schema'` (callback to the Code-conventions `verbatimModuleSyntax`/`import type` rule — type-only import for a type-only symbol). One sentence; don't belabor.
- **Recognition aside:** `InferSelectModel<typeof invoices>` / `InferInsertModel<typeof invoices>` are the older generic-helper spellings of the exact same types — name them once so the student recognizes them in legacy code/Stack Overflow, then state the course uses the `$infer*` property form (it's terser and is what Drizzle's own docs lead with). `:::note` aside, one paragraph. (Verified: both still exist; `$infer*` is the current idiom.)

**How to convey — components:**
- **`Code`** (plain block, not annotated — this is simple): the `invoices` table abbreviated, immediately followed by the two `export type` lines. Keep it tight; the teaching point is *adjacency*, which the block layout shows on its own.
- **`:::note`** aside for the `InferSelectModel` recognition note.

**Terms for tooltips:** `DTO` is *not* needed here (it was L1). No new terms.

---

### Compose new shapes without restating fields

**Goal:** the student builds a narrower view type and an update type, both anchored to the inferred types, never restating a field name — the real-world payoff and the direct sequel to L1's carve-out #2.

Content:
- **The composition rule:** every derived shape roots in `$inferSelect`/`$inferInsert`. Show the canonical summary type (the *same* `InvoiceSummary` L1 teased, now in its real home):
  `type InvoiceSummary = Pick<Invoice, 'id' | 'status' | 'amountDue'> & { organizationName: Organization['name'] }`.
  Walk it: `Pick` pulls names *and* types off the inferred `Invoice`; `Organization['name']` reads one field's type via indexed access. **Zero field types restated** — rename `amountDue` in the schema and this breaks at compile time too. This is the carve-out test from L1 made concrete with the now-real inferred types.
- **The update shape:** updates accept a partial of the insert type. Teach `Partial<NewInvoice>` as the common move, then the *more accurate* shape the chapter-outline flags — `id` is required to know *which* row, the rest optional: `{ id: Invoice['id'] } & Partial<Omit<NewInvoice, 'id'>>` (or `Required<Pick<NewInvoice,'id'>> & Partial<NewInvoice>`). Present `Partial<NewInvoice>` as the 80% answer and the id-pinned shape as the precise one; don't over-engineer — name the trade-off and move on.
- **Utility-type vocabulary** (the student has met these in TS lessons — reuse, don't re-teach): `Pick`, `Omit`, `Partial`, `&` intersection, `Type['field']` indexed access. One-line each at most; these are the *tools* of composition.

**How to convey — components:**
- **`AnnotatedCode`** on the `InvoiceSummary` + update-type block: ~4 colored steps — `Pick<Invoice, …>` (green: names+types from the source), `Organization['name']` (blue: indexed access), `Partial<NewInvoice>` (orange: optional patch), the id-pinned variant (violet: the precise shape). Each step's prose lands the "nothing restated" point. This is the section's centerpiece — composition is best taught by walking the operators one at a time on a single block.
- **`TypeCoding` exercise** (the lesson's capstone exercise): starter defines `Invoice`/`Organization`/`NewInvoice` (via `$infer*`, given) and asks the student to *write* `InvoiceSummary` and an update type so that (a) a `^?` query on `InvoiceSummary` resolves to the expected members and (b) a `// @ts-expect-error` line proving you can't sneak an un-Picked field in passes. Criteria: `expectedQueries` pinning `InvoiceSummary`'s resolved shape to contain `organizationName: string`; an `expectedErrors`/`@ts-expect-error` proving the anchor holds. Grading: type-query match + directive satisfied. This is the assessment that proves the student can *compose from the source*, the whole skill of L1's carve-out — now executable.

**Terms for tooltips:** indexed access `Type['field']` is worth a one-line `CodeTooltip` ("reads one field's *type* straight from the source — never restated") inside the `AnnotatedCode` if it fits; the student met it L1 but a reminder at the call site is cheap.

---

### One type, one source: the prop pattern

**Goal:** the student sees the end-to-end flow — a query returns the inferred type, a component's prop *is* that type — so "one type, one source" stops being abstract.

Content:
- The pattern: a Server Component reads invoices from a query (Ch 038, foreshadowed — *do not* write the query body, just `const invoices: Invoice[] = await …`), and hands them to a Client Component whose prop type is `Invoice[]`. **The same `Invoice` flows from schema → query result → page → child prop**, one declaration the whole way. Contrast with the Option-A world (L1): the child would have its own hand-typed prop interface that drifts.
- The closing tie: every layer aligns because every layer reads the same root — the query's row type, the component prop, *and* (Ch 042) the drizzle-zod validator all come off the same table. Name the chain explicitly: **Drizzle table → `$inferInsert` for the type → drizzle-zod for the validator → both consumed by the Server Action** (Ch 042 L8 / Ch 043; names only).

**How to convey — components:**
- **`Code`** (single small block) or a lightweight **`ArrowDiagram`/`Figure`**: schema `invoices` → `Invoice` → `listInvoices(): Promise<Invoice[]>` (query, Ch 038) → `<InvoiceList invoices={…} />` with `type Props = { invoices: Invoice[] }`. The point is the *single* type name threading every box. If `Code`, show the three tiny declarations stacked (the `export type`, the function return annotation, the prop type) so the repeated `Invoice` is visually obvious. Keep query bodies elided (`// Ch 038 owns this`).
- No exercise; this is synthesis prose with one illustrative visual.

**Terms for tooltips:** none new.

---

### When inference is wrong, and the relations gap

**Goal:** the honest edges — where `$inferSelect` doesn't give you what you want, and the one thing it deliberately *doesn't* include. Sets accurate expectations so the student isn't surprised later.

Content (a focused "watch-outs in context" section — but content-driven, each tied to a concept, per the no-bundled-tips rule):
- **`jsonb` without `$type` infers as `unknown`.** The fix (from L3): supply `$type<WebhookEvent>()` on the column so `$inferSelect` resolves to the real shape. Frame as "inference is only as good as what you told the schema" — the `$type` claim is a compile-time promise (L3's exact framing), Zod still validates at runtime (Ch 042).
- **`numeric` stays `string`.** Already taught in the read-shape section; restate here as a *deliberate* honesty, not a defect — the chapter does not "fix" it, because the string preserves arbitrary precision. Cross-reference, don't re-explain.
- **Enum-like text columns** that should be `pgEnum`: if a column is `text()` but holds a fixed set, `$inferSelect` gives `string`, losing the union. The fix is upstream — make it a `pgEnum` (L3) — not a cast at the read site. Reinforces "fix it in the schema, not the consumer."
- **`$inferSelect` does not include relations.** The big one: an inferred `Invoice` has `organizationId: string`, *not* a nested `organization` object or a `lineItems` array. Relations (L9's `defineRelations`) have their *own* inferred result types produced by the relational query API (`db.query.…({ with })`), owned by Ch 038 L3. `$inferSelect` is the *flat row*; nested shapes are a query concern. This is the cleanest place to retire any expectation that `with: { tags: true }` shows up in `$inferSelect` — it doesn't, by design.
- **Partial selects produce narrower shapes** — if a query selects only some columns, its result type is narrower than `$inferSelect`; don't restate *that* either (let it infer). One sentence (Ch 038 L1 owns custom-select result types).

**How to convey — components:**
- **`CodeVariants`** (two tabs) on the `jsonb` case: tab "Without `$type`" → `payload: unknown`; tab "With `$type<WebhookEvent>()`" → `payload: WebhookEvent`. The before/after makes the fix obvious and motivates always annotating `jsonb`. (Reuses L3's `webhookDeliveries` table — import, don't redeclare.)
- **`:::caution`** aside for "`$inferSelect` is flat — relations are not in it," pointing forward to Ch 038 L3 for nested result types. This is the highest-value expectation-setter; make it prominent.
- A short **`MultipleChoice`** (single-correct) check: "An inferred `Invoice` (`typeof invoices.$inferSelect`) — what does its `organization` member look like?" Correct: "there is no `organization` member; you get `organizationId: string` (the flat FK column) — nested relations have their own inferred types from the relational query API." Distractors: a nested `Organization` object always present; `organization: Organization | null`; a lazy-loaded proxy. `McqWhy`: `$inferSelect` is the flat stored row; `defineRelations` + `db.query.…({ with })` is a separate, query-time shape. This single MCQ guards the most common wrong expectation more economically than another `TypeCoding`.

**Terms for tooltips:** `$type<T>()` worth a one-line reminder tooltip ("a compile-time promise about the stored shape; Postgres stores bytes, Zod enforces at runtime") if it appears in a `CodeTooltips` block.

---

### Capstone: the codebase rewrites itself

**Goal:** land Principle #2 *cashed in* — the chapter's closing beat.

Content — short, resonant, no new mechanics:
- Restate the payoff as a sequence the student can now fully picture: change a column in `db/schema.ts` → the inferred types update → run the type checker → every consumer (query result, component prop, composed summary, update payload) surfaces as a compile error → fix the squiggles → ship. This is the L1 promise ("change one file, every downstream layer's type checker catches the drift") now *true*, because `$inferSelect`/`$inferInsert` are the wires.
- The chapter's full arc in two sentences: L1 named the principle; L2–L9 built the file; L10 made every downstream shape a *branch* of it. The hand-typed `type Invoice` is now not just discouraged — it's *unnecessary*, because the one-line derivation is strictly better.
- Hand off to the chapter quiz (next).

**How to convey:**
- Pure prose closer (1–2 short paragraphs). Optionally a tiny **`DiagramSequence`** reprising L1's drift timeline *resolved*: the rename lands in the schema → the inferred types flip → the four consumers light up as compile errors *at edit time* (the L1 counterfactual, now the default). Only build it if it doesn't merely duplicate L1's diagram — prefer a single tight "before this chapter / after this chapter" two-step. Author's call; prose alone is acceptable for a capstone.

---

### External resources

**Goal:** two cards, not a reference dump (matching L1's restraint).

`CardGrid` of `ExternalResource` cards:
1. **Drizzle ORM — Goodies / type inference** (`orm.drizzle.team/docs/goodies`) — the canonical reference for `$inferSelect` / `$inferInsert` (and the `InferSelectModel`/`InferInsertModel` aliases). The page the student returns to.
2. **Drizzle ORM — Zod** (`orm.drizzle.team/docs/zod`, the `drizzle-orm/zod` integration) — forward pointer to the schema-to-Zod pipeline (`createSelectSchema`/`createInsertSchema`) that mirrors this lesson's read/write split at the runtime layer; consumed Ch 042 L8.

Use the Drizzle simple-icon if available.

---

## Scope

**This lesson covers** the two type-inference helpers and everything that hangs off them as *types*: `$inferSelect`, `$inferInsert`, the read/write asymmetry and its three causes (defaults→optional, generated→omitted, notNull-no-default→required), canonical placement/naming of the exported types, composing view/update shapes from inferred types, the prop-threading pattern, the inference quirks (`numeric→string`, `jsonb→unknown` without `$type`, enum-as-text), and the relations gap (`$inferSelect` is flat).

**Out of scope — do not teach (owned elsewhere):**
- **Writing actual queries** — `db.select`, `db.insert`, `where`/`orderBy`, operator helpers — **Ch 038 L1**. This lesson shows *types*, never runtime query construction. Elided query bodies only (`// Ch 038 owns this`).
- **Custom-select result-type inference** — when `db.select({ … })` projects a subset, the result type is inferred from the projection, not `$inferSelect` — **Ch 038 L1** (named in the partial-selects watch-out, not taught).
- **Relational query API result types** — the nested shapes from `db.query.…({ with })` — **Ch 038 L3**. This lesson states `$inferSelect` is flat and points there; it does *not* teach the nested inferred types.
- **drizzle-zod** — `createSelectSchema` / `createInsertSchema` / `createUpdateSchema`, override maps, `jsonb` schema pairing — **Ch 042 L8**. Named as the runtime-layer mirror of the read/write split (one sentence, no Zod code).
- **Server Action argument typing and the `Result<T>` return shape** — **Ch 043** (L3 owns `Result`). Named only in the prop/validator chain.
- **Branded ID types layered on `$inferSelect`** — **Ch 005** (recap site if the student needs it; mention by name only if at all).
- **Building/modifying the schema itself** — `pgTable`, column builders, modifiers, keys, FKs, constraints, junctions, relations — **L2–L9, already done.** This lesson *imports* the finished tables; it redeclares nothing.
- **Migrations** — how a schema change becomes SQL — **Ch 040**. The capstone says "run the type checker after a schema edit"; the *migration* half of that loop is named (L1 already established the order-of-operations), not taught.

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- Principle #2 / "schema is the root of a derivation tree" (L1) — the frame this lesson resolves.
- The per-column types and their quirks (L3) — `numeric`, `pgEnum`, `jsonb().$type<T>()`, `.array()`.
- Column modifiers (L4) — `.notNull()`, the three default forms, `.generatedAlwaysAs`, `...timestamps`.
- The PK shape (L5) — `uuid().primaryKey().default(sql\`uuidv7()\`)`, `generatedAlwaysAsIdentity()`.
- FK columns are just their underlying type (L6) — an FK infers as `uuid`/`string`, no special member.
- Relations are a separate TS-side layer (L9) — not visible to `$inferSelect`.
- TS utility types — `Pick`, `Omit`, `Partial`, `&`, indexed access `Type['field']` — met in earlier TS lessons; *used*, not taught.

---

## Notes for downstream agents

- **Deliberate divergences to preserve (do not "fix" back):**
  - The chapter ships the SQL-side PK default `uuid().primaryKey().default(sql\`uuidv7()\`)` (L5), which diverges from `Code conventions.md` §Data layer's `$defaultFn(() => uuidv7())`. When `id` appears in a sample here, use the chapter-canonical SQL-side form. (Conventions correctly note `.default()` columns are optional on `$inferInsert` either way — the asymmetry teaching is identical.)
  - This lesson uses **`TypeCoding`**, not the `DrizzleSchemaCoding` exercise used L3–L8 — deliberate: the answer is a *type*, not runtime SQL, and `TypeCoding`'s LanguageService + Twoslash `^?` is the right grader. No SQL probes here.
- **Version stance:** stable Drizzle surface, consistent with L2–L9. `$inferSelect`/`$inferInsert` are identical on the stable surface and Drizzle 1.0 (now RC, June 2026), so **no version parenthetical is needed** on the helpers themselves. The drizzle-zod forward pointer should use the **`drizzle-orm/zod` subpath** (L1's forward-looking-1.0 note; verified the standalone `drizzle-zod` package was folded into the subpath in 1.0). Relations forward-references use v2 `defineRelations` (L9).
- **Verified June 2026:** `$inferInsert` omits generated/identity columns and makes defaulted columns optional; `numeric` infers as `string` (intentional, runtime value is also a string from the pg driver — the "money math handles the boundary" claim holds); `jsonb` without `$type` infers as `unknown`; `$inferSelect`/`$inferInsert` are non-composable (`Date | null` vs `Date | null | undefined`) — which is why the update-type section pins `id` explicitly rather than reusing select members.
- **Reuse, never redeclare** the running-domain tables (`invoices`, `organizations`, `invoiceLineItems`, `tags`, `users`, `memberships`, `invoiceTags`, `webhookDeliveries`) — import illustratively. Canonical column shapes are settled in L2–L9; honor them.
- MDX should be **prose-complete with `{/* TODO START … */}` component stubs** carrying full author specs (matching L1–L9), for the downstream component-build pass.
