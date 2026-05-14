# Chapter 8.3 — Project: transactional email send

## Chapter framing

Chapter 8.3 cashes in Unit 8: the verified-domain ceremony, the SPF/DKIM/DMARC plumbing, the transactional subdomain split, and the `email_suppressions` read discipline (8.1); plus the React Email component vocabulary, the preview dev loop, and the plain-text/accessibility/dark-mode posture (8.2). The student wires Resend on their own verified domain, writes `lib/email.ts` as the suppression-gated send wrapper, ships the `<WelcomeEmail />` React Email template, and exposes a Server Action that the pre-built inspector page fires from a single button. Every clause of "Done when" — real inbox arrival on the student's domain, DKIM=pass and SPF=pass in headers, plain-text fallback present, suppression path returns `{ ok: false, reason: 'suppressed' }` without calling Resend — is the verify recipe for the chapter.

Threads that run through every lesson: `lib/email.ts` is the single named seam — Architectural Principle #3 made operational; Resend is NOT wrapped in a generic adapter, the wrapper only adds the suppression read, the default `from`, and the `Result` shape (Principle #5 reminder from 12.2.7); the React Email template is a pure renderer with typed props, callers compute values, the template stays stateless; the Server Action follows the 7.2 five-seam shape (parse → authorize → suppression-read → send → return `Result`); `@t3-oss/env-nextjs` schema-validates `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` at boot — fail-closed; the `email_suppressions` read is at the wrapper, never at callers; the idempotency key is set on every transactional send (verification token / row ID); the verify is run against a real inbox on the student's own verified domain, not Resend's sandbox. The chapter ships 1 brief + 1 starter walkthrough + 2 build slices + 1 verify lesson; every build closes on a runnable state.

### Dependency carry-in

- **From 8.1.1 / 8.1.2 / 8.1.3:** Resend account, the verified transactional subdomain (`send.<student>.<tld>`), SPF/DKIM/DMARC records published, the `resend` Node SDK, the per-purpose `from` address discipline, the `reply_to` pattern. The student walks 8.1's setup again in 8.3.2 to land it on their *own* domain (not just read about it).
- **From 8.1.4:** the `email_suppressions` Drizzle table shape (`id`, `email`, `reason` enum, `provider_event_id`, `bypass_until`, `metadata`, `created_at`, `updated_at`), the normalize-on-read rule (lowercase + trim), the read-at-the-wrapper pattern, the `bypassSuppression` carve-out semantics, the `reason`-aware bypass (transactional bypasses `manual_unsubscribe` only). The webhook *writer* lands in 12.1.5 — out of scope here.
- **From 8.2.1 / 8.2.2 / 8.2.3:** the React Email primitives (`<Html>`, `<Head>`, `<Preview>`, `<Container>`, `<Section>`, `<Heading>`, `<Text>`, `<Button>`, `<Img>`, the `<Tailwind>` wrapper), `PreviewProps` as the mock-data contract, the `pnpm email dev` loop, the head meta plumbing for dark mode, the `lang`/`<Title>` accessibility floor. The student writes the template once in 8.3.4 against this vocabulary.
- **From 7.2.1 / 7.2.2 / 7.2.3 / 7.2.4 / 7.2.5:** the `'use server'` file-level directive, the five-seam action shape, the `Result<T>` type plus `ok`/`err` helpers in `lib/result.ts`, the `validation` / `not_found` / `internal` codes (`'suppressed'` is added here as a fourth common code), `revalidatePath` is NOT used (no list to revalidate), no transaction (the send is one external call).
- **From 7.1.2 / 7.1.6 / 7.1.7:** `z.email()`, `z.uuid()`, `safeParse(Object.fromEntries(formData))`, `z.treeifyError(parsed.error).properties` for the `fieldErrors` shape.
- **From 6.6 / 7.6:** the pooled `db` client, `db/schema.ts` already contains the `email_suppressions` table from 8.1.4 (the starter adds it if 8.1.4 didn't seed it into the running project — the starter README flags both paths), the `lib/auth-stub.ts` returning a fixed `{ organizationId, userId }` (Better Auth lands in Unit 9).
- **From 5.2 / 1.4:** `lib/env.ts` already exists with `@t3-oss/env-nextjs`; the student adds the new entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) to the existing `server` block. The `import 'server-only'` poisoning at the top is inherited.

### Auth carve-out (deferred to Unit 9)

The Server Action needs a recipient and a logged-in identity. Unit 9 (Better Auth) doesn't exist yet — the inspector page's "Send to {your email}" button passes the recipient address as a `FormData` entry; the action calls `getActiveContext()` from `lib/auth-stub.ts` for the `userId` slot used in the idempotency key. Reaching for `cookies()` or inventing a session reader is the smell — leave the stub alone, Unit 9 swaps it in cleanly.

### Starter file tree (stubs marked with TODO)

