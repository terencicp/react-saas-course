# Lesson 057.4 — Password reset

## Lesson framing

**Senior question this lesson answers.** A user forgets their password. What's the secure shape of the "send me a link" flow, and what distinguishes a reset that *fixes* a potentially compromised account from a reset that hands attackers the keys? The answer is six steps with three load-bearing properties: enumeration closure on the request, short expiry on the token, and session invalidation on success — the last of which Better Auth makes opt-in (`revokeSessionsOnPasswordReset: true`), and the senior reflex is to always flip it on.

**Mental model the student leaves with.** Reset is verification's high-stakes sibling: same `verification` table substrate, same hashed-token-in-URL discipline, same enumeration grammar — but with shorter expiry (10 minutes, not 1 hour), one extra security property (kill every existing session), and a different post-success disposition (signed in fresh, or bounced back to sign-in for sensitive products). The flow reuses every primitive from 057.3; the new content is the opt-in session-revocation flag, the elevation-of-stakes rationale, and the six failure modes that bite in production.

**Pedagogical approach.** Six-step sequence diagram is the spine — students grasp the flow as one shape, then attack each step's failure mode. The two non-negotiables (enumeration closure, session invalidation) get foregrounded with the "what undoes the entire defense" framing — a small "before/after" comparison for the session-invalidation move ("attacker still acts vs. attacker locked out") makes the abstract concrete. The 10-minute expiry vs. 1-hour verification expiry contrast is a single sentence, but the *why* (reset is a higher-stakes capability than flag-flip) is the senior insight.

**Connection to prior lessons.** 057.3 taught hashed-token-in-`verification`-table and enumeration discipline; this lesson reuses both with one new identifier namespace and one new security property. 057.1's `minPasswordLength` and Argon2id apply at the new-password write. 054's `sendEmail` is the email send. The action-boundary discipline from 047.4 + `useActionState` from 049.2 wraps the two forms (request + confirm).

**Beginner pitfalls.** Surfacing "email not found" — re-introduces enumeration. Leaving `revokeSessionsOnPasswordReset` at its library default of `false` — quietest critical bug; reset "works" but doesn't kick the attacker out. Letting the link survive past 10 minutes "because UX." Reflecting `?next=` raw — open-redirect via the success page. Allowing the new password to equal the old (deciding silently, not deliberately).

**Tone and density.** Pattern + mechanics hybrid; concise like 057.3 but with the load-bearing "session invalidation" trade taking a full beat. 35–45 minutes.

---

## Lesson sections

### Introduction (no header)

Two-paragraph framing. First paragraph: the user-facing problem (forgotten password) and the structural answer (six steps, two of which exist only because reset is higher-stakes than verification). Second paragraph: the deliverable — `/forgot-password` and `/reset-password` Server Actions wired against `auth.api.requestPasswordReset` and `auth.api.resetPassword`, the `sendResetPassword` callback connected to the Unit 8 pipeline, and the `revokeSessionsOnPasswordReset: true` flag set deliberately rather than left at the library default. Name the three load-bearing properties up front (enumeration closure on request, short expiry on token, session invalidation on success) — these are the lesson's spine.

### The six-step flow at a glance

Open with a **Mermaid sequence diagram** wrapped in `<Figure>` showing the six actors-over-time view: User, Forgot-password form, Server Action, Better Auth, Resend (Unit 8 pipeline), Email inbox, Reset-password form, Postgres. Steps:

1. Submit email on `/forgot-password`.
2. Server: `requestPasswordReset` → CSPRNG token → hashed row in `verification` (`identifier: reset-password:<userId>`) → `sendResetPassword` callback fires → Resend send.
3. Form renders "if an account exists, we sent a link" (same shape regardless of email existence).
4. User clicks link → `/reset-password?token=<token>` (Client Component with new-password + confirm fields).
5. Server: `resetPassword` → token hash → expiry check → `minPasswordLength` → Argon2id → `account.password` update → row delete → **`DELETE FROM session WHERE userId = ?`** → fresh session issued.
6. User lands on `/dashboard` with one-time success notice.

