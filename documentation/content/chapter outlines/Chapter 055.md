# Chapter 055 — Project: email+password auth with verification

## Chapter framing

Chapter 055 cashes in everything Unit 8 installed: the conceptual ground (chapter 051) — authn versus authz, server-stored opaque sessions in `__Host-`-prefixed cookies, the OAuth/PKCE shape named for downstream; the running Better Auth setup (chapter 052) — the `auth` instance, the catch-all handler, the Drizzle adapter and four canonical tables (`user`, `session`, `account`, `verification`), the session config with `freshAge` and the cookie cache, the `getCurrentUser()` / `requireUser()` helpers; the email+password sign-in surface (lesson 1 of chapter 053–lesson 3 of chapter 053) — `signUp.email`, `signIn.email`, the email-verification gate via `requireEmailVerification`; the request-time gate (lesson 1 of chapter 054) — the two-layer pattern with `proxy.ts` doing cookie-presence redirects and the layout doing the validating read. The student ships the canonical first auth flow: sign up with email and password, receive a verification email through the Unit 7 Resend pipeline, click the link to verify, sign in, land on a protected `/dashboard`, sign out and watch the `session` row disappear. Nothing more — no OAuth, no passkeys, no 2FA, no password reset (those live in lesson 4 of chapter 053–lesson 8 of chapter 053 chapter material; the project deliberately stays in the email+password lane).

Threads that run through every lesson: Better Auth's API is consumed directly per Principle #5 — the only thin modules are `lib/auth.ts` (server) and `lib/auth-client.ts` (browser); the catch-all route handler at `/api/auth/[...all]/route.ts` is the only auth route file the project writes — never per-action route files; the `nextCookies()` plugin is non-negotiable in Next.js 16 (without it, sign-up succeeds server-side but the cookie never reaches the browser — the canonical silent failure); the cookie defaults from lesson 2 of chapter 051 are honored at the call site (`__Host-`-prefixed, `HttpOnly`, `Secure`, `SameSite=Lax`); the verification email rides the existing Unit 7 send pipeline — the project does not re-implement Resend, only the `WelcomeVerification.tsx` React Email template and the `sendVerificationEmail` callback; `requireEmailVerification: true` is the senior reflex — unverified users cannot sign in, full stop, no half-state; the `proxy.ts` gate does cookie-presence only and the layout does the validating read (the lesson 1 of chapter 054 rule honored); sign-out is a Server Action that calls `auth.api.signOut`, and the session row's absence is the verification. Five build/walkthrough lessons plus a verify lesson, each ending on a runnable state.

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
  - `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, plugins: [nextCookies()], emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }, emailVerification: { sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: <WelcomeVerification firstName={user.name} verifyUrl={url} />, idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 } })`
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

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| A new account can be created | Submit `/sign-up` with a fresh email; `user` row exists in Postgres with `emailVerified: false`; `verification` row exists with the token |
| The verification email arrives and the link verifies the user | Inbox shows the React Email template with the CTA; clicking it lands on `/dashboard` (via `autoSignInAfterVerification: true`); `user.emailVerified` flips to `true` in Postgres; the consumed `verification` row is deleted |
| A protected route redirects to sign-in when signed out | Open `/dashboard` in a fresh incognito window; redirected to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard` |
| Signing out invalidates the session row in the database | Click sign-out on `/dashboard`; redirected to `/sign-in`; the `session` row for that token is gone from Postgres (one-row delete); refreshing `/dashboard` redirects again |
| Sign-in refuses an unverified user | Sign up, ignore the email, attempt sign-in — action returns `'email-not-verified'`; UI surfaces "verify your email" inline with a resend link; no session cookie set |
| `proxy.ts` does cookie-presence only | Inspect the proxy code path — no `auth.api.getSession` call; only `getSessionCookie(request)` |
| `?next=` survives a malicious value | Hit `/sign-in?next=//evil.com`; after sign-in, redirected to `/dashboard` (fallback), not `evil.com`; `?next=/dashboard/billing` (valid relative path) is honored |
| Inverse gate works | Signed-in user navigating to `/sign-in` is bounced to `/dashboard` instead of seeing the form |

### Concepts demonstrated → owning lesson

