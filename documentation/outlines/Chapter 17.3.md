# Chapter 17.3 — Project: the pre-launch audit pass

## Chapter framing

Chapter 17.3 closes Unit 17 by running the two audit passes the unit installed — the error discipline from 17.1 (fail-closed, the user-vs-operator message split) and the security baseline from 17.2 (headers, rate-limit coverage, audit-log gaps, GDPR posture, consent gate, secrets, env validation, dep hygiene) — against a seeded audit-target repo. The deliverable is not new code in the audit target; it is a `findings/` directory the student commits, one Markdown file per finding, every file using the rule-location-consequence-fix template. The target ships with eight planted issues, one per audit category, and the answer key (tagged `v1.0-answer-key` on `react-saas-course-projects`) is published only after the student commits. The chapter ships 1 brief + 1 walkthrough + 2 audit-pass lessons + 1 verify lesson; the "runnable state" rule lands as "the audit target still runs unchanged at the end of every lesson and the findings directory grows."

Threads that run through every lesson. The audit is a **read-only pass on the target codebase** — students do not patch the seeded findings, they document them; the proposed fix is a paragraph, not a diff. The **template is the contract** — every finding names its rule (from 17.1 or 17.2), its location (file + line range, or "missing — should be at X"), its consequence (the user-visible failure mode if exploited, or the legal exposure), and its fix (the senior reach, named with the helper or wrapper it lives in). The **eight categories are exhaustive for this audit** — anything outside them is out of scope for the pass; the student notes such observations in a separate `out-of-scope.md` rather than scoring them as findings. The **two commitments from 17.1 carry through** — fail-closed reasoning powers the error pass; the user-vs-operator split powers the consequence column. **Coverage matters more than depth** — every category gets a finding (or a written "no findings in this category"); a deep dive on one category that leaves another silent is the failure mode. **Self-grading is the senior reach** — the answer key publishes after the student commits; partial credit goes to "rule + location correctly named, fix differs from the senior reach" because the rule is the load-bearing piece.

### Dependency carry-in

The audit pass invokes every rule and helper Unit 17 installed plus the canonical seams from earlier units.

- **From Chapter 17.1:** fail-closed (17.1.1); the user-vs-operator message split, the read-aloud test, the `error.tsx` discipline, the redactor (17.1.2); the six seams catalog and the grep audit step per seam (17.1.3).
- **From Chapter 17.2:** the six non-negotiable headers and the static/dynamic split (17.2.1); the seven endpoint categories and three mandatory-limiter triggers, `safeLimit` as the single seam (17.2.2); the six audit-log event categories and transaction discipline (17.2.3); the retention catalog and the async deletion job with three deletion shapes (17.2.4); the consent gate's pre-consent boundary (17.2.5); the secrets rules (no `NEXT_PUBLIC_*` for secrets, three env sets, rotation order) (17.2.6); the four env-validation invariants (17.2.7); pnpm 11+ supply-chain defaults (17.2.8).
- **From prior units:** `authedAction(role, schema, fn)` and `tenantDb(orgId)` from 10.2 / 10.4; `writeAuditLog(tx, event)` from 10.2.5; the verify-then-claim-then-mutate transaction from 12.1; `@upstash/ratelimit` with dual keying from 15.3.3; typed `env` from 1.4.5. The seeded target ships these helpers so every finding references a real call site.

### Audit-target spec

A separate repo at `react-saas-course-projects/error-security-audit/starter/` cloned via `degit`. The target is a fork of the course's running project around the end of Unit 16 — invoices list, CRUD, auth, organizations, RBAC, Stripe webhook, the durable export job, PostHog wired but ungated, the basic surface a senior is about to take to a launch review. Eight findings are seeded across the eight audit categories. The target runs end-to-end (`pnpm install && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`); the student navigates the running app and reads the source side-by-side. The answer key lives in `solution/findings/` on a `v1.0-answer-key` tag, accessible only after the student opens a PR with their own findings — the tag is documented in the brief but the student is on the honor system.

The eight seeded findings, one per category, tuned so each lands on a rule the student has been taught (details unpacked in 17.3.3 and 17.3.4):

