## Concept 1 — The eight-category baseline as a checklist, not a survey

**Why it's hard.** A baseline taught as a list of topics reads as best-practice maximalism; the student walks away with breadth but no commitment to which items are non-negotiable and which are conditional. The course's posture — load-bearing minimums — has to land before the eight category lessons, or the student treats each lesson as one more item to maybe-do.

**Ideal teaching artifact.** A *Reference / Pattern* opener built as a one-screen audit catalog the student will revisit at the end of every lesson. Eight categories, each row stating the senior rule, the one failure mode it prevents, and one phrase naming where it lands in the codebase (`next.config.ts`, `lib/rate-limit.ts`, etc.). The catalog presents itself first as gaps — every row marked unresolved — and gets visually closed as the chapter progresses. This sets up the chapter as an audit pass rather than an architecture chapter.

**Engagement.** Bucket sort: the student is given fifteen security practices (six load-bearing, nine plausible-but-out-of-scope, like SIEM, cryptographic chained logs, Vault) and sorts them into "ship before launch" vs "deferred / out of scope." Locks in the cut.

**Components.**
- `Figure` containing a hand-authored SVG catalog with eight rows and three columns (rule, failure-mode, file location), or `ArrowDiagram` if the file-location column is best shown as edges into a sketch of the codebase shape.
- `Buckets` for the ship-vs-defer sort.

**Project link.** This catalog is the spine of the 17.3 audit: every row maps to one or more findings the student will surface against the seeded codebase.

## Concept 2 — Headers split between static config and per-request middleware

**Why it's hard.** Students who've added security headers before usually put all of them in one place — a Next config block — and then can't explain why CSP with nonces refuses to live there. The deeper misconception is that "headers" are a single concern; in this stack they split sharply between *static-prerenderable* (cacheable, no per-request work) and *per-request dynamic* (the nonce changes every render). Confusing the two breaks either CSP (nonce reuse defeats it) or static prerendering (every page becomes dynamic for no reason).

**Ideal teaching artifact.** A *Concept* artifact: a two-column side-by-side showing the same incoming request flowing through `next.config.ts` and through `proxy.ts`. The student toggles "static page" vs "dynamic page" and watches which column responds, what the resulting `Content-Security-Policy` header looks like (with or without nonce), and whether the response can be cached. The model makes the split structural rather than memorized — the location decides the lifetime decides the policy shape.

**Engagement.** Predict-the-header: the student is shown three routes (a marketing page, a dashboard page, a webhook receiver) and predicts which file owns each header, then sees the resolved response.

**Components.**
- New component: `HeaderResolutionWidget` — toggle for route type (static marketing / dynamic app / API), shows static headers from a `next.config`-shaped object merging with per-request `proxy.ts`-shaped output, and renders the final response headers. Single chapter use, but the concept recurs (Unit 21 CI smoke checks, Unit 20 reporting). Demote to alternative if forward-link is thin.
- Primary recommendation: `Figure` with a hand-authored SVG of the two-pipeline merge plus a `TabbedContent` for the three route types showing the resolved headers as code.
- `PredictOutput` for the headers prediction.

## Concept 3 — CSP as the one header that blocks live attacks (and the nonce mechanic that makes strict CSP shippable)

**Why it's hard.** CSP is the highest-leverage header and the easiest to render useless. `'unsafe-inline'` defeats it; per-origin allow-lists become unmaintainable; nonces are the senior reach but mean the response is per-request. The student needs to feel why each common shortcut fails before the recommended directive set lands.

**Ideal teaching artifact.** A *Pattern* misconception-first ambush. The student is shown a "reasonable" CSP that includes `'unsafe-inline' 'unsafe-eval'` and is asked to walk an attacker's injected `<script>` through it. The script lands. A second attempt narrows to origins only — and a CDN-hosted script slips through `'self' https://cdn.example.com`. A third attempt uses a per-request nonce with `'strict-dynamic'`; the injected script lacks the nonce and dies at the parser. Each attempt is a tab in a sequenced walkthrough; the takeaway is that nonces are not paranoia, they're the cheapest directive that actually works.

