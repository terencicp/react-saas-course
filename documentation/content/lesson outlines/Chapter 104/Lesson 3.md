# Chapter 104 — Lesson 3 outline

## Lesson title

**Four more blocking findings** (chapter-outline title fits — it names the deliverable precisely).
Sidebar: **Four more findings**.

## Lesson type

`Implementation`.

Caveat for the orchestrator: this is a documentation/review project with **no automated test suite** — `lesson-verification/` ships empty (only `.gitkeep`) and there is no `pnpm test:lesson 3` command. The deliverable is the filled `reviews/chapter 104.md`. *Moment of truth* is a hand-check + self-grade against `solution/`, not a test run. The test-coder step should be **skipped** for this lesson. The writer still renders the Implementation section list (Goal+Finished result / Your mission / Coding time / Moment of truth) but the Moment of truth carries a `Checklist`, not a test command.

## Lesson framing

The student walks away having run a real PR review to completion: four more `blocking:` findings written in the four-part anatomy, then the file closed with a severity summary and a "request changes" verdict. The senior payoff is the *mix and the closing discipline* — recognising that all five issues here are blockers (each violates an established rule with security, correctness, or contract consequences), resisting the junior reflex to pad with nits, and signing the review with an honest verdict and a scope note rather than trailing off. Two senior reflexes get installed by example: reading imports (not function bodies) to catch smuggled side effects, and reading every security-relevant mutation against the audit-log catalog to catch the silence that nothing visibly breaks on.

## Codebase state

**Entry.** Starter cloned and running (lesson 1); `reviews/chapter 104.md` carries the shipped pass-order header, a filled `Started at:` line, and comment 1 written in lesson 2 (the `authedAction` bypass on `src/app/(app)/plan/actions.ts`, replacing the `<!-- TODO(L2) -->` marker). All audited source unchanged and identical in `start/` and `solution/`. The student has the four-part comment cadence modeled once and the principle-and-pattern cheatsheet open.

**Exit.** `reviews/chapter 104.md` holds all five comment blocks (comment 1 from lesson 2 plus comments 2–5 written here) in the four-part template, a `## Summary` with severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the scope note (surface is small, 400-LOC threshold did not fire), a one-line pass-order recap, and a closing `Verdict: request changes` line. No audited source changed; the ADR scaffold is still empty (lesson 4). Optionally the student has added the senior-reach bonus comments (one `suggestion:`, one `nit:`, one `praise:`).

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in review terms: complete the review by writing the four remaining `blocking:` findings, then close the file with the severity summary and the request-changes verdict. Then a one-paragraph description of the finished `reviews/chapter 104.md`: five comment blocks, a `## Summary` block, a `Verdict:` line — a review another engineer could act on. No screenshot needed (the deliverable is a text file); optionally a short `Code` block showing the *shape* of the closed file (summary + verdict tail only, not the comments) so the student knows the target.

### Your mission (h2)

Coherent prose paragraph, no subsection headers, no implementation hints. Weave:

- **Feature** (review terms): surface and write the four remaining findings, then close the review with a summary and verdict.
- **The two senior reflexes to carry** (frame as reflexes, not as where-to-look hints for specific lines): the side-effect import is the kind you find by reading the *imports*, not the function body — a bare `import '...'` whose module has executable code at top level means the import *is* the call; the missing audit-log write is the kind that hides because nothing breaks, so you read every security-relevant mutation against the canonical event catalog and ask "does this write an audit-log entry?". The other two carry sharper rules than juniors reach for: user-visible time math crosses Temporal with **no** exceptions (not "be careful with dates"), and a value derivable from other state is never `useState` + syncing `useEffect` — the state itself is the bug, so the fix *deletes* it rather than memoizing it.
- **The senior cut this lesson teaches**: all five findings are `blocking:` by design — the chapter teaches the blocking-vs-suggesting cut by example, and restraint (a review drowning in nits buries the signal; the right severity *mix* beats the most comments). The bonus findings (a TSDoc `suggestion:`, a naming `nit:`, a co-location `praise:`) are extra credit, never required.
- **Constraints**: work file-by-file in review-stack order, not top-down on the file list; keep every comment in the address-the-code-not-the-author voice; do not switch files mid-comment.
- **Out of scope**: editing the source (the fix lives in the comment body); the ADR (lesson 4).

Then the **Functional requirements** — the only list in the section, rendered as a `Checklist` of verifiable outcomes (each is a review-comment outcome, phrased as the outcome, never as a file/export). Tag each `[untested]` (there is no automated checker; the student confirms each against the comment anatomy and the reference). One verifiable outcome per item:

1. `[untested]` The review file carries a `blocking:` comment on the bare side-effect import in `src/app/(app)/plan/page.tsx`, citing Principle #6, proposing an explicit named call site or removal if analytics auto-capture covers the page view.
2. `[untested]` The review file carries a `blocking:` comment on the `Date`-arithmetic countdown in `src/lib/plan/renewal-countdown.ts`, citing SaaS pattern #13, proposing the Temporal-seam switch to calendar-day math (not millisecond division).
3. `[untested]` The review file carries a `blocking:` comment on the derived-state effect in `src/app/(app)/plan/seat-usage.tsx`, citing Principle #7 and derive-don't-sync, proposing deletion of the state, effect, and resync handler in favour of inline computation.
4. `[untested]` The review file carries a `blocking:` comment on the missing audit-log write in `src/app/(app)/plan/actions.ts`, citing the canonical audit-log catalog, proposing the `logAudit` call with the `organization.plan-label-changed` action alongside the write.
5. `[untested]` The `## Summary` records severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the scope note (surface small, 400-LOC threshold did not fire), and a one-line pass-order recap.
6. `[untested]` The file closes with a `Verdict: request changes` line naming the five blocking issues.

