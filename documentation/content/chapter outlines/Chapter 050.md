# Chapter 050 — Project: the welcome email send path

## Chapter framing

Chapter 050 cashes in Unit 7: the verified-domain ceremony, the SPF/DKIM/DMARC plumbing, the transactional subdomain split, and the `email_suppressions` read discipline (chapter 048); plus the React Email component vocabulary, the preview dev loop, and the plain-text/accessibility/dark-mode posture (chapter 049). The student wires Resend on their own verified domain, writes `lib/email.ts` as the suppression-gated send wrapper, ships the `<WelcomeEmail />` React Email template, and exposes a Server Action that the pre-built inspector page fires from a single button.

The project's stated goals — the capabilities the finished app demonstrates:

- A welcome email arrives in the student's real inbox, sent from their own verified domain, with the configured `from` display name and a `reply_to` that lands at a monitored mailbox.
- The delivered message passes authentication: DKIM=pass, SPF=pass, and DMARC=pass in the receiving client's headers.
- The React Email template renders correctly across desktop, mobile (375 px), and dark mode, and ships a plain-text fallback alongside the HTML part.
- The suppression path short-circuits: a send to a suppressed recipient returns `{ ok: false, reason: 'suppressed' }` without calling Resend.
- The idempotency key prevents double-sends — clicking send twice for the same recipient yields one email and the same Resend send ID.
- The env schema fails closed: a missing `RESEND_API_KEY` stops the server from booting.

Threads that run through every lesson: `lib/email.ts` is the single named seam — Architectural Principle #3 made operational; Resend is NOT wrapped in a generic adapter, the wrapper only adds the suppression read, the default `from`, and the `Result` shape (Principle #5 reminder from lesson 7 of chapter 064); the React Email template is a pure renderer with typed props, callers compute values, the template stays stateless; the Server Action follows the chapter 043 five-seam shape (parse → authorize → suppression-read → send → return `Result`); `@t3-oss/env-nextjs` schema-validates `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` at boot — fail-closed; the `email_suppressions` read is at the wrapper, never at callers; the idempotency key is set on every transactional send (verification token / row ID); the verify is run against a real inbox on the student's own verified domain, not Resend's sandbox.

### Dependency carry-in

- **From lesson 1 of chapter 048 / lesson 2 of chapter 048 / lesson 3 of chapter 048:** Resend account, the verified transactional subdomain (`send.<student>.<tld>`), SPF/DKIM/DMARC records published, the `resend` Node SDK, the per-purpose `from` address discipline, the `reply_to` pattern. The student walks chapter 048's setup again in the verified-domain ceremony walkthrough to land it on their *own* domain (not just read about it).
- **From lesson 4 of chapter 048:** the `email_suppressions` Drizzle table shape (`id`, `email`, `reason` enum, `provider_event_id`, `bypass_until`, `metadata`, `created_at`, `updated_at`), the normalize-on-read rule (lowercase + trim), the read-at-the-wrapper pattern, the `bypassSuppression` carve-out semantics, the `reason`-aware bypass (transactional bypasses `manual_unsubscribe` only). The webhook *writer* lands in lesson 5 of chapter 063 — out of scope here.
- **From lesson 1 of chapter 049 / lesson 2 of chapter 049 / lesson 3 of chapter 049:** the React Email primitives (`<Html>`, `<Head>`, `<Preview>`, `<Container>`, `<Section>`, `<Heading>`, `<Text>`, `<Button>`, `<Img>`, the `<Tailwind>` wrapper), `PreviewProps` as the mock-data contract, the `pnpm email dev` loop, the head meta plumbing for dark mode, the `lang`/`<Title>` accessibility floor. The student writes the template once against this vocabulary.
- **From lesson 1 of chapter 043 / lesson 2 of chapter 043 / lesson 3 of chapter 043 / lesson 4 of chapter 043 / lesson 5 of chapter 043:** the `'use server'` file-level directive, the five-seam action shape, the `Result<T>` type plus `ok`/`err` helpers in `lib/result.ts`, the `validation` / `conflict` / `not_found` / `internal` codes (`'suppressed'` is added here as a fifth common code), `revalidatePath` is NOT used (no list to revalidate), no transaction (the send is one external call).
- **From lesson 2 of chapter 042 / lesson 6 of chapter 042 / lesson 7 of chapter 042:** `z.email()`, `z.uuid()`, `safeParse(Object.fromEntries(formData))`, `z.treeifyError(parsed.error).properties` for the `fieldErrors` shape.
- **From chapter 041 / chapter 047:** the pooled `db` client, `db/schema.ts` already contains the `email_suppressions` table from lesson 4 of chapter 048 (the starter adds it if lesson 4 of chapter 048 didn't seed it into the running project — the starter README flags both paths), the `lib/auth-stub.ts` returning a fixed `{ organizationId, userId }` (Better Auth lands in Unit 8).
- **From chapter 030 / chapter 004:** `lib/env.ts` already exists with `@t3-oss/env-nextjs`; the student adds the new entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) to the existing `server` block. The `import 'server-only'` poisoning at the top is inherited.

