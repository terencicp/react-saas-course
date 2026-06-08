# Passkeys and WebAuthn

- Title: Passkeys and WebAuthn
- Sidebar label: Passkeys and WebAuthn

## Lesson framing

Seventh flow lesson; the second-factor pair to L6's TOTP and the chapter's only lesson on a *cryptographic, origin-bound* credential.
**Setup + concept hybrid: the WebAuthn mental model is half the lesson, plugin wiring the other half** (the outline's own framing, kept).
The teaching weight is the *why-this-can't-be-phished* model, not the code — Better Auth wraps both ceremonies, so the student writes almost no imperative WebAuthn.

**The spine — "the credential is the origin."** A password is a string you can type into any look-alike site; a TOTP code is six digits you can read aloud to a proxy. A passkey is a private key the browser will only sign a challenge with *when the request comes from the exact registered origin* — there is no string to leak, retype, or relay. This single property (origin-binding by the user agent) is what L6 promised passkeys would cross, and every section should trace back to it. This is the explicit **L6→L7 bridge cashed in**: TOTP is phishable by a live proxy relaying the code in its window; passkeys close that hole structurally.

**Two ceremonies, two `navigator.credentials` calls.** Registration (`create`) mints a keypair and registers the public key; authentication (`get`) signs a server challenge with the private key. The student must hold *registration vs authentication* the way L6 made them hold *enrollment vs challenge* — same shape of "these two look related but are governed by different rules," so reuse that scaffolding deliberately. The keystone exercise is a `Buckets` drill sorting facts into the two ceremonies (mirrors L6's enroll-vs-challenge `Buckets`).

**The model-before-wiring order** that L1–L6 all follow: build the three-roles + two-ceremonies mental model first, *then* the plugin, *then* registration, *then* authentication, *then* the synced-vs-device-bound product call, *then* recovery + watch-outs. The student should never meet `addPasskey` before they can answer "what is the secure enclave doing and why can't a phishing site replay it."

**Reuse, do not re-derive, the chapter's owned primitives.** Server/client plugin-set match (L5/L6 trap — `passkey()` in `lib/auth.ts` plugins array MUST be paired with `passkeyClient()` in `lib/auth-client.ts`, else `authClient.passkey.*` / `authClient.signIn.passkey` are undefined); `@better-auth/cli generate` schema-regen workflow (Ch 052); **recovery codes from L6 as the universal fallback** (a lost-only-passkey user is recovered by the recovery codes L6 already shipped — name it, do not rebuild it); `safeNext` open-redirect guard for any post-sign-in redirect (L2). Color palette inherited L1–L6: **blue**=config knobs, **orange**=library call / ceremony / endpoint, **green**=session/success, **violet**=the hinge (here: origin-binding and the synced-vs-device-bound trade), **red**=insecure variant.

**Senior-decision wrapper, same conditional-tier stance as L6.** Passkeys are not default-on for a year-1 consumer app; they earn the call on money/admin/other-people's-data surfaces, exactly the L6 threshold. But the 2026 product call differs from TOTP in one way worth landing: passkeys can be a *primary* sign-in (collapsing knowledge+possession+biometric into one tap), not only a second factor — so the decision is two-axis (enable-or-not, and primary-or-second-factor), and the answer is "offer both TOTP and passkeys, let the user pick; passkeys as primary for those who set them up."

**No live sandbox.** WebAuthn needs real authenticator hardware + a registered origin; ReactCoding is react-family only and cannot touch `navigator.credentials` against a real RP. Checks of understanding are recall / ordering / classification (the `Buckets` ceremony drill is the keystone, a `StateMachineWalker` for the synced-vs-device-bound + primary-vs-second-factor decision, a `MultipleChoice` on the phishing-resistance property). A short embedded video is a strong fit for the WebAuthn ceremony intuition (see Authentication section).

**Verified-API note for downstream agents (June 2026, grounded against current `@better-auth/passkey` ~1.6.x — several chapter-outline strings are stale; do NOT "restore" them from the outline):**
- Discoverable-credential UX is configured via **`authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }`**, NOT the outline's `advanced: { discoverableCredentials: 'preferred' }`.
- Conditional-UI autofill is **`authClient.signIn.passkey({ autoFill: true })`** paired with an input marked **`autocomplete="username webauthn"`** (the outline's bare `autocomplete="webauthn"` and `mediation: 'conditional'` framing is the underlying platform primitive, named at the call site, not the Better Auth surface).
- **`registration.requireSession` defaults to `true`** — adding a passkey requires an existing session by default; passkey-*first* onboarding needs `requireSession: false` + a `resolveUser` callback. This reshapes the outline's "passkeys as primary sign-in": the *default* path is add-in-settings, and primary-from-scratch is an explicit opt-in.
- Schema columns are `id, name, publicKey, userId, credentialID, counter, deviceType, backedUp, transports, aaguid, createdAt`. `deviceType` is `'singleDevice' | 'multiDevice'`; `backedUp` (boolean) is the sync signal. **Synced passkeys report `counter: 0` and never increment** — so counter-based clone detection is effectively inert for the common (synced) case; teach it as a defense the library performs, not as the load-bearing guard.
- Client methods: `addPasskey({ name })`, `signIn.passkey({ autoFill? })`, `listUserPasskeys()`, `deletePasskey({ id })`, `updatePasskey({ id, name })`.
- **Client plugin import path is its own package: `import { passkeyClient } from '@better-auth/passkey/client'`** — NOT `better-auth/client/plugins` (where L5/L6's `magicLinkClient`/`twoFactorClient` live). The server plugin is `import { passkey } from '@better-auth/passkey'`. Easy build-out trip; flag it in the install section.
- Autofill on-mount guard uses the platform API `PublicKeyCredential.isConditionalMediationAvailable()` (short-circuit when unsupported); `webauthn` must be the **last** token in the `autocomplete` value.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, trigger-before-tool: L1–L4 shipped passwords (phishable, leakable, reused); L6 added TOTP (defeats leaks/reuse but a live proxy site still relays the 6-digit code in its 90-second window). State the unsolved hole plainly — *the human can still be tricked into handing a working credential to a look-alike site* — and name the structural fix: a credential that is cryptographically bound to the real origin, so a look-alike site gets nothing it can replay. Preview the end state: the student can wire Better Auth's `passkey()` plugin for registration and sign-in, explain why the ceremony can't be phished, and make the synced-vs-device-bound and primary-vs-second-factor calls. Keep it to a short paragraph; the senior question is implicit, not a labelled section.

### Why a phishing proxy beats TOTP but not a passkey

The conceptual heart — lands the origin-binding property **before any roles or code**, so everything downstream hangs off it. Walk the attack concretely: user lands on `acme-login.com` (look-alike), types password → proxied to real `acme.com`; real site demands TOTP; look-alike prompts for it, user types the 6 digits, proxy relays them inside the window → attacker now holds a session. TOTP lost because *the code is a string the user can be socially engineered into relaying*. Then the passkey version of the same attack: the look-alike asks the browser to do a passkey sign-in, but the browser will only release a signature for the origin the key was registered to (`acme.com`), and the request is coming from `acme-login.com` — the authenticator is never invoked for the wrong origin, so there is nothing to relay. The phish dead-ends at the browser, not at the user's judgment.

Diagram (the load-bearing visual of this section): a **side-by-side `TabbedContent`** with two panels, tab "TOTP — relayed" and tab "Passkey — dead-ends".
- Panel 1: a small `ArrowDiagram` (real HTML boxes — phishing site, user, real RP) showing the 6-digit code flowing user → phishing site → real RP (orange arrows, the relayed code labelled, red tint on the phishing box). The point: the code crosses an attacker-controlled hop and still works.
- Panel 2: same three boxes, but the arrow from phishing-site → authenticator is **struck/blocked** with a red "origin mismatch" badge; the authenticator (violet) never signs. The point: the browser refuses at the origin check.
Pedagogical goal: make "origin-binding" a *picture* the student can recall, not a definition. Keep both panels the same three-box layout so the difference (relayed vs blocked) is the only thing that changes.

`Term`s in this section: `phishing-resistant`, `relying party` (introduce as "the SaaS / the site the credential belongs to" — full role detail in the next section), `origin`.

### Three roles and two ceremonies

The mental-model scaffold the rest of the lesson stands on. Introduce WebAuthn's three roles plainly, each tied to something the student already pictures:
- **Relying party (RP)** — your SaaS server; it stores public keys and issues challenges. (`rpID` will scope it.)
- **User agent** — the browser; the *only* actor that enforces the origin check (the thing that made the phish dead-end last section).
- **Authenticator** — the secure enclave that holds the private key and unlocks it with a local gesture (Face ID, Touch ID, Windows Hello, a YubiKey tap). Name both kinds at first mention: platform authenticators (built into the phone/laptop) vs roaming/cross-platform (YubiKey).

Then the two ceremonies, framed as the L6 echo ("like enrollment-vs-challenge, two flows that share machinery but are governed by different rules"):
- **Registration** — `navigator.credentials.create()` under the hood. Device generates a keypair, keeps the private key in the enclave, hands the public key + attestation to the RP, which stores a `passkey` row.
- **Authentication** — `navigator.credentials.get()` under the hood. RP issues a time-bound random challenge; the device signs it with the private key; the RP verifies the signature against the stored public key.
State the asymmetry that makes this safe: the private key **never leaves the enclave**, the server only ever holds a public key, and a stolen public key (DB snapshot) authenticates nobody — the chapter's recurring "the secret the user holds ≠ the row in the database" property, now in its public-key/private-key form (call it out explicitly as the same idea as the hashed password/token from L1/L3/L6, one rung stronger: here the server never had the secret at all).

Diagram: a single `ArrowDiagram` inside a `Figure` — three boxes (RP, browser, authenticator) with the two ceremonies drawn as two labelled arrow-pairs in different colors (registration = one color, authentication = another), each pair showing challenge/response direction. Pedagogical goal: one picture that names all three roles and shows both round-trips, so the later sequence diagrams are "zoom-ins" of this overview. Keep it horizontal and compact.

Naming primitives at the call site (do not preamble): `navigator.credentials.create` / `.get` are named here as "what the library calls for you," not taught as an API to write — the student writes `authClient.passkey.addPasskey` / `authClient.signIn.passkey`.

`Term`s: `WebAuthn`, `FIDO2`, `authenticator`, `secure enclave`, `attestation`, `public-key cryptography` (brief — assume some exposure, re-explain in one line).

**Keystone exercise — `Buckets` (do NOT cut), the ceremony classifier.** Two buckets: "Registration" and "Authentication". Items to sort (each a short fact): "Generates a new keypair", "Signs a server-issued challenge", "Server stores a public key", "Server verifies a signature", "Browser calls `navigator.credentials.create`", "Browser calls `navigator.credentials.get`", "Produces attestation", "Looks up an existing `passkey` row by credential ID", "Increments / checks the counter", "Needs a device you've already registered". `twoCol` layout. This is the L6-`Buckets` analogue and the section's check-of-understanding; grading is exact-bucket match. Mirrors the enroll-vs-challenge keystone so the student transfers the discipline.

Optional embedded video here or in the Authentication section: a short, current WebAuthn/passkey ceremony explainer via `VideoCallout` (resourcer to source a 3–6 min explainer of the registration + assertion round-trips; supports the model, does not replace prose). Mark optional — only if a clean, recent one exists.

### Installing the passkey plugin

The wiring section — short, because the plugin is two registrations and a schema regen, all owned patterns. Cover:
- **Two registrations (the L5/L6 trap, restated once):** server `passkey({ ... })` in the `lib/auth.ts` plugins array + client `passkeyClient()` in `lib/auth-client.ts`. Forget the client half and `authClient.passkey.*` and `authClient.signIn.passkey` don't exist. One line; this is a transferred rule, not a new one. **Import-path divergence the agent must get right:** `passkey` from `@better-auth/passkey`, `passkeyClient` from `@better-auth/passkey/client` (a dedicated package — unlike the prior plugins that ship from core `better-auth/plugins` + `better-auth/client/plugins`). Worth a `:::note` so the install copy-paste is correct.
- **The config knobs that matter** (`AnnotatedCode`, ~4 steps, colors below):
  - `rpName: 'Acme'` (blue) — human-readable label shown in the OS/browser passkey UI.
  - **`rpID: 'app.example.com'`** (violet — the hinge of this section) — the domain the credential is bound to. Land the trap hard: `rpID` must be the *registrable domain the app runs on*; setting it to `example.com` when the app is at `app.example.com` makes **registration succeed and assertion silently fail** (the single most common passkey misconfig). A passkey registered under `app.example.com` does not work at `marketing.example.com` or bare `example.com`. This is the origin-binding from section 2 made concrete as a config string.
  - `origin: 'https://app.example.com'` (blue) — the full origin the server expects; pair it with `rpID`.
  - **`authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' }`** (blue, with `residentKey` worth a sentence) — `residentKey: 'preferred'` asks the authenticator to store a *discoverable* credential, which is what enables the no-typing autofill UX in the Authentication section. Name `userVerification: 'preferred'` as "require the local gesture (biometric/PIN) when the device supports it."
  - **Correction call-out for the agent:** this is `authenticatorSelection.residentKey`, NOT the outline's `advanced.discoverableCredentials`. Ground exact option names against the current docs; do not copy the outline's `advanced` block.
- **The schema** (`@better-auth/cli generate`, the Ch 052 workflow — named, not re-taught): a new **`passkey` table**, one row per credential (one user → many passkeys is the normal case). Walk the columns that carry teaching weight, not all of them:
  - `userId`, `credentialID`, `publicKey` — the identity + the stored public half.
  - `counter` — monotonic signing counter; the library checks it grows to catch a cloned device. **Caveat that the outline missed and the agent must include:** synced passkeys report `counter: 0` and never increment, so for the common synced case the counter check is effectively inert — it's a real defense only for single-device authenticators. Teach it as "a check the library performs," not "the thing protecting you."
  - **`deviceType`** (`'singleDevice' | 'multiDevice'`) and **`backedUp`** (boolean) — the synced-vs-device-bound signal, the input to the next section's product call. Flag them here, decide on them there.
  - `transports`, `name` (user label like "iPhone" / "Work laptop") — drive the management UI.
Use a small `Code` fence or a row-card-style lesson-specific `.astro` (echoing the Ch 052 ER-diagram styling, as L3/L4/L6 did) to show the `passkey` row; this is a recommended-not-required figure.

`Term`s: `rpID` (Term'd — non-obvious, load-bearing), `discoverable credential` / `resident key` (one Term, two names), `registrable domain`.

### Registering a passkey

The first ceremony, end to end, with the default `requireSession: true` framing front-and-center. Sequence (the named load-bearing visual: `DiagramSequence`, ~5 steps, reusing the section colors):
1. User on `/settings/security/passkeys` (a live session — this is why `requireSession` defaults true) clicks "Add a passkey."
2. `authClient.passkey.addPasskey({ name: 'iPhone' })` — the browser prompts for the local gesture (Face ID / Touch ID / Windows Hello / YubiKey). (orange)
3. The authenticator generates a keypair, stores the private key in the enclave (or in iCloud Keychain / Google Password Manager for a synced passkey), returns the public key + attestation. (orange → the enclave step violet to echo "the secret never leaves")
4. Library verifies attestation, checks the origin against `rpID`, inserts the `passkey` row. (orange/green)
5. UI lists the new credential with its `name`, device type, and a remove button. (green)

Code: a small `Code` fence (tsx) for the `addPasskey` call and the success handling — this is *not* a five-seam Server Action (the browser client owns the WebAuthn round-trip; there is no FormData/Zod boundary to wrap), so do NOT force the L1–L4 action skeleton here. Name that divergence in one line so the agent and the student know it's deliberate: passkey registration is a client-side ceremony, not a form-submitting Server Action — `addPasskey` talks to the authenticator and the Better Auth endpoint directly. (Reuse the L6 stance: spend annotation budget on the model, show the call plainly.)

**The `requireSession` framing (the correction that reshapes the outline):** state that adding a passkey requires an existing session by default — a passkey is, out of the box, a credential you *add* to an account you're already in. Then name the opt-in for passkey-first sign-up in one paragraph: `registration.requireSession: false` plus a server `resolveUser` callback lets a brand-new user create their first passkey with no prior session (the "no account, no password, just a passkey" onboarding). Frame it as the senior reach, not the default — most products add passkeys in settings and let primary sign-in happen once the credential exists. Do not build the `resolveUser` flow; name its shape and move on.

The management UI: `listUserPasskeys()` to render the list, `updatePasskey({ id, name })` to rename, `deletePasskey({ id })` to remove. One line each — these back the "users accumulate iPhone + laptop + YubiKey, and stale ones" reality. Land the watch-out inline (not bundled): build the management UI assuming **many** passkeys per user, and surface a "last used" / device label so users can prune stale credentials.

`Term`s: `resolveUser` (brief), `roaming authenticator` if not already Term'd.

### Signing in with a passkey

The second ceremony + the 2026 autofill UX. Two entry points, both `authClient.signIn.passkey`:
- **Explicit:** a "Sign in with a passkey" button → `authClient.signIn.passkey()`.
- **Conditional-UI autofill (the 2026 default, the part worth the most ink):** the sign-in form's identifier input carries `autocomplete="username webauthn"` (with `webauthn` as the **last** token — the platform requires it), and the page calls `authClient.signIn.passkey({ autoFill: true })` from an on-mount `useEffect`, guarded by `PublicKeyCredential.isConditionalMediationAvailable()` so unsupported browsers short-circuit cleanly; the browser then offers the user's available passkeys *in the input's autofill dropdown* — one tap, no email typed, no separate button. **Correction for the agent:** the enabling call is `signIn.passkey({ autoFill: true })` + `autocomplete="username webauthn"` (NOT the outline's bare `autocomplete="webauthn"` / `discoverableCredentials`). The platform primitive underneath is conditional mediation (`navigator.credentials.get({ mediation: 'conditional' })`) — name it once at the call site, don't teach it as the surface. This is why `residentKey: 'preferred'` was set in the config section: discoverable credentials are what make the autofill list populate.

Sequence (the named load-bearing visual: `DiagramSequence`, ~4–5 steps, mirroring the registration sequence so the two read as a matched pair):
1. User taps "Sign in with a passkey" / focuses the autofill-enabled input. (orange)
2. `authClient.signIn.passkey()` → library issues a time-bound random challenge. (orange)
3. Browser presents the challenge to the authenticator; user does the local gesture; device signs with the private key. (orange, enclave step violet)
4. Server looks up the `passkey` row by credential ID, verifies the signature against the stored public key, checks the counter (with the synced `counter: 0` caveat noted once), checks origin against `rpID`, issues a fresh session, redirects via **`safeNext`** (L2's guard, reused — name it, don't re-derive). (green)
5. Signed in — no password, no second factor. State the collapse explicitly: one tap proved *possession* (the device), *biometric* (the local unlock), and *origin* (the browser's check) in a single cryptographic step — what a password + TOTP combo does in two round-trips, one assertion does in one.

Code: small `Code` fences for the button call and the autofill wiring (the `autocomplete="username webauthn"` input + the `signIn.passkey({ autoFill: true })` on-load call). Again no Server Action skeleton — say so once.

Watch-outs landed inline in this section (each at the concept it qualifies, never bundled):
- **`rpID` mismatch** — registrations succeed, assertions silently fail (re-state the section-4 trap at the moment it bites: sign-in is where you discover the bad `rpID`).
- **`NotAllowedError` / user-cancelled / no-credential** — the assertion can fail benignly (user dismissed the prompt, no passkey for this origin on this device); the UI must handle it as "try another way," not a hard error, and must keep a non-passkey path visible.
- **Origin + counter verification** — the library does both; the senior reflex is to *review* any custom WebAuthn code that skips them (and to know the counter check is weak for synced passkeys).

`Term`s: `conditional UI` / `conditional mediation` (one Term), `assertion`, `challenge`, `NotAllowedError`.

### Synced or device-bound: the passkey trade

The product-call section — the `deviceType` / `backedUp` columns from section 4 turned into a decision. Frame the two kinds:
- **Synced (multi-device, `backedUp: true`)** — iCloud Keychain, Google Password Manager, 1Password. The private key replicates across the user's devices, end-to-end encrypted by the platform. The user signs in on a new phone with zero re-registration. The trade: the passkey's security now rides the **cloud account** — compromise the Apple/Google account and the passkey follows. (Note here that synced is exactly the case where `counter` stays 0 — tie back to section 4.)
- **Device-bound (single-device, `backedUp: false`)** — a YubiKey, or a platform credential a managed enterprise pins to the device. The private key *never* leaves the hardware. The trade: lose the device and the credential is gone — there is no sync to recover it.

The senior call (land it as the decision, not a shrug): **synced is the right consumer default** (recovery-on-device-loss is the dominant real-world failure, and platform E2E encryption is strong), **device-bound is the enterprise/high-assurance reach** (when "the key physically cannot be copied" is a requirement worth the recovery friction). This is a `backedUp`-reads-the-decision moment: the app can *see* which kind a user enrolled and tier its policy accordingly.

Diagram / exercise: a **`StateMachineWalker` (`kind="decision"`)** carrying the two-axis decision this lesson owns — it folds the synced-vs-device-bound call *and* the primary-vs-second-factor call into one walk the student commits through. Suggested shape (questions in senior order):
- Q1 "What surface does this protect?" → low-stakes consumer / money-admin-or-others'-data.
  - low-stakes → Leaf: "Passwords + email verification; offer passkeys as an opt-in convenience" (the L6 baseline restated — passkeys aren't mandatory here).
  - high-stakes → Q2.
- Q2 "Primary sign-in or an added second factor?" → primary / second-factor. (Name the `requireSession: false` reach on the primary branch.)
- Q3 (under either) "Must the key be physically uncopyable?" → yes → Leaf "Device-bound (YubiKey); accept recovery friction, surface recovery codes" / no → Leaf "Synced passkeys as the default; recovery codes as the floor."
Pedagogical goal: the senior value is the *order of questions* (stakes → role → copyability), exactly what `StateMachineWalker` is for. Do not also ship a comparison table — the walker is the single decision artifact (the L5/L6 "one decision artifact, not two" rule).

`Term`s: `synced passkey` / `multi-device credential`, `device-bound` / `single-device credential`.

### When the passkey is gone: recovery

Short but non-negotiable — the chapter's recovery-codes thread, seventh-instance, applied to passkeys. The failure mode: a user whose *only* credential is one synced passkey, who then loses access to the iCloud/Google account that holds it, is locked out — same shape as the L6 lost-phone case. The fix is **the recovery codes from L6, reused as the universal fallback** — every passkey enrollment should also ensure the user has recovery codes (the L6 once-only reveal), and "no recovery path" is an explicit, dangerous opt-in, never a default. State the rule the student carries: *a credential the user can lose must have a recovery path you set up before they lose it* — passwords had reset (L4), TOTP had recovery codes (L6), passkeys lean on those same codes. Do not rebuild recovery-code generation; point to L6 and frame passkeys as another consumer of it.

`:::danger` (the one strong aside, the chapter's recurring shape): shipping passkeys as a user's only credential with no recovery codes is a lockout generator — the happy path works perfectly and the user is one lost cloud account from a support ticket or a dead account.

`Term`: reuse `recovery codes` (L6), `single point of failure`.

### External resources

`ExternalResource` cards (4, the chapter's standard count):
- Better Auth Passkey plugin docs (the canonical API surface the agent must ground against).
- MDN Web Authentication API (the spec-level reference for the ceremonies — the outline's "MDN for specific quirks" pointer).
- passkeys.dev or the FIDO Alliance passkeys overview (the synced-vs-device-bound + platform-support reality).
- OWASP Authentication / a current passkey-security write-up (phishing-resistance framing).

---

## Scope

**Prerequisites to redefine concisely (do not re-teach):**
- The `auth` instance / `lib/auth.ts` plugins array + `lib/auth-client.ts` matching plugin set + `@better-auth/cli generate` schema-regen (Ch 052) — name the workflow, don't re-walk it.
- `safeNext` open-redirect guard in `lib/redirects.ts` (L2) — reuse for the post-sign-in redirect, one line.
- Recovery codes + the once-only reveal (L6) — passkeys *consume* this; restate the property in one sentence, don't rebuild the generation/storage.
- The "secret the user holds ≠ the row in the database" hash-at-rest property (L1/L3/L6) — passkeys are its strongest form (public/private key); reference it, don't re-derive.
- TOTP and the live-proxy phishing weakness (L6) — the bridge; assume the student holds it, one-sentence recap.
- `'requires-second-factor'` continuation + the sign-in classifier (L2) — passkey-as-second-factor composes through it; name the seam, don't re-teach the classifier.

**Explicitly out of scope (defer, name once at most):**
- TOTP enrollment/challenge mechanics — L6 (already taught; this lesson only contrasts).
- Step-up / fresh-challenge-for-sensitive-actions middleware — Ch 057 (name once: passkeys can satisfy a step-up; full pattern later).
- Full elevation-tier UI / credential changes from settings — Ch 054 L2.
- Full WebAuthn spec depth (extensions, the exact CBOR/attestation-statement formats, `aaguid`-driven authenticator identification) — point to MDN; the library handles the ceremony.
- FIDO metadata-service attestation verification (compliance-only) — out of scope entirely.
- The `resolveUser` passkey-first onboarding flow — *named* (so the student knows the default `requireSession: true` can be flipped) but **not built**; building it is beyond this lesson's "add a passkey to an existing account" spine.
- Full rate-limit wiring (per-IP + per-email dual-key, `safeLimit`, Upstash) — Ch 074; the passkey endpoints sit behind the same limiter, named at the call site only.
- React Email / send pipeline — Unit 7 (passkeys send no email; not relevant here, no template).

**Do not include:** any claim that passkeys are universally supported (name the device-capability caveat — the L6 trade), any "passkeys replace all other auth" framing (they're a tier + a fallback story), any hand-rolled `navigator.credentials` code as something to *write* (named as what the library calls, never authored by the student).
