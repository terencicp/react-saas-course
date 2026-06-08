# Lesson 2 — Sign up creates the account

- **Sidebar title:** Sign up creates the account
- **Type:** Implementation

## Lesson framing

The student installs the auth spine of the whole app and proves it with a working sign-up. They wire the single `betterAuth` server instance, let the CLI generate the four-table schema instead of hand-writing it, mount the one catch-all handler, and ship a sign-up action that creates `user` + `account` rows and redirects to verification — issuing no session, because `requireEmailVerification: true` holds from the start. The senior payoff: a direct-consumption auth module (no wrapper layer), the `nextCookies()` bridge in place before any session lands, and an enumeration-safe sign-up that ships no "email taken" tell.

## Codebase state

**Entry.** The starter runs (Lesson 1): Postgres up, env filled, auth shells rendering but inert. `src/lib/auth.ts` is a stub (`SESSION_COOKIE_PREFIX = 'better-auth'`, `getCurrentUser` returns `null`, `requireUser` throws, `auth = {} as never`); `src/lib/auth-schema.config.ts`, `src/db/schema/auth.ts`, and the catch-all `route.ts` are empty stubs; `src/db/index.ts` does not spread `authSchema`; `src/env.ts` lacks `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`; `sign-up/actions.ts` returns `err('internal', 'Not implemented')`. Only `email_suppressions` exists in Postgres. Provided and untouched: `auth-client.ts`, `email.ts`, `suppressions.ts`, `auth/error-mapping.ts`, `result.ts`, `redirects.ts`, the form components and page shells.

**Exit.** The `auth` instance is configured (`requireEmailVerification: true`, `autoSignIn: false`, `minPasswordLength: 12`, `nextCookies()` last, session knobs set); `src/db/schema/auth.ts` holds the four CLI-generated tables, committed; the migration created `user`/`session`/`account`/`verification` in Postgres with indexes and FK cascades; `src/db/index.ts` spreads `authSchema`; the catch-all handler serves Better Auth endpoints; `getCurrentUser` / `requireUser` are written (unused until L5); `signUpAction` parses with `SignUpSchema`, calls `auth.api.signUpEmail`, and redirects to `/verify-email?email=…`. A fresh sign-up creates the two rows, no session, no cookie. The verification email is not yet wired (L3), so the inbox stays empty.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a visitor submits the sign-up form, the account is created, and they land on the "check your inbox" screen — no session, no cookie. Then a one-paragraph description of the finished behavior: a fresh email + 12-char password + name creates a `user` row (`emailVerified: false`) and an `account` row (`providerId: 'credential'`, scrypt hash), redirects to `/verify-email?email=…`, the `verification` table stays empty (token is a stateless JWT in the URL, not a row), and DevTools shows no session cookie. Note the email itself lands in L3. Optionally a single `Screenshot` of the sign-up form → "check your inbox" screen; a screenshot strip is not essential here since the win is mostly rows in Studio.

### Your mission

Prose-only brief (Checklist is the only list). No implementation hints, no code.

Open with the capability in project terms: this lesson stands up the auth spine and proves it end to end with a sign-up. Weave in the senior framing — Better Auth's API is consumed directly as the single server-side auth module (Principle #5, no wrapper), the CLI generates the schema rather than hand-writing it, one catch-all handler serves every endpoint (never per-action route files). Surface the decisions: `nextCookies()` is the bridge that lands the `Set-Cookie` on the action response — wire it now even though the silent failure it prevents only bites once a session is issued (L3); `requireEmailVerification: true` + `autoSignIn: false` mean sign-up creates the account but issues no session; honor carry-in defaults at the call site (`__Host-` prefix, `minPasswordLength: 12` as the 2026 senior default over the library's 8, `Secure` only in production because the browser refuses `Secure` on `http://localhost`). Name the enumeration constraint as a constraint: a taken email is deliberately not a handled error — under `autoSignIn: false`, `signUpEmail` returns generic success for a taken email, so shipping an "email already exists" branch would rebuild the enumeration oracle closed at the source (Ch053 L1). Out of scope (one line): the verification email and `emailVerification` block (L3), the sign-in surface (L4), the protected-route gate (L5). Note that `getCurrentUser()` / `requireUser()` are written now as part of the spine even though nothing calls them until L5.

Then the **Functional requirements** checklist (`Checklist` / `ChecklistItem`, `tested`/`untested` chips), each phrased as an observable outcome:

1. `[tested]` Submitting `/sign-up` with a fresh email, a 12-char password, and a name creates a `user` row whose `emailVerified` is `false`.
2. `[tested]` The same submission creates an `account` row with `providerId: 'credential'` and a scrypt hash in `password`; no `verification` row is written.
3. `[tested]` Submitting a password shorter than 12 chars or a malformed email re-renders the form with an inline validation message and creates no rows.
4. `[tested]` Submitting an email that already has an account follows the same generic success path as a fresh sign-up — no "email already exists" tell, no crash.
5. `[untested]` The submission issues no session and sets no cookie (no `session_token` after sign-up) and redirects to `/verify-email?email=…`.
6. `[untested]` Running the Better Auth CLI generates `src/db/schema/auth.ts` with `user`/`session`/`account`/`verification`, and the migration creates all four in Postgres with indexes and FK cascades.