A second beat — short — walks the nonce's lifecycle: `proxy.ts` generates it, attaches it to `x-nonce` on the request, sets it in the CSP, and Server Components read it via `headers()`. One sequenced diagram tracing the nonce from generation to attachment to validation in the browser.

**Engagement.** `Tokens` on a finished CSP directive string — the student clicks the load-bearing tokens (`'nonce-…'`, `'strict-dynamic'`, `frame-ancestors 'none'`) and the decoys that look protective but aren't (`'unsafe-inline'`, broad `https:`).

**Components.**
- `CodeVariants` for the three escalating CSP attempts with the injected-script outcome under each.
- `DiagramSequence` for the nonce-lifecycle trace, with each step in a `Figure` containing a small hand-authored SVG.
- `Tokens` for the directive-recognition drill.

## Concept 4 — The three triggers that make a limiter mandatory

**Why it's hard.** Students returning to web tend toward two failure modes — rate-limit everything (operational noise, fragmented analytics) or rate-limit only what was attacked last time (case-by-case, never coherent). The senior reach is a single decision rule with three triggers; anything failing all three gets the wrapper's default, never a custom one.

**Ideal teaching artifact.** A *Decision* artifact built as a guided puzzle. The student is shown twelve endpoints from a SaaS codebase (invite send, document search, marketing-page view, presigned-URL issue, password reset, public health check, contact-form submit, internal cron, AI completion, member list, webhook receiver, settings update). For each, three checkboxes — costs money, can attack a third party, addressable without auth. The student ticks the boxes; the rule resolves "mandatory custom limiter" vs "default wrapper" vs "no limiter" automatically. The puzzle's framing is "I'll tell you when, you tell me which buckets" — the student doesn't memorize a list, they internalize a rule.

**Engagement.** The puzzle itself is the assessment. Follow-up beat: a `MultipleChoice` on one trap case — the webhook receiver — where students often miss that the signature-verified receiver doesn't need a limiter but the *fan-out* it triggers does.

**Components.**
- New component: `EndpointTriageGrid` — rows of endpoints, per-row trigger checkboxes, auto-resolving verdict column. Inputs: endpoint list with the three correct trigger booleans and verdict. Single-use unless extended to similar triage drills in 17.3 — credible forward-link.
- Primary recommendation: `Buckets` with the twelve endpoints sorting into three verdict buckets — close enough to teach if the three-trigger rule is taught in prose alongside.
- `MultipleChoice` for the webhook-fan-out trap.

**Project link.** Lands directly in 17.3's rate-limit-coverage finding category — the student grep audits the seeded codebase against this rule.

## Concept 5 — The `safeLimit` seam and module-scope limiter catalog

**Why it's hard.** Even when students apply limiters correctly, they scatter them — inline in handlers, anonymous `Ratelimit` instances inside route files, no shared analytics prefix. The audit becomes ungreppable. The senior discipline is that *every* limiter lives at module scope in one file, and *every* `.limit()` call goes through the `safeLimit` wrapper.

**Ideal teaching artifact.** A *Pattern* wrong-by-default sandbox. The student opens a small codebase with three handlers — one with an inline `new Ratelimit(...)`, one calling `.limit()` directly without `safeLimit`, one correctly going through the central `lib/rate-limit.ts`. The student is told: "Run grep. Find all the violations." Then: "Fix them so the grep is clean." The grep target is named explicitly — `limit\(` not preceded by `safeLimit\(`. The artifact teaches the audit motion the chapter is preparing the student for.

**Engagement.** The sandbox carries the assessment — fixes are graded by the grep returning zero hits and the file structure matching `lib/rate-limit.ts`-style module-scope declarations. Follow-up beat: one `MultipleChoice` on why Redis-outage fail-open belongs inside `safeLimit` and not at the call sites.

**Components.**
- `ReactCoding` (or `ScriptCoding` if a non-React handler shape fits better) configured in tests mode with three files and a grep-style test asserting no inline `Ratelimit` constructors and all `limit(` calls preceded by `safeLimit(`.
- `MultipleChoice` follow-up.

