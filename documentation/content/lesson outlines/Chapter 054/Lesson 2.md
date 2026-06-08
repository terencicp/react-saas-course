# Lesson 2 — Changing the password and the email

- **Title (h1):** Changing the password and the email
- **Sidebar label:** Change password and email

---

## Lesson framing

Second lesson of Chapter 054, and the **authenticated sibling of Ch 053 L4 (password reset)**. The student already owns the whole toolkit: the five-seam Server Action shape, `Result`/`ok`/`err`, `mapXError` enumeration-collapse, the `verification`-table token model, the "credential change invalidates old sessions — and you have to ask for it" rule, `safeNext`, and the cookie/`freshAge` config from Ch 052 L3. This lesson is the **first place the student spends `freshAge`** (Ch 052 L3 set the value to 10 min; nobody has read it yet) and the first credential mutation that runs while the user *is* signed in. Nothing here is a from-scratch primitive — the teaching weight is two judgment calls layered on top of familiar wiring.

**The spine.** A credential change from settings is an **elevated, authenticated mutation**: it must (1) re-prove the actor at the *right elevation tier* before it runs, and (2) invalidate the sessions minted under the old credential after it runs. Build `/settings/security`, wire `changePassword` and `changeEmail` against Better Auth, and surface the re-authentication prompt when the session is stale.

**The central distinction the student must leave with (the trap this lesson exists to fix).** There are **two elevation tiers**, and beginners collapse them into one "is the user signed in?" check:
- **The current-password prompt** — for a mutation that has an *existing credential to re-prove* (change password). The form *always* requires the current password; the library enforces it. This is the right tier for password change, and it does not lean on `freshAge`.
- **`freshAge` re-authentication** — for high-stakes actions that have *no credential to re-prove* (change email, enable/disable 2FA from L6, add a passkey from L7, delete account). The library (or app) checks `session` freshness and, when stale, returns `'requires-re-authentication'`; the UI re-prompts via `signIn.email` and re-fires.

The mental model: *"signed in" is not "recently proved it's you." Elevation re-proves it — by the credential when one exists, by a fresh sign-in otherwise.*

**Mental model the student leaves with.** `/settings/security` is three independent Server-Action forms on one page, each its own `useActionState`. `changePassword` verifies the current password (constant-time, scrypt — Ch 053 L1's posture), hashes the new one, and — with `revokeOtherSessions: true`, the senior default the library ships as `false` — kills every *other* session (the current one survives). `changeEmail`'s **default** sends a verification link to the *new* address; the senior reach turns on `sendChangeEmailConfirmation` to confirm the **current** address first, then fires app-code notices to both. The `'requires-re-authentication'` branch is just another `Result` discriminant the form switches on, exactly like `'email-not-verified'` was in Ch 053 L2.

> **VERIFIED against current Better Auth (June 2026) — corrects the chapter outline twice.** (1) `changeEmail`'s **default** sends the verification link to the **new** email address; verifying the **current** address first is **opt-in** via the **`sendChangeEmailConfirmation`** callback (the chapter outline's `sendChangeEmailVerification`-to-current-by-default is wrong). This is the *same* "the secure behavior is the flag you turn on" shape as Ch 053 L4's `revokeSessionsOnPasswordReset` — pedagogically better: the verify-on-current-address security property is a deliberate senior choice, not an invisible default. (2) `changePassword`'s `revokeOtherSessions: true` revokes only **other** sessions (the current survives) — the chapter outline's framing holds; verified. Whether `changePassword` *also* enforces a fresh session is version-sensitive (a `sensitiveSessionMiddleware` check is referenced in some sources but not in the stable email-password docs) — treat the **current-password requirement** as the certain, primary tier and have downstream agents verify any freshness requirement against the installed version.

