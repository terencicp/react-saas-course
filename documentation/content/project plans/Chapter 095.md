# Chapter 095 — Project plan: wire observability, audit performance

## Design decision (resolved — read first)

This project is a **hybrid wire-and-document audit**, the first whose deliverable is split between **real TypeScript** and **Markdown**:

- **Observability findings 1–4 are *wired* (real code).** The student installs Sentry, hardens the Pino logger (redactor + correlation IDs), and gates PostHog behind consent. This wiring is the difference between `start/` and `solution/`.
- **Performance findings 5–8 are *documented* (Markdown), not patched** — the deliverable is a `findings/` report a senior attaches to a launch review. The sole exception is finding 6 (the `lucide-react` barrel), fixed in-place (one `next.config.ts` line) because the bundle-analyzer before/after is the required evidence.

This inverts the 082 pattern (where `start/` and `solution/` shared all source). Mapping the chapter outline's `degit`-starter + `v1.0-answer-key`-tag model onto this pipeline's `solution/` + `start/` split:

- **The audit target** (the 082-lineage app, 082's findings pre-fixed, with eight *new* findings seeded) is the substrate. The scaffolder builds it in its **seeded-broken state**: observability absent/broken (findings 1–4 live), four performance defects live (findings 5–8), and the `findings/` skeleton.
- **`start/`** = that seeded-broken substrate verbatim + `findings/` placeholders. The student's `start/` work is *both* code (wire 1–4, fix the barrel in 6) *and* Markdown (document 5–8 + `SUMMARY.md`).
- **`solution/`** = the wired-and-fixed state (Sentry wired, logger safe+correlated, PostHog gated, barrel optimized) + all eight finding files filled + `SUMMARY.md`/`out-of-scope.md`. This is the `v1.0-answer-key` content.
- **Each observability slice (S2/S3/S4) edits real target code *and* fills its finding file.** The performance slices fill finding files; S5 additionally adds the one barrel-fix line. S1 is the reference finding (finding 7, document-only). S7 closes with `SUMMARY.md` + `out-of-scope.md` + the two bonus findings.
- **`start/` derivation** reverts the observability wiring back to seeded-broken, reverts the barrel-fix line, and empties the finding bodies to placeholders. Performance source defects 5/7/8 are byte-identical in both trees (they are never patched).

Consequence threaded through the plan: **two verification kinds run.** Wiring is checked by greps for the installed seam (Sentry config files exist and call `Sentry.init`; `redact` is the single seam in `lib/logger.ts`; `proxy.ts` mints `x-request-id`; PostHog inits `opt_out_capturing_by_default: true`) plus the seeded-defect greps that must hold in `start/` only. Findings are checked by greps for the four template sections, the named rule, the location/command, and the senior-reach fix token. **Rendered checks verify the *wired* `solution/` boots and the genuinely-visible app surfaces render** (the marketing hero paints as one element with its `<Image>` — the missing-`preload` defect is documented, not visible in the DOM; the authenticated dashboard + nav render end-to-end). The browser-invisible diagnostic surfaces the chapter teaches against — the Sentry dashboard, the PostHog dashboard, the Turbopack analyzer treemap, DevTools traces — are **not** in the render pipeline (no live third-party round-trip) and are covered by static checks + the lessons' by-hand checklists. **Screenshots capture only the two real app routes** the lessons point a figure at; the chapter's headline "four surfaces side by side" figure is external-dashboard artifacts, captured `none`.

Why this base: the dependency map lists **082 → 095**. **Fork the 082 `solution/`** (already the merged 059+062+065+067+075 lineage with the audit-target shape, the `findings/` mechanics, the `tests/lessons/` gate, Pino `lib/logger.ts`, `proxy.ts`, ungated `posthog-js`), **pre-fix 082's eight findings** (so the only live defects are the new eight), then seed the eight new observability/performance defects on top.

## Project goals

The project cements Unit 19 by running both halves of the unit against one seeded target: the **wire** discipline (chapter 092 Sentry + structured logs, chapter 093 PostHog-with-consent) and the **vigilance** discipline (chapter 094 Core Web Vitals, the bundle analyzer, RSC waterfalls, N+1, indexes). It develops the senior launch-review muscles, none of which is keystroke volume: (1) **read a running app as the diagnostic surface** — three of the four observability findings surface in the running app (a DevTools trace, the Network panel, the default error page) faster than reading source; (2) **wire each cross-cutting discipline as one seam** — Sentry's `beforeSend` redactor, the logger's correlation-ID middleware, the consent gate around `posthog.init`, `optimizePackageImports` are each the single place the team configures the rule, and "one redactor, two callers" (Pino + `beforeSend`) is the load-bearing refactor; (3) **prove the wiring end-to-end against a real surface** — a deliberate throw lands decoded in Sentry, a webhook replay shows `[REDACTED]`, a post-consent click produces a `$pageview`; (4) **document a performance finding with measured, operator-visible impact** on the rule-location-consequence-fix template — never "code smell," and never patch a finding outside its scope (mixing fixes into a documentation pass is the named trap); (5) **distinguish the two senior verdicts** — observability gaps close before launch (they lose data), performance gaps go to the backlog with measured impact (they are slow, not bleeding). The structural lesson: wire the seam, prove it on the running surface, document what you won't fix yet, and self-grade honestly against the answer key.

The point is not to build app features; it is to walk a realistic launch-review-and-wire workflow on the smallest target that lands one defect per category — eight findings, two bonus — so the student completes the pass quickly and the discipline lands without app-feature noise.

## Student position

The student has finished Units 1–18 plus all three Unit 19 teaching chapters (092 error monitoring + structured logs, 093 product analytics, 094 performance vigilance) and the 082 audit (whose eight findings are pre-fixed in this fork). They know, and this project consumes, the full lineage: TypeScript 6 strict, React 19 (Server/Client Components, `error.tsx`/`global-error.tsx`), Next.js 16 App Router (`cacheComponents`, Suspense, `proxy.ts` = the renamed middleware, route handlers), Tailwind v4 + shadcn/ui, Postgres 18 + Drizzle 0.45 (`tenantDb`, relations v1 `with: {...}`, `db.query.*`, `.toSQL()`, `EXPLAIN ANALYZE`), Zod 4, the single-param `Result<T>`, Better Auth + the organization plugin (`requireOrgUser()` → `{ user, orgId, role }`, `authedAction(role, schema, fn)`), `audit_logs` + `logAudit(tx, event)`, the Stripe webhook + `plan_entitlements`, Resend, `@upstash/ratelimit` + `safeLimit`, `@t3-oss/env-nextjs` typed `env`, and — the Unit 19 carry-in this project *is*:
- **Sentry (092 L1):** `instrumentation-client.ts` (client `Sentry.init`), `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` exporting `register` + `onRequestError = Sentry.captureRequestError`; `withSentryConfig` wraps `next.config.ts`; source maps via `SENTRY_AUTH_TOKEN`; release from the git SHA; `beforeSend` redaction; tags (low-cardinality) vs. context (high-cardinality, e.g. `requestId`).
- **Structured logs (092 L2/L3):** Pino singleton in `lib/logger.ts` with a `redact` slot and a `requestId` mixin; `lib/request-context.ts` exporting `runWithContext`/`getRequestContext` over `AsyncLocalStorage`; `proxy.ts` mints/echoes `x-request-id`; the proxy scope does NOT propagate into route handlers (two `runWithContext` calls); the 3am rule; the canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apiKey`, `*_KEY`, `*_SECRET`) + `PII_KEYS`; `logger.child(getRequestContext() ?? {})`.
- **PostHog (093 L3):** `PostHogProvider` as a consent-gated dynamic import (belt two) + `opt_out_capturing_by_default: true` (belt one) + `posthog.opt_in_capturing()` on grant; the `/ingest` proxy via `next.config.ts` rewrites; the canonical `posthog.init` shape; `useConsent()`/`consent.analytics` from chapter 081 L5; the typed `track()`/`useTrack()` helper (093 L4).
- **Performance (094):** Core Web Vitals at p75 (LCP ≤ 2.5 s/INP ≤ 200 ms/CLS ≤ 0.1); `next/image` `preload` (renamed from `priority` in Next.js 16) on exactly one LCP element + `width`/`height` for CLS + the `@next/next/no-img-element` ESLint rule; the barrel-export trap + `experimental.optimizePackageImports` + `sideEffects: false`; the Turbopack analyzer `pnpm next experimental-analyze [--output]` + the four scan passes; RSC waterfall diagnosis + the dependency-check reflex + `Promise.all` for the independent pair + React `cache()` for dedup; N+1 at the Drizzle layer + relations `with: {...}` + `.toSQL()`; the composite `(org_id, created_at, id)` index + `EXPLAIN ANALYZE`.
- **Audit method (082):** the rule-location-consequence-fix template, the answer-key honor system, the eight-categories-as-coverage-contract framing.

**Not yet known — coder agents must NOT introduce these into the wiring or the findings:**
- **CI gates / GitHub Actions / `@lhci/cli` / bundle-size budgets / source-map-upload verification in CI.** Unit 20 (chapter 097). Findings may name "wire this into CI later (chapter 097)" as a follow-up, never as the fix.
- **Vercel Drains / Log Drains hands-on, the Axiom/APL query surface.** Deferred to chapter 098 (deploy-time). The logger work names the drain as a deploy-time follow-up; do not wire a drain or an `AXIOM_*` env.
- **PostHog feature flags, experiments, session replay, server-side `posthog-node` capture, `bootstrapFlags`, group analytics.** This project gates capture and proves the `$pageview`; it does not wire flags/replay/server-side capture (093 L4–L6 surfaces beyond the consent gate). Session replay inherits the same gate "once it ships" — out of scope here.
- **The expand-migrate-contract migration workflow.** Unit 20 (chapter 100). Bonus finding 10 (the composite index) *generates a migration with `drizzle-kit`* using the Unit-5 migration mechanics the student already has — it does NOT use expand-contract.
- **next-intl / i18n, Temporal in new domain code beyond the lineage.** Unit 17. Read strings as authored-for-a-human; do not localize new wiring.
- **The performance fixes (5/7/8) as applied diffs.** Their deliverable is documentation. Only finding 6 (the barrel) is fixed in-place, and only the single `optimizePackageImports` line. The RSC waterfall, the missing `preload`, the N+1, and the bonus index are described in `findings/`, never patched (the index migration is generated as bonus evidence but the query is not rewritten).

## Scaffolding recipe

Build a single `solution/` that is the **seeded-broken audit target** plus the `findings/` scaffold. Build everything below now in its **seeded-broken state**; leave the observability wiring *absent/broken* and the four performance defects *live* for the slices to wire/document, and leave the finding-file bodies as placeholders. The slices transform this into the wired-and-fixed answer key. `pnpm verify` must pass **green in this broken state** (every defect compiles, builds, and renders — an audit reads a running target).

This recipe is the only section the scaffolding-coder reads. Build the target and the `findings/` scaffold; do not wire Sentry, do not redact/correlate the logger, do not gate PostHog, do not add `optimizePackageImports` — those are slice work.

### Fork and pre-fix

1. **Fork the 082 `solution/`** (`projects/Chapter 082/solution/`) wholesale — it carries the 059 org/RBAC/audit/auth backend, the 062 invoices layer, the 065 Stripe webhook + `plan_entitlements`, the 067 Trigger.dev export job + `deleteUser` task, the 075 rate-limiter, Pino `lib/logger.ts`, `src/proxy.ts`, ungated `posthog-js` in `_components/providers.tsx`, the `(auth)`/`(protected)` surfaces, `error.tsx`, the `findings/` mechanics, `tests/lessons/`, and the toolchain pinned (incl. `kysely@0.28.17` override, `allowBuilds: { sharp: true, esbuild: false }`). Rename the package to `chapter-095-audit-target`.
2. **Pre-fix 082's eight findings** so the only live defects are the new eight: restore the fail-closed `transfer-ownership` (let the throw propagate), sanitize the invoice-note sink with `DOMPurify` (and drop the `biome-ignore`), add the `org.ownership-transferred` `logAudit` write, ship the CSP base + per-request nonce in `proxy.ts` + the five static headers in `next.config.ts`, move `RESEND_API_KEY` to the `server` partition + a Server Action, wrap the reset route in dual-keyed `safeLimit`, restore the pnpm 11 supply-chain defaults (`minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, `strictDepBuilds: true`) + bump the advisory pin, route `delete-account` through the async `deleteUser` job + anonymize audit rows. The 082 bonus #10 (`safeLimit` bypass) is re-seeded here as new bonus 10's neighbor — see below; the 082 consent finding is *re-exposed* from the analytics side as new finding 4.
   - **Note on `proxy.ts` after the CSP pre-fix:** 082's `proxy.ts` had no nonce/CSP. Pre-fixing finding 4 means `proxy.ts` now mints a nonce and sets CSP. The *new* correlation-ID middleware (finding 3) is wired into this same `proxy.ts` by slice S3 — so the scaffolded `proxy.ts` ships the CSP+nonce (healthy) but **no `x-request-id`** (seeded finding 3).

