# Chapter 108 — Project: Review a PR, write the ADR

## Chapter framing

Chapter 108 closes Unit 22 by running the two disciplines the unit installed — the principle-and-pattern map for code review from chapter 107 and the Nygard ADR template from lesson 4 of chapter 105 — against a seeded pull request. The deliverable is two artifacts the student commits: a `reviews/chapter 108.md` file holding five line-anchored review comments in the four-part Conventional-Comments shape, and a `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` ADR file with the three Nygard sections filled. The chapter ships 1 brief + 1 walkthrough + 1 review-it + 1 write-the-ADR + 1 verify; the "runnable state" rule lands as "the audit target still runs unchanged at the end of every lesson, and the `reviews/` and `docs/adr/` directories grow."

Threads that run through every lesson. The review is a **read-only pass on the seeded PR diff** — students do not push fixes to the branch, they leave the comments and write the ADR; the proposed fix lives in the comment body, not in a commit. The **four-part comment anatomy from lesson 2 of chapter 107 is the contract** — every comment names a severity label (`blocking:` / `suggestion:` / `question:` / `nit:` / `praise:`), the observation, the principle or pattern it violates with the lesson ID, and the action; comments without all four parts don't score. The **review stack from lesson 1 of chapter 107 orders the pass** — correctness/security first, then principles (#1–#7), then patterns (#1–#15), then tests/contracts, then style; the student records their pass order at the top of `reviews/chapter 108.md`. The **blocking-vs.-suggesting cut is the load-bearing distinction** — the five seeded findings are deliberately a mix; the student labels each correctly. The **ADR earns its weight under the three-test inclusion rule** — the one design decision in the diff (caching the entitlement read with `cacheTag` vs. reading per request) is architectural, has a reasonable alternative, and would cost more than one PR to reverse; the student names the rule when they write the ADR. **Self-grading is the senior reach** — the rubric publishes after the student commits, partial credit for correct severity + principle/pattern named even when the action differs.

### Dependency carry-in

The review invokes every principle and pattern the course established plus the two disciplines from Unit 22.

- **From lesson 4 of chapter 105:** the Nygard template (Title / Status / Context / Decision / Consequences); one decision per file; write the ADR as the decision is being made; the numbering and supersession discipline; the three-test inclusion check (affects multiple files, reasonable alternatives exist, reversing costs more than one PR).
- **From lesson 3 of chapter 106:** the docs-ship-with-the-PR rule and the five-artifact reviewer checklist; "docs that paraphrase code drift, docs that link don't."
- **From lesson 1 of chapter 107:** the five-layer review stack; the principle-and-pattern map with diff signatures and lesson IDs; the PR-size threshold; the CI-first frame; the senior restraint on style.
- **From lesson 2 of chapter 107:** the four-part comment anatomy; the five severity labels; the Conventional Comments standard the labels are a subset of; the blocking-vs.-suggesting cut; the language of disagreement; the "address the code, not the author" reflex.
- **From prior units (the principles and patterns each seeded finding maps to):**
  - `authedAction(role, schema, fn)` and the SaaS pattern #2 wrapper — lesson 2 of chapter 061 / lesson 3 of chapter 061.
  - Architectural Principle #6 (explicit over magic) at the side-effect import — chapter 033 / chapter 046.
  - Temporal over `Date` arithmetic for time math — Chapter 087.
  - The "derive, don't sync" rule against `useEffect`-driven derived state — Chapter 029.
  - `logAudit(tx, event)` and the audit-log canonical event set — lesson 5 of chapter 061 / lesson 3 of chapter 085.
  - `cacheTag` + `updateTag` / `revalidateTag` decision tree — Chapter 036 / Unit 15a project.

### Starter file tree (stubs marked)

The starter ships from `react-saas-course-projects/pr-review-and-adr/starter/`, cloned via `degit`. The repo is a fork of the course's running project at the end of Unit 16, plus a `feature/customer-plan-overview` branch holding the seeded PR.

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
    chapter 108.md                              # STUB: the five comments + summary
    template.md                          # the four-part comment template
  src/                                   # the running app, untouched
  # branch feature/customer-plan-overview holds the seeded diff
