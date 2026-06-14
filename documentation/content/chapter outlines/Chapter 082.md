# Chapter 082 — Project: the pre-launch audit pass

## Chapter framing

Chapter 082 closes Unit 16 by running the two audit passes the unit installed — the error discipline from chapter 080 (fail-closed, the user-vs-operator message split) and the security baseline from chapter 081 (headers, rate-limit coverage, audit-log gaps, GDPR posture, consent gate, secrets, env validation, dep hygiene) — against a seeded audit-target repo.
The deliverable is not new code in the audit target; it is a `findings/` directory the student commits, one Markdown file per finding, every file using the rule-location-consequence-fix template.
The target ships with **ten** planted defects — eight in scope (one per audit category) plus two bonus — and every defect ships green: `pnpm verify` (`biome ci . && tsc --noEmit && next build`) passes with all ten bugs live, because an audit reads a *running* target.
In the real-course framing the answer key is published behind a `v1.0-answer-key` git tag only after the student commits; in this repository the answer key is `solution/findings/` and the student's empty placeholders ship in `start/findings/`.

The project's goal is a committed `findings/` directory that surfaces all eight seeded findings, each documented with rule, location, consequence, and proposed fix, with misses quantified in a `SUMMARY.md` and the whole report self-graded against the published answer key once committed.
The audit is a **read-only pass on the target codebase** — the audit target runs unchanged at the end of every lesson and the findings directory grows; students do not patch the seeded findings, they document them, and the proposed fix is a paragraph, not a diff.

Threads that run through every lesson.
The **template is the contract** — every finding names its rule (from chapter 080 or chapter 081), its location (file + line range, or "missing — should be at X"), its consequence (the user-visible failure mode if exploited, or the legal exposure), and its fix (the senior reach, named with the helper or wrapper it lives in).
The **eight categories are exhaustive for this audit** — anything outside them is out of scope for the pass; the student notes such observations in a separate `out-of-scope.md` rather than scoring them as findings.
The **two commitments from chapter 080 carry through** — fail-closed reasoning powers the error pass; the user-vs-operator split powers the consequence column.
**Coverage matters more than depth** — every category gets a finding (or a written "no findings in this category"); a deep dive on one category that leaves another silent is the failure mode.
**Self-grading is the senior reach** — the answer key publishes after the student commits; partial credit goes to "rule + location correctly named, fix differs from the senior reach" because the rule is the load-bearing piece.

### Dependency carry-in

The audit pass invokes every rule and helper Unit 16 installed plus the canonical seams from earlier units.

- **From Chapter 080:** fail-closed (lesson 1 of chapter 080); the user-vs-operator message split, the read-aloud test, the `error.tsx` discipline, the redactor (lesson 2 of chapter 080); the six seams catalog and the grep audit step per seam (lesson 3 of chapter 080).
- **From Chapter 081:** the six non-negotiable headers and the static/dynamic split (lesson 1 of chapter 081); the seven endpoint categories and three mandatory-limiter triggers, `safeLimit` as the single seam (lesson 2 of chapter 081); the six audit-log event categories and transaction discipline (lesson 3 of chapter 081); the retention catalog and the async deletion job with three deletion shapes (lesson 4 of chapter 081); the consent gate's pre-consent boundary (lesson 5 of chapter 081); the secrets rules (no `NEXT_PUBLIC_*` for secrets, three env sets, rotation order) (lesson 6 of chapter 081); the four env-validation invariants (lesson 7 of chapter 081); pnpm 11+ supply-chain defaults (lesson 8 of chapter 081).
- **From prior units:** `authedAction(role, schema, fn)` and `tenantDb(orgId)` from chapter 057 / chapter 059; `logAudit(tx, event)` from lesson 5 of chapter 057; the verify-then-claim-then-mutate transaction from chapter 063; `@upstash/ratelimit` with dual keying from lesson 3 of chapter 074; typed `env` from lesson 2 of chapter 037. The seeded target ships these helpers (kebab-case files under `src/lib/`) so every finding references a real call site.

### Audit-target spec

The target is a fork of the course's running project — invoices list, CRUD, auth, organizations, RBAC, Stripe webhook + `plan_entitlements`, the durable export job, PostHog wired but ungated, the basic surface a senior is about to take to a launch review.
Ten defects are seeded: eight across the eight audit categories plus two bonus.
The target runs end-to-end: `cp .env.example .env && pnpm install && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`, then sign in as the seeded admin `alice@example.com` / `inspector-password-12`; the student navigates the running app and reads the source side-by-side.
No third party is reached at build or render time — the `.env.example` ships dummy `re_*` / `sk_test_*` / `tr_*` keys so env validation passes with no round-trip; the browser-invisible fingerprints (curl headers, DevTools network, repeated submits, the PostHog request) are confirmed by static source reads plus the lessons' by-hand checklist, not by a live integration.
In the real-course framing the starter ships via `degit` and the answer key lives behind a `v1.0-answer-key` git tag the student does not check out until committing their own `findings/`; in this repository the answer key is `solution/findings/` and the empty placeholders ship in `start/findings/`. The student is on the honor system either way.

The eight seeded in-scope findings, one per category, tuned so each lands on a rule the student has been taught:

