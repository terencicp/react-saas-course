# Chapter 062 — Lesson 5 outline

## Lesson title

**Two tabs, one winner** — the chapter-outline title fits: it names the concrete failure (a two-tab race) and the resolution (one submit wins, the other gets an honest conflict) in the student's own terms. Keep it.

Sidebar title: **Two tabs, one winner**

## Lesson type

`Implementation`

(Final lesson of the chapter. The test-coder runs for this lesson — `lesson-verification/Lesson 5.ts`. The writer renders the Implementation section list.)

## Lesson framing

The student installs the optimistic-concurrency layer that turns silent last-write-wins into a visible, recoverable conflict: every write now checks tenancy + lifecycle + `version`, and a stale `version` returns an honest 409 carrying the server's current row as `current` — so a losing tab recovers in one round trip, no refetch. The senior payoff is the discipline of naming all three precondition classes (missing tenancy = cross-tenant overwrite, missing lifecycle = editing a soft-deleted row, missing version = silent clobber), checking the precondition *atomically* against the freshly loaded row rather than across two requests (no TOCTOU), and re-gating the admin-only "Overwrite anyway" escape hatch at the action rather than trusting the hidden UI control. This lesson closes the chapter's acceptance bar — every Project-goals behavior now holds.

## Codebase state

### Entry

Lessons 2–4 are complete. URL state drives filter/sort/search/cursor/view (L2); `scopedInvoices(orgId)`'s three views are honest and `listInvoices`/`getInvoiceDetail` route on `view` with the RBAC read-gate (L3); the three lifecycle actions (`archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`) are implemented with audit writes and version preconditions, wired into the row menu with optimistic archive (L4). The one remaining bug: `updateInvoice` in `src/lib/invoices/actions.ts` is still the chapter-047 baseline — it applies edits *unconditionally*. The hidden `version` field round-trips in `edit-form.tsx` but the action ignores it, so two tabs editing the same invoice silently overwrite each other. `conflict-banner.tsx` returns `null` (TODO L5). `edit-form.tsx` already ships the keyed field block (`key={`${seed.id}:${seed.version}`}`), the hidden `version` input, the `useActionState` wiring, the `$ACTION_*`-leak workaround (`onSubmit` thin wrapper), and updates `seed` on `ok` — but has no `conflictRow` state, no `formRef`, and no `ConflictBanner` render.

### Exit

`updateInvoice` checks the `version` precondition atomically against the freshly loaded row and returns `conflict(CONFLICT_MESSAGE, row)` on mismatch; `updateInvoiceSchema` gains an `overwrite` field, admin-gated inside the action. `edit-form.tsx` renders `<ConflictBanner>` from `error.current` on the conflict branch, with `onUseLatest` (swap `seed` to the server row, keyed remount resets the hidden version) and `onOverwrite` (rebuild FormData from `formRef`, set `overwrite=true`, dispatch). `conflict-banner.tsx` shows the server's current customer/status/total with a "Use latest" button always and "Overwrite anyway" only when `canOverwrite`. The chapter's full acceptance bar holds; `pnpm test:lesson 5` passes.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: add the `version` precondition to `updateInvoice` so a two-tab edit returns an honest conflict, and render a banner that lets the user refresh-and-retry without a second fetch. Then a one-paragraph (or screenshot) description of the feature working: editing the same invoice in two tabs lets the first save win; the second submit renders a conflict banner showing the current server values, a "Use latest" button, and an admin-only "Overwrite anyway" button; clicking "Use latest" reloads the form so the resubmit succeeds. If a screenshot is used, show the edit form with the destructive-bordered ConflictBanner below the Save button (customer/status/total dl + the two buttons). Otherwise prose suffices.

### Your mission (`## Your mission`)

Prose paragraph(s) in the project's terms, then the requirements checklist. **No implementation hints, no subsection headers.**

