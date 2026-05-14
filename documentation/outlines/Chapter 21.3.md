# Chapter 21.3 — Vercel deployment and going live

## Chapter framing

Chapter 21.3 turns the green CI gate of 21.2 into a running production system. Up to this point `pnpm dev` and the four-job CI have proven the code compiles, types, lints, and tests; none of that is shipping. This chapter wires the repo to Vercel, lands the first production URL, then teaches the platform surface a senior actually configures on day one: region selection so the function sits next to the database, the Node.js runtime as the default, custom domains with auto-provisioned SSL, environment variables scoped to dev/preview/prod, preview deployments that get their own Neon branch via the Native Vercel Integration, instant rollback when `main` ships something broken, and the pre-launch checklist that verifies every safety net the prior units installed is actually wired.

Threads that run through every lesson. **The git push is the deploy** — every PR gets a preview URL with its own database branch; every merge to `main` ships to production; the deploy is not a separate action a human takes. **Defaults the platform gives you on day one** — Node.js runtime, `iad1` region, automatic HTTPS, instant rollback eligibility on every prod-aliased deployment; the senior diff is knowing which defaults to keep and which to change once. **Environment scope is the security boundary** — secrets attach to one environment (production, preview, development); previews never see production secrets; the env validator (Unit 5) fails the build if scope is wrong. **Rollback is the recovery primitive, not the apology** — Vercel's instant rollback re-aliases the prod domain to a previous deployment in seconds; the code-side `git revert` from 21.1.2 follows after. **The launch checklist is structural** — env validation green, error monitoring wired, rate limits live, audit logs writing, security headers set; if a row is unchecked, the app isn't launched. **The platform default is Vercel** — Cloudflare Pages / Netlify / self-hosted get named once.

---

## Lesson 21.3.1 — The Vercel deployment model

Topics to cover:

- **The senior question.** A `git push` lands and something happens on Vercel. What exactly, where, with what side effects? Understanding the model before clicking through the UI prevents the confused "why did my PR ship to production" or "why does my preview have no DB" half an hour in. The lesson lands the mapping from git events to deployments, the production/preview/development environment trio, and what an "immutable deployment" actually means.
- **The mapping.** Push to `main` → a *production* deployment; its URL aliases the production domains. Push to any other branch with an open PR → a *preview* deployment with a generated `*.vercel.app` URL, posted as a PR comment. `vercel dev` locally → the *development* environment, reading dev-scoped vars via `vercel env pull`. Three environments, three scopes; same code, different behavior because env vars differ.
- **Deployments are immutable.** Every push produces a new deployment with its own URL and build artifact. Vercel never overwrites a deployment. "Rolling out a fix" is "creating a new deployment and re-aliasing the production domain to it" — atomic, instant on the aliasing step. This is what makes instant rollback (21.3.7) work: previous deployments are still alive on their original URLs, available to re-alias.
- **The build pipeline at deploy time.** Vercel fetches the commit, runs `pnpm install` then `pnpm build` (`next build`), packages the output into Functions runtime artifacts, deploys globally. The build environment is its own Linux container with env vars scoped to the target environment. The CI gate (Chapter 21.2) runs in parallel, not in series; the deploy doesn't wait for CI by default — when this matters, gate the deploy on CI explicitly.
- **The domains layer.** Production domains (your custom `app.example.com`) alias to whichever deployment is currently "production." `*.vercel.app` URLs are deployment-specific and never change. Think of `app.example.com` as a pointer; deployments are the values; "deploy" means "swap the pointer."
- **Production branch — `main` by default.** Configurable per project. Course uses `main`. Watch-out: changing the production branch mid-project doesn't retroactively re-deploy; the next push to the new branch is the first new prod deploy.
- **Build vs. runtime — the env-var rule.** Variables read at *build time* (`NEXT_PUBLIC_*` inlined into client bundles, env validator, static generation) are baked into the artifact. Variables read at *runtime* (server actions reading secrets) read from the running environment. Changing a `NEXT_PUBLIC_*` requires a rebuild to take effect.
- **What does *not* happen automatically.** No automatic database migration (Drizzle migrations are a separate CI step in 21.4). No automatic external-CDN purge (Cloudflare-in-front needs its own). No automatic secret rotation. The deploy ships code; everything stateful is the engineer's responsibility.
- **Hobby vs. Pro tier.** Hobby: one user, no preview password protection, rollback only to immediately previous. Pro ($20/user/month in 2026): unlimited team, preview password protection, full rollback history, environment-level vars. The course assumes Pro at launch.
- **The Vercel CLI surface.** `vercel` (deploy as preview), `vercel --prod` (rare; git flow is default), `vercel env pull .env.local`, `vercel logs <url>`, `vercel inspect <url>`, `vercel promote <url>`. Reach for it during emergency rollback, local dev with prod-shaped vars, or inspecting a failed build's output.
- **Alternatives, named once.** Cloudflare Pages with Workers, Netlify, AWS Amplify, self-hosted Node. Vercel wins in 2026 because Next.js 16's runtime features are co-developed with it; the course commits to Vercel.
- **The trust model.** Vercel reads from GitHub via OAuth, never has push access. The audit trail lives in GitHub commit history plus Vercel's deployment log. Senior reflex: never run unreviewed scripts at build time — a malicious dep in `pnpm install` runs on Vercel's builder with full env-var access; SHA-pinned actions (21.2) and `minimumReleaseAge` in `.npmrc` are the prevention.
- **Watch-outs:** confusing production branch with production URL — decoupled; pushing to `main` before CI is wired — ships broken code; deploying via `vercel --prod` from a feature branch — bypasses review and CI; expecting env-var changes to apply to existing deployments — only new builds; treating `*.vercel.app` URLs as stable shareable links — they're deployment-specific.

