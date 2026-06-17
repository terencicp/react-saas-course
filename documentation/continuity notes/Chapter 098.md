# Chapter 098 — Ship to Vercel and go live

## Lesson 1 — The push-is-the-deploy model

**Taught.** The three-way git-event → environment mapping (main→production, PR branch→preview, local→development), deployment immutability + production-as-alias model, the build pipeline order (install → build → package → deploy → alias), build-time vs. runtime env var split, what a deploy does not do (no migrations, no CDN purge, no secret rotation), and the core Vercel CLI commands.

**Cut.** Hobby vs. Pro tier details (mentioned in the chapter outline) were not covered; the outline called them out but the lesson omitted them entirely — later lessons (L2, L5, L7) reference Pro features (rollback history depth, preview password protection) and should introduce tier gating at first mention.

**Debts.**
- Env var scoping mechanics and `NEXT_PUBLIC_*` deep dive deferred to L6 (explicitly forward-referenced).
- Instant rollback mechanic and `vercel promote` usage deferred to L7 (explicitly forward-referenced as the payoff of immutability).
- First-deploy dashboard flow (Import-from-GitHub, `vercel link`) deferred to L2.
- Region/runtime selection deferred to L3.
- Custom domains and Cloudflare-in-front deferred to L4.
- Neon per-PR branching deferred to L5.
- Deployment Checks (holding un-aliased until CI passes) named here but wiring deferred to L3/L7 area.
- `env.ts` Zod validator role named (build fails on missing var) but full schema deferred to L6/Unit 4.

**Terminology.**
- "Immutable deployment" — a build Vercel never overwrites; stays live on its own `<hash>-<project>.vercel.app` URL until deleted.
- "Alias" — the production domain pointer Vercel re-aims at one deployment at a time; "deploying" re-aims it.
- "artifact" — packaged build output: bundled server functions + static assets.
- "Deployment Checks" — Vercel feature holding a deployment un-aliased until external checks pass.
- "The deploy is not a separate human step; it is the consequence of the push" — chapter's titular framing, used throughout.
- Production-as-alias analogy anchored to Ch001 "Bindings, not boxes": `app.example.com` is a `let` binding; each deployment is an immutable value; deploy reassigns the binding.

**Patterns and best practices.**
- Never share a `<hash>-<project>.vercel.app` deployment URL as "the app" — it is pinned to one frozen build; share the production domain.
- `vercel --prod` from a local machine bypasses PR review and CI; avoid except in emergencies.
- `vercel env pull .env.local` is the on-clone ritual for every developer, not a manual `.env.example` fill.
- The deploy ships code only; database migrations, CDN purges, and secret rotations are always separate deliberate steps.
- CI gate (branch rulesets from Ch097) protects merges to `main`, not the production alias; these are distinct — production alias can flip before CI finishes unless Deployment Checks are wired.
- Supply-chain defense already shipped: SHA-pinned Actions (Ch097) + `minimumReleaseAge` in `.npmrc` guard `pnpm install` running on Vercel's builder with build-env-var access.

**Misc.** Vercel GitHub App holds write scopes (`Workflows read/write`, `Actions read`) — lesson corrects the "Vercel never writes to the repo" absolutism; durable framing is "Vercel doesn't push application code, it reacts to commits." Later lessons should not revert to the absolute version.

---

## Lesson 3 — Region, runtime, and Fluid Compute

**Taught.** The three platform knobs (region, runtime, Fluid Compute) framed as "one deliberate change, two informed leave-it-alones"; the region-must-match-database rule; Node.js as the committed default (300s timeout framed as canary not budget, `/tmp` 500 MB, large uploads bypass the function via R2 presigned URLs); the Edge runtime as a measured per-route exception with its decision rule and the `proxy.ts`-is-Node-only correction; Fluid Compute's automatic concurrency model (idle-time reuse, no manual dial); and the module-scope-shared-state hazard with function-locals/`AsyncLocalStorage` as the fix.

**Cut.** `instrumentation.ts` hook (lesson outline explicitly cut it; belongs to observability unit). Fluid Compute manual `maxConcurrency` / "default 1, raise to 5–20" recipe (chapter outline item, corrected as no longer a user-facing knob). Build output size check (`next build` route summary, function-over-1-MB warning) — chapter outline item, not covered. Function memory/CPU/payload limit table — chapter outline item, omitted; only the timeout and `/tmp` numbers were stated. Multi-region functions named once as escape hatch only. OIDC and env-var details deferred to L6.

