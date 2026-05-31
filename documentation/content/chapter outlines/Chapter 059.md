# Chapter 059 — Project: org, RBAC, and invitations end-to-end

## Chapter framing

Chapter 059 cashes in everything Unit 9 installed. The student arrives from chapter 055 with a working email+password auth flow against Better Auth and a `user` / `session` / `account` / `verification` schema, and from chapter 050 with a `sendEmail` wrapper, a verified domain, the `email_suppressions` read, and the React Email scaffolding. Chapter 056 taught the organization data model and the `tenantDb(orgId)` helper. Chapter 057 taught the three-role RBAC default, the `authedAction(role, schema, fn)` wrapper, the member-management invariants, and the append-only `audit_logs` table. Chapter 058 taught the invitation handshake — signed accept link, four arrival shapes, the management surface. This project compresses all of it into one runnable build: install the organization plugin, add the active-org slot to the session, lay down `audit_logs` and the `invitations` extensions, build the `tenantDb` + `authedAction` pair, ship the role-change action with audit writes, and ship the invite send + accept flow with audit writes.

Threads that run through every lesson. The organization plugin owns the canonical table names (`organization`, `member`, `invitation`); the student adds `tokenHash` and `acceptedAt` to `invitation` via `additionalFields` and adds `activeOrganizationId` to `session`. Every read on a tenant-owned table goes through `tenantDb(orgId)` — hand-typed `.from(...)` against tenant tables is a code-review red flag. Every privileged Server Action ships as `authedAction(role, schema, fn)` — the wrapper is the only call shape that compiles for a privileged write. The `audit_logs` table is append-only by application discipline plus an RLS deny policy on UPDATE / DELETE (the only RLS-protected table in this project — application-layer scoping holds elsewhere per the lesson 3 of chapter 056 senior call). Every privileged mutation writes the audit row in the same transaction as the work, through `logAudit(tx, event)` whose signature forces a `tx` argument so off-transaction calls don't typecheck. The accept-invite URL carries a 32-byte random token plus an HMAC signature; the database stores only `sha256(token)`. The email send happens *after* the DB transaction commits; deferred-resend is the recovery affordance, not a background queue. Each Implementation lesson ends on a runnable state the student confirms in the inspector.

### Project goals

The project is done when:

- Two seeded users belong to the same org with different roles, surfaced in the inspector members panel (owner, admin, member for Org A), and the acting-user switcher offers all four seeded users.
- `authedAction('admin', ...)` rejects the member acting user with a typed `forbidden` error: the `member.role` row is unchanged and no audit row is added.
- `authedAction('admin', ...)` accepts the admin acting user: the role row updates and an `'member.role-changed'` audit row appears in the tail whose `actorUserId` matches the admin's id.
- An audit-log entry is written for every role change — `payload: { previousRole, newRole, memberId }` — and it is written in the same transaction as the role update (force-failing the update lands neither the row update nor the audit row).
- The inspector renders the role-change `<Select>` for every role on purpose: as the member acting user it is still rendered, so the server-side refusal — not a client-side hide — is what's load-bearing.
- An invite email arrives: the React Email template lands in the student's real inbox with the orgName, inviterName, role, and accept-URL button; the `invitation` row exists with `status='pending'`; `tokenHash` is a 64-character hex string; the raw token does not appear in any DB column.
- Accepting the invite across email sessions adds the new member with the invited role: the accept page renders the Accept button, signing up via the prefilled form and accepting writes a `member` row, `invitation.status` flips to `'accepted'`, `invitation.acceptedAt` is set, and `session.activeOrganizationId` is the invited org.
- The `audit_logs` table refuses UPDATE / DELETE from the app role: `UPDATE audit_logs SET action = 'x'` and `DELETE FROM audit_logs WHERE id = ...` both return `permission denied`; the RLS policies are the structural defense.
- Tenant isolation holds on `audit_logs`: a hand-constructed read of Org B's rows through the unwrapped `db` without `withTenant` returns 0 rows because `current_setting('app.org_id')` doesn't match.

### Scope cuts

- No leave-org or ownership-transfer actions in this project (lesson 4 of chapter 057 owns the full set; the role-change action is the load-bearing one here).
- No fine-grained permissions; no SCIM / IdP provisioning; no bulk invitations; no team layer inside an org.
- No rate-limiting on invite send (chapter 074); no seat-counting / entitlement gate (chapter 064).
- RLS is wired *only* on `audit_logs` per the lesson 3 of chapter 056 senior call — application-layer scoping via `tenantDb` holds everywhere else.

### Dependency carry-in

