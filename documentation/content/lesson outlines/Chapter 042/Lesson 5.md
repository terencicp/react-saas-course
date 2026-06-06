# Lesson title

- Title: parse, safeParse, and the error contract
- Sidebar label: parse vs safeParse

# Lesson framing

This is the most-referenced lesson in the chapter: every Server Action, route handler, and webhook in Units 6–23 calls one of these four methods, and every form reads the error shape this lesson defines.
The student already knows how to *build* a schema (L1–L4); this lesson teaches how to *run* it and what comes back on each side of the success/failure split.

The spine of the lesson is a single senior decision — **return the failure, or throw it?** — mapped onto Zod's two parse families.
That decision is not arbitrary: it follows the trust boundary. Untrusted input (a form, a request body, a webhook) gets `safeParse` because the caller owns the failure and renders it; a value the server just constructed itself gets `parse` because a failure there is a programmer bug the framework boundary should catch.
This is the same "return the expected, throw the unexpected" two-channel rule the Code conventions §Error handling encodes — the lesson is where the student first meets it operationally, one chapter before Server Actions formalize it.

The second half of the lesson is the **error contract**: the schema authors the message, the parse result carries it in a predictable shape, and the form layer renders it. The student must leave understanding that error messages are not written in the form component — they live on the schema, and `z.treeifyError` is the bridge that turns a `ZodError` into a field-keyed tree the UI can read. This closes the chapter's running thread that "error messages are part of the contract."

The third beat is the **v4 unified `error` option**. L1–L4 deliberately deferred the full error-customization surface to here; the student has seen `{ error: '...' }` in passing on a refinement (L3) but never the whole story. This lesson names the v3→v4 cleanup once (the `message`/`invalid_type_error`/`required_error` trio collapses to one `error` param) and then writes only the v4 form.

Mental model the student should end with: a parse is a fork. One prong returns typed data you can trust; the other returns (or throws) a structured `ZodError` whose issues each pinpoint a field. `safeParse` makes that fork a value you branch on; `parse` makes it control flow. The schema decides what the error *says*; the boundary decides what *happens* with it.

