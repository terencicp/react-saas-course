# The push-is-the-deploy model

- Title (h1): The push-is-the-deploy model
- Sidebar label: Push is the deploy

## Lesson framing

**Type.** Concept / mental-model. No app code written; the deliverable is the model every later lesson in the chapter wires into the platform. Est. 35–45 min.

**Where the student is.** End of Chapter 097: `main` has a four-job CI gate (typecheck/lint/test/build) and branch rulesets. `pnpm dev` and CI have proven the code compiles and passes — but nothing is shipping. The student knows trunk-based git (Ch096), `git revert` (Ch096 L2), and the env validator in `env.ts` (Unit 4 / Unit 5). They have not touched Vercel yet.

**The senior question that drives the whole lesson** (state implicitly in the intro, not as a header): a `git push` lands and *something happens on Vercel*. What exactly, where, with what side effects? A junior clicks Import, sees a URL, and is then confused half an hour later — "why did my PR ship to production?", "why does my preview have no database?", "I changed an env var, why is the old value still live?". Every one of those confusions is the same missing model. This lesson installs the model *before* lesson 2 touches the dashboard, so the clicks land on understanding instead of guesswork.

**The three load-bearing ideas, in dependency order** (this ordering is the spine of the lesson — each builds on the last):
1. **Git events map to deployments.** Push to `main` → production deployment. Push to any other branch with an open PR → preview deployment. `vercel dev` locally → development. Three git situations, three deployment kinds.
2. **Deployments are immutable; production is an alias.** Every push builds a brand-new deployment with its own permanent URL and artifact; Vercel never overwrites one. "Production" is not a deployment — it's a *pointer* (the custom domain) aliased to one deployment at a time. This is the single highest-leverage idea in the chapter: it's why "deploy" is an instant pointer-swap and why instant rollback (L7) is even possible.
3. **Environment scope, not code, is what differs.** The same commit behaves differently in prod vs. preview vs. dev because the *env vars differ per environment*. Scope is the security boundary — previews never see production secrets.

