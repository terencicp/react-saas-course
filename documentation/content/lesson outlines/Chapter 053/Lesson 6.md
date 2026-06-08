# Lesson outline — Chapter 053, Lesson 6

## Lesson title

- Title: `TOTP and recovery codes`
- Sidebar label: `TOTP and recovery codes`

## Lesson framing

Sixth flow lesson. The chapter so far has built the **knowledge factor** (password) and **inbox-control factor** (verify-email, reset, magic-link). This lesson adds the **possession factor**: a time-based code from an authenticator app (TOTP) plus recovery codes as the break-glass fallback. It is the chapter's first *second-factor* lesson — passkeys (L7) are the next.

**The senior frame (lead with this, implicitly, in the intro).** Password = "something you know." A leaked/reused/phished password is one factor failing alone. For surfaces that touch money, admin, or other people's data, the year-1 baseline adds a second, independent factor. TOTP (RFC 6238) is the universal one — every authenticator app, every OS, no hardware required. The lesson answers four questions in order: how does a user **enroll**, how does the **sign-in challenge** compose with the L2 password flow, what are **recovery codes** for, and **who controls** the toggle (elevation).

**This lesson pays an L2 debt and reuses its model.** L2 stopped sign-in at *detecting* `{ twoFactorRedirect: true, twoFactorMethods }` on the success channel and returning `{ status: 'second-factor', methods }` from `SignInOk`. L6 is the other end: the form already holds `methods`; this lesson builds the screen it routes to and the call that consumes it. **Do not re-derive the L2 classifier** — reference it. The single most important continuity fact, and a correction the writer must hold against the chapter outline: **the second factor is verified with `authClient.twoFactor.verifyTotp({ code, trustDevice })`, which takes NO token argument** — it rides the cookie Better Auth set during the first-factor step. The chapter outline's `factor-token` / `factorToken` framing is wrong (verified against current Better Auth, June 2026); teach the cookie-carried-context reality.

**Two structural shapes the student must separate, because they look alike and aren't:**
1. **Enrollment** runs *inside an authenticated session* (the user is signed in, in account settings). It is gated by **elevation**, not by sign-in.
2. **The challenge** runs *mid-sign-in* (no full session yet — the first factor passed, the second is pending). It is gated by the first-factor cookie.
Conflating "type a TOTP code to turn 2FA on" with "type a TOTP code to finish signing in" is the predictable beginner error. The lesson's spine is keeping these two flows distinct.

