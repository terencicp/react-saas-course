# Chapter 073 — Lesson 3 — Read-your-writes invalidation

## Lesson title

Keep: **Read-your-writes invalidation**. Names the senior concept (the `updateTag` semantic) rather than the mechanic.
Sidebar: **Read-your-writes**

## Lesson type

`Implementation`

(The test-coder runs for this lesson and authors `lesson-verification/Lesson 3.ts`. The writer renders the Implementation section list: Goal + Finished result / Your mission / Coding time / Moment of truth.)

## Lesson framing

The student installs the senior rule that a Server-Action mutation must invalidate **every** cached read it touches, after commit and before redirect, so the user who triggered the write reads their own change on the very next render. They wire a three-tag `updateTag` fan-out (list + record + summary) across the four lifecycle actions, learn the load-bearing ordering (commit → invalidate → redirect) and the two inverse bugs it pre-empts, see `updateTag`'s Server-Action-only restriction as the API enforcing the read-your-writes architecture, and stand up the deliberate `revalidateTag`-from-action failure-mode branch as the deterministic contrast that proves why the eventual primitive is wrong here.

## Codebase state

**Entry** — Lesson 2 is complete: `tags.ts` returns real scoped strings (`invoiceTags.list/record/summary`), `profiles.ts` is populated, and the three reads in `queries.ts` are cached (`'use cache'` + `cacheLife` + `cacheTag` + `fetchedAt`). `/invoices` serves stable `fetchedAt` timestamps across reloads. The four actions in `src/lib/invoices/actions.ts` still commit correctly against the chapter-062 version precondition but invalidate nothing tag-wise — they call only `revalidatePath('/invoices')`, so a write leaves the cached list/summary/detail stale until `cacheLife` expires. The inspector's "Edit one invoice" / lifecycle buttons commit at the store (audit log writes) but fire no `updateTag`; the misuse toggle flips `misuseFlag.misuseRevalidateFromAction` but `updateInvoice` does not yet read it.

