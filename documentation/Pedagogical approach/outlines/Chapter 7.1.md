# Chapter 7.1 — Zod 4: the validation contract: pedagogical approach

## Concept 1 — One declaration, two outputs: the runtime parser and the static type

**Why it's hard.** The student arrives carrying two parallel habits from older codebases: a hand-written TypeScript `interface` for shape, plus a separate validator (Joi, yup, hand-rolled `if`s) for runtime checks. The two drift. The schema-as-source-of-truth posture is the inversion — *one* declaration produces both the type the rest of the code consumes and the runtime parser the boundary calls — and until that duality lands, every following lesson reads as "another way to write the same thing twice."

**Ideal teaching artifact.** Concept archetype delivered as a **dual-pane reveal** in `ZodCoding`. The student sees a single `InvoiceSchema = z.object({ ... })` declaration on the left; below it, two annotated outputs are pinned: (a) the `^?` Twoslash query showing `type Invoice = z.infer<typeof InvoiceSchema>` resolving to the inferred shape, and (b) the live fixtures table showing `safeParse` accepting the matching payload and rejecting a malformed one. The student's job is small — flip one field from `z.string()` to `z.number()` — and watch *both* outputs respond in lockstep: the inferred type updates to `number`, the previously-passing payload now fails the parse with a type-mismatch issue. The duality is felt in the fingers, not asserted in prose. The closing line names the principle that the rest of the chapter rests on: every schema in the codebase is the type *and* the parser; never write the type by hand and the parser by hand against the same data.

**Engagement.** A `MultipleChoice` PR-review round of four scenarios after the artifact: a teammate adds `type Invoice = { ... }` next to `InvoiceSchema`; a teammate writes the schema's fields to match a hand-written interface above it; a teammate writes `type Invoice = z.infer<typeof InvoiceSchema>` next to the schema; a teammate exports just the schema and lets consumers each `infer` it. The student picks the one a senior approves, and wrong answers each name the drift class.

**Components.**
- `ZodCoding` for the dual-pane reveal — the widget already pairs the inferred-type pane with the fixtures table, which is exactly the duality the concept teaches.
- `MultipleChoice` for the PR-review round.
- `Aside` (`note`) below: "the schema is the type *and* the parser; never write either by hand against the same data."

**Project link.** Every Zod schema in 7.6 — `CreateInvoiceInputSchema`, `UpdateInvoiceInputSchema`, the form-input shapes — relies on the inferred type being the action's parameter shape. The student should never see a hand-written input type next to a Zod schema in the project starter.

---

## Concept 2 — The eight builders as a navigable map, not a survey

**Why it's hard.** Zod's surface is large enough that a student who reads through the docs end-to-end forgets which builder serves which fact within a week. The chapter's cut — primitives, objects in three flavors, arrays + tuples, literals, `enum`, `union`, `discriminatedUnion` — covers ninety percent of production validation, and the cut itself is load-bearing. Without a single picture the student can return to, the eight builders read as eight unrelated entries instead of a closed set.

**Ideal teaching artifact.** Reference archetype delivered as a **trigger-driven catalog** rendered inside `Figure`. Two columns: *the fact you're validating* (a single value, a record of fields, a homogenous list, a fixed-position list, a singleton string, a finite domain of strings, "either of two shapes," "one of N tagged shapes") and *the builder that fits* (`z.string`/`z.number`/etc., `z.object` family, `z.array`, `z.tuple`, `z.literal`, `z.enum`, `z.union`, `z.discriminatedUnion`). A third column carries one canonical line of code per row. The artifact reads top-to-bottom as the *decision* the student makes at the keyboard — *what fact am I validating?* — not as a list of API methods to memorize. The senior posture lands at the bottom: this is the closed set; everything else is composition on top of these eight.

**Engagement.** A `Buckets` sort: twelve facts dropped from a SaaS surface ("an invoice's status is one of `draft / sent / paid / overdue`", "a webhook event is either a `charge.succeeded` or a `customer.created`", "a customer's tags are an array of free-form strings", "a coordinate is `[number, number]`", etc.) into the eight builder buckets. Wrong-answer feedback names the discriminator that should have driven the call (finite vs free, tagged vs untagged, fixed-position vs homogenous).

**Components.**
- `Figure` wrapping a hand-coded HTML table for the trigger-driven catalog. Single-use static composition; no bespoke component earns its weight.
- `Buckets` for the fact-to-builder sort.
- `Aside` (`tip`) below: "the question at the keyboard is *what fact am I validating?*, not *what method does Zod offer?*"

**Project link.** The 7.6 schemas reach for these eight builders and only these eight; the student should be able to point at every field in `CreateInvoiceInputSchema` and name the row of the catalog it came from.

---

## Concept 3 — Strict, default, and loose objects: the unknown-key policy is the senior decision

**Why it's hard.** The trap is silent. The student writes `z.object({ email, password })`, a malicious or buggy client sends `{ email, password, isAdmin: true }`, the parse succeeds because the default `z.object` *strips* unknown keys, and the `isAdmin` field vanishes without a trace — usually fine, occasionally catastrophic. The junior reads "object" and reaches for `z.object` everywhere; the senior reads the call site and asks *what does an unknown key mean here?* Three answers map to three builders, and the choice is not interchangeable.