```

The student creates `0007-...md` and edits `reviews/chapter 108.md`. Nothing else changes.

### Seeded PR — the audit target

Branch: `feature/customer-plan-overview` against `main`. Roughly 220 lines of meaningful change across nine files. The PR description claims: "Adds a per-org plan overview surface showing current entitlement, seats used, and renewal countdown; caches the entitlement read with `cacheTag` so the surface doesn't hammer Postgres."

The diff contains five line-level review-worthy issues plus one design decision worth an ADR. Each is positioned so the student can find it by walking the review stack top-down.

1. **Missing `authedAction` wrapper (SaaS pattern #2, Principle #3).** `app/(app)/plan/actions.ts` exports `updatePlanLabel` as `'use server'` with a hand-rolled `auth()` call and `if (!session) throw`; no role check, no `tenantDb`, no `safeLimit`. Severity: `blocking:`. The principle/pattern violated: SaaS pattern #2 (the wrapper exists; bypass is a hole) and Principle #3 (manual seam instead of the named one). Action: wrap in `authedAction('admin', updatePlanLabelSchema, fn)`.
2. **Side-effect import into a server component (Principle #6).** `app/(app)/plan/page.tsx` imports `'@/lib/analytics/page-view-tracker'` at module top; the tracker module's top-level body fires a network call. The import runs at render time on the server. Severity: `blocking:`. Principle violated: #6 (explicit over magic); the side effect should be a named call site, not a smuggled import. Action: move to an explicit `trackPlanPageView()` call inside an event handler in a Client Component, or remove if PostHog auto-capture covers it.
3. **`Date` arithmetic on the renewal countdown (SaaS pattern #13).** `lib/plan/renewal-countdown.ts` does `new Date(subscription.renewsAt).getTime() - Date.now()` then divides by `1000 * 60 * 60 * 24`. The path breaks at DST boundaries and ignores the user's profile timezone. Severity: `blocking:`. Pattern violated: #13 (time/dates/timezones — the Temporal primitive is mandatory for user-visible time math). Action: switch to `Temporal.PlainDate.from(...).until(today, { largestUnit: 'days' })`.
4. **Derived state synced with an effect (Principle #7, derive-don't-sync from chapter 029).** `app/(app)/plan/seat-usage.tsx` keeps `seatsRemaining` in `useState` and updates it from `seatsAllocated` and `seatsUsed` via `useEffect`. The two pieces of state can disagree mid-render. Severity: `blocking:`. Principle violated: #7 (impossible-states-unrepresentable) and the derive-don't-sync rule from Chapter 029. Action: compute `seatsRemaining` inline as `seatsAllocated - seatsUsed`; delete the state and the effect.
5. **Missing audit-log write on plan label change (SaaS pattern's audit-log catalog, lesson 5 of chapter 061 / lesson 3 of chapter 085).** The `updatePlanLabel` action updates `organizations.planLabel` inside a transaction but doesn't call `logAudit(tx, event)`. The change is silent to the compliance trail. Severity: `blocking:`. Pattern violated: the canonical audit-log event set (`organization.plan-label-changed` is in the catalog). Action: add the `logAudit(tx, { action: 'org.plan.label_updated', ... })` call inside the transaction.

**The one design decision worth an ADR.** The PR introduces a `'use cache'` annotation on `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` (new helper in `src/lib/cache/tags.ts`) and a `cacheLife('minutes')` (the existing profile from 15a). The alternative is reading from Postgres per request. The decision affects every future plan-touching surface (notifications, billing webhook, the seat counter, the Stripe portal entry) and would cost a sweep of `updateTag` call sites to reverse. The PR description hand-waves "caches the entitlement read with `cacheTag` so the surface doesn't hammer Postgres" — that's a one-liner, not a recorded decision. The student writes ADR 0007 capturing the *Context* (the read pattern, the surfaces that need invalidation, the cache-vs-fresh trade-off), the *Decision* ("we will cache `getPlanEntitlement(orgId)` with `cacheTag('org:{orgId}:plan-entitlement')` and invalidate via `updateTag` at every mutation seam"), and the *Consequences* (every mutation seam now owns an `updateTag` call — list them; staleness window of up to 60 seconds for non-mutation reads; the `revalidateTag` background path for batch jobs; the failure mode if a mutation forgets the `updateTag`).

**Bonus findings the rubric acknowledges as the senior reach.** The diff also ships a missing TSDoc on the exported `getPlanEntitlement` (cross-module Server-Action-shape — lesson 1 of chapter 106), a `nit:` opportunity on a name (`handlePlanThing` should name intent — Principle #4), and a `praise:` opportunity (the file structure that co-locates the schema, the action, and the component under `src/lib/plan/` per Principle #1). The rubric names "5 is the floor, 7–8 is the senior reach" but does not require the bonus.

### Reference-solution signatures the lessons display

The lessons display these signatures verbatim so students don't invent variants.

- The four-part comment template (the literal scaffold in `reviews/template.md`):
  ```
  **[severity]:** `path/to/file.ts` L[line] — one-line observation.
  Principle/pattern: #N from Chapter X.Y.Z.
  Action: one sentence proposing the fix or asking the question.
  ```
- The reviews file shape (`reviews/chapter 108.md`):
  - Header with "Pass order: correctness/security → principles → patterns → tests/contracts → style" and a one-line note on where the student started.
  - Five numbered comment blocks in the template above.
  - A `## Summary` section at the bottom: one-line per finding with severity totals (e.g., `5 blocking`, `0 suggestion`, `0 question`, `0 nit`, `0 praise`) and a one-line note on PR-size (the diff is ~220 LOC, under the 400 threshold from lesson 1 of chapter 107 — no "split this" structural comment needed).
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

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Five line-level comments on the seeded issues | `reviews/chapter 108.md` contains five comment blocks, each pinned to a file and line in the diff; rubric overlap is the score. |
| Each comment cites the principle or pattern violated and the fix | Template adherence: every block has severity, observation, principle/pattern ID with lesson reference, action. |
| Each comment distinguishes suggesting from blocking | The severity totals in `## Summary` show the mix; the rubric scores correct severity per finding (all five are `blocking:` here; mis-labeling as `suggestion:` is a partial-credit miss). |
| One ADR file in `/docs/adr/` with the three Nygard sections filled | `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` exists, has Status / Context / Decision / Consequences populated, named after the decision (not "ADR-0007"). |
| Named after the decision, not "ADR-0005" | Filename rubric check; the slug after the number is a noun phrase of the decision. |
| The ADR has a real `Decision` line, not a hedged one | The `## Decision` section is one declarative sentence — no "we are considering", "we should", "maybe". |
| Self-graded against the rubric | After commit, the student checks out `v1.0-answer-key` from the project repo and side-by-side compares `reviews/` and `docs/adr/0007-*.md` against `solution/`. |

