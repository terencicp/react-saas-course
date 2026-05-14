# Chapter 20.4 — Project: observability and performance audit

## Chapter framing

Chapter 20.4 closes Unit 20 by running its two halves against a seeded target. Same audit-target fork as Chapter 17.3, on a `unit-20` branch where 17's eight error/security findings are pre-fixed and eight new observability+performance issues are seeded. The chapter is a **hybrid wire-it / audit-it project**: Lessons 3 and 4 *wire* Sentry and PostHog into the target (the audit can't read "Sentry not wired" if nothing is reading the throw); Lesson 5 *audits* the six performance findings the running app reveals. Deliverables: `findings/` directory (Markdown per finding, the rule-location-consequence-fix template from 17.3) + `observability/` directory with the Sentry+PostHog wiring diff + `bundle-before-after/` with two analyzer screenshots. Answer key tagged `v2.0-answer-key` publishes after the student commits. Six lessons; "runnable state" rule lands as "the target runs at the end of every lesson, and by 20.4.5 captures a real Sentry event, fires PostHog events post-consent, and has a documented bundle delta."

Threads that run through every lesson. **Half wire-it, half audit-it** — observability findings (Sentry not wired, PostHog ungated) are *fixed in place* because verification needs live wiring; performance findings (RSC waterfall, barrel, missing `priority`, N+1) are *documented*, same as 17.3. **Template is the contract** for the audit half — rule + location + consequence + fix. **Eight categories are exhaustive** — five performance (LCP image, bundle/barrel, RSC waterfall, DB N+1, consent gate gap) + three observability (Sentry not wired, log leak, missing correlation IDs); else `out-of-scope.md`. **Correlation ID is load-bearing** — every finding either is about it (observability) or references log lines keyed by it (performance). **PII discipline carries** — id and role never email; `beforeSend` redactor, Pino `redact`, PostHog `maskAllInputs` are senior diffs the student writes by hand. **Field over lab** — Speed Insights would be the truth post-launch, but the audit reads lab signal (DevTools profiler, `EXPLAIN ANALYZE`, bundle analyzer) since the target has no traffic. **Evidence over intuition** — every performance finding cites a measurement (flame graph, treemap rectangle, query plan, network timing). **Self-grading** — answer key publishes after commit; rule+location match is floor, fix match is senior reach.

### Dependency carry-in

