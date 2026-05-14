# Chapter 7.1 — Schema-first validation with Zod 4

## Chapter framing

Unit 7's thesis is that every untrusted boundary in a SaaS app — a Server Action's `formData`, a route handler's request body, a webhook's payload, a `searchParams` object, the JSON returned by an external API — gets parsed against a Zod schema before any other code looks at it. Chapter 7.1 builds the vocabulary: what a Zod 4 schema is, which builders ship in the box, how refinements and transforms fit, how schemas compose, what `parse` versus `safeParse` decides, how coercion bridges the string-only `FormData` world to the typed domain, and how `drizzle-zod` keeps the database schema and the validation schema from drifting. The student leaves with the API they will write against on every action, route, and seam in Units 7 through 23.

The threads that must run through every lesson: the schema is the single source of truth for both runtime validation and the inferred TypeScript type — `z.infer<typeof schema>` is how Unit 7's actions get their input shape, no parallel hand-written type; the v3 method chains the student finds in older codebases (`z.string().email()`, `.strict()`, `.passthrough()`, `message`/`invalid_type_error`/`required_error`) are legacy in Zod 4 — call out the v3 form once per lesson where relevant, then write the v4 form everywhere; refinements live inside the schema as part of the new "checks" model, not as an outer `ZodEffects` wrapper; transforms change the inferred output type and `.overwrite()` is the type-preserving variant; `safeParse` is the senior default for action and route handlers, `parse` is for trusted internal boundaries where a thrown error is the correct signal; error messages are part of the contract — the schema authors them, the form layer renders them, both sides see the same shape; the validation layer never duplicates the database — `drizzle-zod` generates the insert and select schemas from `db/schema.ts` and the student refines from there. The chapter ships seven teaching lessons plus a quiz.

---

## Lesson 7.1.1 — Schemas: primitives, objects, arrays, unions, literals, enums

Topics to cover:

- **The senior question.** A Server Action receives a `formData` from a Client Component's `<form>` submission. Before any database write, the action needs to know the shape and types of every field — `email` is a string, `quantity` is a positive integer, `status` is one of three legal values, `tags` is an array of strings. What does a Zod 4 schema for that input look like, and what are the building blocks the rest of the chapter composes from? The lesson names schemas as runtime parsers with TypeScript types attached, and walks the eight builders that cover ninety percent of 2026 production validation.
- **The schema mental model.** A schema is an immutable value with two jobs: validate an unknown input at runtime, and contribute a static type that the rest of the codebase can infer from. `const InvoiceSchema = z.object({...})` produces a schema object with a `.parse()` method; `type Invoice = z.infer<typeof InvoiceSchema>` produces the TypeScript type. The same schema feeds both sides — that's the whole point.
- **Primitive schemas.** `z.string()`, `z.number()`, `z.bigint()`, `z.boolean()`, `z.date()`, `z.symbol()`. Each accepts the matching JavaScript value and rejects everything else. Optional and nullable as wrappers: `z.string().optional()` accepts `string | undefined`, `z.string().nullable()` accepts `string | null`, `z.string().nullish()` accepts both. The 2026 reflex: prefer `.optional()` over `.nullable()` unless the domain itself uses `null` as a deliberate value (matches the 2.4.1 typing convention).
- **Object schemas — `z.object`, `z.strictObject`, `z.looseObject`.** The default `z.object({ email: z.string() })` strips unknown keys silently. The strict form `z.strictObject({...})` rejects unknown keys with an issue — the senior reach for API request bodies and Server Action inputs where an extra field is usually a client bug worth surfacing. The loose form `z.looseObject({...})` preserves unknown keys on the output — used at the edge of external integrations where the payload shape isn't fully documented. The v3 `.strict()` and `.passthrough()` method forms are deprecated; the top-level builders are the canonical Zod 4 surface.
- **Array schemas.** `z.array(z.string())` accepts a string array. Length constraints attach inline: `z.array(z.string()).min(1).max(100)`. Tuples for fixed-length, position-meaningful arrays: `z.tuple([z.string(), z.number(), z.boolean()])` accepts `[string, number, boolean]` exactly.
- **Literal types.** `z.literal('paid')` accepts only the string `'paid'` and infers as the singleton type `'paid'`. The 2.4.1 literal-union discipline made operational in the schema layer.
- **Enums — `z.enum` over `z.literal` unions.** `z.enum(['draft', 'sent', 'paid', 'overdue'])` is the senior reach for finite string domains: it infers as `'draft' | 'sent' | 'paid' | 'overdue'`, validates exactly those four values, and provides `.options` (the array) and `.enum` (an object indexable as `Status.paid`) for runtime access. The full equivalence with `z.union([z.literal('draft'), ...])` is named once; `z.enum` is shorter and faster. The course writes literal-union TypeScript types and `z.enum` schemas — they pair.
- **Union schemas — `z.union`.** `z.union([z.string(), z.number()])` accepts either. Used sparingly outside of literal unions; the senior reach for multi-shape inputs is the discriminated union.
- **Discriminated unions — `z.discriminatedUnion`.** The performance and clarity win for tagged shapes: `z.discriminatedUnion('kind', [z.object({ kind: z.literal('email'), to: z.string() }), z.object({ kind: z.literal('sms'), phone: z.string() })])`. Validation reads the discriminator key first and routes to the matching branch, surfacing "no matching discriminator" rather than a confusing "invalid_union" with every branch's issues. The senior default for any tagged variant in a request body or webhook payload.
- **`z.never` and `z.unknown` at the surface.** `z.unknown()` accepts anything and infers as `unknown` — the parse-to-unknown-then-narrow shape from 2.9.1. `z.never()` accepts nothing; rare in application code, useful for proving exhaustiveness in conditional unions. Named once.
- **Naming and placement.** Schemas live alongside the domain types in `/lib`. The 2026 convention: `InvoiceSchema` (the schema), `type Invoice = z.infer<typeof InvoiceSchema>` (the type) — same file, type below schema. The next lesson formalizes the inference rule.
- **Watch-outs.** The default `z.object({...})` strips unknown keys silently — a client sending `{ email, password, isAdmin: true }` against a `{ email, password }` schema parses successfully and the `isAdmin` vanishes; `z.strictObject` is the explicit "this is wrong" surface for request bodies; `z.tuple` is for fixed-length, not "an array of two element types" — for the latter use `z.array(z.union([...]))`; `z.enum` requires a const array (`as const` not needed in v4 — the type is inferred from the literals); chaining `.optional().nullable()` is equivalent to `.nullish()` and the explicit form scans more clearly.

