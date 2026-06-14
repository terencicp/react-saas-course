# Chapter 100 — Project: ship to production, then live-migrate the schema

## Chapter framing

Chapter 100 cashes in Unit 20 as one runnable shipping discipline. chapter 096's small reviewable PRs, chapter 097's CI gate, chapter 098's Vercel + Neon preview-per-PR + instant rollback, and chapter 099's expand-migrate-contract cadence all converge here. The student takes the course's invoices project (the chapter 062 surface — URL-state list, soft-delete, `version` concurrency, now sitting behind a Better Auth email+password sign-in / sign-up / org-onboarding flow) and ships it to a real production URL on Vercel against a Neon-branched preview workflow, then executes one cadence-class migration end-to-end across three reviewed PRs: splitting `invoices.total numeric(12,2) NOT NULL` into separate `invoices.subtotal numeric(12,2) NOT NULL` + `invoices.tax numeric(12,2) NOT NULL` columns. The cadence spans four migrations (`0005_expand_subtotal_tax`, `0006_set_subtotal_tax_not_null`, `0007_contract_total`) plus a by-hand backfill script (`pnpm db:backfill`) run between them. Every PR is green-in-CI before merge, every PR is rehearsed against its own copy-on-write Neon branch before merge, and at no point between PRs is the running production app incompatible with the live schema. The chapter closes by rehearsing the production rollback path (instant alias re-point plus `git revert`) against the contract PR — not to undo the migration but to prove the student knows the gesture before they need it at 2 AM.

Threads that run through every lesson. **The git push is the deploy** — every PR's commit produces a preview deployment on a Neon branch off `main`; every merge to `main` produces a production deployment against the production database; no human clicks "deploy." **The preview branch is the rehearsal stage** — `pnpm db:migrate` runs in the build command against the preview branch, the build fails if the migration fails, the preview URL exercises the new code against production-shaped data; merge happens only after the rehearsal checklist is green. **Forward-only migrations, three deploys minimum** for the destructive change — old and new shapes coexist in expand; app-layer dual-write keeps both populated in migrate; contract drops the old shape only when nothing reads it. **Between PRs, production keeps working** — the load-bearing observation of the entire chapter; the verify steps after PRs 1 and 2 explicitly check production traffic against the in-flight schema. **Rollback is the recovery primitive, not the apology** — the student rehearses an instant-rollback-plus-revert on the contract PR as the closing exercise, learning the gesture before an incident demands it.

### Project goals

The project is complete when every one of these deployment invariants holds, each confirmable through the Vercel dashboard, the repo history, and the provided inspector:

- A live production `*.vercel.app` URL serves the app, and the inspector's schema-state probe shows `subtotal numeric NOT NULL` and `tax numeric NOT NULL` with no `total` column.
- The split ran as three merged PRs in order — expand (`0005_expand_subtotal_tax`, additive migration only, no app code), migrate (dual-write + dual-read + the by-hand `pnpm db:backfill` script + a follow-up `0006_set_subtotal_tax_not_null` migration), contract (`0007_contract_total` `DROP COLUMN` + app cleanup) — each with its own merge commit on `main`.
- Every PR was green across all CI checks (typecheck / lint / test / build, plus the `audit` and `actionlint` supplementary jobs) and `vercel-build` before a green-only merge, and each PR's preview deployment ran `pnpm db:migrate && next build` against its own Neon branch with the rehearsal checklist applied.
- The Vercel dashboard shows four production deployments (first deploy plus the three PRs), each prod deployment's commit SHA matching its merge commit, plus the preview deployment that preceded each merge.
- At no point was the running app incompatible with the live schema: after PR 1 merges, production reads `total` while nullable `subtotal`/`tax` sit unread; after PR 2 merges, production dual-writes all three columns and reads via `coalesce`, the backfill brings split-coverage to 100%, and the data-integrity diff stays at zero rows; after PR 3 merges, production reads the new pair directly. Each transition is verified against live production with Sentry quiet.
- The contract PR's rollback is documented in `docs/runbooks/rollback.md` (provided as a stub with the bolded caveat and the four section headers; the student fills the gesture) and rehearsed: promoting the previous (post-PR-2) deployment, verifying the alias swap via `curl -sI` and `x-vercel-id`, observing that the alias re-point does not undo the forward-only migration, then re-promoting the contract deployment and re-enabling auto-assignment.
- The launch checklist's eight rows are filled in `docs/runbooks/launch-checklist.md` and green at the URL: env validator green in prod build logs, `/api/health` returns `{ ok: true, db: 'up' }`, Sentry received the deliberate test error (the inspector's "Trigger test error" button), `main` is branch-protected, the four-job CI gate is green on the PR, the Neon-branch-per-PR rehearsal ran, the production alias is confirmed via `curl -sI` / `x-vercel-id`, and the rollback rehearsal is recorded.

### Dependency carry-in

