# Chapter 082 — Lesson 4 outline

## Lesson title

**Full:** Finding 3: the missing audit-log write
**Sidebar:** Finding 3: missing audit log

The chapter-outline title fits — keep it. It names the finding (3) and the defect class (missing audit-log write) precisely.

## Lesson type

`Implementation`

Audit-finding implementation: the student documents a planted defect into `findings/003-audit-log-ownership-transfer.md`, then runs the lesson gate. The test-coder fills `tests/lessons/Lesson 4.test.ts` (currently `describe.todo`).

## Lesson framing

The student installs the senior reflex that catches the defect no error surfaces and no test breaks: holding the canonical six-category audit-log event set against every transactional mutation in the codebase and treating an audit row as a project-level invariant, not a per-feature decision. They walk away having documented the silent billing-side ownership transfer — a tenancy-changing mutation that commits with no `logAudit` row — as `findings/003-audit-log-ownership-transfer.md`, framing the consequence in compliance and customer-facing terms and naming the in-transaction fix with the exact event slug and redacted payload.

## Codebase state

**Entry.** The audit target runs locally (set up in lesson 1); the student has already produced `findings/001-fail-closed.md` (lesson 2, the reference finding that set the audit method) and `findings/002-xss-html-sink.md` (lesson 3). `findings/003-audit-log-ownership-transfer.md` holds only the 4-section skeleton with its `TODO(L4)` comment. The seeded defect is live: `src/lib/billing/transfer-ownership.ts` (`transferBillingOwnership`) updates `organization.ownerId` plus both `member.role` rows inside a `db.transaction` and imports no audit writer. The healthy contrast — `src/lib/invitations/manage.ts` co-transacting `member.role-changed` — ships alongside it. `pnpm verify` passes with the defect live.

**Exit.** `findings/003-audit-log-ownership-transfer.md` has all four template sections populated (Rule / Location / Consequence / Fix) and names the audit-log rule, the grep commands that surfaced it, the compliance + Activity-page consequence, and the in-transaction `org.ownership-transferred` fix with redacted payload. The audit target is unchanged — the seeded defect is still present (the audit is read-only; documenting, not patching). `pnpm test:lesson 4` passes.

## Lesson sections

Render the Implementation section list: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in the audit's terms: document the silent ownership transfer — the billing-side mutation that re-points the org owner with no audit-log row — as `findings/003-audit-log-ownership-transfer.md`. Then one short paragraph on what "working" looks like: a finding file whose four sections name the rule, the grep evidence, the compliance consequence, and the in-transaction fix, with the seeded defect left untouched. No screenshot — this finding has no running-app fingerprint (the defect is invisible at runtime; that invisibility is the point and belongs in the prose). Optionally a `FileTree` fragment showing `findings/003-audit-log-ownership-transfer.md` as the single edited file beside the read-only `src/lib/billing/transfer-ownership.ts`.

### Your mission

Coherent prose paragraph (no subsection headers, no implementation hints), then the requirements checklist.

Prose weaves: This is the finding that hides best — nothing errors, nothing renders wrong, no behavior breaks at runtime, so the only discipline that surfaces it is reading the canonical six-category event set (auth, membership, billing, data-export, deletion, ownership/tenancy) against every mutation in `src/lib/`. Category here is **audit-log gaps** (lesson 3 of chapter 081). The audit step is grep-driven, reusing the method from finding 1: grep `db.transaction` across `src/lib` to enumerate transactional mutations, then for each security-relevant one check for a `logAudit(tx, …)` call inside the same transaction; the seeded gap imports no audit writer at all — the absence is the defect. Senior reflex to internalize: pattern-match "this mutation touches a security-relevant field — does it write an audit row?" and treat the event set as a project-level invariant. The finding sits at the seam between two categories — primary in audit-log gaps, and it touches the user-vs-operator message split (lesson 2 of chapter 080) because the *operator record* is what's missing — but it's written once, here, not split across two findings. Out of scope: patching the target (the fix is a paragraph, not a diff). Constraint: the consequence belongs in compliance and customer-facing terms (an auditor blind to ownership history; the Activity page silent on the most security-relevant event a tenant can experience), never as a developer "we forgot to log this" note.

Requirements checklist — render with `Checklist` / `ChecklistItem`, each tagged `[tested]` or `[untested]`. The test asserts the observable shape of the finding file and a source-shape probe that the defect is still present; the rest are hand-confirmed:

1. `[tested]` `findings/003-audit-log-ownership-transfer.md` has all four template sections (Rule, Location, Consequence, Fix) populated.
2. `[tested]` The finding names the rule as the audit-log canonical event set with transaction discipline (lesson 3 of chapter 081).
3. `[tested]` The Location section names a grep command and the file `src/lib/billing/transfer-ownership.ts`.
4. `[tested]` The Fix names the senior reach — an in-transaction `logAudit` write with the `org.ownership-transferred` event.
5. `[tested]` (source-shape probe) The seeded defect is still present: `transferBillingOwnership` still has no audit write (target read-only, proving documentation not patching).
6. `[untested]` The finding is reached by walking the six-category event set against the mutation, and records that changing the org owner belongs to the ownership/tenancy category that mandates a row.
7. `[untested]` The Location records the grep commands and their hit counts, including the legitimate transactional site (`src/lib/webhooks/stripe.ts`) the grep also returns and why it is not a finding.
8. `[untested]` The Consequence reads in compliance and customer-facing terms — the ownership-transfer history is unrecoverable for an auditor and the Activity page (`recentAuditLogs`) is silent on it — with no "could potentially" hedging.
9. `[untested]` The Fix names the exact event slug (`org.ownership-transferred`, single-dot `entity.verb-pasttense`), the in-transaction write riding `tx` not the global `db`, and the redacted payload `{ previousOwnerId, nextOwnerId }`.
10. `[untested]` A severity is assigned and justified in two lines.

