# Lesson 1 — Password sign-up

- **Title (h1):** Password sign-up
- **Sidebar label:** Password sign-up

---

## Lesson framing

First flow of the chapter. Chapter 052 left a feature-less `auth` instance: four tables migrated, `nextCookies` wired, `getCurrentUser`/`requireUser` helpers, `__Host-` cookies, but nothing the user can *do*.
This lesson turns on the first credential path — email + password sign-up — and ships the enumeration-safe Server Action that wraps it.

**The spine.** One worked feature, end to end: configure `emailAndPassword`, write the `signUp` Server Action in the canonical five-seam shape (Ch 043), land the "check your inbox" success state.
The senior weight is three decisions, not syntax: (1) `requireEmailVerification: true` + `autoSignIn: false` flips sign-up from "session issued" to "no session, email queued"; (2) that same flag pair is *also* what closes the user-enumeration leak — the structural defense, not a copy choice; (3) the library owns password hashing, so the student never touches a hash.

**Mental model the student leaves with.** "Sign-up writes one `user` row (`emailVerified: false`) + one `account` row (`providerId: 'credential'`, hashed password) + one `verification` row, issues no session, and answers identically whether or not the email already existed." The action is a thin translator: Better Auth throws, the action maps the throw to a `Result` code, the form renders it.

**What they can do at the end.** Enable the provider at the 2026 senior floor, write `signUpEmail`-wrapping action with `Result` discriminants, explain why surfacing "email already registered" undoes the enumeration defense, and render the post-sign-up "check your inbox" state. This lesson deliberately *stops* at "email queued" — the token, the email template, and the verify endpoint are Lesson 3.

**Pedagogical stance.**
- This is a **mechanics lesson with one decision insert** (the enumeration trade). Lead each section with the senior question it answers, per the guidelines.
- **No live sandbox.** Better Auth runs server-side against Postgres; the `ReactCoding` iframe can't load it (react-family only — see repo memory), and a Sandpack of the whole stack is not worth the weight. Checks of understanding use **recall/ordering exercises** (Sequence, MultipleChoice, Buckets), which fit "did you internalize the decision/the flow?" better than a coding drill here.
- **One load-bearing diagram:** a `DiagramSequence` of "submit → hash → rows written → verification queued → check-inbox view" — the whole feature on one scrubber. This is the artifact the chapter framing says earns its weight.
- **Cognitive-load order:** enable the provider (smallest delta) → understand what the library does for you (hashing, rows) → write the action → harden it (enumeration) → render the success state. Enumeration lands *after* the action exists so the student sees the leak they're closing.
- **Correction the writer must honor:** the chapter outline claims "Argon2id by default, memory cost 64 MiB…". That is wrong for the current library — Better Auth hashes with **scrypt** by default (confirmed Ch 052 L2 continuity + live docs). Teach scrypt-by-default, frame the takeaway as "the library owns hashing," and present Argon2id only as a *measured custom override* via `password.hash`/`password.verify`. Do **not** assert specific Argon2 cost parameters as defaults.

---

## Lesson sections

Intro (no header): open with the concrete scene from the chapter outline's senior question — a form with name, email, password; submit pressed. Pose the four sub-questions the lesson answers (call shape? where does the hash land? what comes back when the email is taken? how does verification reshape the after-state?). Connect back to Ch 052 ("the instance is wired but inert; this is the water turning on" — reuse the Ch 052 slogan). One sentence promising the end state: a working sign-up that ends on "check your inbox." Render `<CourseProgressBar value={frontmatter['course-progress']} />` right under the frontmatter as every lesson does.

### Turning on the provider

**Senior question:** what's the minimum config that makes sign-up exist, and what are the three knobs a senior moves off the library defaults?