1. **Fail-closed violation (error discipline, 17.1.1).** `lib/admin/transferOwnership.ts` wraps `requireRole('owner')` in a `try/catch` that logs and falls through on exception.
2. **`dangerouslySetInnerHTML` on user content (XSS sink, 17.1.2 + 17.2.1).** `app/(app)/invoices/[id]/notes.tsx` renders the user-submitted note body as raw HTML.
3. **Missing audit-log write (audit log gap, 17.2.3).** `lib/billing/transferOwnership.ts` updates `organizations.ownerId` without `writeAuditLog(tx, event)` inside the transaction.
4. **CSP header omission (security headers, 17.2.1).** `next.config.ts` ships HSTS but no CSP; `proxy.ts` does not generate a per-request nonce.
5. **Secret in `NEXT_PUBLIC_*` (secrets, 17.2.6).** `NEXT_PUBLIC_RESEND_API_KEY` consumed by a Client Component that calls Resend from the browser.
6. **Missing rate limit on password-reset (rate-limit coverage, 17.2.2).** `app/api/auth/reset-password/route.ts` triggers Resend with no limiter.
7. **Outdated dep + missing pnpm 11+ defaults (dep hygiene, 17.2.8).** A pinned dep with a synthetic CVE; `.npmrc` missing `minimumReleaseAge` and `blockExoticSubdeps`.
8. **GDPR deletion leaves rows behind (17.2.4).** `lib/account/deleteAccount.ts` deletes the `users` row only — no graph walk, no externals, no audit-log anonymization.

The answer key also acknowledges two bonus findings a thorough audit surfaces: (9) a missing consent gate on PostHog (`opt_out_capturing_by_default: false`), and (10) a `safeLimit` bypass on a worker endpoint. The brief names "8 is the floor, 10 is the senior reach."

### Finding template (`findings/template.md`)

The provided template the student copies once per finding:

```
# Finding NNN — <short title>

**Category:** one of the eight audit categories.
**Severity:** critical | high | medium | low (senior call, justified in two lines).

## Rule
The named rule from 17.1 or 17.2 this finding violates. One sentence; link the lesson section by ID.

## Location
File path(s) and line range(s). For "missing-piece" findings, name the file where the piece should live.

## Consequence
The failure mode in user-visible or legal terms. Two to four sentences. No "could potentially" hedging.

## Fix
The senior reach, named in terms of the helper / wrapper / config block it lives in. Five to ten lines.
A short illustrative snippet is allowed when the fix is structural — no full diffs.
```

`findings/` ships with the template plus a numbered placeholder per category (`001-fail-closed.md`, `002-xss-html-sink.md`, … `008-gdpr-deletion.md`); the student replaces the placeholder body with their finding. Out-of-scope observations go in `findings/out-of-scope.md`.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Audit report surfaces all eight seeded findings | The student's `findings/00N-*.md` files cover all eight categories with rule + location + consequence + fix; the answer-key diff is the join. |
| Each finding has rule, location, consequence, and proposed fix | Template adherence: every file has all four sections, no blanks. |
| Missing findings are quantified at the bottom | `findings/SUMMARY.md` lists coverage (8/8, 7/8, etc.) and names any miss with one sentence of why it was missed. |
| Self-graded against the published answer key | After commit, the student checks out `v1.0-answer-key` and runs the comparison: rule match, location match, consequence match, fix match — partial credit for "rule + location match, fix differs." |

### Concepts demonstrated → owning lesson

- The fail-closed rule and the canonical fail-open failure modes — 17.1.1.
- The two-message rule (user vs. operator), the read-aloud test, the redactor — 17.1.2.
- The six seams catalog and the per-seam audit step (grep targets) — 17.1.3.
- Security headers (HSTS, CSP with nonce + `'strict-dynamic'`, etc.) and the `next.config.ts` / `proxy.ts` split — 17.2.1.
- Rate-limit coverage matrix and the three mandatory-limiter triggers — 17.2.2.
- Audit-log canonical event set, transaction discipline, payload redaction — 17.2.3.
- GDPR retention catalog + the async deletion job + the three deletion shapes — 17.2.4.
- The consent gate's load-bearing rule (nothing fires pre-consent) — 17.2.5.
- Secrets in code / in `NEXT_PUBLIC_*` / rotation order — 17.2.6.
- Env-validation invariants and the typed `env` import — 17.2.7.
- pnpm 11+ supply-chain defaults — 17.2.8.
- The Server-Action / route-handler wrappers as the single place to lint — 10.2.2, 10.2.3, 17.1.3.
- `dangerouslySetInnerHTML` as an XSS sink even with strict CSP — 17.2.1 (CSP defense in depth), 4.10 (React fundamentals).
- The `processed_events` dedup pattern and the verify-then-claim-then-mutate transaction — 12.1.

