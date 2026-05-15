# Chapter 22.2 — Docs that live in the code

## Concept 1 — The public-surface cut for TSDoc

**Why it's hard.** Two opposite defaults dominate junior codebases: TSDoc every export "for completeness" until the file is half comment, or skip TSDoc entirely and force the next reader into the implementation. The cut between them — *public surface only* — is a judgment call made declaration by declaration, and the student has never been trained to make it.

**Ideal teaching artifact.** A *Buckets-style triage gauntlet*: the student sees a single-screen file tree from a SaaS repo with twelve declarations highlighted — a Server Action, two internal helpers in the same `lib/invoices/` module, a Drizzle `pgTable`, a Zod schema re-exported from the API boundary, a React `<InvoiceRow>` component, a one-line `isAdmin` predicate, a webhook handler, a test helper, a `z.infer` type alias, a deprecated wrapper, and a private formatter. The student drags each into *Earns TSDoc* or *Doesn't*. After submission, each card flips to reveal the senior's answer with a one-line rationale tied to the three-part inclusion test (crosses a module boundary, type alone is insufficient, next caller is hovering at the call site). The mistakes are the lesson; the correct sorts confirm the cut.

**Engagement.** The Buckets sort *is* the assessment for this concept. Follow it with a 30-second confirmer: a `MultipleChoice` asking "which of these is the *strongest* reason this exported function earns a block" against four plausible reasons (the surface test, "everyone exports it," "the body is complex," "the team agreed to be consistent") to lock the inclusion test as the criterion.