**Ideal teaching artifact.** Decision archetype delivered as a **same-payload-three-builders contest** in `CodeVariants`. The student sees one input — `{ email: 'a@b', password: 'x', isAdmin: true }` — parsed against `z.object`, `z.strictObject`, and `z.looseObject` versions of the same `{ email, password }` shape. Three tabs, same input, three different outputs: tab one returns `{ email, password }` with `isAdmin` silently dropped; tab two returns a parse failure with an `unrecognized_keys` issue; tab three returns `{ email, password, isAdmin }` with the unknown key preserved. Below each tab, the senior trigger that earns it: `z.object` for trusted internal shapes where extra keys don't matter; `z.strictObject` for request bodies and Server Action inputs where an extra field is usually a client bug worth surfacing; `z.looseObject` at the edge of external integrations where the payload shape isn't fully documented. The closing rule: at every untrusted boundary in this course, `z.strictObject` is the default; the other two are conditionals.

**Engagement.** A `MultipleChoice` round of four boundary scenarios — a Server Action receiving a form submission, an internal `/lib` helper parsing its own constructed value, a webhook receiver consuming a Stripe event with documented and undocumented fields, a route handler accepting a JSON body from a third-party integration whose schema may evolve. The student picks the right object builder for each. Wrong answers map to "you'd silently drop a field you should have rejected" or "you'd reject a payload that's legitimately variable."

**Components.**
- `CodeVariants` with three tabs for the same-payload-three-builders contest, each tab carrying the parse output and the senior trigger.
- `MultipleChoice` for the boundary-scenario round.
- `Aside` (`caution`) below the contest: "default `z.object` strips unknown keys silently — at every boundary in this course, the explicit choice is `z.strictObject` unless the integration calls for `looseObject`."

**Project link.** Every Server Action input schema in 7.6 starts from `z.strictObject` (or a `drizzle-zod`-generated schema with the strict mode propagated); a `z.object` in an action's input file is a code-review smell.

---

## Concept 4 — Discriminated unions over plain unions for tagged shapes

**Why it's hard.** The student reaches for `z.union` because it reads literally — "the value is either A or B." The cost is invisible until validation fails: a plain union runs every branch and produces an `invalid_union` issue with every branch's errors concatenated, leaving the form layer with a wall of irrelevant messages and the user with "something is wrong, somewhere." The discriminated-union variant reads the tag first and routes to one branch, producing one targeted issue. The decision is structural — once the shapes are tagged, `z.discriminatedUnion` is the senior reach — and the student needs to feel the *failure quality* difference, not just be told it.

**Ideal teaching artifact.** Misconception-first ambush delivered as a **same-shape-two-validators contest** in `ZodCoding`. The student is shown a `Notification` domain — `{ kind: 'email', to: string }` or `{ kind: 'sms', phone: string }` — modeled twice: once with `z.union([z.object({ kind: z.literal('email'), ... }), z.object({ kind: z.literal('sms'), ... })])` and once with `z.discriminatedUnion('kind', [...])`. Three fixtures: a valid email payload (both pass), a valid sms payload (both pass), and a malformed sms payload (`{ kind: 'sms', to: 'x@y' }` — the `phone` field missing, `to` present from the email branch). The student inspects the failure: the union version produces a multi-branch `invalid_union` issue stacked with both branches' complaints; the discriminated-union version produces one issue, on the `phone` field, in the `sms` branch — the form layer can render the right field-level error directly. The reveal lands the rule: when shapes are tagged, the discriminator key is the routing primitive; reach for `z.discriminatedUnion` and let the parser do the routing.

**Engagement.** A `MultipleChoice` lock: *"a teammate's PR uses `z.union` for a four-shape webhook payload tagged on `event_type`. The senior reviewer asks for what?"* — correct answer: rewrite as `z.discriminatedUnion('event_type', [...])`; wrong answers map to symptom mitigations ("add a `superRefine` to inspect issues", "wrap the parse in a try/catch and inspect the error").

**Components.**
- `ZodCoding` for the same-shape-two-validators contest, with the three fixtures pinned and the failure-quality difference visible in the fixtures-table errors.
- `MultipleChoice` for the lock.
- `Aside` (`tip`) below: "if the shape has a tag field, the discriminated union is the default; the parser routes by the tag and the failure points at the right branch."

**Project link.** No direct cash-in inside 7.6 (the project is single-shape CRUD), but the pattern lands in 7.5's route handlers (multi-shape request bodies) and in Chapter 12's Stripe webhook receiver, where event-type-tagged payloads are the canonical case.

---

## Concept 5 — Formats over regexes: the v4 promotion and the SaaS catalog

**Why it's hard.** Two failure modes converge. (1) The student's instinct is to reach for a custom regex when validating an email or a UUID, ignoring that the format builders are tested, internationalized, kept current, and produce better error messages. (2) The student carries a v3 mental model where `z.string().email()` was the call shape, doesn't recognize `z.email()` as the v4 promotion, and either keeps writing the deprecated chain or assumes the top-level builder produces a different type than `string`. Both have to land in one beat: the v4 form is a top-level builder that *infers as `string`*, and the format catalog covers the SaaS surface so completely that reaching for a regex is the smell, not the discipline.