- Authn vs. authz; sessions as opaque server-stored handles; `__Host-` cookie defaults — lesson 1 of chapter 051, lesson 2 of chapter 051.
- `betterAuth({ ... })` config, the catch-all handler, the `authClient`, `'server-only'` on `lib/auth.ts` — lesson 1 of chapter 052.
- Drizzle adapter, the four canonical tables (`user`, `session`, `account`, `verification`), Better Auth CLI `generate` — lesson 2 of chapter 052.
- Session config (`expiresIn`, `updateAge`, `freshAge`, `cookieCache`), cookie surface tuning — lesson 3 of chapter 052.
- `auth.api.getSession({ headers })`, `getCurrentUser`, `requireUser` — lesson 4 of chapter 052.
- `signUp.email` / `signIn.email`, `emailAndPassword` config, `requireEmailVerification`, `autoSignIn`, `minPasswordLength` — lesson 1 of chapter 053, lesson 2 of chapter 053.
- `emailVerification` config block, `sendVerificationEmail` callback, `autoSignInAfterVerification`, the `verification` table token row — lesson 3 of chapter 053.
- The two-layer gate — `proxy.ts` cookie-presence + layout validating read, `?next=` round-trip with open-redirect closure, inverse gate — lesson 1 of chapter 054.
- React Email template composition, transactional send through Resend with verified domain — chapter 049, chapter 050.
- Server Actions with `useActionState`, Zod at the action boundary, the `Result` discriminant — chapter 043.
- Zod-validated env via `lib/env.ts` — lesson 1 of chapter 034.
- The `nextCookies()` plugin requirement in Next.js 16 — lesson 1 of chapter 052.

---

## Lesson 1 — Project brief

What the project ships, the eight "Done when" verifications, the scope cuts (no OAuth, passkeys, 2FA, magic links, password reset), and the senior payoff each call earns.

Goals:

- Frame the SaaS shape being built: a runnable email+password auth flow with a verification gate, the foundation every later unit (Unit 9 orgs, Unit 10 list views with `requireUser`, Unit 11 billing, Unit 13 notifications) builds on top of.
- State the eight "Done when" verifications in one paragraph (account creation, email arrives + verifies, protected redirect, sign-out deletes row, unverified refusal, proxy cookie-only, `?next=` open-redirect closure, inverse gate).
- Name the scope cut: no OAuth providers (lesson 8 of chapter 053 chapter material), no passkeys (lesson 7 of chapter 053), no 2FA (lesson 6 of chapter 053), no magic links (lesson 5 of chapter 053), no password reset (lesson 4 of chapter 053), no account linking (lesson 9 of chapter 053), no rate limiting (Unit chapter 074 owns), no organization scoping (Unit 9 owns), no audit log (Unit chapter 057). The project deliberately stays in the email+password lane.
- Set the senior payoff: the choices made here — `requireEmailVerification: true`, `nextCookies()` plugin, the catch-all handler shape, the two-layer gate — are the ones that distinguish a working flow from one that ships footguns to production. Skipping the verification gate means anyone who types a stranger's email starts that stranger's account; skipping `nextCookies()` means sign-up "works" but the cookie never lands; conflating proxy and layout means a DB read per prefetch.
- Show the end UX: one screenshot strip — sign-up form, inbox arrival of the verification email, the verify click landing on `/dashboard`, the sign-out button in the protected layout.
- Link the starter via `degit react-saas-course-projects/chapter 055-email-password-auth/starter`.

Senior calls and watch-outs:

- The verified domain from chapter 050 is non-negotiable. Resend's sandbox sender bounces verification emails into spam folders and the verification flow looks broken for reasons that have nothing to do with the code. The chapter 050 prereq paragraph flagged this; reconfirm before starting.
- `requireEmailVerification: true` is the senior default, not a teaching toggle. Production SaaS that ships with verification off leaks accounts to typo-squatters and to people who type "your-email@gmail.com" by accident.

Codebase state at entry: empty directory (student runs `degit`).
Codebase state at exit: starter cloned, `docker compose up -d` running Postgres, `pnpm install` clean, `.env` filled from `.env.example` with the carry-in Resend keys and a fresh `BETTER_AUTH_SECRET`, `pnpm dev` boots but `/sign-up` and `/sign-in` are empty shells; `/dashboard` 500s because `requireUser` isn't wired yet.

Estimated student time: 10 to 15 minutes.

---

## Lesson 2 — Tour the starter

