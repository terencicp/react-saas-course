# Lesson 4 — Derive, don't duplicate

**Title (h1):** Derive, don't duplicate
**Sidebar label:** Derive, don't duplicate

---

## Lesson framing

**What this lesson is.** Two halves welded by one reflex. Half one (the conceptual spine): a SaaS entity spawns many schema variants — DB insert shape, create-input shape, patch shape, public-response shape — and hand-writing each one is a drift bug waiting to ship. The senior move is to declare **one canonical schema** and **derive** every variant with composition methods. Half two (a sharp, smaller idea): once a schema carries a `.transform`, its parse *input* type and parse *output* type diverge, and `z.infer` only gives you the output — so `z.input` / `z.output` exist for the cases where that gap matters (`z.coerce` form schemas, string→`Date` transforms).

**The keystone mental model the student leaves with.** A schema is a *value you can do algebra on*. `invoiceSchema.pick(...)`, `.omit(...)`, `.extend(...)`, `.partial()` each take a schema and return a new schema — same family of operations as `Pick`/`Omit`/`Partial` on types (ch004 L6), but on the runtime+type pair at once. Because the type is *inferred* from the schema, deriving the schema derives the type for free. One source, every surface, drift becomes impossible-by-construction rather than caught-in-review.

**Why this matters / the pain it relieves.** The student already knows (L1–L3) that one `z.object` yields a parser and a type. The unspoken trap: they'll reach for a *second* `z.object` the moment a form needs a subset, then a *third* for the PATCH body, and now three schemas must be kept in lockstep by hand. This lesson is the inoculation. Frame it in production stakes: the entity gains a `currency` column six months in; with derivation, the create-input, patch, and response schemas all pick it up (or deliberately don't) from one edit; with copies, two of five silently still reject it.

**Connect to prior knowledge.** Lean hard on ch004 L6's utility-type toolbox — the names map almost 1:1 (`.pick`↔`Pick`, `.omit`↔`Omit`, `.partial`↔`Partial`, `.required`↔`Required`, `.readonly`↔`Readonly`). The pitch: "you learned these as type operators; Zod gives you the *runtime* twin, and the type comes along because it's inferred." This is the single most effective scaffold in the lesson — state it explicitly and early.

**Running example.** Continue the chapter's `invoiceSchema` (L1: `email`/`quantity`/`status` enum/`tags`) and `userSchema`. The outline's framing uses `userSchema` (signup wants `email+password+name`, profile-edit wants `name+avatarUrl`, public response strips the password) — adopt that as the spine because it makes `.omit` of a sensitive field land viscerally. Keep the invoice entity for the `.partial`/PATCH and `z.input`/`z.output` (coercion) beats so the chapter's through-line holds.

**Pedagogical shape.** Mostly reference (a method catalog) wrapped around two genuinely conceptual beats: the derive-don't-duplicate reflex (open with it, motivated by a drift scenario) and the input/output split (the lesson's one "aha", best taught with a `^?`-moves visual). Cognitive-load management: teach the *narrowing* methods first (`.pick`/`.omit` — most common, most intuitive), then *adding and combining* (`.extend` plus the spread merge `{ ...a.shape, ...b.shape }` — `.merge` is deprecated in v4, see body), then *modifier flips* (`.partial`/`.required`/`.readonly`), then the two specialist builders (`z.record`/`z.intersection`), then the input/output split last as its own section. Name `.describe` and recursive schemas briefly where they fit; both are "named once" per the outline.

