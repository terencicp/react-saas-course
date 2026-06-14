# Chapter 082 — Lesson 9 outline

## Lesson title

- Full: **Finding 8: the GDPR deletion gap**
- Sidebar: **Finding 8: GDPR deletion**

The chapter-outline title fits the established finding-lesson naming pattern (lessons 2-8 all read "Finding N: …"). Keep it.

## Lesson type

`Implementation`

The deliverable is one audit finding (`findings/008-gdpr-deletion.md`) written against a brief and a test gate, matching the contract's "an audit finding" capability. The test-coder fills `tests/lessons/Lesson 9.test.ts` (currently `describe.todo`). The "code" the student produces is the Markdown finding, not app code — the audit target is read-only.

## Lesson framing

The student installs the senior reflex that a granted erasure request is an async job that walks the *entire* retention catalog — every PII-holding table plus every external service the data reached — and that the audit trail is anonymized, never hard-deleted. They walk the seeded one-row `deleteAccount` against the healthy `deleteUser` reference, name the Article 17 exposure in legal terms, and ship `findings/008-gdpr-deletion.md` as the final in-scope finding of the eight-category audit. The payoff is recognising the deletion gap inexperienced devs almost always answer partially (they name `member`, they miss Stripe/Resend/PostHog/R2 and the anonymize tension).

## Codebase state

**Entry.** Findings 001-007 are written (lessons 2-8). `findings/008-gdpr-deletion.md` is still the start skeleton: heading, `**Category:**`/`**Severity:**` placeholder lines, the `<!-- TODO(L9) … -->` prompt, and four empty `## Rule` / `## Location` / `## Consequence` / `## Fix` headers. The audit target is unchanged and boots green under `pnpm verify`. The seeded defect is live: `src/lib/account/delete-account.ts`'s `deleteAccount(userId)` is a single `db.delete(users).where(eq(users.id, userId))` (lines 21-25). The healthy reference `trigger/delete-user.ts` (`deleteUser` schemaTask) already ships in the repo.

**Exit.** `findings/008-gdpr-deletion.md` has all four template sections populated, names the GDPR-deletion rule (chapter 081 lesson 4) linked by section ID, enumerates every missed table and external, names the async-job + anonymize fix citing `trigger/delete-user.ts`, and carries a justified severity. The audit target is byte-for-byte unchanged (the defect is still present). `out-of-scope.md` and `SUMMARY.md` remain for lesson 10. `pnpm test:lesson 9` passes.

## Lesson sections

Follow the Implementation section list: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in the audit's terms: document the incomplete account deletion in `src/lib/account/delete-account.ts` as `findings/008-gdpr-deletion.md`, the eighth and final in-scope finding. Then one paragraph (or a small `Screenshot`/`Code` of the finished finding's section headers) describing the finished artifact: a four-section finding that names the rule, locates the one-row delete, frames the consequence as an Article 17 breach, and names the async-deletion-job fix. Note this finding closes the eight-category floor — lesson 10 commits and self-grades.

### Your mission

Prose paragraph, then the requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints.

