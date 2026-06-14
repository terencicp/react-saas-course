# A Neon branch per preview

- **Title:** A Neon branch per preview
- **Sidebar label:** Neon branch per preview

---

## Lesson framing

This is the chapter's load-bearing safety lesson. The student finished L2 with a live app and PR previews, but those previews read the *production* `DATABASE_URL` — a test insert pollutes prod, a destructive migration corrupts it. This lesson closes that hole: wire the Native Vercel-Neon Integration so every PR gets its own copy-on-write database branch, run migrations against that branch at build time, and let the branch tear down on PR close.

Pedagogical conclusions that apply lesson-wide:

- **Lead with the danger, then the fix.** The motivating problem (previews share prod DB) was explicitly flagged in L2 and L3 as "deferred to L5." Open by making the stakes visceral — a screenshot/diagram of one DB serving prod + every preview — then introduce branching as the structural fix. This matches the course's "decisions before syntax / trigger before tool" filter: the shared-DB hazard is the threshold the platform default crosses.
- **Copy-on-write is the one genuinely new *concept*; everything else is wiring.** The student knows Postgres and Drizzle (Unit 5) and the deployment model (L1). The new mental model is Neon's CoW branching: a branch is a pointer at a snapshot, reads serve from the parent until a write diverges, so branches are instant and near-free. Teach this with a simplified visual *before* any CLI/integration steps — if the student doesn't grok CoW, the rest is cargo-culting. Build the model in stages: (1) one shared DB (today's danger), (2) a branch as a snapshot pointer, (3) divergence on first write, (4) the per-PR lifecycle.
- **Two things are intentionally black boxes,** to keep cognitive load down and respect scope: the *migration safety story* (expand-migrate-contract) is Ch099's job — here migrations are "the command that makes the preview schema match the PR's code"; the *Drizzle framework itself* is Unit 5. State both boundaries explicitly so downstream agents and the student know the line.
- **Mental model the student should leave with:** three fully-isolated environments, each with its own Neon branch — dev (one branch you control), preview (one auto-managed branch per PR), prod (`main`). The integration is one-time wiring; after it, the per-PR branch is automatic and invisible. "A preview is a real, throwaway copy of production you can break freely."
- **What the student can do by the end:** install the integration, explain what `DATABASE_URL` each environment resolves to and why, wire migrations into the preview build, turn on preview password protection, and reason about the lifecycle + leak surfaces (PII in branched data, abandoned-PR branch buildup).
- **Code's role is small and procedural.** This is a wiring lesson: dashboard steps, a Build Command override, a tiny migrate script, a few `neonctl` commands. No React/TSX. Favor `Steps` for the install procedure and `Code` for the shell/script snippets. The heavy lifting is two diagrams (the shared-DB-vs-branched contrast and the CoW lifecycle) and a `Checklist` for the "is my preview safe" gate.
- **Tier gating must appear at first mention.** Per the L1 continuity debt, preview password protection is a Pro+ feature — name the tier the first time it comes up, don't assume Hobby.
- **Honor prior-lesson corrections:** the proxy file is `proxy.ts` (never `middleware.ts`); `packageManager` is `pnpm@11.x`; migrations are `generate → review → migrate`, never `push`; the unpooled client is `dbUnpooled` and migrations use it.

---

## Lesson sections

### Previews are running against production right now

Open with the senior question framed as a live hazard, not an abstraction: the student's PRs already get preview URLs (L2), and those previews resolve the **same `DATABASE_URL` as production**. Spell out the three concrete failure modes: (1) a tester signs up / inserts rows on the preview → junk in prod; (2) the PR includes a migration → it runs against prod (or the app 500s on a schema the prod DB doesn't have yet); (3) a destructive seed/cleanup script → real data gone. Reinforce that L2 explicitly warned "don't run destructive ops on previews until L5" — this is L5 paying that debt.

Then state the goal in one sentence: every PR should exercise a database **shaped like production but isn't production**. Name the two non-solutions the student might reach for and why they fail (sets up "why Neon"): a single shared staging DB (previews still collide with each other; no per-PR isolation) and spinning a fresh Postgres per PR via a CI script (slow, expensive, you copy gigabytes each time). The right answer needs *instant, near-free, isolated* per-PR databases — which is exactly what Neon's branching gives.