```
src/
  db/
    schema.ts                      # provided: email_suppressions table (carry-in from 8.1.4)
    seed.ts                        # provided: inserts one pre-suppressed row at suppressed@<student-domain>
  lib/
    env.ts                         # provided: existing schema; TODO student: add RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO
    email.ts                       # TODO student: Resend client singleton + sendEmail wrapper with suppression read
    suppressions.ts                # TODO student: isSuppressed(email, { kind }) helper, normalize-on-read
    result.ts                      # provided: Result<T>, ok(), err() (carry-in from 7.2)
    auth-stub.ts                   # provided: getActiveContext() (carry-in from 7.6)
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
  - `idempotencyKey: string` — required, not optional (the senior call from 8.1.1)
  - `replyTo?: string` — defaults to `env.EMAIL_REPLY_TO`
  - `bypassSuppression?: boolean` — defaults to `false`
- `Result<T>` error codes extended in this chapter: `'validation' | 'suppressed' | 'internal'`. The `'suppressed'` code's `userMessage` is `"This recipient is on the suppression list."` and never surfaces to end users in production (only the inspector reads it).
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
- **No webhook surface, no event log, no metrics panel** — the bounce/complaint webhook handler is 12.1.5; the dashboard panel is out of scope here. The Resend dashboard *is* the observation surface for the send itself.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Real-inbox arrival on the student's verified domain | At `/inspector/send-welcome`, set `recipientEmail` to the student's own monitored inbox (Gmail or Apple Mail), click "Send welcome". The success card shows the Resend send ID within ~2 seconds; the inbox shows the email within ~15 seconds. The `from` reads as the configured `EMAIL_FROM` (display name + `noreply@send.<student-domain>`); the `reply_to` lands at the configured monitored mailbox. |
| DKIM=pass and SPF=pass in headers | In Gmail: "Show original" → confirm `SPF: PASS` and `DKIM: PASS` for `send.<student-domain>`, plus `DMARC: PASS`. Re-run the test send to `check-auth@verifier.port25.com` and read the auto-reply's parsed-headers section. |
| React Email template renders | The body of the inbox email matches the preview (the heading, the welcome text, the verify CTA button). Mobile view (open on phone) wraps cleanly at 375 px. Dark mode (toggle in Apple Mail or read on Gmail Android) renders without inverted-logo nightmares. |
| Plain-text fallback present | In Gmail: "Show original" → confirm the message has both `text/plain` and `text/html` MIME parts. The text part contains the heading, the welcome paragraph, and the verify URL as `Verify your email [https://...]`. |
| Suppression path returns `{ ok: false, reason: 'suppressed' }` without calling Resend | At `/inspector/send-welcome`, set `recipientEmail` to the seeded `suppressed@<student-domain>`, click "Send welcome". The suppression card shows; the Resend dashboard shows NO new send for that recipient. Add a temporary `console.log('calling resend')` before the SDK call and confirm it never fires on this path. Remove the log. |
| Idempotency key prevents double-sends on retry | Click "Send welcome" to a fresh inbox; immediately click again with the same recipient. The Resend dashboard shows the second call returning the *same* send ID (the SDK retains the idempotency key for 24 hours); the inbox shows exactly one email. |
| Env validation fails closed | Comment out `RESEND_API_KEY` in `.env.local`; run `pnpm dev`. The server fails to boot with the Zod env error — the `@t3-oss/env-nextjs` schema rejects the missing variable. Restore the value. |

### Concepts demonstrated → owning lesson

- Resend account, verified domain, API key shapes (full-access vs. sending-only) — 8.1.1.
- SPF / DKIM / DMARC records, the alignment rule, the 2026 enforcement bar — 8.1.2.
- Transactional / marketing subdomain split, per-purpose `from` local parts, the `reply_to` pattern — 8.1.3.
- `email_suppressions` schema, the read-at-the-wrapper discipline, the `bypassSuppression` carve-out, the `reason`-aware bypass — 8.1.4.
- React Email primitives, the `<Tailwind>` component, `<Preview>` as the preheader, `<Img>` width/height discipline, the 102 KB clipping budget — 8.2.1.
- `pnpm email dev` iteration loop, the viewport + dark-mode toggles, the test-send as the verification gate — 8.2.2.
- Plain-text fallback via `render({ plainText: true })`, the email accessibility checklist, the dark-mode three-tier posture and head meta plumbing — 8.2.3.
- Architectural Principle #3 (pure `/lib`, side effects at named boundaries — `lib/email.ts` is the named seam) — 7.2.4 (the principle), 12.2.7 (the do-not-wrap rule for Resend / Trigger.dev / R2).
- Architectural Principle #5 (use the framework's conventions — don't invent a generic email adapter over Resend) — 12.2.7.
- The Server Action five-seam shape and the canonical `Result<T>` — 7.2.2, 7.2.3.
- Zod `z.email()`, `Object.fromEntries(formData)` + `safeParse`, `z.treeifyError` — 7.1.2, 7.1.6, 7.1.5.
- `@t3-oss/env-nextjs` env validation, fail-closed at the boundary — 5.2 (named), 2.6 (the canonical `env.ts` shape).
- The idempotency-key reflex on transactional sends — 8.1.1 (named), 12.1 (generalized).
- `useActionState` + the action prop on the form, the `<SubmitButton>` with `useFormStatus` — 7.3.3, 7.3.4.

---

## Lesson 8.3.1 — Project brief

Goals:

- Frame the send as the canonical SaaS transactional surface: every later unit (auth verification email in Unit 9, invitation email in Unit 10, billing receipts in Unit 12, the notification dispatcher in Unit 14) reuses this exact wrapper, this exact suppression discipline, and this exact `Result` shape. The chapter ships one Server Action calling one template through one wrapper — the structural floor that holds for every send the student will ever wire.
- State the "Done when" six clauses in one paragraph: real-inbox arrival on the student's verified domain, DKIM=pass and SPF=pass in headers, the React Email template renders (desktop + mobile + dark), the plain-text fallback is present, the suppression path short-circuits without calling Resend, the idempotency key prevents double-sends on retry.
- Name the scope cuts: no webhook handler for bounces and complaints (Chapter 12.1.5 — the *write* side of `email_suppressions`), no batch sends (Unit 14 — `/emails/batch`), no marketing email (Resend Broadcasts is out of scope, the project is transactional only), no per-tenant custom-domain sending (named once in 8.1.3, dropped), no rate-limiter on the action (Chapter 15.4 wraps the auth surface; the inspector button is rate-limit-immune by being internal), no audit log on the send (Unit 10 owns the `audit_logs` write), no React Hook Form (`useActionState` owns the form state — 7.3 chapter discipline).
- Set the senior payoff: the wrapper shape installed here is the chokepoint for every email the SaaS will send. Adding a new send is "write the template, write the action, call `sendEmail`" — never "remember to check suppressions, remember to set the idempotency key, remember to default the `from`." The chokepoint is the discipline.
- The prerequisite call-out: this chapter requires a cheap real domain. Resend's `onboarding@resend.dev` sandbox sender is explicitly out — deliverability is the point, and the sandbox sender lands in the spam folder for most providers. Namecheap / Porkbun / Cloudflare Registrar cost $8–12 per year for a `.com`. The student that already has a personal domain (a portfolio site, a side-project domain) uses a subdomain on it (`send.<existing>.<tld>`). The setup is one-time; later units (auth, invites, billing) reuse the same domain and key.
- Show the end UX: one screenshot strip of `/inspector/send-welcome` → success card with the Resend ID → the Gmail inbox showing the rendered template → the Gmail "Show original" headers panel with the SPF/DKIM/DMARC pass lines.
- Link the starter via `degit` from the `react-saas-course-projects` monorepo.

Senior calls and watch-outs:

- The `onboarding@resend.dev` sandbox sender is forbidden in this project. Reaching for it to skip the DNS step trains a bad reputation (Resend's shared sandbox is widely deny-listed for inbox placement) and means the verify step can't prove DKIM-pass on the student's domain. The point of the chapter is to land deliverability *on the student's own domain*.
- `lib/email.ts` is the chokepoint. Reaching for `resend.emails.send(...)` from anywhere except `lib/email.ts` is the structural smell — Unit 9's verification email, Unit 10's invitation email, Unit 12's billing receipt, Unit 14's notification dispatcher all go through this one function.
- The Resend client is *not* wrapped in a generic `EmailProvider` interface for "future provider swap." The 12.2.7 rule: Resend, Trigger.dev, R2 are not wrapped; the swap cost doesn't justify the abstraction tax. The wrapper is a *convenience* layer (suppression + defaults + `Result` shape), not an *abstraction* layer.

Codebase state at entry: empty working directory.
Codebase state at exit: starter cloned, `docker compose up -d` running Postgres, `pnpm install` clean, `pnpm db:migrate && pnpm db:seed` populated (the seed includes one pre-suppressed `suppressed@<student-placeholder>` row), `pnpm dev` shows `/inspector/send-welcome` with the button rendered. Clicking the button errors (`sendWelcomeEmail` is empty) — that's the runnable starting point.

Estimated student time: 10 to 15 minutes.

---

## Lesson 8.3.2 — Starter walkthrough and the verified-domain ceremony

Goals:

- Walk the file tree, separating provided from stub. Linger on three areas:
  - **`lib/env.ts`** — the existing `@t3-oss/env-nextjs` schema; the TODO comment naming the three new entries. Students read the existing entries (`DATABASE_URL` and friends from 6.6) and add the email block in 8.3.3.
  - **`db/schema.ts` + `db/seed.ts`** — confirm the `email_suppressions` table exists (carry-in from 8.1.4 if the project repo carries it; the starter applies the migration if not). The seed inserts one row at `suppressed@<student-domain-placeholder>`; the README explains the placeholder gets replaced with the student's actual transactional subdomain before `pnpm db:seed` runs.
  - **`app/inspector/send-welcome/page.tsx` + `send-welcome-form.tsx`** — read them to lock in the form's `FormData` shape: `recipientEmail` and `firstName` are the two fields, the form posts to the student-written `sendWelcomeEmail` action. The result cards are wired against the three `Result` shapes the action will return.
- Walk the Resend ceremony on the *student's own* domain — this re-runs 8.1.1 + 8.1.2 + 8.1.3 against the student's real registrar account:
  - Create a Resend account if not already done; create one sending-only API key for `dev` and one for `production` (one key per environment from day one — 8.1.1's senior call).
  - Add the sending subdomain (`send.<student>.<tld>`) at Resend; Resend publishes the SPF TXT, the DKIM TXT (selector `resend._domainkey`), and the optional MX record.
  - At the registrar (Namecheap / Porkbun / Cloudflare), add the records exactly as Resend issued them. Watch-out: some registrars truncate long TXT values — the DKIM key must be the full string; some registrars want the host as `resend._domainkey` and some as `resend._domainkey.send` (relative vs. absolute), the chapter names both conventions and the student picks based on their registrar's UI.
  - Wait for verification (typically minutes, up to 24 hours). The Resend dashboard's domain page flips to `Verified` when SPF and DKIM resolve.
  - Publish the apex DMARC record at `_dmarc.<student>.<tld>`: `v=DMARC1; p=none; rua=mailto:dmarc-reports@<student>.<tld>;` — `p=none` is the starting policy (8.1.2's progression). The aggregate-report mailbox can be the student's personal inbox for a side project; production teams use a parsing service.
  - Confirm the verification by sending a test from Resend's dashboard "Send test email" feature to the student's personal inbox; in Gmail's "Show original" panel, confirm SPF=PASS, DKIM=PASS, DMARC=PASS. *This is the unblocking gate for the rest of the chapter* — if verification fails here, no later step works.
- Read the provided `emails/components/EmailLayout.tsx` to lock in the brand-surface contract: it reads `env.NEXT_PUBLIC_APP_NAME`, renders a header band with the logo (the URL is in `EmailLayout`'s constants — the student can swap it for their own asset hosted on the marketing site or R2 once Unit 13b lands), and a footer with the legal address (a placeholder the student edits to their real address). The template the student writes in 8.3.4 wraps its body in `<EmailLayout>`.
- Bring up the dev surface twice: `pnpm dev` for the Next.js app, `pnpm email dev --port 3001` for the React Email preview server (the 8.2.2 port-clash watch-out). Both run side-by-side for the rest of the chapter.

Senior calls and watch-outs:

- DKIM verification failure is almost always a TXT-record truncation or a wrong host. The chapter names this once: when verification stalls past 30 minutes, re-paste the DKIM value from Resend into the registrar field and compare against `dig TXT resend._domainkey.send.<domain> +short`.
- The DMARC record at `_dmarc.<apex>` covers subdomains by inheritance (8.1.2). Publishing DMARC at `_dmarc.send.<domain>` only and not at the apex leaves the apex unprotected.
- The DMARC starts at `p=none` and `rua` reports flow for a week before the student bumps to `p=quarantine` (8.1.2's progression). The chapter's project ships at `p=none`; the student schedules a calendar reminder to graduate the policy.
- The student's seed-row email at `suppressed@send.<student>.<tld>` is *not* a real receiving address — the suppression read short-circuits before Resend would attempt delivery, so the address never needs to exist. The senior anchor: the suppression check happens at the application layer, the destination is irrelevant on that path.

Codebase state at entry: starter cloned, Postgres up, seed run, dev servers boot but the action is empty.
Codebase state at exit: the student's transactional subdomain is `Verified` in the Resend dashboard, SPF/DKIM/DMARC records are live (verified with a Resend-dashboard test send), the `RESEND_API_KEY` is in the student's password manager ready to drop into `.env.local`, both dev servers (`pnpm dev` and `pnpm email dev`) run side-by-side. No application code written yet.

Estimated student time: 30 to 45 minutes (heavy on real-world DNS waits; the wait time is the dominant variable).

---

## Lesson 8.3.3 — Env entries, the suppression helper, and the `lib/email.ts` wrapper

Goals:

- Fill the email block in `lib/env.ts`. Add to the `server` section of the existing `@t3-oss/env-nextjs` schema:
  - `RESEND_API_KEY: z.string().min(1)` — fail-closed if missing.
  - `EMAIL_FROM: z.string().min(1)` — the full `Display Name <local-part@send.domain.tld>` format. The student sets it in `.env.local` to their verified subdomain (e.g., `'Acme <noreply@send.acme.example>'`).
  - `EMAIL_REPLY_TO: z.email()` — a monitored mailbox at the apex (`support@<student>.<tld>` or the student's personal inbox for the project).
  Also add `NEXT_PUBLIC_APP_NAME: z.string().min(1)` to the `client` section so `EmailLayout.tsx` can read it. Confirm `pnpm dev` boots cleanly; comment out `RESEND_API_KEY` and confirm the boot fails with the Zod error (one verify step landed early).
- Fill `lib/suppressions.ts`. Single named export:
  - `isSuppressed(email: string, opts: { kind: 'transactional' | 'marketing' }): Promise<{ suppressed: boolean; reason?: string; bypassUntil?: Date }>`
  - Normalize the email first (`email.trim().toLowerCase()`).
  - Query `email_suppressions` by the normalized email — a single index lookup on the unique-on-email index from 8.1.4.
  - No row → `{ suppressed: false }`.
  - Row with `bypass_until > now()` → `{ suppressed: false, bypassUntil }` (the carve-out is active).
  - Row with `reason === 'manual_unsubscribe'` and `kind === 'transactional'` → `{ suppressed: false, reason: 'manual_unsubscribe' }` (the transactional bypass from 8.1.4 — the user can't opt out of password resets).
  - Otherwise → `{ suppressed: true, reason: row.reason }`.
  Mark the helper `import 'server-only'` at the top — never bundle into a client component.
- Fill `lib/email.ts`. The structure:
  - `import 'server-only'` at the top, then the Resend client singleton: `const resend = new Resend(env.RESEND_API_KEY);` at module scope.
  - The `SendInput` type and `sendEmail` function with the signature from the framing. Body:
    1. Normalize `to` (lowercase, trim) — same rule as the suppression helper.
    2. `const check = await isSuppressed(normalizedTo, { kind: 'transactional' });` — every transactional send through this wrapper passes `kind: 'transactional'` (the marketing send path lands in a hypothetical Unit 14 sibling; not built here).
    3. If `check.suppressed && !bypassSuppression`, return `err('suppressed', 'This recipient is on the suppression list.')` — *do not call Resend*. Log the disposition (`console.info('[email] suppressed', { to: normalizedTo, reason: check.reason })`) so the operator sees it.
    4. Otherwise: `const { data, error } = await resend.emails.send({ from: env.EMAIL_FROM, to: normalizedTo, replyTo: replyTo ?? env.EMAIL_REPLY_TO, subject, react }, { idempotencyKey });`.
    5. On `error`, return `err('internal', 'Email send failed.')` (log the error structure). On `data`, return `ok({ id: data.id })`.
- The `'suppressed'` code is added to the `Result.error.code` union in `lib/result.ts`. Update the type once (the file is provided; this is a one-line edit) so action callers can branch on `code === 'suppressed'` exhaustively.
- Runnable proof: the inspector form still errors because the action is empty, but the helpers compile and the env loads. Test the suppression helper directly: add a temporary scratch route or run a one-liner via `pnpm tsx` that imports `isSuppressed` and prints the result for the seeded suppressed address (`true`) and an unrelated address (`false`). Confirm both, delete the scratch.

Senior calls and watch-outs:

- The Resend client is `new Resend(env.RESEND_API_KEY)` at module scope, not inside the function. The SDK is cheap to construct, but the module-scope singleton matches the 8.1.1 pattern and avoids re-allocating per-request. Watch-out: in tests the singleton needs to be mockable — Unit 19 (testing) names the MSW boundary; this chapter doesn't test the wrapper directly.
- The suppression check is at the wrapper, never at callers. The temptation in 8.3.4 will be "I'll check it in the action too, just in case." The 8.1.4 rule: the wrapper is the chokepoint; double-checking is the smell. Trust the chokepoint.
- `idempotencyKey` is a required parameter, not optional. Reaching to make it optional ("for ad-hoc sends") is the smell — every transactional send has a logical event to key on (verification token ID, password-reset request ID, invoice send-job ID, in this chapter's case `welcome:${userId}:${recipientEmail}`). The required-parameter shape forces the caller to think about replay safety.
- The `from` defaults to `env.EMAIL_FROM`, never accepts an override at the call site. Allowing per-call `from` is how multi-tenant sends accidentally land on the wrong subdomain. The 8.1.3 rule made structural: the wrapper owns the sender identity.
- Log structure matters. `console.info('[email] sent', { id, to, subject })` and `console.error('[email] failed', { to, error })` — the structured-log pattern Unit 20.1 generalizes. Don't reach for `console.log(JSON.stringify(...))` or freehand strings.
- The wrapper's signature returns the union from 7.2.3 — no throws on expected failures (suppression, validation, Resend errors). Action callers read the `ok` boolean, never wrap in try/catch.

Codebase state at entry: env is missing the email block; `lib/email.ts` and `lib/suppressions.ts` are empty stubs; the action is empty.
Codebase state at exit: env loads with the new variables, `isSuppressed` works against the seeded row, `sendEmail` compiles and is importable. The action is still empty (next lesson) but every supporting piece is in place. `pnpm dev` boots cleanly; the inspector page renders.

Estimated student time: 30 to 40 minutes.

---

## Lesson 8.3.4 — The `WelcomeEmail` template and the welcome Server Action

Goals:

- Fill `emails/WelcomeEmail.tsx`. Default-exported React component, typed props `{ firstName: string; verifyUrl: string }`, wrapped in `<EmailLayout>`. The structure mirrors 8.2.1's component vocabulary:
  - `<Html lang="en">` + `<Head>` with `<Title>Welcome to {appName}</Title>`, the dark-mode meta tags (`color-scheme`, `supported-color-schemes`) from 8.2.3, and the inline `<style>` with `:root { color-scheme: light dark; }`.
  - `<Preview>` set to `Welcome to {appName} — verify your email` (the inbox preheader from 8.2.1).
  - `<Body>` → `<EmailLayout>` → `<Container>` → `<Section>` containing `<Heading as="h1">Welcome, {firstName}</Heading>`, `<Text>` with a one-paragraph welcome, `<Button href={verifyUrl}>Verify your email</Button>`, and a small `<Text>` with the alternate-text-link version (`If the button doesn't work, paste this link: {verifyUrl}`).
  - Wrapped in `<Tailwind>` for utility-class styling (`text-zinc-900 dark:text-zinc-100`, `max-w-[600px] mx-auto`, `bg-zinc-50 dark:bg-zinc-900`).
  - Exports `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://example.com/verify/abc-123' }` so the preview server renders without a separate fixtures file.
- Eyeball the template in `pnpm email dev` at `http://localhost:3001`:
  - Desktop view — heading wraps cleanly, button width comfortable.
  - Mobile view (375 px toggle) — text reflows, button stays tappable (44 px touch target — 8.2.3 floor).
  - Dark-mode toggle — background and text invert, brand color on the button stays readable.
  - HTML tab — confirm `<Preview>` text is in the document, the `<Tailwind>` classes compiled to inline styles, the dark-mode meta tags are in `<head>`.
  - Plain-text tab — read it top to bottom: `Welcome, Ada\n\n[paragraph]\n\nVerify your email [https://example.com/verify/abc-123]\n\nIf the button doesn't work...`. Confirm it stands alone as a coherent message (8.2.3's coherence check).
- Send a test from the preview server's "Send test" button to the student's personal Gmail and Apple Mail. Eyeball each in the real client. Cross-client check: does the button render correctly in Outlook (if the student has one)? Does Gmail Android's blanket inversion break anything?
- Fill `app/actions/send-welcome.ts`. File-level `'use server'`. The `sendWelcomeEmail(prevState, formData)` action follows the five-seam shape:
  1. **Parse.** `const raw = Object.fromEntries(formData);` → `const parsed = z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) }).safeParse(raw);` → on `!parsed.success`, return `err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`.
  2. **Authorize (stub).** `const { userId } = await getActiveContext();` — Unit 9 swaps this for the real session read. No role check in this project (no `authedAction` wrapper yet — Unit 10).
  3. **Idempotency key.** `const idempotencyKey = `welcome:${userId}:${parsed.data.recipientEmail.trim().toLowerCase()}`;` — the same retry of this action invocation produces the same key, Resend returns the same send ID, the inbox gets one email regardless of how many times the inspector button is clicked.
  4. **Compute the verify URL.** For this project the URL is a placeholder: `const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}`;` — Unit 9 replaces this with a real signed token. The placeholder is named in a `// TODO Unit 9` comment.
  5. **Send.** `const result = await sendEmail({ to: parsed.data.recipientEmail, subject: `Welcome to ${env.NEXT_PUBLIC_APP_NAME}`, react: <WelcomeEmail firstName={parsed.data.firstName} verifyUrl={verifyUrl} />, idempotencyKey });`. Return `result` unchanged — the wrapper already returns `Result<{ id: string }>` with all three failure shapes (`'suppressed'`, `'internal'`, plus the action's own `'validation'`).
- The inspector form (provided) already reads `useActionState(sendWelcomeEmail, null)` and renders the three result cards. Submitting now works end-to-end.
- Runnable proof: at `/inspector/send-welcome`, set `recipientEmail` to the student's own inbox, click "Send welcome". Within ~2 seconds the success card shows the Resend send ID. Within ~15 seconds the email arrives in the inbox with the rendered template, the correct `from` and `reply_to`, and the plain-text part viewable via "Show original".

Senior calls and watch-outs:

- The template is *props-only* — no env reads inside the component, no DB reads, no session reads. The action computes the values, passes them as props (8.2.1's pure-renderer rule). The reach to "just import the app name from env inside the template" is the smell — the template's `PreviewProps` then drift from production, the preview server lies, the test-send doesn't match the real send. Read `env.NEXT_PUBLIC_APP_NAME` *outside* the template, pass it as a prop or read it in `EmailLayout` once where the brand surface lives.
- The action's `safeParse` runs before `getActiveContext()` — the parse is cheap, the auth read is going to be a session-cookie + DB hit once Unit 9 lands. Parse-first means malformed inputs don't pay the auth cost. The 7.2.4 ordering rule made operational again.
- The `recipientEmail` validation is `z.email()`, the modern Zod 4 top-level format builder from 7.1.2. The action does *not* do an MX-record probe (named in 8.1.4 as the high-stakes-signup defense, out of scope for this chapter) — for the welcome flow the suppression read after a bounce catches the typo case.
- The `verifyUrl` placeholder is intentional — the student doesn't invent a real token-signing scheme to fill it. Unit 9 owns Better Auth's email-verification token flow; this chapter ships the placeholder URL and the `// TODO Unit 9` comment so the swap is obvious.
- Returning the wrapper's `Result` unchanged is the discipline. The instinct to "wrap and re-shape" — `if (!result.ok && result.error.code === 'suppressed') return err('validation', 'Bad email')` — collapses the failure surface and the inspector loses the diagnostic. The action is a thin orchestrator; the wrapper owns the failure taxonomy.
- The JSX in the action body (`<WelcomeEmail .../>`) compiles fine inside a `.ts` file because Next.js's tsconfig has `jsx: 'preserve'` and the file *is* a server file — the React element is constructed on the server, never serialized to a client, the Resend SDK runs `render` on it server-side. Watch-out for stale ESLint configs that flag JSX in non-`.tsx` files; rename to `send-welcome.tsx` if the linter complains (the chapter ships the file as `.tsx` for that reason).

Codebase state at entry: env loaded, helpers in place, action and template both empty.
Codebase state at exit: full send path works end-to-end against the student's verified domain. The success path delivers a real email; the suppression path (testing with the seeded `suppressed@...` recipient) short-circuits; the validation path returns `fieldErrors` from an empty `recipientEmail`. Every clause of "Done when" is satisfiable from this state; 8.3.5 walks the verify.

Estimated student time: 40 to 55 minutes.

---

## Lesson 8.3.5 — Verify

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- **Real-inbox arrival on the verified domain.** Set `recipientEmail` to the student's own Gmail. Click "Send welcome". The success card renders within ~2 seconds with the Resend send ID; the inbox shows the email within ~15 seconds. Read the `from` line — it matches `EMAIL_FROM`. Click "Reply" in Gmail — the recipient field is `EMAIL_REPLY_TO`, not the `noreply@` mailbox. The `noreply@`-plus-`reply_to` pattern from 8.1.3 lands visibly.
- **DKIM and SPF pass.** In Gmail, three-dot menu → "Show original". Confirm `SPF: PASS with IP <Resend's outbound IP>`, `DKIM: PASS with domain send.<student>.<tld>`, `DMARC: PASS`. If any line says `FAIL` or `NEUTRAL`, the chapter points at the DNS step in 8.3.2 — re-check the TXT records via `dig`. Re-run the send to `check-auth@verifier.port25.com` and read the auto-reply for a second confirmation.
- **Template renders correctly.** Eyeball the email body. The heading reads `Welcome, Ada` (or whatever `firstName` was submitted). The CTA button renders with the brand color, not a default Outlook blue or a missing-style gray. Mobile (open the same email on the student's phone): the layout reflows, the button stays tappable. Dark mode (toggle Apple Mail to dark, or open in Gmail Android): the background inverts, the text stays readable, the logo doesn't disappear.
- **Plain-text fallback present.** "Show original" → scroll to the MIME parts. Confirm `Content-Type: multipart/alternative` with both `text/plain` and `text/html` boundaries. The text part contains the heading, the welcome paragraph, the verify link rendered as `Verify your email [https://...]`. Test the no-HTML case by viewing the message in a plain-text-only mode (Apple Mail's "Plain Text" view setting, or a corporate mailbox with HTML stripping if available).
- **Suppression path returns `{ ok: false, reason: 'suppressed' }`.** Set `recipientEmail` to the seeded `suppressed@send.<student>.<tld>`. Click "Send welcome". The suppression card renders. Open the Resend dashboard's "Logs" tab — no entry for this address (the SDK was never called). Add a temporary `console.log('[email] calling resend')` in `lib/email.ts` immediately before `resend.emails.send(...)` and confirm via `pnpm dev` terminal output that it never fires on the suppressed path. Remove the log.
- **Idempotency key prevents double-sends.** Set `recipientEmail` to a fresh test inbox (the student's secondary Gmail or an iCloud alias). Click "Send welcome"; the success card shows send ID `re_abc`. Immediately click again with the same recipient and same `firstName`. Watch the Resend dashboard — the second call returns the same `re_abc` (the SDK retains the idempotency key for 24 hours). The inbox shows exactly one email, not two. Now change the `firstName` and click — *still* the same key (the key is `welcome:${userId}:${recipientEmail}`), so still one email. Name the constraint: the chapter's key shape is "one welcome per user per recipient" — a per-day rotation (`welcome:${userId}:${recipientEmail}:${dailyToken}`) is the production reach when a "resend welcome" UX needs to bypass; the chapter ships the simpler form.
- **Validation error path.** Submit the form with `recipientEmail` empty. The validation card renders with `fieldErrors.recipientEmail = ['Invalid email']` (or the Zod 4 default message). The `firstName` keeps its typed value. Submit with `firstName` blank — `fieldErrors.firstName` shows.
- **Env validation fail-closed.** Comment out `RESEND_API_KEY` in `.env.local`; restart `pnpm dev`. The server fails to boot with the `@t3-oss/env-nextjs` Zod error pointing at the missing variable. Restore. Same test with `EMAIL_FROM` malformed (not a valid `Display Name <addr@domain>` shape) — the boot fails because the schema's `.min(1)` matches but the runtime will fail; tighten the schema if desired (a regex check on the full format) or leave as-is per the chapter's pragmatic floor. Name the trade.
- **DKIM/SPF/DMARC headers on a second test send.** Run the test send from `/inspector/send-welcome` to an Outlook.com inbox (or Proton, or any non-Gmail). Confirm in the receiving client's "view source" or equivalent that the same three authentication results pass. This catches the case where Gmail's lenient parsing hides a misconfiguration that Outlook flags.
- **Senior recap.** Name the disciplines installed:
  - One named seam (`lib/email.ts`) for every email the SaaS will ever send.
  - The suppression check is at the wrapper, never at the call site.
  - The idempotency key is required, not optional.
  - The template is a pure renderer; props in, HTML+text out.
  - The action follows the 7.2 five-seam shape; suppression failures and Resend failures both return through the same `Result` channel.
  - Env validates at boot via `@t3-oss/env-nextjs`; missing `RESEND_API_KEY` fails the build, not the production send.
  - The verified domain plus DKIM-pass plus DMARC-pass plus the suppression discipline is the deliverability floor for every later flow.
- **Forward references.**
  - Unit 9 (Better Auth) replaces the `verifyUrl` placeholder with a real signed verification token and calls `sendEmail({ react: <VerificationEmail ... /> })` from the sign-up flow — same wrapper, new template.
  - Unit 10 (RBAC + invitations) ships `<InvitationEmail />` and calls `sendEmail` from the invite-create action; the audit log writes a row for every send.
  - Unit 12.1.5 (webhook handler — Resend bounces and complaints) is the *writer* for `email_suppressions`. Once it ships, the table populates from real-world delivery telemetry; the suppression read this chapter installs immediately benefits.
  - Unit 12.2 (billing) sends receipt emails through the same wrapper.
  - Unit 13a (Trigger.dev) sends the export-ready email through the same wrapper from inside a durable task — the chapter's signature works unchanged inside a Trigger task body.
  - Unit 14 (notification dispatcher) adds the per-channel and per-preference layer *on top of* `sendEmail`; the wrapper this chapter installs is the email-channel leaf of that dispatcher.
  - The DMARC policy graduates from `p=none` to `p=quarantine` to `p=reject` over the project's lifetime (8.1.2's progression) — the chapter ships at `p=none`, the student schedules the bump.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of every failure mode the chapter installs the disciplines against. If a verify step fails, the chapter points the student at the owning build lesson — DKIM fail → 8.3.2's DNS step; suppression path called Resend → 8.3.3's wrapper structure; template missing `<Preview>` → 8.2.1.
- The "Show original" headers panel in Gmail is the cheapest single source of truth for deliverability — every later unit's email send gets one "Show original" eyeball at feature-launch time. The 2026 reflex.
- The cross-client test (Outlook or Proton) catches the misconfiguration Gmail's lenient parser hides. Run it once per chapter, not per send.
- Production rollout — when the student deploys this to a real Vercel preview or production environment, the `RESEND_API_KEY` and `EMAIL_FROM` set in Vercel's env panel use the *production* Resend key (not the dev key). The per-environment key discipline from 8.1.1 lands here in practice.

Codebase state at entry: the full send path works end-to-end against the student's verified domain.
Codebase state at exit: same surface, verified clause-by-clause. The student can articulate every decision made in the chapter and the unit that will extend each one. The `lib/email.ts` wrapper is the foundation for every send Units 9–14 will wire on top.

Estimated student time: 25 to 35 minutes.
