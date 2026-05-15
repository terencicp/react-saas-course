## Concept 1 — The audit is a read-only documentation pass, not a patch

**Why it's hard.** The student's reflex from every prior project chapter is "find a bug, fix the bug." This chapter inverts that reflex: the deliverable is the *report*, the target stays untouched. Students who don't internalize this early start opening branches against the target and lose half a session.

**Ideal teaching artifact.** A *Decision* framing built on a side-by-side contrast: two reactions to the same seeded bug, one a code patch (the wrong reflex), one a Markdown finding (the audit deliverable). The student reads both responses to the same `transferOwnership.ts` snippet and is asked to predict which one a launch reviewer wants on their desk before the prose answers. The artifact closes by naming the senior reason the reports separate from the patches: the *reporting cadence* (cheap, exhaustive) is a different skill from the *fixing cadence* (sequenced, prioritized), and conflating them produces a 5/8 audit that patched its three favorite findings.

**Engagement.** A two-option `MultipleChoice` after the contrast — "the seeded `try/catch` around `requireRole` is the bug; what's the *correct* next step in this chapter?" with "open a PR removing the catch" as the trap and "write a Markdown finding under `findings/001-fail-closed.md`" as the answer.

**Components.**
- `TabbedContent` (existing) — two panels labeled "patch reflex" and "audit reflex," each containing the same source snippet plus the response it triggers.
- `MultipleChoice` (existing) — the prediction check.

---

## Concept 2 — Eight categories are the coverage contract; depth comes second

**Why it's hard.** Without the contract, the student gravitates to whichever category they find interesting (usually CSP or XSS), produces a deep write-up on it, and leaves three categories silent. That output looks confident to the student and reads as a fail to a senior, which is the exact failure mode this chapter exists to install.

**Ideal teaching artifact.** A two-panel comparator in *Decision* form: "audit A" (5/8 coverage with one deep CSP finding) versus "audit B" (8/8 with one short finding per category). Each panel shows the same `findings/` directory layout, the same `SUMMARY.md` coverage tally, and a one-line senior verdict at the bottom. The student inspects both before being told which one passes the launch review, and the prose lands the rule afterward: *coverage is the floor; depth is the senior reach on top of coverage, never instead of it.*

**Engagement.** A `Buckets` drill where the student sorts eight seeded one-line observations (drawn from the eight target categories plus two out-of-scope distractors like "this React component should be memoized") into two columns: "in scope — open a finding" vs "out of scope — note in `out-of-scope.md`." Recall lands on what the eight categories *are* and what gets rejected.

**Components.**
- `TabbedContent` (existing) — the two-audit comparator.
- `Buckets` (existing) — the in-scope/out-of-scope sort.

---

## Concept 3 — The rule-location-consequence-fix template is the contract

**Why it's hard.** Junior reflex on the consequence field is "code smell" or "could potentially be exploited." Both forms read as opinion and fail at the launch review where the consequence column is read aloud to an audience that has not seen the code. The template's load-bearing column is the one students underweight.

**Ideal teaching artifact.** A *Pattern* archetype built around four parallel "consequence" rewrites of the same fail-closed finding, ranked from worst to best: (a) "code smell," (b) "could potentially allow unauthorized access," (c) "an attacker who triggers a connection blip during the membership check escalates to owner," (d) the senior version naming the *user-visible* and *operator-visible* failure modes together. The student reads them in order and the prose names what each rewrite earns and loses. The rule and location columns get short parallel treatment but the consequence column owns the lesson — that's the column students under-write.

**Engagement.** A `CodeReview`-style drill — except the artifact under review is a finding Markdown file, not a diff. The student leaves inline comments on a draft finding where rule, location, and fix are filled but consequence reads "this could be a problem." The AI rubric grades the comments against "named user-visible failure mode" and "named operator-visible failure mode."

**Components.**
- `Figure` with a hand-SVG four-tier consequence ranking — single-use here but cheap as static SVG and load-bearing for the rewrite drill that follows.
- `CodeReview` (existing) — the finding-review exercise. The component is built for diff review but its inline-comment + AI-rubric shape fits a Markdown finding well enough that no new component is warranted.

---

## Concept 4 — Read the running app and the source side by side

