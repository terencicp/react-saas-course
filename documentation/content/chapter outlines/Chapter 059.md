# Chapter 059 — Project: org, RBAC, and invitations end-to-end

## Chapter framing

Chapter 059 cashes in everything Unit 9 installed. The student arrives from chapter 055 with a working email+password auth flow against Better Auth and a `user` / `session` / `account` / `verification` schema, and from chapter 050 with a `sendEmail` wrapper, a verified domain, the `email_suppressions` read, and the React Email scaffolding. Chapter 056 taught the organization data model and the `tenantDb(orgId)` helper. Chapter 057 taught the three-role RBAC default, the `authedAction(role, schema, fn)` wrapper, the member-management invariants, and the append-only `audit_logs` table. Chapter 058 taught the invitation handshake — signed accept link, four arrival shapes, the management surface. This project compresses all of it into one runnable build: install the organization plugin, add the active-org slot to the session, lay down `audit_logs` and the `invitations` extensions, build the `tenantDb` + `authedAction` pair, ship the role-change action with audit writes, and ship the invite send + accept flow with audit writes.

Threads that run through every lesson. The organization plugin owns the canonical table names (`organization`, `member`, `invitation`); the student adds `tokenHash` and `acceptedAt` to `invitation` via `additionalFields` and adds `activeOrganizationId` to `session`. Every read on a tenant-owned table goes through `tenantDb(orgId)` — hand-typed `db.query`/`db.insert` against tenant tables is a code-review red flag. Every privileged Server Action ships as `authedAction(role, schema, fn)` — the wrapper is the only call shape that compiles for a privileged write. The `audit_logs` table is append-only by application discipline plus an RLS deny policy on UPDATE / DELETE (the only RLS-protected table in this project — application-layer scoping holds elsewhere per the lesson 3 of chapter 056 senior call). Every privileged mutation writes the audit row in the same transaction as the work, through `logAudit(tx, event)` whose signature forces a `tx` argument so off-transaction calls don't typecheck; that transaction is always `withTenant(orgId, ...)` (not `ctx.db.transaction`), because only `withTenant` runs `set_config('app.org_id', ...)` and the `audit_logs` RLS policy requires it for the INSERT. (The lone exception is `acceptInvitation`, which inserts its audit row directly through `tx` rather than via `logAudit`, because the accepting user is not yet a member and `logAudit`'s `requireOrgUser` derivation would resolve to nothing — see lesson 6.) The accept-invite URL carries a 32-byte random token plus an HMAC signature; the database stores only `sha256(token)`. The email send happens *after* the DB transaction commits; deferred-resend is the recovery affordance, not a background queue. Each Implementation lesson ends on a runnable state the student confirms in the inspector.

### Project goals

The project is done when:

- Three seeded users belong to Acme with different roles, surfaced in the inspector members panel (owner Alice, admin Bob, member Carol); Dave owns Globex; the acting-user switcher offers all four seeded users.
- `authedAction('admin', ...)` rejects the member acting user with a typed `forbidden` error: the `member.role` row is unchanged and no audit row is added.
- `authedAction('admin', ...)` accepts the admin acting user: the role row updates and an `'member.role-changed'` audit row appears in the tail whose `actorUserId` matches the admin's id.
- An audit-log entry is written for every role change — `payload: { before, after }` (the previous and new role) — and it is written in the same transaction as the role update (force-failing the update lands neither the row update nor the audit row).
- The inspector renders the role-change `<Select>` for every member row on purpose: as the member acting user it is still rendered, so the server-side refusal — not a client-side hide — is what's load-bearing.
- An invite email arrives: the React Email template lands in the student's real inbox with the orgName, inviterName, role, and accept-URL button; the `invitation` row exists with `status='pending'`; `tokenHash` is a 64-character hex string; the raw token does not appear in any DB column.
- Accepting the invite across email sessions adds the new member with the invited role: the accept page renders the Accept button, signing up via the prefilled form and accepting writes a `member` row, `invitation.status` flips to `'accepted'`, `invitation.acceptedAt` is set, and `session.activeOrganizationId` is the invited org.
- The `audit_logs` table refuses UPDATE / DELETE from the `authenticated` app role: `UPDATE audit_logs SET action = 'x'` and `DELETE FROM audit_logs WHERE id = ...` both match zero rows (`UPDATE 0` / `DELETE 0`) because the `using: sql\`false\`` deny policies let no row qualify; the RLS policies are the structural defense.
- Tenant isolation holds on `audit_logs`: a read of another org's rows with `app.org_id` unset returns 0 rows because `current_setting('app.org_id', true)` is NULL and the org-isolation policy fails closed.

### Scope cuts

- No leave-org or ownership-transfer actions in this project (lesson 4 of chapter 057 owns the full set; the role-change action is the load-bearing one here).
- No fine-grained permissions; no SCIM / IdP provisioning; no bulk invitations; no team layer inside an org.
- No rate-limiting on invite send (chapter 074); no seat-counting / entitlement gate (chapter 064).
- RLS is wired *only* on `audit_logs` per the lesson 3 of chapter 056 senior call — application-layer scoping via `tenantDb` holds everywhere else.

### Dependency carry-in