1. **Fail-closed violation (error discipline, lesson 1 of chapter 080).** `src/lib/admin/transfer-ownership.ts` wraps `requireRole('owner')` in a `try/catch` that logs and falls through on exception (both the `transferOwnershipAction` Server Action and the direct `transferOwnership` variant carry the bug, so the grep hits regardless of entry point).
2. **`dangerouslySetInnerHTML` on user content (XSS sink, lesson 2 of chapter 080 + lesson 1 of chapter 081).** `src/app/(protected)/invoices/[id]/notes.tsx` renders the user-submitted note `body` as raw HTML (a `biome-ignore` directive lets the default-on lint rule pass so the defect ships green).
3. **Missing audit-log write (audit log gap, lesson 3 of chapter 081).** `src/lib/billing/transfer-ownership.ts` (`transferBillingOwnership`) updates `organization.ownerId` and the member rows inside a `db.transaction` without a `logAudit(tx, event)` call.
4. **CSP header omission (security headers, lesson 1 of chapter 081).** `next.config.ts` ships five static headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) but no CSP; `src/proxy.ts` does not generate a per-request nonce.
5. **Secret in `NEXT_PUBLIC_*` (secrets, lesson 6 of chapter 081).** `NEXT_PUBLIC_RESEND_API_KEY` declared in `src/env.ts`'s client partition and consumed by `src/app/(protected)/settings/resend-test.tsx` (the `ResendClientTest` Client Component) which calls Resend from the browser.
6. **Missing rate limit on password-reset (rate-limit coverage, lesson 2 of chapter 081).** `src/app/api/auth/reset-password/route.ts` triggers Resend with no limiter (the declared `resetLimiter` in `src/lib/rate-limit.ts` is never imported here).
7. **Disabled pnpm 11+ supply-chain defaults (dep hygiene, lesson 8 of chapter 081).** `pnpm-workspace.yaml` sets `minimumReleaseAge: 0`, `blockExoticSubdeps: false`, `strictDepBuilds: false`, overriding the safe defaults; `.npmrc` holds only `engine-strict` / `auto-install-peers`. A grep finds the disabled flags with no install step.
8. **GDPR deletion leaves rows behind (lesson 4 of chapter 081).** `src/lib/account/delete-account.ts` (`deleteAccount`) deletes the `user` row only — no graph walk, no externals, no audit-log anonymization; the healthy reference impl is `trigger/delete-user.ts`.

The two bonus defects a thorough audit surfaces: (9) a missing consent gate on PostHog (`opt_out_capturing_by_default: false` in `src/app/_components/providers.tsx`, no `ConsentProvider`), and (10) a `safeLimit` bypass on the worker endpoint `src/app/api/exports/trigger/route.ts` (bare `signInLimiter.limit(key)`).
The brief names "8 is the floor, 10 is the senior reach."

### Starter file tree

The annotated top-level layout the architect carries into the Project Overview's Starting file tree section.
The eight directories below are where findings cluster; the canonical helpers the audit reads against sit alongside them.

```
Chapter 082/{start,solution}/
  next.config.ts                    # headers() block — five static headers, no CSP (finding 4)
  pnpm-workspace.yaml               # supply-chain defaults disabled (finding 7)
  .npmrc                            # engine-strict / auto-install-peers only — not where supply-chain settings live
  package.json                      # name: chapter-082-audit-target; pnpm verify passes with all defects (finding 7's pin corroborates via pnpm audit)
  docker-compose.yml                # local Postgres 18
  .env.example                      # dummy third-party keys; copy to .env
  findings/                         # ← the deliverable the student commits
    template.md                     # the rule-location-consequence-fix template, copied per finding
    001-fail-closed.md              # numbered placeholder (start: 4-section skeleton + TODO comment), one per category
    002-xss-html-sink.md
    003-audit-log-ownership-transfer.md
    004-csp-header.md
    005-secret-next-public.md
    006-rate-limit-password-reset.md
    007-dep-hygiene.md
    008-gdpr-deletion.md
    out-of-scope.md                 # observations outside the eight categories
    SUMMARY.md                      # coverage scorecard, filled at the end
  trigger/
    delete-user.ts                  # healthy async GDPR deletion job — the finding-8 reference impl
  tests/lessons/Lesson N.test.ts    # describe.todo gates (Lesson 2–10), run via pnpm test:lesson <N>
  src/
    env.ts                          # @t3-oss/env-nextjs schema, imported as @/env (chapter 037) — NEXT_PUBLIC_RESEND_API_KEY in client partition (finding 5)
    proxy.ts                        # presence-only cookie guard, no per-request nonce (finding 4)
    lib/
      auth/authed-action.ts         # canonical Server-Action wrapper (chapter 057) — the seam findings bypass
      auth/require-role.ts          # requireRole(required) — throws, callers must not catch
      rate-limit.ts                 # limiter declarations (signInLimiter/signUpLimiter/resetLimiter) (chapter 074)
      safe-limit.ts                 # the safeLimit(limiter, prefix, key) fail-open wrapper (chapter 080)
      admin/transfer-ownership.ts   # try/catch around requireRole — fail-open (finding 1)
      billing/transfer-ownership.ts # updates ownerId + member rows with no logAudit (finding 3)
      account/delete-account.ts     # deletes user row only (finding 8)
    db/audit-log.ts                 # transaction-scoped logAudit writer (chapter 057)
    app/
      _components/providers.tsx     # posthog.init with opt_out_capturing_by_default: false (bonus finding 9)
      (protected)/invoices/[id]/notes.tsx     # renders user note body as raw HTML (finding 2)
      (protected)/settings/resend-test.tsx    # Client Component reading NEXT_PUBLIC_RESEND_API_KEY (finding 5)
      api/auth/reset-password/route.ts        # Resend trigger with no limiter (finding 6)
      api/exports/trigger/route.ts            # bare signInLimiter.limit() — bypasses safeLimit (bonus finding 10)
```

The highlighted focus is `findings/` — the only directory the student edits.
Every other file is read, never modified.
`start/` and `solution/` are identical except for `findings/`: `start/findings/` carries empty 4-section skeletons with per-lesson TODO comments; `solution/findings/` carries the completed answer key.

### Finding template (`findings/template.md`)

The provided template the student copies once per finding — the reference shape the architect builds the placeholders against:

```
# Finding NNN — <short title>

**Category:** one of the eight audit categories.
**Severity:** critical | high | medium | low (senior call, justified in two lines).

## Rule
The named rule from chapter 080 or chapter 081 this finding violates. One sentence; link the lesson section by ID.

## Location
File path(s) and line range(s). For "missing-piece" findings, name the file where the piece should live.

## Consequence
The failure mode in user-visible or legal terms. Two to four sentences. No "could potentially" hedging.

## Fix
The senior reach, named in terms of the helper / wrapper / config block it lives in. Five to ten lines.
A short illustrative snippet is allowed when the fix is structural — no full diffs.
```

`findings/` ships with the template plus a numbered placeholder per category (`001-fail-closed.md`, `002-xss-html-sink.md`, … `008-gdpr-deletion.md`); the student replaces the placeholder body with their finding.
Out-of-scope observations go in `findings/out-of-scope.md`; the coverage scorecard goes in `findings/SUMMARY.md`.

### Canonical helper signatures the findings reference

Every finding's fix names one of the seams the target ships. The architect carries these signatures:

