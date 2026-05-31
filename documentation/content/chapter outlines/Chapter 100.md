# Chapter 100 — Project: ship to production, then live-migrate the schema

## Chapter framing

Chapter 100 cashes in Unit 20 as one runnable shipping discipline. chapter 096's small reviewable PRs, chapter 097's four-job CI gate, chapter 098's Vercel + Neon preview-per-PR + instant rollback, and chapter 099's expand-migrate-contract cadence all converge here. The student takes the course's invoices project (the chapter 062 surface — URL-state list, soft-delete, `version` concurrency) and ships it to a real production URL on Vercel against a Neon-branched preview workflow, then executes one cadence-class migration end-to-end across three reviewed PRs: splitting `invoices.total numeric NOT NULL` into separate `invoices.subtotal numeric NOT NULL` + `invoices.tax numeric NOT NULL` columns. Every PR is green-in-CI before merge, every PR is rehearsed against its own copy-on-write Neon branch before merge, and at no point between PRs is the running production app incompatible with the live schema. The chapter closes by rehearsing the production rollback path (instant alias re-point plus `git revert`) against the contract PR — not to undo the migration but to prove the student knows the gesture before they need it at 2 AM.

Threads that run through every lesson. **The git push is the deploy** — every PR's commit produces a preview deployment on a Neon branch off `main`; every merge to `main` produces a production deployment against the production database; no human clicks "deploy." **The preview branch is the rehearsal stage** — `pnpm db:migrate` runs in the build command against the preview branch, the build fails if the migration fails, the preview URL exercises the new code against production-shaped data; merge happens only after the rehearsal checklist is green. **Forward-only migrations, three deploys minimum** for the destructive change — old and new shapes coexist in expand; app-layer dual-write keeps both populated in migrate; contract drops the old shape only when nothing reads it. **Between PRs, production keeps working** — the load-bearing observation of the entire chapter; the verify steps after PRs 1 and 2 explicitly check production traffic against the in-flight schema. **Rollback is the recovery primitive, not the apology** — the student rehearses an instant-rollback-plus-revert on the contract PR as the closing exercise, learning the gesture before an incident demands it.

### Project goals

The project is complete when every one of these deployment invariants holds, each confirmable through the Vercel dashboard, the repo history, and the provided inspector:

- A live production `*.vercel.app` URL serves the app, and the inspector's schema-state probe shows `subtotal numeric NOT NULL` and `tax numeric NOT NULL` with no `total` column.
- The split ran as three merged PRs in order — expand (additive migration only, no app code), migrate (dual-write + dual-read + backfill script + a follow-up `SET NOT NULL` migration), contract (`DROP COLUMN` + app cleanup) — each with its own merge commit on `main`.
- Every PR was green across all CI checks (typecheck / lint / test / build / vercel-build) before a green-only merge, and each PR's preview deployment ran `pnpm db:migrate && next build` against its own Neon branch with the rehearsal checklist applied.
- The Vercel dashboard shows four production deployments (first deploy plus the three PRs), each prod deployment's commit SHA matching its merge commit, plus the preview deployment that preceded each merge.
- At no point was the running app incompatible with the live schema: after PR 1 merges, production reads `total` while nullable `subtotal`/`tax` sit unread; after PR 2 merges, production dual-writes all three columns and reads via `coalesce`, the backfill brings split-coverage to 100%, and the data-integrity diff stays at zero rows; after PR 3 merges, production reads the new pair directly. Each transition is verified against live production with Sentry quiet.
- The contract PR's rollback is documented in `docs/runbooks/rollback.md` and rehearsed: promoting the previous (post-PR-2) deployment, verifying the alias swap via `curl -sI` and `x-vercel-id`, observing that the alias re-point does not undo the forward-only migration, then re-promoting the contract deployment and re-enabling auto-assignment.
- The launch checklist's eight rows are green at the URL: env validator green in prod build logs, Sentry received the deliberate test error, the sign-in rate limit returns 429 after threshold, the audit log shows recent activity, `curl -sI` shows the security headers, the DB connection uses the pooled `-pooler` endpoint in the matching region, backup retention is set with one test restore done, and an external uptime monitor pages a human against `/api/health`.

