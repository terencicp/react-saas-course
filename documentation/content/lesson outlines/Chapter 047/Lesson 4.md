# Lesson 4 — Delete with confirmation

## Lesson title

Chapter-outline title "Delete with confirmation" fits — it names the feature and the UX guard.
Keep it.

- Page title: `Delete with confirmation`
- Sidebar (short): `Delete an invoice`

## Lesson type

`Implementation`

Drives downstream branching: the test-coder fills `tests/lessons/Lesson 4.test.ts` (currently `describe.todo`) against the `[tested]` requirements; the writer renders the Implementation section list.

## Lesson framing

The student installs the senior reflex that destructive mutations ride the form action, not a hand-wired `fetch`, and that progressive enhancement is non-negotiable even for the smallest action.
They ship the third and final Server Action — `deleteInvoice` — behind a shadcn confirmation `<Dialog>`, with an always-rendered inline `<form>` fallback so the delete still POSTs with JavaScript off.
The payoff is the discipline, not the code volume: one POST to the action URL, a tenant-scoped `where`, and a no-JS path that never depends on Radix booting.

## Codebase state

### Entry

The create path (Lesson 2) and edit path (Lesson 3) are complete and green: `createInvoice`/`updateInvoice` in `lib/invoices/actions.ts`, `createInvoiceInputSchema`/`updateInvoiceInputSchema` in `lib/invoices/mutation-schemas.ts`, the shared `<SubmitButton>`/`<FieldError>`, and `NewInvoiceForm`/`EditInvoiceForm`.
The `deleteInvoice` action body still returns `err('internal', 'Not implemented')`; `deleteInvoiceInputSchema` is an empty `z.object({})`; `app/invoices/[invoiceId]/delete-invoice-form.tsx` renders a "Delete" button stub with no form or action.
The provided `/invoices/[invoiceId]/page.tsx` already loads the invoice via `getInvoiceDetail` (with a `notFound()` guard) and renders `<DeleteInvoiceForm invoiceId invoiceNumber />` below the edit form — the page expects the student to fill that component.
`lib/result.ts` (`Result`, `ok`, `err`, `isUniqueViolation`), `lib/auth-stub.ts` (`getActiveContext()`), the `db` client, and the shadcn `dialog` primitive are all provided.

### Exit

`deleteInvoiceInputSchema = z.object({ id: z.uuid() })` is defined; `deleteInvoice` runs a single tenant-scoped `db.delete(...)`, `revalidatePath('/invoices')`, and `redirect('/invoices')`.
`DeleteInvoiceForm` renders a shadcn `<Dialog>` whose body holds a `<form action={formAction}>` with a hidden `id`, a `<DialogClose>` Cancel button, and a destructive submit; below it, an always-rendered inline fallback `<form action={formAction}>` carries the same hidden `id`.
Deleting an invoice (via dialog with JS, or fallback without) removes the row and lands on `/invoices`.
Not yet present: the Drizzle transaction wrapping the delete, the `not_found` discriminated-return path, and the `?deleted=<number>` success banner/toast — all Lesson 6.

## Lesson sections

Implementation type. Section order: Goal + Finished result (intro, no header) / Your mission / Coding time / Moment of truth.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a student can delete an invoice from its detail page behind a confirmation dialog, and the delete still works with JavaScript disabled.
Then a one-paragraph (or short) description of the feature working: `/invoices/[invoiceId]` shows a destructive "Delete" button that opens a shadcn `<Dialog>` ("Delete invoice INV-0042?"); confirming submits through the Server Action and returns to `/invoices` with the row gone; cancelling closes the dialog and changes nothing; with JS off, the dialog never opens but an inline fallback form performs the same delete.
A `Screenshot` of the open confirmation dialog over the detail page would carry this better than prose — brief one if the screenshot agent can capture it, otherwise a one-paragraph description suffices.

### Your mission (header: "Your mission")

Weave the contract into coherent prose, no subsection headers, no implementation hints.

**Feature (user terms).** Delete an invoice from its detail page behind a confirmation step, with the delete surviving JavaScript being disabled.