**Components.**
- Existing: `Buckets` (two-column: *Earns TSDoc* / *Doesn't*) with the file-tree context rendered above it inside a `Figure`, followed by `MultipleChoice`.
- The reveal — flipping cards to senior rationale — is not native to `Buckets` today; the lesson can substitute by following the sort with an `AnnotatedCode` walkthrough of the same twelve declarations, each step revealing the rationale.

**Project link.** Lesson 22.4.3 includes a finding where a Server Action ships without TSDoc; this concept's cut is exactly what the student applies to mark it `blocking:`.

---

## Concept 2 — First-sentence-as-hover writing posture

**Why it's hard.** Even students who agree TSDoc is worth writing default to expository openers ("This function is used to…", "Helper for…") because that's how every README they've ever read starts. They have never been trained to write for an IDE tooltip where the first sentence *is* the doc and the rest is below the fold. The reflex is muscle memory, not knowledge.

**Ideal teaching artifact.** A *side-by-side hover simulator*. The lesson renders a synthetic IDE-hover popover (`Figure` with hand-SVG) showing what a caller sees when they hover a function. The student is given a function signature and three candidate first sentences — one expository ("This function is used to create an invoice draft from a customer ID and a list of line items"), one verb-first and tight ("Creates an invoice draft and returns its id"), one bloated with internal detail ("Maps the line items through the tax calculator and writes a row to the invoices table"). For each candidate, the simulator shows what the hover would surface in two seconds of reading. The student picks the winner, then sees the senior's annotation explaining why verb-first beats both — the expository one wastes the only line the reader actually reads; the bloated one leaks implementation into a contract.

**Engagement.** A short `Tokens` pass on a single longer TSDoc block: the student clicks the spans that belong in the first sentence (verbs, return semantics, the one precondition) and not the spans that belong below the fold (internal rationale, examples, `@throws` detail). The click pattern is the recall — the student is forced to mark the *boundary* between hover-line and below-fold.

**Components.**
- Primary: a `Figure` containing a hand-SVG mockup of a VS Code hover popover with the three candidates rendered inside, followed by `MultipleChoice` for the pick and `Tokens` for the boundary drill.
- Alternative: a new `HoverPreview` component (signature + candidate first sentence input, renders a tooltip-styled preview) would compound across lessons that teach API documentation — see proposals.

**Project link.** The Server Action finding in 22.4.3 will be reviewed for whether its TSDoc first sentence states the contract in one line; this is the rubric the student now owns.

---

## Concept 3 — Link, don't duplicate (TSDoc edition)

**Why it's hard.** A junior writing TSDoc on a Server Action that takes a Zod-validated input will paraphrase the schema field-by-field into `@param` lines. It looks thorough. Three releases later the schema has gained two optional fields and dropped one; the TSDoc still claims the old shape; the IDE hover lies. The misconception is that "more detail in the doc = better doc"; the senior reality is that duplication is the failure mode.

**Ideal teaching artifact.** A *drift time-lapse*. A two-panel `DiagramSequence` shows a function and its TSDoc at three points in time. Panel one: initial commit, the TSDoc paraphrases the Zod schema (six `@param` lines mirroring six schema keys). Panel two: a PR adds an optional `taxRateOverride` field to the schema; the TSDoc is unchanged. Panel three: a second PR renames `customerId` to `customerUuid`; the TSDoc still says `customerId`. The student scrubs through and watches the doc become a fossil. Then the lesson shows the same scenario with the linked version — the TSDoc says "validates against `[InvoiceInputSchema]`" and points to the schema file — and scrubs through the same two PRs: the doc keeps telling the truth because there's nothing to drift.

**Engagement.** A `PredictOutput`-style call: given the third-panel state from the drift version, the student is asked "what does the IDE hover claim, and what is actually true?" The mismatch is the answer they have to articulate (free text or a two-option pick), forcing the duplication-as-drift point into recall.

**Components.**
- Primary: `DiagramSequence` with two parallel tracks (duplicated vs. linked) rendered as code panels at each timestep, followed by a `MultipleChoice` framed as a prediction.
- Alternative: a *single-use* hand-SVG inside a `Figure` could carry the time-lapse for cheaper, but `DiagramSequence` already exists and the scrubbing is the lesson — use it.

**Project link.** Not directly exercised in 22.4, but reinforces the schema-as-doc reflex that 22.4 expects the reviewer to defend when paraphrased docs appear.

---

## Concept 4 — Why-not-what: the inline-comment inclusion test

**Why it's hard.** Two camps fight here. The over-commenter narrates every line because that's what "good documentation" looked like in their bootcamp. The minimalist strips every comment because "the code is the doc." Both lose the load-bearing comments — the ones documenting a Postgres quirk, a Stripe ordering bug, a deliberate non-obvious choice — that the next reader has no other way to learn. The student needs an inclusion test that catches the load-bearing cases and rejects the noise.

**Ideal teaching artifact.** A *wrong-by-default sandbox*: the lesson opens with a real-feeling 80-line Server Action that has fifteen inline comments inserted — a deliberate mix of restating-the-code noise, section dividers, an author stamp, a bare TODO, a commented-out block, and four genuinely load-bearing constraint comments (a Postgres microsecond-truncation note, a Stripe out-of-order workaround, an intentional-deviation comment naming a query-plan cost, and a load-bearing ordering comment between an audit-log write and an email enqueue). The student's job: delete every comment that doesn't earn its place. They submit; the grader shows which deletions matched the senior's cut and which load-bearing comments they almost lost. The artifact carries its own assessment — the deletions *are* the test of whether the student can recognize a `// why`.

**Engagement.** The sandbox carries the assessment. Confirm recall with a follow-up `MultipleChoice` on a sixteenth comment shown in isolation — "delete, keep, or rewrite" — drawn from a borderline case (a comment that's part `// why` and part restating-the-code; the senior answer is rewrite to keep the constraint and drop the narration).

**Components.**
- New: `CommentTriage` — a code block with comments individually marked deletable/keepable by the student, criteria-graded. Inputs: code body, comment annotations with verdicts and rationales, success threshold. Output: per-comment feedback after submit.
- Alternative (single-use fallback): `CodeReview` repurposed — the student leaves an inline comment of `delete` or `keep` on each existing comment line, AI-graded against the kernel rubric. Awkward fit (the tool expects review prose on diffs), but functional without new components.

**Project link.** The 22.4.3 stripped-comment finding is exactly this concept's recall: the student notices that the diff dropped a load-bearing comment without preserving the constraint, and writes a `blocking:` on it.

---

## Concept 5 — The four kinds of `// why` and the negative space

**Why it's hard.** Once the student accepts "why, not what," they still need a taxonomy that turns the rule into a checklist they can apply at the keyboard. *Constraint*, *workaround*, *intentional deviation*, *load-bearing weirdness* — these are not memorizable categories without examples that show each in its native habitat, and the watch-outs (commented-out code, bare TODOs, section dividers) only land when the student has tried to write each kind themselves.

**Ideal teaching artifact.** A *catalog with cases*. Four pairs of code blocks rendered side-by-side inside `TabbedContent` (or four `Card`s in a `CardGrid`), one tab per kind of comment. Each tab shows the code *with* the comment and a one-line gloss naming why this kind earns its place. Below the catalog, a `Matching` drill: eight one-line comments on the left, four kind-labels plus a fifth "doesn't earn its place" on the right. The student matches each comment to its kind — including three that should land in the "doesn't earn" bucket — and the matching artifact tests whether the student internalized the taxonomy by application, not memorization.

**Engagement.** The `Matching` drill is the recall moment — the eight-on-the-left forces the student to classify, and the three negative-space items prevent the student from defaulting to "all comments are valid, pick a kind."

**Components.**
- Existing: `TabbedContent` (or `CardGrid` of `Card`s) for the four-kind catalog, then `Matching` for the drill.
- Each catalog panel embeds a small `Code` block.

**Project link.** Strengthens the comment-related finding in 22.4.3 — once the student can name *which kind* of `// why` a stripped comment was, the `blocking:` rationale writes itself.

---

## Concept 6 — Comments as code: the refactor-survival and promotion ladder

**Why it's hard.** Even students who write good `// why` comments treat them as collateral when they refactor — extract a function, rename a variable, simplify a branch, and the comment that protected the senior's ordering invariant gets stripped because it "no longer applies to the new lines." Three releases later the bug returns because nobody remembered the constraint. The deeper move — *promote the comment to a type, an assertion, a transactional boundary, a function signature that makes the bug unwriteable* — is invisible until the student sees it walked end to end.

**Ideal teaching artifact.** A *guided promotion path*. The lesson opens with one real piece of code: two `await` calls in a function, separated by a senior-written `// Order matters: the audit log entry must commit before the email enqueue, or a crash mid-transaction loses the audit row but keeps the email.` Then a `DiagramSequence` walks four states of the same code. State one: the original with the comment. State two: a junior refactor extracts the two awaits into a helper and drops the comment. State three: the senior catch — the same logic, comment restored, with prose explaining the discipline of carrying the comment with the lines it explains. State four: the *promotion* — both awaits wrapped in a single transactional function whose name and signature make the ordering impossible to violate. The student watches the comment die because the type system now carries the constraint — the "make the bug hard to write" upgrade rendered as a real progression.

**Engagement.** A `Sequence` drill at the end: four cards naming each state out of order — *(a) bare code, (b) code with comment, (c) refactored, comment stripped, (d) constraint promoted to transactional helper* — and the student drags them into the senior's preferred discovery-and-fix order. The reorder forces the student to articulate the ladder: comment is the bridge, promotion is the win, stripping without preserving is the failure mode.

**Components.**
- Existing: `DiagramSequence` with code panels at each timestep, followed by `Sequence`.
- The four-state code progression sits inside the sequence component's slides; no new component needed.

**Project link.** The 22.4.3 stripped-comment finding asks the reviewer to either restore the comment or propose the promotion. The ladder this concept teaches is the exact reasoning the student writes into the comment body.

---

## Concept 7 — TSDoc vs. inline comment vs. ADR: the scope cut

**Why it's hard.** Students confuse these three doc surfaces because they all carry prose about code. The TSDoc that explains a function's contract gets bloated with architectural rationale that belongs in an ADR; the inline `// why` that names a local constraint gets promoted to a TSDoc block where it adds noise to the hover; the ADR gets reduced to a paragraph at the top of a schema file where nobody finds it. The fix is a scope diagram, but it has to render the three surfaces *as the reader experiences each one*, not as abstract categories.

**Ideal teaching artifact.** A *three-lens visualization*. A single `Figure` shows the same hypothetical decision — "we serialize webhook events to an idempotency table before processing" — rendered three ways. Lens one: an IDE-hover popover at a call site showing the TSDoc summary (contract: what the function accepts, what it returns, what it throws). Lens two: an inline-comment view rendered as a code snippet showing the `// why` on the line where the idempotency key is read (local rationale: why this specific line uses `event_id` not `created_at`). Lens three: an ADR file rendered as a markdown panel (Context, Decision, Consequences — architectural rationale spanning multiple files). The student sees the *same fact* surface differently in each medium, and the framing question — *which reader needs which view?* — answers itself.

**Engagement.** A `Buckets` sort with three columns (*TSDoc*, *`// why`*, *ADR*) and ten prose snippets. Each snippet is a sentence of doc-worthy content; the student decides which surface it belongs on. The snippets are deliberately constructed to feel ambiguous on first read; the answers are unambiguous once the scope cut is applied.

**Components.**
- Existing: `Figure` containing a hand-SVG composition with the three lenses (hover popover, code block with inline comment, ADR markdown card) side-by-side; then `Buckets` with three columns.
- Bespoke alternative: a `DocSurfaceLenses` component rendering all three views from a single content prop. Single-use here, no forward-link inside the curriculum — demote to hand-SVG inside `Figure`.

**Project link.** Lesson 22.4.4 has the student decide whether a finding becomes an ADR or stays as a TSDoc/comment. This concept is the criterion they apply.

---

## Concept 8 — The five-artifact reflex at PR-open time

**Why it's hard.** Every previous concept defines a doc that exists somewhere in the repo. The reflex this concept teaches is the *traversal*: every time the student opens a PR, they must walk five artifacts (README, AGENTS.md, ADRs, TSDoc, inline comments — plus the `.env.example`/schema-header siblings) and ask *did this diff invalidate a claim that artifact makes?* The reflex is muscle memory; without it the discipline survives no longer than a single sprint.

**Ideal teaching artifact.** A *diff-to-doc-impact simulator*. The student sees a simulated PR diff (4–6 hunks across multiple files: a renamed Server Action with a changed throw set, a new env var added to `env.ts`, a schema column whose invariant changed, a `// why` comment stripped during a refactor, a new third-party SDK added to `package.json`). A side panel lists the five artifacts as toggleable cards. For each hunk, the student clicks every artifact the hunk should force them to update. Submit reveals the senior's mapping with a per-hunk rationale. The exercise *is* the reflex — the student practices the five-artifact traversal six times in fifteen minutes, which is what muscle memory takes.

**Engagement.** The simulator carries the assessment. Confirm with a single closing `TrueFalse` round of five statements about edge cases ("a one-line tax-rate constant change requires a README update," "a deprecation requires both a TSDoc `@deprecated` and an AGENTS.md entry," etc.) — score-and-review locks the boundary cases.

**Components.**
- New: `PRDocImpact` — given a diff (multiple hunks) and a list of doc artifacts, the student maps each hunk to the artifacts it touches; criteria-graded. Inputs: diff hunks, artifact list, per-hunk-correct-artifact mapping, per-pair rationales. Output: per-hunk feedback with rationale on submit.
- Alternative: `CodeReview` adapted — the student leaves a "touches: README, TSDoc" tag-comment on each hunk, AI-graded against a kernel rubric. Functional but loses the structured-mapping clarity.
- Existing follow-up: `TrueFalse` for the edge-case round.

**Project link.** Chapter 22.4's review-the-PR project is exactly this reflex applied at full scale. The student arrives at 22.4 having practiced the five-artifact pass twice; this concept is the rehearsal.

---

## Concept 9 — Lint catches mechanical drift, review catches semantic drift

**Why it's hard.** Teams that adopt doc-discipline often over-trust automation — "we have `eslint-plugin-tsdoc`, drift is solved." The dangerous drift is the kind no tool sees: the TSDoc that still parses cleanly but no longer describes the function's behavior; the `// why` comment that still references a constraint the code has since removed. The student must internalize *where the boundary sits* so they don't outsource the wrong half of the check.

**Ideal teaching artifact.** A *two-column field guide* inside a single `Figure`. Left column: *Lint catches* — `@param` mismatches against the TypeScript signature, `.env.example` keys missing from `env.ts`, malformed TSDoc syntax, broken `@see` links. Right column: *Review catches* — the prose first sentence that no longer matches the behavior, the `@throws` that omits a new failure mode, the `// why` whose underlying constraint was silently fixed three PRs ago, the AGENTS.md "don't" rule that the new dependency violates. Each row in each column shows a one-line example. The student reads it once; the load is in the contrast.

**Engagement.** A `Buckets` two-column sort: eight drift scenarios are dropped between *lint catches* and *review catches*. The boundary cases — a stale TSDoc summary on a renamed function, a `@throws` that names a removed error class — are the ones that test whether the student understands "still parses" is not "still true."

**Components.**
- Existing: a `Figure` containing a two-column hand-SVG (or a simple two-column HTML composition); `Buckets` for the sort.
- No new component needed — the contrast is the artifact and `Buckets` is the recall.

**Project link.** Reinforces the reviewer's instinct in 22.4 that the *prose* of the doc is what they verify, not the mechanical tag set.

---

## Component proposals

- **`HoverPreview`** — renders a synthetic IDE-hover tooltip given a function signature and a candidate doc string. Shows what the reader actually sees in the first two seconds of hover.
  - Uses in this chapter: Concept 2.
  - Forward-links: Chapter 22.3 (review of TSDoc-bearing diffs), Chapter 22.4 (the project's TSDoc finding); plausibly any later lesson that teaches API design and wants to render "what does the caller see?".
  - Leanest v1: a static `Figure` template that takes a signature string and a doc string and renders a `<div>` styled like a VS Code popover with the first sentence emphasized. No interactivity. Author calls it three times for the three candidates.
- **`CommentTriage`** — a code block whose individual `//` comment lines are clickable; the student marks each as *keep*, *delete*, or *rewrite*; criteria match per-line verdicts with rationales revealed on submit.
  - Uses in this chapter: Concept 4.
  - Forward-links: Chapter 22.3 (the comment-anatomy lesson uses the same triage move on PR comments) and Chapter 22.4 (the project includes a stripped-comment finding the student must classify).
  - Leanest v1: a single `Code` block with checkboxes alongside each commented line, a submit button, and an answer-key reveal panel. No drag-and-drop, no scoring narrative.
- **`PRDocImpact`** — given a multi-hunk diff and a list of doc artifacts, the student maps each hunk to the artifacts it impacts. Criteria-graded with per-hunk rationales on submit.
  - Uses in this chapter: Concept 8.
  - Forward-links: Chapter 22.4 directly (the project *is* this reflex applied at full scale); also Chapter 22.3 (the review-stack pass order needs the same diff-to-impact intuition).
  - Leanest v1: render the diff inside a `Figure` and present a `MultipleChoice` (multi-select) under each hunk listing the five artifacts. The "multi-`MultipleChoice` per hunk" composition is buildable in MDX without a new component if forced — but the structured component carries the reflex more clearly.

## Build priority

`PRDocImpact` carries the most teaching load — it's the load-bearing reflex of Lesson 22.2.3, it directly rehearses the Chapter 22.4 project, and the five-artifact traversal is what the entire chapter has been building toward. Build it first.

`CommentTriage` is second: it carries the assessment for Concept 4 (the most-confused concept in the chapter, where misconceptions run in two opposite directions), and it forward-links into the comment-review work in 22.3 and 22.4.

`HoverPreview` is third — single-concept use in this chapter, but lightweight to ship (the v1 is essentially a styled `Figure` template) and the forward-link into 22.3/22.4 is real. Defensible to ship as a thin template-style component rather than a full interactive widget.

## Open pedagogical questions

- Concept 4's *wrong-by-default sandbox* is the most ambitious artifact in the chapter. If `CommentTriage` slips, the `CodeReview` fallback works but with notably lower teaching density — worth a human call on whether the new component lands in time or the lesson opens with a slimmer drill.
- Concept 7's three-lens visualization is a strong teaching move but assumes the student has already met ADRs in Chapter 22.1.4 with enough recall. If that chapter's ADR coverage skews thin, this concept may need a one-paragraph ADR refresher inline.
