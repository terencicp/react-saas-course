# Lesson 4 — Send the email, write the audit log

- **Full title:** Send the email, write the audit log
- **Sidebar title:** Email and audit log
- **Type:** Implementation

The chapter-outline title fits — it names the two side effects this lesson closes the run with. Kept verbatim.

## Lesson framing

The student installs the senior discipline for closing a durable job: the two terminal side effects — a transactional email and an append-only audit row — must each fire exactly once even when the parent run retries. They ship the `sendExportEmail` child task (a child precisely so a per-step idempotency key and the child's own retry policy guard the Resend call) and the parent's closing transaction (exports-row update plus audit write in one tenant transaction, audited after the email so the log records the shipped outcome, not the intent). The payoff is a fully working export — email in the inbox, run flipped to `completed`, one fresh audit row — plus the reasoning for why each guard sits where it does.

## Codebase state

**Entry.** Lessons 2 and 3 are done: `startExport` (`src/lib/exports/start.ts`) fires the task fire-and-forget with the daily idempotency key and per-org `concurrencyKey`; `trigger/paginate-page.ts` reads one page and returns a CSV fragment; the `exportInvoices` parent body (`trigger/export-invoices.ts`) counts pages, aborts the empty org via `AbortTaskRunError`, runs the sequential `paginatePage.triggerAndWait` loop with run-scoped per-page keys, drives `metadata` progress, and ends by logging the CSV size and setting a placeholder `downloadUrl` on `metadata`. Still stubbed: `trigger/send-export-email.ts` throws `new Error('not implemented')`; the parent body has no email step and no closing transaction (it does not yet update the `exports` row to `completed` or write an audit row).

**Exit.** `trigger/send-export-email.ts` is implemented: tenant-scoped `member`→`user` lookup for the recipient email, global `organization` read for the name, `ExportReadyEmail` render, `sendEmail` call returning `ok({ id })` or the suppressed `err('forbidden', …)` Result. The parent body gains its two closing side effects: a `sendExportEmail.triggerAndWait(...).unwrap()` child keyed by `[organizationId, 'export-email']`, then one `tenantDb(organizationId).transaction` updating the `exports` row to `completed` and writing the `export.invoices.completed` audit entry via `logAudit(tx, { …, actorUserId: null })`. The project is feature-complete after this lesson; only the wrap-up follows.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: clicking Export now ends with the export-ready email in the student's inbox, the inspector showing `completed`, and an audit row recording it. One short paragraph describing the working result — email arrives within ~10s with the right org name, row count, and download URL; the run panel flips to `completed` with the `downloadUrl` rendered; the audit-log tail gains one `export.invoices.completed` row — and the exactly-once guarantee across a parent retry. Reference the Lesson 1 finished-state figure rather than a new screenshot.

### Your mission

Prose paragraph (no subsection headers, no implementation hints). Frame the capability: close the run with two side effects that must each happen exactly once — the email send and the audit write. Weave in the constraints that shape the solution:

- The email is its own child task, not an inline `sendEmail` call, for durability (a Resend transient retries on the child's own policy) and idempotency (a per-step run-scoped key guards a parent retry from re-sending). Inlining loses both.
- The recipient email is read through a tenant-scoped `member`→`user` join so a non-member id can never reach a send; the org name comes from the global `organization` row.
- The recipient is `requestedBy` — whoever clicked Export. (Org-owner override named as a future variant, out of scope.)
- The audit write comes after the email: audit the outcome shipped, not the intent. `actorUserId: null` is the system actor — a task has no session, so null is information, not a missing value.
- A Resend suppression is an expected outcome, not a crash: the child returns the `err('forbidden', …)` Result rather than throwing; the parent records `emailSuppressed` in the audit payload and still treats the run as completed-but-skipped. (Throw-to-surface is the named alternative.)
- The `downloadUrl` is the one the parent already put on `metadata`, consumed not re-derived (becomes a real R2 link in Chapter 069).
- Structured logs carry `messageId`/`disposition` only — no recipient address, no PII (the Chapter 080 discipline).

Out of scope (one line): no failure-email path — a permanently-failed export logs but does not notify; Unit 13's dispatcher later owns channel choice and makes this direct child redundant.

Then the requirements checklist (the only list in the section), each item tagged `[tested]`/`[untested]`, phrased as a verifiable outcome, never as a file or export. Use the `Checklist`/`ChecklistItem` component with `tested`/`untested` chips.

1. A full export run ends at `status: completed`, the `downloadUrl` rendered, and one new `export.invoices.completed` row in the audit-log tail. `[tested]`
2. Forcing a parent retry after the email step sends no second email — the child returns the cached result and does not call Resend again. `[tested]`
3. When the recipient is on the suppression list, the run still completes, no email is sent, and the audit payload records `emailSuppressed: true`. `[tested]`
4. The `ExportReadyEmail` arrives in the student's Resend-verified inbox with the right `orgName`, `rowCount`, and download URL, within ~10s of completion. `[untested]` (live inbox; tests assert the child's Result and the audit payload, not real delivery)

### Coding time

One-line build prompt directing the student to implement `trigger/send-export-email.ts` and the parent's closing steps against the brief and the tests, reading the solution only after attempting. External resources (if any) appended after the `<details>`, no header. The writer wraps the whole reference walkthrough in `<details>` (collapsed by default).

Present the reference implementation in repo order — `send-export-email.ts` first, then the grown parent body. Both files exist verbatim in the solution; reproduce them, do not invent.

`trigger/send-export-email.ts` — the `sendExportEmail` schemaTask: strict-object `{ organizationId, recipientUserId, rowCount, downloadUrl }` payload (`z.string().min(1)` ids, `z.int()` rowCount, `z.string()` downloadUrl), `Promise<Result<{ id: string }>>` return. Body: `tenantDb(organizationId).query.member.findFirst({ where: eq(member.userId, recipientUserId), with: { user: true } })`, an `err('not_found', …)` early return if the recipient is no longer a member, the global `db.query.organization.findFirst` for the name, the `ExportReadyEmail({ orgName, rowCount, downloadUrl })` render passed as `react:`, `sendEmail({ to, subject, react, idempotencyKey })` with a stable per-recipient `idempotencyKey`, and the suppression branch returning the `err` Result rather than throwing. Use **`AnnotatedCode`** here — the file has several distinct decision points (the member-join guard, the suppression-returns-Result branch, the no-PII log fields) that each need student focus.

Grown parent body (`trigger/export-invoices.ts`) — show only the two appended closing steps as the focus, not the whole file again (the body was built in Lesson 3). The `sendExportEmail.triggerAndWait({ organizationId, recipientUserId: requestedBy, rowCount: total, downloadUrl }, { idempotencyKey: await idempotencyKeys.create([organizationId, 'export-email']) }).unwrap()` call and `const emailSuppressed = !emailResult.ok`, then the single `tenantDb(organizationId).transaction` that updates the `exports` row (`status: 'completed'`, `rowCount`, `completedAt`) `.where(eq(exports.runId, ctx.run.id))` and calls `logAudit(tx, { action: 'export.invoices.completed', subjectType: 'export', subjectId: ctx.run.id, organizationId, actorUserId: null, payload: { rowCount: total, emailSuppressed } })`, and the final `{ ok: true, runId: ctx.run.id, rowCount: total }` return. A plain **`Code`** block suffices for these closing steps.

Consider a **`CodeVariants`** before/after to contrast the wrong inline-`sendEmail`-in-the-parent shape (loses durability + per-step idempotency) against the right child-task shape — the brief calls this contrast out and it is the lesson's central decision.

Rationale to cover (one or two sentences each, every `[untested]` requirement included):

- Why the email is a child task: durability (child's own retry policy on a Resend transient) plus per-step idempotency (the run-scoped `[organizationId, 'export-email']` key). The inline version loses both.
- Audit-after-email — "audit the outcome, not the intent" — and the at-least-once semantics it buys.
- The one-transaction close: the audit INSERT needs the transaction-local `app.org_id` the `tenantDb` facade sets (RLS), and the two writes commit or roll back together. Link to Chapter 059 for `logAudit`/RLS rather than re-explaining; `logAudit`'s explicit-context overload takes `{ …, organizationId, actorUserId }` and `actorUserId: null` is the system actor.
- The recipient `member`→`user` join as the guard that a non-member id can never reach a send; org name from the global `organization` read.
- `recipientUserId = requestedBy` and the named-not-built org-owner override.
- The suppression path returning a Result rather than throwing, with the throw-to-surface alternative named, and how `emailSuppressed` flows into the audit payload.
- The `downloadUrl` flowing parent → child (parent owns it), forward-referencing the Chapter 069 presigned link. Link rather than re-explain.
- The no-PII structured-log discipline (`messageId`/`disposition` only) — link Chapter 080.
- The `sendEmail` adapter (Chapter 050) and `ExportReadyEmail` template are provided; link, do not re-explain. Note `sendEmail` itself reads the suppression list and returns the `err('forbidden', …)` Result the child forwards.

### Moment of truth

The test command and expected pass output, then the by-hand checklist for what the tests can't reach. Use **`Code`** for the command/output and `Checklist`/`ChecklistItem` for the manual checks.

- Command: `pnpm test:lesson 4`.
- Expected: all tests pass, reporting the run completes with the audit row written, the email is guarded once across a parent retry, and a suppressed recipient completes without sending.
- By-hand checks (tests can't reach): (1) run a full export against a seeded org — progress bar to completion, panel flips to `completed` with `downloadUrl`, audit tail gains one `export.invoices.completed` row, inbox receives the `ExportReadyEmail` within ~10s; (2) force a parent retry (dashboard "Replay run" or a debug throw after the email returns) — the `[organizationId, 'export-email']` key returns the cached `{ id }`, no second email lands; (3) insert the seeded recipient's email into `emailSuppressions` and run an export — `sendEmail` returns `{ ok: false, error: { code: 'forbidden', … } }`, the run still completes, the audit payload records `emailSuppressed: true`.

## Scope

- Real R2 presigned download URL — Chapter 069 (object-storage upload). This lesson emails the placeholder `https://example.com/exports/{runId}.csv`.
- Notification dispatcher / channel choice (email-or-inbox-or-both per user preference) — Unit 13 (Chapter 071). This lesson sends the email directly via the `sendExportEmail` child, which the dispatcher later makes redundant.
- Failure-email path (notifying on a permanently-failed export) — Unit 13's dispatcher. This lesson logs failures but does not notify.
- The `schemaTask`/`triggerAndWait`/`idempotencyKeys.create` primitives themselves — taught in Chapter 066 (lessons 4–6); applied here.
- The `metadata` progress channel, the page loop, and `AbortTaskRunError` — Lesson 3 of this chapter.
- `startExport`, the per-org queue, and the daily business idempotency key — Lesson 2 of this chapter.
- The `sendEmail` adapter and `ExportReadyEmail` template — Chapter 050; provided in the starter.
- `logAudit`, the `auditLogs` table, and RLS tenancy — Chapter 059; provided in the starter.
