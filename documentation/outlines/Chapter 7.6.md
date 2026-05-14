# Chapter 7.6 — Project: CRUD via Server Actions

## Chapter framing

Chapter 7.6 cashes in Unit 7: Zod 4 as the schema vocabulary (7.1), the Server Action as the mutation seam with the five-seam shape and the canonical `Result` return (7.2), and the native React 19 form pattern with `useActionState` / `useFormStatus` / `useOptimistic` plus the Constraint Validation API and progressive enhancement (7.3). The student takes the Unit 6 invoicing schema and ships a full CRUD surface: a "new invoice" form, an "edit invoice" form, and a delete-with-confirmation button. Every mutation goes through one of three Server Actions, each parsing its input with a `drizzle-zod`-derived Zod schema, each returning the canonical `Result`, each revalidating the list after success. The create form layers `useOptimistic` so the row appears immediately and rolls back when the action returns `ok: false`. The delete is wrapped in a Drizzle transaction so the pattern lands explicitly even when the FK cascade would do the same work. Field errors render inline from the action's `Result.error.fieldErrors`, not from client state. The whole thing works with JavaScript disabled.

Threads that run through every lesson: the schema is the contract — `createInsertSchema(invoices)` + refinement is the action's input shape, the form's input `name`s match the schema's keys, drift is impossible; `safeParse` + return `Result` is the action body's opening discipline, never `parse`, never throw on validation; `useActionState` reads the same `Result` the action writes — both sides see one shape; the form is a Client Component with uncontrolled inputs and `defaultValue`, the action prop fires the submit, the JS-disabled path still works; `useOptimistic` rolls back implicitly when the surrounding transition fails — no manual rollback bookkeeping; the transaction is for atomicity, external calls don't go inside it. The chapter ships 1 brief + 1 starter walkthrough + 4 build lessons + 1 verify lesson; every build closes on a runnable state.

### Dependency carry-in

- **From 6.6 (Unit 6 project):** the full `db/schema.ts` (`organizations`, `users` stub, `org_members`, `customers`, `invoices`, `invoice_lines`), `db/relations.ts`, the seeded data with two orgs and 50+ invoices each, the `listInvoices` and `getInvoiceDetail` query helpers in `lib/invoices/queries.ts`, the `lib/invoices/schema.ts` with `statusSchema` and `listInvoicesInputSchema`, the cursor encode/decode in `db/cursor.ts`, the pooled `db` client.
- **From 7.1.4 / 7.1.5 / 7.1.6 / 7.1.7:** `createInsertSchema(invoices)` plus the override-and-refine pattern, `.omit` for server-owned columns, `z.coerce.number()` / `z.coerce.date()` for `FormData`, `z.preprocess(v => v === 'on', z.boolean())` for the optional draft checkbox, `safeParse(Object.fromEntries(formData))`, `z.treeifyError`.
- **From 7.2.1 / 7.2.2 / 7.2.3 / 7.2.4 / 7.2.5:** the `"use server"` file-level directive, the five-seam shape (parse → authorize → mutate → revalidate → return), the canonical `Result<T>` type and the `ok`/`err` helpers in `lib/result.ts`, the error code set (`validation` / `conflict` / `not_found` / `internal`), the unique-violation-to-`conflict` mapping helper, `revalidatePath`, `db.transaction(async tx => ...)`, `redirect('/invoices/' + id)` from inside the action.
- **From 7.3.1 / 7.3.2 / 7.3.3 / 7.3.4 / 7.3.5 / 7.3.6 / 7.3.7:** uncontrolled inputs with `name` + `defaultValue`, `<form action={formAction}>`, `useActionState(action, null)` and the `(prevState, formData)` action signature, the `<SubmitButton>` reading `useFormStatus`, `useOptimistic(actualState, reducer)` inside the action's transition, the Constraint Validation API attributes (`required`, `type`, `minLength`, `pattern`, `inputmode`, `autocomplete`), `:user-invalid` styling, the no-JS test discipline.
- **From 5.5.1 / 5.5.3:** `searchParams` reads in the Server Component page, `redirect()` from a Server Action, `notFound()` for missing resources.
- **From 4.11.1 / 4.11.5:** the shadcn primitives copied into `components/ui/` (`Button`, `Input`, `Label`, `Textarea`, `Select`, `Dialog`, `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`), the `cn()` helper, `aria-describedby` / `aria-invalid` on inputs with errors.

### Auth carve-out (deferred to Unit 10)

The action body needs an `organizationId` and a `createdBy` to write rows. Unit 9 (Better Auth) and 10 (`authedAction` + `tenantDb`) don't exist yet. The starter exposes a `getActiveContext()` helper in `lib/auth-stub.ts` that returns `{ organizationId, userId }` for the seeded "Acme" org and the seeded owner user — a fixed value at module scope, no cookie or session read. The action calls it once at the top of the body where 10.2 will inject the `authedAction` wrapper later. Naming this so the student doesn't reach for `cookies()` or invent a session shape mid-chapter.