The diagram is the lesson's mental anchor — every subsequent section explains one of these arrows in detail. **Pedagogical goal**: front-load the shape so the rest of the lesson is "zoom in on step N."

### Configuring the surface

Subsections:

**`emailAndPassword` config additions.** Single `Code` block showing the two new keys on the `emailAndPassword` config from 057.1 — `sendResetPassword` and `resetPasswordTokenExpiresIn: 10 * 60`. Use an `AnnotatedCode` here: highlight (1) the callback signature `async ({ user, url, token }) => sendEmail({ ... })`, (2) the `to: user.email` and the React Email template prop, (3) the 10-minute expiry constant.

**Why 10 minutes, not the library default.** Brief paragraph. Library defaults to 3600 seconds (1 hour); the senior call is to shorten to 600 seconds because reset is higher-stakes than verification — a leaked verification link only flips `emailVerified`; a leaked reset link mints arbitrary credentials. Short enough that bounce-delayed delivery (corporate filtering) becomes a real friction; the trade is real and the senior owns it. (Cite a small `Aside` of type `note` here so the trade is visible.)

**The flag that defines the lesson.** `revokeSessionsOnPasswordReset: true` on `emailAndPassword`. This is the section's load-bearing call. Use an `Aside` of type `caution`: "Library default is `false`. Without this flip, password reset *works* — but every existing session on every device the attacker has continues to function. The entire reason to reset is undone." Reinforce with the framing: reset's purpose is "old credential may be compromised"; if cookies stay alive, the attacker keeps acting after the legitimate user resets.

### Step 1 — the request endpoint

Subsections:

**The `/forgot-password` page.** Single email field, submit button, no enumeration leak in the UI. Use `Code` block to show the page's form structure (Server Action wired via `useActionState`, single email input, submit button).