Prose weaves:
- **Feature** (audit terms): surface and document the GDPR deletion gap — the deletion that leaves PII behind after a "successful" erasure request.
- **The audit method for this finding** (reused rhythm from lesson 2): open `src/lib/account/delete-account.ts`, read it against the chapter-081-lesson-4 retention catalog, then grep every table and external service that holds the deleted user's data and confirm the handler touches none of them. The healthy `trigger/delete-user.ts` is the map of what *should* run.
- **The trap this finding is tuned to expose** (carries the brief's intent): the partial answer. Inexperienced devs name `member` and stop; the discipline is to name *every* external the PII could have leaked to (Stripe, Resend, PostHog, R2), not just the obvious tables.
- **The second senior point**: audit-log rows are *anonymized*, never hard-deleted — deletion and the immutable audit trail are in tension, and anonymization is how both survive.
- **Consequence framing**: legal, not code-quality. PII persists past a granted request (Article 17 exposure) and the confirmation email the user received is a lie.
- **Constraint**: the target is read-only — the fix is a paragraph, not a diff; the student documents the defect, never patches it.
- **Out of scope**: patching `delete-account.ts`; the bonus consent/`safeLimit` findings (lesson 10); committing and self-grading (lesson 10).

Requirements checklist (each one verifiable outcome, phrased as the outcome not a file/export):
1. `[tested]` `findings/008-gdpr-deletion.md` has all four template sections (Rule, Location, Consequence, Fix) populated.
2. `[tested]` The finding names the GDPR-deletion rule (the async deletion job + three deletion shapes, audit logs anonymized not hard-deleted — chapter 081 lesson 4), linked by section ID.
3. `[tested]` The Location names the one-row delete in `src/lib/account/delete-account.ts` with a line range and the grep/read command(s) that surfaced it.
4. `[untested]` The finding enumerates every PII seam the deletion misses — the data-graph tables (`member`, `invitation`, `invoice_notes`, `exports`, Better-Auth `session`/`account`, `audit_logs`) *and* the external services (Stripe, Resend, PostHog, R2) — against the retention catalog.
5. `[untested]` The Consequence reads in legal terms — PII persists past a successful request, Article 17 exposure, the confirmation email is false — with no "could potentially" hedging.
6. `[untested]` The Fix names the senior reach: route through the async `deleteUser` Trigger.dev job (`trigger/delete-user.ts`), mark the account `deletion_in_progress` to block sign-in mid-deletion, anonymize the `audit_logs` actor columns, fire the Stripe/Resend/PostHog/R2 deletes, then remove the `users` row last.
7. `[untested]` A severity is assigned and justified in two lines.
8. `[tested]` The audit target still runs unchanged — the seeded one-row delete is still present (source-shape probe proves the student documented, not patched).

Note for writer: the test gate (next agent) asserts the observable finding shape (items 1-3) plus the read-only probe (item 8); the `[untested]` items 4-7 are confirmed by hand in *Moment of truth* and shown in full in *Coding time*.

### Coding time

One line directing the student to write the finding against the template and brief first, then read the solution. Solution hidden in `<details>` (writer wraps it).

Solution contents:
- Reproduce the completed `findings/008-gdpr-deletion.md` as it lands in `solution/findings/008-gdpr-deletion.md` — use `Code` (markdown) for the finding body so the four sections read as the artifact the student is matching against.
- Walk the seeded handler beside the missed graph: use `CodeVariants` or `TabbedContent` to put `delete-account.ts`'s one-statement body (the defect) next to the healthy `trigger/delete-user.ts` job (the reference), so the gap is visible side-by-side. The `deleteUser` job is the single best teaching artifact here — it walks `invitation`/`invoiceNotes`/`exports`/`member`, anonymizes `auditLogs` actor columns, names the four external deletes as comments, then deletes `users` last inside one `db.transaction`.
- Cover the `[untested]` requirements: the full data-graph enumeration (item 4) — model the grep that surfaces every `references(() => user.id)` against `src/db/schema.ts`/`schema/auth.ts`/`audit.ts`, listing each table and why it holds PII; the legal consequence framing (item 5); the structural fix naming the job, the `deletion_in_progress` sign-in block, the anonymize step, the external deletes, and the user-row-last ordering (item 6); the severity justification (item 7, critical).
- One or two sentences of rationale for the non-obvious choices: (a) why anonymize rather than delete the audit trail — the append-only record must survive for compliance, so only the actor is scrubbed; (b) why delete the `users` row *last* — a partial failure leaves a recoverable, still-anonymizing state rather than orphaned children.
- Callout the easy-to-miss bit: the deletion is *not* the same as a foreign-key cascade — order and anonymization still have to be deliberate even where `member` cascades on `user.id`.
- **Link, don't re-explain**: the retention catalog and the three deletion shapes (chapter 081 lesson 4); `logAudit` as `ExplicitAuditEvent` with `actorUserId: null` for the system-actor completion write (chapter 057 lesson 5). Do not re-teach Trigger.dev (unit 12) or RLS.
- The illustrative fix snippet (the `auditLogs` anonymize `tx.update`) is the only inline code the *finding* itself carries, per the template's "short illustrative snippet allowed when the fix is structural."

No diagram needed — the side-by-side defect/reference code and the table enumeration carry the flow; prose plus `CodeVariants` is sufficient.

### Moment of truth

- Test command: `pnpm test:lesson 9`. State the expected pass output (the Lesson 9 gate suite green; one line per asserted behavior).
- By-hand checklist (`Checklist`) for what the test can't judge — the `[untested]` items:
  - The Location names the grep/read commands, not just the file.
  - The enumeration lists *every* missed table and external, not just `member` (the partial-answer trap).
  - The Fix names audit-log anonymization rather than deletion.
  - The Consequence is framed in Article 17 / legal terms, not as a developer note.
  - Severity is justified in two lines.

## Scope

This lesson does not:
- Patch `delete-account.ts` or wire `deleteUser` — the audit is read-only; fixing findings is the next sprint's work (out of scope for the whole chapter).
- Teach Trigger.dev job authoring → unit 12 (chapters 066-069); the `deleteUser` job is read as a reference, not built.
- Teach the retention catalog / three deletion shapes from first principles → chapter 081 lesson 4 (owning lesson); link only.
- Cover the consent-gate (bonus finding 9) or `safeLimit`-bypass (bonus finding 10) findings, the commit, or the self-grade → lesson 10.
- Cover the seven prior findings → lessons 2-8.
