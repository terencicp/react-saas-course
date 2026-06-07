# Authenticating the sender: SPF, DKIM, DMARC

Sidebar label: SPF, DKIM, DMARC

## Lesson framing

This is the conceptual heavyweight of Chapter 048 and the only lesson in the chapter with almost no application code — the deliverables are DNS records and an operational playbook, not TypeScript.
L1 ended with Resend reporting the domain `Verified` and a test send landing in the inbox.
The senior question that opens this lesson: *if Resend already says "Verified" and the mail arrives, why must I understand SPF, DKIM, and DMARC at all?*
The answer is the load-bearing thesis of the whole chapter, recalled from L1: **deliverability is the app's responsibility, not the vendor's.** Resend signs and sends; the DNS, the DMARC policy, the alignment, and the staged rollout live in the app team's registrar and ops. Resend's "Verified" badge only means "I can sign for you" — it does not mean "every mailbox provider will trust this mail," and it says nothing about brand-spoofing protection.

Pedagogical spine. Three independent checks layered on plain SMTP, taught in dependency order — **SPF and DKIM are peers, DMARC sits on top of both.** The single hardest idea, and the one beginners reliably miss, is **alignment**: SPF and DKIM each pass against a *different* field than the one the human reads (`From:`), so a spammer can pass both on their own domain while displaying `paypal.com`. DMARC is the piece that ties the passing check back to the visible `From:`. Lead every protocol explanation with *what attack it stops* and *which field it checks*, because the three-fields confusion (visible `From:` vs envelope `MAIL FROM` vs DKIM `d=`) is the root of nearly every misunderstanding here. Build the mental model incrementally: first "a check that authorizes senders" (SPF), then "a check that proves integrity" (DKIM), then "the check that makes the other two protect the brand" (DMARC) — never dump all three at once.

Real production stakes frame the urgency without hype. The 2024–2025 enforcement wave (Gmail/Yahoo Feb 2024, Microsoft May 5 2025, La Poste Sept 2025) means unauthenticated bulk mail is now *rejected*, not spam-foldered — and the de-facto bar has crept down to smaller senders. Microsoft's actual rejection string (`550 5.7.515 Access denied … does not meet the required authentication level`) makes the consequence concrete. The student should leave able to (1) explain what each protocol proves and which field it checks, (2) read a DMARC record field-by-field, (3) recognize Resend's DNS records for what they are rather than copy-paste blindly, and (4) run the `p=none → quarantine → reject` progression as an ops practice rather than a one-time DNS edit.

What beginners get wrong in the real world, surfaced as watch-outs *inside the section that teaches the relevant concept* (never bundled at the end): publishing DMARC at the subdomain but not the apex (inheritance runs apex→sub); busting the SPF 10-lookup limit by adding one include too many and breaking *all* SPF; jumping straight to `p=reject` and hard-bouncing a legacy billing tool nobody migrated; truncated/quote-wrapped TXT records that silently fail; conflating the three address fields.

Visual-first where it pays. Two anchor diagrams: an **alignment diagram** (the centerpiece — shows the three fields and which check validates which, with the spoof case) and a **policy-progression timeline**. A `StateMachineWalker` (decision kind) drives the "which `p=` am I ready for?" rollout decision. Light interactive checks (a `Matching` drill for protocol→field, a `Dropdowns` exercise for reading a DMARC record) verify the two ideas most likely to be held shakily. No live-coding component fits — there is no app code to run; DNS records render as `Code` blocks.

Tone per the guidelines: terse, adult, decisions-first. This lesson pays off for the rest of the student's career, so it earns its 45–55 minute weight.

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely: the domain is `Verified`, the test send arrived — so why isn't the job done?
Recall the chapter thesis in one sentence (*deliverability is the app's responsibility, not the vendor's*) and sharpen it: "Verified" is Resend telling you *it* can sign mail for you; it is not Gmail telling you *it* will trust the mail, and it is not protection against someone forging your `From:`.
Name the two gaps this lesson closes: trust at the receiving end (the 2026 enforcement bar) and brand protection (anti-spoofing).
Preview the three protocols in dependency order (SPF + DKIM as peers, DMARC on top) and the one deliverable: a set of DNS records plus a rollout plan.
Keep it to ~4 short paragraphs, warm and brief per the structure guideline.

### Three checks on top of a protocol that trusts everyone

Purpose: install the *why* before any protocol detail — SMTP has no built-in sender verification, so anyone can claim to be anyone. This is the pain point all three protocols relieve, and naming it first makes the rest feel inevitable rather than arbitrary.