**Framing prose to install.** Delete is the smallest action but it makes the progressive-enhancement discipline concrete.
The interesting work is the form, not the action: the delete must submit through the form action — one POST to the action URL, no `fetch` to an `/api/*` route — so the inexperienced reflex to wire an `onClick` handler that calls `fetch` is exactly the trap to avoid.
The confirmation uses the shadcn `<Dialog>` (Radix-backed, so focus trap, Esc-close, and click-outside come for free), with the `<form action={formAction}>` living inside the dialog body.
Because Radix needs JavaScript to open the dialog, the component also renders a second delete `<form>` inline — always present, never gated behind a scripting check — so when JS is off the dialog never opens but the fallback form still POSTs.

**Functional requirements** (numbered; the writer renders as a `Checklist` with per-item `tested`/`untested` chips):

1. Clicking "Delete" on `/invoices/[invoiceId]` opens a confirmation dialog; confirming removes the invoice and returns to `/invoices` without it. `[tested]`
2. The confirmed delete fires as a single POST to the action URL with no `/api/*` fetch. `[untested]` (network-shape verify, by hand)
3. Cancelling the dialog closes it and changes nothing. `[untested]` (UI-interaction verify, by hand)
4. With JavaScript disabled, the inline fallback form deletes the invoice and returns to the list. `[untested]` (no-JS verify, by hand)
5. Deleting one org's invoice cannot remove another org's row — the tenant id is in the delete `where`. `[tested]`

**Constraints.** The delete submits through the form action (no client request plumbing); the confirmation lives in a Radix `<Dialog>`; the no-JS fallback form is rendered unconditionally, not behind a scripting-detection branch.

**Out of scope** (one line): the Drizzle transaction and the `?deleted=` success toast — both land in Lesson 6.

### Coding time (header: "Coding time")

One line directing the student to implement `deleteInvoiceInputSchema`, `deleteInvoice`, and `DeleteInvoiceForm` against the brief and the tests, then read the reference build.
The writer wraps the reference in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo:

