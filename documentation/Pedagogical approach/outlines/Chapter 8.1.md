# Chapter 8.1 — Sender identity and deliverability: pedagogical approach

## Concept 1 — The deliverability stack as one chain, not four lessons

**Why it's hard.** The chapter ships four lessons that look like four unrelated topics — pick a vendor, edit some DNS, choose a subdomain, build a database table. The student treats them as a checklist and ships with one link missing — usually the suppression read or the DMARC policy progression — and the symptom (a verification email landing in spam, a complaint rate that quietly climbs) is invisible until production. The senior frame is the inverse: deliverability is *one* chain from the Server Action to the user's inbox, and a break anywhere drops the message. Without that picture in the first beat, every later lesson reads as detail without a place to land.

**Ideal teaching artifact.** Concept archetype delivered as a **scrubbable inbox journey** — a six-stage sequence the student walks from `await sendEmail(...)` on the left to the recipient's inbox on the right. Each stage is one of the chain's links: (1) the wrapper checks the suppression table, (2) Resend's API receives the request authenticated by the env-scoped key, (3) the receiving server verifies SPF and DKIM signatures against the DNS records, (4) DMARC checks alignment against the visible `From:`, (5) the receiver consults the sending domain's reputation history (transactional vs marketing subdomain), (6) the message is placed in the inbox, the spam folder, or rejected. The student scrubs forward; at each stage, a "what breaks here" callout names the symptom (suppressed-skip → reputation safe; missing DKIM → spam folder; misaligned DMARC → reject; mixed reputation → degraded inbox placement). The closing line names the chapter's spine: every one of the four lessons hardens one link, and the chain is only as strong as the weakest.

**Engagement.** A `Matching` round after the scrub: six chain-break symptoms ("verification email goes to spam at Gmail", "complaint rate climbs past 0.3% and Gmail throttles", "spammer forges a `From:` from your domain and Gmail accepts it", "a re-sent welcome email is silently dropped after a hard bounce a month ago", "marketing campaign tanks the password-reset deliverability", "a leaked staging key sends production-shaped mail") matched to the link in the chain that owns the fix. Forces the student to *locate* each failure on the diagram before the chapter starts teaching the links one at a time.

**Components.**
- `DiagramSequence` for the six-stage chain scrub, each stage a hand SVG inside the slot showing the message's state at that point and the "breaks here" callout. Reuses the deliverability vocabulary the chapter sets up; recurs in Chapter 8.3's verification rehearsal and Chapter 12.1.5's bounce-webhook handler.
- `Matching` for the symptom-to-link round.
- `Aside` (`tip`) below: "the chain is one piece; lesson by lesson, each link hardens — read every later concept against this picture."

**Project link.** Chapter 8.3's "Done when" verification (8.3.5) is structured exactly as a walk down this chain — every clause asserts one link is intact. The student returns to this diagram in 8.3 to recognize the verification list as the chain's shape.

---

## Concept 2 — Resend over SES, Postmark, SendGrid, or SMTP: the trigger panel

**Why it's hard.** The student arrives carrying received wisdom from older codebases — "use SendGrid, it's the standard" or "self-host SMTP, it's free" — without the 2026 cost frame. The choice is not aesthetic: SES is genuinely cheaper at scale but the IAM/SNS/SES setup costs days, SendGrid's marketing-first DX taxes every transactional send, Postmark is a credible alternative whose case-by-case pick is on price, and self-hosted SMTP for a SaaS in 2026 is an operational absurdity the student has to be told to abandon. Without the trigger panel, the student picks by what they've heard of, and the choice ages out of the lesson within two years.

**Ideal teaching artifact.** Decision archetype delivered as a **comparative trigger table** rendered inside `Figure`. Five rows (Resend, Postmark, SES, SendGrid, self-hosted SMTP) and four columns: *2026 default trigger* (the one-line "reach for this when..."), *DX tax* (setup time to first send, SDK quality), *deliverability posture* (transactional-focused vs. marketing-mixed), *flip condition* (the threshold that would make this the right call instead of Resend). Resend's row reads "default for transactional in a Node/Next.js SaaS — React Email support, Svix-style webhooks, credible free tier." SES's row carries the flip condition "monthly volume above ~500k where the IAM tax is amortized." Postmark's row reads "credible swap on price/team preference; same posture." SendGrid's row carries the senior block — "marketing-mixed reputation pool taxes transactional; do not pick for new transactional builds." SMTP's row reads "do not self-host — the hours go to deliverability ops, not features." The artifact is the picture the student returns to whenever a teammate asks "why didn't we pick X?"

**Engagement.** A `MultipleChoice` round of four scenarios after the table: "early-stage SaaS, ~5k transactional emails/month, team has no email-ops experience" → Resend; "established product, 800k transactional emails/month, dedicated platform team" → SES (the volume crossed the IAM tax threshold); "marketing-heavy product launching a transactional surface alongside" → Resend for transactional + a separate marketing tool, never SendGrid for both; "compliance environment requires self-managed mail server" → flag to the legal/ops team, this is outside the SaaS-stack scope. Wrong answers tag the trigger that was misread.