- **From chapter 062 (the project starter):** the full chapter 062 surface, re-expressed here — `src/app/(protected)/invoices/page.tsx` with URL-state filter/sort/search/cursor through `nuqs`, the `scopedInvoices(orgId).active() / .archived() / .includingDeleted()` SQL-predicate helper, the `version`-precondition `updateInvoice` action with honest-409 Result (and an admin-only `overwrite` escape hatch), the soft-delete / archive / restore actions, the `createInvoice` action with optimistic archive in the table, and the inspector page (`/inspector`). The surface now sits behind a Better Auth email+password sign-in / sign-up / org-onboarding flow (`src/app/(auth)/`, `src/app/onboarding/`) gated by `src/proxy.ts` (a cookie-presence middleware, not a noop). The schema ships with `invoices.total numeric(12,2) NOT NULL` as a single combined amount column — no `subtotal` or `tax` breakdown — which is the shape the cadence will evolve into separate `subtotal` + `tax` columns so the application can finally compute and display tax distinctly from the line subtotal.
- **From chapter 096:** small reviewable PRs, branch-protected `main` (no direct pushes), `git revert` as the code-side undo.
- **From chapter 097:** the four-job CI workflow (`typecheck`, `lint`, `test`, `build`) running on every PR; `audit` (`pnpm audit --audit-level=high`) and `actionlint` as supplementary jobs; `concurrency` cancel-in-progress; `SKIP_ENV_VALIDATION=1` in the typecheck/lint/test jobs only — the `build` job runs the env validator for real with inline placeholder vars.
- **From lesson 1 of chapter 098:** the deployment model — every push creates an immutable deployment, production is an alias.
- **From lesson 2 of chapter 098:** the "Import Git Repository" flow, the first `*.vercel.app` URL, `vercel link` + `vercel env pull`, `packageManager: pnpm@11.x` in `package.json`.
- **From lesson 3 of chapter 098:** Node.js runtime as the default, single function region matching the Neon region (`iad1` for the course default), Fluid Compute on with its automatic concurrency model (no manual `maxConcurrency` knob) for this project.
- **From lesson 5 of chapter 098:** the Native Vercel Integration with Neon installed; `DATABASE_URL` injected per preview deployment as a managed var; Vercel Authentication (Deployment Protection) on for previews — free on Pro, no add-on; the build command overridden to `pnpm db:migrate && next build` so every preview's branch gets the PR's migration before the app boots.
- **From lesson 6 of chapter 098:** three environments (Production / Preview / Development); env validator (`@t3-oss/env-nextjs`) failing builds on missing required vars; `SKIP_ENV_VALIDATION` never set in production; no `NEXT_PUBLIC_*` on a secret.
- **From lesson 7 of chapter 098:** the two-layer rollback — Vercel alias re-point (instant), `git revert` on `main` (durable); rollback doesn't undo migrations.
- **From lesson 8 of chapter 098:** the launch-checklist discipline applied to this project's eight rows — env validator green, `/api/health` returns `{ ok: true, db: 'up' }`, Sentry wired (the inspector's `triggerTestError` button), branch-protected `main`, the four-job CI gate, Neon-branch-per-PR rehearsal, the production alias confirmed by `curl -sI` / `x-vercel-id`, and the rollback rehearsal. (No rate-limit / security-header / backup / uptime code ships in this project's repo; those rows are out of scope here.)
- **From lesson 1 of chapter 099:** the expand-migrate-contract cadence as application-layer choreography — dual-write inside the server action, bounded-batched-idempotent backfill, dual-read with `coalesce` fall-through; forward-only.
- **From lesson 2 of chapter 099:** the trigger map placing "splitting one column into two and dropping the original" squarely in the three-deploy list.
- **From lesson 3 of chapter 099:** the rehearsal checklist — migration applied, completed in reasonable time, app works against the new schema, old shape still works where it should; the dual-write verification via direct SQL on the preview branch.
- **From chapter 056 / chapter 057 / chapter 043:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, `logAudit(tx, event)`, the canonical Result shape.
- **From chapter 040:** Drizzle Kit `generate` / `migrate` (via `pnpm db:generate` / `pnpm db:migrate`); the `__drizzle_migrations` ledger; statement-breakpoint comments. The starter ships migrations `0000`–`0004` (auth, app role, audit logs, RLS, invoices baseline); the cadence adds `0005`–`0007`.

### Starter file tree (stubs marked TODO)

```
.github/
  workflows/ci.yml                # provided: typecheck/lint/test/build + audit + actionlint (chapter 097)
  dependabot.yml                  # provided
docker-compose.yml                # provided: local postgres:18 for development env only
drizzle.config.ts                 # provided: three-file schema array, casing snake_case, reads DATABASE_URL_UNPOOLED
next.config.ts                    # provided: cacheComponents, typedRoutes, reactCompiler, turbopack
.env.example                      # provided: every key present, valid local placeholders
package.json                      # provided: packageManager pnpm@11; scripts db:migrate, db:seed, db:backfill, dev,
                                  #           build, test, test:lesson, db:studio, auth:generate
                                  #           BUILD command overridden in Vercel UI: pnpm db:migrate && next build
README.md                         # provided: setup, deploy, the three-PR migration plan
src/
  env.ts                          # provided: @t3-oss/env-nextjs; required DATABASE_URL, DATABASE_URL_UNPOOLED,
                                  #           BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, SENTRY_DSN, APP_URL,
                                  #           NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL
  proxy.ts                        # provided: Better Auth cookie-presence guard for /dashboard /invoices /inspector + auth pages
  db/
    schema.ts                     # FOCUS: invoices.total numeric(12,2) NOT NULL only; TODO(L3/L4/L5) markers
    schema/auth.ts                # provided: Better Auth generated tables (user/session/account/organization/member/...)
    index.ts                      # provided: drizzle client; db + dbUnpooled exports; Transaction type
    audit.ts / audit-log.ts       # provided: audit_logs table + RLS, logAudit(tx, event) helper
    relations.ts / tenant.ts      # provided: invoices→organization relation; withTenant + tenantDb facade
    columns.ts                    # provided: timestamps column group
    queries/members.ts queries/audit.ts  # provided
  lib/
    auth.ts / auth-client.ts / auth-schema.config.ts  # provided: betterAuth instance + client + CLI mirror
    result.ts / redirects.ts / utils.ts                # provided
    auth/authed-action.ts auth/roles.ts auth/error-mapping.ts  # provided
    invoices/
      queries.ts                  # FOCUS: reads total; TODO(L4) dual-read coalesce, TODO(L5) drop total
      actions.ts                  # FOCUS: writes total; TODO(L4) dual-write, TODO(L5) contract
      money.ts                    # SOLUTION-ONLY: combinedAmount({subtotal,tax}); student creates in PR 2
      scoped-query.ts             # provided: scopedInvoices(orgId), activeFilter/archivedFilter
      search-params.ts            # provided: nuqs invoiceListSearchParams(Cache)
  app/
    layout.tsx page.tsx globals.css _components/   # provided
    (auth)/sign-in/ (auth)/sign-up/ onboarding/create-org/  # provided: Better Auth flow
    (protected)/layout.tsx dashboard/ sign-out-action.ts    # provided
    (protected)/invoices/page.tsx + sub-components          # provided; table.tsx/edit-form.tsx/conflict-banner.tsx FOCUS
    (protected)/invoices/[id]/edit/                         # provided; edit-form + conflict-banner read the money shape
    (protected)/inspector/                                  # provided in full: page.tsx, _data.ts, actions.ts, _components/
    api/health/route.ts api/auth/[...all]/route.ts          # provided: db ping, Better Auth catch-all
  components/ui/                   # provided: shadcn components
scripts/
  seed.ts                         # provided: 2 orgs, 5 users, ~60 invoices (subtotal/tax populated in solution; total in start)
  backfill_subtotal_tax.ts        # FOCUS in PR 2: bounded-batched-idempotent backfill (subtotal = total, tax = '0')
  test-lesson.mjs                 # provided: runs a single tests/lessons/Lesson N.test.ts
drizzle/                          # provided: migrations 0000–0004 (auth/role/audit/rls/invoices) + meta
docs/runbooks/                    # provided as stubs: launch-checklist.md, migration-subtotal-tax.md, rollback.md
tests/lessons/Lesson 2..6.test.ts # provided: describe.todo skeletons
```

### Reference solution signatures lessons display

- **Vercel project config:** GitHub App scoped to the single repo; Production Branch `main`; Function Region matches Neon region; Node.js runtime; Fluid Compute on; Build Command `pnpm db:migrate && next build`; Install Command `pnpm install`; Output Directory `.next`; Vercel Authentication (Deployment Protection) on for previews (free on Pro, no add-on).
- **Neon integration:** Vercel Marketplace → Neon (Neon-Managed) → Install → select project. Production `DATABASE_URL` and `DATABASE_URL_UNPOOLED` point at the Neon `main` branch's pooled and unpooled endpoints respectively. Preview's `DATABASE_URL` is managed by the integration (one branch per PR, off `main`).
- **Environment variable scoping:**
  - Production: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` (live), `SENTRY_DSN`, `APP_URL` (the custom domain or `*.vercel.app`).
  - Preview: same shape, `DATABASE_URL` managed by Neon integration, all other secrets are the *test* / dev versions.
  - Development: `vercel env pull .env.local` syncs Development scope; local docker postgres optional alternative.
- **Expand PR's migration (`drizzle/0005_expand_subtotal_tax.sql`):**
  ```
  ALTER TABLE "invoices" ADD COLUMN "subtotal" numeric(12, 2);--> statement-breakpoint
  ALTER TABLE "invoices" ADD COLUMN "tax" numeric(12, 2);
  ```
- **Migrate PR's app changes (`src/lib/invoices/actions.ts` excerpt):** `createInvoice` and `updateInvoice` accept `subtotal` and `tax` in their Zod input and write `total = subtotal + tax` (transitional dual-write so older clients still observe the populated `total` column). The Drizzle write carries all three columns in the same `.values({...})` / `.set({...})` call. Money stays a `string` end to end (Drizzle maps `numeric` to `string`); `total` is computed with the integer-cents `combinedAmount` helper, never float `+`.
- **Migrate PR's money helper (`src/lib/invoices/money.ts`, created in PR 2):** `combinedAmount({ subtotal, tax }: { subtotal: string; tax: string }): string` — integer-cents addition returning a `toFixed(2)` string, no float drift. Replaces the raw `row.total` reads in `table.tsx` and `conflict-banner.tsx`.
- **Migrate PR's backfill (`scripts/backfill_subtotal_tax.ts`, run via `pnpm db:backfill`):**
  ```
  // exports runBackfill(); loops: select up to 1000 ids WHERE subtotal IS NULL;
  //   update set subtotal = total, tax = '0' where id = any(...) and subtotal is null;
  //   until a pass touches no rows.
  // idempotent via the WHERE subtotal IS NULL guard; runs on dbUnpooled.
  // run against the production unpooled connection AFTER PR 2 merges.
  ```
- **Migrate PR's query change (`src/lib/invoices/queries.ts` excerpt):** `listInvoices` and `getInvoiceDetail` surface `subtotal` and `tax` fields resolved via `coalesce(invoices.subtotal, invoices.total)` and `coalesce(invoices.tax, 0)` — the dual-read fall-through — while `total` stays available; the `-total`/`total` sorts order on the combined expression. (In the contracted solution the `total` field is gone and the sort uses `sql\`(${invoices.subtotal} + ${invoices.tax})\``.)
- **Migrate PR's validation step (`drizzle/0006_set_subtotal_tax_not_null.sql`):**
  ```
  ALTER TABLE "invoices" ALTER COLUMN "subtotal" SET NOT NULL;--> statement-breakpoint
  ALTER TABLE "invoices" ALTER COLUMN "tax" SET NOT NULL;
  ```
  Shipped after the backfill completes; the `SET NOT NULL` scan confirms no remaining nulls — fast because the backfill already populated every row.