Weave into the prose:
- **Feature** (user terms): two tabs can no longer silently clobber each other; the losing submit gets a recoverable conflict surface.
- **The three precondition classes** (the senior decision this lesson installs): every write checks tenancy + lifecycle + `version`; name what each missing one breaks. Tenancy is already enforced (the row loads via `findInvoice(ctx.orgId, id)`, so another org's row is simply not found); lifecycle is the `deletedAt !== null` guard; this lesson adds the `version` check.
- **Constraint — atomic precondition**: the check runs against the freshly loaded row in the same request, never a `SELECT` in one request and an `UPDATE` in a later one (TOCTOU). A mismatch is the honest conflict.
- **Constraint — one round trip**: the conflict Result carries the row the server holds now as `current`, sparing the client a refetch (the senior anchor from chapter 061 lesson 3); the banner is rebuilt from it.
- **Constraint — re-gate overwrite server-side**: "Overwrite anyway" is a sharp edge shown to admins and hidden for members, but the gate is re-checked inside the action (`roleAtLeast(ctx.role, 'admin')`) — a forged `overwrite=true` from a member is refused; tampering with the hidden `version` just yields another conflict, with the server-side Zod parse as the front line.
- Name `updatedAt`-as-version as the existing-tables alternative, but the course default is the dedicated `version` field for cheap, unambiguous precision (one or two sentences).
- **Out of scope**: lifecycle actions already return conflicts (L4); they surface a *toast*, not the full banner — the banner is the edit path's affordance only.

**Functional requirements** (numbered, each tagged; tests assert `[tested]` ones, the rest live only in the reference solution):

1. `[tested]` Editing the same invoice in two tabs lets the first submit succeed; the second submit returns a conflict (does not mutate the row) and the form renders the conflict banner showing the current server values.
2. `[tested]` "Use latest" pulls `current` into the form (the keyed remount resets the hidden `version` to `current.version`) so the resubmit succeeds.
3. `[tested]` "Overwrite anyway" resends the user's edits with `overwrite=true`, bypassing the version precondition and applying the edit; it is refused for a non-admin even if the flag is forged.
4. `[tested]` A forged submit carrying another org's invoice ID is not found in the acting org and takes the not-found path — tenant isolation holds at the write.
5. `[untested]` "Overwrite anyway" renders only for admins (cosmetic half of the gate; the action gate in #3 is the real one).
6. `[untested]` A lifecycle action (archive/restore/soft-delete) hitting a stale `version` surfaces a conflict toast ("This invoice changed elsewhere — refresh to retry") rather than the full banner.
7. `[untested]` Forcing version drift via the inspector then archiving the same row shows the optimistic removal briefly before the row reappears (the optimistic value expires when the transition ends on a returned `{ ok: false }` — not a throw-triggered rollback) and a conflict toast fires.

Render as a `Checklist` of `ChecklistItem`s with `tested`/`untested` chips.

### Coding time (`## Coding time`)

One line directing the student to add the precondition, the conflict branch, and the conflict banner against the brief and the tests, attempting it before opening the solution. Then the full reference solution hidden in `<details>` (the writer wraps it).

Solution organized as it appears in the repo:

**1. `src/lib/invoices/actions.ts` — `updateInvoice` + schema.** The delta from the chapter-047 baseline. Use **`CodeVariants`** (before = the L4-entry unconditional baseline, after = the version-preconditioned solution) to make the inserted precondition the focus. Cover:
- Schema gains `overwrite: z.coerce.boolean().default(false)`; `version: z.coerce.number().int()` was already present. Note the `z.coerce` at the FormData string boundary (link chapter 042 / chapter 043 lesson 4 rather than re-explaining).
- The `not_found` guard (`!row || row.deletedAt !== null`) was already present — this is the tenancy + lifecycle precondition pair; call them out by name.
- New admin gate: `if (input.overwrite && !roleAtLeast(ctx.role, 'admin')) return err('forbidden', …)` — placed *before* the version check so the bypass is refused for members regardless of version.
- New version precondition: `if (!input.overwrite && row.version !== input.version) return conflict(CONFLICT_MESSAGE, row)`. The `conflict` helper from `result.ts` carries `current`; the `current` row is returned in the same Server Action call (one round trip).
- Decision rationale (one or two sentences each): atomic precondition vs. cross-request TOCTOU; `current` as the one-round-trip refresh source; the admin gate re-checked server-side; the gate-before-version ordering.

**2. `src/app/(app)/invoices/[id]/edit/edit-form.tsx` — conflict handling.** Use **`AnnotatedCode`** to direct focus to the five additions on top of the provided scaffold (the keyed field block, hidden `version`, `useActionState`, and the `$ACTION_*` workaround are all provided — call them out as already-present, do not re-derive):
- `const formRef = useRef<HTMLFormElement>(null)` + `ref={formRef}` on the `<form>`.
- `const [conflictRow, setConflictRow] = useState<Invoice | null>(null)`.
- `useEffect` extended: on `ok` set `seed` to the returned row *and* clear `conflictRow` (so the next save does not self-conflict); on a `conflict` code set `conflictRow` from `state.error.current as Invoice`.
- `onUseLatest`: swap `seed` to `conflictRow`, clear `conflictRow` — the keyed remount (`key={`${seed.id}:${seed.version}`}`) resets the hidden `version` to `current.version`.
- `onOverwrite`: `new FormData(formRef.current)`, `.set('overwrite', 'true')`, dispatch via `action`.
- Render `<ConflictBanner current={conflictRow} onUseLatest={…} onOverwrite={…} canOverwrite={roleAtLeast(role, 'admin')} />` when `conflictRow !== null`.
- Callout (looks unusual at a glance): why the form's `action` stays the thin `onSubmit` wrapper rather than the bare dispatcher — React's `$ACTION_*` progressive-enhancement inputs would otherwise leak into the `z.strictObject` parse and the action would reject them. This is provided code, but worth a one-line callout since it is non-obvious.

**3. `src/app/(app)/invoices/[id]/edit/conflict-banner.tsx`.** Simple block — use **`Code`**. Renders `current.customerName` / `current.status` (capitalized) / `current.currency` + `current.total`, a "Use latest" `Button` always, and an "Overwrite anyway" `Button` only when `canOverwrite`. Note the `data-testid` hooks (`conflict-banner`, `conflict-use-latest`, `conflict-overwrite`, `conflict-current-total`) the tests key on — but keep the focus on behavior, not the test wiring.

**4. Lifecycle conflict path (already implemented in L4).** One paragraph, no new code: archive/restore/soft-delete already return `conflict(message, row)` on a stale precondition; the table's result-toast surfaces the conflict line as a toast rather than the banner, because the row UI has no controlled form state to merge against. This covers `[untested]` requirements #6 and #7 — link to chapter 061 lesson 3 for the `useOptimistic`-expiry-vs-rollback distinction rather than re-explaining.

External resources placeholder: none authored here; the resourcer appends after the `<details>` if any.

No diagram. The conflict flow is carried by prose plus the before/after `CodeVariants` on the action body; a box diagram would add nothing the two-tab narrative does not already make concrete.

### Moment of truth (`## Moment of truth`)

Test command and expected pass output:
- `pnpm test:lesson 5`
- Expected: the Lesson 5 suite passes — assertions cover the version precondition (second submit does not mutate, returns a conflict), the conflict `current` payload, "Use latest" → successful resubmit, the admin-only overwrite bypass (and member refusal), and the cross-tenant not-found probe at the write.

Then a by-hand `Checklist` for the requirements the tests do not cover (mirror the framing's manual checks):
- Open an invoice in two tabs (use the inspector's "open in two tabs" link). Save the first (confirm the version bumped via the inspector + audit log). Edit and save the second — the conflict banner renders with the current server values. Click "Use latest"; the form reloads with the server's values and new version; resubmit succeeds. Use the inspector's "Force version drift" tool to reproduce the race without a second tab.
- Force version drift on a row, then archive it from the table: the optimistic removal shows briefly, the row reappears when the conflict returns, and a conflict toast fires (not the banner).
- Trigger a stale-version lifecycle action; confirm a conflict toast, not the full banner.
- As `org-globex:admin`, hand-construct an edit URL for an `org-acme` invoice ID: the detail page is not found (read is org-scoped); submit a forged form with the other org's ID — `findInvoice(ctx.orgId, id)` misses and the not-found path fires.
- Confirm the chapter acceptance bar end to end: every Project-goals behavior in the framing now holds.

Close with the forward references for the curious (one line, not a section): Unit 13 wires a notification on archive/restore, Unit 14 adds tag-driven cache invalidation to the lifecycle actions, chapter 081 lesson 3 hardens the audit discipline, chapter 088 writes integration tests for the conflict path and the cross-tenant probe.

## Scope

This lesson covers **only** the edit path's version precondition and the conflict banner. It does **not** cover:
- The `nuqs` URL-state layer (parsers, toolbar, chips, pagination, deferred search) — Lesson 2.
- The scoped-query lifecycle views and the RBAC read-gate — Lesson 3.
- The three lifecycle actions and optimistic archive — Lesson 4 (this lesson only references their already-built conflict-toast path for `[untested]` requirements #6–#7).
- The `nuqs`/`searchParamsCache`/`useDeferredValue` mechanics — chapter 060.
- The optimistic-concurrency *pattern* itself (version field, conflict Result with `current`, refresh-and-retry, `useOptimistic` expiry vs. throw-rollback) — chapter 061 lesson 3; link, don't re-derive.
- The Zod FormData-boundary coercion — chapter 042 / chapter 043 lesson 4; link.
- The SQL-backed partial unique index and the live query plan — described in the inspector's index panel only; no live DB in this project.
