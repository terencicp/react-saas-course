# Owner, admin, member

Title: Owner, admin, member
Sidebar label: Owner, admin, member

## Lesson framing

This is a **decision-plus-mechanics** lesson, the RBAC foundation the rest of the chapter rides on.
The student already has orgs (`organization` + `member` tables), `activeOrganizationId` on the session, `tenantDb(orgId)`, and a stub `requireOrgUser()` returning `{ user, orgId }`.
They leave knowing the year-1 three-role default, the authority gradient, the single-owner invariant, a `roleAtLeast` helper, a typed `Role` union, and a `requireOrgUser()` that returns the role plus thin `requireAdmin` / `requireOwner` guards.

Central mental model the student must end with: **roles are an ordered authority gradient (`member < admin < owner`) that we codify in exactly one place, and every authz decision compares against that order — never an ad-hoc `role === 'admin' || role === 'owner'`.**
The load-bearing senior insight, surfaced by research: Better Auth's organization plugin models roles as **independent permission bags, not a hierarchy** — so the total ordering the app reasons in (`roleAtLeast`) is something the team builds, it is not free. That is *why* this lesson exists: the plugin owns the column and the three default names; we own the ordering and the comparison discipline on top.

Where beginners go wrong (frame these as the pain the lesson relieves):
- Scattering `if (role === 'admin' || role === 'owner')` across actions → one new role or one rename breaks dozens of sites silently. The fix is one `roleAtLeast` + one exported union.
- Putting role on `user` (`isAdmin: true`) instead of on `member` → couples role to the human across orgs; the same person is admin in Acme, member in Beta. One `(orgId, userId)` row is the only correct shape.
- Trusting a role baked into the session/cookie across a demotion → stale authority. Read the role at request time inside the helper.
- Treating the single-owner invariant as "the UI prevents it" → it doesn't; the guard belongs in the mutation helper.
- Gating only the UI (hide the button) and forgetting the server gate → the button is cosmetic, the action gate is the boundary.

Teaching stance: lead with a concrete three-teammate scenario (decisions before syntax), land the gradient with one earns-its-weight capability table, then the small primitives (`Role`, `ROLE_RANK`, `roleAtLeast`, extended `requireOrgUser`, `requireAdmin`/`requireOwner`).
Keep code shapes small — this lesson is the *vocabulary* the next four lessons consume; it should not drift into the `authedAction` wrapper (lesson 2) or the member-management flows (lesson 4).
Cognitive-load discipline: introduce the three roles first, *then* the gradient detail, *then* the invariant, *then* the helper, *then* the request-time read — each builds on the last.

Estimated student time: 35–45 min.

## Lesson sections

### Three teammates, one org

