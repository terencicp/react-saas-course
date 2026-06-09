# Lesson 3 — Append-only audit_logs with RLS

## Lesson title

Chapter-outline title fits. Keep it.

- Page title: `Append-only audit_logs with RLS`
- Sidebar: `Audit log and RLS`

## Lesson type

`Implementation`

## Lesson framing

The student installs the audit trail as compliance data — a table the database itself refuses to mutate after insert.
The senior payoff: append-only is not a code convention you hope everyone honors, it's a structural property enforced by Postgres RLS deny-write policies plus a `logAudit(tx, event)` signature that won't typecheck off-transaction.
By the end the `auditLogs` table, its org-isolation and deny-UPDATE/DELETE policies, the `withTenant(orgId, fn)` transaction that sets `app.org_id`, and the transaction-required writer all exist — the structural foundation every privileged mutation in lessons 4-6 audits into.

## Codebase state

### Entry

From lesson 2: the organization plugin is installed; `organization` / `member` / `invitation` tables and `session.activeOrganizationId` are migrated; `roleAtLeast` and `requireOrgUser` resolve the acting `{ user, orgId, role }`; `getInspectorContext` swaps identities via the dev acting-user cookie.
The inspector's active-org banner and acting-user/org switchers work.
Stubs still present for this lesson: `src/db/audit.ts` (one-line TODO), `src/db/index.ts` (`auditSchema` not spread into the client), `src/db/audit-log.ts` (`logAudit` body), `src/db/tenant.ts` (`withTenant` and `tenantDb` both stubbed), `src/db/queries/audit.ts` (`auditLogCount`, `recentAuditLogs`).
The members panel, pending panel, and audit tail render empty states; `tenantDb`, `logAudit`, and the audit table do not exist yet.

### Exit

`auditLogs` is in the migrated schema with full columns, both composite indexes, RLS enabled, and three policies (org-isolation permissive `FOR ALL`; deny-UPDATE; deny-DELETE).
`withTenant(orgId, fn)` opens a transaction running `set_config('app.org_id', orgId, true)`; `logAudit(tx, event)` inserts one row and requires a `Transaction` (no `db` overload); `auditLogCount` / `recentAuditLogs` read through `withTenant`.
`auditSchema` is spread into the Drizzle client.
The inspector's raw-helpers panel shows the audit count (1 for Acme, from the seeded row); the audit tail still empty (no action writes to it until lesson 4).
`tenantDb` is still stubbed — lesson 4 builds the facade.

## Lesson sections

Render the Implementation contract section list.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: the audit log becomes a table the database guarantees can only grow.
Finished-result paragraph (no screenshot needed — verification is `psql` output): as the `authenticated` role, an audit insert succeeds inside a tenant-scoped transaction and fails outside one; `UPDATE` / `DELETE` both report `UPDATE 0` / `DELETE 0` and leave data untouched (the `using: sql\`false\`` policy lets no row qualify); a `SELECT` with `app.org_id` unset returns 0 rows; the inspector's raw-helpers panel resolves a real count (1 for Acme).

### Your mission

Prose paragraph (no headers, no implementation hints) framing audit logs as compliance data that earns a defense the application layer can't supply alone, woven from the chapter-outline mission:
- Feature in user terms: an append-only audit table the database itself protects, plus the transaction-required writer privileged mutations will log into.
- The senior call: the deny-UPDATE/DELETE policies are the *structural* layer — app discipline and DB grants are real but the policies are load-bearing because they don't depend on developer attention.
- Why `set_config('app.org_id', $orgId, true)` (transaction-local) rather than plain session `SET`: with pooled connections, session-level `SET` persists across requests on the same connection and leaks `app.org_id` across tenants — hence `withTenant` opens a transaction.
- Why `current_setting('app.org_id', true)` with the `true` flag: a missing setting returns NULL not an error, so the policy evaluates false and refuses instead of 500ing.
- Why `logAudit(tx, event)` requires a `Transaction` with no `db` overload: auditing happens inside the transaction doing the work, never fire-and-forget.
- Constraint to surface: the owner/superuser RLS bypass — migrations, the future retention job, and the seed run as superuser and skip RLS by Postgres default (the seed relies on this to insert fixture rows); the app request handler runs as `authenticated`. The retention job is a named year-two reach, not built here.

