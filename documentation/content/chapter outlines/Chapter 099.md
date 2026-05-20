# Chapter 099 — Project: wire observability, audit performance

## Chapter framing

Chapter 099 closes Unit 20 by running both halves of the unit against a seeded audit target — the *wire* discipline from chapter 096 (Sentry + structured logs) and chapter 097 (PostHog with consent), and the *vigilance* discipline from chapter 098 (Core Web Vitals, bundle analyzer, RSC waterfalls, N+1, indexes). The audit target is the same fork as Unit chapter 086 with chapter 086's findings pre-fixed; this branch layers eight new findings across observability (Sentry not wired, log leak, missing correlation IDs, missing PostHog consent gate) and performance (RSC waterfall, barrel import, missing image `priority`, N+1). The deliverable is two artifacts: working observability (Sentry catches a deliberately thrown error with the correct release + source maps + breadcrumbs; PostHog records events only post-consent) and a `findings/` directory documenting the performance issues with bundle-analyzer before/after attached. The chapter ships 1 brief + 1 walkthrough + 2 wire lessons + 1 audit lesson + 1 verify lesson; the "runnable state" rule lands as "the audit target boots at the end of every lesson, and observability wiring or `findings/` files accumulate without leaving broken intermediate state."

Threads that run through every lesson. The audit is **hybrid wire-and-document** — observability findings get *fixed* (the student wires Sentry and gates PostHog), performance findings get *documented* (the student writes findings reports, not patches, except the barrel import which gets a measured fix to prove the bundle-analyzer before/after). The **rule-location-consequence-fix template from chapter 086 carries through unchanged** — every documented finding names rule, location, consequence, fix. **The audit target's running state is the diagnostic surface** — Sentry's dashboard, PostHog's dashboard, `pnpm build` First Load JS report, `@next/bundle-analyzer` HTML, and DevTools Performance traces are the artifacts the student inspects; reading source alone misses half the findings. **The single-seam-to-lint rule from chapter 086 carries through** — Sentry's `beforeSend` redactor, the structured logger's correlation-ID middleware, the consent gate around `posthog.init`, and `optimizePackageImports` are each the one place the team configures the discipline. **Self-grading is the senior reach** — the answer key publishes after the student commits, partial credit on rule + location match.

### Dependency carry-in

The audit invokes every primitive from Unit 20 plus seams from prior units.

- **From Chapter 096:** Sentry init with source maps, release tagging, breadcrumbs (lesson 1 of chapter 096); structured logs with request correlation IDs (lesson 2 of chapter 096); the 3am-rule plus PII/secrets exclusion via `beforeSend` redactor (lesson 3 of chapter 096); Vercel Log Drains as the read surface (lesson 4 of chapter 096).
- **From Chapter 097:** Vercel Speed Insights as the field-data surface (lesson 1 of chapter 097); PostHog primitives — events, feature flags, session replay (lesson 3 of chapter 097); the cookie-consent-gated init with `opt_out_capturing_by_default: true` plus `posthog.opt_in_capturing()` on consent grant (lesson 4 of chapter 097).
- **From Chapter 098:** Core Web Vitals at p75 (lesson 1 of chapter 098); `next/image` `priority` on the LCP element exactly once and `width`/`height` for CLS (lesson 2 of chapter 098); `optimizePackageImports` plus `sideEffects: false` (lesson 3 of chapter 098); `@next/bundle-analyzer` with the four scan passes (lesson 4 of chapter 098); RSC waterfall diagnosis and `Promise.all` rewrite (lesson 6 of chapter 098); N+1 at the Drizzle layer with `with: { ... }` relations (lesson 7 of chapter 098).
- **From Chapter 086:** the rule-location-consequence-fix template, the answer-key honor system, the eight-categories-as-coverage-contract framing; the consent gate finding from chapter 086 is *deliberately re-exposed* from the observability side (a missed analytics gate, not only a privacy gate).
- **From prior units:** the cookie-consent banner from lesson 5 of chapter 085 with its `consent.analytics` boolean; `authedAction(role, schema, fn)` and `tenantDb(orgId)` from chapter 061 / chapter 063; the typed `env` from lesson 5 of chapter 004 (Sentry DSN + release tag live there); the structured logger seam from lesson 2 of chapter 096 (the redactor lives there).

### Audit-target spec

A separate repo at `react-saas-course-projects/observability-perf-audit/starter/` cloned via `degit`. The target is the same fork as `error-security-audit` with chapter 086's findings pre-fixed and eight new observability and performance findings seeded on top. The target ships `@sentry/nextjs` and `posthog-js` in `package.json` with wiring deliberately absent or broken; `@next/bundle-analyzer` is in `devDependencies`. The target boots end-to-end (`pnpm install && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`); the student keeps the running app open in one tab and the source in the editor.

