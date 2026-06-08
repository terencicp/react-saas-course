# Lesson 3 — The email verification gate

## Lesson title

Chapter-outline title "The email verification gate" fits — keep it.
Sidebar (short) title: **Email verification**.

## Lesson type

`Implementation`. The test-coder runs for this lesson (`tests/lessons/Lesson 3.test.ts`); the writer renders the Implementation section list.

## Lesson framing

The student installs the senior reflex that an unverified account is a half-account: they make `requireEmailVerification: true` (already flipped on in Lesson 2) actually usable by wiring the email that carries the proof-of-control link. They ship a branded React Email verification template on the existing Resend pipeline, the `emailVerification` config block whose `sendVerificationEmail` callback fires it, and a resend escape hatch — and they prove the link flips `user.emailVerified` to `true` and (via `autoSignInAfterVerification`) lands the user signed in. The payoff is the senior framing of the token model: the verification token is a stateless signed JWT embedded in the URL, so there is no token row to consume and no DB write on sign-up — the gate is enforced entirely by signature and expiry, and the first session of the whole flow is issued here, on the verify-callback request.

## Codebase state

### Entry

Lesson 2's spine is in place and proven by `pnpm test:lesson 2`. The `auth` instance exists in `src/lib/auth.ts` with `emailAndPassword: { enabled, requireEmailVerification: true, minPasswordLength: 12, autoSignIn: false }`, the session config, `SESSION_COOKIE_PREFIX`, `getCurrentUser`/`requireUser`, and `nextCookies()` last in `plugins` — but **no** `emailVerification` block. The catch-all handler is mounted; `signUpAction` creates the `user` (`emailVerified: false`) and `account` (`providerId: 'credential'`) rows and redirects to `/verify-email?email=…`. `src/emails/welcome-verification.tsx` is a stub rendering only `<Text>Verify email — TODO(L2)</Text>`. `src/app/(auth)/verify-email/page.tsx` renders only `<h1>Check your inbox</h1>` — no email display, no resend. `src/app/(auth)/verify-email/verify-email-resend.tsx` does not exist. Net: sign-up succeeds but `/verify-email` is a dead end — no link is ever sent, so no account can be verified.

### Exit

The full verification path runs. `src/emails/welcome-verification.tsx` is a real template on `EmailLayout` chrome (heading, greeting, CTA `<Button href={verifyUrl}>`, plain-text fallback link, 1-hour expiry notice, `PreviewProps`). `src/lib/auth.ts` carries the `emailVerification` block (`sendVerificationEmail` → `sendEmail` with `createElement(WelcomeVerification, …)` and `idempotencyKey: verify:${user.id}:${url}`, `sendOnSignUp: true`, `autoSignInAfterVerification: true`, `expiresIn: 60 * 60`). `verify-email/page.tsx` reads `?email=`, shows the target address and expiry, and renders `<VerifyEmailResend />`. The new `verify-email-resend.tsx` client island calls `authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' })`. Sign-up now sends the email; clicking the CTA flips `emailVerified` to `true`, issues the first session, and lands on `/dashboard` (still an ungated placeholder — the gate is Lesson 5). The `verification` table stays empty throughout. `pnpm test:lesson 3` passes.

## Lesson sections