**Debts.**
- Region-matches-DB and pooled connection verified as a checklist row in L8 (explicitly forward-referenced twice).
- Per-PR Neon branches (preview database placement) deferred to L5; region rule applies only to production.
- `AsyncLocalStorage` named and defined in one sentence; full usage in per-request org-context plumbing deferred to other units.
- Custom domains/Cloudflare/SSL deferred to L4.

**Terminology.**
- **`iad1`** — Vercel's current default single region (Washington, D.C., US East); set in Project Settings → Functions → Region or `vercel.json` `region` field.
- **`proxy.ts`** — Next.js 16 rename of `middleware.ts`; runs Node.js-only; setting `runtime` throws a build error. Course handles auth gating, headers, CSP here. Never call it `middleware.ts` in any downstream lesson.
- **`export const runtime = 'edge'`** — per-route Edge opt-in, valid on route handlers and page segments; NOT valid in `proxy.ts`.
- **Fluid Compute** — default execution model since April 2025; one warm instance handles multiple concurrent requests; concurrency is automatic (no `maxConcurrency` knob).
- **cold start** — extra delay on first request to an idle function; defined here.
- **p95** — latency 95% of requests come in under; defined here.
- **I/O-bound** — wall-clock time dominated by waiting on external systems (DB, API), not CPU; defined here.
- **V8 isolate** — lightweight JS sandbox (Edge runtime); much faster cold start, far less capable than Node.js; defined here.
- **POP** — point of presence, edge location near the user; defined here.
- **`AsyncLocalStorage`** — Node's per-request context store; threads values through a call stack without prop-drilling and without cross-request leakage; defined here in one line.
- **Defaults-vs-diff frame** — the durable senior skill: recognize which platform defaults are load-bearing (region) vs. correct-by-default (Node.js runtime, Fluid Compute).

**Patterns and best practices.**
- Match the function region to the database region on day one; cross-region mismatch is invisible in local dev and surfaces only as elevated p95 in production.
- Default to Node.js runtime for every server action, route handler, and RSC fetch; Edge is a measured, per-route exception for stateless POP-proximity paths with no Node dependencies.
- Never place request-specific mutable state at module scope under Fluid Compute; it is shared across concurrent requests on the same instance — a cross-tenant data leak in multi-tenant SaaS.
- Module-scope singletons that are stateless or internally concurrency-safe (Drizzle/Neon pool client, Stripe SDK instance, compiled regex, frozen config objects) are correct and should stay at module scope.
- The timeout (300s) is a canary: anything plausibly slow by design goes to a background job (Trigger.dev / `after()`), never a long-running request.
- Measure before optimizing runtime; the Edge-for-speed reflex loses capability before it gains cold-start savings.

**Misc.**
- The lesson corrects two chapter outline claims: (1) `maxConcurrency` as a user-facing `vercel.json` knob does not exist in the current model — concurrency is automatic; downstream lessons must not teach it or use it as a valid option. (2) `middleware.ts`/Edge-by-default mental model is dead; all lesson/project code must use `proxy.ts`.
- Updated platform numbers to use (superseding outline): default duration **300s on all plans** (Hobby included); writable `/tmp` **500 MB**. Do not use the outline's stale "Hobby 10s / Pro 60s" figures.
- The two MCQ exercises anchor the lesson's check: one tests the Edge-vs-Node capability decision (distractor "raise `maxConcurrency`" tests the corrected fact); the second tests region-mismatch as the cause of a p95 spike invisible in dev. Both may be referenced or adapted in the chapter quiz (L9).
- Diagrams are fully implemented: `RegionLatency` component (two-panel TabbedContent, mismatched vs. matched) and `FluidVsClassicTimeline` inside a `DiagramSequence` (three scrubbable steps: classic → Fluid → payoff callout). No stubs remain.
- Two `VideoCallout` embeds shipped: Theo/t3.gg "Vercel Gave Up On Edge" (18 min, Edge capability thesis) and Vercel's own Fluid Compute 5-min demo. Quiz writers can reference these as supplementary material students saw.
- The `vercel.json` stub shown (`{"region": "iad1", "fluid": true}`) establishes the file's shape; the lesson explicitly notes most projects ship with no `vercel.json` — the override is the exception.

---

## Lesson 5 — A Neon branch per preview