- **Contract PR's migration (`drizzle/0007_contract_total.sql`):**
  ```
  ALTER TABLE "invoices" DROP COLUMN "total";
  ```
- **Contract PR's app changes:** every reference to `total` removed from `actions.ts`, `queries.ts`, `schema.ts` (and the `InvoiceRow.total` field). Drizzle's typed query builder fails the build if any typed reference survives; the inspector's raw-SQL probes are unaffected because they reference columns by SQL literal, not the typed builder. The `coalesce` fall-through is removed; queries return `subtotal` and `tax` directly, and any combined-amount need is computed via `combinedAmount(...)` at the app layer.
- **Rollback rehearsal artifact:** `docs/runbooks/rollback.md` ships as a stub carrying the bolded "an alias re-point does NOT undo a forward-only migration" caveat plus the four section headers (the four-step alias re-point, the `git revert` follow-up, re-enabling auto-assignment); the student fills the gesture — (1) Vercel dashboard → Deployments → previous green prod → Promote to Production; (2) verify alias swap (`curl -sI https://APP_URL`, check `x-vercel-id`); (3) `git revert <bad-sha>` PR, review, merge; (4) re-enable auto-assignment after smoke-testing.
- **Env entries:** `src/env.ts` validates `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY` (validated-not-used), `SENTRY_DSN`, `APP_URL`, plus the client-exposed `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_URL`. The cadence adds no new env entries.

### Inspector page spec

A single Server Component at `/inspector` (provided in full). Every panel is one `<Suspense>`-wrapped region with a `data-testid`; the student fills no inspector code, only the lib/actions code the panels visualize. Crucially, every probe is a raw `db.execute(sql\`…\`)` against `information_schema` / the `invoices` table by SQL literal — never a typed query referencing `invoices.subtotal/tax/total` — so the same `_data.ts` compiles against both the total-only start schema and the contracted solution schema.

- **Identity banner:** active org name + role, org switcher (seeded orgs the acting user belongs to), and a dev-only acting-user switcher (swaps the resolved identity via the `inspector-acting-user` cookie; production reads the real session). The reset / force-version-drift / "Trigger test error" controls live in a dev-only `DevControls` card lower on the page.
- **Schema-state panel:** runs `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position` and lists each column name + nullable flag. The student watches `subtotal` and `tax` appear in PR 1 (nullable), flip to `NOT NULL` after the validation step in PR 2, and `total` disappear in PR 3.
- **Split-coverage panel:** counts `count(*)`, `count(subtotal)`, and `count(*) FILTER (WHERE subtotal IS NULL)` for the org and shows the populated percentage + remaining-null count; renders "Pre-expand — no subtotal column yet" before the column exists. The migrate PR's backfill is "done" when this reads 100%; the contract PR's safety check is this being 100% before merge.
- **Dual-write panel:** lists the most recent 10 invoices with `subtotal`, `tax`, `total` side by side (defensively selecting only the columns that currently exist). After every mutation in PR 2, all three columns are populated and `subtotal + tax = total` exactly; deviation is a bug.
- **Data-integrity panel:** runs `SELECT id, number FROM invoices WHERE subtotal IS NOT NULL AND tax IS NOT NULL AND (subtotal + tax) <> total` and lists divergent rows. "No divergent rows" is green; once `total` is dropped it renders "n/a — total dropped".
- **Audit tail:** the last 20 `audit_logs` rows for the current org (newest first). Every create/update/archive/restore/delete writes here. The student verifies the migration class doesn't lose audit coverage.
- **Deployment panel:** a `VERCEL_ENV` badge (`production`/`preview`/`development`, falling back to `development` off-Vercel), the build-source line (`VERCEL_GIT_COMMIT_SHA` + `vercel`/`local` source), and a link to `/api/health` (expected `{ ok: true, db: 'up' }`). Verifies which environment and which PR's code is running.

The inspector is provided in full and rendered on every environment; the dev-only controls and acting-user switcher are gated by `NODE_ENV !== 'production'`. In production the page is admin-gated; preview deployments expose it behind Vercel Authentication.

### Concepts demonstrated → owning lesson