**Components.**
- `Figure` wrapping a hand-coded HTML 5×4 trigger table. Single-use static composition — the picture is the teaching, no bespoke component earns its weight.
- `MultipleChoice` for the scenario round.
- `Aside` (`note`) below: "the senior pick is transactional-focused provider, not the marketing-mixed historical default."

**Project link.** Chapter 8.3 ships against Resend with no provider-choice ceremony repeated; the student should be able to defend the pick from this concept's table when a hypothetical reviewer asks.

---

## Concept 3 — The verified-domain ceremony and per-environment API key discipline

**Why it's hard.** The student reads the Resend dashboard's "create API key" button and reaches for one full-access key they paste into every environment's `.env`. The first leaked staging key takes production sending down with it. The verified-domain ceremony itself looks like clicking through a wizard, but the rule that lands underneath — *no send goes out from `onboarding@resend.dev` in any environment that touches real users* — gets skipped because the test send "just worked." Two disciplines have to land: the ceremony's purpose (DNS verification gates inbox placement, this is not a formality), and the key shape (sending-only at runtime, full-access only for one-off setup, one key per environment).

**Ideal teaching artifact.** Setup archetype delivered as a **two-track walkthrough**: the ceremony track and the key-discipline track, side by side. The ceremony track is a five-step `Steps` sequence — sign up, add the sending subdomain, copy the DNS records to the registrar, wait for verification (typically minutes, up to 24h), the dashboard flips to `Verified`. The key-discipline track is rendered as a small annotated-keys panel — three rows for `dev`, `preview`, `production`, each with the key shape (sending-only at runtime, full-access only for the one-off setup script), and a fourth highlighted row showing the failure mode of one full-access key reused everywhere. Below the two tracks, a one-row table maps the environment to the appropriate `from` address: dev sends to `delivered@resend.dev` / personal inbox; preview gates by feature flag or recipient allowlist; production uses the verified subdomain only — the `onboarding@resend.dev` shared domain is *prohibited* outside dev. The student leaves with the ceremony as muscle memory and the key-per-env rule as a non-negotiable.

**Engagement.** A `Buckets` sort: eight scenarios sorted into "dev", "preview", "production", or "rejected — never do this". Trick items: *production sending from `onboarding@resend.dev` because the team's verified-domain check failed Friday at 5pm* (rejected); *preview environment auto-emails real users to test a marketing flow* (rejected — gate behind allowlist); *one full-access key reused across dev, preview, and production* (rejected); *staging key rotated independently after a contractor's laptop was lost* (production-safe — the per-env split is what makes this rotatable). Wrong-answer feedback names the discipline the choice broke.

**Components.**
- `Steps` for the five-step verified-domain ceremony track.
- `Figure` wrapping a hand-coded HTML 3-row key-discipline table beside the ceremony. Single-use static composition.
- `Buckets` for the eight-scenario sort.
- `Aside` (`caution`) below: "one key per environment, sending-only at runtime, `onboarding@resend.dev` only in dev — every shortcut here is a production incident waiting to be triggered."

**Project link.** Chapter 8.3.2 re-runs this ceremony against the student's own registrar and 8.3.3 wires the three Resend env entries; the disciplines installed here are the ones the project's `lib/env.ts` enforces structurally.

---

## Concept 4 — The `lib/email.ts` wrapper as the single send chokepoint

**Why it's hard.** Two mistakes converge. The student either calls `resend.emails.send` directly from every Server Action (and re-implements the suppression check, the from-address default, and the idempotency key in N places, with one of them inevitably wrong) or wraps Resend in a generic `EmailProvider` interface (a misapplied "abstract the vendor" reflex that pays a code tax against a swap that won't happen — Architectural Principle #5 in 12.2.7 names the rule). The senior shape is neither: a thin wrapper, *not an adapter*, that exists to enforce the policies every send must pass through — the suppression read, the canonical from, the idempotency key, the typed `Result` return. The chokepoint *is* the architecture; the policies it enforces are added across the chapter's later concepts.

