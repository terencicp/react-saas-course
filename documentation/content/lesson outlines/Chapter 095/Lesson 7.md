# Lesson 7 — Verify and self-grade

## Lesson title

Chapter-outline title "Verify and self-grade" fits — keep it.
Sidebar (short) title: **Verify and self-grade**.

## Lesson type

`Implementation`.

Rationale: a `tests/lessons/Lesson 7.test.ts` gate exists and asserts the observable shape of `findings/SUMMARY.md` (coverage count, clause-by-clause rubric, per-finding senior-reach detail, personal checklist, both bonus findings) and `findings/out-of-scope.md` (≥1 out-of-category observation) via `readFileSync` source-shape probes (node env, no DOM). A testable deliverable means the test-coder must run, which only branches on `Implementation`. The "feature" the student ships is the assembled `SUMMARY.md` + `out-of-scope.md` artifacts plus the scored self-grade; the rest of the lesson is the run-the-recipe verification pass and the answer-key comparison, which carry as `[untested]` manual confirmations.

## Lesson framing

The student installs the senior habit that closes a launch-review audit: run the verify recipe one surface at a time and stop on the first failure, commit the deliverable, then self-grade against a reference answer key for partial credit on rule + location — proving the audit is *done* (not just *attempted*) and producing a measured backlog. The senior payoff is the disposition itself — observability gaps close before launch because they lose data, performance gaps go to the backlog with measured impact because they are slow not bleeding — and the portable artifact (`SUMMARY.md`) that a senior attaches to a launch-review summary.

## Codebase state

### Entry

The full audit is wired and documented from lessons 3–6, but unverified end to end and ungraded:
- Sentry is wired across client/server/edge (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `next.config.ts` wrapped with `withSentryConfig`, Sentry env keys in `src/env.ts`) — lesson 3.
- The logger seam is production-grade: single `redact` in `src/lib/logger.ts` reused by Pino's `formatters.log` and Sentry's `beforeSend`; `src/lib/request-context.ts` AsyncLocalStorage; `src/proxy.ts` and the Stripe webhook handler open `runWithContext` scopes with `x-request-id` — lesson 4.
- PostHog is consent-gated: `providers.tsx` (`ConsentProvider` + `PostHogGate`, two belts), `consent-provider.tsx`, `consent-banner.tsx`, `lib/analytics/consent.ts` — lesson 5.
- Findings 001–008 are filled; `006-barrel-import.md` embeds before/after analyzer screenshots; the `lucide-react` barrel is fixed in-place in `next.config.ts` under `experimental.optimizePackageImports` — lessons 2, 6.
- Not yet done: `findings/SUMMARY.md` and `findings/out-of-scope.md` are still empty placeholders; the bonus findings (`009-missing-next-font.md`, `010-composite-index.md`) are optional and may be unfilled; the work is uncommitted; nothing has been graded against `solution/`.

### Exit

