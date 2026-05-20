# Chapter 063 — Project: org, RBAC, and invitations end-to-end

## Chapter framing

Chapter 063 cashes in everything Unit 10 installed. The student arrives from chapter 059 with a working email+password auth flow against Better Auth and a `user` / `session` / `account` / `verification` schema, and from chapter 054 with a `sendEmail` wrapper, a verified domain, the `email_suppressions` read, and the React Email scaffolding. Chapter 060 taught the organization data model and the `tenantDb(orgId)` helper. Chapter 061 taught the three-role RBAC default, the `authedAction(role, schema, fn)` wrapper, the member-management invariants, and the append-only `audit_logs` table. Chapter 062 taught the invitation handshake — signed accept link, four arrival shapes, the management surface. This project compresses all of it into one runnable build: install the organization plugin, add the active-org slot to the session, lay down `audit_logs` and the `invitations` extensions, build the `tenantDb` + `authedAction` pair, ship the role-change action with audit writes, ship the invite send + accept flow with audit writes, and verify against an inspector that surfaces members, role-change buttons (visible to every role on purpose so server-side refusal is observable), pending invitations, and a live audit-log tail.

Threads that run through every lesson. The organization plugin owns the canonical table names (`organization`, `member`, `invitation`); the student adds `tokenHash` and `acceptedAt` to `invitation` via `additionalFields` and adds `activeOrganizationId` to `session`. Every read on a tenant-owned table goes through `tenantDb(orgId)` — hand-typed `.from(...)` against tenant tables is a code-review red flag. Every privileged Server Action ships as `authedAction(role, schema, fn)` — the wrapper is the only call shape that compiles for a privileged write. The `audit_logs` table is append-only by application discipline plus an RLS deny policy on UPDATE / DELETE (the only RLS-protected table in this project — application-layer scoping holds elsewhere per the lesson 3 of chapter 060 senior call). Every privileged mutation writes the audit row in the same transaction as the work, through `logAudit(tx, event)` whose signature forces a `tx` argument so off-transaction calls don't typecheck. The accept-invite URL carries a 32-byte random token plus an HMAC signature; the database stores only `sha256(token)`. The email send happens *after* the DB transaction commits; deferred-resend is the recovery affordance, not a background queue. The chapter ships 1 brief + 1 starter walkthrough + 5 build lessons + 1 verify lesson; each build ends on a runnable state.

### Dependency carry-in

