# Chapter 104 — Project: ship to production, then live-migrate the schema

## Chapter framing

Chapter 104 cashes in Unit 21 as one runnable shipping discipline. chapter 100's small reviewable PRs, chapter 101's four-job CI gate, chapter 102's Vercel + Neon preview-per-PR + instant rollback, and chapter 103's expand-migrate-contract cadence all converge here. The student takes the course's invoices project (the chapter 066 surface — URL-state list, soft-delete, `version` concurrency) and ships it to a real production URL on Vercel against a Neon-branched preview workflow, then executes one cadence-class migration end-to-end across three reviewed PRs: splitting `invoices.total numeric NOT NULL` into separate `invoices.subtotal numeric NOT NULL` + `invoices.tax numeric NOT NULL` columns. Every PR is green-in-CI before merge, every PR is rehearsed against its own copy-on-write Neon branch before merge, and at no point between PRs is the running production app incompatible with the live schema. The chapter closes by rehearsing the production rollback path (instant alias re-point plus `git revert`) against the contract PR — not to undo the migration but to prove the student knows the gesture before they need it at 2 AM.

Threads that run through every lesson. **The git push is the deploy** — every PR's commit produces a preview deployment on a Neon branch off `main`; every merge to `main` produces a production deployment against the production database; no human clicks "deploy." **The preview branch is the rehearsal stage** — `pnpm db:migrate` runs in the build command against the preview branch, the build fails if the migration fails, the preview URL exercises the new code against production-shaped data; merge happens only after the rehearsal checklist is green. **Forward-only migrations, three deploys minimum** for the destructive change — old and new shapes coexist in expand; app-layer dual-write keeps both populated in migrate; contract drops the old shape only when nothing reads it. **Between PRs, production keeps working** — the load-bearing observation of the entire chapter; the verify steps after PRs 1 and 2 explicitly check production traffic against the in-flight schema. **Rollback is the recovery primitive, not the apology** — the student rehearses an instant-rollback-plus-revert on the contract PR as the closing exercise, learning the gesture before an incident demands it.

### Dependency carry-in

- **From chapter 066 (the project starter):** the full chapter 066 surface — `app/(app)/invoices/page.tsx` with URL-state filter/sort/search/cursor through `nuqs`, the `tenantDb(orgId).invoices.active() / .archived() / .includingDeleted()` scoped query helper, the `version`-precondition `updateInvoice` action with 409 Result, the soft-delete / archive / restore actions, the `createInvoice` action with `useOptimistic`, the inspector page (`/inspector`). The schema ships with `invoices.total numeric(12,2) NOT NULL` as a single combined amount column — no `subtotal` or `tax` breakdown — which is the shape the cadence will evolve into separate `subtotal` + `tax` columns so the application can finally compute and display tax distinctly from the line subtotal.
- **From chapter 100:** small reviewable PRs, branch-protected `main` (no direct pushes), `git revert` as the code-side undo.
- **From chapter 101:** the four-job CI workflow (typecheck, lint, test, build) running on every PR; `pnpm audit` and `markdown-link-check` as supplementary jobs; SHA-pinned actions; `SKIP_ENV_VALIDATION=1` in CI typecheck/lint/test jobs only.
- **From lesson 1 of chapter 102:** the deployment model — every push creates an immutable deployment, production is an alias.
- **From lesson 2 of chapter 102:** the "Import Git Repository" flow, the first `*.vercel.app` URL, `vercel link` + `vercel env pull`, `packageManager: pnpm@9.x` in `package.json`.
- **From lesson 3 of chapter 102:** Node.js runtime as the default, single function region matching the Neon region (`iad1` for the course default), Fluid Compute on, `maxConcurrency` left at the default for this project.
- **From lesson 5 of chapter 102:** the Native Vercel Integration with Neon installed; `DATABASE_URL` injected per preview deployment as a managed var; preview password protection on; the build command overridden to `pnpm db:migrate && next build` so every preview's branch gets the PR's migration before the app boots.
- **From lesson 6 of chapter 102:** three environments (Production / Preview / Development); env validator (`@t3-oss/env-nextjs`) failing builds on missing required vars; `SKIP_ENV_VALIDATION` never set in production; no `NEXT_PUBLIC_*` on a secret.
- **From lesson 7 of chapter 102:** the two-layer rollback — Vercel alias re-point (instant), `git revert` on `main` (durable); rollback doesn't undo migrations.
- **From lesson 8 of chapter 102:** the launch checklist's eight rows — env validation green, Sentry wired, rate limits live, audit logs writing, security headers set, pooled DB with matching region, backups on, external uptime monitor pages a human; `/api/health` endpoint shipped.
- **From lesson 1 of chapter 103:** the expand-migrate-contract cadence as application-layer choreography — dual-write inside the server action, bounded-batched-idempotent backfill, dual-read with `coalesce` fall-through; forward-only.
- **From lesson 2 of chapter 103:** the trigger map placing "splitting one column into two and dropping the original" squarely in the three-deploy list.
- **From lesson 3 of chapter 103:** the rehearsal checklist — migration applied, completed in reasonable time, app works against the new schema, old shape still works where it should; the dual-write verification via direct SQL on the preview branch.
- **From chapter 060 / chapter 061 / chapter 047:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, `logAudit(tx, event)`, the canonical Result shape.
- **From chapter 044:** Drizzle Kit `generate` / `migrate`; the `__drizzle_migrations` ledger; statement-breakpoint comments.

### Starter file tree (stubs marked TODO)

