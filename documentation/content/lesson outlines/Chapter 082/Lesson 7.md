# Lesson 7 — Finding 6: the missing rate limit on password-reset

## Lesson title

Chapter-outline title fits. Keep **Finding 6: the missing rate limit on password-reset**.
Sidebar short title: **Finding 6: rate-limit gap**.

## Lesson type

`Implementation`

The student writes `findings/006-rate-limit-password-reset.md` against the brief and the lesson-7 test gate. The test-coder runs for this lesson.

## Lesson framing

The student installs the senior reflex of auditing a route list against a coverage matrix rather than the running app — discovering an abusable endpoint that ships *no* limiter even though the limiter it needs is already declared one file over. They leave with finding 6 documented: the rate-limit-coverage rule and its three triggers (two of which this endpoint hits), the gap located by reading `rate-limit.ts` against the `api/auth/*` handlers, the inbox-bomb / enumeration / cost consequence in user-and-third-party terms, and the dual-keyed `safeLimit` fix with the coverage matrix attached. The payoff is the discipline that coverage is the deliverable: a limiter that exists but is never wired is the same as no limiter, and only a matrix surfaces it.

## Codebase state

**Entry.** The audit target runs locally (Postgres up, seeded, dev server on `:3000`, signed in as `alice@example.com`). Findings 1–5 are written in `findings/001`…`005`; the student has internalized the audit rhythm (open running app + source side by side, walk one category, write the finding) and the template shape. The seeded defect is live: `src/app/api/auth/reset-password/route.ts` fires a Resend send on every POST with no limiter in front; `src/lib/rate-limit.ts` declares `resetLimiter` that nothing under `src/app` imports. `findings/006-rate-limit-password-reset.md` holds the 4-section skeleton plus the L7 TODO comment.

**Exit.** `findings/006-rate-limit-password-reset.md` carries all four template sections populated, names the rate-limit-coverage rule with the two triggers this endpoint hits, locates the gap with the discovery greps and the by-hand hammer, frames the consequence as inbox-bomb + enumeration + uncapped cost, names the dual-keyed `safeLimit` fix, and attaches the coverage matrix. The audit target still runs unchanged — the defect is documented, not patched. Findings 7–8 and the bonus pair remain unwritten.

## Lesson sections

Render the Implementation section list: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: document the unthrottled password-reset endpoint as finding 6, the sixth file in the audit report. Then a one-paragraph description of the finding "working" — the gap between a declared-but-unwired `resetLimiter` and the route that should use it, surfaced by reading the limiter declarations against every `api/auth/*` handler and confirmed by twenty identical POSTs that all return `200` with no `429`. No screenshot needed; if one figure helps, a small `Code` block of the hammer loop's output (twenty `200`s) carries the fingerprint better than prose. State that the deliverable is one Markdown file, not a patch — the route stays unchanged.

### Your mission

Prose paragraph, then the requirements checklist. No subsection headers, no implementation hints in the brief.

Weave into the paragraph (user terms, constraints, traps — no hints):
- **Feature.** Audit the password-reset endpoint for rate-limit coverage and write finding 6 documenting the gap.
- **The discovery method is the matrix, not the app.** This finding is found by reading the route list against the coverage matrix from chapter 081 lesson 2, not by exercising the app — though the running app confirms it (submitting the reset form ~20 times returns no 429). Name the audit step at a high level (read the declared limiters in `rate-limit.ts`, then open each `api/auth/*` handler and check it runs through the limiter seam) without naming the exact grep flags — those live in the solution.
- **Constraint — the rule's three triggers.** The rate-limit-coverage rule mandates a limiter when an endpoint hits any one of three triggers: costs money per call, attacks a third party, or touches state addressable without auth. This endpoint hits two (Resend send = money; the supplied "email" is a victim's inbox = third party). The student must record *which* triggers fire.
- **Constraint — coverage is the deliverable.** A coverage matrix (endpoint category, file, limiter, key strategy, covered Y/N) is part of the finding; gaps the student is not scoring (sign-in/sign-up declared-but-unwired, the export-trigger bypass) are recorded as open rows / tickets, not silently dropped.
- **Trap — per-IP alone.** The naive fix is one per-IP limiter; the senior reach is dual-keyed (per-IP *and* per-email) because the inbox-bomb and enumeration vectors are per-email problems and per-IP-only both misses distributed senders and locks out shared office NATs.
- **Constraint — both the grep and the hammer belong in the report**, for different reasons (the grep proves the gap is in source and is CI-able later; the hammer proves the gap is live).
- **Out of scope.** Patching the route — the fix is a paragraph plus a short illustrative snippet, not a diff.

Then the requirements checklist (the only list in the section). Tag every item `[tested]` or `[untested]`. The test gate (per the placeholder) asserts the observable file shape: four sections populated, the rate-limit rule named, the location names a command/file, the fix names the senior reach, plus a source-shape probe that the seeded defect is still present. Tag accordingly:

