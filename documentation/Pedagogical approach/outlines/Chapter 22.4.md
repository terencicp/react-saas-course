## Concept 1 — The review stack reorders the diff

**Why it's hard.** The instinctive read is top-down on the "Files changed" view, line 1 of the first file. That order maximizes how much style noise the reviewer surfaces before they touch correctness — by the time they reach the audit-log bug, attention is gone.

**Ideal teaching artifact.** A *misordering ambush*. Before the pass-order rule is named, the student sees the seeded diff's file list and is asked: "where would you start?" Two paths play out side-by-side on the same diff — Path A walks the files top-down and surfaces a `nit:` on a variable name in `page.tsx` as the first finding; Path B walks the review stack and surfaces the missing `authedAction` wrapper in `actions.ts` as the first finding. Both paths end with the *same five findings on the page*, but the order is shockingly different — Path A is still on style when Path B has already filed three blockers. The lesson then names the five-layer stack as the rule that produces Path B. Archetype: *Decision* with a wrong-by-default ambush.

**Engagement.** A short `Sequence` exercise: drag the five seeded findings into the order a senior surfaces them — security/correctness first, principle bypasses next, pattern bypasses after, then style. The drag reveals which student is still reading file-by-file.

**Components.**
- Hand-SVG inside `Figure` for the two-path side-by-side timeline of the same diff (Path A by file order, Path B by stack order). Single composition, layout itself carries the contrast.
- `Sequence` for the drag-into-stack-order recall.

**Project link.** This concept *is* the pass-order header the student writes at the top of `reviews/22.4.md` before opening the diff.

## Concept 2 — The principle-and-pattern map as a lookup index

**Why it's hard.** Without a fixed map, the reviewer either pattern-matches from gut (inconsistent, missed bypasses) or reads line-by-line for "things that look wrong" (slow, drowns in noise). The senior reflex is the opposite: hold an index of established seams and scan for *what's missing* — for a server action without `authedAction`, for a date math expression without Temporal, for a security-relevant mutation without `logAudit`. The map is a bypass detector, not a fault detector.

**Ideal teaching artifact.** A *two-column reference card the student keeps open during the review* — the principle-and-pattern map condensed to one page, each row holding the principle/pattern name, its lesson ID, the diff signature that flags the bypass, and the canonical helper it should reach for. Then, inline alongside the map, four micro-diffs (3–8 lines each) appear; for each, the student clicks the row of the map that fires. The drill compresses "is there a violation here?" into "which row?" The map becomes a hash function — the reviewer's eye learns to project arbitrary diff fragments into one of ~22 buckets. Archetype: *Reference* used as a guided lookup drill, not a survey.

**Engagement.** A `Matching` round: left column holds four diff fragments (a `'use server'` without the wrapper, `Date` arithmetic, `useState`+`useEffect` derived state, a transaction with no `logAudit`); right column holds the map rows. The student links each fragment to its row before reading the chapter's own findings.

**Components.**
- Hand-SVG inside `Figure` for the one-page principle-and-pattern map (table layout with lesson-ID column, signature column, helper column).
- `Matching` for the diff-fragment-to-map-row drill.

**Project link.** Every comment in `reviews/22.4.md` cites a row of this map by ID.

## Concept 3 — Reading bypasses by knowing the canonical helpers

**Why it's hard.** The bypasses in the seeded PR don't look wrong on their own — `const session = await auth()` is correct code. They look wrong only against the established seam (`authedAction`) that the codebase already ships. The reviewer who hasn't internalized the canonical helpers can't spot the absence; they're reading the diff in isolation, not against the codebase's surface.

**Ideal teaching artifact.** A *calibration walkthrough* — before the student touches the diff, they read four short snippets from the existing codebase, each a canonical helper: `authedAction`, `logAudit`, the Temporal helper module, the `'use cache'` + `cacheTag` shape from `lib/billing/`. Each snippet is followed by a one-line "what this guarantees" caption (role + tenant + rate-limit; audit-trail row; DST safety; cache invalidation contract). The eye is being calibrated for the shape of the seam so its *absence* in the diff is jarring. Archetype: *Pattern* taught from the helper side, not the call-site side.

