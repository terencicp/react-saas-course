# Chapter 104 — Project: Review a PR, write the ADR

## Chapter framing

Chapter 104 closes Unit 21 by running the two disciplines the unit installed — the principle-and-pattern map for code review from chapter 103 and the Nygard ADR template from lesson 4 of chapter 101 — against a seeded pull request.
This is a documentation-and-review project: nothing in the audit target changes, and every lesson's deliverable is a committed artifact that records a finding correctly.
The student leaves with two committed artifacts: a `reviews/chapter 104.md` file holding five line-anchored review comments in the four-part Conventional-Comments shape plus a summary and verdict, and a `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` ADR with the three Nygard sections filled.

### Project goals

By the end of the chapter the student has:

- Run a single PR through the five-layer review stack in stack order — correctness/security, then principles, then patterns, then tests/contracts, then style — recording the pass order at the top of `reviews/chapter 104.md` before opening the diff.
- Written five line-level review comments, each pinned to a file and line in the diff and each carrying all four parts of the comment anatomy: a severity label, the observation, the principle or pattern it violates with the lesson ID, and the proposed action.
- Labeled every one of the five seeded findings as `blocking:` — the seeded set is deliberately a uniform mix so the student practices the blocking-vs.-suggesting cut by example — and recorded the severity totals in a `## Summary` section.
- Closed the review file with a "request changes" verdict and a one-line PR-size note (the diff is ~220 LOC, under the 400 threshold, so no structural "split this" comment is warranted).
- Identified, by running the three-test inclusion check across the diff's candidate decisions, the one decision that earns an ADR — caching the entitlement read with `cacheTag` versus reading per request — and rejected the candidates that don't.
- Written ADR 0007 with a Status, a Context that names the read pattern and the rejected alternative, a single declarative Decision line with no hedging, and an honest Consequences list that enumerates every mutation seam that must call `updateTag`.
- Self-graded both artifacts against the published rubric (`v1.0-answer-key`) after committing, scoring coverage and severity match and updating a personal review checklist for the next PR.

The review is a read-only pass on the seeded PR diff: the student leaves comments and writes the ADR, but pushes no fixes to the branch — the proposed fix lives in the comment body, not in a commit.
Self-grading is the senior reach: the rubric publishes from day one but the student is on the honor system not to check it out until the commits land, because a real review has no answer key and the student who runs the pass under "no peeking" trains the reflex.

### Dependency carry-in

The review invokes every principle and pattern the course established plus the two disciplines from Unit 21.
The starter forks the course's running project; see `Project dependencies.md` for the upstream repos the scaffolder reads (the caching project from chapter 073, the audit pass from chapter 082, and the tri-locale list from chapter 085).

- **From lesson 4 of chapter 101:** the Nygard template (Title / Status / Context / Decision / Consequences); one decision per file; write the ADR as the decision is being made; the numbering and supersession discipline; the three-test inclusion check (affects multiple files, reasonable alternatives exist, reversing costs more than one PR).
- **From lesson 3 of chapter 102:** the docs-ship-with-the-PR rule and the five-artifact reviewer checklist; "docs that paraphrase code drift, docs that link don't."
- **From lesson 1 of chapter 103:** the five-layer review stack; the principle-and-pattern map with diff signatures and lesson IDs; the PR-size threshold; the CI-first frame; the senior restraint on style.
- **From lesson 2 of chapter 103:** the four-part comment anatomy; the five severity labels; the Conventional Comments standard the labels are a subset of; the blocking-vs.-suggesting cut; the language of disagreement; the "address the code, not the author" reflex.
- **From prior units (the principles and patterns each seeded finding maps to):**
  - `authedAction(role, schema, fn)` and the SaaS pattern #2 wrapper — lesson 2 of chapter 057 / lesson 3 of chapter 057.
  - Architectural Principle #6 (explicit over magic) at the side-effect import — chapter 029 / chapter 042.
  - Temporal over `Date` arithmetic for time math — Chapter 083.
  - The "derive, don't sync" rule against `useEffect`-driven derived state — Chapter 025.
  - `logAudit(tx, event)` and the audit-log canonical event set — lesson 5 of chapter 057 / lesson 3 of chapter 081.
  - `cacheTag` + `updateTag` / `revalidateTag` decision tree — Chapter 032 / Unit 15a project.

### Starter file tree (stubs marked)

The starter ships from `react-saas-course-projects/pr-review-and-adr/starter/`, cloned via `degit`.
The repo is a fork of the course's running project plus a `feature/customer-plan-overview` branch holding the seeded PR — roughly 220 lines of meaningful change across nine files.

