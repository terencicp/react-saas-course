# Chapter 056 — Organizations as the tenancy model

## Lesson 1 — Standing up organizations and the active-org slot

**Taught.** Better Auth organization plugin (server `organization({teams:{enabled:false}})` + client `organizationClient()`); `npx @better-auth/cli generate` drops `organization`/`member`/`invitation` tables + an `activeOrganizationId` column on `session`; the active-org-on-session model, a `session.create.before` DB hook setting initial active org, the null-org redirect branch, create-org / switch-org / list flows, and `requireOrgUser()` resolving a trusted `orgId`.

**Cut.** Logo field shown only in passing (`logo?` named in chapter outline create call but not built in the form); "most-recent active org" precedence simplified to "most recent membership" (no last-active persistence column built).

**Debts.**
- `tenantDb(orgId)` consumes `requireOrgUser`'s `orgId` — Lesson 2.
- `role` is threaded through `requireOrgUser`'s return but NOT gated; role semantics + `requireOrgUser(role?)` enforcement — Chapter 057 L1.
- `authedAction` wrapper replacing raw five-seam actions — Chapter 057 L2.
- `invitation` table generated but dormant; invite/accept — Chapter 058.
- Member management (remove/leave/transfer/change-role) — Chapter 057 L4.
- Audit-log row on create/switch — Chapter 057 L5.
- Teams: flipping `teams.enabled` adds `team`/`teamMember` + `activeTeamId` — named, not built.
- `/onboarding/create-org` is a stub page; full onboarding/settings UX deferred.

**Terminology.** `requireOrgUser()` is the third rung of the session-read ladder (after `getCurrentUser`/`requireUser`), returns `{ user, orgId, role }`, React-`cache`d; resolves `role` via `auth.api.getActiveMember({ headers })` (role threaded, not gated). Canonical action opener: `const { user, orgId } = await requireOrgUser();`. Helper file `src/lib/auth/resolve-initial-org.ts`; switch action `src/app/(protected)/set-active-org-action.ts`; client island `<OrgSwitcher>`. Reserved-slug blocklist: `admin, api, app, auth, billing`; slug regex `^[a-z0-9-]{3,32}$`. The lesson uses table names `organization`/`member` (singular, plugin-owned — do NOT rename despite house plural style; note this contradicts chapter-framing prose that said `organizations`/`org_members`).

**Patterns and best practices.**
- Org plugin goes BEFORE `nextCookies()` in `plugins` (nextCookies must stay last to flush Set-Cookie).
- Client plugin set must mirror server's or typed `authClient.organization.*` methods don't exist.
- Active org = server-side session state only; never URL/route-param/`localStorage`/side-cookie for the tenancy decision (URL is fine for *linking*).
- Initial active org set via `session.create.before` hook (covers every session-minting path), not the sign-in action. Hook return contract: `{ data: { ...session, activeOrganizationId } }`.
- Null active org tolerated in exactly one route: `/onboarding/create-org`; the branch is centralized (protected layout + `requireOrgUser`), and the proxy stays cookie-presence-only so org-less users don't redirect-loop.
- Create via `auth.api.createOrganization({ body, headers: await headers() })`; user-chosen slug; slug-taken → `Result` `conflict` discriminant in `fieldErrors.slug`.
- Switch = two moves that always travel together: `auth.api.setActiveOrganization(...)` THEN `revalidatePath('/', 'layout')` server-side, plus `router.refresh()` client-side. Cookie-cache `maxAge` is irrelevant (setActive rewrites the cookie immediately).
- `<OrgSwitcher>` rendered once in the protected layout, org list read server-side via `auth.api.listOrganizations({ headers })` and passed as a prop (avoids empty-on-first-paint).

**Misc.** No quiz/sandbox in this lesson (org plugin can't run in react-only ReactCoding iframe); understanding checks are a `Buckets` (state placement) and a `Sequence` (switch lifecycle). Two diagrams built (not stubs): a D2 ER diagram (5 tables, violet accent edge on `session.activeOrganizationId → organization.id`, dormant/greyed `invitation`) and a Mermaid switch sequence diagram (revalidate step highlighted between DB write and next render). Two `VideoCallout`s: `bFLGwVyIotA` (Jan Marshal multi-tenancy concept), `grvwy4qySVI` (OrcDev Better Auth orgs end-to-end, incl. switcher-staleness fix). `requireOrgUser` is shown living in `src/lib/auth.ts`.

## Lesson 2 — tenantDb(orgId): making the missing-where not compile

**Taught.** `tenantDb(orgId)` — a thin typed factory over Drizzle's relational query API that closes over `orgId` and injects the org predicate on every read (`and(eq(table.organizationId, orgId), config?.where)`) and write (insert stamps `organizationId`, update/delete `and`-in the predicate); a `TENANT_TABLES` registry used twice (runtime backstop + a mapped type that makes the wrapper's `query` surface expose only tenant-owned table keys, so a non-tenant table access is a compile error); the canonical three-line action opener (`requireOrgUser()` → `tenantDb(orgId)` → scoped read); the missing-`where` bug class and the "defense is a call shape, not diligence" reframe.

