# Lesson 3 — Edit an invoice

- **Sidebar title:** Edit an invoice
- **Lesson type:** Implementation

The chapter-outline title fits; keep "Edit an invoice".

## Lesson framing

The student installs the senior reflex that separates a multi-tenant update from a hobby one: the tenant guard lives *in the `where` clause*, not in a load-then-check that opens an IDOR hole. They ship the edit feature — a prefilled form on the detail page that saves changes in place — by reusing the create path's schema and five-seam shape, adding only an `id`-bearing schema and an `UPDATE … WHERE id AND organizationId`. The payoff is recognizing *when not* to redirect (stay in context, let `revalidatePath` flow fresh data) and *where* a duplicate-number conflict surfaces (a form-level banner, because the violation is on the org+number composite, not one field).

## Codebase state

### Entry
Lesson 2 is complete. `createInvoiceInputSchema`, `createInvoice`, `NewInvoiceForm`, and the shared `<SubmitButton>`/`<FieldError>` exist and work; a valid create persists and redirects. In `lib/invoices/mutation-schemas.ts` the `updateInvoiceInputSchema` is still an empty `z.object({})` stub. In `lib/invoices/actions.ts` `updateInvoice` still returns `err('internal', 'Not implemented')`. `app/invoices/[invoiceId]/edit-invoice-form.tsx` renders only a `<form>` with an `<h2>` heading. The detail page `app/invoices/[invoiceId]/page.tsx` (provided) already loads the invoice via `getInvoiceDetail` with a `notFound()` guard, renders the read-only detail `<article>`, and renders `<EditInvoiceForm invoice={invoice} customers={customers} />` — so the form component just needs filling.

### Exit
`updateInvoiceInputSchema = createInvoiceInputSchema.extend({ id: z.uuid() })` exists; `updateInvoice` is implemented in the five-seam shape with the tenant filter in its `where` and returns `ok({ id })` without redirecting; `EditInvoiceForm` is a prefilled, progressively-enhanced client form. Editing an invoice saves in place and re-renders with fresh values; a duplicate number shows a form-level conflict banner. `deleteInvoice`, the optimistic list, and the transaction remain untouched (lessons 4–6).

## Lesson sections

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: a student opens an existing invoice, changes its fields, and saves the edit in place, with a duplicate invoice number surfacing as a conflict. Then a one-paragraph description (or screenshot via `Screenshot`) of the finished feature: `/invoices/[invoiceId]` shows the read-only detail panel with a prefilled edit form below it; saving valid changes refreshes the page with the new values without a manual reload; reusing another invoice's number shows a form-level banner.

### Your mission (h2)
Prose paragraph weaving the brief, no subsection headers, no implementation hints. Frame editing as a reuse of the create path plus two new ideas: a schema that requires the `id`, and a mutation that must not let one org touch another org's row. Name the senior decisions as constraints: the tenant guard belongs in the `where` clause (a forged id for another org matches zero rows), never a load-then-check after the fact — that is the IDOR-class bug. Unlike create, edit returns `ok` without redirecting: the user stays on the form and `revalidatePath` re-fetches the Server Component so fresh defaults flow down. A duplicate `number` for the same org is a form-level banner, not a field error, because the unique constraint is on the org+number composite. Constraints to weave: uncontrolled inputs with `defaultValue` (resist controlled inputs "to make editing easier" — they break the `revalidatePath`-flows-new-defaults reconcile). Out of scope (one line): optimism (deliberately skipped for edit — see lesson 5) and the transaction (lesson 6).

Then the **Functional requirements** as a numbered list, each tagged. Render with `Checklist`/`ChecklistItem` carrying the `tested`/`untested` chip:
1. Opening `/invoices/[invoiceId]` shows the edit form prefilled with the invoice's current values. `[tested]`
2. Saving valid changes persists them and the page reflects the new values without a manual reload. `[tested]`
3. Editing one org's invoice cannot modify another org's row — the tenant filter is in the `where`. `[tested]`
4. Setting an invoice's `number` to one already used by another invoice in the same org surfaces a form-level banner, not a field error. `[tested]`
5. An invalid edit re-renders the form with field-level messages and keeps the entered values. `[untested]`