- `authedAction(role, schema, fn)` (`src/lib/auth/authed-action.ts`) — the Server-Action wrapper that converts a thrown access check into `{ ok: false, error: { code } }` (lesson 2 of chapter 057, lesson 3 of chapter 080).
- `requireRole(required)` (`src/lib/auth/require-role.ts`) — throws on a below-role actor; callers run for the throw, never catch (finding 1 catches it).
- `safeLimit(limiter, prefix, key)` (`src/lib/safe-limit.ts`) — the rate-limiter wrapper with the documented fail-open carve-out (lesson 3 of chapter 080); the single seam finding 6 (missing) and bonus finding 10 (bypassed) reference.
- `logAudit(tx, event)` (`src/db/audit-log.ts`) — the transaction-scoped audit writer accepting `AuditEvent | ExplicitAuditEvent` (lesson 5 of chapter 057); finding 3 is its missing call.
- `tenantDb(orgId)` (`src/db/tenant.ts`) — the org-scoped Drizzle facade over `withTenant` (chapter 059).
- `env` (`src/env.ts`, imported as `@/env`) — the typed `@t3-oss/env-nextjs` import with `server` / `client` (NEXT_PUBLIC_*) partitions (lesson 2 of chapter 037); finding 5 is the `NEXT_PUBLIC_*` prefix that bypassed the `server` partition.

### Concepts demonstrated → owning lesson

- The fail-closed rule and the canonical fail-open failure modes — lesson 1 of chapter 080; demonstrated in lesson 2 of chapter 082 (finding 1).
- The two-message rule (user vs. operator), the read-aloud test, the redactor — lesson 2 of chapter 080; demonstrated across the consequence columns, primarily lesson 4 of chapter 082 (finding 3).
- The six seams catalog and the per-seam audit step (grep targets) — lesson 3 of chapter 080; the audit method introduced in lesson 2 of chapter 082 and reused in every finding lesson.
- Security headers (HSTS, CSP with nonce + `'strict-dynamic'`, etc.) and the `next.config.ts` / `proxy.ts` split — lesson 1 of chapter 081; demonstrated in lesson 5 of chapter 082 (finding 4).
- Rate-limit coverage matrix and the three mandatory-limiter triggers — lesson 2 of chapter 081; demonstrated in lesson 7 of chapter 082 (finding 6).
- Audit-log canonical event set, transaction discipline, payload redaction — lesson 3 of chapter 081; demonstrated in lesson 4 of chapter 082 (finding 3).
- GDPR retention catalog + the async deletion job + the three deletion shapes — lesson 4 of chapter 081; demonstrated in lesson 9 of chapter 082 (finding 8).
- The consent gate's load-bearing rule (nothing fires pre-consent) — lesson 5 of chapter 081; the bonus finding 9, scored in lesson 10 of chapter 082.
- Secrets in code / in `NEXT_PUBLIC_*` / rotation order — lesson 6 of chapter 081; demonstrated in lesson 6 of chapter 082 (finding 5).
- Env-validation invariants and the typed `env` import — lesson 7 of chapter 081; demonstrated in lesson 6 of chapter 082 (finding 5).
- pnpm 11+ supply-chain defaults — lesson 8 of chapter 081; demonstrated in lesson 8 of chapter 082 (finding 7).
- The Server-Action / route-handler wrappers as the single place to lint — lesson 2 of chapter 057, lesson 3 of chapter 057, lesson 3 of chapter 080; read in the Project Overview's file tour, demonstrated in lesson 2 of chapter 082.
- `dangerouslySetInnerHTML` as an XSS sink even with strict CSP — lesson 1 of chapter 081 (CSP defense in depth), chapter 026 (React fundamentals); demonstrated in lesson 3 of chapter 082 (finding 2).
- The `processed_events` dedup pattern and the verify-then-claim-then-mutate transaction — chapter 063.

---

## Lesson 1 — Project Overview

The audit pass that chapter 080 and chapter 081 install, run end-to-end against a seeded target.
The student leaves with the audit target running locally and the `findings/` directory scaffolded, ready to write the first finding.

### What we're building

A pre-launch security and error-handling audit of a real SaaS codebase.
The deliverable is a `findings/` directory the student commits — one Markdown file per finding, each using the rule-location-consequence-fix template — not patches to the audit target.
The target ships ten planted defects (eight across eight categories plus two bonus), all green under `pnpm verify`; the audit is the discipline of finding and documenting them, and self-grading against the answer key once committed.
A single figure shows the finished deliverable: one filled finding file beside the `findings/` directory layout.

### What we'll practice

- Reading a running app and its source side-by-side to surface defects an inexperienced dev would miss.
- Naming a defect against a precise rule — the load-bearing audit skill.
- Writing the consequence of a defect in user-visible or legal terms, not "code smell."
- Reaching for the senior fix, named in terms of the helper or wrapper it lives in.
- Working under the constraint of a real audit: coverage over depth, no peeking at an answer key.

### Architecture

- The audit target — the course's running project, with ten seeded defects (eight in scope, two bonus) — is read-only.
- The `findings/` directory — the student's editable deliverable — sits at the project root beside `src/`.
- The eight audit categories map onto the two passes: an error-discipline pass (categories drawn from chapter 080) and a security-baseline pass (categories drawn from chapter 081).
- The answer key lives in `solution/findings/` (real-course framing: the `v1.0-answer-key` tag), consulted only after commit.

### Starting file tree

Annotate the top-level layout from the chapter framing's starter file tree.
Comment only the files the audit reads against or the lessons touch; mark `findings/` as the highlighted focus — the only directory the student edits.
Leave the deep per-file reading of `src/lib/admin/transfer-ownership.ts`, `src/lib/safe-limit.ts` (which houses `safeLimit`), and the rest to the finding lessons that first open them.

### Roadmap

One Card per lesson, lesson number and title plus one sentence naming what it adds:

- Lesson 2 — Finding 1: the fail-closed bypass. Models the audit method end-to-end and produces the first finding as the reference shape.
- Lesson 3 — Finding 2: the XSS HTML sink. Surfaces the user content rendered as raw HTML.
- Lesson 4 — Finding 3: the missing audit-log write. Surfaces the silent ownership transfer.
- Lesson 5 — Finding 4: the CSP header omission. Surfaces the missing defense-in-depth header.
- Lesson 6 — Finding 5: the secret in `NEXT_PUBLIC_*`. Surfaces the API key shipped to the browser.
- Lesson 7 — Finding 6: the missing rate limit on password-reset. Surfaces the unthrottled Resend trigger.
- Lesson 8 — Finding 7: the dep-hygiene gap. Surfaces the missing pnpm 11+ supply-chain defaults.
- Lesson 9 — Finding 8: the GDPR deletion gap. Surfaces the deletion that leaves PII behind.
- Lesson 10 — Commit and self-grade. Commits the findings and scores them against the answer key.

### Setup

Command sequence (Steps component), then the dev server, then the expected result.

1. Copy the env file: `cp .env.example .env`.
2. `pnpm install` — completes clean. (Real-course framing: the starter is cloned via `degit`; here the student opens the `start/` tree.)
3. `docker compose up -d` — local Postgres 18 running.
4. `pnpm db:migrate && pnpm db:seed` — schema applied, deterministic seed loaded (the admin Alice, a second org, an invoice carrying the planted note, the audit tail).
5. `pnpm dev` — the running app on `:3000`; sign in at `/sign-in` as `alice@example.com` / `inspector-password-12`.

Env vars: the starter ships a `.env.example`; copy to `.env`. The dummy `re_*` / `sk_test_*` / `tr_*` / Upstash / PostHog values pass env validation with no round-trip — no external accounts are needed to run the target read-only. Name each var and its purpose.

Name the answer-key location (`solution/findings/`, real-course framing: the `v1.0-answer-key` tag) and the honor-system rule: not consulted until the findings are committed in lesson 10.

Expected result: the dashboard loads on `:3000` as the seeded admin, and `findings/` holds `template.md` plus eight numbered placeholder files (each a 4-section skeleton with a TODO comment) and the empty `out-of-scope.md` / `SUMMARY.md`.
The lesson ends when the starter runs locally; no finding is written yet.

---

## Lesson 2 — Finding 1: the fail-closed bypass

The fail-closed violation in `src/lib/admin/transfer-ownership.ts` documented as `findings/001-fail-closed.md` with all four template sections filled.
This first finding is the worked example that teaches the audit method and the template shape; the student starts the audit with finding 1 as a gift and re-reads it whenever a later finding feels stuck.

### Your mission

This is the audit's reference finding, and it doubles as the lesson where the audit *method* is set.
The rhythm every later finding reuses: open the running app, open the source, hold both side-by-side, walk one category, then write the finding before moving on — switching categories mid-finding fragments the report.
The category here is fail-closed checks (lesson 1 of chapter 080).
The audit step is grep-driven: grep `'use server'` in files that don't import `authedAction`, and grep `requireRole('owner')` then read each hit's surrounding `try/catch`; some hits are legitimate (the public sign-up/sign-in actions handle auth differently by design), and the audit documents which commands ran and how many hits each returned.
The target ships all the canonical helpers — `authedAction`, `safeLimit`, `logAudit`, `tenantDb`, the typed `env` — so reading those first calibrates the eye: findings live in the call sites that *bypass* the seam, never in the seam itself.
Note `transfer-ownership.ts` carries the bug twice — the `transferOwnershipAction` Server Action *and* the direct `transferOwnership` variant — so the grep surfaces it regardless of entry point.
Out of scope: patching the target — the fix is a paragraph, not a diff.
The trap to avoid is a "code review opinion" with no grep target behind it; every finding's location names the command that surfaced it.
The consequence column is read aloud at a launch review by someone who has not read the code, so it must name the user-visible failure mode (an unauthorized ownership transfer slips through during a connection blip) with the operator failure mode (the fail-open dressed up as "we log it then continue") as the secondary note.

- The fail-closed bypass in `src/lib/admin/transfer-ownership.ts` is located with a line range and the grep command that surfaced it, including the legitimate hits the command also returned and why they are not findings.
- The finding names the rule as fail-closed (lesson 1 of chapter 080), linked by section ID.
- The consequence reads as a user-visible failure mode — an owner-only mutation slipping through when `requireRole('owner')` throws during a Postgres blip — with the fail-open-dressed-as-logging operator note alongside it, and no "could potentially" hedging.
- The fix names the senior reach: remove the `try/catch`, let `requireRole` throw, and let the outer `authedAction` wrapper convert the throw to `{ ok: false, error: { code: 'unauthorized' } }` per the seam-1 reading of lesson 3 of chapter 080.
- A severity is assigned and justified in two lines.
- `findings/001-fail-closed.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the worked solution.
The hidden solution walks the file: the `try/catch` around `requireRole('owner')`, the catch block that logs and continues, the quoted failure mode, the rule with its lesson ID, and the full fix.
It reproduces the completed `findings/001-fail-closed.md` as it lands in the repo, models the grep commands and their hit counts as the location evidence, and links rather than re-explains the `authedAction` seam (lesson 3 of chapter 080) and the fail-closed rule (lesson 1 of chapter 080).

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 2`: the test asserts the observable shape of the finding — that `findings/001-fail-closed.md` has the four template sections populated and names the fail-closed rule — and a source-shape probe that the seeded defect is still present (the target is read-only, so a passing gate proves the student documented the defect rather than patching it).
Then confirm by hand the checklist items the test cannot judge: the consequence reads as a user-visible failure mode rather than a code-quality note; the location names the grep command and its hit count; the fix names the `authedAction` conversion rather than a re-throw; the severity justification holds up when read aloud.

---

## Lesson 3 — Finding 2: the XSS HTML sink

The `dangerouslySetInnerHTML` sink in `src/app/(protected)/invoices/[id]/notes.tsx` documented as `findings/002-xss-html-sink.md`.
The user-submitted note body renders as raw HTML; the finding names the stored-XSS failure mode and the sanitize-at-write-and-read fix.

### Your mission

