# Neon branching and scale-to-zero

- Title: Neon branching and scale-to-zero
- Sidebar label: Neon branching & scale-to-zero

## Lesson framing

This is a **systems-design / infrastructure mental-model lesson**, not a coding lesson. Zero app code, zero Drizzle, zero queries. The student builds a durable model of what *production* Postgres looks like for a 2026 SaaS and walks away able to reason about: (a) why branching a database can be near-instant and near-free, (b) why a database branch per PR preview is economically sustainable, (c) where the cold-start cost lands and where it doesn't, and (d) the recognizable shape of a provisioned Neon project + Vercel integration. The student does **not** act on Vercel here — Unit 20 (deployment) owns the wiring at depth; this is a read-only walkthrough.

Pedagogical spine, built to minimize cognitive load:

- **One causal chain, introduced once, reused everywhere.** Everything in this lesson falls out of a single architectural fact: *Neon separates storage from compute.* Branching (copy-on-write over shared storage), scale-to-zero (compute is stateless and disposable), cold start (waking a suspended compute), and read replicas (extra compute on the same storage) are all consequences of that one separation. Teach the separation first, in the simplest possible form, then derive each feature from it. The student should finish thinking "of course branching is cheap — branches share storage" rather than memorizing four unrelated features.
- **Contrast with the model the student already holds.** From chapter 036 lesson 1-2 and any prior DB exposure, the student's mental model of "a database" is one server: a process with its disk bolted to it, branching means `pg_dump`/restore (slow, full copy), and an idle server still costs money. Lead by naming that traditional coupling, then show Neon breaking it. The "aha" is the decoupling; frame it as the thing that makes the rest possible.
- **Real production stakes, named explicitly.** The pain Neon relieves is concrete and senior: shared staging contamination (two PRs poisoning each other's test data), the fixed monthly bill for idle preview environments that makes "a database per PR" a non-starter on traditional Postgres, and the fear of running a destructive migration against prod with no escape hatch. Every feature is framed as the answer to one of these.
- **Defaults before conditionals.** Name the course's working setup (two long-lived branches `production` + `staging`, plus ephemeral per-PR branches) as the default early, so later nuance (read replicas, configurable idle windows, what-if branching) attaches to a concrete baseline rather than floating.
- **Honest about the cost.** Scale-to-zero is not free lunch — cold start is real (300-800ms). The senior move is knowing *where* that cost is acceptable (dev branches, idle previews) and where it isn't (production traffic → keep compute warm). Teach the trade, not the hype.

Format mix: this is a diagram-and-decision lesson. Two load-bearing diagrams (a `DiagramSequence` for the PR-preview lifecycle, an `ArrowDiagram` or HTML/CSS figure for storage/compute separation), one decision-shaped comprehension check, and a couple of MCQs targeting the highest-value misconceptions (point-in-time branch semantics, where cold start lands). No live coding (nothing to run). No video unless a tight, current explainer surfaces — see scope note. Code blocks are minimal: connection-string shapes and a Vercel build-command snippet shown for recognition, never as "type this."

Forward-pointer discipline (from continuity notes): the `-pooler` suffix, the `@neondatabase/serverless` driver, and HTTP-vs-WebSocket are **lesson 4's** territory — name "the app connects via a connection string" without anatomizing it here. Migration workflow against a branch is **chapter 040** — name the what-if/migration-on-a-branch capability, don't run it. Postgres major version is **18** everywhere (continuity-notes decision); if a version is shown, it's 18.

## Lesson sections

### Introduction (no header)

Open on the senior question, stated as a scenario, not abstractly: *you're shipping a SaaS in 2026, every pull request gets a live preview URL, and you pay for what you use. What does the production database look like?* Two sub-questions hide inside it: how does each preview get its **own** data without a shared-staging mess, and how do you not pay a fixed monthly bill for a database behind every idle preview? Promise that both answers fall out of one architectural choice Neon makes, and that by the end the student can read a provisioned Neon project and explain why this setup is cheap and safe. Connect back: lesson 2 landed on "the course points `DATABASE_URL` at a Neon branch" — this lesson explains what that branch *is* and why branching is the whole pitch. Keep it to ~2 short paragraphs.

### Storage and compute, pulled apart

**The single load-bearing concept. Everything else derives from here — spend the most care on this section.**

Start with the model the student already holds (state it for them): a traditional Postgres server is one process with its disk attached. Compute (the query-running process) and storage (the data files) live and die together. Consequences the student can feel: copying the database means physically copying the disk (slow, `pg_dump`/restore); an idle server still burns money because the process is always running; you can't add a second read-only copy without replicating the whole disk.

Then the reframe, in two sentences (lift the chapter outline's phrasing): **Neon splits these apart.** Storage is a content-addressed log of page versions, living in durable cloud storage, independent of any running process. Compute is a *stateless* Postgres process the platform spins up on demand and points at that storage. The compute holds no permanent state — kill it and the data is untouched; start a new one and it reads the same storage.

Pedagogical goal of the section: install the decoupling as the lens for the rest of the lesson. Make explicit the three downstream consequences so each later section is "remember the separation? here's what it buys":
- Storage can be **shared** between processes → branching is cheap (next section).
- Compute is **disposable** → it can be suspended to zero when idle (scale-to-zero section).
- Multiple computes can read **one** storage → read replicas (named, dropped).

**Diagram — storage/compute separation.** Goal: make the decoupling visible and contrast it with the coupled model. Use a `TabbedContent` with two tabs, OR a single side-by-side `ArrowDiagram`/HTML+CSS figure inside `<Figure>`:
- Tab/side "Traditional Postgres": one box "Postgres process" fused to a box "disk" — drawn as a single welded unit, to convey "they're one thing."
- Tab/side "Neon": a "Storage (page log)" box at the bottom, durable; one or more stateless "Compute" boxes above it connected by arrows pointing down to storage; visually show storage persisting while compute is detachable. This sets up branching (multiple computes/branches → same storage) and scale-to-zero (compute box can vanish).
HTML+CSS is the strong pick here (the "welded vs. detachable" contrast is a layout/visual idea, not a graph). Keep it short and horizontal per the vertical-space constraint. Caption: "Neon's storage is durable and shared; its compute is disposable. Every feature in this lesson is a consequence of that split."

`Term` candidates in this section: "copy-on-write" (define on first mention — a copy that shares the original's data until something is changed, at which point only the changed pages are written fresh), "stateless" (a process that holds no permanent data of its own; restart it and nothing is lost). Keep definitions one line.

### Branches share storage, so they're nearly free

Derive branching from the separation. A **branch** is a new compute pointed at a *copy-on-write snapshot* of the parent's storage at a point in time. Because the snapshot shares the parent's existing pages and only writes new pages when the branch diverges, creating a branch copies almost nothing — it's near-instant (sub-second) and near-free (you pay storage only for the pages the branch changes). Contrast hard with the traditional model named two sections up: `pg_dump` a 10 GB database and restore it = minutes and a full second 10 GB; branch it on Neon = under a second and ~zero added storage until you write.

**The critical, must-not-skip nuance — point-in-time semantics.** A branch captures the parent **as it was at branch-creation time**. After that, parent and branch are independent: rows the parent gains afterward do **not** appear in the branch, and rows the branch writes do not flow back. This is the single most common branching misconception and it has real consequences (an old branch shows stale data; "why isn't my new prod row in this branch?"). Teach it explicitly and immediately, right where branching is introduced, not as a trailing watch-out. A one-line visual or just clear prose with a tiny timeline; a `Term` on "point-in-time" reinforces it.

Land the senior payoff of branching as a list of what it unlocks (each gets ~1 sentence, then the dedicated sections expand the first two):
- A branch **per preview deployment** → isolated test data per PR (next section).
- Two long-lived branches: `production` (the primary) and `staging` (a long-lived branch off prod) → the course's working setup. Name this as the default now.
- **What-if / migration rehearsal**: branch prod, run the scary destructive migration or exploratory query on the branch, throw the branch away if it goes wrong. Named as available; the migration workflow itself is chapter 040 (explicit forward pointer).

No code here — branching in this lesson is created by the platform/integration, not by the student typing a CLI command. Keep it conceptual.

### A database branch for every preview

The headline workflow and the concrete answer to the introduction's first sub-question. Walk the lifecycle of one pull request end to end. This is where the **branch-per-preview** pattern becomes tangible.

**Diagram — the PR-preview lifecycle (`DiagramSequence`).** This is the lesson's centerpiece diagram; the temporal scrub matches the temporal workflow. Five steps, each a simple labeled state (HTML boxes, keep horizontal and compact):
1. **PR opened.** Developer pushes a branch, opens a PR on GitHub. State: prod + staging branches exist; no preview branch yet.
2. **Neon branch created.** The Vercel ↔ Neon integration catches the event and creates a Neon branch (named like `preview/<git-branch>`) off the parent. Highlight the new branch appearing, sharing storage with prod (callback to copy-on-write).
3. **Preview deployed with the branch URL.** Vercel builds the preview deployment and injects *that branch's* connection string as the deployment's `DATABASE_URL`. The preview app now talks to its own isolated database. Emphasize: this preview's data is its own — seeding or mutating it can't touch prod or any other PR.
4. **Iterate safely.** Developer pushes more commits, runs migrations against the preview branch, QA pokes at real isolated data. No shared-staging contamination.
5. **PR merged/closed → branch deleted.** The integration (when auto-delete is enabled) tears the branch down; storage for its diverged pages is reclaimed. Back to prod + staging.
Per-step captions carry the narration. Pedagogical goal: convert the abstract "branch per preview" into a felt sequence with a clear beginning and disposal at the end — the disposability is what makes it sustainable, which sets up scale-to-zero.

State the production stakes plainly in prose alongside the diagram: **shared staging is the anti-pattern this kills.** On a single shared staging DB, two PRs in flight stomp on each other's data; a destructive test in one breaks the other's QA; nobody trusts staging data. A branch per PR gives every preview a clean, isolated, prod-shaped database — and because branches are cheap (previous section) and idle ones cost almost nothing (next section), you can afford one per open PR.

**The two integration flavors — name them, keep it light (recognition, not setup).** As of 2026 the Vercel ↔ Neon integration comes in two shapes, and the difference matters only for *how cleanup happens*:
- **Neon-Managed**: you opt into "automatically delete obsolete Neon branches"; cleanup runs the next time a preview deploys.
- **Vercel-Managed**: preview branches are deleted when Vercel removes the corresponding deployment (governed by Vercel's deployment-retention policy, ~6 months by default).
Don't tutorial either one — Unit 20 owns the actual setup. The teaching point: **auto-delete is a setting you must enable/understand, or branches accumulate** (this is the real watch-out, taught here in context rather than dumped at the end). One short paragraph or a tiny two-item comparison; do not over-invest.

Forward pointer, explicit: *how* the preview app actually opens a connection over that injected URL (the driver, the pooled `-pooler` endpoint) is lesson 4. Here it's just "the integration injects a connection string and the app reads it."

### Compute sleeps when nobody's looking

Scale-to-zero, derived from "compute is disposable." Because a Neon compute holds no permanent state, the platform can **suspend it entirely after an idle window** and you pay nothing for compute while it's asleep — storage persists untouched, so no data is lost. A fresh query **wakes** it. State the current numbers (fact-checked June 2026):
- Default idle window: **5 minutes** of inactivity, then suspend. On paid (Scale) plans this is configurable (as low as ~1 minute, up to keeping it always-on); **the free tier's 5-minute window is fixed** (continuity-notes alignment — say so).
- Wake (cold start): roughly **300-800ms** to resume; total time-to-first-query typically **0.5-1s**; p99 around 500ms.

**The senior implication, stated as the economic punchline that closes the loop opened in the introduction:** an idle preview branch bills **storage only** — compute drops to zero. *This* is what makes "a branch per PR" economically sustainable: ten open PRs aren't ten databases burning compute 24/7; they're ten cheap storage snapshots whose compute spins up only when someone actually opens the preview. Explicitly tie scale-to-zero + cheap branching together as the two halves of the same affordability story.

**Honest cost — cold start, and where it lands.** The first query after a suspend pays the wake latency; every query after that on the same warm compute is fast. The senior move is matching the cost to the surface:
- **Dev branches and idle previews**: cold start is fine — nobody's SLA depends on a preview's first hit.
- **Production traffic**: you do **not** want users eating a cold start, so production keeps compute warm (configurable minimum / longer-or-disabled idle window). Production's idle window is a deliberate cost-vs-latency knob.
Frame it as a per-branch decision, not a global one. This is the "trade, not hype" beat from the framing.

**Free-tier ceiling — name it as a real constraint (fact-checked, 2026 numbers).** Neon's free plan: ~100 compute-hours (CU-hours) per project/month, 0.5 GB storage/project, 10 branches/project, 100 projects. Adequate for a course and a side project; undersized for live production traffic. The honest senior note: free tier teaches the model perfectly but you'll outgrow its compute-hours under real load. Keep to one or two sentences — exact numbers drift, so state them as "around" and point to pricing docs in External resources.

`Term` candidate: "scale-to-zero" was named in lesson 2 — re-anchor briefly rather than redefine from scratch (continuity: it's already in the student's vocabulary). "cold start" deserves a one-line `Term` (the latency penalty paid by the first query that has to wake a suspended compute).

### The shape of a production Neon project

Synthesis section. Pull the pieces into the recognizable production shape the student should be able to read on a real project — **described, not executed** (read-only walkthrough; the student does not touch Vercel here).

The shape, as a short labeled list / small figure:
- A Neon **project** containing a `production` **primary** branch (this is what `DATABASE_URL` points at in prod) and a long-lived `staging` branch off it.
- A **Vercel ↔ Neon integration** that creates an ephemeral branch per preview deployment and injects that branch's connection string into the preview — with **auto-delete enabled** so branches don't pile up.
- Production compute tuned to **stay warm** (no user-facing cold starts); dev/preview branches left to **scale to zero**.

Optional small figure: a simple HTML/CSS or `ArrowDiagram` tree — `Project` node → `production` (primary) and `staging` (long-lived) children, plus a dashed cluster of `preview/*` ephemerals fanning off `production`, annotated "created/destroyed per PR." Goal: one glanceable picture of the whole environment topology. Keep it compact and horizontal. Reuse the prod/staging/ephemeral vocabulary already established so it reads as a recap, not new material.

State the recurring watch-out **in context** here, not as a trailing list: **`production` is just a branch by convention.** Nothing technically stops a junior from running a destructive migration straight against the `production` branch without branching first — the platform won't save you; the *discipline* (branch → test → apply, chapter 040) does. This is the natural place for it because the student is now looking at the topology and can see prod sitting right there, unprotected by anything but a name.

Explicit forward pointers in this section: provisioning + the integration setup at depth → **Unit 20 / chapter 098 (deployment)**; the migration discipline (branch, run, promote) → **chapter 040**; how app code connects to whichever branch's URL → **lesson 4**.

### Comprehension check

Place comprehension *at the moment of the relevant concept* where it fits, but consolidate the higher-value checks here so the student validates the model before moving to lesson 4's driver mechanics. Mix:

1. **A `StateMachineWalker` (`kind="decision"`) — "Which branch / setting does this situation call for?"** Forces the student through the senior's reasoning order. Goal: confirm they can map a real situation to the right Neon move. Example questions → leaves:
   - "You need to rehearse a destructive migration before prod." → Leaf: *Branch production, run it on the branch, discard.* (the what-if pattern)
   - "Every PR's QA keeps colliding with other PRs on shared data." → Leaf: *Branch per preview deployment via the Vercel integration.*
   - "Users are complaining the first request each morning is slow." → Leaf: *That's a cold start on a scaled-to-zero compute; keep production compute warm.*
   - "Old preview branches are piling up and storage is creeping." → Leaf: *Enable auto-delete of obsolete branches in the integration.*
   This is the right component because the lesson "lives in the order the senior asks questions," exactly the walker's stated strength, and there's no code to write.

2. **A `MultipleChoice` on point-in-time branch semantics** — the highest-value misconception. Stem: a branch was created off `production` on Monday; on Tuesday three new rows are inserted into `production`. What does the branch see? Correct: *the data as of Monday — the new rows are not in the branch.* Distractors cover the common wrong models (branch auto-syncs; branch sees everything live; branch writes flow back to prod).

3. **A `MultipleChoice` (or `TrueFalse` round) on the cost model** — targets "scale-to-zero means free" and "cold start hits production." E.g. "An idle preview branch with no traffic bills you for: (a) nothing at all, (b) storage only, (c) compute + storage, (d) a flat monthly fee." Correct: storage only. Reinforces the affordability punchline.

Keep each exercise tight; this is recall/transfer, not a graded gate. No quiz here — the chapter quiz (lesson 5) owns formal assessment.

### External resources

A small `CardGrid` of `ExternalResource` cards (brand cue matters). Strong candidates (verify URLs live at authoring time):
- Neon docs — **Scale to Zero** (`neon.com/docs/introduction/scale-to-zero`) — the canonical reference for the idle/wake numbers that will drift.
- Neon docs — **Branching** overview — copy-on-write model at depth.
- Neon docs — **Vercel integration / branch-per-preview** (`neon.com/branching/branch-per-preview` or the managed-integration guide) — for the student who wants the setup Unit 20 defers.
- Neon **pricing** page — the authoritative source for free-tier limits (state in prose that exact numbers move; link for current).
Each card: one-line description framing *why* the student would click it. Icon `simple-icons:` for Neon/Vercel where available, else `lucide:*`.

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- `DATABASE_URL` is the single connection-string contract the app reads (lesson 2) — here it's "what the integration injects per branch," not re-anatomized.
- Postgres is the committed engine; Neon is the committed host (lessons 1-2).
- "Branch off `main`" / Git PR-preview vocabulary — assume the student knows Git branches and Vercel preview deployments at a surface level from earlier units; this lesson borrows the *intuition* of a branch, applied to data.

**Out of scope — belongs to other lessons (do not teach here):**
- The `@neondatabase/serverless` driver, HTTP vs. WebSocket, the `-pooler` pooled vs. unpooled connection string, PgBouncer/connection pooling — **all lesson 4.** This lesson stops at "the app connects via the injected connection string." Do **not** show the `-pooler` suffix or driver code.
- Drizzle's `db` client wiring (`neon-http` / `neon-serverless`) — **chapter 037.**
- The actual migration workflow against a branch (Drizzle Kit, branch → test → promote mechanics) — **chapter 040.** Name the what-if/rehearsal capability; don't run a migration.
- Vercel deployment setup, environment-variable wiring, installing the integration step-by-step — **Unit 20 / chapter 098.** Production provisioning is described read-only for recognition only.
- Seeding preview/dev branches with data — **chapter 040 lesson 2** (named as "you'd seed the branch," not shown).
- Multi-region replication, geographic latency, read/write splitting at depth — **out of scope** for the course.
- Self-hosted Postgres alternatives (RDS, Supabase, Fly Postgres) — **out of scope**; the course commits to Neon (named once for recognition at most, consistent with lessons 1-2).
- Read replicas — **named once and dropped** (it's the "multiple computes, one storage" consequence; mention as available, don't teach configuration).

**No video by default.** Infrastructure explainers age fast and the lesson's value is the derivation, not a walkthrough. Include a `VideoCallout` only if authoring-time research surfaces a current (≤6-month-old), accurate Neon branching/scale-to-zero explainer; otherwise omit.