**Pedagogical pain points to pre-empt.**
- *Why does change-password ask for the current password when I'm already signed in?* Answer head-on with the borrowed-laptop threat: a signed-in session on someone else's machine must not be able to rotate the password without re-proving. This is *defense-in-depth*, and it is *also* library enforcement — the `currentPassword` field is required.
- *Why verify change-email on the OLD address, not the new one?* The most counter-intuitive call in the lesson. Verifying the new address proves the user controls the new inbox; verifying the **old** address proves they *currently* control the existing account — which closes the "attacker grabbed a session, tries to lock the real user out by changing the email" path. The new email is a sign-in identifier, so handing it over is a takeover-grade action.
- *Reset vs change-password.* Ch 053 L4 was *unauthenticated* (you can't prove who you are — that's the problem) and revokes **all** sessions. Change-password is *authenticated* and revokes **all but the current** (the user shouldn't sign themselves out). Same invalidation principle, opposite session disposition. Name the symmetry explicitly; it cements the principle.
- *The OAuth-only user.* A user who signed up with Google (Ch 053 L8) has no `'credential'` row. `changePassword` can't verify a current password that doesn't exist — it fails; the senior reach is to detect that state and route them to `setPassword` ("you sign in with Google — set a password to enable email+password sign-in"), not to surface a raw error.

**Inherited conventions that MUST hold (a reviewer grounding on the chapter outline alone will try to restore stale shapes).**
- **Color palette (Ch 053 L1–L8):** blue = parse/config knobs, orange = library call / endpoint work, green = session/success, **violet = the hinge / load-bearing move** (here: the elevation tier *and* the post-change revocation), red = insecure/attacker variant.
- **Two call faces of one instance:** `authClient.changePassword(...)` / `authClient.changeEmail(...)` return `{ data, error }`; `auth.api.*` throws `APIError`. Actions wrap the server face in `try/catch` and translate to `Result`, never expose Better Auth messages.
- **`mapXError` discipline:** key version-volatile error mapping on numeric HTTP `status` where possible; read exact code strings off the client's `$ERROR_CODES`, never hardcode. The `'requires-re-authentication'` case is **not** an error in `lib/result.ts` — model it as its own form-channel discriminant (the Ch 053 L2 `'requires-second-factor'` precedent), or add it to the action's return union; do not force it into the generic `Result.error.code`.
- **`freshAge` = 10 minutes** (Code conventions §Authentication, set in Ch 052 L3 — the course override of the library's 1-day default). The chapter outline says "default 1 day" for `freshAge`; **Code conventions wins** — teach 10 minutes as the course value. Do not "correct" it to the library default.
- **Session revocation is opt-in, not automatic** (the Ch 053 L4 correction): `changePassword`'s `revokeOtherSessions` defaults to `false`; flip it to `true` at every call site. `changeEmail` does **not** revoke on email change by default — revoking is a senior product call.
- **`safeNext`** guards any `?next=`/redirect *your* code reflects; the library validates only its own redirects via `trustedOrigins`.
- **`useActionState` form wiring is Ch 044 L3**, NOT Ch 045 (L1/L2 of Ch 053 corrected this mis-citation; the forms plug in unchanged — one forward-pointer).

**No live sandbox** — Better Auth is server-side against Postgres; `ReactCoding` is react-family only (repo memory). Checks of understanding are recall / ordering / classification / decision, consistent with the whole chapter.

**Slug:** `/054-the-signed-in-session/2-changing-password-and-email/`. Frontmatter mirrors the chapter: `chapter-id: 54`, `course-progress: 0.00005`, `sidebar.order: 2`, `title`/`label` per above. Open with `<CourseProgressBar value={frontmatter['course-progress']} />` as every lesson does.

**Lesson type:** pattern + mechanics hybrid. The action wiring is the 4th/5th repetition of a skeleton the student owns cold, so it ships as **plain `Code` fences, not `AnnotatedCode` walkthroughs** — the annotation budget is spent deliberately on the **elevation-tier decision tree** and the **change-email verify-direction** beats, where the new thinking lives. Flag this as intentional for downstream agents.

---

## Lesson sections

### Introduction (no header)

Warm, brief, per lesson structure. Connect backward in two sentences: Ch 053 L4 handed a *forgotten* password back to someone who couldn't prove who they were; this lesson handles the user who *is* signed in and wants to change the credentials that signed them in. State the goal: stand up `/settings/security`, wire change-password and change-email, and re-prompt for identity when the session has gone stale.

Pose the senior questions as a short bulleted list (the Ch 053 intro format):
- An action this sensitive needs more than a valid session — what's the difference between "you're signed in" and "prove it's still you," and which tier does each change demand?
- A credential just changed — which sessions die, and which one survives?
- Change-email reuses the verification machinery from Ch 053 L3 — so why does the confirmation link go to the *old* address?

Draw the boundary up front (the Ch 053 pattern): this lesson does **not** cover password reset (Ch 053 L4 — the unauthenticated sibling), 2FA / passkey elevation (Ch 053 L6/L7), account deletion (Unit 16), or rate limits on these endpoints (Ch 074). Each is named at its seam.

**Term candidates:** none new in the intro — reuse is fine.

### Signed in is not "still you": the elevation tiers

**Senior question:** the user is signed in, so why is "is there a session?" the wrong gate for changing a password? This section installs the mental model **before** any wiring, the chapter's model-before-code discipline.

Content — the conceptual core of the lesson:
- Re-ground `freshAge` in one sentence (Ch 052 L3 set it; this is its first reader): a session is *fresh* if it was authenticated within `freshAge` — **the course value is 10 minutes** (the library default is 1 day; the course tightened it so high-stakes mutations re-prompt often). Freshness is about *recency of proof*, not whether a session exists.
- The two tiers, taught as distinct tools for distinct situations (this is the trap-breaker — keep them visually and conceptually separate):
  1. **Current-password prompt** — for a mutation with an existing credential to re-prove. Change-password *always* asks for the current password, for two reasons stated together: **defense-in-depth** (a signed-in session on a borrowed laptop can't rotate the password without it) and **library enforcement** (the `currentPassword` field is required). Re-proving the actual credential is a *stronger* check than session recency — so the current-password field, not `freshAge`, is the load-bearing gate here. (Some Better Auth versions *additionally* run a fresh-session check on `changePassword`; downstream agents should verify against the installed version, but teach the current-password requirement as the certain, primary tier.)
  2. **`freshAge` re-authentication** — for high-stakes actions with *no credential to re-prove*: change-email (you're handing over the sign-in identifier, but there's no "current email password"), enable/disable 2FA (L6), add a passkey (L7), delete account (Unit 16). The endpoint checks freshness; stale → the action returns `'requires-re-authentication'` and the UI re-prompts via a fresh `signIn.email`.
- The unifying rule, stated as a one-liner the student carries: **re-prove identity before a sensitive mutation — by the credential when one exists, by a fresh sign-in when it doesn't.**
- Who enforces which: the **library owns the gate** when the endpoint is library-owned (`changePassword` enforces `currentPassword`; `changeEmail`/2FA/passkey enforce `freshAge`). App-owned destructive actions (delete-account, export-data — Unit 16) reach the same `freshAge` gate *explicitly* via the helper. Name this boundary; don't build the app-owned side here.

**Component — `StateMachineWalker` (`kind="decision"`, `elevation-tier`).** This is the section's centerpiece and the right tool: the lesson lives in the *order the senior asks the questions*, and the walker forces a committed walk. Title "Which elevation does this action need?" Question order:
- Root: *Does this action change or re-use an existing password credential?* → **Yes → leaf: current-password prompt** ("the form requires the current password; the library enforces it; `freshAge` not consulted — re-proving the credential is the stronger check"). → **No → next question.**
- *Is the action high-stakes (changes a sign-in identifier, toggles a second factor, or is irreversible)?* → **Yes → leaf: `freshAge` re-authentication** ("library-owned endpoints gate automatically; app-owned destructive actions call the `freshAge` helper; stale session → `'requires-re-authentication'` → re-prompt via `signIn.email`"). → **No → leaf: a valid session is enough** ("ordinary mutations — update display name, change a preference — need authorization at the action boundary, not elevation").
Pedagogical goal: convert "is the user signed in?" into the senior's actual three-way question. Keep it tight — three leaves, no cycles.

**`Term`s:** `freshAge` (re-`Term`: "the recency-of-authentication window; inside it, sensitive actions proceed; outside it, the user re-authenticates — 10 minutes in this course"), `elevation` / `step-up` ("re-proving identity for a sensitive action even though a session already exists").

### The /settings/security page: three forms, one surface

**Senior question:** how does a credential-mutation surface lay out so each form fails and re-prompts independently, and where does the page's own protection live?

Content — orient the student in the surface before the per-form mechanics:
- `/settings/security` is a **protected route** — the Ch 054 L1 proxy bounced signed-out users here already, and the layout's `requireUser()` (Ch 052 L4) is the validating read. State in one clause that the *page itself* sits behind the gate; **elevation is per-action, layered on top of that** (a watch-out lands here: putting the active-sessions list or these forms behind a surface that *doesn't* elevate lets a borrowed laptop mutate credentials — the L1 gate proves "signed in," not "still you").
- **Three independent forms, three `useActionState`s, three Server Actions** (`app/(app)/settings/security/actions.ts`): change password (current / new / confirm), change email (current shown read-only, new), and a **links section** to 2FA setup (L6), passkeys (L7), and active sessions (Ch 054 L3 — the next lesson). Each form is its own `<form action={...}>` with its own pending/`Result` state — one form's error never touches another's. Mirror the form pattern the student owns (uncontrolled inputs, `defaultValue`, `useFormStatus` `<SubmitButton>`) — Ch 044 L3, named not re-taught.
- The `Result` discriminant catalog this surface produces, stated once so the per-form sections can reference it: `'ok'`, `'invalid-credentials'` (wrong current password), `'email-taken'`, `'requires-re-authentication'`, `'no-password-set'` (the OAuth-only edge). Note which are enumeration-sensitive (next bullet).
- **Enumeration carries forward** (the chapter's running thread, applied to this surface): `'invalid-credentials'` and `'email-taken'` must read as the *same shape* of failure — distinct, pointed error copy ("that email is already in use" with certainty) hands an attacker an oracle for which addresses have accounts. One clause; the discipline is owned from Ch 053, re-applied not re-taught.

**Component — a `FileTree`** showing the small surface (`settings/security/page.tsx`, `actions.ts`, and the three co-located form components under `_components/`), so the student sees the shape. Optionally a `Screenshot`-framed mock of the page (three stacked cards + links) — but a `FileTree` plus prose carries it; don't over-build. Lean to `FileTree`.

**`Term`s:** none new — `Server Action`, `useActionState`, `requireUser` all owned.

### Changing the password: re-prove, rotate, revoke

**Senior question:** what's the exact call for an authenticated password change, what's the one knob that makes it a real rotation, and what does the library do behind it?

Content — the first credential mutation, structured as call → knob → side effect:
- **The call:** `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. Walk what the library does (reuse the Ch 053 L1 "library owns the hash" posture — don't re-derive): verifies `currentPassword` against the `'credential'` account row (constant-time scrypt compare), enforces `minPasswordLength` (12, the course floor), hashes `newPassword`, updates the `account.password` for the `'credential'` row. The student writes no hash.
- **The knob (the violet hinge):** **`revokeOtherSessions: true`** is the non-negotiable senior default — *a credential change means the old credential might be compromised, so every other session must die*. The library defaults it to **`false`**; flip it to `true` at the call site, every time. This is the authenticated analogue of Ch 053 L4's `revokeSessionsOnPasswordReset` (name the parallel) — but with one deliberate difference, landed in its own subsection below: it spares the **current** session.
- **The current-password requirement is the elevation** (callback to section 2): the form *always* sends `currentPassword`, even with a fresh session. Re-state the two reasons (defense-in-depth + library enforcement) at the call site so the student connects the tier to the code.
- **The `'invalid-credentials'` branch:** when `currentPassword` is wrong, the action surfaces `'invalid-credentials'` — *the same shape regardless of cause* (enumeration discipline, the Ch 053 L2 reflex on a new surface). Do not distinguish "wrong password" from any other failure in the copy.
- **The action wiring:** the five-seam skeleton, 4th repetition — `changePasswordSchema` (`currentPassword: z.string().min(1)`, `newPassword: z.string().min(12)`, `confirmPassword` with a `.refine` match, the Ch 053 L4 contrast — *setting* a credential re-imposes the floor, the current password is only *checked* so `.min(1)`), empty-then-elevated authorize (the elevation is the `currentPassword` check the library runs, not an app role check), mutate = the library call in `try/catch`, no revalidate, return `ok` or `mapChangePasswordError(error)`.

**Component — a plain `Code` fence (`change-password-action`, `title=".../settings/security/actions.ts"`).** The skeleton is deeply familiar; a full `AnnotatedCode` would over-scaffold. Show schema + action together; line-highlight (`{...}` or `data-mark-color="violet"`) the `revokeOtherSessions: true` line and the `.refine` confirm-match — the two load-bearing bits. Imports stripped per MDX display rules.

**`CodeTooltips`** on the action: `changePassword` (the `{ currentPassword, newPassword, revokeOtherSessions }` signature), `revokeOtherSessions` (one-line: "deletes every session except this one"). Keep tooltips short.

**`Term`s:** none new — `constant-time`, `scrypt`, `user enumeration` all owned (optional single re-`Term` of `user enumeration` for direct landers).

#### Which sessions die: all-but-current, and why the contrast with reset matters

A short, high-weight subsection — the symmetry that turns two flows into one principle.
- Reset (Ch 053 L4, unauthenticated): `revokeSessionsOnPasswordReset: true` kills **every** session — the user can't prove who they are, so nothing is spared.
- Change-password (here, authenticated): `revokeOtherSessions: true` kills every session **except the current one** — the user *is* authenticated and shouldn't sign themselves out mid-task.
- The principle both serve, stated once: **a credential change must invalidate the sessions minted under the old credential — and in both flows it's opt-in, off by default, a line you have to write.** Connect to Code conventions §Authentication ("credential-mutating actions pass `revokeOtherSessions: true`").

**Component — a small lesson-specific figure (`sessions-after-change.astro`, build at `src/components/lessons/054/2/`), wrapped in `<Figure>`.** Reuse the visual language of Ch 053 L4's `sessions-after-reset.astro` (chips echoing the Ch 052 session-table styling) for continuity. Two side-by-side panels, *same* starting chips ("This device", "Phone", "Old laptop"):
- **"Reset (unauthenticated)":** after the change, all three chips struck-through/grey and one fresh chip — caption "no current session to spare; everything dies."
- **"Change from settings (authenticated)":** after the change, "This device" stays **green/live**, the other two struck-through/grey — caption "the session you're using survives; every other key is revoked."
Pedagogical goal: make the all-but-current disposition a single-glance fact and lock the reset↔change symmetry. `<Figure>` caption: "Same principle — kill the keys the old credential minted — two dispositions, because reset can't trust the current session and change-from-settings can."

### Changing the email: confirm the current address, notify both

**Senior question:** an email change reuses the Ch 053 L3 verification primitives — so what's actually new, and why does the confirmation link go to the address the user is *leaving*?

Content — the second credential mutation; lead with the verify-direction decision because it's the counter-intuitive heart *and* the place the library's default is the insecure-by-omission one:
- **The config:** `changeEmail` is **disabled by default**; enable it on the `user` block. The **default** flow, once enabled, sends the verification link to the **new** address via the existing email-verification `sendVerificationEmail` callback, and flips `user.email` only after the user verifies the *new* inbox. The **senior reach** adds the opt-in **`sendChangeEmailConfirmation`** callback — `user: { changeEmail: { enabled: true, sendChangeEmailConfirmation: async ({ user, newEmail, url }) => sendEmail({ to: user.email, subject, react: ChangeEmailConfirmation({ url, newEmail }) }) } }` — whose `to` is **`user.email`, the *current* address**: it confirms the request on the inbox the user already controls *before* the new-address verification proceeds. The library mints the token and builds `url`; the callback only delivers (the Ch 053 L3 `sendVerificationEmail` shape, reused).
- **The call:** `authClient.changeEmail({ newEmail, callbackURL: '/settings/security' })`. With `sendChangeEmailConfirmation` wired, the library first confirms the **current** address; on click (and new-address verification) it flips `user.email` to `newEmail` and lands on `callbackURL`.
- **Why confirm the OLD address, not just the new (the violet hinge — its own beat):** two threat models, stated plainly. Verifying the *new* address proves the user controls the *new* inbox — and that is **all the library's default does**. Confirming the *old* address proves they **currently control the existing account** — which closes the "attacker briefly grabbed a session and tries to lock the real owner out by changing the email" path. The new email is a *sign-in identifier* (`signIn.email({ email, password })`), so handing it over is takeover-grade. **This is the same shape as Ch 053 L4's reset-revocation: the security-correct behavior is the flag you turn on, not the default** — `sendChangeEmailConfirmation` is opt-in, and a student who wires only the happy path ships a change-email that a stolen session can drive. Name dual-verification (current confirms the *request*, new confirms *ownership*) as the full posture; current-confirmation-plus-notice is enough for most SaaS.
- **The notices (app code, through the Unit 7 pipeline):** the library's send is the *verification token*. The senior reach adds two app-code notices: a "your email is being changed to X" heads-up to the **current** address at request time, and a "your email was changed" notice to **both** addresses after the flip — the latter carrying a **"wasn't you?"** link that nukes all sessions and forces a password reset. A silent email change is a takeover-detection failure (watch-out, landed here).
- **The `verification` row, reused not re-derived:** same table as Ch 053 L3, different `identifier` namespace — **`change-email:<userId>:<newEmail>`** (Ch 053 L3 forward-pointed to exactly this as "same primitive, different door"). One-time use by deletion, library-default expiry, token hashed at rest, constant-time lookup — *you already own all of this; the only deltas are the namespace and the entry point.* No re-teaching the two-secret split; point back to Ch 053 L3.
- **Post-change session disposition:** email change doesn't carry "credential compromise" semantics — *the password still works* — so the library does **not** revoke sessions on email change by default. The senior call: revoke anyway if the product treats the email as a sign-in identifier (it is); at minimum, the "wasn't you?" link in the notice gives the user the revoke-all + reset escape hatch. State this as a product-threat-model decision, not a fixed default.
- **The action wiring:** the five-seam skeleton, 5th repetition — `changeEmailSchema` (`newEmail: z.string().trim().toLowerCase().pipe(z.email())`, the Ch 053 L1 normalize-then-validate), mutate = the library call in `try/catch`, return `ok` or `mapChangeEmailError(error)`. The action surfaces `'email-taken'` with the **same shape** as success-pending where the enumeration discipline demands (the library's behavior for an already-taken new email is version-sensitive — teach the *requirement* that the caller-visible response not become an oracle, the Ch 053 L3 resend posture).

**Component — `DiagramSequence` (`change-email-flow`), the lesson's named load-bearing visual** (the counterpart to Ch 053 L3's `verify-flow`). The chapter outline explicitly calls for this sequence. Reuse the palette; horizontal pipeline strip, active stage lit. Stages, each with a one-sentence "what's true now" caption:
1. **Submit new email** (blue) — "The user enters the new address in `/settings/security`. The current email is shown read-only."
2. **Mint token, namespace `change-email:<userId>:<newEmail>`** (orange) — "A `verification` row appears — the same table as email-verification, a different namespace."
3. **Confirm on the CURRENT address** (orange/violet, *the beat to foreground*) — "With `sendChangeEmailConfirmation` wired, the confirmation goes to the address they're *leaving* — proving they control the account *now*. The library's default skips this and only verifies the new inbox; turning this on is the senior call."
4. **(user clicks)** — "Out-of-band. The inbox they already own is the side channel."
5. **Verify new address, flip `user.email` → newEmail** (green) — "The address flips only after the current-inbox owner has confirmed and the new inbox is verified."
6. **Notify both addresses** (green) — "App code sends 'your email was changed' to old and new, with a 'wasn't you?' escape hatch."
Pedagogical goal: make the confirm-on-current-address direction the visually dominant fact (and that it's the opt-in, not the default), and show the namespace reuse without re-teaching tokens.

**`Term`s:** `change-email:<userId>:<newEmail>` is not a Term (it's a namespace literal, explained inline). Re-`Term` `bearer token` lightly only if a direct lander needs it; otherwise reuse from Ch 053 L3.

### The re-authentication prompt: the 'requires-re-authentication' branch

**Senior question:** a high-stakes action came back with "session not fresh" — what does the UI do, and why must the re-prompt go through the real sign-in endpoint?

> **VERIFIED (June 2026) — attribute the freshness signal correctly.** Better Auth's docs confirm `freshAge` (createdAt-based, course value 10 min) but **do not enumerate which endpoints are freshness-gated**, and there is **no documented verbatim `'requires-re-authentication'` library error string**. So model `'requires-re-authentication'` as a **course-defined discriminant the *action* produces** (Code conventions §Authentication: "the action checks `session.freshAge` and returns `Result.err({ code: 'requires-re-authentication' })`"), by either reading freshness via the helper or **mapping the library's stale-session error** — whichever the installed version throws. Downstream agents: do **not** hardcode a `'requires-re-authentication'` string as a Better Auth error code; map the actual stale-session signal (by `status`/code off `$ERROR_CODES`) to the course discriminant, the same `mapXError` discipline used everywhere.

Content — the `freshAge` tier made concrete (this is where section 2's second tier becomes code):
- The flow: a high-stakes action runs behind a freshness check — `changeEmail` is the in-lesson example; 2FA/passkey/delete are the same shape at their seams. When the session is older than 10 minutes the action returns **`'requires-re-authentication'`** (produced by the action: either the library's own freshness gate threw and the action mapped it, or the action read `session` freshness via the helper). The form switches on that discriminant and **replaces the form with a mini re-auth prompt** ("for security, sign in again to continue") — on success it returns the user to `/settings/security` with the action retryable.
- **Model it as a form-channel discriminant, not a `Result.error.code`** — the Ch 053 L2 `'requires-second-factor'` precedent (a *continuation*, not a *failure*: it routes the user to a different screen). State this explicitly so a reviewer doesn't shove it into `lib/result.ts`'s error union.
- **The non-negotiable: the re-prompt calls `signIn.email`** (the real, rate-limited, fixation-defended endpoint), which issues a *fresh* session. **Do not hand-roll a re-auth modal that verifies the password against a custom endpoint** — that bypasses the rate-limit (Ch 074) and session-rotation/fixation defenses the real sign-in carries (watch-out, landed here). The whole point of routing through `signIn.email` is to inherit those defenses for free.
- One clause distinguishing it from the current-password prompt: change-*password* re-proves via the `currentPassword` field (a credential exists); the `freshAge` re-prompt re-proves via a fresh *sign-in* (no per-action credential to re-prove). Same goal (re-prove identity), different mechanism — the section-2 distinction, now visible in two code paths.

**Component — `CodeVariants` (`reauth-right-vs-wrong`), red vs green.** This earns the comparison budget (the action wiring did not). Two tabs:
- **Red — "Hand-rolled re-auth (bypasses the defenses)":** a custom endpoint that re-hashes and compares the password itself, then proceeds — narrate exactly what it loses (rate limit, fixation defense, session rotation).
- **Green — "Re-prompt through `signIn.email`":** the form renders the mini sign-in on `'requires-re-authentication'`, calls `signIn.email`, and re-fires the original action on success.
The contrast *is* the lesson here.

**`Term`s:** `'requires-re-authentication'` (the continuation discriminant), reuse `session fixation` (`Term`'d in Ch 053 L2) for the "why route through `signIn.email`" point.

### The OAuth-only user: no password to change

**Senior question:** a Google user opens the change-password form — there's no current password to re-prove. What does the library return, and what's the senior UX?

Content — the edge the chapter outline flags, kept tight (it's a reach, not a flow):
- A user who signed up via Google (Ch 053 L8) has **no `'credential'` account row** — no password exists. `changePassword` can't verify a `currentPassword` that was never set → it returns **`'no-password-set'`** (or the library equivalent; ground the exact code off `$ERROR_CODES`, don't hardcode).
- The senior reach: don't surface a raw error — detect the OAuth-only state and surface **"You sign in with Google — set a password to enable email + password sign-in,"** with a path to **`setPassword`** (the library surface that *adds* the `'credential'` row). Name two things: `setPassword` is a distinct call from `changePassword` (don't conflate them), and it is **server-only** — it can't be called from the client (it sets a credential with no current password to re-prove, so the library restricts it to the server), so it runs inside a Server Action, not a client `authClient` call.
- Connect to the Ch 053 L8 mirror: that lesson surfaced the *inverse* (an OAuth-only user mistypes email+password at sign-in → `'invalid-credentials'` + a friendly "signs in with Google" branch). Same account state, two surfaces; naming both cements that an account can lack a password and the UI must handle it gracefully.

**Component — none, or a one-line `Code` fence** showing the `'no-password-set'` → `setPassword` branch. Prose carries it; don't over-build a reach.

**`Term`s:** none new — `'credential'` row owned from Ch 052 L2 / Ch 053 L1.

### Closing — the credential-mutation checklist, and the footguns

**Goal:** consolidate via active recall and inoculate against the field-mistakes in one sharp list.

Lead with a short **`MultipleChoice` (`elevation-recall`, multi-select)** checking the section-2 distinction (the lesson's spine): *which statements are true about elevation for credential changes?* Correct: "change-password requires the current password even with a fresh session"; "change-email re-prompts via a fresh sign-in when the session isn't fresh"; "`revokeOtherSessions: true` is opt-in and off by default." Decoys: "a valid session is sufficient to change a password" (no — the credential re-prove is the tier); "`freshAge` is checked when changing the password" (no — the current-password check is the stronger, chosen tier); "changing the email revokes all sessions by default" (no — the library doesn't revoke on email change).

Then a tight **`:::caution` (or `Card`/`CardGrid`) of footguns** — the chapter-outline watch-outs, each a one-liner the student can pattern-match in review:
- **Defaulting `revokeOtherSessions: false` on password change** — the rotation is theater; the old credential's sessions live on.
- **Shipping change-email with only the library default (new-address verification)** — that proves the new inbox but not current control; a stolen session can drive the change. Turn on `sendChangeEmailConfirmation` to confirm the current address first (the opt-in security move, like reset-revocation).
- **Treating elevation as "signed in" instead of "still you"** — destructive actions ride stale sessions.
- **Surfacing `'invalid-credentials'` and `'email-taken'` with distinct, certain copy** — re-opens enumeration.
- **A hand-rolled re-auth modal hitting a custom endpoint** — bypasses the rate-limit and fixation defenses on `signIn.email`.
- **No notification on email change** — a silent change is a takeover-detection failure; notify both addresses.
- **Logging the current or new password anywhere** — a plaintext credential in your logs.

Close with one sentence tying the lesson into the chapter arc: the user can now change the credentials that sign them in, every change re-proves identity at the right tier and revokes the sessions it should — and the *next* lesson (Ch 054 L3) gives the user the surface to *see and revoke those sessions directly* across every device.

### External resources

`CardGrid` of `ExternalResource` cards (the Ch 053 close pattern):
- **Better Auth — change password / change email.** The `changePassword({ currentPassword, newPassword, revokeOtherSessions })` and `changeEmail({ newEmail, callbackURL })` surface, the `user.changeEmail.enabled` default (verifies the *new* address) plus the opt-in `sendChangeEmailConfirmation` callback (confirms the *current* address), and the server-only `setPassword` for OAuth-only users. `icon="simple-icons:betterauth"` if it resolves.
- **Better Auth — session management / `freshAge`.** Grounding for the elevation tier, `freshAge`, and the re-authentication signal. (Verify the exact option/error names against the installed version.)
- **React Email — components / `Button`.** Grounding for the change-email confirmation and notice templates (cross-link, not a re-teach). `icon="simple-icons:react"`.
- **OWASP — Session Management / Authentication cheat sheet.** Canonical ground for re-authentication on sensitive actions and session invalidation on credential change. `icon="simple-icons:owasp"` if it resolves.

---

## Scope

**Prerequisites the student already owns (redefine in one clause max, never re-teach):**
- The five-seam Server Action shape (`parse → authorize → mutate → revalidate → return`), `Result<T>` / `ok` / `err`, `z.flattenError().fieldErrors` — Ch 043, exercised across Ch 053 L1–L4.
- The two call faces (`authClient.*` returns `{ data, error }`; `auth.api.*` throws `APIError`) and the `mapXError` enumeration-collapse keyed on numeric `status` with codes read off `$ERROR_CODES` — Ch 053 L1/L2.
- **`useActionState` form wiring that consumes the `Result`** — Ch 044 L3 (NOT Ch 045; the forms plug in unchanged — one forward-pointer).
- The `verification` table, the two-secret split, bearer-token character, one-time-use-by-deletion, constant-time lookup — **Ch 053 L3** (reused under the `change-email:<userId>:<newEmail>` namespace; NOT re-derived).
- **Session invalidation on credential change** as an **opt-in** discipline (`revokeSessionsOnPasswordReset` for reset; `revokeOtherSessions` is the change-from-settings analogue) — Ch 053 L4.
- `freshAge` value (10 min), `updateAge`, the cookie cache and its staleness window, `__Host-` cookies — Ch 052 L3. This lesson *reads* `freshAge` for the first time; it does not re-configure it.
- The session-read ladder (`getCurrentUser` / `requireUser`) and the proxy gate that fronts `/settings` — Ch 052 L4 + Ch 054 L1. Named as the page's perimeter, not re-built.
- "The library owns the hash" (scrypt), the `'credential'` account row, the OAuth-only account state — Ch 053 L1/L8.
- `safeNext` / open-redirect closure — Ch 053 L2.
- React Email anatomy + the Unit 7 `sendEmail` wrapper — assumed built, not re-taught.
- User-enumeration threat model and the whole-path discipline — Ch 053 L1, re-applied to the `'invalid-credentials'` / `'email-taken'` surfaces.

**This lesson does NOT cover (reserve for their owners):**
- **Password reset for forgotten passwords** (Ch 053 L4) — the *unauthenticated* sibling; named as the contrast that revokes *all* sessions, not built.
- **2FA enable/disable and passkey add/remove elevation** (Ch 053 L6/L7) — named as the other `freshAge`-gated, library-owned endpoints; their flows are not built. This lesson uses change-email as the worked `freshAge` example.
- **The full `?next=` form-side handling / open-redirect rule surface** (Ch 033 L3) — honored at the call site via `safeNext`, not re-derived.
- **The active-sessions list / per-session revoke UI** (Ch 054 L3 — the next lesson) — named as where the user *sees and revokes* the sessions this lesson kills; not built. `revokeOtherSessions` is called here as a flag, surfaced as a button there.
- **Account deletion / data export** and the app-owned destructive-action wrappers that reach `freshAge` explicitly (Unit 16) — named as the app-owned side of the same gate, not built.
- **Audit logging for credential changes** (Ch 057) — out of frame.
- **Rate limits on credential endpoints** (Ch 074) — named at the re-auth call site (`signIn.email` carries the limiter) only; mechanics deferred.
- **The Resend send pipeline / React Email template anatomy** (Unit 7) — owned, referenced, not re-taught.
- **`freshAge` / cookie configuration** (Ch 052 L3) — this lesson reads the value; it does not set or re-explain the config.

---

## Code-convention alignment notes (for downstream agents)

- **Schemas:** top-level `z.email()` (never `.string().email()`); `changePasswordSchema` / `changeEmailSchema` follow `<verbEntity>Schema`. `newPassword: z.string().min(12)` re-imposes the sign-up floor (setting a credential); `currentPassword: z.string().min(1)` (checking, not setting — the Ch 053 L4 contrast); `confirmPassword` via `.refine` with the error on the confirm field. `newEmail` normalized-then-validated (`.trim().toLowerCase().pipe(z.email())`).
- **Actions:** file-level `'use server';`; five-seam shape; `safeParse` first; library call in `try/catch`; return `Result`, never expose Better Auth messages. `mapChangePasswordError` / `mapChangeEmailError` key on numeric HTTP `status` where possible, exact code strings off `$ERROR_CODES`, not hardcoded.
- **Better Auth posture:** all behavior flows through the single `auth` instance / `authClient`; no parallel calls. `revokeOtherSessions: true` on `changePassword` (the conventions' "credential-mutating actions pass `revokeOtherSessions: true`" rule, opt-in over the library's `false`). `changeEmail` verifies the **current** address by default; session revocation on email change is a product call. `freshAge` is the course's 10-minute value (Ch 052 L3 / Code conventions §Authentication) — read, not reconfigured.
- **`'requires-re-authentication'`** is a form-channel continuation discriminant, modeled like Ch 053 L2's `'requires-second-factor'`, NOT a `lib/result.ts` error code. Aligns with Code conventions §Authentication's `freshAge` elevation note (action returns `requires-re-authentication`; UI re-prompts and re-fires).
- **Security baseline:** open-redirect closure via `safeNext` on any reflected redirect; never log the current/new password; the re-auth re-prompt routes through `signIn.email` (inherits the dual-key rate limit built in Ch 074) — never a custom password-verify endpoint.
- **MDX display:** strip imports in shown action/template code per §4 pedagogical rules; mark the `revokeOtherSessions: true` and `sendChangeEmailConfirmation` lines if shown as a diff against earlier blocks.
- **Deliberate pedagogical divergence to flag:** the two actions are shown as **plain `Code` fences, not full `AnnotatedCode` walkthroughs** — they are the 4th/5th repetition of a skeleton the student owns cold; the annotation budget is spent on the `StateMachineWalker` elevation-tier tree, the `change-email-flow` `DiagramSequence`, and the `reauth-right-vs-wrong` `CodeVariants`, where the new thinking lives. This is intentional, not under-scaffolding.
