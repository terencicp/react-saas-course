# Lesson outline — Chapter 037, Lesson 1

## Lesson title

- **Title:** Principle #2: the schema is the source of truth
- **Sidebar label:** Schema is the source of truth

---

## Lesson framing

This is a **principle lesson, not a mechanics lesson** (20–25 min, short by design). No `pgTable` API, no column builders taught here — Lesson 2 owns the file's anatomy. The deliverable is a **mental model**, not code the student writes. Every later lesson in the chapter (and Chapters 6, 10, 16) cashes this principle in; this lesson installs it.

Pedagogical center of gravity:

- **Lead with the senior question, not the answer.** The hook is a decision every SaaS codebase faces: the same row shape (invoice: id, total, status, …) shows up in five places — a Drizzle insert, a Server Action's args, a Zod validator, a form's field set, a Server Component prop. *Which one is canonical, and which four derive?* The student has already met most of these surfaces conceptually (Server/Client Components in Unit 4; Zod and Server Actions are previewed as "coming in Unit 6"), so this lands as a real tension, not an abstract rule.
- **The pain must be visceral before the principle is stated.** Beginners don't feel the cost of a hand-typed `Invoice` interface until it rots. The load-bearing teaching move is a concrete, sequenced failure: rename a column, watch four downstream layers silently fall out of sync, ship, 500 in production. Make the student *feel* the drift before naming the fix. This is the "what does this prevent" framing the chapter outline calls for, dramatized.
- **State the principle once, crisply, then make it usable.** Principle #2: `db/schema.ts` is the single source of truth for every typed shape downstream; row types come from `$inferSelect`, insert types from `$inferInsert`, validators from Drizzle's Zod generation (`createSelectSchema` / `createInsertSchema`), form fields from that same Zod, RLS column names from the same file. One file changes; every downstream type checker catches the drift. The student should leave able to *apply* it: recognize a hand-typed row interface as a smell, and know the change-the-schema-first order of operations.
- **Guard against the dogmatic misreading.** A junior who internalizes "schema is the source of truth" too hard reads it as "never write a type." Name the two legitimate carve-outs (external API DTOs; derived view shapes built *from* inferred pieces) so the principle is a tool, not a cage. This is critical — without it the student over-applies and gets confused the first time they legitimately need a narrower shape.
- **Frame everything in production stakes.** The course's thesis is senior mindset over syntax. This lesson is the purest expression of that in the chapter: the entire payload is a decision and its blast radius, with zero new API surface. Keep the tone adult and terse; the student has programming experience and has shipped React. No celebratory scaffolding.
- **Forward-reference generously, but don't teach forward.** The principle's value is almost entirely in what it buys *later*. Name the downstream beneficiaries (queries → Ch 038, schema-derived Zod → Ch 042 L8, Server Actions → Ch 043, forms → Ch 047, RLS → Ch 056) so the student sees the principle is load-bearing, but defer every mechanic. A compact "where this bites later" map is the payoff visual.

Mental model the student should end with: **the schema is the root of a derivation tree.** One node at the top (`db/schema.ts`); every other typed shape is a branch generated from it, never a hand-copied parallel. Editing the root propagates; editing a branch by hand creates a fork that drifts. The type checker is the tool that walks the tree and finds forks.

Visual strategy: this lesson is concept-heavy and code-light, so **lean on diagrams to carry the abstract relationships** rather than long prose. Two diagrams do the heavy lifting (the derivation fan-out and the drift timeline). Code appears only in small illustrative snippets — the canonical-vs-hand-typed contrast and the `$inferSelect` callsite teaser — never as something the student builds.

Code-convention note for downstream agents (deliberate divergence, verified June 2026): the chapter framing commits to the **forward-looking Drizzle 1.0 shapes** — `$defaultFn(() => uuidv7())` / `uuidv7()` for IDs, Relations v2 (`defineRelations`), `casing: 'snake_case'` on the client, and Zod generation via the `drizzle-orm/zod` subpath (the standalone `drizzle-zod` package is deprecated as of Drizzle 1.0 beta and folded into the core package — confirmed via Drizzle releases). The `Code conventions.md` "Data layer" section still documents the older pinned 0.45 stack (v1 relations, separate `drizzle-zod` install) in parentheticals. Follow the chapter framing's 1.0 shapes in any snippet here. Snippets in this lesson are illustrative teasers only — keep them minimal so the API-surface debate never surfaces; Lesson 2 onward owns the real shapes. `$inferSelect` / `$inferInsert` are stable and unchanged across versions (the canonical helpers; `InferModel` is the deprecated older form — do not use it).

