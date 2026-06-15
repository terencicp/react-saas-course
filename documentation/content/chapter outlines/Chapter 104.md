# Chapter 104 — Project: Review a PR, write the ADR

## Chapter framing

Chapter 104 closes Unit 21 by running the two disciplines the unit installed — the principle-and-pattern map for code review from chapter 103 and the Nygard ADR template from lesson 4 of chapter 101 — against a running application that ships with deliberate review defects.
This is a documentation-and-review project: nothing in the audit target changes, and every lesson's deliverable is a written artifact that records a finding correctly.
The student leaves with two filled artifacts: the `reviews/chapter 104.md` scaffold completed with five file-and-line-anchored review comments in the four-part Conventional-Comments shape plus a summary and verdict, and the `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` ADR scaffold with the four Nygard sections filled (plus the matching 0007 row appended to the `docs/adr/README.md` index).

The starter ships the audit target — a Next.js 16 invoices app plus a new `/plan` overview surface — complete and running in both `start/` and `solution/` (the two source trees are byte-for-byte identical). There is no separate PR branch and no GitHub-style diff: the "PR under review" is the `/plan` surface and its supporting `src/lib/plan/` modules, which the student reads against the app's established conventions (`authedAction`, `tenantDb`, `logAudit`, the Temporal seam, the existing `'use cache'` reads in `src/lib/invoices/`). The defects live in those source files. The student fills two deliverable files that ship as scaffolds in the starter — `reviews/chapter 104.md` (pass-order header + a `<!-- TODO(L2) -->` marker) and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (Nygard title + four empty `##` sections + a `<!-- TODO(L4) -->` marker) — and appends the 0007 index row to `docs/adr/README.md`.

### Project goals

By the end of the chapter the student has:

- Run the `/plan` surface through the five-layer review stack in stack order — correctness/security, then principles, then patterns, then tests/contracts, then style — filling the `Started at:` line under the pass-order header that ships at the top of the `reviews/chapter 104.md` scaffold before reading the source.
- Written five file-and-line-level review comments, each pinned to a source file and line and each carrying all four parts of the comment anatomy: a severity label, the observation, the principle or pattern it violates with the lesson ID, and the proposed action.
- Labeled every one of the five findings as `blocking:` — the defect set is deliberately a uniform mix so the student practices the blocking-vs.-suggesting cut by example — and recorded the severity totals in a `## Summary` section.
- Closed the review file with a "request changes" verdict and a one-line scope note (the `/plan` surface under review is small — a handful of files, well under the 400-LOC threshold — so no structural "split this" comment is warranted).
- Identified, by running the three-test inclusion check across the surface's candidate decisions, the one decision that earns an ADR — caching the entitlement read in `getPlanEntitlement` with `cacheTag` versus reading per request — and rejected the candidates that don't.
- Written ADR 0007 with a Status, a Context that names the read pattern and the rejected alternative, a single declarative Decision line with no hedging, and an honest Consequences list that enumerates every mutation seam that must call `updateTag`.
- Self-graded both artifacts against the `solution/` reference review and ADR after writing, scoring coverage and severity match and updating a personal review checklist for the next PR.