**Cut.** The `select()`-builder surface wrap (chapter outline named `tenantDb(orgId).select().from(...)`) — lesson wraps only the relational `query.<table>` surface + insert/update/delete; select-builder not shown. The nested-`with` child-scoping discussion (children inherit scope via FK) — dropped, only root-table scope taught.

**Debts.**
- `authedAction(role, schema, fn)` — the action-boundary twin of the `tenantDb` carve-out; named/foreshadowed only, built Chapter 057 L2.
- Role/permission gating — explicitly stated `tenantDb` scopes *data*, not *authz*; RBAC is Chapter 057 L1.
- RLS / `withTenant` / `pgPolicy` / `SET LOCAL` — the DB-layer backstop foreshadowed in the writes `:::note`; Chapter 056 L3 (decision) + L4 (wiring).
- Cross-org admin reads — named as "different client, different file" (`admin/` or `scripts/`), implementation deferred (Unit 21).

**Terminology.** `tenantDb` is THE chosen name (rejected field alternatives: `forTenant`, `dbFor`, `orgDb`, `tenantScoped`). Two clients in the codebase: raw `db` (omnipotent, imported from `@/db`, for admin/scripts/migrations) vs `tenantDb(orgId)` (request handlers only, org-scoped by construction). `TENANT_TABLES` = the registry (one source-of-truth list the types derive from); `TenantTable` = its union type via `(typeof TENANT_TABLES)[number]`. Tenant tables enumerated in examples: `invoices`, `customers`, `member` (+ `documents` in exercises). Mantra: "optional correctness is the bug"; the guarantee is the unscoped call shape becomes *unwriteable*, NOT "the helper saves you if you forget."

**Patterns and best practices.**
- Helper file lands at `@/db/tenant.ts` (deliberate divergence — chapter outline said `src/lib/db/tenant.ts`; conventions put the data layer under `db/`). Note Lesson 1 placed `requireOrgUser` at `src/lib/auth.ts`, so auth lives under `lib/` and the DB layer under `db/`.
- `import 'server-only'` at top of `tenant.ts` (it imports the DB client).
- Factory: arrow fn, `const`-bound, named export, explicit return type (signature IS the enforcement, never inferred).
- Org predicate always the OUTER `and` so a caller's `or(...)` escape attempt becomes a contradiction (zero rows) — robust against accidental omission and curious-developer escape.
- Insert with a conflicting caller-supplied `organizationId` → THROW (impossible-situation per the throw-vs-return-Result error rule), not silently picked.
- NO `tenantDb({ allOrgs: true })` mode and NO `.raw`/passthrough escape inside the wrapper — the only path to unscoped Drizzle is the separately-imported `db`; absence of a built-in bypass is the feature.
- `orgId` provenance invariant: only ever from `requireOrgUser()` — never route param, form field, or header. `tenantDb` trusts its caller; it guarantees *some* org's scope, only `requireOrgUser` guarantees it's *the user's*.
- Slots onto the five-seam action shape: `requireOrgUser()` = authorize seam, `tenantDb(orgId)` = scoped mutate/read.
- PR review reflex: don't audit `where` clauses; check the client + the `orgId` provenance.

**Misc.** Pinned to Drizzle Relations **v1** (`db.query.<table>.findMany({ where, with })`); do NOT mix rqb-v2 syntax — a future course-wide v2 migration would reshape this helper. Components used: `CodeVariants` (wrong/right bug, insert before/after), `AnnotatedCode` (helper internals, registry type), `CodeTooltips` (narrowed call-site type), `TypeCoding` (registry-as-type-error via `@ts-expect-error` polarity), `CodeReview` (3-plant spot-the-missing-scope PR), `Buckets` (tenant vs raw-db client). Built HTML+CSS `<Figure>` `<RegistryToSurface/>` (`components/lessons/056/2/`): registry → typed factory → scoped surface flow. Two `VideoCallout`s: `YaSPB2uNLYg` (CodeOpinion shared-DB tenancy model), `iCEJY9XpfG8` (Typed Rocks mapped types). Mentions `authedAction` as the matched-pair carve-out for Chapter 057 L2.

## Lesson 3 — When RLS earns its cost