**Elevation is the second spine.** Every 2FA toggle (enable *and* disable) demands a re-proven password — `enable({ password })` / `disable({ password })`. The reason is concrete: a borrowed/forgotten-locked laptop with a live session must not be able to *remove* the security tier. This is the same `freshAge`/re-authentication discipline the code conventions name for "enable 2FA, change password, delete account" — connect it explicitly. (Better Auth's plugin takes the password directly, which *is* the elevation proof for credential accounts; name how this maps to the course's `requires-re-authentication` Result pattern from L4's neighborhood.)

**Recovery codes are non-negotiable and time-boxed.** They are shown **once**, at enrollment, hashed at rest, single-use. The "save these now, you can't see them again" beat is the load-bearing UX moment — skipping it strands a user who loses their phone. This connects backward to the bearer-token / hash-at-rest property the chapter has taught four times (L1 password, L3 verify token, L4 reset, L5 magic-link): recovery codes are the fifth instance of "the thing the user holds is not the thing in the database."

**Mental model the student should leave with.** A factor is a *channel of proof*. TOTP adds an offline, possession-bound channel: a shared secret seeds a clock-driven code both sides compute independently, so nothing crosses the wire that an eavesdropper can reuse. It is strong against leaks and reuse, **weak against real-time phishing** (a proxy site relays the 6 digits in their 30-second window) — which is the exact line passkeys (L7) cross, the one-sentence bridge to the next lesson. TOTP beats SMS decisively (SIM-swap, SS7); SMS is named once as the floor to avoid, never taught.

**Format.** Setup + mechanics hybrid; model before wiring (mirrors L1–L5). No live sandbox — Better Auth is server-side against Postgres and `ReactCoding` is react-family only; checks of understanding are recall / ordering / classification. Two `DiagramSequence`s carry the weight (enrollment, sign-in challenge). Inherit the chapter color palette: **blue** = config/parse, **orange** = library call/endpoint, **green** = session/success, **violet** = the hinge (here: elevation + the once-only recovery-code reveal), **red** = insecure variant.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, not a definition. Sketch the scenario: the app now handles billing and an admin console; a password alone is one lock. Name the move — add a second, independent factor — and name TOTP as the universal default (works with any authenticator app, offline, no SMS). State the through-line to L2 in one sentence: "L2's sign-in already returns `requires-second-factor` and hands the form the available `methods`; this lesson builds what happens next, plus how a user turns the tier on and how they get back in when their phone is gone." Preview the four beats: enroll, challenge, recover, control. Keep it to ~5 sentences, warm and terse. Do **not** open with RFC numbers.

### How TOTP proves possession

**Goal:** the mental model, before any code. Establish *why* a 6-digit code is a second factor and not security theater, and bound its strength honestly.

Teach, simplified-first then add precision:
- A **shared secret** (a ~160-bit random value, base32-encoded) is generated once at enrollment and stored on both the server and the authenticator app. It never travels again after setup.
- Both sides independently compute `HMAC-SHA1(secret, floor(unixtime / 30))`, truncated to 6 digits. Same secret + same clock window = same code, computed offline on both ends. **Nothing reusable crosses the wire** — that is the whole point; an eavesdropper who sees one code gets a value that's dead in ≤30 seconds.
- Codes are valid for the current 30-second window **plus one window either side** (~90 s total) to absorb clock skew between phone and server. Name this `±1` tolerance as the reason a code typed a few seconds late still works — and why the verify endpoint *must* be rate-limited (6 digits = a 10⁶ space; without a cap, the ±1 window is brute-forceable).
- **The honest bound:** TOTP is possession-bound *only while the secret stays secret and the code isn't relayed live*. It defeats password leaks, reuse, and credential stuffing. It does **not** defeat real-time phishing — a proxy page can forward the 6 digits inside their window. One sentence forward-pointer to passkeys (L7) as the phishing-resistant tier. One sentence: SMS as a second factor is weaker still (SIM-swap, SS7) — TOTP is the floor, not SMS.

**Component — diagram.** A small two-track HTML+CSS figure (lesson-specific `.astro` at `src/components/lessons/053/6/totp-clock.astro`, wrapped in `<Figure>`): left "Authenticator app", right "Server", a shared secret box between them at top, both computing the same `HMAC(secret, T)` from a shared clock tick to the same `739 204` below. Pedagogical goal: make "computed independently, never re-transmitted" visible. Keep it horizontal, short. Not load-bearing enough for a `DiagramSequence` — a static labeled figure suffices. If the build agent judges prose carries it, the figure is optional.

**Terms (`Term`):** `TOTP` (Time-based One-Time Password, RFC 6238), `HMAC`, `shared secret`, `clock skew`, `credential stuffing` (reused from L1/L2 — re-`Term` once for direct landers), `phishing-resistant` (defined as the property TOTP lacks and passkeys have).

### Installing the two-factor plugin

**Goal:** wire the plugin on both server and client, and read the schema it generates. Keep it tight — this is the familiar "plugin = two registrations + a schema regen" shape from L5's magic-link.

Teach:
- **Two registrations** (the server/client plugin-set match from Ch 052, reinforced in L5): `twoFactor({ issuer: 'Acme', totpOptions: { period: 30, digits: 6 } })` in the `lib/auth.ts` plugins array, and `twoFactorClient({ onTwoFactorRedirect })` in `lib/auth-client.ts`. **If you forget the client half, `authClient.twoFactor.*` won't exist** — same trap named in L5. The `onTwoFactorRedirect` callback is the client-plugin hook that fires when sign-in needs the second factor; name it as the wiring point that backs L2's detection (the action-side `if ('twoFactorRedirect' in result)` and the client-side callback are two faces of the same signal — the course uses the action-side check it already built in L2, and `onTwoFactorRedirect` is named as the alternative the plugin offers).
- **`issuer`** is what shows up in the authenticator app's account list ("Acme: ada@acme.com") — set it to the product name. `totpOptions` defaults (`period: 30`, `digits: 6`, SHA1) **match RFC 6238 and every major authenticator app** — do not change them unless integrating with a specific non-standard authenticator; changing `digits`/`algorithm` silently breaks Google Authenticator et al. State this as a default-honoring decision (contrast with L1's deliberate divergences).
- **The schema it generates.** Regenerate with `@better-auth/cli generate` (the same workflow Ch 052 established for plugin tables). What lands: a **`twoFactor` table** — one row per user with `secret` (the base32 TOTP secret), `backupCodes` (the recovery codes), and `verified`; plus a **`twoFactorEnabled` boolean on the `user` table**. Correct the chapter outline here: the on/off flag the app reads is `user.twoFactorEnabled`, and the table carries `verified` (whether the TOTP secret completed enrollment) — there is no separate `enabled` column on the `twoFactor` table.
- **Secret sensitivity.** The `secret` grants the *second* factor only, not the password — sensitive but a notch below `account.password`. Name the production reach in one sentence: encrypt the `twoFactor.secret` (and codes) at rest with a KMS-managed key; Better Auth stores the secret server-side and the codes hashed, but app-level encryption of the column is the elevated-product move. Do not over-teach KMS — name it as the reach, defer.

