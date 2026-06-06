# Lesson 3 outline — zodResolver: one schema, both sides of the wire

## Lesson title

- **Title:** `zodResolver: one schema, both sides of the wire`
- **Sidebar label:** `One schema, both sides`

---

## Lesson framing

This is the lesson where RHF stops being a parallel system and becomes *the same Zod schema rendered in two places*. The whole lesson is one thesis, stated in the title: the form validates against the exact schema the Server Action parses with. Everything else (the type bridge, the call shape, the server-error round-trip) is detail in service of that one discipline.

**Archetype: pattern lesson.** Not a mechanics tour — the student already has the five primitives from L2 and saw `resolver: zodResolver(InvoiceSchema)` sitting in the skeleton marked `// wired next lesson`. This lesson pays exactly that debt and the partnered `// map result.error.fieldErrors back into the form — next lesson` comment. Open by naming both debts and resolving the first one in three lines, fast — the wiring is genuinely tiny, and the lesson's value is the *reasoning*, not the keystrokes.

**The senior question that drives the lesson** (state implicitly in the intro, do not label it): the action's first line is already `safeParse` against `InvoiceSchema` (Ch043 L2). The form needs to validate the *same shape* before the action runs, to drive inline errors. The lazy reach is a second, client-side schema or hand-written `register` rules. Both drift the day a field is added. The resolver is the senior reach: one schema, imported by both the form and the action.

**Threads that must run verbatim** (continuity-critical — these were established in L1/L2 and recur every lesson):
- **Trust boundary** (Term, defined L1): adopting the resolver does NOT move it. Client validation is *for the user* (fast inline feedback); server `safeParse` is *for the system* (the gate). "Any architecture that validates only in RHF and skips the action's `safeParse` has the wrong trust boundary." Repeat this the moment the resolver lands — a beginner who just wired client validation is exactly the person tempted to delete the server parse.
- **The submit changes hands** (L2): the action is called as a plain function from inside `onSubmit` — unchanged from Ch043. The resolver is purely client-side; it never touches the action.
- **`Field` + `Controller`, NOT `<FormField>`/`<FormMessage>`** (DELIBERATE DIVERGENCE locked in L2): all field rendering in this lesson uses shadcn's current `Field` family directly with `Controller`. `fieldState.error` and `<FieldError>` render *both* client resolver errors and server-pushed errors because both land in `formState.errors`. Do NOT regress to the legacy `<Form>` wrapper the chapter outline references.

**Running example — keep identical to L2, do not rename:**
- Schema: `InvoiceSchema`; input type `InvoiceInput`; fields `customer` (string), `email` (email), `total` (number).
- Action: `createInvoice`, returns the course `Result<T>` (`{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }`).
- Component: `NewInvoiceForm` in `app/invoices/new-invoice-form.tsx` — the canonical skeleton from L2 §"The canonical form skeleton". This lesson *fills in the two comments* in that exact file. End state: the skeleton with the resolver live and `applyServerErrors` wired.
- `InvoiceSchema`/`InvoiceInput` is kept over the strict `createInvoiceSchema` naming convention for chapter continuity — note this is deliberate so downstream agents don't "fix" it.

**Pedagogical posture.** Lead with the pain (two schemas drift), show the fix is three lines, then spend the lesson on the three things that actually bite: (1) the type bridge when the schema transforms input→output, (2) which call shape to pick, (3) that the schema can't see server-only rules so those round-trip back as `fieldErrors`. Minimize cognitive load: the resolver itself is trivial; the lesson's weight is entirely in the three follow-on subtleties, each isolated into its own section with a single focused visual or code comparison. Do not introduce `useFieldArray` or wizards — those are L4/L5.

---

## Lesson sections

### Intro (no header)

