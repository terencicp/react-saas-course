# Course gap review — teaching lessons, chapters 001–070

Date: 2026-06-11. Scope: all 296 teaching lessons across 59 teaching chapters (project chapters and quizzes excluded). Method: every lesson summarized, coverage mapped against the full 108-chapter plan in `Units.md` and the Table of contents, suspected gaps verified by direct reads of the MDX. Topics planned for unwritten units 14–22 were treated as covered.

## Verdict

Coverage is strong and internally coherent. No foundational topic essential to the 2026 SaaS stack is wholly missing once planned units 14–22 are counted. The course is notably good at *naming its carve-outs* (WebSockets, Stripe Tax, proration, image transformation all get explicit "out of scope, here's the trigger" treatment) — the findings below are mostly places where that discipline lapsed: topics the course itself motivates but never lands, and never names as out of scope.

| # | Finding | Severity | Patch size |
|---|---------|----------|------------|
| 1 | Machine-caller API authentication (API keys) never taught | High | 1 new lesson |
| 2 | Per-seat / usage-based billing not even named as carve-out | Moderate | ~10-line carve-out |
| 3 | Browser step-debugging never taught; first debugger contact is unit 19, server-side | Moderate | Extend 010/3 |
| 4 | Backup/restore is a checklist row, never a demonstrated skill | Moderate | ~15-line section in 036/3 |
| 5–9 | SSRF, SAML/SSO, impersonation, CSV import, JSON-LD | Minor | One-liner carve-outs |

## High priority

### 1. Machine-caller API authentication

The course motivates route handlers with external callers — 046/1 names the mobile app, the partner backend, and the CLI as three of the five triggers that "flip the choice" past Server Actions, 046/3 operationalizes the `Idempotency-Key` header for API clients, and 046/4 ships a public list endpoint with an opaque-cursor contract. But every identity path taught is the session cookie. 057/3 ("The authedRoute twin") explicitly defers the alternative:

> "`Authorization: Bearer <token>` is a *different* identity model (for machine-to-machine callers with no cookie), and it's not built in this chapter."

It's not built in any chapter — the full 108-chapter TOC has no landing spot. Every API-key mention in the course is provider-side (Resend, Stripe, R2 keys you consume), and unit 22's per-user token quotas are session-based. A student who builds the partner-facing endpoint the course told them route handlers exist for has no way to authenticate its caller.

**Patch.** One lesson, natural home: chapter 057, directly after "The authedRoute twin" (the wrapper it extends), or appended to chapter 046. Content: hashed API keys in Postgres (public key-id + SHA-256 of the secret, raw secret shown once — the same posture as 058's invitation `tokenHash`), org-scoped rows reusing `roleAtLeast`, `last_used_at`, revocation, and a second identity branch in `authedRoute` that resolves `Authorization: Bearer` to the same `ctx` shape. Name rate limiting as Unit 14's hook. Hand-rolling matches the course's existing token-hashing pattern; alternatively evaluate Better Auth's `api-key` plugin against the chapter's own "consume libraries directly" rule. Update the chapter outline and TOC accordingly.

## Moderate

### 2. Per-seat and usage-based billing

Chapter 064 carves out Stripe Tax by name ("the compliance details are beyond this course") and proration ("trust Stripe; never recompute"), but quantity-based subscriptions never appear — every Checkout snippet hardcodes `quantity: 1`. Meanwhile the org model is seat-centric: chapter 058 is literally "the seat-handoff lifecycle." Per-seat pricing is the most common B2B SaaS billing model; a student will hit this within weeks of shipping and currently gets neither a lesson nor a pointer.

**Patch.** A named carve-out (~10 lines) in 064/1 (the object graph already introduces the subscription item where `quantity` lives) or 064/4: define per-seat (quantity synced on member add/remove — a Server Action updates the subscription item, the webhook projects the result into `plan_entitlements`) and usage-based (usage records) as variants, and show where each hooks into the existing webhook→entitlement pipeline. No new lesson required.

### 3. Browser step-debugging

010/3 teaches four DevTools panels (Elements, Network, Console, Application) and installs React DevTools — but the Sources panel, breakpoints, and the `debugger` statement appear nowhere. The course's first breakpoint contact is the planned unit 19 lesson "Server-side debugging with the inspector" (`next dev --inspect` + VS Code), roughly 85 chapters in. For this audience that means console.log-only debugging through the entire JS, React, and data-layer arc.

**Patch.** Extend 010/3 with a fifth section (or a sibling mini-lesson): Sources panel breakpoints, step over/into, watch expressions, the `debugger` statement, and conditional breakpoints. Cross-link from the unit 19 server-side lesson so the two form a pair (client first, server later).

### 4. Backup and restore

036/3 teaches branching and the point-in-time concept well, and "tested backups" appears as one row in the unit 16 launch checklist — but no lesson ever demonstrates a restore. Recovery is a skill, not a checklist row, and on Neon it's cheap to teach.

**Patch.** ~15 lines in 036/3: restore-by-branching (create a branch at the timestamp before the bad migration/deploy, verify on the branch, promote or copy back), framed as the database sibling of chapter 040's roll-forward migration story.

## Minor — one-line carve-outs worth adding

- **SSRF.** Unit 16 covers CSP, headers, and the abusable-endpoint matrix but never SSRF. One paragraph belongs in the abusable-endpoint lesson (082 territory) — fetching user-supplied URLs becomes live in unit 22's RAG chapter.
- **Enterprise SSO (SAML/OIDC).** Name it in 053/8 (social OAuth): "when a B2B deal asks for Okta, that's SSO-plugin territory, out of scope." Predictable question from the target audience.
- **Admin impersonation / support access.** A standard SaaS support tool with heavy audit-log implications; one sentence near the audit-trail lesson (057/5) naming it as a deliberate omission.
- **CSV import.** Export is built twice (067, 069); a pointer that import is the same pattern reversed (presigned upload → background parse/validate → upsert) would close the loop.
- **JSON-LD / structured data.** One line in 034/6 (metadata) for marketing-page SEO completeness.

## Checked and confirmed not gaps

- **Planned in units 14–22:** testing (18), observability/perf (19), caching + rate limiting (14), security hardening incl. CSP, supply chain, GDPR retention and the deletion flow (16), i18n/Temporal-in-UI/Intl (17), deployment/CI/expand-contract (20), docs/review (21), client data + state (15), AI (22).
- **Deliberate, well-named carve-outs in written chapters:** WebSockets (015/2 has a full polling→SSE→WebSocket decision tree with the bidirectional trigger), Stripe Tax and proration (064), image transformation (068/1), external search engines (038/8), RLS scope (056/3).
- **Verified covered where I initially suspected gaps:** auth brute-force (per-account lockout + per-IP limit, 053/2 + unit 14 project), XSS/sanitization (054/4 covers `dangerouslySetInnerHTML` + DOMPurify shape; CSP named for 082), account deletion (unit 16 "right to be forgotten" + freshness-gated destructive actions in 052/3), money handling (cents 001/3, numeric-as-string 037/3, Intl in 17), env/secrets (t3-env 041/2, `server-only` 030/3, per-env keys 048/1), serving uploaded images (`remotePatterns` 034/2), hydration/RSC wire/cache semantics (030–032, thorough).
