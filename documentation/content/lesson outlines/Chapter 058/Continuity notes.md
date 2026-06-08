# Chapter 058 — Invitations and the seat-handoff lifecycle

## Lesson 1 — The seat reservation that outlives the request

**Taught.** The `invitation` table as a seat reservation bound to an email (not a user), its `pending`→`accepted`/`canceled`/`rejected` state machine with computed (never-stored) expiry, the 7-day TTL as a security primitive, token-hashed-at-rest posture, and the partial unique index enforcing one pending invite per `(org, email)`.

**Schema contract (canonical for the rest of the chapter).**
- Plugin-owned columns (Better Auth org plugin): `id` (uuid pk, `$defaultFn(() => uuidv7())`), `organizationId` (uuid fk → `organization`, `onDelete: 'cascade'`), `email` (text notNull), `role` (text notNull), `inviterId` (uuid fk → `user.id`, `onDelete: 'cascade'`), `status` (text notNull default `'pending'`), `createdAt` (timestamptz notNull defaultNow), `expiresAt` (timestamptz notNull). `teamId` exists only with teams enabled — not used.
- Two application additions via plugin `additionalFields`: `tokenHash` (text notNull, SHA-256 of raw token), `acceptedAt` (timestamptz, nullable).
- Status constrained by `INVITATION_STATUSES = ['pending','accepted','rejected','canceled'] as const` → `InvitationStatus` union (both in `src/db/schema/invitation.ts`) + a DB `check('invitation_status_check', sql\`${t.status} IN ('pending','accepted','rejected','canceled')\`)` in the table's 2nd-arg callback. No TS `enum`. The check is a literal `IN (...)`, not interpolated from the `as const` list.
- Partial unique index `invitation_org_email_pending_unique` on `(organizationId, lower(email)) WHERE status = 'pending'`. `lower` is a hand-written helper `(col: AnyPgColumn) => sql\`lower(${col})\``; the `.where()` MUST be a `sql` template literal, never `eq()` (eq emits a `$1` placeholder → broken index DDL).

**Debts (promised to later lessons).**
- Token generation, base64url encoding, hashing, and the `tokenHash` non-unique index for accept lookup → lesson 2.
- Zod `role: z.enum(['admin','member'])` enforcement (refusing `'owner'`), `email` `.toLowerCase()` → lesson 2.
- HMAC-signed accept URL + constant-time compare → lesson 2.
- The accept flow writing `member.role = invitation.role`, flipping status, setting `acceptedAt` → lesson 3.
- Catch-and-translate of the unique-pending constraint error → `'already-invited'`; token rotation on resend (new row, fresh window) → lesson 4.
- "Accept after org deleted" edge relies on the `organizationId` cascade → lesson 5.
- Retention job that DELETES terminal/stale rows older than ~90 days → Unit 16 (named only).
- Seat-count entitlement check `entitlements.canInviteMember(orgId)` in action body, before write → Chapter 064.

**Terminology / mental models.**
- "An invitation is a reservation, not a membership" — restaurant-booking analogy; promise to hold a seat across an unbounded gap.
- `expired` is NOT a stored status — computed at read time via `status = 'pending' AND expiresAt > now()`. No job ever marks rows expired; a job only DELETES. Stated as a deliberate anti-pattern to resist.
- `INVITATION_TTL_SECONDS = 60 * 60 * 24 * 7` (named constant, lives in `src/lib/auth.ts` and feeds `organization({ invitationExpiresIn })`), overrides Better Auth's 48h `invitationExpiresIn` default (seconds).
- Token = bearer token, 32 bytes `crypto.getRandomValues`, base64url (43 chars). SHA-256 (fast hash) is correct here; bcrypt/argon would be cargo (token is high-entropy + throwaway).
- invitation↔member are "sequential, not joined" — NO `memberId` FK; the audit log's `'invitation.accepted'` event carries the new `memberId`.