Warm, brief, ~1 paragraph. Beats, in order:
- Callback to L2: the skeleton you built has two comments waiting — `resolver: zodResolver(InvoiceSchema) // wired next lesson` and `// map result.error.fieldErrors back into the form — next lesson`. This lesson closes both.
- Name the problem the resolver solves before naming the resolver: the action already validates `InvoiceSchema` on entry; the form needs the same rules client-side for inline errors; writing them twice is a bug waiting for the next schema change.
- Promise: by the end, one schema feeds both sides, you'll know how to type the form when the schema transforms values, which of two call shapes to use, and how server-only failures (a taken email) get back to the right field.
- One line restating the trust boundary so it frames the whole lesson: the resolver is a convenience for the user; the action's parse is still the gate.

### A resolver is the form's validation source

Goal: define what a resolver *is* before wiring it, so `zodResolver` isn't magic.

Content:
- RHF's `resolver` option is a function RHF calls to decide validity: roughly `(values) => { values, errors }` — it receives the current field values and returns either the parsed values or a map of field errors. (Keep the signature conceptual; do not dump the full `(values, context, options)` form — it adds nothing here.)
- `@hookform/resolvers` is a separate small package shipping pre-built resolvers for Zod, Valibot, ArkType, Yup, and others. `zodResolver(schema)` is the adapter that turns a Zod schema into that resolver function.
- The senior anchor to install here: **the resolver is the form's only validation source.** No per-field rules in `register`, no hand-written `setError` for shape-level problems. If a rule is about the *shape* of the data (format, length, required), it lives in the schema and the resolver enforces it for free.
- Bridge sentence to the next section: because the resolver is just "point validation at a schema," wiring it is three lines.

Component: plain prose. Optionally one tiny `Code` block (lang `ts`) showing the conceptual resolver signature as a type — `type Resolver = (values: TFieldValues) => { values: TOutput; errors: FieldErrors }` — only if it clarifies; author's call. No diagram needed; this is a definition.

Tooltip candidates: **resolver** (Term) — "The function RHF calls to validate the form's values. `@hookform/resolvers` ships one per validation library; `zodResolver(schema)` is the Zod adapter."

### Wiring it: install, import, pass

Goal: the three-line mechanical wiring, shown once, then never belabored again.