Sentry credentials (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) and PostHog credentials (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) are documented in `.env.example`; the brief tells the student to create free-tier accounts and paste their own values. The answer key lives in `solution/` on a `v1.0-answer-key` tag, read only after the student commits — same honor system as chapter 086.

The eight seeded findings:

**Observability (fixed by the student during the wire lessons):**

1. **Sentry not wired (lesson 1 of chapter 096).** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` missing; `next.config.ts` not wrapped with `withSentryConfig`; no source-map upload, no release tag, no breadcrumbs.
2. **Structured-log secret leak (lesson 3 of chapter 096).** `lib/logger.ts` serializes the full request body for `POST /api/billing/webhook`, including the Stripe signature header — a 3am-rule violation.
3. **Missing request correlation IDs (lesson 2 of chapter 096).** No middleware sets `x-request-id`; the logger has no `requestId` base binding; Sentry breadcrumbs and log lines for the same request can't be joined.
4. **PostHog consent gate missing (lesson 4 of chapter 097 + lesson 5 of chapter 085).** `instrumentation-client.ts` calls `posthog.init` with `opt_out_capturing_by_default: false`; the consent banner toggles a cookie but nothing reads it; events fire pre-consent.

**Performance (documented; only finding 6 is fixed in-place to produce the bundle-analyzer before/after):**

5. **RSC waterfall (lesson 6 of chapter 098).** `app/(app)/dashboard/page.tsx` awaits `getUser()` → `getOrg(user.orgId)` → `getInvoices(org.id)` → `getTeamMembers(org.id)` sequentially; `invoices` and `team` have no dependency.
6. **Barrel import of `lucide-react` (lesson 3 of chapter 098).** `app/(app)/layout.tsx` imports a dozen icons via the barrel; `next.config.ts` does not list `lucide-react` in `optimizePackageImports`; ~600 KB of icons ship.
7. **Missing `priority` on the LCP image (lesson 2 of chapter 098).** `app/(marketing)/page.tsx` renders the hero with `next/image` but no `priority`; field LCP measures ~chapter 017 s. The `@next/next/no-img-element` lint rule is missing.
8. **N+1 in the invoice list (lesson 7 of chapter 098).** `src/lib/invoices/queries.ts` runs `db.select().from(invoices)` then loops to fetch each customer with a separate query; the Drizzle relations API (`with: { customer: true }`) is the fix.

Two bonus findings the answer key acknowledges but doesn't require: (9) marketing-page font loaded via raw `<link>` instead of `next/font`; (10) missing composite `(org_id, created_at)` index on `invoices`. The brief names "8 is the floor, 10 is the senior reach."

### Reference-solution signatures

The lessons display the canonical signatures the student converges on:

- **Sentry config files** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` each calling `Sentry.init({ dsn, tracesSampleRate, release: env.SENTRY_RELEASE, beforeSend })`; `instrumentation.ts` exporting `register` and `onRequestError` per Next.js 16 docs.
- **`next.config.ts` Sentry wrapper** — `withSentryConfig(config, { silent, org, project, widenClientFileUpload: true, hideSourceMaps: true, disableLogger: true })`.
- **Env additions** — `SENTRY_DSN` (client partition), `SENTRY_AUTH_TOKEN` (server, build-only), `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` (computed from `VERCEL_GIT_COMMIT_SHA`).
- **Logger seam** — `lib/logger.ts` exports `logger` (Pino base) and `withRequestId(requestId: string)`; `proxy.ts` reads or mints `x-request-id`, stores it in an `AsyncLocalStorage` for downstream reads.
- **Redactor** — `redact(payload: unknown): unknown` in `lib/logger.ts`, wired into both Sentry's `beforeSend` and Pino's `redact` config; canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apiKey`, `*_KEY`, `*_SECRET`).
- **PostHog init seam** — `instrumentation-client.ts` calls `posthog.init(key, { api_host, opt_out_capturing_by_default: true, person_profiles: 'identified_only' })`; `lib/analytics/consent.ts` exports `grantAnalyticsConsent()` and `revokeAnalyticsConsent()` wrapping the opt-in/opt-out calls; the consent banner from lesson 5 of chapter 085 calls these on user action.
- **Finding template** — same `findings/00N-*.md` shape from chapter 086 with `Rule / Location / Consequence / Fix`; numbered placeholders for findings 1–8 plus `SUMMARY.md` and `out-of-scope.md`.

### Inspector surfaces

No custom inspector page — the running app, the Sentry dashboard, the PostHog dashboard, the `pnpm build` First Load JS report, the `@next/bundle-analyzer` HTML, and DevTools Performance traces are the observation panels. Each verify step has one named surface.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Sentry catches a deliberately thrown error with correct release tag and breadcrumbs | `/api/test/throw` (provided) throws; the Sentry dashboard shows the event tagged with `SENTRY_RELEASE` matching the current commit; breadcrumbs show the navigation crumbs; the stack trace is readable (source maps applied). |
| PostHog records a captured event only after consent is granted | DevTools Network pre-consent shows zero PostHog requests; clicking "Accept" triggers `posthog.opt_in_capturing()`; subsequent navigation produces a `$pageview` event in the PostHog dashboard within 30 s. |
| Findings report lists all eight seeded issues with location, consequence, and fix | Eight `findings/00N-*.md` files filled with rule + location + consequence + fix; the observability fix sections name the seam wired into the codebase; `findings/SUMMARY.md` lists coverage. |
| Bundle-analyzer output is attached | `findings/006-barrel-import.md` embeds `before.png` and `after.png`; the `pnpm build` First Load JS table is pasted into `SUMMARY.md` as secondary evidence. |

### Concepts demonstrated → owning lesson

- Sentry init across client/server/edge with source maps, release tagging, breadcrumbs — lesson 1 of chapter 096.
- Structured logger with request-scoped correlation IDs (Pino + `AsyncLocalStorage`) — lesson 2 of chapter 096.
- The 3am-rule and PII/secrets exclusion via a single `redact` seam reused by Sentry's `beforeSend` and Pino's `redact` — lesson 3 of chapter 096.
- Vercel Log Drains as the production read surface — lesson 4 of chapter 096.
- Vercel Speed Insights as the field-data verdict — lesson 1 of chapter 097.
- PostHog primitives — lesson 3 of chapter 097.
- PostHog gated by the cookie consent banner (`opt_out_capturing_by_default: true` plus `opt_in_capturing()` on grant) — lesson 4 of chapter 097.
- Cookie consent banner with `consent.analytics` — lesson 5 of chapter 085.
- Core Web Vitals (LCP, INP, CLS) at p75 — lesson 1 of chapter 098.
- `next/image` `priority` on the LCP element; `width`/`height` for CLS — lesson 2 of chapter 098.
- `optimizePackageImports` plus `sideEffects: false` defeating the barrel-export trap — lesson 3 of chapter 098.
- `@next/bundle-analyzer` and the four scan passes — lesson 4 of chapter 098.
- RSC waterfall diagnosis via trace; `Promise.all` rewrite; parent-child hoisting — lesson 6 of chapter 098.
- N+1 at the Drizzle layer; the relations API as the structural fix — lesson 7 of chapter 098 and lesson 2 of chapter 043.
- The rule-location-consequence-fix template and the answer-key honor system — chapter 086.

---

## Lesson 1 — Brief: eight findings, two artifacts

Frames the deliverable as working observability plus a `findings/` report against eight seeded issues, restates the rule-location-consequence-fix template, names the scope cuts and the answer-key honor system, and links the starter.

Goals:

- Frame the deliverable: the audit target ships with observability wiring missing (Sentry, structured logs, PostHog consent gate) and four performance issues planted. The student *wires* observability into a working state and *documents* the performance issues with the rule-location-consequence-fix template; the barrel import is the one performance finding fixed in-place to produce the bundle-analyzer before/after.
- State the "Done when" checks: Sentry dashboard shows the deliberate throw with release tag + breadcrumbs + readable stack; PostHog dashboard shows zero pre-consent events and the expected events post-consent; `findings/` contains four observability findings (Fix paragraph names the wired seam) plus four performance findings; `findings/006-barrel-import.md` embeds bundle-analyzer before/after screenshots; `findings/SUMMARY.md` quantifies coverage.
- Walk the eight findings list as the coverage contract: observability (1 Sentry, 2 log leak, 3 correlation IDs, 4 PostHog consent) and performance (5 RSC waterfall, 6 barrel, 7 image priority, 8 N+1). Each maps to a Unit 20 lesson ID. Bonus findings 9 (font) and 10 (composite index) are the senior reach.
- Restate the rule-location-consequence-fix template from chapter 086 and one filled example. The consequence column is user-visible or operator-visible, never "code smell."
- Name the scope cuts: not a security re-audit (chapter 086 owned that); not a re-teach of Sentry/PostHog wiring (the wire lessons install the seams, not re-explain them); not an exhaustive performance pass (the eight findings are the contract); fixes for performance findings 5, 7, 8 are out of scope (document only).
- Name the answer-key tag and honor system; name the third-party account prerequisites (free-tier Sentry org, free-tier PostHog project).
- Link the starter via `degit`; name the `/api/test/throw` route the verify step exercises.

Senior calls and watch-outs:

- The two artifacts (working observability + findings report) are read independently. A perfect findings report with broken Sentry still fails the audit; working Sentry with one missing performance finding still fails the audit.
- Coverage over depth — a short finding in every category beats a deep dive with one category silent.
- The barrel import is the only performance finding fixed in-code because the bundle-analyzer before/after is required evidence. The other performance findings get a *fix paragraph* (named seam, signature, call to remove or add), not a diff.

Codebase state at entry: empty workspace.
Codebase state at exit: target cloned, `pnpm install` clean, Postgres running, app on `:3000`; `.env.local` populated with Sentry and PostHog credentials; `findings/` created with the template, eight numbered placeholder files, `SUMMARY.md`, `out-of-scope.md`. No findings written, no observability wired.

Estimated student time: 20 to 25 minutes.

---

## Lesson 2 — Walk the target, model finding 7

Tours the eight finding clusters in the running app and source side-by-side, then writes `findings/007-missing-priority.md` end-to-end as the chapter's reference shape.

Goals:

- Walk the file tree calling out where each finding clusters: `sentry.*.config.ts` (missing, finding 1); `lib/logger.ts` (the leaking serializer, finding 2; the missing correlation ID, finding 3); `instrumentation-client.ts` (ungated PostHog, finding 4); `app/(app)/dashboard/page.tsx` (waterfall, finding 5); `app/(app)/layout.tsx` (barrel, finding 6); `app/(marketing)/page.tsx` (missing `priority`, finding 7); `src/lib/invoices/queries.ts` (N+1, finding 8).
- Read the existing seams the audit runs against: the cookie-consent banner from lesson 5 of chapter 085 (toggles `consent.analytics` already, the gate to read); `lib/env.ts` (where Sentry env vars land); `proxy.ts` (where the correlation-ID middleware will live); `authedAction`, `tenantDb`, `audit-log` (untouched, named for orientation).
- Read the running app as the second diagnostic surface. Open the dashboard with DevTools Performance — watch the four sequential `pg` queries with idle gaps (finding 5's fingerprint). Open marketing with Performance recording — LCP marker lands on the hero at ~chapter 017 s (finding 7). Open Network pre-consent and watch PostHog's `/e/` request fire on first load (finding 4). Hit `/api/test/throw` — default Next.js error page, no Sentry capture (finding 1). Tail the dev console — webhook log line includes the Stripe signature (finding 2).
- Model finding 7 (missing `priority`) end-to-end as the chapter's reference shape. Read `app/(marketing)/page.tsx`; the hero `<Image>` ships `src`, `alt`, `width`, `height` but no `priority`. Point at the LCP marker in DevTools, point at the chapter 017 s timing. Name the rule (lesson 2 of chapter 098 — `priority` on the LCP element exactly once per page). Name the location and line range. Name the consequence (LCP regression past chapter 009 s; search-ranking exposure; first-impression slow). Name the fix (add `priority` to the hero `<Image>`; add the `@next/next/no-img-element` lint rule at error). Write `findings/007-missing-priority.md` with all four sections.
- Name the audit cadence: open the running app, hold side-by-side with source, walk one finding at a time, write before moving on. For observability findings 1–4, the *fix paragraph* gets filled when the wire lesson completes — pre-write the file shells now.

Senior calls and watch-outs:

- The audit target ships findings spread so each has a distinct grep target or DevTools view. Trying to find all by reading source is the slow path; the running app surfaces three of the four observability findings in under a minute.
- Reading the consent gate from the Network panel is faster than reading source for finding 4. Network is the canonical diagnostic.
- For observability findings 1–4, the *fix* lives in the wire lessons; the finding file's "Fix" section is a paragraph naming the seam installed, not a diff.

Codebase state at entry: target running; empty findings placeholders; observability unwired.
Codebase state at exit: target unchanged; `findings/007-missing-priority.md` filled (the modeled finding); the student has navigated the running app and read the eight finding clusters. Seven placeholders empty.

Estimated student time: 35 to 45 minutes.

---

## Lesson 3 — Wire Sentry, the redactor seam, and correlation IDs

Wires Sentry across client/server/edge with source maps and release tags, builds a single `redact` seam reused in Pino and `beforeSend`, and adds a `proxy.ts` correlation-ID middleware backed by `AsyncLocalStorage`.

Goals:

- Fix observability findings 1, 2, and 3 in one lesson (they share the logger/redactor seam — separating them fragments the work). End in a state where the Sentry verify passes.
- **Finding 1 — Sentry wiring.** Run `npx @sentry/wizard@latest -i nextjs` or follow the manual setup per lesson 1 of chapter 096's reference signatures. The wizard generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `instrumentation.ts` exporting `register` and `onRequestError`. Wrap `next.config.ts` with `withSentryConfig` per the reference signature (`hideSourceMaps: true` + `widenClientFileUpload: true` + org/project/auth-token). Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` to `lib/env.ts` with correct partitions. Compute `SENTRY_RELEASE` from `process.env.VERCEL_GIT_COMMIT_SHA ?? execSync('git rev-parse HEAD')`. Restart `pnpm dev`, hit `/api/test/throw`, confirm the event lands in Sentry with the release tag and readable stack (source maps applied).
- **Finding 2 — secret leak in the logger.** Open `lib/logger.ts`. The seeded Pino instance has no `redact` and serializes the full request body. Fix per lesson 3 of chapter 096 — declare `redact` with the canonical drop-list. Refactor the redactor logic into `redact(payload)` so it's reusable. Wire the same `redact` into Sentry's `beforeSend` in `sentry.server.config.ts` — the senior anchor is "one redactor, two callers." Re-trigger the webhook flow, confirm the signature renders as `[REDACTED]` in log lines and in any Sentry event captured during the flow.
- **Finding 3 — correlation IDs.** Open `proxy.ts`. Add the correlation-ID middleware: read `x-request-id` from the incoming request, mint `crypto.randomUUID()` if absent, set the header on the response. Store it in an `AsyncLocalStorage` exported from `lib/request-context.ts`. In `lib/logger.ts`, add `mixin: () => ({ requestId: requestContext.getStore()?.requestId })`. In `sentry.server.config.ts`'s `beforeSend`, call `Sentry.setTag('requestId', requestContext.getStore()?.requestId)`. Trigger a request, find the log line with `requestId: "..."`; trigger a throw, find the Sentry event tagged with the same `requestId`.
- Fill the Fix section of `findings/001-sentry-not-wired.md`, `findings/002-log-secret-leak.md`, `findings/003-missing-correlation-id.md`. Each Fix paragraph names the seam installed and the call sites it now governs.
- Surface the Vercel Log Drain note from lesson 4 of chapter 096 as a deploy-time follow-up (not exercised locally).