**Taught.** Copy-on-write Neon branching model (branch = snapshot pointer, reads fall through to parent, first write diverges); the Native Vercel-Neon Integration wired once so every PR auto-gets its own branch; migrations run against the preview branch via `pnpm db:migrate && next build` Build Command override; branch lifecycle (created on PR open, reused on push, deleted on close); `neonctl` as the manual escape hatch; preview password protection as the PII gate.

**Cut.** Seed-data sanitisation (schema-only branch for sensitive industries introduced as escalation only, not taught as a workflow). `neonctl link`/`neonctl checkout`/`neonctl env pull` local-dev loop mentioned once, not expanded. Branch reset vs. re-create nuance kept brief. No MCQ exercise (Sequence exercise is the comprehension check). Chapter outline item on a `dev`-branch local setup handled only as the third member of the three-environment trio, not step-by-step wiring — that's L6.

**Debts.**
- Full env-var scoping mechanics and `vercel env pull` depth deferred to L6 (forward-referenced twice).
- Expand-migrate-contract migration safety deferred to Ch099 (Aside explicitly scopes it out).
- Production migration gating (migrations-in-build-command caveat) named here but full CI "migrate" job story is Ch099.

**Terminology.**
- **Copy-on-write (CoW)** — only pages that actually change are duplicated; all other reads fall through to the parent storage.
- **Snapshot** — a point-in-time logical image of a branch's parent data; the starting state of every new branch.
- **Branch (Neon)** — a logical pointer at a snapshot; instant to create, near-free idle, fully isolated after first write.
- **`main` branch** — Neon's production branch; previews fork off it.
- **Managed variable** — an env var injected and overwritten per deployment by an integration; Vercel marks it with a lock icon and blocks hand-editing.
- **`neonctl`** — Neon's CLI; the tool for branch operations outside the integration's automated preview flow.
- **Schema-only branch** — `neonctl branches create --schema-only`; copies structure without rows; the PII-sensitive escalation (Beta as of mid-2026).
- **Vercel Authentication** — Vercel → Settings → Deployment Protection; forces preview-URL visitors to sign in with a Vercel account; included on every plan (free on Pro, no add-on); the default recommended preview gate.
- **Password Protection (standalone)** — alternative that gates a preview with a single password; requires the paid **Advanced Deployment Protection** add-on; use only when sharing with external reviewers who have no Vercel account. Not included in the base Pro plan.

**Patterns and best practices.**
- The integrate-once / auto-forever pattern: wire the Native Vercel-Neon Integration once; all per-PR branches are automatic thereafter.
- Build Command for previews: `pnpm db:migrate && next build` (or equivalent `prebuild` script in `package.json`).
- Migration script (`scripts/migrate.ts`) uses `dbUnpooled` (not the pool) and `migrate()` from `drizzle-orm/postgres-js/migrator` — imports `dbUnpooled` from `@/db/index`.
- Migrations are always `generate → review → migrate`; the build command only ever *applies* reviewed migration files, never generates or pushes.
- Production migrations belong behind a gated CI step, not the Build Command — the Build Command pattern is safe for previews, not a blanket rule for prod.
- Never store data you need to keep on a preview branch; it is ephemeral and deleted on PR close.
- Turn on **Vercel Authentication** (Deployment Protection) for previews before sharing any link — free on Pro, no add-on. Use **Password Protection** (Advanced Deployment Protection add-on) only when an external reviewer without a Vercel account needs access.
- Use `neonctl branches list` periodically to prune abandoned-PR branch buildup against the project cap.

