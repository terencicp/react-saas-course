## Concept 1 — The review stack, top-down, never line-by-line

**Why it's hard.** Junior reviewers default to scrolling the diff from line 1 and flagging anything that catches the eye. By line 80 their attention is spent on `const` vs `let` and they miss the missing tenant filter on line 240. The fix is a prioritization stack, not more thoroughness.

**Ideal teaching artifact.** A *Concept* artifact built as a misconception-first ambush. Drop the student into a realistic 9-file diff with a clear "review this PR" prompt and no scaffolding. Once they've spent a minute scrolling, the lesson interrupts: here is what a senior would have flagged in the time you read past it — a missing `tenantDb` on file 2, a `Stripe` import outside `/lib/billing/` on file 4, an `import 'side-effect-mutating-globals'` on file 7. Then reveal the five-layer stack (correctness/security, principles, patterns, tests/contracts, style/polish) as the order that would have caught those three in the first thirty seconds. The teaching move is the contrast between the student's instinct-scan output and the senior's stack-scan output on the *same* diff.

**Engagement.** After the reveal, a `Sequence` drill: present six concerns scrambled from a different seeded diff (a leaked secret, a `boolean` flag pair admitting impossible states, a renamed identifier, an N+1 join, a missing test on a new code path, a `// TODO: refactor later`) and have the student drag them into the order the stack would surface them. Wrong orderings make the rule stick faster than the diagram.

**Components.**
- `CodeReview` with a deliberately curated 9-file diff for the ambush, run in *exploration* mode (no AI grade) so the student can drop comments before the reveal.
- `Sequence` for the post-reveal ordering drill.
- A static `Figure` holds the five-layer stack as a labeled stack diagram (hand-SVG), captioned with the failure mode each layer prevents.

**Project link.** This is the pass order the student runs in Chapter 22.4 before opening the seeded PR — 22.3 teaches the reflex, 22.4 grades it.

---

## Concept 2 — The principle/pattern map as the diff lens

**Why it's hard.** The seven principles and fifteen patterns are stable, but the student has met them spread across twenty-one units. At review time they don't recognize the *diff signature* — the specific shape on the page that signals "this didn't go through the established surface." Without the map, the comment never gets written.

