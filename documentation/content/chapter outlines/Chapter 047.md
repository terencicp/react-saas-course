# Chapter 047 — Project: CRUD via Server Actions

## Chapter framing

Chapter 047 cashes in Unit 6: Zod 4 as the schema vocabulary (chapter 042), the Server Action as the mutation seam with the five-seam shape and the canonical `Result` return (chapter 043), and the native React 19 form pattern with `useActionState` / `useFormStatus` / `useOptimistic` plus the Constraint Validation API and progressive enhancement (chapter 044). The student takes the Unit 5 invoicing schema and ships a full CRUD surface: a "new invoice" form, an "edit invoice" form, and a delete-with-confirmation button. Every mutation goes through one of three Server Actions, each parsing its input with a `drizzle-zod`-derived Zod schema, each returning the canonical `Result`, each revalidating the list after success. The create form layers `useOptimistic` so the row appears immediately and rolls back when the action returns `ok: false`. The delete is wrapped in a Drizzle transaction so the pattern lands explicitly even when the FK cascade would do the same work. Field errors render inline from the action's `Result.error.fieldErrors`, not from client state. The whole thing works with JavaScript disabled.

Threads that run through every lesson: the schema is the contract — `createInsertSchema(invoices)` + refinement is the action's input shape, the form's input `name`s match the schema's keys, drift is impossible; `safeParse` + return `Result` is the action body's opening discipline, never `parse`, never throw on validation; `useActionState` reads the same `Result` the action writes — both sides see one shape; the form is a Client Component with uncontrolled inputs and `defaultValue`, the action prop fires the submit, the JS-disabled path still works; `useOptimistic` rolls back implicitly when the surrounding transition fails — no manual rollback bookkeeping; the transaction is for atomicity, external calls don't go inside it.

### Project goals

The finished surface satisfies every one of these, and each is confirmed in the owning lesson's verification:

- A valid invoice submits and persists with JavaScript disabled — the browser navigates to the new detail page and the row is in the database.
- Validation failures re-render the form with messages under each offending field, sourced from the action's `Result.error.fieldErrors`, while the other fields keep their typed values and the submit button re-enables.
- A duplicate invoice number for the same org returns a `conflict` and surfaces a form-level banner from `Result.error.userMessage`.
- The optimistic create row appears at the top of the list immediately, then reconciles with the persisted row by key on success, or rolls back cleanly when the action returns `ok: false`.
- The delete confirmation submits through the form action — one POST to the action URL, no `/api/*` fetch — and still deletes with JavaScript disabled via an inline fallback form.
- The delete runs inside a Drizzle transaction so the invoice and its lines commit or roll back atomically.
- Every create, edit, and delete refreshes the `/invoices` list through `revalidatePath` without a manual reload.

### Dependency carry-in

- **From chapter 041 (Unit 5 project):** the full `db/schema.ts` (`organizations`, `users` stub, `org_members`, `customers`, `invoices`, `invoice_lines`), `db/relations.ts`, the seeded data with two orgs and 50+ invoices each, the `listInvoices` and `getInvoiceDetail` query helpers in `lib/invoices/queries.ts`, the `lib/invoices/schema.ts` with `statusSchema` and `listInvoicesInputSchema`, the cursor encode/decode in `db/cursor.ts`, the pooled `db` client.
- **From lesson 4 of chapter 042 / lesson 5 of chapter 042 / lesson 6 of chapter 042 / lesson 7 of chapter 042:** `createInsertSchema(invoices)` plus the override-and-refine pattern, `.omit` for server-owned columns, `z.coerce.number()` / `z.coerce.date()` for `FormData`, `z.preprocess(v => v === 'on', z.boolean())` for the optional draft checkbox, `safeParse(Object.fromEntries(formData))`, `z.treeifyError`.
- **From lesson 1 of chapter 043 / lesson 2 of chapter 043 / lesson 3 of chapter 043 / lesson 4 of chapter 043 / lesson 5 of chapter 043:** the `"use server"` file-level directive, the five-seam shape (parse → authorize → mutate → revalidate → return), the canonical `Result<T>` type and the `ok`/`err` helpers in `lib/result.ts`, the error code set (`validation` / `conflict` / `not_found` / `internal`), the unique-violation-to-`conflict` mapping helper, `revalidatePath`, `db.transaction(async tx => ...)`, `redirect('/invoices/' + id)` from inside the action.
- **From lesson 1 of chapter 044 / lesson 2 of chapter 044 / lesson 3 of chapter 044 / lesson 4 of chapter 044 / lesson 5 of chapter 044 / lesson 6 of chapter 044 / lesson 7 of chapter 044:** uncontrolled inputs with `name` + `defaultValue`, `<form action={formAction}>`, `useActionState(action, null)` and the `(prevState, formData)` action signature, the `<SubmitButton>` reading `useFormStatus`, `useOptimistic(actualState, reducer)` inside the action's transition, the Constraint Validation API attributes (`required`, `type`, `minLength`, `pattern`, `inputmode`, `autocomplete`), `:user-invalid` styling, the no-JS test discipline.
- **From lesson 1 of chapter 033 / lesson 3 of chapter 033:** `searchParams` reads in the Server Component page, `redirect()` from a Server Action, `notFound()` for missing resources.
- **From lesson 1 of chapter 027 / lesson 5 of chapter 027:** the shadcn install discipline (primitives copied into `components/ui/`, never reinstalled), `Button` from the chapter 028 set, the `cn()` helper, `aria-describedby` / `aria-invalid` accessibility wiring on inputs with errors. The form primitives (`Input`, `Label`, `Textarea`, `Select`, `Dialog`, `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`) are added by the chapter 047 starter via `pnpm dlx shadcn add` and ship pre-installed in `components/ui/`.