**Misc.**
- Three-environment, three-branch mental model established: dev (`dev` branch, local), preview (per-PR auto-managed branch), production (`main` branch). Later lessons must not collapse these — each environment has its own isolated branch.
- The Neon-Managed vs. Vercel-Managed install choice: course default is **Neon-Managed** (preserves Unit 5's single source of truth and billing). Downstream lessons must not assume Vercel-Managed.
- The chapter outline's "Fluid Compute maxConcurrency" and "middleware.ts" corrections from L3 still hold; this lesson does not reintroduce them.
- All Vercel/Neon UI figures are HTML/CSS mocks, not real screenshots — established pattern carried from L2/L3/L4.

---

## Lesson 2 — From repo to live URL

**Taught.** The Import-from-GitHub click flow (GitHub App scope, Configure Project defaults, skipping env vars on first deploy), reading the first build log (route summary static/dynamic + bundle sizes), the production alias going live, automatic preview deployments on PRs with side-by-side CI checks, the Deployments list, when to reach for `vercel.json` (usually never), and the per-clone `vercel link` + `vercel env pull` ritual.

**Cut.** The deployment notification surface (commit status dots, optional Slack integration) from the chapter outline was not covered. Unlikely to affect later lessons.

**Debts.**
- Per-PR Neon database branch and preview password-protection toggle deferred to L5 (both explicitly named as L5's job; students warned that previews currently share prod DB).
- Full three-environment env var scoping (Development / Preview / Production) and `NEXT_PUBLIC_*` rules deferred to L6.
- Instant rollback / `vercel promote` deferred to L7; Deployments list named as the surface it operates on.
- Security headers in `vercel.json` (`headers` key) deferred to L8.
- Region/runtime knobs deferred to L3; Build Command override for migrations deferred to L5/Ch099.

**Terminology.**
- `packageManager` field — pins exact pnpm version in `package.json`; without it Vercel silently falls back to npm. Course pin: `pnpm@11.x` (e.g. `pnpm@11.5.0`), not `pnpm@9.x` as the chapter outline stated — this is a deliberate correction.
- `*.vercel.app` project alias vs. `<hash>-<project>.vercel.app` deployment-specific URL — the former is the shareable one until the custom domain lands; the latter is frozen to one build forever.
- "Look twice" defaults on the Configure Project screen: project name (becomes subdomain, rename breaks old URLs) and Root Directory. All other auto-detected fields (Framework Preset, Build Command, Output Directory, Install Command) are safe to accept.
- `vercel link` — associates a local clone with the Vercel project; writes `.vercel/` (gitignored, machine-local).
- `vercel env pull .env.local` — pulls Development-scoped vars; defaults to Development environment; re-run whenever team changes dev vars.
- `.env.example` — kept alongside `vercel env pull`; documents key names for contributors without Vercel access (values from Vercel, map from `.env.example`).

**Patterns and best practices.**
- Scope the Vercel GitHub App to one repo at install time; broadening is a settings change, narrowing usually requires re-install.
- Skip env vars on first deploy deliberately; first build is expected to be structurally live but unconfigured (secret-backed features dark until L6).
- Never run destructive DB operations against a preview deployment until L5 wires per-PR Neon branches — previews share prod DB until then.
- Share the project `*.vercel.app` alias, never a deployment-specific hashed URL.
- Keep both `.env.local` (gitignored, populated via `vercel env pull`) and `.env.example` (committed, placeholder values only).
- `vercel.json` is optional for standard Next.js on Node.js runtime; reaching for it early is usually a smell.

**Misc.** The lesson is a wiring/procedure lesson with almost no React/TSX — artifacts are a `package.json` excerpt, a `vercel.json` stub, and two shell commands. All four figures are HTML/CSS mocks (not real screenshots) of authenticated UI surfaces. Both exercises were delivered: `Buckets` (configure-defaults-sort) and `Sequence` (repo-to-live-sequence).

---

## Lesson 6 — Env vars across dev, preview, and prod

**Taught.** The `(key, value, scope)` triple as the core mental model; three scoping patterns (same-everywhere, different-per-environment as the dominant default, present-in-some-only); the Vercel dashboard mechanic (environment checkboxes, Sensitive flag, managed variables, changes apply to new deployments only); build-time vs. runtime redeploy consequence for `NEXT_PUBLIC_*`; `vercel env pull .env.local` as the on-clone ritual and team sync; scope as a security boundary (preview builds literally cannot read Production-scoped secrets); OIDC federation as the named senior reflex replacing long-lived cloud keys, with `awsCredentialsProvider` illustrated but not wired; and the three-step overlap-window secret rotation pattern.

**Cut.** Full OIDC wiring (IAM trust policy authoring) deferred, explicitly named as deferred. `vercel env add` mentioned only briefly. Env validator internals (`createEnv`, Zod schema blocks) not re-derived — referenced as already taught (Ch041 L2, Ch081 L7). `SKIP_ENV_VALIDATION` referenced as established. Chapter outline called for per-environment service key setup detail (Stripe/Resend/PostHog) — lesson covers this under the three scoping patterns implicitly rather than as a separate walk-through per service.

**Debts.**
- Full OIDC wiring (AWS IAM role trust policy, `AWS_ROLE_ARN` env var) named as a deferred upgrade from the Ch068 R2 API-key setup — a later lesson or appendix owns the hands-on wiring.
- Org-wide credential rotation runbook and cadence deferred to Ch081 / Unit 21 (explicitly cross-referenced).
- Launch checklist row "env validation green in production" deferred to L8 (forward-referenced).

**Terminology.**
- **`(key, value, scope)` triple** — the core model: same key, different value or presence per Vercel environment scope.
- **Sensitive flag** — Vercel dashboard toggle encrypting a variable so its value can never be read back after save; Vercel now defaults new Production/Preview vars to sensitive; Development-scoped vars cannot be sensitive (must remain readable for `vercel env pull`).
- **Managed variable** — integration-injected var with a lock icon; can't be hand-edited; correct by construction; established in L5, now named as a known concept.
- **OIDC federation** — identity protocol letting Vercel act as IdP, minting short-lived JWTs (`VERCEL_OIDC_TOKEN`, sub-1h TTL) exchanged for short-lived cloud credentials; no long-lived cloud secret stored in Vercel.
- **`VERCEL_OIDC_TOKEN`** — the short-lived JWT `vercel env pull` writes into `.env.local`; also available as the `x-vercel-oidc-token` request header in running functions.
- **`awsCredentialsProvider`** — from `@vercel/functions/oidc`; replaces the static `accessKeyId`/`secretAccessKey` pair in the AWS/R2 SDK client.
- **Blast radius** — defined here: the full scope of damage a single leaked credential makes possible; used to motivate both scope isolation and OIDC.
- **Build-time vs. runtime redeploy rule** — `NEXT_PUBLIC_*` values are inlined at `next build`; changing them in the dashboard does nothing until a full redeploy; server-only vars take effect on the next deployment/cold start.

**Patterns and best practices.**
- The dominant per-variable question is "different value per environment" (test credentials in dev/preview, live credentials in production) — not "same everywhere." Default to three separate values.
- Never attach a production secret to the Preview scope to "make a preview work" — it destroys the security boundary. Previews always get the test credential.
- `vercel env pull .env.local` is the on-clone ritual for every developer; Vercel's Development scope is the source of truth for local values. `.env.example` (committed, placeholder values) documents which keys exist; `vercel env pull` provides the actual values.
- Sensitive flag: confirm it is on for every Production and Preview secret; the platform now defaults it on, but verify rather than assume.
- Overlap-window rotation pattern: generate new secret at provider (both valid) → set new value in Vercel and redeploy (both still valid) → revoke old secret at provider. Never in-place swap with no overlap.
- When the app talks to a cloud provider (AWS/R2/GCP), federate identity via OIDC instead of storing a long-lived access key; the credential's lifetime is the security property.
- Cloud trust policies can grant different permissions per Vercel environment — the same scope wall that separates env vars can extend into the cloud account.

**Misc.**
- The `NEXT_PUBLIC_*` firewall and `env.ts` validator internals are deliberately not re-derived here; any downstream lesson that needs those details should cross-reference Ch041 L2 and Ch081 L7.
- The Buckets exercise sorts real app variables by scoping pattern (same/different/some); it mirrors Ch081 L7's Buckets drill along the scope axis (not the firewall axis) — two independent questions about every variable.
- The `awsCredentialsProvider` annotated snippet is marked "illustrative, not something you wire today" — downstream lessons must not assume OIDC is wired in the project codebase. The Ch068 R2 client still uses `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` as long-lived keys.
- All Vercel dashboard figures in this chapter are HTML/CSS mocks, not real screenshots — pattern continues from L2–L5.
- Pro+ gating: env-var audit trail (who changed which var, when) is named as a Pro+ feature per the chapter's first-mention gating rule.

---

## Lesson 7 — Two-layer rollback when prod breaks

**Taught.** The two-layer rollback model (Layer 1: instant alias flip via Vercel dashboard "Instant Rollback" or `vercel promote <url>`; Layer 2: `git revert <sha>` through the normal gated PR); what rollback resets (code, bundle, static HTML, build-time-inlined env values) vs. what it cannot touch (DB rows, sent emails, Stripe charges, dispatched webhooks, current dashboard env config); the auto-assignment-off trap after manual rollback and the verify-then-"Undo Rollback" resolution; the migration trap (alias flip against a destructively-migrated schema makes things worse; forward-only fix is another migration); the ordered incident-response runbook (detect → triage → alias flip → communicate → revert code → re-enable auto-assignment → postmortem); the flag-flip escape hatch (fastest recovery when the bad behavior is feature-flagged); the "frequent rollbacks = CI failing" framing; downstream Cloudflare cache not purged by Vercel rollback.

**Cut.** Deployment Protection "freeze pushes" during an incident (chapter outline item, not covered — mentioned only in lesson outline scope, not the lesson body). Vercel gradual/percentage rollouts named in one closing sentence only (not taught).

**Debts.**
- Postmortem and runbook templates (steps 4 and 7 of the runbook) deferred to Unit 21; named here but explicitly scoped out.
- Expand-migrate-contract cadence deferred to Ch099 — lesson establishes only "migrations are forward-only; rollback doesn't touch schema; the fix is a new forward-fix migration" (Aside explicitly scopes out Ch099's content).
- The runbook file (`docs/runbooks/`) is named here and verified as a launch-checklist row in L8.

**Terminology.**
- **Layer 1 / Layer 2** — alias flip (speed) and `git revert` (durability); the course's canonical framing for rollback; both must move.
- **Instant Rollback** — Vercel dashboard button name for re-aliasing to a prior deployment; becomes "Undo Rollback" after use.
- **`vercel rollback`** — CLI command; re-aliases to the immediately previous prod deployment only; blunt.
- **`vercel promote <url>`** — CLI command; re-aliases to any named specific deployment; the durable, precise move.
- **`vercel ls`** — CLI command; lists deployments to identify the target URL.
- **Decision rule:** bad deploy is latest → `vercel rollback`; need a specific older known-good → `vercel promote <url>`.
- **auto-assignment** — Vercel's automatic re-aliasing of the production domain on every new push to `main`; turned off after a manual rollback; re-enabled by promoting the verified fix ("Undo Rollback").
- **side effect** — an action with consequences outside the app's own state (email sent, Stripe charge, webhook dispatched) that cannot be undone by changing which code runs; established here.
- **feature flag** — a runtime switch that turns behavior on/off without deploying; the flag-flip is the fastest rollback when the broken behavior is flagged.
- **Rollback eligibility rule** — only deployments previously aliased to production are rollback targets; preview deployments never were and are never eligible. Pro+ allows promoting any prod-aliased deployment in history; Hobby is limited to immediately previous.
- **Alias-first / revert-second** — the canonical ordering mantra; established in an Aside and repeated as the lesson's primary takeaway.

**Patterns and best practices.**
- Always do the alias flip before the code revert — the flip stops bleeding in seconds; the revert makes the fix durable.
- Never bypass the CI gate on a revert PR — a revert can itself be wrong; "skip CI when urgent" manufactures the next incident.
- After a manual rollback, Vercel turns off auto-assignment; re-enable only after verifying the fix on its own deployment URL, not before.
- Use `vercel ls` to identify the exact known-good URL before running `vercel promote`; running `vercel rollback` when the bad commit isn't the latest silently rolls back to the wrong build.
- The runbook lives in `docs/runbooks/` and must exist before launch (verified in L8).
- Ship risky features behind a feature flag (PostHog, Ch093 L4) so the rollback story is "flip the flag," not "scramble the alias."
- If Cloudflare sits in front of Vercel (L4 pattern), include a Cloudflare cache-purge step in the runbook after the alias flip, or keep short TTLs on dynamic content.
- Frequent rollbacks are a CI signal, not a reflexes problem — the fix is upstream (tests, gate, release process).

**Misc.**
- The `git revert <sha>` mechanic was taught in Ch096 L2 (which explicitly forward-referenced this lesson); lesson treats it as recall, not re-teaching.
- Feature flags are PostHog from Ch093 L4 — recall only; do not re-teach.
- `NEXT_PUBLIC_*` build-time inlining established in L6 — the rollback-resets-env-values point references it via one clause, not a re-derive.
- All three figures shipped as implemented Astro components: `AliasReaimPointer` (pointer strip with immutable deployment boxes), `InstantRollbackTile` (dashboard rollback tile mock), `RollbackResetsVsCannotTouch` (two-column classification card). No stubs remain.
- Rollback eligibility boundary used in two places: preview deployments are never eligible (L1's model), Pro+ allows full history (first mention of Pro-gating for rollback depth is this lesson).

---

## Lesson 8 — The launch checklist

**Taught.** The "launched = defensible" posture (live URL ≠ launched product); a nine-row interactive verification checklist (eight hard + one soft) each with protect/verify/origin/failure-if-skipped structure; the `/api/health` route handler (the lesson's only new code artifact); the "is anyone watching" human-side of monitoring (routing, escalation, alert fatigue, first-week daily watch); and the re-run-quarterly cadence.

**Cut.** The chapter outline described "security headers snippet" as owned here (`next.config.ts` `headers()` block with all six headers); the lesson corrected this — Ch081 L1 owns the canonical snippet, Row 5 only verifies presence and cross-references. Chapter outline also used `hey` as the load-testing default; lesson uses `oha` (Rust-based, TUI) as the current default, with `hey`/curl loop as named alternatives. Chapter outline called the Neon feature "automated backups, 7-day default"; lesson corrects to Neon's actual 2026 terminology: **instant restore / restore history window** (copy-on-write, 1-day default on paid plans, raise toward 7+). Chapter outline called the audit table `audit_log` (singular); lesson uses the shipped table name `audit_logs` (plural) — downstream lessons must use plural.

**Debts.** Runbook templates and postmortem structure deferred to Unit 21 (Row 9 is soft — verifies the files exist, not their content). Schema migration safety ("the one thing this checklist treats as a black box") explicitly handed off to Ch099.

**Terminology.**
- **"Defensible"** — the course's term for a launched URL: degrades gracefully, doesn't leak, doesn't fall over under load, has a human who finds out when it fails.
- **`/api/health`** — the dedicated uptime-monitor endpoint; does a `select 1` DB probe; returns `200 { status: 'ok' }` or `503 { status: 'degraded' }`; unauthenticated and cheap.
- **`select 1`** — the canonical minimal DB liveness probe (no table access, near-zero cost).
- **Instant restore / restore history window** — Neon's copy-on-write point-in-time recovery model; not a nightly dump; set via the Neon dashboard; 1-day default on paid plans.
- **`oha`** — the lesson's named modern default for HTTP load generation (Rust-based, live TUI); `hey` and a `curl` loop are named equivalents.
- **Better Stack** — named as the current default uptime + on-call tool (bundles checks, scheduling, escalation); Pingdom / UptimeRobot / OnlineOrNot are named alternatives.
- **"A safety net nobody reads is not a safety net"** — the chapter's cross-cutting senior principle; stated once in L8, applies to error monitoring, audit logs, and uptime rows.
- **Credential stuffing** — automated attacker replaying leaked email+password pairs against sign-in; the threat Row 3 rate limits address; defined here.
- **On-call** — the person designated to receive and respond to alerts in a given window; escalation = page the next person if they don't ack.
- **Alert fatigue** — over-monitored teams swipe every alert; tune alerts to actionable signals only.

**Patterns and best practices.**
- The `/api/health` route handler is unauthenticated, cheap (single `select 1`), and intentionally opaque in its response body (`degraded`, not the error or connection string) — a public endpoint must never leak internals.
- `export const GET = async () =>` named export pattern (route handler convention) used here; the caller is a non-browser client (the uptime monitor), which is the trigger for a route handler over a Server Action.
- Error monitoring (Sentry) and uptime monitoring (Better Stack / external) are two distinct layers; neither substitutes for the other; the uptime monitor must run on infrastructure external to the app.
- The checklist is structural and recurring — re-run quarterly; a row that was green but isn't anymore is a regression.
- First-week post-launch: budget daily active dashboard checks (Sentry new errors, audit log growth, rate-limit spikes, function error rate) for the first ~72 hours before relying on alerts alone.

**Misc.**
- The lesson introduces no new chapter-wide conventions; it closes the chapter's teaching arc.
- Forward seam explicit in the lesson's closing paragraph: Ch099 owns the expand-migrate-contract cadence — the thing the checklist treats as a black box.
- The Buckets exercise maps failure scenarios to safety-net rows (uptime / error monitoring / rate limit / audit log) — can be referenced or adapted in L9 quiz.
- All Vercel/Neon UI references remain HTML/CSS mocks or `curl`/SQL transcripts (chapter-wide convention).

---

## Lesson 4 — Custom domains and automatic SSL

**Taught.** The pointer-plus-lock model (DNS = student's, TLS = Vercel's automatic via Let's Encrypt); apex vs. `www` canonical decision with SEO implications; why apex can't CNAME (zone root `SOA`/`NS` conflict) and the A-record / ANAME-ALIAS fallback options; the Vercel Settings → Domains flow; DNS propagation and TTL as the wait mechanism; automatic HTTP→HTTPS redirect; the Cloudflare-in-front double-TLS-hop topology and why "Full (strict)" is the only correct SSL mode; and the five-command domain-verification gate.

**Cut.** Wildcard cert provisioning and per-tenant subdomain patterns (chapter outline item) were named once as a forward pointer to Unit 9 only, not taught. Domain registration / buying a domain not covered (assumed prerequisite). `vercel domains` CLI subcommands not covered (dashboard flow is canonical). Email/MX/DKIM/SPF DNS records out of scope.

**Debts.**
- HSTS header (`Strict-Transport-Security`) explicitly named but authoring deferred to L8 launch checklist and Chapter 081 — lesson draws a clean line: "HTTP→HTTPS redirect is automatic; HSTS header is yours, comes later."
- Per-tenant wildcard subdomain routing deferred to Unit 9 (named once as `<tenant>.example.com`).
- Security headers in `next.config.ts` and `proxy.ts` deferred to L8/Ch081; lesson only names `next.config.ts` as the destination.

**Terminology.**
- **Pointer-plus-lock** — the lesson's central mental model; DNS is the pointer (student's job, set once), TLS is the lock (Vercel's job, automatic). Two independent concerns.
- **Apex / zone root** — bare domain with no subdomain (`example.com`); also called the "zone root."
- **CNAME** — DNS record aliasing one name to another name; forbidden at the apex.
- **A record** — maps a name directly to an IP address; works at the apex, hardcodes an address.
- **ANAME / ALIAS** — CNAME-like record permitted at the apex ("CNAME flattening"); preferred over A record when the registrar supports it.
- **Anycast** — one IP announced from many locations; network routes each visitor to the nearest; how Vercel's A-record IP is fast globally.
- **TTL (Time To Live)** — how long resolvers cache a record before re-querying; governs propagation duration.
- **Propagation** — delay between saving a DNS record change and it being visible everywhere as caches expire.
- **Let's Encrypt** — free automated CA; Vercel uses it to provision and auto-renew TLS certs.
- **HSTS (HTTP Strict Transport Security)** — response header telling browsers to only ever use HTTPS; not added automatically by Vercel; lives in `next.config.ts`.
- **Full (strict)** — Cloudflare SSL/TLS mode that encrypts and validates the Cloudflare→Vercel origin hop; the only correct mode when proxying through Cloudflare.
- **"Never hardcode a Vercel anycast IP or CNAME target"** — lesson explicitly states values are per-project and rotated; always copy from Settings → Domains for the specific project.
- **`@` (at-sign in DNS)** — conventional registrar notation for the apex/zone root.

**Patterns and best practices.**
- Pick one canonical form (apex or `www`) before sharing any external links; apex is the course default. Never serve both without a redirect — duplicate content + fragmented link equity.
- Lower TTL to ~300s a day before any planned DNS change; raise it back to 3600+ once stable. "TTL is a dial you turn down before surgery and up after."
- Always copy DNS record values from the Vercel dashboard for the specific project — never from tutorials or memory.
- Do not Cloudflare-proxy in front of Vercel by default (Vercel discourages it: blinds Vercel Firewall, adds latency). If deliberately doing so, SSL mode must be "Full (strict)"; "Flexible" is silently insecure.
- Verify domain readiness from outside the local machine using `dig @1.1.1.1` and `curl -sI`; local caches lie.
- Domain cutovers: prepare Vercel records before flipping DNS, cut over during low traffic, keep old DNS records as the rollback.
- Leave TXT verification records in place after domain verification — Vercel re-checks periodically and removing them can de-verify the domain.

**Misc.**
- All three figures shipped as custom Astro components (no stubs remaining): `TwoPointersInSeries` (two-pointer-in-series strip), `VercelDomainsPanel` (Domains panel mock with Valid/Invalid status), `TwoHopTlsPath` (two-hop TLS strip). Matches chapter HTML/CSS mock convention.
- Two `VideoCallout` embeds shipped: PowerCert "DNS Records Explained" (14 min, A/CNAME difference) and ByteByteGo "SSL, TLS, HTTPS Explained" (6 min, TLS handshake). Quiz writers can reference as material students saw.
- The lesson explicitly states "Full (strict)" looks identical to "Flexible" from the browser (same padlock); the difference is only visible by auditing the origin hop — this is the "senior diff" framing to reuse in L8/security contexts.
- Lesson 8 launch checklist will reference this lesson's five-command verification checklist directly; L8 writers should not duplicate the commands, just cross-reference.
- Per-tenant subdomain routing (`<tenant>.example.com`) named once here as a Unit 9 forward pointer; do not teach or expand in any lesson before Unit 9.