Walk the provided file tree, confirm the Zod-validated env entries, bring up Postgres, and prove the Unit 7 Resend pipeline still works before any code is written.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on five files:
  - `proxy.ts` (empty file with a TODO header; framing the two-layer gate before the build).
  - `src/lib/auth.ts` (the spine — imports stubbed, the `betterAuth({...})` body is TODO).
  - `src/lib/email.ts` (carry-in from chapter 050, provided; the `sendEmail({ to, subject, react })` signature the student calls from the verification callback).
  - `src/app/(auth)/sign-up/page.tsx` (provided form layout with `name`/`email`/`password` inputs, a `useActionState`-shaped submit, and a TODO marker on the action import).
  - `src/app/(protected)/layout.tsx` (TODO body; the file the layout-level validating read lives in).
- Read `src/lib/env.ts` — confirm `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` are all parsed with Zod. The senior reflex: any env entry the project depends on is in `lib/env.ts`, never `process.env.X` at the call site. From lesson 1 of chapter 034.
- Read `package.json` scripts — `db:generate`, `db:migrate`, `db:studio` from Unit 5 carry-in; new: `auth:generate` (`npx @better-auth/cli generate`) which the next lesson runs.
- Bring up Postgres: `docker compose up -d`, `pnpm db:migrate` runs the existing migrations (Unit 5 domain tables if any are seeded for the starter — the project ships with just `__drizzle_migrations`). Open `pnpm db:studio`, confirm no auth tables yet.
- Walk the Resend verification: send a test email via `sendEmail` to the student's own address using the existing `WelcomeEmail.tsx` from chapter 050 (a small one-liner in a `scripts/smoke-email.ts` provided in the starter) — confirms DKIM/SPF pass and the verified domain still works. This is the chapter 050 carry-in proven, not re-taught.

Senior calls and watch-outs:

- `BETTER_AUTH_SECRET` must be at least 32 bytes from a CSPRNG. Generated via `openssl rand -base64 32` and stored in `.env` (gitignored). Reusing across environments is the failure mode from lesson 1 of chapter 052.
- The starter does *not* commit `src/db/schema/auth.ts` — Better Auth's CLI generates it on first run in the next lesson. Committing the generated file *after* generation is the senior pattern (schema as source of truth, no runtime generation in CI).
- The two `_URL` env entries (`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL`) point at the same origin in this project. The split exists because the auth-server URL might differ from the public app URL in some deploy shapes (subdomain split); for this project they're identical.

Codebase state at entry: starter cloned, Postgres running, env filled, dev server running with empty auth shells.
Codebase state at exit: student has read every provided file, run the Resend smoke test (one email arrived in inbox), confirmed Studio shows no auth tables. No code written. `pnpm dev` still shows empty shells.

Estimated student time: 20 to 25 minutes.

---

## Lesson 3 — Wire the auth spine

Configure the `betterAuth` instance with `nextCookies()`, generate the four-table schema, mount the catch-all handler, and ship a first unverified sign-up that lands a `__Host-` cookie.

Goals:

- Fill `src/lib/auth.ts`:
  - `import 'server-only';` first line (the lesson 1 of chapter 052 reflex).
  - `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, plugins: [nextCookies()] })`.
  - `emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 12, autoSignIn: false }` — *temporarily* off for this lesson's sign-up smoke test; flipped to `true` in the next lesson once the email send is wired. The student sees both states and understands the toggle.
  - Session config: `session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } }` — 30-day expiry, 1-day sliding renewal, 1-day fresh window, 5-minute cookie cache (the lesson 3 of chapter 052 defaults).
  - `advanced: { cookiePrefix: '__Host-', useSecureCookies: process.env.NODE_ENV === 'production' }` — `__Host-` prefix from lesson 2 of chapter 051; `Secure` flips off only in localhost dev (the browser refuses `Secure` cookies on `http://localhost` otherwise).
