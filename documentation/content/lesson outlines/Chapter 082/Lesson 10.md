# Lesson 10 — Commit and self-grade

## Lesson title

Chapter-outline title "Commit and self-grade" fits — it names both the irreversible act and the senior reach. Keep it.
Sidebar short title: **Commit and self-grade**

## Lesson type

`Implementation`

This lesson produces three deliverable artifacts (`findings/SUMMARY.md`, `findings/out-of-scope.md`, and the two bonus findings written into SUMMARY) plus the commit-then-score act, all gated by `pnpm test:lesson 10`. The test-coder runs.

## Lesson framing

The student installs the senior reflex a real audit demands: run the whole pass under "no peeking until committed," then score yourself honestly against the key. They commit the eight findings in one irreversible commit, only then open the answer key, score each finding clause-by-clause with the partial-credit rule (rule + location is the floor, fix detail is the reach), surface the two bonus findings that push the score from 8/8 to 10/10, quantify every miss in `SUMMARY.md`, and fold every discovery command into a reusable personal checklist. The payoff is not the score — it is the rehearsal of an audit with no key, the discipline that the audit shape (name the rule, the location with its command, the consequence for a human, the senior fix) is portable to any codebase, and the closing recognition that finding and documenting is the job; patching is the next sprint's.

## Codebase state

**Entry.** Findings 001–008 are written from lessons 2–9. `findings/SUMMARY.md` and `findings/out-of-scope.md` still hold only their start TODO placeholder comments. The audit target is unchanged and boots green under `pnpm verify` with all ten defects live. The two bonus defects (finding 9 PostHog consent gate in `src/app/_components/providers.tsx`; finding 10 bare `signInLimiter.limit()` in `src/app/api/exports/trigger/route.ts`) are present but undocumented. The student has not consulted `solution/findings/`.

**Exit.** `findings/SUMMARY.md` carries the coverage scorecard (10/10 — 8/8 floor plus both bonus), the clause-by-clause scoring rubric, the per-finding senior-reach detail, both bonus findings written out (rule/location/consequence/fix each), the through-threads recap, the forward pointers, and the personal grep/curl checklist. `findings/out-of-scope.md` records the duplicated ownership-transfer logic as a parked code-quality observation. The eight findings plus these two files are committed in a single commit. The audit target is still unmodified — read-only pass held. This is the chapter's terminal lesson; no codebase state follows.

## Lesson sections

Implementation contract order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One sentence goal in the project's terms: commit the eight findings, then score them against the published answer key and record the result. One-paragraph description of the finished state in place of a screenshot — `SUMMARY.md` open beside `solution/findings/SUMMARY.md`, a 10/10 scorecard, the two bonus findings written out, and an updated personal checklist. Name the central rehearsal up front: a real audit has no key, so the value is running it under "no peeking until committed."

### Your mission

Weave as coherent prose, no subsection headers, no implementation hints. Cover, in user/project terms:

- **The deliverable**: commit findings 001–008 in one commit, then (and only then) open the answer key, score each finding, write `SUMMARY.md` (coverage count, scoring rubric, per-finding reach detail, the two bonus findings, through-threads, forward pointers, personal checklist) and `out-of-scope.md` (the duplicated transfer logic parked as code-quality, not a finding).
- **The irreversible step**: `git add findings/ && git commit -m "Unit 16 audit findings"` is the honor-system boundary. Real-course framing: only after the commit does the student fetch the `v1.0-answer-key` tag; in this repo it means reading `solution/findings/` beside their own `findings/`.
- **The scoring rule** (the constraint that shapes the work): rule + location match is the audit floor; fix-detail match is the reach. A student who names the rule and location but proposes a thinner fix is still doing the audit (partial credit); a student who names neither has not run the pass for that category.
- **The two bonus findings** that score here if caught — finding 9 (consent gate: `opt_out_capturing_by_default: false`, no `ConsentProvider`, a network capture on first load) and finding 10 (`safeLimit` bypass: bare `signInLimiter.limit(key)` on the export-trigger route) — moving the result toward 10/10.
- **Quantifying misses**: `SUMMARY.md` names every deliberate miss with one sentence of cause; a miss is the next audit's lesson, folded into the personal grep/curl checklist, never a failure.
- **Out of scope** (one line): patching the findings — that is the next sprint's work; this pass finds and documents only.

**Functional requirements** as a numbered Checklist, each tagged `[tested]` or `[untested]`. The Lesson 10 gate asserts the observable shape of `SUMMARY.md`/`out-of-scope.md` plus a source-shape probe that the seeded defects are still present; the read-aloud and honor-system items are by-hand.

1. The eight findings are committed in a single commit before the answer key is consulted. `[untested]` (honor system, by-hand)
2. `findings/SUMMARY.md` records a coverage count and names every deliberate miss with one sentence of cause. `[tested]`
3. `findings/SUMMARY.md` documents bonus finding 9 (consent gate) with its rule, location, consequence, and fix. `[tested]`
4. `findings/SUMMARY.md` documents bonus finding 10 (`safeLimit` bypass) with its rule, location, consequence, and fix. `[tested]`
5. `findings/SUMMARY.md` carries the clause-by-clause scoring rubric (rule, location, consequence, fix) and the partial-credit rule. `[tested]`
6. `findings/SUMMARY.md` lists the per-finding senior-reach fix clause for findings 1–8. `[untested]`
7. `findings/out-of-scope.md` records the duplicated ownership-transfer logic as a parked observation, not a scored finding. `[tested]`
8. `SUMMARY.md` carries the personal grep/curl checklist folding every discovery command. `[untested]`
9. The audit target still boots and runs unchanged — no seeded defect patched. `[tested]` (source-shape probe)
10. Each finding scored against the answer key applying rule+location-is-floor, fix-detail-is-reach. `[untested]` (by-hand against `solution/findings/`)

