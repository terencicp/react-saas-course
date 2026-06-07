# Chapter 050 — Project: the welcome email send path

## Chapter framing

Chapter 050 cashes in Unit 7: the verified-domain ceremony, the SPF/DKIM/DMARC plumbing, the transactional subdomain split, and the `email_suppressions` read discipline (chapter 048); plus the React Email component vocabulary, the preview dev loop, and the plain-text/accessibility/dark-mode posture (chapter 049). The student wires Resend on their own verified domain, writes `src/lib/email.ts` as the suppression-gated send wrapper, ships the `WelcomeEmail` React Email template (`src/emails/welcome.tsx`), and exposes a Server Action that the pre-built inspector page fires from a form alongside a live preview iframe of the template.

The project's stated goals — the capabilities the finished app demonstrates:

- A welcome email arrives in the student's real inbox, sent from their own verified domain, with the configured `from` display name and a `reply_to` that lands at a monitored mailbox.
- The delivered message passes authentication: DKIM=pass, SPF=pass, and DMARC=pass in the receiving client's headers.
- The React Email template renders correctly across desktop, mobile (375 px), and dark mode, and ships a plain-text fallback alongside the HTML part.
- The suppression path short-circuits: a send to a suppressed recipient returns `err('forbidden', 'This recipient is on the suppression list.')` without calling Resend.
- The idempotency key prevents double-sends — clicking send twice for the same recipient yields one email and the same Resend send ID.
- The env schema fails closed: a missing `RESEND_API_KEY` stops the server from booting.

Threads that run through every lesson: `src/lib/email.ts` is the single named seam — Architectural Principle #3 made operational; Resend is NOT wrapped in a generic adapter, the wrapper only adds the suppression read, the default `from`, and the `Result` shape (the "thin convenience layer, not an adapter" / Principle #5 rule from lesson 1 of chapter 048); the React Email template is a pure renderer with typed props, callers compute values, the template stays stateless; the Server Action follows the chapter 043 five-seam shape (parse → authorize → idempotency key → render → send → return `Result`, with the suppression read inside the wrapper); `@t3-oss/env-nextjs` schema-validates `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` at build/boot — fail-closed; the `email_suppressions` read is at the wrapper, never at callers; the idempotency key is set on every transactional send (verification token / row ID); the verify is run against a real inbox on the student's own verified domain, not Resend's sandbox.

### Dependency carry-in