### The eight seeded defects (NEW; seeded-broken, NOT stubbed)

Plant each as real, compiling, rendering deviations from the now-healthy lineage. Findings 1–4 (observability) ship in a *broken/absent* state the slices will wire; findings 5–8 (performance) ship as *live defects* the slices document (only 6 is fixed in-place).

**Observability (the slices WIRE these — scaffold them broken):**

1. **Sentry not wired (lesson 3).** No `instrumentation-client.ts`, no `sentry.server.config.ts`, no `sentry.edge.config.ts`, no `instrumentation.ts`; `next.config.ts` is **not** wrapped with `withSentryConfig`. Ship a provided **throw route** `src/app/api/test/throw/route.ts` (`export function GET() { throw new Error('Sentry smoke test'); }`) so the deliberate-throw proof has a target — hitting it renders the default Next error page and produces no Sentry event. `@sentry/nextjs` is in `package.json`; `SENTRY_*` are absent from `src/env.ts` (slice S2 adds them).
2. **Structured-log secret leak (lesson 4).** `src/lib/logger.ts` Pino instance has an **empty/absent `redact` slot** and a webhook seam (or a `logger.info({ headers })`-style call in `src/app/api/webhooks/stripe/route.ts`) that serializes the full request including the `stripe-signature` header. The drop-list and `PII_KEYS` do not exist yet.
3. **Missing request correlation IDs (lesson 4).** `src/proxy.ts` sets no `x-request-id`; `src/lib/request-context.ts` does **not** exist; the logger has no `requestId` mixin; log lines and Sentry events for one request can't be joined.
4. **PostHog consent gate missing (lesson 5).** `src/app/_components/providers.tsx` loads `posthog-js` **unconditionally** (not behind a consent-gated dynamic import) and calls `posthog.init(key, { opt_out_capturing_by_default: false })`; no `ConsentProvider`/`useConsent()` is read; `src/lib/analytics/consent.ts` does **not** exist. PostHog fires on first load. (This is the 082 consent finding re-exposed from the analytics side.)

