# Chapter 100 — Lesson 1 outline

## Lesson title

- **Full title:** Project overview
- **Sidebar title:** Project overview

The chapter-outline title fits the contract (the first project lesson is always "Project Overview"); keep it. Sentence case per house style.

## Lesson type

`Project overview`

The first project lesson. No feature built; the test-coder does **not** run for this lesson. Writer renders the Project-overview section list from the contract.

## Lesson framing

The student walks away having internalized what the whole chapter is for: taking the invoices app they built across the course and shipping it to a live production URL on Vercel, then evolving a real schema anti-pattern (`total numeric(12,2) NOT NULL`, a single combined money column with no subtotal/tax breakdown) into separate `subtotal` + `tax` columns through three reviewed PRs — without a single moment where the running app and the live schema are incompatible. The senior payoff installed here is the mental model that frames every later lesson: the git push is the deploy, the preview branch is the rehearsal stage, destructive change is forward-only across three deploys minimum, production keeps working between PRs, and rollback is a rehearsed recovery primitive, not an apology. The lesson is done when the starter runs locally against docker postgres — no account provisioning, no deploy yet.

## Codebase state

Not applicable — this is the first lesson. Entry state is the clean starter; exit state is the same starter running locally. No code is written.

## Lesson sections

Follow the Project-overview section list exactly, in order. Keep prose terse and adult; no celebratory tone.

### What we're building (intro, no header)

Lift the four-sentence framing from the chapter outline's Lesson 1 opening (the invoices app → live URL → the `total` anti-pattern the project fixes → the end state: live `*.vercel.app`, `total` split across three PRs with no incompatibility window, rehearsed rollback runbook). One paragraph.

