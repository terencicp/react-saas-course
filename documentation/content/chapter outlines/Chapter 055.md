# Chapter 055 — Project: email+password auth with verification

## Chapter framing

Chapter 055 cashes in everything Unit 8 installed: the conceptual ground (chapter 051) — authn versus authz, server-stored opaque sessions in `__Host-`-prefixed cookies, the OAuth/PKCE shape named for downstream; the running Better Auth setup (chapter 052) — the `auth` instance, the catch-all handler, the Drizzle adapter and four canonical tables (`user`, `session`, `account`, `verification`), the session config with `freshAge` and the cookie cache, the `getCurrentUser()` / `requireUser()` helpers; the email+password sign-in surface (lesson 1 of chapter 053–lesson 3 of chapter 053) — `signUp.email`, `signIn.email`, the email-verification gate via `requireEmailVerification`; the request-time gate (lesson 1 of chapter 054) — the two-layer pattern with `proxy.ts` doing cookie-presence redirects and the layout doing the validating read. The student ships the canonical first auth flow: sign up with email and password, receive a verification email through the Unit 7 Resend pipeline, click the link to verify, sign in, land on a protected `/dashboard`, sign out and watch the `session` row disappear. Nothing more — no OAuth, no passkeys, no 2FA, no password reset (those live in lesson 4 of chapter 053–lesson 8 of chapter 053 chapter material; the project deliberately stays in the email+password lane).

Threads that run through every lesson: Better Auth's API is consumed directly per Principle #5 — the only thin modules are `lib/auth.ts` (server) and `lib/auth-client.ts` (browser); the catch-all route handler at `/api/auth/[...all]/route.ts` is the only auth route file the project writes — never per-action route files; the `nextCookies()` plugin is non-negotiable in Next.js 16 (without it, sign-up succeeds server-side but the cookie never reaches the browser — the canonical silent failure); the cookie defaults from lesson 2 of chapter 051 are honored at the call site (`__Host-`-prefixed, `HttpOnly`, `Secure`, `SameSite=Lax`); the verification email rides the existing Unit 7 send pipeline — the project does not re-implement Resend, only the `WelcomeVerification.tsx` React Email template and the `sendVerificationEmail` callback; `requireEmailVerification: true` is the senior reflex — unverified users cannot sign in, full stop, no half-state; the `proxy.ts` gate does cookie-presence only and the layout does the validating read (the lesson 1 of chapter 054 rule honored); sign-out is a Server Action that calls `auth.api.signOut`, and the session row's absence is the verification.

### Project goals

The project is done when:

- **A new account can be created.** Submitting `/sign-up` with a fresh email creates a `user` row in Postgres with `emailVerified: false`, an `account` row with `providerId: 'credential'` and a bcrypt hash, and a `verification` row holding the token.
- **The verification email arrives and the link verifies the user.** The inbox shows the React Email template with a working CTA; clicking it flips `user.emailVerified` to `true`, deletes the consumed `verification` row, and (via `autoSignInAfterVerification: true`) lands the user signed in on `/dashboard`.
- **Sign-in refuses an unverified user.** Signing up and attempting sign-in without clicking the link surfaces "verify your email" inline with a resend link, and no session cookie is set.
- **A protected route redirects to sign-in when signed out.** Opening `/dashboard` in a fresh incognito window redirects to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard`.
- **`?next=` survives a malicious value.** `/sign-in?next=//evil.com` lands on `/dashboard` (the safe fallback) after sign-in, while a valid relative path like `/dashboard/billing` is honored.
- **The inverse gate works.** A signed-in user navigating to `/sign-in` is bounced to `/dashboard` instead of seeing the form.
- **Signing out invalidates the session row.** Clicking sign-out on `/dashboard` deletes the `session` row for that token (a one-row delete), clears the cookie, and redirects to `/sign-in`; refreshing `/dashboard` redirects again.
- **The request-time gate stays cookie-only.** `proxy.ts` reads `getSessionCookie(request)` and never calls `auth.api.getSession` — the two-layer model held structurally.

### Dependency carry-in