- The deployment model, immutable deployments, alias semantics — lesson 1 of chapter 098.
- First deploy mechanics (Import Git Repository, build command override, `vercel link` / `vercel env pull`) — lesson 2 of chapter 098.
- Function region matching Neon region, Node.js runtime default — lesson 3 of chapter 098.
- Native Vercel + Neon integration, per-PR copy-on-write branch, build-time migration step, Vercel Authentication on previews — lesson 5 of chapter 098.
- Three environments + secret scoping + env validator + `SKIP_ENV_VALIDATION` discipline — lesson 6 of chapter 098.
- Two-layer rollback (Vercel alias + `git revert`), auto-assignment-off after rollback, the data-state caveat — lesson 7 of chapter 098.
- Launch checklist's eight rows (env validator, `/api/health`, Sentry test error, branch-protected `main`, the CI gate, Neon-branch-per-PR rehearsal, the production alias, the rollback rehearsal) — lesson 8 of chapter 098.
- Expand-migrate-contract cadence + dual-write + dual-read + bounded-batched-idempotent backfill — lesson 1 of chapter 099.
- Trigger map placement of "splitting one column into two and dropping the original" — lesson 2 of chapter 099.
- Preview-branch rehearsal checklist + split-coverage verification + data-integrity diff — lesson 3 of chapter 099.
- Small reviewable PRs + branch-protected `main` — lesson 3 of chapter 096 + lesson 4 of chapter 096.
- CI baseline (typecheck/lint/test/build) on every PR — lesson 2 of chapter 097.
- `git revert` as code-side undo — lesson 2 of chapter 096.
- `authedAction` + `tenantDb` + `logAudit` — chapter 057 + chapter 056.
- Canonical Result shape on Server Actions — chapter 043.

---

## Lesson 1 — Project Overview

You are taking the invoices app you built across the course and shipping it to a real production URL on Vercel, then evolving its database schema while it stays live.
The starter is the chapter 062 surface — the URL-state invoices list, soft-delete, and `version`-concurrency editing — now behind a Better Auth email+password sign-in / sign-up / org-onboarding flow, wired to deploy on every git push against a Neon branch-per-PR workflow.
Its `invoices` table carries a single combined `total numeric(12,2) NOT NULL` column with no breakdown of subtotal and tax: a real anti-pattern the project exists to fix.
By the end you will have a live `*.vercel.app` URL serving the app, the `total` column split into separate `subtotal` and `tax` columns across three reviewed PRs with no moment where the running app and the live schema were incompatible, and a rehearsed rollback runbook.

*(Figure: the finished `/invoices` production surface beside the `/inspector` panel showing `subtotal NOT NULL`, `tax NOT NULL`, no `total`, split-coverage 100%, and the Vercel dashboard listing four production deployments — the first deploy plus three PRs.)*

### What we'll practice

- Shipping a green repo to a live production URL where the git push is the deploy and production is an alias over an immutable deployment.
- Running a destructive schema change as the expand-migrate-contract cadence — additive expand, app-layer dual-write plus backfill plus dual-read, then contract — so the live app and live schema are never incompatible.
- Rehearsing each migration on a copy-on-write Neon preview branch before merge, reading the build-time migration log every time.
- Rehearsing the two-layer production rollback and internalizing why an alias re-point does not undo a forward-only migration.
- Verifying the launch checklist holds at the live URL.

### Architecture

- **The git push is the deploy.** Every PR's commit produces a preview deployment on its own Neon branch off `main`; every merge to `main` produces a production deployment against the production database. No human clicks "deploy."
- **The preview branch is the rehearsal stage.** `pnpm db:migrate` runs in the build command against the PR's Neon branch; the build fails if the migration fails; the preview URL exercises the new code against production-shaped data. Merge happens only after the rehearsal checklist is green.
- **Forward-only, three deploys minimum** for the destructive change: old and new shapes coexist in expand; app-layer dual-write keeps both populated in migrate; contract drops the old shape only when nothing reads it.
- **Between PRs, production keeps working** — the load-bearing invariant; each PR's production deploy is verified against the in-flight schema before the next PR lands.
- **Rollback is the recovery primitive, not the apology** — an instant alias re-point plus a `git revert`, rehearsed against the contract PR.
- **The inspector** (`/inspector`, provided in full) is the read-only observability surface: schema-state probe, split-coverage and dual-write panels, data-integrity diff, deployment-environment and build-source indicators.

### Starting file tree

