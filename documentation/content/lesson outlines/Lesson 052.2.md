# Lesson 052.2 — Authenticating the sender: SPF, DKIM, DMARC

## Lesson framing

This is the conceptual heavyweight of Chapter 052: three email auth protocols, the alignment rule that ties them to the visible `From:`, and the 2024-2025 enforcement landscape that has made them non-negotiable in 2026. The student arrives from 052.1 with a `Verified` domain in Resend and an SMS-style "the test send arrived" win — but doesn't yet understand why Resend asked for those specific DNS records, what mailbox providers actually check on receipt, and how a misconfigured single record silently kills deliverability for *all* sending paths.

**Target student.** Junior dev with web basics, no SMTP/DNS background. Probably has set a TXT record at a registrar once. Has heard of SPF or DMARC as acronyms but couldn't define them. Will be tempted to "set and forget" — this lesson must install the operational mindset (DMARC is a multi-week rollout, not a record).

**Cognitive load.** Three protocols, each with their own DNS record shape, each with their own pass/fail semantics, plus the meta-protocol (alignment) tying them together. The mental model risk is conflating SPF and DKIM (both TXT, both "auth"), missing that DMARC is layered *on top* (not parallel), and not internalizing that DMARC alignment is what actually protects the brand. Build the model incrementally: SMTP without auth (the problem) → SPF alone (IP-level auth) → DKIM alone (signature-level auth) → DMARC (the alignment layer that makes SPF+DKIM brand-protecting). Diagrams are essential — this topic is fundamentally about message flow and field comparison.

**Mental model to leave with.**
- SPF answers "is this IP allowed to send for this domain?" — checked against the envelope `MAIL FROM`.
- DKIM answers "was this message signed by someone holding the key for this domain?" — checked against the signature's `d=` tag.
- DMARC answers "does at least one of SPF/DKIM pass *and* match the visible `From:` domain?" — and declares what to do when the answer is no.
- All three are operational, not one-time: DMARC requires a staged `p=none` → `quarantine` → `reject` rollout watched via aggregate reports.

**Pain points relieved.** Users reporting "your password reset went to spam"; deliverability dashboards showing `auth=fail` with no clear cause; the silent SPF-10-lookup bust that breaks all sending when a new vendor is added.

**Real production stakes.** A startup ships at `p=none` indefinitely because nobody owns the progression — three months later a phishing campaign spoofs the company and customers don't trust any email from the domain. Or: someone adds a marketing tool that publishes a fourth SPF include, the lookup limit busts, and *every* email (including password resets) starts failing SPF silently.

**Pedagogical approach.**
- Frame each protocol independently before introducing DMARC alignment — DMARC only makes sense once SPF and DKIM are individually understood.
- Heavy diagram use: sequence diagram for the receiver's auth check, annotated email-header illustrations for envelope vs. visible From, a state-machine-style progression diagram for the DMARC rollout.
- Concrete DNS records — show the actual TXT values the student will paste at their registrar; annotate each token.
- The 2026 enforcement landscape gets a dedicated section because it's the *why now* — without it the lesson reads as theoretical.
- An exercise to identify which protocol failed given a header dump.

---

## Lesson sections

### Introduction (no h2)

Open with the senior question from the chapter outline, framed as a narrative: the test send from 052.1 arrived, Resend says `Verified`, so why does the chapter spend a whole lesson on DNS records the student already pasted in?

Frame the answer in two beats:
1. The 2024-2025 Gmail/Yahoo/Microsoft mandates have made SPF+DKIM+DMARC the *minimum* to land in the inbox at all — not just to look professional.
2. Resend handles the *signing* side but the DNS, the DMARC policy, and the alignment correctness live in the student's repo and registrar — the deliverability owner is the senior engineer, not the vendor.

Preview the lesson: what each protocol does, how DMARC alignment glues them together, the staged rollout discipline, how to verify the setup actually works. Brief, warm, 3-4 paragraphs max.

### Why authentication exists: SMTP without identity

Set up the problem briefly — SMTP has no built-in sender verification, the `From:` header is plain text any client can write. A spammer in 2002 could send `From: ceo@bank.com` from anywhere. SPF, DKIM, and DMARC are three layered patches bolted on after the fact.

**Diagram (Mermaid sequence):** A "naive SMTP" send showing a malicious server connecting and claiming `From: someone@yourcompany.com` with no challenge. Pedagogical goal: viscerally show the gap the three protocols fill. Caption: "Without authentication, the `From:` header is honor-system."