Render the Implementation section list: Goal + Finished result (intro, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a brand-new account receives a verification email, and clicking the link verifies the account and signs the user in. Then one paragraph (or a `Screenshot` in a `Figure`) of the feature working: after sign-up the user sits on a "Check your inbox" screen showing the target address; the inbox holds a branded message with a working "Verify email" CTA; clicking it lands them on `/dashboard`, signed in, with no password re-prompt. Name the senior point inline: the token is the signed JWT carried in the link, so nothing is read from or written to the `verification` table — Better Auth checks the signature and expiry on the callback and flips `emailVerified`.

Use a `Screenshot` of the rendered email (public/screenshots/055/ has assets) inside a `Figure` if a clean one exists; otherwise a one-paragraph description. No new diagram needed — the request flow is linear and prose carries it.

### Your mission

Prose-only brief, no implementation hints, no subsection headers. Weave the capability, constraints, and out-of-scope into coherent prose, then the numbered functional-requirements list (the only list).

Frame: `requireEmailVerification: true` and the `/verify-email?email=…` redirect already exist from Lesson 2, but nothing sends the link — the screen is a dead end. The student builds the `welcome-verification.tsx` React Email template on the provided `EmailLayout` chrome, adds the `emailVerification` config block whose `sendVerificationEmail` callback rides the exact same `sendEmail` from Chapter 050 (no Resend re-implementation), and finishes the verify-email screen with a resend island.

Constraints to weave in (the senior decisions this brief surfaces):
- **Token expiry is a tradeoff.** `expiresIn` is one hour — long enough that inbox triage doesn't kill the link, short enough that a stale forwarded email doesn't grant indefinite access.
- **Stateless token.** The token is a signed JWT embedded in `url`; Better Auth verifies signature and expiry on the callback, so there is no token row to consume and no DB write on send.
- **`autoSignInAfterVerification: true` is the senior call.** The user just proved email control by clicking the link, so re-prompting for the password they typed minutes ago is a pointless UX regression. The library issues the session on the verify-callback request — this is the first point in the whole flow where a session and cookie actually land (the `nextCookies()` bridge wired in Lesson 2 earns its keep here).
- **The suppression path is not a bug.** `sendEmail` still consults `email_suppressions` via `isSuppressed`, so a suppressed address creates the user but never receives mail — the resend button is the user's escape hatch.

Out of scope (one line): the sign-in surface and unverified-refusal land in Lesson 4; the protected-route gate lands in Lesson 5, so `/dashboard` is still an ungated placeholder after the auto-sign-in here.

Functional requirements (numbered; tag each `[tested]` / `[untested]`):
1. After sign-up, the browser lands on `/verify-email` showing the address the link was sent to. `[untested]`
2. A verification email arrives rendered from the React Email template — heading, greeting, working CTA button, plain-text fallback link, and a one-hour expiry notice. `[untested]`
3. Clicking the CTA flips `user.emailVerified` to `true` in Postgres; the `verification` table stays empty (the token is a JWT, not a row). `[tested]`
4. After clicking the CTA, the user is signed in (a fresh `session` row exists) and is taken to `/dashboard` without re-entering a password. `[tested]`
5. The resend button on `/verify-email` sends a new email with a fresh JWT link. `[untested]`

Test-coder note: requirements 3 and 4 are the asserted core (`emailVerified` flip + post-verify session creation, driven through `auth.api`/the verify endpoint). The email-rendering and resend requirements (1, 2, 5) are confirmed by hand and covered in the reference solution.

### Coding time

One build-prompt line: implement against the brief and the tests, then check the hidden walkthrough. The writer wraps the walkthrough in `<details>` (collapsed). Organize the reference implementation as it appears in the repo, with decision rationale for non-obvious choices and full coverage of the `[untested]` requirements.

Reference implementation, in repo order:

1. **`src/emails/welcome-verification.tsx`** — the template. Props `{ firstName: string; verifyUrl: string }`. Structure: `<Tailwind config={emailTailwindConfig}>` wrapping `<Html lang="en" dir="auto">`, `<Head>` (title + `color-scheme` meta), `<Preview>Verify your email to finish signing up</Preview>`, `<Body className="bg-zinc-50">` wrapping `<EmailLayout>` → `<Section>` with `<Heading as="h1">Verify your email</Heading>`, a `firstName` greeting `<Text>`, a `<Button href={verifyUrl}>Verify email</Button>` styled with the `brand` tokens, a muted plain-text fallback `<Text>Or paste this link…: {verifyUrl}</Text>`, and a muted `<Text>This link expires in 1 hour.</Text>`. Export `WelcomeVerification.PreviewProps` (`{ firstName: 'Ada', verifyUrl: 'https://acme.example/verify/abc-123' }`) for the `pnpm email` dev preview, and `export default`.
   - Rationale to surface: the template renders `<Html>/<Head>/<Tailwind>` itself; `EmailLayout` is brand chrome only (logo + footer) and deliberately holds no `<Html>` so it nests inside `<Body>` — link to Chapter 049 rather than re-explaining React Email composition.
   - Covers `[untested]` req 2 (the heading/greeting/CTA/fallback/expiry surface).
   - Present this as a single `Code` block (the structure reads top-to-bottom cleanly); use `AnnotatedCode` only if the writer wants to spotlight the `<Tailwind>`-outside / `EmailLayout`-inside nesting and the `PreviewProps` export as separate focus steps.

2. **`src/lib/auth.ts`** — add the `emailVerification` block to the existing instance (do not restate the whole file; show the inserted block in context). Shape: `sendVerificationEmail: async ({ user, url }) => { await sendEmail({ to: user.email, subject: 'Verify your email', react: createElement(WelcomeVerification, { firstName: user.name, verifyUrl: url }), idempotencyKey: \`verify:${user.id}:${url}\` }); }`, plus `sendOnSignUp: true`, `autoSignInAfterVerification: true`, `expiresIn: 60 * 60`. Note the new imports: `createElement` from `react`, `WelcomeVerification` from `@/emails/welcome-verification`.
   - Rationale: `react` takes a rendered element directly (a React Email + Resend convenience, not a custom serializer); `idempotencyKey: verify:${user.id}:${url}` makes a double-submit idempotent so the same link isn't sent twice. Link to Chapter 050 for the Resend send path.
   - Covers `[untested]` requirement coverage for the send path and the suppression reasoning (a suppressed `to` short-circuits inside `sendEmail`, hence the resend escape hatch).
   - Use `CodeVariants` (before/after) only if the writer judges the diff against Lesson 2's `auth.ts` is clearer than an inline `Code` block; otherwise a focused `Code` block of just the `emailVerification` block in context.

3. **`src/app/(auth)/verify-email/page.tsx`** — finish the provided shell. `searchParams: Promise<{ email?: string }>`; `await searchParams`, render "Check your inbox", the target email, the 1-hour notice, and `<VerifyEmailResend email={email ?? ''} />`. Simple `Code` block.

4. **`src/app/(auth)/verify-email/verify-email-resend.tsx`** — new client island. `'use client'`; local `pending`/`sent` state; a `handleResend` calling `authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' })`, then a confirmation line. Covers `[untested]` req 5. Simple `Code` block.
   - Callout: this is a new file (the only file that exists in `solution/` but not `start/`).

External-resources note: the resourcer appends `ExternalResource` cards here (after the `<details>`, no header) — leave a placeholder mention only.

### Moment of truth

Test command: `pnpm test:lesson 3`. Expected: all pass, covering the `emailVerified` flip and the post-verify session creation (reqs 3 and 4).

Then a hand-confirmation `Checklist` (`ChecklistItem`s, `untested` chip) for the requirements the tests don't cover:
- After sign-up, `/verify-email` shows the target email.
- The verification email arrives and renders with heading, greeting, CTA, fallback link, and expiry notice.
- Clicking the CTA lands you on `/dashboard` signed in with no password re-prompt (dashboard still shows the ungated placeholder — the gate is Lesson 5).
- The resend button delivers a fresh email.

## Scope

Does not cover: the `auth` instance, schema generation, the catch-all handler, or `signUpAction` (Lesson 2 owns those). Does not cover the sign-in action, opaque credential errors, or the unverified-refusal UI — Lesson 4. Does not cover the `proxy.ts` cookie gate, the layout validating read, the inverse gate, or sign-out — Lesson 5; consequently `/dashboard` stays an ungated static placeholder after the auto-sign-in here, which is correct, not a gap. Does not re-teach React Email composition (Chapter 049) or the Resend `sendEmail` pipeline and suppression rules (Chapter 050) — link, don't re-explain. No `verification`-row checkpoint exists in this flow: do not frame any verification step around watching a `verification` table row in Studio — that table is empty by design.