- **From chapter 055 (auth flow):** `src/lib/auth.ts` with the `betterAuth(...)` instance including `nextCookies()` and `emailAndPassword` with `requireEmailVerification`, plus `getCurrentUser()` / `requireUser()` exported from the same module (there is no separate `auth-helpers.ts`); `src/lib/auth-client.ts` exporting `authClient`; the catch-all handler at `src/app/api/auth/[...all]/route.ts`; `src/proxy.ts` with the cookie-presence gate and `?next=` round-trip (`safeNext` in `src/lib/redirects.ts`); the `(auth)` and `(protected)` route groups; the Drizzle-managed `user` / `session` / `account` / `verification` tables in `src/db/schema/auth.ts`; the `src/emails/welcome-verification.tsx` React Email template.
- **From chapter 050 (email send):** `src/lib/email.ts` exposing `sendEmail({ to, subject, react, idempotencyKey, replyTo?, bypassSuppression? })` returning `Result<{ id: string }>` (with `idempotencyKey` required per the chapter 050 convention); the `email_suppressions` read via `isSuppressed` in `src/lib/suppressions.ts`; `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_REPLY_TO` env entries; the verified domain; the `src/emails/welcome-verification.tsx` template plus the `EmailLayout` wrapper as the React Email pattern reference.
- **From 6.x (Drizzle):** `src/db/index.ts` (exporting `db`, `dbUnpooled`, and the `Transaction` type), the migration pipeline (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`), `drizzle.config.ts` pointing at the three-file schema array, Drizzle's relational query API + `drizzle-zod`.
- **From chapter 043 / chapter 044:** `<form action={serverAction}>`, `useActionState`, the canonical `Result<T>` discriminant shape, Zod parse at the action boundary, the `redirect()` after success.
- **From lesson 1 of chapter 016:** Web Crypto primitives — `crypto.randomUUID`, `crypto.getRandomValues`, `crypto.subtle` for SHA-256 and HMAC; the constant-time compare reflex (via `crypto.subtle.verify`).
- **From chapter 033 / chapter 034:** `'use server'` / `'use client'` boundary, Server Components reading `searchParams` async.
- **Forward into chapter 062:** the `tenantDb(orgId)` and `authedAction(role, schema, fn)` shapes shipped here are the exact ones chapter 062 layers `active()` / `archived()` lifecycle methods onto.

### Starter file tree (stubs marked with TODO)

Paths below are relative to the project root. The student fills the `TODO` stubs; everything else is provided carry-in. The start and solution file trees are identical — every difference is a stub body, never a missing or extra file.

```
.env.example                                # provided: prior entries + INVITATION_SIGNING_SECRET
docker-compose.yml                          # provided: local Postgres
drizzle.config.ts                           # provided: three-file schema array, snake_case
package.json                                # provided: db:generate, db:migrate, db:seed, auth:generate, dev, build, verify, test:lesson
src/
  env.ts                                    # provided: t3-oss/env-nextjs boundary; TODO student (L5): add INVITATION_SIGNING_SECRET to the server block
  proxy.ts                                  # provided from chapter 055
  lib/
    auth.ts                                 # provided: chapter 055 instance + getCurrentUser/requireUser; TODO student: add organization() plugin (additionalFields + databaseHooks.session.create) and complete requireOrgUser
    auth-client.ts                          # provided: chapter 055 client with organizationClient() registered
    auth-schema.config.ts                   # provided: CLI-only mirror of auth.ts (server-only-free); add organization() so auth:generate emits the plugin tables
    email.ts                                # provided from chapter 050
    suppressions.ts                         # provided from chapter 050
    redirects.ts                            # provided: safeNext open-redirect guard
    result.ts                               # provided: Result<T>, ok/err, isUniqueViolation
    auth/
      roles.ts                              # TODO student (L2): ROLE_RANK, roleAtLeast (Role type provided)
      authed-action.ts                      # TODO student (L4): authedAction(role, schema, fn) wrapper
      error-mapping.ts                      # provided: mapAuthError
    invitations/
      url.ts                                # TODO student (L5): generateInviteToken, signedInviteUrl, verifyInviteSignature, sha256
      send.ts                               # TODO student (L5): sendInvitation action
      accept.ts                             # TODO student (L6): acceptInvitation action
      manage.ts                             # TODO student (L4): changeMemberRole action
  db/
    index.ts                                # provided: drizzle client; TODO student (L3): spread auditSchema into the client
    columns.ts                              # provided: shared `timestamps` group
    schema.ts                               # provided: emailSuppressions
    audit.ts                                # TODO student (L3): auditLogs table + RLS policies (org-isolation + deny UPDATE/DELETE)
    audit-log.ts                            # TODO student (L3): logAudit(tx, event)
    tenant.ts                               # TODO student (L3 withTenant, L4 tenantDb facade)
    schema/
      auth.ts                               # provided chapter 055; regenerated by auth:generate after adding the organization plugin — student commits the diff
    queries/
      members.ts                            # TODO student (L4): listMembers(orgId)
      invitations.ts                        # TODO student: listPendingInvitations (L5), getInvitationById (L6)
      audit.ts                              # TODO student (L3): auditLogCount, recentAuditLogs (read through withTenant)
  emails/
    welcome-verification.tsx                # provided from chapter 055 (React Email pattern reference)
    components/email-layout.tsx             # provided: EmailLayout wrapper
    invite.tsx                              # TODO student (L5): InviteEmail template (orgName, inviterName, role, acceptUrl, expiresAt)
  app/
    (protected)/
      dashboard/
        page.tsx                            # provided chapter 055
        org-switcher.tsx                    # provided: client component calling authClient.organization.setActive + router.refresh()
      inspector/
        page.tsx                            # provided: 6 Suspense-wrapped panels (banner, members, invite, pending, audit tail, raw helpers)
        _data.ts                            # provided shell; TODO student (L2): getInspectorContext with dev acting-user cookie override
        actions.ts                          # provided: switchUserAction (dev cookie), resetAndReseedAction (dev reseed)
        constants.ts                        # provided: ACTING_USER_COOKIE
        _components/                         # provided: acting-user-switcher, invite-form, role-select-row, copy-accept-url
    (auth)/
      accept-invite/
        page.tsx                            # provided: AcceptInvitePage Server Component (verify ladder + 6 arrival surfaces)
        accept-form.tsx                     # provided: AcceptForm client island posting to acceptInvitation
    onboarding/
      create-org/
        page.tsx                            # provided: shell calling authClient.organization.create
scripts/
  seed.ts                                   # provided: 2 orgs (Acme, Globex), 4 users with mixed roles, 1 pending invite, 1 seeded audit row
tests/
  lessons/                                  # provided: Lesson <n>.test.ts run via pnpm test:lesson <n>
```

### Reference solution signatures lessons display

- **Roles** (`src/lib/auth/roles.ts`):
  - `type Role = 'owner' | 'admin' | 'member'` (provided)
  - `const ROLE_RANK = { member: 0, admin: 1, owner: 2 } as const satisfies Record<Role, number>`
  - `roleAtLeast(role: Role, required: Role): boolean` → `ROLE_RANK[role] >= ROLE_RANK[required]`
- **Auth instance addition** (`src/lib/auth.ts`):
  - Adds `organization({ teams: { enabled: false }, invitationExpiresIn: INVITATION_TTL_SECONDS, schema: { invitation: { additionalFields: { tokenHash: { type: 'string', required: true, input: false }, acceptedAt: { type: 'date', required: false, input: false } } } } })` to `plugins`, kept *before* the trailing `nextCookies()`.
  - Adds `databaseHooks: { session: { create: { before: async (session) => ({ data: { ...session, activeOrganizationId: await pickInitialActiveOrg(session.userId) } }) } } }`, where `pickInitialActiveOrg(userId)` reads the user's first membership.
  - The same `organization()` config is mirrored into `src/lib/auth-schema.config.ts` (the server-only-free CLI config), since `auth:generate` reads that file.
- **Auth client** (`src/lib/auth-client.ts`, provided): `createAuthClient({ baseURL, plugins: [organizationClient()] })`.
- **`requireOrgUser`** (`src/lib/auth.ts`, same module as `getCurrentUser`/`requireUser`): `cache(async () => { const session = await getSession(); if (!session) redirect('/sign-in'); const orgId = session.session.activeOrganizationId; if (!orgId) redirect('/onboarding/create-org'); const activeMember = await auth.api.getActiveMember({ headers: await headers() }); if (!activeMember) redirect('/onboarding/create-org'); return { user: session.user, orgId, role: activeMember.role as Role }; })` — the role is read fresh via `auth.api.getActiveMember` (a DB read), not from the session cookie cache; the request-scoped `cache()` dedupes it.
- **`withTenant` / `tenantDb`** (`src/db/tenant.ts`):
  - `withTenant<T>(orgId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>` — `db.transaction` that runs `select set_config('app.org_id', $orgId, true)` before `fn`; the transaction-local variable the `audit_logs` RLS policy reads.
  - `tenantDb(orgId: string)` returns a typed facade over Drizzle: `.query.member|invitation.findMany/findFirst` with `where` composed via `and(eq(<table>.organizationId, orgId), config?.where)`; `.insert(<table>).values(...)` injects `organizationId` and throws if the caller supplies a mismatched one; `.update(<table>).set(...).where(...)` and `.delete(<table>).where(...)` compose the org predicate. `TENANT_TABLES = { member, invitation }` is the type source, so `tenantDb(orgId).query.user` is a type error. There is deliberately no built-in bypass (no `.raw`, no `allOrgs`) — the only unscoped path is the separately-imported `db`, reserved for `scripts/`. The facade does *not* set `app.org_id`; the audit-bearing write goes through the separate `withTenant`.
- **`authedAction`** (`src/lib/auth/authed-action.ts`):
  - `authedAction<TSchema extends z.ZodType, TOut>(role: Role, schema: TSchema, fn: (input: z.infer<TSchema>, ctx: AuthedCtx) => Promise<Result<TOut>>): (_prev: Result<TOut> | null, formData: FormData) => Promise<Result<TOut>>`.
  - `AuthedCtx = { user: OrgUser; orgId: string; role: Role; db: ReturnType<typeof tenantDb>; ip: string | null; userAgent: string | null }`.
  - Four steps: `requireOrgUser()` → `roleAtLeast(actual, role)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`. Failure shapes: `err('forbidden', userMessage)`, `err('validation', userMessage, fieldErrors)` (`z.flattenError(...).fieldErrors`).
- **`logAudit`** (`src/db/audit-log.ts`):
  - `logAudit(tx: Transaction, event: AuditEvent): Promise<void>` where `AuditEvent = { action: string; subjectType?: string; subjectId?: string; payload?: Record<string, unknown> }` — a single insert into `auditLogs`; `tx` is required by the signature (no overload that takes `db`). The helper derives actor/org context itself — `requireOrgUser()` supplies `actorUserId` + `organizationId`, `await headers()` supplies `actorIp` / `actorUserAgent` — so the caller passes only the event.
- **`auditLogs` table** (`src/db/audit.ts`):
  - Columns: `id uuid pk default uuidv7()`, `organizationId text not null fk→organization` (Better Auth ids are base62 `text`, so a `uuid` FK→`text` would emit invalid DDL), `actorUserId text null fk→user (set null)`, `actorIp text null` (Drizzle has no first-class `inet` builder — `text` is the deliberate simplification), `actorUserAgent text null`, `action text not null`, `subjectType text not null`, `subjectId text not null`, `payload jsonb not null default '{}'`, `createdAt timestamptz not null default now()`.
  - Indexes: `idx_audit_logs_org_created (organizationId, createdAt desc)`, `idx_audit_logs_org_actor_created (organizationId, actorUserId, createdAt desc)`.
  - RLS: `.enableRLS()` + the permissive `FOR ALL` org-isolation policy `audit_logs_org_isolation` (`to: authenticatedRole`) whose `using`/`withCheck` read `current_setting('app.org_id', true)` compared to the `text` `organization_id` (no `::uuid` cast — both sides are text; the lesson 4 of chapter 056 shape, governing SELECT and INSERT) + the restrictive `audit_logs_no_update` and `audit_logs_no_delete` policies (`using: sql\`false\``, `to: authenticatedRole`) for the deny-write layer (the lesson 5 of chapter 057 shape).
- **`changeMemberRole`** (`src/lib/invitations/manage.ts`):
  - `authedAction('admin', z.strictObject({ memberId: z.string().min(1), newRole: z.enum(['admin', 'member']) }), async ({ memberId, newRole }, ctx) => { ... })` (`memberId` is `z.string().min(1)`, not a uuid — Better Auth member ids are text) — refuses owner targets, the last owner doubly so (both return `err('conflict', ...)`); writes the role change directly through Drizzle `tx` (never `auth.api.*`) + the `'member.role-changed'` audit row (`payload: { before, after }`) in one `withTenant(ctx.orgId, ...)` transaction, then `revalidatePath('/inspector')`.
- **`sendInvitation`** (`src/lib/invitations/send.ts`):
  - `authedAction('admin', z.strictObject({ email: z.email().toLowerCase(), role: z.enum(['admin', 'member']) }), async ({ email, role }, ctx) => { ... })` (Zod 4 top-level `z.email()`). Steps: existing-member check (returns `err('conflict', ...)`) → token via `generateInviteToken()` (32 random bytes base64url) → `sha256` hash → hand-rolled Drizzle insert (never `auth.api`) inside `withTenant(ctx.orgId, ...)` with `logAudit(tx, { action: 'invitation.sent', ... })` → commit → `signedInviteUrl(...)` → `sendEmail({ to, subject, react: createElement(InviteEmail, ...), idempotencyKey: \`invite:${invitationId}\` })` → `ok({ invitationId, emailSent: sent.ok })` (send failure is a flag on the success shape, not an error branch). Catches the `23505` partial-unique-index violation via `isUniqueViolation(e)` and returns `err('conflict', ...)`.
- **`generateInviteToken` / `signedInviteUrl` / `verifyInviteSignature` / `sha256`** (`src/lib/invitations/url.ts`):
  - `generateInviteToken(): string` — 32 random bytes encoded base64url.
  - `signedInviteUrl(invitationId: string, rawToken: string): Promise<string>` — base URL `${env.NEXT_PUBLIC_APP_URL}/accept-invite`, query `id=&token=&sig=` where `sig` is HMAC-SHA256 over `${invitationId}.${rawToken}` keyed by `INVITATION_SIGNING_SECRET`.
  - `verifyInviteSignature(invitationId: string, rawToken: string, sig: string): Promise<boolean>` — constant-time via `crypto.subtle.verify`.
  - `sha256(raw: string): Promise<string>` — hex digest.
- **`acceptInvitation`** (`src/lib/invitations/accept.ts`):
  - `(_prev: Result<{ ok: true }> | null, formData: FormData) => Promise<Result<{ ok: true }>>` — not wrapped in `authedAction` (authz is the invitation, not a role). Schema `z.strictObject({ id: z.string().min(1), token: z.string() })`. Re-verifies the token by re-hashing and comparing to `tokenHash` (the action re-checks independently of the page; `sig` is the page's pre-DB doorman and is not an action input), checks expiry + status, compares `session.user.email` to `invitation.email` (case-insensitive). Opens a `withTenant(invitation.organizationId, ...)` transaction that inserts the `member` row directly via `tx` (`{ userId, role: invitation.role ?? 'member' }`), `tx.update`s `invitation` to `status='accepted', acceptedAt=now()` with a `where ... and status='pending'` precondition, flips `user.emailVerified` to `true` when the accepting user is unverified, and inserts the `'invitation.accepted'` audit row **directly through `tx`** (not via `logAudit` — the accepting user is not yet a member, so `logAudit`'s `requireOrgUser` derivation would resolve to nothing; org + actor come from the invitation row and the validated session). Calls `auth.api.setActiveOrganization(...)` **after** commit (the plugin refuses to activate an org the caller isn't yet a member of), then `redirect('/dashboard')`.
- **Env entries** (`.env.example`, new):
  - `INVITATION_SIGNING_SECRET=` (32 bytes base64, generate via `openssl rand -base64 32`); distinct from `BETTER_AUTH_SECRET`. `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, and the Resend entries are chapter-055/050 carry-in already in `.env.example`.

### Inspector page spec

A single Server Component at `/inspector` is the verification surface. Provided in full; the student writes only the actions, queries, and helpers it exercises. The page renders six bounded panels, each behind its own `<Suspense>`, and each carrying a `data-testid` for the screenshotter. It renders privileged controls to *every* acting identity on purpose — the server-side refusal, not a client-side hide, is the observable defense.

- **Active-org banner panel.** Renders `ctx.orgName` and `ctx.role`, an org switcher (`<OrgSwitcher />` reused from the dashboard) that calls `authClient.organization.setActive` and `router.refresh()`es, and a dev-only acting-user switcher. The `<ActingUserSwitcher>` dropdown lists the four seeded users; selecting one calls `switchUserAction` (in `inspector/actions.ts`, gated `NODE_ENV !== 'production'`), which writes the `inspector-acting-user` cookie that `getInspectorContext` reads to swap the *rendered* identity. Used to verify RBAC by toggling owner/admin/member without manual sign-out/sign-in.
- **Members panel.** A list of members for the active org via `listMembers(orgId)`: name and a role-change `<Select>` (`<RoleSelectRow>`) that posts to `changeMemberRole`. The select is rendered for *every* row regardless of acting role on purpose — lesson 4's Moment of truth confirms the server-side refusal for the member acting identity.
- **Invite panel.** `<InviteForm>` — email input + role dropdown (`admin` or `member` only — `owner` is not a value) calling `sendInvitation`.
- **Pending panel.** A separate `listPendingInvitations(orgId)` list with email · role and a dev-only `<CopyAcceptUrl>` button (the seed surfaces the canonical accept URL without the raw token ever living in the DB). There is no Revoke affordance in this project.
- **Audit-log tail.** The recent `auditLogs` rows for the active org via `recentAuditLogs(orgId)` (read through `withTenant` for RLS), re-rendered after each action's `revalidatePath('/inspector')`. Each row renders its `action` string.
- **Raw helpers panel.** A read-only `auditLogCount(orgId)` for the active org — sanity check that the helper filters correctly through `withTenant`.

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
- The accept arrival surfaces (refused / expired / already-member / mismatch / sign-in / sign-up / consent); the verify ladder (signature → row → hash → expiry → status → identity); explicit Accept-button consent gate; auto-`emailVerified` for invite-sourced signups; active-org switch on accept — lesson 3 of chapter 058.
- Catching the partial-unique-index error (via `isUniqueViolation`) and translating to a `conflict` Result — lesson 4 of chapter 058.
- Email-mismatch refusal, double-click race against `status='pending'` filter, orphan-invite senior call — lesson 5 of chapter 058.
- Zod 4 `z.strictObject`, `z.infer` at the action boundary — chapter 042.
- Web Crypto random + SHA-256 + HMAC verify with constant-time compare — lesson 1 of chapter 016.
- React Email template authoring through the Unit 7 send pipeline — chapter 049.

---

## Lesson 1 — Project Overview

### What we're building

The existing chapter 055 single-user dashboard becomes a multi-tenant SaaS with three roles, an audit trail, and an invitation handshake. By the end the student has organizations on the session, an `authedAction` wrapper that refuses under-privileged callers, an append-only `audit_logs` table the database itself protects, and a signed invite link that carries a stranger from email to a seat in the org.

One figure: a screenshot of the finished inspector page — members panel with its role-change `<Select>`, invite form, pending panel, and the live audit-log tail — paired with a short animated capture of the invite flow (admin invites → email arrives → invitee clicks → accept screen → dashboard) and the inline role-refusal message a member acting identity sees.

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
- **Invitation layer.** `signedInviteUrl` / `verifyInviteSignature` bracket the capability URL; `sendInvitation` writes the row and audit event then emails after commit; the provided `/accept-invite` Server Component runs the verify ladder and branches on session and email across its arrival surfaces; `acceptInvitation` joins, audits in one transaction, then switches the active org after commit.
- **Verification surface.** A provided `/inspector` Server Component and its seed (2 orgs, 4 mixed-role users, 1 pending invite, 1 seeded audit row) exercise every helper and action; a dev-only acting-user switcher toggles identities without sign-out.

### Starting file tree

See the **Starter file tree** under Chapter framing for the full annotated layout. The TODO-marked files are the highlighted focus — the rest is provided chapter 055 / chapter 050 carry-in. The accept-invite page and form are provided in full; the student writes the action behind them. The student fills, in order across the build lessons:

- `src/lib/auth.ts` (org plugin + active-org hook + `requireOrgUser`), `src/lib/auth-schema.config.ts` (mirror), `src/lib/auth/roles.ts` (`ROLE_RANK` / `roleAtLeast`), `src/app/(protected)/inspector/_data.ts` (`getInspectorContext`).
- `src/db/audit.ts` (table + RLS), `src/db/index.ts` (spread `auditSchema`), `src/db/audit-log.ts` (`logAudit`), `src/db/tenant.ts` (`withTenant`), `src/db/queries/audit.ts` — the audit table and its transaction-required writer.
- `src/db/tenant.ts` (the `tenantDb` facade), `src/db/queries/members.ts`, `src/lib/auth/authed-action.ts`, `src/lib/invitations/manage.ts` — the scoped data layer, the wrapper, and the role-change action.
- `src/env.ts` (`INVITATION_SIGNING_SECRET`), `src/lib/invitations/url.ts`, `src/lib/invitations/send.ts`, `src/db/queries/invitations.ts` (`listPendingInvitations`), `src/emails/invite.tsx` — the signed URL, the send action, the email template.
- `src/lib/invitations/accept.ts`, `src/db/queries/invitations.ts` (`getInvitationById`) — the accept action behind the provided page.

The Better Auth CLI is the canonical way to add the plugin-owned columns: `pnpm auth:generate` (reading `src/lib/auth-schema.config.ts`) regenerates `src/db/schema/auth.ts` after the organization plugin lands, and the student commits the diff. Hand-editing the generated `auth.ts` schema is review-loud — re-run the CLI when the plugin config changes. The inspector's "switch acting user" cookie is dev-only (`NODE_ENV !== 'production'`); the same affordance in production would be a privilege-escalation vector.

### Roadmap

- **Lesson 2 — Organization plugin and the active-org session.** Installs the organization plugin, seeds `activeOrganizationId` on session create, and ships `roleAtLeast` plus `requireOrgUser` so the inspector renders the active-org banner.
- **Lesson 3 — Append-only audit_logs with RLS.** Lays down the `auditLogs` table with deny-UPDATE/DELETE policies and the transaction-required `logAudit(tx, event)` writer behind `withTenant`.
- **Lesson 4 — Scoped data, the action wrapper, and role changes.** Builds the `tenantDb(orgId)` facade and the `authedAction(role, schema, fn)` wrapper, then ships `changeMemberRole`, which refuses owner targets and last-owner demotion and audits in-transaction.
- **Lesson 5 — Send an invitation with a signed accept URL.** Generates the token, hashes at rest, HMAC-signs the URL, writes the row plus audit event in one transaction, and sends the React Email after commit.
- **Lesson 6 — Accept the invitation behind the provided arrival surfaces.** Ships `acceptInvitation` (and `getInvitationById`) behind the provided `/accept-invite` Server Component — joining the org, auto-verifying email, and auditing inside one transaction, then switching the active org after commit.

### Setup

Command sequence:

1. `npx degit <starter-repo> chapter-059 && cd chapter-059`
2. `pnpm install`
3. `docker compose up -d` (starts `postgres:18`)
4. `cp .env.example .env`, then fill the secrets below (`db:migrate` / `db:seed` load `.env` via `dotenv-cli`)
5. `pnpm db:migrate && pnpm db:seed`
6. `pnpm dev`

Env entries (`.env`, with the provided defaults already pointing at the docker-compose Postgres):

- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — both point at the local Postgres; the pooled/unpooled split exists so Unit 20 can plug Neon in without renaming.
- `BETTER_AUTH_SECRET` — the chapter 055 auth secret; generate via `openssl rand -base64 32` if not carried in. `BETTER_AUTH_URL` is the app origin.
- `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_REPLY_TO` — the chapter 050 verified-domain sender. The verified domain is a hard prerequisite for the accept-the-invite verification — Resend's sandbox sender will not deliver to the student's personal inbox.
- `INVITATION_SIGNING_SECRET` — 32-byte HMAC key for signing accept URLs, distinct from `BETTER_AUTH_SECRET` (different rotation cadence, different blast radius); generate via `openssl rand -base64 32`. This is the lone env the student adds (in `src/env.ts`, lesson 5).
- `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_URL` — the app identity; `NEXT_PUBLIC_APP_URL` is the base host for the signed accept URL.

Expected result: `pnpm dev` serves the chapter 055 sign-up / sign-in / sign-out / `/dashboard` flow. `/inspector` resolves to placeholder panels because `getInspectorContext` and the helpers it calls are stubs that return empty/placeholder data rather than throw — the real org context arrives in lesson 2. No org schema, no audit table, and no scoped data layer exist yet.

---

## Lesson 2 — Organization plugin and the active-org session

The student installs Better Auth's organization plugin, seeds the active org on session creation, and ships the role helpers and `requireOrgUser` so the inspector resolves the acting identity.

Finished result: `/inspector` resolves to a real org context — the active-org banner renders the acting user's org name and role (no longer the empty-state placeholder), the acting-user switcher swaps identities, and the org switcher re-renders the banner against the new org.

### Your mission

Better Auth's organization plugin is the canonical source for the `organization`, `member`, and `invitation` tables — you don't hand-write them. Add the plugin to the `betterAuth({ plugins })` array *before* the trailing `nextCookies()`, with teams disabled, a seven-day invitation expiry named as a constant (`INVITATION_TTL_SECONDS`), and `schema.invitation.additionalFields` for the server-managed (`input: false`) `tokenHash` and `acceptedAt` columns this project layers on; the matching `organizationClient()` is already registered in the provided client. Mirror the same `organization()` config into `src/lib/auth-schema.config.ts` (the server-only-free CLI config `auth:generate` reads). The active org is part of the session, so a `databaseHooks.session.create.before` hook is the *one* structural place to seed `activeOrganizationId` via `pickInitialActiveOrg(userId)` — every entry point that mints a session (sign-in, sign-up, verification) flows through it, so don't sprinkle the setter across them. After the plugin config is set, the Better Auth CLI regenerates `src/db/schema/auth.ts`; run it and commit the diff rather than editing the generated file by hand. The `requireOrgUser` helper reads the role fresh from the database via `auth.api.getActiveMember`, not from the session cookie cache — the cache can carry a stale role for up to the `freshAge` window (lesson 3 of chapter 052), and reading it fresh is the senior reflex for role-change correctness within seconds. The cached `activeOrganizationId` is fine because `setActive` rewrites the cookie immediately, but never trust an active-org id arriving from a query string or route param — the only acceptable source is the server-validated session. The create-org onboarding path is provided and exercised by the plugin's call shape; you verify it, you don't re-implement it. The inspector's own dev acting-user override lives in `getInspectorContext` (`_data.ts`) and never touches `requireOrgUser`, so the privileged actions still resolve identity from the real session.

- The `organization`, `member`, and `invitation` tables exist in the migrated schema, and `session` carries an `activeOrganizationId` column, after the regenerated auth schema is committed and migrated.
- A newly created session has its `activeOrganizationId` populated to the user's first membership, confirmed for the four seeded users.
- `roleAtLeast` orders the three roles correctly: a member does not satisfy `admin`, an admin satisfies `admin` but not `owner`, an owner satisfies all three.
- `requireOrgUser()` returns `{ user, orgId, role }` for a member of the active org, redirects to `/onboarding/create-org` when no active org is set, and redirects there again when `getActiveMember` returns no membership.
- The inspector's active-org banner renders the acting user's org name and role; switching acting users via the dev cookie re-renders the banner with the new identity.
- Switching the active org via the org switcher refreshes the layout and the banner shows the new org.
- A fresh signup with no orgs lands on `/onboarding/create-org`; submitting creates the org and redirects to `/dashboard` with the new org active.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: the `organization()` plugin config (in both `src/lib/auth.ts` and the `auth-schema.config.ts` mirror), `pickInitialActiveOrg(userId)`, the `session.create.before` hook, `src/lib/auth/roles.ts` (`ROLE_RANK`, `roleAtLeast`; the `Role` type is provided), the `requireOrgUser` body in `src/lib/auth.ts`, and `getInspectorContext` in `_data.ts` (see the signatures under Chapter framing). Cover the CLI-regenerate-then-commit workflow, the reason the active-org hook is the single setter, and the role-from-DB-not-cookie decision. Link to lesson 1 of chapter 056 (organizations / active org) and lesson 1 of chapter 057 (RBAC, `roleAtLeast`, `requireOrgUser`) rather than re-explaining; link to lesson 3 of chapter 052 for the cookie-cache freshness window.

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 2`) and confirm it passes; the suite asserts the role ordering of `roleAtLeast` and the redirect/return behavior of `requireOrgUser` across the active-org-present, no-active-org, and no-membership cases.

Confirm by hand, ticking each off:

- After `pnpm db:migrate`, `pnpm db:studio` shows the `organization`, `member`, `invitation` tables and the `session.activeOrganizationId` column.
- `/inspector` renders the active-org banner with Alice's (owner) role; the four seeded users appear in the acting-user switcher.
- Switching acting users re-renders the banner with the new identity; switching orgs refreshes the layout and shows the new org.
- A fresh signup with no orgs lands on `/onboarding/create-org`, and submitting it redirects to `/dashboard` with the new org active.

The members and pending panels and the audit tail still render their empty states because `listMembers`, `tenantDb`, `logAudit`, and the audit table don't exist yet.

---

## Lesson 3 — Append-only audit_logs with RLS

The student lays down the `auditLogs` table with deny-write RLS policies and the transaction-required `logAudit(tx, event)` writer, so the database itself guarantees the audit trail can only grow.

Finished result: as the `authenticated` role in `psql`, an audit insert succeeds inside a tenant-scoped transaction and fails outside one; UPDATE and DELETE both match zero rows (the `using: sql\`false\`` policy means no row ever qualifies, so the statement reports `UPDATE 0` / `DELETE 0` and the data is untouched). The inspector's raw-helpers panel resolves a real `auditLogs` count for the current org (1 for Acme, from the seeded audit row).

### Your mission

The audit log is compliance data, so it gets a defense the application layer can't supply on its own. Define the `auditLogs` table — the full column set, the `text` type for `organizationId` / `actorUserId` (Better Auth ids are base62 `text`, so a `uuid` FK→`text` emits invalid DDL; only the standalone `id` PK stays `uuid`, defaulted via `uuidv7()`), the `text` type for `actorIp` (Drizzle has no first-class `inet` builder, so `text` is the deliberate simplification), the `jsonb` type for `payload`, and the two composite indexes that serve the per-org and per-actor reads — then `.enableRLS()` and declare the `pgPolicy` rules: the permissive `FOR ALL` org-isolation policy `audit_logs_org_isolation` (`to: authenticatedRole`) keyed on `current_setting('app.org_id', true)` compared to the `text` `organization_id` with no `::uuid` cast (governing SELECT and INSERT, from chapter 056 lesson 4), plus the two restrictive deny-everything policies `audit_logs_no_update` and `audit_logs_no_delete` (`using: sql\`false\``, from chapter 057 lesson 5). The `true` argument on `current_setting` matters: a missing setting returns NULL rather than throwing, so the policy naturally evaluates false and refuses instead of surfacing a 500. The deny-UPDATE/DELETE policies are the *structural* layer — the application discipline of never issuing those statements plus the DB grants are real, but the policies are load-bearing because they don't depend on developer attention. The session variable is set transaction-locally via `set_config('app.org_id', $orgId, true)` (the bind-parameter form of `SET LOCAL`), never plain `SET`: with pooled connections, session-level `SET` persists across requests on the same connection and silently leaks `app.org_id` across tenants. That is why `withTenant(orgId, fn)` opens a transaction and runs `set_config(...)` before the work — every audit read and write flows through it. The `logAudit(tx, event)` signature requires a `Transaction` handle with no overload that accepts the raw `db`, because auditing happens inside the transaction that does the work, never as a fire-and-forget call. Migrations and the future retention job run as the owner / superuser role, which bypasses RLS by Postgres default (the seed relies on this, inserting fixture audit rows directly); the application request handler runs as `authenticated` — the retention job is a named year-two reach, not built here.

- The `auditLogs` table exists in the migrated schema with its full column set and both composite indexes.
- As the `authenticated` role inside a transaction that has set `app.org_id`, an `INSERT INTO audit_logs (...)` succeeds.
- The same insert outside a transaction, with `app.org_id` unset, fails.
- `UPDATE audit_logs SET action = 'x'` matches zero rows for the `authenticated` role (`UPDATE 0`; the deny policy lets no row qualify, so the data is untouched).
- `DELETE FROM audit_logs WHERE id = ...` matches zero rows for the `authenticated` role (`DELETE 0`).
- A `SELECT` with `app.org_id` unset returns 0 rows rather than erroring — the NULL setting refuses the read.
- `logAudit(tx, event)` inserts exactly one row and does not typecheck when called with the unwrapped `db` instead of a `Transaction` handle.
- The inspector's raw-helpers panel resolves the `auditLogs` row count (read through `withTenant`) for the current org.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: `src/db/audit.ts` (columns, indexes, `.enableRLS()`, the three `pgPolicy` declarations — see the signatures under Chapter framing), the `auditSchema` spread in `src/db/index.ts`, the `withTenant(orgId, fn)` shape in `src/db/tenant.ts`, `logAudit(tx, event)` in `src/db/audit-log.ts`, and `auditLogCount` / `recentAuditLogs` in `src/db/queries/audit.ts`. Cover why `set_config(..., true)` rather than plain `SET`, why the policies (not the app discipline) are the structural defense, the owner/superuser RLS bypass for migrations and the seed, and the `current_setting(..., true)` NULL-on-missing behavior. Link to lesson 4 of chapter 056 for the `pgPolicy` / `withTenant` pattern and lesson 5 of chapter 057 for the transaction-required `logAudit` discipline rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 3`) and confirm it passes; the suite asserts that `logAudit` inserts one row inside a transaction and that the deny-UPDATE/DELETE behavior holds.

Confirm by hand, ticking each off (open `psql` and `SET ROLE authenticated` — the docker-compose superuser bypasses RLS, so the deny checks only bite under the `authenticated` role):

- Inside `BEGIN; SELECT set_config('app.org_id', 'org_acme', true); ...; COMMIT;`, an `INSERT INTO audit_logs (...)` for `org_acme` succeeds.
- The same insert with `app.org_id` unset fails.
- `UPDATE audit_logs SET action = 'x' WHERE id = ...` reports `UPDATE 0` (the deny policy lets no row qualify).
- `DELETE FROM audit_logs WHERE id = ...` reports `DELETE 0`.
- A `SELECT * FROM audit_logs LIMIT 1` with `app.org_id` unset returns 0 rows.
- The inspector's raw-helpers panel shows the `auditLogs` count for the current org (1 for Acme).

No action writes to the table yet — that arrives with the role-change action in lesson 4.

---

## Lesson 4 — Scoped data, the action wrapper, and role changes

The student builds the `tenantDb(orgId)` facade and the four-step `authedAction(role, schema, fn)` wrapper, then ships `changeMemberRole`, which exercises both: it refuses owner targets and last-owner demotion and writes the audit row in the same transaction as the role change.

Finished result: in the inspector, the admin acting user changes a member's role and the audit tail shows the `'member.role-changed'` row with the correct actor and payload; the member acting user gets a `forbidden` result with no DB change and no audit row; targeting an owner or the last owner surfaces a `conflict`.

### Your mission

This lesson installs the two helpers that make the highest-frequency multi-tenancy bugs impossible at the call sites that compile, and proves them through the first real privileged action. The `tenantDb(orgId)` facade is the only scoped data path: its `.query.member|invitation` reads compose `and(eq(<table>.organizationId, orgId), config?.where)`, its `.insert` injects `organizationId` (and throws on a mismatched one), its `.update` / `.delete` always `and`-in the org predicate. `ctx.db` (the `tenantDb` facade) is app-layer scoping only and does *not* set `app.org_id`; the audit-bearing transaction is the separate `withTenant(ctx.orgId, ...)` helper imported from `@/db/tenant`, which runs `set_config('app.org_id', ...)` so the audit INSERT clears the RLS policy — reads stay on `ctx.db`. The `TENANT_TABLES = { member, invitation }` registry is the type source the facade exposes — reaching for `tenantDb(orgId).query.user` is a type error because `user` is global. The `authedAction(role, schema, fn)` factory is the *only* call shape for a privileged action: its four steps are `requireOrgUser()` → `roleAtLeast(actual, role)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`, and the `ctx` it hands the body already carries `db: tenantDb(orgId)` plus `ip` and `userAgent` read from `headers()`. Forbidden and validation failures return the canonical `err(...)` `Result` discriminants — never a throw, because a throw 500s the action and loses the typed contract the form's `useActionState` reducer renders (the one correct throw is `requireOrgUser`'s redirect, which propagates). Don't reproduce the wrapper's checks inline in an action body and call it equivalent: the import shape is what review catches. Inside `changeMemberRole`, do the read (`not_found` when the target is gone), the invariant checks (an `owner` target returns `conflict`, and the last owner doubly so — both are `conflict`), then the update and the `logAudit` call in *one* `withTenant(ctx.orgId, ...)` transaction (the write goes through `tx` directly, never `auth.api.*`) — if the audit insert fails, the role change rolls back, because a role that changed with no record is exactly the wrong direction for a compliance table. End with `revalidatePath('/inspector')`. The `forbidden` and `validation` messages are user-safe; the wrapper carries no logging/entitlement/rate-limit step itself — the user/operator split is the chapter 080 discipline foreshadowed, not built here. The unwrapped `db` import is the cross-tenant escape hatch reserved for `scripts/`; the action body never reaches for it.