The audit is verified, committed, and self-graded:
- Every verify surface (Sentry dashboard, dev console, DevTools Network, PostHog dashboard, `findings/`) has been walked in order and confirmed.
- `findings/SUMMARY.md` carries the coverage count, the clause-by-clause rubric, the per-finding senior-reach detail, a personal checklist, and references both bonus findings; `findings/out-of-scope.md` records ≥1 out-of-category observation.
- The bonus findings (`009`, `010`) are written for the senior reach (`010`'s migration generated, not just named).
- The work is committed (`git commit -m "Unit 19 observability wired + audit findings"`) **before** `solution/` is opened.
- A coverage score (partial credit on rule + location) and a named backlog of out-of-scope follow-ups are recorded.

No source files under `src/` change in this lesson — the only writes are `findings/SUMMARY.md`, `findings/out-of-scope.md`, the two bonus finding files, and the git commit.

## Lesson sections

Follow the Implementation contract section list. This is a *verification* implementation lesson — the "feature" is the assembled deliverable plus the scored self-grade, so the prose carries proportionally more confirmation-and-comparison content than a feature build would.

### Goal + Finished result (intro, no header)

One sentence goal in user terms: confirm every audit goal on its surface, commit, then score the deliverable against the answer key. Then a one-paragraph description of the finished state — a committed `findings/` deliverable, a `SUMMARY.md` a senior could attach to a launch-review summary, a clause-by-clause coverage score, and a backlog with measured impact.

Surface the senior question implicitly: how do you know an audit is *done*, not just attempted? Lead with the launch-review disposition (observability closes pre-launch, performance goes to the backlog with measured impact), not the mechanics of running tests.

Use `Code` for the eventual final state of `findings/SUMMARY.md` only if shown here as a teaser — otherwise defer all code to Coding time. No diagram needed; this lesson is recipe + comparison, which prose and a `Checklist` carry better than a figure.

### Your mission (header: "Your mission")

Coherent prose paragraph, no subsection headers, no implementation hints.

**Feature(s) (user terms):** Run the full verify recipe one surface at a time to confirm every project goal, commit the work, then diff it against the `solution/` answer key to score coverage and surface the senior-reach details; assemble `findings/SUMMARY.md` as the coverage-and-evidence artifact and `findings/out-of-scope.md` as the deliberate-cuts record, and write the two bonus findings for the senior reach.

**Functional requirements** (numbered; every item tagged):
1. `[untested]` Sentry surface confirms the deliberate `/api/test/throw` lands tagged with the current release, with breadcrumbs, a readable (source-mapped) stack, and a `requestId` matching its log line.
2. `[untested]` Logger surface confirms `stripe-signature` renders `[REDACTED]`, `requestId` is a top-level field on every log line, and a webhook error's Sentry breadcrumbs hold no un-redacted signature.
3. `[untested]` PostHog surface confirms zero pre-consent `/ingest` requests, a `$pageview` after "Accept", dashboard events within 30 s, and capture stopping on "Reject".
4. `[tested]` `findings/SUMMARY.md` carries a coverage count, a clause-by-clause rubric, the per-finding senior-reach detail, a personal checklist, and references both bonus findings (next/font + composite index).
5. `[tested]` `findings/out-of-scope.md` records at least one out-of-category observation (a deliberate cut).
6. `[tested]` Bonus finding `findings/009-missing-next-font.md` names the raw-`<link>` font on the marketing layout with the rule-location-consequence-fix template.
7. `[tested]` Bonus finding `findings/010-composite-index.md` names the missing composite `(org_id, created_at)` index on `invoices`, proven with `EXPLAIN ANALYZE` (Seq Scan + in-memory sort → Index Scan), with the migration actually generated.
8. `[untested]` All eight in-scope finding files are present and filled (the floor); `006-barrel-import.md` embeds both before/after screenshots.
9. `[untested]` The work is committed before the `solution/` answer key is opened (honor system).
10. `[untested]` A coverage score (partial credit on rule + location) is recorded clause by clause against `solution/`, noting the senior-reach detail the answer key names per finding as a gap where missed.
11. `[untested]` A backlog of out-of-scope follow-ups is written: ship the waterfall / LCP-image / N+1 fixes, add the CI gate (lesson 5 of chapter 094), wire the Vercel Log Drain (lesson 4 of chapter 092) once deployed, add the `no-img-element` lint rule, add the composite-index migration.

**Constraints:** Run the recipe in order and stop on the first failure — a minified stack on the Sentry step means source-map upload is broken and the PostHog verify is pointless until fixed. The honor system holds: no peeking at `solution/` until after the commit. The most common miss is the PostHog gate's two belts — students flip only the init flag, see no pre-consent events, ship, and post-consent events never fire because the grant path never called `opt_in_capturing()`; verify both belts. Self-grading is partial credit on rule + location match — a matching rule and location with a different-but-valid fix seam (per-icon vs `optimizePackageImports`, `innerJoin` vs the relations API) is the common partial-credit pattern; the senior reach is what the answer key names. The goal is an honest score and a named backlog, not a perfect diff. `SUMMARY.md` is the coverage-and-evidence document, not a list of titles.

**Out of scope:** No new `src/` source code — this lesson verifies, commits, and grades; the only writes are the `findings/` artifacts and the git commit. Enabling the waterfall / LCP / N+1 fixes belongs to the backlog, not this lesson.

### Coding time (header: "Coding time")

One line directing the student to run the verify recipe and commit, then open the answer key and compare. The reference material is wrapped in `<details>` (collapsed by default) — framed as "read after you've run the recipe and committed."

This is not a code build, so the `<details>` holds two things, organized as they sit in the repo:

1. **The two new `findings/` artifacts** — the reference shapes of `findings/SUMMARY.md`, `findings/out-of-scope.md`, and the bonus files `findings/009-missing-next-font.md` / `findings/010-composite-index.md`. Show these as `Code` (markdown blocks). `SUMMARY.md` covers `[tested]` req 4: the coverage count (8/8 floor, 9/10 or 10/10 with bonuses), the clause-by-clause rubric, the per-finding senior-reach detail, the personal checklist, the audit cadence, and the final `pnpm next experimental-analyze` treemap pasted as secondary evidence. `out-of-scope.md` covers `[tested]` req 5. The bonus files cover `[tested]` reqs 6–7; note `010`'s migration must actually be generated (the target ships `drizzle-kit` configured) — naming the fix without generating the migration is half-credit (covers the `[untested]` senior-reach distinction).

2. **The answer-key per-finding senior-reach checklist** — the details students most often miss, as a `Checklist` or `Code`-free prose-with-`Aside` block. One line per finding (covers reqs 8/10, the manual self-grade):
   - **Finding 1** — release from `VERCEL_GIT_COMMIT_SHA ?? 'dev'`, not hardcoded; only `silent`/`org`/`project`/`widenClientFileUpload` on `withSentryConfig` (no `hideSourceMaps`, no `disableLogger`); `instrumentation.ts` exports both `register` and `onRequestError`.
   - **Finding 2** — `redact` as the single seam reused in Pino's `formatters.log` and Sentry's `beforeSend`; drop-list includes the `*_key`/`*_secret` suffix patterns and the PII keys.
   - **Finding 3** — `AsyncLocalStorage`, not module-level state; `mixin` in Pino; the `event.contexts.request.requestId` join inside `beforeSend` (context, not a tag — `requestId` is high-cardinality); `proxy.ts` writes the response header so downstream services join.
   - **Finding 4** — `opt_out_capturing_by_default: true` *and* the consent-gated dynamic import *and* the explicit `opt_in_capturing()` on grant; the session-continuity re-call on mount; `revokeAnalyticsConsent` symmetry; grant/revoke routed through the one `lib/analytics/consent.ts` seam.
   - **Finding 5** — `Promise.all` for the independent `listInvoicesWithCustomer` + `listMembers` pair only; `requireOrgUser`/`getOrganization` stay sequential; not the "wrap everything" anti-pattern.
   - **Finding 6** — `experimental.optimizePackageImports` as the senior default (not per-icon); `sideEffects: false` named for internal packages.
   - **Finding 7** — the eager-load prop (renamed from `priority` in Next.js 16) exactly once; the `no-img-element` lint rule as regression prevention; `width`/`height` as CLS protection.
   - **Finding 8** — `findMany({ with: { customer: true } })`; `.toSQL()` as verification; the composite index (bonus 10) as the secondary fix.

Close the `<details>` on the senior framing this audit teaches (covers req 11, the backlog disposition): observability gaps close before launch (they lose data) while performance gaps go to the backlog with measured impact (slow, not bleeding); the single-seam-to-lint pattern (`redact`, the `proxy.ts` request-context scope, `grantAnalyticsConsent`, `optimizePackageImports`) is the audit's positive deliverable, with findings as the bypass-call-sites and seams as the structural fix; coverage on all eight is the floor, bonuses 9 and 10 the reach; the audit-target shape is portable to every later launch review.

Forward references (one line each, as `Aside` or inline): chapter 097 wires the CI gates that catch these regressions (`@lhci/cli`, bundle-size budgets, source-map-upload verification); chapter 098 wires the Vercel Log Drain that reads this logger in production; chapter 104 reviews a seeded PR with the same disciplined-reading muscle on a code-review surface.

For Sentry/logger/PostHog/performance concepts, **link** to lessons 3–6 of this chapter and the carried lessons (1/2/3/4 of chapter 092, 3 of chapter 093, 2/3/6/7 of chapter 094, chapter 082) rather than re-explaining.

External resources (if any) appended here after the `<details>`, no header — added later by the resourcer.

### Moment of truth (header: "Moment of truth")

This lesson is itself the project's verification pass; its surfaces are every panel the chapter used. Two parts:

1. **The test command and expected pass output.** `pnpm test:lesson 7` — expected clean pass. State that this gate asserts the source-shape of `findings/SUMMARY.md` (coverage count, rubric, per-finding detail, checklist, both bonus references) and `findings/out-of-scope.md` (≥1 out-of-category observation), plus the two bonus finding files — the `[tested]` reqs 4–7. Show the pass output with `Code`.

2. **A `Checklist` of the by-hand confirmations the tests can't reach** (the `[untested]` reqs), ordered so the student runs them in sequence and ticks each off (`Checklist`/`ChecklistItem` with `untested` chips):
   - [ ] Sentry: the deliberate throw lands tagged with the current release, with breadcrumbs, a readable stack, and a `requestId` matching its log line.
   - [ ] Logger: `stripe-signature` renders `[REDACTED]`; `requestId` is a top-level field on every line; the webhook error's Sentry breadcrumbs hold no un-redacted signature.
   - [ ] PostHog: zero pre-consent requests; `$pageview` after "Accept"; dashboard events within 30 s; capture stops on "Reject".
   - [ ] Findings: eight filled files; both screenshots embedded in `findings/006-barrel-import.md`; `SUMMARY.md` carries coverage plus the analyzer treemap.
   - [ ] The work is committed before the `solution/` answer key is read.
   - [ ] Coverage is scored clause by clause against the `solution/` tree, and the backlog of follow-ups is written down.

Name the surfaces explicitly per the chapter's "each Moment of truth names one surface" convention: **Sentry dashboard**, **dev console**, **DevTools Network panel**, **PostHog dashboard**, and `findings/`.

## Scope

- Wiring Sentry / the logger seam / the PostHog gate, and writing findings 001–008 — already shipped in **lessons 3, 4, 5, 6 (and 2)**; this lesson only verifies and grades them.
- The CI gates that catch these regressions automatically (`@lhci/cli`, bundle-size budgets, source-map-upload verification) — **chapter 097**; named as a backlog item only.
- Wiring the Vercel Log Drain that reads this logger in production — **chapter 098** (carried from lesson 4 of chapter 092); named as a deploy-time backlog item only.
- Actually shipping the waterfall / LCP-image / N+1 *fixes* (this audit documents them, doesn't patch them, except the barrel) — backlog, deliberately out of scope; recorded in `out-of-scope.md`.
- The disciplined-reading code-review surface — **chapter 104**; named as a forward reference only.
