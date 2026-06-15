# Chapter 104 — Lesson 4 outline

## Lesson title

Page title: **ADR 0007: the cache decision worth recording**
Sidebar: **ADR 0007**

(Chapter-outline title "ADR 0007" works but is opaque on its own; the page header earns the "which decision, and why this one" framing the lesson installs. Sidebar stays short.)

## Lesson type

`Implementation`

Caveat that drives downstream branching: this chapter ships **no automated test suite** — `lesson-verification/` is empty (`.gitkeep` only) and there is no `pnpm test:lesson 4`. The test-coder produces nothing for this lesson. The writer still renders the Implementation contract section list, but *Moment of truth* is an honor-system **self-grade against `solution/`** via a hand-check `Checklist`, not a test command. Every requirement is effectively `[untested]` (no machine asserts on a written `.md`); the brief tags accordingly and the writer must not invent a fake test command.

## Lesson framing

The student installs the senior reflex that *not every change earns an ADR*, then records the one that does. They run the three-test inclusion check (lesson 4 of chapter 101) across the `/plan` surface's candidate decisions, reject the two that fail, and write ADR 0007 for the survivor — caching the entitlement read with `cacheTag`. The payoff is the discipline of a crisp single-sentence Decision with zero hedging and an honest Consequences list that enumerates every `updateTag` seam rather than waving at "always invalidate". They close the chapter by self-grading both deliverables against the `solution/` reference under no-peeking rules — the rehearsal for review work with no answer key.

## Codebase state

This is the final lesson of the chapter.

- **Entry.** App runs locally. `reviews/chapter 104.md` is complete from lesson 3: pass-order header, `Started at:` note, five `blocking:` comment blocks in the four-part template, a `## Summary` with severity totals + scope note, and a `Verdict: request changes` line. The ADR scaffold `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` ships unfilled — H1 title, four empty `##` sections (Status / Context / Decision / Consequences), and a `<!-- TODO(L4) -->` marker. `docs/adr/README.md` carries the intro + index rows 0001–0006 (rows only; no separate 0001–0006 files) and its own `<!-- TODO(L4) -->`. No audited source has changed and none will.
- **Exit.** ADR 0007 has all four Nygard sections filled, the `<!-- TODO(L4) -->` marker gone, a single declarative Decision line, and a Consequences list naming each `updateTag` seam, the `revalidateTag(tag, 'max')` background path, the `'minutes'` staleness window, the forgot-to-invalidate failure mode, and the one-PR reversal cost. The 0007 row is appended to `docs/adr/README.md`. Both deliverables have been self-graded side-by-side against `solution/`. Audited source unchanged — the chapter is read-only on the app.

## Lesson sections