- **From chapter 055 (auth flow):** `src/lib/auth.ts` with the `betterAuth(...)` instance including `nextCookies()` and `emailAndPassword` with `requireEmailVerification`; `src/lib/auth-client.ts` exporting `authClient`; the catch-all handler at `src/app/api/auth/[...all]/route.ts`; `src/lib/auth-helpers.ts` with `getCurrentUser()` and `requireUser()`; `proxy.ts` with the cookie-presence gate and `?next=` round-trip; the `(auth)` and `(protected)` route groups; the Drizzle-managed `user` / `session` / `account` / `verification` tables in `src/db/schema/auth.ts`; the `WelcomeVerification.tsx` React Email template under `src/emails/`.
- **From chapter 050 (email send):** `src/lib/email.ts` exposing `sendEmail({ to, subject, react, idempotencyKey, replyTo?, bypassSuppression? })` (with `idempotencyKey` required per the chapter 050 convention); the `email_suppressions` read inside that wrapper; `RESEND_API_KEY` + `EMAIL_FROM` env entries; the verified domain; the `WelcomeEmail.tsx` template as the React Email pattern reference.
- **From 6.x (Drizzle):** `src/db/client.ts`, the migration pipeline (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`), `drizzle.config.ts` pointing at `src/db/schema/*`, Drizzle's relational query API + `drizzle-zod`.
- **From chapter 043 / chapter 044:** `<form action={serverAction}>`, `useActionState`, the canonical `Result<T>` discriminant shape, Zod parse at the action boundary, the `redirect()` after success.
- **From lesson 1 of chapter 016:** Web Crypto primitives — `crypto.randomUUID`, `crypto.getRandomValues`, `crypto.subtle` for SHA-256 and HMAC; the constant-time compare reflex (via `crypto.subtle.verify`).
- **From chapter 033 / chapter 034:** `'use server'` / `'use client'` boundary, Server Components reading `searchParams` async.
- **Forward into chapter 062:** the `tenantDb(orgId)` and `authedAction(role, schema, fn)` shapes shipped here are the exact ones chapter 062 layers `active()` / `archived()` lifecycle methods onto.

### Starter file tree (stubs marked with TODO)

```
.env.example                                # provided: previous entries + INVITATION_SIGNING_SECRET, APP_URL
docker-compose.yml                          # provided: postgres:18
drizzle.config.ts                           # provided
package.json                                # provided: db:generate, db:migrate, db:seed, auth:generate, dev, build, test
proxy.ts                                    # provided from chapter 055
src/
  lib/
    auth.ts                                 # provided: chapter 055 instance; TODO student: add organization() plugin with additionalFields + databaseHooks.session.create
    auth-client.ts                          # provided: chapter 055 client; TODO student: register organizationClient() plugin
    auth-helpers.ts                         # provided: requireUser/getCurrentUser; TODO student: extend to requireOrgUser returning { user, orgId, role }
    auth/
      roles.ts                              # TODO student: ROLE_RANK, roleAtLeast, Role type
    email.ts                                # provided from chapter 050
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
      auth.ts                               # provided chapter 055; regenerated by auth:generate after adding organization plugin — student commits the diff
      audit.ts                              # TODO student: auditLogs table + RLS policies (deny UPDATE/DELETE)
  emails/
    InviteEmail.tsx                         # TODO student: React Email template (orgName, inviterName, role, acceptUrl, expiresAt)
  app/
    (protected)/
      dashboard/
        page.tsx                            # provided chapter 055
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
  - RLS: `enableRLS()` + `pgPolicy('audit_logs_no_update', { for: 'update', using: sql\`false\` })` + same for `delete`; the per-org `select` policy reads `current_setting('app.org_id')::uuid` (the lesson 4 of chapter 056 shape).
- **`changeMemberRoleAction`** (`src/lib/invitations/manage.ts`):
  - `authedAction('admin', z.strictObject({ memberId: z.string().uuid(), newRole: z.enum(['admin', 'member']) }), async ({ memberId, newRole }, ctx) => { ... })` — refuses owner targets and last-owner demotion; writes the role change + `'member.role-changed'` audit row in one `tenantDb` transaction.
- **`sendInvitationAction`** (`src/lib/invitations/send.ts`):
  - `authedAction('admin', z.strictObject({ email: z.string().email().toLowerCase(), role: z.enum(['admin', 'member']) }), async ({ email, role }, ctx) => { ... })`. Eight steps: existing-member check → collision check → 32-byte token via `crypto.getRandomValues` → `sha256` hash → DB insert (transaction with `logAudit('invitation.sent')`) → commit → `signedInviteUrl(...)` → `sendEmail({ to: email, react: <InviteEmail .../> })` → `Result.ok({ invitationId })` (or `Result.error('email-send-failed', { invitationId })` if Resend rejects). Catches the partial-unique-index error and translates to `Result.error('already-invited', { existingInvitationId })`.
- **`signedInviteUrl`** (`src/lib/invitations/url.ts`):
  - `signedInviteUrl(invitationId: string, rawToken: string): Promise<string>` — base URL `${env.APP_URL}/accept-invite`, query string `id=${invitationId}&token=${rawToken}&sig=${hmacBase64Url(env.INVITATION_SIGNING_SECRET, invitationId + '.' + rawToken)}`.
  - `verifyInviteSignature(invitationId: string, rawToken: string, sig: string): Promise<boolean>` — constant-time via `crypto.subtle.verify`.
- **`acceptInvitationAction`** (`src/lib/invitations/accept.ts`):
  - Not wrapped in `authedAction` (authz is the invitation, not a role). Re-verifies signature, looks up by `tokenHash`, checks expiry + status, compares `session.user.email` to `invitation.email` (case-insensitive), opens a transaction that calls `auth.api.acceptInvitation({ body: { invitationId }, headers })` (Better Auth handles the `member` insert + `invitation.status='accepted'` update), then `auth.api.setActiveOrganization({ headers, body: { organizationId: invitation.organizationId } })`, then `logAudit(tx, { action: 'invitation.accepted', actorUserId: ctx.user.id, ... })`. Sets `emailVerified: true` if the user signed up through the invite link (named carve-out from lesson 3 of chapter 058). Redirects to `/dashboard`.
- **Env entries** (`.env.example`, new):
  - `INVITATION_SIGNING_SECRET=` (32 bytes base64, generate via `openssl rand -base64 32`)
  - `APP_URL=http://localhost:3000` (carry-in if missing)

### Inspector page spec

A single Server Component at `/inspector` is the verification surface. Provided in full; the student writes only the actions and helpers it exercises.

- **Acting-user switcher header.** A dropdown listing the four seeded users; selecting one writes a dev-only cookie that swaps the acting session (a tiny `switchUserAction` provided in `actions.ts`, gated by `NODE_ENV !== 'production'`). Used to verify RBAC by toggling between the owner/admin/member identities without manual sign-out/sign-in.
- **Active-org banner.** Renders `ctx.orgId`, `ctx.role`, and the org name. An adjacent org switcher (`<OrgSwitcher />` reused from the dashboard) updates the active org and `router.refresh()`es.
- **Members panel.** A table of members for the current active org: name, email, role, joined-at, and a role-change `<Select>` that posts to `changeMemberRoleAction`. The select is rendered for *every* row regardless of acting role on purpose — the role-change lesson's Moment of truth confirms the server-side refusal for the member acting role. A "Remove member" button shows next to the select with the same defense-in-depth posture.
- **Invite panel.** Email input + role dropdown (`admin` or `member` only — `owner` is not a value) calling `sendInvitationAction`. Below: a "Pending invitations" list with email, role, expiry countdown, and "Copy accept URL" (dev-only) plus "Revoke" affordances. The "Copy accept URL" short-circuits opening the local mailbox.
- **Audit-log tail.** The last 20 `auditLogs` rows for the current org, server-rendered, streaming on `router.refresh()` after each action. Each row shows actor, action, subject, payload, createdAt.
- **Raw helpers panel.** Read-only display of `tenantDb(orgId).query.member.findMany({})` and a row count of `auditLogs` for the current org — sanity check that the helper is filtering correctly.

### Concepts demonstrated → owning lesson

- Organizations as the tenancy model; `activeOrganizationId` on the session; create / switch / list flows — lesson 1 of chapter 056.
- `tenantDb(orgId)` wrapping Drizzle so missing the org filter doesn't compile; the named carve-out from Principle #5 — lesson 2 of chapter 056.
- The threshold where RLS earns its weight (highest-stakes data, many code paths) — lesson 3 of chapter 056.
- Postgres RLS through Drizzle (`pgPolicy`, deny-UPDATE/DELETE policies, the `withTenant(orgId, fn)` transaction pattern) — lesson 4 of chapter 056.
- Three-role RBAC (`owner` / `admin` / `member`); `roleAtLeast`; `requireOrgUser` returning `{ user, orgId, role }` — lesson 1 of chapter 057.
- The `authedAction(role, schema, fn)` wrapper at the Server Action boundary; four wrapper steps; the `ctx` payload; the canonical `Result` return — lesson 2 of chapter 057.
- Member management — role-change, remove, leave-org, ownership transfer; single-owner invariant in the helper — lesson 4 of chapter 057.
- `audit_logs` table — append-only by contract, by RLS deny policy, by application discipline; `logAudit(tx, event)` forcing a transaction — lesson 5 of chapter 057.
- The invitation table extensions (`tokenHash`, `acceptedAt`); the pending-state machine; seven-day expiry as a security primitive; the partial unique index on `(orgId, lower(email)) WHERE status='pending'` — lesson 1 of chapter 058.
- The signed accept URL (32-byte token + HMAC); SHA-256 at rest; send-after-commit transaction boundary; `'invitation.sent'` audit event — lesson 2 of chapter 058.
- Four accept arrival shapes; the verify order (signature → row → hash → expiry → status); explicit Accept-button consent gate; auto-`emailVerified` for invite-sourced signups; active-org switch on accept — lesson 3 of chapter 058.
- Catching the partial-unique-index error and translating to `'already-invited'` — lesson 4 of chapter 058.
- Email-mismatch refusal, double-click race against `status='pending'` filter, orphan-invite senior call — lesson 5 of chapter 058.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — chapter 042.
- Web Crypto random + SHA-256 + HMAC verify with constant-time compare — lesson 1 of chapter 016.
- React Email template authoring through the Unit 7 send pipeline — chapter 049.

---

## Lesson 1 — Project Overview

### What we're building

The existing chapter 055 single-user dashboard becomes a multi-tenant SaaS with three roles, an audit trail, and an invitation handshake. By the end the student has organizations on the session, an `authedAction` wrapper that refuses under-privileged callers, an append-only `audit_logs` table the database itself protects, and a signed invite link that carries a stranger from email to a seat in the org.

One figure: a screenshot of the finished inspector page — members panel, role-change buttons, invite form, pending list, and the live audit-log tail — paired with a short animated capture of the invite flow (admin invites → email arrives → invitee clicks → accept screen → dashboard) and the role-refusal toast.

### What we'll practice

- Modeling multi-tenancy: organizations as the tenancy unit, `activeOrganizationId` on the session, and a `requireOrgUser` helper that returns `{ user, orgId, role }` from the validated session.
- Making the two highest-frequency multi-tenancy bugs structurally impossible: the missing org filter (via `tenantDb`) and the missing role check (via `authedAction`).
- Treating an audit trail as compliance data: append-only by application discipline *and* by a Postgres RLS deny policy, written in the same transaction as the work it records.
- Designing a capability-bearing URL: a 32-byte token plus an HMAC signature, hashed at rest, sent only after the transaction commits.
- Reading server-side authorization as the load-bearing defense — the inspector renders privileged controls to every role on purpose, so the refusal is observable.

### Architecture

- **Session layer.** Better Auth's organization plugin owns `organization` / `member` / `invitation`; the student adds `activeOrganizationId` to `session` and `tokenHash` / `acceptedAt` to `invitation`. A `session.create` hook seeds the initial active org.
- **Access layer.** `requireOrgUser()` resolves the acting `{ user, orgId, role }`. `tenantDb(orgId)` is the only scoped data facade; `authedAction(role, schema, fn)` is the only privileged Server Action shape. Both compose the org predicate so omitting it doesn't compile.
- **Audit layer.** `auditLogs` carries RLS policies: per-org SELECT/INSERT keyed on `current_setting('app.org_id')`, and deny-everything UPDATE/DELETE. `withTenant(orgId, fn)` opens the transaction that sets the session variable; `logAudit(tx, event)` writes one row and refuses to run outside a transaction.
- **Invitation layer.** `signedInviteUrl` / `verifyInviteSignature` bracket the capability URL; `sendInvitationAction` writes the row and audit event then emails after commit; the `/accept-invite` Server Component branches on session and email across four arrival shapes; `acceptInvitationAction` joins, switches active org, and audits in one transaction.
- **Verification surface.** A provided `/inspector` Server Component and its seed (2 orgs, 4 mixed-role users, 1 pending invite) exercise every helper and action; a dev-only acting-user switcher toggles identities without sign-out.

### Starting file tree

See the **Starter file tree** under Chapter framing for the full annotated layout. The TODO-marked files are the highlighted focus — the rest is provided chapter 055 / chapter 050 carry-in. The student fills, in order across the build lessons:

- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth/roles.ts`, `src/lib/auth-helpers.ts` — the organization plugin, the active-org hook, and `requireOrgUser`.
- `src/db/schema/audit.ts`, `src/lib/audit-log.ts`, `src/lib/tenant-db.ts` (the `withTenant` shape) — the audit table and its transaction-required writer.
- `src/lib/tenant-db.ts` (the `tenantDb` facade), `src/lib/authed-action.ts`, `src/lib/invitations/manage.ts` — the scoped data layer, the wrapper, and the role-change action.
- `src/lib/invitations/url.ts`, `src/lib/invitations/send.ts`, `src/emails/InviteEmail.tsx` — the signed URL, the send action, the email template.
- `src/app/(auth)/accept-invite/page.tsx`, `src/lib/invitations/accept.ts` — the accept page and action.

The Better Auth CLI is the canonical way to add the plugin-owned columns: `pnpm auth:generate` regenerates `src/db/schema/auth.ts` after the organization plugin lands, and the student commits the diff. Hand-editing `auth.ts` after `auth:generate` is review-loud — re-run the CLI when the plugin config changes. The inspector's "switch acting user" cookie is dev-only (`NODE_ENV !== 'production'`); the same affordance in production would be a privilege-escalation vector.

### Roadmap

- **Lesson 2 — Organization plugin and the active-org session.** Installs the organization plugin, seeds `activeOrganizationId` on session create, and ships `roleAtLeast` plus `requireOrgUser` so the inspector renders the active-org banner.
- **Lesson 3 — Append-only audit_logs with RLS.** Lays down the `auditLogs` table with deny-UPDATE/DELETE policies and the transaction-required `logAudit(tx, event)` writer behind `withTenant`.
- **Lesson 4 — Scoped data, the action wrapper, and role changes.** Builds the `tenantDb(orgId)` facade and the `authedAction(role, schema, fn)` wrapper, then ships the `changeMemberRoleAction` that refuses owner targets and last-owner demotion and audits in-transaction.
- **Lesson 5 — Send an invitation with a signed accept URL.** Generates the token, hashes at rest, HMAC-signs the URL, writes the row plus audit event in one transaction, and sends the React Email after commit.
- **Lesson 6 — Accept the invitation across four arrival shapes.** Ships the `/accept-invite` Server Component and `acceptInvitationAction` that join, switch active org, auto-verify email, and audit inside one transaction.

### Setup

Command sequence:

1. `npx degit <starter-repo> chapter-059 && cd chapter-059`
2. `pnpm install`
3. `docker compose up -d` (starts `postgres:18`)
4. `cp .env.example .env.local`, then fill the env entries below
5. `pnpm db:migrate && pnpm db:seed`
6. `pnpm dev`

Env entries (`.env.local`):

- `DATABASE_URL` — Postgres connection string; the local value targets the docker-compose Postgres (provided in `.env.example`).
- `RESEND_API_KEY` — Resend API key for the invite email; obtain from the Resend dashboard (carry-in from chapter 050).
- `EMAIL_FROM` — the verified-domain sender address from chapter 050. The verified domain is a hard prerequisite for the accept-the-invite verification — Resend's sandbox sender will not deliver to the student's personal inbox.
- `BETTER_AUTH_SECRET` — the chapter 055 auth secret; generate via `openssl rand -base64 32` if not carried in.
- `INVITATION_SIGNING_SECRET` — 32-byte HMAC key for signing accept URLs, distinct from `BETTER_AUTH_SECRET` (different rotation cadence, different blast radius); generate via `openssl rand -base64 32`.
- `APP_URL` — `http://localhost:3000`; the base for the signed accept URL.

Expected result: `pnpm dev` serves the chapter 055 sign-up / sign-in / sign-out / `/dashboard` flow. `/inspector` throws until `requireOrgUser` exists — that is the starting state lesson 2 resolves. No org schema and no scoped data layer exist yet.

---

## Lesson 2 — Organization plugin and the active-org session

The student installs Better Auth's organization plugin, seeds the active org on session creation, and ships the role helpers and `requireOrgUser` so the inspector resolves the acting identity.

Finished result: `/inspector` no longer throws — the active-org banner renders the acting user's org name and role, the acting-user switcher swaps identities, and the org switcher re-renders the banner against the new org.

### Your mission

Better Auth's organization plugin is the canonical source for the `organization`, `member`, and `invitation` tables — you don't hand-write them. Add the plugin to the `betterAuth({ plugins })` array with teams disabled, a seven-day invitation expiry named as a constant, and `schema.invitation.additionalFields` for the `tokenHash` and `acceptedAt` columns this project layers on; register the matching `organizationClient()` in the client. The active org is part of the session, so a `databaseHooks.session.create.before` hook is the *one* structural place to seed `activeOrganizationId` — every entry point that mints a session (sign-in, sign-up, OAuth callback) flows through it, so don't sprinkle the setter across them. After the plugin config is set, the Better Auth CLI regenerates the auth schema; run it and commit the diff rather than editing the generated file by hand. The `requireOrgUser` helper reads the role from the membership row in the database, not from the session cookie cache — the cache can carry a stale role for up to the `freshAge` window (lesson 3 of chapter 052), and reading the row is the senior reflex for role-change correctness within seconds. The cached `activeOrganizationId` is fine because `setActive` rewrites the cookie immediately, but never trust an active-org id arriving from a query string or route param — the only acceptable source is the server-validated session. The create-org onboarding path is provided and exercised by the plugin's call shape; you verify it, you don't re-implement it.

- The `organization`, `member`, and `invitation` tables exist in the migrated schema, and `session` carries an `activeOrganizationId` column, after the regenerated auth schema is committed and migrated.
- A newly created session has its `activeOrganizationId` populated to the user's most-recent active org (or first membership), confirmed for the four seeded users.
- `roleAtLeast` orders the three roles correctly: a member does not satisfy `admin`, an admin satisfies `admin` but not `owner`, an owner satisfies all three.
- `requireOrgUser()` returns `{ user, orgId, role }` for a member of the active org, redirects to `/onboarding/create-org` when no active org is set, and redirects there again when the user has no membership row for that org.
- The inspector's active-org banner renders the acting user's org name and role; switching acting users via the dev cookie re-renders the banner with the new identity.
- Switching the active org via the org switcher refreshes the layout and the banner shows the new org.
- A fresh signup with no orgs lands on `/onboarding/create-org`; submitting creates the org and redirects to `/dashboard` with the new org active.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: the `organization()` plugin config, `organizationClient()`, `pickInitialActiveOrg(userId)`, the `session.create.before` hook, `src/lib/auth/roles.ts` (`Role`, `ROLE_RANK`, `roleAtLeast`), and the extended `requireOrgUser` in `src/lib/auth-helpers.ts` (see the signatures under Chapter framing). Cover the CLI-regenerate-then-commit workflow, the reason the active-org hook is the single setter, and the role-from-DB-not-cookie decision. Link to lesson 1 of chapter 056 (organizations / active org) and lesson 1 of chapter 057 (RBAC, `roleAtLeast`, `requireOrgUser`) rather than re-explaining; link to lesson 3 of chapter 052 for the cookie-cache freshness window.

### Moment of truth

Run the lesson's test suite (`pnpm test`) and confirm it passes; the suite asserts the role ordering of `roleAtLeast` and the redirect/return behavior of `requireOrgUser` across the active-org-present, no-active-org, and no-membership cases.

Confirm by hand, ticking each off:

- After `pnpm db:migrate`, Drizzle Studio shows the `organization`, `member`, `invitation` tables and the `session.activeOrganizationId` column.
- `/inspector` renders the active-org banner with Alice's role; the four seeded users appear in the acting-user switcher.
- Switching acting users re-renders the banner with the new identity; switching orgs refreshes the layout and shows the new org.
- A fresh signup with no orgs lands on `/onboarding/create-org`, and submitting it redirects to `/dashboard` with the new org active.

The members panel, role-change buttons, and audit tail still throw because `tenantDb`, `authedAction`, and `logAudit` don't exist yet.

---

## Lesson 3 — Append-only audit_logs with RLS

The student lays down the `auditLogs` table with deny-write RLS policies and the transaction-required `logAudit(tx, event)` writer, so the database itself guarantees the audit trail can only grow.

Finished result: as the app role in `psql`, an audit insert succeeds inside a tenant-scoped transaction and fails outside one; UPDATE and DELETE both return `permission denied`. The inspector's raw-helpers panel shows an `auditLogs` count of 0 for the current org.

### Your mission

The audit log is compliance data, so it gets a defense the application layer can't supply on its own. Define the `auditLogs` table — the full column set, the `inet` type for `actorIp`, the `jsonb` type for `payload`, and the two composite indexes that serve the per-org and per-actor reads — then enable RLS and declare four `pgPolicy` rules: per-org SELECT and INSERT keyed on `current_setting('app.org_id', true)::uuid`, and deny-everything UPDATE and DELETE. The `true` argument on `current_setting` matters: a missing setting returns NULL rather than throwing, so the policy naturally evaluates false and refuses instead of surfacing a 500. The deny-UPDATE/DELETE policies are the *structural* layer — the application discipline of never issuing those statements plus the DB grants are real, but the policies are load-bearing because they don't depend on developer attention. The session variable is set per transaction with `SET LOCAL`, never `SET`: with pooled connections, session-level `SET` persists across requests on the same connection and silently leaks `app.org_id` across tenants. That is why `withTenant(orgId, fn)` opens a transaction and runs `SET LOCAL app.org_id = ...::uuid` before the work — every audit read and write flows through it. The `logAudit(tx, event)` signature requires a transaction handle with no overload that accepts the raw `db`, because auditing happens inside the transaction that does the work, never as a fire-and-forget call. Migrations and the future retention job run as the owner role, which bypasses RLS by Postgres default; the application request handler runs as `authenticated` — the retention job is a named year-two reach, not built here.

- The `auditLogs` table exists in the migrated schema with its full column set and both composite indexes.
- As the app role inside a transaction that has `SET LOCAL app.org_id`, an `INSERT INTO audit_logs (...)` succeeds.
- The same insert outside a transaction, with `app.org_id` unset, fails.
- `UPDATE audit_logs SET action = 'x'` returns `permission denied` for the app role.
- `DELETE FROM audit_logs WHERE id = ...` returns `permission denied` for the app role.
- A `SELECT` with `app.org_id` unset returns 0 rows rather than erroring — the NULL setting refuses the read.
- `logAudit(tx, event)` inserts exactly one row and does not typecheck when called with the unwrapped `db` instead of a transaction handle.
- The inspector's raw-helpers panel shows the `auditLogs` row count as 0 for the current org.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: `src/db/schema/audit.ts` (columns, indexes, `enableRLS()`, the four `pgPolicy` declarations — see the signatures under Chapter framing), the `withTenant(orgId, fn)` shape in `src/lib/tenant-db.ts`, and `logAudit(tx, event)` in `src/lib/audit-log.ts`. Cover why `SET LOCAL` rather than `SET`, why the policies (not the app discipline) are the structural defense, the owner-role RLS bypass for migrations and the retention job, and the `current_setting(..., true)` NULL-on-missing behavior. Link to lesson 4 of chapter 056 for the `pgPolicy` / `withTenant` pattern and lesson 5 of chapter 057 for the transaction-required `logAudit` discipline rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test`) and confirm it passes; the suite asserts that `logAudit` inserts one row inside a transaction and that the deny-UPDATE/DELETE behavior holds.

Confirm by hand, ticking each off (open `psql` as the app role — credentials in the starter's docker-compose env):

- Inside `BEGIN; SET LOCAL app.org_id = '<acme-uuid>'; ...; COMMIT;`, an `INSERT INTO audit_logs (...)` succeeds.
- The same insert with `app.org_id` unset fails.
- `UPDATE audit_logs SET action = 'x' WHERE id = ...` returns `permission denied`.
- `DELETE FROM audit_logs WHERE id = ...` returns `permission denied`.
- A `SELECT * FROM audit_logs LIMIT 1` with `app.org_id` unset returns 0 rows.
- The inspector's raw-helpers panel shows `auditLogs` count 0 for the current org.

No action writes to the table yet — that arrives with the role-change action in lesson 4.

---

## Lesson 4 — Scoped data, the action wrapper, and role changes

The student builds the `tenantDb(orgId)` facade and the four-step `authedAction(role, schema, fn)` wrapper, then ships the `changeMemberRoleAction` that exercises both: it refuses owner targets and last-owner demotion and writes the audit row in the same transaction as the role change.

Finished result: in the inspector, the admin acting user changes a member's role and the audit tail shows the `'member.role-changed'` row with the correct actor and payload; the member acting user gets a `forbidden` toast with no DB change and no audit row; demoting the last owner surfaces `last-owner`.

### Your mission

This lesson installs the two helpers that make the highest-frequency multi-tenancy bugs impossible at the call sites that compile, and proves them through the first real privileged action. The `tenantDb(orgId)` facade is the only scoped data path: its `.query.<table>` reads compose `and(eq(<table>.organizationId, orgId), userWhere)`, its `.insert` injects `organizationId`, its `.update` / `.delete` always `and`-in the org predicate, and its `.transaction(fn)` opens `withTenant(orgId, fn)` so the RLS session variable is set for the audit write. A `TENANT_TABLES` type-level set drives which tables the facade exposes — reaching for `tenantDb(orgId).query.user` is a type error because `user` is global. The `authedAction(role, schema, fn)` factory is the *only* call shape for a privileged action: its four steps are `requireOrgUser()` → `roleAtLeast(ctx.role, required)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`, and the `ctx` it hands the body already carries `db: tenantDb(orgId)` plus `ip` and `userAgent` read from `headers()`. Forbidden and invalid-input return the canonical `Result.error` discriminants — never a throw, because a throw 500s the action and loses the typed contract the form's `useActionState` reducer renders. Don't reproduce the wrapper's checks inline in an action body and call it equivalent: the import shape is what review catches. Inside `changeMemberRoleAction`, do the read, the invariant checks (`not-a-member`, `cannot-change-owner-role`, `last-owner` from a count inside the transaction), the update, and the `logAudit` call in *one* `ctx.db.transaction` — if the audit insert fails, the role change rolls back, because a role that changed with no record is exactly the wrong direction for a compliance table. The `forbidden` and `invalid-input` messages are user-safe; the detail (which role was required, what the parse errors were) is logged at the wrapper seam for operators, not surfaced to the user — the user/operator split is the chapter 080 discipline foreshadowed. The unwrapped `db` import is the cross-tenant escape hatch reserved for `scripts/`; the action body never reaches for it.

- A `tenantDb(orgId)` read returns only rows for that org, and composing a caller `where` still narrows within the org.
- A `tenantDb(orgId)` insert persists the row with `organizationId` set to that org even when the caller omits it, and rejects a mismatched `organizationId`.
- `tenantDb(orgId).query.user` is a type error — global tables are not reachable through the facade.
- An `authedAction` whose `role` exceeds the caller's role returns `Result.error('forbidden')` with a user-safe message and never throws.
- An `authedAction` with input that fails the schema returns `Result.error` with field errors and never reaches the action body.
- As the admin acting user, changing a member's role updates the row and appends one `'member.role-changed'` audit row with `payload: { previousRole, newRole }` and `actorUserId` matching the admin.
- As the member acting user, a role-change attempt returns `forbidden` with the role row unchanged and no audit row added.
- Targeting an owner returns `cannot-change-owner-role`; demoting the sole owner returns `last-owner`; neither changes the DB.
- The audit row and the role update land together or not at all — force-failing the update lands neither.
- The inspector's `auditLogs` count increments only on successful role changes, never on rejected attempts.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: the `tenantDb(orgId)` facade in `src/lib/tenant-db.ts`, the `authedAction(role, schema, fn)` factory in `src/lib/authed-action.ts`, and `changeMemberRoleAction` in `src/lib/invitations/manage.ts` (see the signatures under Chapter framing). Cover why the wrapper is the only privileged-action shape (import-shape review), why `ctx.db` is the scoped facade rather than the raw `db`, why the audit write shares the action's transaction, why forbidden returns a `Result` instead of throwing, and the user/operator message split. Link to lesson 2 of chapter 056 (`tenantDb`), lesson 2 of chapter 057 (the wrapper and `ctx`), and lesson 4 of chapter 057 (the single-owner invariant) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test`) and confirm it passes; the suite asserts org scoping on `tenantDb` reads/inserts, the `forbidden` and validation `Result` shapes from the wrapper, and the in-transaction audit write on a successful role change.

Confirm by hand, ticking each off:

- As the admin acting user (Bob), change Carol's role to `admin`: the row updates and the audit tail shows `'member.role-changed'` with the right payload and actor.
- As the member acting user (Carol), try to change Bob's role: a `forbidden` toast renders, with no DB change and no audit row.
- As the admin, try to demote the owner (Alice): a `cannot-change-owner-role` toast renders.
- Try to change Alice's own role so it would leave zero owners: a `last-owner` toast renders.
- The raw-helpers panel's `auditLogs` count increments only after the successful change, not after the rejected attempts.

The invite flow still doesn't exist — `/accept-invite` 404s and the invite form throws.

---

## Lesson 5 — Send an invitation with a signed accept URL

The student generates a 32-byte token, hashes it at rest, HMAC-signs the accept URL, writes the invitation row plus the `invitation.sent` audit event in one transaction, sends the React Email after commit, and translates a duplicate-pending invite into an `already-invited` result.

Finished result: in the inspector, the admin submits the invite form and the pending-invites list and audit tail update; the React Email arrives in the student's inbox with an accept-URL button; in Postgres the `tokenHash` is a 64-character hex string and the raw token appears nowhere.

### Your mission

The accept URL is a capability — possession of it is the authorization to join — so it has to be unguessable, tamper-evident, and useless once read from the database. Generate 32 random bytes with `crypto.getRandomValues`, base64url-encode them as the raw token, and store only `sha256(token)`: a database read alone can't forge a valid link. Sign the URL with an HMAC over `invitationId + '.' + rawToken` using `INVITATION_SIGNING_SECRET` — a secret distinct from `BETTER_AUTH_SECRET`, because reusing one key across two cryptographic uses tangles rotation; import the key once at module load and reuse it for both `sign` and the accept path's constant-time `verify`. The plugin owns the `invitation` row, so call `auth.api.createInvitation(...)` inside the transaction and then `tx.update` the additional `tokenHash` column — don't hand-write the INSERT. Write the `'invitation.sent'` audit row in that same transaction, then commit. The email send sits *outside* the transaction on purpose: if Resend is down, the row exists and the inspector surfaces a resend affordance, whereas emailing inside the transaction risks an orphan email on rollback — the worse failure mode. The dedup keys on the partial unique index over `(organizationId, lower(email)) WHERE status='pending'`, so lowercasing the email belongs in the Zod schema (not a runtime call in the body) to match the index; catch the `23505` violation and translate it to `already-invited`, re-querying inside the catch for the existing id. The raw token must never reach the database or the logs — the logger redacts `token` and `sig` query params globally, the Sentry-breadcrumb-redaction discipline. Surfacing the invite URL in the inspector is dev-only; in production that URL is a credential the inviter shouldn't retain after send.

- Submitting the invite form as an admin creates an `invitation` row with `status='pending'` and the chosen role, and the pending-invites list shows it.
- The `tokenHash` column holds a 64-character hex string, and the raw token does not appear in any column of any table.
- The React Email arrives in the student's real inbox with the org name, inviter name, role, and a CTA button whose href is `/accept-invite?id=...&token=...&sig=...`.
- A successful send appends an `'invitation.sent'` audit row in the same transaction as the invitation insert.
- A second invite to the same email returns `Result.error('already-invited', { existingInvitationId })` from the partial-unique-index catch.
- Inviting an email that already belongs to a member of the org returns `Result.error('already-member')`.
- When Resend rejects the send, the action returns `Result.error('email-send-failed', { invitationId })` and the row still exists.
- Clicking the emailed URL reaches a 404 (the accept page arrives in lesson 6), confirming the URL is well-formed.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: `signedInviteUrl` / `verifyInviteSignature` in `src/lib/invitations/url.ts`, `InviteEmail.tsx` (mirroring `WelcomeVerification.tsx`), and the eight-step `sendInvitationAction` in `src/lib/invitations/send.ts` (see the signatures under Chapter framing). Cover the send-after-commit boundary, the distinct signing secret, the hash-at-rest rationale, the schema-level lowercasing tied to the partial index, the `auth.api.createInvitation`-then-`tx.update` split, and the global redaction of `token` / `sig`. Link to lesson 1 of chapter 016 (Web Crypto random / SHA-256 / HMAC), lesson 2 of chapter 058 (signed URL, send-after-commit), lesson 4 of chapter 058 (the `already-invited` translation), and chapter 049 (React Email authoring) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test`) and confirm it passes; the suite asserts the row + audit write happen together, the `tokenHash` shape, the `already-invited` and `already-member` results, and that the raw token is absent from the persisted row.

Confirm by hand, ticking each off:

- As admin, submit the invite form with the student's real email and role `member`: the pending-invites list updates and the audit tail shows `'invitation.sent'`.
- The inbox receives the React Email with the CTA button pointing at `/accept-invite?id=...&token=...&sig=...`.
- In Postgres, `tokenHash` is a 64-character hex string and the raw token appears in no column.
- Clicking the link reaches a 404 (the accept page is lesson 6).
- Inviting the same email again surfaces `already-invited`.

The full send path is exercised, but the human can't accept yet — that is lesson 6.

---

## Lesson 6 — Accept the invitation across four arrival shapes

The student builds the `/accept-invite` Server Component that verifies signature → row → hash → expiry → status and branches on session and email, plus the `acceptInvitationAction` that joins the org, switches the active org, auto-verifies the invited email, and audits inside one transaction.

Finished result: opening the emailed URL in a private window renders the right arrival shape; signing up via the prefilled form and clicking Accept lands on `/dashboard` with the invited org active; the inspector shows the new member with the invited role, an `'invitation.accepted'` audit row, and `user.emailVerified` true.

### Your mission

Accepting an invite is the moment a stranger becomes a member, so the page reads the capability URL defensively and the action re-checks everything before it writes. The verify order on the Server Component is signature → row → hash → expiry → status, and the first three failures render the *same* generic refusal — never tell the public whether a link was missing, tampered, or hash-mismatched, because the recovery path is identical (ask for a new invite). On a valid pending invite, branch on session and email across four arrival shapes: signed in with the matching email renders the Accept button; signed in with a different email renders the mismatch refusal naming the invited address; signed out with an existing account renders a prefilled sign-in that returns to the URL; signed out with no account renders a prefilled sign-up that returns to the URL. The page's verification is for the UI branch only — form submissions are separate requests, so `acceptInvitationAction` re-fetches and re-hashes and does its own session and email check; the signature isn't part of the action input. This action is *not* wrapped in `authedAction` because the invitation itself is the authorization, not a role. Inside one `withTenant(invitation.organizationId, ...)` transaction, call `auth.api.acceptInvitation(...)` (the plugin inserts the `member` row and flips `status='accepted'`), `tx.update` the `acceptedAt` additional field, `auth.api.setActiveOrganization(...)` so the post-redirect lands in the joined org rather than the user's previous active org, and `logAudit` the `'invitation.accepted'` event. If the user just signed up through this flow, set `emailVerified = true` — receiving the click on the invited email is itself the verification, and without this carve-out the user hits a verify-your-email loop right after confirming it (the lesson 3 of chapter 058 reflex). Auto-accepting on GET would let URL-scanning crawlers and corporate URL-rewriters silently consume the invite, so the explicit Accept button is the consent gate. Email comparison is case-insensitive on both sides — the invitation email is lowercased at write time, the session email at compare time. Better Auth's accept call requires an authenticated session, so the signed-out shapes must complete sign-up first (which seeds the session) before the accept runs — the branch routing enforces this structurally, and the double-click race resolves because the accept call filters on `status='pending'`.

- Opening a valid pending URL while signed in with the matching email renders the Accept button alongside the org name, inviter name, and role.
- A mangled `sig` renders the generic refusal with no DB lookup; a missing row and a hash mismatch render the same generic refusal.
- An expired invite renders the "ask for a new one" screen; an already-accepted URL renders the friendly "already a member" screen.
- Signed in with a different email renders the mismatch refusal naming the invited address.
- Signed out with no account renders a prefilled sign-up that, on success, returns to the accept URL and then renders the Accept button.
- Clicking Accept writes a `member` row with the invited role, flips `invitation.status` to `'accepted'`, sets `invitation.acceptedAt`, and appends an `'invitation.accepted'` audit row — all in one transaction.
- After accepting, `session.activeOrganizationId` is the invited org and the redirect lands on `/dashboard` in that org.
- A user who signed up through the invite flow has `user.emailVerified` true even though no separate verification email was sent.
- Two simultaneous Accept clicks resolve to one success and one "already a member" branch.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: the `/accept-invite` Server Component at `src/app/(auth)/accept-invite/page.tsx` (the verify order and the four-branch routing) and `acceptInvitationAction` in `src/lib/invitations/accept.ts` (see the signatures under Chapter framing). Cover why the first three failures share one refusal, why the action re-verifies independently of the page, why the active-org switch sits inside the transaction, the auto-`emailVerified` carve-out, the explicit-Accept consent gate, and why the signed-out shapes must complete sign-up before the accept call. Link to lesson 3 of chapter 058 (arrival shapes, verify order, consent gate, auto-verify) and lesson 5 of chapter 058 (email-mismatch refusal, double-click race) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test`) and confirm it passes; the suite asserts the verify-order refusals, the four-branch routing, and the in-transaction member-join + active-org switch + audit write on accept. The accept-across-email-sessions check needs the student's verified domain from chapter 050 — the sandbox sender will not deliver to the personal inbox.

Confirm by hand, ticking each off (continuing from lesson 5's invite):

- Open the emailed URL in a private window: branch (D) renders the prefilled sign-up. Sign up; auto-redirect to the accept URL; branch (A) renders the Accept button.
- Click Accept: redirected to `/dashboard` with the invited org active. In the inspector, the new member row exists with the right role, the audit tail shows `'invitation.accepted'`, and `user.emailVerified` is true.
- Flip one character of the `sig` query param: the generic refusal renders.
- Force expire via the inspector's debug control: the expired screen renders. Re-click an already-accepted URL: the "already a member" screen renders.
- Sign in as Carol (a different email) and open the URL: the email-mismatch refusal renders.
- Open the accept URL in two tabs and click Accept simultaneously: one wins, the other gets the "already a member" branch.

With this lesson the full invite handshake works end-to-end across all four arrival shapes, and every Project goal under Chapter framing is satisfied. The forward references hold: chapter 062 layers `active()` / `archived()` lifecycle methods onto the `tenantDb` shape, chapter 071 dispatches notifications on `invitation.sent` / `member.role-changed`, chapter 074 rate-limits `sendInvitationAction`, and chapter 081 hardens the audit + retention story.
