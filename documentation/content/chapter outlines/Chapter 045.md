# Chapter 045 — Project: the org-scoped invoicing data layer

## Chapter framing

Chapter 045 cashes in everything Unit 6 installed: the relational model and the unpooled-URL discipline (chapter 040), the schema authoring vocabulary — `pgTable`, types, modifiers, UUIDv7 PKs, FK + `ON DELETE`, unique/check, junction tables, Relations v2, `$inferSelect`/`$inferInsert` (chapter 041) — the query toolkit — joins, the relational query API, cursor pagination with the n+1 trick, `EXPLAIN ANALYZE` (chapter 042, chapter 043) — and the migration + seed workflow (chapter 044). The student ships the canonical org-scoped invoicing data layer: `organizations`, `users` (Better Auth tables stubbed for now), `org_members`, `customers`, `invoices`, `invoice_lines`. They generate and run the migration against local Docker Postgres, write a deterministic `drizzle-seed` script that produces two orgs with overlapping members and 50+ invoices each, and write the two reads every later unit will reuse: a cursor-paginated org-scoped invoice list with a status filter, and a single-round-trip "one invoice with lines and customer" detail load.

Threads that run through every lesson: the schema is the source of truth — types, queries, the inspector page, and every later unit derive from `db/schema.ts`; every tenant-owned row carries an `organization_id` FK and every read on a tenant table starts with `where eq(organizationId, ...)` — Unit 10's `tenantDb` helper is the structural enforcement, this chapter just installs the manual discipline so the helper has something to wrap; FK `ON DELETE` is a decision per edge, defaulted to `cascade` for owned-children edges and `restrict` for referenced-entity edges; indexes earn their weight by being demanded by a query the chapter actually ships — composite `(organization_id, created_at, id)` for the cursor list, `customer_id` for the detail join; the seed is idempotent (`reset` then `seed` with a fixed seed number) so re-runs produce the same data, and FK-aware so parents land before children; `EXPLAIN ANALYZE` is the proof step, not a feeling. The chapter ships 1 brief + 1 starter walkthrough + 3 build lessons + 1 verify lesson, each build ending on a runnable state.

### Dependency carry-in

- **From lesson 2 of chapter 040 / lesson 4 of chapter 040:** Docker Postgres compose file for local; the unpooled `DATABASE_URL_UNPOOLED` wired for Drizzle Kit, the pooled `DATABASE_URL` wired for the app's `db` client.
- **From lesson 2 of chapter 041–lesson 10 of chapter 041:** `pgTable`, `casing: 'snake_case'`, the Postgres types (`uuid`, `numeric(12, 2)`, `timestamptz`, `text`, `jsonb`, enum via `pgEnum`), `NOT NULL` / `DEFAULT` / `$defaultFn`, UUIDv7 primary keys via `$defaultFn(() => uuidv7())`, FK + `ON DELETE`, `unique()` + `check()`, junction-table shape for `org_members`, `defineRelations` in `db/relations.ts`, `$inferSelect` / `$inferInsert`.
- **From lesson 1 of chapter 042 / lesson 2 of chapter 042 / lesson 3 of chapter 042 / lesson 6 of chapter 042:** `select` + `where eq(...)` + `orderBy` + `limit` parameterization; `innerJoin` mechanics; `db.query.invoices.findFirst({ with: { lines: true, customer: true } })` for the detail load; cursor pagination's `or(lt(sortKey, x), and(eq(sortKey, x), lt(id, y)))` predicate with the `limit(pageSize + 1)` "has next page" trick.
- **From lesson 1 of chapter 043 / lesson 3 of chapter 043:** Composite index ordering matches the query's `orderBy`; B-tree as the default; `EXPLAIN ANALYZE` reading bottom-up.
- **From lesson 1 of chapter 044 / lesson 3 of chapter 044:** `drizzle-kit generate --name ...`, the meta snapshot, `db:migrate` / `db:seed` scripts, `seed(db, schema, { seed: 1 }).refine(...)` shape with `weightedRandom`, `valuesFromArray`, `with`, the `reset(db, schema)` idempotency move.
- **From chapter 039 / chapter 037:** The Next.js App Router scaffold and server-side data reads — the inspector page is a Server Component.
- **From chapter 008 / chapter 009:** Zod schemas for the cursor and the status filter at the read boundary.

