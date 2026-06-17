# Chapter 103 — The review surface

## Lesson 1 — Where the eyes go first

**Taught.** The five-layer review stack (correctness/security → architectural principles → SaaS patterns → tests/contract → style), the seven-principle and fifteen-pattern diff-signature reference tables, the "top-down on the stack, not on the file" prioritization reframe, negative space (what gets no comment), CI promotion corollary, PR-size threshold (~400 lines), the tautological-test anti-pattern, and a five-item always-look-for security scan.

**Cut.** The chapter outline's standalone "performance scan — when it earns its weight" sub-topic (triggers: list queries, joins, render paths, hot loops) was not built as a separate section; pattern-map row #15 covers it only as a one-liner diff signature. Tempo discipline (first-response / turnaround) was included inside "Right-sizing the review," not cut.

**Debts.** Severity labels (`blocking:`, `suggestion:`, `nit:`, etc.) and comment anatomy are mentioned in passing (e.g., "split this" is described as structural/non-negotiable, "blocking" used once in the StateMachineWalker leaf) but explicitly deferred to Lesson 2. The hands-on PR-review project is deferred to Chapter 104.

**Terminology.**
- *Review stack* — the five-layer ordered stack; always referred to top-down, never as a checklist.
- *Invariant defense* vs. *mistake-hunting* — core framing distinction; review defends established decisions, linter hunts mistakes.
- *Diff signature* — the visual pattern in a diff that flags a principle/pattern was skipped; used in both reference tables.
- *`tenantDb(orgId)`* — canonical tenant-scoped query helper; missing it in a `where` clause is simultaneously pattern #1 and a layer-1 security finding.
- *`authedAction(role, schema, fn)`* — sanctioned authed-action wrapper; hand-rolling `auth()` + `if (!user) throw` is the diff signature for pattern #2.
- *`{ ok: true; data } | { ok: false; error }`* — Result discriminated union; throwing on validation failure is the diff signature for pattern #6.
- *`processed_events`* — webhook dedup key; its absence is the diff signature for pattern #5.
- *`listInvoices()`* — used in the tautological-test CodeVariants as the canonical read-back helper (closes over `tenantDb(orgId)`; called with no filter arg).
- *Architectural principles #1–#7 / SaaS patterns #1–#15* — numbered consistently; Lesson 2 and Chapter 104 must use the same numbering.

**Patterns and best practices.**
- Pure functions live in `lib/<feature>/`; effects belong at the action seam (Server Actions), never inside lib helpers.
- Impossible states: prefer discriminated unions over boolean-pair types.
- When the same defect maps to two stack layers, the higher-severity layer wins (e.g., missing tenant filter = layer 1, not layer 3).
- Recurring manual review comments should be promoted to lint rules or CI gates.

**Misc.**
- The principle table and pattern table share an identical three-column shape (Principle/Pattern | Diff signature | The comment); Lesson 2 exercises and Chapter 104 project material should preserve this shape for consistency.
- The lesson deliberately omits severity-label prefixes (`blocking:` etc.) on the map-row comment examples — those are introduced in Lesson 2; do not backfill them here.
- Chapter outline listed `authedRoute` alongside `authedAction` as sanctioned carve-outs for principle #5; the lesson only mentions `authedAction`/`authedRoute` in the principle table note, not as standalone symbols.
- The `StateMachineWalker` "wrong-reflex" branch ("the variable name on line 3") leads to a gentle reset leaf, not a dead end — Chapter 104 project writers should note the student is expected to restart the walk, not abandon it.

## Lesson 2 — The comment that lands

**Taught.** The four-part comment anatomy (label → observation → reason → action), the five severity labels (`blocking:`, `suggestion:`, `question:`, `nit:`, `praise:`), the blocking-vs.-suggesting cut (objective failure vs. subjective preference), disagreement-language craft (opinionated/evidence-led/short, code-not-author, question-vs.-position, one-concern-per-comment), the `suggestion` markdown block mechanic, the author-side receiving posture, the review-action calculus (`request changes` / `approve with comments` / `comment`), the mirror habit, escalation-at-three-round-trips, and AI-comment calibration.

**Cut.** The chapter outline included "fast first response" tempo discipline (first contact within hours); the lesson omits it — not taught, not referenced.

**Debts.** "Escalate at three round-trips → capture as ADR if architectural" forward-links Chapter 104 for ADR mechanics.

**Terminology.**
- *Four-part comment anatomy* — label, observation, reason, action; four slots, one or two sentences total.
- *`blocking:` / `suggestion:` / `question:` / `nit:` / `praise:`* — the five labels, always lowercase with trailing colon; use exactly these strings in Chapter 104 and the quiz.
- *Conventional Comments* — the public standard (conventionalcomments.org) the course's five labels are a trimmed subset of; in the full spec `blocking` is a decoration (`suggestion (blocking):`), not a top-level label — the course promotes it deliberately. Do not "correct" this back to the spec.
- *Blocking-vs.-suggesting cut* — objective failure (fact of the matter, established decision violated) vs. subjective preference (code works, reviewer would do it differently).
- *Epistemic cowardice* — using `question:` to soften a position the reviewer is certain about; named and defined in-lesson with a `Term` tooltip.
- *`tenantDb` / `authedAction` / Result shape* — reused from Lesson 1 as canonical examples throughout; not re-taught.

**Patterns and best practices.**
- A `blocking:` comment always triggers `request changes`; approving over an open blocker is non-negotiable.
- The discipline is most visible in comments that *aren't* blocking: honestly labeling suggestions and nits as such is what makes `blocking:` trustworthy.
- `nit:` is rationed to one or two per PR; a third recurring nit should be promoted to a lint rule.
- `praise:` must name the specific good call; reflexive praise ("nice work!") is noise.
- One concern per comment; three concerns clustered on one line signals the function needs to split first.
- Mechanical fixes under ~5 lines with one obvious correct edit → use the `suggestion` markdown block; design changes → prose.
- Comment addresses the code, not the author; "you" is reserved for praise and direct questions.

**Misc.**
- The capstone `CodeReview` exercise reuses the two-file diff (`src/lib/invoices/list-invoices.ts` + `src/app/invoices/actions.ts`) with three `ReviewIssue` plants: missing `tenantDb` scope (`blocking:`), a correctly-scoped+paginated read (`praise:`), and a throwing validation path (`blocking:`). Chapter 104 project writers should not reuse identical file names/plants without differentiation.
- The `Figure` inline-inbox mock (severity-pill visual) is a hand-coded HTML+CSS component, not a named lesson component — referenced only in this lesson.
- The lesson deliberately omits platform UI tours; the only platform-specific content is the `suggestion` fenced-block syntax (GitHub), stated as platform-agnostic in posture.