Keep this section under ~150 words — the goal is just to motivate the next three sections.

### SPF: authorizing the sending IPs

Define SPF (Sender Policy Framework). The mental model: a TXT record at the sending domain that lists who's allowed to send.

Show the canonical Resend SPF record:

```
TXT  send.yourapp.com  v=spf1 include:_spf.resend.com ~all
```

Use **CodeTooltips** on the record to annotate each token:
- `v=spf1` — version (always this).
- `include:_spf.resend.com` — defers to Resend's own SPF record (so Resend can rotate IPs without the student updating DNS).
- `~all` — softfail for anyone not authorized; explain `-all` (hardfail) tighter but only safe when *all* sending paths go through Resend.

**Key concept to land:** SPF aligns on the *envelope* `MAIL FROM`, not the visible `From:` header. This is the seed for DMARC alignment later — flag it explicitly so the student doesn't have to re-learn it.

**Watch-out callout (`<Aside type="caution">`):** The 10-DNS-lookup limit. Every `include:` counts, and many SaaS sending tools chain their own includes. Adding a fourth or fifth vendor can silently bust the limit and break *all* SPF for the domain. Real production failure mode.

**Diagram (Mermaid sequence):** A receiving MTA checking SPF — connection from IP X, query DNS for `v=spf1` at the sending domain, verify IP X is in the allowed set, return pass/fail. Pedagogical goal: SPF is an IP-level check, not a content check.

### DKIM: signing the message itself

Define DKIM (DomainKeys Identified Mail). The mental model: the sending MTA cryptographically signs the message; the receiver fetches the public key from DNS and verifies the signature.

Show the conceptual DNS shape (the actual key value is too long to display usefully — show a redacted version):

```
TXT  resend._domainkey.send.yourapp.com  v=DKIM1; k=rsa; p=MIGfMA0GCSq...
```

Use **CodeTooltips** to annotate:
- `resend._domainkey.send.yourapp.com` — the *selector* (`resend`) is provider-issued; the `_domainkey.` middle is the convention DKIM mandates.
- `v=DKIM1; k=rsa` — version and key type.
- `p=...` — the public key body.

**Key concept to land:** DKIM aligns on the signature's `d=` tag (the domain the message was signed *for*), independently of both the envelope and the visible `From:`. This is the second seed for DMARC alignment.

**Watch-out callout:** The public key TXT record is long. Some registrars truncate, some wrap in extra quotes, some require splitting into multiple strings. The record silently fails verification. The fix is to paste the *exact* value Resend provides and verify with a DKIM lookup tool.

**Diagram (Mermaid sequence):** Sending MTA signs message with private key → message transits → receiving MTA fetches public key at `selector._domainkey.domain` → verifies signature. Pedagogical goal: DKIM is a content-level check, IP-independent.

### Why SPF and DKIM alone don't protect the brand

Short bridge section before introducing DMARC. The pedagogical purpose: motivate DMARC by showing the gap that SPF+DKIM leaves.

The setup: a phisher buys `phishingdomain.com`, sets up valid SPF and DKIM for it, and sends mail with `From: support@yourbank.com`. SPF passes (for `phishingdomain.com`). DKIM passes (signed for `phishingdomain.com`). The visible `From:` is `yourbank.com` — both checks passed, but on the *wrong* domain. The user sees `yourbank.com` in their inbox client.

This is the alignment problem. Lead directly into the next section.

Use an **annotated illustration** (HTML+CSS in a `<Figure>`): show an email envelope with three labeled fields side-by-side:
- Envelope `MAIL FROM:` `bounce@phishingdomain.com` → SPF checks here
- DKIM signature `d=phishingdomain.com` → DKIM checks here
- Visible `From:` `support@yourbank.com` → what the user sees

Pedagogical goal: make it visceral that the three "from" fields are different, and SPF+DKIM check the wrong ones if you only care about brand protection.

### DMARC: the alignment layer

Define DMARC (Domain-based Message Authentication, Reporting and Conformance). The mental model: a policy at the domain level that says "at least one of SPF or DKIM must pass *and* its checked domain must match the visible `From:` — and here's what to do if neither does."

Show the canonical record:

```
TXT  _dmarc.yourapp.com  v=DMARC1; p=none; rua=mailto:dmarc-reports@yourapp.com; pct=100; adkim=r; aspf=r;
```