This is the finding a senior catches on the first read of the rendered DOM, and the audit step is a single grep: `dangerouslySetInnerHTML` across `src`, then examine every hit (one `biome-ignore` directive sits on the seeded sink so it ships green — the grep still hits).
The browser side confirms it — the seed plants a note whose `body` is `<b>bold</b>`, so opening the seeded invoice (`pnpm db:seed` prints the exact path) renders it as live bold HTML rather than literal text, the fingerprint of the sink.
The category is XSS sinks (lesson 2 of chapter 080 plus lesson 1 of chapter 081), and the rule is that rendered content is operator-trustworthy or it is not — user-submitted content is never operator-trustworthy without sanitization.
The trap an inexperienced dev falls into is "I'll just sanitize at write," which misses the historical-data attack vector: a row written before the sanitizer shipped still carries the payload, so the senior fix sanitizes at write *and* read and stores the sanitized output.
A second trap is treating this and the missing CSP (finding 4) as one issue; they are two findings against one threat model — the sink itself versus the missing defense-in-depth layer — and a strict CSP with a nonce does not save a `<img onerror="…">` payload.
For completeness, name the adjacent sink shapes the same eye should catch (`eval`, `new Function`, `setTimeout(string, …)`, direct `innerHTML =` assignment), none seeded here but worth recognizing; documenting them is out of scope unless a hit appears.

- The XSS sink in `src/app/(protected)/invoices/[id]/notes.tsx` is located with a line range and the grep command that surfaced it.
- The finding is confirmed against the running app: a note containing markup renders as raw HTML rather than as escaped text.
- The rule is named as the operator-trustworthiness rule for rendered content (lesson 2 of chapter 080, lesson 1 of chapter 081), linked by section ID.
- The consequence reads as stored XSS reachable in any organization's invoice notes, in user-visible terms.
- The fix names sanitize-at-write-and-read with the sanitized output stored, and explicitly addresses the historical-data vector that a write-only sanitizer misses.
- The finding records that a strict CSP (finding 4) is the complementary defense-in-depth layer, not a substitute for sanitizing the sink.
- `findings/002-xss-html-sink.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/002-xss-html-sink.md`, walks the rendered-DOM read and the grep evidence, explains the write-and-read sanitization choice in a sentence or two, and frames finding 2 and finding 4 as a pair to read together.
It links the React fundamentals on `dangerouslySetInnerHTML` (chapter 026) and the CSP-as-defense-in-depth rule (lesson 1 of chapter 081) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 3`: it asserts that `findings/002-xss-html-sink.md` carries the four sections and names the XSS rule, and probes that the seeded sink is still present.
Then confirm by hand: the running-app fingerprint was reproduced (markup renders raw); the fix names sanitize-at-write-and-read and addresses historical data; the finding cross-references finding 4 as the second defense layer.

---

## Lesson 4 — Finding 3: the missing audit-log write

The silent ownership transfer in `src/lib/billing/transfer-ownership.ts` (`transferBillingOwnership`) documented as `findings/003-audit-log-ownership-transfer.md`.
The mutation updates `organization.ownerId` and the member rows without a `logAudit(tx, event)` call inside the transaction; the finding names the missing operator record.

### Your mission

This is the finding that hides best — nothing errors, nothing renders wrong, no behavior breaks — so the only discipline that catches it is reading the canonical six-category event set (lesson 3 of chapter 081) against every mutation in `src/lib/`.
The audit step is grep `db.transaction` and `.update(` across `src/lib`, then check each security-relevant mutation for a `logAudit(tx, event)` call inside the same transaction; the seeded gap is the billing ownership transfer (which imports no audit writer at all — the absence is the defect).
This finding sits at the seam between two categories — it is primary in audit-log gaps (category 6), and it surfaces again when the user-vs-operator message split is discussed, because the *operator record* is what is missing — but it is written once, here.
The senior reflex to internalize is pattern-matching "this mutation touches a security-relevant field — does it write an audit-log entry?" and treating the audit-log event set as a project-level invariant rather than a per-feature decision.
The consequence belongs in compliance and customer-facing terms: an auditor is blind to the ownership history, and the customer-facing Activity page is silent on one of the most security-relevant events a tenant can experience.

- The missing audit-log write in `src/lib/billing/transfer-ownership.ts` is located with a line range and the grep commands that surfaced it.
- The finding is reached by walking the canonical six-category event set against the mutation, and the finding records that the mutation belongs to a security-relevant category that mandates a log entry.
- The rule is named as the audit-log canonical event set with transaction discipline (lesson 3 of chapter 081), linked by section ID.
- The consequence reads in compliance and customer-facing terms: the ownership-transfer history is unrecoverable and the Activity page is silent on it.
- The fix names the senior reach: add `org.ownership-transferred` to the canonical event set (single-dot `entity.verb-pasttense` form), write it inside the transaction, with a redacted payload of `{ previousOwnerId, nextOwnerId }`.
- `findings/003-audit-log-ownership-transfer.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/003-audit-log-ownership-transfer.md`, shows the mutation beside the missing `logAudit` call, and explains why the event set is a project-level invariant.
It links the canonical event set and transaction discipline (lesson 3 of chapter 081) and the `logAudit(tx, event)` seam (lesson 5 of chapter 057) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 4`: it asserts that `findings/003-audit-log-ownership-transfer.md` carries the four sections and names the audit-log rule, and probes that the seeded gap is still present.
Then confirm by hand: the location names the grep commands; the consequence is framed for an auditor and the Activity page rather than as a developer note; the fix names the exact event slug, the in-transaction write, and the redacted payload schema.

---

## Lesson 5 — Finding 4: the CSP header omission

The missing Content-Security-Policy documented as `findings/004-csp-header.md`.
`next.config.ts` ships five static headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) but no CSP, and `src/proxy.ts` generates no per-request nonce; the finding names the missing defense-in-depth and the nonce-plus-`'strict-dynamic'` fix.

### Your mission

This is the cheapest, highest-value pass in the audit — a launch review starts with the headers, and a target without a CSP is "not launched" by the senior's bar.
The audit step is read off the running app first: `curl -I http://localhost:3000/` (or a run through `securityheaders.com`) reveals the five static headers the target does ship but no `Content-Security-Policy` and no `frame-ancestors`; then open `next.config.ts`'s `headers()` block and `src/proxy.ts`'s (absent) nonce generation to confirm where the piece is missing.
This is a "missing-piece" finding, valid as a finding rather than "not applicable": the location is "missing from `next.config.ts`" and "should be generated in `src/proxy.ts`."
The category is security headers (lesson 1 of chapter 081), and the fix is structural: a static CSP in `next.config.ts`, a per-request nonce in `src/proxy.ts`, the `x-nonce` header threaded to Server Components, with `'strict-dynamic'` so the nonce governs script execution.
The trap to avoid is stopping at "add a CSP header" — the nonce and `'strict-dynamic'` are the load-bearing parts, and the marketing-site trade-off (third-party scripts) is acknowledged rather than ignored.
Read this finding as the second half of finding 2's threat model: the CSP is the defense-in-depth layer that backstops the XSS sink and any future sink.

