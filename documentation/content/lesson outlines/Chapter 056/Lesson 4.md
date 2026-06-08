# Lesson 4 outline — Wiring RLS on audit_logs

## Lesson title

- Title: `Wiring RLS on audit_logs with policies and SET LOCAL`
- Sidebar label: `Wiring RLS on audit_logs`

## Lesson framing

This is the build lesson that cashes the decision L3 made: `audit_logs` is the one table in this stack that earns Row-Level Security.
L3 was a decision lesson (no syntax). L4 wires the four primitives end-to-end: author the policy, enable+force RLS, set the tenant identity per-request with `SET LOCAL`/`set_config` inside a transaction (the `withTenant` helper), and prove isolation with an integration test the student *reads* (does not run).

Pedagogical conclusions that shape the whole lesson:

- **Setup + pattern hybrid.** Four artifacts land together: the `pgPolicy` + `.enableRLS()` schema block, the `FORCE` follow-up migration, the `withTenant(orgId, fn)` helper, and the isolation test. Each is small; the value is how they compose. The senior thread is "two independent layers, each catches the other's bug" — `tenantDb` (L2, app layer) and the RLS policy (this lesson, DB layer) both guard every `audit_logs` write, and the lesson must keep restating that they are *additive*, never either/or.
- **Fail-closed is the spine.** Three separate decisions in this lesson all exist to make the *unconfigured* request return zero rows instead of leaking or crashing: the `, true` arg to `current_setting`, the `::uuid` cast, and `SET LOCAL` (auto-cleared on commit/rollback). Teach each as "what happens when someone forgets to set the variable" — that framing is what makes the syntax memorable rather than arbitrary.
- **Two footguns are the load-bearing watch-outs**, each gets a wrong-then-right treatment because the failure is silent and catastrophic (cross-tenant leak / owner-bypass that makes tests pass for the wrong reason):
  1. `SET` vs `SET LOCAL` on a pooled connection (the "pooled-connection footgun" named in L3, now made concrete).
  2. `ENABLE` without `FORCE` — owner/superuser bypasses, so the migration and any owner-run code (and owner-run tests) read everything; Drizzle's codegen does **not** emit `FORCE`, so this is a real thing the student must add by hand.