**Exit** — `src/lib/invoices/actions.ts` is the only file changed. `updateInvoice` fans `updateTag` out to list + record + summary after commit, each followed by `logCacheInvalidation(tag, 'action')`, then `revalidatePath` and `redirect`; its list-tag call branches on `misuseFlag.misuseRevalidateFromAction` (routing through `revalidateTag(listTag, 'max')` when on). `archive` / `restore` / `softDelete` route the same fan-out through a shared `invalidateInvoice(orgId, id)` helper. From the inspector, editing or moving an invoice redirects to a fresh render with `listFetchedAt` and `summaryFetchedAt` advanced and the new value visible; the invalidation log tail shows three `action` entries; org-B caches and other invoices' detail tags are untouched. The summary-recompute job (`recomputeOrgSummary`) still throws — Lesson 4 closes that.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a user who edits or moves an invoice and lands back on the list sees the change immediately, not after a stale window.
One-paragraph finished-result description (no screenshot needed — the observable is the inspector's `fetchedAt` strip + log tail, not a UI change): from the inspector, "Edit one invoice" redirects with `listFetchedAt` and `summaryFetchedAt` both advanced and the edited amount visible on `/invoices`; archive, restore, and soft-delete behave the same against their seeded rows; the invalidation log tail shows three `action`-sourced entries per write.

### Your mission

Prose paragraph(s), then the requirements checklist. No subsection headers, no implementation hints, no tag-string or function-name leakage.

Feature, in user terms: every edit and lifecycle change (archive / restore / soft-delete) refreshes the list and the org summary on the same render, so the user reads their own write on the redirect.

Weave into the prose:
- The senior call: a single invoice mutation touches three cached entries — the org list, that invoice's record, and the org summary totals — so each action must invalidate all three. Missing one is the silent stale-read bug; the three-tag fan-out is the minimum complete set for an invoice mutation.
- Ordering is the discipline this lesson exists to teach: commit the write, then fire the invalidations, then redirect. Name both inverse bugs in user terms — invalidating before commit risks dropping a change that then rolls back; redirecting before invalidating lands a one-render stale view on the destination.
- The primitive choice is driven by who is waiting: a specific user sits on the redirect and expects read-your-writes, so the action uses the read-your-writes invalidation primitive, which the framework only permits inside Server Actions.
- Constraint: every invalidation goes through the shared tag helpers (built last lesson), never a raw string; each invalidation is also recorded through the provided logging helper, placed *after* the real invalidation call returns so a failed invalidation never leaves a misleading success entry.
- Constraint: the three lifecycle actions share one fan-out helper rather than repeating the calls; the edit action carries one extra branch that, when an inspector-controlled flag is on, deliberately routes the list invalidation through the eventual primitive instead — a teaching surface, not production code.
- Out of scope (one line): the summary-recompute job and its eventual-path invalidation (next lesson); here every invalidation is the in-band, user-facing path.

Functional requirements (numbered, each tagged `[tested]` / `[untested]`). Phrase as observable outcomes, never as files/exports. Use the `Checklist` component with `tested`/`untested` chips.

1. Editing an invoice and returning to the list shows a fresh `listFetchedAt` and the new value on the same render. `[tested]`
2. The same edit advances `summaryFetchedAt` on the redirected render (totals shifted). `[tested]`
3. Editing invoice A leaves invoice B's detail `fetchedAt` stable while invoice A's detail `fetchedAt` advances — the record tag scopes to the affected invoice. `[tested]`
4. Archive, restore, and soft-delete each advance both `listFetchedAt` and `summaryFetchedAt`, and the row correctly enters/leaves the active set. `[tested]`
5. An edit in org A leaves org B's `listFetchedAt` unchanged — the org-scoped tags are distinct. `[tested]`
6. With the misuse toggle off, an edit advances `listFetchedAt` and shows the new amount; with it on, the redirect shows `listFetchedAt` stale and the old amount (record + summary still correct). `[tested]`
7. The invalidation log tail shows three entries — list, record, summary — sourced as `action` for each write. `[untested]` (observed in the inspector log tail)
8. Each action's source reads in order: in-store commit, then the invalidation calls, then the redirect. `[untested]` (code-shape, confirmed by eye)

(Test-coder note: assert observable behaviour via the store/log surface — `fetchedAt` advancing after an action, record-tag scoping, cross-org isolation, the misuse branch's stale list with correct record/summary. Inline any helpers; depend only on the shared runner and the student's code.)

### Coding time

One line directing the student to implement the fan-out across the four actions and the misuse branch against the brief and tests, then read the walkthrough. The writer wraps the full reference in `<details>` (collapsed).

Reference implementation — only `src/lib/invoices/actions.ts` changes; present it as it appears in the repo. Code-sample handling:
- Use **`AnnotatedCode`** for `updateInvoice` — multiple parts need focused attention: the after-commit position of the invalidation block, the list-tag misuse branch (`if (misuseFlag.misuseRevalidateFromAction) revalidateTag(listTag, 'max') else updateTag(listTag)`), the record and summary `updateTag` calls, and the `logCacheInvalidation(tag, 'action')` placed after each call.
- Use plain **`Code`** for the shared `invalidateInvoice(orgId, id)` helper and for one representative lifecycle action (e.g. `archive`) showing where `invalidateInvoice` slots in after `pushAudit` and before `revalidatePath`/return — note restore and soft-delete follow the identical shape.

Decision rationale to narrate (one or two sentences each):
- Three-tag fan-out per action: each lifecycle change moves a row in/out of the active set, changes the record's display, and shifts the summary totals — so list + record + summary is the complete set for all four actions, not just edit.
- After-commit ordering as a lint rule a senior runs by eye: in-store commit → invalidation calls → redirect. Name both inverse bugs (invalidate-then-commit, redirect-then-invalidate) and why each is wrong.
- `updateTag` is Server-Action-only by design: outside an action no specific user is sitting on the redirect, so read-your-writes is the wrong semantic and the framework rejects the call — the API enforcing the architectural rule. Link the eventual counterpart to Lesson 4 rather than explaining it here.
- The misuse branch reads `misuseFlag.misuseRevalidateFromAction` and swaps `revalidateTag(listTag, 'max')` for `updateTag` on the **list tag only**; record + summary stay on `updateTag`. State plainly that production code never reads a misuse flag — the branch exists solely as the teaching surface, and that cross-process (the chapter-074 reality) is where the stale-list symptom is most visible.

Coverage of `[untested]` requirements:
- Req 7 (log tail entries): `logCacheInvalidation(tag, 'action')` is called after each real invalidation returns, never before — so a throwing `updateTag` does not leave a row claiming success. Three calls per write produce three `action` entries.
- Req 8 (ordering visible in source): the invalidation block sits below `pushAudit` (the commit) and above `revalidatePath`/`redirect`; the shared helper keeps the order identical across the three lifecycle actions.

Callouts on anything that looks unusual at a glance:
- The invalidation calls in the actual solution are **synchronous** (`updateTag(listTag);`, not `await updateTag(...)`). The chapter framing's prose uses `await updateTag(...)`; the writer must follow the solution source — present the calls without `await`. Flag this so the snippet matches the repo and tsc/biome stay green.
- `revalidatePath('/invoices')` remains in every action alongside the new tag calls (carried from chapter 062); it is the path-level belt-and-suspenders next to the tag-level invalidation, not a replacement.
- The misuse `revalidateTag` requires the second `cacheLife` argument (`'max'`) — single-argument `revalidateTag(tag)` is deprecated in Next.js 16 (see the chapter-end note).

For topics owned by regular lessons, link rather than re-explain: `updateTag`/`revalidateTag` semantics (lesson 6 of chapter 032; lesson 2 of chapter 072), the four-call decision tree and after-commit-then-redirect rule (lesson 2 of chapter 072), the `tags.ts` helper convention (lesson 1 of chapter 072; built in Lesson 2 here).

No diagram required — the flow (commit → fan-out → redirect) is short, linear, and carried fully by the annotated `updateInvoice`. A diagram would duplicate the code.

### Moment of truth

Test command and expected pass output:
- `pnpm test:lesson 3` — runs `lesson-verification/Lesson 3.ts`; expect all assertions green, covering `fetchedAt` advancing after an edit, record-tag scoping, cross-org isolation, and the misuse branch's stale list with correct record/summary.

Then a hand-confirmation `Checklist` for the requirements the tests don't surface (the `[untested]` ones plus the inspector-only observations):
- [ ] Inspector "Edit one invoice": redirect lands with `listFetchedAt` and `summaryFetchedAt` advanced, the edited amount visible on `/invoices`, and the log tail showing three `action` entries.
- [ ] Edit invoice A, open invoice B's detail (stable `fetchedAt`), then invoice A's detail (advanced `fetchedAt`).
- [ ] Archive a row (drops from `view=active`, both timestamps advance); restore it (returns, both advance); soft-delete as admin and confirm under `view=all` with the summary excluding it.
- [ ] Edit as admin in org A, switch the inspector identity to org B, confirm org B's `listFetchedAt` is unchanged.
- [ ] Flip the misuse toggle on, edit, observe stale `listFetchedAt` + old amount; flip off, repeat, observe advanced `listFetchedAt` + new amount.
- [ ] Read `updateInvoice`'s source: commit, then the invalidation calls, then `redirect`.

Closing one-liner: both the read-your-writes path and its deliberate failure mode are now wired; the eventual path (the recompute job's `revalidateTag`) follows in Lesson 4.

## Scope

This lesson does not cover:
- The summary-recompute job body or its `revalidateTag` eventual-path invalidation — Lesson 4 of this chapter.
- Adding/choosing `use cache`, `cacheLife`, `cacheTag`, or building `tags.ts`/`profiles.ts` — Lesson 2 of this chapter.
- The cross-process/distributed cache backend where the misuse symptom is most pronounced — chapter 074 (Upstash).
- Integration tests for the invalidation paths beyond this lesson's suite — chapter 088.
