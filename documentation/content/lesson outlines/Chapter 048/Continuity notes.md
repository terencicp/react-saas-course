# Chapter 048 — Sender identity and deliverability

## Lesson 1 — Resend and the first verified send

**Taught:** Resend as the 2026 transactional default (vs SES/Postmark/marketing-ESP, with named thresholds); verified-domain ceremony at a *shape* level; full-access vs sending-only key shape + one-key-per-environment discipline; `RESEND_API_KEY` env slot; `lib/email.ts` singleton + typed `sendEmail` wrapper returning `Result`; first `resend.emails.send` call against `delivered@resend.dev`; `from` anatomy + `replyTo`; idempotency-key reflex; the 5 req/s rate limit; per-environment send behavior.

**Cut:** Nothing material from the outline scope — all topics shipped. SPF/DKIM/DMARC, subdomain rationale, suppression read deferred to L2/L3/L4 by design (not cuts).

**Debts (forward links this lesson promised):**
- L2 owns SPF/DKIM/DMARC + the DNS records ("Resend gives you records; next lesson explains them").
- L3 owns the *why* of the `send.yourapp.com` subdomain (used here as a given) and the full address-convention table (only `noreply@`/`auth@`/`billing@`/`security@` named here).
- L4 fills the `// suppression check lands here` seam in `sendEmail`; the suppression list is named in the MCQ distractor as solving a *different* problem than idempotency.
- Ch 049 replaces the one-line `WelcomeEmail` placeholder with a real React Email template; the "no client hooks in the email component" constraint is asserted here, *why* deferred.
- Ch 063 builds the bounce/complaint webhook; `bounced@resend.dev`/`complained@resend.dev` named as outcome-simulators only; idempotency framed as the email-instance of a pattern Ch 063 generalizes.
- Unit 13 owns batch sends / notification queue (named, not built).
- Recalled prerequisites: `Result`/`ok`/`err` + Server Actions (Unit 6), `lib/env.ts` with `@t3-oss/env-nextjs` (Ch 041).

**Terminology / mental models later lessons must match:**
- Thesis sentence, recurs all chapter: **"deliverability is the app's responsibility, not the vendor's."** Vendor owns SMTP wire + IP reputation pool; app owns domain, key, idempotency key.
- Wrapper identity: **"thin convenience layer, not an adapter"** — names Architectural Principle #5 (Resend/Trigger.dev/R2 used directly, never wrapped behind a generic interface).
- `from` string anatomy: `'Display Name <local-part@verified.subdomain>'` — display name = UX, local part = intent signal, subdomain = deliverability requirement. `noreply@` paired with `replyTo` to a monitored mailbox.
- Idempotency key format taught: **`<event-type>/<entity-id>`** (e.g. `welcome-user/${userId}`, `password-reset/${requestId}`, `invoice-receipt/${invoiceId}`) — never a fresh random per attempt. Resend option `idempotencyKey`, max 256 chars, retained 24h.
- Test addresses: `delivered@`/`bounced@`/`complained@resend.dev`. Shared sandbox `onboarding@resend.dev` is a trap — never to real users.
- `Term`s introduced: deliverability, ESP, transactional email, DX, apex domain, DNS propagation, least privilege, key rotation, singleton, `server-only`, local part, reply-to, idempotency.

**Patterns / best practices (for the project chapter codebase):**
- `lib/email.ts` skeleton shipped: `import 'server-only'` first line; singleton `const resend = new Resend(env.RESEND_API_KEY)`; `const DEFAULT_FROM = 'YourApp <noreply@send.yourapp.com>'`; `export async function sendEmail(input: SendEmailInput): Promise<Result<{ id: string }>>`; options-object param (`to`, `subject`, `react: ReactNode`, `replyTo?`, `idempotencyKey?`); `to` wrapped as `[input.to]`; idempotency passed as conditional 2nd arg `input.idempotencyKey ? { idempotencyKey } : undefined`.
- Senior reflex codified: Resend's `emails.send` returns `{ data, error }` and **does not throw** — destructure both, check `error` first, map into `Result`. Guard shipped as `if (error || !data) return err('internal', 'Could not send email.')` then `return ok({ id: data.id })`.
- Env: `RESEND_API_KEY: z.string().min(1)` added to the `server` block; production build refuses to boot without it.
- Import alias used: `@/env` and `@/lib/result`.
- Install set: `pnpm add resend react-email` (React Email 6 unified package; `@react-email/components` deprecated).