Senior calls and watch-outs:

- The Sentry wizard is the fast path for the canonical setup; the manual approach is the senior fallback when defaults need tuning. The wizard's output should be *read* before committing — the student should defend every `withSentryConfig` flag.
- `tracesSampleRate` defaults to 1.0 in the wizard; for production drop to 0.1–0.2 per lesson 1 of chapter 096. The audit target keeps 1.0 for local visibility.
- The redactor is "one seam, two callers" — duplicating between `beforeSend` and `redact` is the failure mode. Refactor before wiring the second caller.
- `AsyncLocalStorage` is the load-bearing primitive for per-request context — `globalThis` or module-level state leaks across concurrent requests.
- Source-map upload requires `SENTRY_AUTH_TOKEN` at build time; if missing, stack traces stay minified in Sentry. The verify step catches this — a "line 1 column 12345" stack means the upload failed.
- The release tag must be deterministic per deploy. Computed from git SHA at build time is the senior call; "v1.0.0" hardcoded ties every error in a deployed week to the same release.

Codebase state at entry: target unchanged; finding 7 written; seven placeholders empty.
Codebase state at exit: Sentry wired end-to-end; `lib/logger.ts` redactor declared and reused in `beforeSend`; correlation-ID middleware in `proxy.ts`, `AsyncLocalStorage` in `lib/request-context.ts`, `mixin` in the logger, `setTag` in Sentry; findings 1, 2, 3 filled; the deliberate throw lands in Sentry with release + breadcrumbs + readable stack + `requestId` tag. PostHog still ungated; performance findings 5, 6, 8 untouched.

