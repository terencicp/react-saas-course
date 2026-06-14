# Chapter 082 — Project plan: the pre-launch audit pass

## Design decision (resolved — read first)

This project's deliverable is **not application code**. It is a committed `findings/` directory of Markdown — one file per seeded defect, each on the rule-location-consequence-fix template. The codebase is a **seeded audit target**: a fork of the running SaaS app with **eight planted bugs**, run **read-only**. The student never patches the target; the proposed fix is a paragraph, not a diff.

Mapping the chapter outline's `degit`-starter + `v1.0-answer-key`-tag model onto this pipeline's `solution/` + `start/` split:

- **The audit target** (the app with all 8 bugs intact and observable) is the *substrate*, identical byte-for-byte in `start/` and `solution/`. The scaffolding-coder builds it whole — including the 8 seeded defects — because no slice edits target code.
- **`solution/findings/`** = the answer key (the `v1.0-answer-key` content): all 8 finding files filled, `SUMMARY.md` scored 8/8 (+ the 2 bonus findings 9/10), `out-of-scope.md` populated.
- **`start/findings/`** = the scaffold the student gets: `template.md` + 8 numbered placeholders with empty bodies + empty `SUMMARY.md`/`out-of-scope.md`.
- **Each slice authors one answer-key finding file** (Markdown) on top of the scaffolded target. The slice "codes" prose, not TS. The seeded bug it documents already exists in the target.
- **`start/` derivation** strips the finding bodies back to placeholders (the inverse direction from a normal project: here the "student work" is the Markdown, and the slices produce the answer key).

Consequence threaded through the whole plan: **finding correctness is verified by static checks** (grep for the four template sections, the named rule, the file location, the senior-reach fix token) — Markdown does not render in a browser. **Rendered checks verify the audit target boots intact and the *visible* fingerprints render** (the XSS sink renders user markup as live HTML; the notes route paints; the secret-leaking client component mounts; the seeded dashboard loads as the admin). The two browser-invisible fingerprints (curl-readable headers, DevTools network) are static checks against the source, not rendered checks. **Screenshots capture only real app routes** the lessons teach a visible surface for — here, the one genuinely visual fingerprint (the XSS sink rendering bold) and the seeded invoices surface the audit reads against; the deliverable figure (a finding file beside the directory tree) is a Markdown artifact, captured `none`.

Why this base, not a single ancestor: the dependency map lists 065/067/075, but no one of them carries every seam the eight findings reference. **Fork the 067 `solution/`** (it already merges the 059 org/RBAC/audit/auth backend + the 062 invoices layer + the 050 Resend path + the Trigger.dev export job), then **graft the 075 rate-limiter** (`lib/rate-limit.ts` + `safeLimit`) and the **065 Stripe webhook + `plan_entitlements`** so findings 1/3/6/8 land on real call sites. The eight defects are then **planted** as deviations from that healthy lineage.

## Project goals

The project cements Unit 16 by running the two audit passes the unit installed — error discipline (chapter 080: fail-closed, the user-vs-operator message split) and the security baseline (chapter 081: headers, rate-limit coverage, audit-log gaps, GDPR posture, consent, secrets, env validation, dep hygiene) — against a seeded target, end-to-end. The student practices the load-bearing senior audit skills, none of which is keystrokes: (1) **read a running app and its source side-by-side** to surface defects an inexperienced dev misses — every finding's location names the grep/curl command that surfaced it, never a code-review opinion; (2) **name a defect against a precise rule** from chapter 080/081, linked by lesson section — the rule is the load-bearing piece the answer key scores first; (3) **write the consequence in user-visible or legal terms** (the read-aloud test), not "code smell" — the user-vs-operator split from chapter 080 powers this column; (4) **reach for the senior fix** named by the helper/wrapper/config it lives in (`authedAction`, `safeLimit`, `logAudit`, `RESEND_API_KEY` in the `server` partition, the CSP nonce in `proxy.ts`, the async `deleteUser` job); (5) **work under real-audit constraints** — coverage over depth (every category gets a finding or a written "none"), no peeking at an answer key until committed, misses quantified in `SUMMARY.md` and folded into a personal grep/curl checklist. The skill being assimilated is the disciplined-reading muscle of a launch review: the codebase is the textbook, the eight findings are the exam, and the discipline is finding-then-documenting before moving on.

The point is not to write code; it is to walk a realistic launch-review workflow and cement the two chapters' rules by applying them. The target is deliberately the smallest surface that lands one defect per audit category — eight findings, two bonus — so the student completes the pass quickly and the structural lesson ("name the rule, name the location with its command, name the consequence for a human, name the senior fix") lands without app-feature noise.

## Student position

The student has finished Units 1–15 plus both Unit 16 teaching chapters (080 error discipline, 081 security baseline) — the chapters this audit pass *consumes*. They know, and the audit reads against, the full lineage: TypeScript 6 strict, React 19 (Server/Client Components, `error.tsx`/`global-error.tsx`), Next.js 16 App Router (`cacheComponents`, Suspense, `proxy.ts` = the renamed middleware, route handlers), Tailwind v4 + shadcn/ui, Postgres 18 + Drizzle 0.45 (`tenantDb`, `db.transaction`, `$inferSelect`), Zod 4, the single-param `Result<T>` + 7-code `ErrorCode` union, Better Auth + the organization plugin (`requireOrgUser()` → `{ user, orgId, role }`, `authedAction(role, schema, fn)`, `roleAtLeast`), `audit_logs` + deny-write RLS + `logAudit(tx, event)`, the Stripe webhook (verify→claim→mutate, `processed_events`) + `plan_entitlements`, the Trigger.dev export job, Resend + `sendEmail`, `@upstash/ratelimit` + `safeLimit`, `@t3-oss/env-nextjs` typed `env`, PostHog wired (ungated), and — the Unit 16 carry-in this audit *is* — the **eight audit categories and their rules**: fail-closed + the four fail-open anti-patterns (080 L1), the user-vs-operator message split + the redactor + `error.tsx` discipline (080 L2), the six error seams + the per-seam grep audit (080 L3), the six security headers + the static/dynamic `next.config.ts`/`proxy.ts` split + nonce + `'strict-dynamic'` (081 L1), the three mandatory-limiter triggers + the seven endpoint categories + the coverage matrix (081 L2), the six audit-event categories + transaction discipline + `entity.verb-pasttense` naming (081 L3), the retention catalog + the async deletion job + the three deletion shapes + anonymize-don't-delete (081 L4), the consent gate's pre-consent rule (081 L5), the secrets rules + rotation order (081 L6), the four env-validation invariants (081 L7), and the pnpm 11+ supply-chain defaults (081 L8).