Implementation contract order: *Goal + Finished result* (intro, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: record the surface's one ADR-worthy decision — caching `getPlanEntitlement` with `cacheTag` — in the Nygard shape, then self-grade the chapter's two deliverables against the reference. Follow with a one-paragraph description of the finished result: the filled `0007-...md` (four sections, no hedging in Decision, honest Consequences), the appended index row, and a completed side-by-side self-grade. No screenshot — the deliverables are text files; describe them in prose. Connect back: lesson 4 of chapter 101 taught the template and the three-test check in the abstract; this is where the student applies both to a real decision the running code already made silently.

### Your mission

Coherent prose paragraph (no subsection headers, no implementation hints), weaving:

- **Feature (user terms).** Decide which of the `/plan` surface's decisions earns a recorded ADR, then write ADR 0007 capturing the cache decision in the four-section Nygard template, and append its index row.
- **The inclusion gate up front.** Run the three-test check (affects multiple files / a reasonable alternative exists / reversing costs more than one PR) across the candidates. Reject the two that fail with a stated reason: adding the `planLabel` field has no real architectural alternative and reverses in one PR; co-locating `src/lib/plan/` is convention application, not a new decision. Only caching the entitlement read survives — it shapes every future plan-touching surface, has a real alternative (per-request reads, or `revalidatePath`), and would cost a sweep of `updateTag` call sites to undo.
- **Constraints that shape the solution.** The Decision is *one declarative sentence with no hedging* ("we will cache…", never "we're considering" / "we should" / "maybe") — the hedge belongs in Context (as the rejected alternative) or Consequences (as reversal cost), never the Decision line; this is the lesson's headline trap. The Context must name the read's access pattern, its scale, and the rejected alternative *with a reason* — an ADR that pretends there was no choice records nothing. The Consequences is the honesty test: enumerate every mutation seam that must own an `updateTag` call (don't wave at "every mutation must invalidate"), name the `updateTag`-vs-`revalidateTag` cut for the background-job path with its lesson reference, state the `'minutes'` staleness window and *why* it's acceptable, and state the reversal cost — three bullets that are all upsides is a sales pitch. The filename slug is a noun phrase of the *decision* (`cache-entitlement-reads-with-cacheTag`), not a verb phrase of the *change* — it ships correct, so the discipline is recognizing why it reads that way.
- **Tools reused.** No new tooling. Reuses the Nygard template + three-test check (chapter 101 lesson 4), the `cacheTag`/`updateTag`/`revalidateTag` decision tree and `cacheLife` profiles (Unit 14, chapter 074), and the precedent already in `src/lib/invoices/queries.ts` + `actions.ts`.
- **Out of scope.** Choosing a different cache-key strategy or re-litigating the caching decision — the student records the decision the code already made, not a new one. Editing audited source stays out of scope all chapter.

Then the requirements checklist (`Checklist`, `id="mission"`, no chips — every item is honor-system, none machine-verified). Each item one verifiable outcome, phrased as the outcome not a file/export:

1. The three-test inclusion check is applied to each candidate decision; only the caching decision is selected, the field-add and the co-location rejected with a stated reason.
2. The ADR's four sections are filled and the `<!-- TODO(L4) -->` marker is gone.
3. Status reads "Accepted" with a date.
4. Context names the entitlement read's access pattern and names the rejected alternative (per-request reads, or `revalidatePath`) with the reason it lost.
5. The Decision is a single declarative sentence naming the `cacheTag` read and the `updateTag` invalidation commitment, with no hedging language.
6. Consequences enumerate every mutation seam that must call `updateTag`, name the `revalidateTag(tag, 'max')` background-job path with its lesson reference, state the `'minutes'` staleness window, and state the one-PR reversal cost honestly.
7. The `docs/adr/README.md` index (seeded 0001–0006) carries an appended one-line 0007 entry.

### Coding time

One-line build prompt: fill the four ADR sections and append the index row against the brief; read the reference after attempting. Writer wraps the solution body in `<details>` (collapsed). Inside:

- **The reference ADR body.** Render with `Code` (a single `.md` block — one cohesive artifact, no need to step through parts). Use the reference verbatim from the chapter outline's "Reference ADR body": Status `Accepted — 2026-MM-DD.`; a Context paragraph naming the access pattern, the invoices-reads precedent (`src/lib/invoices/queries.ts`), the rejected per-request alternative and the `revalidatePath` runner-up with reasons; a one-sentence Decision (`We will cache getPlanEntitlement(orgId) with cacheTag(orgPlanEntitlementTag(orgId)) and cacheLife('minutes'), and invalidate via updateTag(orgPlanEntitlementTag(orgId)) from every mutation seam that touches plan or entitlement state.`); and a five-bullet Consequences list (per-seam `updateTag` ownership — today only `src/app/(app)/plan/actions.ts:updatePlanLabel`; the `revalidateTag(orgPlanEntitlementTag(orgId), 'max')` background path mirroring `src/server/jobs/summary-recompute.ts` from chapter 074; the `'minutes'` staleness window and why it's acceptable; the forgot-`updateTag` failure mode + TSDoc-contract mitigation; the one-PR reversal cost).
- **The index row.** Show the appended line for `docs/adr/README.md`: `0007 — Cache entitlement reads with cacheTag — Accepted — 2026-MM-DD`. A short `Code` snippet or inline is fine.
- **Decision rationale (one–two sentences each).** Why the `'minutes'` profile is a recorded trade-off, not a magic number. Why enumerating seams beats "remember to invalidate" (turns a vague rule into a greppable list; short today, but it names the contract the next seam inherits). Why the slug is a noun phrase, not a verb phrase. For the `updateTag`/`revalidateTag` cut and `cacheLife` profiles, **link to Unit 14 (chapter 074) rather than re-explaining** (owned topic).
- **Self-grade step.** Direct the student to open `solution/reviews/chapter 104.md` and `solution/docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` and compare side-by-side — note this is the answer key, read only after writing their own.
- No diagram. No new external resources unless the resourcer adds an ADR/Nygard reference here after the `<details>`.

### Moment of truth

No automated checker — state this plainly: `lesson-verification/` ships empty for this chapter, there is no `pnpm test:lesson 4`. Verification is a by-hand self-grade against `solution/`. Use a `Checklist` (`id="verify"`, items chipped `untested` to signal no machine asserts). Items, ticked as the student grades:

1. Only the caching decision was selected by the three-test check; the field-add and the co-location were rejected with a reason.
2. Status is "Accepted" with a date; Context names the alternative and rejects it with a reason; the `<!-- TODO(L4) -->` marker is gone.
3. The Decision is one declarative sentence with no hedging tokens ("we should" / "we're considering" / "maybe").
4. Consequences list the mutation seam(s) explicitly, name the `revalidateTag(tag, 'max')` background path with its lesson reference, name the `'minutes'` window, and state the reversal cost.
5. The five lesson-2/3 review comments score against the reference on coverage and severity match — five `blocking:` is the expectation; a 3/5 review that goes deep on `cacheTag` while silencing the `Date` math is a fail.
6. Misses and wrong severities are read back into a personal review checklist for the next PR — the self-grade is the rehearsal, since a real review has no rubric.

Close with the chapter's senior send-off (brief, in prose, after the checklist): when ADR 0007 is later superseded (cache moves to Redis, entitlement model changes), the supersession discipline from chapter 101 lesson 4 lands — the new ADR references this one, this one's Status becomes "superseded by ADR XXXX", and the file is never deleted. The review-and-ADR cadence rehearsed here is the daily senior craft that runs on every PR in Unit 22 and beyond.

Render note on `revalidateTag` (Next.js 16): always pass a `cacheLife` profile as the second argument — `revalidateTag(tag, 'max')`; the single-argument form is deprecated. Keep this consistent in the reference body and checklist.

## Code sample handling

- Reference ADR body → `Code` (single `.md` block; one cohesive artifact, stepping not needed).
- Index row → inline or short `Code`.
- Requirements checklist and verification checklist → `Checklist` + `ChecklistItem` (mission: no chips; verify: `untested` chips). Distinct `id`s.
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` / `FileTree` — single text artifact, no before/after, no inferred types, no starter tour (that lived in lesson 1).
- No diagram — prose carries the inclusion check and the consequences enumeration; a box-and-arrow figure would add nothing.

## Scope

- **Does not** identify or write the five review comments — that is lessons 2 and 3 (the auth bypass, then four more blocking findings + summary/verdict). This lesson only reads them back during the self-grade.
- **Does not** teach the Nygard template, the three-test inclusion check, supersession, or numbering from first principles — owned by lesson 4 of chapter 101; apply and link, don't re-teach.
- **Does not** explain the `cacheTag`/`updateTag`/`revalidateTag` decision tree or `cacheLife` profiles — owned by Unit 14 (chapters 072–074); link to chapter 074.
- **Does not** edit any audited source — the chapter is read-only on the app; the only files that grow are `0007-...md` and `docs/adr/README.md`.
- **Does not** ship or run an automated test — there is no checker for written artifacts this chapter; verification is the honor-system self-grade against `solution/`.