**Component — `AnnotatedCode`** (the config block, `lang="ts"`): steps over `twoFactor({...})` server registration (blue on `issuer`/`totpOptions`), the `twoFactorClient({...})` client half (violet on `onTwoFactorRedirect` as the challenge hand-off), and the `@better-auth/cli generate` note. ~4 steps. Follow with a plain `Code` fence or small HTML figure showing the generated `twoFactor` row shape + `user.twoFactorEnabled` — colored to echo the Ch 052 ER diagram (reuse the lesson-specific component pattern if a row-card `.astro` is warranted at `src/components/lessons/053/6/twofactor-row.astro`; otherwise a `Code` fence of the inferred columns).

**Terms (`Term`):** `issuer`, `base32`, `KMS` (Key Management Service — named only at the encryption-reach sentence).

### Enrolling a device: six steps inside a live session

**Goal:** the enrollment flow, end to end, with the two load-bearing beats foregrounded — the **elevation gate** at the start and the **once-only recovery-code reveal** at the end. This is the section's centerpiece.

Frame first: enrollment happens at `/settings/security/2fa`, **while the user is already signed in.** It is not part of sign-in. The gate here is elevation (re-prove the password), because turning the tier *on* (and off) must resist a stale/borrowed session.

The six steps (teach as a sequence, then show the calls):
1. User clicks "Enable two-factor" on the security settings page.
2. The action calls **`authClient.twoFactor.enable({ password })`** — the password is the **elevation proof**. Connect to the code conventions' `freshAge` rule: 2FA-enable is explicitly on the "high-stakes mutation, re-authenticate" list. (Course mapping: in a fuller build this surfaces the `requires-re-authentication` Result when the session is stale and re-prompts; the plugin's `password` argument *is* the re-proof for credential accounts — name both, keep it concrete.)
3. The response carries **`totpURI`** (an `otpauth://totp/Acme:ada@acme.com?secret=...&issuer=Acme` URI) and **`backupCodes`** (the recovery codes, plaintext, **this once**). The client renders the `totpURI` as a **QR code** plus the raw base32 secret as a manual fallback (some users type it). **Critical, corrected from the outline:** `enable()` does **not** turn 2FA on yet — `user.twoFactorEnabled` stays false until step 5. Enrollment is two-phase by design: generate-and-show, then prove-and-commit. This prevents a user from locking themselves out with a misconfigured authenticator.
4. The user scans the QR with their authenticator app (Google Authenticator, 1Password, Authy, …); the app starts emitting 6-digit codes.
5. The user types the first code; the form calls **`authClient.twoFactor.verifyTotp({ code })`**. A match flips `user.twoFactorEnabled` to true and marks the row `verified`. This is the commit — the proof that the secret transferred correctly.
6. The UI now presents the recovery codes for the user to save — **"store these somewhere safe; you will not see them again."** Codes are stored **hashed**; the plaintext exists only in this response. A download/print/copy affordance, and a confirmation checkbox ("I've saved my codes") before leaving the page.

Hammer the two beats:
- **Elevation (violet):** enable requires the password; so does disable (next section). Name *why* in one line — a security tier you can toggle from a stale session is no tier.
- **The once-only reveal (violet):** `backupCodes` is in the `enable` response in plaintext and **never again** (regeneration replaces them — covered next section). If the UI doesn't surface them here, the user has no fallback. The single most common 2FA-implementation footgun.

