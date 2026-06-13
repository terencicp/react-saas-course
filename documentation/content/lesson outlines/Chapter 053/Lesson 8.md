# Social sign-in with OAuth

- **Title (h1):** Social sign-in with OAuth
- **Sidebar label:** Social sign-in (OAuth)

---

## Lesson framing

Eighth flow lesson. Ch 051 L3 already taught the OAuth 2.1 + PKCE *protocol* (code-for-tokens, `state`, exact-match redirect URIs); this lesson is the **practical cash-out**: ship a working "Sign in with Google" button, register the redirect URI, watch the `account` table fill, and understand the find-or-create lookup the callback runs. The student already owns every primitive — the `[...all]` catch-all (Ch 052 L1), the `account` vs `user` split (Ch 052 L2), `env.ts` Zod schema (Ch 034 L1), the enumeration discipline (L1–L4), `safeNext` (L2). So the teaching weight is **not new code** — it's *configuration + a mental model of what the library does for you on the redirect round-trip*, plus the senior judgment calls (least-privilege scopes, per-environment credentials, token-at-rest, the OAuth-only-account UX gap) and a **per-provider quirks reference** (Google canonical; GitHub / Apple / Microsoft as the reference tier).

**Type:** setup + reference hybrid. The Google walkthrough is the spine; per-provider quirks are a scannable reference section the student returns to, not a linear read.

**Cognitive-load order (model before wiring, mirroring L1–L7):**
1. The senior question + the one structural thing that's *different* from password flows (the credential lives at the provider; you never see or store a password; the redirect round-trip is the whole flow).
2. What the library does on the callback (the find-or-create lookup) — the mental model, landed **before** any console screenshots, so the console steps have a purpose.
3. Configure the provider (env → `socialProviders` → console registration) — Google canonical.
4. The browser call + what lands in `account` post-callback.
5. The senior calls that bite in production (scopes, `email_verified`, token-at-rest, the OAuth-only-account UX gap).
6. Per-provider quirks reference (GitHub / Apple / Microsoft).

**The spine metaphor:** *"the password flow stores a secret you set; the OAuth flow stores a pointer to a session someone else owns."* The `account` row for a Google sign-in holds no password — it holds `(providerId, accountId)` plus provider tokens. Sign-in is "the provider vouched for this identity," not "this person knew a secret we stored." Everything (the lookup logic, the OAuth-only-account gap, the token-at-rest decision) falls out of that.

**Inherited conventions that MUST hold (from continuity notes — a reviewer grounding on the chapter outline alone will try to "restore" the stale versions):**
- **Color palette** (L1–L7): blue = config knobs / parse, orange = library call / endpoint / callback, green = session / success, **violet = the hinge** (here: the find-or-create lookup, and the `encryptOAuthTokens` decision), red = insecure/attacker variant.
- **Server/client call faces:** `authClient.signIn.social(...)` returns `{ data, error }`; `auth.api.*` throws `APIError`. (Here the *browser* triggers the redirect — there is no `signUp`-style Server Action wrapping the OAuth start; the button calls the client method directly. Name this divergence explicitly — do NOT force the L1–L4 five-seam action skeleton onto the OAuth start; the catch-all owns the callback.)
- **Enumeration discipline** extends to a new surface: the OAuth-only-account mistype.
- **`safeNext`** guards any `callbackURL`/`?next=` *your* surrounding code reflects; the library validates only its own redirects via `trustedOrigins`.
- **Env:** `<PROVIDER>_CLIENT_ID` / `<PROVIDER>_CLIENT_SECRET` go through the `lib/env.ts` Zod schema, never `process.env` directly.