1. `findings/006-rate-limit-password-reset.md` has all four template sections (Rule, Location, Consequence, Fix) populated. `[tested]`
2. The finding names the rule as rate-limit coverage with the three mandatory triggers (chapter 081 lesson 2), linked by section ID, and records which two triggers this endpoint hits. `[tested]` (rule named) — the "which two triggers" detail is `[untested]`, confirmed by hand.
3. The location names the discovery commands and the files read (`src/lib/rate-limit.ts` and `src/app/api/auth/reset-password/route.ts`), establishing that `resetLimiter` is declared but never imported by the route. `[tested]` (names a command/file).
4. The finding is confirmed against the running app: repeated password-reset submissions return no 429. `[untested]` — by-hand verification.
5. The consequence reads as inbox-bomb, account enumeration, and uncapped Resend cost, in user-visible and third-party terms with no "could potentially" hedging. `[untested]`
6. The fix names wiring the per-IP `resetLimiter` plus a per-email companion limiter, both wrapped in `safeLimit`, returning a generic 429 with `RateLimit-*` headers. `[tested]` (fix names the senior reach) — the dual-key detail confirmed by hand is `[untested]`.
7. A coverage matrix (endpoint category, file, limiter, key strategy, covered Y/N) is attached to the finding. `[tested]` per the chapter outline's note that the gate checks for a coverage matrix.
8. The audit target still runs unchanged — the defect is documented, not patched. `[tested]` via the source-shape probe.

### Coding time

One line directing the student to write the finding against the template and the brief, then read the worked solution. The writer wraps the solution in `<details>` (collapsed).

The solution reproduces `findings/006-rate-limit-password-reset.md` as it lands in the repo (the file already exists at `solution/findings/006-rate-limit-password-reset.md` — use it verbatim as the canonical answer). Organize it section by section as the file does:

- **Rule.** The coverage rule and the three triggers; this endpoint hits two (money via Resend, third party via the victim's inbox). Note it is arguably trigger (c) too but scored against the two load-bearing triggers. Link chapter 081 lesson 2 rather than re-explaining.
- **Location.** The gap is *between two files*: `resetLimiter` declared at module scope in `src/lib/rate-limit.ts` (sliding window 3 / 15m, prefix `rl:reset`) and the `POST` handler in `reset-password/route.ts` that calls `sendEmail(...)` with no limiter import. Reproduce the two discovery greps (limiters declared vs. what imports each; which handlers send mail) and the by-hand hammer loop (the `curl` `for` loop returning twenty `200`s, no `429`, no `RateLimit-*` header). Decision rationale (one sentence each): why both grep and hammer belong; why `signInLimiter`/`signUpLimiter` declared-but-unwired are recorded as matrix rows, not folded into this finding.
- **Consequence.** Inbox-bomb degrading the domain's deliverability for every customer; enumeration + spam relay spending sending reputation; the Resend bill climbing one paid send at a time with no ceiling. User-and-third-party framing.
- **Fix.** The dual-keyed `safeLimit` reach: add a per-email companion limiter beside the per-IP `resetLimiter`; wrap both checks in `safeLimit` (the fail-open seam, chapter 081 lesson 2 / chapter 080 lesson 3) so a Redis outage keeps the reset path up; on reject return a generic 429 via `rateLimitedResponse` from `src/lib/rate-limit-headers.ts`, with the Server-Action twin carrying the budget on the `Result` (the chapter-075 read-only-`headers()` decision) instead of as HTTP headers. Include the short illustrative snippet (both gates, fail-open, opaque 429) — render with `Code`; no full diff.
- **Coverage matrix.** Reproduce the five-row matrix (sign-in, sign-up, password-reset = this finding, Stripe webhook, export-trigger bypass). Render as a Markdown table; note gaps are tickets and the export-trigger bypass is its own finding (bonus 10).

Code-sample handling:
- The seeded route handler and the fix snippet: `Code` blocks suffice (short, single focus each). If the writer wants to direct attention to the missing-limiter line vs. the `sendEmail` call inside the route, `AnnotatedCode` on the route handler is justified — but a plain `Code` block with the existing seeded-defect comments is enough; do not over-component.
- The discovery greps and the hammer loop: `Code` (shell).
- The coverage matrix: plain Markdown table (not a component).
- Use `CodeVariants` only if showing the seeded route beside the fixed shape as before/after — optional, the fix snippet alone covers it.

For topics owned by regular lessons, link rather than re-explain: the coverage matrix and three triggers (chapter 081 lesson 2), the `safeLimit` fail-open seam (chapter 080 lesson 3, chapter 074 lesson 3), the Server-Action-budget-on-`Result` decision (chapter 075).

External resources, if any, are appended by the resourcer after the `<details>` with no header.

### Moment of truth

The test command and expected pass output: `pnpm test:lesson 7`. The gate asserts the observable finding shape (four sections populated, the rate-limit rule named, the location names a command/file, the fix names the senior reach, a coverage matrix is present) and a source-shape probe that the seeded defect is still present (read-only target — a pass proves the student documented rather than patched). Show the expected passing output (vitest green, the lesson-7 describe block passing).

Then the by-hand checklist for the items the test can't judge (render with `Checklist`/`ChecklistItem`, `untested` chips):
- The running-app fingerprint was reproduced — no 429 across repeated submits.
- The fix names per-IP *and* per-email keying, not per-IP alone.
- Both the discovery grep and the manual hammer are documented in the location section.
- The consequence reads as user-and-third-party harm (inbox-bomb, enumeration, uncapped cost), not a code-quality note.
- The recorded triggers name the two this endpoint hits.

## Scope

This lesson documents finding 6 only.
- It does not patch the route or wire the limiter — fixing findings is the next sprint's work, out of scope for the whole audit pass (chapter outline framing).
- It does not cover the export-trigger `safeLimit` bypass — that is bonus finding 10, scored in lesson 10 (Commit and self-grade).
- It does not teach the rate-limit-coverage rule, the three triggers, the `safeLimit` seam, or the dual-keying mechanics from scratch — those are owned by chapter 081 lesson 2, chapter 080 lesson 3, and chapter 074 lesson 3; link, don't re-teach.
- It does not score or commit the report — that is lesson 10.
