# Lesson 1 — Project overview

## Lesson title

Chapter-outline title ("Project Overview") fits — it is the contract-mandated title for the first project lesson. Use sentence case: **Project overview**.

- Sidebar (short): `Project overview`

## Lesson type

`Project overview` — first project lesson. No feature built; the student leaves with the starter running locally (Postgres + seed + Trigger.dev worker + Next dev server), with the three task files and `startExport` action still stubbed.

## Lesson framing

The student walks away with a working durable-job harness running on their machine and a mental model of the canonical Trigger.dev SaaS shape they will build over the next three lessons: a Server Action fires a `schemaTask` fire-and-forget and returns immediately, the task runs on a predeclared per-tenant queue, every step is a durable `triggerAndWait` checkpoint, and live progress streams back to a watching client through `run.metadata`. The senior payoff is recognizing that the export's whole architecture — boundary validation, per-tenant back-pressure, step-level durability, idempotent side effects, live progress — is decided by where each primitive sits, before any body code is written. This lesson installs the map and the running environment; it builds nothing.

## Codebase state

First lesson — no Entry/Exit pair. The starter and solution share an identical file tree (no files added or removed). On exit the student has the full Better Auth + Drizzle + Trigger.dev app running locally, with the four focus files still shipped as stubs (`trigger/export-invoices.ts` has a placeholder body; `paginate-page.ts` and `send-export-email.ts` throw `not implemented`; `src/lib/exports/start.ts` returns `err('internal', 'Not implemented')`). Clicking Export surfaces that error — that is Lesson 2's starting point.

## Lesson sections

Follow the Project overview section list exactly: *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. Source the content from the chapter outline's Lesson 1 section; do not invent scope.

### What we're building (intro, no header)

One paragraph: a durable, paginated CSV export of an org's invoices, fired from a Server Action and built on Trigger.dev v4. State the finished behavior in user terms — clicking "Export invoices" in the inspector kicks off a run that drives the count→loop→email machinery to completion, is resumable across a parent retry, serializes per org while parallelizing across orgs, and ends with an `ExportReadyEmail` in the student's inbox, all visible in the inspector's run panel and the Trigger.dev dashboard.

Then the finished-app figure: the inspector showing a completed run — progress bar full, the `export.invoices.completed` audit-log row, the rendered `downloadUrl`, the email arrived. Use `Screenshot` inside a `Figure` (single still is sufficient; the chapter outline mentions an animated capture as a nicety, but a single screenshot satisfies the contract — leave the capture to the resourcer if assets exist). Do not add technology rationale here — that lives in the regular Unit 12 lessons.

### What we'll practice

Skills bullet list (use prose-led bullets, the five from the chapter outline, framed as developing skills not tasks):

1. Modeling a long-running job as a Trigger.dev `schemaTask` fired fire-and-forget from a Server Action that returns immediately.
2. Designing for durability — placing checkpoints at step boundaries so a killed worker resumes instead of restarting.
3. Reasoning about multi-tenant back-pressure with a predeclared queue and per-tenant `concurrencyKey` lanes.
4. Guarding side effects (a duplicate trigger, a re-sent email) with idempotency keys at two different scopes.
5. Streaming live progress from a worker to a watching client through `run.metadata`.

### Architecture

Shape only, end to end. Brief a system/flow diagram here — the request path crosses the app boundary into the Trigger.dev worker and a poll loop reads run state back, which prose carries poorly. Use a **D2 system-architecture diagram** (top pick for services + traffic) inside a `Figure`, horizontal layout, capped height. Nodes and edges:

- Inspector (Server Component) → calls `startExport` (Server Action).
- `startExport` → fires `exportInvoices` fire-and-forget via `tasks.trigger`, writes an `exports` row, returns `runId` immediately.
- `exportInvoices` (parent task) → runs on the predeclared `export` queue in this org's `concurrencyKey` lane at concurrency 1; counts pages, then loops, awaiting one `paginatePage` child per page through `triggerAndWait`, accumulating CSV.
- After the loop → awaits `sendExportEmail` child, then updates the `exports` row + writes the audit log in one tenant transaction.
- Inspector → polls `GET /api/exports/[runId]`, which reads run state structurally from the Trigger.dev REST API (`retrieveRun`): `status`, `attemptCount`, and `pagesDone / pagesTotal` carried on `metadata`.

Mark the boundary clearly: the app (left) fires and polls; the Trigger.dev worker (right) executes. Keep it labels-only — no code in the diagram.

### Starting file tree

Use `FileTree`. Render the annotated top-level layout from the chapter outline's "Starter file tree" — comment one line each only on files lessons will touch or that changed from the previous project; leave the rest uncommented. Highlight the four focus files as the student's work:

- `trigger/export-invoices.ts` — module-scope `queue()` + the parent `schemaTask` body (focus)
- `trigger/paginate-page.ts` — child task: one page → CSV fragment (focus)
- `trigger/send-export-email.ts` — child task: recipient lookup + render + `sendEmail` (focus)
- `src/lib/exports/start.ts` — `startExport` action → `tasks.trigger` (focus)