**Why it's hard.** Half the seeded findings (the missing CSP, the `NEXT_PUBLIC_` key in flight, the password-reset endpoint that never 429s) are invisible in a source-only read and obvious in a 30-second browser pass. Students who treat the audit as a code review miss them. Students who treat it as a manual QA miss the audit-log gap and the fail-closed bypass. The discipline is *both channels, always.*

**Ideal teaching artifact.** A *Mechanics* walkthrough cast as a paired-discovery sequence: for each of three seeded findings (CSP missing, `NEXT_PUBLIC_RESEND_API_KEY` in the bundle, password-reset unlimited), the student sees the source view and the browser view advanced together — the `next.config.ts` `headers()` block next to the `curl -I` output, the Client Component next to the DevTools Network row showing the key on the wire, the route handler next to a terminal showing ten 200s in a row. The sequence makes the dual-channel rhythm visible: where the source is silent, the running app speaks, and vice versa.

**Engagement.** A `Matching` drill — eight seeded findings on the left, "found via source read" / "found via running app" / "found via both" on the right. The student matches each to its *primary* discovery channel.

**Components.**
- `DiagramSequence` (existing) — the three paired-discovery frames; each step shows a source pane and a browser/terminal pane together. Reuses the existing scrubbable sequence shape; no new component needed.
- `Matching` (existing) — the discovery-channel sort.

---

## Concept 5 — Findings live at the bypass call sites, not in the canonical helpers

**Why it's hard.** The target ships `authedAction`, `safeLimit`, `logAudit`, `tenantDb`, and the typed `env` — and they are *correct*. Students new to auditing point the eye at the helpers, find them clean, and miss that the bug is the call site that *doesn't* go through the helper. The eye has to calibrate to bypass-spotting.

**Ideal teaching artifact.** A *Concept* artifact built as a labeled map of the target's six canonical seams (the wrappers from Unit 10 and 15 plus the typed `env`) with two annotation layers: green for *call sites that route through the seam* (correct), red for *call sites that bypass it* (findings). Each red annotation links to the finding it produces. The map makes visible the structural truth: the seams form the lint plane; the audit is reading for non-conformance, not for design flaws in the seams themselves.

**Engagement.** A `Tokens` drill on a code listing of `lib/admin/` and `lib/billing/`. The student clicks every call to a mutation that *should* be inside an `authedAction` and *should* call `logAudit`. The seeded misses (the `try/catch` swallow, the missing `logAudit`) are the correct picks; the correct call sites are clickable decoys.

**Components.**
- `Figure` with a hand-SVG seam map — six labeled boxes (the helpers), call-site annotations in green/red, finding-number tags on the red ones. Hand-SVG is correct here because the layout (helpers as the central plane, call sites radiating outward) carries the meaning, and the figure is single-use within this chapter.
- `Tokens` (existing) — the bypass-spotting drill.

---

## Concept 6 — Every finding cites the grep or curl that surfaced it

**Why it's hard.** A finding without a reproducible discovery command degrades to "I noticed this," which doesn't survive a launch review's "how did you find it" question. The senior discipline is that the location section names not just the file but the command — the audit is a *procedure*, not a vibe.

**Ideal teaching artifact.** A *Reference* archetype: a single scannable card of the eight category-to-command pairs (e.g. category 1 → `rg "'use server'" | rg -v "authedAction"`, category 4 → `curl -I http://localhost:3000/`, category 5 → `rg "passwordReset" app/api`, category 6 → `rg "db.transaction" lib/ | rg -v "logAudit"`, etc.). Each command is paired with the hit count the student should expect on the seeded target and the *one* legitimate hit per command that is not a finding (e.g. the public sign-up action is the legitimate `'use server'` without `authedAction`).

**Engagement.** A `Sequence` drill — the student orders the audit steps for category 6 (audit-log gaps): (1) enumerate the six canonical event categories, (2) grep `db.transaction` in `lib/`, (3) for each hit, search the block for `logAudit`, (4) flag transactions missing the call, (5) cross-check against the canonical event set. Recall lands on the rhythm: canonical set first, grep second, cross-check third.

**Components.**
- `Card` / `CardGrid` (existing) — the eight category-command pairs as a scannable grid.
- `Sequence` (existing) — the audit-step ordering.

---

## Concept 7 — XSS and CSP are two findings for one threat model