**Patterns / best practices (for the project chapter codebase).**
- Consume plugin-owned table columns; extend only via `additionalFields`; the Drizzle `$inferSelect` table type is the source of truth (Better Auth `additionalFields` type-inference is buggy as of early 2026 — added fields don't surface cleanly on `auth.api.*`).
- Encode invariants as DB constraints (partial unique index, CHECK), never as SELECT-then-INSERT app pre-checks (race window).
- Hash bearer secrets at rest; match the hash speed to the threat.
- Store/compare email lowercased; display original casing.
- Keep terminal rows (don't DELETE on accept/revoke) — they are the historical/audit record.

**Misc.** Canonical audit event names referenced: `'invitation.sent'`, `'invitation.accepted'`, `'invitation.revoked'`, `'invitation.resent'`. Valid invite-time `role` domain is `{'admin','member'}` only — narrower than the member role set; `'owner'` excluded (ownership transfer is its own flow). Built (shipped, both used): `TokenAtRest.astro` (raw→email vs sha256→DB trust-split) and `InvitationHandoff.astro` (invitation/member sequential, audit-linked) under `src/components/lessons/058/1/`. Lifecycle rendered via `StateMachineWalker kind="machine"` wrapping a Mermaid `stateDiagram-v2` (expired = a `note` on `pending`, not a node). Two `VideoCallout`s embedded: `zt8Cocdy15c` (ByteByteGo, hashing secrets at rest) and `WL2NXQmUOC0` (Hussein Nasser, partial indexes). External resources include OWASP Forgot Password cheat sheet + Drizzle case-insensitive-email guide beyond the two outline-named refs.

## Lesson 2 — Minting the signed accept link

**Taught.** The full `sendInvitation` send path: 32-byte `getRandomValues` token → base64url, SHA-256 hashed at rest, an HMAC-signed accept URL via the `signedInviteUrl` helper, row + `'invitation.sent'` audit written inside `withTenant`, and the Resend `InviteEmail` send *after* COMMIT. Conceptual spine: two-layer model — the random token authenticates (hash lookup), the HMAC is a stateless "doorman" rejecting tampered/forged URLs before the DB and closing forge-from-DB-read.

**Code contracts (canonical for lessons 3–5).**
- Action named `sendInvitation` (NO `Action` suffix — deliberate divergence from outline/TOC `sendInvitationAction`; follows 057 verb+noun convention). `export const sendInvitation = authedAction('admin', sendInvitationSchema, async ({ email, role }, ctx) => …)`.
- `sendInvitationSchema = z.object({ email: z.email().toLowerCase(), role: z.enum(['admin','member']) })`. Uses Zod-4 top-level `z.email()`, not `z.string().email()`. `.toLowerCase()` is load-bearing (matches lesson-1 `lower(email)` index).
- **Accept URL shape (lesson 3 verify side MUST match byte-for-byte):** `${env.NEXT_PUBLIC_APP_URL}/accept-invite?id=${invitationId}&token=${rawToken}&sig=${sig}`. Canonical signing payload = `` `${invitationId}.${rawToken}` `` (dot separator). `sig = base64url(HMAC-SHA256(INVITATION_SIGNING_SECRET, payload))`. Query params: `id`, `token`, `sig`.
- Helper `signedInviteUrl(invitationId: string, rawToken: string): Promise<string>` at `src/lib/invitations/url.ts` (`import 'server-only'`). Async (Web Crypto). Imports secret as non-extractable HMAC `CryptoKey` (`importKey('raw', Buffer.from(secret,'base64'), {name:'HMAC',hash:'SHA-256'}, false, ['sign'])`). URL built via `new URL` + `searchParams.set`, host from `env.NEXT_PUBLIC_APP_URL` (NEVER `request.url`).
- Verify side rule (sketched here as teaching stub `verifyInviteUrl`, production gate is lesson 3): recompute + compare with `crypto.subtle.verify('HMAC', …)`, never `===` (timing leak).
- `expiresAt = new Date(Date.now() + INVITATION_TTL_SECONDS * 1000)` computed inline at the DB-write seam.
- Row insert stores `tokenHash: await sha256(rawToken)`, `status: 'pending'`, `inviterId: ctx.user.id`. `.returning({ id })` → `invitationId`.
- `logAudit(tx, { action: 'invitation.sent', subjectType: 'invitation', subjectId: row.id, payload: { email, role } })` — inside the same `withTenant` tx.
- Send: `sendEmail({ to, subject: \`You're invited to ${orgName}\`, react: <InviteEmail … />, idempotencyKey: \`invite:${invitationId}\` })` — outside tx. Returns `ok({ invitationId, emailSent: sent.ok })` (send-failure surfaced via `emailSent` flag on the success shape, NOT an error branch — lesson 4 resend reads this). `revalidatePath('/settings/members')` before return.
- `InviteEmail` template at `src/emails/invite.tsx`, default export, props `{ orgName, inviterName, acceptUrl, expiresAt }`, reuses `EmailLayout`. Import style `import InviteEmail from '@/emails/invite'`.

**Helpers referenced as already-existing (verify in project codebase).** `sha256(rawToken)`, `getOrgName(orgId)` (tenant-scoped read in `db/queries/`), `INVITATION_TTL_SECONDS` (lesson 1). New env var `INVITATION_SIGNING_SECRET` (32 random bytes, base64) declared server-side in `env.ts`.

**Debts.**
- Production signature-verify gate as the accept path's first step (consumes the `id`/`token`/`sig` shape above) → lesson 3.
- Collision pre-check intentionally omitted — relies on lesson-1 partial unique index; catch-and-translate to `'already-invited'`, plus resend with token rotation → lesson 4.
- Send-failure recovery: `emailSent: false` drives a "resend" affordance on the pending-invites surface → lesson 4.
- Entitlement/seat check `canInviteMember(ctx.orgId)` — `TODO(chapter 064)` comment, belongs first in the body.
- Rate-limit (~20 invites/admin/hr, plan-configurable) → Chapter 074; background-queued send w/ retries → Unit 13. Both named only.
- Logger redaction of `token`/`sig` query params — rule stated; pino config is Unit 20.

**Terminology / mental models.**
- "A pending invitation is a bearer credential you mail to a stranger" — the lesson's framing sentence.
- "One secret, three trust boundaries": raw token allowed in exactly one place — the email body; never the DB (hash only) nor logs (redacted).
- Two-layer model: token = "the credential", HMAC sig = "the doorman" (cheap pre-DB reject + forge-from-read defense).
- "Audit rides inside the transaction; email send rides outside it" — the two non-negotiable orderings; COMMIT is the pivot.
- Secret-reuse reflex: never share one secret across two crypto purposes (different blast radii / rotation cadences).
- `getRandomValues(32)` for a secret; `randomUUID` for an id (identity-shaped, not a credential).

**Patterns / best practices (for the project chapter codebase).**
- Hand-roll the send path over Better Auth's `inviteMember` to own the random token, hash-at-rest, HMAC, and audit row; keep the plugin's table shape only.
- `signedInviteUrl` is the single source of truth for URL shape; sign + verify must share one payload definition.
- HMAC keys imported non-extractable with minimal capability (`['sign']`).
- Build absolute URLs from a named env var, never the request host (preview/proxy fragility).
- Accept URL carries no UTM/analytics tags and must not be prefetched (a tracker fetch consumes the invite); never surface the URL in the inviter's prod UI — dev-only (`NODE_ENV !== 'production'`) toast affordance is fine.
- `logAudit(tx, …)` typed first param refuses the pooled client — wrong shape won't compile.

**Misc.** Lesson-specific components proposed (may be `.astro` or HTML+CSS-in-`<Figure>` fallbacks): `TokenTrustBoundaries` and `SignedUrlAnatomy` under `src/components/lessons/058/2/`. Sandpack exercise (`signInvite`/`verifyInvite`) deliberately UTF-8-encodes the secret rather than base64-decoding, as a self-contained simplification of the real helper.

## Lesson 3 — Four arrival shapes on one accept URL

**Taught.** The accept side: an `/accept-invite` Server-Component page that verifies the URL, branches one GET into four authentication shapes, and renders a consent button; an `acceptInvitation` action (NOT `authedAction`) that re-verifies and writes the `member` row once inside `withTenant`. Spine: **the GET decides, the POST writes** (a side-effecting GET would be consumed by scanners/unfurlers/URL-rewriters); refuse-as-one; re-verify in the action because the POST is a separate request; idempotent on double-click via a `status='pending'` precondition.

**Code contracts (canonical for lessons 4–5).**
- Page `app/accept-invite/page.tsx`, **default export** (framework carve-out), reads `searchParams: Promise<{ id; token; sig }>` via `await` (Next 16 async request API). No DB writes at render.
- Action named **`acceptInvitation`** (verb+noun, NO `Action` suffix — supersedes outline/TOC `acceptInvitationAction`, same divergence as `sendInvitation`). Signature `acceptInvitation(formData: FormData)`, `'use server'`, NOT wrapped in `authedAction` (invitee has no membership/role to gate on; authority is the token itself).
- Accept `<form action={acceptInvitation}>` carries hidden inputs `id` and `token` only (NOT `sig` — the action re-verifies via the stored `tokenHash`, signature is the page's pre-DB doorman). Parsed by `acceptInvitationSchema.parse(Object.fromEntries(formData))`.
- **Verify ladder order** (page, top of render): (1) `verifyInviteUrl(id, token, sig)` HMAC check — fail → generic `<InviteRefused/>`; (2) `getInvitationById(id)` — null → same `<InviteRefused/>`; (3) `tokenMatches(token, invitation.tokenHash)` (timing-safe re-hash) — fail → same refusal; (4) `expiresAt < new Date()` → distinct `<InviteExpired email/>`; (5) `switch(status)`: `pending`→`<AcceptDecision/>`, `accepted`→`<AlreadyMember orgName/>`, `canceled`→`<InviteRevoked/>`, `rejected`→`<InviteRefused/>`. First three failures collapse to ONE refusal (no enumeration); expiry/revoked fork (honest, actionable).
- **Action body** order: `acceptInvitationSchema.parse` → `getCurrentUser()` → `getInvitationById(id)` → guard `!invitation || !verifyInviteToken(id, token, invitation.tokenHash) || expiresAt < now || status !== 'pending'` → `err('not_found', …)` → guard `!user || user.email !== invitation.email` → `err('forbidden', …)` → `withTenant(invitation.organizationId, async (tx) => {…})` → `redirect('/dashboard')` AFTER commit. Returns `Result` (`err`/`ok`).
- Inside the tx, in order: insert `member` `{ userId: user.id, role: invitation.role }` `.returning({ id })`; update `invitation` `set status='accepted', acceptedAt=now()` `.where(and(eq(id), eq(status,'pending')))` (optimistic-concurrency precondition); IF `!user.emailVerified` set `userTable.emailVerified=true` (invite IS the email-ownership proof); `auth.api.setActiveOrganization({ headers: await headers(), organizationId })`; `logAudit(tx, { action: 'invitation.accepted', subjectType:'invitation', subjectId: id, payload: { newMemberId, role } })` — actor is the invitee.

**Helpers referenced (verify/create in project codebase).** `verifyInviteUrl(id, token, sig): Promise<boolean>` (production HMAC gate, promotes lesson-2 stub; throws → treated as refusal, fail-closed). `verifyInviteToken(id, token, tokenHash)` (action-side combined re-verify). `tokenMatches(token, tokenHash)` (timing-safe hash compare). `getInvitationById(id)` and the read are factored into `db/queries/invitations.ts` (the lesson inlines them into the verify frame for legibility only). `getCurrentUser()`. `userTable` is the aliased import of the `user` table (avoids the local `user` var clash). Refusal/landing screens are plain Server Components: `InviteRefused`, `InviteExpired`, `InviteRevoked`, `AlreadyMember`, `AcceptDecision`.

**Debts.**
- Shape B (signed-in, email differs) renders only a strict refusal **stub** here; full posture — exact copy, case-insensitive lowercase compare, the no-"accept anyway" rule, privilege-confusion derivation → lesson 5.
- The double-click race deep dive (full sequence, who-wins mechanics on the `where status='pending'` clause) → lesson 5; this lesson plants the clause and names it idempotent.
- `setActiveOrganization`/`acceptInvitation` Better Auth org-plugin APIs leaned on; `next` open-redirect guard (`safeNext` from Ch 53/54) reused by shapes C/D, named not re-taught.
- Rate-limiting the accept endpoint → Ch 074; seat/entitlement → Ch 064. Named, not built.

**Terminology / mental models.**
- "The accept URL is a key. Clicking it unlocks a decision page, not a door. The door opens only when the right human, authenticated as the invited email, presses Accept — and the action checks the key again." (lesson's closing model.)
- **The GET decides; the POST writes** — render is a pure read-and-decide producing a button; the button press is the one consent signal scanners/unfurlers never produce.
- **Refuse as one** — bad signature + missing row + hash mismatch → one refusal string (no enumeration); "differentiate a failure only when the distinction helps the user more than it helps an attacker" (expiry/revoked fork).
- Four shapes: A (signed-in, email matches → Accept button, the ONLY write leaf); B (signed-in, differs → refuse); C (signed-out, account exists → sign in, `next` back); D (signed-out, no account → sign up email-locked, `next` back). C/D/B are detours/dead-ends; all roads to a write pass through A.
- `optimistic concurrency` and `idempotent` introduced as `Term`s; "URL rewriter" / "link unfurler" defined as the silent-GET fetchers.

**Patterns / best practices (for the project chapter codebase).**
- Email links land on a renderable page (read+decide), never a Server Action; mutate only behind an explicit consent click. A GET must stay safe/idempotent.
- A gate fails closed: an exception in verification is a refusal, never a fall-through to allow.
- Re-verify in the action — the page's pre-check never travels to the POST; never trust a prior request's verification as authorization for a write.
- Routing/display values come from the row loaded by id, NEVER from `searchParams` (reflecting a query param is XSS).
- Shape D: prefill AND lock (readonly) the sign-up email to `invitation.email` — the only account the form can create is one that can accept.
- `setActiveOrganization` inside the tx is NOT an "external IO in a transaction" violation — it's an in-process DB session write, belongs with the other writes; `redirect` fires only AFTER commit.
- Don't auto-accept even right after sign-up — render the Accept button so consent is explicit and D collapses into A (no duplicate write path).
- Post-accept redirect is a deterministic `/dashboard` (resolved in the now-active org), NOT a `next` param — acceptance is its own intent.

**Misc.** Components used: `CodeVariants` (auto-accept trap vs render-and-gate), `AnnotatedCode` ×2 (verify ladder blue, accept action green), `StateMachineWalker` (`kind="decision"`, the four-shape funnel), `DiagramSequence` (the Shape-D signup loop, captioned via `SignupLoopStrip` lesson component). One new lesson-specific component shipped: `SignupLoopStrip.astro` under `src/components/lessons/058/3/` (4-state strip: click/signup/return/accept). Two `VideoCallout`s embedded: `MKn3cxFNN1I` (Jan Goebel, HMAC explained) and `wEsPL50Uiyo` (Web Dev Cody, DB concurrency control). External resources (3): Better Auth org-plugin page, MDN safe/idempotent HTTP methods, MDN `SubtleCrypto.verify()`.

## Lesson 4 — Pending invites: list, resend, revoke, collide

**Taught.** The admin management surface for pending rows: an expiry-filtered Server-Component list, `resendInvitation` (token + window rotation), `revokeInvitation` (`status='canceled'`, no DELETE, no email), catch-and-translate of the pending-on-pending unique violation into a `conflict`, the recently-expired shelf (fresh send, not re-extension), and two deliberate non-actions (no in-place role edit, no `invitation.role`↔`member.role` sync). Spine: **a pending-invite row is a record of what you promised** — every action rotates/cancels/refuses-to-duplicate, none deletes.

**Code contracts (canonical for lesson 5).**
- Read helpers in `db/queries/invitations.ts`: `listPendingInvitations(orgId)` — `tenantDb(orgId).query.invitation.findMany({ where: and(eq(status,'pending'), gt(expiresAt, new Date())), with: { inviter: true }, orderBy: desc(createdAt) })`. Sibling `listExpiredInvitations(orgId)` — same query, inequality flipped + 30-day floor: `and(eq(status,'pending'), lt(expiresAt, now), gt(expiresAt, thirtyDaysAgo))`. Expiry filtered IN the `where`, never a JS post-`.filter()`.
- `resendInvitation = authedAction('admin', z.object({ invitationId: z.uuid() }), async ({ invitationId }, ctx) => …)`. Body: mint NEW 32-byte token + `newExpiresAt = now + INVITATION_TTL_SECONDS*1000` in memory → `withTenant`: read row `where and(eq(id), eq(status,'pending'))` selecting `{email,role,expiresAt}` (read IS the guard; capture OLD `expiresAt` before update, not via `RETURNING`), null→return null; `UPDATE set { tokenHash: await sha256(rawToken), expiresAt: newExpiresAt } where eq(id)`; `logAudit(tx, { action:'invitation.resent', subjectType:'invitation', subjectId, payload:{ email, role, oldExpiresAt, newExpiresAt } })` → after commit: null→`err('not_found','This invite is no longer pending.')`, else rebuild `signedInviteUrl(invitationId, rawToken)`, `sendEmail({…, idempotencyKey: \`invite-resend:${invitationId}:${newExpiresAt.getTime()}\` })`, `revalidatePath('/settings/members')`, `ok({ emailSent: sent.ok })`. Reuses lesson-2 send seams; only diffs are UPDATE-not-INSERT, the `'invitation.resent'` action, and the pending guard.
- `revokeInvitation = authedAction('admin', z.object({ invitationId: z.uuid() }), …)`. Body: `withTenant`: `UPDATE set { status:'canceled' } where and(eq(id), eq(status,'pending')) .returning({email,role})`; `!updated`→null; `logAudit(tx, { action:'invitation.revoked', …, payload:{ email, role } })` → after commit null→`err('not_found', …)`, else `revalidatePath`, `ok({ revoked: true })`. NO email to invitee (deliberate). NO DELETE — `canceled` row feeds lesson-3's accept-side `canceled` branch.
- **Collision = catch-and-translate, NOT pre-check.** `sendInvitation` (lesson 2) left the pending-on-pending collision uncaught on purpose; this lesson wraps the INSERT, runs the caught `unknown` through `ensureError` first, then narrows the wrapped pg error: `catch (error) { const e = ensureError(error); if (e.cause instanceof DatabaseError && e.cause.code === '23505' && e.cause.constraint === 'invitation_org_email_pending_unique') return err('conflict', 'This address already has a pending invite.'); throw e; }`. Drizzle WRAPS the pg error — the `DatabaseError` (carrying `.code` and `.constraint`) sits on `.cause`, NOT top-level `error.code`. **Built on the existing `isUniqueViolation(e)` helper in `lib/result.ts`** (shipped since the create-invoice action in chapter 047 — answers "is this a Postgres `23505`?" reading `e.cause.code`); the lesson frames that helper as the generic half already-built, and the constraint-name check (`e.cause.constraint === 'invitation_org_email_pending_unique'`) as the deliberate refinement ON TOP, since `isUniqueViolation` can't tell WHICH unique index fired. The catch reads `.cause` directly rather than calling `isUniqueViolation` because it needs `.constraint`, which the boolean helper doesn't expose; `ensureError` doesn't surface the cause (a `DrizzleQueryError` is already an `Error`, returned untouched) — it just yields a typed `Error` to read `.cause`/`.constraint` off of instead of a loose `any`. Resolves the lesson-1/2 debt: the `'already-invited'` placeholder is reconciled to the canonical `Result` code **`conflict`** (the canonical union has no `'already-invited'`); the existing pending row is already on-screen, so the UI recovery is the row's own Resend/Revoke buttons.

**Helpers referenced (verify in codebase).** `isUniqueViolation(e)` (the generic `23505` check, in `lib/result.ts`, since chapter 047), `ensureError` and `DatabaseError` (from `pg`) — both consumed in the collision catch; never `catch (e: any)`. Reuses `sha256`, `signedInviteUrl`, `INVITATION_TTL_SECONDS`, `sendEmail`, `InviteEmail`, `getOrgName`, `logAudit`, `withTenant`, `tenantDb` (all prior). Expired-shelf button routes to `sendInvitation` (new row + token), NEVER `resendInvitation`.

**Debts (to lesson 5).**
- The `'already-member'` collision (a `member` row already exists for `(orgId, lower(email))`) — a membership pre-check in the send body, distinct from this lesson's pending-on-pending — → lesson 5. Crisply separate from `conflict`/`already-invited`.
- Double-click-race deep dive, email-mismatch, orphan invite (inviter removed), org-deleted-before-accept → lesson 5. This lesson only names the `status='pending'` guard.
- Rate-limit on resend (same vector as send) → Ch 074; retention DELETE of terminal rows → Unit 16; seat/entitlement → Ch 064. Named, not built.

**Terminology / mental models.**
- "A pending-invite row is a record of what you promised" — the lesson's deriving sentence; rows are tombstones, never dug up.
- **Token rotation** (`Term`): replacing a still-valid secret with a fresh one so any leaked/forwarded copy stops working — resend rotates token AND window; "re-send the same link" is the rejected posture. Same move recurs for API keys, password resets, session tokens.
- **Unique violation / `23505`** (`Term`): Postgres SQLSTATE for a duplicate breaking a UNIQUE index.
- "The database is the source of truth for the collision; the action's job is translation" — transferable to any unique constraint (slugs, seat reservations, idempotency keys).
- Resend rotates a LIVE token; expiry is NOT rotated, it's REPLACED — two different verbs ("Resend" vs "Send new invite") for two different states.

**Patterns / best practices (for the project chapter codebase).**
- Filter time-bounded "pending" in the `where`, not a JS post-`.filter()` (wire + tenancy-scoping smell).
- Resend rotates token + expiry by default (a resend is a security event, not just UX); COMMIT pivots between the new-hash write and the new-link email (same atomicity reflex as send).
- Revoke and resend both guard on `where … and status='pending'` and refuse non-pending rows with `not_found`; the guard read inside the tx doubles as optimistic concurrency.
- Don't pre-check a unique constraint with SELECT-then-INSERT (race window); let the index throw, catch the wrapped `23505` at `.cause`, narrow on the named constraint, rethrow everything else. Consume the existing `isUniqueViolation` (`lib/result.ts`) for the generic `23505`/`.cause` derivation rather than re-deriving it; add the constraint-name match as the refinement on top when one table has multiple unique indexes that need distinct translations.
- Hand-roll revoke (`UPDATE + logAudit(tx)` in `withTenant`) over the plugin's `auth.api.cancelInvitation` so the audit row rides the status flip's commit; skip `cancelPendingInvitationsOnReInvite` for the same reason.
- No notification email on revoke (privacy/abuse + noise); changing a pending invite's role = revoke + re-invite (one coherent promise per invite), never an in-place edit; after accept, `invitation.role` is frozen history — never sync it to `member.role`.

**Misc.** Audit payloads locked: `'invitation.resent'` → `{ email, role, oldExpiresAt, newExpiresAt }`; `'invitation.revoked'` → `{ email, role }`. Surface lives at `/settings/members` beside the member list (ch.057 L4) — sibling tables, never joined. Components: `AnnotatedCode` (list helper blue; resend body green), `CodeVariants` ×2 (resend rotate-vs-same; collision racy-vs-translate), `Code` (revoke body; expired `where`), `Aside` (no-email-on-revoke; expired-is-a-new-send), HTML+CSS `<Figure>` 3-row summary grid (Action/DB-write/Sends-email/Audit-event/Row-after), one `ScriptCoding` Sandpack exercise (catch-and-translate). Exercise stub throws a FLAT error object (`{code:'23505',constraint,existingInvitationId}`) to stay self-contained — `instructions` flag that production wraps it at `.cause`. No new lesson-specific `.astro` components.

## Lesson 5 — Orphans, mismatches, and the double-click race

**Taught.** Chapter capstone — pure judgment, no new tables/actions. Resolves every production invite edge case to **three principles** and one recurring axis ("where does the check live?"): orphan/demoted inviter (honor — no check), email mismatch (strict refuse in the action body), double-click race (DB `WHERE status='pending'` precondition = optimistic concurrency), already-a-member (action-body membership read before INSERT), org-deleted (handled structurally by the `onDelete:'cascade'` — no app branch), expired/tampered/revoked (L3's verify ladder). Settles the L3 email-mismatch stub and the L4 already-member debt.

**The three durable principles (lesson's spine).**
1. **An invitation is the org's decision, frozen at send time.** Inviter is the *clerk who filed it*, not its owner; `role` is snapshotted on the row and never recomputed. Absorbs orphan inviter (left), demoted inviter, cross-org independence — all "honor it, no check."
2. **The invitation's identity is the email address; never silently rebind it.** Mismatch (`session.user.email !== invitation.email`) → strict refusal, **no "accept anyway" escape hatch** (that button *is* the vulnerability — privilege confusion via forwarded email). Real predicate is *verified ownership*, not bare string-equality (pre-registered-unverified-account attack); leans on the unguessable 32-byte **token** (the credential) + the verified-email check — the `uuidv7` invitation `id` is a time-ordered identifier, NOT the secret.
3. **Never trust the state the page render saw at write time.** The `WHERE status='pending'` precondition rides *on the write*, not an `if` after the read — `status` plays the role a `version`/`updated_at` does in textbook optimistic locking. Generalizes to any exactly-once transition (accept once, charge once, claim a job once).

**Code reconciliations / contracts (no new code shipped).**
- Already-member refusal: chapter outline's `Result.error('already-member', …)` is **NOT a canonical code** — maps to `err('conflict', 'Bob is already a member of this organization.')` (same reconciliation L4 made for `'already-invited'`). Distinguished from the pending-collision conflict by *message* and by *which layer fires* (membership pre-check in `sendInvitation` body vs. L4's `23505` index catch).
- The `CodeVariants` collision contrast's **pending-collision recap uses the `isUniqueViolation(e)` helper** (the project's generic `23505` primitive in `lib/result.ts`), NOT a raw `e.cause.code` check — the recap deliberately drops L4's constraint-*name* narrowing (`e.cause.constraint === …`), noting a recap doesn't need that precision. The already-member side is the `user`→`member` guard read.
- `member` has **no `email` column** — the already-member check resolves *through* `user`: find `user` by email, then `member.findFirst({ where: and(eq(organizationId,orgId), eq(userId, user.id)) })`. `member`/`invitation` are sequential, not joined.
- Email compare: lowercase the **session side only** (`session.user.email.toLowerCase() === invitation.email`) — `invitation.email` is already lowercased at rest (L1 `lower(email)` index, L2 `.toLowerCase()`); double-lowering is the trap to avoid. Lowercase is a comparison key; always display original casing.
- Mismatch enforced in **both** layers: page render (UX) + action body (the real gate — `user.email !== invitation.email → err('forbidden')`, already in L3's contract).
- Org-deleted needs **no application branch**: the `invitation.organizationId` `onDelete:'cascade'` (L1 schema / Ch 056 design) deletes the invite row with the org; `getInvitationById` returns null → generic refusal.

**Debts.** None new. Reaffirms named-only year-2 reaches: auto-revoke-on-inviter-removal (alternative posture), self-serve "request to join" form, multi-pending-invite dashboard widget — none built. Better Auth `requireEmailVerificationOnInvitation` switch referenced (behavior only). Forward refs: rate-limit accept/send → Ch 074; seat/entitlement → Ch 064; retention DELETE → Unit 16; GDPR email retention → Ch 081.

**Terminology / mental models.**
- `Term` **privilege confusion** — an action runs under the wrong identity's authority (wrong user accepts a forwarded credential, inherits unoffered access). Same reasoning class as L3's consent gate.
- `Term` **optimistic concurrency** — no up-front lock; the write *assumes* the row is unchanged and a `WHERE` precondition *verifies* at commit; zero rows matched ⇒ caller handles the conflict.
- "Rows are tombstones" (carried from L1/L4) — audit answers "who invited Bob, were they still here?" from the two frozen rows.
- A missing inviter changes the **copy** (`{inviterStillMember && <p>Invited by …</p>}`), never the **decision** — display guard is cosmetic, not authorization.
- "Re-invite my current email" = a brand-new offer to a different identity → routes through L4 revoke-and-resend, never an edit to the existing row.

**Patterns / best practices (for the project chapter codebase).**
- "Honor it" and "a constraint upstream already guaranteed it" are correct, complete answers — recognizing when **no** application check is right is as much the skill as writing one.
- **Prefer the constraint when one exists; fall back to a guarded read only when the invariant spans tables a single index can't cover** — and name the residual race honestly (membership could appear between the read and the invite INSERT; vanishingly rare, neutralized downstream).
- When a constraint upstream (cascade DDL, unique index) already guarantees an invariant, don't write app code to re-check it.
- Refuse as early/cheap as possible; commit a write as late as possible (the decision-walk order: validity → freshness → identity → state).
- Decide and *document* postures with defensible alternatives (honor-vs-revoke) so the next engineer reads a decision, not a bug.

**Misc.** Components (all built): inline `Code` ×2 (display guard; accept precondition `UPDATE … WHERE and(eq(id), eq(status,'pending'))` + `if (!updated) return ok({ alreadyMember: true })`), `CodeVariants` ×2 (email-compare naive/correct; collision-layers pending-`isUniqueViolation`-catch vs. member-read), `StateMachineWalker` (`kind="decision"`, NOT in `<Figure>` — the accept-route decision walk, leaves `leaf-refuse`/`-expired`/`-revoked`/`-already`/`-signin`/`-signup`/`-mismatch`/`-accept`), Mermaid `sequenceDiagram` in `<Figure>` (double-click race, Tab A/Tab B/DB), HTML `<table>` via `SeniorCallsTable.astro` in `<Figure>` (7-row senior-calls summary, 3rd col = enforcing layer), `Buckets` 3-bucket sort (db / action / none). One new lesson-specific component shipped: `SeniorCallsTable.astro` under `src/components/lessons/058/5/`. The summary-table caption tallies the layer axis as **7 rows across 4 enforcing layers**: 2 by the **DB** (`WHERE` precondition + cascade), 2 by an **action-body guard**, 1 by the **accept page at render** (the verify ladder — split into its own layer, distinct from the action guards), 2 by **no check** (honored). One `VideoCallout` embedded: `wEsPL50Uiyo` (Web Dev Cody, DB concurrency control — reused from L3). External resources (4): Better Auth org-plugin (`requireEmailVerificationOnInvitation`), Martin Fowler Optimistic Offline Lock, Postgres Explicit Locking, OWASP Broken Access Control. Running cast: Alice (inviter), Bob (invitee), Acme (org), Carol. Lesson is reading-heavy, 35–45 min, no live-coding sandbox (deltas too coupled to isolate).