### Auth carve-out (deferred to Unit 8)

The Server Action needs a recipient and a logged-in identity. Unit 8 (Better Auth) doesn't exist yet — the inspector page's "Send to {your email}" button passes the recipient address as a `FormData` entry; the action calls `getActiveContext()` from `lib/auth-stub.ts` for the `userId` slot used in the idempotency key. Reaching for `cookies()` or inventing a session reader is the smell — leave the stub alone, Unit 8 swaps it in cleanly.

### Starter file tree (stubs marked with TODO)

```
src/
  db/
    schema.ts                      # provided: email_suppressions table (carry-in from lesson 4 of chapter 048)
  lib/
    env.ts                         # provided: existing schema; TODO student: add RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
    email.ts                       # TODO student: Resend client singleton + sendEmail wrapper with suppression read
    suppressions.ts                # TODO student: isSuppressed(email, { kind }) helper, normalize-on-read
    result.ts                      # provided: Result<T>, ok(), err() (carry-in from chapter 043)
    auth-stub.ts                   # provided: getActiveContext() (carry-in from chapter 047)
  emails/
    WelcomeEmail.tsx               # TODO student: React Email template + PreviewProps
    components/
      EmailLayout.tsx              # provided: brand header + footer (logo URL + legal address from env)
  app/
    inspector/
      send-welcome/
        page.tsx                   # provided: server-rendered inspector page with one-button form
        send-welcome-form.tsx      # provided: client component reading useActionState
    actions/
      send-welcome.ts              # TODO student: sendWelcomeEmail Server Action
scripts/
  seed.ts                          # provided: inserts one pre-suppressed row at suppressed@<student-domain>
.env.example                       # provided: lists the new entries with example values
README.md                          # provided: the verified-domain ceremony recap, the DNS checklist
```

The provided inspector page calls the student-written action by relative import and renders the action's `Result` as a result card (success: shows the Resend send ID and a link to the Resend dashboard; failure: shows the error code and `userMessage`, plus a "Suppression path hit" banner when `code === 'suppressed'`).

### Reference solution signatures lessons display

- `env.server` additions in `lib/env.ts`:
  - `RESEND_API_KEY: z.string().min(1)`
  - `EMAIL_FROM: z.string().min(1)` — full `Display Name <local-part@send.domain.tld>` format
  - `EMAIL_REPLY_TO: z.email()` — a monitored mailbox
- `sendEmail({ to, subject, react, idempotencyKey, replyTo, bypassSuppression }: SendInput): Promise<Result<{ id: string }>>` in `lib/email.ts`. `SendInput`:
  - `to: string`
  - `subject: string`
  - `react: React.ReactElement`
  - `idempotencyKey: string` — required, not optional (the senior call from lesson 1 of chapter 048)
  - `replyTo?: string` — defaults to `env.EMAIL_REPLY_TO`
  - `bypassSuppression?: boolean` — defaults to `false`
- `Result<T>` error codes after this chapter: `'validation' | 'conflict' | 'not_found' | 'internal' | 'suppressed'`. The `'suppressed'` code's `userMessage` is `"This recipient is on the suppression list."` and never surfaces to end users in production (only the inspector reads it).
- `isSuppressed(email: string, opts: { kind: 'transactional' | 'marketing' }): Promise<{ suppressed: boolean; reason?: string; bypassUntil?: Date }>` in `lib/suppressions.ts` — the helper the wrapper calls. The `kind` arg drives the `reason`-aware bypass (transactional bypasses `manual_unsubscribe` only).
- `WelcomeEmail` template — default-exported React component with props `{ firstName: string; verifyUrl: string }` and a `PreviewProps` named export. Wrapped in `<EmailLayout>`, the body is one `<Section>` with a `<Heading>`, a `<Text>`, and a `<Button href={verifyUrl}>`. Sets `<Preview>` to `"Welcome to {appName} — verify your email"` and `<Title>` to `"Welcome to {appName}"`.
- `sendWelcomeEmail(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>` — file-level `'use server'` in `app/actions/send-welcome.ts`. Five-seam shape:
  1. `safeParse({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) })` over `Object.fromEntries(formData)`.
  2. `const { userId } = await getActiveContext()`.
  3. Construct `idempotencyKey = `welcome:${userId}:${recipientEmail}`` (stable across retries of the same action invocation; rotate by including a daily token if a "resend welcome" UX lands later).
  4. `await sendEmail({ to: recipientEmail, subject: 'Welcome to <App>', react: <WelcomeEmail firstName={firstName} verifyUrl={...} />, idempotencyKey })`.
  5. Return the wrapper's `Result` unchanged.
- `.env.example` entries:
  - `RESEND_API_KEY=re_xxx`
  - `EMAIL_FROM='Acme <noreply@send.acme.example>'`
  - `EMAIL_REPLY_TO=support@acme.example`

### Inspector page spec

The inspector lives at `/inspector/send-welcome` and is the verification surface. It carries:

- **Controls.** One `<form>` containing `recipientEmail` (email input, defaulted to the seeded `suppressed@<student-domain>` for one-click suppression testing — the student types their own address for the success-path test), `firstName` (text input, defaulted to `Ada`), and a single `<SubmitButton>Send welcome</SubmitButton>`.
- **Observation panels.** Three result cards rendered conditionally from `useActionState`:
  - **Success card.** Shows `Result.data.id` (the Resend send ID), a "View in Resend dashboard" link, and an instruction line ("Check the inbox for {recipientEmail} — the email should arrive within ~15 seconds").
  - **Suppression card.** Shows when `Result.error.code === 'suppressed'`: a banner "Suppression path hit — Resend was NOT called", the recipient's normalized email, and a reminder that the `email_suppressions` table is the gate.
  - **Validation/error card.** Shows when `Result.error.code` is `'validation'` or `'internal'`: the `userMessage` plus `fieldErrors` if present.
- **No webhook surface, no event log, no metrics panel** — the bounce/complaint webhook handler is lesson 5 of chapter 063; the dashboard panel is out of scope here. The Resend dashboard *is* the observation surface for the send itself.

### Concepts demonstrated → owning lesson

- Resend account, verified domain, API key shapes (full-access vs. sending-only) — lesson 1 of chapter 048; re-run on the student's own domain in the verified-domain ceremony walkthrough.
- SPF / DKIM / DMARC records, the alignment rule, the 2026 enforcement bar — lesson 2 of chapter 048; landed on the student's registrar in the verified-domain ceremony walkthrough.
- Transactional / marketing subdomain split, per-purpose `from` local parts, the `reply_to` pattern — lesson 3 of chapter 048; applied in the verified-domain ceremony walkthrough.
- `email_suppressions` schema, the read-at-the-wrapper discipline, the `bypassSuppression` carve-out, the `reason`-aware bypass — lesson 4 of chapter 048; built into `isSuppressed` and the wrapper in the suppression-gated send wrapper lesson.
- React Email primitives, the `<Tailwind>` component, `<Preview>` as the preheader, `<Img>` width/height discipline, the 102 KB clipping budget — lesson 1 of chapter 049; written into `<WelcomeEmail />` in the welcome email send path lesson.
- `pnpm email dev` iteration loop, the viewport + dark-mode toggles, the test-send as the verification gate — lesson 2 of chapter 049; the dev surface stands up in the verified-domain ceremony walkthrough, the loop is used in the welcome email send path lesson.
- Plain-text fallback via `render({ plainText: true })`, the email accessibility checklist, the dark-mode three-tier posture and head meta plumbing — lesson 3 of chapter 049; confirmed in the welcome email send path lesson.
- Architectural Principle #3 (pure `/lib`, side effects at named boundaries — `lib/email.ts` is the named seam) — lesson 4 of chapter 043 (the principle), lesson 7 of chapter 064 (the do-not-wrap rule for Resend / Trigger.dev / R2); made operational in the suppression-gated send wrapper lesson.
- Architectural Principle #5 (use the framework's conventions — don't invent a generic email adapter over Resend) — lesson 7 of chapter 064; applied in the suppression-gated send wrapper lesson.
- The Server Action five-seam shape and the canonical `Result<T>` — lesson 2 of chapter 043, lesson 3 of chapter 043; followed in the welcome email send path lesson.
- Zod `z.email()`, `Object.fromEntries(formData)` + `safeParse`, `z.treeifyError` — lesson 2 of chapter 042, lesson 6 of chapter 042, lesson 5 of chapter 042; applied in the welcome email send path lesson.
- `@t3-oss/env-nextjs` env validation, fail-closed at the boundary — chapter 030 (named), chapter 006 (the canonical `env.ts` shape); extended in the suppression-gated send wrapper lesson.
- The idempotency-key reflex on transactional sends — lesson 1 of chapter 048 (named), chapter 063 (generalized); applied in the welcome email send path lesson.
- `useActionState` + the action prop on the form, the `<SubmitButton>` with `useFormStatus` — lesson 3 of chapter 044, lesson 4 of chapter 044; the provided inspector form is read in the Project Overview.

### Forward references (where each discipline extends)

- Unit 8 (Better Auth) replaces the `verifyUrl` placeholder with a real signed verification token and calls `sendEmail({ react: <VerificationEmail ... /> })` from the sign-up flow — same wrapper, new template.
- Unit 9 (RBAC + invitations) ships `<InvitationEmail />` and calls `sendEmail` from the invite-create action; the audit log writes a row for every send.
- lesson 5 of chapter 063 (webhook handler — Resend bounces and complaints) is the *writer* for `email_suppressions`. Once it ships, the table populates from real-world delivery telemetry; the suppression read this chapter installs immediately benefits.
- Chapter 064 (billing) sends receipt emails through the same wrapper.
- Unit 13a (Trigger.dev) sends the export-ready email through the same wrapper from inside a durable task — the chapter's signature works unchanged inside a Trigger task body.
- Unit 13 (notification dispatcher) adds the per-channel and per-preference layer *on top of* `sendEmail`; the wrapper this chapter installs is the email-channel leaf of that dispatcher.
- The DMARC policy graduates from `p=none` to `p=quarantine` to `p=reject` over the project's lifetime (lesson 2 of chapter 048's progression) — the chapter ships at `p=none`, the student schedules the bump.