(Rows 1–4 are observable behaviors a test can assert via Better Auth's API + a DB read; rows 5–6 are environment/devtools/CLI outcomes the student confirms by hand in *Moment of truth*.)

### Coding time

One line directing the student to implement against the brief and tests, then the reference walkthrough wrapped in `<details>` (writer collapses it). Organize as it appears in the repo, in build order:

1. **`src/env.ts`** — add `BETTER_AUTH_SECRET` (`z.string().min(32)`) and `BETTER_AUTH_URL` (`z.url()`) to both `server` and `runtimeEnv`. Rationale (one line): later modules read these through `env`, never `process.env`. Use `Code` (small diff).
2. **`src/lib/auth-schema.config.ts`** — the CLI-only generator: `betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), emailAndPassword: { enabled: true } })`. Rationale: it's a `'server-only'`-free mirror of `auth.ts` because the CLI can't load the `'server-only'` import. Use `Code`.
3. **`pnpm auth:generate`** — runs `auth generate --config src/lib/auth-schema.config.ts --output src/db/schema/auth.ts`. Rationale: committing the generated schema (schema as source of truth) beats generating at runtime in CI. Direct the student to read the generated file column by column and link back to Ch052 L2's walkthrough rather than re-explaining the four tables. Use `Steps` for the command + commit.
4. **`src/db/index.ts`** — `import * as authSchema from './schema/auth'` and spread it into the `drizzle()` schema alongside `emailSuppressions`. Rationale: relational queries must see the auth tables. Use `Code`.
5. **`pnpm db:generate --name add_auth_tables` + `pnpm db:migrate`** — then open Studio to confirm the four tables, indexes, FK cascades. Use `Steps`.
6. **`src/lib/auth.ts`** — the largest block; use `AnnotatedCode` to walk the parts in order: (a) `import 'server-only'` on the first line; (b) the environment-aware `SESSION_COOKIE_PREFIX` (`production ? '__Host-better-auth' : 'better-auth'`) declared once and exported — the proxy reads the same constant in L5; never restate as a literal (drift makes `getSessionCookie` silently miss the cookie); `__Host-` cannot set over `http://localhost`, so dev relaxes it; (c) the `betterAuth({...})` config — `drizzleAdapter(db, { provider: 'pg', schema: authSchema })`, `secret`/`baseURL` from `env`, `emailAndPassword: { enabled, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }`, the session block (30-day expiry, 1-day `updateAge`, 10-min `freshAge`, 5-min `cookieCache` — the Ch052 L3 values), `advanced.cookiePrefix` + `useSecureCookies` keyed on `NODE_ENV`, `plugins: [nextCookies()]` with `nextCookies()` called out as **last** in the array; (d) the read ladder — a React-`cache`d `getSession` wrapping `auth.api.getSession({ headers: await headers() })`, then `getCurrentUser()` returning `(await getSession())?.user ?? null` and `requireUser(next?)` redirecting to `/sign-in?next=…` when there's no user. Note `auth-client.ts` is already provided (`createAuthClient()`, bare for same-origin).
7. **`src/app/api/auth/[...all]/route.ts`** — `export const { POST, GET } = toNextJsHandler(auth);`. Rationale: the catch-all `[...all]` segment is mandatory; per-action route files break every endpoint the library exposes (Ch052 L1). Use `Code`.
8. **`src/app/(auth)/sign-up/actions.ts`** — `'use server'`; `SignUpSchema.safeParse(Object.fromEntries(formData))`; on parse failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; on success `try { await auth.api.signUpEmail({ body: { name, email, password } }); } catch (e) { return mapAuthError(e); }` then `redirect('/verify-email?email=' + encodeURIComponent(email))`. Call out the **absence** of a taken-email branch and why (generic success under `autoSignIn: false`, enumeration defense at the source — Ch053 L1); note the provided `SignUpForm` already wires `useActionState(signUpAction, null)` and renders `state.error.userMessage` + per-field `<FieldError>`, so no page edits. Use `AnnotatedCode` to direct attention to the parse seam, the `try/catch` + `mapAuthError`, and the post-success `redirect`.

Cover the untested requirements explicitly: the `'server-only'` first-line placement on `lib/auth.ts`; the one-line handler shape; the CLI-config / committed-schema split. Callout (`Aside`): under `requireEmailVerification: true` / `autoSignIn: false`, `signUpEmail` creates rows but issues no session and lands no cookie — the redirect to `/verify-email` is the win this lesson confirms. For the `Result` discriminant, `useActionState` wiring, and Zod-at-the-boundary, link to Ch043 rather than re-explaining.

No diagram needed — the request flow is a single linear path already drawn in the Lesson 1 architecture; prose carries it.

### Moment of truth

The test command and expected pass output, then a hand-confirm checklist for the untested rows.

- Command: `pnpm test:lesson 2`. Expected: all pass — covering account-creation rows, the validation rejection, and the enumeration-safe taken-email path (generic success, no conflict tell). Use `Code` for the command + a trimmed pass output.
- Hand-confirm `Checklist`:
  1. After a fresh sign-up, the browser lands on `/verify-email?email=…` and DevTools shows no `session_token` cookie.
  2. `pnpm auth:generate` produced `src/db/schema/auth.ts` with all four tables; Studio shows them with indexes and FK cascades; `verification` is present but empty after sign-up.
  3. The generated schema file is committed and `src/db/index.ts` spreads `authSchema`.
  4. `src/lib/auth.ts` starts with `'server-only'`.

## Scope

- The verification email template and the `emailVerification` config block (`sendVerificationEmail`, `autoSignInAfterVerification`, `expiresIn`) — Lesson 3.
- The sign-in action, opaque credential errors, and `?next=` open-redirect closure — Lesson 4.
- The two-layer request-time gate (`proxy.ts` cookie check + layout `requireUser()` read), the inverse gate, and sign-out — Lesson 5. (`getCurrentUser`/`requireUser` are written here but first exercised in L5.)
- Rate limiting on the auth endpoints — Chapter 074.
- The four-table schema's per-column teaching (what each table/column is for) — Ch052 L2; this lesson generates and reads, not re-derives.