**Why it's hard.** Students see "we have a CSP now" and assume the XSS is mitigated, or see "we sanitized the note body" and assume CSP is optional. Both are wrong. The senior framing is that the sink (the `dangerouslySetInnerHTML`) and the layer of defense in depth (the nonce-based CSP with `'strict-dynamic'`) are *separately load-bearing* — each fails differently, each gets its own finding.

**Ideal teaching artifact.** A *Concept* artifact in two beats. First beat: a defense-in-depth diagram showing a malicious `<img onerror="fetch(...)">` payload reaching the rendered DOM, then meeting (or not meeting) two independent gates — the write-time sanitizer and the runtime CSP. Each gate is labeled with the finding number it produces when missing. Second beat: a 2×2 grid showing what happens in each combination (both present → safe; sanitizer only → safe today but historical-data attack vector; CSP only → blocks inline but not the network call to a same-origin route; neither → stored XSS in any org's notes).

**Engagement.** A `TrueFalse` round on four statements drawn from the 2×2 grid — "strict CSP alone fully mitigates a stored XSS in invoice notes," "sanitizing at write only is sufficient because historical writes are immutable," "the two findings can be combined into one because they're the same threat model," etc. Each card-by-card review names the layer that fails.

**Components.**
- `Figure` with a hand-SVG flow showing the payload meeting two gates plus the 2×2 outcome grid. Single-use within this chapter, layout-carries-meaning — `Figure` + hand-SVG is the correct call rather than a bespoke component.
- `TrueFalse` (existing) — the layered-defense check.

---

## Concept 8 — Some findings only surface from canonical-set discipline

**Why it's hard.** The audit-log gap in `lib/billing/transferOwnership.ts` produces no error, no broken behavior, no failed test, no console warning. Nothing visibly wrong renders. The only way to catch it is to hold the canonical six-category event set from 17.2.3 in one hand and walk every mutation in `lib/` past it. Students who audit by "looking for things that seem wrong" never see it.

**Ideal teaching artifact.** A *Pattern* archetype shaped as a checklist-against-listing drill: on the left, the six-category canonical event set as a fixed reference; on the right, a synthetic listing of every mutation in `lib/` (six mutations, one row each, showing the function name and a one-line summary of what it changes). The student is walked through the mental motion — for each mutation row, ask "does this fit one of the six categories?" and if yes "does the function call `logAudit` inside the transaction?" The seeded gap is the row where the answer is yes/no. Without the reference held parallel to the listing, the gap is invisible; *with* it, the gap is mechanical.

**Engagement.** A reuse of `CodeReview` on a synthetic `lib/billing/transferOwnership.ts` snippet — the student must leave an inline comment that names *both* the canonical event category the mutation belongs to *and* the missing `logAudit` call. The AI rubric grades on both axes; a comment that only flags "needs logging" without naming the category gets partial credit, matching the chapter's partial-credit rule.

**Components.**
- `Figure` with a hand-SVG two-column reference-vs-listing layout. Single-use within this chapter; static is fine.
- `CodeReview` (existing) — the canonical-set-grounded review.

---

## Concept 9 — Commit before peeking is the discipline that rehearses the real audit

**Why it's hard.** The honor-system answer-key tag is *the* senior move of this chapter, and it's the one that competes with the student's instinct to "just check if I'm on the right track." Students who peek before committing skip the rehearsal the chapter is built to provide — the real audit has no answer key, and the muscle to ship a finding without external confirmation is the muscle being trained.

**Ideal teaching artifact.** An *Ambush* archetype — a misconception-first beat. The lesson opens by acknowledging the temptation: "you've written eight findings; the tag exists; one `git checkout` away is the answer key; the friend you'd usually rubber-duck to is in this case a tag you control." Then it names the cost of peeking explicitly: the rehearsal value of the audit is in the no-feedback window, and the muscle the student is here to build is *deciding the audit is done without external confirmation.* The artifact frames the commit as the irreversible step — the line crossed, after which peeking is permitted. The senior tone is not "don't cheat" (juvenile); it is "you are choosing whether to get the practice you came for."

**Engagement.** A single-question `MultipleChoice` framed as the decision the student is about to make: "you've finished writing all eight findings; what's next?" with the trap option ("preview the answer-key tag to check coverage") and the correct option ("commit, *then* check out the tag") sitting side by side. The card review names which option preserves the rehearsal.

**Components.**
- `Aside` (existing) — the misconception-first ambush prose lands cleanly as a `caution` aside framing the temptation.
- `MultipleChoice` (existing) — the decision drill.

---

## Concept 10 — Partial credit: rule and location are the floor, fix detail is the senior reach

**Why it's hard.** The student who self-grades against the answer key and finds that their fix paragraph says "rename the env var" while the senior version says "rename, move the call server-side, *and* run the rotation runbook because the key is already in production" hears "I got it wrong" and either deflates or rewrites their finding to mirror the answer key. Both responses miss the lesson. The audit-grading rule is that the *rule and location are the load-bearing match* — those are what survive into the next audit at a different company; the fix detail is the depth signal, not the floor.

**Ideal teaching artifact.** A *Decision* artifact built as a three-panel comparator on a single finding (finding 5, the `NEXT_PUBLIC_RESEND_API_KEY`): panel A — rule wrong, location wrong (zero credit); panel B — rule and location correct, fix says "rename the variable" (partial credit, the audit floor); panel C — rule, location, *and* fix name the rename, the server-side move, *and* the rotation runbook (full credit, the senior reach). Each panel sits next to the senior verdict and the one-line reason. The artifact names what's portable across audits (the rule and the location pattern — "the `NEXT_PUBLIC_` prefix bypassed the server/client split") versus what's stack-specific (the rotation runbook detail).

**Engagement.** A `Buckets` drill — six seeded student-finding excerpts (one per audit category drawn from common partial-credit shapes) sorted into "audit floor — rule+location match" vs "senior reach — fix names the structural reach." Recall lands on which signal carries portability.

**Components.**
- `TabbedContent` (existing) — the three-panel finding comparator.
- `Buckets` (existing) — the floor-vs-reach sort.

---

## Project link

This chapter *is* the unit's project. Every concept above is directly load-bearing for the deliverable: concepts 1–3 install the audit's shape and the template contract; concept 4 installs the discovery rhythm the student runs against the seeded target; concepts 5–6 install the bypass-spotting and command-citation discipline that produce defensible findings; concepts 7–8 cover the two specific finding patterns most likely to be mis-shaped or missed entirely; concepts 9–10 install the commit-then-self-grade discipline that closes the audit. The `findings/` directory the student commits at the end of 17.3.5 is the artifact every concept above is rehearsing for.

---

## Component proposals

None. Every concept lands on an existing component (`TabbedContent`, `MultipleChoice`, `Buckets`, `CodeReview`, `DiagramSequence`, `Matching`, `Tokens`, `Card`/`CardGrid`, `Sequence`, `TrueFalse`, `Aside`) or a `Figure`-wrapped hand-SVG. The chapter's teaching weight is in disciplined real-world artifacts (the running app, the IDE, the `findings/` directory, the answer-key tag), not in bespoke widgets — building one-off components to wrap a static comparator or a defense-in-depth diagram would be over-engineering for single-use teaching artifacts. The existing `CodeReview` component, in particular, carries unusual load in this chapter (concepts 3 and 8) because its inline-comment + AI-rubric shape maps cleanly onto reviewing a Markdown finding, not just a code diff.

---

## Build priority

No new components proposed; nothing to prioritize. Worth flagging for the lesson authors: `CodeReview` is being asked to grade Markdown-file review comments in concept 3 and to grade two-axis comments (canonical category + missing call) in concept 8 — confirm those rubric shapes are within the component's existing capability before drafting.

---

## Open pedagogical questions

- Concept 9's ambush relies on the student actually being on the honor system. If the chapter is graded externally (e.g. a cohort instructor reviews the commit-then-peek sequence by checking `git log` against tag fetch timestamps), the ambush framing should acknowledge it; if it's self-paced personal study, the framing stays as-is. The chapter outline implies self-paced — confirm.
- Concept 8's `CodeReview` use asks the AI rubric to grade against the canonical six-category event set (a project invariant) rather than against a per-finding rubric phrase. If the component's rubric model is single-phrase per finding, this may need either a multi-rubric extension or a reframing of the engagement as a `MultipleChoice` ("which canonical category does this mutation belong to?") plus a separate `Tokens` click on the missing `logAudit` line.