The review is a read-only pass on the running app: the student leaves comments and writes the ADR, but changes none of the audited source — the proposed fix lives in the comment body, not in an edit.
Self-grading is the senior reach: the reference deliverables live in `solution/` but the student is on the honor system not to open them until the review and ADR are written, because a real review has no answer key and the student who runs the pass under "no peeking" trains the reflex. (The `start/` tree ships both deliverables as scaffolds — `reviews/chapter 104.md` with the pass-order header and a `<!-- TODO(L2) -->` marker, and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` with the four empty Nygard sections and a `<!-- TODO(L4) -->` marker — plus a once-read `reviews/template.md` comment scaffold and a `docs/adr/README.md` index seeded with rows 0001–0006; the student fills these in place, and the `solution/` tree holds the completed reference versions.)

### Dependency carry-in

The review invokes every principle and pattern the course established plus the two disciplines from Unit 21.
The starter continues the course's running invoices project (the tag-driven caching surface from Unit 14, carrying `src/lib/invoices/queries.ts`, `src/lib/invoices/actions.ts`, the inspector, and the cache helpers in `src/lib/cache/`), with the new `/plan` overview surface and its `src/lib/plan/` modules added as the audit target; see `Project dependencies.md` for the upstream lineage.

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
  - `cacheTag` + `updateTag` / `revalidateTag` decision tree — Unit 14 (chapters 072-074, applied in the Unit 14 caching project this starter continues).

### Starter file tree (the audit target)

The starter ships the running invoices app with the `/plan` overview surface added. `start/` and `solution/` are byte-for-byte identical across all source files — the audit target is the same in both. There is no PR branch and no diff; the "PR under review" is the `/plan` surface and its `src/lib/plan/` modules.

```
start/
  package.json                           # scripts: dev, build, verify, test:lesson
  reviews/
    template.md                          # the four-part comment scaffold — read once
    chapter 104.md                       # SCAFFOLD: pass-order header + `Started at:` + <!-- TODO(L2) --> (student fills it)
  docs/
    adr/
      README.md                          # ADR index intro + rows 0001-0006 (index rows only) + <!-- TODO(L4) -->
      0007-cache-entitlement-reads-with-cacheTag.md  # SCAFFOLD: Nygard title + 4 empty ## sections + <!-- TODO(L4) -->
  src/
    app/
      (app)/
        invoices/                        # the carried-over invoices list + edit (untouched)
        plan/
          page.tsx                       # the new server-component surface; smuggled side-effect import (finding 2)
          seat-usage.tsx                 # seat counter Client Component; derived-state effect (finding 4)
          actions.ts                     # updatePlanLabel; missing authedAction (finding 1) + missing audit log (finding 5)
          loading.tsx
      inspector/                         # the cache inspector carried from Unit 14
    lib/
      authed-action.ts                   # SaaS pattern #2 — the canonical wrapper the diff bypasses
      audit-log.ts                       # logAudit(tx, event) — the seam finding 5 skips
      tenant-db.ts                       # SaaS pattern #1 — the facade finding 1 reaches past
      temporal.ts                        # the Temporal seam finding 3 should use
      cache/
        tags.ts                          # invoiceTags + orgPlanEntitlementTag
        profiles.ts, log.ts
      invoices/
        queries.ts                       # the existing 'use cache' reads (the ADR's precedent)
        actions.ts                       # the existing updateTag mutation seams (the ADR's precedent)
      plan/
        get-plan-entitlement.ts          # the cached read — the ADR target
        renewal-countdown.ts             # the Date-arithmetic countdown (finding 3)
        schemas.ts                       # updatePlanLabelSchema
      analytics/
        page-view-tracker.ts             # module-top-level fetch — the side effect finding 2 imports
    server/
      jobs/summary-recompute.ts          # revalidateTag background-job seam (ADR Consequences)
  lesson-verification/                   # ships empty (.gitkeep); no automated checker for this chapter
```

The student fills two deliverable scaffolds that ship in the starter: `reviews/chapter 104.md` (pass-order header + a blank `Started at:` line + a `<!-- TODO(L2) -->` marker — the student adds the five comments, summary, and verdict) and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (the Nygard title + four empty `##` sections + a `<!-- TODO(L4) -->` marker — the student fills the sections). The four-part comment shape is carried in `reviews/template.md` (read once) and from lesson 2 of chapter 103; the `docs/adr/README.md` index ships seeded with rows 0001–0006 (index rows only — there are no separate 0001–0006 `.md` files) and the student appends the 0007 row in lesson 4. No audited source file changes.

The files the review walks, and the area each touches (the deep read of each lands in the lesson that audits it):

- `src/app/(app)/plan/page.tsx` — the new server-component surface; carries the bare side-effect import (finding 2).
- `src/app/(app)/plan/seat-usage.tsx` — the seat counter Client Component; carries the derived-state effect (finding 4) and the `handlePlanThing` naming nit.
- `src/app/(app)/plan/actions.ts` — the plan-label mutation; carries the missing `authedAction` wrapper (finding 1) and the missing audit-log write (finding 5).
- `src/lib/plan/get-plan-entitlement.ts` — the cached read; the ADR target.
- `src/lib/plan/renewal-countdown.ts` — the renewal time math; carries the `Date` arithmetic (finding 3).
- `src/lib/analytics/page-view-tracker.ts` — the tracker module whose top-level body fires a network call on import.
- `src/lib/plan/schemas.ts` — the Zod schema for the mutation input.

The canonical helpers the surface is reviewed against — read once during the overview so the eye is calibrated for the bypass: `src/lib/authed-action.ts` (SaaS pattern #2, lesson 2 of chapter 057), `src/lib/audit-log.ts` (lesson 5 of chapter 057), `src/lib/tenant-db.ts` (SaaS pattern #1), `src/lib/temporal.ts` (the time primitive from Chapter 083), and the existing `'use cache'` reads in `src/lib/invoices/queries.ts` with their `updateTag` seams in `src/lib/invoices/actions.ts` (the caching pattern from Unit 14).

### The audit target — what the `/plan` surface claims

The `/plan` surface is presented as a unit of work to review: "a per-org plan overview showing current entitlement, seats used, and renewal countdown, with the entitlement read cached so the surface doesn't hammer the data layer." The surface broadly delivers what it claims, so the review does not escalate to a contract-gap dispute; it runs the principle-and-pattern pass.

The surface contains five review-worthy issues plus one design decision worth an ADR. Each is positioned so the student can find it by walking the review stack top-down.

1. **Missing `authedAction` wrapper (SaaS pattern #2, Principle #5).** `src/app/(app)/plan/actions.ts` exports `updatePlanLabel` as a bare `'use server'` function with a hand-rolled `const session = await getSession()` and an `if (!session) throw`; no role check, no `tenantDb` (it mutates `org.planLabel` on the store record directly), and a dead guard (`getSession()` never returns null — it throws or returns a `Session`). Severity: `blocking:`. The principle/pattern violated: SaaS pattern #2 (the wrapper exists; bypassing it is a hole) and Principle #5 (use framework conventions; don't hand-roll the named wrapper). Action: wrap in `authedAction('admin', updatePlanLabelSchema, fn)` and route the write through `tenantDb(orgId).update.organizationPlanLabel(...)`.
2. **Side-effect import into a server component (Principle #6).** `src/app/(app)/plan/page.tsx` imports `'@/lib/analytics/page-view-tracker'` at module top; the tracker module's top-level body calls `void track()`, firing a `fetch` on import. Severity: `blocking:`. Principle violated: #6 (explicit over magic); the side effect should be a named call site, not a smuggled import. Action: move to an explicit `trackPlanPageView()` call at a real boundary, or remove if analytics auto-capture covers the page view.
3. **`Date` arithmetic on the renewal countdown (SaaS pattern #13).** `src/lib/plan/renewal-countdown.ts` does `new Date(renewsAt).getTime() - Date.now()` then divides by `1000 * 60 * 60 * 24`. The path assumes a fixed 24-hour day (breaks at DST boundaries) and reads the machine clock. Severity: `blocking:`. Pattern violated: #13 (time/dates/timezones — the Temporal primitive is mandatory for user-visible time math). Action: switch to the `Temporal` seam (`plainDateFromString(renewsAt).until(today, { largestUnit: 'days' })`).
4. **Derived state synced with an effect (Principle #7, derive-don't-sync from chapter 025).** `src/app/(app)/plan/seat-usage.tsx` keeps `seatsRemaining` in `useState` and resyncs it from the `seatsAllocated`/`seatsUsed` props via `useEffect`. The rendered value can lag the props for a frame after they change. Severity: `blocking:`. Principle violated: #7 (impossible-states-unrepresentable) and the derive-don't-sync rule from Chapter 025. Action: compute `seatsRemaining` inline as `seatsAllocated - seatsUsed`; delete the state, the effect, and the resync handler.
5. **Missing audit-log write on plan label change (the audit-log catalog, lesson 5 of chapter 057 / lesson 3 of chapter 081).** The `updatePlanLabel` action mutates the org's `planLabel` but never calls `logAudit(tx, event)`. The change is silent to the compliance trail. Severity: `blocking:`. Pattern violated: the canonical audit-log event set (`organization.plan-label-changed` belongs in the catalog). Action: add a `logAudit({ orgId, actorUserId }, { action: 'organization.plan-label-changed', ... })` call alongside the write.

**The one design decision worth an ADR.** `getPlanEntitlement(orgId)` (in `src/lib/plan/get-plan-entitlement.ts`) carries a `'use cache'` annotation with `cacheTag(orgPlanEntitlementTag(orgId))` (the `orgPlanEntitlementTag` helper in `src/lib/cache/tags.ts`) and `cacheLife('minutes')` (the same profile the invoices reads use). The alternative is reading the entitlement per request. The decision shapes every future plan-touching surface (the plan page, the seat counter, any gating read) and would cost a sweep of `updateTag` call sites to reverse. No recorded decision exists for it — only the cache annotation in the code. The student writes ADR 0007 capturing the *Context* (the read pattern, the surfaces that need fresh reads, the cache-vs-fresh trade-off), the *Decision* ("we will cache `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` and invalidate via `updateTag` at every mutation seam"), and the *Consequences* (every mutation seam that touches plan state now owns an `updateTag` call — list them; the staleness window bounded by the `'minutes'` profile; the `revalidateTag` background-job path; the failure mode if a mutation forgets the `updateTag`).

**Bonus findings the reference acknowledges as the senior reach.** The surface also ships a missing TSDoc on the exported `getPlanEntitlement` (cross-module read surface — lesson 1 of chapter 102), a `nit:` opportunity on a name (`handlePlanThing` in `seat-usage.tsx` should name intent — Principle #4), and a `praise:` opportunity (the file structure that co-locates the schema, the action, the read, and the component under `src/lib/plan/` and `src/app/(app)/plan/` per Principle #1). "5 is the floor, 7–8 is the senior reach" — the bonus is not required.

### Reference-solution signatures the lessons display

The lessons display these signatures verbatim so students don't invent variants. The reference deliverables live under `solution/` (`solution/reviews/chapter 104.md`, `solution/docs/adr/0007-...md`).

- The four-part comment template the student writes each finding in — ships as `reviews/template.md` (read once) and carried from lesson 2 of chapter 103:
  ```
  **[severity]:** `path/to/file.ts` L[line] — one-line observation.
  Principle/pattern: #N from Chapter X.Y.Z.
  Action: one sentence proposing the fix or asking the question.
  ```
- The reviews file shape (`reviews/chapter 104.md`) — the starter scaffold already carries the header and a blank `Started at:` line; the student fills the rest:
  - Header with "Pass order: correctness/security → principles → patterns → tests/contracts → style" (shipped) and a one-line `Started at:` note on where the student started.
  - Five numbered comment blocks in the template above.
  - A `## Summary` section at the bottom: one-line per finding with severity totals (e.g., `5 blocking`, `0 suggestion`, `0 question`, `0 nit`, `0 praise`) and a one-line scope note (the `/plan` surface is small, well under the 400-LOC threshold from lesson 1 of chapter 103 — no "split this" structural comment needed).
  - A closing `Verdict:` line ("request changes — five blocking issues, see comments 1–5").
- The ADR filename: `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` — ships in the starter as a Nygard scaffold (H1 title + four empty `##` sections + `<!-- TODO(L4) -->` marker) that the student fills. Numbered 0007 (the team's prior ADRs run 0001–0006, present as index rows in `docs/adr/README.md`); the slug is the noun phrase of the decision, not "ADR-0007" alone.
- The ADR template body (the literal Nygard scaffold already inside the file, with the student filling each section):
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
- `cacheTag` + `updateTag` invalidation seams — Unit 14 caching project (chapters 072-074), the precedent this starter carries in `src/lib/invoices/` (recorded in the ADR 0007 lesson).
- The "address the code, not the author" reflex — lesson 2 of chapter 103.

---

## Lesson 1 — Project Overview

The student clones the starter, runs it, reads the `/plan` surface, and writes the review-stack pass-order header — leaving with a running audit target and no findings written yet.

### What we're building

A read-only review pass on the `/plan` surface of a running app, plus the one ADR the surface's design decision earns.
The deliverable is two scaffolds filled in place: `reviews/chapter 104.md` (which ships with the pass-order header and a `<!-- TODO(L2) -->` marker) completed with five file-and-line-level comments, a severity summary, and a verdict; and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (which ships with the four empty Nygard sections) with those sections filled.
No audited source is changed — the proposed fix lives in each comment body.
Figure: the `/plan` surface running in the browser alongside a filled comment block in the four-part template, so the student knows what the surface and the deliverable look like before reading the source.

### What we'll practice

- Running a surface through the five-layer review stack in stack order rather than top-down on the file list.
- Writing review comments in the four-part anatomy — severity, observation, principle/pattern with lesson ID, action.
- Drawing the blocking-vs.-suggesting cut and reading every security-relevant mutation against the canonical audit-log catalog.
- Running the three-test inclusion check to decide what earns an ADR, and writing a crisp, honest ADR in the Nygard shape.
- Self-grading a review against the reference and turning the misses into a sharper personal checklist.

### Architecture

The review is a pipeline of four disciplines applied to one surface:

- **The review stack** orders the pass: correctness/security → principles → patterns → tests/contracts → style. The student commits to this order in writing before reading the source.
- **The principle-and-pattern map** (a one-page cheatsheet condensed from lesson 1 of chapter 103) is the reference every comment cites by ID. Keep it open in a second tab throughout.
- **The four-part comment template** (carried from lesson 2 of chapter 103) is the shape every finding takes.
- **The Nygard ADR scaffold** is the shape the one recorded decision takes.

The audit target — the running app's `/plan` surface — never changes. The two deliverable scaffolds the student fills (`reviews/chapter 104.md`, `docs/adr/0007-...md`) and the `docs/adr/README.md` index are the only things that grow.

### Starting file tree

See the annotated tree and the file map in the Chapter framing above. The two focus files — the ones the student fills — are `reviews/chapter 104.md` (ships with the pass-order header + `<!-- TODO(L2) -->` marker; the student adds comments, summary, verdict) and `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (ships with the four empty Nygard sections + `<!-- TODO(L4) -->` marker; the student fills them); both ship as scaffolds in the starter, alongside the once-read `reviews/template.md` and the `docs/adr/README.md` index. The canonical helpers (`src/lib/authed-action.ts`, `src/lib/audit-log.ts`, `src/lib/tenant-db.ts`, `src/lib/temporal.ts`, and the existing `'use cache'` reads in `src/lib/invoices/queries.ts`) are read once here to calibrate the eye for where the `/plan` surface bypasses them.

### Roadmap

- **Lesson 2 — The auth bypass.** Walks finding 1 end-to-end (the missing `authedAction` wrapper) as the review's modeled comment.
- **Lesson 3 — Four more blocking findings.** Surfaces the side-effect import, the `Date` arithmetic, the derived-state effect, and the missing audit-log write, then closes the review file with the summary and verdict.
- **Lesson 4 — ADR 0007.** Runs the three-test inclusion check and writes the cache-decision ADR with a crisp Decision line and an honest Consequences list.

### Setup

1. Copy the `start/` tree into a working directory and enter it.
2. `pnpm install` — installs cleanly.
3. `pnpm dev` — the app runs locally on `:3000`; open `/plan` (use the inspector's identity switcher if you want to view a second org).
4. Read the `/plan` surface in the browser and its source files (`src/app/(app)/plan/*` and `src/lib/plan/*`) against the established conventions — there is no PR diff; the surface itself is the unit under review.
5. Open `reviews/chapter 104.md` — it ships with the `Pass order: correctness/security → principles → patterns → tests/contracts → style` header, a blank `Started at:` line, and a `<!-- TODO(L2) -->` marker. Fill the `Started at:` line with a one-line note on where you start. Read `reviews/template.md` once for the four-part comment shape and keep the principle-and-pattern cheatsheet open in a second tab.

No environment variables — the app runs against an in-memory store seeded at boot (`src/server/store.ts`).
Expected result: the app runs locally, the `/plan` surface is visible, and the review scaffold carries its `Started at:` note under the shipped pass-order header — no comments written, no ADR drafted.

The pass-order header is not decoration: the starter ships it so the senior reflex is on the page before the student touches the source, and filling the `Started at:` line is the act of committing, in writing, to where the pass begins. The review reads top-down on the review stack, not top-down on the file list — starting at line 1 of the first file is the failure mode lesson 1 of chapter 103 warned against. Ignoring the shipped pass order is the first signal a review will drift into style commentary.

The reference deliverables live under `solution/`, but the student is on the honor system not to open them until the review and ADR are written in lesson 4 — a real review has no answer key, and the student who runs the pass under "no peeking" trains the reflex.

This is a principle-and-pattern review, not a full architectural rethink (the scope is the plan overview surface), not a style review (Biome and the formatter already pass — `pnpm verify` is green), not a security audit (chapter 082 was the seeded security audit), and not a re-implementation (no source edited). Test coverage is part of the review stack from lesson 1 of chapter 103 but is not a deliverable here; `lesson-verification/` ships empty and there is no automated checker for the written artifacts.

---

## Lesson 2 — The auth bypass

Goal: write the first review comment — the missing `authedAction` wrapper on the plan-label mutation — as a correctly shaped, correctly severed `blocking:` finding.
Finished result: `reviews/chapter 104.md` carries the shipped pass-order header plus comment 1 — written in place of the `<!-- TODO(L2) -->` marker, filled in the four-part template and pinned to `src/app/(app)/plan/actions.ts`. This is the review's rhythm-setter — the worked example the student re-reads whenever a later comment feels stuck.

### Your mission

The first finding is the gift: you walk it end-to-end so the cadence is set before you tackle the rest on your own. Open `src/app/(app)/plan/actions.ts` and read the mutation against the canonical wrapper in `src/lib/authed-action.ts` — the senior reflex is "what was the established surface, and where does this bypass it?" The action carries a `'use server'` directive followed by a hand-rolled `const session = await getSession()` and an `if (!session) throw`, which means it runs no role check (any signed-in member can rewrite the org's plan label), reaches past the `tenantDb` facade to mutate the store record directly, and — as a bonus tell — guards on `if (!session)` when `getSession()` never returns null. That is one bypass that drops two guarantees the wrapper enforces (role + tenant scope), which is why it lands as `blocking:` and not as a style preference. The comment you write addresses the code, not the author ("`updatePlanLabel` hand-rolls the session check" beats "you hand-rolled it") so the receiving author reads it without defensiveness, and its principle/pattern line carries the load: naming the rule with a lesson ID is what makes the comment portable to the author, where "this is wrong" alone is the failure mode lesson 2 of chapter 103 calls out. Work the cadence in order — read the file, find the bypass, name the principle/pattern, set the severity, write the comment in the template — and resist switching files mid-comment, which fragments the review. The blocking-vs.-suggesting cut is in scope and the wrapper bypass is the clearest blocker in the surface; the missing audit-log write in this same file is finding 5 (lesson 3), so leave it for now. Editing the source is out of scope — the fix you propose lives in the comment body.

- The review file carries a comment pinned to the file and the line range of the hand-rolled session check in `src/app/(app)/plan/actions.ts`.
- The comment carries a `blocking:` severity label, justified by the security-and-correctness consequence rather than preference.
- The comment's observation names the bypass in code terms and names the guarantees it drops: the role check and the tenant-facade scope (the dead `if (!session)` guard is a fair extra tell).
- The comment cites SaaS pattern #2 (lesson 2 of chapter 057) and Principle #5 (chapter 029 / chapter 042) as the violated rule, with the lesson ID.
- The comment's action proposes wrapping the mutation in `authedAction('admin', updatePlanLabelSchema, fn)` and routing the write through `tenantDb`, in one sentence.
- The comment is phrased in the address-the-code-not-the-author voice.

### Coding time

Write comment 1 into `reviews/chapter 104.md` (under the shipped pass-order header, replacing the `<!-- TODO(L2) -->` marker) against the brief. Read the reference comment after your attempt.

<details>

Reference comment block:

```
**blocking:** `src/app/(app)/plan/actions.ts` L18-36 — `updatePlanLabel` hand-rolls the session check, runs no role gate, and writes `org.planLabel` past the `tenantDb` facade (the `if (!session)` guard is also dead — `getSession()` never returns null).
Principle/pattern: SaaS pattern #2 (lesson 2 of chapter 057 — `authedAction(role, schema, fn)`) + Principle #5 (use the named wrapper, don't hand-roll it).
Action: wrap in `authedAction('admin', updatePlanLabelSchema, async (input, ctx) => { ... })` and route the write through `tenantDb(ctx.orgId).update.organizationPlanLabel(input.planLabel)`.
```

Decision rationale: the action wraps in `authedAction('admin', ...)` rather than adding a role check by hand because the wrapper closes the role gate and the parse-and-deny path in one named seam — adding only a role check would re-introduce the hand-rolled wrapper Principle #5 warns against. Naming the dropped guarantees (role gate, tenant facade) in the observation is what calibrates the severity: a lone style nit would be `suggestion:`, a write-side mutation that any member can call against the wrong tenant scope is `blocking:`.

</details>

### Moment of truth

There is no automated checker for the review file — `lesson-verification/` ships empty for this chapter. Verify by hand against the comment anatomy: the block is pinned to a file and a line range and carries all four parts — a severity label, an observation, a `Principle/pattern:` line, and an `Action:` line.

Hand-check the parts that take judgment, ticking each off:

- [ ] The severity is `blocking:`, not `suggestion:` — mis-labeling here is the partial-credit miss the reference penalizes even when the finding is correctly located.
- [ ] The observation names the dropped guarantees (role gate, tenant facade), not just one.
- [ ] The cited rule is SaaS pattern #2 (with the lesson ID), and the action proposes the `authedAction('admin', ...)` wrap routed through `tenantDb`.
- [ ] The comment addresses the code, not the author.

---

## Lesson 3 — Four more blocking findings

Goal: complete the review by writing the remaining four `blocking:` findings, then closing the file with the severity summary and the request-changes verdict.
Finished result: `reviews/chapter 104.md` holds all five comment blocks in the four-part template, a `## Summary` with severity totals and the scope note, and a closing `Verdict: request changes` line — the review is complete.

### Your mission

With the cadence set, you now surface the four remaining findings yourself, working file-by-file in review-stack order rather than top-down on the file list. Two of these reward a specific senior reflex you should carry through: the side-effect import (finding 2) is the kind you find by reading the imports, not the function body — a bare `import '@/lib/analytics/page-view-tracker'` at the top of a server component means "open the imported module and read its top-level body," and if there is executable code at module scope that touches the world (here, a `void track()` that fires a `fetch`), the import *is* the call; the missing audit-log write (finding 5) is the kind that hides because nothing visibly breaks, so you read every security-relevant mutation against the canonical event catalog and ask "does this write an audit-log entry?" The other two have sharper rules than juniors reach for: time math the user sees crosses Temporal with no exceptions (not merely "be careful with dates"), and a value derivable from other state is never `useState` plus a syncing `useEffect` — the state itself is the bug, so the fix deletes it rather than memoizing it. All five findings are `blocking:` by design because each violates an established rule with security, correctness, or contract consequences; the senior-reach bonus findings (a TSDoc `suggestion:`, a naming `nit:`, a co-location `praise:`) are in scope as extra credit but never required, because the chapter teaches restraint — a review with twelve nits drowns the signal, and the right severity *mix* beats the most comments. Keep every comment in the address-the-code-not-the-author voice. Editing the source stays out of scope.

- The review file carries a `blocking:` comment on the bare side-effect import in `src/app/(app)/plan/page.tsx`, citing Principle #6 and proposing an explicit named call site or removal if analytics auto-capture covers the page view.
- The review file carries a `blocking:` comment on the `Date`-arithmetic countdown in `src/lib/plan/renewal-countdown.ts`, citing SaaS pattern #13 and proposing the Temporal-seam switch (calendar day math, not millisecond division).
- The review file carries a `blocking:` comment on the derived-state effect in `src/app/(app)/plan/seat-usage.tsx`, citing Principle #7 and the derive-don't-sync rule, and proposing deletion of the state, the effect, and the resync handler in favor of an inline computation.
- The review file carries a `blocking:` comment on the missing audit-log write in `src/app/(app)/plan/actions.ts`, citing the canonical event catalog and proposing the `logAudit` call alongside the write with the `organization.plan-label-changed` action.
- The `## Summary` records the severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the scope note (the `/plan` surface is small, well under the 400-LOC threshold — no structural split needed), and a one-line pass-order recap.
- The file closes with a `Verdict: request changes` line naming the five blocking issues.

### Coding time

Write comments 2 through 5, the summary, and the verdict against the brief. Read the reference comments after your attempt.

<details>

Reference comment blocks:

```
**blocking:** `src/app/(app)/plan/page.tsx` L1 — the bare `import '@/lib/analytics/page-view-tracker'` runs that module's top-level `void track()`, firing a `fetch` at import time; the side effect is invisible at the call site.
Principle/pattern: Principle #6 explicit-over-magic (chapter 029 / chapter 042).
Action: drop the bare import and make the page view an explicit `trackPlanPageView()` call at a real boundary, or remove it if analytics auto-capture already covers the page view.
```

```
**blocking:** `src/lib/plan/renewal-countdown.ts` L8-11 — `new Date(renewsAt).getTime() - Date.now()` divided by `1000*60*60*24` assumes a fixed 24-hour day, so it returns the wrong day count across a DST boundary, and it reads the machine clock.
Principle/pattern: SaaS pattern #13 time/dates/timezones (Chapter 083).
Action: use the Temporal seam (`src/lib/temporal.ts`): `plainDateFromString(renewsAt).until(today, { largestUnit: 'days' }).days`, working in calendar days rather than millisecond division.
```

```
**blocking:** `src/app/(app)/plan/seat-usage.tsx` L15-25 — `seatsRemaining` is held in `useState` and resynced from the `seatsAllocated`/`seatsUsed` props via `useEffect` (plus a `handlePlanThing` handler that resyncs on click); the rendered value can lag the props for a frame after they change.
Principle/pattern: Principle #7 impossible-states-unrepresentable / derive-don't-sync (Chapter 025).
Action: delete the state, the effect, and the resync handler; render `seatsAllocated - seatsUsed` inline.
```

```
**blocking:** `src/app/(app)/plan/actions.ts` L33 — the `planLabel` write records nothing to the audit log; the compliance trail is silent on a security-relevant mutation.
Principle/pattern: canonical audit-log event catalog (lesson 5 of chapter 057 / lesson 3 of chapter 081).
Action: add `logAudit({ orgId: ctx.orgId, actorUserId: ctx.userId }, { action: 'organization.plan-label-changed', subjectType: 'organization', subjectId: ctx.orgId, payload: { previousLabel, nextLabel } })` alongside the write (this falls out naturally once the action is wrapped in `authedAction` per finding 1).
```

Bonus comments (extra credit, not required):

```
**suggestion:** `src/lib/plan/get-plan-entitlement.ts` L8 — the exported entitlement read has no TSDoc; it's a cross-module read surface other features will call.
Principle/pattern: cross-module documentation (lesson 1 of chapter 102).
Action: add a one-paragraph TSDoc with summary, `@param orgId`, `@returns`, and a note that callers must `updateTag(orgPlanEntitlementTag(orgId))` after mutating plan state.

**nit:** `src/app/(app)/plan/seat-usage.tsx` L23 — `handlePlanThing` doesn't name its intent.
Principle/pattern: Principle #4 name-for-intent.
Action: rename or, better, delete it with the derived-state fix above.

**praise:** `src/lib/plan/` + `src/app/(app)/plan/` — schema, action, read function, and component are co-located by feature.
Principle/pattern: Principle #1 co-locate-by-feature.
Action: none — naming the choice so the author knows the pattern landed.
```

Decision rationale: finding 4's action deletes the state rather than reaching for `useMemo` because the state itself is the bug — the value is derivable, so storing it at all is what makes the impossible state representable. Finding 5's `logAudit` is written alongside the same store mutation (in the DB framing, inside the same transaction) so a rollback also unwinds the audit row; logging after the redirect would leave an orphan event if the write later fails. The bonus findings are kept as `suggestion:`/`nit:`/`praise:` rather than promoted to blockers because they're the right shape with a subjective choice, and inflating them to blocking would blunt the blocking-vs.-suggesting cut the reference scores.

</details>

### Moment of truth

There is no automated checker — verify by hand. The review file should contain five comment blocks, each pinned to a file and line and each carrying all four parts, plus a `## Summary` with severity totals and a `Verdict:` line.

Hand-check what takes judgment, ticking each off:

- [ ] All five findings are labeled `blocking:` — any `suggestion:` mis-label loses the severity-credit half on that finding.
- [ ] Finding 3's action proposes the Temporal seam (calendar day math), not just "be careful with dates."
- [ ] Finding 4's action deletes the state and the effect, not "memo it."
- [ ] Finding 5's `logAudit` call names the `organization.plan-label-changed` action with the payload shape and sits alongside the write.
- [ ] The summary's scope note records that the 400-LOC threshold did not fire (the `/plan` surface is small), and the verdict reads "request changes."
- [ ] Every comment is in the address-the-code-not-the-author voice.

---

## Lesson 4 — ADR 0007

Goal: fill the shipped `0007-cache-entitlement-reads-with-cacheTag.md` scaffold — the one decision in the surface that earns an ADR — with a crisp Decision line and an honest Consequences list, then self-grade both deliverables against the reference.
Finished result: the ADR scaffold filled with all four Nygard sections, the 0007 row appended to the `docs/adr/README.md` index, and a side-by-side self-grade against the `solution/` reference.

### Your mission

Not every change earns an ADR, so you start by running the three-test inclusion check from lesson 4 of chapter 101 across the surface's candidate decisions and reject the ones that don't qualify: adding the `planLabel` field has no real architectural alternative and reverses in one PR, and co-locating the `src/lib/plan/` module is convention application, not a new decision — only caching the entitlement read survives all three tests, because it shapes every future plan-touching surface, has a reasonable alternative (per-request reads, or `revalidatePath`), and would cost a sweep of `updateTag` call sites to reverse. You fill the shipped `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` scaffold — its H1 title and four empty `##` sections are already in place; you write into them, replacing the `<!-- TODO(L4) -->` marker — and three sections carry the weight. The Decision is one declarative sentence with no hedging — "we will cache..." not "we're considering" or "we should" — because the hedge belongs in Context (as "we considered no-cache and rejected it") or Consequences (as "reversal cost is one PR"), never in the Decision line, and this is the most common failure point as students get nervous about committing in writing. The Context names the read pattern and its scale and names the rejected alternative with a reason, because an ADR that pretends there was no choice records nothing. The Consequences is the honesty test: it lists every mutation seam that must now own an `updateTag` call rather than waving at "every mutation must invalidate," names the `updateTag`-vs-`revalidateTag` cut with its lesson reference for the background-job path, and states the reversal cost honestly — three bullets that are all upsides is a sales pitch, and the future maintainer needs the trade-off to decide whether the decision still holds. The filename slug is part of the contract: a noun phrase of the decision, not a verb phrase describing the change — and it already ships correct on the scaffold, so the discipline here is recognizing why it reads that way. Appending the 0007 row to the shipped `docs/adr/README.md` index (which already lists 0001–0006) in the same edit is in scope by convention; choosing a different cache key strategy or re-litigating the caching decision is out of scope — you are recording the decision the code already made, not making a new one.

- The three-test inclusion check is applied to each candidate decision, and only the caching decision is selected, with the other two rejected for a stated reason.
- The ADR file (`0007-cache-entitlement-reads-with-cacheTag.md` — a noun phrase of the decision, numbered 0007, shipped pre-named) has its four empty sections filled.
- The Status reads "Accepted" with a date.
- The Context names the entitlement read's access pattern and names the rejected alternative (per-request reads, or `revalidatePath`) with the reason it was rejected.
- The Decision is a single declarative sentence naming the `cacheTag` read and the `updateTag` invalidation commitment, with no hedging language.
- The Consequences enumerate every mutation seam that must call `updateTag`, name the `revalidateTag('...', 'max')` background-job path with its lesson reference, and state the reversal cost honestly.
- The shipped `docs/adr/README.md` index (already seeded with 0001–0006) carries an appended one-line entry for 0007.
- The review file and ADR are self-graded side-by-side against the `solution/` reference.

### Coding time

Fill the ADR scaffold's four sections and append the index row to `docs/adr/README.md` against the brief, then open the reference. Read the reference ADR after your attempt.

<details>

Reference ADR body:

```
# ADR 0007 — Cache entitlement reads with cacheTag

## Status
Accepted — 2026-MM-DD.

## Context
The plan-entitlement read backs every plan-aware surface — the `/plan` overview, the seat counter, and any feature gate that checks the current plan. Reading it per request means the data layer answers the same near-static question on every render; a typical org changes its entitlement rarely (an upgrade, a downgrade, a label edit) while reading it constantly. The same pattern is already established for the invoices reads in `src/lib/invoices/queries.ts` (`'use cache'` + `cacheTag` + `updateTag` from the mutation seams). The alternative considered was per-request reads with no cache; rejected because the read cost scales with active sessions while the entitlement is near-static. `revalidatePath` was also viable but ties invalidation to routes rather than the data, which the mutation seams don't all share.

## Decision
We will cache `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` and `cacheLife('minutes')`, and invalidate via `updateTag(orgPlanEntitlementTag(orgId))` from every mutation seam that touches plan or entitlement state.

## Consequences
- Every plan-or-entitlement mutation now owns an `updateTag(orgPlanEntitlementTag(orgId))` call adjacent to its write — today that is `src/app/(app)/plan/actions.ts:updatePlanLabel` (currently the only such seam, and it already fires `updateTag`); any future seat-change or billing-webhook write that touches the entitlement must add the same call.
- Background or batch updates that touch the entitlement outside a user-facing request use `revalidateTag(orgPlanEntitlementTag(orgId), 'max')` instead of `updateTag` — the same `updateTag`-vs-`revalidateTag` cut the summary-recompute job (`src/server/jobs/summary-recompute.ts`) already follows for the summary tag (from Unit 14, chapter 074).
- Reads that didn't trigger a mutation see a staleness window bounded by the `'minutes'` profile — acceptable because entitlements change rarely, and the `/plan` page inherits the fresh `updateTag` path right after a mutation.
- Failure mode: a future mutation that forgets `updateTag` leaves the entitlement stale until the `'minutes'` window lapses, and any plan gate reads the old plan. Mitigation: the TSDoc on `getPlanEntitlement` lists the invalidation contract so audits can grep mutation seams against it.
- Reversal cost: one PR to delete the `'use cache'` annotation and the `updateTag` calls; cheap now while there is a single seam, more expensive once downstream features depend on the cache shape.
```

ADR index entry in `docs/adr/README.md`: `0007 — Cache entitlement reads with cacheTag — Accepted — 2026-MM-DD`.

Self-grade: open the reference deliverables under `solution/reviews/chapter 104.md` and `solution/docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` and compare side-by-side (the `solution/` tree is the answer key — read it only after writing your own).

Decision rationale: the `'minutes'` profile is the trade-off the ADR records, not an arbitrary number — naming the window and why is what distinguishes the recorded decision from a `revalidate: 3600` magic number. Listing the mutation seams converts a vague "remember to invalidate" into a list a future maintainer can grep; today the list is short (one seam), but the ADR's job is to name the contract so the next seam inherits it. The filename slug is a noun phrase (`cache-entitlement-reads-with-cacheTag`) rather than a verb phrase (`add-use-cache-to-getplanentitlement`) because it names the decision, not the change. For the `updateTag`/`revalidateTag` cut and the `cacheLife` profiles, link to Unit 14 (chapter 074) rather than re-explaining.

</details>

### Moment of truth

There is no automated checker — verify by hand. The ADR file `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` (shipped pre-named with a noun-phrase slug) should now have all four sections filled (Status / Context / Decision / Consequences) with the `<!-- TODO(L4) -->` marker removed, and the Decision section should contain no hedging tokens ("we should", "we're considering", "maybe").

Then open the `solution/` reference and hand-grade side-by-side, ticking each off:

- [ ] Only the caching decision was selected by the three-test check; the field add and the co-location were rejected with a reason.
- [ ] Status is "Accepted" with a date; the Context names the alternative and rejects it with a reason.
- [ ] The Decision is one declarative sentence with no hedging.
- [ ] The Consequences list the mutation seam(s) explicitly, name the `revalidateTag` background path with its lesson reference, and state the reversal cost.
- [ ] The five review comments score against the reference on coverage and severity match — five `blocking:` is the expectation, and a 3/5 review that goes deep on `cacheTag` while silencing the `Date` math is a fail.
- [ ] Misses and wrong severities are read back into a personal review checklist for the next PR — the self-grade is the rehearsal, since a real PR review has no rubric.

When ADR 0007 is later superseded (the cache moves to Redis, or the entitlement model changes), the supersession discipline from lesson 4 of chapter 101 lands: the new ADR references this one, this one's Status updates to "superseded by ADR XXXX", and the file is never deleted. The review-and-ADR cadence rehearsed here is the daily senior craft — the same pass runs on every PR the student reviews in Unit 22 and beyond.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