- **From chapter 036 / chapter 037 / chapter 040:** Drizzle wired against Postgres, the `db` client in `src/db/client.ts`, the migration pipeline (`pnpm db:generate`, `pnpm db:migrate`), the existing `src/db/schema/` directory ready for `auth.ts` to land alongside domain tables. The `users` stub from chapter 041 is dropped in this project — Better Auth's generated `user` table takes its place; FK targets in any `users`-referencing domain tables (created in chapter 047) remain valid because the column shape and PK type match.
- **From chapter 050:** `src/lib/email.ts` exposing `sendEmail({ to, subject, react, idempotencyKey })`, the `RESEND_API_KEY` env entry, the verified-domain `EMAIL_FROM` sender, the `email_suppressions` read built into the send function. The student's `WelcomeVerification.tsx` template lives next to the Unit 7 `WelcomeEmail.tsx`.
- **From chapter 029 / chapter 030 / chapter 033 / lesson 1 of chapter 034:** The Next.js 16 App Router scaffold; the `'use server'` / `'use client'` boundary; `proxy.ts` at the project root; the `'server-only'` reflex; `lib/env.ts` Zod-validated env loading.
- **From chapter 043 / chapter 044:** `<form action={serverAction}>` + `useActionState` for pending state and result; the canonical `Result<T>` discriminant shape (`{ ok: true, data }` vs. `{ ok: false, error: { code, userMessage, fieldErrors? } }`); Zod parse at the action boundary; `redirect()` after success.
- **From lesson 2 of chapter 051:** `__Host-` cookie prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, the opaque server-stored session model.
- **From lesson 1 of chapter 052–lesson 4 of chapter 052:** `betterAuth({ database, plugins: [nextCookies()], secret, baseURL })`, the catch-all handler via `toNextJsHandler(auth)`, the `authClient` from `better-auth/react`, the Drizzle adapter, the four-table schema, `cookieCache` enabled, `auth.api.getSession({ headers })` shape, the `getCurrentUser()` and `requireUser()` helpers.
- **From lesson 1 of chapter 053 / lesson 2 of chapter 053 / lesson 3 of chapter 053:** `signUp.email` / `signIn.email` call shapes, `emailAndPassword: { enabled, requireEmailVerification, minPasswordLength, autoSignIn }`, `emailVerification: { sendVerificationEmail, sendOnSignUp, autoSignInAfterVerification, expiresIn }`, the `verification` table reused.
- **From lesson 1 of chapter 054:** The two-layer gate — `proxy.ts` for cookie-presence redirects (`getSessionCookie` from `better-auth/cookies`), the layout for the validating read (`requireUser()`), the matcher pattern, the `?next=` round-trip with open-redirect closure, the inverse gate (signed-in users bounced from `/sign-in`).

### Starter file tree (stubs marked with TODO)

```
.env.example                       # provided: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, NEXT_PUBLIC_APP_NAME, APP_URL
docker-compose.yml                 # provided: postgres:18 from Unit 5 carry-in
drizzle.config.ts                  # provided: schema path includes src/db/schema/*
package.json                       # provided: scripts including db:generate, db:migrate, auth:generate (Better Auth CLI)
proxy.ts                           # TODO student: matcher + cookie-presence gate + ?next= handling + inverse gate
scripts/
  smoke-email.ts                   # provided: one-liner that sends WelcomeEmail via sendEmail to confirm the Resend pipeline
src/
  lib/
    auth.ts                        # TODO student: betterAuth({ database, emailAndPassword, emailVerification, plugins: [nextCookies()] })
    auth-client.ts                 # TODO student: createAuthClient({ baseURL })
    auth-helpers.ts                # TODO student: getCurrentUser, requireUser
    auth/
      error-mapping.ts             # provided: mapAuthError — maps Better Auth error codes to the Result taxonomy (validation/conflict/invalid-credentials/email-not-verified)
    email.ts                       # provided: sendEmail wrapper from Unit 7
    env.ts                         # provided: Zod-validated env with the entries above
  db/
    client.ts                      # provided: pooled db instance
    schema/
      auth.ts                      # generated by Better Auth CLI on first run; student commits
  app/
    api/
      auth/
        [...all]/
          route.ts                 # TODO student: toNextJsHandler(auth) — 3 lines
    (auth)/
      sign-up/
        page.tsx                   # provided: shell + form layout; TODO student: action wiring
        actions.ts                 # TODO student: signUpAction (calls auth.api.signUpEmail)
      sign-in/
        page.tsx                   # provided: shell + form layout; TODO student: action wiring
        actions.ts                 # TODO student: signInAction (calls auth.api.signInEmail; reads ?next=)
      verify-email/
        page.tsx                   # provided: "check your inbox" screen; reads ?email= from search params
    (protected)/
      layout.tsx                   # TODO student: calls requireUser(), renders nav with user.email + sign-out
      dashboard/
        page.tsx                   # provided: simple "Hello {user.name}" with a list of session metadata
      sign-out-action.ts           # TODO student: signOutAction (calls auth.api.signOut; redirects)
  emails/
    WelcomeVerification.tsx        # TODO student: React Email template — heading, body, CTA button to verifyURL
```

### Reference solution signatures lessons display

- **`auth` instance config (`src/lib/auth.ts`):**
  - `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, plugins: [nextCookies()], emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }, emailVerification: { sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: <WelcomeVerification firstName={user.name} verifyUrl={url} />, idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 }, session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } }, advanced: { cookiePrefix: '__Host-', useSecureCookies: process.env.NODE_ENV === 'production' } })`
