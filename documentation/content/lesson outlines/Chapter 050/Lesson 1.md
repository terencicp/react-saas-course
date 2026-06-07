# Lesson 1 — Project overview

## Lesson title

Page title: **Project: the welcome email send path** (the chapter-level title fits — this overview frames the whole project).
Sidebar title: **Project overview**

## Lesson type

`Project overview` — no feature built, no tests, no test-coder. The student leaves with the starter running locally and the verified-domain ceremony queued as the next step.

## Lesson framing

The student walks away understanding *why* the welcome send is the canonical SaaS transactional surface and how the project's one-seam architecture (`src/lib/email.ts` → `sendEmail`) is the structural floor every later send reuses. The senior payoff installed here is the mental model: every future email — auth verification (Unit 8), invitations (Unit 9), billing receipts (Ch 064), the notification dispatcher's email channel (Unit 13) — is "write the template, write the action, call `sendEmail`," never "remember to check suppressions, set the idempotency key, default the `from`." The lesson ends with the starter app booted, the inspector page rendering, and the prerequisite (a cheap real domain) understood as the gate for Lesson 2.

## Codebase state

First lesson — no Entry/Exit deltas. Exit state: starter cloned and running; `pnpm dev` serves `/inspector/send-welcome` with the form beside a preview iframe showing the TODO skeleton template; the seed has run (org, user, one pre-suppressed row); clicking "Send welcome" returns the action stub's `err('internal', 'Not implemented')` — the intended runnable starting point. No email entries are validated yet (the `src/env.ts` schema picks them up in Lesson 3).

## Lesson sections

Follow the Project overview section list: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.

### What we're building (intro, no header)

One paragraph framing the welcome send as the canonical SaaS transactional surface every later unit reuses (auth verification Unit 8, invitation Unit 9, billing receipts Ch 064, notification dispatcher Unit 13 — all reuse this exact wrapper, suppression discipline, and `Result` shape). The chapter ships one Server Action calling one template through one wrapper: the structural floor that holds for every send. Make the "adding a new send becomes write-template/write-action/call-`sendEmail`" point explicit.

Single figure: a screenshot strip of the finished experience — `/inspector/send-welcome` success card with the Resend ID → the Gmail inbox showing the rendered template → the Gmail "Show original" headers panel with SPF/DKIM/DMARC pass lines. Use `Screenshot` inside `TabbedContent` (three tabs: Inspector / Inbox / Headers), wrapped in a `Figure` with a caption. Screenshots added later by the resourcer — brief the three frames.

### What we'll practice

Bulleted list (the skills the student develops), lifted from the chapter outline:
- Installing a side-effect boundary (`src/lib/email.ts`) as the single chokepoint for every email the SaaS sends.
- Reading a suppression list at the boundary and short-circuiting before an external call.
- Writing a props-only React Email template and eyeballing it across viewports and color schemes.
- Composing a Server Action in the five-seam shape that returns a `Result` rather than throwing.
- Proving deliverability against a real inbox using header authentication results.

### Architecture

Shape only — the request flow. Prefer a small `ArrowDiagram` inside a `Figure` (this flow chains five hops and an arrow diagram carries the chokepoint visual better than prose); fall back to a labeled list if the diagram adds noise.

Flow: inspector form (client) → `sendWelcomeEmail` Server Action (parse → authorize via auth stub → compute idempotency key → build placeholder `verifyUrl` → call wrapper) → `src/lib/email.ts` (normalize → `isSuppressed` read → Resend SDK call) → Resend → student's inbox. Note two side facts: the `<WelcomeEmail />` template is rendered by the action and handed to the wrapper as a React element, and rendered *again* by the inspector page into the preview iframe; `src/env.ts` validates the five new entries at build/boot. Keep it shape-only — the per-seam logic is taught in Lessons 3 and 4.

### Starting file tree

Reproduce the annotated tree from the Chapter framing using `FileTree`. Comment one line each only on files the lessons touch or that changed from the carry-in; mark the five TODO stubs as the highlighted focus: `src/env.ts` additions, `src/lib/email.ts`, `src/lib/suppressions.ts`, `src/emails/welcome.tsx`, `src/app/actions/send-welcome.tsx`. Name each provided file in one line; the deep per-file explanation lives in the lesson that first touches it.

