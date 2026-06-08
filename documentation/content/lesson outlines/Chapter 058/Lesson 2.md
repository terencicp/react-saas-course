# Minting the signed accept link

- **Title (h1):** Minting the signed accept link
- **Sidebar label:** Minting the accept link

---

## Lesson framing

This is a **pattern lesson**: build one Server Action, `sendInvitation`, end to end. The student arrives from lesson 1 with the `invitation` table already modeled (plugin columns + `tokenHash` + `acceptedAt`, the partial-unique-pending index, the `INVITATION_STATUSES` union, `INVITATION_TTL_SECONDS`). They have, from chapter 057: `authedAction(role, schema, fn)` returning a `FormData` action with `ctx = { user, orgId, role, db }` where `db = tenantDb(orgId)`; `withTenant(orgId, async (tx) => …)`; `logAudit(tx, event)` that takes a `Transaction` and derives actor/IP/UA itself; `ok`/`err` from `@/lib/result`. From Unit 7/8: `sendEmail({ to, subject, react, idempotencyKey })` → `Result`, templates at `src/emails/<name>.tsx`, `env.NEXT_PUBLIC_APP_URL`. From chapter 016 lesson 1: `crypto.getRandomValues`, `crypto.subtle` HMAC sign/verify, constant-time compare.

**The single load-bearing idea**: a pending invitation is a *bearer credential mailed to a stranger*, and the senior discipline is to treat it like one — random-not-guessable, hashed-at-rest, signed-for-fast-rejection, and committed-before-delivered. Everything in the lesson hangs off that frame. The student already met "hash the bearer secret at rest" for the token column in lesson 1; this lesson is where they *generate* the secret and *deliver* it, and where the second crypto layer (the HMAC signature) and the transaction-boundary discipline get taught.

**Two senior reflexes carry the whole lesson and must be foregrounded, not buried:**

1. **The token authenticates; the HMAC is a cheap doorman.** Beginners conflate the two or think the signature *is* the security. Teach them as two layers with different jobs: the 32-byte random token is the actual credential (verified by hash lookup), the HMAC is a stateless pre-check that rejects tampered/garbage URLs *before* a DB round-trip and proves "even someone who read `tokenHash` from the database can't forge a working URL without the signing secret." This is the conceptual spine — give it a diagram.

2. **The row commits inside the transaction; the email send happens outside it.** This is the same "no external IO inside `db.transaction`" rule the student met in 057, now with real production stakes: if Resend is down, the *row already exists* and the admin gets a resend affordance — versus the inverse failure (send inside the txn) that leaks emails pointing at rolled-back rows. Give this a sequence diagram. The deferred-queue alternative (Trigger.dev) is named once and explicitly deferred.

**Naming reconciliation (deliberate divergence from outline/TOC wording).** The chapter outline and quiz call the action `sendInvitationAction`. The 057 code conventions are explicit: Server Actions are plain verb+noun with **no `Action` suffix** unless disambiguating (`acceptInvitation`, `removeMember`). Name it **`sendInvitation`** in all code. Mention the suffix-free convention in one sentence where the action is first declared (the student saw the same note for `removeMember` in 057). The URL-builder helper and the audit event name stay as the outline specifies.

**Relationship to Better Auth's `inviteMember`.** The senior posture (from the chapter framing) is to consume the plugin's *table shape* but write the *send path* by hand, because Better Auth's default invitation flow uses a predictable invitation ID as the credential and mails a link the application doesn't control. The student's hand-rolled random-token + hashed-at-rest + HMAC URL is strictly stronger and is the thing that lets the audit row and the signed-URL discipline live at the call site. State this once, early, as the "why are we writing this ourselves" answer — do not re-litigate the plugin's API.

**Cognitive-load staging.** The action has eight steps but the lesson must not dump all eight at once. Build understanding in this order: (1) the credential frame + token generation as an isolated idea, (2) the two-layer auth model with the HMAC diagram, (3) the `signedInviteUrl` helper as a small pure function the student writes and tests in a sandbox, (4) the transaction boundary as a diagram, (5) only *then* the assembled eight-step action via `AnnotatedCode` walking the seams in execution order. The exercise (the URL helper + its verify twin) lands at step 3, before the full action, so the student has hands-on the crypto before seeing it embedded.