**Taught.** Decision lesson (no syntax wired): RLS as a conditional power tool weighed against the `tenantDb` default — what RLS buys (per-row policy enforced inside the DB on every query/connection/path, total within the DB boundary, independent of app discipline) vs its three costs (per-connection session variable; harder local debugging / "why no rows" loop; silent-fail policies); the pooled-connection footgun (session var persists across connection reuse → cross-tenant leak, mitigated by `SET LOCAL` in a transaction — named, not wired); the three triggers any-one-of-which flips the decision (highest-stakes/unrecoverable-leak data, many paths the helper can't span, external writers with DB creds); RLS as defense-in-depth (app still uses `tenantDb` on RLS tables; two layers fail independently); the "RLS everywhere" anti-pattern; the per-table design-time decision procedure (stakes → paths → default). Verdict for this stack: **RLS on `audit_logs`, application scope everywhere else.**

**Cut.** The Neon-vs-vanilla `crudPolicy`/`pgPolicy` split (chapter outline placed it here) deferred to L4 as the authoring surface; mentioned only as a one-line `:::note` ("next lesson uses a typed authoring surface; on Neon that's `crudPolicy`"). RLS performance and multi-region replicas not discussed.

**Debts.**
- Policy syntax, `ENABLE`/`FORCE ROW LEVEL SECURITY`, `current_setting`/`::uuid` cast, the `SET LOCAL` transaction discipline + `withTenant(orgId, fn)` helper, isolation integration test — **Chapter 056 L4**.
- `audit_logs` table itself (columns, write events, `logAudit`) — **Chapter 057 L5**; this lesson only decides it earns a policy. Forward refs phrased "table arrives next chapter; policy wired next lesson."
- Compromised-app-server / least-privilege DB roles (no `BYPASSRLS` on app role, separate migration vs request role) — named once as RLS's blind spot, full coverage **Chapter 081**.

**Terminology.** **policy** = per-row boolean rule Postgres evaluates per query; **session variable** = connection-scoped key/value read via `current_setting`, holds the tenant id. Mantra: "`tenantDb` is *always*; RLS is *sometimes, and on top*." Two gates a request clears (app scope + DB policy), "independent layers that fail independently." The pooled-connection footgun is the canonical name for the leak. Illustrative-only single line shown (not to copy): `USING (organization_id = current_setting('app.org_id')::uuid)`.

**Patterns and best practices.**
- Application-layer `tenantDb` is the unconditional year-1 default on every tenant table; RLS is added per-table only when a trigger fires — never as a blanket policy (blanket RLS makes the conditional layer mandatory and lets the mandatory layer rot).
- On an RLS table the app *still* scopes with `tenantDb` — RLS never replaces the helper.
- RLS decision is per-table at table-design time, not a project-wide switch (same project: RLS on `audit_logs`, none on `invoices`).
- `SET LOCAL` inside an explicit transaction is the only safe way to set the tenant variable on a pooled connection; plain `SET` leaks across requests.
- For this stack the only table that earns RLS is `audit_logs` (trips both highest-stakes and many-writer-paths triggers). Convention: RLS reserved for `audit_logs` / append-only / quarantined tiers.

**Misc.** No quiz/sandbox (decision lesson, nothing runnable). Components used: `StateMachineWalker` (per-table decision tree, centerpiece), `TabbedContent` (`syncKey="pooled-connection-footgun"`) w/ two Mermaid `sequenceDiagram`s (footgun leak vs fix, font bumped via `themeCSS`), `CardGrid` (three triggers, icons `warning`/`code-branch`/`puzzle`), native Markdown comparison table, custom HTML+CSS `<LayeredDefenseGates/>` two-gate layered-defense figure (`components/lessons/056/3/`), `Buckets` (twoCol) + `TrueFalse` (6 statements) checks, four `ExternalResource` (Postgres RLS docs, Drizzle RLS docs, AWS multi-tenant RLS, Nile silent-fail write-up). Tables sorted in exercises: `audit_logs` (RLS) vs `invoices`/`customers`/`documents` (`tenantDb` only); deliberately omits `payment_methods` to keep the 3:1 split clean.

## Lesson 4 — Wiring RLS on audit_logs

**Taught.** Four composing artifacts: (1) the `pgPolicy('audit_logs_org_isolation', { as:'permissive', for:'all', to: authenticatedRole, using/withCheck: sql\`${t.organizationId} = current_setting('app.org_id', true)::uuid\` })` block + `.enableRLS()` authored in-schema; (2) the owner-bypass trap — `ENABLE` ≠ `FORCE`, drizzle-kit emits ENABLE only, so `FORCE ROW LEVEL SECURITY` is added by hand in a `--custom` follow-up migration; (3) `withTenant(orgId, fn)` — opens an explicit `db.transaction`, runs `set_config('app.org_id', orgId, true)` (transaction-local, parameterized), then the caller's `fn(tx)`; (4) the read-only isolation test (insert org A + org B rows, `withTenant(A)` select with NO `where`, assert one row). Spine concepts: `USING` (read filter) vs `WITH CHECK` (write filter); `SET` vs `SET LOCAL` pooled-connection leak; fail-closed via `, true` (missing_ok → NULL → zero rows) and `::uuid` cast (rejects junk like `'all'`/`'%'`).

**Cut.** None material — outline scope delivered. `crudPolicy` (Neon) shown as a CodeVariants alternative tab but `pgPolicy` is the taught default (portability).

**Debts.**
- The `audit_logs` table itself (columns, write events) + the **sibling append-only policy** (deny UPDATE/DELETE) + the `logAudit(tx, event)` writer — **Chapter 057 L5**. This lesson wired ONLY the org-isolation `FOR ALL` policy; named the append-only policy as a second concern owned there.
- DB-role split / least-privilege: request handlers run as non-owner app role (no `BYPASSRLS`), migrations/admin/cross-org reads as owner via `DATABASE_URL_OWNER` / `dbUnpooled` — named as the two-URL shape, full role grants **Chapter 081**.
- The isolation test is shown as code to READ; it lands in the integration suite **Chapter 088** (real Postgres). Cross-org admin/compliance audit reads (owner-role bypass) named once, full coverage Unit 21.
- `authedAction` wrapper still owed — **Chapter 057 L2**.

**Terminology.** **SET LOCAL** = sets a config value only until the current transaction ends. **set_config(name, value, is_local)** = function form of SET; third arg `true` = transaction-local, and unlike raw `SET` it accepts a bind parameter (why the helper uses it). `withTenant` is the DB-layer sibling of `tenantDb` (L2) — they compose, additive never either/or. Policy name canonical: `audit_logs_org_isolation`. Session variable name: `app.org_id`.

**Patterns and best practices.**
- Policy lives in the schema (single source of truth), never a hand-edited migration — drift in a security boundary is the bug to avoid; `drizzle-kit generate` derives the SQL.
- Every RLS table: **enable AND force** (checklist item). Read the generated RLS migration before shipping — drizzle-kit omits FORCE.
- `withTenant`: `import 'server-only'`, arrow fn, explicit generic signature `<T>(orgId, fn: (tx: Transaction) => Promise<T>): Promise<T>` (mirrors `tenantDb` factory discipline). Requires a `Transaction` type exported from `@/db`.
- Tenant variable set with `set_config(..., true)` inside an explicit transaction — never raw `SET`, never a pool "on connect" hook (per-request value, not per-connection).
- Audit writes are pure DB work — fine inside the transaction (the no-external-IO-in-tx rule still holds).
- Defense in depth on the write: action sets `organizationId: orgId` explicitly in `values` (app layer) AND the policy's `WITH CHECK` pins it (DB layer) — a single bug must defeat both to leak.
- Never grant the app role `BYPASSRLS` for local-dev convenience; for ad-hoc psql connect as owner or `\set app.org_id` in `~/.psqlrc`.

**Misc.** Pinned Drizzle 0.45 / drizzle-kit 0.31 → `.enableRLS()` + `pgPolicy(...)`; 1.0-beta renames `.enableRLS()` → `pgTable.withRLS(...)` (forward note only). `authenticatedRole` imported from `drizzle-orm/neon` (also exports `crudPolicy`). Helper placed under `db/` (sibling to `tenantDb` at `@/db/tenant.ts`); `withTenant` imports `import type { Transaction } from '@/db'`. **NO live coding component** — PGlite does not enforce RLS, so a sandbox would pass with the policy deleted (the precise false confidence the lesson warns against); the isolation test ships as `Code` to read. Components used: three `AnnotatedCode` (raw `CREATE POLICY` sql, schema `pgPolicy` block, `withTenant` ts); three `CodeVariants` (pgPolicy-vs-crudPolicy choice, ENABLE-vs-FORCE wrong/right, SET-vs-SET-LOCAL wrong/right); two `Code` (compose action snippet, isolation test); custom `RlsRequestLifetime` figure (`components/lessons/056/4/`, 6-step request lifetime, centerpiece, HTML+CSS); `Sequence` exercise (lifecycle order) + `MultipleChoice` (forgot-withTenant fail-closed); one `VideoCallout` (`vZT1Qx2xUCo`, Paul Copplestone/Supabase POSETTE RLS talk); three `ExternalResource` (Postgres RLS, Drizzle RLS, Neon RLS+Drizzle).
