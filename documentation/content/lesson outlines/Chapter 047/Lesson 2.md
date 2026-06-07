# Lesson 2 — Create an invoice

## Lesson title

Chapter-outline title "Create an invoice" fits — keep it.
Sidebar (short) title: **Create an invoice**.

## Lesson type

`Implementation` — the test-coder runs for this lesson; the writer renders the Implementation section list (Goal + Finished result / Your mission / Coding time / Moment of truth).

## Lesson framing

The student installs the canonical SaaS mutation flow end to end: a Drizzle-derived Zod schema as the single contract, a Server Action in the five-seam shape that returns a `Result` instead of throwing, and a native React 19 form that renders that `Result` while still working with JavaScript off.
This is the create path, and it carries the most weight in the chapter because every later action (edit, delete) reuses the shape it establishes — and the `<SubmitButton>` and `<FieldError>` built here serve every later form.
The senior payoff is the discipline, not the feature: schema-as-contract so form `name`s and action inputs can't drift, `safeParse`-over-`parse` so validation never throws, parse-before-auth so a bad submit costs no session lookup, and the form-layer-as-renderer rule that keeps field errors flowing from the server rather than client state.

## Codebase state

### Entry

Starter from Lesson 1 runs locally: `/invoices` renders the seeded list (read path inherited from chapter 041), but the five TODO targets are stubs.
For this lesson the relevant stubs are:

- `lib/invoices/mutation-schemas.ts` — all three schemas are empty `z.object({})`.
- `lib/invoices/actions.ts` — `createInvoice` (and the others) returns `err('internal', 'Not implemented')`.
- `app/_components/submit-button.tsx` — renders `<Button type="submit">` with no pending state.
- `app/_components/field-error.tsx` — always returns `null`.
- `app/invoices/new/new-invoice-form.tsx` — renders an empty `<form>` with just an `<h2>` heading.

Provided and unchanged: the `/invoices/new` page (RSC shell fetching customers, owns the `<h1>`), `lib/result.ts` (`Result`, `ok`, `err`, `isUniqueViolation`), `lib/auth-stub.ts` (`getActiveContext`), the `db` client, the `invoices` table, `statusSchema`, `listCustomers`, and the shadcn primitives (`input`, `label`, `native-select`, `button`).

### Exit

`createInvoiceInputSchema`, `createInvoice`, the shared `<SubmitButton>` and `<FieldError>`, and the Lesson-2 subset of `NewInvoiceForm` are implemented.
A valid submission at `/invoices/new` persists the row and redirects to `/invoices/[newId]` (with JS on or off); an invalid submission re-renders with messages under the offending fields and keeps the other typed values.

Deferred to later lessons (left out of this lesson's `NewInvoiceForm`): the dual-mode `inline` path, the `useAddOptimisticInvoice` context read, the `tempId` hidden `id` input, the optimistic `startTransition` append, and the `_debug_fail` checkbox — all Lesson 5.
`updateInvoiceInputSchema`/`updateInvoice` (Lesson 3), `deleteInvoiceInputSchema`/`deleteInvoice` (Lesson 4), and the transaction (Lesson 6) stay stubbed.
The schema's `id` column is kept optional now (not omitted) so Lesson 5 can post a client-generated UUIDv7 without re-shaping the schema mid-chapter — call this out in Coding time so the student doesn't "tidy it away."

## Lesson sections

Implementation contract order. Intro is headerless; the three named sections follow.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a student can fill the new-invoice form, submit, and land on the new invoice's detail page with the row persisted — even with JavaScript disabled.
Then a one-paragraph (or `Screenshot`) description of the feature working: `/invoices/new` renders a labeled form; a valid submission writes the row and redirects to `/invoices/[newId]`; an invalid submission re-renders with messages under the offending fields while the other fields keep their typed values and the submit button re-enables.
Component: a single `Screenshot` (or `TabbedContent` of two) — the empty form and the field-error state — is enough; no diagram.

### Your mission

Header: **Your mission**.
Write as coherent prose (no subsection headers, no implementation hints), then the requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips) as the only list.

Prose must weave, in the project's terms:

- **Feature** (user terms): fill the new-invoice form, submit, persist the row, redirect to its detail page.
- **The contract idea**: derive the create schema from the Drizzle `invoices` table so the action's input contract and the form's input `name`s can't drift.
- **The five-seam shape**: parse `FormData` with `safeParse` (never `parse`, never throw on validation), read the active org/user from `getActiveContext()` *after* the parse, insert through the pooled client, `revalidatePath('/invoices')`, return a `Result` — `redirect` on the success branch.
- **Constraints** (non-functional, shape the solution): works with JavaScript disabled (uncontrolled inputs + `defaultValue`, the `<form action>` submit); field errors render from the action's `Result.error.fieldErrors`, not local state (the form layer is a renderer); Constraint Validation API attributes mirror the schema rules; the shared `<SubmitButton>`/`<FieldError>` are built reusable here.
- **Traps to pre-empt**: `safeParse` over field-by-field `formData.get(...)` reads; the tenant context comes from the stub, not an invented session; don't reach for `cookies()`.
- **Out of scope** (one line): editing, deleting, optimism, and the transaction — each lands in its own lesson.