- A `tenantDb(orgId)` read returns only rows for that org, and composing a caller `where` still narrows within the org.
- A `tenantDb(orgId)` insert persists the row with `organizationId` set to that org even when the caller omits it, and throws on a mismatched `organizationId`.
- `tenantDb(orgId).query.user` is a type error — global tables are not reachable through the facade.
- An `authedAction` whose `role` exceeds the caller's role returns `err('forbidden', ...)` with a user-safe message and never throws.
- An `authedAction` with input that fails the schema returns `err('validation', ..., fieldErrors)` and never reaches the action body.
- As the admin acting user, changing a member's role updates the row and appends one `'member.role-changed'` audit row with `payload: { before, after }` (the previous and new role) and `actorUserId` matching the admin.
- As the member acting user, a role-change attempt returns `forbidden` with the role row unchanged and no audit row added.
- Targeting an owner returns `conflict`; targeting the sole owner returns `conflict` with the last-owner message; neither changes the DB.
- The audit row and the role update land together or not at all — force-failing the update lands neither.
- The inspector's `auditLogs` count increments only on successful role changes, never on rejected attempts.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: the `tenantDb(orgId)` facade in `src/db/tenant.ts`, `listMembers` in `src/db/queries/members.ts`, the `authedAction(role, schema, fn)` factory in `src/lib/auth/authed-action.ts`, and `changeMemberRole` in `src/lib/invitations/manage.ts` (see the signatures under Chapter framing). Cover why the wrapper is the only privileged-action shape (import-shape review), why `ctx.db` is the scoped facade rather than the raw `db`, why the audit write shares the action's transaction, why forbidden returns a `Result` instead of throwing, and the user/operator message split. Link to lesson 2 of chapter 056 (`tenantDb`), lesson 2 of chapter 057 (the wrapper and `ctx`), and lesson 4 of chapter 057 (the single-owner invariant) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 4`) and confirm it passes; the suite asserts org scoping on `tenantDb` reads/inserts, the `forbidden` and validation `Result` shapes from the wrapper, and the in-transaction audit write on a successful role change.

Confirm by hand, ticking each off:

- As the admin acting user (Bob), change Carol's role to `admin`: the row updates and the audit tail shows `'member.role-changed'` with the right payload and actor.
- As the member acting user (Carol), try to change Bob's role: a `forbidden` result renders, with no DB change and no audit row.
- As the admin, try to demote the owner (Alice): a `conflict` result renders.
- Because Alice is Acme's sole owner, the same attempt also surfaces the last-owner `conflict` message; neither leaves the DB changed.
- The raw-helpers panel's `auditLogs` count increments only after the successful change, not after the rejected attempts.

The invite flow still doesn't exist — submitting the invite form does nothing useful yet, and the accept page can't load a real invite.

---

## Lesson 5 — Send an invitation with a signed accept URL

The student generates a 32-byte token, hashes it at rest, HMAC-signs the accept URL, writes the invitation row plus the `invitation.sent` audit event in one transaction, sends the React Email after commit, and translates a duplicate-pending invite into a `conflict` result.

Finished result: in the inspector, the admin submits the invite form and the pending panel and audit tail update; the React Email arrives in the student's inbox with an accept-URL button; in Postgres the `tokenHash` is a 64-character hex string and the raw token appears nowhere.

### Your mission

The accept URL is a capability — possession of it is the authorization to join — so it has to be unguessable, tamper-evident, and useless once read from the database. `generateInviteToken()` draws 32 random bytes with `crypto.getRandomValues` and base64url-encodes them as the raw token; store only `sha256(token)`, so a database read alone can't forge a valid link. Sign the URL with an HMAC over `${invitationId}.${rawToken}` using `INVITATION_SIGNING_SECRET` — a secret distinct from `BETTER_AUTH_SECRET`, because reusing one key across two cryptographic uses tangles rotation. Import the key once at module load as a non-extractable `sign`/`verify` `CryptoKey` (a lazily-awaited module-scope promise) and reuse it for both `signedInviteUrl` and the accept path's constant-time `verifyInviteSignature` (`crypto.subtle.verify`, never a string `===`). Add `INVITATION_SIGNING_SECRET` to the server block of `src/env.ts` so the boundary validates it. Hand-roll the `invitation` insert through Drizzle `tx` inside the transaction — keep the plugin's table shape but write the row yourself (never `auth.api`), because the plugin runs its hooks post-commit and the `'invitation.sent'` audit row must ride the same transaction as the insert. Write that audit row via `logAudit(tx, ...)` in the same `withTenant(ctx.orgId, ...)` transaction, then commit. The email send sits *outside* the transaction on purpose: if Resend is down, the row exists and the inspector surfaces a resend affordance, whereas emailing inside the transaction risks an orphan email on rollback — the worse failure mode. The dedup keys on the partial unique index over `(organizationId, lower(email)) WHERE status='pending'`, so lowercasing the email belongs in the Zod schema (`z.email().toLowerCase()`, not a runtime call in the body) to match the index; catch the `23505` violation via `isUniqueViolation(e)` and return `err('conflict', ...)`. The raw token must never reach the database or the logs. Surfacing the invite URL in the inspector is dev-only (`<CopyAcceptUrl>`); in production that URL is a credential the inviter shouldn't retain after send.

- Submitting the invite form as an admin creates an `invitation` row with `status='pending'` and the chosen role, and the pending panel (`listPendingInvitations`) shows it.
- The `tokenHash` column holds a 64-character hex string, and the raw token does not appear in any column of any table.
- The React Email arrives in the student's real inbox with the org name, inviter name, role, and a CTA button whose href is `/accept-invite?id=...&token=...&sig=...`.
- A successful send appends an `'invitation.sent'` audit row in the same transaction as the invitation insert.
- A second invite to the same email returns `err('conflict', ...)` from the partial-unique-index catch.
- Inviting an email that already belongs to a member of the org returns `err('conflict', ...)` (distinguished from the pending-collision conflict by message and by which layer fires — a membership pre-check in the body vs the `23505` index catch).
- When Resend rejects the send, the action still returns `ok({ invitationId, emailSent: false })` (send failure is a flag on the success shape, not an error branch) and the row still exists.
- The emailed URL is well-formed — opening it loads the provided accept page, though accepting it only works once lesson 6 ships the action.

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: `generateInviteToken` / `signedInviteUrl` / `verifyInviteSignature` / `sha256` in `src/lib/invitations/url.ts`, the `INVITATION_SIGNING_SECRET` addition in `src/env.ts`, `listPendingInvitations` in `src/db/queries/invitations.ts`, the `InviteEmail` template in `src/emails/invite.tsx` (mirroring `welcome-verification.tsx`, reusing `EmailLayout`), and `sendInvitation` in `src/lib/invitations/send.ts` (see the signatures under Chapter framing). Cover the send-after-commit boundary, the distinct signing secret, the hash-at-rest rationale, the schema-level lowercasing tied to the partial index, and the hand-rolled-`tx`-insert-not-`auth.api` decision. Link to lesson 1 of chapter 016 (Web Crypto random / SHA-256 / HMAC), lesson 2 of chapter 058 (signed URL, send-after-commit), lesson 4 of chapter 058 (the unique-violation → `conflict` translation), and chapter 049 (React Email authoring) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 5`) and confirm it passes; the suite asserts the row + audit write happen together, the `tokenHash` shape, the `conflict` results for the duplicate-pending and already-member cases, and that the raw token is absent from the persisted row.

