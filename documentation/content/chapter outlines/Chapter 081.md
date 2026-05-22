# Chapter 081 — The security baseline

## Chapter framing

Chapter 081 lands the irreducible security baseline a 2026 senior wouldn't ship without — the second half of Unit 16's pre-launch audit pass, paired with chapter 080's error discipline. The student arrives with the pieces already partly in place: type-safe env from lesson 2 of chapter 037, the proxy from chapter 033 and chapter 054, Upstash `@upstash/ratelimit` on the auth endpoints from lesson 3 of chapter 074, the `audit_logs` table and `logAudit(tx, event)` from lesson 5 of chapter 057, RBAC and tenancy from 060–061, Better Auth from Unit 8, PostHog foreshadowed in chapter 093. What's missing is one explicit pass that names eight categories — headers, rate-limit coverage, audit-log discipline, GDPR posture, consent gating, secrets management, env validation, dep hygiene — and resolves each to a senior rule with the failure mode it prevents. The chapter is an audit pass, not new architecture; the work is naming the checklist, wiring the few pieces not yet in code (headers, consent gate, retention timer, deletion job), and revisiting the rest through the security-baseline lens. The output is the catalog chapter 082 audits a seeded codebase against.

Threads that run through every lesson. The baseline is **load-bearing minimums, not best-practice maximalism** — every item is one a 2026 senior would refuse to ship without; the long tail is cut. **One place per rule** — headers in `next.config.ts` plus `proxy.ts`, the consent flag in one provider, the env schema in one file, the rate-limit policy in `lib/rate-limit.ts`, the audit-log writer is one signature; the audit pass is grep-able. **Fail-closed and the message-split from chapter 080 carry through** — a deletion-on-request that fails halfway must refuse, a 429 body never leaks "this email is registered." **Dep hygiene is supply-chain hygiene** — 2026 pnpm 11+ defaults (`minimumReleaseAge`, `blockExoticSubdeps`, post-install gating) are the modern baseline, not `pnpm audit` alone. The chapter ships eight teaching lessons plus a quiz; wiring sits in `next.config.ts`, `proxy.ts`, the consent provider, `lib/env.ts`, `lib/rate-limit.ts`, `lib/audit.ts`, and `.npmrc`.

---

## Lesson 1 — Headers that block live attacks

The irreducible six security headers — HSTS, nonce-based CSP with `'strict-dynamic'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` — split between `next.config.ts` (static) and `proxy.ts` (per-request CSP nonce), with the static-prerender trade-off and report-only rollout.

Topics to cover:

- **The senior question.** `curl -I https://app.example.com` shows no `Content-Security-Policy`, no `Strict-Transport-Security`, no `X-Frame-Options`. Three minutes of config prevents clickjacking, MIME-sniffing, downgrade attacks, third-party script injection. The lesson lands the irreducible set, where each lives, what each prevents, and the one trade-off that matters (strict CSP versus static pages).
- **The catalog — six headers that ship, two that flex.** Non-negotiable: `Strict-Transport-Security`, `Content-Security-Policy` (the load-bearing one), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` (subsumed by CSP's `frame-ancestors` but kept for legacy crawlers). Flex: `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` — scoped to cross-origin isolation (`SharedArrayBuffer`), not default-on.
- **HSTS.** `max-age=63072000; includeSubDomains; preload` — two years (2026 default; preload list expects it). Shipped from `next.config.ts`; gated on `NODE_ENV === 'production'` so localhost isn't locked to HTTPS. Preload list submission named but not required.
- **CSP — the only header that blocks live attacks.** XSS, data exfil, frame embedding. 2026 minimum for this stack: `default-src 'self'; script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'; style-src 'self' 'nonce-{NONCE}'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://*.upstash.io https://*.sentry.io https://us.i.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`. Each `connect-src` entry justifies itself by the third party.
- **Nonces vs. hashes vs. `'unsafe-inline'`.** Next.js renders inline `<script>` for hydration. CSP requires nonces (the senior reach), hashes (impractical), or `'unsafe-inline'` (defeats the policy). Per-request nonces generated in `proxy.ts`, attached to `x-nonce` request header (Server Components read via `headers()`) and the CSP response. `'strict-dynamic'` lets nonced scripts load further scripts without listing every origin.
- **The static-page trade-off.** Nonced pages can't be statically prerendered (each request gets a fresh nonce). Protected app pages are dynamic anyway (auth, tenant) — cost zero. Marketing pages opt out — stricter nonceless CSP with explicit origins (Calendly, Stripe) listed.
- **The remaining headers.** `X-Content-Type-Options: nosniff` (no decision). `Referrer-Policy: strict-origin-when-cross-origin` (2026 default; `no-referrer` breaks legitimate analytics). `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` — disable what's unused; flip `payment=()` to `payment=(self "https://js.stripe.com")` if Stripe Elements ships. `X-Frame-Options: DENY` plus `frame-ancestors 'none'` — two belts.
- **Where they ship.** Static ones in `next.config.ts` under `headers()` returning `[{ source: '/(.*)', headers: [...] }]`. Dynamic CSP (with nonce) in `proxy.ts` because per-request. `proxy.ts`'s CSP overrides `next.config.ts`'s for matched routes.
- **Report-only as the rollout posture.** Ship `Content-Security-Policy-Report-Only` for a week, watch violation reports (Sentry has a CSP endpoint), flip to enforce. Seeded codebase runs enforce-mode for teaching clarity.
- **Verification.** `securityheaders.com` and `curl -I` are 30-second tools. CI smoke check lands in lesson 3 of chapter 097.
- **Watch-outs.** Setting `Content-Security-Policy` and `Content-Security-Policy-Report-Only` simultaneously confuses tooling; `'unsafe-inline'` in `script-src` defeats the policy — never "temporarily"; HSTS without dev gating locks `http://localhost`; per-route `next.config.ts` overrides must not collide on `source`; nonces inside `dangerouslySetInnerHTML` need explicit pass-through; the marketing-site CSP must list every third-party origin when nonceless.