Diagram (anchor visual #1) — **the danger, made literal.** A simple `ArrowDiagram` inside `<Figure>`: three preview deployment boxes + one production box, all arrows converging on a single "Production database" cylinder, arrows tinted red/danger. Caption: every environment writes to the same rows. Goal: make the shared-DB hazard impossible to wave away before the fix lands. Keep it horizontal and compact per the vertical-space constraint.

`Term` candidates here: none new yet — `DATABASE_URL` is familiar from Unit 5; just remind in prose that it's the one connection string Drizzle reads.

### How Neon branching works

The conceptual core. Teach copy-on-write branching from first principles, simplified then layered, because this is the one new idea the whole lesson rests on.

Build it in four stages, then show those same four stages as the anchor diagram:

1. **A branch is a pointer at a snapshot.** Neon separates storage from compute; a branch is a logical pointer at a point-in-time snapshot of its parent's data. Creating one copies *no* data — it's instant regardless of DB size.
2. **Reads serve from the parent.** Until the branch is written to, every read is served from the shared parent storage. A fresh branch is nearly free to keep idle.
3. **First write diverges.** The moment the branch writes a row, only the changed pages diverge (copy-on-write); the rest stays shared. The branch is now fully isolated for both reads and writes — nothing it does touches the parent.
4. **`main` is just the production branch.** Production lives on Neon's `main` branch; previews branch off it. So a preview starts as an exact snapshot of prod data and then lives its own life.

Anchor visual #2 — **`DiagramSequence`** (four steps mirroring the four stages above). Each step is a small HTML/CSS figure: parent storage block + a branch pointer, highlighting the active concept (snapshot pointer → shared reads → one diverged page → isolated branch). Pedagogical goal: turn "copy-on-write" from a buzzword into a picture the student can replay. This is the single most important figure in the lesson — note for the diagram agent that the four steps must read as a progression, not four unrelated panels. Cross-reference the L3 continuity note that the chapter already uses `DiagramSequence` for the Fluid-Compute figure, so the pattern is established.

Land the payoff explicitly: instant to create, near-free idle, fully isolated — *this trio is why a database-per-PR is suddenly practical*, and why no other Postgres host is the course default for this (named once, expanded in the fallback section).

`Term` candidates: **copy-on-write** (define: only modified data is duplicated; unchanged data stays shared), **snapshot** (a point-in-time logical image of the parent's data). Keep both to one line so they don't interrupt the flow.

### Wiring the Native Vercel-Neon Integration

The hands-on heart. Use `Steps` for the install procedure (numbered, followed-in-order). Frame it as a *one-time* setup that makes everything afterward automatic.

The steps (dashboard flow): Vercel → Integrations → Browse Marketplace → Neon → Install → select the Vercel project → authorize Neon → pick the Neon project to pair. Result: the integration adds `DATABASE_URL` to the **Preview** environment as a **managed** variable — Vercel won't let you hand-edit it because it's overwritten per deployment. Production's `DATABASE_URL` is untouched.

Then describe what the integration *does on every PR* (this is the behavior, separate from the install steps — put it right after as prose + the lifecycle diagram referenced below): on preview deployment, Neon creates a branch (named after the git branch, e.g. `preview/<branch>`) off `main`; Vercel injects that branch's connection string into the deployment's `DATABASE_URL` at **per-deployment scope**; on PR merge/close, the branch is deleted.

Cover the **Neon-Managed vs. Vercel-Managed** install choice as a short decision (not a full section — it's a one-time fork): functionally equivalent for preview branching. Vercel-Managed = Neon provisioned + billed through Vercel (greenfield). Neon-Managed = Neon is the system of record, Vercel pulls connection strings, billing stays on Neon. **Course default: Neon-Managed**, because Unit 5 already set Neon up directly — this keeps a single source of truth. State this rationale so the student understands it's a continuity decision, not arbitrary.

Call out the **managed variable** concept as a best practice inline (not a tips section): integration-injected vars are correct by construction; the lock icon is a feature, not a limitation — don't fight it. Forward-ref L6 which covers env-var scoping in depth (this lesson only touches the Preview `DATABASE_URL` the integration owns).

`Term` candidates: **managed variable** (an env var injected and overwritten by an integration; not hand-editable). **per-deployment scope** can stay prose.

### Making the preview schema match the PR

The migration-wiring section — the subtle bit students get wrong. Set up the problem precisely: a preview branch starts as a copy of prod's data **and prod's schema**. If the PR adds a column/table, the preview's code expects a schema the freshly-branched DB doesn't have yet → runtime errors. So the preview build must **run the PR's migrations against the preview branch before the app boots**.

Show the standard wiring with `CodeVariants` (before/after of the Build Command), because the contrast is the teaching point:
- **Before:** Build Command = `next build` → preview boots on un-migrated branch → schema mismatch.
- **After:** Build Command = `pnpm db:migrate && next build` (or a `prebuild` script) → migrations apply to the deployment's `DATABASE_URL` (the preview branch) first.

Show the tiny `db:migrate` script too (plain `Code` block). Keep it minimal and conventions-correct: it reads `DATABASE_URL` from the environment (so it automatically targets whatever branch this deployment got), uses Drizzle's `migrate()` over the **unpooled** client (`dbUnpooled` per conventions — migrations want a stable single connection, not the pool), and runs the committed `drizzle/` migrations. Explicitly note migrations are `generate → review → migrate`, never `push` — the student already has reviewed migration files in `drizzle/` from Unit 5; the build only ever *applies* them.

**Treat migration mechanics as a black box on purpose.** Add an `Aside` (note) drawing the scope line: *what* the migration does and *whether it's safe to run automatically* is Ch099's expand-migrate-contract story; here we only wire *where* and *when* it runs. This keeps the lesson from sprawling into migration-safety territory.

The **production caveat** — a real watch-out taught inline, not buried: putting migrations in the Build Command means **every prod deploy also runs migrations against `main`'s database**. That's safe under the expand-migrate-contract cadence (Ch099) but dangerous with a naive destructive migration. State the senior call: migrations-in-build-command is fine for *previews*; production migrations belong behind a gated CI "migrate" job with explicit approval — full story in Ch099. This is the one place the lesson must not oversell the build-command pattern.

`Term` candidates: **`dbUnpooled`** could be a quick reminder in prose rather than a Term (it's a project export from Unit 5, not a general concept).

### The lifecycle of a preview branch

Make the ephemerality concrete. Walk the branch through its life as a short ordered list (`Steps` or a compact phase strip): **PR opened** → branch created off `main`, seeded with prod's snapshot. **Push to the PR** → same branch reused, migrations re-run so schema tracks the latest commit. **PR merged or closed** → branch auto-deleted (default; configurable).

The load-bearing takeaway, stated plainly: **a preview branch is ephemeral by design — never store anything in it you need to keep.** Pair with the watch-out: auto-delete-on-close means *debug data vanishes when you close the PR* — if you need to inspect a failing preview's data, copy it out (or use `neonctl` to branch from it) **before** closing.

Optional small diagram: reuse the lifecycle as a compact horizontal phase strip (HTML/CSS) if it reads better than a list — diagram agent's call; the list may suffice given the `DiagramSequence` already carries the conceptual weight. Don't over-diagram.

### `neonctl` for the branches the integration doesn't manage

Position `neonctl` correctly: the integration handles preview branches **automatically**; `neonctl` is the CLI for the *manual* branch work that lives outside that flow. Give the three realistic reach-for-it moments: (1) inspect/branch-from a closed preview's data before it's gone, (2) reset a branch back to its parent (`neonctl branches reset`) to get a clean copy without re-creating, (3) fork an ad-hoc experiment branch.

Show the handful of commands in a `Code` block: install (`pnpm add -g neonctl`), `neonctl auth`, `neonctl branches create --parent main`, `neonctl branches reset` (resets a child branch to its parent's latest data — the clean-copy move), `neonctl branches list`. Keep it a reference snippet, not a deep dive — the student rarely needs it day-to-day, which is exactly the framing.

Fact-checked (June 2026): Neon recently shipped a branch-first local dev loop — `neonctl link`, `neonctl checkout`, `neonctl env pull` — that writes a `.neon` file pinning the active branch and pulls its connection string locally. Mention this *once* as the modern way to point local dev at a Neon branch (it dovetails with the dev-branch member of the trio in the next section); don't expand it into a tutorial. Note: `branches reset` currently only supports reset-from-parent.

`Term` candidates: none — `neonctl` is self-evident as "Neon's CLI" in prose.

### The three environments, three branches picture

Tie it together with the mental model the student should leave with. One clean statement: three fully-isolated environments, each backed by its own Neon branch — **dev** (a `dev` branch you control locally; synced via `vercel env pull`, a callback to L2), **preview** (one auto-managed branch per PR), **production** (the `main` branch). Same schema, isolated data.

Anchor visual #3 — a compact `ArrowDiagram` or HTML/CSS figure: three environment boxes each pointing at a distinct Neon branch off the same Neon project, visually contrasting with the opening "all → one DB" danger figure (deliberate bookend — same shape, now fanned out safely). Pedagogical goal: the student sees the fix as the inverse of the danger. Caption should explicitly call back to the first figure.

Forward-ref L6 lightly: *how* the dev branch's `DATABASE_URL` gets scoped and pulled is L6's env-var lesson; here it's named as the third member of the trio.

### Keeping previews safe to share

The security/operational watch-outs, taught as a concrete gate rather than a tips dump. Two real leak surfaces and their fixes:

1. **Preview URLs are publicly reachable** unless protected, and the branch carries **a copy of production data** — including any PII. Fix: turn on **preview password protection** (Vercel → Settings → Deployment Protection → Preview Deployments → Password Protection; one password per project). Name the tier at first mention: this is a **Pro+** feature (honoring the L1 tier-gating debt). For genuinely sensitive industries, the stronger move is a **schema-only branch** — Neon's first-class feature (Beta as of mid-2026, fact-checked) that branches the *structure* without copying any rows, so previews exercise the real schema with zero PII exposure (`neonctl branches create --schema-only`). Name it as the escalation, not the default. Course default: password-protect + accept the cloned-prod shape for non-sensitive data.
2. **Branch buildup against the project's branch cap.** Neon projects have a per-plan branch limit (typically 100+). Closed PRs auto-delete their branches, but abandoned PRs accumulate; Dependabot/Renovate open many PRs (usually fine because they merge/close fast). Fix: rely on auto-delete-on-close; periodically prune stragglers with `neonctl`.

Close the section — and the lesson — with a `Checklist` the student ticks while wiring their own project ("My previews are safe"): integration installed; Preview `DATABASE_URL` shows as managed; migrations run in the preview build; preview password protection on; a test insert on a preview does *not* appear in prod (the proof the isolation works). This makes the abstract guarantee verifiable. The last item is the killer demo: insert on the preview, query prod, confirm absence.

`Term` candidates: **PII** (personally identifiable information — likely already defined earlier in the course, so a Term tooltip only if not previously introduced; keep it cheap).

### When you're not on Neon

Short closing decision section, named once per the chapter's "alternatives named once" thread. Self-hosted Postgres / RDS don't offer copy-on-write branching as a first-class feature. The fallbacks and why each is worse: a per-PR DB created by a CI script (heavy, slow, full copy), a shared staging DB (no per-PR isolation — back to the collision problem), or accepting prod-shared (only tolerable for strictly non-destructive PRs). Conclusion: Neon's branching is *why* it's the course's Postgres default — in 2026 no other managed Postgres offers this as a built-in. Keep it tight; this justifies the stack choice without turning into a vendor comparison.

---

## Scope

**Prerequisites to redefine concisely (assume known, one-line reminders only):**
- The deployment model — git push → immutable deployment, production-as-alias (L1). Reminder only.
- Preview deployments exist and get `*.vercel.app` URLs on each PR (L2). The integration builds on this.
- `DATABASE_URL` is the single connection string Drizzle reads; Neon is the Postgres host (Unit 5). Remind, don't reteach.
- The region rule (function region matches DB region) — L3; this lesson notes the region rule applies to the *production* branch and doesn't re-derive it.
- `dbUnpooled` is the project's stable single-connection client used for migrations (Unit 5 / conventions). Remind at the migrate-script.

**Explicitly out of scope (do not teach; forward-ref where useful):**
- **Env-var scoping mechanics across the three environments, `NEXT_PUBLIC_*`, the Zod env validator** — all L6. This lesson only touches the Preview `DATABASE_URL` the integration manages.
- **Expand-migrate-contract / migration safety / reversibility** — Ch099. Migrations are a black box here: where and when they run, not whether a given migration is safe.
- **The Drizzle framework, schema authoring, `drizzle-kit generate`** — Unit 5. The student already has reviewed migrations in `drizzle/`.
- **Rollback** (instant alias re-promotion, `git revert`) — L7.
- **The full launch checklist** (the eight rows incl. backups, pooling verification) — L8. This lesson's `Checklist` is preview-safety-specific, not the launch gate.
- **Tenant-data isolation / RLS** — Unit 9/10. "Isolated branch" here means *environment* isolation, not *tenant* isolation; don't conflate.
- **First-deploy mechanics, `vercel link`, Import-from-GitHub** — L2. `vercel env pull` is named only as the dev-branch sync, deferred to L6 for depth.
- **Custom domains / Cloudflare / SSL** — L4.
- **Drizzle 1.0 migration-directory layout changes** — out of scope; use the current flat `drizzle/<timestamp>_<name>.sql` shape per conventions.

---

## Notes for downstream agents

- All Vercel/Neon dashboard figures should be **HTML/CSS mocks**, not real screenshots — matches the established L2/L3/L4 convention for authenticated UI surfaces.
- The three anchor visuals (danger convergence → CoW `DiagramSequence` → three-branch fan-out) are the lesson's backbone; the opening danger figure and closing fan-out figure are a deliberate bookend (same shape, inverted outcome). The `DiagramSequence` is the highest-value figure — prioritize it if budget is tight.
- No live-coding exercise fits cleanly (no in-browser runtime models Vercel/Neon integration). The verification `Checklist` is the assessment vehicle; a short `Sequence` exercise (order the per-PR branch lifecycle: open → branch created → push → migrate → close → delete) is a strong optional comprehension check and reinforces the lifecycle section. Skip MCQ unless the writer wants one on "what `DATABASE_URL` does a preview resolve to."
- Code conventions touched: migrate script uses `dbUnpooled`; migrations `generate → review → migrate` never `push`; `pnpm@11.x`; `proxy.ts` not `middleware.ts` if the proxy is ever mentioned.
