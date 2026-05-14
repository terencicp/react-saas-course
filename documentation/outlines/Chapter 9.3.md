# Chapter 9.3 — Sign-in flows

## Chapter framing

Chapter 9.2 stood up Better Auth's running setup. Chapter 9.3 turns it into the full sign-in surface: email+password with verification gating sign-in, password reset, magic links, TOTP and passkeys as the MFA tier, social OAuth, and account linking. The student leaves with every flow Better Auth ships and the senior judgment that picks which to enable per product.

Threads that run through every lesson. Each flow is configured through Better Auth's options (`emailAndPassword`, `emailVerification`, `socialProviders`) or its plugins (`passkey()`, `twoFactor()`, `magicLink()`) — never hand-rolled, because the library encodes the security defaults (Argon2id, constant-time compares, PKCE on every OAuth flow, `state` validation, token rotation on sign-in, hashed verification tokens) that hand-rolling reliably gets wrong. The send side of every email is the Resend pipeline from Unit 8 — `sendEmail` called from the library's `sendVerificationEmail` / `sendResetPassword` / `sendMagicLink` callbacks. User enumeration is the recurring threat: every error surface answers "did this email exist?" with the same shape. Rate limits sit on every credential endpoint (full Upstash wiring in Chapter 15.3, named at the call site here). The action-boundary discipline from Chapter 7.2 governs every form — Zod on input, `Result` discriminants on output (`'invalid-credentials'`, `'email-not-verified'`, `'too-many-attempts'`, `'requires-second-factor'`). The `verification` table from 9.2.2 is shared substrate for verify-email, reset, magic-link, and 2FA-setup tokens — one table, many `identifier` namespaces. The senior call on which flows to ship is conditional — passwords plus email verification plus Google OAuth is the year-1 default; TOTP/passkeys earn the call when the product handles money or admin surfaces; magic-link is the reach for "no passwords at all." Nine teaching lessons plus a quiz.

---

## Lesson 9.3.1 — Email and password sign-up

Topics to cover:

- **The senior question.** User submits name, email, password. What's the call shape, where does the hash land, what's the response when the email is taken, and how does enabling verification reshape the post-sign-up flow from "you're signed in" to "check your inbox"? Configure `emailAndPassword`, write the sign-up Server Action, land the unverified-account path that 9.3.3 closes.
- **Enabling the provider.** `emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }`. `requireEmailVerification` flips sign-up from "credential stored, session issued" to "credential stored, verification email queued, no session." `minPasswordLength: 12` is the 2026 senior floor (library ships at 8). `autoSignIn: false` paired with verification so the user doesn't see a session before the email arrives.
- **Argon2id by default.** Memory cost 64 MiB, time 3, parallelism 4, per-password salt. Hash lands in `account.password` (the column on `account`, not `user`, from 9.2.2). Override only for measured constraints.
- **The call.** Browser: `authClient.signUp.email({ email, password, name, callbackURL: '/dashboard' })`. `callbackURL` rides through the verification link. Returns `{ data, error }`; `error.code` carries `'INVALID_EMAIL'`, `'PASSWORD_TOO_SHORT'`, `'USER_ALREADY_EXISTS'`.
- **The Server Action wrapping.** Zod on input (Chapter 7.2.4), `auth.api.signUpEmail({ body, headers })` server-side, return the `Result` shape with `'ok'` / `'invalid-input'` / `'email-taken'` discriminants.
- **User-enumeration defense.** With `requireEmailVerification: true`, Better Auth returns the same success response for taken and new emails — both trigger `sendVerificationEmail`, neither sets a session. The structural defense. The form must not branch on `'email-taken'` and show different copy; that re-introduces the leak. (Friendlier "this email is already registered" UX is a deliberate enumeration-cost trade — name it, don't sleepwalk into it.)
- **The `additionalFields` extension hook.** Mandatory: email, password. Optional: `name`. Custom fields (`role`, `companyName`, `timezone`) land via `user.additionalFields` from 9.2.2 — typed on `signUpEmail`'s body and on `getSession`'s user. Senior reach: keep sign-up minimal, defer everything else to onboarding.
- **Password-strength UX.** Length is the floor, entropy the ceiling. Client-side strength meter (`zxcvbn-ts`) for feedback, never trusted server-side. HaveIBeenPwned range-check is the reach for elevated-risk products.
- **The unverified-state UI.** Success state is "check your inbox" — a page with a "resend" button (rate-limited; `authClient.sendVerificationEmail({ email })`). No session, no `/dashboard`.
- **Database state post-sign-up.** One `user` (`emailVerified: false`), one `account` (`providerId: 'credential'`, `password: <hash>`), one `verification` row keyed by email. 9.3.3 consumes the verification row; 9.3.2 reads `emailVerified`.
- **Rate limits — named, deferred.** Built-in plugin (in-memory dev, `secondaryStorage`-backed prod) sits on every public auth endpoint. Default per-IP on sign-up is conservative; tighten for production. Full wiring in Chapter 15.3.
- **Watch-outs.** `autoSignIn: true` with `requireEmailVerification: true` — broken state; surfacing `'email-taken'` distinctly — enumeration leak undone; trusting client-side strength server-side; missing email trim/lowercase — `Ada@acme.com` and `ada@acme.com` slip past the unique index; sending verification email through anything other than the Unit 8 pipeline — suppression list / DKIM / template anatomy live there; password floor below 8.

What this lesson does not cover:

- Verification token shape, click-handler, post-verify redirect (9.3.3).
- Sign-in itself, failed-attempt counter (9.3.2).
- Password reset (9.3.4), 2FA enrollment (9.3.6), OAuth sign-up (9.3.8).
- Full rate-limit wiring (Chapter 15.3), email template anatomy (Chapter 8.2).

Estimated student time: 40–50 minutes. Mechanics with one decision insert (enumeration trade); a sequence diagram for "submit → hash → row → verification queued → check-inbox view" earns its weight.

---

## Lesson 9.3.2 — Email and password sign-in

Topics to cover:

- **The senior question.** Verified user types email+password. What's the call, what's the response shape for each failure mode (wrong password, unverified, locked, 2FA required), how does the failed-attempt counter compose with the IP rate limit, and what does the "session issued" path look like? Write the action, land the `Result` discriminants, surface the lockout and MFA branches.
- **The call.** Browser: `authClient.signIn.email({ email, password, rememberMe, callbackURL })`. `rememberMe` (default true) toggles persistent vs. session-only cookie — exposes a checkbox on the form, defaults true. Server: `auth.api.signInEmail({ body, headers })`.
- **The library flow and the discriminant surface.** Library resolves the email, finds the `'credential'` account, verifies the hash in constant time, checks `emailVerified`, checks the failed-attempt counter, returns "requires second factor" if 2FA is enabled. Result discriminants:
  - `'invalid-credentials'` — wrong password *or* unknown email (same shape so enumeration stays closed).
  - `'email-not-verified'` — known account, correct password, `emailVerified: false`. Re-sends verification when `sendOnSignIn: true` (9.3.3); UI renders "check your inbox."
  - `'too-many-attempts'` — failed-attempt counter tripped; UI shows "try again in N minutes."
  - `'requires-second-factor'` — credential validated, 2FA enabled; carries a `factor-token` consumed by the 2FA prompt (9.3.6).
  - `'ok'` — session row inserted, fresh token issued, cookie attached via `nextCookies`.
- **The two defenses, both on by default.** Per-account counter: increments on failed sign-in, locks after N attempts (default 5, 15-minute cool-down, configurable), resets on success. Defends against IP rotation. Per-IP rate limit: caps requests per window on `/api/auth/sign-in/email` (default 10/minute, tighten for prod). Defends against credential stuffing from one IP. Leave both on; never disable the per-account counter for "convenience" — it's the only defense once an attacker has a valid email list.
- **The Server Action wrapping.** Same shape as sign-up — Zod (`email`, `password`, `rememberMe`), the call, the `Result` mapping. Form uses `useActionState` (Chapter 7.4.2) and surfaces per-discriminant copy.
- **Constant-time compare.** Library's Argon2 verify is constant-time. Senior reflex when reviewing custom code: never `if (hash === expected)` on bytes — short-circuit comparisons leak timing.
- **"Remember me" mechanics.** True → cookie `Max-Age` = `session.expiresIn`. False → session-only cookie, browser deletes on close. `session.expiresAt` row column is independent and always set; "remember me" controls only cookie persistence, not server-side lifetime.
- **Session rotation on sign-in.** Better Auth issues a fresh `session.token` on every successful sign-in — never reusing any pre-auth token. The fixation defense from 9.1.2 at the call site; no config required.
- **The unverified-email branch.** `'email-not-verified'` → replace form with "check your inbox" view. Library re-sends with `sendOnSignIn: true` (rate-limited so it can't be weaponized to spam an inbox).
- **Sign-out.** `authClient.signOut()` or `auth.api.signOut({ headers })`. Deletes session row, clears cookie, redirects to `/sign-in`. Always POST — a GET sign-out is a CSRF target.
- **Open-redirect rule.** Validate `?next=` against an allowlist (paths starting with `/`, not `//attacker.com`, not absolute URLs). Library validates internally for its redirects; the rule applies to surrounding form code.
- **Watch-outs.** Distinct messages for "wrong password" vs "no such email" — enumeration; GET sign-out — CSRF; rendering "you're signed in!" without redirecting — cookie may not be readable until next navigation; logging the password anywhere — headline bug; treating `'requires-second-factor'` as an error — it's a continuation state; disabling lockout because "users complain" — the right answer is clear copy plus a reset link.

What this lesson does not cover:

- Full rate-limit wiring (Chapter 15.3).
- Verification flow (9.3.3), password reset (9.3.4).
- TOTP enrollment and challenge UI (9.3.6).
- OAuth sign-in (9.3.8), active-sessions list (9.4.3).
- 401-versus-403 wire shapes (7.5.3, 9.4.4).

Estimated student time: 35–45 minutes. Mechanics + pattern hybrid; the `Result` catalog is the teaching weight, a sequence diagram for "submit → verify → check verified → check 2FA → session → redirect" earns its weight.

---

## Lesson 9.3.3 — Email verification

Topics to cover:

- **The senior question.** Sign-up queued an email; sign-in refuses unverified accounts. What's the token shape, how does the click-through endpoint verify it, what's the rotation/expiry policy, and how does enumeration discipline survive the verification surface? Configure `emailVerification`, wire the React Email template through Unit 8, land the verify endpoint that flips `emailVerified`.
- **The config.** `sendVerificationEmail: async ({ user, url }) => sendEmail({ to: user.email, subject: 'Verify your email', react: VerifyEmailTemplate({ url }) })`. `sendOnSignIn: true` re-sends automatically when an unverified user signs in. `autoSignInAfterVerification: true` issues a session at the verify-click endpoint so the user lands signed-in. `expiresIn: 60 * 60` — 1 hour default, the senior call (long enough to find the email, short enough that a leak is mostly harmless).
- **What's in the `verification` table.** One row per pending verification — `identifier` = email, `value` = token hash (raw token never stored), `expiresAt` = now + `expiresIn`. Row deletes on success; expired rows cleaned by query-time filter or a periodic job.
- **The link shape.** `https://app.example.com/api/auth/verify-email?token=<token>&callbackURL=<dest>`. The catch-all from 9.2.1 routes it; library hashes the token, looks up the row, checks expiry, flips `emailVerified`, deletes the verification row, and (with `autoSignInAfterVerification`) issues a session and redirects to `callbackURL`.
- **The React Email template.** Lives in `emails/verify-email.tsx`. One CTA button (`<Button href={url}>Verify email</Button>`), a fallback plain-text URL, an expiry note, the from-address discipline from Chapter 8.1. No marketing, no cross-sells — one job.
- **Token security.** CSPRNG-generated, 32 random bytes, base64url-encoded (256 bits). Raw token in the email; `SHA-256(token)` in the DB. Verify endpoint hashes the incoming token and compares in constant time. Two properties: brute-force enumeration is intractable; a database snapshot doesn't yield working tokens.
- **Re-send semantics.** Two paths: user clicks "resend" (`authClient.sendVerificationEmail({ email })`), or sign-in re-sends with `sendOnSignIn: true`. Each re-send invalidates the previous token — only the most recent link works. Re-send is rate-limited (e.g., one per 60 seconds per email) so the button can't flood an inbox.
- **Enumeration discipline at every entry point.** Sign-up, resend, and verify-token all return the same response regardless of email existence. Verify-token returns the same "invalid or expired link" copy for "never existed" / "expired" / "already used."
- **The downstream gate.** Once flipped, sign-in lets the user through, the proxy.ts gate from 9.2.4 lets them past `/dashboard`, and Chapter 9.4.1's pattern reads the flag for billing-tier gating. `emailVerified` is the *floor* for capability, not the ceiling — every per-action authz still applies (Unit 10).
- **Post-verify redirect.** `callbackURL` from sign-up rides through the link; library validates against `trustedOrigins` / known paths. Open-redirect rule applies to any custom redirect code.
- **Email-change verification — same flow, different namespace.** When the user changes email from account settings (9.4.2), the same table holds the new-email token with `identifier` namespaced to the user ID. Reuses the same primitives.
- **Watch-outs.** Sending through anything other than the Unit 8 pipeline; storing the raw token; distinct copy for "invalid" vs "expired" — enumeration; letting expired rows accumulate without cleanup; reflecting `callbackURL` without allowlisting; surfacing the token in analytics / Sentry breadcrumbs.

What this lesson does not cover:

- Password reset (9.3.4), magic-link (9.3.5), email-change at settings (9.4.2).
- React Email template anatomy (8.2), send pipeline (8.3).
- Rate-limit windows (Chapter 15.3).

Estimated student time: 35–45 minutes. Setup + pattern hybrid; a sequence diagram for "click sign-up → row → email → user clicks → token verified → flag flipped → session" earns its weight.

---

## Lesson 9.3.4 — Password reset

Topics to cover:

- **The senior question.** User forgets password. Six-step flow, each with a failure mode that bites in production. Configure the surface, wire the email send, land the reset endpoint, name the security properties (enumeration closure, short expiry, session invalidation on success) that distinguish a secure reset from "send a link to anyone who asks."
- **The config.** On `emailAndPassword`: `sendResetPassword: async ({ user, url }) => sendEmail({ ... })` and `resetPasswordTokenExpiresIn: 10 * 60` — 10 minutes, shorter than verification because reset is a higher-stakes capability.
- **The six-step flow.**
  1. **Request on `/forgot-password`.** Action calls `auth.api.requestPasswordReset({ body: { email, redirectTo }, headers })`. Library generates a CSPRNG token, hashes into a `verification` row with `identifier` namespaced `reset-password:<userId>`, invokes `sendResetPassword`.
  2. **Response is identical regardless of whether the email exists.** Form renders "if an account exists, we sent a link." No "email not found" surface.
  3. **User receives email, clicks the link** → `https://app.example.com/reset-password?token=<token>`. Page is a Client Component with new-password + confirm fields.
  4. **Submit new password.** Action calls `auth.api.resetPassword({ body: { token, newPassword }, headers })`. Library hashes token, looks up row, checks expiry, validates `minPasswordLength`, hashes new password with Argon2id, updates `account.password`, deletes verification row.
  5. **Library invalidates every existing session for the user.** `DELETE FROM session WHERE userId = ?`. The senior call: reset means "previous credential may be compromised" — every cookie out there must die. User is signed in fresh post-reset (one new session) or redirected to `/sign-in` for high-stakes products.
  6. **User lands on dashboard with a one-time success message.**
- **Token-on-URL discipline.** Visible in history, referer, logs. Mitigations: short expiry, one-time use (row deletes on success), `Referrer-Policy: same-origin` (9.4.4 default), don't log full URLs. Some products move the token to the URL fragment for extra defense; default is fine.
- **The "session invalidation on reset" property — the load-bearing trade.** Reset's purpose is "the old credential might be in attacker hands." If sessions stayed alive, the attacker keeps acting after the legitimate user resets. Non-negotiable. Same discipline applies to password *change* from settings (9.4.2 — every session except the current one is revoked).
- **The React Email template.** Same patterns as verify-email — one CTA, expiry note, and a "if you didn't request this, ignore it" line (matters because users need to know inaction is safe).
- **Rate limits.** Per-IP stops harvesting reset emails for many users; per-email stops weaponized inbox flooding. Library defaults sensible; tighten for prod. Full wiring in 15.3.
- **2FA composition.** If 2FA is enabled, reset alone doesn't bypass it — sign-in after reset still requires the second factor. The reason 2FA matters: a leaked password (plus a network attacker who controls the email forwarder) still doesn't yield access. If the second factor is also lost, recovery codes from 9.3.6 are the path; absent that, support-driven identity verification (out of scope for the library).
- **Watch-outs.** Distinct messages for "email not found" vs "sent" — enumeration; failing to invalidate sessions — entire point undone; sharing the `verification.identifier` namespace between verify-email and reset without separation; letting the link survive past 10 minutes; reflecting `?next=` without allowlisting; emailing the new password back to the user (still ships in legacy systems); allowing new password to equal old (the senior call is whether to add friction).

What this lesson does not cover:

- Verify-email flow (9.3.3), change-password from settings (9.4.2).
- Recovery codes (9.3.6), send pipeline (8.3).
- Rate-limit windows (15.3).

Estimated student time: 35–45 minutes. Pattern + mechanics hybrid; a sequence diagram for the full flow plus the session-invalidation move earns its weight.

---

## Lesson 9.3.5 — Magic link sign-in

Topics to cover:

- **The senior question.** Type email, click link, signed in. No password. When does the pattern earn the call over email+password, what's the `magicLink()` plugin surface, and how does it compose with (or replace) email+password in the same app?
- **The threshold.** Magic-link wins when: infrequent sign-in (the user shows up monthly — Slack-style; password reuse is the dominant risk); the user base is non-technical and reset volume swamps support; the product already centers email (Substack, mailing-list tools). Magic-link loses when: sign-in is frequent (inbox round-trip is friction every time); deliverability is shaky (corporate Outlook with aggressive filtering); hard MFA is required (TOTP/passkeys compose less cleanly without a password). Year-1 SaaS default: email+password + optional 2FA; magic-link is a deliberate product call.
- **The plugin.** `magicLink({ sendMagicLink: async ({ email, url }) => sendEmail({ ... }), expiresIn: 5 * 60, disableSignUp: false })`. Three knobs: the send callback; expiry (5 min default — shorter than verification because magic-link is a sign-in credential, not a flag-flip); `disableSignUp` (false = first-time magic-link auto-creates the user; true = only existing users).
- **The four-step flow.**
  1. **Submit email.** `authClient.signIn.magicLink({ email, callbackURL })`. Library generates token, hashes into `verification` row (`identifier: magic-link:<email>`), invokes `sendMagicLink`.
  2. **Form renders "check your inbox."** Same enumeration discipline as elsewhere.
  3. **User clicks link** → `/api/auth/magic-link/verify?token=<token>&callbackURL=...`. Library hashes, finds row, checks expiry, finds/creates user, issues session.
  4. **User lands on `/dashboard`.** No password prompt — the click is the credential.
- **Single-use and rotation.** Each token one-use, row deletes on success. Re-send invalidates the previous — only the latest link works.
- **The "different-browser" problem.** Email on phone, sign in on laptop. The 2026 Better Auth default is browser-agnostic — the token authenticates whoever holds it. Right default for usability; cost is that a leaked/forwarded token yields access. Short expiry is the mitigation. Same-browser binding exists as an opt-in for high-stakes products (compares fingerprints), with the trade being phone-to-laptop friction.
- **Magic-link plus password — coexistence.** Both can be enabled. Form offers email+password, with "send me a link instead" as the alternate. Schema-level: `'credential'` account row holds password; magic-link flow doesn't touch it; either path issues the same session shape. Communicate the choice clearly — two competing inputs confuse users.
- **First-time-magic-link sign-up.** With `disableSignUp: false`, the click that hits a non-existent email creates the user with `emailVerified: true` — the deliverability check *is* the verification. Faster than password sign-up: one round-trip instead of two.
- **2FA composition.** Magic-link proves email-control (one factor). Accounts with TOTP/passkey 2FA still prompt for the second factor after the click. Magic-link replaces the password factor with an inbox-control factor; doesn't skip MFA.
- **Deliverability concern.** Sign-in is hostage to inbox delivery. UX reach: surface "check spam, then resend" prominently; rate-limit resend per-email (one per 30 sec); offer email+password as fallback; surface support paths.
- **Watch-outs.** Defaulting to magic-link for daily-use SaaS — users hate the friction; failing to rate-limit send — inbox-flood attack; distinct copy for "email exists" vs "doesn't" with `disableSignUp: true` — enumeration; storing the raw token; expiry over 5 minutes (sign-in credential is higher-stakes than flag-flip); logging the magic-link URL; making it the only sign-in method with no recovery when delivery breaks.

What this lesson does not cover:

- `verification` table mechanics (9.3.3), send pipeline (8.3).
- Email-OTP variant (named once — `emailOTP()` is the sibling plugin: 6-digit code typed into the form instead of a URL clicked; same primitives, different UX).
- 2FA composition surface (9.3.6).
- Rate-limit windows (15.3).

Estimated student time: 30–40 minutes. Decision + mechanics; a comparison table for "password vs magic-link vs both" and a sequence diagram for the four-step flow earn their weight.

---

## Lesson 9.3.6 — TOTP two-factor authentication

Topics to cover:

- **The senior question.** Email+password is one factor (knowledge). For admin / billing / money-handling surfaces, the baseline-add is a possession factor. TOTP (RFC 6238) is the universal standard. What's enrollment, how does the sign-in challenge compose with email+password, what are recovery codes, and what's the trade with passkeys (9.3.7)? Install `twoFactor()`, land enrollment, surface the `'requires-second-factor'` branch, write recovery.
- **TOTP mechanism.** 160-bit shared secret (base32-encoded, QR-displayed at enrollment). Authenticator app and server independently compute `HMAC-SHA1(secret, floor(now / 30))[truncated to 6 digits]`. Codes valid for current 30-second window plus +/-1 tolerance (90 sec total) for clock skew. TOTP is possession-only-while-secret-is-secret — phishing-resistance is the line passkeys cross.
- **The plugin.** `twoFactor({ issuer: 'Acme', otpOptions: { period: 30, digits: 6, algorithm: 'SHA1' } })`. `issuer` appears in the authenticator app's account list. Defaults match RFC 6238; don't change unless integrating with a specific authenticator. Plugin generates a `twoFactor` schema table (regenerate with `@better-auth/cli generate`).
- **The schema.** `twoFactor` table — one row per user with `secret` (base32), `backupCodes` (hashed individually), `enabled`. Secret is sensitive but less critical than a password (grants the *second* factor only); production-grade products encrypt at rest with a KMS key.
- **Six-step enrollment.**
  1. User goes to `/settings/security/2fa` and clicks "Enable."
  2. Action calls `authClient.twoFactor.enable({ password })` — the elevation check (current password or fresh session via `freshAge` from 9.2.3).
  3. Response carries secret (base32) and QR-code URI (`otpauth://totp/Acme:ada@acme.com?secret=...&issuer=Acme`). Client renders QR + base32 fallback.
  4. User scans with authenticator app; app starts generating codes.
  5. User types first code; form calls `authClient.twoFactor.verifyTotp({ code })`. Match → flip `enabled: true`, generate 10 single-use recovery codes.
  6. Response includes recovery codes (one-time). UI renders printable/downloadable view with "save these now, you can't see them again" copy. Codes stored hashed; user sees them once.
- **The sign-in challenge.** From 9.3.2: when 2FA is enabled, `signIn.email` returns `'requires-second-factor'` with a `factor-token` (short-lived signed token representing the validated first factor). Form transitions to TOTP prompt; user types 6-digit code; `authClient.twoFactor.verifyTotp({ code, factorToken })`. Success → session; failure → per-`factor-token` attempt counter (prevents brute-force).
- **Recovery codes — the "lost-phone" flow.** Sign-in form's "lost your authenticator?" link surfaces the path. User types one of the 10 codes; `authClient.twoFactor.verifyBackupCode({ code, factorToken })`. Success → code marked used (hashed lookup, atomic update), session issued. User is prompted to re-enroll TOTP or temporarily disable 2FA. Surfacing recovery codes at enrollment is non-negotiable.
- **Disable.** `authClient.twoFactor.disable({ password })`. Same elevation requirement as enable. Every 2FA-toggle is elevated; a stale session shouldn't remove the security tier.
- **TOTP-versus-passkey trade.** TOTP is universal (every app, every OS). Passkeys are phishing-resistant but less universal (need passkey-capable device). The 2026 call: enable both, let the user pick — TOTP as default, passkeys as senior-grade.
- **Step-up for sensitive actions.** Some actions require a fresh 2FA challenge regardless of session age — exporting data, billing, ownership transfer. Library surfaces `auth.api.requireTwoFactor(...)`; full coverage in Unit 10.
- **Watch-outs.** Not surfacing recovery codes at enrollment; allowing disable without elevation; logging the secret or codes; rejecting valid codes from server clock skew (default tolerates +/-30 sec); not rate-limiting the verify endpoint (6 digits = 10^6 brute-force space); persisting `factor-token` past expiry; defaulting to SMS — SIM-swap and SS7 make SMS the weakest common factor; no recovery path beyond codes.

What this lesson does not cover:

- Passkeys (9.3.7), SMS (not covered — TOTP/passkeys are the senior baseline).
- Full elevation-tier UI and credential changes (9.4.2).
- Step-up middleware pattern (10.2), rate-limit windows (15.3).

Estimated student time: 45–55 minutes. Setup + mechanics hybrid; sequence diagrams for enrollment and for "sign-in → first factor → factor-token → second factor → session" earn their weight.

---

## Lesson 9.3.7 — Passkeys and WebAuthn

Topics to cover:

- **The senior question.** Passwords get phished/leaked/reused; TOTP gets phished too (proxied attacker site). Passkeys close phishing by making the credential cryptographic and origin-bound: public key registered with the server, private key on the device protected by biometrics/PIN, signed challenges that only succeed when the request comes from the registered origin. Install `passkey()`, land registration and assertion, name the synced-versus-device-bound trade.
- **WebAuthn — three roles, two ceremonies.** Roles: *relying party* (SaaS), *user agent* (browser), *authenticator* (secure enclave — TPM, Secure Enclave, TitanM, YubiKey). Ceremonies: *registration* (create keypair, register public key) and *authentication* (sign server challenge with private key). Both via `navigator.credentials.create` / `.get`. Library wraps both.
- **The plugin.** `passkey({ rpName: 'Acme', rpID: 'app.example.com', origin: 'https://app.example.com', advanced: { discoverableCredentials: 'preferred' } })`. `rpID` must match the actual domain (`app.example.com` means passkeys work at that exact subdomain, not `example.com` or `marketing.example.com`). `discoverableCredentials: 'preferred'` enables the modern UX (browser shows available passkeys when email field is focused, no email-first round-trip).
- **The schema.** `passkey` table — one row per credential with `userId`, `credentialID`, `publicKey`, `counter` (monotonic; detects cloned authenticators), `deviceType` (`'singleDevice' | 'multiDevice'` — device-bound vs synced), `transports`, `name` (user label like "iPhone" or "Work laptop"). One user, many passkeys.
- **Registration.**
  1. User goes to `/settings/security/passkeys`, clicks "Add."
  2. `authClient.passkey.addPasskey({ name: 'iPhone' })`. Browser prompts (Face ID, Touch ID, Windows Hello, PIN, YubiKey). User authenticates locally; device generates keypair, stores private key in secure enclave (or in iCloud Keychain / Google Password Manager for synced passkeys), returns public key.
  3. Browser sends public key + attestation + metadata. Library verifies attestation, checks origin against `rpID`, stores row.
  4. UI shows the new credential with its name, device type, and a "remove" button.
- **Authentication.**
  1. User clicks "Sign in with a passkey" (or autofill prompt with `mediation: 'conditional'`).
  2. `authClient.signIn.passkey()`. Library issues a time-bound signed challenge. Browser presents it to the authenticator. User authenticates locally; device signs with private key. Signature + credential ID + counter return to browser.
  3. Browser sends to server. Library looks up row by credential ID, verifies signature against stored public key, checks counter is greater than last-seen (cloned-authenticator detection), checks origin against `rpID`, issues session.
  4. User signed in — no password, no second factor. Passkey collapses possession (device) + biometric (local unlock) into one cryptographic proof.
- **Synced versus device-bound — the trade.** Synced (iCloud Keychain, Google Password Manager, 1Password): private key replicates across user's devices via cloud sync, encrypted end-to-end. User signs in on a new device without re-registering. Trade: cloud account compromise → passkey follows. Device-bound (YubiKey, Windows Hello credential): private key never leaves the device; losing the device loses the credential. Trade: hard recovery on device loss vs harder compromise on account loss. Senior call: synced is the right consumer default; device-bound is the enterprise reach.
- **Conditional UI and discoverable credentials.** With `discoverableCredentials: 'preferred'`, browser stores the credential as discoverable. Sign-in form's email field renders with `autocomplete="webauthn"`; browser shows available passkeys on focus. One tap, no typing. The 2026 sign-in UX — enable by default.
- **Passkeys as second factor.** A user with email+password plus a passkey can use either path. With 2FA enforced, email+password sign-in still requires the second factor; the passkey can satisfy the possession requirement. Library composes naturally; product-level call: passkeys as primary sign-in OR passkeys as second factor. 2026 default: passkeys as primary for users who set them up; second factor only for sensitive actions (step-up).
- **Recovery path.** A user with one synced passkey and a lost iCloud account has lost the credential. Recovery codes from 9.3.6 serve as the universal fallback. Every passkey enrollment also surfaces recovery codes; no-recovery is an explicit opt-in.
- **Watch-outs.** `rpID` as `example.com` when app is at `app.example.com` — registrations succeed, assertions silently fail; not verifying origin and counter (library does, but custom code reviews); treating passkey as the only credential without recovery codes; not handling `NotAllowedError` / user-cancelled; skipping attestation (library defaults to verify, review any `attestation: 'none'`); building UI that assumes one passkey per user (many users legitimately have iPhone + laptop + YubiKey); defaulting to `discoverableCredentials: 'discouraged'` and missing autofill; not surfacing "last used on X" in management UI — users accumulate stale passkeys.

What this lesson does not cover:

- TOTP (9.3.6), step-up surface (10.2).
- Full WebAuthn spec depth — MDN for specific quirks; library handles the ceremony.
- FIDO metadata-service attestation (compliance-only, out of scope).
- Rate-limit windows (15.3).

Estimated student time: 45–55 minutes. Setup + concept hybrid; WebAuthn mental model is half, plugin wiring is the other; sequence diagrams for both ceremonies earn their weight.

---

## Lesson 9.3.8 — OAuth providers

Topics to cover:

- **The senior question.** 9.1.3 installed the OAuth 2.1 + PKCE model. Practical: a "Sign in with Google" button. What's the config, what's the redirect URI to register, where does the callback live (catch-all from 9.2.1), what's in the `account` table post-callback, what's the difference between sign-in-with-existing and first-time-OAuth-sign-up, and what are the per-provider quirks? Configure Google as the canonical, name the others, surface the post-callback hooks.
- **The config.** `socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }`. `redirectURI` defaults to `<baseURL>/api/auth/callback/google` (what the catch-all serves) — leave undefined unless routing auth through a non-default path. Stack providers: `{ google: {...}, github: {...}, apple: {...} }`.
- **Env entries.** Per provider, per environment, `<PROVIDER>_CLIENT_ID` and `<PROVIDER>_CLIENT_SECRET` added to `lib/env.ts` Zod schema (5.6.1). Separate dev/staging/production credentials at the provider's console (a leaked staging secret stays out of production). Register all environments' redirect URIs explicitly at the provider — no wildcards (OAuth 2.1 exact-match rule from 9.1.3).
- **Provider console setup — Google as canonical.**
  1. Create project in Google Cloud Console.
  2. Configure OAuth consent screen (publishing status, support email, scopes — `openid email profile` for sign-in; sensitive scopes need app review).
  3. Create OAuth client credentials (type: web).
  4. Register authorized redirect URIs (`http://localhost:3000/api/auth/callback/google` for dev, plus staging and prod).
  5. Copy `client_id` / `client_secret` into the env.
  6. Test — redirect, consent, callback, session.
- **The browser call.** `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`. Triggers redirect; the rest is library-handled. Catch-all route receives `?code=...&state=...`, exchanges code for tokens (with PKCE), reads `userinfo`, finds/creates `user` + `account`, issues session, redirects to `callbackURL`.
- **Account-table population.** Successful Google sign-in: `account` row with `providerId: 'google'`, `accountId: <google id>`, `accessToken`/`refreshToken`/`idToken` populated, `expiresAt`, `scope: 'openid email profile'`. `user.email` filled from Google profile, `name` from `name`, `image` from `picture`. `emailVerified` set true *if* Google reports `email_verified: true` (most consumer accounts). For Workspace where `email_verified` may be false or absent, senior call: trust the provider or run own verification on top.
- **First-time-OAuth vs existing — lookup logic.** Library callback first looks up by `(providerId, accountId)` — does an account row already link this Google identity to a user? If yes, sign in. If no, look up by email — does a user with this email already exist? If yes and `accountLinking.enabled` is true (9.3.9), link the new provider. If no, create new user + account. The lookup order matters; the linking config decides whether two paths to the same email become one account or two.
- **Scopes — least privilege.** Pure sign-in: `openid email profile`. Adding scopes (`calendar.readonly`, `drive.file`) puts them on the consent screen for *every* user at sign-in. Per-scope-per-feature: sign-in asks for basics; the Calendar feature does its own flow with `linkSocial` and adds the scope at the moment the user opts in.
- **Per-provider quirks.**
  - **Google.** Consent screen publishing (dev = unverified, only test users; published = anyone, but sensitive scopes need review). `prompt: 'select_account'` forces the account picker on every sign-in.
  - **GitHub.** Default `user` scope returns public profile only — email may be null if private. Reach for `user:email` to get the email list with primary + verified flags; pick the primary verified or ask the user. Never assume `user.email` is non-null on a fresh GitHub sign-up.
  - **Apple.** Returns email only on *first* sign-in; subsequent sign-ins return only `sub` and require the app to remember the original email. Library stores at first sign-in; trust that storage subsequently. Apple uses `form_post` response mode (callback is POST, not GET) — catch-all handles transparently.
  - **Microsoft.** `tenant` parameter selects personal (`consumers`), organizational (`organizations`), or both (`common`). B2B SaaS picks `organizations`; consumer picks `common`.
- **The OAuth-only account.** A user who signed up via Google has no `'credential'` row. Trying email+password returns "no such account" (with enumeration discipline). UX has to surface this — "this email signs in with Google" — which the library doesn't do automatically; senior reach: handle `'invalid-credentials'` by checking whether the email has any `'credential'` account row and surfacing a "sign in with Google instead" branch when not. Costs a query; pays for itself in support tickets.
- **Token persistence.** For pure sign-in: tokens land at sign-in, never read again — app trusts its own session cookie. For products that call the provider's API later: tokens read on demand, refreshed via `refreshToken` when expired. Keep tokens only when actually used.
- **Callback hooks.** `socialProviders.<provider>.mapProfileToUser` remaps fields before user creation (split `name` into `firstName`/`lastName`). `onSuccess` fires after sign-in — useful for welcome emails, analytics. Keep hooks small and side-effecting only; row inserts and session issuance happen before the hook fires.
- **Watch-outs.** Trailing-slash mismatch on redirect URI across environments — exact-match means one silently fails; sharing a client between staging and production; failing to refresh consent on scope additions; skipping `email_verified` check; not handling GitHub-private-email (sign-up with `email: null` breaks everything downstream); allowing same provider account to sign in as two users (linking misconfig); logging `idToken` / `accessToken`; not surfacing "this email signs in with Google" on email+password mistypes against OAuth-only accounts.

What this lesson does not cover:

- Account linking (9.3.9), generic OAuth for non-built-in providers (the `genericOAuth()` plugin — named once, configured the same way with provider-specific URLs).
- Server-side OAuth for provider-API access — library doesn't own this; SaaS calls APIs with stored tokens directly.
- OAuth code-for-tokens / PKCE mechanics (9.1.3).

Estimated student time: 45–55 minutes. Setup + reference hybrid; Google walkthrough is the spine, per-provider quirks the reference; a sequence diagram for "click Google → redirect → consent → callback → lookup → session" earns its weight.

---

## Lesson 9.3.9 — Account linking

Topics to cover:

- **The senior question.** Ada signs up with email+password in January. In March she clicks "Sign in with Google" with the same email. Does the system create a second user (data lives in two places) or recognize the email match and link Google to her existing user row? The decision lives in `account.accountLinking`. Install it, surface the trusted-providers list, walk through link-on-sign-in vs link-from-settings, name the security trade.
- **Schema, revisited.** One `user`, many `account` rows. Each row carries `(providerId, accountId)`. Pre-linking: one user, one account (`'credential'`). Post-linking: one user, two accounts (`'credential'` + `'google'`). Sign-in via either path → same user. Schema does the work; the question is when the second row gets inserted.
- **The config.** `account: { accountLinking: { enabled: true, trustedProviders: ['google', 'github'], allowDifferentEmails: false } }`. Three knobs:
  - `enabled` — without it, OAuth sign-in to an email with an existing user fails with `account-not-linked`. With it, library tries linking.
  - `trustedProviders` — providers whose `email_verified` claim the library trusts. Google and GitHub qualify in 2026; Twitter/X doesn't (no `email_verified`). Only providers with strong verified-email signals go on the list.
  - `allowDifferentEmails` — true → user can link a provider with a different email (Ada signs up `ada@personal.com`, later links Google `ada@acme.com`). False (senior default) → linking only works on email match.
- **Link-on-sign-in — the implicit path.** Ada has `'credential'` with `ada@acme.com`. Clicks "Sign in with Google" with the same email. Callback resolves to her existing user (email match), checks Google is trusted, checks Google reported `email_verified: true`, inserts new `account` row with `providerId: 'google'`, signs her in. Surface a one-time "we linked your Google account" toast — users get surprised otherwise.
- **Link-from-settings — the explicit path.** Ada signed in. Goes to `/settings/security/accounts`, clicks "Connect Google." Action calls `authClient.linkSocial({ provider: 'google', callbackURL: '/settings/security/accounts' })`. Browser redirects to consent (same OAuth flow as sign-in), callback runs, new `account` row inserts, user lands on settings page with the provider listed. Senior-preferred path for the first link (explicit consent); link-on-sign-in is the convenience layer for forgivable email matches.
- **Unlink.** Same settings page surfaces "Disconnect Google." `authClient.unlinkAccount({ providerId: 'google' })` deletes the `account` row. Senior reach: refuse the unlink if it would leave the user with no sign-in method — surface "you can't unlink your only sign-in method — set up a password first."
- **The security trade.** Linking is a trust transfer — "whoever controls this Google identity is the same person who knows this password." If `email_verified` is wrong (provider bug, Workspace edge), an attacker who controls a Google account with `ada@acme.com` (via domain takeover) can sign in as Ada without her password. Mitigations:
  - `trustedProviders` allowlist.
  - Require fresh authentication before link-from-settings (`freshAge` from 9.2.3).
  - Send a "we linked a new provider" notification email.
  - Audit-log the linking event (Chapter 10.2).
- **`allowDifferentEmails: true` — when it earns the call.** Deliberate reach for products where the user explicitly wants to use, e.g., a personal Google to sign into a work email's account. Trade: can't depend on email match (the implicit-trust signal), so requires explicit link-from-settings while signed in. Leave default false; flip when the product specifically needs the multi-email pattern.
- **Primary-identifier question.** User with `'credential'` (`ada@acme.com`) + Google (`ada@acme.com`) + GitHub (`a.lovelace@gmail.com`, after `allowDifferentEmails`) has three email addresses across accounts. `user.email` holds one canonical address (original by default); others live on `account` rows. Canonical email is what the app sends mail to, shows in the profile, uses for audit-log identity. Switching the canonical is a separate flow (9.4.2), not implicit in linking.
- **Account recovery as a resilience benefit.** A user with two linked providers can recover from losing one (lost password → sign in with Google → reset password). Surface "you have N sign-in methods, here they are" in settings.
- **Watch-outs.** Enabling linking without setting `trustedProviders` — every provider becomes trusted; allowing unlink that leaves no sign-in method; not surfacing linking in audit logs; `allowDifferentEmails: true` without requiring explicit link-from-settings — implicit linking with a different email is the dangerous combination; treating canonical-email change and account-linking as the same surface (they share schema but have different threat models); failing to send a "new sign-in method" notification email; logging `accountId` as if sensitive (provider's user ID isn't a secret).

What this lesson does not cover:

- OAuth flow mechanics (9.1.3), per-provider config and quirks (9.3.8).
- Change-email at account settings (9.4.2), active-sessions / revocation (9.4.3).
- Audit-log table (10.2).

Estimated student time: 30–40 minutes. Decision-archetype; the trusted-providers / different-emails trades are the teaching weight; a comparison table for "link-on-sign-in vs link-from-settings" and a decision tree for "when to enable / flip the knobs" earn their weight.

---

## Lesson 9.3.10 — Chapter quiz

Top 10 topics to quiz:

- Configuring email+password — `requireEmailVerification` vs `autoSignIn`, `minPasswordLength` floor, why `nextCookies` from 9.2 is non-negotiable, where the password hash lives (`account.password`, not `user`).
- User-enumeration discipline at sign-up, sign-in, password-reset, verification — same response shape regardless of email existence; why "email already registered" undoes the defense.
- Sign-in `Result` discriminants — `'invalid-credentials'`, `'email-not-verified'`, `'too-many-attempts'`, `'requires-second-factor'`, `'ok'` — and the per-account counter vs per-IP rate-limit composition.
- Email-verification flow — token shape, `verification`-table row, hashed at rest, one-time use, `sendOnSignIn` re-send, `autoSignInAfterVerification` shortcut.
- Password-reset flow — six steps end to end, 10-minute expiry default, session-invalidation-on-success property, why the token-in-URL is acceptable when paired with short expiry plus one-time use.
- Magic-link sign-in — when it earns the call over passwords, `disableSignUp` knob, single-use + short-expiry discipline, deliverability fragility as the dominant risk.
- TOTP enrollment and recovery codes — QR-code shape, elevation check on enable/disable, +/-1 window tolerance, why surfacing recovery codes at enrollment is non-negotiable.
- Passkeys — `rpID` / `origin` config scoping, registration ceremony, assertion ceremony, synced-vs-device-bound trade, conditional-UI / discoverable-credentials UX.
- OAuth providers — redirect URI exact-match rule, per-provider env entries, callback lookup logic (`providerId`+`accountId` first, then email if linking enabled), per-provider quirks (Google consent, GitHub private email, Apple first-sign-in-only, Microsoft `tenant`).
- Account linking — `trustedProviders` as a security decision, link-on-sign-in vs link-from-settings, `allowDifferentEmails` and when to flip, the unlock-when-only-sign-in-method failure mode.
