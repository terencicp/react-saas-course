# Chapter 057 — Roles, action wrappers, and the audit trail

## Lesson 1 — Owner, admin, member

**Taught** — Year-1 three-role RBAC (`owner`/`admin`/`member`) as a cumulative authority gradient codified once in `lib/auth/roles.ts`, the single-owner invariant, the `roleAtLeast` comparison, and `requireOrgUser` extended to read the role fresh per request plus thin `requireAdmin`/`requireOwner` page guards.

**Debts**
- Lesson 2 owes `authedAction(role, schema, fn)` — explicitly forward-referenced as the mutation-boundary twin of `requireAdmin`; lesson stresses "a protected page is not a protected action."
- Lesson 4 owes the member-management actions that call `isLastOwner` and refuse with `'last-owner'`; this lesson names the invariant, the count query, and the code but builds no actions.
- Lesson 5 owes the `audit_logs` table.
- Chapter 058 owes the invitation flow; this lesson fixes the contract "the inviter chooses the role, acceptance copies `invitation.role` verbatim onto `member.role`."

**Terminology / contracts**
- `Role` union (`'owner' | 'admin' | 'member'`) is the single place a role name is written; `ROLE_RANK = { member: 0, admin: 1, owner: 2 } as const satisfies Record<Role, number>` is the order; `roleAtLeast(role, required)` is the only comparison.
- `'last-owner'` is a **domain reason code** (distinct from the transport `Result.error.code` enum `'forbidden'`/`'invalid-input'`/etc. that lesson 2 introduces); `isLastOwner(orgId)` is the named helper.
- `lib/auth.ts` (session-read ladder + `requireOrgUser`) and the `lib/auth/` directory (`roles.ts`, `guards.ts`) **intentionally coexist side by side** — file vs. directory of the same stem.
- Role read via `auth.api.getActiveMember({ headers })` then `activeMember.role` (matches the canonical Ch056 `requireOrgUser`; the active-org role is NOT on the session payload by default). `requireOrgUser` is wrapped in `cache(...)` and resolves the session through the cached `getSession()` ladder helper, so it is memoized per request (reads role once).
- `requireOrgUser` return tightened from Ch056's `role: Role | null` to `role: Role` (non-null) — now that role gates, an active org with no membership is a broken state that redirects rather than casting over null. Lessons 2–5 rely on `ctx.role` being a definite `Role`.
- Redirect targets used: `requireOrgUser` → `/sign-in` (no session), `/onboarding/create-org` (no active org, OR active org with no membership — the single route that tolerates a null active org, per Ch056); `requireAdmin`/`requireOwner` → `/` on insufficient role.

**Patterns and best practices**
- `lib/auth/roles.ts` has NO `import 'server-only'` (pure vocabulary, safe for Client Components to hide buttons); `lib/auth/guards.ts` DOES start with `import 'server-only'`.
- Guards compose by wrapping `requireOrgUser`, never duplicating it; they return the same `{ user, orgId, role }`.
- Never put role on `user` (`isAdmin`); role lives on the `member` row keyed by `(orgId, userId)`. Never accept arbitrary strings on the column.
- View-as is a UI rendering flag only; server checks always read the real role.

**Cut** — The chapter outline's guessed `organization({ allowedRoles: [...] })` config was correctly dropped (not the real plugin API); custom roles via `createAccessControl` + `roles` map named only as the future reach (trigger: a paying customer asks for a seat the three roles can't express).

## Lesson 2 — The authedAction wrapper

**Taught** — `authedAction(role, schema, fn)`, the one sanctioned wrapper at the Server Action boundary that lifts the three pre-DB checks (session resolve → role authorize → schema parse) out of every action body so the role becomes a required argument, not a forgettable line; the pre-built `ctx` payload; and the `Result`-not-exceptions / fail-closed return discipline.