**The Server Action.** `Code` block with the action — Zod schema (just `email: z.string().email()`), `auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' }, headers: await headers() })`, return the `Result` shape with just `'ok'` (no `'email-not-found'` — that's the enumeration leak). Mention the `redirectTo` parameter rides through to become the `?token=...` link's destination; library validates against `trustedOrigins`.

**What happens in the library.** Brief bullet list (not a section): CSPRNG token, SHA-256 hash, row inserted into `verification` with `identifier: reset-password:<userId>`, `expiresAt = now + 600`, `sendResetPassword` callback fires (which calls `sendEmail` from Unit 8). Row anatomy referenced back to 057.3 — same substrate, different namespace.

**The non-negotiable response shape.** Brief paragraph plus an `Aside` of type `caution`: form renders "If an account exists with that email, we sent you a link" regardless of whether the email exists. No branching on existence — distinct copy re-opens enumeration. This is the same discipline from 057.1 / 057.3 applied at a higher-stakes endpoint.

### Step 2 — the email template

Brief section. Single `Code` block showing `emails/reset-password.tsx` — props-only React Email template, one CTA button (`<Button href={url}>Reset password</Button>`), expiry note ("This link expires in 10 minutes"), and the **"if you didn't request this, ignore it"** safety line. The safety line is load-bearing: a user receiving an unexpected reset link needs to know inaction is the right move (the link expires, no action required). Reference 053 for template anatomy and 054 for send pipeline; don't re-teach.

### Step 3 — the reset-password page

Subsections:

**The Client Component.** Page at `/reset-password` reads `?token=` from `useSearchParams`. Two password inputs (new + confirm) with client-side match check (UX only, never security). Use `Code` block showing the form scaffold.

**Token-on-URL discipline.** The token in `?token=...` is visible in browser history, the Referer header on any outbound link, and any naive logging. Mitigations stack:

- **Short expiry** (10 min) — caps the window.
- **One-time use** — row deletes on success; replay fails.
- **`Referrer-Policy: same-origin`** — default from 058.4; prevents leak to off-domain assets.
- **Don't log full URLs** — Sentry breadcrumbs, server access logs strip the query string.

The reach for high-security products is the URL fragment (`#token=...`) which isn't sent to the server in the Referer; default is fine.

Use a small **HTML+CSS annotated illustration** wrapped in `<Figure>` showing the URL with `?token=...` highlighted and the four mitigations as callouts (the "annotated artifact" pattern from `documentation/diagrams/INDEX.md`). **Pedagogical goal**: make the threat surface visual; students underestimate "but the URL is just text" until they see the leak vectors.

### Step 4 — the confirm endpoint

Subsections:

**The Server Action.** `Code` block — Zod schema (`token`, `newPassword`, with `minPasswordLength` floor from 057.1), `auth.api.resetPassword({ body: { token, newPassword }, headers })`, return discriminants `'ok' | 'invalid-token' | 'expired-token' | 'password-too-short'`. Note: library returns `INVALID_TOKEN` for both "not found" and "expired" — same shape, enumeration discipline at the verify endpoint too. Surface them as one branch in the UI ("This link is invalid or has expired. Request a new one.").

**What happens server-side.** Numbered list using Starlight `<Steps>`: (1) hash incoming token, (2) look up row by hash, constant-time, (3) check `expiresAt > now()`, (4) validate `newPassword` against `minPasswordLength`, (5) Argon2id-hash the new password, (6) `UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'`, (7) `DELETE FROM verification WHERE id = ?`, (8) **`DELETE FROM session WHERE userId = ?`** (because `revokeSessionsOnPasswordReset: true`), (9) issue fresh session, (10) `onPasswordReset` callback fires if configured (audit-log seam — name once, reference 061). The student sees the move that closes the threat model.

### Step 5 — the session-invalidation move

**This is the lesson's load-bearing section.** Don't compress.

Subsections:

**Why every session dies.** The argument: reset exists because the old credential might be in attacker hands (phished, leaked in a breach, written on a sticky note photographed at a coffee shop). If only the password rotates but sessions survive, the attacker — who likely already signed in and holds a valid session cookie — keeps acting after the legitimate user "resets." The reset accomplished nothing. Non-negotiable.

**The "before/after" framing.** Use a `TabbedContent` with two tabs: "Without `revokeSessionsOnPasswordReset`" (timeline of attacker stays signed in after reset) and "With `revokeSessionsOnPasswordReset`" (timeline of attacker's session 401s on next request). Each tab is a small Mermaid sequence diagram (3 actors: legitimate user, attacker, server) showing the moment of divergence. **Pedagogical goal**: make the abstract "session invalidation" concrete by showing the attacker timeline. This is the kind of "make the threat visible" visualization that converts an easy-to-miss flag into a memorable senior reflex.

**Post-reset session disposition — fresh session vs. bounce to sign-in.** Two reasonable shapes:

1. **Fresh session** — library issues a new session on the resetting request; user lands signed in on `/dashboard`. UX-friendly. Default behavior with `autoSignIn` enabled.
2. **Bounce to sign-in** — no auto-session; user re-types email + new password on `/sign-in`. Senior call for high-stakes products (banking, admin surfaces) because it surfaces "did you mean to do this" friction.

Brief paragraph; the trade is the product's threat model and most SaaS picks the first.

**Composition with 2FA.** Brief paragraph. If 2FA (057.6) is enabled on the account, reset alone doesn't bypass it — sign-in after reset still requires the second factor. This is *why* 2FA matters: a leaked password (plus an attacker who controls email forwarding) still doesn't yield access. If the second factor is also lost, recovery codes from 057.6 are the path. Don't re-teach 2FA; name the composition and move on.

### Watch-outs in production

`Aside` of type `caution` (or six small ones, or one consolidated bulleted list — author judgment). Cover:

- **Enumeration leak** — distinct messages for "email not found" vs. "sent" at the request endpoint; distinct copy for "invalid" vs. "expired" at the confirm endpoint.
- **Sessions survive** — leaving `revokeSessionsOnPasswordReset` at the library default; the entire defense undone.
- **Identifier namespace collision** — sharing the `verification.identifier` namespace with verify-email (057.3) and magic-link (057.5); each flow uses a distinct prefix (`reset-password:`, `verify-email:`, `magic-link:`) so a verify token can never satisfy a reset.
- **Expired link survives** — letting `resetPasswordTokenExpiresIn` exceed 10 minutes "for UX" instead of investing in better delivery.
- **Open-redirect** — reflecting `?next=` on the success page without allowlist validation (Lesson 037.3 rule; honored at the call site).
- **Emailing the new password back** — still ships in legacy systems; doesn't apply here because the library never sees the new password until the user submits it, but name the anti-pattern so the student recognizes it in code reviews.
- **Old password equals new** — the library doesn't block by default; senior call is whether to add a check (some compliance regimes require it; most SaaS doesn't bother).

### Exercise — sequencing the flow

Use the `Sequence` exercise component (drag-to-order). Eight steps shuffled, student orders them:

1. User submits email on `/forgot-password`.
2. Server hashes a CSPRNG token, stores hash in `verification` row.
3. `sendResetPassword` callback fires; Resend dispatches the email.
4. User clicks link; lands on `/reset-password?token=...`.
5. User submits new password.
6. Server hashes incoming token, looks up row, checks expiry.
7. Server hashes new password, updates `account.password`.
8. Server deletes every `session` row for the user, issues fresh session.

**Grading criterion**: exact order. **Pedagogical goal**: cement the six-step shape from the opening diagram as a single coherent sequence the student can recall under interview pressure.

### Exercise — the "what undoes the defense" check

Use a `MultipleChoice` (multi-select, two correct):

**Question.** "Which of the following undo the security guarantees of password reset?" Options:

- Surfacing "email not found" at the request endpoint. *(correct — enumeration leak)*
- Leaving `revokeSessionsOnPasswordReset` at its library default of `false`. *(correct — sessions survive)*
- Hashing the token with SHA-256 before storage. *(incorrect — that's the correct behavior)*
- Setting `resetPasswordTokenExpiresIn` to 10 minutes instead of 1 hour. *(incorrect — that's the senior call)*
- Sending the reset link to the user's current email address. *(incorrect — that's where it has to go)*

**Pedagogical goal**: forces the student to articulate the two load-bearing properties (enumeration closure, session invalidation) by recognizing what would break them.

### What's next (no header, brief)

One sentence connecting forward: 057.5 reuses the same primitives (token in `verification`, send through Unit 8, click-to-resolve) for magic-link sign-in, where the URL click *is* the credential.

---

## Scope

**Prerequisite knowledge re-defined briefly (one sentence each, don't re-teach):**

- `verification` table shape and the `identifier`/`value`/`expiresAt` columns — 056.2 and 057.3.
- Hashed-token-in-URL discipline (CSPRNG, SHA-256, constant-time compare, one-time use) — 057.3.
- Enumeration discipline (same response shape regardless of email existence) — 057.1 and 057.3.
- `sendEmail` wrapper through the Resend pipeline — 054.
- Action-boundary discipline (Zod input, `Result` output, `useActionState`) — 047.4 and 049.2.
- `minPasswordLength` and Argon2id — 057.1.

**Explicitly out of scope (defer with a one-line pointer where useful):**

- Email verification flow at sign-up (057.3 owns the verify-email-on-account-creation path).
- Change-password from `/settings/security` while signed in (058.2 — different elevation tier, current-password prompt instead of email link).
- Change-email from settings (058.2 — verify-on-current-address discipline).
- 2FA / TOTP enrollment and recovery codes (057.6 — named for composition only).
- Magic-link sign-in (057.5 — sibling flow, different identifier namespace).
- React Email template anatomy and dark-mode previewing (053).
- Resend SPF / DKIM / DMARC and the send wrapper internals (054).
- Rate-limit windows on the request and confirm endpoints (078 — named once at the request endpoint for context, full wiring deferred).
- `onPasswordReset` callback for audit logging (061 — named once, not configured).
- Account-recovery flows when the user has also lost their second factor (out of library scope; out of course scope).
- Recovery codes (057.6).
- Server-side cleanup job for expired `verification` rows (named once in 057.3; not re-covered here).
