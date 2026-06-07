# The transactional subdomain split

- Title: The transactional subdomain split
- Sidebar label: Subdomain split

## Lesson framing

**Archetype.** Decision lesson, 30-40 min. Almost no application TypeScript — the deliverable is a *naming + architecture decision*, not code. The only code shape is the `from`/`replyTo` strings inside the already-built `sendEmail` wrapper (L1). Spend the budget on the *why* and the decision rules, not syntax.

**The one thing the student must leave with.** Email reputation is tracked **per sending domain** by the mailbox providers, so transactional and marketing mail must ride on *separate subdomains* — `send.yourapp.com` vs `marketing.yourapp.com` — or a marketing campaign's spam complaints will silently sink the password-reset email into the spam folder, breaking signup for a reason the product team can't see. This is a day-one decision because retrofitting after the reputations are already mixed costs months of subdomain warmup.

**Mental model to build (simplified → complex).**
1. Start concrete: a single mailbox provider (Gmail) keeps a *reputation score* for each domain that mails it.
2. Layer the divergence: transactional mail earns a *good* score (high opens, near-zero complaints); marketing mail earns a *worse, volatile* score (lower opens, real complaint churn).
3. Layer the failure: one shared domain = one shared score = the worse stream drags down the better one.
4. Resolve: split the streams onto separate subdomains so each carries its own score. The apex stays for humans.

**Why this lands here.** Continuity: L1 already used `send.yourapp.com` as a *given* and shipped `DEFAULT_FROM = 'YourApp <noreply@send.yourapp.com>'` plus the `replyTo` prop on `sendEmail`. L2 published SPF/DKIM on `send.yourapp.com` and DMARC at the apex, and explicitly flagged "the *why we split* and the full address conventions are L3's." This lesson pays both debts: it justifies the subdomain the prior two lessons assumed, and fills in the address-convention table.

**Pain points to pre-empt (where beginners get this wrong in production).**
- "We'll separate later." → almost always means never; the lesson must frame the split as cheap *now*, expensive *later*. This is the emotional core — lead the conclusion with it.
- Sending automated mail from the apex `yourapp.com`, coupling the founders' own outbound inboxes to the app's deliverability incidents.
- `noreply@` with no `replyTo` — a dead-end that's both bad UX and a faint negative reputation signal (Gmail notices consistently-unreplied-to senders).
- Conflating "separate subdomain" with "separate provider / dedicated IP." Beginners over-engineer (dedicated IPs at 100 emails/month) or under-engineer (one address for everything). The lesson must name the *pragmatic early-stage call*: one Resend account, two verified subdomains, shared IP — 80% of the isolation, zero IP ops. Defer dedicated IPs until volume justifies them.
- In multi-tenant SaaS: thinking mail should come *from* the customer's domain (`acme.com`). It comes from `send.yourapp.com` with Acme's content inside. Tenant-domain sending is a separate product feature, out of scope.

**Teaching vehicles.** Two interactive beats carry the lesson:
- A **reputation divergence diagram** (the core visual) showing shared-domain pollution vs split-domain isolation.
- A **`StateMachineWalker` decision tree** for "is this send transactional or marketing?" — the spine of the lesson, since the *decision* is the deliverable. The walker forces the student through the senior's question order.
- A **`Buckets` exercise** to drill the transactional/marketing classification on concrete examples.

Code is minimal: one small `Code` block (or `CodeVariants` for the apex-vs-subdomain `from` contrast) showing the `from`/`replyTo` shape. No new files, no `sendEmail` signature changes.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely: the app sends password resets, invoice receipts, and an opt-in monthly product newsletter. All three are "email." Do they share a domain, a subdomain, an API key, a from-address? Name the stakes up front: get this wrong and a marketing campaign's complaints can push the password-reset email into spam, breaking signup — a deliverability failure invisible in the product dashboard. Preview the deliverable: by the end the student can draw the transactional/marketing line, knows the `send.` vs `marketing.` architecture, and can write the per-purpose `from`/`replyTo` shape. Connect back: L1 already used `send.yourapp.com`; this lesson explains *why* that subdomain exists. Keep it to ~4 sentences, warm and terse.

### Transactional mail vs marketing mail