(Because nothing here is machine-asserted, the `Checklist` chips read `untested` throughout; the verification is the *Moment of truth* hand-check. Do not pretend a test covers these.)

### Coding time (h2)

One-line build prompt directing the student to write comments 2–5, the summary, and the verdict against the brief before reading the reference. Then the reference inside `<details>` (writer wraps it collapsed by default).

**Optional in-lesson practice surface (brief for the writer, place before the `<details>`):** a `CodeReview` exercise is a strong fit here and lets the student practice finding 2, 3, and 4 against the *actual defective source* with AI grading on the `file:line` plant. Render the relevant slices of the three source files as `ReviewFile` blocks and seed a `ReviewIssue` per finding with a one-sentence `kernel` (e.g. finding 2 → "bare side-effect import fires `fetch` on import — make the call explicit"; finding 3 → "millisecond division assumes a 24-hour day, breaks at DST — use the Temporal seam"; finding 4 → "derived `seatsRemaining` held in state + synced via effect — derive inline, delete the state"). Finding 5 (missing audit log) is an *absence*, which `CodeReview` cannot pin to a line cleanly, so leave it out of the exercise and cover it only in prose + the reference block. This is optional polish; if the writer omits it, the lesson still works — the `<details>` reference is the spine.

**Reference solution content** (organize as four comment blocks in the four-part template, then bonus, then rationale). Display the four reference comment blocks verbatim from the chapter outline (Reference comment blocks for findings 2–5: side-effect import `page.tsx` L1; `Date` arithmetic `renewal-countdown.ts` L8-11; derived-state effect `seat-usage.tsx` L15-25; missing audit log `actions.ts` L33). Use `Code` for each block (plain text — these are review comments, not runnable code). Then the bonus block (`suggestion:` TSDoc on `get-plan-entitlement.ts` L8; `nit:` `handlePlanThing` L23; `praise:` co-location) as a clearly-labeled extra-credit `Code` block. Then the `## Summary` + `Verdict:` tail as a final `Code` block.

Decision rationale to carry (one or two sentences each — these cover the reasoning a regular lesson does not own):

- Finding 4's action **deletes** the state rather than reaching for `useMemo`: the state itself is the bug — the value is derivable, so storing it at all is what makes the impossible state representable. (Derive-don't-sync owned by Chapter 025 — link, don't re-teach.)
- Finding 5's `logAudit` is written *alongside the same store mutation* (in DB framing, inside the same transaction) so a rollback unwinds the audit row too; logging after the redirect would orphan the event if the write later fails. (Audit-log catalog owned by lesson 5 of chapter 057 / lesson 3 of chapter 081 — link.)
- The bonus findings stay `suggestion:`/`nit:`/`praise:` rather than promoted to blockers — they're the right shape with a subjective choice, and inflating them would blunt the blocking-vs-suggesting cut the reference scores. (Severity labels owned by lesson 2 of chapter 103 — link.)
- Finding 5's fix "falls out naturally once the action is wrapped in `authedAction` per finding 1" — note the dependency so the student sees the findings interlock.

For Principle #6, Temporal, derive-don't-sync, the audit catalog, and the severity labels: **link to the owning lesson, do not re-explain** (the brief explicitly forbids re-teaching topics a regular lesson owns).

No diagram — prose and the comment blocks carry the flow; this is a text-artifact lesson.

### Moment of truth (h2)

No test command — state plainly that `lesson-verification/` ships empty for this chapter and there is no automated checker, so verification is a hand-check. Replace the usual `pnpm test:lesson 3` block with this framing.

Hand-check rendered as a `Checklist` (ticks persist), one verifiable judgment per item (lift from the chapter-outline Moment of truth checklist):

- [ ] All five findings are labeled `blocking:`, not `suggestion:` — any mis-label loses the severity-credit half on that finding.
- [ ] Finding 3's action proposes the Temporal seam (calendar-day math), not just "be careful with dates."
- [ ] Finding 4's action deletes the state and the effect, not "memo it."
- [ ] Finding 5's `logAudit` call names the `organization.plan-label-changed` action with the payload shape and sits alongside the write.
- [ ] The summary's scope note records that the 400-LOC threshold did not fire (surface is small); the verdict reads "request changes."
- [ ] Every comment is in the address-the-code-not-the-author voice.

Close with one line: the self-grade against `solution/reviews/chapter 104.md` happens in lesson 4 (where both deliverables are graded side-by-side) — here the student only confirms the review file is complete and internally consistent. Honor-system reminder: do not open `solution/` until lesson 4.

## Scope

This lesson does **not** cover:

- Comment 1, the `authedAction` bypass and the four-part-comment cadence — **lesson 2** (the modeled example; this lesson assumes it is written).
- The ADR, the three-test inclusion check, and the self-grade against `solution/` — **lesson 4**.
- The setup, the pass-order header, and the once-over of the canonical helpers — **lesson 1 (Project Overview)**.
- Re-teaching the principles/patterns each finding cites (Principle #6, SaaS pattern #13/Temporal, Principle #7/derive-don't-sync, the audit-log catalog, the severity labels) — owned by their origin lessons (chapter 029/042, Chapter 083, Chapter 025, lesson 5 of ch.057 + lesson 3 of ch.081, lesson 2 of ch.103); cite by ID and link.
- A structural "split this PR" comment — out by design: the `/plan` surface is well under the 400-LOC threshold (the scope note records the threshold did not fire).
