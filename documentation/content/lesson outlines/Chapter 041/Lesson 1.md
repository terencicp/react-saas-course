# Chapter 041 — Lesson 1 outline

## Lesson title

- Page title: **Project: the org-scoped invoicing data layer**
- Sidebar title: **Project overview**

(The chapter outline's "Project Overview" is the generic placeholder all first project lessons carry. Keep it for the sidebar but give the page header the project's actual name so the TOC and the unit's project line up.)

## Lesson type

`Project overview`

(First lesson of a project chapter. No feature built, no tests run. The test-coder does NOT run for this lesson.)

## Lesson framing

The student walks away with a running invoicing data-layer starter and a mental map of the one artifact every later unit bends back to: a Drizzle schema as the single source of truth.
The senior payoff installed here is orientation — seeing the whole shape (six tables, relations, init migration, deterministic seed, two tenant-scoped reads, a provided `/inspector` to exercise them) before touching any of it, and understanding that the four TODO files are the only places they write code while the inspector, EXPLAIN probes, and cursor helpers are provided plumbing.
The lesson closes the moment the starter runs locally and `/inspector` loads with empty banners.

## Codebase state

First lesson — Entry/Exit subsections omitted per the contract.
State at exit (carried into Lesson 2): dependencies installed, `.env` filled, Docker Postgres up, `pnpm dev` serving `/inspector` with empty count banners and no tables yet (no migration has run).

## Lesson sections

Render the Project-overview section list: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No tests, no exercises, no `<details>`.

### What we're building (intro, no header)

One paragraph. Org-scoped invoicing is the canonical relational surface every later unit — CRUD, auth gates, RBAC, billing, lists — layers on top of; this project ships only its data layer and nothing else: six tables (`organizations`, `users`, `org_members`, `customers`, `invoices`, `invoice_lines`), their relations, the init migration, a deterministic seed, and the two reads every later unit reuses (a cursor-paginated org-scoped list with a status filter, and a single-round-trip "one invoice with lines and customer" detail).
State that the student explores the finished result through a provided inspector page at `/inspector` — an org switcher, the paginated list, a detail panel, and an `EXPLAIN ANALYZE` plan panel that proves the indexes earn their weight — and that the inspector is provided in full so the student only fills the four files it depends on.
Keep it warm and brief; no rationale dumps (those belong to the implementation lessons).

Figure: one `Screenshot` (desktop variant) of the seeded inspector — visible org switcher, the paginated invoice list, an expanded detail panel, and the plan panel. Wrap in `Figure` with a short caption. This is the "finished app" shot the contract asks for. Placeholder image; the resourcer/screenshot pass supplies the asset.

### What we'll practice

Bulleted list (the skills, in the student's development terms), drawn from the chapter outline's "What we'll practice":
- Translating a tenant-aware SaaS data model into a Drizzle schema where the schema is the single source of truth and every row type flows from `$inferSelect`.
- Deciding FK `ON DELETE` per edge and scoping every uniqueness constraint and index to the tenant.
- Authoring a deterministic, idempotent seed with `reset()` plus PRNG-driven direct inserts.
- Writing tenant-scoped reads — cursor pagination and a relational nested load — with the `organizationId` guard baked into every `where`.
- Reading an `EXPLAIN ANALYZE` plan to confirm a query is fast for the reason you think it is.

Prose framing line before the list is optional; keep terse.

### Architecture

Labeled list, shape only (no diagram — a box-and-arrow figure adds nothing over four named layers; reserve diagram budget). Name the four layers and the dependency direction toward the schema:
- **`src/db/`** — `schema.ts` (the six tables, the source of truth), `relations.ts`, the `db` client (`index.ts`), the shared `timestamps` group (`columns.ts`), and the opaque `cursor.ts` helpers.
- **`src/lib/invoices/`** — the typed reads (`queries.ts`), the read-boundary Zod (`schema.ts`), plus provided plumbing (`counts.ts`, `explain.ts`).
- **`scripts/seed.ts`** — the deterministic, idempotent seed.
- **`src/app/inspector/`** — the provided Server Component that reads everything from `searchParams` and renders four panels.

One closing sentence: the schema sits at the center — types, queries, the inspector, and every later unit derive from `db/schema.ts`. Keep this conceptual; per-file deep explanation lives in the implementation lesson that first touches each file.

### Starting file tree

`FileTree` component (markdown unordered list inside the slot). Reproduce the starter tree from the chapter outline / project code outline. Annotation rules:
- **Bold** the four TODO files as the highlighted focus: `src/db/schema.ts`, `src/db/relations.ts`, `src/lib/invoices/queries.ts`, `scripts/seed.ts`. Append a short `TODO L<n>` comment to each (L3, L3, L5/L6, L4).
- Add a one-line dimmed comment only on files a lesson will touch or that changed from the Chapter 035 fork (the data-layer additions): `docker-compose.yml`, `drizzle.config.ts`, `.env.example`, `src/env.ts`, `src/db/index.ts`, `src/db/columns.ts`, `src/db/cursor.ts`, `src/lib/invoices/schema.ts`, `src/lib/invoices/counts.ts`, `src/lib/invoices/explain.ts`, `src/app/inspector/` (and note it is provided in full).
- Leave the rest of the App Router scaffold and shadcn UI uncommented or collapse under `…` placeholders to keep the tree scannable.
- Use `tests/lessons/` with a comment that placeholder specs ship per implementation lesson, and note `drizzle/` is absent until the student runs `db:generate` in Lesson 3.

One sentence under the tree: deep per-file explanation lives in the implementation lesson that first touches each file, not here.

### Roadmap

`CardGrid`, one `Card` per implementation lesson (Lessons 2–6). Each card: lesson number + title, one sentence naming what it adds. Use the chapter outline's roadmap lines verbatim in spirit:
- **Lesson 2 — Type-safe environment variables**: a missing `DATABASE_URL` fails the build instead of crashing the first request.
- **Lesson 3 — Authoring the schema and shipping the init migration**: the six tables, relations, and indexes land in Postgres through one reviewed migration.
- **Lesson 4 — A deterministic, idempotent seed**: two orgs with overlapping members and 100+ invoices, identical on every run.
- **Lesson 5 — The tenant-scoped invoice list**: cursor pagination with a server-side status filter, proven against its query plan.
- **Lesson 6 — The single-round-trip invoice detail**: one invoice with its lines and customer, guarded by `organizationId`.

### Setup

`Steps` component, exact commands in order, each with the success outcome. Match the lesson contract's required first step and the chapter outline's setup sequence:

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 041/start/`. Open the directory.
2. `pnpm install` — completes with no errors. (The repo is pnpm-only; `preinstall` enforces it.)
3. Copy `.env.example` to `.env` and fill the values, then list the three env vars in a short table or inline list. The `db:*` scripts load `.env` via `dotenv-cli`; `next build` reads the environment directly. Env vars:
   - `DATABASE_URL` — pooled Postgres connection string for the app's `db` client; locally `postgres://postgres:postgres@localhost:5432/app` from the Docker Compose service.
   - `DATABASE_URL_UNPOOLED` — unpooled URL for Drizzle Kit (migrate/seed); locally the same value as `DATABASE_URL` (the split is a no-op now, staged for Unit 20's Neon swap).
   - `SEED` — the fixed seed number that makes the seed deterministic; default `1`.
4. `docker compose up -d` — brings up the `postgres:18` service on `:5432`.
5. `pnpm dev` — the inspector renders at `/inspector` with empty count banners; no tables exist yet (the migration runs in Lesson 3).

Close with one sentence: the lesson ends when the starter runs locally and the inspector loads with empty banners; scope cuts and technology rationale belong to the implementation lessons that introduce each decision.

#### Code-sample handling for this lesson

- Setup commands → `Code` blocks (one per step or grouped), inside `Steps`.
- Starting file tree → `FileTree`.
- Roadmap → `CardGrid` + `Card`.
- Finished-app shot → `Screenshot` inside `Figure`.
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` here — there is no source to walk through; the schema/query code is introduced in its owning implementation lesson.

## Scope

This lesson is orientation and setup only. It does NOT cover:
- Why `@t3-oss/env-nextjs` / build-time env validation — Lesson 2.
- The schema authoring decisions (UUIDv7, `pgEnum`, per-edge `ON DELETE`, tenant-scoped uniques and indexes), relations, and the init migration — Lesson 3.
- The deterministic-PRNG seed and the idempotency move — Lesson 4.
- `listInvoices` / cursor pagination / status filter / reading the list plan — Lesson 5.
- `getInvoiceDetail` / the single-round-trip nested read / the tenant guard against IDOR — Lesson 6.
- All Unit 5 teaching of the underlying primitives (`pgTable`, joins, relational query API, `EXPLAIN ANALYZE`, migrations/seeds) — Chapters 036–040.