Estimated student time: 60 to 75 minutes.

---

## Lesson 4 — Gate PostHog behind the consent banner

Flips `opt_out_capturing_by_default: true`, routes accept/reject through a single `grantAnalyticsConsent`/`revokeAnalyticsConsent` seam, restores session continuity on reload, and verifies zero pre-consent network requests.

Goals:

- Fix finding 4: PostHog should fire only after consent.
- Open `instrumentation-client.ts`. The seeded `posthog.init` runs at module load with `opt_out_capturing_by_default: false`. Flip to `true` and add `person_profiles: 'identified_only'` per lesson 4 of chapter 097. With this change PostHog initializes but captures nothing until `posthog.opt_in_capturing()` is called.
- Create `lib/analytics/consent.ts` exporting `grantAnalyticsConsent()` (calls `posthog.opt_in_capturing()`, sets the `consent.analytics` cookie, captures a one-off `analytics_consent_granted` event) and `revokeAnalyticsConsent()` (calls `posthog.opt_out_capturing()`, clears the cookie). Single seam per lesson 5 of chapter 085's discipline — anything analytics-consent-related routes through these two functions.
- Open the consent banner from lesson 5 of chapter 085 (`components/consent-banner.tsx`). It toggles the `consent.analytics` cookie but does not call into PostHog. Replace the inline cookie writes with `grantAnalyticsConsent()` and `revokeAnalyticsConsent()`.
- Restore session continuity. If consent was previously granted and the page reloads, `posthog.init` ran with capture off; the app must call `posthog.opt_in_capturing()` on mount when the cookie is already present. Add the check (in the consent banner or in `instrumentation-client.ts`) reading the cookie and calling `posthog.opt_in_capturing()` if granted.
- Verify behavior. Clear cookies and localStorage. Reload `/`. DevTools Network filtered to `posthog` — zero requests. Click "Accept" — confirm one `/e/` request fires; subsequent navigation fires `$pageview`. Open PostHog dashboard, confirm events within 30 s. Click "Reject" — confirm capture stops.
- Surface bonus finding 9 if the student notices the marketing-page font loaded via raw `<link>` — same LCP-path gating discipline applies. Optional; the student writes `findings/009-missing-next-font.md` if they catch it.
- Fill the Fix section of `findings/004-posthog-consent-gate.md` naming the seam, the init flag, the runtime calls, and the session-continuity fix.