## Concept 6 — Audit-log event taxonomy: what's in, what's noise, what goes to Sentry

**Why it's hard.** The audit-log table tends to drift in one of two directions — too noisy (every read logged, table unusable) or too sparse (no record of the role change that mattered in the incident). The discipline is a closed taxonomy of six categories and a clear boundary against what belongs in Sentry instead. Without the boundary, students fall back on intuition and it's never the same on Monday as on Friday.

**Ideal teaching artifact.** A *Decision* / *Concept* hybrid built as a triage exercise. The student is shown twenty events from a single user session — sign-in, dashboard view, document open, member-list scroll, document edit save, share-link create, role change on a teammate, failed-auth on a sibling tenant, payment-method add, cron-driven cleanup ran, sign-out. Each is dragged into one of three columns: audit log (with category sublabel), Sentry / structured logs, or job-history. The user gets immediate feedback on each placement with a one-line reason — "reads of resources you have access to are noise; goes to structured logs."

**Engagement.** The triage exercise itself is the recall. Follow-up beat: a `Tokens` drill on a real audit-log entry where the student clicks the load-bearing fields (`actor_user_id`, `event`, `payload` redacted, `created_at` from server) and the decoys (client-side timestamp, raw input dump, redundant resource-list payload).

**Components.**
- `Buckets` in three-column mode for the twenty-event triage, with per-item feedback.
- `Tokens` on the audit-entry shape.

## Concept 7 — Transaction-scoped `logAudit(tx, event)` and append-only as belt + suspenders

**Why it's hard.** Students who haven't shipped audited systems write the log after the mutation — "I'll insert the audit row once the role change succeeds." Then a network blip kills the second statement, and the role change committed with no audit trail. The senior discipline is that `logAudit` takes the transaction as its first argument — the audit row commits with the mutation, or neither does. Append-only is enforced at two layers: RLS denies UPDATE/DELETE, and application code goes through `logAudit` exclusively.

**Ideal teaching artifact.** A *Concept* time-travel widget. Two timelines side by side: "log-after" (separate statements) and "log-in-transaction" (`logAudit(tx, event)`). The student injects a fault on a slider position — connection drop, app crash, RLS violation. Each timeline plays through; the student sees which one ends with a committed mutation and a missing audit row, and which one rolls back both as a single atomic act. The artifact makes the transactional invariant viscerally obvious — you don't memorize "pass `tx`," you feel why.

**Engagement.** `PredictOutput` on a snippet where `logAudit` is called *outside* the `db.transaction(...)` callback — student predicts what's in `audit_logs` after a row-level constraint violation rolls the mutation back. Then the audit-log row is shown as present, mutation as absent — the bug class.

**Components.**
- New component: `TransactionTimeline` — two side-by-side timelines, each a sequence of DB operations, with an injectable fault marker; visualizes commit/rollback boundaries. Single-use but the concept recurs in Unit 19 (transaction-rollback integration tests) and Unit 12 (webhook idempotency); credible forward-link.
- Primary recommendation: `DiagramSequence` with two `Figure`s (hand-SVG) per step showing the two timelines under each fault scenario.
- `PredictOutput` for the follow-up.

## Concept 8 — Retention as a catalog driven by a job; deletion as an async graph walk

**Why it's hard.** The student's first instinct on "right to be forgotten" is a synchronous SQL DELETE in a Server Action. That fails three ways at once — too slow for an HTTP response, doesn't touch third parties (Stripe, Resend, PostHog), and leaves audit logs naming the deleted user. The senior shape is a *catalog* declaring per-table policy, a *daily job* walking it for retention, and an *enqueued job* doing the graph walk for deletion-on-request, all idempotent.

**Ideal teaching artifact.** A *Pattern* explorable explanation built around the retention catalog as a live object. Top half: a small editable retention catalog (table, cutoff column, TTL). The student edits one row's TTL. Bottom half: a simulated nightly job runs against a synthetic 10-day window of seeded data; the student watches which rows survive, which get deleted, and how the audit-log entries get *anonymized* rather than deleted. The artifact makes the catalog-driven shape concrete — the job is dumb, the catalog is the policy.

