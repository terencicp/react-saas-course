# Lesson 1 — Project overview

## Lesson title

Chapter-outline title "Project Overview" fits the contract (the first project lesson is always titled this). Keep as is.

- **Page title:** Project overview
- **Sidebar title:** Project overview

## Lesson type

`Project overview` — the first lesson of a project chapter. No feature is built; the student leaves with the seeded starter running locally and a mental map of the five implementation lessons ahead. The test-coder does not run for this lesson type.

## Lesson framing

The student walks away with the framing that makes the rest of the chapter coherent: a working SaaS *read* surface (the Unit 5 invoicing data layer plus its list/detail pages) that they are about to turn into a full CRUD surface where every mutation flows through one Server Action that parses with a Zod schema derived from the Drizzle table, returns the canonical `Result`, and revalidates the list. The senior payoff installed here is the shape of the whole chapter — schema-as-contract, the five-seam action, native React 19 forms that survive JavaScript-off — named before any code so the student reads each later lesson as one move in a deliberate sequence rather than an isolated trick. They finish this lesson with the starter migrated, seeded, and serving `/invoices`, and with a clear roadmap of what each of the five build lessons adds.

## Lesson sections

Per the Project-overview contract: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No exercises, no diagram needed (architecture is a labeled list).

### What we're building (intro, no header)

One paragraph: we take the Unit 5 invoicing data layer — schema, relations, deterministic seed, and the read-path `listInvoices` / `getInvoiceDetail` queries already in place — and ship a full CRUD surface on it: a "new invoice" form, an "edit invoice" form, and a delete-with-confirmation button. Every mutation flows through a Server Action that parses its `FormData` with a Zod schema, returns the canonical `Result`, and revalidates the list. Name the payoff (the canonical SaaS mutation flow) without teaching mechanics — rationale belongs to the build lessons.

Then a single figure: a screenshot strip walking `/invoices` → `/invoices/new` → a field-error state → the success redirect → an optimistic add → the delete confirmation dialog. Use `Screenshot` frames grouped in a `TabbedContent` (one tab per state) so the six states fit one figure. Caption: "The CRUD surface you'll build across the next five lessons."

### What we'll practice

Header: "What we'll practice". Bulleted list, skills-framed (not mechanics):

- Deriving a mutation schema from the Drizzle `invoices` table with `createInsertSchema` + refinement, then treating that one schema as the contract both the action and the form's input `name`s obey — drift becomes impossible.
- Writing Server Actions in the five-seam shape — parse, authorize, mutate, revalidate, return — that hand back a `Result` instead of throwing.
- Building native React 19 forms with `useActionState`, uncontrolled inputs, `useFormStatus`, and `useOptimistic`, wired so the whole surface still works with JavaScript disabled.
- Reaching for a Drizzle transaction when a mutation is multi-step, and keeping external calls out of it.

### Architecture

Header: "Architecture". Labeled list, shape only — no rationale, no API. Trace one mutation end to end so the seams are visible:

1. The browser submits a native `<form action={serverAction}>`.
2. The Server Action parses the `FormData` against the Zod schema, reads the active org/user from the auth stub, writes through the pooled Drizzle client (the delete inside a transaction), calls `revalidatePath('/invoices')`, and returns a `Result`.
3. On the client, `useActionState` renders that `Result` — field errors inline, a banner for the rest — while `useOptimistic` paints the pending create row until the revalidated list arrives.

Render as a numbered/labeled list, not a box-and-arrow diagram — the flow is linear and prose carries it. Call out the auth-stub seam in one sentence: `getActiveContext()` returns the seeded org+user today and is the exact slot Unit 9's `authedAction` wrapper drops into later, so the student does not reach for `cookies()`.

### Starting file tree

Header: "Starting file tree". Use `FileTree`. Reproduce the tree from the chapter outline's "Starting file tree" block (the `src/` layout under §"Starting file tree (stubs marked with TODO)"). Annotation rule per contract: comment one line only on files that lessons touch or that differ from the previous project; leave the rest uncommented.

- Highlight the TODO set as the focus (mark these as where the student works): `lib/invoices/mutation-schemas.ts`, `lib/invoices/actions.ts`, `app/_components/submit-button.tsx`, `app/_components/field-error.tsx`, `app/invoices/_components/optimistic-invoices-list.tsx`, `app/invoices/new/new-invoice-form.tsx`, `app/invoices/[invoiceId]/edit-invoice-form.tsx`, `app/invoices/[invoiceId]/delete-invoice-form.tsx`.
- Comment "provided" on the carried-in surfaces the build depends on: `db/` (full schema, relations, client, cursor), `db/queries/invoices.ts` (`listCustomers`), `lib/invoices/schema.ts`, `lib/invoices/queries.ts`, `lib/result.ts`, `lib/auth-stub.ts`, all page/loading RSCs, `app/invoices/_components/deleted-toast.tsx`, `components/ui/` primitives.

