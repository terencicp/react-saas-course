# Chapter 055 — Lesson 1 outline

## Lesson title

**Project overview** (keep). Sidebar: **Overview**.

## Lesson type

`Project overview` — first lesson of the project chapter. No feature built; the student leaves with the starter running locally. No test-coder runs for this lesson.

## Lesson framing

The student gets the lay of the land before writing a line of auth code: what the finished email+password flow does end to end (sign up → verify email → sign in → land on a gated `/dashboard` → sign out and watch the `session` row vanish), the senior boundaries the project deliberately holds (email+password only — no OAuth, passkeys, 2FA, magic links, password reset, rate limiting, org scoping), and a clear map of which four later lessons add which capability. The payoff is orientation plus a verified-running starter: Postgres up, env filled, dev server serving the auth-page shells and the static `/dashboard` placeholder — with every action and gate still unwired, so the work the student is about to do is legible.

## Lesson sections

Follow the Project-overview section list from the contract, in order.

### What we're building (intro, no header)

One paragraph: the runnable email+password auth flow with a verification gate is the foundation every later unit builds on (Unit 9 orgs, Unit 10 list views via `requireUser`, Unit 11 billing, Unit 13 notifications). Name the end-to-end arc in user terms: sign up with email + password, receive a verification email, click to verify, sign in, reach a protected `/dashboard`, sign out — the `session` row disappearing is the proof the model is real. State plainly that this lesson builds nothing; it stands up and verifies the starter.

Single figure: a screenshot strip of the end UX assembled from the four chapter screenshots in flow order. Use `TabbedContent` (or `Tabs`/`TabItem`) wrapping `Screenshot` (desktop variant) so the four frames sit in one figure with captions:
- `/screenshots/055/l2-desktop-1280.png` — the sign-up form (name/email/password, Create account).
- `/screenshots/055/l3-desktop-1280.png` — the check-inbox / verify-email screen showing the target address and the Resend button.
- `/screenshots/055/l4-desktop-1280.png` — the sign-in form.
- `/screenshots/055/l5-desktop-1280.png` — the signed-in, gated `/dashboard` (nav strip with user email + Sign out, "Hello Ada Lovelace" body).

Note for the writer: these screenshots show the *finished* per-lesson UX, not this lesson's starter state — frame the strip as "here's where the four lessons land you," and keep the Setup section's expected-result description honest about the unwired starter.

### What we'll practice (`## What we'll practice`)

Bulleted skill list (verbatim intent from the chapter outline), phrased as practiced skills not file edits:
- Configuring Better Auth's `auth` instance and reading the four-table schema (`user`, `session`, `account`, `verification`) the CLI generates.
- Driving a sign-up, verification, and sign-in flow through Server Actions with the canonical `Result` shape.
- Composing a transactional React Email template and sending it through the existing Resend pipeline.
- Building the two-layer request-time gate: a cookie-presence proxy plus a layout-level validating read.

Append the scope-cut list here as a short closing note so the student knows where the line sits (full detail lives in the Scope section below): no OAuth, passkeys, 2FA, magic links, password reset, account linking, rate limiting, org scoping, or audit log — the project stays in the email+password lane. Keep it one tight sentence or a compact list; do not re-explain each.

### Architecture (`## Architecture`)

A labeled list (shape only — no implementation). Trace one request through the moving parts:
1. Browser hits `/sign-up`; a Server Action calls `auth.api.signUpEmail`. Under `requireEmailVerification: true` this creates the `user` + `account` rows but issues **no session** — the user is redirected to `/verify-email`, cookieless.
2. The `sendVerificationEmail` callback rides the existing Unit 7 Resend pipeline (`sendEmail`) to deliver the link; the verification token is a stateless signed JWT in the URL, so no `verification` row is written.
3. Clicking the link hits the catch-all `/api/auth/[...all]` handler (serves every Better Auth endpoint); verification flips `emailVerified` and, via `autoSignInAfterVerification`, issues the session. The `nextCookies()` plugin is what lands the `Set-Cookie` on the response — the first point a cookie actually exists.
4. The two-layer gate guards `/dashboard`: `proxy.ts` does a cookie-presence redirect (cheap, no DB read), the protected `layout.tsx` does the validating `requireUser()` read (defense-in-depth).

A box-and-arrow diagram is justified here because the request-flow shape (browser → action → Better Auth → email → callback → cookie → gate) is hard for prose to carry cleanly. Brief: a left-to-right **Mermaid `flowchart LR`** (per diagrams INDEX, system/traffic flow; Mermaid is fine for a small flow), wrapped in `<Figure>`. Keep it shallow — ~6 nodes (Browser, Server Action, `auth.api`, Resend send, catch-all handler, two-layer gate) with labeled edges for "no session yet" and "cookie lands here." Cap height per the vertical-space rule. If the diagram reads as clutter, fall back to the labeled list — the list alone satisfies the contract.

### Starting file tree (`## Starting file tree`)

