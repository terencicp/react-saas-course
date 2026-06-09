# Lesson 2 — Organization plugin and the active-org session

- **Sidebar title:** Org plugin & active org
- **Type:** Implementation

## Lesson framing

The student installs Better Auth's organization plugin as the canonical source for the tenancy tables, seeds the active org structurally at session-mint time rather than sprinkling a setter across every entry point, and ships the access-layer primitives (`roleAtLeast`, `requireOrgUser`) that every later privileged path leans on. The senior payoff: the active org lives on the session and is seeded in the *one* place all auth flows converge, and `requireOrgUser` reads the role fresh from the database — not the cookie cache — so a role change is correct within seconds instead of stale for the `freshAge` window.

## Codebase state

**Entry.** The chapter 055 single-user auth flow runs: sign-up / sign-in / sign-out / `/dashboard`, with `user` / `session` / `account` / `verification` tables and `getCurrentUser` / `requireUser` in `src/lib/auth.ts`. The organization plugin is *not* installed — `auth.ts` and `auth-schema.config.ts` carry the chapter 055 instance with no `organization()`, `roles.ts` has stubbed `ROLE_RANK` / `roleAtLeast`, `requireOrgUser` is a stub, `_data.ts`'s `getInspectorContext` returns placeholders. `/inspector` resolves to empty-state placeholder panels. No `organization` / `member` / `invitation` tables, no `session.activeOrganizationId` column.

**Exit.** The organization plugin is registered in `auth.ts` (before `nextCookies()`) and mirrored in `auth-schema.config.ts`; `pnpm auth:generate` has regenerated `src/db/schema/auth.ts` with the `organization` / `member` / `invitation` tables, `session.activeOrganizationId`, and `invitation.tokenHash` / `acceptedAt`, and the migration is applied. A `session.create.before` hook seeds `activeOrganizationId` from the user's first membership. `roleAtLeast` orders the three roles; `requireOrgUser` returns `{ user, orgId, role }` (role read fresh via `getActiveMember`) or redirects. `getInspectorContext` resolves the real acting identity with the dev cookie override. `/inspector` renders the active-org banner, org switcher, and acting-user switcher against live data. The members/pending panels and audit tail still show empty states (their backing helpers and tables arrive in lessons 3-4).

## Lesson sections

### Goal + Finished result (intro, no header)

One sentence: by the end, `/inspector` resolves a real org context — the active-org banner shows the acting user's org name and role, and the dev acting-user / org switchers re-render it. Pair with a `Screenshot` (or one-paragraph description) of the inspector banner showing Alice's owner role for Acme with the four seeded users in the acting-user dropdown. Note the rest of the page is still empty placeholders.

### Your mission

Prose paragraph weaving the capability and constraints (no implementation hints, no subsection headers). Convey, in the project's terms:

- The organization plugin is the canonical owner of `organization` / `member` / `invitation` — these are not hand-written. It is registered with teams disabled, a seven-day invitation expiry named as a constant, and `schema.invitation.additionalFields` for the server-managed (`input: false`) `tokenHash` / `acceptedAt` this project layers on.
- The plugin config must be mirrored into the server-only-free CLI config (`auth-schema.config.ts`) that `auth:generate` reads, then the CLI regenerates the Drizzle schema and the student commits the diff — hand-editing the generated file is review-loud.
- The active org belongs on the session; a `session.create.before` hook is the single structural place to seed it, because every entry point that mints a session (sign-in, sign-up, verification) flows through it. Don't scatter the setter.
- `requireOrgUser` reads the role fresh from the DB (not the session cookie cache, which can carry a stale role for the `freshAge` window); the active-org id comes only from the server-validated session, never a query string or route param.

**Functional requirements** (woven as a `Checklist` with `tested`/`untested` chips, phrased as outcomes):

1. `[untested]` The `organization`, `member`, `invitation` tables exist in the migrated schema, and `session` carries an `activeOrganizationId` column, after the regenerated auth schema is committed and migrated.
2. `[untested]` A newly created session has `activeOrganizationId` populated to the user's first membership, confirmed for the four seeded users.
3. `[tested]` `roleAtLeast` orders the three roles correctly: a member does not satisfy `admin`; an admin satisfies `admin` but not `owner`; an owner satisfies all three.
4. `[tested]` `requireOrgUser()` returns `{ user, orgId, role }` for a member of the active org, redirects to `/onboarding/create-org` when no active org is set, and redirects there again when `getActiveMember` returns no membership.
5. `[untested]` The inspector's active-org banner renders the acting user's org name and role; switching acting users via the dev cookie re-renders the banner with the new identity.
6. `[untested]` Switching the active org via the org switcher refreshes the layout and the banner shows the new org.
7. `[untested]` A fresh signup with no orgs lands on `/onboarding/create-org`; submitting creates the org and redirects to `/dashboard` with the new org active.

**Out of scope** (one line): the create-org onboarding page and the org/acting-user switcher client components are provided — verify them, don't re-implement.