- **`authClient` (`src/lib/auth-client.ts`):** `createAuthClient({ baseURL: env.NEXT_PUBLIC_APP_URL })`.
- **Catch-all handler (`src/app/api/auth/[...all]/route.ts`):** `export const { POST, GET } = toNextJsHandler(auth);`.
- **`getCurrentUser()`** — `async () => { const s = await auth.api.getSession({ headers: await headers() }); return s?.user ?? null; }`.
- **`requireUser()`** — `async () => { const u = await getCurrentUser(); if (!u) redirect('/sign-in'); return u; }`.
- **`signUpAction`** — `async (state, formData) => { const parsed = SignUpSchema.safeParse(...); if (!parsed.success) return err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties); try { await auth.api.signUpEmail({ body: { email, password, name } }); redirect('/verify-email?email=' + encodeURIComponent(email)); } catch (e) { return mapAuthError(e); } }`. Returns `Result<never, 'validation' | 'conflict'>`.
- **`signInAction`** — `async (state, formData) => { ... await auth.api.signInEmail({ body: { email, password } }); const next = sanitizeNext(formData.get('next')); redirect(next ?? '/dashboard'); }`. Returns `Result<never, 'validation' | 'invalid-credentials' | 'email-not-verified'>`.
- **`signOutAction`** — `'use server'; async () => { await auth.api.signOut({ headers: await headers() }); redirect('/sign-in'); }`.
- **`proxy.ts`** — exports `default` async function reading `getSessionCookie(request)`; on protected matcher hit without cookie, redirect to `/sign-in?next=` with sanitized path; on auth-page matcher hit with cookie, redirect to `/dashboard`; matcher config `['/dashboard/:path*', '/sign-in', '/sign-up']`.
- **`SignUpSchema`** (Zod) — `{ email: z.string().email(), password: z.string().min(12), name: z.string().min(1).max(80) }`.
- **`SignInSchema`** — `{ email: z.string().email(), password: z.string().min(1), next: z.string().optional() }`.
- **Env entries (`.env.example`):**
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app?sslmode=disable`
  - `BETTER_AUTH_SECRET=` (32+ bytes, generate via `openssl rand -base64 32`)
  - `BETTER_AUTH_URL=http://localhost:3000`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `RESEND_API_KEY=re_...` (carry-in from chapter 050)
  - `EMAIL_FROM='Acme <verify@<student-verified-domain>>'` (carry-in from chapter 050 — Display Name format preserved)
  - `EMAIL_REPLY_TO=support@<student-verified-domain>` (carry-in from chapter 050)
  - `NEXT_PUBLIC_APP_NAME=Acme` (carry-in from chapter 050 — read by `EmailLayout.tsx`)

### Concepts demonstrated → owning lesson

- Authn vs. authz; sessions as opaque server-stored handles; `__Host-` cookie defaults — lesson 1 of chapter 051, lesson 2 of chapter 051.
- `betterAuth({ ... })` config, the catch-all handler, the `authClient`, `'server-only'` on `lib/auth.ts` — lesson 1 of chapter 052; demonstrated in Lesson 2.
- Drizzle adapter, the four canonical tables (`user`, `session`, `account`, `verification`), Better Auth CLI `generate` — lesson 2 of chapter 052; demonstrated in Lesson 2.
- Session config (`expiresIn`, `updateAge`, `freshAge`, `cookieCache`), cookie surface tuning — lesson 3 of chapter 052; demonstrated in Lesson 2.
- `auth.api.getSession({ headers })`, `getCurrentUser`, `requireUser` — lesson 4 of chapter 052; written in Lesson 2, exercised in Lesson 5.
- `signUp.email` / `signIn.email`, `emailAndPassword` config, `requireEmailVerification`, `autoSignIn`, `minPasswordLength` — lesson 1 of chapter 053, lesson 2 of chapter 053; sign-up in Lesson 2, gate in Lesson 3, sign-in in Lesson 4.
- `emailVerification` config block, `sendVerificationEmail` callback, `autoSignInAfterVerification`, the `verification` table token row — lesson 3 of chapter 053; demonstrated in Lesson 3.
- The two-layer gate — `proxy.ts` cookie-presence + layout validating read, `?next=` round-trip with open-redirect closure, inverse gate — lesson 1 of chapter 054; demonstrated in Lesson 5 (with `?next=` sanitization introduced in Lesson 4).
- React Email template composition, transactional send through Resend with verified domain — chapter 049, chapter 050; demonstrated in Lesson 3.
- Server Actions with `useActionState`, Zod at the action boundary, the `Result` discriminant — chapter 043; demonstrated in Lessons 2, 3, 4.
- Zod-validated env via `lib/env.ts` — lesson 1 of chapter 034; demonstrated in the Project Overview.
- The `nextCookies()` plugin requirement in Next.js 16 — lesson 1 of chapter 052; demonstrated in Lesson 2.

---

## Lesson 1 — Project Overview

The student leaves with the starter running locally: Postgres up, env filled, the Resend pipeline proven, and the empty auth shells served by `pnpm dev`. No feature is built.

What we're building: a runnable email+password auth flow with a verification gate — sign up, receive a verification email, click to verify, sign in, land on a protected `/dashboard`, sign out and watch the `session` row disappear. This is the foundation every later unit (Unit 9 orgs, Unit 10 list views with `requireUser`, Unit 11 billing, Unit 13 notifications) builds on top of. One screenshot strip shows the end UX: the sign-up form, the verification email arriving in the inbox, the verify click landing on `/dashboard`, and the sign-out button in the protected layout.