Confirm by hand, ticking each off:

- As admin, submit the invite form with the student's real email and role `member`: the pending panel updates and the audit tail shows `'invitation.sent'`.
- The inbox receives the React Email with the CTA button pointing at `/accept-invite?id=...&token=...&sig=...`.
- In Postgres, `tokenHash` is a 64-character hex string and the raw token appears in no column.
- Opening the link loads the provided accept page (clicking Accept does nothing until lesson 6).
- Inviting the same email again surfaces a `conflict` (the existing pending row is already on screen).

The full send path is exercised, but accepting still does nothing — that is lesson 6.

---

## Lesson 6 — Accept the invitation behind the provided arrival surfaces

The student ships `acceptInvitation` and the `getInvitationById` query behind the provided `/accept-invite` Server Component: the action re-verifies the token, joins the org and audits inside one transaction, auto-verifies the invited email, then switches the active org after commit.

Finished result: opening the emailed URL in a private window renders the right arrival surface (refused / expired / already-member / mismatch / sign-in / sign-up / consent); signing up via the prefilled flow and clicking Accept lands on `/dashboard` with the invited org active; the inspector shows the new member with the invited role, an `'invitation.accepted'` audit row, and `user.emailVerified` true.

### Your mission

Accepting an invite is the moment a stranger becomes a member, so the page reads the capability URL defensively and the action re-checks everything before it writes. The provided Server Component runs the verify ladder in fixed order — signature → row → hash → expiry → status → identity — and its first three failures (bad signature / no row / hash mismatch) collapse to one generic refusal, because the recovery path is identical (ask for a new invite); it then renders one of the arrival surfaces (expired, already-member, email-mismatch, prefilled sign-in, prefilled sign-up, or the consent screen with the Accept button). Your `getInvitationById` is the *unscoped* read the ladder depends on — the invitee is not yet a member of any org, so this query deliberately bypasses `tenantDb` (the only such read in the project). The page's verification is for the UI branch only — form submissions are separate requests, so `acceptInvitation` re-fetches and re-hashes (`sha256(token) === tokenHash`) and does its own expiry/status and session/email check; `sig` is *not* an action input. This action is *not* wrapped in `authedAction` because the invitation itself is the authorization, not a role. Inside one `withTenant(invitation.organizationId, ...)` transaction, insert the `member` row directly via Drizzle `tx` (`{ userId, role: invitation.role ?? 'member' }`), `tx.update` `invitation` to `status='accepted', acceptedAt=now()` with a `where ... and status='pending'` precondition, flip `user.emailVerified` to `true` when the accepting user is unverified, and insert the `'invitation.accepted'` audit row **directly through `tx`** — *not* via `logAudit`. This is the lone audit row in the project that bypasses the helper: `logAudit` derives its org from `requireOrgUser`, but the accepting user is not yet a member of any org, so that read resolves to nothing and would redirect mid-transaction; the invitation row supplies org + actor instead. Never call `auth.api.acceptInvitation` — its `after` hooks run post-commit and would break the one-transaction audit contract. `auth.api.setActiveOrganization(...)` runs **after** commit (the one sanctioned `auth.api` write, an in-process session write): the installed plugin refuses to activate an org the caller isn't yet a member of, and that membership is visible only once the tx commits. If the accepting user is unverified, the `emailVerified` flip is the carve-out that spares them a verify-your-email loop right after — receiving the click on the invited email is itself the proof (the lesson 3 of chapter 058 reflex). Auto-accepting on GET would let URL-scanning crawlers and corporate URL-rewriters silently consume the invite, so the explicit Accept button is the consent gate. Email comparison is case-insensitive on both sides — the invitation email is lowercased at write time, the session email at compare time. The double-click race resolves because the status flip filters on `status='pending'`. Finally `redirect('/dashboard')`.