- The CSP omission is located off `curl -I` (or `securityheaders.com`) with the response headers recorded, and named as missing from `next.config.ts` and `src/proxy.ts` with the relevant blocks identified.
- The finding records the five static headers the target does ship and the CSP / `frame-ancestors` it lacks.
- The rule is named as the CSP-with-per-request-nonce-plus-`'strict-dynamic'` rule (lesson 1 of chapter 081), linked by section ID.
- The consequence reads as the absence of defense-in-depth against the finding-2 XSS sink and any future sink, in user-visible terms.
- The fix names the static CSP in `next.config.ts`, the per-request nonce in `src/proxy.ts`, the `x-nonce` thread to Server Components, and `'strict-dynamic'`, with the marketing-site third-party-script trade-off acknowledged.
- The finding cross-references finding 2 as the sink this header backstops.
- `findings/004-csp-header.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/004-csp-header.md`, shows the `curl -I` evidence, and explains the nonce-plus-`'strict-dynamic'` choice and the marketing trade-off in a sentence or two each.
It links the security-headers rule and the `next.config.ts` / `src/proxy.ts` split (lesson 1 of chapter 081) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 5`: it asserts that `findings/004-csp-header.md` carries the four sections and names the CSP rule, and probes that the seeded gap is still present.
Then confirm by hand: the location records the `curl -I` response and names both files; the fix names the per-request nonce and `'strict-dynamic'`, not just "add a CSP"; the finding cross-references finding 2.

---

## Lesson 6 — Finding 5: the secret in `NEXT_PUBLIC_*`

The leaked Resend key documented as `findings/005-secret-next-public.md`.
`NEXT_PUBLIC_RESEND_API_KEY` (declared in `src/env.ts`'s client partition) is consumed by the `ResendClientTest` Client Component in `src/app/(protected)/settings/resend-test.tsx`, which calls Resend from the browser; the finding names the leaked-key consequence and the rename-move-rotate fix.

### Your mission

This is a *naming* finding — the developer chose the `NEXT_PUBLIC_*` prefix to silence a build error, and the `env` schema's `server` partition (lesson 7 of chapter 081) would have caught it had the right side been used.
The audit step is grep: `NEXT_PUBLIC_` in `.env.example` and the `src/env.ts` schema (imported as `@/env`), `process.env.` outside `src/env.ts`, and a check of any `SKIP_ENV_VALIDATION` usage; the running app confirms it, since DevTools' network tab shows the settings page's Client Component firing a Resend request that carries the key in the `Authorization` header.
The category combines secrets (lesson 6 of chapter 081) and env validation (lesson 7 of chapter 081) because they share the `src/env.ts` schema (imported as `@/env`).
The load-bearing point an inexperienced dev misses: the fix is structural, not configurational — rename to `RESEND_API_KEY` in the `server` partition and move the call to a Server Action — and a lint rule alone (no `NEXT_PUBLIC_*` matching `*_KEY` / `*_SECRET` / `*_TOKEN`) is a follow-up, not the fix.
The other half of the fix is rotation: the key is *already in production* by the time the audit catches it, so the fix runs the rotation runbook from lesson 6 of chapter 081 with Vercel-before-provider order; pretending the leaked key is still safe is itself a fail.

- The leaked key is located with the grep commands that surfaced it and the `resend-test.tsx` Client Component call site named.
- The finding is confirmed against the running app: the DevTools network tab shows the key leaving the browser.
- The rule is named as no-secrets-in-`NEXT_PUBLIC_*` (lesson 6 of chapter 081) plus the server/client env split the prefix bypassed (lesson 7 of chapter 081), linked by section ID.
- The consequence reads as the key shipping in the client bundle and an attacker mailing from the verified domain — domain-reputation damage, deliverability loss, customer-base phishing risk — in user-visible terms.
- The fix names the structural change: rename to `RESEND_API_KEY` in the `server` partition and move the call to a Server Action, with the no-`NEXT_PUBLIC_*`-secret lint rule noted as a follow-up.
- The fix includes rotating the already-leaked key via the lesson-6-of-chapter-081 runbook in Vercel-before-provider order.
- `findings/005-secret-next-public.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/005-secret-next-public.md`, shows the grep and DevTools evidence, and explains why the fix is structural-plus-rotation rather than a lint rule alone.
It links the secrets rules (lesson 6 of chapter 081) and the env partitions (lesson 7 of chapter 081) and the typed `env` seam (lesson 2 of chapter 037) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 6`: it asserts that `findings/005-secret-next-public.md` carries the four sections and names the secrets rule, and probes that the seeded `NEXT_PUBLIC_RESEND_API_KEY` is still present.
Then confirm by hand: the running-app fingerprint was reproduced in DevTools; the fix names the rename, the Server Action move, *and* rotation; the lint rule is noted as a follow-up, not as the fix.

---

## Lesson 7 — Finding 6: the missing rate limit on password-reset

The unthrottled password-reset endpoint documented as `findings/006-rate-limit-password-reset.md`.
`src/app/api/auth/reset-password/route.ts` triggers Resend with no limiter (the declared `resetLimiter` in `src/lib/rate-limit.ts` is never imported here); the finding names the abuse consequence and the dual-keyed `safeLimit` fix, with the coverage matrix attached.

### Your mission

This finding is found by reading the route list against the coverage matrix, not by exercising the app — though the running app confirms it, since submitting the password-reset form ten times in a row returns no 429.
The audit step is to open `src/lib/rate-limit.ts` and read the declared limiters (`signInLimiter`, `signUpLimiter`, `resetLimiter`), then open each `src/app/api/auth/*/route.ts` handler and confirm it runs through `safeLimit` (`src/lib/safe-limit.ts`); the seeded gap is the reset-password route, which imports no limiter at all.
The category is rate-limit coverage (lesson 2 of chapter 081), and the rule's three triggers apply here on two counts — the endpoint costs money via Resend and attacks a third party via the user's inbox — so it mandates a limiter.
The senior delivery attaches the coverage matrix from lesson 2 of chapter 081 (endpoint category, file, limiter, key strategy, coverage Y/N) to the fix, and documents both the grep discovery method and the manual hammer-the-endpoint verification, since each belongs in the report for a different reason.
The fix is dual-keyed — per-IP *and* per-email — because per-IP alone leaves account-enumeration and inbox-bomb vectors open.