What we'll practice:

- Configuring Better Auth's `auth` instance and reading the four-table schema the CLI generates.
- Driving a sign-up, verification, and sign-in flow through Server Actions with the canonical `Result` shape.
- Composing a transactional React Email template and sending it through the existing Resend pipeline.
- Building the two-layer request-time gate: a cookie-presence proxy plus a layout-level validating read.

Scope cuts (named so the student knows where the line is): no OAuth providers (lesson 8 of chapter 053 chapter material), no passkeys (lesson 7 of chapter 053), no 2FA (lesson 6 of chapter 053), no magic links (lesson 5 of chapter 053), no password reset (lesson 4 of chapter 053), no account linking (lesson 9 of chapter 053), no rate limiting (chapter 074 owns), no organization scoping (Unit 9 owns), no audit log (chapter 057). The project deliberately stays in the email+password lane.

Architecture: a labeled list of the moving parts and how a request flows through them — the browser hits `/sign-up`, a Server Action calls `auth.api.signUpEmail`, the `nextCookies()` plugin lands the session cookie, the `sendVerificationEmail` callback sends through Resend; the catch-all `/api/auth/[...all]` handler serves every Better Auth endpoint; the `proxy.ts` cookie check and the layout's `requireUser()` validating read form the two-layer gate in front of `/dashboard`.

Starting file tree: the annotated layout from the Chapter framing. The TODO-marked stubs are the highlighted focus — `proxy.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth-helpers.ts`, the catch-all `route.ts`, the two `actions.ts` files, the protected `layout.tsx`, the `sign-out-action.ts`, and `src/emails/WelcomeVerification.tsx`. Provided files (`src/lib/email.ts`, `src/lib/auth/error-mapping.ts`, `src/lib/env.ts`, the page shells) are noted but uncommented except where a lesson will touch them.

Lessons in this chapter (one Card each):

- **Lesson 2 — Sign up lands a session.** Wire the `auth` instance, generate the schema, mount the catch-all handler, and ship a sign-up that creates a user and lands a `__Host-` session cookie.
- **Lesson 3 — The email verification gate.** Build the verification email, turn the gate on, and prove the link verifies the user and signs them in.
- **Lesson 4 — Sign in, with unverified refusal and safe redirects.** Add the sign-in action with opaque credential errors, the unverified refusal, and `?next=` open-redirect closure.
- **Lesson 5 — Gate the protected surface.** Add the cookie-presence proxy, the layout validating read, the inverse gate, and a sign-out that deletes the session row.

Setup:

- Clone the starter: `degit react-saas-course-projects/chapter-055-email-password-auth/starter`.
- Bring up Postgres: `docker compose up -d`.
- Install dependencies: `pnpm install`.
- Fill `.env` from `.env.example` with the carry-in Resend keys (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_APP_NAME`) and a fresh `BETTER_AUTH_SECRET` generated via `openssl rand -base64 32`. Env var list:
  - `DATABASE_URL` — Postgres connection string; matches the `docker-compose.yml` defaults.
  - `BETTER_AUTH_SECRET` — 32+ bytes from a CSPRNG; generate with `openssl rand -base64 32`. Reusing it across environments is the failure mode from lesson 1 of chapter 052.
  - `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` — both point at `http://localhost:3000` here; the split exists for deploy shapes where the auth-server origin differs from the public app origin.
  - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_APP_NAME` — carry-in from chapter 050; the verified-domain sender is non-negotiable, because Resend's sandbox sender bounces verification emails into spam and the flow looks broken for reasons unrelated to the code.
- Run the existing migrations: `pnpm db:migrate` (the starter ships with just `__drizzle_migrations`; no auth tables yet).
- Prove the Resend pipeline before any code is written: `pnpm tsx scripts/smoke-email.ts you@example.com` sends the chapter 050 `WelcomeEmail.tsx` through `sendEmail` to confirm DKIM/SPF pass and the verified domain still works.
- Start the dev server: `pnpm dev`.
- Expected result: the app boots; `/sign-up` and `/sign-in` render as empty shells; `/dashboard` 500s because `requireUser` isn't wired yet; one smoke email has arrived in the inbox; Drizzle Studio (`pnpm db:studio`) shows no auth tables.

---

## Lesson 2 — Sign up lands a session

Goal: a visitor can submit the sign-up form and land a real session — a `user` row, an `account` row, and a `__Host-`-prefixed session cookie in the browser. Finished result: submitting `/sign-up` with a fresh email, a 12-character password, and a name creates the rows in Postgres and sets `__Host-better-auth.session_token` in DevTools (the redirect target `/dashboard` still 500s — the cookie landing is the win this lesson confirms).

### Your mission

This lesson stands up the auth spine and proves it end to end with a sign-up. You configure the `betterAuth` instance as the single server-side auth module (`'server-only'` on the first line, per Principle #5 — Better Auth's API is consumed directly, no wrapper layer), let the Better Auth CLI generate the four-table Drizzle schema rather than hand-writing it, and mount the catch-all `/api/auth/[...all]` handler that serves every endpoint the library exposes — never per-action route files. The one line that earns the most attention is `nextCookies()` in the plugin array: without it the sign-up succeeds server-side but the `Set-Cookie` header never reaches the browser, the canonical silent failure where a user is "signed up but not signed in" with no error to show for it. Email verification stays off for this lesson only so the sign-up lands a session immediately and you can confirm the cookie; leave a `// TODO: flip to true in Lesson 3` marker in the code, because shipping with it off lets anyone who types a stranger's email start that stranger's account. Honor the carry-in defaults at the call site: `__Host-` cookie prefix, `minPasswordLength: 12` (the 2026 senior default, not the library's 8), `Secure` cookies only in production because the browser refuses `Secure` on `http://localhost`. The sign-up action parses `FormData` with the `SignUpSchema` at the boundary, returns the canonical `Result` shape on a validation miss, and routes Better Auth's error codes through the provided `mapAuthError` in its `catch` block so a duplicate email surfaces as a clean conflict. Out of scope: the verification email, the sign-in surface, and the protected-route gate all arrive in later lessons. Write `getCurrentUser()` and `requireUser()` now — they are part of the spine — even though nothing calls them until Lesson 5.

- Submitting `/sign-up` with a fresh email, a 12-character password, and a name creates a `user` row whose `emailVerified` is `false`.
- The same submission creates an `account` row with `providerId: 'credential'` and a bcrypt hash in the `password` column.
- A `session` row is created and a `__Host-better-auth.session_token` cookie appears in DevTools after the submission.
- Running the Better Auth CLI generates `src/db/schema/auth.ts` with `user`, `session`, `account`, and `verification` tables, and the migration creates all four in Postgres with their indexes and FK cascades.
- Submitting a password shorter than 12 characters or a malformed email re-renders the form with an inline validation message and creates no rows.
- Submitting an email that already has an account re-renders the form with a "that email already exists" conflict message rather than a server crash.

### Coding time

Implement the spine against the brief, then check your work against the tests. Reference walkthrough hidden in `<details>`:

- Fill `src/lib/auth.ts`: `import 'server-only';` first; `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, plugins: [nextCookies()], emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12, autoSignIn: false }, session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } }, advanced: { cookiePrefix: '__Host-', useSecureCookies: process.env.NODE_ENV === 'production' } })`. The session config is the lesson 3 of chapter 052 defaults — 30-day expiry, 1-day sliding renewal, 1-day fresh window, 5-minute cookie cache. The `requireEmailVerification: false` carries a `// TODO: flip to true in Lesson 3` comment.
- Run `pnpm auth:generate` — the CLI reads `lib/auth.ts`, knows Drizzle + Postgres, and writes `src/db/schema/auth.ts`. Read the generated file column by column (revisit lesson 2 of chapter 052's walkthrough), then commit it. Committing the generated file (schema as source of truth) rather than generating at runtime in CI is the senior pattern.
- Run `pnpm db:generate --name auth_init` and `pnpm db:migrate`. Open Studio; confirm the four tables, indexes, and FK cascades.
- Fill `src/app/api/auth/[...all]/route.ts` — three lines: `import { auth } from '@/lib/auth'; import { toNextJsHandler } from 'better-auth/next-js'; export const { POST, GET } = toNextJsHandler(auth);`. The catch-all `[...all]` segment is not optional; per-action route files break every endpoint the library expects to expose (the lesson 1 of chapter 052 rule).
- Fill `src/lib/auth-client.ts` — `import { createAuthClient } from 'better-auth/react'; export const authClient = createAuthClient({ baseURL: env.NEXT_PUBLIC_APP_URL });`.
- Fill `src/lib/auth-helpers.ts` — `'server-only'` first line; `getCurrentUser()` and `requireUser()` per the reference signatures.
- Fill `src/app/(auth)/sign-up/actions.ts`: `'use server';` first; `SignUpSchema` parse on `formData`; on parse failure `return err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`; on success `try { await auth.api.signUpEmail({ body: { email, password, name } }); }` (no `headers` — the framework sets the cookie because `nextCookies()` is loaded) then `redirect('/dashboard')` (lands signed in because verification is off this lesson); `catch (e) { return mapAuthError(e); }` which maps the unique-violation to `err('conflict', 'An account with that email already exists.')`.
- Wire the sign-up page form's `action={signUpAction}` and read `state.reason` for the inline error.

Covers the untested requirements: `'server-only'` placement on the two server modules; the three-line handler shape; committing the generated schema. Callout: `signUpEmail` is called without `headers` on purpose — the cookie write rides the `nextCookies()` plugin on the action response. For the `Result` discriminant, `useActionState` wiring, and Zod-at-the-boundary, link to chapter 043 rather than re-explaining.

### Moment of truth

Run the lesson's test suite: `pnpm test auth-signup` (exact command in the starter). Expected: all pass, covering account creation rows, the validation rejection, and the duplicate-email conflict.

Confirm by hand the requirements the tests don't cover:

- [ ] After a fresh sign-up, DevTools shows a `__Host-better-auth.session_token` cookie.
- [ ] `pnpm auth:generate` produced `src/db/schema/auth.ts` with all four tables, and Studio shows them in Postgres with indexes and FK cascades.
- [ ] The generated schema file is committed.
- [ ] `src/lib/auth.ts` and `src/lib/auth-helpers.ts` each start with `'server-only'`.

---

## Lesson 3 — The email verification gate

Goal: a brand-new account receives a verification email, and clicking the link verifies the account and signs the user in. Finished result: after sign-up the user lands on a "check your inbox" screen; the inbox holds a branded React Email message with a working CTA; clicking it flips `user.emailVerified` to `true`, consumes the token row, and (via `autoSignInAfterVerification`) drops the user on `/dashboard`.

### Your mission

This lesson turns on the verification gate and wires the email that makes it usable. You build the `WelcomeVerification.tsx` React Email template from the chapter 049 component set, flip `requireEmailVerification` to `true` (deleting last lesson's TODO), and add the `emailVerification` config block whose `sendVerificationEmail` callback rides the exact same `sendEmail` from chapter 050 — no Resend re-implementation, the `react` field takes the template directly. The token gets a one-hour `expiresIn`: long enough that inbox triage doesn't kill the link, short enough that a stale forwarded email doesn't grant indefinite access. `autoSignInAfterVerification: true` is the senior call — the user just proved email control by clicking the link, so re-prompting for a password they typed minutes ago is a pointless UX regression; the library issues the session on the verify-callback request. The sign-up action now redirects to `/verify-email?email=…` instead of straight to `/dashboard`, and the provided verify-email screen offers a resend button wired to `authClient.sendVerificationEmail`. Mind the suppression path: `sendEmail` still consults `email_suppressions`, so a suppressed address creates the user but never receives mail — the resend button is the user's escape hatch, not a bug. Out of scope: the sign-in surface and the unverified-refusal behavior land in Lesson 4; the protected-route gate lands in Lesson 5, so `/dashboard` still 500s after the auto-sign-in here.

- After sign-up, the browser lands on `/verify-email` showing the address the link was sent to.
- A verification email arrives in the inbox rendered from the React Email template, with a heading, a greeting, a working CTA button, a plain-text fallback link, and a one-hour expiry notice.
- Clicking the CTA flips `user.emailVerified` to `true` in Postgres and deletes the consumed `verification` row.
- After clicking the CTA, the user is signed in (a fresh `session` row exists) and is taken to `/dashboard` without re-entering a password.
- The resend button on `/verify-email` issues a fresh token and sends a new email.

### Coding time

Implement against the brief, then check against the tests. Reference walkthrough hidden in `<details>`:

- Build `src/emails/WelcomeVerification.tsx`: React Email components from chapter 049 (`<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Heading>`, `<Text>`, `<Button>`, `<Link>`); props `{ firstName: string; verifyUrl: string }`; body with heading "Verify your email", a `firstName` greeting, an explanatory paragraph, a prominent `<Button href={verifyUrl}>Verify email</Button>`, a plain-text fallback ("If the button doesn't work, paste this link: {verifyUrl}"), and "This link expires in 1 hour."; a `Preview` prop for the inbox preview pane.
- Flip `lib/auth.ts`: set `emailAndPassword.requireEmailVerification: true` and add `emailVerification: { sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: <WelcomeVerification firstName={user.name} verifyUrl={url} />, idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 }`.
- Update `signUpAction`: on success, `redirect('/verify-email?email=' + encodeURIComponent(email))` instead of `/dashboard`.
- Update `src/app/(auth)/verify-email/page.tsx` (provided shell): read `?email=` from search params; render "Check your inbox" with the email shown and a resend button wired to `authClient.sendVerificationEmail({ email })`.

Covers the untested requirements: the `idempotencyKey` shape (`verify:${user.id}:${url}`) so a double-submit doesn't double-send; the suppression-path reasoning and why the resend button is the escape hatch. Callout: the `react` field accepting a JSX element directly is a React Email + Resend convenience, not a custom serializer. For React Email composition and the Resend send path, link to chapter 049 and chapter 050 rather than re-explaining.

### Moment of truth

Run the lesson's test suite: `pnpm test auth-verification` (exact command in the starter). Expected: all pass, covering the `emailVerified` flip, the consumed token-row deletion, and the post-verify session creation.

Confirm by hand the requirements the tests don't cover:

- [ ] After sign-up, the browser lands on `/verify-email` showing the target email.
- [ ] The verification email arrives and renders with heading, greeting, CTA, fallback link, and expiry notice.
- [ ] Clicking the CTA lands you on `/dashboard` without a password re-prompt (it still 500s — that is expected until Lesson 5).
- [ ] The resend button delivers a fresh email.

---

## Lesson 4 — Sign in, with unverified refusal and safe redirects

Goal: a verified user can sign in and is returned to where they were headed, while an unverified user is refused and a malicious `?next=` is neutralized. Finished result: `/sign-in` accepts valid credentials and redirects to the sanitized `?next=` (or `/dashboard`); wrong credentials show one opaque message; an unverified account is refused inline with a resend link; `?next=//evil.com` falls back to `/dashboard`.

### Your mission

This lesson builds the sign-in action and the safety rules around its redirect. The action mirrors sign-up — `SignInSchema` parse at the boundary, `auth.api.signInEmail`, the canonical `Result` shape — but its error handling is where the security discipline lives. Wrong email and wrong password both return the same opaque `'invalid-credentials'` message, closing the account-enumeration vector (the lesson 2 of chapter 053 rule); `'email-not-verified'` is a distinct reason, which is safe because it only leaks after the password already matched, itself proof of identity. The `?next=` parameter is attacker-controlled, so it runs through a `sanitizeNext` allowlist before it ever reaches `redirect()`: reject anything starting with `//` (protocol-relative URLs the browser resolves to an external origin), anything containing a colon (`javascript:`, absolute URLs), and anything not starting with `/`, falling back to `/dashboard`. The form carries `next` as a hidden input sourced from `searchParams.next`. Out of scope: the proxy-level gate and the inverse redirect for already-signed-in users land in Lesson 5; this lesson owns only the sign-in action and its redirect safety. Reuse the `mapAuthError` helper and the `useActionState` wiring from the sign-up surface rather than inventing a parallel shape.

- Submitting `/sign-in` with a verified account's correct credentials redirects to `/dashboard`.
- Submitting a wrong email or a wrong password shows one identical "invalid email or password" message, with no hint as to which was wrong and no session cookie set.
- Submitting the credentials of an account that hasn't verified its email shows "verify your email" inline with a resend link, and sets no session cookie.
- Signing in from `/sign-in?next=/dashboard/billing` redirects to `/dashboard/billing`.
- Signing in from `/sign-in?next=//evil.com` or `/sign-in?next=https://evil.com` redirects to `/dashboard`, never to the external origin.

### Coding time

Implement against the brief, then check against the tests. Reference walkthrough hidden in `<details>`:

- Build `src/app/(auth)/sign-in/actions.ts`: `'use server';` first; `SignInSchema` parse on `formData`; `await auth.api.signInEmail({ body: { email, password } })`; catch via `mapAuthError` into `err('invalid-credentials', 'Invalid email or password.')` (same message whether email or password is wrong) and `err('email-not-verified', 'Verify your email before signing in.')`; run `formData.get('next')` through `sanitizeNext()` (rejects `//`-prefixed, colon-containing, and non-`/`-prefixed values, falling back to `/dashboard`); on success `redirect(next ?? '/dashboard')`.
- Wire `/sign-in` form's `action={signInAction}`, render `state.reason` inline, and pass `next` from `searchParams.next` as a hidden input.

Covers the untested requirements: the `sanitizeNext` allowlist rules one by one; why `'email-not-verified'` is a safe distinct reason while `'invalid-credentials'` must stay opaque. Callout: the unverified refusal is produced by `requireEmailVerification: true` from Lesson 3, not by an explicit check in this action. For the `Result` shape and `useActionState`, link to chapter 043; for the open-redirect reasoning, link to lesson 1 of chapter 054.

### Moment of truth

Run the lesson's test suite: `pnpm test auth-signin` (exact command in the starter). Expected: all pass, covering the successful redirect, the opaque-credentials path, the unverified refusal, and the `?next=` sanitization (valid path honored, `//evil.com` and absolute URLs rejected).

Confirm by hand the requirements the tests don't cover:

- [ ] Wrong email and wrong password produce the same message in the UI, with no session cookie set.
- [ ] An unverified account's sign-in attempt shows the inline "verify your email" message with a working resend link.

---

## Lesson 5 — Gate the protected surface

Goal: `/dashboard` is reachable only when signed in, signed-in users are kept out of the auth pages, and signing out deletes the session row. Finished result: signed-out visits to `/dashboard` redirect to `/sign-in?next=%2Fdashboard`; signing in lands on `/dashboard` with a nav showing the user's email and a sign-out button; signed-in visits to `/sign-in` bounce to `/dashboard`; sign-out deletes the `session` row, clears the cookie, and returns to `/sign-in`. This is the runnable end state the project promises.

### Your mission

This lesson installs the two-layer request-time gate and the sign-out that makes the opaque-session model concrete. The `proxy.ts` gate reads only the cookie — `getSessionCookie(request)`, never `auth.api.getSession` — because the proxy runs on every matched request and a database read there would tax every prefetch; collapsing the two layers is the exact mistake the lesson 1 of chapter 054 rule exists to prevent. The validating read lives in the protected `layout.tsx`, which calls `requireUser()` (written back in Lesson 2) and redirects when the session is genuinely gone — this is the defense-in-depth catch for a stale cookie cache the proxy would wave through. The same proxy handles the inverse gate: a request to `/sign-in` or `/sign-up` carrying a session cookie is bounced to `/dashboard`. Sign-out is a Server Action, `<form action={signOutAction}>` rather than an `onClick` fetch, so progressive enhancement holds and the redirect lands cleanly without JS; `auth.api.signOut` clears the cookie and deletes the `session` row in one call, and that row's absence is the revocation — the opaque-server-session model from lesson 2 of chapter 051 made real. Keep the matcher explicit (`['/dashboard/:path*', '/sign-in', '/sign-up']`): every protected segment added later needs both a matcher entry and a `requireUser()` call in its layout. Out of scope: nothing new is deferred — this is the last lesson, and it closes the flow end to end.

- A signed-out request to `/dashboard` redirects to `/sign-in?next=%2Fdashboard`, and signing in returns to `/dashboard`.
- A signed-in request to `/sign-in` or `/sign-up` is redirected to `/dashboard` without rendering the form.
- A signed-in `/dashboard` renders a nav strip showing the user's email alongside a sign-out button, with the user's name in the page body.
- Clicking sign-out deletes the `session` row for that token from Postgres, clears the `__Host-` cookie, and redirects to `/sign-in`; refreshing `/dashboard` afterward redirects again.
- `proxy.ts` reads `getSessionCookie(request)` only and never imports or calls `auth.api.getSession`.

### Coding time

Implement against the brief, then check against the tests. Reference walkthrough hidden in `<details>`:

- Fill `proxy.ts`: `import { NextResponse, type NextRequest } from 'next/server';` and `import { getSessionCookie } from 'better-auth/cookies';`; `export default async function proxy(request: NextRequest) { const cookie = getSessionCookie(request); const path = request.nextUrl.pathname; const isProtected = path.startsWith('/dashboard'); const isAuthPage = path === '/sign-in' || path === '/sign-up'; if (isProtected && !cookie) { const next = encodeURIComponent(path + request.nextUrl.search); return NextResponse.redirect(new URL('/sign-in?next=' + next, request.url)); } if (isAuthPage && cookie) { return NextResponse.redirect(new URL('/dashboard', request.url)); } return NextResponse.next(); }`; `export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] };`.
- Fill `src/app/(protected)/layout.tsx`: server component; `const user = await requireUser();` at the top; render a nav strip with `{user.email}` and `<form action={signOutAction}><button>Sign out</button></form>`; `<main>{children}</main>` below. `/dashboard/page.tsx` (provided) renders "Hello {name}" via `getCurrentUser()` — a second read in the same request hits the cookie cache, no extra DB round trip.
- Fill `src/app/(protected)/sign-out-action.ts`: `'use server';`; `await auth.api.signOut({ headers: await headers() });`; `redirect('/sign-in');`.

Covers the untested requirements: why the proxy reads the cookie while the layout reads the session (the two-layer split and its defense-in-depth payoff); why sign-out is a form action, not an `onClick` fetch; the matcher-plus-`requireUser` rule for future protected segments. Callout: inspecting the Drizzle query log on a signed-in `/dashboard` request shows one session read per request, served from the cookie cache within the 5-minute window most of the time. For the two-layer gate rationale and the matcher pattern, link to lesson 1 of chapter 054.

With the flow runnable end to end, name the pre-ship checklist (named, not built here): rotate `BETTER_AUTH_SECRET` on a cadence and on every staff turnover; configure Resend's bounce/complaint webhooks (chapter 065 owns the handler) to write `email_suppressions` so verification mail to bouncing addresses doesn't burn the domain's reputation; add rate limits to the sign-in, sign-up, and verify-resend endpoints (chapter 074) before this reaches a public URL. Point forward to where this setup gets extended: chapter 053's chapter material layers passwords, magic links, TOTP, passkeys, and OAuth on this same schema without re-shaping it; lesson 2 of chapter 054's credential-change and elevation tier reads the `freshAge` knob configured in Lesson 2; lesson 3 of chapter 054's active-sessions list reads the `ipAddress` / `userAgent` columns the `session` table already populates; Unit 9 wraps `requireUser` with org scoping and the `authedAction` authz wrapper; Unit 10's list views call `requireUser()` in their server reads rather than re-checking the cookie.

### Moment of truth

Run the lesson's test suite: `pnpm test auth-gate` (exact command in the starter). Expected: all pass, covering the signed-out redirect with `?next=`, the inverse gate, and the sign-out session-row deletion.

Confirm by hand the requirements the tests don't cover:

- [ ] Signed out, `/dashboard` redirects to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard`.
- [ ] Signed in, visiting `/sign-in` bounces to `/dashboard`.
- [ ] After sign-out, Studio shows the `session` row gone, DevTools shows the cookie cleared, and refreshing `/dashboard` redirects again.
- [ ] `proxy.ts` imports `getSessionCookie` only — no `auth` import, no `auth.api.getSession` call.
- [ ] With two browsers signed in as the same user, signing out of one and refreshing the other redirects to `/sign-in` once the cookie cache window lapses (the lesson 3 of chapter 054 trade-off).