### Better Auth carry-out

The Unit 9 Better Auth Drizzle adapter owns `users`, `sessions`, `accounts`, `verifications`. This project stubs `users` as a minimal table (`id` UUIDv7, `email` unique, `name`) so `org_members.user_id` and `invoices.created_by` have a target; the stub schema matches Better Auth's table name and the columns later layers read. Unit 9's project drops the stub and switches to Better Auth's generated tables — the FK targets stay the same so the migration is additive, not destructive.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml             # provided: postgres:18 service on :5432
drizzle.config.ts              # provided: dialect, schema path, out, dbCredentials, casing
.env.example                   # provided: DATABASE_URL, DATABASE_URL_UNPOOLED, SEED
package.json                   # provided: db:generate, db:migrate, db:seed, db:studio scripts
src/
  db/
    client.ts                  # provided: pooled `db` instance + relations
    schema.ts                  # TODO student: every table
    relations.ts               # TODO student: defineRelations
    cursor.ts                  # provided: base64url encode/decode + Zod cursor schema
  lib/
    invoices/
      queries.ts               # TODO student: listInvoices, getInvoiceDetail
      schema.ts                # provided: statusSchema, listInvoicesInputSchema
  app/
    inspector/
      page.tsx                 # provided: server component, reads ?orgId & ?cursor & ?status, renders list + detail
      seed-button.tsx          # provided: client form -> server action that calls the seed script
scripts/
  seed.ts                      # TODO student: reset + seed.refine with two orgs, 50+ invoices each
drizzle/                       # generated by db:generate, committed
```

### Reference solution signatures lessons display

- `organizations`: `id uuid pk`, `name text not null`, `slug text not null unique`, `createdAt timestamptz default now()`.
- `users` (stub for Unit 9): `id uuid pk`, `email text not null unique`, `name text not null`, `createdAt timestamptz default now()`.
- `orgMembers` (junction): composite PK `(organizationId, userId)`, `role` pgEnum `('owner', 'admin', 'member')` not null, `createdAt timestamptz default now()`, both FKs `on delete cascade`.
- `customers`: `id uuid pk`, `organizationId uuid not null references organizations(id) on delete cascade`, `name text not null`, `email text not null`, `createdAt timestamptz default now()`, `unique (organizationId, email)`.
- `invoices`: `id uuid pk`, `organizationId uuid not null references organizations(id) on delete cascade`, `customerId uuid not null references customers(id) on delete restrict`, `createdBy uuid not null references users(id) on delete restrict`, `number text not null`, `status` pgEnum `('draft', 'sent', 'paid', 'overdue')` not null default `'draft'`, `total numeric(12, 2) not null`, `currency text not null default 'USD'`, `issuedAt timestamptz not null`, `dueAt timestamptz not null`, `createdAt timestamptz not null default now()`, `unique (organizationId, number)`, `check (total >= 0)`.
- `invoiceLines`: `id uuid pk`, `invoiceId uuid not null references invoices(id) on delete cascade`, `description text not null`, `quantity numeric(12, 2) not null`, `unitPrice numeric(12, 2) not null`, `position integer not null`, `unique (invoiceId, position)`.
- Indexes (named): `invoices_org_status_created_id_idx` on `(organizationId, status, createdAt desc, id desc)`; `invoices_org_created_id_idx` on `(organizationId, createdAt desc, id desc)`; `invoices_customer_id_idx` on `(customerId)`.
- `defineRelations` exports: `organization -> many(orgMembers, customers, invoices)`, `user -> many(orgMembers, invoices via createdBy)`, `invoice -> one(organization), one(customer), one(createdBy), many(invoiceLines)`.
- Cursor type: `{ createdAt: string; id: string }`, base64url-encoded JSON, validated with Zod.
- `listInvoices({ organizationId: string, status?: InvoiceStatus, cursor?: Cursor, pageSize?: number }): Promise<{ rows: Invoice[]; nextCursor: string | null }>` — uses `db.query.invoices.findMany` with `where`, `orderBy: [desc(createdAt), desc(id)]`, `limit(pageSize + 1)`, includes `customer: true` for the list cell.
- `getInvoiceDetail({ organizationId: string, invoiceId: string }): Promise<InvoiceWithRelations | null>` — uses `db.query.invoices.findFirst` with `with: { lines: { orderBy: asc(position) }, customer: true }` and a `where` that AND-includes `organizationId` (tenant guard).
- Env entries (in `.env.example`): `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app?sslmode=disable`, `DATABASE_URL_UNPOOLED=postgres://postgres:postgres@localhost:5432/app?sslmode=disable` (same URL locally; the variable split exists so the deploy story in Unit 21 plugs Neon in without renaming), `SEED=1`.

