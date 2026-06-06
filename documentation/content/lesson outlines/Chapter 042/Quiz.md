sources:
  42.1: The eight builders
  42.2: Formats over regexes
  42.3: Checks and transforms
  42.4: Derive, don't duplicate
  42.5: parse, safeParse, and the error contract
  42.6: Crossing the FormData boundary
  42.7: 'drizzle-zod: one source of truth'

questions:
  - source: 42.1
    question: |
      A public API route handler parses its request body. A client POSTs `{ email, password, role: 'admin' }` against a schema that declares only `email` and `password`. With a plain `z.object({ email, password })`, what happens?
    choices:
      - text: |
          The parse **succeeds** and `role` is silently stripped from the output — the contract violation vanishes instead of surfacing. For a request body the senior reach is `z.strictObject`, which rejects the unknown key.
        correct: true
      - text: |
          The parse **fails** with an `unrecognized_keys` issue, because `z.object` rejects any key it didn't declare.
        correct: false
      - text: |
          The parse **succeeds** and `role: 'admin'` is forwarded on the output, so downstream code must remember to ignore it.
        correct: false
    why: |
      The default `z.object` strips unknown keys silently — the parse passes and the extra field just disappears, swallowing a possible probe or contract drift. `z.strictObject` is the one that throws on an unexpected key (that's `z.looseObject` that forwards extras, for the rare external-integration case). At any untrusted boundary, strict is the default precisely so a malformed contract surfaces instead of vanishing.

  - source: 42.2
    question: |
      A codebase is migrating from Zod 3 to Zod 4 and mechanically rewrites every `z.string().uuid()` to `z.uuid()`. The IDs come from a third-party system that doesn't always produce RFC-strict UUIDs. What's the risk?
    choices:
      - text: |
          v4's `z.uuid()` is **strict** (checks version and variant bits), so it can start *rejecting* identifiers the loose v3 check accepted. The faithful translation of v3's loose `z.string().uuid()` is `z.guid()`.
        correct: true
      - text: |
          None — `z.uuid()` is the exact behavioural equivalent of v3's `z.string().uuid()`, just written at the top level.
        correct: false
      - text: |
          `z.uuid()` is *looser* than the v3 chain, so previously-rejected values now pass and slip malformed IDs through.
        correct: false
    why: |
      v4 tightened `z.uuid()` to enforce a real RFC version and correct variant bits, whereas v3's `z.string().uuid()` accepted any `8-4-4-4-12` hex string. The loose v3 behaviour now lives in `z.guid()`. Rewrite to `z.uuid()` when you control the IDs (your app's UUIDv7 keys round-trip cleanly); rewrite to `z.guid()` when an upstream you don't control may emit non-strict values.

  - source: 42.3
    question: |
      You write a single-field check: `z.string().refine((value) => value.includes('@'), { error: 'Must contain @' })`. A user submits `"hello"`. What does the predicate's return value mean, and what happens?
    choices:
      - text: |
          The predicate returns `false`, so the value **fails** — in a refinement `true` means *acceptable*. You describe the passing state, not the problem.
        correct: true
      - text: |
          The predicate returns `false`, so the value **passes** — `false` signals "no error found."
        correct: false
      - text: |
          The predicate returns `true`, so the value **fails** — returning `true` flags the issue described in `error`.
        correct: false
    why: |
      A refinement's predicate returns `true` exactly when the value is *good*. `"hello".includes('@')` is `false`, so the value is rejected and the `error` message is raised. The common inversion is to describe the *problem* — `value.includes(' ')` for "has a space" — which returns `true` for the broken case and accepts every bad input. Burn it in: in a refine, `true` means acceptable.

  - source: 42.3
    question: |
      Each rule needs a home. Sort the four below: a `.refine`/`.transform` **on the schema**, or **in the Server Action body** after the parse.
    choices:
      - text: |
          On the schema: "`password` equals its confirmation" and "the email is lowercased and trimmed." In the action body: "this email isn't already registered" and "the org slug isn't taken."
        correct: true
      - text: |
          On the schema: "this email isn't already registered" and "the org slug isn't taken." In the action body: "`password` equals its confirmation" and "the email is lowercased."
        correct: false
      - text: |
          All four on the schema — Zod refinements can run database lookups through an async predicate, so there's no reason to split them.
        correct: false
    why: |
      The line is whether the rule is provable from the value(s) *alone*. Matching two passwords or normalizing an email needs nothing but the input, so it stays on the schema, where it's pure and portable. "Already registered" and "slug taken" need a database lookup — and a schema that needs a DB connection to parse can't run in a test or at the edge. Those live in the action body, after the parse, where database access is legitimate.

  - source: 42.4
    question: |
      `publicUserSchema = userSchema.omit({ passwordHash: true })` is built on a default `z.object`. A caller still sends an object that *includes* a `passwordHash`. What does the parse do?
    choices:
      - text: |
          It **passes**, stripping `passwordHash` from the output — `.omit` removes the field from the shape but doesn't add a guard against it arriving. The inferred `PublicUser` type provably has no `passwordHash`, which is what prevents the leak on the *response* side.
        correct: true
      - text: |
          It **fails** — `.omit` adds a rule that rejects any input still carrying the omitted key.
        correct: false
      - text: |
          It **passes** and keeps `passwordHash` on the output, so the omit only affects the type, never the runtime value.
        correct: false
    why: |
      `.omit` on a default `z.object` changes what the schema *describes and returns*, not what it *tolerates on the way in* — the extra key is stripped like any unknown key, and the parse succeeds. The security win is on the output: `PublicUser` has no `passwordHash` field, so an endpoint returning it can't leak the hash without a type error. If you needed the input *rejected* for carrying the key, the base would have to be a `z.strictObject`.

  - source: 42.4
    question: |
      A form schema validates `issuedAt` with `z.iso.datetime().transform((s) => new Date(s))`. The `<form>` sends a string; the action receives a `Date`. Which inference helper types the **form's** contract?
    choices:
      - text: |
          `z.input<typeof schema>` — the pre-transform shape, where `issuedAt` is `string`. `z.infer` (which equals `z.output`) would resolve to `Date`, the wrong type for what the form actually sends.
        correct: true
      - text: |
          `z.infer<typeof schema>` — it always resolves to the shape the parser accepts, which is the string the form sends.
        correct: false
      - text: |
          `z.output<typeof schema>` — the form contract is always the parsed shape, so the output type is what the form should be typed against.
        correct: false
    why: |
      A transform splits the type: the parser *accepts* a `string` but *returns* a `Date`. `z.input` is the pre-transform shape (`string`) — the form's contract. `z.output`, which `z.infer` aliases, is the post-transform shape (`Date`) — the action's parameter type. Reaching for `z.infer` to type the form silently hands you `Date`, and the mismatch only surfaces downstream as a confusing type error.

  - source: 42.5
    question: |
      Why is dropping `MySchema.parse(input)` straight into a Server Action that consumes form data the headline beginner mistake?
    choices:
      - text: |
          `parse` **throws** on bad input, so the first user with a malformed field gets a 500 instead of a field-level error. An invalid form is *expected*, so it should travel the return channel — `safeParse` — not the throw channel.
        correct: true
      - text: |
          `parse` is slower than `safeParse` because it builds a full stack trace on every call, even on success.
        correct: false
      - text: |
          `parse` silently coerces unknown keys instead of rejecting them, so the action proceeds on a half-validated object.
        correct: false
    why: |
      `parse` returns the typed value or throws a `ZodError`; an unhandled throw at a user boundary becomes a 500. The rule is "return the expected, throw the unexpected": invalid user input is a normal daily event, so it belongs on the return channel via `safeParse`, where the caller branches on `result.success` and renders the error. `parse` is for trusted internal edges (an `env.ts` loader at boot) where a failure is a programmer error worth crashing on. Wrapping `parse` in `try/catch` just rebuilds `safeParse` by hand — and catches *every* throw, not only `ZodError`.

  - source: 42.6
    question: |
      A form has an `archived` checkbox. You reach for `z.coerce.boolean()`. Why is this the wrong tool, and what's the consequence?
    choices:
      - text: |
          `z.coerce.boolean()` runs `Boolean(input)`, which is true for *every* non-empty string — so it accepts everything and rejects nothing, and would flip a literal `"false"` to `true`. The checkbox shape needs `z.preprocess((v) => v === 'on' || v === true, z.boolean())`.
        correct: true
      - text: |
          `z.coerce.boolean()` throws when the checkbox is unchecked, because the field is absent rather than `"off"`, so the parse 500s on every unchecked submission.
        correct: false
      - text: |
          Nothing is wrong — `z.coerce.boolean()` is the canonical checkbox validator; it maps `"on"` to `true` and the absent field to `false`.
        correct: false
    why: |
      `z.coerce.boolean()` is `Boolean()` in a wrapper: it truthiness-tests, so `'on'`, `'false'`, `'off'`, and `''` all become a valid boolean and the parse *always* succeeds — it can't reject anything, and it inverts any literal `"false"`/`"off"`. A checkbox sends `"on"` when checked and *nothing* when unchecked, so the right shape maps `'on'`/`true` to `true` and everything else (including the absent `undefined`) to `false` via `z.preprocess`. For a `<select>` whose value spells a word, `z.stringbool()` is the tool.

  - source: 42.6
    question: |
      On a boundary, why prefer `z.iso.datetime()` over `z.coerce.date()` for an `issuedAt` that's meant to be a precise timestamp?
    choices:
      - text: |
          `z.coerce.date()` runs `new Date(input)`, which happily accepts a date-only `"2026-01-15"` and silently invents a midnight-UTC time. `z.iso.datetime()` demands a full timestamp, so an off-contract string is rejected instead of quietly accepted.
        correct: true
      - text: |
          `z.coerce.date()` lets obvious garbage like `"not-a-date"` through, while `z.iso.datetime()` rejects it — the difference is invalid input.
        correct: false
      - text: |
          `z.iso.datetime()` returns a `Date` while `z.coerce.date()` returns a string, so only the former gives the action the type it needs.
        correct: false
    why: |
      Both reject true garbage like `"not-a-date"`; the trap is the *loose* case. `z.coerce.date()` is too lenient about format — `new Date('2026-01-15')` parses to a valid `Date` at midnight UTC, so a date-only string the contract should refuse sails through. `z.iso.datetime()` names the exact format (a full ISO timestamp with time and `Z`) and holds the line. Note it infers as `string`; if JS code needs a real `Date`, chain `.transform((s) => new Date(s))` so the strict format is checked *before* any `Date` is built.

  - source: 42.7
    question: |
      An action validates a new invoice and reaches for one of `drizzle-zod`'s generators. The `invoices` table has `id` and `createdAt` columns with database defaults. Which generator fits an *insert*, and what does it do with those defaulted columns?
    choices:
      - text: |
          `createInsertSchema` — it makes defaulted columns **optional**, because the database fills them; the caller doesn't supply them.
        correct: true
      - text: |
          `createSelectSchema` — it's the canonical write shape, and it keeps `id` and `createdAt` **required** so the insert is fully specified.
        correct: false
      - text: |
          `createUpdateSchema` — it's the only generator that makes defaulted columns optional, so it's the right reach for any insert.
        correct: false
    why: |
      `createInsertSchema` is the write shape: columns with a `default` or `$defaultFn` become optional, since the database supplies them, and generated columns are absent. `createSelectSchema` is the *read* shape — a row coming back already has its `id` and `createdAt`, so those stay required; using it for an insert wrongly forces the caller to send them. `createUpdateSchema` is the PATCH shape (every column optional), for partial edits, not creation.

  - source: 42.7
    question: |
      Pairing a `jsonb` column's schema with the table, you write `createInsertSchema(events, { payload: eventPayloadSchema })`. The `payload` column is nullable. What's the footgun?
    choices:
      - text: |
          This is the **direct-schema** override form — it *replaces* the column's schema and drizzle-zod does **not** re-apply nullability, so the `.nullable()` silently vanishes. Re-add it yourself: `payload: eventPayloadSchema.nullable()`.
        correct: true
      - text: |
          The override map only accepts a callback `(schema) => ...`, so passing a schema directly is a type error that won't compile.
        correct: false
      - text: |
          Nothing — drizzle-zod always re-wraps the column's nullability around an override, whichever form you use.
        correct: false
    why: |
      The override map has two forms. The *callback* form, `{ payload: (schema) => schema... }`, refines the generated base and has its nullability and optionality re-applied around your result — the safe default. The *direct-schema* form replaces the column's schema wholesale and does **not** re-apply nullability, so a nullable column silently loses its `.nullable()`. Use it only when you mean to own the whole shape (the `jsonb` pairing), and re-add the modifier yourself.