Use **AnnotatedCode** to step through each field — the record is dense enough that pointing at one piece at a time helps:
- Step 1: `v=DMARC1` — version.
- Step 2: `p=none` — policy on alignment failure; `none` = monitor only, `quarantine` = spam folder, `reject` = hard-bounce.
- Step 3: `rua=mailto:...` — aggregate XML reports daily to this mailbox.
- Step 4: `pct=100` — percentage of failing mail to apply the policy to (rollout dial; lower while ramping).
- Step 5: `adkim=r` / `aspf=r` — alignment mode, `s` (strict, exact match) vs. `r` (relaxed, subdomain alignment allowed). Explain why most senders start at relaxed.
- Step 6 (optional): `sp=` — subdomain subpolicy; defaults to `p=`; override when subdomain rules need to differ.

**Key concept to land:** the apex DMARC at `yourapp.com` covers all subdomains via inheritance. Publishing DMARC at `send.yourapp.com` only leaves the apex unprotected. Senior reflex: DMARC at the apex.

**Diagram (Mermaid sequence):** Receiving MTA runs both SPF and DKIM checks, then runs the DMARC alignment check — comparing each checked domain against the visible `From:` — then applies the policy (`p=`) based on result. Pedagogical goal: DMARC is a *layer on top*, not a parallel protocol.

### The 2026 bulk-sender bar

Stand-alone section because it's the *why now*. Without this, students will treat DMARC as optional polish.

Use a **CardGrid** to organize the requirements:
- **Authentication.** SPF and DKIM authenticated and aligned on every send. Mandatory.
- **DMARC published.** `p=none` is the floor for being delivered at all to Gmail and Yahoo. `p=quarantine` or `p=reject` is the senior target.
- **One-click unsubscribe.** RFC 8058 `List-Unsubscribe-Post` for *marketing* mail. Transactional mail is exempt — name the exemption here so the student knows password resets don't carry the header (052.3 returns to this).
- **Complaint rate below 0.3%.** Postmaster-tools threshold; 0.1% is the warning zone. Triggers throttling above 0.3%. Suppression discipline (052.4) is how the team manages against this.

Then a short timeline (HTML+CSS phase strip in a `<Figure>`) showing the enforcement progression: Feb 2024 Gmail+Yahoo → 2025 hardening → May 2025 Microsoft → Sep 2025 La Poste → 2026 effective floor. Pedagogical goal: this isn't a "best practice" anymore; it's the bar.

### The DMARC progression: from p=none to p=reject

The operational mindset section. This is what separates the "shipped DMARC once" engineer from the senior who actually owns deliverability.

Walk through the four-step progression using `<Steps>`:
1. **Publish `p=none` with `rua` reports.** Send aggregate reports to a parsing service (PowerDMARC, Postmark, dmarcian — many free tiers). Watch for a week to discover unauthenticated sources (the marketing tool nobody migrated, the support ticket vendor sending on the domain).
2. **Authenticate every legitimate source.** Add SPF includes, get DKIM keys from each vendor, route through subdomains where appropriate.
3. **Roll to `p=quarantine` with `pct=10`.** Ramp `pct` to 100 over a week, watching reports for collateral damage.
4. **Move to `p=reject`.** Once quarantine has been clean for two weeks, hardbounce on alignment failure.

**Diagram (Mermaid `stateDiagram-v2` or `flowchart LR`):** the four-state progression with the gating condition for each transition. Pedagogical goal: this is a multi-week operational process, not a one-time DNS edit.