**Ideal teaching artifact.** Reference archetype delivered as a **two-beat catalog**. Beat one is a small **v3-to-v4 migration table** in `Figure`: three rows showing `z.string().email()` → `z.email()`, `z.string().uuid()` → `z.uuid()` (with a callout that v4's `z.uuid()` is strict RFC 4122 and v3's looser version maps to `z.guid()`), `z.string().url()` → `z.url()`. Each row carries the inferred type (`string`, identical on both sides) so the student sees the type *doesn't change* — the v4 form is the canonical surface, the v3 chain is deprecated. Beat two is the **trigger-driven format catalog** for the SaaS surface, also in `Figure`: rows for email, app-generated ID, externally-generated ID, URL, IP, ISO datetime, JWT, plus the number/bigint/date constraints that complement them. The student leaves with a one-page reference and the reflex *name the format, don't write the regex*.

**Engagement.** A `Tokens` round on a forty-line user-signup schema written in v3 form — the student clicks every deprecated chain (`z.string().email()`, `z.string().uuid()`, `z.string().url()`, `.invalid_type_error: ...`, etc.) and the wrong-answer feedback names what the v4 surface replaces it with. Forces the student to *recognize* the migration target line by line.

**Components.**
- `Figure` wrapping a hand-coded HTML migration table for beat one.
- `Figure` wrapping a hand-coded HTML format catalog for beat two.
- `Tokens` for the v3-deprecation spotting round.
- `Aside` (`tip`) at the end: "if you're reaching for a regex inside `z.string().regex(...)`, check the format catalog first — odds are the format you want is already a top-level builder."

**Project link.** The 7.6 customer schema validates `email` with `z.email()` and `id` with `z.uuid()`; the student should never write a regex against either in the project starter.

---

## Concept 6 — Refinements: where checks live, and `path` is non-negotiable for cross-field

**Why it's hard.** Two distinct calls collapse into one for the student. (1) **Where the rule lives.** A "passwords match" check belongs on the schema. An "email already taken" check belongs in the action body, not the schema — but the junior reaches for `.refine` for both, ships a schema that needs a database connection to validate, and discovers the failure when the schema's used in a place that can't reach the DB. (2) **The `path` option on cross-field refines.** Without `path`, the issue attaches to the object root, the form layer can't anchor it under a field, and the user sees a generic banner instead of "passwords don't match" under the confirm input. Both calls are structural — the schema validates *shape*, the action validates *facts about the world*; cross-field issues are *anchored to a field*, not the root — and both have to land before the student writes their first refine.

**Ideal teaching artifact.** Pattern archetype delivered as a **two-axis decision matrix** rendered as a `Figure`-wrapped HTML table. Two axes: *what the rule needs to know* (only the input value, vs. database/external state) and *which field the issue should anchor to* (single field, vs. cross-field with a named target). The four cells produce the four reaches: schema `.refine` on a field for single-field local rules; schema `.refine` on the object with `path: ['confirm']` for cross-field local rules; action body for any rule needing DB/external state, with a typed error path that maps onto the form layer's error tree; `.superRefine` only when one predicate genuinely produces multiple distinct issues at different paths. Below the matrix, an `AnnotatedCode` walks one canonical schema — the password change form — through three checks: a single-field `.refine(val => val.length >= 8)` on `password`, a cross-field `.refine(data => data.password === data.confirm, { path: ['confirm'] })` on the object, and a callout that *"is this email already taken"* lives in the action body, *not* on the schema, with its own typed error code the form layer renders.

**Engagement.** A `MultipleChoice` round of four refinement scenarios: "the password must be at least eight characters" (schema, single-field); "the password can't equal the email" (schema, cross-field with `path: ['password']`); "the slug must be unique within the org" (action body, not schema — needs DB); "the new plan must be permitted by the org's billing tier" (action body, not schema — needs external state). Wrong answers for cross-field cases that omit the `path` are tagged "the form will render this as a banner instead of a field error."

**Components.**
- `Figure` wrapping a hand-coded HTML two-axis matrix for the where-it-lives decision.
- `AnnotatedCode` walking the password-change schema with the three annotated checks.
- `MultipleChoice` for the four-scenario round.
- `Aside` (`caution`) below the matrix: "a refine that needs a database doesn't belong on the schema; mixing the two ships a schema that can't be parsed without a DB connection."

**Project link.** The 7.6 invoice schema's local rules (positive total, dueAt > issuedAt) live on the schema with `.refine` and `path`; the cross-resource rules (customer belongs to the same org, invoice number unique within the org) live in the action body and produce their own typed error paths the form layer renders.

---

## Concept 7 — `.transform` vs `.overwrite`: when the output type should change vs not

**Why it's hard.** Both methods run a function on the parsed value. The visible difference is one word; the structural difference is whether the inferred output type changes. `.transform(s => s.trim())` produces a schema whose output is still `string`, but TypeScript-side it widens to the generic transform output type and breaks any consumer that imported the original `ZodString` type. `.overwrite(s => s.trim())` runs the same trim and the output type stays `ZodString`. The junior who reaches for `.transform` everywhere ends up with form-input schemas whose downstream consumers can't `.pick` or `.extend` cleanly. The senior reach is `.overwrite` for normalization (trim, lowercase, NFC) and `.transform` only when the output is *meant* to be a different type (string → Date, string → number).