The annotated layout lives in the [Chapter framing](#starter-file-tree-stubs-marked-todo) above.
The student writes no inspector code; the focus files are `src/db/schema.ts`, `src/lib/invoices/queries.ts`, `src/lib/invoices/actions.ts`, the new `src/lib/invoices/money.ts`, the edit form / table / conflict-banner that render the money shape, `scripts/backfill_subtotal_tax.ts`, and the three runbooks — filled across PRs 1–3 and the rollback rehearsal.
Everything else, including the chapter 062 surface, the Better Auth flow, CI workflow, env validator, and inspector, ships provided.

### Roadmap

<CardGrid>

<Card title="Lesson 2 — From green repo to a live production URL">
Wires Vercel, Neon, env validation, preview deployment protection, and the launch checklist on the starter to produce the production URL the rest of the chapter targets.
</Card>

<Card title="Lesson 3 — PR 1 (Expand): add the nullable subtotal and tax columns">
Ships an additive-only migration adding `subtotal` and `tax` as nullable columns and verifies the unchanged app stays healthy against the expanded schema.
</Card>

<Card title="Lesson 4 — PR 2 (Migrate): dual-write, backfill, dual-read">
Lands the dual-write in actions, the `coalesce` fall-through in queries, the bounded-idempotent backfill, and the `NOT NULL` promotion while production keeps serving.
</Card>

<Card title="Lesson 5 — PR 3 (Contract): drop the old column, promote the new pair">
Drops `total`, removes every legacy reference, and lands production on the target schema with the cadence's safety claims intact.
</Card>

<Card title="Lesson 6 — Rollback rehearsal and the schema caveat">
Promotes the previous deployment against the contract PR to make the "alias rollback does not undo migrations" caveat concrete, then writes the durable runbook.
</Card>

</CardGrid>

### Setup

This project provisions real Vercel and Neon free-tier accounts in lesson 2; for the overview the student only brings the starter up locally against docker postgres.

<Steps>

1. Clone the starter.

   ```sh
   pnpm dlx degit <starter-repo> invoices-ship && cd invoices-ship
   ```

2. Install dependencies.

   ```sh
   pnpm install
   ```

3. Start local postgres and run the dev server.

   ```sh
   docker compose up -d          # Postgres 18
   cp .env.example .env          # placeholders are valid for local dev
   pnpm db:migrate && pnpm db:seed
   pnpm dev
   ```

</Steps>

Env vars: `.env.example` carries every key with valid local placeholders; the real production and preview values are set in lesson 2.
The local-dev secrets (`DATABASE_URL` / `DATABASE_URL_UNPOOLED` for docker postgres, plus dev-mode `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `SENTRY_DSN`, `APP_URL`, and the `NEXT_PUBLIC_*` pair) need no external account to run locally.

On success `pnpm dev` serves the app at `http://localhost:3000`. Sign in as a seeded user (the seed creates two orgs and five users — e.g. `alice@acme.test`, an Acme admin — all with password `inspector-password-12`), then the invoices surface lives at `/invoices` and the inspector at `/inspector`, both reading the seeded `total` column. No feature is built and nothing is deployed yet.

---

## Lesson 2 — From green repo to a live production URL

This is the heaviest setup of the chapter: a guided, end-to-end wiring of Vercel, Neon, env validation, preview deployment protection, and the launch checklist on the starter.
Chapters 096 through 098 taught each of these moves; here you run them once against this repo to produce the production `*.vercel.app` URL the rest of the chapter targets.
After this lesson every change ships by git push alone.
Work through the steps in order.

### Create the Neon project

1. Create a Neon free-tier project in a single region. The course default is `aws-us-east-1`, which pairs with Vercel's `iad1` function region. The default branch `main` is your production branch.
2. From the project dashboard, copy both the pooled and unpooled connection strings. You set them as production env vars below; the pooled string contains `-pooler` in its host.

### Push to GitHub and protect `main`

3. Push the starter to a fresh private GitHub repo.
4. Set branch protection on `main` (the lesson 4 of chapter 096 ruleset): no direct pushes, require a PR with green CI before merge, require at least one review. In a solo course the review is a self-attestation, but the rule is set — it is what forces the dual-write fix through a PR later instead of a direct push that would defeat the cadence. Turn it on before opening PR 1.

### Connect Vercel and watch env validation work

5. In the Vercel dashboard: Add New → Project → Install Vercel for GitHub scoped to this one repo → Import. Next.js is auto-detected.
6. Before clicking Deploy, override the Build Command to `pnpm db:migrate && next build`. Set this at import time, not after — the migration step must be present on the very first production deploy. This is the build-command migration path from lesson 5 of chapter 098; production migrations run on every deploy, which is safe only under the cadence's discipline (lesson 1 of chapter 099 is the canonical discussion of that trade-off).
7. Deploy without setting any env vars yet. The build fails on the env validator's missing-`DATABASE_URL` error — this is intentional. Production must boot with the validator on, and seeing the build-time failure once is how the discipline lands. Read the build log and recognize the failure shape.
8. In the dashboard, add the production env vars the validator (`src/env.ts`) requires: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the `*.vercel.app` URL once known), `RESEND_API_KEY` (a placeholder key is fine — `RESEND_API_KEY` is validated-not-used; no email path runs this chapter), `SENTRY_DSN` (required; the project assumes a real Sentry project from Unit 19), `APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`. (`NODE_ENV` is set by Vercel; never put a secret on a `NEXT_PUBLIC_*` var.) Redeploy.
9. Watch the second build succeed: `pnpm install` → `pnpm db:migrate` against the Neon `main` branch (applying migrations `0000`–`0004`, the auth/role/audit/RLS/invoices baseline) → `next build`. The route summary shows static vs. dynamic routes and function bundle sizes.

### Match the function region and wire the Neon integration

10. Set the Function Region to match the Neon region (Project Settings → Functions). This is lesson 3 of chapter 098's load-bearing diff; `iad1` matches `aws-us-east-1`. Verify your region before clicking.
11. Install the Neon integration: Vercel Marketplace → Neon (Neon-Managed) → Install → select the project. It adds a managed `DATABASE_URL` to the Preview environment. Confirm at Project Settings → Environment Variables → filter to Preview: `DATABASE_URL` shows the integration's lock icon with no editable value.
12. Turn on Vercel Authentication (Project Settings → Deployment Protection) for previews — free on Pro, no add-on. Open the first preview URL in a private window to confirm the sign-in gate.
13. Locally, run `vercel link` to associate the directory with the project, then `vercel env pull .env.local` to sync the Development scope. Confirm `.env.local` is gitignored (it is in the starter).

### Confirm the production URL and walk the launch checklist

14. Hit `<project>.vercel.app`. Sign in as a seeded admin; the invoices list renders; `/inspector` shows the production environment badge, the schema-state probe runs, and the audit tail shows the seeded baseline rows.
15. Fill and walk the eight rows of `docs/runbooks/launch-checklist.md` (provided as a stub — table header plus three section headers), recording the gesture and the evidence for each:
    - **Env validator** — green in the production build log (and the deliberate first-build failure you already saw).
    - **`/api/health`** — `curl -s https://<APP_URL>/api/health` returns `{ ok: true, db: 'up' }`; the pooled `DATABASE_URL` ends in `-pooler` and its Neon region matches the Vercel function region.
    - **Sentry test error** — admin → `/inspector` → "Trigger test error" (the provided `triggerTestError` button) → the error appears in the Sentry dashboard within seconds.
    - **Branch-protected `main`** — direct pushes rejected; a PR with green CI required.
    - **Four-job CI gate** — typecheck / lint / test / build green on the PR (plus `audit` + `actionlint`).
    - **Neon-branch-per-PR rehearsal** — the throwaway PR below proves the preview branch + build-time migration path.
    - **Production alias** — `curl -sI https://<APP_URL>` and the `x-vercel-id` header confirm the alias points at the latest production deployment.
    - **Rollback rehearsal** — recorded in lesson 6 against the contract deployment.

### Verify the preview-branch workflow

16. Open a throwaway PR: branch, make a trivial copy change (e.g. a label in the dashboard or sign-in shell), push, open the PR. Wait for the four CI jobs and `vercel-build` to go green; the PR comment includes the preview URL.
17. Visit the preview URL (Vercel Authentication sign-in prompted). The inspector's deployment-environment badge reads `preview` and the build-source panel's `VERCEL_GIT_COMMIT_SHA` matches the PR's HEAD. In the Neon dashboard, confirm the preview's `DATABASE_URL` points to a branch named `preview/<branch-name>`.
18. Close the throwaway PR without merging. Neon auto-deletes the branch within seconds.

At the end the production URL is live serving the chapter 062 surface against the Neon `main` branch, the preview-per-PR workflow is verified end-to-end, and the launch checklist is green and recorded.
Skipping the custom domain is deliberate — the `*.vercel.app` URL is production for this project; the domain-swap gesture was lesson 4 of chapter 098 and is distinct from the migration cadence ahead.
If `vercel-build` ever fails, read the log to tell a migration failure (a SQL bug — fix and re-push; Neon recreates the branch) from a build failure (the type system caught something).
Production is now ready to begin the cadence.

---

## Lesson 3 — PR 1 (Expand): add the nullable subtotal and tax columns

Ship the cadence's expand step: an additive-only migration that adds `subtotal` and `tax` as nullable columns, rehearsed on a Neon preview branch and merged to production.
When this lands, production runs the unchanged chapter 062 app against a schema that now carries `total` plus two new nullable columns nothing reads yet — and the inspector confirms production is healthy with split-coverage at 0%.

### Your mission

The expand step is the safe opening move of a destructive schema change: you widen the schema so the new and old shapes can coexist, without touching application code and without rewriting a single existing row.
The whole reason this PR is safe to deploy is that the running app does not yet read `subtotal` or `tax`, so the new columns must be nullable — a `NOT NULL` add would fail against the existing rows that have no value yet, and that promotion is deferred to PR 2's tail once the backfill has populated every row.
Match the new columns' `numeric(12, 2)` precision and scale to `total` exactly; mismatched precision is a quiet corruption source for money columns, and the senior reflex is to copy the producer's type.
Keep the scope ruthlessly narrow: schema and migration only, no `actions.ts` or `queries.ts` edits, no tests, no env changes — the temptation to "also start writing the new columns while I'm here" is exactly what muddies the rollback story and is held for PR 2.
The single most valuable habit you build here is reading the preview build log line by line: which migrations applied, whether any failed, whether the statement-breakpoint produced two separate statements; if `vercel-build` fails, the log tells you whether it was the migration SQL or the type-checked build, and a corrupted preview branch is fixed by closing and reopening the PR (Neon recreates it from `main`), never by hand.

- The migration is additive only: it adds two columns and contains no `DROP`, no `NOT NULL` add, and no `RENAME`.
- Both new columns are nullable and declared `numeric(12, 2)`, matching `total`'s precision and scale.
- The migration applies cleanly against the live database without rewriting existing rows, confirmed by the preview build log and a sub-second completion on the seed data.
- On the preview deployment the existing app behaves identically — the list renders and create / edit / archive / restore all succeed — while the inspector shows `subtotal` and `tax` present, nullable, and unwritten (split-coverage 0%).
- The PR merges green across all CI checks and `vercel-build`, producing a production deployment whose commit SHA matches the merge commit.
- After the merge, production keeps working against the expanded schema: the list renders, mutations succeed reading and writing `total`, the inspector shows the two new nullable columns, and Sentry stays quiet across a two-minute observation window.
- A PR-1 entry in `docs/runbooks/migration-subtotal-tax.md` records what is true in production now and the cheap rollback available while nothing reads the new columns.

### Coding time

Implement the expand PR against the brief above, then rehearse it on the preview before merging.

<details>

On branch `expand/subtotal-tax`, replace the `// TODO(L3)` marker in `src/db/schema.ts` with the two new columns alongside the existing `total`:

```ts
subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
tax: numeric('tax', { precision: 12, scale: 2 }),
```

Both omit `.notNull()` — that is the load-bearing choice. Run `pnpm db:generate`; Drizzle Kit emits two `ALTER TABLE "invoices" ADD COLUMN` statements as `0005_expand_subtotal_tax.sql` with a `--> statement-breakpoint` between them. Nullable column adds with no default are metadata-only in Postgres, so the breakpoint is not strictly required here, but it keeps the migration shape consistent with the rest of the cadence. Commit the migration, push, and open PR 1 titled `expand: add subtotal and tax columns (nullable)`.

Self-review before merge: the diff is two column additions plus the migration; nothing else (leave the `total` column and the `TODO(L4)`/`TODO(L5)` markers in place). Merge once green; production rebuilds, `pnpm db:migrate` applies `0005` against the Neon `main` branch, and the new function fleet deploys over a few minutes.

Fill the PR 1 section of `docs/runbooks/migration-subtotal-tax.md`: the additive `0005` migration, the two nullable columns, and the "no app touch / no row rewrite" note plus the cheap rollback (revert the migration; nothing reads the columns).

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test:lesson 3
```

The starter ships `tests/lessons/Lesson 3.test.ts` as a `describe.todo` skeleton; the student turns those into real assertions that the expand migration is additive (no destructive statements), both new columns exist and are nullable with matching `numeric(12,2)` precision, and the existing read/write paths over `total` behave unchanged.

Confirm by hand what the tests cannot reach:

- [ ] The preview build log shows `0005_expand_subtotal_tax` applied with a success line and sub-second timing.
- [ ] On the preview, the inspector's schema-state probe shows `subtotal` and `tax` as nullable, and `information_schema.columns` reports `is_nullable = YES` for both.
- [ ] On the preview, create / edit / archive / restore all succeed and the dual-write probe shows `subtotal` and `tax` null for every row (split-coverage 0%).
- [ ] After merge, production `/invoices` renders, mutations succeed, the inspector shows the two nullable columns, and Sentry reports zero new errors after a two-minute wait.
- [ ] `docs/runbooks/migration-subtotal-tax.md` carries the PR-1 state and rollback note.

---

## Lesson 4 — PR 2 (Migrate): dual-write, backfill, dual-read

Land the cadence's migrate step: dual-write every mutation across all three columns, read through a `coalesce` fall-through, backfill the legacy rows, and promote the new columns to `NOT NULL` — all while production keeps serving traffic.
When this lands, production writes `subtotal`, `tax`, and `total` on every mutation, reads resolve through the new pair, split-coverage reads 100%, the new columns are `NOT NULL`, and the inspector confirms production was healthy through the whole transition.

### Your mission

The migrate step is where the application code learns the new shape while still honoring the old one, so that a later PR can read only the new columns and the running code is never surprised.
The dual-write must be structural — every mutation site writes all three columns in one Drizzle `set({...})` call; the common bug is a wrapper that "writes `total` separately later," which splits one statement into two and becomes the divergence source the inspector's data-integrity diff exists to catch.
Keeping `total` populated as `subtotal + tax` is the transitional bridge that lets the not-yet-touched readers and any in-flight form posts keep seeing a valid combined amount; that bridge is born to die in PR 3.
Order is the other load-bearing constraint: the backfill runs only after the dual-write code is live in production, because a backfill that ran first would leave any rows created in the gap with null `subtotal`/`tax` and break the coverage invariant — and the backfill is bounded into batches and made idempotent with a `WHERE subtotal IS NULL` guard so re-running it after a hiccup can never clobber a freshly written value, running over the unpooled connection because long-running scripts do not play well with the pooler's transaction mode.
The `SET NOT NULL` promotion is held for its own small PR after the backfill so the irreversible-ish tightening is reviewed on its own, and you should know that on a million-row table this promotion would take an `ACCESS EXCLUSIVE` lock and you would reach instead for a validated `CHECK ... NOT VALID` constraint — out of scope at seed size but named so the reflex is there; likewise the modeling choice that legacy `total` rolls into `subtotal` with `tax = 0` is a deliberate simplification over consulting a per-invoice tax-rate history, and a real 200K-row backfill would run on Trigger.dev rather than a local script.

- Every create and edit writes `subtotal`, `tax`, and `total` together in one `.values({...})` / `.set({...})` call, with `total` equal to `subtotal + tax` computed via the new `combinedAmount` integer-cents helper (money is a `string` end to end — never float `+`).
- A form post that still sends only a combined amount is tolerated through a transitional fallback (`subtotal = amount`, `tax = '0'`) rather than rejected mid-deploy.
- The list and detail reads surface `subtotal` and `tax` resolved through `coalesce(subtotal, total)` and `coalesce(tax, 0)`, so un-backfilled rows still read correctly while the combined `total` remains available to callers that want it.
- The backfill processes legacy rows in bounded batches, is safe to re-run (no row is ever double-written), and on the preview branch brings the inspector's split-coverage to 100% with zero divergent rows in the data-integrity diff.
- After the dual-write code is live in production, the production backfill completes and the inspector's split-coverage reads 100% against production.
- The `SET NOT NULL` promotion ships as its own PR, merges green, and succeeds against the fully-backfilled table — after which the schema-state probe shows `subtotal` and `tax` as `NOT NULL`.
- Across PR 2 and the promotion PR, production keeps working: the list renders from the new pair, new mutations show all three columns populated with `subtotal + tax = total`, and Sentry stays quiet.
- The runbook's PR-2 entry records that dual-write is live, the backfill is complete, and the columns are `NOT NULL`.

### Coding time

Implement the dual-write, dual-read, and backfill against the brief, rehearse on the preview, merge, run the production backfill, then ship the promotion PR.

<details>

On branch `migrate/subtotal-tax-dual-write`:

- `src/lib/invoices/money.ts` (new) — export `combinedAmount({ subtotal, tax }: { subtotal: string; tax: string }): string`, integer-cents addition returning a `toFixed(2)` string. Use it everywhere a combined amount is shown — `table.tsx` and `conflict-banner.tsx` switch from `row.total` to `combinedAmount(row)`.
- `src/lib/invoices/actions.ts` — replace the `TODO(L4)` markers: `createInvoice` and `updateInvoice` accept `subtotal` and `tax` in their Zod input and write all three columns in one `.values({...})` / `.set({...})` with `total: combinedAmount({ subtotal, tax })`. A post that arrives with only the legacy amount falls back to `subtotal = amount, tax = '0'` at the action layer so it does not fail validation during the deploy window.
- `src/lib/invoices/queries.ts` — replace the `TODO(L4)` markers: `listInvoices` and `getInvoiceDetail` surface `coalesce(invoices.subtotal, invoices.total)` and `coalesce(invoices.tax, 0)` as `subtotal`/`tax`, still returning `total` for the combined amount.
- `src/app/(protected)/invoices/[id]/edit/edit-form.tsx` — replace the `TODO(L4)` marker: the single `name="total"` input becomes `name="subtotal"` + `name="tax"` inputs.
- `scripts/backfill_subtotal_tax.ts` — fill `runBackfill()`: loop selecting up to 1000 ids `WHERE subtotal IS NULL`, then `update set subtotal = total, tax = '0' where id = any(...) and subtotal is null`, until a pass touches no rows. Idempotent via the guard; runs on `dbUnpooled`; invoked with `pnpm db:backfill`.

Open PR 2 titled `migrate: dual-write subtotal and tax, backfill, dual-read fall-through` with the money helper, actions, queries, edit-form, and backfill changes — and no schema migration (the `SET NOT NULL` is a separate PR).

Rehearse on the preview before merge: point `pnpm db:backfill` at the preview branch's unpooled URL, run it, and confirm split-coverage goes green, new mutations populate all three columns, and the data-integrity diff is empty.

After merge, run `pnpm db:backfill` against production with the production unpooled URL lifted into the script's session only (never committed). Then open `migrate-notnull/subtotal-tax`: promote `subtotal`/`tax` to `.notNull()` in `src/db/schema.ts` (replacing the `TODO(L4)` promotion marker), `pnpm db:generate` to emit `0006_set_subtotal_tax_not_null.sql` (two `ALTER COLUMN ... SET NOT NULL` statements with a breakpoint), and merge once green. (Shipping `SET NOT NULL` inside the contract PR is also correct; this project prefers the separate PR for the explicit reviewability of the promotion.)

Watch the inspector during the first ten minutes after the PR-2 merge: a dual-write bug at a single mutation site shows up immediately as a data-integrity row where `subtotal + tax <> total`. Fill the PR 2 section of `docs/runbooks/migration-subtotal-tax.md`: dual-write, the `coalesce` dual-read, the production `pnpm db:backfill` run, and the `0006` promotion.

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test:lesson 4
```

Turn `tests/lessons/Lesson 4.test.ts` from its `describe.todo` skeleton into assertions that create and edit write all three columns with `total = combinedAmount({ subtotal, tax })`, that the legacy-amount fallback populates the pair, that the reads resolve through the `coalesce` fall-through for un-backfilled rows, and that the backfill is idempotent (a second `runBackfill()` writes no rows).

Confirm by hand what the tests cannot reach:

- [ ] On the preview, the backfill runs to a clean exit, split-coverage turns 100%, the dual-write probe shows `subtotal + tax = total` on new mutations, and the data-integrity diff is empty.
- [ ] After the PR-2 merge, the production backfill completes and split-coverage reads 100% against production.
- [ ] The promotion PR merges green and the schema-state probe shows `subtotal` and `tax` as `NOT NULL`.
- [ ] Production `/invoices` renders from the new pair, mutations succeed with all three columns populated, and Sentry reports zero new errors.
- [ ] `docs/runbooks/migration-subtotal-tax.md` carries the PR-2 state.

---

## Lesson 5 — PR 3 (Contract): drop the old column, promote the new pair

Land the cadence's contract step: drop `total`, strip every legacy reference from the app, and let production settle on the target schema.
When this lands, production reads `subtotal` and `tax` directly, the `total` column is gone, split-coverage holds at 100%, and the inspector confirms production has been healthy through all three deploys.

### Your mission

Contract is the cadence's payoff and its one irreversible move, so it is also its smallest: a single `DROP COLUMN total` plus the cleanup the transitional bridge made trivial.
Because PR 2 already promoted `subtotal` and `tax` to `NOT NULL`, the schema change here is just the drop — keep the migration to that one statement so the consequential PR is the easiest to review.
On the application side, every `total` reference comes out: the actions accept only `subtotal` and `tax` and drop both the `total = subtotal + tax` write and the legacy-amount fallback, the queries return the pair directly with the `coalesce` fall-through removed, and any caller wanting the combined amount now computes `subtotal + tax` at the application layer.
Lean on the type checker as your first net — Drizzle's typed builder no longer exposes `invoices.total`, so any surviving Drizzle reference is a build error — but back it with one scoped grep, because raw SQL strings and external scripts slip past the type system; scope the grep to `invoices.total` / `invoiceTotal` rather than the bare English word.
The real-world risk this step carries, named but out of scope here because the project has no external readers, is exactly those non-app consumers — a report script, an analytics pipeline — that would break the instant the column disappears, which is why a production contract PR is gated on a sweep of every reader of the table; and keep in mind for the next lesson that this is the one PR whose schema move an alias rollback cannot undo.

- The migration is a single `DROP COLUMN total` and nothing else.
- The actions accept only `subtotal` and `tax`; the transitional combined-amount write and the legacy-amount fallback are both gone.
- The list and detail reads return `subtotal` and `tax` directly with no `coalesce` fall-through, and any combined-amount need is computed at the application layer.
- No reference to the old column survives anywhere — the type check is green and a scoped grep returns nothing.
- On the preview, the schema-state probe shows `subtotal NOT NULL`, `tax NOT NULL`, and no `total`; the list and all mutations work against the new shape; a `SELECT total` returns a column-does-not-exist error.
- The PR merges green across CI and `vercel-build`, producing a production deployment whose SHA matches the merge commit.
- After merge, production keeps working on the target schema: the list renders, mutations succeed, the inspector shows the target shape with split-coverage 100% and an empty data-integrity diff, and Sentry stays quiet.
- The runbook's closing entry records the completed cadence.

### Coding time

Implement the contract PR against the brief, rehearse on the preview, and merge.

<details>

On branch `contract/drop-total`:

- `src/db/schema.ts` — remove the `total` column (and the `TODO(L5)` marker); `subtotal` and `tax` are already `.notNull()` from PR 2's promotion. Run `pnpm db:generate`; Drizzle emits `0007_contract_total.sql` with the single `ALTER TABLE "invoices" DROP COLUMN "total";`. `DROP COLUMN` is metadata-only in Postgres — fast even on large tables, with the space reclaimed by background `VACUUM` — so no breakpoint and no lock concern.
- `src/lib/invoices/actions.ts` and `src/lib/invoices/queries.ts` — remove every `total` reference per the brief: drop the `total` write + legacy-amount fallback, drop the `InvoiceRow.total` field and the `coalesce` fall-through, and switch the `-total`/`total` sort to order on `sql\`(${invoices.subtotal} + ${invoices.tax})\``.
- `src/app/(protected)/invoices/[id]/edit/edit-form.tsx` — retire any remaining combined-amount affordance (the `TODO(L5)` marker); the table and conflict banner already read `combinedAmount(...)` from PR 2.

Run `pnpm verify` (biome + `tsc` + `next build`) and `pnpm test` locally and fix until green. Open PR 3 titled `contract: drop total, finalize subtotal + tax`. Self-review: one scoped grep for `invoices.total` / `invoiceTotal` proves no typed reference survives (the inspector's raw-SQL probes reference columns by literal and stay valid); the migration is the drop only. Merge once green; production rebuilds, `0007` applies against the Neon `main` branch, and the column is gone.

The transitional bridge in PR 2 is what kept this PR small — had PR 2 not written `total` and tolerated legacy posts, PR 3 would also be carrying the form-flow refactor. The bridge was born to die here.

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test:lesson 5
```

Turn `tests/lessons/Lesson 5.test.ts` from its `describe.todo` skeleton into assertions that the `0007` migration drops the column and contains nothing destructive beyond it, that create / edit accept and persist only `subtotal` and `tax`, that the reads return the pair directly, and that any combined-amount surface is computed (via `combinedAmount`) rather than read from a column.

Confirm by hand what the tests cannot reach:

- [ ] A scoped grep for `invoices.total` / `invoiceTotal` returns nothing across the app and scripts.
- [ ] On the preview, the schema-state probe shows `subtotal NOT NULL`, `tax NOT NULL`, no `total`, and a `SELECT total FROM invoices` in Drizzle Studio errors.
- [ ] On the preview, the list renders from the pair and create / edit / archive all succeed.
- [ ] After merge, production `/invoices` renders, mutations succeed, the inspector shows the target shape with split-coverage 100% and an empty data-integrity diff, and Sentry reports zero new errors.
- [ ] `docs/runbooks/migration-subtotal-tax.md` carries the closing state.

---

## Lesson 6 — Rollback rehearsal and the schema caveat

Rehearse the production rollback gesture against the contract deployment, observe firsthand that an alias re-point does not undo a forward-only migration, then capture the gesture in a durable runbook and restore production to the target state.
When this lands, `docs/runbooks/rollback.md` documents the four-step gesture and its schema caveat, production is back on the PR-3 target schema, and you can recite why code rolls back instantly while schema does not.

### Your mission

The cadence is complete, so the final exercise is not to change production but to practice recovering it — building the muscle memory for the gesture so the dashboard is not new the first time an incident demands it.
You rehearse against the contract deployment deliberately, because contract is the one move whose schema change a rollback cannot reverse, which makes it the sharpest demonstration of the chapter's most important non-obvious lesson: an alias re-point swaps the running code, but the database stays on whatever schema the forward-only migrations already applied.
Promoting the post-PR-2 deployment restores the code that reads `total` through the dual-read, but `total` is gone, so production errors for the few seconds before you re-promote — a deliberate, transient break you should expect and recover from, not a mistake.
That transient error is also the verification that observability works: Sentry must notice it, exactly as the launch checklist's Sentry row promised.
This casualness is only acceptable because the project has no live users; in a real high-stakes environment the same rehearsal runs in a maintenance window against a throwaway deployment, and the runbook you write should be addressed to the future on-call engineer who arrives at 2 AM with none of today's context — including the discriminator between an application-bug rollback (alias re-point plus a `git revert` of the code, schema untouched) and a schema mistake (a forward-fix migration, for instance re-adding `total` as a `GENERATED ALWAYS AS (subtotal + tax) STORED` column, named here but not exercised).

- Promoting the previous production deployment flips the alias in seconds, confirmed by `curl -sI` returning the post-PR-2 `x-vercel-id` and the inspector's build-source panel showing the PR-2 commit SHA.
- With the older code live against the contract schema, production raises a "column total does not exist" error and Sentry receives it — demonstrating that an alias rollback does not undo a forward-only migration.
- Auto-assignment is off after the promote, so the next merge to `main` will not silently re-ship the contract code until it is re-enabled.
- Re-promoting the contract deployment restores production to the target schema and code, with the inspector showing the target shape and Sentry quiet after a refresh window.
- `docs/runbooks/rollback.md` documents the gesture end to end — identify the previous green deployment, promote it, verify the swap, the bolded caveat that this does not undo schema migrations, the `git revert` follow-up, and re-enabling auto-assignment — and names the application-bug-versus-schema-mistake discriminator.
- The launch checklist's eight rows remain green at the URL.

### Coding time

Run the rehearsal against the brief, then write the runbook and restore production.

<details>

Vercel dashboard → Deployments: the current production is the PR-3 merge. Find the previous production deployment (the post-PR-2 merge), open its menu, and Promote to Production. Watch the alias swap in under 30 seconds; confirm `x-vercel-id` and the inspector's commit-SHA panel point at PR-2, then hit `/invoices` and watch the Drizzle query fail as the PR-2 dual-read reaches for the dropped `total`. Confirm Sentry caught it. Confirm auto-assignment flipped off (Settings → Domains).

Fill `docs/runbooks/rollback.md` for the future on-call engineer (it ships as a stub already carrying the bolded caveat and the four section headers — "The four-step alias re-point", "The `git revert` follow-up", "Re-enabling auto-assignment", and the caveat block):

1. Identify the previous green production deployment (dashboard or `vercel ls --prod`).
2. Promote to Production (UI) or `vercel promote <url>` (CLI); the alias flips in seconds.
3. Verify via `curl -sI` (`x-vercel-id`) and the inspector's commit-SHA panel; check Sentry's error rate.
4. **In bold:** this does NOT undo schema migrations; a forward-only migration may leave the older code failing against the current schema, so plan a forward-fix migration as the durable resolution.
5. Open a `git revert` PR for the bad commit (the lesson 2 of chapter 096 gesture); merge after CI; the next prod deploy ships the reverted code.
6. Re-enable auto-assignment from the new prod deployment after a smoke test.

Re-promote the PR-3 deployment to restore the target state; confirm the inspector shows the target shape and Sentry goes quiet. Capture in the runbook the discriminator between rolling back an application bug (alias re-point plus a code-only `git revert`, schema intact) and recovering from a schema mistake (a forward-fix migration — for example re-adding `total` as `numeric GENERATED ALWAYS AS (subtotal + tax) STORED` — expensive next to the alias re-point, cheap next to true data-loss recovery, and warranted only when the contract itself was wrong).

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test:lesson 6
```

Turn `tests/lessons/Lesson 6.test.ts` from its `describe.todo` skeleton into assertions that `docs/runbooks/rollback.md` carries the load-bearing structure — the four-step alias re-point, the bolded "does not undo migrations" caveat, the `git revert` follow-up, and the re-enable-auto-assignment section.

Confirm by hand what the tests cannot reach:

- [ ] Promoting the post-PR-2 deployment flips the alias in seconds and `curl -sI` / the inspector confirm the PR-2 SHA is live.
- [ ] Production raises the "column total does not exist" error and Sentry receives it during the rehearsal window.
- [ ] Auto-assignment is off after the promote.
- [ ] Re-promoting the PR-3 deployment restores the target schema and code, with the inspector showing the target shape and Sentry quiet.
- [ ] The launch checklist's eight rows are still green.
