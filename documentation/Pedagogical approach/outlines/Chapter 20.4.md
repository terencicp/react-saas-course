## Concept 1 — Observability gets wired; performance gets documented

**Why it's hard.** The chapter inherits 17.3's "audit is a report, not a patch" muscle and then deliberately breaks it for half the findings. Students who internalized the read-only rule will refuse to wire Sentry; students who arrived patch-happy will fix the waterfall, the N+1, and the image priority while they're "in there." Both reactions miss that two artifacts coexist on purpose — observability gaps close before launch (data loss), performance gaps go in the backlog with measured impact (slow, not bleeding).

**Ideal teaching artifact.** A *Decision* framing built as a 2x2 finding-matrix. Rows: observability vs. performance. Columns: this chapter's treatment vs. the reason. Each cell holds a one-line rule and a one-line senior reason — observability/wire because every minute pre-launch without it is incident-debugging blind; performance/document because the fix sequence is a prioritization conversation, not a checkbox; the barrel-import cell as the deliberate exception, called out by name with the bundle-analyzer-before/after artifact as the reason. The matrix sits next to the eight seeded findings labeled by row, so the student reads the deliverable shape and the finding list together.

**Engagement.** A `Buckets` drill — the eight findings (plus the two bonuses) sorted into "fix in-code" / "document with fix paragraph" / "document and fix in-code" columns. The barrel finding is the only one in the third column; missing that is the partial-credit pattern.

**Components.**
- `Figure` with a hand-SVG 2x2 matrix labeling observability/performance against wire/document treatment, with the barrel exception called out. Single-use within this chapter; static is fine.
- `Buckets` (existing) — the three-column finding sort.

**Project link.** This concept *is* the project's deliverable shape. Every later concept resolves into one of the two columns this matrix sets up.

---

## Concept 2 — The running app is the diagnostic surface, not the source tree

**Why it's hard.** Half the seeded findings are visible in 60 seconds in the running app and invisible from a source-read alone. Sentry's missing wiring shows as a default Next.js error page on `/api/test/throw`. The PostHog gate breach shows as a `/e/` request in the Network panel pre-consent. The waterfall shows as four sequential `pg` spans in the trace. The image priority gap shows as a 3.4s LCP marker. Students who treat the audit as code review miss them; students who only browse miss the redactor and the N+1 query loop. The discipline is dual-channel, always, with the running app *primary* for at least four of the eight.

**Ideal teaching artifact.** A *Mechanics* walkthrough cast as a paired-discovery sequence — the same shape 17.3 used for security findings, repurposed for observability and performance. Five frames, one per primary-running-app finding: each frame shows the editor pane on the left (source open at the seeded location) and the diagnostic surface on the right (DevTools Performance with the LCP marker; Network filtered to `posthog` with the `/e/` row highlighted; the Sentry dashboard showing zero events on the throw; the dev console with the leaking `stripe-signature`; the Sentry trace with four sequential spans). The student scrubs through the five frames before reading the modeled finding 7 walkthrough in lesson 20.4.2.

**Engagement.** A `Matching` drill — eight seeded findings on the left, "found via source read" / "found via running app" / "found via both" on the right. The student matches each to its *primary* discovery channel. The expected pattern is 4-2-2 (Sentry/log-leak/consent/LCP via app; waterfall/N+1 via both; barrel/correlation-IDs via source).

**Components.**
- `DiagramSequence` (existing) — the five paired-discovery frames. Reuses the same shape concept 4 in chapter 17.3 used; no new component needed.
- `Matching` (existing) — the discovery-channel sort.

**Project link.** Lesson 20.4.2 is the rehearsal; the rest of the chapter assumes the discovery rhythm has been installed.

---

## Concept 3 — Single seam to lint: the audit's positive deliverable

**Why it's hard.** Junior reflex on an observability bug is "add the missing call at the call site." That works once. The next engineer adds the next call site without it, and the discipline collapses. The senior move installed across this chapter is the inverse — every governed concern routes through *one* function: `redact` for log-and-error scrubbing, `withRequestId` for per-request context, `grantAnalyticsConsent`/`revokeAnalyticsConsent` for analytics toggling, `optimizePackageImports` for tree-shaking. The audit produces findings at the *bypass call sites*; the wires produce *seams the next engineer cannot accidentally route around.* This through-line is invisible if it's not surfaced explicitly.