---

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete. Paint the recurring scene: a junior building an invoices feature writes the row shape down five times — once as the Drizzle table, once as a `type Invoice` for a Server Component prop, once in a Zod schema for the form, once in the Server Action signature, once in the form's field list. It works on day one. State the lesson's promise in one sentence: by the end the student will know which of those five is canonical, why the other four must be *generated* rather than *retyped*, and what goes wrong the day someone forgets. Name that this is Architectural Principle #2 and that it's the spine of the whole chapter — the schema file the student builds across Lessons 2–9 is the thing every later unit derives from. Keep it to ~4–6 sentences, warm and brief. Do **not** state the principle yet — earn it first.

Reasoning: the pedagogical guidelines require the senior question to live implicitly in the introduction and the topic to be motivated by a concrete problem. Withholding the answer creates the tension that the drift section resolves.

---

### One shape, five spellings

The setup section. Make the five-places problem tangible with a single shared shape.

- Pick one entity for the entire lesson — **invoice** — and reuse it everywhere (consistency lowers cognitive load; the chapter's worked domain is invoices).
- Enumerate the five surfaces the same shape appears on, in plain language with a one-line "what it needs the shape for" each: Drizzle table (what's stored), Server Action args (what the mutation accepts), Zod validator (what the boundary checks), form field set (what the UI renders), Server Component / Client Component prop (what gets passed for render). Frame as surfaces the student *already knows or will soon meet* — anchor to Unit 4 (component props) and forward-name Unit 6 (Zod, actions, forms) as "coming soon."
- Pose the question explicitly as a fork in the road: **option A** — each surface owns its own copy of the shape; **option B** — one surface is canonical and the other four are generated from it. Don't resolve yet; the next section resolves it by showing option A's failure.

**Diagram — the five surfaces (ArrowDiagram, inside `<Figure>`).** A central "invoice row shape" node with five labeled satellite boxes around it (Drizzle table, Server Action, Zod, form fields, component prop). Pedagogical goal: make "the same shape, restated five times" spatially obvious before the student has language for why that's bad. Keep it neutral here (no good/bad coloring yet) — this is the *problem statement* picture. Use block-level anchors; five short arrows from the center out, or color-match if arrows crowd. Cap height well under 800px; horizontal/radial layout.

Tooltip candidates (via `Term`): **DTO** is not used yet here; defer. Consider a `Term` on **source of truth** at first use (one-line: "the single place a fact is defined; everything else reads from it") since the phrase is load-bearing and the student may know it only loosely.

Reasoning: establishing one concrete entity and laying the five surfaces side by side gives the drift section a stage. The fork framing (A vs B) sets up "defaults before conditionals" — the student will reject A on evidence.

---

### The four-way drift

The emotional core of the lesson. This is where the student *feels* the cost of option A (hand-copied shapes). Sequence a single realistic failure end to end.

- Set the scene: the team renames `total` to `amountDue` in Postgres (a routine, reasonable change — a product decision, not a mistake). The migration runs. The Drizzle schema gets updated. So far, so good.
- Then walk the blast radius, one silent failure per downstream surface that was hand-copied:
  1. `lib/types.ts` still has `type Invoice = { …; total: string; … }` — stale, but TypeScript is happy because nothing connects it to the schema. Reads compile against a column that no longer exists.
  2. The Server Action still accepts `{ total }` and hands it to Drizzle, which no longer maps that key — runtime, not compile-time.
  3. The Zod validator still validates a `total` field; the form still posts `total`.
  4. Next deploy: production 500s on the first insert. The type checker said nothing because every hand-copied shape is an island.
- Land the lesson of the sequence: **hand-typed restatements drift silently** because nothing links them back to the schema. The compiler can only protect you across a boundary it can see — and a hand-written parallel type is invisible to it.
- Contrast the counterfactual in one beat: had every shape derived from `db/schema.ts`, the *same* rename would have turned every one of those four silent failures into a red squiggle at edit time. The drift becomes a compile error instead of a 3am page.

**Diagram — the drift timeline (DiagramSequence, inside `<Figure>`).** A scrubbable 4–5 step sequence showing the rename propagating (or failing to). Step 1: all five surfaces aligned (green). Step 2: column renamed in Postgres + Drizzle schema (those two flip to the new name, green). Step 3: the four hand-copied surfaces stay on the old name — mark them stale/red, *but with no error surfaced* (the point: silence). Step 4: deploy → production 500 (red banner). Optional Step 5 / toggle: the derived-from-schema world where step 3 instead lights up four compile errors at edit time (the type checker catches it). Pedagogical goal: time is the missing dimension in a static picture — drift is a *process* where the gap opens silently and detonates later. The scrubber lets the student watch the gap open. This is the single most important visual in the lesson; invest in it.

Reasoning: principle lessons fail when they assert costs the student hasn't felt. A concrete, named, sequenced production incident makes the abstract "drift" tangible and gives the principle something to *prevent*. The counterfactual beat is what converts fear into the rule.

---

### Principle #2, stated

Now name it — the student has earned it.

- State the principle crisply and set it apart visually (an `Aside` of type `note` or `tip`, or a styled callout): **`db/schema.ts` is the single source of truth for every typed shape downstream. Define the shape once, in the schema; generate every other shape from it.**
- Immediately make it concrete with the derivation list — the schema is the root, and here's what each branch is generated *by* (name the tool, defer the mechanic):
  - Row type ← `typeof invoices.$inferSelect`
  - Insert type ← `typeof invoices.$inferInsert`
  - Zod validator ← Drizzle's Zod generation, `createInsertSchema` / `createSelectSchema` (the `drizzle-orm/zod` subpath in Drizzle 1.0; the standalone `drizzle-zod` package is deprecated — downstream agent should name the subpath, not the old install) — Ch 042 L8
  - Form field set ← the same Zod (field names = schema keys) — Ch 047
  - RLS policy column names ← the same schema columns — Ch 056
- State the payoff as a one-liner the student can keep: **one file changes, every downstream layer's type checker catches the drift.** The codebase rewrites itself around a schema edit.

**Diagram — the derivation tree / fan-out (ArrowDiagram or D2 flowchart `direction: right`, inside `<Figure>`).** `db/schema.ts` as the single root on the left; arrows fanning right to the derived shapes (row type, insert type, Zod, form fields, RLS names), each arrow labeled with the generator (`$inferSelect`, `$inferInsert`, drizzle-zod, …). This is the *resolution* of the neutral five-surfaces diagram from "One shape, five spellings" — same surfaces, now with direction: one source, everything generated. Pedagogical goal: cement the root-and-branches mental model and visually answer the fork posed earlier (option B wins). Use a left-to-right flow so it reads as "source → derivations." If ArrowDiagram, anchor at block level with a wide gap for labels; if D2, `flowchart`/graph with `direction: right`. Consider color-matching this diagram's root to the central node of the earlier diagram so the student sees them as the same picture, resolved.

Tooltip candidates: `Term` on **`$inferSelect`** / **`$inferInsert`** with one-line "Drizzle helper that reads a row's / insert's TypeScript type straight off the table — owned in Lesson 10" so the forward reference doesn't stall a reader who wants to know what the arrow means.

Reasoning: stating the principle *after* the drift section means it reads as the obvious fix, not a decree. The derivation tree diagram is the payoff image that the whole lesson builds toward; pairing the statement with the visual locks in the mental model.

---

### What you still hand-write: the two carve-outs

The anti-dogma section. Prevent the over-correction where "schema is the source of truth" gets read as "never declare a type." Critical for a usable principle.

- Frame the risk explicitly: read literally, the principle sounds like "delete every `type` in the codebase." That's wrong. There are exactly two shapes you legitimately author by hand — and both are still *anchored* to the schema, not floating free.
- **Carve-out 1 — external API DTOs.** A public API response is a *deliberately different contract* from the row — usually narrower (hide internal columns, rename for a public audience, omit tenancy fields). It's intentionally not the row, so it doesn't derive from the row. Named, deferred to Chapter 16. One-line example: the row has `internalNotes` and `organizationId`; the public `/api/invoices` shape exposes neither.
- **Carve-out 2 — derived view shapes.** A "dashboard summary" or list-row projection is a real, distinct shape — but it's still *built from* inferred pieces, never re-typed by hand. Show the canonical pattern in a tiny snippet: `type InvoiceSummary = Pick<Invoice, 'id' | 'status' | 'total'> & { organizationName: Organization['name'] }`. The key teaching point: **no field name is restated** — every member is sourced from an inferred type via `Pick`/`Omit`/indexed access. This is composing *from* the source of truth, not forking it.
- The test that separates a carve-out from a smell: *does this shape restate a field name and a field type that the schema already knows?* If yes, it's drift. If it's projecting/narrowing existing inferred members (`Pick`, `Omit`, `&`, indexed access), it's a legitimate derived shape.

**Code — the derived-shape snippet (`Code`, single small block).** The `InvoiceSummary` composition above. Keep it ~3–4 lines. Optionally `CodeTooltips` on `Pick<Invoice, …>` and `Organization['name']` to label them "indexed access — reads the field type from the source" so the student sees these as *links* to the schema, not copies. A simple `Code` block is enough if tooltips feel heavy for a principle lesson.

Reasoning: this is the section beginners most need and most outlines forget. Without it the student either over-applies the principle (paralysis: "am I allowed to write this type?") or, having hit a legitimate need for a narrower shape, concludes the principle is impractical and abandons it. Naming the carve-outs with the "still anchored to the schema" test keeps the principle both strict and livable.

---

### The order of operations

The operational payoff — how the principle changes the student's actual workflow when a shape needs to change.

- Give the sequence as a short ordered procedure (`Steps`):
  1. Change the column in `db/schema.ts` **first** — the source, before anything else.
  2. Generate the migration from the schema (Drizzle Kit — Chapter 040 L1; named, not taught).
  3. Run the type checker. It walks the codebase and surfaces *every* consumer of the changed shape as a compile error — queries, props, derived summaries.
  4. Fix each surfaced site (most are mechanical renames the compiler points you straight at), then ship.
- Land the reframe: this turns a schema change from "remember every place that touched this column" (human memory, lossy) into "follow the red squiggles" (compiler-driven, exhaustive). The schema-first order is what makes the type checker your migration assistant.
- One-line contrast with the wrong order: change a hand-typed interface or a query first and the schema last, and you're back to manually hunting consumers — the compiler can't help because the source of truth moved last.

Reasoning: a principle the student can't *act on* is inert. The order-of-operations turns Principle #2 from a belief into a repeatable move, and frames the type checker as a tool that does the consumer-hunting for you — directly serving the "senior mindset" thesis.

---

### Where this principle bites — and the moves that break it

Wrap-up that (a) shows the principle's reach across the course and (b) names the concrete anti-patterns, then checks understanding.

- **The downstream map.** A compact visual or `CardGrid` showing the chain from `db/schema.ts` outward to its beneficiaries, each tagged with where it's owned: queries return `$inferSelect` types (Ch 038), Drizzle's Zod generation turns the schema into validators (Ch 042 L8), Server Actions parse with that Zod (Ch 043), forms read the Zod field names (Ch 047), RLS reads the column names (Ch 056). Pedagogical goal: the value of Principle #2 is almost entirely downstream; one glance shows the student this isn't an abstract nicety but the load-bearing root of a dozen later contracts. Keep it a simple horizontal flow or a grid of "layer → what it derives" cards — not a dense graph.
- **The three drift-in-disguise moves** (the chapter outline's watch-outs, taught as named anti-patterns, each with the *why*):
  - **Hand-typed row interfaces rot silently** — the headline smell; a `type Invoice = { … }` anywhere is the signal Principle #2 was skipped. (Lesson 10 will make `$inferSelect` the canonical replacement.)
  - **`as any` to bridge a stale type to a new schema** — doesn't fix drift, it *hides* the one error that would have told you about it. Amplifies the bug instead of surfacing it.
  - **Copying a Zod schema's field list off the Drizzle table by hand** (instead of generating with `createInsertSchema` / `createSelectSchema`) — the exact same drift, in slow motion: the two field lists agree today and silently diverge on the next schema edit.

**Exercise — Buckets (classification).** Title/instructions: "Source of truth, or drift in disguise?" Two buckets: **Derive from the schema** vs. **Legitimately hand-written**. Chips (each a short scenario):
- "A `type Invoice` you typed by hand in `lib/types.ts`" → derive (smell)
- "`type Invoice = typeof invoices.$inferSelect`" → derive (correct form)
- "A Zod schema whose fields you copied from the Drizzle columns" → derive (smell)
- "A Zod schema generated with `createInsertSchema(invoices)`" → derive (correct form)
- "The public `/api/invoices` response shape, intentionally narrower than the row" → hand-written (DTO carve-out)
- "`type InvoiceSummary = Pick<Invoice, 'id' | 'total'>`" → hand-written / derived-from-inferred (carve-out; allowed)
- "A `Partial<NewInvoice>` for an update payload" → derive (sourced from `$inferInsert`)

Grading: bucket match. Pedagogical goal: force the student to *apply* the carve-out test rather than recognize prose — discriminating the smell from the legitimate hand-write is exactly the judgment this lesson teaches. (Per the MCQ doc's principle, the chips are scenarios, not verbatim lines from the prose.)

Optional second check — **MultipleChoice** (single, scenario-framed): "A column is renamed in `db/schema.ts` and the migration runs. A hand-typed `type Invoice` in `lib/types.ts` still names the old column. What happens?" Choices probe the *silent* failure mode (correct: it compiles fine and fails at runtime/deploy because nothing links the interface to the schema; distractors: TS errors immediately / Drizzle auto-updates it / the migration fails). `McqWhy` reinforces "the compiler only protects boundaries it can see."

Reasoning: ending on the downstream map answers "why should I care" with reach, and the named anti-patterns give the student a concrete grep-able vocabulary for code review. The Buckets exercise is the right check for a principle lesson — it tests *judgment* (smell vs. carve-out), which is the transferable skill, far better than recall of a definition. Keep exercises light; this is a 20–25 min lesson.

---

### External resources (optional, `ExternalResource` cards)

- Drizzle docs on `$inferSelect` / `$inferInsert` (type inference / "Goodies") — the canonical reference the student will return to in Lesson 10.
- Drizzle Zod-schema-generation docs (`drizzle-orm/zod`) — forward pointer for the Zod-from-schema pipeline (Ch 042).

Keep to 1–2 cards; this is a principle lesson, not a reference dump.

---

## Scope

**This lesson teaches:** Architectural Principle #2 as a mental model — `db/schema.ts` as the single source of truth from which row types, insert types, Zod validators, form field sets, and RLS column names derive; the four-way drift it prevents; the two hand-write carve-outs (API DTOs, derived view shapes); the schema-first order of operations; and the named drift anti-patterns.

**Out of scope — defer, do not teach (redefine prerequisites in one line only if needed):**

- **The `pgTable` API, the `db/` folder layout, column builders, `casing: 'snake_case'`** — Lesson 2. This lesson shows *no* table-definition syntax; snippets are inference/derivation teasers only.
- **`$inferSelect` / `$inferInsert` mechanics** (the per-type mapping, insert vs. select asymmetry, defaulted-column optionality) — Lesson 10. Here they appear only as *named generators* on the derivation diagram; the student doesn't write them or learn how they resolve.
- **drizzle-zod and the schema-to-Zod pipeline** (`createInsertSchema`, override maps) — Ch 042 L8. Named as the Zod generator only.
- **Postgres data types, column modifiers, primary keys, foreign keys, constraints, junctions, Relations v2** — Lessons 3–9. Mentioned only as "the shape the schema will eventually hold."
- **RLS policies** — Ch 056. Named only as a downstream consumer of column names.
- **Public API DTOs at depth** — Chapter 16. Carve-out 1 is named with a one-line example, not developed.
- **Server Actions / forms / Zod parsing mechanics** — Unit 6. Referenced as downstream beneficiaries with one-line context only.

**Prerequisites the student already has (assume, don't re-teach):** TypeScript types/interfaces, `Pick`/`Omit`/indexed access (Unit 1, esp. Ch 005 branded-types/utility-types context); discriminated unions and the "make impossible states unrepresentable" instinct (Ch 005, Architectural Principle #7) — the same single-source-of-truth instinct, now applied to the data layer; Server/Client Component props (Unit 4); the relational model and that a schema file is coming (Ch 036). Zod and Server Actions are *previewed* (Unit 6) — forward-reference, don't assume mastery.

**Connect to prior principles:** briefly tie Principle #2 to the same family the student has met — Principle #1 (co-locate by feature, Ch 029), #6 (explicit over magic, Ch 030), #7 (impossible states unrepresentable, Ch 005). The through-line: a senior codebase has *one* place each fact lives. Principle #2 is that instinct applied to typed data shapes. One or two sentences, not a recap.