**Debts**
- Lesson 3 owes `authedRoute(role, schema, fn)` — same signature, body `(input, ctx) => Promise<Response>`, failures as HTTP status + Problem Details instead of `Result`. Explicitly forward-linked.
- Lesson 4 owes the member-management actions (`removeMember`, change role, leave, transfer) all built on `authedAction`; this lesson uses `removeMember` only as a naming example, builds none.
- Lesson 5 owes the audit-log write, which lives **inside the action body, not the wrapper** (wrapper is entity-agnostic). Stated as firm division: "wrapper carries authz; body carries audit."
- Security-baseline chapter (080) owes the deeper fail-closed treatment; named once here.

**Terminology / contracts**
- **Signature:** `authedAction(role: Role, schema, fn)` — a factory returning `async (formData: FormData) => Promise<Result<TOut>>`. Generic `<Schema extends z.ZodType, TOut>`; `fn: (input: z.infer<Schema>, ctx: Ctx) => Promise<Result<TOut>>`. `TOut` inferred from `fn`. Lessons 3–5 must import and call it with this exact arg order.
- **`ctx` payload:** `{ user: User; orgId: string; role: Role; db: TenantDb }` — `db` is `tenantDb(orgId)`, already tenant-scoped. Body never re-resolves session, re-reads role, or touches the bare `db`. "Resolve once, hand down, never re-fetch."
- **Gate order (fixed):** resolve (`requireOrgUser()`) → authorize (`roleAtLeast`) → parse (`safeParse`) → call (`fn`). Authorize before parse deliberately (cheapest security gate fails fastest).
- **Gate exits:** resolve fails → redirect propagates (framework edge, the one correct throw); authorize fails → `return err('forbidden', 'You do not have permission to do this.')`; parse fails → `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`; call → `fn`'s `Result` passes straight through. Same `roleAtLeast` check as lesson 1's `requireAdmin` but **returns** instead of **redirects** (action seam vs page seam).
- **Transport codes used:** `'forbidden'` (authorize) and `'validation'` (parse) — the wrapper only ever emits transport codes. NOTE: shipped lesson uses `'validation'`, not the lesson-1 continuity entry's `'invalid-input'`; treat `'validation'` as canonical for parse failures (matches outline §contract-alignment). Domain reasons like `'last-owner'` stay inside the body, distinct from transport codes.
- **Import path:** `tenantDb` is imported from `@/lib/tenant-db`; lessons 3–5 must use this exact path. Other wrapper imports: `requireOrgUser` from `@/lib/auth`, `roleAtLeast`/`type Role` from `@/lib/auth/roles`, `err`/`type Result` from `@/lib/result`.
- **File location:** `lib/auth/authed-action.ts`, starts with `import 'server-only'` (sibling to `roles.ts` and `guards.ts`; only `roles.ts` lacks `server-only`).
- **Naming convention (reaffirmed):** Server Actions are verb+noun (`removeMember`, `deleteCustomer`), no `Action` suffix unless disambiguating — deliberate divergence from the chapter outline's `removeMemberAction`. Lessons 4–5 should follow this.

**Patterns and best practices**
- `authedAction` is named the **single sanctioned exception** to "consume libraries directly," paired with `tenantDb` as its data-layer twin; justified by the missing-role-check bug class, not elegance. Do NOT add steps (entitlements, rate limiting, logging, audit) to the wrapper — each belongs elsewhere. Keep it exactly session + role + schema.
- Action body after wrapping = just the work: mutation via `ctx.db`, `revalidatePath`, `ok(...)` return. Typically 5–20 lines.
- Fail-closed: any exception inside an authz check is a refusal; never `catch`-and-proceed on auth.
- CSRF is NOT the wrapper's job — Next.js handles it (POST-only invocation + Origin/Host check on top of SameSite cookies).
- `FormData` is the default/only built call shape; a typed-object/JSON sibling variant is named in one sentence but not built — lessons should stay on the `FormData` → `Object.fromEntries` → `safeParse` path.

**Cut** — Wrapper-seam logging/observability context (outline brainstorm) dropped (would bloat the wrapper, contradicts the keep-it-small thesis); the `authedAction.json` typed-object variant named but not built; the chapter outline's `'invalid-input'` code corrected to `'validation'`.

## Lesson 3 — The authedRoute twin