```
.github/
  workflows/
    ci.yml                        # provided: typecheck/lint/test/build, pnpm audit, markdown-link-check (chapter 101)
docker-compose.yml                # provided: local postgres:18 for development env only
drizzle.config.ts                 # provided: reads DATABASE_URL_UNPOOLED
next.config.ts                    # provided: cacheComponents: true, security headers from lesson 8 of chapter 102
.env.example                      # provided: every key present, placeholders only
package.json                      # provided: packageManager pnpm@9, scripts (db:migrate, db:seed, dev, build, test, db:studio)
                                  #           BUILD command overridden in Vercel UI: pnpm db:migrate && next build
README.md                         # provided: setup, deploy, the three-PR plan
src/
  env.ts                          # provided: @t3-oss/env-nextjs schema; required: DATABASE_URL, DATABASE_URL_UNPOOLED,
                                  #           BETTER_AUTH_SECRET, RESEND_API_KEY, SENTRY_DSN, APP_URL, NODE_ENV
  db/
    schema.ts                     # provided: chapter 066 schema with invoices.total numeric(12,2) NOT NULL only,
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
    api/health/route.ts           # provided: 200 with db ping (lesson 8 of chapter 102)
  proxy.ts                        # provided: noop pass-through (next-intl etc. not in this project)
scripts/
  seed.ts                         # provided: 2 orgs, ~30 invoices/org, total populated; subtotal/tax not yet split
  backfill_subtotal_tax.ts        # TODO student in PR 2: bounded-batched-idempotent backfill (subtotal = total, tax = 0)
drizzle/
  migrations/                     # provided: every migration up to and including the chapter 066 baseline
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
- **No new env entries beyond the chapter 066 baseline plus lesson 8 of chapter 102's launch-checklist additions (`SENTRY_DSN`, `APP_URL`).**

### Inspector page spec

A single Server Component at `/inspector` (provided in full). Read-only panels; the student fills no inspector code, only the lib/actions code the panels visualize.

- **Header:** session-user switcher (admin/member from chapter 066's seed), org switcher (two seeded orgs), "Reset and re-seed" form (Server Action, admin only).
- **Deployment-environment indicator:** reads `process.env.VERCEL_ENV` (`production` / `preview` / `development`) and renders a colored badge. Verifies the student is looking at the right environment when running checks.
- **Schema-state probe:** runs `SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'invoices' ORDER BY ordinal_position` and renders the result as a table. The student watches `subtotal` and `tax` appear in PR 1 (nullable), flip to `NOT NULL` after the validation step in PR 2, and `total` disappear in PR 3.
- **Split-coverage panel:** runs three counts — `total invoices`, `invoices WHERE subtotal IS NOT NULL`, `invoices WHERE subtotal IS NULL`. Green when null count is zero. The migrate PR's backfill is "done" when this panel is green; the contract PR's safety check is this panel being green before merge.
- **Dual-write probe:** lists the most recent 10 invoices with `id`, `subtotal`, `tax`, `total` side by side. After every mutation in PR 2, all three columns are populated and `subtotal + tax = total` exactly; deviation is a bug.
- **Data-integrity diff panel:** runs the audit query `SELECT id, subtotal, tax, total FROM invoices WHERE subtotal IS NOT NULL AND subtotal + tax <> total` and lists any rows that diverge. Zero rows is green; non-zero is a dual-write bug.
- **Audit-log tail:** the last 20 audit_log rows for the current org. Every create/update/archive/restore/delete writes here. The student verifies the migration class doesn't lose audit coverage.
- **Build-source panel:** displays the current deployment's commit SHA (`process.env.VERCEL_GIT_COMMIT_SHA`), branch, deployment URL, and whether `VERCEL_ENV === 'production'`. Verifies which PR's code is running.
- **`/api/health` link:** simple link to `/api/health`; expected `{ ok: true, db: 'up' }`. The uptime monitor (lesson 8 of chapter 102) hits the same endpoint.

The inspector is provided in full and rendered on every environment; preview deployments expose it (password-protected); production exposes it gated by admin role.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| A live production URL serves the app with the new schema | After PR 3 merges and production rebuilds, hit `https://<APP_URL>/invoices`; list renders; inspector's schema-state probe shows `subtotal numeric NOT NULL` and `tax numeric NOT NULL`, and no `total` column. |
| The migration ran in three PRs | Repo history shows three merged PRs in order: expand (additive migration only, no app code), migrate (no schema migration in the main PR; dual-write + dual-read + backfill script + a small follow-up `SET NOT NULL` migration), contract (DROP COLUMN + app cleanup). Each PR's preview-URL deployment was green. Each PR has its own merge commit on `main`. |
| Each green in CI | Every PR's checks tab shows typecheck / lint / test / build / vercel-build all green; merge button was green-only. |
| Each deployed | Vercel dashboard's Deployments list shows three production deployments after the three merges, plus the three preview deployments from before each merge. Each prod deployment's commit SHA matches the merge commit. |
| No moment when app and DB schemas were incompatible | The student articulates the cadence's safety: PR 1's prod deploy adds nullable columns the running app doesn't read; PR 2's prod deploy writes all three columns (so PR 3's deploy can later read only the new ones); PR 3's prod deploy drops the old `total` column only after PR 2's code has been live and writing the new pair. Inspector's deployment + schema panels confirmed across the timeline. |
| Between PRs 1 and 2 production keeps working | At the moment PR 1 is merged to `main`, before PR 2's code lands: hit production `/invoices`, list renders from `total` (the running code); inspector's schema-state shows `subtotal` and `tax` exist and are nullable but unread; no errors in Sentry. Verified by waiting at least one minute and re-checking. |
| Between PRs 2 and 3 production keeps working | At the moment PR 2 is merged to `main`, before PR 3 lands: hit production `/invoices`, list renders from `coalesce(subtotal, total)` and `coalesce(tax, 0)`; inspector's dual-write probe shows all three columns populated on new mutations and `subtotal + tax = total`; split-coverage panel turns green after the backfill script runs against production via `DATABASE_URL_UNPOOLED`; data-integrity diff panel shows zero divergent rows. |
| Contract PR rollback documented and rehearsed | `docs/runbooks/rollback.md` exists with the four-step gesture; the student demonstrates it by promoting the previous production deployment (the post-PR-2 one), verifies alias swap via `curl -sI` and `x-vercel-id`, opens a `git revert` PR of the contract commit, lets CI run, then re-promotes the contract deployment to restore the target state. Auto-assignment is re-enabled. The runbook captures every step. |
| Preview branch verification ran on every PR | Each PR's `vercel-build` check in CI shows `pnpm db:migrate && next build` succeeding; the PR's preview URL exercised the new code against a Neon branch; the rehearsal checklist (lesson 3 of chapter 103) was applied. |
| Production rollback's data caveat understood | The student articulates: rolling back the alias does not undo the migration; the contract PR's `DROP COLUMN total` is forward-only. The runbook names this explicitly. The rehearsal exercises the alias re-point only; restoring dropped data would be a separate forward-fix migration. |
| Launch checklist green | All eight lesson 8 of chapter 102 rows verified: env validator green in prod build logs; Sentry received the deliberate test error; sign-in rate limit returns 429 after threshold; audit log shows recent activity; `curl -sI` shows HSTS/CSP/nosniff/Referrer-Policy/Permissions-Policy; DB connection uses `-pooler`; backup retention set and one test restore done; uptime monitor pages a human. |

### Concepts demonstrated → owning lesson

- The deployment model, immutable deployments, alias semantics — lesson 1 of chapter 102.
- First deploy mechanics (Import Git Repository, build command override, `vercel link` / `vercel env pull`) — lesson 2 of chapter 102.
- Function region matching Neon region, Node.js runtime default — lesson 3 of chapter 102.
- Native Vercel + Neon integration, per-PR copy-on-write branch, build-time migration step, preview password protection — lesson 5 of chapter 102.
- Three environments + secret scoping + env validator + `SKIP_ENV_VALIDATION` discipline — lesson 6 of chapter 102.
- Two-layer rollback (Vercel alias + `git revert`), auto-assignment-off after rollback, the data-state caveat — lesson 7 of chapter 102.
- Launch checklist's eight rows + `/api/health` endpoint + security headers — lesson 8 of chapter 102.
- Expand-migrate-contract cadence + dual-write + dual-read + bounded-batched-idempotent backfill — lesson 1 of chapter 103.
- Trigger map placement of "splitting one column into two and dropping the original" — lesson 2 of chapter 103.
- Preview-branch rehearsal checklist + split-coverage verification + data-integrity diff — lesson 3 of chapter 103.
- Small reviewable PRs + branch-protected `main` — lesson 3 of chapter 100 + lesson 4 of chapter 100.
- CI baseline (typecheck/lint/test/build) on every PR — lesson 2 of chapter 101.
- `git revert` as code-side undo — lesson 2 of chapter 100.
- `authedAction` + `tenantDb` + `logAudit` — chapter 061 + chapter 060.
- Canonical Result shape on Server Actions — chapter 047.

---

## Lesson 1 — The brief: three PRs, zero outages

Frames the build, the "Done when" bar, and the three-PR plan that splits `invoices.total` into `subtotal` + `tax` without any moment of app/DB incompatibility in production.

Goals:

- Frame the build: take the chapter 066 invoices project, ship it to a real production URL on Vercel against a Neon branch-per-PR workflow, then execute one cadence-class migration (split `invoices.total numeric NOT NULL` into separate `subtotal numeric NOT NULL` + `tax numeric NOT NULL` columns, dropping `total`) across three reviewed PRs without any moment of schema/app incompatibility in production. Close by rehearsing a production rollback against the contract PR.
- State "Done when" in one paragraph: a live production URL serves the app with the new schema; the migration ran in three PRs (each green in CI, each deployed) without any moment of app/DB incompatibility; the contract PR's rollback is documented and rehearsed. The launch checklist's eight rows are green at the URL.
- Scope cuts: no custom domain provisioned (use the `*.vercel.app` URL — the gesture for domain swap was lesson 4 of chapter 102); no Cloudflare-in-front; no OIDC for cloud credentials (R2 credentials carry from Unit 13 as long-lived env vars; OIDC upgrade is named not done); no rolling release (full cutover with fast rollback is the default); no production migration via a separate gated CI job (the project uses the build-command migration path that lesson 5 of chapter 102 sets up, which is correct for the cadence the project exercises and is named as the simplification in chapter 103); no pgroll, no schema-management tooling beyond Drizzle Kit; not solving cross-tenant data corrections or business-logic flag-rollouts bundled with the migration — the cadence covers schema choreography only; not modeling per-line-item tax rates or jurisdiction lookups (the backfill assumes `tax = 0` against the seed; real-world tax computation is its own problem).
- Senior payoff: this is the canonical 2026 shape for "ship a SaaS from a green repo to a live URL, then evolve the schema without an outage." Every later schema change uses the same three-question decision tree (additive? long lock? running code reads disappearing shape?) and the same dual-write + backfill + dual-read + drop choreography. The launch checklist is the artifact the engineer prints and rehearses before every quarterly review.
- Show the end state: `https://<project>.vercel.app/invoices` rendering; `/inspector` showing `subtotal NOT NULL` and `tax NOT NULL`, no `total`, split-coverage 100%, data-integrity diff zero rows; Vercel dashboard showing four production deployments (first deploy + three PRs); the rollback runbook in `docs/runbooks/`.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships the chapter 066 surface end-to-end with a deliberately under-modeled shape: `total` is a single combined amount with no breakdown of subtotal and tax. The cadence fixes a real anti-pattern (a column that conflates two business concepts), not a contrived one.
- "No moment of app/DB incompatibility" is the load-bearing claim. The verify steps after PRs 1 and 2 explicitly check production while it's running the *previous* PR's code against the *current* PR's schema. If the student can't articulate why those moments are safe, the cadence didn't land.
- The rollback rehearsal targets the contract PR deliberately because contract is the only PR whose schema move can't be undone by a forward-fix without data work. Rehearsing the gesture on the most consequential step makes the muscle memory durable. The exercise doesn't actually leave production in a broken state — it promotes the previous deployment, verifies the swap, then re-promotes the contract deployment.
- One full chapter (~3h) is the realistic clock; the chapter can be sliced across two sittings — the first ending after lesson 3 of chapter 104 (expand merged, prod healthy) or lesson 4 of chapter 104 (migrate merged, backfill green), the second finishing with contract and rollback. The PR-level grain makes the natural pause points obvious.
- This project doesn't introduce new infrastructure beyond Vercel and Neon's free-tier accounts; Resend / Stripe / Trigger.dev / R2 / Upstash / Sentry / PostHog all carry from earlier units' accounts and aren't required to be fully wired for this chapter to verify — `/api/health` plus Sentry receiving the deliberate test error is what the launch checklist requires.

Codebase state at entry: empty repo, no Vercel account configured for the project, no Neon project paired.
Codebase state at exit: starter cloned locally; `pnpm install` succeeds; `pnpm dev` against local docker postgres renders chapter 066's surface; the student has read this brief and knows the three PRs ahead. No code written; no deploy yet.

Estimated student time: 10 to 15 minutes.

---

## Lesson 2 — From green repo to a live production URL

Wires Vercel, Neon, env validation, preview password protection, and the launch checklist concretely on the starter to produce the production URL the rest of the chapter targets.

Goals:

- Run the lesson 2 of chapter 102 + lesson 3 of chapter 102 + lesson 5 of chapter 102 + lesson 6 of chapter 102 + lesson 8 of chapter 102 wirings concretely on this repo. The chapter material taught the moves; this lesson does them once against the project, end to end, producing the production URL the rest of the chapter targets.
- Create the Neon project. Course default: the Neon free tier, single region matching the chosen Vercel function region (`iad1`). Production branch = `main`. Save the pooled and unpooled connection strings.
- Push the starter to a fresh private GitHub repo. Confirm branch protection on `main` (lesson 4 of chapter 100): no direct pushes, require PR + green CI before merge, require at least one review (in a solo course this is a soft self-attestation, but the rule is set).
- Connect Vercel: Dashboard → Add New → Project → Install Vercel for GitHub scoped to this one repo → Import. Auto-detected Next.js. **Override the Build Command to `pnpm db:migrate && next build`** before clicking Deploy. **Skip env vars on first deploy** — the build will fail; this is expected and exercised intentionally so the student sees env validation working.
- Watch the first build fail with the env validator's missing-`DATABASE_URL` error. The exercise: read the build log, recognize the failure shape, fix it in the dashboard. Add the production env vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` test value for now, `SENTRY_DSN`, `APP_URL` to-be-set, `NODE_ENV=production`). Redeploy.
- Watch the second build succeed: `pnpm install` → `pnpm db:migrate` (against the Neon `main` branch; applies every migration up to the chapter 066 baseline) → `next build`. The route summary shows static vs. dynamic, function bundle sizes.
- Set the Function Region to match the Neon region (Project Settings → Functions). lesson 3 of chapter 102's load-bearing diff. Default `iad1` matches Neon's `aws-us-east-1`; the student verifies their region before clicking.
- Install the Neon integration via Vercel Marketplace → Neon (Neon-Managed) → Install → select the project. The integration adds `DATABASE_URL` to the Preview environment as a managed var. Confirm: Project Settings → Environment Variables → filter to Preview → `DATABASE_URL` shows the integration's lock icon, no value visible to edit by hand.
- Turn on Preview Password Protection (Project Settings → Deployment Protection). Test by opening the first preview URL in a private window — password prompt appears.
- Run `vercel link` locally to associate the repo's directory with the Vercel project, then `vercel env pull .env.local` to sync the Development scope. Verify `.env.local` is gitignored (it is by default in the starter).
- Hit the first production URL `<project>.vercel.app`. List renders. `/inspector` shows the production environment indicator, schema-state probe runs, audit log empty (first deploy).
- Walk the launch checklist (lesson 8 of chapter 102) in order: env validation green (build log); Sentry test (admin → `/inspector` → "Trigger test error" button (provided) → Sentry dashboard shows it within seconds); rate limit (`hey -n 50 -c 5 https://<APP_URL>/api/auth/sign-in` returns 429s after the threshold); audit log writing (admin reset-and-reseed → audit panel updates); security headers (`curl -sI https://<APP_URL>` shows HSTS, CSP, nosniff, Referrer-Policy, Permissions-Policy); pooled DB + region match (Neon dashboard region equals Vercel function region; `DATABASE_URL` contains `-pooler`); backup test (Neon → Branches → create a branch off `main` named `bkp-test` → verify, delete); uptime monitor (free Better Stack / UptimeRobot account → monitor `/api/health` → page own email). Eight rows green. Record this state in `docs/runbooks/launch-checklist.md`.
- Open a throwaway PR to verify the preview-branch wiring: create a branch, change a string in the marketing page, push, open the PR. Wait for the vercel-build check to go green; the PR comment includes the preview URL. Visit the preview URL (password-prompted). Inspector's deployment-environment indicator reads `preview`; the `VERCEL_GIT_COMMIT_SHA` matches the PR's HEAD. Verify the preview's `DATABASE_URL` points to a Neon branch named `preview/<branch-name>` (visible in Neon dashboard). Close the throwaway PR without merging — Neon auto-deletes the branch within seconds.

Senior calls and watch-outs:

- Build command override happens at project-import time, not after. Adding the migration step later means the first prod deploy didn't migrate — caught immediately because `pnpm db:migrate` is in the build, but cleaner to set it once at import.
- The env-validation failure on first deploy is *the lesson*. Production must boot with the validator on; the build-time failure is the safety net working. A student who never sees this failure mode hasn't internalized the discipline.
- Skip the custom domain. The chapter doesn't need it. The Vercel-generated URL is the working production URL for the duration of the project; later units (if a real product is being shipped) graduate to a custom domain via lesson 4 of chapter 102's mechanics, but that's a one-time configuration distinct from the migration cadence the chapter is teaching.
- Resend in test mode is fine for this chapter — the email-send paths from earlier units aren't exercised. `RESEND_API_KEY` is required by the env validator so it gets the test key.
- Sentry's `SENTRY_DSN` is required. Even if Sentry was wired in Unit 20, the project assumes the student has an account and a project there; if not, the launch checklist's row 2 cannot be completed and the project is not done. The course material made this clear in Unit 1's account-setup brief.
- `pnpm db:migrate` in the build command is the project's chosen pattern (matches lesson 5 of chapter 102's wiring and the cadence the chapter exercises). The trade-off — production migrations run on every deploy, which is safe under the cadence's discipline but would be reckless without it — is named once and not re-litigated; lesson 1 of chapter 103's discussion is the canonical reference.
- Branch protection on `main` enforces the PR-only workflow. Without it the temptation to push the dual-write fix directly defeats the cadence. Turn it on before opening PR 1.