Content. The delta on `lib/auth.ts`: add an `emailAndPassword` block to the existing `betterAuth({...})` call.

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  autoSignIn: false,
  minPasswordLength: 12,
},
```

Teach each knob as **default → why we move it**:
- `enabled: true` — the on switch; nothing exists without it.
- `requireEmailVerification: true` — flips the post-sign-up state from "credential stored, session issued" to "credential stored, verification email queued, **no** session." Name that this is the hinge the whole lesson turns on.
- `autoSignIn: false` — paired with verification so the user never sees a session before the email arrives. State the rule plainly: `autoSignIn: true` **with** `requireEmailVerification: true` is a broken, contradictory state (the canonical misconfig — surface it here, not only in a watch-out).
- `minPasswordLength: 12` — library ships **8**; 12 is the 2026 senior floor. One line: length is the cheap structural floor, not the whole story (entropy comes later in the strength-meter section).

Note for writer: `maxPasswordLength` defaults to 128 — mention once in passing, don't belabor.

How to render. **`AnnotatedCode`** of the `emailAndPassword` block (4 steps, one per knob), `color="blue"` for the override lines, `color="violet"` on `requireEmailVerification` since it's the hinge. This is the right component because each knob needs its own focused explanation on the same small block.
Precede it with a one-line frame that this is an *addition* to the Ch 052 `auth.ts`, not a new file — use a short `Aside` (note) or inline sentence; do not re-show the whole instance.

`Term` tooltips here: none strictly needed; "provider" is clear from context.

### The library owns the hash

**Senior question:** where does the password go, and what algorithm protects it — and is that a decision the student has to make?

Content. The answer the student should internalize: **you don't hash anything.** The library hashes the password with **scrypt** by default (memory-hard, slow by design, native to Node so no extra dependency) and writes the result to `account.password` — the column on `account`, **not** `user` (callback to Ch 052 L2's spine: "your identity is one row; every way you prove it is a separate row"). Per-password salt is handled by the library.

Frame the senior posture: the value of using the library *is* that it encodes the hashing decision correctly. Hand-rolling a hash is where juniors reliably ship `md5`/`sha256`/no-salt. The override door exists — `emailAndPassword.password.hash` / `.verify` lets you swap in Argon2id or any algorithm — but it's a **measured** reach (a specific compliance or perf constraint), not a day-1 choice. Do not teach Argon2 cost parameters; just name that the override exists and the default is fine.

How to render. Prose-led; **no `AnnotatedCode`** (there's no code the student writes here — that's the point). A single short `Code` block could show the *shape* of the override door to make "you could, but don't" concrete:

```ts
// only for a measured constraint — the scrypt default is the right call
emailAndPassword: { password: { hash, verify } },
```

Consider a tiny visual: a one-row "where the hash lands" callout pointing `password (hash)` at the `account` table, reusing the Ch 052 mental model. Optional — a sentence may suffice. If built, plain HTML/CSS inside a `<Figure>`, not a diagram engine.

`Term` tooltips: **scrypt** (one-line: "a deliberately slow, memory-hard password-hashing function; native to Node, which is why Better Auth defaults to it"), **salt** ("per-password random value mixed in before hashing so identical passwords don't produce identical hashes").

### Writing the sign-up action

**Senior question:** the browser can call `authClient.signUp.email` directly — why wrap it in a Server Action at all, and what's the shape?

Content. First, the two call faces (callback to Ch 052's "two ways into one instance"):
- **Client:** `authClient.signUp.email({ name, email, password, callbackURL: '/dashboard' })` → returns `{ data, error }`; `error.code` carries strings like `USER_ALREADY_EXISTS`, `PASSWORD_TOO_SHORT`, `INVALID_EMAIL`.
- **Server (what we use):** `auth.api.signUpEmail({ body, headers })`. **Important behavioral fact the writer must get right:** the server API **throws** an `APIError` on failure (it does *not* return `{ error }`) — `error.body.code` carries the same code strings, `error.status` is `'UNPROCESSABLE_ENTITY'` (422) for a taken email. This is the opposite of the client shape; the action exists partly to translate that throw into the course's `Result`.

Why the action and not a raw client call: the action boundary (Ch 043) is where input is parsed, where the throw becomes a typed `Result` the form branches on, and where the course never leaks a library error message to the UI (Code conventions, Authentication §). The naive client-only call skips all three.

The five-seam shape (Ch 043 `parse → authorize → mutate → revalidate → return`), specialized for sign-up:
1. **parse** — `Object.fromEntries(formData)` then `safeParse` a `signUpSchema` (`z.object({ name, email: z.email(), password: z.string().min(12) })`). On failure → `err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`. Note: use `z.email()` top-level builder and the flat `fieldErrors` projection — both are Code-conventions canon. **Trim + lowercase the email** in the schema (`.trim().toLowerCase()`) so `Ada@acme.com` and `ada@acme.com` don't slip past the unique index — call this out as load-bearing, it's a real watch-out.
2. **authorize** — none for a public endpoint; one line acknowledging the seam is intentionally empty here (sign-up is the one action with no caller to authorize).
3. **mutate** — `await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() })` inside `try/catch`.
4. **revalidate** — none (no cached list changes on sign-up); name the seam, skip it.
5. **return** — `ok({ ... })` shaped to drive the "check your inbox" view (e.g. `ok({ email })` so the success page can echo the address); on caught error, map to a `Result` code (see next section for the enumeration-aware mapping).

How to render. **`CodeVariants`** with two tabs: tab 1 the **client call** (`authClient.signUp.email`, the `{ data, error }` shape) for recognition, tab 2 the **Server Action** (the real artifact). This is the right component — it's a "two related shapes of the same operation" comparison and lets the writer contrast the return-vs-throw surfaces side by side.
Then an **`AnnotatedCode`** of the finished action (5–6 steps walking the seams), `color="green"` on the `ok`/`err` returns, `color="orange"` on the `try/catch` around `signUpEmail`, `color="blue"` on the parse line. The action is complex enough that focusing attention seam-by-seam is the point.

Reference the action's prior art: the form that *consumes* this `Result` via `useActionState` is Ch 044 L3 — the student has seen it; a one-line forward-pointer ("the form wiring is exactly the Ch 044 shape") is enough, do **not** re-teach `useActionState` here.

`CodeTooltips` candidate: on the action signature, tooltip `auth.api.signUpEmail` ("server-side API; throws `APIError` on failure, unlike the client which returns `{ error }`") and `headers: await headers()` ("Better Auth reads the request cookies off the headers; async in Next 16"). Keep to these two.

`Term` tooltips: **`APIError`** ("Better Auth's typed error thrown by `auth.api.*` calls; carries `body.code` and `status`").

### Answering the same way whether the email exists

**Senior question:** the user typed an email that's already registered. What does the response look like — and what happens to your security posture the moment you tell them "that email is taken"?

This is the decision insert — the conceptual heart of the lesson.

Content. The threat: **user enumeration.** If sign-up answers differently for a taken email ("already registered") versus a fresh one ("check your inbox"), an attacker scripts the endpoint to harvest which emails have accounts — a precursor to credential-stuffing and targeted phishing. Define it plainly; the student met the 401/403/threat-framing in Ch 051 but enumeration is new vocabulary.

The structural defense (the verified fact — state it precisely): with **`requireEmailVerification: true`** (or equivalently `autoSignIn: false`), Better Auth's public sign-up endpoint returns the **same 200 success** whether the email is new or already taken — both paths queue a verification email, neither issues a session. The library closes the leak *because* of the flags you already set in section 1. Tie it back: the enumeration defense and the "check your inbox" UX are the **same** configuration — the writer should make this "two birds, one flag" connection explicit and satisfying.

The server-side nuance the writer must handle honestly: `auth.api.signUpEmail` (the server path the action uses) **can still throw `USER_ALREADY_EXISTS`** even while the public endpoint is enumeration-safe. So the action's `catch` must **not** surface a distinct "email already registered" message to the user. The senior mapping: on a caught `USER_ALREADY_EXISTS`, return the **same success-shaped `Result`** the happy path returns (the user is sent to "check your inbox"; if the email was already theirs, they get a fresh verification mail and nothing leaks). Map only *non-enumerating* failures (`PASSWORD_TOO_SHORT`, `INVALID_EMAIL`) to distinct `Result` codes. This is the subtle, easy-to-get-wrong part — give it a focused `AnnotatedCode` or a `CodeVariants` before/after.

The trade, named not sleepwalked: a friendlier "this email is already registered — sign in instead" is a *deliberate enumeration-cost decision* some products make (the support-ticket savings outweigh the harvesting risk for low-value accounts). The rule: **name the trade, decide it on purpose, never default into the leak.** This is the senior judgment the lesson is really teaching.

How to render. **`CodeVariants`** — tab "leaks (don't)" showing the `catch` branching to a distinct `email-taken` message + a `:::danger`-flavored caption, tab "enumeration-safe (do)" showing the `catch` collapsing `USER_ALREADY_EXISTS` into the success path. Before/after is exactly this component's job; the contrast is the lesson.
A short `Aside` (danger) restating the one-liner: "the form must not branch on `email-taken` and render different copy — that re-opens the leak the config just closed."

**Exercise (understanding check):** a **`MultipleChoice`** (multi-select) — "Which of these sign-up responses leak whether an email is registered?" with options like: identical 200 + verification mail for both (safe), "email already in use" inline error (leaks), different redirect for taken emails (leaks), same "check your inbox" page for both (safe), a 422 with `USER_ALREADY_EXISTS` shown to the user (leaks). Two correct → auto multi-select mode. Grades the exact discrimination the section teaches.

`Term` tooltips: **user enumeration** ("an attack that abuses differing responses to learn which emails/usernames have accounts — fuel for credential stuffing and phishing"), **credential stuffing** (one-liner; named in the chapter framing, reused in L2).

### Keeping sign-up minimal: name, and the fields you defer

**Senior question:** the product wants `companyName`, `role`, `timezone` at sign-up. Do they go on the form now?

Content. The mandatory fields are `email` + `password`; `name` is the one optional field worth collecting at sign-up. Everything else is an **`additionalFields`** decision. Show the extension hook from Ch 052 L2: custom columns declared via the top-level `user.additionalFields` config become typed on `signUpEmail`'s `body` and on the session's `user`.

```ts
// lib/auth.ts — top-level user config (not inside emailAndPassword)
user: {
  additionalFields: {
    companyName: { type: 'string', required: false, input: true },
    role: { type: 'string', required: false, input: false }, // admin-set, never user-set
  },
},
```

Teach the **`input` flag** as the load-bearing detail: `input: true` exposes the field on `signUp.email`'s body (the user can set it at sign-up); `input: false` keeps it server/admin-only (the canonical case is `role` — a user must never set their own role at sign-up). This flag *is* the security boundary between "a field the form collects" and "a field the app assigns."

The senior call (the actual lesson): **keep sign-up minimal, defer everything else to onboarding.** Every extra required field at sign-up is friction at the highest-drop-off moment. `name` stays; `companyName`/`timezone` move to onboarding (`input: true` but collected later); `role` is `input: false` and assigned by the app. Present `additionalFields` as "here's the hook *when* you need it," paired immediately with "but the senior default is not to."

How to render. A single `Code` block for the `additionalFields` shape, then prose for the decision. This is a brief section — recognition of the hook + the deferral principle, not a deep dive. One sentence that the field also lands typed on `getSession().user` (callback to Ch 052 cookie-cache caveat: custom fields need to be declared to appear in the cache).

`Term` tooltips: none.

### Optional: a password-strength meter

**Senior question:** `minPasswordLength: 12` is the floor — how does a senior give the user feedback toward a *strong* password without trusting the browser?

Content. Length is the floor enforced server-side; **entropy** is the ceiling, and it's a **UX** concern, never a trust boundary. A client-side strength meter (`zxcvbn-ts`) gives live feedback as the user types — but its score is **never** sent to or trusted by the server; the server's only password rule is `minPasswordLength`. State the hard line crisply: client meter = encouragement; server `minPasswordLength` = enforcement. (Mirrors the Ch 043/044 "client validation is UX, server validation is correctness" thread — call that parallel.)

Name the reach, don't build it: for elevated-risk products, a **HaveIBeenPwned** range/k-anonymity check rejects known-breached passwords — mention as the senior reach, one sentence, no implementation.

How to render. Keep this **short and clearly optional** — a brief subsection or an expandable `<details>` so it doesn't bloat a mechanics lesson. No full meter implementation; the teaching is the trust-boundary line, not the widget. A tiny `Screenshot` of a strength meter could illustrate, but is not required.

`Term` tooltips: **entropy** (reuse Ch 052's definition if one exists: "a measure of unpredictability; high-entropy passwords resist guessing better than merely long ones"), **k-anonymity** (only if HIBP is mentioned with any depth — "a range-query technique that checks a password against breach lists without sending the password itself").

### The success state: check your inbox

**Senior question:** the action returned `ok` — there's no session and no dashboard. What does the user see?

Content. Because `autoSignIn: false`, success is **not** a redirect to `/dashboard`. It's a "check your inbox" view: confirmation copy echoing the email address, and a **resend** button. Wire the resend to `authClient.sendVerificationEmail({ email })` — name that it is **rate-limited** so the button can't be weaponized to flood an inbox (full rate-limit wiring is Ch 074; named here at the call site only, exactly as the chapter framing prescribes).

Hard rule: no session, no `/dashboard`, no protected content — the proxy/`requireUser` gate from Ch 052 would bounce them anyway, but the success page is deliberately a dead-end-until-verified surface. The verify-link click that *lifts* this state is Lesson 3 — end the section with that forward-pointer.

Then **database state post-sign-up** as the closing recap (this is the concrete payoff): exactly three rows now exist —
- one `user` — `emailVerified: false`,
- one `account` — `providerId: 'credential'`, `password: <scrypt hash>`,
- one `verification` — keyed by email.

State who consumes each next: L2 (sign-in) reads `emailVerified`; L3 consumes the `verification` row. This ties the feature to the chapter's shared substrate.

How to render. A `Screenshot` (mobile + desktop via `TabbedContent`, or a single frame) of the "check your inbox" view is the most honest illustration — but a simple hand-coded HTML/CSS mock in a `<Figure>` is fine and lighter. The **database-state recap** is best shown as a tiny three-row table or a compact `<Figure>` with three labeled row-cards (`user` / `account` / `verification`), colored to match the Ch 052 ER diagram if the writer wants continuity.

### Bringing it together (the whole flow)

**Pedagogical goal:** collapse the six sections into one scrubable picture so the student holds the feature as a single sequence, not seven disconnected parts.

Content + render. A **`DiagramSequence`** (the chapter framing's named load-bearing visual) — steps:
1. User submits name / email / password.
2. Action parses input (Zod), trims+lowercases email.
3. `auth.api.signUpEmail` runs; library hashes password (scrypt).
4. Rows written: `user` (`emailVerified:false`) + `account` (`credential`, hash) + `verification` (email).
5. Verification email queued via the Resend pipeline (`sendVerificationEmail` callback) — no session issued.
6. Action returns `ok`; user lands on "check your inbox."
Per-step captions carry the one-sentence "what's true now." Use the same colors as the section diagrams for continuity. This replaces a Mermaid sequence diagram deliberately — `DiagramSequence` lets the student control pace and re-read the enumeration-relevant step (5: "same outcome whether or not the email existed — the leak stays closed").

**Final understanding check:** a **`Sequence`** (ordering) exercise — drag the six steps into order. Reinforces the temporal model; pairs with the diagram. (Alternatively a `Buckets` "what state exists after sign-up?" sort: rows that exist vs. things that do NOT exist yet — session, dashboard access, `emailVerified: true` — but the ordering drill is the stronger fit for a flow.)

### External resources

`ExternalResource` cards (3–4):
- Better Auth — Email & Password docs (the `emailAndPassword` option surface).
- Better Auth — Security / hashing reference (scrypt default, custom hash override).
- Better Auth — API & error handling concept page (`auth.api.*` throws `APIError`).
- OWASP — Authentication / user-enumeration prevention cheat sheet (grounds the enumeration section in the canonical source).

Optional `VideoCallout`: only if a current (≤6-month) Better Auth email/password walkthrough exists and adds signal beyond the docs; otherwise omit. Prior Ch 052 lessons reused a Cosden Solutions Better Auth video — a relevant segment could fit, but do not force it.

---

## Scope

**This lesson covers:** `emailAndPassword` config for sign-up (`enabled`, `requireEmailVerification`, `autoSignIn`, `minPasswordLength`); the scrypt-by-default hashing fact and the `password.hash/verify` override door (named, not configured); the `signUp` Server Action wrapping `auth.api.signUpEmail` in the five-seam shape with `Result` discriminants; the user-enumeration defense and the deliberate-trade decision; the `additionalFields` extension hook + the minimal-sign-up principle; the client-side strength-meter trust boundary (optional); the "check your inbox" success state with rate-limited resend; the three-row database state post-sign-up.

**Explicitly out of scope (do not teach — redefine prerequisites in one line only):**
- **Verification token shape, the React Email template, the verify-click endpoint, post-verify redirect, `autoSignInAfterVerification`** — all **Lesson 3 of this chapter**. This lesson stops at "verification email queued"; it must not show the token, the `sendVerificationEmail` callback body, or the verify handler. Mention `sendVerificationEmail` by name only as the seam the queued email rides.
- **Sign-in, the failed-attempt counter, the full `Result` discriminant catalog (`invalid-credentials`/`too-many-attempts`/`requires-second-factor`), `rememberMe`, session rotation on sign-in** — **Lesson 2**.
- **Password reset** (L4), **magic links** (L5), **TOTP/2FA enrollment** (L6), **passkeys** (L7), **OAuth/social sign-up** (L8), **account linking** (L9).
- **Change-password / change-email from settings** — Ch 054 L2.
- **Full rate-limit wiring** (per-IP + per-email dual-key, `safeLimit`, `RateLimit-*` headers) — **Ch 074 L3**. Named at the resend call site only.
- **Email template anatomy / React Email vocabulary** — Ch 049. **Send pipeline / `lib/email.ts` wrapper internals / suppression list** — Ch 048 + Ch 050. Treat `sendEmail` as the already-built wrapper from Unit 7; do not re-teach it.
- **`useActionState` / form-component wiring / field-error rendering** — Ch 044 L3 (one-line forward-pointer only; the form consuming this action's `Result` is assumed knowledge).
- **Cookie config, session lifetimes, `__Host-` prefix, cookie cache** — Ch 052 L3, already shipped. Sign-up issues no session, so none of this is touched here.
- **`getCurrentUser`/`requireUser`/`proxy.ts` gate** — Ch 052 L4, already shipped; referenced only to explain why the success page can't reach `/dashboard`.

**Prerequisites to redefine in one concise line each (not re-teach):** the `Result<T>` shape + `ok`/`err` helpers (Ch 043); the five-seam action shape (Ch 043); the `account` vs `user` table split and the `verification` table (Ch 052 L2); the server-vs-client call faces `auth.api.*` / `authClient.*` (Ch 052 L1); `z.email()` + flat `fieldErrors` via `z.flattenError` (Ch 042 / Code conventions).

---

## Notes for downstream agents (deliberate divergences + facts to honor)

- **Hashing = scrypt, not Argon2id.** The chapter outline is wrong here; this is a verified correction (live docs + Ch 052 L2 continuity). Do not teach Argon2 cost parameters as defaults. Argon2id is only a custom override.
- **`auth.api.signUpEmail` throws `APIError`** (server path) — it does not return `{ error }` like the client `signUp.email`. The action's `try/catch` and the error-code mapping depend on this; get it right.
- **Taken-email code is `USER_ALREADY_EXISTS`** (422). A `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` variant exists on some paths; the canonical source of the exact strings is the client's `$ERROR_CODES` object — reference it rather than hardcoding a literal that may drift across versions.
- **Enumeration safety is conditional on `requireEmailVerification: true` (or `autoSignIn: false`).** The defense and the "check your inbox" UX are the *same* config — make that connection the satisfying payoff of the enumeration section.
- **`requireEmailVerification: true` paired with `autoSignIn: false`** is the intended pair; `autoSignIn: true` + `requireEmailVerification: true` is the canonical broken state.
- **`useActionState` is Ch 044 L3, not Ch 045.** The chapter outline mis-cites "lesson 2 of chapter 045"; the real reference is Ch 044 L3 (Ch 045 is React Hook Form). Forward-point to Ch 044.
- **No live coding component.** Use Sequence / MultipleChoice / Buckets for checks. Do not plan a `ReactCoding` or Sandpack Better Auth sandbox.
- Lesson-specific components, if any (e.g. a custom "rows written" figure or strength-meter mock), live at `src/components/lessons/053/1/<Name>.astro`.
- Frontmatter: follow the established shape (`title`, `tagline`, `chapter-id: 53`, `course-progress`, `sidebar: { order: 1, label: 'Password sign-up' }`). Compute `course-progress` consistent with neighboring lessons.