**Taught** — `authedRoute(role, schema, fn)`, the route-handler twin of `authedAction` for non-React callers (webhooks, partner servers, mobile); same four gates and same `ctx`, the only divergence being the wire format (HTTP status + RFC 9457 Problem Details, not `Result`); the 400/401/403/404/422 status map; multi-source parse (`{ params, query, body }`, cheapest-first); and the shared-`/lib`-function pattern that lets one mutation serve both doors.

**Debts**
- Lesson 4 owes the five member-management flows — all `authedAction` (the dashboard is React); this lesson explicitly states route handlers are NOT required there (pick the door by caller).
- Lesson 5 owes the audit-log write, which flows through the shared `/lib` business function (not the wrapper), so it lands whichever door called.
- Chapter 063 (webhook lesson) owes `Idempotency-Key` dedup; named as a wrapper seam only.
- Bearer-token / machine-to-machine identity and CORS named once, not built (cookie session is the default identity; CORS is a `next.config.ts`/middleware concern).

**Terminology / contracts**
- **Signature:** `authedRoute(role: Role, schema, fn)` — factory returning `async (request: Request, route: { params: Promise<unknown> }) => Promise<Response>`. `fn: (input: z.infer<Schema>, ctx: Ctx) => Promise<Response>` — business fn returns a `Response`, not a `Result`. Same first two args and same `ctx` (`{ user, orgId, role, db }`) as `authedAction`.
- **Session source:** same `requireOrgUser`, but reads `request.headers` (handler holds the request) instead of `await headers()`.
- **Gate exits as HTTP:** no session → propagate (yields 401, no redirect — caller is a program); authorize fail → `problem(403, …)`; body not valid JSON → `problem(400, …)`; schema fail → `problem(422, …, { fieldErrors })`. Same gate order as lesson 2.
- **Status map:** 400 malformed/unparseable · 401 unauthenticated · 403 forbidden · 404 cross-tenant/named-entity-not-found (prefer 404 over 403 on cross-tenant) · 422 well-formed-but-fails-schema. Success: 200 read / 201 create / 204 delete / 200 update.
- **Input schema shape:** `{ params, query, body }` top-level object, each sub-schema parsed from its source; `params` is `await route.params`, `query` from `new URL(request.url).searchParams`, `body` from `await request.json()`. (vs `authedAction`'s flat `FormData` → `Object.fromEntries`.)
- **Problem Details helper:** `problem(status, detail, extras?)` lives at `@/lib/http/problem` (file `src/lib/http/problem.ts`) — the canonical Problem Details shape; emits `application/problem+json` with `{ type, title, status, detail, fieldErrors? }`. `fieldErrors` is the same `Record<string, string[]>` `z.flattenError` produces for the form.
- **Result→Response mapper:** `problemFrom(result.error)` maps a `Result` error code to a status — `'forbidden'`→403, `'validation'`→422, `'conflict'`→409, `'not-found'`→404. The route door calls the shared fn, then `result.ok ? Response.json(result.data, { status }) : problemFrom(result.error)`.
- **File location:** `lib/auth/authed-route.ts`, sibling to `authed-action.ts`, starts with `import 'server-only'`. Verb exports in `route.ts` are **named, one per verb** (`export const POST = authedRoute(...)`), several can share one file.
- **Naming (reaffirmed):** wrapper named for what it is (`authedRoute`); business fn named for what it does (`createInvoice`, `deleteCustomer`), no `Route` suffix.

**Patterns and best practices**
- **One business fn, both doors:** lift the mutation to a pure `createInvoice(input, ctx): Promise<Result<T>>` in `src/lib/<feature>/` with no notion of HTTP/FormData; `authedAction` returns its `Result` as-is, `authedRoute` translates it to a `Response`. This is Architectural Principle #3 (pure logic in `/lib`, side effects at named boundaries). Project codebase should follow this for any mutation reachable from both seams.
- **Authz lives at each door (in the wrapper), never in the shared fn** — the fn assumes it's already authorized + tenant-scoped (received `ctx.db` bound). Don't role-check twice; don't call one door from the other — the meeting point is the `/lib` fn.
- Cheapest-disqualifier-first: role check + JSON-parse reject before the expensive body read.
- Never return `200 { ok: false, error }` from a route handler (`Result` leaking through the wrong door — HTTP clients key off status). Don't throw `redirect()` at a programmatic caller (use explicit status `Response`).
- A tenant-scoped read finding nothing for a *named* entity must return 404, not empty 200 (cross-tenant leak vector).
- `authedRoute` handlers are dynamic by construction (always read `request.headers`) — no explicit `force-dynamic` needed under Cache Components.
- Wrapper stays session + role + schema only; CORS, idempotency, bearer-token, streaming are deliberately left out (seams named, owned elsewhere).

**Misc.** — Status map taught as the fuller five-status set (added **400**) vs the chapter outline's 401/403/422/404 shorthand — intentional, aligns with chapter 046 lesson 3 / conventions; treat the five-status map as canonical.

## Lesson 4 — The five member-management flows

**Taught** — One read (`listMembers`) plus four `authedAction` mutations (change role, remove, leave, transfer ownership), all sharing one body skeleton: read target via `ctx.db` → check domain invariant (`err`) → `withTenant(ctx.orgId, async (tx) => …)` (mutation + `logAudit(tx, …)` together) → `revalidatePath` → `ok`. The transaction is **`withTenant` (imported from `@/db`), NOT `ctx.db.transaction`** — only `withTenant` sets `app.org_id`, which the `audit_logs` RLS policy requires for the audit INSERT; reads stay on `ctx.db`. The load-bearing decision: **write the `member` table directly through Drizzle `tx`, never `auth.api.*`**, so the audit row co-transacts with the mutation (Better Auth 1.5+ runs plugin `after` hooks post-commit, breaking the one-transaction audit contract). UI gate (cosmetic, hide buttons) vs security gate (the wrapper, the real boundary) restated as the lesson's spine.

**Debts**
- Lesson 5 owes `logAudit(tx, event)`, the `audit_logs` table, and the full event catalog — called here as a black box inside each transaction with events `'member.role-changed'` (payload `{ before, after }`), `'member.removed'` (`{ previousRole }`), `'member.left'`, `'org.ownership-transferred'` (`{ from, to, demotedTo }`).
- Chapter 052 owes the fresh-session re-auth gate for high-stakes mutations (named at transfer as `'requires-re-authentication'`) and `revokeOtherSessions` / cookie-cache staleness — named, not built.
- Chapter 058 owes invitations / `addMember` (this lesson only removes/changes/leaves/transfers).
- Chapter 060 owes member-list pagination; chapter 061 owes the optimistic-concurrency `version` column for the simultaneous-write race — both named once, last-write-wins is the year-1 default.

**Terminology / contracts**
- **Action names (verb+noun, no suffix):** `changeMemberRole`, `removeMember`, `leaveOrganization`, `transferOwnership` (supersede the chapter outline's `…Action` names). Schemas: `changeMemberRoleSchema` (`{ memberId: z.uuid(), role: z.enum(['owner','admin','member']) }`), `removeMemberSchema` / `transferOwnershipSchema` (`{ memberId | newOwnerId: z.uuid() }`), `emptySchema` (`z.object({})`) for leave.
- **Wrapper minimums:** change role `'admin'`, remove `'admin'`, leave `'member'`, transfer `'owner'`.
- **Domain reason codes (body, distinct from transport `'forbidden'`/`'validation'`):** `'not-a-member'`, `'cannot-promote-to-owner'` (change role — promotion to owner ONLY via transfer), `'cannot-demote-owner'` (admin can't touch an owner), `'last-owner'` (change role + the implicit self-demote case), `'cannot-target-self'` (remove + transfer), `'cannot-remove-owner'` (remove), `'last-owner-must-transfer'` (leave). Error-code→message table at lesson end is the canonical UI mapping.
- **`logAudit` call shape used:** `logAudit(tx, { action, subjectId?, payload? })` — lesson 5 must accept this signature (a `tx` handle + event object; no `subjectId` on `member.left`).
- **Sibling reads:** `listMembers(orgId)` in `db/queries/members.ts` closing over `tenantDb(orgId)` (no manual `where org_id`), `db.query.member.findMany({ with: { user: true } })`; `listMemberships(userId)` is a cross-org (NOT tenant-scoped) read of a user's remaining memberships, used by leave to pick the active-org fallback.
- **Per-request role read makes removal self-healing:** a removed/left member's session stays valid but the next request's `requireOrgUser` finds no `member` row and redirects to `/onboarding/create-org` (the no-membership broken-state exit) — no logout issued. Bounded by Better Auth's short session cache window.

**Patterns and best practices**
- One `withTenant(ctx.orgId, async (tx) => …)` (imported from `@/db`) per flow — NOT `ctx.db.transaction`; only `withTenant` sets `app.org_id` for the `audit_logs` RLS policy. The mutation and its audit row are inseparable. Reads run on `ctx.db`; `revalidatePath('/settings/members')` lands AFTER commit, outside the transaction.
- The one sanctioned `auth.api` exception is `auth.api.setActiveOrganization` in `leaveOrganization` — it is **post-commit** (session pointer is Better Auth's to own), never inside the transaction. Rule of thumb: audit write = in-transaction (yours); session pointer = post-commit (library's).
- Membership removal is a **hard delete**, not soft delete (membership is present/absent, not a document with a lifecycle; the audit log is the trail).
- There is **no `auth.api.transferOwnership`** — transfer = two role updates (promote target to `'owner'`, demote caller to `'admin'`) + audit, all in one `withTenant` transaction; demote-to-`'admin'` is the year-1 default (`'member'` is a valid product choice).
- `isLastOwner` is the guard the app owns because the app owns the write (not redundant with the plugin); the single last-owner check also covers a sole owner self-demoting.
- Invariant existence checks (`'not-a-member'`) are body DB reads, not Zod (Zod validates shape, not existence). Optimistic UI (`useOptimistic`) named as a reach; default is plain `useActionState`.

**Cut** — The chapter outline's instruction to call `auth.api.removeMember`/`updateMemberRole`/`leaveOrganization` was deliberately reframed to direct-Drizzle writes (the central correction); the outline's/lesson-2's `ctx.db.transaction` was corrected to `withTenant(ctx.orgId, …)` so the audit INSERT passes the `audit_logs` RLS policy (`app.org_id` must be set); the `cannot-promote-to-owner` code was added beyond the outline's listed codes to force ownership changes down the transfer path.

## Lesson 5 — The append-only audit log

**Taught** — The `audit_logs` table (append-only by column shape), the *second* RLS policy denying UPDATE/DELETE (on top of ch056 L4's org-isolation policy), the three-layer append-only defense, and `logAudit(tx, event)` whose `Transaction`-typed first param makes off-transaction calls a compile error (the chapter's "make the wrong shape not compile" thesis, third instance after `tenantDb` and `authedAction`). Plus the audit-worthy judgment (privileged human verbs, not reads/CRUD ticks), payload-as-forensic-diff, the null/system actor, and retention/read-surface as named-not-built forward pointers.

**Terminology / contracts**
- **`auditLogs` table** (canonical shape, downstream Ch081 must match): `id` uuid pk `$defaultFn(uuidv7())` · `organizationId` uuid notNull FK→`organization` `onDelete:'cascade'` (the RLS-scoped column) · `actorUserId` uuid nullable FK→`user` `onDelete:'set null'` (null = system actor; survives user deletion) · `actorIp` **`text`** (NOT `inet` — Drizzle has no first-class `inet` builder; deliberate simplification) · `actorUserAgent` `text` (truncated to 512 at write) · `action` `text` notNull (`entity.verb-pasttense` convention) · `subjectType` `text` · `subjectId` **`text`** (not uuid, holds non-uuid ids) · `payload` `jsonb().$type<Record<string, unknown>>()` · `createdAt` `timestamp({ withTimezone: true })` defaultNow(). **No `updatedAt`, no `deletedAt`** (append-only tell). Indexes: `idx_audit_logs_org_created` on `(organizationId, createdAt desc)`, `idx_audit_logs_org_actor_created` on `(organizationId, actorUserId, createdAt desc)`.
- **`AuditEvent` type:** `{ action: string; subjectType?: string; subjectId?: string; payload?: Record<string, unknown> }` — caller passes ONLY the event. Keeps lesson 4's `logAudit(tx, { action, subjectId?, payload? })` call sites valid.
- **`logAudit(tx: Transaction, event: AuditEvent): Promise<void>`** lives at `db/audit.ts`, `import 'server-only'`. Derives actor/org context itself: `requireOrgUser()` (request-cached) → `actorUserId` + `organizationId`; `await headers()` → `actorIp` (`x-forwarded-for`) + `actorUserAgent` (`user-agent`, sliced to `USER_AGENT_MAX = 512`). Returns `void` (no `Result` — it commits/rolls back with its tx). Reuses the `Transaction` type from `@/db`.
- **The two append-only policies** (added to the same `pgTable`, alongside the indexes): `pgPolicy('audit_logs_no_update', { for: 'update', to: authenticatedRole, using: sql\`false\` })` and the `'audit_logs_no_delete'` twin. `using: sql\`false\`` → no row ever qualifies → UPDATE/DELETE affect zero rows. INSERT/SELECT stay governed by ch056 L4's org-isolation policy. Same `.enableRLS()` + hand-added FORCE checklist as ch056 — not re-taught.

**Patterns and best practices**
- **Three-layer append-only defense** (defense-in-depth, each independently sufficient): (1) column shape — no `updatedAt`/`deletedAt` to mutate; (2) DB policy — `USING (false)` denies UPDATE/DELETE to the app role; (3) app discipline — no `/lib` or `/app` path issues UPDATE/DELETE on `audit_logs`, `logAudit` only inserts. Mantra: **the database refuses; the application never asks.** Project codebase must keep all three (never an `auth.api`/background-deferred audit write).
- **One transaction = the work + one audit row.** `logAudit(tx, …)` rides inside the mutation's `withTenant(orgId, async (tx) => …)` so the row exists iff the work landed. The transaction MUST be `withTenant` (not `ctx.db.transaction`): only `withTenant` runs `set_config('app.org_id', …)`, which the `audit_logs` org-isolation RLS policy's `WITH CHECK` requires — `ctx.db`/`tenantDb` is app-layer scoping only and never sets the variable. Deferring it (`after()`, queue, `logAudit(db, …)`) breaks the iff AND won't compile (bare `db` isn't a `Transaction`). Lesson 4's member actions all write through `withTenant(ctx.orgId, …)` for this reason.
- **Payload = human-readable forensics, not a column dump:** state changes → `{ before, after }` of only changed fields; action events → operation args. Do NOT hash/redact PII in payloads — protection is access control on the table (org-isolation policy + closely-held read surface), not byte opacity.
- Audit successes, not failures (failures → Sentry). Don't double-record events with their own ledger (Stripe → `processed_events`, Ch063). Audit logs are write-heavy/read-rare — index only the two real read queries.

**Debts / forward pointers (all named, none built)**
- **Ch081** owes: the owner-role / least-privilege grants (`DATABASE_URL_OWNER`) that are the only sanctioned UPDATE/DELETE path (legal retraction + retention job); the full security baseline; GDPR/customer-data retention (Ch081 L4) — contrasted as often *shorter* than audit retention (year-1 default ~2yr).
- **Ch063** owes the webhook-driven system-actor case and the `processed_events` idempotency table (distinct from the audit row: dedup vs business record).
- The export-for-legal-response path (writes its own `'audit.exported'` event) and the admin "Activity log" read Server Component — both named, not built.
- System-actor convention: `actorUserId: null`, `action: 'system.<verb>'`, `payload` carries provenance (`{ source, eventId }`).

**Misc.**
- Composition example uses lesson 4's `member.removed` flow verbatim (`payload: { previousRole }`) — confirms L4 call sites compile under the shipped `AuditEvent` type.
- A total-ordering `seq` column for sub-ms tie-breaking was dropped (outline's optional reach); `createdAt` ordering is the year-1 default. No `DrizzleSchemaCoding` exercise (PGlite can't enforce RLS — would give false confidence); judgment `Buckets` + two MCQs carry active recall.

## Lesson 6 — API keys for machine callers

**Taught** — The `api_keys` table (prefix + keyHash split, `revokedAt`-not-delete, no RLS), the hash-and-show-once storage model, admin-gated `createApiKey`/`revokeApiKey` actions with in-transaction `logAudit`, a `resolveApiKey(request)` helper that adds a Bearer branch ahead of the cookie path in `authedRoute` producing the identical `ctx`, `hasScope(ctx, scope)` as a post-role ceiling gate, machine actor representation in the audit trail, the PAT variant (owner-column swap), and Better Auth's `apiKey` plugin as the production replacement.

**Cut** — Settings UI for listing/creating/revoking keys (contract described, page not built); OAuth 2.1 client-credentials (named once, not built); per-key rate limiting depth (seam to ch074 named only); key rotation/expiry schedules (named once); outbound webhook signing.

**Debts**
- Ch058 reuses the hash-and-show-once posture for invitation tokens — forward-pointed explicitly; no debt.
- Ch074 owns per-key rate limiting (`safeLimit` keyed per API key); named, not built.
- Ch081 L3 owns the full four-actor-kinds catalog and `api-key.created`/`api-key.revoked` audit event entries — this lesson ships the calls, ch081 L3 owns the catalog. Audit payload for key events is `{ name, scopes }`.
- Ch081 L4 owns the PAT hard-delete in the account-erasure job.

**Terminology / contracts**
- **`api_keys` table** (Drizzle `pgTable`): `id` uuid pk uuidv7 · `prefix` text notNull unique (`uniqueIndex('api_keys_prefix_unique')`) · `keyHash` text notNull (SHA-256 of the secret half) · `organizationId` uuid notNull FK→`organization` `onDelete:'cascade'` · `createdByUserId` uuid nullable FK→`user` `onDelete:'set null'` · `name` text notNull · `scopes` `text().array().notNull().default([])` · `lastUsedAt` `timestamp({ withTimezone: true })` nullable · `revokedAt` `timestamp({ withTimezone: true })` nullable · `createdAt` `timestamp({ withTimezone: true })` notNull defaultNow(). Index: `idx_api_keys_org_created` on `(organizationId, createdAt desc)`. **No RLS** — ordinary tenant data, scoped via `tenantDb(orgId)`; contrast with `audit_logs`.
- **Key format:** `${prefix}.${secret}` — prefix `rsk_live_<8-char>`, secret 32 bytes CSPRNG base64url. `rsk_test_` prefix for sandbox keys (convention, not enforced by schema).
- **`ResolvedKey` type** returned by `resolveApiKey`: `{ orgId: string; createdByUserId: string | null; scopes: string[] }`. The wrapper then calls `ctxFromKey(resolved)` to read the creating member's role and produce the full `ctx`.
- **`resolveApiKey(request: Request): Promise<ResolvedKey | null>`** at `lib/auth/resolve-api-key.ts` (`import 'server-only'`): no Bearer header → return `null` (fall through to cookie path); malformed `prefix.secret` shape → throw `ApiKeyError` (401) **before any DB read**; lookup by `prefix` uses bare `db` (not `tenantDb` — no ctx yet, this IS the ctx-establishment step); missing row or `revokedAt` set → throw; constant-time compare `sha256Hex(secret)` vs `row.keyHash` via `timingSafeEqualHex` (never `===`); on match bump `lastUsedAt`, return `ResolvedKey`.
- **`authedRoute` diff:** one branch inserted before `requireOrgUser`: `const resolved = await resolveApiKey(request); const { user, orgId, role, scopes } = resolved ? await ctxFromKey(resolved) : await requireOrgUser({ headers: request.headers });` — everything after `ctx` is byte-for-byte unchanged.
- **`ctx` gains optional `scopes?: string[]`** — present for key callers (the key's granted scopes), absent for cookie callers (no ceiling). `hasScope(ctx, scope): boolean` returns `ctx.scopes === undefined || ctx.scopes.includes(scope)` — undefined means unrestricted (cookie path unchanged).
- **Action names:** `createApiKey` and `revokeApiKey` (verb+noun, no suffix — ch057 L2 convention).
- **Schemas:** `createApiKeySchema = z.object({ name: z.string().min(1), scopes: z.array(z.enum(['invoices:read','invoices:write'])) })` (scope as enum, not free-text); `revokeApiKeySchema = z.object({ id: z.uuid() })`.
- **Audit events:** `'api-key.created'` payload `{ name, scopes }` · `'api-key.revoked'` (no payload beyond subjectId). These are the exact strings ch081 L3's catalog must match.
- **Machine actor in audit rows:** `actorUserId = key.createdByUserId` (or `null` for unattended key); `payload` carries `{ viaApiKey: prefix }` so the credential is traceable. No `actorType` column — distinction is null-or-not + action string, per existing schema.
- **PAT variant:** same table shape, `userId` owner instead of `organizationId`; hard-deleted with user (vs `revokedAt` soft-revoke for org keys).
- **Bearer key must be read from `Authorization` header only** — never a query param or custom header (URL leaks into logs/caches).

**Patterns and best practices**
- Revoke is a **state change** (`revokedAt = new Date()`), never a row delete — preserves `lastUsedAt` and the audit trail's subject row.
- The `prefix` lookup during verify is the **one sanctioned bare-`db` read** in the whole app — it runs before `ctx` exists; all other queries use `tenantDb(orgId)` or `ctx.db`.
- Scopes **narrow, never widen** the role — role is the ceiling, scope carves a smaller box beneath it. `hasScope` returning `true` for absent `scopes` preserves the existing cookie-path behavior exactly.
- Constant-time compare (`timingSafeEqualHex`, not `===`) is required for any secret comparison; inline comment `// constant-time compare to prevent timing attack` is the sanctioned form.
- SHA-256 (fast) for high-entropy API key secrets; slow hash (bcrypt/argon) only for human-chosen passwords — same rule as ch058 invite tokens.
- Better Auth `apiKey` plugin (`better-auth/plugins`) is the **production replacement** for the hand-built table; configuring it replaces the hand-built schema. Plugin uses structured permissions object (`{ invoices: ['read'] }`) vs this lesson's flat string array — the flat array is the teaching simplification.

**Misc.**
- Lesson 6 was **inserted after lesson 5** (the audit log) and before the chapter quiz (now lesson 7); quiz already covers API-key identity in its topic list.
- **Key-authenticated audit writes are a direct `tx.insert(auditLogs).values({…})`, NOT a `logAudit(tx, …)` call.** `logAudit` derives actor + org by calling `requireOrgUser()` and `await headers()`, which both read the session cookie — a key caller has no cookie, so `logAudit` would throw. The discipline (ride inside `withTenant` transaction) is unchanged; only the mechanism changes: source `organizationId` and `actorUserId` from the resolved key's `ctx` directly. Ch081 writers must NOT call `logAudit` for key-authenticated paths.
- `ScriptCoding runner="sandpack"` exercise: student implements `resolveApiKey(authHeader)` against an in-memory store with six test cases (null header, malformed, valid, revoked, wrong secret, unknown prefix). The malformed case asserts zero store hits — structural check before DB read.
- `KeyTrustBoundaries` custom component (three-zone figure): database (hash only), logs (prefix only), create response (raw secret, shown once). Deliberate parallel to ch058's token-trust-boundaries figure.
- `TwoDoorsOneCtx` custom component (branch-flow diagram): Bearer branch + cookie branch converging on single `ctx` box, then unchanged gates. Echo of L3's "two doors, one room."
- `ScopeCeiling` custom component (intersection strip): role-allows bar ∩ key-scoped bar = effective bar; "narrowest wins."