After the tree, two short prose callouts on the provided files the student must read before building (do not show their code — link to where they're used in later lessons):

- `lib/result.ts` — the `Result<T>` type (seven `ErrorCode`s; this project uses `validation` / `conflict` / `not_found` / `internal`), the `ok` / `err` helpers, and `isUniqueViolation` (maps Postgres `23505` read off `error.cause` to a `conflict`). The type lives in one place and is the contract; students never redeclare it per action.
- `lib/auth-stub.ts` — `async getActiveContext()` returns `{ organizationId, userId }` for the seeded "Acme" org and its owner, resolved by natural key (org slug + user email) at call time because the seed's `uuidv7()` PKs differ across runs. Intentionally not session-shaped; called once at the top of each action body where chapter 057's `authedAction` wrapper lands later. One line on the App Router convention: underscore-prefixed `_components/` folders are "not a route segment, just shared components."

### Roadmap

Header: "Roadmap". `CardGrid` with one `Card` per build lesson, each with the lesson number + title and one sentence naming what it adds. Pull the titles and one-liners from the chapter outline's Roadmap block verbatim-in-spirit:

- **Lesson 2 — Create an invoice.** Derive the create schema, write `createInvoice` in the five-seam shape, and wire `NewInvoiceForm` with the reusable `<SubmitButton>` and `<FieldError>` so a valid invoice persists and redirects.
- **Lesson 3 — Edit an invoice.** Extend the schema with an `id`, write `updateInvoice` with a tenant-scoped `where`, and prefill `EditInvoiceForm` so edits save in place and a duplicate number surfaces a conflict banner.
- **Lesson 4 — Delete with confirmation.** Add `deleteInvoice` and a shadcn `<Dialog>` delete form that submits through the action, with an inline no-JS fallback.
- **Lesson 5 — Optimistic create.** Layer `useOptimistic` on the list and a client-generated UUIDv7 so the new row appears instantly, reconciles by key, and rolls back on failure.
- **Lesson 6 — Transactional delete.** Wrap the delete in a Drizzle transaction for atomic multi-step deletion and add a URL-param success toast.

### Setup

Header: "Setup". `Steps` component, exact commands in order. First step per contract names the project repo. Close with the expected result.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 047/start/`. Open that directory.
2. `pnpm install` — installs clean.
3. `cp .env.example .env` — the `db:*` scripts load `.env` via `dotenv-cli`. Reuses chapter 041's `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `SEED`; no new env vars. Both URLs point at the local Docker Postgres (the pooled/unpooled split is a no-op locally, staged for Unit 20's Neon swap).
4. `docker compose up -d` — starts the local Postgres 18 service on `:5432`.
5. `pnpm db:migrate && pnpm db:seed` — applies the schema and runs the deterministic seed (two orgs, 4 users, 40 customers, ~600 invoices with line items).
6. `pnpm dev` — expected result: `/invoices` renders the seeded list (read path inherited from chapter 041). Clicking "New invoice" reaches a form that is still a stub (just a heading) because the form components are TODOs — that is the runnable starting point.

Env var list: render as a short table or inline list inside the setup section — `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (local Docker Postgres connection strings; both supplied in `.env.example`) and `SEED` (integer seeding the deterministic PRNG, default `1`). No values to obtain externally — all come from `.env.example`.

Use `Code` for each command block. No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` here — there is no code to dissect in an overview, only commands and a file tree. The lesson ends when the starter runs locally; technology rationale stays in the build lessons.

## Scope

- **No feature implementation.** Every Server Action, schema, and form component is a TODO built in lessons 2–6; this lesson only orients and runs the starter. → owning lessons: 2 (create), 3 (edit), 4 (delete), 5 (optimistic), 6 (transactional).
- **No technology rationale.** Why `createInsertSchema`, why `safeParse` over `parse`, why uncontrolled inputs — all deferred to the build lessons and their referenced regular lessons (chapters 042–044). This lesson names the shape, not the reasoning.
- **No auth/session teaching.** The auth stub is named, not explained; real Better Auth + `authedAction` land in Units 8–9 (chapters 051–057).
- **No data-layer teaching.** Schema, relations, seed, and read queries are carried in from the chapter 041 project (Unit 5) and only referenced here.