Three short prose call-outs after the tree (one line each, do not over-explain):
- The provided inspector page (`src/app/inspector/send-welcome/page.tsx`) renders a live preview iframe of the template beside the client form; the form (`send-welcome-form.tsx`) posts `recipientEmail` and `firstName` to the student-written action and renders three result cards (success / suppression / generic error) — read in full when wiring the action in Lesson 4.
- The provided `src/emails/components/email-layout.tsx` is the brand surface (header logo + footer legal chrome on literal constants, no env reads) and `src/emails/email-tailwind-config.ts` is the shared email Tailwind config the template's `<Tailwind>` consumes — both unpacked when the template is written.
- The provided `src/lib/result.ts`, `src/lib/auth-stub.ts`, `src/db/*`, and `scripts/seed.ts` are carry-ins; the seed inserts the org, user, and one pre-suppressed row, and `getActiveContext()` resolves the seeded org+user by natural key (slug `acme` / email `ada@acme.test`).

### Roadmap

One `Card` per lesson in a `CardGrid`, each with the lesson number, title, and one sentence naming what it adds:
- **Lesson 2 — The verified-domain ceremony.** Stand up Resend on the student's own domain and get the transactional subdomain to `Verified` with SPF/DKIM/DMARC passing.
- **Lesson 3 — The suppression-gated send wrapper.** Add the email env entries, write `isSuppressed`, and build `src/lib/email.ts` as the single send seam that reads suppressions and requires an idempotency key.
- **Lesson 4 — The welcome email send path.** Write the `<WelcomeEmail />` template and the `sendWelcomeEmail` Server Action so the inspector button delivers a real, rendered email end-to-end.

### Setup

`Steps` component, exact commands in order. First step is the canonical clone-from-repo line.
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 050/start/`.
2. `cp .env.example .env` and fill the values (API key arrives in Lesson 2; the rest set in Lesson 3).
3. `docker compose up -d` to run local Postgres 18.
4. `pnpm install`.
5. `pnpm db:migrate` to apply the init migration.
6. Replace the seed's placeholder suppressed address with `suppressed@send.<student-domain>` (README "Seed placeholder"), then `pnpm db:seed` — inserts org, user, and the one pre-suppressed row.
7. `pnpm dev` for the Next.js app, and `pnpm email` for the React Email preview server (the script bakes in `--dir ./src/emails --port 3001`); both run side-by-side for the rest of the chapter.

Render the commands with `Code`.

Env var list (use a small table or labeled list, naming each variable's purpose and where its value comes from): the three new server entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) plus the two client entries (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`) join the carried-in `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `SEED`. Values for the email entries are obtained in Lesson 2 (the API key) and Lesson 3 (the rest). State plainly: this lesson does not require the email entries validated — the `src/env.ts` schema picks them up in Lesson 3.

Expected result: `pnpm dev` serves `/inspector/send-welcome` with the form rendered beside the preview iframe (the iframe shows the TODO skeleton template until Lesson 4). Clicking "Send welcome" returns the stub's `err('internal', 'Not implemented')` because `sendWelcomeEmail` is unimplemented — that is the intended runnable starting point.

Prerequisite call-out (the one piece of rationale this lesson must carry, because it gates setup) — render as an `Aside` (caution): this chapter requires a cheap real domain. Resend's `onboarding@resend.dev` sandbox sender is explicitly out — deliverability is the point, the sandbox lands in spam for most providers and can't prove DKIM-pass on the student's domain. Namecheap / Porkbun / Cloudflare Registrar cost $8–12/year for a `.com`. A student with an existing personal domain uses a subdomain on it (`send.<existing>.<tld>`). The setup is one-time; later units (auth, invites, billing) reuse the same domain and key.

## Scope

- No SPF/DKIM/DMARC setup or Resend account walkthrough here — that is Lesson 2 (the verified-domain ceremony).
- No wrapper, `isSuppressed`, or env-schema implementation — Lesson 3.
- No template or Server Action implementation — Lesson 4.
- No technology rationale (why Resend, why React Email, suppression theory) — those belong to the teaching chapters (Ch 048, Ch 049) and are only recapped at point of use in Lessons 2–4.
- No quiz (project chapters use the project as the assessment).
