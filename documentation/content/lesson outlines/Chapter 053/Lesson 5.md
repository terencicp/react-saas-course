# Magic links

- **Title (h1):** Magic links
- **Sidebar label:** Magic links

---

## Lesson framing

Fifth flow lesson of Ch 053. **Decision + mechanics hybrid** — the teaching weight is the *product call* (when passwordless earns it over email+password), not new code. By L5 the student has wired four near-identical five-seam actions (L1 sign-up, L2 sign-in, L3 verify, L4 reset) and already holds every primitive magic-link needs: the `verification` table, the two-secret token model, bearer-token + one-time-use-by-deletion, enumeration-as-whole-path-property, `safeNext`, the Unit 7 `sendEmail` wrapper, the `[...all]` catch-all. So this lesson does **not** re-derive token mechanics — it *names them as already-owned* and spends its budget on (a) the threshold decision and (b) the handful of ways magic-link genuinely differs from what came before.

Cognitive-load order (mirrors the chapter's model-before-wiring spine): **threshold decision first** (when does this pattern win?) → **the plugin** (three knobs) → **the four-step flow** (a scrubbable sequence) → **the four ways it differs** (single-use/rotation reused-but-named; the bearer-token-in-a-different-browser reality; coexistence with passwords; first-time-click *is* sign-up). Decision before syntax, exactly as the pedagogy demands for a conditional power-tool: the lesson opens by naming the threshold the default (email+password) crosses, never "here's how to install magicLink."

Mental model the student leaves with: **"the inbox is the credential."** A magic-link click proves one thing — control of the email account — and trades a remembered secret (password) for a delivered secret (link). Everything else (when to reach for it, why 5-min expiry, why deliverability is the dominant risk, why it still composes under MFA) falls out of that one sentence.

What the student can do at the end: decide whether a given SaaS should offer magic-link, configure the `magicLink()` plugin with correct knobs (including the security-relevant `storeToken: 'hashed'` that the library does **not** default), wire its send callback through the existing Resend pipeline, and reason about its failure modes (forwarded link, broken delivery, coexistence confusion).

Where beginners go wrong (lead the lesson into these): defaulting to magic-link for daily-use SaaS because it looks modern → users hate the per-sign-in inbox round-trip; shipping it as the *only* method with no fallback when delivery breaks → users locked out; assuming the token is hashed at rest (it isn't by default) → DB snapshot yields live links; re-introducing the enumeration oracle with distinct "no such email" copy when `disableSignUp: true`.

**Crucial correction vs chapter outline (verified June 2026):** the outline claims same-browser binding "exists as an opt-in (compares fingerprints)" on the plugin — **no such toggle exists** in the current `magicLink()` API. Teach the *reality* (the token is bearer/browser-agnostic; short expiry is the mitigation; device-pinning is a general product technique you'd hand-build, not a plugin flag), do not invent an API. Second correction: magic-link tokens default to **`storeToken: 'plain'`** (plaintext at rest) — the course's "never store the raw token" posture from L3 means the student **must set `storeToken: 'hashed'`** explicitly; this is a genuine divergence from L3 where the library hashed for you. Make it a teaching beat, not a footnote.

No live sandbox (Better Auth is server-side against Postgres; ReactCoding is react-family only — see MEMORY). Checks of understanding are decision/recall/classification only.

Inherit the established color palette from L1–L4: **blue** = parse/config knobs, **orange** = library call/endpoint, **green** = session/success, **violet** = the hinge/decision, **red** = insecure variant.

---

## Lesson sections

### Introduction (no header)

Open on the concrete experience every reader has lived: type your email into Slack/Notion/Substack, get a "we sent you a link," click it on your phone, you're in — no password typed, none remembered. Name the senior question implicitly: *when is this the right call, and when is it a usability tax?* State the lesson promise: by the end you can make that call and wire the `magicLink()` plugin, reusing every token primitive you already built in L3/L4. Warm, three-to-four sentences. Do **not** lead with installation.

### When the inbox beats the password

**The decision section — the heaviest beat in the lesson.** Frame magic-link as a *conditional power tool*: the year-1 SaaS default is email+password + optional 2FA (established across L1–L4 and restated in one line here); magic-link is a deliberate reach, not a default. Teach the threshold as a senior would weigh it, not as a feature list.

Where it **wins**:
- **Infrequent sign-in** — user shows up weekly/monthly (Slack-style). The dominant credential risk at that cadence is password *reuse* (they'll reuse or forget); removing the password removes the risk. The inbox round-trip is cheap when it's rare.
- **Non-technical user base where reset volume swamps support** — "forgot password" tickets are the support cost magic-link deletes.
- **Email already central to the product** — mailing-list tools, newsletter platforms (Substack): the user already lives in their inbox; the link meets them there.

Where it **loses**:
- **Frequent sign-in** — the inbox round-trip is friction on *every* session; daily-use SaaS users resent it.
- **Shaky deliverability** — corporate Outlook / aggressive filtering means sign-in becomes hostage to an email landing. (Foreshadow the deliverability section.)
- **Hard MFA mandate** — TOTP/passkeys compose *less cleanly* without a password anchor; if the product handles money, the password-plus-second-factor baseline is simpler to reason about.

**Component — `StateMachineWalker`, `kind="decision"`.** This is the right tool: it forces the student through the *order a senior asks the questions in* (cadence → user-base → deliverability), one branch at a time, ending on a verdict leaf. Pedagogical goal: the lesson lives in the decision order, not in any single answer. Sketch:
- Root `Question` "How often does a typical user sign in?" → branches "Daily" / "Weekly-or-rarer."
- "Daily" → `Leaf` verdict **"Stick with email+password"** (round-trip friction every session; magic-link is a tax here).
- "Weekly-or-rarer" → `Question` "Is hard MFA (money/admin) required?" → "Yes" → `Leaf` **"Email+password + TOTP/passkey"** (cleaner MFA anchor; magic-link optional as a convenience alt). "No" → `Question` "Is deliverability reliable for your users (consumer inboxes vs locked-down corporate)?" → "Reliable consumer inboxes" → `Leaf` **"Magic-link earns the call"** (reuse-risk gone, support load down). "Locked-down corporate" → `Leaf` **"Offer it, but keep email+password as the fallback"** (delivery can't be the single point of failure).

Do **not** also ship a static comparison table — the walker *is* the comparison and a table would duplicate it. (Chapter outline suggested a "password vs magic-link vs both" table; the walker subsumes it. If the build agent prefers a table, it replaces the walker, not adds to it — one decision artifact, not two.)

**Terms:** none new here; this is prose + the walker.

### Installing the plugin

The mechanics, kept tight. The `magicLink()` server plugin added to `betterAuth({ plugins: [...] })` in `lib/auth.ts`, and its matching client plugin `magicLinkClient()` in `lib/auth-client.ts` (state the two-plugin-set rule the Code conventions mandate — server and client plugin lists must match, established Ch 052). Three knobs the student sets, plus the one the library gets wrong:

1. **`sendMagicLink: async ({ email, url }) => sendEmail({ to: email, subject, react: MagicLinkEmail({ url }) })`** — the same callback *shape* as L3's `sendVerificationEmail` / L4's `sendResetPassword`; library mints the token and builds the fully-formed `url` (student mints no token, builds no URL — reuse the L3 framing in one line). Body is one line through the Unit 7 wrapper.
2. **`expiresIn: 60 * 5`** — 5 minutes. Place this on the **expiry ladder** the chapter has been building: verify = 1 hour (proves inbox-read, low stakes), reset = 10 min (grants credential change), **magic-link = 5 min — the shortest, because here the link *is* the credential** (clicking it logs you in; there is no second factor of "and also type your password"). Stakes set the fuse; magic-link sits at the high-stakes end.
3. **`disableSignUp: false`** (the library default, stated explicitly) — `false` = a first-time email auto-creates the user (covered in the coexistence/first-time section); `true` = only existing users can use it. Name the enumeration consequence of `true` here in one line (with sign-up disabled, the response *must still* be identical for known vs unknown emails — a "no account, sign up first" tell rebuilds the oracle) and point forward to the flow section.
4. **`storeToken: 'hashed'`** — **the divergence beat.** The library defaults this to `'plain'` — the magic-link token is stored in the `verification` row *in plaintext* unless you say otherwise. Contrast sharply with L3: there the library hashed the verification token for you; here it does **not**. The same property the student already understands (a DB snapshot must be inert — exfiltrating `verification` must yield zero working links) demands one explicit knob. This is the single most important line in the config block — the happy path works identically with `'plain'`, so the omission is invisible until a breach. Set `'hashed'`.

**Component — `AnnotatedCode`** on the `lib/auth.ts` `magicLink({...})` block (4 steps, palette: orange on `sendMagicLink`, blue on `expiresIn`, blue on `disableSignUp`, **violet on `storeToken: 'hashed'`** to mark it as the load-bearing override). One code block, four foci — `AnnotatedCode` is the right pick over plain `Code` because the `storeToken` line needs to be visibly singled out from routine config.

**`:::danger`** aside: "`storeToken` defaults to `'plain'` — set it to `'hashed'`. A plaintext magic-link token in your database is a working session for anyone who reads the row."

**Terms (`Term` tooltips):** `bearer token` (re-defined once for direct landers — "grants access to whoever holds it, no further proof"; it's *why* hashing + short expiry matter), `CSPRNG` (re-defined once — the token's unguessability).

### The four-step flow

What happens from click to dashboard. Keep it to the four steps; the library does all the token work the student already understands.

1. **Submit email** — browser calls `authClient.signIn.magicLink({ email, callbackURL: '/dashboard' })`. Library generates a token, writes a `verification` row (`identifier` namespaced to the email, e.g. `magic-link:<email>` — same one-table-many-namespaces pattern as verify/reset), invokes `sendMagicLink`.
2. **Form renders "check your inbox"** — the same calm, enumeration-safe success view as L1/L3 (echo the typed email; no "we don't know that address" branch). One line: this is the identical enumeration discipline, not a new idea.
3. **User clicks the link** → `…/api/auth/magic-link/verify?token=<token>&callbackURL=<dest>`, served by the **same `[...all]` catch-all** from Ch 052 L1 (no new route). Library looks up the row by token (hashed lookup once `storeToken: 'hashed'`), checks expiry, finds-or-creates the user, issues a session, redirects to `callbackURL`. **Single-use, atomic:** the verify call consumes the token on the first attempt; a second click finds nothing and lands on `?error=INVALID_TOKEN` (note the **uppercase** casing — matches L4's reset endpoint; read each endpoint's real casing, don't assume). Re-sending a link supersedes the previous one — only the most recent link works (the one-live-bearer-token rule from L3, reused in one line).
4. **User lands signed in on `/dashboard`** — no password prompt. **The click is the credential.**

**Component — `DiagramSequence`** ("magic-link-flow", the named load-bearing visual). Four-to-five scrubbable steps reusing the section palette: *Submit email* (blue) → *Mint token + write `verification` row* (orange) → *Email lands, user clicks* (orange) → *Verify: consume token + find/create user + issue session* (green) → *Land on `/dashboard`* (green). Pedagogical goal: make the inbox round-trip visible as a single linear path and show *where the session is issued* (at click-time, not at submit-time) — the structural difference from password sign-in, where the session is issued on submit. Caption the contrast explicitly.

**Patterns to state inline:** any `callbackURL` *your* landing code reflects goes through `safeNext` (L2's guard — Better Auth validates only its own redirects via `trustedOrigins`); never log the magic-link URL or token (the bearer-token rule).

**Terms:** none new (`bearer token` already introduced; reference it).

### Where magic-link breaks the rules you learned

The "four ways it differs" section — short, sharp beats, each a place the student's L1–L4 intuition needs adjusting. This is where the senior judgment lives.

**The link is a bearer token in *someone's* browser.** Email arrives on the phone; the user signs in on the laptop. The 2026 Better Auth default is **browser-agnostic** — the token authenticates *whoever holds it*, wherever they open it. This is the *right* default for usability (phone-to-laptop is the common case), but the cost is that a **forwarded or leaked link is access**. The mitigation is the short 5-min expiry, not a binding toggle. **Correction beat (do not skip):** if a high-stakes product wants the link to only work in the browser that requested it, that's a *device-pinning technique you build yourself* (issue + check a paired cookie at request time), **not** a `magicLink()` option — there is no `sameBrowser`/fingerprint flag in the plugin. Teach the trade and the honest API surface; do not invent a knob.

**Magic-link and passwords can coexist — communicate the choice.** Both can be enabled in the same app. At the schema level there's no conflict: the password lives on the `'credential'` `account` row, the magic-link flow never touches it, and either path issues the *same* session shape (one line — the student already knows the `account`/`credential` split from Ch 052/L1). The UX rule is the senior point: a form that shows email+password *and* a magic-link field side-by-side confuses users (two competing inputs). The clean pattern is primary email+password with **"email me a link instead"** as a clearly-secondary alternate. The failure mode is presenting them as equals.

**The first click *is* the sign-up.** With `disableSignUp: false`, a magic-link to a never-seen email **creates the user on verify, with `emailVerified: true`** — because clicking the delivered link *is* the proof of inbox control that L3's whole verification flow exists to establish. The deliverability check *is* the verification. This is **faster than password sign-up**: one round-trip (request → click) instead of two (sign-up → separate verify click). Name `newUserCallbackURL` as the knob to route first-timers somewhere different (e.g. `/onboarding`) from returning users (`/dashboard`). Tie back: L1's password sign-up needed a separate verification email; magic-link folds sign-up and verification into one click.

**Deliverability is the dominant risk — design for the bad day.** Because sign-in is hostage to an email landing, the failure mode isn't "wrong password," it's "the email never came." Senior UX reach: surface "check spam, then resend" prominently on the check-inbox view; rate-limit resend per-email (the library/Ch 074 limiter — named at the call site, one per ~30s) so the button can't flood an inbox; **always keep email+password as a fallback** if magic-link is offered — never ship it as the *only* method (the lockout-on-broken-delivery footgun). One line forward: full rate-limit wiring is Ch 074.

**2FA still applies — the inbox is one factor, not a bypass.** A magic-link click proves email-control: *one* factor. An account with TOTP/passkey 2FA enrolled **still prompts for the second factor after the click**. Magic-link *replaces the password factor with an inbox-control factor*; it does not skip MFA. (One line; the full 2FA challenge surface is L6.)

**Component — `MultipleChoice`** (multi-select, ≥2 correct) at the end of this section to check the judgment, not recall. Stem something like "Your team wants to ship magic-link as the *only* sign-in method for a B2B dashboard people use every morning. What's wrong with this plan?" Correct options: daily use makes the inbox round-trip friction every session; no fallback means a delivery outage locks everyone out; corporate inboxes filter aggressively (deliverability risk). Decoys: "magic-link can't coexist with 2FA" (false — it composes), "magic-link tokens can't be hashed" (false — `storeToken: 'hashed'`). Grading: all correct selected, no decoys.

**Terms:** `deliverability` (one-line tooltip — "whether your email actually lands in the inbox vs spam vs silently dropped"; the dominant magic-link risk).

### The email-OTP sibling, in one breath

A single short beat (not a full section — keep it to a paragraph). Name `emailOTP()` as the sibling plugin: instead of a *URL the user clicks*, it sends a **6-digit code the user types into the form**. Same primitives underneath (token in a `verification` row, short expiry, single-use, enumeration discipline), different UX surface. When it's preferable: the code works when the user is on a *different device* with no easy way to click a link (entering a code by hand crosses the device gap that a click can't), and it sidesteps email clients that mangle or pre-fetch link URLs. One sentence on the trade (typing six digits vs one click), then point onward — full coverage is out of scope. Pedagogical goal: the student should recognize `emailOTP` as "magic-link's cousin" and know the one axis that distinguishes them, without a second mechanics walkthrough.

**Term:** `OTP` (one-line tooltip — "one-time password; a short single-use code").

### External resources

3–4 `ExternalResource` cards:
- Better Auth — Magic Link plugin docs (the canonical option reference).
- Better Auth — Email OTP plugin docs (the sibling).
- An "auth UX: passwordless trade-offs" explainer (a reputable UX/security source weighing magic-link vs passwords — pick a current one).
- OWASP Authentication cheat sheet (the enumeration/credential discipline backdrop, reused from earlier lessons).

---

## Scope

**Already taught — redefine in one line at most, never re-derive:**
- The `verification` table, its columns, and the **two-secret token model** / bearer-token / one-time-use-by-deletion / constant-time lookup — **L3**. L5 *reuses* these under the `magic-link:<email>` namespace; explicitly does not re-explain them. (The one exception L5 adds is `storeToken: 'hashed'`, because magic-link's library default differs from L3's.)
- **Enumeration as a whole-path property** (config + action + UI must all stay opaque) — L1, re-applied to the submit/resend surface in one line.
- The five-seam Server Action shape, `Result`/`ok`/`err`, Zod-on-FormData, `useActionState` form wiring (Ch 044 L3) — Ch 043/044. L5 does **not** ship a fresh annotated action walkthrough; if a sign-in-with-magic-link action is shown at all it's a plain `Code` fence (the fifth skeleton repetition would be noise — same call made in L1/L2). The teaching weight is decision + the four differences, not wiring.
- The two call faces (`authClient.*` returns `{ data, error }` vs `auth.api.*` throws `APIError`) — L1/L2, referenced not re-derived.
- The `[...all]` catch-all route, `trustedOrigins`, the `auth` instance in `lib/auth.ts`, the server/client plugin-set match — Ch 052.
- `safeNext` / open-redirect guard (`lib/redirects.ts`) — L2.
- The Unit 7 `sendEmail` Resend wrapper and React Email anatomy — assumed built (Ch 048–050); the `MagicLinkEmail` template is named and shown as a one-CTA transactional email but its *anatomy* is not re-taught (it's L3's `VerifyEmail` twin — one CTA, plain-text fallback URL, expiry line).
- The year-1 default (email+password + optional 2FA) and the password lifecycle (sign-up/sign-in/verify/reset) — L1–L4, restated in one line as the baseline magic-link is measured against.

**Deferred — name once, do not teach:**
- The full 2FA challenge UI / factor verification — **L6** (L5 stops at "the second factor still prompts after the click").
- TOTP enrollment, recovery codes — **L6**.
- Social OAuth sign-in, account linking — **L8/L9**.
- **Full rate-limit wiring** (dual-key per-IP + per-email, `safeLimit`, `RateLimit-*` headers, Upstash) — **Ch 074**, named only at the resend call site.
- React Email template anatomy — **Ch 049**; send pipeline — **Ch 050**.
- `emailOTP()` beyond the one-paragraph "sibling plugin" mention — out of scope (its own mechanics are not taught here).

**Explicitly excluded (the corrections):**
- A `sameBrowser`/device-fingerprint *plugin option* — **does not exist** in `magicLink()`; teach the bearer-token reality and that device-pinning is a hand-built technique, not a knob.
- Hard-asserting the token's at-rest encoding (bytes/algorithm) — teach the *property* (hashable, must be inert at rest) and the `storeToken: 'hashed'` knob; do not assert internal encoding the docs don't expose (consistent with L3's version-proof posture).

---

## Notes for downstream agents

- **Slug:** this lesson should commit at `/053-authentication-flows/5-magic-links/` (chapter pattern `N-<kebab-title>`). Frontmatter: `chapter-id: 53`, `sidebar.order: 5`, `course-progress: 0.00005` (same value L1–L4 used — confirm the increment convention before changing).
- **No lesson-specific `.astro` components are strictly required** — the decision walker, annotated config, flow sequence, and MCQ are all pre-built components. If the build agent wants a small visual for "the click is issued at verify-time, not submit-time," a lightweight `src/components/lessons/053/5/` figure is optional, not load-bearing.
- **Two corrections are verified (June 2026) and must survive review:** (1) `magicLink()` has **no same-browser-binding option** — the chapter outline is wrong; (2) `storeToken` **defaults to `'plain'`**, so the course sets `'hashed'` explicitly — a real divergence from L3. A reviewer grounding against the outline alone will try to "restore" both; they are deliberate.