**Components-not-yet-built note for downstream agents.** Chapter 058's lesson-1 components (`TokenAtRest.astro`, `InvitationHandoff.astro`) do not exist on disk yet at outline time — the continuity notes are forward-looking. Do not import them. This lesson proposes its own custom components (below).

---

## Lesson sections

### Introduction (no header)

Open on the concrete moment that motivates the lesson, in the chapter's established voice (warm, terse, production-framed). Alice types `bob@acme.com`, picks `member`, clicks **Send invite**. Frame the next request as a chain of obligations: mint a random token, hash it, write a pending row, build a URL Bob can click from his mailbox, sign it so junk rejects fast, mail it — and do all of that *without* leaking the raw token to logs and *without* leaving a half-built state if Resend hiccups. State the lesson's deliverable plainly: one action, `sendInvitation`, built end to end, plus the small `signedInviteUrl` helper underneath it. Connect to prior knowledge in one breath — "you have `authedAction`, `withTenant`, `logAudit`, and `sendEmail`; this lesson is where they assemble into a real send path." End the intro with the one sentence that frames everything: **a pending invitation is a bearer credential you are mailing to a stranger — so build it like one.** No `CourseProgressBar` instruction here (the build agent owns frontmatter); just write the prose.

### A bearer credential you mail to a stranger

**Goal:** install the threat model before any code, so every later decision (random token, hash at rest, HMAC, redaction) reads as inevitable rather than ceremonial.

