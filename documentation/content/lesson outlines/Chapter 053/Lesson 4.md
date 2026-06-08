# Password reset

- **Title:** Password reset
- **Sidebar label:** Password reset

---

## Lesson framing

Fourth flow lesson of the chapter, and the **third in the L1/L2/L3 "twin" lineage** — the student already holds the action skeleton, the `verification`-table token model, the enumeration discipline, and the `safeNext` open-redirect guard cold. This lesson must *reuse* all of that, never re-derive it. Reset is built from primitives the student owns; the only genuinely new idea is **session invalidation on success**, and that idea is the whole reason a secure reset is harder than "email a link to anyone who asks." Make it the spine.

**The senior question (implicit in the intro, never a section):** a user forgot their password. The naive version is a two-step "request a link → set a new password" flow that any junior can wire. The senior version names the three properties that separate it from an account-takeover vector: enumeration closure on the request, a *shorter-than-verification* expiry, and — the load-bearing one — **every existing session for that user dies the moment the password changes.** Skip the third and the entire point of a reset is undone: a reset exists *because* the old credential may be in an attacker's hands, so any cookie minted under the old password must die with it.

> **CRITICAL — verified against current Better Auth (June 2026), corrects the chapter outline.** Session invalidation on reset is **NOT** Better Auth's default. It is opt-in via **`revokeSessionsOnPasswordReset: true`** inside the `emailAndPassword` block. The chapter outline framed it as automatic ("the library invalidates every existing session") — that is wrong; the library leaves old sessions alive unless you flip this flag. This is *pedagogically better*: the most important security property of the lesson is a one-line config the student must deliberately turn on, which sharpens the senior point instead of burying it as an invisible default. Every section below treats it as a flag the student sets and understands, never as free behavior.

**Mental model the student should leave with.** A password reset is a *credential-rotation event*, not a "let me back in" convenience. Two actions (`forgot-password` request, `reset-password` submit), each a five-seam twin of the sign-in action the student wrote last week, both bracketing one library call. The token machinery is L3's machinery wearing a different `identifier` namespace (`reset-password:<userId>`), a shorter expiry, and one extra non-negotiable side effect on success: session invalidation.

**What the student can do at the end.** Configure `sendResetPassword`, the reset expiry, and the `revokeSessionsOnPasswordReset` opt-in on the existing `emailAndPassword` block; write the two Server Actions wrapping `auth.api.requestPasswordReset` / `auth.api.resetPassword`; build the `ResetPasswordEmail` template (one CTA + the "if you didn't request this, ignore it" line that *only* a reset email needs); and — most importantly — *articulate* why session invalidation matters, that it is **off by default and must be turned on**, and where the same discipline recurs (change-password from settings, Ch 054 L2).

**Cognitive-load order (mirror L1/L2/L3: model before wiring).** Map the six-step flow as a whole first (so the student has the skeleton before any code) → config on-switch → request action + enumeration → reset action → **the session-invalidation move, landed on its own with full weight** → the email template → token-on-URL discipline + 2FA composition → close. The session-invalidation section is the climax; everything before it is setup, everything after is consequence.

