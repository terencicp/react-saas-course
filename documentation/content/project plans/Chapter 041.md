# Chapter 041 — Project plan: the org-scoped invoicing data layer

Fifth project; **fresh Next.js scaffold** reusing the Chapter 035 toolchain (config, shadcn primitives, lesson-test runner) but a new surface: a provided `/inspector` Server Component over a real Postgres data layer. First DB project in the course — six tables, Relations, one init migration, a deterministic seed, and two tenant-scoped reads (cursor list + single-round-trip detail). The standards bar: schema is the single source of truth, every tenant read AND-includes `organizationId` in its `where`, the cursor list and detail load are served from the right indexes (proven by an `EXPLAIN ANALYZE` plan panel), and the seed is deterministic + idempotent — all checkable against a real render, not just a green build.

**Toolchain reality that overrides the chapter outline.** The course is pinned to `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` (Better Auth has no `drizzle-orm@^1.0` support yet — Toolchain constraints, Drizzle section). That pin forces three concrete divergences from the outline, which assumes the Drizzle 1.0 beta:
1. **Relations v1** — `relations(<table>, ({ many, one }) => ({...}))` per-table in `db/relations.ts`, NOT `defineRelations(schema, (r) => ({...}))`. The reads use the **callback** `where`/`orderBy` form (`where: (t, { eq, and, or, lt }) => ...`), NOT the v2 object `where` with the `RAW:` escape. The cursor compound predicate rides naturally in the v1 callback.
2. **Local Docker Postgres uses the `postgres` (postgres-js) driver via `drizzle-orm/postgres-js`** — the Neon serverless driver speaks HTTP/WebSocket only and cannot reach vanilla Docker Postgres. One `db` client, no pooled/unpooled HTTP-vs-WebSocket split.
3. **`drizzle-zod`** ships as a separate package (not the `drizzle-orm/zod` subpath) — though this project barely needs it (only `lib/invoices/schema.ts` Zod, hand-written for the read boundary, is in scope; CRUD-write validators are Unit 6).

## Project goals

The project cashes in Unit 5 by shipping the canonical relational surface every later unit builds on. The student practices five durable skills at once: translating a tenant-aware SaaS data model into a **Drizzle schema where the schema is the single source of truth** (every row type flows from `$inferSelect`, never hand-written); **deciding FK `ON DELETE` per edge** (cascade for owned children, restrict for referenced entities) and scoping every uniqueness constraint and index to the tenant; authoring a **deterministic, idempotent seed** that mixes the bulk seeder with targeted direct inserts; writing **tenant-scoped reads** — cursor pagination with a server-side status filter, and a relational nested load — with the `organizationId` guard baked into every `where`; and **reading an `EXPLAIN ANALYZE` plan** to confirm a query is fast for the reason you think it is. The coding is sliced so each step adds one inspector-confirmable capability the student can run against a live database: schema+migration → seed → list → detail. The data layer is the lesson; the inspector page is provided in full so the student fills only the schema, relations, seed, and the two query functions.

## Student position

The student has finished Unit 4 (the Ch 035 list-plus-detail project) and Unit 5 teaching chapters **036–040**, and **nothing past it**. Coders must not use any concept from Unit 6 onward.

**Knows (use freely):**
- **Postgres + local dev (Ch 036):** the relational model, 3NF, PK/FK, money as `numeric`, the `DATABASE_URL` single-connection-string contract, Docker Postgres (image/container/volume/port). Postgres major version standardized on **18** (Docker tag `postgres:18`).
- **Schema authoring (Ch 037):** `pgTable`, `casing: 'snake_case'` on the client; the 2026 Postgres type subset (`uuid`, `numeric({ precision, scale })` for money, `timestamp({ withTimezone: true })` = `timestamptz`, `text`, `integer`, `jsonb().$type<T>()`, `pgEnum`); `.notNull()` / `.default()` / `.defaultNow()` / `.$defaultFn()` / `.$onUpdate()`; the reusable-columns file `db/columns.ts` (`...timestamps` spread); UUIDv7 PKs; FK `.references(() => other.id, { onDelete })` with the four rules; `.unique()` / composite `unique().on()` / `check()`; junction tables (composite PK via `primaryKey({ columns })`); **Relations v1** `relations(<table>, ({ one, many }) => ({...}))` (one/many, `alias` for two relations between the same pair); `$inferSelect` / `$inferInsert` with the read/write asymmetry.
- **Querying (Ch 038):** `db.select`/`insert`/`update`/`delete` + `where`/`orderBy`/`limit`, operator helpers (`eq`/`and`/`or`/`lt`/`desc`), automatic parameterization; `innerJoin`/`leftJoin`; the **relational query API** `db.query.<table>.findMany`/`findFirst` with the **callback** `where`/`orderBy` and `with: { relation: true }` (N+1-safe); cursor pagination — the compound predicate `or(lt(createdAt, c.createdAt), and(eq(createdAt, c.createdAt), lt(id, c.id)))`, the `(createdAt, id)` tiebreaker, the `limit(pageSize + 1)` has-next-page trick, opaque base64url cursor token decode-then-validate; the missing-`where` failure mode.
- **Indexes + plans (Ch 039):** FK columns are NOT auto-indexed (the trap); composite index column order = equality first, sort/range key second, tiebreaker last, tenant column always leads; `index('name').on(t.a, t.b.desc())`; `EXPLAIN (ANALYZE, BUFFERS)` read bottom-up, `Seq Scan` vs `Index Scan`, the four numbers; transactions `db.transaction(async (tx) => ...)` (not needed here — reads only).
- **Migrations + seeding (Ch 040):** `drizzle.config.ts`, the `generate` → review SQL → `migrate` loop, `--name <verb>_<noun>`, the flat `drizzle/meta/` layout, immutability of applied migrations; `drizzle-seed` `seed(db, schema, { seed, version }).refine((f) => ({...}))` with `f.valuesFromArray` (weighted via `{ weight, values }` entries), per-parent `with` (multiplies — the count trap), `f.number({ precision })` for money cents, `f.uuid()` emits v4 (never on a v7 PK column), the `reset(db, schema)` + `seed` idempotent script. **NOTE for THIS project:** `drizzle-seed`'s `.refine()` column generators do NOT compose with this schema's unique/check constraints on `0.3.x` — S3 uses `reset()` + direct inserts (the deterministic+idempotent half of the skill); see Slice S3.
- **Carried from Units 1–4 (use freely):** TypeScript strict (generics, narrowing, discriminated unions, `import type` under `verbatimModuleSyntax`), Zod 4 (`z.enum`, `.optional()`, `safeParse`, `z.infer`, top-level builders `z.uuid()`), arrow-`const` components, App Router (Server Components are the default, async bodies with direct data reads, `await searchParams`/`await params` as the dynamic signal, `<Link>`, `PageProps<'/route'>` typing), `cacheComponents: true` dynamic-by-default, `cn()` from `@/lib/utils`, Tailwind v4 semantic tokens + `dark:`, shadcn copy-into-repo primitives.

**Does NOT know (do not use):**
- **Server Actions / forms-as-contract** — `'use server'`, `useActionState`, `<form action={fn}>`, `FormData` parsing, `useFormStatus`, `useOptimistic` (Unit 6). The "Reset and re-seed" control is the **one** exception the inspector needs; it is **provided fully by the scaffold** as a minimal Server Action wrapper around the seed (see Scaffolding recipe) — the student does NOT author it, and no other mutation/CRUD exists. The project is read-only otherwise.
- **`drizzle-zod` write validators, `createInsertSchema`/`createUpdateSchema`** (Unit 6) — `lib/invoices/schema.ts` is a small hand-written Zod schema for the read boundary only.
- **Real auth / `getCurrentUser` / `requireUser` / `tenantDb` / RBAC / org switching as a session** (Units 8–10) — there is no session, no auth gate. The "current org" is read from `?orgId=` in the URL. The `organizationId` filter is carried **by hand** in every `where` (this is the manual discipline Unit 9's `tenantDb` later wraps). `users` is a **stub** table (Unit 8 swaps in Better Auth's tables).
- **`'use cache'` / `cacheLife` / `cacheTag` / `tags.ts` / invalidation** (the inspector is fully dynamic — DB-backed data read per request). Do not add caching directives.
- **`nuqs`, TanStack Query, Zustand** (later units) — URL state is read server-side with `await searchParams` + Zod; navigation is plain `<Link href>`. Do not install `nuqs`.
- **`next-intl` / i18n** (Unit 17) — hardcode visible English strings.
- **`Result<T>` / branded IDs** — IDs are plain `string` (UUIDs). `getInvoiceDetail` returns `InvoiceDetail | null`; `listInvoices` returns `{ rows, nextCursor }`. No `Result` type (no Server Actions returning one in scope).
- **Transactions** — both reads are single statements; no `db.transaction` is needed.
- **Testing as a student skill** (Unit 18) — the lesson test runner is provided; `project-lesson-test-coder` writes the `Lesson <n>.test.ts` bodies later. Tests are node-env (no DOM): they observe the data layer / schema shape and SSR render output, never interaction or a live DB.

## Scaffolding recipe

Build **`solution/` only** in this stage: a fresh Next.js 16 scaffold that compiles, builds green (with `DATABASE_URL` present), and serves `/inspector` end-to-end with the four student-owned files as `TODO` stubs (schema, relations, queries, seed). Reuse the Chapter 035 toolchain verbatim where noted; author the inspector and all plumbing fully; leave only the four student files stubbed. (The `start/` directory and slice work are separate later stages — do not derive `start/` here.)

