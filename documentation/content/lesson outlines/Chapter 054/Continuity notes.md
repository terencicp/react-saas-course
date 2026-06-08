# Chapter 054 — The signed-in session

## Lesson 1 — The two-layer gate in proxy.ts

**Taught.** Production-shaped `proxy.ts`: cookie-presence-only gate (`getSessionCookie` from `better-auth/cookies`, no DB), matcher strategy choice (allowlist vs matchall-minus-public), `?next=` round-trip, inverse gate bouncing signed-in users off auth pages, single-file gate composition, and the two-layer split (proxy = perimeter / layout = door).

**Corrects.** Ch052 L4's minimal proxy used `auth.api.getSession` (a DB read) as a deliberate stopgap; the production gate is cookie-presence-only via `getSessionCookie`. Later lessons / project code reference the cookie-presence version, not the stopgap.

**Debts (deferred to / honored from other lessons).**
- Layer-2 validating read (`requireUser` / `auth.api.getSession({ headers })` + `React.cache`) — owned by Ch052 L4; here only named as "the truth."
- Authorization / role checks / org-scope / `authedAction` — Ch057 (Unit 9), explicitly downstream of the proxy.
- `safeNext` implementation + open-redirect rule surface — Ch033 L3; honored at the call site only. Sign-in form that reads `next` — Ch053 L2.
- next-intl `createMiddleware` ordering (runs *before* auth gate; file still exports `proxy`) — Ch084; seam planted, not built.
- "Layout says valid but session is gone" state proven by this chapter's L2 (credential changes) and L3 (revocation).

**Terminology / canonical names (use exactly; later chapters depend on these).**
- `SESSION_COOKIE_PREFIX` exported from `lib/auth.ts`; stack uses `__Host-` prefix.
- Proxy call: `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` — passing the prefix is mandatory (default `'better-auth.'` silently misses `__Host-` → redirect loop).
- Named export `proxy` (Next.js 16 dispatches on the exact name); `function proxy(request: NextRequest)`.
- `AUTH_PAGES = ['/sign-in', '/sign-up']`; proxy redirects signed-in → `/dashboard`, signed-out-on-protected → `/sign-in?next=<encoded pathname+search>`.
- Matcher uses **allowlist** strategy in the shipped file: `['/dashboard/:path*', '/settings/:path*', '/billing/:path*', '/sign-in', '/sign-up']` (auth pages + protected sections both listed).
- Mental model: proxy = perimeter (cookie presence, optimistic check), layout/action = door (validating read + authz).