Teach the conceptual line first — it's the foundation everything else rests on. Define both crisply:
- **Transactional**: triggered by a specific user action, contains information the user expects and needs to operate their account — verification, password reset, invoice receipt, order confirmation, security alert.
- **Marketing**: sent on the *sender's* schedule, promotional/informational content the user opted into but didn't trigger — newsletter, drip campaign, feature announcement, win-back.

Make the line *operational, not aesthetic*: the reason it matters is (a) legally, transactional mail is exempt from the CAN-SPAM/one-click-unsubscribe requirement *because* a user can't reasonably opt out of password resets while keeping an account, and (b) mailbox providers track the two reputations separately because the recipient's *expectation pattern* differs. Tie the unsubscribe line back to L2 (which named the RFC 8058 one-click bar and the transactional exemption) — confirm: transactional subdomain carries no `List-Unsubscribe` header; that's a marketing concern, out of scope here.

**Exercise — `Buckets` classification.** Place right after the definitions so the student commits before the nuance. Two buckets: `Transactional`, `Marketing`. ~8 items mixing the obvious and the genuinely ambiguous so the exercise teaches the *edges*:
- Transactional: "Email-verification code at signup", "Password-reset link", "Receipt for a subscription charge", "Sign-in from a new device alert".
- Marketing: "Monthly product newsletter", "‘We miss you' win-back after 30 days inactive", "Announcement of a new feature to all users", "‘Your free trial ends in 3 days, upgrade now' upsell".
Use `instructions` to frame: "Sort each send by whether the user *triggered* it and *needs* it." The ambiguous ones (trial-ending upsell, feature announcement) seed the decision-rule section. After Check, a short paragraph debriefs the trap cases — the trial-ending email *feels* transactional but is a scheduled upsell → marketing.

### Why the two reputations diverge

This is the *causal* core — answer "so what if they mix?" Walk the divergence as a cause→effect chain (low cognitive load: one factor at a time):
- Transactional: high open rates (people open password resets), near-zero complaint rates (nobody marks a welcome email as spam), zero "sent to people who didn't ask" volume → a strong, stable reputation.
- Marketing: lower opens, materially higher complaints (subscriber forgot they opted in three years ago), inherent unsubscribe churn → a weaker, volatile reputation.
- The failure: when both share one sending domain, they share **one reputation score**. Marketing complaints depress the score → a *verification* email lands in spam → the user can't complete signup → the funnel breaks, and the cause is invisible to the product team (they see "signups dropped," not "Gmail is spam-foldering our verification mail").

**Diagram — reputation pollution vs isolation (the core visual).** Goal: make "one score vs two scores" viscerally obvious. Use a `TabbedContent` with two tabs (or `DiagramSequence` if a before/after scrub reads better; prefer `TabbedContent` for a clean A/B). Author both panels as plain HTML+CSS inside `Figure` (per the diagrams guide: color-coded segments with callouts → HTML+CSS).
- **Tab "Shared domain (the trap)"**: two source boxes — green "Transactional sends" and amber "Marketing sends (complaints)" — both flowing into a *single* `yourapp.com` reputation meter rendered in the warning zone, with an arrow out to a "Gmail inbox vs spam" split where the verification email is shown landing in *spam*. Caption: the marketing complaints dragged the shared score down; the transactional mail pays the price.
- **Tab "Split subdomains (the fix)"**: the same two sources, now flowing into *two separate* meters — `send.yourapp.com` (healthy/green) and `marketing.yourapp.com` (warning/amber) — each with its own inbox outcome. The transactional verification email lands in the inbox regardless of the marketing score. Caption: two domains = two independent scores; the password-reset inbox placement is immune to the campaign.
Keep total height under ~800px; horizontal flow. This single contrast is the lesson's payoff image — invest in it.

### The subdomain architecture

