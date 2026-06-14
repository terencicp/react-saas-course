# Chapter 082 — Lesson 2 outline

## Lesson title

Keep: **Finding 1: the fail-closed bypass**. Fits — it names the deliverable (finding 1) and the defect class (fail-closed bypass). Sentence case, no markup.

Sidebar (short): **The fail-closed bypass**

## Lesson type

`Implementation`

The deliverable is `findings/001-fail-closed.md` — a written audit finding, not source code. The "feature" is the finding document; the test-coder fills `tests/lessons/Lesson 2.test.ts` to gate it. Mission / Coding time / Moment of truth all apply.

## Lesson framing

The student walks away having run the audit method end-to-end for the first time and produced the reference finding the rest of the pass copies. The senior payoff: a defect is named against a precise rule and located by the command that surfaced it — never a "code review opinion." They internalize the rhythm (run the app, read the source, walk one category, write the finding before switching) and learn that findings live in the call sites that *bypass* a seam, never in the seam itself.

## Codebase state

**Entry.** The starter runs locally (lesson 1 done): `pnpm dev` serves on `:3000`, signed in as `alice@example.com` / `inspector-password-12`; `findings/` holds `template.md`, eight numbered placeholders (each a four-section skeleton with a per-lesson TODO comment), plus empty `out-of-scope.md` / `SUMMARY.md`. The audit target ships all ten seeded defects green under `pnpm verify`. `findings/001-fail-closed.md` is the skeleton: H1 + Category/Severity placeholder line + a `TODO(L2)` comment + four empty `## Rule / ## Location / ## Consequence / ## Fix` headers. The canonical seams (`authedAction`, `requireRole`, `safeLimit`, `logAudit`, `tenantDb`, typed `env`) are present and healthy.

**Exit.** `findings/001-fail-closed.md` has all four sections populated naming the fail-closed rule (chapter 080 lesson 1), the two grep commands and their hit counts in Location (including the three legitimate non-finding hits), a user-visible consequence with the operator note, and the senior fix (let `authedAction` convert the throw). `findings/out-of-scope.md` may carry the duplicated-transfer observation. The audit target is unchanged — both defect call sites in `src/lib/admin/transfer-ownership.ts` still ship. `pnpm test:lesson 2` passes.

## Lesson sections

### Goal + Finished result (intro, no header)

One sentence goal in the audit's terms: document the fail-closed violation in `src/lib/admin/transfer-ownership.ts` as `findings/001-fail-closed.md` with all four template sections filled. One short paragraph (or a `Screenshot`/`Figure` of a filled finding file beside the skeleton) describing the finished deliverable. Frame this as the audit's *gift finding* — the worked example whose shape every later finding reuses, the one to re-read when a later finding feels stuck.

### Your mission (H2)

Coherent prose, no subsection headers, no implementation hints beyond what the brief legitimately scopes. Weave:

- **Feature:** the first audit finding, and the lesson that sets the audit *method* for the whole pass.
- **The rhythm** every later finding reuses: open the running app, open the source, hold both side-by-side, walk one category (here: fail-closed checks, chapter 080 lesson 1), then write the finding before switching categories — switching mid-finding fragments the report.
- **The audit step is grep-driven**, stated as method not as the answer: grep `'use server'` files that don't import `authedAction`, and grep `requireRole('owner')` then read each hit's surrounding `try/catch`. Some hits are legitimate by design (public sign-up/sign-in actions, sign-out) and the audit documents which commands ran and how many hits each returned.
- **Calibrate the eye:** the target ships all canonical seams healthy, so reading those first teaches that findings live in the call sites that bypass the seam, never in the seam.
- **The trap:** a "code review opinion" with no grep target behind it — every finding's location names the command that surfaced it.
- **The consequence is read aloud at a launch review** by someone who hasn't read the code, so it must name the user-visible failure mode with the operator failure mode as the secondary note.
- **Constraints:** the finding follows `findings/template.md` (Category, Severity, Rule, Location, Consequence, Fix); the fix is a paragraph, not a diff.
- **Out of scope:** patching the target — the target is read-only and stays green.

Then the requirements checklist (the only list in the section), rendered as `Checklist`/`ChecklistItem` with `tested`/`untested` chips. Each item phrased as a verifiable outcome, never as a file/export:

1. The fail-closed bypass in `src/lib/admin/transfer-ownership.ts` is located with a line range and the grep command(s) that surfaced it, including the legitimate hits the command also returned and why they are not findings. `[untested]`
2. The finding names the rule as fail-closed (chapter 080 lesson 1), linked by section ID. `[tested]`
3. The consequence reads as a user-visible failure mode — an owner-only mutation slipping through when `requireRole('owner')` throws during a Postgres blip — with the fail-open-dressed-as-logging operator note alongside it, no "could potentially" hedging. `[untested]`
4. The fix names the senior reach: remove the `try/catch`, let `requireRole` throw, let the outer `authedAction` wrapper convert the throw to `{ ok: false, error: { code: 'unauthorized' } }` (chapter 080 lesson 3, seam-1 reading). `[untested]`
5. A severity is assigned and justified in two lines. `[tested]` (section populated) / `[untested]` (justification quality).
6. `findings/001-fail-closed.md` has all four template sections filled and the audit target still runs unchanged. `[tested]`

