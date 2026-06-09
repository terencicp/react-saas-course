# Chapter 061 — Soft delete, archive, and concurrency

## Lesson 1 — Two timestamps, three actions

**Taught.** Two orthogonal axes (soft-vs-hard delete = recovery/storage; soft-delete-vs-archive = product/UX contract), the `lifecycleColumns` helper (`deletedAt`, `archivedAt`, `updatedAt`), the `softDelete`/`archive`/`restore` Server Actions under `authedAction`+`tenantDb`, the tri-state visibility filter, restore semantics + cascade symmetry, and partial unique/composite indexes as the hardening layer.

**Cut.** The chapter outline said all three actions "bump `version`" — the `version` column was NOT introduced here; it is fully deferred to Lesson 3 (the actions shown set only timestamps). Lesson 3 owns adding `version` to the schema and to every UPDATE.

**Debts.**
- To Lesson 2: the missing-`deletedAt IS NULL` leak and the "every read/write carries the filter" problem are named as pain only; the base-query helper that makes the filter the only compilable shape is promised as "the next lesson." Lesson 1 lands `db/queries/invoices.ts` in the FileTree as that helper's home.
- To Lesson 3: `updatedAt` is flagged as the hook a later lesson "leans on to make concurrent edits honest"; the parent-still-deleted orphan is named as a hazard whose clean 409 surfacing is Lesson 3's concurrency machinery.
- To Ch 081: audit-log table and GDPR erasure pipeline named as touch-points only, owned later.

**Terminology / mental models.**
- "Two timestamps, three actions" — a row's lifecycle state is *derived* from `deletedAt`/`archivedAt` (not a stored enum); the three actions are the edges of a 4-state machine (`Active`/`Archived`/`Soft-deleted`/terminal `Hard-deleted`). Archived-then-deleted is a legal path (deleted overrides as effective state).
- "Soft delete is a write, not a delete" — the load-bearing repeated phrase; sets up Lesson 2's filter pain and the cascade surprise.
- Course product default committed: **archive = primary user surface, soft delete = admin recovery surface, two nullable timestamp columns** (chosen over a single `status` enum).
- Tri-state list filter: `parseAsStringEnum(['active','archived','all']).withDefault('active')` via `?status=` (composes Ch 060 URL state); `all` is role-gated.

