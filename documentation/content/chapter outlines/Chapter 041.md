# Chapter 041 — Project: the org-scoped invoicing data layer

## Chapter framing

Chapter 041 cashes in everything Unit 5 installed: the relational model and the unpooled-URL discipline (chapter 036), the schema authoring vocabulary — `pgTable`, types, modifiers, UUIDv7 PKs, FK + `ON DELETE`, unique/check, junction tables, Relations v2, `$inferSelect`/`$inferInsert` (chapter 037) — the query toolkit — joins, the relational query API, cursor pagination with the n+1 trick, `EXPLAIN ANALYZE` (chapter 038, chapter 039) — and the migration + seed workflow (chapter 040). The student ships the canonical org-scoped invoicing data layer: `organizations`, `users` (Better Auth tables stubbed for now), `org_members`, `customers`, `invoices`, `invoice_lines`. They generate and run the migration against local Docker Postgres, write a deterministic `drizzle-seed` script that produces two orgs with overlapping members and 50+ invoices each, and write the two reads every later unit will reuse: a cursor-paginated org-scoped invoice list with a status filter, and a single-round-trip "one invoice with lines and customer" detail load.

Threads that run through every lesson: the schema is the source of truth — types, queries, the inspector page, and every later unit derive from `db/schema.ts`; every tenant-owned row carries an `organization_id` FK and every read on a tenant table starts with `where eq(organizationId, ...)` — Unit 9's `tenantDb` helper is the structural enforcement, this chapter just installs the manual discipline so the helper has something to wrap; FK `ON DELETE` is a decision per edge, defaulted to `cascade` for owned-children edges and `restrict` for referenced-entity edges; indexes earn their weight by being demanded by a query the chapter actually ships — composite `(organization_id, created_at, id)` for the cursor list, `customer_id` for the detail join; the seed is idempotent (`reset` then `seed` with a fixed seed number) so re-runs produce the same data, and FK-aware so parents land before children; `EXPLAIN ANALYZE` is the proof step, not a feeling.

### Project goals

The student ships a data layer that clears these bars, each verified inside its owning lesson's Moment of truth:

- Build-time env validation catches a missing `DATABASE_URL` before deploy: `pnpm build` fails with a clear error when the variable is absent and succeeds once it is restored.
- `pnpm db:migrate` runs cleanly against an empty database and leaves exactly one row in `__drizzle_migrations`.
- The seed populates two orgs with overlapping members (at least one user in both) and 50+ invoices each, surfaced in the inspector banner as `organizations: 2`, `org_members: 5+`, `invoices: ≥ 100`.
- The seed is idempotent: running it twice produces identical row counts and an identical primary-key set on a sampled table.
- The inspector paginates one org's invoices with no repeated rows across pages, each "Next page" click carrying a fresh `?cursor=...`.
- `?status=paid` filters server-side: the URL carries the status, only paid rows render, and a hard reload preserves the view.
- The invoice detail loads in a single round trip: the plan panel shows one query plan with one outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`.
- The list query's plan uses `invoices_org_created_id_idx` (no status) or `invoices_org_status_created_id_idx` (with status), never a `Seq Scan`.
- Every tenant-scoped read AND-includes `organizationId` in its `where`, so a cross-org `invoiceId` returns the empty state rather than the leaked row.

### Dependency carry-in

- **From lesson 2 of chapter 036 / lesson 4 of chapter 036:** Docker Postgres compose file for local; the unpooled `DATABASE_URL_UNPOOLED` wired for Drizzle Kit, the pooled `DATABASE_URL` wired for the app's `db` client.
- **From lesson 2 of chapter 037–lesson 10 of chapter 037:** `pgTable`, `casing: 'snake_case'`, the Postgres types (`uuid`, `numeric(12, 2)`, `timestamptz`, `text`, `jsonb`, enum via `pgEnum`), `NOT NULL` / `DEFAULT` / `$defaultFn`, UUIDv7 primary keys via `$defaultFn(() => uuidv7())`, FK + `ON DELETE`, `unique()` + `check()`, junction-table shape for `org_members`, `defineRelations` in `db/relations.ts`, `$inferSelect` / `$inferInsert`.
- **From lesson 1 of chapter 038 / lesson 2 of chapter 038 / lesson 3 of chapter 038 / lesson 6 of chapter 038:** `select` + `where eq(...)` + `orderBy` + `limit` parameterization; `innerJoin` mechanics; `db.query.invoices.findFirst({ with: { lines: true, customer: true } })` for the detail load; cursor pagination's `or(lt(sortKey, x), and(eq(sortKey, x), lt(id, y)))` predicate with the `limit(pageSize + 1)` "has next page" trick.
- **From lesson 1 of chapter 039 / lesson 3 of chapter 039:** Composite index ordering matches the query's `orderBy`; B-tree as the default; `EXPLAIN ANALYZE` reading bottom-up.
- **From lesson 1 of chapter 040 / lesson 3 of chapter 040:** `drizzle-kit generate --name ...`, the meta snapshot, `db:migrate` / `db:seed` scripts, `seed(db, schema, { seed: 1 }).refine(...)` shape with `weightedRandom`, `valuesFromArray`, `with`, the `reset(db, schema)` idempotency move.
- **From chapter 035 / chapter 033:** The Next.js App Router scaffold and server-side data reads — the inspector page is a Server Component.
- **From chapter 004 / chapter 005:** Zod schemas for the cursor and the status filter at the read boundary.

### Better Auth carry-out

The Unit 8 Better Auth Drizzle adapter owns `users`, `sessions`, `accounts`, `verifications`. This project stubs `users` as a minimal table (`id` UUIDv7, `email` unique, `name`) so `org_members.user_id` and `invoices.created_by` have a target; the stub schema matches Better Auth's table name and the columns later layers read. Unit 8's project drops the stub and switches to Better Auth's generated tables — the FK targets stay the same so the migration is additive, not destructive.

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
- `users` (stub for Unit 8): `id uuid pk`, `email text not null unique`, `name text not null`, `createdAt timestamptz default now()`.
- `orgMembers` (junction): composite PK `(organizationId, userId)`, `role` pgEnum `('owner', 'admin', 'member')` not null, `createdAt timestamptz default now()`, both FKs `on delete cascade`.
- `customers`: `id uuid pk`, `organizationId uuid not null references organizations(id) on delete cascade`, `name text not null`, `email text not null`, `createdAt timestamptz default now()`, `unique (organizationId, email)`.
- `invoices`: `id uuid pk`, `organizationId uuid not null references organizations(id) on delete cascade`, `customerId uuid not null references customers(id) on delete restrict`, `createdBy uuid not null references users(id) on delete restrict`, `number text not null`, `status` pgEnum `('draft', 'sent', 'paid', 'overdue')` not null default `'draft'`, `total numeric(12, 2) not null`, `currency text not null default 'USD'`, `issuedAt timestamptz not null`, `dueAt timestamptz not null`, `createdAt timestamptz not null default now()`, `unique (organizationId, number)`, `check (total >= 0)`.
- `invoiceLines`: `id uuid pk`, `invoiceId uuid not null references invoices(id) on delete cascade`, `description text not null`, `quantity numeric(12, 2) not null`, `unitPrice numeric(12, 2) not null`, `position integer not null`, `unique (invoiceId, position)`.
- Indexes (named): `invoices_org_status_created_id_idx` on `(organizationId, status, createdAt desc, id desc)`; `invoices_org_created_id_idx` on `(organizationId, createdAt desc, id desc)`; `invoices_customer_id_idx` on `(customerId)`.
- `defineRelations` exports: `organization -> many(orgMembers, customers, invoices)`, `user -> many(orgMembers, invoices via createdBy)`, `invoice -> one(organization), one(customer), one(createdBy), many(invoiceLines)`.
- Cursor type: `{ createdAt: string; id: string }`, base64url-encoded JSON, validated with Zod.
- `listInvoices({ organizationId: string, status?: InvoiceStatus, cursor?: Cursor, pageSize?: number }): Promise<{ rows: Invoice[]; nextCursor: string | null }>` — uses `db.query.invoices.findMany` with `where`, `orderBy: [desc(createdAt), desc(id)]`, `limit(pageSize + 1)`, includes `customer: true` for the list cell.
- `getInvoiceDetail({ organizationId: string, invoiceId: string }): Promise<InvoiceWithRelations | null>` — uses `db.query.invoices.findFirst` with `with: { lines: { orderBy: asc(position) }, customer: true }` and a `where` that AND-includes `organizationId` (tenant guard).
- Env entries (in `.env.example`): `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app?sslmode=disable`, `DATABASE_URL_UNPOOLED=postgres://postgres:postgres@localhost:5432/app?sslmode=disable` (same URL locally; the variable split exists so the deploy story in Unit 20 plugs Neon in without renaming), `SEED=1`.