(Requirement 5's "keeps the entered values" half relies on the echoed-defaults + `key`-remount mechanic established in lesson 2; the test-coder asserts field messages render, the typed-value persistence is confirmed by hand and covered in the solution. Tag as `[untested]` since it leans on the same React-19 reset behavior lesson 2 owns.)

### Coding time (h2)
One line directing the student to implement `updateInvoiceInputSchema`, `updateInvoice`, and `EditInvoiceForm` against the brief and the tests. Then the reference build in `<details>` (writer wraps it collapsed). Organize as it appears in the repo:

- **`lib/invoices/mutation-schemas.ts`** — add `export const updateInvoiceInputSchema = createInvoiceInputSchema.extend({ id: z.uuid() })`. Show with `Code`. One line: it inherits every create rule and adds the required `id`; the form posts the id as a hidden input.
- **`lib/invoices/actions.ts`** — `updateInvoice(_prevState, formData)` in the five-seam shape. Use `AnnotatedCode` to direct focus to (a) `safeParse` with `updateInvoiceInputSchema` → `err('validation', …, z.flattenError(...).fieldErrors)`, (b) `getActiveContext()` after the parse, (c) the `db.update(invoices).set(parsed.data).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)))` — the load-bearing tenant guard, (d) the `try/catch` mapping `isUniqueViolation` to `err('conflict', …)`, (e) `revalidatePath('/invoices')` then `return ok({ id: parsed.data.id })` — no redirect. Rationale callouts: the tenant id in the `where` means a forged id matches zero rows instead of leaking/mutating a foreign row; no redirect keeps the user in context and `revalidatePath` is what shows fresh data, so no client-side state sync.
- **`app/invoices/[invoiceId]/edit-invoice-form.tsx`** — Client Component, props `{ invoice: InvoiceDetail; customers }`, `useActionState(updateInvoice, null)`. This file is long; prefer `CodeVariants` or `AnnotatedCode` to focus on what differs from `NewInvoiceForm` (lesson 2) rather than re-explaining the whole cluster. Load-bearing parts: the `defaults` state seeded from the `invoice` prop (dates formatted to `yyyy-mm-dd` via an `en-CA` + UTC `Intl.DateTimeFormat`, `total` as `String(invoice.total)`); the `<input type="hidden" name="id" defaultValue={invoice.id} />`; the echoed-defaults + `key={submitCount}` remount on submit (same React-19 reset mechanic as lesson 2 — link, don't re-explain); the form-level banner `{state?.ok === false && state.error.code !== 'validation' && <p role="alert">…}`. The field cluster (`<div className="grid gap-2">` + `<Label htmlFor>` + control + `<FieldError>` + manual `aria-*`) mirrors create exactly — link to lesson 2, don't re-derive.

Decision rationale (one or two sentences each): tenant id in `where` not post-load check; no redirect on success. Coverage of the `[untested]` requirement: the conflict renders as a form-level banner because the org+number composite isn't tied to one field (the student confirms by hand); `defaultValue` over `value` is what lets the re-fetched Server Component flow new values into the uncontrolled inputs. Callout: the edit action intentionally has no `useOptimistic` — point to lesson 5 for why edit is the case where the optimism trigger doesn't fire.

For topics owned by regular lessons, link rather than re-explain: `createInsertSchema`/`.extend` (ch 042 L7), the five-seam shape and `Result`/`isUniqueViolation` (ch 043 L3), `useActionState`/uncontrolled inputs (ch 044 L2–L3), the tenant-`where` IDOR rule (ch 041 L6).

### Moment of truth (h2)
The test command `pnpm test:lesson 3` and the expected pass output. (Note: the shipped `tests/lessons/Lesson 3.test.ts` is currently a `describe.todo` placeholder — the test-coder generates the real assertions for the `[tested]` requirements; the outline assumes a passing run after that.) Then a hand-verification `Checklist` for what tests can't cover: open an invoice, change a field, save → page shows the new value with no manual reload; set `number` to one another invoice in the same org uses, save → form-level banner appears, not a field error; submit an invalid edit → field messages render and the entered values stick.

No diagram needed — the flow is the same browser → Server Action → `revalidatePath` shape lesson 2 already carried; prose plus the annotated action covers it.

## Scope

- **Delete / confirmation dialog / no-JS fallback** — lesson 4.
- **Optimistic UI on edit** — out of scope by design; optimism lands on the create-and-list shape in lesson 5, where the brief explains why edit doesn't earn it.
- **Transactional mutation / `db.transaction`** — lesson 6 (delete).
- **The read-only detail panel, `getInvoiceDetail`, the `notFound()` guard** — provided by chapter 041 + the starter page; this lesson only fills the edit form below it.
- **The shared `<SubmitButton>` / `<FieldError>` and `createInvoiceInputSchema`** — built in lesson 2; reused here, not re-taught.