Then the functional-requirements numbered list, every item tagged. Source: chapter-outline mission bullets. Phrase each as a verifiable outcome, never a file/export.

1. The `auditLogs` table exists in the migrated schema with its full column set and both composite indexes. `[tested]`
2. As `authenticated` inside a transaction that set `app.org_id`, `INSERT INTO audit_logs (...)` succeeds. `[tested]`
3. The same insert outside a transaction with `app.org_id` unset fails. `[tested]`
4. `UPDATE audit_logs SET action = 'x'` matches zero rows for `authenticated` (`UPDATE 0`; data untouched). `[tested]`
5. `DELETE FROM audit_logs WHERE id = ...` matches zero rows for `authenticated` (`DELETE 0`). `[tested]`
6. A `SELECT` with `app.org_id` unset returns 0 rows rather than erroring. `[tested]`
7. `logAudit(tx, event)` inserts exactly one row and does not typecheck when called with the unwrapped `db` instead of a `Transaction`. `[tested]` for the one-row insert; the no-typecheck-off-`db` half is a compile-time guarantee the writer enforces by signature (note it as type-enforced, asserted as far as the runner can).
8. The inspector's raw-helpers panel resolves the `auditLogs` row count through `withTenant` for the current org. `[untested]` (verified by hand in Moment of truth — UI render against the dev seed).

Constraints: append-only enforced by RLS + signature, not convention; transaction-local session variable only.
Out of scope: no action writes to the table yet (lesson 4 ships the first writer caller); the `tenantDb` facade (lesson 4).

### Coding time

One line directing the student to implement against the brief and tests, then read the walkthrough. Writer wraps the solution in `<details>`.

Full reference implementation, organized as it appears in the repo, with decision rationale (one to two sentences each):

- `src/db/audit.ts` — the `auditLogs` table. Use `AnnotatedCode` to direct focus across the column-type decisions and the three policy declarations (one block, several load-bearing parts). Steps to highlight:
  - Column set and types: `id uuid pk default uuidv7()`; `organizationId text not null fk→organization` and `actorUserId text null fk→user (set null)` — Better Auth ids are base62 `text`, so a `uuid` FK→`text` emits invalid DDL; only the standalone PK stays `uuid`. `actorIp text null` — Drizzle has no first-class `inet` builder, so `text` is the deliberate simplification. `actorUserAgent text null`, `action text not null`, `subjectType text not null`, `subjectId text not null`, `payload jsonb<Record<string,unknown>> not null default '{}'`, `createdAt timestamptz not null default now()`.
  - Indexes: `idx_audit_logs_org_created (organizationId, createdAt desc)`, `idx_audit_logs_org_actor_created (organizationId, actorUserId, createdAt desc)` — serve the per-org tail and per-actor reads.
  - `.enableRLS()` + three `pgPolicy` rules: permissive `audit_logs_org_isolation` (`FOR ALL`, `to: authenticatedRole`) whose `using`/`withCheck` compare `current_setting('app.org_id', true)` to the `text` `organization_id` with no `::uuid` cast (both sides text) — governs SELECT and INSERT; restrictive `audit_logs_no_update` and `audit_logs_no_delete` (`using: sql\`false\``, `to: authenticatedRole`) — the deny-write layer.
  - Exports `AuditLog`, `NewAuditLog`, `AuditEvent = { action: string; subjectType?: string; subjectId?: string; payload?: Record<string,unknown> }`.