Codebase state at entry: starter cloned locally, no remote deployed.
Codebase state at exit: production URL live serving the chapter 066 surface against the Neon `main` branch; preview-per-PR workflow verified end-to-end; launch checklist green (recorded); throwaway PR closed; Neon branch auto-deleted. **Runnable — production is live on the baseline chapter 066 schema; ready to begin the cadence.**

Estimated student time: 60 to 80 minutes. Heaviest setup lesson — the platform wiring lands here. After this, every subsequent lesson is just git pushes.

---

## Lesson 3 — PR 1 (Expand): add the nullable subtotal and tax columns

Ships an additive-only migration that adds `subtotal numeric(12,2)` and `tax numeric(12,2)` as nullable columns, rehearses it on the Neon preview branch, merges, and verifies the running chapter 066 app code stays healthy against the expanded schema.

Goals:

- Open a new branch `expand/subtotal-tax`. Edit `src/db/schema.ts` to add `subtotal: numeric('subtotal', { precision: 12, scale: 2 })` and `tax: numeric('tax', { precision: 12, scale: 2 })` on the `invoices` table — *both nullable* so the migration doesn't fail on existing rows and the running app (which doesn't read either column yet) is unaffected. No app code changes; the existing `total` column is untouched.
- Run `pnpm drizzle-kit generate`. Inspect the emitted SQL. Drizzle Kit produces two `ALTER TABLE invoices ADD COLUMN ...` statements. Insert a `--> statement-breakpoint` between them so they execute as separate statements (additive column adds are cheap in Postgres — metadata-only when the column is nullable with no default — but the breakpoint keeps the migration shape consistent with the rest of the cadence).
- Confirm the migration filename is timestamped, contains both statements with the breakpoint, and is committed. Push the branch, open PR 1 titled `expand: add subtotal and tax columns (nullable)`.
- Wait for CI's four jobs to go green. Then wait for `vercel-build` — Vercel creates a Neon branch off `main`, runs `pnpm db:migrate` against it, builds, deploys. The PR comment shows the preview URL. The preview-build log includes `Applying migration 0010_expand_subtotal_tax` and the success line.
- Walk the rehearsal checklist (lesson 3 of chapter 103) against the preview URL. (1) Migration applied — preview build log confirms; inspector's schema-state probe on the preview shows `subtotal numeric NULLABLE` and `tax numeric NULLABLE`. (2) Migration completed in reasonable time — log timestamps show sub-second on the seed data. (3) App still works against the new schema — open the preview `/invoices`, list renders identically to before (the app doesn't read `subtotal` or `tax` yet); create/edit/archive/restore an invoice — all succeed; inspector's dual-write probe shows `subtotal NULL` and `tax NULL` for every row (expected, this PR doesn't write them yet). (4) Old shape still works — every existing path reads and writes `total` and works. (5) Verify the new columns are nullable — `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'invoices' AND column_name IN ('subtotal','tax')` returns `is_nullable = YES` for both. Inspector's split-coverage panel shows 0% (expected).
- Self-review the PR diff once. Confirm: schema.ts change is two column additions; migration SQL has both statements with breakpoint; no actions.ts / queries.ts changes; no test changes; no env changes.
- Merge the PR. Production rebuilds: `pnpm db:migrate` runs against the Neon `main` branch and applies migration 0010; the new function fleet deploys. The deploy is a few minutes.
- **Verify production keeps working — the load-bearing observation.** Hit production `/invoices`. List renders. Create / edit / archive an invoice — all succeed. The running code is reading and writing `total`; the schema now has `total`, `subtotal` (nullable), and `tax` (nullable); production is healthy. Inspector on production shows the schema-state probe with `subtotal` and `tax` present and nullable; split-coverage at 0%. Wait at least two minutes (Vercel's function fleet warms across the period); re-check Sentry for errors related to the deploy — zero. **The cadence's first safety claim is observed empirically.**
- Document this state in a brief PR-1 note in `docs/runbooks/migration-subtotal-tax.md`: when PR 1 was merged, what's true in production now, what the rollback gesture would be if PR 2 introduces problems (revert the dual-write app code; the nullable columns can stay or be dropped in a forward-fix migration — both are cheap because nothing reads them).

Senior calls and watch-outs:

- The migration must be additive only. Any `DROP`, any `NOT NULL` add, any `RENAME` in this PR violates the expand step and the cadence has already broken.
- The columns are nullable for a reason: existing rows have no `subtotal` / `tax` value yet, and the cadence's invariant is that the *expand* migration must apply against the live database without rewriting existing data. The `NOT NULL` promotion comes in PR 2's tail, after the backfill has populated every row.
- `numeric(12, 2)` matches `total`'s existing precision and scale — same domain, same shape, just split. Mismatched precision is a quiet bug source for money columns; the senior reflex is to copy the producer's type exactly.
- The PR's intentionally narrow scope (no app code) is the cadence's structural discipline. The temptation is "while I'm in the schema file, let me also start writing to the new columns" — that conflation makes the rollback story messier and the rehearsal harder. Three PRs, three concerns, three reviews. Stay disciplined.
- Reading the preview build log is the most important habit in the chapter. Every line of `pnpm db:migrate` output is checked once: which migrations applied, did any fail, did the breakpoint produce two statements. The cost is 30 seconds; the value is catching every "but it worked in dev" failure mode.
- If `vercel-build` fails: read the log, identify whether it's the migration or the build. A migration failure means the SQL has a bug — fix and re-push; the Neon branch is deleted and recreated on the next push. A build failure means the type system caught a problem — fix.
- If the preview branch ends up in a bad state (migration half-applied, schema corrupted): close and reopen the PR; the Neon integration deletes and recreates the branch from current `main`. Don't try to repair the branch by hand.

Codebase state at entry: chapter 066 baseline live in production; no migration in flight.
Codebase state at exit: PR 1 merged; production runs the unchanged chapter 066 app code against a schema that has `total` (still NOT NULL), plus `subtotal` and `tax` (both nullable, unwritten). Split-coverage 0%. Inspector confirms. Documented in the runbook. **Runnable — production is healthy on the expand schema.**

Estimated student time: 35 to 50 minutes (most of the time is waiting on CI + Vercel builds; the active work is small).

---

## Lesson 4 — PR 2 (Migrate): dual-write, backfill, dual-read

Lands the structural dual-write in actions, the `coalesce` fall-through in queries, the bounded-idempotent backfill script, the production backfill run, and the `SET NOT NULL` follow-up PR — all while production keeps serving traffic.

Goals:

- Open a new branch `migrate/subtotal-tax-dual-write`. Edit `src/lib/invoices/actions.ts` so `createInvoice` and `updateInvoice` accept `subtotal` and `tax` in their Zod input and write `total = subtotal + tax`. The form-shell ships in this PR too: the single "Amount" input becomes a "Subtotal" + "Tax" pair; existing form posts that still only send `total` are handled with a transitional fallback at the action layer (`subtotal = total`, `tax = 0`) so older clients don't 422 mid-deploy. The Drizzle `set({...})` carries all three columns in one statement — that's the *structural* dual-write the cadence requires.
- Edit `src/lib/invoices/queries.ts` so `listInvoices` and `getInvoiceDetail` surface `subtotal` and `tax` separately, resolved via the dual-read fall-through: `coalesce(invoices.subtotal, invoices.total) AS subtotal` and `coalesce(invoices.tax, 0) AS tax`. Rows that haven't been backfilled or rewritten yet still resolve through the legacy `total` column. `total` is still returned for callers that want the combined amount.
- Write the backfill script at `scripts/backfill_subtotal_tax.ts`. Shape: bounded batches of 1000; idempotent via `WHERE subtotal IS NULL`; sets `subtotal = total, tax = 0` for every legacy row; logs progress every batch; commits per batch; runs against `DATABASE_URL_UNPOOLED` (long-running script needs the unpooled connection). Senior reach: the assumption "legacy `total` rolls into `subtotal` with `tax = 0`" is the modeling choice — in real production data with mixed tax history, the backfill would consult a tax-rate snapshot per invoice; the project commits to the simpler shape and names the trade-off.
- Open PR 2 titled `migrate: dual-write subtotal and tax, backfill, dual-read fall-through`. The PR contains: `actions.ts` edits (dual-write), `queries.ts` edits (dual-read), `scripts/backfill_subtotal_tax.ts` (the script — not yet run), and the form-shell update. No schema migration in this PR (the `SET NOT NULL` migration is held for after the backfill completes; see below).
- Wait for CI + `vercel-build`. The preview deploys; it has its own Neon branch off `main` (which now includes the expand). The preview's branch starts with all rows at `subtotal NULL` and `tax NULL`. Open the preview URL.
- Rehearsal checklist on the preview. (1) Run the backfill against the preview branch directly: `vercel env pull` the preview's `DATABASE_URL_UNPOOLED` (via Project Settings → Environment Variables view), then `DATABASE_URL_UNPOOLED=... pnpm tsx scripts/backfill_subtotal_tax.ts`. Time it; logs show progress; exit code zero. (2) Inspector's split-coverage panel turns green on the preview. (3) Create a new invoice through the preview UI with explicit subtotal and tax inputs — inspector's dual-write probe shows all three columns populated and `subtotal + tax = total`. (4) Edit an invoice — all three columns updated. (5) Inspector's data-integrity diff shows zero divergent rows. (6) Run the queries — `listInvoices` returns `subtotal` and `tax` correctly for backfilled rows (via the new columns) and would return correct values for hypothetical non-backfilled rows (via the fall-through).
- Self-review the diff. Confirm: every mutation site writes all three columns; the dual-read carries `coalesce` exactly; the backfill is bounded and idempotent; no schema migration was added (held for the `SET NOT NULL` step).
- Merge PR 2. Production rebuilds. The new function fleet starts writing all three columns on every mutation; reads use `coalesce`. Production's existing rows still have `subtotal NULL` and `tax NULL`.
- **Run the backfill against production.** From the developer's machine: `DATABASE_URL_UNPOOLED=<prod-unpooled-url> pnpm tsx scripts/backfill_subtotal_tax.ts`. The Neon production branch's unpooled URL is in the production env vars (lift it manually for the script's session; don't commit it). The script runs in batches against ~60 rows in the seed; completes in seconds. Senior reach: in a real 200K-row production table, this would run via Trigger.dev (Unit 13); the project deliberately keeps the seed small so the local-script path is the right reach.
- Open a *second* small PR (`migrate-notnull/subtotal-tax`) — schema migration only — containing `ALTER TABLE invoices ALTER COLUMN subtotal SET NOT NULL;` and `ALTER TABLE invoices ALTER COLUMN tax SET NOT NULL;` with a `--> statement-breakpoint` between them. Each `SET NOT NULL` scans the now-fully-backfilled column; with no remaining nulls, the promotion succeeds. Open as a separate PR so the promotion isn't bundled with the application changes — the discipline of one concern per PR.
- (Alternative path the brief names: the `SET NOT NULL` migration ships in the contract PR alongside the `DROP COLUMN total`. Both paths are correct; the project prefers the separate-PR shape for the explicit reviewability of the promotion step. Named once.)
- Wait for CI + vercel-build on the promotion PR; merge.
- **Verify production keeps working — the second load-bearing observation.** Hit production `/invoices`. List renders with `subtotal` and `tax` resolved via the new columns (the backfilled rows) and the fall-through (none, since the backfill covered everything). Create / edit invoices — dual-write shows in the inspector. Split-coverage 100%. Data-integrity diff zero. The schema promotion succeeded. Sentry quiet. **The cadence's second safety claim is observed empirically: production was healthy throughout PR 2's transition.**
- Update `docs/runbooks/migration-subtotal-tax.md` with the PR-2 state: dual-write live, backfill complete, new columns NOT NULL, contract is the next step.

Senior calls and watch-outs:

- The dual-write must be structural — every mutation site writes all three columns in the same `set({...})` call. Adding a wrapper "write `total` separately later" is the common bug. The Drizzle update with all three columns is one statement; splitting them across two is the divergence source. The inspector's dual-write probe is the rehearsal of this check.
- The backfill runs *after* PR 2's app code is live in production. Order matters: if the backfill ran before the dual-write code was deployed, new mutations between the backfill and the deploy would create rows with `subtotal NULL` / `tax NULL`, breaking the split-coverage invariant. App-code first, backfill second.
- Use `DATABASE_URL_UNPOOLED` for the backfill script — long-running connections do not play well with PgBouncer's transaction-pooled mode (the default for Neon's pooled URL). The unpooled URL routes around the pooler.
- The backfill's idempotency (`WHERE subtotal IS NULL`) is what makes "run it again if something looks off" safe. Without that guard, re-running the script could overwrite a freshly-written `subtotal` from a concurrent mutation. Idempotency is structural safety.
- The `SET NOT NULL` step is fast on small tables; on large tables it takes an `ACCESS EXCLUSIVE` lock and scans the column. For million-row tables, time it on a fresh production-shaped Neon branch before merging — and consider adding a `CHECK (... IS NOT NULL) NOT VALID` constraint first, validating it, then promoting to `NOT NULL` (the lock-free variant). The seed-size project doesn't need that depth; named once.
- Keeping `total` populated at the dual-write step is the transitional bridge: older clients (or older readers we haven't touched yet) still see a valid `total`. In the contract PR, `total` disappears and callers compute the sum at the application layer. Two-step refactor; the bridge keeps the system working for both code shapes.
- Sentry behavior during the deploy of PR 2 deserves a watch. If the dual-write code has a bug at a single mutation site, that site's mutations start producing rows where `subtotal + tax <> total` — the inspector's data-integrity diff or dual-write probe catches it. Make a point of refreshing the inspector during the first 10 minutes after the merge.

Codebase state at entry: PR 1 merged; production has `total` (NOT NULL) plus `subtotal` and `tax` (both nullable), no backfill.
Codebase state at exit: PR 2 + promotion PR merged; production runs app code that writes all three columns on every mutation and reads via `coalesce`; backfill against production completed; split-coverage 100%; `subtotal` and `tax` are NOT NULL. Inspector confirms. Documented in the runbook. **Runnable — production is healthy on the migrate state; ready for contract.**

Estimated student time: 50 to 70 minutes (active work is the dual-write edits, the backfill script, and the production backfill run; CI/build waits add the rest).

---

## Lesson 5 — PR 3 (Contract): drop the old column, promote the new pair

Drops `total`, removes every legacy reference from actions and queries, and verifies production lands on the target schema with the cadence's safety claims intact.

Goals:

- Open a new branch `contract/drop-total`. Edit `src/db/schema.ts`: remove the `total: numeric(...).notNull()` line; ensure `subtotal` and `tax` are `.notNull()` (already true after PR 2's promotion). The schema now matches the target shape.
- Run `pnpm drizzle-kit generate`. Drizzle Kit emits `ALTER TABLE invoices DROP COLUMN total;`. The statement is fast — metadata-only for the column drop itself (Postgres marks the column dropped and reclaims space on `VACUUM`). Single statement; no breakpoint needed unless other ALTERs land in the same migration.
- Edit `src/lib/invoices/actions.ts` and `queries.ts` to remove every reference to `total`. `createInvoice` and `updateInvoice` accept only `subtotal` and `tax`; the transitional `total = subtotal + tax` write is removed, as is the legacy fallback that handled posts with only `total`. `listInvoices` and `getInvoiceDetail` return `subtotal` and `tax` directly — the `coalesce` fall-through is removed. Any caller that wanted the combined amount computes it (`subtotal + tax`) at the application layer or via a Drizzle expression.
- The build catches every miss. Drizzle's typed query builder no longer exposes `invoices.total` — any code reading it produces a type error. Run `pnpm typecheck` locally; fix until green. Run `pnpm test` locally; fix any test fixtures still expecting `total` at the database column level.
- Open PR 3 titled `contract: drop total, finalize subtotal + tax`. The PR contains: the schema edit; the migration SQL with the `DROP COLUMN`; the app-code cleanup in actions / queries; the form-shell cleanup (any remaining "Amount" affordances retired).
- Wait for CI + `vercel-build`. The preview deploy: `pnpm db:migrate` against the preview branch applies migration 0012; build succeeds; preview URL renders.
- Rehearsal checklist on the preview. (1) Migration applied — preview build log confirms; schema-state probe on preview shows `subtotal NOT NULL`, `tax NOT NULL`, no `total`. (2) Migration completed fast (single metadata-only `DROP COLUMN`). (3) App works against the new schema — list renders subtotal and tax directly; create / edit / archive succeed; inspector's dual-write probe now shows only `subtotal` and `tax` (`total` column gone); data-integrity diff has no `subtotal + tax = total` check to make (no `total` to compare against). (4) The old shape is *gone* — confirm by trying a hypothetical raw SQL `SELECT total FROM invoices` in Drizzle Studio: returns a column-not-exist error. The cadence's third step landed.
- Self-review the diff. Confirm: every `total` reference removed (one grep proves it); migration has the `DROP COLUMN` only; tests updated.
- Merge PR 3. Production rebuilds; migration 0012 applies against the Neon `main` branch; the column is dropped; the new function fleet deploys.
- **Verify production keeps working — the final observation.** Hit production `/invoices`. List renders. Create / edit / archive succeed. Inspector on production: schema-state probe shows the target shape; split-coverage 100%; data-integrity diff has no diverging rows. Sentry quiet. **The cadence is complete. Production has been healthy through three deploys.**
- Update `docs/runbooks/migration-subtotal-tax.md` with the closing state.

Senior calls and watch-outs:

- The migration is a single `DROP COLUMN total`. The `SET NOT NULL` promotions for `subtotal` and `tax` already landed in PR 2's promotion PR, so the contract PR's schema move is just the drop. Keeping the contract step minimal is the cadence's payoff: the smallest possible PR for the irreversible move.
- `DROP COLUMN` is metadata-only in Postgres — the column is marked dropped and reclaimed during `VACUUM`. The statement is fast even on large tables; the cost is paid asynchronously during background autovacuum. No lock concern for the cadence's purpose.
- The grep-for-`total` step is structural defense. Drizzle's type system catches Drizzle calls; raw SQL strings or external scripts slip through. One pre-merge grep is the senior reflex. Be careful: `total` is a common English word — scope the grep to `invoices.total`, `i.total`, `invoiceTotal`, etc., or use the typed Drizzle column reference as the search target.
- The runtime risk in PR 3 is *external* readers — any non-app process still reading `total` (a one-off report script, an external integration, an analytics pipeline) breaks at the moment the migration applies. The course-scope project has no external readers; in production-the-real-world, the cadence's contract PR is gated on a sweep of every consumer of the table.
- The migrate step's transitional bridge (writing `total = subtotal + tax` and tolerating legacy `total`-only posts) is what made the contract step's app-code cleanup small. If PR 2 hadn't bridged, PR 3 would also be teaching the form-flow refactor — too much in one PR. The bridge is born to die in PR 3; that's correct.
- This is the only PR in the cadence whose schema move is hard to undo. Rolling back the alias to PR 2's deployment restores the *code* that reads `total`, but `total` is gone — the rollback produces an immediate runtime error. The rehearsal in lesson 6 of chapter 104 makes this concrete; the runbook captures it explicitly.

Codebase state at entry: PR 2 + promotion merged; dual-write live; backfill complete; `subtotal` and `tax` NOT NULL.
Codebase state at exit: PR 3 merged; production runs the final app code against the target schema; split-coverage 100%; `total` column gone; `subtotal` and `tax` NOT NULL. Inspector confirms. Runbook updated. **Runnable — the cadence is complete; production serves the target state.**

Estimated student time: 40 to 55 minutes.

---

## Lesson 6 — Rollback rehearsal and the schema caveat

Promotes the previous production deployment against the contract PR to make the "alias rollback does not undo migrations" caveat concrete, then writes the durable runbook for the four-step gesture.

Goals:

- The cadence is complete; the chapter's final exercise is rehearsing the production rollback gesture against the most consequential PR (PR 3, the contract). The point is not to actually undo the migration — it can't be undone by alias rollback — but to *practice the gesture* so it's available when an incident demands it, and to make the "rollback doesn't undo migrations" caveat concrete.
- Open the Vercel dashboard → Deployments. The current production is the PR 3 merge commit. Find the previous production deployment — the post-PR-2 (post-validation) merge. Click its "..." → "Promote to Production."
- Watch the alias swap. Vercel's UI shows the promotion progressing; in under 30 seconds the production domain re-aliases. Confirm: `curl -sI https://<APP_URL>` returns `x-vercel-id` that matches the post-PR-2 deployment's ID; `/inspector` on the promoted deployment shows the PR-2 commit SHA in the build-source panel.
- **Observe the failure mode.** Hit production `/invoices`. The page renders briefly… then a Drizzle query fails. The promoted PR-2 code reads `total` (the dual-read with `coalesce(subtotal, total)`), but the schema no longer has `total` (PR 3's migration is forward-only and is still applied). Sentry receives the runtime error: "column 'total' does not exist." **This is the load-bearing lesson of lesson 7 of chapter 102.** The alias rollback re-pointed production at older *code*, but the *database* is still on the contract schema. Forward-only migrations mean alias rollback is not a "complete rollback."
- Verify auto-assignment is now off (Vercel sets this automatically after a promote-to-production). Settings → Domains → auto-assignment indicator off. The next merge to `main` will not silently re-ship the contract code.
- Document the gesture in `docs/runbooks/rollback.md`:
  - Step 1: identify the previous green production deployment in the Vercel dashboard (or via `vercel ls --prod`).
  - Step 2: Promote to Production (UI) or `vercel promote <url>` (CLI). Alias flips in seconds.
  - Step 3: verify via `curl -sI` (`x-vercel-id`) and the inspector's commit-SHA panel; check Sentry for error rate.
  - Step 4 (the caveat, in bold in the runbook): "this rollback does NOT undo schema migrations. If the bad deploy ran a forward-only migration, the previous code may now fail against the current schema. Plan a forward-fix migration as the durable resolution."
  - Step 5: open a `git revert` PR for the bad commit (lesson 2 of chapter 100 gesture); merge after CI; the next prod deploy ships the reverted code.
  - Step 6: re-enable auto-assignment from the new prod deployment after smoke-test.
- Re-promote the original PR-3 deployment to restore production to the target state (the cadence's end). Confirm: production back at the PR-3 schema and code; `/inspector` schema-state shows the target shape; Sentry quiet after a refresh window.
- Discuss what would happen in a real incident where this rollback *was* warranted (PR 3 introduced an application-layer bug, not a schema bug): the alias rollback is the right move; the forward-fix is a `git revert` of the PR-3 app-code changes (keeping the schema migration intact) plus shipping a new code-only PR that restores the bug-free behavior against the target schema. The runbook captures this discriminator.
- Discuss the alternative rollback path the chapter does not exercise but names: rolling back the *schema* by writing a forward-fix migration that re-adds `total` as a generated column (`total numeric GENERATED ALWAYS AS (subtotal + tax) STORED`), then shipping app code that reads it — one or two more PRs of forward-fix-cadence. Expensive relative to the alias re-point, cheap relative to a true data-loss recovery; only warranted when the contract was a mistake. Named once for completeness.

Senior calls and watch-outs:

- The rehearsal exists because the gesture is muscle memory. The first time an engineer sees the dashboard during an incident, the UI shouldn't be new. Running the promote-then-re-promote is the cheap rehearsal that pays off the one time it counts.
- The "rollback doesn't undo migrations" caveat is the single most important non-obvious lesson of the chapter. Students who internalize the cadence often assume rollback "just works"; the rehearsal makes the gap concrete by triggering an actual error in production for ~30 seconds during the promote. Recover quickly by re-promoting; learn permanently.
- For high-stakes production environments, the rehearsal would happen in a maintenance window, against a deliberate test deployment, not against live traffic. The course-scope project has no live users, so the 30-second window of broken state is acceptable cost. State this trade-off explicitly so the student doesn't generalize the casualness.
- Sentry's reaction during the rehearsal is the verification — if Sentry doesn't notice, observability is broken. The chapter's launch checklist (lesson 8 of chapter 102) row 2 includes Sentry receiving errors; the rehearsal exercises it on a real (transient) error.
- The runbook in `docs/runbooks/` is the chapter's durable artifact. Long after the migration is forgotten, the runbook is what gets opened at 2 AM. Write it for the future engineer who has none of this context.
- The cadence + the rollback rehearsal close out lesson 7 of chapter 102's instant-rollback mechanic and lesson 1 of chapter 103's forward-only premise as one integrated discipline. The student should be able to articulate: "alias rollback is fast and free for code; schema rollback is slow and expensive forward-fix. The cadence is what keeps the latter rare."

Codebase state at entry: production at the PR-3 target state.
Codebase state at exit: production returned to the PR-3 target state after the rehearsal; `docs/runbooks/rollback.md` written; the student can recite the four-step gesture and the schema caveat. The chapter is done. The launch checklist's eight rows are still green. **Runnable — production is healthy on the target schema; the project is complete.**

Estimated student time: 30 to 45 minutes.