- Opening a valid pending URL while signed in with the matching email renders the Accept button alongside the org name, inviter name, and role.
- A mangled `sig` renders the generic refusal with no DB lookup; a missing row and a hash mismatch render the same generic refusal.
- An expired invite renders the "ask for a new one" screen; an already-accepted URL renders the friendly "already a member" screen.
- Signed in with a different email renders the mismatch refusal naming the invited address.
- Signed out with no account renders a prefilled sign-up that, on success, returns to the accept URL and then renders the Accept button; signed out with an existing account renders the prefilled sign-in.
- Clicking Accept writes a `member` row with the invited role, flips `invitation.status` to `'accepted'`, sets `invitation.acceptedAt`, and appends an `'invitation.accepted'` audit row — all in one transaction.
- After accepting, `session.activeOrganizationId` is the invited org (set after commit) and the redirect lands on `/dashboard` in that org.
- A user who signed up through the invite flow has `user.emailVerified` true even though no separate verification email was sent.
- Two simultaneous Accept clicks resolve to one success and one no-op (the `status='pending'` precondition matches nothing on the second).

### Coding time

Implement against the brief and the lesson's tests, then read the reference walkthrough.

Reference solution: `getInvitationById` (the unscoped read) in `src/db/queries/invitations.ts` and `acceptInvitation` in `src/lib/invitations/accept.ts` (see the signatures under Chapter framing); read the provided `/accept-invite/page.tsx` to see the verify ladder and arrival surfaces it sits behind. Cover why the first three failures share one refusal, why the action re-verifies independently of the page, why the audit row is inserted directly (not via `logAudit`), why `setActiveOrganization` runs after commit, the auto-`emailVerified` carve-out, the explicit-Accept consent gate, and the unscoped `getInvitationById`. Link to lesson 3 of chapter 058 (arrival surfaces, verify order, consent gate, auto-verify) and lesson 5 of chapter 058 (email-mismatch refusal, double-click race) rather than re-explaining.