After the tree, one short paragraph naming the pieces the student leans on most (each explained in the Implementation lesson that first touches it): `src/lib/email.ts`, `src/db/queries/invoices.ts` (`listInvoices`/`countInvoices`), `src/lib/exports/to-csv.ts`, `src/emails/ExportReadyEmail.tsx`, `src/lib/trigger-client.ts`, the inspector page, and the `exports` table in `src/db/schema.ts`. One sentence on the `exports` table's columns and its role: app-side audit + dedup, with Trigger.dev's run record as the operational truth. Do not re-explain provided infrastructure here.

### Roadmap

`CardGrid` with one `Card` per implementation lesson (3 cards). Lesson number + title + one sentence on what it adds (verbatim intent from the chapter outline):

- **Lesson 2 — The task boundary.** Confirm the shipped `exportInvoices` schemaTask boundary (Zod payload + predeclared queue), then write the `startExport` action that fires it with `concurrencyKey: orgId` and a daily idempotency key.
- **Lesson 3 — One checkpoint per page.** Spawn each page as a durable `paginatePage` child run, drive the progress bar through `metadata`, and abort permanently on an empty resultset.
- **Lesson 4 — Send the email, write the audit log.** Add the `sendExportEmail` child guarded by a per-run key, then close the run by updating the `exports` row and writing the audit log in one transaction.

### Setup

Use `Steps`. Source the exact sequence from the chapter outline. Each step: command(s) + expected outcome. First step must be the contract-mandated repo line.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 067/start/`. Expected: the file tree above (four student files ship as stubs; everything else complete).
2. `pnpm install`. Expected: clean install (repo enforces pnpm via `only-allow`).
3. `cp .env.example .env`, fill secrets, then `docker compose up -d` — Postgres 18 from `docker-compose.yml`. Expected: container reports healthy.
4. `pnpm db:migrate && pnpm db:seed` — apply schema, seed 4 orgs (three with 200–240 invoices, plus empty `org_empty`) and 6 users with fixed base62 ids. Expected: seed completes; it truncates and re-inserts deterministically (`runSeed`), so re-running is safe; Trigger.dev run history is separate and unaffected.
5. Create a Trigger.dev account, then `npx trigger.dev@latest init` in the project folder — interactive flow writes the `trigger.config.ts` defaults, registers `dirs: ['./trigger']`, prints the project ref. The starter already ships a matching `trigger.config.ts`.
6. Paste `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` into `.env`. From the dashboard for the project just created; the secret key is per-environment (use the dev key).
7. `pnpm trigger:dev` in one terminal — the local worker. Expected: prints the dashboard URL and shows "Waiting for tasks". Open the dashboard once to confirm zero runs.
8. `pnpm dev` in a second terminal — the app. Expected: `/inspector` renders behind the auth guard with the Export buttons.

Env var list (name / purpose / how to obtain) — render as a small table or definition list, not prose:

- `TRIGGER_SECRET_KEY` (`tr_…`, validated `startsWith 'tr_'`) — authenticates the worker and REST reads; from the Trigger.dev dashboard, per environment.
- `TRIGGER_PROJECT_REF` (`proj_…`, validated `startsWith 'proj_'`) — identifies the linked project; from the dashboard.
- `APP_URL` — app base URL; `http://localhost:3000` locally.
- Carried over (already in `.env.example`): `DATABASE_URL`(+`_UNPOOLED`), `RESEND_API_KEY`, `EMAIL_FROM`/`EMAIL_REPLY_TO`, `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `INVITATION_SIGNING_SECRET`, `NEXT_PUBLIC_APP_NAME`/`NEXT_PUBLIC_APP_URL`.

Close with an `Aside` (note): the Trigger.dev free tier covers everything this chapter runs, so the kill/retry drills won't hit a cap. Then the success state in one line: the inspector shows the Export buttons and the worker shows "Waiting for tasks"; clicking Export returns an error because `startExport` still returns `err('internal', 'Not implemented')` — that is the next lesson. Note that local dev needs two terminals (worker + app); without the worker, tasks queue forever.

Code-component guidance for this lesson: commands → `Code` (bash). File tree → `FileTree`. Env vars → table. Roadmap → `CardGrid`/`Card`. Finished-app shot → `Screenshot` in `Figure`. Architecture → D2 in `Figure`. No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` — there is no teaching code in an overview, and no inline exercises (project lessons have none).

## Scope

- No feature implementation — the `startExport` action and the three task bodies are Lessons 2–4; this lesson stops when the starter runs locally and Export surfaces the "Not implemented" error.
- No technology rationale (why Trigger.dev, what `schemaTask`/queues/idempotency keys mean) — owned by the Unit 12 teaching lessons (Chapter 066, lessons 3–7); reference, do not re-explain.
- No R2 upload, no scheduled exports, no rate limit, no failure-email path — forward references to Chapters 069, 14, 15b, and Unit 13 respectively; out of scope for the entire chapter, not just this lesson.
- The provided infrastructure (tenant db, audit log, Resend adapter, inspector internals, REST client) is explained in the Implementation lesson that first touches it, not catalogued here.