### Coding time

One line directing the student to implement against the brief and `pnpm test:lesson 2`, then the reference walkthrough (writer wraps in `<details>`). Organized as it appears in the repo:

- **`src/lib/auth/roles.ts`** — `ROLE_RANK = { member: 0, admin: 1, owner: 2 } as const satisfies Record<Role, number>` and `roleAtLeast`. Use `Code`. Callout: no `import 'server-only'` here — pure role vocabulary, safe for client components (the role select renders client-side). `Role` type is provided.
- **`src/lib/auth.ts` — the `organization()` plugin** added to `plugins`, kept *before* `nextCookies()`. Use `AnnotatedCode` to direct focus across the moving parts: (a) `nextCookies()` stays last because it flushes `Set-Cookie` from the action response — out of order, sign-in succeeds server-side but no cookie lands; (b) `teams: { enabled: false }` and `invitationExpiresIn: INVITATION_TTL_SECONDS` (module-scope constant); (c) `additionalFields` with `input: false` so the app, not the API caller, sets `tokenHash` / `acceptedAt`.
- **`src/lib/auth.ts` — `pickInitialActiveOrg` + the `databaseHooks.session.create.before` hook.** Rationale (one or two sentences each): the hook spreads the existing session and adds `activeOrganizationId` from the user's first membership; it is the single setter because all session-minting flows converge here. `findFirst` suffices — one org per user in this project.
- **`src/lib/auth-schema.config.ts` — the mirror.** Use `CodeVariants` to compare the runtime `auth.ts` plugin block against the CLI mirror, surfacing the delta: the mirror carries only schema-shaping options (no `databaseHooks`, no `invitationExpiresIn`, `additionalFields` without `input: false`) and stays server-only-free because the CLI's jiti loader executes its whole import graph. Cover the `pnpm auth:generate` → commit-the-diff workflow as a `Steps` block.
- **`src/lib/auth.ts` — `requireOrgUser`.** `AnnotatedCode` over the four steps: session-or-`/sign-in`, active-org-id-or-`/onboarding/create-org`, `getActiveMember` (a fresh DB read) -or-`/onboarding/create-org`, return `{ user, orgId, role }`. Rationale: role read fresh from `getActiveMember` rather than the session cookie cache (stale-role window); wrapped in `cache()` to dedupe the per-request read; orgId sourced only from the validated session.
- **`src/app/(protected)/inspector/_data.ts` — `getInspectorContext`.** `Code` (longer block). Cover the `[untested]` organization concerns: the dev-only acting-user cookie override lives *here* in the read path and never touches `requireOrgUser`, so privileged actions still resolve identity from the validated session — the dev cookie cannot spoof a mutation. Note the `cache()` dedupe across the page's Suspense panels.

For the CLI-generated `schema/auth.ts`: do not reproduce the full generated file — link the `auth:generate` step and show only the diff shape (new tables + `session.activeOrganizationId` + invitation columns).

Link rather than re-explain: lesson 1 of chapter 056 (organizations / active org as the tenancy model), lesson 1 of chapter 057 (RBAC, `roleAtLeast`, `requireOrgUser`), lesson 3 of chapter 052 (the cookie-cache `freshAge` window).

No diagram required — the moving parts are code surfaces best carried by `AnnotatedCode`, not a flow a diagram clarifies better than prose.

### Moment of truth

Test command `pnpm test:lesson 2` and the expected pass output. The suite asserts the role ordering of `roleAtLeast` and the redirect/return behavior of `requireOrgUser` across the active-org-present, no-active-org, and no-membership cases (requirements 3-4).

Then a `Checklist` of the by-hand confirmations the tests don't cover, each phrased as an outcome the student ticks:

- After `pnpm db:migrate`, `pnpm db:studio` shows the `organization` / `member` / `invitation` tables and the `session.activeOrganizationId` column. (req 1)
- `/inspector` renders the active-org banner with Alice's (owner) role; the four seeded users appear in the acting-user switcher. (reqs 2, 5)
- Switching acting users re-renders the banner with the new identity; switching orgs refreshes the layout and shows the new org. (reqs 5, 6)
- A fresh signup with no orgs lands on `/onboarding/create-org`, and submitting redirects to `/dashboard` with the new org active. (req 7)

Close with the carry-forward note: the members/pending panels and the audit tail still render empty states because `listMembers`, `tenantDb`, `logAudit`, and the audit table don't exist yet (lessons 3-4).

## Scope

This lesson installs the tenancy tables and the access primitives only. It does **not** build: the `auditLogs` table or `logAudit` writer (lesson 3), the `tenantDb` scoped-read facade or `withTenant` transaction (lessons 3-4), the `authedAction` wrapper or any privileged action (lesson 4), or the invitation send/accept flow (lessons 5-6). The create-org onboarding page and the switcher client components are provided carry-in, verified here but owned by the chapter 056 teaching lessons.