**Ideal teaching artifact.** A *Concept* artifact built as a labeled seam map — four boxes for the four seams installed in this chapter (`redact`, `withRequestId`, `grantAnalyticsConsent`, `optimizePackageImports`), each labeled with the call sites it now governs and the bypass-finding it closes. Each box has a "before" annotation (what the call sites looked like in the seeded target) and an "after" annotation (what they look like once wired). The map is the chapter's structural diagram — every wire lesson is filling in one box.

**Engagement.** A `Tokens` drill on a stripped listing of the post-wire codebase. The student clicks every call site that *should* route through one of the four seams. The seeded decoys are call sites that look like they should route through but legitimately don't (e.g. a server log line that doesn't need redaction because it's static text). Correct picks are the live call sites; decoys are the false positives. The exercise calibrates "where the seam applies" rather than "find the missing call."

**Components.**
- `Figure` with a hand-SVG four-seam map. Single-use within this chapter; the layout (seams as the lint plane, call sites as the conforming surface) carries the meaning. `Figure` + hand-SVG is the correct call.
- `Tokens` (existing) — the call-site click.

**Project link.** This map is the artifact the student carries into 21.2 (CI gates) — the seams it names are the lint targets the CI step will enforce.

---

## Concept 4 — One redactor, two callers

**Why it's hard.** The seeded target has a Pino logger leaking the Stripe signature header. The fix in isolation looks like "add `redact` to Pino's config." That works for log lines and silently fails for Sentry events — `beforeSend` is a separate code path, and an unredacted webhook payload captured into Sentry is the same incident as logging it. The senior reflex is to factor the redaction *before* wiring the second caller, not after. Students who fix Pino first and Sentry later end up duplicating the drop-list, drifting it over time, and producing the next leak from the call site that imports the wrong copy.

**Ideal teaching artifact.** A *Pattern* archetype with a wrong-then-right pair: panel A — `lib/logger.ts` with `redact: { paths: [...] }` inline in the Pino config and a duplicated drop-list inline in `sentry.server.config.ts`'s `beforeSend`; panel B — `lib/logger.ts` exporting a `redact(payload)` function consumed by both. The senior verdict bar reads "one drop-list, two callers" on B and "two drop-lists, drift inevitable" on A. The artifact closes by naming the rule explicitly: when the second caller appears, refactor; do not wire the second caller against the first version of the rule.

**Engagement.** A two-option `MultipleChoice` framed as the in-lesson decision: "you've wired Pino's `redact` config with the drop-list inline. Sentry needs the same scrubbing on `beforeSend`. What next?" Trap option: "copy the drop-list into `beforeSend`." Correct option: "factor `redact(payload)` into `lib/logger.ts`, then wire both." The card review names the drift cost of the trap.

**Components.**
- `CodeVariants` (existing) — the duplicate-vs-shared panels. The component's tab-with-explanation shape fits the wrong-then-right pair exactly.
- `MultipleChoice` (existing) — the refactor-decision drill.

**Project link.** Lesson 20.4.3 installs this seam; lesson 20.4.6's logger verify exercises both callers (the webhook log line *and* a thrown error in the same flow) confirming the redaction is one rule.

---

## Concept 5 — `AsyncLocalStorage` is the request-context primitive

**Why it's hard.** The correlation-ID requirement looks like "store the request ID somewhere so the logger can find it." The obvious answer is a module-level variable or `globalThis`. Both leak across concurrent requests — request A's middleware writes the ID, request B's handler reads it, the log line ties to the wrong request, and the bug is invisible until two real users hit the server simultaneously. Node's `AsyncLocalStorage` is the load-bearing primitive that solves this and has no obvious surface a junior would discover unprompted.