### Dependency carry-in

- **From chapter 062 (the project starter):** the full chapter 062 surface — `app/(app)/invoices/page.tsx` with URL-state filter/sort/search/cursor through `nuqs`, the `tenantDb(orgId).invoices.active() / .archived() / .includingDeleted()` scoped query helper, the `version`-precondition `updateInvoice` action with 409 Result, the soft-delete / archive / restore actions, the `createInvoice` action with `useOptimistic`, the inspector page (`/inspector`). The schema ships with `invoices.total numeric(12,2) NOT NULL` as a single combined amount column — no `subtotal` or `tax` breakdown — which is the shape the cadence will evolve into separate `subtotal` + `tax` columns so the application can finally compute and display tax distinctly from the line subtotal.
- **From chapter 096:** small reviewable PRs, branch-protected `main` (no direct pushes), `git revert` as the code-side undo.
- **From chapter 097:** the four-job CI workflow (typecheck, lint, test, build) running on every PR; `pnpm audit` and `markdown-link-check` as supplementary jobs; SHA-pinned actions; `SKIP_ENV_VALIDATION=1` in CI typecheck/lint/test jobs only.
- **From lesson 1 of chapter 098:** the deployment model — every push creates an immutable deployment, production is an alias.
- **From lesson 2 of chapter 098:** the "Import Git Repository" flow, the first `*.vercel.app` URL, `vercel link` + `vercel env pull`, `packageManager: pnpm@9.x` in `package.json`.
- **From lesson 3 of chapter 098:** Node.js runtime as the default, single function region matching the Neon region (`iad1` for the course default), Fluid Compute on, `maxConcurrency` left at the default for this project.
- **From lesson 5 of chapter 098:** the Native Vercel Integration with Neon installed; `DATABASE_URL` injected per preview deployment as a managed var; preview password protection on; the build command overridden to `pnpm db:migrate && next build` so every preview's branch gets the PR's migration before the app boots.
- **From lesson 6 of chapter 098:** three environments (Production / Preview / Development); env validator (`@t3-oss/env-nextjs`) failing builds on missing required vars; `SKIP_ENV_VALIDATION` never set in production; no `NEXT_PUBLIC_*` on a secret.
- **From lesson 7 of chapter 098:** the two-layer rollback — Vercel alias re-point (instant), `git revert` on `main` (durable); rollback doesn't undo migrations.
- **From lesson 8 of chapter 098:** the launch checklist's eight rows — env validation green, Sentry wired, rate limits live, audit logs writing, security headers set, pooled DB with matching region, backups on, external uptime monitor pages a human; `/api/health` endpoint shipped.
- **From lesson 1 of chapter 099:** the expand-migrate-contract cadence as application-layer choreography — dual-write inside the server action, bounded-batched-idempotent backfill, dual-read with `coalesce` fall-through; forward-only.
- **From lesson 2 of chapter 099:** the trigger map placing "splitting one column into two and dropping the original" squarely in the three-deploy list.
- **From lesson 3 of chapter 099:** the rehearsal checklist — migration applied, completed in reasonable time, app works against the new schema, old shape still works where it should; the dual-write verification via direct SQL on the preview branch.
- **From chapter 056 / chapter 057 / chapter 043:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, `logAudit(tx, event)`, the canonical Result shape.
- **From chapter 040:** Drizzle Kit `generate` / `migrate`; the `__drizzle_migrations` ledger; statement-breakpoint comments.

### Starter file tree (stubs marked TODO)