What this lesson does not cover:

- Nonce-generation pattern at depth — sketched here, full implementation in the project starter.
- CSP violation report endpoint — Sentry covers it natively (Unit chapter 092).
- SRI, `COOP`/`COEP`, preload-list submission — named.

Estimated student time: 45 to 55 minutes.

---

## Lesson 2 — The abusable-endpoint matrix

The seven categories of abusable endpoints, the three triggers that make a limiter mandatory, per-category key strategy, the `safeLimit` seam, module-scope declaration in `lib/rate-limit.ts`, and the coverage matrix as deliverable.

Topics to cover:

- **The senior question.** chapter 074 wired `@upstash/ratelimit` on auth with per-IP-and-per-email dual keying. The baseline pass asks: what *other* endpoints are abusable, what's the threshold that makes a limiter mandatory, and how does coverage stay grep-able? Every abusable endpoint goes through one of the named limiters in `lib/rate-limit.ts`.
- **Seven categories of abusable endpoints.** (1) Auth flows (covered). (2) Email-sending paths — invitations, notifications, contact forms; spam relay or inbox-bomb vectors. (3) Webhook *fan-out* — the receiver is gated by signature verify (lesson 1 of chapter 063); the emails/jobs the webhook triggers need per-tenant limits. (4) Expensive public reads — search, unindexed-filter lists, AI completions. (5) File uploads — R2 presigned-URL issuance (chapter 069). (6) Write-heavy actions on shared resources — single attacker filling the org's quota. (7) Anonymous endpoints — public sign-up, request-demo, public webhooks, metrics scrape.
- **The threshold — three triggers, any one.** (a) Endpoint costs money per call (LLM, transactional email, SMS). (b) Can be used to attack a third party (victim's inbox, outbound fetch). (c) Touches state addressable without auth (sign-up, invite-accept by token, password reset). Endpoints failing all three get the wrapper's default per-user/per-org defensive limit, not a hand-rolled one. Limiters are not for "every endpoint" — only for endpoints matching one of the three.
- **Key strategy per category.** Auth: per-IP and per-email (dual, both must pass). Email-sending: per-org-per-recipient plus per-org-total. Webhook fan-out: per-tenant on the fan-out. Public reads: per-IP generous, per-user tight behind auth. File uploads: per-user-per-day count + per-user-per-minute rate. Write-heavy actions: per-org per resource type. Anonymous: per-IP tight. The key is the smallest scope containing the abuse without affecting legitimate use.
- **`safeLimit(limiter, key)` as the single seam.** From lesson 3 of chapter 080: every `limit()` goes through `safeLimit` so the fail-open carve-out (Redis outage) is documented in one place. Grep for `limit(` not preceded by `safeLimit` — every hit is a finding.
- **Module-scope declaration rule.** Every limiter in `lib/rate-limit.ts` at module scope: `export const emailLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:email', analytics: true })`. The file is the catalog the audit reads. Inside-handler limiters fragment analytics and cold-cache per invocation.
- **The 429 body and the RFC headers.** User sees generic "Too many attempts. Please try again later." — no leak about which limiter or key. Structured log carries the truth. `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every rate-limited response.
- **The CAPTCHA carve-out.** Cloudflare Turnstile (or hCaptcha) as a second gate on public sign-up when per-IP isn't enough (distributed botnet). Named; not wired in this lesson.
- **The deliverable — coverage matrix.** (endpoint category, file path, limiter prefix, key strategy, current coverage Y/N). Gaps are tickets.
- **Watch-outs.** Per-IP-only on sign-in locks out office NAT and lets botnets through; per-email-only on sign-up lets rotate-and-burn; limiting the webhook receiver but not the fan-out misses the actual cost; sharing one limiter across unrelated endpoints fragments analytics; limits that hit legitimate users are worse than none — set at the 99th percentile.

What this lesson does not cover:

- `@upstash/ratelimit` API, algorithms, dual-keying at depth — Chapter 074.
- WAF rules in code, Turnstile wiring — named.

Estimated student time: 30 to 40 minutes.

---

## Lesson 3 — What belongs in the audit log

The six-category canonical event set, what's forbidden (reads, failed auth), the per-entry field shape with per-event payload schemas, PII redaction policy, append-only defense in depth, transaction-scoped `logAudit(tx, event)`, three audiences, and anonymization on user deletion.

Topics to cover:

- **The senior question.** The `audit_logs` table from lesson 5 of chapter 057 is in the schema, append-only by RLS, `logAudit(tx, event)` forces transaction-scoped writes. The baseline pass asks: which events deserve an entry, which don't, what fields, what gets redacted, who reads it, what's the retention?
- **Three jobs.** (1) Forensic — who did what when. (2) Compliance — SOC 2 / GDPR want an immutable identity-and-access record. (3) Product trust — customer-facing "Activity" page reads the same source.
- **The canonical event set — six categories.** (1) **Identity:** sign-in, sign-out, sign-up, password change, password reset, MFA enrolled/removed, session revoked. (2) **Membership/RBAC:** member invited/joined/removed, role changed, ownership transferred, invitation revoked. (3) **Billing:** subscription created/canceled, plan changed, payment method added/removed, refund. (4) **Privileged data access:** export started/completed, admin viewing tenant data (impersonate), bulk delete, data deletion request submitted/completed. (5) **Configuration:** API key created/revoked, webhook endpoint added, SSO settings changed, security setting changed. (6) **Tenant lifecycle:** org created/deleted/transferred. Adding a new class to the codebase requires adding it here.
- **Forbidden from the audit log.** Reads of resources the user has access to (every list / detail page) — too noisy; goes to Sentry / structured logs. Failed authorization attempts — Sentry, with `cross_tenant_attempt` / `unauthorized` code. Internal background jobs the user didn't trigger — that's job-history, a different table. Boundary: user-attributable, security-relevant.
- **Fields on every entry.** `id`, `org_id`, `actor_user_id` (nullable for system), `actor_type` ('user' | 'system' | 'api_key' | 'webhook'), `event` (canonical name like `'member.role.changed'`), `target_type`, `target_id`, `payload` (JSONB — per-event-type detail with a documented Zod schema), `ip`, `user_agent`, `created_at` (server time).
- **PII redaction in payload.** Read by the customer's compliance officer; can't include PII they haven't consented to seeing. `member.invited` — invitee email is the event. `password.changed` — payload empty; the event is the record. `data.deletion.requested` — datasets being deleted, not the data itself. Per-event redaction policy declared next to the schema, enforced by `logAudit`. The lesson 2 of chapter 080 redactor wraps this.
- **Transaction discipline, restated.** `logAudit(tx, event)` takes `tx` first so the entry commits with the mutation. Mutation succeeding without entry is the bug; entry without mutation (rolled-back transaction) is correct fail-closed behavior.
- **Append-only — defense in depth.** RLS denies UPDATE/DELETE for the app role *and* application discipline (no `tx.update(audit_logs)` anywhere). Grep `audit_logs` outside `logAudit` and migrations — only read paths should remain.
- **Who reads it — three audiences.** (a) Customer admin reads org-scoped Activity page (tenant-aware query). (b) Platform operator reads cross-tenant for incidents, gated by `superadmin` role and audited as `admin.audit_log.queried` (reading the log is itself audited). (c) Compliance officer exports a date range for SOC 2.
- **Retention — paired with lesson 4 of chapter 081.** Per event class: `identity` 2 years, `billing` 7 years (financial), `privileged_access` 7 years. Longer than most operational data because it's the legal record.
- **Deletion-on-request interaction.** When a user invokes GDPR deletion, their audit entries are *anonymized*, not deleted — `actor_user_id` set to NULL or stable hash, `payload` scrubbed of PII. Legal record persists; link to the natural person doesn't.
- **Customer-facing vs. operator — same table, two reads.** Activity page is a filtered read with localized strings via `formatAuditEvent(event)` ("Alice promoted Bob from member to admin" from the structured payload). One source, two renderings.
- **Watch-outs.** Logging reads fills the table with noise; logging outside a transaction means the action commits but the audit doesn't — the signature prevents it; raw input / response in payload leaks PII — the per-event schema is the shape; rendering from raw `payload` couples UI to schema — go through `formatAuditEvent`; cross-tenant reads without `superadmin` are leaks; migrating without preserving append-only constraints is a one-line breach; client-clock timestamps are a skew attack — server `now()` only.

What this lesson does not cover:

- Table schema and RLS policy at depth — lesson 5 of chapter 057.
- Retention timer implementation — lesson 4 of chapter 081.
- SIEM integration, cryptographically chained logs — out of scope.

Estimated student time: 40 to 50 minutes.

---

## Lesson 4 — Retention and the right to be forgotten

The per-table retention catalog driven by a daily Trigger.dev job (R2 lifecycle for blobs), the async deletion-on-request flow, the three deletion shapes (hard / soft / anonymize), third-party deletion calls, legal retention carve-outs, and the no-real-PII-in-non-prod rule.

Topics to cover:

- **The senior question.** GDPR (and CCPA / LGPD / the converged 2026 baseline) gives two enforceable rights: deletion (right to be forgotten) and retention (data minimization). What's the smallest implementation that satisfies both, doesn't leak through a partial failure, and stays runnable as the schema grows?
- **The two rights.** (1) **Deletion-on-request.** User (or org admin) requests erasure; 30-day SLA in practice (Article 17). Erasure means *gone* — backups eventually purged, replicas eventually caught up, audit logs anonymized (not deleted). (2) **Retention.** Inactive accounts, old logs, expired sessions, expired exports — each has a class with a max lifetime; an automated job deletes past the cutoff.
- **Retention classes — per-table catalog.** Declared in `lib/retention.ts`. Examples: `session` (90 days after last activity), `email_log` (30 days), `export_artifact` (7 days, paired with R2 lifecycle), `audit_log:identity` (2 years), `audit_log:billing` (7 years), `inactive_account` (3 years after last sign-in, with a 60-day warning email). Each entry: table, cutoff column, TTL.
- **The retention job — Trigger.dev `schedules` daily.** Walks the catalog, deletes past cutoff, logs counts per class. Idempotent, tenant-aware. Catalog drives the job; the job doesn't hard-code tables.
- **R2 lifecycle for blobs.** Export artifacts use R2's native lifecycle rules. When retention can be delegated to the storage layer, delegate.
- **Deletion-on-request flow.** Click "Delete my account." Action: (1) validates (re-auth for self, RBAC for admin-initiated), (2) writes audit entry `account.deletion.requested`, (3) enqueues Trigger.dev job `deleteUser(userId, orgId)` with stable idempotency key, (4) confirmation page. Async — the job touches many tables and externals.
- **The deletion job — fail-closed, idempotent, complete.** Walks the data graph: user row, sessions, memberships, invitations, personal API keys, export artifacts (R2), third-party data (Stripe customer, Resend audience, PostHog person), audit log entries (anonymized). User marked `deletion_in_progress` so they can't sign in mid-deletion. Partial deletion is the worst-of-both-worlds.
- **Three deletion shapes.** (1) **Hard delete** — row gone (PII rows the user owns alone). (2) **Soft delete** — `deleted_at` set, visibility helper from lesson 2 of chapter 061 hides it (shared rows with legal value — invoices, audit-attributable mutations). (3) **Anonymize** — row stays, PII scrubbed (audit logs, comments on shared resources). Per-table policy, declared once.
- **Third-party deletion calls.** Stripe `customers.del`, Resend audience contact delete, PostHog person delete. Each is a step; failures retried; final audit entry `account.deletion.completed` with `{ tables_purged, externals_purged, duration_ms }`.
- **30-day SLA.** Practically hours, not days. Confirmation email when the job logs completion. Irrecoverable failure → operator alerted, user given a status page.
- **Legal retention carve-out.** Financial records (7 years), regulated communications, tax data — anonymized rather than deleted; record persists for the legal window. Confirmation email is honest about retained categories.
- **Dev / staging exception.** Never real PII in non-prod. Seed uses `@example.test`. CI check fails the build if seed email domains aren't synthetic.
- **The data-export right.** Article 20 (portability) — same export pattern from chapter 069 serves both rights.
- **Privacy Policy / DPA — out of scope but named.** The engineering team owns the subprocessor list (Stripe, Resend, Upstash, PostHog, Sentry, Vercel, R2) as a docs-site page; legal copies from it.
- **Watch-outs.** Soft-delete without scrubbing satisfies neither right; synchronous deletion blocks the request for minutes — always async; retention job without per-tenant scoping deletes another tenant's data; skipping third-party calls leaves PII at the externals; a deletion-request flag without enqueuing means it never happens; R2 lifecycle never set means exports accumulate; dev seed using real emails turns localhost into a PII source; failing to anonymize audit logs leaks the actor's identity in the historical record.

What this lesson does not cover:

- Audit log schema and anonymization — lesson 3 of chapter 081.
- Export-job pattern — Chapter 069.
- Privacy Policy / DPA legal copy, SCCs, TIAs — out of scope.
- Right-to-rectification beyond trivial self-edit — out of scope.

Estimated student time: 50 to 60 minutes.

---

## Lesson 5 — Nothing fires pre-consent

Essential vs. non-essential cookies, the four-state consent machine, the single `useConsent()` provider, PostHog's `opt_out_capturing_by_default` plus dynamic SDK import, the three-button banner with equal-weight Accept/Reject, the consent-record audit entry, and the marketing-email opt-in boundary.

Topics to cover:

- **The senior question.** PostHog (Unit chapter 093) will measure feature usage and run session replay. GDPR / ePrivacy require explicit, prior consent before any non-essential cookie or tracking script. The naive "Accept" banner that flips a flag leaks events on first load. The senior reach is a consent *gate* with a single source of truth that every third party reads, nothing fires pre-consent, and the gate's state is visible everywhere.
- **Essential vs. non-essential.** Essential (no consent): session cookie (Better Auth), CSRF token, the consent-choice cookie itself, active-org cookie from lesson 1 of chapter 056. Legal test: strictly necessary for the service the user explicitly asked for. Non-essential (consent required): analytics (PostHog), session replay, marketing pixels, support chat widgets, anything that profiles the user. If in doubt, non-essential. The gate ships two categories: `analytics` and `marketing`, both default-off.
- **State machine — four states.** `unset` (no decision; non-essential off), `analytics-only`, `marketing-only` (rare), `all`. State in a cookie (`consent_choice`, 13-month max per ePrivacy), readable server-side via `cookies()` and client-side via `document.cookie`. Writing is a Server Action.
- **The consent provider — one React Context.** `ConsentProvider` at the root layout, exposes `useConsent()` returning `{ analytics, marketing, open(), accept(level), reject() }`. Every third party imports the hook and short-circuits when the flag is false. One gate.
- **PostHog gating.** (PostHog wiring is owned by lesson 3 of chapter 093; the SDK names below appear here only to demonstrate the consent rule's shape.) PostHog's SDK supports `opt_out_capturing_by_default: true`. Initialize with capturing opted out; call `posthog.opt_in_capturing()` only on consent. Session replay gated similarly (`disable_session_recording: true` flipped on consent).
- **The banner — three buttons, no dark patterns.** "Accept all," "Reject all," "Manage preferences." Reject must be as visible/easy as Accept (ePrivacy regulators have called out asymmetric designs). "Manage preferences" opens a modal with the two category toggles. Small non-modal sticky footer.
- **Reject must be functional.** No PostHog request, no marketing pixel, no replay socket. Audit step: incognito, click reject, network tab clean.
- **Pre-consent boundary — the load-bearing rule.** Even one analytics event before the click violates the regulation. PostHog initialized with `opt_out_capturing_by_default: true` *and* the SDK dynamically imported by the consent provider only when analytics flips on. Both belts.
- **The "reconsider" path.** A footer / settings link reopens the modal. Revocation calls `posthog.opt_out_capturing()` and discards pending events via `posthog.reset()`.
- **Essential isn't a free pass.** Session cookie's `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for auth flows) — Better Auth ships these defaults, the audit verifies. Cookies "essential" but tracking cross-site need consent.
- **The consent record — auditable evidence.** Logged as `consent.updated` in the audit log (actor or session id, choice, timestamp, IP, UA, policy version). Bumping the policy version invalidates consent and reshows the banner.
- **Marketing-site exception.** `example.com` separate from `app.example.com`. Marketing might run Plausible (cookieless, no consent) or GA4 with Consent Mode v2. App-side gate is the load-bearing one.
- **The "no consent, no marketing email" rule.** Separate from cookie consent. Sign-up's "send me product updates" checkbox is the boundary. Transactional (password reset, invoice receipt) doesn't need consent. `marketing_email_consent` column on `users`, default false, flipped only by the checkbox.
- **What this gate is not.** Not consent for data processing (Privacy Policy + Terms). Not the CCPA "Do Not Sell" link (separate US-California footer link, named).
- **Watch-outs.** Loading any tracker before consent is read leaks events in the first hundreds of ms — gate the SDK load itself; "implied consent" patterns are not GDPR-valid; Accept bigger/more colorful than Reject is the dark pattern regulators target; localStorage-only fails server-rendered banners — cookie; expiry over 13 months violates ePrivacy; banner persisting per navigation suggests the state isn't being persisted; revoking without `posthog.reset()` keeps data flowing for 30 seconds; pre-checked marketing-email checkbox fails GDPR — opt-in only.