Pedagogical stance: this is a high-leverage but conceptually small lesson (35–45 min). Lead every section with the decision, not the API. The `safeParse` result is a discriminated union — connect it explicitly to the discriminated-union narrowing the student already owns (ch004/ch009 and L1's `z.discriminatedUnion`), because `if (!result.success) return ...` *is* discriminant narrowing and naming that makes the `.data` type-safety click. Keep the running examples the chapter already established (`createInvoiceSchema`, `signupSchema`, `passwordChangeSchema`) so no cognitive budget goes to new domains. The lesson must explicitly NOT teach the `Result<T>` type or `useActionState` rendering — it shows the *seam* where the parse result will map to those, with a forward pointer, and stops.

Cross-cutting components: a `ZodCoding` exercise is the natural fit for the `safeParse`-branch beat (it runs real `safeParse` scenarios and shows pass/fail per fixture — exactly this lesson's surface). A `StateMachineWalker` (decision kind) encodes the parse-vs-throw choice. An `AnnotatedCode` walkthrough dissects the `ZodError` issue object. A hand-coded illustration (HTML/CSS via `Figure`) shows the treeify shape mirroring the input shape. `MultipleChoice` checks the boundary decision and the deprecated-API recall.

# Lesson sections

## Introduction (no header)

Open on the concrete seam: the student has spent four lessons declaring schemas; now a Server Action holds one and an `unknown` input off the wire.
Frame the senior question implicitly — "the schema is built; how do I run it, and what do I get back when the input is wrong?" — and preview the fork: two parse families, one error shape, one rule for choosing.
Keep it to ~4 sentences. Name that by the end the student will know which method every action and route handler in the rest of the course reaches for, and how the error travels from schema to form.
Do not enumerate the four methods here — that is the first section's job.

## A parse is a fork

Goal: establish the mental model before any method name, so the four methods land as two answers to one question.

- A schema's `.parse`-family call takes an `unknown` and forks: **valid → typed value**, **invalid → a structured `ZodError`**. The fork is the whole lesson; everything after is "how do you want the fork delivered."
- Name the two delivery styles plainly: *as control flow* (the invalid branch throws, you don't write an `if`) versus *as a value* (the invalid branch is returned, you branch on it). This is the `parse` vs `safeParse` axis.
- Name the orthogonal second axis once and set it aside: **sync vs async** (`parseAsync`/`safeParseAsync`), needed only when a refinement returns a Promise. Tell the student the chapter's stance (async checks belong in the action body, not the schema — L3 already said this) so the sync forms are the default everywhere; the async variants get one dedicated paragraph later, not a section.
- Land the 2×2: `parse` / `safeParse` / `parseAsync` / `safeParseAsync` as the cross product of {throw, return} × {sync, async}. A tiny visual is worth it here.

Diagram — **the 2×2 parse-method grid** (HTML+CSS table inside `<Figure>`, not a graph engine). Two columns (throws on failure / returns a result), two rows (sync / async), four cells naming the method and its one-line trigger. Pedagogical goal: the student sees the four names are not four things to memorize but two binary choices. Cap height tight; this is a reference card, not an illustration.

Tooltips (`Term`): `ZodError` (the error class every failed parse produces — an object carrying an `issues` array, not a plain `Error` message).

## safeParse: the boundary default

Goal: make `safeParse` the reflex at every untrusted boundary and show *why* its return type is safe to branch on.

- `schema.safeParse(input)` never throws. It returns `{ success: true, data: T } | { success: false, error: ZodError }` — a discriminated union on `success`.
- The keystone connection: this is the *same* discriminated-union narrowing the student already owns. `if (!result.success) { /* result.error is ZodError here */ } /* result.data is T here */`. TypeScript narrows `result.data` to the parsed type *only* inside the success branch — that is the payoff of the discriminant, not a Zod quirk. Make this explicit; it is the single most clarifying sentence in the section.
- The canonical boundary shape, shown once and named as the pattern every action reuses:
  `const result = schema.safeParse(input); if (!result.success) return /* failure */; const data = result.data; /* trusted */`
- State the boundary rule crisply: **`safeParse` everywhere user input arrives** — form submissions, request bodies, webhook payloads, `searchParams`. The caller owns the failure, so the failure must be a value the caller can inspect, not an exception that unwinds the stack.
- Forward-pointer (one sentence, no teaching): in a Server Action this `result` maps onto the canonical `Result<T>` return shape — the schema's failure branch becomes the action's error branch. That `Result` type and the `ok`/`err` helpers are Chapter 043's job; here we only note the seam exists. Do **not** show `Result<T>`, `ok`, or `err`.

Code: a single `Code` block for the canonical shape (it's short and the focus is the branch, not multiple regions). Use `.safeParse` against `createInvoiceSchema` (the chapter's running invoice input) so the input names are already familiar. Show the success branch's `result.data` being used and annotate via inline tooltip that its type is the inferred `Invoice` shape — but keep the block itself minimal.

`CodeTooltips` on this block for: `safeParse` (runs the schema, returns a result instead of throwing), `success` (the discriminant — narrows `data` vs `error`), `.data` (present and typed only when `success` is `true`).

Exercise — **`ZodCoding`**, the section's centerpiece. This widget runs real `safeParse` scenarios and flips pass/fail per fixture, which is exactly this section's surface.
- `schemaName`: `createInvoiceSchema` (reuse the established shape: `email`/`quantity`/`status` enum/`tags`).
- Task framing: the starter schema is given; the student's job is to read the fixtures and confirm which inputs the contract accepts vs rejects, then fix one deliberately-broken field so a failing fixture passes (e.g. tighten or loosen a constraint).
- Fixtures: a valid invoice (`pass`), one with a non-enum `status` (`fail`, `errorContains: 'status'` or the enum message), one with a negative `quantity` (`fail`), one missing a required field (`fail`). The point is the student watches the result fork per input.
- Grading is the fixtures table flipping ✓/✗; no separate criteria pane (per the widget's design).

## parse: throw at the trusted edge

Goal: define the narrow, legitimate home for `parse` and inoculate against its misuse at boundaries.

- `schema.parse(input)` returns the typed value on success and **throws `ZodError` on failure**. No `success` discriminant — success is the only non-throwing path.
- The senior reach: **trusted server-internal calls only** — a `/lib` helper parsing a value it just constructed, a startup script validating its own config, a test asserting a fixture's shape, an env-var loader at boot (`env.ts`). In all of these a failure is a programmer error, and an exception to the framework boundary is the *correct* signal, not a UX event.
- The anti-pattern, named sharply: `parse` inside a Server Action that doesn't catch produces an unhandled error response — the user gets a 500, not a field error. This is the headline beginner bug. The fix is not a `try/catch` around `parse`; it's reaching for `safeParse` in the first place. (A `try/catch` around `parse` is a code smell that re-implements `safeParse` worse.)
- Tie back to the two-channel rule: `parse` is the "throw the unexpected" channel; `safeParse` is the "return the expected" channel. User input failing validation is *expected* — hence `safeParse`. A value the server built itself failing validation is *unexpected* — hence `parse`.

Diagram/exercise — **`StateMachineWalker`** (`kind="decision"`), the parse-vs-throw decision filter. This forces the student through the *order* a senior asks the question, which is the actual lesson.
- Root question: "Where does this value come from?"
- Branch "From outside — a form, request body, webhook, searchParams" → Leaf **`safeParse`** (the caller owns the failure; return it as a value to render).
- Branch "From inside — I just built it / it's my own config / a test fixture" → second Question: "Is a failure here a bug or an expected outcome?"
  - Branch "A bug — it should never happen" → Leaf **`parse`** (throw to the framework boundary; let `error.tsx`/the route catch handle it).
  - Branch "Could legitimately fail and I need to react" → Leaf **`safeParse`** (even internal, if you branch on failure, return it).
- Pedagogical goal: the decision is "trust boundary first, then bug-vs-outcome" — not "is it a form." The walker encodes that ordering; a flat rule wouldn't.

`MultipleChoice` (single-correct) right after: a short scenario — "A webhook handler receives an unverified third-party payload and needs to render nothing to a user, just log and 400 on bad shape" — options pick the right method. Correct answer `safeParse`; distractors `parse` and `parse` wrapped in `try/catch`. The `McqWhy` names that the handler *branches* on failure, so failure must be a value. Phrase options so they don't verbatim-echo the prose.

## Async refinements need the async variants

Goal: one tight section (almost a long aside, but it carries a real decision so it gets a header) so the student isn't blindsided by a runtime throw.

- `parseAsync` / `safeParseAsync` are required when **any** refinement in the schema returns a Promise. The sync `parse`/`safeParse` *throw a runtime error* the moment they hit an async check — before validation even runs.
- The chapter's stance, restated as the takeaway: keep async checks (uniqueness, slug-taken, plan-permits — anything needing a DB or network) *out* of the schema and *in* the action body after the parse (L3 established this; here it's the reason the sync forms work everywhere). So in this course's code, `safeParse` is the default and the async variants are a named escape hatch, not a daily tool.
- Name the one place they do show up later (one clause): LLM tool-input validation in Unit 23, where an async check is occasionally legitimate. No teaching, just the pointer.

Keep this to a few sentences plus maybe one inline `Code` line showing a sync `parse` over an async-refined schema throwing. Do not build an exercise here.

## Inside a ZodError: the issue is the unit

Goal: open the error object so the student understands what `treeifyError` is built *from*, and can read raw issues when custom rendering needs it.

- `ZodError.issues` is an **array of issue objects** — one per validation failure. A single bad input can produce several issues (three fields wrong → three issues).
- Each issue has: `code` (the failure kind — `invalid_type`, `too_small`, `invalid_format`, `unrecognized_keys`, `custom`, …), `path` (a `(string | number)[]` pinpointing the failing field, e.g. `['lines', 0, 'quantity']`), `message` (the human string the schema authored), plus code-specific fields (`expected`/`received` on `invalid_type`, `minimum` on `too_small`, etc.).
- The `path` is the load-bearing field for forms: it's how a message gets anchored under the right input. Make the connection to L3's cross-field `.refine({ path: ['confirm'] })` — *that* `path` is what populates *this* issue's `path`. The two halves of the contract meet here: the schema sets `path`, the error carries it, the form reads it.
- When the form layer needs full control (custom grouping, first-error-only, severity), it reads `issues` directly. For the common case, `treeifyError` (next section) is the shortcut — but the student should know the array is always there underneath.

`AnnotatedCode` — a printed `ZodError` from a `safeParse` over `signupSchema` (or `createInvoiceSchema`) with two fields wrong, shown as a JS object literal. Step through:
1. `issues` is an array — highlight the array, name "one entry per failure."
2. First issue's `code` + `message` — the failure kind and the authored string.
3. First issue's `path: ['email']` — "this is the field anchor; the form uses it to place the message."
4. A second issue with a deeper `path` (e.g. `['password']` with a `too_small`) and its `minimum` field — "code-specific data the message can interpolate."
Color steps blue by default, the `path` step green (it's the keystone). Keep each step ≤6 lines of prose. `maxLines` ~14.

Tooltips (`Term`): `path` (the array locating the failing field within the input; `[]` means a form-level/root error, not tied to one field).

## treeifyError: the form-shaped error

Goal: the v4 default for turning a `ZodError` into something a form renders, plus the flat alternative, plus the v3 method it replaces.

- `z.treeifyError(result.error)` returns a **nested object mirroring the input shape**: top-level `errors` (form-level issues) plus `properties.<field>.errors` arrays per field, nesting for nested objects/arrays. The form reads `tree.properties.email?.errors?.[0]` to render the message under the email input.
- Show the actual access shape, because it's a known friction point (the v4 nesting is more verbose than v3's `formatError`): the student must see `tree.properties?.<field>?.errors?.[0]` with the optional chaining, not a hand-wave. This is exactly where a downstream agent would get it subtly wrong.
- The flat alternative: `z.flattenError(result.error)` returns `{ formErrors: string[], fieldErrors: Record<string, string[]> }` — one level deep, ideal for a flat form with no nested fields. The senior call: `treeifyError` for nested schemas (the chapter's default, and what Code conventions pins), `flattenError` when the schema is flat and the extra nesting buys nothing. **Pick one per project; the course uses `treeifyError`.**
- Name the v3→v4 migration once, here: `error.format()` → `z.treeifyError(error)`; `error.flatten()` → `z.flattenError(error)`. Both v3 *methods* are deprecated in favor of v4 *top-level functions*. One mention, then only the v4 form. (Mirror L2's "struck-through once" treatment — show the deprecated method crossed out next to the v4 call.)
- One more top-level helper, named in a single clause for the logging/dev case: `z.prettifyError(error)` returns a human-readable multi-line string — not for the UI, but handy in a server log or a script's stderr when you want the whole error legibly. Don't drill it.

`CodeVariants` — two tabs, same failed parse, two consumption shapes:
- Tab **`treeifyError` (nested)**: the call + the `tree.properties?.email?.errors?.[0]` access. Prose: "mirrors the input shape; reach for it when fields nest."
- Tab **`flattenError` (flat)**: the call + `flat.fieldErrors.email?.[0]`. Prose: "one level deep; reach for it when the form is flat."
This A/B framing is exactly `CodeVariants`' purpose and lets the student see the two output shapes side by side. Use the chapter's running schema so the field names are familiar.

Diagram — **the treeify shape mirrors the input shape** (HTML+CSS, two side-by-side panels inside one `<Figure>`, or `TabbedContent` if cleaner). Left panel: the input object (`{ email, password, lines: [...] }`). Right panel: the `treeifyError` output with the same nesting (`{ errors: [], properties: { email: { errors: [...] }, lines: { items: [...] } } }`). Draw the structural parallel visually. Pedagogical goal: "form-shaped" stops being a phrase and becomes a picture — the error tree has the *same skeleton* as the data, which is why the form can walk it with the same field paths it already uses for inputs.

Tooltips (`Term`): `treeifyError` (turns a `ZodError` into a nested object keyed like the input, for field-level rendering).

## The error message is the schema's job

Goal: lock the ownership rule — the schema authors messages, the form renders them — and teach the v4 unified `error` option that does the authoring.

- The contract, stated as a rule: **error messages live on the schema, never in the form component.** Adding a validation rule means adding it (and its message) to the schema; the form picks it up automatically through the tree. The form layer does not second-guess the wording. This is the chapter thread "the schema authors the message, the form renders it" made operational.
- The v4 unified `error` option — the single surface for authoring messages:
  - String form: `z.string({ error: 'Name is required' })` — overrides the default message for any issue from this schema.
  - Per-field: `email: z.email({ error: 'Enter a valid email address' })`.
  - Function form for per-issue messages: `z.string({ error: (issue) => issue.code === 'invalid_type' ? 'Must be text' : 'Invalid' })` — the function receives the issue (the same object from the previous section) and returns a string; `issue.code` discriminates the failure kind. Note `issue.input === undefined` is how v4 detects "this field was missing" — there is no `required` issue code, so this check is what replaces the old `required_error` (the Zod docs show this pattern; present it as the way, not as ceremony).
  - The same `error` option on a refinement (`.refine(fn, { error: '...' })`) — the student saw this in L3; now it's revealed as the *same* unified surface, not a refinement-only thing.
- The v3→v4 cleanup, named once: v3's three separate params — `message`, `invalid_type_error`, `required_error` — collapse into the one `error` param. Show the before (the three-param v3 object) struck through next to the v4 single-`error` form. State why: the old params couldn't be combined with an error map and didn't map to real issue codes (there is no `required` code — "required" is just `invalid_type` with `input === undefined`). Legacy schemas need a one-shot rewrite. `message` still works but is deprecated; `invalid_type_error`/`required_error` are dropped.
- Two narrower override points, each one sentence (named, not drilled):
  - **Per-parse override**: `schema.safeParse(input, { error: (issue) => '...' })` overrides the schema's messages for that one call — used when one schema needs different wording in different contexts (e.g. localized vs not).
  - **Global config**: `z.config({ customError: (issue) => '...' })` sets a process-wide default message mapper. The i18n layer wires this once at startup (Chapter 084 owns it). Name it; don't teach it.

Code: `CodeVariants` or paired `Code` blocks for the v3-vs-v4 `error` authoring — the deprecated three-param object (`{ message, invalid_type_error, required_error }`) in a "Zod 3 (legacy)" tab with `del=` strikethrough framing, the unified `{ error }` in a "Zod 4" tab. Keep the schema tiny (a two-field object) so the focus is the option, not the shape. Then a separate small `Code` block for the function form showing `issue.code` discrimination and the `issue.input === undefined` required-check idiom.

`CodeTooltips` on the function-form block: `error` (the unified message option — string or `(issue) => string`), `issue` (the failure object the function inspects — same shape as a `ZodError` issue), `issue.input` (the value that failed; `undefined` means the field was missing).

`MultipleChoice` (single-correct) to check the v3→v4 recall without verbatim matching: a scenario showing a v3-style schema using `invalid_type_error` and `required_error`, asking which single v4 change replaces both. Correct: a function-form `error` that branches on `issue.input === undefined`. Distractors: keep both params (they're dropped), use `.refine` for the type check (wrong layer). `McqWhy` names that v4 has no `required` issue code, so "required" is `invalid_type` with a missing input.

## When the failure isn't the user's fault

Goal: a short, high-value section on the `strictObject` / `unrecognized_keys` case — the one error the form does *not* render — to teach that not every issue is a UX event.

- A `z.strictObject` (L1's senior default for request bodies) rejects unknown keys with an `unrecognized_keys` issue. But the user can't *cause* this through the visible form inputs — an extra key means the client and server contracts have drifted (a stale client, a tampered request, a renamed field).
- So this issue is a **logger/monitoring signal, not a field error**. The form layer ignores it (there's no input to anchor it to); the action logs it. Tie to the "3am rule" from Code conventions §Logging in one clause and forward-point to error monitoring (Chapter 092) — don't teach either.
- The takeaway generalizes: the `path` tells you *where* to render, and a root-level or unrecognized-key issue with no matching input is a signal to log, not to show. The form renders what the user can fix; everything else is operator-facing.

Keep this to a short paragraph plus maybe one `Code` line showing the `unrecognized_keys` issue shape. No exercise — it's a nuance, not a skill to drill.

## External resources (optional)

- `ExternalResource` → Zod docs "Error formatting" (zod.dev/error-formatting) — the canonical `treeifyError`/`flattenError`/`prettifyError` reference.
- `ExternalResource` → Zod docs "Customizing errors" (zod.dev/error-customization) — the unified `error` param and error-map chain.

# Scope

**Prerequisites to restate concisely (do not re-teach):**
- A schema is a runtime parser with a TS type attached (L1); `z.infer` is the bridge (L1/L4). One sentence.
- Discriminated-union narrowing — `if (!x.success)` narrows the other branch (ch004/ch009, L1's `z.discriminatedUnion`). Restate as the mechanism behind the `safeParse` result, don't re-derive it.
- The `path` option on a cross-field `.refine` (L3) — referenced as the source of the issue's `path`. One callback, no re-teach.
- Schemas use top-level format builders and `z.strictObject`/`z.object` (L1/L2) — used in examples, assumed known.

**Owned by this lesson (the line):**
- The four parse methods (`parse`, `safeParse`, `parseAsync`, `safeParseAsync`) and the trust-boundary decision between throw and return.
- The `ZodError` / issue anatomy (`issues`, `code`, `path`, `message`, code-specific fields).
- `z.treeifyError`, `z.flattenError`, and a named mention of `z.prettifyError`; the v3 `error.format()`/`error.flatten()` deprecations.
- The unified `error` option (string + function form), the per-parse `error` override, the named `z.config({ customError })` global; the v3 `message`/`invalid_type_error`/`required_error` collapse.

**Explicitly NOT in this lesson (defer, with forward pointers):**
- The canonical `Result<T>` discriminated union and the `ok`/`err` helpers — **Chapter 043 L3**. This lesson shows the *seam* where the `safeParse` result maps onto an action's return, names it, and stops. Do not define `Result<T>`, `ok`, or `err`.
- The five-seam Server Action shape (`parse → authorize → mutate → revalidate → return`) — Chapter 043 L2. Mention that `safeParse`-on-entry is the first seam; don't build the action.
- Form-side error *rendering* with `useActionState` and the `<FieldError>` component — Chapter 044 L3. This lesson stops at producing the tree; consuming it in JSX is Chapter 044's job.
- `z.coerce` / `z.preprocess` / the `FormData`-string boundary — **L6** (next lesson). Examples here may parse already-typed objects or `Object.fromEntries` output without dwelling on coercion.
- Localizing error messages — Chapter 084 (owns `z.config({ customError })` wiring and per-parse locale overrides). Named once, not taught.
- Error monitoring / drift alerting for `unrecognized_keys` — Chapter 092. Named once.
- Async refinements that hit the network — named as the reason `parseAsync` exists; the real async-validation surface is Unit 23 (LLM tool inputs).
- `drizzle-zod`-generated schemas — L7. This lesson's schemas are hand-written running examples.

# Code conventions notes

- All schema consts camelCase (`createInvoiceSchema`, `signupSchema`), inferred types PascalCase below (`type Invoice = z.infer<typeof createInvoiceSchema>`) — per continuity notes' load-bearing naming override (the chapter outline's PascalCase `InvoiceSchema` was superseded). Follow camelCase everywhere.
- `safeParse` is the demonstrated default at boundaries; `parse` appears only in the trusted-edge section and the async-throw illustration — matches Code conventions §Schemas ("`safeParse` everywhere user input arrives; `parse` only for trusted server-internal calls").
- `treeifyError` is the course default; `flattenError` shown as the flat alternative; "pick one per project, the course uses `treeifyError`" stated explicitly — matches Code conventions §Schemas.
- Single quotes, 2-space indent, trailing commas, semicolons on (Biome) in every block.
- Imports: `import { z } from 'zod';` shown once if a block needs it; per §4 of Pedagogical guidelines, strip the import from focus-blocks where it's noise and the schema is the point.
- **Deliberate divergence to flag for downstream agents:** snippets parse `unknown`/plain-object inputs directly (or `Object.fromEntries(formData)` output) rather than wiring a full Server Action, because Server Actions are Chapter 043. The `safeParse` result is shown being branched on inline, returning a placeholder failure value (a comment or a minimal object), NOT the real `err(...)` helper — that helper is Chapter 043. Mark this so a later agent doesn't "fix" the placeholder into a premature `Result` import.
- `ZodPlaygroundCallout` (if used for a live error-shape demo) and any `ZodCoding` widget pin Zod `version="4.4.3"` to match the chapter's other lessons.