### Starter file tree (stubs marked with TODO)

```
src/
  db/                            # provided: full schema, relations, client, cursor (from 6.6)
  lib/
    invoices/
      schema.ts                  # provided: statusSchema, listInvoicesInputSchema (from 6.6)
      mutation-schemas.ts        # TODO student: createInvoiceInput, updateInvoiceInput, deleteInvoiceInput
      queries.ts                 # provided: listInvoices, getInvoiceDetail (from 6.6)
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

- `CreateInvoiceInput = z.input<typeof createInvoiceInputSchema>` and `Output = z.output<typeof ...>` — the schema is derived from `createInsertSchema(invoices, { number: s => s.min(1).max(50), total: s => s.refine(n => n >= 0) })` then `.omit({ organizationId: true, createdBy: true, createdAt: true })`. The `id` column is *not* omitted — it stays optional (the column has a `$defaultFn` UUIDv7) so the create form can supply a client-generated UUIDv7 in lesson 7.6.5 for the optimistic-reconcile pattern without re-shaping the schema mid-chapter. Fields the form posts: `id` (optional uuid), `customerId` (uuid), `number` (string), `status` (enum), `total` (coerced number), `currency` (string with default), `issuedAt` (coerced date), `dueAt` (coerced date).
- `UpdateInvoiceInputSchema` = `CreateInvoiceInputSchema.extend({ id: z.uuid() })`. The form posts the `id` as a hidden input.
- `DeleteInvoiceInputSchema = z.object({ id: z.uuid() })`.
- `createInvoice(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>` — file-level `'use server'`.
- `updateInvoice(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>`.
- `deleteInvoice(prevState: Result<null> | null, formData: FormData): Promise<Result<null>>` — wrapped in `db.transaction(async tx => ...)`.
- `Result<T>` from `lib/result.ts`: `{ ok: true; data: T } | { ok: false; error: { code: 'validation' | 'conflict' | 'not_found' | 'internal'; userMessage: string; fieldErrors?: Record<string, string[]> } }`.
- `<SubmitButton>{children}</SubmitButton>` — calls `useFormStatus`, renders shadcn `<Button type="submit" disabled={pending}>` with a spinner.
- `<FieldError name="email" fieldErrors={state?.ok === false ? state.error.fieldErrors : undefined} />` — renders `<p id={`${name}-error`} className="text-destructive text-sm">{message}</p>` or null; the form's `<Input>` references it via `aria-describedby={`${name}-error`}` and `aria-invalid={!!message}`.
- Env entries: none new (the project reuses 6.6's `DATABASE_URL`, `DATABASE_URL_UNPOOLED`).
- The optimistic-list reducer (in the client list component, named `OptimisticInvoicesList`): `(current: Invoice[], next: Invoice) => [next, ...current]`. Optimistic row uses a client-generated UUIDv7 passed as a hidden input to the action so the optimistic and revalidated rows reconcile by key.

### Surface spec

This project uses production-shaped surfaces, not an inspector dashboard — the verifies run against the real `/invoices` UI.

- **`/invoices`** (Server Component): renders the list via the provided `listInvoices` call, a header with a "New invoice" link, and a `<OptimisticInvoicesList>` client wrapper around the rendered rows so optimistic appends work. Each row links to `/invoices/[invoiceId]` and shows the row's number, customer, status, total, due date.
- **`/invoices/new`** (Server Component shell + client `NewInvoiceForm`): renders the create form. On success the action redirects to `/invoices/[newId]`.
- **`/invoices/[invoiceId]`** (Server Component): loads the invoice via the provided `getInvoiceDetail`, renders the read-only detail panel above the `EditInvoiceForm`, and renders a `DeleteInvoiceForm` (a small `<form>` with a confirmation `<Dialog>` from shadcn).
- **No new inspector page** — every verify runs against these three routes.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| The form submits without JavaScript | DevTools → settings → "Disable JavaScript", reload `/invoices/new`, submit a valid invoice — the browser navigates to the new detail page, `pnpm db:studio` shows the row. |
| Field errors display on validation failure | Submit `/invoices/new` with `total` blank and a malformed `dueAt` — the form re-renders with messages under each field, the unfilled fields keep their typed values, the submit button is enabled again. |
| The optimistic UI rolls back on action failure | Add `?fail=1` support to the create action that returns `{ ok: false, error: 'internal' }` after a 500ms delay; submit a valid invoice with `?fail=1`; the row appears optimistically in the list, then disappears, and a banner shows the action's `userMessage`. |
| The delete confirmation submits through a form action, not a `fetch` | Open `/invoices/[id]`, click "Delete", confirm the dialog — the submit fires through the Server Action (one POST to the action URL in DevTools Network, no `/api/*` fetches). With JS disabled, the shadcn `<Dialog>` (Radix-backed) doesn't open; the delete form renders inline as the no-JS fallback so the submit still works. |
| `revalidatePath` refreshes the list | After every create/edit/delete, navigating back to `/invoices` shows the change without a manual reload. |
| The delete action is wrapped in a transaction | Read `actions.ts`: the delete body is `await db.transaction(async tx => { ... })`. |

### Concepts demonstrated → owning lesson

- SaaS pattern #6 (canonical Server Action `Result` shape) — 7.2.3.
- Architectural Principle #3 (pure `/lib`, side effects at named boundaries) — 7.2.4.
- Architectural Principle #5 (use the framework's conventions) — 7.2.4.
- Architectural Principle #6 (explicit over magic at `"use server"`) — 7.2.1.
- Zod 4 `z.strictObject` / top-level format builders / `z.infer` — 7.1.1, 7.1.2, 7.1.4.
- `createInsertSchema` + override + `.omit` — 7.1.7.
- `Object.fromEntries(formData)` + `safeParse` — 7.1.6 + 7.2.2.
- `z.treeifyError` for field-error rendering — 7.1.5.
- `<form action={serverAction}>`, uncontrolled inputs with `name`, the auto-reset on success — 7.3.1, 7.3.2.
- `useActionState` shape — 7.3.3.
- `useFormStatus` + the `<SubmitButton>` pattern — 7.3.4.
- `useOptimistic` reducer + implicit rollback + client-generated UUID — 7.3.5.
- Constraint Validation API attributes + `:user-invalid` — 7.3.6.
- Progressive enhancement — 7.3.7.
- `revalidatePath` after a mutation — 7.2.5 (full tree 5.4.6).
- `db.transaction(async tx => ...)` — 7.2.5 (full mechanics 6.4.4).
- Idempotency-key slot named — 7.2.5 (full pattern 12.1).

---

## Lesson 7.6.1 — Project brief

Goals:

- Frame the CRUD surface as the canonical SaaS mutation flow: every later unit (auth gates in 10, soft delete in 11, billing-gated mutations in 12) layers on top of this exact shape. The chapter ships create / read / update / delete against the Unit 6 invoices schema and nothing more.
- State the "Done when" five clauses in one paragraph: JS-disabled submit works, field errors render inline from the Result, optimistic create rolls back on failure, delete submits through the form action (not `fetch`), `revalidatePath` updates the list.
- Name the scope cuts: no auth (Unit 9/10 owns sessions and RBAC; the starter ships a fixed-org stub), no soft delete (Unit 11), no audit log (Unit 10), no idempotency key (Chapter 12.1 — the slot is named in 7.2.5 and the form hidden-field shape is foreshadowed here but not enforced), no React Hook Form (the trigger doesn't fire — 7.4), no route handlers (the form is in-app — 7.5).
- Set the senior payoff: the three actions written here are the shape every action in Units 8–23 reuses. The discipline installed — parse on entry, return `Result`, revalidate, transaction for multi-step, optimistic only when the trigger fires — is what turns "form code" into "audit-clean form code" later.
- Show the end UX: one screenshot strip of `/invoices` → `/invoices/new` → field error state → success redirect → optimistic add → delete confirmation.
- Link the starter via `degit` from the `react-saas-course-projects` monorepo.

Senior calls and watch-outs:

- The `getActiveContext()` stub is intentionally not session-shaped. Reaching for `cookies()` or inventing a session reader now creates code Unit 10 will rewrite — leave the stub alone, the wrapper drops in cleanly later.
- Every action returns `Result`, never throws on validation. The student's instinct from older codebases is to `throw new ValidationError(...)`; the chapter's discipline is the opposite.

Codebase state at entry: empty working directory.
Codebase state at exit: starter cloned, `docker compose up -d` running the Unit 6 Postgres, `pnpm install` clean, `pnpm db:migrate && pnpm db:seed` populated, `pnpm dev` shows `/invoices` with the seeded list of invoices (read path inherited from 6.6; mutations not wired).

Estimated student time: 10 to 15 minutes.

---

## Lesson 7.6.2 — Starter walkthrough

Goals:

- Walk the file tree, separating provided from stub. Linger on four files: `lib/result.ts` (the `Result<T>` type, `ok` and `err` helpers, the `mapUniqueViolation` helper — students read it, don't write it, the unique-violation-to-`conflict` pattern from 7.2.3 lives here), `lib/auth-stub.ts` (the fixed-context helper and the reason it exists), `app/invoices/page.tsx` (the server component reading the list and rendering the `OptimisticInvoicesList` client wrapper — the wrapper is stubbed too and gets filled in 7.6.5), and `components/ui/form.tsx` (the shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` primitives — the layout primitives the chapter uses without RHF, the discipline from 7.3.6).
- Read `lib/invoices/mutation-schemas.ts` — empty with TODO comments naming the three exports the actions will import.
- Read `lib/invoices/actions.ts` — the file starts with `'use server'` and three empty function signatures with TODOs.
- Read `app/_components/submit-button.tsx` and `field-error.tsx` — empty TODOs with the expected props.
- Read the three form components' page-side parents to lock in what the student-written client components receive as props and what they must render. The edit page passes the loaded invoice; the new page passes nothing; the detail page passes the invoice and the delete is a separate small form.
- Bring up the dev surface: `pnpm dev` renders `/invoices` with the seeded list. Clicking "New invoice" 404s because `new-invoice-form.tsx` is empty. That's the runnable starting point.

Senior calls and watch-outs:

- The `_components` underscore-prefixed folder in App Router is the convention for "this folder isn't a route segment, it's shared components." Named once; the student stops trying to make every component a page.
- `Result<T>` lives in one file and one place. The temptation to redeclare the type per action ("for clarity") is the smell — the type is the contract.
- The provided pages call student-written form components by relative import — keep the file names and exports as documented, the page wiring breaks otherwise.

Codebase state at entry: starter cloned, Postgres up, seed run, `pnpm dev` renders `/invoices`.
Codebase state at exit: student has read the provided files and TODO stubs. No code written. `pnpm dev` still renders `/invoices` with the seeded list; clicking through reveals empty/404 states for `new` and `[invoiceId]` (the detail page works for read, but it imports the empty edit form).

Estimated student time: 15 to 20 minutes.

---

## Lesson 7.6.3 — Mutation schemas and the three Server Actions

Goals:

- Fill `lib/invoices/mutation-schemas.ts`. Three exports:
  - `createInvoiceInputSchema` from `createInsertSchema(invoices, { number: s => s.min(1).max(50), total: s => s.refine(n => n >= 0, 'Total must be non-negative') }).omit({ organizationId: true, createdBy: true, createdAt: true })`. The `id` column stays in the schema (optional, defaulted) so 7.6.5 can supply a client-generated UUIDv7 without re-shaping. Layer the form's coercion via column overrides for `total: z.coerce.number().positive().multipleOf(0.01)`, `issuedAt: z.coerce.date()`, `dueAt: z.coerce.date()`, `customerId: z.uuid()`. The result is the action's input contract; `z.input<typeof ...>` is the `FormData` raw shape, `z.output<typeof ...>` is what the typed action body works with.
  - `updateInvoiceInputSchema = createInvoiceInputSchema.extend({ id: z.uuid() })`.
  - `deleteInvoiceInputSchema = z.object({ id: z.uuid() })`.
- Fill `lib/invoices/actions.ts` with the three actions. The file starts with `'use server'` at the top. Each follows the five-seam shape from 7.2.2:
  - `createInvoice(prevState, formData)`: `const raw = Object.fromEntries(formData);` → `const parsed = createInvoiceInputSchema.safeParse(raw);` → on `!parsed.success`, return `err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`. Then `const { organizationId, userId } = await getActiveContext();`. Then `try { const [row] = await db.insert(invoices).values({ ...parsed.data, organizationId, createdBy: userId }).returning({ id: invoices.id }); revalidatePath('/invoices'); return ok({ id: row.id }); } catch (e) { if (isUniqueViolation(e)) return err('conflict', 'An invoice with that number already exists for this org.'); throw e; }`. Add `redirect('/invoices/' + row.id)` after the return-shape decision so the success path navigates.
  - `updateInvoice`: same shape, `db.update(invoices).set(parsed.data).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)))`. Tenant guard in the `where`, not after the load (7.2.2 rule, 6.6 tenant-filter rule). Returns `ok({ id })` without a redirect — the edit form stays on the page.
  - `deleteInvoice`: simple single-`db.delete(...)` form for now (7.6.6 wraps it in a transaction). Returns `ok(null)` and `redirect('/invoices')` after `revalidatePath`.
- Each action revalidates *after* the database write and *before* the return. The order from 7.2.5 made concrete.
- The runnable proof for this lesson is *not* a wired-up UI yet (forms land in 7.6.4). The runnable proof is `pnpm dev` still serving the read paths (the list page, the detail page) without runtime errors, and a temporary scratch invocation: add a tiny "Run create with test data" button to `/invoices` that's hard-coded to call `createInvoice` with a `FormData` built in the click handler (the test-only button is removed in 7.6.4 when the real form lands). The student verifies the row writes, the redirect fires, the list refreshes; with a malformed `dueAt`, the returned `Result` has `fieldErrors`.

Senior calls and watch-outs:

- `safeParse` first, every single time. The temptation to read `formData.get('total')` field by field is the smell — the schema is the contract, the parse covers all of it.
- The tenant filter in the `update` and `delete` `where` clauses is non-negotiable. Loading the row first and then checking the org ID is the IDOR-class bug from 6.6.5; structural rule is tenant ID in the `where`, never after.
- `revalidatePath` before the return, never inside the transaction (foreshadow), never before the database write.
- `redirect` inside an action throws a control-flow exception — don't swallow it in the unique-violation catch. The cleanest pattern is to redirect *after* the try/catch, on the success branch.
- The `getActiveContext()` call goes *after* the parse, not before. Reading auth on every parse failure wastes a session lookup once 10.2's wrapper replaces the stub. The 7.2.4 rule: parse first, everything else after.
- The `Result` failure path returns the object shape — never `null`, never a string, never `throw`. The form layer's read shape (next lesson) depends on the object.

Codebase state at entry: empty schemas and actions files; the form components are empty stubs.
Codebase state at exit: schemas written; three actions written; the temporary scratch button on `/invoices` proves the create action end-to-end (writes a row, redirects, validation errors return in `state`). No real forms exist yet.

Estimated student time: 30 to 40 minutes.

---

## Lesson 7.6.4 — Forms, inline field errors, and the `<SubmitButton>`

Goals:

- Fill `app/_components/submit-button.tsx`. Client component, calls `useFormStatus()`, renders shadcn `<Button type="submit" disabled={pending}>` with a `<Loader2 className="animate-spin">` inside when `pending`. Imports `useFormStatus` from `'react-dom'` (the 7.3.4 watch-out). Accepts `children` and an optional `variant` prop forwarded to `<Button>`.
- Fill `app/_components/field-error.tsx`. Takes `{ name: string; fieldErrors: Record<string, string[]> | undefined }` and renders `<p id={`${name}-error`} className="text-destructive text-sm mt-1">{fieldErrors?.[name]?.[0]}</p>` or `null`. The companion input sets `aria-describedby={`${name}-error`}` and `aria-invalid={!!fieldErrors?.[name]?.[0]}` — the accessibility wiring from 4.11.5.
- Fill `app/invoices/new/new-invoice-form.tsx`. Client component. `const [state, formAction] = useActionState(createInvoice, null);` plus `const fieldErrors = state?.ok === false ? state.error.fieldErrors : undefined;`. Native `<form action={formAction}>` with the shadcn layout primitives wrapping each input. Per-field shape: `<FormField name="total"><FormLabel>Total</FormLabel><FormControl><Input name="total" type="number" step="0.01" min="0" required inputMode="decimal" defaultValue="" aria-describedby="total-error" aria-invalid={!!fieldErrors?.total?.[0]} /></FormControl><FieldError name="total" fieldErrors={fieldErrors} /></FormField>`. Repeat for `customerId` (a `<Select>` populated from a `customers` prop the page passes in), `number`, `status`, `issuedAt`, `dueAt`, `currency`. Form-level banner: `{state?.ok === false && state.error.code !== 'validation' && <p className="text-destructive">{state.error.userMessage}</p>}`. Submit: `<SubmitButton>Create invoice</SubmitButton>`. Remove the temporary scratch button from 7.6.3.
- Constraint Validation API attributes mirror the schema rules: `required` on every non-optional field, `type="number"`/`type="date"` matching the schema, `inputMode="decimal"` on `total`, `autoComplete="off"` on `number`. Tailwind class for `:user-invalid` styling on the shadcn `<Input>` so the post-interaction red ring lands without `:invalid`'s on-mount red flash.
- Fill `app/invoices/[invoiceId]/edit-invoice-form.tsx`. Same shape with `useActionState(updateInvoice, null)`, the page passes the loaded invoice as a prop, every field's `defaultValue` reads from the prop, a hidden `<input type="hidden" name="id" value={invoice.id} />` carries the ID. Success stays on the page — `updateInvoice` doesn't redirect; the Server Component page re-fetches after `revalidatePath`, the form re-renders with fresh defaults.
- Fill `app/invoices/[invoiceId]/delete-invoice-form.tsx`. The shadcn `<Dialog>` trigger is a "Delete" button on the detail page; the dialog body holds `<form action={formAction}>` with a hidden `<input name="id" value={invoice.id} />` and two actions: "Cancel" (closes the dialog, no submit) and `<SubmitButton variant="destructive">Delete</SubmitButton>`. `deleteInvoice` redirects to `/invoices` after revalidating, so the dialog closes via the page navigation. The PE fallback: wrap the dialog in a `<noscript>`-aware pattern — when JS is off the dialog won't open, so the same `<form>` renders as a regular inline form on the detail page (a simple `<noscript>` block, or render both and let CSS / JS gate visibility). Pick the simpler pattern; the verify in 7.6.7 confirms the no-JS path.

Senior calls and watch-outs:

- The `<FieldError>` component reads from the action's `Result`, not from local state. The form layer is a renderer; the 7.3.3 rule.
- `defaultValue` not `value` on every input. Reaching for controlled inputs to "make the edit form easier" is the smell — `revalidatePath` re-renders the Server Component, the new `defaultValue` flows down, the DOM reconciles by uncontrolled-input identity.
- Constraint API attributes mirror the schema. If the schema says `.min(1)`, the input has `minLength="1"`. Drift between the two is the bug class the mirror prevents.
- `aria-invalid` and `aria-describedby` are non-optional. The visual error is for sighted users; the ARIA wiring is for assistive tech.
- The shadcn `<Form>` primitives don't require React Hook Form despite the docs implying it. The chapter uses them as pure layout primitives — `useActionState` owns the state. The 7.3.6 senior call.
- The `<Dialog>` for delete is shadcn's primitive, which handles focus trap, Esc-close, and click-outside (4.11.4 dividend). The form lives inside the dialog body — closing the dialog doesn't cancel the submit, submitting closes the dialog by virtue of the redirect.

Codebase state at entry: actions exist; form components are empty stubs; the temporary scratch button proves the backend.
Codebase state at exit: full CRUD surface visually complete. Create form renders field errors inline, edit form prefills and saves, delete form opens a dialog and submits. Every submit button shows a spinner during in-flight. JS-disabled submit still works — verified at the end of the lesson with a quick DevTools toggle.

Estimated student time: 40 to 55 minutes.

---

## Lesson 7.6.5 — `useOptimistic` on create with implicit rollback

Goals:

- Fill `app/invoices/_components/optimistic-invoices-list.tsx` (provided as a stub; the `/invoices` page already imports and wraps the list with it). Client component:
  - Props: `{ initialInvoices: Invoice[] }` (the server-fetched list from `listInvoices`).
  - `const [optimisticInvoices, addOptimistic] = useOptimistic(initialInvoices, (current, next: Invoice) => [next, ...current]);`
  - Renders the list rows from `optimisticInvoices`. The pending row gets a visual indicator (a `<Loader2 className="animate-spin" />` next to the number, a subtle `opacity-60` row).
  - Exports a `addOptimisticInvoice(invoice: Invoice)` function via a small React context so the create form can call it without prop-drilling.
- Refactor `new-invoice-form.tsx`:
  - Generate a client-side UUIDv7 at form-mount with `useState(() => uuidv7())`, render it as a hidden `<input type="hidden" name="id" value={tempId} />` — the client-generated UUID pattern from 7.3.5. The schema already accepts an optional `id` (7.6.3 kept it in the shape for exactly this reason), so no schema changes here. The action's `db.insert(...).values({ ...parsed.data, organizationId, createdBy: userId })` passes the client ID through when supplied; missing IDs fall back to the column's `$defaultFn`.
  - On submit, wrap the action call in a transition that fires the optimistic append before the action: `const handleSubmit = (formData: FormData) => { startTransition(() => { addOptimisticInvoice({ id: tempId, ...rawValuesFromFormData, status: 'draft' as const, pending: true }); formAction(formData); }); }`. The `<form action={handleSubmit}>` wires it; `useOptimistic`'s update only persists during the transition.
  - The action's success path: redirects to `/invoices/[id]`; on return to `/invoices`, the server-rendered list now includes the new invoice with the same UUID the optimistic add used. React reconciles by `key={invoice.id}` and the optimistic row swaps to the real one without a flicker.
  - The action's failure path: returns `{ ok: false, error: ... }`; the transition ends; `useOptimistic` discards the appended item; the list reverts to `initialInvoices`. The form-level banner reads `state.error.userMessage`.
- Add a `?fail=1` debug branch to `createInvoice` (named in the code with a comment that says "remove before production"; this is for the verify step in 7.6.7). When `formData.get('_debug_fail') === '1'`, the action sleeps 500ms then returns `err('internal', 'Forced failure for verify')`. The form adds a hidden checkbox or button click that sets the debug flag — wire the simplest pattern (a checkbox labeled "Simulate failure", `name="_debug_fail"`, `value="1"`).
- Run it:
  - Submit a valid invoice without the failure flag → the row appears immediately in the list, then the redirect fires, the detail page renders, navigating back shows the same row already there with its real persisted data.
  - Submit with the failure flag → the row appears in the list with the spinner indicator → 500ms later the row disappears → the form shows the banner with `userMessage: 'Forced failure for verify'` → the input values are still in the form (no reset).

Senior calls and watch-outs:

- `useOptimistic` must be called inside a transition for the update to persist; `startTransition` wrapping the `formAction` call is the pattern. The 7.3.5 rule.
- The client-generated UUID pattern avoids the flicker that temp string IDs would produce. Reconciliation by key is what makes the swap invisible.
- The optimistic reducer is pure. Logging to the console inside the reducer is the smell — React may call it multiple times during reconciliation.
- The `_debug_fail` flag is a chapter-local pattern; production actions never accept "please fail" inputs. Name this once; the chapter strips it during the verify if desired.
- `useOptimistic` doesn't pair well with mutations that have a high failure rate — the chapter's create has near-100% success once the schema and the auth context land. The 7.3.5 threshold rule made concrete.
- Don't optimistically update the *edit* form. The trigger (visible-to-user, high success, small UI change) doesn't fire as strongly — the user is staring at the form and the save banner is enough. Optimism is for the *list-and-add* shape.

Codebase state at entry: full CRUD with no optimism.
Codebase state at exit: create is optimistic, the rollback is invisible to write (React owns it), the failure case is observable through the debug flag. Edit and delete remain non-optimistic.

Estimated student time: 25 to 35 minutes.

---

## Lesson 7.6.6 — Wrapping the delete in a Drizzle transaction

Goals:

- Refactor `deleteInvoice` in `lib/invoices/actions.ts`. Replace the single `db.delete(...)` call with:
  - `const result = await db.transaction(async tx => { const existing = await tx.query.invoices.findFirst({ where: and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)) }); if (!existing) return { notFound: true as const }; await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, parsed.data.id)); await tx.delete(invoices).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId))); return { notFound: false as const, deletedNumber: existing.number }; });`
  - Translate `result.notFound` to `err('not_found', 'Invoice not found.')`; on success, `revalidatePath('/invoices')` and `redirect('/invoices')`.
- The senior framing for why this transaction earns its weight even when the FK `ON DELETE CASCADE` on `invoice_lines → invoices` would delete the children automatically: making the atomicity explicit at the action layer means the reviewer reads the action and sees the multi-step shape, the future addition (audit log write, soft-delete flag, notification dispatch, file cleanup — all coming in later units) drops into the same transaction without a re-architecture, and the senior anchor "no external calls inside the transaction" gets installed at the right moment so the Unit 8 email send and the Unit 13 file cleanup land *outside* the tx block when those layers arrive. Name the trade explicitly: the FK cascade alone would work today; the tx wrapper is the shape that holds for tomorrow.
- Name the senior anti-patterns the transaction protects against:
  - The pre-load → check → delete sequence outside a transaction (two round trips, race window between the check and the delete) becomes one atomic operation. Even though Postgres's FK constraint would still reject an orphan write, the application's intent is one unit of work.
  - Calling an external API (Resend, Stripe, a webhook) inside the `tx => ...` callback diverges state on rollback — name it once, this is the 7.2.5 watch-out made operational. The student's instinct after seeing the tx block is "while we're here, also email the customer that their invoice was deleted." Hold the line: the email goes after the tx commits (Unit 8 + Unit 14 own the dispatch).
- Add a small UX win the transaction's success enables: the redirect target carries a `?deleted=INV-0042` search param; the `/invoices` page reads it and renders a shadcn `Sonner` toast ("Invoice INV-0042 deleted"). The success data flows through the URL — no client state, no React context. Named once; the toast lives until the next navigation.
- Run it: delete an invoice from the detail page → the dialog opens, confirm → the action runs the transaction, both deletes commit atomically, the redirect fires, the list page shows the toast. Open Studio: the invoice row is gone, the invoice-lines rows are gone.
- Optional senior touch (5-minute extension, not load-bearing for the verify): the action takes ~10ms to run in dev; in prod against a network DB it would take ~50–80ms. Pair the delete with `useOptimistic` for the list-removal animation if the student wants the practice — the chapter doesn't require it because edit is the case the optimism trigger doesn't fire on, but removal is borderline. Name the call; leave the build to the student's discretion.

Senior calls and watch-outs:

- The transaction wraps reads-then-writes that must agree. Reading the existing row inside the tx ensures the row count check is atomic with the delete; in a read-then-delete-outside-tx pattern, a second admin could delete between the two queries and the second action's "not found" wouldn't fire.
- `tx` is a different value from `db`. Every query inside the callback uses `tx`; missing one (`db.delete(...)` inside the callback) is the failure mode — the un-tx'd query runs in its own implicit transaction, breaks atomicity, and the rollback wouldn't include it. The Drizzle convention from 6.4.4.
- Returning a value from the callback is the way to communicate to the action body what happened. Throwing inside the callback rolls back the transaction; returning a discriminated value lets the action map to the right `Result`.
- The `revalidatePath` call lives *outside* the transaction (the 7.2.5 rule made operational once more). Calling `revalidatePath` inside the `tx => ...` callback would invalidate the cache even if the transaction rolls back.
- The `?deleted=...` pattern works without JS. The redirect carries the param, the server-rendered list reads it, the toast is server-rendered (or hydrated by Sonner on mount). Progressive enhancement extends to the success toast.

Codebase state at entry: delete works through a single `db.delete(...)` call.
Codebase state at exit: delete is transactional, the success toast renders from a URL param, the action body's shape matches what every later unit will extend (Unit 10 adds audit-log writes inside the tx, Unit 11 adds the soft-delete branch, Unit 8 adds an email send *after* the tx commits).

Estimated student time: 20 to 30 minutes.

---

## Lesson 7.6.7 — Verify

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- **JS-disabled flow.** DevTools → settings → "Disable JavaScript" → reload `/invoices/new` → fill the form → submit. The browser POSTs to the action's URL, the action runs, the redirect to `/invoices/[newId]` fires, the detail page renders with no React hooks active. Verify in `pnpm db:studio` that the row landed. Re-enable JS; soft-reload the list page; the new invoice is there.
- **Invalid-data field errors.** With JS enabled, submit `/invoices/new` with `total` blank and `dueAt` set to a malformed value. The constraint API catches the missing field first (the browser's native invalid-bubble before submit); remove `required` temporarily to test the server path; submit; the action's `safeParse` fails; the form re-renders with `<FieldError>` messages under both fields; the unfilled inputs keep their typed values; the submit button is enabled again. Add the `required` back.
- **Conflict (`code: 'conflict'`) path.** Edit an existing invoice and set its `number` to one already used by another invoice in the same org. Submit. The Postgres unique violation fires; `isUniqueViolation(e)` matches; the action returns `err('conflict', 'An invoice with that number already exists for this org.')`. The form renders the form-level banner (not a field-level error, because the conflict isn't tied to one field's value alone — the org+number composite). Name this distinction.
- **Optimistic rollback.** With the `?fail=1` debug branch (or by toggling the "Simulate failure" hidden field), submit a valid create. The row appears at the top of the list with the spinner indicator; 500ms later it vanishes; the banner shows `Forced failure for verify`. The form values persist. Disable the debug flag, resubmit; the create succeeds, the row stays, the redirect fires.
- **Delete confirmation through a form action.** Open `/invoices/[id]`; click "Delete"; the shadcn `<Dialog>` opens; confirm. The submit fires through `formAction`. Inspect Network in DevTools: one POST to the action URL, no `/api/*` `fetch` calls. With JS disabled, the shadcn `<Dialog>` (Radix-backed) doesn't open — the no-JS fallback renders the delete `<form>` inline on the detail page (the `<noscript>`-gated pattern from 7.6.4) so the action still fires. Submit; the action runs the transaction; the redirect fires.
- **Transaction atomicity check.** Add a temporary `throw new Error('debug rollback')` inside the delete transaction after `tx.delete(invoiceLines)` but before `tx.delete(invoices)`. Try to delete an invoice; the action throws; the page kicks to `error.tsx`. Refresh `pnpm db:studio` — the invoice and its lines are both still there. The tx rolled both back atomically. Remove the throw.
- **Revalidation.** Create, edit, and delete invoices in sequence. Each time, navigate back to `/invoices` — the list reflects the change without a manual reload. `revalidatePath` is firing.
- **Progressive enhancement edge cases.** Disable JS; the optimistic add doesn't fire (no `useOptimistic`, no transition) but the form still creates the row via the redirect. The user sees the new invoice when they land on the detail page; the list still reflects the change on next navigation. The delete works (the dialog falls back per above); the edit works (no optimism on edit anyway, so JS-disabled is the same UX).
- **Senior recap.** Name the disciplines installed:
  - Every action parses on entry with `safeParse`.
  - Every action returns `Result`, never throws on expected failures.
  - Every action revalidates *after* the database write, *before* the return.
  - Every action runs the auth read after the parse (using the stub that 10.2's wrapper will replace).
  - Every form is a Client Component with uncontrolled inputs, a `name` attribute matching the schema, `defaultValue` for edits, and the action prop wiring the submit.
  - Field errors render from the action's `Result.error.fieldErrors`, never from local state.
  - The `<SubmitButton>` is reused across every form by reading `useFormStatus` from context.
  - `useOptimistic` is reserved for the high-success / visible / small-UI-change case (create).
  - The delete transaction's shape holds for the audit-log, notification, and external-call extensions of Units 8–14.
- **Forward references.**
  - Unit 8 (transactional email) adds a Resend send after `createInvoice`'s tx commits — *not* inside it.
  - Unit 9 (Better Auth) replaces `getActiveContext()` with a real session read; the `users` stub goes away, the `createdBy` FK target stays valid.
  - Unit 10 (RBAC) wraps every action in `authedAction('member', schema, fn)` so the parse, the auth read, and the `Result.error.code === 'unauthorized'` path become structural. The student's per-action `safeParse` lines disappear into the wrapper; the action body shrinks to the mutation seams.
  - Unit 11 (URL-state list with soft delete + concurrency) adds a `version` column for optimistic concurrency control on edits (the `409` Result path) and a `deletedAt` column for soft delete; `updateInvoice` and `deleteInvoice` change shape accordingly.
  - Unit 12 (Stripe billing + idempotency) drops the `id` hidden field in the create form to a Server Action `Idempotency-Key` shape derived from a UUIDv7 — the same client-generated UUID pattern, repurposed for replay safety.
  - Unit 15 (cache) replaces the blunt `revalidatePath` with `updateTag('org:X:invoices')` so the cached read on the list refreshes only its tagged subset.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the discipline. If a verify step fails, the lesson points the student at the owning build lesson, not at "debug it yourself."
- The JS-disabled test is the cheapest single test that proves the form pattern was built right. The 2026 reflex: every form gets one JS-disabled pass at feature-launch time.

Codebase state at entry: full CRUD with optimism and transactional delete.
Codebase state at exit: same surface, verified clause-by-clause. The `?fail=1` debug branch is removed (or left with a comment, depending on the student's preference). The student can articulate every decision made in the chapter and the unit that will extend each one.

Estimated student time: 20 to 30 minutes.