```
.github/
  workflows/
    ci.yml                        # provided: typecheck/lint/test/build, pnpm audit, markdown-link-check (chapter 097)
docker-compose.yml                # provided: local postgres:18 for development env only
drizzle.config.ts                 # provided: reads DATABASE_URL_UNPOOLED
next.config.ts                    # provided: cacheComponents: true, security headers from lesson 8 of chapter 098
.env.example                      # provided: every key present, placeholders only
package.json                      # provided: packageManager pnpm@9, scripts (db:migrate, db:seed, dev, build, test, db:studio)
                                  #           BUILD command overridden in Vercel UI: pnpm db:migrate && next build
README.md                         # provided: setup, deploy, the three-PR plan
src/
  env.ts                          # provided: @t3-oss/env-nextjs schema; required: DATABASE_URL, DATABASE_URL_UNPOOLED,
                                  #           BETTER_AUTH_SECRET, RESEND_API_KEY, SENTRY_DSN, APP_URL, NODE_ENV
  db/
    schema.ts                     # provided: chapter 062 schema with invoices.total numeric(12,2) NOT NULL only,
                                  #           no subtotal/tax columns yet
    client.ts                     # provided
    relations.ts                  # provided
    cursor.ts                     # provided
  lib/
    tenant-db.ts                  # provided
    authed-action.ts              # provided
    audit-log.ts                  # provided
    env.ts                        # provided
    invoices/
      schema.ts                   # provided
      queries.ts                  # provided (reads total); TODO student in PR 2 + PR 3
      scoped-query.ts             # provided
      actions.ts                  # provided (writes total); TODO student in PR 2 + PR 3
  app/
    (app)/invoices/page.tsx       # provided
    inspector/page.tsx            # provided: row counts, "Reset and re-seed" button, two custom panels
                                  #           ('Split coverage', 'Dual-write probe') wired but inert until student fills queries
    api/health/route.ts           # provided: 200 with db ping (lesson 8 of chapter 098)
  proxy.ts                        # provided: noop pass-through (next-intl etc. not in this project)
scripts/
  seed.ts                         # provided: 2 orgs, ~30 invoices/org, total populated; subtotal/tax not yet split
  backfill_subtotal_tax.ts        # TODO student in PR 2: bounded-batched-idempotent backfill (subtotal = total, tax = 0)
drizzle/
  migrations/                     # provided: every migration up to and including the chapter 062 baseline
  meta/                           # provided
```

### Reference solution signatures lessons display

- **Vercel project config:** GitHub App scoped to the single repo; Production Branch `main`; Function Region matches Neon region; Node.js runtime; Fluid Compute on; Build Command `pnpm db:migrate && next build`; Install Command `pnpm install`; Output Directory `.next`; Preview Password Protection on (Pro feature).
- **Neon integration:** Vercel Marketplace → Neon (Neon-Managed) → Install → select project. Production `DATABASE_URL` and `DATABASE_URL_UNPOOLED` point at the Neon `main` branch's pooled and unpooled endpoints respectively. Preview's `DATABASE_URL` is managed by the integration (one branch per PR, off `main`).
- **Environment variable scoping:**
  - Production: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` (live), `SENTRY_DSN`, `APP_URL` (the custom domain or `*.vercel.app`).
  - Preview: same shape, `DATABASE_URL` managed by Neon integration, all other secrets are the *test* / dev versions.
  - Development: `vercel env pull .env.local` syncs Development scope; local docker postgres optional alternative.
- **Expand PR's migration (`drizzle/migrations/0010_expand_subtotal_tax.sql`):**
  ```
  ALTER TABLE "invoices" ADD COLUMN "subtotal" numeric(12, 2);
  --> statement-breakpoint
  ALTER TABLE "invoices" ADD COLUMN "tax" numeric(12, 2);
  ```
- **Migrate PR's app changes (`src/lib/invoices/actions.ts` excerpt):** `createInvoice` and `updateInvoice` accept `subtotal` and `tax` in their Zod input and write `total = subtotal + tax` (transitional dual-write so older clients still observe the populated `total` column). The Drizzle update statement carries all three columns in the same `set({ subtotal, tax, total })` call.
- **Migrate PR's backfill (`scripts/backfill_subtotal_tax.ts`):**
  ```
  // pseudocode shape: while (true) { select 1000 invoices where subtotal is null;
  //   update set subtotal = total, tax = 0; commit; }
  // idempotent via WHERE subtotal IS NULL guard
  // run locally against DATABASE_URL_UNPOOLED of production AFTER PR 2 merges
  ```
- **Migrate PR's query change (`src/lib/invoices/queries.ts` excerpt):** `listInvoices` and `getInvoiceDetail` surface a `subtotal` and `tax` field but resolve each via `coalesce(invoices.subtotal, invoices.total)` and `coalesce(invoices.tax, 0)` — the dual-read fall-through. `total` is still returned for any caller that wants the combined amount.
- **Migrate PR's validation step:** after backfill completes, a one-shot `ALTER TABLE invoices ALTER COLUMN subtotal SET NOT NULL, ALTER COLUMN tax SET NOT NULL;` migration is shipped (small drizzle migration; statement-breakpoint between the two `ALTER COLUMN` statements). The `SET NOT NULL` scans the table to confirm no remaining nulls — fast because the backfill already populated every row.
- **Contract PR's migration (`drizzle/migrations/0012_contract_total.sql`):**
  ```
  ALTER TABLE "invoices" DROP COLUMN "total";
  ```
- **Contract PR's app changes:** every reference to `total` removed from `actions.ts`, `queries.ts`, `schema.ts`. Drizzle's typed query builder fails the build if any survives. `coalesce` fall-through removed; queries return `subtotal` and `tax` directly, and any caller that wants the combined amount computes `subtotal + tax` at the application layer (or via a Drizzle expression).
- **Rollback rehearsal artifact:** a `docs/runbooks/rollback.md` documenting the four-step gesture — (1) Vercel dashboard → Deployments → previous green prod → Promote to Production; (2) verify alias swap (`curl -sI https://APP_URL` returns headers from the promoted deployment, check `x-vercel-id`); (3) `git revert <bad-sha>` PR, review, merge; (4) re-enable auto-assignment from the new prod deployment after smoke-testing.
- **No new env entries beyond the chapter 062 baseline plus lesson 8 of chapter 098's launch-checklist additions (`SENTRY_DSN`, `APP_URL`).**