**Performance (the slices DOCUMENT these; only #6 is fixed in-place):**

5. **RSC waterfall (lesson 6).** `src/app/(protected)/dashboard/page.tsx` awaits `getCurrentUser()` → `getOrganization(user.orgId)` → `listInvoices({ orgId })` → `listMembers(orgId)` **sequentially**; `invoices` and `members` have no dependency on each other. The page reads request-time data, so it ships a segment `loading.tsx` (Cache Components Suspense seam). Renders correctly, just slowly. Seed enough invoices/members that the staircase is visible in a trace.
6. **Barrel import of `lucide-react` (lesson 6).** `src/app/(protected)/layout.tsx` imports ~a dozen icons via the `lucide-react` barrel (`import { Home, FileText, Settings, ... } from 'lucide-react'`), and `next.config.ts` does **not** list `lucide-react` under `experimental.optimizePackageImports`. (Slice S6 adds the one line.) Use only non-brand glyphs (lucide 1.x dropped brand icons).
7. **Missing `preload` on the LCP image (lesson 2, the reference finding).** `src/app/(marketing)/page.tsx` renders a hero via `next/image` with `src`/`alt`/`width`/`height` but **no `preload`**. The `@next/next/no-img-element` ESLint rule is not configured. Renders fine.
8. **N+1 in the invoice list (lesson 6).** A **dedicated new helper** `src/db/queries/invoices-with-customer.ts` (a `listInvoicesWithCustomer` the dashboard calls — kept separate from the healthy 082 `src/db/queries/invoices.ts`, whose `listInvoices` already uses the relations API and must stay healthy; a separate file also keeps the N+1 grep falsifiable since `invoices.ts`'s `countInvoices` legitimately uses `db.select().from(invoices)`) runs `db.select().from(invoices)` then **loops** to fetch each invoice's customer with a separate query. The relations API (`db.query.invoices.findMany({ with: { customer: true } })`) is the documented fix. Renders correct data, 1+N queries.

**The two bonus defects (planted, acknowledged not required):**
- **9 (marketing-page font via raw `<link>`).** `src/app/(marketing)/layout.tsx` (or the marketing page head) loads a web font via a raw `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` instead of `next/font`. Same LCP-path discipline as finding 7.
- **10 (missing composite `(org_id, created_at)` index on `invoices`).** The `invoices` table in `src/db/schema.ts` ships **without** the composite `(organizationId, createdAt)` index (drop it from the 082 lineage if present, or confirm absent). Proven with `EXPLAIN ANALYZE` (Seq Scan + in-memory sort). Bonus 10's fix *generates a migration* — the target ships `drizzle-kit` configured.

### The `findings/` scaffold (placeholders the slices fill)

At the repo root (NOT under `src/`), ship `findings/` exactly as `start/` carries it:

- `findings/template.md` — **provided in full** (the rule-location-consequence-fix template, verbatim: `# Finding NNN — <short title>`, `**Category:**`, `**Severity:**`, `## Rule`, `## Location`, `## Consequence`, `## Fix`). The contract; never a placeholder.
- `findings/001-sentry-not-wired.md` … `findings/008-n-plus-1-invoices.md` — **placeholders**: each ships the four section headers with empty bodies + a `<!-- TODO(L<n>) — <one-line> -->` marker naming the owning lesson. Slices overwrite the bodies. (Numbering → lesson: 001→L3, 002→L4, 003→L4, 004→L5, 005→L6, 006→L6, 007→L2, 008→L6. Findings 002 and 003 are both filled in L4; findings 005/006/008 are filled in L6.)
- `findings/screenshots/` — empty dir (slice S5 records the analyzer before/after here as `before-barrel.png`/`after-barrel.png`; the pipeline cannot produce live analyzer output, so ship a `.gitkeep` and let the lesson's by-hand step capture the real images — the finding's *prose* and the embed reference are the checkable deliverable).
- `findings/out-of-scope.md` — **placeholder**: header + `<!-- TODO(L6) — observations outside the eight categories -->`.
- `findings/SUMMARY.md` — **placeholder**: a coverage-scorecard header + `<!-- TODO(L7) — coverage count, deliberate misses, bonus findings 9/10, per-finding senior-reach detail, personal checklist -->`.

### Provided audit-reading affordances

The audit reads the running app + source side-by-side, so the target must be navigable and the fingerprints reachable:

- The **marketing page** renders on `/` (unauthenticated) with the hero `<Image>` (finding 7) and the raw-`<link>` font (bonus 9). `data-testid="marketing-hero"`.
- The **authenticated dashboard** loads on `/dashboard` as the seeded admin (the 059/067 dev acting-identity override carries in), with the sequential-await RSC body (finding 5). `data-testid="dashboard"`.
- The **authenticated layout** renders the nav with the barrel-imported icons (finding 6). `data-testid="app-nav"`.
- The **throw route** `GET /api/test/throw` throws on hit (finding 1's proof target).
- A **README** documents the setup ladder (clone, `pnpm install`, `cp .env.example .env.local`, populate Sentry/PostHog keys, `docker compose up -d`, `pnpm db:migrate && pnpm db:seed`, `pnpm dev`), names the eight categories, the hybrid wire-vs-document split, the honor-system answer-key rule, and points at `findings/template.md`.

### Schema, seed, migrations

- Carry the 082 schema. **Add a `customers` table** (or `customerId` FK on `invoices` referencing it) if the lineage models the customer as a denormalized `customerName` string only — finding 8's N+1 needs a real per-invoice customer row to loop over and a real relation for the documented fix. Declare the Drizzle relation (`invoicesRelations` → `one(customers, ...)`). **Drop the composite `(organizationId, createdAt)` index from `invoices`** (bonus 10) — keep only the PK so `EXPLAIN ANALYZE` shows a Seq Scan.
- `scripts/seed.ts` — extend the 082 seed: the seeded admin + org, a `customers` set, and **enough invoices (≥ ~30) each linked to a customer** so the dashboard's RSC waterfall (finding 5) and the N+1 (finding 8) have a visible staircase and the index scan (bonus 10) is non-trivial; ≥ ~3 team members. Deterministic, fixed ids, idempotent `reset()` + direct inserts (drizzle-seed cannot seed constraint-heavy tables). Seed emails under `@example.com`.
- Migrations: carry the 082 set + the `customers` migration; **do not** ship the composite-index migration (bonus 10 generates it).

### Dependencies

Carry the 082 union at its pinned versions, with these additions/changes for Unit 19:
- **`@sentry/nextjs@^10.57.0`** (the Next.js 16 SDK — `instrumentation-client.ts` + `withSentryConfig` + `onRequestError`). Present in `package.json` from scaffold; the wiring is slice S2. It pulls in `@sentry/cli` (a postinstall-build dep), so `pnpm-workspace.yaml` **must** add `'@sentry/cli': false` to `allowBuilds` (acknowledge-but-skip — the build downloads a source-map-upload binary not needed in this pipeline; without the entry a cold `pnpm install`/`next build` hard-fails `ERR_PNPM_IGNORED_BUILDS` under the locked `strictDepBuilds: true`, same mechanism as `sharp`/`esbuild`).
- **`posthog-js@^1.386.6`** — carried from 082 (already present, ungated). The consent gate is slice S4.
- **`@vercel/analytics@^2.0.1`** + **`@vercel/speed-insights@^2.0.0`** — the cookieless floor from 093 L1, mounted once in `app/layout.tsx` (no consent gate — deliberate, must not be "fixed"). Provided healthy by the scaffolder (not a finding). (`@vercel/speed-insights` has no `2.0.1` release — `2.0.0` is its latest 2.x; do not pin `^2.0.1`, which fails to resolve.)
- **`pino@^9.14.0`** — carried from 082 (`lib/logger.ts` exists, leaking). The redactor + correlation are slice S3.
- **`uuidv7@^1.0.2`** — carried; `proxy.ts` mints `x-request-id` via `uuidv7()` (slice S3).
- The Turbopack analyzer needs **no dependency** (`pnpm next experimental-analyze` is built in).
- Carry: `next@16.2.7`, `react`/`react-dom@19.2.4`, `better-auth@^1.6.14`, `drizzle-orm@^0.45.1`, `drizzle-kit@^0.31.5`, `drizzle-zod@^0.8.0`, `drizzle-seed@^0.3.1`, `postgres@^3.4.7`, `@t3-oss/env-nextjs@^0.13.11`, `zod@^4.4.3`, `resend@^6.12.4`, `react-email@^6.5.0`, `radix-ui@^1.4.3`, `stripe@^22.2.0`, `@upstash/ratelimit@^2.0.8`, `@upstash/redis@^1.38.0`, `@trigger.dev/sdk@^4.4.0`, `next-themes@^0.4.6`, `lucide-react@^1.17.0` (no brand icons), `vitest@^4.1.8`, `@biomejs/biome@2.4.16`, `typescript@^6.0.3`, `babel-plugin-react-compiler@1.0.0`, `kysely@0.28.17` (override), pnpm `11.3.0`.

### Scripts

Keep all 082 scripts verbatim. `package.json` defines `"verify": "biome ci . && tsc --noEmit && next build"` and `"test:lesson": "node scripts/test-lesson.mjs"` (the carried node wrapper — reads `process.argv[2]`, runs exactly one `tests/lessons/Lesson <n>.test.ts` by absolute path via `pnpm exec vitest run <file>`; confirmed it narrows to one file with no glob OR-match, works in `start/`, node env, no DOM — re-confirm before locking). Plus `dev`/`build`/`start`/`format`/`lint`/`check`/`db:generate`/`db:migrate`/`db:studio`/`db:seed`/`auth:generate`/`email`/`preinstall` carried. Vitest (`^4.1.8`) is already in `devDependencies` from the fork.

### Lesson test files

Ship `tests/lessons/Lesson 2.test.ts` … `Lesson 7.test.ts` as `describe.todo` placeholders (node env, no DOM). `project-lesson-test-coder` fills them later; each gate inlines its own helpers — no shared helpers module. The gates assert the **observable shape of each finding file** (the four sections populated, the named rule, the location names a command/file, the fix names the senior reach) and, for the wiring lessons (3/4/5), the **source shape of the installed seam** (Sentry config files export an init; `lib/logger.ts` exports a `redact`; `proxy.ts` references `x-request-id`; the provider inits with `opt_out_capturing_by_default: true`) — read as text/`readFileSync` source-shape probes, never importing the seam (the seam doesn't exist in `start/`) and never interaction. Keep `tests/lessons/**` **out of the typecheck scope** (`tsconfig` `exclude`, as carried from the 082 fork) so a gate forward-referencing `solution/`-only wiring never fails `start/`'s `tsc --noEmit`.

### Scaffold acceptance

After scaffolding, `pnpm verify` passes in `solution/` **with all ten new defects in the seeded-broken state** (they compile and build green — that is the premise; absent Sentry config builds fine, the ungated PostHog builds fine, the un-`optimizePackageImports` build is just heavier). With Docker Postgres up + `pnpm db:migrate && pnpm db:seed`, `pnpm dev` renders: the marketing page with the hero (finding 7) and raw-`<link>` font (bonus 9); `/dashboard` as the seeded admin with the slow sequential RSC body (finding 5) and the barrel-icon nav (finding 6); `GET /api/test/throw` renders the default Next error page with no Sentry event (finding 1); a webhook replay logs the `stripe-signature` in the clear (finding 2); a fresh load fires a PostHog request (finding 4). `findings/` holds `template.md` + eight numbered placeholders + `screenshots/.gitkeep` + empty `SUMMARY.md`/`out-of-scope.md`.

## Slices

Slices run in order. Observability slices (S2/S3/S4) **edit real target code** to wire the seam *and* fill the matching finding file. Performance slices (S1/S5/S6) fill a finding file; S5 additionally adds the one barrel-fix line. S7 closes with `SUMMARY.md` + `out-of-scope.md` + the two bonus findings. Every finding fills all four sections: **Rule** (the named chapter-092/093/094 rule + lesson section), **Location** (file + line range, *and* the diagnostic command/surface that surfaced it — grep, DevTools trace, Network panel, `pnpm next experimental-analyze`, `.toSQL()`, `EXPLAIN ANALYZE`), **Consequence** (operator- or user-visible: a timing, a leaked secret, lost data — never "code smell," no "could potentially"), **Fix** (for the wired findings the *seam installed*; for the documented findings the senior reach named by its helper/config). A severity + two-line justification.

### Slice S1 — Finding 7: the missing `preload` (the reference finding)

Scope: **Lesson 2.** Author `findings/007-missing-priority.md` — the worked reference that models the audit method and the template shape end-to-end. Category: LCP / Core Web Vitals (094 L2). Document-only; no code edit.

In scope:
- **Rule:** `preload` on the LCP element exactly once per page — the prop renamed from `priority` in Next.js 16 (094 L2), linked by section.
- **Location:** `src/app/(marketing)/page.tsx` with the line range of the hero `<Image>` shipping `src`/`alt`/`width`/`height` but no `preload`. Name the diagnostic surface: the DevTools Performance LCP marker landing on the hero at ~4 s (the running app surfaces it before source). The audit-method discipline ("open the running app, hold it beside source, read one finding's fingerprint, write it before moving on") is established here.
- **Consequence:** LCP regression past 2.5 s; search-ranking exposure; slow first impression — user-visible, with the timing.
- **Fix:** add `preload` to the hero `<Image>`; add the `@next/next/no-img-element` ESLint rule at error as regression prevention; `width`/`height` as the CLS protection layer. (Documented, not patched — the marketing page keeps the defect.)
- Severity justified in two lines.

Out of scope: patching the target; any other category. The `<!-- TODO(L2) -->` marker is removed.

Contracts: `findings/007-missing-priority.md` fully populated; the audit-method rhythm established for S2–S7.

Screenshot: none. (The marketing hero *is* screenshotted, but on S6 — the last slice that touches the marketing surface, when bonus 9's font finding also reads against it. See S6.)

### Slice S2 — Finding 1: wire Sentry

Scope: **Lesson 3.** **Wire Sentry across client/server/edge** so a deliberate throw lands decoded, and author `findings/001-sentry-not-wired.md`. Category: Sentry init + source maps + release (092 L1).

In scope (code, edited in the target):
- Create `instrumentation-client.ts` (client `Sentry.init`), `sentry.server.config.ts`, `sentry.edge.config.ts`, each calling `Sentry.init({ dsn, tracesSampleRate, release })`; `instrumentation.ts` exporting `register` (lazy-imports the server/edge config by `NEXT_RUNTIME`) and `export const onRequestError = Sentry.captureRequestError`.
- Wrap `next.config.ts` with `withSentryConfig(config, { silent: true, org, project, widenClientFileUpload: true })`. (Do **not** pass `hideSourceMaps` — removed in `@sentry/nextjs` v9+; hidden source maps are now the default. Do **not** pass `disableLogger` — deprecated in v10 and a no-op under the locked Turbopack build, where it emits a per-build deprecation warning; the SDK's `webpack.treeshake.removeDebugLogging` replacement is webpack-only and also inert under Turbopack.)
- Add to `src/env.ts`: `SENTRY_DSN` (client partition), `SENTRY_AUTH_TOKEN` (server, build-only), `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` (computed from `VERCEL_GIT_COMMIT_SHA`, falling back to a static dev default — not hardcoded `"v1.0.0"`). Config files read `process.env` directly (intentional, outside the `env` schema).
- Keep `tracesSampleRate: 1.0` for local visibility (note in the finding that production drops to 0.1–0.2 per 092 L1). Leave a clear `beforeSend` slot — the redactor that fills it is S3's work, named in this finding's Fix as the next seam.

In scope (finding):
- **Rule:** Sentry init across client/server/edge with source maps + release tag + breadcrumbs (092 L1), linked by section.
- **Location:** the three config files + `instrumentation.ts` (created) and `next.config.ts` (wrapped); name the diagnostic surface: hitting `/api/test/throw` and watching the default error page render with no Sentry event (the broken state).
- **Consequence:** errors vanish or arrive as minified noise no one can act on at 3am — operator-visible.
- **Fix:** the installed seam — name `withSentryConfig`, the source-map upload gated on `SENTRY_AUTH_TOKEN` at build time, and the git-SHA release; call out the two traps (missing auth token → "line 1 column 12345" minified stack; hardcoded release ties a week's errors to one version).
- Severity justified.

Out of scope: the redactor / correlation-ID context (S3); the consent gate (S4); patching any performance finding.

Contracts: Sentry wired; `findings/001-sentry-not-wired.md` populated, its Fix naming the seam.

Screenshot: none. (The proof surface is the Sentry dashboard — not in the render pipeline. No new app *route* surface; the throw route renders only the framework error page.)

### Slice S3 — Findings 2 & 3: the production logger seam

Scope: **Lesson 4.** **Harden the logger** — one redactor reused by Pino and Sentry's `beforeSend`, plus a request-correlation-ID middleware — and author `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md`. Categories: 3am-rule / PII exclusion (092 L3) and correlation IDs (092 L2).

In scope (code, edited in the target):
- In `src/lib/logger.ts`: declare `redact(payload: unknown): unknown` (or the Pino `redact` path-config + a `PII_KEYS` constant) carrying the canonical drop-list (`authorization`, `cookie`, `stripe-signature`, `password`, `token`, `apiKey`, `*_KEY`, `*_SECRET`) — the **single** redaction seam; wire it into Pino's `redact` config and add a `requestId` mixin (`logger.child(getRequestContext() ?? {})` per seam, or a `mixin` reading the context). Remove the full-request serialization in the webhook seam.
- Create `src/lib/request-context.ts` exporting `runWithContext` and `getRequestContext` over an `AsyncLocalStorage` (`RequestContext = { requestId: string; userId?: string; orgId?: string }`).
- In `src/proxy.ts`: read `x-request-id` from the request or mint `uuidv7()`, echo it on request + response headers, open a `runWithContext` scope. (This `proxy.ts` already ships the CSP+nonce from the 082 pre-fix — add the correlation middleware alongside, do not remove the CSP.)
- In the webhook handler (`src/app/api/webhooks/stripe/route.ts`): recover the same ID from the `x-request-id` header and open its own `runWithContext` scope (the proxy scope does not propagate into route handlers).
- Wire the **same `redact`** into Sentry's `beforeSend` in `sentry.server.config.ts`. In that same `beforeSend`, read the request-scoped id from `getRequestContext()` and attach it as **context** (`event.contexts.request = { ...event.contexts?.request, requestId }`, **not** a tag — `requestId` is high-cardinality per 092 L2) so a log line and its Sentry event join on one value. (Do this inside `beforeSend` — it runs per event with the request scope live; a module-scope `setContext` in the config file runs once at boot with no `requestId` and would attach nothing.)

In scope (findings):
- **002 (leak):** Rule = the 3am rule + PII/secrets exclusion (092 L3); Location = `lib/logger.ts` (the leaking serializer) + the surface (a webhook replay printing the `stripe-signature` in the dev console); Consequence = a signing secret in the logs is a 3am-rule violation (operator-visible secret exposure); Fix = the single `redact` seam reused in Pino + `beforeSend` (name "one redactor, two callers"; the drop-list includes wildcard `*_KEY`/`*_SECRET`).
- **003 (correlation):** Rule = request-scoped correlation IDs via `AsyncLocalStorage` (092 L2); Location = `proxy.ts` (no `x-request-id`) + `lib/logger.ts` (no mixin) + the absent `lib/request-context.ts`; Consequence = a log line and the Sentry event for one request can't be joined — slower 3am incident triage; Fix = `AsyncLocalStorage` (not module-level state), the `mixin` in Pino, the request-scoped context join in Sentry's `beforeSend` (`event.contexts.request = { requestId }` — context, not a tag), `proxy.ts` echoing the response header so downstream services join.
- Each severity justified.

Out of scope: the consent gate (S4); patching performance findings; a Vercel Drain (deploy-time follow-up, nameable not wired).

Contracts: the logger is safe and correlated; `redact` is the single seam reused in Pino + `beforeSend`; `findings/002-log-secret-leak.md` and `findings/003-missing-correlation-id.md` populated.

Screenshot: none. (Proof surfaces are the dev console + the Sentry dashboard — not in the render pipeline.)

### Slice S4 — Finding 4: gate PostHog behind consent

Scope: **Lesson 5.** **Flip PostHog capture off by default and route grant/revoke through one seam**, and author `findings/004-posthog-consent-gate.md`. Category: consent-gated analytics (093 L3 + 081 L5).

In scope (code, edited in the target):
- In `src/app/_components/providers.tsx`: restore the **consent-gated dynamic import** (the `posthog-js` module loads only on the consented branch) and init PostHog with `opt_out_capturing_by_default: true` (belt one) using the canonical `posthog.init` shape (`api_host: '/ingest'`, `ui_host`, `defaults: '2026-01-30'`, `capture_pageview: false`). Nest under the `ConsentProvider` from 081 L5 (`useConsent()` reads `consent.analytics`).
- Create `src/lib/analytics/consent.ts`: `grantAnalyticsConsent()` calls `posthog.opt_in_capturing()`, sets the `consent.analytics` cookie, and captures a one-off `analytics_consent_granted` event; `revokeAnalyticsConsent()` calls `posthog.opt_out_capturing()` and clears the cookie.
- Route the consent banner's accept/reject actions through those two functions (not an inline cookie write).
- Add the **session-continuity** re-call: on mount, if the `consent.analytics` cookie is already present, re-call `opt_in_capturing()` (init ran with capture off after a reload).
- Confirm the `/ingest` rewrites + `skipTrailingSlashRedirect: true` in `next.config.ts` are present (carried from the lineage; add if absent).

In scope (finding):
- **Rule:** consent gate before any non-essential analytics fires — the `opt_out_capturing_by_default: true` + explicit `opt_in_capturing()` pair (093 L3, 081 L5), linked by section.
- **Location:** `app/_components/providers.tsx` (ungated init) + the absent `lib/analytics/consent.ts` + the banner that wrote the cookie inline; surface = DevTools Network filtered to `posthog`/`ingest` showing a request on first load pre-consent.
- **Consequence:** behavioral events captured without consent — a privacy/GDPR exposure and a compliance fail; user-visible (data leaves the browser before opt-in).
- **Fix:** the load-bearing pair (`opt_out_capturing_by_default: true` **and** `posthog.opt_in_capturing()` on grant — default-out alone never captures even after consent; a banner acting only on "Accept" leaves "Reject" in the default state, so both route through one `consent.ts` seam) + the session-continuity re-call on mount. Name `grantAnalyticsConsent()`/`revokeAnalyticsConsent()` as the single seam (so feature engineers don't reach for `opt_in_capturing()` directly).
- Severity justified.

Out of scope: feature flags / replay / server-side capture; patching performance findings.

Contracts: PostHog captures only post-consent; `lib/analytics/consent.ts` is the single seam; `findings/004-posthog-consent-gate.md` populated.

Screenshot: none. (Proof surfaces are DevTools Network + the PostHog dashboard — not in the render pipeline.)

### Slice S5 — Findings 5, 6, 8: the performance findings + the barrel fix

Scope: **Lesson 6.** Author `findings/005-rsc-waterfall.md`, `findings/006-barrel-import.md`, and `findings/008-n-plus-1-invoices.md`; **fix the barrel import in-place** (finding 6 only) to produce the analyzer before/after. Categories: RSC waterfall (094 L6), barrel/analyzer (094 L3/L4), N+1 (094 L7).

In scope (code, edited in the target — barrel only):
- Add `lucide-react` to `experimental.optimizePackageImports` in `next.config.ts` (the single line). This is the one in-place performance fix; the waterfall, N+1, and image are documented, not patched.

In scope (findings):
- **005 (waterfall):** Rule = dependency-check before each `await` (094 L6); Location = `app/(protected)/dashboard/page.tsx` line range, surface = a DevTools/Sentry trace showing four sequential spans with idle gaps (read the trace first, then confirm in source); Consequence = ≈320 ms render where ≈240 ms was reachable (operator-visible timing); Fix = `Promise.all([listInvoices({ orgId }), listMembers(orgId)])` for the independent pair only — `user` → `org` stays sequential (not the "wrap everything" anti-pattern).
- **006 (barrel):** Rule = the barrel-export trap + `optimizePackageImports` (094 L3/L4); Location = `app/(protected)/layout.tsx` (barrel import) + `next.config.ts` (the missing list entry); surface = `pnpm next experimental-analyze` showing a ~600 KB `lucide-react` tile; Consequence = ~570 KB extra on every authenticated page, INP risk on slow mobile; Fix = add `lucide-react` to `optimizePackageImports` (the senior default over per-icon imports), `sideEffects: false` named for internal packages. **Embeds** `before-barrel.png` + `after-barrel.png` (captured by the lesson's by-hand analyzer run; the finding references both filenames in `findings/screenshots/`).
- **008 (N+1):** Rule = N+1 at the Drizzle layer (094 L7); Location = `src/db/queries/invoices-with-customer.ts` line range, surface = 1+N spans in a trace / `db.toSQL()` showing N customer selects; Consequence = 1+N queries per render, ≈50 ms avoidable round-trip at scale, connection-pool risk; Fix = `db.query.invoices.findMany({ with: { customer: true } })`, verified with `.toSQL()` (one lateral-join statement). Documented, not patched.
- Each severity justified. `findings/out-of-scope.md` is left for S7 (this slice does not touch it).

Out of scope: patching the waterfall, the N+1, or the image (documentation only); the bonus findings (S6/S7); `SUMMARY.md` (S7).

Contracts: the barrel-fix line added; `005`/`006`/`008` populated; `006` embeds the two screenshots.

Screenshot:
- **L6** (`/dashboard`, desktop 1280×900, state settled): the authenticated dashboard + nav rendering end-to-end after the barrel fix — the figure for the authenticated surface findings 5/6 read against (the nav with the optimized icons, the dashboard body). `data-testid="dashboard"`, `data-testid="app-nav"`.

### Slice S6 — bonus 9 (marketing-page font) + the marketing-hero figure

Scope: **Lesson 5 (optional finding) / Lesson 2 surface.** Author the optional `findings/009-missing-next-font.md` (bonus 9, the raw-`<link>` font on the marketing page — same LCP-path discipline as finding 7, named in lesson 5 as the optional finding the student may write). Document-only. This is the **last slice that touches the marketing surface**, so it owns the marketing-hero screenshot (the surface finding 7 reads against).

In scope (finding):
- **009 (font):** Rule = `next/font` ships fallback metrics so font-swap doesn't reflow (094 L1/L2, LCP + CLS); Location = `app/(marketing)/layout.tsx` (or the page head) raw `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`; surface = the Network panel showing the render-blocking font request + the LCP-path discipline; Consequence = late font discovery delays LCP + font-swap reflow risks CLS; Fix = `next/font` (self-hosted, fallback metrics). Documented, not patched.
- Severity justified.

Out of scope: patching the marketing page; `SUMMARY.md` (S7).

Contracts: `findings/009-missing-next-font.md` populated.

Screenshot:
- **L2** (`/`, desktop 1280×900 + mobile 390×844, state settled): the marketing hero rendering — the figure for finding 7's LCP surface (lesson 2's reference finding). Responsive because the hero is a marketing surface the lesson reads at both widths for the LCP discussion. `data-testid="marketing-hero"`.

### Slice S7 — Commit, score, and the two bonus findings

Scope: **Lesson 7.** Author `findings/SUMMARY.md` and `findings/out-of-scope.md`, and document bonus finding 10 (the missing composite index) — inline in `SUMMARY.md` or as `findings/010-composite-index.md`. This slice produces the answer key's culminating scorecard.

In scope:
- `findings/SUMMARY.md`: the coverage count (8/8 floor → 9/10 or 10/10 with bonuses), a one-line cause for any deliberate miss, the **clause-by-clause scoring rubric** (rule + location = floor; consequence + fix-detail = reach; partial credit when rule + location match but the fix is less thorough — e.g. per-icon vs `optimizePackageImports`, `innerJoin` vs the relations API), the **senior-reach detail per finding** students most often miss (F1 release from git SHA + `widenClientFileUpload` + source-map upload gated on `SENTRY_AUTH_TOKEN`; F2 one `redact`, two callers + wildcard patterns; F3 `AsyncLocalStorage` + requestId in context (not a tag) + response header; F4 the init-flag + runtime-opt-in pair + session continuity; F5 `Promise.all` independent pair only; F6 `optimizePackageImports` not per-icon; F7 `preload` once + `no-img-element` + `width`/`height`; F8 `findMany({ with })` + `.toSQL()`), and a **personal diagnostic checklist** folding every category's surface (DevTools trace, Network panel, the throw route, `experimental-analyze`, `EXPLAIN ANALYZE`). Pastes the final analyzer treemap reference as secondary evidence.
- **Bonus 10 (composite index):** named — the missing `(organizationId, createdAt)` index on `invoices`, proven with `EXPLAIN ANALYZE` (Seq Scan + in-memory sort → Index Scan after the migration). Fix described: declare the composite index in `src/db/schema.ts` (third-arg index array, leftmost-prefix `org_id` then `created_at` then `id`) and **generate the migration with `drizzle-kit`** — the finding *names* this as the fix and notes that naming it without generating the migration is half-credit. Like the analyzer screenshots, the actual migration generation is a by-hand student step the answer key describes; **the slice does NOT commit a composite-index migration to `solution/drizzle/`** (so `start/` and `solution/` drizzle sets stay identical and the `invoices` table ships index-less in both). The query is not rewritten.
- **Bonus 9** is cross-referenced (authored as `009-*.md` in S6); `SUMMARY.md` lists it toward 9/10.
- `findings/out-of-scope.md`: at least one observation outside the eight categories (e.g. a code-quality note), demonstrating the discipline of not scoring out-of-scope items as findings.
- Restate the project's through-threads (observability gaps close before launch, performance gaps go to the backlog with measured impact; the single-seam-to-lint pattern; coverage over depth) and the forward pointers (chapter 097 wires the CI gates, chapter 098 wires the Vercel Drain, chapter 104 reviews a seeded PR).

Out of scope: patching any defect; the honor-system commit/checkout dance (the student's manual workflow; the answer key is `solution/findings/`).

Contracts: `findings/SUMMARY.md` + `findings/out-of-scope.md` populated; bonus 10 documented (no committed migration — described as a by-hand step); the answer key complete (8 findings + 2 bonus + scorecard).

Screenshot: none.

## Start derivation

Derive `start/` from the completed `solution/` by **(a) reverting the observability wiring to its seeded-broken state, (b) reverting the barrel-fix line, and (c) emptying the finding bodies to placeholders.** Performance source defects 5/7/8 and bonus-9's raw font are byte-identical in both trees (never patched). Each reverted/stubbed file's body includes a `// TODO(L<n>) — <task>` marker (or the file's native comment syntax) naming the lesson that owns completion, so `rg "TODO" start/` enumerates the student work.

**Observability wiring — revert to seeded-broken (the inverse of S2/S3/S4):**
- **Delete** `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` (finding 1, L3). **Unwrap** `next.config.ts` (remove `withSentryConfig`) and **remove** the `SENTRY_*` keys from `src/env.ts`. Leave a top-of-file `// TODO(L3) — wire Sentry: instrumentation-client.ts + sentry.server/edge.config.ts + instrumentation.ts + withSentryConfig + SENTRY_* env` marker in `next.config.ts` and `src/env.ts`. (The throw route `api/test/throw/route.ts` stays — it is the provided proof target, not student work.)
- **Revert** `src/lib/logger.ts` to the leaking, un-redacted, un-mixed form (no `redact`, no `PII_KEYS`, the webhook seam serializing the full request) with a `// TODO(L4) — add the single redact seam (reused in Pino + Sentry beforeSend) and the requestId mixin`. **Delete** `src/lib/request-context.ts`. **Revert** `src/proxy.ts` to mint no `x-request-id` (keep the CSP+nonce) with `// TODO(L4) — mint/echo x-request-id and open a runWithContext scope`. **Revert** the webhook handler's `runWithContext` recovery + `sentry.server.config.ts` is already deleted (its `beforeSend` redactor reverts with it). Mark the webhook seam `// TODO(L4) — recover x-request-id and open a runWithContext scope`.
- **Revert** `src/app/_components/providers.tsx` to the ungated `posthog.init(key, { opt_out_capturing_by_default: false })` without the dynamic import / `ConsentProvider`, with `// TODO(L5) — gate PostHog: dynamic import + opt_out_capturing_by_default: true + route grant/revoke through lib/analytics/consent.ts`. **Delete** `src/lib/analytics/consent.ts`. Revert the consent banner to the inline-cookie form.

**Barrel fix — revert (the inverse of S5's one line):**
- **Remove** `lucide-react` from `experimental.optimizePackageImports` in `next.config.ts` with `// TODO(L6) — add lucide-react to optimizePackageImports (barrel fix, finding 6)`.

**Findings — empty to placeholders** (template section headers + a `<!-- TODO(L<n>) — <task> -->` marker each; `rg "TODO" start/findings/` enumerates them):
- `findings/001-sentry-not-wired.md` (L3) — `<!-- TODO(L3) — document + the Sentry wiring: rule (092 L1), location (the three config files + instrumentation.ts + next.config.ts), surface (/api/test/throw → no event), consequence (3am minified noise), fix (withSentryConfig + source maps + git-SHA release) -->`.
- `findings/002-log-secret-leak.md` (L4) — `<!-- TODO(L4) — document the stripe-signature leak in lib/logger.ts: rule (092 L3, 3am rule), location + webhook-replay surface, consequence (secret in logs), fix (one redact seam reused in Pino + beforeSend) -->`.
- `findings/003-missing-correlation-id.md` (L4) — `<!-- TODO(L4) — document the missing requestId: rule (092 L2), location (proxy.ts + logger.ts + absent request-context.ts), consequence (log/Sentry can't join), fix (AsyncLocalStorage + mixin + requestId joined as context in beforeSend, not a tag) -->`.
- `findings/004-posthog-consent-gate.md` (L5) — `<!-- TODO(L5) — document the ungated PostHog: rule (093 L3 + 081 L5), location (providers.tsx) + Network surface, consequence (capture pre-consent), fix (opt_out_by_default + opt_in_capturing pair + consent.ts seam + session continuity) -->`.
- `findings/005-rsc-waterfall.md` (L6) — `<!-- TODO(L6) — document the sequential awaits in dashboard/page.tsx: rule (094 L6), location + trace surface, consequence (≈320ms vs ≈240ms), fix (Promise.all the independent pair only) -->`.
- `findings/006-barrel-import.md` (L6) — `<!-- TODO(L6) — document the lucide-react barrel in (protected)/layout.tsx: rule (094 L3/L4), location + analyzer surface, consequence (~570KB extra), fix (optimizePackageImports), embed before/after-barrel.png -->`.
- `findings/007-missing-priority.md` (L2) — `<!-- TODO(L2) — document the missing preload on the marketing hero <Image>: rule (094 L2, preload renamed from priority), location + LCP-marker surface, consequence (LCP > 2.5s), fix (preload once + no-img-element + width/height) -->`.
- `findings/008-n-plus-1-invoices.md` (L6) — `<!-- TODO(L6) — document the N+1 in db/queries/invoices-with-customer.ts: rule (094 L7), location + .toSQL() surface, consequence (1+N queries), fix (findMany with: { customer: true }) -->`.
- `findings/out-of-scope.md` (L6) — `<!-- TODO(L6) — observations outside the eight categories -->`.
- `findings/SUMMARY.md` (L7) — `<!-- TODO(L7) — coverage count, deliberate misses, bonus findings 9 (next/font) + 10 (composite index), per-finding senior-reach detail, personal diagnostic checklist -->`.
- `findings/009-missing-next-font.md` and `findings/010-composite-index.md` are **optional** bonus files; if S6/S7 authored them as standalone files, revert their bodies to a placeholder + `<!-- TODO(L5/L7 — optional bonus) -->`; if they were inlined into other files, `start/` ships only `001`–`008` numbered files.

**Provided-and-identical in `start/`** (never reverted): `findings/template.md`, `findings/screenshots/.gitkeep`, the throw route, the `@vercel/analytics`/`@vercel/speed-insights` floor, the four performance source defects (5/7/8 + bonus-9 font), the dropped composite index (bonus 10), the entire 082-lineage backend with 082's findings pre-fixed, `tests/lessons/` placeholders, README/AGENTS/.env.example.

## Locked decisions

- **The deliverable is hybrid: real TS wiring for observability (findings 1–4) + Markdown for performance (findings 5–8).** The observability wiring is the diff between `start/` (seeded-broken) and `solution/` (wired). The performance findings are documented, never patched — the sole code edit on the performance side is the one `optimizePackageImports` line for finding 6. The RSC waterfall, the N+1, the missing `preload`, and the raw font are described in `findings/`, never patched; bonus 10's composite index is declared + migrated as evidence but the query is not rewritten. (Chapter framing.)
- **All ten new defects ship green in the seeded-broken state.** `pnpm verify` passes in `solution/` after scaffolding (before any slice) and in `start/`: absent Sentry config builds; ungated PostHog builds; un-`optimizePackageImports` builds (just heavier); the sequential RSC body and the N+1 loop compile and render correct data. The defects are deviations from the now-healthy 082 lineage (082's eight findings pre-fixed), planted at real call sites referencing the real seams.
- **`findings/` lives at the repo root**, not under `src/`. `template.md` + `screenshots/.gitkeep` are provided in both trees; `001`–`008` + `SUMMARY.md` + `out-of-scope.md` are placeholders in `start/`, filled in `solution/`. The two bonus files (`009`/`010`) are optional.
- **Finding-file contract** (every finding, enforced by static checks + lesson gates): the four template sections populated; **Rule** names the chapter-092/093/094 rule + lesson section; **Location** names the file/line range **and the diagnostic command/surface** (grep, DevTools trace, Network panel, `pnpm next experimental-analyze`, `.toSQL()`, `EXPLAIN ANALYZE`); **Consequence** is operator-/user-visible (a timing, a leaked secret, lost data), no "could potentially"; **Fix** names the installed seam (wired findings) or the senior reach by its helper/config (documented findings). A severity + two-line justification.
- **The eight categories are exhaustive for this pass.** Anything outside goes in `out-of-scope.md`, never scored. Bonus 9 (`next/font`) and 10 (composite index) are the senior reach above the 8/8 floor.
- **Canonical wiring shapes the slices must use** (from the continuity notes, overriding any chapter-outline drift):
  - **Sentry:** config lives in `instrumentation-client.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` (NOT in `instrumentation.ts` itself); `instrumentation.ts` exports `register` + `export const onRequestError = Sentry.captureRequestError`; `withSentryConfig(config, { silent, org, project, widenClientFileUpload: true })` — **only these four keys** (`hideSourceMaps` is removed in `@sentry/nextjs` v9+ and hidden source maps are the default; `disableLogger` is deprecated in v10 and inert/warning-emitting under Turbopack — passing either fails or warns); release computed from `VERCEL_GIT_COMMIT_SHA` (not hardcoded); config files read `process.env` directly (outside the `env` schema); `requestId` joins the Sentry event as **context** (`event.contexts.request = { requestId }`, set request-scoped inside `beforeSend` reading `getRequestContext()`), never a tag and never at module scope in the config file (there is no request at boot). `tracesSampleRate: 1.0` locally (note production 0.1–0.2). (Known caveat — a Next.js 16 + Turbopack `makeNodeTransport` server-event-drop issue exists upstream; immaterial here since the pipeline runs no live Sentry round-trip, but the lesson notes it.)
  - **Logger:** `redact` is the **single** seam in `lib/logger.ts`, reused in Pino's `redact` config AND Sentry's `beforeSend` ("one redactor, two callers"); drop-list `authorization`/`cookie`/`stripe-signature`/`password`/`token`/`apiKey`/`*_KEY`/`*_SECRET` + `PII_KEYS`; correlation via `AsyncLocalStorage` in `lib/request-context.ts` (`runWithContext`/`getRequestContext`), never module-level state; `proxy.ts` mints `uuidv7()` and echoes the response header; route handlers recover the ID from the header and open their own scope (the proxy scope does not propagate); the per-seam child is `logger.child(getRequestContext() ?? {})`.
  - **PostHog:** the canonical `posthog.init` shape (`api_host: '/ingest'`, `ui_host: 'https://eu.posthog.com'`, `defaults: '2026-01-30'`, `capture_pageview: false`, `opt_out_capturing_by_default: true`); belt two = the consent-gated dynamic `import('posthog-js')`; grant/revoke route through `lib/analytics/consent.ts` (`grantAnalyticsConsent`/`revokeAnalyticsConsent`); session-continuity re-call of `opt_in_capturing()` on mount when the cookie is present; `useConsent()`/`consent.analytics` from 081 L5. The `@vercel/analytics`/`@vercel/speed-insights` floor stays ungated (deliberate — 093 L1).
  - **Performance:** `optimizePackageImports` written under `experimental` (still experimental as of Next.js 16.2 — not a top-level key); the analyzer command is `pnpm next experimental-analyze [--output]` writing to `.next/diagnostics/analyze` (keep the `experimental-` prefix); `preload` is the Next.js 16 prop (`priority` is the deprecated alias); React `cache()` for request-scope dedup (never `unstable_cache`); Drizzle relations v1 `with: { customer: true }` emits one statement (the "relations silently N+1" fear is dead); the composite index name follows `(org_id, created_at, id)` leftmost-prefix.
  - **Audit events:** `entity.verb-pasttense`, single dot (carried from 082 — `org.ownership-transferred`, `account.deletion-completed` already pre-fixed); the new analytics consent event is `analytics_consent_granted` (a PostHog event name, snake_case, NOT an audit-log slug). The `Result` code set is the seven from 080 L2.
- **Real third parties are NOT live in the render pipeline.** The pipeline boots Docker Postgres + `db:migrate` + `db:seed` only — no Sentry/PostHog round-trip, no Stripe CLI, no Upstash, no Trigger.dev worker, no live Resend. The inspector boots the **wired `solution/`**; rendered checks target only what the seeded Postgres renders deterministically at first paint (the marketing hero, the authenticated dashboard + nav). The browser-invisible proof surfaces (the Sentry dashboard for findings 1/2/3, DevTools Network for finding 4, the analyzer treemap for finding 6, DevTools traces for findings 5/8) are **static checks on the source + by-hand checklist**, not rendered checks. The seeded target supplies dummy `.env` values (`SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `sk_test_…`, fake Upstash/Resend keys) so env-validation passes at build with no round-trip.
- **Structural single-slot / single-element invariants** (carried from the 082 lineage; the target must not render-break):
  - `(protected)/layout.tsx` resolves to one `<nav data-testid="app-nav">` + one `<main>{children}</main>` — never a bare sibling fragment dropped into a flex/grid parent (the ch035 fragment-flatten footgun). The barrel-imported icons live inside the single `<nav>`.
  - The marketing hero (`marketing-hero`) is one bounded element wrapping the `<Image>`; it must not flatten into siblings.
  - The dashboard (`dashboard`) is one bounded element; the RSC waterfall is internal to its data-fetching, not a layout split.
- **Stable selectors via `data-testid`.** Rendered checks read `data-testid`, never positional/text selectors. Canonical ids for the surfaces the checks touch: `marketing-hero`, `dashboard`, `app-nav`. (The 082/067/059 carry-in selectors stay as-is.)
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`), carried from the 082 fork unless noted:**
  - `tsconfig.json`: `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, both `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` in `include`, `"allowJs": false`, **no `baseUrl`** (TS 6 errors on it; `"paths": { "@/*": ["./src/*"] }` resolves under `moduleResolution: "bundler"`), `next-env.d.ts` excluded from Biome via `files.includes`.
  - `next.config.ts`: `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true` (needs `babel-plugin-react-compiler@1.0.0`), `turbopack: { root: __dirname }`. **Wrapped with `withSentryConfig` in `solution/`, unwrapped in `start/`.** `experimental.optimizePackageImports` lists `lucide-react` in `solution/`, omits it in `start/`. The `/ingest` rewrites + `skipTrailingSlashRedirect: true` are present in both (PostHog proxy, carried). Every page reading request-time data ships a segment `loading.tsx` (Cache Components Suspense seam) — the dashboard (finding 5's slow RSC body) and the invoices/settings routes each carry one. Dynamic `href` strings `import type { Route } from 'next'` + cast `as Route`.
  - `biome.json`: `"css": { "parser": { "tailwindDirectives": true } }`, `files.includes` ignores without trailing `/**`, `next-env.d.ts` excluded, `noImgElement: "off"` if the carried email/UI uses raw `<img>`. **The marketing raw-`<link>` font (bonus 9) is HTML, not a Biome rule; finding 7's `<Image>` keeps `next/image` so no `noImgElement` trip on the seeded image.** The 082 `dangerouslySetInnerHTML` sink is pre-fixed (sanitized) so its `biome-ignore` is removed — confirm no stray `biome-ignore` survives the pre-fix.
  - The `@next/next/no-img-element` rule (finding 7's recommended fix) lives in **ESLint** (`eslint-config-next/core-web-vitals`), not Biome — finding 7 *names* it as the regression-prevention fix but the rule is NOT added to the seeded target (adding it is the student's documented fix; the marketing page keeps the defect). Do not wire ESLint into `verify`.
  - `pnpm-workspace.yaml`: the healthy `allowBuilds: { sharp: true, esbuild: false, '@sentry/cli': false }` map (required so `next build` passes — `@sentry/cli` is the new Unit-19 entry, dragged in by `@sentry/nextjs`; acknowledge-but-skip its source-map-upload binary build) + the 082 carry-in `allowBuilds` entries (`protobufjs: false`, `'@depot/cli': false`, `core-js: false`) + `overrides: { kysely: 0.28.17 }` + the restored pnpm 11 defaults (`minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, `strictDepBuilds: true` — 082's finding 7 is pre-fixed). No `pnpm` key in `package.json`.
  - Postgres 18 docker: volume mounts `/var/lib/postgresql`; `postgres` (postgres-js) driver via `drizzle-orm/postgres-js`; the `authenticated` RLS role created by a `--custom` migration before the audit policy migration (059 carry-in).
  - Better Auth ids are `text` (FK columns to them are `text`, never `uuid`); `requireOrgUser()` returns `{ user, orgId, role }`; read the org row via `getOrganization(orgId)`.
  - Drizzle 0.45: runtime `casing: 'snake_case'`; flat migration layout with `--name <verb>_<noun>`; relations v1 `relations(table, ({ one }) => ({...}))` + `db.query.<table>.findMany({ with })` is N+1-safe (finding 8's fix); `drizzle-seed` cannot seed constraint-heavy tables → direct inserts; the `pathToFileURL` entry-point guard in scripts (paths contain spaces).
  - lucide-react 1.x: no brand icons — the barrel import (finding 6) uses only non-brand glyphs (`Home`, `FileText`, `Settings`, `Users`, `LayoutDashboard`, `Bell`, …).
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, `@sentry/nextjs` `^10.57.0`, `posthog-js` `^1.386.6`, `@vercel/analytics` `^2.0.1`, `@vercel/speed-insights` `^2.0.0` (no `2.0.1` exists), `pino` `^9.14.0`, `uuidv7` `^1.0.2`, better-auth `^1.6.14`, drizzle-orm `^0.45.1`, drizzle-kit `^0.31.5`, postgres `^3.4.7`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, stripe `^22.2.0`, `@upstash/ratelimit` `^2.0.8`, `@upstash/redis` `^1.38.0`, `@trigger.dev/sdk` `^4.4.0`, babel-plugin-react-compiler `1.0.0`, pnpm `11.3.0`, kysely override `0.28.17`. (NOT `@posthog/next` — no `1.x`, pulls a `@vercel/functions` peer the lineage doesn't carry.)

## File tree

Tree after the last slice (`solution/`, the wired-and-fixed answer key). Provided/seeded files carry no slice tag; files a slice edits or fills carry the tag. The 082 lineage is merged — only the audit-relevant, seeded, and wired files are enumerated; the unchanged carry-in is elided as `… (082 lineage, 082 findings pre-fixed, unchanged)`.

```
projects/Chapter 095/solution/
├── package.json                              — chapter-095-audit-target; 082 deps + @sentry/nextjs + @vercel/analytics + speed-insights
├── pnpm-workspace.yaml                       — allowBuilds {sharp,esbuild} + kysely override + restored pnpm 11 defaults (082 #7 pre-fixed)
├── next.config.ts                            — cacheComponents/typedRoutes/reactCompiler/turbopack; /ingest rewrites; withSentryConfig [edited by: S2]; optimizePackageImports lucide-react [edited by: S5]
├── instrumentation.ts                        — register + onRequestError = Sentry.captureRequestError [created by: S2]
├── instrumentation-client.ts                 — client Sentry.init [created by: S2]
├── sentry.server.config.ts                   — server Sentry.init + beforeSend redact + request-scoped requestId context join [created by: S2, edited by: S3]
├── sentry.edge.config.ts                     — edge Sentry.init [created by: S2]
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── drizzle.config.ts
├── docker-compose.yml
├── .env.example                              — dummy Sentry/PostHog + Postgres/Stripe/Upstash/Resend keys (no live round-trip)
├── README.md                                 — setup ladder, eight categories, hybrid wire/document split, honor-system note
├── AGENTS.md
├── findings/                                 — ← the deliverable (root, not src/)
│   ├── template.md                           — provided (the rule-location-consequence-fix contract)
│   ├── 001-sentry-not-wired.md               [filled by: S2]
│   ├── 002-log-secret-leak.md                [filled by: S3]
│   ├── 003-missing-correlation-id.md         [filled by: S3]
│   ├── 004-posthog-consent-gate.md           [filled by: S4]
│   ├── 005-rsc-waterfall.md                  [filled by: S5]
│   ├── 006-barrel-import.md                  [filled by: S5]  (embeds screenshots/before-barrel.png + after-barrel.png)
│   ├── 007-missing-priority.md               [filled by: S1]
│   ├── 008-n-plus-1-invoices.md              [filled by: S5]
│   ├── 009-missing-next-font.md              [filled by: S6]  (optional bonus)
│   ├── 010-composite-index.md                [filled by: S7]  (optional bonus; or inlined in SUMMARY)
│   ├── screenshots/                          — .gitkeep + by-hand analyzer before/after (not pipeline-produced)
│   ├── out-of-scope.md                       [filled by: S7]
│   └── SUMMARY.md                            [filled by: S7]
├── scripts/
│   ├── seed.ts                               — admin + org + customers + ≥30 invoices (each →customer) + ≥3 members + audit tail
│   ├── seed-stripe.ts                        — (065 carry, dummy in pipeline)
│   └── test-lesson.mjs                       — node wrapper (one Lesson <n>.test.ts)
├── tests/lessons/
│   └── Lesson 2.test.ts … Lesson 7.test.ts   — describe.todo placeholders (assert finding shape + wiring source shape)
├── src/
│   ├── env.ts                                — server/client partitions + SENTRY_* added [edited by: S2]; NEXT_PUBLIC_POSTHOG_KEY/HOST carried
│   ├── proxy.ts                              — CSP+nonce (082 #4 pre-fixed) + x-request-id mint/echo + runWithContext [edited by: S3]
│   ├── app/
│   │   ├── layout.tsx                         — root; <Analytics/> + <SpeedInsights/> (ungated floor, 093 L1)
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx                     — raw <link> Google font (seeded bonus #9)
│   │   │   └── page.tsx                       — hero <Image> NO preload (seeded #7); data-testid="marketing-hero"
│   │   ├── (protected)/
│   │   │   ├── layout.tsx                     — one <nav data-testid="app-nav"> (lucide barrel, seeded #6) + one <main>
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx                   — sequential awaits user→org→invoices→members (seeded #5); data-testid="dashboard"
│   │   │   │   └── loading.tsx                — Cache Components Suspense seam
│   │   │   ├── invoices/{page,loading}.tsx    — (082 carry)
│   │   │   └── settings/{page,loading}.tsx    — (082 carry; RESEND_API_KEY server-side, 082 #5 pre-fixed)
│   │   ├── api/
│   │   │   ├── test/throw/route.ts            — GET throws (provided; finding 1's proof target)
│   │   │   ├── webhooks/stripe/route.ts       — recovers x-request-id + runWithContext [edited by: S3]; (065 carry, healthy)
│   │   │   └── auth/reset-password/route.ts   — dual-keyed safeLimit (082 #6 pre-fixed)
│   │   ├── (auth)/ …                          — (082 lineage, unchanged)
│   │   ├── _components/providers.tsx          — PostHog consent-gated dynamic import + opt_out_capturing_by_default:true + ConsentProvider [edited by: S4]
│   │   ├── error.tsx
│   │   └── globals.css
│   ├── lib/
│   │   ├── logger.ts                          — Pino + single redact seam + requestId mixin [edited by: S3]
│   │   ├── request-context.ts                 — AsyncLocalStorage runWithContext/getRequestContext [created by: S3]
│   │   ├── analytics/consent.ts               — grant/revokeAnalyticsConsent seam [created by: S4]
│   │   ├── admin/transfer-ownership.ts        — (082 #1 pre-fixed: fail-closed)
│   │   ├── billing/transfer-ownership.ts      — (082 #3 pre-fixed: logAudit in tx)
│   │   ├── account/delete-account.ts          — (082 #8 pre-fixed: async deleteUser job)
│   │   ├── rate-limit.ts                       — signIn/signUp/reset limiters + safeLimit (082 carry)
│   │   └── … (082 lineage: result, utils, redirects, email, auth*, webhooks/stripe, exports/*, …)
│   ├── db/
│   │   ├── schema.ts                          — invoices (NO composite (org_id,created_at) index — seeded bonus #10) + customers + invoicesRelations→one(customers) + plan_entitlements + processed_events
│   │   ├── audit.ts / audit-log.ts            — (059 carry)
│   │   ├── queries/invoices-with-customer.ts  — N+1 customer loop (seeded #8; documented, NOT patched)
│   │   ├── queries/ …                         — (059/062/065/067 carry; invoices.ts listInvoices stays healthy/relations API)
│   │   └── … (columns, index, tenant, schema/auth.ts)
│   ├── components/ui/*                        — (shadcn primitives, unchanged)
│   ├── emails/*                               — (050 carry)
│   └── trigger/                               — (067 Trigger.dev tasks incl. deleteUser)
└── drizzle/                                   — 082 migration set + customers migration (NO composite-index migration — bonus 10's is a by-hand student step, not committed; identical in start/)
```

`start/` differs from `solution/` in exactly: (1) the Sentry config files deleted + `next.config.ts` unwrapped + `SENTRY_*` removed from `env.ts` (finding 1); (2) `lib/logger.ts` reverted to leaking + `lib/request-context.ts` deleted + `proxy.ts` reverted to no `x-request-id` + the webhook handler reverted (findings 2/3); (3) `providers.tsx` reverted to ungated + `lib/analytics/consent.ts` deleted (finding 4); (4) `lucide-react` removed from `optimizePackageImports` (finding 6); (5) all `findings/{001..008}.md` + optional `009`/`010` + `out-of-scope.md` + `SUMMARY.md` carry placeholder bodies. Each reverted/stubbed file carries a `// TODO(L<n>)` marker; `template.md`, `screenshots/.gitkeep`, the throw route, the Vercel floor, the four performance source defects (5/7/8 + bonus 9), the dropped index (bonus 10), and the entire pre-fixed 082 backend are byte-identical.

## Verification

### Static checks (the reviewer executes)

Scope tagged per check. Finding-file checks run against `solution/findings/` (filled) and `start/findings/` (placeholders) as noted.

- **(both) `pnpm verify` passes** in `solution/` (wired) and `start/` (seeded-broken) — `biome ci . && tsc --noEmit && next build` green. Both states build by design.
- **(both) `rg "TODO" start/findings/` enumerates the finding markers** (001–008 + out-of-scope + SUMMARY, plus optional 009/010 if shipped as files); `solution/findings/` has **zero** `TODO` markers in 001–008 + SUMMARY + out-of-scope. **(both) `rg "TODO(L" start/src start/next.config.ts` enumerates the wiring markers** (L3 Sentry in `next.config.ts`/`env.ts`; L4 logger/proxy/webhook; L5 PostHog provider; L6 barrel) — `solution/` has none of these wiring TODOs.
- **(solution) each finding has the four sections:** for each of `001`…`008`, `grep -q "## Rule" && grep -q "## Location" && grep -q "## Consequence" && grep -q "## Fix"` succeeds.
- **(solution) each finding names its rule + a diagnostic surface + the load-bearing fix** (load-bearing — fails if the finding ships inert prose):
  - `001`: `grep -qi "withSentryConfig" … && grep -qi "source map\|sourcemap" … && grep -qi "release" …`.
  - `002`: `grep -qi "stripe-signature" … && grep -qi "redact" …`.
  - `003`: `grep -qi "AsyncLocalStorage\|request-context" … && grep -qi "requestId" …`.
  - `004`: `grep -qi "opt_out_capturing_by_default" … && grep -qi "opt_in_capturing\|consent" …`.
  - `005`: `grep -qi "Promise.all" … && grep -qi "waterfall\|sequential" …`.
  - `006`: `grep -qi "optimizePackageImports" … && grep -qi "lucide" … && grep -q "before-barrel\|after-barrel" …` (names the fix + embeds the screenshots).
  - `007`: `grep -qi "preload" … && grep -qi "LCP" …` (names the renamed prop + the metric).
  - `008`: `grep -qi "with: { customer" … && grep -qi "toSQL\|N+1\|findMany" …`.
- **(solution) `SUMMARY.md` carries a coverage count + both bonus findings:** `grep -qE "8/8|9/10|10/10|coverage" findings/SUMMARY.md` and `grep -qi "next/font\|font" findings/SUMMARY.md` and `grep -qi "index" findings/SUMMARY.md`.
- **(solution) the Sentry wiring is installed** (the headline feature — fails if it ships inert):
  - `test -f solution/instrumentation-client.ts && test -f solution/sentry.server.config.ts && test -f solution/sentry.edge.config.ts && test -f solution/instrumentation.ts`.
  - `grep -q "Sentry.init" solution/instrumentation-client.ts && grep -q "Sentry.init" solution/sentry.server.config.ts`.
  - `grep -q "captureRequestError\|onRequestError" solution/instrumentation.ts`.
  - `grep -q "withSentryConfig" solution/next.config.ts`.
  - `grep -q "SENTRY_RELEASE\|VERCEL_GIT_COMMIT_SHA" solution/sentry.server.config.ts solution/src/env.ts` (release is computed, not hardcoded).
- **(solution) the logger seam is single + correlated:** `grep -q "redact" solution/src/lib/logger.ts` and `grep -q "redact\|beforeSend" solution/sentry.server.config.ts` (one redactor reaches both) and `grep -q "AsyncLocalStorage" solution/src/lib/request-context.ts` and `grep -q "x-request-id" solution/src/proxy.ts` and `grep -qE "contexts\.request\|getRequestContext\|requestId" solution/sentry.server.config.ts` (requestId joined as context inside `beforeSend`, not a tag — also assert `! grep -q "setTag.*requestId" solution/sentry.server.config.ts`).
- **(solution) PostHog is gated:** `grep -q "opt_out_capturing_by_default: true" solution/src/app/_components/providers.tsx` and `grep -Rq "ConsentProvider\|useConsent" solution/src/app` and `grep -q "opt_in_capturing" solution/src/lib/analytics/consent.ts`.
- **(solution) the barrel fix is in place:** `grep -q "optimizePackageImports" solution/next.config.ts && grep -q "lucide-react" solution/next.config.ts`.
- **(start) the observability defects are seeded-broken** (each fails if the wiring leaked into `start/` — these must hold in `start/` only):
  - #1: `! test -f start/instrumentation-client.ts && ! grep -q "withSentryConfig" start/next.config.ts && ! grep -q "SENTRY_DSN" start/src/env.ts`.
  - #2: `! grep -q "redact" start/src/lib/logger.ts` (no redactor) — the leak is live.
  - #3: `! test -f start/src/lib/request-context.ts && ! grep -q "x-request-id" start/src/proxy.ts`.
  - #4: `grep -q "opt_out_capturing_by_default: false" start/src/app/_components/providers.tsx && ! test -f start/src/lib/analytics/consent.ts`.
  - #6 (barrel): `! grep -q "optimizePackageImports" start/next.config.ts` (or the key exists without `lucide-react`).
- **(both) the performance source defects are present** (identical in both trees; document-only — fail if "fixed"; run with the `solution/` prefix too, paths exist in both):
  - #5: `grep -qE "getCurrentUser|requireOrgUser" "start/src/app/(protected)/dashboard/page.tsx" && ! grep -q "Promise.all" "start/src/app/(protected)/dashboard/page.tsx"` (sequential awaits, no parallelization).
  - #7: `grep -q "Image" "start/src/app/(marketing)/page.tsx" && ! grep -qi "preload" "start/src/app/(marketing)/page.tsx"` (Image present, no preload).
  - #8: `grep -qE "db.select\(\).*from\(invoices\)" start/src/db/queries/invoices-with-customer.ts && ! grep -q "with: { customer" start/src/db/queries/invoices-with-customer.ts` (raw select + loop, no relations; the dedicated helper, not the healthy `invoices.ts`).
  - bonus #10: `! grep -qE "index\(.*organization_id.*created_at" start/src/db/schema.ts` (composite index absent).
  - bonus #9: `grep -qE "fonts.googleapis.com|<link" "start/src/app/(marketing)/layout.tsx"` (raw font link present).
- **(both) the healthy build allow-list + restored pnpm defaults are intact:** `grep -q "sharp: true" pnpm-workspace.yaml` and `grep -q "minimumReleaseAge: 1440" pnpm-workspace.yaml` (082 #7 pre-fixed).
- **(both) `tests/lessons/` runs one file:** `pnpm test:lesson 3` runs only `Lesson 3.test.ts` (narrows, no glob OR-match).

### Rendered checks (slice coders + inspector run against the running app)

The pipeline boots Docker Postgres + `db:migrate` + `db:seed` then the **wired `solution/`** — no third-party round-trip. Only the seeded target's deterministically-rendered surfaces are checked; the browser-invisible proof surfaces (Sentry/PostHog dashboards, the analyzer treemap, DevTools traces) are covered by the static checks above + the lessons' by-hand checklists, not here.

| field | r-target-boots | r-marketing-hero | r-dashboard-nav |
|---|---|---|---|
| **slice** | S1 | S6 | S5 |
| **route** | `/dashboard` | `/` (marketing) | `/dashboard` |
| **viewport** | 1280×900 | 1280×900 **and** 390×844 | 1280×900 |
| **state** | settled (seeded admin) | settled | settled (seeded admin) |
| **intent** | the wired target boots and serves the seeded app the student reads against | the marketing hero renders (finding 7's LCP surface; lesson 2's reference) at both widths | the authenticated dashboard + nav render end-to-end after the barrel fix (findings 5/6 surface) |
| **selectors** | `dashboard` | `marketing-hero` | `dashboard`, `app-nav` |
| **assertion** | `dashboard` is present and the page renders the seeded admin's surface without an `error.tsx` fallback (the target is navigable end-to-end) | `marketing-hero` is exactly one element and renders an `<img>` (the `next/image` output) with a non-empty `src`; it does not flatten into siblings; the hero is visible above the fold at both widths | `app-nav` is exactly one `<nav>` element (single-slot, not split into siblings) containing the lucide nav icons, and `dashboard` is exactly one element rendering the seeded invoice/member data — both present in the same authenticated layout without an `error.tsx` fallback |

- **r-target-boots (S1):** owned by S1 — the first slice's render checkpoint is that the seeded target (built wired by the scaffolder + S2–S4 by the time the inspector runs the finished `solution/`) boots. Tagged to S1 because S1 is the first slice and `/dashboard` renders the surface end-to-end from seed. The child-count condition holds at any width; the 1280×900 tag is for consistency.
- **r-marketing-hero (S6):** owned by S6 — the last slice that touches the marketing surface (bonus 9's font finding reads against it). Visiting `/` renders the hero end-to-end from the first scaffold; the single-element + `<img>`-present condition holds at any width, and the above-the-fold check is tagged at both the desktop and mobile widths the lesson reads for the LCP discussion.
- **r-dashboard-nav (S5):** owned by S5 — after S5's barrel fix, visiting `/dashboard` renders the authenticated layout (nav + dashboard body) end-to-end. The single-`<nav>` condition guards the ch035 fragment-flatten footgun (the barrel icons must sit in one `<nav>`, not split the layout); holds at any width.

Every slice with a screenshot (S5 → `/dashboard`; S6 → `/`) owns a rendered check covering that surface (r-dashboard-nav, r-marketing-hero).