- The missing limiter is located by reading `src/lib/rate-limit.ts` against the `src/app/api/auth/*/route.ts` handlers, with the reset-password route named.
- The finding is confirmed against the running app: repeated password-reset submissions return no 429.
- The rule is named as rate-limit coverage with the three mandatory triggers (lesson 2 of chapter 081), and the finding records which two triggers this endpoint hits, linked by section ID.
- The consequence reads as mass spam, account-enumeration, and inbox-bomb abuse, in user-visible and third-party terms.
- The fix names wiring the already-declared `resetLimiter` (per-IP) plus a per-email limiter, wrapping the handler with `safeLimit`, emitting `RateLimit-*` headers, and returning a generic 429 body.
- The coverage matrix (endpoint category, file, limiter, key strategy, coverage Y/N) is attached to the finding.
- `findings/006-rate-limit-password-reset.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/006-rate-limit-password-reset.md` and the attached coverage matrix, and explains why dual keying is required and why both the grep and the manual test belong in the report.
It links the coverage matrix and the three triggers (lesson 2 of chapter 081) and the `safeLimit` seam (lesson 3 of chapter 080, lesson 3 of chapter 074) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 7`: it asserts that `findings/006-rate-limit-password-reset.md` carries the four sections, names the rate-limit rule, and includes a coverage matrix, and probes that the seeded gap is still present.
Then confirm by hand: the running-app fingerprint was reproduced (no 429 on repeated submits); the fix names per-IP *and* per-email keying; both the discovery grep and the manual verification are documented.

---

## Lesson 8 — Finding 7: the dep-hygiene gap

The missing supply-chain defaults documented as `findings/007-dep-hygiene.md`.
`pnpm-workspace.yaml` overrides the safe defaults — `minimumReleaseAge: 0`, `blockExoticSubdeps: false`, `strictDepBuilds: false` — and `pnpm audit` corroborates with a pin; the finding names the pre-install-defense gap and the `pnpm-workspace.yaml` fix.

### Your mission

This is the finding inexperienced teams resist with "but we just enabled Dependabot," and the senior counter is the load-bearing distinction: Dependabot raises PRs *after* a malicious release has landed in the registry, while `minimumReleaseAge` is the *pre-install* defense — the 24-hour window is the time the community catches and yanks a compromised release.
They are different controls, and `pnpm audit` is itself a post-install signal, not a pre-install defense.
The audit step is a deterministic read (no install): grep `pnpm-workspace.yaml` and confirm `minimumReleaseAge`, `blockExoticSubdeps`, and `strictDepBuilds` are on (not the disabled values seeded here) and that `allowBuilds` is a reviewed allow-list; grep `.npmrc` to confirm pnpm settings do *not* live there; run `pnpm audit --prod` as the corroborating post-install signal; confirm `packageManager` is pinned in `package.json` (it is — `pnpm@11.3.0`); and confirm CI uses `--frozen-lockfile`.
The category is dep hygiene (lesson 8 of chapter 081), and the seeded gap is the three disabled `pnpm-workspace.yaml` flags plus the audit pin; the `allowBuilds` allow-list and `packageManager` pin stay correct on purpose.
Frame the rule against the real threat — the 24-hour `minimumReleaseAge` is the defense against typosquats and maintainer-compromise vectors like Shai-Hulud — so the finding reads as a missing control, not a version-bump chore.

- The missing settings are located by reading `pnpm-workspace.yaml` and the `pnpm audit --prod` output, with the outdated pin named.
- The finding records the state of `minimumReleaseAge`, `blockExoticSubdeps`, `strictDepBuilds`, the `allowBuilds` allow-list, the `packageManager` pin, and the CI `--frozen-lockfile` flag.
- The rule is named as the pnpm 11+ supply-chain defaults with the 24-hour pre-install window (lesson 8 of chapter 081), linked by section ID.
- The consequence reads as a malicious release landing the day it ships with no defense in place, and `pnpm audit` distinguished as a post-install signal rather than a pre-install defense.
- The fix names keeping the `pnpm-workspace.yaml` defaults on (`minimumReleaseAge`, `blockExoticSubdeps`, `strictDepBuilds`), declaring the `allowBuilds` allow-list, bumping the pinned dep, and gating CI per lesson 3 of chapter 097.
- `findings/007-dep-hygiene.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/007-dep-hygiene.md`, shows the `pnpm-workspace.yaml` read and the `pnpm audit` output, and explains the pre-install-versus-post-install distinction in a sentence or two.
It links the pnpm 11+ defaults (lesson 8 of chapter 081) and the CI gate (lesson 3 of chapter 097) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 8`: it asserts that `findings/007-dep-hygiene.md` carries the four sections and names the supply-chain rule, and probes that the seeded flags are still disabled.
Then confirm by hand: the location records the `pnpm-workspace.yaml` state and the `pnpm audit` output; the consequence distinguishes pre-install from post-install defenses; the fix names the `pnpm-workspace.yaml` settings, not just the version bump.

---

## Lesson 9 — Finding 8: the GDPR deletion gap

The incomplete account deletion documented as `findings/008-gdpr-deletion.md`.
`src/lib/account/delete-account.ts` (`deleteAccount`) deletes only the `user` row — no graph walk, no externals, no audit-log anonymization; the finding names the PII-persistence exposure and the async-deletion-job fix, citing the healthy reference impl `trigger/delete-user.ts`.

### Your mission

This finding usually gets a partial answer — the student names `member` but misses Stripe, Resend, PostHog, and R2 — so the discipline to internalize is the one lesson 4 of chapter 081 installs: name *every* external the user's PII could have leaked to, not just the obvious tables.
The audit step is to open `src/lib/account/delete-account.ts` and walk the data graph (the healthy `trigger/delete-user.ts` shows it): every table holding the deleted user's data and every external service, against the retention catalog.
The category is GDPR deletion (lesson 4 of chapter 081), and the seeded gap is that only the `user` row is deleted while `member`, `invitation`, `invoiceNotes`, `exports`, the `auditLogs` actor columns, Stripe, Resend, PostHog, and R2 are untouched.
A second senior point: audit-log rows are *anonymized*, never hard-deleted — deletion and the audit trail are in tension, and anonymization is how both survive.
The consequence is legal: PII persists past a successful deletion request, which is Article 17 exposure, and the confirmation email the user received is a lie.

