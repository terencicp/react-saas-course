# Chapter 047 — Lesson 6 outline

## Lesson title

Title: **Transactional delete** (chapter-outline title fits — it names the senior payoff: the transaction shape, not the cascade).
Sidebar: **Transactional delete**

## Lesson type

`Implementation`

(Last lesson of the chapter. The test-coder runs for this lesson; the writer renders the Implementation section list.)

## Lesson framing

The student installs the durable shape every later unit's delete path will extend: a multi-step delete wrapped in one Drizzle transaction, with the discipline that keeps it correct — every query on `tx` not `db`, no external calls inside the callback, `revalidatePath`/`redirect` outside it. The payoff is not correctness for today's code (the FK `ON DELETE CASCADE` already deletes the children) but a reviewable atomic block that audit-log writes, soft-delete branches, and file cleanup drop into later without re-architecture. They also close the success loop the right way: confirmation flows through a `?deleted=<number>` URL param so the SSR banner survives no-JS, with a Sonner toast layered on top only when JS is on.

## Codebase state

### Entry

The delete path from lesson 4 is live: `deleteInvoice` parses with `deleteInvoiceInputSchema`, reads context, runs a single tenant-scoped `db.delete(invoices)`, `revalidatePath('/invoices')`, and `redirect('/invoices')`. `DeleteInvoiceForm` is complete (Dialog confirm + always-rendered no-JS fallback form). Lesson 5 has layered `useOptimistic` on the list and the `_debug_fail` branch on `createInvoice`. The provided `/invoices` page already reads a `deleted` search param and renders both the `role="status"` SSR banner and the `<DeletedToast>` island — but nothing redirects with that param yet, so the success confirmation never fires. The provided `deleted-toast.tsx` island is in place. The FK on `invoice_lines.invoiceId → invoices.id` is `ON DELETE CASCADE`.

### Exit

`deleteInvoice` is refactored to `db.transaction(async tx => ...)`: load the existing row tenant-scoped (capturing `number`, detecting missing), `tx.delete(invoiceLines)`, then `tx.delete(invoices)` — all on `tx`. The callback returns a discriminated `{ notFound: true } | { notFound: false; deletedNumber }` rather than throwing for the expected missing case; the action maps `notFound` to `err('not_found', ...)`. On success it `revalidatePath('/invoices')` then `redirect('/invoices?deleted=' + deletedNumber)`, both outside the callback. The success confirmation now fires end to end: SSR banner on no-JS, Sonner toast on top with JS. Chapter complete — the full CRUD surface is shipped. (Only `actions.ts` `deleteInvoice` changes; the page and toast island were already provided.)

## Lesson sections

Implementation contract order. No diagram (the prose carries the two-step delete and the cache/redirect placement clearly; a box-and-arrow would not add signal).

### Goal + Finished result (intro, no header)

One sentence goal in user terms: delete an invoice and its line rows atomically in one transaction, and see a success confirmation carried through the URL. Then a one-paragraph description of the finished behavior: confirming a delete removes the invoice and its `invoice_lines` together; the list shows an SSR "Invoice INV-0042 deleted" banner (survives no-JS) with a Sonner toast on top when JS is on; a forced mid-transaction error leaves both the invoice and its lines intact. No screenshot needed — describe in prose (matches the no-new-inspector-page surface spec).

### Your mission (h2)

Coherent prose paragraph, no subsection headers, no implementation hints. Weave in:
- **Feature**: delete an invoice and its line rows in a single transaction; confirm success through a URL param visible with or without JS.
- **The senior point** (lead with it): the FK cascade already deletes the children, so the transaction buys nothing for today's code — it is the explicit, reviewable multi-step shape and the slot where Unit 9's audit-log write, Unit 10's soft-delete branch, and later file cleanup join without re-architecture.
- **Constraints that shape the solution**: every query inside the callback runs on `tx`, never `db` (a stray `db` call opens its own implicit transaction and breaks atomicity — the chapter-039 convention); no external calls inside the transaction (the "while we're here, email the customer" reflex is the trap — email goes after the commit, Units 7/13 own dispatch, because an external call diverges state on rollback); `revalidatePath` and `redirect` stay outside the callback, or a rollback would still have invalidated the cache or navigated; the expected missing-row case returns a discriminated value rather than throwing (throwing is reserved for genuine rollback); success state travels through the URL, no client state.
- **Out of scope**: one line — nothing new ships beyond this; it is the chapter's last step.

Then the **Functional requirements** as a numbered list, each tagged `[tested]` or `[untested]`. Phrase each as a verifiable outcome, never a file/export. Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip.

1. Confirming a delete removes the invoice and all its line rows together. `[tested]`
2. A forced error after the line delete but before the invoice delete leaves both the invoice and its lines intact (rollback). `[tested]`
3. Deleting a missing or other-org invoice returns a not-found result rather than throwing. `[tested]`
4. After a successful delete the list page shows the deleted invoice's number in an SSR banner (text from `searchParams`, present without JS). `[tested]`
5. With JS on, a Sonner toast carrying the same number appears on top of the banner. `[untested]` (JS-only island; verified by hand)
6. No external call or cache revalidation sits inside the transaction callback. `[untested]` (verified by inspection — the durable rule)