### Concepts demonstrated → owning lesson

- The Nygard ADR template, one-decision-per-file rule, supersession discipline — lesson 4 of chapter 105.
- The three-test inclusion check for what earns an ADR — lesson 4 of chapter 105.
- The docs-ship-with-the-PR rule and the five-artifact reviewer checklist — lesson 3 of chapter 106.
- The five-layer review stack — lesson 1 of chapter 107.
- The principle-and-pattern map (#1–#7 and #1–#15) with diff signatures — lesson 1 of chapter 107, with each principle/pattern owned by its origin lesson.
- The four-part comment anatomy — lesson 2 of chapter 107.
- The five severity labels (`blocking:` / `suggestion:` / `question:` / `nit:` / `praise:`) as a Conventional Comments subset — lesson 2 of chapter 107.
- The blocking-vs.-suggesting cut and the language of disagreement — lesson 2 of chapter 107.
- The receiving-review posture and the "approve with comments" vs. "request changes" calculus — lesson 2 of chapter 107.
- `authedAction(role, schema, fn)` — lesson 2 of chapter 061.
- Principle #6 explicit-over-magic at the side-effect import — chapter 033, chapter 046.
- Temporal over `Date` for user-visible time math — Chapter 087.
- Derive-don't-sync, the `useEffect` derived-state anti-pattern — Chapter 029.
- `logAudit(tx, event)` and the canonical audit-log event set — lesson 5 of chapter 061, lesson 3 of chapter 085.
- `cacheTag` + `updateTag` invalidation seams — Chapter 036, Unit 15a project.
- The "address the code, not the author" reflex — lesson 2 of chapter 107.

---

## Lesson 1 — The brief, the cheatsheet, the pass order

Sets up the seeded PR and its two deliverables, walks the four-part comment template and the Nygard ADR scaffold, and locks in the review stack pass order before the diff opens.

Goals:

- Frame what's being built: a review pass on a seeded PR plus one ADR. The deliverable is two committed artifacts (`reviews/chapter 108.md` with five line-level comments, `docs/adr/0007-...md` with the three Nygard sections); no fixes are pushed to the feature branch.
- State the "Done when" verifications in one paragraph (five line-level comments mapped to the seeded findings, each with severity + principle/pattern + action; one ADR named after the decision with a real `Decision` line; the report is self-graded against the rubric once committed).
- Walk the chapter's two reference scaffolds: the `reviews/template.md` four-part shape (severity, observation, principle/pattern with lesson ID, action) and the `docs/adr/0007-...md` Nygard scaffold (Status, Context, Decision, Consequences). The student copies the comment template five times.
- Walk the senior pass order from lesson 1 of chapter 107 — correctness/security → principles → patterns → tests/contracts → style — and name it the load-bearing decision *before* the diff opens. The pass-order header in `reviews/chapter 108.md` is the first thing the student writes.
- Show the principle-and-pattern cheatsheet (the same map from lesson 1 of chapter 107, condensed to one page) and tell the student to keep it open during the review. Every comment cites a row of the cheatsheet by ID.
- Name the scope cuts: not a full architectural review (the diff's scope is "the plan overview surface", not "rethink billing"); not a style review (the formatter and Biome catch what they catch — the diff is already through CI); not a security audit (Unit chapter 086 was the seeded security audit, this pass is principle-and-pattern focused); not a re-implementation (no fixes pushed, no rebase against the diff); not a test-coverage pass (covered in lesson 1 of chapter 107 as part of the review stack but not the deliverable here).
- Set the senior payoff: the review-and-ADR cadence is the daily senior craft. Every senior runs this pass on every PR they review, and writes the ADR every time an architectural decision lands in a diff. The artifact shape — five-comment review file, one-decision ADR — is portable to every later team and every later codebase.
- Name the rubric contract: the rubric tag (`v1.0-answer-key`) is published from day one but the student is on the honor system not to check it out until the commits land. The senior call: a real review has no answer key, and the student who runs the pass under "no peeking" trains the reflex.
- Show one screenshot of a filled comment block in the template and one of the seeded PR's "Files changed" view so the student knows what the surface looks like before they open the diff.
- Link the starter via `degit`; name the rubric tag.

Senior calls and watch-outs:

- The review reads top-down on the *review stack*, not top-down on the diff. Starting at line 1 of the first file is the failure mode lesson 1 of chapter 107 warned against; the lesson re-states the rule because the project rewards the practice.
- The five-finding floor is the contract; the bonus findings (TSDoc, naming, praise) are the senior reach and earn the rubric's extra credit. Coverage on the five matters more than depth on any one.
- The pass-order header in `reviews/chapter 108.md` is not decoration — it forces the student to commit, in writing, to the senior reflex before they touch the diff. Skipping the header is the first signal a review will drift into style commentary.
- The PR description claims a contract ("adds the plan overview, caches the entitlement read"). The review's job is to verify the claim against the diff. A PR whose description and diff disagree is a contract gap; in this seeded PR the description and diff *broadly* agree, so the review doesn't need to escalate to "what does this PR change," but the lesson names the check.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: the starter cloned, `pnpm install` clean, the app runs locally (`pnpm dev` on `:3000`) on `main`, `git fetch && git checkout feature/customer-plan-overview` works and the branch is visible in the GitHub-style diff view (or via `git diff main..feature/customer-plan-overview` from the CLI), `reviews/chapter 108.md` opened with the pass-order header written, `reviews/template.md` read once, the principle-and-pattern cheatsheet open in a second tab. No comments written, no ADR drafted.

Estimated student time: 15 to 20 minutes.

---

## Lesson 2 — Walk the diff, model one comment

Tours the nine changed files against the canonical helpers they bypass, then writes the first finding (the missing `authedAction` wrapper) end-to-end in the four-part template as the review's rhythm-setter.

Goals:

- Walk the seeded PR's "Files changed" surface in order, naming the nine files and the area each one touches: the `app/(app)/plan/page.tsx` and `seat-usage.tsx` (the new surface), `app/(app)/plan/actions.ts` (the mutation), `lib/plan/get-plan-entitlement.ts` (the cached read — the ADR target), `lib/plan/renewal-countdown.ts` (the time math), `lib/analytics/page-view-tracker.ts` (the smuggled side-effect import), `lib/plan/schemas.ts` (the Zod), `lib/db/schema.ts` (the `planLabel` column add), and the migration file. The student is taught to read the file list as a map of where the principle and pattern bypasses will land, not as a checklist to walk linearly.
- Read the existing canonical helpers the PR is reviewed against: `lib/authed-action.ts` (the SaaS pattern #2 wrapper from lesson 2 of chapter 061), `lib/audit-log.ts` (lesson 5 of chapter 061), `lib/tenant-db.ts` (SaaS pattern #1), `lib/temporal.ts` (the time primitive from Chapter 087), and the existing `'use cache'` patterns in `lib/billing/*` (Chapter 036). These are the seams every comment refers back to — the senior reflex is "what was the established surface, and where does the diff bypass it?"
- Read the PR description and verify the claim against the diff at a glance. The description says "adds the plan overview, caches the entitlement read with `cacheTag`." The diff broadly delivers both; the review is not escalating to "what does this PR claim," it's running the principle/pattern pass.
- Model one comment end-to-end: walk finding 1 (the missing `authedAction` wrapper in `app/(app)/plan/actions.ts`). Open the file, point at the `'use server'` directive followed by a hand-rolled `const session = await auth()`. Quote the failure mode: the action accepts any signed-in user including non-admins, the `tenantDb` filter is missing on the update, and there's no rate limit on a write-side mutation. Name the principle/pattern with the lesson ID: SaaS pattern #2 (lesson 2 of chapter 061 — the wrapper exists; bypassing it punches a hole in the role check, the tenant scope, and the rate limit at once) plus Principle #3 (chapter 033, chapter 046 — the side effect should be at a named seam, not in an ad-hoc action body). Set the severity: `blocking:` — this is a correctness and security failure, not a style preference. Write the comment into `reviews/chapter 108.md` in the four-part template shape:
  ```
  **blocking:** `app/(app)/plan/actions.ts` L4-12 — `updatePlanLabel` hand-rolls `auth()` and skips the role + tenant + rate-limit guarantees.
  Principle/pattern: SaaS pattern #2 (lesson 2 of chapter 061 — `authedAction(role, schema, fn)`).
  Action: replace the manual auth and Zod parse with `authedAction('admin', updatePlanLabelSchema, async (input, ctx) => { ... })`.
  ```
- The modeled-comment sub-section is the chapter's reference shape; the student re-reads it whenever a later comment feels stuck.
- Name the review cadence: read the file, find the bypass, name the principle/pattern, set the severity, write the comment in the template, move on. Switching files mid-comment fragments the review.
- The first finding is the *gift* — the student writes one comment in the template before tackling the rest. The lesson is the rhythm-setting move.

Senior calls and watch-outs:

- The diff ships with all the canonical helpers available (`authedAction`, `tenantDb`, `logAudit`, the Temporal helpers). Bypasses live in the call sites that *don't reach for* the helpers, not in the helpers themselves. Reading the helpers first calibrates the eye for the bypass — same reflex as lesson 2 of chapter 086.
- The "side-effect smuggled in an import" finding (finding 2) is the kind the student will find by *reading the imports*, not by reading the function body. The senior reflex on a `lib/analytics/` import at the top of a server component is "what does the module's top-level body do?" — open the file, check.
- Severity `blocking:` on all five findings is *not* a coincidence — the seeded set is deliberately five blockers because the lesson teaches the cut by example. A student who writes `suggestion:` on any of them is mis-labeling, and the rubric penalizes the mis-label even when the finding is correctly located.
- The comment template's "Principle/pattern" line carries the load — naming the rule with a lesson ID is what makes the comment portable to the author. A comment that says "this is wrong" without naming the rule is the failure mode lesson 2 of chapter 107 calls out.

Codebase state at entry: starter cloned, branch checked out, empty placeholders for the comments.
Codebase state at exit: target unchanged; `reviews/chapter 108.md` contains the pass-order header plus comment 1 (the modeled finding) filled in the four-part template; the student has walked the nine files, read the canonical helpers, and held the principle-and-pattern map open. Four comment slots remain empty (findings 2–5). The ADR file has not been started.

Estimated student time: 30 to 40 minutes.

---

## Lesson 3 — Four more findings, all blocking

Surfaces the side-effect import, the `Date` arithmetic, the derived-state effect, and the missing audit-log write as four `blocking:` comments, fills the `## Summary` totals, and names the senior-reach bonus findings the rubric awards extra credit for.

Goals:

- Walk the four remaining findings and surface a comment per finding, in the same template shape as the modeled one in lesson 2 of chapter 108. The lesson is *file-by-file in review-stack order*, not top-down on the diff. The student writes four comment blocks by the end.
- **Finding 2 — side-effect import into a server component (Principle #6).** Open `app/(app)/plan/page.tsx`, point at the top-level `import '@/lib/analytics/page-view-tracker'` (note the bare import — no identifier used). Open `lib/analytics/page-view-tracker.ts` and confirm the top-level body fires a `fetch` to PostHog. The failure mode: every render of the server component triggers a network call on the server, the call is invisible at the call site, and the import line looks innocuous. Principle violated: #6 (explicit over magic, Chapter 033 — the side effect should be a named call). Severity: `blocking:`. Action: move the tracker to an event handler in a Client Component, or remove if PostHog auto-capture covers the page view. Write the comment.
- **Finding 3 — `Date` arithmetic on the renewal countdown (SaaS pattern #13).** Open `lib/plan/renewal-countdown.ts`, point at the `new Date(...).getTime() - Date.now()` expression and the `/ (1000 * 60 * 60 * 24)` division. Quote the failure mode: a renewal that crosses a DST boundary returns the wrong day count, and the rendering ignores the user's profile timezone (Chapter 087 / chapter 089). Pattern violated: #13 (time/dates/timezones — Temporal is the mandatory primitive for user-visible time math). Severity: `blocking:`. Action: switch to `Temporal.PlainDate.from(...).until(today, { largestUnit: 'days' })` and read the timezone from the user profile. Write the comment.
- **Finding 4 — derived state synced with an effect (Principle #7).** Open `app/(app)/plan/seat-usage.tsx`, point at the `useState<number>(seatsAllocated - seatsUsed)` initialization paired with a `useEffect` that resets `seatsRemaining` whenever `seatsAllocated` or `seatsUsed` change. The failure mode: between the props change and the effect's commit, the rendered DOM shows the stale remaining count for one frame; the two pieces of state can disagree. Principle violated: #7 (impossible-states-unrepresentable) and the derive-don't-sync rule from Chapter 029 — derived values should be computed inline, not synced. Severity: `blocking:`. Action: delete the state and the effect; compute `seatsRemaining = seatsAllocated - seatsUsed` inline. Write the comment.
- **Finding 5 — missing audit-log write on plan label change.** Re-open `app/(app)/plan/actions.ts`, point at the `db.transaction(async (tx) => { await tx.update(organizations).set({ planLabel }).where(...) })` block. Quote the failure mode: the compliance trail is silent on a security-relevant mutation (`org.plan.label_updated` is in the canonical event set from lesson 3 of chapter 085); the operator side of the audit history loses the event; a future GDPR or SOC2 audit can't reconstruct who changed the label and when. Pattern violated: the canonical audit-log event catalog (lesson 5 of chapter 061, lesson 3 of chapter 085). Severity: `blocking:`. Action: add `await logAudit(tx, { action: 'organization.plan-label-changed', subjectType: 'organization', subjectId: ctx.orgId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { previousLabel, nextLabel } })` inside the transaction. Write the comment.
- Re-read the full `reviews/chapter 108.md` once at the end. Check that every comment block has all four parts (severity, observation, principle/pattern with lesson ID, action). Fill the `## Summary` section: severity totals (`5 blocking, 0 suggestion, 0 question, 0 nit, 0 praise`), the PR-size note (the diff is ~220 LOC, under the 400 threshold from lesson 1 of chapter 107), and the one-line pass-order recap.
- Cover the *senior reach* findings the rubric awards extra credit for. The student is encouraged but not required to surface them:
  - The exported `getPlanEntitlement` in `lib/plan/get-plan-entitlement.ts` is a public-surface Server-Action-shape and has no TSDoc (lesson 1 of chapter 106). Severity: `suggestion:`. Action: add a one-paragraph TSDoc with summary, `@param`, `@returns`, and a `@throws` for the unauthorized case.
  - The handler in `seat-usage.tsx` is named `handlePlanThing`. Principle #4 (name for intent). Severity: `nit:`. Action: rename to something like `onSeatLimitWarningClick`.
  - The file structure under `src/lib/plan/` co-locates the schema, the action, the read function, and the component — Principle #1 (co-locate by feature). Severity: `praise:`. Action: name the choice in the comment so the author knows the pattern landed correctly.
- Re-state the blocking-vs.-suggesting cut one more time. All five seeded findings are `blocking:` because they violate established principles or patterns with security, correctness, or contract consequences. The senior-reach `suggestion:` (TSDoc) and `nit:` (naming) are subjective in detail but objective in category — the right shape, the wrong choice. The `praise:` is specific and earned. The lesson surfaces the cut by example because the rubric scores it.

Senior calls and watch-outs:

- Finding 2 (side-effect import) is the kind a junior misses because the import line looks like a normal import. The senior reflex is "open the imported module, read its top-level body" — if there's executable code at module scope that touches the world, the import IS the call.
- Finding 3 (`Date` math) is the kind that ships and lurks until the first DST crossover or the first international customer. The senior reflex is "any time math the user sees crosses Temporal, no exceptions" — the principle is sharper than "be careful with dates."
- Finding 4 (derived state) is the most common React anti-pattern. The chapter 029 rule is "if A is derivable from B and C, never `useState(A)`" — compute, don't sync. A student who writes the comment as "use `useMemo`" is partially right but missing the senior cut: the state itself is wrong, not the missing memo.
- Finding 5 (missing audit log) is the kind that hides because nothing visibly breaks. The discipline that catches it is the canonical event set from lesson 3 of chapter 085 — read every security-relevant mutation against the catalog. Pattern matching on "this mutation touches a security-relevant field, does it write an audit-log entry?" is the senior reflex.
- The comment voice across all five is *address the code, not the author* (lesson 2 of chapter 107). "`updatePlanLabel` hand-rolls `auth()`" beats "You hand-rolled `auth()`." The receiving-author reads the comment without defensiveness.
- The `suggestion:` and `nit:` slots are deliberately *not* required because the chapter teaches restraint: a review with twelve `nit:` comments drowns the signal. The senior reach is the right *severity mix*, not the most comments.

Codebase state at entry: target unchanged; comment 1 in `reviews/chapter 108.md`; comments 2–5 empty; ADR file not started.
Codebase state at exit: target unchanged; all five comments written in `reviews/chapter 108.md`; `## Summary` filled with severity totals, PR-size note, and pass-order recap; optionally one to three bonus comments written by students reaching for the senior payoff. The ADR file has not been started.

Estimated student time: 45 to 60 minutes.

---

## Lesson 4 — ADR 0007 — the cache decision

Runs the three-test inclusion check across the diff's candidate decisions, then writes `0007-cache-entitlement-reads-with-cacheTag.md` with a crisp Decision line, the named alternative, and an honest Consequences list that enumerates every `updateTag` seam.

Goals:

- Identify the one design decision in the diff worth an ADR by running the three-test inclusion check from lesson 4 of chapter 105 against every decision the PR makes. Walk the diff's three candidate decisions and apply the test to each:
  - *Adding the `planLabel` column to the `organizations` table.* Test 1: affects multiple files / future PRs? Slightly — schema changes have a ripple. Test 2: reasonable engineers could pick differently? Not really — there's no architectural alternative to "add a nullable string." Test 3: reversing costs more than one PR? No. Verdict: **not an ADR**.
  - *Caching `getPlanEntitlement(orgId)` with `cacheTag` + a 60s `cacheLife`, and committing to `updateTag` at every mutation seam.* Test 1: yes — every future plan-touching surface (notifications, billing webhook, the seat counter, the Stripe portal entry, the entitlement-gating middleware) inherits the cache contract. Test 2: yes — reading per request is a reasonable alternative for a 2026 SaaS at the course's scale, and `revalidatePath` is also viable. Test 3: yes — reversing means sweeping every `updateTag` call site and rewriting the `'use cache'` annotation; far more than one PR. Verdict: **this is the ADR**.
  - *Co-locating the new `lib/plan/` module.* Test 1: this is convention application, not a new decision. Verdict: not an ADR (it's an `AGENTS.md` convention being followed).
- Open the stub `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` and walk each Nygard section, filling it as the lesson goes. The student writes the ADR live alongside the lesson — the deliverable is a real file, not a worksheet.
- **Title.** "ADR 0007 — Cache entitlement reads with cacheTag." Noun phrase of the decision. Not "ADR 0007" alone, not a question, not "Caching strategy for plans" (too vague). The rubric checks the filename slug matches the decision.
- **Status.** "Accepted — 2026-MM-DD." Most live ADRs are accepted; the supersession discipline lands when the decision is later replaced. Name the date inline since git tracks the file's birthdate but the readable date inside saves a `git log` round trip.
- **Context.** One to two paragraphs. The forces at play: the plan-entitlement read is the hottest read in the app — every page in the authenticated surface checks it for feature gating, and the read fans out into a 3-table join. At ten signed-in users per org per dashboard refresh, the read is doing 30+ joins per minute per org. The two surfaces that need fresh reads are the plan-page itself (immediately after a label change or upgrade) and the entitlement-gating middleware (no stale gates). Background jobs (the daily summary, the seat-utilization report) can tolerate up to a minute of staleness. The alternative considered was per-request reads (no cache); rejected because the join cost scales linearly with active sessions and the entitlement rarely changes (a typical org sees one mutation per quarter). The senior call: name the alternative, name the rejection, don't pretend there was no choice.
- **Decision.** One declarative sentence. *"We will cache `getPlanEntitlement(orgId)` with `cacheTag(orgPlanEntitlementTag(orgId))` and `cacheLife('minutes')`, and invalidate via `updateTag(orgPlanEntitlementTag(orgId))` from every mutation seam that touches plan or entitlement state."* No "we are considering," no "we should." Senior writes the decision crisply.
- **Consequences.** Three to seven bullets, upsides *and* costs:
  - Every plan-or-entitlement mutation (upgrade, downgrade, plan-label change, seat add/remove, the Stripe webhook handlers) now owns an `updateTag` call adjacent to the DB mutation. Name the seams explicitly: `lib/billing/upgrade.ts`, `lib/billing/downgrade.ts`, `app/(app)/plan/actions.ts:updatePlanLabel`, `lib/seats/add.ts`, `lib/seats/remove.ts`, the Stripe webhook handlers in `app/api/webhooks/stripe/`. Each one must call `updateTag('org:{orgId}:plan-entitlement')`.
  - Background jobs that batch-update entitlements (the daily summary recalculator, the quota sweeper) use `revalidateTag(orgPlanEntitlementTag(orgId), 'max')` instead of `updateTag` because they're not in a user-facing request path; the next visit sees the fresh value with no extra cost. (The `updateTag` vs. `revalidateTag` cut comes from Chapter 036 — name the lesson.)
  - Staleness window bounded by the `'minutes'` profile for any read path that didn't trigger a mutation. Acceptable for entitlement gating because entitlements change quarterly; not acceptable for the plan-page itself, which is read immediately after a mutation and inherits the fresh `updateTag` path.
  - The failure mode if a future mutation forgets to call `updateTag`: the cached entitlement stays stale for up to 60 seconds, and the user sees the old plan in the gating middleware. Mitigation: a single-place-to-lint (the `lib/plan/get-plan-entitlement.ts` file's TSDoc lists every mutation seam that must call `updateTag` — name the seam in the TSDoc when you add it; future audits grep the list against the codebase).
  - The cost: every new mutation that touches the cached entitlement is now also touching a cache invalidation. The convention lives in `AGENTS.md`'s "Conventions" section ("plan-entitlement reads are cached; mutations must `updateTag`") and the cached function's TSDoc.
  - Reversal cost (if cache turns out to be the wrong call): one PR to delete the `'use cache'` annotation and the `updateTag` calls; the gating middleware would lose 50ms+ of latency per request at the floor. Cheap to reverse during the first quarter; expensive only if downstream features grow to depend on the cache shape.
- The senior reflex while writing: the Consequences section is the honesty test. Three bullets that are all upsides is a sales pitch. The ADR ships honest *because* the future maintainer reading it needs the trade-off to decide whether the decision still holds — naming the cost is what makes it credible.
- After the ADR is filled, update `docs/adr/README.md` (the index) with a one-line entry: `0007 — Cache entitlement reads with cacheTag — Accepted — 2026-MM-DD`. The index update is part of the same edit by convention.
- Verify the ADR against the three-test inclusion rule one more time. The student reads their own decision back: does it affect multiple files? Yes (the listed mutation seams). Could reasonable engineers pick differently? Yes (no-cache, or `revalidatePath`, or a different cache key strategy). Would reversing cost more than one PR? Yes (the sweep of `updateTag` call sites). The ADR earned its weight.

Senior calls and watch-outs:

- The Decision section is the most common failure point — students hedge ("we'll cache the entitlement read with `cacheTag` for now") because they're nervous about committing in writing. The Decision is the decision; the hedge belongs in the Context (as "we considered no-cache and rejected it") or the Consequences (as "reversal cost is one PR"), not the Decision line. State the rule and check the student's draft against it.
- Naming the mutation seams in the Consequences is the load-bearing detail — it converts a vague "remember to invalidate" into a list a future maintainer can grep. The senior reflex is "if your Consequences include 'remember to do X', list every place X has to happen." The list is the structural enforcement; the prose alone isn't.
- The TSDoc-as-single-place-to-lint pattern in the Consequences (the cached function's TSDoc lists every `updateTag` seam) is the kind of follow-up an ADR commits to — and the next PR that adds the TSDoc closes the loop. Don't promise the follow-up if you're not going to write it.
- The `'minutes'` profile isn't accidental — it's the trade-off the ADR records. A student who writes `revalidate: 3600` without justification has skipped the trade-off analysis. The senior call is "name the window, name why."
- The filename slug is part of the contract. `0007-cache-entitlement-reads-with-cacheTag.md` is correct; `0007-caching.md` is too vague; `0007-add-use-cache-to-getplanentitlement.md` describes the *change*, not the *decision*. The rubric scores the filename.

Codebase state at entry: target unchanged; all five comments in `reviews/chapter 108.md`; ADR file empty (the stub).
Codebase state at exit: target unchanged; `docs/adr/0007-cache-entitlement-reads-with-cacheTag.md` written with all four sections (Status, Context, Decision, Consequences) filled, named after the decision, with a real declarative Decision line and an honest Consequences list including the mutation seams and the reversal cost; `docs/adr/README.md` updated with the index entry. The student is ready to commit and self-grade in lesson 5 of chapter 108.

Estimated student time: 40 to 50 minutes.

---

## Lesson 5 — Commit, then self-grade

Commits the review and ADR, checks out the `v1.0-answer-key` rubric tag, scores each comment and ADR section against the floor-and-senior-reach criteria, and writes the request-changes verdict at the bottom of the review file.

Goals:

- Commit the deliverables: `git add reviews/ docs/adr/0007-*.md docs/adr/README.md && git commit -m "Unit 22 PR review and ADR 0007"`. The senior anchor: the commit is the irreversible step — once committed, the student checks the rubric. Before commit, no peeking.
- Check out the rubric tag: `git fetch && git checkout v1.0-answer-key -- solution/reviews/chapter 108.md solution/docs/adr/0007-*.md`. The rubric lands at `solution/`; the student's work stays at `reviews/` and `docs/adr/`. Side-by-side diff is the comparison.
- Score the five comments clause-by-clause and partial-credit the common gaps. The rubric names the senior-reach details students most often miss:
  - *Finding 1 (missing `authedAction`).* Floor: `blocking:` + cited SaaS pattern #2 + the action wraps in `authedAction`. Senior reach: name the *three* gaps the wrapper closes (role check, tenant scope, rate limit), not just "the wrapper exists." A student who names only role is partially right.
  - *Finding 2 (side-effect import).* Floor: `blocking:` + cited Principle #6 + the action moves to an event handler or removes. Senior reach: the action names *both* alternatives (event handler in Client Component, or remove if PostHog auto-capture covers it) — the choice depends on whether the page-view event is load-bearing for analytics, and naming both options is the senior reach.
  - *Finding 3 (`Date` arithmetic).* Floor: `blocking:` + cited SaaS pattern #13 + switch to Temporal. Senior reach: name both fixes (Temporal *and* read the timezone from the user profile, not the request); a student who only names Temporal misses the timezone half.
  - *Finding 4 (derived state).* Floor: `blocking:` + cited Principle #7 / Chapter 029 + compute inline. Senior reach: the action *deletes* both the state and the effect, not "memo it" — the state itself is the bug. A student who writes "use `useMemo`" is partially right.
  - *Finding 5 (missing audit log).* Floor: `blocking:` + cited the canonical event set + add `logAudit` inside the transaction. Senior reach: name the exact action slug (`organization.plan-label-changed`), the subject (`subjectType: 'organization'`, `subjectId: ctx.orgId`), and the payload shape (`{ previousLabel, nextLabel }`), and place the write *inside* the same transaction so an outer rollback also unwinds the audit row.
- Score the ADR clause-by-clause:
  - *Filename.* The slug must be a noun phrase of the decision (`cache-entitlement-reads-with-cacheTag` or close); the rubric is strict on noun-phrase vs. verb-phrase ("add-use-cache-to..." is a verb-phrase miss).
  - *Status.* "Accepted" with a date.
  - *Context.* Two checks: the read pattern and its scale are named; the alternative (no-cache or `revalidatePath`) is named and rejected with a reason. A student who writes Context without naming the alternative loses the trade-off credit.
  - *Decision.* One declarative sentence with no hedging. The rubric matches against the literal "We will cache..." shape, allowing rewording but not hedging. A "We're considering caching..." or "We should cache..." Decision line fails this check.
  - *Consequences.* Three checks: the mutation seams are *listed* (not just "every mutation must `updateTag`"), the `updateTag`-vs-`revalidateTag` cut is named with the lesson reference, and the reversal cost is honest (the cost is named, not skipped). The rubric awards full credit when all three land; partial when only the seam list is present.
- Score the bonus findings if the student wrote them — the TSDoc `suggestion:`, the naming `nit:`, the file-structure `praise:`. Each one earns extra credit; none are required for the floor.
- Score the severity mix. Five `blocking:` is the rubric expectation. A student who labeled any finding `suggestion:` loses the severity-credit half on that finding even when the rest of the comment is correct, because the blocking-vs.-suggesting cut is what the chapter teaches.
- Walk the senior calls one more time:
  - The review stack from lesson 1 of chapter 107 ordered the pass; the principle-and-pattern map (lesson 1 of chapter 107) named the rules; the four-part comment shape (lesson 2 of chapter 107) carried each finding; the Nygard template (lesson 4 of chapter 105) shaped the ADR. The chapter's deliverable is the discipline of running all four disciplines on one PR.
  - Coverage of all five findings is the floor; the bonus findings are the senior reach. A 3/5 review that goes deep on `cacheTag` semantics but silences `Date` math is a fail.
  - The receiving-review posture (lesson 2 of chapter 107): when the student is later on the author side, they respond to every comment, push back with evidence on incorrect comments, and resolve threads honestly. The rehearsal of writing the comments here is the rehearsal of receiving them next time.
  - The "approve with comments" vs. "request changes" calculus (lesson 2 of chapter 107): a PR with five `blocking:` comments earns a "request changes" review state. The student writes the verdict at the bottom of `reviews/chapter 108.md` as the final line ("Verdict: request changes — five blocking issues, see comments 1–5").
  - The PR-size threshold (lesson 1 of chapter 107) didn't fire here (220 LOC < 400). The student's `## Summary` notes it; the senior reflex is to name when the threshold *did* fire, not when it didn't, but the practice of checking is the reflex.
- Forward references:
  - Unit 23 builds the LLM-backed Q&A surface; the *review* discipline of every PR landing in the next unit is the same one this chapter rehearsed.
  - The principle-and-pattern map continues to grow if the team adds new patterns; the review reflex stays the same — the map is the reference, the four-part shape carries the comment.
  - The ADR file lives forever in `docs/adr/`. When ADR 0007 is later superseded (the cache strategy moves to Redis, or the entitlement model changes), the supersession discipline from lesson 4 of chapter 105 lands: the new ADR references this one, this one's Status updates to "superseded by ADR XXXX," the file is never deleted.

Senior calls and watch-outs:

- The self-grading is the rehearsal. A real PR review has no rubric; the student who needed the rubric to know they mis-labeled a finding will catch it next time without one.
- Missed findings or wrong severities are *not* failure — they are the next review's lesson. The senior reflex is to read the rubric entries for misses and update the personal principle-pattern checklist; the review gets sharper every PR.
- The ADR's Decision-line check is the most common partial-credit miss. Students hedge in writing because the decision feels load-bearing. The discipline lesson 4 of chapter 105 teaches is *to write the decision crisply* — the hedge belongs in Context or Consequences, never in Decision.
- The five-finding floor and the severity-mix expectation are the chapter's load-bearing scores. Coverage + correct severity = the senior shape; deep-dive on one finding while missing two is the wrong allocation of attention.
- The follow-up is to apply the same discipline to *every* PR the student opens or reviews after this chapter. The course's bar is "you ran this pass once, you can run it every time." The chapter's payoff is the muscle, not the artifact.

Codebase state at entry: target unchanged; five comments written; ADR drafted; index updated.
Codebase state at exit: review and ADR committed; rubric tag checked out; the student has a side-by-side comparison, a scored coverage percentage, a severity-match percentage, and an updated personal review checklist for the next PR.

Estimated student time: 25 to 35 minutes.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