---

## Lesson 17.3.1 — Eight categories, one template

Teaches the audit's coverage contract — the eight categories drawn from 17.1 and 17.2, the rule-location-consequence-fix template, the read-only scope, and the honor-system answer-key tag.

Goals:

- Frame what's being built: the audit pass that 17.1 and 17.2 install, run against a seeded target. The deliverable is a `findings/` directory the student commits, not patches to the audit target. Eight categories; one or more findings per category.
- State the "Done when" verifications in one paragraph (all eight seeded findings surfaced with rule + location + consequence + fix; misses quantified; the report is self-graded against the answer key once committed).
- Walk the eight audit categories and the rule each anchors on, with the owning lesson ID. The student should read this list as the audit's coverage contract: error discipline (1) fail-closed checks, (2) user-vs-operator message split, (3) `dangerouslySetInnerHTML` and other XSS sinks, and security baseline (4) security headers, (5) rate-limit coverage, (6) audit-log gaps, (7) secrets / env / GDPR posture (the three are linked; secrets first), (8) dep hygiene. Eight categories, eight (or more) findings.
- Show the rule-location-consequence-fix template and walk the canonical filled example (one of the modeled findings from 17.1.3's exercise). Linger on the consequence column: it must be user-visible or legal — "an attacker could escalate privileges" is right; "code smell" is wrong.
- Name the scope cuts: not a full pen test (no fuzz testing, no SAST scanner output read end-to-end — `pnpm audit` is the one tool we run); not a code-quality review (no architectural critiques outside the eight categories — those go in `out-of-scope.md`); not a performance audit (Unit 20.4 is the observability + performance audit on the same target); not a UX audit; the audit is read-only — the student does not patch the target.
- Set the senior payoff: the audit pass is the discipline every senior runs (with adjustments per stack) before a launch review. The same template, the same eight categories, the same grep targets. The artifact is portable — the student takes this `findings/` shape into every later job.
- Name the answer-key contract: the answer-key tag is published from day one but the student is on the honor system not to check it out until their findings are committed. The senior call: a real audit has no answer key — running it under the constraint of "no peeking" is the rehearsal.
- Show one screenshot of a filled finding (the modeled one) and one of the `findings/` directory layout.
- Link the starter via `degit`; name the answer-key tag.

Senior calls and watch-outs:

- The audit reads top-down: start at the eight categories, find one finding per category, then iterate to depth. Inverting the order — find every issue then bucket them — runs into the "depth on one category, silence on another" trap.
- Coverage matters more than depth. A short finding in every category is the senior delivery; a deep dive on CSP that leaves audit logs unaddressed is a fail.
- The consequence column is read aloud at the launch review by someone who has not read the code. If it is not user-visible or legally actionable, rewrite it.
- "Missing piece" findings are valid — a CSP that does not exist is a finding, not "not applicable." Location is "missing from `next.config.ts`" or "should be added at `proxy.ts`."

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: the audit target cloned, `pnpm install` clean, `docker compose up -d` running Postgres, `pnpm db:migrate && pnpm db:seed && pnpm dev` shows the running app on `:3000`, the `findings/` directory created with the template and eight numbered placeholder files. No finding bodies written yet.

Estimated student time: 15 to 20 minutes.

---

## Lesson 17.3.2 — Tour the target, model finding one

Teaches the audit target's file tree and canonical helpers, the running-app reading rhythm, and walks the fail-closed finding in `lib/admin/transferOwnership.ts` end-to-end as the reference shape.

Goals:

- Walk the audit target's file tree, calling out the eight directories where findings cluster: `next.config.ts` and `proxy.ts` for headers; `lib/admin/`, `lib/billing/`, `lib/account/` for action wrappers and ownership / billing / deletion paths; `app/api/auth/` for the auth endpoints and rate-limit coverage; `lib/env.ts` and `.env.example` for env / secrets; `app/(app)/invoices/[id]/` for the invoice notes XSS sink; `.npmrc` and `package.json` for dep hygiene; the `lib/admin/transferOwnership.ts` and `lib/account/deleteAccount.ts` files for the audit-log and GDPR seams.
- Read the existing helpers the audit is run against: `lib/authed-action.ts` (the canonical wrapper from 10.2.2), `lib/safe-limit.ts` (the rate-limiter wrapper with the documented fail-open carve-out from 17.1.3), `lib/audit-log.ts` (the transaction-scoped writer from 10.2.5), `lib/env.ts` (the `@t3-oss/env-nextjs` schema from 1.4.5), `lib/rate-limit.ts` (the limiter declarations from 15.3.3 with the seeded gap on password-reset). These are the canonical seams — every finding refers back to one of them.
- Read the running app: navigate the dashboard as the seeded admin user; create an invoice; add a note that includes a tame `<b>tag</b>` and watch it render as raw HTML — the fingerprint of finding 2. Open DevTools network tab and watch a Client Component fire a request that carries the `NEXT_PUBLIC_RESEND_API_KEY` — the fingerprint of finding 5. Open the password-reset form and submit it ten times in a row — no 429 — the fingerprint of finding 6. The student is taught to read the running app as a complement to the source; some findings (a missing header, a leaked secret) show up faster in the browser than in the diff.
- Model one finding end-to-end: walk finding 1 (the fail-closed violation in `lib/admin/transferOwnership.ts`). Read the file, point at the `try/catch` around `requireRole('owner')`, point at the catch block that logs and continues. Quote the failure mode (a Postgres blip during the membership read silently allows an owner-only mutation; a malicious user who triggers a connection blip — or a panicked operator who runs `kill` on a slow query — can use the window). Name the rule with the lesson ID (17.1.1 — "errors fail closed"). Walk the fix: remove the try/catch, let `requireRole` throw, let the outer `authedAction` wrapper convert the throw to `{ ok: false, error: { code: 'unauthorized' } }` per 17.1.3's seam-1 reading. Write the finding into `findings/001-fail-closed.md` with all four sections filled. The lesson surfaces the *shape* of a finding before the student writes their own; finding 1 is the gift the student starts with.
- The modeled-finding sub-section is the chapter's reference shape; the student re-reads it whenever a later finding feels stuck.
- Name the audit cadence: open the running app, open the source, hold both side-by-side, walk one category at a time, write the finding before moving on. Switching categories mid-finding fragments the report.

Senior calls and watch-outs:

- The audit target ships with all the canonical helpers — `authedAction`, `safeLimit`, `logAudit`, `tenantDb`, the typed `env`. Findings live in the call sites that *bypass* the helpers, not in the helpers themselves. Reading the helpers first calibrates the eye for the bypass.
- The "missing piece" findings (CSP, password-reset rate limit) are read off the running app, not the source. Curl the app for the headers (`curl -I http://localhost:3000`); spam the auth endpoint with a small script. The browser-side audit is half the pass.
- Finding 1 is the freebie; the student should not skip it. Writing one full finding in the template before tackling the rest is the rhythm-setting move.
- The consequence column for finding 1 names the *user-visible failure mode* (an unauthorized ownership transfer) and the *operator failure mode* (the fail-open dressed as "we log it then continue"). Both audiences land in the consequence; the user-visible side carries the weight.

Codebase state at entry: target cloned and running; empty findings placeholders.
Codebase state at exit: target unchanged; `findings/001-fail-closed.md` filled in (the modeled finding); the student has navigated the running app, walked the eight category locations, and read the canonical helpers. Seven placeholder files remain empty.

Estimated student time: 35 to 45 minutes.

---

## Lesson 17.3.3 — Error-discipline pass

Teaches the grep-driven audit of the three error-discipline categories — fail-closed bypasses, the user-vs-operator message split, and `dangerouslySetInnerHTML` plus adjacent XSS sinks — and surfaces findings one, two, and three.

Goals:

- Walk the three error-discipline categories and surface a finding per category. The lesson is grep-heavy — every audit step has a concrete command — and the student writes three finding files by the end.
- **Category 1 — fail-closed checks (finding 1 already modeled).** Re-confirm the modeled finding in `lib/admin/transferOwnership.ts`. Run the audit step from 17.1.3: grep `'use server'` in files that don't import `authedAction`, grep for `try { await require` patterns. Some hits are legitimate (the sign-up action — public by design, different wrapper); the rest are findings. The seeded target has the one fail-closed bug, but the audit step itself is the deliverable — the student documents which grep commands they ran and how many hits each returned.
- **Category 2 — user-vs-operator message split.** Walk the four sub-rules: (a) no `error.message` rendered to the user in `error.tsx`, (b) no inner `cause` exposed in user-rendered strings, (c) no raw Postgres error codes / constraint names in the user message, (d) the redactor is wired in Sentry's `beforeSend` and the structured logger. Audit steps: grep `error.message` in `app/**/error.tsx` and in JSX; grep for `cause:` reads in user-facing components; grep for `error.code === '23505'` patterns landing in user strings; open `lib/sentry.ts` and confirm `beforeSend` runs the redactor. The seeded target has the audit log gap (finding 3) which lands in this lesson as well — naming the missing `writeAuditLog` call is a message-split-adjacent finding because the *operator record* is what's missing.
- The lesson splits finding 3 across categories 2 and 6 — the audit-log gap is *primary* in category 6 (audit-log gaps); category 2 mentions it for completeness when the message-split discussion lands. The student writes the finding once, in `findings/003-audit-log-ownership-transfer.md`.
- **Category 3 — `dangerouslySetInnerHTML` and other XSS sinks.** The grep target: `dangerouslySetInnerHTML` across the codebase. Each hit is examined; the seeded target has one in `app/(app)/invoices/[id]/notes.tsx`. The student walks finding 2 — the user content rendered raw, the failure mode (stored XSS in any org's invoice notes), the rule (the rendered content is operator-trustworthy or it isn't; user-submitted is never operator-trustworthy without sanitization), the fix (sanitize at write *and* read; store the sanitized output). Adjacent grep targets named for completeness: `eval`, `new Function`, `setTimeout(string, ...)`, `innerHTML =` direct assignments — none seeded in the target but named so the student knows the shape.
- Tie the XSS finding back to category 4 (security headers, lesson 17.3.4): strict CSP with a nonce is the *defense in depth* but does not save a `<img onerror="...">` payload — the lesson surfaces the layering. Finding 2 stays in category 3 (the sink itself); finding 4 (missing CSP) lands in category 4. The student writes them as separate findings; the senior framing is "two findings, one threat model, two layers of defense to restore."
- Write the three findings: `001-fail-closed.md` (re-confirmed from 17.3.2; if the modeled body needs adjustments after the deeper read, revise), `002-xss-html-sink.md`, and `003-audit-log-ownership-transfer.md` (touched here in category 2 framing, primary location for the body is `findings/`'s slot 3 — the lesson permits writing it now, or deferring the body to 17.3.4's audit-log pass).
- Run the audit summary at the end: three findings written, the grep commands run and their hit counts, the bypass call sites named.

Senior calls and watch-outs:

- The grep commands are the load-bearing tool. A finding without a grep target the student can show in the report is a "code review opinion," not an audit finding. Every finding's location section names the command that surfaced it.
- The XSS finding (2) is the kind a senior catches at the first read of the rendered DOM. The fix is *not* "disable rich text" — many products need rich text. The senior fix is "sanitize at write *and* read, store sanitized." Naming "I'll just sanitize at write" misses the historical-data attack vector (a write before the sanitizer was added still ships).
- The audit-log finding (3) is the kind that hides easily — there's no error, no broken behavior, nothing renders wrong. The audit catches it only by reading the canonical event set (17.2.3) and checking each mutation against it. Pattern matching on "this mutation touches a security-relevant field, does it write an audit-log entry?" is the senior reflex.
- Finding 2's CSP defense (finding 4) is the textbook "single layer is not enough" lesson. The student should read the two findings as a pair when writing them.

Codebase state at entry: target unchanged; finding 1 written from 17.3.2; seven placeholders empty.
Codebase state at exit: target unchanged; findings 1, 2, and 3 written in `findings/`; the grep audit log is reproducible (commands documented). Five placeholders remain empty (4, 5, 6, 7, 8 — headers, secrets/`NEXT_PUBLIC_*`, rate limits, dep hygiene, GDPR deletion).

Estimated student time: 60 to 75 minutes.

---

## Lesson 17.3.4 — Security-baseline pass

Teaches the curl-and-grep audit of the five remaining categories — security headers, rate-limit coverage, audit-log gaps, secrets and env validation with GDPR deletion, and pnpm 11+ supply-chain defaults — and surfaces findings four through eight plus the two bonus senior-reach findings.

Goals:

- Walk the five remaining security-baseline categories and surface one finding per category. Same rhythm as 17.3.3: a documented audit step per category (a curl, a grep, a config-file read), then the rule-location-consequence-fix template, then the next category.
- **Category 4 — security headers.** Audit step: `curl -I http://localhost:3000/` and read the response; open `next.config.ts` (the `headers()` block) and `proxy.ts` (nonce generation). The seeded target ships HSTS and `X-Content-Type-Options` but no CSP, `Referrer-Policy`, `Permissions-Policy`, or `frame-ancestors`. Finding 4 names the rule (17.2.1's CSP with per-request nonce + `'strict-dynamic'`), the location (missing from `next.config.ts` and `proxy.ts`), the consequence (no defense-in-depth against the XSS in finding 2 or any future sink), and the fix (static CSP in `next.config.ts`, per-request nonce in `proxy.ts`, `x-nonce` header for Server Components, the marketing-site trade-off acknowledged). `securityheaders.com` is the alternative tool for the curl pass.
- **Category 5 — rate-limit coverage.** Audit step: open `lib/rate-limit.ts` and read the declared limiters; open `app/api/auth/*/route.ts` and confirm each handler runs through `safeLimit`. Seeded gap: `app/api/auth/reset-password/route.ts` has no limiter. Finding 6 names the rule (17.2.2's three triggers; password-reset hits two — costs money via Resend, attacks a third party via the user's inbox), the consequence (mass spam, account-enumeration, inbox-bomb), the fix (declare `passwordResetLimiter` with per-IP + per-email keying, wrap with `safeLimit`, emit `RateLimit-*` headers, generic 429 body). The student also attaches the coverage matrix from 17.2.2 (endpoint category, file, limiter, key strategy, coverage Y/N) to the fix.
- **Category 6 — audit-log gaps.** Audit step: walk the canonical six-category event set from 17.2.3 against every mutation in `lib/`; grep `db.transaction` and `.update(` to confirm each security-relevant mutation calls `writeAuditLog(tx, event)`. Seeded gap: `lib/billing/transferOwnership.ts` updates `organizations.ownerId` silently. Finding 3 (written here if deferred from 17.3.3) names the rule, the location, the consequence (compliance auditor blind to the ownership history; the customer-facing Activity page silent on one of the most security-relevant events), and the fix (add `org.ownership.transferred` to the canonical set, write inside the transaction, redacted payload `{ previousOwnerId, nextOwnerId }`).
- **Category 7 — secrets and env validation (combined since they share `lib/env.ts`).** Audit step: grep `NEXT_PUBLIC_*` in `.env.example` and `lib/env.ts`; grep `process.env.` outside `lib/env.ts`; check `SKIP_ENV_VALIDATION` usage. Seeded gap: `NEXT_PUBLIC_RESEND_API_KEY` consumed by a Client Component. Finding 5 names the rule (17.2.6's no-secrets-in-`NEXT_PUBLIC_*` plus 17.2.7's server/client split that the prefix bypassed), the consequence (the key ships in the client bundle; an attacker mails from the verified domain — domain-reputation hit, deliverability loss, customer-base phishing risk), and the fix (move the call to a Server Action, rename to `RESEND_API_KEY` in the `server` partition, run the rotation runbook from 17.2.6 with Vercel-before-provider order). The follow-up lint rule (no `NEXT_PUBLIC_*` matching `*_KEY` / `*_SECRET` / `*_TOKEN`) is noted.
- **Category 7 (continued) — GDPR deletion.** Audit step: open `lib/account/deleteAccount.ts` and walk the data graph — every table holding the deleted user's data, every external. Seeded gap: only the `users` row gets deleted; `org_members`, `invitations`, `audit_logs`, Stripe, Resend, PostHog, R2 — all untouched. Finding 8 names the rule (17.2.4's async deletion job with the three deletion shapes; audit logs anonymized, never hard-deleted), the consequence (PII persists past a successful deletion request; Article 17 legal exposure; the confirmation email is a lie), and the fix (route through the async Trigger.dev `deleteUser` job, mark `deletion_in_progress` to block sign-in, anonymize audit-log rows, call Stripe / Resend / PostHog deletes, log `account.deletion.completed`).
- **Category 8 — dep hygiene.** Audit step: open `.npmrc` and check for `minimumReleaseAge`, `blockExoticSubdeps`, `only-built-dependencies`; run `pnpm audit --prod` and read the output; confirm `packageManager` in `package.json`; confirm CI uses `--frozen-lockfile`. Seeded gaps: missing `.npmrc` settings; one outdated pin flagged by audit. Finding 7 names the rule (17.2.8's pnpm 11+ defaults; the 24-hour `minimumReleaseAge` is the pre-install defense against typosquats and maintainer compromises like the Shai-Hulud vector), the consequence (a malicious release lands the day it ships; the project has no defense; `pnpm audit` is a post-install signal, not a pre-install defense), and the fix (enable both `.npmrc` settings, declare the `only-built-dependencies` allow-list, bump the pinned dep, gate CI per Unit 21.2.3).
- **Bonus findings — the senior reach.** The target ships two unrequested findings the answer key acknowledges: (9) PostHog initialized with `opt_out_capturing_by_default: false` (consent gate missing); (10) a worker endpoint calling `limiter.limit()` directly, bypassing `safeLimit`. The brief named "8 is the floor, 10 is the senior reach" — the student who catches one or both earns the credit.
- Audit summary at the end: five new findings written (4 through 8) plus any bonus; the grep / curl commands documented; the call sites named; the rate-limit coverage matrix attached.

Senior calls and watch-outs:

- The headers finding (4) is read off curl in 60 seconds. The senior anchor: a launch review starts with the headers — the cheapest, highest-value pass. A target without a CSP is "not launched" by the senior's bar.
- The rate-limit finding (6) is found by reading the route list, not by exercising the app. The audit step grep is faster than the manual hammer-the-endpoint test, but both should land in the documentation (one as the discovery method, one as the verification).
- The audit-log finding (3) is the one most likely to be missed because nothing visibly breaks. The discipline that catches it is the *canonical event set* — read the six categories from 17.2.3 against every mutation in `lib/`. Senior reach: the audit-log set is a project-level invariant, not a per-feature decision.
- The `NEXT_PUBLIC_RESEND_API_KEY` finding (5) is a *naming* finding — the developer chose the prefix to bypass the build error. The `env` schema's `server` partition would have caught it had the developer used the right side. The fix is structural (rename and move) not configurational (lint rule alone). The rotation step is part of the fix — the leaked key is *in production already* by the time the audit catches it; pretending otherwise is a fail.
- The GDPR deletion finding (8) often gets a partial answer (the student names `org_members` but misses Stripe / Resend / PostHog). The senior fix names every external the user's PII could have leaked to — that's the discipline 17.2.4 installs.
- The dep hygiene finding (7) is sometimes resisted with "but we just enabled Dependabot." The senior counter: Dependabot raises PRs *after* a malicious release has landed in the registry. `minimumReleaseAge` is the *pre-install* defense — the 24 hours is the window the community catches and yanks. They are not the same control.
- The bonus findings (9, 10) reward attention to the running app (the consent finding shows up as a network request on the first page load) and to the seam catalog (the worker endpoint bypass shows up as a `limit(` grep hit not preceded by `safeLimit`).

Codebase state at entry: target unchanged; findings 1, 2, 3 (if written in 17.3.3) in `findings/`; placeholders 4-8 empty.
Codebase state at exit: target unchanged; all eight seeded findings written; optional bonus findings (9, 10) written by students who reached past the floor; `findings/SUMMARY.md` lists coverage and any deliberate misses. The student is ready to self-grade against the answer key in 17.3.5.

Estimated student time: 90 to 110 minutes.

---

## Lesson 17.3.5 — Commit, then self-grade

Teaches the irreversible-commit-then-peek discipline, the clause-by-clause comparison against the `v1.0-answer-key` tag, the partial-credit scoring rule (rule and location are the floor, fix detail is the senior reach), and the forward references into Units 19 through 22.

Goals:

- Commit the findings: `git add findings/ && git commit -m "Unit 17 audit findings"`. The senior anchor: the commit is the irreversible step — once committed, the student looks at the answer key. Before commit, no peeking.
- Check out the answer-key tag: `git fetch && git checkout v1.0-answer-key -- solution/findings/`. The answer-key directory lands at `solution/findings/`. The student's findings stay at `findings/`. Side-by-side diff is the comparison.
- Walk every finding clause-by-clause and partial-credit the common gaps. The answer key names the senior-reach details students most often miss: finding 1 — let `authedAction` convert the throw, do not re-throw inside a custom catch; finding 2 — sanitize at write *and* read (historical-data defense), not only at write; finding 3 — the exact event slug (`org.ownership.transferred`) plus the redacted payload schema; finding 4 — the per-request nonce + `'strict-dynamic'`, not just "add a CSP header"; finding 5 — *rotation* of the leaked key, not only rename-and-move; finding 6 — dual per-IP *and* per-email keying, not per-IP alone; finding 7 — both `.npmrc` settings (`minimumReleaseAge` *and* `blockExoticSubdeps`), `pnpm audit` is not the pre-install defense; finding 8 — the full graph (six tables, three externals, audit-log anonymization), coverage of every PII seam. The scoring rule: rule + location match is the audit floor; the fix-detail match is the senior reach.
- Score the bonus findings if the student wrote them — finding 9 (consent gate on PostHog) and finding 10 (`safeLimit` bypass on the worker endpoint). The senior reach is a 10/10; the floor is 8/8.
- Walk the senior calls one more time:
  - The two commitments from 17.1 (fail-closed, two-message split) ran through every error-discipline finding.
  - The single-place-to-lint pattern (one `authedAction` wrapper, one `safeLimit`, one `logAudit`, one `env` schema, one `.npmrc`) is what makes the audit pass grep-able. Findings are call sites that *bypass* the canonical seam; the seam itself is correct.
  - Coverage on all eight categories is the floor; depth on any one is the senior reach. A 5/8 audit that goes deep on CSP is a fail.
  - The audit-target shape (eight categories, one finding per minimum, one Markdown file per finding, rule-location-consequence-fix template) is portable — the student writes this audit at every later launch review, against a different codebase, with the same template.
  - The follow-up is to *fix* the findings — out of scope for this chapter, in scope for the next sprint. The audit is the discipline of finding them; the fix is the discipline of shipping the safer version.
- Forward references:
  - Unit 19.3 writes integration tests against `authedAction` and the message-mapper — the discipline this audit found gaps in.
  - Unit 19.5 writes a Playwright money-path test that exercises the rate limit and the consent gate as system-level invariants.
  - Unit 20.1 wires Sentry's `beforeSend` redactor — the operator side of the message split this audit confirmed isn't fully wired.
  - Unit 20.4 audits the same target for observability and performance findings (Sentry not wired, missing correlation IDs, RSC waterfalls, bundle size, the consent-gate finding from this audit re-surfaces if not fixed).
  - Unit 21.2 wires CI gates that catch some of these findings at PR time (`pnpm audit --prod` clean, `--frozen-lockfile`, lint rule against `NEXT_PUBLIC_*` matching secret patterns).
  - Unit 22.4 reviews a seeded PR against the architectural principles — the same disciplined-reading muscle this chapter built.

Senior calls and watch-outs:

- The self-grading is the rehearsal. A real audit has no answer key; the student who needed the answer key to know they missed `minimumReleaseAge` will catch it next time without one.
- Missed findings are not failure — they are *the next audit's lesson*. The senior reflex is to read the answer-key entries for misses and update the personal grep / curl checklist; the audit gets sharper every pass.
- The fix column's partial-credit pattern (rule + location match, fix differs) is the most common outcome. The rule is the load-bearing piece. A student who names the rule and the location correctly but proposes a less-thorough fix is still doing the audit; a student who names neither has not run the pass.

Codebase state at entry: target unchanged; all eight findings written; bonus optional.
Codebase state at exit: findings committed; answer-key checked out; the student has a side-by-side comparison, a scored coverage percentage, and an updated personal audit checklist for the next pass.

Estimated student time: 30 to 45 minutes.
