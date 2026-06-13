# Chapter 081 — The security baseline

## Lesson 1 — Security headers

**Taught.** The six-header baseline (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, CSP), why the five static ones ship from `next.config.ts` and CSP from `proxy.ts`, the nonce round-trip through `proxy.ts` → `x-nonce` header → Server Component → browser, `'strict-dynamic'` as the trust multiplier, the Report-Only rollout posture, and the marketing-site nonceless-CSP exception.

**Cut.** Nonce-generation machinery at depth deferred to ch082 starter; CSP violation-report Sentry endpoint wiring deferred to ch092; CI header smoke test deferred to ch097 L3; SRI, full COOP/COEP, and HSTS preload-list submission named but not taught.

**Debts.** CSP violation-report wiring → ch092 (Sentry ingests natively). CI smoke test asserting six headers on every deploy → ch097 L3 (explicitly forward-referenced in verification section).

**Terminology.**
- *Security header* — a rule the browser enforces; the server only declares it (core mental model, referenced by name in exercises).
- *Nonce* — single-use base64-encoded random token per request; canonical idiom: `Buffer.from(crypto.randomUUID()).toString('base64')`.
- *`'strict-dynamic'`* — lets an already-nonced script load further scripts without listing each origin.
- *Downgrade attack / SSL-strip* — attack HSTS prevents.
- *XSS* — attack CSP intercepts at runtime.
- *Clickjacking* — attack `frame-ancestors 'none'` + `X-Frame-Options: DENY` prevent.
- *MIME-sniffing* — attack `X-Content-Type-Options: nosniff` prevents.
- *Prerender* — static build-time render; incompatible with per-request nonces.

**Patterns and best practices.**
- `next.config.ts` `headers()` ships five static headers under `source: '/(.*)'`; HSTS gated on `process.env.NODE_ENV === 'production'` (the one sanctioned `process.env` read outside `env.ts`).
- CSP built per-request in `proxy.ts` (default export); nonce injected into `script-src` and `style-src`; forwarded to app as `x-nonce` request header via `NextResponse.next({ request: { headers } })`; CSP set on response. proxy CSP overrides any `next.config.ts` CSP for matched routes — set CSP in one place only.
- `'unsafe-inline'` in `script-src` defeats the policy entirely — never, not temporarily.
- Marketing pages (static, SEO) use a nonceless CSP with explicit third-party origins instead of nonces.
- Canonical CSP baseline for this stack: `default-src 'self'; script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'; style-src 'self' 'nonce-{NONCE}'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://*.upstash.io https://*.sentry.io https://us.i.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`
- `frame-ancestors 'none'` is a CSP directive (proxy); `X-Frame-Options: DENY` is a standalone header (config) — both ship deliberately as two belts.
- Permissions-Policy: `payment=()` must flip to `payment=(self "https://js.stripe.com")` if Stripe Elements is added.
- Roll out CSP as `Content-Security-Policy-Report-Only` first; never ship both `-Report-Only` and enforce simultaneously.

**Misc.** Lesson frames `proxy.ts` as already-shipped (ch033 L2); student reads the nonce shape for recognition, does not author it from scratch (ch082 starter ships it complete). `connect-src` entries name Upstash, Sentry, PostHog — later lessons adding new third-party `fetch` targets must add entries here. `Referrer-Policy: strict-origin-when-cross-origin` is the chosen value (not `no-referrer`, which breaks analytics attribution). COOP/COEP explicitly excluded from baseline (needed only for `SharedArrayBuffer`).

## Lesson 5 — Nothing fires pre-consent

**Taught.** The essential/non-essential split (strictly-necessary test), consent as two independent boolean flags (`analytics`, `marketing`) yielding four named states, the `ConsentProvider`/`useConsent()` single-source-of-truth, the two-belt pre-consent gate (SDK opted-out by default + dynamic import only after consent), equal-weight Accept/Reject/Manage banner anatomy, the `consent.recorded` audit entry with policy version, and the cookie-consent vs. marketing-email-consent boundary.

