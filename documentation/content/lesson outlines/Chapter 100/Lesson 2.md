# Chapter 100 — Lesson 2 outline

## Lesson title

Keep: **From green repo to a live production URL**. It names the start state (green repo) and the payoff (live prod URL) — the lesson's whole arc. Sentence case, no markup.

Sidebar short title: **Ship to production**

## Lesson type

**Implementation**

Rationale: the contract admits "a deployment step" as an implementation capability and "a deployment invariant for an ops project" as a verifiable outcome. The deliverable is the live `*.vercel.app` URL plus the filled `docs/runbooks/launch-checklist.md`, and the starter ships `tests/lessons/Lesson 2.test.ts` as a `describe.todo` skeleton the test-coder must turn into real assertions (launch-checklist runbook structure). The student edits exactly one file (the runbook); the rest is dashboard/CLI wiring — so "Coding time" is shaped as ordered infra steps, not a code dump. The test-coder runs for this lesson.

## Lesson framing

The student walks away with the production URL the entire chapter targets and the senior reflex that ships it: the git push is the deploy, production is an alias over an immutable deployment, the env validator is allowed to fail the build loudly before any var is set, and the launch checklist is a recorded gate — not a vibe. Every Unit-20 move (chapters 096–098) converges here once, against this one repo, so that from this lesson on every change ships by git push alone.

## Codebase state

**Entry.** The chapter 062 invoices surface, re-expressed behind a Better Auth email+password / org-onboarding flow, running locally against docker postgres (set up in Lesson 1). The repo is green: CI workflow (`.github/workflows/ci.yml`), env validator (`src/env.ts`), cookie-guard middleware (`src/proxy.ts`), seed data (2 orgs, 5 users, ~60 invoices on the `total` column), and the `/inspector` page all provided in full. Migrations `0000`–`0004` exist; schema carries `invoices.total numeric(12,2) NOT NULL` (no `subtotal`/`tax` yet). No Vercel or Neon account exists. `docs/runbooks/launch-checklist.md` is a stub (table header + three section headers). `tests/lessons/Lesson 2.test.ts` is a `describe.todo` skeleton.

**Exit.** A live production `*.vercel.app` URL serves the chapter 062 surface against the Neon `main` branch (migrations `0000`–`0004` applied by the build command). `main` is branch-protected. The Vercel project is wired: GitHub App scoped to the one repo, build command `pnpm db:migrate && next build`, function region matched to the Neon region, Fluid Compute on, Node.js runtime, Neon integration installed (managed preview `DATABASE_URL` per PR), Vercel Authentication on for previews. Production env vars are set and validated. The preview-per-PR + build-time-migration workflow is verified end-to-end with a throwaway PR. `docs/runbooks/launch-checklist.md` is filled and green across its eight rows. No application file changed; only the runbook was edited. The schema is still `total`-only — the cadence has not started.

## Lesson sections