Render the annotated starter tree with `FileTree`. Use the layout from the chapter outline's "Starter file tree" block. Annotation rules (per contract): comment one line only on files changed from the previous project or that a lesson will touch; leave the rest uncommented. **Highlight the TODO stubs** as the focus (FileTree bolding / `# focus` style):
- `src/env.ts` (L2), `src/proxy.ts` (L5), `src/lib/auth.ts` (L2), `src/lib/auth-schema.config.ts` (L2), `src/db/index.ts` (L2), `src/db/schema/auth.ts` (L2, empty stub the CLI fills), `src/app/api/auth/[...all]/route.ts` (L2), `src/app/(auth)/sign-up/actions.ts` (L2), `src/app/(auth)/sign-in/actions.ts` (L4), `src/app/(auth)/verify-email/page.tsx` + `verify-email-resend.tsx` (L3, the resend island is a new file in solution), `src/app/(protected)/layout.tsx` (L5), `src/app/(protected)/dashboard/page.tsx` (L5), `src/app/(protected)/sign-out-action.ts` (L5), `src/emails/welcome-verification.tsx` (L3).
- Note provided carry-in only where a lesson touches it: `src/lib/auth-client.ts`, `src/lib/email.ts`, `src/lib/suppressions.ts`, `src/lib/auth/error-mapping.ts`, `src/lib/result.ts`, `src/lib/redirects.ts`, the form components and page shells, the `EmailLayout` chrome. Mark them provided, leave most uncommented.
- Note the provided infra files briefly: `.env.example`, `docker-compose.yml`, `drizzle.config.ts`, `drizzle/0000_init_schema.sql` (email_suppressions + enum only — no auth tables yet), `scripts/` (seed + probe + per-lesson runner), `tests/lessons/Lesson 2–5.test.ts` (`describe.todo` stubs).

Keep annotations to one line each; do not restate the whole codebase outline.

### Roadmap (`## Roadmap`)

`CardGrid` of four `Card`s, one per remaining lesson, each with the lesson number + title and one sentence naming what it adds:
- **Lesson 2 — Sign up creates the account.** Wire the `auth` instance, generate the schema, mount the catch-all handler, and ship a sign-up that creates the `user` + `account` rows and redirects to verify — no session yet.
- **Lesson 3 — The email verification gate.** Build the verification email, turn the gate on, and prove the link verifies the user and signs them in.
- **Lesson 4 — Sign in, with unverified refusal and safe redirects.** Add the sign-in action with opaque credential errors, the unverified refusal, and `?next=` open-redirect closure.
- **Lesson 5 — Gate the protected surface.** Add the cookie-presence proxy, the layout validating read, the inverse gate, and a sign-out that deletes the session row.

### Setup (`## Setup`)

`Steps` component, exact commands in order. First step per contract: get the starter from the project repository.
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 055/start/`.
2. Bring up Postgres: `docker compose up -d`.
3. Install dependencies: `pnpm install`.
4. Copy `.env.example` → `.env` and fill the values (env list below).
5. Run the existing migration: `pnpm db:migrate` — creates `email_suppressions` and the `suppression_reason` enum only; no auth tables yet (those land in Lesson 2).
6. Start the dev server: `pnpm dev`.

Env var list (`Code` block or a small table; name, purpose, how to obtain):
- `DATABASE_URL` — Postgres connection string; matches the `docker-compose.yml` defaults.
- `DATABASE_URL_UNPOOLED` — same value locally; the pooled/unpooled split exists so Unit 20 can plug Neon in without renaming.
- `SEED` — seed toggle (default `1`).
- `BETTER_AUTH_SECRET` — 32+ bytes from a CSPRNG; generate with `openssl rand -base64 32`. Reusing it across environments is the failure mode from Ch052 L1.
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — both `http://localhost:3000` here; the split exists for deploy shapes where the auth-server origin differs from the public app origin.
- `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_APP_NAME` — carry-in from Ch050. The verified-domain sender is non-negotiable: Resend's sandbox sender bounces verification mail into spam and the flow *looks* broken for reasons unrelated to the code.

Expected result (one paragraph, honest about the unwired starter):
- The app boots; `/` redirects to `/sign-in`.
- `/sign-up` and `/sign-in` render their forms, but submit does nothing yet (the actions return `err('internal', 'Not implemented')`).
- `/dashboard` serves an ungated static "Dashboard" placeholder (200, no auth gate).
- `pnpm db:studio` shows only `email_suppressions` — no auth tables.

Use an `Aside` (tip) for the verified-domain warning if it reads better set apart; otherwise keep it inline in the env list.

Code-sample handling for this lesson:
- `FileTree` for the starter tour.
- `Steps` for the setup procedure.
- `Code` for the env block and any command snippet.
- `CardGrid` / `Card` for the roadmap.
- `TabbedContent` + `Screenshot` for the end-UX strip.
- One `<Figure>`-wrapped Mermaid flowchart for Architecture (optional; fall back to the labeled list).
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` needed — this lesson ships no implementation code.

## Scope

This lesson only orients and stands up the starter; it builds no feature.
- The `auth` instance, schema generation, catch-all handler, and sign-up action → Lesson 2.
- The verification email and gate → Lesson 3.
- The sign-in action, unverified refusal, and `?next=` safety → Lesson 4.
- The two-layer gate and sign-out → Lesson 5.
- Technology rationale (why Better Auth, why opaque server sessions, the `__Host-` cookie defaults, the two-layer-gate reasoning) belongs to the Unit 8 teaching chapters (Ch051–Ch054), not here — link, do not re-teach.
- Out-of-lane auth features (OAuth, passkeys, 2FA, magic links, password reset, account linking) → Ch053 teaching material. Rate limiting → Ch074. Org scoping → Unit 9. Audit log → Ch057.
