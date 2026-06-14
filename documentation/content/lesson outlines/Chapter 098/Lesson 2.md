# From repo to live URL

- Title: From repo to live URL
- Sidebar label: Repo to live URL

## Lesson framing

This is the chapter's hands-on payoff for Lesson 1's model. L1 was pure mental model ("no app code"); L2 is the wiring lesson — the student takes a green-`main` repo and lands a real public production URL, then sets up the per-clone CLI ritual every dev runs. The titular promise from L1 ("the next lesson lands your first real production URL") is paid here.

Pedagogical conclusions that apply lesson-wide:

- **This is a setup/wiring lesson, not a concept lesson.** The deliverable is a procedure the student can replay on their own repo. Lead each section with the senior framing (the *why* / the default-to-second-guess), then give the exact clicks. Keep the celebratory tone out (pedagogical guideline 2) but do name the "your code is on the internet now" moment plainly — it's a genuine milestone and the student should register it.
- **Almost no app code.** The artifacts here are dashboard clicks, a `package.json` field, an optional tiny `vercel.json`, and two CLI commands. Use `Steps` for the click-throughs, `Code` (shell/json) for the small snippets, `Screenshot` placeholders for the two or three dashboard surfaces that genuinely need to be seen. Do **not** manufacture TSX/React examples — there are none in this lesson.
- **Lean on L1's model so every click is a confirmation.** L1 deliberately front-loaded the theory so this lesson "lands as a confirmation instead of a surprise." Repeatedly cash that in: when the first build log shows install→build→package, point back to the pipeline they already ordered; when the PR bot posts a preview URL, point back to the git-event→deployment map. Re-explain nothing from L1 in depth; reference it in one clause and move on.
- **The senior diff is "which auto-detected defaults to second-guess before they ossify."** That's the spine. Vercel fills in Build Command / Output Directory / Install Command / Framework Preset / Project name / Root Directory. Most are correct and should be left; two have a cost-of-being-wrong-later (project name → subdomain rename, broad GitHub App scope → re-install pain). Frame the lesson as "accept the right defaults fast, slow down on the two that ossify."
- **Two deferral guardrails the student must carry out of this lesson, because they're live-fire dangers between now and later lessons:** (1) the first preview deployment shares the **production** database until L5 wires per-PR Neon branches — so no destructive ops against a preview; (2) env vars are skipped on first deploy and added in L6 — so the first build is expected to be a "boots but unconfigured" app, not a fully working one. Both are watch-outs the chapter framing calls out; surface them at the exact moment they become real, not in a footnote.
- **Tier gating debt from L1's continuity note.** L1 omitted Hobby-vs-Pro entirely; L2 is where preview-relevant Pro features start mattering. Introduce the tier distinction lightly *at first mention* (preview password protection, the side-by-side checks) rather than a dedicated section — a one-line `Aside` is enough; the chapter doesn't sell Pro, it assumes it at launch.
- **Cognitive-load shape:** the lesson is naturally chronological (import → first build → first prod URL → push again → first preview → inspect deployments list → CLI setup on clone). Follow that timeline; it's the lowest-load ordering because it mirrors what the student literally does. The one place to resist pure chronology is `vercel.json`, which is a "when would you ever touch this" reference aside, not a step — keep it short and clearly optional.

Continuity anchors to reuse verbatim where natural (established in L1): "the push is the deploy"; deployments are **immutable**; production is an **alias** (pointer); **artifact** = bundled server functions + static assets; "Vercel doesn't push your application code, it reacts to commits" (never the absolute "Vercel can never write to your repo"). Forward-reference L3 (region/runtime), L4 (custom domain), L5 (Neon per-PR branch), L6 (env scoping), L7 (rollback) by name, never re-teach.

## Lesson sections

### Introduction (no header)

Per pedagogical structure: warm, brief, states the goal and the concrete payoff. Open by collecting on L1's debt — "Last lesson you learned what a push *does*; this lesson you make the first one actually happen." State the end state precisely: a public `*.vercel.app` production URL serving the repo, plus the `vercel link` / `vercel env pull` setup teammates run on clone. Name the senior question implicitly (pedagogical guideline: senior question in the intro, not as a section): *what's the smallest set of clicks from a green-CI repo to a production URL, and which of the defaults Vercel auto-fills deserve a second look before they harden?* One sentence flagging that the app won't be fully functional after this first deploy (env vars come in L6) so the student isn't alarmed — frame it as deliberate staging, not a defect.