What this lesson does not cover:

- String-format validators like `z.email`, `z.uuid`, `z.url` (7.1.2).
- Refinements and custom checks (7.1.3).
- Coercing form-data strings into numbers and booleans (7.1.6).
- `z.infer` and other inference helpers (7.1.4).
- `parse` versus `safeParse` and error shapes (7.1.5).

Estimated student time: 40 to 50 minutes. Foundational; every other lesson in the chapter references these eight builders.

---

## Lesson 7.1.2 — Top-level string formats and built-in validators

Topics to cover:

- **The senior question.** A user sign-up schema validates an email, a UUID for the invitation token, an ISO datetime for the requested start date, and an IP address for the rate-limit key. In Zod 4, what's the canonical syntax for each of those formats, why did Zod 4 promote them from string methods to top-level builders, and which formats ship in the box versus which need a custom check? The lesson names the v4 top-level format API and the dozen or so builders the SaaS surface actually reaches for.
- **The v4 promotion — top-level over method-chained.** Zod 3's `z.string().email()` chained a format check onto a string schema. Zod 4 ships `z.email()` as its own top-level builder that infers as `string` and bundles the format validation. Same for `z.uuid()`, `z.url()`, `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.nanoid()`, `z.ipv4()`, `z.ipv6()`, `z.base64()`, `z.base64url()`, `z.jwt()`, `z.e164()` for phone numbers. The v3 chain still works in the v3-compat shim but is deprecated; new code writes the top-level form. The senior justification: the format is the type, not a postfix modifier — and the top-level builders tree-shake cleanly.
- **The format reference for SaaS.**
  - `z.email()` — RFC-aligned email. The default is loose enough for production; tighter regex is opt-in via the `pattern` option for the cases where the platform's spam team has stricter rules.
  - `z.uuid()` — strict RFC 4122 in v4 (versions 1, 3, 4, 5, 7, 8). The v4 `z.uuid()` is *not* compatible with v3's `z.string().uuid()` — v3's looser version maps to v4's `z.guid()`. The senior reach: `z.uuid()` for app-generated IDs (the chapter 6 UUIDv7 PKs round-trip cleanly), `z.guid()` only when the caller passes externally-generated identifiers that may not be RFC-strict.
  - `z.url()` — `URL`-constructor-compatible URL. Optional protocol allowlist (`z.url({ protocol: /^https?$/ })`) for the common "must be http or https" production rule.
  - `z.cuid()`, `z.cuid2()`, `z.ulid()`, `z.nanoid()` — alternative ID encodings; the senior call is "use the format the upstream system produces, not a clever opinion."
  - `z.ipv4()`, `z.ipv6()` — IP address validators; pair with the `headers()` reads from 5.5.1 when typing the client IP.
  - `z.iso.date()`, `z.iso.time()`, `z.iso.datetime()`, `z.iso.duration()` — ISO 8601 date/time/duration validators. The senior reach for any string-shaped date crossing the wire (URL params, JSON bodies); the in-memory date type is still `Date` (full date discipline lands in Chapter 18.1).
  - `z.jwt()` — JWT format validator. Named once; auth flows in Chapter 9 use Better Auth's verification rather than parsing JWTs directly.