Senior calls and watch-outs:

- `opt_out_capturing_by_default: true` plus `opt_in_capturing()` on grant is the load-bearing pair. Default-out alone means PostHog never captures even with consent.
- The consent banner is the *single seam* for analytics consent — feature engineers don't reach into `posthog.opt_in_capturing()` directly. Routing through `grantAnalyticsConsent()` keeps the discipline grep-able.
- Session continuity is easily missed: explicit re-call on mount makes the wiring readable regardless of PostHog's persistence settings.
- chapter 086 had the consent finding from the *privacy* side (banner exists but nothing reads it); this lesson closes the *analytics* half (PostHog doesn't read the gate).
- "Reject" must also call `opt_out_capturing()`. A banner that only acts on "Accept" leaves capture in whatever state the default placed it.
- Session replay (named in lesson 3 of chapter 097) inherits the same gate; the student isn't enabling it here but should know the consent applies once it ships.

Codebase state at entry: Sentry wired; findings 1–3, 7 documented; PostHog ungated.
Codebase state at exit: PostHog initialized with `opt_out_capturing_by_default: true`; `lib/analytics/consent.ts` seam in place; consent banner routes through it; session continuity wired; `findings/004-posthog-consent-gate.md` filled; verify (zero pre-consent events, expected events post-consent) passes locally. Performance findings 5, 6, 8 still open.

Estimated student time: 40 to 50 minutes.

---

## Lesson 5 — Document the waterfall, N+1, and the barrel before/after

Documents findings 5, 6, and 8 with the rule-location-consequence-fix template, fixes the barrel import in-place to capture `@next/bundle-analyzer` before/after screenshots, and writes `findings/SUMMARY.md` as the coverage-and-evidence artifact.

Goals:

- Document the four remaining performance findings (5 waterfall, 6 barrel, 7 already done, 8 N+1); fix finding 6 in-place to produce bundle-analyzer before/after; write `findings/SUMMARY.md`.
- **Finding 5 — RSC waterfall.** Open Sentry's trace for the slow dashboard render (or DevTools Performance if Sentry tracing isn't producing the view locally). The trace shows four sequential spans — `getUser`, `getOrg`, `getInvoices`, `getTeamMembers`. Read `app/(app)/dashboard/page.tsx`; confirm the stacked awaits; map the dependency graph (`org` depends on `user.orgId`; `invoices` and `team` depend on `org.id`, not on each other). Name the rule (lesson 6 of chapter 098 — dependency-check before each `await`). Name the location and line range. Name the consequence (320 ms render when 240 ms was achievable; trace shows the bug to every senior). Name the fix (`Promise.all([getInvoices(org.id), getTeamMembers(org.id)])` for the parallel pair; `user` → `org` stays sequential). Write `findings/005-rsc-waterfall.md`.
- **Finding 6 — barrel import; fix in-place.** Run `ANALYZE=true pnpm build`. Screenshot the `lucide-react` chunk in the treemap (~600 KB), save as `findings/screenshots/before-barrel.png`. Open `next.config.ts`, add `experimental.optimizePackageImports: ['lucide-react']` (or non-experimental if Next.js 16 has graduated it — check release notes). Re-run `ANALYZE=true pnpm build`. Confirm `lucide-react` chunk drops to ~30 KB. Screenshot, save as `findings/screenshots/after-barrel.png`. Write `findings/006-barrel-import.md` with rule, location, consequence (~570 KB extra on every authenticated page; INP risk on slow mobile), fix (the `next.config.ts` entry plus verification commands). Embed both screenshots.
- **Finding 8 — N+1.** Open `src/lib/invoices/queries.ts`. The seeded `listInvoices` runs the base query then loops to fetch each customer with a separate query. Open Neon's slow-query log (or dev console with logging on) — confirm 1 + N queries fire. Name the rule (lesson 7 of chapter 098 — N+1 at the Drizzle layer; relations API as structural fix). Name the location. Name the consequence (1 + N queries per render; at 100 invoices, ~50 ms of avoidable round-trip; connection-pool risk). Name the fix (`db.query.invoices.findMany({ with: { customer: true } })` returns one joined query; verify with `db.toSQL()`). Write `findings/008-n-plus-1-invoices.md`.
- **Bonus finding 10 — composite index.** Run `EXPLAIN ANALYZE` against the seeded list query. The plan shows `Seq Scan on invoices` plus an in-memory sort. Name the rule (lesson 7 of chapter 098 — composite `(org_id, created_at)`), the consequence (scan grows with org size), the fix (`index('invoices_org_id_created_at_idx').on(invoices.orgId, invoices.createdAt.desc())` in Drizzle schema; generate migration; re-run `EXPLAIN ANALYZE` to confirm Index Scan). Optional; 10/10 senior reach.
- Write `findings/SUMMARY.md`. List coverage (8/8 floor, 9/10 or 10/10 with bonuses), the audit cadence (Sentry trace + DevTools + bundle analyzer + `EXPLAIN ANALYZE`), any deliberate scope cuts in `findings/out-of-scope.md`. Run `ANALYZE=true pnpm build` one last time after all changes; paste the First Load JS table as bundle-weight evidence.

