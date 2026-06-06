# Lesson 1 — The eight builders

## Lesson title

- Title: The eight builders
- Sidebar label: The eight builders

## Lesson framing

Foundational lesson of Chapter 042 and the student's **first hands-on Zod**. Chapter 009 already taught the discipline (parse `unknown` at every wire seam, then validate with Zod) and named Zod without writing it; Chapter 004 taught literal unions as the senior reach for finite domains; Chapter 037 promised "Zod validators derive from `db/schema.ts`." This lesson cashes the first promise: it teaches the schema vocabulary that the whole chapter — and Units 6–23 — compose from.

The single concept everything hangs on, and the lesson's opening move: **one schema declaration produces two things at once — a runtime parser and a static TypeScript type.** `const invoiceSchema = z.object({...})` is a value with a `.parse()` method; `type Invoice = z.infer<typeof invoiceSchema>` is the type, derived, never hand-written. The student already knows the *types* (ch004); the new idea is that you author the *runtime validator* and the type falls out for free. Land this before any builder catalog, or the builders read as a disconnected API tour.

Pedagogical spine: this is reference-heavy content (eight constructors) but must stay senior-mindset, not a method dump. Three devices keep it from flattening into an API list:
1. **A concrete domain that threads the whole lesson** — a Server Action receiving a `formData` for creating an invoice (email, quantity, status, tags). Every builder is introduced because *this input needs it*, not in the abstract. The invoicing domain is the course's running project (Chapter 041 built its data layer), so the student already knows these entities.
2. **Escalating complexity** — primitives → objects → collections → finite domains → variants. Each tier is the natural next question after the last. Minimize cognitive load: a schema is "a shape made of smaller shapes," and we build outward.
3. **The senior decision at each fork** — `z.object` vs `z.strictObject` (the silent-key-stripping security footgun), `z.enum` vs a literal-union of `z.literal`s (shorter, faster, gives `.options`), `z.union` vs `z.discriminatedUnion` (error quality). These forks are where the lesson earns its "senior mindset over syntax" stripes; the catalog is the vehicle, the decisions are the payload.

Interactivity is central, not decorative. `ZodCoding` is purpose-built for the one-declaration-two-outputs pitch (fixtures flip ✓/✗ as the student types while a `^?` query shows the inferred type updating) — use it for the anchor moment and for the discriminated-union "impossible state rejected" beat. A `Buckets` drill consolidates the object-mode decision (strict/default/loose). A `ZodPlaygroundCallout` lets the student free-play the full schema against multiple inputs.

v3-vs-v4 thread (chapter rule: name the legacy form once where relevant, write v4 everywhere): the only v3 forms in scope here are `.strict()` / `.passthrough()` (→ `z.strictObject` / `z.looseObject`). Name them once in the object section as "what you'll see in older codebases," then never again. All other v3 deprecations (`z.string().email()`, `message`/`invalid_type_error`) belong to later lessons — do not preempt them.

Mental model the student leaves with: *a Zod schema is an immutable value that (a) parses an unknown input at runtime and (b) contributes a static type via `z.infer`; complex schemas are composed from eight core builders; the default object strips unknown keys and the senior reach for untrusted input is `z.strictObject`; finite string domains are `z.enum`; tagged variants are `z.discriminatedUnion`.* By the end the student can write a `z.object` schema for a realistic action input using all eight builders and read off its inferred type.

Naming-convention note for downstream agents: `Code conventions.md` mandates camelCase schema names (`invoiceSchema` for canonical shapes, `createInvoiceSchema` for action-input shapes) with the inferred type alias in PascalCase below it (`type Invoice = z.infer<typeof invoiceSchema>`). The Chapter 042 outline used `InvoiceSchema` (PascalCase) throughout — **follow the convention, not the outline**: write `invoiceSchema`. This is deliberate; flag is here so the divergence isn't "fixed" back.

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely. A Client Component's `<form>` submits to a Server Action. Before any database write, the action must know the shape and types of every field: `email` is a string, `quantity` a positive integer, `status` one of three legal values, `tags` an array of strings. The raw input is `unknown` (the ch009 discipline) — what turns it into a trusted, typed value? Name the answer: a Zod schema. Define a schema in one sentence — *a runtime parser with a TypeScript type attached* — and state the lesson's promise: the eight builders that compose roughly ninety percent of 2026 production validation, built up from this one invoice-creation input. Warm, brief, four to six sentences. Connect explicitly back to ch009 ("you learned to parse `unknown` at the wire — this is the parser") so the lesson lands as a continuation, not a cold open.