**Engagement.** A `Tokens` round on a tiny snippet of `actions.ts` from the diff — the student clicks the *missing* element (the `authedAction` wrapper that should be there but isn't). Decoys are present-but-fine constructs. The exercise teaches "find the absence" as a clickable reflex.

**Components.**
- `Code` blocks for the four canonical-helper snippets with `CodeTooltips` over the load-bearing identifiers (`role`, `tenantDb`, `cacheTag`).
- `Tokens` for the find-the-absence exercise. Note: `Tokens` clicks pre-highlighted parts of present code; the "missing helper" variant needs a decoy convention where the *call site* is the clickable target and the kernel is "this site is missing the wrapper." If that's too oblique for `Tokens`, swap to `MultipleChoice` with the question "what's missing from this action?"

**Project link.** Lesson 22.4.2 explicitly opens the four helper files before opening the diff — this concept is what that beat teaches.

## Concept 4 — The four-part comment as a contract

**Why it's hard.** Most review comments students have seen are one-liners ("this is wrong"). The student doesn't yet feel that a comment without all four parts — severity, observation, principle/pattern with lesson ID, action — is a comment that fails to *transfer* to the receiving author. The four parts aren't decoration; they are the minimum surface area for an actionable transfer.

**Ideal teaching artifact.** A *broken-comments triage*. The student sees five real-looking comments side-by-side, each missing one part — one has no severity, one names the bug but not the rule, one names the rule but no action, one is all action ("change it to X") without explaining the principle violated, one has all four parts. The student labels each "what's missing?" Then the lesson reveals the four-part template and the student rewrites each broken comment into the template shape. The exercise teaches the contract from its failure modes; the template is the floor each rewrite has to clear. Archetype: *Pattern* taught from broken-by-default examples.

**Engagement.** A `Buckets` sort: ten comment snippets from imagined PRs go into four buckets — "missing severity," "missing rule," "missing action," "all four parts." The bucket sort is the recall.

**Components.**
- `Figure` holding a hand-laid grid of the five broken comments with their "what's missing?" hot-spot marker; the reveal toggles the four-part rewrite. A single static composition, no need for a bespoke component.
- `Buckets` for the four-part diagnostic sort.
- `CodeReview` (with `ReviewFile` + `ReviewIssue`) on a tiny 10-line invented diff carrying one seeded plant, used as a *practice round* before the real `reviews/22.4.md` write — the student leaves one four-part comment, the AI grader scores it against the kernel. This is the small-diff rehearsal of the template the chapter's project then runs at scale.

**Project link.** Every comment block in `reviews/22.4.md` is scored on whether it has all four parts; the rubric penalizes the missing-part comment even when the finding is correctly located.

## Concept 5 — The blocking-vs-suggesting cut

**Why it's hard.** This is the single hardest call in code review. A `suggestion:` on a security bug is too lenient; a `blocking:` on a name preference is bullying. The cut runs on whether the finding violates an established principle/pattern with security, correctness, or contract consequences — not on how strongly the reviewer feels. Students default to mid-strength labels (`suggestion:` for everything) and the signal collapses.

**Ideal teaching artifact.** A *severity calibration drill*. The student sees twelve findings — a mix drawn from the chapter's seeded set plus invented adjacent ones (a `suggestion:`-worthy TSDoc gap, a `nit:`-worthy name, a `question:`-worthy "why this approach?", a `praise:`-worthy good choice, and seven `blocking:` ones at varying obviousness). For each, the student picks a severity, then sees the rubric reason and the cost-of-mislabeling. The drill stages the cut as a *recurring micro-decision*, so the reflex builds by reps. Archetype: *Decision* run as a graded round.

**Engagement.** The drill *is* the assessment — twelve graded calls. Follow-up: a single `TrueFalse` round on three sharp statements ("all five seeded findings are blocking," "a `nit:` on a name preference is appropriate when the name actively obscures intent," "a `blocking:` comment requires citing a principle or pattern").

**Components.**
- New: `SeverityCalibration` — inputs: an array of `{ snippet: string, fileHint?: string, correctSeverity: 'blocking' | 'suggestion' | 'question' | 'nit' | 'praise', reason: string }`; shows one finding at a time, five severity buttons, reveals the rubric reason and a running score. Forward-link: every chapter that surfaces a "judgement call across a fixed taxonomy" (security threat categorization 17.3, observability signal priority 20.x) could reuse it.
- `TrueFalse` for the follow-up sharpening round.

**Project link.** The rubric penalizes mislabeled severity per finding; this concept is what trains the call before the deliverable.

## Concept 6 — The side-effect-in-an-import failure mode

**Why it's hard.** The import line `import '@/lib/analytics/page-view-tracker';` looks like one of the most innocuous things in TypeScript — bare imports are normal in setup files. The student's eye doesn't yet treat "module top-level body" as code that runs at import time, especially on the server, especially on every render of a Server Component. The bug hides because the surface looks like configuration.

**Ideal teaching artifact.** A *two-pane animation* — left pane shows the server component file with the bare import highlighted; right pane shows the imported module's source with its top-level `fetch(...)` call. An arrow loops from the import line to the top-level body and back, with a counter incrementing on each "render." Then the student is asked to predict: "when does the fetch fire?" After predicting, the animation runs and shows the fetch firing on every server render. The mental model is fixed by the *contemporaneous* highlight of the two files. Archetype: *Concept* with a controllable predict-then-reveal.

**Engagement.** A `PredictOutput`-style prompt before the animation runs: "given this server component is rendered 50 times in a minute, how many fetches fire to the analytics endpoint?" The student types a number; the reveal shows 50 and explains why.

**Components.**
- Hand-SVG inside `Figure` for the two-pane diagram with the import-to-top-level arrow. Animation is optional; a static two-pane composition with the arrow already teaches the model, and this is single-use in the chapter.
- `PredictOutput` for the "how many fetches fire" prediction.

**Project link.** Finding 2 in the review. The animation is what makes "principle #6 — explicit over magic" land on this specific bypass.

## Concept 7 — Derive don't sync vs. memoize

**Why it's hard.** Students who've internalized "derived values should be cheap to recompute" still reach for `useMemo` when they see a derivation; some reach for `useState`+`useEffect`. The senior cut is sharper: if a value is *derivable* from props or other state, don't store it at all. `useMemo` is a performance optimization on a value that's already correctly derived inline; `useEffect` to sync derived state is the bug. The student needs to see all three forms back-to-back to feel which one is the answer.

**Ideal teaching artifact.** A *three-way comparison panel* showing the seeded `seat-usage.tsx` rewritten three ways: (A) `useState` + `useEffect` syncing — the bug; (B) `useMemo` over `seatsAllocated - seatsUsed` — the half-right fix; (C) inline `const seatsRemaining = seatsAllocated - seatsUsed` — the senior call. Each tab annotates the failure mode of (A), the unnecessary complexity of (B), and why (C) is correct. The panel is bracketed by a single shared scenario (props update from a parent during render) that visibly differentiates the three. Archetype: *Pattern* taught wrong-then-right-then-righter.

**Engagement.** A `MultipleChoice` with one correct answer and `useMemo` as the seductive decoy: "the right action for this comment is — (a) wrap in `useMemo`, (b) delete the state and the effect, compute inline, (c) move to `useReducer`, (d) leave a `nit:`." The seductive decoy is the recall.

**Components.**
- `CodeVariants` for the three-tab comparison (sync / memo / inline).
- `MultipleChoice` with `useMemo` as the seductive decoy.

**Project link.** Finding 4 in the review. The rubric's senior-reach criterion is explicitly "delete the state and the effect, not memo it."

## Concept 8 — The three-test ADR inclusion check

**Why it's hard.** Every change in a PR is a decision in some sense. Students either over-record (an ADR for every helper they add — drowns the index) or under-record (no ADR, the decision evaporates). The three-test check — multiple files affected, reasonable alternatives, costly to reverse — is the filter that lets one decision per PR earn the document and the rest go unrecorded.

**Ideal teaching artifact.** A *triage panel* — the diff's three candidate decisions (`planLabel` column add, the `cacheTag` strategy, the `lib/plan/` co-location) each get a row; the student fills three checkboxes per row (multi-file? real alternative? hard to reverse?) and the row scores ADR-worthy only when all three fire. The `planLabel` row fails on tests 2 and 3; the `cacheTag` row passes all three; the co-location row fails on test 1 (it's convention application, not a new decision). The structure of the panel makes the rule structural — students don't memorize "three tests," they run the checklist. Archetype: *Decision* run as an interactive worksheet.

