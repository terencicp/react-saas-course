# Chapter 8.1 — Sender identity and deliverability

## Chapter framing

Unit 8's thesis is that email is infrastructure, not a feature — auth verification, magic-links, password reset, invitations, billing receipts, and the notification dispatcher all depend on a sending domain that arrives in the inbox. Chapter 8.1 lands that infrastructure before any code in later units calls `resend.emails.send`: it picks Resend as the provider, walks the verified-domain setup, teaches the DKIM/SPF/DMARC protocol layer the student must own (not their email vendor), draws the transactional-versus-marketing line that drives subdomain strategy, and installs the suppression-list discipline that keeps bounces and complaint rates below the 2026 Gmail/Yahoo/Microsoft thresholds. The student leaves with a verified sending domain, a working `RESEND_API_KEY`, the DNS records configured, and the `email_suppressions` table schema and read pattern that every later send will gate through.

The threads that must run through every lesson: deliverability is the senior's responsibility, not the vendor's — Resend abstracts the SMTP but the DNS, the subdomain choice, the suppression discipline, and the complaint-rate budget live in the app's repository and ops; the 2026 enforcement landscape is real — Gmail, Yahoo, Microsoft, and La Poste now reject unauthenticated bulk mail and require DMARC alignment, and a complaint rate above 0.3 percent triggers throttling regardless of provider; transactional and marketing mail run on separate subdomains so the marketing reputation never poisons the password-reset inbox; the `email_suppressions` table is the single source of truth for "must not send" — every send path reads it first, the bounce/complaint webhook handler that writes to it lands in Chapter 12.1 but the schema and the read discipline ship here; environment variables follow the project's `lib/env.ts` shape from Chapter 5.2; the SDK is `resend` (the Node SDK with React Email support), called from `lib/email.ts` and never wrapped in an adapter (per Architectural Principle #5 in Chapter 12.2.7). The chapter ships four teaching lessons plus a quiz.

---

## Lesson 8.1.1 — Resend, the verified domain, and the send call

Topics to cover:

- **The senior question.** The app needs to send a welcome email when a user signs up, a verification code during email-confirm, a magic-link for sign-in, and a password-reset token. What's the minimum infrastructure between "the Server Action calls a function" and "the email lands in the user's inbox" — and why is the answer in 2026 Resend rather than SES, SendGrid, Postmark, or self-hosted SMTP? The lesson names the provider choice, walks the account/domain/API-key setup, installs the SDK, and writes the first send.
- **The provider choice — Resend as the 2026 default for transactional mail in a Node/Next.js SaaS.** Resend ships a Node SDK with first-class React Email support, a credible free tier, a webhook surface that hits Svix-style signature verification (the pattern Chapter 12.1 builds on), and a DX that doesn't require a meeting with a deliverability consultant to get started. SES is cheaper at scale but the IAM/SNS/SES setup costs days, not minutes — defer until volume justifies it. Postmark is a credible alternative with the same posture; pick by pricing and the team's preference, the senior call is "transactional-focused provider, not Mailchimp." Avoid mixing transactional and marketing on the same provider account when possible.
- **Account, sending domain, and the verified-domain ceremony.** Sign up, add the sending domain (the production app's primary apex or — better — a transactional subdomain like `send.yourapp.com` covered in 8.1.3), Resend produces a set of DNS records, the student adds them at the registrar, Resend verifies and flips the domain status to `Verified`. Propagation is up to 24 hours but typically minutes. The senior reflex: no send goes out from the `onboarding@resend.dev` shared domain in any environment that touches real users — the verified domain is non-negotiable for inbox placement.
- **API keys — full-access vs. sending-only, environment scoping.** Resend issues two key shapes: full-access (creates domains, manages webhooks) and sending-only (can only call the send endpoint). The senior reach: sending-only keys for the application's runtime, full-access keys only for the one-off setup scripts; one key per environment (`dev`, `preview`, `production`) so a leaked staging key can be rotated without taking production down. The `RESEND_API_KEY` lands in `lib/env.ts` (Chapter 5.2 owns the env-validation pattern).
- **The SDK install and the `lib/email.ts` module.** `pnpm add resend react-email @react-email/components`. The module exports a singleton client and the typed send wrapper:
  - `const resend = new Resend(env.RESEND_API_KEY);`
  - `export async function sendEmail({ to, subject, react, ... }: SendInput): Promise<Result>`
  The wrapper is *not* an adapter that abstracts Resend behind a generic interface — it's a thin convenience layer that adds the suppression-list check (8.1.4), the default `from` address, and the canonical `Result` return shape. Chapter 12.2.7 names the rule: Resend, Trigger.dev, and R2 are not wrapped; the swap cost doesn't justify the tax.
- **The first send — `resend.emails.send` and the canonical shape.** The minimum call: `await resend.emails.send({ from: 'YourApp <hello@send.yourapp.com>', to: ['user@example.com'], subject: 'Welcome', react: <WelcomeEmail name="Ada" /> });`. The SDK returns `{ data: { id }, error }` — the senior reflex is to inspect `error` and map it into the `Result` shape the action layer reads. The `react` prop renders a React Email component server-side to HTML and a plain-text alternative (the React Email piece is taught in 8.2.1 — this lesson uses a one-line component as the placeholder).
- **The `from` address — display name and addressable mailbox.** Format: `'Display Name <local-part@verified.subdomain.tld>'`. The mailbox must be on a verified domain; the display name shows in the recipient's inbox. The 2026 reflex: use a per-purpose local part (`noreply@`, `auth@`, `billing@`) so the user's filter rules can route, but the mailbox should accept replies — a `noreply@` that bounces silently violates the user's expectation. The reply-to header (`reply_to`) routes responses to a human-monitored inbox while the `from` keeps the bot identity.
- **Rate limits and the 2026 budget.** Resend enforces 2 requests per second by default across all endpoints (raise on request for production). The implication for a Server Action that sends a single email per request: never an issue. The implication for a bulk path — onboarding invitations to a team, a digest — reach for the `/emails/batch` endpoint (up to 100 emails per call) and the idempotency-key header so retries don't double-send. The full batch and queue pattern lands in Unit 14 (notifications); this lesson names the limit.
- **The idempotency-key header — preventing double-sends on retry.** Every send accepts an `Idempotency-Key` header (or the SDK's `idempotencyKey` option, retained 24 hours). The senior reach: pair every transactional send with a stable key — the verification token's UUID, the password-reset request ID, the invoice's send-job ID — so a retried Server Action or a webhook replay never produces two emails for the same logical event. Closes the same idempotency thread that Chapter 12.1.4 generalizes across the codebase.
- **Environments — dev, preview, production.** In dev, send to a personal inbox or to Resend's test address (`delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` simulate the corresponding outcomes for webhook testing). In preview environments, gate sending behind a feature flag or a per-environment recipient allowlist so a marketing-email Server Action triggered in a PR preview doesn't email real users. In production, the verified domain is required; the env-validation layer should refuse to boot without `RESEND_API_KEY`.
- **Watch-outs.** Sending from `onboarding@resend.dev` in production puts the email in the spam folder for most providers and trains a bad reputation on the app's user base; reusing the same full-access API key across all environments means a staging breach exposes production sending — split keys per environment from day one; the SDK's `error` field on a soft failure (rate-limit, validation) is silent if the caller only checks `data` — always destructure both; `from` mailboxes that bounce replies break the user's expectation and violate Gmail's "be replyable" guidance — point `reply_to` at a human inbox if `from` is `noreply`; the `react` prop on a server-side send must be a server-renderable component (no client hooks, no `useState`) — covered in 8.2.1.

What this lesson does not cover:

- DKIM, SPF, DMARC and the protocol-layer authentication (8.1.2).
- Subdomain strategy for separating transactional from marketing (8.1.3).
- The suppression-list read and the never-re-send discipline (8.1.4).
- React Email templating and component patterns (8.2.1).
- Local preview of email components (8.2.2).
- The bounce and complaint webhook handler that writes to `email_suppressions` (Chapter 12.1.5).
- Batch sends and the notification queue (Unit 14).

Estimated student time: 40 to 50 minutes. Setup-archetype lesson with a single send-call at the end as the verify step.

---

## Lesson 8.1.2 — DKIM, SPF, DMARC, and the 2026 bulk-sender bar

Topics to cover:

- **The senior question.** Resend says the domain is `Verified` and the test send arrives. Why does the app still need to understand SPF, DKIM, and DMARC, and what changed at Gmail, Yahoo, and Microsoft in 2024 and 2025 that makes unauthenticated email essentially undeliverable in 2026? The lesson names the three protocols, the DNS records each requires, the alignment rules that gate DMARC pass, the policy progression (`none` → `quarantine` → `reject`), and the bulk-sender bar that has become non-negotiable.
- **What each protocol does — the minimum mental model.** Three independent checks layered on top of SMTP:
  - **SPF (Sender Policy Framework).** A TXT record at the sending domain that authorizes specific IP ranges or includes (e.g., `include:_spf.resend.com`) to send for it. The receiving server checks the connecting IP against the policy. SPF aligns on the envelope `MAIL FROM` (the bounce-return address), not the visible `From:` header.
  - **DKIM (DomainKeys Identified Mail).** A public key published as a TXT record at a selector subdomain (`resend._domainkey.send.yourapp.com`). The sending MTA signs the message with the private key; the receiver fetches the public key and verifies the signature. Proves the message wasn't altered in transit and was authorized by someone with the key.
  - **DMARC (Domain-based Message Authentication, Reporting and Conformance).** A TXT record at `_dmarc.yourapp.com` that ties the visible `From:` header to SPF and DKIM via *alignment* — at least one of SPF or DKIM must pass *and* be aligned with the `From:` domain. The record also declares the policy on alignment failure (`none` for monitor-only, `quarantine` for spam-folder, `reject` for hard-bounce) and where to send aggregate reports.
- **Why DMARC alignment is the load-bearing piece.** SPF and DKIM pass independently of the `From:` header — a spammer can pass SPF on their own domain while forging the `From:` to be `paypal.com`. DMARC closes this by requiring at least one of the two to be aligned with the visible `From:` domain. Without DMARC, SPF and DKIM exist but don't protect the brand; with DMARC at `quarantine` or `reject`, spoofed mail bounces.
- **The 2026 enforcement landscape — the bulk-sender bar.** Gmail and Yahoo's February 2024 requirements (any sender exceeding 5,000 messages/day to personal accounts) hardened through 2025 enforcement and now apply de-facto to smaller senders too; Microsoft followed in May 2025; La Poste in September 2025. The 2026 baseline:
  - SPF and DKIM authenticated and aligned on every send.
  - DMARC published — `p=none` is the minimum for sending at all to major providers, `p=quarantine` or `p=reject` is the senior target.
  - One-click unsubscribe (RFC 8058 `List-Unsubscribe-Post` header) for marketing mail. Transactional mail is exempt from the unsubscribe requirement but not from authentication.
  - Spam complaint rate below 0.3 percent (the postmaster-tools threshold). Above 0.1 percent is the warning zone; above 0.3 percent triggers throttling and remediation lockout.
- **The DNS records Resend asks for, and where they live.** For a sending subdomain `send.yourapp.com`, Resend publishes (the student copies and creates at the registrar):
  - **SPF.** `TXT` at `send.yourapp.com` — `v=spf1 include:_spf.resend.com ~all` (the `~all` softfail is Resend's default; `-all` hardfail is tighter but only safe when *all* sending paths for the subdomain go through Resend).
  - **DKIM.** `TXT` at `resend._domainkey.send.yourapp.com` (the selector is Resend-issued) with the public key.
  - **MX (optional).** Often Resend asks for an MX record on the sending subdomain to receive bounces and feedback loops; accept it.
  - **DMARC.** `TXT` at `_dmarc.yourapp.com` — the apex DMARC covers all subdomains via inheritance (`sp=` subpolicy overrides per-subdomain).
- **The DMARC record anatomy.** `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourapp.com; ruf=mailto:dmarc-failures@yourapp.com; fo=1; pct=100; adkim=s; aspf=s;`. The fields the senior reads and tunes:
  - `p=` — policy on alignment failure for the apex (`none` / `quarantine` / `reject`).
  - `sp=` — subpolicy for subdomains (defaults to `p=`; override when you want a stricter subdomain rule).
  - `rua=` — aggregate XML report destination (a mailbox or a DMARC report service).
  - `pct=` — percentage of failing mail to apply the policy to (rollout dial).
  - `adkim=` / `aspf=` — alignment mode, `s` strict (the `From:` domain must match exactly), `r` relaxed (subdomain alignment passes). Strict for sensitive domains, relaxed when subdomains send.
- **The progression — start at `p=none`, end at `p=reject`.** Senior playbook:
  1. Publish `p=none` with `rua` reports flowing to a parsing service (PowerDMARC, Postmark, dmarcian — many free tiers exist). Watch aggregate reports for a week to discover unauthenticated sending sources (other vendors mailing on your behalf you forgot about).
  2. Authenticate every legitimate source — add the SPF includes, get the DKIM keys, fix alignment by routing through your subdomains.
  3. Roll to `p=quarantine` with `pct=10` and ramp `pct` to 100 over a week, watching reports.
  4. Move to `p=reject` once quarantine has been clean for two weeks.
  This is operations, not a one-time DNS edit. The chapter names the progression; the student's first deploy lands at `p=none` plus monitoring and graduates over the project lifetime.
- **BIMI — when the logo earns its weight.** With DMARC at `quarantine` or `reject`, the app can publish a BIMI record pointing at an SVG logo and (for the inbox-icon slot at Gmail) a Verified Mark Certificate (VMC) — the brand logo renders next to the sender in supported clients. Named once: BIMI is a marketing-team concern more than a deliverability lever; the senior reach is to ship after DMARC reject is stable and the brand has a registered trademark for the VMC. Not part of the project's MVP.
- **Verifying the setup.** Three checks:
  - Send a test to `check-auth@verifier.port25.com` — the auto-reply parses the headers and reports SPF, DKIM, DMARC results.
  - Send a test to a Gmail inbox and inspect `Show original` — look for `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
  - The Resend dashboard shows the latest send's auth result; failures point at the misconfigured record.
- **Watch-outs.** DKIM keys must be the full TXT value Resend issues — some registrars truncate long TXT records or wrap in extra quotes, the record then silently fails verification; SPF has a 10-DNS-lookup limit per record — if the apex SPF already includes Google Workspace, Microsoft 365, and three vendors, adding Resend's include can bust the limit and *all* SPF for the domain breaks; the apex DMARC covers subdomains by inheritance — publishing DMARC at the subdomain only and not the apex leaves the apex unprotected; `p=reject` on a domain with unauthenticated legacy senders (a billing tool nobody migrated) hard-bounces real mail — the staged rollout is non-negotiable; the visible `From:` and the envelope `MAIL FROM:` are different fields — SPF aligns on the envelope, DKIM on the signature `d=` tag, and DMARC alignment compares each against the visible `From:`.

What this lesson does not cover:

- The Resend dashboard UI walkthrough (8.1.1 covered the verification ceremony).
- Subdomain strategy and the transactional/marketing split (8.1.3).
- The bounce/complaint webhook handler (Chapter 12.1.5).
- BIMI/VMC procurement and SVG constraints (named once, dropped — not in scope).
- ARC (Authenticated Received Chain) — relevant only when sending through forwarders or mailing lists, not the SaaS transactional path.

Estimated student time: 45 to 55 minutes. The protocol lesson — heaviest conceptual weight in the chapter, pays off forever.

---

## Lesson 8.1.3 — Transactional and marketing: the subdomain split and the address discipline

Topics to cover:

- **The senior question.** The app needs to send password resets, invoice receipts, and an opt-in monthly product newsletter. All three are email. Do they share a sending domain, a subdomain, an API key, a from-address? What goes wrong when they don't, and what's the 2026 default architecture that keeps the password-reset inbox-placement immune to a marketing campaign's spam complaints? The lesson names the transactional-versus-marketing line, the subdomain split that operationalizes it, and the address conventions that signal intent to both users and mailbox providers.
- **The conceptual line — transactional vs. marketing.** Transactional mail is triggered by a user action and contains information the user expects: account verification, password reset, invoice receipt, order confirmation, security alerts. Marketing mail is sent on the sender's schedule with promotional or informational content the user opted into but didn't trigger: product newsletter, drip campaigns, feature announcements, win-back. The line is operational, not aesthetic: transactional mail is exempt from CAN-SPAM unsubscribe requirements *because* the user can't reasonably opt out of password-reset emails while keeping an account, and the recipient's expectation pattern is different enough that mailbox providers track the two reputations separately.
- **Why reputations diverge.** Transactional mail has high open rates (people open password resets), low complaint rates (people don't mark welcome emails as spam), zero "send to people who didn't ask" volume. Marketing mail has lower open rates, higher complaint rates (subscriber forgot they opted in three years ago), and inherent unsubscribe churn. When the two share a sending reputation, marketing complaints depress the transactional deliverability — a verification email lands in the spam folder, the user can't sign up, the funnel breaks for a deliverability reason the product team can't see in their dashboard.
- **The subdomain split — the 2026 default architecture.**
  - **Apex `yourapp.com`** — the corporate domain; reserve for one-to-one human mail (employee mailboxes via Google Workspace, support replies). Often no automated sending at all.
  - **`send.yourapp.com` (or `mail.yourapp.com`)** — the transactional subdomain. All Resend transactional sends from here. SPF/DKIM published per 8.1.2; DMARC inherited from apex.
  - **`marketing.yourapp.com` (or `news.yourapp.com`)** — the marketing subdomain, only when the app sends marketing mail. A *separate* Resend domain (or a separate ESP entirely, e.g., Resend Broadcasts or a marketing-focused tool). Different DKIM keys, different SPF, different reputation in the mailbox providers' eyes.
  - The naming is convention, not protocol; pick the names and stick with them across environments. The transactional subdomain is the only one in scope for the project chapter; marketing is named here so the student doesn't conflate the two later.
- **What "separate" actually means.** Different sending IP ranges, different DKIM selectors, different DMARC reports — and mailbox providers track reputation per-domain-plus-IP. Routing both streams through the same provider on the same shared IP pool partially defeats the purpose; provider-level message streams (Postmark) or per-domain provider accounts (Resend's per-domain verification) achieve real separation. The senior reach for early-stage SaaS: one Resend account, two verified subdomains, both on Resend's shared IP — already 80 percent of the reputation isolation, with zero IP-management overhead. The 20 percent gap (dedicated IPs, separate provider accounts) earns its weight at volume above ~50k/month.
- **The from-address discipline — local part as intent signal.** Per-purpose local parts on the transactional subdomain:
  - `noreply@send.yourapp.com` — automated mail the user shouldn't reply to (verification codes, magic-links). Pair with a `reply_to` pointing at a monitored support inbox so a desperate user can still reach a human.
  - `support@yourapp.com` or `hello@yourapp.com` — replyable mail. The "from a person, please respond" tone. Usually on the apex, with the human mailbox at Google Workspace.
  - `billing@send.yourapp.com` — invoices and dunning. Replyable, but to billing-only.
  - `security@send.yourapp.com` — security alerts. Replyable, prioritized by the user's filters.
  The senior reflex: name the local part for the *intent the user reads off the from line*, not the system that sent it. `notifications@` is fine; `auth-service-prod@` is a code smell.
- **The reply-to pattern.** `from` is the visible mailbox; `reply_to` is the routing override the user's "Reply" button uses. Setting `reply_to` lets `from: noreply@send.yourapp.com` coexist with `reply_to: support@yourapp.com` — the user sees the bot identity in the inbox but a reply lands in a human-monitored place. The 2026 reflex: every transactional send sets `reply_to` to a monitored mailbox (or omits both if `from` is already monitored). A `noreply@` that bounces is a usability and deliverability failure (Gmail flags consistently-unreplied-to senders).
- **The unsubscribe header — when and how.** Transactional mail is exempt from the one-click unsubscribe requirement, but mailbox providers reward `List-Unsubscribe` headers on marketing mail. The 2024 Gmail/Yahoo bar requires *one-click* unsubscribe per RFC 8058 (`List-Unsubscribe: <mailto:...>, <https://...>` plus `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) for bulk marketing. The transactional subdomain doesn't carry this header (it would invite users to opt out of their own password resets). Named here as the line, fully covered when marketing email enters the picture (out of scope for this project but worth flagging).
- **The "is this transactional?" decision rule.** When uncertain about a send (e.g., a billing-related newsletter; an in-app digest the user opted into during onboarding):
  1. Is it triggered by a specific action the user just took? If yes, transactional.
  2. Is it a recurring scheduled send with the same content shape for many users? If yes, marketing.
  3. Does the email contain only information the user *needs* to operate their account, or does it contain promotion/upsell content? Pure-need → transactional; mixed → marketing.
  4. If still unsure, treat as marketing — the cost of routing a marketing email through the transactional subdomain (reputation drag) is higher than the inverse (deliverability is the same, the user still gets the mail).
- **The org-and-account vs. per-tenant question.** In a multi-tenant SaaS, all mail flows from the app's own verified domain — *not* from the tenant's domain. A signed-up customer at `acme.com` who triggers a billing receipt receives mail from `send.yourapp.com`, with `acme.com` content inside. Tenant-domain sending (sending *from* the customer's domain) is a separate product feature (CNAME-and-DKIM-delegation for each tenant) that lives outside the scope of this chapter and is rarely worth the operational tax until a specific paying customer demands it.
- **Watch-outs.** Mixing transactional and marketing on the same subdomain is the silent reputation killer — a marketing campaign's complaint rate poisons the welcome-email deliverability and the cause is invisible to the product team; sending from the apex `yourapp.com` couples corporate mail (the founders' inboxes) to automated sending — a deliverability incident on the automated mail can degrade the founders' outbound; `noreply@` without a `reply_to` is bad UX and a faint reputation signal — always pair; the apex DMARC at `p=reject` blocks any subdomain that isn't aligned through its own DKIM — adding a new subdomain (a new ESP for marketing later) without re-running the DMARC progression triggers immediate rejection; "we'll separate later" almost always means "we won't separate" — start with the split on day one because retrofitting after the marketing reputation is already mixed is months of warmup work on a fresh subdomain.

What this lesson does not cover:

- The DNS records themselves (8.1.2 covered SPF/DKIM/DMARC).
- The send call and the SDK (8.1.1).
- The suppression-list discipline (8.1.4).
- Per-tenant custom-domain sending (out of scope, named once and dropped).
- Marketing-email infrastructure (Resend Broadcasts, dedicated marketing ESPs) — out of scope, the project sends only transactional mail.

Estimated student time: 30 to 40 minutes. Decision-archetype lesson — the threshold and the splits matter more than the syntax.

---

## Lesson 8.1.4 — Suppression discipline and the complaint-rate budget

Topics to cover:

- **The senior question.** A welcome email goes to a user whose mailbox bounced last week. A marketing email goes to a user who hit "Mark as spam" yesterday. A password-reset goes to an address that hard-bounced six months ago. In each case the send is technically successful from the app's side but actively damages the sending reputation — and at scale, pushes the complaint rate above 0.3 percent and triggers throttling at Gmail. Where in the codebase is the rule "do not send to addresses that bounced or complained" enforced, what data structure holds the truth, and how does that data structure get populated? The lesson installs the `email_suppressions` table, the read-before-send discipline that every send path inherits, and the budget the team manages against.
- **The senior frame — the user's mailbox state, not the app's intent.** A bounce or complaint is the receiving mailbox provider telling the sender "do not send here." Sending again — even with different content, even for a different reason — confirms the sender doesn't respect the signal, and the next message lands at a lower priority. The discipline isn't "be polite," it's "stay in the inbox for everyone else." The metric mailbox providers track is the *sender's* obedience, measured as the complaint rate; the app's job is to remove the addresses from its send-eligibility set the moment a signal arrives.
- **Bounce taxonomy — hard, soft, and the rule for each.**
  - **Hard bounce.** Permanent failure: mailbox doesn't exist, domain doesn't accept mail, recipient blocked. The address goes into the suppression list on the first occurrence — re-sending is the action mailbox providers punish hardest. Resend's webhook delivers `email.bounced` with `bounce.type === 'Permanent'`.
  - **Soft bounce.** Temporary failure: mailbox full, server temporarily unavailable, rate-limited. The first occurrence does not suppress; the rule of thumb is suppress after 5 consecutive soft bounces to the same address (Resend's webhook delivers `email.bounced` with `bounce.type === 'Transient'`). The senior reach: track soft-bounce counts in the `email_suppressions` table or a counter and promote to suppressed at the threshold.
  - **Complaint (FBL).** The recipient hit "Mark as spam." Suppress immediately and never re-send. Resend's webhook delivers `email.complained`. Complaint rates are the most damaging metric for reputation — a single complaint matters more than a single bounce.
  - Also worth naming: `email.delivery_delayed`, `email.opened`, `email.clicked` events — operational telemetry, not suppression signals.
- **The `email_suppressions` table schema.** A single source-of-truth table the schema-and-types chain from Chapter 6.2 lands here:
  - `id uuid primary key default uuidv7()`
  - `email text not null unique` (the normalized lowercased address; the unique constraint is the senior reach because the table answers "is this address suppressed?" with a single index lookup)
  - `reason text not null` — `'hard_bounce' | 'soft_bounce_threshold' | 'complaint' | 'manual_unsubscribe' | 'invalid_address'` — a pgEnum in the actual schema
  - `provider_event_id text` — the Resend `event.id` that wrote the row, for traceability and the webhook idempotency check (Chapter 12.1.2)
  - `bypass_until timestamptz` — optional carve-out for the rare critical-flow re-send (see below)
  - `metadata jsonb` — the raw provider payload, for debugging without re-querying Resend
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  The Drizzle table definition lives in `db/schema.ts`; the corresponding Zod schema is generated via `drizzle-zod` (Chapter 7.1.7) so the webhook handler in Chapter 12.1.5 parses the row shape from the same source.
- **The read-before-send pattern — `lib/email.ts` enforces, callers never bypass.** Every send through `sendEmail` runs:
  1. Normalize the recipient address (lowercase, trim).
  2. Query `email_suppressions` for the address.
  3. If present and not within a `bypass_until` window, return `{ ok: false, reason: 'suppressed' }` *without* calling Resend.
  4. Otherwise, call `resend.emails.send`.
  The check is at the wrapper, not at every caller — putting it at the call site invites the call site that forgets. The senior reflex: the wrapper is the chokepoint, the suppression read is its job, the caller's `Result` shape branches on `'suppressed'` exactly like it branches on other failure modes.
- **The `bypassSuppression` carve-out.** Two flows justify sending to a suppressed address: the user is actively trying to verify a new email (the verification code goes through even if the address bounced last month — the user may have fixed it) and a security-critical alert (a sign-in from a new device on an admin account). The wrapper accepts an explicit `bypassSuppression: true` argument; the call sites that set it are auditable in code review. The Chapter 12.1.5 ingestion writes a `bypass_until = now() + interval '5 minutes'` window for verification flows so the immediate re-send is allowed but a marketing path can't accidentally enable bypass long-term. The senior reach: bypass is a privilege, not a default — the option exists, the team grants it explicitly per flow.
- **The complaint-rate budget — 0.1 percent is the warning line.** Postmaster tools at Gmail, Yahoo, and Microsoft expose the complaint rate the sender is producing. The 2026 targets:
  - **Below 0.1 percent.** Healthy. Inbox placement is reliable.
  - **0.1 percent to 0.3 percent.** Warning zone. Mailbox providers downgrade newly added recipients toward the spam folder; older recipients with engagement history still see the inbox.
  - **Above 0.3 percent.** Throttling. Gmail's documented threshold; even after the underlying cause is fixed, recovery requires the rate to stay below 0.3 percent for seven consecutive days, and the domain is ineligible for delivery support during the violation window.
  The number tracks against marketing sends almost exclusively (transactional rarely produces complaints). The senior frame: the engineering team owns the suppression discipline *and* the data; the marketing team owns the content and the segmentation. When the rate spikes, the engineering investigation is "did suppression run?" and the marketing investigation is "what changed in the segment or copy?"
- **Manual unsubscribes and the same table.** When the marketing layer ships, the unsubscribe handler writes to `email_suppressions` with `reason = 'manual_unsubscribe'`. The transactional layer's read-before-send still checks the table but transactional sends bypass `manual_unsubscribe` rows (the user can't opt out of password resets while keeping the account). The bypass logic in the wrapper distinguishes by `reason` — transactional sends bypass `manual_unsubscribe` only; marketing sends honor every row. The full implementation surface is the project chapter; the rule lands here.
- **Email validation at the form boundary — the cheap defense.** A typo'd email (`user@gnail.com`) hard-bounces and burns a suppression entry. The senior pre-emptive defense: validate at the form (Zod's `z.email()` from Chapter 7.1.2) plus an optional MX-record probe at the action layer (`dns.resolveMx`) for high-stakes flows like new-customer signup. Not a substitute for the suppression discipline; reduces the bounce-rate denominator. Named once, the production reach is documented in the next bullet.
- **What this chapter ships vs. what Chapter 12.1 ships.** This lesson defines the table, the read pattern, the bypass carve-out, and the budget the team manages against. The webhook handler that *populates* the table — receiving `email.bounced`, `email.complained`, `email.delivery_delayed` from Resend, verifying the signature, deduplicating, writing the row — is the named Chapter 12.1.5 project (a worked example of the Chapter 12.1 webhook pattern applied to email). The student leaves 8.1.4 with the schema and the read; the writer arrives in Chapter 12.1.
- **Watch-outs.** Storing the email un-normalized (mixed case, untrimmed) means the unique-on-email index doesn't dedupe `User@Example.com` and `user@example.com` — always normalize at write *and* read; checking the suppression table at every caller instead of the wrapper means one forgotten call site is a real-world reputation incident; a `bypass_until` window that's too long (24 hours) lets bulk paths sneak through — the production default is minutes, scoped to a single verify flow; failing-open on a suppression-table query timeout silently undoes the discipline — the senior call is to fail-closed (return `{ ok: false }` on DB error) and surface the error to the operator, because a missed transactional send is recoverable but a sent-to-suppressed event isn't; tracking complaint rate on the provider dashboard alone is too lagged — the suppression-table write rate is the leading indicator, watch the growth derivative in the same dashboard the database lives in.

What this lesson does not cover:

- The webhook handler that writes the table (Chapter 12.1.5).
- Signature verification and dedup for the Resend webhook (Chapter 12.1.1, 12.1.2).
- Marketing-mail unsubscribe header wiring (out of scope — transactional only).
- Address-validation services (third-party verifiers like Kickbox, NeverBounce) — named once as the senior reach for high-stakes signup but not built here.
- The notification dispatcher and digest/batch sends (Unit 14).

Estimated student time: 35 to 45 minutes. Pattern-archetype lesson — the schema and the wrapper-chokepoint discipline are the lesson; the webhook write is downstream.

---

## Lesson 8.1.5 — Chapter quiz

Top 10 topics to quiz:

- Provider choice in 2026 — Resend as the transactional default, when SES or Postmark earn their weight, and why marketing-focused ESPs are not the senior reach for transactional.
- The verified-domain ceremony — the API-key shapes (full-access vs. sending-only), the per-environment key discipline, the prohibition on sending from `onboarding@resend.dev` in production.
- SPF, DKIM, DMARC — what each protocol proves, the alignment rule that DMARC adds on top, and why DMARC is the load-bearing piece of the three.
- The DMARC policy progression (`p=none` → `quarantine` → `reject`), the `rua` aggregate-report pipeline, and the `pct` rollout dial.
- The 2026 bulk-sender bar — Gmail/Yahoo/Microsoft authentication requirements, the 0.3 percent complaint-rate threshold, and the transactional exemption from one-click unsubscribe.
- The transactional/marketing subdomain split — why mixed reputations damage transactional deliverability, the `send.yourapp.com` vs. `marketing.yourapp.com` convention, and what "separate" actually means in provider terms.
- The from-address discipline — per-purpose local parts, the `noreply@` plus `reply_to` pattern, and the multi-tenant rule (send from the app's domain, not the tenant's).
- Bounce taxonomy — hard vs. soft vs. complaint, the suppression rule for each, and the soft-bounce threshold pattern.
- The `email_suppressions` table — the schema (the unique-on-email index, the `reason` enum, the `bypass_until` field), the read-at-the-wrapper pattern, and the carve-out for verification flows.
- The idempotency-key reflex on Resend sends — when to set it (verification, password-reset, invoice sends), how long the key persists, and how it closes the same retry-safety thread that Chapter 12.1.4 generalizes.