### Inspector page spec

A single Server Component at `/inspector` with these surfaces, all read from `searchParams`:

- **Header:** Org switcher (two seeded orgs, `?orgId=...`), status filter buttons (`all` / `draft` / `sent` / `paid` / `overdue`), a "Reset and re-seed" form that posts to a Server Action calling the student's seed script.
- **List panel (left):** Calls `listInvoices` with the current `orgId`, `status`, `cursor`. Renders the rows (number, customer name, status badge, total, due date). Footer shows "Next page" `<Link>` carrying the `nextCursor` in the URL, disabled when null.
- **Detail panel (right):** When `?invoiceId=...` is present, calls `getInvoiceDetail` and renders the invoice header, the customer, the line items ordered by `position`. When absent, shows an empty-state.
- **Plan panel (bottom):** A `<details>` that, when expanded, fires the detail query wrapped in `db.execute(sql\`explain (analyze, buffers, format text) ...\`)` and renders the plan text in a `<pre>`. Pre-built so the student doesn't write it; verifies that the index gets used.
- **Verification banner:** Renders the row counts (`organizations`, `users`, `org_members`, `invoices`, `invoice_lines`, `customers`) at the top so re-running the seed and counting is one glance.

The inspector is provided in full; the student fills the queries it imports.

### Concepts demonstrated → owning lesson

- Architectural Principle #2 (schema is the source of truth) — lesson 1 of chapter 037.
- `pgTable`, casing — lesson 2 of chapter 037. Postgres types via Drizzle (`uuid`, `numeric`, `timestamptz`, `jsonb`, `pgEnum`) — lesson 3 of chapter 037.
- Column modifiers (NOT NULL, DEFAULT, `$defaultFn` for UUIDv7) — lesson 4 of chapter 037. UUIDv7 PKs — lesson 5 of chapter 037.
- FK + `ON DELETE` decisions — lesson 6 of chapter 037. UNIQUE + CHECK — lesson 7 of chapter 037. Junction tables (`org_members`) — lesson 8 of chapter 037.
- `defineRelations` v2 declarative API — lesson 9 of chapter 037. `$inferSelect` / `$inferInsert` — lesson 10 of chapter 037.
- Joins (relational query API does the work) — lesson 2 of chapter 038. Relational query API nested reads — lesson 3 of chapter 038.
- Cursor pagination with the n+1 trick — lesson 6 of chapter 038.
- Composite index ordering matching `orderBy` — lesson 1 of chapter 039. `EXPLAIN ANALYZE` — lesson 3 of chapter 039.
- `drizzle-kit generate` / `migrate` / studio — lesson 1 of chapter 040. `drizzle-seed` with `.refine`, `weightedRandom`, `with`, the reset-then-seed idempotent pattern — lesson 3 of chapter 040.
- Server-side `searchParams` reads, Zod at the boundary (cursor validation) — lesson 4 of chapter 033.

---

## Lesson 1 — Project Overview

### What we're building

Org-scoped invoicing is the canonical relational surface every later unit — CRUD, auth gates, RBAC, billing — layers on top of.
This project ships the data layer for it and nothing else: six tables, the relations, the init migration, a deterministic seed, and the two reads every later unit reuses.
The student explores the result through a provided inspector page at `/inspector` — an org switcher, a cursor-paginated invoice list with a server-side status filter, a single-round-trip detail panel, and an `EXPLAIN ANALYZE` plan panel that proves the indexes earn their weight.
Figure: one screenshot of the inspector with the org switcher, the paginated list, an expanded detail, and the visible plan panel.

### What we'll practice

- Translating a tenant-aware SaaS data model into a Drizzle schema where the schema is the single source of truth and every row type flows from `$inferSelect`.
- Deciding FK `ON DELETE` per edge and scoping every uniqueness constraint and index to the tenant.
- Authoring a deterministic, idempotent seed that mixes the bulk seeder with targeted direct inserts.
- Writing tenant-scoped reads — cursor pagination and a relational nested load — with the `organizationId` guard baked into every `where`.
- Reading an `EXPLAIN ANALYZE` plan to confirm a query is fast for the reason you think it is.

### Architecture

