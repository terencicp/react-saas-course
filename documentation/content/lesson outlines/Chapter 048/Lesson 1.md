# Resend and the first verified send

- Title (h1): Resend and the first verified send
- Sidebar label: Resend and the first send

## Lesson framing

First lesson of Unit 7 (Transactional Email) and of Chapter 048. Setup-archetype lesson: it installs the email-sending infrastructure every later unit depends on (auth verification, magic-links, password reset, billing receipts) and ends with one real send as the verify step. Estimated 40-50 min.

The senior frame that must lead and recur: **deliverability is the app's responsibility, not the vendor's.** Resend abstracts SMTP, but the provider choice, the verified domain, the per-environment key discipline, the canonical `from` shape, and the idempotency reflex all live in the repo and ops. This lesson is the "decisions before syntax" archetype — the single send call at the end is three lines; the weight is in *why Resend*, *why a verified domain is non-negotiable*, *why split keys per environment*, and *why pair every send with an idempotency key*.

Pedagogical spine — minimize cognitive load by building one mental model in order:
1. The gap. Name the four sends the app owes a user and the gap between "a Server Action calls a function" and "the email lands in the inbox." Motivates everything.
2. The provider decision. Resend as the 2026 transactional default; name the alternatives and the threshold each crosses (trigger-before-tool). This is a decision the student must be able to *defend*, not memorize.
3. The setup ceremony. Account → verified domain → API keys. Procedural; lean on `Steps` and screenshots-as-prose, keep it light because exact dashboard UI ages.
4. The code. `lib/env.ts` slot → `lib/email.ts` wrapper → the first `resend.emails.send` call. This is where the student writes code.
5. The send-shape disciplines. `from` anatomy, `reply_to`, idempotency key, rate limit, per-environment recipient behavior. Each is a small senior reflex attached to the call they just saw.

Hard scoping discipline (this chapter is four tightly-bounded lessons): this lesson does **not** teach SPF/DKIM/DMARC mechanics (L2), the subdomain-split *rationale* (L3), or the suppression-list read (L4). It *names* the verified domain, *uses* a `send.yourapp.com`-style subdomain as a given, and ships a `lib/email.ts` wrapper with an explicit `// suppression check lands in L4` seam — but does not implement the check. The wrapper's "thin convenience layer, not an adapter" identity is a load-bearing point: name Architectural Principle #5 (Resend is not wrapped behind a generic interface) inline at the moment the wrapper is introduced.

The `react` prop renders a React Email component (taught in Chapter 049). This lesson uses a one-line placeholder component and explicitly defers templating — do not teach React Email here.

Code component strategy: `AnnotatedCode` for the `lib/email.ts` wrapper (multiple parts need sequential focus — singleton, options type, the call, the Result mapping). `CodeVariants` for two before/after framings (full-access-key-everywhere vs. split keys; `data:`-only destructure vs. `{ data, error }`). `Code` (plain fence) for the env slot and the first bare send. `CodeTooltips` on the send call for inline meta (the `from` format, `idempotencyKey`). One `ArrowDiagram` for the end-to-end send path (the "gap" the lesson closes). One `StateMachineWalker` (decision kind) for the provider choice. Exercises: a `Buckets` drill on key-shape-by-use and a `MultipleChoice` on the idempotency reflex.

## Lesson sections

### The four emails the app already owes its users

Intro section (no h2 needed before it per the structure guidance, but this is the first h2 after the warm intro paragraph). Open with the concrete problem: a SaaS that can't send email can't verify an address, can't reset a password, can't deliver a magic-link, can't email a receipt — email is infrastructure, not a feature. State the lesson goal (a verified sending domain, a working `RESEND_API_KEY`, a `lib/email.ts` wrapper, and one real send) and connect to what the student already built: the Server Actions and `Result` shape from Unit 6 — the send wrapper returns the same `Result` discriminated union, so it slots into an action body exactly like a DB write.

Then frame the gap with a diagram.

- **Diagram (`ArrowDiagram` inside `Figure`, `expandable={false}`):** horizontal left-to-right flow: `Server Action` → `sendEmail()` (lib/email.ts) → `Resend API` → `recipient inbox`. Annotate the middle two arrows with what the app owns vs. what the vendor owns: over `sendEmail → Resend` write "your domain, your key, your idempotency key"; over `Resend → inbox` write "SMTP, IP reputation pool — Resend's." Pedagogical goal: make visible that the *interesting* responsibilities sit on the app's side of the boundary, setting up the deliverability-is-yours thesis. Keep it to four boxes, three arrows; cap height.