### Before you import: the three things the repo needs

Short prerequisites section, framed as "the import flow assumes these are already true, and one of them is a footgun if missing." Cover:

- A GitHub repo with the Next.js 16 app and a **green `main`** — the CI gate from Ch097 is live. One clause: you're deploying proven code, which is the whole point of having built the gate first.
- A Vercel account (free to create; the chapter assumes Pro at launch — one `Aside` noting Pro is what unlocks preview password protection and full rollback history, both of which matter later in the chapter).
- **The `packageManager` field in `package.json`.** This is the footgun: it's how Vercel auto-detects pnpm; without it the build silently falls back to npm and the lockfile/install behavior drifts from local. Show the one line.

Code: a single `Code` (json) block showing just the relevant `package.json` excerpt — the `packageManager` line plus enough surrounding keys for context (name, the field). **Convention note for downstream:** Code conventions §"Supply chain and tooling" pins **pnpm 11+** and "`packageManager` field pins the exact version." The chapter outline text says `pnpm@9.x`; that is stale — use a pnpm 11 pin (e.g. `"packageManager": "pnpm@11.x"` rendered with a concrete patch like `pnpm@11.5.0`; the writer should use one realistic 11.x version, not a range, since `packageManager` requires an exact version). This is a deliberate correction of the outline, flagged so it isn't "fixed" back.

Tooltip candidates here: none needed — `packageManager` is explained inline.

### Importing the repo: the Add New → Project flow

The core procedure. Use `Steps` for the click path. Frame first with the senior point: the GitHub App scope you grant at install is the one decision in this flow with asymmetric cost — **broadening later is a Settings change, narrowing usually means a re-install** — so scope it to the single repo, not the whole org/account.

Steps (the writer fleshes each):
1. Vercel dashboard → **Add New → Project**.
2. **Install the Vercel GitHub App** via OAuth — and here's the load-bearing choice: scope it to *only this repo* (the "Only select repositories" option), not "All repositories." Explain the asymmetry in one line.
3. Pick the repo → **Import**.

Then the trust-model callout, reusing L1's corrected framing: Vercel connects to GitHub via OAuth and *reacts to* your commits — it doesn't push your application code. (Do **not** regress to "never writes to the repo"; L1 explicitly corrected that — the App holds some write scopes for workflow/CI-log access.) Keep this to an `Aside` or two sentences; L1 owns the trust model, this is a one-line reminder at the moment the student is clicking "Install."

`Screenshot` placeholder: the GitHub App install screen with the "Only select repositories" repo-scoping selector visible — this is the one screen where seeing the actual radio choice prevents the broad-scope mistake. Desktop viewport. Wrap in `<Figure caption=…>`. Provide a detailed alt-text spec in the placeholder.

Tooltip candidates: **OAuth** (`Term`) — re-explaining the prerequisite concept without breaking flow (student met auth concepts in Unit but a one-line "delegated access without sharing your password" reminder fits).

### The Configure Project screen: accept four defaults, slow down on two

This is the section that carries the lesson's spine (which defaults to second-guess). Structure it as: Vercel auto-detects and pre-fills six things; sort them into "leave it" and "look twice."

Use `Buckets` is tempting but the set is fixed/small and the point is explanatory not classificatory — instead use a short `Code`-free explanatory list, or better a `TabbedContent` is overkill. Decision: plain prose with a tight two-group structure (leave / look-twice), because the reasoning per item matters more than a sorting drill, and an exercise at the end of the section (see below) tests the discrimination.

