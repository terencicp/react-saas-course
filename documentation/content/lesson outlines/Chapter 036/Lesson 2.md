# Lesson 036.2 — Local dev: Docker, Neon branch, or Neon Local

- **Title (h1):** Where your local database runs
- **Sidebar label:** Local dev database

---

## Lesson framing

**The one senior question this lesson answers:** when the student runs `pnpm dev`, where does the Postgres it talks to actually run? This is a *decision* lesson, not a syntax lesson — it lives in the trade-off, not in any single config file. The deliverable is a mental model plus a default the rest of Unit 5 assumes, not a feature the student builds.

**The mental model the student should leave with:**
- The app never knows where the database is. It reads one Postgres connection string, `DATABASE_URL`. Swapping the database provider is editing one environment variable — nothing in app code changes. This abstraction is the spine of the whole lesson; every option below is "a different thing on the other end of the same string."
- There are three credible 2026 answers, arranged on one axis: **offline-capable ↔ prod-parity**. Docker Postgres sits at the offline end (works on a plane, drifts from prod). A Neon dev branch sits at the prod-parity end (identical to production, needs connectivity). Neon Local is the hybrid that buys a `localhost` string *and* prod-parity, still needing connectivity.
- The course default is the **Neon dev branch** — for a SaaS on this stack, prod-parity prevents more bugs than offline-capability prevents lost hours. The student should be able to justify that default and name the two thresholds that flip it.

**Why this framing minimizes cognitive load:** establish the invariant (`DATABASE_URL`) first, so each of the three options is a small variation on a fixed shape rather than three unrelated setups. Teach the cheapest-to-understand option (Docker) first because it needs the most vocabulary, then the two Neon options which are conceptually lighter once the contract is clear. The decision tree comes last, after all three options are on the table, so the student is choosing between things they understand.

**Real production stakes to foreground:** the pain this lesson relieves is the "works on my machine" bug — code that passes locally and breaks in CI or staging because the local Postgres is a different major version, lacks an extension, or pools connections differently. Postgres major-version drift between local and prod is the single most common cause. This is the senior's actual reason for caring about prod-parity, and it should be stated as a concrete failure, not an abstraction. (Concrete, current example available: the `postgres:18` image moved its data directory — local-vs-prod version mismatches bite in real, mundane ways.)

**Tone and depth:** adult, terse, assumes competence (per pedagogical guidelines). The student has prior programming experience but is new to this stack. Docker is *named and used*, never taught as a subject — give exactly the four words of vocabulary needed to read a `docker-compose.yml` and stop. No celebratory tone, no "what is a container" preamble beyond the working definition.

**What carries the lesson:** one decision-walker (the senior question, asked in order), one three-tab code comparison (the same `DATABASE_URL` contract pointed at three sources), one small annotated `docker-compose.yml`, and a short connection-string anatomy visual. No video by design — this is a decisions lesson with no public explainer that beats prose. No live-coding exercise — there is nothing to *run* here that a sandbox can host (the runtimes are Docker daemons and cloud accounts); comprehension is checked with a decision-recall MCQ instead.

**Continuity (from `Continuity notes.md` and ch037 scope):** lesson 1 already installed Postgres-as-engine, the worked invoicing schema, and money-as-`numeric`; it deliberately made no major-version claim and tagged `postgres:17` only as a forward note. This lesson owns the version call and lands on **Postgres 18** as both the prod (Neon) and the Docker tag, so local and prod match — that parity *is* the lesson's point. `DATABASE_URL` lives in `env.ts` validated by Zod — that file and its validation are **ch037 L2's** to build; here it is named as "the contract the app reads," not constructed. Migrations and seeds are named as deferred (ch040). The driver/pooling story (HTTP vs WebSocket, `-pooler`) is **explicitly out** — that's L4 of this chapter.

---

## Lesson sections

### Introduction (no heading)

Open on the senior question, concretely: the student's app from earlier chapters runs `pnpm dev` and needs to read and write invoices — but where is the Postgres it connects to? Frame the two failure poles a junior hits: (a) "I'll just use a cloud database" and then can't work on a flight, vs (b) "I'll run Postgres locally" and then ships a bug that only reproduces in staging. State the lesson's promise: by the end, the student can place all three credible options on one axis and defend a default. Connect back to lesson 1 — the schema shape is decided; now we stand up the running database that shape will live in. Keep it to ~5 sentences, warm and brief.

### One environment variable is the whole interface