**Cut.** Chapter outline named the audit event as `consent.updated` — lesson corrects this to `consent.recorded` (honoring the `entity.verb-pasttense` convention from L3); later lessons must use `consent.recorded`. The chapter outline's mention of reading `consent_choice` "client-side via `document.cookie`" was omitted — the lesson's pattern is server-read via `await cookies()` + hydration via an `initial` prop (cookie is the no-flash mechanism). Essential-cookie `SameSite=Strict` footnote from the outline was dropped (Better Auth's `Lax` default is the canonical setting).

**Debts.** PostHog SDK wiring at depth → ch093 (only the gate-shape calls were shown here: `opt_out_capturing_by_default`, `cookieless_mode: 'on_reject'`, `disable_session_recording`, `defaults`, `opt_in_capturing()`, `opt_out_capturing()`, `reset()`). `formatAuditEvent` for the `consent.recorded` event → ch084. The complete `ConsentProvider`/`useConsent()` implementation ships in ch082's starter, not authored in this lesson.

**Terminology.**
- *ePrivacy Directive* — the EU "cookie law" (distinct from GDPR); governs storage/access on the user's device; why a banner is mandatory.
- *Prior consent* — consent must come before any processing, not after; a tracker that fires then asks has already violated the rule.
- *Strictly necessary* — the exact ePrivacy phrase for the essential-cookie exemption; the service genuinely breaks without it, from the user's perspective.
- *Granular consent* — per-category choice (`analytics`, `marketing`) rather than all-or-nothing; regulators require the option.
- *`consent_choice` cookie* — server-readable cookie (≤13 months) storing the two flags; the sole authority on consent state; not localStorage.
- *`ConsentProvider` / `useConsent()`* — the single React Context gate; returns `{ analytics: boolean; marketing: boolean; open: () => void; accept: (level: ConsentLevel) => Promise<void>; reject: () => Promise<void> }`; every tracker reads only this hook.
- *Two-belt rule* — belt one: SDK initialized with `opt_out_capturing_by_default: true`; belt two: dynamic `import('./analytics')` called only after the flag flips on. Both required; either alone leaves a gap.
- *Dark pattern* — UI asymmetry where Accept is more prominent than Reject; CNIL/EDPB have fined this; treated as a compliance bug, not a design preference.
- *CNIL / EDPB* — French DPA and the European Data Protection Board; regulators that set and enforce EU consent rules.
- *`consent.recorded`* — canonical audit action for consent decisions (not `consent.updated`); follows `entity.verb-pasttense` convention.
- *Policy version (`CONSENT_POLICY_VERSION`)* — stored in the audit payload; bumping it invalidates prior consent records and re-shows the banner.
- *Transactional email* — email triggered by a user action (password reset, receipt, security alert); needs no marketing consent because it is the requested service.
- *Dynamic import* — `import()` call that code-splits and loads the module only when invoked; the mechanism behind belt two.
- *Data controller* — the entity that decides why/how personal data is processed and must be able to demonstrate consent to regulators.

**Patterns and best practices.**
- `useConsent()` is the only place in the codebase that may gate analytics/marketing initialization; grep for any analytics/marketing init not behind this hook as the audit invariant.
- `ConsentProvider` mounts inside the existing root `<Providers>` Client Component (from ch076); no competing root provider.
- Initial consent state is passed as a prop from a Server Component that read `consent_choice` via `await cookies()`, so the provider hydrates in the correct state on first paint with no flash.
- The `saveConsent` Server Action writes the `consent_choice` cookie server-side and calls `logAudit(tx, { action: 'consent.recorded', ... })` in the same transaction.
- `unset` state and explicit reject are behaviorally identical — both flags off, no non-essential SDK loaded; "absence of yes = no" is the rule.
- Reject must call `posthog.opt_out_capturing()` + `posthog.reset()` to discard already-queued events; without `reset()` the buffer drains for ~30s post-revocation.
- Banner is a non-modal sticky footer (never a full-page wall); three buttons at visually equal weight.
- Marketing-email consent is a separate `marketingEmailConsent` boolean column on `users` (default `false`), flipped only by the sign-up checkbox or account-settings toggle; never written by the cookie consent flow.

**Misc.** PostHog's `connect-src` origin (`https://us.i.posthog.com`) is already in the CSP baseline from L1; the consent lesson does not re-open CSP. The lesson explicitly scopes out CCPA "Do Not Sell or Share" (separate US-California footer link) and consent management platforms (OneTrust, Cookiebot, Osano) as named-only alternatives. Revoking consent ≠ deleting data — the lesson states this boundary in one sentence and defers right-to-erasure to L4. `NEXT_PUBLIC_POSTHOG_KEY` is a client-safe publishable key; env discipline (including its schema entry) is L6/L7's job. `useConsent()` uses React 19's `use(ConsentContext)` API, not `useContext` — later lessons showing the hook should match this form. The pre-consent timeline is rendered by a custom `PreConsentTimeline` Astro component (not a generic `DiagramSequence`); the outline's `DiagramSequence` suggestion was replaced. The complete `ConsentProvider`/`saveConsent` implementation ships in the ch082 starter; the lesson shows it read-to-understand via `AnnotatedCode` only.

---

## Lesson 7 — The env schema as single source of truth

**Taught.** Four `@t3-oss/env-nextjs` invariants (all access through typed `env`, server/client split as a structural firewall, schema/`.env.example` parity, `SKIP_ENV_VALIDATION` only in two sanctioned places), the schema-as-documentation read over the full accumulated variable set, `NODE_ENV`-conditional production-only vars, the `getAppUrl()` per-environment URL helper, and a five-item env audit Checklist as the lesson deliverable.

**Cut.** The chapter outline described the deliverable as a "total-variables count, third-parties, production-only flagged" report; the lesson replaced this with the `<Checklist id="env-audit">` component. `lib/env.ts` referenced in the chapter outline was not used — the canonical path is `src/env.ts` imported as `@/env` (per L6 continuity note). CI automation of `.env.example` parity check mentioned as "the second belt, wired in CI later in the course" but no specific chapter cited. `STRIPE_WEBHOOK_SECRET` and `EMAIL_REPLY_TO` appear in the lesson outline's variable list but are absent from the annotated schema shown in the lesson (the schema example uses `STRIPE_SECRET_KEY` and `EMAIL_FROM` only).

**Debts.** CI integration of `.env.example`/schema parity check → ch097 (forward-referenced in Invariant 3 prose as "wired into CI later in the course"). `SKIP_ENV_VALIDATION` in a type-check CI job → ch097 (named as one of the two sanctioned uses but not wired). Per-customer/white-label env resolution named as out of scope for the course's current stage.

**Terminology.**
- *Four jobs of `env.ts`* — runtime gate (build fails on missing var), type boundary (`env.X` is `string` never `undefined`), secret/client firewall (server block import from Client Component is a build error), and documentation (canonical answer to "what does this app need").
- *`SKIP_ENV_VALIDATION`* — build-time escape hatch that disables `createEnv` entirely; when set, Zod `.default()` values also do not apply; exactly two sanctioned uses: Docker/container image build (secrets injected at runtime) and type-check/lint CI job.
- *`getAppUrl()` helper* — a `/lib` function that resolves the app base URL per environment: production reads `env.NEXT_PUBLIC_APP_URL`, previews prepend `https://` to Vercel's injected `VERCEL_URL` (bare host — no scheme), local falls back to `http://localhost:3000`; the one place this branching lives. Only `VERCEL_URL` is read in the helper (not `VERCEL_PROJECT_PRODUCTION_URL`).
- *Dead config* — a variable declared in the schema that no code reads; a documentation lie that requires deletion, not a default.

**Patterns and best practices.**
- Every env access is `import { env } from '@/env'` → `env.X`; grep `process.env` across the repo — every hit outside `src/env.ts` is a finding. Sanctioned exceptions: `process.env.NODE_ENV` (used for build-time branching, including inside `src/env.ts` itself) and Vercel-injected vars inside `getAppUrl()` only.
- `import 'server-only'` at the top of every server-only module (DB client, secret-bearing SDK, email sender) is the structural second belt — turns a leaked client import into a build error before the env package fires.
- Production-only vars use the `NODE_ENV` ternary inside `createEnv`: `isProd ? z.string().min(1) : z.string().optional()`. Canonical examples: `SENTRY_AUTH_TOKEN`, `STRIPE_WEBHOOK_SECRET`.
- Zod 4 top-level builders only: `z.url()`, `z.string().min(1)`, `z.email()`. No deprecated `.string().url()` chains.
- `VERCEL_URL` is injected by Vercel without the `https://` scheme — the `getAppUrl()` helper must prepend it; forgetting is the classic broken-link bug.
- An orphaned schema variable (in schema but not read by any code) is a deletion, not a default; dead config makes the documentation lie.
- If the build reports a missing variable, set the variable — never silence with `SKIP_ENV_VALIDATION=1` in production.

**Misc.** Canonical env file path is `src/env.ts` imported as `@/env` — do not use `lib/env.ts` in any later lesson or sample. The `env.NEXT_PUBLIC_APP_URL` variable is confirmed as the production URL source (consistent with ch058/ch064 invite + checkout links — `getAppUrl()` reads it, not a separate `APP_URL`). The five-item env audit Checklist (`id="env-audit"`) is the L7 deliverable feeding into ch082's audit pass alongside L1 (header check), L2 (rate-limit matrix), L3 (audit-event catalog), L4 (retention catalog), L5 (consent reject-path test), and L6 (leak audit).

---

## Lesson 8 — Supply-chain defaults after Shai-Hulud

**Taught.** The supply-chain threat model (transitive dep count, Shai-Hulud worm, typosquat/maintainer-compromise kill chain), four structural controls — `minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, `allowBuilds` map with `strictDepBuilds: true`, committed lockfile + CI `--frozen-lockfile` — plus `pnpm audit --prod` posture, the three-question maintained check, and Renovate as the update loop; delivered as a nine-item dep-hygiene Checklist.

**Cut.** Chapter outline described `minimumReleaseAge` bypass as "per-command flag (`--ignore-min-release-age`)" — this is stale; pnpm 11 has no such flag. The correct escape hatch is a scoped `minimumReleaseAgeExclude` entry in `pnpm-workspace.yaml`. Chapter outline referenced `only-built-dependencies` (the pnpm 10 form) — lesson teaches `allowBuilds` (the pnpm 11 map), which replaces it entirely. Chapter outline placed all supply-chain settings in `.npmrc` — lesson corrects this: pnpm 11 reads these from `pnpm-workspace.yaml`; `.npmrc` is auth/registry only. `pnpm audit --fix=update` (chapter outline form) was simplified to `pnpm audit --fix`. Socket / Snyk named with a team-size threshold (~5+) only, not wired. CI wiring of `pnpm audit` as a blocking gate explicitly deferred to ch097 L3.

**Debts.** CI wiring of `pnpm audit` as a blocking release gate → ch097 L3 (explicitly forward-referenced in the audit section). CI wiring of `--frozen-lockfile` and Gitleaks → ch097 L4 (referenced in scope). Socket / Snyk behavioral scanning → named with threshold, not configured (team of ~5+ trigger).

**Terminology.**
- *Shai-Hulud* — self-replicating npm worm, first disclosed Sept 2025; spread by re-publishing itself through compromised maintainer tokens; named for the Dune sandworm.
- *Transitive dependency* — a package a direct dependency depends on; source of the 200+ node_modules count.
- *Typosquatting* — publishing a package whose name is a near-miss of a popular one, to catch typos and AI agent hallucinations.
- *`postinstall` script / lifecycle script* — `preinstall` / `install` / `postinstall`; npm scripts that run automatically at install phases with full machine access and no sandbox.
- *Exfiltration* — covertly shipping stolen data (secrets, tokens) off the machine.
- *Exotic dependency* — a dep resolved from a git repo or tarball URL rather than a package registry.
- *Integrity hash* — a cryptographic digest of a package's exact tarball; install rejects any tarball whose bytes don't match.
- *`--frozen-lockfile`* — install mode that fails rather than updating the lockfile; the CI-correct mode.
- *`minimumReleaseAge: 1440`* — pnpm 11 default (on by default); refuses any version published less than 24 hours ago.
- *`minimumReleaseAgeExclude`* — the only sanctioned bypass: a scoped per-package list in `pnpm-workspace.yaml`, committed and reviewed; never `minimumReleaseAge: 0`.
- *`blockExoticSubdeps: true`* — pnpm 11 default; enforces registry-only contract for the whole transitive tree.
- *`allowBuilds`* — pnpm 11 map (package → boolean) replacing the removed `onlyBuiltDependencies` array; `true` permits build scripts, `false` explicitly denies.
- *`strictDepBuilds: true`* — pnpm 11 default; fails the install when any dep has unreviewed build scripts not in `allowBuilds`.
- *GHSA* — GitHub Security Advisory database; what `pnpm audit` keys against (pnpm moved from CVE-keyed to GHSA-keyed in 2025–26).
- *Renovate* — bot that opens dependency-update PRs with grouping and scheduling rules; preferred over Dependabot in 2026.
- *Attack surface* — every entry point an attacker could exploit; each dependency widens it.

**Patterns and best practices.**
- Supply-chain settings live in `pnpm-workspace.yaml`, not `.npmrc`. `.npmrc` is auth/registry only. Any snippet placing `minimumReleaseAge` or `blockExoticSubdeps` in `.npmrc` is the stale pnpm 10 shape.
- `minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, and `strictDepBuilds: true` are pnpm 11 defaults — the senior move is keeping them on, not adding them.
- The only sanctioned bypass for the 24h quarantine is a named `minimumReleaseAgeExclude` entry for the one package, in the same PR, reverted when the patch ages out. Never `minimumReleaseAge: 0`.
- Adding a package to `allowBuilds: true` is a code-review decision — it grants that package the right to run arbitrary code on every developer machine and in CI. Every `true` entry requires a real native build step justification.
- `pnpm-lock.yaml` is committed and CI runs `pnpm install --frozen-lockfile`. `packageManager` is pinned in `package.json` + `only-allow pnpm` in `preinstall` so a stray `npm install` cannot regenerate a `package-lock.json`.
- `pnpm audit --prod` posture: zero high-severity in production deps as a release gate; mediums triaged within a sprint; lows tracked. CI enforcement → ch097 L3.
- Renovate PRs are gated by the full CI suite (tests + `pnpm audit` + `--frozen-lockfile`) and never auto-merged blindly.
- The three-question maintained check before `pnpm add`: last release ≤ 6 months, download numbers consistent with reputation, maintainer responsive.

**Misc.** The dep-hygiene `<Checklist id="dep-hygiene">` (nine items, with `chip="untested"` on manual-inspection items) is the L8 deliverable — the eighth and final entry in the chapter's audit catalog that ch082 audits against. The full catalog: L1 (header check), L2 (rate-limit coverage matrix), L3 (audit-event catalog), L4 (retention catalog), L5 (consent reject-path test), L6 (leak audit), L7 (env audit), L8 (dep-hygiene report). The `pnpm audit --fix` detail that pnpm 11 auto-adds advisory minimum patched versions to `minimumReleaseAgeExclude` is taught as a "the two controls close the loop" aside. The chapter-outline mention of `lib/env.ts` and `.npmrc` in the dep-hygiene chapter framing summary is stale; lesson 8 corrects both. Do not use `onlyBuiltDependencies` or `.npmrc`-placed supply-chain settings in any ch082 or later starter code. A `VideoCallout` for Fireship's chalk/debug breakdown was added (the outline recommended against a video; the build included one). The Buckets exercise uses three buckets — "Add it", "Investigate first", "Avoid" — rather than the two-column "Add vs Investigate/Avoid" split the outline specified; the three-bucket shape is what shipped.

---

## Lesson 6 — Where secrets live and how they rotate

**Taught.** Five secrets rules (never in source, never in the client bundle, platform secret store with sensitive flag, three-environment isolation, rotation on events with Vercel-before-provider order), `.env.example` discipline, Husky + Gitleaks pre-commit scanning, and a four-check leak audit as the lesson deliverable.

**Cut.** Chapter outline mentioned `lint-staged` alongside Husky — lesson installs Husky alone (`pnpm add -D husky`, not `lint-staged`). `console.log(process.env)` in a Server Component as a secondary leak vector is in the chapter outline but not called out in the lesson. Third-party integration variables that bypass `vercel env add` defaults are mentioned (Sentry integration example) but not listed exhaustively. `.env.example` parity enforcement in CI named as the next lesson's job (L7).

**Debts.** `@t3-oss/env-nextjs` internals, four invariants, `SKIP_ENV_VALIDATION`, `NODE_ENV`-conditional vars, `getAppUrl()` helper → L7. CI integration of Gitleaks, rule-set tuning → ch097 L4 (explicitly forward-referenced as "the second belt"). `.env.example`/schema parity check in CI → L7.

**Terminology.**
- *High-entropy string* — a value with no discernible pattern; a secret scanner flags it by measuring Shannon entropy, not by recognizing a known prefix.
- *Publishable key* — a public-by-design API key that only identifies the account at a third party, grants no privileged access; safe as `NEXT_PUBLIC_`.
- *DSN* — Sentry's public ingest URL; identifies the project and accepts error events, grants no read access; safe as `NEXT_PUBLIC_`.
- *Sensitive flag* — Vercel write-only env var flag; once set the value cannot be read back, only overwritten.
- *Break-glass copy* — emergency-only credential stored in a password manager, used only when the primary store cannot return the value.
- *Preview deployment* — per-branch/per-PR Vercel deploy; ephemeral, numerous, less guarded than production; must never hold production keys.
- *Rotation* — replacing a live credential with a fresh one and invalidating the old; shrinks blast radius of any past exposure.
- *Runbook* — checked-in, step-by-step operational procedure a teammate can follow under pressure without prior context.
- *Pre-commit hook* — a script Git runs before finalizing a commit; exits non-zero to abort the commit.
- *Husky* — the standard tool for managing Git hooks in a JS project, keeping them versioned in-repo; auto-installs on `pnpm install` via a `prepare` script.

**Patterns and best practices.**
- The only correct shape for reading a secret in code is `import { env } from '@/env'` → `env.STRIPE_SECRET_KEY`; no `process.env.X` outside `env.ts` (exception: `process.env.NODE_ENV`).
- `import 'server-only'` at the top of any server-only module turns a leaked client import into a build error.
- `NEXT_PUBLIC_` is a public promise — any `NEXT_PUBLIC_*` name containing `SECRET`, `TOKEN`, or `KEY` without a legitimate public justification is a breach; judge by authority granted, not by which vendor issued it.
- Vercel `vercel env add` defaults to sensitive for production and preview; audit variables created before that default or by third-party integrations (which may not set the flag).
- Rotation order: generate new at provider → add to Vercel with sensitive flag → redeploy and verify → revoke old at provider → update `.env.local` and runbook. Revoke-before-deploy is the self-inflicted outage pattern.
- `.env.example` is committed; `.env.local` is gitignored; every variable in the schema has a placeholder + `# source:` comment in `.env.example`; both lists must stay in lockstep (parity enforced by L7/CI).
- Pre-commit hook: `gitleaks protect --staged` (not `detect`; staged-only is sub-second and correct for hooks).
- Leak audit checklist: (1) grep `process.env` outside `env.ts`; (2) grep `NEXT_PUBLIC_` for secret-shaped names; (3) history-scan for committed `.env*` files — if found, rotate + BFG Repo-Cleaner; (4) confirm secrets aren't reaching Sentry/PostHog/log drains (ch080 L2 redactor).
- KMS/Vault are out of scope through Series A; Vercel encrypted store + sensitive flag + three environments + commit-time scanner is the correct baseline.

**Misc.** The `env.ts` file lives at the **project root** (not `lib/env.ts`); later lessons must use this path. The only sanctioned `process.env` access outside `env.ts` is `process.env.NODE_ENV`. Husky is introduced here for the first time in the course; ch097 L4 owns CI Gitleaks and rule-set tuning. The four leak-audit checks are the L6 deliverable feeding into ch082's audit pass.

---

## Lesson 4 — Retention and the right to be forgotten

**Taught.** The two GDPR obligations (retention = data minimization via a scheduled sweep; erasure = deletion-on-request as an async, idempotent, checkpointed job), resolved through a declarative per-table catalog in `lib/retention.ts` that drives both jobs; the three deletion shapes (hard/soft/anonymize); the deletion-job data-graph walk (6 ordered stages); the no-real-PII-in-non-prod rule with a CI seed-guard; and legal-retention carve-outs (anonymize-and-keep, not delete).

**Cut.** The data-export / portability right (GDPR Art. 20) named-only, deferred to ch067/069. Notification-dispatcher mechanics for the inactive-account 60-day warning email and the deletion-confirmation email named-only, deferred to ch070. Backup-purge and replica-catch-up mechanics named as "eventually consistent" in one sentence, implementation deferred to infrastructure. Right-to-rectification excluded entirely. External-vendor SDK specifics (Stripe/Resend/PostHog deletion APIs) named as steps, not taught at depth.

**Debts.** `formatAuditEvent` implementation and i18n of audit-event strings → ch084. Cookie/marketing consent (L5 of this chapter) is kept cleanly separate — do not introduce consent concepts in L4 and do not re-introduce retention/erasure in L5.

**Terminology.**
- *GDPR / CCPA / LGPD* — named once as the "why"; body stays engineering-shaped.
- *Right to erasure / right to be forgotten* — GDPR Art. 17; legal clock is "without undue delay, and in any case within one month" (one month, not "30 days").
- *Data minimization* — GDPR principle behind automated retention limits.
- *PII* — personally identifiable information; the data class both rights govern.
- *`lib/retention.ts`* — the single-source-of-truth retention catalog: `{ table, cutoffColumn, ttl: Temporal.Duration, shape: DeletionShape }[]` as `as const satisfies`.
- *`DeletionShape`* — `'hard' | 'soft' | 'anonymize'`; declared per table in the catalog, never improvised at a call site.
- *Hard delete* — row removed; for self-owned PII with no legal/shared value.
- *Soft delete* — `deletedAt` set, hidden by ch061 visibility helpers; a visibility tool only, not an erasure tool; must be paired with anonymize when the row holds PII.
- *Anonymize* — row stays, PII columns nulled or stable-hashed; the shape for audit logs (L3's resolution) and shared artifacts.
- *`deletion_in_progress`* — status flag set on the user row at request time, co-committed with the enqueue in the same transaction; blocks sign-in for the entire job run.
- *Subprocessor list* — roster of every outside company that holds users' data (Stripe, Resend, PostHog, Upstash, Sentry, Vercel, R2); an engineering deliverable, not the legal team's; the checklist the deletion job must cover.
- *Synthetic seed domain* — `@example.com` / `@example.test`; CI check fails the build if any seed email is not under a reserved domain.

**Patterns and best practices.**
- Catalog-drives-the-job: the retention sweep and the deletion job both walk `RETENTION_POLICIES`; neither hard-codes a table name. Adding a new PII-bearing table = new catalog row, not a job edit.
- Retention sweep is a Trigger.dev `schedules.task`, cron UTC, daily; idempotent (re-run deletes nothing extra); logs per-class counts to operator logs; no `logAudit` call (untriggered background job, per L3's `system.*` rule).
- Any tenant-scoped class on a shared table must filter by tenant in the delete predicate — missing filter is cross-tenant data loss, not a leak.
- Delegate blob expiry to the storage layer's native lifecycle rules (R2); the sweep only deletes the Postgres metadata row.
- Deletion-on-request is always async: thin `authedAction` validates + audits + enqueues; the Trigger.dev `schemaTask` does all table/vendor work.
- Flag-set and enqueue co-commit in one transaction — the "flagged but never deleted" bug is structurally prevented.
- Deletion job fails closed: irrecoverable vendor failure → alert operator + honest user status; never silently mark complete with PII still at a vendor.
- `account.deletion-requested` is audited (user-attributable privileged action, per L3 inclusion test). `account.deletion-completed` written with `{ tablesPurged, externalsPurged, durationMs }` summary payload.
- Legally retained records (invoices, financial data ~7y) are anonymized and kept, not deleted; completion email is honest about which categories were retained and why.

**Misc.** L4's output artifact (retention catalog + deletion-shape map) is one of the four deliverables ch082 audits a seeded codebase against, alongside L1 (headers), L2 (rate-limit matrix), and L3 (audit-event catalog). The `Temporal.Duration` TTL convention is already established; do not use raw milliseconds in any retention-related code in later lessons. The `auditLogs:identity` (2y) and `auditLogs:billing` (7y) retention rows in the catalog close the promissory note from L3's Retention column — later lessons must not re-open this.

---

## Lesson 3 — The audit log policy

**Taught.** Four policy frameworks for the audit log: the inclusion test (user-attributable + security/trust-relevant + state change, not a read), the forbidden set (reads, failed auth, untriggered background jobs) with where-each-goes-instead, the per-entry field contract and payload-shaping rule (forensic diff only, not a request dump), and the three-audience read model; plus anonymize-don't-delete as the GDPR resolution; delivered as a judgment/policy lesson with classification exercises, not a build.

**Cut.** `actorType` enum column dropped — the chapter outline listed it but ch057 L5 ships `actorUserId` nullable (null = system); the four conceptual actor kinds are a taxonomy only, expressed via nullable actor + `action` prefix. The chapter outline's `member.role.changed`-style three-segment names were corrected to `member.role-changed` (ch057 form).  `audit.exported` event and the Activity-page Server Component named but not built (ch057 L5 scoped them out). Compliance-officer CSV export named only. `formatAuditEvent` helper named as the seam, not implemented.

**Debts.** Retention timers (identity 2y, billing 7y, privileged-access 7y) are named in the catalog's Retention column but owned by L4. Deletion-job mechanics, the three deletion shapes (hard/soft/anonymize), third-party deletion calls → L4. `formatAuditEvent` implementation and i18n of rendered strings → ch084. Sentry capture of failed-auth / cross-tenant events → ch080 L2/L3 (pre-existing). CSP violation-report endpoint → ch092. Activity-page Server Component → ch057 L5 (named-not-built, carry-forward).

**Terminology.**
- *Inclusion test* — 3-part gate: attributable to a human AND security/trust-relevant AND a state change not a read; one-liner: "Privileged human verbs, not reads, not CRUD ticks."
- *Six audit categories* — Identity, Membership/RBAC, Billing, Privileged data access, Configuration, Tenant lifecycle; catalog is a closed set: new privileged action class → new catalog row.
- *`entity.verb-pasttense`* — canonical event naming convention (single dot, hyphenated past-tense verb): `member.role-changed`, not `member.role.changed` or `changeRole`.
- *`AuditEvent` type* — caller passes only `{ action, subjectType?, subjectId?, payload? }`; `logAudit` derives actor/org/ip/ua/createdAt itself — caller cannot supply actor or timestamp.
- *Payload as forensic diff* — state changes carry `{ before, after }` of only the changed fields; action events carry operation args; events where the fact is the whole record carry `{}`. Never raw request or full row.
- *Three protections, three artifacts* — "redact the operator log; minimize the audit payload; protect the table with RLS" — they do not substitute for each other.
- *Anonymize, don't delete* — GDPR right-to-erasure resolution: `actorUserId` nulled via FK `onDelete: 'set null'`, payload PII scrubbed by owner-role path; forensic fact survives, identity is severed.
- *`admin.audit-log-queried`* — cross-tenant operator read of the audit log is itself an audit event; reading the log is a privileged action.
- *`formatAuditEvent(event)`* — the stable seam between stored row shape and the human-readable Activity feed string; UI renders through this, never from raw `payload`.
- *One sanctioned write exception* — privileged owner-role DB connection (`DATABASE_URL_OWNER`) can UPDATE/DELETE audit rows for retention/legal retraction; never reachable from a Server Action.
- *`system.*` action prefix* — audit rows written by jobs on a user's behalf carry `actorUserId: null` and a `system.` prefixed action; untriggered sweeps are not audited at all.

**Patterns and best practices.**
- Audit the log's own access: cross-tenant operator reads write `admin.audit-log-queried`; every privileged action — including reading the most sensitive table — earns a row.
- Minimize at write time as the only reliable PII defense in an append-only table; the pino/Sentry redactor is a separate artifact and does not wrap `logAudit`.
- Grep for `auditLogs` outside `logAudit`, migrations, and read paths — any hit is either a legitimate read or a bug.
- The deliverable catalog (category | action | subjectType | payload shape | retention class) is a two-way contract: privileged action with no catalog row = missing audit; catalog row with no code = dead policy. Both are findings for ch082.

**Misc.** Ch082 audits a seeded codebase against the event catalog from this lesson; catalog must be complete (with retention column forward-referencing L4) before ch082 is authored. The `withTenant(orgId, fn)` transaction wrapper is the co-commit mechanism; `logAudit(tx, event)` takes `tx` first — the type signature is the enforcement. Do not introduce `actorType` column or `logAudit(db, ...)` call shape in any later sample.

## Lesson 2 — The abusable-endpoint matrix

**Taught.** The three triggers that make a rate limiter mandatory (costs money, can attack a third party, touches unauthenticated state), the seven abusable-endpoint categories with per-category key strategies, the two grep-able invariants (`safeLimit` seam + module-scope `lib/rate-limit.ts`), the generic 429 body rule, CAPTCHA as the per-IP escalation, and the coverage matrix as the audit deliverable.

**Cut.** WAF/edge rate-limiting rules, Turnstile wiring, CI lint enforcement of the `safeLimit` invariant (→ ch097), and per-endpoint budget tuning methodology beyond the one-line 99th-percentile watch-out — all named-only or deferred.

**Debts.** CI lint rule enforcing `limit(` only inside `safeLimit` → ch097 L4 (explicitly forward-referenced). `safeLimit` implementation internals owned by ch080 L3 (referenced, not re-taught). Coverage matrix is the artifact ch082 consumes.

**Terminology.**
- *Three triggers* — (a) costs money per call, (b) can attack a third party, (c) touches state addressable without auth; any one makes a dedicated limiter mandatory.
- *Seven categories* — auth flows, email-sending paths, webhook fan-out, expensive public reads, file uploads, write-heavy shared actions, anonymous endpoints.
- *Fan-out* — downstream work (emails, jobs) a single verified inbound event triggers; distinct from the (verified) receiver.
- *Relay* — your server makes the email/outbound request on the attacker's behalf, wearing your reputation.
- *Inbox bombing* — flooding a victim's inbox via an open send endpoint.
- *Credential stuffing* — replaying leaked credential pairs against unauthenticated endpoints.
- *NAT* — many devices behind one public IP; per-IP limits risk tripping whole offices.
- *Coverage matrix* — five-column table (endpoint/category, file path, limiter prefix, key strategy, covered Y/N); every N is a ticket.
- *CAPTCHA / Cloudflare Turnstile* — the next gate when distributed botnets defeat per-IP limits on public endpoints; named, not wired.

**Patterns and best practices.**
- Every `limit(` call goes through `safeLimit(limiter, key)`; grep for bare `limit(` to find coverage gaps.
- Every limiter declared at module scope in `lib/rate-limit.ts` with a distinct `prefix` and `analytics: true`; the file is the audit catalog.
- Auth, email-sending, and file uploads each use two limiters (both must pass) — dual-window is a recurring shape, not a special case.
- The 429 body is generic and identical across all limiters and keys; structured operator log carries which limiter/key/remaining/reset.
- Standard rate-limit headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`) projected directly from `limit()` return fields — never hand-computed. IETF draft is converging on a combined `RateLimit` + `RateLimit-Policy` form but the three-field form is still the 2026 standard.
- Authenticated endpoints failing all three triggers get the wrapper's coarse per-user default only — no dedicated limiter.
- Budget ceiling: ~99th percentile of legitimate use (trips attacks, not real users).

**Misc.** `safeLimit` fail policy: fail-open on Redis/transport errors (allow + log + alert); fail-closed only on genuine quota exhaustion — policy owned by ch080 L3, referenced here for the grep invariant only. Webhook fan-out is the category beginners miss ("the receiver is already verified" feels complete). Key-scope principle: smallest scope that contains the abuse without tripping legitimate users — too broad trips NAT, too narrow lets rotating attackers through.