Open with the senior question as a concrete scene (no heading reading "the senior question" — bake it into prose).
Three people share one org: one signed the contract and owns billing, one administers users and settings, one does the day-to-day work.
Pose the four questions the lesson answers: what roles does a year-1 SaaS ship with, where is the role stored, how does a new member get the right role, and when does the product outgrow this into a real permissions matrix.
Land the thesis up front: **three roles, not a permission matrix** — `owner` / `admin` / `member` covers the 80% case; the granular-permissions reach is *triggered by a paying customer asking* ("we need an 'approver' that can do X but not Y"), named here, not built.
Connect to prior knowledge: Chapter 056 gave them the `member` table with a `role` column already present (Better Auth's plugin owns it, defaulting to `'member'`); this lesson gives that column meaning.

Reasoning: the course's pedagogy is decisions-before-syntax and trigger-before-tool; the conditional (permissions matrix) must be named with its trigger at the top so the student knows the boundary of the default.

### What each role can do

Teach the authority gradient as a single source-of-truth document, not scattered checks.
The earns-its-weight visual is **one capability table** — rows = capabilities, columns = `member` / `admin` / `owner`, cells = check/blank. Use a `Code`-free HTML table (Starlight markdown table is fine) inside the prose. Suggested rows:
- Read/write content, edit own profile, leave org → all three.
- Invite / remove members, change roles up to admin, edit org settings, view audit log → admin + owner.
- Billing & plan changes, transfer ownership, delete the org → owner only.

State the gradient is cumulative: owner does everything admin does plus the owner-only column; admin does everything member does plus the admin column.
Senior reflex to land: the role-to-capability map is **one document everyone reads when adding a privileged action**, conceptually living in `lib/auth/roles.ts` — not re-derived per action.

Crucial research-grounded callout (place it here): Better Auth's plugin defines these same three roles, and its `admin` is specifically "full control except deleting the org or changing the owner" — so the table matches the library's own defaults; we are documenting the contract, not inventing it.
Also name once, with its trigger: the plugin supports custom roles via its access-control system (`createAccessControl` + `roles`) for the day the product needs them — conditional reach, not year-1.

Reasoning: a table is the highest-density way to teach a gradient and the outline explicitly calls for "one short table." Keep it to ~7 rows so it stays glanceable on a short laptop viewport.

### Every org keeps at least one owner

Teach the single-owner invariant as a guard rail, not a convention.
State the invariant plainly: at all times, an org has ≥1 owner.
Enumerate the **three flows that can violate it** (these are *named here, enforced in lesson 4* — do not build the actions): removing the last owner, demoting yourself when you're the last owner, leaving the org as the last owner.
Land where the check lives: **in the helper that performs the mutation, never in the UI** — the UI only renders the resulting error message.
Give the canonical shape the student will reuse: one query (`select count(*) ... where organizationId = $1 and role = 'owner'`) and one error code `'last-owner'`.

Show the count-check as a small `Code` block (Drizzle `count` form, ~5 lines) so the student sees the concrete query, but frame it as "this is the guard the lesson-4 actions will call," not a full action.

Reasoning: the invariant is conceptually simple but is the highest-stakes correctness rule in member management; isolating it now (one place, one query, one code) sets up lesson 4 cleanly and demonstrates the "guard rail in the mutation helper" principle.

### Ordering roles: the roleAtLeast helper

This is the technical heart of the lesson. Teach that roles form a **total order** `member < admin < owner` and that the app must encode it because the library does not.

Use **AnnotatedCode** on one small file (`lib/auth/roles.ts`) stepped through: the `Role` union type, the `ROLE_RANK` const map, the `roleAtLeast(role, required)` function. Suggested steps:
1. `export type Role = 'owner' | 'admin' | 'member'` — the union, exported, consumed everywhere a role is named (`color="blue"`).
2. `const ROLE_RANK = { member: 0, admin: 1, owner: 2 } as const satisfies Record<Role, number>` — the order in one place; `as const` keeps it narrow, `satisfies` proves every role has a rank (`color="green"`).
3. `export const roleAtLeast = (role: Role, required: Role): boolean => ROLE_RANK[role] >= ROLE_RANK[required]` — annotate the return type (exported boundary); the comparison is the whole point (`color="green"`).

Drive the senior reflex hard: this **replaces** ad-hoc `role === 'admin' || role === 'owner'` checks. Show the wrong shape and the right shape briefly with **CodeVariants** (label "Scattered" vs "Ordered"): the scattered version has the OR sprinkled in two call sites; the ordered version calls `roleAtLeast(role, 'admin')`. First sentence of each variant carries the framing ("breaks on a rename" vs "one source of truth").

Research-grounded justification to include: because Better Auth stores roles as independent permission bags with no inherited hierarchy, "owner can do everything admin can" is *not* automatic — `roleAtLeast` is the helper that makes the gradient real in code.

Exercise: a **TypeCoding** widget. Give the student a `Role` union and a half-written `roleAtLeast` and have them complete it so the type stays narrow and the comparison is correct. Use an `expectedQueries` `^?` row pinning `keyof typeof ROLE_RANK` (or the `Role` union) to `'"owner" | "admin" | "member"'`, plus the implicit "fix the errors" goal via a `satisfies Record<Role, number>` that fails until every role has a rank. This checks the exact misconception (forgetting a role in the rank map) at the type level, no runtime needed. TypeCoding is the right fit: this is a pure type/ordering exercise.

Reasoning: AnnotatedCode focuses attention on three distinct lines of one tiny file; CodeVariants makes the wrong-then-right contrast explicit; TypeCoding lets the student feel the type system catch the missing-rank bug — the precise failure the lesson warns about.

### The role at request time: extending requireOrgUser

Teach extending the Chapter-056 stub `requireOrgUser()` from `{ user, orgId }` to `{ user, orgId, role }`.
Core discipline: **the role is read once per request inside the helper**; every privileged check reads `role` off the helper's return value and never re-queries.

Research-grounded mechanics (give the writer the real API): Better Auth exposes `auth.api.getActiveMemberRole({ headers })`, an endpoint optimized for exactly this permission-check read, and the broader `getActiveMember`. Note the known gotcha surfaced in research: the active-org **role is not stored on the session payload by default** — so `requireOrgUser` reads it via `getActiveMemberRole` (or a `customSession` field), it does not just pluck it off `session`. This is *why* "read per request in the helper" is the shape, not an arbitrary preference.
Tie to conventions: `requireOrgUser(role?)` is already the canonical signature in the code conventions and is React-`cache`d so the underlying session/role read runs once per request — the helper here matches that, it does not invent a parallel `getSession` path.

Show the extended helper as a `Code` block (~10 lines): call the existing session read, resolve `orgId`, read the role via `getActiveMemberRole`, redirect/`notFound` on the missing branches, return `{ user, orgId, role }`. Keep it minimal — the full session-read ladder belongs to Chapter 052; here we only add the role.

Then teach the **two thin guards** the student writes in `lib/auth/guards.ts`:
- `requireAdmin()` — calls `requireOrgUser()`, `redirect('/')` (or `notFound()`) when `roleAtLeast(role, 'admin')` is false, else returns the same `{ user, orgId, role }`.
- `requireOwner()` — same shape against `'owner'`.

Frame these as the **page/Server-Component route-protection seam**: a Server Component in an admin-only route group calls `requireAdmin()` at the top. Explicitly forward-reference that the **next lesson generalizes this discipline to the Server Action boundary** with `authedAction` — these guards protect *rendering*; the action wrapper protects *mutations*.

Reasoning: this is the request-lifetime mechanic that makes the whole RBAC layer trustworthy. Reading role per request (not from a stale cookie) is the watch-out the outline stresses; grounding it in the real `getActiveMemberRole` API and the session-doesn't-carry-role finding makes the lesson accurate and durable.

### Roles you don't assign by hand

Group the small "role is set for you" facts the student must *know* but writes no code for. Keep this tight.

- **First member is owner.** The user who creates the org gets `role: 'owner'` on their `member` row — Better Auth's `organization.create` writes it. No code; the student verifies the row shape after creating an org (callback to Chapter 056's create flow).
- **Invitation acceptance copies the invited role.** When a member accepts an invite (Chapter 058), the role on `invitation.role` becomes the new `member.role`. The inviter chose the role at invite time; acceptance is a no-decision step. Named here so Chapter 058 has the contract; implementation is Chapter 058.