```
starter/
  AGENTS.md                              # references the principle/pattern map
  docs/
    adr/
      README.md                          # ADR index, lists 0001-0006
      0001-use-drizzle-not-prisma.md
      0002-use-better-auth.md
      0003-biome-over-eslint-prettier.md
      0004-r2-over-s3.md
      0005-node-runtime-default.md
      0006-native-forms-before-rhf.md
      0007-<student-fills-this>.md       # STUB: the ADR for the diff's decision
  reviews/
    chapter 104.md                       # STUB: the five comments + summary + verdict
    template.md                          # the four-part comment template
  src/                                   # the running app, untouched
  # branch feature/customer-plan-overview holds the seeded diff
```

The student creates `0007-...md` and edits `reviews/chapter 104.md`. Nothing else changes.

The nine files in the seeded diff, and the area each touches (the deep read of each lands in the lesson that audits it):

- `app/(app)/plan/page.tsx` — the new server-component surface; carries the smuggled side-effect import (finding 2).
- `app/(app)/plan/seat-usage.tsx` — the seat counter Client Component; carries the derived-state effect (finding 4).
- `app/(app)/plan/actions.ts` — the plan-label mutation; carries the missing `authedAction` wrapper (finding 1) and the missing audit-log write (finding 5).
- `lib/plan/get-plan-entitlement.ts` — the cached read; the ADR target.
- `lib/plan/renewal-countdown.ts` — the renewal time math; carries the `Date` arithmetic (finding 3).
- `lib/analytics/page-view-tracker.ts` — the tracker module whose top-level body fires a network call.
- `lib/plan/schemas.ts` — the Zod schema for the mutation input.
- `lib/db/schema.ts` — the `planLabel` column add.
- the migration file for the column add.