Render the **Implementation** section list: *Goal + Finished result* (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: take the green repo from Lesson 1 and put it behind a real production URL where every future change ships by git push alone. Then a short paragraph describing the working result: hitting `<project>.vercel.app`, signing in as a seeded admin, the invoices list rendering, and `/inspector` showing the production environment badge + the schema-state probe against the Neon `main` branch.

Figure: a `Screenshot` of the live production `/inspector` showing the `production` environment badge, the build-source line (a real commit SHA), and the schema-state panel listing the `total`-only columns — i.e. production live, cadence not yet started. One screenshot via `Screenshot` (desktop variant); no diagram needed.

### Your mission

Header: **Your mission**.

Coherent prose paragraph (no subsection headers, no implementation hints), weaving:

- **Feature** (deployment terms): wire this repo to deploy on Vercel against a Neon branch-per-PR workflow and produce a live production URL, then record the launch checklist that proves it is safe to call production.
- **Constraints that shape the work:** the git push is the deploy (no human clicks "deploy"); production is an alias over an immutable deployment; the build command must be `pnpm db:migrate && next build` from the *very first* production deploy (set at import time, not after); the env validator runs for real in production and is allowed to fail the first build loudly; `main` is branch-protected before the first PR; the Vercel function region must match the Neon region; secrets never ride a `NEXT_PUBLIC_*` var; the custom-domain step is deliberately skipped (the `*.vercel.app` URL is production for this project).
- **Best practices / traps pre-empted:** deploy once *without* env vars to witness the validator's missing-`DATABASE_URL` failure (discipline lands by seeing it once); the pooled `DATABASE_URL` host contains `-pooler`; preview deployments are gated behind Vercel Authentication; reading the build log to tell a migration failure (SQL bug → fix and re-push) from a build failure (type system caught it).
- **Out of scope:** custom domains (chapter 098 lesson 4), the schema cadence itself (Lessons 3–6), and any rate-limit / security-header / backup / uptime rows (not in this repo).

Then the **requirements checklist** — the only list in the section, rendered with `Checklist`/`ChecklistItem`, each item one verifiable deployment invariant phrased as the outcome (never a file/export), tagged `[tested]`/`[untested]`. The test can only reach the runbook artifact; everything observable lives in dashboards/headers, so most items are `[untested]`.

1. `[tested]` `docs/runbooks/launch-checklist.md` carries all eight checklist rows, each filled with its gesture and evidence, under the runbook's three section headers. *(The launch-checklist runbook structure is what `Lesson 2.test.ts` asserts.)*
2. `[untested]` A live production `*.vercel.app` URL serves the app; signing in as a seeded admin renders `/invoices` and `/inspector`, and the inspector's deployment badge reads `production`.
3. `[untested]` The first deploy attempted with no env vars fails on the env validator's missing-`DATABASE_URL` error; the second deploy (vars set) succeeds with `pnpm install` → `pnpm db:migrate` (applying `0000`–`0004` against Neon `main`) → `next build` in the log.
4. `[untested]` `main` is branch-protected: direct pushes are rejected and a PR with green CI is required before merge.
5. `[untested]` `curl -s https://<APP_URL>/api/health` returns `{ ok: true, db: 'up' }`, and the pooled `DATABASE_URL` host ends in `-pooler` with its Neon region matching the Vercel function region.
6. `[untested]` The deliberate test error (inspector → "Trigger test error") reaches the Sentry dashboard within seconds.
7. `[untested]` `curl -sI https://<APP_URL>` shows an `x-vercel-id` header confirming the alias points at the latest production deployment.
8. `[untested]` A throwaway PR proves the preview workflow end-to-end: four CI jobs + `vercel-build` go green, the preview URL is gated by Vercel Authentication, the inspector badge reads `preview` with the PR's HEAD commit SHA, and Neon shows a `preview/<branch>` branch that auto-deletes when the PR closes.

### Coding time

Header: **Coding time**. One-line directive: wire the deployment against the brief, working the steps in order, then fill and walk the launch checklist; the reference walkthrough below is collapsed in `<details>` to read after attempting it.

Because nearly all work is dashboard/CLI gestures (the student edits only the runbook), the `<details>` body is an ordered procedure, not a code reference. Organize as five `Steps` blocks mirroring the chapter outline's step groups, then close with how every `[untested]` requirement is covered.

**Step group 1 — Create the Neon project.** Free-tier project, single region; course default `aws-us-east-1` (pairs with Vercel `iad1`); default branch `main` is production. Copy both pooled and unpooled connection strings (pooled host contains `-pooler`). Use a `Steps` component; show the two connection-string shapes in a `Code` block (placeholder host, no real creds).

**Step group 2 — Push to GitHub and protect `main`.** Push the starter to a fresh private repo; set the chapter-096-lesson-4 ruleset (no direct pushes, PR + green CI required, ≥1 review — self-attestation in a solo course). Rationale callout (`Aside` tip): the branch rule is what forces the later dual-write through a PR instead of a direct push that would defeat the cadence. Link to chapter 096 rather than re-explain rulesets.

**Step group 3 — Connect Vercel and watch env validation work.** Add New → Project → install Vercel for GitHub scoped to this one repo → Import (Next.js auto-detected). Override Build Command to `pnpm db:migrate && next build` *at import time* (callout: must be present on the first prod deploy; link chapter 098 lesson 5 for the build-time-migration pattern, chapter 099 lesson 1 for why prod-migration-on-every-deploy is safe only under the cadence). Deploy with no env vars → witness the validator failure (callout: intentional; read the build-log failure shape). Add the production env vars `src/env.ts` requires — list them as a table (name / purpose / how to obtain): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the `*.vercel.app` URL once known), `RESEND_API_KEY` (placeholder fine; validated-not-used), `SENTRY_DSN` (real Sentry project from Unit 19), `APP_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`. Note `NODE_ENV` is Vercel-set; never a secret on `NEXT_PUBLIC_*`. Redeploy and read the successful build log (`pnpm install` → `pnpm db:migrate` against Neon `main`, applying `0000`–`0004` → `next build`; route summary). Link chapter 098 lesson 6 for the three-environment / secret-scoping discipline.

**Step group 4 — Match the function region and wire the Neon integration.** Set Function Region to match the Neon region (Project Settings → Functions; `iad1` ↔ `aws-us-east-1`) — callout this is chapter 098 lesson 3's load-bearing diff. Confirm Fluid Compute on + Node.js runtime (defaults). Install the Neon integration (Vercel Marketplace → Neon (Neon-Managed) → Install → select project); confirm the managed Preview `DATABASE_URL` (lock icon, no editable value) at Settings → Environment Variables filtered to Preview. Turn on Vercel Authentication (Settings → Deployment Protection) for previews; confirm the sign-in gate in a private window. Locally: `vercel link`, then `vercel env pull .env.local` to sync the Development scope; confirm `.env.local` is gitignored. Show the two CLI commands in a `Code` block.