### A schema is a parser and a type at once

The anchor. Teach the dual nature before any builder catalog — this is the load-bearing idea.

- A schema is an immutable value with two jobs: validate an unknown input at runtime, and contribute a static type the rest of the codebase infers from.
- `const invoiceSchema = z.object({ email: z.string(), quantity: z.number() })` produces a schema object exposing `.parse()` (and `.safeParse()`, named here, taught in L5).
- `type Invoice = z.infer<typeof invoiceSchema>` produces the TypeScript type `{ email: string; quantity: number }`. The **same schema feeds both sides** — that is the entire point. No parallel hand-written type; the type is derived.
- Tie to prior knowledge: ch004 taught writing the type by hand; here the *schema* is authored and the type is computed from it. One source of truth, foreshadowing Architectural Principle #2 (ch037) without re-teaching it.

Code: use **`AnnotatedCode`** on a tiny three-line block (the schema const, then the `type … = z.infer<…>` line). Two to three steps, blue: step 1 highlights the schema value and its `.parse()` capability; step 2 highlights the `z.infer<typeof invoiceSchema>` line and explains the type is read *out of* the schema, not declared alongside it. Keep prose to one paragraph per step.

**Exercise (the anchor interaction):** a `ZodCoding` widget. Starter: a minimal `z.object` with `name: z.string()` and a `^?` query on `type X = z.infer<typeof schema>`. Instruction: add a `bio` field and watch two things move together — the fixtures table flips ✓ and the `^?` type gains the field. Two or three fixtures (full object passes, missing-field fails). Pedagogical goal: the student *sees* runtime and type follow from one declaration in the same card. This is the lesson's keystone; everything after is composition.