Note to test-coder: assertions target observable behavior against the student's `deleteInvoice` + the provided page. Tested set — (1) row + lines gone after a real delete, (2) a forced throw between the two deletes leaves both intact, (3) a non-existent / wrong-org id yields a `not_found` Result without throwing, (4) the success redirect carries `?deleted=<number>` and the page renders the `deleted-banner` text. Each test file is self-contained per the contract; failure messages point at the likely cause (e.g. "lines remained after delete — are both deletes on `tx`?").

### Coding time (h2)

One line directing the student to implement the transactional `deleteInvoice` and the URL-param success redirect against the brief and the tests, then read the reference. Wrap the solution in `<details>` (writer collapses it).

Reference implementation, organized as it appears in the repo:

- `lib/invoices/actions.ts` — `deleteInvoice` body refactored. Use **`AnnotatedCode`** on the transaction block (it is the one complex block where student attention must land on specific lines): step through (a) the tenant-scoped `tx.query.invoices.findFirst` existence read *inside* the tx, (b) the early `return { notFound: true as const }` discriminated value, (c) `tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, ...))`, (d) `tx.delete(invoices).where(and(id, organizationId))`, (e) `return { notFound: false as const, deletedNumber: existing.number }`, then below the callback the `result.notFound → err('not_found', ...)` map, `revalidatePath('/invoices')`, and `redirect('/invoices?deleted=' + result.deletedNumber)`. Pull the exact code from `projects/Chapter 047/solution/src/lib/invoices/actions.ts` lines 106–151.
- `app/invoices/page.tsx` — **provided, already in the starter**; show the relevant slice only (the `deleted` param read + the two-layer banner/`<DeletedToast>` render) as a plain `Code` block so the student sees where their redirect param lands. Note it is not student-written — link the read to the `searchParams` pattern (chapter 033) rather than re-explaining.
- `app/invoices/_components/deleted-toast.tsx` — **provided**; show as a short `Code` block, note the `useEffect` fires `toast.success` once keyed by `number`, and the `<Toaster>` is mounted in `app/layout.tsx`.

Decision rationale (one or two sentences each):
- The existence read sits inside the transaction so the check and the delete are atomic — a read-then-delete outside a tx leaves a race window where a second deleter slips between the two queries.
- The callback returns a discriminated value for "not found" instead of throwing so the action maps it to the right `Result`; throwing is reserved for actual rollback.
- `revalidatePath` and `redirect` live outside the callback so a rollback never invalidates the cache or navigates on a failed delete.
- Success is split into an SSR banner (no-JS-safe text from the URL) and a JS-only toast island, rather than a toast alone, so the no-JS path still gets visible confirmation.

Coverage of `[untested]` requirements:
- Req 6 (every query on `tx`, no external call / no revalidation inside the callback): point at where each `tx.` call sits and where `revalidatePath`/`redirect` sit relative to the callback boundary; name the later-unit additions (audit log, soft-delete, file cleanup) that land *after* the commit.
- Req 5 (Sonner toast): the provided island fires it; the student confirms by hand with JS on.

Callout: the transaction is deliberately heavier than today's FK `ON DELETE CASCADE` requires — call this out explicitly so it does not read as redundant. It is the shape that holds when audit-log, soft-delete, and notification steps join it. For transaction mechanics, link to the Drizzle transactions lesson (chapter 039 lesson 4) rather than re-teaching `db.transaction`. For `revalidatePath`, link to chapter 043 lesson 5 / chapter 032 lesson 6.

External resources slot: none required; the resourcer appends after the `<details>` if any.

### Moment of truth (h2)

Test command and expected pass output:
- `pnpm test:lesson 6` — runs `tests/lessons/Lesson 6.test.ts` via `scripts/test-lesson.mjs`. Expected: the lesson's spec block passes (it currently ships as a `describe.todo` placeholder the test-coder replaces). Show the green pass summary.

Then a by-hand `Checklist` for what the tests do not cover (each item ticks off as the student verifies):
- Delete an invoice, confirm — both the invoice row and its `invoice_lines` rows are gone in `pnpm db:studio`, and the list shows the "Invoice INV-0042 deleted" banner plus a Sonner toast.
- Temporarily `throw new Error('debug rollback')` between the two deletes, attempt a delete — the request fails and Studio still shows both the invoice and its lines. Remove the throw.
- Disable JavaScript and delete via the inline fallback form — the SSR banner still renders on the list page from the URL param (the Sonner toast does not, since it's JS-only).

## Scope

This lesson does not cover:
- The delete form UI, the confirmation dialog, or the no-JS fallback form — built in lesson 4 (Delete with confirmation).
- The single-statement delete and tenant `where` guard — established in lesson 4.
- Transaction mechanics (`db.transaction`, rollback semantics) in depth — taught in chapter 039 lesson 4; this lesson only applies the pattern.
- The actual audit-log write, soft-delete branch, notification, or email dispatch the transaction's shape anticipates — those land in Units 7, 9, 10, 13 respectively; here they are named only as the slots the shape reserves.
- `useOptimistic` on the delete — the create lesson (lesson 5) owns optimism; delete redirects instead.