**Corrections vs the chapter outline (verified against Better Auth docs, June 2026 — flag these so downstream agents don't restore the stale shapes):**
1. **There is no per-provider `onSuccess` hook.** The outline's `socialProviders.<provider>.onSuccess` does not exist. Post-callback side-effects (welcome email, analytics) ride global **`databaseHooks.user.create.after`** (fires once, only on first-time-OAuth user creation) or the global `hooks` middleware. `mapProfileToUser` *is* real (field remap before user creation). Teach `databaseHooks.user.create.after` as the welcome-email seam.
2. **Account linking is ON by default** (`account.accountLinking.enabled` defaults `true`). The outline framed L9's `enabled: true` as the thing that *unlocks* link-on-email-match — but the real default already links *when the provider is trusted*. The lookup logic must say: link-on-email-match happens **only for trusted providers**, and `trustedProviders` has **no default list** (you must name them). The *consequence* (does a same-email OAuth sign-in fold into the existing user or create a second) is decided by `trustedProviders` — which is L9's surface. L8 names the lookup order and points the *configuration* of trust to L9.
3. **Refresh tokens are not automatic.** `account.refreshToken` is populated only when the provider issues one — for Google that needs **`accessType: 'offline'`** paired with **`prompt: 'select_account consent'`** (space-separated, re-issues the refresh token on every consent). The outline's "refreshToken populated" is conditional. Teach `accessType: 'offline'` as the knob, gate it on "only if you call the provider's API later." (Heads-up for the build agent: there's a known Better Auth `prompt`-type mismatch — the space-separated `'select_account consent'` is the value Google wants; verify it type-checks against the installed version's `prompt` union and fall back to `prompt: 'consent'` if the combined literal isn't typed yet.)
4. **`email_verified` mapping is provider-specific.** Google consumer accounts report `email_verified: true`; Workspace may not. Apple serializes `email_verified` as the **string** `"true"`, not a boolean. GitHub's provider may assume verified without querying `/user/emails`. So `user.emailVerified` post-OAuth is "trust the provider's claim" — name it as a decision, not a guarantee.
5. **`account.encryptOAuthTokens` defaults to `false`** — tokens land in the DB in plaintext unless you opt in. This is L8's "the library doesn't do X by default" hinge (the lesson's analogue of L4's `revokeSessionsOnPasswordReset` / L5's `storeToken`). Surface it as the senior override when tokens are actually stored.
6. **GitHub private-email is a real null-email footgun**: `user:email` scope lets you *query* emails, but `GET /user` still returns `email: null` for private addresses; the primary verified address is at `/user/emails`. Never assume `user.email` is non-null on a fresh GitHub sign-up.

No live sandbox (Better Auth is server-side against Postgres + a real OAuth redirect to an external consent screen; ReactCoding is react-family only). Checks of understanding are recall / ordering / classification / decision.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, in the pedagogy's "decisions before syntax" shape. The user clicks **"Sign in with Google"** and is back in your app, signed in, seconds later. What actually happened, what did you have to configure, and — the part that bites — **where did their identity get stored, and what happens the *second* time they sign in, or when they'd already signed up with a password?**

Connect to prior knowledge in two sentences: Ch 051 L3 taught the OAuth 2.1 protocol (the redirect dance, PKCE, `state`, exact-match redirect URIs) — that's the *how the bytes move*; this lesson is *how you turn it into a button*. The catch-all from Ch 052 L1 already receives the callback; you're configuring a provider and understanding what the library does when the redirect lands.

State the one structural shift up front (the spine): password flows **store a secret the user set** (the Argon2/scrypt hash on `account.password`, L1); OAuth flows **store a pointer to an identity the provider owns** — no password, just `(providerId, accountId)` and some tokens. "The provider vouched for them" replaces "they knew our secret." Preview the end state: a working Google button, the right redirect URI registered per environment, and a clear-eyed view of the find-or-create lookup, scopes, and the OAuth-only-account UX gap.

Keep it warm and brief. No section header (per lesson structure).

### What the library does when the redirect lands

**Goal:** install the mental model of the callback's find-or-create lookup *before* any console setup, so the configuration steps have a destination. This is the load-bearing concept of the lesson.

Frame it as: you wire the button; the library owns everything between the click and the session. Walk the round-trip at the right altitude (Ch 051 L3 owns the PKCE/`state` byte-level detail — recap in one sentence, don't re-derive):

1. Click → `authClient.signIn.social({ provider: 'google' })` → browser redirects to Google's consent screen (library attaches `state` + PKCE challenge).
2. User consents → Google redirects back to `…/api/auth/callback/google?code=…&state=…` (the catch-all, no new route).
3. Library validates `state`, exchanges `code` for tokens (PKCE), reads the provider's `userinfo`.
4. **The find-or-create lookup (the violet hinge):** the library now decides *who this is*, in order:
   - **Look up by `(providerId, accountId)`** — is there already an `account` row linking this exact Google identity to a user? **Yes → sign that user in** (returning user; the common case).
   - **No → look up by email** — does a `user` with this email already exist (e.g. they signed up with a password in January)? **Yes, and the provider is trusted → link**: insert a new `account` row (`providerId: 'google'`) against the existing user, sign in. **Yes, but the provider is NOT trusted → refuse** with `account-not-linked` (the safe default — don't auto-merge on an unverified email claim).
   - **No user at all → create one**: new `user` (+ `account`), `emailVerified` set from the provider's claim, sign in. This is **first-time-OAuth sign-up** — one round-trip, no separate verification email (the provider already verified the inbox).
5. Library issues a session (`nextCookies`), redirects to `callbackURL`.

The teaching point: **two different "new" outcomes hide behind one button** — sign-in-as-existing (account row already there), link-to-existing (email matches a prior account), and create-new. Which one fires depends on what's already in the DB and whether the provider is trusted. Name that `trustedProviders` configuration and the `allowDifferentEmails`/`accountLinking` knobs are **L9's surface** — here you only need to know the *lookup order* and that **linking-on-email-match is on by default but gated on the provider being trusted, and `trustedProviders` has no default list** (so until L9 wires it, a same-email Google sign-in against a password account refuses rather than links — that's the safe default, not a bug).

**Diagram — `DiagramSequence` `oauth-callback-flow` (the named load-bearing visual):** ~6 steps, reusing the palette. Click (blue) → Redirect to consent (orange) → Consent + redirect back to catch-all (orange) → **Find-or-create lookup** (violet — this step should visibly *branch* into the three outcomes: sign-in-existing / link / create) → Issue session (green) → Land on `callbackURL` (green). The branch at the violet step is the whole point of the diagram; render the three outcomes as three labelled arrows off that node. Caption contrasts with the password flow ("no password stored; the provider's vouch is the credential"). Pedagogical goal: make the invisible callback legible and foreground that the same button has three landing states.

**Exercise — `Sequence` `oauth-roundtrip-order`:** drag the 6 round-trip steps into order (click → consent redirect → callback → lookup → session → land). Cheap recall that locks the flow before configuration. Keep it short; the keystone exercise is the buckets later.

`Term` candidates here: **consent screen**, **`userinfo`** (the provider's profile endpoint), **`account-not-linked`** (the refusal code when an untrusted/unmatched email collides).

### Configuring Google as the canonical provider

**Goal:** the end-to-end "make the button real" path, Google as the worked example. Three layers, in dependency order: env → `socialProviders` config → provider-console registration. This is the spine the student copies.

**1. Env entries (blue).** Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the `lib/env.ts` Zod schema (Ch 034 L1 — reference, don't re-teach the env pattern). Two senior calls, stated as rules not asides:
- **Per-environment credentials.** Separate OAuth clients for dev / staging / production at the provider console — a leaked staging secret never touches production. (This is the OAuth-2.1 exact-match redirect rule from Ch 051 L3 cashed out: each environment has its own redirect URI registered, no wildcards.)
- Never read `process.env.GOOGLE_*` directly — through the validated `env` object only (a missing secret should fail at boot, not at the first sign-in attempt).

Show as a small `Code` fence (the env schema delta) — this is a 2-line addition, not worth an `AnnotatedCode`.

**2. The `socialProviders` config (blue, with violet on the token decision).** The block added to `betterAuth({...})` in `lib/auth.ts`:

```ts
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    // accessType: 'offline',  // only if you call Google's API later (L: token persistence)
  },
},
```

Use **`AnnotatedCode`** here (`google-provider-config`, ~4 steps): step on `clientId`/`clientSecret` (blue, pulled from validated env), step on the **absent `redirectURI`** (it defaults to `<baseURL>/api/auth/callback/google` — exactly what the catch-all serves; leave it undefined unless auth is mounted at a non-default path — name this so the student doesn't add a redundant/wrong override), step on `accessType: 'offline'` shown commented (violet-adjacent — the refresh-token knob, gated on "only if you store tokens to call the API later," forward-pointer to the token-persistence section), and a final step showing **how providers stack** (`{ google: {...}, github: {...} }`) — naming that the per-provider quirks section covers the others.

**3. Provider-console registration (Google Cloud Console).** This is procedural and external — use **`Steps`** (numbered procedure the reader follows). Keep it tight and current; the goal is "the six things you click," not a Google tutorial:
1. Create a project in Google Cloud Console.
2. Configure the **OAuth consent screen** — publishing status (testing = only listed test users; in-production = anyone), support email, and scopes (`openid email profile` for plain sign-in; sensitive scopes trigger Google app review).
3. Create **OAuth client credentials**, type **Web application**.
4. Register **Authorized redirect URIs** — `http://localhost:3000/api/auth/callback/google` for dev, plus the staging and production URLs, each **exact** (the exact-match rule — a trailing-slash mismatch silently fails one environment).
5. Copy `client_id` / `client_secret` into that environment's `env`.
6. Test the full loop — button → consent → callback → session.

Pair the redirect-URI step with a **`:::caution`** on the trailing-slash / scheme exact-match footgun (it's the single most common OAuth-setup failure and worth isolating). Reference: link Better Auth's Google doc + Google's OAuth-client doc as `ExternalResource` cards (console UI shifts; the card is the live source of truth, the lesson is the concept).

`Term` candidates: **OAuth consent screen**, **scopes**, **`client_id` / `client_secret`**.

### The button and what lands in `account`

**Goal:** the smallest possible client code + the payoff — seeing the `account` table fill. Reinforces the spine (no password; a pointer + tokens).

**The browser call.** One line, a `Code` fence (tsx): `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`. State plainly: this is **not** wrapped in a five-seam Server Action — the call *triggers a redirect*, there's no FormData/Zod/`Result` boundary on the OAuth *start* (the catch-all owns the callback and the session). A `:::note` makes this divergence explicit so a reader pattern-matching off L1–L4 doesn't try to build a `signInWithGoogleAction`. The button is a plain client `onClick` (or a small form posting to the client call) — the surrounding page can still be a Server Component; only the button is client.

Name `callbackURL` rides through to the post-callback redirect and is validated by the library against `trustedOrigins`; if *your* code ever reflects a `?next=` into that call, route it through **`safeNext`** (L2 guard, reused — one sentence).

**What's in `account` after a successful Google sign-in.** This is the concrete payoff. Show the row's shape and contrast it with the `'credential'` row from L1. Use the lesson-specific component **`src/components/lessons/053/8/account-row-after-oauth.astro`** (a row-card echoing the Ch 052 ER-diagram colors, the same visual language as L1's `rows-after-signup` and L3's `token-two-secrets`): an `account` row with `providerId: 'google'`, `accountId: <google sub>`, `accessToken` / `idToken` populated, `refreshToken` only if `accessType: 'offline'` was set (grey it out otherwise — mirrors L1's greyed-absent-`session` treatment), `scope: 'openid email profile'`, `expiresAt`; and the `user` row filled from the profile (`email`, `name` from `name`, `image` from `picture`, `emailVerified` from the provider's `email_verified` claim). The `password` column is **absent/null** — the visual contrast that drives the spine home: *this account row has no secret of its own.*

Pedagogical goal of the component: side-by-side or annotated row-card making "OAuth account = pointer + tokens, no password" a thing the student *sees*, not just reads.

`Term` candidates: **`accountId`** (the provider's stable user id — *not* a secret, the provider's public-ish identifier; clarify it's safe to log, unlike tokens), **`idToken`**, **`accessToken`**.

### The senior calls that bite in production

**Goal:** the judgment layer — the four decisions juniors get wrong. Each is a short, decision-framed subsection. These are the "what a senior does differently" beats the pedagogy demands; keep each tight and consequence-driven. Use `h3` subsections so the production-stakes framing is scannable.

#### Scopes: least privilege, and why extra scopes are a tax on *every* user

Plain sign-in needs only `openid email profile`. The trap: adding a scope (`calendar.readonly`, `drive.file`) to the sign-in config puts it on the consent screen for **every** user at sign-in — most of whom never touch the feature — tanking conversion and inviting Google's app-review. The pattern: **sign-in asks for basics; a feature that needs more does its own incremental request at the moment the user opts in** (via `linkSocial({ provider, scopes })` — name it, it's L9's mechanism, used here only to make the "per-scope-per-feature" point). The rule the student carries: *scopes are a conversion-and-trust cost paid by everyone, charged at sign-in — only ask for what sign-in itself needs.*

#### `email_verified`: the provider's claim is an input, not a guarantee

`user.emailVerified` after OAuth is set from the provider's claim. Google consumer accounts report `email_verified: true` (so the user skips the L3 verification email — the OAuth sign-up *is* verified). But: **Workspace** accounts may report it false/absent; **Apple** serializes it as the **string** `"true"` (not a boolean — a `=== true` check silently fails); **GitHub** may assume verified without checking. The senior call: *trust the provider for consumer Google; for mixed/enterprise audiences, treat `emailVerified` as a claim you may want to re-verify on top.* Tie back to L3: `emailVerified` is still the **capability floor, not the ceiling** — per-action authz (Unit 9) runs regardless.

#### Token persistence and `encryptOAuthTokens` (the L8 hinge — violet)

The decision: **do you even need to keep the provider tokens?** For **pure sign-in**, the tokens land at callback and are *never read again* — the app trusts its own session cookie, not Google's `accessToken`. For products that **call the provider's API later** (read the user's calendar, push to their Drive), the tokens are read on demand and refreshed via `refreshToken` (which requires `accessType: 'offline'` at config). The rule: *keep tokens only when you actually use them.*

When you do store them, the hinge: **`account.encryptOAuthTokens` defaults to `false`** — a leaked DB dumps live provider tokens in plaintext. Set `account: { encryptOAuthTokens: true }` whenever tokens are persisted-and-used. This is L8's instance of the chapter's recurring "the dangerous version is the one that runs perfectly and protects no one" (L4's `revokeSessionsOnPasswordReset`, L5's `storeToken: 'hashed'`): the happy path works either way; only a breach reveals the gap. Show as a small `Code` fence (the `account` config block) with a **`:::danger`** on the plaintext-by-default default. Violet beat.

#### The OAuth-only account: the mistype that generates support tickets

The structural gap, and the most product-relevant beat. A user who signed up with Google has **no `'credential'` row** — no password exists. When they later (forgetfully) type their email + a password into the password form, the library correctly returns **`'invalid-credentials'`** (enumeration-safe — same shape as a wrong password). But the *user* is confused: they have an account, they just don't sign in this way. Better Auth won't fix this for you. The senior reach: on `'invalid-credentials'`, check whether that email has any `'credential'` account row; if it has only an OAuth account, surface **"This email signs in with Google"** with a provider button. Name the **enumeration trade explicitly** (L1's discipline applied to a new surface): this *does* leak "an account exists for this email" — it's a **deliberate** support-cost-vs-enumeration-cost trade, decided on purpose, the same shape as L1's "friendly already-registered message" call. Costs one query; pays for itself in tickets. Frame the default as opaque, the friendly branch as a conscious choice.

**Exercise — `Buckets` `oauth-account-outcomes` (the keystone, do NOT cut):** two-column classification. Present scenarios; student sorts into the outcome the callback (or the password form) produces. Items span the find-or-create lookup *and* the OAuth-only gap, e.g.: "returning Google user (account row exists)" → *sign in existing user*; "new email, never seen" → *create user + account, no verification email*; "email matches a password account, Google is trusted" → *link a second account row*; "email matches a password account, provider untrusted" → *refuse (`account-not-linked`)*; "OAuth-only user types email+password" → *`invalid-credentials` (no `credential` row)*. This drills the single most-misread thing in the lesson — that one button has multiple landing states and the password form has a confusing failure for OAuth users. Grading: each item lands in exactly one bucket; the two "email matches" cases (trusted vs untrusted) are the discriminating pair.

### Per-provider quirks: a reference, not a tutorial

**Goal:** the reference tier. The student configures Google once; the others are "same shape, these gotchas." Frame explicitly as a **scan-and-return reference**, not linear reading. Best vehicle is **`TabbedContent`** (one tab per provider — Google / GitHub / Apple / Microsoft) so each provider's quirks are isolated and the student jumps to the one they're adding. Each tab is a tight bulleted gotcha list, not prose.

- **Google** (recap + the two knobs not yet shown): `prompt: 'select_account'` forces the account-picker every sign-in (useful when users have multiple Google accounts); `accessType: 'offline'` + `prompt: 'select_account consent'` is the combo that yields a refresh token (only if you store/use tokens — forward to the token-persistence section); consent-screen publishing (testing = test users only; in-production = anyone, sensitive scopes need review). Already the spine — this tab is a one-line recap + the `prompt`/`accessType` knobs.
- **GitHub:** default scope returns **public** profile only — **`user.email` can be `null`** if the user's email is private. Reach for the `user:email` scope, but know `GET /user` still returns null for private addresses; the primary verified address lives at `/user/emails`. **Never assume `user.email` is non-null on a fresh GitHub sign-up** — a null email breaks every downstream surface that keys on it (welcome email, `account` lookup). The most production-relevant non-Google quirk; give it the most ink.
- **Apple:** returns the user's email/name **only on the *first* sign-in** — subsequent sign-ins return only the `sub`; the app must persist the email at first sight (Apple has no `userinfo` endpoint). Better Auth stores it at first sign-in; trust that storage after. Apple requires **`responseMode: 'form_post'`** when requesting name/email (the callback is a `POST`, not a `GET`) — the catch-all handles this transparently. And `email_verified` / `is_private_email` arrive as **strings** (`"true"`), not booleans (the `=== true` footgun from the `email_verified` section).
- **Microsoft (Entra):** the **`tenant`** parameter selects the audience — `consumers` (personal MS accounts), `organizations` (work/school), or `common` (both). B2B SaaS picks `organizations`; consumer picks `common`. Naming it is enough — the mechanics are the same `socialProviders` shape.

Pedagogical goal of `TabbedContent`: keep four providers' gotchas co-located but non-interfering, so adding "Sign in with GitHub" later is a 30-second lookup. Close the section by naming that the **`genericOAuth()` plugin** covers any provider Better Auth doesn't ship built-in (same config shape, you supply the authorize/token/userinfo URLs) — one sentence, it's a deferred sibling, not taught.

`Term` candidates: **`tenant`** (Microsoft audience selector), **`sub`** (the OIDC subject / stable provider user id), **`responseMode` / `form_post`**.

### Post-callback hooks: side-effects done right

**Goal:** close the "where does the welcome email fire?" question the chapter's Unit-7 thread sets up, and correct the outline's non-existent `onSuccess`. Keep it short — it's a seam, not a flow.

Two real seams (there is **no** per-provider `onSuccess`):
- **`mapProfileToUser`** (per-provider, blue) — remap profile fields *before* the user row is created (e.g. split the provider's `name` into `firstName`/`lastName`, or pull a non-default field). Runs in the create path. Show as a tiny `Code` fence.
- **`databaseHooks.user.create.after`** (global, orange) — fires once, when a brand-new user is created (which for OAuth means first-time-OAuth sign-up). **This is the welcome-email seam** — call the Unit 7 `sendEmail` pipeline here. State the discipline: hooks are **small and side-effecting only**; the row insert and session issuance already happened before the hook fires, so a slow/throwing hook shouldn't block sign-in (fire-and-forget the email, don't `await` it into the critical path). Connect to the chapter's Resend thread (Ch 050) — the welcome email *send path* the student already built plugs in here.

A `:::note` corrects the mental model directly: "side-effects after OAuth sign-in ride global `databaseHooks` / `hooks`, not a per-provider callback." Keep the whole section to ~two short code fences + the discipline.

`Term` candidates: **`databaseHooks`**, **`mapProfileToUser`**.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- OAuth 2.1 + PKCE protocol mechanics (code-for-tokens, `state`, exact-match redirect URIs) — **Ch 051 L3**. Recap in a single sentence; this lesson assumes the protocol and only cashes it into config.
- The `[...all]` catch-all that serves `/api/auth/callback/<provider>`, the `auth` instance in `lib/auth.ts`, the `account` vs `user` split, `nextCookies()`, server-vs-client call faces, `trustedOrigins` — **Ch 052**. Named, not re-derived.
- `lib/env.ts` Zod env schema — **Ch 034 L1**. Reference the pattern; show only the `GOOGLE_*` delta.
- Enumeration discipline (same response shape regardless of email existence), `APIError`, the `'invalid-credentials'` code — **L1/L2**. Re-applied to the OAuth-only-account surface; `Term`'d once for direct landers.
- `safeNext` open-redirect guard (`lib/redirects.ts`) — **L2**. One-sentence reuse.
- `emailVerified` is the capability floor not authorization — **L3**. One-sentence callback.

**This lesson does NOT cover (defer, do not teach):**
- **Account linking configuration** — `account.accountLinking` knobs (`trustedProviders`, `allowDifferentEmails`), link-on-sign-in vs link-from-settings, `linkSocial` as an explicit settings action, the unlink guard — **L9**. L8 names the *lookup order* and that linking-on-email-match is default-on-but-trusted-provider-gated; L9 owns the *configuration* of which providers are trusted and the explicit link/unlink flows. (Mention `linkSocial({ scopes })` only as the mechanism for the incremental-scope point — do not teach its flow.)
- **Server-side OAuth for provider-API access** (calling Google's API with the stored tokens, token refresh mechanics, scope-on-demand flows) — out of the library's auth scope; named in the token-persistence section as "only when you use them," not built.
- **`genericOAuth()` plugin** for non-built-in providers — named once as the deferred sibling (same config shape, you supply the URLs), not configured.
- **Enterprise SSO** — SAML 2.0 / OIDC federation against a customer's own IdP ("log in with our Okta / Entra ID"), via the separate `@better-auth/sso` (`sso()`) plugin — distinct from `socialProviders` and `genericOAuth()`. Named once in the "Where to go next" close as the B2B-procurement reach; not configured. Keep "SSO" scoped to enterprise IdP federation only — never use it for "sign in with Google."
- **Full rate-limit wiring** (dual-key per-IP+per-email, `safeLimit`, `RateLimit-*` headers, Upstash) — **Ch 074**. OAuth start/callback sit behind the same limiter; name at the call site only.
- **`emailOTP`/SMS/passkey-as-OAuth-alternative** comparisons — other lessons own those; L8 stays on social OAuth.
- **The `useActionState` form wiring** — there's no Server Action on the OAuth start, so no form-state plumbing here; the button is a direct client call (this is itself a teaching point, per the `:::note`).

---

## Code conventions notes (for downstream agents)

- **Env:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` through the `lib/env.ts` Zod schema; never `process.env.*` in `lib/auth.ts`. (Conventions: schemas section.)
- **No five-seam action on the OAuth start** — this is a *deliberate* divergence from the universal Server-Action shape (Conventions: Forms and Server Actions). The OAuth *start* is a client redirect; the *callback* is the catch-all route handler the library owns. Flag it with a `:::note` so it reads as intentional, not an omission. Do not invent a `signInWithGoogleAction`.
- **`auth` instance discipline:** the `socialProviders` block lives in `lib/auth.ts` alongside `emailAndPassword` / `emailVerification` (siblings, all on the one `betterAuth({...})` instance). `lib/auth-client.ts` needs **no** extra plugin for built-in social providers (unlike `magicLink()`/`twoFactor()`/`passkey()` — built-in social providers are config, not a plugin; state this so the student doesn't go looking for a `socialClient()`).
- **`Result` codes:** the OAuth-only-account branch surfaces through the existing `mapSignInError` → `'invalid-credentials'` (the `unauthorized` code in `lib/result.ts`); the friendly "signs in with Google" branch is an *additive* UX layer, not a new code.
- **Token-at-rest:** `account: { encryptOAuthTokens: true }` whenever tokens are stored (Conventions: Authentication — credential/secret handling posture). Never log `accessToken` / `idToken` / `refreshToken`; `accountId` is *not* a secret and may be logged.
- **`safeNext`** on any reflected `callbackURL`/`?next=` (Conventions: security baseline).