**Ideal teaching artifact.** Pattern archetype delivered as a **wrapper-anatomy walk** in `AnnotatedCode` paired with a **call-site contrast**. The walk is the `sendEmail` function — six annotations on a single function body: (1) accept the typed `SendInput` (the canonical shape every call site uses); (2) normalize the recipient and check `email_suppressions` (the suppression policy lands here in concept 11, this annotation reserves the slot); (3) apply the default from address; (4) attach the idempotency key (concept 5 lands here); (5) call `resend.emails.send` and inspect *both* `data` and `error` from the SDK return; (6) return a typed `{ ok: true, id } | { ok: false, reason }` Result. Below the walk, a `CodeVariants` two-tab contrast: tab one shows three Server Actions each calling `resend.emails.send` directly (suppression check missing in two, idempotency key missing in one, from-address inconsistent across all three — annotated as the wrong shape); tab two shows the same three actions calling `sendEmail` (one line each, every policy enforced by the wrapper). The closing rule names the discrimination — this is *not* an adapter that lets you swap Resend for SES tomorrow (a swap that won't happen and would tax every send forever); this is a chokepoint where the policies that must hold for every send live in *one* place.

**Engagement.** A `MultipleChoice` PR-review round of four scenarios: a teammate calls `resend.emails.send` directly from a route handler ("we needed a different from address"); a teammate adds a `class EmailService` interface to abstract Resend behind a generic shape; a teammate adds a `bypassSuppression` parameter to the wrapper without naming the call sites that use it; a teammate adds the idempotency-key check in the calling action instead of the wrapper. The student picks what the senior reviewer asks for. Wrong-answer feedback names the principle violated (chokepoint discipline, no-adapter rule, auditable carve-outs, single-source-of-policy).

**Components.**
- `AnnotatedCode` for the six-annotation `sendEmail` wrapper walk.
- `CodeVariants` with two tabs (direct calls vs wrapper calls) for the call-site contrast.
- `MultipleChoice` for the PR-review round.
- `Aside` (`note`) below: "the wrapper is a chokepoint, not an adapter — its job is to make every send obey the policies; swapping Resend out is not a goal of this code."

**Project link.** Chapter 8.3.3 builds this exact wrapper as the project's `lib/email.ts`, with `lib/suppressions.ts` providing the `isSuppressed` helper the wrapper calls. Every project-chapter send (welcome, verification, magic-link, password-reset across Units 9 and onward) routes through this one function.

---

## Concept 5 — Idempotency keys on every transactional send

**Why it's hard.** Server Actions retry. Webhook handlers replay. A Vercel cold-start that times out re-runs the action; a network blip between the SDK and Resend re-fires the request; a webhook that didn't ack within 30s gets re-delivered. Without an idempotency key, every retry produces a duplicate email — the user gets two welcome messages, two password-reset codes, two invoice receipts. The student's instinct is to "just be careful" or to wrap the send in a try/catch that swallows duplicates; both fail under load. The senior reflex is structural: every transactional send carries a stable key derived from the logical event (the verification token's UUID, the password-reset request ID, the invoice's send-job ID), Resend deduplicates server-side for 24 hours, retries become safe by construction.

**Ideal teaching artifact.** Pattern archetype delivered as a **retry-race scrubbable timeline** in `DiagramSequence`. Five frames the student scrubs through. Frame one: the Server Action fires `sendEmail({ idempotencyKey: verificationToken.id, ... })` for the first time — Resend records the key, sends the message, the recipient gets one email. Frame two: the action's response times out at the Vercel proxy, the client retries with the same `formData`. Frame three: the second invocation runs, generates the *same* `verificationToken.id` (the token row exists, the action reads it), calls `sendEmail` with the same key. Frame four: Resend looks up the key in its 24-hour dedup window, finds the prior request, returns the prior `id` *without* sending again. Frame five: the recipient still has one email. A side counter tracks "emails delivered to recipient" across frames — it ticks once and stays at one. A second condensed frame contrasts "without idempotency key" — the counter ticks to two, and the user sees two welcome messages. The reveal lands the rule: every logical event gets a stable key derived from the row that represents it, never from the call site's local variable.

**Engagement.** A `MultipleChoice` round of four key-derivation scenarios — *welcome email on signup* → user.id; *email verification* → verificationToken.id (the row's PK), not crypto.randomUUID() (a fresh UUID each call defeats dedup); *password reset* → resetRequest.id; *daily digest send to many users* → `${digestRun.id}:${user.id}` (composite of the run and the recipient). Wrong-answer feedback names the call sites where the wrong derivation would re-fire (the `randomUUID()` case is the load-bearing trap — every retry mints a fresh key, dedup never matches).

**Components.**
- `DiagramSequence` for the five-frame retry-race timeline. Each frame is a hand SVG showing the action lane, the Resend dedup ledger, the recipient's inbox, and the side counter.
- `MultipleChoice` for the key-derivation round.
- `Aside` (`tip`) below: "the key derives from the row that represents the logical event, never from a fresh `randomUUID()` at the call site — the key has to survive the retry."

**Project link.** Chapter 8.3.3 makes the idempotency key non-optional in the wrapper's signature; the welcome action in 8.3.4 derives it from the user row's ID. The same primitive recurs in Chapter 12.1.4 for the webhook receiver's dedup, where the `processed_events` table generalizes Resend's server-side ledger to the app's own boundary.

---

## Concept 6 — SPF, DKIM, DMARC: what each proves and why DMARC alignment is the load-bearing piece

**Why it's hard.** Three protocols layered on SMTP, named by acronym, configured as DNS records that look like noise. The student reads "SPF authorizes IPs, DKIM signs the message, DMARC ties them together" and the words pass without sticking — there's no mental model of *what each one would prevent if it didn't exist*, so the configuration becomes magic-string copying from the Resend dashboard. The load-bearing insight that has to land: SPF and DKIM each pass independently of the visible `From:` header, so a spammer can pass either while forging the `From:` to be your bank. DMARC's contribution is *alignment* — at least one of SPF or DKIM must pass *and* be aligned with the `From:` domain — and that alignment is the only reason the brand identity is protected. Without feeling the spoofing attack DMARC closes, the student doesn't internalize why DMARC isn't optional.

**Ideal teaching artifact.** Concept archetype delivered in two coordinated beats. **Beat one — the spoofing simulator.** A `DiagramSequence` walks four frames the student scrubs through. Frame one: a legitimate send from `send.yourapp.com` — SPF passes (Resend's IPs authorized), DKIM passes (Resend signed), the `From:` is `send.yourapp.com`, alignment holds, DMARC passes, message in inbox. Frame two: a spammer sends from their own domain with a forged `From: support@yourapp.com` — SPF passes on the spammer's domain (their IPs authorized for *their* SPF), DKIM passes on the spammer's domain (they signed with their own key), but the `From:` is `yourapp.com` — alignment *fails*, DMARC fails, message rejected (or quarantined). The student watches alignment do its job: SPF and DKIM "pass" but the protection is in the alignment check. Frame three: same spammer, but `yourapp.com` has no DMARC record published — SPF and DKIM still "pass," there's no alignment check, the spoofed `From:` reaches the inbox. Frame four: the senior posture lands as the rule — without DMARC, SPF and DKIM exist but don't protect the brand; with DMARC, alignment is the gate. **Beat two — the protocol anatomy.** A `Figure`-wrapped hand SVG of the three records side by side at the DNS level: SPF (`v=spf1 include:_spf.resend.com ~all` at the sending subdomain, aligns on envelope `MAIL FROM`), DKIM (`resend._domainkey.send.yourapp.com` selector record, aligns on the signature `d=` tag), DMARC (`_dmarc.yourapp.com` apex record, ties both to the visible `From:` via alignment). Each record annotated with *what it would prove if alone* and *what it doesn't prove* (the gap DMARC fills).

**Engagement.** A `Tokens` round on a sample inbox header dump (`Authentication-Results: mx.google.com; spf=pass smtp.mailfrom=...; dkim=pass header.i=...; dmarc=pass (p=quarantine sp=reject) header.from=...`) — the student clicks each protocol-result token in turn and is asked to name what each line would tell the senior under three failure scenarios (spoofing attack, misconfigured SPF include, missing DKIM selector). Forces the student to *read* the headers the way a senior triages deliverability, not just recognize the protocol names.

**Components.**
- `DiagramSequence` for the four-frame spoofing simulator. Each frame is a hand SVG showing the sender's domain, the receiver's checks, the alignment verdict, and the inbox state.
- `Figure` wrapping a hand SVG of the three-record protocol anatomy for beat two.
- `Tokens` for the header-dump reading round.
- `Aside` (`note`) below: "SPF and DKIM each pass on the spammer's own domain — DMARC's alignment is what protects the visible `From:` from being forged."

**Project link.** Chapter 8.3.5's "DKIM/SPF/DMARC pass in headers" Done-when clause is verified by reading exactly this header shape on the welcome email's first inbox arrival. The student returns to this concept's vocabulary to do the verification.

---

## Concept 7 — The DMARC progression: `p=none` → `quarantine` → `reject` is operations, not a one-time DNS edit

**Why it's hard.** The student reads the DMARC record syntax and reaches for `p=reject` immediately because "strictest is best." The reject policy on a domain with unauthenticated legacy senders (a billing tool nobody migrated, a recruiter's bulk mailer the marketing team set up two years ago) hard-bounces real mail across the company within hours. The senior posture is the inverse: `p=none` is the *starting* state, the `rua` aggregate reports surface the legitimate sources the team forgot about, each gets authenticated, then `pct` ramps the policy up to quarantine and reject over weeks. The reflex isn't a syntax detail — it's recognizing that DMARC is operational discipline that lives in the team's calendar, not a one-line DNS record set on day one.

**Ideal teaching artifact.** Pattern archetype delivered as a **four-stage rollout timeline** in `DiagramSequence`. Stage one (week 0): publish `p=none; rua=mailto:dmarc-reports@yourapp.com; pct=100;` — the policy is monitor-only, every send still reaches the inbox, but aggregate reports start flowing. The student sees a sample report sidebar showing five legitimate sources discovered in the first week (Resend on the new subdomain, Google Workspace on the apex, an old billing tool on a forgotten subdomain, a recruiter's mailer the team didn't know about, a help-desk SaaS). Stage two (week 1-2): authenticate every source — add the SPF includes, get the DKIM keys, route the unauthenticated tools through their own SPF or shut them down. The sidebar's "unaligned" count drops from five to zero. Stage three (week 3): roll to `p=quarantine; pct=10;`, then ramp `pct` to 100 over a week, watching reports for collateral damage. Stage four (week 5): move to `p=reject` once two weeks of quarantine have been clean. A small panel at the right of each stage names the *risk* of skipping ahead — straight to reject at stage one would have hard-bounced the recruiter's mailer the team needed working through the quarter. The student leaves with the rollout as a calendar shape, not a config line.

**Engagement.** A `Sequence` drag-and-order drill: nine action cards from a real rollout — *publish `p=none` with `rua` reports*, *parse the first week's reports*, *authenticate Google Workspace on the apex*, *shut down the unauthenticated billing tool*, *roll to `p=quarantine; pct=10;`*, *ramp `pct` to 100 over a week*, *move to `p=reject;`* — plus three trap cards (*publish `p=reject` on day one*, *ignore the `rua` reports because "Resend is the only sender"*, *skip the quarantine stage because the team is "in a hurry"*) the student rejects by leaving them out of the order.

**Components.**
- `DiagramSequence` for the four-stage rollout timeline. Each stage is a hand SVG showing the DMARC record's current state, the discovery sidebar of legitimate sources, and the per-stage risk callout.
- `Sequence` for the nine-card rollout drill.
- `Aside` (`caution`) below: "every DMARC progression skip is a deliverability incident waiting to happen — `p=none` plus monitoring is the *starting* state, not an interim hack."

**Project link.** Chapter 8.3.2 ships the project's first DMARC record at `p=none` with `rua` reporting, and the project's "Done when" check verifies the policy is live and the reports flow. The progression to quarantine and reject lives outside the project's window but is named here as the team's calendar item once the project is in production.

---

## Concept 8 — The 2026 bulk-sender bar: why authentication is non-optional, not best practice

**Why it's hard.** A student reading 2020-era guidance treats SPF/DKIM/DMARC as recommended-but-soft — "good for deliverability, your mail still goes through without them." That mental model is broken in 2026. Gmail and Yahoo's February 2024 requirements hardened through 2025 enforcement; Microsoft followed in May 2025; La Poste in September 2025. The de-facto baseline applies to small senders too: unauthenticated mail bounces or sits in spam, complaint rates above 0.3 percent trigger throttling regardless of provider, marketing mail without one-click unsubscribe gets penalized. Without the enforcement landscape on the page, the student treats the protocols as "nice to have" and ships the chapter's first lesson without DMARC, then can't understand why the welcome email lands in spam.

**Ideal teaching artifact.** Reference archetype delivered as a **2026 enforcement bar table** rendered inside `Figure`. Four rows (Gmail / Yahoo, Microsoft, La Poste, "every other major receiver de-facto") and four columns: *enforcement date*, *authentication required* (SPF + DKIM aligned, DMARC published at minimum `p=none`), *complaint-rate threshold* (0.3 percent triggers throttling at Gmail; warning zone starts at 0.1 percent), *unsubscribe requirement* (one-click for marketing, transactional exempt). A fifth row at the bottom collapses to "the de-facto 2026 baseline" — a one-line summary of what every send has to satisfy. The artifact is the picture the student returns to whenever a teammate asks "do we *have* to do DMARC?" — yes, the receivers won't accept unauthenticated bulk mail, that question has been answered by the market.

**Engagement.** A `TrueFalse` round of six statements after the table: *"DMARC is best practice but not required to send to Gmail"* (false — `p=none` minimum), *"transactional mail is exempt from one-click unsubscribe"* (true), *"a complaint rate of 0.2% is in the warning zone but not yet throttled"* (true — between 0.1 and 0.3), *"the bulk-sender requirements only apply at 5,000+ messages/day"* (false — de-facto applied to smaller senders too in 2025), *"Microsoft's bulk-sender enforcement landed in 2024 alongside Gmail's"* (false — May 2025), *"unauthenticated SMTP from a corporate domain still reaches the inbox if the message looks legitimate"* (false — receivers reject).

**Components.**
- `Figure` wrapping a hand-coded HTML 4×4 enforcement table with the de-facto-baseline row at the bottom. Single-use static composition.
- `TrueFalse` for the six-statement round.
- `Aside` (`caution`) below: "the receivers stopped accepting unauthenticated bulk mail in 2024–2025 — DMARC at `p=none` is the starting line, not the finish line."

**Project link.** Chapter 8.3.5's verification asserts the welcome email passes SPF, DKIM, *and* DMARC at Gmail; the bar from this concept is what makes that verification non-negotiable. The complaint-rate budget reappears as a project-graduation check the student carries into production.

---

## Concept 9 — The transactional / marketing subdomain split: structural, not aesthetic

**Why it's hard.** The student writing the first welcome email doesn't know yet that the marketing newsletter exists, doesn't see why two unrelated email types should live on different subdomains, and reads the split as bureaucratic overhead. The cost of the misframe surfaces months later: the marketing team's drip campaign hits a 0.4 percent complaint rate, the *transactional* deliverability degrades because the receivers track reputation per sending domain, the verification email lands in spam, the signup funnel breaks for a reason invisible to the product team. The senior posture is structural: separate streams have separate reputations because that's how mailbox providers measure them; mixing them is a silent failure mode the team can't see in their own dashboard.

**Ideal teaching artifact.** Decision archetype delivered as a **reputation-poisoning two-track simulation** in `DiagramSequence`. Two parallel tracks scrubbed across six months. Track A — *mixed subdomain*: every email (welcome, password-reset, monthly newsletter) sends from `mail.yourapp.com`. Month 1: clean. Month 3: marketing campaign hits a complaint rate of 0.4 percent (above the 0.3 threshold). Month 4: receivers' reputation score for `mail.yourapp.com` degrades. Month 5: a side counter shows verification emails landing in spam at 12 percent of recipients — *transactional* deliverability collapsed because of marketing's complaints. Month 6: the product team sees a signup-funnel drop and can't trace it back to email. Track B — *split subdomains*: transactional from `send.yourapp.com`, marketing from `marketing.yourapp.com`. Same marketing campaign, same 0.4 percent complaint rate. The marketing reputation degrades; the transactional reputation is untouched; the verification email keeps landing in the inbox. The student scrubs both tracks side by side and *sees* the asymmetry. The closing rule names what "separate" actually means: different DKIM keys, different SPF, different reputation in the receivers' eyes — Resend's per-domain verification is the project's lever for this.

**Engagement.** A `MultipleChoice` round of four boundary scenarios: *"a billing-related newsletter goes out monthly to active customers"* → marketing (recurring scheduled, mixed promotional content); *"an in-app digest the user opted into during onboarding"* → marketing (recurring, scheduled); *"a security alert about a sign-in from a new device"* → transactional (triggered by user action, security-critical); *"an order confirmation with a coupon for the next purchase"* → split — the order confirmation is transactional, the coupon embed is the smell, send the coupon as a separate marketing email. Wrong-answer feedback names the four-question decision rule (action-triggered, scheduled-bulk, info-only-vs-promotional, when-uncertain-route-as-marketing).

**Components.**
- `DiagramSequence` for the two-track six-month reputation-poisoning simulation. Each frame is a hand SVG showing both tracks' reputation scores, the marketing campaign's complaint rate, the transactional deliverability percentage, and the funnel impact.
- `MultipleChoice` for the boundary-scenario round.
- `Aside` (`caution`) below: "the reputation lives at the sending-domain level — mixing transactional and marketing is the silent failure mode the product dashboard can't see."

**Project link.** Chapter 8.3.2 verifies `send.yourapp.com` as the transactional subdomain only — the project does not ship marketing mail, but the subdomain is named with the split convention so when marketing arrives in a later quarter, the transactional reputation is already isolated.

---

## Concept 10 — From-address discipline: per-purpose local part, `noreply@` paired with `reply_to`

**Why it's hard.** The student writes `from: 'noreply@yourapp.com'` once, ships it across every transactional surface, and silently violates two things at once: (1) the user's expectation that they can reply if something is wrong (a `noreply@` that bounces is bad UX *and* a faint reputation signal — Gmail flags consistently-unreplied-to senders); (2) the user's filter rules can't route by purpose because every email shares the same local part. The senior shape pairs `noreply@` (visible inbox identity) with `reply_to:` (the routing override the user's "Reply" button uses) so the bot identity coexists with a human-monitored inbox; per-purpose local parts (`auth@`, `billing@`, `security@`) signal intent the user reads off the from line and route through their filters. The misframe is treating from-address as cosmetic; the senior posture is treating it as the inbox-as-UX seam.

**Ideal teaching artifact.** Pattern archetype delivered as an **inbox-render contrast** rendered as a `Figure`-wrapped hand SVG. Two side-by-side mocked Gmail-style inbox lists. Left list — *bad shape*: every email from `noreply@yourapp.com`, no `reply_to`. The user sees five identical sender names, can't filter by purpose, hits Reply on the security alert and gets a bounce. Right list — *good shape*: the same five emails, each with the right local part (`Acme Auth <noreply@send.acme.com>` / reply-to `support@acme.com`; `Acme Billing <billing@send.acme.com>` / reply-to `billing@acme.com`; `Acme Security <security@send.acme.com>` / reply-to `security@acme.com`). The user's inbox renders five distinguishable senders, filter rules route by local part, hitting Reply on the security alert reaches a human. Below the contrast, a small reference panel maps four canonical local parts to their reply-to and the trigger that earns each. A second beat surfaces the multi-tenant rule named once: in a SaaS the user at `acme.com` who triggers a billing receipt receives mail from `send.yourapp.com` (the *app's* domain), with `acme.com` content inside — sending from the customer's domain is a separate product feature out of scope for this chapter.

**Engagement.** A `MultipleChoice` PR-review round of four scenarios: *teammate sets `from: 'noreply@yourapp.com'` with no `reply_to`* → ask for the `reply_to: support@...` pairing; *teammate sets `from: 'auth-service-prod@send.yourapp.com'`* → smell, the local part names the system not the intent; *teammate's billing receipt sends from `from: 'noreply@send.acme-customer.com'` (the tenant's domain) for a multi-tenant SaaS* → block, sends are from the app's domain, not the tenant's; *teammate sets `reply_to: noreply@yourapp.com`* → the reply-to has to be a monitored mailbox, not a second `noreply`.

**Components.**
- `Figure` wrapping a hand SVG of the two-inbox contrast plus the local-part reference panel. Single-use static composition.
- `MultipleChoice` for the PR-review round.
- `Aside` (`tip`) below: "the local part names the *intent* the user reads off the from line; the reply-to routes the user's frustrated reply to a human; multi-tenant sends from the app's domain, not the tenant's."

**Project link.** Chapter 8.3.4's welcome action sets `from: 'YourApp Welcome <hello@send.yourapp.com>'` with `reply_to: support@yourapp.com`; the inspector verification in 8.3.5 includes a manual reply test to confirm the reply-to lands somewhere a human reads.

---

## Concept 11 — The suppression contract: bounce taxonomy, the table, the read-at-wrapper, the bypass carve-out

**Why it's hard.** Four pieces have to land together. (1) *The taxonomy* — hard bounce, soft bounce, complaint each carry different rules (hard bounce → suppress immediately; soft bounce → suppress after 5 consecutive; complaint → suppress immediately, never re-send). (2) *The table* — `email_suppressions` with the `email`-unique index, the `reason` enum, the `bypass_until` carve-out field. (3) *The read pattern* — every send through the wrapper queries the table first; the check is at the wrapper, *never* at the call site. (4) *The bypass carve-out* — verification flows and security-critical alerts can bypass *some* suppressions (manual-unsubscribe specifically) for a tightly-scoped window, with the bypass auditable in code review. The student who learns three of the four ships a deliverability hole. The misconception that hits hardest: putting the suppression check at every caller "for flexibility" — one forgotten call site is a reputation incident; the wrapper-as-chokepoint is non-negotiable.

**Ideal teaching artifact.** Pattern archetype delivered in two coordinated beats, neither carryable in prose alone.

**Beat one — the taxonomy + table walk.** A `Figure`-wrapped hand SVG diagram on top: three event types (hard bounce / soft bounce / complaint) with arrows into the `email_suppressions` table, each arrow labeled with the rule (hard → suppress on first, soft → suppress after 5 consecutive, complaint → suppress immediately and never re-send). The table is rendered as a small annotated schema below — `id`, `email` (unique, lowercased), `reason` (the enum), `provider_event_id`, `bypass_until`, `metadata`, `created_at`, `updated_at` — with an annotation track on the load-bearing columns (the unique-on-email index is what makes the read O(1); the `bypass_until` field is the explicit carve-out slot).

**Beat two — the wrapper-flow simulator.** A `DiagramSequence` walks five frames the student scrubs through. Frame one: a welcome action calls `sendEmail({ to: 'hard-bounced@example.com', ... })`. Frame two: the wrapper normalizes the address and queries `email_suppressions` — finds a row with `reason: 'hard_bounce'`. Frame three: the wrapper returns `{ ok: false, reason: 'suppressed' }` *without* calling Resend. Frame four: a contrasting verification flow calls `sendEmail({ to: 'hard-bounced@example.com', ..., bypassSuppression: true })` (the user is actively trying to verify a new email, the address may have been fixed) — the wrapper sees `bypass_until` is in the future or the explicit bypass flag, calls Resend, the message is sent. Frame five: the marketing flow's `bypassSuppression: true` PR is rejected at code review — the carve-out is for verification and security only, the option exists but the team grants it explicitly per flow. A side counter tracks "suppressed-but-sent" events across both flows — the welcome stays at zero, the verification ticks once with audit trail. The closing rule: the wrapper is the chokepoint, the suppression read is its job, the bypass is a privilege not a default.

**Engagement.** A `Buckets` sort first, to lock taxonomy: ten event descriptions ("Resend webhook delivers `email.bounced` with `bounce.type === 'Permanent'`", "the third soft bounce in a row to the same address", "the user hits 'Mark as spam'", "Resend delivers `email.delivery_delayed`", "the user clicks the unsubscribe link in a marketing email", "an address that hard-bounced six months ago receives a fresh verification request", etc.) sorted into "suppress immediately", "increment soft-bounce counter", "no action — operational signal", or "bypass-eligible re-send". Then a `MultipleChoice` confirmation of four wrapper-design scenarios: *"a teammate moves the suppression check to the calling action because the wrapper feels too magical"* → block, single chokepoint; *"a teammate sets `bypass_until` to 24 hours for the verification flow"* → block, the window is minutes; *"the suppression query times out under DB load and the wrapper fails open"* → block, fail closed (a missed transactional send is recoverable, a sent-to-suppressed event isn't); *"the marketing layer's send respects `manual_unsubscribe`, the transactional layer bypasses it for password resets"* → approve, the reason-aware bypass is the right shape.

**Components.**
- `Figure` wrapping a hand SVG of the taxonomy-to-table arrows for beat one.
- `Figure` wrapping a hand-coded HTML annotated schema beneath the diagram for beat one.
- `DiagramSequence` for the five-frame wrapper-flow simulator in beat two. Each frame is a hand SVG showing the action lane, the wrapper, the table query, the Resend call (or the short-circuit), and the side counter for suppressed-but-sent events.
- `Buckets` for the taxonomy sort.
- `MultipleChoice` for the wrapper-design confirmation round.
- `Aside` (`caution`) below: "the chokepoint is non-negotiable — every send through the wrapper, every suppression check at the wrapper, every bypass auditable in code review; one shortcut here is a reputation incident."

**Project link.** Chapter 8.3.3 builds `lib/suppressions.ts` with the `isSuppressed` helper and wires the `email_suppressions` table from this concept's schema; 8.3.4's welcome action passes through the wrapper unmodified. The webhook handler that *populates* the table arrives in Chapter 12.1.5 — this concept ships the schema and the read; the writer arrives downstream.

---

## Component proposals

None — the chapter ships entirely on existing components.

The chapter's heaviest teaching beats — the deliverability-chain scrub (Concept 1), the spoofing simulator (Concept 6), the DMARC rollout timeline (Concept 7), the reputation-poisoning two-track sim (Concept 9), the retry-race (Concept 5), and the wrapper-flow simulator (Concept 11) — each ride on `DiagramSequence` hosting hand SVGs as its frame slots. The kinetic moment in each is the *scrub* that exposes the cause-and-effect; `DiagramSequence`'s slider already carries that vocabulary, established by 6.1's pool-exhaustion scrub and 6.5's deploy-boundary timeline. No bespoke component earns its weight against that toolkit, and a "DeliverabilityChain" or "DmarcRollout" widget would be single-use without a credible forward-link (the chapter is the only place these visuals appear in the curriculum, with Chapter 8.3 and 12.1.5 reusing the *vocabulary* by reference rather than re-rendering the components).

The remaining concepts each reach a strong fit with `Figure` + hand-coded HTML tables (Concepts 2, 3, 8 for trigger and reference catalogs), `Figure` + hand SVG (Concepts 6, 10, 11 for anatomy and contrast), `AnnotatedCode` (Concept 4 for the wrapper walk), `CodeVariants` (Concept 4 for the call-site contrast), `Steps` (Concept 3 for the ceremony), and the existing exercise components (`Buckets`, `MultipleChoice`, `Tokens`, `Sequence`, `TrueFalse`, `Matching`).

The chapter validates the same posture as 6.5 and 7.1: when the existing toolkit's visual primitives (the scrub, the annotated table, the side-by-side contrast) carry the kinetic moment that teaches, the bespoke component proposal is the wrong reach. The chapter's build cost is the *content* — the curated SVG frames for the seven `DiagramSequence`-hosted scrubs, the hand-coded HTML tables for Concepts 2/3/8, and the wrapper-anatomy `AnnotatedCode` for Concept 4.

## Build priority

No new components to build. The authoring effort lands on the SVG content for the chapter's seven `DiagramSequence` artifacts, which carry most of the teaching weight:

- **Concept 1's deliverability-chain scrub** is the chapter's most-referenced visual — every later concept points back to one of its links, and Chapter 8.3.5's verification reads as a walk down the chain. Author this first; the rest of the chapter's prose anchors on it.
- **Concept 6's spoofing simulator** carries the chapter's heaviest conceptual load (DMARC alignment) and is the single visual most likely to be re-shared as standalone teaching outside the course; budget the most polish here.
- **Concept 11's wrapper-flow simulator** is the architecture diagram the project chapter (8.3) and the webhook chapter (12.1.5) both reference structurally; author with the forward-link to those chapters' vocabulary in mind.

The forward-link to flag for future curation: if a `MailFlow` or `EmailJourney` named composition emerges as a recurring artifact across Chapter 8.3, Chapter 9.3 (verification, magic-link, password-reset), Chapter 12.1.5 (the bounce webhook handler), and Chapter 14 (the notification dispatcher), the deliverability-chain visual from Concept 1 becomes the natural seed for a small named primitive. At one chapter of use, the hand SVG inside `DiagramSequence` is the right scope.

## Open pedagogical questions

- Concept 6's four-frame spoofing simulator depends on `DiagramSequence` carrying enough visual weight per frame to render two domains' SPF/DKIM checks plus the alignment verdict plus the inbox state without crowding. If the per-frame budget feels tight, the simulator splits into two consecutive `DiagramSequence`s (legitimate-send + spoofing-attack) with prose linking them, or each frame collapses to a smaller hand SVG with the secondary detail moved to a side annotation column.
- Concept 9's two-track reputation-poisoning simulation wants both tracks scrubbing in parallel under one slider — `DiagramSequence`'s single-slot model may not host two synchronized lanes cleanly. Confirm whether the component carries a side-by-side two-lane variant, or whether the simulation lives as two separate `DiagramSequence`s (mixed-subdomain track, split-subdomain track) with the contrast rendered via aligned timestamps in the prose.
- Concept 11's beat-two wrapper-flow simulator and Concept 5's retry-race timeline overlap structurally — both walk an action through a wrapper-then-Resend flow with a side counter. If the rendering becomes repetitive on the page, consolidate the visual vocabulary (the action lane, the wrapper, the Resend call, the side counter) into one shared SVG style across both concepts so the student reads them as variations on a single primitive rather than two unrelated diagrams.