Labeled list of the layers, shape only: the schema and relations in `db/`, the typed reads in `lib/invoices/`, the seed in `scripts/`, and the provided inspector Server Component in `app/inspector/` that reads everything from `searchParams`.
The schema sits at the center — types, queries, inspector, and every later unit derive from it.

### Starting file tree

See the "Starter file tree" under Chapter framing. Reproduce it here annotated: comment only the files lessons will touch, mark the three TODO files (`db/schema.ts`, `db/relations.ts`, `lib/invoices/queries.ts`, `scripts/seed.ts`) as the highlighted focus, and leave the provided plumbing uncommented. Deep per-file explanation lives in the Implementation lesson that first touches each file, not here.

### Roadmap

One Card per lesson in a CardGrid:

- Lesson 2 — Type-safe environment variables: a missing `DATABASE_URL` fails the build instead of crashing the first request.
- Lesson 3 — Authoring the schema and shipping the init migration: the six tables, relations, and indexes land in Postgres.
- Lesson 4 — A deterministic, idempotent seed: two orgs with overlapping members and 100+ invoices, identical on every run.
- Lesson 5 — The tenant-scoped invoice list: cursor pagination with a server-side status filter, proven against its query plan.
- Lesson 6 — The single-round-trip invoice detail: one invoice with its lines and customer, guarded by `organizationId`.

### Setup

Steps component, in order, with the expected outcome on success:

1. `degit` the starter into a new directory (name the repo path).
2. `pnpm install` — completes with no errors.
3. Copy `.env.example` to `.env.local` and fill the values. Env vars: `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (the Postgres connection string; locally the same value, obtained from the Docker Compose service), `SEED` (the fixed seed number, default `1`).
4. `docker compose up -d` — brings up the `postgres:18` service on `:5432`.
5. `pnpm dev` — the inspector renders at `/inspector` with empty banners; no tables exist yet.

The lesson ends when the starter runs locally and the inspector loads with empty banners. Scope cuts and technology rationale (no mutations, no real auth, no RBAC, why `$inferSelect`, why `organizationId` everywhere) belong to the Implementation lessons that introduce each decision, not here.

---

## Lesson 2 — Type-safe environment variables with @t3-oss/env-nextjs

The goal: a missing `DATABASE_URL` fails `pnpm build` before deploy, not the first request after it.
Finished result: the project reads its config through a typed `env.ts` boundary, and removing a required variable turns a runtime 500 into a build-time error that names the missing variable.

### Your mission

This is the first project where an env var carries a real secret — the Postgres connection string — so it is where the project installs env discipline from line one.
The failure mode every senior has seen at least once: the deploy succeeds, the app boots, and the first request crashes because a server-only variable is `undefined` and the downstream call throws inside a request handler; the user sees a 500 and the outage lasts as long as the redeploy.
The fix is to validate at build time, and the 2026 default for that is `@t3-oss/env-nextjs` — a thin wrapper around a Standard Schema validator (Zod 4 here) that runs at build, enforces the Next.js naming convention (`NEXT_PUBLIC_` for client-visible variables, no prefix for server-only), and produces typed exports the rest of the app imports instead of touching `process.env`.
The starter ships `env.ts` with a `server` block (`DATABASE_URL: z.url()`), an empty `client` block (populated when PostHog and others land in later units), and the `runtimeEnv` map that threads `process.env.X` to each schema so the validator knows which variables Next.js inlines and which stay dynamic; the student's job is to wire the project to it and prove the boundary fires, not to re-derive the file.
The constraints that shape the work: application code imports from the project's `env` module, never `process.env`, because that import is the seam where validation actually runs and it is what makes `env.DATABASE_URL` typed as `string` rather than `string | undefined`; the package refuses a `NEXT_PUBLIC_*` variable in the `server` block and vice versa, which makes the leaked-secret bug hard to write.
Out of scope: authoring Zod schemas in depth (chapter 042), connecting Drizzle to `DATABASE_URL` (lesson 3 of chapter 041), the Vercel deploy flow and secret rotation (Units 16 and 20), and Valibot as the alternative validator — the course commits to Zod.
The trap to steer clear of is `SKIP_ENV_VALIDATION`: it exists for a CI build that legitimately runs without the secrets present, set deliberately in the one script that needs it — never reached for to make an error go away.

- Removing `DATABASE_URL` from `.env.local` makes `pnpm build` fail with an error that names the missing variable; restoring it makes the build pass again.
- The app boots and reads `DATABASE_URL` through the typed `env` export, with no remaining `process.env.DATABASE_URL` access in application code.
- `.env.local` holds the real secret and is git-ignored; `.env.example` is committed and names every variable the app expects.

### Coding time

One line directing the student to wire the project against `env.ts` and the tests, then attempt the build-failure verification before reading on.

Hidden `<details>` solution walkthrough:

- The `env.ts` shape shown as it sits in the repo, with one or two sentences on why the `runtimeEnv` map exists and why imports go through `env` rather than `process.env`.
- The `.env.example` → `.env.local` split: what each file is for, that `.gitignore` excludes `.env*.local`, and the one-line Vercel connection (production vars set in the dashboard still validate at build, so a missing one fails the deploy before traffic shifts — Unit 20 owns the deploy chapter).
- The `SKIP_ENV_VALIDATION` escape hatch and the rule for when it is legitimate.
- A callout linking Architectural Principle #3 (pure `/lib`, side effects at named boundaries): `env.ts` is the first concrete named boundary, revisited in Unit 6 and under the Unit 16 security baseline.

### Moment of truth

- Run the lesson's test suite (name the command); expected pass output.
- By hand: `pnpm build` succeeds. Remove `DATABASE_URL` from `.env.local`, run `pnpm build` again, read the error naming the missing variable, then restore it and confirm the build passes. Tick each as you go.
- By hand: confirm application code reads `env.DATABASE_URL`, not `process.env`.

---

## Lesson 3 — Authoring the schema and shipping the init migration

The goal: the six tables, their relations, and the indexes the project's reads demand land in Postgres through one reviewed migration.
Finished result: `pnpm db:migrate` creates `organizations`, `users` (stub), `org_members`, `customers`, `invoices`, and `invoice_lines` on a fresh database, all FKs, uniques, checks, and indexes visible in Studio, and a second `db:generate` reports no changes.

### Your mission

This is where the schema becomes the source of truth for the whole project — every row type, every later query, and every downstream unit derives from `db/schema.ts`, so the row types come from `$inferSelect`, never hand-written.
You will author the six tables and their relations, then generate and run the init migration against the empty database the starter's Docker Postgres provides.
The starter wires the tooling you build on: `drizzle.config.ts` drives `generate`/`migrate`/`studio` and points Drizzle Kit at the unpooled URL, the schema path, and snake-case casing; `src/db/client.ts` exports the pooled `db` with the relations bag attached; the `db:*` scripts wrap Drizzle Kit through `dotenv-cli` because Drizzle Kit does not read `.env` by itself.
The decisions that shape the schema, each carried in from Unit 5: UUIDv7 primary keys via `$defaultFn(() => uuidv7())` for sortable, non-guessable IDs; `timestamptz` for every timestamp and `numeric(12, 2)` for money; `pgEnum` for `role` and `status` so the database enforces the domain; FK `ON DELETE` decided per edge rather than copied — cascade for owned children that lose meaning without their parent, restrict for referenced entities the schema can't make sense of without (a customer must not vanish under an invoice); every uniqueness scope and every index made tenant-aware, with composite index column order matching the list query's `where` plus `orderBy` direction.
The structural rule that outlives this project: every tenant-owned table carries `organizationId` as a NOT NULL FK; the sole exception is `users`, which is global across orgs and joined through the `org_members` membership table.
Out of scope: writing the reads (lessons 5 and 6) and seeding data (lesson 4); the inspector stays empty after this lesson.
Two traps to avoid — reaching for `drizzle-kit push` even on a fresh database (the generate-and-commit loop is the muscle; push is chapter 040's prototype-only escape hatch), and skipping the read of the emitted SQL before migrating.

- `pnpm db:migrate` runs cleanly on the empty database and Studio shows all six tables with their FKs, uniques, checks, and the three indexes.
- The emitted migration SQL, read before applying, shows every `CREATE TABLE`, each FK with its intended `ON DELETE`, each tenant-scoped unique, the `total >= 0` check, and the three named indexes (`invoices_org_status_created_id_idx`, `invoices_org_created_id_idx`, `invoices_customer_id_idx`).
- A second `pnpm db:generate` immediately after reports no changes — the snapshot is in sync.
- The relations resolve a two-role join from `invoices` (the `createdBy` user side is named distinctly), and the exported `$inferSelect` row types are what `queries.ts` and the inspector consume.

### Coding time

One line directing the student to author `db/schema.ts` and `db/relations.ts` against the reference signatures and the tests, generate `--name init_schema`, read the SQL, then migrate.

Hidden `<details>` solution walkthrough:

- `src/db/schema.ts` in repo order — `organizations`, `users` (stub), `orgMembers` (composite PK), `customers`, `invoices`, `invoiceLines` — built in the order FKs demand, with one or two sentences each on the UUIDv7/`timestamptz`/`numeric`/`pgEnum` choices, the per-edge `ON DELETE` rationale (named once at `customers → invoices`), the tenant-aware uniques, and the three indexes declared at the bottom with column order matching the list `orderBy`.
- `src/db/relations.ts` via `defineRelations` v2, calling out the named two-role join from `invoices` to `users`.
- The `$inferSelect` / `$inferInsert` exports as the canonical row types.
- A callout on the provided `drizzle.config.ts`: the unpooled URL drives Drizzle Kit while the pooled URL drives the app's runtime queries, and running migrations against the pooled URL silently truncates long DDL — the watch-out is reaching for the pooled URL in any new script written later.
- A callout that the composite index column order is verified against the live query plan in lesson 5 of chapter 041, and links to the chapter 040 generate-and-commit lesson rather than re-explaining it.

### Moment of truth

- Run the lesson's test suite (name the command); expected pass output.
- By hand: drop and re-create the database, run `pnpm db:migrate`, confirm no errors and exactly one row in `__drizzle_migrations`. Open `pnpm db:studio` and confirm the six tables, their FKs, and the three indexes. Run `pnpm db:generate` again and confirm it reports no changes. Tick each as you go.

---

## Lesson 4 — A deterministic, idempotent seed for two orgs

The goal: one command fills the database with two orgs, overlapping members, and 100+ invoices, identical on every run.
Finished result: `pnpm db:seed` makes the inspector banner read `organizations: 2`, `org_members: 5+` (one user in both orgs), and `invoices: ≥ 100`, and running it a second time leaves row counts and sampled primary keys unchanged.

### Your mission

The data layer needs realistic, repeatable data so the reads in the next two lessons — and every later unit — have something to page through, and so verification is one glance at the banner rather than a guess.
You will write `scripts/seed.ts` as `reset(db, schema)` followed by `seed(db, schema, { seed: Number(process.env.SEED ?? 1) }).refine(...)`, then wire the `db:seed` script.
The shape of the data and the tools that produce it carry in from chapter 040: `valuesFromArray` for curated org names, emails, and service descriptions; `weightedRandom` for a realistic status mix (paid most common, overdue rarest); the `with` clause to fan invoices out from customers and line items out from invoices; numeric and date generators for totals, issue dates, and due dates.
The defining constraint is determinism: the fixed seed number is the contract, so the same number must always produce the same data — bumping it deliberately shifts the shape, while editing the `.refine` config without bumping it silently breaks the contract.
The senior pattern this lesson teaches is mixing the bulk seeder with targeted direct inserts: the overlapping-membership shape (user 1 in both orgs) and computed columns like `position` renumbered per invoice or `dueAt` derived from `issuedAt` don't fit the seeder cleanly, so drop to `db.insert(...)` after the `seed(...)` call for those — mixing both in one script is the pattern, not a smell.
Two traps to avoid: `drizzle-seed`'s `with` count is per-parent, not total, so `count: 30` customers with 4–7 invoices each yields 120–210 invoices, not 4–7; and `reset` issues `TRUNCATE ... CASCADE`, which is fine against local Docker but would hold locks on a shared branch, so this stays local-only and reaches the unpooled URL for the long transaction, the same rule as migrations.

- Running `pnpm db:seed` makes the inspector banner show two orgs, 5+ memberships with at least one user belonging to both orgs, 30 customers spread across the orgs, and 100+ invoices.
- The seeded invoices show a realistic status distribution and totals, with each invoice's line items numbered by `position` and `dueAt` falling after `issuedAt`.
- Running `pnpm db:seed` a second time leaves the row counts and a sampled invoice's `id` unchanged from the first run.

### Coding time

One line directing the student to write `scripts/seed.ts` against the reference shape and the tests, wire `db:seed`, then run it twice and compare.

Hidden `<details>` solution walkthrough:

- `scripts/seed.ts` in repo order: the `reset` call, the `seed(...).refine(...)` block table by table (`organizations` count 2, `users` count 4, `customers` count 30 with `with: { invoices: 4-7 }`, status via `weightedRandom`, totals and dates via generators), and the follow-up direct-insert block for the overlapping memberships and the `position`/`dueAt` corrections — with a sentence on why each correction lives outside the seeder.
- The `db:seed` script wiring through `dotenv` and `tsx`, and that the script exits 0 on success.
- A callout on the per-parent-count trap and the arithmetic that lands invoices past 100.
- A callout that the fixed seed number is the determinism contract and what bumping it versus editing `.refine` does, linking the chapter 040 seed lesson rather than re-explaining it.
- A note that `reset`'s `TRUNCATE ... CASCADE` and the long transaction are why the seed is local-only and uses the unpooled URL.

### Moment of truth

- Run the lesson's test suite (name the command); expected pass output.
- By hand: run `pnpm db:seed`, read the inspector banner for two orgs, 5+ memberships (one user in both orgs), and 100+ invoices; open Studio to eyeball the status spread and line-item counts. Run `pnpm db:seed` again and confirm identical row counts and a sampled invoice `id` across both runs. Tick each as you go.

---

## Lesson 5 — The tenant-scoped invoice list with cursor pagination

The goal: the inspector lists one org's invoices, pages through them with a cursor, and filters by status server-side.
Finished result: the inspector's list panel renders an org's invoices with customer name, status, total, and due date; "Next page" carries a fresh `?cursor=...` with no repeated rows; `?status=paid` shows only paid rows and survives a reload; and the list query's plan uses the matching composite index, never a `Seq Scan`.

### Your mission

This is the read every later list in the course is built on, so it sets the pattern: a tenant-scoped, cursor-paginated, status-filterable query that the planner serves from an index.
You will write `listInvoices` in `src/lib/invoices/queries.ts` against the provided `listInvoicesInputSchema` (orgId required, status optional, cursor optional and decoded through the provided `db/cursor.ts` helpers, pageSize default 20 capped at 100) — the same input shape Unit 6 will reuse against a Server Action's `formData`, which is why the schema lives in `/lib` for callers to compose.
The query uses the relational API's `findMany` with a `where` that AND-combines the tenant guard, the optional status equality, and the cursor predicate, ordered by `(createdAt desc, id desc)`, with `with: { customer: true }` so the list cell's customer name comes back in the same round trip.
Two constraints define correctness here: cursor pagination needs the composite tiebreaker — ordering by `createdAt` alone skips or duplicates rows whenever two invoices share a timestamp, so the predicate must be `or(lt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), lt(id, c.id)))`; and the page boundary uses the `limit(pageSize + 1)` trick — fetch one extra row to learn whether a next page exists, set `nextCursor` from the last kept row, and avoid a separate `count()` round trip.
The structural rule that outlives this project: the `organizationId` filter goes in the `where`, never as a post-load check — the "load then filter" shape is the IDOR failure mode, and this is the manual discipline Unit 9's `tenantDb` will later enforce structurally.
Out of scope: the detail read (lesson 6), the provided plan panel's wiring (you read its output here but don't build it), and any mutation — this project is read-only, since Unit 6 owns the Server Actions and CRUD that write to this schema.
The trap to avoid is treating the tiebreaker or the `+ 1` as optional polish — both are load-bearing for correct paging.

- The inspector list panel renders an org's invoices, and switching orgs in the switcher changes which rows appear.
- Clicking "Next page" carries a fresh `?cursor=...` in the URL, and no row repeats across pages; the link is disabled on the last page.
- `?status=paid` shows only paid rows, the URL carries the status, and a hard reload (or opening the URL in a second tab) reproduces the filtered view.
- The list query's plan uses `invoices_org_created_id_idx` without a status filter and `invoices_org_status_created_id_idx` with one, never a `Seq Scan`.

### Coding time

One line directing the student to implement `listInvoices` against the brief and the tests, then exercise the inspector list before reading on.

Hidden `<details>` solution walkthrough:

- `listInvoices` as it sits in `queries.ts`: input validation against `listInvoicesInputSchema`, the `findMany` call with the AND-combined `where`, the `orderBy`, `limit(pageSize + 1)`, and `with: { customer: true }`, then the slice and `nextCursor` computation.
- A sentence each on why the tiebreaker is mandatory and why `with: { customer: true }` stays one round trip (the planner sees the join) versus a manual per-row customer fetch — linking the chapter 038 cursor lesson and the chapter 039 N+1 lesson rather than re-explaining.
- A callout that the `listInvoicesInputSchema` reuse in Unit 6 is Architectural Principle #3 at work.
- A callout on reading the list query's plan in the provided plan panel: `Index Scan using ...`, read bottom-up with the chapter 039 vocabulary, and that a `Seq Scan` here means the index column order from lesson 3 of chapter 041 is wrong.

### Moment of truth

- Run the lesson's test suite (name the command); expected pass output.
- By hand: click "Next page" three times against one org and confirm no row repeats across the three pages (open Studio if needed); switch orgs and confirm the rows differ. Click `paid`, confirm the URL shows `?status=paid`, only paid rows render, and a hard reload preserves the view. Switch the plan panel to the list query and confirm it uses `invoices_org_created_id_idx` (no status) and `invoices_org_status_created_id_idx` (with status), never a `Seq Scan` — if it falls back, the index order from lesson 3 of chapter 041 is wrong. Tick each as you go.

---

## Lesson 6 — The single-round-trip invoice detail read

The goal: clicking an invoice loads it with its line items and customer in one query, and only if it belongs to the current org.
Finished result: the inspector's detail panel renders an invoice header, its customer, and its line items ordered by position; the plan panel shows one query plan with an outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`; and a cross-org `invoiceId` returns the empty state instead of the row.

