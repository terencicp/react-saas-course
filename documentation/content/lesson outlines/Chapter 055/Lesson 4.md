# Chapter 055 — Lesson 4 outline

## Lesson title

Sign in, with unverified refusal and safe redirects

Sidebar: `Sign in`

## Lesson type

Implementation

## Lesson framing

The student installs the security discipline that separates a real sign-in surface from a toy one: error responses that refuse to leak whether an email exists, and a post-login redirect that an attacker cannot turn into an open redirect. They ship `signInAction` — a near-mirror of the Lesson 2 sign-up action — but the senior payoff is not the call to `auth.api.signInEmail`; it is the two decisions wrapped around it. First, that wrong-email and wrong-password collapse into one opaque message while the unverified case stays distinguishable (safe only because it surfaces after the password already matched). Second, that the attacker-controlled `?next=` runs through an allowlist guard before it ever touches `redirect()`. By the end, a verified user lands where they were headed, an unverified user is refused with a working resend link, and `?next=//evil.com` falls back to `/dashboard`.

## Codebase state

**Entry.** Lessons 2 and 3 are done. The `auth` instance is wired with `requireEmailVerification: true`, `autoSignIn: false`, the `emailVerification` block, and `nextCookies()` last in the plugin array; the four-table schema is generated, migrated, and committed; the catch-all handler is mounted. Sign-up creates rows and redirects to `/verify-email`, the verification email sends and its link flips `emailVerified` and auto-signs-in. `mapAuthError`, `safeNext`, `SignInForm`, and `sign-in/page.tsx` are provided. `src/app/(auth)/sign-in/actions.ts` is the only stub touched this lesson — it currently returns `err('internal', 'Not implemented')`, so `/sign-in` renders but submit does nothing. The protected-route gate does not exist yet: `/dashboard` is an ungated placeholder and `proxy.ts` is empty.

**Exit.** `src/app/(auth)/sign-in/actions.ts` holds the complete `signInAction`: `SignInSchema` parse at the boundary, `auth.api.signInEmail` in a `try`/`catch` routed through `mapAuthError`, and a `safeNext`-guarded `redirect`. Verified credentials redirect to the sanitized `?next=` or `/dashboard`; wrong credentials show one opaque message; unverified accounts get the inline resend link; malicious `?next=` values fall back to `/dashboard`. No new files. The protected-route gate (proxy, layout read, inverse gate, sign-out) is still unbuilt — that is Lesson 5.

## Lesson sections

Implementation lesson. Sections in contract order.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a verified user can sign in and is returned to where they were headed, while an unverified user is refused and a malicious `?next=` is neutralized. Follow with a one-paragraph description of the four observable outcomes: `/sign-in` accepts valid credentials and redirects to the sanitized `?next=` (or `/dashboard`); wrong credentials show one opaque "Invalid email or password." message; an unverified account is refused inline with a resend link; `?next=//evil.com` lands on `/dashboard`. A small `Screenshot` (or labeled description) of the sign-in form showing the opaque error card and the resend link variant is enough — no diagram needed.

### Your mission (header)

Prose brief in the project's terms, no implementation hints, no subsection headers. Open by framing the action as a near-mirror of the Lesson 2 sign-up action — same parse-at-the-boundary seam, same `auth.api.*` call in a `try`/`catch`, same canonical `Result` shape — so the new surface is the error and redirect discipline, not the mechanics. Then weave in the constraints that shape the solution: the two error-handling rules (opaque credentials vs. safe-to-distinguish unverified) and the open-redirect closure on `?next=`. Name that `mapAuthError` and `safeNext` are provided helpers to reuse, not to reinvent, and that the `SignInForm` already carries `next` as a hidden input and renders the resend link on a `forbidden` result, so no UI work is required. State out of scope in one line: the proxy-level gate and the inverse redirect for already-signed-in users land in Lesson 5; this lesson owns only the sign-in action and its redirect safety.

Then the **Functional requirements** numbered list, rendered as a `Checklist` with `tested`/`untested` chips. Each item is a verifiable outcome, never a file or export:

1. Submitting `/sign-in` with a verified account's correct credentials redirects to `/dashboard`. `[tested]`
2. Submitting a wrong email or a wrong password shows one identical "invalid email or password" message, with no hint as to which was wrong and no session cookie set. `[tested]`
3. Submitting the credentials of an account that hasn't verified its email shows "verify your email" inline with a resend link, and sets no session cookie. `[tested]`
4. Signing in from `/sign-in?next=/dashboard/billing` redirects to `/dashboard/billing`. `[tested]`
5. Signing in from `/sign-in?next=//evil.com` or `/sign-in?next=https://evil.com` redirects to `/dashboard`, never to the external origin. `[tested]`
6. A malformed email or empty password re-renders the form with an inline validation message and never reaches `signInEmail`. `[untested]`