**Naming convention (load-bearing, from continuity notes — do NOT use the outline's PascalCase).** Schema const is camelCase (`userSchema`, `createUserSchema`, `updateInvoiceSchema`, `publicUserSchema`); inferred type alias is PascalCase on the line directly below (`type User = z.infer<typeof userSchema>`); same file, in `/lib`. Every derived schema's *name signals its role*. This convention is set in L1 — match it exactly, the lesson does not re-justify it.

**Components at a glance.** `ZodCoding` is the workhorse (derivation is exactly "one declaration → type + runtime", and fixtures double as the type-shape check). One `AnnotatedCode` for the family-of-derivations overview. One `CodeVariants` for the headline before/after (three hand-written schemas vs. one canonical + derivations). One small diagram (HTML+CSS or `ArrowDiagram` inside `<Figure>`) for the one-source-many-variants fan-out. `TypeCoding` for the input/output split if a pure-type `^?` drill reads cleaner than a Zod runtime one. `Term` tooltips sparingly. `ZodPlaygroundCallout` pinned `version="4.4.3"` once.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. One `userSchema` already exists (canonical user). Now three needs land in one sprint: the signup form wants `email + password + name`; profile-edit wants `name + avatarUrl`; the public profile endpoint must return everything *except* the password hash. Pose the fork: write three fresh `z.object`s and babysit them, or derive all three from the one source? State the lesson's promise — the composition methods (`.pick`/`.omit`/`.extend`/ the spread merge /`.partial`/`.required`/`.readonly`) plus the `z.infer`/`z.input`/`z.output` trio that closes the type side. Keep it to a short paragraph; the drift cost gets dramatized in the next section, don't front-load it here.

Connect-back sentence: "In ch004 you reshaped *types* with `Pick`, `Omit`, `Partial`. Zod gives you the runtime twins — and because the type is inferred, reshaping the schema reshapes the type for free." This sentence is the lesson's thesis; make it prominent.

### The drift bug derivation prevents

**Goal:** make the student *feel* the pain before handing them the cure — defaults-before-conditionals, but the "default" here is the naive copy-paste they'd reach for, and the threshold it crosses is "the entity changed and two of N copies didn't."

Use **`CodeVariants`** with two tabs:
- Tab "Hand-written (the trap)": three independent `z.object`s — `createUserSchema`, `updateUserSchema`, `publicUserSchema` — each fully spelled out, visibly repeating `email`, `name`, etc. Prose (one paragraph): looks fine today; the bug is temporal. Add a `currency`/`avatarUrl` field later and you must remember all three sites; miss one and that boundary silently rejects valid input or leaks a field.
- Tab "Derived (the fix)": one `userSchema`, then `userSchema.pick(...)`, `.omit(...)`, `.partial()` producing the same three. Prose: one edit to the source flows everywhere; the variants *can't* drift because they don't independently exist.

Land the reflex as a named principle inline (not bundled at the end): **derive, don't duplicate** — declare one canonical schema (or generate it from the DB, L7), derive the variants, let each variant's name carry its role. Note that this is the schema-layer expression of Architectural Principle #2 (schema is the source of truth) — name the link, don't re-teach the principle.

`Term` candidate: **drift** (two representations of one fact diverging because a change touched one and not the other) — if not already glossed earlier in the chapter, gloss it here.

### Narrowing: `.pick` and `.omit`

**Goal:** teach the two highest-frequency methods first, while motivation is hot. These cover response shapes (omit sensitive) and form inputs (pick editable subset) — the dominant real patterns.

Teach with **`Code`** blocks, tight:
- `.pick`: `userSchema.pick({ email: true, name: true })` keeps exactly those keys → an object schema. Show the inferred type alias beside it (`type CreateUserInput = z.infer<typeof createUserSchema>`).
- `.omit`: `userSchema.omit({ passwordHash: true })` drops one → the canonical "public response strips the secret" move. This is the example that makes omit *matter* — a leaked password hash is a real incident.

Emphasize both return a *new object schema with the source's strictness mode preserved* (forward-reference to the watch-out section, or state inline tersely). Selection uses the `{ key: true }` mask shape — name that it's a mask, not a list, since the student might expect an array.

**Exercise — `ZodCoding`.** The student derives a `publicUserSchema` from a given `userSchema` by `.omit`-ing the password field; fixtures: a full row including password → should still `pass` (omit strips nothing at parse, it just removes the *requirement*/key from the type — clarify this nuance: `.omit` removes the key from the schema's shape, so an input *with* the key parses because the default object mode strips unknown keys), a row missing the password → `pass`, a row missing `email` → `fail`. The `^?` below shows `passwordHash` absent from the inferred type. This exercise nails "narrowing changes the type" via the fixtures-as-type-check property. (Author note: because default `z.object` strips unknowns, an input carrying the omitted key still passes — verify this is the intended teaching point and the fixture's `expect` is set accordingly; if the lesson wants "extra key rejected" semantics it must start from a `strictObject`, which complicates the beat — prefer the simpler default-object framing.)

### Adding and combining: `.extend` and the spread merge

**Goal:** the inverse direction — grow a schema, or fuse two. The senior trigger: form-input schemas that carry UI-only fields the base entity doesn't (the `confirmPassword` case is the canonical one). **Important v4 correction (fact-checked):** this section was originally framed around `.merge`; in Zod 4 `.merge` is **deprecated** and `.extend` is documented as expensive on large/chained schemas. The current senior shape for *combining* two object schemas is the **object spread of their `.shape`** — teach that as the headline, not `.merge`.

**`Code`** blocks:
- `.extend` — *adding a few fields*: `userSchema.extend({ confirmPassword: z.string() })` returns a new object schema with the field added; a same-named key overrides the original (name this — it's how you tighten one field while keeping the rest). The right tool when you're tacking a small number of UI-only fields onto one base.
- **Spread merge — *fusing two named schemas*:** `z.object({ ...userSchema.shape, ...billingFieldsSchema.shape })` produces the union of both. This is the 2026-recommended replacement for v3's `.merge` (and is what `.merge`'s own deprecation message points to): it's plain language-level spread, identical in Zod and Zod Mini, and avoids `.extend`'s quadratic tsc cost when calls would otherwise chain. Right-hand keys win on collision (last-spread-wins), same as any object spread — call this out. Mention `.merge` exists only as the *deprecated* v3 form the student will meet in older codebases (named once, struck-through if shown, like L2's `.email()` chain), then write the spread everywhere.

Keep this section tight. One combined example showing a signup schema built as `userSchema.pick({ email: true, password: true, name: true }).extend({ confirmPassword: z.string() })` ties pick+extend together and previews L3's cross-field refine living on the *derived* schema (the `password === confirmPassword` rule belongs here). Name that forward-link to L3 in one clause; don't re-teach refine.

### Modifier flips: `.partial`, `.required`, `.readonly`

**Goal:** the PATCH-body reflex and the read-side immutability marker.

This is the section that most rewards the ch004 connection — say it again here: `.partial` *is* `Partial`, `.required` *is* `Required`, `.readonly` *is* `Readonly`, but runtime-backed.

**`Code`** blocks:
- `.partial()`: every field optional → the canonical PATCH/update body shape. `userSchema.partial({ name: true })` makes *just* `name` optional (the per-key mask, same shape as pick/omit). The 2026 reflex: derive `updateInvoiceSchema` as `invoiceSchema.partial()` (or from `createInsertSchema(...).partial()`, L7), never hand-write an "everything optional" twin.
- `.required()`: the inverse, for a schema that has optionals you want to force-fill.
- `.readonly()`: infers as `Readonly<T>` **and freezes the parsed value at runtime** — `.parse()` runs `Object.freeze()` on the result, so a later `result.name = '…'` throws (or silently no-ops in non-strict code) as well as failing to type-check. Call this out precisely (fact-checked: it is *both* a type marker and a real runtime guard, unlike the type-only utility `Readonly<T>` from ch004). Senior reach: the read/cache layer where a shared cached object must not be mutated by a consumer (Unit 14, named once). Note this makes `.readonly` like the others — it changes runtime *and* type — but the runtime change is *freezing*, not reshaping.

**Watch-out, inline (this is where it teaches, not a bundled list):** `.partial()` on a schema carrying a *cross-field* `.refine` (from L3, e.g. `password === confirm`) can make the refine unsatisfiable or vacuous because the fields it references are now optional. The fix: re-apply the rule against the new optionality, or derive *before* refining. This is a genuine real-world footgun at the partial/refine seam — give it a sentence and a one-line shape.

**Exercise — `ZodCoding`.** Student turns a given `invoiceSchema` into an `updateInvoiceSchema` with `.partial()`; fixtures: full body → `pass`, single-field `{ status: 'paid' }` → `pass`, empty `{}` → `pass`, wrong-type `{ quantity: 'lots' }` → `fail`. `^?` shows every key now `?:`. Demonstrates the PATCH shape concretely.

### The family of derivations, at a glance

**Goal:** consolidate the catalog into one mental picture before the specialist builders — a "you now have an algebra" beat.

**`AnnotatedCode`** (single block, stepped, blue default, `maxLines` ≤18) over one `userSchema` followed by all four derivations in sequence (`.pick` → create-input, `.omit` → public-response, `.extend` → signup-with-confirm, `.partial` → update). Each `AnnotatedStep` highlights the one derivation line and its resulting role in ≤6 lines of prose. Pedagogical goal: show that *one source* radiates *all* the boundary shapes the app needs, reinforcing the fan-out before the diagram.

**Diagram (small, HTML+CSS or `ArrowDiagram` in `<Figure>`).** A fan: a single box `userSchema` (canonical) on the left, arrows radiating right to four leaf boxes — `createUserSchema` (.pick), `publicUserSchema` (.omit), `signupSchema` (.extend), `updateUserSchema` (.partial). Each arrow labeled with the method. Cap height; horizontal layout per the vertical-space rule. Goal: a single glance that cements "one source, many derived contracts." Keep it deliberately simple — this is a visual aid, not a system graph.

### Two specialist builders: `z.record` and `z.intersection`

**Goal:** cover the two composition tools that *aren't* object-reshaping, with their v4 gotchas, kept tight (these are lower-frequency).

**`z.record` — the v4 two-argument signature.** `z.record(keySchema, valueSchema)` *requires both arguments in v4* (fact-checked) — `z.record(z.string(), z.number())` → `Record<string, number>`. The v3 single-arg form (`z.record(z.number())`) is gone in v4 and fails at the type level — call this out as a migration trap the student will hit in older code. By default `z.record` now *rejects* keys that don't match the key schema; `z.looseRecord(...)` is the pass-through-unmatched-keys variant (name once). Senior reach: open-key-set maps with a known value shape (feature flags, locale dictionaries, the `extra`/`metadata` jsonb column). You can narrow the key too — an `z.enum([...])` key makes Zod exhaustively check every enum value is present (a v4 behavior worth a one-line mention).

**`z.intersection` — for the rare non-object AND.** `z.intersection(a, b)` parses input by *both* schemas. For two object schemas, the spread merge (above) is clearer and cheaper — reserve intersection for the genuine non-object case (a refined primitive AND a separately-refined primitive). State the decision rule crisply: objects → spread `{ ...a.shape, ...b.shape }`; anything else you need to satisfy two schemas → `z.intersection`.

**Watch-out, inline:** for *object* shapes that should *preserve* unknown keys after parse, the answer is `z.looseObject` (L1), not a `z.record` wrapper — name this so the student doesn't misreach.

`Term` candidate: **intersection type** (a value that must satisfy two schemas/types at once; the `&` to a union's `|`) — gloss if ch004's intersection coverage is thin.

### When transforms split the type: `z.infer`, `z.input`, `z.output`

**Goal:** the lesson's one true "aha" and its sharpest distinction. Give it real room — it's the part students get wrong in production.

**Frame the problem first (defaults-before-conditionals).** For a *plain* schema, parse-input and parse-output are the same shape, so `z.infer` is all you ever need — keep that as the 90% default. The conditional that breaks it: a `.transform` (or `z.coerce`, L6) makes the parser *accept* one type and *return* another. Now the schema has **two** types:
- `z.input<typeof s>` — the pre-transform type the parse *accepts*.
- `z.output<typeof s>` — the post-transform type the parse *returns*. **`z.infer` resolves to the output type** — i.e. `z.infer<typeof s>` and `z.output<typeof s>` give you the same thing. State this equivalence explicitly; it's the fact that resolves the confusion (phrase it as behavior, not as a verbatim doc-quoted "alias").

**The canonical motivating case (ties the chapter together).** A Server Action's form-input schema that coerces: `issuedAt: z.coerce.date()` (or `z.iso.datetime().transform(s => new Date(s))` from L3). The form sends a *string* (FormData is string-only, L6 forward-ref) — so the **form contract is `z.input`** (string in). The action body receives a **`Date`** — so the **action's parameter type is `z.output`** (= `z.infer`). Spell out: reach for `z.input` when you need the *raw inbound* shape, `z.infer`/`z.output` for the *parsed* shape. Using the wrong one is the bug — e.g. typing a form helper with `z.infer` when it actually handles the pre-coercion string.

**Teach the split with a `^?`-moves visual.** This is the single best vehicle here — the same trick L3 used to prove transforms move the inferred type. Two options, pick one:
- **`ZodCoding`** with a coercing schema and *two* `^?` queries (one over `z.input<typeof s>`, one over `z.output<typeof s>`) so the student literally sees `string` vs `Date` side by side, plus a fixture proving the string input parses. Preferred — it shows runtime + both types in one card, which is the whole pitch.
- **`TypeCoding`** alternative if a pure-type drill reads cleaner: `expectedQueries` pinning the `z.input` line to `string` and the `z.output` line to `Date`. Use only if the runtime pane adds noise.

**Exercise.** The `ZodCoding` above doubles as the exercise: student is given a schema and asked to fill in the two type aliases (`type FormInput = z.input<...>`, `type Parsed = z.output<...>`) correctly so the `^?` rows resolve to `string` and `Date` respectively, and the string fixture passes. Grading: fixture pass + the inferred-type display matching. This makes the input/output distinction muscle memory.

**Watch-out, inline:** `z.infer` returns the *output* type — for the input shape of a transform/coerce schema, `z.input` is **required**, `z.infer` will silently give you the wrong (post-transform) shape and the mismatch surfaces as a confusing type error downstream, not at the schema.

### `.describe` — the schema's documentation channel

**Goal:** name the field-level doc channel once (per outline), placed here because it's a property of the schema-as-source-of-truth story this lesson tells.

One short `Code` example: `z.string().describe('User-facing display name, NFC-normalized')` attaches human-readable prose to a schema or field. The payoff sentence: consuming tools read it — OpenAPI generators surface it as the field `description`, `drizzle-zod` carries it through, doc pipelines pick it up. The senior framing: when the codebase ships an OpenAPI doc or generated reference, `.describe` is *where the field's prose lives — one source, every surface*, which is the same derive-don't-duplicate ethic applied to documentation. Forward-ref: tool input schemas for LLMs lean on `.describe` heavily (Unit 23, named once). Keep to ~3 sentences; do not over-teach.

### Self-referential shapes: the lazy getter (named once)

**Goal:** acknowledge recursive schemas exist and how v4 handles them, briefly — the outline marks this "named once, rare in line-of-business code."

Two-to-four sentences plus one tight `Code` block. Self-referential shapes (a comment tree, a folder hierarchy) can't reference themselves eagerly. v4's **recommended** pattern (fact-checked) is a **getter** on the object shape — `z.object({ name: z.string(), get children() { return z.array(categorySchema); } })` — which Zod evaluates lazily with no `z.lazy()` or type cast needed. Note that `z.lazy(() => ...)` still exists for explicit/compat cases. State that this is the tree-shaped-UI-state case, uncommon in CRUD entities, and move on. Do not build an exercise here.

### External resources (optional)

One or two `ExternalResource`/LinkCards: the Zod docs page for object methods (pick/omit/extend/partial) and the docs section on `input`/`output`/`infer`. Only if they add value; keep minimal.

---

## Scope

**Prerequisites to redefine concisely (one sentence each, do not re-teach):**
- A schema = a runtime parser with an inferred TypeScript type attached (L1).
- `z.infer<typeof s>` bridges runtime schema → static type (L1).
- `.transform` changes a schema's value *and* its inferred output type; `.overwrite` is the type-preserving variant (L3) — this lesson assumes the student knows transforms move the type, and builds the input/output split on top.
- `z.object` strips unknown keys; `z.strictObject` rejects them (L1) — relevant to the `.pick`/`.omit` strictness-propagation note.
- ch004 L6 utility types (`Pick`/`Omit`/`Partial`/`Required`/`Readonly`/`Record`) — the type-level analogues; this lesson names them as the bridge but does not re-teach them.

**Explicitly OUT (belongs to other lessons — do not cover):**
- `parse` / `safeParse` / `parseAsync`, the `ZodError` anatomy, `z.treeifyError`, the unified `error` option → **L5**. Snippets here may illustrate with `.parse(...)` for brevity (consistent with L3's choice); do not introduce the parse-method decision.
- `z.coerce` mechanics, `z.preprocess`, the FormData-string reality, the checkbox/empty-string traps → **L6**. This lesson *uses* `z.coerce.date()` only as the motivating case for `z.input`/`z.output` and forward-refs the mechanics to L6 — it does not teach coercion semantics.
- `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` and generating schemas from the Drizzle table → **L7**. Mention only as "the canonical source is often *generated*, then you derive on top" — one forward-ref, no API.
- Writing a *brand* on top of a schema for nominal IDs → ch005 L4 owns branded IDs; the schema-side application is named once at most, not taught.
- The Server Action body, the `Result` shape, and form-side error rendering with `useActionState` → ch043 / ch044 (next chapters). The cross-field-refine-on-a-derived-schema point forward-refs to where the rendered error lands, no more.
- Re-justifying the camelCase-schema / PascalCase-type naming convention or Architectural Principle #2 → both established in L1 and ch037; reference, don't re-argue.
- Async refinements / `parseAsync` → L5 + Unit 22.

**Depth ceiling.** `z.record` and `z.intersection` are catalog entries with their v4 traps, not deep dives. `.describe` and recursive schemas are each "named once." The conceptual weight sits on the derive reflex (opening) and the input/output split (closing); the middle is an efficient method walk. Estimated student time 40–50 min.

---

## Code conventions alignment

- camelCase schema consts, PascalCase inferred-type alias on the line below, same file (continuity notes + Code conventions "Schemas with Zod 4"). The outline's PascalCase schema names are **overridden** — flagged for the writer.
- `z.infer<typeof s>` for output type; `z.input<typeof s>` when transforms make input ≠ output — this lesson *is* the canonical teaching of that conventions bullet.
- "Derive variants from one source: `.extend`, `.pick`, `.omit`, `.partial`. Never copy a schema and edit." — this lesson is the source of that rule; the `CodeVariants` before/after dramatizes the "never copy" half. (The conventions doc lists `.extend` for combining; this lesson upgrades that to the v4-current spread `{ ...a.shape, ...b.shape }` since `.merge` is deprecated and `.extend` is costly chained — a deliberate, fact-checked divergence the writer should keep.)
- "One schema per intent" — `createInvoiceSchema`/`updateInvoiceSchema` derived from a base, not hand-written twice.
- Top-level format builders (`z.email()` etc.) where email/uuid fields appear in examples (carry L2's convention forward; do not regress to `z.string()` for an email field now that L2 has introduced `z.email()`).
- Pin `ZodPlaygroundCallout` / `ZodCoding` examples to Zod `4.4.3` (chapter-wide pin from L1/L2/L3 continuity).

---

## Fact-check log (resolved against current Zod 4 docs/issues, June 2026)

1. **`z.record` two-arg** — CONFIRMED required in v4; single-arg form gone. Added: default now rejects unmatched keys, `z.looseRecord` is the pass-through variant; `z.enum` key triggers exhaustive-key checking. Section updated.
2. **Recursive schema** — CONFIRMED the `get`-getter form (`get children() { return z.array(...) }`) is the v4-recommended pattern, lazily evaluated, no `z.lazy`/cast needed; `z.lazy` still supported. Section updated.
3. **`z.input`/`z.output`/`z.infer`** — CONFIRMED all three exist; `z.input` = pre-transform, `z.output` = post-transform. Note: Zod's own API page does not *literally* state "`z.infer` is an alias for `z.output`" — it is widely documented as such and behaves identically, but the writer should phrase it as "`z.infer` resolves to the output type" rather than asserting the alias as a doc quote. Minor softening, not a structural change.
4. **`.readonly()`** — CORRECTED. It is NOT type-only: v4 runs `Object.freeze()` on the parsed result (real runtime immutability) in addition to the `Readonly<T>` type. Outline was wrong; section rewritten.
5. **`.merge` deprecated** — CORRECTED. `.merge` is deprecated in v4 in favor of `a.extend(b.shape)` and, preferred, the spread `z.object({ ...a.shape, ...b.shape })` (better tsc perf, Zod-Mini-portable; `.extend` is quadratically costly when chained). The "Adding and combining" section was re-headlined around spread; `.merge` demoted to a named-once legacy mention.
6. **`.pick`/`.omit`/`.partial` mask** (`{ key: true }`) — CONFIRMED. `.extend` confirmed current (with the large-schema cost caveat above).
7. **`.describe` consumers** — not deep-checked (named-once, low risk); writer to do a light confirm that `z.toJSONSchema`/OpenAPI tooling and `drizzle-zod` still surface it.