Second beat: the deletion-on-request flow as a sequenced graph walk. The student initiates a deletion; the artifact animates the steps — validate, audit `account.deletion.requested`, enqueue, walk the data graph (user row, sessions, memberships, R2 artifacts, Stripe, Resend, PostHog), anonymize audit, audit `account.deletion.completed`. A fault injector lets the student kill the job halfway and observe that the user stays `deletion_in_progress` until the job retries to completion.

**Engagement.** `Sequence` drill: the student orders the deletion-job steps (validate → audit-requested → enqueue → walk-internal-data → walk-third-parties → anonymize-audit → audit-completed). One wrong order is the trap — anonymizing audit before logging completion loses the actor on the completion entry.

**Components.**
- New component: `RetentionSimulator` — editable catalog table at top, a "day" slider and a "run nightly job" button below, visualizing which seeded rows survive and which are deleted/anonymized. Single chapter use; weak forward-link. Demote to alternative.
- Primary recommendation: `Figure` containing a static SVG of the catalog driving the job (boxes for catalog rows → arrow into job → arrows into tables), plus `DiagramSequence` for the deletion-on-request graph walk with a fault-injection variant per step.
- `Sequence` for the step-ordering drill.

## Concept 9 — The pre-consent boundary: nothing fires before the click

**Why it's hard.** The student's first consent banner reads the cookie on the client, flips a flag, and lets PostHog initialize on mount — by which point a page-view event has already been captured. The regulation is violated in the first hundred milliseconds, before the student has even seen the banner. The senior reach is *gate the SDK load itself* — PostHog initialized with `opt_out_capturing_by_default: true`, and the SDK dynamically imported by the consent provider only when analytics flips on. Belt and suspenders.

**Ideal teaching artifact.** A *Pattern* misconception-first comparison. Three versions of the same page running side by side in tabs: (1) naive — script tag in `<head>`, banner sets a flag; (2) half-fixed — `opt_out_capturing_by_default: true`, SDK still loaded eagerly; (3) senior — SDK dynamic-imported by the consent provider, `opt_out_capturing_by_default: true`. Each tab shows a network-tab strip recording what fires before the user clicks anything. Tab 1 shows analytics requests pre-click. Tab 2 shows the SDK loading but no events. Tab 3 shows nothing. The visual is the lesson.

**Engagement.** `PredictOutput` against a fourth code variant: the student is shown one of the three versions and predicts what appears in the network tab on a fresh incognito load before any click. Then a final `MultipleChoice` on which mitigation is load-bearing if you can only have one.

**Components.**
- `TabbedContent` with three panels, each containing a `Figure` showing a stylized network-tab capture (static SVG) under that version's behavior.
- `CodeVariants` for the three initialization snippets.
- `PredictOutput` plus `MultipleChoice` for recall.

## Concept 10 — The four-state consent machine and equal-weight Accept/Reject

**Why it's hard.** Once "nothing fires pre-consent" is internalized, the second trap is treating consent as a boolean. Real consent is a small state machine with four states (`unset`, `analytics-only`, `marketing-only`, `all`), persisted in a cookie with a 13-month max, revocable from a settings link, and bumped by a policy version. Equal-weight Accept/Reject is not aesthetic preference — regulators have explicitly called out asymmetric banners.

**Ideal teaching artifact.** A *Concept* state machine the student pokes. Render the four states as nodes; the banner buttons (Accept all, Reject all, Manage), the settings-link revoke action, and the policy-version-bump are the labeled transitions. The student clicks each transition; the active state highlights; a side panel shows what `useConsent()` returns and which third-party SDKs are live. A toggle "policy version bumped" forces the state back to `unset` and reshows the banner — the artifact makes the version-invalidation rule click.

**Engagement.** `Matching` drill pairing user actions ("clicks Reject all," "revokes from footer link," "first visit," "policy version bumped") with the resulting state and what `useConsent()` returns.

