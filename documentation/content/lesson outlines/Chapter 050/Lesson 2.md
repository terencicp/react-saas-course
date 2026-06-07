# Chapter 050 — Lesson 2 outline

## Lesson title

**The verified-domain ceremony** (chapter-outline title fits — keep).
Sidebar: **Verified-domain ceremony**.

## Lesson type

`Walkthrough` — a one-time setup ceremony at the Resend dashboard and the student's registrar. No application code is written; no test suite runs for this lesson (no `pnpm test:lesson` entry). Step-by-step scaffolding with watch-outs, no exercises.

## Lesson framing

The student walks away with a transactional subdomain reading `Verified` in Resend and SPF/DKIM/DMARC live on their own registrar — the deliverability floor that gates every send in the rest of the chapter and every later unit (auth, invites, billing, notifications). The senior payoff: deliverability is infrastructure you stand up once and reuse, not a per-feature concern; the sandbox sender (`onboarding@resend.dev`) is explicitly rejected because proving DKIM-pass on *your* domain is the whole point. If verification fails here, nothing downstream works — so this lesson is the unblocking gate, deliberately separated from code so a stalled DNS propagation never blocks the build.

## Codebase state

**Entry.** Starter runs locally from Lesson 1: `pnpm dev` serves `/inspector/send-welcome` with the form beside the preview iframe (skeleton template), the send button returns the stub `err('internal', 'Not implemented')`. `.env` carries placeholder values (`RESEND_API_KEY=re_xxx`, etc.). Postgres up via `docker compose`, migration applied, seed run with the shipped `suppressed@send.acme.example` placeholder row. No Resend account or DNS records exist yet on the student's domain.

**Exit.** No application files change. External state and one repo edit:
- Resend account exists; two sending-only API keys created (one `dev`, one `production`); the `dev` key is stored in a password manager, ready to drop into `.env` in Lesson 3.
- The sending subdomain `send.<student>.<tld>` reads `Verified` in the Resend dashboard.
- SPF TXT, DKIM TXT (`resend._domainkey` selector), and the apex DMARC record (`p=none`) are live at the registrar and resolve via `dig`.
- A Resend-dashboard test send to the student's personal inbox shows SPF=PASS, DKIM=PASS, DMARC=PASS in "Show original".
- `scripts/seed.ts` placeholder edited from `suppressed@send.acme.example` to `suppressed@send.<student>.<tld>` (the only repo change; `pnpm db:seed` re-run if the student wants the row to match their domain — note it is never a real receiving address).

`.env` still holds placeholders; the API key is *not* pasted into `.env` yet (that lands in Lesson 3 alongside the env-schema additions).

## Lesson sections

Walkthrough structure: an unheaded intro paragraph, then one h2 per ceremony stage following the step sequence in the chapter outline, a short head-meta diagram, and a closing external-resources section. Each stage is a `Steps` procedure with `Aside` watch-outs inline at the point of failure.

### Introduction (no header)

One paragraph: deliverability is set up once and reused forever; this ceremony re-runs the chapter 048 setup (lessons 1–3) against the student's *own* registrar so the subdomain is `Verified` before any code. State plainly that no code is written here and that a stalled DNS record is the most common blocker, which is why this is its own lesson. Reaffirm the Lesson-1 prerequisite: a cheap real domain is required, the sandbox sender is out. Link chapter 048 lessons 1–3 for the *why* behind each record; this lesson is the *doing*.

A tiny orientation diagram fits here — a horizontal flow showing where each record lives and what it proves. Brief: Mermaid `flowchart LR` (or `<ArrowDiagram>`) wrapped in `<Figure>`: `Registrar DNS (SPF / DKIM / DMARC TXT)` → `Resend (sends from send.<domain>)` → `Receiving inbox (validates → PASS/FAIL)`. Shape only, no theory — the alignment mechanics are owned by chapter 048 lesson 2, link there. Keep it to one figure; if it risks duplicating chapter 048, drop it and rely on prose.

### Create the Resend account and API keys

`Steps`: create the Resend account if not already done; create **two sending-only API keys** — one named `dev`, one named `production` — from day one. Prose callout (one or two sentences) on the senior call from chapter 048 lesson 1: one key per environment, sending-only scope (not full-access), so a leaked dev key can't touch production config. Store the `dev` key in a password manager now — it drops into `.env` in Lesson 3, not here. `Aside` (tip): don't paste the key into `.env` yet; the env schema doesn't validate it until Lesson 3.

### Add the sending subdomain in Resend

`Steps`: in the Resend dashboard, add the sending subdomain `send.<student>.<tld>` (not the apex). Resend then publishes the records to copy: the SPF TXT, the DKIM TXT (selector `resend._domainkey`), and an optional MX record. Use `Code` for the example record shapes Resend issues. One-sentence rationale for the subdomain split (per-purpose sending isolation, chapter 048 lesson 3) — link, don't re-teach.