---

## Lesson 1 — Project Overview

This is the Project overview lesson. No feature is built; the student leaves with the starter running locally and the verified-domain ceremony queued as the next step.

### What we're building

One paragraph framing the welcome send as the canonical SaaS transactional surface every later unit reuses. Every later unit — auth verification email in Unit 8, invitation email in Unit 9, billing receipts in Chapter 064, the notification dispatcher in Unit 13 — reuses this exact wrapper, this exact suppression discipline, and this exact `Result` shape. The chapter ships one Server Action calling one template through one wrapper: the structural floor that holds for every send the student will ever wire. Adding a new send becomes "write the template, write the action, call `sendEmail`" — never "remember to check suppressions, remember to set the idempotency key, remember to default the `from`." Carries one screenshot strip of the finished experience: `/inspector/send-welcome` → success card with the Resend ID → the Gmail inbox showing the rendered template → the Gmail "Show original" headers panel with the SPF/DKIM/DMARC pass lines.

### What we'll practice

- Installing a side-effect boundary (`lib/email.ts`) as the single chokepoint for every email the SaaS will send.
- Reading a suppression list at the boundary and short-circuiting before an external call.
- Writing a props-only React Email template and eyeballing it across viewports and color schemes.
- Composing a Server Action in the five-seam shape that returns a `Result` rather than throwing.
- Proving deliverability against a real inbox using header authentication results.

### Architecture

Labeled list (shape only): the inspector form (client) → the `sendWelcomeEmail` Server Action (parse → authorize via the auth stub → compute idempotency key → call the wrapper) → `lib/email.ts` (normalize → `isSuppressed` read → Resend SDK call) → Resend → the student's inbox. The `<WelcomeEmail />` template is rendered by the action and handed to the wrapper as a React element. `lib/env.ts` validates the three new entries at boot.

### Starting file tree

Reproduce the annotated tree from the Chapter framing. Comment one line each only on the files the lessons touch or that changed from the carry-in project; mark the four TODO stubs (`lib/env.ts` additions, `lib/email.ts`, `lib/suppressions.ts`, `emails/WelcomeEmail.tsx`, `app/actions/send-welcome.ts`) as the highlighted focus. Name what each provided file does in one line — the deep per-file explanation lives in the lesson that first touches it:

- The provided inspector page and form (`app/inspector/send-welcome/`) post `recipientEmail` and `firstName` to the student-written action and render three result cards against the action's `Result` shapes — read in full when wiring the action.
- The provided `emails/components/EmailLayout.tsx` is the brand surface (header band with the logo, footer with the legal address) the welcome template wraps — its contract is unpacked when the template is written.
- The provided `lib/result.ts`, `lib/auth-stub.ts`, `db/schema.ts`, and `scripts/seed.ts` are carry-ins; the seed inserts one pre-suppressed row.

### Roadmap

One Card per lesson in a CardGrid:

- **Lesson 2 — The verified-domain ceremony.** Stand up Resend on the student's own domain and get the transactional subdomain to `Verified` with SPF/DKIM/DMARC passing.
- **Lesson 3 — The suppression-gated send wrapper.** Add the email env entries, write `isSuppressed`, and build `lib/email.ts` as the single send seam that reads suppressions and requires an idempotency key.
- **Lesson 4 — The welcome email send path.** Write the `<WelcomeEmail />` template and the `sendWelcomeEmail` Server Action so the inspector button delivers a real, rendered email end-to-end.

### Setup

Command sequence (Steps component), then the dev-server commands and expected result.

- Clone the starter via `degit` from the `react-saas-course-projects` monorepo.
- `pnpm install`.
- `docker compose up -d` to run Postgres.
- `pnpm db:migrate && pnpm db:seed` — the seed includes one pre-suppressed `suppressed@<student-placeholder>` row; the README explains the placeholder is replaced with the student's transactional subdomain before `pnpm db:seed` runs.
- `pnpm dev` for the Next.js app, and `pnpm email dev --port 3001` for the React Email preview server (the lesson 2 of chapter 049 port-clash watch-out); both run side-by-side for the rest of the chapter.

Env var list: the three new entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) plus `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_URL` are listed in `.env.example`; the values are obtained in Lesson 2 (the API key) and Lesson 3 (set into `.env.local`). Name each variable's purpose and where its value comes from. This lesson does not require them filled — the env block is added in Lesson 3.

Expected result: `pnpm dev` serves `/inspector/send-welcome` with the button rendered. Clicking the button errors because `sendWelcomeEmail` is empty — that is the intended runnable starting point.