### Your mission

This read closes the data layer and proves the relational API turns "one invoice with its lines and customer" into a single round trip rather than the N+1 a hand-written loop would produce.
You will write `getInvoiceDetail` in `src/lib/invoices/queries.ts` using `findFirst` with `with: { lines: { orderBy: asc(position) }, customer: true }`, returning `null` when nothing matches.
The defining constraint is the tenant guard: the `where` must AND-include both `eq(invoices.id, invoiceId)` and `eq(invoices.organizationId, organizationId)`, so the security lives in the query rather than in a check after the load — the same structural rule the list read follows and the discipline Unit 9's `tenantDb` will enforce.
The performance constraint is the single round trip: the relational `with` lets the planner satisfy the customer and line-item joins in one plan, which is why the plan panel shows one outer `Index Scan` on `invoices` rather than three separate lookups; point at the chapter 039 N+1 material rather than re-deriving it.
Out of scope: the list read (lesson 5) and the plan panel's wiring; you read its output to confirm the single round trip.
The trap to avoid is the "load the invoice, then check its `organizationId`" shape — it reads as correct but leaks any invoice whose ID an attacker guesses, so the org filter belongs inside the `where`.

- Clicking an invoice loads the detail panel with the invoice header, its customer, and its line items ordered by `position`.
- An inspector URL pairing one org's `orgId` with another org's `invoiceId` renders the empty state, not the cross-org invoice.
- The plan panel on the detail load shows one query plan with a single outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`.

### Coding time

One line directing the student to implement `getInvoiceDetail` against the brief and the tests, then exercise the detail panel before reading on.

Hidden `<details>` solution walkthrough:

- `getInvoiceDetail` as it sits in `queries.ts`: input validation, the `findFirst` with the AND-combined tenant `where` and the `with` block ordering lines by `position`, and the `null` return.
- A sentence on why the tenant filter lives in the `where` (IDOR otherwise) and why the relational `with` is one round trip versus a manual `getCustomer` + `getLines` loop, linking the chapter 039 N+1 lesson.
- A callout on reading the detail plan in the provided panel — one outer `Index Scan` on `invoices` joined to the two tables — read bottom-up with the chapter 039 vocabulary.
- A short closing pointer to where this data layer is picked up next: Unit 6 adds Server Actions and `useOptimistic` on top of these reads, Unit 8 swaps the `users` stub for Better Auth's tables (additive migration, FK targets unchanged), Unit 9 wraps both reads in `tenantDb(orgId)` so the missing `organizationId` filter becomes impossible to write, and Unit 10 turns the inspector's URL state into the production list view.

### Moment of truth

- Run the lesson's test suite (name the command); expected pass output.
- By hand: click an invoice and confirm the detail renders its customer and line items ordered by position in one paint. Hand-construct an inspector URL with org A's `orgId` and an `invoiceId` read from org B in Studio, and confirm the detail panel shows the empty state, not the leaked invoice. Expand the plan panel on the detail load and confirm one plan with an outer `Index Scan` on `invoices` joined to `customers` and `invoice_lines`. Tick each as you go.