Reasoning: these close the "how does a member get the right role" question from the intro without expanding scope. A short `Aside` (note) or two tight paragraphs is enough — no diagram, no exercise.

### When three roles aren't enough

Close the lesson by naming the boundary of the default — the "what this is not" content, framed as a real decision rather than a disclaimer.

- **Fine-grained permissions / ABAC / customer-authored roles** are the conditional reach, not year-1. Restate the trigger: a paying customer names a seat the three roles can't express ("approver", "editor" with a specific carve-out). Until then, three roles ship the product; the permissions layer is premature.
- Name once that Better Auth supports this growth path (access-control `createAccessControl` + `roles`, and dynamic per-org roles) so the student knows the escape hatch exists without building it.
- The **"view as member" trap**: some products let an admin preview what a member sees. The senior reflex — never fake the role in the session/authz; make `viewAs` a UI-only rendering mode while *every server-side check still reads the real role* from `requireOrgUser`. View-as is a UI mode, not an authz mode.

Optional reinforcement exercise (only if it earns its place): a short **MultipleChoice** or **TrueFalse** round on the two highest-value misconceptions — "role belongs on `user`" (false; on `member`) and "the session role is safe to trust after a demotion" (false; read per request). Keep to 2–3 statements; the chapter quiz (lesson 6) owns full recall.