Senior calls and watch-outs:

- The waterfall is invisible without the trace. The senior cadence: open the slow page in the trace view first, name the bug by reading spans, then read source to confirm. Inverting (read source first) misses bugs where the dependency *looks* present but isn't.
- The barrel fix is the only in-code performance fix because the bundle-analyzer before/after is the verification artifact. Future regressions catch with the same workflow.
- `optimizePackageImports` may have moved out of `experimental` in Next.js 16; check release notes. The seeded config accepts either.
- The N+1 fix's relations API generates the join — `db.toSQL()` is the verification. If the generated SQL still produces a per-row query, fall back to explicit `innerJoin`.
- Bonus 10 requires a migration — the audit target ships `drizzle-kit` configured. Half-credit if the fix is named but the migration isn't generated.
- `findings/SUMMARY.md` is not a bullet list of titles — it's the coverage-and-evidence document a senior attaches to a launch-review summary email.
- The audit pass does not patch findings 5, 7, 8 — fix paragraphs are the deliverable. Tempting to "just fix while I'm in the file" — the audit's contract is documentation; mixing both bloats the PR and obscures the scope.

Codebase state at entry: Sentry wired; PostHog gated; findings 1–4, 7 documented; performance findings 5, 6, 8 open.
Codebase state at exit: all eight findings written; finding 6 fixed in-code with before/after screenshots embedded; `findings/SUMMARY.md` and `findings/out-of-scope.md` written; optional bonus 9 (font) and 10 (index) written by students who reached past the floor. The target boots clean; observability fires correctly; only the barrel import is patched.