### Inspector page spec

A single Server Component at `/inspector` with these surfaces, all read from `searchParams`:

- **Header:** Org switcher (two seeded orgs, `?orgId=...`), status filter buttons (`all` / `draft` / `sent` / `paid` / `overdue`), a "Reset and re-seed" form that posts to a Server Action calling the student's seed script.
- **List panel (left):** Calls `listInvoices` with the current `orgId`, `status`, `cursor`. Renders the rows (number, customer name, status badge, total, due date). Footer shows "Next page" `<Link>` carrying the `nextCursor` in the URL, disabled when null.
- **Detail panel (right):** When `?invoiceId=...` is present, calls `getInvoiceDetail` and renders the invoice header, the customer, the line items ordered by `position`. When absent, shows an empty-state.
- **Plan panel (bottom):** A `<details>` that, when expanded, fires the detail query wrapped in `db.execute(sql\`explain (analyze, buffers, format text) ...\`)` and renders the plan text in a `<pre>`. Pre-built so the student doesn't write it; verifies that the index gets used.
- **Verification banner:** Renders the row counts (`organizations`, `users`, `org_members`, `invoices`, `invoice_lines`, `customers`) at the top so re-running the seed and counting is one glance.

The inspector is provided in full; the student fills the queries it imports.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| `drizzle-kit migrate` runs cleanly on an empty database | Drop the local `app` database, `pnpm db:migrate`, no errors; `__drizzle_migrations` has one row. |
| Seed populates two orgs with overlapping members and 50+ invoices each | After `pnpm db:seed`, the inspector banner shows `organizations: 2`, `org_members: 5+` (with at least one user belonging to both orgs), `invoices: ≥ 100`. |
| Seed is idempotent | Run `pnpm db:seed` twice; row counts and a sampled row's primary key set are identical between runs. |
| Inspector paginates one org's invoices | Click "Next page" 3 times; URL carries a fresh `?cursor=...` each time, list rows don't repeat. |
| `?status=paid` filters server-side | Click "paid"; URL shows `?status=paid`, list only shows paid rows, hard reload preserves. |
| Detail loads in a single round trip | Click an invoice; the plan panel shows one query plan with one outer `Index Scan` on `invoices`, joined to `customers` and `invoice_lines` in the same plan. |
| `EXPLAIN ANALYZE` on the detail query uses the right indexes | The list query plan shows `Index Scan using invoices_org_status_created_id_idx` (or the no-status variant) — not `Seq Scan`. |

### Concepts demonstrated → owning lesson

- Architectural Principle #2 (schema is the source of truth) — lesson 1 of chapter 041.
- `pgTable`, casing — lesson 2 of chapter 041. Postgres types via Drizzle (`uuid`, `numeric`, `timestamptz`, `jsonb`, `pgEnum`) — lesson 3 of chapter 041.
- Column modifiers (NOT NULL, DEFAULT, `$defaultFn` for UUIDv7) — lesson 4 of chapter 041. UUIDv7 PKs — lesson 5 of chapter 041.
- FK + `ON DELETE` decisions — lesson 6 of chapter 041. UNIQUE + CHECK — lesson 7 of chapter 041. Junction tables (`org_members`) — lesson 8 of chapter 041.
- `defineRelations` v2 declarative API — lesson 9 of chapter 041. `$inferSelect` / `$inferInsert` — lesson 10 of chapter 041.
- Joins (relational query API does the work) — lesson 2 of chapter 042. Relational query API nested reads — lesson 3 of chapter 042.
- Cursor pagination with the n+1 trick — lesson 6 of chapter 042.
- Composite index ordering matching `orderBy` — lesson 1 of chapter 043. `EXPLAIN ANALYZE` — lesson 3 of chapter 043.
- `drizzle-kit generate` / `migrate` / studio — lesson 1 of chapter 044. `drizzle-seed` with `.refine`, `weightedRandom`, `with`, the reset-then-seed idempotent pattern — lesson 3 of chapter 044.
- Server-side `searchParams` reads, Zod at the boundary (cursor validation) — lesson 4 of chapter 037.