Then a single `Figure` with the finished-app screenshots described in the outline: the production `/invoices` surface beside the `/inspector` panel showing `subtotal NOT NULL`, `tax NOT NULL`, no `total`, split-coverage 100%, and the Vercel dashboard listing four production deployments (first deploy + three PRs). Use `Screenshot` inside `Figure`; if multiple frames, wrap in `TabbedContent`. (Screenshots produced downstream — brief the shot list, don't fabricate.)

### What we'll practice (h2)

The five bullets from the chapter outline, framed as skills the student develops (not features):
1. Shipping a green repo to a live production URL where the git push is the deploy and production is an alias over an immutable deployment.
2. Running a destructive schema change as the expand-migrate-contract cadence (additive expand → app-layer dual-write + backfill + dual-read → contract) so the live app and live schema are never incompatible.
3. Rehearsing each migration on a copy-on-write Neon preview branch before merge, reading the build-time migration log every time.
4. Rehearsing the two-layer production rollback and internalizing why an alias re-point does not undo a forward-only migration.
5. Verifying the launch checklist holds at the live URL.

Plain prose intro + bulleted list. No deep explanation — these are owned by the lessons that build them.

### Architecture (h2)

Shape only — name the moving parts, do not teach the mechanics (those belong to lessons 2–6). Render the six architecture bullets from the chapter outline as a labeled list:
- **The git push is the deploy** — every PR commit → preview deployment on its own Neon branch off `main`; every merge to `main` → production deployment against the production DB. No human clicks "deploy."
- **The preview branch is the rehearsal stage** — `pnpm db:migrate` runs in the build command against the PR's Neon branch; build fails if the migration fails; merge only after the rehearsal checklist is green.
- **Forward-only, three deploys minimum** for the destructive change — expand (coexist) → migrate (dual-write keeps both populated) → contract (drop when nothing reads it).
- **Between PRs, production keeps working** — the load-bearing invariant; each production deploy verified against the in-flight schema before the next PR lands.
- **Rollback is the recovery primitive, not the apology** — instant alias re-point + `git revert`, rehearsed against the contract PR.
- **The inspector** (`/inspector`, provided in full) — the read-only observability surface: schema-state probe, split-coverage and dual-write panels, data-integrity diff, deployment-environment + build-source indicators.

**Optional diagram (recommended):** a left-to-right flow of the deploy pipeline — `git push (PR branch)` → `preview deployment` (on `Neon branch off main`, with the `pnpm db:migrate && next build` step labeled) → `green CI + rehearsal checklist` → `merge to main` → `production deployment` (against `Neon main branch`). This carries the "push is the deploy / preview is the rehearsal" thread better than prose. Use Mermaid `flowchart LR` (dataflow shape, AI-authorable, horizontal) or D2 `direction: right`, wrapped in `Figure`. Keep it to the pipeline only — do not diagram the schema cadence here (lessons 3–5 own it). Skip the diagram if it would just restate the list.

### Starting file tree (h2)

Use `FileTree`. Annotate the top-level layout from the chapter outline's "Starter file tree (stubs marked TODO)". Per the contract: comment one line each only on files changed from the chapter 062 starter or that later lessons touch; leave the rest uncommented. Mark the TODO/FOCUS files as the highlighted focus.

The focus files the student fills across PRs 1–3 + rollback (everything else, including the chapter 062 surface, Better Auth flow, CI workflow, env validator, and the inspector, ships provided):
- `src/db/schema.ts` (TODO L3/L4/L5 markers — the money column shape)
- `src/lib/invoices/queries.ts` (TODO L4 dual-read coalesce, L5 drop total)
- `src/lib/invoices/actions.ts` (TODO L4 dual-write, L5 contract)
- `src/lib/invoices/money.ts` (created in PR 2)
- `src/app/(protected)/invoices/[id]/edit/edit-form.tsx` (TODO L4 split inputs, L5 retire combined)
- `src/app/(protected)/invoices/[id]/edit/conflict-banner.tsx` + `table.tsx` (render the money shape)
- `scripts/backfill_subtotal_tax.ts` (filled in PR 2)
- `docs/runbooks/` — `launch-checklist.md`, `migration-subtotal-tax.md`, `rollback.md` (stubs the student fills)

Add the one-line note from the chapter outline: the student writes **no** inspector code. Keep the tree to the meaningful top-level + focus depth; do not reproduce the full solution tree.

### Roadmap (h2)

`CardGrid` with one `Card` per remaining lesson (2–6), each with lesson number + title + one sentence naming what it adds. Lift verbatim from the chapter outline's Roadmap CardGrid:
- **Lesson 2 — From green repo to a live production URL** — wires Vercel, Neon, env validation, preview deployment protection, and the launch checklist on the starter to produce the production URL the rest of the chapter targets.
- **Lesson 3 — PR 1 (Expand): add the nullable subtotal and tax columns** — ships an additive-only migration adding `subtotal`/`tax` as nullable columns and verifies the unchanged app stays healthy against the expanded schema.
- **Lesson 4 — PR 2 (Migrate): dual-write, backfill, dual-read** — lands the dual-write in actions, the `coalesce` fall-through in queries, the bounded-idempotent backfill, and the `NOT NULL` promotion while production keeps serving.
- **Lesson 5 — PR 3 (Contract): drop the old column, promote the new pair** — drops `total`, removes every legacy reference, and lands production on the target schema with the cadence's safety claims intact.
- **Lesson 6 — Rollback rehearsal and the schema caveat** — promotes the previous deployment against the contract PR to make the "alias rollback does not undo migrations" caveat concrete, then writes the durable runbook.

### Setup (h2)

`Steps` component. The chapter outline gives the exact sequence; reconcile with the contract's mandated first step.

**Contract requirement:** the first step must read "Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 100/start/`." The chapter outline's draft uses a `degit` placeholder — replace it with the contract's canonical first step + repo link and `Chapter 100/start/` path. (Flag for writer: prefer the contract wording over the outline's `degit <starter-repo>` placeholder.)

Steps, in order:
1. Get the starter from the project repository under `Chapter 100/start/`.
2. `pnpm install`.
3. Bring up local postgres and seed:
   ```sh
   docker compose up -d          # Postgres 18
   cp .env.example .env          # placeholders valid for local dev
   pnpm db:migrate && pnpm db:seed
   pnpm dev
   ```

Use `Code` for the command blocks (simple, no per-line focus needed).

**Env vars:** `.env.example` carries every key with valid local placeholders. State that real production/preview values are set in lesson 2 (not here). Name the local-dev keys per the outline — `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (docker postgres), dev-mode `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `SENTRY_DSN`, `APP_URL`, plus the `NEXT_PUBLIC_*` pair — and note none need an external account to run locally.

**Expected result (contract requires a success sentence):** `pnpm dev` serves the app at `http://localhost:3000`. Sign in as a seeded user — the seed creates two orgs and five users (e.g. `alice@acme.test`, an Acme admin), all with password `inspector-password-12`. The invoices surface lives at `/invoices`, the inspector at `/inspector`, both reading the seeded `total` column. No feature is built and nothing is deployed yet.

Note for writer: technology rationale (why Vercel, why Neon, why the cadence) does **not** belong here — it was taught in chapters 096–099 and is reinforced in lessons 2–6. The overview ends when the starter runs locally.

## Scope

- **Account provisioning + the first production deploy** (Vercel project, Neon project, env scoping, preview deployment protection, launch-checklist walk) — lesson 2.
- **The expand migration** (nullable `subtotal`/`tax`) — lesson 3.
- **Dual-write / dual-read / backfill / `NOT NULL` promotion** — lesson 4.
- **The contract drop of `total`** — lesson 5.
- **Rollback rehearsal + the alias-doesn't-undo-schema caveat + durable runbook** — lesson 6.
- **Custom domain swap** — deliberately out of scope for the whole chapter; the `*.vercel.app` URL is production here (domain swap was lesson 4 of chapter 098).
- **Why this stack / why expand-migrate-contract** — taught in chapters 096–099, not re-explained in this project.