**Engagement.** The worksheet itself is the assessment. Follow-up: a single `MultipleChoice` framing — "out of the three candidates, which earns the ADR?" — confirms the call lands.

**Components.**
- New: `InclusionCheck` — inputs: an array of `{ candidate: string, tests: { label: string, passes: boolean, reason: string }[], verdict: 'include' | 'exclude' }`; renders rows with checkboxes; reveals per-test reasoning and the overall verdict on submit. Forward-link: ADR practice in any future unit that surfaces architectural decisions, and the same shape applies to other "earns-its-weight" filters across the course (e.g., "does this earn an LLM surface?" in 23.1, "does this earn a microservice extraction?" in later units).
- `MultipleChoice` for the confirmation.

**Project link.** Lesson 22.4.4 explicitly runs this check across the diff's three candidates; the worksheet *is* the lesson's opening beat.

## Concept 9 — The crisp Decision line vs. the hedge

**Why it's hard.** Students hedge in the Decision section because writing "we will X" feels like committing in a way that the surrounding context doesn't. They write "we are considering caching..." or "we should cache..." — the hedge belongs in Context (as the alternative considered) or Consequences (as the reversal cost), never in Decision. The Decision line is the load-bearing sentence the rest of the document is *about*; a hedge collapses it.

**Ideal teaching artifact.** A *hedge-removal drill*. Six candidate Decision lines appear side-by-side, ranked from worst to best — "we should consider caching...", "we'll probably cache...", "we'll cache it for now...", "we're caching...", "We cache the entitlement read...", "We will cache `getPlanEntitlement(orgId)` with `cacheTag(...)` and invalidate via `updateTag` at every mutation seam." For each, the student labels: hedge / weak / acceptable / crisp. The exercise teaches the cut by tasting it across a spectrum, not by stating the rule. Archetype: *Pattern* taught by ranking variants.