Prerequisite call-out (the one piece of rationale this lesson must carry, because it gates setup): this chapter requires a cheap real domain. Resend's `onboarding@resend.dev` sandbox sender is explicitly out — deliverability is the point, and the sandbox sender lands in the spam folder for most providers and can't prove DKIM-pass on the student's domain. Namecheap / Porkbun / Cloudflare Registrar cost $8–12 per year for a `.com`. A student who already has a personal domain uses a subdomain on it (`send.<existing>.<tld>`). The setup is one-time; later units (auth, invites, billing) reuse the same domain and key.

---

## Lesson 2 — The verified-domain ceremony

This is a Walkthrough lesson — step-by-step scaffolding, no exercises. It may carry supporting videos in the body and a closing external-resources section. It re-runs the Resend + SPF/DKIM/DMARC setup from lesson 1 of chapter 048 + lesson 2 of chapter 048 + lesson 3 of chapter 048 against the student's own registrar so the transactional subdomain is `Verified` before any code is written. This ceremony is the unblocking gate for the rest of the chapter — if verification fails here, no later lesson works.

Steps to walk:

- Create a Resend account if not already done; create one sending-only API key for `dev` and one for `production` (one key per environment from day one — lesson 1 of chapter 048's senior call). Store the key in a password manager ready to drop into `.env.local` in Lesson 3.
- Add the sending subdomain (`send.<student>.<tld>`) at Resend; Resend publishes the SPF TXT, the DKIM TXT (selector `resend._domainkey`), and the optional MX record.
- At the registrar (Namecheap / Porkbun / Cloudflare), add the records exactly as Resend issued them. Watch-out: some registrars truncate long TXT values — the DKIM key must be the full string; some registrars want the host as `resend._domainkey` and some as `resend._domainkey.send` (relative vs. absolute), name both conventions and let the student pick based on their registrar's UI.
- Wait for verification (typically minutes, up to 24 hours). The Resend dashboard's domain page flips to `Verified` when SPF and DKIM resolve. Watch-out: DKIM verification failure is almost always a TXT-record truncation or a wrong host — when verification stalls past 30 minutes, re-paste the DKIM value from Resend into the registrar field and compare against `dig TXT resend._domainkey.send.<domain> +short`.
- Publish the apex DMARC record at `_dmarc.<student>.<tld>`: `v=DMARC1; p=none; rua=mailto:dmarc-reports@<student>.<tld>;` — `p=none` is the starting policy (lesson 2 of chapter 048's progression). The DMARC record at the apex covers subdomains by inheritance; publishing it only at `_dmarc.send.<domain>` leaves the apex unprotected. The aggregate-report mailbox can be the student's personal inbox for a side project; production teams use a parsing service. The student schedules a calendar reminder to graduate the policy to `p=quarantine` after a week of reports.
- Confirm verification by sending a test from Resend's dashboard "Send test email" feature to the student's personal inbox; in Gmail's "Show original" panel, confirm SPF=PASS, DKIM=PASS, DMARC=PASS.
- Edit the seed-row placeholder: the seeded address is `suppressed@send.<student>.<tld>`. It is not a real receiving address — the suppression read short-circuits before Resend would attempt delivery, so the address never needs to exist. The senior anchor: the suppression check happens at the application layer, the destination is irrelevant on that path.

Expected outcome on success: the student's transactional subdomain reads `Verified` in the Resend dashboard, SPF/DKIM/DMARC records are live (confirmed with a Resend-dashboard test send showing all three PASS lines), and the `RESEND_API_KEY` is stored ready for Lesson 3. No application code is written in this lesson.

Closing external-resources section: Resend's domain-verification docs, the registrar DNS guides, and a DMARC primer (added later by the resourcer).

---

## Lesson 3 — The suppression-gated send wrapper

The goal in one sentence: install `lib/email.ts` as the single suppression-gated, idempotency-key-required seam through which every email the SaaS sends will pass. The finished result: a `sendEmail` wrapper that compiles and is importable, an `isSuppressed` helper that correctly reports the seeded suppressed address as suppressed and any other address as clear, and an env schema that refuses to boot when `RESEND_API_KEY` is missing — all proven before any email is actually sent (the send path lands in Lesson 4).

### Your mission

You are building the chokepoint. Every transactional email this SaaS will ever send — the verification email in Unit 8, the invitation email in Unit 9, billing receipts, the notification dispatcher's email channel — flows through the one `sendEmail` function you write here, so the seam carries the disciplines no caller should have to remember: it reads the suppression list before it calls Resend, it defaults the `from` and `reply_to` from validated env, it requires an idempotency key, and it returns a `Result` rather than throwing. This is Architectural Principle #3 made operational, with Principle #5's corollary: the Resend client is *not* wrapped in a generic `EmailProvider` interface for some future provider swap — the swap cost doesn't justify the abstraction tax, so the wrapper is a convenience layer (suppression read plus defaults plus `Result` shape), never an abstraction layer. Construct the Resend client as a module-scope singleton, not per-call. Keep the suppression read at the wrapper and nowhere else: a caller double-checking suppressions is the smell, because the chokepoint is the whole point. Make the idempotency key a required parameter, not an optional one — every transactional send has a logical event to key on, and the required shape forces the caller to think about replay safety. Default the `from` to env and never accept a per-call override, the way per-call senders accidentally land multi-tenant mail on the wrong subdomain. Log dispositions with structured fields (`console.info('[email] sent', { id, to, subject })`, `console.error('[email] failed', { to, error })`), not freehand strings — the structured-log pattern Chapter 092 generalizes. The marketing send path and the bounce/complaint webhook *writer* are out of scope; the suppression helper takes a `kind` argument so the transactional bypass (a user can't opt out of password resets) is honored, but only `kind: 'transactional'` is exercised here.

- A missing `RESEND_API_KEY` stops the server from booting: commenting it out in `.env.local` and running `pnpm dev` surfaces the `@t3-oss/env-nextjs` Zod error naming the variable, and restoring it boots cleanly.
- The new env entries load and are typed: `EMAIL_FROM` (full `Display Name <local-part@send.domain.tld>` format), `EMAIL_REPLY_TO` (a monitored mailbox), plus `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_URL` so the brand layout and the Lesson 4 action can read them.
- `isSuppressed` reports the seeded `suppressed@...` address as suppressed and an unrelated address as clear, confirmed by importing it directly (a `pnpm tsx` one-liner or a throwaway scratch route, removed after).
- `isSuppressed` normalizes the email before querying (trim + lowercase) so casing and whitespace can't slip past the gate.
- An active `bypass_until` window reports the recipient as not suppressed.
- A `manual_unsubscribe` row reports a transactional recipient as not suppressed (the user can't opt out of transactional mail) while still suppressing a marketing recipient.
- `sendEmail` reads the suppression list and, when the recipient is suppressed and `bypassSuppression` is not set, returns `err('suppressed', ...)` without calling Resend.
- `sendEmail` compiles and is importable with its full signature (`to`, `subject`, `react`, required `idempotencyKey`, optional `replyTo`, optional `bypassSuppression`) returning `Result<{ id: string }>`.
- The `'suppressed'` code is part of the `Result.error.code` union so callers can branch on it exhaustively.

### Coding time

One line directing the student to implement `lib/env.ts` additions, `lib/suppressions.ts`, the `'suppressed'` code in `lib/result.ts`, and `lib/email.ts` against the brief and the tests, then attempt before reading the solution.

Hidden `<details>` reference solution, organized as it appears in the repo:

- **`lib/env.ts`** — add `RESEND_API_KEY: z.string().min(1)`, `EMAIL_FROM: z.string().min(1)`, `EMAIL_REPLY_TO: z.email()` to the `server` block; add `NEXT_PUBLIC_APP_NAME: z.string().min(1)` and `NEXT_PUBLIC_APP_URL: z.url()` to the `client` block. Rationale: `NEXT_PUBLIC_APP_URL` is the same value Unit 8 reuses when it swaps the placeholder verify link for a signed token.
- **`lib/result.ts`** — one-line edit adding `'suppressed'` to the error-code union (the file is otherwise provided).
- **`lib/suppressions.ts`** — `import 'server-only'` at the top; `isSuppressed(email, { kind })` normalizes, queries `email_suppressions` by the normalized email (single index lookup on the unique-on-email index from lesson 4 of chapter 048), and returns: no row → `{ suppressed: false }`; `bypass_until > now()` → `{ suppressed: false, bypassUntil }`; `reason === 'manual_unsubscribe'` with `kind === 'transactional'` → `{ suppressed: false, reason: 'manual_unsubscribe' }`; otherwise → `{ suppressed: true, reason }`.
- **`lib/email.ts`** — `import 'server-only'`; `const resend = new Resend(env.RESEND_API_KEY)` at module scope (the lesson 1 of chapter 048 singleton pattern; avoids re-allocating per request, and Unit 18 names the MSW boundary for testing). `sendEmail` body: normalize `to`; `await isSuppressed(normalizedTo, { kind: 'transactional' })`; if suppressed and not bypassed, log and return `err('suppressed', 'This recipient is on the suppression list.')` *without calling Resend*; otherwise `await resend.emails.send({ from: env.EMAIL_FROM, to: normalizedTo, replyTo: replyTo ?? env.EMAIL_REPLY_TO, subject, react }, { idempotencyKey })`; on error return `err('internal', 'Email send failed.')`, on data return `ok({ id: data.id })`.

Decision rationale callouts: the required (not optional) `idempotencyKey`; the env-only `from` with no call-site override; the wrapper returning the `Result` union with no throws on expected failures, so callers read the `ok` boolean instead of wrapping in try/catch. Link to lesson 4 of chapter 043 for the named-boundary principle and lesson 4 of chapter 048 for the suppression semantics rather than re-explaining.

### Moment of truth

How to run the lesson's test suite — the command and the expected pass output. Then the by-hand checklist for what the tests don't cover:

- Comment out `RESEND_API_KEY` in `.env.local`, run `pnpm dev`, confirm the boot fails with the Zod env error naming the variable, then restore it and confirm a clean boot.
- Run the `isSuppressed` probe (a `pnpm tsx` one-liner importing the helper) against the seeded `suppressed@...` address and an unrelated address; confirm `true` then `false`; delete the scratch.
- Confirm `pnpm dev` boots cleanly and `/inspector/send-welcome` renders (the button still errors — the action lands next lesson).

---

## Lesson 4 — The welcome email send path

The goal in one sentence: deliver a real, rendered welcome email to the student's inbox when the inspector button is clicked. The finished result: a props-only `<WelcomeEmail />` template that previews cleanly across desktop, mobile, and dark mode and ships a coherent plain-text part, plus a `sendWelcomeEmail` Server Action that parses the form, keys the send for idempotency, and routes every outcome through the wrapper's `Result` — so a success delivers a real email, the seeded suppressed recipient short-circuits, and an empty field returns `fieldErrors`.

### Your mission

You are wiring the send end-to-end: the template the recipient sees and the action the inspector fires. Write `<WelcomeEmail />` as a *pure renderer* — typed props in, HTML and text out, with no env reads, no DB reads, and no session reads inside the component; the action computes the values and passes them as props, because the moment the template reads `env` directly its `PreviewProps` drift from production and the preview server starts lying about what really ships. Build it from the React Email vocabulary from chapter 049 wrapped in `<EmailLayout>`: the dark-mode head meta, the `<Preview>` preheader, a `<Heading>`/`<Text>`/`<Button>` body, and an alternate text-link line so the CTA survives a stripped button. Eyeball it in `pnpm email dev` across desktop, the 375 px mobile toggle (the button stays a 44 px touch target), and the dark-mode toggle (the logo survives Gmail Android's blanket inversion), and read the plain-text tab top to bottom for coherence before you send a real test. Then write `sendWelcomeEmail` in the chapter 043 five-seam shape: parse first with `z.email()` and a bounded `firstName` (parse is cheap, the auth read will be a session+DB hit once Unit 8 lands, so malformed input shouldn't pay the auth cost); read the identity from the `getActiveContext()` stub — do not reach for `cookies()` or invent a session reader, Unit 8 swaps the stub cleanly; build the idempotency key as `welcome:${userId}:${normalizedRecipient}` so repeated clicks collapse to one send; compute the `verifyUrl` as an explicit placeholder with a `// TODO Unit 8` comment, because token-signing is Better Auth's job, not this chapter's; and return the wrapper's `Result` *unchanged*, never re-shaping a `'suppressed'` failure into a `'validation'` one — the action is a thin orchestrator and the wrapper owns the failure taxonomy. No MX-record probe on the recipient (out of scope; the suppression read after a bounce catches the typo case). The action file ships as `.tsx` because it constructs JSX (`<WelcomeEmail .../>`); the element is built and rendered server-side and never serialized to a client.

- The template renders in `pnpm email dev` on desktop with the heading wrapping cleanly and a comfortable button width.
- On the 375 px mobile toggle the text reflows and the button stays a tappable 44 px target.
- In dark mode the background and text invert and the logo and button stay readable.
- The HTML output carries the `<Preview>` preheader text, the compiled `<Tailwind>` styles, and the dark-mode meta tags in `<head>`.
- The plain-text part stands alone as a coherent message: the heading, the welcome paragraph, and the verify URL rendered as `Verify your email [https://...]`.
- Submitting the inspector form with the student's own inbox delivers a real email within ~15 seconds, with the success card showing the Resend send ID within ~2 seconds.
- The delivered `from` matches `EMAIL_FROM` and replying lands at `EMAIL_REPLY_TO`, not the `noreply@` mailbox.
- The delivered message passes authentication in the receiving client's "Show original": SPF=pass, DKIM=pass for `send.<student>.<tld>`, DMARC=pass — confirmed on Gmail and on one non-Gmail client (Outlook or Proton) to catch what Gmail's lenient parser hides.
- The delivered message carries both `text/plain` and `text/html` MIME parts under `multipart/alternative`.
- Submitting the seeded `suppressed@...` recipient renders the suppression card and produces no entry in the Resend dashboard logs (the SDK was never called).
- Clicking send twice for the same recipient (even with a changed `firstName`) yields exactly one email and the same Resend send ID; the key is "one welcome per user per recipient".
- Submitting with an empty `recipientEmail` renders the validation card with `fieldErrors.recipientEmail`, and the `firstName` field keeps its typed value; an empty `firstName` shows `fieldErrors.firstName`.

### Coding time

One line directing the student to implement `emails/WelcomeEmail.tsx` and `app/actions/send-welcome.ts` against the brief and the tests, then attempt before reading the solution.

Hidden `<details>` reference solution, organized as it appears in the repo:

- **`emails/WelcomeEmail.tsx`** — default-exported component, props `{ firstName: string; verifyUrl: string }`, wrapped in `<EmailLayout>`. `<Html lang="en">` + `<Head>` with `<Title>`, the `color-scheme`/`supported-color-schemes` meta, and the `:root { color-scheme: light dark; }` inline style; `<Preview>Welcome to {appName} — verify your email</Preview>`; `<Body>` → `<EmailLayout>` → `<Container>` → `<Section>` with `<Heading as="h1">Welcome, {firstName}</Heading>`, a one-paragraph `<Text>`, `<Button href={verifyUrl}>Verify your email</Button>`, and a small alternate-link `<Text>`; wrapped in `<Tailwind>` (`text-zinc-900 dark:text-zinc-100`, `max-w-[600px] mx-auto`, `bg-zinc-50 dark:bg-zinc-900`). Exports `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://example.com/verify/abc-123' }`.
- **`app/actions/send-welcome.ts`** (shipped as `.tsx`) — file-level `'use server'`. Five seams: (1) parse `Object.fromEntries(formData)` with `z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) })`, on failure return `err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`; (2) `const { userId } = await getActiveContext()`; (3) `const idempotencyKey = \`welcome:${userId}:${parsed.data.recipientEmail.trim().toLowerCase()}\``; (4) `const verifyUrl = \`${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}\`` with a `// TODO Unit 8` comment; (5) `await sendEmail({ to: parsed.data.recipientEmail, subject: \`Welcome to ${env.NEXT_PUBLIC_APP_NAME}\`, react: <WelcomeEmail firstName={parsed.data.firstName} verifyUrl={verifyUrl} />, idempotencyKey })`, return the result unchanged.

Decision rationale callouts: parse-before-authorize ordering; the pure-renderer rule and why env reads belong in `EmailLayout` or the action, not the template; the intentional `verifyUrl` placeholder deferred to Unit 8; returning the wrapper's `Result` unchanged to preserve the diagnostic surface; the `.tsx` filename because the action constructs JSX (watch-out for stale ESLint configs flagging JSX in `.ts`). Link to lesson 1 of chapter 049 for the template vocabulary and lesson 3 of chapter 043 for the five-seam shape rather than re-explaining. The inspector form (provided) already reads `useActionState(sendWelcomeEmail, null)` and renders the three cards, so submitting now works end-to-end.

### Moment of truth

How to run the lesson's test suite — the command and the expected pass output. Then the by-hand checklist for what the tests can't reach (the deliverability and rendering clauses, which need a real inbox and eye):

- Set `recipientEmail` to the student's own Gmail, click "Send welcome"; confirm the success card with the Resend send ID within ~2 seconds and the email in the inbox within ~15 seconds. Confirm the `from` reads as `EMAIL_FROM`; click "Reply" and confirm the recipient is `EMAIL_REPLY_TO`.
- In Gmail "Show original": confirm `SPF: PASS`, `DKIM: PASS` for `send.<student>.<tld>`, `DMARC: PASS`. If any line is `FAIL` or `NEUTRAL`, re-check the DNS records from Lesson 2 via `dig`. Optionally re-send to `check-auth@verifier.port25.com` and read the auto-reply.
- Re-send to a non-Gmail inbox (Outlook.com or Proton) and confirm the same three authentication results pass — this catches a misconfiguration Gmail's lenient parser hides.
- Eyeball the delivered body: heading reads `Welcome, {firstName}`, the CTA renders with the brand color (not Outlook blue or unstyled gray). Open on a phone (reflows, button tappable) and in dark mode (background inverts, text readable, logo survives).
- In "Show original" confirm `Content-Type: multipart/alternative` with both `text/plain` and `text/html` parts; the text part carries the heading, the welcome paragraph, and `Verify your email [https://...]`. View the message in a plain-text-only mode (Apple Mail's "Plain Text" view) for the no-HTML case.
- Set `recipientEmail` to the seeded `suppressed@send.<student>.<tld>`, click send; confirm the suppression card renders and the Resend dashboard "Logs" tab shows no entry. To prove the SDK was never reached, temporarily add `console.log('[email] calling resend')` immediately before `resend.emails.send(...)` in `lib/email.ts`, confirm it does not fire on the suppressed path in the `pnpm dev` terminal, then remove it.
- Send to a fresh inbox, note the send ID, then immediately click again with the same recipient; confirm the Resend dashboard returns the same send ID and the inbox shows exactly one email. Change the `firstName` and click again — still one email, same key.
- Submit with `recipientEmail` empty (validation card with `fieldErrors.recipientEmail`, `firstName` retains its value) and with `firstName` empty (`fieldErrors.firstName`).
- Senior recap and forward references: name the disciplines installed (one named seam; suppression at the wrapper; required idempotency key; pure-renderer template; five-seam action funneling all failures through one `Result`; env fail-closed at boot; verified domain + DKIM/DMARC + suppression as the deliverability floor) and point to the chapter framing's forward-references list for where each one extends. The "Show original" headers panel is the 2026 reflex for every later email send; run the cross-client check once per chapter, not per send. On production rollout, the Vercel env panel uses the *production* Resend key, landing the per-environment key discipline from lesson 1 of chapter 048.