**Ideal teaching artifact.** Mechanics archetype delivered as a **side-by-side type-shape contest** in `ZodCoding`. The student sees the same input — `z.string()` with a normalize step — written two ways: `z.string().transform(s => s.trim().toLowerCase())` on the left and `z.string().overwrite(s => s.trim().toLowerCase())` on the right. Both schemas have a `^?` Twoslash query under them showing the inferred output type; both have the same fixture (a padded `'  Hi@Example.com  '` input expecting `'hi@example.com'` out). The fixtures pass on both sides — the runtime is identical. The `^?` queries diverge: the `.transform` side shows the generic transform output (the type the consumer can no longer extend cleanly); the `.overwrite` side shows `string`. The student then sees a downstream consumer attempt `EmailSchema.pick({ email: true })` against each — only the `.overwrite` side compiles. The teaching is the visible contrast in the type pane plus the proof that the runtime is identical; the senior reach lands as: *if the type should stay the same, use `.overwrite`*.

**Engagement.** A `MultipleChoice` lock with three picks: "lowercase an email field for normalization" → `.overwrite`; "convert an ISO datetime string to a `Date` object" → `.transform`; "trim whitespace from a name field" → `.overwrite`. Wrong-answer feedback for the trim case names the consumer-side breakage if `.transform` is used.

**Components.**
- `ZodCoding` for the side-by-side type-shape contest, with the `^?` query divergence as the load-bearing reveal. The fixtures table confirms the runtime equivalence.
- `MultipleChoice` for the three-pick lock.
- `Aside` (`note`) below: "`.overwrite` is the type-preserving variant; reach for `.transform` only when the output type is *meant* to differ from the input."

**Project link.** The 7.6 customer-create schema uses `.overwrite` to lowercase and trim the email field; the form's downstream `.pick({ email: true })` for the inline-edit variant compiles only because the type stayed `string`.

---

## Concept 8 — Derive, don't duplicate: composition methods reduce drift across schema variants

**Why it's hard.** The student writes `UserSchema` for the canonical user shape, then writes `SignupSchema` by hand because "it's almost the same but with a confirm field," then writes `PublicUserResponseSchema` by hand because "it's the user without the password," and ships three drift candidates. The next column change to `users` breaks one of them silently. The senior reflex is the inverse: declare *one* canonical schema (or generate it from the database — Concept 14), derive every variant with `.extend`, `.pick`, `.omit`, `.partial`, `.required`, `.merge`, `.readonly`, and let the type checker walk consumers when the source changes. The reflex is small but load-bearing — once installed, the student stops typing parallel shapes.

**Ideal teaching artifact.** Pattern archetype delivered as a **before-and-after refactor** in `CodeVariants`. Tab one shows three hand-written schemas side by side: `UserSchema`, `SignupInputSchema` (re-types every field plus adds `confirmPassword`), `PublicUserResponseSchema` (re-types every field except `passwordHash`). The field-restatement count is rendered as a badge: "21 fields restated across three schemas." Tab two shows the derived form: one canonical `UserSchema` plus `UserSchema.extend({ confirmPassword: z.string() })` for the signup variant and `UserSchema.omit({ passwordHash: true })` for the response variant. Restatement count: "0." The student feels the asymmetry — three schemas, one source, every consumer downstream still typed. Below the contest, a small reference catalog matches each composition method to its canonical use: `.extend` for adding UI-only fields, `.merge` for combining two named schemas, `.pick` for response shapes, `.omit` for stripping sensitive fields, `.partial` for `PATCH` bodies, `.required` for re-tightening, `.readonly` for cache-layer types.

**Engagement.** A `Dropdowns` exercise on a small variant-derivation skeleton: given `InvoiceSchema`, the student picks the right composition method for four variants — the create form (omit auto-generated fields), the update form (`.partial()` of the create form), the public response (omit internal-only fields), the optimistic-update placeholder (`.pick` plus the client-generated UUID). Each blank is a single-pick dropdown over the composition catalog.

**Components.**
- `CodeVariants` with two tabs for the hand-written-vs-derived contest, with the field-restatement count as a badge per tab.
- `Figure` wrapping a hand-coded HTML reference catalog of the composition methods.
- `Dropdowns` for the four-variant derivation exercise.
- `Aside` (`note`) below the contest: "every variant of the same entity derives from one canonical schema; if you're typing the field name twice, you're writing a future drift bug."

**Project link.** The 7.6 invoice schemas all derive from one `drizzle-zod`-generated base — the create input `.omit`s server-set fields, the update input `.partial()`s the create input, the inline-edit form `.pick`s a subset. The student should never write a parallel field list in the project starter.

---

## Concept 9 — `z.infer` vs `z.input` vs `z.output`: when transforms split the type

**Why it's hard.** For schemas without a transform, `z.infer<typeof S>` is the only helper the student needs. The moment the schema introduces a coercion (`z.coerce.number()`) or a type-changing transform (`z.iso.datetime().transform(s => new Date(s))`), the parse acquires *two* types: the input it accepts (string) and the output it returns (number / `Date`). Reaching for `z.infer` produces the *output* type (which is what the action body wants), but the form's contract is the *input* type (which is what the form sends). Confusing the two produces typing errors that the student "fixes" by widening to `string | number`, losing the discipline. The teaching has to make the split visible.