What this lesson does not cover:

- First-deploy mechanics — 21.3.2; runtime/region — 21.3.3; domains — 21.3.4; preview+Neon — 21.3.5; env scoping — 21.3.6; rollback — 21.3.7; launch checklist — 21.3.8; schema migrations — Chapter 21.4.

Estimated student time: 35 to 45 minutes. Concept; the mental model the rest of the chapter wires into the platform.

---

## Lesson 21.3.2 — First deploy: from repo to a live URL

Topics to cover:

- **The senior question.** What's the smallest set of clicks that takes a green-CI repo to a production URL — and what defaults does Vercel pick along the way that need a second look before they ossify?
- **Prerequisites.** GitHub repo with the Next.js 16 starter and a green `main` (CI gate from 21.2 is live). Vercel account. `package.json` declares `"packageManager": "pnpm@9.x"` so Vercel auto-detects pnpm.
- **The "Import Git Repository" flow.** Vercel dashboard → Add New → Project → Install Vercel for GitHub (OAuth — scope to specific repos, not the whole org). Select repo → "Import." Vercel auto-detects Next.js and fills Build Command (`next build`), Output Directory (`.next`), Install Command (`pnpm install`). Scope the GitHub App narrowly at install time; broadening later is a Settings change, narrowing isn't always possible without re-install.
- **The Configure Project screen.** Project name (becomes the `*.vercel.app` subdomain; rename later costs the old URL). Framework Preset (auto-detected, leave). Root Directory (`./` for single-app; subdirectory for monorepo). **Skip env vars on first deploy** — added in 21.3.6. Click Deploy.
- **What the first build looks like.** Build log streams in the dashboard. Read it top to bottom once: `pnpm install` warnings, `next build` route summary (static vs. dynamic), function bundle sizes. The Static/Dynamic Routes breakdown is the snapshot of the app's perf profile.
- **The first production URL.** `<project-name>.vercel.app` becomes the production deployment URL. Live on the public internet. Custom domain (21.3.4) replaces this as primary.
- **Automatic re-deploy on subsequent pushes.** Next push to `main` triggers a production rebuild. PR pushes trigger preview builds. The Vercel-on-GitHub bot comments on each PR with the preview URL. No human clicks in the dashboard for normal operation.
- **The first preview URL.** Open any PR. Bot comments: "Visit Preview" → `your-app-git-<branch>-<org>.vercel.app`. Fully functional, billed against the project. **At this point** (before 21.3.5) the preview shares the production database — don't run destructive operations against it.
- **The Deployments list.** Dashboard → Deployments. Each row: commit SHA, branch, status, environment, age. First place to check when something looks wrong; the green "Production" badge marks the live one.
- **`vercel.json` — when to add it.** Unnecessary for the default Next.js project on Node.js runtime. Reach for it for: `headers` security headers (21.3.8), per-route runtime override, `crons` (use Trigger.dev instead — Unit 13). Most SaaS projects ship with no `vercel.json` or a 10-line one.
- **`vercel link` and `vercel env pull`.** Run `vercel link` once per repo from the root to associate the local directory with the Vercel project; stored in `.vercel/` (gitignored). Then `vercel env pull .env.local` syncs the Development-scoped variables to `.env.local`. Replaces the historical `.env.example`-and-manually-fill ritual; every dev runs this on clone.
- **The deployment notification surface.** GitHub commit status checks (build pass/fail dot), GitHub PR comments with preview URLs, optional Slack via Settings → Integrations. The CI gate's checks (21.2) and Vercel's build check live side by side on each PR. Both must be green to merge.
- **Watch-outs:** broad GitHub App permissions at install — scope to one repo; project name typos — subdomain renames hurt; first preview hitting prod DB — destructive ops dangerous until 21.3.5; sharing `*.vercel.app` URLs as production — get a custom domain first; missing `packageManager` field — falls back to npm.

What this lesson does not cover:

- Deployment model — 21.3.1; runtime/region — 21.3.3; domains — 21.3.4; preview+Neon — 21.3.5; env scoping — 21.3.6; rollback — 21.3.7.

Estimated student time: 40 to 50 minutes. Setup/wiring; the "now your code is on the internet" lesson.

---

## Lesson 21.3.3 — Regions, runtime, and Fluid Compute

Topics to cover:

- **The senior question.** Three platform knobs determine cold-start, latency, and bill: which region runs the function, which runtime (Node.js vs. Edge), and whether Fluid Compute is on. Defaults are mostly right for a 2026 SaaS — the senior diff is knowing the one to turn (region matching the database) and the two to leave alone (Node.js runtime, Fluid Compute on).
- **The single-region rule for SaaS.** Vercel Functions execute in one region by default — `iad1` (Washington, D.C.). For SaaS with one database, **the function region must match the database region**; otherwise every server action pays a cross-region round trip. The Neon DB from Unit 6 was deployed to a specific region; match it. Project Settings → Functions → Region. Multi-region functions are a Pro+ feature for global SaaS with regional DBs — out of scope.
- **The Node.js runtime as the default.** Vercel Functions ship on Node.js in 2026. Full Node.js API surface, native modules, all npm packages, streaming. 15s timeout on Hobby, up to 15 min on Pro. 4.5 MB payload. **The default the course commits to** for every server action, route handler, and RSC fetch.
- **The Edge Runtime — niche, named.** V8 isolates at every POP worldwide. Lower cold start (~5ms vs ~100ms), lower per-invocation cost, but ~1 MB payload, no Node-only packages, no file system, HTTP-only DB drivers (Neon's HTTP driver is one of the few real options). Earns weight only for: `middleware.ts` (Edge by default — geolocation, A/B tests), tiny stateless POP-proximity endpoints. **Cut from the SaaS default**; reach only when measured latency on the affected path is the reason. Per-route opt-in: `export const runtime = 'edge'`.
- **Fluid Compute — what it changes.** Vercel's 2025 evolution. Default-on since April 2025. Same Node.js runtime, but: one instance handles multiple concurrent requests instead of one-per-request; idle time during external waits (DB, fetch) reused for other requests; cold starts drop 5–10x in steady-state. SaaS workloads dominated by I/O see real cost and latency improvements without code changes.
- **The Fluid Compute concurrency knob.** Per-function concurrency limit, default 1. For I/O-bound routes (most SaaS) raise to 5–20. For CPU-bound (image processing, heavy compute) keep at 1. Set in `vercel.json` (`functions.<glob>.maxConcurrency`) or per-project. The default is conservative; raise once the traffic profile is known.
- **The shared-state watch-out.** With concurrent requests on one instance, module-level state is now shared across concurrent invocations. The Drizzle client case is fine — connection-pooled and thread-safe. An in-memory LRU can leak request scope (request A reads cache populated by request B). Anything at module scope must be safe for concurrent reads; per-request state goes in function locals or `AsyncLocalStorage`.
- **Function memory, CPU, payload, timeout.** 1024 MB default, configurable to 3009 MB. Memory and CPU scale together. 4.5 MB request body limit; 25 MB chunked streaming response. Uploads larger than 4.5 MB route through R2 presigned URLs (Chapter 13.4) — file never traverses Vercel. Hobby 10s timeout, Pro 60s default up to 15 min. Anything plausibly slow goes async (Trigger.dev, Unit 13); the timeout is the canary, not the budget.
- **The build output check.** After `next build`, the route summary shows static vs. dynamic and function size. Functions over 1 MB warrant a look — usually a big dep accidentally pulled into a server action's transitive graph. Vercel surfaces oversize as build warnings.
- **The `instrumentation.ts` hook.** Next.js 16's entry point for server startup work — Sentry init, structured-logger init, OpenTelemetry tracers. Runs once per cold start. Wired in Unit 20; named here.
- **Watch-outs:** function region mismatched with DB region — every request pays cross-region latency; defaulting to Edge for "speed" — most SaaS routes lose more on Node-package limitations than they gain on cold start; raising `maxConcurrency` without auditing module-scope state — request bleed; long-running server actions parking against the timeout — Trigger.dev is the answer; Edge middleware expected to access a Node-only DB driver — it can't.

What this lesson does not cover:

- Deployment model — 21.3.1; first deploy — 21.3.2; domains — 21.3.4; preview+Neon — 21.3.5; background jobs — Unit 13; Sentry — Unit 20.

Estimated student time: 35 to 45 minutes. Decision + Concept; the region match and runtime default are the load-bearing diffs.

---

## Lesson 21.3.4 — Custom domains and SSL

Topics to cover:

- **The senior question.** The `*.vercel.app` URL is a development artifact. Going live means a custom domain with a valid certificate and DNS that points correctly. What's the smallest set of records to set, what does Vercel handle automatically, and what's the failure mode when DNS propagation is mid-flight?
- **Apex vs. `www`.** Apex (`example.com`) — short, the canonical brand. `www` (`www.example.com`) — some DNS providers don't support apex-level CNAMEs (workaround: ANAME/ALIAS or Vercel-issued A records). Pick one as canonical, 301-redirect the other. Apex is the default; the choice is one-time, flip-flopping is migration pain.
- **Adding the domain in Vercel.** Project Settings → Domains → Add. For apex: `A` record to Vercel's anycast IP (check current value in UI). For `www` or subdomain: `CNAME` to `cname.vercel-dns.com`. Add both, redirect one to the other.
- **The DNS-propagation wait.** From "added at registrar" to "Vercel sees it" can take seconds to hours depending on TTL. Vercel polls; the dashboard shows status. SSL provisioning kicks off automatically once DNS resolves. Lower TTL to 300 seconds before adding records, restore to 3600+ after stable.
- **Automatic SSL via Let's Encrypt.** Vercel provisions a Let's Encrypt cert automatically once DNS resolves. No upload, no manual renewal — auto-renews before expiry. Modern TLS (1.2 and 1.3) by default. Custom cert upload is Enterprise-only.
- **HTTPS-only enforcement.** Vercel auto-redirects HTTP → HTTPS on custom domains. The HSTS header (`Strict-Transport-Security`) needs to be set explicitly in the app's response headers — Vercel doesn't add it. The launch checklist (21.3.8) names this.
- **Cloudflare-in-front pattern.** Many SaaS teams put Cloudflare in front of Vercel for WAF, DDoS protection, custom edge logic, analytics. Setup: domain's nameservers at Cloudflare; Cloudflare proxies to Vercel via CNAME with proxy-on (orange cloud). **Watch-out: SSL mode must be "Full (strict)"** — anything less is broken or insecure. Both Cloudflare and Vercel terminate TLS; "Full (strict)" validates Vercel's cert end-to-end.
- **The canonical redirect.** Both apex and `www` added to the project; Vercel marks one canonical and 301-redirects the other. Pick before shipping links externally.
- **Subdomain patterns for SaaS.** `app.example.com` for the application, `docs.example.com` for docs, `<tenant>.example.com` for tenant-isolated subdomains (Unit 10 — named once). Wildcard `*.example.com` CNAME issues a wildcard cert; reach for dynamic tenant subdomain provisioning, out of scope here.
- **The verification record dance.** Transferring a domain on another Vercel project may require a TXT verification record. Add at the registrar, verify, proceed. Don't remove the TXT — Vercel re-checks periodically.
- **The "is the domain ready" checklist.** Five checks before declaring done: DNS resolves to Vercel from an external resolver (`dig +short example.com @1.1.1.1`); HTTPS responds with a valid cert (`curl -sI https://example.com`); HTTP redirects to HTTPS (308/301); the canonical redirect works (`curl -sIL https://www.example.com`); the browser sanity check.
- **Domain transfers and cutovers.** Lower TTL ahead of time; prepare records at Vercel before flipping. SSL provisioning happens *after* DNS resolves — minutes of partial propagation. Cutover during low traffic; have the DNS-revert rollback ready.
- **Watch-outs:** apex CNAME at a registrar that doesn't support it — use ANAME/ALIAS or Vercel's A record; not enforcing one canonical — search engines see two sites; Cloudflare SSL on "Flexible" — insecure; missing HSTS — implicit HTTPS-only but no browser preload; removing verification TXT records — Vercel may de-verify; cutover with high DNS TTL — extended propagation pain.

What this lesson does not cover:

- Deployment model — 21.3.1; runtime/region — 21.3.3; preview deployments — 21.3.5; security headers — 21.3.8 / Chapter 17.2; tenant-subdomain routing — Unit 10.

Estimated student time: 30 to 40 minutes. Setup/wiring + Decision; DNS records and the apex-vs-www call are the load-bearing pieces.

---

## Lesson 21.3.5 — Preview deployments with a Neon branch per PR

Topics to cover:

- **The senior question.** A PR's preview URL is only useful if it exercises a database that's shaped like production but isn't production — otherwise the preview shares prod data (test inserts pollute prod, destructive migrations corrupt prod) or has no DB and half the app fails. The lesson lands the Native Vercel Integration with Neon, which copy-on-write-branches the production DB per preview deployment, plus the lifecycle (branch created on PR open, destroyed on close).
- **The default before the wiring — shared DB.** Out of the box, all environments read the same `DATABASE_URL`. Whatever's in production is what previews see. **Dangerous.** Migrations in a feature branch's preview apply to production. Destructive seed scripts ruin real data. Never accept this state past day one; wire the integration immediately.
- **Neon branching, the model.** Neon's storage layer is copy-on-write. A branch is a logical pointer at a snapshot of the parent's data; reads serve from the parent until a write happens, at which point the branch diverges. Result: branches are instant to create (no data copy), nearly free to keep idle, fully isolated for reads and writes. Production stays at the `main` branch; previews branch off `main`.
- **The Native Vercel Integration.** Installed once via Vercel Marketplace → Integrations → Neon. Pairs the Vercel project with a Neon project. From then on: every preview deployment triggers a webhook to Neon; Neon creates a branch named `preview/<git-branch>` off production; Vercel injects the branch's connection string into that preview deployment's `DATABASE_URL` (per-deployment scope); when the PR closes/merges, the branch is deleted automatically.
- **The wiring, step by step.** Vercel → Integrations → Browse Marketplace → Neon → Install → select the project. Authorize Neon. The integration adds `DATABASE_URL` to the Preview environment as a "managed" var (Vercel won't let you edit manually — overwritten per deployment). Production's `DATABASE_URL` stays untouched. One-time setup.
- **Vercel-Managed vs. Neon-Managed Integration.** Functionally equivalent for the preview-branching feature. Vercel-Managed — Neon provisioned and billed through Vercel; suited for greenfield. Neon-Managed — Neon is the system of record; Vercel pulls connection strings; billing stays on Neon. Course default: Neon-Managed (matches Unit 6's setup).
- **Schema migration on preview branches.** When a PR's `drizzle/migrations/` changes, the preview's DB starts as a copy of production *before* the migration. The preview's build needs to run the migration against the preview branch before the app boots. Standard wiring: `pnpm db:migrate` runs as part of `next build` via the Build Command override (`pnpm db:migrate && next build`) or a `prebuild` script. Reads the deployment's `DATABASE_URL` (the preview branch), applies migrations. Chapter 21.4 owns the safety story; this lesson treats migrations as a black box.
- **Production caveat on the build-command migration.** With migrations in the build command, every prod deploy runs migrations against `main`'s database. Safe with the expand-migrate-contract cadence (Chapter 21.4), risky with a naive destructive migration. Senior call: migrations in build command for previews; production migrations gated through a CI "migrate" job with explicit approval. Chapter 21.4 owns the full story.
- **The preview-branch lifecycle.** On PR open: Neon branch created. On every push to the PR: same branch is updated (migrations re-run). On PR merge/close: branch deleted (configurable; default delete). Don't store anything in a preview branch you need to keep — ephemeral by design.
- **The seed-data shape for previews.** Production has real data; previews inherit it. Sensitive PII in the preview branch is a leak surface — preview URLs are technically public unless password-protected. Senior reflexes: (1) enable preview password protection on the Vercel project (Pro+); (2) for sensitive industries, branch from a sanitized snapshot instead of production. Course default: password-protect, accept the cloned-production shape for non-sensitive data.
- **The preview-password protection.** Vercel Settings → Deployment Protection → Preview Deployments → Password Protection. One password per project. Free on Pro+. Turn on before sharing the first external preview.
- **The Neon branch limit.** Per-project cap (varies by plan, typically 100+). Closed PRs' branches auto-delete; abandoned PRs accumulate. Dependabot opens many PRs — usually still fine because they merge or close fast.
- **The development environment.** Local dev uses its own `DATABASE_URL` (typically a separate Neon branch named `dev`). `vercel env pull` syncs the dev-scoped var. Three environments — dev (one branch you control), preview (one branch per PR, auto-managed), prod (the `main` branch) — fully isolated.
- **The fallback when not on Neon.** Self-hosted Postgres or RDS doesn't offer copy-on-write branching natively. Alternatives: a per-PR DB created by a CI script (heavy); a shared staging DB (defeats the point); accept prod-shared (only for non-destructive PRs). Neon's branching is why it's the course default — no other Postgres host offers this in 2026 as a first-class feature.
- **Watch-outs:** previews sharing prod DB by default — never accept; preview URLs publicly accessible — turn on password protection; migrations not run against the preview branch — schema mismatch at runtime; abandoned PRs filling the branch cap; copying-prod-data leaking PII into previews; auto-delete-on-close losing debug data — copy it out before closing.

What this lesson does not cover:

- Deployment model — 21.3.1; env variable scoping — 21.3.6; rollback — 21.3.7; expand-migrate-contract — Chapter 21.4; Drizzle framework — Unit 6; tenant-data isolation — Unit 10.

Estimated student time: 40 to 50 minutes. Setup/wiring + Concept; the per-PR Neon branch is the chapter's load-bearing safety primitive.

---

## Lesson 21.3.6 — Environment management: dev, preview, prod, and secret scoping

Topics to cover:

- **The senior question.** Three environments each have their own set of env vars; some are shared, some scoped to one. Where does each variable belong, who can read it, and how does the env validator from Unit 5 enforce that the build fails when something's missing?
- **The environment trio.** Production — `main` deployments. Preview — every other branch's deployments. Development — `vercel dev` or local `pnpm dev` reading `.env.local`. Each has its own variable scope; Vercel's UI lets you check each variable's applicability per scope.
- **The three scoping patterns.** (1) **Same value across all three** — e.g., `NEXT_PUBLIC_APP_NAME`. Rare. (2) **Different value per environment** — e.g., `STRIPE_SECRET_KEY` is the test key in dev/preview, the live key in production. **The dominant pattern.** (3) **Set in some, absent in others** — a feature flag exists only in preview to test pre-launch.
- **The secret-vs-public split.** Variables prefixed `NEXT_PUBLIC_*` are inlined into the client bundle at build time — visible to anyone who views the deployed app. Variables without the prefix are server-only. Prefixing a secret with `NEXT_PUBLIC_` exposes it (one in five Next.js apps has this mistake). The env validator below is the fix.
- **The env validator (`@t3-oss/env-nextjs` or similar).** Introduced in Unit 5. At app boot, a Zod schema validates `process.env` against an explicit shape: `server: {...}`, `client: {...}`, `runtimeEnv: {...}`. Build fails if a required server var is missing. Enforces the prefix split — a `STRIPE_SECRET_KEY` declared in `client:` fails type-check. **The structural enforcement is the senior diff** — discipline is humans-forgetful; the validator is mechanical.
- **`SKIP_ENV_VALIDATION` — narrow use.** Set *only* in CI typecheck/lint/test jobs where build-time env access doesn't matter. Never in the production build or at runtime. Production must boot with validation on.
- **Setting variables in the dashboard.** Project Settings → Environment Variables. Each var: key, value, environments (checkboxes), optional Git Branch filter. Variables apply to *new* deployments only; redeploy to pick up changes.
- **Managed variables.** Some integrations inject vars you can't edit by hand. The Neon integration (21.3.5) manages `DATABASE_URL` in Preview. Vercel marks these; editing requires uninstalling. Managed vars are correct by construction — don't fight them.
- **Build vs. runtime variables.** Build-time vars are read during `next build` (env validator, static pre-rendering, `NEXT_PUBLIC_*` inlining). Runtime vars are read during request handling. Changing a `NEXT_PUBLIC_*` requires a rebuild; changing a server-only var takes effect on the next deploy (or function cold-start).
- **OIDC for cloud credentials.** Historically: copy a long-lived AWS IAM access key into a Vercel env var — a static secret with broad blast radius. 2026 pattern: **OpenID Connect federation**. Vercel issues a short-lived JWT (`VERCEL_OIDC_TOKEN`) per function invocation; the cloud provider trusts Vercel's OIDC IdP; the function exchanges the JWT for short-lived cloud credentials. No long-lived secrets in Vercel. Reach when the app talks to AWS/GCP/Azure. Setup is one-time per provider; course-default for AWS/R2 setups (Chapter 13.4 wired R2 with API keys; OIDC upgrade is named here, deferred).
- **`vercel env pull` — the dev sync.** `vercel env pull .env.local` writes Development-scope vars to `.env.local`. Rerun when the team adds a var. Gitignored. Every dev runs this on clone; Vercel's Development scope is the source of truth, not committed `.env.example` files.
- **The `.env.example` complement.** Even with `vercel env pull`, ship `.env.example` listing every key (placeholder values) so a contributor without Vercel access knows what's needed. Documentation; `vercel env pull` is the actual values.
- **Per-environment service keys.** Every external service (Stripe, Resend, PostHog) has dev/test keys and live keys. Dev and preview use test keys; production uses live. Mistakes mean test charges in production or live emails from preview. Set the variable thrice with the appropriate scoping.
- **Secret rotation workflow.** Generate the new secret at the provider; add as a new env var in Vercel (e.g., `STRIPE_SECRET_KEY_V2`); deploy code reading the new name; remove the old var; delete the old secret at the provider. Three deploys. Changing the value of an existing var without redeploying leaves old deployments using the old value.
- **The preview/production security boundary.** A malicious PR can't exfiltrate production secrets via its preview build — Vercel scopes preview deployments to the Preview environment's variables only. Production secrets are not available to preview builds. The structural reason external-contributor PRs are safe.
- **Audit trail.** Vercel logs env-var changes (who, what, when) in the team's audit log (Pro+). Scan after a credential issue to verify the change-and-rotate timeline.
- **Watch-outs:** `NEXT_PUBLIC_` on a secret — leaked in the client bundle; env validator off in production — runtime crashes on missing vars; same Stripe key across dev and prod — test or live charges in the wrong env; long-lived AWS credentials in Vercel — OIDC is the answer; not redeploying after `NEXT_PUBLIC_*` change — old bundle still has the old value; preview environment with production secrets attached — defeats the security boundary; committed `.env.local` — rotation, not deletion.

What this lesson does not cover:

- Deployment model — 21.3.1; preview+Neon — 21.3.5; rollback — 21.3.7; the validator schema in detail — Unit 5; Stripe webhook secrets — Unit 12; full rotation playbook — Chapter 17.2.

Estimated student time: 40 to 50 minutes. Pattern + Decision; the scope split and OIDC reflex are the load-bearing diffs.

---

## Lesson 21.3.7 — Production rollback: instant promote and the code-side revert

Topics to cover:

- **The senior question.** `main` shipped something broken. Production is on fire. What's the fastest path back to a known-good state, what does it not undo, and how does the code-side `git revert` close the loop?
- **The two-layer model.** **Layer 1 — the deployment alias.** Production's domain points at one Vercel deployment at a time. Rolling back the alias is instant — re-point at the previous good deployment, traffic flips. **Layer 2 — the code on `main`.** Git history still shows the bad commit. Until `git revert` lands undoing it, the next deploy from `main` redeploys the broken code. Both layers must move. Alias first for speed; revert second for durability.
- **Instant rollback — the mechanic.** Vercel dashboard → Deployments → find the last-known-good → "..." → "Promote to Production." The deployment is re-aliased to the production domain. Traffic flips within seconds (CDN edge cache may need brief invalidation, < 30s). **No rebuild** — the previous artifact is still alive; promotion just changes which one the domain points to.
- **What rollback resets — and what it doesn't.** **Resets**: the code, the function bundle, the static HTML, the env vars as they were at that deployment's build time. **Doesn't reset**: database state (any rows the broken deploy created/modified stay), external side effects (emails sent, Stripe charges, webhooks dispatched), the project's *current* env vars. The data-state fix is its own problem.
- **Auto-assignment off after rollback.** After a rollback, Vercel disables auto-assignment of the production domain to new pushes — so another push to `main` doesn't immediately re-ship the broken code. Re-enable from the now-promoted deployment after the fix is on `main` and the next prod deployment is verified.
- **The CLI primitives.** `vercel rollback` (immediately previous only). `vercel promote <url>` (specific deployment — the durable way to roll back to a *specific* known-good). `vercel ls` (list deployments). Reach for the CLI when the dashboard is slow or rollback is part of an incident-response script.
- **Eligibility.** Only deployments previously aliased to production are rollback-eligible. Preview deployments aren't. Every prod deployment that runs even a minute is a future rollback target. Hobby is limited to immediately-previous; Pro+ allows any prod-aliased.
- **The code-side `git revert`.** From 21.1.2: `git revert <bad-sha>` creates a new commit applying the inverse. PR as normal (or direct to `main` with team consent). The CI gate (21.2) gates the revert PR — yes, it slows emergency response, but bypassing it on revert is a habit-corruption risk; keep the gate, trust the four-minute build.
- **The full incident-response runbook (one shape).** (1) Detect — alert fires. (2) Triage — confirm broken, identify bad deployment. (3) Rollback the alias — verify traffic flips. (4) Communicate — status page / Slack / customer comms. (5) Revert the code — PR, review, merge. (6) Re-enable auto-assignment — only after the next prod deploy from reverted `main` is verified. (7) Postmortem — what got past CI, what's the structural fix. Runbook lives in `docs/runbooks/`; named here, owned by Unit 22.
- **Database state on rollback.** If the bad deploy ran a destructive migration, alias rollback doesn't undo it. Drizzle migrations are forward-only. The expand-migrate-contract cadence (Chapter 21.4) is specifically designed to prevent this — every migration step is reversible by the next deploy *without* a code rollback. If a non-cadence migration shipped and broke things: write a forward-fix migration; don't rewind.
- **The feature-flag escape hatch.** If the bad behavior is gated behind a feature flag (PostHog from Unit 20.2.4), flipping the flag off is faster than rollback — no deployment changes, no DNS, no CDN cache. Ship risky features behind a flag; the rollback story for flagged code is "flip the flag." The strongest preventive layer.
- **Rolling releases — named, deferred.** Vercel's gradual-rollout (Pro+) sends a percentage of traffic to a new deployment, ramping over time; auto-rollback on error spike. Useful at high traffic; overkill for sub-100k-MAU. The default is full cutover with fast rollback.
- **Deployment-protection-during-rollback.** Settings → Deployment Protection → freeze pushes. Prevents a teammate's fix-attempt from queueing during the incident. Reach during incidents; revert after.
- **Downstream caches.** Cloudflare-in-front has its own cache; instant rollback at Vercel doesn't purge it. Include a Cloudflare purge call in the runbook, or set short TTLs on dynamic content. Same applies to any CDN above Vercel.
- **Post-rollback verification.** After the alias flip: hit the production URL, verify the fix, watch Sentry's error rate drop to baseline. Rollback isn't done until the dashboard confirms.
- **Watch-outs:** rolling back the alias but leaving the bad commit on `main` — next push re-ships; not re-enabling auto-assignment after the fix — `main` deploys silently fail to take effect; assuming rollback undoes migrations — it doesn't; `vercel rollback` when the bad commit isn't latest — use `vercel promote <url>`; preview deployments expected rollback-eligible — they're not; rolling back while a fix-push races — freeze first; downstream caches ignored; weekly rollbacks — CI is failing its job.

What this lesson does not cover:

- Deployment model — 21.3.1; env scoping — 21.3.6; migration cadence — Chapter 21.4; `git revert` — Lesson 21.1.2; postmortems — Unit 22; feature flags — Unit 20.2.

Estimated student time: 35 to 45 minutes. Pattern + Setup; the two-layer rollback and the database caveat are the load-bearing pieces.

---

## Lesson 21.3.8 — The launch checklist

Topics to cover:

- **The senior question.** Every unit installed a safety net; this is the lesson that confirms each is wired before the URL goes public. The checklist is structural — every row maps to a concrete thing the engineer verifies in one minute. Uncheck any row and the app isn't launched, regardless of how the homepage looks.
- **The mindset — launch is not done at the URL.** The first production URL was live by 21.3.4. Launch means the URL is *defensible* — the app degrades gracefully on errors, doesn't leak data, doesn't fall over under load, has someone watching when it does.
- **Row 1 — Env validation green in production.** Verify: production build logs show env-validator passed; `SKIP_ENV_VALIDATION` is not set in production. A missing required env var means the first runtime call fails with an opaque error; the build-time validator catches it before the deploy. Cross-ref: 21.3.6.
- **Row 2 — Error monitoring wired and receiving.** Verify: Sentry initialized in `instrumentation.ts`; a deliberate test error in production shows in the Sentry dashboard within seconds; source maps uploaded so stack traces are readable. Errors invisible to the team compound. Cross-ref: Unit 20.1.
- **Row 3 — Rate limits live on the abuse surface.** Verify: auth endpoints (sign-in, sign-up, password reset, magic link) are rate-limited via Upstash from Unit 15.4; a script hitting `/api/auth/sign-in` 50 times in 10 seconds gets 429s after threshold. Unrated auth endpoints are credential-stuffing targets on day one. Cross-ref: Unit 15.4.
- **Row 4 — Audit logs writing.** Verify: every privileged action (org-membership changes, role changes, billing, data exports) writes a row to the audit table from Unit 10.2; `select * from audit_log order by created_at desc limit 10` shows recent activity. Missing rows mean compliance and incident-response fly blind. Cross-ref: Unit 10.2.
- **Row 5 — Security headers set.** Verify: `curl -sI https://app.example.com` returns `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Vercel doesn't add these by default. Wiring: `next.config.ts` `headers()` for static headers, `middleware.ts` for nonce-based CSP. Full CSP authoring lives in Chapter 17.2; the launch checklist verifies presence, not authorship.
- **Row 6 — Database pooling and matching region.** Verify: Drizzle uses Neon's pooled connection string (`-pooler` in the hostname); production function region matches the DB region (21.3.3). Unpooled connections exhaust the database under load; cross-region functions pay 80ms+ per query. Cross-ref: 21.3.3, Unit 6.
- **Row 7 — Backups on and tested.** Verify: Neon's automated backup retention set (default 7+ days on Pro); a test restore to a Neon branch succeeds. A never-restored backup is hopeful, not verified.
- **Row 8 — External uptime monitoring.** Verify: an external monitor (Better Stack, Pingdom, UptimeRobot) hits `/api/health` every 1 minute and pages on failure; the page reaches a real human. Sentry catches errors the app reports; uptime catches the app being down entirely. Two layers, both required.
- **The `/api/health` endpoint.** Ship a lightweight route handler verifying the DB is reachable, returning 200, no auth required. The uptime monitor hits this; Vercel doesn't ship one by default. ~10 lines, owned by this lesson.
- **The security-headers snippet.** In `next.config.ts`, `async headers()` returning the headers for `/(.*)`: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` scoped narrowly (no camera/mic/geo unless used), `Content-Security-Policy` (strict start; nonce-based for inline scripts needs middleware).
- **Row 9 (soft) — Runbooks for the top three incidents.** Verify: `docs/runbooks/` contains markdown for (1) production rollback, (2) database restore, (3) credential rotation. Under one page each. Incidents happen at 2 AM; the engineer paged needs a checklist, not a memory test. Cross-ref: Unit 22.
- **The "is anyone watching" question.** A safety net nobody reads is not a safety net. Verify: error alerts route to a Slack channel or email a human checks within an hour business-hours; uptime alerts wake someone outside hours. Escalation explicit; on-call known.
- **First-week practice.** Daily checks for the first week: Sentry's new-error count, audit log growth, rate-limit dashboard for unusual spikes, function-error rate. Most launch problems surface in 72 hours; budget the time.
- **What the checklist doesn't claim.** Not feature-complete (by design). Not bug-free. Not architecturally final. Claims: safety nets wired, so when something goes wrong, the team sees it, can roll back, can audit, doesn't lose data.
- **Watch-outs:** checklist completed once, never re-run — re-verify quarterly; alert fatigue from over-tuned monitoring — tune to actionable signals; security headers split across `vercel.json` and `next.config.ts` — pick one canonical home; backups never tested; uptime monitor on the same infrastructure as the app — must be external; runbooks unread by on-call — print, tabletop them; missing health endpoint — uptime blind to "DB down but app up."

What this lesson does not cover:

- Rollback mechanic — 21.3.7; Sentry — Unit 20.1; rate limiting — Unit 15.4; audit log schema — Unit 10.2; full CSP — Chapter 17.2; runbook templates — Unit 22.

Estimated student time: 45 to 55 minutes. Reference/survey + Pattern; the eight-row checklist with verification steps is the load-bearing artifact.

---

## Lesson 21.3.9 — Chapter quiz

Top 10 topics to quiz:

- The deployment model — every git push produces an immutable deployment; production is an alias that points at one deployment at a time; `main` deploys to production and other branches get preview URLs.
- Default Vercel platform choices for a SaaS — Node.js runtime, Fluid Compute on by default since April 2025, single region matching the database region, automatic Let's Encrypt SSL, instant-rollback eligibility on every prod-aliased deployment.
- Edge Runtime vs. Node.js Runtime trade-off — Edge for middleware and tiny POP-proximity endpoints with HTTP-only DB drivers; Node.js for everything else; the senior default is Node.js.
- Custom domain setup — apex A record + `www` CNAME, one canonical with the other redirecting, automatic SSL provisioning after DNS resolves, Cloudflare-in-front requires SSL mode "Full (strict)."
- Preview deployments with Neon branching — the Native Vercel Integration creates a copy-on-write Neon branch per PR, injects `DATABASE_URL` per deployment, deletes the branch on close, password-protect previews before sharing.
- Environment variable scoping — three environments, `NEXT_PUBLIC_*` for client-inlined values, server-only for secrets, env validator (Zod) fails the build on missing required vars, `SKIP_ENV_VALIDATION` only in CI typecheck/lint/test jobs.
- The OIDC pattern for cloud credentials — short-lived JWT issued by Vercel, trusted by AWS/GCP/Azure, exchanged for short-lived cloud credentials; replaces long-lived IAM keys in env vars.
- The two-layer rollback — Vercel instant rollback re-aliases prod to a previous deployment in seconds; `git revert` lands the code-side fix on `main`; re-enable auto-assignment only after the fix is verified; DB state and external side effects don't roll back.
- The launch checklist's eight rows — env validation green, error monitoring wired and receiving, rate limits live on auth, audit logs writing, security headers set (HSTS / CSP / nosniff / Referrer-Policy / Permissions-Policy), pooled DB connection with matching region, backups on and restore-tested, uptime monitor pages a human.
- The `/api/health` endpoint and the "is anyone watching" rule — health endpoint for uptime monitoring, alerts route to a human within an hour business-hours and to on-call after-hours, runbooks exist for rollback / restore / rotation before launch.