### Moment of truth

Run the lesson's test suite (`pnpm test:lesson 6`) and confirm it passes; the suite asserts the in-transaction member-join + audit write on accept, the email-mismatch and re-verify refusals, and the after-commit active-org switch. The accept-across-email-sessions check needs the student's verified domain from chapter 050 — the sandbox sender will not deliver to the personal inbox.

Confirm by hand, ticking each off (continuing from lesson 5's invite):

- Open the emailed URL in a private window: the prefilled sign-up surface renders. Sign up; auto-redirect to the accept URL; the consent surface renders the Accept button.
- Click Accept: redirected to `/dashboard` with the invited org active. In the inspector, the new member row exists with the right role, the audit tail shows `'invitation.accepted'`, and `user.emailVerified` is true.
- Flip one character of the `sig` query param: the generic refusal renders.
- Use the seeded pending invite's Copy-accept-URL after accepting it once (or hand-edit `status`) to re-open an already-accepted URL: the "already a member" screen renders.
- Sign in as Carol (a different email) and open the URL: the email-mismatch refusal renders.
- Open the accept URL in two tabs and click Accept simultaneously: one wins, the other is a no-op against the `status='pending'` filter.

With this lesson the full invite handshake works end-to-end across all the arrival surfaces, and every Project goal under Chapter framing is satisfied. The forward references hold: chapter 062 layers `active()` / `archived()` lifecycle methods onto the `tenantDb` shape, chapter 071 dispatches notifications on `invitation.sent` / `member.role-changed`, chapter 074 rate-limits `sendInvitation`, and chapter 081 hardens the audit + retention story.