Requirements checklist — each item is a verifiable user-facing outcome, tagged:

1. `[tested]` Submitting `/invoices/new` with a valid invoice writes the row, redirects to its `/invoices/[newId]` detail page, and the new row appears on `/invoices`.
2. `[untested]` The same valid submission succeeds with JavaScript disabled — the browser POSTs to the action URL and navigates to the detail page. (Progressive enhancement is verified by hand in Moment of truth.)
3. `[tested]` Submitting with `total` blank and a malformed `dueAt` re-renders the form with a message under each offending field, sourced from the action's `Result`.
4. `[tested]` On that validation failure the other fields keep their typed values and the submit button re-enables.
5. `[untested]` The submit button shows a spinner while the action is in flight.
6. `[untested]` Each field's input constraints (required, numeric, date) match the schema's rules, and the post-interaction invalid styling appears only after the user touches a field, not on mount.

Note for the test-coder: tests assert observable behavior against the student's code, not file paths/imports. Tested items target the action's `Result` contract and the persisted row — the `[tested]` items (1, 3, 4) are server-action behaviors (valid insert + redirect target, validation `Result` with `fieldErrors` for the two offending fields, the non-offending fields untouched). The spinner, the no-JS POST, and the `:user-invalid` timing are `[untested]` (covered only by hand/reference) because they're rendering/PE concerns the runner can't cheaply assert.

### Coding time

Header: **Coding time**.
One line directing the student to implement `createInvoiceInputSchema`, `createInvoice`, the shared `<SubmitButton>`/`<FieldError>`, and `NewInvoiceForm` against the brief and the tests, then read the reference build.
The writer wraps the rest in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo. Component guidance per block:

- `lib/invoices/mutation-schemas.ts` — `createInvoiceInputSchema = createInsertSchema(invoices, { number, total, customerId, issuedAt, dueAt }).omit({ organizationId, createdBy, createdAt })`, plus the `CreateInvoiceInput`/`CreateInvoiceOutput` type aliases.
  Use `AnnotatedCode` to direct focus to the three non-obvious choices: (a) `total` stays a *string* — the `numeric(12,2)` column is a string in drizzle-zod, so it's regex (`/^\d+(\.\d{1,2})?$/`) + non-negative `.refine`, never `z.coerce.number()`; (b) the `id` column is *not* omitted (stays optional/defaulted) — flag that Lesson 5 needs it, so leaving it now avoids a mid-chapter re-shape; (c) `z.input` is the raw `FormData` shape, `z.output` is the coerced shape the action body works with.
  For `createInsertSchema` + override + `.omit` mechanics, link to chapter 042 lesson 7 rather than re-explaining.