**Engagement.** A `Buckets` sort of the six variants into the four labels. After the sort, the student types their own Decision line into a `TextAnswer` prompt; the AI grader scores it against the kernel "one declarative sentence, no hedging modal verbs, names the mechanism."

**Components.**
- `Figure` holding the six variants laid out in a ranked column with reveal-on-click labels. Single static composition.
- `Buckets` for the four-label sort.
- `TextAnswer` for the write-your-own-Decision line check.

**Project link.** The rubric is strict on this line — a hedge in the Decision fails the check even when Context and Consequences are full. This concept is the rehearsal of the call.

## Concept 10 — Honest Consequences with named seams

**Why it's hard.** Students write Consequences as a sales pitch — three upside bullets, no costs, no reversal path. The "everyone must call `updateTag`" line is the failure mode: it's prose where it should be a list. A future maintainer reading the ADR can't grep prose for the seams to audit; they can grep a list. The structural enforcement is the list, not the rule.

**Ideal teaching artifact.** A *two-version diff* of the same Consequences section — the prose version ("every mutation must call updateTag, and the cache life is minutes, and reversal is cheap") next to the listed version (six bullets naming the exact files: `lib/billing/upgrade.ts`, `lib/billing/downgrade.ts`, `app/(app)/plan/actions.ts`, etc., plus a reversal-cost bullet, plus a `revalidateTag` vs. `updateTag` cut bullet). The student is asked a single audit question between the two: "six months from now, you add a new plan-mutation endpoint. Which version of this ADR tells you to call `updateTag`?" The grep-test is the load-bearing distinction. Archetype: *Pattern* taught from the future-maintainer's perspective.

**Engagement.** The student writes their own Consequences list against the seeded diff, then runs a self-check against three criteria: (1) every mutation seam is named with a file path, (2) at least one cost is named honestly, (3) the reversal path is named. A short `TrueFalse` round on three rubric statements confirms the criteria stuck.

**Components.**
- `TabbedContent` for the two-version Consequences comparison (prose vs. list), with the grep-test question as the section caption.
- `TrueFalse` for the three-criteria recall.

**Project link.** The rubric awards full Consequences credit only when the mutation seams are *listed*, not when the obligation is described in prose. This concept is the rehearsal of that move.

## Concept 11 — Commit before peek; the rubric as second teacher