Now give the concrete 2026-default layout. Use a `Figure` containing a small HTML/CSS or `<ArrowDiagram>` tree of the three zones (if `ArrowDiagram`, remember `expandable={false}` per L1's leader-line gotcha):
- **Apex `yourapp.com`** — corporate/human domain. One-to-one human mail only (employee mailboxes via Google Workspace, support replies). Often *no automated sending at all*. Why: keep the founders' outbound decoupled from app deliverability incidents.
- **`send.yourapp.com`** (alt: `mail.`) — the transactional subdomain. All Resend transactional sends. SPF/DKIM published here (L2), DMARC inherited from apex (L2). This is the one in scope for the project.
- **`marketing.yourapp.com`** (alt: `news.`) — the marketing subdomain, *only when* the app sends marketing mail. A *separate* Resend domain (or a separate marketing-focused ESP). Different DKIM keys, different SPF, separate reputation. Named here so the student doesn't conflate it later; not built in the project (transactional-only).

Stress: the *names* are convention, not protocol — pick them and keep them identical across `dev`/`preview`/`production`. Connect to L2: adding a future marketing subdomain means re-running the DMARC `none→quarantine→reject` progression for it, because apex DMARC at `reject` will hard-bounce any new subdomain that isn't aligned through its own DKIM. This is a forward-looking watch-out that ties the chapter together.

Use `Term` here for **apex domain** (re-explain concisely — introduced in L1 but worth a hover refresher) and **ESP** (Email Service Provider).

### What "separate" actually means — and how far to take it

Address the over/under-engineering trap head-on. Define what real separation requires: mailbox providers track reputation per **domain + sending IP**. Full separation = different IP ranges, different DKIM selectors, different DMARC report streams. Routing both streams through the *same* provider on the *same* shared IP pool only *partially* separates them.

Then give the senior's pragmatic threshold (defaults-before-conditionals — name the threshold the default crosses):
- **Early-stage default**: one Resend account, two verified subdomains, both on Resend's shared IP. The separate subdomains + separate DKIM already buy ~80% of the reputation isolation with **zero IP-management overhead**. Ship this.
- **The 20% gap** (dedicated IPs, separate provider accounts, Postmark-style message streams): earns its weight only above roughly **50k emails/month**. Below that, a dedicated IP can actually *hurt* (too little volume to establish warm reputation).

Frame as a senior judgment call, not a checkbox. A short `Aside` (note) can hold the "dedicated IPs need warmup volume — don't reach for them early" nuance so it doesn't interrupt the main thread.

### From-address conventions: the local part as an intent signal

Now the address discipline — the small bit of concrete syntax. Teach the principle first: **name the local part for the intent the user reads off the From line, not the system that sent it.** `notifications@` is good; `auth-service-prod@` is a code smell. Connect to L1's `from` anatomy (`'Display Name <local-part@verified.subdomain>'`).

Present the convention table (a small markdown table or `CardGrid` — table is denser, prefer it):
- `noreply@send.yourapp.com` — automated, non-replyable mail (verification codes, magic-links). **Must** pair with `replyTo` → a monitored support inbox.
- `billing@send.yourapp.com` — invoices, dunning. Replyable (to billing).
- `security@send.yourapp.com` — security alerts. Replyable, the kind users filter to high priority.
- `support@yourapp.com` / `hello@yourapp.com` — genuinely replyable human mail. Lives on the *apex*, backed by a Google Workspace mailbox.

**Code — the `from`/`replyTo` shape.** Use `CodeVariants` to contrast the wrong and right shape (the component is purpose-built for incorrect/correct), reusing the L1 `sendEmail` call shape (camelCase `replyTo`, `to`, `subject`, `react`) — do **not** introduce a new API:
- Variant "Dead-end (avoid)": `from: 'YourApp <noreply@send.yourapp.com>'` with no `replyTo`. Prose: a user replying hits a black hole; Gmail penalizes consistently-unreplied senders.
- Variant "Replyable bot (do this)": same `from`, plus `replyTo: 'support@yourapp.com'`. Prose: the user sees the bot identity in their inbox, but Reply lands in a human-monitored place.
Keep each variant's prose to one paragraph. Below the block, state the reflex: every transactional send either sets `replyTo` to a monitored mailbox or uses a `from` that is itself monitored.

`Term` candidates here: **local part** (the bit before the `@`), **dunning** (the sequence of payment-retry/overdue emails — non-obvious term).

### Deciding the borderline cases

The decision-rule section — the spine, since the *decision* is the deliverable. Some sends are genuinely ambiguous (the trial-ending upsell from the Buckets exercise, a billing-related newsletter, an opted-in digest). Give the student the senior's ordered question funnel.

**`StateMachineWalker` (`kind="decision"`).** Do not wrap in `Figure`. Build the funnel in the order a senior asks:
- Root `triggered` — "Did the user trigger this with a specific action they just took?" → Yes leads toward transactional; No continues.
- `recurring` — "Is it a recurring scheduled send with the same content shape for many users?" → Yes → marketing leaf.
- `content` — "Does it contain only information the user needs to operate their account, or also promotion/upsell?" → Pure-need → transactional leaf; Mixed → marketing leaf.
- A `still-unsure` tie-breaker reachable from the ambiguous branches → **default to marketing.** Leaf rationale: routing a marketing email through the transactional subdomain costs reputation drag (the expensive mistake); routing it through marketing costs nothing extra (deliverability is the same, the user still gets the mail). The asymmetry makes "when unsure, marketing" the safe default.
- Leaves: `leaf-transactional` (verdict "Transactional → `send.yourapp.com`") and `leaf-marketing` (verdict "Marketing → `marketing.yourapp.com`"), each with a one-line justification and the subdomain it routes to.

This reinforces the architecture by making every decision end at a concrete subdomain. The pedagogical point lives in the *order* (triggered → recurring → content → default-marketing), not any single leaf.

### Multi-tenant sending: your domain, not the tenant's

Short but important — a common beginner mistake in B2B SaaS. The rule: in a multi-tenant SaaS, *all* mail flows from the app's own verified domain (`send.yourapp.com`), **not** from the tenant's domain. A customer at `acme.com` who triggers a billing receipt gets mail from `send.yourapp.com` with Acme's content *inside* the message. Sending *from* the tenant's domain (per-tenant CNAME + DKIM delegation) is a separate, heavyweight product feature — name it once, mark it out of scope, and note it's rarely worth the operational tax until a specific paying customer demands it. Keep to one tight paragraph; this is a guardrail, not a topic.

### Why this is a day-one decision

Close by landing the emotional core as the takeaway (this is the sentence the student should remember). Synthesize the watch-outs into the argument *for splitting now*:
- Mixing the two streams on one subdomain is the *silent* reputation killer — invisible to the product team until signup mysteriously drops.
- Sending automated mail from the apex couples the founders' own outbound to app incidents.
- `noreply@` without `replyTo` is bad UX *and* a faint negative signal — always pair.
- Retrofitting the split *after* the reputations are already mixed means months of warmup on a fresh subdomain, while the mixed one stays degraded. "We'll separate later" almost always means "we won't."
Therefore: ship the split on day one — it's nearly free now (two DNS verifications, two from-addresses) and brutally expensive later. Use a `Aside` (caution) for the retrofit-cost point so it visually anchors as the lesson's strongest warning.

Optionally close with one `ExternalResource` LinkCard to Resend's docs on subdomains / sending domains (verify the canonical URL during fact-check) for the student who wants the provider's own take. Only include if a current, on-point page exists.

## Scope

**Prerequisites to recall briefly (do not re-teach):**
- The `sendEmail` wrapper, `from`/`replyTo`/`to`/`subject`/`react` shape, `Result` return, `DEFAULT_FROM` (all from L1 — use as given, reuse exact shapes).
- SPF/DKIM/DMARC mechanics, the DNS records, alignment, the `none→quarantine→reject` progression, the 2026 bulk-sender bar, the 0.3%/0.1% complaint thresholds (all from L2 — reference, never re-explain). This lesson only *uses* the fact that each subdomain has its own SPF/DKIM and that apex DMARC inherits down.

**Out of scope (belongs elsewhere — do not teach):**
- The DNS records themselves and how to publish/verify them (L2 of this chapter).
- The send call, the SDK install, the verified-domain ceremony, API-key shapes, idempotency (L1 of this chapter).
- The suppression list, `email_suppressions` table, complaint-rate budget *mechanics* (L4 of this chapter) — this lesson may *mention* complaint rate as the cause of reputation drag but must not define the table or the budget bands.
- The bounce/complaint webhook handler (Ch 063).
- Marketing-email infrastructure — Resend Broadcasts, dedicated marketing ESPs, actually *building* the `marketing.` subdomain, `List-Unsubscribe`/RFC 8058 implementation (out of scope; the project sends transactional only — name the marketing side as the contrast, never build it).
- Per-tenant custom-domain sending (CNAME/DKIM delegation) — named once, explicitly dropped.
- Dedicated IPs / IP warmup procedure (named as the deferred 20%, not taught).

**No new code files, no schema, no `sendEmail` signature change.** The only code is illustrative `from`/`replyTo` strings reusing L1's API. This is by design — a decision lesson.