- `src/db/index.ts` — spread `auditSchema` into the merged Drizzle client (simple `Code` diff is enough; one line).
- `src/db/tenant.ts` — `withTenant<T>(orgId, fn)`: `db.transaction` that runs `select set_config('app.org_id', $orgId, true)` before `fn`. Show only `withTenant` here; the `tenantDb` facade is stubbed until lesson 4 — call that out so the student doesn't expect it. `CodeTooltips` optional on the `set_config` args (`isLocal = true`).
- `src/db/audit-log.ts` — `logAudit(tx: Transaction, event: AuditEvent): Promise<void>`: single insert into `auditLogs`; the helper derives actor/org itself — `requireOrgUser()` supplies `actorUserId` + `organizationId`, `await headers()` supplies `actorIp` / `actorUserAgent` — so the caller passes only the event. The `tx`-required signature (no `db` overload) is the discipline; note it.
- `src/db/queries/audit.ts` — `auditLogCount(orgId)` and `recentAuditLogs(orgId)`, both reading through `withTenant` so RLS sees `app.org_id`.

Untested-requirement coverage: explain that the raw-helpers panel reads `auditLogCount` through `withTenant` (req 8), and the placement rationale — reads route through `withTenant` precisely because RLS would otherwise return 0 rows.
Decision-rationale callouts (chapter-outline asks for each): why `set_config(..., true)` over plain `SET`; why the policies, not app discipline, are the structural defense; the owner/superuser RLS bypass for migrations and seed; the `current_setting(..., true)` NULL-on-missing behavior.
Anything that looks unusual at a glance: `using: sql\`false\`` (a policy that admits no row), `organization_id` text comparison with no cast, the seed inserting audit rows directly (superuser bypass).
Link rather than re-explain: lesson 4 of chapter 056 for the `pgPolicy` / `withTenant` pattern; lesson 5 of chapter 057 for the transaction-required `logAudit` discipline.
External resources slot: none authored; resourcer appends after the `<details>` if any.

### Moment of truth

Test command and expected pass output:
- `pnpm test:lesson 3` — passes. Suite asserts `logAudit` inserts one row inside a transaction and the deny-UPDATE/DELETE behavior holds.

By-hand checklist (use the `Checklist` component; the student opens `psql` and runs `SET ROLE authenticated` first — the docker-compose superuser bypasses RLS, so the deny checks only bite as `authenticated`):

1. Inside `BEGIN; SELECT set_config('app.org_id', 'org_acme', true); ...; COMMIT;`, an `INSERT INTO audit_logs (...)` for `org_acme` succeeds.
2. The same insert with `app.org_id` unset fails.
3. `UPDATE audit_logs SET action = 'x' WHERE id = ...` reports `UPDATE 0`.
4. `DELETE FROM audit_logs WHERE id = ...` reports `DELETE 0`.
5. `SELECT * FROM audit_logs LIMIT 1` with `app.org_id` unset returns 0 rows.
6. The inspector's raw-helpers panel shows the `auditLogs` count for the current org (1 for Acme).

Closing line: no action writes to the table yet — the first writer caller arrives with the role-change action in lesson 4.

## Code sample handling

- `AnnotatedCode` for `src/db/audit.ts` — one complex block, focus needs steering across column types, indexes, and three policies.
- `Code` for `src/db/index.ts` (one-line spread), `src/db/tenant.ts` `withTenant`, `src/db/audit-log.ts`, `src/db/queries/audit.ts`.
- `Code` for the `psql` session transcripts in Moment of truth (expected `INSERT`/`UPDATE 0`/`DELETE 0`/`0 rows` output).
- `CodeTooltips` optional on `set_config('app.org_id', orgId, true)` to gloss the `isLocal` flag inline.
- No diagram. The transaction → `set_config` → policy-evaluation flow is short and prose carries it; the verification is the `psql` output, not a visual.

## Scope

- The `tenantDb(orgId)` query/insert/update/delete facade — lesson 4 (same `src/db/tenant.ts` file; only `withTenant` ships here).
- The first `logAudit` caller (the `changeMemberRole` action) and `authedAction` wrapper — lesson 4.
- The retention / GDPR-deletion job that runs as superuser against this table — named here as a year-two reach; owned by Unit 16 (chapter outlines around chapter 082), not this project.
- Why RLS earns its weight on this table specifically (the threshold call) — taught in lesson 3 of chapter 056; this lesson applies it, doesn't re-derive it.