**Components.**
- New component: `ConsentStateMachine` — node-and-edge state machine with clickable transitions, a side-panel readout of `useConsent()`'s output and SDK status per state. Forward-link credible into Chapter 20.2 (PostHog wiring reads the same machine). Worth building.
- Primary recommendation: if not built, a Mermaid `stateDiagram-v2` inside a `Figure` plus `TabbedContent` showing `useConsent()` output per state.
- `Matching` for recall.

**Project link.** 17.3's consent-gate finding category tests the reject-path-is-clean rule against the seeded codebase; the state-machine model is the mental scaffold.

## Concept 11 — The five secrets rules and the `NEXT_PUBLIC_*` naming bug

**Why it's hard.** Every junior who's shipped a Next app has hit this exact bug: a server-only key referenced inside a Client Component file, bundled into the browser JS, leaked. The student has to *feel* that file boundaries become bundle boundaries — and that `NEXT_PUBLIC_*` is the *only* path into the client, never used for secrets. The `@t3-oss/env-nextjs` server/client split makes the bug structurally hard to write; the lesson lands why the structure exists.

**Ideal teaching artifact.** A *Pattern* wrong-by-default code-review puzzle. The student is shown a small PR diff with five env accesses across three files — a Server Component, a Client Component, and `lib/env.ts`. Three of the five are correct; two are bugs (one `NEXT_PUBLIC_STRIPE_SECRET_KEY` name-contradiction, one `process.env.SENTRY_AUTH_TOKEN` reached from a Client Component). The student leaves inline comments; the grader checks against a short rubric phrase per finding.

**Engagement.** The code review is itself the assessment. Follow-up: a one-question `MultipleChoice` on the rotation sequencing rule — update Vercel first, *then* invalidate at the provider.

**Components.**
- `CodeReview` with five diff hunks and a rubric phrase per finding.
- `MultipleChoice` for rotation order.

## Concept 12 — The four env-schema invariants and `SKIP_ENV_VALIDATION` discipline

**Why it's hard.** `@t3-oss/env-nextjs` was wired back in 1.4.5; six months of feature work later, the discipline drifts. Someone added `process.env.NEW_SERVICE_KEY` directly in a route handler because adding it to the schema was friction. Someone set `SKIP_ENV_VALIDATION=1` in Vercel because a CI step failed. The schema is no longer the source of truth. The audit-pass lesson is about reasserting the four invariants and naming the legitimate uses of the escape hatch.

**Ideal teaching artifact.** A *Reference / Pattern* grep-driven audit drill. The student is shown a small codebase and four grep commands corresponding to the four invariants:
- `process.env\.` outside `lib/env.ts`
- `client\.\w+` in server files (bundle waste)
- `server\.\w+` in client files (build-time throw)
- `SKIP_ENV_VALIDATION` set anywhere outside the Docker build and the type-check job

For each grep, the result list is shown; the student categorizes each hit as a finding or a legitimate exception. The drill is structurally identical to the audit motion 17.3 will demand.

**Engagement.** The drill carries the assessment — each categorization gets immediate feedback. Follow-up beat: a `Buckets` sort of variables into server / client / production-only-NODE_ENV-conditional.

**Components.**
- New component: `GrepAuditDrill` — a synthetic file tree, four predefined grep queries, hit-list per query, per-hit verdict input. Forward-link to 17.3 is direct — that's the entire chapter's motion. Worth building once, reused there.
- Primary recommendation: `TabbedContent` with one tab per grep, each tab containing a `Code` block of the hits and a `MultipleChoice` selecting which lines are findings.
- `Buckets` for the variable-sorting follow-up.

**Project link.** 17.3's env-audit finding category is grep-equivalent to this drill. The artifact is a rehearsal.

## Concept 13 — Supply-chain defaults: `minimumReleaseAge`, lockfile, post-install allow-list