**Misc.:**
- Outline-drift correction baked into the lesson: env validation is **Ch 041** (`@t3-oss/env-nextjs`), not Ch 030 as the chapter outline claims — later lessons should cite Ch 041.
- Rate limit corrected to **5 req/s per team** (chapter outline still says 2 r/s — stale); shared across the team's keys, raisable on request; batch endpoint = up to 100 emails/call counting as one request.
- `replyTo` is the camelCase prop the SDK object accepts.
- The send-path `ArrowDiagram` is wrapped in `Figure expandable={false}` (leader lines break in the lightbox) — reuse this guard for any leader-line figure in later lessons.
- Two figures shipped as lesson-specific components under `src/components/lessons/048/1/`: `SendPath.astro` (the responsibility-boundary `ArrowDiagram`) and `FromAnatomy.astro` (the three-segment `from`-string breakdown).

## Lesson 2 — Authenticating the sender: SPF, DKIM, DMARC

**Taught:** the three-fields-are-distinct mental model; SPF (`v=spf1 include:_spf.resend.com ~all`, `~all` vs `-all` decision, 10-DNS-lookup limit); DKIM (selector TXT at `resend._domainkey.send.yourapp.com`, public-key sign/verify, integrity + authorization guarantees); DMARC alignment as the load-bearing piece (passing check must match visible `From:`); full DMARC record read field-by-field; the `p=none → quarantine → reject` staged rollout as ops practice; the 2026 bulk-sender bar (Gmail/Yahoo Feb 2024, Microsoft May 5 2025, La Poste Sept 2025) and the rejected-not-spam-foldered consequence; verification steps. Ships **zero application TypeScript** — all code is DNS records + one SMTP string.

**Cut:** Nothing material — all outline topics shipped. The port25 verifier address from the chapter outline was replaced with `learndmarc.com` (verifier choice, not a scope cut).

**Debts (forward links this lesson promised):**
- L3 owns the *why we split* transactional/marketing argument and the full address conventions; this lesson uses `send.yourapp.com` as a given and only notes the subdomain split defuses the SPF 10-lookup limit. Also flags the transactional/marketing unsubscribe line as L3's.
- L4 owns the suppression list, the complaint-rate budget mechanics, and the bounce/complaint feedback the MX-on-subdomain record carries (named here only as "feedback flows back, thresholds are 0.3%/0.1%").
- Ch 063 builds the bounce/complaint webhook handler (only "feedback flows back" foreshadowed).
- BIMI/VMC named once in a closing `Aside` and explicitly de-scoped (ship after `p=reject` stable, not project MVP).
- One-click unsubscribe (RFC 8058) named as a line on the 2026 bar with the transactional exemption; *implementation* out of scope.

**Terminology / mental models later lessons must match:**
- **Three distinct identity fields**, the lesson's spine: envelope `MAIL FROM` (SPF checks, hidden bounce return path), DKIM `d=` signing domain (DKIM checks), visible `From:` (what the human reads, what DMARC alignment compares against). The SMTP envelope = handwritten return-address analogy recurs.
- **Alignment** = "do the checks that passed point at the same domain the human sees?" Core takeaway sentence: *DMARC requires at least one of SPF or DKIM both passes and is aligned with the visible `From:` domain.*
- Layering phrasing: **SPF and DKIM are the checks (peers); DMARC is the rule that binds them to the `From:` and sets the failure policy.**
- DMARC fields: `p=` (apex policy, the dangerous dial), `sp=` (subpolicy, inherits `p=` if absent), `rua=` (aggregate XML reports — most valuable at `p=none`), `ruf=` (forensic, low value), `fo=` (forensic-report trigger, minor), `pct=` (rollout throttle), `adkim=`/`aspf=` (`s` strict / `r` relaxed). Canonical record shipped: `v=DMARC1; p=none; rua=...; ruf=...; fo=1; pct=100; adkim=s; aspf=s;`.
- Rollout gate is **evidence from reports, never the calendar** — `p=reject` is a destination reached over weeks.
- `Term`s introduced: SPF, DKIM, DMARC, SMTP, MTA, envelope sender / `MAIL FROM`, `include` mechanism, softfail/hardfail, keypair, selector, alignment, BIMI, VMC, one-click unsubscribe (RFC 8058).