Tooltip (`Term`): "infer" (TypeScript's act of computing a type from a value/expression rather than being told it explicitly) — students from other languages often read `infer` as a keyword rather than the concept.

### Primitive schemas and the optional/nullable wrappers

The atoms. Keep brisk — these are the building blocks, the interesting decisions come later.

- The primitives: `z.string()`, `z.number()`, `z.boolean()`, `z.date()`, `z.bigint()`. Each accepts the matching JS value, rejects everything else. Mention `z.symbol()` exists; it's vanishingly rare in app code — one clause, move on.
- Wrappers: `z.string().optional()` accepts `string | undefined`; `.nullable()` accepts `string | null`; `.nullish()` accepts both. Show the inferred type shift for each (this is where `optional` earns the `?:` in the inferred object type — concrete, visible).
- The 2026 reflex (the senior decision here): **prefer `.optional()` over `.nullable()`** unless the domain itself uses `null` as a deliberate value. Pairs with the ch004 L1 typing convention (`?:` over `| null` for "absent"). State the rule and the one exception (a column that is genuinely nullable in the database and means "explicitly cleared").

Code: a single **`Code`** block listing the five primitives with a one-line comment each (what JS value each accepts), then a second small block showing the three wrappers on `z.string()` with their inferred types as comments. No need for AnnotatedCode — the content is a flat list, not a focus-the-eye walkthrough.

Watch-out (inline, in this section — not bundled): chaining `.optional().nullable()` equals `.nullish()`; the explicit `.nullish()` scans more clearly. One sentence.

### Object schemas and the unknown-key decision

The first real senior fork, and the lesson's most important watch-out. Spend real time here.

- `z.object({ email: z.string(), quantity: z.number() })` is the workhorse. Its inferred type is the object type with each field's type.
- **The silent-stripping behavior (lead with the danger).** The default `z.object` *strips unknown keys silently* on parse. Killer concrete example: a client POSTs `{ email, password, isAdmin: true }` against a `z.object({ email, password })` schema — the parse **succeeds** and `isAdmin` simply vanishes from the output. No error. For a trusted internal shape that's fine; for an untrusted request body it can mask a client bug or a probing attacker.
- `z.strictObject({...})` rejects unknown keys with an issue. **The senior reach for Server Action inputs and API request bodies** — an extra field there is almost always a contract drift or a bug worth surfacing, not something to swallow.
- `z.looseObject({...})` preserves unknown keys on the output. Used only at the edge of an external integration whose payload shape isn't fully documented and you want extras forwarded.
- v3 note (the one place this lesson names legacy, per chapter rule): older codebases use `.strict()` and `.passthrough()` method chains for these. In Zod 4 the top-level `z.strictObject` / `z.looseObject` builders are canonical. Name once, then only the v4 form appears.

Code: **`CodeVariants`**, three tabs (`z.object` / `z.strictObject` / `z.looseObject`), each showing the same `{ email, password }` schema parsing the same `{ email, password, isAdmin: true }` input, with the differing *output* (stripped / rejected-with-issue / preserved) in a comment. This is exactly the A/B/C comparison CodeVariants is for. First sentence of each tab's prose names the disposition ("Strips silently — fine for trusted, dangerous for request bodies").

**Exercise:** a `Buckets` drill, `twoCol`. Two buckets: "z.strictObject (extra key = bug)" and "z.looseObject (forward extras)" — optionally a third "z.object (trusted internal)". Items are real boundaries: "Server Action input from a form", "incoming public API request body", "parsing your own config object you just built", "a webhook payload from a vendor whose docs lag the API", "narrowing a row you just read from your own DB". Goal: cement the *decision* (which object mode for which boundary), which is the durable senior skill — the syntax is trivial, the placement is the judgment.

Aside (`caution`): the silent-strip footgun restated tersely as the takeaway — for any untrusted boundary, reach for `z.strictObject` so a malformed contract surfaces instead of vanishing.

### Arrays and tuples for collections

Two collection builders; the decision between them is small but real.

- `z.array(z.string())` accepts a string array; inferred type `string[]`. Length constraints attach inline: `z.array(z.string()).min(1).max(100)` (at-least-one tag, at-most-a-hundred).
- `z.tuple([z.string(), z.number(), z.boolean()])` accepts a fixed-length, position-meaningful array — exactly `[string, number, boolean]`. Inferred as a tuple type.
- The decision (the watch-out, inline): `z.tuple` is for fixed-length, position-typed data (a coordinate pair, a CSV row); it is **not** "an array whose elements can be one of two types." For that, `z.array(z.union([...]))`. Beginners reach for tuple when they mean a heterogeneous array — name it explicitly.

Code: one **`Code`** block, array with `.min(1).max(100)` and a tuple side by side, inferred types in comments. Flat list content; no walkthrough component needed.

### Finite domains: literals and enums

Where ch004's literal-union discipline becomes operational in the schema layer. Senior fork: `z.enum` vs a union of `z.literal`s.

- `z.literal('paid')` accepts only the string `'paid'`, infers as the singleton type `'paid'`. The atom of a finite domain.
- `z.enum(['draft', 'sent', 'paid', 'overdue'])` — **the senior reach for finite string domains.** Infers as `'draft' | 'sent' | 'paid' | 'overdue'` (the exact literal union from ch004), validates exactly those four, and exposes the `.enum` accessor — an object indexable as `invoiceStatus.enum.paid`, for referencing a legal value at runtime without a stringly-typed magic literal (e.g. setting a default in code). VERIFY against current docs before asserting any *other* accessor name: `.enum` is the documented Zod 4 surface (`.Enum`/`.Values` were removed in v4); confirm `.options` against the live runtime if you want to show iterating the values for a `<select>`, otherwise omit it.
- The equivalence, named once: `z.enum([...])` ≡ `z.union([z.literal('draft'), z.literal('sent'), …])`. The enum is shorter, faster, and yields the `.enum` accessor. **The course pairs literal-union TS types with `z.enum` schemas** — they are the same finite domain expressed on the two sides (type / runtime), which is the whole through-line back to ch004.
- Watch-out (inline) — **get this exactly right, it's a corrected fact**: when the array is written **inline** (`z.enum(['draft', 'sent', …])`) Zod 4 infers the literal types directly and `as const` is **not** needed. But if the array is **hoisted to a variable** first (`const statuses = ['draft', …]; z.enum(statuses)`), TypeScript widens it to `string[]` and the inferred enum type collapses to `string` — there you **must** write `as const` on the variable (`['draft', …] as const`). The senior reflex: pass the literal array inline, or `as const` the hoisted one. Show both so the student knows which case needs the annotation.

Code: a plain **`Code`** block showing inline `z.enum([...])` with the inferred union as a comment, plus a second two-line snippet contrasting the bare-variable (widens to `string`, broken) vs `as const` variable (correct) case — this is the corrected-fact moment and deserves the visible before/after. If you choose to demonstrate the `.enum` accessor, surface it with `CodeTooltips` (a one-line "indexable object of the legal values"); do not tooltip an accessor you haven't confirmed exists.

Tie-back: explicitly connect to ch004 — "you wrote `type Status = 'draft' | 'sent' | 'paid' | 'overdue'` as the senior way to type a finite domain; `z.enum` is that same domain as a runtime contract, and `z.infer` gives you the union back."

### One input, many shapes: unions and discriminated unions

The compositional payoff and the chapter's most important variant-validation idea. Senior fork: plain `z.union` vs `z.discriminatedUnion`, decided on error quality and performance.

- `z.union([z.string(), z.number()])` accepts either; inferred `string | number`. Honest use is *shapeless* alternatives (a value that's genuinely a string-or-number). Used sparingly.
- **`z.discriminatedUnion('kind', [...])` — the senior default for tagged variants.** Example grounded in a real notification payload (a shape Unit 8 will actually send): `z.discriminatedUnion('kind', [ z.object({ kind: z.literal('email'), to: z.email-or-string }), z.object({ kind: z.literal('sms'), phone: z.string() }) ])`. (Use `z.string()` for `to` here — `z.email()` is L2's job; do not preempt it.)
- **Why discriminated, not plain union (the payload, documented-wins-first):** a plain `z.union` is *naive* — it tries the input against every branch in turn and takes the first that matches; for many branches that's slow, and a failure can't say *which* branch was intended. `z.discriminatedUnion` reads the discriminator key first and routes straight to the one matching branch: faster validation, and the intent is explicit in the schema (these variants are distinguished by `kind`). The practical consequence the student feels is **clearer errors** — a failed discriminated parse points at the real problem in the intended branch (or "no matching discriminator") rather than a plain union's stacked dump of every branch's issues. (The exact error *text/shape* differs by version — do not hard-code an error string in prose; let the live `ZodCoding`/playground runtime show it, and describe the difference qualitatively.) This is the senior reach for any tagged variant in a request body or webhook payload.

Code: **`CodeVariants`**, two tabs — "Plain union" vs "Discriminated union" — same two-variant notification shape, each parsing the same *invalid* input (e.g. `{ kind: 'email' }` missing `to`). Frame the contrast qualitatively in the prose (noisy multi-branch failure vs single targeted issue); if you show an error in a comment, copy it from the actual runtime rather than inventing the string. The comparison framing makes the argument visible rather than asserted.

**Exercise (second `ZodCoding`, the variant keystone):** reuse the doc's discriminated-union pattern. Starter is a loose `z.object` with a string `status` plus a pile of `.optional()` fields that permits an impossible combination; instruction: rewrite as a `z.discriminatedUnion` on the tag so the impossible case is rejected at the runtime contract. Fixtures include the three legal variants (pass) and one impossible combination (fail). Goal: the student feels discriminated unions making illegal states unrepresentable *and* unparseable — the runtime teeth behind ch004's "make illegal states unrepresentable" type-level idea. The `^?` query shows the inferred type becoming a proper tagged union.

Tooltip (`Term`): "discriminator" (the shared literal-typed field — here `kind` — whose value tells the parser which branch to validate against).

### Two schemas at the edges: unknown and never

Brisk closer to the catalog. Named, not dwelt on.

- `z.unknown()` accepts anything, infers as `unknown` — the schema-layer expression of ch009's "parse to `unknown`, then narrow." The honest type for a payload you haven't validated the inside of yet (and the placeholder a `jsonb` column gets until you give it a real shape — forward-pointer to L7, one clause).
- `z.never()` accepts nothing, infers `never`. Rare in app code; shows up proving exhaustiveness in conditional/variant types (ch004's `never` corner). One sentence.

Code: a single tiny `Code` block, both with their inferred types as comments. No exercise — these are recognition-level, not practice-level.

### Where schemas live and what they're named

Close the loop on placement and the naming convention the rest of the chapter assumes. Short but load-bearing for cross-chapter consistency.

- Schemas live alongside the domain types in `/lib` (canonical shapes) — formalized as the source-of-truth pattern in L4 and L7; here just establish the file-local habit.
- **The 2026 naming convention (state it explicitly, it diverges from a beginner's instinct):** the schema const is camelCase — `invoiceSchema` for a canonical entity shape, `createInvoiceSchema` for an action-input shape that mirrors a mutation. The inferred type alias is PascalCase, declared directly below: `type Invoice = z.infer<typeof invoiceSchema>`. Type below schema, same file. This is the shape every consumer in Units 6–23 imports from.
- Why it matters: one declaration, two exports (the schema for runtime, the type for compile-time), co-located so they can never drift.

Code: one **`Code`** block showing the canonical file shape — `invoiceSchema` const (a `z.object` pulling together several of the eight builders: `z.email()`-deferred-so-`z.string()` for email, `z.number().int().positive()` for quantity, a `z.enum` for status, `z.array` for tags) immediately followed by `type Invoice = z.infer<typeof invoiceSchema>`. This block doubles as the lesson's synthesis — the invoice input from the introduction, now fully realized with the builders just taught. Keep number constraints minimal (`.int().positive()` is fine and intuitive; the full constraint catalog is L2).

**Free-play (optional, end of section):** a `ZodPlaygroundCallout` prefilled with the assembled `invoiceSchema` and three sample `values` (one valid invoice, one with a bad status, one with an extra key to show object-mode behavior). Remember the playground requires the schema body to end with `return schema`, and `values` are JS expressions (quote string literals). Set the `version` prop to a current Zod 4 release (stable is 4.4.x as of mid-2026; the component's default is older) so the runtime matches the syntax taught. Lets the student poke the whole thing against live inputs in the real Zod runtime before the chapter moves on. Message: "Drop your own fields in and watch which inputs the contract accepts."

### External resources (optional)

One or two `ExternalResource` cards: the Zod 4 basics / defining schemas page (official docs), and optionally the Zod Playground home. Keep to genuinely useful, current references.

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The parse-`unknown`-then-validate discipline and *why* the wire boundary is untrusted (ch009 L1) — one sentence in the intro, it's the motivation.
- Literal unions as the senior way to type a finite domain (ch004 L1) — referenced as the type-side partner of `z.enum`, one clause, not re-explained.
- `unknown`/`never` as TS corners (ch004 L1) — assumed; the schema versions are shown, the type concepts are not re-derived.

**Explicitly out of scope (belongs to later lessons — do not preempt):**
- **String-format builders** — `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`, IP/ID encodings, and number/string/date *constraint* catalogs (`.min`/`.max`/`.int`/`.regex` beyond the one or two intuitive ones needed for the synthesis block). All of L2. Use `z.string()` where an email/url would later go; use only `.int().positive()` for numbers. Do **not** show `z.email()` or `z.string().email()`.
- **Refinements and transforms** — `.refine`, `.superRefine`, `.transform`, `.overwrite`, `.pipe`. All of L3. No custom checks in this lesson.
- **Inference helpers beyond `z.infer`** — `z.input` / `z.output`, and the composition methods `.extend` / `.merge` / `.pick` / `.omit` / `.partial` / `.required` / `.readonly`, `z.record`, `z.intersection`, recursive schemas, `.describe`. All of L4. This lesson uses `z.infer` only, and does not derive variants.
- **`parse` vs `safeParse` and the error contract** — the `ZodError` anatomy, `z.treeifyError`, the unified `error` option / custom messages. All of L5. Mention `.parse()` and `.safeParse()` exist as the schema's methods (the ZodCoding harness runs `safeParse`), but do **not** teach the throw-vs-Result decision or error shapes, and do **not** pass an `error` option to any builder.
- **The FormData boundary** — `z.coerce`, `z.preprocess`, `Object.fromEntries(formData)`, the checkbox/empty-string traps, `File` validation. All of L6. The intro can *motivate* with "a form submits to an action," but this lesson validates an already-shaped object, not raw `FormData`. No `z.coerce` here.
- **`drizzle-zod`** — `createSelectSchema` / `createInsertSchema` / `createUpdateSchema` and generating schemas from the table. All of L7.
- **v3 legacy beyond `.strict()`/`.passthrough()`** — do not catalog `z.string().email()`, `message`/`invalid_type_error`/`required_error`, or `error.format()`. Each is named once in its own later lesson. The only v3→v4 callout in this lesson is the object-mode one.
- **Server Actions themselves** — Chapter 043. The action is the *motivating frame* for the input shape, not a thing this lesson builds.