**Leave these (auto-detected, correct for a single-app Next.js 16 repo):**
- **Framework Preset** — auto-detected as Next.js; leave it.
- **Build Command** — `next build`; leave it. (One forward-ref clause: L5 later overrides this to prepend a migration step for previews — name it, don't do it.)
- **Output Directory** — `.next`; leave it.
- **Install Command** — `pnpm install` (because of the `packageManager` field from two sections ago — close that loop).

**Look twice at these (cost ossifies):**
- **Project name** — becomes the `*.vercel.app` subdomain. Renaming later abandons the old URL. Get it right now; one line on picking a stable name.
- **Root Directory** — `./` for the single-app repo this course ships; only a subdirectory for a monorepo. Name the monorepo case in one clause and move on (out of scope).

Then the deliberate omission, stated as a step: **skip Environment Variables on this first deploy.** Explain *why this is safe and intended*: the app will build and boot, but anything reading a secret (DB, Stripe, etc.) won't work until L6 scopes the vars — that's the next-but-one lesson. Set the expectation that the first deploy is a structurally-live-but-unconfigured app, so the student doesn't read the missing functionality as a failure. Click **Deploy**.

`Screenshot` placeholder: the Configure Project screen showing the auto-filled Framework Preset / Build Command / Output Directory / Install Command and the Environment Variables section left empty. Desktop. `<Figure>` with caption pointing out the auto-detected fields. Detailed alt spec in placeholder.

**Exercise — end of this section.** `Buckets`, two columns, `instructions`: "Sort each Configure Project field by whether you accept the auto-detected default or stop to check it before deploying." Two buckets: `Accept the default` / `Look twice`. Items (correct bucket): Framework Preset (accept), Build Command (accept), Output Directory (accept), Install Command (accept), Project name (look twice), Root Directory (look twice). Goal: cement the lesson's central discrimination. Grading is bucket-match. This is the right exercise type because the learning objective *is* a binary classification of a fixed set.

### Reading the first build log

Frame: the build streams live in the dashboard, and a senior reads it top-to-bottom **once** — not to debug, but to capture the app's shape. Tie directly back to L1's pipeline order (install → build → package → deploy → alias): "you ordered these last lesson; now watch them run." Three things worth a glance, in order:

- `pnpm install` output — warnings worth noting (peer-dep, deprecations), confirmation pnpm (not npm) ran — closing the `packageManager` loop a third time.
- `next build` **route summary** — the static-vs-dynamic table. This is the snapshot of the app's perf profile: which routes are pre-rendered vs rendered per-request. Don't teach static/dynamic deeply (Unit owns that) — name what the columns mean in one or two clauses and say *why a senior glances here*.
- **Function bundle sizes** — flag that an oversized function (Vercel warns) usually means a heavy dep leaked into a server bundle. One clause; L3 owns the deeper version of this check.

Code: a single `Code` (shell/log) block showing a representative trimmed `next build` route-summary output (the ○ static / ƒ dynamic legend and a few routes). Keep it short and clearly illustrative, not a real dump. Annotation is light enough that plain `Code` with a couple of highlighted lines beats `AnnotatedCode` here.

Tooltip candidates: **RSC** only if the route summary references it — likely skip; the static/dynamic legend (`○` / `ƒ`) can be explained inline in the prose rather than via tooltip.

### Your first production URL

Short, punchy — this is the milestone. The build finishes; `<project-name>.vercel.app` is now the **production** deployment URL, live on the public internet. State plainly: this is the moment the code went from private repo to reachable app. Then immediately temper it with the two honest caveats so the student's expectations are calibrated:

- It's not fully functional yet — no env vars (L6), so secret-backed features are dark. Expected, not broken.
- This `*.vercel.app` name is fine as the live URL *for now*, but it's a development artifact; a custom domain replaces it as the canonical address in L4. Reuse L1's rule in one clause: don't hand a `<hash>-<project>.vercel.app` deployment-specific URL to anyone as "the app" (that one's frozen) — the project's main `*.vercel.app` alias is the shareable one until the domain lands.

No new component; prose + maybe a one-line `Aside` calibrating expectations.

### Every push from here is a deploy — including the first preview

Frame: the manual import was a one-time bootstrap. From now on it's the L1 model in motion, with **zero dashboard clicks** for normal operation. Two halves:

- **Push to `main` → production rebuild.** Next merge to `main` triggers a new production deployment automatically. One sentence; it's the L1 mapping made real.
- **Open a PR → first preview URL.** The Vercel GitHub bot comments on the PR with a "Visit Preview" link of the shape `your-app-git-<branch>-<org>.vercel.app`. Fully functional build, billed to the project. This is where the student sees the preview half of the git-event map pay off.

Then the **critical live-fire watch-out**, given its own visual weight (a `caution` `Aside`, not a buried bullet): **until L5, this preview shares the production database.** Any insert/update/delete a preview runs hits prod data. So: no destructive operations against a preview deployment until the per-PR Neon branch is wired (L5, named). This is the single most dangerous gap in the chapter's current state and the student is about to be in it.

Also here, the **PR checks side-by-side** point and the tier-gating debt payoff: on each PR, Vercel's build check and the Ch097 CI checks appear together; both must be green to merge. One clause introducing that preview **password protection** is a Pro feature you'll turn on before sharing any preview externally (L5 owns the toggle; named here at first mention to discharge L1's tier-gating debt).

`Screenshot` placeholder: a PR conversation showing the Vercel bot comment with the preview URL **and** the row of status checks (Vercel + CI) at the bottom of the PR. Desktop. `<Figure>` caption. This single capture does double duty (preview URL surface + side-by-side checks). Detailed alt spec.

Tooltip candidates: none new.

### The Deployments list: your first stop when something looks wrong

Short, reference-flavored. The dashboard's Deployments tab lists every deployment as a row: commit SHA, branch, status, environment, age. Frame its job: it's the first place a senior looks when "something's off in prod" — the green **Production** badge marks the currently-aliased live deployment (tie back to L1: the alias points at exactly one; this list is where you *see* which one). Name that this same list is what L7's rollback flow operates on (re-aliasing to a previous row) — forward-ref, don't teach.

`Screenshot` placeholder: the Deployments list with several rows, the Production-badged row highlighted, columns visible. Desktop. `<Figure>`. Alt spec. (If the screenshot budget is tight, this is the most cuttable of the four — the prose can stand alone — note that to the screenshot agent.)

### When you'd add a vercel.json (usually you don't)

Deliberately a "reference aside," not a step — placed after the deploy flow because it answers a question the student will now have ("do I need a config file?") rather than something they must do. Lead with the answer: the default Next.js project on the Node.js runtime needs **no `vercel.json`**. You reach for one only for specific, later needs:

- `headers` for security headers (L8, named).
- A per-route runtime override (L3, named).
- `crons` — and immediately redirect: use Trigger.dev instead (Unit 12), so in practice you won't use Vercel crons.

Land the senior heuristic: most SaaS projects ship with no `vercel.json` or a ~10-line one; reaching for it early is usually a smell. If a tiny illustrative file helps, a `Code` (json) block of a minimal 3–4 line `vercel.json` (e.g. a single header rule stub) — but keep it clearly labeled "you'll write this later, in L8," so the student doesn't add it now.

Tooltip candidates: **cron** (`Term`) if the student may be unfamiliar — one-line "scheduled recurring job" definition.

### Setup every dev runs on clone: `vercel link` and `vercel env pull`

The lesson's second deliverable and the one the student will use most often. Frame: the import wired *the repo to Vercel*; this wires *a local clone to the Vercel project* — and unlike import, every teammate runs it once per clone, forever. This replaces the historical `.env.example`-and-hand-fill ritual.

Use `Steps`:
1. `vercel link` once from the repo root — associates the local directory with the Vercel project; writes `.vercel/` (gitignored — one clause on why: it's machine-local linkage, not shared config).
2. `vercel env pull .env.local` — pulls the **Development-scoped** variables into `.env.local`. Note (fact-checked against current Vercel CLI docs): `vercel env pull` defaults to the Development environment, which is exactly what local dev wants. Rerun whenever the team adds/changes a dev var.

Code: a `Code` (shell) block with the two commands, no inline comments (house style — the list explains them), matching L1's shell-block convention.

Two reinforcing points:
- **`.env.local` is gitignored** — Development scope on Vercel is the source of truth for *values*, not a committed file. (One clause connecting to the secret-vs-public split that L6 will own — don't teach scoping here, just establish that values live on Vercel.)
- **Keep a `.env.example` anyway** — as documentation: it lists every key (placeholder values) so a contributor *without* Vercel access knows what the app needs. `vercel env pull` provides the real values; `.env.example` provides the map. One or two sentences; this is the senior nuance (the two coexist, they're not redundant).

Forward-ref L6 for the full three-environment scoping story in one clause.

Tooltip candidates: none new (Development scope is explained inline; full treatment is L6).

**Exercise — end of this section (and lesson body).** A `Sequence` ordering drill to lock in the end-to-end procedure the lesson taught, `instructions`: "Order the steps that take a green-`main` repo to a working local + deployed setup." Steps in correct order: (1) Add the `packageManager` field to `package.json`; (2) Add New → Project and install the GitHub App scoped to the one repo; (3) Accept the auto-detected build settings, skip env vars, Deploy; (4) Watch the first build log and note the route summary; (5) Get the first `*.vercel.app` production URL; (6) Run `vercel link` in the clone; (7) Run `vercel env pull .env.local`. Goal: consolidate the chronological procedure into recallable order; reinforces that link/env-pull come *after* the project exists on Vercel. `Sequence` is right because the objective is procedural ordering. (If two exercises feel heavy for a wiring lesson, this `Sequence` is the higher-value of the two and the `Buckets` is the cuttable one — note to downstream.)

### External resources (optional, end of lesson)

`CardGrid` of two `ExternalResource` cards:
1. Vercel docs — importing/deploying a Git repository (reinforces the import flow). Link to Vercel's "Deploying GitHub projects" / import docs.
2. Vercel CLI docs — `vercel env pull` (reinforces the on-clone ritual and the Development-scope default). Link to the `vercel env` CLI reference.

Use `simple-icons:vercel` for the icon where appropriate.

## Scope

**Prerequisites to restate concisely (one clause each, never re-teach):**
- The git-event→deployment mapping, immutable deployments, production-as-alias, the deploy pipeline order, build-vs-runtime env split, the trust model, the Vercel CLI surface — all from **L1**. Reference, don't re-derive. The CLI commands `vercel link` / `vercel env pull` were *named* in L1 as "set up properly in the next lesson" — L2 is that setup, so it's correct to teach the mechanics here.
- The CI gate / branch rulesets from **Ch097** — assume live; one clause ("green `main`").
- The Next.js 16 app and `package.json` shape — assume built; only the `packageManager` field gets attention.

**Explicitly out of scope (deferred — name once at most, with the owning lesson):**
- **Deployment model / immutability / alias theory** — L1 (done).
- **Region, runtime (Node vs Edge), Fluid Compute** — L3. The Configure screen and build-log sections will *touch* "Node.js runtime is the default" only as a given; no runtime decision-making here.
- **Custom domains, SSL, Cloudflare-in-front** — L4. The `*.vercel.app` URL is the live address for this lesson; the domain swap is named as L4's job.
- **Per-PR Neon database branch, the Native Vercel Integration, preview password-protection toggle** — L5. L2 only *warns* that previews share prod DB until then and *names* password protection at first mention; it wires neither.
- **Env var scoping, `NEXT_PUBLIC_*` split, the Zod env validator schema, OIDC** — L6. L2 skips env vars on first deploy and establishes only that Development-scope values live on Vercel and sync via `vercel env pull`; no scoping rules, no validator internals.
- **Instant rollback, `vercel promote`, `git revert` loop** — L7. L2 names the Deployments list as the surface rollback later operates on; teaches no rollback.
- **Database migrations / expand-migrate-contract** — Ch099. L2 only notes the Build Command is later overridden for migrations (L5/Ch099); does not touch migration mechanics.
- **Security headers, the launch checklist, `/api/health`** — L8. `vercel.json` `headers` is named as an L8 concern only.
- **Static vs dynamic rendering theory, RSC internals, bundle-size optimization** — owned by earlier units / L3; the build-log section names the route-summary columns without teaching the underlying rendering model.
- **Monorepo / Root Directory beyond `./`** — named in one clause as the non-default case; not taught.
- **`vercel.json` full surface, per-route config depth** — only the "when would you reach for it" map; no full schema.
