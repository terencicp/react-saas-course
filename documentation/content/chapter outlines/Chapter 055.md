# Chapter 055 — Project: email+password auth with verification

## Chapter framing

Chapter 055 cashes in everything Unit 8 installed: the conceptual ground (chapter 051) — authn versus authz, server-stored opaque sessions in `__Host-`-prefixed cookies, the OAuth/PKCE shape named for downstream; the running Better Auth setup (chapter 052) — the `auth` instance, the catch-all handler, the Drizzle adapter and four canonical tables (`user`, `session`, `account`, `verification`), the session config with `freshAge` and the cookie cache, the `getCurrentUser()` / `requireUser()` helpers; the email+password sign-in surface (lesson 1 of chapter 053–lesson 3 of chapter 053) — `signUp.email`, `signIn.email`, the email-verification gate via `requireEmailVerification`; the request-time gate (lesson 1 of chapter 054) — the two-layer pattern with `proxy.ts` doing cookie-presence redirects and the layout doing the validating read. The student ships the canonical first auth flow: sign up with email and password, receive a verification email through the Unit 7 Resend pipeline, click the link to verify, sign in, land on a protected `/dashboard`, sign out and watch the `session` row disappear. Nothing more — no OAuth, no passkeys, no 2FA, no password reset (those live in lesson 4 of chapter 053–lesson 8 of chapter 053 chapter material; the project deliberately stays in the email+password lane).

Threads that run through every lesson: Better Auth's API is consumed directly per Principle #5 — the only thin modules are `lib/auth.ts` (server) and `lib/auth-client.ts` (browser); the catch-all route handler at `/api/auth/[...all]/route.ts` is the only auth route file the project writes — never per-action route files; the `nextCookies()` plugin is non-negotiable in Next.js 16 (without it, a Better Auth call succeeds server-side but the cookie never reaches the browser — the canonical silent failure, which bites the moment a session is issued: at verification and at sign-in); the cookie defaults from lesson 2 of chapter 051 are honored at the call site (`__Host-`-prefixed, `HttpOnly`, `Secure`, `SameSite=Lax`); the verification email rides the existing Unit 7 send pipeline — the project does not re-implement Resend, only the `welcome-verification.tsx` React Email template and the `sendVerificationEmail` callback; `requireEmailVerification: true` is the senior reflex — unverified users cannot sign in, full stop, no half-state; the `proxy.ts` gate does cookie-presence only and the layout does the validating read (the lesson 1 of chapter 054 rule honored); sign-out is a Server Action that calls `auth.api.signOut`, and the session row's absence is the verification.

### Project goals

The project is done when:

- **A new account can be created.** Submitting `/sign-up` with a fresh email creates a `user` row in Postgres with `emailVerified: false` and an `account` row with `providerId: 'credential'` and a scrypt hash. The email-verification token is a stateless signed JWT embedded in the verify URL (`createEmailVerificationToken` → `signJWT`); sign-up writes no `verification` table row — that table stays empty in this flow.
- **The verification email arrives and the link verifies the user.** The inbox shows the React Email template with a working CTA; clicking it flips `user.emailVerified` to `true` and (via `autoSignInAfterVerification: true`) lands the user signed in on `/dashboard`. There is no observable `verification` row to watch in Studio.
- **Sign-in refuses an unverified user.** Signing up and attempting sign-in without clicking the link surfaces "verify your email" inline with a resend link, and no session cookie is set.
- **A protected route redirects to sign-in when signed out.** Opening `/dashboard` in a fresh incognito window redirects to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard`.
- **`?next=` survives a malicious value.** `/sign-in?next=//evil.com` lands on `/dashboard` (the safe fallback) after sign-in, while a valid relative path like `/dashboard/billing` is honored.
- **The inverse gate works.** A signed-in user navigating to `/sign-in` is bounced to `/dashboard` instead of seeing the form.
- **Signing out invalidates the session row.** Clicking sign-out on `/dashboard` deletes the `session` row for that token (a one-row delete), clears the cookie, and redirects to `/sign-in`; refreshing `/dashboard` redirects again.
- **The request-time gate stays cookie-only.** `proxy.ts` reads `getSessionCookie(request)` and never calls `auth.api.getSession` — the two-layer model held structurally.

### Dependency carry-in