**Component — `DiagramSequence` (`twofactor-enrollment`, the named load-bearing visual).** 6 steps mirroring the list: (1) Click Enable, (2) `enable({ password })` → elevation check (violet), (3) server returns secret + QR + codes / `twoFactorEnabled` still **false** (orange, with a visible "still off" marker), (4) Scan into app, (5) `verifyTotp({ code })` → flip `twoFactorEnabled` true + `verified` (green), (6) Show recovery codes once (violet, codes visibly "shown once"). Captions per step. Pedagogical goal: make the **two-phase** nature (generate→commit) and the **two violet beats** unmissable.

**Component — `AnnotatedCode`** for the enrollment action / client calls (`lang="tsx"` for the settings component, or `ts` for an action): highlight `enable({ password })` (violet — elevation), the `totpURI` + `backupCodes` destructure (orange), the QR render, and `verifyTotp({ code })` (green — commit). Keep prose per step ≤6 lines. Because this is the chapter's *first* genuinely new flow shape (not a 5th skeleton repetition like L4/L5's actions), the full `AnnotatedCode` walkthrough is warranted here — spend the annotation budget on enrollment.

**Component — small UI mock.** A lesson-specific `.astro` (`src/components/lessons/053/6/recovery-codes-card.astro`, in `<Figure>`) showing the "save your recovery codes" panel: a 2-column grid of 10 monospace codes, a download button, and the "you won't see these again" warning + confirm checkbox. Pedagogical goal: make the once-only UX concrete so the build agent renders the beat, not just narrates it. Optional but recommended.