**Pedagogical strategy.**
- **Start simplest, add one axis at a time.** Begin with the bare git-event → deployment mapping (concrete, observable). Only then introduce immutability + the alias indirection (the conceptual leap). Only then layer the build pipeline and the build-vs-runtime env split. Resist front-loading all of it.
- **Lean on diagrams over prose** — this is a spatial/temporal model (pointers, pipelines, time), exactly what a wall of text fails to convey. Three figures carry the lesson (see sections). Reserve code blocks for the CLI surface only; there is no app code here.
- **The "pointer vs. value" analogy is the keystone.** `app.example.com` is a variable; deployments are immutable values; "deploy" reassigns the variable. The student knows bindings-vs-values cold from Unit 1 (Ch001 "Bindings, not boxes") — explicitly call that back. This is the cheapest way to make the alias model click.
- **Frame in production stakes throughout.** Each watch-out is a real incident shape (shipped broken code because deploy didn't wait for CI; leaked a secret via `NEXT_PUBLIC_`; ran a destructive op against the prod DB from a preview). Senior mindset = knowing the failure *before* it happens.
- **Two understanding-checks, both placed inline** at the end of the sections they verify — never bundled at the end. A Buckets drill for the git-event→environment mapping; a Sequence drill for the deploy pipeline order.
- **Defaults framing** (course filter): name what Vercel gives you on day one and which defaults a senior keeps (`main` as production branch, Node runtime, immutable deploys, rollback eligibility) vs. the one thing you wire later. Don't drown the student in knobs — this lesson is the *map*; the knobs are L3/L6.
- **Alternatives named once, not weighed.** Cloudflare Pages / Netlify / AWS Amplify / self-hosted get one sentence: the course commits to Vercel because Next.js 16's runtime is co-developed with it. Do not turn this into a comparison lesson.

## Lesson sections

### Introduction (no header)

Open on the gap: Chapter 097 left a green gate but a dark site — proven code that nobody can reach. "Going live" sounds like one big button; on Vercel it's a model you already half-know from git. State the payoff: by the end the student can predict, for any `git push`, exactly what Vercel does and where the result lands — and will never again be surprised by a PR shipping to prod or a preview with no database. Name that this lesson is *pure model* — the clicking starts in lesson 2. Keep it to ~4 sentences, warm, terse.

### Every git event produces a deployment

The concrete, observable layer — start here because it's the least abstract.

- Lay out the mapping explicitly:
  - Push to `main` → a **production deployment**.
  - Push to any other branch *with an open PR* → a **preview deployment** with a generated `*.vercel.app` URL, posted as a PR comment.
  - `vercel dev` (or local `pnpm dev` reading `.env.local`) → the **development** environment.
- Drive the "same code, different behavior" point early but lightly: the *code* on all three can be byte-identical; what changes is the environment the deployment runs in (env vars). Full env treatment is L6 — here just plant that environment ≠ code.
- The trust direction: Vercel installs as a GitHub App that **monitors** pushes and creates deployments in response — it does not push your *application code*. Git history is the source of truth; Vercel reacts to it. One sentence; it reframes "the deploy" as a *consequence* of git, not a separate human action — the chapter's titular thread. **Accuracy note for the writer (verified June 2026):** do *not* write the absolute "Vercel never has any write access" — the current GitHub App requests `Workflows (read & write)` + `Actions (read)` so its agent can read CI logs and (optionally) configure workflow files. The correct, durable phrasing is "Vercel doesn't push application code; it reacts to your commits." Keep the trust point about *code*, not blanket repo write.

**Diagram — the git-event → deployment map** (`ArrowDiagram` inside `Figure`, `expandable={false}` per the ArrowDiagram constraint). Pedagogical goal: make the three-way fan-out spatial and memorable. Left column: three source boxes — `push → main`, `push → feature/* (PR open)`, `vercel dev (local)`. Right column: three target boxes — `Production deployment`, `Preview deployment (*.vercel.app)`, `Development`. Three colored arrows, one per row, no crossing (`startSocket: 'right'`, `endSocket: 'left'`). Keep nodes as short labels. This is a clean 3→3 correspondence — ideal ArrowDiagram fit; arrows carry direction (git event *causes* deployment), which color-matching alone wouldn't.

**Exercise — Buckets** (place at the end of this section). Goal: verify the student can classify git situations into the environment each targets. `instructions`: "Sort each git action into the deployment environment it triggers." Buckets: `Production`, `Preview`, `Development`. Items (mix, ~7): "Merging a PR into `main`", "Pushing a commit to an open PR branch", "Running `vercel dev` on your laptop", "Opening a new pull request", "Pushing a hotfix directly to `main`", "Reading `.env.local` during `pnpm dev`", "A second push to the same PR branch". This catches the common misread that *any* push goes to prod.

### Deployments are immutable; production is just an alias

The conceptual core. Budget the most attention here — it's the idea everything else hangs on.

- **Immutable defined concretely:** every push produces a *new* deployment — own build, own artifact, own permanent URL (`<hash>-<project>.vercel.app`). Vercel never mutates or overwrites an existing deployment. Old deployments stay alive at their original URLs indefinitely (until retention/manual delete). Reinforce with the verified fact: deleting a deployment is what *removes* it as a rollback target — proof that they otherwise stay live.
- **The alias indirection:** "production" is not a deployment. It's the custom domain (`app.example.com`) plus the project's `*.vercel.app` production URL, **aliased** to exactly one deployment at a time. "Deploying to production" = "re-pointing that alias at a new deployment." The alias swap is atomic and effectively instant — no rebuild, no copy.
- **Why this is the chapter's keystone:** because previous deployments are still alive on their own URLs, rolling back is just re-aliasing to one of them — instant, no rebuild. Forward-reference L7 (instant rollback) explicitly as the payoff of this model; don't teach the rollback mechanic here.
- **The pointer/value callback** (the keystone analogy): `app.example.com` is like a `let` binding; each deployment is an immutable value; "deploy" reassigns the binding to a new value; the old values don't disappear, they're just no longer pointed at. Tie to Ch001 "Bindings, not boxes" by name. This single analogy is what makes the rest of the chapter intuitive — give it room.
- **`*.vercel.app` deployment URLs are not shareable "production" links.** Each is deployment-specific and permanent; the *production alias* moves, the deployment URLs don't. Sharing a `*.vercel.app` URL as "the app" pins someone to one frozen deployment. Watch-out framing.
- **Production branch is `main` by default**, configurable per project; course keeps `main`. One watch-out: changing the production branch mid-project does *not* retroactively redeploy — the next push to the new branch is the first new prod deploy. Also flag the decoupling trap directly: **production branch ≠ production URL** — one is a git setting, the other is where the alias points.

**Diagram — the alias as a movable pointer** (`DiagramSequence`, 3 steps). This is a *temporal* change of state — DiagramSequence (scrubbable) is the right vehicle over a static figure. Build each step as simple HTML/CSS: a row of three immutable "deployment" cards (each labeled with a short hash + commit msg) and a single `app.example.com` pointer chip with an arrow to whichever card it currently targets.
  - Step 1 caption: "Two deployments exist. The production domain points at deployment `a1b2` — the latest push to `main`." Pointer → card 2.
  - Step 2 caption: "A new push to `main` builds deployment `c3d4`. It's live on its own URL, but the domain hasn't moved yet." Three cards now; pointer still on card 2; card 3 marked "built, not aliased."
  - Step 3 caption: "Vercel re-aliases the domain to `c3d4`. The swap is atomic — no rebuild. `a1b2` and the others stay live on their URLs, available to roll back to." Pointer → card 3; older cards dimmed but present.
Pedagogical goal: the student *sees* the pointer move while the values stay put — the entire mental model in one scrub.

### From commit to live: the deploy pipeline

What actually runs between the push and the alias swap. Keep it a black-box-with-labeled-stages, not a deep dive.

- The stages, in order: Vercel fetches the commit → runs the **install** (`pnpm install`) → runs the **build** (`pnpm build` / `next build`) inside its own Linux container with env vars scoped to the *target* environment → packages output into **Functions artifacts** → deploys globally → (for prod) **re-aliases** the production domain.
- **The CI relationship — a senior-critical, commonly-wrong point.** By default the Vercel deploy and the GitHub Actions CI gate (Ch097) run **in parallel, independently**. The deploy does **not** wait for CI. So: a push to `main` can ship to production *before or even while* CI is still running — green CI is not a precondition for the prod alias unless you make it one. When this matters, gate it explicitly with Vercel **Deployment Checks** (the deployment is held un-aliased until checks pass; named here, configured later/Ch097-adjacent). This corrects the dangerous assumption "my CI gate protects production" — it protects *merges to `main`* (via the ruleset), which is what indirectly protects prod. Make that distinction crisp.
- **Build-time vs. runtime — the env-var rule** (the practical takeaway most likely to bite):
  - Read at **build time** and baked into the artifact: `NEXT_PUBLIC_*` (inlined into client bundles), the `env.ts` validator, static generation.
  - Read at **runtime** from the running environment: server-only secrets used inside server actions / route handlers.
  - Consequence: changing a `NEXT_PUBLIC_*` value requires a **rebuild** (new deployment) to take effect; an already-built artifact has the old value frozen in. This is *the* "I changed the env var and nothing happened" bug. Tie back to the immutability idea: the artifact is immutable, so a value baked into it is too.
- Mention the env validator's role at this stage lightly: the build *fails* if a required server var is missing (so misconfiguration is caught before an artifact ships), full treatment deferred to L6 / Unit 4. Use a one-line `Aside` cross-ref, don't re-teach the schema.

**Exercise — Sequence** (end of this section). Goal: lock in pipeline order, including that the alias swap is *last*. `instructions`: "Order what Vercel does, from the moment you push to `main` until users see the new version." Steps (source = correct order): "Fetch the pushed commit", "Run `pnpm install`", "Run `pnpm build` with the target environment's variables", "Package the output into Functions artifacts", "Deploy the new artifact to its own URL", "Re-alias the production domain to the new deployment". Reinforces that "live on a URL" precedes "aliased to production" — the same gap the rollback model exploits.

### What a deploy does *not* do

A short, high-value section. Juniors assume "deploy" means "everything is now in sync." Naming the gaps prevents the worst day-one incidents.

- **No automatic database migration.** Drizzle migrations are a separate, deliberate step (Chapter 099 owns it). Shipping code that *expects* a new column does not create the column.
- **No automatic CDN purge** for anything in front of Vercel (Cloudflare-in-front has its own cache — L4).
- **No automatic secret rotation.**
- The principle that ties them together: **the deploy ships code; everything stateful is the engineer's responsibility.** This is a senior reflex worth stating outright.
- The supply-chain corollary (one paragraph, ties to Ch097): `pnpm install` runs on Vercel's builder with full access to the *build* environment's vars. A malicious dependency's install script therefore runs with that access. The prevention the student already shipped: SHA-pinned GitHub Actions (Ch097) and `minimumReleaseAge` in `.npmrc` (the 24-hour quarantine). Name it; don't re-teach it. Use an `Aside` (caution) so it reads as a reflex, not a tangent.

### The Vercel CLI you actually reach for

Brief, reference-flavored. The git flow is the default path; the CLI is for the off-path moments. Frame each command by *when you reach for it*, not as an exhaustive list.

- Present as one small `Code` block (shell), each line annotated by purpose in surrounding prose or a tight list — these are real commands the student will type, so house style (single quotes, real flags) applies:
  - `vercel` — deploy current dir as a **preview** (manual, off the git flow).
  - `vercel --prod` — deploy as production from the CLI. **Rare and a watch-out:** bypasses PR review and CI; the git flow is the default. Name it mainly so the student knows *not* to reach for it casually.
  - `vercel env pull .env.local` — sync the **development**-scoped vars locally (the every-dev-on-clone command; full treatment L2/L6).
  - `vercel logs <url>` — stream a deployment's logs.
  - `vercel inspect <url>` — inspect a deployment's metadata/build output.
  - `vercel promote <url>` — re-alias production to a specific existing deployment (the durable rollback primitive; mechanic owned by L7).
- The framing line: reach for the CLI during **emergency rollback, local dev with prod-shaped vars, or inspecting a failed build** — otherwise let git drive.

### Why Vercel (named once)

Close the lesson by situating the platform choice — one short paragraph, no comparison matrix.

- Alternatives named once: Cloudflare Pages + Workers, Netlify, AWS Amplify, self-hosted Node.
- The commitment reason: in 2026 Next.js 16's runtime features are co-developed with Vercel, so the platform and framework move together; the course commits to Vercel and won't re-litigate it.
- End by pointing forward: the rest of the chapter takes this model and wires the platform — first deploy (L2), region/runtime (L3), domains (L4), per-PR databases (L5), env scope (L6), rollback (L7), launch checklist (L8). One or two sentences; sets expectation that this lesson was the map.

### External resources (optional, end of lesson)

`ExternalResource` cards, 1–2 max:
- Vercel docs — Deployments overview / Managing deployments.
- Vercel docs — Instant Rollback (as a teaser for L7) *or* Deployment Checks. Pick the one that best reinforces the alias model.

## Components, diagrams, exercises — summary for downstream agents

- **Code blocks:** only the CLI surface (one shell `Code` block). No app code in this lesson. No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` needed — there's no code complex enough to warrant them.
- **Figures (3):**
  1. `ArrowDiagram` (in `Figure`, `expandable={false}`) — git-event → deployment 3→3 map.
  2. `DiagramSequence` (3 steps) — the alias pointer moving across immutable deployments. The lesson's keystone visual.
  3. (Pipeline) — handled by the **Sequence exercise** rather than a static figure, so the order is *practiced* not just shown. If a static visual is also wanted, a simple HTML/CSS horizontal phase strip in a `Figure` works (timeline, no parallelism) — but the exercise is the priority; don't duplicate.
- **Exercises (2):** `Buckets` (git event → environment) after section 1; `Sequence` (pipeline order) after section 3. Both are recall/classification checks appropriate to a model lesson — no live-coding component fits a platform-model topic (confirmed: ReactCoding is react-only; nothing here is React).
- **`Term` tooltips** — use for terms defined in passing so the prose doesn't break:
  - `immutable deployment` — "A build Vercel never overwrites; it stays live on its own URL until deleted."
  - `alias` — "A domain pointer Vercel aims at one deployment at a time; 'deploying' re-aims it."
  - `OAuth` — short gloss (Vercel reads GitHub over a delegated, read-scoped grant; no push access). Only if not already glossed earlier in the course as obvious.
  - `Deployment Checks` — "Vercel feature that holds a deployment un-aliased until external checks (e.g. your CI) pass."
  - `artifact` — "The packaged build output Vercel deploys: bundled functions + static assets."
  Keep the set tight (≤5). Don't gloss `preview`/`production`/`development` — those are *taught*, not assumed.
- **`Aside` usage:** caution aside for the supply-chain corollary; note aside for the env-validator cross-ref to L6/Unit 4. Don't let watch-outs become their own section — each lives in the section teaching the concept it qualifies (per outline rules).

## Scope

**Prerequisites — assume taught, redefine in one line max if touched:**
- Trunk-based git, PR-per-change, squash-merge (Ch096) — assume fluent.
- `git revert` (Ch096 L2) — named only as L7's code-side partner; do not re-explain.
- The four-job CI gate + branch rulesets (Ch097) — assume live; reference as the thing that gates *merges*, contrast with what gates *prod*.
- The `env.ts` Zod build-time validator and the `server`/`client` split (Unit 4 / Unit 5) — name its role (build fails on missing var), defer the schema and full scoping to L6.
- pnpm + `packageManager` field, `.npmrc` `minimumReleaseAge`, SHA-pinned actions (Ch097 / Unit 3) — name as the supply-chain prevention; don't re-teach.
- Neon Postgres (`DATABASE_URL`) (Unit 5) — only as the thing previews must *not* share; branching is L5.

**Explicitly out of scope (route to the owning lesson, do not teach):**
- The Import-from-GitHub flow, the Configure Project screen, the first build log, `vercel link` — **L2**.
- Region selection, Node vs. Edge runtime, Fluid Compute, concurrency, function limits — **L3**. (This lesson may *name* "Node.js runtime" as a default but must not explain the runtime trade-off.)
- Custom domains, DNS records, Let's Encrypt SSL, Cloudflare-in-front — **L4**.
- The Native Vercel–Neon integration, copy-on-write preview branches, the preview-branch lifecycle, migrations-in-build-command — **L5**. (Name only that previews share the prod DB *by default* as a danger; the fix is L5.)
- Env-var scoping mechanics, the `NEXT_PUBLIC_*` deep dive, the validator schema, OIDC federation, secret rotation, managed vars — **L6**. (This lesson establishes *that* scope exists and *that* build-vs-runtime split matters; L6 owns the how.)
- Instant rollback mechanic, `vercel rollback` vs `promote`, auto-assignment-off, the incident runbook, feature-flag escape hatch — **L7**. (Forward-reference as the payoff of immutability/alias; do not teach the mechanic.)
- The eight-row launch checklist, `/api/health`, security headers — **L8**.
- Drizzle schema migrations / expand-migrate-contract — **Chapter 099**.
- Hobby vs. Pro tier pricing details, preview password protection — touch only if needed for a watch-out (e.g., one line that rollback-history depth and preview protection are Pro features); pricing depth belongs to L2/L5 where it's actionable.

**Tone/length guardrails:** ~35–45 min, concept density not procedure density. Three figures + two exercises is the right interaction budget — do not pad with more. No screenshots (no dashboard in this lesson — that's L2). Keep alternatives to one paragraph; keep the CLI section reference-brief.