### Auth carve-out (deferred to Unit 9)

The action body needs an `organizationId` and a `createdBy` to write rows. Unit 8 (Better Auth) and 10 (`authedAction` + `tenantDb`) don't exist yet. The starter exposes a `getActiveContext()` helper in `lib/auth-stub.ts` that returns `{ organizationId, userId }` for the seeded "Acme" org and the seeded owner user — a fixed value at module scope, no cookie or session read. The action calls it once at the top of the body where chapter 057 will inject the `authedAction` wrapper later. Naming this so the student doesn't reach for `cookies()` or invent a session shape mid-chapter.

### Starter file tree (stubs marked with TODO)

```
src/
  db/                            # provided: full schema, relations, client, cursor (from chapter 041)
  lib/
    invoices/
      schema.ts                  # provided: statusSchema, listInvoicesInputSchema (from chapter 041)
      mutation-schemas.ts        # TODO student: createInvoiceInput, updateInvoiceInput, deleteInvoiceInput
      queries.ts                 # provided: listInvoices, getInvoiceDetail (from chapter 041)
      actions.ts                 # TODO student: createInvoice, updateInvoice, deleteInvoice (file-level 'use server')
    result.ts                    # provided: Result<T>, ok(), err(), unique-violation mapping helper
    auth-stub.ts                 # provided: getActiveContext() returning fixed org + user
  app/
    invoices/
      page.tsx                   # provided: server component, list of invoices, "New invoice" link
      new/
        page.tsx                 # provided: server-rendered shell
        new-invoice-form.tsx     # TODO student: client component
      [invoiceId]/
        page.tsx                 # provided: server component, loads detail, renders edit form + delete button
        edit-invoice-form.tsx    # TODO student: client component
        delete-invoice-form.tsx  # TODO student: client component
    _components/
      submit-button.tsx          # TODO student: useFormStatus + shadcn Button
      field-error.tsx            # TODO student: reads Result.error.fieldErrors[name]
  components/ui/                 # provided: shadcn primitives (Input, Label, Textarea, Select, Button, Dialog, Form*)
```

The provided pages assume the student-written form components exist at those paths and accept their documented props.

### Reference solution signatures lessons display