**Step group 5 — Confirm the production URL and walk the launch checklist.** Hit `<project>.vercel.app`, sign in as a seeded admin (e.g. `alice@acme.test`, password `inspector-password-12`), confirm the list + the inspector's production badge + schema-state probe + seeded audit tail. Then fill `docs/runbooks/launch-checklist.md` (the only file the student writes) — eight rows, each with gesture + evidence: env validator (green in prod log + the deliberate first-build failure), `/api/health` (`curl` → `{ ok: true, db: 'up' }`; pooled host `-pooler`, region match), Sentry test error (inspector "Trigger test error" → Sentry within seconds), branch-protected `main`, four-job CI gate (+ `audit` + `actionlint`), Neon-branch-per-PR rehearsal (proved by the throwaway PR), production alias (`curl -sI` + `x-vercel-id`), rollback rehearsal (forward-pointer: recorded in Lesson 6 against the contract deployment). Present the eight rows via `Checklist`/`ChecklistItem` so the student ticks each as recorded. Show the `curl` commands and the expected `/api/health` JSON in `Code` blocks.

**Verify the preview-branch workflow** (final part of `<details>`). Open a throwaway PR (branch, trivial copy change e.g. a dashboard/sign-in label, push, open PR). Wait for four CI jobs + `vercel-build` green; visit the preview URL (Vercel Authentication prompt); confirm inspector badge `preview` + `VERCEL_GIT_COMMIT_SHA` matches PR HEAD; in Neon confirm `preview/<branch-name>`. Close the PR without merging; Neon auto-deletes the branch in seconds. Closing rationale paragraph: skipping the custom domain is deliberate; if `vercel-build` fails, read the log to tell a migration failure (fix + re-push; Neon recreates the branch) from a build failure (type system caught something).

`[untested]`-coverage note at the end of `<details>`: every checklist requirement above maps to a step group — requirements 2/5/7 land in step group 5, 3 in step group 3, 4 in step group 2, 6 in step group 5's Sentry row, 8 in the preview-workflow verification. The one `[tested]` requirement (the filled runbook structure) is produced in step group 5.

Code-sample handling summary:
- `Steps` — each of the five step groups.
- `Code` — connection-string shapes, the `vercel link` / `vercel env pull` CLI pair, the `curl` commands, the `/api/health` expected JSON, the build-command override string.
- A `name / purpose / how-to-obtain` env-var table (plain markdown table) in step group 3.
- `Aside` (tip/caution) — the branch-rule rationale, the at-import-time build-command warning, the intentional-first-failure callout, the never-secret-on-`NEXT_PUBLIC_*` warning.
- `Checklist`/`ChecklistItem` — the mission requirements list and the eight launch-checklist rows.
- `Screenshot` — the single finished-result figure.
- No `AnnotatedCode` / `CodeVariants` / `CodeTooltips` (no multi-part source files to dissect — the student edits no application code). No diagram (the flow is a linear procedure prose carries fine).

### Moment of truth

Header: **Moment of truth**. The test command and expected pass:

```sh
pnpm test:lesson 2
```

Expected output: the `Lesson 2` suite passing (the test asserts `docs/runbooks/launch-checklist.md` carries the eight rows under its three section headers — the launch-checklist runbook structure). Show a green pass surface (pass/fail only, per the contract).

Then the by-hand checklist for what the test cannot reach (render with `Checklist`/`ChecklistItem`), one per `[untested]` invariant — mirrors the mission list items 2–8: live URL + admin sign-in + production badge; the first-build env-validator failure then the green second build; branch protection rejecting a direct push; `/api/health` JSON + `-pooler` + region match; the Sentry test error landing; `x-vercel-id` confirming the alias; and the throwaway-PR preview workflow (CI + `vercel-build` green, Vercel Authentication gate, `preview` badge + matching SHA, `preview/<branch>` in Neon auto-deleting on close).

## Scope

This lesson does **not** cover:

- The expand-migrate-contract schema cadence (additive expand, dual-write/backfill/dual-read, contract drop) — Lessons 3, 4, and 5 of this chapter.
- The rollback rehearsal and the "alias re-point does not undo a forward-only migration" caveat — Lesson 6 (the launch-checklist's rollback row is forward-pointed here, recorded there).
- Custom domains and the domain-swap gesture — chapter 098 lesson 4.
- Why each Vercel/Neon move exists (deployment model, build-time migrations, region matching, secret scoping, rollback layers) — chapters 098 (lessons 1, 3, 5, 6, 7) and 099 (lesson 1); this lesson *applies* those moves once against this repo and links rather than re-teaches.
- Rate-limit / security-header / backup / uptime hardening — not present in this project's repo; out of scope per the chapter framing.