Content:
- One paragraph on SMTP's open-trust default: the `From:` header is just text the sender types, like the return address handwritten on an envelope — the post office never checks it. This analogy recurs through the lesson; establish it here.
- Introduce the three-fields distinction *early and visually*, because every later concept depends on it. Use an **annotated illustration** (HTML+CSS, wrapped in `Figure`) of a single email split into its identity-bearing fields:
  - **Envelope `MAIL FROM`** (the "return address" the receiving server replies bounces to) — what **SPF** checks.
  - **DKIM signature `d=` tag** (stamped into a header) — what **DKIM** signs/validates.
  - **Visible `From:` header** (what the human reads in their inbox) — what **DMARC alignment** compares the other two against.
  Pedagogical goal: pre-load the mental model that *the human-visible field is a fourth thing, distinct from what SPF and DKIM each check*. Label each field with the protocol that owns it and a one-line "answers the question…". Keep it horizontal and compact (vertical-space constraint).
- Frame the three as a layered stack, not three unrelated settings: SPF answers "is this server allowed to send for the domain?", DKIM answers "was this message altered, and did the key-holder authorize it?", DMARC answers "do the passing checks actually belong to the domain in the `From:` the user sees, and what should I do if not?"
- Set expectation: SPF and DKIM are peers you publish; DMARC is the policy that makes them mean something.

Components: `Figure` + HTML/CSS annotated illustration. `Term` candidates introduced here: **SMTP**, **MTA**, **envelope sender / `MAIL FROM`** (define as distinct from the visible `From:`).

### SPF — which servers may send for the domain

Purpose: teach SPF concretely as the first, simplest check, and surface its two real-world traps (alignment on the envelope, the 10-lookup limit).

