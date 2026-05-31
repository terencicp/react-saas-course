# Chapter 095 — Project: wire observability, audit performance

## Chapter framing

Chapter 095 closes Unit 19 by running both halves of the unit against a seeded audit target — the *wire* discipline from chapter 092 (Sentry + structured logs) and chapter 093 (PostHog with consent), and the *vigilance* discipline from chapter 094 (Core Web Vitals, bundle analyzer, RSC waterfalls, N+1, indexes).
The audit target is the same fork as chapter 082 with chapter 082's findings pre-fixed; this branch layers eight new findings across observability (Sentry not wired, log leak, missing correlation IDs, missing PostHog consent gate) and performance (RSC waterfall, barrel import, missing image `priority`, N+1).

The project is a **hybrid wire-and-document audit**, and its goals are stated as the outcomes a senior would confirm at a launch review:

- **Sentry catches a deliberately thrown error, decoded.** Hitting the provided `/api/test/throw` route lands an event in the Sentry dashboard tagged with the release matching the current commit, with navigation breadcrumbs and a readable (source-mapped) stack trace.
- **The logger is safe and correlatable.** Webhook log lines render `stripe-signature` as `[REDACTED]` and carry a `requestId` top-level field; the Sentry event for the same request carries the matching `requestId` tag and no leaked secret.
- **PostHog records events only after consent.** DevTools Network shows zero PostHog requests pre-consent; clicking "Accept" produces a `$pageview` in the PostHog dashboard; "Reject" stops capture.
- **The performance findings report is complete and evidenced.** Eight `findings/00N-*.md` files name rule, location, consequence, and fix (the observability findings' Fix sections name the wired seam); `findings/006-barrel-import.md` embeds bundle-analyzer before/after screenshots; `findings/SUMMARY.md` quantifies coverage with the First Load JS table as secondary evidence.

The "runnable state" rule lands as: the audit target boots at the end of every lesson, and observability wiring or `findings/` files accumulate without leaving broken intermediate state.

Threads that run through every lesson.
The audit is **hybrid wire-and-document** — observability findings get *fixed* (the student wires Sentry and gates PostHog), performance findings get *documented* (the student writes findings reports, not patches, except the barrel import which gets a measured fix to prove the bundle-analyzer before/after).
The **rule-location-consequence-fix template from chapter 082 carries through unchanged** — every documented finding names rule, location, consequence, fix.
**The audit target's running state is the diagnostic surface** — Sentry's dashboard, PostHog's dashboard, `pnpm build` First Load JS report, `@next/bundle-analyzer` HTML, and DevTools Performance traces are the artifacts the student inspects; reading source alone misses half the findings.
**The single-seam-to-lint rule from chapter 082 carries through** — Sentry's `beforeSend` redactor, the structured logger's correlation-ID middleware, the consent gate around `posthog.init`, and `optimizePackageImports` are each the one place the team configures the discipline.
**Self-grading is the senior reach** — the answer key publishes after the student commits, partial credit on rule + location match.

### Dependency carry-in

The audit invokes every primitive from Unit 19 plus seams from prior units.

- **From Chapter 092:** Sentry init with source maps, release tagging, breadcrumbs (lesson 1 of chapter 092); structured logs with request correlation IDs (lesson 2 of chapter 092); the 3am-rule plus PII/secrets exclusion via `beforeSend` redactor (lesson 3 of chapter 092); Vercel Log Drains as the read surface (lesson 4 of chapter 092).
- **From Chapter 093:** Vercel Speed Insights as the field-data surface (lesson 1 of chapter 093); PostHog primitives — events, feature flags, session replay (lesson 3 of chapter 093); the cookie-consent-gated init with `opt_out_capturing_by_default: true` plus `posthog.opt_in_capturing()` on consent grant (lesson 4 of chapter 093).
- **From Chapter 094:** Core Web Vitals at p75 (lesson 1 of chapter 094); `next/image` `priority` on the LCP element exactly once and `width`/`height` for CLS (lesson 2 of chapter 094); `optimizePackageImports` plus `sideEffects: false` (lesson 3 of chapter 094); `@next/bundle-analyzer` with the four scan passes (lesson 4 of chapter 094); RSC waterfall diagnosis and `Promise.all` rewrite (lesson 6 of chapter 094); N+1 at the Drizzle layer with `with: { ... }` relations (lesson 7 of chapter 094).
- **From Chapter 082:** the rule-location-consequence-fix template, the answer-key honor system, the eight-categories-as-coverage-contract framing; the consent gate finding from chapter 082 is *deliberately re-exposed* from the observability side (a missed analytics gate, not only a privacy gate).
- **From prior units:** the cookie-consent banner from lesson 5 of chapter 081 with its `consent.analytics` boolean; `authedAction(role, schema, fn)` and `tenantDb(orgId)` from chapter 057 / chapter 059; the typed `env` from lesson 2 of chapter 037 (Sentry DSN + release tag live there); the structured logger seam from lesson 2 of chapter 092 (the redactor lives there).

### Audit-target spec

A separate repo at `react-saas-course-projects/observability-perf-audit/starter/` cloned via `degit`.
The target is the same fork as `error-security-audit` with chapter 082's findings pre-fixed and eight new observability and performance findings seeded on top.
The target ships `@sentry/nextjs` and `posthog-js` in `package.json` with wiring deliberately absent or broken; `@next/bundle-analyzer` is in `devDependencies`.
The starter also ships the `findings/` skeleton — the rule-location-consequence-fix template, eight numbered placeholder files, `SUMMARY.md`, and `out-of-scope.md`, all empty — so the overview is clone-and-run and the student fills the files in later lessons.
The target boots end-to-end (`pnpm install && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`); the student keeps the running app open in one tab and the source in the editor.

Sentry credentials (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) and PostHog credentials (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) are documented in `.env.example`; the overview tells the student to create free-tier accounts and paste their own values.
The answer key lives in `solution/` on a `v1.0-answer-key` tag, read only after the student commits — same honor system as chapter 082.

The eight seeded findings:

**Observability (fixed by the student during the wire lessons):**

1. **Sentry not wired (lesson 1 of chapter 092).** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` missing; `next.config.ts` not wrapped with `withSentryConfig`; no source-map upload, no release tag, no breadcrumbs.
2. **Structured-log secret leak (lesson 3 of chapter 092).** `lib/logger.ts` serializes the full request body for `POST /api/billing/webhook`, including the Stripe signature header — a 3am-rule violation.
3. **Missing request correlation IDs (lesson 2 of chapter 092).** No middleware sets `x-request-id`; the logger has no `requestId` base binding; Sentry breadcrumbs and log lines for the same request can't be joined.
4. **PostHog consent gate missing (lesson 4 of chapter 093 + lesson 5 of chapter 081).** `instrumentation-client.ts` calls `posthog.init` with `opt_out_capturing_by_default: false`; the consent banner toggles a cookie but nothing reads it; events fire pre-consent.

**Performance (documented; only finding 6 is fixed in-place to produce the bundle-analyzer before/after):**

5. **RSC waterfall (lesson 6 of chapter 094).** `app/(app)/dashboard/page.tsx` awaits `getUser()` → `getOrg(user.orgId)` → `getInvoices(org.id)` → `getTeamMembers(org.id)` sequentially; `invoices` and `team` have no dependency.
6. **Barrel import of `lucide-react` (lesson 3 of chapter 094).** `app/(app)/layout.tsx` imports a dozen icons via the barrel; `next.config.ts` does not list `lucide-react` in `optimizePackageImports`; ~600 KB of icons ship.
7. **Missing `priority` on the LCP image (lesson 2 of chapter 094).** `app/(marketing)/page.tsx` renders the hero with `next/image` but no `priority`; field LCP measures ~4 s. The `@next/next/no-img-element` lint rule is missing.
8. **N+1 in the invoice list (lesson 7 of chapter 094).** `src/lib/invoices/queries.ts` runs `db.select().from(invoices)` then loops to fetch each customer with a separate query; the Drizzle relations API (`with: { customer: true }`) is the fix.

Two bonus findings the answer key acknowledges but doesn't require: (9) marketing-page font loaded via raw `<link>` instead of `next/font`; (10) missing composite `(org_id, created_at)` index on `invoices`. The overview names "8 is the floor, 10 is the senior reach."

### Reference-solution signatures

The lessons display the canonical signatures the student converges on:

- **Sentry config files** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` each calling `Sentry.init({ dsn, tracesSampleRate, release: env.SENTRY_RELEASE, beforeSend })`; `instrumentation.ts` exporting `register` and `onRequestError` per Next.js 16 docs.
- **`next.config.ts` Sentry wrapper** — `withSentryConfig(config, { silent, org, project, widenClientFileUpload: true, hideSourceMaps: true, disableLogger: true })`.
- **Env additions** — `SENTRY_DSN` (client partition), `SENTRY_AUTH_TOKEN` (server, build-only), `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` (computed from `VERCEL_GIT_COMMIT_SHA`).
- **Logger seam** — `lib/logger.ts` exports `logger` (Pino base) and `withRequestId(requestId: string)`; `proxy.ts` reads or mints `x-request-id`, stores it in an `AsyncLocalStorage` for downstream reads.
- **Redactor** — `redact(payload: unknown): unknown` in `lib/logger.ts`, wired into both Sentry's `beforeSend` and Pino's `redact` config; canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apiKey`, `*_KEY`, `*_SECRET`).
- **PostHog init seam** — `instrumentation-client.ts` calls `posthog.init(key, { api_host, opt_out_capturing_by_default: true, person_profiles: 'identified_only' })`; `lib/analytics/consent.ts` exports `grantAnalyticsConsent()` and `revokeAnalyticsConsent()` wrapping the opt-in/opt-out calls; the consent banner from lesson 5 of chapter 081 calls these on user action.
- **Finding template** — same `findings/00N-*.md` shape from chapter 082 with `Rule / Location / Consequence / Fix`; numbered placeholders for findings 1–8 plus `SUMMARY.md` and `out-of-scope.md`.

### Inspector surfaces

No custom inspector page — the running app, the Sentry dashboard, the PostHog dashboard, the `pnpm build` First Load JS report, the `@next/bundle-analyzer` HTML, and DevTools Performance traces are the observation panels. Each lesson's Moment of truth names one surface.

### Concepts demonstrated → owning lesson

- Sentry init across client/server/edge with source maps, release tagging, breadcrumbs — lesson 3 (carried from lesson 1 of chapter 092).
- Structured logger with request-scoped correlation IDs (Pino + `AsyncLocalStorage`) — lesson 4 (carried from lesson 2 of chapter 092).
- The 3am-rule and PII/secrets exclusion via a single `redact` seam reused by Sentry's `beforeSend` and Pino's `redact` — lesson 4 (carried from lesson 3 of chapter 092).
- Vercel Log Drains as the production read surface — lesson 4 (carried from lesson 4 of chapter 092), surfaced as a deploy-time follow-up.
- Vercel Speed Insights as the field-data verdict — context from lesson 1 of chapter 093; named as the field-data baseline but not exercised by an owning lesson in this chapter.
- PostHog primitives — lesson 5 (carried from lesson 3 of chapter 093).
- PostHog gated by the cookie consent banner (`opt_out_capturing_by_default: true` plus `opt_in_capturing()` on grant) — lesson 5 (carried from lesson 4 of chapter 093).
- Cookie consent banner with `consent.analytics` — lesson 5 (carried from lesson 5 of chapter 081).
- Core Web Vitals (LCP, INP, CLS) at p75 — lesson 2 and lesson 6 (carried from lesson 1 of chapter 094).
- `next/image` `priority` on the LCP element; `width`/`height` for CLS — lesson 2 (carried from lesson 2 of chapter 094).
- `optimizePackageImports` plus `sideEffects: false` defeating the barrel-export trap — lesson 6 (carried from lesson 3 of chapter 094).
- `@next/bundle-analyzer` and the four scan passes — lesson 6 (carried from lesson 4 of chapter 094).
- RSC waterfall diagnosis via trace; `Promise.all` rewrite; parent-child hoisting — lesson 6 (carried from lesson 6 of chapter 094).
- N+1 at the Drizzle layer; the relations API as the structural fix — lesson 6 (carried from lesson 7 of chapter 094 and lesson 2 of chapter 039).
- The rule-location-consequence-fix template and the answer-key honor system — lessons 2 and 7 (carried from chapter 082).

---

## Lesson 1 — Project Overview

The student clones the audit target, wires their free-tier Sentry and PostHog credentials, and leaves with the app booting locally.
No finding is wired or documented yet.

A hybrid wire-and-document audit closes Unit 19: the audit target ships with observability wiring missing or broken (Sentry, structured logs, the PostHog consent gate) and four performance issues planted.
Over the chapter the student *wires* observability into a working state and *documents* the performance issues with the rule-location-consequence-fix template, fixing the barrel import in-place to produce the bundle-analyzer before/after.
A single figure shows the four finished surfaces side by side: the Sentry event for the deliberate throw, the PostHog dashboard with a post-consent `$pageview`, the bundle-analyzer before/after, and the filled `findings/SUMMARY.md`.

### What we'll practice

- Auditing a running app for observability gaps and performance regressions, using the running state as the diagnostic surface rather than reading source alone.
- Wiring Sentry across client/server/edge with source maps and release tags.
- Building a single redactor seam and a request-correlation-ID middleware reused by both the logger and Sentry.
- Consent-gating analytics so capture starts only on an explicit opt-in.
- Diagnosing performance issues from traces, the bundle analyzer, and `EXPLAIN ANALYZE`, then writing findings with the rule-location-consequence-fix template.
- Self-grading a deliverable against a reference answer key — the audit's senior-reach habit.

### Architecture

A labeled list of the wiring the audit installs and the surfaces it audits:

- **Sentry** — `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` + `instrumentation.ts`, wrapped into the build by `withSentryConfig` in `next.config.ts`; source maps uploaded with `SENTRY_AUTH_TOKEN`, release computed from the git SHA.
- **Structured logging** — Pino in `lib/logger.ts` with a `redact` drop-list and a `requestId` mixin; `proxy.ts` mints `x-request-id` and stores it in an `AsyncLocalStorage` (`lib/request-context.ts`) that the logger and Sentry's `beforeSend` both read.
- **Analytics** — `posthog-js` initialized in `instrumentation-client.ts` with capture off by default, gated by `lib/analytics/consent.ts` behind the consent banner from chapter 081.
- **Performance surfaces** — the RSC dashboard (`app/(app)/dashboard/page.tsx`), the authenticated layout (`app/(app)/layout.tsx`), the marketing hero (`app/(marketing)/page.tsx`), and the invoice query layer (`src/lib/invoices/queries.ts`), audited through DevTools Performance, `@next/bundle-analyzer`, and `EXPLAIN ANALYZE`.
- **Deliverable** — `findings/` with the rule-location-consequence-fix template, eight numbered files, `SUMMARY.md`, and `out-of-scope.md`.

### Starting file tree

Annotated top-level layout; the highlighted focus is the cluster of files carrying the eight seeded findings (the placeholders to fill and the wiring to install).

```
observability-perf-audit/
├─ next.config.ts                      # not wrapped with withSentryConfig; no optimizePackageImports (findings 1, 6)
├─ instrumentation.ts                  # to create: register + onRequestError (finding 1)
├─ instrumentation-client.ts           # posthog.init runs with capture on (finding 4)  ← FOCUS
├─ proxy.ts                            # no x-request-id middleware yet (finding 3)
├─ .env.example                        # Sentry + PostHog credential names and how to obtain them
├─ app/
│  ├─ (marketing)/page.tsx             # hero <Image> missing priority (finding 7)  ← FOCUS
│  └─ (app)/
│     ├─ layout.tsx                    # lucide-react barrel import (finding 6)  ← FOCUS
│     └─ dashboard/page.tsx            # sequential awaits, RSC waterfall (finding 5)  ← FOCUS
├─ components/
│  └─ consent-banner.tsx               # toggles consent.analytics cookie but nothing reads it (finding 4)
├─ lib/
│  ├─ logger.ts                        # Pino with no redact; serializes full webhook body (findings 2, 3)  ← FOCUS
│  ├─ request-context.ts               # to create: AsyncLocalStorage for requestId (finding 3)
│  ├─ analytics/consent.ts             # to create: grant/revokeAnalyticsConsent seam (finding 4)
│  ├─ env.ts                           # Sentry env vars land here (finding 1)
│  └─ invoices/queries.ts              # 1 + N customer lookups (finding 8)  ← FOCUS
└─ findings/                           # ships empty: template, 001–008 placeholders, SUMMARY.md, out-of-scope.md  ← FOCUS
```

### Roadmap

One card per lesson:

- **Lesson 2 — The audit method, modeled on finding 7.** Tours the eight finding clusters across the running app and source, then writes `findings/007-missing-priority.md` end to end as the chapter's reference shape.
- **Lesson 3 — Wire Sentry.** Installs Sentry across client/server/edge with source maps and a release tag so the deliberate throw lands decoded in the dashboard.
- **Lesson 4 — The production logger seam.** Adds the single redactor reused in Pino and Sentry's `beforeSend`, plus a request-correlation-ID middleware backed by `AsyncLocalStorage`.
- **Lesson 5 — Gate PostHog behind consent.** Flips capture off by default and routes accept/reject through one consent seam so events fire only post-consent.
- **Lesson 6 — Document the performance findings.** Writes the waterfall and N+1 findings, fixes the barrel import in-place for the bundle-analyzer before/after, and assembles `SUMMARY.md`.
- **Lesson 7 — Verify and self-grade.** Runs the full verify recipe one surface at a time, commits, then diffs the work against the `v1.0-answer-key` tag to score coverage.

### Setup

Steps, in order:

1. `npx degit react-saas-course-projects/observability-perf-audit/starter observability-perf-audit`
2. `cd observability-perf-audit`
3. `pnpm install`
4. `cp .env.example .env.local`
5. Populate `.env.local`:
   - `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — create a free-tier Sentry org and project; the DSN is under Project Settings → Client Keys, the auth token under Settings → Auth Tokens (scope: source-map upload).
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — create a free-tier PostHog project; both values are on the project's setup page.
6. `docker compose up -d`
7. `pnpm db:migrate`
8. `pnpm db:seed`
9. `pnpm dev`

Expected result: the app boots on `http://localhost:3000`, seeded with a marketing page, an authenticated dashboard, and an invoice list.
At this point Sentry is unwired, the logger leaks, PostHog captures pre-consent, and the four performance findings are live — the starting state the rest of the chapter resolves.

The two artifacts (working observability and the findings report) are graded independently: a perfect findings report with broken Sentry still fails the audit, and working Sentry with one missing performance finding still fails the audit.
Coverage over depth — a short finding in every category beats a deep dive with one category silent.
The answer key on the `v1.0-answer-key` tag is read only after the student commits in lesson 7; the third-party prerequisites are a free-tier Sentry org and a free-tier PostHog project.

---

## Lesson 2 — The audit method, modeled on finding 7

A walkthrough.
It teaches the audit cadence — open the running app, hold it side by side with source, read one finding's fingerprint on its surface, write it before moving on — and demonstrates the cadence end to end by writing `findings/007-missing-priority.md`, the chapter's reference finding.

This lesson carries supporting videos in the body and a closing external-resources section.

Walk the running app as the primary diagnostic surface, surface by surface:

- Open the dashboard with DevTools Performance — watch four sequential `pg` queries with idle gaps between them (finding 5's fingerprint).
- Open the marketing page with Performance recording — the LCP marker lands on the hero at ~4 s (finding 7).
- Open Network filtered to `posthog` and reload pre-consent — watch the `/e/` request fire on first load (finding 4); Network is the canonical diagnostic here, faster than reading source.
- Hit `/api/test/throw` — the default Next.js error page renders and no Sentry event appears (finding 1).
- Tail the dev console and replay the webhook flow — the log line includes the Stripe signature (finding 2).

Then hold the running app beside the source and name where each finding clusters: `sentry.*.config.ts` (missing, finding 1); `lib/logger.ts` (the leaking serializer, finding 2; the missing correlation ID, finding 3); `instrumentation-client.ts` (ungated PostHog, finding 4); `app/(app)/dashboard/page.tsx` (waterfall, finding 5); `app/(app)/layout.tsx` (barrel, finding 6); `app/(marketing)/page.tsx` (missing `priority`, finding 7); `src/lib/invoices/queries.ts` (N+1, finding 8).
Name the existing seams the audit runs against: the cookie-consent banner from lesson 5 of chapter 081 (already toggles `consent.analytics` — the gate to read), `lib/env.ts` (where Sentry env vars land), `proxy.ts` (where the correlation-ID middleware will live), and `authedAction` / `tenantDb` / `audit-log` (untouched, named for orientation).

Model finding 7 end to end as the reference shape.
Read `app/(marketing)/page.tsx`: the hero `<Image>` ships `src`, `alt`, `width`, `height` but no `priority`.
Point at the LCP marker in DevTools and the ~4 s timing.
Then fill `findings/007-missing-priority.md` with all four sections — rule (lesson 2 of chapter 094: `priority` on the LCP element exactly once per page), location (file and line range), consequence (LCP regression past 2.5 s; search-ranking exposure; slow first impression), fix (add `priority` to the hero `<Image>`; add the `@next/next/no-img-element` lint rule at error).

Close on the cadence rules the rest of the chapter relies on.
The findings are spread so each has a distinct grep target or DevTools view; trying to find all of them by reading source is the slow path, and the running app surfaces three of the four observability findings in under a minute.
For observability findings 1–4 the *fix* lands in the wire lessons, so each of those finding files' "Fix" section is a paragraph naming the seam installed, not a diff — the placeholders stay empty until their wire lesson completes.

Moment of truth: `findings/007-missing-priority.md` is filled with all four sections, its location matches the hero `<Image>`, and its consequence is operator- or user-visible (the LCP timing), never "code smell." The student has navigated each diagnostic surface and can name which surface reveals which finding.

---

## Lesson 3 — Wire Sentry

Wire Sentry across client, server, and edge so a deliberately thrown error reaches the dashboard decoded.
When the lesson is done, hitting `/api/test/throw` lands an event in Sentry tagged with the release matching the current commit, with navigation breadcrumbs and a readable, source-mapped stack trace.

### Your mission

The audit target ships `@sentry/nextjs` in `package.json` but no wiring: the three config files are missing, `next.config.ts` is not wrapped, and there is no source-map upload or release tag — so errors either vanish or arrive as minified noise that no one can act on at 3am.
Your job is to install the canonical Next.js 16 Sentry setup and prove it works end to end against the provided throw route.
The fast path is the Sentry wizard (`npx @sentry/wizard@latest -i nextjs`); the senior move is to *read* its output before committing and defend every `withSentryConfig` flag, since the manual setup is the fallback when defaults need tuning.
Two traps decide whether the wiring is actually useful: source-map upload depends on `SENTRY_AUTH_TOKEN` being present at build time — without it, stack traces stay minified ("line 1 column 12345") and the event is unreadable — and the release tag must be computed from the git SHA per deploy, because a hardcoded `"v1.0.0"` ties every error in a deployed week to one release.
The wizard sets `tracesSampleRate` to 1.0; the audit target keeps 1.0 for local visibility, but note that production drops to 0.1–0.2 per lesson 1 of chapter 092.
This lesson installs Sentry only — the redactor and correlation-ID tag that also live in `beforeSend` are the next lesson's work.

This lesson covers finding 1; its Fix section in `findings/001-sentry-not-wired.md` is filled here, naming the seam installed and the call sites it now governs.

- `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` each call `Sentry.init` with the DSN, a `tracesSampleRate`, and the release tag; `instrumentation.ts` exports `register` and `onRequestError`.
- `next.config.ts` is wrapped with `withSentryConfig` (`hideSourceMaps: true`, `widenClientFileUpload: true`, org/project/auth-token), so a production build uploads source maps.
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_RELEASE` validate in `lib/env.ts` with the DSN on the client partition and the auth token server-only; `SENTRY_RELEASE` is computed from `VERCEL_GIT_COMMIT_SHA` (falling back to `git rev-parse HEAD`), not hardcoded.
- Hitting `/api/test/throw` produces an event in the Sentry dashboard within a minute, tagged with the release matching the current commit, carrying navigation breadcrumbs.
- That event's stack trace is readable — file and line, not a minified column offset — confirming source maps uploaded.
- `findings/001-sentry-not-wired.md` is filled, its Fix section naming the Sentry seam and the build wiring that now governs every captured error.

### Coding time

Implement against the brief and the lesson's tests, then read the reference solution.

The hidden `<details>` solution shows the three config files, `instrumentation.ts`, the `withSentryConfig` wrapper, and the `lib/env.ts` additions as they sit in the repo, plus the `SENTRY_RELEASE` computation.
It explains the non-obvious choices in a sentence or two each: why `hideSourceMaps` ships maps to Sentry but not the public bundle, why `widenClientFileUpload` matters for App Router chunks, and why the release must be deterministic per deploy.
It links lesson 1 of chapter 092 for the Sentry concepts rather than re-explaining them, and calls out the wizard output the student should be able to defend rather than accept blindly.
The Vercel Log Drain note from lesson 4 of chapter 092 is surfaced here as a deploy-time follow-up, not exercised locally.

### Moment of truth

Run the lesson's test suite with the documented command; the expected output is a clean pass.
The named surface is the **Sentry dashboard**. Confirm by hand the items the tests can't reach:

- [ ] Hitting `/api/test/throw` lands an event in Sentry within ~60 s.
- [ ] The event is tagged with `SENTRY_RELEASE` matching the current commit SHA.
- [ ] The event carries navigation breadcrumbs.
- [ ] The stack trace is readable (file + line), confirming source-map upload — a "line 1 column 12345" stack means the auth token is missing at build time.
- [ ] `findings/001-sentry-not-wired.md` Fix section names the installed seam.

---

## Lesson 4 — The production logger seam

Make the structured logger production-grade: no secret ever serializes, and every log line and Sentry event for one request share a correlation ID.
When the lesson is done, replaying the webhook flow shows `stripe-signature` as `[REDACTED]` with a `requestId` field on every line, and the Sentry event for that request carries the same `requestId` tag and no leaked secret.

### Your mission

The seeded Pino logger in `lib/logger.ts` has no redaction and serializes the full request body for `POST /api/billing/webhook`, signature header and all — a textbook 3am-rule violation — and nothing stamps a request with an ID, so a log line and the Sentry event for the same request can't be joined.
This lesson closes both gaps through one logger seam, because the redactor and the correlation ID both have to reach Sentry's `beforeSend` (installed last lesson) as well as Pino, and splitting them would duplicate that wiring.
The load-bearing discipline is "one redactor, two callers": declare `redact` once and reuse it in both Pino's `redact` config and Sentry's `beforeSend` — duplicating the logic between them is the failure mode, so refactor before wiring the second caller.
For correlation, `AsyncLocalStorage` is the primitive that survives concurrent requests; `globalThis` or module-level state leaks one request's ID into another's logs.
Out of scope: the Vercel Log Drain that reads these logs in production is named as a deploy-time follow-up (lesson 4 of chapter 092), not wired locally.

This lesson covers findings 2 and 3; their Fix sections in `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` are filled here, each naming the seam installed and the call sites it governs.

- A single `redact(payload)` in `lib/logger.ts` carries the canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apiKey`, `*_KEY`, `*_SECRET`) and is the only redaction logic in the codebase.
- Replaying the webhook flow renders `stripe-signature` as `[REDACTED]` in the log lines, and any Sentry event captured during that flow shows the signature redacted too — the same `redact` feeds Pino and `beforeSend`.
- `proxy.ts` reads `x-request-id` from the incoming request or mints `crypto.randomUUID()`, sets it on the response, and stores it in an `AsyncLocalStorage` exported from `lib/request-context.ts`.
- Every log line for a request carries a top-level `requestId` field sourced from that store via the Pino `mixin`.
- A thrown error inside a request produces a Sentry event tagged with the same `requestId` (set in `beforeSend`), so a log line and its Sentry event join on one value.
- `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` are filled, their Fix sections naming the redactor and correlation seams.

### Coding time

Implement against the brief and the lesson's tests, then read the reference solution.

The hidden `<details>` solution shows `lib/logger.ts` with the `redact` drop-list and the `requestId` mixin, `lib/request-context.ts` with the `AsyncLocalStorage`, the `proxy.ts` middleware, and the `beforeSend` additions in `sentry.server.config.ts` (the `redact` call and `Sentry.setTag('requestId', ...)`).
It explains why the redactor is refactored into one function before the second caller is wired, and why the response header is set so downstream services can join on the same ID.
It links lesson 3 of chapter 092 for the 3am-rule and lesson 2 of chapter 092 for correlation IDs rather than re-explaining them, and calls out `AsyncLocalStorage` as the one primitive that must not be swapped for module-level state.

### Moment of truth

Run the lesson's test suite with the documented command; the expected output is a clean pass.
The named surface is the **dev console** (log lines) alongside the **Sentry dashboard**. Confirm by hand:

- [ ] Replaying the webhook flow shows `stripe-signature` as `[REDACTED]` in the console.
- [ ] Every log line carries a top-level `requestId` field.
- [ ] A thrown error inside the webhook flow produces a Sentry event whose breadcrumbs do not contain the un-redacted signature.
- [ ] That Sentry event is tagged with the same `requestId` as the request's log line.
- [ ] `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` Fix sections name their seams.

---

## Lesson 5 — Gate PostHog behind consent

Make analytics fire only after the user opts in.
When the lesson is done, a fresh visit produces zero PostHog network requests; clicking "Accept" starts capture and produces a `$pageview` in the dashboard; "Reject" stops it.

### Your mission

The seeded `instrumentation-client.ts` calls `posthog.init` with `opt_out_capturing_by_default: false`, so events fire on first load, and the consent banner from chapter 081 toggles a `consent.analytics` cookie that nothing reads — the gate exists but isn't wired.
This is the chapter 082 consent finding re-exposed from the analytics side: chapter 082 caught that the banner's privacy intent went unread; this lesson closes the half where PostHog ignores the gate.
The load-bearing pair is `opt_out_capturing_by_default: true` *plus* an explicit `posthog.opt_in_capturing()` on grant — default-out alone means PostHog never captures even after consent, and a banner that acts only on "Accept" leaves "Reject" in whatever state the default placed it, so both grant and revoke route through one seam.
Session continuity is the easily-missed case: on a reload after consent was granted, `posthog.init` ran with capture off, so the app must re-call `opt_in_capturing()` on mount when the cookie is already present — an explicit re-call keeps the wiring readable regardless of PostHog's own persistence.
Session replay from lesson 3 of chapter 093 inherits this same gate once it ships; it is out of scope to enable here.

This lesson covers finding 4; its Fix section in `findings/004-posthog-consent-gate.md` is filled here, naming the seam, the init flag, the runtime calls, and the session-continuity fix.

- `instrumentation-client.ts` initializes PostHog with `opt_out_capturing_by_default: true` and `person_profiles: 'identified_only'`, so init runs but nothing is captured until opt-in.
- `lib/analytics/consent.ts` is the single seam: `grantAnalyticsConsent()` calls `posthog.opt_in_capturing()`, sets the `consent.analytics` cookie, and captures a one-off `analytics_consent_granted` event; `revokeAnalyticsConsent()` calls `posthog.opt_out_capturing()` and clears the cookie.
- The consent banner from chapter 081 routes its accept and reject actions through those two functions instead of writing the cookie inline.
- A fresh visit (cookies and localStorage cleared) produces zero requests in DevTools Network filtered to `posthog`.
- Clicking "Accept" fires one `/e/` request, subsequent navigation fires `$pageview`, and the events appear in the PostHog dashboard within 30 s; clicking "Reject" stops capture.
- Reloading after consent was granted resumes capture without a second click, because the app re-calls `opt_in_capturing()` on mount when the cookie is present.
- `findings/004-posthog-consent-gate.md` is filled, its Fix section naming the seam and the init/runtime/continuity changes.

### Coding time

Implement against the brief and the lesson's tests, then read the reference solution.

The hidden `<details>` solution shows `instrumentation-client.ts` with the flipped init options, `lib/analytics/consent.ts` with both functions, the consent-banner edits, and the on-mount continuity check.
It explains why the init flag and the runtime opt-in are two separate changes, and why routing through `grantAnalyticsConsent()` keeps the discipline grep-able instead of letting feature engineers reach for `opt_in_capturing()` directly.
It links lesson 4 of chapter 093 and lesson 5 of chapter 081 rather than re-explaining the PostHog and consent-banner primitives.
If the student noticed the marketing-page font loaded via a raw `<link>` (bonus finding 9, same LCP-path discipline), the optional `findings/009-missing-next-font.md` can be written here.

### Moment of truth

Run the lesson's test suite with the documented command; the expected output is a clean pass.
The named surface is the **DevTools Network panel** alongside the **PostHog dashboard**. Confirm by hand:

- [ ] With cookies and localStorage cleared, a fresh load shows zero `posthog` requests.
- [ ] Clicking "Accept" fires one `/e/` request; the next navigation fires `$pageview`.
- [ ] The events appear in the PostHog dashboard within 30 s.
- [ ] Clicking "Reject" stops capture.
- [ ] Reloading after consent resumes capture with no second click.
- [ ] `findings/004-posthog-consent-gate.md` Fix section names the seam and the three changes.

---

## Lesson 6 — Document the performance findings

Produce the performance half of the report: write the waterfall and N+1 findings, fix the barrel import in-place to capture the bundle-analyzer before/after, and assemble `findings/SUMMARY.md` as the coverage-and-evidence artifact.
When the lesson is done, all eight finding files are filled, `findings/006-barrel-import.md` embeds before/after screenshots, and `SUMMARY.md` quantifies coverage.

### Your mission

The audit's contract for performance is documentation, not patches — the deliverable is a findings report a senior attaches to a launch-review summary, with measured impact, so each finding here names rule, location, consequence, and fix without changing the code.
The one exception is the barrel import, fixed in-place because the bundle-analyzer before/after is the required evidence; the temptation to "just fix it while I'm in the file" on the waterfall, image, and N+1 is the trap, since mixing fixes into a documentation pass bloats the PR and obscures the scope.
Each finding has a diagnostic surface that names the bug before you read source: the waterfall shows as four sequential spans with idle gaps in a trace (read the trace first, then confirm in source — inverting it misses bugs where the dependency only *looks* present), the barrel shows as a ~600 KB `lucide-react` chunk in the analyzer treemap, and the N+1 shows as 1 + N queries in the slow-query log, confirmable with `db.toSQL()`.
`optimizePackageImports` may have graduated out of `experimental` in Next.js 16 — check the release notes; the seeded config accepts either.
The senior reach past the eight-finding floor is bonus finding 10, the missing composite `(org_id, created_at)` index, proven with `EXPLAIN ANALYZE`; `SUMMARY.md` is not a list of titles but the coverage-and-evidence document, and deliberate scope cuts go in `out-of-scope.md`.

This lesson covers findings 5, 6, and 8 (finding 7 was modeled in lesson 2), the optional bonus 10, and `SUMMARY.md`.

- `findings/005-rsc-waterfall.md` names the rule (dependency-check before each `await`), the location and line range in `app/(app)/dashboard/page.tsx`, the consequence (≈320 ms render where ≈240 ms was reachable), and the fix (`Promise.all([getInvoices(org.id), getTeamMembers(org.id)])` for the independent pair; `user` → `org` stays sequential).
- `findings/008-n-plus-1-invoices.md` names the rule (N+1 at the Drizzle layer), the location in `src/lib/invoices/queries.ts`, the consequence (1 + N queries per render; ≈50 ms of avoidable round-trip at 100 invoices; connection-pool risk), and the fix (`db.query.invoices.findMany({ with: { customer: true } })`, verified with `db.toSQL()`).
- `ANALYZE=true pnpm build` before the change captures the ~600 KB `lucide-react` chunk as `findings/screenshots/before-barrel.png`.
- Adding `lucide-react` to `optimizePackageImports` in `next.config.ts` drops that chunk to ~30 KB, captured as `findings/screenshots/after-barrel.png`.
- `findings/006-barrel-import.md` names rule, location, consequence (~570 KB extra on every authenticated page; INP risk on slow mobile), and fix, and embeds both screenshots.
- `findings/SUMMARY.md` quantifies coverage (8/8 floor, 9/10 or 10/10 with bonuses), names the audit cadence, and pastes the final `ANALYZE=true pnpm build` First Load JS table as secondary evidence; scope cuts are recorded in `findings/out-of-scope.md`.
- Optionally, `findings/010-composite-index.md` names the missing composite index, proven with `EXPLAIN ANALYZE` showing a `Seq Scan` plus in-memory sort becoming an Index Scan after the migration.

### Coding time

Implement against the brief and the lesson's tests, then read the reference solution.

The hidden `<details>` solution shows each filled finding file, the single `next.config.ts` edit for the barrel fix, and the `SUMMARY.md` shape, organized as they sit in `findings/`.
It explains the non-obvious calls: why only the independent pair is wrapped in `Promise.all` (wrapping the `user` → `org` dependency would be wrong), why `optimizePackageImports` is the senior default over per-icon imports (which work but trade readability), and why `db.toSQL()` is the verification that the relations API produced one join.
It links lesson 6 of chapter 094 (waterfall), lesson 3 and lesson 4 of chapter 094 (barrel and bundle analyzer), and lesson 7 of chapter 094 (N+1) rather than re-explaining them.
For bonus 10 it notes the migration must actually be generated (the target ships `drizzle-kit` configured); naming the fix without generating the migration is half-credit.

### Moment of truth

Run the lesson's test suite with the documented command; the expected output is a clean pass.
The named surfaces are the **`@next/bundle-analyzer` HTML**, **DevTools Performance** (or the Sentry trace), and the **slow-query log** / `EXPLAIN ANALYZE`. Confirm by hand:

- [ ] `findings/005-rsc-waterfall.md` and `findings/008-n-plus-1-invoices.md` each carry all four sections with operator-visible consequences.
- [ ] `lucide-react` drops from ~600 KB to ~30 KB across the two analyzer runs.
- [ ] `findings/006-barrel-import.md` embeds both before/after screenshots.
- [ ] `findings/SUMMARY.md` states coverage and pastes the First Load JS table; `out-of-scope.md` records the deliberate cuts.
- [ ] The target still boots clean with only the barrel import patched.

---

## Lesson 7 — Verify and self-grade

Run the full verify recipe one surface at a time to confirm every project goal, commit the work, then diff it against the `v1.0-answer-key` tag to score coverage and surface the senior-reach details.
When the lesson is done, the student has a committed deliverable, a clause-by-clause comparison against the reference solution, and a backlog of follow-ups with measured impact.

### Your mission

This is the audit's assessment: the project chapter has no quiz, so the deliverable graded against the answer key *is* the test.
Run the recipe in order and stop on the first failure — a minified stack on the Sentry step means the source-map upload is broken and PostHog verify is pointless until it's fixed.
The most common miss is the PostHog gate's two halves: students sometimes flip only the init flag, see no pre-consent events, and ship — but post-consent events never fire because no one called `opt_in_capturing()`; verify both halves.
The honor system holds: no peeking at `solution/` until after the commit.
Self-grading is partial-credit on rule + location match — the common partial-credit pattern is a matching rule and location with a different-but-valid fix seam (per-icon vs `optimizePackageImports`, `innerJoin` vs the relations API), where the senior reach is what the answer key names — so the goal is an honest score and a named backlog, not a perfect diff.

The verifiable outcomes here are confirmations and a scored self-assessment, not new code:

- The Sentry surface confirms the deliberate throw lands tagged with the current release, with breadcrumbs, a readable stack, and a `requestId` matching its log line.
- The logger surface confirms `stripe-signature` renders `[REDACTED]`, `requestId` is a top-level field on every line, and a webhook error's Sentry breadcrumbs hold no un-redacted signature.
- The PostHog surface confirms zero pre-consent requests, a `$pageview` after "Accept", dashboard events within 30 s, and capture stopping on "Reject".
- The findings surface confirms eight filled files, both screenshots embedded in `findings/006-barrel-import.md`, and `SUMMARY.md` carrying coverage plus the First Load JS table.
- The work is committed (`git add . && git commit -m "Unit 19 observability wired + audit findings"`) before the answer key is read.
- After `git fetch && git checkout v1.0-answer-key -- solution/`, each finding is compared clause by clause and a coverage score is recorded, with the senior-reach details the answer key names per finding noted as gaps where missed.
- A backlog of out-of-scope follow-ups is written down: ship the waterfall/priority/N+1 fixes, add the CI gate from lesson 5 of chapter 094, wire the Vercel Log Drain (lesson 4 of chapter 092) once deployed, add the `no-img-element` lint rule, and add the composite-index migration.

### Coding time

Run the verify recipe and commit, then open the answer key and compare.

The hidden `<details>` walkthrough is the answer key's per-finding senior-reach checklist — the details students most often miss:

- **Finding 1** — `SENTRY_RELEASE` computed from the git SHA, not hardcoded; `hideSourceMaps: true`; `widenClientFileUpload: true`.
- **Finding 2** — `redact` as the single seam reused in both Pino's `redact` and Sentry's `beforeSend`; the drop-list includes wildcard patterns (`*_KEY`, `*_SECRET`).
- **Finding 3** — `AsyncLocalStorage`, not module-level state; `mixin` in Pino; `setTag` in Sentry; `proxy.ts` writes the response header so downstream services join.
- **Finding 4** — `opt_out_capturing_by_default: true` *and* the explicit `opt_in_capturing()` on grant; the session-continuity re-call on mount; `revokeAnalyticsConsent` symmetry.
- **Finding 5** — `Promise.all` for the independent pair only; `user`/`org` stay sequential; not the "wrap everything" anti-pattern.
- **Finding 6** — `optimizePackageImports` as the senior default (not per-icon); `sideEffects: false` named for internal packages.
- **Finding 7** — `priority` exactly once; the `no-img-element` lint rule as regression prevention; `width`/`height` as the CLS protection layer.
- **Finding 8** — `findMany({ with: { customer: true } })`; `db.toSQL()` as verification; the composite index (bonus 10) as the secondary fix.

It closes on the senior framing this audit teaches: observability gaps close before launch because they lose data, while performance gaps go to the backlog with measured impact because they are slow, not bleeding; the single-seam-to-lint pattern (`redact`, the request-context middleware, `grantAnalyticsConsent`, `optimizePackageImports`) is the audit's positive deliverable, with findings as the bypass-call-sites and seams as the structural fix; coverage on all eight is the floor and bonuses 9 and 10 are the reach; and the audit-target shape is portable to every later launch review.
Forward references: chapter 097 wires the CI gates that catch these regressions (`@lhci/cli`, bundle-size budgets, source-map upload verification); chapter 098 wires the Vercel Log Drain that reads this logger in production; chapter 104 reviews a seeded PR with the same disciplined-reading muscle on a code-review surface.

### Moment of truth

This lesson is itself the project's verification pass; its surfaces are every panel the chapter used — the **Sentry dashboard**, the **dev console**, the **DevTools Network panel**, the **PostHog dashboard**, and `findings/`. Confirm, in order:

- [ ] Sentry: the deliberate throw lands tagged with the current release, with breadcrumbs, a readable stack, and a `requestId` matching its log line.
- [ ] Logger: `stripe-signature` renders `[REDACTED]`; `requestId` is a top-level field on every line; the webhook error's Sentry breadcrumbs hold no un-redacted signature.
- [ ] PostHog: zero pre-consent requests; `$pageview` after "Accept"; dashboard events within 30 s; capture stops on "Reject".
- [ ] Findings: eight filled files; both screenshots embedded in `findings/006-barrel-import.md`; `SUMMARY.md` carries coverage plus the First Load JS table.
- [ ] The work is committed before the answer key is checked out.
- [ ] Coverage is scored clause by clause against `v1.0-answer-key`, and the backlog of follow-ups is written down.
