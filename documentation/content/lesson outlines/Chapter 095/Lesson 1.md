# Chapter 095 — Lesson 1 outline

## Lesson title

- Page title: **Project overview** (sentence case). The chapter-outline title fits; keep it — the contract mandates the first project lesson be titled "Project Overview".
- Sidebar title: **Project overview**

## Lesson type

`Project overview`

(First lesson of a project chapter is always Project overview. No feature is built; no test-coder runs for this lesson — its test file is the chapter's last/verification concern, not this one.)

## Lesson framing

The student leaves with the Unit 19 audit target booting locally and a clear map of the senior task ahead: a **hybrid wire-and-document audit** of a production SaaS app pre-launch. The payoff installed here is the framing that separates this audit from a code-cleanup pass — observability gaps get *wired* (they lose data, so they close before launch) while performance gaps get *documented* with measured impact (they're slow, not bleeding, so they go to the backlog). The student finishes with the app running on `localhost:3000`, signed in as the seeded admin, with Sentry unwired, the logger leaking, PostHog capturing pre-consent, and four performance findings live — the exact starting state the rest of the chapter resolves.

## Codebase state

First lesson — no Entry/Exit detail required. State the start point and exit only as prose in framing:

- **Start**: nothing installed locally.
- **Exit**: `start/` tree installed, DB migrated and seeded, dev server up, student signed in as `alice@example.com`. The eight findings (plus two bonus) are all still live/unaddressed.

## Lesson sections

Follow the Project overview section list exactly, in order. No exercises, no quiz.

### What we're building (intro, no header)

One paragraph. Frame the project: Unit 19 closes by auditing a seeded production SaaS target pre-launch. The audit is **hybrid** — wire the missing/broken observability (Sentry, structured logs, the PostHog consent gate) into a working state, and document the four planted performance regressions with the rule-location-consequence-fix template carried from chapter 082, fixing only the barrel import in-place to capture the bundle-analyzer before/after. Name the senior split explicitly: observability gaps lose data so they get fixed; performance gaps are slow not bleeding so they get a findings report with measured impact.

Single figure of the four finished surfaces side by side, via `<Figure>` wrapping a `<Screenshot viewport="desktop">` (or `TabbedContent` of four `Screenshot`s if one composite image is impractical — let the writer choose, but brief one figure):
1. the Sentry event for the deliberate `/api/test/throw`,
2. the PostHog dashboard with a post-consent `$pageview`,
3. the bundle-analyzer treemap before/after the barrel fix,
4. the filled `findings/SUMMARY.md`.

Caption names these as "the four artifacts a senior confirms at a launch review." Screenshots captured later by the screenshotter — brief the four panels here.

### What we'll practice (h2)

Bulleted list, skills framing (not feature framing). Pull verbatim-in-spirit from the chapter outline's "What we'll practice":
- Auditing a *running* app for observability gaps and performance regressions — running state as the diagnostic surface, not source-reading alone.
- Wiring Sentry across client/server/edge with source maps and release tags.
- Building one redactor seam and a request-correlation-ID middleware reused by both the logger and Sentry.
- Consent-gating analytics so capture starts only on explicit opt-in.
- Diagnosing perf issues from traces, the bundle analyzer, and `EXPLAIN ANALYZE`, then writing findings with the rule-location-consequence-fix template.
- Self-grading a deliverable against a reference answer key — the audit's senior-reach habit.

### Architecture (h2)

Shape only — a labeled list (not a diagram; the wiring is a config inventory, not a flow prose can't carry). Four groups plus the deliverable, lifted from the chapter outline's Architecture section. Keep it to the *shape* of what gets wired and what gets audited; do not pre-explain how (that's lessons 3–6):
- **Sentry** — `instrumentation-client.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` + `instrumentation.ts`, wrapped into the build by `withSentryConfig` in `next.config.ts`; source maps when `SENTRY_AUTH_TOKEN` present, release from `VERCEL_GIT_COMMIT_SHA ?? 'dev'`.
- **Structured logging** — Pino in `src/lib/logger.ts` with a `redact` drop-list + `requestId` mixin; `src/proxy.ts` mints `x-request-id` (`uuidv7()`) and opens a `runWithContext` scope over `AsyncLocalStorage` (`src/lib/request-context.ts`); each downstream seam (e.g. the webhook handler) recovers the ID and opens its own scope read by both the logger and Sentry's `beforeSend`.
- **Analytics** — `posthog-js` loaded inside `PostHogGate` (`src/app/_components/providers.tsx`) with capture off by default, gated by `src/lib/analytics/consent.ts` behind a `ConsentProvider` + banner the student builds.
- **Performance surfaces** — the RSC dashboard (`dashboard/page.tsx`), the authenticated layout (`(protected)/layout.tsx`), the marketing hero (`(marketing)/page.tsx`), the invoice-with-customer read (`db/queries/invoices-with-customer.ts`); audited via DevTools Performance, the Turbopack analyzer (`pnpm next experimental-analyze`), and `EXPLAIN ANALYZE`.
- **Deliverable** — `findings/` with the rule-location-consequence-fix template, numbered files 1–10, `SUMMARY.md`, `out-of-scope.md`, `screenshots/`.

No diagram needed — the architecture is a labeled inventory of seams, not a request flow; a diagram would add height for no clarity.

### Starting file tree (h2)

Use `<FileTree>`. Reproduce the annotated tree from the chapter outline (lines 132–154) — top-level layout, one-line comments only on files that carry a seeded finding or that lessons will touch, the rest uncommented. Mark the focus cluster (the files carrying findings 4, 5, 6, 7, 8 and the empty `findings/`) as the highlighted focus — FileTree highlights via `**bold**` on the path.

Files to comment (matching the seeded findings, all sourced from the code outline's Start diff and TODO table):
- `next.config.ts` — not wrapped with `withSentryConfig`; no `optimizePackageImports` (findings 1, 6).
- `.env.example` — Sentry + PostHog key names and how to obtain them.
- `src/env.ts` — extend: Sentry env keys land here (finding 1).
- `src/proxy.ts` — no `x-request-id` mint/echo + `runWithContext` scope yet (finding 3).
- `src/app/_components/providers.tsx` — imports `posthog-js` at module scope, capture on, no consent gate (finding 4) ← FOCUS.
- `src/app/(marketing)/page.tsx` — hero `<Image>` missing eager-load prop (finding 7) ← FOCUS.
- `src/app/(marketing)/layout.tsx` — raw `<link>` font, not `next/font` (bonus 9).
- `src/app/(protected)/layout.tsx` — `lucide-react` barrel import (finding 6) ← FOCUS.
- `src/app/(protected)/dashboard/page.tsx` — sequential awaits, RSC waterfall (finding 5) ← FOCUS.
- `src/app/api/test/throw/route.ts` — the deliberate-throw proof target (finding 1).
- `src/lib/logger.ts` — Pino with no `redact`, no `requestId` mixin (findings 2, 3) ← FOCUS.
- `src/db/queries/invoices.ts` — healthy: uses the relations API (must stay healthy).
- `src/db/queries/invoices-with-customer.ts` — 1 + N customer lookups (finding 8) ← FOCUS.
- `findings/` — ships empty: template, 001–010 placeholders, `SUMMARY.md`, `out-of-scope.md`, `screenshots/` ← FOCUS.

After the tree, a short prose line listing the files the student *creates* in later lessons (not in the tree yet), from the chapter outline line 156: `instrumentation*.ts` + `sentry.{server,edge}.config.ts` (L3), `src/lib/request-context.ts` (L4), `src/lib/analytics/consent.ts` + `consent-provider.tsx` + `consent-banner.tsx` (L5).

### Roadmap (h2)

`CardGrid` of six `Card`s, one per lesson 2–7, each titled with lesson number + title and one sentence naming what it adds. Lift from the chapter outline's Roadmap (lines 160–167):
- **Lesson 2 — The audit method.** Tours the eight finding clusters across the running app and source, then writes `findings/007-missing-priority.md` end to end as the chapter's reference shape.
- **Lesson 3 — Wire Sentry.** Installs Sentry across client/server/edge with source maps and a release tag so the deliberate throw lands decoded in the dashboard.
- **Lesson 4 — The production logger seam.** Adds the single redactor reused by Pino and Sentry's `beforeSend`, plus a request-correlation-ID middleware backed by `AsyncLocalStorage`.
- **Lesson 5 — Gate PostHog behind consent.** Flips capture off by default and routes accept/reject through one consent seam so events fire only post-consent.
- **Lesson 6 — Document the performance findings.** Writes the waterfall and N+1 findings, fixes the barrel import in-place for the bundle-analyzer before/after, and assembles `SUMMARY.md`.
- **Lesson 7 — Verify and self-grade.** Runs the full verify recipe one surface at a time, commits, then diffs the work against the `solution/` answer key to score coverage.

### Setup (h2)

`Steps` component, exact commands in order, from the `start/` tree. First step must be the repo-fetch line per the contract.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 095/start/`.
2. `pnpm install`
3. `cp .env.example .env` (and `.env.local` for `next dev`).
4. (Optional) Populate real keys — dummy values pass validation with no round-trip; real values are only needed to see live events. Use an `Aside` (tip) or a sub-bullet list:
   - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` — create a free-tier Sentry org + project; DSN under Project Settings → Client Keys, auth token under Settings → Auth Tokens (scope: source-map upload).
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — create a free-tier PostHog project; both values are on the project's setup page.
5. `docker compose up -d`
6. `pnpm db:migrate`
7. `pnpm db:seed`
8. `pnpm dev`
9. Sign in at `http://localhost:3000/sign-in` as the seeded admin `alice@example.com` / `inspector-password-12` (the `SEED_PASSWORD` constant in `scripts/seed.ts`).

Env var list: render the optional keys above as the env-var table (name, purpose, how to obtain). Note `SENTRY_RELEASE` defaults to `VERCEL_GIT_COMMIT_SHA ?? 'dev'` so it needs no local value.

**Expected result** (one paragraph, close the lesson here): the app boots on `http://localhost:3000`, seeded with a marketing page, an authenticated dashboard, and an invoice list (`org_acme`, ~30 customers, 240 invoices, ≥3 members). `/dashboard` requires a real Better Auth session — without one `proxy.ts` redirects to `/sign-in`. At this point Sentry is unwired, the logger leaks, PostHog captures pre-consent, and the four performance findings are live — the starting state the rest of the chapter resolves.

Add a brief closing note (the chapter outline's grading framing, lines 188–190), as an `Aside`:
- The two artifacts (working observability + the findings report) are graded **independently** — a perfect findings report with broken Sentry still fails the audit, and working Sentry with one missing performance finding still fails.
- **Coverage over depth** — a short finding in every category beats a deep dive with one category silent. "8 is the floor, 10 is the senior reach."
- The `solution/` answer key is read only after the student commits in lesson 7 — same honor system as chapter 082.

## Code sample handling

- Starting file tree → `FileTree` (focus files bolded).
- Setup commands → `Steps` with `Code` blocks per command (or one fenced block per step).
- Env var "how to obtain" → table in prose + an `Aside` (tip) for the optional-keys note.
- The four-surface preview → `Figure` + `Screenshot` (or `TabbedContent` of `Screenshot`s).
- Grading framing → `Aside` (note/tip).
- Roadmap → `CardGrid` + `Card`.

No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` needed — the overview shows structure, not code internals (those land in the implementation lessons). No diagram.

## Scope

What this lesson does **not** cover (one-line reference each):
- How to audit / the finding template mechanics → lesson 2 (the audit method, modeled on finding 7).
- Wiring Sentry → lesson 3. Logger redactor + correlation IDs → lesson 4. PostHog consent gate → lesson 5. Documenting perf findings + barrel fix → lesson 6. Verify + self-grade → lesson 7.
- Sentry/Pino/PostHog/CWV *concepts* (the why) → owned by the teaching chapters 092–094; this overview names them only, no re-explanation (technology rationale belongs in regular lessons, not the overview).
- No finding is wired or documented in this lesson — the app is left in its broken starting state on purpose.