### Publish the records at your registrar

`Steps` for adding each record exactly as Resend issued it (Namecheap / Porkbun / Cloudflare). `Aside` (caution) watch-outs, the failure modes this lesson pre-empts:
- Some registrars **truncate long TXT values** — the DKIM key must be the full string, pasted whole.
- Host convention differs: some registrars want `resend._domainkey`, others `resend._domainkey.send` (relative vs. absolute). Name **both conventions** and tell the student to pick by their registrar's UI — `CodeVariants` or a `Tabs` pair showing the relative-host vs. absolute-host entry is the right shape here, since it is the single most common stall point.
Use `Code` for the literal record values. Keep registrar-specific UI screenshots out of scope — link the registrar DNS guides in external resources.

### Wait for verification

`Steps`: the Resend domain page flips to `Verified` when SPF and DKIM resolve (typically minutes, up to 24 h). `Aside` (caution): a DKIM stall past ~30 min is almost always TXT truncation or a wrong host — re-paste the DKIM value from Resend and verify with the registrar against `dig`. Give the exact command in `Code`:
`dig TXT resend._domainkey.send.<domain> +short`
and a one-line read of what a healthy response looks like vs. a truncated/empty one.

### Publish the DMARC record

`Steps`: publish DMARC **at the apex** (`_dmarc.<student>.<tld>`), `Code` block:
`v=DMARC1; p=none; rua=mailto:dmarc-reports@<student>.<tld>;`
Rationale (link chapter 048 lesson 2 for the policy progression): `p=none` is the starting policy — observe before enforcing. `Aside` (caution): the apex record covers subdomains by inheritance; publishing only at `_dmarc.send.<domain>` leaves the apex unprotected. The `rua` mailbox can be the student's personal inbox for a side project; production teams use a parsing service. Close with the senior habit: schedule a calendar reminder to graduate `p=none` → `p=quarantine` after a week of clean reports (forward-ref to the chapter framing's DMARC progression; the chapter ships at `p=none`).

### Confirm with a test send

`Steps`: use Resend's dashboard "Send test email" to the student's personal inbox; open Gmail "Show original" and confirm **SPF=PASS, DKIM=PASS, DMARC=PASS**. This is the verification gate for the whole ceremony — name the three PASS lines as the only acceptable outcome. `Screenshot` (or `Figure`) of the "Show original" authentication-results panel with the three PASS lines is the high-value visual here if available; otherwise describe the three lines in prose. `Aside` (tip): the "Show original" reflex returns in Lesson 4 for the real send and is the 2026 habit for every email surface.

### Match the seed placeholder to your domain

`Steps`: edit `scripts/seed.ts` — replace the shipped `suppressed@send.acme.example` with `suppressed@send.<student>.<tld>`, then re-run `pnpm db:seed` if matching the row to the student's domain. `Code` (a single-line diff via `CodeVariants` before/after, or a `Code` snippet of the edited literal). Senior anchor (one or two sentences): this address need **not be a real receiving mailbox** — the suppression check fires at the application layer (Lesson 3's wrapper) and short-circuits before Resend would ever attempt delivery, so the destination is irrelevant on the suppression path. This is the only repo edit in the lesson.

### Expected outcome / closing

Short recap, no exercise: subdomain reads `Verified`, all three records resolve and pass a dashboard test send, the `dev` API key is stored ready for Lesson 3, the seed row matches the student's domain. No application code written. One line pointing forward: Lesson 3 pastes the key into `.env`, adds the env-schema entries, and builds the suppression-gated wrapper.

External-resources section (closing, LinkCards/`ExternalResource`, populated later by the resourcer): Resend domain-verification docs, registrar DNS guides (Namecheap / Porkbun / Cloudflare), a DMARC primer. Optionally a supporting video on the DKIM/DMARC setup walk if one is found.

## Scope

- **The why behind SPF/DKIM/DMARC, the alignment rule, the 2026 enforcement bar** — owned by chapter 048 lesson 2; link, do not re-teach. This lesson is the hands-on application on the student's own domain.
- **The Resend account model, full-access vs. sending-only key shapes, per-purpose `from` discipline** — owned by chapter 048 lessons 1 and 3; link.
- **Pasting `RESEND_API_KEY` / the email env entries into `.env` and the `src/env.ts` schema additions** — Lesson 3. This lesson only *stores* the key.
- **`isSuppressed`, the `email_suppressions` read discipline, and `src/lib/email.ts`** — Lesson 3.
- **The `WelcomeEmail` template, the Server Action, and the real end-to-end send + cross-client header check** — Lesson 4.
- **The DMARC policy graduation to `p=quarantine`/`p=reject`** — scheduled here, executed over the project's lifetime (chapter 048 lesson 2 progression); only `p=none` ships now.
- **The bounce/complaint webhook writer for `email_suppressions`** — chapter 063 lesson 5; out of scope.