Note on tagging: the test asserts the *observable shape* — four sections populated, the fail-closed rule named, location names a command/file, fix names the senior reach — plus a source-shape probe that the seeded defect is still present. Mark item 2 and the structural half of items 5–6 `[tested]`; mark the quality judgments (consequence reads user-visible, location lists the non-finding hits, fix names the `authedAction` conversion not a re-throw, severity justification holds when read aloud) `[untested]` — the test-coder asserts the file shape, the by-hand checklist owns the prose quality.

### Coding time (H2, writer wraps the solution in `<details>`)

One line directing the student to write the finding against `findings/template.md` and the brief, then read the worked solution.

The hidden solution reproduces the completed `findings/001-fail-closed.md` as it lands in the repo. Walk:

- **The defect in source.** `src/lib/admin/transfer-ownership.ts` carries the bug twice — `transferOwnershipAction` (the `authedAction('admin', …)`-wrapped Server Action) and the direct `transferOwnership(orgId, nextOwnerId)` variant. Both wrap `await requireRole('owner')` in a `try/catch` that `console.warn`s and falls through to the `organization.ownerId` update. Show both call sites with `AnnotatedCode` to focus the student on (a) the `try`, (b) the swallowing `catch`, (c) the fall-through update that runs anyway. The two-variant design is the callout: the grep surfaces it regardless of entry point.
- **The seam, for contrast.** `requireRole` (`src/lib/auth/require-role.ts`) is declared to throw on a below-owner actor and on its own internal failure; its own doc comment says callers must not catch. Link the fail-closed rule (chapter 080 lesson 1) and the `authedAction` seam (chapter 080 lesson 3) rather than re-explaining.
- **The finding's four sections,** quoting the answer key:
  - **Rule** — fail-closed, the canonical anti-pattern `try { await requireRole(...) } catch { /* log and continue */ }` named in chapter 080 lesson 1.
  - **Location** — the line ranges for both variants, plus the two grep commands and their hit counts as evidence. Reproduce the two `rg` commands (the `'use server'`-without-`authedAction` grep returns four files; three are legitimate non-findings — sign-up, sign-in, sign-out — recorded as such; the `requireRole('owner')` grep lands `transfer-ownership.ts` directly). Use `Code` for the grep block. The rationale callout: naming the hits that are *not* findings is half the discipline.
  - **Consequence** — the unauthorized transfer slipping through when the check can't prove ownership; the legitimate owner locked out; the operator note that `console.warn`-then-continue is fail-open dressed as discipline.
  - **Fix** — remove the `try/catch` at both sites, let the throw reach the `authedAction` boundary which maps it to `unauthorized`. The structural snippet (≤10 lines, allowed by the template) showing the bare `await requireRole('owner')` gate. Note the senior reach for the direct variant: delete the duplicated logic, route the admin console through the wrapped action so one fail-closed seam is the only path. Callout: do **not** re-introduce a re-throw inside a catch — the call site holds no error-handling machinery; the wrapper owns it.
- **Code-sample handling:** `AnnotatedCode` for the two defect call sites (multiple parts need focus). `Code` for the grep block and the fix snippet. No `CodeVariants` needed. No diagram — prose and the annotated source carry the flow.
- **External resources:** none required; resourcer may append a link on fail-open / fail-closed security posture after the `<details>`, no header.

### Moment of truth (H2)

The test command and expected pass output, then the by-hand checklist.

- Command: `pnpm test:lesson 2`.
- Expected: the gate passes — assertions confirm the four template sections in `findings/001-fail-closed.md` are populated, the fail-closed rule is named, the location names a command/file, the fix names the senior reach, and the source-shape probe confirms the seeded defect is still present (read-only target). Show the green vitest pass summary via `Code`.
- By-hand checklist (`Checklist`/`ChecklistItem`, the items the test can't judge): the consequence reads as a user-visible failure mode rather than a code-quality note; the location names the grep command and its hit count, including the legitimate non-finding hits; the fix names the `authedAction` conversion rather than a re-throw; the severity justification holds up read aloud.

## Scope

- Does **not** patch the defect — the target is read-only; fixing these findings is a later sprint, out of scope for the whole pass (chapter 082 lesson 10 closes by pointing forward).
- Does **not** cover the other seven seeded findings — each owns its lesson (XSS sink lesson 3, audit-log gap lesson 4, CSP lesson 5, `NEXT_PUBLIC_*` secret lesson 6, rate limit lesson 7, dep hygiene lesson 8, GDPR deletion lesson 9).
- Does **not** re-teach the fail-closed rule, `authedAction`, or `requireRole` — those are owned by chapter 080 lessons 1 and 3 and chapter 057; link, don't re-explain.
- Does **not** commit or self-grade the findings — that is chapter 082 lesson 10.
- The duplicated-transfer-logic observation is a code-quality note for `findings/out-of-scope.md`, not a scored finding.