### Inspector page spec

A single Server Component at `/inspector` (provided in full). Read-only panels; the student fills no inspector code, only the lib/actions code the panels visualize.

- **Header:** session-user switcher (admin/member from chapter 062's seed), org switcher (two seeded orgs), "Reset and re-seed" form (Server Action, admin only).
- **Deployment-environment indicator:** reads `process.env.VERCEL_ENV` (`production` / `preview` / `development`) and renders a colored badge. Verifies the student is looking at the right environment when running checks.
- **Schema-state probe:** runs `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position` and renders the result as a table. The student watches `subtotal` and `tax` appear in PR 1 (nullable), flip to `NOT NULL` after the validation step in PR 2, and `total` disappear in PR 3.
- **Split-coverage panel:** runs three counts — `total invoices`, `invoices WHERE subtotal IS NOT NULL`, `invoices WHERE subtotal IS NULL`. Green when null count is zero. The migrate PR's backfill is "done" when this panel is green; the contract PR's safety check is this panel being green before merge.
- **Dual-write probe:** lists the most recent 10 invoices with `id`, `subtotal`, `tax`, `total` side by side. After every mutation in PR 2, all three columns are populated and `subtotal + tax = total` exactly; deviation is a bug.
- **Data-integrity diff panel:** runs the audit query `SELECT id, subtotal, tax, total FROM invoices WHERE subtotal IS NOT NULL AND subtotal + tax <> total` and lists any rows that diverge. Zero rows is green; non-zero is a dual-write bug.
- **Audit-log tail:** the last 20 audit_log rows for the current org. Every create/update/archive/restore/delete writes here. The student verifies the migration class doesn't lose audit coverage.
- **Build-source panel:** displays the current deployment's commit SHA (`process.env.VERCEL_GIT_COMMIT_SHA`), branch, deployment URL, and whether `VERCEL_ENV === 'production'`. Verifies which PR's code is running.
- **`/api/health` link:** simple link to `/api/health`; expected `{ ok: true, db: 'up' }`. The uptime monitor (lesson 8 of chapter 098) hits the same endpoint.

The inspector is provided in full and rendered on every environment; preview deployments expose it (password-protected); production exposes it gated by admin role.

### Concepts demonstrated → owning lesson

- The deployment model, immutable deployments, alias semantics — lesson 1 of chapter 098.
- First deploy mechanics (Import Git Repository, build command override, `vercel link` / `vercel env pull`) — lesson 2 of chapter 098.
- Function region matching Neon region, Node.js runtime default — lesson 3 of chapter 098.
- Native Vercel + Neon integration, per-PR copy-on-write branch, build-time migration step, preview password protection — lesson 5 of chapter 098.
- Three environments + secret scoping + env validator + `SKIP_ENV_VALIDATION` discipline — lesson 6 of chapter 098.
- Two-layer rollback (Vercel alias + `git revert`), auto-assignment-off after rollback, the data-state caveat — lesson 7 of chapter 098.
- Launch checklist's eight rows + `/api/health` endpoint + security headers — lesson 8 of chapter 098.
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
The starter is the chapter 062 surface — the URL-state invoices list, soft-delete, and `version`-concurrency editing — wired to deploy on every git push against a Neon branch-per-PR workflow.
Its `invoices` table carries a single combined `total` column with no breakdown of subtotal and tax: a real anti-pattern the project exists to fix.
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
The student writes no inspector code; the focus stubs are the three TODO files — `src/lib/invoices/queries.ts`, `src/lib/invoices/actions.ts`, and `scripts/backfill_subtotal_tax.ts` — filled across PRs 2 and 3.
Everything else, including the chapter 062 surface, CI workflow, env validator, and inspector, ships provided.

### Roadmap

<CardGrid>

<Card title="Lesson 2 — From green repo to a live production URL">
Wires Vercel, Neon, env validation, preview password protection, and the launch checklist on the starter to produce the production URL the rest of the chapter targets.
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
   docker compose up -d
   cp .env.example .env.local   # placeholders are valid for local dev
   pnpm db:migrate && pnpm db:seed
   pnpm dev
   ```

</Steps>

Env vars: `.env.example` carries every key with valid local placeholders; the real production and preview values are set in lesson 2.
The local-dev secrets (`DATABASE_URL` / `DATABASE_URL_UNPOOLED` for docker postgres, plus test-mode `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `APP_URL`) need no external account to run locally.