**Term (`Term`):** `otpauth URI`, `QR code` (only if non-obvious in context — likely skip), `recovery codes` / `backup codes` (define once; note Better Auth's API calls them `backupCodes`).

### The sign-in challenge: composing with the password step

**Goal:** close the L2 debt — build the second-factor screen and the call that finishes sign-in. Foreground the structural difference from enrollment: **no full session yet**, the gate is the first-factor cookie, and `verifyTotp` takes **no token**.

Reconnect to L2 explicitly (one short recap, do not re-derive): L2's `signInEmail` resolves on the **success channel** with `{ twoFactorRedirect: true, twoFactorMethods }` when the account has 2FA; the action returns `SignInOk` as `{ status: 'second-factor', methods }`; the form switches on that and renders the TOTP prompt instead of redirecting. **That branch already exists from L2.** This lesson fills in the prompt.

Teach the flow:
- The first factor passed but **no session was issued** — Better Auth set a short-lived cookie representing "first factor verified, second pending." The user is in an in-between state.
- The TOTP prompt: a single 6-digit input. On submit, **`authClient.twoFactor.verifyTotp({ code, trustDevice })`** — **and this is the correction the writer must hold:** there is **no `factorToken` / no token argument.** The call rides the first-factor cookie Better Auth already set (the docs: `authClient.twoFactor.*` handles cookies automatically in the browser). The chapter outline's `factor-token` model is wrong; do not invent a token parameter.
- **`trustDevice`** (the one knob worth surfacing): when true, this device is remembered for ~30 days and won't be re-challenged on subsequent sign-ins (the trust window resets on each sign-in within it). Expose it as a "trust this device for 30 days" checkbox — the standard UX. Name the trade in one line: convenience vs. a lost/shared device skipping the second factor for a month; default checked is fine for consumer, leave unchecked for high-stakes.
- **Success → a fresh session** (green) and redirect through `safeNext` (L2's open-redirect guard — reuse, don't re-teach). **Failure → a wrong-code error**, and the verify endpoint is rate-limited (the ±1 window + 10⁶ space makes a per-attempt cap non-negotiable; full rate-limit wiring deferred to Ch 074, named at the call site).
- **The "lost your authenticator?" affordance** lives on this prompt — a link that routes to the recovery-code path (next section). Name it here so the screen is complete; build the recovery call next.

**Component — `DiagramSequence` (`twofactor-challenge`).** Continues L2's happy-path sequence past the fork. ~5 steps: (1) Password submitted, first factor verified — **first-factor cookie set, no session yet** (orange, "session: none" marker), (2) Form shows `{ status: 'second-factor', methods }` → TOTP prompt (violet, the continuation), (3) User enters code, `verifyTotp({ code })` — caption: *no token, rides the cookie* (orange), (4) Code matches → **session issued** (green, "session: ✓"), (5) Redirect via `safeNext`. Pedagogical goal: make the "no session during the challenge" and "no token argument" facts visual — the two most-misread points.

**Component — small `Code` fence** for the form's `verifyTotp` call inside the `{ status: 'second-factor' }` branch (tsx), so the student sees it plug into L2's existing `SignInOk` switch unchanged. A `:::note` reminding that the `{ status: 'second-factor' }` branch and the form wiring are L2's (Ch 044 L3 `useActionState`), continued here, not rebuilt.

**Component — `Buckets` (do not cut — the keystone check).** `twoCol`, instructions "Sort each fact under the flow it belongs to." Two buckets: **Enrollment (in settings)** vs **Sign-in challenge**. Items: "User already has a full session" → enrollment; "Gated by re-proving the password" → enrollment; "Returns `totpURI` + recovery codes" → enrollment; "`twoFactorEnabled` flips true here" → enrollment; "No full session yet, first-factor cookie only" → challenge; "Triggered by `requires-second-factor` from L2" → challenge; "`verifyTotp` rides a cookie, takes no token" → challenge; "`trustDevice` skips it for 30 days" → challenge. Pedagogical goal: force the student to separate the two `verifyTotp` contexts — the exact confusion the lesson exists to prevent.

**Terms (`Term`):** `trustDevice` / trusted device, `safeNext` (reused from L2), `requires-second-factor` (reused — re-`Term` for direct landers).

### Recovery codes: getting back in when the phone is gone

**Goal:** the break-glass flow, and why surfacing codes at enrollment was non-negotiable. Also the regenerate and disable paths.

Teach:
- **The lost-phone path.** From the sign-in TOTP prompt, "lost your authenticator?" surfaces a recovery-code input. The user types one of their 10 codes; the form calls **`authClient.twoFactor.verifyBackupCode({ code })`**. The library does a **hashed lookup** (codes are stored hashed, never plaintext — the chapter's recurring property, fifth instance), and on match issues a session. Each code is **single-use** — once consumed it's removed and can't be reused (same one-time-use-by-removal discipline as the bearer tokens in L3/L4/L5). `verifyBackupCode` also accepts `trustDevice` (same 30-day device-trust as `verifyTotp`); `disableSession` is an advanced flag, name it once or skip.
- **After a recovery sign-in**, prompt the user to re-establish a factor — re-enroll a fresh TOTP secret (their old authenticator may be gone) or review remaining codes. A user signing in with codes is a user one step from lockout; the UI should nudge recovery, not just let them in.
- **Running low / leaked codes — regenerate.** `authClient.twoFactor.generateBackupCodes({ password })` (elevation again — same password gate) **replaces** the old set with a new one and returns the new codes once. Old codes die. Name the rule: regeneration is the only way to "see" codes again; there is no "show me my existing codes" for the user (they're hashed). (`viewBackupCodes` exists but is a **server-only, fresh-session** endpoint — name it as the admin/support-side primitive, not a user feature.)
- **Turning 2FA off — disable, elevated.** `authClient.twoFactor.disable({ password })`. **Same elevation gate as enable** — the symmetry is the point: if you needed the password to add the tier, you need it to remove it. A stale session must not be able to strip 2FA. This is the second half of the elevation spine opened in enrollment.

Tie the section to the chapter's spine: recovery codes are the fifth "the secret the user holds ≠ the row in the database" instance. The reason the enrollment section *insisted* on the once-only reveal lands here — without saved codes, a lost phone is a lost account, and the only paths left are regeneration (needs a live session, which they don't have) or support-driven identity verification (outside any auth library). State that dead-end plainly: **no recovery codes + lost phone = support ticket at best, lockout at worst.**

**Component — `CodeVariants`** (or two small `Code` fences) showing the recovery sign-in branch (`verifyBackupCode`) beside the regenerate call (`generateBackupCodes`) — both with the elevation/no-token distinction visible (regenerate needs `password`; the sign-in `verifyBackupCode` rides the first-factor cookie like `verifyTotp`). Keep small.

**Component — `MultipleChoice`** (multi-select, ≥2 correct) probing judgment, not recall: "Which are true about recovery codes?" Correct: shown once at enrollment; stored hashed; single-use; regeneration replaces the whole set. Decoys: "a user can re-view their existing codes anytime" (false — hashed), "disabling 2FA doesn't need the password" (false — elevation), "recovery codes can be sent by SMS" (false — and a nudge toward the SMS-is-weak point). Pedagogical goal: cement the non-negotiables.

**Terms (`Term`):** `single-use` / one-time-use (reused concept), `freshAge` / elevation (reused from earlier in lesson and L4 neighborhood).

### Should this product ship TOTP at all?

**Goal:** the senior decision wrapper — small, decisive. 2FA is a *conditional* tier (trigger-before-tool), not a default-on feature. Place this near the end as the "now that you can build it, when do you?" beat.

Teach as a short decision, then the passkey contrast:
- **Enable the tier when** the product handles money, admin/destructive surfaces, or other people's data (B2B with tenant data). For a low-stakes year-1 consumer app, password + email-verification is the baseline; bolting on mandatory 2FA adds friction and a support burden (lost-phone tickets) before the threat justifies it. Offer it **opt-in** early, **enforce** it for privileged roles.
- **TOTP vs passkeys (the L7 bridge).** TOTP is **universal** (any app, any OS, no hardware) but **phishable** (relayed code in its window). Passkeys (L7) are **phishing-resistant and origin-bound** but need a passkey-capable device/ecosystem. The 2026 call: **offer both, let the user choose** — TOTP as the universal default, passkeys as the senior-grade upgrade. One sentence on **step-up**: some actions (export, billing change, ownership transfer) demand a *fresh* second-factor challenge regardless of session age — named here, full pattern in Ch 057.
- One sentence, final: **never default to SMS** — SIM-swap and SS7 make it the weakest common factor; TOTP is the floor.

**Component — `StateMachineWalker` (`kind="decision"`, optional but a good fit).** "Should you add a second factor, and which?" Root: "Does the product handle money, admin, or other people's data?" → No → leaf "Password + email verification is enough for now; offer TOTP opt-in later." → Yes → "Is real-time phishing a serious threat (high-value targets)?" → Yes → leaf "Offer passkeys (L7) as primary, TOTP as fallback." → No → leaf "TOTP opt-in now, enforced for admins." Pedagogical goal: drill the *order* the senior asks (stakes → threat model → tool). Keep leaves short. If the build agent finds this redundant with the prose, a comparison sentence suffices — the walker is a nice-to-have, the decision logic is mandatory.

**Terms (`Term`):** `step-up` (fresh challenge for sensitive actions), `SIM-swap` (one-line, names why SMS is out).

### External resources

Four `ExternalResource` cards:
- Better Auth — Two-Factor (2FA) plugin docs.
- Better Auth — security / session & `freshAge` reference (elevation).
- RFC 6238 (or a readable TOTP explainer like the Authgear "What is TOTP" piece) — the mechanism.
- OWASP — Multifactor Authentication cheat sheet.

---

## Scope

**Prerequisites to restate briefly (do not re-teach):**
- The L2 sign-in classifier: `signInEmail` resolves on the success channel with `{ twoFactorRedirect: true, twoFactorMethods }`, the action returns `SignInOk = { status:'second-factor', methods }`, the form switches on it. One-paragraph recap; the model is L2's.
- The five-seam Server Action shape, `Result`/`ok`/`err`, `z.flattenError().fieldErrors` (Ch 043) — assumed, not re-explained.
- `useActionState` form wiring (Ch 044 L3) — the prompt plugs into the existing form; name the citation, don't rebuild.
- `verification`-table / bearer-token / hash-at-rest property (L3) — recovery codes reuse the *property*, stated in one line, not re-derived.
- `safeNext` open-redirect guard (L2), server/client plugin-set match + `[...all]` catch-all + `@better-auth/cli generate` workflow (Ch 052), `freshAge`/re-authentication elevation rule (code conventions / Ch 052 L3) — referenced, not re-taught.

**Explicitly out of scope (defer, name at most once):**
- **Passkeys / WebAuthn** — L7. Named only as the phishing-resistant contrast and the L7 bridge.
- **SMS / phone OTP as a factor** — not taught; named once as the weak floor to avoid. (Better Auth's `otpOptions`/`sendOTP` email-or-SMS OTP path is *not* this lesson — TOTP is the subject.)
- **Full elevation-tier UI and credential-change-from-settings** (change password/email) — Ch 054 L2. This lesson uses the password-as-elevation proof but does not build the generic re-auth modal.
- **Step-up middleware for sensitive actions** — named once; full pattern Ch 057.
- **Full rate-limit wiring** (dual-key per-IP + per-email, `safeLimit`, Upstash) — named at the verify call site; Ch 074.
- **KMS / at-rest encryption of the secret** — named as the production reach in one sentence; not configured.
- **Inner TOTP cryptography depth** (HOTP derivation, dynamic truncation byte math) — taught only to the "independent HMAC of secret+time window" level; the byte-level algorithm is not the lesson.
- **`trustDevice` internals / trusted-device table mechanics** — surfaced as the checkbox + 30-day behavior; not dissected.

---

## Notes for downstream agents

- **Hard corrections vs the chapter outline (all verified against current Better Auth, June 2026 — a reviewer grounding on the outline alone will try to "restore" these):**
  1. The sign-in second factor is verified with **`verifyTotp({ code, trustDevice })` — NO token argument.** It rides the first-factor cookie. The outline's `factor-token` / `factorToken` is wrong. (Consistent with L2's already-corrected `twoFactorRedirect`-on-success framing.)
  2. **`enable({ password })` does NOT turn 2FA on** — it returns `totpURI` + `backupCodes`; `user.twoFactorEnabled` flips only after `verifyTotp` (two-phase enrollment). The outline's step 5 implies enable-then-verify but the writer must state the not-yet-on fact explicitly.
  3. Schema: the on/off flag is **`user.twoFactorEnabled`**; the `twoFactor` table carries `secret`, `backupCodes`, `verified` — **no separate `enabled` column** on the table (outline says "`enabled`").
  4. Plugin option is **`totpOptions`** (not `otpOptions`) for TOTP; `backupCodeOptions` for codes; `otpOptions.sendOTP` is the *separate* email/SMS-OTP feature, not TOTP — don't conflate.
  5. Recovery-code API names: **`verifyBackupCode({ code, trustDevice?, disableSession? })`**, **`generateBackupCodes({ password })`**, **`viewBackupCodes`** (server-only, fresh-session). Outline's `verifyBackupCode({ code, factorToken })` is wrong on the `factorToken`.
- **Default-honoring (contrast with L1's divergences):** `totpOptions` defaults (`period: 30`, `digits: 6`, SHA1) are kept as-is — changing them breaks standard authenticators. Say so.
- **Color palette** inherited L1–L5: blue=config/parse, orange=library call/endpoint, green=session/success, **violet=the hinge (elevation + once-only recovery reveal)**, red=insecure variant.
- **No live sandbox** (server-side Better Auth + Postgres; `ReactCoding` is react-only). Checks are `Buckets` (keystone), `MultipleChoice`, optional `StateMachineWalker`, optional `Sequence`.
- **Component build list:** 2× `DiagramSequence` (enrollment, challenge — both named load-bearing), 2× `AnnotatedCode` (plugin config; enrollment action — the one place to spend the full annotation budget, since enrollment is a genuinely new shape not a skeleton repeat), small `Code`/`CodeVariants` (challenge `verifyTotp` branch; recovery `verifyBackupCode` + `generateBackupCodes`), `Buckets`, `MultipleChoice`, optional `StateMachineWalker`. Lesson-specific `.astro` candidates at `src/components/lessons/053/6/`: `totp-clock.astro` (two-track HMAC figure — optional), `recovery-codes-card.astro` (once-only reveal mock — recommended), optional `twofactor-row.astro` (schema row-card echoing Ch 052 ER colors). All `.astro` are stubs/TODO unless the build pass creates them.
- **Cognitive-load order** (model before wiring, mirrors L1–L5): mechanism → plugin install → enrollment → sign-in challenge → recovery/disable → ship-it decision. The two spines (enrollment-vs-challenge distinction; elevation symmetry on enable/disable) must stay visible end to end — the `Buckets` exercise exists to enforce the first.
- **Slug:** expected `/053-authentication-flows/6-totp-and-recovery-codes/`. Frontmatter: `chapter-id: 53`, `sidebar.order: 6`, `course-progress: 0.00005` (match L1–L5; confirm increment convention if it matters). Title/label "TOTP and recovery codes".