**Patterns / best practices (for the project chapter codebase):**
- DNS records the project publishes: SPF TXT `v=spf1 include:_spf.resend.com ~all` on `send.yourapp.com`; DKIM TXT at `resend._domainkey.send.yourapp.com`; MX on the subdomain for bounce return path; DMARC TXT at the **apex** `_dmarc.yourapp.com` (not subdomain — inheritance runs apex→down).
- Project ships **`p=none` plus monitoring** and graduates the ramp over its lifetime — do not launch at `reject`.
- `rua` points at a DMARC monitoring service (dmarcian / PowerDMARC / Postmark), never a raw mailbox.
- Resend DKIM is a **TXT** record (public key inline), not a CNAME — ignore CNAME-delegation variants.

**Misc.:**
- Confirmed facts to keep consistent: Microsoft rejection string `550 5.7.515 …`; bar threshold 5,000 msg/day to consumer mailboxes but de-facto applies to smaller senders; complaint rate < 0.3% (enforcement) / < 0.1% (warning).
- DMARC alignment taught via a lesson-specific component (`DmarcAlignment`, legitimate-vs-spoof scenarios), not the outline's `TabbedContent`/`DiagramSequence` — the four figures ship as `src/components/lessons/048/2/`: `EmailThreeFields` (three-fields illustration), `DkimSignVerify` (sign/verify trace), `DmarcAlignment` (alignment centerpiece), `DmarcRolloutTimeline` (policy ramp).
- One `VideoCallout` embedded (`Q8NUW3CZRvw`, CertMike's 6-min SPF/DKIM/DMARC walkthrough) after the layered-stack intro.

## Lesson 3 — The transactional subdomain split

**Taught:** transactional vs marketing line (triggered + needed-to-operate-account = transactional; sender's-schedule + opted-in = marketing); the operational reason (CAN-SPAM unsubscribe exemption for transactional; mailbox providers score the two streams separately); why reputations diverge (transactional = high opens/~0 complaints; marketing = lower opens/complaint churn) and why a shared domain lets marketing complaints spam-folder the verification email; the three-zone architecture (apex = humans, `send.` = transactional, `marketing.` = marketing, conditional); partial-vs-full separation with the 80/20 + ~50k/mo threshold; local-part-as-intent-signal + the address-convention table; the `noreply@` + `replyTo` pattern; a 4-question classification decision tree (triggered → recurring → content → default-to-marketing); the multi-tenant rule (send from your domain, tenant content inside). Ships **zero application TypeScript** — only illustrative `sendEmail` calls reusing L1's API.

**Cut:** Nothing material — all outline topics shipped (subdomain split, separation threshold, address table, replyTo, decision rule, multi-tenant, watch-outs).

**Debts (forward links this lesson promised):**
- L4 owns the suppression list and complaint-rate budget mechanics (complaint rate named here only as the *cause* of reputation drag, not defined).
- Ch 063 builds the bounce/complaint webhook.
- Marketing infrastructure (Resend Broadcasts / separate marketing ESP, the actual `marketing.` subdomain, `List-Unsubscribe`/RFC 8058) named as the contrast, never built — project sends transactional only.
- Per-tenant custom-domain sending (CNAME + DKIM delegation) named once, explicitly out of scope.
- Dedicated IPs / IP warmup named as the deferred 20%, not taught.
- Recalled from L2: adding a future `marketing.` subdomain re-runs the `none→quarantine→reject` progression; apex DMARC at `reject` hard-bounces a new subdomain not aligned through its own DKIM.

**Terminology / mental models later lessons must match:**
- **Transactional vs marketing** test: did the user *trigger* it (action moments ago) AND do they *need* it to operate the account? The trial-ending-upsell is the canonical trap → marketing (scheduled + selling).
- **Reputation is per sending domain** (and per IP) — two domains = two independent scores; the transactional stream must be insulated from the marketing stream's churn.
- Three-zone names are **convention, not protocol** (`send.`/`mail.`/`tx.`, `marketing.`/`news.`), kept **identical across dev/preview/production** so `from` shape never silently changes.
- **Local part = intent the user reads off the From line, not the system** — `notifications@`/`billing@`/`security@` good; `auth-service-prod@` is a code smell that leaks internal architecture.
- Tie-breaker asymmetry: **when unsure, default to marketing** — marketing-through-transactional pollutes the reputation you can't lose; borderline-through-marketing costs nothing.
- Day-one framing: split is **cheap now (two DNS verifications, two from-addresses), brutally expensive later** (weeks-to-months subdomain warmup); "we'll separate later" ≈ "we won't."
- `Term`s introduced/refreshed: CAN-SPAM, apex domain (refresher), ESP, local part, dunning.

**Patterns / best practices (for the project chapter codebase):**
- Transactional address conventions (all automated mail on `send.`, human mail on apex): `noreply@send.yourapp.com` (verification/magic-links — **must** pair `replyTo` to a monitored inbox), `billing@send.yourapp.com` (invoices/dunning, replyable), `security@send.yourapp.com` (alerts, replyable), `support@`/`hello@yourapp.com` (human, real Workspace mailbox on apex).
- **Reflex:** every transactional send either sets `replyTo` to a monitored mailbox or uses a `from` that is itself monitored — no dead-end `noreply@`.
- Early-stage default = **one Resend account, two verified subdomains, shared IP pool** (separate subdomains + separate DKIM = ~80% isolation, zero IP ops). Don't reach for dedicated IPs below ~50k/mo (cold IP under-performs the shared pool).
- Multi-tenant: **all mail from `send.yourapp.com` with tenant content inside**, never from the tenant's domain.
- `from`/`replyTo` examples reuse L1's exact `sendEmail` options-object API (`to`, `replyTo`, `subject`, `react`); `from` defaults to `DEFAULT_FROM = 'YourApp <noreply@send.yourapp.com>'` — no new fields/API introduced.

**Misc.:**
- Marketing subdomain (`marketing.yourapp.com`) = a *separate verified domain* in Resend with its own DKIM/SPF; this is what gives it a separate reputation. Keep distinct from `send.` in any later reference.
- Two lesson-specific figures ship under `src/components/lessons/048/3/`: `ReputationFlow.astro` (the shared-vs-split reputation-meter contrast, driven by a `variant="shared"|"split"` prop, shown in a two-tab `TabbedContent`) and `DomainZones.astro` (the three-zone apex/`send.`/`marketing.` tree, in a `Figure`). The transactional/marketing drill is a `Buckets` exercise; the classification funnel is a `StateMachineWalker` (4 questions → 2 leaves). One `VideoCallout` embedded (`RIuhoXP6l10`, Humans of Martech, 6 min).

## Lesson 4 — The suppression list as a send-time chokepoint

**Taught:** the bounce-is-a-provider-"stop"-signal mental model + the shared-reputation externality framing; **single writer, many readers** pattern (webhook writes, every send reads); the bounce taxonomy (hard = suppress on 1st; soft = suppress after ~5 consecutive; complaint = immediate+permanent; `delivered`/`opened`/`clicked` = telemetry only); the `emailSuppressions` Drizzle table column-by-column; the read-before-send gate inside `sendEmail` (normalize → lookup → short-circuit → send); wrapper-not-call-site argument; fail-closed on a suppression-read DB error; the `bypassSuppression` per-call switch + `bypassUntil` stored window; the complaint-rate budget (<0.1% / 0.1–0.3% / >0.3%) with suppression-write-rate as the leading indicator; cheap form-boundary defense (`z.email()` + optional `dns.resolveMx`). Ships the `emailSuppressions` table + the filled suppression read in `lib/email.ts`.

**Cut:** Nothing material — all outline topics shipped. Soft-bounce *counting/escalation* mechanism named but deferred to Ch 063 (it's the writer's job). `invalid_address` reason value from the chapter outline dropped — enum is the 4 values below.

**Debts (forward links this lesson promised):**
- **Ch 063 L5 builds the webhook that WRITES this table** — signature verify, `processed_events` dedup, `ON CONFLICT (email) DO NOTHING` INSERT, soft-bounce counting, and who stamps `bypassUntil`. It defers the schema to here; do not fork the shape.
- Ch 063 derives the row's Zod validator via `drizzle-zod` `createSelectSchema` from this exact table — named, not built here.
- Ch 049 (next chapter) replaces the placeholder `WelcomeEmail` with a real React Email template.
- The full `manual_unsubscribe` / marketing-vs-transactional reason-aware branch is named (transactional sends bypass `manual_unsubscribe` rows; marketing honors them) but the marketing implementation is out of scope — only the reason value + the rule land here.
- Recalled prerequisites: `sendEmail` wrapper + `Result`/`ok`/`err` + the `// suppression check lands here` seam (L1); transactional-vs-marketing classification (L3); UUIDv7 `$defaultFn` + `casing: 'snake_case'` + `db/schema.ts` single-source-of-truth (Ch 037/038); `z.email()` (Ch 042).

**Terminology / mental models later lessons must match:**
- **Single writer, many readers** — the named pattern for every webhook-fed table; exactly one writer (the webhook), everything else reads-and-branches.
- Suppression framed as **"do not send here" provider memory**, not a politeness feature; re-sending spends *everyone's* shared-domain reputation (externality).
- **Fail closed** = an exception inside any access gate (auth, tenancy, signature, suppression) returns refusal; justified by asymmetry (a missed transactional send is recoverable, a send to a suppressed address is not). Reuses the same "make correctness structural, not a discipline people remember" reasoning as `tenantDb`.
- **Normalize before lookup** — `input.to.toLowerCase().trim()` must precede the SELECT or the unique index misses case variants; addresses normalized at write AND read.
- **bypass is a privilege**: per-call boolean `bypassSuppression` = "is *this caller* allowed to try"; `bypassUntil` window = "is *this address* temporarily exempt regardless of caller" — minutes, scoped to one flow (a 24h window lets bulk paths ride it).
- Complaint-rate zones: **<0.1% healthy / 0.1–0.3% warning / >0.3% throttling** (Gmail's line; recovery = ~7 consecutive clean days). Watch the **derivative of the suppression-table write rate** as the leading indicator (postmaster dashboard is lagged).
- `Term`s introduced: bounce, complaint (FBL), sender reputation, hard/soft bounce, greylisting, idempotent, pgEnum, fail open / fail closed, postmaster tools, complaint rate, throttling.

**Patterns / best practices (for the project chapter codebase):**
- **Canonical `emailSuppressions` schema (source of truth for Ch 063 — do not drift):**
  - `pgEnum('suppression_reason', ['hard_bounce', 'soft_bounce_threshold', 'complaint', 'manual_unsubscribe'])` — note `soft_bounce_threshold` (only *promoted* soft bounces land here, never a single soft bounce).
  - `id` uuid PK `$defaultFn(() => uuidv7())`; `email text notNull unique` (normalized, the load-bearing column); `reason` (the enum) notNull; `providerEventId text` nullable (Resend `event.id`, dedup + traceability); `bypassUntil timestamp({ withTimezone: true })` nullable; `metadata jsonb` (raw payload); `createdAt`/`updatedAt timestamptz notNull defaultNow()`.
  - Reconciliation note: keep `reason` as the pgEnum carrying hard/soft/complaint/manual (NOT a separate `permanent` boolean); keep `bypassSuppression` a **boolean** at the `sendEmail` boundary. The Ch 063 outline sketched a thinner shape (`permanent` flag, `suppressed_at`, 2-value reason) — this lesson's shape wins.
- **`sendEmail` gate body** (inserted before the Resend call), wrapped to fail closed:
  - `const email = input.to.toLowerCase().trim();` then a single indexed `db.select().from(emailSuppressions).where(eq(..., email)).limit(1)` inside `try`; `catch` returns `err('internal', 'Could not send email.')` (and logs in the real project).
  - `if (suppression && !input.bypassSuppression) return err('forbidden', 'This address is on the suppression list.');` — suppressed maps to the existing `forbidden` `Result` code, no new outcome shape.
- New `sendEmail` input field: `bypassSuppression?: boolean` (added to L1's `SendEmailInput`).
- The suppression read is a **standalone `db` query, never inside a `db.transaction`** (no external/Resend calls inside transactions — pool starvation).
- Lesson spells column names in snake_case explicitly for page clarity, but the repo relies on `casing: 'snake_case'` so the string args can be omitted (same convention as prior chapters).

**Misc.:**
- The DrizzleSchemaCoding exercise diverges from the real schema to dodge PGlite limits: `reason` as plain `text` (not pgEnum), `id` via `gen_random_uuid()` (not `uuidv7()`) — flagged in-exercise; the unique `email` constraint is identical to production.
- Event-name accuracy carried into Ch 063: permanent failure = `email.bounced` (bounce type permanent); *temporary* trouble = the separate `email.delivery_delayed` event — do NOT teach "soft bounce = `email.bounced` transient" as the only path.
- One lesson-specific figure ships under `src/components/lessons/048/4/`: `ComplaintBudget.astro` (the three-zone <0.1%/0.1–0.3%/>0.3% gauge, in a `Figure`). The loop diagram is inline D2 (`shape: sql_table` table node, dashed write path / solid read path); the bounce taxonomy is a `Buckets` exercise; the schema walk is `AnnotatedCode`; the before/after gate + wrapper-vs-call-site are `CodeVariants`; the gate-order drill is a `Sequence`; the fail-closed beat closes with a `MultipleChoice`. No video embedded.
- This is the chapter's last teaching lesson; the wrap-up closes the chapter arc (L2 = authenticated/allowed in, L3 = subdomain split insulates reputations, L4 = stay in the inbox over time). Quiz is L5.