### Coding time

One line directing the student to commit first, then open the key and score against the brief's partial-credit rule, then read the worked solution. The writer wraps the solution in `<details>` (collapsed).

The solution reproduces the two files the student writes this lesson, organized as they land in the repo:

- **`findings/SUMMARY.md`** — render in full from `solution/findings/SUMMARY.md`. It is long and multi-section; use `Code` (lang `md`) for the whole file, or break into labeled `Code` blocks per section (Coverage scorecard table, Scoring rubric, Senior-reach detail per finding, Bonus finding 9, Bonus finding 10, Through-threads, Forward pointers, Personal checklist). The personal grep/curl checklist is a `sh` block — render it as `Code` lang `sh` exactly as it appears (it is the portable artifact the student keeps).
- **`findings/out-of-scope.md`** — render from `solution/findings/out-of-scope.md` as a `Code` block (lang `md`). Note in one sentence why duplication is parked here and not scored: one defect, one finding (finding 1's fail-closed bug), plus one parked observation keeps the count honest.

Decision rationale (one or two sentences each), covering the `[untested]` requirements:

- **Commit-before-key is the load-bearing rehearsal** — a real audit has no key; the honor system is the point, not a formality.
- **Partial-credit rationale** — the rule is the load-bearing clause because it is what makes the finding actionable; the fix detail is the reach because juniors stop short of the senior version (re-throw instead of letting `authedAction` convert; write-only sanitize instead of write+read; "add a log" instead of the exact slug + payload; host-allow-list CSP instead of nonce + `'strict-dynamic'`; rename-and-move instead of rename-move-rotate; per-IP instead of dual-key; version bump instead of the workspace defaults; naming `member` instead of the full graph + audit anonymization).
- **Bonus findings are scored here, written once** — finding 9 needs both belts (`opt_out_capturing_by_default: true` plus consent-gated init writing `consent.recorded`); finding 10 names the seam (`safeLimit`), not a `try/catch` around the bare call.
- **out-of-scope.md discipline** — observations that are real but off-category are tickets-in-waiting, never findings; this keeps the coverage number honest.
- **Personal checklist** — folding every command into a reusable script is the senior reflex that sharpens each pass.

Project-closing material belongs at the end of this section (the contract makes Coding time the home for closing notes in implementation lessons): restate the two chapter-080 commitments (fail-closed; user-message-vs-operator-record split), the single-place-to-lint pattern that made the pass grep-able, the coverage-over-depth bar, and the portability of the four-clause audit shape. Then the forward pointers — link rather than expand: chapter 088 (integration tests against `authedAction` and the message-mapper), chapter 090 (Playwright money-path test exercising the rate limit and consent gate), chapter 092 (Sentry `beforeSend` redactor — operator side of the message split), chapter 095 (observability/performance audit on the same target, where bonus 9 re-surfaces if unfixed), chapter 097 (CI gates catching some findings at PR time, the `--frozen-lockfile` follow-up finding 7 names), chapter 104 (seeded-PR review using the same disciplined-reading muscle).

Link, don't re-explain: the consent gate's pre-consent rule (lesson 5 of chapter 081), the `safeLimit` single-seam rule (lesson 3 of chapter 080), and each finding's owning chapter-080/081 lesson referenced in the rubric.

No diagram. The deliverable is Markdown artifacts and a scoring process; prose plus the rendered files carry it.

### Moment of truth

The test command and expected pass output, plus the by-hand checklist for what the gate cannot judge.

- Command: `pnpm test:lesson 10`.
- Expected pass output: the Lesson 10 `describe` block green — the gate asserts `SUMMARY.md` carries a coverage count, the scoring rubric, and the two bonus findings (each naming its rule, location, and fix), `out-of-scope.md` carries the parked observation, and a source-shape probe confirms the seeded defects (consent default `false`, bare `.limit()`) are still present. Render the pass output with `Code`.
- By-hand checklist (Checklist component, the items the test cannot judge): the commit preceded consulting the answer key (honor system held); each finding was scored on rule, location, consequence, and fix; the partial-credit rule was applied (rule + location is the floor); any bonus findings were scored; the per-finding senior-reach gaps were checked against the student's findings; the personal grep/curl checklist was updated with every miss.

## Scope

- Does **not** patch any seeded finding — fixing them is the next sprint's work, out of scope for this audit pass (named in the closing forward pointers; picked up across chapters 088/090/092/095/097/104).
- Does **not** re-derive findings 001–008 — those were written and gated in lessons 2–9; this lesson only commits and scores them.
- Does **not** teach the consent gate or `safeLimit` rules from scratch — owned by lesson 5 of chapter 081 and lesson 3 of chapter 080 respectively; reference, do not re-explain.
- Does **not** introduce new git workflow teaching beyond the single `git add`/`git commit` honor-system step — Git as a topic is Unit 20 (chapters 096+).