- **From chapter 036 / chapter 037 / chapter 040:** Drizzle wired against Postgres, the `db` client in `src/db/index.ts`, the migration pipeline (`pnpm db:generate`, `pnpm db:migrate`), the existing `src/db/schema/` directory ready for `auth.ts` to land alongside `src/db/schema.ts`. Better Auth's generated `user` table is the canonical user table here; any `users`-referencing domain tables added later target it, since the column shape and PK type match.
- **From chapter 050:** `src/lib/email.ts` exposing `sendEmail({ to, subject, react, idempotencyKey, replyTo?, bypassSuppression? })` (returns a `Result<{ id }>`), the `RESEND_API_KEY` env entry, the verified-domain `EMAIL_FROM` sender, and the `email_suppressions` read via `src/lib/suppressions.ts`. The carry-in chrome — `src/emails/components/email-layout.tsx` and `src/emails/email-tailwind-config.ts` — is provided; the student builds `src/emails/welcome-verification.tsx` on top of it.
- **From chapter 029 / chapter 030 / chapter 033 / lesson 1 of chapter 034:** The Next.js 16 App Router scaffold; the `'use server'` / `'use client'` boundary; `src/proxy.ts`; the `'server-only'` reflex; `src/env.ts` `@t3-oss/env-nextjs`-validated env loading.
- **From chapter 043 / chapter 044:** `<form action={serverAction}>` + `useActionState` for pending state and result; the canonical `Result<T>` discriminant shape (`{ ok: true, data }` vs. `{ ok: false, error: { code, userMessage, fieldErrors? } }`); Zod parse at the action boundary; `redirect()` after success.
- **From lesson 2 of chapter 051:** `__Host-` cookie prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, the opaque server-stored session model.
- **From lesson 1 of chapter 052–lesson 4 of chapter 052:** `betterAuth({ database, plugins: [nextCookies()], secret, baseURL })`, the catch-all handler via `toNextJsHandler(auth)`, the `authClient` from `better-auth/react`, the Drizzle adapter, the four-table schema, `cookieCache` enabled, `auth.api.getSession({ headers })` shape, the `getCurrentUser()` and `requireUser()` helpers.
- **From lesson 1 of chapter 053 / lesson 2 of chapter 053 / lesson 3 of chapter 053:** `signUp.email` / `signIn.email` call shapes, `emailAndPassword: { enabled, requireEmailVerification, minPasswordLength, autoSignIn }`, `emailVerification: { sendVerificationEmail, sendOnSignUp, autoSignInAfterVerification, expiresIn }`. The verification token is a stateless JWT in the verify URL, not a `verification` table row.
- **From lesson 1 of chapter 054:** The two-layer gate — `proxy.ts` for cookie-presence redirects (`getSessionCookie` from `better-auth/cookies`), the layout for the validating read (`requireUser()`), the matcher pattern, the `?next=` round-trip with open-redirect closure, the inverse gate (signed-in users bounced from `/sign-in`).

### Starter file tree (stubs marked with TODO)

```
.env.example                       # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, SEED, BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL
docker-compose.yml                 # provided: postgres from Unit 5 carry-in
drizzle.config.ts                  # provided: pg, snake_case, schema array (src/db/schema.ts + src/db/schema/auth.ts), unpooled URL
package.json                       # provided: scripts including db:generate, db:migrate, db:studio, auth:generate (Better Auth CLI), test:lesson
drizzle/
  0000_init_schema.sql             # provided: email_suppressions table + suppression_reason enum
scripts/
  seed.ts, test-lesson.mjs           # provided: seed and the per-lesson test runner
src/
  env.ts                           # TODO student (L2): add BETTER_AUTH_SECRET + BETTER_AUTH_URL to the @t3-oss/env-nextjs boundary
  proxy.ts                         # TODO student (L5): matcher + cookie-presence gate + ?next= handling + inverse gate
  lib/
    auth.ts                        # TODO student (L2): betterAuth({ ... plugins: [nextCookies()] }), SESSION_COOKIE_PREFIX, getCurrentUser, requireUser
    auth-client.ts                 # provided: createAuthClient() (bare — same-origin)
    auth-schema.config.ts          # TODO student (L2): CLI-only generator config (server-only-free mirror of auth.ts)
    auth/
      error-mapping.ts             # provided: mapAuthError — maps thrown APIError codes to the 7-code Result union (unauthorized/forbidden/rate_limited/internal); no taken-email branch (enumeration defense closed at the source, Ch053 L1)
    email.ts                       # provided: sendEmail wrapper from Unit 7
    suppressions.ts                # provided: isSuppressed (transactional/marketing rules)
    result.ts                      # provided: Result<T>, ok/err, ErrorCode union
    redirects.ts                   # provided: safeNext — open-redirect guard for ?next=
  db/
    index.ts                       # TODO student (L2): spread the generated authSchema into the drizzle client
    columns.ts                     # provided: reusable `timestamps` column group
    schema.ts                      # provided: emailSuppressions table + suppressionReason enum
    schema/
      auth.ts                      # TODO student (L2): empty stub — Better Auth CLI writes the four tables on first run; student commits
  app/
    api/
      auth/
        [...all]/
          route.ts                 # TODO student (L2): toNextJsHandler(auth) — 1 line
    (auth)/
      sign-up/
        page.tsx                   # provided: shell wrapping SignUpForm
        sign-up-form.tsx           # provided: useActionState client form
        actions.ts                 # TODO student (L2): signUpAction (calls auth.api.signUpEmail)
      sign-in/
        page.tsx                   # provided: reads ?next= and passes to SignInForm
        sign-in-form.tsx           # provided: client form; resend link on forbidden error
        actions.ts                 # TODO student (L4): signInAction (calls auth.api.signInEmail; safeNext on ?next=)
      verify-email/
        page.tsx                   # provided shell; TODO student (L3): show ?email= + resend button
        verify-email-resend.tsx    # TODO student (L3): client island calling authClient.sendVerificationEmail (new file)
    (protected)/
      layout.tsx                   # TODO student (L5): requireUser(), AppNav with user.email + sign-out form
      dashboard/
        page.tsx                   # provided: static "Dashboard" placeholder; TODO student (L5): getCurrentUser → name + email
      sign-out-action.ts           # TODO student (L5): signOutAction (calls auth.api.signOut; redirects)
  emails/
    welcome-verification.tsx       # TODO student (L3): React Email template — heading, body, CTA button to verifyUrl
    components/email-layout.tsx    # provided: EmailLayout chrome
    email-tailwind-config.ts       # provided: shared email Tailwind config
tests/lessons/
  Lesson 2–5.test.ts               # provided: describe.todo stubs the per-lesson suite fills
```