**Patterns and best practices (for the project chapter).**
- No DB / no `await` in the proxy — rule is a *performance* decision (prefetch load), not an Edge capability limit (proxy.ts is Node runtime in Next.js 16, can't be Edge).
- `proxy.ts` lives at project root or `src/`, never under `src/app/` (silently ignored there).
- Don't refresh the session cookie in the proxy; Better Auth `updateAge` sliding renewal handles it on the next mutating call.
- Keep the proxy too simple to throw; any added logic must fail-closed (default to redirect-to-sign-in, not pass-through).
- One `proxy.ts` only; compose multiple concerns as small named gate functions, first to return a `NextResponse` wins.

**Misc.** Lesson is fully built. Visuals: inline Mermaid `sequenceDiagram` (two-layer gate, in `<Figure>`), `NextRoundtripStrip` figure at `src/components/lessons/054/1/next-roundtrip-strip.astro` (the `?next=` round-trip phase strip), two `AnnotatedCode` blocks (cookie-presence excerpt + full `proxy.ts`), `StateMachineWalker` (matcher strategy), `CodeVariants` (allowlist vs matchall-minus), `Buckets` (proxy-vs-layout sort), `MultipleChoice` (prefix-mismatch loop), and a `VideoCallout` (ByteGrad, the proxy-vs-DAL split). Annotated-step palette: blue = default/presence read, orange = the `SESSION_COOKIE_PREFIX` footgun, violet = the inverse gate, green = the matcher. Matchall-minus regex shown as reference is `'/((?!sign-in|sign-up|api/auth|_next/static|_next/image|favicon.ico|$).*)'`.

## Lesson 2 — Changing the password and the email

**Taught.** The `/settings/security` credential-mutation surface (three independent `useActionState` forms, one `actions.ts`): `changePassword` with `revokeOtherSessions: true`, `changeEmail` confirmed on the *current* address via opt-in `sendChangeEmailConfirmation`, the two elevation tiers (current-password prompt vs `freshAge` re-auth), the `'requires-re-authentication'` continuation branch re-prompting through `signIn.email`, and the OAuth-only-user edge (`'no-password-set'` → `setPassword`).

**Corrects chapter outline (verified vs Better Auth, June 2026).**
- `changeEmail` **default sends the verification link to the NEW address**; confirming the *current* address first is opt-in via **`sendChangeEmailConfirmation`** (outline's `sendChangeEmailVerification`-to-current-by-default is wrong). Framed as the same "secure behavior is the flag you turn on" shape as `revokeSessionsOnPasswordReset`.
- `freshAge` taught as **10 minutes** (course value, Ch052 L3 / Code conventions), not the outline's "default 1 day".
- Password hash is **scrypt** (matches Ch053 L1), not the outline's "Argon2".

**Cut.** The "email-change-during-unverified-account" stale-`verification`-row edge (outline bullet) — dropped, not built; a later lesson needing that case has no coverage here.

**Debts.**
- 2FA enable/disable (Ch053 L6), passkey add (Ch053 L7), account deletion / data-export app-owned `freshAge` gate (Unit 16) — named as the other `freshAge`-gated actions; change-email is the only worked example.
- Active-sessions list + per-device revoke UI (Ch054 L3, next lesson) — where `revokeOtherSessions` becomes a button; the `security-links.tsx` section links out to it.
- Rate limit on `signIn.email` (Ch074) — named as a defense the re-auth re-prompt inherits.
- Reads `freshAge` for the first time (set in Ch052 L3); does not reconfigure it.

**Terminology / canonical names.**
- Surface: `app/(app)/settings/security/` with `page.tsx`, `actions.ts` (holds `changePassword`, `changeEmail`), `_components/{change-password-form,change-email-form,security-links}.tsx`.
- **elevation** (= step-up auth): re-prove identity for a sensitive action despite an existing session. Two tiers: **current-password prompt** (credential exists to re-supply → change-password) and **`freshAge` re-authentication** (no credential → change-email, 2FA, passkey, delete).
- Change-email token namespace: `change-email:<userId>:<newEmail>` in the same `verification` table as email-verification.
- `'requires-re-authentication'` is a **form-channel continuation discriminant** the *action* produces (modeled on Ch053 L2's `'requires-second-factor'`), **NOT** a `lib/result.ts` error code.
- Result catalog this surface produces: `'ok'`, `'invalid-credentials'`, `'email-taken'`, `'requires-re-authentication'`, `'no-password-set'`.
- `mapChangePasswordError` keys OAuth-only on `codes.CREDENTIAL_ACCOUNT_NOT_FOUND` read off `auth.$ERROR_CODES` (never hardcoded); OAuth-only fallback is the generic `'invalid-credentials'`.
- `setPassword` is a **distinct, server-only** call (adds the `'credential'` row); not `changePassword`.
- Worked action code uses the **server face** `auth.api.changePassword/changeEmail({ body, headers: await headers() })` (throws `APIError`, caught and mapped), NOT `authClient.*`. The re-auth re-prompt component *does* call client `authClient.signIn.email`.

**Patterns and best practices (for the project chapter).**
- `changePassword` always passes `revokeOtherSessions: true` (library default `false`); kills every session **except** the current one (contrast Ch053 L4 reset's `revokeSessionsOnPasswordReset: true` which kills **all**).
- `changeEmail` wires `sendChangeEmailConfirmation` (`to: user.email`) + app-code notices: "being changed" heads-up to current address at request time, "was changed" to **both** addresses after flip carrying a "wasn't you?" revoke-all + reset link. Email change does not revoke sessions by default — revoking is a deliberate product call.
- Re-auth re-prompt **must** call real `signIn.email` (inherits rate limit + session-rotation/fixation defenses); never a hand-rolled password-verify endpoint.
- Schemas: `currentPassword: z.string().min(1)` (checked not set), `newPassword: z.string().min(12)` (sets credential, re-imposes floor), `confirmPassword` via `.refine` with error on confirm field; `newEmail` normalized `.trim().toLowerCase().pipe(z.email())`.
- `'invalid-credentials'` and `'email-taken'` must read as the same shape of failure (enumeration discipline carried from Ch053).
- Never log current/new passwords.

**Misc.** Lesson is fully built (no TODO stubs remain). The two action wirings ship as **plain `Code` fences, not `AnnotatedCode`** (4th/5th repetition of the five-seam skeleton) — intentional; annotation budget spent on the elevation-tier `StateMachineWalker` (`kind="decision"`, three leaves: current-password / `freshAge` re-auth / session-enough), the change-email-flow figure, and the `reauth-right-vs-wrong` `CodeVariants`. Chapter palette: blue=parse/config, orange=library/endpoint, green=session/success, **violet=the hinge** (elevation tier + post-change revocation, applied via `<div data-mark-color="violet">` wrapping the change-password Code+CodeTooltips), red=insecure variant. Two lesson-specific Astro figures at `src/components/lessons/054/2/`: `sessions-after-change.astro` (reset-vs-change session disposition) and `change-email-flow.astro` (the named load-bearing flow visual, rendered as `<ChangeEmailFlow />` — a self-contained component, NOT an inline `DiagramSequence`); both reuse the `.sar-chip` vocabulary from Ch053 L4's `sessions-after-reset.astro`. Also carries a `VideoCallout` (Coding in Flow Better Auth walkthrough, `videoId="w5Emwt3nuV0"`, timestamps 1:47:31 change-email / 1:53:15 change-password). Closing `MultipleChoice` is multi-select (`elevation-recall`).

## Lesson 3 — Active sessions and revoke-across-devices

**Taught.** The `/settings/security/sessions` audit surface: server-trusted session list via `auth.api.listSessions({ headers })`, per-row device/location/recency parsing in a server util, current-session detection ("This device" badge + revoke guard), the three-call revoke trio with copy that disambiguates scope, the cookie-cache staleness window on revoke (eventual consistency), and the "new device signed in" email via a `databaseHooks.session.create.after` hook. Multi-session plugin and per-user session cap named-not-built.

**Cut.** Nothing significant beyond the outline's already-named exclusions; the `rememberMe`-renders-identically point survives only as one clause (no UX surface), so a later lesson can't lean on session-lifetime display here.

**Debts.**
- Audit-log table of sign-in/revoke history — Ch057 (current state only here, not history).
- IP-anomaly scoring / velocity / impossible-travel beyond the single email — Ch074.
- `multiSession()` account-switcher UI and a per-user session cap — both named-and-disambiguated, not built; cap presented as a deliberate reach, **not** a turnkey config key.
- Elevation gate on the page's *mutations* — re-uses Ch054 L2's elevation tier (named, not rebuilt); the sessions page sits behind L1's proxy gate but takeover-grade revokes belong behind step-up.
- "New device" email rides the Unit 7 `sendEmail` pipeline; its "wasn't you?" CTA re-uses L2's revoke-all + force-reset escape hatch.
- Reads the cookie-cache consequence (configured Ch052 L3); may apply `disableCookieCache: true` on the `/settings` subtree, does not re-explain the cache.

**Terminology / canonical names.**
- Surface: `app/(app)/settings/security/sessions/` with `page.tsx` (Server Component, reads list), `actions.ts` (revoke actions), `_components/{session-list,session-row,sign-out-everywhere}.tsx`; device util at `lib/parse-user-agent.ts`.
- **Two call faces:** the *page* reads via `auth.api.listSessions({ headers: await headers() })` (server face, throws `APIError`); revoke **actions** also use the server face `auth.api.revokeSession/revokeOtherSessions/revokeSessions` (NOT `authClient` — actions run on the server, wrap in try/catch).
- Revoke action names are verb+noun, deliberately distinct from the library calls so they don't shadow them: **`signOutDevice(token)` / `signOutOtherDevices()` / `signOutEverywhere()`**; each returns `Promise<Result<void>>`, `ok()` on success, `revalidatePath('/settings/security/sessions')` after.
- Single-device call shape in shipped code: `auth.api.revokeSession({ body: { token }, headers: await headers() })` — token goes under `body` (the bulk calls take only `{ headers }`).
- The three library calls: `revokeSession({ token })` (one named row, you stay), `revokeOtherSessions()` (all but current, you stay — the *same endpoint* L2's `changePassword({ revokeOtherSessions: true })` fires), `revokeSessions()` (all incl. current → signed out here → `/sign-in`).
- `mapRevokeError` collapses thrown errors to `Result` keyed on numeric `status`, codes off `auth.$ERROR_CODES`, never raw library message.
- `eventually consistent` (Term): revocation guaranteed but not instant — propagation = the cookie-cache window. `cookie cache` and `databaseHooks` re-Term'd lightly; `userAgent` / `GeoIP` Term'd (both display-only, UA never trusted for security).

**Patterns and best practices (for the project chapter).**
- The session list is a **server-trusted read** — render on the server, pass rows as props; never rebuild from client state.
- **Per-row single-device revoke is version-dependent:** `list-sessions` may return `token` empty on every row *except* the current one (token is a credential, intentionally withheld; open request #6940 proposes a `sessionId` param). Wire single-device revoke against whatever identifier the installed `revoke-session` accepts; the two **bulk** calls need no per-row token and are the always-available controls.
- **Copy is the safety mechanism:** "Sign out other devices" (you stay) vs "Sign out everywhere, including this device" (you go) — the differentiator is whether the current session dies; that drives every word.
- Never let the user revoke the current session without an explicit differently-worded confirm; badge + guard it.
- `revalidatePath('/settings/security/sessions')` after every revoke.
- Post-revoke toast must state the cookie-cache latency honestly ("may take a few minutes on currently-open tabs") — never claim instant sign-out.
- Never log `ipAddress` / `userAgent` into error breadcrumbs (sensitive personal data).
- GeoIP location is a privacy-gated senior toggle, not a default; device parse uses a `ua-parser-js`-class lib, server-side, display-only.
- New-device email installs via `databaseHooks.session.create.after` (fires on new session-row write); app code compares new IP+UA against prior rows and sends — the library gives the *write* hook, the new-device *logic* is app code. Don't hardcode a named `onNewDevice`/`signIn.after` hook.
- Revocation cheapness rests on the opaque-row model (Ch051 L2): the row's absence *is* the revocation — no denylist, no JWT rotation (the contrast a JWT model would force).

**Misc.** Lesson is fully built. The list read (one `page.tsx` `Code` fence) + three revoke actions ship as **plain `Code` fences, not `AnnotatedCode`** (Nth repetition of Server-Component-read + Server-Action-button) — intentional; annotation budget spent on the revoke-scope comparison **figure** (shipped as the `RevokeComparison` component `revoke-comparison.astro`, **not** a plain markdown table), the `session-row-anatomy.astro` current-session figure, and the `revoke-staleness` `DiagramSequence`. Four lesson-specific Astro components at `src/components/lessons/054/3/`: `session-row-anatomy.astro`, `revoke-comparison.astro`, `revoke-staleness-frame.astro` (rendered as `<RevokeStalenessFrame step={1..6} />`, one per `DiagramStep` — the DiagramSequence has **6 frames**, the 6th being the `disableCookieCache` escape hatch), `new-device-loop.astro`; all reuse the `.sar-chip` vocabulary + chapter palette from Ch053 L4 / Ch054 L2 so the chapter's session figures read as one visual language. Palette: violet = current-session detection + revoke-scope choice (the hinges), red = suspicious/attacker sign-in, orange = the hook/cache. Carries a `VideoCallout` (ByteByteGo session-vs-JWT, `videoId="fyTxwIa-1U0"`) at the opaque-row-model beat. Closing `MultipleChoice` is multi-select (3 correct: `revokeOtherSessions`/`revokeSessions` scopes + staleness; decoys: keyed-on-`id`, client-fetched list, instant-revoke). External resources cite UAParser.js (the chosen device parser), Better Auth Session Management + Database Hooks, OWASP Session Management.

## Lesson 4 — CSRF and XSS: the defaults and the footguns

**Taught.** The chapter's concept-only capstone (one inline code block): both vulns framed as **default-on defense + one footgun**. CSRF — `SameSite=Lax` drops the cookie on cross-site subrequests (three footguns: `SameSite=None`, dropping `__Host-` to add `Domain=`, building a cross-site flow at all); Next.js 16's Server Actions `Origin`-vs-`Host` check as the second wall (`serverActions.allowedOrigins` to widen); `trustedOrigins` reframed as Better Auth's parallel allowlist; CSRF tokens (synchronizer / double-submit) named as legacy + when cross-origin endpoints earn them back (Strict cookie / custom-header-triggers-preflight / Bearer). XSS — React auto-escapes every `{value}`; footgun is `dangerouslySetInnerHTML`; the server-side `isomorphic-dompurify` allowlist shape (`ALLOWED_TAGS`/`ALLOWED_ATTR`/`ALLOWED_URI_REGEXP`); the corners React leaves you (`href`/`src` scheme validation, `target="_blank"` + `rel`, `eval`/`Function`/`setTimeout(string)`); `HttpOnly` → no token in `localStorage`. CSP + the full security-header set named once as the next layer, built in the pre-launch audit project.

**Cut.** Nothing of downstream consequence — the lesson covers the outline's scope; only the optional `<img onerror=…>` variant of the XSS payload was dropped in favor of the single `<script>` story.

**Debts.**
- **CSP configuration** (nonces, hashes, `strict-dynamic`, report-only rollout in `proxy.ts`) and the **full `next.config.ts` `headers()` set** (HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-*`) — deferred to **Chapter 082** (pre-launch audit, Unit 16); named here as the roof, not built. Cross-linked forward.
- **Full CORS config** — named once (preflight is what makes a custom-header CSRF defense work); deferred to wherever the cross-origin product surface appears.
- Rate-limiting auth endpoints — Ch074 (not even named here).
- Reuses-not-reteaches: `SameSite=Lax`/`__Host-`/`HttpOnly`/`Secure` cookie flags + `trustedOrigins` (Ch052 L3 / Ch051 L2), `requireUser` validating read (Ch052 L4), opaque-session-row model (Ch051 L2). This lesson reveals their *security purpose*; does not reconfigure.

**Terminology / canonical names.**
- Mental model the chapter can lean on: **layered defense stack, each layer safe by default, each with exactly one footgun line that disables that one layer** — "point at the footgun in a diff, name the layer it turns off." Recurring refrain: *any time `SameSite=Lax`/`__Host-` (or any default) feels like it's blocking you, the architecture is the problem, not the default.*
- "Sink" vocabulary: the danger is the **sink** (the prop receiving input), not the input — same string is inert in `{value}`, catastrophic in `dangerouslySetInnerHTML`.
- Sanitizer package is **`isomorphic-dompurify`** (plain `dompurify` needs a DOM Node lacks); must run **server-side** so the client never receives the un-sanitized string.
- Terms defined: `CSRF`, `SameSite`, `XSS`, `CORS`, Content Security Policy.

**Patterns and best practices (for the project chapter).**
- Same-origin SaaS ships **no CSRF-token layer** — `SameSite=Lax` + Server Actions origin check close it; don't add tokens unless a genuinely cross-origin endpoint exists.
- Keep `serverActions.allowedOrigins` and `trustedOrigins` narrow; every addition is a reviewed security decision, never `['*']`.
- `dangerouslySetInnerHTML` only with a load-bearing reason (rich-text / CMS), always through a server-side **allowlist** sanitizer (never blocklist), sanitize even "trusted" sources; the sanitizer config is reviewed like a firewall rule.
- Validate URL scheme before rendering user-supplied `href`/`src` (allow `https:`/`mailto:`/relative, reject `javascript:`); write `rel="noopener noreferrer"` explicitly on `target="_blank"`; never feed user input to `eval`/`new Function`/`setTimeout(string)`.
- Session credential stays in the `HttpOnly` cookie; **auth tokens never in `localStorage`** — if a JS-readable token is unavoidable, in-memory + short-lived + refresh, never `localStorage` as a default.
- Object `style={{…}}` is safe (string-style URL injection only arrives via `dangerouslySetInnerHTML`).

**Misc.** Lesson is fully built. The MDX corrects the outline's "React 19 helps with `target="_blank"`" framing — it's the **browser** that now implies `rel="noopener"` for `target="_blank"`, not React; the still-meaningful explicit add is `noreferrer` (referrer privacy). React's `javascript:`-URL guard is framed as version-volatile ("don't lean on it, validate the scheme yourself"). The `serverActions.allowedOrigins` nesting (whether under `experimental`) is flagged version-volatile — the durable fact is "the framework checks `Origin` against `Host`". **Two** `Code` blocks shipped: the `next.config.ts` `serverActions.allowedOrigins` shape (plain fence) and the `dompurify-allowlist` (with `CodeTooltips` on `ALLOWED_TAGS`/`ALLOWED_ATTR`/`ALLOWED_URI_REGEXP`). Two lesson-specific figures at `src/components/lessons/054/4/` (`xss-two-sinks.astro` = the same-string-two-sinks visual, `defense-stack.astro` = the closing two-column CSRF|XSS layer/footgun synthesis) plus an inline Mermaid `sequenceDiagram` (the `SameSite=Lax` cookie-drop → 401 chain) in `<Figure>`, all reusing the `.sar-chip` vocabulary + chapter palette (violet = the load-bearing hinge, e.g. cookie-drop; red = footgun; green = safe default). Interactive: one combined `Buckets` (`twoCol`, safe-default vs footgun, 10 mixed CSRF+XSS items) as the primary check + one closing `MultipleChoice` (single-select, `SameSite=None` correct). Two `VideoCallout`s: Web Dev Simplified CSRF demo (`videoId="80S8h5hEwTY"`, flagged that it reaches for a token where `Lax` gives it free) and IBM Technology XSS anatomy (`videoId="z4LhLJnmoZ0"`). External resources: MDN `SameSite`, web.dev SameSite explainer, Next.js "How to Think About Security" (the Origin-vs-Host check), OWASP XSS Prevention Cheat Sheet (named as reference, not survey). No quiz in this lesson; Ch054 L5 is the chapter quiz.