### Carry over verbatim from the Chapter 035 `solution/` (`projects/Chapter 035/solution/`)

Read that repo for the exact bytes. Carry, unchanged except where noted:
- All config: `next.config.ts` (keep `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true`, `turbopack: { root: __dirname }`), `tsconfig.json` (the exact locked shape — `jsx: "react-jsx"`, no `baseUrl`, `incremental`/`skipLibCheck` true, `allowJs: false`, `include` carrying both `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`, `paths: { "@/*": ["./src/*"] }`), `biome.json`, `components.json`, `postcss.config.mjs`, `.mise.toml`, `.npmrc`, `pnpm-workspace.yaml` (**extend the ledger beyond the Ch 035 fork** — see Locked decisions; this chapter's `tsx`/`drizzle-kit` pull `esbuild`, which must be acknowledged or `pnpm install`/`next build` fail `ERR_PNPM_IGNORED_BUILDS`), `.editorconfig`, `.gitignore`, `.vscode/`, `next-env.d.ts` (Next-emitted, do not hand-edit).
- `src/app/globals.css` (tokens, light + `.dark`), `src/app/_components/providers.tsx` (`'use client'` ThemeProvider), `src/lib/utils.ts` (`cn()`).
- shadcn primitives needed here: `src/components/ui/{button,badge,card,separator,skeleton}.tsx` (carry from Ch 035). `sheet`/`dialog` are NOT needed; omit them.
- The lesson test runner: `scripts/test-lesson.mjs` (reads `process.argv[2]`, resolves the exact path `tests/lessons/Lesson ${n}.test.ts`, spawns `pnpm exec vitest run <path>`) and `vitest.config.ts` (`environment: 'node'`, `globals: false`, `include: ['tests/lessons/**/*.test.ts']`, `resolve: { tsconfigPaths: true }`). Keep byte-for-byte; it works in `start/` with no extra config. Confirm `pnpm test:lesson 2` runs only `Lesson 2.test.ts` before locking.

### `package.json` changes

- `"name": "chapter-041-invoicing-data-layer"`.
- **`"verify": "biome ci . && tsc --noEmit && next build"`** (exact, mandated). NOTE: no `next typegen` step is needed here because no page uses the `typedRoutes` `Route` union in a way `tsc` must pre-resolve from `.next/types` cold — the inspector uses `PageProps` (also generated). **Add `next typegen` before `tsc`** anyway (`"biome ci . && next typegen && tsc --noEmit && next build"`) since the inspector page IS typed with `PageProps<'/inspector'>`, which lives in `.next/types`; a cold `tsc --noEmit` fails `Cannot find name 'PageProps'` without it. (Same proven Ch 035 ordering.) `verify` requires `DATABASE_URL` to be set in the environment (or a `.env` present) — `env.ts` validates it at build; see Locked decisions.
- Keep `dev`/`build`/`start`/`format`/`lint`/`check`/`test:lesson`/`preinstall` scripts from Ch 035.
- **Add DB scripts** (bare `drizzle-kit` / `tsx`; env loaded via `dotenv-cli`, since Drizzle Kit and the seed script do not read `.env` themselves):
  - `"db:generate": "drizzle-kit generate"`
  - `"db:migrate": "dotenv -e .env -- drizzle-kit migrate"`
  - `"db:studio": "dotenv -e .env -- drizzle-kit studio"`
  - `"db:seed": "dotenv -e .env -- tsx scripts/seed.ts"`
- **Add dependencies** (pin these exact specifiers):
  - `dependencies`: `drizzle-orm@^0.45.1`, `postgres@^3.4.7` (postgres-js driver), `@t3-oss/env-nextjs@^0.13.11`, `uuidv7@^1.0.2`. Keep `zod@^4.4.3` (already a Ch 035 dep). Keep `react`/`react-dom`/`next`/`next-themes`/`radix-ui`/`class-variance-authority`/`clsx`/`tailwind-merge`/`lucide-react`/`tw-animate-css` from the fork.
  - `devDependencies`: `drizzle-kit@^0.31.5`, `drizzle-seed@^0.3.1`, `dotenv-cli@^10.0.0`, `tsx@^4.20.0` (NOT `^4.20.7` — that floor does not exist on npm; the highest 4.20.x is 4.20.6, so a `^4.20.7` range silently floats to a higher minor). Keep `vitest@^4.1.8`, `@biomejs/biome@2.4.16`, `tailwindcss`/`@tailwindcss/postcss`, `typescript@^6.0.3`, `babel-plugin-react-compiler@1.0.0`, `@types/node`/`@types/react`/`@types/react-dom`.

### Author fully (provided plumbing — not student work)

- **`docker-compose.yml`** (repo root): a single `postgres:18` service named `db`, `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=app`, port `5432:5432`, volume `pgdata:/var/lib/postgresql` (the **parent** path — Postgres 18's data lives under `/var/lib/postgresql/18/docker`; mounting `/var/lib/postgresql/data` silently fails to persist — Toolchain constraint).
- **`.env.example`** (committed): `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app`, `DATABASE_URL_UNPOOLED=postgres://postgres:postgres@localhost:5432/app` (same URL locally; the split exists so Unit 20 plugs Neon in without renaming), `SEED=1`. `.gitignore` already excludes `.env*` — confirm `.env` (not `.env.local`) is the file the scripts load; the seed/migrate scripts use `dotenv -e .env`.
- **`drizzle.config.ts`** (repo root): `defineConfig({ dialect: 'postgresql', schema: './src/db/schema.ts', out: './drizzle', dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! }, casing: 'snake_case', verbose: true, strict: true })`. (Drizzle Kit reads the unpooled URL — locally identical; the rule carries forward.)
- **`src/env.ts`**: `createEnv` from `@t3-oss/env-nextjs` with `server: { DATABASE_URL: z.url(), DATABASE_URL_UNPOOLED: z.url(), SEED: z.coerce.number().default(1) }`, an empty `client: {}`, and `runtimeEnv: { DATABASE_URL: process.env.DATABASE_URL, DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED, SEED: process.env.SEED }`. Starts with `import 'server-only'` is NOT used here (t3-env's nextjs preset is import-safe on the client); export `env`. One comment: "application code imports `env`, never `process.env`."
- **`src/db/index.ts`**: the `db` client. Relations v1 wiring — the `*Relations` consts are part of the **`schema` object**, NOT a separate option (the separate `relations` option is the Drizzle 1.0 `defineRelations` shape and does not exist on 0.45). Shape: `import { drizzle } from 'drizzle-orm/postgres-js'; import postgres from 'postgres'; import { env } from '@/env'; import * as tables from './schema'; import * as relations from './relations';` then `const client = postgres(env.DATABASE_URL);` and `export const db = drizzle(client, { schema: { ...tables, ...relations }, casing: 'snake_case' });` so `db.query.<table>` resolves with the relation graph. Also `export const dbUnpooled = db;` aliased to the same client (the unpooled split is a no-op locally; the alias exists so the seed/migrate code reads `dbUnpooled` per convention). One comment notes the alias.
- **`src/db/columns.ts`**: the reusable `timestamps` object — `createdAt: timestamp({ withTimezone: true }).defaultNow().notNull()` (the canonical Ch 037 L4 shape). Export `timestamps`. (No `updatedAt`/`softDelete` needed in this project's tables; ship only `createdAt` as `...timestamps` or inline — keep minimal.)
- **`src/db/cursor.ts`**: the opaque cursor helpers. `export type Cursor = { createdAt: string; id: string };` a Zod `cursorSchema = z.object({ createdAt: z.string(), id: z.uuid() })`; `encodeCursor(c: Cursor): string` (`Buffer.from(JSON.stringify(c)).toString('base64url')`); `decodeCursor(token: string): Cursor | null` (base64url-decode → `JSON.parse` in a try/catch → `cursorSchema.safeParse` → return data or `null`). No throw on a bad cursor.
- **`src/lib/invoices/schema.ts`**: `statusSchema = z.enum(['draft', 'sent', 'paid', 'overdue'])`; `type InvoiceStatus = z.infer<typeof statusSchema>`; `listInvoicesInputSchema = z.object({ organizationId: z.uuid(), status: statusSchema.optional(), cursor: cursorSchema.optional(), pageSize: z.number().int().min(1).max(100).default(20) })`; `type ListInvoicesInput = z.infer<typeof listInvoicesInputSchema>`. (Imports `cursorSchema` from `@/db/cursor`.)
- **`src/lib/invoices/explain.ts`**: `getDetailPlan({ organizationId, invoiceId }): Promise<string>` — runs `db.execute(sql\`explain (analyze, buffers, format text) ...\`)` for the detail query and returns the plan text joined into one string; and `getListPlan({ organizationId, status }): Promise<string>` for the list query. **Provided fully** so the student never writes the EXPLAIN wiring (the plan panel just renders these). The SQL inside mirrors the shape the student's queries produce (org-scoped, with the join). One comment: "provided plan probes — the student's job is to read the output, not write EXPLAIN."
- **The inspector page, its `loading.tsx` Suspense seam, and its sub-components** — author fully (see Inspector spec below). The page imports the student's `listInvoices` / `getInvoiceDetail` (stubbed now), the provided counts query, and the provided plan probes. `src/app/inspector/loading.tsx` is required for the Cache Components build to pass (see Inspector spec).
- **`src/lib/invoices/counts.ts`**: `getRowCounts(): Promise<{ organizations: number; users: number; orgMembers: number; customers: number; invoices: number; invoiceLines: number }>` — six `select({ n: count() })` reads (provided; powers the verification banner).
- **The "Reset and re-seed" Server Action** at `src/app/inspector/actions.ts` (`'use server'`): a single exported async function `reseed()` that imports and runs the student's seed routine (the seed script exposes a `runSeed()` export the action calls; `scripts/seed.ts` both runs as a CLI and exports `runSeed`), then `revalidatePath('/inspector')`. Provided fully — the student does not write `'use server'` (Unit 6). One comment marks it as the one provided mutation.

### Stub the four student-owned files (compile-clean `TODO`)

Each stub compiles, satisfies its import contract, and carries `// TODO(L<n>) — <task>` as the first body line. In `solution/` the slice-coders fill them.
- `src/db/schema.ts` (L3) — every consumer (`db/index.ts`, `relations.ts`, `queries.ts`, `counts.ts`, `explain.ts`, the inspector) imports table bindings and `$inferSelect`/`$inferInsert` types from here, so the stub must export all six **named** table consts and their 12 `type` aliases with the canonical names, carrying the columns consumers read (see the Start derivation stub note for the exact column floor) — but no constraints/indexes (those are S2's work). The TODO marker is the first line. The S2 slice-coder overwrites the whole file.
- `src/db/relations.ts` (L3) — `import { relations } from 'drizzle-orm'` + table imports; export the six `*Relations` consts as compiling stubs (`relations(table, () => ({}))` each) with the TODO marker. (Empty maps compile; `with:` keys resolve only once S2 fills them, but the shell builds because the inspector's query calls live in the stubbed `queries.ts`.)
- `src/lib/invoices/queries.ts` (L5+L6) — export `listInvoices(input): Promise<{ rows: Invoice[]; nextCursor: string | null }>` returning `{ rows: [], nextCursor: null }` (TODO L5) and `getInvoiceDetail({ organizationId, invoiceId }): Promise<InvoiceDetail | null>` returning `null` (TODO L6); export a compiling placeholder `InvoiceDetail` type the inspector imports.
- `scripts/seed.ts` (L4) — export `runSeed(): Promise<void>` (stub body, TODO L4) and a CLI entry. **The CLI guard MUST normalize the path**, not naively compare `import.meta.url` to a hand-built `file://` string: `import { pathToFileURL } from 'node:url'; const entry = process.argv[1]; if (entry && import.meta.url === pathToFileURL(entry).href) { runSeed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); }); }`. The naive `import.meta.url === \`file://${process.argv[1]}\`` is **false** whenever the path contains a space (e.g. `projects/Chapter 041/solution/`) — `import.meta.url` percent-encodes the space (`Chapter%20041`) while `process.argv[1]` keeps it literal — so the guard never fires and `pnpm db:seed` exits 0 having seeded NOTHING (silent no-op). Confirmed against the real spaced project path.

The scaffolder builds: the forked toolchain/config, `globals.css`, providers, root layout + root `redirect('/inspector')` page, `docker-compose.yml`, `.env.example`, `drizzle.config.ts`, `env.ts`, `db/index.ts`, `db/columns.ts`, `db/cursor.ts`, `lib/invoices/{schema,explain,counts}.ts`, the inspector page + its `loading.tsx` seam + sub-components, the reseed action, the four student stubs, the shadcn primitives, and the test runner with placeholder lesson tests. It does NOT fill the four student files beyond the compiling stub.

### Inspector spec (author fully)

A single Server Component at `src/app/inspector/page.tsx`, typed `PageProps<'/inspector'>`, with a **segment-level `src/app/inspector/loading.tsx`** alongside it (a tiny default-export component, e.g. `<main data-testid="inspector-loading">Loading…</main>`). The `loading.tsx` is **mandatory, not cosmetic**: the inspector reads uncached, request-time DB data (`getRowCounts`/`listOrgs`/`listInvoices`/`getInvoiceDetail`/the plan probes) at the top of the page body, and under `cacheComponents: true` Next prerenders `/inspector` at `next build` and FAILS with "Uncached data was accessed outside of `<Suspense>`" unless a Suspense seam exists. The segment `loading.tsx` is that seam (Toolchain constraint — Cache Components); with it the route builds as Partial Prerender (static shell + dynamic streamed content). Do NOT instead scatter hand-written `<Suspense>` or move reads behind `'use cache'` (caching is out of scope). The page reads `?orgId`, `?status`, `?cursor`, `?invoiceId` from `await searchParams` (validate `status` with `statusSchema.optional()` via `safeParse`; decode `cursor` via `decodeCursor`; default `orgId` to the first seeded org's id — read the first org id from the counts/orgs helper when `?orgId` is absent so the page is useful on first load). Layout: a single root `<main data-testid="inspector">` containing, in order:
- **Verification banner** (`data-testid="counts-banner"`): renders the six row counts from `getRowCounts()` as labeled figures (`organizations`, `users`, `org_members`, `customers`, `invoices`, `invoice_lines`). Each count in its own `data-testid` (`count-organizations`, `count-invoices`, etc.) for checks.
- **Header** (`data-testid="inspector-header"`): an **org switcher** — the two seeded orgs as `<Link href={\`/inspector?orgId=...\`}>` (provided a small `listOrgs()` helper returning `{ id, name }[]`, added to `counts.ts` or a tiny `orgs.ts`); a **status filter** — `<Link>`s for `all`/`draft`/`sent`/`paid`/`overdue` carrying `?status=` (and preserving `orgId`); and the **"Reset and re-seed"** `<form action={reseed}>` with a submit `<Button>`. The active org/status `<Link>` carries `aria-current="page"`.
- **A two-column region** `data-testid="inspector-grid"` (`grid md:grid-cols-[1fr_1fr]`) with **exactly two direct children**:
  - **List panel (left, `data-testid="list-panel"`)**: calls `listInvoices({ organizationId, status, cursor })`, renders the rows (`data-testid="invoices-list"`, each row a `<Link href={\`/inspector?orgId=...&invoiceId=...\`}>` showing number, customer name, status `<Badge>`, total formatted USD, due date). Footer: a "Next page" `<Link>` carrying `?cursor=<nextCursor>` (preserving orgId+status), rendered disabled/absent when `nextCursor` is `null`. Empty state when no rows.
  - **Detail panel (right, `data-testid="detail-panel"`)**: when `?invoiceId` is present, calls `getInvoiceDetail({ organizationId, invoiceId })` and renders the invoice header + customer + line items ordered by position (`data-testid="invoice-detail"`); when the result is `null` or `?invoiceId` is absent, renders an empty state (`data-testid="detail-empty"`, "Pick an invoice to see its details").
- **Plan panel (bottom, `data-testid="plan-panel"`)**: a `<details>` that, when relevant, renders the plan text from `getDetailPlan(...)` (when an invoice is selected) or `getListPlan(...)` (otherwise) inside a `<pre data-testid="plan-text">`. Provided wiring — the panel reads the provided probes.

The inspector composes the student's two query functions; everything else is provided. Keep it a Server Component (no `'use client'` except the reseed `<form>` needs none — a Server Action `<form action>` works in a Server Component). Money formatted with `Intl.NumberFormat` USD; `total` is a `numeric` → `string`, so `Number(total)` only at the display edge.

### Lesson test runner (placeholders)

Ship `tests/lessons/Lesson 2.test.ts` … `Lesson 6.test.ts`, each `import { describe } from 'vitest'; describe.todo('Lesson N')`, so the runner is green on a fresh scaffold. Tests are node-env, no DOM, no live DB: they observe schema/relations shape, query-function source/return shape, and seed-script shape — never interaction or a real connection. `project-lesson-test-coder` fills the bodies later (L2–L6).

## Slices

Each slice fills one or more student-owned files in `solution/` against the contracts below. All code: `casing: 'snake_case'` on the client (write camelCase TS property names in `.on()`/`where`/`orderBy`, never snake_case); bare column builders (object option form, e.g. `numeric({ precision: 12, scale: 2 })`); `import type` for type-only imports; no `any`. Keep each slice minimal — no abstraction the brief doesn't ask for, no transactions, no caching, no Server Actions beyond the provided reseed.

### Slice S1

**Lesson 2 — Type-safe environment variables.** Wire the project against the provided `src/env.ts` and prove the build-time boundary fires. This slice owns NO new file body — `env.ts`, `db/index.ts`, and the scripts already import `env` (scaffolder-authored). The slice's job is to confirm the wiring is correct and complete: verify every config read goes through `env` (no `process.env.DATABASE_URL` in application code — only `runtimeEnv` in `env.ts` and the `process.env` reads inside `drizzle.config.ts`/scripts that run outside the app bundle are allowed), and that removing `DATABASE_URL` fails `next build` with a message naming the variable.

If the scaffold already routes everything through `env`, S1 is a verification-only checkpoint (the slice-coder confirms the greps and the build-failure behavior; makes no code change unless a stray `process.env` access exists in `src/` app code, which it then routes through `env`).

Excludes: schema, queries, seed.

Contracts: reads `@/env`. No `data-testid` surface (no new render).

**Screenshot** — none (no new visible surface; the env boundary is build-time, verified by static checks).

### Slice S2

**Lesson 3 — Authoring the schema and shipping the init migration.** Fill `src/db/schema.ts` and `src/db/relations.ts`, then the slice generates + applies the init migration (the slice-coder runs `pnpm db:generate --name init_schema`, reads the SQL, runs `pnpm db:migrate` against the local Docker Postgres, and commits the `drizzle/` output).

`schema.ts` — the six tables in FK-demanded order, all bare builders under the `casing` policy, every PK `uuid().primaryKey().default(sql\`uuidv7()\`)` (SQL-side native gen on Postgres 18 — the Ch 037 L5 canonical form; `sql` imported from `drizzle-orm`):
- `organizations`: `id`, `name text notNull`, `slug text notNull` + `unique('organizations_slug_unique')`, `...timestamps`.
- `users` (Better Auth stub): `id`, `email text notNull` + `unique('users_email_unique')`, `name text notNull`, `...timestamps`. (Table name and these columns match what Unit 8 will read so the later swap is additive.)
- `orgMembers` (junction, composite PK): `organizationId uuid notNull references(() => organizations.id, { onDelete: 'cascade' })`, `userId uuid notNull references(() => users.id, { onDelete: 'cascade' })`, `role` via `pgEnum('member_role', ['owner', 'admin', 'member'])` notNull, `...timestamps`, table-level `primaryKey({ columns: [t.organizationId, t.userId] })`.
- `customers`: `id`, `organizationId uuid notNull references(() => organizations.id, { onDelete: 'cascade' })`, `name text notNull`, `email text notNull`, `...timestamps`, `unique('customers_org_email_unique').on(t.organizationId, t.email)`.
- `invoices`: `id`, `organizationId uuid notNull references(() => organizations.id, { onDelete: 'cascade' })`, `customerId uuid notNull references(() => customers.id, { onDelete: 'restrict' })`, `createdBy uuid notNull references(() => users.id, { onDelete: 'restrict' })`, `number text notNull`, `status` via `pgEnum('invoice_status', ['draft', 'sent', 'paid', 'overdue'])` notNull default `'draft'`, `total numeric({ precision: 12, scale: 2 }) notNull`, `currency text notNull default 'USD'`, `issuedAt timestamp({ withTimezone: true }) notNull`, `dueAt timestamp({ withTimezone: true }) notNull`, `...timestamps` (the `createdAt`), table-level: `unique('invoices_org_number_unique').on(t.organizationId, t.number)`, `check('invoices_total_nonneg', sql\`${t.total} >= 0\`)`, and the three indexes — `index('idx_invoices_org_status_created_at_id').on(t.organizationId, t.status, t.createdAt.desc(), t.id.desc())`, `index('idx_invoices_org_created_at_id').on(t.organizationId, t.createdAt.desc(), t.id.desc())`, `index('idx_invoices_customer_id').on(t.customerId)`.
- `invoiceLines`: `id`, `invoiceId uuid notNull references(() => invoices.id, { onDelete: 'cascade' })`, `description text notNull`, `quantity numeric({ precision: 12, scale: 2 }) notNull`, `unitPrice numeric({ precision: 12, scale: 2 }) notNull`, `position integer notNull`, `...timestamps`, `unique('invoice_lines_invoice_position_unique').on(t.invoiceId, t.position)`.
- Co-locate `$inferSelect`/`$inferInsert` type exports under each table: `Organization`/`NewOrganization`, `User`/`NewUser`, `OrgMember`/`NewOrgMember`, `Customer`/`NewCustomer`, `Invoice`/`NewInvoice`, `InvoiceLine`/`NewInvoiceLine`.

`relations.ts` — **Relations v1**, one `relations(<table>, ({ one, many }) => ({...}))` const per table:
- `organizationsRelations`: `many(orgMembers)`, `many(customers)`, `many(invoices)`.
- `usersRelations`: `many(orgMembers)`, `many(invoices)` (the `createdBy` side — aliased on the invoice side, see below).
- `orgMembersRelations`: `one(organizations)`, `one(users)`.
- `customersRelations`: `one(organizations)`, `many(invoices)`.
- `invoicesRelations`: `one(organizations)`, `one(customers)`, `one(users, { relationName: 'createdByUser', fields: [invoices.createdBy], references: [users.id] })` (named so the two-role `users` join is unambiguous — `invoices` points at `users` once via `createdBy`), `many(invoiceLines)`.
- `invoiceLinesRelations`: `one(invoices)`.
(Relations v1 needs `fields`/`references` on the `one` side of each FK edge; supply them explicitly. Use `relationName` only where a table has two relations to the same target — here just the `users` edge if needed for disambiguation; keep the others bare with `fields`/`references`.)

Excludes: the reads (S4/S5), the seed (S3). The inspector stays empty (counts read 0) after this slice until the seed runs.

Contracts created: `db/schema.ts` (six table consts + 12 type exports), `db/relations.ts` (six relation consts), and the committed `drizzle/` migration + `meta/`. The whole codebase's types resolve from `schema.ts`.

**Screenshot** — none (no data yet; the inspector renders the empty shell — the seeded surface is captured at S5).

### Slice S3

**Lesson 4 — A deterministic, idempotent seed.** Fill `scripts/seed.ts` and run it.

`scripts/seed.ts` exports `runSeed()` and runs as a CLI. Imports `dbUnpooled` from `@/db/index`, `* as schema from '@/db/schema'`, `reset` from `drizzle-seed`, and `env` from `@/env`.

**Why this seed is direct-insert, not `drizzle-seed`'s `.refine()` column generators.** Every table in this schema carries a constraint that `drizzle-seed@0.3.1`'s generators cannot satisfy — proven empirically against the pinned stack, all four are hard failures, not preferences:
1. **Unique constraints throw `"Values length equals zero."`** Every table here has one (`organizations.slug`, `users.email`, `customers (organizationId, email)`, `invoices (organizationId, number)`, `invoice_lines (invoiceId, position)`). `valuesFromArray({ isUnique: true })` and the default unique-aware generators both throw at `.refine()` init on this version ([drizzle-orm#4354](https://github.com/drizzle-team/drizzle-orm/issues/4354)) — so `drizzle-seed` cannot populate ANY of these tables via the refine path.
2. **The `total >= 0` check + `numeric(12,2)` precision** — `drizzle-seed`'s default numeric generator emits large NEGATIVE values out of `(12,2)` precision, violating the check on the first invoice insert.
3. **`uuid` PKs always come out v4 (non-RFC).** `drizzle-seed`'s `uuid` branch fires before its `hasDefault` branch, so it fills every `uuid` PK with a v4 value EVEN WHEN `id` is omitted from the refine — overriding the schema's `default(sql\`uuidv7()\`)`. Worse, those v4 values are not RFC-valid (wrong variant nibble), so Zod 4's strict `z.uuid()` in `cursorSchema`/`listInvoicesInputSchema` REJECTS them — the cursor fails to decode and pagination silently breaks (every "next page" returns page 1). (The earlier "omit `id`, the schema default fills it" claim is false for this version.)
4. **`with`-fanned invoices don't inherit the parent customer's `organizationId`** (and `(invoiceId, position)` can't be satisfied by independent `position` draws) — so the tenant scope and the line-position unique both break.

So: keep `drizzle-seed` for the **`reset(dbUnpooled, schema)` wipe** (idempotency, FK-ordered truncate — the taught reset half), and **direct-insert all rows** with a small seeded PRNG for determinism. Shape:
- `await reset(dbUnpooled, schema)`.
- A deterministic PRNG seeded by `env.SEED` (e.g. an LCG `state = (state*1103515245 + 12345) & 0x7fffffff`) so re-runs are byte-identical.
- Direct-insert **2 organizations** with fixed slugs (`acme`, `globex`), **4 users** with fixed emails, **5 `org_members`** (user 1 in BOTH orgs → overlapping membership, total ≥ 5).
- Direct-insert **40 customers** split across the two orgs, then per customer fan **12–18 invoices** (`org_members`-style loop; 40 × 12–18 ≈ 480–720 invoices total), each invoice's `organizationId` taken FROM the customer (tenant-aligned), `customerId` = that customer, `createdBy` = an in-org user, `number` a unique `INV-<n>`, `status` from a **weighted** pick (~50% paid / 25% sent / 15% draft / 10% overdue, driven by the PRNG), `total` a positive `.toFixed(2)` string, `issuedAt` from the PRNG and `dueAt = issuedAt + 30 days`. **Leave `id` unset** so the schema's `default(sql\`uuidv7()\`)` fills it — direct inserts (unlike `drizzle-seed`) honor the DB default, so PKs are real v7 and the cursor's `z.uuid()` accepts them.
- Per invoice, direct-insert **2–4 `invoice_lines`** with sequential `position` 1..n (satisfying the `(invoiceId, position)` unique) and positive `quantity`/`unitPrice`.

The teaching value carried by this slice: `reset`-then-insert idempotency, a fixed-seed deterministic generator, tenant-aligned FK fan-out, sequential per-parent positions, a weighted status distribution, and leaving PK generation to the schema default — all the durable seed skills, minus `drizzle-seed`'s broken-on-this-schema column generators. (Why a 500+ invoice floor at all: the chapter outline's "100+" was meant to clear Postgres's `Seq Scan`-vs-index flip; 500+ keeps the seed comfortably large and pages fast. But see R-list-plan — with only two orgs the list query's org predicate is ~50% of the table, so Postgres correctly prefers a `Seq Scan` + top-N sort no matter how large the seed; the index's value is proven by the DETAIL plan and by the index existing, not by the list plan choosing it.)

The seed must be deterministic (the PRNG seeded by the fixed `env.SEED`, fixed row contents) and idempotent (`reset` first, so re-runs yield identical counts — R-counts-idempotent). The CLI entry exits 0 on success, 1 on error.

Excludes: the reads (S4/S5). After this slice the inspector banner shows `organizations: 2`, `org_members: ≥ 5`, `customers: 40`, `invoices: ≥ 480`, `invoice_lines: ≥ 960`, `users: 4`.

Contracts created: `scripts/seed.ts` (`runSeed` export + CLI). Consumed by the provided reseed Server Action.

**Screenshot** — none (the seeded inspector with data is captured at S5, after the list read renders the rows; the banner alone is verified by Rendered check R-counts).

### Slice S4

**Lesson 5 — The tenant-scoped invoice list with cursor pagination.** Fill `listInvoices` in `src/lib/invoices/queries.ts`.

`listInvoices(input)` validates `input` against `listInvoicesInputSchema` (`safeParse`; on failure, throw — this is a server-internal contract, not user input, but prefer returning an empty page on a bad cursor since `decodeCursor` already guards it; keep it simple: trust the typed input, the inspector validates upstream). Uses `db.query.invoices.findMany` with:
- a **callback `where`** that AND-combines: the tenant guard `eq(invoices.organizationId, organizationId)`, the optional status equality (`status ? eq(invoices.status, status) : undefined`), and the cursor compound predicate when a cursor is present — `or(lt(invoices.createdAt, cursor.createdAt), and(eq(invoices.createdAt, cursor.createdAt), lt(invoices.id, cursor.id)))`. Combine with `and(...)`, dropping `undefined` conditions (first page omits the cursor predicate). The `createdAt` comparison value: the cursor carries an ISO string; compare against the `timestamptz` column (Drizzle accepts a string/Date — match the column's inferred type, pass `new Date(cursor.createdAt)` if needed for the operator).
- `orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)]` — same columns + directions as the cursor predicate (one matched design).
- `limit: pageSize + 1` (fetch one extra to learn if a next page exists).
- `with: { customer: true }` so the list cell's customer name comes back in one round trip.
Then slice off the probe row: if `rows.length > pageSize`, drop the last, set `nextCursor = encodeCursor({ createdAt: lastKept.createdAt.toISOString(), id: lastKept.id })`; else `nextCursor = null`. Return `{ rows, nextCursor }`.

The structural rule: the `organizationId` filter lives in the `where`, never as a post-load check (IDOR otherwise).

Excludes: the detail read (S5), the plan panel wiring (provided — the student reads its output). No mutation.

Contracts modified: `queries.ts` — `listInvoices` body filled (the `getInvoiceDetail` stub stays until S5). Reads `listInvoicesInputSchema`, `encodeCursor`, schema tables. Consumed by the inspector list panel.

**Screenshot** — none here; the full seeded surface (list + filter + paging + detail + plan) is captured at S5 once the detail panel also renders. (S4 owns its render checkpoint via Rendered checks R-list, R-list-paging, R-list-filter, R-list-plan.)

### Slice S5

**Lesson 6 — The single-round-trip invoice detail read.** Fill `getInvoiceDetail` in `src/lib/invoices/queries.ts`.

`getInvoiceDetail({ organizationId, invoiceId })` uses `db.query.invoices.findFirst` with:
- a **callback `where`** that AND-includes BOTH `eq(invoices.id, invoiceId)` AND `eq(invoices.organizationId, organizationId)` (the tenant guard — security in the query, not a post-load check).
- `with: { customer: true, lines: { orderBy: (t, { asc }) => [asc(t.position)] } }` (the `lines` relation = `invoiceLines`; if the relation alias is `invoiceLines`, use that key — match the relation name declared in `relations.ts`). The relational `with` satisfies both joins in one plan (single round trip, not N+1).
Returns the result or `null` when nothing matches (`findFirst` returns `undefined` → coerce to `null`).

The trap to avoid: "load the invoice, then check its `organizationId`" — leaks any guessed id. The org filter belongs inside the `where`.

Excludes: the list read (S4), the plan panel wiring (provided).

Contracts modified: `queries.ts` — `getInvoiceDetail` body filled. Reads schema tables + relations. Consumed by the inspector detail panel. The `InvoiceDetail` return type is the inferred nested shape (`NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>` is the canonical derive; export a `type InvoiceDetail` alias from `queries.ts` derived from the `findFirst` result, never hand-typed).

**Screenshot** —
- `lesson:6 route:/inspector?orgId=<org-a>&invoiceId=<an-invoice> viewport:desktop(1440x900) state:settled` — the full inspector: counts banner, header (org switcher + status filter + reseed), the paginated list on the left, the selected invoice's detail (header + customer + line items) on the right, and the plan panel. This single figure serves the Lesson 1 Overview "one screenshot of the inspector" AND Lesson 6's detail figure. Capture at S5 because S5 is the last slice that completes the detail surface end-to-end (S4 rendered the list; S5 fills the detail panel).
- `lesson:5 route:/inspector?orgId=<org-a>&status=paid viewport:desktop(1440x900) state:settled` — the list filtered to `paid` (URL carries the status, only paid rows render, "paid" control active), beside the empty detail state. Serves Lesson 5's "filter applied" figure. (Captured at S5 so both panels render real content; S4's list is complete by then.)

## Start derivation

Derive `start/` from the completed `solution/` after all slices land. Everything except the four student-owned files is **identical** — copy verbatim: the toolchain/config, `globals.css`, providers, root layout + redirect page, `docker-compose.yml`, `.env.example`, `drizzle.config.ts`, `env.ts`, `db/index.ts`, `db/columns.ts`, `db/cursor.ts`, `lib/invoices/{schema,explain,counts}.ts` (+ `orgs.ts` if split), the inspector page + its `loading.tsx` seam + sub-components, the reseed action, the shadcn primitives, the test runner, `vitest.config.ts`. Do **not** copy the `drizzle/` migration output to `start/` (the student generates it in L3) — `start/` ships no `drizzle/` directory; `db:generate` creates it.

Replace only the four student-owned files with `TODO` stubs that compile, satisfy every import contract, and render the empty inspector shell. Each stub's first body line is a `// TODO(L<n>) — <task>` marker so `rg "TODO\(L" start/` enumerates the work:
- `src/db/schema.ts` → `// TODO(L3) — author the six tables (organizations, users stub, org_members, customers, invoices, invoice_lines) with PKs, FKs+onDelete, tenant-scoped uniques, the total>=0 check, and the three invoices indexes; co-locate $inferSelect/$inferInsert type exports.` Ship a minimal compiling shape: the six table consts (each with `id` + the columns other files reference — e.g. `invoices` needs `organizationId`, `status`, `total`, `createdAt`, `id`, `customerId`, `createdBy`, `number`, `currency`, `issuedAt`, `dueAt`; `customers` needs `name`/`email`/`organizationId`; etc.) plus the 12 type exports, so `db/index.ts`, `relations.ts`, `queries.ts`, `counts.ts`, `explain.ts`, and the inspector all typecheck and the shell builds. The student replaces the whole file. (The stub tables may omit constraints/indexes — those are the student's L3 work — but must carry the columns the consumers read.)
- `src/db/relations.ts` → `// TODO(L3) — declare Relations v1 per table: organization↦(orgMembers,customers,invoices), invoice↦(organization,customer,createdBy user,lines), etc.` Ship six compiling `relations(table, () => ({}))` stubs (empty relation maps) so `db.query` typechecks; the student fills the relation bodies. (With empty relations, `with: {...}` keys won't resolve — that's the student's L3+L5/L6 work; the shell still builds because the inspector's query calls are in the stubbed `queries.ts`.)
- `src/lib/invoices/queries.ts` → two stubs: `// TODO(L5) — listInvoices: db.query.invoices.findMany with tenant+status+cursor where (callback), orderBy desc(createdAt,id), limit pageSize+1, with:{customer}; slice probe → {rows, nextCursor}.` returning `{ rows: [], nextCursor: null }`; and `// TODO(L6) — getInvoiceDetail: db.query.invoices.findFirst, where AND-includes id AND organizationId, with:{customer, lines orderBy position}; return result ?? null.` returning `null`. Export a placeholder `InvoiceDetail` type the inspector can import (derive it from the schema `Invoice` + relations in the stub, or `type InvoiceDetail = Invoice & { customer: Customer; lines: InvoiceLine[] }` as a compiling placeholder the student replaces with the derived form).
- `scripts/seed.ts` → `// TODO(L4) — reset(dbUnpooled, schema) then direct-insert 2 orgs / 4 users / 5 org_members (user 1 in both orgs) / 40 customers with 12-18 invoices each (weighted statuses) / 2-4 lines each (sequential position); deterministic via a SEED-driven PRNG, PKs left to the schema uuidv7() default.` Ship a compiling `runSeed` stub (e.g. `await reset(dbUnpooled, schema)` only, or an empty async body) + the path-normalized CLI entry (`pathToFileURL` guard — see Scaffolding recipe).

`start/` must pass `pnpm verify` (build-green with stubs, `DATABASE_URL` present) and `pnpm test:lesson <n>` must run against each placeholder. `start/`'s `/inspector` renders the empty shell (counts read 0 against an empty/migrated DB, or render gracefully if the DB is unreachable — the inspector should not 500 on first load before the student seeds; ensure the counts/list/detail reads tolerate an empty DB).

## Locked decisions

Cross-cutting calls every slice and the scaffold must honor.

**Toolchain constraints (from `Toolchain constraints.md`, mandatory):**
- **Drizzle pinned to `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x`.** Use **Relations v1** (`relations(<table>, ({ one, many }) => ({...}))` per table, with `fields`/`references` on each `one` edge and `relationName` only to disambiguate two relations to the same target). `casing: 'snake_case'` lives **on the `drizzle()` client**, set once. Migration layout is **flat** (`drizzle/<timestamp>_<name>.sql` + top-level `drizzle/meta/{_journal.json,<id>_snapshot.json}`); pass `--name init_schema`; never rename the timestamp prefix. `db.query.<table>.findMany/findFirst` `where`/`orderBy` are **callbacks** (`(t, ops) => ...`), NOT the v2 object form; there is no `RAW:` key on this line. Do NOT normalize any of this to Drizzle 1.0 `defineRelations`/object-`where`/`RAW:` (the chapter outline's shapes are 1.0-beta and will not build).
- **Local Docker Postgres uses the `postgres` (postgres-js) driver via `drizzle-orm/postgres-js`** — the Neon serverless driver cannot reach vanilla Postgres. `db = drizzle(client, { schema: { ...tables, ...relations }, casing: 'snake_case' })` where `client = postgres(env.DATABASE_URL)` and `relations` is the `db/relations.ts` module spread INTO the `schema` object (Relations v1 has no separate `relations` option — that is the 1.0 `defineRelations` form). No `serverExternalPackages` entry needed (postgres-js bundles under Turbopack).
- **Postgres 18 Docker volume mount = the parent `/var/lib/postgresql`** (not `/var/lib/postgresql/data` — silently fails to persist on v18). `postgres:18` image tag.
- `tsconfig.json`: `"jsx": "react-jsx"` (not `"preserve"`), **no `baseUrl`** (TS 6 errors on it; `@/*` resolves without it under `moduleResolution: "bundler"`), `"incremental": true`, `"skipLibCheck": true`, `"allowJs": false`, `include` carries BOTH `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`. (Forked from Ch 035; do not regress.)
- `biome.json`: `files.includes` excludes use NO trailing `/**` (`["!.next", "!node_modules"]`); `"css": { "parser": { "tailwindDirectives": true } }`. (Forked.)
- `next.config.ts`: `turbopack: { root: __dirname }`, `reactCompiler: true` (REQUIRES `babel-plugin-react-compiler@1.0.0` devDep), `cacheComponents: true`, `typedRoutes: true`. (Forked from Ch 035.)
- **`verify` runs `next typegen` before `tsc`:** `"biome ci . && next typegen && tsc --noEmit && next build"`. `PageProps<'/inspector'>` lives in `.next/types` (generated, not committed); a cold `tsc --noEmit` fails `Cannot find name 'PageProps'` without typegen first.
- **`verify` requires `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`, `SEED`) present** — `env.ts` validates them at `next build`. The reviewer/CI exports a valid placeholder (`DATABASE_URL=postgres://u:p@localhost:5432/app`) or ships a `.env`; `next build` does NOT connect to the DB (the inspector reads are request-time, not build-time), so a placeholder URL suffices for the build. Do NOT set `SKIP_ENV_VALIDATION` in `verify` — Lesson 2's whole point is that a missing var fails the build.
- **`typedRoutes: true` + dynamic href strings:** the gate is enforced by `tsc` because the `tsconfig.json` `include` carries `.next/types/**/*.ts` (the generated `link.d.ts`) AND `verify` runs `next typegen` first. The inspector's `<Link href={\`/inspector?orgId=...\`}>` strings target the **same known route** `/inspector`, so they typecheck **uncast** (a query-string variation of a declared route is assignable to `Route`). Do NOT hand-edit `next-env.d.ts` to add a `link.d.ts` reference (Next regenerates it every build and strips the line).
- **`new Date()` in a Server Component breaks `next build` under `cacheComponents: true`** — the inspector must not compute "today"/"days until due" in render. Dates come from the DB (`issuedAt`/`dueAt`/`createdAt`); format them as-is (`Intl.DateTimeFormat` on the stored value is fine — it's not a clock read). No `new Date()`/`Date.now()` in any render path. (The seed's `dueAt`-after-`issuedAt` derivation runs in the seed script, not in render.)
- **The inspector's uncached DB reads need a `<Suspense>` seam under `cacheComponents: true`** — the page reads request-time DB data (`getRowCounts`/`listOrgs`/`listInvoices`/`getInvoiceDetail`/the plan probes) at the page body's top level. Even with `await searchParams` first (which marks the route dynamic), `next build` prerenders `/inspector` and FAILS with "Uncached data was accessed outside of `<Suspense>`" with no Suspense boundary. Ship a segment-level `src/app/inspector/loading.tsx` (the cleanest seam — Toolchain constraint, Cache Components); the route then builds as Partial Prerender. Confirmed: without `loading.tsx` `pnpm verify` fails at the export step; with it, green. Do not substitute `'use cache'` (out of scope) or hand-written `<Suspense>` (last resort).
- **pnpm build ledger (sharp + esbuild):** `pnpm-workspace.yaml` in BOTH dirs with `onlyBuiltDependencies: [sharp]` AND an `allowBuilds:` block that acknowledges BOTH ignored builds: `allowBuilds: { sharp: true, esbuild: false }`. The Ch 035 fork carries only `sharp`, but Ch 041 adds `tsx`/`drizzle-kit` (and `vitest`), which pull multiple `esbuild` majors whose native build script pnpm 11.3.0 refuses to run unattended. Confirmed empirically: a warm `pnpm install` exits non-zero with `ERR_PNPM_IGNORED_BUILDS: esbuild@…` and Next 16's `next build` re-runs the dep-status check and surfaces it as a hard failure, breaking `pnpm verify`. esbuild does NOT need its build script (the native binary ships in the `@esbuild/<platform>` optional dep), so `allowBuilds: { esbuild: false }` — acknowledge-but-skip — is correct and makes `pnpm install` exit 0; do NOT add `esbuild` to `onlyBuiltDependencies`. (`allowBuilds: { esbuild: true }` also works but needlessly runs the no-op script.)
- **shadcn primitives** arrive double-quoted with `import * as React` — accept on first add (none added here beyond the Ch 035 fork), then `pnpm check` normalizes. `radix-ui` umbrella `^1.4.3`. The `separator` primitive carries `'use client'` — any verification counting `'use client'` files must include `components/ui/*`.
- **Biome `noArrayIndexKey`:** any placeholder/skeleton list maps over a stable string-key tuple, never `Array.from({length}).map((_, i) => key={i})`. (The inspector list keys on `invoice.id`; line items key on `line.id` — real keys, no issue. Only relevant if a skeleton ships.)

**Code conventions (taught syntax — from `Code conventions.md`):**
- `db/schema.ts` is the single source of truth; row types from `typeof <table>.$inferSelect`, insert types from `$inferInsert`, co-located under each table. Never hand-write a row interface. Select type = entity noun (`Invoice`), insert = `New`-prefixed (`NewInvoice`).
- PKs: `id: uuid('id').primaryKey()...` — this project uses the **SQL-side native** form `.default(sql\`uuidv7()\`)` (Ch 037 L5 canonical on Postgres 18; the `uuidv7` npm package + `$defaultFn(() => uuidv7())` is the named portability fallback but native is used here since the target is PG 18). Never `.defaultRandom()` (v4). `sql` imported from `drizzle-orm`.
- FKs: explicit `onDelete` on every edge — `cascade` for owned children (`org_members`→both parents, `customers`/`invoices`→`organizations`, `invoice_lines`→`invoices`), `restrict` for referenced entities (`invoices`→`customers`, `invoices`→`users`).
- Money is `numeric({ precision: 12, scale: 2 })` → inferred `string`; never `parseFloat`; `Number(total)` only at the display edge. `timestamptz` via `timestamp({ withTimezone: true })` for every instant. `pgEnum` for `role` and `status`.
- Tenant scope carried by hand in every `where` (`eq(t.organizationId, organizationId)`), AND-combined, never a post-load check (the IDOR failure mode). This is the manual discipline Unit 9's `tenantDb` later wraps — do NOT invent a `tenantDb` here (not taught yet).
- Unique constraints carry the tenant column (`unique on (organizationId, ...)`); name every `unique`/`check`/`index` explicitly (prefix form `idx_<table>_<col>...`, `<table>_<col>_unique`).
- Relations v1 in `db/relations.ts`; the relational query API for the tree reads (both reads here use it). Reach for `db.select` only for the counts (`count()` aggregate) — provided.
- `safeParse` (never `parse`) for untrusted `searchParams`; decode-then-validate the cursor; fall back to defaults so a bad URL renders the default view, never a 500.
- Filenames kebab-case; one concept per file. `type` aliases (never `interface`); no `any`; `import type` for type-only imports (`verbatimModuleSyntax`). Arrow-`const` for components/helpers. **Default exports ONLY for framework-named files** (`page.tsx`, `layout.tsx`, etc.); every authored component/helper is a named export.
- `env.ts` is the only env boundary; application code imports `env`, never `process.env` (only `runtimeEnv` in `env.ts` and the out-of-bundle `drizzle.config.ts`/scripts read `process.env`).
- No `Result<T>`, no branded IDs, no `'use cache'`, no `nuqs`, no `tenantDb`, no transactions, no Server Actions beyond the provided `reseed` (Unit 6 owns those). No `useEffect`/`useMemo`/`useCallback` (React Compiler on; the inspector is server-rendered with no client islands besides the reseed `<form>` which needs none).
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `border-border`); `gap` for spacing; semantic HTML (`<main>`, `<ul>`/`<li>` for the list, `<article>` for the detail, `<dl>` for field pairs, one `<h1>`); `aria-current` on the active org/status link; `focus-visible:` ring on interactive controls.

**Structural invariants (head off render breaks):**
- **`inspector-grid` resolves to exactly two direct children** — the list panel (left) and the detail panel (right), in one row at `md`+. No third child; do not let a fragment flatten extra cells into the grid (each panel is a single wrapping element).
- The inspector page returns a **single root element** (`<main data-testid="inspector">`); the grid is one region inside it, with the banner/header above and the plan panel below the grid (siblings of the grid, not grid cells).
- Theme inherited from the fork (`.dark` via `next-themes`); semantic tokens only, one class string per element.

**Stable selectors (every rendered surface exposes `data-testid`):** `inspector`, `counts-banner`, `count-organizations`, `count-users`, `count-org-members`, `count-customers`, `count-invoices`, `count-invoice-lines`, `inspector-header`, `org-switcher`, `status-filter`, `reseed-form`, `inspector-grid`, `list-panel`, `invoices-list`, `next-page-link`, `detail-panel`, `invoice-detail`, `detail-empty`, `plan-panel`, `plan-text`. Prefer these over positional selectors in all Rendered checks. (List rows key on `invoice.id`; no per-row testid — count children of `invoices-list`.)

## File tree

Complete tree after S5 (`solution/`; `start/` is identical except the four student files carry stubs and `start/` ships no `drizzle/` directory). `[S2]` etc. tag the slice that creates/edits; unmarked files are scaffolder-authored (most forked from Ch 035).

```
solution/
  package.json                              # scaffold (forked; name, +drizzle/postgres/t3-env/uuidv7/drizzle-kit/drizzle-seed/dotenv-cli/tsx, db:* scripts, verify runs next typegen)
  pnpm-lock.yaml                            # scaffold (forked + new deps)
  pnpm-workspace.yaml                       # scaffold (forked; sharp ledger)
  .npmrc                                    # scaffold (forked)
  .mise.toml                                # scaffold (forked)
  .editorconfig                             # scaffold (forked)
  .gitignore                                # scaffold (forked; excludes .env*)
  .env.example                              # scaffold (DATABASE_URL, DATABASE_URL_UNPOOLED, SEED)
  docker-compose.yml                        # scaffold (postgres:18 on :5432, parent volume mount)
  drizzle.config.ts                         # scaffold (dialect, schema, out, unpooled url, casing, verbose, strict)
  biome.json                                # scaffold (forked)
  tsconfig.json                             # scaffold (forked)
  next.config.ts                            # scaffold (forked; cacheComponents + typedRoutes + reactCompiler)
  components.json                           # scaffold (forked)
  postcss.config.mjs                        # scaffold (forked; @tailwindcss/postcss)
  next-env.d.ts                             # scaffold (forked; Next-emitted, not hand-edited)
  AGENTS.md                                 # scaffold (forked; thesis + DB daily commands)
  vitest.config.ts                          # scaffold (forked)
  scripts/
    test-lesson.mjs                         # scaffold (forked; single-file runner)
    seed.ts                                 # [created by: S3]  (stub in start)
  tests/
    lessons/
      Lesson 2.test.ts                      # scaffold placeholder (lesson-test-coder fills)
      Lesson 3.test.ts                      # scaffold placeholder
      Lesson 4.test.ts                      # scaffold placeholder
      Lesson 5.test.ts                      # scaffold placeholder
      Lesson 6.test.ts                      # scaffold placeholder
  drizzle/                                  # [created by: S2 via db:generate; committed]  (absent in start)
    0000_init_schema.sql                    # [S2]
    meta/_journal.json                      # [S2]
    meta/0000_snapshot.json                 # [S2]
  .vscode/
    extensions.json                         # scaffold (forked)
    settings.json                           # scaffold (forked)
  src/
    env.ts                                  # scaffold (t3-env: DATABASE_URL/DATABASE_URL_UNPOOLED/SEED)
    app/
      globals.css                           # scaffold (forked; tokens, light + .dark)
      layout.tsx                            # scaffold (forked; html, Providers, metadata)
      page.tsx                              # scaffold (redirect('/inspector'))
      _components/
        providers.tsx                       # scaffold (forked; 'use client' ThemeProvider)
      inspector/
        page.tsx                            # scaffold (Server Component; reads searchParams; composes panels)
        loading.tsx                         # scaffold (Suspense seam; required for Cache Components build)
        actions.ts                          # scaffold ('use server' reseed → runSeed + revalidatePath)
        _components/
          counts-banner.tsx                 # scaffold (six row counts)
          inspector-header.tsx              # scaffold (org switcher + status filter + reseed form)
          list-panel.tsx                    # scaffold (calls listInvoices; rows + next-page link)
          detail-panel.tsx                  # scaffold (calls getInvoiceDetail; detail or empty)
          plan-panel.tsx                    # scaffold (<details> rendering the provided plan probe)
    components/
      ui/
        button.tsx                          # scaffold (forked)
        badge.tsx                           # scaffold (forked)
        card.tsx                            # scaffold (forked)
        separator.tsx                       # scaffold (forked)
        skeleton.tsx                        # scaffold (forked; may be unused, kept)
    db/
      index.ts                              # scaffold (postgres-js db client + relations + casing; dbUnpooled alias)
      columns.ts                            # scaffold (timestamps)
      cursor.ts                             # scaffold (Cursor type, cursorSchema, encode/decode)
      schema.ts                             # [created by: S2]  (stub in start)
      relations.ts                          # [created by: S2]  (stub in start)
    lib/
      utils.ts                              # scaffold (forked; cn())
      invoices/
        schema.ts                           # scaffold (statusSchema, listInvoicesInputSchema)
        queries.ts                          # [listInvoices created by: S4; getInvoiceDetail created by: S5]  (stubs in start)
        counts.ts                           # scaffold (getRowCounts + listOrgs)
        explain.ts                          # scaffold (getDetailPlan, getListPlan — provided EXPLAIN probes)
```

## Verification

### Static checks (reviewer executes)

1. **both** — `pnpm verify` exits 0 in `solution/` and in `start/` (Biome CI + `next typegen` + `tsc --noEmit` + `next build` all green) **from a cold checkout** (delete `.next/` first), with `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`SEED` exported to valid placeholder values (build does not connect to the DB). Catches drift, type errors, build failures, the sharp/babel-plugin/jsx pitfalls, and the `PageProps`-needs-typegen ordering.
2. **both** — `pnpm test:lesson 2` runs exactly `tests/lessons/Lesson 2.test.ts` and no other (exact path, not a substring positional). Sanity-repeat: `pnpm test:lesson 6` runs only `Lesson 6.test.ts`.
3. **start** — `rg "TODO\(L" start/src start/scripts` lists exactly the **four** student-owned files (one marker each): `db/schema.ts` (L3), `db/relations.ts` (L3), `lib/invoices/queries.ts` (two markers — L5 + L6), `scripts/seed.ts` (L4).
4. **solution** — `rg -l "TODO\(L" solution/src solution/scripts` returns nothing (no stub markers left).
5. **solution** (feature-not-inert greps — each fails if the load-bearing teaching feature ships inert):
   - `rg "organizationId" solution/src/lib/invoices/queries.ts` AND it appears in BOTH `listInvoices` and `getInvoiceDetail` `where` clauses — the tenant guard is present in both reads (fails if either read omits the org filter → IDOR / cross-org leak). Pair with R-detail-crossorg.
   - `rg "limit" solution/src/lib/invoices/queries.ts` and the value is `pageSize + 1` (or `+ 1`) — the has-next-page probe trick is present (fails if it fetches exactly `pageSize` → `nextCursor` can never be set correctly).
   - `rg "encodeCursor" solution/src/lib/invoices/queries.ts` — the list emits a real next cursor (fails if `nextCursor` is hardcoded `null` → no paging).
   - `rg "with:" solution/src/lib/invoices/queries.ts` and both reads use the relational `with` (`customer` in the list, `customer`+`lines` in the detail) — the single-round-trip joins are present (fails if the detail fetches lines/customer via separate queries → N+1).
   - `rg "default\(sql\`uuidv7" solution/src/db/schema.ts` (or `uuidv7` appears on every PK) — PKs are UUIDv7, never `defaultRandom()`/v4 (fails if a PK is v4 → write-amplification + the ordering the cursor relies on breaks). Also `rg "defaultRandom" solution/src/db/schema.ts` returns nothing.
   - `rg "onDelete: 'restrict'" solution/src/db/schema.ts` (the `invoices`→`customers` and `invoices`→`users` edges) AND `rg "onDelete: 'cascade'" solution/src/db/schema.ts` (the owned-children edges) — per-edge `ON DELETE` decisions are made, not defaulted (fails if every edge is the same rule or `onDelete` is omitted).
   - `rg "idx_invoices_org_status_created_at_id|idx_invoices_org_created_at_id|idx_invoices_customer_id" solution/src/db/schema.ts` — all three named indexes are declared (fails if the indexes the cursor/filter/customer-join queries are designed for are missing; this checks declaration, the teaching artifact — the planner's runtime choice at the seeded two-org scale is covered by R-list-plan / R-detail-plan).
   - `rg "check\(" solution/src/db/schema.ts` and the `total >= 0` predicate is present — the money invariant is in the DB (fails if dropped).
   - `rg "unique\(" solution/src/db/schema.ts` includes the tenant-scoped uniques (`(organizationId, number)`, `(organizationId, email)`, `(invoiceId, position)`) — uniqueness is tenant-scoped (fails if a bare global unique ships).
   - `rg "reset\(" solution/scripts/seed.ts` — the seed wipes first (idempotent reset-then-insert; fails if `reset` is missing → re-runs accumulate rows). (The seed direct-inserts the rows; it does NOT call `drizzle-seed`'s `seed()`, which cannot satisfy this schema's unique/check constraints — see Slice S3.)
   - `rg "env.SEED" solution/scripts/seed.ts` — the seed is deterministic, driven by `env.SEED` (a fixed PRNG seed; fails if the seed uses `Math.random()`/`Date.now()` and is non-reproducible, breaking R-counts-idempotent).
   - `rg "INV-|status" solution/scripts/seed.ts` and the status assignment is weighted (the four statuses are NOT assigned uniformly — a banded/weighted pick driven by the PRNG; fails if statuses are uniform/hardcoded).
   - `rg "EXPLAIN|explain" solution/src/lib/invoices/explain.ts` — the plan probes run a real EXPLAIN (provided; confirms the plan panel is not inert).
6. **both** — `rg "createInvoice|useActionState|'use cache'|defineRelations|from 'nuqs'|tenantDb|drizzle-orm/neon" solution/src start/src` returns nothing (no CRUD actions, no caching directives, no Drizzle-1.0 `defineRelations`, no nuqs, no premature `tenantDb`, no Neon driver — the toolchain forbids the last and the rest are not-yet-taught). The provided `reseed` is the sole `'use server'` file (`rg -l "use server" solution/src` returns only `app/inspector/actions.ts`).
7. **both** — `rg "process.env" solution/src start/src` returns matches ONLY in `src/env.ts` (the `runtimeEnv` map) — application code reads `env`, never `process.env` (Lesson 2's boundary). `drizzle.config.ts` and `scripts/seed.ts` (out-of-bundle) may read `process.env`/`env` freely.
8. **both** — `rg "postgres-js" solution/src/db/index.ts` confirms the postgres-js driver (the only driver that reaches local Docker Postgres); `rg "casing: 'snake_case'" solution/src/db/index.ts` confirms casing is on the client.
9. **both** — `rg "tailwind.config" solution start --glob '!**/node_modules/**'` returns nothing (CSS-first Tailwind v4 only).

### Rendered checks (slice coders + inspector run against the running app)

Run against a **seeded** local DB (`docker compose up -d` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`). Viewports explicit. The owning slice runs its check as its render checkpoint. (`<org-a>`/`<org-b>` = the two seeded org ids; the inspector defaults `orgId` to the first org when absent.)

| id | slice | route | viewport | state | intent | selectors | assertion |
|----|-------|-------|----------|-------|--------|-----------|-----------|
| R-counts | S3 | /inspector | 1440×900 | settled | the seed populated two orgs, overlapping members, 480+ invoices | `counts-banner`, `count-organizations`, `count-org-members`, `count-invoices`, `count-invoice-lines` | `count-organizations` reads exactly `2`; `count-org-members` reads `≥ 5` (with ≥ 1 user in both orgs); `count-invoices` reads `≥ 480`; `count-invoice-lines` reads `≥ 960`; `count-customers` reads `40`. The banner renders all six figures. |
| R-counts-idempotent | S3 | /inspector | 1440×900 | reseed twice via `reseed-form`, compare | the seed is idempotent — re-running yields identical counts | `count-invoices`, `count-organizations`, `count-customers` | Submit `reseed-form`, record the six counts; submit again, record again — every count is identical across the two runs (deterministic + reset-then-seed). |
| R-grid-two-children | S4 | /inspector?orgId=<org-a> | 1440×900 | settled | the surface is one row of exactly two panels, never split | `inspector-grid`, `list-panel`, `detail-panel` | `inspector-grid` has **exactly 2 direct children** — `list-panel` (left) and `detail-panel` (right) — in the same row at 1440px (list-panel right edge < detail-panel left edge). Neither panel splits into extra cells. |
| R-list | S4 | /inspector?orgId=<org-a> | 1440×900 | settled | the list renders one org's invoices with customer name in one round trip | `list-panel`, `invoices-list` | `invoices-list` renders rows for org A's invoices (each row shows a number, a customer name, a status badge, a USD total, a due date); the customer name is present on every row (proving `with: { customer }` returned it). Row count = `pageSize` (20) when org A has more than 20 invoices, else all of them. |
| R-list-orgswitch | S4 | /inspector?orgId=<org-a> → ?orgId=<org-b> | 1440×900 | click the org-B link in `org-switcher` | switching orgs changes which invoices appear (tenant scope works) | `org-switcher`, `invoices-list` | After switching to org B, `invoices-list` shows a different set of rows (org B's invoices); the active org link carries `aria-current="page"`. The row set is not identical to org A's. |
| R-list-paging | S4 | /inspector?orgId=<org-a> | 1440×900 | click `next-page-link` 2× | cursor paging advances with a fresh ?cursor and never repeats a row | `invoices-list`, `next-page-link` | Page 1 → click `next-page-link` (URL gains a `?cursor=...`) → page 2 → click again → page 3. Collect the row identities (numbers) across the three pages: **no number repeats** across pages. Each click changes the `?cursor=` value. On the last page `next-page-link` is absent/disabled. |
| R-list-filter | S4 | /inspector?orgId=<org-a>&status=paid | 1440×900 | settled | the status filter is server-side and survives a reload | `status-filter`, `invoices-list` | `invoices-list` shows only `paid` rows (every visible status badge reads "paid"); the "paid" control in `status-filter` carries `aria-current="page"`. After a **hard reload** of the same URL, the view is unchanged (filter read from the URL server-side, not client state). |
| R-list-plan | S4 | /inspector?orgId=<org-a> | 1440×900 | expand `plan-panel` | the plan panel renders the list query's real EXPLAIN ANALYZE output with the matched-design sort | `plan-panel`, `plan-text` | With no invoice selected, expanding `plan-panel` shows `plan-text` containing a non-empty `EXPLAIN ANALYZE` plan for the list query: a top `Limit` node, a `Sort` node whose `Sort Key` is exactly `created_at DESC, id DESC` (proving the `orderBy` matches the cursor's `(createdAt, id)` design), and the actual-row/timing numbers (`actual time=…`, `rows=…`). The plan is non-inert (the four numbers are present) and the query completes in single-digit ms. NOTE: do **not** assert an `Index Scan` on `idx_invoices_org_created_at_id` here — with only two seeded orgs the `organization_id` predicate selects ~half the table, so Postgres 18 correctly prefers a `Seq Scan` + top-N heapsort over the composite index NO MATTER how large the seed (confirmed empirically: a `Seq Scan` persists even at 20k rows). The composite index's value (an ordered `Index Scan` that stops after `LIMIT` rows) is what R-detail-plan demonstrates and what the index would serve once `organization_id` is selective (many orgs); asserting an `Index Scan` for this two-org list is not falsifiable-true and must not be required. |
| R-detail | S5 | /inspector?orgId=<org-a>&invoiceId=<inv-a> | 1440×900 | settled | a selected invoice shows its detail with customer + ordered line items beside the list | `inspector-grid`, `invoices-list`, `invoice-detail`, `detail-empty` | `invoice-detail` renders the invoice header, its customer, and its line items **ordered by position** (1, 2, 3…) on the right; `detail-empty` is absent; `invoices-list` is still present on the left. `inspector-grid` still has exactly 2 direct children. |
| R-detail-empty | S5 | /inspector?orgId=<org-a> | 1440×900 | settled | no selection shows the empty state, not a crash | `detail-panel`, `detail-empty`, `invoice-detail` | With no `?invoiceId`, `detail-panel` renders `detail-empty` ("pick an invoice") and NOT `invoice-detail`; the page is HTTP 200 with the list on the left. |
| R-detail-crossorg | S5 | /inspector?orgId=<org-a>&invoiceId=<inv-b> | 1440×900 | settled | a cross-org invoice id returns the empty state, never the leaked row | `detail-panel`, `detail-empty`, `invoice-detail` | Pairing org A's `orgId` with an `invoiceId` that belongs to org B renders `detail-empty` (the tenant guard in `getInvoiceDetail`'s `where` returned null), NOT `invoice-detail` with org B's data. No 500. (This is the IDOR check — the org filter lives in the query.) |
| R-detail-plan | S5 | /inspector?orgId=<org-a>&invoiceId=<inv-a> | 1440×900 | expand `plan-panel` | the detail load is a single round trip — one plan, invoices reached by an index, joined to customers + lines | `plan-panel`, `plan-text` | With an invoice selected, expanding `plan-panel` shows `plan-text` containing a **single** `EXPLAIN ANALYZE` plan (one plan tree, joins composed — `customers` and `invoice_lines` appear as nodes WITHIN it, not as three separate top-level statements) in which `invoices` is reached via an **`Index Scan`** (e.g. `Index Scan using invoices_pkey on invoices`, the selective `id` lookup) and there is **no `Seq Scan` on `invoices`**. Do NOT require the invoices index scan to be the plan's root node (the root is typically a join like `Nested Loop`/`Hash Join`, and the small `customers` table may itself be `Seq Scan`ned — both expected); the falsifiable claim is one plan + invoices-via-index + no `Seq Scan on invoices`. |
| R-responsive | S5 | /inspector?orgId=<org-a>&invoiceId=<inv-a> | 390×844 | settled | the two-panel surface stacks below md with no horizontal scroll | `inspector-grid`, `list-panel`, `detail-panel` | At 390px `inspector-grid` still has exactly 2 direct children but they are stacked (detail-panel top offset > list-panel bottom offset, not in the same row); document `scrollWidth` ≤ `clientWidth` (no horizontal scroll). |