**Why it's hard.** Until Shai-Hulud-class incidents, students treated `pnpm install` as a solved problem and `pnpm audit` as the security story. The 2026 reality is that the most likely breach vector is a transitive dep compromised between version-published and version-yanked. The senior posture is *delay every new release by 24h*, *block exotic subdeps*, and *gate post-install scripts to a small allow-list*. The student has to internalize that `pnpm audit` is the trailing-indicator backup; the load-bearing defenses are the install-time defaults.

**Ideal teaching artifact.** A *Concept* timeline of a real incident replay. The artifact walks a synthetic Shai-Hulud-style compromise on a timeline: T+0h malicious version published, T+3h first observed exploit, T+18h community catches it, T+19h yanked. Above the timeline, three install policies — naive `pnpm install`, `minimumReleaseAge: 1440`, `minimumReleaseAge: 1440` plus `only-built-dependencies` allow-list — each runs against the timeline. The student scrubs through and sees which policy gets compromised when. The 24-hour delay catches it; the post-install allow-list catches the rare 24h+ case where the script tried to run.

**Engagement.** `MultipleChoice` round on four scenarios: (a) critical patch published two hours ago, do you wait? (b) maintainer compromise pushed a patch yesterday, does `minimumReleaseAge` save you? (c) a typosquat with a `postinstall` script lands in your lockfile, what catches it? (d) CI runs `pnpm install` without `--frozen-lockfile`, what's the consequence? Follow-up `Buckets` sorting practices into "load-bearing default" vs "trailing-indicator audit" vs "deferred (Sigstore, Socket)."

**Components.**
- New component: `SupplyChainTimeline` — horizontal incident timeline with a vertical "now" scrubber, multiple install-policy rows above showing compromised/safe per scrub position. Single-use in this chapter but vivid; demote unless a forward-link materializes in Unit 21 CI.
- Primary recommendation: `Figure` with a hand-authored SVG of the timeline plus three stacked policy rows annotated for the catch-point under each.
- `MultipleChoice` and `Buckets` for recall.

## Concept 14 — The audit deliverables as the chapter's exit shape

**Why it's hard.** Eight category lessons risk feeling like eight disconnected commitments. The student leaves knowing each rule but not what *output* the chapter actually produced. The senior framing is that each lesson ends with a small artifact — coverage matrix, event catalog, retention catalog, env-audit page, dep-hygiene report — and the chapter as a whole produces a catalog 17.3 audits a seeded codebase against.

**Ideal teaching artifact.** A *Reference* closer that mirrors Concept 1's opener — the same eight-category catalog from the introduction, now filled in. Each row resolves to the rule, the file location, and the deliverable the student now owns (matrix, catalog, report). The student sees the audit posture made concrete: this is what they hand to a senior or to the next chapter.

**Engagement.** A `TrueFalse` round of ten statements drawn from the eight deliverables ("the rate-limit coverage matrix lists endpoint, file path, limiter prefix, key strategy, current Y/N"; "the audit-log canonical event set forbids logging reads"; "the deletion job anonymizes audit entries rather than deleting them"). End-of-round score, card-by-card review.

**Components.**
- Same catalog visual as Concept 1, re-rendered with the rows resolved — reuse the `Figure` SVG.
- `TrueFalse` for recall.

**Project link.** This closing catalog is literally the input to 17.3 — the document the student carries forward.

## Component proposals

- **`HeaderResolutionWidget`** — toggle for route type (static / dynamic / API); merges static `next.config.ts`-shaped headers with per-request `proxy.ts`-shaped headers; renders the final response header set. **Uses in this chapter:** Concept 2. **Forward-links:** Unit 21.2 CI smoke checks on headers — credible. **Leanest v1:** a `TabbedContent` with three route-type tabs, each statically rendered to its final headers — drops the interactive merge, keeps the static-vs-dynamic split lesson. v1 is dramatically thinner and still passes the bar; build v1.