- The incomplete deletion is located by walking the data graph in `src/lib/account/delete-account.ts`, with the untouched tables and externals named.
- The finding enumerates every PII seam the deletion misses — the data-graph tables and the external services — against the retention catalog.
- The rule is named as the async deletion job with the three deletion shapes, audit logs anonymized rather than hard-deleted (lesson 4 of chapter 081), linked by section ID.
- The consequence reads in legal terms: PII persists past a successful request, Article 17 exposure, and the confirmation email is false.
- The fix names routing through the async Trigger.dev `deleteUser` job (`trigger/delete-user.ts`), blocking sign-in for the in-progress account, anonymizing the `auditLogs` actor columns, calling the Stripe / Resend / PostHog / R2 deletes, then removing the `user` row.
- `findings/008-gdpr-deletion.md` has all four template sections filled and the audit target still runs unchanged.

### Coding time

Direct the student to write the finding against the template and the brief, then read the solution.
The hidden solution reproduces `findings/008-gdpr-deletion.md`, walks the full data graph the deletion must cover, and explains the anonymize-don't-delete tension for audit logs.
It links the retention catalog and the three deletion shapes (lesson 4 of chapter 081) rather than re-explaining them.

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 9`: it asserts that `findings/008-gdpr-deletion.md` carries the four sections and names the GDPR-deletion rule, and probes that the seeded one-row delete is still present.
Then confirm by hand: the location enumerates every missed table and external, not just `member`; the fix names audit-log anonymization rather than deletion; the consequence is framed in Article 17 terms.

---

## Lesson 10 — Commit and self-grade

The eight findings committed, then scored clause-by-clause against the answer key in `solution/findings/`.
The student leaves with a side-by-side comparison, a coverage percentage, and a personal audit checklist for the next pass.

### Your mission

This is the audit's culminating verifiable act and its central rehearsal: a real audit has no answer key, so running it under "no peeking until committed" is the practice that matters.
The commit is the irreversible step — `git add findings/ && git commit -m "Unit 16 audit findings"` — and only after it does the student open the answer key. In the real-course framing that means fetching the `v1.0-answer-key` tag; in this repository it means reading `solution/findings/` beside the student's `findings/` for a side-by-side diff.
Before committing, the `findings/SUMMARY.md` scorecard records coverage (8/8, 7/8, and so on) and names any deliberate miss with one sentence of why, since quantifying misses is itself part of the deliverable.
The scoring rule is the senior reach: rule + location match is the audit floor, and the fix-detail match is the reach — a student who names the rule and location but proposes a less-thorough fix is still doing the audit; a student who names neither has not run the pass.
The two bonus findings score here if the student caught them — finding 9 (the PostHog consent gate, `opt_out_capturing_by_default: false` in `src/app/_components/providers.tsx` with no `ConsentProvider`, which fires a network request on first page load) and finding 10 (the worker endpoint `src/app/api/exports/trigger/route.ts` calling `signInLimiter.limit(key)` directly, a `.limit(` grep hit not routed through `safeLimit`) — taking the score from the 8/8 floor toward the 10/10 reach.
Missed findings are not failure; they are the next audit's lesson, and the senior reflex is to fold every miss into the personal grep/curl checklist so the audit sharpens each pass.
This lesson also closes the project: it restates the two chapter-080 commitments that ran through the error findings, the single-place-to-lint pattern that made the pass grep-able, the coverage-over-depth bar, and the portability of the audit shape, then points forward — fixing these findings is the next sprint's work (out of scope here), and chapters 088, 090, 092, 095, 097, and 104 each pick up a thread this audit surfaced.

- The eight findings are committed in a single commit before the answer key is consulted, on the honor system.
- `findings/SUMMARY.md` records the coverage count and names every deliberate miss with one sentence of cause.
- The answer key in `solution/findings/` (real-course framing: the `v1.0-answer-key` tag) is consulted only after the commit, and a side-by-side comparison is produced.
- Each finding is scored clause-by-clause — rule match, location match, consequence match, fix match — applying the partial-credit rule that rule + location is the floor and fix detail is the reach.
- The common senior-reach gaps the answer key names are checked against the student's findings (finding 1 lets `authedAction` convert the throw; finding 2 sanitizes at write and read; finding 3 carries the exact event slug and payload schema; finding 4 the nonce plus `'strict-dynamic'`; finding 5 rotation, not only rename-and-move; finding 6 dual keying; finding 7 the `pnpm-workspace.yaml` defaults; finding 8 the full graph).
- Any bonus findings written (9 consent gate, 10 `safeLimit` bypass) are scored, moving the result from the 8/8 floor toward 10/10.
- A coverage percentage is recorded and the personal grep/curl checklist is updated with every miss.

### Coding time

Direct the student to commit, then check out the key and score against the brief's partial-credit rule, then read the solution.
The hidden solution walks the clause-by-clause comparison for each finding, names the senior-reach detail students most often miss per finding, and models the updated personal checklist.
It links the forward references rather than expanding them — chapter 088 (integration tests against `authedAction` and the message-mapper), chapter 090 (a Playwright money-path test exercising the rate limit and consent gate), chapter 092 (Sentry's `beforeSend` redactor, the operator side of the message split), chapter 095 (the observability and performance audit on the same target, where the consent-gate finding re-surfaces if unfixed), chapter 097 (CI gates catching some findings at PR time), and chapter 104 (a seeded-PR review using the same disciplined-reading muscle).

### Moment of truth

Run the lesson's gate with `pnpm test:lesson 10`: it asserts the observable end state — `findings/SUMMARY.md` carries a coverage count and the two bonus findings — and probes that the seeded defects are still present.
Then confirm by hand: the commit preceded consulting the answer key (honor system held); each finding was scored on rule, location, consequence, and fix; the partial-credit rule was applied; any bonus findings were scored; and the personal checklist was updated with every miss.