**Pedagogical pain points to pre-empt.**
- Students conflate reset with "change password while signed in." Name the difference early: reset is *unauthenticated* (you can't prove who you are — that's the whole problem), change-password is *authenticated*. They share the invalidation discipline but live at opposite ends of the auth state.
- Beginners forget session invalidation entirely — it's invisible in the happy path (you reset, you're in, looks done). The danger is only visible when you picture the attacker who *also* had a session. The diagram must make the dying cookies visible.
- "Why is the token in the URL OK here when we obsess about secrets everywhere else?" — answer it head-on (short expiry + one-time-use-by-deletion + don't-log-URLs), the same honest treatment L3 gave the verify link.
- The legacy footgun: emailing the *new password* back to the user. Still ships in real systems. Name it as a dead-on-arrival anti-pattern.

**No live sandbox** (Better Auth is server-side against Postgres; ReactCoding is react-family only — confirmed in memory). Checks of understanding are recall / ordering / classification, consistent with L1–L3.

**Palette inherited from L1–L3 (keep it consistent):** blue = parse/config knobs, orange = library call / endpoint work, green = session/success, **violet = the hinge / load-bearing move (here: session invalidation on success)**, red = insecure variant.

**Slug:** `/053-authentication-flows/4-password-reset/`. Frontmatter: `chapter-id: 53`, `course-progress: 0.00005`, `sidebar.order: 4`, `title`/`label` "Password reset". Open with `<CourseProgressBar value={frontmatter['course-progress']} />` exactly as L1–L3 do.

---

## Lesson sections

### Intro (no header)

Connect backward in two sentences, the way L3's intro did. L1/L2/L3 built sign-up, sign-in, and the verify circuit; all three assumed the user *remembers* their password. This lesson handles the moment they don't — and it turns out "forgot password" is the most security-sensitive of the four flows, because it's the one designed to hand account access to someone who *can't* currently prove who they are.

State the goal: by the end, a forgotten password becomes a fresh one via a link in the inbox, and — the part juniors skip — every stale session for that account dies in the process.

Pose the senior questions as a short bulleted list (mirror L3's intro format):
- What's the call shape, and what does the request endpoint answer for an email that *doesn't* exist?
- What's in the link, how long does it live, and why is that shorter than the verification link?
- What's the one side effect on success that separates a secure reset from a back door — and why is it non-negotiable?

Draw the boundary up front (L3 pattern): this lesson does **not** cover change-password-from-settings (Ch 054 L2 — the authenticated sibling), recovery codes (L6), or the rate-limit mechanics (Ch 074). Each is named at its seam.

**Term candidates here:** none new yet — reuse is fine. Keep the intro warm and brief.

### The shape of a reset: six steps, two actions, one new rule

**Goal:** hand the student the whole skeleton *before* any code, so every later section slots into a frame they already hold (the model-before-wiring discipline from L1–L3).

Walk the six-step flow in prose, end to end, naming each step's production failure mode in one clause so the student sees stakes before mechanics:
1. **Request** — user submits their email on `/forgot-password`. Action calls `auth.api.requestPasswordReset({ body: { email, redirectTo }, headers })`. Library mints a CSPRNG token, hashes it into a `verification` row namespaced `reset-password:<userId>`, fires `sendResetPassword`. *Failure mode:* leaking whether the email exists.
2. **Uniform response** — form renders "if an account exists, we've emailed a link," identically whether or not the email is real. *Failure mode:* an "email not found" tell.
3. **Click** — user clicks `…/reset-password?token=<token>`; the page is a Client Component with new-password + confirm fields. *Failure mode:* reflecting the token/URL into logs.
4. **Submit** — action calls `auth.api.resetPassword({ body: { token, newPassword }, headers })`. Library hashes the token, looks up the row, checks expiry, validates the password floor, hashes the new password, updates `account.password`, deletes the row. *Failure mode:* a stale or replayed link still working.
5. **Invalidate** — the library kills every existing session for that user. *Failure mode:* the entire point — skip this and an attacker with the old password keeps their session.
6. **Land** — user is signed in fresh (one new session) or bounced to `/sign-in` for high-stakes products, with a one-time success message.

Then introduce a **`DiagramSequence` (`reset-flow`)** — the lesson's named load-bearing visual, the counterpart to L1's `signup-flow`, L2's happy-path, L3's `verify-flow`. Describe it in full so the build agent can produce it:

> A `DiagramSequence`. Each `DiagramStep` shows the **two actors split across two moments** — the *request* leg (browser → action → library → inbox) and, after a visual gap, the *reset* leg (click → action → library → sessions die → signed in). Reuse the section palette. The pedagogical goal is to make the **two-leg, one-inbox-round-trip** shape obvious *and* to make step 5's session death *visible* — render a small cluster of "other device" session chips that go struck-through/greyed at the invalidation step. That visible death is the whole lesson in one frame.
>
> Stages (lit one at a time): `Submit email` → `Mint + hash token` → `Email link` → `(user clicks)` → `Validate token` → `Hash new password` → **`Kill all sessions`** (violet, the chips die here) → `Sign in fresh`.
>
> Eight steps, one-sentence "what's true now" caption each. Step 7's caption carries the weight: "Every session this user had — every other browser, every other device — is gone. The new password is the only key now."

Follow with a **`Sequence` ordering drill** (`reset-order`) so the student rebuilds the skeleton from memory — but **place it at the *end* of the lesson**, not here (see closing section), so it tests retention rather than echo. Here, the diagram is enough.

**No new Terms in this section** — the flow is the frame.

### Turning reset on: the config

**Goal:** show the smallest config that lights the flow, and frame the *shorter* expiry as a deliberate stakes decision (callback to L3's expiry-ladder forward-pointer, now arriving).

Reset is configured on the **same `emailAndPassword` block** sign-up opened — not a new sibling block (this is the contrast to L3, where verification got its own `emailVerification` block; reset is a *property of email-and-password*, so it lands inside that existing block). **Three additions** (all verified against current Better Auth, June 2026):
- `sendResetPassword: async ({ user, url, token }) => sendEmail({ to: user.email, subject: 'Reset your password', react: ResetPasswordEmail({ url }) })` — the exact same callback *shape* as `sendVerificationEmail`; the library hands `{ user, url, token }` with the link pre-minted (the template only needs `url`; `token` is also exposed for callers who build their own link). Student mints no token, builds no URL. One line, reusing the Unit 7 `sendEmail` wrapper.
- `resetPasswordTokenExpiresIn: 60 * 10` — **10 minutes**, deliberately shorter than verification's hour (the lib default is 3600s / 1 hour — so here the course *diverges down*, where L3 *agreed* with the default). Frame the *why*: a verification link proves "I can read this inbox" (low stakes if leaked — worst case someone gets verified early); a reset link *grants the ability to change the credential* (high stakes — a leaked one is an account takeover). Higher stakes → shorter fuse. This is the expiry-ladder L3 promised ("reset is shorter at 10 min").
- **`revokeSessionsOnPasswordReset: true`** — the load-bearing flag. **Off by default**, which means a reset *leaves every old session alive* until you turn this on. Introduce it here as a knob but *defer its full weight* to the dedicated session-invalidation section (don't spend the climax early — name it in the config, explain it in its own section). One sentence here: "this is the single most important line in the whole flow, and the lesson's own section is coming up — for now, know it's `true` and know it's off by default."

**Component:** an **`AnnotatedCode` (`reset-config`)**, lang `ts`, `maxLines` ~12, showing the three additions *in the context of* the `emailAndPassword` block (so the student sees they nest inside it, not beside it). Three-to-four steps:
- Step 1 — the `sendResetPassword` callback — meta on the callback lines, **orange**. "Same seam as the verification email, same one-line body. The library mints the token and builds the URL; you deliver it."
- Step 2 — `resetPasswordTokenExpiresIn` — meta on that line, **blue**. The stakes-shorten-the-fuse argument. Explicitly contrast the hour from last lesson (and that the lib default *is* that hour — you're choosing shorter).
- Step 3 — `revokeSessionsOnPasswordReset` — meta on that line, **violet** (the hinge color — flag the climax). "Off by default. On. The 'why' is the next section's whole job; for now, register that the library will *not* evict old sessions unless this line says so."
- (Optional) Step 4 — meta on the enclosing `emailAndPassword: {` line, neutral/blue — "note where this lives: *inside* the block sign-up opened, because reset is a capability of email-and-password, not a separate subsystem like verification."

**Terms:** none new. (`CSPRNG`, `bearer token` already owned from L3 — reuse without re-Term'ing, or re-`Term` once for direct landers per the L3 precedent. Lean toward a single light reuse, not a re-teach.)

### Step 1 — the request, and the door that gives nothing away

**Goal:** write the `forgot-password` action as a five-seam twin, and re-apply enumeration discipline to *this* surface — but treat enumeration as a *known reflex the student owns*, applied to a new door, not a concept to re-teach.

The action is the **fourth instance** of the skeleton: Zod parse → empty authorize (public endpoint) → the library call → no revalidate → typed return. Describe it as pure wiring of a model the student holds. Schema: `forgotPasswordSchema` with `email` **normalized then validated** (`.trim().toLowerCase().pipe(z.email())`) — the same normalization L1 drilled, so a stray-case or stray-space email still resolves to the canonical account. Mutate seam = `auth.api.requestPasswordReset({ body: { email, redirectTo }, headers: await headers() })`, in `try/catch`.

**The enumeration move, applied not re-derived.** This is the second new public door of the chapter after L3's resend/verify. The rule the student already owns — *every entry point answers "does this email exist?" the same way* — applies here with a twist worth stating plainly: `requestPasswordReset` already returns a **uniform success regardless of whether the email exists** (no account → no email sent, but the caller can't tell). So the action's job is mostly to *not undo* that: never branch the `Result` on existence, never surface "no account with that email." The form renders one calm line: **"If an account exists for that email, we've sent a reset link."** Note the subtle, deliberate UX cost (the user who typo'd their email gets no "that's not us" feedback) — and that this cost is the *correct* trade, named on purpose, exactly as L1 framed the friendly-vs-opaque sign-up trade.

**Component:** a small **`Code` (`forgot-password-action`)** fence (`title="app/(auth)/forgot-password/actions.ts"` or similar) — the action is short and the student has seen the skeleton three times; a full `AnnotatedCode` would be over-scaffolding. A plain annotated-with-prose fence is right. Keep the `redirectTo` argument visible (it threads the reset destination, the same way `callbackURL` threaded in L3).

**`CodeVariants` (`request-leak-vs-safe`)** — the enumeration before/after, two tabs, red vs green, the same teaching device L1 used for sign-up enumeration. Tab A (**red**, "Leaks"): an action that catches a `USER_NOT_FOUND`-style error and returns a distinct `err('not_found', 'No account with that email')`, plus a form that renders it — narrate exactly how this rebuilds the oracle. Tab B (**green**, "Safe"): the action that returns the same `ok` either way and a form that renders the one uniform line. The contrast *is* the lesson.

**Terms:** `user enumeration` — re-`Term` once for direct landers (L3 precedent), short definition, no full re-teach.

### Step 2 — the reset itself: validate the token, set the new credential

**Goal:** write the `reset-password` action, and show where the token model the student owns from L3 is *reused* — same table, new namespace, shorter fuse — without re-explaining the two-secret split.

The page at `/reset-password` is a **Client Component** (new-password + confirm-password fields) — name *why* it's a client component (it owns interactive form state and the confirm-match check) in one clause, no deep dive. The action behind it is the fifth skeleton instance: `resetPasswordSchema` parses `token` (from the URL/hidden field), `newPassword` (**`.min(12)`** — here we *are* setting a credential, so the sign-up floor *does* apply, the mirror-image of L2's `password.min(1)` rule, and worth calling out as the deliberate contrast), and `confirmPassword` refined to match. Mutate = `auth.api.resetPassword({ body: { token, newPassword }, headers })`.

**Reuse, don't re-teach, the token machinery.** One tight paragraph: when the request fired, a `verification` row appeared — *the exact table and the exact hashed-token discipline L3 taught*, with two differences only: the `identifier` is namespaced `reset-password:<userId>` (not a bare email), and the fuse is 10 minutes. The raw token rides the link; the hashed value sits in the row; the library hashes the incoming token, looks it up in constant time, checks expiry, and **deletes the row on success** (one-time use by deletion — the same property, the same reason). Explicitly say: *you already own all of this from the verification lesson; the only deltas are the namespace and the expiry.* No `TokenTwoSecrets`-style figure here — L3 built it; pointing back is correct, rebuilding it is redundant.

**The failure path mirrors L3.** A bad/expired/already-used token collapses to **one** outcome — surface a single "this reset link is invalid or has expired, request a new one" with a path back to `/forgot-password`. Same three-causes-collapse-to-one move as L3's verify failure, named as a callback, not re-derived. **Note for the build agent (verified June 2026):** Better Auth redirects a bad/expired reset token to `…?error=INVALID_TOKEN` (uppercase) and a valid one to `…?token=VALID_TOKEN`; the reset page reads `searchParams` for the `token` and renders the error branch on `error=INVALID_TOKEN`. L3's MDX used a lowercase `invalid_token` for the *verify* endpoint — if the two endpoints genuinely differ in casing, match each to its real param; do not blindly copy L3's lowercase string onto the reset page.

**Component:** a **`CodeVariants` (`reset-action-faces`)** OR a single **`Code` fence** for the action — lean to a single `Code` fence (`title=".../reset-password/actions.ts"`) showing the schema + action together, since the skeleton is now deeply familiar; reserve `CodeVariants` budget for the session-invalidation contrast in the next section, which earns it more. Show the `confirmPassword` `.refine(...)` match — it's the one genuinely new bit of schema.

**Terms:** none new. Optionally a `CodeTooltips` on the action showing `auth.api.resetPassword`'s thrown `APIError` shape — but only if it doesn't duplicate L1/L2's already-taught `APIError` handling; a one-line "this throws on a bad token, mapped the same way `mapSignInError` did" is lighter and probably enough.

### Why a reset kills every session (the move that makes it a reset)

**Goal — the climax of the lesson.** Land the single property that distinguishes a secure reset from a back door, on its own, with full weight. This is the violet hinge.

Open with the threat model, concretely, because the property is invisible without it. *Why* does anyone reset a password? The honest answer isn't "they're forgetful" — from a security stance, a reset request means **the current password may already be compromised.** Maybe it leaked in a breach, maybe it was phished, maybe an attacker is *holding a live session right now*. Under that assumption, changing the password but leaving existing sessions alive accomplishes nothing against the attacker: their cookie still works, they keep acting, and the legitimate user's reset was theater. So the reset must do the thing that actually evicts them: **`DELETE FROM session WHERE userId = ?` — every cookie out there dies the instant the new password lands.**

**And here is the senior trap, the reason this is its own section instead of a config bullet:** Better Auth does **not** do this by default. Out of the box, `resetPassword` updates the credential and *leaves every existing session live*. You opt in with **`revokeSessionsOnPasswordReset: true`** — the flag from the config section. So a student who wires the happy path and never touches that flag ships a reset that *looks* complete (you reset, you're in) but is silently a back door: the attacker's session survives. Make this the gut-punch of the lesson — the most dangerous version of this flow is the one that runs perfectly and protects no one. The student configures *one line*, but must *understand* why, because the same discipline recurs in code they'll write by hand.

State the rule as a one-liner the student can carry: **a credential change must invalidate every session minted under the old credential — and you have to ask for it.** Then connect it forward: change-password-from-settings (Ch 054 L2) applies the *same* rule with one tweak — it revokes every session *except the current one* (`revokeOtherSessions: true` on `changePassword`), because there the user *is* authenticated and shouldn't sign themselves out. Reset has no "current session" to spare (the user is unauthenticated), so `revokeSessionsOnPasswordReset` takes them all. Naming both cases cements that this is a *principle* — an opt-in one — not a Better-Auth freebie. (This aligns with the Code-conventions Better-Auth rule: credential-mutating actions pass `revokeOtherSessions: true`.)

Land the post-reset UX call: with sessions cleared, the library issues **one** fresh session so the user lands signed in (consumer default — the click + new password proved control); high-stakes products instead bounce to `/sign-in` to force an explicit fresh sign-in. The senior call is which, and on what kind of product.

**Component — the load-bearing contrast.** A **`CodeVariants` (`invalidate-or-not`)** is tempting but session invalidation is library-default, so there's no real "two code paths" to show. Prefer instead a **custom lesson component, `sessions-after-reset.astro`** (build at `src/components/lessons/053/4/sessions-after-reset.astro`), inside a `<Figure>`. Describe it fully:

> Two side-by-side panels titled "Without invalidation (the back door)" and "With invalidation (a real reset)." Each shows the same starting state: a row of session chips — "Ada's laptop (just reset)", "Attacker's session", "Old phone" — labelled with the user/device. In the left panel, after reset, only a *new* "Ada's laptop" chip is added and the "Attacker's session" chip **stays live (red, still-valid)** — caption: "the attacker never logged out." In the right panel, after reset, the "Attacker's session" and "Old phone" chips are **struck-through/greyed (dead)** and a single fresh "Ada's laptop" chip is green — caption: "every old key is dead; the new password is the only way in." Colour the chips to echo the Ch 052 session-table styling for continuity with L1–L3's row figures. Pedagogical goal: make "the attacker survives a reset that doesn't invalidate" a single-glance, gut-level fact.
>
> `<Figure>` caption: "A reset that leaves old sessions alive is not a reset — it's a name change on a door the attacker still holds the key to."

**`MultipleChoice` (`why-invalidate`)** — a single multi-select (2+ correct flips it to multi-select mode, the L1 precedent) checking the *reasoning*: which statements explain why a reset must invalidate sessions. Correct: "the old password may already be in an attacker's hands"; "an attacker may be holding a live session right now"; "the new password is worthless as a defense if old cookies still work." Decoys: "it's required by GDPR" (no), "it makes the reset faster" (no), "Better Auth does it automatically, so it's just good manners" (no — it's **off by default** and is a deliberate, opt-in security choice via `revokeSessionsOnPasswordReset`; this decoy directly probes the default-vs-opt-in misconception the lesson is built to correct).

**Terms:** `session invalidation` — `Term` it (short def: revoking existing sessions so cookies minted under the old credential stop working). Reinforces the spine.

**`:::danger` aside (`invalidation-non-negotiable`):** the rule, stated starkly — "If your reset flow doesn't end every existing session, you've built an account-takeover convenience for whoever already has the password. Better Auth will **not** do this unless you set `revokeSessionsOnPasswordReset: true` — the default leaves old sessions alive. A reset that doesn't invalidate is the single most common way a 'working' auth flow is quietly broken, precisely because it passes every happy-path test."

### The reset email, and the line only a reset needs

**Goal:** the one template this flow needs — reuse L3's transactional-email discipline, add the single element that's *new* to reset.

The template lives at `emails/reset-password.tsx`, exports `ResetPasswordEmail`, takes `{ url }`, and is rendered by the config callback. React Email anatomy and the send pipeline are **already owned** (Unit 7, and L3 re-grounded it) — not re-taught. Same transactional discipline: one job, one CTA, plain-text fallback URL, an expiry line.

The one genuinely new element: a **"if you didn't request this, you can safely ignore it" line.** Explain *why this email specifically needs it* and the verify email didn't really: a reset email arrives unbidden to someone who may *not* have asked for it (an attacker can trigger a reset email to any address). That recipient needs to know that **inaction is safe** — that ignoring the email leaves their password untouched. It's a security-UX element, not boilerplate: it prevents a panicked user from clicking a link they didn't initiate, and it sets the expectation that a reset email alone changes nothing.

**Component:** a plain **`Code` (`reset-password-template`)** fence (`title="emails/reset-password.tsx"`), imports stripped per MDX rules (components from `@react-email/components`). Mirror L3's `verify-email-template` shape: `{ url }` prop, `<Button href={url}>`, plain-text URL, expiry line, **plus** the "if you didn't request this, ignore it" `<Text>`. Keep it minimal — the new line is the only thing to notice, so let the rest read as familiar.

**Terms:** `transactional email` already owned from L3 — reuse, optional single re-`Term` for direct landers.

### The token lives in the URL — why that's acceptable here

**Goal:** answer the question the student *should* be asking by now (we hash everything, why is a secret sitting in a clickable URL?), with the same honesty L3 gave the verify link, and re-apply the `safeNext` guard the student owns.

Name the exposure plainly: a token in a URL is visible in **browser history, `Referer` headers, and server/proxy logs.** That's real. The reset link is acceptable anyway because three mitigations stack:
- **Short expiry** (10 min) — the window for a leaked URL to be useful is tiny.
- **One-time use by deletion** — the row is gone the instant the reset succeeds, so a logged URL is already spent.
- **Don't log the URL** — `Referrer-Policy` defaults (the chapter's same-origin posture, Ch 054 L4) and not breadcrumbing full URLs into Sentry keep it out of the places it'd leak. (Some products move the token to the URL *fragment* for extra defense since fragments aren't sent to the server or in `Referer`; the default is fine — name the option, don't mandate it.)

This is the *same* reasoning L3 gave for the verify link's bearer-token character — explicitly say "you saw this exact argument for the verification link; reset is the same kind of bearer token with a shorter fuse and higher stakes," so it reads as reinforcement, not a new topic.

**Re-apply `safeNext`.** The `redirectTo` / post-reset destination is, like every `?next=` in this course, **untrusted input.** Any redirect *your* code performs after reset routes through `safeNext` (the `lib/redirects.ts` guard from L2) — same-site `/…` paths only, absolute and protocol-relative rejected. Better Auth validates its *own* redirect targets against `trustedOrigins`; your surrounding redirect is yours to guard. One-liner, callback to L2/L3, not a re-derivation.

**Component:** a small **`Buckets` (`url-token-mitigations`)** two-column drill, OR fold this into prose + a single `Term`. Lean toward **prose + Terms** here to control lesson length — the student has done two enumeration `Buckets` already (L1, L3); a third classification exercise risks fatigue. If an exercise is wanted, a 3-item `TrueFalse` ("a reset URL in a server log is dangerous *even after* the reset succeeded" → false, because one-time-use; etc.) is lighter and checks the reasoning.

**Terms:** `Referer` / `Referrer-Policy` (brief: the header that tells a destination which page you came from; the policy that can suppress it) — `Term` it, since it's a non-obvious mechanism the mitigation rests on. `open redirect` already owned from L2/L3 — reuse.

### When a reset still isn't enough: 2FA and the limits of the flow

**Goal:** set the honest ceiling on what a reset achieves, forward-point to L6, and pre-empt the misconception that "reset = full account recovery."

A reset proves "I can read this inbox" + "I set a new password." If the account has **2FA enabled (L6)**, a reset *alone does not get the attacker in* — sign-in after reset still demands the second factor. State why this matters: it's the layered-defense payoff. A leaked password, even combined with an attacker who controls the email forwarder and can intercept the reset link, *still* fails at the TOTP/passkey prompt. The reset rotates the knowledge factor; it never touches the possession factor. (This is the chapter outline's "2FA composition" point — keep it tight, it's a forward-pointer, not a section to fully develop.)

The flip side — the recovery gap: if the user has *also* lost their second factor, the reset link won't help; **recovery codes (L6)** are the path, and absent those, support-driven identity verification (outside the library's scope). Name it in one or two sentences so the student knows the boundary of what auth-flows-as-code can do.

Briefly name **rate limits** at the call site (the L1–L3 posture): both `requestPasswordReset` and `resetPassword` sit behind limits — per-IP stops an attacker harvesting reset emails across many accounts; per-email stops weaponizing the request endpoint to flood one inbox. Library defaults are sane; the full dual-key `safeLimit` wiring lands in Ch 074. One paragraph, named not built — identical treatment to L3's resend rate-limit note.

**Component:** none — this is prose, forward-pointers, and boundary-setting. Keep it short; it's the denouement after the climax, not new machinery.

**Terms:** none new (`2FA`/`TOTP` are L6's to define; here they're named with a forward-pointer, so a one-clause gloss in prose suffices, no `Term` needed).

### Closing — rebuild the flow, and the anti-patterns that still ship

**Goal:** consolidate via active recall, and inoculate against the legacy footguns in one sharp list.

Lead with the **`Sequence` ordering drill (`reset-order`)** moved here from the opening section — six steps, request to signed-in-with-dead-sessions, dragged into order. Placing it at the end tests *retention* of the skeleton the lesson built. Steps (source order): submit email on forgot-password → library mints + hashes a token and emails the link → user clicks the reset link → user submits a new password → the library validates the token and updates the credential → **every existing session is invalidated and one fresh session is issued.** The last step *must* foreground the invalidation, so the drill reinforces the spine.

Then a tight **anti-pattern callout** — the watch-outs from the chapter outline, framed as "things that still ship in real systems," each one a one-liner the student can pattern-match in a code review:
- **Emailing the new password back to the user.** The classic. A password sent over email is a plaintext credential in an inbox forever. Dead on arrival.
- **Distinct "email not found" vs "sent" responses.** Re-opens enumeration — the exact hole every other flow closed.
- **Shipping with `revokeSessionsOnPasswordReset` left at its default `false`.** The whole point, undone — and the most insidious footgun here precisely because the happy path passes (callback to the climax: the back door that runs perfectly).
- **Letting the link outlive its 10-minute fuse**, or reflecting `redirectTo` without `safeNext`.
- **Allowing the new password to equal the old** — name the *senior call*: whether to add that friction is a judgment, not an obvious yes; cite that it's a real trade (some standards require it, it annoys users, the library may not enforce it by default).

Render this as a `:::caution` aside or a compact `Card`/`CardGrid` of footguns — pick whichever reads tighter; the asides have carried the chapter's watch-outs so far, so a `:::caution` is the consistent choice.

Close with one sentence tying reset back into the chapter arc: the student has now built sign-up, sign-in, verify, and reset — the complete password lifecycle — and every one of them held the same enumeration line and leaned on the same `verification`-table primitive. What's left (magic links, 2FA, passkeys, OAuth) either *replaces* the password or *layers on top of it*.

### External resources

Four `ExternalResource` cards in a `<CardGrid>` (the L1–L3 pattern):
- **Better Auth — Email & Password / password reset.** The `sendResetPassword` callback (`{ user, url, token }`), `resetPasswordTokenExpiresIn`, the `revokeSessionsOnPasswordReset` opt-in, and the `requestPasswordReset` / `resetPassword` API surface plus the `?error=INVALID_TOKEN` / `?token=` redirect params. `icon="simple-icons:betterauth"` if it resolves, else a lucide glyph.
- **Better Auth — sessions & revocation.** Grounding for the session-invalidation property and how it composes with `revokeOtherSessions` for the change-password sibling.
- **React Email — `Button` / components.** Grounding for the one-CTA reset template; cross-links to the email unit rather than re-teaching. `icon="simple-icons:react"`.
- **OWASP — Forgot Password cheat sheet.** The canonical reference for the secure-reset properties (enumeration closure, short expiry, token handling, session invalidation). `icon="simple-icons:owasp"` if it resolves.

---

## Scope

**Prerequisites the student already owns (redefine in one clause max, never re-teach):**
- The five-seam Server Action shape (`parse → authorize → mutate → revalidate → return`), `Result<T>` / `ok` / `err`, `z.flattenError().fieldErrors` — Ch 043, and exercised three times in L1–L3.
- The two call faces (`authClient.*` returns `{ data, error }`; `auth.api.*` throws `APIError`) and the `mapXError` enumeration-collapse pattern — L1/L2.
- The `verification` table, the two-secret split (raw token in the link, hashed value in the row), bearer-token character, one-time-use-by-deletion, constant-time lookup — **L3 (this lesson reuses all of it under a new `identifier` namespace; it does NOT re-derive any of it).**
- User-enumeration threat model and the whole-path discipline — L1, re-applied to two new doors in L3, re-applied to the request endpoint here.
- `safeNext` / open-redirect closure — L2.
- The `emailAndPassword` block, `requireEmailVerification`, "the library owns the hash," `nextCookies` — L1/L2/Ch 052.
- React Email anatomy + the Unit 7 `sendEmail` wrapper — assumed built, not re-taught.
- `useActionState` form wiring that consumes the `Result` — **Ch 044 L3** (NOT Ch 045 — L1/L2 corrected this mis-citation; the forgot/reset forms plug in unchanged, one forward-pointer only).
- Email normalization (`.trim().toLowerCase().pipe(z.email())`) — L1.

**This lesson does NOT cover (reserve for their owners):**
- **Change-password-from-settings** (Ch 054 L2) — the *authenticated* sibling. Named as the place the session-invalidation discipline recurs with `revokeOtherSessions` (every session *except current*), but not built.
- **Recovery codes / the lost-second-factor path** (L6) — named only as the recovery route when 2FA is also lost.
- **2FA enrollment and the challenge UI** (L6) — named only as the layer a reset can't bypass; no mechanics.
- **Magic links** (L5), **passkeys** (L7), **OAuth** (L8), **account linking** (L9).
- **Full rate-limit wiring** — `safeLimit`, dual-key per-IP + per-email, `RateLimit-*` headers, Upstash (Ch 074). Named at the request/reset call sites only.
- **React Email template anatomy** (Ch 049) and **the send pipeline** (Ch 050) — owned, referenced, not re-taught.
- **`verification`-table mechanics from first principles** (L3) — reused under the `reset-password:<userId>` namespace, explicitly *not* re-derived.
- **`Referrer-Policy` / security-header configuration as a topic** (Ch 054 L4) — named as one of the URL-token mitigations, not configured here.
- **Authorization / RBAC at the action boundary** (Unit 9) — out of frame; reset is a pre-auth flow.

---

## Code-convention alignment notes (for downstream agents)

- **Schemas:** top-level `z.email()` (never `.string().email()`); `forgotPasswordSchema` / `resetPasswordSchema` follow the `<verbEntity>Schema` naming. `newPassword: z.string().min(12)` re-applies the sign-up floor (reset *sets* a credential — the mirror of L2's `password.min(1)` *check* rule; call the contrast out deliberately). `confirmPassword` via `.refine`/`.check` for the match.
- **Actions:** file-level `'use server';`; five-seam shape; `safeParse` first; `auth.api.*` in `try/catch`; return `Result`, never expose Better Auth messages (Code-conventions Better-Auth rule). `mapResetError` / reuse of `mapSignInError`-style mapping keyed on numeric HTTP `status` where possible (version-stable), exact code strings read off the client's `$ERROR_CODES`, not hardcoded (the L1/L2 discipline).
- **Better Auth posture:** all reset behavior flows through the single `auth` instance / `auth.api.*`; no parallel calls. Session invalidation on `resetPassword` is **opt-in** via `revokeSessionsOnPasswordReset: true` (NOT a default — verified June 2026, corrects the chapter outline) — present it as the senior-correct flag the course turns on, and connect it to the conventions' "credential-mutating actions pass `revokeOtherSessions: true`" rule for the change-password sibling (which is the analogous opt-in on `changePassword`).
- **Security baseline:** open-redirect closure via `safeNext` on any reflected `redirectTo`/`?next=`; dual-key rate limit named (built in Ch 074); token never logged.
- **MDX display:** strip imports in shown email/template code per §4 pedagogical rules; mark no `// new` churn unless showing a diff. The reset config additions land *inside* the existing `emailAndPassword` block — if shown as a diff against L1's block, mark the two added lines.
- **Deliberate pedagogical divergence to flag:** the actions are shown in a slightly flattened form (plain `Code` fences rather than full `AnnotatedCode` walkthroughs for the two actions) *because* the skeleton is the fourth/fifth repetition and over-annotating it would bury the one new idea (session invalidation). The annotation budget is deliberately spent on the config block and the session-invalidation figure, not the action wiring. Downstream agents: this is intentional, not under-scaffolding.