On success `pnpm dev` serves the chapter 062 invoices surface at `http://localhost:3000/invoices` and the inspector at `/inspector`, both reading the seeded `total` column. No feature is built and nothing is deployed yet.

---

## Lesson 2 — From green repo to a live production URL

This is the heaviest setup of the chapter: a guided, end-to-end wiring of Vercel, Neon, env validation, preview password protection, and the launch checklist on the starter.
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
8. In the dashboard, add the production env vars: `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` (a test-mode key is fine — no email path runs this chapter, but the validator requires the key), `SENTRY_DSN` (required; the project assumes a real Sentry project from Unit 19), `APP_URL` (set to the `*.vercel.app` URL once known), `NODE_ENV=production`. Redeploy.
9. Watch the second build succeed: `pnpm install` → `pnpm db:migrate` against the Neon `main` branch (applying every migration up to the chapter 062 baseline) → `next build`. The route summary shows static vs. dynamic routes and function bundle sizes.

### Match the function region and wire the Neon integration

10. Set the Function Region to match the Neon region (Project Settings → Functions). This is lesson 3 of chapter 098's load-bearing diff; `iad1` matches `aws-us-east-1`. Verify your region before clicking.
11. Install the Neon integration: Vercel Marketplace → Neon (Neon-Managed) → Install → select the project. It adds a managed `DATABASE_URL` to the Preview environment. Confirm at Project Settings → Environment Variables → filter to Preview: `DATABASE_URL` shows the integration's lock icon with no editable value.
12. Turn on Preview Password Protection (Project Settings → Deployment Protection). Open the first preview URL in a private window to confirm the password prompt.
13. Locally, run `vercel link` to associate the directory with the project, then `vercel env pull .env.local` to sync the Development scope. Confirm `.env.local` is gitignored (it is in the starter).

### Confirm the production URL and walk the launch checklist

