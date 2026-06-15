# Chapter 104 — Lesson 2 outline

## Lesson title

The auth bypass

Sidebar: The auth bypass

The chapter-outline title fits — it names the single finding the lesson models. Keep it.

## Lesson type

Implementation

(The deliverable is a written artifact the student produces against a brief, in the implementation-lesson shape — *Your mission* / *Coding time* / *Moment of truth*. There is no automated checker: `lesson-verification/` ships empty for this chapter, so the test-coder does NOT run. *Moment of truth* is a hand-check against the comment anatomy plus the reference, not a `pnpm test:lesson` run.)

## Lesson framing

The student installs the rhythm of a five-layer review by writing one finding end-to-end: they audit the plan-label mutation against the canonical `authedAction` wrapper, recognize that bypassing it drops two enforced guarantees (role gate + tenant scope), and record it as a correctly-shaped, correctly-severed `blocking:` comment in the four-part anatomy. The payoff is the senior reflex — "what was the established surface, and where does this bypass it?" — plus the discipline of pinning a finding to a file and line, naming the violated rule with a lesson ID so the comment is portable to the author, and writing in the address-the-code-not-the-author voice. This is the worked example the student re-reads when a later comment feels stuck.

## Codebase state

**Entry.** The starter runs locally (lesson 1 setup done). `reviews/chapter 104.md` carries the shipped `Pass order:` header, a filled `Started at:` line, and the `<!-- TODO(L2) -->` marker — no comments written. The student has read the `/plan` surface in the browser and calibrated against the canonical helpers (`src/lib/authed-action.ts`, `src/lib/tenant-db.ts`, `src/lib/audit-log.ts`). The audit target source is unchanged and stays unchanged for the whole chapter.

**Exit.** `reviews/chapter 104.md` carries comment 1 — written in place of the `<!-- TODO(L2) -->` marker, in the four-part template, pinned to `src/app/(app)/plan/actions.ts` L18-21, labeled `blocking:`, citing SaaS pattern #2 (lesson 2 of chapter 057) + Principle #5. No audited source file changed. Findings 2–5, the summary, and the verdict are still empty (lesson 3).

## Lesson sections

Implementation type. Section order: *Goal + Finished result* (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One sentence goal in user terms: write the first review comment — the missing `authedAction` wrapper on the plan-label mutation — as a correctly-shaped, correctly-severed `blocking:` finding. Then one paragraph describing the finished result: `reviews/chapter 104.md` carries the shipped pass-order header plus comment 1, filled in the four-part template and pinned to `src/app/(app)/plan/actions.ts`. Frame it as the review's rhythm-setter: the worked example re-read whenever a later comment feels stuck. No screenshot needed — the deliverable is a markdown comment block; show it in *Coding time*, not here.

### Your mission

Weave as coherent prose, no subsection headers, no implementation hints beyond what the brief names. Cover:

- **The capability** (user terms): walk the first finding end-to-end so the cadence is set before tackling the rest alone. The deliverable is comment 1 in the review file.
- **The senior reflex**: open `src/app/(app)/plan/actions.ts` and read the mutation against the canonical wrapper in `src/lib/authed-action.ts` — "what was the established surface, and where does this bypass it?"
- **What's wrong (in code terms, no fix hints)**: the action carries `'use server'` then a hand-rolled `const session = await getSession()` and an `if (!session) throw`, so it runs no role check (any signed-in member can rewrite the org's plan label), reaches past the `tenantDb` facade to mutate the store record directly, runs a write-side mutation with no rate limit, and as a bonus tell guards on `if (!session)` when `getSession()` never returns null (dead code).
- **Why `blocking:`**: one bypass drops guarantees the wrapper enforces (role + tenant scope, plus rate limit) — security and correctness, not preference. A lone style nit would be `suggestion:`.
- **Voice**: address the code, not the author ("`updatePlanLabel` hand-rolls the session check" beats "you hand-rolled it") so the author reads it without defensiveness.
- **The principle/pattern line carries the load**: naming the rule with a lesson ID is what makes the comment portable; "this is wrong" alone is the failure mode (lesson 2 of chapter 103).
- **Cadence in order**: read the file → find the bypass → name the principle/pattern → set the severity → write in the template. Resist switching files mid-comment.
- **Constraint / out of scope**: the blocking-vs-suggesting cut is in scope and this is the clearest blocker; the missing audit-log write in this same file is finding 5 (lesson 3), so leave it for now. Editing source is out of scope — the fix lives in the comment body.

**Functional requirements** — numbered list, every item tagged. There is no automated checker, so every item is `[untested]` (hand-verified in *Moment of truth*). Phrase as verifiable outcomes, not files/exports. Render with `Checklist`/`ChecklistItem`, all chips `untested`:

1. `[untested]` The review file carries a comment pinned to the file and the line range of the hand-rolled session check in `src/app/(app)/plan/actions.ts` (L18-21).
2. `[untested]` The comment carries a `blocking:` severity label, justified by the security-and-correctness consequence rather than preference.
3. `[untested]` The observation names the bypass in code terms and the guarantees it drops: the role check and the tenant-facade scope (the dead `if (!session)` guard and the missing rate limit are fair extra tells).
4. `[untested]` The comment cites SaaS pattern #2 (lesson 2 of chapter 057) and Principle #5 (chapter 029 / chapter 042) as the violated rule, with the lesson ID.
5. `[untested]` The comment's action proposes wrapping the mutation in `authedAction('admin', updatePlanLabelSchema, fn)` (routed through the named seam so role + tenant + rate-limit gaps close at once), in one sentence.
6. `[untested]` The comment is phrased in the address-the-code-not-the-author voice.

### Coding time

One-line build prompt: write comment 1 into `reviews/chapter 104.md` (under the shipped pass-order header, replacing the `<!-- TODO(L2) -->` marker) against the brief; read the reference after attempting. The writer wraps the solution in `<details>` (collapsed).

Inside `<details>`:

- **The audited source** — show `src/app/(app)/plan/actions.ts` so the student sees the bypass on the page. Use `AnnotatedCode` to direct focus to the three tells in sequence: (1) the hand-rolled `const session = await getSession()` + `if (!session) throw` (no role gate, dead guard since `getSession()` returns a `Session` or throws), (2) `org.planLabel = planLabel` mutating the store record directly past the `tenantDb` facade, (3) absence of any `authedAction` wrap / rate limit / audit write. Source is the real solution file (L1-37) — do NOT paraphrase; the line numbers in the comment (L18-21) must match what's shown.

- **The reference comment block** — show verbatim from `solution/reviews/chapter 104.md` (the canonical answer key), in a plain `Code` block (markdown):

  ```
  **blocking:** `src/app/(app)/plan/actions.ts` L18-21 — `updatePlanLabel` hand-rolls `getSession()` with an `if (!session) throw`, so it accepts any signed-in user (no role check), drops the tenant scope on the org update, and runs a write-side mutation with no rate limit.
  Principle/pattern: SaaS pattern #2 (lesson 2 of chapter 057 — `authedAction(role, schema, fn)`) and Principle #5 use-framework-conventions (chapter 029 / chapter 042).
  Action: replace the manual auth and parse with `authedAction('admin', updatePlanLabelSchema, async (input, ctx) => { ... })`, which closes the role, tenant, and rate-limit gaps in one named seam.
  ```

  NOTE for the writer: display this exactly as it ships in `solution/reviews/chapter 104.md` (verified). The chapter-outline draft used L18-36 and split rate limit out — the shipped solution is the source of truth: L18-21, three dropped guarantees named together (role / tenant scope / rate limit), audit-log left for finding 5.

- **Decision rationale** (one or two sentences each, covering the `[untested]` judgment calls):
  - The action wraps in `authedAction('admin', ...)` rather than adding a role check by hand because the wrapper closes the role gate, the parse-and-deny path, the tenant scope, and the rate limit in one named seam — adding only a role check re-introduces the hand-rolled wrapper Principle #5 warns against.
  - Naming the dropped guarantees in the observation is what calibrates the severity: a lone style nit would be `suggestion:`; a write-side mutation any member can call against the wrong tenant scope is `blocking:`.
  - The `Action:` proposes the seam, not the line-by-line fix — a review comment names the move, the author writes the code.

- For `authedAction` internals, `tenantDb`, and the severity-label taxonomy, link to their owning lessons (lesson 2 of chapter 057; lesson 2 of chapter 103) rather than re-explaining.

(External resources, if any, are appended by the resourcer after the `<details>`, no header.)

### Moment of truth

No `pnpm test:lesson` for this chapter — state plainly that `lesson-verification/` ships empty and there is no automated checker, so verification is by hand against the comment anatomy. The block must be pinned to a file and a line range and carry all four parts: a severity label, an observation, a `Principle/pattern:` line, an `Action:` line.

Then a hand-check `Checklist` for the judgment calls the anatomy can't auto-verify:

- The severity is `blocking:`, not `suggestion:` — mis-labeling is the partial-credit miss the reference penalizes even when the finding is correctly located.
- The observation names the dropped guarantees (role gate, tenant scope), not just one.
- The cited rule is SaaS pattern #2 with the lesson ID, and the action proposes the `authedAction('admin', ...)` wrap.
- The comment addresses the code, not the author.

Close with one line: the reference deliverable lives under `solution/reviews/chapter 104.md`, but on the honor system don't open it until the review and ADR are written in lesson 4.

## Scope

- The four other blocking findings (side-effect import, `Date` arithmetic, derived-state effect, missing audit-log write), the `## Summary`, and the `Verdict:` line — lesson 3.
- The missing audit-log write lives in this same `actions.ts` file but is finding 5 — lesson 3, not here.
- The ADR (the cache decision), the three-test inclusion check, and self-grading both artifacts side-by-side against `solution/` — lesson 4.
- `authedAction` internals, the `tenantDb` facade, the audit-log catalog — owned by Unit 9 / chapter 057; reference, don't re-teach.
- The full five-severity taxonomy and Conventional Comments standard — lesson 2 of chapter 103; reference only.
- No source edit, no test file, no environment setup beyond lesson 1.