- **`EndpointTriageGrid`** — rows of endpoints, per-row trigger checkboxes (costs money / attacks third party / addressable without auth), auto-resolving verdict column. **Uses in this chapter:** Concept 4. **Forward-links:** 17.3 rate-limit-coverage finding pass — direct reuse. **Leanest v1:** a `Buckets` sort with the three-trigger rule taught in surrounding prose — loses the per-trigger interactivity but still teaches the rule. Build the full version only if the same triage shape recurs in 17.3.

- **`TransactionTimeline`** — two parallel timelines (log-after vs log-in-transaction), each a sequence of DB ops, with an injectable fault marker; visualizes commit/rollback. **Uses in this chapter:** Concept 7. **Forward-links:** Unit 19 transaction-rollback integration tests; Unit 12 webhook idempotency. **Leanest v1:** a `DiagramSequence` with two side-by-side `Figure`s per step, hand-drawn — static but sequenced. v1 captures the lesson; bespoke version earns its weight only if Unit 19/12 use it too.

- **`RetentionSimulator`** — editable retention catalog plus a day-slider running a synthetic nightly job over seeded data, visualizing survival / deletion / anonymization. **Uses in this chapter:** Concept 8. **Forward-links:** None strong — single-use. Demoted to alternative in Concept 8.

- **`ConsentStateMachine`** — clickable state-machine widget with four nodes, labeled transitions for banner buttons / revoke / policy-version-bump, side panel showing `useConsent()` output and SDK status per state. **Uses in this chapter:** Concept 10. **Forward-links:** Chapter 20.2 PostHog wiring reads the same machine — credible. **Leanest v1:** a Mermaid `stateDiagram-v2` in a `Figure` plus `TabbedContent` with one panel per state showing `useConsent()` output. v1 loses transition-by-click but captures the state model; build v1 unless 20.2 explicitly reuses transitions.

- **`GrepAuditDrill`** — synthetic file tree, predefined grep queries, hit-list per query, per-hit finding/exception verdict input. **Uses in this chapter:** Concept 12. **Forward-links:** Chapter 17.3 — direct, the whole project is grep-driven audits. **Leanest v1:** `TabbedContent` with one tab per grep query containing a `Code` hit-list and a `MultipleChoice` per hit. v1 still teaches the motion; the bespoke version earns weight only if 17.3 uses it as the project's primary interaction.

- **`SupplyChainTimeline`** — horizontal incident timeline with a "now" scrubber and multiple install-policy rows showing per-scrub safety. **Uses in this chapter:** Concept 13. **Forward-links:** Unit 21.2 CI dep-hygiene checks — thin. Demoted to alternative in Concept 13.

## Build priority

`GrepAuditDrill` is the highest-priority new component — it carries Concept 12 *and* is the project-mode interaction for the entire 17.3 audit pass. Build it once, reuse for nine lessons of 17.3.

`ConsentStateMachine` is second — it teaches Concept 10's state model cleanly and reuses in 20.2 when PostHog gets wired. The Mermaid v1 is a credible substitute, but the clickable version is meaningfully better for a state-machine lesson.

`TransactionTimeline` is third — it earns its weight if Unit 19 (transaction-rollback tests) and Unit 12 (webhook idempotency) reuse the side-by-side timeline shape. Without that forward-link, the `DiagramSequence` v1 is enough.

`HeaderResolutionWidget`, `EndpointTriageGrid`, `RetentionSimulator`, and `SupplyChainTimeline` are single-chapter or thin-forward-link proposals; the per-concept Components bullets demote the bespoke versions to alternatives in favor of `Figure`-wrapped static compositions plus existing exercises. Build them only if forward-links materialize.

## Open pedagogical questions

- Concept 5's wrong-by-default sandbox assumes a `ReactCoding` or `ScriptCoding` setup can run a synthetic grep-style assertion against a multi-file workspace. If the live-coding harness can't run grep-style integrity tests across files, the concept falls back to a `CodeReview` artifact — the lesson lands but the motion (run grep, fix until clean) is less visceral.
- Concept 13's incident-timeline artifact is high-impact but single-use unless Unit 21.2 reuses it for the CI dep-hygiene job; that decision determines whether the bespoke `SupplyChainTimeline` is worth building or the static SVG v1 ships.