14. Hit `<project>.vercel.app`. The invoices list renders; `/inspector` shows the production environment indicator, the schema-state probe runs, and the audit log is empty on first deploy.
15. Walk the launch checklist (lesson 8 of chapter 098) in order, recording the result in `docs/runbooks/launch-checklist.md`:
    - **Env validation** green in the build log.
    - **Sentry** — admin → `/inspector` → "Trigger test error" (provided) → the error appears in the Sentry dashboard within seconds.
    - **Rate limit** — `hey -n 50 -c 5 https://<APP_URL>/api/auth/sign-in` returns 429s past the threshold.
    - **Audit log** — admin reset-and-reseed updates the audit panel.
    - **Security headers** — `curl -sI https://<APP_URL>` shows HSTS, CSP, nosniff, Referrer-Policy, Permissions-Policy.
    - **Pooled DB + region** — Neon region equals the Vercel function region; `DATABASE_URL` contains `-pooler`.
    - **Backup** — Neon → Branches → create a branch off `main` named `bkp-test`, verify, delete.
    - **Uptime monitor** — a free Better Stack / UptimeRobot monitor on `/api/health` pages your own email.

### Verify the preview-branch workflow

16. Open a throwaway PR: branch, change a string on the marketing page, push, open the PR. Wait for `vercel-build` to go green; the PR comment includes the preview URL.
17. Visit the preview URL (password-prompted). The inspector's deployment-environment indicator reads `preview` and the build-source panel's `VERCEL_GIT_COMMIT_SHA` matches the PR's HEAD. In the Neon dashboard, confirm the preview's `DATABASE_URL` points to a branch named `preview/<branch-name>`.
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

On branch `expand/subtotal-tax`, add to the `invoices` table in `src/db/schema.ts`:

```ts
subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
tax: numeric('tax', { precision: 12, scale: 2 }),
```

Both omit `.notNull()` — that is the load-bearing choice. Run `pnpm drizzle-kit generate`; Drizzle Kit emits two `ALTER TABLE invoices ADD COLUMN` statements as `0010_expand_subtotal_tax.sql`. Insert a `--> statement-breakpoint` between them. Nullable column adds with no default are metadata-only in Postgres, so the breakpoint is not strictly required here, but it keeps the migration shape consistent with the rest of the cadence. Commit the timestamped migration, push, and open PR 1 titled `expand: add subtotal and tax columns (nullable)`.

Self-review before merge: the diff is two column additions plus the migration; nothing else. Merge once green; production rebuilds, `pnpm db:migrate` applies `0010` against the Neon `main` branch, and the new function fleet deploys over a few minutes.

The runbook entry should name the rollback gesture: if PR 2 later misbehaves, revert the dual-write app code; the nullable columns can stay or be dropped in a forward-fix migration, both cheap because nothing reads them.

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test invoices/expand
```

Expect the suite to pass, asserting the migration is additive (no destructive statements), both new columns exist and are nullable with matching precision, and the existing read/write paths over `total` behave unchanged.

Confirm by hand what the tests cannot reach:

- [ ] The preview build log shows `0010_expand_subtotal_tax` applied with a success line and sub-second timing.
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

- Every create and edit writes `subtotal`, `tax`, and `total` together in one update statement, with `total` equal to `subtotal + tax`.
- A form post that still sends only a combined amount is tolerated through a transitional fallback (`subtotal = amount`, `tax = 0`) rather than rejected mid-deploy.
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

- `src/lib/invoices/actions.ts` — `createInvoice` and `updateInvoice` accept `subtotal` and `tax` in their Zod input and write all three columns in one `set({ subtotal, tax, total: subtotal + tax })`. A post that arrives with only the legacy amount falls back to `subtotal = amount, tax = 0` at the action layer so it does not 422 during the deploy window. The form shell changes here too: the single "Amount" input becomes a "Subtotal" + "Tax" pair.
- `src/lib/invoices/queries.ts` — `listInvoices` and `getInvoiceDetail` return `coalesce(invoices.subtotal, invoices.total) AS subtotal` and `coalesce(invoices.tax, 0) AS tax`, still returning `total` for the combined amount.
- `scripts/backfill_subtotal_tax.ts` — pseudocode shape: `while (rows remain) { select 1000 invoices WHERE subtotal IS NULL; update set subtotal = total, tax = 0; commit; log progress; }`. Idempotent via the `WHERE subtotal IS NULL` guard; runs against `DATABASE_URL_UNPOOLED`.

Open PR 2 titled `migrate: dual-write subtotal and tax, backfill, dual-read fall-through` with the actions, queries, backfill script, and form-shell changes — and no schema migration (the `SET NOT NULL` is a separate PR).

Rehearse on the preview before merge: pull the preview's `DATABASE_URL_UNPOOLED`, run the backfill against the preview branch, and confirm split-coverage goes green, new mutations populate all three columns, and the data-integrity diff is empty.

After merge, run the backfill against production from your machine with the production unpooled URL lifted into the script's session only (never committed). Then open `migrate-notnull/subtotal-tax` containing the two `ALTER COLUMN ... SET NOT NULL` statements with a `--> statement-breakpoint` between them, and merge once green. (The alternative of shipping `SET NOT NULL` inside the contract PR is also correct; this project prefers the separate PR for the explicit reviewability of the promotion.)

Watch the inspector during the first ten minutes after the PR-2 merge: a dual-write bug at a single mutation site shows up immediately as a row where `subtotal + tax <> total`.

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test invoices/migrate
```