**Ideal teaching artifact.** Concept archetype delivered as a **type-pane probe** in `ZodCoding`. The student sees one schema — `z.object({ quantity: z.coerce.number().positive(), issuedAt: z.iso.datetime().transform(s => new Date(s)) })` — with three Twoslash queries pinned underneath: `z.input<typeof S>`, `z.output<typeof S>`, `z.infer<typeof S>`. The first resolves to `{ quantity: unknown; issuedAt: string }` (what the form sends — strings before coercion), the second and third both resolve to `{ quantity: number; issuedAt: Date }` (what the action receives after coercion). The student adjusts the schema — adds a non-transform field — and watches all three queries update in lockstep, with `z.input` and `z.output` diverging only on the transform-bearing fields. The closing rule: `z.infer` is an alias for `z.output` (post-transform); the form contract is `z.input` (pre-transform); the action's parameter type is `z.output`. The teaching is the visible split, and the rule lands as the trigger for which helper to reach for.

**Engagement.** A `MultipleChoice` round of three pairings: "the type the `<form>` sends to the Server Action" → `z.input`; "the type the Server Action's body receives after the parse" → `z.output` (or `z.infer`); "the type for a schema with no transforms" → `z.infer` (all three are equivalent). Wrong answers each tag the typing error the wrong helper would produce.

**Components.**
- `ZodCoding` for the three-pinned-`^?`-query probe.
- `MultipleChoice` for the three-pairing round.
- `Aside` (`note`) below: "`z.infer === z.output`; if the schema has a transform, `z.input` is the form's contract — they diverge, and the explicit helper is the senior reach."

**Project link.** The 7.6 invoice action's parameter type is `z.output<typeof CreateInvoiceInputSchema>`; the form's typed prop for `defaultValues` (when the project escalates to React Hook Form in 7.4) is `z.input<...>`. The student should be able to point at each call site and name which helper feeds it.

---

## Concept 10 — `parse` vs `safeParse`: throw at trusted seams, return at the boundary

**Why it's hard.** The student reads "two methods that do the same thing" and picks `parse` because the call site is shorter. The cost surfaces in production: a Server Action that calls `Schema.parse(input)` and doesn't catch the `ZodError` produces an unhandled error response, the user sees a generic 500, and the `Result`-shaped error contract the action *should* have returned never fires. The senior posture is structural — at every untrusted boundary (Server Actions, route handlers, webhook receivers), `safeParse` is the default because its `{ success, data | error }` discriminated-union return slot maps cleanly onto the action's `Result` shape; `parse` is reserved for trusted internal seams in `/lib` where a thrown error is the correct signal that the caller violated a contract.

**Ideal teaching artifact.** Decision archetype delivered as a **two-call-site contest** in `CodeVariants`. Tab one: a Server Action with `const data = MySchema.parse(formData);` — the student sees the action's signature, the parse, the database call below it; the failure mode is annotated alongside ("`ZodError` propagates uncaught, framework returns 500, no field-level errors reach the form"). Tab two: the same action with `const parsed = MySchema.safeParse(formData); if (!parsed.success) return { ok: false, fieldErrors: z.treeifyError(parsed.error).properties };` — the failure mode is annotated as "the action returns a typed `Result` the form layer renders directly." The senior trigger lands at the bottom of tab two: at every untrusted boundary, `safeParse` is the default; `parse` is for `/lib` helpers parsing values they just constructed, where a throw is a contract-violation signal the caller broke.

**Engagement.** A `Buckets` sort: eight call sites ("a Server Action's `formData` parse", "a route handler's request body parse", "a `/lib/parseEvent.ts` helper parsing its own JSON build", "a script reading its own config from disk", "a webhook receiver parsing a Stripe event body", "an internal worker parsing a queue payload it just constructed", "a Server Component parsing a fetched API response", "a test fixture parsing a hand-built test case") sorted into "`safeParse`" or "`parse`". Wrong-answer feedback names the boundary-versus-internal call.

**Components.**
- `CodeVariants` with two tabs for the parse-vs-safeParse contest, each tab carrying the failure-mode annotation.
- `Buckets` for the eight-call-site sort.
- `Aside` (`tip`) below: "`safeParse` at every untrusted boundary; `parse` only where the throw is the right signal."

**Project link.** Every Server Action in 7.6 (create, update, delete) calls `safeParse` and maps the failure branch onto the canonical `Result` shape; this concept is the precondition for the 7.2.2 "parse on entry, every time" pattern.

---

## Concept 11 — The error contract: schema authors, form renders, one shape via `treeifyError`

**Why it's hard.** Two structural commitments collapse into one beat. (1) **Who owns the wording.** The schema declares the message (`z.email({ error: 'Enter a valid email address' })`); the form layer renders it. The reverse — form components writing their own error strings — produces messages that drift from validation rules, contradict each other, or miss new rules entirely when the schema gains a check. (2) **The shape both sides agree on.** `z.treeifyError(error)` produces `{ properties: { email: { errors: ['...'] } }, errors: [] }` — a nested mirror of the input shape that the form reads at `tree.properties.email?.errors[0]`. The v3 `error.format()` is deprecated; `error.flatten()` survives for non-nested forms but `treeifyError` is the v4 default. The misconception is that errors are a UI concern; the senior posture is that the error message is part of the validation contract, and both sides read the same shape.