Estimated student time: 75 to 95 minutes.

---

## Lesson 6 — Verify on each surface, self-grade against the answer key

Runs the verify recipe one surface at a time (Sentry dashboard, console logs, PostHog network panel, `findings/`), commits, then diffs the work against the `v1.0-answer-key` tag to score coverage and surface senior-reach details.

Goals:

- Run the verify recipe one surface at a time and confirm each "Done when" clause.
  - **Sentry verify.** Hit `/api/test/throw`. Open the Sentry dashboard. Confirm the event landed within 60 s, tagged with the current `SENTRY_RELEASE`, with breadcrumbs showing the navigation, with a readable stack trace, with the `requestId` tag matching the dev console's log line for the same request.
  - **Logger verify.** Trigger the webhook flow. Confirm `stripe-signature` renders as `[REDACTED]` in the console. Confirm `requestId` appears as a top-level field on every log line. Confirm a thrown error inside the webhook captures a Sentry event whose breadcrumbs do *not* contain the un-redacted signature.
  - **PostHog verify.** Clear cookies and localStorage. Reload `/`. Network filtered to `posthog` — zero requests. Click "Accept" — one `/e/` request fires; next navigation fires `$pageview`. Events appear in PostHog dashboard within 30 s. Clear consent — capture stops.
  - **Findings verify.** Eight numbered files filled with rule, location, consequence, fix. `findings/006-barrel-import.md` embeds both screenshots. `findings/SUMMARY.md` lists coverage and pastes the First Load JS table.