### Why Resend, and when it isn't the answer

The provider decision — the senior question the lesson answers. Lead with the criteria a senior weighs for *transactional* mail in a Node/Next.js SaaS, then place Resend against them, then name the thresholds where an alternative wins (defaults-before-conditionals: Resend is the default; the alternatives are conditionals gated on a named threshold).

Criteria to surface in prose: first-class React component rendering (sets up Chapter 049), a Node SDK that types the send call, a credible free tier, a webhook surface with Svix-style signature verification (foreshadow Chapter 063), and a DX that ships in minutes not days. Resend clears all five for the early-stage case.

The alternatives and their thresholds:
- **SES** — cheapest at scale, but IAM + SNS + SES wiring costs days; defer until send volume justifies the ops tax.
- **Postmark** — same transactional-focused posture as Resend; a credible swap, pick by pricing and team preference. The senior call is "transactional-focused provider," not the specific logo.
- **SendGrid / Mailchimp / marketing-first ESPs** — wrong tool for transactional; built for campaigns, and mixing transactional with marketing on one account drags reputation (foreshadow L3's split without teaching it).

The durable takeaway to state explicitly: the senior decision is *"a transactional-focused provider, not a marketing ESP"* — Resend is this course's pick, but the reasoning transfers.

- **Exercise (`StateMachineWalker`, `kind="decision"`, no diagram slot):** "Which email provider do I reach for?" Root question on the kind of mail (transactional vs. marketing) → for transactional, branch on volume/scale and team-on-AWS-already → leaves: Resend (default), Postmark (preference/pricing), SES (high volume + already on AWS, willing to pay the ops cost), and a marketing-ESP leaf for the marketing branch that explicitly says "out of scope here, separate account." Pedagogical goal: drill the *order* a senior asks the questions in (purpose before scale before infra), not the leaf. Keep leaves to 2-3 sentences each.

Tooltip candidates in this section: `Term` on **ESP** (Email Service Provider), **transactional email** (mail triggered by a user action, carrying info the user expects — contrast marketing), **DX** (developer experience).

### Verifying your sending domain

The setup ceremony. Procedural and light — exact dashboard chrome ages fast, so teach the *shape* of the ceremony and the senior reflexes, not pixel-by-pixel clicks. Use `Steps`.

Steps to cover: create a Resend account; add the sending domain — and here name the choice: not the bare apex but a transactional subdomain like `send.yourapp.com` (state that L3 defends *why* the subdomain; here it's a given so the `from` examples are honest); Resend generates a record set; add them at the registrar; Resend verifies and flips the status to `Verified`. Note propagation is up to 24 hours but usually minutes.

The non-negotiable senior reflex, stated plainly: **no send to a real user goes out from the shared `onboarding@resend.dev` domain.** It lands in spam for most providers and trains a bad reputation on the app's own users from day one. The verified domain is the price of inbox placement.

Do **not** enumerate or explain the DNS records (TXT/SPF/DKIM/MX) — that is L2's entire job. Say only "Resend gives you a set of DNS records; what each one does is the next lesson." This keeps the boundary clean.

- **Visual (optional `Screenshot` inside `TabbedContent` if the resourcer sources clean dashboard captures):** the Resend domain page showing a `Verified` badge, and the "API Keys" page. If no clean assets, drop it — prose `Steps` carry this fine. Flag for the resourcer, do not block on it.

Tooltip candidates: `Term` on **apex domain** (the root domain `yourapp.com`, no subdomain prefix), **DNS propagation** (the delay before a new DNS record is visible to resolvers worldwide).

### API keys: sending-only, and one per environment

The key-shape and key-scoping discipline — a pure senior-mindset section, short and sharp. Two axes:

1. **Shape.** Resend issues full-access keys (create domains, manage webhooks) and sending-only keys (only the send endpoint). The reflex: the *application runtime* uses a sending-only key; full-access keys are for one-off setup scripts and stay out of the app's env.
2. **Scope.** One key per environment — `dev`, `preview`, `production`. A leaked staging key is then rotated without touching production. Reusing one key everywhere means a staging breach exposes production sending.

- **Comparison (`CodeVariants`, two tabs):** "One key everywhere" (`del` the single shared key reused across envs) vs. "Split keys per environment" (`ins` per-env keys in the platform store). First sentence of each variant carries the framing ("a staging leak takes prod down" / "rotate staging in isolation"). Keep to the env-store mental model — do not show the full env schema here (that's the next section).

- **Exercise (`Buckets`, `twoCol`):** two buckets — "Sending-only key (app runtime)" and "Full-access key (setup script)". Items: "the Server Action that sends a welcome email", "a script that creates the verified domain", "the running Next.js app", "registering a webhook endpoint once", "every per-request transactional send". Pedagogical goal: cement least-privilege by use, not by memorized definition.

Tooltip candidates: `Term` on **least privilege** (grant each credential only the permissions its job needs), **key rotation** (replacing a credential with a new one and revoking the old, without downtime).

### The env slot and the `lib/email.ts` wrapper

Where the student starts writing code. Two parts: the env validation slot, then the wrapper module.

**Env slot.** `RESEND_API_KEY` is a server secret; it lands in the project's typed env schema. Reconnect to the prerequisite: the student already built `lib/env.ts` with `@t3-oss/env-nextjs` + Zod in Unit 5 (Chapter 041). Show only the one-line addition to the `server` block (`RESEND_API_KEY: z.string().min(1)`) as a plain `Code` fence with an `ins=` mark, and state the payoff: the build refuses to boot in production without it. Do not re-teach the env pattern — one sentence of recall plus the diff. (Note for downstream: the chapter outline says "Chapter 030 owns env" — that is drift; env validation is actually Chapter 041 lesson 2 (`@t3-oss/env-nextjs`). Reference Chapter 041, not 030.)

**The wrapper.** Install: `pnpm add resend react-email @react-email/components`. State that `react-email` / `@react-email/components` are pulled now because the `react` prop needs them, but the template work is Chapter 049 — here a one-line placeholder component stands in.

Then build `lib/email.ts`. Lead with the file-shape rule from conventions: it begins with `import 'server-only';`, exports a singleton `resend` client and a typed `sendEmail` wrapper, lives in `lib/` as a sanctioned SDK-adapter carve-out, and is **not** a generic email abstraction — name Architectural Principle #5 here (Resend, Trigger.dev, R2 are used directly; the swap cost doesn't justify wrapping them behind an interface). The wrapper's only jobs: default `from`, the canonical `Result` return shape, and a reserved seam for the suppression check (L4).

- **`AnnotatedCode` (the wrapper, the centerpiece of the lesson):** write the full module once, step through it. Suggested shape (downstream may refine to match the canonical contract, but keep this skeleton):
  ```ts
  import 'server-only';
  import { Resend } from 'resend';
  import { env } from '@/env';
  import { ok, err, type Result } from '@/lib/result';

  const resend = new Resend(env.RESEND_API_KEY);
  const DEFAULT_FROM = 'YourApp <noreply@send.yourapp.com>';

  type SendEmailInput = {
    to: string;
    subject: string;
    react: React.ReactNode;
    replyTo?: string;
    idempotencyKey?: string;
  };

  export async function sendEmail(input: SendEmailInput): Promise<Result<{ id: string }>> {
    // suppression check lands here in lesson 4 of chapter 048
    const { data, error } = await resend.emails.send(
      {
        from: DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        react: input.react,
        replyTo: input.replyTo,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );
    if (error) return err('internal', 'Could not send email.');
    return ok({ id: data.id });
  }
  ```
  Steps (color-coded, blue default): (1) `import 'server-only'` + the singleton — why one client, why server-only. (2) `DEFAULT_FROM` — the default identity, foreshadow the `from` section. (3) the `SendEmailInput` type — two positional params max so it takes an options object; `react` is `ReactNode`. (4) the suppression-seam comment — say plainly this is filled in L4, the wrapper is the chokepoint. (5) the `resend.emails.send` call and the second `idempotencyKey` options argument. (6) the `{ data, error }` destructure and the `Result` mapping — the senior reflex: inspect `error`, never trust `data` alone. Keep each step ≤6 lines.

Conventions to honor: arrow-vs-`function` (exported `sendEmail` may be `async function` for the named export — both are fine; match the project's existing `lib/` style which uses `export async function`), options object past two params, explicit return type on the exported function, `import type` for the `Result` type, single quotes. Note any deliberate divergence (e.g., the suppression seam as a comment) so downstream agents know it's intentional.

Tooltip candidates (`CodeTooltips` on the wrapper or `Term` in prose): **singleton** (one shared instance reused across requests, not re-constructed per call), **`server-only`** (an import that makes the module a build error if it's ever pulled into client code).

### Your first send

The payoff — one real send, the verify step. Show the minimal call first as a plain `Code` fence (the bare `resend.emails.send` shape) so the student sees the SDK's native surface, then show calling the `sendEmail` wrapper from a tiny Server Action or a one-off script. Use `delivered@resend.dev` as the dev recipient so the student gets a successful send without a real mailbox, and name the other two test addresses (`bounced@resend.dev`, `complained@resend.dev`) as the outcome-simulators they'll use when the webhook handler arrives (Chapter 063) — name only, do not build.

The one-line placeholder email component: a function returning a single `<p>Welcome, {name}!</p>`-style node, explicitly labeled "Chapter 049 replaces this with a real template." This keeps the `react` prop honest without pulling React Email forward.

- **`CodeTooltips` on the bare send** for the canonical shape: tooltip the `from` string (format + must be a verified mailbox), `to` (array), `react` (server-renderable component, no client hooks — defer to Ch 049), and the `idempotencyKey` option.

State the verify outcome plainly: a `data.id` comes back, the send shows in the Resend dashboard, and `delivered@resend.dev` reports delivered. That is the lesson's done condition.

### The `from` line is a UX and reputation decision

The `from` / `reply_to` discipline. Anatomy first: `'Display Name <local-part@verified.subdomain.tld>'` — the mailbox must be on the verified domain, the display name is what the recipient reads in their inbox. Then the two senior reflexes:

1. **Per-purpose local part** as an intent signal: `noreply@`, `auth@`, `billing@`, `security@` so the user's filters can route. Name the local part for *the intent the user reads off the from line*, not the internal system (`auth-service-prod@` is a code smell). (L3 owns the full address-convention table; here teach just enough to write an honest `from`.)
2. **`reply_to` to a monitored inbox.** A `noreply@` that silently bounces replies violates the user's expectation and is a faint negative reputation signal (Gmail's be-replyable guidance). Pair `from: noreply@send.yourapp.com` with `reply_to: support@yourapp.com` so the bot identity shows in the inbox but a human catches the reply.

Small visual aid: a labeled breakdown of one `from` string. A simple **HTML+CSS annotated illustration** inside `Figure` (per the diagrams index, an annotated illustration is HTML+CSS) — three color-coded segments under the string `YourApp <noreply@send.yourapp.com>`: display name, local part, verified subdomain — each with a one-line callout. Pedagogical goal: make the three parts of an address concrete and tie each to a decision. Keep it compact, single row.

Tooltip candidates: `Term` on **local part** (the portion before the `@` in an email address), **`reply_to`** (a header that routes the recipient's "Reply" to a different mailbox than the visible `from`).

### Idempotency, rate limits, and the three environments

Three send-time disciplines bundled because each is short and they share the "production stakes of a retried/duplicated send" frame.

**Idempotency key — the headline reflex.** Every transactional send should pass a stable `idempotencyKey` (the SDK's second-argument option, max 256 chars, retained 24h). Resend's recommended format is `<event-type>/<entity-id>` — e.g. `welcome-user/<userId>`, `password-reset/<requestId>`, `invoice-receipt/<invoiceId>` — built from the stable id the event already has, so a retried Server Action or a webhook replay never produces two emails for one logical event. Teach the slash-namespaced format, not a bare UUID. Connect explicitly: this is the same idempotency thread the webhook lesson (Chapter 063) generalizes across the codebase; here it's the email-specific instance. This is the most important durable reflex in the section.

**Rate limits — name the number, defuse the panic.** Resend's default is **5 requests/second per team** (shared across all the team's API keys, raisable on request for trusted senders). For a Server Action sending one email per request this is a non-issue; for a bulk path (team invites, a digest) reach for the batch endpoint (up to 100 emails per call, counting as one request against the limit) and pair it with the idempotency key. The full batch/queue pattern is Unit 13 — name the limit and the existence of batch, build neither.

**The three environments.** Dev: send to a personal inbox or the `*@resend.dev` test addresses. Preview: gate sending behind a flag or a per-environment recipient allowlist so a PR-preview action never emails real users. Production: the verified domain is required and the env layer refuses to boot without `RESEND_API_KEY` (callback to the env section).

- **Exercise (`MultipleChoice`, single-correct, with `McqWhy`):** a scenario — "A password-reset Server Action times out, the user clicks 'resend', and the framework also retries the first call. What keeps the user from getting two reset emails?" Choices include: a longer rate limit, retry-disabling the action, **passing the reset request's id as the `idempotencyKey`** (correct), and checking the suppression list. Make the distractors plausible (suppression is real but solves a different problem — reinforces the L4 boundary). Per the MCQ guidance, phrase the correct answer so it isn't a verbatim copy of the prose.

Tooltip candidates: `Term` on **idempotency** (an operation that produces the same result whether it runs once or many times), **batch endpoint** (a single API call that sends many emails at once).

### External resources

Optional `ExternalResource` cards: the Resend Node SDK quickstart / `emails.send` reference, the Resend domains/verification doc, and the Resend API-keys doc. A `VideoCallout` is a reasonable fit for the domain-verification walkthrough if the resourcer finds a current, embeddable Resend setup video — flag the opportunity but do not hardcode a `videoId` (embeddability and freshness must be verified by the resourcer).

## Scope

In scope: the provider decision (Resend vs. SES/Postmark/marketing ESPs), the verified-domain ceremony at a *shape* level, the full-access-vs-sending-only key shapes and per-environment key discipline, the `RESEND_API_KEY` env slot (one-line recall of the Chapter 041 pattern), `pnpm add resend react-email @react-email/components`, the `lib/email.ts` singleton + typed `sendEmail` wrapper returning `Result`, the first `resend.emails.send` call, the `from`/`reply_to` anatomy and per-purpose-local-part reflex, the idempotency-key reflex, the rate-limit number, and per-environment send behavior including the `*@resend.dev` test addresses.

Out of scope (redefine prerequisites only in one line where needed):
- **SPF / DKIM / DMARC mechanics, the DNS record anatomy, the policy progression** — Chapter 048 lesson 2. Here: "Resend gives you DNS records; the next lesson explains them."
- **The transactional/marketing subdomain *rationale* and the full address-convention table** — Chapter 048 lesson 3. Here the `send.yourapp.com` subdomain and a couple of local parts are used as givens, not justified.
- **The suppression-list schema and read-before-send check** — Chapter 048 lesson 4. The wrapper ships an explicit comment seam only.
- **React Email templating, the `emails/*.tsx` convention, local preview** — Chapter 049. Here a one-line placeholder component stands in for the `react` prop; state that client hooks aren't allowed in it and defer the why.
- **The bounce/complaint webhook that populates suppressions, signature verification, dedup** — Chapter 063. The `*@resend.dev` outcome-simulators and the idempotency-thread connection are *named* as forward links only.
- **Batch sends and the notification queue** — Unit 13. Named, not built.
- **Server Action mechanics, the five-seam shape, the `Result` type and `ok`/`err` helpers, `lib/env.ts` with `@t3-oss/env-nextjs`** — already taught in Unit 6 / Chapter 041; assumed, recalled in one sentence each, never re-taught. The `getActiveContext()`/auth placeholder convention is the project's stub until Unit 9 — if a send is shown inside an action, use it rather than inventing auth.

## Fact-check results (step 6 — verified June 2026)
- **Idempotency key:** confirmed — `idempotencyKey` is the second-argument option to `resend.emails.send`, max 256 chars, kept 24h. Recommended format `<event-type>/<entity-id>` (e.g. `welcome-user/123456789`). Outline updated to teach this format.
- **Rate limit:** corrected — default is **5 requests/second per team** (was 2 r/s in older docs / training data), shared across the team's keys, raisable on request. Batch endpoint sends up to 100 emails in one request, counting as a single request against the limit. Outline updated.
- **Send shape:** confirmed — `{ data, error }` return with `data.id`; `react` is the current prop name.
- **Install:** confirmed — `resend @react-email/components react-email` is the current 2026 standard install set; Resend does not bundle rendering.
- **Test addresses:** confirmed — `delivered@`, `bounced@`, `complained@` `@resend.dev` are current; they also support `+label` suffixes.
- **`replyTo` casing:** the SDK accepts `replyTo` (camelCase) in the JS object — downstream should confirm against the installed SDK version when writing the wrapper.