- **No runnable RLS exercise.** Fact-checked: PGlite does not enforce RLS (electric-sql/pglite #138, #274) — a `SQLCoding`/`DrizzleSchemaCoding` "isolation proof" would falsely pass because the policy is ignored, teaching the exact false-confidence the lesson warns against. So the isolation test is shown as **code to read** (lands in the Ch088 integration suite), and understanding checks are non-coding: a `Sequence` for the request lifetime and an `MultipleChoice`/`TrueFalse` round on the failure modes. State this constraint explicitly so the build agent does not reach for a live runner.
- **Drizzle version pin matters.** The course is on Drizzle 0.45 / drizzle-kit 0.31 (pre-1.0). `.enableRLS()` + `pgPolicy(...)` is the correct surface for that pin. Drizzle 1.0-beta renames `.enableRLS()` → `pgTable.withRLS(...)`; mention this once in a forward note (matches how conventions flag other 1.0 deltas), do not author against the beta.
- **`crudPolicy` is the Neon convenience, `pgPolicy` is the portable default.** Teach `pgPolicy` as the primary (works on any Postgres — Docker local, RDS, Supabase, Neon), show `crudPolicy` as the one-call Neon collapse for when read/write predicates are identical (they are, for tenant isolation). The course stack is Neon prod + Docker local, so both must be honored; lead with the portable one.
- **The DB-role split is named, not built.** RLS bypass-by-owner forces a second connection identity: migrations/admin run as owner (`dbUnpooled` / `DATABASE_URL_OWNER`), request handlers run as a non-owner app role without `BYPASSRLS`. Full least-privilege role separation is Chapter 081 — name the two-URL shape and why, do not build the role grants.
- Mantra to carry forward from L3: "`tenantDb` is *always*; RLS is *sometimes, and on top*." This lesson is the "and on top."

## Lesson sections

### Introduction (no header)

Reconnect to L3's verdict in two sentences: the decision landed on `audit_logs`, now we wire it. State the senior question the lesson answers: what is the actual policy syntax, how does the policy learn *which* org at query time, how does the app set that identity per-request without it bleeding across pooled connections, and what test proves "another org's row never comes back even if I forget the `where`." Preview the four artifacts. Keep warm and brief; one short paragraph plus a sentence listing what they will have built. Note `audit_logs` columns/write events are NOT built here (Ch057 L5) — this lesson treats the table as existing and wires only its protection.

### How a policy decides which rows you see

Goal: a precise mental model of what a policy *is* before any Drizzle syntax — the student should be able to read a raw `CREATE POLICY` and predict its row-filtering behavior.

Content:
- Open with the plain-SQL policy as the canonical reference shape (illustrative, students author it through Drizzle next section):
  `CREATE POLICY audit_logs_org_isolation ON audit_logs FOR ALL TO authenticated USING (organization_id = current_setting('app.org_id', true)::uuid) WITH CHECK (...)`.
- Use **`AnnotatedCode`** (lang `sql`) to walk this one statement — it is the densest single block in the lesson and the student's focus needs steering across five distinct parts. Steps, each one paragraph:
  1. `FOR ALL` — one policy covers select/insert/update/delete; split per-command only when predicates diverge (rare for tenant isolation). `color="blue"`.
  2. `TO authenticated` — the DB role the policy applies to; foreshadow the app-vs-owner role split (full treatment later in lesson).
  3. `USING (...)` — the read filter: which existing rows the query is even allowed to *see*. `color="green"`.
  4. `WITH CHECK (...)` — the write filter: which rows an insert/update is allowed to *produce*. Contrast with USING explicitly — students conflate them. `color="violet"`.
  5. `current_setting('app.org_id', true)::uuid` — the row's `organization_id` is compared to a connection session variable; that variable is how the policy learns the current tenant. Mark the `, true` and `::uuid` and tell the student both are deliberate fail-closed choices unpacked in their own section. `color="orange"`.
- One sentence on the key inversion vs `tenantDb`: with the helper, the *app* supplies the org filter; with RLS, the *database* supplies it and refuses to be talked out of it — "every query, every connection, every code path, even hand-written SQL in a one-off script."
- Term candidates: `policy` (Term: "Per-row boolean rule Postgres evaluates on every query against the table"), `session variable` (Term: "Connection-scoped key/value, read with current_setting, that carries the tenant id into the policy").

### Authoring the policy in the schema with pgPolicy

Goal: the student writes the policy in the Drizzle schema file (next to the table, single source of truth) rather than a hand-edited `.sql`, and knows the Neon shortcut.

Content:
- Lead with the principle from conventions: schema is the source of truth (Architectural Principle #2), so the policy lives in `db/schema.ts` (or the auth/audit schema file) on the table modifier, and `drizzle-kit generate` emits the `CREATE POLICY`. Hand-editing the migration drifts and the next generate overwrites it.
- Primary artifact — **`AnnotatedCode`** (lang `ts`) on the `pgPolicy` + `.enableRLS()` block:
  ```
  export const auditLogs = pgTable('audit_logs', {
    /* columns arrive in Ch057 L5; organizationId is the load-bearing one here */
  }, (t) => [
    pgPolicy('audit_logs_org_isolation', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.organizationId} = current_setting('app.org_id', true)::uuid`,
      withCheck: sql`${t.organizationId} = current_setting('app.org_id', true)::uuid`,
    }),
  ]).enableRLS();
  ```
  Steps: the table-modifier array return shape; `pgPolicy(name, {...})` and each option (`as: 'permissive'`, `for: 'all'`, `to`); the `using`/`withCheck` `sql` templates (note `${t.organizationId}` interpolates the column ref, the rest is raw policy SQL); `.enableRLS()` as the chained modifier. Keep `audit_logs` columns abstracted — a comment pointing at Ch057 L5, only `organizationId` shown — so this lesson doesn't pre-teach the table.
- **`CodeVariants`** for the authoring-surface choice (portable vs Neon), two tabs:
  - `pgPolicy` (portable): "Works on any Postgres — Docker local, RDS, Supabase, Neon. The default for this course's portability." Same block as above, the four CRUD commands ride one `for: 'all'`.
  - `crudPolicy` (Neon one-call): `crudPolicy({ role: authenticatedRole, read: sql\`...\`, modify: sql\`...\` })`. "Collapses select/insert/update/delete into one call when read and write predicates are identical — which they are for tenant isolation. Expands to four `pgPolicy` definitions under the hood. Import `crudPolicy`/`authenticatedRole` from `drizzle-orm/neon`." First sentence flags it is Neon-only.
- Senior note (Aside `note`): policies auto-enable RLS, so `.enableRLS()` is technically redundant when a policy is present — keep it explicit anyway as documentation of intent, and because the next section needs RLS *forced*, not just enabled.
- Forward note (Aside `note`, one line): Drizzle 1.0-beta renames `.enableRLS()` to `pgTable.withRLS(...)`; the course is pinned pre-1.0, so author with `.enableRLS()`.
- Term: `permissive` policy (Term: "OR-combined with other permissive policies; the default. Restrictive policies are AND-combined — not needed for single-tenant-isolation").

### Enable is not enough: forcing RLS past the table owner

Goal: the single highest-value gotcha. The student must understand that `ENABLE` alone leaves owners bypassing, that Drizzle does not emit `FORCE`, and how to add it.

Content:
- The trap, stated as a story (this is the senior anti-trap from the chapter outline): "You wrote the policy. Your migration runs as the table-owner role and reads every row anyway. Your isolation test also runs as owner, so it passes — for the wrong reason. You ship, and a non-owner request is the first thing that ever actually exercises the policy." Make the failure mode visceral; it is silent until production.
- The two-line fix and why both lines exist:
  - `ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY` — turns the policy on (what `.enableRLS()` generates).
  - `ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY` — makes the policy apply to the table owner too. Without it, owners and superusers bypass by default.
- **Load-bearing fact (fact-checked):** `drizzle-kit generate` emits the `ENABLE` but **not** `FORCE`. So the student must add `FORCE` themselves. Show the path: generate the migration, **read the generated SQL** (senior reflex — never ship an unread RLS migration), confirm `ENABLE` is present and `FORCE` is absent, then add `FORCE` via a custom/empty migration (`drizzle-kit generate --custom --name force_audit_rls`) containing the one `ALTER TABLE ... FORCE ROW LEVEL SECURITY` statement.
- **`CodeVariants`** wrong-then-right, two tabs:
  - "Enabled only" — the generated migration as-is; caption: owner bypasses, tests lie. `del`/red mark the missing guarantee.
  - "Enabled + forced" — add the follow-up `FORCE` migration; `ins`/green. Caption: policy now applies to everyone including owner.
- Tie to conventions explicitly: "Audit log appends only via `logAudit(tx, event)`; RLS denies UPDATE and DELETE on `audit_logs` at the DB level — defense in depth." Note for build agent: this lesson wires the *org-isolation* policy (the `FOR ALL` tenant filter); the append-only deny-UPDATE/DELETE policy is a *second* concern owned alongside the table in Ch057 L5 — mention it as the sibling policy, do not build it here, to avoid scope collision.
- Senior reflex sentence: "Enable AND force on every RLS table — make it a checklist item, because the bypass is invisible until the wrong role hits it."

### Setting the tenant at request time: SET LOCAL and the withTenant helper

Goal: the request-lifetime arm. The policy reads `app.org_id`; this section sets it correctly per-request and packages it as `withTenant(orgId, fn)`. This is where the pooled-connection footgun gets made concrete.

Content:
- Restate the dependency: the policy is inert unless `app.org_id` is set on the connection running the query. So every request that touches `audit_logs` must set it first.
- **`SET` vs `SET LOCAL` — the footgun, wrong-then-right.** Use **`CodeVariants`** (this is the second of the two load-bearing footguns):
  - "Session-level (`SET`)" — sets the variable for the whole connection/session. On a pooled connection the value persists after the request returns; the next request to check out that connection inherits org A's value (leak) or reads stale state. First sentence: "Leaks across requests on a pooled connection." Red.
  - "Transaction-local (`SET LOCAL`)" — scoped to the current transaction, auto-cleared on commit/rollback. The connection goes back to the pool clean. First sentence: "The only safe primitive on a pooled connection." Green.
- **Why a transaction at all:** `SET LOCAL` (and `set_config(..., true)`) only persist *within* a transaction — outside one, the setting is discarded and the policy sees the unset value (fail-closed → zero rows). So the helper must open an explicit transaction, set the variable, then run the work.
- **The `withTenant(orgId, fn)` helper** — primary artifact, **`AnnotatedCode`** (lang `ts`):
  ```
  import 'server-only';
  import { sql } from 'drizzle-orm';
  import { db } from '@/db';

  export const withTenant = <T>(orgId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
      return fn(tx);
    });
  ```
  Steps: `import 'server-only'` (it imports the DB client); the generic `<T>` + explicit signature (signature is the contract, never inferred — matches the `tenantDb` factory convention from L2); `db.transaction(...)` opening the explicit tx; the `set_config('app.org_id', orgId, true)` call — explain the third arg `true` means *local* (transaction-scoped), the parameterized `${orgId}` is why we use `set_config` not raw `SET LOCAL` (raw `SET` can't take a bind parameter, so this is the injection-safe way to inject a runtime value); `return fn(tx)` running the caller's work on the same tx. `color` the `set_config` line and the `true` arg.
- **Composition with `tenantDb` (L2):** the senior payoff. Inside a Server Action: `const { user, orgId } = await requireOrgUser();` then `await withTenant(orgId, async (tx) => { await tx.insert(auditLogs).values({ organizationId: orgId, ... }) })`. Two enforcements on the same write: the explicit `organizationId: orgId` in `values` (app layer), and the policy's `WITH CHECK` refusing any row whose `organization_id` ≠ `app.org_id` (DB layer). Use a small **`Code`** block for this action snippet, then prose: a bug in the app (forgot the value) is caught by the policy; a bug in the policy (typo, missing FORCE) is caught by the app's explicit value — both layers, both fail independently. This is the defense-in-depth thesis made literal.
- Pin to conventions: `db`/`dbUnpooled` two-export client (`db/index.ts`); transactions via `db.transaction(async (tx) => …)`; never `await` an external service inside a transaction (so audit writes are pure DB work — fine inside the tx). Note `withTenant` lands at `@/db/tenant.ts` alongside `tenantDb` (same data-layer home as L2) — or its own `@/db/with-tenant.ts`; build agent picks one and keeps the data layer under `db/`.
- Terms: `SET LOCAL` (Term: "Postgres command that sets a config value only until the current transaction ends"), `set_config(name, value, is_local)` (Term: "Function form of SET; the third arg true makes it transaction-local. Parameterizable, unlike raw SET").

### Reading the request lifetime end to end

Goal: stitch the pieces into one temporal picture so the student sees *when* the variable is set, *when* it is cleared, and that the connection returns to the pool clean.

Content:
- **`DiagramSequence`** — the centerpiece visual, ~6 steps, walking one `audit_logs` write through the stack. Each step a simple labeled row/box strip (plain HTML+CSS inside the steps, no engine needed), highlighting the active stage; per-step captions:
  1. Server Action starts → `requireOrgUser()` returns a trusted `orgId` (never from URL/param — restate the L1/L2 provenance invariant).
  2. `withTenant(orgId, ...)` opens an explicit transaction (checks a connection out of the pool).
  3. `set_config('app.org_id', orgId, true)` runs — the policy now has a tenant identity, scoped to this transaction only.
  4. `INSERT INTO audit_logs ...` — the policy's `WITH CHECK` verifies `organization_id = app.org_id`; matching row is written.
  5. `COMMIT` — `SET LOCAL`/`set_config(local)` is automatically cleared.
  6. Connection returns to the pool with **no** `app.org_id` set — the next request that checks it out starts fail-closed (unset variable → policy sees NULL → zero rows). Caption hammers: this clean-return is exactly what `SET` (without LOCAL) breaks.
- Pedagogical goal stated for the build agent: this diagram is the antidote to the pooled-connection footgun — it makes "the variable is gone after commit" something the student *sees* rather than takes on faith.
- Understanding check: **`Sequence`** exercise — the student drags the same lifecycle steps into order (requireOrgUser → open tx → set_config(local) → insert (WITH CHECK) → commit → connection returns clean). Reinforces ordering, especially that the variable is set *after* the tx opens and cleared *by* the commit.

### Failing closed: why `, true` and why `::uuid`

Goal: justify the two small arguments in the policy that everyone copies without understanding — both are deliberate fail-closed choices, and getting them wrong opens subtle holes.

Content:
- `current_setting('app.org_id', true)` — the second arg `true` (`missing_ok`) makes an *unset* variable return `NULL` instead of raising. Why senior: an unconfigured request (someone forgot `withTenant`) should *fail closed* — `organization_id = NULL` is `NULL`, which excludes every row — rather than throw a DB-side error that surfaces as a 500. Without `, true`, `current_setting` errors when the variable is absent; the app looks broken instead of safely empty.
- `::uuid` cast (not `::text`) — `organization_id` is a uuid, so cast the variable to uuid: a typo or junk value (someone tried `'all'` or `'%'` to "get everything") fails the cast and errors loudly rather than silently matching surprising rows. When the variable's domain has structure, cast to the structured type. Mention the anti-pattern: leaving it `text` and comparing to text opens the door to `LIKE`-style escapes if the predicate ever changes.
- **`MultipleChoice`** (or two-question `TrueFalse`): "An engineer ships a code path that writes to `audit_logs` but forgets to wrap it in `withTenant`. With `current_setting('app.org_id', true)::uuid` in the policy, what happens?" Correct: the query runs but the policy sees NULL and returns/affects zero rows (insert via `WITH CHECK` is refused) — fails closed. Distractors: returns all rows (the leak — what `SET`-without-LOCAL or no-RLS would do); throws and 500s (what dropping `, true` would do); silently writes to a random org. The explanation re-teaches fail-closed.

### Proving it: the isolation test you read, not run

Goal: show the canonical acceptance test and — critically — why it must run against the *app role* and against real Postgres, while being honest that it can't run in the in-browser sandbox.

Content:
- The test shape, as **`Code`** (lang `ts`, read-only): insert two `audit_logs` rows, one for org A, one for org B. In a `withTenant(A)` transaction, `SELECT * FROM audit_logs` with **no `where`** → assert exactly one row, and it is A's. Repeat with `withTenant(B)` → assert B's only. The "no `where`" is the whole point — it proves the *database* enforces isolation independent of any app filter.
- The two ways this test gives a false pass, and the fixes (both already taught — this section consolidates):
  1. Run as the owner role → owner bypasses RLS → both rows always come back → test must run as the **non-owner app role**. Ties back to FORCE section.
  2. Run against PGlite/an RLS-unaware DB → policy ignored → test passes meaninglessly → must run against **real Postgres** in the integration suite.
- **Honesty note (Aside `caution`):** state plainly that this is why there is no live coding cell in this lesson — PGlite (the in-browser Postgres these exercises use) does not enforce RLS, so an embedded "prove it" sandbox would pass even with the policy *deleted*, teaching exactly the false confidence this lesson warns against. The real test lives in the Ch088 integration suite against a real Postgres. This is the senior lesson: an RLS test that can pass without RLS is worse than no test.
- The DB-role split, named not built: request handlers run as a non-owner app role with no `BYPASSRLS`; migrations/admin/owner-cross-org reads run as the owner (`dbUnpooled` / a separate `DATABASE_URL_OWNER`). Most Neon/Supabase setups ship this split; vanilla Postgres creates the role explicitly. Full least-privilege role separation is Chapter 081 — one paragraph, link forward.
- Local-dev recipe (short, practical): a new dev clones, seeds, opens `psql`, queries `audit_logs`, sees nothing — the variable isn't set. Fix: connect with the owner role for ad-hoc exploration, or a `\set` in `~/.psqlrc` that sets `app.org_id` to the seed's first org. **Never** grant the app role `BYPASSRLS` to "make dev easier" — it defeats the entire point. One `Aside` tip with the two-line recipe.

### External resources

`ExternalResource` cards: Postgres RLS docs (`postgresql.org/docs/current/ddl-rowsecurity.html`), Drizzle RLS docs (`orm.drizzle.team/docs/rls`), Neon "Simplify RLS with Drizzle" guide. Optional: a short YouTube explainer on Postgres RLS via `VideoCallout` only if a concise, current one is found — not required; the concepts are well served by the diagram and the docs.

## Scope

Already taught — redefine in one line each, do not re-teach:
- `tenantDb(orgId)` (L2): app-layer factory that injects the org `where` and makes the unscoped call shape not compile. This lesson's `withTenant` is its DB-layer sibling for the RLS table; they compose.
- `requireOrgUser()` (Ch056 L1): returns trusted `{ user, orgId, role }`; the only sanctioned `orgId` source. `withTenant` trusts `orgId` came from here.
- The RLS decision (L3): the *why* and the per-table threshold; verdict = RLS on `audit_logs` only. This lesson is the wiring, not the decision — do not re-argue the threshold.
- Five-seam action shape (Unit 6), `db`/`dbUnpooled` client, `db.transaction` (conventions): assume known.
- Pooled connections (L3 named the footgun): restate in one line; this lesson makes it concrete.

Out of scope — defer, do not teach:
- The `audit_logs` table itself — columns, what events write to it, the `logAudit(tx, event)` writer signature, the append-only deny-UPDATE/DELETE policy → **Ch057 L5**. This lesson abstracts columns to a comment and wires only the org-isolation policy + the request-time variable.
- DB-role separation / least-privilege grants in depth (creating the app role, GRANTs, `BYPASSRLS` attribute management) → **Chapter 081**. Named here as the two-URL shape only.
- RLS performance tuning under load → Chapter 094. Multi-region replica interaction → out of scope.
- Other tables getting RLS later — same recipe, the per-table call is L3's territory; do not enumerate candidates.
- The cross-org admin/compliance read surface (owner-role bypass for super-admin audit reads) → named once as "different connection, different file," full coverage Unit 21.
- `authedAction` wrapper → Ch057 L2 (named only).
- Building/running the integration test harness → Chapter 088; the test is shown as code to read.

## Code conventions notes

- Drizzle data-layer: schema is source of truth, policy authored in schema not hand-edited SQL; `db`/`dbUnpooled` two-export client; `db.transaction(async (tx) => …)` with `tx` threaded; no external IO inside the tx (audit writes are pure DB, compliant). `withTenant` lands under `db/`.
- Pinned Drizzle 0.45 / drizzle-kit 0.31 → `.enableRLS()` + `pgPolicy(...)`; flag the 1.0 `withRLS` rename in a forward note only.
- Helper shape mirrors the `tenantDb` factory convention (L2): arrow fn, named export, `import 'server-only'`, explicit/generic signature (never inferred — the signature is the contract).
- `sql` tagged template for the policy predicate and the `set_config` call (implicit parameterization); `${t.organizationId}` interpolates the column ref. No raw string SQL except identifiers.
- Deliberate divergence to flag for downstream agents: `audit_logs` columns are intentionally abstracted (owned by Ch057 L5) so this lesson stays a wiring lesson, not a table-design lesson.

## Build notes for agents

- **No live coding component** in this lesson — PGlite does not enforce RLS (fact-checked: electric-sql/pglite #138, #274), so any `SQLCoding`/`DrizzleSchemaCoding`/`DrizzleCoding` "isolation" cell would pass with the policy deleted and actively miseducate. Understanding checks are `Sequence` (lifecycle order) and `MultipleChoice`/`TrueFalse` (fail-closed behavior). The isolation test is `Code` to read.
- Diagrams: one `DiagramSequence` (request lifetime, centerpiece) built from plain HTML+CSS step bodies. No ER/architecture diagram needed — the schema work is one table.
- Two wrong-then-right `CodeVariants` are load-bearing: `SET` vs `SET LOCAL`, and `ENABLE`-only vs `ENABLE`+`FORCE`. Plus one `CodeVariants` for the `pgPolicy` vs `crudPolicy` authoring choice.
- Two `AnnotatedCode` blocks: the raw `CREATE POLICY` (sql) and the `withTenant` helper (ts). One more optional on the `pgPolicy` schema block if the inline walkthrough warrants it.
- All visuals/exercises may ship as TODO stubs for the build-out pass, per the chapter's established pattern.