Reasoning: trigger-before-tool demands the conditional be named with its threshold. The view-as trap is a common real-world authz mistake worth inoculating against here, where the student is forming the "authz reads the real role" reflex.

#### Terms for Tooltip

Use `Term` sparingly, only where it avoids breaking flow:
- **RBAC** — "Role-Based Access Control: permissions are attached to roles, and users get permissions by holding a role."
- **ABAC** — "Attribute-Based Access Control: access decided by attributes of the user, resource, and context, not a fixed role." (only at its single mention in the last section)
- **invariant** — "A condition the system guarantees is always true; code is written so it can never be violated." (at the single-owner section, if the student audience benefits)

Do not over-tag; `owner`/`admin`/`member` are defined inline by the capability table and need no tooltip.

## Scope

Prerequisites to restate concisely (do not re-teach): the `member` table and its `role` column, `activeOrganizationId` on `session`, `tenantDb(orgId)`, and the stub `requireOrgUser()` returning `{ user, orgId }` — all from Chapter 056. One sentence each, as callbacks.

This lesson does **not** cover:
- The `authedAction(role, schema, fn)` Server Action wrapper — lesson 2. (Only forward-reference it as "the action-boundary generalization of `requireAdmin`.")
- The `authedRoute` route-handler twin — lesson 3.
- The five member-management flows (list, change role, remove, leave, transfer ownership) — lesson 4. This lesson *names* the single-owner invariant and the `'last-owner'` code and the count query, but builds none of the actions.
- The `audit_logs` table and what gets recorded — lesson 5.
- Fine-grained permissions, ABAC, custom/dynamic roles — named once with their trigger, not built.
- Invitation-time role choice and the accept handshake — Chapter 058 (named once for the contract).
- The Better Auth plugin install, `organization.create`, org switching, session-creation hooks — owned by Chapter 056 lesson 1; reference, don't re-teach.
- The full session-read ladder (`getCurrentUser` / `requireUser`) and cookie-cache staleness mechanics — Chapter 052; only the role extension to `requireOrgUser` is in scope.

## Notes for downstream agents (research-grounded corrections)

- The chapter outline guessed an `organization({ allowedRoles: [...] })` option. **That option name is not how the current plugin works.** Custom roles are configured via the access-control system: `const ac = createAccessControl(statement)` then `organization({ ac, roles: { owner, admin, member } })`. For year-1 the student does **not** configure custom roles at all — the three defaults are built in. Mention the `ac` + `roles` path only as the named future reach; do not write an `allowedRoles` config.
- Better Auth roles are **independent permission bags, not an ordered hierarchy** — this is the justification for building `roleAtLeast` and the `ROLE_RANK` map ourselves. Make this explicit; it is the lesson's core "why."
- The active-org **role is not on the session payload by default**. `requireOrgUser` should read it via `auth.api.getActiveMemberRole({ headers })` (or a `customSession` field), not by reading `session.role`. Use `getActiveMemberRole` as the canonical read in the extended helper.
- Keep all code aligned with conventions: `type` (not `interface`), string-literal union for `Role` (never `enum`), `as const` + `satisfies` on `ROLE_RANK`, annotate exported return types, `lib/` files start with `import 'server-only';` where they touch `auth`. `requireOrgUser(role?)` is the conventions' canonical signature — the guards `requireAdmin`/`requireOwner` are thin wrappers, consistent with the conventions' `require*` redirect-on-miss intent.