Use the `Checklist`/`ChecklistItem` component with the `tested`/`untested` chip; ticks persist per page.

### Coding time

One line directing the student to write the finding against the template and the brief before reading the worked solution. Then the solution, which the writer wraps in `<details>` (collapsed by default).

The hidden solution reproduces `findings/003-audit-log-ownership-transfer.md` as it lands in the repo — Rule, Location, Consequence, Fix, with severity `high` justified in two lines (the transfer itself is correct; the loss is the record, not the gate — finding 1 owns the access bypass). Organize it as the finding file appears.

Render the finding body as Markdown prose blocks. For the **Location** evidence, show the two greps as a `Code` block (shell): `rg -n "db.transaction" src/lib --glob '*.ts'` (returns two sites — `src/lib/webhooks/stripe.ts`, legitimate, co-transacts `billing.subscription.*` rows on every branch, and `src/lib/billing/transfer-ownership.ts`) and `rg -n "\.update\(" src/lib/billing/transfer-ownership.ts` (three `.update(` calls — `organization.ownerId` plus the two `member.role` rewrites, all in-transaction). Note `rg "logAudit" src/lib/billing/transfer-ownership.ts` returns nothing — the absence confirmed.

For the **Fix** snippet, use `AnnotatedCode` on the in-transaction `logAudit` write to direct focus to the load-bearing parts: (a) the write rides `tx`, not the global `db`, so it commits/rolls back atomically — `logAudit`'s signature takes the Transaction as its first argument precisely so an off-transaction write fails to typecheck; (b) the slug `org.ownership-transferred` is the canonical single-dot `entity.verb-pasttense` form and matches the slug the admin-side `src/lib/admin/transfer-ownership.ts` already uses, so both transfer paths land one event name; (c) the payload is redacted to `{ previousOwnerId, nextOwnerId }` — two ids, no emails/roles/PII. Model the write on the healthy `member.role-changed` write shipping in `src/lib/invitations/manage.ts` (which co-transacts the audit row on the *lesser* mutation of demoting a non-owner) — consider a `CodeVariants` pair: tab 1 the seeded silent transaction, tab 2 the healthy `manage.ts` transaction with its `logAudit` call, making the gap visible side by side.

Decision rationale to cover (one or two sentences each): why the event set is a project-level invariant rather than a per-feature call; why severity is `high` not `critical`; why this is written once here and not split with a message-split finding. Coverage of the `[untested]` requirements — the category cross-walk reasoning (req 6), the legitimate-hit explanation (req 7), the compliance/Activity-page consequence framing (req 8), the exact slug + tx + redacted payload (req 9), the severity justification (req 10).

For topics owned by regular lessons, **link, do not re-explain**: the canonical event set + transaction discipline + the `entity.verb-pasttense` naming (lesson 3 of chapter 081); the `logAudit(tx, event)` seam and the Transaction-first signature (lesson 5 of chapter 057); the user-vs-operator message split this finding's "missing operator record" touches (lesson 2 of chapter 080). The audit method (grep-then-read, document the commands and hit counts) was set in lesson 2 — reference it, don't reteach.

No external resources needed; the resourcer appends any after the `<details>` with no header.

### Moment of truth

The test command and expected pass output, then the hand-confirm checklist.

Command: `pnpm test:lesson 4`. Show the expected pass output as a `Code` block — a green Vitest summary (the gate asserts the four sections are populated, the audit-log rule is named, the Location names a command/file, the Fix names the in-transaction `logAudit` senior reach, and a source-shape probe that the seeded defect is still present). State plainly: a passing gate proves the student *documented* the defect, since the target is read-only — patching `transferBillingOwnership` would fail the source-shape probe.

Then the by-hand checklist (the `[untested]` items the test can't judge), rendered with `Checklist`/`ChecklistItem`: the Location names the grep commands and hit counts including the legitimate `webhooks/stripe.ts` site and why it's excluded; the Consequence is framed for an auditor and the Activity page, not as a developer note; the Fix names the exact slug, the in-transaction write, and the redacted payload schema; the severity justification holds when read aloud.

## Scope

This lesson documents the audit-log gap only; it does not patch the target (fixing all findings is the next sprint's work, out of scope for the whole audit) and does not re-teach the audit-log table design, RLS, or the canonical event set (lesson 3 of chapter 081) or the `logAudit` seam (lesson 5 of chapter 057). It does not cover the user-vs-operator message split as its own finding (lesson 2 of chapter 080 owns that rule; here it is only the angle on the missing operator record). The fail-closed access bypass on the *admin*-side transfer is finding 1 (lesson 2), not this finding. The commit-and-self-grade step where this finding is scored clause-by-clause against the answer key is lesson 10.