Content:
- Define the credential frame. The accept URL *is* the proof of who you are — whoever holds it can join the org. That makes the raw token exactly as sensitive as a password, with one difference the student already knows from lesson 1: it's high-entropy and throwaway (7-day window), so it's hashed with **SHA-256, not bcrypt/argon** — a fast hash is correct here, a slow hash would be cargo. Re-state this in one sentence (it's a lesson-1 callback, not a re-teach).
- Name the three places the raw token can leak and the disposition of each: (a) the **database** — never; only `sha256(token)` lands there (lesson 1's posture, now the *reason* it mattered becomes concrete). (b) **server logs / Sentry breadcrumbs** — never; the `token` and `sig` query params get redacted at the logger. (c) the **email body** — the *one and only* place the raw token legitimately appears outside server memory. Frame (c) as the deliberate exception: the inbox is the credential's destination, so it belongs there and nowhere else.
- The "why are we writing this ourselves" beat: one short paragraph. Better Auth's organization plugin owns the table and an `inviteMember`/`acceptInvitation` API, but its default credential is a predictable invitation ID, and its mail path isn't yours to instrument. The senior move is to keep the plugin's table shape and hand-roll the send so the random token, the hash-at-rest, the HMAC, and the audit row all live where you control them. Do not turn this into a Better Auth API tour.

Components:
- A small **annotated illustration** (HTML+CSS inside `<Figure>`, or a custom `.astro` component — see "Custom component A" below) showing the same token appearing in three contexts with a check/cross verdict on each: **DB row** (shows `tokenHash`, raw token crossed out), **logs** (raw token crossed out, redacted), **email body** (raw token present, check). Pedagogical goal: make "one secret, three trust boundaries" a single glanceable picture. Keep it horizontal, short.

Terms (`Term`): **bearer token** (a credential where possession alone grants access — no further identity proof). Reuse the existing definition style from 057.

### Thirty-two random bytes, encoded for a URL

**Goal:** teach token *generation* as an isolated, correct call shape, and kill the two weak-entropy traps.

Content:
- The call shape, taught precisely: `crypto.getRandomValues(new Uint8Array(32))` produces 32 cryptographically-random bytes (256 bits of entropy). Encode for the URL with `Buffer.from(raw).toString('base64url')` → a 43-character URL-safe string (no `+`/`/`/`=` to escape). The raw bytes are computed once in memory; `sha256` of the encoded token lands in `tokenHash`; the encoded token goes into the URL; both are discarded after the send.
- The two disqualifying alternatives, named as traps the student must recognize: **`Math.random()`** — not cryptographically secure, fully disqualifying, one sentence. **`crypto.randomUUID()` as the *sole* token** — 122 bits is *fine* entropy, so be precise: it's not "wrong," it's "not the senior reflex here" because the 32-byte approach gives a uniform high-entropy bearer string that composes cleanly with the hash and the URL, and avoids mixing a UUID's identity-shaped value into a credential slot. Don't overstate this one.
- One-sentence forward pointer: the hashing call (`sha256`) and where it's stored were settled in lesson 1; this lesson generates the input to it.

Components:
- `Code` block (simple) for the two-line generate-and-encode snippet. This is small enough that `AnnotatedCode` is overkill — a plain fenced block with a couple of inline `"getRandomValues"` / `"base64url"` highlights, or `CodeTooltips` on `getRandomValues` and `base64url` for inline definitions.
- `CodeTooltips` candidates: `getRandomValues` ("Fills a typed array with cryptographically-strong random values. The CSPRNG behind every token in this stack."), `base64url` ("URL-safe Base64: `-`/`_` instead of `+`/`/`, no `=` padding. 32 bytes → 43 characters, safe to drop in a query string unescaped.").

### What the signature adds that the token can't

**Goal:** the conceptual spine — teach the two-layer model (random token authenticates, HMAC pre-checks) so the student never thinks the signature is the security, and understands *why* you'd bother signing a value that's already unguessable.

Content:
- State the puzzle the student should be feeling: "if the token is already 32 random bytes verified by hash lookup, why sign anything?" Answer in two moves.
- **Move 1 — the token is sufficient for authentication.** Guessing a valid token is infeasible; the accept path looks it up by `tokenHash`. So authentication is *done* by the token alone.
- **Move 2 — the HMAC is a stateless, pre-database reject.** A garbage or tampered URL (someone fuzzing `?token=`) would otherwise force a DB lookup before it fails. The signature lets the server reject it with a constant-time string compare *before* touching the database — cheaper, and it closes a subtler property: even an attacker who somehow read `tokenHash` out of the database still can't *forge* a working URL, because they don't hold the HMAC secret. The DB is now a pure key/value store with no forge-from-read capability.
- The URL shape, stated exactly: `${NEXT_PUBLIC_APP_URL}/accept-invite?id=${invitationId}&token=${rawToken}&sig=${hmac}` where `hmac = base64url(HMAC-SHA256(secret, invitationId + '.' + rawToken))`. Name the canonical signing payload (`invitationId + '.' + rawToken`) and stress it must stay byte-identical between sign and verify — this is the contract the helper enforces.
- The secret: a **separate** env var `INVITATION_SIGNING_SECRET` (32 random bytes, base64). Teach the senior rule explicitly: never reuse one secret across two cryptographic uses — the session secret and the invite-signing secret have different blast radii and rotation cadences; sharing them tangles rotation. One sentence on where it's declared (`env.ts`, server-side) and that `.env.local` carries a generated value.

Components:
- **Custom component B — `SignedUrlAnatomy`** (proposed, see spec below) OR a `TabbedContent` / annotated illustration that dissects the URL into its four parts (`base` · `id` · `token` · `sig`) with a one-line role under each, and a second panel/tab showing the verify-side flow ("recompute `hmac` from `id`+`token`, constant-time compare against `sig`, reject on mismatch *before* DB"). Pedagogical goal: make the "two layers, two jobs" model spatial. The token part is tinted as "the credential," the sig part as "the doorman." If a single static figure is clearer than tabs, use HTML+CSS in `<Figure>`.
- `Aside` (caution): the secret-reuse rule, stated as a one-liner the student carries forward.

Terms (`Term`): **HMAC** ("Hash-based Message Authentication Code: a keyed signature. Anyone with the secret can produce or verify it; without the secret you can't forge one, even knowing the message."). **constant-time compare** ("String comparison that always takes the same time regardless of where the first difference is, so an attacker can't learn the secret byte-by-byte from response timing.") — reuse/ref the chapter-016 definition.

### Building `signedInviteUrl`, and its verify twin

**Goal:** the student writes the crypto by hand, in one place, as a pure function — and writes the verify twin so they internalize that sign and verify must agree. This is the live-coding beat and it lands *before* the full action.

Content:
- Frame the helper as the single source of truth for what's in the URL: `signedInviteUrl(invitationId, rawToken)` in `src/lib/invitations/url.ts`, a pure async function (async because `crypto.subtle` is). One function, one place to read the URL shape, one place to keep the signature in sync with the accept path's verify.
- Walk the implementation with `AnnotatedCode`: (1) `import 'server-only'` (the secret must never ship to the client) + read `INVITATION_SIGNING_SECRET` from `env`; (2) import the secret as an HMAC `CryptoKey` via `crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])`; (3) sign: `crypto.subtle.sign('HMAC', key, encoder.encode(invitationId + '.' + rawToken))`; (4) base64url-encode the resulting `ArrayBuffer`; (5) assemble and return the absolute URL from `env.NEXT_PUBLIC_APP_URL`. Note the senior detail: build the URL from the named env var, **never** from a route handler's `request.url` host — fragile in preview deployments. State that the verify twin (full version) lives in lesson 3; here the student builds a small `verifyInviteUrl(invitationId, rawToken, sig)` that recomputes and constant-time-compares, to prove the round-trip.
- Constant-time compare: use `crypto.subtle.verify('HMAC', key, sigBytes, data)` (which is inherently constant-time for the MAC) as the senior call, and name why `===` on the signature is wrong (timing leak). This is a chapter-016 callback — re-state in one sentence, don't re-teach the timing-attack theory.

Components:
- `AnnotatedCode` for `signedInviteUrl` (5 steps, execution order, blue/green/violet tints per the 057 house style).
- **Exercise — `ScriptCoding` with `runner="sandpack"`** (TS + Web Crypto is available in the Sandpack iframe; note for build agent: Web Crypto `crypto.subtle` works in the browser sandbox, no npm needed). Task: implement `signInvite(id, token, secret)` returning the base64url HMAC, and `verifyInvite(id, token, secret, sig)` returning a boolean via a constant-time compare. Provide a fixed `secret` and fixtures in the test block. Grading criteria: (a) `signInvite` is deterministic for the same inputs; (b) a round-trip `verify(sign(...))` is `true`; (c) flipping one character of `token` makes verify `false`; (d) a different secret makes verify `false`; (e) `signInvite` does not throw on empty token. Instructions paragraph: explain the sandbox provides `crypto.subtle`, the student writes both halves, and the point is that sign and verify must agree on the exact payload string. Reveal-solution `<details>` with the canonical implementation and one paragraph on why the payload string must be byte-identical. *Fallback for build agent:* if `crypto.subtle` is unavailable or async-flaky in the Sandpack runner, downgrade to a synchronous toy-HMAC stub (provided in starter) so the exercise still teaches the *round-trip discipline* even if the primitive is faked — note this as a deliberate staged simplification in a comment.

Terms: none new (HMAC/constant-time already introduced).

### The send action, seam by seam

**Goal:** assemble the eight steps into `sendInvitation`, now that every primitive is understood. This is the lesson's centerpiece code artifact.

Content:
- Declare the action: `export const sendInvitation = authedAction('admin', sendInvitationSchema, async ({ email, role }, ctx) => …)`. One sentence on the suffix-free naming convention (callback to `removeMember` in 057). The schema: `z.object({ email: z.email().toLowerCase(), role: z.enum(['admin', 'member']) })` — point out `'owner'` is excluded *at the type level* (defense in depth: the form excludes it, the schema refuses it). Use the Zod-4 top-level `z.email()` builder, not the deprecated `.string().email()` chain (code-convention compliance — state this is the current form).
- Walk the eight steps via `AnnotatedCode` (`maxLines={18}`, scrolls), each step a tinted highlight + one-paragraph explanation, in execution order:
  1. **Entitlement check** — named, deferred to chapter 064 (`entitlements.canInviteMember(orgId)` before the write). Shown as a single commented line / `TODO(chapter 064)`, not implemented.
  2. **Collision check** — named, deferred to lesson 4 (the re-invite branch is caught from the partial-unique-index error, not pre-queried). One line acknowledging it; the *why* (race window on SELECT-then-INSERT) gets one sentence and a pointer.
  3. **Generate the token** — `crypto.getRandomValues` + base64url (the student now knows this cold).
  4. **Write the row inside the transaction** — `withTenant(orgId, async (tx) => …)`: insert the `invitation` row with `tokenHash: await sha256(rawToken)`, `status: 'pending'`, `role`, `email`, `inviterId: ctx.user.id`, `expiresAt` computed from `INVITATION_TTL_SECONDS`, returning the generated `id`.
  5. **Write the audit row** — `logAudit(tx, { action: 'invitation.sent', subjectType: 'invitation', subjectId: invitationId, payload: { email, role } })`, *inside the same `withTenant` block* (callback to 057: row + audit share `tx`, share a fate). Stress the audit records *intent* (Alice invited Bob as member at this time); delivery success/failure is a separate dimension, not an audit fact.
  6. **Sign the URL** — `signedInviteUrl(invitationId, rawToken)`, *after* the transaction closes (it needs the committed `id` and the raw token still in memory).
  7. **Send the email** — `sendEmail({ to: email, subject, react: <InviteEmail … />, idempotencyKey })`, *outside* the transaction. On failure, return `err('internal', …)` carrying the `invitationId` so the UI can offer resend (lesson 4). Stress: the row already exists, so a failed send is recoverable, not a half-state.
  8. **Revalidate + return** — `revalidatePath('/settings/members')` so the admin's pending list updates, then `return ok({ invitationId })`.
- After the walkthrough, a short synthesis paragraph naming the two non-negotiable orderings the student should carry: **audit rides inside the transaction; email send rides outside it.** Tie back to the chapter's "make the wrong shape impossible" philosophy where it applies (`logAudit(tx, …)` won't compile with the pooled client).

Components:
- `AnnotatedCode` for the full `sendInvitation` body (the centerpiece). Steps tinted per house style. Keep each step's prose ≤6 lines.
- A `Sequence` exercise (ordering drill) is a strong fit here: give the eight step labels shuffled and have the student order them, with the fixed constraint that "write row + write audit" are inside the txn and "send email" is after. Pedagogical goal: cement the ordering without re-reading the code. Use the `Sequence` component with the action's code block fixed above the steps. *Alternative:* a `MultipleChoice` asking "which step must happen *outside* the transaction and why" if a full ordering drill feels heavy.

Terms: none new.

### Why the email send waits for COMMIT

**Goal:** make the transaction-boundary decision visual and memorable via a sequence diagram, and name the deferred-queue alternative once.

Content:
- Re-state the rule with production stakes: the `invitation` row + audit row commit inside `withTenant`; the Resend call happens after. Then walk the two failure timelines explicitly:
  - **Send-inside-txn (the trap):** Resend call sits inside the transaction. If the send is slow it holds a DB connection (pool starvation, the 057 rule); worse, if the *transaction* later rolls back, you've already mailed Bob a link to a row that no longer exists — an orphan credential. Strictly the worse failure.
  - **Send-after-commit (correct):** row is durable first. If Resend is down, the admin gets `err` carrying `invitationId` and a "resend email" affordance (lesson 4). The row is the source of truth; the email is a delivery; resend is cheap.
- The deferred-send recovery story, named once and deferred: year-2 reach is queueing the send through Trigger.dev with retries + dead-letter (Unit 13 territory). Year-1 is the synchronous send with the visible resend affordance. One sentence; do not build it.
- Rate-limiting, named once and deferred: invite-sending is a real abuse vector (a compromised admin spams thousands of addresses → the org's domain lands on a deliverability blocklist). Chapter 074 owns it; the senior reflex *here* is to name the limit ("~20 invites per admin per hour, plan-configurable") and note it applies via the same middleware that gates other actions. One sentence; do not build it.

Components:
- **Sequence diagram (Mermaid, in `<Figure>`).** Actors: `Admin (form)`, `sendInvitation`, `Postgres`, `Resend`, `audit_logs`. Sequence: form submit → action parses/authorizes (via wrapper) → generate token → `BEGIN` → INSERT invitation → INSERT audit → `COMMIT` → (txn closed) → `signedInviteUrl` → Resend send → return `ok`. Add a clearly-marked alternative fragment / second tab showing the failure path: `COMMIT` succeeds, Resend send **fails**, action returns `err(invitationId)`, row survives. Pedagogical goal: the COMMIT line is the visual pivot — everything DB-side is left of it, the email is right of it. Follow the chapter-016/057 mermaid conventions (escape literal `;`, bump `themeCSS` font for readability). Cap height ~800px.
- `Aside` (note): the one-line deferred-queue + rate-limit pointers, so they don't clutter prose.

### The email Bob actually receives

**Goal:** the `InviteEmail` template and the dev-only URL surface — small, concrete, closes the loop on "where the raw token goes."

Content:
- The template: `<InviteEmail orgName inviterName acceptUrl expiresAt />` at `src/emails/invite.tsx`, written alongside the `WelcomeEmail` the student built in chapter 050 (same `EmailLayout` chrome, same `react`-node-to-`sendEmail` posture). Keep this *light* — chapter 049 owns authoring React Email templates in depth; this lesson only wires the props through. The `acceptUrl` prop is the *only* place the raw token appears in the rendered output.
- Two senior details on the template, each one sentence: (a) the accept URL carries **no UTM/analytics tags** — a tracker or link-prefetcher that fetched the URL would *consume* the invitation; the URL is a credential, not a marketing link. (b) `inviterName` (from `ctx.user.name`) and `orgName`/`logo` from the active org are a *recognition* feature, not a security one — "Alice invited you to Acme" reads faster than "You've been invited."
- The dev-only convenience: in `NODE_ENV !== 'production'`, surface the accept URL in the admin UI next to the "invite sent" toast so local testing skips the mailbox. State the production rule sharply: **never** surface the URL in the inviter's UI in production — after send, it's a credential the inviter shouldn't possess.

Components:
- `CodeVariants` (or two `Code` blocks) for the template: one tab the minimal `InviteEmail` component, one tab the call site building `<InviteEmail … />` inside the action's send step (ties back to the eight-step walk). Keep prose ≤6 lines per tab.
- `Aside` (caution): the "no UTM tags / no prefetch / never surface in prod UI" rule as one consolidated callout — these are the three ways a well-meaning dev burns an invitation.

### Where this leaves the invitee (closing)

**Goal:** brief synthesis + forward pointer. Not a new concept section.

Content:
- One paragraph: the student now has a `sendInvitation` that mints a credential, hashes it at rest, signs the URL, commits before it sends, and writes the audit row inside the transaction. The raw token lives in exactly one place outside server memory — Bob's inbox.
- Forward pointer: the next lesson is the *other side* of that URL — Bob clicks the link, and the accept route has to verify the signature, look up the row, and route four different arrival shapes (signed-in same-email, signed-in different-email, signed-out with account, signed-out without). The `verifyInviteUrl` twin the student sketched here becomes the accept path's first gate.
- Optional `ExternalResource` cards (MDN SubtleCrypto `sign`, MDN `getRandomValues`, Better Auth organization plugin docs) if the build agent wants an external-resources block — keep to 2–3, official sources.

---

## Scope

**This lesson covers:** the `sendInvitation` action end to end — 32-byte Web Crypto token generation, base64url encoding, the `signedInviteUrl` HMAC helper, the `INVITATION_SIGNING_SECRET` env var and secret-reuse reasoning, the two-layer (token + HMAC) auth model, the transaction boundary (row+audit inside, email outside), the `'invitation.sent'` audit event, the `InviteEmail` template wiring, and the dev-only URL surface.

**Already taught — redefine only in one concise sentence each, do not re-teach:**
- The `invitation` table shape, `tokenHash` column, `INVITATION_STATUSES`, the partial-unique-pending index, `INVITATION_TTL_SECONDS`, and *why* the token is SHA-256-hashed-at-rest (lesson 1). This lesson *generates* the token and *stores* its hash; it does not re-derive the schema.
- `authedAction(role, schema, fn)`, the `ctx` payload, the five-seam action shape, `Result`/`ok`/`err` (chapter 057 lessons 2–3).
- `withTenant(orgId, fn)` and `SET LOCAL app.org_id` (chapter 056 lesson 4).
- `logAudit(tx, event)`, the `Transaction`-typed first param, the audit table, the `entity.verb-pasttense` event convention (chapter 057 lesson 5).
- `sendEmail({ to, subject, react, idempotencyKey })`, the suppression gate, `env.NEXT_PUBLIC_APP_URL`, React Email template basics (Unit 7, chapter 050).
- `crypto.getRandomValues`, `crypto.subtle` HMAC sign/verify, constant-time compare theory (chapter 016 lesson 1).
- `revalidatePath` and the read-your-writes invalidation choice (Unit caching conventions; the student has used it since the forms unit).

**Explicitly deferred — name once, do not build:**
- The accept route, signature verification flow, the four arrival shapes, the active-org switch, auto-`emailVerified` (lesson 3). The `verifyInviteUrl` twin sketched here is a *teaching stub*; its production home is lesson 3.
- The collision/re-invite branch (catch-and-translate the unique-pending error → `'already-invited'`), resend with token rotation, revoke (lesson 4).
- Edge cases: inviter removed before accept, email mismatch, double-click race (lesson 5).
- The entitlement / seat-count check `entitlements.canInviteMember(orgId)` (chapter 064) — shown as a `TODO` line in the action.
- Rate-limiting the send (chapter 074) — named, one sentence.
- Background-queued sends with retries (Unit 13 / Trigger.dev) — named, one sentence.
- Authoring React Email templates in depth (chapter 049) — the `InviteEmail` template is wired, not taught.
- Logger redaction config internals (the *rule* that `token`/`sig` are redacted is stated; the pino config is Unit 20 territory).

---

## Code-convention notes for the build agent

- **Naming:** action is `sendInvitation` (no `Action` suffix — deliberate divergence from outline/TOC wording, per 057 convention). Helper `signedInviteUrl` in `src/lib/invitations/url.ts`. Schema `sendInvitationSchema`. Env var `INVITATION_SIGNING_SECRET` (SCREAMING_SNAKE), `INVITATION_TTL_SECONDS` already exists from lesson 1.
- **Zod 4:** use `z.email()` top-level builder, not `z.string().email()`. `.toLowerCase()` on the email field so it matches the `lower(email)` partial index from lesson 1 (state this explicitly — duplicate detection silently fails otherwise).
- **`import 'server-only'`** at the top of `lib/invitations/url.ts` (it reads the signing secret) and any module touching the secret.
- **Transactions:** mutation + audit inside `withTenant(orgId, async (tx) => …)`; `sendEmail` and `signedInviteUrl` strictly after the block. Never `await` Resend inside the transaction (057/Drizzle convention).
- **Time:** `expiresAt` is a `timestamptz`; compute it from `INVITATION_TTL_SECONDS`. The conventions mandate `Temporal` in domain code with `Date` only at the DB seam via `lib/temporal.ts` — for the outline, instruct the agent to follow whatever shape lesson 1 / chapter 057 actually shipped for `expiresAt` (the continuity notes say `timestamptz notNull`); keep it consistent with lesson 1, don't invent a new time posture here. Flag this as a "match the existing codebase" instruction.
- **Result returns:** `ok({ invitationId })` on success; `err('internal', userMessage, …)` on send failure carrying the `invitationId` (note: the `Result` error shape has `code`/`userMessage`/`fieldErrors` — the `invitationId` for the resend affordance may need to ride in a way the established `Result` type allows; instruct the agent to check `lib/result.ts` and, if the type has no data slot on the error branch, surface `invitationId` via the success-with-warning shape or whatever the codebase's send-failure pattern is rather than inventing a new error field). Flag as a "verify against `lib/result.ts`" instruction.
- **Email template:** default-exported component at `src/emails/invite.tsx` (matches `WelcomeEmail` import style `import InviteEmail from '@/emails/invite'`).

---

## Proposed custom components

**Custom component A — `TokenTrustBoundaries.astro`** (`src/components/lessons/058/2/`). A horizontal three-panel figure: DB row / server logs / email body, each showing the same token with a check-or-cross verdict (hash-only / redacted / present). Goal: "one secret, three trust boundaries" as one glanceable picture. Could also be plain HTML+CSS in a `<Figure>` if the build agent prefers — spec it either way; the *content* is what matters.

**Custom component B — `SignedUrlAnatomy.astro`** (`src/components/lessons/058/2/`). Dissects the accept URL into `base · id · token · sig`, role label under each, with `token` tinted as "the credential" and `sig` as "the doorman," plus a compact verify-side note ("recompute sig, constant-time compare, reject before DB"). Goal: make the two-layer model spatial. `TabbedContent` with two panels (anatomy / verify flow) or a single static SVG/HTML figure — the build agent picks based on what renders cleanly.

If neither custom component earns its build cost, both fall back cleanly to HTML+CSS-in-`<Figure>` illustrations; do not let the absence of a bespoke component block the lesson.
