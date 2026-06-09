# Chapter 062 — Lesson 4 outline

## Lesson title

**Archive, restore, and delete** (chapter-outline title fits — keep it).
Sidebar: **Archive, restore, delete**

## Lesson type

`Implementation`

## Lesson framing

The student installs the lifecycle-write discipline that every production list view needs: three Server Actions (`archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`) that move a row between active / archived / deleted states, each guarded by an `id`+`version` precondition, each role-gated at the action boundary, and each writing its audit entry in the *same atomic step* as the store mutation — never a silent clobber, never a mutation without an audit trail. They also take the senior reach of layering `useOptimistic` on archive so the row leaves the table the instant it's clicked and reappears (by expiry, not a throw-rollback) if the action returns `{ ok: false }`. The payoff is the senior reflex that a destructive write is a precondition-checked, audited transition, not a bare field set.

## Codebase state

### Entry

Lessons 2 and 3 are done. The URL is the source of truth for filter / sort / search / cursor / view (lesson 2), and the scoped helper's `active()` / `archived()` / `includingDeleted()` views are honest with `listInvoices` / `getInvoiceDetail` routed on `view` and RBAC-gated at the read (lesson 3). `table.tsx` already renders the lifecycle badges (`Deleted` / `Archived`) and the "Archived on …" line. The three lifecycle actions in `src/lib/invoices/actions.ts` are still `err('internal', 'Not implemented')` stubs (`TODO(L4)` ×3); the row-action menu in `table.tsx` has only an `Edit` link, no archive/restore/delete wiring (`TODO(L4)`). `updateInvoice` still applies edits unconditionally (the lesson-5 bug). The seed already ships the colliding pair (`inv-0001` live + `inv-deleted-1` soft-deleted, both `ACME-1001`) and the pre-archived row (`inv-archived-1`).

### Exit

`archiveInvoice`, `restoreInvoice`, `softDeleteInvoice` are implemented: each loads the row via `findInvoice(ctx.orgId, id)`, checks its `version` + lifecycle precondition, mutates the store, calls `pushAudit(...)`, and `revalidatePath('/invoices')` in one atomic step. `archiveInvoice`/`restoreInvoice` accept `member`, `softDeleteInvoice` is `authedAction('admin', …)`. The `table.tsx` row menu wires all three via `DropdownMenuItem` `onSelect` dispatchers (one `useActionState` per action, lifted to the table), gates each item on row state + role, layers `useOptimistic` on archive inside a shared `useTransition`, and fires a `sonner` toast per resolved Result. `pnpm test:lesson 4` passes. `updateInvoice`'s version precondition is still absent (lesson 5).

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: archive a row, restore it, and (as admin) soft-delete it — each move recorded in the audit trail. Then a one-paragraph description of the feature working: archiving a row from Active makes it vanish instantly and reappear under Archived with an "Archived on …" label and a Restore button; Restore returns it to Active; an admin's soft-delete drops the row from the default list and surfaces it under All with a "Deleted" badge; the inspector's row-counts banner and audit tail move together after every action. Use a `Screenshot` (or one-paragraph description if no asset) of the Active table with the row-action menu open showing Archive / Delete.

### Your mission (header: "Your mission")

Prose paragraph (no implementation hints) framing the capability in the project's terms: with reads routed on lifecycle state (lesson 3), this lesson adds the writes that move rows between those states. Weave in the senior decisions:
- Each action is `authedAction`-wrapped so role enforcement and Zod parsing happen at the boundary; archive/restore are open to `member`, soft-delete is gated to `admin` *at the action* (hiding the menu item is cosmetic on top of that).
- Tenancy is never hand-typed — the org comes from the session `ctx`, so a row loaded via `findInvoice(ctx.orgId, id)` from another org is simply not found.
- Each action checks an `id`+`version` precondition (a stale tab returns an honest conflict, not a silent clobber) and writes its audit entry in the *same atomic step* as the mutation — in real Postgres this is one `db.transaction`.
- **Constraint:** the optimistic archive uses `useOptimistic` whose value *expires* when the transition ends (it is never committed) — on `{ ok: false }` the unchanged revalidated rows bring the row back; this is expiry, not a throw-triggered rollback (link chapter 061 lesson 3).
- The seeded colliding pair (`ACME-1001` live + soft-deleted) demonstrates the number-reuse the partial unique index `(orgId, number) WHERE deleted_at IS NULL` enables; the inspector's index panel describes the constraint.
- **Out of scope:** the rich conflict banner for the edit path (lesson 5); lifecycle actions surface a toast, not a banner.

Then the requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips), each phrased as a verifiable outcome:

1. Archiving a row from the Active tab removes it from the default list and surfaces it under Archived with an "Archived on …" label, a Restore button, and an audit-tail entry. `[tested]`
2. Restoring from the Archived tab returns the row to Active and writes an audit entry. `[tested]`
3. As admin, soft-deleting a row removes it from the default list and surfaces it under All with a "Deleted" badge plus an audit entry; restoring the deleted row returns it to active. `[tested]`
4. A member cannot soft-delete: the action refuses an admin-only call (and the Delete control is absent in the member UI). `[tested]`
5. A lifecycle action against a stale `version` (or a row already in the target state) returns a conflict instead of a silent state change. `[tested]`
6. Each lifecycle action writes its audit entry in the same atomic step as the store mutation, so the inspector's row counts and audit tail move together after every action. `[tested]`
7. Archiving removes the row from the table optimistically (instant) and the row reappears if the action returns `{ ok: false }`. `[untested]` (UI-timing; covered in the reference solution + by-hand check)
8. The seeded colliding pair (a live and a soft-deleted invoice sharing `ACME-1001`) confirms the number-reuse the partial unique index permits. `[untested]` (seed-data observation, no action under test)