**Why it's hard.** Self-grading only trains the reflex when the grading happens *after* the deliverable is irreversibly committed. A student who checks the rubric first writes the deliverable to match the rubric, which trains nothing. The discipline is structural: the commit is the gate. The course teaches this by making the gate explicit and naming the honor-system contract — there is no answer key on a real PR review, so the rehearsal must mimic the constraint.

**Ideal teaching artifact.** A *two-state walkthrough* — state 1 is the pre-commit state: the rubric tag exists, the student knows the command to check it out, the student does not run it. State 2 is post-commit: the student runs `git fetch && git checkout v1.0-answer-key -- solution/...`, the rubric lands, the side-by-side compare begins. The artifact frames the *temporal* discipline — the gate is named, the command sequence is shown, the student commits to the constraint in writing (a one-line note at the top of `reviews/22.4.md`: "rubric not consulted before commit"). Archetype: *Setup/wiring* extended into a discipline-naming beat.

**Engagement.** A short `MultipleChoice` on the calculus — "which of these is the senior posture? (a) check the rubric, draft to match, commit; (b) draft from the principle-pattern map, commit, then check; (c) skip the rubric, the deliverable is its own grade; (d) draft and check the rubric per-finding to course-correct." The seductive decoy is (d), which sounds responsible but trains nothing.

**Components.**
- `Steps` for the literal command sequence (commit → fetch → checkout → diff).
- `Aside` (caution) naming the honor-system contract.
- `MultipleChoice` for the calculus.

**Project link.** Lesson 22.4.5 *is* this concept landing — the commit happens, then the rubric checkout, then the scoring pass per finding.

## Component proposals

- **`SeverityCalibration`** — Renders a sequence of review-finding snippets one at a time, with five severity buttons; reveals the rubric reason and a running score after each call.
  - **Uses in this chapter** — Concept 5.
  - **Forward-links** — Any chapter teaching a judgement call over a fixed taxonomy: security threat categorization (Chapter 17.3), observability signal-priority sorting (Unit 20), product-decision frameworks. The "graded round over a small taxonomy" shape recurs.
  - **Leanest v1** — A wrapper around the existing `MultipleChoice` component preloaded with severity choices and styled per-severity. If a sequence-of-questions shape doesn't yet exist, that's the v1 lift; the per-question reveal can be the standard `MultipleChoice` explanation slot.

- **`InclusionCheck`** — Renders a list of candidate decisions; each row has N checkboxes (the test criteria) and a verdict cell that reveals only when all checkboxes are answered. Reveal panel shows per-test reasoning.
  - **Uses in this chapter** — Concept 8.
  - **Forward-links** — Any "earns its weight" filter the course teaches: the LLM-surface triggers (23.1.1), the microservice-extraction call in later units, the "is this an ADR?" check repeating across future architectural decisions, the test-coverage triage. The three-test shape is portable to any N-test filter.
  - **Leanest v1** — A static `Figure`-wrapped table with the three candidates as rows, the three tests as columns, a click-to-reveal verdict cell per row. No state machinery needed if the per-row reveal is the only interaction. If the interactive checkbox-per-test moment is what teaches, build the interactive version; otherwise the static table reaches the bar.

## Build priority

`InclusionCheck` carries the most teaching load across the curriculum — the three-test inclusion shape repeats every time the course teaches a judgement filter (ADRs here, LLM surfaces in 23.1, microservice extraction later, test-coverage triage). Build it first, and at the leanest scope that still teaches the per-test reveal.

`SeverityCalibration` is narrower — Chapter 22.4 is its primary site, with credible reuse in security threat triage and observability signal sorting. If `MultipleChoice` already supports per-question reveal in a sequence, the v1 is a thin styling wrapper; defer the full component until the second use lands.

## Open pedagogical questions

- Concept 3's "find the absence" exercise depends on whether `Tokens` can render a clickable call-site target whose kernel is "this site is missing the wrapper." If the component's click-targets must be present in the source, the fallback is `MultipleChoice` framed as "what's missing from this action?" — confirm before authoring.
- The misordering ambush in Concept 1 wants the same diff to play out in two pass orders. The hand-SVG `Figure` reaches the teaching bar, but a scrubbable side-by-side timeline (two parallel `DiagramSequence`-style tracks driven by one slider) would land harder. Check whether `DiagramSequence` supports two synchronized tracks before scoping; if not, the static two-path SVG is the call.
