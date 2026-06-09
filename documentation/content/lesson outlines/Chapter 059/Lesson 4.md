# Lesson 4 — Scoped data, the action wrapper, and role changes

## Lesson title

- Full: **Scoped data, the action wrapper, and role changes** (chapter-outline title fits — it names the two helpers and the action that exercises them).
- Sidebar: **Scoped data and the action wrapper**

## Lesson type

`Implementation`

(Test-coder runs for this lesson; the writer renders the Implementation section list. The `tests/lessons/Lesson 4.test.ts` in the repo is a `describe.todo` stub the test-coder fills next.)

## Lesson framing

The student installs the two helpers that make the highest-frequency multi-tenancy bugs structurally impossible — the missing org filter and the missing role check — and proves them through the first privileged write.
`tenantDb(orgId)` is the only scoped data facade (omit the org predicate and it doesn't compile); `authedAction(role, schema, fn)` is the only call shape a privileged Server Action takes (review catches anything that reproduces its checks inline).
The payoff is a senior reflex: don't trust developers to remember the filter and the role gate at every call site — encode both into a shape that fails closed at the type level, then route the role-change action through them with its audit row co-transacted so a role can never change without its record.

## Codebase state

### Entry

After lesson 3 the audit layer is live: `src/db/audit.ts` holds the `auditLogs` table with org-isolation + deny-UPDATE/DELETE RLS policies; `src/db/audit-log.ts` exports the transaction-required `logAudit(tx, event)`; `src/db/tenant.ts` already exports `withTenant(orgId, fn)` (the `set_config('app.org_id', ...)` transaction) from lesson 3; `src/db/index.ts` spreads `auditSchema`; `src/db/queries/audit.ts` resolves `auditLogCount` / `recentAuditLogs` through `withTenant`, and the inspector's raw-helpers panel shows the seeded count (1 for Acme).
From lesson 2 the org plugin, the active-org session slot, `roleAtLeast`, and `requireOrgUser()` returning `{ user, orgId, role }` are in place and the active-org banner renders.
Still stubbed: the `tenantDb(orgId)` facade in `src/db/tenant.ts`, `listMembers` in `src/db/queries/members.ts`, the `authedAction` factory in `src/lib/auth/authed-action.ts`, and `changeMemberRole` in `src/lib/invitations/manage.ts`.
The inspector's members panel and audit tail render but the role-change `<Select>` posts to a stub; the invite/accept flow does not exist yet.

### Exit

`tenantDb(orgId)` is the scoped facade over Drizzle (`.query.member|invitation`, `.insert`, `.update`, `.delete`, all composing the org predicate; `TENANT_TABLES = { member, invitation }` is the type source so `tenantDb(orgId).query.user` is a type error).
`authedAction(role, schema, fn)` wraps every privileged action in four steps (resolve → authorize → parse → call) and hands the body a `ctx` carrying `db: tenantDb(orgId)`, `ip`, `userAgent`.
`changeMemberRole` ships: refuses owner targets and last-owner demotion (`conflict`), writes the role change and the `'member.role-changed'` audit row in one `withTenant` transaction, then `revalidatePath('/inspector')`.
In the inspector, the admin acting user changes a member's role and the audit tail gains the row; the member acting user gets `forbidden` with no DB change and no audit row; the raw-helpers count increments only on successful changes.
The invite flow still does not exist — that arrives in lesson 5.

## Lesson sections

Implementation type. Sections in contract order.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: install the scoped-data facade and the privileged-action wrapper, then ship the role-change action that exercises both.
Follow with a one-paragraph description (or a `Screenshot` of the inspector if the screenshotter captures it): admin acting user changes Carol's role → the audit tail shows `'member.role-changed'` with the right actor and `{ before, after }` payload; member acting user attempts the same → an inline `forbidden` message renders with nothing changed; demoting Alice (sole owner) → a `conflict` message.
Lead with the senior payoff (two structural guardrails), not the mechanics.

### Your mission

Prose paragraph, then a single numbered requirements list. No subsection headers, no implementation hints.

**Feature (user terms).** An admin can change a member's role from the inspector; the change is recorded in the audit trail; under-privileged users are refused server-side and owner targets are protected.

**Prose to weave (the senior decisions the brief surfaces):**
- `tenantDb(orgId)` is the *only* scoped data path. Its reads compose `and(eq(<table>.organizationId, orgId), caller.where)`; its insert injects `organizationId` (and throws on a mismatched one); its update/delete always `and`-in the org predicate. The org predicate is the outer `and`, so a caller's `or(...)` becomes a contradiction, not an escape hatch.
- The unwrapped `db` import is the cross-tenant escape hatch reserved for `scripts/`; the action body never reaches for it. There is deliberately no `.raw` / `allOrgs` bypass on the facade.
- `ctx.db` (the facade) is app-layer scoping only — it does *not* set `app.org_id`. The audit-bearing write goes through the separate `withTenant(ctx.orgId, ...)` (lesson 3) so the audit INSERT clears the RLS policy; reads stay on `ctx.db`.
- `authedAction(role, schema, fn)` is the *only* shape a privileged action takes. Its four fixed-order steps are `requireOrgUser()` → `roleAtLeast(actual, role)` → `schema.safeParse(Object.fromEntries(formData))` → `fn(parsed.data, ctx)`. Reproducing the checks inline is what review catches — the import shape is the contract.
- Refusals return canonical `err(...)` `Result` discriminants, never a throw: a throw 500s the action and loses the typed contract the form's `useActionState` reducer renders. The one correct throw is `requireOrgUser`'s redirect, which propagates.
- The role change and its audit row co-transact in one `withTenant` — if the audit insert fails the role change rolls back, because a role that changed with no record is the wrong direction for a compliance table. The write goes through `tx` directly, never `auth.api.*` (the plugin's after-hooks run post-commit, breaking the one-transaction contract).
- `forbidden` / `validation` messages are user-safe; the wrapper carries no logging / entitlement / rate-limit step (the user/operator split is the chapter 080 discipline, foreshadowed, not built).

**Constraints:** the inspector renders the role-change `<Select>` to *every* acting identity on purpose — the server-side refusal, not a client-side hide, is the load-bearing defense.
**Out of scope:** remove / leave-org / ownership-transfer actions (lesson 4 of chapter 057 owns the full set); the role-change action is the load-bearing one here.

**Functional requirements (numbered, each tagged):**
1. A `tenantDb(orgId)` read returns only rows for that org, and composing a caller `where` still narrows within the org. `[tested]`
2. A `tenantDb(orgId)` insert persists with `organizationId` set to that org even when the caller omits it, and throws on a mismatched `organizationId`. `[tested]`
3. `tenantDb(orgId).query.user` is a type error — global tables are unreachable through the facade. `[tested]` (type-level assertion)
4. An `authedAction` whose `role` exceeds the caller's role returns `err('forbidden', ...)` with a user-safe message and never throws. `[tested]`
5. An `authedAction` with input that fails the schema returns `err('validation', ..., fieldErrors)` and never reaches the action body. `[tested]`
6. As the admin acting user, changing a member's role updates the row and appends one `'member.role-changed'` audit row with `payload: { before, after }` and `actorUserId` matching the admin. `[tested]`
7. As the member acting user, a role-change attempt returns `forbidden` with the role row unchanged and no audit row added. `[tested]`
8. Targeting an owner returns `conflict`; targeting the sole owner returns `conflict` with the last-owner message; neither changes the DB. `[tested]`
9. The audit row and the role update land together or not at all — force-failing the update lands neither. `[tested]`
10. The inspector's `auditLogs` count increments only on successful role changes, never on rejected attempts. `[untested]` (UI/inspector observation, covered in reference + hand-check)

(Tagging note for the test-coder: the wrapper, facade, and `changeMemberRole` are pure-server units assertable in the Node env without DOM. Requirement 10 is an inspector-render outcome left to the hand-check.)

### Coding time

One line directing the student to implement against the brief and the tests, then the reference walkthrough hidden in `<details>` (the writer wraps it).
Present the four files in repo order. Use `AnnotatedCode` for `tenantDb` and `authedAction` (multiple load-bearing parts each); plain `Code` for `listMembers` and `changeMemberRole`.

- **`src/db/tenant.ts` — the `tenantDb` facade** (`withTenant` already shipped in lesson 3; show it only as context, do not re-explain). `AnnotatedCode`, highlight in steps:
  - `TENANT_TABLES = { member, invitation } as const` and `type TenantTable` — the single registry that is *both* the runtime backstop for writes and the type source for the query surface; this is why `.query.user` is a type error.
  - The `query.member|invitation.findMany/findFirst` wrappers composing `and(eq(table.organizationId, orgId), config?.where)`, cast `as typeof db.query.member.findMany` to preserve Drizzle's generic config → `BuildQueryResult` inference (a naive `Promise<unknown[]>` wrapper collapses the `with`-expansion and joined relations stop resolving) — callout: this cast looks unusual; explain it.
  - `.insert(table).values(...)` injecting `organizationId` and throwing on a mismatched supplied one (covers req. 2's throw branch).
  - `.update`/`.delete` composing the org predicate as the outer `and`.
  - Rationale callouts: facade does NOT set `app.org_id` (app-layer scoping only); no `.raw`/`allOrgs` bypass by design.

- **`src/db/queries/members.ts` — `listMembers(orgId)`.** `Code`. Scoped through the facade with `with: { user: true }` and `orderBy: asc(member.createdAt)`; note no manual `where org_id` — the facade composes it.

- **`src/lib/auth/authed-action.ts` — the `authedAction` factory.** `AnnotatedCode`, highlight:
  - The generic signature `<TSchema extends z.ZodType, TOut>(role, schema, fn)` returning the `(_prev, formData) => Promise<Result<TOut>>` action shape; `AuthedCtx` type (`user`, `orgId`, `role`, `db: tenantDb(orgId)`, `ip`, `userAgent`).
  - Step 1 `requireOrgUser()` (its redirect is the one allowed throw).
  - Step 2 `roleAtLeast(actual, role)` before parse — cheapest gate fails fastest — returning `err('forbidden', ...)` (covers req. 4).
  - Step 3 `schema.safeParse(Object.fromEntries(formData))` → `err('validation', ..., z.flattenError(...).fieldErrors)` (covers req. 5).
  - Step 4 `fn(parsed.data, ctx)` with `ip`/`userAgent` read from `await headers()`.
  - Callout: `authorize before parse` ordering rationale; refusals return `Result`, never throw.

- **`src/lib/invitations/manage.ts` — `changeMemberRole`.** `Code`. Note for the writer:
  - The Zod schema is **module-local, not exported** — a `'use server'` module may export only async functions (Next 16.2.7's `ensureServerEntryExports` rejects a non-function export at runtime). Callout this constraint.
  - `z.strictObject({ memberId: z.string().min(1), newRole: z.enum(['admin','member']) })` — `memberId` is `z.string().min(1)` not a uuid (Better Auth member ids are text); `'owner'` is not a settable value (promotion to owner is the unbuilt transfer flow).
  - Body: read target via `ctx.db.query.member.findFirst` (`not_found` if gone); owner-target branch — count owners through `ctx.db`, `conflict` with the last-owner message when `<= 1`, otherwise the generic owner `conflict`; then the `withTenant(ctx.orgId, ...)` transaction doing `tx.update(member).set({ role })...` + `logAudit(tx, { action: 'member.role-changed', subjectType: 'member', subjectId: memberId, payload: { before, after } })`; finish `revalidatePath('/inspector')`, `ok({ memberId, role: newRole })`.
  - Cover the `[untested]` requirement 10 in prose: the count increments only inside the committed transaction, so rejected attempts (which return before `withTenant`) never write.

For topics owned by regular lessons, link rather than re-explain: lesson 2 of chapter 056 (`tenantDb`), lesson 2 of chapter 057 (the wrapper + `ctx`), lesson 4 of chapter 057 (single-owner invariant), lesson 3 of chapter 059 (`withTenant`, `logAudit`).

No diagram — the flow is a linear four-step gate plus one transaction; prose and `AnnotatedCode` carry it without a figure.

### Moment of truth

Command: `pnpm test:lesson 4`. Show the expected pass output (Vitest green summary). State what the suite asserts: org scoping on `tenantDb` reads/inserts, the `.query.user` type error, the `forbidden` and `validation` `Result` shapes, and the in-transaction audit write on a successful role change (and its all-or-nothing rollback).

Then a hand-check `Checklist` (covers req. 10 and the inspector-render constraint):
- As the admin acting user (Bob), change Carol's role to `admin`: the row updates and the audit tail shows `'member.role-changed'` with the right payload and actor.
- As the member acting user (Carol), try to change Bob's role: a `forbidden` result renders, with no DB change and no audit row.
- As the admin, try to demote the owner (Alice): a `conflict` result renders; because Alice is Acme's sole owner, the last-owner `conflict` message surfaces; the DB is unchanged.
- The raw-helpers panel's `auditLogs` count increments only after the successful change, not after rejected attempts.

Close with the forward note: the invite flow still doesn't exist — submitting the invite form does nothing useful yet, and the accept page can't load a real invite (lesson 5).

## Scope

- **Does not cover** remove / leave-org / ownership-transfer member actions → lesson 4 of chapter 057 owns the full set; here only `changeMemberRole`.
- **Does not cover** the `withTenant` transaction internals, the `auditLogs` table, or `logAudit`'s body → built in lesson 3 of chapter 059; this lesson consumes them.
- **Does not cover** the org plugin, active-org session, `roleAtLeast`, or `requireOrgUser` internals → lesson 2 of chapter 059.
- **Does not cover** the invite send/accept flow → lessons 5–6 of chapter 059.
- **Does not cover** logging / rate-limiting / entitlement steps in the wrapper → chapter 080 (errors/security) and chapter 064 (entitlements); the user/operator message split is foreshadowed only.