Expect the suite to pass, asserting that create and edit write all three columns with `total = subtotal + tax`, that the legacy-amount fallback populates the pair, that the reads resolve through the `coalesce` fall-through for un-backfilled rows, and that the backfill is idempotent (a second run writes no rows).

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

- `src/db/schema.ts` — remove the `total` column; `subtotal` and `tax` are already `.notNull()` from PR 2's promotion. Run `pnpm drizzle-kit generate`; Drizzle emits `0012_contract_total.sql` with the single `ALTER TABLE "invoices" DROP COLUMN "total";`. `DROP COLUMN` is metadata-only in Postgres — fast even on large tables, with the space reclaimed by background `VACUUM` — so no breakpoint and no lock concern.
- `src/lib/invoices/actions.ts` and `src/lib/invoices/queries.ts` — remove every `total` reference per the brief; retire any remaining "Amount" affordance in the form shell.

Run `pnpm typecheck` and `pnpm test` locally and fix until green, including any fixture still expecting `total` at the column level. Open PR 3 titled `contract: drop total, finalize subtotal + tax`. Self-review: one scoped grep proves no `total` survives; the migration is the drop only. Merge once green; production rebuilds, `0012` applies against the Neon `main` branch, and the column is gone.

The transitional bridge in PR 2 is what kept this PR small — had PR 2 not written `total` and tolerated legacy posts, PR 3 would also be carrying the form-flow refactor. The bridge was born to die here.

</details>

### Moment of truth

Run the lesson's test suite:

```sh
pnpm test invoices/contract
```

Expect the suite to pass, asserting the migration drops the column and contains nothing destructive beyond it, that create / edit accept and persist only `subtotal` and `tax`, that the reads return the pair directly, and that any combined-amount surface is computed rather than read from a column.

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

Write `docs/runbooks/rollback.md` for the future on-call engineer:

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
pnpm test runbooks/rollback
```

Expect the suite to pass, asserting `docs/runbooks/rollback.md` exists and carries the load-bearing structure — the promote step, the bolded "does not undo migrations" caveat, the `git revert` follow-up, and the re-enable-auto-assignment step.

Confirm by hand what the tests cannot reach:

- [ ] Promoting the post-PR-2 deployment flips the alias in seconds and `curl -sI` / the inspector confirm the PR-2 SHA is live.
- [ ] Production raises the "column total does not exist" error and Sentry receives it during the rehearsal window.
- [ ] Auto-assignment is off after the promote.
- [ ] Re-promoting the PR-3 deployment restores the target schema and code, with the inspector showing the target shape and Sentry quiet.
- [ ] The launch checklist's eight rows are still green.