**Patterns / best practices (for the project chapter to mirror).**
- Lifecycle columns declared once in a `lifecycleColumns` object, spread (`...lifecycleColumns`) into every entity table.
- `updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())`; `$onUpdate` is app-layer (fires only when drizzle-orm issues the UPDATE, invisible to raw SQL / drizzle-kit). `new Date()` here is the sanctioned `Date` carve-out at the Drizzle storage seam.
- Action body is ~3 lines: `ctx.db` is already `tenantDb(orgId)`, so the `where` carries only the id predicate — tenancy never hand-typed. Actions take role `'member'`, schema `z.object({ id: z.uuid() })`, return `ok(null)`, and call `revalidatePath('/invoices')` before return (five seams: parse/authorize/mutate/revalidate/return).
- `restore` clears **both** `deletedAt` and `archivedAt` to `null` and is idempotent (returns `ok` on an already-active no-op).
- Cascade soft-delete must be one `db.transaction` (the FK `ON DELETE CASCADE` does NOT fire on an UPDATE); the transaction uses the **raw** `db` (not `ctx.db`) and writes the tenancy predicate by hand via `ctx.orgId`, threading `tx` through parent + children.
- Partial unique index: `uniqueIndex('<t>_<cols>_unique').on(...).where(sql\`${t.deletedAt} is null\`)` — `.unique()` shorthand can't carry `WHERE`, and the predicate **must** be a raw `sql\`\`` fragment (a helper like `eq(t.deletedAt, null)` emits a broken parameterized migration). Partial composite hot-path index named with `_partial` suffix, lead columns with `orgId`; skip the partial when table small / deleted ratio tiny.
- File layout: `db/schema.ts` (helper + tables + indexes), `db/queries/<entity>.ts` (read helpers — Lesson 2's home), route `actions.ts`, list `page.tsx`. Note this uses `db/queries/` per the code standard, deliberately diverging from the chapter outline's `/lib/queries`.

**Misc.**
- Casing is client-level (`casing: 'snake_case'`), so schema uses camelCase declarations; `DrizzleSchemaCoding` exercises intentionally diverge (explicit snake_case names, plain `integer` identity PKs, no `uuidv7()`) due to PGlite limits — flagged as deliberate in-lesson.
- Convention: timestamps stored as `timestamp({ withTimezone: true })` → `timestamptz`.

## Lesson 2 — Making the missing filter impossible

**Taught.** The per-entity lifecycle query helper layered on Ch 056 tenancy: shared `activeFilter`/`archivedFilter(table)` predicate builders + a `scopedInvoices(orgId)` factory exposing `active()`/`archived()`/`includingDeleted()`, each returning a chainable `.$dynamic()` builder; the call-site payoff (unscoped read = grep-able different shape); the join discipline (named functions in `db/queries/<entity>.ts` re-applying the shared predicate to every joined table); the raw/perf-query carve-out; role-gating `includingDeleted()` via `authedAction`; and the read/write scoping symmetry (writes already scoped via `tenantDb`) that sets up Lesson 3's `version` predicate.

**Cut.** The chapter outline's recommended factory surface `tenantDb(orgId).invoices.active()` was NOT built — the helper is a standalone `scopedInvoices(orgId)` factory that spells the org predicate inline (`eq(invoices.organizationId, orgId)`) rather than composing onto the `tenantDb` client, because list reads need a chainable `select().$dynamic()` builder which `tenantDb`'s `findMany` surface isn't; flagged in-lesson as a deliberate, consistent choice (same org predicate, different composition shape). The chapter-outline `/lib/queries` path is `db/queries/` per the code standard (consistent with Lesson 1). The lint rule banning raw `db.select().from(<entityTable>)` is named only, not implemented (Unit 1 owns lint setup).

**Debts.**
- To Lesson 3: read/write scoping symmetry stated — actions' UPDATE `WHERE` already carries tenancy via `tenantDb`; Lesson 3 adds a third `version` predicate to that same `WHERE`, turning "zero rows affected" from quiet success into an honest 409.
- To Ch 081 (security/audit): audit-log entries around the escape hatch (who pulled deleted data, when) named as the touch-point that hangs off the gated `includingDeleted()` action; GDPR exports named as an `includingDeleted()` consumer.

**Terminology / mental models.**
- "Optional correctness is the bug; defense is a call shape, not diligence" — restated from Ch 056 as the lesson's spine; lifecycle filter = the *same* move as the tenancy filter, applied a second time and *stacked* (two predicates `and`-ed into one `WHERE`, neither hand-typed).
- The stacking figure: caller contributes only ordering/paging (no predicate); lifecycle layer contributes `deleted_at IS NULL AND archived_at IS NULL`; tenancy layer contributes `organization_id = :orgId` → one resolved `WHERE`.
- Three-method API maps one-to-one onto Lesson 1 / Ch 060's `?status=active|archived|all`: `active()`→Active tab, `archived()`→Archived tab, `includingDeleted()`→role-gated All view. Escape hatch named *loud* on purpose so `grep includingDeleted` is the audit/review surface; resist `onlyDeleted()`/`withTrashed()`/a `trashed` flag (no fourth product state).
- "escape hatch" = a deliberately-named, gated way out of a discipline, kept visible rather than hidden (same posture as Ch 056's bare `db`).
- Review reflex: don't audit each `where` for a missing `isNull` — check one thing, did the read go through the entity helper or touch bare `db`/`from(<entity>)` directly. Both filters ride the same signal because they live in the same layer.

**Patterns / best practices (for the project chapter to mirror).**
- Shared predicate builders in `db/queries/lifecycle.ts`: `activeFilter(table) = and(isNull(table.deletedAt), isNull(table.archivedAt))`, `archivedFilter(table) = and(isNull(table.deletedAt), isNotNull(table.archivedAt))` — single definition of "active"/"archived" reused by both the helper methods and hand-written joins (a lifecycle-shape refactor touches one file). `archived` = set-aside-but-live (`archivedAt` set, `deletedAt` null); a deleted row is never "archived".
- Per-entity helper in `db/queries/<entity>.ts`, starts `import 'server-only'`, arrow-const factory closing over `orgId`. Methods build `db.select().from(table).where(and(inOrg, <lifecycleFilter>, extra)).$dynamic()`.
- `.$dynamic()` is load-bearing: without it Drizzle locks `.where()`/`.orderBy()`/`.limit()` to one invocation, so a caller chaining a second clause is a compile-time error; `.$dynamic()` is the documented idiom for reusable pre-scoped builders.
- Methods take an optional `extra?: SQL` predicate (passed in and `and`-ed into the single `where`) rather than letting callers chain a second `.where()` (a second `.where()` does NOT merge). No `onlyDeleted()`, no `.raw` passthrough.
- Canonical list read is 3 lines: `requireOrgUser()` → `scopedInvoices(orgId)` → `scoped.active().orderBy(desc(...)).limit(20)`. Caller adds ordering/paging only — *different* clauses from the helper's `where`, so they chain cleanly. Route handlers never `import { db } from '@/db'`.
- Joins: any join goes through a named function in `db/queries/<entity>.ts` that applies the shared filter to *every* joined table explicitly (e.g. `activeFilter(invoices)` AND `activeFilter(invoiceLines)`); reviewed once, one known place.
- Raw/hand-tuned perf queries live in `db/queries/reports/*.ts`, each with a comment naming the perf reason + the `WHERE` clauses replacing the helper's filters, and unit-tested for both lifecycle and tenancy predicates.
- Every `includingDeleted()` call is gated at the action/route layer by `authedAction('admin', schema, fn)` (Ch 057) — helper says "this read includes deleted rows", wrapper says "and only an admin may run it". An ungated `includingDeleted()` is a finding on sight. The id predicate is passed into the method (`includingDeleted(eq(invoices.id, id))`), not chained.

**Misc.**
- `DrizzleCoding` (not Schema) exercise: student hand-writes the active-invoices-for-org-1 query (supplying org + both `isNull` predicates) before it's made structural; editor schema uses plain `integer` PKs + explicit snake_case names (PGlite limits), flagged as deliberate vs. the production UUIDv7 + `lifecycleColumns` table.
- `CodeReview` is the lesson's highest-value check: three plants = the three bug-shapes (raw-client read bypassing the helper, ungated `includingDeleted()`, half-filtered join). Continues the chapter's review-driven assessment rhythm (Ch 056 used the same beat).
- Build added a `VideoCallout` (videoId `lDYXtj95Jy8`, Derek Comartin / CodeOpinion, "Should you Delete or Soft Delete?") despite the outline saying video was not recommended — do NOT re-embed it in Lesson 3 or elsewhere in the chapter.
- External resources shipped: Drizzle "Dynamic query building" docs (the `$dynamic()` reference) + a dev.to soft-delete-strategies article that raises Postgres RLS as the DB-side enforcement alternative (RLS thus gets only a resource-card mention, not in-prose teaching; owned by Ch 056 territory).
- Helper imports `db` directly from `@/db` (not the `tenantDb` client) and re-applies the org predicate inline as `eq(invoices.organizationId, orgId)` — the reads side does not route through the `tenantDb` client at all; it reuses only the org-predicate concept. Shared predicate builders live in `db/queries/lifecycle.ts`; methods take `extra?: SQL`.
- The gated escape-hatch example is `restoreInvoice = authedAction('admin', restoreInvoiceSchema, ...)` calling `scoped.includingDeleted(eq(invoices.id, id))` (note: this `restoreInvoice` is an admin recovery read+restore, distinct from Lesson 1's member-level `restore` action).

## Lesson 3 — Version columns and the honest 409

**Taught.** Version-based optimistic concurrency: a `version: integer().notNull().default(1)` column read by the client and checked in the UPDATE's `WHERE` (third predicate alongside id + lifecycle, tenancy via `ctx.db`), with `version = version + 1` in the SET; zero-rows-affected (`updated.length === 0`) = the version moved = return a recoverable 409 carrying the server's fresh `current` row; the React 19 refresh-and-retry form (`useActionState`, hidden `version` input, three-way branch on the Result); the precise `useOptimistic`-on-conflict model; and the carve-out for when last-write-wins is correct.

**Cut.** No `version`/concurrency content was deferred — this lesson delivered the full chapter-outline scope for Lesson 3. The chapter outline's earlier claim (Lessons 1-2) that the lifecycle actions "bump `version`" remains unbuilt: `version` lives only on `updateInvoice` here, not on `softDelete`/`archive`/`restore` (those still set only timestamps). The "Overwrite anyway" `force`-flag action is described as a product affordance but not implemented (named, gated/role-restricted as a sharp edge).

**Debts.**
- To Ch 063 (webhook ingestion): idempotency keys named as the *distinct* mechanism (same write twice vs. two writes clobbering); depth deferred there. Both can coexist on one action.
- To the route-handler layer: the external-transport shape (HTTP 409 + RFC 9457 Problem Details body) is named as the same conflict semantics in a different vocabulary; building the route handler is out of scope (the project status table already pins 409→conflict).
- To Ch 081: audit-log entries on edits named as a touch-point only.

**Terminology / mental models.**
- **last-write-wins** = the default outcome of concurrent writes (last UPDATE silently overwrites, no detection). **Optimistic concurrency** = no lock; read a version, check it still matches at write time; the SaaS web-traffic default. **Pessimistic locking** (`SELECT ... FOR UPDATE`) named + dismissed for web traffic (holds a lock across human think-time); earns weight only in batch/ledger paths the course doesn't reach.
- "Zero rows is a 409, never a quiet success" — the load-bearing phrase. The *number of rows affected* is the conflict signal; `.returning()` is what makes the check possible.
- "One semantics, two transports": in-app Server Action returns the typed `Result`; an external route handler returns HTTP 409 + RFC 9457. Same meaning, different vocabulary.
- The precondition (`WHERE version = N`) and the increment (`SET version = version + 1`) are a *pair* — one is useless without the other; forget the bump and every save succeeds with no conflict ever detected.
- **version precondition ≠ idempotency key**: version stops two *different* writes clobbering; idempotency stops the *same* write landing twice. Orthogonal.
- `useOptimistic` correction (load-bearing, verified vs. react.dev June 2026): automatic rollback fires only when the action *throws*. The course *returns* Results, so on conflict the optimistic value simply *expires when the pending transition ends* and the real state was never advanced — NOT "React rolled back on `ok: false`". Do not write "rollback on error" for the return path.
- Optimistic-mutation state machine `idle → submitting → {success | conflict | error}` (from Ch 005); `conflict` is the named state this lesson adds.
- Explicitly NOT collaborative real-time editing (CRDTs/OT out of course scope) — this answers only "did this whole-form save lose a race?".

**Patterns / best practices (for the project chapter to mirror).**
- `version` column on every user-editable row that two tabs can realistically open at once, decided at schema-design time. Integer (not UUID/timestamp): small, ordered, atomic `+ 1` in SQL.
- Migration is one line: `ALTER TABLE invoices ADD COLUMN version integer NOT NULL DEFAULT 1` — `DEFAULT 1` backfills every existing row in one pass (no rolling update). The cheap part is the schema change; the cost is the discipline of including `version` in every future UPDATE.
- The `+ 1` is done in SQL via the sanctioned `sql\`${invoices.version} + 1\`` tagged-template carve-out (keeps the increment atomic; same carve-out as Lesson 1's partial-index predicate). Do NOT enforce the increment with a DB `BEFORE UPDATE` trigger — keep the bump visible at the call site (explicit beats clever).
- `updatedAt` is NOT set in the UPDATE's SET — Lesson 1's `$onUpdate` already stamps it on every Drizzle UPDATE. (Note: this corrects the chapter outline's `updatedAt: sql\`NOW()\`` in the SET — it would double-stamp.)
- Conflict Result is an *honest extension* of the base `Result`: a small `conflict(current)` helper spreads `err('conflict', userMessage)` and adds `current` as a sibling field. `'conflict'` is an existing code in the union (not new); the base `err(code, userMessage, fieldErrors?)` does NOT carry `current` (its 3rd arg is `fieldErrors`) — present `current` as a deliberate add, not something `err()` already gives.
- Ship the fresh server row *in* the rejection (`return conflict(await currentInvoice(ctx, input.id))`) rather than letting the client re-fetch — a re-fetch is a wasted round-trip and racy.
- Form: `useActionState(updateInvoice, null)`; `version` rides as a hidden uncontrolled input (`defaultValue`, per the forms convention) so it travels in `FormData`; on `ok:true` the form's `row` becomes the returned row so the hidden `version` auto-picks-up the new value (else the next save self-conflicts). Three-way branch: `ok:true` / `ok:false && error.code==='conflict'` (banner with `current`) / other `ok:false` (generic error path).
- Conflict banner offers "Use latest and edit again" (safe default — replaces form values + hidden version with `current`) and "Overwrite anyway" (sharp edge — re-fires with a `force` flag bypassing the precondition; role-gate or hide; never a casual convenience).
- `updateInvoiceSchema` is the drizzle-zod-derived update schema carrying `id` (uuid), `amount`, and `version` (int) — same derive-from-base pattern as the chapter's other actions. `authedAction('member', schema, fn)`, five-seam shape.
- `updatedAt`-as-precondition is the column-free fallback (`eq(invoices.updatedAt, input.updatedAt)`) — use ONLY when adding a column is impossible (frozen/legacy schema) and precision is high. Its real risk is *serialization* (precision truncation / timezone mangling across the boundary), NOT clock skew (both reads come from the server's clock).

**Misc.**
- Result discriminants are `error.code` and `error.userMessage` (not `.type`/`.message`).
- The `ReactCoding` exercise is React-family-only (no Server Action, mocked Result with `current` as sibling of `error`); tests assert conflict banner shows server `current.amount`, success updates the displayed value, and a hidden `name="version"` input exists.
- Cross-ref correction applied: `useOptimistic` is Ch 044 **Lesson 5** (the chapter outline's "lesson 6" is wrong) — cite Lesson 5 or just "Chapter 044".
- The shipped `EditInvoiceForm` wires only `useActionState` (NOT `useOptimistic`) — the `useOptimistic`-on-conflict model is taught as a note that "applies the moment you layer optimistic UI on top," not as form code; don't assume the reference form uses it.
- Two `VideoCallout`s shipped: `eMotoFvgdUo` (Arpit Bhayani, "Optimistic Locking — What, When, Why, and How?") and `QWVr7uDyBXE` (Jack Herrington, "React 19's useOptimistic"). Do NOT re-embed these elsewhere in the chapter.
- External resource cards shipped: react.dev `useActionState`, RFC 9457, Wikipedia "Optimistic concurrency control", MDN "409 Conflict".
- The conflict helper is generic: `const conflict = <T>(current: T) => ({ ...err('conflict', userMessage), current })`.