Note for the test-coder: tests assert against observable Result/store outcomes of the three actions — archive sets `archivedAt` + bumps `version` + pushes one audit row; restore clears both flags; soft-delete sets `deletedAt`; the admin gate on `softDeleteInvoice` refuses a member ctx; a stale `version` returns a `conflict` Result. Do not assert file paths, function internals, or React timing.

### Coding time (header: "Coding time"; writer wraps the solution in `<details>`)

One line directing the student to implement the three actions and the row-menu wiring against the brief and the tests before opening the solution.

Reference implementation, organized as it appears in the repo:

**`src/lib/invoices/actions.ts`** — the three `archive` / `restore` / `softDelete` functions plus their `authedAction` exports. Present with `AnnotatedCode` so focus lands on the four load-bearing parts in turn: (1) `findInvoice(ctx.orgId, input.id)` → `err('not_found', …)` if missing (tenancy comes from ctx); (2) the precondition guard returning `conflict(CONFLICT_MESSAGE, row)`; (3) the field mutation + `version += 1`; (4) `pushAudit(...)` + `revalidatePath('/invoices')` + `ok(row)` in the same step.
- The shared `lifecycle = z.strictObject({ id, version: z.coerce.number().int() })` schema; `z.coerce` because FormData is strings (link chapter 042).
- `archive` precondition: refuse if `version` mismatches **or** `archivedAt !== null` **or** `deletedAt !== null` (only an active row archives).
- `restore` precondition: refuse if `version` mismatches **or** the row is already live (`archivedAt === null && deletedAt === null`); on success clear **both** flags — one action branches on the row's state rather than splitting into two, so the admin "Restore deleted" path reuses it.
- `softDelete` precondition: refuse on `version` mismatch **or** already-deleted; set `deletedAt`. Admin-gating is on the `authedAction('admin', …)` wrapper, not an in-body role check.
- The audit `action` strings: `'invoice.archive'` / `'invoice.restore'` / `'invoice.delete'`.
Decision rationale (one–two sentences each): why the audit write shares the action's atomic step (audit is atomic with the lifecycle change); why the precondition is checked before the mutation (optimistic-concurrency guard, link chapter 061 lesson 3); why the org filter is `ctx.orgId` not a request field (tenant isolation at the write).

**`src/app/(app)/invoices/table.tsx`** — the row-action wiring. Present with `AnnotatedCode` focusing on: (1) one `useActionState` per lifecycle action, lifted to the *table* so the Result/toast survives the optimistic removal of the row that triggered it; (2) `useOptimistic(rows, (current, removedId) => current.filter(r => r.id !== removedId))`; (3) the explicit `useTransition` wrapping `archiveOptimistic(row.id)` + `archiveDispatch(...)` together — an optimistic update outside a transition is rejected; (4) `useResultToast` firing a `sonner` toast per resolved Result (success line on `ok`, conflict line on `conflict`, `userMessage` otherwise); (5) the `lifecycleFormData(row)` helper building `id`+`version` FormData; (6) the menu-item gating (`Archive` when `isActive`, `Restore` when `archivedAt && !deletedAt`, `Restore deleted` → `restoreDispatch` when `deletedAt && admin`, `Delete` when `isActive && admin`).
Callout on the non-obvious bit (untested, needs explaining): each `DropdownMenuItem`'s `onSelect` calls the dispatcher **directly** rather than submitting a form — the Radix menu unmounts its portaled items the instant one is selected, so a `<button type="submit" form=…>` never fires its native submit; the dispatch is the same one the form would have triggered, minus the doomed submit. This is the trap an inexperienced dev hits and silently ships a dead button.

Code-sample component choices:
- `AnnotatedCode` for both `actions.ts` and `table.tsx` (multi-part focus).
- `Code` for any short isolated snippet (e.g. the `lifecycle` schema or the `useResultToast` shape) if pulled out separately.
- No diagram needed — the flow is a single action round-trip already carried by prose; do not add one.
- For `authedAction`, `Result`/`conflict`, `pushAudit`, `useOptimistic` — link the owning lessons (chapter 059 / chapter 057, chapter 061 lesson 3), don't re-explain.

### Moment of truth (header: "Moment of truth")

Test command: `pnpm test:lesson 4`. State the expected pass output (a green Vitest run, all assertions passing, the lesson-4 suite reporting pass). Then a by-hand `Checklist` mirroring the brief's untested + UI-timing items, ticked as confirmed via the inspector identity switcher and `/inspector` row-counts + audit tail:
- Archive a row from Active → it vanishes instantly (optimistic), reappears under Archived with the date + Restore button; audit tail shows the event.
- Click Restore from Archived → row returns to Active; audit tail shows it.
- As admin, soft-delete a row → it drops from default and appears under All with a "Deleted" badge; as `org-acme:member`, confirm the Delete control is absent.
- Inspect the seeded colliding pair under All (live + soft-deleted `ACME-1001`); read the inspector's index panel for why the partial unique index permits the reuse.
- Watch the inspector's row-counts banner and audit tail move together after each action (audit rides with the mutation).

## Scope

This lesson does not cover: the URL-state layer (lesson 2), the scoped-read views and view routing/RBAC-at-read (lesson 3), and the rich edit-conflict banner with "Use latest" / "Overwrite anyway" — that is lesson 5 ("Two tabs, one winner"), which adds the `version` precondition to `updateInvoice`. Lifecycle actions here surface a conflict only as a toast, not the banner. Forward references (mention only, do not build): Unit 13 wires a notification on archive/restore, Unit 14 adds tag-driven cache invalidation, chapter 081 lesson 3 hardens the audit discipline.