**Ideal teaching artifact.** A *Concept* artifact in two beats. First beat: a side-by-side execution-trace mock showing two concurrent requests under both implementations. The module-level-variable trace shows request A's middleware setting `currentRequestId = "a-1"`, request B's middleware overwriting with `"b-1"` before A's handler runs, and A's log line emitting `requestId: "b-1"` — the cross-talk made visible. The `AsyncLocalStorage` trace shows the same interleave with each handler reading its own store and the log lines staying correct. Second beat: the canonical wiring — `proxy.ts` calls `store.run({ requestId }, next)`; `lib/logger.ts` reads `store.getStore()?.requestId` via Pino's `mixin`; `beforeSend` reads the same store and calls `Sentry.setTag`. One store, three consumers, zero cross-talk.

**Engagement.** A `PredictOutput` drill: a snippet showing two interleaved requests under the module-level-variable implementation, the student predicts which request's ID ends up on which log line. The expected output is the cross-talk; the prose lands the explanation.

**Components.**
- `DiagramSequence` (existing) — the two execution-trace mocks as scrubbable frames. The temporal interleave is what makes the bug visible; a static figure can't show "B overwrites between A's middleware and A's handler."
- `PredictOutput` (existing) — the cross-talk prediction.

**Project link.** Finding 3 in 20.4 (`003-missing-correlation-id.md`) is this concept on the seeded target. The senior-reach detail in the answer key is *naming* `AsyncLocalStorage` in the fix paragraph, not just "thread the request ID."

---

## Concept 6 — The PostHog gate is two changes, not one

**Why it's hard.** The seeded finding reads "PostHog fires pre-consent." The obvious fix is `opt_out_capturing_by_default: true`. Students flip the flag, verify zero pre-consent events on the Network panel, ship — and post-consent events don't fire either because nothing ever called `posthog.opt_in_capturing()`. The init flag and the runtime opt-in are *both* load-bearing; flipping only one breaks differently than the seeded state but breaks all the same. Session continuity is the third miss: a consent-granted user reloads the page, init runs with capture off, no one re-calls `opt_in_capturing`, and the session goes dark.

**Ideal teaching artifact.** A *Pattern* archetype shaped as a state-table simulator. Columns: init flag (`opt_out_default: true` vs `false`), runtime call (`opt_in_capturing()` called vs not), reload-time re-call (yes vs no). Rows: the eight combinations. For each row, two outcome cells — pre-consent capture (yes/no), post-consent capture (yes/no), post-reload capture (yes/no). The student reads the table and finds the single row where all three outcomes match the requirement: `opt_out_default: true` + `opt_in_capturing()` on grant + re-call on mount if cookie present. Every other row breaks at least one verify step.

The reading is the lesson — the table makes visible that the gate is a three-piece compound, and seven of the eight rows fail one of the three checks. The wrong-by-default rows are the easy traps to fall into (flip only the init flag, set both but skip the reload re-call, etc.).

**Engagement.** A `TrueFalse` round on four statements drawn from the table: *"`opt_out_capturing_by_default: true` alone is sufficient to satisfy the gate."* (false — events never fire post-consent without `opt_in_capturing()`.) *"If the user reloads after granting consent, capture resumes automatically."* (false — init runs with opt-out-default; explicit re-call needed.) *"`revokeAnalyticsConsent` only needs to clear the cookie; PostHog will respect it on next load."* (false — explicit `opt_out_capturing()` call required for the current session.) *"The consent banner should call `posthog.opt_in_capturing()` directly."* (false — routes through `grantAnalyticsConsent` for single-seam discipline.) Each card review names the row of the table that fails.

**Components.**
- `Figure` with a hand-SVG state table — eight rows, three input columns, three outcome columns, the one correct row highlighted. Single-use within this chapter; the layout (the table itself) carries the meaning.
- `TrueFalse` (existing) — the four-row confirmation.

**Project link.** Finding 4 in 20.4 (`004-posthog-consent-gate.md`) is the table's one correct row instantiated. The senior-reach detail the answer key names is the session-continuity re-call — the trap students hit at the verify step.

---

## Concept 7 — Diagnose the RSC waterfall from the trace, fix only the parallel pair