- **Number, bigint, date validators.** `z.number()` accepts JS numbers; the constraints `.min(0)`, `.max(100)`, `.int()`, `.positive()`, `.nonnegative()`, `.multipleOf(0.01)` chain inline. `z.int()` is the top-level shortcut for integer-only — equivalent to `z.number().int()` and clearer at the schema site. `z.bigint()` accepts a `bigint` (the JSON-boundary serialization gotcha from 2.9.1 still applies). `z.date()` accepts `Date` instances and ranges with `.min(new Date('2020-01-01'))`.
- **String constraints that complement the formats.** `.min(n)`, `.max(n)`, `.length(n)`, `.regex(/.../)`, `.startsWith()`, `.endsWith()`, `.includes()`, `.trim()`, `.toLowerCase()`, `.toUpperCase()`. The senior reflex: format builders cover the named cases; reach for `.regex` only when no built-in format fits. Naming the format earns better error messages and tree-shaking.
- **The senior reach — pick the format, not a regex.** The student's instinct from elsewhere is to reach for a custom regex; the chapter rule is the opposite. `z.email()` over `z.string().regex(/.../)`, `z.uuid()` over a custom UUID pattern, `z.url()` over URL pattern matching. The format builders are tested, internationalized, kept current, and produce better error messages.
- **The "in production you'd also..." short list.** A real signup schema layers on a max length (defense against pathological inputs), a `.toLowerCase()` for normalization, and a custom check against an `email_suppressions` table (Chapter 8.1) at the action boundary, not at the schema. Named once: the schema validates shape; cross-resource rules (uniqueness, blocklists) live at the action layer where database access is legitimate.
- **Watch-outs.** v4 `z.uuid()` is strict — passing a v3-style "not technically RFC-compliant but close" UUID fails the parse, switch to `z.guid()` if the upstream produces those; `z.url()` accepts `javascript:` URLs by default — for any URL the app will render or redirect to, the `protocol` allowlist is non-negotiable (Chapter 5.5.3 open-redirect rule); `.trim()` and `.toLowerCase()` are transforms that mutate the parsed output — the inferred type stays `string` but the value changes, name this once so the student doesn't expect the input shape; `z.number()` accepts `NaN` and `Infinity` by default — pair with `.finite()` for the production reflex on monetary and quantity fields; `z.iso.datetime()` validates the string format and infers as `string`, not `Date` — a parse step to `Date` is a transform if the consumer needs a `Date`.

What this lesson does not cover:

- Custom checks and refinements when no built-in fits (7.1.3).
- Coercion from form-data strings to numbers and booleans (7.1.6).
- Date parsing for the timezone-aware layer (Chapter 18.1).
- The phone-number rabbit hole — `z.e164()` is the format; libphonenumber is the parser. Named once, dropped.

Estimated student time: 30 to 40 minutes. Pure reference-survey shape; the body is a table-shaped walk through the format catalog.

---

## Lesson 7.1.3 — Refinements, transforms, and the checks model

Topics to cover:

- **The senior question.** The schema validates that `password` is a string of at least eight characters — but the form also requires `password === passwordConfirmation` and `password` not equal to `email`. The schema validates that `dueAt` is an ISO datetime — but the form requires `dueAt > issuedAt`. The schema validates that the body is an object — but the consumer needs the email lowercased and trimmed. None of those rules fit a built-in. Where do they live in Zod 4, what's the syntax for each, and what changed from v3's `ZodEffects` model? The lesson teaches custom checks (refinements) and value transforms as the two extension points beyond the built-ins.
- **The Zod 4 checks model.** Refinements in v4 are no longer an outer `ZodEffects` wrapper around the schema; they're stored as a `checks` array on the schema itself. The practical consequence: refinements compose with other schema operations (`.pick`, `.omit`, `.extend`) without surprises, and the inferred type is the schema's type — refinements don't change inference. The v3 mental model where `.refine()` returned a new wrapped schema is replaced by an in-place check addition; the syntax at the call site is the same.
- **`.refine` — the single-field check.** `z.string().refine(val => val.length >= 8, { error: 'Password must be at least 8 characters' })`. The predicate returns `true` when the value passes. The error object accepts the unified `error` param (v3's separate `message` is the legacy form); the message renders in the issue. The senior reach: any rule that a built-in doesn't cover and that's local to a single field.
- **`.refine` on objects — cross-field validation.** Refine on the object schema, not the individual field, when the rule references multiple fields: `PasswordChangeSchema.refine(data => data.password === data.confirm, { error: "Passwords don't match", path: ['confirm'] })`. The `path` option attaches the issue to the right field so the form layer renders the message under `confirm` rather than at the form level. The 2026 reflex: every cross-field check names its `path` so the UI gets the right anchor.
- **`.superRefine` — multiple checks, conditional issues.** When one predicate produces multiple distinct issues, or when the issue's `path` depends on the value, `.superRefine((data, ctx) => { if (cond) ctx.addIssue({...}) })` is the surface. Heavier than `.refine`, used for the genuine multi-issue case (a multi-error password policy: too short, no uppercase, no digit — each its own issue under its own path).
- **`.transform` — change the inferred output type.** `z.string().transform(val => val.toUpperCase())` returns a new schema whose output is the transformed value; the inferred type updates accordingly. `z.string().transform(val => new Date(val))` accepts a string, outputs a `Date`. Used when the schema's job is part shape-validation, part normalization-to-domain-type. The senior reach: pair with `z.iso.datetime()` to land a `Date` in the action's input.
- **`.overwrite` — type-preserving transform.** New in v4: `.overwrite(val => val.trim().toLowerCase())` runs a transform that produces the same type as the input. Equivalent to `.transform` for the runtime but the inferred type stays the original — important because the type system can keep treating the schema as `ZodString` rather than the generic transform output. The senior trigger: normalization (trim, lowercase, NFC unicode) where downstream code still expects a string.
- **`.pipe` — schemas as a pipeline.** `z.string().transform(val => Number(val)).pipe(z.number().int().positive())` chains: first the transform produces a number, then the second schema validates it. The pattern is heavier than `.coerce` (7.1.6 is the lighter alternative for the common form-data case) and the senior call is to reach for `.pipe` when the validation after the transform is itself a non-trivial schema.
- **The transform-runs-on-refine-fail v4 surprise.** Zod 4 runs `.transform` even when an earlier `.refine` fails on the same schema chain (a deliberate change for performance, named once so the student isn't blindsided). The senior pattern: don't rely on a transform being skipped after a failed refine — write the transform to be safe over any input the schema would accept structurally, and let the refine produce the validation issue separately.
- **Where checks belong — schema vs. action layer.** Single-field and cross-field rules that the schema can prove without external resources belong on the schema. Rules that require database lookups (email already exists, organization slug taken, billing plan permits the action) belong in the Server Action's body, after the parse, with their own typed error path that the form's `useActionState` (7.3.4) renders. The senior reflex from Architectural Principle #3: pure validation in the schema, side-effects at the named boundary.
- **The error customization on a check.** Every refinement accepts an `error` option in v4. The unified shape (named explicitly in 7.1.5 alongside parse errors) replaces v3's `message` / `invalid_type_error` / `required_error` fragmentation. A static string (`{ error: 'Password too short' }`) or a function for dynamic messages (`{ error: (issue) => `Must be at least ${issue.minimum} characters` }`). The same `error` option drives the issue's `.message` in the parse result.
- **Watch-outs.** A cross-field refine without `path` attaches the issue to the object root — the form layer can't anchor it under a field, the user sees a generic error; `.transform` changes the output type and breaks any consumer that expected the input shape — reach for `.overwrite` when the type should stay; `.superRefine` is heavier than `.refine` and adds complexity — reach for it only when one predicate genuinely produces multiple issues; refinements that need database access don't belong on the schema — that's the action's job and mixing the two is the failure mode that ships a schema that can't be parsed without a DB connection; the v4 transform-on-refine-fail behavior is a v3-to-v4 footgun if the student's mental model came from older docs.

What this lesson does not cover:

- The full unified error object surface (7.1.5).
- Coercion via `z.coerce` (7.1.6).
- Async refinements that hit the network — `.refine` accepts an async predicate and `parseAsync` runs it, but this lesson sticks to the synchronous case. The async path is named once, fully covered in the Unit 23 AI tool validation surface.
- Composing refinements across schemas (7.1.4).

Estimated student time: 45 to 55 minutes. The conceptual center of the chapter — refinements and transforms are where Zod stops being "validate primitive shapes" and becomes "validate the domain."

---

## Lesson 7.1.4 — Composing schemas and inferring types

Topics to cover:

- **The senior question.** The app has a `UserSchema` for the canonical user shape. The signup form needs `email + password + name`; the profile-edit form needs `name + avatarUrl` from the same source; the public profile response strips the password. Does the codebase write three schemas by hand and risk drift, or derive each from one source? And once the schemas exist, how does the TypeScript type `User` flow without being written twice? The lesson teaches `.extend`, `.pick`, `.omit`, `.merge`, `.partial`, `.required`, `.readonly`, plus `z.infer` and the input-versus-output type distinction that transforms create.
- **The composition reflex — derive, don't duplicate.** A SaaS codebase grows multiple schema variants of the same underlying entity: the database insert shape, the API request shape, the form input shape, the API response shape, the optimistic-update shape. Writing five hand-maintained `z.object`s for one entity is a drift bug waiting to happen. The senior reach: declare one canonical schema (or generate it from the database — 7.1.7), derive the variants with the composition methods. Each variant's name signals its role (`CreateUserInputSchema`, `UpdateUserInputSchema`, `PublicUserResponseSchema`).
- **`.extend` — adding fields.** `UserSchema.extend({ confirmPassword: z.string() })` returns a new object schema with the added field. Fields with the same name override the original. The senior reach: form-input schemas that add UI-only fields the base entity doesn't carry.
- **`.merge` — combining two object schemas.** `UserSchema.merge(BillingFieldsSchema)` produces an object schema with the union of both. Equivalent to a sequence of `.extend` calls; useful when the additions are themselves a named schema.
- **`.pick` and `.omit` — narrowing.** `UserSchema.pick({ email: true, name: true })` keeps two fields; `UserSchema.omit({ passwordHash: true })` removes one. The dominant pattern for response shapes (omit sensitive fields) and form inputs (pick the editable subset). Both return a new object schema with the same prototype as the source.
- **`.partial` and `.required` — modifier flips.** `UserSchema.partial()` makes every field optional — the canonical `PATCH` body shape. `UserSchema.partial({ name: true })` makes just `name` optional, leaving the rest. `.required()` is the inverse on a schema that has optional fields. The 2026 reflex: derive update schemas with `.partial` from the canonical schema, never hand-write a parallel "everything optional" version.
- **`.readonly` — type-only modifier.** `UserSchema.readonly()` infers as `Readonly<User>`. Runtime behavior unchanged (Zod doesn't enforce immutability), but the inferred type prevents accidental mutation downstream. Named once; reaches for it in the read-side cache layer (Unit 15).
- **`z.record` — dynamic-keyed objects, the v4 signature.** `z.record(keySchema, valueSchema)` requires both arguments in Zod 4 — `z.record(z.string(), z.number())` for a `Record<string, number>`. The v3 single-argument form (`z.record(z.number())`) is deprecated. The senior reach: maps with known value shapes but open key sets (feature flags, locale dictionaries, the `extra` JSON column in the database).
- **`z.intersection` — combining non-object schemas.** When both operands are not objects (e.g., a refined primitive AND a separately-refined primitive), `z.intersection(a, b)` parses by both. For object schemas, `.merge` is clearer and cheaper; reserve intersection for the rare non-object case.
- **Recursive schemas — the `get` lazy pattern.** Self-referential shapes (a comment tree, a folder hierarchy) need lazy evaluation: declare the type, then use the `get` getter on the schema or `z.lazy(() => ...)` to defer the inner schema reference. Named once; rare in line-of-business code, common in tree-shaped UI state.
- **`z.infer` — the canonical inference helper.** `type User = z.infer<typeof UserSchema>` is the singular pattern. The chapter's discipline from here forward: every schema has an inferred-type alias declared next to it, every downstream consumer imports the type from the schema's module, no hand-written parallel type definitions.
- **`z.input` and `z.output` — when transforms split the type.** A schema with a `.transform` has two distinct types: the input the parse accepts and the output the parse returns. `z.input<typeof S>` is the pre-transform type; `z.output<typeof S>` is the post-transform type (equivalent to `z.infer` — `z.infer` is an alias for `z.output`). The senior trigger: when a Server Action's input schema uses `z.coerce.number()` or `.transform` to land a `Date`, the form contract is `z.input` (the raw string `formData` provides) and the action's parameter type is `z.output` (the typed shape). Named explicitly so the student doesn't reach for the wrong helper.
- **Watch-outs.** `.extend` on a `strictObject` returns a `strictObject` — the strictness mode propagates, which is usually what you want; `.partial` on a schema that uses `.refine` for a cross-field rule may make the refine impossible to satisfy (the fields it references are now optional) — re-run the rule against the new optionality; `z.record` in v4 needs both args — the v3 single-arg form fails at the type level in v4; for shapes that should preserve `unknown` keys after the parse, `z.looseObject` is the answer, not a `z.record` wrapper; `z.infer` returns the output type — for the input shape of a transform schema, the explicit `z.input` is required, not `z.infer`.

What this lesson does not cover:

- The parse methods themselves (7.1.5).
- Generating schemas from the database (7.1.7).
- Form-data coercion (7.1.6).
- Writing a brand on top of a schema for nominal types (Chapter 2.5.5 owns brands; the schema-side application is named once but not taught here).

Estimated student time: 40 to 50 minutes. Half conceptual (the derive-don't-duplicate reflex), half reference (the method catalog).

---

## Lesson 7.1.5 — Parsing, safe-parsing, and error customization

Topics to cover:

- **The senior question.** A Server Action receives the parsed `formData` and calls `MySchema.parse(input)` — what happens on success, what happens on failure, and is `parse` the right reach for a function whose contract returns a `Result` to the form layer rather than throwing? The lesson teaches the four parse methods (`parse`, `safeParse`, `parseAsync`, `safeParseAsync`), the `ZodError` shape they produce, the unified `error` option that customizes issue messages, and the `z.treeifyError` helper that turns errors into form-friendly nested objects.
- **`parse` — throw on failure.** `MySchema.parse(input)` returns the parsed value on success and throws `ZodError` on failure. The senior reach: trusted internal boundaries where a thrown error is the correct signal — a function in `/lib` parsing a value it just constructed, a script parsing its own config. At an action or route handler boundary where the caller wants a typed `Result`, `safeParse` is the default.
- **`safeParse` — discriminated-union result.** `MySchema.safeParse(input)` returns `{ success: true, data: T } | { success: false, error: ZodError }`. No throw. The pattern at every untrusted boundary:

  `const parsed = Schema.safeParse(input); if (!parsed.success) return { ok: false, error: ... };`

  Pairs directly with the canonical Server Action `Result` shape (7.2.2) — the schema's failure branch maps to the action's error branch.
- **`parseAsync` and `safeParseAsync` — async refinements.** Required when any refinement in the schema returns a Promise. The sync versions throw if they encounter an async check. The senior reach: skip async refinements at the schema layer (they belong in the action body after the parse) so the sync forms work everywhere.
- **The `ZodError` anatomy.** `ZodError.issues` is an array of issue objects, each with `code`, `path` (a string/number array pinpointing the failing field), `message`, and code-specific fields (`expected`, `received`, `minimum`, etc.). The 2026 form layer reads `issues` directly when it needs custom rendering; `treeifyError` is the structured shortcut for the common case.
- **`z.treeifyError` — the form-friendly shape.** `z.treeifyError(error)` returns a nested object mirroring the input shape: `{ properties: { email: { errors: ['Invalid email'] } }, errors: [] }`. The form layer reads `tree.properties.email?.errors[0]` to render the field-level message. Named here because it's the v4 replacement for v3's deprecated `error.format()` method. The v3 `error.flatten()` method still exists and produces a flatter `{ fieldErrors: { email: [...] } }` shape — both work, `treeifyError` is the v4 default for nested-object schemas.
- **The unified `error` option — issue customization.** Zod 4 collapses v3's `message`, `invalid_type_error`, and `required_error` into one parameter:

  `z.string({ error: 'Name is required' })` — overrides the default for any issue from this schema.

  `z.string({ error: (issue) => issue.code === 'invalid_type' ? 'Must be a string' : 'Invalid' })` — function form returns a custom message per issue.

  At the per-field site, the same shape: `email: z.email({ error: 'Enter a valid email address' })`. The unified surface is the v3-to-v4 migration's biggest cleanup; legacy schemas with `invalid_type_error` and `required_error` need a one-shot rewrite.
- **Per-parse error overrides.** `Schema.parse(input, { error: (issue) => '...' })` overrides the schema's error config for that one parse call. Used at the action site when the same schema needs different error rendering in different contexts (English vs. localized messages from Chapter 18.2). Rare but available.
- **Global error config.** `z.config({ customError: (issue) => '...' })` sets a process-wide default error mapper. The senior reach: the i18n layer wires this once at app startup so every default error message is localized. Named once; the wiring belongs in Chapter 18.2 alongside the rest of the i18n surface.
- **The error-message contract — schema authors, form renders.** The schema declares what the message says (the schema author owns the wording, the form layer doesn't second-guess). The form reads `treeifyError(error).properties.<field>.errors[0]` and renders it under the input. Both sides see the same shape — adding a new validation rule means adding the rule to the schema, and the form picks it up automatically. The 2026 reflex: never write error messages in the form component; the schema is the source of truth.
- **What happens with `strictObject` and unknown keys.** A `strictObject` parse of an input with an unknown field produces an `unrecognized_keys` issue. The form layer doesn't typically render this (the user can't have caused it through the visible inputs); it's a logger signal that a client-server contract drift has occurred. Pair with the error monitoring from Chapter 20.1.
- **Watch-outs.** `parse` in a Server Action that doesn't catch the throw produces an unhandled error response — `safeParse` is the boundary default for actions and route handlers; `error.format()` from v3 is deprecated — use `treeifyError`; `error.flatten()` still works and is the right reach for non-nested form shapes; the per-parse `error` option doesn't merge with the schema's `error` — it overrides; an async refinement called with sync `parse` throws a runtime error before it gets to the validation — call the async parse variant or move the async check to the action body.

What this lesson does not cover:

- The canonical Server Action Result shape that the parse result maps to (7.2.2).
- Localizing error messages with the i18n layer (Chapter 18.2).
- Form-side error rendering with `useActionState` (7.3.4).
- Error monitoring for unexpected schema drift (Chapter 20.1).

Estimated student time: 35 to 45 minutes. Most-referenced lesson in the chapter — every action, route handler, and webhook in Units 7 through 23 calls one of these methods.

---

## Lesson 7.1.6 — Coercion and the `FormData` boundary

Topics to cover:

- **The senior question.** A `<form>` posts to a Server Action; `formData.get('quantity')` returns the string `"3"`, not the number `3`. `formData.get('archived')` returns `"on"` or `null`, not `true` or `false`. `formData.get('issuedAt')` returns an ISO string, not a `Date`. The Server Action's domain code wants typed values — what's the minimum syntax that bridges the string-only `FormData` world to the typed domain, and where does that bridge live? The lesson teaches `z.coerce`, `z.preprocess`, and the canonical `formData`-to-object pattern Server Actions reuse on every form.
- **The FormData contract — strings only.** Every value from `formData.get(name)` is `FormDataEntryValue` (`string | File`). HTML forms cannot send numbers, booleans, dates, or arrays directly — the browser serializes to strings, and the server parses back. Multi-valued fields use `formData.getAll(name)` and return `string[]`. Files come through as `File` objects (the only non-string shape). This is the string-typing reality every form-handling lesson assumes.
- **`Object.fromEntries(formData)` — the first move.** The canonical first step in a Server Action: `const raw = Object.fromEntries(formData);` produces a plain object `{ quantity: '3', archived: 'on', email: '...' }`. The pattern collapses multi-key keys to the last value — for arrays, the explicit `formData.getAll(name)` is required. The senior trigger: name multi-valued fields with `[]` suffix in the HTML (`tags[]`) and pull them with `getAll` when the schema needs the array.
- **`z.coerce` — the typed bridge.** `z.coerce.number()` calls the JS `Number(...)` constructor on the input before validating; `"3"` becomes `3`, `""` becomes `0` (the platform's empty-string coercion — the senior watch-out below). `z.coerce.boolean()` runs `Boolean(...)` (truthy/falsy semantics — `"false"` is truthy because it's a non-empty string, the senior watch-out below). `z.coerce.date()` runs `new Date(...)` and parses ISO strings cleanly. `z.coerce.bigint()` runs `BigInt(...)`. `z.coerce.string()` runs `String(...)` — useful for numeric inputs that should round-trip as strings.
- **The dominant form-data schema shape.**

  ```
  const InvoiceFormSchema = z.object({
    customerId: z.uuid(),
    total: z.coerce.number().positive().multipleOf(0.01),
    issuedAt: z.coerce.date(),
    notes: z.string().optional(),
  });
  ```

  Used at the top of every Server Action that consumes `formData`: `const parsed = InvoiceFormSchema.safeParse(Object.fromEntries(formData));`. The schema becomes the contract between the form's input names and the action's typed input. The pattern is named once; every Unit 7 action follows it.
- **`z.preprocess` — when coercion's defaults aren't enough.** `z.preprocess` runs an arbitrary transform on the input before the inner schema validates. Use when the JS coercion semantics are wrong (the `"false"` boolean problem, an empty-string vs. undefined distinction, normalizing comma-separated decimals to dots). `z.preprocess(val => val === 'on', z.boolean())` handles the HTML checkbox shape correctly: `'on'` becomes `true`, `null` or `undefined` becomes `false`, the resulting boolean parses.
- **The checkbox-and-boolean shape.** HTML checkboxes send `"on"` when checked and *nothing* when unchecked — the field is absent from the `formData`, not present with `"off"`. `z.coerce.boolean()` is wrong for this: `Boolean('on')` is `true` but `Boolean(undefined)` is `false` only because `undefined` is missing. The senior reach: `z.preprocess(val => val === 'on', z.boolean())` or the shorter `z.literal('on').optional().transform(v => v === 'on')`. Name the pattern once; the project chapter uses it for the `archived` flag.
- **Numbers — the empty-string footgun.** `Number('')` is `0`, not `NaN`. An optional number field that submits empty becomes zero, not undefined — usually wrong. The senior reach: `z.coerce.number()` is fine when the field is required and has a min; for optional numerics, `z.union([z.literal(''), z.coerce.number()]).transform(v => v === '' ? undefined : v)` or a `z.preprocess` that maps empty to undefined first. Name the trap, give the fix.
- **Dates — `z.coerce.date()` versus `z.iso.datetime()`.** Two shapes:
  - `z.iso.datetime()` validates the string format and infers as `string`. The action receives a string; the database column accepts an ISO string for a `timestamptz` (Drizzle handles the conversion). Reach for this when the data stays as a string until the database write.
  - `z.coerce.date()` validates the input parses to a `Date` and infers as `Date`. The action receives a `Date`. Reach for this when downstream code does date math, formatting, or timezone work in JavaScript.
  Choose by where the date next gets used; named both, picked one per schema.
- **Files — the multipart contract.** `formData.get('avatar')` returns a `File` instance when the input was a file input on a `multipart/form-data` form. `z.instanceof(File)` is the validator at this seam; `.refine(file => file.size <= MAX_SIZE)` and `.refine(file => ALLOWED_TYPES.includes(file.type))` chain. The full file-upload story (presigned URLs, R2) lives in Chapter 13.3; this lesson names the validation shape.
- **Watch-outs.** `z.coerce.boolean()` is wrong for HTML checkboxes — every string except the empty string is truthy, so `"false"` becomes `true`; `z.coerce.number()` on an empty string returns `0` — surprise zero on optional fields, use `z.preprocess` to map empty to undefined first; `Object.fromEntries(formData)` drops repeated keys to the last value — use `getAll` for multi-valued fields; `z.coerce.date()` on an invalid string produces an Invalid Date and *passes* the coerce step — pair with a `.refine(d => !isNaN(d.getTime()))` or prefer `z.iso.datetime().transform(s => new Date(s))` which fails the validation cleanly; `File` only exists in environments that polyfill or natively support it — Server Components, route handlers, and Server Actions on Next.js 16's Node runtime all have it, but legacy edge code paths may not.

What this lesson does not cover:

- The `<form action={serverAction}>` wiring (7.3.3).
- File upload pipelines (Chapter 13.3).
- The cursor-encoding pattern for `searchParams` validation (Chapter 6.3.6 covers the cursor shape; 5.5.4 the URL boundary).
- Server Actions themselves (7.2 is the next chapter).

Estimated student time: 35 to 45 minutes. The bridge lesson — pairs directly with every Server Action the chapter ships in 7.2 and 7.3.

---

## Lesson 7.1.7 — drizzle-zod: the database as the schema's source of truth

Topics to cover:

- **The senior question.** The Drizzle schema in `db/schema.ts` (Chapter 6.2) already declares every column, type, and nullability for the database. Writing a parallel Zod schema by hand for "the shape the API accepts when inserting an invoice" is the drift bug from 7.1.4 multiplied: when a column changes, the validation breaks silently. How does the chapter wire the database schema to be the validation schema's source of truth, what does `drizzle-zod` generate, and where does it stop generating versus where does the student refine on top? The lesson teaches `createSelectSchema`, `createInsertSchema`, `createUpdateSchema`, and the refinement-on-top pattern that adds API-only rules to the generated base.
- **The package and import path.** `drizzle-zod` lives inside the `drizzle-orm` repository as a workspace package since v0.3; the install is `pnpm add drizzle-zod` (or it ships in the same install as `drizzle-orm` depending on the version). The imports: `import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-zod';`. Same API surface as the standalone package; the rename to the monorepo is the v3-to-v4 (of drizzle-zod itself) shift the student will see in package.jsons.
- **`createSelectSchema(table)` — the read shape.** Generates a Zod schema matching the columns *as they come back from a select*: every non-nullable column is required, every nullable column is `.nullable()`, every column with a default is *still required* (the default is applied by the DB before the row exists). The inferred type matches `typeof table.$inferSelect` — the row type Chapter 6.2.10 named. Used for: validating response bodies, asserting the shape of a row in a test, deriving public-API response schemas via `.omit` and `.pick`.
- **`createInsertSchema(table)` — the write shape.** Generates a Zod schema matching the columns *as required for an insert*: columns with database defaults or `$defaultFn` are optional in the schema (the database fills them), generated columns are absent from the schema, nullable columns are optional. The inferred type matches `typeof table.$inferInsert`. Used for: validating Server Action inputs that create rows, deriving form-input schemas via `.omit({ organizationId: true, createdBy: true })` (those fields come from session/auth, not user input).
- **`createUpdateSchema(table)` — the partial-write shape.** Generates a Zod schema where every column is optional and generated columns are absent. Equivalent to `createInsertSchema(table).partial()` for most cases but cleaner at the call site. Used for: PATCH-style Server Actions, the `Update<Entity>` form variant.
- **The refinement-on-top pattern.** Generated schemas cover the database's constraints (types, nullability, generated columns) but not the API's additional rules (max lengths beyond what the column says, format validation tighter than `text`, cross-field rules). The 2026 reflex: take the generated schema, refine on top.

  Example shape: `const CreateInvoiceInputSchema = createInsertSchema(invoices, { number: (schema) => schema.min(1).max(50), total: (schema) => schema.refine(n => n >= 0) }).omit({ id: true, organizationId: true, createdBy: true, createdAt: true });`

  The second argument to `createInsertSchema` is the per-column override map: a function takes the column's generated base schema and returns a refined one. `.omit` strips the columns the action sets server-side. The result is the action's input contract; the database accepts the merged shape.
- **What `drizzle-zod` does and doesn't infer.** Maps Postgres types to Zod builders: `text` and `varchar` to `z.string()`, `integer` and `serial` to `z.number().int()`, `numeric` to `z.string()` (the only safe Zod surface for arbitrary-precision decimals — Drizzle returns numerics as strings to avoid float lossiness), `boolean` to `z.boolean()`, `timestamp` and `timestamptz` to `z.date()`, `uuid` to `z.string().uuid()` (note: v3-style — the override pattern lets the student swap to `z.uuid()` if they want strict RFC), `jsonb` to `z.unknown()` (the column accepts anything; the override is where the actual shape lands), pgEnums to `z.enum([...])` matching the enum's options. Custom column types fall through to `z.unknown()` and need an explicit override.
- **The `jsonb` override pattern.** A `jsonb` column inferred as `z.unknown()` is a non-contract — every consumer would have to narrow. The senior reach: declare the Zod schema for the JSON shape next to the table definition and pass it as an override: `createInsertSchema(events, { payload: () => EventPayloadSchema })`. The same schema can be passed as the column's `$type<...>` in Drizzle (Chapter 6.2.3) so the database's TypeScript type matches the Zod inferred type. Two sources, one truth.
- **`createSchemaFactory` — when you need your own Zod instance.** When the project extends Zod (e.g., `@hono/zod-openapi` for API documentation), `createSchemaFactory({ zodInstance: customZ })` returns generators that use the custom instance. Named once; rare in line-of-business code.
- **The full source-of-truth chain.** Database schema in `db/schema.ts` (Chapter 6.2) → `drizzle-zod` generates the base Zod schemas → the student refines on top → `z.infer` produces the TypeScript types → Server Actions consume the typed inputs → forms send the matching field names → drift becomes a compile error rather than a silent runtime bug. The diagram is worth showing once: one box (the database schema), arrows flowing to types and validations and forms, all derived. The 2026 reflex on top of Architectural Principle #2 (schema is the source of truth).
- **Where the generated schema isn't the right reach.** Pure API shapes that don't correspond to a table (session payload, webhook event envelope, third-party API response) get a hand-written `z.object`. The senior call: generate when the entity is a row, hand-write when it's not. Mixing the two cleanly is the pattern, not a smell.
- **Watch-outs.** `numeric` columns come back as strings — the inferred type is `string`, not `number`; do the conversion at the boundary (parse with `decimal.js` or `bignumber.js` for the production money pattern, named once) and not on the schema; the generated schema doesn't know about the database's `check` constraints — a `check(total >= 0)` exists at the DB but the Zod schema lets `-100` through unless the student refines it; nullable columns become `.nullable()` in the generated schema even though the form layer often wants `.optional()` — the override map flips this when needed (`name: (schema) => schema.optional()`); the override callback receives the column's generated schema, not a fresh one — `.refine` and `.min` chain onto it, the student doesn't rebuild from `z.string()` in the callback; `createSelectSchema` and `createInsertSchema` diverge for the same table on default-having columns — pick the right one for the boundary, don't reuse the wrong shape.

What this lesson does not cover:

- The database schema itself (Chapter 6.2).
- Server Actions consuming these schemas (7.2).
- Type-safe end-to-end via `$type<...>` and the `jsonb` shape pairing (named here, the full pattern lives in 6.2.3).
- OpenAPI generation from schemas (Chapter 7.5 names this in passing for route handlers).

Estimated student time: 35 to 45 minutes. The capstone of the chapter — the lesson that closes the source-of-truth loop and makes the rest of Unit 7 cheap to write.

---

## Lesson 7.1.8 — Chapter quiz

Top 10 topics to quiz:

- `z.strictObject` vs. `z.object` vs. `z.looseObject` — what each does with unknown keys, when each is the senior reach (request bodies, internal trusted shapes, external integrations).
- The v3-to-v4 string format migration — `z.email()`, `z.uuid()`, `z.url()` as top-level builders versus the deprecated `z.string().email()` chain; the `z.uuid()` strict RFC 4122 versus `z.guid()` distinction.
- `.refine` for single-field and cross-field rules — when to attach a `path`, when to reach for `.superRefine`, where the rule belongs (schema vs. action body).
- `.transform` vs. `.overwrite` — the inferred-output-type difference and when to reach for each.
- The v4 unified `error` option — replacing v3's `message` / `invalid_type_error` / `required_error`; the function form for dynamic messages.
- `parse` vs. `safeParse` — the throw-versus-Result decision and which one is the boundary default for Server Actions.
- `z.treeifyError` vs. v3's `error.format` — the v4 nested error shape and how form layers consume it.
- Composition methods — `.extend`, `.merge`, `.pick`, `.omit`, `.partial`, `.required` — and the derive-don't-duplicate reflex.
- `z.coerce` and `z.preprocess` for the `FormData` boundary — the checkbox-and-boolean trap, the empty-string-to-zero trap, the `z.iso.datetime` vs. `z.coerce.date` decision.
- `drizzle-zod`'s three generators — `createSelectSchema`, `createInsertSchema`, `createUpdateSchema` — the override-map refinement pattern, and the `jsonb` schema-pairing reflex.