- **From chapter 059 (auth flow):** `src/lib/auth.ts` with the `betterAuth(...)` instance including `nextCookies()` and `emailAndPassword` with `requireEmailVerification`; `src/lib/auth-client.ts` exporting `authClient`; the catch-all handler at `src/app/api/auth/[...all]/route.ts`; `src/lib/auth-helpers.ts` with `getCurrentUser()` and `requireUser()`; `proxy.ts` with the cookie-presence gate and `?next=` round-trip; the `(auth)` and `(protected)` route groups; the Drizzle-managed `user` / `session` / `account` / `verification` tables in `src/db/schema/auth.ts`; the `WelcomeVerification.tsx` React Email template under `src/emails/`.
- **From chapter 054 (email send):** `src/lib/email.ts` exposing `sendEmail({ to, subject, react, idempotencyKey, replyTo?, bypassSuppression? })` (with `idempotencyKey` required per the chapter 054 convention); the `email_suppressions` read inside that wrapper; `RESEND_API_KEY` + `EMAIL_FROM` env entries; the verified domain; the `WelcomeEmail.tsx` template as the React Email pattern reference.
- **From 6.x (Drizzle):** `src/db/client.ts`, the migration pipeline (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`), `drizzle.config.ts` pointing at `src/db/schema/*`, Drizzle's relational query API + `drizzle-zod`.
- **From chapter 047 / chapter 048:** `<form action={serverAction}>`, `useActionState`, the canonical `Result<T>` discriminant shape, Zod parse at the action boundary, the `redirect()` after success.
- **From lesson 1 of chapter 020:** Web Crypto primitives — `crypto.randomUUID`, `crypto.getRandomValues`, `crypto.subtle` for SHA-256 and HMAC; the constant-time compare reflex (via `crypto.subtle.verify`).
- **From chapter 037 / chapter 038:** `'use server'` / `'use client'` boundary, Server Components reading `searchParams` async.
- **Forward into chapter 066:** the `tenantDb(orgId)` and `authedAction(role, schema, fn)` shapes shipped here are the exact ones chapter 066 layers `active()` / `archived()` lifecycle methods onto.

### Starter file tree (stubs marked with TODO)

```
.env.example                                # provided: previous entries + INVITATION_SIGNING_SECRET, APP_URL
docker-compose.yml                          # provided: postgres:18
drizzle.config.ts                           # provided
package.json                                # provided: db:generate, db:migrate, db:seed, auth:generate, dev, build, test
proxy.ts                                    # provided from chapter 059
src/
  lib/
    auth.ts                                 # provided: chapter 059 instance; TODO student: add organization() plugin with additionalFields + databaseHooks.session.create
    auth-client.ts                          # provided: chapter 059 client; TODO student: register organizationClient() plugin
    auth-helpers.ts                         # provided: requireUser/getCurrentUser; TODO student: extend to requireOrgUser returning { user, orgId, role }
    auth/
      roles.ts                              # TODO student: ROLE_RANK, roleAtLeast, Role type
    email.ts                                # provided from chapter 054
    env.ts                                  # provided: Zod-validated env
    tenant-db.ts                            # TODO student: tenantDb(orgId) wrapping Drizzle relational query API + writes
    authed-action.ts                        # TODO student: authedAction(role, schema, fn) wrapper
    audit-log.ts                            # TODO student: logAudit(tx, event)
    invitations/
      url.ts                                # TODO student: signedInviteUrl(invitationId, rawToken) + verifyInviteSignature
      send.ts                               # TODO student: sendInvitationAction
      accept.ts                             # TODO student: acceptInvitationAction
      manage.ts                             # TODO student: changeMemberRoleAction (and stubs for resend/revoke if time)
  db/
    client.ts                               # provided
    schema/
      auth.ts                               # provided chapter 059; regenerated by auth:generate after adding organization plugin — student commits the diff
      audit.ts                              # TODO student: auditLogs table + RLS policies (deny UPDATE/DELETE)
  emails/
    InviteEmail.tsx                         # TODO student: React Email template (orgName, inviterName, role, acceptUrl, expiresAt)
  app/
    (protected)/
      dashboard/
        page.tsx                            # provided chapter 059
        org-switcher.tsx                    # provided: client component calling authClient.organization.setActive
      inspector/
        page.tsx                            # provided: members list, invite form, role-change buttons (visible to ALL roles by design), pending-invites list, audit-log tail
        actions.ts                          # provided: reset-and-reseed action, "switch acting user" action for RBAC verification
    (auth)/
      accept-invite/
        page.tsx                            # TODO student: Server Component that reads searchParams (id, token, sig), verifies, branches on session+email, renders the Accept button form
    onboarding/
      create-org/
        page.tsx                            # provided: shell calling authClient.organization.create
scripts/
  seed.ts                                   # provided: 2 orgs, 4 users with mixed roles (one owner, one admin, one member per org plus a shared user), 1 pending invite seeded
```

### Reference solution signatures lessons display

- **Roles** (`src/lib/auth/roles.ts`):
  - `type Role = 'owner' | 'admin' | 'member'`
  - `const ROLE_RANK = { member: 0, admin: 1, owner: 2 } as const`
  - `roleAtLeast(role: Role, required: Role): boolean`
- **Auth instance addition** (`src/lib/auth.ts`):
  - Adds `organization({ teams: { enabled: false }, invitationExpiresIn: 60 * 60 * 24 * 7, schema: { invitation: { additionalFields: { tokenHash: { type: 'string', required: true }, acceptedAt: { type: 'date', required: false } } } } })` to `plugins`.
  - Adds `databaseHooks: { session: { create: { before: async (session) => ({ data: { ...session, activeOrganizationId: await pickInitialActiveOrg(session.userId) } }) } } }`.
- **Auth client** (`src/lib/auth-client.ts`): `createAuthClient({ baseURL, plugins: [organizationClient()] })`.
- **`requireOrgUser`** (`src/lib/auth-helpers.ts`): `async () => { const session = await auth.api.getSession({ headers: await headers() }); if (!session) redirect('/sign-in'); const orgId = session.activeOrganizationId; if (!orgId) redirect('/onboarding/create-org'); const membership = await db.query.member.findFirst({ where: and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)) }); if (!membership) redirect('/onboarding/create-org'); return { user: session.user, orgId, role: membership.role as Role }; }`.
- **`tenantDb`** (`src/lib/tenant-db.ts`):
  - `tenantDb(orgId: string)` returns a typed facade over Drizzle: `.query.<table>.findMany / findFirst` with `where` composed via `and(eq(<table>.organizationId, orgId), userWhere)`; `.insert(<table>).values(...)` injects `organizationId`; `.update(<table>).set(...).where(...)` composes the org predicate; `.transaction(fn)` returns a `tx` with the same scoping; an explicit unwrapped `.raw` escape hatch (typed `unsafe`) for the rare cross-tenant read.
- **`authedAction`** (`src/lib/authed-action.ts`):
  - `authedAction<TSchema extends z.ZodTypeAny, TOut>(role: Role, schema: TSchema, fn: (input: z.infer<TSchema>, ctx: AuthedCtx) => Promise<Result<TOut>>): (prev: unknown, formData: FormData) => Promise<Result<TOut>>`.
  - `AuthedCtx = { user: User; orgId: string; role: Role; db: ReturnType<typeof tenantDb>; ip: string | null; userAgent: string | null }`.
  - Four steps: `requireOrgUser()` → `roleAtLeast(ctx.role, role)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`. Failure shapes: `Result.error({ code: 'forbidden', userMessage })`, `Result.error({ code: 'validation', userMessage, fieldErrors })`.
- **`logAudit`** (`src/lib/audit-log.ts`):
  - `logAudit(tx: DrizzleTx, event: { action: string; subjectType: string; subjectId: string; actorUserId: string | null; orgId: string; payload: Record<string, unknown>; ip?: string | null; userAgent?: string | null }): Promise<void>` — single insert into `auditLogs`; `tx` is required by the signature (no overload that takes `db`).
- **`auditLogs` table** (`src/db/schema/audit.ts`):
  - Columns: `id uuid pk`, `organizationId uuid not null fk`, `actorUserId uuid null fk`, `actorIp inet null`, `actorUserAgent text null`, `action text not null`, `subjectType text not null`, `subjectId text not null`, `payload jsonb not null default '{}'`, `createdAt timestamptz not null default now()`.
  - Indexes: `(organizationId, createdAt desc)`, `(organizationId, actorUserId, createdAt desc)`.
  - RLS: `enableRLS()` + `pgPolicy('audit_logs_no_update', { for: 'update', using: sql\`false\` })` + same for `delete`; the per-org `select` policy reads `current_setting('app.org_id')::uuid` (the lesson 4 of chapter 060 shape).
- **`changeMemberRoleAction`** (`src/lib/invitations/manage.ts`):
  - `authedAction('admin', z.strictObject({ memberId: z.string().uuid(), newRole: z.enum(['admin', 'member']) }), async ({ memberId, newRole }, ctx) => { ... })` — refuses owner targets and last-owner demotion; writes the role change + `'member.role-changed'` audit row in one `tenantDb` transaction.
- **`sendInvitationAction`** (`src/lib/invitations/send.ts`):
  - `authedAction('admin', z.strictObject({ email: z.string().email().toLowerCase(), role: z.enum(['admin', 'member']) }), async ({ email, role }, ctx) => { ... })`. Eight steps: existing-member check → collision check → 32-byte token via `crypto.getRandomValues` → `sha256` hash → DB insert (transaction with `logAudit('invitation.sent')`) → commit → `signedInviteUrl(...)` → `sendEmail({ to: email, react: <InviteEmail .../> })` → `Result.ok({ invitationId })` (or `Result.error('email-send-failed', { invitationId })` if Resend rejects). Catches the partial-unique-index error and translates to `Result.error('already-invited', { existingInvitationId })`.
- **`signedInviteUrl`** (`src/lib/invitations/url.ts`):
  - `signedInviteUrl(invitationId: string, rawToken: string): Promise<string>` — base URL `${env.APP_URL}/accept-invite`, query string `id=${invitationId}&token=${rawToken}&sig=${hmacBase64Url(env.INVITATION_SIGNING_SECRET, invitationId + '.' + rawToken)}`.
  - `verifyInviteSignature(invitationId: string, rawToken: string, sig: string): Promise<boolean>` — constant-time via `crypto.subtle.verify`.
- **`acceptInvitationAction`** (`src/lib/invitations/accept.ts`):
  - Not wrapped in `authedAction` (authz is the invitation, not a role). Re-verifies signature, looks up by `tokenHash`, checks expiry + status, compares `session.user.email` to `invitation.email` (case-insensitive), opens a transaction that calls `auth.api.acceptInvitation({ body: { invitationId }, headers })` (Better Auth handles the `member` insert + `invitation.status='accepted'` update), then `auth.api.setActiveOrganization({ headers, body: { organizationId: invitation.organizationId } })`, then `logAudit(tx, { action: 'invitation.accepted', actorUserId: ctx.user.id, ... })`. Sets `emailVerified: true` if the user signed up through the invite link (named carve-out from lesson 3 of chapter 062). Redirects to `/dashboard`.
- **Env entries** (`.env.example`, new):
  - `INVITATION_SIGNING_SECRET=` (32 bytes base64, generate via `openssl rand -base64 32`)
  - `APP_URL=http://localhost:3000` (carry-in if missing)

### Inspector page spec

A single Server Component at `/inspector` is the verification surface. Provided in full; the student writes only the actions and helpers it exercises.

- **Acting-user switcher header.** A dropdown listing the four seeded users; selecting one writes a dev-only cookie that swaps the acting session (a tiny `switchUserAction` provided in `actions.ts`, gated by `NODE_ENV !== 'production'`). Used to verify RBAC by toggling between the owner/admin/member identities without manual sign-out/sign-in.
- **Active-org banner.** Renders `ctx.orgId`, `ctx.role`, and the org name. An adjacent org switcher (`<OrgSwitcher />` reused from the dashboard) updates the active org and `router.refresh()`es.
- **Members panel.** A table of members for the current active org: name, email, role, joined-at, and a role-change `<Select>` that posts to `changeMemberRoleAction`. The select is rendered for *every* row regardless of acting role on purpose — the verify lesson confirms the server-side refusal for the member acting role. A "Remove member" button shows next to the select with the same defense-in-depth posture.
- **Invite panel.** Email input + role dropdown (`admin` or `member` only — `owner` is not a value) calling `sendInvitationAction`. Below: a "Pending invitations" list with email, role, expiry countdown, and "Copy accept URL" (dev-only) plus "Revoke" affordances. The "Copy accept URL" short-circuits opening the local mailbox.
- **Audit-log tail.** The last 20 `auditLogs` rows for the current org, server-rendered, streaming on `router.refresh()` after each action. Each row shows actor, action, subject, payload, createdAt.
- **Raw helpers panel.** Read-only display of `tenantDb(orgId).query.member.findMany({})` and a row count of `auditLogs` for the current org — sanity check that the helper is filtering correctly.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Two seeded users belong to the same org with different roles | `pnpm db:seed`; inspector members panel shows owner, admin, member for Org A; the acting-user switcher offers all four seeded users |
| `authedAction` with `requireRole('admin')` rejects the member with a typed error | Switch acting user to the member; click "Change role" on a row; toast renders `forbidden` with the user-message; the `member.role` row is unchanged; no audit row is added |
| `authedAction` with `requireRole('admin')` accepts the admin | Switch acting user to the admin; change a member's role; the row updates; an `'member.role-changed'` audit row appears in the tail; the audit row's `actorUserId` matches the admin's id |
| An invite email arrives | As admin, submit the invite form with the student's real email + role `member`; inbox receives the React Email template with the orgName, inviterName, role, and an accept-URL button; `invitation` row exists with `status='pending'`; `tokenHash` is a 64-character hex string; the raw token does not appear in any DB column |
| Accepting the invite adds the new member with the right role | Sign out; open the email's accept URL in an incognito window; the accept page renders the Accept button; signing up via the prefilled form and accepting writes a `member` row with the invited role; `invitation.status` flips to `'accepted'`; `invitation.acceptedAt` is set; `session.activeOrganizationId` is the invited org |
| An audit-log entry is written for every role change | After every role change, the audit-log tail shows the `'member.role-changed'` row with `payload: { previousRole, newRole, memberId }`; the audit row was written in the same transaction as the role update (verify by force-failing the update with a bad input via the inspector — neither the row update nor the audit row land) |
| The audit-log table refuses UPDATE / DELETE from the app role | Open `psql` as the app role (provided in the starter's docker-compose env); attempt `UPDATE audit_logs SET action = 'x'` and `DELETE FROM audit_logs WHERE id = ...`; both return `permission denied` errors; the RLS policies are the structural defense |
| Tenant isolation holds on `audit_logs` | As Org A admin, hand-construct a query `SELECT * FROM audit_logs WHERE organization_id = '<org-B-uuid>'` through a server function that uses the unwrapped `db` without `withTenant`; the policy refuses the read (returns 0 rows because `current_setting('app.org_id')` doesn't match) |
| Inspector renders role-change buttons for every role | As member acting user, the role-change `<Select>` is still rendered (no client-side hide) — the server-side refusal is what's load-bearing |

### Concepts demonstrated → owning lesson

- Organizations as the tenancy model; `activeOrganizationId` on the session; create / switch / list flows — lesson 1 of chapter 060.
- `tenantDb(orgId)` wrapping Drizzle so missing the org filter doesn't compile; the named carve-out from Principle #5 — lesson 2 of chapter 060.
- The threshold where RLS earns its weight (highest-stakes data, many code paths) — lesson 3 of chapter 060.
- Postgres RLS through Drizzle (`pgPolicy`, deny-UPDATE/DELETE policies, the `withTenant(orgId, fn)` transaction pattern) — lesson 4 of chapter 060.
- Three-role RBAC (`owner` / `admin` / `member`); `roleAtLeast`; `requireOrgUser` returning `{ user, orgId, role }` — lesson 1 of chapter 061.
- The `authedAction(role, schema, fn)` wrapper at the Server Action boundary; four wrapper steps; the `ctx` payload; the canonical `Result` return — lesson 2 of chapter 061.
- Member management — role-change, remove, leave-org, ownership transfer; single-owner invariant in the helper — lesson 4 of chapter 061.
- `audit_logs` table — append-only by contract, by RLS deny policy, by application discipline; `logAudit(tx, event)` forcing a transaction — lesson 5 of chapter 061.
- The invitation table extensions (`tokenHash`, `acceptedAt`); the pending-state machine; seven-day expiry as a security primitive; the partial unique index on `(orgId, lower(email)) WHERE status='pending'` — lesson 1 of chapter 062.
- The signed accept URL (32-byte token + HMAC); SHA-256 at rest; send-after-commit transaction boundary; `'invitation.sent'` audit event — lesson 2 of chapter 062.
- Four accept arrival shapes; the verify order (signature → row → hash → expiry → status); explicit Accept-button consent gate; auto-`emailVerified` for invite-sourced signups; active-org switch on accept — lesson 3 of chapter 062.
- Catching the partial-unique-index error and translating to `'already-invited'` — lesson 4 of chapter 062.
- Email-mismatch refusal, double-click race against `status='pending'` filter, orphan-invite senior call — lesson 5 of chapter 062.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — chapter 046.
- Web Crypto random + SHA-256 + HMAC verify with constant-time compare — lesson 1 of chapter 020.
- React Email template authoring through the Unit 8 send pipeline — chapter 053.

---

## Lesson 1 — Brief and finished screenshot

Framing of the multi-tenant SaaS build, the inspector verification surface, the "Done when" list, the explicit scope cuts, and the starter `degit`.

Goals:

- Frame the build: the existing chapter 059 single-user dashboard becomes a multi-tenant SaaS with three roles, an audit trail, and an invitation handshake. Show one screenshot of the finished inspector page — members panel, role-change buttons, invite form, pending list, audit-log tail.
- Name the "Done when" verifications in one paragraph (seeded users with mixed roles, member rejected by `authedAction('admin')`, admin accepted, invite arrives at the student's real inbox, accept across email sessions adds the member with the right role, audit row written for every role change, `audit_logs` refuses UPDATE/DELETE from the app role).
- Name the scope cuts: no leave-org or ownership-transfer actions in this project (lesson 4 of chapter 061 owns the full set; the role-change action is the load-bearing one here); no fine-grained permissions; no SCIM / IdP provisioning; no bulk invitations; no team layer inside an org; no rate-limiting on invite send (Chapter 078); no seat-counting / entitlement gate (Chapter 068); RLS is wired *only* on `audit_logs` per the lesson 3 of chapter 060 senior call — application-layer scoping holds everywhere else.
- Set the senior payoff: multi-tenancy, RBAC, and the invitation handshake converge into one seam — the patterns shipped here (`tenantDb`, `authedAction`, `logAudit`, signed accept URL) carry into every privileged action the student writes for the rest of the course. The chapter 066 project layers lifecycle methods directly onto the `tenantDb` shape installed here.
- Show the end UX: a short animated capture of the invite flow (admin invites → email arrives → invitee clicks → accept screen → dashboard) and the role-refusal toast.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The inspector deliberately renders the role-change `<Select>` for every row regardless of the acting role. This is *defense-in-depth verification*, not a missed UX hide — the server-side refusal is what's load-bearing.
- The verified domain from chapter 054 is a hard prerequisite for the accept-the-invite verify step. Resend's sandbox sender will not work for this flow.
- `INVITATION_SIGNING_SECRET` is a new env entry, distinct from `BETTER_AUTH_SECRET` (different rotation cadence, different blast radius).

Codebase state at entry: empty repo.

Codebase state at exit: starter cloned; `docker compose up -d` running Postgres; `pnpm install` clean; `.env.local` filled with `RESEND_API_KEY`, `EMAIL_FROM`, the chapter 059 carry-in secrets, and a newly generated `INVITATION_SIGNING_SECRET`; `pnpm db:migrate && pnpm db:seed` populated with the chapter 059 schema; `pnpm dev` shows the chapter 059 sign-up / sign-in flow working. No org schema yet, no inspector yet.

Estimated student time: 15 to 20 minutes.

---

## Lesson 2 — Tour the starter and the broken inspector

Tour of the provided files, the stubbed modules, the seed script, the Better Auth CLI flow, and the inspector page that throws until `requireOrgUser` exists.

Goals:

- Walk the file tree, marking provided vs. stubbed. Linger on six files: `src/lib/auth.ts` (the chapter 059 instance — where the `organization()` plugin will land in lesson 3 of chapter 063), `src/lib/auth-helpers.ts` (`requireUser` exists; `requireOrgUser` does not), the new empty modules in `src/lib/` (`auth/roles.ts`, `tenant-db.ts`, `authed-action.ts`, `audit-log.ts`), `src/db/schema/audit.ts` (stub for the `auditLogs` table), `src/app/(protected)/inspector/page.tsx` (the verification surface, provided in full).
- Read the inspector's source: confirm it expects `requireOrgUser` to exist (currently throws "not implemented"), expects `tenantDb` to exist for the members read, expects `authedAction` to wrap the role-change handler, and expects `logAudit` to write the audit tail. Each missing piece corresponds to a later lesson.
- Read the seed script: two orgs (`Acme` and `Beta`), four users (Alice the owner of both, Bob the admin of Acme, Carol the member of Acme, Dave the admin of Beta), one pending invitation seeded for verifying the management surface. Confirm the seed runs idempotently (`pnpm db:seed` twice doesn't duplicate rows).
- Read the Better Auth CLI flow: `pnpm auth:generate` will regenerate `src/db/schema/auth.ts` after the organization plugin is added — the student commits the diff. Verify the current `auth.ts` schema (just the chapter 059 four tables) by opening Drizzle Studio.
- Read chapter 059 carry-in: `src/lib/email.ts`, the `WelcomeVerification.tsx` template, `proxy.ts`, the `(auth)` and `(protected)` route groups. These are load-bearing; the student should remember the call shape.
- Confirm the new env entry: open `.env.local`, generate and paste `INVITATION_SIGNING_SECRET` via `openssl rand -base64 32`. Verify `src/lib/env.ts` has the entry typed.
- Run the app: confirm sign-up / sign-in / sign-out / `/dashboard` still work from chapter 059. Visit `/inspector`: the page throws because `requireOrgUser` isn't implemented — the expected starting state.

Senior calls and watch-outs:

- The Better Auth CLI is the canonical way to add plugin-owned columns. Hand-editing `auth.ts` after `auth:generate` is review-loud — re-run the CLI when the plugin config changes.
- The inspector's "switch acting user" cookie is dev-only (`NODE_ENV !== 'production'`). The same affordance in production would be a privilege-escalation vector.
- The seed includes a pre-pending invite for Bob (already accepted by him in the seed — used to verify the post-accept audit row). One additional pending invite to `pending@example.com` is seeded to test the management surface without sending an email.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded, env filled.

Codebase state at exit: student has read every provided file, run the app, confirmed `/inspector` throws as expected. No code written.

Estimated student time: 20 to 30 minutes.

---

## Lesson 3 — Install the organization plugin and `requireOrgUser`

Adding the `organization()` plugin with custom invitation fields, the `session.create` hook that seeds `activeOrganizationId`, regenerating the auth schema, and shipping `roleAtLeast` plus `requireOrgUser`.

Goals:

- Add `organization()` to the `betterAuth({ plugins })` array in `src/lib/auth.ts` with `teams: { enabled: false }`, `invitationExpiresIn: 60 * 60 * 24 * 7` (seven days, named as a constant), and the `schema.invitation.additionalFields` for `tokenHash` and `acceptedAt`. Register `organizationClient()` in `auth-client.ts`.
- Add `databaseHooks.session.create.before` that sets `activeOrganizationId` to the user's most-recent active org (or first membership) on session creation. Write a small `pickInitialActiveOrg(userId)` helper in `auth.ts`.
- Run `pnpm auth:generate` and commit the regenerated `src/db/schema/auth.ts` — the new `organization`, `member`, `invitation` tables and the `session.activeOrganizationId` column drop in. Run `pnpm db:generate && pnpm db:migrate`. Verify with Drizzle Studio.
- Fill `src/lib/auth/roles.ts`: the `Role` union, `ROLE_RANK`, and `roleAtLeast`. Export `type Role`.
- Extend `src/lib/auth-helpers.ts`: add `requireOrgUser()` returning `{ user, orgId, role }`. The function reads `session.activeOrganizationId`; if null, redirects to `/onboarding/create-org`; reads the `member` row for `(userId, orgId)` to confirm membership and pull role; if missing, redirects to `/onboarding/create-org`; returns the typed shape. Cast `member.role` as `Role` at the boundary.
- Verify in the inspector: `/inspector` no longer throws — the page renders the active-org banner with Alice's role. Switch acting users via the dev cookie helper; the banner re-renders with the new identity. Switch orgs via the org switcher; `revalidatePath('/', 'layout')` fires; the banner shows the new org.
- Run the seed script's `create-org` path: from a fresh signup with no orgs, `/onboarding/create-org` renders; submitting creates the org and redirects to `/dashboard` with the new active org. (This path is exercised by the existing chapter 059 + organization plugin call shape; the student verifies, doesn't re-implement.)

Senior calls and watch-outs:

- `databaseHooks.session.create.before` is the *one* place that sets the initial active org. Don't sprinkle the setter across sign-in / sign-up / OAuth callbacks — every entry point that mints a session must cover, and the hook is the structural way.
- `requireOrgUser` reads the role from the database, not from the session cookie cache. The cookie cache can carry a stale role for up to the `freshAge` window (lesson 3 of chapter 056); reading the membership row inside the helper is the senior reflex for role-change correctness within seconds. The cookie-cached `activeOrganizationId` is fine because `setActive` rewrites the cookie immediately.
- Never trust `activeOrganizationId` from a query string or route param. The only acceptable source is the server-validated session.

Codebase state at entry: chapter 059 auth flow working, no org tables, `requireOrgUser` not implemented.

Codebase state at exit: `organization` / `member` / `invitation` tables migrated; `session.activeOrganizationId` column live; the four seeded users have memberships and a default active org; `requireOrgUser` returns the typed shape; the inspector renders the active-org banner and the acting-user switcher works; the org switcher refreshes the layout. The members panel, role-change buttons, and audit tail still throw because `tenantDb`, `authedAction`, and `logAudit` don't exist yet.

Estimated student time: 35 to 45 minutes.

---

## Lesson 4 — `audit_logs` with RLS deny-write policies

Defining the `auditLogs` table and its indexes, declaring tenant SELECT / INSERT and deny UPDATE / DELETE `pgPolicy` rules, and shipping `withTenant` plus the transaction-required `logAudit(tx, event)` signature.

Goals:

- Fill `src/db/schema/audit.ts` with the `auditLogs` table — the full column set, the two composite indexes (`(organizationId, createdAt desc)` and `(organizationId, actorUserId, createdAt desc)`), the `inet` type for `actorIp`, the `jsonb` type for `payload`.
- Enable RLS on the table: `pgTable(...).enableRLS()`. Declare three policies via `pgPolicy`:
  - `audit_logs_tenant_select` — `FOR SELECT TO authenticated USING (organization_id = current_setting('app.org_id', true)::uuid)`.
  - `audit_logs_tenant_insert` — `FOR INSERT TO authenticated WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid)`.
  - `audit_logs_no_update` — `FOR UPDATE TO authenticated USING (false)`.
  - `audit_logs_no_delete` — `FOR DELETE TO authenticated USING (false)`.
- Generate and run the migration. Verify in `psql`: as the app role, `INSERT INTO audit_logs (...)` succeeds inside a `BEGIN; SET LOCAL app.org_id = '<org-uuid>'; ...; COMMIT;` block; the same insert outside a transaction (with the variable unset) fails. `UPDATE audit_logs SET action = 'x'` and `DELETE FROM audit_logs` both return `permission denied`.
- Fill `src/lib/audit-log.ts` with `logAudit(tx, event)`. The function signature accepts a Drizzle transaction handle and an event payload; the body inserts one row. The type signature makes the `tx` argument *required* — there is no overload that accepts the raw `db`. This is the discipline from lesson 5 of chapter 061: auditing happens inside a transaction, never as a fire-and-forget call.
- Fill `src/lib/tenant-db.ts`'s `withTenant(orgId, async (tx) => ...)` shape: opens `db.transaction(async (tx) => { await tx.execute(sql\`SET LOCAL app.org_id = ${orgId}::uuid\`); return await fn(tx); })`. Every audit write goes through this so the RLS session variable is set; reads on `audit_logs` go through this too.
- Verify in the inspector: nothing has changed yet (no actions write audit rows) — but the inspector's "Raw helpers panel" now shows `auditLogs` row count as 0 for the current org. The verify step is the `psql` walk-through above.

Senior calls and watch-outs:

- `SET LOCAL` is bound to the transaction — it auto-clears on commit/rollback. With pooled connections (the default), `SET` (no `LOCAL`) would persist across requests on the same connection and silently leak `app.org_id` across tenants. Use `SET LOCAL`, always inside a transaction, never `SET` at session level.
- The deny-UPDATE / deny-DELETE policies are *structural*. The application discipline (never write code that issues UPDATE or DELETE on `audit_logs`) plus the DB grants plus the policies are three layers; the policies are the load-bearing one because they don't depend on developer attention.
- The owner role bypasses RLS (Postgres default). Migrations and the retention job run as the owner role; the application request handler runs as `authenticated`. The retention job is a year-2 reach, named here, not built.
- The cast `current_setting('app.org_id', true)::uuid` uses the `true` arg so a missing setting returns NULL (not an error) — the policy then naturally returns false, which is the safe behavior. Without `true`, the missing-setting path throws and surfaces as a 500 instead of a refusal.

Codebase state at entry: org tables migrated, `requireOrgUser` working, no audit table.

Codebase state at exit: `auditLogs` table live with RLS policies; `logAudit(tx, event)` ready to be called; `withTenant(orgId, fn)` opens the RLS-scoped transaction. The verify step (manual `psql` UPDATE/DELETE refusal) passes. No actions write to the table yet.

Estimated student time: 40 to 50 minutes.

---

## Lesson 5 — `tenantDb`, `authedAction`, and the role-change action

Building the typed `tenantDb(orgId)` facade, the four-step `authedAction(role, schema, fn)` wrapper, and the `changeMemberRoleAction` that refuses owner targets, refuses last-owner demotion, and audits in-transaction.

Goals:

- Fill the typed `tenantDb(orgId)` facade in `src/lib/tenant-db.ts`. The shape:
  - `.query.<table>` for the tenant-owned tables (`member`, `invitation`, `auditLogs`, plus any feature tables) — each `findMany` / `findFirst` composes the caller's `where` via `and(eq(<table>.organizationId, orgId), userWhere)`.
  - `.insert(<table>).values({...})` injects `organizationId` and throws if the caller passed a mismatched value.
  - `.update(<table>).set(...).where(...)` and `.delete(<table>).where(...)` always `and`-in the org predicate.
  - `.transaction(fn)` opens `withTenant(orgId, fn)` so the RLS session variable is set for the duration.
  - A `TENANT_TABLES` type-level set drives which tables are accessible through the facade; reaching for `tenantDb(orgId).query.user` is a type error (the `user` table is global).
- Fill `src/lib/authed-action.ts` with the `authedAction(role, schema, fn)` factory. Four steps: `requireOrgUser()` → `roleAtLeast(ctx.role, required)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`. The `ctx` payload assembles `{ user, orgId, role, db: tenantDb(orgId), ip, userAgent }`; `ip` and `userAgent` are read from `headers()` inside the wrapper. Failure shapes return the canonical `Result.error` discriminants — no throws for forbidden / invalid-input.
- Fill `changeMemberRoleAction` in `src/lib/invitations/manage.ts`. Schema: `z.strictObject({ memberId: z.string().uuid(), newRole: z.enum(['admin', 'member']) })`. Body inside a `ctx.db.transaction(async (tx) => ...)`:
  - Read the target member through `tx.query.member.findFirst({ where: eq(member.id, memberId) })` — `tenantDb` scopes the read to the active org.
  - Refuse with `'not-a-member'` if not found, `'cannot-change-owner-role'` if the target is owner, `'last-owner'` if the new role would leave zero owners (count check inside the transaction).
  - `tx.update(member).set({ role: newRole }).where(eq(member.id, memberId))`.
  - `logAudit(tx, { action: 'member.role-changed', subjectType: 'member', subjectId: memberId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { previousRole: target.role, newRole }, ip: ctx.ip, userAgent: ctx.userAgent })`.
  - Call `revalidatePath('/inspector')`.
  - Return `Result.ok({ memberId, newRole })`.
- Verify in the inspector: switch acting user to the admin (Bob); click the role-change `<Select>` on Carol's row, change to `admin`; the row updates, the audit tail shows the `'member.role-changed'` row with the correct payload and actor. Switch acting user to the member (Carol); try changing Bob's role; toast surfaces `forbidden`; no DB change, no audit row. Switch back to the admin; try demoting the owner (Alice); toast surfaces `cannot-change-owner-role`. Try changing Alice's own role; the last-owner check fires (`'last-owner'`).
- Inspect the "Raw helpers panel": `auditLogs` row count for the current org increments only on successful role changes, never on rejected attempts.

Senior calls and watch-outs:

- The wrapper is the *only* call shape for privileged actions. If a Server Action exports without `authedAction`, the review catches it because the import shape is wrong. Don't add `requireOrgUser` + role check inside an action body and call it equivalent — review-fragile.
- `ctx.db` is already `tenantDb(orgId)`. The action body never reaches for the unwrapped `db` import — that's the cross-tenant escape hatch, used only in admin scripts that live in `scripts/`.
- The audit write happens inside the *same* transaction as the role update. If the audit insert fails, the role update rolls back. The alternative ("fire and forget the audit log") leaves the system in a state where the role changed but no record exists — exactly the wrong direction for a compliance table.
- The wrapper's role check returns `Result.error('forbidden')` instead of throwing. The form's `useActionState` reducer renders the toast/banner; the user stays on the page. A throw would 500 the action and lose the typed error contract.
- `forbidden` and `invalid-input` are *user-safe* messages. The detail (which role was required, what the parsed errors were) is logged at the wrapper seam for operator-side observability, not surfaced to the user. The user/operator split is the chapter 084 discipline foreshadowed.

Codebase state at entry: org tables + audit table live, no helpers, no actions.

Codebase state at exit: `tenantDb`, `authedAction`, `logAudit` all live; `changeMemberRoleAction` works end-to-end; the inspector's role-change buttons reject the member and accept the admin; audit rows land on success. The invite flow still doesn't exist — `/accept-invite` 404s, the invite form throws.

Estimated student time: 55 to 70 minutes.

---

## Lesson 6 — Send an invitation with a signed accept URL

Generating the 32-byte token, hashing at rest, HMAC-signing the URL, writing the row plus the `invitation.sent` audit event in one transaction, sending the React Email after commit, and translating the partial-unique-index collision into `already-invited`.

Goals:

- Fill `src/lib/invitations/url.ts` with `signedInviteUrl` and `verifyInviteSignature`. Use `crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])` once at module load; `sign` for the URL builder, `verify` for the accept path's constant-time check. Base64url-encode the signature; the URL shape is `${env.APP_URL}/accept-invite?id=...&token=...&sig=...`.
- Fill `src/emails/InviteEmail.tsx` as a React Email component: heading "You're invited to {orgName}", body ("{inviterName} invited you as {role}. This invitation expires {relativeTime(expiresAt)}."), a primary CTA button with `acceptUrl`. Mirror the structure of `WelcomeVerification.tsx` from chapter 059.
- Fill `sendInvitationAction` in `src/lib/invitations/send.ts`:
  - `authedAction('admin', sendInvitationSchema, async ({ email, role }, ctx) => ...)`.
  - Inside `ctx.db.transaction(async (tx) => ...)`:
    - Check existing membership: read the `user` row by `lower(email)` then check `member.findFirst({ where: and(eq(member.userId, user.id), eq(member.organizationId, ctx.orgId)) })`. Return `Result.error('already-member')` if found.
    - Generate the token: `const rawBytes = crypto.getRandomValues(new Uint8Array(32)); const rawToken = Buffer.from(rawBytes).toString('base64url'); const tokenHash = await sha256Hex(rawToken)`.
    - Call `auth.api.createInvitation({ body: { email, role, organizationId: ctx.orgId }, headers: await headers() })` inside the transaction — Better Auth's plugin call writes the `invitation` row with the right shape. Then `tx.update(invitation).set({ tokenHash }).where(eq(invitation.id, result.id))` to attach the hash (the plugin doesn't know about the custom field; the student writes the additional-field column after the plugin insert).
    - `logAudit(tx, { action: 'invitation.sent', subjectType: 'invitation', subjectId: invitationId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { email, role } })`.
  - After the transaction commits: build the URL via `signedInviteUrl(invitationId, rawToken)`, call `sendEmail({ to: email, subject: \`You're invited to \${orgName}\`, react: <InviteEmail orgName inviterName role acceptUrl expiresAt />, idempotencyKey: \`invitation.sent:\${invitationId}\` })`. If the send rejects, return `Result.error('email-send-failed', { invitationId })` — the row exists, the resend affordance is the recovery.
  - Catch the partial-unique-index error (`23505` on `(organizationId, lower(email)) WHERE status='pending'`) and translate to `Result.error('already-invited', { existingInvitationId })` — re-query inside the catch to get the existing id.
  - On success: `revalidatePath('/inspector')`, return `Result.ok({ invitationId })`.
- Verify in the inspector: as admin, submit the invite form with the student's real email + role `member`; toast shows `Result.ok({ invitationId })`; pending-invites list updates; audit tail shows `'invitation.sent'`. Check the inbox: the React Email arrives with the CTA button pointing at `/accept-invite?id=...&token=...&sig=...`. Click the link — the accept page 404s (next lesson). In Postgres: `tokenHash` is a 64-character hex string, the raw token is nowhere in the DB. Try inviting the same email again: `Result.error('already-invited')` from the partial-unique-index catch.

Senior calls and watch-outs:

- The email send sits *outside* the transaction. If Resend is down, the row exists and the inspector surfaces a resend affordance — orphan-email-on-rollback is the worse failure mode.
- The raw token never lands in the database, never appears in server logs (the logger redacts `token` and `sig` query params globally — Sentry breadcrumb redaction is the discipline). The hash is the only DB-resident form.
- The HMAC secret (`INVITATION_SIGNING_SECRET`) is distinct from `BETTER_AUTH_SECRET`. Reusing one secret across two cryptographic uses tangles rotation.
- `email.toLowerCase()` is part of the Zod schema, not a runtime call inside the action body. The partial-unique-index keys on `lower(email)`; the action input must match or the dedup silently fails.
- `auth.api.createInvitation` is the canonical plugin call shape. Don't hand-write the `INSERT` against the `invitation` table — the plugin owns the columns it generates; the student only writes the additional-field columns (`tokenHash`, `acceptedAt`) via a follow-up `tx.update`.
- Surfacing the invite URL in the inspector UI is dev-only (`NODE_ENV !== 'production'`). In production, the URL is a credential the inviter shouldn't possess after send.

Codebase state at entry: helpers + role-change action live; no invite flow.

Codebase state at exit: invite send works end-to-end (DB row, email arrives, audit row). The accept page does not exist — clicking the URL 404s. The full send path is exercised but the human can't yet accept.

Estimated student time: 50 to 65 minutes.

---

## Lesson 7 — Accept the invitation across four arrival shapes

Server-Component accept page that verifies signature → row → hash → expiry → status and branches on session and email, plus the `acceptInvitationAction` that joins, switches active org, auto-verifies email, and audits inside one transaction.

Goals:

- Build the accept page at `src/app/(auth)/accept-invite/page.tsx` as a Server Component. Read `searchParams` (`id`, `token`, `sig`). The verify order:
  1. `verifyInviteSignature(id, token, sig)` — bad → render the generic refusal screen.
  2. `db.query.invitation.findFirst({ where: eq(invitation.id, id) })` — missing → same generic refusal.
  3. `sha256Hex(token) === invitation.tokenHash` (constant-time-compatible because both are server-computed hex strings of fixed length) — mismatch → same refusal.
  4. `invitation.expiresAt > now()` — expired → "this invite expired, ask for a new one" screen.
  5. `invitation.status === 'pending'` — accepted → friendly "you're already a member" screen with a link to the org dashboard.
- On a valid pending invite, branch on session:
  - **(A) Signed in, same email** → render the Accept button (a `<form action={acceptInvitationAction}>` with hidden `id` and `token`) plus the org name, inviter name, and role.
  - **(B) Signed in, different email** → render the email-mismatch refusal: "This invitation was sent to {invitation.email}. Sign out and sign in with that email to accept."
  - **(C) Signed out, account exists on the invited email** → render a sign-in form prefilled with the email, redirecting back to `/accept-invite?...` on success.
  - **(D) Signed out, no account** → render a sign-up form prefilled with the email, redirecting back to `/accept-invite?...` on success.
- Fill `acceptInvitationAction` in `src/lib/invitations/accept.ts`:
  - Not wrapped in `authedAction` — the invitation itself is the authz.
  - Schema: `z.strictObject({ id: z.string().uuid(), token: z.string() })`.
  - Re-verify the invitation (signature is not part of the action input; the action re-fetches and re-hashes — the page's verification doesn't carry across requests).
  - Read the session; refuse if signed out or if `session.user.email.toLowerCase() !== invitation.email.toLowerCase()`.
  - Inside `db.transaction(async (tx) => ...)` (opened through `withTenant(invitation.organizationId, ...)` so the RLS variable is set):
    - Call `auth.api.acceptInvitation({ body: { invitationId: id }, headers: await headers() })` — Better Auth's plugin call inserts the `member` row and flips `invitation.status='accepted'`. Then `tx.update(invitation).set({ acceptedAt: sql\`now()\` }).where(eq(invitation.id, id))` to set the additional field.
    - Call `auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: invitation.organizationId } })` so the post-redirect lands in the joined org.
    - If the session user just signed up through this invite flow (detected via `user.emailVerified === false` plus a recent `createdAt`), set `emailVerified = true` on the `user` row — the invite click is the verification.
    - `logAudit(tx, { action: 'invitation.accepted', subjectType: 'invitation', subjectId: id, actorUserId: ctx.user.id, orgId: invitation.organizationId, payload: { role: invitation.role, memberId } })`.
  - `redirect('/dashboard')` after commit.
- Verify in the inspector: from the previous lesson's invite, open the URL in a private window — branch (D) renders. Sign up with the prefilled email; auto-redirect to `/accept-invite?...`; branch (A) renders. Click Accept; redirected to `/dashboard` with the invited org active. Switch acting user to the new identity in the inspector: the member row exists with the right role; audit tail shows `'invitation.accepted'`; `user.emailVerified` is `true` even though no separate verification was sent.
- Negative tests:
  - Mangle the `sig` query param (flip one character) → generic refusal; no DB lookup happens.
  - Force expire via the inspector's debug control (sets `expiresAt = now() - 1 hour`) → expired screen.
  - Re-click an already-accepted URL → friendly "already a member" screen.
  - Sign in as Carol (whose email differs) and visit the URL → branch (B) email-mismatch refusal.
  - Open the accept URL in two tabs and click Accept simultaneously → one wins, the other gets the "already a member" branch (Better Auth's accept call filters on `status='pending'`).

Senior calls and watch-outs:

- The verify order is signature → row → hash → expiry → status. The first three failures render the *same* generic refusal — never differentiate "missing" from "tampered" from "hash-mismatch" publicly; the recovery path is identical (ask for a new invite).
- The accept Server Action re-verifies; the page's pre-check is for the UI branch, not for authz. Form submissions are separate requests; the action does its own check.
- The active-org switch happens inside the transaction — the post-redirect lands in the joined org, not the user's previous active org. Without this, the redirect lands in the wrong context.
- The auto-`emailVerified` carve-out is the lesson 3 of chapter 062 senior reflex: receiving the click on the invited email is itself the verification. Without it, the user hits a "verify your email" loop after just confirming the email through the invite.
- Better Auth's `acceptInvitation` requires an authenticated session — the signed-out arrival shape (D) must complete sign-up first, which seeds the session, then the accept call runs. The page's branch routing structurally enforces this.
- Auto-accepting on GET (the page render itself writing the `member` row) would let URL-scanning crawlers and corporate URL-rewriters consume the invite silently. The explicit Accept button is the consent gate.
- Email comparison is case-insensitive on both sides — lower the invitation's email at write time (Zod schema in the send action), lower the session email at compare time.

Codebase state at entry: invite send works; accept page does not exist.

Codebase state at exit: full invite handshake works end-to-end across all four arrival shapes; `member` row, active-org switch, and audit row all written inside one transaction; tamper / expiry / status / email-mismatch / double-click race all behave per spec.

Estimated student time: 55 to 70 minutes.

---

## Lesson 8 — Verify RBAC, append-only, and cross-tenant probes

Clause-by-clause rehearsal of the "Done when" list — RBAC refusals, `psql` UPDATE / DELETE refusals on `audit_logs`, cross-tenant probes through both `tenantDb` and the unwrapped client, and the full invite handshake on a real inbox.

Goals:

- Walk every "Done when" clause systematically against the table in the framing. The per-lesson verifications in lesson 5 of chapter 063–lesson 7 of chapter 063 exercised the individual flows; this lesson runs them as one rehearsal and probes the cross-cutting structural defenses.
- RBAC end-to-end: as the member acting user (Carol), every role-change attempt returns `forbidden` with no DB change and no audit row. As the admin (Bob), role changes succeed; the audit tail shows `'member.role-changed'` with actor + subject + payload `{ previousRole, newRole }` for every change. As the owner (Alice), demoting herself to `member` returns `last-owner` (no DB change). Confirm the owner-count query in the action body reads through `tenantDb`, not the raw client.
- `audit_logs` append-only enforcement at the DB layer: open `psql` as the app role (credentials in `.env.example`). Inside `BEGIN; SET LOCAL app.org_id = '<acme-uuid>';` block, `SELECT count(*) FROM audit_logs` returns the expected count. `UPDATE audit_logs SET action = 'tampered' WHERE id = ...` returns `permission denied`. `DELETE FROM audit_logs WHERE id = ...` returns `permission denied`. Outside any transaction (with `app.org_id` unset), `SELECT * FROM audit_logs LIMIT 1` returns 0 rows — the policy's `current_setting('app.org_id', true)::uuid` evaluates NULL, refusing.
- Cross-tenant probe on `audit_logs`: from a server function that uses the unwrapped `db` import inside `withTenant(acmeOrgId, ...)`, attempt `db.query.auditLogs.findMany({ where: eq(auditLogs.organizationId, betaOrgId) })`. Returns 0 rows — RLS is the structural defense. Repeat with no `withTenant` wrap; same result for a different reason (unset session variable). Both paths fail closed.
- Cross-tenant probe on tenant-owned tables (no RLS, application-layer only): from a server function, attempt `tenantDb(acmeOrgId).query.member.findMany({})` — returns only Acme members. The same call with the unwrapped `db` import and a hand-typed `where: eq(member.organizationId, betaOrgId)` returns Beta's members — proving that `tenantDb` is the *only* structural defense on non-RLS tables and the unwrapped import is the cross-tenant escape hatch reserved for `scripts/`.
- Full invite handshake on a real inbox: as Acme admin, invite the student's real email + role `member`. Verify the inbox arrival, the `tokenHash` shape in Postgres, the absence of the raw token anywhere in the DB. Click the URL in a private window; complete sign-up via the prefilled form; click Accept; land on `/dashboard` with Acme active. The new member appears in the inspector; `user.emailVerified` is true; the audit tail shows `'invitation.sent'` (by the admin) followed by `'invitation.accepted'` (by the new user).
- Re-invite collision: as admin, attempt to invite the same email a second time. `Result.error('already-invited', { existingInvitationId })` from the partial-unique-index catch.
- Tenant isolation in the running app: switch active org to Beta via the org switcher. The members panel shows Beta's members only; the audit tail shows Beta's events only; the pending-invites list shows Beta's invites only. No cross-tenant bleed.
- Inspector defense-in-depth verification: as Carol (member), the role-change `<Select>` is still rendered on every row. Clicking it surfaces the `forbidden` refusal. This proves the server-side refusal is load-bearing, not the UI hide.
- Name the senior calls one more time:
  - The `tenantDb` + `authedAction` pair makes the two highest-frequency multi-tenancy bug classes (missing org filter, missing role check) structurally impossible at the call sites that compile.
  - The audit log is *in the transaction*, not after it. An audit row exists if and only if the work landed.
  - RLS earns its weight on `audit_logs` — high-stakes data, multiple writers (every privileged action), regulatory tail. The default elsewhere is application-layer scoping via `tenantDb`.
  - The accept URL's signature is fast pre-DB rejection of tampered links; the 32-byte token is the primary authentication; the SHA-256 hash at rest is what makes a DB read alone insufficient to forge invites.
  - The email send sits *after* the transaction commit. The row is the source of truth; resend is cheap.
- Forward references:
  - chapter 066 layers `active()` / `archived()` / `includingDeleted()` lifecycle methods onto the exact `tenantDb` shape installed here.
  - chapter 067 reuses the audit-log discipline for the `processed_events` webhook ingestion table.
  - chapter 075 dispatches notifications on `invitation.sent` / `member.role-changed` via the centralized dispatcher.
  - chapter 078 wraps `sendInvitationAction` with the Upstash rate limit (20 invites per admin per hour as the foreshadowed default).
  - chapter 085 hardens the broader audit + retention story (90-day cleanup for canceled/expired invites, the audit-export-for-legal flow).

Senior calls and watch-outs:

- The verify lesson is the rehearsal of failure modes — running each one and naming what would break without the disciplines just installed.
- If a verification fails, the lesson points at the owning build lesson, not at "debug it yourself."
- The accept flow's verify across email sessions needs the student's verified domain from chapter 054 — the sandbox sender will not deliver to the personal inbox.

Codebase state at entry: full multi-tenant surface with role-change and invite flows working.

Codebase state at exit: same surface, verified clause-by-clause. The student can articulate every decision (`tenantDb` vs. raw `db`, `authedAction` vs. inline check, audit-in-transaction vs. after, RLS on `audit_logs` only vs. everywhere, signed URL plus hashed token vs. either alone) and name which forward unit will lean on it.

Estimated student time: 25 to 35 minutes.