**Ideal teaching artifact.** A *Reference* artifact shaped as a two-column lookup table the student can scan once and revisit forever: left column the diff signature ("`db.select().from(table)` with no `where(eq(orgs.id, ...))`"), right column the comment ("use `tenantDb(orgId)` — Lesson 10.x"). Build it as a `TabbedContent` panel split into Principles (#1–#7) and Patterns (#1–#15) so the student doesn't read twenty-two rows in one breath. Each row is a one-liner — no re-teach, every entry links back to the lesson that owns it. The teaching move is keying recognition by *shape on the page*, not by principle name in the abstract.

**Engagement.** A `Matching` drill: left column shows ten anonymized diff fragments pulled from real-feeling SaaS PRs (each one violates a principle or pattern); right column lists the canonical comments. The student matches signature to comment. Then a five-question `MultipleChoice` round on the trickier signatures (the `JSON.parse` of request body, the `revalidatePath` missing after a mutation) where the wrong answers look plausible.

**Components.**
- `TabbedContent` for the two-tab Principles/Patterns reference, with each row holding a small code fragment + comment line. Acceptable as-is.
- `Matching` for the signature-to-comment drill. Acceptable as-is.
- `MultipleChoice` rounds for the trickier signatures. Acceptable as-is.
- Alternative if `Matching` proves clunky on ten-row scale: `Buckets` with two categories ("uses the established surface" / "bypasses it") sorting the same fragments.

**Project link.** The seeded PR in 22.4 hides exactly five of these violations the student must surface — the map is the cheatsheet they bring to the project.

---

## Concept 3 — The reviewer's negative space

**Why it's hard.** A new reviewer's instinct is to comment on everything they noticed, because saying nothing feels like not doing the job. The result is twenty nits per PR, the author drowns in noise, and the real `blocking:` comment two-thirds down gets the same weight as a missing trailing comma. The discipline is *restraint*: knowing what the formatter, the linter, CI, the test suite, and the next PR already cover.

**Ideal teaching artifact.** A *Decision* artifact built as a wrong-by-default sandbox. Show a fictional PR review one of the student's peers actually left — twenty-three comments, varied. The lesson's question to the student: which of these comments belonged on this PR, and which should have been deleted, promoted to a lint rule, or filed elsewhere? The student walks the comments one by one. Each comment, when clicked, reveals the senior's verdict and the reason: this one is the formatter's job; this one is an off-topic refactor proposal that belongs in an ADR; this one is fine; this one is the same comment for the third PR in a row and should become a CI check; this one is genuinely load-bearing but buried in nits. The teaching artifact carries its own assessment — the student is graded by how their cuts align with the senior's.

**Engagement.** The sandbox-walk is the assessment. After it, a single `TrueFalse` round of five statements that confirms recall ("a comment that the linter already catches earns its weight if it teaches the author the rule," "a refactor proposal not load-bearing for this PR belongs in the review thread," etc.) — short, sharp, closes the loop.

**Components.**
- New component **`AnnotatedReviewWalk`** — a sandbox of N pre-written PR comments, each clickable to reveal the senior verdict (keep / cut / promote-to-lint / move-to-ADR) and a one-line reason. Single-pass progress bar; final score is the student's keep/cut alignment with the rubric. Single-use risk is real; see the alternative below.
- Alternative leaner v1 if the bespoke component isn't worth it: a static `Figure` listing the twenty-three comments in two columns (comment / senior verdict + reason) with a hand-coded "click to reveal" using a `<details>` per row. Carries the teaching with less infrastructure.

**Project link.** 22.4's rubric awards extra credit when the student *omits* aesthetic comments and keeps only the five load-bearing findings. This concept is the gate that enables that score.

---

## Concept 4 — The four-part comment anatomy and the severity labels

**Why it's hard.** Even a student who knows *what* to flag freezes when writing the comment. Vague observations ("this is wrong"), buried fixes ("…and another thing"), wrong severities (a blocking concern phrased as `nit:`) — each one wrecks an otherwise correct review. The fix is a shape so small the student writes it without thinking after a few reps.

**Ideal teaching artifact.** A *Pattern* artifact run as a guided puzzle. Show three real-feeling diff fragments side by side with three under-formed comments a junior wrote about them ("this isn't great", "consider refactoring this", "wrong"). The student rewrites each comment into the four-part shape (severity label, observation, reason, proposed action or question) using a small in-page editor with four labeled inputs. The lesson grades each rewrite against a rubric of three checks per field (severity matches the failure class; observation names the line or behavior; reason names the principle or pattern; ask is concrete and short). A second beat introduces the five severity labels (`blocking:`, `suggestion:`, `question:`, `nit:`, `praise:`) and names the Conventional Comments standard once, with a small reference card the student can keep open while they write.

**Engagement.** The puzzle-rewrites are the assessment. Confirm recall with a `Buckets` round: drop ten pre-written comments into the five severity bins, with two of them being trap shapes (a `question:` used to soften a position the reviewer is certain about — should be `blocking:`; a `nit:` on the missing tenant filter — should be `blocking:`).

**Components.**
- New component **`CommentBuilder`** — four labeled inputs (severity dropdown, observation, reason, action/question), shown alongside a code fragment, with per-field rubric grading and a "compose preview" of how the comment would render in a PR thread. Inputs: a small set of pre-authored diff fragments + rubric phrases per field. Output: the composed comment string + per-field pass/fail.
- `Buckets` for the severity-sort drill. Acceptable as-is.
- `Figure` holding the four-part anatomy as a labeled hand-SVG cell diagram (severity | observation | reason | action), captioned with the failure mode each missing field causes.

**Project link.** Every comment the student writes in 22.4 is graded against this shape. The `CommentBuilder` here is the dry run; 22.4 is the test.

---

## Concept 5 — Blocking versus suggesting, the load-bearing cut

**Why it's hard.** This is the single most useful discipline in code review and the easiest to fudge. The student knows the labels exist; they don't yet know that the *category* (objective failure vs. subjective preference) must be decided *before* the comment is written. The failure mode runs in both directions: marking style preferences as `blocking:` (gatekeeping) and marking real principle violations as `suggestion:` (epistemic cowardice). The map between failure class and label has to be made concrete.

**Ideal teaching artifact.** A *Decision* artifact built as a forced-choice puzzle. Present fifteen review comments on a single seeded PR. For each, the student picks one of two buttons: `blocking:` or `suggestion:`. After each pick, the senior's verdict appears with a one-line reason ("this violates Principle #3 — the side-effect import — the codebase has paid to establish this surface; objective failure, blocking" vs "the alternative factoring is genuinely cleaner but the current code isn't broken; subjective preference, suggesting"). The student sees their running accuracy and the specific patterns where their calibration drifts (over-blocking on style, under-blocking on patterns). The teaching artifact carries the assessment.

**Engagement.** The forced-choice round is the assessment. Confirm with a single `MultipleChoice` capstone: given a comment with no label, which of the three review states (`approve with comments`, `comment only`, `request changes`) matches it, and why? — one correct answer, three trap distractors that mix in the reviewer's mood.

**Components.**
- New component **`SeverityCalibration`** — fifteen comment cards, each with a two-button forced choice, per-card senior verdict + reason, and a final accuracy report broken down by failure class. Inputs: seeded comments tagged with the correct severity + a one-line rubric. Output: per-student calibration snapshot.
- `MultipleChoice` for the review-state capstone. Acceptable as-is.

**Project link.** The 22.4 rubric specifies that the verdict at the bottom of the review file must be `request changes` because all five findings are `blocking:`. Concept 5 is the reflex that gets the verdict right.

---

## Concept 6 — The language of disagreement and the receiving-review mirror

**Why it's hard.** Tone bleeds into outcome. The same correct technical observation, written three ways, produces three different author responses: prose-essay (ignored), blame-laden ("you bypassed `tenantDb`") (defensive reply), peer-to-peer ("this bypasses `tenantDb` — let's route through the helper, see Lesson 10.x") (acked and fixed). The student needs to feel the difference rather than read a rule about it. Symmetrically, when the student *receives* a review, they need a posture for pushing back honestly versus deferring out of habit.

**Ideal teaching artifact.** A *Pattern* artifact run as a side-by-side comparison. Pick four real review situations (a clear principle violation; an uncertain question; a stylistic preference the reviewer thinks is right; a junior's correct code where the reviewer was wrong on first read). For each, show three comment variants in a `TabbedContent` panel: hedged-into-uselessness, blame-laden-and-aggressive, and peer-to-peer-clear. The student reads each variant and picks which one the author would actually act on; the lesson then unpacks the differences in one line each — address the code not the author, questions when uncertain not when certain, one concern per comment, the suggestion-block threshold for short mechanical fixes. A second beat flips the seat: a short transcript-style scrollytelling panel where the student plays *author* receiving four comments — they pick "ack and fix," "push back with evidence," "ask a clarifying question," or "resolve-as-ignored" — and the lesson names which response a senior would write and why. The two beats together cover both sides of the comment thread.

**Engagement.** A final round of three short-form `TextAnswer` prompts: rewrite a hedged comment into peer-to-peer prose; rewrite a blame-laden comment into code-addressing prose; write the senior's reply to a comment the author disagrees with on evidence. AI-graded against short kernel phrases. This is the only place free-text is justified — the lesson's whole point is that *how it's phrased* is the deliverable.

**Components.**
- `TabbedContent` for the three-variant comparison panels. Acceptable as-is.
- `MultipleChoice` for the "which comment would the author act on" picks inside each scenario.
- `TextAnswer` for the three short rewrite prompts at the end. Acceptable as-is.
- For the receiving-review flip, a static `Figure` holding the four comment-reply situations as a labeled four-cell grid (situation | senior response | reason) with the cells revealed one at a time on a `<details>` toggle. Avoids a bespoke scrollytelling component for one use.

**Project link.** In 22.4 the student writes five comments end-to-end; the rubric grades phrasing as well as content. The peer-to-peer voice and the no-blame discipline are graded outputs.

---

## Component proposals

- **`AnnotatedReviewWalk`** — sandbox of N pre-written PR comments, each clickable to reveal a senior verdict (keep / cut / promote-to-lint / move-to-ADR) and a one-line reason; final score is the student's keep/cut alignment with the rubric.
  - **Uses in this chapter** — Concept 3.
  - **Forward-links** — could re-appear in Unit 23 or future review-related lessons, but no concrete near-term call site. Default to the leaner v1.
  - **Leanest v1** — a static `Figure` of the twenty-three comments in two columns (comment / verdict + reason) with each row wrapped in a native `<details>` for click-to-reveal. Carries the teaching without the bespoke infrastructure.

- **`CommentBuilder`** — four labeled inputs (severity dropdown, observation, reason, action/question) alongside a diff fragment, with per-field rubric grading and a composed-comment preview.
  - **Uses in this chapter** — Concept 4.
  - **Forward-links** — directly reused in Chapter 22.4 (Project: Review a PR, write the ADR) where the student writes five comments in this shape; the component is the dry-run rig for the project. Strong compounding case.
  - **Leanest v1** — drop the four inputs and instead reuse the existing `CodeReview` component in a constrained mode where the rubric grades the four-part shape per comment. If `CodeReview` can be parameterized with field-level rubrics, no new component is needed.

- **`SeverityCalibration`** — fifteen comment cards with a two-button `blocking:` / `suggestion:` forced choice, per-card senior verdict + reason, and a final accuracy report broken down by failure class.
  - **Uses in this chapter** — Concept 5.
  - **Forward-links** — none concrete in current outlines; the calibration shape (forced-choice + per-class accuracy report) generalizes to any "which category does this belong to" drill, but no specific reuse is planned.
  - **Leanest v1** — a sequence of fifteen `MultipleChoice` cards each with two options and an inline reason in the explanation slot. No new component; the only loss is the running calibration snapshot. Recommend v1.

---

## Build priority

`CommentBuilder` is the one to build first. It is the only proposed component with a concrete near-term reuse (Chapter 22.4), and its rubric-graded shape — severity + observation + reason + action — is the lesson's load-bearing deliverable. Before building it from scratch, check whether `CodeReview` can be parameterized with per-field rubric phrases; if yes, no new component is needed at all and the proposal collapses into a `CodeReview` configuration.

`AnnotatedReviewWalk` and `SeverityCalibration` should both ship as their leaner v1s (`Figure` + `<details>`, and a `MultipleChoice` sequence respectively). Neither has a forward-link strong enough to justify bespoke work in a single-use slot.

---

## Open pedagogical questions

- Can the existing `CodeReview` component accept a per-field rubric (severity / observation / reason / action) rather than a single `kernel` per comment? If yes, Concept 4's `CommentBuilder` proposal collapses into a `CodeReview` config and the chapter ships with zero new components.
- Concept 1's ambush depends on the student actually scrolling and trying to review before the reveal. If the page renders the stack diagram before the student engages with the diff, the misconception-first move collapses. Verify the layout — diff first, stack diagram only after the student commits an answer — at draft time.