**Aside (`<Aside type="note">`):** BIMI — name once. With DMARC at `quarantine` or `reject`, the brand can publish a BIMI logo (with a VMC for Gmail's inbox icon). Marketing concern, not a deliverability lever. Out of scope for the project.

### Verifying the setup actually works

Practical section — three concrete checks the student runs after configuring their records.

Use `<Steps>` for the three verification methods:
1. **Auto-reply check.** Send a test to `check-auth@verifier.port25.com`; parse the auto-reply. Show a (fabricated) sample response with `SPF: pass`, `DKIM: pass`, `DMARC: pass` clearly marked.
2. **Gmail "Show original".** Send to a Gmail inbox, open the message, click "Show original". Annotated screenshot or HTML mockup showing the `SPF:`, `DKIM:`, `DMARC:` lines with their results.
3. **Resend dashboard.** The latest send's auth result is visible in the Resend send-log; a failure points at the specific record at fault.

Add a `<MultipleChoice>` exercise here or an `<ExternalResource>` card linking to MXToolbox / DMARC analyzer tools.

### Exercise: reading auth headers

A custom **MultipleChoice** or **Buckets** exercise to verify the student can read a header dump and identify which protocol failed.

Proposed shape: a `Buckets` exercise with 4-6 sample auth header fragments (e.g., `spf=pass smtp.mailfrom=send.yourapp.com header.from=evil.com`) and the student sorts them into "SPF fail", "DKIM fail", "DMARC alignment fail", "all pass". Grading: correct bucket per item.

Alternative: a `MultipleChoice` with a single tricky header showing SPF and DKIM both `pass` but with `header.from` on a different domain, asking what fails. Correct answer: DMARC alignment. This directly tests the alignment-is-the-load-bearing-piece insight.

Pick the `MultipleChoice` shape — tighter, faster, hits the load-bearing concept directly.

### Watch-outs

A consolidated `<Aside type="danger">` block (or a small `<CardGrid>` of cautions) at the end, listing the failure modes from the chapter outline:

- DKIM keys truncated by some registrars — verify the full value lands intact.
- SPF 10-lookup limit — adding a vendor can bust the limit and break everything.
- DMARC only at the subdomain leaves the apex unprotected.
- `p=reject` without staged rollout hard-bounces legitimate legacy mail.
- The three "from" fields are different — envelope, DKIM `d=`, and visible `From:` — and SPF, DKIM, and DMARC each check different ones.

Keep terse — each watch-out is one or two lines, the prose preceding has already established context.

### External resources

A small set of `<ExternalResource>` cards at the bottom:
- Resend's DNS records documentation.
- Gmail Postmaster Tools.
- MXToolbox SPF / DKIM / DMARC checker.
- dmarcian DMARC inspector.
- Optionally a YouTube video — "DMARC explained" style — embedded via `<VideoCallout>` if a high-quality, recent (2024-2025) one exists. Worth flagging but not load-bearing; the diagrams should carry the conceptual load.

---

## Scope

### Already covered in earlier lessons (do not re-teach)

- **052.1 (Resend and the first verified send).** The Resend dashboard ceremony, API-key shapes, the SDK install, the `lib/email.ts` wrapper, the canonical send call, the `from` field format, idempotency keys, rate limits. **Mention only as the prior step** — "in 052.1 you added the records Resend asked for; this lesson explains what they are."
- **Chapter 034 (env validation).** `lib/env.ts` is a given pattern; don't re-derive it.

### Deferred to later lessons (do not pre-teach)

- **052.3 (subdomain split).** Why transactional vs. marketing subdomains; `send.` vs. `marketing.` naming; the `noreply@` + `reply_to` pattern; per-purpose local parts. This lesson uses `send.yourapp.com` in examples but does *not* explain the split.
- **052.4 (suppression list).** The `email_suppressions` table, the read-before-send pattern, the complaint-rate budget mechanics, the bypass carve-out. This lesson *mentions* the 0.3% complaint-rate threshold once (in the 2026 bulk-sender bar section) as part of the enforcement landscape; the discipline is 052.4's job.
- **Lesson 067.5 (bounce/complaint webhook).** How the suppression table gets populated. Not relevant here.
- **Unit 14 (notification dispatcher, batch sends).** Out of scope.

### Out of scope entirely

- **BIMI / VMC procurement.** Named once as the post-`p=reject` marketing reach; not built.
- **ARC (Authenticated Received Chain).** Only relevant for forwarders/mailing lists; not the SaaS transactional path. Not mentioned.
- **Sending IP warmup, dedicated IPs.** Volume-driven concern, not in scope until the project hits ~50k/month — out of scope for the chapter.
- **DMARC report parsing services in detail.** Named (PowerDMARC, Postmark, dmarcian) but not configured.
- **Tenant-domain sending / DKIM delegation per tenant.** 052.3 names this as out of scope; this lesson doesn't surface it.

### Prerequisite concepts the student already has

- **DNS TXT records.** The student has added one in 052.1. Briefly redefine when first used here ("a TXT record is a key-value DNS entry that mailbox providers query at well-known names"), no longer.
- **HTTP-style request/response model.** Carries over to the receiver-side checks; no redefinition needed.
- **Public-key cryptography basics.** For DKIM, a one-sentence reminder ("the sender signs with a private key, the receiver verifies with a public key published in DNS") suffices; do not derive signatures from scratch.