---

## Lesson 1 — The brief: what we're building and what we're not

Frames the org-scoped invoicing surface, the seven "Done when" verifications, the explicit scope cuts (no mutations, no real auth, no RBAC yet), and the senior payoff of installing tenant-aware schema discipline now.

Goals:

- Frame the SaaS shape being built: org-scoped invoicing is the canonical relational surface every later unit (CRUD, auth gates, RBAC, billing) layers on top of; this chapter ships the schema and the two reads, nothing else.
- State the seven "Done when" verifications in one paragraph (clean migrate, two orgs, idempotent seed, paginated list, server-side status filter, single-round-trip detail, indexed plans).
- Name the scope cut: no mutations (Unit 7 owns Server Actions and CRUD on top of this schema), no real Better Auth tables (Unit 9 swaps the stub), no RBAC at the query layer (Unit 10 wraps these reads with `authedAction` and `tenantDb`).
- Set the senior payoff: the schema decisions made now — `organizationId` on every tenant-owned row, the composite index for cursor pagination, the relations declaration that turns "one invoice with lines and customer" into one query — are the foundation that makes the rest of the course's data layer cheap. Skipping them surfaces three units later as N+1s, full table scans, and tenant-leak bugs.
- Show the end UX: one screenshot of the inspector with the org switcher, the paginated list, an expanded detail, and the visible plan panel.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The "schema is the source of truth" decision means the project's row types come from `$inferSelect`, not hand-written types — anything else drifts.
- `organizationId` on every tenant-owned row is non-negotiable. Skipping it on one table is the failure mode that turns into a multi-day RLS migration two units later. Name the structural rule.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, `docker compose up -d` running Postgres, `pnpm install` clean, `pnpm dev` shows the inspector with empty banners (no tables exist yet).

Estimated student time: 10 to 15 minutes.

---

## Lesson 2 — Tour of the starter and the inspector contract