**Why it's hard.** Two failures stack here. First, the waterfall is invisible from a source read — `await getInvoices(org.id)` and `await getTeamMembers(org.id)` look the same as any other awaits unless you've already trained the dependency-check reflex. The trace, by contrast, shows four sequential spans with idle gaps, and the bug names itself. Students who try to find it by source-reading either miss it or flag false positives where the dependency *looks* present but isn't. Second, the fix invites overreach: the obvious move is "wrap the whole block in `Promise.all`," which breaks `org` (which depends on `user.orgId`) and `invoices`/`team` (which depend on `org.id`). Only the *parallel pair* gets `Promise.all`; the dependency chain stays sequential.

**Ideal teaching artifact.** A *Mechanics* walkthrough in two beats. First beat: the Sentry trace view as the diagnostic surface — a labeled diagram of the four spans with their start/end times and idle gaps highlighted, with a dependency arrow overlay showing `user → org → {invoices, team}`. The arrows make the parallelism opportunity visible: two of the four edges are independent. Second beat: a wrong-then-right pair of the rewrite — panel A shows `Promise.all([user, org, invoices, team])` (the "wrap everything" anti-pattern, broken because `org` can't run before `user` resolves); panel B shows the senior fix — `user` and `org` stay sequential; `Promise.all([getInvoices(org.id), getTeamMembers(org.id)])` parallelizes only the leaf pair.

**Engagement.** A two-option `MultipleChoice` after the trace reading: "the trace shows four sequential spans for `user`, `org`, `invoices`, `team`. The fix is:" with trap "wrap all four in `Promise.all`" and correct "keep `user` and `org` sequential; `Promise.all` the invoices/team pair." The card review names the dependency edge that breaks under the trap.

**Components.**
- `Figure` with a hand-SVG trace overlay — four spans on a timeline, dependency arrows above. Single-use within this chapter; the layout (timeline + dependency graph) carries the meaning.
- `CodeVariants` (existing) — the wrap-everything vs. parallel-pair panels.
- `MultipleChoice` (existing) — the rewrite decision.

**Project link.** Finding 5 in 20.4 (`005-rsc-waterfall.md`) is this concept on the seeded target. The senior-reach detail in the answer key is *naming the parallel pair specifically*, not the "wrap everything" form.

---

## Concept 8 — Bundle-analyzer before/after is the regression-survival artifact

**Why it's hard.** The barrel-import fix is structurally trivial — one line in `next.config.ts`. The teaching weight is not in the fix; it's in the *evidence shape*. A `findings/006-barrel-import.md` that names the rule and the fix passes the contract; a finding that embeds before/after treemap screenshots survives the PR description, the launch-review email, and the post-mortem six months later when a teammate adds `radix-ui` to the same config without checking. The screenshots are the regression-survival format. Students who omit them and write paragraphs miss the senior signal: numbers in pictures travel; numbers in prose don't.

**Ideal teaching artifact.** A *Pattern* archetype centered on the evidence shape. Top of the lesson: two real treemap screenshots side by side — before, with `lucide-react` as a ~600 KB tile; after, with `lucide-react` as a ~30 KB sliver. Annotation arrows on each call out the delta. Below the images: the embedded markdown of `findings/006-barrel-import.md` showing exactly how the screenshots sit in the finding (image tags, captions, the First Load JS table pasted into `SUMMARY.md` as secondary evidence). The artifact teaches the *finding shape*, not the optimization — the optimization is one line; the evidence is the deliverable.

**Engagement.** The artifact carries the model. Follow-up `MultipleChoice` confirms recall: "you've fixed the barrel import. The bundle drops from 600 KB to 30 KB. The finding documents the fix. What's the single most useful piece of evidence to attach?" Options: "the `next.config.ts` diff," "the First Load JS table from `pnpm build`," "the bundle-analyzer treemap before/after screenshots," "a paragraph describing the byte delta." Correct: the screenshots. The card review names which artifact survives a PR description.

**Components.**
- `Figure` with two side-by-side treemap images and arrow annotations. The component-level alternative would be a screenshot-comparator widget, but the value here is the *static* artifact — what the student will produce; a widget would teach the wrong shape.
- `MultipleChoice` (existing) — the evidence-form confirmation.

**Project link.** Finding 6 is the only performance finding fixed in-code precisely because this evidence shape needs production. The before/after screenshots are required deliverables in the verify step.

---

## Concept 9 — The N+1 fix is structural; `db.toSQL()` is the verification

**Why it's hard.** Two failures stack. First, the bug is invisible from the rendered page — the invoice list renders correctly; it just runs 1+N queries to do it. The diagnostic surface is the slow-query log or the dev console with query logging on, not the UI. Second, the fix invites the wrong-shape choice. Three options exist: a manual `innerJoin`, the Drizzle relations API (`with: { customer: true }`), or a per-row cache. The senior default is the relations API — it's the structural fix, generates one joined query, and stays readable as the schema grows. `innerJoin` is the senior fallback when the relation isn't declared. The per-row cache is the wrong-shape choice that papers over the N+1 instead of removing it. Without naming the three options and the threshold for each, students who reach for `innerJoin` first don't learn *why* relations earned the default.

**Ideal teaching artifact.** A *Decision* archetype with a three-row comparator. Rows: per-row cache, `innerJoin`, relations API. Columns: SQL emitted (one row per option — N+1 still present, one query with explicit join, one query with auto-join), readability as schema grows (degrades, stable, stable), the senior verdict (workaround, fallback, default). Below the comparator: the verification beat — a snippet of `db.toSQL()` against the relations-API query showing the generated SQL is one statement with an `inner join`. The verification is the load-bearing senior move: the relations API hides the SQL, and trusting it without `toSQL()` is the way a regression slips in when a future relation isn't a single join.

**Engagement.** A two-step drill. First, a `Buckets` sort — five seeded N+1 candidates from across the codebase (invoice list with customer; team page with member roles; org switcher with member orgs; etc.) into "use relations API" / "use `innerJoin` (relation not declared)" / "not an N+1 — leave alone." Second, a `MultipleChoice` on the verification: "you've rewritten `listInvoices` with `findMany({ with: { customer: true } })`. How do you confirm it generates one query?" with `db.toSQL()` as the correct answer and trap options ("read the Drizzle source," "trust the API contract," "run `EXPLAIN ANALYZE` on the generated SQL"). `EXPLAIN ANALYZE` is the partial-credit trap — it's a valid downstream check but it doesn't catch a relations-API regression that emits N joins instead of one.

**Components.**
- `Figure` with a hand-SVG three-row comparator. Single-use within this chapter; the row layout (SQL emitted, readability, verdict per option) carries the meaning.
- `Code` (existing) — the `db.toSQL()` verification snippet.
- `Buckets` (existing) — the option-selection sort.
- `MultipleChoice` (existing) — the verification-method drill.

**Project link.** Finding 8 in 20.4 (`008-n-plus-1-invoices.md`) and bonus finding 10 (composite index) are this concept on the seeded target. The senior-reach detail in the answer key is naming `db.toSQL()` as the verification step, not just the fix.

---

## Concept 10 — Verify per surface, in order; don't proceed if upstream fails

**Why it's hard.** Students who finish wiring and reach the verify step want to check everything at once. That order hides upstream breakage. The most common silent failure here is source-map upload — `SENTRY_AUTH_TOKEN` missing at build time means Sentry catches the throw but the stack is minified. The student sees "Sentry caught the event" and moves on to PostHog verify. The audit fails downstream when the launch reviewer asks for a readable stack trace and the student has no idea when it broke. The discipline is *per-surface verify, in order, with the failure mode named for each surface* — Sentry's readable-stack check gates the rest; PostHog's two-half check (pre-consent zero requests, post-consent events fire) gates ship; the logger's webhook flow exercises both `redact` callers; the findings directory is the document-shape check.

**Ideal teaching artifact.** A *Reference* archetype shaped as a verify-recipe card. One column per surface (Sentry, logger, PostHog, findings). Each column has three rows: the action the student takes, the surface they read, the failure mode that gates progression. Sentry's failure mode is "minified stack — source-map upload broken, fix before proceeding." Logger's is "signature visible in console — `redact` not wired or wired to wrong key." PostHog's is "events post-consent missing — `opt_in_capturing()` not called on grant." Findings' is "screenshots missing on 006 — finding shape incomplete." The card sits next to a rule: the recipe runs top-to-bottom, each surface gates the next, and an upstream failure is not a "I'll come back to it" — it's a stop.

**Engagement.** A `Sequence` drill — the student orders the verify steps in their gating sequence (Sentry readable stack → log redaction → PostHog two-half check → findings document shape → bundle-analyzer screenshots embedded → commit → checkout answer-key tag). Then a follow-up `MultipleChoice`: "Sentry catches the throw but the stack reads `at e (line 1 column 12345)`. What's next?" with the trap "proceed to PostHog verify; come back to the stack later" and the correct "stop, fix source-map upload (likely `SENTRY_AUTH_TOKEN` missing at build), re-run." The card review names the discipline: each surface gates the next.

**Components.**
- `Card` / `CardGrid` (existing) — the four-surface verify recipe as a scannable grid. The three-row-per-card structure (action / surface / failure mode) maps cleanly.
- `Sequence` (existing) — the verify-order drill.
- `MultipleChoice` (existing) — the upstream-failure decision.

**Project link.** Lesson 20.4.6 is this concept's instantiation. The commit-before-peek discipline from 17.3 carries through unchanged and lands as the last step in the sequence.

---

## Component proposals

None. Every concept lands on existing components (`Buckets`, `DiagramSequence`, `Matching`, `Tokens`, `CodeVariants`, `MultipleChoice`, `PredictOutput`, `TrueFalse`, `Code`, `Card`/`CardGrid`, `Sequence`) or a `Figure`-wrapped hand-SVG. The hand-SVG figures (the 2x2 finding matrix, the seam map, the PostHog state table, the waterfall trace overlay, the N+1 comparator) are each single-use within this chapter and the layout carries the meaning — `Figure` is the correct call.

The chapter's teaching weight sits in disciplined real-world artifacts: the running app, the Sentry dashboard, the PostHog Network panel, the bundle-analyzer treemap, the `findings/` directory, and the answer-key tag. None of those benefit from bespoke wrapping. Where Chapter 20.3 proposed simulators for `priority` budgets and module graphs (concepts that benefit from controllable cause-and-effect), the corresponding moves here are about *reading* real surfaces in the running app — the simulator would teach the wrong shape.

One callout for the lesson authors: `CodeVariants` is asked to carry wrong-then-right pairs in concepts 4 and 7 (one redactor vs. duplicated drop-lists; wrap-everything `Promise.all` vs. parallel-pair-only). Confirm its tab-with-explanation surface fits the senior-verdict-bar form these need; the alternative is two side-by-side `Code` blocks inside a `Figure`.

---

## Build priority

No new components proposed; nothing to prioritize. The chapter's bottleneck is *content* (the hand-SVG figures and the artifact screenshots), not components. The hand-SVG figures with the highest teaching load are concept 6's PostHog state table (the 8-row table is what makes the gate's three-piece compound visible; it's the chapter's hardest concept to teach without it) and concept 3's seam map (the chapter's structural through-line; ties together the four wire deliverables). Authors should draft these first; the rest are conventional comparators.

---

## Open pedagogical questions

- Concept 6's state table is 8 rows × 6 columns. A static hand-SVG works but is dense. If reader-testing shows the table is hard to scan, a small interactive widget (toggle the three inputs, the three outcome cells flip) would carry the model more cleanly. Flag for review after first draft; the static version is the floor.
- Concept 2's `Matching` drill assumes the 4-2-2 expected distribution (4 findings primary in the app, 2 in both, 2 in source). The exact split depends on whether the student counts the log-leak as "found by reading source" (the serializer code) or "found by reading the running app" (the console output). The answer-key column for that finding should pick one and the drill's expected answer should match.
