# Chapter 059 · Lesson 1 — Project overview

## Lesson title

- **Page title:** Project overview
- **Sidebar title:** Project overview

The chapter-outline title fits the contract (the first project lesson is always "Project Overview"); keep it.

## Lesson type

`Project overview` — the first project lesson. No feature is built; the test-coder does not run for this lesson. The writer renders the Project-overview section list.

## Lesson framing

The student leaves with the chapter 055 single-user dashboard running locally and a clear map of the multi-tenant SaaS they will turn it into: organizations on the session, a `tenantDb` facade and an `authedAction` wrapper that make the two highest-frequency multi-tenancy bugs (missing org filter, missing role check) refuse to compile, an append-only `audit_logs` table the database itself protects, and a signed invite link that walks a stranger from email to a seat. The payoff of this lesson is orientation, not code: the student sees how the five build lessons compose, why server-side authorization is the load-bearing defense (the inspector renders privileged controls to every role on purpose), and gets the starter running so lesson 2 starts on a green dev server.

## Lesson sections

Project-overview contract: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No exercises, no quiz.

### What we're building (intro, no header)

One paragraph: the chapter 055 single-user dashboard becomes a multi-tenant SaaS with three roles (`owner` / `admin` / `member`), an audit trail, and an invitation handshake. By the end the student has organizations on the session, an `authedAction` wrapper that refuses under-privileged callers, an append-only `audit_logs` table the database protects, and a signed invite link that carries a stranger from email to a seat. Frame the payoff in senior terms: the value is the structural guarantees (bugs that can't compile, an audit table that can only grow), not the keystrokes.

One figure right after the paragraph: a `Screenshot` of the finished `/inspector` page — members panel with its role-change `<Select>`, invite form, pending panel, live audit-log tail. If a second capture is cheap, pair it (use `TabbedContent` around two `Screenshot`s) with the invite flow (admin invites → email arrives → invitee clicks → accept screen → dashboard) and the inline role-refusal message a `member` acting identity sees. Wrap in `Figure` with a one-line caption. Screenshots are produced later by the screenshotter — brief the shots, don't fabricate them.

### What we'll practice

Bulleted list (`What we'll practice` header), skills-framed not feature-framed. Cover:
- Modeling multi-tenancy: organizations as the tenancy unit, `activeOrganizationId` on the session, a `requireOrgUser` helper returning `{ user, orgId, role }` from the validated session.
- Making the two highest-frequency multi-tenancy bugs structurally impossible: missing org filter (via `tenantDb`), missing role check (via `authedAction`).
- Treating an audit trail as compliance data: append-only by application discipline *and* a Postgres RLS deny policy, written in the same transaction as the work it records.
- Designing a capability-bearing URL: a 32-byte token plus an HMAC signature, hashed at rest, sent only after the transaction commits.
- Reading server-side authorization as the load-bearing defense — the inspector renders privileged controls to every role on purpose, so the refusal is observable.

Keep each bullet to the skill and its senior reasoning; do not preview implementation detail (that lives in the build lessons).

### Architecture

Shape only — a labeled list grouped into the four layers plus the verification surface. Prefer the labeled list over a diagram; if a diagram clarifies, a single `ArrowDiagram` inside a `Figure` showing the request path (Server Action → `authedAction` → `requireOrgUser` → `withTenant` tx → `tenantDb` write + `logAudit`) is the one worth drawing — but only if prose can't carry it. Layers:
- **Session layer.** Better Auth's organization plugin owns `organization` / `member` / `invitation`; the student adds `activeOrganizationId` to `session` and `tokenHash` / `acceptedAt` to `invitation`. A `session.create` hook seeds the initial active org.
- **Access layer.** `requireOrgUser()` resolves the acting `{ user, orgId, role }`; `tenantDb(orgId)` is the only scoped data facade; `authedAction(role, schema, fn)` is the only privileged Server Action shape. Both compose the org predicate so omitting it doesn't compile.
- **Audit layer.** `auditLogs` carries RLS: per-org SELECT/INSERT keyed on `current_setting('app.org_id')`, plus deny-everything UPDATE/DELETE. `withTenant(orgId, fn)` opens the transaction that sets the session variable; `logAudit(tx, event)` writes one row and refuses to run outside a transaction.
- **Invitation layer.** `signedInviteUrl` / `verifyInviteSignature` bracket the capability URL; `sendInvitation` writes the row + audit event then emails after commit; the provided `/accept-invite` Server Component runs the verify ladder and branches across arrival surfaces; `acceptInvitation` joins, audits in one transaction, then switches the active org after commit.
- **Verification surface.** A provided `/inspector` Server Component plus its seed (2 orgs, 4 mixed-role users, 1 pending invite, 1 seeded audit row) exercise every helper and action; a dev-only acting-user switcher toggles identities without sign-out.

Naming guard: this project wires RLS *only* on `audit_logs`; application-layer scoping via `tenantDb` holds everywhere else. Say so once here so the writer doesn't imply RLS is everywhere.

### Starting file tree

Use `FileTree`. Annotate the top-level layout, commenting only on files changed from the chapter 055 / chapter 050 carry-in or that the build lessons touch; leave the rest uncommented. Mark the TODO-stub files as the highlighted focus (the start and solution trees are identical — every difference is a stub body). Group the highlighted stubs by the lesson that fills them, in build order:
- **L2:** `src/lib/auth.ts` (org plugin + active-org hook + `requireOrgUser`), `src/lib/auth-schema.config.ts` (mirror), `src/lib/auth/roles.ts`, `src/app/(protected)/inspector/_data.ts`.
- **L3:** `src/db/audit.ts`, `src/db/index.ts` (spread `auditSchema`), `src/db/audit-log.ts`, `src/db/tenant.ts` (`withTenant`), `src/db/queries/audit.ts`.
- **L4:** `src/db/tenant.ts` (`tenantDb` facade), `src/db/queries/members.ts`, `src/lib/auth/authed-action.ts`, `src/lib/invitations/manage.ts`.
- **L5:** `src/env.ts` (`INVITATION_SIGNING_SECRET`), `src/lib/invitations/url.ts`, `src/lib/invitations/send.ts`, `src/db/queries/invitations.ts` (`listPendingInvitations`), `src/emails/invite.tsx`.
- **L6:** `src/lib/invitations/accept.ts`, `src/db/queries/invitations.ts` (`getInvitationById`).

Two short notes after the tree:
- The Better Auth CLI is the canonical way to add plugin-owned columns: `pnpm auth:generate` reads `src/lib/auth-schema.config.ts`, regenerates `src/db/schema/auth.ts` after the org plugin lands, and the student commits the diff. Hand-editing the generated schema is review-loud.
- The inspector's "switch acting user" cookie is dev-only (`NODE_ENV !== 'production'`); the same affordance in production would be a privilege-escalation vector.

Keep the tree readable — top-level layout with the touched/stub files annotated, not a 100-line dump. The full annotated tree lives in the chapter framing; reproduce the shape, not every leaf.

### Roadmap

A `CardGrid` of five `Card`s, one per build lesson, each titled with the lesson number + title and one sentence naming what it adds:
- **Lesson 2 — Organization plugin and the active-org session.** Installs the organization plugin, seeds `activeOrganizationId` on session create, ships `roleAtLeast` + `requireOrgUser` so the inspector renders the active-org banner.
- **Lesson 3 — Append-only audit_logs with RLS.** Lays down the `auditLogs` table with deny-UPDATE/DELETE policies and the transaction-required `logAudit(tx, event)` writer behind `withTenant`.
- **Lesson 4 — Scoped data, the action wrapper, and role changes.** Builds the `tenantDb(orgId)` facade and the `authedAction(role, schema, fn)` wrapper, then ships `changeMemberRole` (refuses owner targets and last-owner demotion, audits in-transaction).
- **Lesson 5 — Send an invitation with a signed accept URL.** Generates the token, hashes at rest, HMAC-signs the URL, writes row + audit event in one transaction, sends the React Email after commit.
- **Lesson 6 — Accept the invitation behind the provided arrival surfaces.** Ships `acceptInvitation` (and `getInvitationById`) behind the provided `/accept-invite` page — joins the org, auto-verifies email, audits in one transaction, switches the active org after commit.

### Setup

`Steps` component, exact commands in order. First step must point at the project repository per the contract:
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 059/start/`.
2. `pnpm install`
3. `docker compose up -d` (starts local `postgres:18`).
4. `cp .env.example .env`, then fill the secrets below.
5. `pnpm db:migrate && pnpm db:seed`
6. `pnpm dev`

Note the chapter-framing setup also shows a `npx degit` alternative; the contract's first step (clone from the project repo `Chapter 059/start/`) is canonical — lead with that.

Env var list (`.env`; defaults already point at the docker-compose Postgres). For each: name, purpose, how to obtain:
- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — both point at local Postgres; pooled/unpooled split exists so Unit 20 can plug Neon in without renaming. Provided default.
- `BETTER_AUTH_SECRET` — chapter 055 auth secret; generate via `openssl rand -base64 32` if not carried in. `BETTER_AUTH_URL` is the app origin.
- `RESEND_API_KEY` / `EMAIL_FROM` / `EMAIL_REPLY_TO` — the chapter 050 verified-domain sender. Flag the hard prerequisite: a verified domain is required for the lesson-6 accept-the-invite verification — Resend's sandbox sender will not deliver to a personal inbox.
- `INVITATION_SIGNING_SECRET` — 32-byte HMAC key for signing accept URLs, distinct from `BETTER_AUTH_SECRET` (different rotation cadence, different blast radius); generate via `openssl rand -base64 32`. This is the lone env the student adds (in `src/env.ts`, lesson 5) — note it now, add it then.
- `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_URL` — app identity; `NEXT_PUBLIC_APP_URL` is the base host for the signed accept URL.

Use `Code` for the command blocks. A small env table (name · purpose · how to obtain) reads cleaner than prose here.

**Expected result** (one sentence + a short caveat): `pnpm dev` serves the chapter 055 sign-up / sign-in / sign-out / `/dashboard` flow. `/inspector` resolves to placeholder panels because `getInspectorContext` and its helpers are stubs that return empty/placeholder data rather than throw — the real org context arrives in lesson 2. No org schema, no audit table, and no scoped data layer exist yet. Close with an `Aside` (tip) that a green `pnpm dev` and the placeholder inspector are the correct lesson-1 finish line.

## Scope

- No feature is built here; the running starter is the only deliverable. Each capability is owned by its build lesson (see Roadmap).
- Technology rationale (why the organization plugin, why RLS, why HMAC-signed URLs) belongs in the regular Unit 9 teaching chapters (056–058) and the relevant build lesson's *Coding time*, not in this overview.
- RLS is wired only on `audit_logs` (the lesson 3 of chapter 056 senior call); do not imply RLS covers other tables — application-layer scoping via `tenantDb` holds elsewhere.
- Scope cuts that stay out of the whole project: no leave-org / ownership-transfer actions (chapter 057 lesson 4 owns the full set), no fine-grained permissions / SCIM / bulk invites / teams, no invite-send rate-limiting (chapter 074), no seat-counting / entitlement gate (chapter 064).