- **From 20.1.1 (Sentry):** four-file shape (`sentry.{client,server,edge}.config.ts`, `instrumentation.ts`), `withSentryConfig` in `next.config.ts`, env entries (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`), source-map upload + client-map deletion, releases from `VERCEL_GIT_COMMIT_SHA`, breadcrumbs at the seams, `beforeSend`/`beforeBreadcrumb` as the structural PII/secret scrubber, `Sentry.setUser({ id, orgId, role })` never email, `tunnelRoute: '/monitoring'`, `tracesSampleRate: 0` first wire.
- **From 20.1.2 (structured logs + correlation IDs):** Pino with `redact` paths, `lib/observability/logger.ts` shape, AsyncLocalStorage-carrier child-logger pattern, correlation ID at the edge (`x-vercel-id` or `crypto.randomUUID()` fallback), log schema (`level`, `msg` snake_case, `correlationId`, `userId`, `orgId`, `surface`, `outcome`, shallow `data`), five log levels, "log inputs you'd want at 3am" rule, PII exclusion list.
- **From 20.1.3 (destinations):** Vercel Drains as the way off-platform, Axiom as course default, production-only by default, correlation-ID-driven search workflow, user-facing Error ID tag.
- **From 20.2.1 (Vercel Analytics):** `<Analytics />` + `<SpeedInsights />` in the root layout, no consent required (anonymized).
- **From 20.2.3 (PostHog events):** `posthog-js` + `posthog-node`, `noun_verbed` snake_case naming, `identify(userId, { plan, role })` + `group('organization', orgId)` + `reset()`, server-side `capture` after DB commit with `await posthog.flush()`, `PostHogPageView` for App Router navigation, correlation-ID property on every server-side capture.
- **From 20.2.5 (PostHog wiring + consent):** `lib/observability/posthog.ts` singleton, `components/posthog-provider.tsx` client wrapper, `useConsent()` from 17.2.5 — `opt_out_capturing_by_default: true`, `opt_in_capturing()` only after `consent.analytics`, `startSessionRecording()` only after `consent.replay`, `reset()` on withdrawal, `/ingest` reverse proxy in `next.config.ts`, `person_profiles: 'identified_only'`, session-replay `maskAllInputs: true` + `data-private` + `maskInputOptions: { password: true, email: true }`, replay sampling 10%, EU region.
- **From 20.3.1 (CWV):** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1; diagnosis lookup (LCP → image/TTFB; INP → bundle/re-renders; CLS → dimensions/font); p75-over-28-days field surface.
- **From 20.3.2 (image/font hygiene):** `priority` on the single LCP element, `sizes` for responsive, `@next/next/no-img-element` as `error`, CSS `background-image` blind spot, `next/font` CLS-free.
- **From 20.3.3 (bundle hygiene):** `@next/bundle-analyzer` via `withBundleAnalyzer`, `ANALYZE=true pnpm build`, reading client treemap by stat size, top-three rule, barrel-import bug, `optimizePackageImports` structural fix, `next/dynamic` for non-first-paint heavy.
- **From 20.3.4 (RSC waterfalls):** sequential awaits at different tree depths inflating TTFB, `Promise.all` rewrite in a component, Suspense-siblings rewrite for independent UI, `React.cache()` for shared per-request reads, dependent-data carve-out (one query at DB layer), `preload()` for late client reads, structural-fan-out reflex shared with N+1.
- **From 20.3.5 (DB performance):** four production findings (missing FK index, missing cursor composite, N+1 from `Promise.all` over parameterized query, stale stats), `EXPLAIN ANALYZE` against a Neon branch, `Index Scan` vs. `Seq Scan`, `CREATE INDEX CONCURRENTLY`, "cache is not the fix" rule.
- **From 17.2.5 (consent gate, via 17.3):** `useConsent()` as single source of truth — the seeded target has PostHog wiring *ungated*; the audit catches it.
- **From 17.3 (template + cadence):** `findings/NNN-<slug>.md` shape, `findings/SUMMARY.md` for coverage, `out-of-scope.md`, honor-system answer-key tag; rule+location load-bearing, fix is senior reach.
- **From 10.2 / 7.2:** `authedAction` wrapper from earlier units; seeded target ships it so breadcrumb / structured-log / PostHog integrations wire one seam.
- **From 6.4 / 6.3:** relational API with `with`, FK indexes, cursor composites — N+1 finding lives here.

### Audit-target spec

`react-saas-course-projects/observability-perf-audit/starter/` cloned via `degit`. Branch starts from Unit 17 target with 17's findings pre-fixed; eight new observability+performance issues layered on. Target wired for production-shape work: Next.js 16, Drizzle/Postgres, Better Auth, `authedAction`, Chapter 14 notifications, Chapter 12 Stripe webhook, Chapter 11 invoices list.

Ships with: empty `lib/observability/` (wiring is the student's job in 20.4.3 and 20.4.4); `@sentry/nextjs`, `pino`, `posthog-js`, `posthog-node`, `@next/bundle-analyzer`, `@vercel/{analytics,speed-insights}` in `package.json` at May 2026 pins; the `useConsent()` hook from 17.2.5 with a working three-button banner; pre-built `WelcomeEmail.tsx`/`ExportReadyEmail.tsx`; seeded dataset (two orgs, 50+ invoices each, 200+ comments on one invoice for the dashboard waterfall, `/pricing` with the seeded LCP image bug); `findings/` with `template.md` (from 17.3) + numbered placeholders + `out-of-scope.md`; `observability/NOTES.md` skeleton (env entries, release tag verified, consent flow verified); `bundle-before-after/README.md` with the screenshot protocol.

The eight seeded findings:

1. **Sentry not wired (observability).** No `sentry.*.config.ts`, no `instrumentation.ts`, no `withSentryConfig`, no DSN in env. `lib/admin/transferOwnership.ts` throws under `triggerSentryTest=true` — goes to generic error page, never recorded. Failure: every production exception invisible. Senior fix: the four-file shape from 20.1.1, build wrapper, `beforeSend` scrubber, `Sentry.setUser({ id, orgId, role })` at the action seam, source-map upload, release from `VERCEL_GIT_COMMIT_SHA`. **Fixed in place in 20.4.3.**
2. **Structured-log leak (observability).** `lib/billing/recordPayment.ts` `console.log({ stripeCustomer })` where the payload includes `client_secret`. Pino isn't wired in the active path; `console.log` bypasses any redactor. Failure: `client_secret` lands in platform function log, possibly exported via drain. Senior fix: replace `console.log` with the structured logger; add `client_secret`, `secret`, `api_key`, `authorization`, `cookie` to Pino `redact`; lint rule banning `console.log` in `lib/` and `app/`. Documented as finding.
3. **Missing correlation IDs (observability).** `proxy.ts` doesn't set the correlation-ID context. Server Actions/route handlers don't wrap in `AsyncLocalStorage.run`. Failure: 3am triage of any cross-surface incident is structurally impossible — one Sentry event, no joined log trail, no PostHog timeline. Senior fix: extend `proxy.ts` to read `x-vercel-id` (or generate UUID), AsyncLocalStorage carrier in `lib/observability/request-context.ts`, wrap `authedAction`/route handlers via `instrumentation.ts`, attach as Sentry tag in `beforeSend`. Documented as finding (but lived in code from 20.4.3 — see lesson goals).
4. **RSC waterfall (performance).** `app/(app)/dashboard/page.tsx` Server Component awaits `getActiveOrg()`, then child `<RevenueCard>`/`<InvoicesList>`/`<NotificationsPanel>` each await independently — four serial awaits at different tree depths. TTFB ~1.8s. Failure: LCP floor on TTFB; blank dashboard for nearly 2s. Senior fix: split into Suspense siblings (each card under its own `<Suspense>`), static dashboard shell streams in 30ms, queries resolve in parallel; `React.cache()` on `getActiveOrg()` because three children re-read it. Documented as finding (modeled in 20.4.2).
5. **Barrel import — `lucide-react` (performance).** `app/(app)/dashboard/layout.tsx` imports cleanly via `lucide-react` (correct), but a sibling component imports from `lucide-react/dist/cjs/lucide-react.js` — that path bypasses `optimizePackageImports`, full barrel lands in client bundle (~150KB parsed). Failure: every dashboard route ships extra 150KB; INP regresses on mid-tier mobile. Senior fix: remove `dist/cjs` import (legacy CJS path); verify in `@next/bundle-analyzer` (before/after screenshots committed). Documented as finding; fix applied during audit to capture screenshot pair.
6. **Missing `priority` on LCP image (performance).** `app/(marketing)/pricing/page.tsx` hero `<Image>` has no `priority`, no `sizes`; a feature illustration *does* have `priority="true"` (copy-paste error). Failure: pre-launch Lighthouse LCP 3.2s on `/pricing`. Senior fix: drop `priority` from feature illustrations, add `priority` and `sizes="100vw"` to hero, verify preload link in DevTools. Documented as finding.
7. **N+1 in relational query (performance).** `lib/queries/invoices.ts` `listInvoicesWithLastComment(orgId)` runs `db.query.invoices.findMany(...)` then `Promise.all(invoices.map(i => getLastComment(i.id)))` — 50 sequential `select` queries. Structured log shows 50+ `db_query` lines per dashboard load. Seeded target has stale-attempt to mask via `unstable_cache` wrapping `getLastComment`. Failure: 50 round trips, pool tipping under realistic concurrency. Senior fix: rewrite to relational API with `with: { lastComment: { orderBy: desc(comments.createdAt), limit: 1 } }` — one round trip with lateral join; remove `unstable_cache` because query is now fast; "cache is not the fix" rule applies. Documented as finding.
8. **PostHog ungated (observability + GDPR adjacency).** `components/posthog-provider.tsx` calls `posthog.init` with `opt_out_capturing_by_default: false`; `posthog.identify(user.email)` fires regardless of consent; `posthog.startSessionRecording()` on every authenticated mount; default `session_recording` config (every input recorded). Failure: PostHog captures pre-consent (GDPR violation); email as `distinct_id` (PII); session replay records passwords and credit-card fields in plaintext. Senior fix: rewrite per 20.2.5 — `opt_out_capturing_by_default: true`, gate `opt_in_capturing()` behind `consent.analytics`, gate `startSessionRecording()` behind `consent.replay`, `session_recording: { maskAllInputs: true, maskInputOptions: { password: true, email: true } }`, `data-private` selectors on auth form, `person_profiles: 'identified_only'`, `/ingest` reverse proxy, identify with `userId` not `email`, `reset()` on logout, `await posthog.flush()` after server-side capture. **Fixed in place in 20.4.4.**

Bonus findings answer key acknowledges: (9) missing `<SpeedInsights />` in root layout, (10) `tracesSampleRate: 1.0` in a stub `sentry.client.config.dev.ts` left on a feature branch. The brief: "8 is the floor, 10 is the senior reach."

### Reference-solution signatures

- `instrumentation.ts` calling `Sentry.init` for `nodejs`/`edge`; `sentry.client.config.ts` with `tunnelRoute: '/monitoring'`, `tracesSampleRate: 0`, `beforeSend(event, hint)`.
- `lib/observability/sentry.ts` exporting `withSentryRequestContext(handler)` and the centralized `beforeSend` scrubber.
- `lib/observability/logger.ts` exporting `baseLogger` (Pino, `redact: { paths: ['authorization', 'cookie', 'req.headers.cookie', 'user.email', 'user.phone', 'password', 'token', '*.client_secret', '*.api_key'] }`) and `getRequestLogger()`.
- `lib/observability/request-context.ts` exporting `runWithRequestContext({ correlationId, userId, orgId }, fn)` and `getCorrelationId()`.
- `lib/observability/posthog.ts` exporting `posthogServer` singleton and `capture({ distinctId, event, properties, groups })` with auto-flush.
- `components/posthog-provider.tsx` mounting `PostHogProvider` with gated `posthog.init` + consent effect.
- `components/posthog-pageview.tsx` reading `usePathname`/`useSearchParams`, firing `posthog.capture('$pageview')`.
- `next.config.ts` wrapped in `withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions)` with `/ingest/*` rewrites.
- Typed env entries in `lib/env.ts`: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `LOG_LEVEL`.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Sentry catches a deliberate throw with correct release tag and breadcrumbs | Trigger `?triggerSentryTest=true` on `/admin/transfer-ownership`; Sentry shows event within 60s with TS frames (source maps), release tag matching commit SHA, user context `{ id, orgId, role }` (no email), correlation ID as tag, breadcrumb trail of auth gate + action entry. |
| PostHog records events only after consent | Incognito + decline: Network tab shows zero `/ingest` requests. Accept analytics: `$pageview` arrives in Live Events within 5s. Sign in: `identify` fires with userId (not email), `group('organization', orgId)` set, server-side `invoice_created` shows user+org+correlationId properties. Accept replay: recording in Recordings within a minute with form inputs masked. Withdraw: next event doesn't transmit. |
| Findings report lists all eight with location + consequence + fix | Student's `findings/00N-*.md` covers 2, 3, 4, 5, 6, 7 (audit half) with full template; findings 1 and 8 evidenced by committed wiring (Sentry capture screenshot + PostHog consent screenshot in `observability/NOTES.md`). |
| Bundle-analyzer output attached | `bundle-before-after/before.png` shows dashboard chunk with full `lucide-react` barrel (~150KB rectangle); `after.png` shows same chunk post-fix (~5KB for icons actually used); both committed. |
| Findings match seeded list | After commit, check out `v2.0-answer-key`, side-by-side compare: rule match, location match, consequence match, fix match — partial credit for rule+location correct, fix differs; bonus findings 9 and 10 are senior reach. |

### Concepts demonstrated → owning lesson

- Sentry four-file shape, `withSentryConfig`, env, `beforeSend` redactor — 20.1.1.
- Releases from `VERCEL_GIT_COMMIT_SHA`, source-map upload + client-map deletion — 20.1.1.
- Breadcrumbs at the seams, `Sentry.setUser({ id, orgId, role })` — 20.1.1.
- `tunnelRoute: '/monitoring'` for ad-blocker bypass — 20.1.1.
- Pino structured logging with `redact`, AsyncLocalStorage child-logger — 20.1.2.
- Correlation ID joining Sentry, logs, PostHog — 20.1.2, 20.1.3.
- Log schema and "log inputs you'd want at 3am" rule — 20.1.2.
- Vercel Drains destination pipeline (named) — 20.1.3.
- Vercel Analytics / Speed Insights mount — 20.2.1.
- PostHog SDKs, event model (`noun_verbed`, flat properties) — 20.2.3.
- `identify` / `group` / `reset` lifecycle — 20.2.3.
- Server-side capture after DB commit with `flush()` — 20.2.3.
- `PostHogPageView` for App Router navigation — 20.2.3, 20.2.5.
- Consent-gated `posthog.init` + `useConsent()` integration — 20.2.5, 17.2.5.
- `/ingest` reverse proxy via Next.js rewrites — 20.2.5.
- Session-replay configuration (mask + sampling) — 20.2.5.
- Three Core Web Vitals, thresholds, diagnosis lookup — 20.3.1.
- `next/image` `priority` for single LCP element, `sizes` — 20.3.2.
- "Never raw `<img>`" via `@next/next/no-img-element` — 20.3.2.
- Barrel imports, `optimizePackageImports`, per-file fallback — 20.3.3.
- `@next/bundle-analyzer`, reading treemap, top-three rule — 20.3.3.
- RSC waterfalls, Suspense-siblings, `Promise.all`, `React.cache()` — 20.3.4.
- Structural-fan-out reflex shared across RSC waterfall and N+1 — 20.3.4, 20.3.5.
- Four production database findings + diagnostic flow — 20.3.5.
- "Cache is not the fix" — 20.3.5.
- Pre-launch Lighthouse (referenced, not exercised on localhost) — 20.3.6.

---

## Lesson 20.4.1 — Project brief

Goals:

- Frame the deliverables. Half wire-it (Sentry + PostHog go live), half audit-it (six performance findings documented in the rule-location-consequence-fix template). Two surfaces: `observability/` (wiring diff + `NOTES.md` capturing the verified flow) and `findings/` (six finding files + `SUMMARY.md` + the `bundle-before-after/` screenshot pair).
- State the "Done when": Sentry catches a deliberate throw with right release tag + breadcrumbs + user context + correlation ID; PostHog records only after consent and with `userId` not email; six finding files cover the audit categories; bundle screenshots show the barrel delta; report self-grades against the answer-key tag.
- Walk the eight audit categories. Observability: (1) Sentry not wired, (2) log leak, (3) missing correlation IDs, (8) PostHog ungated. Performance: (4) RSC waterfall, (5) barrel import, (6) missing `priority`, (7) N+1. Findings 1 and 8 fixed in place; the rest documented.
- Frame the hybrid shape vs. 17.3. The audit-only shape doesn't work for observability — "Sentry not wired" can't be verified by reading code. So lessons 3 and 4 wire it; lesson 5 audits the read-only performance surface.
- Show the rule-location-consequence-fix template (carried from 17.3) and the modeled example. Consequence column: observability findings name the next 3am incident the team can't triage; performance findings name the next user the slowness costs.
- Scope cuts: not Sentry tracing/RUM (deferred); not Speed Insights p75 reading (target has no traffic — DevTools/`EXPLAIN ANALYZE`/bundle analyzer are evidence sources); not Lighthouse-CI wiring (Chapter 21.2); not the destination pipeline beyond mentioning Drains; not architecture-level rewrites.
- Senior payoff: the wire-it muscle memory + the audit-it muscle memory. Same template, same evidence sources (Sentry panel, PostHog Live Events, bundle treemap, `EXPLAIN ANALYZE`, RSC profile, DevTools network), same correlation-ID triage workflow.
- Answer-key contract: `v2.0-answer-key` documented; honor system, no peeking until committed.
- Relationship to 17.3: same fork, different branch. Unit 17 findings pre-fixed on `unit-20`. The one carry-over is the consent gate — finding 8 catches its absence on the PostHog provider.
- Show one screenshot of `/admin/transfer-ownership?triggerSentryTest=true` (currently a generic error page) and an empty Sentry dashboard so the student sees the gap they're closing.
- Link the starter via `degit react-saas-course-projects/observability-perf-audit/starter#main`; name the answer-key tag.

Senior calls and watch-outs:

- Top-down: eight categories first, one finding per, then iterate to depth. Inverting runs the depth-on-one-silence-on-another trap.
- The wire-it half is *not* polish — every line of Sentry config and every flag in `posthog.init` is a senior diff that ships PII discipline, GDPR posture, and correlation-ID joining.
- Bundle-analyzer screenshots are evidence in `findings/005-*.md`'s fix section, not decoration.
- Consequence column reads at a launch review by someone on-call this weekend.

Codebase state at entry: empty repo (run `degit`).
Codebase state at exit: target cloned, `pnpm install` clean, Docker Postgres up, `pnpm db:migrate && pnpm db:seed && pnpm dev` runs on `:3000`; `findings/` placeholders inspected; `observability/NOTES.md` opened. Nothing written yet. Student can navigate `/admin/transfer-ownership?triggerSentryTest=true` and watch the generic error page with nothing observable.

Estimated student time: 20 to 25 minutes.

---

## Lesson 20.4.2 — Audit-target walkthrough and one modeled finding

Goals:

- Walk the file tree. Wire-it clusters: `lib/observability/` (empty — finding 1) and `components/posthog-provider.tsx` (finding 8). Audit clusters: `lib/billing/recordPayment.ts` (finding 2), `proxy.ts` + missing `lib/observability/request-context.ts` (finding 3), `app/(app)/dashboard/page.tsx` and children (finding 4), `app/(app)/dashboard/_components/icon-strip.tsx` with `lucide-react/dist/cjs` import (finding 5), `app/(marketing)/pricing/page.tsx` (finding 6), `lib/queries/invoices.ts` (finding 7).
- Read existing helpers the audit integrates with: `lib/authed-action.ts` (breadcrumb / log / capture seam), `lib/env.ts` (new entries land here), `proxy.ts` (where the correlation ID will be born), `app/error.tsx` and `app/global-error.tsx` (user-facing Error ID).
- Read the running app's evidence sources. Open DevTools, navigate `/dashboard`, Network tab — TTFB ~1.8s; Performance tab records four sequential server-time bars (finding 4 fingerprint). Curl `/admin/transfer-ownership?triggerSentryTest=true` — 500 with no `sentry-trace` header (finding 1). Open PostHog dashboard — events fire on first page view pre-consent (finding 8). Grep `lucide-react` — `dist/cjs` import jumps out (finding 5). Teaches the running-app-as-evidence-source rhythm.
- Run `ANALYZE=true pnpm build` once for `before` screenshot — opens three treemap HTMLs; dashboard chunk shows `lucide-react` as the largest rectangle at ~150KB. Save to `bundle-before-after/before.png`. **Measure first, fix later in 20.4.5.**
- Model finding 4 (the RSC waterfall) end-to-end. Open `app/(app)/dashboard/page.tsx`, read the structure (top-level `await getActiveOrg()`, three child Server Components each independently awaiting). Performance recording shows four serial server-time bars. Quote failure mode (blank dashboard for 1.8s; LCP floor at TTFB). Rule (20.3.4). Fix in template: Suspense siblings under `<Suspense fallback={<CardSkeleton />}>`, `React.cache()` on `getActiveOrg()` because three children re-read it, structural-fan-out reflex (same shape as N+1 in finding 7). Write `findings/004-rsc-waterfall.md` with all four sections.
- Audit cadence: open running app + source side-by-side, walk one category at a time, write the finding before moving on. The wire-it lessons interrupt the cadence on purpose so the audit half lands on a real-Sentry, real-PostHog target.

Senior calls and watch-outs:

- A finding without a screenshot / curl output / query plan / treemap rectangle is "code-review opinion." Every *location* section names the evidence command.
- Finding 4 is the freebie — write it before tackling the rest.
- The "before" bundle screenshot is the *first* action — measuring before fixing is the senior reflex.
- The dashboard flame graph is read in server-time mode (dark blue bars), not React render trace. Waterfall is on the server.

Codebase state at entry: target cloned and running; empty findings.
Codebase state at exit: target unchanged; `findings/004-rsc-waterfall.md` filled; `bundle-before-after/before.png` captured and committed. Five audit-half placeholders remain empty (002, 003, 005, 006, 007).

Estimated student time: 45 to 55 minutes.

---

## Lesson 20.4.3 — Wire Sentry, the structured logger, and the correlation ID

Goals:

- Wire the Sentry surface end-to-end so finding 1 is verified by a real captured event. Mechanical lesson: four-file shape, env entries, build wrapper, `beforeSend` redactor, `withSentryRequestContext` at the action seam. Verification is the seeded `?triggerSentryTest=true` throw producing the canonical event.
- **Four-file shape from 20.1.1.** Create `sentry.{client,server,edge}.config.ts` and `instrumentation.ts`. Wizard (`pnpm dlx @sentry/wizard@latest -i nextjs`) writes the skeleton; senior diff is everything after. Each calls `Sentry.init({ dsn, environment: process.env.VERCEL_ENV ?? 'development', release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local', tracesSampleRate: 0, beforeSend, beforeBreadcrumb })`. Client adds `tunnelRoute: '/monitoring'` and `integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })]` (Sentry replay configured but sample rate stays 0 — PostHog owns replay).
- **`beforeSend`/`beforeBreadcrumb` — centralized scrubber.** Pull both from `lib/observability/sentry.ts` running every event through the PII/secret redactor (same logic landing in finding 2's fix). Drop `Authorization`/`Cookie`, redact `email`/`phone`/`address`, remove secret-shaped patterns (`sk_*`, `rk_*`, JWT-like, `client_secret`).
- **Build wrapper.** `withSentryConfig(nextConfig, { org, project, authToken, silent: !process.env.CI, widenClientFileUpload: true, hideSourceMaps: true, disableLogger: true, tunnelRoute: '/monitoring' })`. Composes with `withBundleAnalyzer` later. Walk each option: `hideSourceMaps` deletes client `.map` files after upload (no IP leak); `widenClientFileUpload` catches files default pattern misses; `disableLogger` strips Sentry's internal `logger.*`.
- **Env entries.** Add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to `lib/env.ts` (typed via `@t3-oss/env-nextjs`); auth token server-only. Update `.env.example` with names only. Student provides their own Sentry project (free tier).
- **`withSentryRequestContext` at the action seam.** Helper in `lib/observability/sentry.ts` runs at action / route-handler boundary: `Sentry.setUser({ id: userId, orgId, role })`, `Sentry.setTag('correlationId', correlationId)`, `Sentry.setTag('surface', surface)`. Edit `lib/authed-action.ts` to call it inside resolved context. One seam, every action gets context.
- **Breadcrumbs at the seams.** `Sentry.addBreadcrumb({ category: 'auth', message: 'requireRole_passed', level: 'info', data: { role } })` inside `requireRole`; `action_entered` inside the action wrapper; webhook accept and notification dispatch as senior-reach seams.
- **Correlation ID — the wire-up.** Create `lib/observability/request-context.ts` exporting `AsyncLocalStorage<RequestContext>`, `runWithRequestContext({ correlationId, userId, orgId, surface }, fn)`, `getCorrelationId()`. Extend `proxy.ts` to read `x-vercel-id` (or generate `crypto.randomUUID()`), set `x-correlation-id` request header. Wire `instrumentation.ts` to wrap incoming requests in `runWithRequestContext`. Wire `withSentryRequestContext` to read `getCorrelationId()` and attach as tag. **This is finding 3's fix lived in code** — the audit half documents the gap as a finding; this lesson closes it as a precondition.
- **Pino logger — first wire.** Create `lib/observability/logger.ts` with `baseLogger` per 20.1.2 (redact paths from the scrubber, formatters, `level: env.LOG_LEVEL ?? 'info'`). Export `getRequestLogger()` that creates a child logger pinned to AsyncLocalStorage context. Logger wired here because finding 2 needs the replacement to exist; the audit still documents the finding because the seeded `console.log` is the bug shape to recognize.
- **User-facing Error ID.** Edit `app/error.tsx` and `app/global-error.tsx` to render the `digest` prop (Next.js exposes the Sentry event id as `digest`) as a small monospace tag (`Error ID: {digest}`). Support copies the ID; engineering pastes it into Sentry search.
- **Verification.** Hit `/admin/transfer-ownership?triggerSentryTest=true` as seeded admin; throw fires; error page shows `Error ID: abc123`. In Sentry within 60s: event with TS stack frames (source maps uploaded — file is `lib/admin/transferOwnership.ts:42` not `chunks/a8f3e2c1.js:1:24091`), release tag matches commit SHA, user context shows `{ id, orgId, role }` (no email), correlation ID is a tag matching the dev-terminal log line, breadcrumb trail shows `requireRole_passed` and `action_entered`. Screenshot the panel into `observability/NOTES.md`.
- **Not wired this lesson.** Sentry tracing (`tracesSampleRate: 0`), session replay (stays 0 — PostHog owns it in 20.4.4), no alert rules.

Senior calls and watch-outs:

- Wizard is the start, not the answer. Every flag (`tracesSampleRate`, `beforeSend`, `tunnelRoute`, `hideSourceMaps`) is a senior decision.
- `beforeSend` scrubber is *structural* enforcement of the 17.2.4 PII rule. A `Sentry.setUser({ email })` somewhere is now silently scrubbed — alert if scrubber matches, because the right fix is never set the email.
- Correlation ID work does double duty: wires finding 3's fix in code (audit still documents) and is the precondition for PostHog's correlation-ID property in 20.4.4.
- `Error ID` rendering closes the 20.1.3 triage loop — without it, user can't tell support what to search for.
- Don't commit `SENTRY_AUTH_TOKEN` to `.env.example` — only names.

Codebase state at entry: target with finding 4 documented and `before.png` captured; no Sentry, no logger, no correlation ID.
Codebase state at exit: target running with Sentry capturing exceptions (verified by seeded throw landing with TS frames, release tag, correlation-ID tag, user context, breadcrumbs); `lib/observability/{sentry,logger,request-context}.ts` written; `proxy.ts` + `instrumentation.ts` extended; `authedAction` extended with breadcrumb + Sentry context; `app/error.tsx` and `app/global-error.tsx` render Error ID; `observability/NOTES.md` has env entries, Sentry screenshot, verified release tag and correlation ID. Logger wired but not yet exercised (finding 2's audit pending).

Estimated student time: 75 to 90 minutes.

---

## Lesson 20.4.4 — Wire PostHog with the consent gate and the safe replay defaults

Goals:

- Rewrite the seeded PostHog provider so events fire only after consent, replay records with masking on, and `useConsent()` owns every non-essential call. Closes finding 8 in place; the audit half doesn't document it separately because the wiring *is* the evidence.
- **Read the seeded provider first** — `components/posthog-provider.tsx` as shipped does five things wrong (no consent default, `identify(user.email)`, `startSessionRecording()` on every authenticated mount, default `session_recording` config, no consent integration). Senior shape lands in contrast.
- **`lib/observability/posthog.ts` server singleton.** Export `posthogServer` (`PostHogClient` initialized once with `env.NEXT_PUBLIC_POSTHOG_KEY`, EU host, `flushAt: 1`). Export `capture(...)` calling then `await posthogServer.flush()`. Correlation ID from `getCorrelationId()` attaches as a property on every event.
- **Rewritten `components/posthog-provider.tsx`.** `'use client'`, mounts `PostHogProvider`, calls `posthog.init` with May 2026 defaults from 20.2.5: `api_host: '/ingest'`, `ui_host: 'https://eu.posthog.com'`, `capture_pageview: false`, `autocapture: true`, `persistence: 'localStorage+cookie'`, `opt_out_capturing_by_default: true`, `disable_session_recording: true`, `person_profiles: 'identified_only'`, `session_recording: { maskAllInputs: true, maskTextSelector: '[data-private]', maskInputOptions: { password: true, email: true } }`. `useEffect` on `consent.analytics`: true → `opt_in_capturing()`, false → `opt_out_capturing()` + `reset()`. Second `useEffect` on `consent.replay`: true (and analytics true) → `startSessionRecording()`, false → `stopSessionRecording()`. Provider takes `userId`/`orgId`/`role` as server-resolved props — identify once after init.
- **`/ingest` reverse proxy.** Rewrites in `next.config.ts`: `/ingest/static/:path*` → `https://eu-assets.i.posthog.com/static/:path*`, `/ingest/:path*` → `https://eu.i.posthog.com/:path*`, `/ingest/decide` → `https://eu.i.posthog.com/decide`. Note 20.2.5's bandwidth trade-off.
- **`components/posthog-pageview.tsx`.** Reads `usePathname`/`useSearchParams`, fires `posthog.capture('$pageview', { $current_url })` on change. Mounted once under `PostHogProvider`.
- **Root-layout wiring.** Edit `app/layout.tsx` to resolve session in RSC, pass `{ userId, orgId, role }` to `PostHogProvider`, mount `PostHogPageView`. Add `<Analytics />` + `<SpeedInsights />` (closes bonus finding 9).
- **Server-side capture into `authedAction`.** Edit wrapper to accept optional `analyticsEvent?: string`; on commit, call `capture({ distinctId: userId, event: analyticsEvent, properties: { orgId, correlationId: getCorrelationId(), surface }, groups: { organization: orgId } })`. One line per action: `authedAction({ ..., analyticsEvent: 'invoice_created' }, ...)`.
- **PII at identify.** Provider's `useEffect` calls `posthog.identify(userId, { plan, role, signupSource })` — never email, never name. Contrast: seeded version used email; rewrite uses userId. GDPR data-subject deletion maps trivially (one `distinct_id` per user).
- **Signout integration.** Edit the Chapter 9 signout handler to call `posthog.reset()` after session cleared.
- **Env entries.** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `/ingest`), `POSTHOG_PROJECT_ID` (named, not used). Update `lib/env.ts` and `.env.example`.
- **Verification.** Incognito. Decline consent: Network tab, filter `/ingest`, zero requests. Accept analytics: `$pageview` in Live Events within 5s with anonymous `distinctId`. Sign in: stitch to user, identify shows userId (not email), `organization` group set. Trigger `invoice_created` from dashboard: server-side event with `userId`, `orgId`, `correlationId`, `surface` — correlation ID matches dev terminal log and (if breadcrumb fires) Sentry trail. Three surfaces, one ID. Accept replay: next session starts recording with `data-private` selector applied to auth form's password field. Withdraw: events stop. Screenshot Live Events + masked replay into `observability/NOTES.md`.
- **Bonus pickup — Speed Insights.** Adding `<SpeedInsights />` is one line. Bonus finding 9 closes here if the student notices.

Senior calls and watch-outs:

- PostHog `init` config is twelve flags long; every flag is a senior decision. Wizard defaults are all wrong for a GDPR-respecting SaaS.
- `data-private` selector is the *static* PII surface; `maskAllInputs: true` is the *dynamic* PII safety net. Both run; either alone leaks.
- `posthog.reset()` on logout matters more than docs suggest — on shared devices, identity bleed is a real GDPR exposure.
- Correlation ID on server-side captures is the load-bearing thread for cross-surface triage.
- Don't accept consent in dev and forget — re-test the incognito decline path every provider change.

Codebase state at entry: Sentry wired and verified; seeded PostHog provider wrong; structured logger written; finding 4 documented.
Codebase state at exit: `lib/observability/posthog.ts` written; `components/posthog-provider.tsx` rewritten; `components/posthog-pageview.tsx` added; root layout mounts provider + page-view + `<Analytics />` + `<SpeedInsights />`; `next.config.ts` has `/ingest` rewrites; `authedAction` fires server-side captures; signout calls `reset()`; env entries added; full consent flow verified end-to-end and screenshotted into `observability/NOTES.md`. Target now has both observability surfaces live, correlation ID joining them.

Estimated student time: 75 to 90 minutes.

---

## Lesson 20.4.5 — Audit the performance findings

Goals:

- Walk the five remaining performance categories plus finding 2 (log leak — gets written here because the audit *report* covers it). Six findings this lesson. Same rhythm as 17.3: a documented evidence command per category, write the finding, running app + source side-by-side.
- **Finding 2 — log leak `client_secret`.** Open `lib/billing/recordPayment.ts`. Grep `console\.log\|console\.info\|console\.warn\|console\.error` across `lib/`/`app/` — seeded leak is the hit. Trace Stripe API response; confirm `client_secret` top-level. Write `findings/002-log-leak-client-secret.md`: rule (20.1.2 + 17.2.4), location, consequence (`client_secret` lands in platform log, retained, possibly exported — could re-authorize Stripe operation), fix (replace `console.log` with `getRequestLogger().info({ msg: 'payment_recorded', userId, orgId, paymentId, amount_cents })`, add `client_secret`/`api_key`/`*.client_secret` to Pino `redact`, lint rule banning `console.log` in `lib/`/`app/`).
- **Finding 3 — missing correlation IDs (audit version).** Even though 20.4.3 wired the fix, the audit *documents the gap* and what it would have cost. Trace one historic Sentry event via `git log -p` against `proxy.ts` pre-wire. Write `findings/003-missing-correlation-id.md`: rule (20.1.2), location (`proxy.ts` line range, missing `request-context.ts`), consequence (3am triage structurally impossible), fix (the AsyncLocalStorage carrier from 20.4.3, the Sentry tag attachment, the PostHog property attachment — three integrations). Explicitly retroactive documentation.
- **Finding 4 — RSC waterfall (modeled in 20.4.2).** Re-confirm; if depth was added during walkthrough, revise body. No new evidence.
- **Finding 5 — barrel import.** Open `app/(app)/dashboard/layout.tsx` (clean import) and `app/(app)/dashboard/_components/icon-strip.tsx` (the `dist/cjs` import — wrong path). Confirm `next.config.ts`'s `optimizePackageImports` includes `lucide-react` (Next.js 16 default). Apply the fix in code, run `ANALYZE=true pnpm build` — dashboard chunk shrinks from ~480KB to ~330KB; save `bundle-before-after/after.png`. Write `findings/005-barrel-import-lucide.md`: rule (20.3.3), location (the `dist/cjs` import), consequence (extra 150KB per dashboard route, INP regression on mid-tier mobile ~80-120ms), fix (delete the `dist/cjs` import, use standard `lucide-react` + `optimizePackageImports`, attach both treemap screenshots, document `next-bundle-stats` CI gate as senior follow-up). Fix is applied so the screenshot pair can be captured.
- **Finding 6 — missing `priority` on LCP image.** Open `/pricing` in browser, DevTools > Performance Insights — LCP element selector points at hero. Open `app/(marketing)/pricing/page.tsx` — hero `<Image>` has no `priority`/no `sizes`; first feature `<Image>` has `priority="true"` (copy-paste error). View source — `<link rel="preload">` exists for feature illustration, not hero. Write `findings/006-priority-lcp-image.md`: rule (20.3.2 — `priority` on single LCP element, never on multiple), location, consequence (LCP 3.2s on mobile, would hit Speed Insights yellow post-launch, conversion damage on marketing top-of-funnel), fix (drop `priority` from features, add `priority` + `sizes="100vw"` to hero, verify preload link in DevTools, document `@next/next/no-img-element` as `error`). Optional: re-run Lighthouse on `/pricing` for LCP-improvement screenshot.
- **Finding 7 — N+1 in relational query.** Open `lib/queries/invoices.ts` — read `listInvoicesWithLastComment`. Pull structured-log line for one dashboard load — 51 `db_query` events with same shape `select * from comments where invoiceId = $1 order by createdAt desc limit 1`. Run `EXPLAIN ANALYZE` on one against the Neon dev branch — plan shows `Index Scan` on FK index (per-query plan fine; bug is the count). Confirm seeded `unstable_cache` attempt. Write `findings/007-n-plus-one-comments.md`: rule (20.3.5 + 20.3.4 + "cache is not the fix"), location (the `Promise.all(invoices.map(...))` shape), consequence (50 round trips per load, pool tipping under realistic concurrency, latency p95 spikes, `unstable_cache` masks hits while cold misses pay full cost), fix (Drizzle relational API with `with: { lastComment: { orderBy: desc(comments.createdAt), limit: 1 } }` — one round trip with lateral join; remove `unstable_cache`; document before/after `EXPLAIN ANALYZE` plans).
- **Bonus findings.** (9) Missing `<SpeedInsights />` — closed in 20.4.4 if added; documented here for credit. (10) `tracesSampleRate: 1.0` in stub `sentry.client.config.dev.ts` left on a feature branch. Brief: "8 is the floor, 10 is the senior reach."
- **Audit summary.** Six findings written (002, 003, 004, 005, 006, 007); plus any bonus; evidence commands documented (greps, plans, screenshots, DevTools panels); call sites named; `before.png` + `after.png` committed.

Senior calls and watch-outs:

- The audit half is read-only on the *documentation* surface — but five of six findings apply the fix during the audit (barrel for bundle delta, `priority` for LCP delta, N+1 for plan delta, `console.log` to verify redactor, correlation ID retroactively). The 17.3 strict no-patch rule loosens because *the evidence is the fix's effect on measurements*. Git history captures the diff; findings document explains why.
- Finding 3 is the trickiest because the fix is already in code. Senior framing: the audit is *about the rule and the consequence*, not the diff.
- Finding 7's `cache is not the fix` — the seeded `unstable_cache` is the wrong reach a prior developer made. The fix names removing the wrapper because the query is fast on its own; leaving it leaves a stale layer the team will trip on.
- Bundle-analyzer fix applied during audit specifically so before/after can be captured. Screenshots are load-bearing proof.
- LCP fix on `/pricing` similarly applied to capture Lighthouse before/after.
- Finding 2 grep finds it; senior reflex bans `console.log` in `lib/`/`app/` via lint rule.

Codebase state at entry: target with Sentry + PostHog + logger wired; finding 4 documented; placeholders 002, 003, 005, 006, 007 open; `before.png` from 20.4.2.
Codebase state at exit: six findings written (002, 003, 004, 005, 006, 007); optional bonus (009, 010) by students reaching past the floor; `findings/SUMMARY.md` lists coverage and any deliberate misses; `bundle-before-after/after.png` captured and committed; in-place fixes from the audit (barrel, `priority`, N+1, `console.log`) committed in a `fix/` series so git diff shows the audit's effect. Ready to self-grade in 20.4.6.

Estimated student time: 90 to 110 minutes.

---

## Lesson 20.4.6 — Verify, self-grade, and forward references

Goals:

- Commit everything: `git add findings/ observability/ bundle-before-after/ fix/ && git commit -m "Unit 20 audit"`. Commit is the irreversible step — once committed, look at the answer key.
- Check out the answer-key tag: `git fetch && git checkout v2.0-answer-key -- solution/`. Side-by-side diff is the comparison.
- **Verify the wire-it half end-to-end.** Re-run from 20.4.3/20.4.4 against committed state:
  - **Sentry capture.** Hit the seeded throw. Verify TS frames, release tag, user context (no email), correlation-ID tag, breadcrumb trail. Compare screenshot to answer-key reference.
  - **PostHog consent flow.** Incognito + decline: no `/ingest`. Accept analytics: `$pageview` with anonymous distinctId. Sign in: identify with userId (not email), org group set. Trigger action: server-side event with correlationId. Accept replay: recording with form-input masking. Withdraw: events stop.
  - **Correlation-ID joining.** Pull one Sentry event's correlationId tag, grep dev-terminal logs for it, filter PostHog events — three surfaces, one trail.
- **Walk every finding clause-by-clause:**
  - **Finding 2 (log leak).** Rule (20.1.2 + 17.2.4) — match. Location — match. Consequence — names leaked secret class and retention path. Fix — answer key names `getRequestLogger().info` replacement + redact-path addition + lint rule; students missing the lint rule lose senior reach.
  - **Finding 3 (correlation ID).** Answer key cites 20.1.2; fix names AsyncLocalStorage carrier + Sentry tag + PostHog property — three integrations. One integration only is partial credit.
  - **Finding 4 (RSC waterfall).** Answer key names Suspense-siblings *and* `React.cache()` on `getActiveOrg`. Missing the cache piece is partial.
  - **Finding 5 (barrel import).** Answer key names removing `dist/cjs` + screenshot pair + `next-bundle-stats` CI gate. Screenshots are load-bearing.
  - **Finding 6 (LCP image).** Answer key names *both* dropping `priority` from features and adding to hero. Adding only to hero misses the bandwidth-split fix.
  - **Finding 7 (N+1).** Answer key names relational rewrite + removing `unstable_cache` + before/after `EXPLAIN ANALYZE`. Missing the cache removal misses "cache is not the fix."
- Score bonus findings if written. Senior reach 10/10; floor 8/8.
- **Senior calls one more time:**
  - Two halves are different shapes — wire-it for observability (audit verifies captured event / consent / correlation trail), audit-it for performance (document rule, consequence, fix's evidence).
  - Correlation ID carries from `proxy.ts` through every Sentry event, every log line, every PostHog event. 3am triage only works because of it.
  - PII discipline is structural — `beforeSend` in Sentry, `redact` in Pino, `maskAllInputs` in PostHog. Three mechanisms, one rule from 17.2.4.
  - Evidence sources are real — flame graph, treemap, `EXPLAIN ANALYZE`, Lighthouse run, network timing. "I think this is faster" doesn't pass.
  - Bundle before/after screenshots are the project's most portable artifact.
  - Coverage on all eight is the floor; depth on any one is the senior reach.
- **Forward references:**
  - Unit 21.2 wires `pnpm test:e2e` and `pnpm build` into CI; bundle-size budgets land as CI gate.
  - Unit 21.3 ships production scoping making `release` from `VERCEL_GIT_COMMIT_SHA` real; Speed Insights p75 starts populating.
  - Unit 21.3.9 launch checklist references this audit's deliverables.
  - Unit 22.4 reviews a PR for the same target — disciplined-reading muscle carries.
  - Chapters 17.3 and 20.4 together are the full launch-review pass — error/security + observability/performance.

Senior calls and watch-outs:

- Self-grading is the rehearsal. A real audit has no answer key.
- Missed findings are *the next audit's lesson* — update the personal checklist.
- Wire-it verification is demonstrably-runnable, not paper-checked. If seeded throw doesn't land in Sentry, re-read the four-file shape + `withSentryConfig` options. If consent decline still ships events, re-read `opt_out_capturing_by_default` and the consent `useEffect`.
- Audit half partial-credit pattern (rule+location match, fix differs) is the most common outcome. Rule is load-bearing.

Codebase state at entry: all six findings written; wire-it diff in `lib/observability/`, `components/`, `proxy.ts`, `instrumentation.ts`, `next.config.ts`, `app/layout.tsx`, `app/error.tsx`, `app/global-error.tsx`, `lib/authed-action.ts`; `observability/NOTES.md` with screenshots; `bundle-before-after/` with screenshot pair; `findings/SUMMARY.md`.
Codebase state at exit: everything committed; answer-key checked out; side-by-side comparison; scored coverage percentage; updated personal audit checklist; target codebase that captures exceptions, fires consented analytics, joins three surfaces by correlation ID, ships a documented bundle delta. Launch-review pass rehearsed.

Estimated student time: 35 to 50 minutes.