### Reference solution signatures lessons display

- **`SESSION_COOKIE_PREFIX` (exported from `src/lib/auth.ts`, per Ch052 L3/L4):** environment-aware — `process.env.NODE_ENV === 'production' ? '__Host-better-auth' : 'better-auth'`; declared once and exported so the proxy's `getSessionCookie` reads the same prefix. A `__Host-` cookie cannot be set over `http://localhost` (it requires `Secure`), so dev relaxes the prefix.
- **`auth` instance config (`src/lib/auth.ts`):**
  - `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }, emailVerification: { sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: createElement(WelcomeVerification, { firstName: user.name, verifyUrl: url }), idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 }, session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 10, cookieCache: { enabled: true, maxAge: 5 * 60 } }, advanced: { cookiePrefix: SESSION_COOKIE_PREFIX, useSecureCookies: process.env.NODE_ENV === 'production' }, plugins: [nextCookies()] })` — `nextCookies()` must be **last** in the array.
- **`authClient` (`src/lib/auth-client.ts`):** `createAuthClient()` (bare — omit `baseURL` for same-origin, per Ch052 L1). Provided in the starter.
- **CLI generator config (`src/lib/auth-schema.config.ts`):** a server-only-free mirror of `auth.ts` carrying only `drizzleAdapter(db, { provider: 'pg' })` + `emailAndPassword: { enabled: true }`; the `auth:generate` script reads this file (`--config src/lib/auth-schema.config.ts`), never `lib/auth.ts` (whose `'server-only'` import the CLI can't load).
- **Catch-all handler (`src/app/api/auth/[...all]/route.ts`):** `export const { POST, GET } = toNextJsHandler(auth);`.
- **`getCurrentUser()`** — a React-`cache`d `getSession` wraps `auth.api.getSession({ headers: await headers() })` (deduped per request), and `getCurrentUser` returns `(await getSession())?.user ?? null`.
- **`requireUser(next?)`** — `async (next?) => { const u = await getCurrentUser(); if (!u) redirect(next ? '/sign-in?next=' + encodeURIComponent(next) : '/sign-in'); return u; }`.
- **`signUpAction(prevState, formData): Promise<Result<never>>`** — `SignUpSchema.safeParse(Object.fromEntries(formData))`; on failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; then `try { await auth.api.signUpEmail({ body: { name, email, password } }); } catch (e) { return mapAuthError(e); }` and finally `redirect('/verify-email?email=' + encodeURIComponent(email))`. No taken-email branch: under `autoSignIn: false` / `requireEmailVerification: true`, `signUpEmail` on a taken email returns the same generic success as a fresh sign-up (the enumeration defense is closed at the source, Ch053 L1) — so the `catch` never sees a taken-email error; `mapAuthError` only handles genuinely-thrown failures.
- **`signInAction(prevState, formData): Promise<Result<never>>`** — same parse seam; `await auth.api.signInEmail({ body: { email, password } })` in `try`/`catch (e) { return mapAuthError(e); }`; then `const next = safeNext(parsed.data.next); redirect(next ?? '/dashboard');`. `mapAuthError` resolves wrong-credentials to `unauthorized` and unverified to `forbidden`.
- **`signOutAction` (`src/app/(protected)/sign-out-action.ts`)** — `'use server'; export const signOutAction = async () => { await auth.api.signOut({ headers: await headers() }); redirect('/sign-in'); };`.
- **`proxy.ts`** — exports a `proxy` async function reading `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` (the prefix arg is mandatory — the `better-auth` default silently misses the `__Host-` cookie); on protected matcher hit without cookie, redirect to `/sign-in?next=` with the encoded path; on auth-page matcher hit with cookie, redirect to `/dashboard`; `export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] }`.
- **`safeNext(raw): string | undefined` (`src/lib/redirects.ts`, provided):** returns the value only when it is a string starting with a single `/`, not starting with `//`, and containing no `:`; otherwise `undefined` (caller falls back to `/dashboard`).
- **`SignUpSchema`** (Zod) — `z.strictObject({ name: z.string().min(1).max(80), email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(12) })`.
- **`SignInSchema`** — `z.strictObject({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1), next: z.string().optional() })`.
- **Env entries (`.env.example`):**
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app`
  - `DATABASE_URL_UNPOOLED=postgres://postgres:postgres@localhost:5432/app` (pooled/unpooled split so Unit 20 can plug Neon in without renaming)
  - `SEED=1`
  - `BETTER_AUTH_SECRET=` (32+ bytes, generate via `openssl rand -base64 32`)
  - `BETTER_AUTH_URL=http://localhost:3000`
  - `RESEND_API_KEY=re_...` (carry-in from chapter 050)
  - `EMAIL_FROM='Acme <verify@send.acme.example>'` (carry-in from chapter 050 — Display Name format; address must live on a Resend-verified domain)
  - `EMAIL_REPLY_TO=support@acme.example` (carry-in from chapter 050)
  - `NEXT_PUBLIC_APP_NAME=Acme` (carry-in from chapter 050 — read by `email-layout.tsx`)
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

### Concepts demonstrated → owning lesson

- Authn vs. authz; sessions as opaque server-stored handles; `__Host-` cookie defaults — lesson 1 of chapter 051, lesson 2 of chapter 051.
- `betterAuth({ ... })` config, the catch-all handler, the `authClient`, `'server-only'` on `lib/auth.ts` — lesson 1 of chapter 052; demonstrated in Lesson 2.
- Drizzle adapter, the four canonical tables (`user`, `session`, `account`, `verification`), Better Auth CLI `generate` — lesson 2 of chapter 052; demonstrated in Lesson 2.
- Session config (`expiresIn`, `updateAge`, `freshAge`, `cookieCache`), cookie surface tuning — lesson 3 of chapter 052; demonstrated in Lesson 2.
- `auth.api.getSession({ headers })`, `getCurrentUser`, `requireUser` — lesson 4 of chapter 052; written in Lesson 2, exercised in Lesson 5.
- `signUp.email` / `signIn.email`, `emailAndPassword` config, `requireEmailVerification`, `autoSignIn`, `minPasswordLength` — lesson 1 of chapter 053, lesson 2 of chapter 053; sign-up in Lesson 2, gate in Lesson 3, sign-in in Lesson 4.
- `emailVerification` config block, `sendVerificationEmail` callback, `autoSignInAfterVerification`, the URL-embedded JWT verification token (no `verification` table row) — lesson 3 of chapter 053; demonstrated in Lesson 3.
- The two-layer gate — `proxy.ts` cookie-presence + layout validating read, `?next=` round-trip with open-redirect closure, inverse gate — lesson 1 of chapter 054; demonstrated in Lesson 5 (with `?next=` sanitization introduced in Lesson 4).
- React Email template composition, transactional send through Resend with verified domain — chapter 049, chapter 050; demonstrated in Lesson 3.
- Server Actions with `useActionState`, Zod at the action boundary, the `Result` discriminant — chapter 043; demonstrated in Lessons 2, 3, 4.
- `@t3-oss/env-nextjs`-validated env via `src/env.ts` — lesson 1 of chapter 034; the `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` entries are added in Lesson 2.
- The `nextCookies()` plugin requirement in Next.js 16 — lesson 1 of chapter 052; demonstrated in Lesson 2.

---

## Lesson 1 — Project Overview

The student leaves with the starter running locally: Postgres up, env filled, and the auth-page shells (sign-up, sign-in, and the static `/dashboard` placeholder) served by `pnpm dev` with their actions and gate still unwired. No feature is built.

What we're building: a runnable email+password auth flow with a verification gate — sign up, receive a verification email, click to verify, sign in, land on a protected `/dashboard`, sign out and watch the `session` row disappear. This is the foundation every later unit (Unit 9 orgs, Unit 10 list views with `requireUser`, Unit 11 billing, Unit 13 notifications) builds on top of. One screenshot strip shows the end UX: the sign-up form, the verification email arriving in the inbox, the verify click landing on `/dashboard`, and the sign-out button in the protected layout.

What we'll practice:

- Configuring Better Auth's `auth` instance and reading the four-table schema the CLI generates.
- Driving a sign-up, verification, and sign-in flow through Server Actions with the canonical `Result` shape.
- Composing a transactional React Email template and sending it through the existing Resend pipeline.
- Building the two-layer request-time gate: a cookie-presence proxy plus a layout-level validating read.

Scope cuts (named so the student knows where the line is): no OAuth providers (lesson 8 of chapter 053 chapter material), no passkeys (lesson 7 of chapter 053), no 2FA (lesson 6 of chapter 053), no magic links (lesson 5 of chapter 053), no password reset (lesson 4 of chapter 053), no account linking (lesson 9 of chapter 053), no rate limiting (chapter 074 owns), no organization scoping (Unit 9 owns), no audit log (chapter 057). The project deliberately stays in the email+password lane.

Architecture: a labeled list of the moving parts and how a request flows through them — the browser hits `/sign-up`, a Server Action calls `auth.api.signUpEmail`, the `sendVerificationEmail` callback sends through Resend, and the user is redirected to `/verify-email` with no session yet; the `nextCookies()` plugin lands the session cookie once a session is issued (at verification and sign-in); the catch-all `/api/auth/[...all]` handler serves every Better Auth endpoint; the `proxy.ts` cookie check and the layout's `requireUser()` validating read form the two-layer gate in front of `/dashboard`.

Starting file tree: the annotated layout from the Chapter framing. The TODO-marked stubs are the highlighted focus — `src/proxy.ts`, `src/env.ts`, `src/lib/auth.ts`, `src/lib/auth-schema.config.ts`, `src/db/index.ts`, `src/db/schema/auth.ts`, the catch-all `route.ts`, the two `actions.ts` files, the `verify-email` page and its resend island, the protected `layout.tsx`, the `sign-out-action.ts`, and `src/emails/welcome-verification.tsx`. Provided files (`src/lib/auth-client.ts`, `src/lib/email.ts`, `src/lib/suppressions.ts`, `src/lib/auth/error-mapping.ts`, `src/lib/result.ts`, `src/lib/redirects.ts`, the form components and page shells) are noted but uncommented except where a lesson will touch them.

Lessons in this chapter (one Card each):

- **Lesson 2 — Sign up creates the account.** Wire the `auth` instance, generate the schema, mount the catch-all handler, and ship a sign-up that creates the `user` and `account` rows and redirects to the verification screen — no session yet.
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
- Run the existing migration: `pnpm db:migrate` (the starter ships `drizzle/0000_init_schema.sql`, which creates `email_suppressions` and the `suppression_reason` enum; no auth tables yet — those land in Lesson 2).
- Start the dev server: `pnpm dev`.
- Expected result: the app boots; `/` redirects to `/sign-in`; `/sign-up` and `/sign-in` render their forms but the submit does nothing yet (the actions return `err('internal', 'Not implemented')`); `/dashboard` serves an ungated static "Dashboard" placeholder (200, no auth gate); Drizzle Studio (`pnpm db:studio`) shows only `email_suppressions`, no auth tables.

---

## Lesson 2 — Sign up creates the account

Goal: a visitor can submit the sign-up form, create the `user` and `account` rows, and land on the "check your inbox" screen — no session, no cookie. Finished result: submitting `/sign-up` with a fresh email, a 12-character password, and a name creates a `user` row (`emailVerified: false`) and an `account` row (`providerId: 'credential'`, scrypt hash) in Postgres and redirects to `/verify-email?email=…`; the `verification` table stays empty because the email-verification token is a stateless JWT carried in the verify URL, not a DB row. DevTools shows no session cookie, because under `requireEmailVerification: true` sign-up issues no session until the email is verified. The email itself is wired in Lesson 3, so the inbox stays empty for now.

### Your mission

This lesson stands up the auth spine and proves it end to end with a sign-up. You configure the `betterAuth` instance as the single server-side auth module (`'server-only'` on the first line, per Principle #5 — Better Auth's API is consumed directly, no wrapper layer), let the Better Auth CLI generate the four-table Drizzle schema rather than hand-writing it, and mount the catch-all `/api/auth/[...all]` handler that serves every endpoint the library exposes — never per-action route files. The one line that earns the most attention is `nextCookies()` in the plugin array: it is the bridge that lets a Better Auth call land its `Set-Cookie` header on the action response, and without it the canonical silent failure surfaces once a session is actually issued (in Lesson 3) — wire it now so that bridge is already in place. From the start `requireEmailVerification: true` and `autoSignIn: false` hold: sign-up creates the account but issues no session and sets no cookie — the user must verify their email before any session exists. Honor the carry-in defaults at the call site: `__Host-` cookie prefix, `minPasswordLength: 12` (the 2026 senior default, not the library's 8), `Secure` cookies only in production because the browser refuses `Secure` on `http://localhost`. The sign-up action parses `FormData` with the `SignUpSchema` at the boundary, returns the canonical `Result` shape on a validation miss, and routes genuinely-thrown Better Auth error codes through the provided `mapAuthError` in its `catch` block. A taken email is deliberately not one of those errors: under `autoSignIn: false`, `signUpEmail` returns the same generic success for a taken email as for a fresh one, so the action ships no "email already exists" branch — surfacing one would rebuild the user-enumeration oracle the lessons closed at the source (Ch053 L1). On success the action redirects to `/verify-email?email=…`. Out of scope: the verification email itself (the template and the `emailVerification` config block land in Lesson 3 — this lesson only confirms the rows and the redirect), the sign-in surface, and the protected-route gate all arrive in later lessons. Write `getCurrentUser()` and `requireUser()` now — they live in `lib/auth.ts` alongside the instance and are part of the spine — even though nothing calls them until Lesson 5.

- Submitting `/sign-up` with a fresh email, a 12-character password, and a name creates a `user` row whose `emailVerified` is `false`.
- The same submission creates an `account` row with `providerId: 'credential'` and a scrypt hash in the `password` column. No `verification` row is written — the verification token is a stateless JWT in the verify URL, so that table stays empty.
- The submission issues no session and sets no cookie — DevTools shows no `session_token` after sign-up — and the browser is redirected to `/verify-email?email=…`.
- Running the Better Auth CLI generates `src/db/schema/auth.ts` with `user`, `session`, `account`, and `verification` tables, and the migration creates all four in Postgres with their indexes and FK cascades.
- Submitting a password shorter than 12 characters or a malformed email re-renders the form with an inline validation message and creates no rows.
- Submitting an email that already has an account follows the same generic success path as a fresh sign-up — no "email already exists" tell, no server crash (the enumeration defense closed at the source, Ch053 L1).

### Coding time

Implement the spine against the brief, then check your work against the tests. Reference walkthrough hidden in `<details>`:

- Add `BETTER_AUTH_SECRET` (`z.string().min(32)`) and `BETTER_AUTH_URL` (`z.url()`) to both the `server` block and `runtimeEnv` in `src/env.ts` — every later module reads them through `env`, never `process.env`.
- Fill `src/lib/auth-schema.config.ts` — the CLI-only generator config: `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), emailAndPassword: { enabled: true } })`. It is a server-only-free mirror of `auth.ts`; the `auth:generate` script targets this file because the CLI can't load the `'server-only'` import in `lib/auth.ts`.
- Run `pnpm auth:generate` — the script runs `auth generate --config src/lib/auth-schema.config.ts --output src/db/schema/auth.ts`, knows Drizzle + Postgres, and writes the four-table schema. Read the generated file column by column (revisit lesson 2 of chapter 052's walkthrough), then commit it. Committing the generated file (schema as source of truth) rather than generating at runtime in CI is the senior pattern.
- Import the generated schema into the client: in `src/db/index.ts`, `import * as authSchema from './schema/auth'` and spread it into the `drizzle()` schema alongside `emailSuppressions` so relational queries see the auth tables.
- Run `pnpm db:generate --name add_auth_tables` and `pnpm db:migrate`. Open Studio; confirm the four tables, indexes, and FK cascades.
- Fill `src/lib/auth.ts`: `import 'server-only';` first; export the environment-aware `SESSION_COOKIE_PREFIX` (`process.env.NODE_ENV === 'production' ? '__Host-better-auth' : 'better-auth'`); then `betterAuth({ database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }, session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 10, cookieCache: { enabled: true, maxAge: 5 * 60 } }, advanced: { cookiePrefix: SESSION_COOKIE_PREFIX, useSecureCookies: process.env.NODE_ENV === 'production' }, plugins: [nextCookies()] })` — `nextCookies()` is the **last** plugin. The session config is the lesson 3 of chapter 052 course values — 30-day expiry, 1-day sliding renewal, 10-minute fresh window, 5-minute cookie cache. `SESSION_COOKIE_PREFIX` is declared once here and imported by the proxy in Lesson 5 (never restated as a literal — drift makes `getSessionCookie` silently miss the cookie); `__Host-` cannot set over `http://localhost`, so dev relaxes the prefix. `requireEmailVerification: true` holds from the start — sign-up issues no session until the email is verified (Lesson 3 adds the `emailVerification` block that sends the link).
- In the same file, write the read ladder: a React-`cache`d `getSession` wrapping `auth.api.getSession({ headers: await headers() })`, then `getCurrentUser()` returning `(await getSession())?.user ?? null` and `requireUser(next?)` redirecting to `/sign-in?next=…` when there is no user. (`auth-client.ts` is already provided — `createAuthClient()`, bare for same-origin.)
- Fill `src/app/api/auth/[...all]/route.ts` — `import { auth } from '@/lib/auth'; import { toNextJsHandler } from 'better-auth/next-js'; export const { POST, GET } = toNextJsHandler(auth);`. The catch-all `[...all]` segment is not optional; per-action route files break every endpoint the library expects to expose (the lesson 1 of chapter 052 rule).
- Fill `src/app/(auth)/sign-up/actions.ts`: `'use server';` first; `SignUpSchema.safeParse(Object.fromEntries(formData))`; on parse failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; on success `try { await auth.api.signUpEmail({ body: { name, email, password } }); } catch (e) { return mapAuthError(e); }` then `redirect('/verify-email?email=' + encodeURIComponent(email))` (no session is issued — under `requireEmailVerification: true` the user must verify before any session exists). There is no taken-email branch, because under `autoSignIn: false` `signUpEmail` returns generic success for a taken email rather than throwing (the enumeration defense closed at the source, Ch053 L1). The provided `SignUpForm` already wires `useActionState(signUpAction, null)` and renders `state.error.userMessage` plus the per-field errors via `<FieldError>`, so no page changes are needed.

Covers the untested requirements: the `'server-only'` placement on `lib/auth.ts`; the one-line handler shape; the CLI-config / committed-schema split. Callout: under `requireEmailVerification: true` / `autoSignIn: false`, `signUpEmail` creates the rows but issues no session and lands no cookie — the redirect to `/verify-email` is the win this lesson confirms. For the `Result` discriminant, `useActionState` wiring, and Zod-at-the-boundary, link to chapter 043 rather than re-explaining.

### Moment of truth

Run the lesson's test suite: `pnpm test:lesson 2`. Expected: all pass, covering account creation rows, the validation rejection, and the enumeration-safe taken-email path (generic success, no conflict tell).

Confirm by hand the requirements the tests don't cover:

- [ ] After a fresh sign-up, the browser lands on `/verify-email?email=…` and DevTools shows no `session_token` cookie (none is issued until the email is verified).
- [ ] `pnpm auth:generate` produced `src/db/schema/auth.ts` with all four tables, and Studio shows them in Postgres with indexes and FK cascades; the `verification` table is present but empty after sign-up.
- [ ] The generated schema file is committed, and `src/db/index.ts` spreads `authSchema` into the drizzle client.
- [ ] `src/lib/auth.ts` starts with `'server-only'`.

---

## Lesson 3 — The email verification gate

Goal: a brand-new account receives a verification email, and clicking the link verifies the account and signs the user in. Finished result: after sign-up the user lands on a "check your inbox" screen; the inbox holds a branded React Email message with a working CTA; clicking it flips `user.emailVerified` to `true` (the token is the signed JWT carried in the link, so nothing is read from or written to the `verification` table) and (via `autoSignInAfterVerification`) drops the user on `/dashboard`.

### Your mission

This lesson wires the email that makes the verification gate usable. `requireEmailVerification: true` is already on from Lesson 2, and sign-up already redirects to `/verify-email?email=…` — but nothing sends the link yet, so the screen is a dead end. You build the `welcome-verification.tsx` React Email template on the provided `EmailLayout` chrome, and add the `emailVerification` config block whose `sendVerificationEmail` callback rides the exact same `sendEmail` from chapter 050 — no Resend re-implementation; the `react` field takes the rendered template element (`createElement(WelcomeVerification, …)`). The token gets a one-hour `expiresIn`: long enough that inbox triage doesn't kill the link, short enough that a stale forwarded email doesn't grant indefinite access. The token itself is a stateless signed JWT embedded in `url` — Better Auth verifies its signature and expiry on the callback request, so there is no token row to consume. `autoSignInAfterVerification: true` is the senior call — the user just proved email control by clicking the link, so re-prompting for a password they typed minutes ago is a pointless UX regression; the library issues the session on the verify-callback request — this is the first point in the flow where a session and cookie actually land. You also finish the verify-email screen: it shows the target email and a `VerifyEmailResend` client island whose button calls `authClient.sendVerificationEmail`. Mind the suppression path: `sendEmail` still consults `email_suppressions` (via `isSuppressed`), so a suppressed address creates the user but never receives mail — the resend button is the user's escape hatch, not a bug. Out of scope: the sign-in surface and the unverified-refusal behavior land in Lesson 4; the protected-route gate lands in Lesson 5, so `/dashboard` is still an ungated placeholder after the auto-sign-in here.

- After sign-up, the browser lands on `/verify-email` showing the address the link was sent to.
- A verification email arrives in the inbox rendered from the React Email template, with a heading, a greeting, a working CTA button, a plain-text fallback link, and a one-hour expiry notice.
- Clicking the CTA flips `user.emailVerified` to `true` in Postgres; the `verification` table stays empty (the token is a JWT, not a row).
- After clicking the CTA, the user is signed in (a fresh `session` row exists) and is taken to `/dashboard` without re-entering a password.
- The resend button on `/verify-email` sends a new email with a fresh JWT link.

### Coding time

Implement against the brief, then check against the tests. Reference walkthrough hidden in `<details>`:

- Build `src/emails/welcome-verification.tsx`: wrap the provided `EmailLayout` and use React Email components from chapter 049; props `{ firstName: string; verifyUrl: string }`; a `<Preview>` line, a heading "Verify your email", a `firstName` greeting, an explanatory paragraph, a prominent `<Button href={verifyUrl}>Verify email</Button>`, a plain-text fallback ("If the button doesn't work, paste this link: {verifyUrl}"), and "This link expires in 1 hour."; export a `WelcomeVerification.PreviewProps` for the dev preview.
- Extend `lib/auth.ts`: add the `emailVerification: { sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: createElement(WelcomeVerification, { firstName: user.name, verifyUrl: url }), idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 }` block (`requireEmailVerification: true` is already set from Lesson 2).
- Finish `src/app/(auth)/verify-email/page.tsx` (provided shell): read `?email=` from search params, show "Check your inbox" with the email and the 1-hour notice, and render `<VerifyEmailResend email={email ?? ''} />`.
- Add `src/app/(auth)/verify-email/verify-email-resend.tsx` (new client island): `'use client'`; a button calling `authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' })`.

Covers the untested requirements: the `idempotencyKey` shape (`verify:${user.id}:${url}`) so a double-submit doesn't double-send; the suppression-path reasoning and why the resend button is the escape hatch. Callout: the `react` field accepting a rendered element directly is a React Email + Resend convenience, not a custom serializer. For React Email composition and the Resend send path, link to chapter 049 and chapter 050 rather than re-explaining.

### Moment of truth

Run the lesson's test suite: `pnpm test:lesson 3`. Expected: all pass, covering the `emailVerified` flip and the post-verify session creation.

Confirm by hand the requirements the tests don't cover:

- [ ] After sign-up, the browser lands on `/verify-email` showing the target email.
- [ ] The verification email arrives and renders with heading, greeting, CTA, fallback link, and expiry notice.
- [ ] Clicking the CTA lands you on `/dashboard` signed in without a password re-prompt (the dashboard still shows the ungated placeholder — the gate arrives in Lesson 5).
- [ ] The resend button delivers a fresh email.

---

## Lesson 4 — Sign in, with unverified refusal and safe redirects

Goal: a verified user can sign in and is returned to where they were headed, while an unverified user is refused and a malicious `?next=` is neutralized. Finished result: `/sign-in` accepts valid credentials and redirects to the sanitized `?next=` (or `/dashboard`); wrong credentials show one opaque message; an unverified account is refused inline with a resend link; `?next=//evil.com` falls back to `/dashboard`.

### Your mission

This lesson builds the sign-in action and the safety rules around its redirect. The action mirrors sign-up — `SignInSchema` parse at the boundary, `auth.api.signInEmail`, the canonical `Result` shape — but its error handling is where the security discipline lives. `mapAuthError` collapses wrong-email and wrong-password into the same opaque `unauthorized` result ("Invalid email or password."), closing the account-enumeration vector (the lesson 2 of chapter 053 rule); the unverified case maps to a distinct `forbidden` result, which is safe because it only leaks after the password already matched, itself proof of identity. The `?next=` parameter is attacker-controlled, so it runs through the provided `safeNext` guard before it ever reaches `redirect()`: it accepts only a string that starts with a single `/`, rejecting `//`-prefixed (protocol-relative URLs the browser resolves to an external origin), colon-containing (`javascript:`, absolute URLs), and non-`/`-prefixed values, returning `undefined` so the caller falls back to `/dashboard`. The provided `SignInForm` already carries `next` as a hidden input sourced from `searchParams.next` and renders a resend link when the result is `forbidden`. Out of scope: the proxy-level gate and the inverse redirect for already-signed-in users land in Lesson 5; this lesson owns only the sign-in action and its redirect safety. Reuse the `mapAuthError` helper from the sign-up surface rather than inventing a parallel shape.

- Submitting `/sign-in` with a verified account's correct credentials redirects to `/dashboard`.
- Submitting a wrong email or a wrong password shows one identical "invalid email or password" message, with no hint as to which was wrong and no session cookie set.
- Submitting the credentials of an account that hasn't verified its email shows "verify your email" inline with a resend link, and sets no session cookie.
- Signing in from `/sign-in?next=/dashboard/billing` redirects to `/dashboard/billing`.
- Signing in from `/sign-in?next=//evil.com` or `/sign-in?next=https://evil.com` redirects to `/dashboard`, never to the external origin.

### Coding time

Implement against the brief, then check against the tests. Reference walkthrough hidden in `<details>`:

- Build `src/app/(auth)/sign-in/actions.ts`: `'use server';` first; `SignInSchema.safeParse(Object.fromEntries(formData))` (validation miss → `err('validation', …, z.flattenError(...).fieldErrors)`); `try { await auth.api.signInEmail({ body: { email, password } }); } catch (e) { return mapAuthError(e); }` — the mapper yields `unauthorized` for wrong credentials (identical message either way) and `forbidden` for unverified; then `const next = safeNext(parsed.data.next); redirect(next ?? '/dashboard');`.
- The provided `SignInForm` already wires `action={signInAction}`, renders `state.error.userMessage`, passes `next` from `searchParams.next` as a hidden input, and shows the resend link on `error.code === 'forbidden'` — no page changes needed.

Covers the untested requirements: the `safeNext` allowlist rules one by one; why the unverified `forbidden` reason is safe to distinguish while wrong-credentials must stay opaque. Callout: the unverified refusal is produced by `requireEmailVerification: true` from Lesson 2 surfacing as an `EMAIL_NOT_VERIFIED` error that `mapAuthError` turns into `forbidden`, not by an explicit check in this action. For the `Result` shape and `useActionState`, link to chapter 043; for the open-redirect reasoning, link to lesson 1 of chapter 054.

### Moment of truth

Run the lesson's test suite: `pnpm test:lesson 4`. Expected: all pass, covering the successful redirect, the opaque-credentials path, the unverified refusal, and the `?next=` sanitization (valid path honored, `//evil.com` and absolute URLs rejected).

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

- Fill `src/proxy.ts`: `import { getSessionCookie } from 'better-auth/cookies';`, `import { type NextRequest, NextResponse } from 'next/server';`, and `import { SESSION_COOKIE_PREFIX } from '@/lib/auth';`; `export async function proxy(request: NextRequest) { const cookie = getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX }); const path = request.nextUrl.pathname; const isProtected = path.startsWith('/dashboard'); const isAuthPage = path === '/sign-in' || path === '/sign-up'; if (isProtected && !cookie) { const next = encodeURIComponent(path + request.nextUrl.search); return NextResponse.redirect(new URL('/sign-in?next=' + next, request.url)); } if (isAuthPage && cookie) { return NextResponse.redirect(new URL('/dashboard', request.url)); } return NextResponse.next(); }`; `export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] };`. The named export must be `proxy` (Next.js 16 dispatches on the exact name), and the `cookiePrefix` arg is mandatory — its `better-auth` default silently misses the `__Host-` cookie and bounces signed-in users in production.
- Fill `src/app/(protected)/layout.tsx`: keep the layout body itself sync and put the request-time read in an inner async `AppNav` component rendered under `<Suspense>` (so the co-located `loading.tsx` covers the children, not the gate); `AppNav` calls `const user = await requireUser('/dashboard');` then renders the nav strip with `{user.email}` and `<form action={signOutAction}><Button type="submit">Sign out</Button></form>`; `<main>{children}</main>` follows. Update `dashboard/page.tsx` to read `getCurrentUser()` and show the name + email — a second read in the same request hits the React-`cache`d `getSession`, no extra DB round trip.
- Fill `src/app/(protected)/sign-out-action.ts`: `'use server';`; `export const signOutAction = async () => { await auth.api.signOut({ headers: await headers() }); redirect('/sign-in'); };`.

Covers the untested requirements: why the proxy reads the cookie while the layout reads the session (the two-layer split and its defense-in-depth payoff); why sign-out is a form action, not an `onClick` fetch; the matcher-plus-`requireUser` rule for future protected segments. Callout: inspecting the Drizzle query log on a signed-in `/dashboard` request shows one session read per request, served from the cookie cache within the 5-minute window most of the time. For the two-layer gate rationale and the matcher pattern, link to lesson 1 of chapter 054.

With the flow runnable end to end, name the pre-ship checklist (named, not built here): rotate `BETTER_AUTH_SECRET` on a cadence and on every staff turnover; configure Resend's bounce/complaint webhooks (chapter 065 owns the handler) to write `email_suppressions` so verification mail to bouncing addresses doesn't burn the domain's reputation; add rate limits to the sign-in, sign-up, and verify-resend endpoints (chapter 074) before this reaches a public URL. Point forward to where this setup gets extended: chapter 053's chapter material layers passwords, magic links, TOTP, passkeys, and OAuth on this same schema without re-shaping it; lesson 2 of chapter 054's credential-change and elevation tier reads the `freshAge` knob configured in Lesson 2; lesson 3 of chapter 054's active-sessions list reads the `ipAddress` / `userAgent` columns the `session` table already populates; Unit 9 wraps `requireUser` with org scoping and the `authedAction` authz wrapper; Unit 10's list views call `requireUser()` in their server reads rather than re-checking the cookie.

### Moment of truth

Run the lesson's test suite: `pnpm test:lesson 5`. Expected: all pass, covering the signed-out redirect with `?next=`, the inverse gate, and the sign-out session-row deletion.

Confirm by hand the requirements the tests don't cover:

- [ ] Signed out, `/dashboard` redirects to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard`.
- [ ] Signed in, visiting `/sign-in` bounces to `/dashboard`.
- [ ] After sign-out, Studio shows the `session` row gone, DevTools shows the cookie cleared, and refreshing `/dashboard` redirects again.
- [ ] `proxy.ts` imports `getSessionCookie` only — no `auth` import, no `auth.api.getSession` call.
- [ ] With two browsers signed in as the same user, signing out of one and refreshing the other redirects to `/sign-in` once the cookie cache window lapses (the lesson 3 of chapter 054 trade-off).