- Run `pnpm auth:generate` — the Better Auth CLI reads `lib/auth.ts`, knows Drizzle + Postgres, and writes `src/db/schema/auth.ts` with `user`, `session`, `account`, `verification`. Read the generated file column by column (revisit lesson 2 of chapter 052's walkthrough). Commit it.
- Run `pnpm db:generate --name auth_init` and `pnpm db:migrate`. Open Studio; confirm the four tables, indexes, and FK cascades.
- Fill `src/app/api/auth/[...all]/route.ts` — three lines: `import { auth } from '@/lib/auth'; import { toNextJsHandler } from 'better-auth/next-js'; export const { POST, GET } = toNextJsHandler(auth);`.
- Fill `src/lib/auth-client.ts` — `import { createAuthClient } from 'better-auth/react'; export const authClient = createAuthClient({ baseURL: env.NEXT_PUBLIC_APP_URL });`.
- Fill `src/lib/auth-helpers.ts` — `getCurrentUser()` and `requireUser()` per the reference signatures. `'server-only'` first line.
- Fill `src/app/(auth)/sign-up/actions.ts`:
  - `'use server';` first line.
  - Zod `SignUpSchema` parse on `formData`.
  - On parse failure, return `err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties)`.
  - On parse success, `try { await auth.api.signUpEmail({ body: { email, password, name } }); }` — without `headers`, the framework sets the cookie because `nextCookies()` is loaded.
  - On unique-violation error, return `err('conflict', 'An account with that email already exists.')`. The mapping from Better Auth's error codes to the `Result` taxonomy is centralized in the provided `src/lib/auth/error-mapping.ts` (`mapAuthError`), which the action calls in its `catch` block.
  - On success, `redirect('/dashboard')` — because `requireEmailVerification` is off for this lesson, the user lands signed in immediately.
- Wire the sign-up page form's `action={signUpAction}` and read `state.reason` for the inline error.
- Smoke test: `/sign-up`, submit `you@example.com` + a 12-char password + a name. Inspect: `user` row created, `account` row created with `providerId: 'credential'` and a bcrypt hash in `password`, `session` row created, `__Host-better-auth.session_token` cookie set in browser devtools, redirected to `/dashboard` (but `/dashboard` still 500s because `requireUser` isn't called there yet — that's fine; the cookie landing is the win).

Senior calls and watch-outs:

- `nextCookies()` is the line that prevents the silent-failure pattern from lesson 1 of chapter 052. Forgetting it means the `signUp.email` server-side succeeds but the `Set-Cookie` header doesn't make it onto the Server Action response, and the user is "signed up but not signed in" with no indication of the bug.
- `requireEmailVerification: false` here is *only* for this lesson's smoke test. The next lesson flips it to `true` and a regression would mean anyone who typed a stranger's email controls that stranger's account. Flagged with a `// TODO: flip to true in lesson 4 of chapter 055` comment in the code itself.
- `minPasswordLength: 12` is the senior default in 2026, not 8. The library accepts 8 by default; 12 is the call.
- The catch-all `[...all]` segment is *not* optional. Writing `/api/auth/sign-up/route.ts` instead and trying to route manually breaks every endpoint the library expects to expose. The lesson 1 of chapter 052 rule honored.

Codebase state at entry: empty `lib/auth.ts`, no auth schema, no catch-all handler, sign-up form does nothing.
Codebase state at exit: `auth` instance and `authClient` working, four tables in Postgres, catch-all handler responding, sign-up creates a user + session, cookie lands in the browser, `/dashboard` still 500s because the layout doesn't read the session yet. `pnpm dev` is runnable, the sign-up smoke flow is end-to-end visible.

Estimated student time: 55 to 75 minutes.

---

## Lesson 4 — Lock the verification gate

Build the React Email verification template, flip `requireEmailVerification` on, wire `sendVerificationEmail` through the Unit 7 pipeline, and add the sign-in action with opaque errors and `?next=` sanitization.

Goals:

- Build `src/emails/WelcomeVerification.tsx`:
  - React Email template using the components carry-in from chapter 049 (`<Html>`, `<Head>`, `<Body>`, `<Container>`, `<Heading>`, `<Text>`, `<Button>`, `<Link>`).
  - Props: `{ firstName: string; verifyUrl: string }`.
  - Body: heading "Verify your email", greeting using `firstName`, a paragraph explaining the click, a prominent `<Button href={verifyUrl}>Verify email</Button>`, a plain-text fallback line ("If the button doesn't work, paste this link: {verifyUrl}"), and a small expiry notice ("This link expires in 1 hour.").
  - Preview prop set for the inbox preview pane.
- Flip `lib/auth.ts`:
  - `emailAndPassword.requireEmailVerification: true` (the gate the next sign-in honors).
  - Add the `emailVerification` block: `{ sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: <WelcomeVerification firstName={user.name} verifyUrl={url} />, idempotencyKey: `verify:${user.id}:${url}` }); }, sendOnSignUp: true, autoSignInAfterVerification: true, expiresIn: 60 * 60 }` — 1-hour token expiry, auto-send on signup, auto-sign-in on verify.
- Update `signUpAction`:
  - Instead of `redirect('/dashboard')` on success, `redirect('/verify-email?email=' + encodeURIComponent(email))`.
  - On `'email-not-verified'` error class from any retry path, surface it via `err('email-not-verified', 'Verify your email before signing in.')` (the action keeps returning the canonical Result shape from chapter 047).
- Update `src/app/(auth)/verify-email/page.tsx` (provided shell):
  - Reads `?email=` from search params.
  - Renders "Check your inbox" with the email shown and a "resend" button wired to `authClient.sendVerificationEmail({ email })` (client-side call — re-issues the token and re-sends).
- Build `src/app/(auth)/sign-in/actions.ts`:
  - Same shape as sign-up — `SignInSchema` Zod parse on `formData`.
  - `await auth.api.signInEmail({ body: { email, password } })`.
  - Catch the error classes — `err('invalid-credentials', 'Invalid email or password.')` (same opaque message regardless of whether email is wrong or password is wrong — the enumeration discipline from lesson 2 of chapter 053), `err('email-not-verified', 'Verify your email before signing in.')` (returned because `requireEmailVerification: true` blocks the sign-in).
  - `next` sanitization: `formData.get('next')` runs through a `sanitizeNext()` helper that rejects anything starting with `//`, anything containing a `:`, anything not starting with `/`, falling back to `/dashboard`.
  - On success, `redirect(next ?? '/dashboard')`.
- Wire `/sign-in` form's `action={signInAction}`, render `state.reason` inline. Pass `next` from `searchParams.next` as a hidden input.
- Smoke flow:
  - Hit `/sign-up` with a fresh email; redirect to `/verify-email`; inbox arrival of the React Email template; click the verify button; verification token consumed in the `verification` table; `user.emailVerified` flips to `true`; auto-sign-in via `autoSignInAfterVerification: true` lands on `/dashboard` (still 500s — next lesson fixes).
  - Hit `/sign-up` with a second fresh email but don't click the link; hit `/sign-in` with those credentials; action returns `err('email-not-verified', ...)`; UI surfaces "verify your email" inline with a resend link. No session cookie set.

Senior calls and watch-outs:

- The verification email goes through *the same* `sendEmail` from chapter 050. No re-implementation. The `react` field accepts the React Email template directly. The `email_suppressions` read inside `sendEmail` still applies — a suppressed verification address returns `{ ok: false }` and the sign-up still creates the user but the email never sent; the resend button on `/verify-email` is the user's escape hatch in that case.
- `autoSignInAfterVerification: true` is the senior call for SaaS — the user clicked the verify link from their email, that's strong proof of email control, dropping them at the sign-in form to re-type a password they just typed is a UX regression. The library handles the session issue on the verify-callback request directly.
- Returning the same opaque `'invalid-credentials'` for both "email not found" and "wrong password" closes the enumeration vector (lesson 2 of chapter 053's rule). Returning `'email-not-verified'` as a distinct reason is fine — that information leaks only after the password matched, which is itself the proof of identity.
- The `expiresIn: 60 * 60` (1 hour) on `emailVerification` is the senior default. Long enough that an inbox triage doesn't expire the link; short enough that a stolen email forward doesn't grant indefinite access.
- The `?next=` sanitization must reject `//evil.com` (protocol-relative URLs that the browser resolves to `https://evil.com`) and `javascript:` and any absolute URL. The `sanitizeNext` helper is a small allowlist function — paths starting with `/` and not `//`, no colons. From the lesson 1 of chapter 054 watch-out list.

Codebase state at entry: sign-up works but lands unverified; no email sent; no sign-in surface; `requireEmailVerification` is off.
Codebase state at exit: sign-up sends the verification email; verify link flips the user verified and auto-signs-in; sign-in works for verified users; sign-in refuses unverified users with `'email-not-verified'`; `/dashboard` still 500s because the layout doesn't read the session yet. The full mail-in-the-loop flow is visible end-to-end.

Estimated student time: 55 to 75 minutes.

---

## Lesson 5 — Gate the protected surface

Write the `proxy.ts` cookie-presence gate with inverse redirect, install the layout-level `requireUser()` validating read, and ship the sign-out Server Action that deletes the session row.

Goals:

- Fill `proxy.ts` at the project root:
  - `import { NextResponse, type NextRequest } from 'next/server';`
  - `import { getSessionCookie } from 'better-auth/cookies';`
  - `export default async function proxy(request: NextRequest) { const cookie = getSessionCookie(request); const path = request.nextUrl.pathname; const isProtected = path.startsWith('/dashboard'); const isAuthPage = path === '/sign-in' || path === '/sign-up'; if (isProtected && !cookie) { const next = encodeURIComponent(path + request.nextUrl.search); return NextResponse.redirect(new URL('/sign-in?next=' + next, request.url)); } if (isAuthPage && cookie) { return NextResponse.redirect(new URL('/dashboard', request.url)); } return NextResponse.next(); }`
  - `export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] };`
- Fill `src/app/(protected)/layout.tsx`:
  - `'use server'`-shaped server component.
  - `const user = await requireUser();` at the top.
  - Renders a nav strip with `{user.email}` and a sign-out `<form action={signOutAction}><button>Sign out</button></form>`.
  - `<main>{children}</main>` below.
  - `/dashboard/page.tsx` (provided) renders "Hello {name}" using `getCurrentUser()` again (the layout has already gated; this is just to show the call shape — two reads in one request hit the cookie cache, no extra DB round trip).
- Fill `src/app/(protected)/sign-out-action.ts`:
  - `'use server';`
  - `await auth.api.signOut({ headers: await headers() });`
  - `redirect('/sign-in');`
  - The library clears the `__Host-better-auth.session_token` cookie and deletes the `session` row in one call (per lesson 4 of chapter 052 / chapter 053 closeout). The student verifies the row's absence in Studio after sign-out.
- Smoke test:
  - Signed-out: hit `/dashboard` → proxy redirects to `/sign-in?next=%2Fdashboard`.
  - Sign in via `/sign-in` → redirected to `/dashboard` (the `?next=` honored).
  - Signed-in: hit `/sign-in` directly → proxy bounces to `/dashboard` (inverse gate).
  - Click sign-out → cookie cleared, `session` row gone, redirected to `/sign-in`.
  - Refresh `/dashboard` → proxy redirects again (cookie gone).
- Walk the two-layer model one more time at the watch-out level: the proxy's `getSessionCookie` does *not* hit the database, *not* call `auth.api.getSession`; the layout's `requireUser` (which calls `auth.api.getSession`) is the validating read. Inspect the Postgres logs (or Drizzle's query log) on a signed-in `/dashboard` request — one session read per request, hitting the cookie cache (within the 5-min window) most of the time.

Senior calls and watch-outs:

- The proxy reads *only* the cookie. Any reach for `auth.api.getSession` inside `proxy.ts` collapses the two-layer model — the lesson 1 of chapter 054 rule honored at the call site. Inspect the imports in `proxy.ts` to confirm: `getSessionCookie` only, never `auth`.
- The layout calls `requireUser()` — which calls `redirect('/sign-in')` when the session is null. The proxy might pass the request through if the cookie cache is stale and the cookie was revoked server-side; the layout catches the stale-cookie case. Defense in depth.
- The sign-out form is a `<form action={signOutAction}>`, not an `onClick={() => fetch(...)}`. Progressive enhancement holds; the action runs without JS; the redirect lands cleanly.
- The matcher list is explicit. Adding a new protected segment later means adding it to the matcher *and* gating it with `requireUser` in its layout. The senior reflex: every protected segment has both.

Codebase state at entry: sign-up + sign-in + verification work, but `/dashboard` 500s because the layout doesn't read the session.
Codebase state at exit: the full flow is end-to-end runnable. Signed-out → `/sign-in?next=…` → sign-in → `/dashboard` with user nav and sign-out → click sign-out → cookie gone, row gone, back to `/sign-in`. Inverse gate works. The application is in the runnable end state the project promises.

Estimated student time: 45 to 60 minutes.

---

## Lesson 6 — Verify the cycle

Walk every "Done when" clause against Postgres rows, browser cookies, and inbox arrivals, run adversarial probes against `?next=` and the inverse gate, and name the production checklist for shipping.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing). Each step is a concrete observable: row state in Postgres (via Studio), browser cookie state (via DevTools), inbox state (via Resend dashboard or the actual inbox).
- Drop the database (`docker compose down -v && docker compose up -d && pnpm db:migrate`); run through the full flow with a fresh email; confirm clean state at every step:
  - Sign up → `user` row exists with `emailVerified: false`; `account` row with `providerId: 'credential'` and a bcrypt hash; `verification` row with the token; one email in inbox.
  - Click verify → `user.emailVerified: true`; the `verification` row is deleted (consumed); a `session` row appears (the auto-sign-in landing); cookie is in DevTools with `__Host-` prefix, `HttpOnly`, `Secure: false` (local dev), `SameSite: Lax`, `Path: /`.
  - Open `/dashboard` directly → renders the user's name and email.
  - Sign-out → `session` row gone; cookie cleared; redirected to `/sign-in`; refreshing `/dashboard` redirects with `?next=`.
- Adversarial probes:
  - Hit `/sign-in?next=//evil.com`, sign in → land on `/dashboard` (the `sanitizeNext` fallback works).
  - Hit `/sign-in?next=https://evil.com`, sign in → land on `/dashboard`.
  - Hit `/sign-in?next=/dashboard/billing` — even though `/dashboard/billing` doesn't exist in this project, confirm the redirect goes there (Next.js 404 is the right answer; the *redirect target* is what the test confirms).
  - Sign up with an email + don't click verify; attempt to sign in; receive `'email-not-verified'`; hit the resend button on `/verify-email`; receive a fresh email; click; flow completes.
  - Signed-in, navigate to `/sign-in` → bounced to `/dashboard` (inverse gate).
  - Open two browsers signed in as the same user; sign out from browser A; refresh browser B; redirected to `/sign-in` because the `session` row is gone (cookie cache might briefly mask this within the 5-min window — name the trade from lesson 3 of chapter 054).
- Inspect the proxy: `cat proxy.ts | grep getSession` should hit `getSessionCookie` only, never `auth.api.getSession`. The two-layer rule structurally enforced.
- Name the senior calls one more time:
  - `requireEmailVerification: true` is the production default. Shipping with it off is the canonical first-week SaaS bug.
  - `nextCookies()` is the line that prevents the silent-failure pattern. Inspect the plugin array in `lib/auth.ts` and confirm.
  - The catch-all `[...all]` is the only auth route; never write per-action route files.
  - The proxy reads the cookie; the layout reads the session. Two layers, two responsibilities.
  - `?next=` is sanitized at the action boundary, never reflected raw into `redirect()`.
  - Sign-out deletes the session row — the opaque-server-session model from lesson 2 of chapter 051 made concrete; the row's absence is the revocation.
- Forward references:
  - Chapter 053 (chapter material) layered passwords, magic links, TOTP, passkeys, OAuth providers on this same setup; none of them required re-shaping the schema.
  - lesson 2 of chapter 054 added credential changes and the elevation tier; the `freshAge` knob configured in lesson 3 of chapter 055 is what the change-password and change-email actions read.
  - lesson 3 of chapter 054 added the active-sessions list; the `ipAddress` / `userAgent` columns on `session` populated automatically.
  - lesson 4 of chapter 054 named the CSRF and XSS defaults that this setup already encoded — `SameSite=Lax` on the cookie + Server Actions origin check + React 19 auto-escape.
  - Unit 9 will wrap `requireUser` with org scoping (`activeOrganizationId`), add the `authedAction` wrapper for authz, and shift the destructive-action discipline to the action boundary.
  - Unit 10's list views call `requireUser()` in their server-side reads and never re-implement the cookie check.
  - Unit chapter 074 adds Upstash rate limiting to the sign-in, sign-up, and verify-resend endpoints — non-negotiable the moment this project ships to a public URL.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the discipline the student just installed. If any verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- Production checklist (named, not built): rotate `BETTER_AUTH_SECRET` on a cadence and on every staff turnover; configure Resend's bounce/complaint webhooks (Unit 11 owns the webhook handler) to write `email_suppressions` so verification emails to bouncing addresses don't burn the domain's reputation; add rate limits before deploy (Unit chapter 074).

Codebase state at entry: full flow works.
Codebase state at exit: same surface, verified clause-by-clause; every Postgres row, every cookie, every email arrival accounted for; the student can articulate every decision and which later unit will lean on it.

Estimated student time: 30 to 40 minutes.