Note for the test-coder: assert observable behavior (redirect target, error message text identical across wrong-email/wrong-password, no `session_token` cookie on failure, `safeNext` outcomes), never the import of `mapAuthError`/`safeNext` or the action's internal shape. The opaque-credentials assertion is the load-bearing one — both wrong-email and wrong-password must yield byte-identical `userMessage`.

### Coding time (header; writer wraps the solution in `<details>`)

One-line build prompt directing the student to implement against the brief and the tests, then the hidden reference walkthrough. Only one file changes — present it as it appears in the repo: `src/app/(auth)/sign-in/actions.ts`.

Show the full action with `Code` (single short file; `AnnotatedCode` is overkill here, but the writer may use it to spotlight the three seams — parse, `try`/`catch` mapper, `safeNext` redirect — if it reads cleaner). Exact reference (grounded in the solution file):

- `'use server';` first, then imports: `Route` from `next`, `redirect` from `next/navigation`, `z`, `auth`, `mapAuthError`, `safeNext`, `err` + `Result`.
- `SignInSchema = z.strictObject({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1), next: z.string().optional() })`. Note the asymmetry vs. `SignUpSchema`: `password` is `.min(1)` here (presence only — the credential check, not a strength gate, owns rejection at sign-in), and `next` rides along in the same schema so the form's hidden input is parsed at the same boundary.
- `signInAction = async (_prevState, formData): Promise<Result<never>>` — parse `Object.fromEntries(formData)`; on miss `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`.
- `try { await auth.api.signInEmail({ body: { email, password } }); } catch (e) { return mapAuthError(e); }` — the mapper yields `unauthorized` ("Invalid email or password.") for wrong credentials and `forbidden` ("Verify your email before signing in.") for unverified; both branches set no cookie because no session is issued.
- `const next = safeNext(parsed.data.next); redirect((next ?? '/dashboard') as Route);`.

Decision rationale (one or two sentences each):
- Why the unverified `forbidden` reason is safe to distinguish while wrong-credentials must stay opaque: the unverified message only surfaces after the password already matched — itself proof of identity — so it leaks nothing to an attacker who doesn't already control the account; collapsing both into one message is what closes the account-enumeration vector. Link the enumeration reasoning to chapter 053 lesson 2 rather than re-explaining.
- The `safeNext` allowlist, one rule at a time: accepts only a string starting with a single `/`; rejects `//`-prefixed (protocol-relative URLs the browser resolves to an external origin), `:`-containing (`javascript:`, absolute `https://…`), and non-`/`-prefixed values, returning `undefined` so the caller falls back to `/dashboard`. Link the open-redirect rationale to chapter 054 lesson 1. The guard's own source is provided — quote it once, do not re-derive.
- The unverified refusal is produced by `requireEmailVerification: true` (set in Lesson 2) surfacing as an `EMAIL_NOT_VERIFIED` error that `mapAuthError` turns into `forbidden` — not by an explicit check in this action. Callout this indirection; it is the one thing that looks like a missing branch at a glance.
- Two small details from the solution worth a sentence each: the `as Route` cast exists because `typedRoutes: true` types `redirect()` against the route map and a runtime `?next=` string isn't statically known; and the brief's `// No authorize seam: the credential check is the authorization.` comment — sign-in needs no separate authz step because matching the password *is* the authorization.

Cover the `[untested]` requirement (6) in prose: the validation miss re-renders via the provided `SignInForm`'s `useActionState` + `FieldError` wiring, and short-circuits before `signInEmail`, so a malformed submission never hits Better Auth.

For the `Result` discriminant, `useActionState` wiring, and Zod-at-the-boundary, link to chapter 043 rather than re-explaining. No external resources expected; the resourcer may append Better Auth sign-in docs after the `<details>`.

### Moment of truth (header)

Test command and expected output: `pnpm test:lesson 4` — all pass, covering the successful redirect, the opaque-credentials path, the unverified refusal, and the `?next=` sanitization (valid path honored, `//evil.com` and absolute URLs rejected). Render with `Code` for the command and the pass output.

Then a `Checklist` of the by-hand confirmations the tests don't cover:
- Wrong email and wrong password produce the same message in the UI, with no session cookie set.
- An unverified account's sign-in attempt shows the inline "verify your email" message with a working resend link (the form's resend button calls `authClient.sendVerificationEmail`).

## Scope

- The proxy-level cookie gate, the layout's validating read, the inverse gate that bounces signed-in users off `/sign-in`, and sign-out — all Lesson 5. The `?next=` value is *produced* by the proxy's redirect there; this lesson only *consumes and sanitizes* it.
- The `auth` instance config, `requireEmailVerification`, `nextCookies()`, and the four-table schema — Lesson 2. This lesson reads them, does not touch them.
- The verification email and `autoSignInAfterVerification` — Lesson 3.
- Rate limiting on the sign-in endpoint — chapter 074; named in Lesson 5's pre-ship checklist, not built in the project.
- The `Result` shape, `useActionState`, Zod-at-the-boundary — chapter 043.
- Open-redirect / two-layer-gate rationale — chapter 054 lesson 1.