**Not yet known — coder agents must NOT introduce these into the findings or the target:**
- **Sentry SDK wiring, pino structured logging, AsyncLocalStorage `requestId`, Vercel Drains.** Unit 19 (chapter 092). The operator side of the message split is named ("where the redactor/log goes") but its wiring is a forward reference — finding consequences may *name* "the operator log / Sentry" but must not assume a wired Sentry SDK. The target ships only a provided structured logger the audit reads, not Sentry.
- **Vitest/Playwright/RTL/MSW test suites.** Unit 18 (chapters 086–091). This project ships only the `test:lesson` gate placeholders; findings must not propose "write a test" as the fix (that is chapter 088/090's forward thread, nameable but not the senior reach here).
- **CI gates / GitHub Actions / `--frozen-lockfile` enforcement / ESLint lint-rules automating the greps.** Unit 20 (chapter 097). Findings may name "wire this into CI later (chapter 097)" as a follow-up, never as the fix itself.
- **`next-intl` / i18n of `userMessage` strings, Temporal in domain code.** Unit 17. The audit reads strings as authored-for-a-human; do not localize.
- **The fixes as applied diffs.** The deliverable is documentation; no finding ships a patch. A short illustrative snippet is allowed only when the fix is structural (per the template), never a full diff, and the target source is never modified.

## Scaffolding recipe

Build a single `solution/` that contains (a) the **seeded audit target** — a healthy fork of the 067 lineage with eight defects planted and two bonus defects planted — and (b) the **filled `findings/` answer key**. The target must boot, serve the carried-in flows, and exhibit all eight fingerprints; `pnpm verify` must pass **with the seeded defects in place** (every defect compiles and renders — that is the whole premise of an audit: the bugs ship green). The `findings/` answer-key files are authored by the slice-coders, not here — scaffold only the `findings/` *scaffold* (template + empty placeholders), exactly as `start/` will carry it; the slices overwrite the placeholder bodies with the answer key.

This recipe is the only section the scaffolding-coder reads. Build everything below now; leave only the eight finding-file bodies (and the SUMMARY/out-of-scope bodies) as placeholders for the slice-coders.

### Fork and graft

1. **Fork the 067 `solution/`** (`projects/Chapter 067/solution/`) wholesale — it carries the 059 org/RBAC/audit/auth backend, the 062 invoices layer (`invoices` table + `listInvoices`), the 050 Resend send path, `logAudit` (with the explicit-context overload), `proxy.ts`, the `(auth)` + `(protected)` surfaces, `error.tsx`, the toolchain pinned (incl. the `kysely@0.28.17` override), and the Trigger.dev export job + `trigger/` folder. Rename the package to `chapter-082-audit-target`.
2. **Graft the 075 rate-limiter:** copy `src/lib/rate-limit.ts` (the module-scope `Ratelimit` declarations + `safeLimit` fail-open wrapper) and add the two Upstash env keys to `src/env.ts` (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Declare `signInLimiter`, `signUpLimiter`, `resetLimiter` (the password-reset limiter is the one finding 6 finds **missing from the route**, so it exists in `lib/rate-limit.ts` but is **not wired** on the reset route — that omission is the seeded defect, not a missing declaration).
3. **Graft the 065 Stripe webhook + `plan_entitlements`:** copy `src/app/api/webhooks/stripe/route.ts`, `src/lib/webhooks/stripe.ts`, `src/lib/billing/*`, `src/db/queries/entitlements.ts`, the `plan_entitlements` + `processed_events` schema, and the Stripe env block. These power finding 1 (`requireRole` fail-open) and finding 3 (missing `logAudit` on ownership transfer), which live in admin/billing helpers alongside.
4. **Wire PostHog ungated:** add `posthog-js` (the official Next App-Router path; `@posthog/next` has no published `1.x` and drags a `@vercel/functions` peer) and initialize it inside the existing client `<Providers>` (`'use client'`) via `posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, { opt_out_capturing_by_default: false })` in a mount `useEffect`, wrapping children in `PostHogProvider` from `posthog-js/react` (bonus finding 9 — the consent gate is absent; the `ConsentProvider` from 081 L5 is **not** present). Add `NEXT_PUBLIC_POSTHOG_KEY` to the env's `client` partition.

### The eight seeded defects (planted, NOT stubbed — they ship working-but-wrong)

Each is a deviation from the healthy lineage. Plant them as real, compiling, rendering code so the audit reads against a live target.

1. **Fail-closed violation** — `src/lib/admin/transfer-ownership.ts`: an admin action wrapping `requireRole('owner')` (or the `roleAtLeast('owner')` check) in a `try/catch` that logs and **falls through** on exception (the catch returns success / continues instead of re-throwing). The healthy shape lets the throw propagate to `authedAction`'s catch. Real call site, compiles, behaves wrong only on a thrown check.
2. **`dangerouslySetInnerHTML` on user content** — `src/app/(protected)/invoices/[id]/notes.tsx`: a Server/Client component rendering the user-submitted note `body` via `dangerouslySetInnerHTML={{ __html: note.body }}` with **no sanitization**. The seed plants at least one invoice note whose `body` contains tame markup (`<b>bold</b>`) so the running app renders it as **live bold**, the visible fingerprint. (Add a `notes` column/table to the invoices schema if absent; seed it.)
3. **Missing audit-log write** — `src/lib/billing/transfer-ownership.ts` (distinct from #1): a mutation that `UPDATE`s `organizations.ownerId` (or the membership owner row) inside a `db.transaction` **without** a `logAudit(tx, { action: 'org.ownership-transferred', … })` call. Every other security-relevant mutation in `lib/` writes its audit row; this one is silent.
4. **CSP header omission** — `next.config.ts` ships HSTS + `X-Content-Type-Options` (+ the static headers) but **no CSP**, and `proxy.ts` generates **no per-request nonce** and sets no CSP. (Strip the CSP/nonce machinery the 081 baseline would carry; keep the other five static headers so the fingerprint is "CSP absent", not "no headers at all".)
5. **Secret in `NEXT_PUBLIC_*`** — `src/env.ts` declares `NEXT_PUBLIC_RESEND_API_KEY` in the **`client`** partition, and a **Client Component** (`src/app/(protected)/settings/resend-test.tsx` or similar) reads it and calls Resend from the browser (`fetch('https://api.resend.com/emails', { headers: { Authorization: \`Bearer ${env.NEXT_PUBLIC_RESEND_API_KEY}\` } })`). The healthy shape is `RESEND_API_KEY` in the `server` partition + a Server Action. The client component must mount and render (the network request need not succeed — a 401 from a fake key is fine; the fingerprint is the key in the client bundle + the request leaving the browser).
6. **Missing rate limit on password-reset** — `src/app/api/auth/reset-password/route.ts` (or the reset Server Action): triggers Resend (`forgetPassword` / `sendEmail`) with **no `safeLimit` gate**, while `lib/rate-limit.ts` declares a `resetLimiter` that nothing imports here. The healthy shape wraps the handler in per-IP + per-email `safeLimit`. Compiles, sends on every call.
7. **Outdated dep + missing pnpm 11+ defaults** — the **primary, deterministic** defect: `pnpm-workspace.yaml` has `minimumReleaseAge: 0` and `blockExoticSubdeps: false` and `strictDepBuilds: false` explicitly set (overriding the safe pnpm 11 defaults) — a grep finds this with no install step. **Secondary:** `package.json` pins one existing dep to an older version `pnpm audit` flags (a real low-severity advisory-bearing version that does **not** block `next build` — `pnpm audit` is not in the verify chain, so even a high advisory only surfaces in the audit output, never failing the build; pick one whose older version still type-checks and builds). `.npmrc` holds only auth/registry config (the "not where supply-chain settings live" evidence). The `allowBuilds: { sharp: true, esbuild: false }` map must stay correct so `next build` passes despite `strictDepBuilds: false` — the seeded gap is the three safety flags + the pin, never the build allow-list. The finding's location cites the `pnpm-workspace.yaml` flags as the load-bearing evidence and the `pnpm audit --prod` output as corroboration.
8. **GDPR deletion leaves rows behind** — `src/lib/account/delete-account.ts`: deletes only the `users` row (`db.delete(users).where(eq(users.id, userId))`) — **no** graph walk (`org_members`, `invitations`, `audit_logs`, `invoices`, `exports`), **no** external calls (Stripe/Resend/PostHog/R2), **no** audit-log anonymization, **no** async `deleteUser` job. The healthy shape routes through the Trigger.dev `deleteUser` job walking the retention catalog. Compiles, deletes one row.

**The two bonus defects (planted):**
- **9 (consent gate missing)** — already planted via the ungated PostHog wiring above (`opt_out_capturing_by_default: false`, no `ConsentProvider`). PostHog fires a network request on first page load.
- **10 (`safeLimit` bypass on a worker endpoint)** — one endpoint (e.g. the export-trigger route or an internal API) calls `limiter.limit(key)` **directly** instead of through `safeLimit` — a bare `.limit(` grep hit not preceded by `safeLimit`.

### The `findings/` scaffold (placeholders the slices fill)

At the repo root (NOT under `src/`), ship `findings/` exactly as `start/` carries it:

- `findings/template.md` — **provided in full** (the rule-location-consequence-fix template from the chapter outline, verbatim: `# Finding NNN — <short title>`, `**Category:**`, `**Severity:**`, `## Rule`, `## Location`, `## Consequence`, `## Fix`). Never a placeholder — it is the contract.
- `findings/001-fail-closed.md` … `findings/008-gdpr-deletion.md` — **placeholders**: each ships the template's section headers (`## Rule`/`## Location`/`## Consequence`/`## Fix`) with empty bodies and a `<!-- TODO(L<n>) — document finding N: <one-line> -->` marker naming the lesson that owns it. The slice-coders overwrite the bodies with the answer key. (Numbering: 001→L2, 002→L3, 003→L4, 004→L5, 005→L6, 006→L7, 007→L8, 008→L9.)
- `findings/out-of-scope.md` — **placeholder**: a header + `<!-- TODO(L2) — observations outside the eight categories -->`.
- `findings/SUMMARY.md` — **placeholder**: a coverage-scorecard header + `<!-- TODO(L10) — coverage count, deliberate misses, bonus findings, personal checklist -->`.

### Provided audit-reading affordances

The audit is "read the running app + the source side-by-side", so the target must be *navigable* and the fingerprints *reachable*:

- The seeded **dashboard** loads on `/` (or `/dashboard`) as the seeded admin user (the 059/067 dev acting-identity override carries in). `data-testid="dashboard"`.
- An **invoice with a planted note** is reachable at `/invoices/[id]` → its `notes.tsx` renders the XSS fingerprint. `data-testid="invoice-note-body"` wraps the `dangerouslySetInnerHTML` output.
- The **secret-leaking client component** mounts on a settings/test route (`data-testid="resend-client-test"`).
- A **README** documents the setup ladder (clone, `pnpm install`, `docker compose up -d`, `pnpm db:migrate && pnpm db:seed`, `pnpm dev`), names the eight categories, names the honor-system answer-key rule, and points at `findings/template.md`. The `degit`/`v1.0-answer-key` mechanics from the chapter outline are described in the README as the real-course workflow; in this repo the answer key is `solution/findings/`.

### Schema, seed, migrations

- Extend the 067 schema with the `invoice_notes` shape (or a `notes text` column on `invoices`) if absent, so finding 2 has a real user-content column. Add `organizations.ownerId`/membership-owner shape if the ownership-transfer helpers need a column to mutate (findings 1/3).
- `scripts/seed.ts` — extend the 067 seed to insert: the seeded admin + a second org, at least one invoice **note containing `<b>bold</b>` markup** (finding 2's visible fingerprint), and the baseline `audit_logs` tail. Deterministic, fixed ids, idempotent `reset()` + direct inserts (drizzle-seed cannot seed the constraint-heavy tables). Seed emails under `@example.com` (the 081 L4 synthetic-domain rule — and note: the seed deliberately does **not** trip the seed-guard, since the guard is healthy here).
- Migrations: ship the 067 migration set plus any added (`invoice_notes`, ownership column). The seeded `pnpm-workspace.yaml` defects (#7) are config, not migrations.

### Dependencies

Union of the 067 + 075 + 065 sets at their pinned versions (carried, not re-derived): `next@16.2.7`, `react`/`react-dom@19.2.4`, `better-auth@^1.6.14`, `drizzle-orm@^0.45.1`, `drizzle-kit@^0.31.5`, `drizzle-zod@^0.8.0`, `drizzle-seed@^0.3.1`, `postgres@^3.4.7`, `@t3-oss/env-nextjs@^0.13.11`, `zod@^4.4.3`, `resend@^6.12.4`, `react-email@^6.5.0`, `radix-ui@^1.4.3`, `stripe@^22.2.0`, `@upstash/ratelimit@^2.0.8`, `@upstash/redis@^1.38.0`, `@trigger.dev/sdk@^4.4.0`, `next-themes@^0.4.6`, `lucide-react@^1.17.0` (no brand icons), `vitest@^4.1.8`, `@biomejs/biome@2.4.16`, `typescript@^6.0.3`, `babel-plugin-react-compiler@1.0.0`, `kysely@0.28.17` (override). **Add `posthog-js@^1.386.6`** (the consent-gate finding only needs it initialized ungated; do **not** use `@posthog/next` — it has no `1.x` release and pulls a `@vercel/functions` peer the lineage doesn't carry). The **one outdated/advisory pin** for finding 7 is a deliberate version downgrade of an existing lineage dep that keeps `tsc`/`next build` green while `pnpm audit --prod` flags it; the **load-bearing finding-7 evidence is the `pnpm-workspace.yaml` flags (deterministic, no install), not the version** — pick a build-safe advisory pin at scaffold time and confirm `pnpm audit --prod` reports it (advisory DBs drift, so the coder re-verifies rather than trusting a hard-coded version here).

### Scripts

Keep all 067 scripts verbatim. `package.json` defines `"verify": "biome ci . && tsc --noEmit && next build"` and `"test:lesson": "node scripts/test-lesson.mjs"` (the carried node wrapper — reads `process.argv[2]`, runs exactly one `tests/lessons/Lesson <n>.test.ts` by absolute path via `pnpm exec vitest run <file>`; confirmed it narrows to one file with no glob OR-match, works in `start/`, node env, no DOM). Plus `dev`/`build`/`start`/`format`/`lint`/`check`/`db:generate`/`db:migrate`/`db:studio`/`db:seed`/`auth:generate`/`email`/`preinstall` carried.

### Lesson test files

Ship `tests/lessons/Lesson 2.test.ts` … `Lesson 10.test.ts` as `describe.todo` placeholders (node env, no DOM). `project-lesson-test-coder` fills them later; each gate inlines its own helpers — no shared helpers module. The gates assert the **observable shape of each finding file** (the four template sections are populated, the named rule appears, the location names a command/file, the fix names the senior reach) and that the **target still boots** (a source-shape probe that the seeded defect is still present — the target is read-only, so a passing gate proves the student documented rather than patched).

### Scaffold acceptance

After scaffolding, `pnpm verify` passes in `solution/` **with all ten defects in place** (they compile and build green — that is the premise). With Docker Postgres up + `pnpm db:migrate && pnpm db:seed`, `pnpm dev` renders: the dashboard as the seeded admin; `/invoices/[id]` showing the planted note as **live bold HTML** (finding 2 fingerprint); the Resend client-test component mounted (finding 5); `curl -I http://localhost:3000/` returning HSTS but **no `Content-Security-Policy`** (finding 4); PostHog firing on first load (finding 9). `findings/` holds `template.md` + eight numbered placeholders + empty `SUMMARY.md`/`out-of-scope.md`.

## Slices

Each slice authors **one answer-key finding file** (Markdown) by overwriting the matching placeholder body, against the chapter outline's per-finding "Your mission" brief and the `findings/template.md` shape. Every finding fills all four sections: **Rule** (the named chapter-080/081 rule + lesson section), **Location** (file + line range, *and* the grep/curl command that surfaced it, including legitimate hits that are not findings), **Consequence** (user-visible or legal terms, read-aloud test, no "could potentially" hedging), **Fix** (the senior reach named by its helper/wrapper/config; structural snippet allowed, no diff). A severity is assigned and justified in two lines. The slice **does not modify target code** — the seeded defect already exists; the slice documents it.

Slices run in order; S1 is the reference finding that also fixes the audit *method* every later finding reuses (open the running app, open the source, hold both, walk one category, write the finding before moving on). S9 closes with `SUMMARY.md`, `out-of-scope.md`, and the two bonus findings.

### Slice S1 — Finding 1: the fail-closed bypass (the reference finding)

Scope: **Lesson 2.** Author `findings/001-fail-closed.md` — the worked reference that models the audit method and the template shape. Category: fail-closed checks (080 L1).

In scope:
- **Rule:** fail-closed (080 L1, linked by section) — a thrown access check is a refusal, never a pass.
- **Location:** `src/lib/admin/transfer-ownership.ts` with the line range of the `try/catch` around `requireRole('owner')`/`roleAtLeast('owner')`. Name the grep that surfaced it (`rg -l "'use server'" --glob '*.ts' | xargs rg -L 'authedAction'`, and the `try { await require…` pattern grep), **including the legitimate hits** the command also returned and why they are not findings (e.g. the public sign-up action uses a different wrapper by design). The "name the command behind every finding" discipline is set here.
- **Consequence:** an owner-only mutation slips through when `requireRole('owner')` throws during a Postgres blip (user-visible: an unauthorized ownership transfer), with the operator note (fail-open dressed as "we log it then continue") as the secondary read. No hedging.
- **Fix:** the senior reach — remove the `try/catch`, let `requireRole` throw, let the outer `authedAction` wrapper convert the throw to `{ ok: false, error: { code: 'unauthorized' } }` (seam-1 reading, 080 L3). Name `authedAction`, not a re-throw.
- Severity justified in two lines.

Out of scope: patching the target; any other category. The file's `<!-- TODO(L2) -->` marker is removed (body filled).

Contracts: `findings/001-fail-closed.md` fully populated; the audit-method rhythm established for S2–S9.

Screenshot: none (the deliverable figure — a filled finding beside the directory tree — is a Markdown/file-tree artifact, not a route; the lesson renders it inline. No app surface is introduced by this slice.)

### Slice S2 — Finding 2: the XSS HTML sink

Scope: **Lesson 3.** Author `findings/002-xss-html-sink.md`. Category: XSS sinks (080 L2 + 081 L1).

In scope:
- **Location:** `src/app/(protected)/invoices/[id]/notes.tsx` line range; the grep `rg 'dangerouslySetInnerHTML'`. Record the **running-app confirmation**: a note containing `<b>bold</b>` renders as live bold rather than escaped text (the fingerprint).
- **Rule:** rendered content is operator-trustworthy or it is not — user-submitted content is never operator-trustworthy without sanitization (080 L2, 081 L1), linked by section.
- **Consequence:** stored XSS reachable in any organization's invoice notes, in user-visible terms.
- **Fix:** sanitize-at-write-**and**-read with the sanitized output stored (name `DOMPurify` per Code conventions); explicitly address the **historical-data vector** a write-only sanitizer misses. Record that a strict CSP (finding 4) is the complementary defense-in-depth layer, **not** a substitute — cross-reference finding 4. Name the adjacent sink shapes the same eye catches (`eval`, `new Function`, `setTimeout(string,…)`, `innerHTML =`) as recognition-only.
- Severity justified.

Out of scope: documenting the adjacent shapes as their own findings (none seeded); patching the target.

Contracts: `findings/002-xss-html-sink.md` populated; cross-reference to finding 4 established.

Screenshot:
- L3 (`/invoices/<seeded-id>`, desktop 1280×900, state settled): the invoice notes region with the planted note rendering as **live bold HTML** — the figure for the XSS-sink fingerprint (the one genuinely visual defect; a senior catches it on the rendered DOM). `data-testid="invoice-note-body"`.

### Slice S3 — Finding 3: the missing audit-log write

Scope: **Lesson 4.** Author `findings/003-audit-log-ownership-transfer.md`. Category: audit-log gaps (081 L3).

In scope:
- **Location:** `src/lib/billing/transfer-ownership.ts` line range; the greps `rg 'db.transaction'` + `rg '.update('` cross-walked against the canonical six-category event set, confirming this mutation belongs to a security-relevant category that mandates a log entry.
- **Rule:** the audit-log canonical event set + transaction discipline (081 L3), linked by section.
- **Consequence:** compliance + customer-facing terms — the ownership-transfer history is unrecoverable for an auditor, and the customer-facing Activity page is silent on one of the most security-relevant events a tenant can experience.
- **Fix:** add `org.ownership-transferred` to the canonical event set (single-dot `entity.verb-pasttense` form), write it **inside the transaction** via `logAudit(tx, …)`, with a redacted payload `{ previousOwnerId, nextOwnerId }`. Name the exact slug, the in-transaction write, and the payload schema.
- Severity justified.

Out of scope: patching; re-documenting this under the message-split (it is written once, here).

Contracts: `findings/003-audit-log-ownership-transfer.md` populated.

Screenshot: none (the defect is the *absence* of a write — no visible app surface; verified by static grep on the source and the finding's prose).

### Slice S4 — Finding 4: the CSP header omission

Scope: **Lesson 5.** Author `findings/004-csp-header.md`. Category: security headers (081 L1).

In scope:
- **Location:** a "missing-piece" finding — "missing from `next.config.ts`" and "should be generated in `proxy.ts`". Record the `curl -I http://localhost:3000/` (or `securityheaders.com`) evidence: HSTS + `X-Content-Type-Options` present, **no** `Content-Security-Policy` (and note any other absent headers). Record the headers the target *does* ship and the ones it lacks.
- **Rule:** CSP-with-per-request-nonce-plus-`'strict-dynamic'` (081 L1), linked by section.
- **Consequence:** absence of defense-in-depth against the finding-2 XSS sink and any future sink, in user-visible terms.
- **Fix:** a static CSP base, a per-request nonce in `proxy.ts` (`Buffer.from(crypto.randomUUID()).toString('base64')`), the `x-nonce` thread to Server Components, `'strict-dynamic'`, with the marketing-site third-party-script trade-off acknowledged. Cross-reference finding 2 as the sink this backstops.
- Severity justified.

Out of scope: patching; treating the missing CSP and the XSS sink as one finding (two findings, one threat model — established in S2).

Contracts: `findings/004-csp-header.md` populated; the finding-2 ↔ finding-4 pair closed from both sides.

Screenshot: none (the fingerprint is a `curl -I` response, not a rendered surface; the absence of a header paints nothing visible).

### Slice S5 — Finding 5: the secret in `NEXT_PUBLIC_*`

Scope: **Lesson 6.** Author `findings/005-secret-next-public.md`. Category: secrets (081 L6) + env validation (081 L7) — they share the `env.ts` schema.

In scope:
- **Location:** the grep `rg 'NEXT_PUBLIC_' src/env.ts` + `rg 'process.env.' --glob '!src/env.ts'` + the `SKIP_ENV_VALIDATION` check; name the Client Component call site (`src/app/(protected)/settings/resend-test.tsx`). Record the **running-app confirmation**: DevTools' network tab shows the Client Component firing a request carrying the key.
- **Rule:** no-secrets-in-`NEXT_PUBLIC_*` (081 L6) + the server/client env split the prefix bypassed (081 L7), linked by section.
- **Consequence:** the key ships in the client bundle and an attacker mails from the verified domain — domain-reputation damage, deliverability loss, customer-base phishing — in user-visible terms.
- **Fix:** the **structural** change — rename to `RESEND_API_KEY` in the `server` partition + move the call to a Server Action — with the no-`NEXT_PUBLIC_*`-secret lint rule noted as a **follow-up**, not the fix. Include **rotation** of the already-leaked key via the 081 L6 runbook in **Vercel-before-provider** order (the key is already in production; pretending it is safe is itself a fail).
- Severity justified.

Out of scope: patching; proposing the lint rule as the whole fix.

Contracts: `findings/005-secret-next-public.md` populated.

Screenshot: none (the fingerprint is a DevTools network entry, not a rendered page surface; the client component itself renders but the *defect* is the key in the request, observed in DevTools).

### Slice S6 — Finding 6: the missing rate limit on password-reset

Scope: **Lesson 7.** Author `findings/006-rate-limit-password-reset.md`. Category: rate-limit coverage (081 L2).

In scope:
- **Location:** read `src/lib/rate-limit.ts` (the declared limiters) against the `app/api/auth/*/route.ts` handlers (or the reset action), naming the reset-password route as the one that triggers Resend through no `safeLimit`. Record the **running-app confirmation**: repeated password-reset submissions return no 429 (or, on the action path, no `rate_limited` outcome). Document **both** the grep discovery and the manual hammer-the-endpoint verification (each belongs in the report for a different reason).
- **Rule:** rate-limit coverage + the three mandatory triggers (081 L2), recording which **two** triggers this endpoint hits (costs money via Resend + attacks a third party via the user's inbox), linked by section.
- **Consequence:** mass spam, account-enumeration, and inbox-bomb abuse, in user-visible + third-party terms.
- **Fix:** declare `passwordResetLimiter` with **per-IP and per-email** keying (per-IP alone leaves enumeration/inbox-bomb open), wrap the handler with `safeLimit`, emit `RateLimit-*` headers (route-handler path) or carry the budget on the `Result` (action path — note the 075 decision that actions can't set headers), return a generic 429/opaque body. **Attach the coverage matrix** (endpoint category, file, limiter, key strategy, coverage Y/N).
- Severity justified.

Out of scope: patching; per-IP-only keying.

Contracts: `findings/006-rate-limit-password-reset.md` populated, with the coverage matrix attached.

Screenshot: none (the fingerprint is the absence of a 429 across repeated submits — a behavioral, non-figure observation verified by the by-hand checklist + the finding's prose).

### Slice S7 — Finding 7: the dep-hygiene gap

Scope: **Lesson 8.** Author `findings/007-dep-hygiene.md`. Category: dep hygiene (081 L8).

In scope:
- **Location:** read `pnpm-workspace.yaml` (confirming `minimumReleaseAge: 0`, `blockExoticSubdeps: false`, `strictDepBuilds: false` are set, overriding the safe defaults; `allowBuilds` allow-list state; the `packageManager` pin; the CI `--frozen-lockfile` flag — named as a forward thread) + the `pnpm audit --prod` output naming the outdated pin.
- **Rule:** pnpm 11+ supply-chain defaults with the 24-hour pre-install window (081 L8), linked by section. Frame against the real threat (typosquats + maintainer-compromise like Shai-Hulud).
- **Consequence:** a malicious release lands the day it ships with no defense in place; **distinguish `pnpm audit` as a post-install signal, not a pre-install defense** — and Dependabot/Renovate raise PRs *after* a compromised release lands, while `minimumReleaseAge` is the *pre-install* defense.
- **Fix:** keep the `pnpm-workspace.yaml` defaults **on** (`minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, `strictDepBuilds: true`), declare the reviewed `allowBuilds` allow-list, bump the pinned dep, and gate `pnpm audit` in CI (forward reference to chapter 097). Name the `pnpm-workspace.yaml` settings, not just the version bump.
- Severity justified.

Out of scope: patching the config; framing as a version-bump chore.

Contracts: `findings/007-dep-hygiene.md` populated.

Screenshot: none (config-file finding; no app surface).

### Slice S8 — Finding 8: the GDPR deletion gap

Scope: **Lesson 9.** Author `findings/008-gdpr-deletion.md`. Category: GDPR deletion (081 L4).

In scope:
- **Location:** walk the data graph in `src/lib/account/delete-account.ts`, naming **every** untouched table (`org_members`, `invitations`, `audit_logs`, `invoices`, `exports`) and **every** external service (Stripe, Resend, PostHog, R2), against the retention catalog. The discipline: name every external the PII could have leaked to, not just the obvious tables.
- **Rule:** the async deletion job + the three deletion shapes, audit logs **anonymized** not hard-deleted (081 L4), linked by section.
- **Consequence:** legal terms — PII persists past a successful deletion request (Article 17 exposure), and the confirmation email the user received is a lie.
- **Fix:** route through the async Trigger.dev `deleteUser` job, mark `deletion_in_progress` to block sign-in, **anonymize** audit-log rows (the deletion/audit-trail tension — anonymization is how both survive), call the Stripe/Resend/PostHog/R2 deletes, log `account.deletion-completed`. Name audit-log anonymization explicitly.
- Severity justified.

Out of scope: patching; naming only `org_members` (the common partial answer).

Contracts: `findings/008-gdpr-deletion.md` populated.

Screenshot: none (the defect is incomplete deletion logic; no app surface).

### Slice S9 — Commit, score, and the two bonus findings

Scope: **Lesson 10.** Author `findings/SUMMARY.md`, `findings/out-of-scope.md`, and document the two bonus findings (9 consent gate, 10 `safeLimit` bypass) inline in `SUMMARY.md` (or as `009-*.md`/`010-*.md` if the chapter prefers — keep to `SUMMARY.md` notes to match "8 is the floor"). This slice produces the answer key's culminating scorecard.

In scope:
- `findings/SUMMARY.md`: the coverage count (8/8 floor, naming the two bonus findings reached → toward 10/10), a one-line cause for any deliberate miss, the **clause-by-clause scoring rubric** the answer key applies (rule match = floor, location match, consequence match, fix-detail match = reach; partial credit when rule + location are named but the fix is less thorough), the **senior-reach detail per finding** students most often miss (F1 lets `authedAction` convert the throw; F2 sanitizes at write+read incl. historical data; F3 the exact slug + payload; F4 nonce + `'strict-dynamic'`; F5 rotation not only rename; F6 dual keying; F7 the `pnpm-workspace.yaml` defaults; F8 the full graph + anonymize), and a **personal grep/curl checklist** folding every category's discovery command.
- **Bonus 9 (consent gate):** named — PostHog initialized `opt_out_capturing_by_default: false` with no `ConsentProvider`, the fingerprint a network request on first page load (the 081 L5 pre-consent rule). Fix: the two-belt gate (`opt_out_capturing_by_default: true` + dynamic import only after consent).
- **Bonus 10 (`safeLimit` bypass):** named — a worker/internal endpoint calling `limiter.limit()` directly (a `limit(` grep hit not preceded by `safeLimit`), the 080 L3 single-seam rule. Fix: route through `safeLimit`.
- `findings/out-of-scope.md`: at least one observation outside the eight categories (e.g. a code-quality note), demonstrating the discipline of not scoring out-of-scope items as findings.
- Restate the project's through-threads (the two chapter-080 commitments, the single-place-to-lint pattern, coverage-over-depth) and the forward pointers (chapters 088/090/092/095/097/104 each pick up a thread).

Out of scope: patching any defect; the honor-system commit/checkout dance (that is the student's manual workflow; the answer key is `solution/findings/`).

Contracts: `findings/SUMMARY.md` + `findings/out-of-scope.md` populated; the answer key complete (8 findings + 2 bonus + scorecard).

Screenshot: none.

## Start derivation

Derive `start/` from the completed `solution/` by reverting **only** the `findings/` answer-key bodies to placeholders; **every other file is byte-identical** (the entire seeded audit target — all ten defects intact — config, schema, seed, migrations, the `(auth)`/`(protected)` surfaces, `proxy.ts`, `lib/*`, the inspector-free target, `tests/lessons/` placeholders, README/AGENTS/.env.example — is unchanged between `start/` and `solution/`). This is the inverse of a normal start derivation: the audit target is read-only, so it never stubs; the "student work" is the Markdown.

Revert these to placeholders (each body emptied to the template section headers + a `<!-- TODO(L<n>) — <task> -->` marker so `rg "TODO" start/findings/` enumerates the work):
- `findings/001-fail-closed.md` (L2) — `<!-- TODO(L2) — document the fail-closed bypass in lib/admin/transfer-ownership.ts: rule (fail-closed 080 L1), location + grep, consequence (user-visible unauthorized transfer), fix (let authedAction convert the throw) -->`.
- `findings/002-xss-html-sink.md` (L3) — `<!-- TODO(L3) — document the dangerouslySetInnerHTML sink in invoices/[id]/notes.tsx: rule, location + grep + running-app fingerprint, consequence (stored XSS), fix (sanitize at write+read, historical data, cross-ref finding 4) -->`.
- `findings/003-audit-log-ownership-transfer.md` (L4) — `<!-- TODO(L4) — document the missing logAudit in lib/billing/transfer-ownership.ts: rule (081 L3), location + grep, consequence (compliance/Activity-page), fix (org.ownership-transferred in-tx, redacted payload) -->`.
- `findings/004-csp-header.md` (L5) — `<!-- TODO(L5) — document the missing CSP: rule (081 L1), location (missing from next.config.ts + proxy.ts) + curl -I evidence, consequence (no defense-in-depth), fix (nonce + strict-dynamic, cross-ref finding 2) -->`.
- `findings/005-secret-next-public.md` (L6) — `<!-- TODO(L6) — document NEXT_PUBLIC_RESEND_API_KEY: rule (081 L6/L7), location + grep + DevTools fingerprint, consequence (key in bundle, domain abuse), fix (server partition + Server Action + rotate) -->`.
- `findings/006-rate-limit-password-reset.md` (L7) — `<!-- TODO(L7) — document the unthrottled reset route: rule (081 L2, the two triggers), location (rate-limit.ts vs the route) + grep + manual hammer, consequence (spam/enumeration/inbox-bomb), fix (dual-keyed safeLimit + coverage matrix) -->`.
- `findings/007-dep-hygiene.md` (L8) — `<!-- TODO(L8) — document the supply-chain gap: rule (081 L8), location (pnpm-workspace.yaml + pnpm audit), consequence (pre-install vs post-install), fix (keep the pnpm 11 defaults on + bump) -->`.
- `findings/008-gdpr-deletion.md` (L9) — `<!-- TODO(L9) — document the incomplete deletion in lib/account/delete-account.ts: rule (081 L4), location (graph walk) + every missed table/external, consequence (Article 17), fix (async deleteUser job, anonymize audit logs) -->`.
- `findings/out-of-scope.md` (L2) — `<!-- TODO(L2) — observations outside the eight categories -->`.
- `findings/SUMMARY.md` (L10) — `<!-- TODO(L10) — coverage count, deliberate misses, the two bonus findings (consent gate, safeLimit bypass), per-finding senior-reach detail, personal grep/curl checklist -->`.

Provided-and-identical in `start/` (never reverted): `findings/template.md` (the contract) and the **entire seeded audit target** with all ten defects in place. The student's job in `start/` is to *find and document* the defects, not to fix them.

## Locked decisions

- **The deliverable is `findings/` Markdown; the audit target is read-only.** No slice modifies target code. No finding ships a fix as a diff — a structural snippet is allowed per the template, never a patch. The target runs unchanged at the end of every lesson; only `findings/` grows. (Chapter framing.)
- **The eight seeded defects ship green.** Every defect compiles, builds (`pnpm verify` passes), and renders — an audit reads a *running* target, so the bugs must be live, not stubbed-out. The defects are deviations from the healthy 067+075+065 lineage, planted at real call sites that reference the real seams (`authedAction`, `safeLimit`, `logAudit`, typed `env`, the deletion job).
- **`findings/` lives at the repo root**, not under `src/`. `template.md` is provided in both `start/` and `solution/`; the eight numbered files + `SUMMARY.md` + `out-of-scope.md` are placeholders in `start/`, filled in `solution/`.
- **Finding-file contract** (every finding, enforced by static checks + lesson gates): the four template sections (`## Rule`, `## Location`, `## Consequence`, `## Fix`) are populated; **Rule** names the chapter-080/081 rule + lesson section; **Location** names the file/line range **and the grep/curl command that surfaced it** (including legitimate non-finding hits); **Consequence** is user-visible/legal (read-aloud test), no "could potentially"; **Fix** names the senior reach by its helper/wrapper/config (`authedAction` conversion / sanitize-at-write-and-read / `org.ownership-transferred` in-tx / nonce + `'strict-dynamic'` / `server`-partition rename + rotation / dual-keyed `safeLimit` + coverage matrix / pnpm 11 defaults / async `deleteUser` job + anonymize). A severity + two-line justification.
- **The eight categories are exhaustive for this pass.** Anything outside them goes in `out-of-scope.md`, never scored as a finding. The two bonus findings (9 consent gate, 10 `safeLimit` bypass) are the senior reach above the 8/8 floor, documented in `SUMMARY.md`.
- **Canonical naming the findings must use** (from the continuity notes, overriding any chapter-outline drift): audit events are `entity.verb-pasttense`, single dot — `org.ownership-transferred` (finding 3), `account.deletion-completed` (finding 8), `consent.recorded` (NOT `consent.updated`, bonus 9). The `Result` code set is the seven from 080 L2 (`validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`) — finding 1's fix maps to `unauthorized`; there is no `plan_limit`/`payment_required` code. pnpm settings live in `pnpm-workspace.yaml`, never `.npmrc` (finding 7); use `allowBuilds`/`minimumReleaseAge`/`blockExoticSubdeps`/`strictDepBuilds`, never the removed `onlyBuiltDependencies` array (081 L8). The env file is `src/env.ts` imported as `@/env`, never `lib/env.ts` (finding 5).
- **Real third parties are NOT live in the render pipeline.** The pipeline boots Docker Postgres + `db:migrate` + `db:seed` only — no Stripe CLI, no Upstash, no Trigger.dev worker, no live Resend/PostHog round-trip. Rendered checks target only what the seeded Postgres renders deterministically at first paint (the dashboard as the admin, the planted note rendering as live HTML, the Resend client-test component mounting). The browser-invisible fingerprints (curl headers for finding 4, DevTools network for finding 5, repeated-submit behavior for finding 6, PostHog request for bonus 9) are **static checks on the source + by-hand checklist**, not rendered checks. The seeded target supplies dummy `.env` values (e.g. `sk_test_…`, `tr_dev_…`, fake Upstash/Resend/PostHog keys) so env-validation passes at build with no round-trip.
- **Structural single-slot / single-element invariants** (carried from the 067 lineage; the target must not render-break):
  - `(protected)/layout.tsx` resolves to one `<nav>` + one `<main>{children}</main>` — never a bare sibling fragment dropped into a flex/grid parent (the ch035 fragment-flatten footgun).
  - The invoice notes region (`invoice-note-body`) is one bounded element wrapping the `dangerouslySetInnerHTML` output — it must not flatten into siblings, and the planted markup renders **inside** it.
- **Stable selectors via `data-testid`.** The rendered checks read `data-testid`, never positional/text selectors. Canonical ids for the audit-target surfaces the checks touch: `dashboard`, `invoice-note-body`, `resend-client-test`. (The 067/059 carry-in selectors stay as-is.)
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`), all carried from the 067 fork unless noted:**
  - `tsconfig.json`: `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, both `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` in `include`, `"allowJs": false`, **no `baseUrl`** (TS 6 errors on it; `"paths": { "@/*": ["./src/*"] }` resolves under `moduleResolution: "bundler"`), `next-env.d.ts` excluded from Biome via `files.includes`.
  - `next.config.ts`: `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true` (needs `babel-plugin-react-compiler@1.0.0`), `turbopack: { root: __dirname }`. Every page reading request-time data ships a segment `loading.tsx` (Cache Components Suspense seam) — the invoices/notes/settings routes the audit reads each carry one. `redirect()`/`router.push` built from runtime strings `import type { Route } from 'next'` + cast `as Route`. **Finding 4's seeded defect is `proxy.ts` shipping no CSP/nonce** — the target's `proxy.ts` keeps its cookie-presence check working (so auth flows still work) but generates no nonce and sets no CSP; this is intentional and must still build.
  - `biome.json`: `"css": { "parser": { "tailwindDirectives": true } }`, `files.includes` ignores without trailing `/**`, `next-env.d.ts` excluded, `noImgElement: "off"` if the carried email/UI uses raw `<img>`. The `dangerouslySetInnerHTML` seeded sink (finding 2) **does** trip `lint/security/noDangerouslySetInnerHtml` (recommended, default-on) and `biome ci` exits non-zero — confirmed against biome `2.4.16`. Because `biome ci` is the first gate in the locked `verify` chain that must pass green with the defect live, the sink **must** carry a per-line `// biome-ignore lint/security/noDangerouslySetInnerHtml: <reason>` directly above the `dangerouslySetInnerHTML` prop, with a comment naming it as the **deliberately seeded audit defect** (the target ships the bug on purpose). This is mandatory, not conditional — without it `pnpm verify` fails on the seeded target. (The `biome-ignore` is a code comment, not a fix; the sink itself is unchanged and finding 2's grep for `dangerouslySetInnerHTML` still hits.)
  - `pnpm-workspace.yaml`: **two distinct shapes** — the healthy `allowBuilds: { sharp: true, esbuild: false }` map (required so `next build` passes; carried from the lineage) **plus** the seeded finding-7 defects (`minimumReleaseAge: 0`, `blockExoticSubdeps: false`, `strictDepBuilds: false`) which override the safe defaults but must not break the build. Plus `overrides: { kysely: 0.28.17 }` (the Better-Auth pin). No `pnpm` key in `package.json`. (The `strictDepBuilds: false` seeded value actually *relaxes* the build — confirm the `allowBuilds` map still covers `sharp`/`esbuild` so a cold install + `next build` stays green even with the flag off.)
  - Postgres 18 docker: volume mounts `/var/lib/postgresql`; `postgres` (postgres-js) driver via `drizzle-orm/postgres-js`; the `authenticated` RLS role created by a `--custom` migration before the audit policy migration (059 carry-in).
  - Better Auth ids are `text` (FK columns to them are `text`, never `uuid`); `requireOrgUser()` returns `{ user, orgId, role }` (no org object); read the org row via `getOrganization(orgId)`.
  - Drizzle 0.45: runtime `casing: 'snake_case'`; flat migration layout with `--name <verb>_<noun>`; `drizzle-seed` cannot seed constraint-heavy tables → direct inserts; the `pathToFileURL` entry-point guard in scripts (paths contain spaces).
  - lucide-react 1.x: no brand icons (`Github`/`Twitter`/… removed) — use non-brand glyphs.
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, better-auth `^1.6.14`, drizzle-orm `^0.45.1`, drizzle-kit `^0.31.5`, postgres `^3.4.7`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, stripe `^22.2.0`, `@upstash/ratelimit` `^2.0.8`, `@upstash/redis` `^1.38.0`, `@trigger.dev/sdk` `^4.4.0`, babel-plugin-react-compiler `1.0.0`, pnpm `11.3.0`, kysely override `0.28.17`, `posthog-js` `^1.386.6` (NOT `@posthog/next` — no `1.x`, pulls a `@vercel/functions` peer). The one finding-7 advisory pin is a deliberate downgrade of an existing dep.

## File tree

Tree after the last slice (`solution/`). Provided/seeded files carry no slice tag; finding files tag the slice that fills them. The audit target is the 067+075+065 lineage merged — only the audit-relevant and seeded files are enumerated; the unchanged carry-in (full `lib/auth/*`, `db/*`, `(auth)` group, UI primitives, emails, configs) is elided as `… (067 lineage, unchanged)`.

```
projects/Chapter 082/solution/
├── package.json                              — chapter-082-audit-target; 067+075+065 deps + posthog-js; one advisory pin (seeded #7)
├── pnpm-workspace.yaml                       — allowBuilds {sharp,esbuild} + kysely override + SEEDED #7 (minimumReleaseAge:0, blockExoticSubdeps:false, strictDepBuilds:false)
├── .npmrc                                    — auth/registry only (not where supply-chain settings live — #7 evidence)
├── next.config.ts                            — cacheComponents/typedRoutes/reactCompiler/turbopack; HSTS + statics, NO CSP (seeded #4)
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── drizzle.config.ts
├── docker-compose.yml
├── .env.example                              — dummy keys for all third parties (no live round-trip)
├── README.md                                 — setup ladder, eight categories, honor-system answer-key note, template pointer
├── AGENTS.md
├── findings/                                 — ← the deliverable (root, not src/)
│   ├── template.md                           — provided (the rule-location-consequence-fix contract)
│   ├── 001-fail-closed.md                    [filled by: S1]
│   ├── 002-xss-html-sink.md                  [filled by: S2]
│   ├── 003-audit-log-ownership-transfer.md   [filled by: S3]
│   ├── 004-csp-header.md                     [filled by: S4]
│   ├── 005-secret-next-public.md             [filled by: S5]
│   ├── 006-rate-limit-password-reset.md      [filled by: S6]
│   ├── 007-dep-hygiene.md                    [filled by: S7]
│   ├── 008-gdpr-deletion.md                  [filled by: S8]
│   ├── out-of-scope.md                       [filled by: S9]
│   └── SUMMARY.md                            [filled by: S9]
├── scripts/
│   ├── seed.ts                               — admin + 2nd org + invoice note with <b>bold</b> (#2 fingerprint) + audit tail
│   ├── seed-stripe.ts                        — (065 carry, dummy in pipeline)
│   └── test-lesson.mjs                       — node wrapper (one Lesson <n>.test.ts)
├── tests/lessons/
│   ├── Lesson 2.test.ts … Lesson 10.test.ts  — describe.todo placeholders (assert finding shape + target still booted)
├── src/
│   ├── env.ts                                — server block + NEXT_PUBLIC_RESEND_API_KEY in CLIENT (seeded #5) + NEXT_PUBLIC_POSTHOG_KEY + Upstash/Stripe/Trigger keys
│   ├── proxy.ts                              — cookie-presence check works; NO nonce, NO CSP (seeded #4); lives at src/proxy.ts (lineage location)
│   ├── app/
│   │   ├── (protected)/
│   │   │   ├── layout.tsx                     — one <nav> + one <main> (single-slot invariant)
│   │   │   ├── dashboard/page.tsx             — data-testid="dashboard"; loads as seeded admin
│   │   │   ├── invoices/
│   │   │   │   ├── page.tsx                   — invoices list (+ loading.tsx)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx               — invoice detail (+ loading.tsx)
│   │   │   │       └── notes.tsx              — dangerouslySetInnerHTML on note.body, NO sanitize (seeded #2); data-testid="invoice-note-body"
│   │   │   └── settings/
│   │   │       └── resend-test.tsx            — 'use client'; reads NEXT_PUBLIC_RESEND_API_KEY, fetches Resend from browser (seeded #5); data-testid="resend-client-test"
│   │   ├── api/
│   │   │   ├── webhooks/stripe/route.ts       — (065 carry, healthy)
│   │   │   └── auth/reset-password/route.ts   — triggers Resend, NO safeLimit (seeded #6)
│   │   ├── (auth)/ …                          — (067 lineage, unchanged)
│   │   ├── _components/providers.tsx          — 'use client'; posthog-js init opt_out_capturing_by_default:false in mount useEffect + PostHogProvider, NO ConsentProvider (seeded bonus #9)
│   │   ├── error.tsx
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── admin/transfer-ownership.ts        — try/catch around requireRole('owner'), falls through (seeded #1)
│   │   ├── billing/transfer-ownership.ts      — UPDATE ownerId, NO logAudit in tx (seeded #3)
│   │   ├── billing/ …                         — (065 carry, healthy)
│   │   ├── account/delete-account.ts          — deletes users row only, no graph/externals/anonymize (seeded #8)
│   │   ├── webhooks/stripe.ts                 — (065 carry, healthy)
│   │   ├── rate-limit.ts                      — signIn/signUp/reset limiters + safeLimit (075 carry); resetLimiter declared but unwired on the reset route (#6)
│   │   ├── exports/ …                         — (067 Trigger.dev job; one endpoint calls limiter.limit() direct — seeded bonus #10)
│   │   ├── auth/{authed-action,roles,error-mapping}.ts  — (059 carry)
│   │   └── … (067 lineage: result, utils, redirects, email, logger, auth*, …)
│   ├── db/
│   │   ├── schema.ts                          — invoices + invoice notes column/table + plan_entitlements + processed_events + exports
│   │   ├── audit.ts / audit-log.ts            — (059 carry; logAudit explicit-context overload)
│   │   ├── queries/ …                         — (059/062/065/067 carry)
│   │   └── … (columns, index, tenant, schema/auth.ts)
│   ├── components/ui/*                        — (shadcn primitives, unchanged)
│   ├── emails/*                               — (050 carry)
│   └── trigger/                               — (067 Trigger.dev tasks; deleteUser job present — finding 8's fix target)
└── drizzle/                                   — 067 migration set + invoice-notes/ownership migrations
```

`start/` is identical except `findings/{001..008}.md`, `out-of-scope.md`, `SUMMARY.md` carry placeholder bodies (template headers + `<!-- TODO(L<n>) -->`); `template.md` and the entire audit target (all ten defects) are byte-identical.

## Verification

### Static checks (the reviewer executes)

Scope tagged per check. The finding-file checks run against `solution/findings/` (filled) and `start/findings/` (placeholders) as noted.

- **(both) `pnpm verify` passes** in `solution/` and `start/` with the seeded defects in place — `biome ci . && tsc --noEmit && next build` green. The defects ship green by design.
- **(both) `rg "TODO" start/findings/` enumerates exactly ten markers** (001–008 + out-of-scope + SUMMARY); `solution/findings/` has **zero** `TODO` markers (all bodies filled).
- **(solution) each finding has the four sections:** for each of `001`…`008`, `grep -q "## Rule" … && grep -q "## Location" … && grep -q "## Consequence" … && grep -q "## Fix"` succeeds. Fails if a section is empty/missing.
- **(solution) each finding names its rule + a discovery command** (load-bearing — fails if the finding ships inert prose with no rule or no grep/curl):
  - `001`: `grep -qi "fail-closed" … && grep -qi "authedAction" …` (names the rule + the seam the fix uses).
  - `002`: `grep -q "dangerouslySetInnerHTML" … && grep -qi "sanitize" …` (names the sink + the fix).
  - `003`: `grep -q "logAudit" … && grep -q "org.ownership-transferred" …` (names the missing call + the exact slug).
  - `004`: `grep -qi "curl" … && grep -qi "strict-dynamic" … && grep -qi "nonce" …` (names the evidence + the load-bearing fix parts).
  - `005`: `grep -q "NEXT_PUBLIC_RESEND_API_KEY" … && grep -qi "rotat" …` (names the leaked var + rotation, not just rename).
  - `006`: `grep -qi "safeLimit" … && grep -qi "per-email" … && grep -qi "matrix" …` (names the fix seam + dual keying + the coverage matrix).
  - `007`: `grep -q "minimumReleaseAge" … && grep -q "pnpm-workspace.yaml" …` (names the setting + the file, not `.npmrc`).
  - `008`: `grep -qi "anonymiz" … && grep -qi "audit" …` (names anonymize-don't-delete for audit logs — the most-missed reach).
- **(solution) the cross-reference pair holds:** `002` mentions finding 4 and `004` mentions finding 2 (`grep -qi "finding 4\|CSP" findings/002-*.md` and `grep -qi "finding 2\|XSS\|sink" findings/004-*.md`).
- **(solution) `SUMMARY.md` carries a coverage count + both bonus findings:** `grep -qE "8/8|10/10|coverage" findings/SUMMARY.md` and `grep -qi "consent" findings/SUMMARY.md` and `grep -qi "safeLimit" findings/SUMMARY.md`.
- **(both) the seeded defects are present in the target** (each a one-line grep that fails if the bug was "fixed" — the target is read-only, so these must hold in both trees):
  - #1: `grep -RqE "try\s*\{[^}]*requireRole\('owner'\)" src/lib/admin/transfer-ownership.ts` (the fail-open try/catch).
  - #2: `grep -q "dangerouslySetInnerHTML" src/app/\(protected\)/invoices/\[id\]/notes.tsx`.
  - #3: `grep -q ".update(" src/lib/billing/transfer-ownership.ts && ! grep -q "logAudit" src/lib/billing/transfer-ownership.ts` (mutation present, no audit write).
  - #4: `! grep -qi "Content-Security-Policy" next.config.ts src/proxy.ts` (no CSP anywhere) and `! grep -qi "nonce" src/proxy.ts`. (List **only files that exist** — `proxy.ts` lives at `src/proxy.ts` in the lineage; naming a non-existent root `proxy.ts` makes `grep` exit 2 on the missing file, and `! grep -q … 2>/dev/null` then reports "absent" even when CSP **is** present, silently un-falsifying the check.)
  - #5: `grep -q "NEXT_PUBLIC_RESEND_API_KEY" src/env.ts` and `grep -Rq "NEXT_PUBLIC_RESEND_API_KEY" src/app` (declared client-side + read in a component).
  - #6: `grep -q "reset-password" src/app/api/auth/reset-password/route.ts && ! grep -q "safeLimit" src/app/api/auth/reset-password/route.ts`.
  - #7: `grep -q "minimumReleaseAge: 0" pnpm-workspace.yaml && grep -q "blockExoticSubdeps: false" pnpm-workspace.yaml`.
  - #8: `grep -q "delete(users)" src/lib/account/delete-account.ts && ! grep -qi "deleteUser\|deletion_in_progress" src/lib/account/delete-account.ts` (one-row delete, no async job).
  - #9: `grep -q "opt_out_capturing_by_default: false" src/app/_components/providers.tsx && ! grep -Rq "ConsentProvider" src/app` (PostHog ungated, no consent provider).
  - #10: a bare `.limit(` call not preceded by `safeLimit` in the worker/export path (`rg "\.limit\(" src/lib/exports src/app/api | rg -v "safeLimit"` returns a hit).
- **(both) the healthy build allow-list is intact:** `grep -q "sharp: true" pnpm-workspace.yaml` (so `next build` passes despite `strictDepBuilds: false`).
- **(both) `tests/lessons/` runs one file:** `pnpm test:lesson 2` runs only `Lesson 2.test.ts` (narrows, no glob OR-match).

### Rendered checks (slice coders + inspector run against the running app)

The pipeline boots Docker Postgres + `db:migrate` + `db:seed` then the app — no third-party round-trip. Only the seeded target's deterministically-rendered surfaces are checked; the browser-invisible fingerprints (curl headers, DevTools network, repeated-submit behavior, PostHog request) are covered by the static checks above + the lessons' by-hand checklist, not here.

| field | r-target-boots | r-xss-sink-renders | r-resend-client-mounts |
|---|---|---|---|
| **slice** | S1 | S2 | S5 |
| **route** | `/dashboard` | `/invoices/<seeded-id>` | `/settings` (the resend-test route) |
| **viewport** | 1280×900 | 1280×900 | 1280×900 |
| **state** | settled (seeded admin) | settled | settled |
| **intent** | the audit target boots and serves the seeded app the student reads against | the seeded XSS sink renders user markup as live HTML — the one visual fingerprint a senior catches on the rendered DOM | the secret-leaking client component mounts and renders (the call site finding 5 names) |
| **selectors** | `dashboard` | `invoice-note-body` | `resend-client-test` |
| **assertion** | `dashboard` is present and the page renders the seeded admin's surface without an `error.tsx` fallback (the target is navigable end-to-end) | `invoice-note-body` is exactly one element and contains a **live** `<b>` element (rendered HTML, not the escaped text `&lt;b&gt;`) — proving the planted note renders as bold, the unsanitized-sink fingerprint | `resend-client-test` is present and rendered (the Client Component mounted) — confirming finding 5's call site is a real, reachable surface |

- **r-target-boots (S1):** owned by S1 — the first slice's render checkpoint is that the seeded target the whole audit reads against actually boots. Tagged to S1 because S1 is the first slice and the target is fully built by the scaffolder before any slice runs; visiting `/dashboard` renders the surface end-to-end from seed.
- **r-xss-sink-renders (S2):** owned by S2 — visiting `/invoices/<seeded-id>` first renders the notes surface end-to-end after S2's finding documents it. The child-count + live-`<b>` condition holds at any width (not geometric), so the 1280×900 tag is for consistency, not layout dependence.
- **r-resend-client-mounts (S5):** owned by S5 — the settings/resend-test route renders the client component finding 5 names. Presence-only (the request leaving the browser is the DevTools/static-check concern, not a rendered assertion).

Every slice with a screenshot (S2) owns a rendered check (r-xss-sink-renders) covering that surface.