Walks the provided file tree (`drizzle.config.ts`, the pooled `db` client, the cursor helpers, the inspector page, the `db:*` scripts), brings up Docker Postgres, and pins the contracts the student's queries must satisfy.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on three files: `drizzle.config.ts` (the one config that drives `generate`, `migrate`, `push`, `studio` — point at the unpooled URL, casing, schema path), `src/db/client.ts` (the pooled `db` exported with the relations bag attached), `src/db/cursor.ts` (the encode/decode helpers and Zod schema the queries reuse — provided because the encoding contract is not the lesson).
- Read `src/lib/invoices/schema.ts` — the `statusSchema` enum, the `listInvoicesInputSchema` (orgId, optional status, optional cursor, pageSize default 20, cap 100). The Zod input is what the inspector page calls with; the same shape will be reused in Unit 7's Server Action.
- Read `src/app/inspector/page.tsx` end-to-end — the searchParams reads, the call sites for `listInvoices` and `getInvoiceDetail`, the plan-panel `<details>` that runs `EXPLAIN ANALYZE`. Name what each call expects so the student knows the contract their queries must satisfy.
- Read the `package.json` scripts — `db:generate`, `db:migrate`, `db:seed`, `db:studio` — and the env loading path (`dotenv-cli` wraps Drizzle Kit invocations because Drizzle Kit doesn't read `.env` by itself, lesson 1 of chapter 044).
- Bring up Postgres: `docker compose up -d`, `psql` in to confirm the empty `app` database exists. `pnpm db:migrate` will succeed against it (no tables yet, just creates `__drizzle_migrations`).
- Open `pnpm db:studio`, confirm an empty schema browser.

Senior calls and watch-outs:

- The pooled URL drives the app's runtime queries; the unpooled URL drives Drizzle Kit. Running migrations against the pooled URL silently truncates long DDL — this is the lesson from lesson 4 of chapter 040 made concrete. The starter wires both correctly; the watch-out is reaching for the pooled URL in any new script the student writes later.
- The cursor encoder/decoder lives in `db/cursor.ts`, not duplicated per query. Same shape every paginated list will reuse — Architectural Principle #3 (named seams) starting early.

Codebase state at entry: starter cloned, Postgres running.
Codebase state at exit: student has read every provided file, run `db:migrate` against the empty DB once, opened Studio. No code written. The inspector still renders empty.

Estimated student time: 20 to 25 minutes.

---

## Lesson 3 — Authoring the schema and shipping the init migration

Fills `db/schema.ts` and `db/relations.ts` with the six tables (`organizations`, `users` stub, `org_members`, `customers`, `invoices`, `invoice_lines`) including UUIDv7 PKs, FK `ON DELETE` decisions, tenant-scoped uniques, the three composite indexes, and the `$inferSelect` row types, then generates and runs the initial migration.

Goals:

- Fill `src/db/schema.ts` table by table in the order FKs demand: `organizations`, `users` (stub), `orgMembers` (composite PK referencing the two), `customers`, `invoices`, `invoiceLines`. Each table calls out the senior decisions inline:
  - `id uuid` with `$defaultFn(() => uuidv7())` (UUIDv7 from lesson 5 of chapter 041 — sortable, no cross-table guess-leak).
  - `timestamptz` for every timestamp, never `timestamp` (the lesson 3 of chapter 041 rule).
  - `numeric(12, 2)` for money, never `real` or `double precision`.
  - `pgEnum` for `role` and `status` (DB-enforced).
  - FK `ON DELETE`: `cascade` on `org_members → organizations/users`, `cascade` on `customers → organizations`, `cascade` on `invoices → organizations`, `restrict` on `invoices → customers` (customers shouldn't disappear under an invoice — the lesson 6 of chapter 041 decision), `restrict` on `invoices → users`, `cascade` on `invoice_lines → invoices`.
  - `unique(organizationId, number)` on invoices, `unique(organizationId, email)` on customers, `unique(invoiceId, position)` on invoice_lines — every uniqueness scope is tenant-aware (the structural rule).
  - `check(sql\`total >= 0\`)` on invoices — DB-enforced invariant (lesson 7 of chapter 041).
  - Indexes declared at the bottom of each table: composite `(organizationId, status, createdAt desc, id desc)`, `(organizationId, createdAt desc, id desc)`, `(customerId)`. Order matches the query's `orderBy` direction — the rule from lesson 1 of chapter 043.
- Fill `src/db/relations.ts` using `defineRelations` v2: `organization` → many of `orgMembers`/`customers`/`invoices`, `user` → many `orgMembers` and `invoices` (via `createdBy`), `customer` → many `invoices` and one `organization`, `invoice` → one `organization`/`customer`/`createdBy`, many `invoiceLines`, `invoiceLine` → one `invoice`. Two relations from `invoices` to two different roles must be named (e.g., `creator` for the user-side join) — the senior call from lesson 9 of chapter 041.
- Export `Invoice = typeof invoices.$inferSelect`, `NewInvoice = typeof invoices.$inferInsert`, same for the other tables — the canonical row types that flow into `queries.ts` and the inspector.
- Run `pnpm db:generate --name init_schema`. Open the emitted SQL. Read it together: confirm every `CREATE TABLE`, every FK with the right `ON DELETE`, every index, every constraint. This is the review step from lesson 1 of chapter 044.
- Run `pnpm db:migrate`. Confirm in Studio: six tables, indexes visible, FKs visible.
- Re-run `db:generate` immediately: emits an empty migration ("no changes"). The senior signal that the snapshot is in sync.

Senior calls and watch-outs:

- Every tenant-owned table carries `organizationId` as a NOT NULL FK. The one table that doesn't carry it is `users` (which is global across orgs); that's the structural distinction membership tables make explicit (`org_members` joins them).
- The composite index column order matches the `where` + `orderBy` of the list query, not alphabetical or random — the cursor query's plan depends on it. Name the rule, then verify with `EXPLAIN ANALYZE` in lesson 6 of chapter 045.
- `cascade` vs. `restrict` is a decision per edge, not a default to copy. The mental model: cascade for owned children that lose meaning without the parent, restrict for referenced entities whose absence the schema can't make sense of. Name it once at `customers → invoices` and the student carries it through.
- Don't reach for `drizzle-kit push` here — even on a fresh database, the generate-and-commit loop is the muscle. The push-as-prototype lane is lesson 2 of chapter 044's escape hatch, not the project's default.

Codebase state at entry: empty `db/schema.ts`, no migration files.
Codebase state at exit: schema and relations committed; one migration file (`0000_init_schema.sql`) plus its `meta/` snapshot committed; six tables exist in Postgres; `db:generate` reports no further changes. Inspector still renders empty (no rows yet).

Estimated student time: 50 to 70 minutes.

---

## Lesson 4 — A deterministic, idempotent seed for two orgs

Writes `scripts/seed.ts` using `reset` plus `seed().refine(...)` with `weightedRandom`, `valuesFromArray`, and `with` to produce two orgs with overlapping members and 100+ invoices, dropping to direct `db.insert` where the seeder's shape doesn't fit.

Goals:

- Fill `scripts/seed.ts`: import `db`, the schema bag, `seed` and `reset` from `drizzle-seed`. The script's shape is `await reset(db, schema); await seed(db, schema, { seed: Number(process.env.SEED ?? 1) }).refine(...)`.
- Refine table by table:
  - `organizations`: `count: 2`, columns `name` from a curated `valuesFromArray` (`Acme`, `Globex`), `slug` matching.
  - `users`: `count: 4`, `email` unique (`valuesFromArray` with 4+ curated values), `name` from name generators.
  - `orgMembers`: insert explicitly after the seed call — `drizzle-seed`'s `with` doesn't model the overlapping-membership shape cleanly. Use a small follow-up `db.insert(orgMembers).values([...])` block to assign: user 1 → org 1 (owner), user 2 → org 1 (member), user 3 → org 2 (owner), user 4 → org 2 (member), user 1 → org 2 (admin) — the overlap that the Unit 10 RBAC project will exercise. Name the senior call: when the seeder's shape doesn't fit, drop to direct inserts; mixing both is the pattern.
  - `customers`: `count: 30`, `with: { invoices: 4-7 }` per customer — drives the invoice count past 100 organically. Columns: `name` from `companyName`, `email` unique-ish per org. Distribute customers across the two orgs via `organizationId` from `valuesFromArray` of the two org IDs (read after the orgs land — done by splitting the seed into two `.refine` calls, or by manual inserts; the lesson teaches the split).
  - `invoices`: `count` driven by `with` from customers, columns: `status` via `weightedRandom` (`paid` 50%, `sent` 25%, `draft` 15%, `overdue` 10% — realistic distribution from lesson 3 of chapter 044), `total` `f.number({ minValue: 100, maxValue: 25000, precision: 100 })`, `number` from a sequence helper (`INV-0001`...), `issuedAt` `f.date` spread over the last 90 days, `dueAt` 30 days after `issuedAt` (computed post-seed or via a small follow-up update). `createdBy` from `valuesFromArray` of the relevant org's members.
  - `invoiceLines`: `with: { count: 1-5 }` per invoice, `quantity`, `unitPrice`, `description` from `valuesFromArray` of curated service descriptions, `position` 1..N per invoice (post-seed update to renumber within each invoice).
- Add the `db:seed` script: `dotenv -e .env -- tsx scripts/seed.ts`. The script `process.exit(0)`s on success.
- Run it. Open Studio; eyeball: two orgs visible, the membership rows show the overlap, customers have a realistic spread, invoices show status distribution, line items count.
- Run it again. Confirm row counts and a sampled invoice's `id` are identical — the determinism guarantee. This is the idempotency the inspector banner will read.
- Update the inspector banner to count rows (already wired; just confirm).

Senior calls and watch-outs:

- `drizzle-seed`'s `with` is per-parent count, not total. `customers` with `with: { invoices: 4-7 }` and `count: 30` produces 120-210 invoices, not 4-7. Name the trap from lesson 3 of chapter 044.
- When `drizzle-seed`'s shape doesn't fit (overlapping memberships, computed columns), drop to direct `db.insert(...)` after the `seed(...)` call. The seeder is the bulk shape; manual inserts are the targeted corrections. Mixing both inside one script is the senior pattern, not the smell.
- The fixed seed number is the determinism contract. Bumping it intentionally shifts the data shape; changing the `.refine` config without bumping the number silently breaks the contract — the watch-out from lesson 3 of chapter 044.
- `reset(db, schema)` uses `TRUNCATE ... CASCADE` which holds locks; fine against local Docker, would be a problem against a shared dev branch. Local-only is the rule.
- The script reaches the unpooled URL via `DATABASE_URL_UNPOOLED` to handle the longer transaction the seed produces — the same rule as migrations.

Codebase state at entry: schema and migration in place, but the database is empty (or holds only the `__drizzle_migrations` row).
Codebase state at exit: running `pnpm db:seed` populates the database; the inspector banner shows the expected counts; running it twice produces identical state. The list and detail panels still don't render (queries still TODO).

Estimated student time: 55 to 75 minutes.

---

## Lesson 5 — Writing the two tenant-scoped reads

Implements `listInvoices` (cursor pagination with the composite tiebreaker predicate and the `limit(pageSize + 1)` trick) and `getInvoiceDetail` (relational `findFirst` with `lines` and `customer`), with the `organizationId` tenant guard baked into every `where`.

Goals:

- Fill `src/lib/invoices/queries.ts` with `listInvoices`. The shape:
  - Validate inputs against `listInvoicesInputSchema` (orgId required, status optional, cursor optional decoded via `cursor.decode`, pageSize default 20 cap 100).
  - Use `db.query.invoices.findMany`: `where` AND-combines `eq(invoices.organizationId, organizationId)`, optional `eq(invoices.status, status)`, and the cursor predicate `or(lt(invoices.createdAt, cursor.createdAt), and(eq(invoices.createdAt, cursor.createdAt), lt(invoices.id, cursor.id)))` when cursor is present. `orderBy: [desc(invoices.createdAt), desc(invoices.id)]`. `limit(pageSize + 1)`. `with: { customer: true }` because the list cell shows the customer's name and that's still a single query through the relational API (the join is one round trip).
  - Slice the first `pageSize` rows; `nextCursor = rows.length > pageSize ? cursor.encode({ createdAt, id } of the last returned) : null`. Return `{ rows, nextCursor }`.
- Fill `getInvoiceDetail`:
  - Validate inputs (`organizationId`, `invoiceId`).
  - `db.query.invoices.findFirst({ where: and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)), with: { lines: { orderBy: asc(invoiceLines.position) }, customer: true } })`. The tenant guard is `eq(organizationId, ...)` in the `where`, not "load and then check" — security at the query, not the post-condition.
  - Return `null` if not found.
- The inspector page already calls both; refresh the page. The list panel paginates, the detail loads. Click "Next page", confirm a new `?cursor=...` in the URL. Click an invoice, confirm the detail loads with its lines and customer in one paint.
- Switch the org in the org switcher; confirm rows differ. Try `?status=paid`; confirm filtering. Try `?invoiceId=<id-from-org-A>&orgId=<org-B>`; confirm the detail returns `null` (the tenant guard holds).

Senior calls and watch-outs:

- Cursor pagination requires the tiebreaker — sorting only by `createdAt` skips or duplicates rows when two invoices share a timestamp. The composite predicate is mandatory, not optional. The lesson 6 of chapter 042 rule made concrete.
- Tenant filter goes in the `where`, not after the load. The "load then check" pattern is the failure mode that surfaces as IDOR — anyone with a valid invoice ID from any org reads it. The structural rule is `where: and(eq(organizationId), eq(id))`; this is what Unit 10's `tenantDb` will enforce structurally but the manual discipline starts here.
- The relational query API (`with: { ... }`) issues either one query or a small batch under the hood — well within "single round trip" territory because the planner sees the joins. Compare to a manual loop of `getCustomer(invoice.customerId)` + `getLines(invoice.id)` which would be 3 round trips. Name the contrast, point at lesson 2 of chapter 043 for the N+1 deep dive.
- The `nextCursor` is null when fewer than `pageSize + 1` rows came back; the inspector's "Next page" link is disabled in that case. The n+1 trick avoids a separate `count()` round trip — the lesson 6 of chapter 042 punchline.
- The Zod parse on `listInvoicesInputSchema` is the same shape Unit 7 will reuse against a Server Action `formData`. Architectural Principle #3 at work — the schema is in `/lib`, callers compose it.

Codebase state at entry: schema and seeded data ready; inspector renders empty list and empty detail.
Codebase state at exit: inspector fully functional. List paginates with cursors, filters by status, switches between orgs; detail loads with relations; tenant guard verified by attempting a cross-org `invoiceId`. Plan panel `<details>` still un-inspected — that's lesson 6 of chapter 045's verification step.

Estimated student time: 50 to 70 minutes.

---

## Lesson 6 — Verifying the seven "Done when" clauses

Runs each Done-when check end-to-end (clean migrate, idempotent seed, cursor pagination, server-side status filter, cross-org tenant guard, single-round-trip detail, `EXPLAIN ANALYZE` showing the right indexes) and forward-references Units 7, 9, 10, and 11.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- Drop and re-create the database (`docker compose down -v && docker compose up -d && pnpm db:migrate`) — confirm a clean migrate on a fresh database with no errors and one row in `__drizzle_migrations`.
- `pnpm db:seed` twice in a row — confirm the banner shows identical row counts and a sampled invoice's `id` is the same across runs (the determinism guarantee).
- Inspector pagination: click "Next page" three times against one org; copy each cursor value; confirm no row repeats across the three pages (open Studio if needed).
- Status filter: click `paid`; URL shows `?status=paid`; only paid rows render; hard reload preserves; URL share to a second tab reproduces the view.
- Cross-org tenant guard: hand-construct an inspector URL with `orgId` of org A and `invoiceId` from org B (read from Studio); confirm the detail panel renders empty-state, not the leaked invoice.
- Expand the plan panel on the detail load — confirm the plan shows `Index Scan using invoices_pkey` (the PK lookup) joined to `customers` and `invoice_lines` in one plan. Read the plan bottom-up using the lesson 3 of chapter 043 vocabulary. Note the `actual time` per node and the buffer hit/read counts.
- Switch the plan panel to the list query (provided control). Confirm without `?status=...` the plan uses `invoices_org_created_id_idx`; with `?status=paid` the plan uses `invoices_org_status_created_id_idx`. If either falls back to `Seq Scan`, the index column order is wrong — point at lesson 3 of chapter 045 and the lesson 1 of chapter 043 rule.
- Name the senior calls one more time:
  - Schema is the source of truth: types, queries, the inspector, every later layer flow from `db/schema.ts`.
  - Every tenant-owned read filters by `organizationId` in the `where`, never after the load.
  - Cursor pagination requires the tiebreaker; the composite index column order matches the `orderBy`.
  - `EXPLAIN ANALYZE` is the proof of "this query is fast for the reason I think it is" — feel doesn't count.
  - Seeds are deterministic and idempotent; the reset-then-seed shape is the contract.
- Forward references:
  - Unit 7 will add Server Actions that mutate this schema with Zod validation at the action boundary, and `useOptimistic` on top of `listInvoices`.
  - Unit 9 will drop the `users` stub and switch to Better Auth's tables — additive migration, the FK targets stay.
  - Unit 10 will wrap `listInvoices` and `getInvoiceDetail` in a `tenantDb(orgId)` helper that makes the missing `organizationId` filter structurally impossible to write — this chapter built the discipline manually so the wrapper has something to enforce.
  - Unit 11 will turn the inspector's URL-state into the production list view with soft delete, sort controls, and optimistic concurrency.

Senior calls and watch-outs:

- The verify lesson is the rehearsal of the failure modes — running each one and naming what would break without the discipline the student just installed.
- If a verification fails, the lesson points at the owning build lesson, not at "debug it yourself."

Codebase state at entry: full schema, seed, and queries working.
Codebase state at exit: same surface, verified clause-by-clause; the plan output proves the indexes earn their weight; the student can articulate every schema decision and which later unit will lean on it.

Estimated student time: 25 to 35 minutes.