Content:
- Definition: SPF (Sender Policy Framework) is a TXT record at the sending domain listing who may send for it — IP ranges or `include:` references to other senders' policies. The receiving server checks the connecting server's IP against the list.
- The Resend record, shown as a `Code` block (DNS, lang `txt` or `ini`): a TXT record on the sending subdomain with value `v=spf1 include:_spf.resend.com ~all`. Walk it token by token in prose: `v=spf1` (version), `include:_spf.resend.com` (delegate to Resend's published IPs), `~all` (softfail everything else).
- The `~all` vs `-all` decision, framed as a senior call, not trivia: `~all` (softfail — "probably not us, but don't hard-reject") is Resend's default and the safe choice while other systems might still send for the subdomain; `-all` (hardfail) is tighter but only correct once *every* sending path on that subdomain goes through Resend. Name the threshold (defaults-before-conditionals): start at `~all`, tighten to `-all` only when you've confirmed Resend is the sole sender.
- **Alignment foreshadow:** SPF authenticates the *envelope* `MAIL FROM`, not the visible `From:`. State it plainly here and point forward — this is half of why DMARC exists. Tie back to the three-fields illustration.
- Watch-out, taught here because it bites here: the **10-DNS-lookup limit**. Each `include:` (and a few other mechanisms) costs a lookup; SPF allows at most 10 before the whole record is declared `permerror` and SPF fails *entirely* for the domain. The realistic failure: an apex that already includes Google Workspace + Microsoft 365 + three vendors, then someone adds Resend's include and silently breaks all of it. The senior reflex — and a strong argument for the subdomain split that L3 builds — is that a dedicated sending subdomain has its *own* near-empty SPF, so Resend's include lives alone and the limit is never in play. (Name the subdomain as a given; L1 already used it, L3 owns the rationale.)
- Note the MX-for-bounces record Resend also asks for on the subdomain (custom return path so SPF aligns and bounce/complaint feedback flows back) — accept it; the feedback it carries is what L4's suppression list consumes. Keep this to one or two sentences; don't pre-teach suppression.

Components: `Code` for the TXT and MX records. `Term`: **SPF**, **softfail / hardfail** (`~all` / `-all`), **`include` mechanism**. Consider a tiny `Aside` (caution) only if the 10-lookup limit needs visual separation — but prefer keeping it in prose as it's the section's core watch-out.

### DKIM — a signature that proves the message is intact

Purpose: teach DKIM as public-key signing applied to email, in terms the student already has if they've met signatures conceptually; keep the crypto at mental-model depth, not implementation.

Content:
- Definition: DKIM (DomainKeys Identified Mail) — the sending MTA signs each message with a private key; the matching public key is published as a TXT record at a selector subdomain (`resend._domainkey.send.yourapp.com`, where `resend` is the Resend-issued selector). The receiver fetches the public key from DNS and verifies the signature.
- What it proves, stated as two distinct guarantees students conflate: (1) **integrity** — the signed parts weren't altered in transit; (2) **authorization** — whoever signed held the private key for that `d=` domain. It does *not* prove the *visible* `From:` is legitimate on its own (the `d=` domain can differ from the `From:` domain — again, that's DMARC's job).
- The record: a `Code` block showing the selector TXT record shape (a long `v=DKIM1; k=rsa; p=<base64 public key>` value). Don't print a full key; show the shape with the key elided (`p=MIGfMA0…`), and note Resend generates and rotates this — the student copies it, never authors it.
- Walk the moving parts with a small **two-step `DiagramSequence`** (or a single annotated `Figure` if a sequence feels heavy): step 1 — Resend signs with the private key, attaches a `DKIM-Signature` header carrying the selector and `d=` domain; step 2 — the receiver reads the selector, fetches the public key from `<selector>._domainkey.<d=>`, verifies. Pedagogical goal: make "the public key lives in DNS, the receiver pulls it at verify time" concrete, since that's the non-obvious mechanic. Keep boxes label-only and horizontal.
- **Alignment foreshadow:** DKIM aligns on the signature's `d=` tag vs the visible `From:`. Second half of the DMARC motivation. Tie to the three-fields illustration.
- Watch-out, taught here: registrars that **truncate long TXT records or wrap segments in extra quotes** silently break DKIM verification — the record looks present but fails. The fix: paste the exact value Resend issues, and if the registrar splits long strings, follow its multi-string TXT convention rather than hand-editing. This is the single most common "I did everything and it still fails" support ticket; flag it where the long record appears.

Components: `Code` for the selector TXT record; `DiagramSequence` (2 steps) or `Figure`. `Term`: **DKIM**, **selector**, **`d=` (signing domain) tag**, **public-key cryptography** (brief, only if the student needs the reminder — define as "a keypair where the private key signs and the public key verifies").

### Why DMARC is the piece that actually stops spoofing

Purpose: the conceptual climax. Deliver the alignment insight that makes SPF and DKIM matter. This section carries the heaviest pedagogical weight in the lesson — slow down here.

Content:
- Start with the gap, concretely: SPF and DKIM each pass *independently of the visible `From:`*. So an attacker registers `evil.com`, sets up perfectly valid SPF and DKIM for `evil.com`, and sends mail with `From: security@yourbank.com`. Both checks **pass** (on `evil.com`), and without DMARC the receiver has no rule that says "but the `From:` says yourbank.com, and neither passing check belongs to yourbank.com." The brand is unprotected even though authentication "works."
- Define **alignment** as the fix: DMARC requires that *at least one* of SPF or DKIM **passes AND is aligned with the visible `From:` domain**. Aligned = the domain that passed matches the `From:` domain. This single sentence is the lesson's core takeaway — state it, then illustrate it.
- **The alignment diagram — the lesson's centerpiece.** Use a `TabbedContent` with two tabs (or two-step `DiagramSequence`) showing the same three-field email under two scenarios:
  - **Tab "Legitimate send":** envelope `MAIL FROM`, DKIM `d=`, and visible `From:` all on `send.yourapp.com` → SPF aligned ✓, DKIM aligned ✓, DMARC **pass**.
  - **Tab "Spoof attempt":** envelope and `d=` on `evil.com` (SPF/DKIM pass *there*), visible `From:` forged to `yourapp.com` → neither aligned → DMARC **fail** → policy applies.
  Pedagogical goal: make alignment *visible* as "do the passing checks point at the same domain the human sees?" Use color-matching (green when the domain matches `From:`, red when it doesn't) rather than arrows, per the diagram guidance on cyclic/crossing relationships. This is the figure students will screenshot.
- Define DMARC (Domain-based Message Authentication, Reporting and Conformance): a TXT record at `_dmarc.yourapp.com` that declares (a) the alignment policy on failure, (b) where to send reports. It is the *only* one of the three that carries a policy and a feedback channel.
- Re-state the layering: SPF and DKIM are the checks; DMARC is the rule that binds them to the `From:` the user reads and tells receivers what to do when the binding fails.

Components: `TabbedContent` (two scenario tabs) **or** `DiagramSequence`; HTML/CSS for the field boxes with color-matched domains. `Term`: **DMARC**, **alignment** (the key term — define inline as well as via `Term`), **spoofing**.

Interactive check (place at the end of this section, after both alignment foreshadows and the climax have landed): a **`Matching`** drill — left column the three protocols (SPF, DKIM, DMARC), right column "checks the envelope `MAIL FROM`", "signs and validates message integrity via a `d=` domain", "ties a passing check to the visible `From:` and sets the failure policy". Goal: verify the protocol→field mapping that the whole lesson hinges on. Grading: exact pairing.

### Reading a DMARC record field by field

Purpose: turn the student from "knows DMARC exists" into "can read and tune a DMARC record" — the practical skill for the project and for AI-assisted ops.

Content:
- Present the canonical record once, as a `Code` block:
  `v=DMARC1; p=none; rua=mailto:dmarc-reports@yourapp.com; ruf=mailto:dmarc-failures@yourapp.com; fo=1; pct=100; adkim=s; aspf=s;`
- Walk it with **`AnnotatedCode`** (single block, stepped) — this is exactly the "direct attention to multiple parts of one block" case the component is for. One step per field the senior actually reads/tunes, each step ≤ 6 lines:
  - `v=DMARC1` — version marker, required first.
  - `p=` — the policy on alignment failure for the apex: `none` (monitor only — take no action, just report), `quarantine` (spam-folder), `reject` (hard-bounce). The dial that the next section ramps.
  - `sp=` — subpolicy for subdomains; defaults to `p=`. Mention here, used in the inheritance watch-out below.
  - `rua=` — destination for **aggregate** XML reports (daily roll-ups: how much mail passed/failed alignment, from which sources). The single most valuable field at `p=none` — it's how you discover senders you forgot about.
  - `ruf=` — **forensic/failure** reports (per-message, redacted, privacy-limited; many receivers don't send these). Lower value; name it, don't over-sell.
  - `pct=` — percentage of failing mail the policy applies to. The rollout dial (start a stricter policy at `pct=10`).
  - `adkim=` / `aspf=` — alignment mode: `s` strict (exact domain match) vs `r` relaxed (a subdomain of the `From:` org domain counts as aligned). Strict for sensitive apexes; relaxed when subdomains legitimately send. Connect back to the subdomain architecture (L3).
- **Inheritance, taught as the watch-out it is:** the apex `_dmarc.yourapp.com` record covers *all* subdomains by inheritance (`sp=` overrides per-subdomain). The classic mistake: publishing DMARC only at the subdomain (`_dmarc.send.yourapp.com`) and leaving the apex with no DMARC — the apex (the domain attackers most want to spoof) is then unprotected. Senior reflex: publish at the apex; use `sp=` to differentiate subdomain strictness if needed.

Components: `AnnotatedCode` (one step per field, `color` per the component default of blue, red for the policy field to flag it as the dangerous dial). `Term`: **`rua` (aggregate report)**, **`ruf` (forensic report)**, **relaxed vs strict alignment**.

Interactive check: a **`Dropdowns`** exercise over a fenced DMARC record with three or four fields blanked (`p=___`, `pct=___`, `adkim=___`) and a scenario in the prompt ("you want monitor-only, applied to all mail, with strict DKIM alignment") — student selects the values. Goal: confirm they can author, not just read, the record. Pairs well right after the `AnnotatedCode`.

### Rolling out the policy: none, then quarantine, then reject

Purpose: reframe DMARC from a DNS edit into an *operational practice*. This is the senior-mindset payload of the lesson — the student must leave understanding that `p=reject` is a destination reached over weeks, never a day-one setting.

Content:
- The core reframe, stated up front: a wrong `p=reject` doesn't degrade gracefully — it *hard-bounces real mail* from any legitimate sender you forgot to authenticate (the billing tool, the CRM, the founder's mail-merge). So you start permissive and tighten only on evidence.
- The four-stage playbook, as `Steps`:
  1. **Publish `p=none` with `rua` flowing to a report parser.** No mail is affected; you're only collecting the aggregate reports. Name a few report services with free tiers (dmarcian, PowerDMARC, Postmark's DMARC monitoring) — the student should not hand-parse XML.
  2. **Watch a week, authenticate every legitimate source.** The reports reveal who's sending under your domain. Add SPF includes, wire DKIM, route stray senders through your subdomain until everything legitimate is aligned.
  3. **Move to `p=quarantine` with `pct=10`, ramp `pct` to 100 over a week**, watching reports for collateral damage.
  4. **Move to `p=reject` once quarantine has been clean for ~two weeks.**
- **The progression visualized.** A horizontal **policy-progression timeline** (HTML/CSS phase strip, wrapped in `Figure`) — four phases left to right (`none` → `quarantine pct=10→100` → `reject`), each annotated with "what's at risk" (nothing → some failing mail spam-foldered → failing mail rejected) and "what you're watching" (discover sources → confirm no false positives → steady-state). Pedagogical goal: make the *ramp* legible as a deliberate de-risking sequence, not arbitrary steps. Keep phases as fixed-width cells so the time axis reads cleanly.
- Set the project expectation explicitly (continuity): the student's first deploy lands at **`p=none` plus monitoring** and graduates over the project's lifetime — this is the realistic senior posture, and it's what the project chapter (Ch 050) will ship.

Interactive decision aid: a **`StateMachineWalker`** (`kind="decision"`) titled "Which DMARC policy are you ready for?" The walk forces the senior's question order:
- Q: "Are aggregate reports flowing and have you watched them?" → No → Leaf: *Stay at `p=none`, set up `rua` first.*
- Yes → Q: "Is every legitimate sender authenticated and aligned in the reports?" → No → Leaf: *Stay at `p=none`; authenticate the stragglers before tightening.*
- Yes → Q: "Has a `quarantine` window run clean (no legit mail failing)?" → No → Leaf: *Move to `p=quarantine pct=10`, ramp `pct`, watch ~1 week.*
- Yes → Leaf: *Move to `p=reject`.*
Goal: cement that each step is gated on *evidence from reports*, not a calendar. This is the lesson's senior-judgment exercise.

Components: `Steps`, `Figure` + HTML/CSS timeline, `StateMachineWalker`. `Term`: **DMARC aggregate report** (if not already termed), **collateral damage / false positive** (in this context).

### The 2026 bulk-sender bar

Purpose: ground the whole lesson in the external deadline that makes it non-optional in 2026. Keep it concrete (real dates, real rejection string) and non-hyped.

Content:
- The enforcement timeline, as a short ordered list or compact `Card`/`CardGrid` (one card per provider): Gmail + Yahoo (Feb 2024, the original "5,000 messages/day to personal accounts" bar), Microsoft Outlook/Hotmail/Live (enforcing May 5 2025, same threshold), La Poste (Sept 2025). The senior read: the explicit threshold is 5,000/day to consumer mailboxes, but enforcement has hardened so the bar applies *de facto* to smaller senders too — build to the bar from day one regardless of volume.
- Make the consequence concrete: failing mail is now **rejected**, not spam-foldered. Quote Microsoft's actual SMTP response: `550 5.7.515 Access denied, sending domain … does not meet the required authentication level`. Pedagogical goal: "rejected" must feel different from "went to spam" — the user never receives it, the signup funnel breaks invisibly.
- The 2026 baseline checklist (use `Checklist` or a tight bulleted list — a recap the student can scan):
  - SPF and DKIM authenticated **and aligned** on every send.
  - DMARC published — `p=none` is the *minimum to send at all* to major providers; `p=quarantine`/`reject` is the senior target.
  - **One-click unsubscribe** (RFC 8058: `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) for **marketing** mail. **Transactional mail is exempt** from the unsubscribe requirement but **not** from authentication — draw this line clearly; it's a common confusion and L3 owns the transactional/marketing split.
  - Spam complaint rate **below 0.3%** (Gmail's enforcement threshold); **above 0.1%** is the warning zone. Name it here as a provider requirement; **L4 owns** the suppression discipline and the budget mechanics — do not pre-teach the table.
- Verifying your setup, as `Steps` (the satisfying "prove it works" close):
  1. Send a test to a header-parsing verifier (e.g. the auto-reply at a tool like `learndmarc.com` / a `check-auth`-style address) — it reports SPF, DKIM, DMARC results.
  2. Send to a Gmail inbox, open **Show original**, confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
  3. The Resend dashboard shows the latest send's auth result; a failure points at the misconfigured record.

Components: `Card`/`CardGrid` for the provider timeline; `Checklist` or bullets for the baseline; `Steps` for verification; `Code` for the SMTP rejection string and the `List-Unsubscribe` headers. `Term`: **one-click unsubscribe / RFC 8058**, **complaint rate**, **postmaster tools**.

External resources (LinkCards / `ExternalResource`, optional, end of lesson): Resend's email-authentication guide; Google's sender-guidelines FAQ; one DMARC report-parser service's docs.

### BIMI, in one paragraph

Purpose: name the "what's after reject?" question once so the student isn't blindsided later, then explicitly de-scope it. Keep to a single short subsection (or even a closing `Aside`) — the chapter outline says "named once, dropped."

Content: once DMARC is at `quarantine`/`reject`, a domain *can* publish a BIMI record pointing at an SVG logo (plus, for the Gmail inbox-icon slot, a Verified Mark Certificate tied to a registered trademark) to render the brand logo beside the sender. The senior framing: BIMI is a marketing/brand lever that *depends on* DMARC enforcement, not a deliverability lever — ship it after `p=reject` is stable, if the brand wants it. Not part of the project MVP. One paragraph, then move on.

Components: prose or a single `Aside` (note). `Term`: **BIMI**, **VMC (Verified Mark Certificate)**.

## Scope

Prerequisites to recall *briefly* (already taught — do not re-teach):
- Resend chosen as the 2026 transactional provider, the verified-domain ceremony, the `from` anatomy, `RESEND_API_KEY` in `lib/env.ts` (`@t3-oss/env-nextjs` + Zod), the `lib/email.ts` wrapper, idempotency key (L1). This lesson references "Resend gives you DNS records" as the handoff L1 promised and explains those records — it does **not** re-walk the dashboard verification UI.
- Apex domain, DNS propagation, ESP, deliverability (`Term`-introduced in L1) — assume known; re-`Term` only if genuinely needed.

Explicitly out of scope (owned by other lessons — name as forward links where natural, do not teach):
- **The transactional vs marketing split and the subdomain rationale** — L3 (Ch 048). This lesson *uses* `send.yourapp.com` as a given (L1 already did) and may note that a dedicated subdomain keeps SPF under the 10-lookup limit, but the *why we split* argument and the full address conventions are L3's. Do not teach `marketing.yourapp.com`.
- **The `email_suppressions` table, the read-before-send chokepoint, the complaint-rate budget mechanics, bounce/complaint taxonomy** — L4 (Ch 048). This lesson names the 0.3%/0.1% thresholds as *provider requirements* and notes the MX record carries bounce/complaint feedback, but stops there.
- **The bounce/complaint webhook handler (Svix signature verification, writing to `email_suppressions`)** — Ch 063 L5. Not even foreshadowed beyond "feedback flows back."
- **React Email templates / the `react` prop internals** — Ch 049. Not relevant here.
- **One-click unsubscribe *implementation* / marketing-mail infrastructure** — out of scope; named only as a line item on the 2026 bar with the transactional exemption.
- **BIMI/VMC procurement, SVG constraints** — named once and dropped (see final subsection).
- **ARC (Authenticated Received Chain)** — relevant only to forwarders/mailing lists, not the SaaS transactional path. Omit entirely (don't even name) unless a single clause prevents confusion.

Code posture: this lesson ships **no application TypeScript**. All code blocks are DNS records (`Code`, lang `txt`/`ini`) and one SMTP response string. No live-coding components apply (there is nothing to execute). Per code conventions, the only app-code touchpoint already exists (`RESEND_API_KEY` via `@t3-oss/env-nextjs` from L1) and needs no change here — note this deliberate absence so a downstream agent doesn't invent code to fill the lesson.

## Notes for downstream agents (fact-check results)

Verified against current sources (June 2026), apply as written:
- **Resend's DKIM is a TXT record** containing the public key at the selector subdomain (`resend._domainkey.<domain>`), **not a CNAME** — confirmed on Resend's official domains docs. Some third-party guides describe a CNAME-delegation variant; ignore it, teach Resend's default TXT shape.
- **Resend's SPF** = `v=spf1 include:_spf.resend.com ~all` (TXT) **plus an MX record** on the sending subdomain for bounce/complaint feedback (custom return path) — confirmed. Mention both records.
- **Microsoft enforcement: May 5 2025**, threshold 5,000 messages/day to consumer domains (Outlook/Hotmail/Live), `p=none` minimum, rejection string `550 5.7.515 …` — confirmed verbatim.
- **Gmail/Yahoo: 0.3% complaint-rate enforcement threshold, 0.1% recommended ceiling; one-click unsubscribe (RFC 8058) required for marketing, transactional exempt** — confirmed by Google's official sender-guidelines FAQ.
- Keep DMARC field semantics as written (`p`/`sp`/`rua`/`ruf`/`pct`/`adkim`/`aspf`); all standard and stable.