Content:
- Step 1: install `@hookform/resolvers` (it's separate from `react-hook-form`). Show the `pnpm add @hookform/resolvers` line. Note `zod` is already a dependency from Ch042.
- Step 2: import — `import { zodResolver } from '@hookform/resolvers/zod';`.
- Step 3: pass it to `useForm` — the one line that was a comment in L2 is now real.
- State the runtime behavior plainly: the resolver runs on the configured `mode` (the `'onBlur'` default from L2) and on every `handleSubmit`. Errors land in `formState.errors`, keyed by the schema's field paths — which is exactly where the `Field`/`FieldError` rows already read from, so the L2 form lights up with validation the instant the resolver is wired, no per-field changes.

Component:
- Use `Steps` (Starlight) for the three install/import/pass steps, each with its one-liner fence inside.
- Then a single `Code` block (lang `tsx`, `title="app/invoices/new-invoice-form.tsx"`) showing the `useForm` call with the resolver now live and the `// wired next lesson` comment removed. Use `ins=` to mark the resolver line as the change from L2, or highlight it. Keep it to the `useForm` call only — do not re-show the whole component.

Reasoning: the mechanical part is deliberately compressed (it really is three lines) so the lesson's body can spend its budget on the subtleties. A reader who only skims should still walk away able to wire it.

### One schema, two importers

Goal: the lesson's thesis (and title). Make the "single source of truth" concrete and reviewable.

Content:
- The schema lives in one shared module (a `schemas`/`_lib` file the feature owns). The action file imports `InvoiceSchema` and parses `Object.fromEntries(formData)` (or a typed input — next section) against it. The form file imports the *same* `InvoiceSchema` and hands it to `zodResolver`. One definition: field rules, error messages, transforms — all of it, both sides.
- Make the payoff tangible: add a field, change a min-length, tweak an error message — the change happens *once*, and both the client UX and the server gate move together. Contrast explicitly with the lazy path (parallel client schema / `register` rules): that path requires editing two places and silently drifts when someone forgets one.
- The senior-review line (state it as a reviewer reflex): a PR that adds validation in the form component which isn't in the schema gets rejected — the schema is the source, the form is the renderer, the action is the gate.
- Reinforce the trust boundary here once more, concretely: the resolver runs the schema *client-side* for fast feedback; the action runs the *same schema* server-side because the client can be bypassed (devtools, a replayed request, JS off). Same rules, two runtimes, two different jobs — not redundancy.

Component:
- `CodeVariants` (or `TabbedContent`) with two tabs sharing the framing "same import, both sides":
  - Tab "The schema (one file)": the `InvoiceSchema` definition in its shared module (lang `ts`). Keep it to the 3 fields, using top-level format builders per Ch042 conventions: `z.object({ customer: z.string().min(1), email: z.email(), total: z.coerce.number<number>().positive() })`. Use the `z.coerce.number<number>()` generic on `total` so `z.input` is a clean `number` (see the type-bridge section's fix) — and add a one-line comment on that field pointing forward to why the generic is there. Export `type InvoiceInput = z.input<typeof InvoiceSchema>` and `type Invoice = z.output<typeof InvoiceSchema>` — foreshadows the next section.
  - Tab "The action (imports it)": `createInvoice` showing the *first line* `const parsed = InvoiceSchema.safeParse(...)` and `import { InvoiceSchema } from ...` — abbreviate the body to a comment; the point is the import + parse, not the mutation (that's Ch043). Mark the import line.
  - Tab "The form (imports it)": the `useForm({ resolver: zodResolver(InvoiceSchema), ... })` call with the matching `import { InvoiceSchema }`. Mark the import line.
- Prefer `CodeVariants` if these read as three versions of "where the schema is used"; the doc says prefer `CodeVariants` for code-vs-code. Three tabs is fine.

Reasoning: showing the *same import path* in three files is the most direct way to make "one schema, both sides" land — it's a spatial/visual argument, not a prose one. The student should see one `import { InvoiceSchema }` appear identically in the action and the form.

`Aside` (caution): the resolver runs *only the schema's rules*. Any rule the client can't evaluate — uniqueness, plan limits, anything needing the database — cannot live in the schema and won't be caught by the resolver. Those round-trip back through the action's `fieldErrors` (later section). Plant this now so the "schema is the source" claim isn't overread into "the schema validates everything."

### The type bridge: z.input vs z.output

Goal: the single most confusing thing about resolver + transforms. Beginners type the form with `z.infer` and get bitten the moment a `coerce`/`transform`/`default` enters the schema.

Content:
- Re-anchor (do NOT re-teach — Ch042 L4 owns this) the prerequisite in two sentences: a Zod schema with `.transform()`, `z.coerce`, or `.default()` has a *different input type than output type*. `z.coerce.number()` produces a `number` but *accepts* `unknown` — verified: in Zod 4 the `z.input` of a bare `z.coerce.number()` is `unknown`, not `string` and not `number`. (Do NOT claim the input is `string`; that is the intuitive-but-wrong belief this section exists to correct.)
- Map it onto the form precisely:
  - The values RHF *tracks* and that `defaultValues` must match are the **input** type (`z.input` / `InvoiceInput`) — the raw, pre-transform shape. For `total` under a bare `z.coerce.number()` that input type is `unknown`, which makes `defaultValues: { total: 0 }` and `field.value` awkward to type cleanly.
  - The values handed to `onSubmit` *after* the resolver runs are the **output** type (`z.output`) — coerced and transformed (`total` is a `number`).
- Name the senior fix for the awkward `unknown` input, briefly: pin the coercion's *input* type with the Zod 4 generic — `z.coerce.number<number>()` makes `z.input` resolve to `number`, so `defaultValues: { total: 0 }` and the registered number input type-check against a real `number` while the output stays `number`. This is the cleaner shape for an RHF number field than a bare `z.coerce.number()` whose input is `unknown`. (One sentence + show it in the schema tab; don't over-explain — it's a precision fix, not a new concept.)
- The senior reach: type `useForm` so registration uses the input type and `onSubmit` receives the output type. RHF v7's `useForm` generics accept *both* — show the explicit three-generic form `useForm<TFieldValues, TContext, TTransformedValues>` so `handleSubmit`'s callback is typed as the output. Concretely: `useForm<InvoiceInput, unknown, Invoice>(...)` → `onSubmit(values: Invoice)`.
- The watch-out (state as the trap, inline): typing `useForm<z.infer<typeof InvoiceSchema>>()` *works* while the schema has no transforms, so it looks fine — and silently misleads the day someone adds `z.coerce`. Explicit `z.input`/`z.output` is correct from the start. (This is a "looks fine until it doesn't" footgun — flag it strongly.)
- Connect back to the `FormData` boundary from Ch042 L6: the reason `total` is a coercion at all is the form/`FormData` string boundary — `z.coerce.number()` is the same tool that chapter installed. Here it's the seam between RHF's tracked input and the action's expected output.

Component:
- `AnnotatedCode` (lang `tsx`) walking the typed `useForm` call. The `code` prop is the `useForm` call with explicit generics and a typed `onSubmit`:
  ```
  const form = useForm<InvoiceInput, unknown, Invoice>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: { customer: '', email: '', total: 0 },
    mode: 'onBlur',
  });

  const onSubmit = async (values: Invoice) => {
    // values.total is number — coerced by the resolver
  };
  ```
  Steps (tint each a distinct color):
  1. Highlight `<InvoiceInput, ...>` (first generic, violet): "What RHF tracks — the input type. `defaultValues` and every `register`/`field.value` are this raw shape."
  2. Highlight `, Invoice>` (third generic, green): "What `onSubmit` receives — the output type, after the resolver transformed the values."
  3. Highlight `values: Invoice` and the `values.total` comment (blue): "Inside `onSubmit`, `total` is already a `number`. The resolver ran the coercion; you call the action with clean, output-typed values."
- `CodeTooltips` is an alternative if a single block with hover defs on `z.input`/`z.output` reads better — but `AnnotatedCode` is the stronger fit because the three generics need sequential focus.

Tooltip candidates (via `Term` or `CodeTooltips`): **`z.input`** — "The type a schema accepts *before* transforms/coercion run. What RHF tracks and `defaultValues` must match. For a bare `z.coerce.x()` it's `unknown` unless you pin it." **`z.output`** — "The type a schema produces *after* transforms run. What `onSubmit` receives." (Both are re-anchors of Ch042 — keep one line each.)

Optional embed: a `TSPlaygroundCallout` with a tiny `InvoiceSchema` + `z.input`/`z.output` so the student can hover and watch the two types differ on `total` (output `number`; input `number` with the pinned `z.coerce.number<number>()`, or `unknown` with the bare form — showing the pin's payoff is the point). Reserve this for the curious; mark it as optional, not required reading. Use a pre-computed share URL if the build agent can produce one; otherwise pass `code` + `flags: { strict: true }`.

Reasoning: this is the section most likely to confuse, and it's invisible until a transform appears — so it earns the lesson's most deliberate visual. Sequential highlighting of the three generics maps one-to-one onto "track this / transform / receive that," which is the mental model to leave with.

### Calling the action: typed object vs FormData

Goal: resolve the call-shape decision the L2 skeleton left implicit (`onSubmit` calls `createInvoice(values)` — but with what?).

Content:
- Frame as a senior choice with a default, not two equal options:
  - **Typed-object call (the 2026 default when RHF is the only caller).** RHF already holds the typed (output) object. `onSubmit(values)` calls `await createInvoice(values)` directly; the action's signature is `createInvoice(input: Invoice)` and its first line is `InvoiceSchema.safeParse(input)` — no `FormData`, no `Object.fromEntries`. The `FormData` round-trip is pure ceremony when you already have the object. This is the reflex for an RHF-managed form.
  - **`FormData`-keeping call (when the endpoint serves more than RHF).** Build `FormData` from `values` and call `createInvoice(formData)` so the action stays compatible with a non-RHF caller — a no-JS fallback, or a Ch044-style native form pointing at the same action. Reach for this only when the action genuinely has multiple front-end shapes or progressive enhancement matters for that same endpoint.
- The decision rule in one line: RHF is the only caller → typed object; the action serves other shapes too → keep `FormData`.
- Tie to the action's parse seam (Ch043, do not re-teach): either way the action's *first move is still `safeParse`*. The typed-object action just parses the object instead of `Object.fromEntries(formData)`. The trust boundary is identical — the input arrives, the action parses it, no exceptions.
- Note the project (Ch047) is deliberately native-pattern, so its `createInvoice` takes `FormData`; an RHF form calling that same action is the `FormData`-keeping case — a concrete reason the second shape exists, not a hypothetical.

Component:
- `CodeVariants`, two tabs (lang `tsx`), shared framing "two ways `onSubmit` calls the action":
  - Tab "Typed object (default)": `onSubmit` calling `createInvoice(values)` + the action signature `async function createInvoice(input: Invoice)` with first line `const parsed = InvoiceSchema.safeParse(input);` (body elided to a comment). Mark the `createInvoice(values)` call and the `safeParse(input)` line.
  - Tab "FormData (multi-caller)": `onSubmit` building `const formData = new FormData(); formData.set('customer', values.customer); ...` then `createInvoice(formData)`; the action's first line stays `InvoiceSchema.safeParse(Object.fromEntries(formData))`. Mark the `FormData` construction and the call.
- One paragraph of prose after stating the default explicitly so a skimmer takes away "typed object unless the action has other callers."

Reasoning: code-vs-code A/B is exactly `CodeVariants`'s job. Two tabs make the *cost* of `FormData` (manual reconstruction) visible right next to the clean typed call, which is the whole argument for the default.

### Mapping server errors back into the form

Goal: pay the second L2 debt — `// map result.error.fieldErrors back into the form`. This is where server-only failures (a taken email) become a red message under the right field.

Content:
- Set up the case the schema *can't* cover: uniqueness ("email already taken"), plan limits, any business rule needing the database. The resolver passed (the email is well-formed), the action ran, and the action returned `{ ok: false, error: { code: 'conflict', userMessage, fieldErrors: { email: ['Already taken'] } } }`. (Use the course `Result` shape exactly: `error.fieldErrors` is a flat `Record<string, string[]>` per Code Conventions §Zod / §Error handling. Do NOT use the outline's `{ error: { fieldErrors } }`-without-`code` shorthand — show the real contract.)
- The mechanism: RHF's `form.setError(name, { message })` pushes an error into `formState.errors[name]` — the *same place* the resolver writes. So a server-pushed error renders through the identical `Field`/`FieldError` row with zero extra UI. This is the punchline: client and server errors are one rendering path.
- The pattern: loop the returned `fieldErrors` and `setError` each. Then hoist that loop into a tiny reusable helper `applyServerErrors(form, result)` (the helper L2 forward-referenced) so every form does it the same way.
- The senior reach for setting it correctly: read `result.error.fieldErrors?.<field>?.[0]` — the first message — matching the flat contract. After a successful `result.ok`, do the L2 success move (`reset(values)`); on `!result.ok` with `fieldErrors`, apply them. Show the full `onSubmit` branch so the skeleton's comment is finally gone.
- Watch-out (inline): do NOT use `setValue('field', v, { shouldValidate: true })` to push server state in — that re-runs the resolver and can clobber the server's specific message with a (passing) client result. `setError` is the right tool for a server-pushed error; `setValue` is for changing a value.
- Watch-out (inline): a `fieldErrors` key that doesn't match a registered field name is a silent no-op — the schema keys, the form `name`s, and the action's `fieldErrors` keys must all agree (which they do, because they all derive from the one schema — closing the loop back to the thesis).

Component:
- `AnnotatedCode` (lang `tsx`) walking the completed `onSubmit` + the `applyServerErrors` helper. `code` prop approx:
  ```
  const onSubmit = async (values: Invoice) => {
    const result = await createInvoice(values);
    if (result.ok) {
      form.reset(values);
      return;
    }
    applyServerErrors(form, result);
  };

  function applyServerErrors(form: UseFormReturn<InvoiceInput, unknown, Invoice>, result: ...) {
    const fieldErrors = result.error.fieldErrors ?? {};
    for (const [name, messages] of Object.entries(fieldErrors)) {
      form.setError(name as FieldPath<InvoiceInput>, { message: messages[0] });
    }
  }
  ```
  Steps:
  1. Highlight `const result = await createInvoice(values)` (blue): "The action ran and returned the canonical `Result`. The resolver already passed client-side — this catches what only the server can know."
  2. Highlight the `result.ok` branch + `form.reset(values)` (green): "Success: reset to the saved values, clean dirty state — the L2 move."
  3. Highlight `applyServerErrors(form, result)` (orange): "Failure with field errors: hand them to the helper."
  4. Highlight `form.setError(...)` inside the helper (orange): "`setError` writes into `formState.errors` — the *same place* the resolver writes — so the existing `FieldError` row renders the server message with no new UI."
- Keep the helper's `result` param type loose-but-honest in prose (it's the `{ ok: false }` arm of `Result`); don't over-engineer the generics in the displayed code — note to downstream agents that the exact generic on `UseFormReturn` may be simplified for display, deliberately.

`Aside` (note): this closes the loop on the thesis — client format errors and server business errors flow through one `formState.errors` and one `FieldError` row, because the field names come from one schema. One schema, one error surface.

Brief paragraph on `mode` vs `reValidateMode` (the L2 forward-reference — name it here, do not over-expand): `mode` sets *when validation first runs* for a field (default `'onSubmit'`; the course uses `'onBlur'`); `reValidateMode` sets *when it re-runs after a field already errored* (default `'onChange'`). The canonical pairing for the "validate on blur, then fix-as-you-type" UX is `mode: 'onBlur'`, `reValidateMode: 'onChange'`. One sentence + maybe a one-line `Code`/`CodeTooltips` showing both options; this is recognition-level, not a deep dive.

Reasoning: the server-error round-trip is the half of "both sides of the wire" that isn't validation — it's how the *result* of server validation gets back to the user. Sequencing it last, after the call-shape decision, means the student has the full `onSubmit` by the end. The `AnnotatedCode` walks the exact code that erases the skeleton's last comment, giving narrative closure to the L2→L3 arc.

### Async checks in the schema (the rare case)

Goal: name async refinements once so the student knows the door exists, without opening it (it's genuinely uncommon and routes through Ch046).

Content:
- One short paragraph. Zod's `.refine()` accepts an async predicate, and the resolver supports it — useful for a debounced "is this username available?" check. The senior reach when you do this: the async refinement calls a route handler (Ch046) that runs the uniqueness check server-side and *reuses the same schema*. But most forms don't need it — they route uniqueness through the action's failure path (the `fieldErrors` round-trip you just built). Name it, point forward to Ch046, move on.

Component: prose only. No exercise, no diagram. Mark clearly as out-of-scope-deep / recognition-only so downstream agents keep it to a paragraph.

Reasoning: the chapter outline lists this; it earns one paragraph for completeness and to pre-empt "but what about live uniqueness checks?" — but expanding it would bloat a lesson whose center is the offline resolver.

### Check your understanding

Two checks while the surface is fresh.

1. **The trust-boundary / drift trap** — `MultipleChoice` (single-correct). Scenario: a teammate, having wired `zodResolver`, proposes deleting the `safeParse` from the action "since the form already validates." Ask what's wrong.
   - Correct: the resolver runs client-side only and is bypassable (devtools, replayed request, JS off); the action's `safeParse` is the trust boundary and must stay — same schema, two runtimes, two jobs.
   - Distractors: "fine, the schema is the same so it's redundant" (the drift/bypass misconception — the target wrong answer); "fine if `mode: 'onChange'`" (timing red herring); "you should instead validate only on the server and drop the resolver" (overcorrection that loses the inline UX).
   - `McqWhy`: restate the trust boundary — client validation is for the user, server parse is for the system; identical rules, but the network is hostile so the server can't trust the client's pass.

2. **The type bridge** — `Dropdowns` (fenced-code mode) OR a `ZodCoding` exercise:
   - Preferred: `Dropdowns` over a `useForm` call with two `___` blanks — generic 1 (`z.input` shape / `InvoiceInput`) and the `onSubmit` param type (`Invoice` / `z.output`), forcing the student to place input vs output correctly. Options per blank should include `z.infer`-typed and swapped-order decoys. `instructions`: "This schema coerces `total` from a string to a number. Pick the type for what RHF *tracks* and the type for what `onSubmit` *receives*."
   - Alternative (if a runnable check adds value): a `ZodCoding` exercise on `InvoiceSchema` with a `z.coerce.number()` on `total` and fixtures proving the string `"100"` parses to pass and a malformed `total` fails — with a `^?` query rendering `z.input` vs `z.output` so the student watches the two types differ. Use this only if it reads as reinforcing the bridge rather than re-teaching Zod (Ch042's job). Default to `Dropdowns` — it targets the *form-typing* decision, which is this lesson's contribution.

Reasoning: the two checks target the two ideas most likely to be gotten wrong in production — deleting the server parse (trust boundary) and mistyping the form (the bridge). Skip a check on the wiring itself; it's trivial and a check would be busywork.

### Going further (optional)

`CardGrid` of `ExternalResource` cards, 2–3:
- `@hookform/resolvers` repo/README — `https://github.com/react-hook-form/resolvers` (the resolver package and its Zod adapter; the README documents the three-generic `useForm` typing for transforming schemas).
- React Hook Form — `useForm` docs — `https://react-hook-form.com/docs/useform` (the `resolver` option, the `TTransformedValues` generic, and `setError`).
- Optionally Zod's API docs `https://zod.dev/api` for the `z.input`/`z.output` and coercion sections (re-anchor link).
Keep to references that fill corners; the lesson is self-contained. (Note for the build agent: the RHF docs site rejected automated fetches during outline research — verify these URLs resolve and the `setError`/three-generic surfaces are still documented as described before citing.)

---

## Scope

**This lesson covers:** wiring `zodResolver` from `@hookform/resolvers/zod`; the "one schema, both importers" discipline; `z.input` vs `z.output` and how to type `useForm`/`onSubmit` across a transforming schema; the typed-object vs `FormData` action-call decision; mapping `Result.error.fieldErrors` back into the form via `setError`/`applyServerErrors`; `mode` vs `reValidateMode` (named, not deep); async schema refinements (named once, deferred to Ch046).

**Explicitly out of scope — do not teach (owned elsewhere):**
- **Zod schema authoring** — builders, formats, `.refine`/`.transform`, derivation (`.pick`/`.partial`/etc.), and the `z.input`/`z.infer`/`z.output` distinction itself are Ch042 (L1–L7). This lesson *re-anchors* `z.input`/`z.output` in two sentences as a prerequisite and *applies* them to RHF; it does not re-teach how transforms work.
- **The Server Action seam** — `safeParse`-on-entry (Ch043 L2), the `Result<T>` shape and `ok`/`err` helpers (Ch043 L3), the parse→authorize→mutate→revalidate→return five-seam, and `db.transaction` are Ch043. Show the action's *first line* (`safeParse`) only as the receiving end of the call shape; do not re-teach the action body. `applyServerErrors` consumes the `Result` contract Ch043 locked — reference it, don't redefine it.
- **The five RHF primitives** — `useForm`, `register`, `Controller`/`useController`, `handleSubmit`, `formState`, `watch`/`useWatch`, `defaultValues`/`reset` are L2. Use them freely as known; do not re-explain. `reset(values)` on success is an L2 move reused here, not re-taught.
- **The four triggers / when to reach for RHF / the form-library landscape** — L1. Do not re-litigate the decision; the trigger has fired.
- **`Field` family API** — the shadcn `Field`/`FieldLabel`/`FieldError`/`FieldGroup` layout layer is L2 (and Ch027 owns the design system). Use `Field` + `Controller` as established; do not re-teach the primitives. Just rely on `FieldError` reading `formState.errors`.
- **`useFieldArray`** (L4) and **`FormProvider`/wizards** (L5) — not introduced here. The array schema shape (`z.array(z.object())`) and per-row error access belong to L4; cross-step `.refine` and `trigger` belong to L5.
- **Route handlers** — the async-refinement → route-handler path is Ch046; name the door, don't open it.

**Prerequisites to redefine concisely (1–2 sentences each, do not expand):** trust boundary (client-vs-server validation jobs); `z.input`/`z.output` (pre- vs post-transform types); the course `Result` shape (`{ ok: false; error: { code, userMessage, fieldErrors? } }`); the L2 canonical skeleton (the file this lesson completes).

---

## Code conventions alignment notes

- **Schema naming divergence (deliberate, inherited):** convention is `<verbEntity>Schema` (`createInvoiceSchema`). L1/L2 shipped `InvoiceSchema`/`InvoiceInput` for chapter continuity; L3 keeps them. Flagged so downstream agents don't "correct" it.
- **`Result` shape:** use the canonical `{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }` (Code Conventions §Error handling). The chapter outline's `{ ok: false, error: { fieldErrors } }` shorthand omits `code`/`userMessage` — show the real contract. `fieldErrors` is flat `Record<string, string[]>`; forms read `result.error.fieldErrors?.<field>?.[0]` (§Zod).
- **Zod builders:** use top-level format builders — `z.email()` not `z.string().email()`; `z.coerce.number()` for the `total`/`FormData` seam (§Zod).
- **Imports:** `import { zodResolver } from '@hookform/resolvers/zod';` (external group); `import type` for type-only (`FieldPath`, `UseFormReturn`, `Invoice`) per `verbatimModuleSyntax`.
- **Function form:** `applyServerErrors` is a small pure-ish helper — arrow `const` is the default, but a `function` declaration is acceptable if hoisting reads better in the displayed snippet; author's call. Two positional params max (`form`, `result`) — fine.
- **`'use client'`:** the form file is already a Client Component (L2); no change.
- **Comments:** keep them rare. The only comments in displayed code are the forward-pointer being *removed* and inline clarifiers on the type bridge (`// total is number — coerced`).
- **Display divergence note for downstream agents:** generics on `UseFormReturn`/`applyServerErrors` may be simplified in displayed code for legibility — mark such simplifications deliberate so the reviewer doesn't flag them against strict typing.

### Versioning / fact-check notes for the build agent (verified June 2026)

- **Versions:** `react-hook-form` is at v7.77.0; `@hookform/resolvers` at v5.4.0 (both current, no major-version surprises). Zod 4 is the course baseline (Ch042). The build agent should resolve the latest patch and confirm the snippets compile against it; pin in the project's lockfile.
- **The three-generic `useForm<TFieldValues, TContext, TTransformedValues>` is the *verified* current way** to get `handleSubmit`/`onSubmit` to receive `z.output`. `useForm<InvoiceInput, unknown, Invoice>({ resolver: zodResolver(InvoiceSchema) })` is the canonical shape. A single-generic `useForm<InvoiceInput>` (as L2 showed pre-resolver) types `onSubmit`'s `values` as the *input*, not the transformed output — so L3 deliberately *upgrades* L2's `useForm<InvoiceInput>` to the three-generic form once the resolver lands. Call this upgrade out explicitly so it doesn't read as drift from L2.
- **Known resolver type-inference churn:** `@hookform/resolvers` has had documented type-inference regressions across recent 4.x/5.x patches with Zod v4 transforms (react-hook-form/resolvers issues #743, discussions #10861 / #13205). The three-generic form is the stable workaround. The build agent must compile the type-bridge and `applyServerErrors` snippets against the pinned versions and adjust the exact generic/`as` casts if inference shifted — without changing the lesson's teaching (input vs output typing). If `zodResolver` inference is clean on the pinned version, prefer the minimal form; if not, the explicit generics carry it.
- **`z.coerce.number()` input type is `unknown`** in Zod 4; `z.coerce.number<number>()` pins `z.input` to `number`. Verified against Zod's API docs and the coerce discussion. The lesson uses the pinned generic on `total` for a clean RHF number field; if the build agent finds the pinned generic interacts badly with `zodResolver` inference on the pinned versions, fall back to a bare `z.coerce.number()` and type `defaultValues`/the field explicitly — note whichever choice is made.