- Commit: `git add . && git commit -m "Unit 20 observability wired + audit findings"`. Before commit, no peeking at the answer key.
- Check out the answer-key tag: `git fetch && git checkout v1.0-answer-key -- solution/`. Compare each finding clause-by-clause. The answer key names the senior-reach details students most often miss:
  - **Finding 1** — `SENTRY_RELEASE` computed from git SHA, not hardcoded; `hideSourceMaps: true`; `widenClientFileUpload: true`.
  - **Finding 2** — `redact` as the single seam reused in both `redact` and `beforeSend`; the drop-list includes wildcard patterns (`*_KEY`, `*_SECRET`).
  - **Finding 3** — `AsyncLocalStorage` (not module-level state); `mixin` in Pino; `setTag` in Sentry; `proxy.ts` writes the response header so downstream services join.
  - **Finding 4** — `opt_out_capturing_by_default: true` *and* the explicit `opt_in_capturing()` on grant; session-continuity re-call on mount; `revokeAnalyticsConsent` symmetry.
  - **Finding 5** — `Promise.all` for the parallel pair only; `user`/`org` stay sequential; not the wrong "wrap everything in `Promise.all`" anti-pattern.
  - **Finding 6** — `optimizePackageImports` as the senior default (not per-icon, which works but trades readability); `sideEffects: false` named for internal packages.
  - **Finding 7** — `priority` exactly once; the `no-img-element` lint rule as regression prevention; `width`/`height` as CLS protection layer.
  - **Finding 8** — `findMany({ with: { customer: true } })`; `db.toSQL()` as verification; composite index (bonus 10) as secondary fix.
- Walk the senior calls one last time:
  - The four observability findings get *fixed* and the four performance findings get *documented* deliberately. A senior audit produces both shapes: observability gaps close before launch (data loss); performance gaps go in the backlog with measured impact (slow, not bleeding).
  - The single-seam-to-lint pattern (`redact`, `withRequestId`, `grantAnalyticsConsent`, `optimizePackageImports`) is the audit's positive deliverable. Findings are the bypass-call-sites; seams are the structural fix.
  - Coverage on all eight is the floor; bonuses 9 and 10 are the senior reach.
  - The audit-target shape (observability + performance, rule-location-consequence-fix, bundle-analyzer before/after) is portable — the student runs this at every later launch review.
  - Follow-ups out of scope here, in scope next sprint: ship the waterfall/priority/N+1 fixes; add the CI gate from lesson 5 of chapter 098; wire the Vercel Log Drain (lesson 4 of chapter 096) once deployed; add the `no-img-element` lint rule; add the composite index migration.
- Forward references:
  - Unit chapter 101 wires CI gates that catch some of these regressions (`@lhci/cli`, bundle-size budgets, source-map upload verification).
  - Unit chapter 102 wires the Vercel Log Drain — the production read surface for the logger this chapter installed.
  - Unit chapter 108 reviews a seeded PR — same disciplined-reading muscle, code-review surface.

Senior calls and watch-outs:

- The verify recipe runs in order; failing the Sentry step means the wiring needs a fix before continuing. Don't proceed to PostHog verify if stack traces are minified — the source-map upload is broken.
- The most common partial-credit pattern: rule + location match, fix differs in seam choice (per-icon vs `optimizePackageImports`, `innerJoin` vs relations). Both valid; senior reach is what the answer key names.
- Source-map upload silently failing in CI is the most common observability regression downstream. The verify step here (readable stack on the deliberate throw) is the same check that runs in production smoke tests post-deploy.
- The PostHog gate is *two* changes: the init flag *and* the runtime opt-in. Students sometimes flip only the init flag, see no pre-consent events, ship — but post-consent events don't fire either because no one called `opt_in_capturing()`. Verify both halves.
- The bundle-analyzer before/after is the single most useful artifact from a performance audit — survives the PR description, the launch-review email, the post-mortem. Make it readable: zoom in, annotate the delta.

Codebase state at entry: target running with observability wired and finding 6 patched; all eight findings written; bonus findings optional.
Codebase state at exit: findings committed; answer-key checked out; the student has a side-by-side comparison, a scored coverage percentage, and a backlog of follow-up patches with measured impact.

Estimated student time: 30 to 45 minutes.