**Ideal teaching artifact.** Pattern archetype delivered as a **two-side wire-shape walk** rendered in `AnnotatedCode`. The student sees three coordinated panels in one block: (a) the schema declaring its messages via the unified `error` option (`z.email({ error: 'Enter a valid email address' })`, `z.string().min(8, { error: 'Password must be at least 8 characters' })`); (b) the action's failure branch calling `z.treeifyError(parsed.error)` and returning the resulting tree as `{ ok: false, fieldErrors: tree.properties }`; (c) the form component reading `state.fieldErrors?.email?.errors[0]` and rendering it under the input. Three annotation tracks walk through: the schema authoring side, the action's mapping step, and the form's render side. The closing line names the contract: the schema is the source of the message, `treeifyError` is the wire shape, the form is a mechanical reader. Adding a new validation rule is *only* a schema change; the form picks it up automatically.

A second short beat surfaces the v4 unified `error` option as the cleanup of v3's fragmentation: `z.string({ error: 'Required' })` replaces v3's separate `message` / `invalid_type_error` / `required_error` trio. Named once via a small migration table inside `Figure`; the student leaves recognizing the legacy form when they see it in older codebases.

**Engagement.** A `MultipleChoice` PR-review round: "a teammate adds a `if (!email) return 'Email is required'` string in the form component" — what does the senior ask for? Correct answer: move the message to the schema's `error` option; wrong answers map to "add a unit test for the form's empty-email path", "centralize the form strings in a constants file." The wrong answers each surface a real wrong reach the structure prevents.