- `lib/invoices/actions.ts` — file-level `'use server'`, then `createInvoice(_prevState, formData)` in the five seams.
  Use `AnnotatedCode` stepping through: parse (`createInvoiceInputSchema.safeParse(Object.fromEntries(formData))` → on failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`); auth (`const { organizationId, userId } = await getActiveContext()`); mutate (`db.insert(invoices).values({ ...parsed.data, organizationId, createdBy: userId }).returning({ id })` inside a `try`); the unique-violation `catch` mapping to `err('conflict', ...)` via `isUniqueViolation` then re-throw; `revalidatePath('/invoices')` inside the try; and `redirect('/invoices/' + row.id)` *after* the try/catch.
  Note for the writer: the reference action file in the repo already contains the `_debug_fail` branch and the `if (!row)` guard — for this lesson present `createInvoice` without the `_debug_fail` branch (that is Lesson 5 scaffolding); the `if (!row) return err('internal', ...)` guard before the redirect can stay (it satisfies the `returning` type-narrowing).
  Decision rationale (one or two sentences each): auth after parse so a parse failure never costs a session lookup once chapter 057's wrapper replaces the stub; `redirect` after the try/catch because it throws a control-flow exception and must not be swallowed by the unique-violation `catch`; link `revalidatePath` and the five-seam shape to chapter 043 lessons 3–5 rather than re-teaching.

- `app/_components/submit-button.tsx` — Client Component, `useFormStatus()` from `'react-dom'`, renders shadcn `<Button type="submit" variant={variant} disabled={pending}>` with `<Loader2 className="size-4 animate-spin motion-reduce:animate-none" />` when pending. `Code` block; one line noting `motion-reduce` respects reduced-motion. Link `useFormStatus`/`<SubmitButton>` to chapter 044 lesson 4.

- `app/_components/field-error.tsx` — takes `{ name, fieldErrors }`, reads `fieldErrors?.[name]?.[0]`, renders `<p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive">{message}</p>` or `null`. `Code` block.

- `app/invoices/new/new-invoice-form.tsx` (Lesson-2 subset) — Client Component, props `{ customers }`. `const [state, formAction] = useActionState(createInvoice, null)`; `const fieldErrors = state?.ok === false ? state.error.fieldErrors : undefined`.
  Show the `<form action={formAction}>` with the field clusters: each a `<div className="grid gap-2">` of `<Label htmlFor>` + control + `<FieldError name fieldErrors>`, repeated for `customerId` (`<NativeSelect>` from the `customers` prop), `number` (`<Input type="text" required autoComplete="off">`), `status` (`<NativeSelect>` from `statusSchema.options`), `total` (`<Input type="number" step="0.01" min="0" required inputMode="decimal">`), `issuedAt`/`dueAt` (`<Input type="date" required>`), `currency` (`<Input>` defaulting `"USD"`), each control carrying `aria-describedby={`${name}-error`}` and `aria-invalid={!!fieldErrors?.[name]?.[0]}`. Form-level banner: `{state?.ok === false && state.error.code !== 'validation' && <p role="alert">{state.error.userMessage}</p>}`. Submit: `<SubmitButton>Create invoice</SubmitButton>`.
  Use `AnnotatedCode` to focus on: the `useActionState`/`fieldErrors` derivation; one representative field cluster (e.g. `total`) showing the `aria-*` wiring and CVA attributes mirroring the schema; the keep-typed-values mechanism (echoed `defaults` state + `submitCount` used as the `<form key>` so the field cluster remounts after a failed submit — needed because React 19's `<form action>` fires `requestFormReset` on every commit, blanking uncontrolled inputs otherwise).
  Important scoping note for the writer: the repo's `new-invoice-form.tsx` is the *final* (Lesson 5) version — it imports `useAddOptimisticInvoice`, reads `{ addOptimistic, inline }`, holds a `tempId`/hidden `id` input, a `handleSubmit` transition, the `inline` heading branch, and the `_debug_fail` checkbox. Strip all of that for this lesson's reference: here the form is single-mode, passes `formAction` straight to `action`, has no optimistic context, no `tempId`, no `_debug_fail`. Add a one-line callout that the optimistic/dual-mode wiring arrives in Lesson 5.

Decision rationale to surface (one-two sentences each):

- `defaultValue` never `value` — inputs are uncontrolled, so no client state and the JS-disabled path works unchanged; the `key`-remount + echoed `defaults` re-seeds them after React 19's reset-on-commit.
- The field cluster stays hand-rolled (`<div>` + `<Label htmlFor>` + control + `<FieldError>` + manual `aria-*`) rather than shadcn's `Form*` family — those call `useFormField()` and throw outside a React Hook Form `<FormField>`, and none of that family is installed here (the chapter 044 lesson 6 finding; RHF is chapter 045). `useActionState` owns the state.
- The select control is the course `<NativeSelect>` (a plain `<select>` wrapper), not Radix `<Select>`, so the form stays native and progressively enhanced.

Coverage of `[untested]` requirements (so the reference closes them): Constraint Validation attributes mirror the schema (`required` on every non-optional field, `type="number"`/`type="date"` matching the column, `inputMode="decimal"` on `total`, `autoComplete="off"` on `number`); `:user-invalid` styling on the shadcn `<Input>` produces the red ring only after interaction (avoiding `:invalid`'s on-mount flash); `aria-invalid`/`aria-describedby` wire the error for assistive tech (chapter 027 lesson 5 pattern); the spinner is the `<SubmitButton>` pending branch.

External resources: none required; the resourcer may append after the `<details>` (no header).

### Moment of truth

Header: **Moment of truth**.
Test command and expected pass output: `pnpm test:lesson 2` (via `scripts/test-lesson.mjs`). The lesson ships its tests; show the expected green/pass output line once the test-coder fills the file (currently a `describe.todo` placeholder). State the expected outcome: the create-path assertions pass.
Then the by-hand checklist (`Checklist`) for the `[untested]` requirements the tests don't cover:

- DevTools → Settings → "Disable JavaScript", reload `/invoices/new`, submit a valid invoice — the browser navigates to `/invoices/[newId]` and `pnpm db:studio` shows the row.
- With JS enabled, submit with `total` blank and a malformed `dueAt` (temporarily remove `required` to reach the server path) — messages render under both fields, the other inputs keep their values, the submit button re-enables; restore `required`.
- The submit button shows its spinner during the in-flight submit.
- The invalid styling on a field appears only after you touch it, not on first render.

## Scope

This lesson does not cover:

- **Editing** an invoice (the `id`-extended schema, the tenant-scoped `where`, prefilled form) — Lesson 3.
- **Deleting** with a confirmation dialog and no-JS fallback — Lesson 4.
- **Optimistic create** (`useOptimistic`, the `addOptimistic` context, client-generated UUIDv7, the dual-mode `inline` form, `_debug_fail`) — Lesson 5.
- **The Drizzle transaction** wrapping a multi-step mutation and the URL-param success toast — Lesson 6.
- `createInsertSchema`/override/`.omit` mechanics, `useActionState`/`useFormStatus`, Constraint Validation API, and progressive enhancement are *applied* here but *taught* in chapters 042 and 044 — link, don't re-teach.