- **From lesson 1 of chapter 048 / lesson 2 of chapter 048 / lesson 3 of chapter 048:** Resend account, the verified transactional subdomain (`send.<student>.<tld>`), SPF/DKIM/DMARC records published, the `resend` Node SDK, the per-purpose `from` address discipline, the `reply_to` pattern. The student walks chapter 048's setup again in the verified-domain ceremony walkthrough to land it on their *own* domain (not just read about it).
- **From lesson 4 of chapter 048:** the `email_suppressions` Drizzle table shape (`id`, `email`, `reason` enum, `provider_event_id`, `bypass_until`, `metadata`, `created_at`, `updated_at`), the normalize-on-read rule (lowercase + trim), the read-at-the-wrapper pattern, the `bypassSuppression` carve-out semantics, the `reason`-aware bypass (transactional bypasses `manual_unsubscribe` only). The webhook *writer* lands in lesson 5 of chapter 063 — out of scope here.
- **From lesson 1 of chapter 049 / lesson 2 of chapter 049 / lesson 3 of chapter 049:** the React Email primitives (`<Html>`, `<Head>`, `<Preview>`, `<Container>`, `<Section>`, `<Heading>`, `<Text>`, `<Button>`, `<Img>`, the `<Tailwind>` wrapper), `PreviewProps` as the mock-data contract, the `pnpm email dev` loop, the head meta plumbing for dark mode, the `lang`/`<Title>` accessibility floor. The student writes the template once against this vocabulary.
- **From lesson 1 of chapter 043 / lesson 2 of chapter 043 / lesson 3 of chapter 043 / lesson 4 of chapter 043 / lesson 5 of chapter 043:** the `'use server'` file-level directive, the five-seam action shape, the `Result<T>` type plus `ok`/`err` helpers in `src/lib/result.ts`, the full error-code union (`'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'internal'`) — already complete from chapter 047, this chapter adds no new code and reuses `'forbidden'` for the suppression short-circuit; `revalidatePath` is NOT used (no list to revalidate), no transaction (the send is one external call).
- **From lesson 2 of chapter 042 / lesson 6 of chapter 042 / lesson 7 of chapter 042:** `z.email()`, `safeParse(Object.fromEntries(formData))`, `z.flattenError(parsed.error).fieldErrors` for the `fieldErrors` shape.
- **From chapter 041 / chapter 047:** the `db` client (`src/db/index.ts`, postgres-js with snake_case casing), `src/db/schema.ts` already contains the `email_suppressions` table from lesson 4 of chapter 048 (the starter ships it pre-written), the `src/lib/auth-stub.ts` `getActiveContext()` resolving a fixed org+user by natural key (slug `acme` / email `ada@acme.test`) and returning `{ organizationId, userId }` (Better Auth lands in Unit 8).
- **From chapter 041:** `src/env.ts` already exists with `@t3-oss/env-nextjs`; the student adds the new server entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) and the new client entries (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`), wiring each into `runtimeEnv`. The `server-only` poison lives in the consuming `src/lib/*` modules (`email.ts`, `suppressions.ts`), not in `src/env.ts`.

### Auth carve-out (deferred to Unit 8)

The Server Action needs a recipient and a logged-in identity. Unit 8 (Better Auth) doesn't exist yet — the inspector form passes the recipient address as a `FormData` entry; the action calls `getActiveContext()` from `src/lib/auth-stub.ts` for the `userId` slot used in the idempotency key. The stub resolves the seeded org+user by natural key (it `await`s a DB read, matching where Ch 057's `authedAction` lands), so the seed must be run. Reaching for `cookies()` or inventing a session reader is the smell — leave the stub alone, Unit 8 swaps it in cleanly.

### Starter file tree (stubs marked with TODO)

```
src/
  env.ts                           # provided: @t3-oss/env-nextjs boundary; TODO(L3): add RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL
  db/
    index.ts                       # provided: postgres-js db client, snake_case casing
    schema.ts                      # provided: email_suppressions table + suppressionReason enum (carry-in from lesson 4 of chapter 048)
    columns.ts                     # provided: shared timestamps column group
  lib/
    email.ts                       # TODO(L3) student: Resend client singleton + sendEmail wrapper with suppression read
    suppressions.ts                # TODO(L3) student: isSuppressed(email, { kind }) helper, normalize-on-read
    result.ts                      # provided: Result<T>, ok(), err(), isUniqueViolation() (carry-in from chapter 043)
    auth-stub.ts                   # provided: getActiveContext() resolving seeded org+user by natural key (carry-in from chapter 047)
    utils.ts                       # provided: cn() Tailwind class merger
  emails/
    welcome.tsx                    # TODO(L4) student: WelcomeEmail React Email template + PreviewProps
    email-tailwind-config.ts       # provided: shared email Tailwind config (pixelBasedPreset + brand tokens)
    components/
      email-layout.tsx             # provided: brand header logo + footer legal chrome (literal constants, no env reads)
  app/
    page.tsx                       # provided: redirect to /inspector/send-welcome
    layout.tsx                     # provided: root layout (ThemeProvider, Toaster, metadata)
    _components/
      providers.tsx                # provided: ThemeProvider wrapper
      submit-button.tsx            # provided: SubmitButton with useFormStatus pending state
      field-error.tsx              # provided: FieldError renderer
    actions/
      send-welcome.tsx             # TODO(L4) student: sendWelcomeEmail Server Action (.tsx — constructs JSX)
    inspector/
      send-welcome/
        page.tsx                   # provided: server-rendered inspector page (form + live preview iframe via render())
        send-welcome-form.tsx      # provided: client component reading useActionState, renders three result cards
  components/ui/                   # provided: shadcn Button, Card, Input, Label, Separator, Skeleton, Toaster
scripts/
  seed.ts                          # provided: inserts org, user, and one pre-suppressed row at suppressed@send.<student-domain>
drizzle/0000_init_schema.sql       # provided: organizations, users, email_suppressions + suppression_reason enum
docker-compose.yml                 # provided: local Postgres 18
.env                               # provided in start (placeholder values); student fills the values
README.md                          # provided: the verified-domain ceremony recap, the DNS checklist
```

The provided inspector page is a server component: it `render()`s `<WelcomeEmail {...WelcomeEmail.PreviewProps} />` to HTML and shows it in a sandboxed preview iframe, beside the client `SendWelcomeForm`. The form imports the student-written action and renders the action's `Result` as one of three cards — success (Resend send ID + Resend dashboard link), suppression (a "Suppression path hit — Resend was NOT called" banner shown when `code === 'forbidden'`), and a generic error card for any other failure code.

### Reference solution signatures lessons display

- Env additions in `src/env.ts` (`server` block + `client` block, each wired into `runtimeEnv`):
  - `RESEND_API_KEY: z.string().min(1)` (server)
  - `EMAIL_FROM: z.string().min(1)` (server) — full `Display Name <local-part@send.domain.tld>` format
  - `EMAIL_REPLY_TO: z.email()` (server) — a monitored mailbox
  - `NEXT_PUBLIC_APP_NAME: z.string().min(1)` (client) — read by the action for the subject
  - `NEXT_PUBLIC_APP_URL: z.url()` (client) — read by the action to build the placeholder `verifyUrl`
- `sendEmail(input: SendInput): Promise<Result<{ id: string }>>` in `src/lib/email.ts`. `SendInput`:
  - `to: string`
  - `subject: string`
  - `react: ReactNode`
  - `idempotencyKey: string` — required, not optional (the senior call from lesson 1 of chapter 048)
  - `replyTo?: string` — defaults to `env.EMAIL_REPLY_TO`
  - `bypassSuppression?: boolean` — defaults to `false`
- `Result<T>` error codes are unchanged this chapter — the carried-in union `'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'internal'`. The suppression short-circuit reuses `err('forbidden', 'This recipient is on the suppression list.')`; the inspector branches on `code === 'forbidden'` for the suppression card.
- `isSuppressed(email: string, opts: { kind: 'transactional' | 'marketing' }): Promise<{ suppressed: boolean; reason?: string; bypassUntil?: Date }>` in `src/lib/suppressions.ts` — the helper the wrapper calls. The `kind` arg drives the `reason`-aware bypass (transactional bypasses `manual_unsubscribe` only).
- `WelcomeEmail` template in `src/emails/welcome.tsx` — default-exported React component with props `{ firstName: string; verifyUrl: string }` (exported as `WelcomeEmailProps`) and a `WelcomeEmail.PreviewProps` static. Outermost element is `<Tailwind config={emailTailwindConfig}>`, then `<Html lang="en" dir="auto">` with `<Head>` (a plain `<title>`, the `color-scheme`/`supported-color-schemes` meta, and a `:root { color-scheme: light dark; }` inline style), a `<Preview>`, and a `<Body>` wrapping `<EmailLayout>` → `<Section>` with a `<Heading>`, a `<Text>`, a `<Button href={verifyUrl}>`, and a small alternate-link `<Text>`. The `<Preview>` is `"Welcome to Acme — verify your email"`. `APP_NAME` is a module-level literal (`'Acme'`).
- `sendWelcomeEmail(_prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>` — file-level `'use server'` in `src/app/actions/send-welcome.tsx`. Five-seam shape:
  1. `z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) }).safeParse(Object.fromEntries(formData))`; on failure return `err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`.
  2. `const { userId } = await getActiveContext()`.
  3. Construct `idempotencyKey = `welcome:${userId}:${normalizedRecipient}`` (recipient trimmed + lowercased; stable across retries of the same action invocation).
  4. Build the placeholder `verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}`` with a `// TODO(Unit 8)` comment, then `await sendEmail({ to: parsed.data.recipientEmail, subject: `Welcome to ${env.NEXT_PUBLIC_APP_NAME}`, react: <WelcomeEmail firstName={parsed.data.firstName} verifyUrl={verifyUrl} />, idempotencyKey })`.
  5. Return the wrapper's `Result` unchanged.
- Env values are filled into `.env` (the start ships placeholders):
  - `RESEND_API_KEY=re_xxx`
  - `EMAIL_FROM='Acme <noreply@send.acme.example>'`
  - `EMAIL_REPLY_TO=support@acme.example`
  - `NEXT_PUBLIC_APP_NAME=Acme`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### Inspector page spec

The inspector lives at `/inspector/send-welcome` (the root `/` redirects here) and is the verification surface. It is a server component that renders a live preview iframe of the template (via `render(<WelcomeEmail {...WelcomeEmail.PreviewProps} />)`) beside the client `SendWelcomeForm`. The form carries:

- **Controls.** One `<form>` containing `recipientEmail` (email input, defaulted to the seeded `suppressed@send.acme.example` for one-click suppression testing — the student types their own address for the success-path test), `firstName` (text input, defaulted to `Ada`), and a single `<SubmitButton>Send welcome</SubmitButton>` (`useFormStatus` pending state). Field errors render through `FieldError`.
- **Observation panels.** Three result cards rendered conditionally from `useActionState`:
  - **Success card** (`state.ok === true`). Shows `state.data.id` (the Resend send ID), a "View in Resend dashboard" link, and an instruction line to check the recipient inbox.
  - **Suppression card** (`state.ok === false && state.error.code === 'forbidden'`). A banner "Suppression path hit — Resend was NOT called", the `userMessage`, and a reminder that the `email_suppressions` table is the gate.
  - **Generic error card** (`state.ok === false && state.error.code !== 'forbidden'`). Catches validation and internal failures: shows the `userMessage`; field-level errors surface inline through the form's `FieldError` components.
- **No webhook surface, no event log, no metrics panel** — the bounce/complaint webhook handler is lesson 5 of chapter 063; the dashboard panel is out of scope here. The Resend dashboard *is* the observation surface for the send itself.

### Concepts demonstrated → owning lesson

- Resend account, verified domain, API key shapes (full-access vs. sending-only) — lesson 1 of chapter 048; re-run on the student's own domain in the verified-domain ceremony walkthrough.
- SPF / DKIM / DMARC records, the alignment rule, the 2026 enforcement bar — lesson 2 of chapter 048; landed on the student's registrar in the verified-domain ceremony walkthrough.
- Transactional / marketing subdomain split, per-purpose `from` local parts, the `reply_to` pattern — lesson 3 of chapter 048; applied in the verified-domain ceremony walkthrough.
- `email_suppressions` schema, the read-at-the-wrapper discipline, the `bypassSuppression` carve-out, the `reason`-aware bypass — lesson 4 of chapter 048; built into `isSuppressed` and the wrapper (which returns `err('forbidden', ...)` on a hit) in the suppression-gated send wrapper lesson.
- React Email primitives, the `<Tailwind>` component, `<Preview>` as the preheader, `<Img>` width/height discipline, the 102 KB clipping budget — lesson 1 of chapter 049; written into `<WelcomeEmail />` in the welcome email send path lesson.
- The React Email preview iteration loop (`pnpm email` here, scripted as `email dev --dir ./src/emails --port 3001`), the viewport + dark-mode toggles, the test-send as the verification gate — lesson 2 of chapter 049; the dev surface stands up in the verified-domain ceremony walkthrough, the loop is used in the welcome email send path lesson.
- Plain-text fallback auto-derived by the Resend SDK from the `react` node (`toPlainText(html)` is the manual test-time utility), the email accessibility checklist, the dark-mode three-tier posture and head meta plumbing — lesson 3 of chapter 049; confirmed in the welcome email send path lesson.
- Architectural Principle #3 (pure `/lib`, side effects at named boundaries — `src/lib/email.ts` is the named seam) — lesson 4 of chapter 043 (the principle), lesson 1 of chapter 048 (the "thin convenience layer, not an adapter" do-not-wrap rule for Resend); made operational in the suppression-gated send wrapper lesson.
- Architectural Principle #5 (use the framework's conventions — don't invent a generic email adapter over Resend) — lesson 1 of chapter 048; applied in the suppression-gated send wrapper lesson.
- The Server Action five-seam shape and the canonical `Result<T>` — lesson 2 of chapter 043, lesson 3 of chapter 043; followed in the welcome email send path lesson.
- Zod `z.email()`, `z.strictObject`, `Object.fromEntries(formData)` + `safeParse`, `z.flattenError(...).fieldErrors` — lesson 2 of chapter 042, lesson 6 of chapter 042, lesson 5 of chapter 042; applied in the welcome email send path lesson.
- `@t3-oss/env-nextjs` env validation, fail-closed at the boundary — chapter 041 (the canonical `src/env.ts` shape); extended in the suppression-gated send wrapper lesson.
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

- Installing a side-effect boundary (`src/lib/email.ts`) as the single chokepoint for every email the SaaS will send.
- Reading a suppression list at the boundary and short-circuiting before an external call.
- Writing a props-only React Email template and eyeballing it across viewports and color schemes.
- Composing a Server Action in the five-seam shape that returns a `Result` rather than throwing.
- Proving deliverability against a real inbox using header authentication results.

### Architecture

Labeled list (shape only): the inspector form (client) → the `sendWelcomeEmail` Server Action (parse → authorize via the auth stub → compute idempotency key → build the placeholder `verifyUrl` → call the wrapper) → `src/lib/email.ts` (normalize → `isSuppressed` read → Resend SDK call) → Resend → the student's inbox. The `<WelcomeEmail />` template is rendered by the action and handed to the wrapper as a React element (and rendered again by the inspector page itself into the preview iframe). `src/env.ts` validates the five new entries at build/boot.

### Starting file tree

Reproduce the annotated tree from the Chapter framing. Comment one line each only on the files the lessons touch or that changed from the carry-in project; mark the five TODO stubs (`src/env.ts` additions, `src/lib/email.ts`, `src/lib/suppressions.ts`, `src/emails/welcome.tsx`, `src/app/actions/send-welcome.tsx`) as the highlighted focus. Name what each provided file does in one line — the deep per-file explanation lives in the lesson that first touches it:

- The provided inspector page (`src/app/inspector/send-welcome/page.tsx`) renders a live preview iframe of the template beside the client form; the form (`send-welcome-form.tsx`) posts `recipientEmail` and `firstName` to the student-written action and renders three result cards against the action's `Result` shapes — read in full when wiring the action.
- The provided `src/emails/components/email-layout.tsx` is the brand surface (header band with the logo, footer with the legal address on literal constants — no env reads), and `src/emails/email-tailwind-config.ts` is the shared email Tailwind config the welcome template's `<Tailwind>` consumes — both contracts are unpacked when the template is written.
- The provided `src/lib/result.ts`, `src/lib/auth-stub.ts`, `src/db/*`, and `scripts/seed.ts` are carry-ins; the seed inserts the org, the user, and one pre-suppressed row, and `getActiveContext()` resolves the seeded org+user by natural key.

### Roadmap

One Card per lesson in a CardGrid:

- **Lesson 2 — The verified-domain ceremony.** Stand up Resend on the student's own domain and get the transactional subdomain to `Verified` with SPF/DKIM/DMARC passing.
- **Lesson 3 — The suppression-gated send wrapper.** Add the email env entries, write `isSuppressed`, and build `src/lib/email.ts` as the single send seam that reads suppressions and requires an idempotency key.
- **Lesson 4 — The welcome email send path.** Write the `<WelcomeEmail />` template and the `sendWelcomeEmail` Server Action so the inspector button delivers a real, rendered email end-to-end.

### Setup

Command sequence (Steps component), then the dev-server commands and expected result.

- Clone the starter via `degit` from the `react-saas-course-projects` monorepo.
- `cp .env.example .env` and fill the values (the API key arrives in Lesson 2; the rest are set in Lesson 3).
- `docker compose up -d` to run local Postgres 18.
- `pnpm install`.
- `pnpm db:migrate` to apply the init migration.
- Replace the seed's placeholder suppressed address with `suppressed@send.<student-domain>` (README "Seed placeholder"), then `pnpm db:seed` — it inserts the org, the user, and the one pre-suppressed row.
- `pnpm dev` for the Next.js app, and `pnpm email` for the React Email preview server (the script bakes in `--dir ./src/emails --port 3001`, sidestepping the lesson 2 of chapter 049 port clash); both run side-by-side for the rest of the chapter.

Env var list: the three new server entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) plus the two client entries (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`) join the carried-in `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `SEED` in `.env`; their values are obtained in Lesson 2 (the API key) and Lesson 3 (the rest). Name each variable's purpose and where its value comes from. This lesson does not require the email entries validated — the `src/env.ts` schema picks them up in Lesson 3.

Expected result: `pnpm dev` serves `/inspector/send-welcome` with the form rendered beside the preview iframe (the iframe shows the TODO skeleton template until Lesson 4). Clicking "Send welcome" returns the stub's `err('internal', 'Not implemented')` because `sendWelcomeEmail` is unimplemented — that is the intended runnable starting point.

Prerequisite call-out (the one piece of rationale this lesson must carry, because it gates setup): this chapter requires a cheap real domain. Resend's `onboarding@resend.dev` sandbox sender is explicitly out — deliverability is the point, and the sandbox sender lands in the spam folder for most providers and can't prove DKIM-pass on the student's domain. Namecheap / Porkbun / Cloudflare Registrar cost $8–12 per year for a `.com`. A student who already has a personal domain uses a subdomain on it (`send.<existing>.<tld>`). The setup is one-time; later units (auth, invites, billing) reuse the same domain and key.

---

## Lesson 2 — The verified-domain ceremony

This is a Walkthrough lesson — step-by-step scaffolding, no exercises. It may carry supporting videos in the body and a closing external-resources section. It re-runs the Resend + SPF/DKIM/DMARC setup from lesson 1 of chapter 048 + lesson 2 of chapter 048 + lesson 3 of chapter 048 against the student's own registrar so the transactional subdomain is `Verified` before any code is written. This ceremony is the unblocking gate for the rest of the chapter — if verification fails here, no later lesson works.

Steps to walk:

- Create a Resend account if not already done; create one sending-only API key for `dev` and one for `production` (one key per environment from day one — lesson 1 of chapter 048's senior call). Store the key in a password manager ready to drop into `.env` in Lesson 3.
- Add the sending subdomain (`send.<student>.<tld>`) at Resend; Resend publishes the SPF TXT, the DKIM TXT (selector `resend._domainkey`), and the optional MX record.
- At the registrar (Namecheap / Porkbun / Cloudflare), add the records exactly as Resend issued them. Watch-out: some registrars truncate long TXT values — the DKIM key must be the full string; some registrars want the host as `resend._domainkey` and some as `resend._domainkey.send` (relative vs. absolute), name both conventions and let the student pick based on their registrar's UI.
- Wait for verification (typically minutes, up to 24 hours). The Resend dashboard's domain page flips to `Verified` when SPF and DKIM resolve. Watch-out: DKIM verification failure is almost always a TXT-record truncation or a wrong host — when verification stalls past 30 minutes, re-paste the DKIM value from Resend into the registrar field and compare against `dig TXT resend._domainkey.send.<domain> +short`.
- Publish the apex DMARC record at `_dmarc.<student>.<tld>`: `v=DMARC1; p=none; rua=mailto:dmarc-reports@<student>.<tld>;` — `p=none` is the starting policy (lesson 2 of chapter 048's progression). The DMARC record at the apex covers subdomains by inheritance; publishing it only at `_dmarc.send.<domain>` leaves the apex unprotected. The aggregate-report mailbox can be the student's personal inbox for a side project; production teams use a parsing service. The student schedules a calendar reminder to graduate the policy to `p=quarantine` after a week of reports.
- Confirm verification by sending a test from Resend's dashboard "Send test email" feature to the student's personal inbox; in Gmail's "Show original" panel, confirm SPF=PASS, DKIM=PASS, DMARC=PASS.
- Edit the seed-row placeholder in `scripts/seed.ts`: the shipped address is `suppressed@send.acme.example`, replaced with `suppressed@send.<student>.<tld>` before `pnpm db:seed` runs. It is not a real receiving address — the suppression read short-circuits before Resend would attempt delivery, so the address never needs to exist. The senior anchor: the suppression check happens at the application layer, the destination is irrelevant on that path.

Expected outcome on success: the student's transactional subdomain reads `Verified` in the Resend dashboard, SPF/DKIM/DMARC records are live (confirmed with a Resend-dashboard test send showing all three PASS lines), and the `RESEND_API_KEY` is stored ready for Lesson 3. No application code is written in this lesson.

Closing external-resources section: Resend's domain-verification docs, the registrar DNS guides, and a DMARC primer (added later by the resourcer).

---

## Lesson 3 — The suppression-gated send wrapper

The goal in one sentence: install `src/lib/email.ts` as the single suppression-gated, idempotency-key-required seam through which every email the SaaS sends will pass. The finished result: a `sendEmail` wrapper that compiles and is importable, an `isSuppressed` helper that correctly reports the seeded suppressed address as suppressed and any other address as clear, and an env schema that refuses to boot when `RESEND_API_KEY` is missing — all proven before any email is actually sent (the send path lands in Lesson 4).

### Your mission

You are building the chokepoint. Every transactional email this SaaS will ever send — the verification email in Unit 8, the invitation email in Unit 9, billing receipts, the notification dispatcher's email channel — flows through the one `sendEmail` function you write here, so the seam carries the disciplines no caller should have to remember: it reads the suppression list before it calls Resend, it defaults the `from` and `reply_to` from validated env, it requires an idempotency key, and it returns a `Result` rather than throwing. This is Architectural Principle #3 made operational, with Principle #5's corollary: the Resend client is *not* wrapped in a generic `EmailProvider` interface for some future provider swap — the swap cost doesn't justify the abstraction tax, so the wrapper is a convenience layer (suppression read plus defaults plus `Result` shape), never an abstraction layer. Construct the Resend client as a module-scope singleton, not per-call. Keep the suppression read at the wrapper and nowhere else: a caller double-checking suppressions is the smell, because the chokepoint is the whole point. Make the idempotency key a required parameter, not an optional one — every transactional send has a logical event to key on, and the required shape forces the caller to think about replay safety. Default the `from` to env and never accept a per-call override, the way per-call senders accidentally land multi-tenant mail on the wrong subdomain. Log dispositions with structured fields (`console.info('[email] sent', { id, to, subject })`, `console.error('[email] failed', { to, error })`), not freehand strings — the structured-log pattern Chapter 092 generalizes. The marketing send path and the bounce/complaint webhook *writer* are out of scope; the suppression helper takes a `kind` argument so the transactional bypass (a user can't opt out of password resets) is honored, but only `kind: 'transactional'` is exercised here.

- A missing `RESEND_API_KEY` stops the build/boot: commenting it out in `.env` and running `pnpm dev` (or `pnpm build`) surfaces the `@t3-oss/env-nextjs` Zod error naming the variable, and restoring it boots cleanly.
- The new env entries load and are typed: the server `EMAIL_FROM` (full `Display Name <local-part@send.domain.tld>` format) and `EMAIL_REPLY_TO` (a monitored mailbox), plus the client `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_URL` so the Lesson 4 action can read them — each also wired into `runtimeEnv`.
- `isSuppressed` reports the seeded `suppressed@...` address as suppressed and an unrelated address as clear, confirmed by importing it directly (a `pnpm tsx` one-liner or a throwaway scratch route, removed after).
- `isSuppressed` normalizes the email before querying (trim + lowercase) so casing and whitespace can't slip past the gate.
- An active `bypassUntil` window reports the recipient as not suppressed.
- A `manual_unsubscribe` row reports a transactional recipient as not suppressed (the user can't opt out of transactional mail) while still suppressing a marketing recipient.
- `sendEmail` reads the suppression list and, when the recipient is suppressed and `bypassSuppression` is not set, returns `err('forbidden', 'This recipient is on the suppression list.')` without calling Resend.
- `sendEmail` compiles and is importable with its full signature (`to`, `subject`, `react`, required `idempotencyKey`, optional `replyTo`, optional `bypassSuppression`) returning `Result<{ id: string }>`.
- The wrapper also fails closed if the suppression read itself throws (returns `err('internal', 'Could not send email.')` before any send).

### Coding time

One line directing the student to implement the `src/env.ts` additions, `src/lib/suppressions.ts`, and `src/lib/email.ts` against the brief and the tests, then attempt before reading the solution. (`src/lib/result.ts` needs no edit — its error-code union already carries `'forbidden'`.)

Hidden `<details>` reference solution, organized as it appears in the repo:

- **`src/env.ts`** — add `RESEND_API_KEY: z.string().min(1)`, `EMAIL_FROM: z.string().min(1)`, `EMAIL_REPLY_TO: z.email()` to the `server` block and `NEXT_PUBLIC_APP_NAME: z.string().min(1)`, `NEXT_PUBLIC_APP_URL: z.url()` to the `client` block, then add each to `runtimeEnv` (the t3-oss split requires both). Rationale: `NEXT_PUBLIC_APP_URL` is the same value Unit 8 reuses when it swaps the placeholder verify link for a signed token.
- **`src/lib/suppressions.ts`** — `import 'server-only'` at the top; `isSuppressed(email, { kind })` normalizes (trim + lowercase), queries `email_suppressions` by the normalized email (single index lookup on the unique-on-email index from lesson 4 of chapter 048), and returns: no row → `{ suppressed: false }`; `bypassUntil > new Date()` → `{ suppressed: false, bypassUntil }`; `reason === 'manual_unsubscribe'` with `kind === 'transactional'` → `{ suppressed: false, reason: 'manual_unsubscribe' }`; otherwise → `{ suppressed: true, reason }`.
- **`src/lib/email.ts`** — `import 'server-only'`; `const resend = new Resend(env.RESEND_API_KEY)` at module scope (the lesson 1 of chapter 048 singleton pattern; avoids re-allocating per request, and Unit 18 names the MSW boundary for testing). `sendEmail` body: normalize `to`; call `isSuppressed(normalizedTo, { kind: 'transactional' })` inside a try/catch (a thrown read fails closed with `err('internal', 'Could not send email.')`); if suppressed and not bypassed, log `console.info('[email] suppressed', ...)` and return `err('forbidden', 'This recipient is on the suppression list.')` *without calling Resend*; otherwise `await resend.emails.send({ from: env.EMAIL_FROM, to: [normalizedTo], replyTo: input.replyTo ?? env.EMAIL_REPLY_TO, subject, react }, { idempotencyKey })`; on error/no data log and return `err('internal', 'Email send failed.')`, on data log `console.info('[email] sent', ...)` and return `ok({ id: data.id })`.

Decision rationale callouts: the required (not optional) `idempotencyKey`; the env-only `from` with no call-site override; the suppression hit reusing the existing `'forbidden'` code rather than minting a new one; the wrapper returning the `Result` union with no throws on expected failures, so callers read the `ok` boolean instead of wrapping in try/catch. Link to lesson 4 of chapter 043 for the named-boundary principle and lesson 4 of chapter 048 for the suppression semantics rather than re-explaining.

### Moment of truth

How to run the lesson's test suite — the command and the expected pass output. Then the by-hand checklist for what the tests don't cover:

- Comment out `RESEND_API_KEY` in `.env`, run `pnpm dev` (or `pnpm build`), confirm it fails with the Zod env error naming the variable, then restore it and confirm a clean boot.
- Run the `isSuppressed` probe (a `pnpm tsx` one-liner importing the helper) against the seeded `suppressed@...` address and an unrelated address; confirm `true` then `false`; delete the scratch.
- Confirm `pnpm dev` boots cleanly and `/inspector/send-welcome` renders (the button still returns the action stub's error — the action lands next lesson).

---

## Lesson 4 — The welcome email send path

The goal in one sentence: deliver a real, rendered welcome email to the student's inbox when the inspector button is clicked. The finished result: a props-only `WelcomeEmail` template that previews cleanly across desktop, mobile, and dark mode and ships a coherent plain-text part, plus a `sendWelcomeEmail` Server Action that parses the form, keys the send for idempotency, and routes every outcome through the wrapper's `Result` — so a success delivers a real email, the seeded suppressed recipient short-circuits, and an empty field returns `fieldErrors`.

### Your mission

You are wiring the send end-to-end: the template the recipient sees and the action the inspector fires. Write `WelcomeEmail` as a *pure renderer* — typed props in, HTML and text out, with no env reads, no DB reads, and no session reads inside the component; the action computes the values and passes them as props, because the moment the template reads `env` directly its `PreviewProps` drift from production and the preview server starts lying about what really ships. Build it from the React Email vocabulary from chapter 049: wrap the whole tree in `<Tailwind config={emailTailwindConfig}>`, then `<Html lang="en" dir="auto">` with the dark-mode head meta (a plain `<title>`, the `color-scheme`/`supported-color-schemes` meta, the `:root { color-scheme: light dark; }` inline style), the `<Preview>` preheader, and a `<Body>` that mounts `<EmailLayout>` (the provided brand chrome) around a `<Section>` with a `<Heading>`/`<Text>`/`<Button>` body and an alternate text-link line so the CTA survives a stripped button. `EmailLayout` carries its brand strings on literal constants, so the template adds no env reads of its own. Eyeball it in `pnpm email` across desktop, the 375 px mobile toggle (the button stays a 44 px touch target), and the dark-mode toggle (the logo survives Gmail Android's blanket inversion), and read the plain-text tab top to bottom for coherence before you send a real test. Then write `sendWelcomeEmail` in the chapter 043 five-seam shape: parse first with `z.strictObject({ recipientEmail: z.email(), firstName })` (parse is cheap, the auth read will be a session+DB hit once Unit 8 lands, so malformed input shouldn't pay the auth cost); read the identity from the `getActiveContext()` stub — do not reach for `cookies()` or invent a session reader, Unit 8 swaps the stub cleanly; build the idempotency key as `welcome:${userId}:${normalizedRecipient}` so repeated clicks collapse to one send; compute the `verifyUrl` as an explicit placeholder with a `// TODO(Unit 8)` comment, because token-signing is Better Auth's job, not this chapter's; and return the wrapper's `Result` *unchanged*, never re-shaping a `'forbidden'` (suppression) failure into a `'validation'` one — the action is a thin orchestrator and the wrapper owns the failure taxonomy. No MX-record probe on the recipient (out of scope; the suppression read after a bounce catches the typo case). The action file ships as `.tsx` because it constructs JSX (`<WelcomeEmail .../>`); the element is built and rendered server-side and never serialized to a client.

- The template renders in `pnpm email` on desktop with the heading wrapping cleanly and a comfortable button width.
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
- Submitting with an empty `recipientEmail` renders the generic error card (`userMessage`) plus the inline `FieldError` on the recipient field from `fieldErrors.recipientEmail`, and the `firstName` field keeps its typed value; an empty `firstName` surfaces `fieldErrors.firstName` inline.

### Coding time

One line directing the student to implement `src/emails/welcome.tsx` and `src/app/actions/send-welcome.tsx` against the brief and the tests, then attempt before reading the solution.

Hidden `<details>` reference solution, organized as it appears in the repo:

- **`src/emails/welcome.tsx`** — default-exported `WelcomeEmail` component, props `WelcomeEmailProps = { firstName: string; verifyUrl: string }`, with `APP_NAME = 'Acme'` as a module literal. Outermost `<Tailwind config={emailTailwindConfig}>`, then `<Html lang="en" dir="auto">` + `<Head>` with a plain `<title>{`Welcome to ${APP_NAME}`}</title>`, the `color-scheme`/`supported-color-schemes` meta, and the `:root { color-scheme: light dark; }` inline style; `<Preview>Welcome to {APP_NAME} — verify your email</Preview>`; `<Body className="bg-zinc-50">` → `<EmailLayout>` → `<Section className="px-6 py-4">` with `<Heading as="h1">Welcome, {firstName}</Heading>`, a one-paragraph `<Text>`, `<Button href={verifyUrl} className="rounded-md bg-brand px-5 py-3 text-brand-foreground">Verify your email</Button>`, and a small alternate-link `<Text>` echoing the URL. Exports `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://acme.example/verify/abc-123' } satisfies WelcomeEmailProps`. (`EmailLayout` already provides the `<Container className="mx-auto max-w-[600px]">` wrap and the brand chrome.)
- **`src/app/actions/send-welcome.tsx`** — file-level `'use server'`. Five seams: (1) parse `Object.fromEntries(formData)` with `z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) })`, on failure return `err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; (2) `const { userId } = await getActiveContext()`; (3) `const normalizedRecipient = parsed.data.recipientEmail.trim().toLowerCase()` then `const idempotencyKey = \`welcome:${userId}:${normalizedRecipient}\``; (4) `const verifyUrl = \`${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}\`` with the `// TODO(Unit 8)` comment; (5) `await sendEmail({ to: parsed.data.recipientEmail, subject: \`Welcome to ${env.NEXT_PUBLIC_APP_NAME}\`, react: <WelcomeEmail firstName={parsed.data.firstName} verifyUrl={verifyUrl} />, idempotencyKey })`, return the result unchanged.

Decision rationale callouts: parse-before-authorize ordering; the pure-renderer rule and why brand strings live on `EmailLayout`'s literals (the preview server's `.react-email` working dir can't resolve `process.env.NEXT_PUBLIC_*` or `@/`) and the per-send values live in the action, not the template; the intentional `verifyUrl` placeholder deferred to Unit 8; returning the wrapper's `Result` unchanged to preserve the diagnostic surface; the `.tsx` filename because the action constructs JSX. Link to lesson 1 of chapter 049 for the template vocabulary and lesson 3 of chapter 043 for the five-seam shape rather than re-explaining. The inspector form (provided) already reads `useActionState(sendWelcomeEmail, null)` and renders the three cards, so submitting now works end-to-end.

### Moment of truth

How to run the lesson's test suite — the command and the expected pass output. Then the by-hand checklist for what the tests can't reach (the deliverability and rendering clauses, which need a real inbox and eye):

- Set `recipientEmail` to the student's own Gmail, click "Send welcome"; confirm the success card with the Resend send ID within ~2 seconds and the email in the inbox within ~15 seconds. Confirm the `from` reads as `EMAIL_FROM`; click "Reply" and confirm the recipient is `EMAIL_REPLY_TO`.
- In Gmail "Show original": confirm `SPF: PASS`, `DKIM: PASS` for `send.<student>.<tld>`, `DMARC: PASS`. If any line is `FAIL` or `NEUTRAL`, re-check the DNS records from Lesson 2 via `dig`. Optionally re-send to `check-auth@verifier.port25.com` and read the auto-reply.
- Re-send to a non-Gmail inbox (Outlook.com or Proton) and confirm the same three authentication results pass — this catches a misconfiguration Gmail's lenient parser hides.
- Eyeball the delivered body: heading reads `Welcome, {firstName}`, the CTA renders with the brand color (not Outlook blue or unstyled gray). Open on a phone (reflows, button tappable) and in dark mode (background inverts, text readable, logo survives).
- In "Show original" confirm `Content-Type: multipart/alternative` with both `text/plain` and `text/html` parts; the text part carries the heading, the welcome paragraph, and `Verify your email [https://...]`. View the message in a plain-text-only mode (Apple Mail's "Plain Text" view) for the no-HTML case.
- Set `recipientEmail` to the seeded `suppressed@send.<student>.<tld>`, click send; confirm the suppression card renders (it branches on `code === 'forbidden'`) and the Resend dashboard "Logs" tab shows no entry. The wrapper already logs `[email] suppressed` on this path — confirm that line, and not a `resend.emails.send` call, fires in the `pnpm dev` terminal.
- Send to a fresh inbox, note the send ID, then immediately click again with the same recipient; confirm the Resend dashboard returns the same send ID and the inbox shows exactly one email. Change the `firstName` and click again — still one email, same key.
- Submit with `recipientEmail` empty (generic error card plus the inline recipient `FieldError`, `firstName` retains its value) and with `firstName` empty (inline `firstName` `FieldError`).
- Senior recap and forward references: name the disciplines installed (one named seam; suppression at the wrapper; required idempotency key; pure-renderer template; five-seam action funneling all failures through one `Result`; env fail-closed at boot; verified domain + DKIM/DMARC + suppression as the deliverability floor) and point to the chapter framing's forward-references list for where each one extends. The "Show original" headers panel is the 2026 reflex for every later email send; run the cross-client check once per chapter, not per send. On production rollout, the Vercel env panel uses the *production* Resend key, landing the per-environment key discipline from lesson 1 of chapter 048.