- `CreateInvoiceInput = z.input<typeof createInvoiceInputSchema>` and `Output = z.output<typeof ...>` — the schema is derived from `createInsertSchema(invoices, { number: s => s.min(1).max(50), total: s => s.refine(n => n >= 0) })` then `.omit({ organizationId: true, createdBy: true, createdAt: true })`. The `id` column is *not* omitted — it stays optional (the column has a `$defaultFn` UUIDv7) so the create form can supply a client-generated UUIDv7 in lesson 5 of chapter 047 for the optimistic-reconcile pattern without re-shaping the schema mid-chapter. Fields the form posts: `id` (optional uuid), `customerId` (uuid), `number` (string), `status` (enum), `total` (coerced number), `currency` (string with default), `issuedAt` (coerced date), `dueAt` (coerced date).
- `UpdateInvoiceInputSchema` = `CreateInvoiceInputSchema.extend({ id: z.uuid() })`. The form posts the `id` as a hidden input.
- `DeleteInvoiceInputSchema = z.object({ id: z.uuid() })`.
- `createInvoice(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>` — file-level `'use server'`.
- `updateInvoice(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>`.
- `deleteInvoice(prevState: Result<null> | null, formData: FormData): Promise<Result<null>>` — wrapped in `db.transaction(async tx => ...)`.
- `Result<T>` from `lib/result.ts`: `{ ok: true; data: T } | { ok: false; error: { code: 'validation' | 'conflict' | 'not_found' | 'internal'; userMessage: string; fieldErrors?: Record<string, string[]> } }`.
- `<SubmitButton>{children}</SubmitButton>` — calls `useFormStatus`, renders shadcn `<Button type="submit" disabled={pending}>` with a spinner.
- `<FieldError name="email" fieldErrors={state?.ok === false ? state.error.fieldErrors : undefined} />` — renders `<p id={`${name}-error`} className="text-destructive text-sm">{message}</p>` or null; the form's `<Input>` references it via `aria-describedby={`${name}-error`}` and `aria-invalid={!!message}`.
- Env entries: none new (the project reuses chapter 041's `DATABASE_URL`, `DATABASE_URL_UNPOOLED`).
- The optimistic-list reducer (in the client list component, named `OptimisticInvoicesList`): `(current: Invoice[], next: Invoice) => [next, ...current]`. Optimistic row uses a client-generated UUIDv7 passed as a hidden input to the action so the optimistic and revalidated rows reconcile by key.

### Surface spec

This project uses production-shaped surfaces, not an inspector dashboard — the verifies run against the real `/invoices` UI.

- **`/invoices`** (Server Component): renders the list via the provided `listInvoices` call, a header with a "New invoice" link, and a `<OptimisticInvoicesList>` client wrapper around the rendered rows so optimistic appends work. Each row links to `/invoices/[invoiceId]` and shows the row's number, customer, status, total, due date.
- **`/invoices/new`** (Server Component shell + client `NewInvoiceForm`): renders the create form. On success the action redirects to `/invoices/[newId]`.
- **`/invoices/[invoiceId]`** (Server Component): loads the invoice via the provided `getInvoiceDetail`, renders the read-only detail panel above the `EditInvoiceForm`, and renders a `DeleteInvoiceForm` (a small `<form>` with a confirmation `<Dialog>` from shadcn).
- **No new inspector page** — every verify runs against these three routes.

### Concepts demonstrated → owning lesson

- SaaS pattern #6 (canonical Server Action `Result` shape) — lesson 3 of chapter 043.
- Architectural Principle #3 (pure `/lib`, side effects at named boundaries) — lesson 4 of chapter 043.
- Architectural Principle #5 (use the framework's conventions) — lesson 4 of chapter 043.
- Architectural Principle #6 (explicit over magic at `"use server"`) — lesson 1 of chapter 043.
- Zod 4 `z.strictObject` / top-level format builders / `z.infer` — lesson 1 of chapter 042, lesson 2 of chapter 042, lesson 4 of chapter 042.
- `createInsertSchema` + override + `.omit` — lesson 7 of chapter 042.
- `Object.fromEntries(formData)` + `safeParse` — lesson 6 of chapter 042 + lesson 2 of chapter 043.
- `z.treeifyError` for field-error rendering — lesson 5 of chapter 042.
- `<form action={serverAction}>`, uncontrolled inputs with `name`, the auto-reset on success — lesson 1 of chapter 044, lesson 2 of chapter 044.
- `useActionState` shape — lesson 3 of chapter 044.
- `useFormStatus` + the `<SubmitButton>` pattern — lesson 4 of chapter 044.
- `useOptimistic` reducer + implicit rollback + client-generated UUID — lesson 5 of chapter 044.
- Constraint Validation API attributes + `:user-invalid` — lesson 6 of chapter 044.
- Progressive enhancement — lesson 7 of chapter 044.
- `revalidatePath` after a mutation — lesson 5 of chapter 043 (full tree lesson 6 of chapter 032).
- `db.transaction(async tx => ...)` — lesson 5 of chapter 043 (full mechanics lesson 4 of chapter 039).
- Idempotency-key slot named — lesson 5 of chapter 043 (full pattern chapter 063).

---

## Lesson 1 — Project Overview

No header (intro). We take the Unit 5 invoicing data layer — schema, relations, seeds, and read-path queries already in place — and ship a full CRUD surface on it: a "new invoice" form, an "edit invoice" form, and a delete-with-confirmation button, every mutation flowing through a Server Action that parses with Zod, returns the canonical `Result`, and revalidates the list. Single figure: a screenshot strip of `/invoices` → `/invoices/new` → a field-error state → the success redirect → an optimistic add → the delete confirmation dialog.

### What we'll practice

- Deriving a mutation schema from the Drizzle table with `createInsertSchema` + refinement, then treating that schema as the single contract both the action and the form's input `name`s obey.
- Writing Server Actions in the five-seam shape — parse, authorize, mutate, revalidate, return — that hand back a `Result` instead of throwing.
- Building native React 19 forms with `useActionState`, uncontrolled inputs, `useFormStatus`, and `useOptimistic`, wired so the whole surface still works with JavaScript disabled.
- Reaching for a Drizzle transaction when a mutation is multi-step, and keeping external calls out of it.

### Architecture

Labeled list, shape only: the browser submits a `<form action={serverAction}>`; the Server Action parses the `FormData` against the Zod schema, reads the active org/user from the auth stub, writes through the pooled Drizzle client (the delete inside a transaction), calls `revalidatePath('/invoices')`, and returns a `Result`; `useActionState` on the client renders that `Result` — field errors inline, a banner for the rest — while `useOptimistic` paints the pending create row until the revalidated list arrives.

### Starting file tree (stubs marked with TODO)

```
src/
  db/                            # provided: full schema, relations, client, cursor (from chapter 041)
  lib/
    invoices/
      schema.ts                  # provided: statusSchema, listInvoicesInputSchema (from chapter 041)
      mutation-schemas.ts        # TODO student: createInvoiceInput, updateInvoiceInput, deleteInvoiceInput
      queries.ts                 # provided: listInvoices, getInvoiceDetail (from chapter 041)
      actions.ts                 # TODO student: createInvoice, updateInvoice, deleteInvoice (file-level 'use server')
    result.ts                    # provided: Result<T>, ok(), err(), unique-violation mapping helper
    auth-stub.ts                 # provided: getActiveContext() returning fixed org + user
  app/
    layout.tsx                   # provided: root layout with <Toaster /> from sonner preinstalled
    invoices/
      page.tsx                   # provided: server component, list of invoices, "New invoice" link, OptimisticInvoicesList wrapper
      _components/
        optimistic-invoices-list.tsx  # TODO student: client component (useOptimistic list)
      new/
        page.tsx                 # provided: server-rendered shell
        new-invoice-form.tsx     # TODO student: client component
      [invoiceId]/
        page.tsx                 # provided: server component, loads detail, renders edit form + delete button
        edit-invoice-form.tsx    # TODO student: client component
        delete-invoice-form.tsx  # TODO student: client component
    _components/
      submit-button.tsx          # TODO student: useFormStatus + shadcn Button
      field-error.tsx            # TODO student: reads Result.error.fieldErrors[name]
  components/ui/                 # provided: shadcn primitives (Input, Label, Textarea, Select, Button, Dialog, Form*)
```

The highlighted focus is the TODO set: `mutation-schemas.ts`, `actions.ts`, the two `_components` (`submit-button.tsx`, `field-error.tsx`), the three form components, and `optimistic-invoices-list.tsx`. Everything else is provided. The provided pages assume the student-written form components exist at those paths and accept their documented props.

Two provided files worth knowing before the build:

- `lib/result.ts` holds the `Result<T>` type, the `ok`/`err` helpers, and the `isUniqueViolation` helper that maps a Postgres unique violation to a `conflict` (the pattern from lesson 3 of chapter 043). Students read it; they never redeclare `Result` per action — the type is the contract, it lives in one place.
- `lib/auth-stub.ts` exposes `getActiveContext()`, a fixed `{ organizationId, userId }` for the seeded "Acme" org and owner user. It is intentionally not session-shaped; the lessons call it once at the top of each action body where chapter 057's `authedAction` wrapper drops in later. Reaching for `cookies()` or inventing a session reader now only creates code Unit 9 rewrites.

The `_components` underscore-prefixed folders are the App Router convention for "not a route segment, just shared components."

### Roadmap

CardGrid, one Card per lesson:

- **Lesson 2 — Create an invoice.** Derive the create schema, write `createInvoice` in the five-seam shape, and wire `NewInvoiceForm` with the reusable `<SubmitButton>` and `<FieldError>` so a valid invoice persists and redirects.
- **Lesson 3 — Edit an invoice.** Extend the schema with an `id`, write `updateInvoice` with a tenant-scoped `where`, and prefill `EditInvoiceForm` so edits save in place and a duplicate number surfaces a conflict banner.
- **Lesson 4 — Delete with confirmation.** Add `deleteInvoice` and a shadcn `<Dialog>` delete form that submits through the action, with an inline no-JS fallback.
- **Lesson 5 — Optimistic create.** Layer `useOptimistic` on the list and a client-generated UUIDv7 so the new row appears instantly, reconciles by key, and rolls back on failure.
- **Lesson 6 — Transactional delete.** Wrap the delete in a Drizzle transaction for atomic multi-step deletion and add a URL-param success toast.

### Setup

Steps component, in order:

1. `npx degit org/react-saas-course-projects/chapter-047-starter invoices-crud` — clone the starter from the `react-saas-course-projects` monorepo.
2. `cd invoices-crud && pnpm install` — installs clean.
3. `docker compose up -d` — starts the Unit 5 Postgres.
4. `cp .env.example .env.local` — the starter reuses chapter 041's `DATABASE_URL` and `DATABASE_URL_UNPOOLED`; no new env vars. `DATABASE_URL` points at the local Docker Postgres (pooled), `DATABASE_URL_UNPOOLED` at the same instance for migrations.
5. `pnpm db:migrate && pnpm db:seed` — applies the schema and loads two orgs with 50+ invoices each.
6. `pnpm dev` — expected result: `/invoices` renders the seeded list (the read path is inherited from chapter 041). Clicking "New invoice" reaches an empty form because the form components are still stubs — that is the runnable starting point.

---

## Lesson 2 — Create an invoice

A student can fill the "new invoice" form, submit it, and land on the new invoice's detail page with the row persisted — even with JavaScript disabled. Finished result: `/invoices/new` renders a labeled form; a valid submission writes the row and redirects to `/invoices/[newId]`; an invalid submission re-renders with messages under the offending fields.

### Your mission

This is the first cut of the canonical SaaS mutation flow, and it carries the most weight because the create path establishes the shape every later action reuses. You derive the create schema from the Drizzle `invoices` table with `createInsertSchema` so the action's input contract and the form's input `name`s can never drift, then write `createInvoice` in the five-seam shape: parse the `FormData` with `safeParse` (never `parse`, never throw on validation), read the active org and user from `getActiveContext()` *after* the parse so a parse failure never costs an auth lookup, insert through the pooled client, `revalidatePath('/invoices')`, and return a `Result` — `redirect` to the new detail page on the success branch, *after* the try/catch so the redirect's control-flow throw isn't swallowed by the unique-violation catch. The schema keeps the `id` column optional rather than omitting it: lesson 5 supplies a client-generated UUIDv7 there for the optimistic reconcile, so leaving it in now avoids re-shaping mid-chapter. The form is a Client Component with uncontrolled inputs, `defaultValue`, and Constraint Validation API attributes that mirror the schema rules — drift between a `.min(1)` and a missing `minLength` is exactly the bug the mirror prevents — and the reusable `<SubmitButton>` and `<FieldError>` you build here serve every later form. Field errors render from the action's `Result.error.fieldErrors`, not from local state: the form layer is a renderer. Out of scope here: editing, deleting, optimism, and the transaction — they each land in their own lesson. Hold the line on `safeParse` over field-by-field `formData.get(...)` reads, and on the tenant context coming from the stub rather than a session you invent.

Build it so each of these holds:

- [ ] Submitting `/invoices/new` with a valid invoice writes the row, redirects to its `/invoices/[newId]` detail page, and the new row appears on `/invoices`.
- [ ] The same valid submission succeeds with JavaScript disabled — the browser POSTs to the action URL and navigates to the detail page.
- [ ] Submitting with `total` blank and a malformed `dueAt` re-renders the form with a message under each offending field, sourced from the action's `Result`.
- [ ] On that validation failure the other fields keep their typed values and the submit button re-enables.
- [ ] The submit button shows a spinner while the action is in flight.
- [ ] Each field's input constraints (required, numeric, date) match the schema's rules, and the post-interaction invalid styling appears only after the user touches a field, not on mount.

### Coding time

Implement `NewInvoiceForm`, `createInvoice`, `createInvoiceInputSchema`, and the shared `<SubmitButton>`/`<FieldError>` against the brief and the tests, then read the reference build.

<details>

Reference implementation, organized as it appears in the repo:

- `lib/invoices/mutation-schemas.ts` — `createInvoiceInputSchema` from `createInsertSchema(invoices, { number: s => s.min(1).max(50), total: s => s.refine(n => n >= 0, 'Total must be non-negative') }).omit({ organizationId: true, createdBy: true, createdAt: true })`. Column overrides carry the `FormData` coercion: `total: z.coerce.number().nonnegative().multipleOf(0.01)`, `issuedAt: z.coerce.date()`, `dueAt: z.coerce.date()`, `customerId: z.uuid()`. The `id` column stays in the schema, optional and defaulted. `z.input<typeof createInvoiceInputSchema>` is the raw `FormData` shape; `z.output<...>` is what the typed action body works with.
- `lib/invoices/actions.ts` — file-level `'use server'`, then `createInvoice(prevState, formData)`: `const raw = Object.fromEntries(formData)` → `const parsed = createInvoiceInputSchema.safeParse(raw)` → on `!parsed.success`, `return err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`. Then `const { organizationId, userId } = await getActiveContext()`. Then `try { const [row] = await db.insert(invoices).values({ ...parsed.data, organizationId, createdBy: userId }).returning({ id: invoices.id }); revalidatePath('/invoices'); } catch (e) { if (isUniqueViolation(e)) return err('conflict', 'An invoice with that number already exists for this org.'); throw e; }` then `redirect('/invoices/' + row.id)` after the try/catch.
- `app/_components/submit-button.tsx` — Client Component, `useFormStatus()` from `'react-dom'`, renders shadcn `<Button type="submit" disabled={pending}>` with `<Loader2 className="animate-spin" />` when pending. Accepts `children` and an optional `variant` forwarded to `<Button>`.
- `app/_components/field-error.tsx` — takes `{ name: string; fieldErrors: Record<string, string[]> | undefined }`, renders `<p id={`${name}-error`} className="text-destructive text-sm mt-1">{fieldErrors?.[name]?.[0]}</p>` or `null`.
- `app/invoices/new/new-invoice-form.tsx` — Client Component. `const [state, formAction] = useActionState(createInvoice, null)` plus `const fieldErrors = state?.ok === false ? state.error.fieldErrors : undefined`. Native `<form action={formAction}>` with shadcn layout primitives per field, e.g. `<FormField name="total"><FormLabel>Total</FormLabel><FormControl><Input name="total" type="number" step="0.01" min="0" required inputMode="decimal" defaultValue="" aria-describedby="total-error" aria-invalid={!!fieldErrors?.total?.[0]} /></FormControl><FieldError name="total" fieldErrors={fieldErrors} /></FormField>`, repeated for `customerId` (a `<Select>` from a `customers` prop the page passes), `number`, `status`, `issuedAt`, `dueAt`, `currency`. Form-level banner: `{state?.ok === false && state.error.code !== 'validation' && <p className="text-destructive">{state.error.userMessage}</p>}`. Submit: `<SubmitButton>Create invoice</SubmitButton>`.

Decision rationale:

- The `getActiveContext()` call sits after the parse because once chapter 057's wrapper replaces the stub, reading auth on every parse failure would waste a session lookup (the lesson 4 of chapter 043 rule: parse first, everything after).
- `redirect` lives after the try/catch: it throws a control-flow exception, and putting it on the success branch outside the catch keeps the unique-violation handler from swallowing it.
- `defaultValue`, never `value`: the inputs are uncontrolled, so the form needs no client state and the JS-disabled path works unchanged.

Coverage of untested requirements: the Constraint Validation attributes mirror the schema (`required` on every non-optional field, `type="number"`/`type="date"` matching the column, `inputMode="decimal"` on `total`, `autoComplete="off"` on `number`); `:user-invalid` styling on the shadcn `<Input>` produces the red ring only after interaction, avoiding `:invalid`'s on-mount flash; `aria-invalid` and `aria-describedby` wire the error for assistive tech (the lesson 5 of chapter 027 accessibility pattern).

Callout: the shadcn `<Form>` primitives are used as pure layout here, without React Hook Form despite the shadcn docs implying it — `useActionState` owns the state (the lesson 6 of chapter 044 senior call).

</details>

### Moment of truth

Run the lesson's test suite with `pnpm test invoices/create` (expected: all create-path specs pass — happy-path persistence, the validation-failure `Result` shape, the conflict mapping). Then confirm by hand the requirements the tests don't cover:

- [ ] DevTools → settings → "Disable JavaScript", reload `/invoices/new`, submit a valid invoice — the browser navigates to `/invoices/[newId]` and `pnpm db:studio` shows the row.
- [ ] With JS enabled, submit with `total` blank and a malformed `dueAt` (temporarily remove `required` to reach the server path) — messages render under both fields, the other inputs keep their values, the submit button re-enables. Restore `required`.
- [ ] The submit button shows its spinner during the in-flight submit.
- [ ] The invalid styling on a field appears only after you touch it, not on first render.

---

## Lesson 3 — Edit an invoice

A student can open an existing invoice, change its fields, and save the edit in place, with a duplicate invoice number surfacing as a conflict. Finished result: `/invoices/[invoiceId]` renders a prefilled edit form above the read-only detail; saving valid changes refreshes the page with the new values; reusing another invoice's number shows a form-level banner.

### Your mission

Editing reuses everything the create path established and adds two ideas: a schema that requires the `id`, and a mutation that must not let one org touch another org's row. You extend the create schema with `updateInvoiceInputSchema = createInvoiceInputSchema.extend({ id: z.uuid() })` and write `updateInvoice` in the same five-seam shape, but the tenant guard goes *in the `where` clause* — `and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId))` — never as a load-then-check after the fact, which is the IDOR-class bug from lesson 6 of chapter 041. Unlike create, `updateInvoice` returns `ok` without redirecting: the edit form stays on the page, and because the action calls `revalidatePath('/invoices')`, the Server Component page re-fetches and the form re-renders with fresh defaults. The form mirrors `NewInvoiceForm` but reads every `defaultValue` from the loaded invoice the page passes as a prop and carries the row id in a hidden input. A duplicate `number` for the same org trips the Postgres unique constraint, which `isUniqueViolation` maps to a `conflict`; that surfaces as the form-level banner rather than a field error, because the violation is on the org+number composite, not one field's value alone. Out of scope: optimism (the edit case deliberately skips it — the user is staring at the form and the save is enough) and the transaction. Resist controlled inputs to "make editing easier"; uncontrolled inputs with `defaultValue` reconcile correctly when `revalidatePath` flows new defaults down.

Build it so each of these holds:

- [ ] Opening `/invoices/[invoiceId]` shows the edit form prefilled with the invoice's current values.
- [ ] Saving valid changes persists them and the page reflects the new values without a manual reload.
- [ ] Editing one org's invoice cannot modify another org's row — the tenant filter is in the `where`.
- [ ] Setting an invoice's `number` to one already used by another invoice in the same org surfaces a form-level banner, not a field error.
- [ ] An invalid edit re-renders the form with field-level messages and keeps the entered values.

### Coding time

Implement `updateInvoiceInputSchema`, `updateInvoice`, and `EditInvoiceForm` against the brief and the tests, then read the reference build.

<details>

Reference implementation, organized as it appears in the repo:

- `lib/invoices/mutation-schemas.ts` — add `export const updateInvoiceInputSchema = createInvoiceInputSchema.extend({ id: z.uuid() })`.
- `lib/invoices/actions.ts` — `updateInvoice(prevState, formData)` in the five-seam shape: parse with `updateInvoiceInputSchema`, read context, then `db.update(invoices).set(parsed.data).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)))`, `revalidatePath('/invoices')`, `return ok({ id: parsed.data.id })`. No redirect. Same unique-violation catch as create.
- `app/invoices/[invoiceId]/edit-invoice-form.tsx` — Client Component, `useActionState(updateInvoice, null)`, the page passes the loaded invoice as a prop, each field's `defaultValue` reads from it, and `<input type="hidden" name="id" value={invoice.id} />` carries the id. Field layout, `<FieldError>`, banner, and `<SubmitButton>` mirror the create form.

Decision rationale:

- The tenant id sits in the `where`, not in a post-load check, so a forged `id` for another org simply matches zero rows instead of leaking or mutating a foreign row.
- No redirect on success keeps the user in context; `revalidatePath` is what makes the page show fresh data, so no client-side state sync is needed.

Coverage of untested requirements: the conflict renders as a form-level banner (the org+number composite isn't tied to a single field), a distinction the student confirms by hand; `defaultValue` over `value` is what lets the re-fetched Server Component flow new values into the uncontrolled inputs.

Callout: the edit action intentionally has no `useOptimistic` — see the create lesson for where optimism earns its place and lesson 5 for why edit is the case where the trigger doesn't fire.

</details>

### Moment of truth

Run `pnpm test invoices/update` (expected: update-path specs pass — in-place persistence, the tenant-scoped `where`, the conflict mapping). Then confirm by hand:

- [ ] Open an invoice, change a field, save — the page shows the new value with no manual reload.
- [ ] Set the `number` to one another invoice in the same org already uses, save — the form-level banner appears, not a field error.
- [ ] Submit an invalid edit — field messages render and the entered values stick.

---

## Lesson 4 — Delete with confirmation

A student can delete an invoice from its detail page behind a confirmation dialog, and the delete still works with JavaScript disabled. Finished result: `/invoices/[invoiceId]` shows a "Delete" button that opens a shadcn `<Dialog>`; confirming submits through the Server Action and returns to `/invoices` with the row gone; with JS off, an inline fallback form performs the same delete.

### Your mission

Delete is the smallest action but it makes the progressive-enhancement discipline concrete. You add `deleteInvoiceInputSchema = z.object({ id: z.uuid() })` and a `deleteInvoice` action that, for now, runs a single `db.delete(...)` with the tenant id in the `where` (lesson 6 wraps it in a transaction), revalidates, and redirects to `/invoices`. The interesting work is the form: the delete must submit through the form action — one POST to the action URL, no `fetch` to an `/api/*` route — so an inexperienced dev's reflex to wire an `onClick` handler that calls `fetch` is exactly the trap to avoid. The confirmation uses the shadcn `<Dialog>` (Radix-backed, so focus trap, Esc-close, and click-outside come for free from the lesson 4 of chapter 027 install), with the `<form action={formAction}>` living inside the dialog body and a hidden `id` input. Because Radix needs JavaScript to open the dialog, the no-JS path needs a fallback: the same delete `<form>` renders inline on the detail page when scripting is off, so the action still fires. Pick the simpler of the gating patterns. Out of scope: the transaction and the success toast, both in lesson 6.

Build it so each of these holds:

- [ ] Clicking "Delete" on `/invoices/[invoiceId]` opens a confirmation dialog; confirming removes the invoice and returns to `/invoices` without it.
- [ ] The confirmed delete fires as a single POST to the action URL with no `/api/*` fetch.
- [ ] Cancelling the dialog closes it and changes nothing.
- [ ] With JavaScript disabled, the inline fallback form deletes the invoice and returns to the list.
- [ ] Deleting one org's invoice cannot remove another org's row.

### Coding time

Implement `deleteInvoiceInputSchema`, `deleteInvoice`, and `DeleteInvoiceForm` against the brief and the tests, then read the reference build.

<details>

Reference implementation, organized as it appears in the repo:

- `lib/invoices/mutation-schemas.ts` — add `export const deleteInvoiceInputSchema = z.object({ id: z.uuid() })`.
- `lib/invoices/actions.ts` — `deleteInvoice(prevState, formData)`: parse, read context, `await db.delete(invoices).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)))`, `revalidatePath('/invoices')`, `redirect('/invoices')`.
- `app/invoices/[invoiceId]/delete-invoice-form.tsx` — Client Component. The shadcn `<Dialog>` trigger is a "Delete" button; the dialog body holds `<form action={formAction}>` with `<input type="hidden" name="id" value={invoice.id} />`, a "Cancel" button that closes the dialog without submitting, and `<SubmitButton variant="destructive">Delete</SubmitButton>`. The no-JS fallback renders the same `<form>` inline on the detail page so it works when the dialog can't open.

Decision rationale:

- The submit rides the form action rather than a `fetch` so progressive enhancement holds and there's no client-side request plumbing to maintain.
- The redirect (not `ok`) closes the dialog implicitly via the page navigation, so no dialog-state bookkeeping is needed on success.

Coverage of untested requirements: the tenant id in the delete `where` mirrors the update rule; the inline no-JS fallback is the part a human verifies with scripting disabled.

Callout: the form lives *inside* the dialog body — closing the dialog doesn't cancel an in-flight submit, and a successful submit closes the dialog by navigating away.

</details>

### Moment of truth

Run `pnpm test invoices/delete` (expected: delete-path specs pass — removal, the tenant-scoped `where`, the not-yet-found case). Then confirm by hand:

- [ ] Click "Delete", confirm — the invoice is gone from `/invoices`. In DevTools Network: one POST to the action URL, no `/api/*` fetch.
- [ ] Click "Delete", then "Cancel" — nothing changes.
- [ ] Disable JavaScript, reload the detail page, use the inline fallback form — the invoice is deleted and you land on `/invoices`.

---

## Lesson 5 — Optimistic create

A student sees a newly created invoice appear at the top of the list the instant they submit, reconciling with the persisted row on success and vanishing on failure. Finished result: submitting `/invoices/new` paints a pending row immediately; on success it swaps to the real row without a flicker; on a forced failure it rolls back and a banner explains why.

### Your mission

This lesson adds the perceived-instant feel without manual rollback bookkeeping, because `useOptimistic` discards its update automatically when the surrounding transition fails. You fill `OptimisticInvoicesList` — already imported by the provided `/invoices` page — with `useOptimistic(initialInvoices, (current, next) => [next, ...current])`, render the pending row with a spinner and a subtle dimming, and expose an `addOptimisticInvoice` function through a small React context so the create form calls it without prop-drilling. The reconciliation trick is a client-generated UUIDv7: the create form generates it at mount, posts it as the hidden `id` input, and the action passes it through to the insert; because the optimistic row and the revalidated row share the same `id`, React reconciles them by `key` and the swap is invisible. The schema already accepts the optional `id` from lesson 2, so nothing changes there. On submit, the form fires the optimistic append and the action call inside one `startTransition` — `useOptimistic`'s update only persists for the life of that transition, so when the action returns `ok: false` the transition ends and the list reverts to `initialInvoices`. To make the rollback observable you add a chapter-local `_debug_fail` branch to `createInvoice` that sleeps and returns an `internal` error; this is a teaching aid, and production actions never accept a "please fail" input. Keep the reducer pure — no `console.log` inside it, since React may call it several times during reconciliation. Optimism stays on the create-and-list shape only: don't extend it to edit, where the trigger (high success, visible, small UI change) doesn't fire as strongly.

Build it so each of these holds:

- [ ] Submitting a valid invoice paints a pending row at the top of `/invoices` immediately, before the server responds.
- [ ] On success the pending row becomes the persisted row without a flicker or a duplicate.
- [ ] On a forced failure the optimistic row disappears and a banner shows the action's `userMessage`.
- [ ] After a forced failure the form keeps the typed values (no reset).
- [ ] Editing an invoice does not trigger an optimistic update.

### Coding time

Implement `OptimisticInvoicesList`, the create-form refactor, and the `_debug_fail` branch against the brief and the tests, then read the reference build.

<details>

Reference implementation, organized as it appears in the repo:

- `app/invoices/_components/optimistic-invoices-list.tsx` — Client Component, props `{ initialInvoices: Invoice[] }`, `const [optimisticInvoices, addOptimistic] = useOptimistic(initialInvoices, (current, next: Invoice) => [next, ...current])`. Renders rows from `optimisticInvoices`; the pending row gets `<Loader2 className="animate-spin" />` and `opacity-60`. Exposes `addOptimisticInvoice(invoice)` via a small React context.
- `app/invoices/new/new-invoice-form.tsx` — generate the id with `useState(() => uuidv7())`, render `<input type="hidden" name="id" value={tempId} />`. On submit: `const handleSubmit = (formData: FormData) => { startTransition(() => { addOptimisticInvoice({ id: tempId, ...rawValuesFromFormData, status: 'draft' as const, pending: true }); formAction(formData); }); }`, wired via `<form action={handleSubmit}>`.
- `lib/invoices/actions.ts` — in `createInvoice`, a guarded branch: when `formData.get('_debug_fail') === '1'`, await a 500ms sleep then `return err('internal', 'Forced failure for verify')`, marked with a "remove before production" comment. The insert already threads the client id through `values({ ...parsed.data, ... })`; a missing id falls back to the column `$defaultFn`.

Decision rationale:

- The client-generated UUIDv7 is what lets the optimistic and persisted rows reconcile by key — temp string ids would flicker on swap.
- The optimistic append and `formAction` share one `startTransition` because `useOptimistic` only holds its update for the transition's lifetime; that is also what gives the automatic rollback.

Coverage of untested requirements: the reducer stays pure; the context avoids prop-drilling the add function; edit is deliberately left non-optimistic, which the student confirms by inspection.

Callout: the `_debug_fail` input is chapter-local scaffolding for the failure verification, not a production pattern.

</details>

### Moment of truth

Run `pnpm test invoices/optimistic` (expected: the optimistic-list reducer and reconcile-by-key specs pass). Then confirm by hand:

- [ ] Submit a valid invoice — the row appears at the top instantly, then the detail page renders; navigating back shows the same row already persisted, no duplicate.
- [ ] Toggle "Simulate failure" and submit — the pending row appears, then 500ms later vanishes, the banner shows "Forced failure for verify", and the form keeps its values.
- [ ] Open the edit form and save — no optimistic row appears.

---

## Lesson 6 — Transactional delete

A student deletes an invoice and its line rows atomically inside one Drizzle transaction, and sees a success toast carried through the URL. Finished result: confirming a delete removes the invoice and its `invoice_lines` in a single transaction; the list page shows a "Invoice INV-0042 deleted" toast; a forced mid-transaction error leaves both the invoice and its lines intact.

### Your mission

The delete already works through a single statement, so this lesson is about the shape the action needs for everything later units will add to it. You refactor `deleteInvoice` to wrap its reads and writes in `db.transaction(async tx => ...)`: load the existing row (tenant-scoped) to capture its number and detect a missing row, delete the `invoice_lines` children, then delete the invoice — all on `tx`, never `db`, because a stray `db` call inside the callback runs in its own implicit transaction and breaks atomicity (the lesson 4 of chapter 039 convention). The callback returns a discriminated value rather than throwing for the expected "not found" case, letting the action body map it to `err('not_found', ...)`; throwing is reserved for genuine rollback. The senior point to internalize: the FK `ON DELETE CASCADE` on `invoice_lines → invoices` would delete the children on its own today, so the transaction isn't buying correctness for the current code — it's the explicit multi-step shape a reviewer can read, and the slot where Unit 9's audit-log write, Unit 10's soft-delete branch, and later file cleanup drop in without re-architecture. That is also where the durable rule lands: no external calls inside the transaction. The instinct after seeing the tx block is "while we're here, email the customer" — hold the line, the email goes *after* the commit (Units 7 and 13 own dispatch), because an external call inside a transaction diverges state on rollback. `revalidatePath` likewise stays outside the callback, or a rollback would still have invalidated the cache. Finally, add a small win the atomic delete enables: redirect with a `?deleted=INV-0042` param and have the list page render a Sonner toast from it — success data flowing through the URL, no client state, and it works with JS off.

Build it so each of these holds:

- [ ] Confirming a delete removes the invoice and all its line rows together.
- [ ] A forced error after the line delete but before the invoice delete leaves both the invoice and its lines intact.
- [ ] Deleting a missing or other-org invoice returns a not-found result rather than throwing.
- [ ] After a successful delete the list page shows a toast naming the deleted invoice.
- [ ] The success toast appears even with JavaScript disabled.

### Coding time

Implement the transactional `deleteInvoice` and the URL-param toast against the brief and the tests, then read the reference build.

<details>

Reference implementation, organized as it appears in the repo:

- `lib/invoices/actions.ts` — `deleteInvoice` body: `const result = await db.transaction(async tx => { const existing = await tx.query.invoices.findFirst({ where: and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)) }); if (!existing) return { notFound: true as const }; await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, parsed.data.id)); await tx.delete(invoices).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId))); return { notFound: false as const, deletedNumber: existing.number }; })`. Map `result.notFound` to `err('not_found', 'Invoice not found.')`; on success `revalidatePath('/invoices')` then `redirect('/invoices?deleted=' + result.deletedNumber)`.
- `app/invoices/page.tsx` (provided, lightly extended) — reads the `deleted` search param and renders a Sonner `toast.success('Invoice ' + deleted + ' deleted')` (the `<Toaster>` is preinstalled in `app/layout.tsx`).

Decision rationale:

- The read sits inside the transaction so the existence check and the delete are atomic — a read-then-delete outside a tx leaves a race window where a second deleter slips between the two queries.
- The callback returns a discriminated value instead of throwing for "not found" so the action maps to the right `Result`; throwing is reserved for actual rollback.
- `revalidatePath` and `redirect` live outside the callback so a rollback never invalidates the cache or navigates on a failed delete.

Coverage of untested requirements: every query inside the callback uses `tx`, not `db`; no external call goes inside the transaction (the email/file-cleanup additions of later units land after the commit); the `?deleted=` param carries success state without client state, so the toast survives a JS-disabled load.

Callout: the transaction is deliberately heavier than today's FK cascade requires — it is the shape that holds when audit-log, soft-delete, and notification steps join it.

</details>

### Moment of truth

Run `pnpm test invoices/delete-transaction` (expected: the atomic-delete and not-found specs pass). Then confirm by hand:

- [ ] Delete an invoice, confirm — both the invoice row and its `invoice_lines` rows are gone in `pnpm db:studio`, and the list shows the "Invoice INV-0042 deleted" toast.
- [ ] Temporarily `throw new Error('debug rollback')` between the two deletes, attempt a delete — the page hits `error.tsx` and Studio still shows both the invoice and its lines. Remove the throw.
- [ ] Disable JavaScript and delete via the inline fallback — the toast still renders on the list page from the URL param.