Teach the invariant before the options. The app reads a single Postgres connection string from `env.ts` (built in ch037 L2 — name it, don't build it). Every option in this lesson is "a different value for that one variable." Switching from Docker to a Neon branch to Neon Local is editing `DATABASE_URL` and restarting the dev server — zero app-code changes. This is the abstraction the lesson protects, and naming it up front is what lets the three options read as variations rather than three separate tutorials.

Include a small **connection-string anatomy** visual so the student can *read* a `DATABASE_URL` and recognize which option produced it:

- Diagram: hand-coded **SVG** (or HTML+CSS) — the diagrams index calls SVG the right tool for "a picture of a specific thing… HTTP request line" shape, and a connection string is exactly that. Lay one string out horizontally with labeled segments: `postgresql://` scheme, `user:password`, `@host`, `:port`, `/database`. Caption notes that the *host* segment is the only part that tells you whether you're hitting `localhost` (Docker / Neon Local) or a cloud endpoint (`...neon.tech`). Wrap in `<Figure>`. Keep it short — one row, capped height. **Pedagogical goal:** make the connection string legible so the three options later are recognizable by their host, and so "swap one variable" is concrete.
- `Term` candidate: **connection string** (define inline: "a single URL that encodes everything a client needs to reach a database — scheme, credentials, host, port, database name").

State the security guardrail here, in the section that introduces the variable (not bundled at the end): `DATABASE_URL` lives in `.env.local` and is never committed. One sentence, with a forward pointer that env validation and the server/client split are ch037 L2's job. Use an `Aside type="caution"` only if it reads better than inline prose — prefer inline to avoid a watch-out dumping ground.

### Just enough Docker to read a compose file

A tight vocabulary section — four terms, each one sentence, so the student can read the `docker-compose.yml` in the next section without Docker being a prerequisite. Explicitly frame it as "the minimum to follow along; full Docker is its own topic." Cover, in order:

- **Image** — a read-only disk template a container runs from; here, the official `postgres:18` image.
- **Container** — an isolated process started from an image; the running Postgres.
- **Volume** — persisted storage mounted into the container so the database files survive a `docker compose down` and restart. Without it, stopping the container loses every row.
- **Port mapping** (`5432:5432`) — exposes the container's internal Postgres port on the host, so the app reaches it at `localhost:5432`.

`Term` candidates for this section (inline, non-interrupting): **image**, **volume**, **port mapping**. (Skip a tooltip on "container" — the surrounding sentence already defines it.)

Keep this section free of opinions about *whether* to use Docker — that's the decision section. This is purely vocabulary so the code reads.

### Option A — Postgres in a Docker container

What it is: `docker compose up` brings up the official `postgres:18` image with a named volume and port 5432 mapped to `localhost`. `DATABASE_URL` points at `postgresql://postgres:postgres@localhost:5432/<db>`.

The win: **offline-capable.** Works on a plane, through a coffee-shop wifi outage, on a Friday when the cloud provider has an incident. No account, no network.

The cost: **drift from production.** The local image is a different artifact than Neon's managed Postgres — it can lag a major version, lacks the extensions Neon enables, and pools connections differently (no PgBouncer in front). That gap is where "works on my machine" bugs are born; they surface in CI or staging, not locally. This is the senior's reason to be wary of Docker-as-default, and it should be stated as the concrete failure mode, not a vague "less realistic."

Show the config as a small **annotated** `docker-compose.yml`:

- Component: **`AnnotatedCode`** (`lang="yaml"`, `maxLines={18}`, prefer `color="blue"` steps). One file, written once; step through the parts that matter so attention is directed rather than dumping a wall of YAML. Suggested steps:
  1. `image: postgres:18` — the version pin; **this is what must match prod** (foreshadows the decision section's parity argument).
  2. `environment:` — `POSTGRES_PASSWORD` / `POSTGRES_USER` / `POSTGRES_DB`; these become the credentials and database name in `DATABASE_URL`. Highlight the correspondence to the connection-string anatomy shown earlier.
  3. `ports: "5432:5432"` — the mapping that makes `localhost:5432` work.
  4. `volumes:` — the named volume mounted at **`/var/lib/postgresql`** (the parent directory). **Critical current detail for the writer:** Postgres 18 moved its data directory to a version-specific path (`/var/lib/postgresql/18/docker`); the documented-safe mount for v18 is the parent `/var/lib/postgresql`, **not** the `/var/lib/postgresql/data` path every pre-18 tutorial still shows. Mounting the old path on `postgres:18` silently fails to persist. The step should mount the correct path and the prose should name why in one sentence — it doubles as a live example of version drift biting.
- After the block, one sentence naming `pgvector` (or another extension) as a one-line addition to the image when the project needs it — named, not taught (vector search is a much later unit).

Watch-outs woven into this section's prose (not a separate list):
- `docker compose down` keeps the volume (data survives); `docker compose down -v` **deletes** it — the `-v` is the difference between "stop" and "wipe."
- Running Docker Postgres and Neon Local simultaneously collides on port 5432 — only one process can own the host port. (Mention here since it's the Docker side of the collision; the Neon Local section cross-references it.)

### Option B — A Neon dev branch in the cloud

What it is: a long-lived development branch on a Neon project (free tier, scale-to-zero). `DATABASE_URL` points at the Neon endpoint — a `...neon.tech` host, not `localhost`. The student creates one branch in the Neon console and pastes its connection string into `.env.local`.

The win: **prod-parity, exactly.** Same Postgres major version as production, same extensions available, same connection pooler in front, same scale-to-zero pricing behavior. Code that runs against this branch runs against production. This is the property that kills the "works on my machine" bug class — the thing Docker can't give.

The cost:
- **Needs connectivity.** No network, no database. The plane case is lost.
- **Cold-start latency.** On the free tier, compute auto-suspends after 5 minutes idle (fixed, not configurable on free); the first query after idle pays a wake of roughly half a second, then it's fast. Frame this as *the feature working*, not a bug — scale-to-zero is why an idle dev branch costs nothing. (Depth on scale-to-zero economics is L3; here it's named only as the source of the cold start a dev will feel.)
- **Shared if not branched.** One shared dev branch means two people's test data mingle; the fix (branch per feature) is L3's territory — name it as available, don't teach the workflow.

`Term` candidate: **scale-to-zero** (inline: "the compute suspends after an idle window and wakes on the next query; an idle database bills storage only"). Keep it to one line — L3 owns the depth.

No code block needed here — the "config" is pasting a string the console gives you. A one-line `DATABASE_URL=postgresql://...neon.tech/...` example (in the three-tab comparison below) is enough.

### Option C — Neon Local, the localhost-to-cloud bridge

What it is: a Docker container running a **proxy** that exposes a local `postgres://localhost:5432` interface while transparently routing to an **ephemeral** Neon branch in the cloud. The container creates a fresh branch on start and deletes it on stop. The app sees a `localhost` string; the data lives on Neon with full prod-parity.

Why it exists — the senior framing: it resolves the false choice between A and B. Local app code that hard-codes `localhost` (or a teammate who can't get a cloud string into their setup) gets a stable `localhost:5432` *and* the branch is real Neon Postgres, version-matched and extension-matched to prod. Every `docker compose up` is a clean, isolated database — no manual branch cleanup.

The cost: **still needs connectivity** (the branch is in the cloud; the proxy is just local) and it requires a Neon API key plus project ID in the container's environment. So it buys the localhost ergonomics and the prod-parity, but does not buy offline.

Implementation notes for the writer (current, verified — keep it light, this is recognition not a deep setup):
- Image: `neondatabase/neon_local`. Configured via `NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID` (supplying `PARENT_BRANCH_ID` rather than a fixed `BRANCH_ID` is what makes the branch **ephemeral**).
- App connection string against it: `postgres://neon:npg@localhost:5432/neondb` (`docker run`) or `@db:5432` when the app is another service in the same Compose file. Show the `localhost` form for consistency with the course's local-dev framing.
- The API key belongs in `.env.local`, never committed — same guardrail as `DATABASE_URL`.

Watch-out woven in: Neon Local and a plain Docker Postgres both want host port 5432 — pick one per project (cross-reference Option A's note). Name Neon Local as the senior default *for teams that want both localhost ergonomics and parity and have reliable network* — but not the course default, because it adds an API key and a running container for a benefit (localhost string) the course doesn't need once `env.ts` abstracts the host anyway.

### The three options, side by side

A single comparison so the student sees all three as *the same contract, three sources*. This is the synthesis moment.

- Component: **`CodeVariants`** with three tabs, `maxLines` left at default. Each tab shows the minimal "how `DATABASE_URL` gets its value" for that option, with one sentence of framing as the first line of prose (per the component's "framing in the first sentence" rule):
  - **Docker** — the `docker-compose.yml` service stanza (condensed) + the `localhost` `DATABASE_URL`. Framing: "Offline-capable; drifts from prod."
  - **Neon branch** — just the `.env.local` line with a `...neon.tech` host. Framing: "Prod-parity; needs connectivity."
  - **Neon Local** — the `neon_local` Compose service (API key / project id / parent branch) + the `localhost` `DATABASE_URL`. Framing: "Localhost string *and* prod-parity; still needs connectivity."
- The shared takeaway, stated once below the tabs: app code is identical across all three — only the value of one variable (and what runs behind it) changes. This is the payoff of the "one environment variable is the whole interface" section.

### Choosing: prod-parity is the default, offline is the exception

The decision section — the heart of the lesson. Teach the *order* a senior asks the questions in, then land the course default.

- Component: **`StateMachineWalker`** (`kind="decision"`, default). A committed walk beats a static flowchart here because the lesson lives in the *order* of questions, and the walker forces one decision at a time (per the component's "trigger before tool" guidance). Proposed topology (writer may refine wording):
  - **Q1 — root:** "Is working fully offline a hard requirement?" (e.g. air-gapped compliance, frequent no-network work).
    - Yes → **Leaf: Docker Postgres.** Verdict pill "Docker Postgres (`postgres:18`)." Body: only option that needs no network; accept the prod-drift and lean on CI against a Neon branch to catch what drifts.
    - No → Q2.
  - **Q2:** "Do you need the app to talk to `localhost` specifically — or is a cloud host fine?"
    - Cloud host is fine → **Leaf: Neon dev branch.** Verdict "Neon dev branch — the course default." Body: prod-parity with zero extra moving parts; tolerate the cold start; branch per feature when collaborating (L3).
    - Must be `localhost` (and network is reliable) → **Leaf: Neon Local.** Verdict "Neon Local." Body: localhost ergonomics + prod-parity via an ephemeral branch; costs an API key and a container, still needs network.
  - Keep it to two questions / three leaves — matching the three options. Don't over-branch; the lesson is the axis, not a taxonomy.
- Do **not** wrap the walker in `<Figure>` (it provides its own card — per its docs).

After the walker, state the course's commitment explicitly in prose: **subsequent chapters assume a Neon dev branch.** Justify it in one or two sentences — prod-parity prevents more bugs than offline prevents lost hours, for a SaaS on this stack — and reassure that because the app only reads `DATABASE_URL`, a student who prefers Docker loses nothing: every later lesson works against any of the three. Reiterate the single most important watch-out as the closing line of the argument: Postgres **major-version drift** between local and prod is the #1 "works on my machine" cause, which is exactly why the default optimizes for parity.

**Comprehension check** — place it right after the default is stated, so the student self-tests the decision logic (not vocabulary recall):

- Component: **`MultipleChoice`** (single-correct, with `<McqWhy>`). Scenario-framed so the student *applies* the axis rather than pattern-matches prose. Suggested stem: a team that ships PR previews on Neon, works mostly in-office with reliable network, but has one engineer who refuses cloud dev data on policy grounds — which local-dev choice fits *that engineer*, and why doesn't it become the whole team's default? Correct answer: Docker Postgres for that engineer; it stays the exception (not the default) because it drifts from the Neon prod the rest of the team mirrors, and CI against a Neon branch is what catches the drift. Distractors: "Neon Local for everyone" (still needs network, doesn't satisfy the offline-policy engineer's constraint and adds an API key for no team-wide gain), "switch the whole team to Docker" (throws away prod-parity for one person's constraint). Write the `<McqWhy>` to reinforce *axis reasoning*, not to restate a sentence verbatim (per the component's anti-pattern-matching note).

### What runs the database, runs the same migrations

A short closing-forward section (not a generic "next steps"). The point: the choice of A/B/C is genuinely orthogonal to everything downstream, because the contract holds. Whichever option runs:
- the same Drizzle Kit migrations apply (ch040 L1) — named, not run here;
- the same seed script populates dev data (ch040 L2) — named, not run;
- the same Drizzle `db` client connects (ch037) — named.
- Database GUIs to inspect the data: name **Drizzle Studio** as the in-stack default the course teaches (ch040 L1), and name TablePlus / pgAdmin / DataGrip / the Neon console once as alternatives the student can pick later. Recognition, not instruction.

Close by restating the one-line mental model: *the app reads `DATABASE_URL`; you decide what's on the other end; the course points it at a Neon branch.*

**External resources** (optional, `ExternalResource` in a `CardGrid`): the official **Neon Local** docs page, the **Neon scale-to-zero** docs (for the curious — depth is L3), and the **official `postgres` Docker image** page (where the v18 volume-path change is documented). Keep to three; these are the pages a student would actually open to act on this lesson.

---

## Scope

**This lesson teaches:**
- The `DATABASE_URL` single-string contract as the abstraction over the database's location (named as read from `env.ts`; the file is built in ch037 L2).
- Minimal Docker vocabulary (image, container, volume, port mapping) — only enough to read a compose file.
- The three local-dev options (Docker Postgres on `postgres:18`, a Neon dev branch, Neon Local) — what each is, its connection-string shape, its single win and its costs.
- The offline-vs-prod-parity decision axis and the course default (Neon dev branch), with the two thresholds that flip it.
- That the choice is orthogonal to migrations, seeds, and the Drizzle client downstream.

**This lesson does NOT cover (defer, do not teach):**
- **Neon production branching per preview deploy, copy-on-write internals, scale-to-zero economics** → L3 of this chapter. Here, scale-to-zero is named only as the source of the dev cold-start; branch-per-feature is named only as the fix for a shared dev branch.
- **The `@neondatabase/serverless` driver, HTTP vs WebSocket, the `-pooler` pooled URL, the two-DB-clients pattern** → L4 of this chapter. The connection-string anatomy visual stays at scheme/host/port/db level and does **not** introduce the `-pooler` host suffix.
- **Building `env.ts`, Zod env validation, the server/client env split** → ch037 L2. Named as "the contract"; the `.env.local`/never-commit guardrail is stated as a one-liner with the forward pointer.
- **The Drizzle `db` client wiring, `drizzle-orm/neon-http`/`neon-serverless`** → ch037. Named only.
- **Drizzle Kit migrations and the studio** → ch040 L1. **Seeding** → ch040 L2. Named as "applies regardless of provider," never run.
- **Self-hosted Postgres (RDS, Supabase, Fly)** → the course commits to Neon; name once for recognition, never teach.
- **Full Docker** (Dockerfiles, multi-stage builds, networking beyond port mapping, Compose depth) → out of scope; the four-term vocabulary is the ceiling.
- **`pgvector`/extensions usage** → named as a one-line compose addition; vector search is a much later unit.
- **CI/test database setup** (the "one DB per worker" integration-test pattern) → out of scope for this lesson; testing conventions own it later.

**Concise prerequisite refreshers the writer may state in one line each (do not re-teach):** Postgres is the course's committed engine (ch036 L1); a schema/tables/rows exist conceptually (ch036 L1); `pnpm dev` runs the app's dev server (earlier units). Assume `.env.local` and environment variables are familiar from earlier chapters — reference, don't explain.

---

## Notes for downstream agents (deliberate divergences / current-fact flags)

- **Postgres major version is `18`, not `17`.** Lesson 1 used `postgres:17` only as a forward-looking Docker tag and made no prod claim. This lesson owns the version decision and standardizes on **18** for both Neon (prod) and the Docker image, because local-prod parity is the lesson's whole thesis. Verified current: `postgres:18.4` is the live official image (May 2026), Neon runs Postgres 18. If ch037+ references a version, it should follow **18**.
- **Postgres 18 volume path changed.** The official image moved PGDATA to a version-specific dir (`/var/lib/postgresql/18/docker`); the correct named-volume mount for v18 is the parent **`/var/lib/postgresql`**, not the `/var/lib/postgresql/data` that pre-18 tutorials show. The `docker-compose.yml` example must use the new path. Verified against the official image docs (current). This doubles as a concrete, real example of the version-drift failure the lesson warns about.
- **Neon free-tier scale-to-zero** is a fixed 5-minute idle timeout (not configurable on free), cold-start wake ~0.5s. Verified current (2026). Don't promise configurability on the free tier.
- **Neon Local config** verified current: image `neondatabase/neon_local`; ephemeral branches via `PARENT_BRANCH_ID` (vs a fixed `BRANCH_ID`); requires `NEON_API_KEY` + `NEON_PROJECT_ID`; app string `postgres://neon:npg@localhost:5432/neondb` (or `@db:5432` in-Compose).
- **No `-pooler` host suffix anywhere in this lesson** — pooling is L4. Keep all connection strings at the simple host form so L4 can introduce the pooled endpoint cleanly.
- **No video, no live-coding exercise** by design (see framing). One MCQ for comprehension; one decision-walker as the centerpiece.