- **`lib/invoices/mutation-schemas.ts`** — add `export const deleteInvoiceInputSchema = z.object({ id: z.uuid() })` (plus its `DeleteInvoiceInput`/`DeleteInvoiceOutput` infers, matching the file's existing pattern). The smallest of the three schemas — delete needs only the row id.
- **`lib/invoices/actions.ts`** — `deleteInvoice(_prevState, formData): Promise<Result<null>>` in the five-seam shape: `safeParse(Object.fromEntries(formData))` against `deleteInvoiceInputSchema` → on failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; then `const { organizationId } = await getActiveContext()`; then `await db.delete(invoices).where(and(eq(invoices.id, parsed.data.id), eq(invoices.organizationId, organizationId)))`; then `revalidatePath('/invoices')`; then `redirect('/invoices')`. **Lesson 4 ships the single-statement version** — the `db.transaction(...)`, the `not_found` discriminated return, and the `?deleted=` redirect param are Lesson 6, not here. (The repo's final `actions.ts` already shows the transactional form; this lesson's reference must show the plain `db.delete` body so the diff to Lesson 6 stays clean.)
- **`app/invoices/[invoiceId]/delete-invoice-form.tsx`** — Client Component (`'use client'`), props `{ invoiceId, invoiceNumber }`, `const [state, formAction] = useActionState(deleteInvoice, null)`. Wrapped in a `<section data-testid="delete-invoice-form" className="flex flex-col gap-2">`:
  - A shadcn `<Dialog>` whose `<DialogTrigger asChild>` wraps a destructive `<Button type="button">Delete</Button>`; the `<DialogContent>` holds `<DialogHeader>` with `<DialogTitle>Delete invoice {invoiceNumber}?</DialogTitle>` + a `<DialogDescription>` warning the action is permanent, then `<form action={formAction}>` containing `<input type="hidden" name="id" defaultValue={invoiceId} />` and a `<DialogFooter>` with a `<DialogClose asChild>`-wrapped outline "Cancel" `<Button type="button">` and `<SubmitButton variant="destructive">Delete</SubmitButton>`.
  - Below the dialog, a second `<form action={formAction} data-testid="delete-fallback-form">` with the same hidden `id` input and a `<SubmitButton variant="destructive">Delete invoice</SubmitButton>` — the always-rendered no-JS fallback.
  - An error banner: `{state?.ok === false && <p role="alert" className="text-destructive">{state.error.userMessage}</p>}`.

Decision rationale (one or two sentences each):

- The submit rides the form action rather than a `fetch`, so progressive enhancement holds and there is no client-side request plumbing to maintain.
- The `redirect` (not an `ok` return) closes the dialog implicitly via the page navigation, so no dialog-state bookkeeping is needed on success.
- The fallback form is rendered unconditionally rather than gated behind no-JS detection: it costs nothing with JS on (the user uses the dialog) and is the only path with JS off, so there is no scripting-detection branch to maintain.

Coverage of untested requirements:

- Requirement 2 (single POST, no `/api/*` fetch) follows from the `<form action={formAction}>` wiring — there is no `onClick`/`fetch` anywhere; the student confirms in the Network panel.
- Requirement 3 (cancel changes nothing) follows from `<DialogClose>` simply closing the Radix dialog without submitting.
- Requirement 4 (no-JS path) is the always-rendered fallback `<form>`; a human verifies with scripting disabled.
- The tenant id in the delete `where` (`and(eq(invoices.id, ...), eq(invoices.organizationId, organizationId))`) mirrors the update rule from Lesson 3 — a forged id for another org matches zero rows instead of deleting a foreign one.

Callout: both the dialog-body form and the fallback form bind the same `formAction` and carry the same hidden `id`; closing the dialog does not cancel an in-flight submit, and a successful submit navigates away so the dialog state never matters.

Link rather than re-explain (these are owned by regular lessons): `<form action>` + uncontrolled inputs (Ch 044 L1–2), `useActionState` shape (Ch 044 L3), `<SubmitButton>`/`useFormStatus` (Ch 044 L4), progressive enhancement (Ch 044 L7), the five-seam Server Action shape and `Result` (Ch 043 L1–5), the shadcn `<Dialog>` install (Ch 027 L4), tenant-scoped `where` / IDOR avoidance (Ch 041 L6).

**Code sample handling.**
- `Code` (TS) for `deleteInvoiceInputSchema` and the `deleteInvoice` action body — short, single-concept blocks.
- `AnnotatedCode` for `delete-invoice-form.tsx`: the file has three parts the student must see distinctly — the dialog-body form, the always-rendered fallback form, and the shared hidden-`id` wiring. Step the highlight through (1) the `<Dialog>`/trigger, (2) the dialog-body `<form action={formAction}>` + hidden id, (3) the fallback `<form>` carrying the same id, (4) the error banner.
- No diagram needed — the flow is a single POST; prose carries it.

External resources slot: appended after the `<details>` with no header (resourcer adds later).

### Moment of truth (header: "Moment of truth")

Test command: `pnpm test:lesson 4` (the `scripts/test-lesson.mjs` runner; `tests/lessons/Lesson 4.test.ts` is a `describe.todo` placeholder until the test-coder fills it).
Expected pass output: the lesson's suite reports passing (the tested requirements 1 and 5 — delete-then-gone, and cross-org delete blocked).

Then a by-hand `Checklist` for the untested requirements:

- [ ] Click "Delete", confirm — the invoice is gone from `/invoices`. In DevTools Network: one POST to the action URL, no `/api/*` fetch. (req 1, 2)
- [ ] Click "Delete", then "Cancel" — nothing changes. (req 3)
- [ ] Disable JavaScript, reload the detail page, submit the inline fallback form — the invoice is deleted and you land on `/invoices`. (req 4)

## Scope

- The Drizzle transaction wrapping the delete, the `not_found` discriminated-return path, and the `?deleted=<number>` SSR banner + Sonner toast — Lesson 6 (Transactional delete).
- Optimistic UI for the list — Lesson 5 (Optimistic create); delete is never optimistic here.
- The create and edit forms and their actions — Lessons 2 and 3.
- The shadcn `<Dialog>` primitive internals and the install discipline — Ch 027 L4 (the primitive ships in the starter; this lesson only composes it).