What this lesson does not cover:

- PostHog SDK at depth — Chapter 093.
- CCPA "Do Not Sell," GA4 Consent Mode v2 — named.
- CMP industry tools (OneTrust, Cookiebot) — named alternatives.

Estimated student time: 45 to 55 minutes.

---

## Lesson 6 — Where secrets live and how they rotate

The five secrets rules (never in code, never client-bundled, in the platform store with Vercel's "sensitive" flag, three environments / three sets, rotation as a documented Vercel-before-provider operation), `.env.example` discipline, pre-commit secret scanning, and the canonical leak audit.

Topics to cover:

- **The senior question.** The app has `DATABASE_URL`, `STRIPE_SECRET_KEY`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_AUTH_TOKEN`, and a dozen more. Where do they live, who reads them, how are they rotated, and what's the rule that prevents the canonical bug — a secret bundled into the client JavaScript?
- **Rule 1 — secrets never in code.** Hard-coded in a `.ts` file is the bug. Grep target: `const KEY = 'sk_live_...'`. The reflex is the typed `env.STRIPE_SECRET_KEY` import; trust the build to fail when missing. Pre-commit hooks (Gitleaks, Trufflehog) scan every commit for high-entropy strings matching known patterns.
- **Rule 2 — secrets never reach the client bundle.** A secret accessed from a Client Component file gets bundled into the browser JS. `@t3-oss/env-nextjs`'s server/client split (lesson 2 of chapter 037) makes it structurally hard — server vars throw if imported client-side at build time. `NEXT_PUBLIC_*` is the only path to the client; never name a secret `NEXT_PUBLIC_*`.
- **Rule 3 — secrets in the platform's secret store.** Vercel: env vars in project settings with the **"sensitive"** flag on every secret. From the April 2026 Vercel incident: non-sensitive vars are readable via dashboard / CLI; sensitive are write-only after creation.
- **Rule 4 — three environments, three sets.** Local, Preview, Production. Production has production keys; preview has staging/sandbox (Stripe test, Resend sandbox, separate Upstash, separate Postgres); local has dev keys in `.env.local` (gitignored). Reusing production secrets across environments is the canonical 2026 breach vector.
- **The `.env.example` discipline.** Checked in; lists every variable with a placeholder or source comment. Contract between README and the running app. Schema and `.env.example` must list the same variables (audited in CI).
- **Rule 5 — rotation is a documented operation.** When a developer leaves, every secret they had access to gets rotated. The runbook lists each secret, its source, rotation steps, Vercel update. **Order:** update Vercel *before* invalidating the old credential at the provider — otherwise deployment breaks. Cadence: rotate on event (offboarding, suspected leak, vendor-forced), not on calendar.
- **The Vercel "sensitive" flag.** Sensitive vars stored unreadably after creation. Backfilling existing vars is a one-time audit step. Cost: a forgotten sensitive var can only be reset, not retrieved — keep a separate password manager for break-glass access.
- **Audit step — canonical leaks.** (1) `process.env.X` outside `env.ts`. (2) `NEXT_PUBLIC_*` matching secret patterns (`SECRET`, `TOKEN`, `KEY` without the `PUBLIC` qualifier). (3) `.env*` in `git log` — history scan; BFG Repo-Cleaner if found. (4) Sentry / PostHog / log drains receiving env-shaped strings (the lesson 2 of chapter 080 redactor catches this).
- **Local dev secrets — password manager.** 1Password / Bitwarden, not Slack. Doppler / Infisical for teams of 3+; Vercel's env UI is sufficient through that point.
- **Pre-commit secret scanning.** Gitleaks / Trufflehog in the `pre-commit` hook. Husky is the standard Git-hook manager and is wired here at first use: `pnpm add -D husky lint-staged`, then `pnpm dlx husky init` to scaffold `.husky/`, then a `.husky/pre-commit` script that runs the Gitleaks / Trufflehog scan on staged files. CI runs the same scan as a belt.
- **KMS / HSM / Vault?** Out of scope through Series A. Vercel's encrypted env store is sufficient.
- **Watch-outs.** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is fine; `NEXT_PUBLIC_STRIPE_SECRET_KEY` is a name-contradiction bug; `console.log(process.env)` in a Server Component dumps every var if the component throws; sharing `.env.local` over Slack is the bug; rotating without updating Vercel first breaks the deployment for the window; `.env.example` drifting from the schema causes silent onboarding failures.

What this lesson does not cover:

- `@t3-oss/env-nextjs` at depth — lesson 2 of chapter 037; lesson 7 of chapter 081 revisits.
- KMS, HSM, Vault, Doppler / Infisical — out of scope or deferred.
- Gitleaks rule-set tuning and CI integration — lesson 4 of chapter 097.

Estimated student time: 35 to 45 minutes.

---

## Lesson 7 — The env schema as single source of truth

The four `@t3-oss/env-nextjs` invariants (typed `env` for every access, server/client split, `.env.example` parity, `SKIP_ENV_VALIDATION` only in legitimate places), the schema-as-documentation read, `NODE_ENV`-conditional production-only vars, and the one-page env audit deliverable.

Topics to cover:

- **The senior question.** lesson 2 of chapter 037 wired `@t3-oss/env-nextjs` — server/client split, Zod-validated, build-time fail-fast. The baseline pass asks: is the discipline still intact, is every new secret going through the schema, is `SKIP_ENV_VALIDATION` used legitimately, is the schema still the single source of truth?
- **Four invariants.** (1) **Every env access through the typed `env` import.** Grep `process.env.X` outside `lib/env.ts`. Exceptions: `process.env.NODE_ENV` and rare framework internals. (2) **Server-only vars in `server`, client-shipped in `client` with `NEXT_PUBLIC_`.** Grep `client.X` in server files (bundle waste); grep `server.X` in client files (build-time throw — the structural defense). (3) **`.env.example` and schema list the same variables.** (4) **`SKIP_ENV_VALIDATION` only in two legitimate places** — the Docker build (no env at build) and the type-check job. Setting it in production env vars is the bug — escape hatch becomes permanent, missing var fails at first request instead of at deploy.
- **The schema as documentation.** `lib/env.ts` is the canonical answer to "what does this app need." Grouped by service (database, auth, billing, email, analytics, observability), each var traceable to one feature. Orphaned variables are findings.
- **Production-only variables.** Branch on `NODE_ENV` — `SENTRY_AUTH_TOKEN`, `STRIPE_WEBHOOK_SECRET` are `z.string().optional()` in dev, `z.string()` in prod.
- **The runtime-environment helper.** Some vars differ per environment (`BETTER_AUTH_URL` is local / preview / prod). A `getAppUrl()` helper reads `VERCEL_URL` for previews, `env.APP_URL` for production, localhost for dev.
- **"No client-bundled secrets" enforcement, restated.** The `server` partition is enforced — importing a server var from a Client Component is a build-time error. Audit step: the build runs without `SKIP_ENV_VALIDATION` and passes.
- **The deliverable — one-page env audit.** Total variables, server/client split, third parties owning which variables, production-only flagged, every `NEXT_PUBLIC_*` verified public-safe.
- **Watch-outs.** `process.env.X` bypassing the schema loses type safety; `NEXT_PUBLIC_*` containing secret-shaped data — the name lies; `SKIP_ENV_VALIDATION=1` in production defeats the system; renaming a var without `.env.example` regresses onboarding.

What this lesson does not cover:

- `@t3-oss/env-nextjs` setup at depth — lesson 2 of chapter 037.
- Vercel env UI — lesson 6 of chapter 081.
- Multi-tenant / per-customer env (white-label) — out of scope.

Estimated student time: 20 to 30 minutes.

---

## Lesson 8 — Supply-chain defaults after Shai-Hulud

The 2026 pnpm 11+ load-bearing defaults (`minimumReleaseAge: 1440`, `blockExoticSubdeps`, `only-built-dependencies` allow-list), `pnpm audit --prod` posture, committed lockfile with CI `--frozen-lockfile`, the three-question "is this maintained" check, Renovate / Socket, and canonical incident defenses.

Topics to cover:

- **The senior question.** 200+ transitive npm deps after `pnpm install`. The 2026 reality (post the spring 2026 OSS incidents — Shai-Hulud, `chalk`/`debug` compromises, weekly typosquats) is that supply-chain attacks are the most likely SaaS breach vector, ahead of XSS, ahead of credential stuffing. The lesson lands the irreducible discipline.
- **The 2026 pnpm 11+ load-bearing defaults.** (1) **`minimumReleaseAge = 1440` (24h).** A version published less than 24 hours ago is refused — the window the typical malicious release is detected and yanked. Keep the default on; critical patches use `pnpm install --ignore-min-release-age` as the deliberate carve-out, audited at PR time. (2) **`blockExoticSubdeps = true`.** Transitive deps as git repos or tarball URLs are blocked — registry-only contract.
- **Post-install scripts — explicit-approval gate.** Malicious packages historically used `postinstall` to exfiltrate creds. pnpm's `dangerouslyAllowAll` is off by default; scripts run only for an allow-list (`only-built-dependencies` in `.npmrc` — typically `@swc/core`, `esbuild`, `sharp`). New additions go through code review.
- **`pnpm audit`.** GHSA database (pnpm switched from CVE to GHSA in 2025–2026). Locally before merges, in CI (lesson 3 of chapter 097). `pnpm audit --prod` filters dev-only deps. `pnpm audit --fix=update` (pnpm 11) updates the lockfile when a non-vulnerable version exists. Posture: zero high-severity in production deps; mediums triaged within a sprint; lows tracked.
- **The "is this maintained" check.** Three questions before adding a dep: (a) last release in the past 6 months? (b) downloads consistent with popularity? (c) maintainer responsive? Unmaintained packages are the typosquat vector — attackers take over abandoned namespaces.
- **The lockfile is the contract.** `pnpm-lock.yaml` committed. Integrity hashes pin each dep to a specific tarball; every CI install verifies. Not committing pulls "whatever's latest" — the Shai-Hulud vector. CI runs `pnpm install --frozen-lockfile` (fails if lockfile and `package.json` are out of sync).
- **Dependabot / Renovate.** Renovate is the 2026 senior default (better grouping and scheduling). Group patch updates weekly; major versions as individual PRs. CI suite gates the merge.
- **Socket / Snyk.** Socket.dev (free for OSS / small teams) scans for malicious-pattern indicators (network calls, fs access, env reads). Threshold: team of 5+ flips the trigger.
- **Canonical incidents.** (a) **Typosquat:** `axois` (typo of `axios`); `postinstall` exfiltrates `.env.local`. Defense: post-install gate off by default + 2026 pnpm's typo prompt. (b) **Maintainer compromise:** npm account taken over via phishing; malicious patch pushed. Defense: 24-hour `minimumReleaseAge` blocks the patch until the community catches it.
- **The deliverable.** Short report: lockfile committed (Y/N), `pnpm audit --prod` clean (Y/N or list), `minimumReleaseAge` / `blockExoticSubdeps` enabled (Y/N), `only-built-dependencies` allow-list contents, Renovate / Dependabot enabled (Y/N), unmaintained packages flagged.
- **Watch-outs.** `pnpm install` without `--frozen-lockfile` in CI lets the lockfile drift; disabling `minimumReleaseAge` to unblock a release turns off the load-bearing defense — per-command flag, never config; `npm install` instead of `pnpm install` regenerates `package-lock.json` and bypasses pnpm config — pin via `packageManager` in `package.json`; Dependabot PRs as autopilot-mergeable loses the senior decision step; `pnpm audit` high-severity ignored "because it's a transitive that doesn't run in prod" — the `--prod` filter exists for that.

What this lesson does not cover:

- CI wiring of `pnpm audit` — lesson 3 of chapter 097.
- Socket / Snyk at depth, Renovate config — named, deferred.
- Internal package signing (Sigstore, cosign) — out of scope.

Estimated student time: 35 to 45 minutes.

---

## Lesson 9 — Quizz

Top 10 topics to quiz:

- The non-negotiable security headers — HSTS, CSP with per-request nonce and `'strict-dynamic'` (no `'unsafe-inline'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling unused features, `frame-ancestors 'none'` plus legacy `X-Frame-Options`; static in `next.config.ts`, dynamic CSP nonce in `proxy.ts`.
- The CSP nonce / static-page trade-off — nonced pages can't be statically prerendered; marketing site uses a nonceless CSP with explicit origins, the app shell uses nonces because it's dynamic anyway.
- The seven abusable-endpoint categories and the three triggers — auth, email-sending, webhook fan-out, expensive public reads, file uploads, write-heavy actions, anonymous endpoints; mandatory limiter when endpoint costs money, can attack a third party, or touches state addressable without auth.
- The audit log's canonical event set — identity, membership/RBAC, billing, privileged data access, configuration, tenant lifecycle; forbidden: reads, failed auth (Sentry instead); transaction-scoped `logAudit(tx, event)`; PII redaction per-event; append-only by RLS + application discipline.
- The GDPR posture — per-table retention catalog driven by a nightly Trigger.dev job (R2 lifecycle for blobs); deletion-on-request as an async job (validate, audit, enqueue, complete); three deletion shapes (hard, soft, anonymize); audit-log anonymization on user deletion.
- The cookie consent gate — essential vs. non-essential; four-state machine; single `useConsent()` source of truth; load-bearing rule that nothing fires pre-consent; PostHog's `opt_out_capturing_by_default` plus dynamic SDK import; three-button banner with equal-weight Accept/Reject.
- Secrets-management rules — never in code; never `NEXT_PUBLIC_*` for secrets; three separate sets across local/preview/production; Vercel "sensitive" flag; rotation on event; update Vercel before invalidating the old credential.
- Env-validation invariants — every access through typed `env`; `server`/`client` split prevents client-bundling; `.env.example` and schema aligned; `SKIP_ENV_VALIDATION` only in legitimate places; production-only vars `NODE_ENV`-conditional.
- 2026 dep hygiene defaults — pnpm 11+ `minimumReleaseAge: 1440`, `blockExoticSubdeps`, `only-built-dependencies` allow-list, `pnpm-lock.yaml` committed, CI `--frozen-lockfile`, `pnpm audit --prod` zero high-severity, the three-question maintained check, Renovate / Dependabot for grouped updates.
- The chapter's audit deliverables — `securityheaders.com` verified, rate-limit coverage matrix, audit-log event catalog, retention catalog, consent-gate reject path tested, one-page env audit, dep hygiene report; collectively the catalog chapter 082 audits against.