The canonical helpers the diff is reviewed against — read once during the overview so the eye is calibrated for the bypass: `lib/authed-action.ts` (SaaS pattern #2, lesson 2 of chapter 057), `lib/audit-log.ts` (lesson 5 of chapter 057), `lib/tenant-db.ts` (SaaS pattern #1), `lib/temporal.ts` (the time primitive from Chapter 083), and the existing `'use cache'` patterns in `lib/billing/*` (Chapter 032).

### Seeded PR — the audit target

Branch: `feature/customer-plan-overview` against `main`.
The PR description claims: "Adds a per-org plan overview surface showing current entitlement, seats used, and renewal countdown; caches the entitlement read with `cacheTag` so the surface doesn't hammer Postgres."
The diff broadly delivers what it claims, so the review does not escalate to a contract-gap dispute; it runs the principle-and-pattern pass.

The diff contains five line-level review-worthy issues plus one design decision worth an ADR. Each is positioned so the student can find it by walking the review stack top-down.

1. **Missing `authedAction` wrapper (SaaS pattern #2, Principle #3).** `app/(app)/plan/actions.ts` exports `updatePlanLabel` as `'use server'` with a hand-rolled `auth()` call and `if (!session) throw`; no role check, no `tenantDb`, no `safeLimit`. Severity: `blocking:`. The principle/pattern violated: SaaS pattern #2 (the wrapper exists; bypass is a hole) and Principle #3 (manual seam instead of the named one). Action: wrap in `authedAction('admin', updatePlanLabelSchema, fn)`.
2. **Side-effect import into a server component (Principle #6).** `app/(app)/plan/page.tsx` imports `'@/lib/analytics/page-view-tracker'` at module top; the tracker module's top-level body fires a network call. The import runs at render time on the server. Severity: `blocking:`. Principle violated: #6 (explicit over magic); the side effect should be a named call site, not a smuggled import. Action: move to an explicit `trackPlanPageView()` call inside an event handler in a Client Component, or remove if PostHog auto-capture covers it.
3. **`Date` arithmetic on the renewal countdown (SaaS pattern #13).** `lib/plan/renewal-countdown.ts` does `new Date(subscription.renewsAt).getTime() - Date.now()` then divides by `1000 * 60 * 60 * 24`. The path breaks at DST boundaries and ignores the user's profile timezone. Severity: `blocking:`. Pattern violated: #13 (time/dates/timezones — the Temporal primitive is mandatory for user-visible time math). Action: switch to `Temporal.PlainDate.from(...).until(today, { largestUnit: 'days' })`.
4. **Derived state synced with an effect (Principle #7, derive-don't-sync from chapter 025).** `app/(app)/plan/seat-usage.tsx` keeps `seatsRemaining` in `useState` and updates it from `seatsAllocated` and `seatsUsed` via `useEffect`. The two pieces of state can disagree mid-render. Severity: `blocking:`. Principle violated: #7 (impossible-states-unrepresentable) and the derive-don't-sync rule from Chapter 025. Action: compute `seatsRemaining` inline as `seatsAllocated - seatsUsed`; delete the state and the effect.
5. **Missing audit-log write on plan label change (SaaS pattern's audit-log catalog, lesson 5 of chapter 057 / lesson 3 of chapter 081).** The `updatePlanLabel` action updates `organizations.planLabel` inside a transaction but doesn't call `logAudit(tx, event)`. The change is silent to the compliance trail. Severity: `blocking:`. Pattern violated: the canonical audit-log event set (`organization.plan-label-changed` is in the catalog). Action: add the `logAudit(tx, { action: 'org.plan.label_updated', ... })` call inside the transaction.

**The one design decision worth an ADR.** The PR introduces a `'use cache'` annotation on `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` (new helper in `src/lib/cache/tags.ts`) and a `cacheLife('minutes')` (the existing profile from 15a). The alternative is reading from Postgres per request. The decision affects every future plan-touching surface (notifications, billing webhook, the seat counter, the Stripe portal entry) and would cost a sweep of `updateTag` call sites to reverse. The PR description hand-waves "caches the entitlement read with `cacheTag` so the surface doesn't hammer Postgres" — that's a one-liner, not a recorded decision. The student writes ADR 0007 capturing the *Context* (the read pattern, the surfaces that need invalidation, the cache-vs-fresh trade-off), the *Decision* ("we will cache `getPlanEntitlement(orgId)` with `cacheTag('org:{orgId}:plan-entitlement')` and invalidate via `updateTag` at every mutation seam"), and the *Consequences* (every mutation seam now owns an `updateTag` call — list them; staleness window of up to 60 seconds for non-mutation reads; the `revalidateTag` background path for batch jobs; the failure mode if a mutation forgets the `updateTag`).

**Bonus findings the rubric acknowledges as the senior reach.** The diff also ships a missing TSDoc on the exported `getPlanEntitlement` (cross-module Server-Action-shape — lesson 1 of chapter 102), a `nit:` opportunity on a name (`handlePlanThing` should name intent — Principle #4), and a `praise:` opportunity (the file structure that co-locates the schema, the action, and the component under `src/lib/plan/` per Principle #1). The rubric names "5 is the floor, 7–8 is the senior reach" but does not require the bonus.

### Reference-solution signatures the lessons display

The lessons display these signatures verbatim so students don't invent variants.

- The four-part comment template (the literal scaffold in `reviews/template.md`):
  ```
  **[severity]:** `path/to/file.ts` L[line] — one-line observation.
  Principle/pattern: #N from Chapter X.Y.Z.
  Action: one sentence proposing the fix or asking the question.
  ```
- The reviews file shape (`reviews/chapter 104.md`):
  - Header with "Pass order: correctness/security → principles → patterns → tests/contracts → style" and a one-line note on where the student started.
  - Five numbered comment blocks in the template above.
  - A `## Summary` section at the bottom: one-line per finding with severity totals (e.g., `5 blocking`, `0 suggestion`, `0 question`, `0 nit`, `0 praise`) and a one-line note on PR-size (the diff is ~220 LOC, under the 400 threshold from lesson 1 of chapter 103 — no "split this" structural comment needed).
  - A closing `Verdict:` line ("request changes — five blocking issues, see comments 1–5").
- The ADR filename: `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md`. Numbered after the existing 0001–0006; the title is the noun phrase of the decision, not "ADR-0007" alone.
- The ADR template body (the literal Nygard scaffold inside the file):
  ```
  # ADR 0007 — Cache entitlement reads with cacheTag

  ## Status
  Accepted — 2026-MM-DD.

  ## Context
  [one to two paragraphs]

  ## Decision
  [one declarative sentence]

  ## Consequences
  - [3–7 bullets, both upsides and costs]
  ```

### Concepts demonstrated → owning lesson

- The Nygard ADR template, one-decision-per-file rule, supersession discipline — lesson 4 of chapter 101 (applied in the ADR 0007 lesson).
- The three-test inclusion check for what earns an ADR — lesson 4 of chapter 101 (applied in the ADR 0007 lesson).
- The docs-ship-with-the-PR rule and the five-artifact reviewer checklist — lesson 3 of chapter 102 (framed in the Project Overview).
- The five-layer review stack — lesson 1 of chapter 103 (the pass order is set in the Project Overview and ordered the auth-bypass and remaining-findings lessons).
- The principle-and-pattern map (#1–#7 and #1–#15) with diff signatures — lesson 1 of chapter 103, with each principle/pattern owned by its origin lesson.
- The four-part comment anatomy — lesson 2 of chapter 103 (modeled in the auth-bypass lesson).
- The five severity labels (`blocking:` / `suggestion:` / `question:` / `nit:` / `praise:`) as a Conventional Comments subset — lesson 2 of chapter 103.
- The blocking-vs.-suggesting cut and the language of disagreement — lesson 2 of chapter 103 (taught by example across the finding lessons).
- The receiving-review posture and the "approve with comments" vs. "request changes" calculus — lesson 2 of chapter 103.
- `authedAction(role, schema, fn)` — lesson 2 of chapter 057 (audited in the auth-bypass lesson).
- Principle #6 explicit-over-magic at the side-effect import — chapter 029, chapter 042 (audited in the remaining-findings lesson).
- Temporal over `Date` for user-visible time math — Chapter 083 (audited in the remaining-findings lesson).
- Derive-don't-sync, the `useEffect` derived-state anti-pattern — Chapter 025 (audited in the remaining-findings lesson).
- `logAudit(tx, event)` and the canonical audit-log event set — lesson 5 of chapter 057, lesson 3 of chapter 081 (audited in the remaining-findings lesson).
- `cacheTag` + `updateTag` invalidation seams — Chapter 032, Unit 15a project (recorded in the ADR 0007 lesson).
- The "address the code, not the author" reflex — lesson 2 of chapter 103.

---

## Lesson 1 — Project Overview

The student clones the seeded-PR starter, runs it, opens the diff, and writes the review-stack pass-order header — leaving with a running audit target and no findings written yet.

### What we're building

A read-only review pass on a seeded pull request, plus the one ADR the PR's design decision earns.
The deliverable is two committed artifacts: `reviews/chapter 104.md` with five line-level comments, a severity summary, and a verdict; and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` with the three Nygard sections filled.
No fixes are pushed to the feature branch — the proposed fix lives in each comment body.
Figure: the seeded PR's "Files changed" view alongside a filled comment block in the four-part template, so the student knows what the surface and the deliverable look like before opening the diff.

### What we'll practice

- Running a PR through the five-layer review stack in stack order rather than top-down on the diff.
- Writing review comments in the four-part anatomy — severity, observation, principle/pattern with lesson ID, action.
- Drawing the blocking-vs.-suggesting cut and reading every security-relevant mutation against the canonical audit-log catalog.
- Running the three-test inclusion check to decide what earns an ADR, and writing a crisp, honest ADR in the Nygard shape.
- Self-grading a review against a rubric and turning the misses into a sharper personal checklist.

### Architecture

The review is a pipeline of four disciplines applied to one PR:

- **The review stack** orders the pass: correctness/security → principles → patterns → tests/contracts → style. The student commits to this order in writing before opening the diff.
- **The principle-and-pattern map** (a one-page cheatsheet condensed from lesson 1 of chapter 103) is the reference every comment cites by ID. Keep it open in a second tab throughout.
- **The four-part comment template** (`reviews/template.md`) is the shape every finding takes.
- **The Nygard ADR scaffold** (the `0007-...md` stub) is the shape the one recorded decision takes.

The audit target — the running app on the `feature/customer-plan-overview` branch — never changes. The two deliverable files are the only things that grow.

### Starting file tree

See the annotated tree and the nine-file diff map in the Chapter framing above. The two highlighted focus files — the ones the student edits — are `reviews/chapter 104.md` (the comments, summary, and verdict) and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (the ADR); `reviews/template.md` is read once as the comment scaffold. The canonical helpers (`lib/authed-action.ts`, `lib/audit-log.ts`, `lib/tenant-db.ts`, `lib/temporal.ts`, `lib/billing/*`) are read once here to calibrate the eye for where the diff bypasses them.

### Roadmap

- **Lesson 2 — The auth bypass.** Walks finding 1 end-to-end (the missing `authedAction` wrapper) as the review's modeled comment.
- **Lesson 3 — Four more blocking findings.** Surfaces the side-effect import, the `Date` arithmetic, the derived-state effect, and the missing audit-log write, then closes the review file with the summary and verdict.
- **Lesson 4 — ADR 0007.** Runs the three-test inclusion check and writes the cache-decision ADR with a crisp Decision line and an honest Consequences list.

### Setup

1. Clone the starter with `degit` and enter the directory.
2. `pnpm install` — installs cleanly.
3. `pnpm dev` — the app runs locally on `:3000` on `main`.
4. `git fetch && git checkout feature/customer-plan-overview` — the seeded PR branch is visible in the GitHub-style diff view (or via `git diff main..feature/customer-plan-overview` from the CLI).
5. Open `reviews/chapter 104.md` and write the pass-order header first: `Pass order: correctness/security → principles → patterns → tests/contracts → style`, plus a one-line note on where you start. Read `reviews/template.md` once, and open the principle-and-pattern cheatsheet in a second tab.

No environment variables beyond those the upstream project already documents.
Expected result: the app runs locally, the seeded diff is visible, and the review file carries its pass-order header — no comments written, no ADR drafted.

The pass-order header is not decoration: it forces the student to commit, in writing, to the senior reflex before touching the diff. The review reads top-down on the review stack, not top-down on the diff — starting at line 1 of the first file is the failure mode lesson 1 of chapter 103 warned against. Skipping the header is the first signal a review will drift into style commentary.

The rubric tag (`v1.0-answer-key`) is published from day one, but the student is on the honor system not to check it out until the commits land in lesson 4 — a real review has no answer key, and the student who runs the pass under "no peeking" trains the reflex.

This is a principle-and-pattern review, not a full architectural rethink (the diff's scope is the plan overview surface, not billing), not a style review (Biome and the formatter already passed in CI), not a security audit (chapter 082 was the seeded security audit), and not a re-implementation (no fixes pushed, no rebase). Test coverage is part of the review stack from lesson 1 of chapter 103 but is not a deliverable here.

---

## Lesson 2 — The auth bypass

Goal: write the first review comment — the missing `authedAction` wrapper on the plan-label mutation — as a correctly shaped, correctly severed `blocking:` finding.
Finished result: `reviews/chapter 104.md` carries the pass-order header plus comment 1, filled in the four-part template and pinned to `app/(app)/plan/actions.ts`. This is the review's rhythm-setter — the worked example the student re-reads whenever a later comment feels stuck.

### Your mission

The first finding is the gift: you walk it end-to-end so the cadence is set before you tackle the rest on your own. Open the seeded diff and read the mutation in `app/(app)/plan/actions.ts` against the canonical wrapper in `lib/authed-action.ts` — the senior reflex is "what was the established surface, and where does the diff bypass it?" The action carries a `'use server'` directive followed by a hand-rolled `const session = await auth()` and an `if (!session) throw`, which means it accepts any signed-in user including non-admins, drops the `tenantDb` scope on the update, and runs a write-side mutation with no rate limit. That is one bypass that punches three holes at once, which is why it lands as `blocking:` and not as a style preference. The comment you write addresses the code, not the author ("`updatePlanLabel` hand-rolls `auth()`" beats "you hand-rolled `auth()`") so the receiving author reads it without defensiveness, and its principle/pattern line carries the load: naming the rule with a lesson ID is what makes the comment portable to the author, where "this is wrong" alone is the failure mode lesson 2 of chapter 103 calls out. Work the cadence in order — read the file, find the bypass, name the principle/pattern, set the severity, write the comment in the template — and resist switching files mid-comment, which fragments the review. The blocking-vs.-suggesting cut is in scope and the wrapper bypass is the clearest blocker in the diff; pushing a fix to the branch is out of scope, since the fix you propose lives in the comment body.

- The review file carries a comment pinned to the file and the line range of the hand-rolled `auth()` call in `app/(app)/plan/actions.ts`.
- The comment carries a `blocking:` severity label, justified by the security-and-correctness consequence rather than preference.
- The comment's observation names the bypass in code terms and names all three guarantees it drops: the role check, the tenant scope, and the rate limit.
- The comment cites SaaS pattern #2 (lesson 2 of chapter 057) and Principle #3 (chapter 029 / chapter 042) as the violated rule, with the lesson ID.
- The comment's action proposes wrapping the mutation in `authedAction('admin', updatePlanLabelSchema, fn)` in one sentence.
- The comment is phrased in the address-the-code-not-the-author voice.

### Coding time

Write comment 1 into `reviews/chapter 104.md` against the brief and the lesson's checker. Read the reference comment after your attempt.

<details>

Reference comment block:

```
**blocking:** `app/(app)/plan/actions.ts` L4-12 — `updatePlanLabel` hand-rolls `auth()` and skips the role + tenant + rate-limit guarantees.
Principle/pattern: SaaS pattern #2 (lesson 2 of chapter 057 — `authedAction(role, schema, fn)`).
Action: replace the manual auth and Zod parse with `authedAction('admin', updatePlanLabelSchema, async (input, ctx) => { ... })`.
```

Decision rationale: the action wraps in `authedAction('admin', ...)` rather than adding a role check by hand because the wrapper closes the role, tenant, and rate-limit gaps in one named seam — adding only a role check would leave two holes open and re-introduce the manual seam Principle #3 warns against. Naming all three dropped guarantees in the observation is what calibrates the severity: one missing check might be `suggestion:`, three at once on a write-side mutation is `blocking:`.

</details>

### Moment of truth

Run the lesson's comment checker (`pnpm test:review` or the command the starter documents). It passes when `reviews/chapter 104.md` contains a comment block pinned to a file and line, carrying all four parts — a severity label, an observation, a `Principle/pattern:` line, and an `Action:` line.

Hand-check the parts the checker can't judge, ticking each off:

- [ ] The severity is `blocking:`, not `suggestion:` — mis-labeling here is the partial-credit miss the rubric penalizes even when the finding is correctly located.
- [ ] The observation names all three dropped guarantees (role, tenant, rate limit), not just one.
- [ ] The cited rule is SaaS pattern #2 (with the lesson ID), and the action proposes the `authedAction('admin', ...)` wrap.
- [ ] The comment addresses the code, not the author.

---

## Lesson 3 — Four more blocking findings

Goal: complete the review by writing the remaining four `blocking:` findings, then closing the file with the severity summary and the request-changes verdict.
Finished result: `reviews/chapter 104.md` holds all five comment blocks in the four-part template, a `## Summary` with severity totals and the PR-size note, and a closing `Verdict: request changes` line — the review is ready to commit.

### Your mission

With the cadence set, you now surface the four remaining findings yourself, working file-by-file in review-stack order rather than top-down on the diff. Two of these reward a specific senior reflex you should carry through: the side-effect import (finding 2) is the kind you find by reading the imports, not the function body — a bare `import '@/lib/analytics/page-view-tracker'` at the top of a server component means "open the imported module and read its top-level body," and if there is executable code at module scope that touches the world, the import *is* the call; the missing audit-log write (finding 5) is the kind that hides because nothing visibly breaks, so you read every security-relevant mutation against the canonical event catalog and ask "does this write an audit-log entry?" The other two have sharper rules than juniors reach for: time math the user sees crosses Temporal with no exceptions (not merely "be careful with dates"), and a value derivable from other state is never `useState` plus a syncing `useEffect` — the state itself is the bug, so the fix deletes it rather than memoizing it. All five seeded findings are `blocking:` by design because each violates an established rule with security, correctness, or contract consequences; the senior-reach bonus findings (a TSDoc `suggestion:`, a naming `nit:`, a co-location `praise:`) are in scope as extra credit but never required, because the chapter teaches restraint — a review with twelve nits drowns the signal, and the right severity *mix* beats the most comments. Keep every comment in the address-the-code-not-the-author voice. Pushing fixes to the branch stays out of scope.

- The review file carries a `blocking:` comment on the bare side-effect import in `app/(app)/plan/page.tsx`, citing Principle #6 and proposing an explicit call site (event handler in a Client Component) or removal if PostHog auto-capture covers the page view.
- The review file carries a `blocking:` comment on the `Date`-arithmetic countdown in `lib/plan/renewal-countdown.ts`, citing SaaS pattern #13 and proposing both the Temporal switch and reading the timezone from the user profile.
- The review file carries a `blocking:` comment on the derived-state effect in `app/(app)/plan/seat-usage.tsx`, citing Principle #7 and the derive-don't-sync rule, and proposing deletion of both the state and the effect in favor of an inline computation.
- The review file carries a `blocking:` comment on the missing audit-log write in `app/(app)/plan/actions.ts`, citing the canonical event catalog and proposing the `logAudit(tx, ...)` call inside the transaction with the `organization.plan-label-changed` action.
- The `## Summary` records the severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the PR-size note (~220 LOC, under the 400 threshold, no structural split needed), and a one-line pass-order recap.
- The file closes with a `Verdict: request changes` line naming the five blocking issues.

### Coding time

Write comments 2 through 5, the summary, and the verdict against the brief and the lesson's checker. Read the reference comments after your attempt.

<details>

Reference comment blocks:

```
**blocking:** `app/(app)/plan/page.tsx` L1 — bare `import '@/lib/analytics/page-view-tracker'` fires a network call at server render time; the side effect is invisible at the call site.
Principle/pattern: Principle #6 explicit-over-magic (chapter 029).
Action: move the tracker to a named `trackPlanPageView()` call in an event handler in a Client Component, or remove if PostHog auto-capture covers the page view.
```

```
**blocking:** `lib/plan/renewal-countdown.ts` L8-10 — `new Date(...).getTime() - Date.now()` divided by `1000*60*60*24` returns the wrong day count across a DST boundary and ignores the user's profile timezone.
Principle/pattern: SaaS pattern #13 time/dates/timezones (Chapter 083 / chapter 085).
Action: switch to `Temporal.PlainDate.from(...).until(today, { largestUnit: 'days' })` and read the timezone from the user profile.
```

```
**blocking:** `app/(app)/plan/seat-usage.tsx` L6-14 — `seatsRemaining` is held in `useState` and synced from `seatsAllocated`/`seatsUsed` via `useEffect`; the two can disagree for one frame after a props change.
Principle/pattern: Principle #7 impossible-states-unrepresentable / derive-don't-sync (Chapter 025).
Action: delete the state and the effect; compute `seatsRemaining = seatsAllocated - seatsUsed` inline.
```

```
**blocking:** `app/(app)/plan/actions.ts` L18-24 — the `planLabel` update runs in a transaction with no `logAudit` call; the compliance trail is silent on a security-relevant mutation.
Principle/pattern: canonical audit-log event catalog (lesson 5 of chapter 057 / lesson 3 of chapter 081).
Action: add `await logAudit(tx, { action: 'organization.plan-label-changed', subjectType: 'organization', subjectId: ctx.orgId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { previousLabel, nextLabel } })` inside the transaction.
```

Bonus comments (extra credit, not required):

```
**suggestion:** `lib/plan/get-plan-entitlement.ts` L3 — the exported entitlement read has no TSDoc; it's a cross-module public surface.
Principle/pattern: cross-module Server-Action-shape docs (lesson 1 of chapter 102).
Action: add a one-paragraph TSDoc with summary, `@param`, `@returns`, and a `@throws` for the unauthorized case.

**nit:** `app/(app)/plan/seat-usage.tsx` L4 — `handlePlanThing` doesn't name its intent.
Principle/pattern: Principle #4 name-for-intent.
Action: rename to `onSeatLimitWarningClick` or similar.

**praise:** `src/lib/plan/` — schema, action, read function, and component are co-located by feature.
Principle/pattern: Principle #1 co-locate-by-feature.
Action: none — naming the choice so the author knows the pattern landed.
```

Decision rationale: finding 4's action deletes the state rather than reaching for `useMemo` because the state itself is the bug — the value is derivable, so storing it at all is what makes the impossible state representable. Finding 5's `logAudit` goes inside the same transaction so an outer rollback also unwinds the audit row; logging after commit would leave an orphan event if the transaction later fails. The bonus findings are kept as `suggestion:`/`nit:`/`praise:` rather than promoted to blockers because they're the right shape with a subjective choice, and inflating them to blocking would blunt the blocking-vs.-suggesting cut the rubric scores.

</details>

### Moment of truth

Run the lesson's review checker (`pnpm test:review` or the documented command). It passes when `reviews/chapter 104.md` contains five comment blocks, each pinned to a file and line and each carrying all four parts, plus a `## Summary` with severity totals and a `Verdict:` line.

Hand-check what the checker can't judge, ticking each off:

- [ ] All five findings are labeled `blocking:` — any `suggestion:` mis-label loses the severity-credit half on that finding.
- [ ] Finding 3's action names both fixes (Temporal and the profile timezone), not just Temporal.
- [ ] Finding 4's action deletes the state and the effect, not "memo it."
- [ ] Finding 5's `logAudit` call sits inside the transaction and names the `organization.plan-label-changed` action with the payload shape.
- [ ] The summary's PR-size note records that the 400-LOC threshold did not fire (~220 LOC), and the verdict reads "request changes."
- [ ] Every comment is in the address-the-code-not-the-author voice.

---

## Lesson 4 — ADR 0007

Goal: write `0007-cache-entitlement-reads-with-cacheTag.md` — the one decision in the diff that earns an ADR — with a crisp Decision line and an honest Consequences list, then commit both deliverables and self-grade against the rubric.
Finished result: a populated ADR with all four Nygard sections, an updated `docs/adr/README.md` index entry, both artifacts committed, and a side-by-side self-grade against `v1.0-answer-key`.

### Your mission

Not every change in a diff earns an ADR, so you start by running the three-test inclusion check from lesson 4 of chapter 101 across the PR's candidate decisions and reject the ones that don't qualify: adding the `planLabel` column has no real architectural alternative and reverses in one PR, and co-locating the `lib/plan/` module is convention application, not a new decision — only caching the entitlement read survives all three tests, because it shapes every future plan-touching surface, has a reasonable alternative (per-request reads, or `revalidatePath`), and would cost a sweep of `updateTag` call sites to reverse. You write the ADR live into the stub file in the Nygard shape, and three sections carry the weight. The Decision is one declarative sentence with no hedging — "we will cache..." not "we're considering" or "we should" — because the hedge belongs in Context (as "we considered no-cache and rejected it") or Consequences (as "reversal cost is one PR"), never in the Decision line, and this is the most common failure point as students get nervous about committing in writing. The Context names the read pattern and its scale and names the rejected alternative with a reason, because an ADR that pretends there was no choice records nothing. The Consequences is the honesty test: it lists every mutation seam that must now own an `updateTag` call rather than waving at "every mutation must invalidate," names the `updateTag`-vs-`revalidateTag` cut with its lesson reference for the background-job path, and states the reversal cost honestly — three bullets that are all upsides is a sales pitch, and the future maintainer needs the trade-off to decide whether the decision still holds. The filename slug is part of the contract: a noun phrase of the decision, not a verb phrase describing the change. Updating the ADR index in the same edit is in scope by convention; choosing a different cache key strategy or re-litigating the caching decision is out of scope — you are recording the decision the diff made, not making a new one.

- The three-test inclusion check is applied to each candidate decision, and only the caching decision is selected, with the other two rejected for a stated reason.
- The ADR file is named `0007-cache-entitlement-reads-with-cacheTag.md` — a noun phrase of the decision, numbered after 0006.
- The Status reads "Accepted" with a date.
- The Context names the entitlement read's scale and access pattern and names the rejected alternative (per-request reads, or `revalidatePath`) with the reason it was rejected.
- The Decision is a single declarative sentence naming the `cacheTag` read and the `updateTag` invalidation commitment, with no hedging language.
- The Consequences enumerate every mutation seam that must call `updateTag`, name the `revalidateTag('...', 'max')` background-job path with its lesson reference, and state the reversal cost honestly.
- The `docs/adr/README.md` index carries a one-line entry for 0007.
- Both artifacts are committed, and the review file and ADR are self-graded side-by-side against the `v1.0-answer-key` rubric.

### Coding time

Write the ADR and the index entry against the brief, then commit and check out the rubric. Read the reference ADR after your attempt.

<details>

Reference ADR body:

```
# ADR 0007 — Cache entitlement reads with cacheTag

## Status
Accepted — 2026-MM-DD.

## Context
The plan-entitlement read is the hottest read in the app — every page in the authenticated surface checks it for feature gating, and the read fans out into a three-table join. At ten signed-in users per org per dashboard refresh, that is 30+ joins per minute per org. Two surfaces need fresh reads: the plan page itself (immediately after a label change or upgrade) and the entitlement-gating middleware (no stale gates). Background jobs (the daily summary, the seat-utilization report) tolerate up to a minute of staleness. The alternative considered was per-request reads with no cache; rejected because the join cost scales linearly with active sessions while the entitlement rarely changes — a typical org sees one mutation per quarter. `revalidatePath` was also viable but ties invalidation to routes rather than the data, which the mutation seams don't all share.

## Decision
We will cache `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` and `cacheLife('minutes')`, and invalidate via `updateTag(orgPlanEntitlementTag(orgId))` from every mutation seam that touches plan or entitlement state.

## Consequences
- Every plan-or-entitlement mutation now owns an `updateTag` call adjacent to the DB write: `lib/billing/upgrade.ts`, `lib/billing/downgrade.ts`, `app/(app)/plan/actions.ts:updatePlanLabel`, `lib/seats/add.ts`, `lib/seats/remove.ts`, and the Stripe webhook handlers in `app/api/webhooks/stripe/`.
- Background jobs that batch-update entitlements (the daily summary recalculator, the quota sweeper) use `revalidateTag(orgPlanEntitlementTag(orgId), 'max')` instead of `updateTag` because they're not in a user-facing request path (the `updateTag`-vs-`revalidateTag` cut is from Chapter 032).
- Reads that didn't trigger a mutation see a staleness window bounded by the `'minutes'` profile — acceptable for gating because entitlements change quarterly, and the plan page inherits the fresh `updateTag` path after a mutation.
- Failure mode: a future mutation that forgets `updateTag` leaves the entitlement stale for up to 60 seconds, and the gating middleware shows the old plan. Mitigation: the TSDoc on `getPlanEntitlement` lists every mutation seam that must call `updateTag`, so audits can grep the list against the codebase.
- The convention lives in `AGENTS.md` ("plan-entitlement reads are cached; mutations must `updateTag`") and the cached function's TSDoc.
- Reversal cost: one PR to delete the `'use cache'` annotation and the `updateTag` calls; cheap during the first quarter, expensive only if downstream features grow to depend on the cache shape.
```

ADR index entry in `docs/adr/README.md`: `0007 — Cache entitlement reads with cacheTag — Accepted — 2026-MM-DD`.

Commit and self-grade:

```
git add reviews/ docs/adr/0007-*.md docs/adr/README.md
git commit -m "Unit 21 PR review and ADR 0007"
git fetch && git checkout v1.0-answer-key -- solution/reviews/ solution/docs/adr/0007-*.md
```

Decision rationale: the `'minutes'` profile is the trade-off the ADR records, not an arbitrary number — naming the window and why is what distinguishes the recorded decision from a `revalidate: 3600` magic number. Listing the mutation seams converts a vague "remember to invalidate" into a list a future maintainer can grep; the prose alone isn't structural enforcement. The filename slug is a noun phrase (`cache-entitlement-reads-with-cacheTag`) rather than a verb phrase (`add-use-cache-to-getplanentitlement`) because it names the decision, not the change. For the `updateTag`/`revalidateTag` cut and the `cacheLife` profiles, link to Chapter 032 rather than re-explaining.

</details>

### Moment of truth

Run the lesson's ADR checker (`pnpm test:adr` or the documented command). It passes when `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` exists with a filename slug that is a noun phrase, carries all four sections (Status / Context / Decision / Consequences), and the Decision section contains no hedging tokens ("we should", "we're considering", "maybe").

Then commit both artifacts, check out `v1.0-answer-key` into `solution/`, and hand-grade side-by-side, ticking each off:

- [ ] Only the caching decision was selected by the three-test check; the column add and the co-location were rejected with a reason.
- [ ] Status is "Accepted" with a date; the Context names the alternative and rejects it with a reason.
- [ ] The Decision is one declarative sentence with no hedging.
- [ ] The Consequences list the mutation seams explicitly, name the `revalidateTag` background path with its lesson reference, and state the reversal cost.
- [ ] The five review comments score against the rubric on coverage and severity match — five `blocking:` is the expectation, and a 3/5 review that goes deep on `cacheTag` while silencing the `Date` math is a fail.
- [ ] Misses and wrong severities are read back into a personal review checklist for the next PR — the self-grade is the rehearsal, since a real PR review has no rubric.

When ADR 0007 is later superseded (the cache moves to Redis, or the entitlement model changes), the supersession discipline from lesson 4 of chapter 101 lands: the new ADR references this one, this one's Status updates to "superseded by ADR XXXX", and the file is never deleted. The review-and-ADR cadence rehearsed here is the daily senior craft — the same pass runs on every PR the student reviews in Unit 22 and beyond.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