**Components.**
- `AnnotatedCode` walking the three-panel schema → action → form contract.
- `Figure` wrapping a hand-coded HTML migration table for the unified `error` option (v3's three options collapsing to one).
- `MultipleChoice` for the PR-review round.
- `Aside` (`note`) below the contract walk: "the schema authors the message; the form is a mechanical reader; the wire shape is `treeifyError`'s nested object."

**Project link.** Every error message the user sees in 7.6's invoice forms originates in the schema's `error` option; the `<FieldError>` component reads from `state.fieldErrors?.<field>?.errors[0]` and renders without writing its own copy. The 7.6.4 build follows this contract directly.

---

## Concept 12 — The FormData boundary: strings only, and `z.coerce` is the bridge

**Why it's hard.** The student's mental model from typed-domain code is that `quantity: number` *means* the value is a number wherever it shows up. The reality at the form-action seam is the opposite: every value `formData.get(name)` returns is `FormDataEntryValue` (`string | File`); HTML forms cannot send numbers, booleans, dates, or arrays directly. The Server Action receives `'3'`, not `3`; `'on'` or absent, not `true` or `false`; an ISO string, not a `Date`. Without a clean mental model of the boundary plus the canonical `Object.fromEntries(formData)` + `z.coerce` pattern, the student writes manual `Number(formData.get('quantity'))` calls in every action and the typed-domain seam never closes.

**Ideal teaching artifact.** Concept archetype delivered as a **wire-shape walk** rendered as a `Figure`-wrapped hand SVG with three lanes from top to bottom: (1) **the form**, with three labeled inputs (`<input name="quantity" type="number">`, `<input name="archived" type="checkbox">`, `<input name="issuedAt" type="datetime-local">`); (2) **the wire**, showing the actual `FormData` entries (`quantity: '3'`, `archived: 'on'` or absent, `issuedAt: '2026-05-15T14:30'`) — every value annotated as a string; (3) **the typed domain**, showing what the action's body wants (`{ quantity: 3, archived: true, issuedAt: Date }`). Between lanes (2) and (3), the bridge: the canonical pattern `const parsed = InvoiceFormSchema.safeParse(Object.fromEntries(formData))` with the schema rendered alongside, every coercion-bearing field tagged (`z.coerce.number().positive()`, `z.preprocess(v => v === 'on', z.boolean())`, `z.coerce.date()`). The diagram is the picture the student returns to whenever they're crossing a form-action seam — the strings live on one side, the typed domain lives on the other, the schema is the bridge, and the action's first line is *always* the parse.

**Engagement.** A `PredictOutput` round of four expressions on a fixture `FormData` with `{ quantity: '3', archived: 'on', notes: '', issuedAt: '2026-05-15T14:30' }` — the student predicts the typed value after each: `formData.get('quantity')` (`'3'`, not `3`), `formData.get('archived')` (`'on'`, not `true`), `Object.fromEntries(formData).notes` (`''`, not `undefined`), `formData.get('avatar')` (`null` if no input fired). Each surprise locks the strings-only reality.

**Components.**
- `Figure` wrapping a hand SVG of the three-lane wire-shape diagram with the canonical pattern rendered alongside.
- `PredictOutput` for the four-expression round.
- `Aside` (`tip`) below: "every Server Action's first line on a form input is `safeParse(Object.fromEntries(formData))` against a `z.coerce`-bearing schema; the canonical pattern is non-negotiable."

**Project link.** Every action in 7.6 — `createInvoice`, `updateInvoice`, `deleteInvoice` — opens with this exact line; the schema's coercion config is the project's contract between form field names and typed action inputs.

---

## Concept 13 — The two FormData footguns: checkbox `"on"` and empty-string-to-zero

**Why it's hard.** Both traps look correct, both pass casual unit tests, and both ship to production silently. (1) **The checkbox-and-boolean shape.** HTML checkboxes send `"on"` when checked and *nothing* when unchecked — the field is absent from the `formData`, not present with `"off"`. `z.coerce.boolean()` is wrong because `Boolean('on')` is `true` *and* `Boolean('false')` is also `true` (every non-empty string is truthy); the canonical fix is `z.preprocess(v => v === 'on', z.boolean())`. (2) **The empty-string-to-zero number trap.** `Number('')` is `0`, not `NaN`. An optional number field that submits empty becomes zero, which is usually wrong (an empty `creditLimit` should be `undefined`, not zero); the fix is `z.preprocess(v => v === '' ? undefined : v, z.coerce.number().optional())`. Both have to land as *named traps* the student recognizes at the schema site, not as paragraphs they read past.

**Ideal teaching artifact.** Misconception-first ambush delivered as a **two-trap predict-and-fix round** in `ZodCoding`. Beat one (checkbox): the student is shown a schema with `archived: z.coerce.boolean()`, three fixtures pinned — `{ archived: 'on' }` (checked), `{}` (unchecked, field absent), `{ archived: 'false' }` (a hand-crafted bug payload). The student predicts each: most predict `true / false / false`. The reveal: `true / false / true` — `'false'` is a non-empty string and `Boolean('false')` is `true`. The fix the student applies: replace with `z.preprocess(v => v === 'on', z.boolean())`. The fixtures pass. Beat two (empty-string number): the student is shown `creditLimit: z.coerce.number().optional()`, two fixtures — `{ creditLimit: '500' }` (`500`, expected) and `{ creditLimit: '' }` (predict: `undefined`). The reveal: `0`, because `Number('')` is `0`. The fix: `z.preprocess(v => v === '' ? undefined : v, z.coerce.number().optional())`. The fixtures pass. The closing rule: `z.coerce` is the right reach for the common case; the moment the JS coercion semantics are wrong (checkboxes, optional empties), `z.preprocess` is the surgical bridge.

**Engagement.** The two repair rounds carry the assessment because the student must *make the change* and watch the fixtures flip. Confirm with a `MultipleChoice`: "a teammate's PR uses `z.coerce.boolean()` for a checkbox-driven `archived` flag — what's the smell?" with the right answer naming the `Boolean('false') === true` trap and the wrong answers naming symptom mitigations.

**Components.**
- `ZodCoding` for the two-beat predict-and-fix round (one widget per beat, fixtures pinned to expose the trap).
- `MultipleChoice` for the post-repair recall.
- `Aside` (`caution`) below the round: "`z.coerce` is the common case; reach for `z.preprocess` when the JS coercion semantics produce the wrong default (checkbox-as-`Boolean`, empty-string-as-`0`)."

**Project link.** The 7.6 invoice form's `archived` checkbox uses the `z.preprocess` shape; any optional numeric field in the project's customer schema uses the empty-string-to-undefined preprocessor. The student should be able to point at each and name the trap it prevents.

---

## Concept 14 — `drizzle-zod` closes the source-of-truth loop: refinement-on-top via the override map

**Why it's hard.** This is the chapter's capstone — the moment Principle #2 (schema is the canonical root) cashes in across the validation surface. Without the loop, the student writes the Drizzle table in `db/schema.ts` and *also* hand-writes a `z.object({...})` for the API input shape, with column types restated, nullability restated, defaults restated. The two drift the moment any column changes. With the loop, `createInsertSchema(invoices)` generates the base validator, the per-column override map adds the API-only rules (`number: (s) => s.min(1).max(50)`), and `.omit({ id: true, organizationId: true, createdBy: true })` strips the columns the action sets server-side. The result is the action's input contract; the database accepts the merged shape; one column change in `db/schema.ts` propagates through the type checker. The trap is mistaking the override callback's argument: it receives the *generated* schema for that column, not a fresh one — `.refine` and `.min` chain onto it, the student doesn't rebuild from `z.string()`.

**Ideal teaching artifact.** Pattern archetype delivered in two beats. **Beat one — the source-of-truth chain diagram.** A `Figure`-wrapped hand SVG showing the closed loop: `db/schema.ts` (one box at the root) → arrows to `drizzle-zod` generators (`createSelectSchema`, `createInsertSchema`, `createUpdateSchema`) → arrows to the refined schemas (`CreateInvoiceInputSchema = createInsertSchema(invoices, { ... overrides ... }).omit({ ... server-set ... })`) → arrows to `z.infer` types feeding Server Actions and forms. A second arrow loops back from the action's typed input to the database insert call, closing the loop. The diagram is the chapter's last picture: one box, one truth, every consumer downstream typed off the same root. **Beat two — the refinement-on-top authoring beat.** An `AnnotatedCode` walks one full input schema being authored — `createInsertSchema(invoices, { number: (s) => s.min(1).max(50), total: (s) => s.refine(n => n >= 0) }).omit({ id: true, organizationId: true, createdBy: true, createdAt: true })` — with five annotations: (1) the generator picks the right base shape (insert vs select vs update); (2) the override map's callback receives the column's *generated* schema, not a fresh one (the load-bearing trap); (3) `.omit` strips the server-set columns the action fills from session/auth; (4) the resulting schema is the action's input contract; (5) the inferred type is what the action's parameter is typed as. The annotation track names the trap explicitly: the override callback parameter is *already* the right base type; the student chains on top, doesn't rebuild.

**Engagement.** A `DrizzleSchemaCoding`-paired-with-`ZodCoding` exercise: the student is given a small `customers` Drizzle table and asked to write the create-input schema using `createInsertSchema` with two overrides (a max-length on `name`, an `email` override that swaps the v3-style `string().email()` to v4's `z.email()`) and an `.omit` for the server-set columns (`id`, `organizationId`, `createdAt`). The grader runs the resulting schema against three fixtures: a valid create payload, a payload with an over-long name, a payload with a malformed email. The student leaves the chapter with the loop closed at the keyboard.

**Components.**
- `Figure` wrapping a hand SVG of the source-of-truth chain diagram for beat one.
- `AnnotatedCode` walking the five-annotation refinement-on-top authoring beat for beat two.
- `ZodCoding` for the customer-schema exercise (the schema is the student's output; the fixtures table grades the result). If `ZodCoding` can't carry a `drizzle-zod`-shaped starter cleanly, fall back to a `DrizzleSchemaCoding` + `ZodCoding` two-step: write the table, then derive the schema.
- `Aside` (`caution`) below the authoring beat: "the override callback receives the *generated* column schema; `.refine` and `.min` chain onto it — do not rebuild from `z.string()` inside the callback."

**Project link.** The 7.6 project's three input schemas — `CreateInvoiceInputSchema`, `UpdateInvoiceInputSchema`, `DeleteInvoiceInputSchema` — are all `drizzle-zod`-derived from the `invoices` table in 6.6's schema, with refinement-on-top for the API-only rules and `.omit` for the server-set columns. This concept is the chapter's foundation for that build; the cash-in is direct and immediate.

---

## Component proposals

None — the chapter ships entirely on existing components.

The chapter's centerpiece component, `ZodCoding`, is purpose-built for the exact shape this chapter teaches: the duality of inferred type plus runtime contract in one widget. It carries Concepts 1, 4, 7, 9, and 13 directly, with the fixtures table doubling as both the runtime check *and* the type-shape check (when a fixture passes, the type took the right shape). The Twoslash `^?` query support is the load-bearing surface for Concepts 1, 7, and 9 — the type pane is where the teaching lives, not just supplementary information.

The remaining concepts each reach a strong fit with `Figure` + hand SVG (Concepts 2, 5, 11, 12, 14 for catalogs and wire-shape diagrams), `CodeVariants` (Concepts 3, 8, 10 for tabbed comparisons), `AnnotatedCode` (Concepts 6, 11, 14 for stepped walkthroughs), and the existing exercise components (`Buckets`, `MultipleChoice`, `PredictOutput`, `Tokens`, `Dropdowns`, `DrizzleSchemaCoding`).

The pattern this chapter validates is the inverse of the 6.1 / 6.2 chapters: where the database unit produced two bespoke simulators (`ConnectionPoolSim`, `BTreeInsertSim`, `SchemaDriftSim`), the validation chapter produces zero — because the existing `ZodCoding` already encodes the load-bearing teaching surface for the chapter's thesis. The component-proposal discipline holds: bespoke components earn their weight when the existing toolkit can't carry the kinetic moment that teaches; here, `ZodCoding` already carries it five times over.

## Build priority

No new components to build. The chapter's build cost is the *content* — the curated fixtures for the `ZodCoding` instances (especially Concepts 4 and 13, where the fixtures' design *is* the teaching), the hand-coded HTML tables for the catalogs (Concepts 2, 5, 8, 11), and the hand SVGs for Concepts 12 and 14's wire-shape diagrams.

The forward-link to flag is the closing wire-shape diagram of Concept 14 (the source-of-truth chain). It will be revisited explicitly in 7.6 (when the project's three input schemas are built from it), in 17.1 (when the seam-by-seam audit traces validation back to the schema), and structurally throughout Units 8–23 every time a new boundary is added. If a `SourceOfTruthChain` named composition emerges as a recurring artifact across these chapters, it earns a small named primitive — but at one chapter of use, the hand SVG is the right scope.

## Open pedagogical questions

- Concept 1's `ZodCoding` use depends on the widget's `^?` Twoslash query rendering crisply enough to be the load-bearing reveal alongside the fixtures table. If the type-pane render is too small or the Twoslash positioning fights the fixtures table, the dual-pane reveal weakens — confirm whether the widget's current type-pane treatment can carry the visual weight or whether the duality lands better as a `CodeVariants` with two tabs (one showing the inferred type, one showing the fixtures result).
- Concept 14's exercise wants `ZodCoding` to host a `drizzle-zod`-derived schema, which means the iframe runtime must be able to import `drizzle-zod` (or the lesson stubs the generated base schema as a hand-written equivalent the student refines on top of). Confirm whether the widget's esm.sh resolution can pull `drizzle-zod` cleanly or whether the lesson uses a stubbed generator function for the exercise.
- Concept 11's three-panel schema → action → form walk strains `AnnotatedCode`'s single-block model — the contract spans three files. Confirm whether `AnnotatedCode` carries multi-file annotation tracks cleanly, or whether the walk lives as three sequential `AnnotatedCode` blocks with prose linking them.
