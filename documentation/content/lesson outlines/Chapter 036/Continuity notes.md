# Chapter 036 — Postgres on Neon

## Lesson 1 — Tables, rows, and 3NF

**Taught.** The relational model (database=set of tables, table=set of rows, row=set of typed columns), typed columns as the DB's last line of defense, primary/foreign keys (named only), normalization to 3NF via "every fact lives in exactly one place," the three cardinalities, the worked invoicing schema, the three legitimate denormalization triggers, and Postgres as the engine. Zero Drizzle, zero query-writing.

**The running worked schema** (reused by ch037+ in Drizzle): `organizations` (id PK, name, billing_email, created_at) → `invoices` (id PK, organization_id FK, number, status, issued_at, total) → `invoice_line_items` (id PK, invoice_id FK, description, quantity, unit_price); `tags` (id, name) ↔ invoices via junction `invoice_tags` (invoice_id FK, tag_id FK, composite PK). Money columns are `numeric`. This is the blueprint ch037 encodes.

**Debts (forward pointers made explicit to the student).**
- Primary key surrogate-vs-natural choice → ch037 L5.
- Foreign key cascade behavior (`ON DELETE`/`ON UPDATE`) → ch037 L6.
- Junction-table mechanics in code → ch037 L8.
- `jsonb` querying → ch038 L9.
- Indexes + `EXPLAIN ANALYZE` (the real bottleneck behind "joins feel slow") → ch039.
- Schema-as-source-of-truth principle → ch037 L1 (connected conceptually, not stated).

**Terminology.** "Every fact lives in exactly one place" (working def of normalization); "the same fact stored in two places will eventually disagree"; update anomaly; atomic (1NF); composite key (2NF only bites here); junction table; cardinality (1:1, 1:N, N:M); DDL; "last line of defense"; "denormalization is a measured response to a read pattern, never a starting point." Course stops at 3NF; BCNF/4NF/5NF named and dropped.

**Patterns and best practices (for ch041 project + later schemas).** Default to 3NF; FK lives on the many side; N:M via junction with composite PK; money as `numeric` not float; denormalize only against a measurement (three triggers: measured hot read path, job-built rollup table that stays derived/rebuildable, `jsonb` for genuinely shapeless data only). Postgres is the committed engine.

**Misc.** Lesson deliberately makes no Postgres-major-version claim (version-agnostic; L2 owns the major-version call — standardized on **18** everywhere, including the Docker tag `postgres:18`). Illustrative raw SQL `CREATE TABLE` is allowed only to show the concrete shape, never framed as "how you write tables." No video embed by design — except one optional `VideoCallout` was added (Decomplexify's 28-min normalization walkthrough, `GFQaEYEc8_8`), positioned after the 3NF section as a thorough second pass.

## Lesson 2 — Where your local database runs

**Taught.** The `DATABASE_URL` single-connection-string contract as the whole abstraction over DB location (swap one env var, zero app-code change); connection-string anatomy (scheme/user:password/host/port/db — host is the only "where" segment); minimal Docker vocab (image, container, volume, port mapping); the three local-dev options on an offline↔prod-parity axis — Docker Postgres (offline, drifts), Neon dev branch (prod-parity, needs network), Neon Local (localhost + parity via ephemeral branch, needs network); the senior decision order (offline first, then localhost-vs-cloud); course default = **Neon dev branch**. Decision lesson, nothing built/run.

**Version decision (overrides L1 note).** This lesson owns the Postgres major-version call and standardizes on **18** for BOTH the Docker tag (`postgres:18`) and Neon prod — parity is the thesis. L1's continuity note said "L2 owns `postgres:17`"; that is superseded — it is **18** everywhere. ch037+ should follow 18.

**Cut.** Nothing load-bearing; chapter outline's optional items all delivered or deferred as planned.

**Debts (forward pointers made explicit to the student).**
- `env.ts` / Zod build-time env validation / server-client env split, and the `.env.local`-never-commit rule at depth → ch037 L2. Here `DATABASE_URL` is named as "the contract the app reads," not built.
- Drizzle `db` client wiring (`neon-http`/`neon-serverless`) → ch037.
- Neon scale-to-zero economics + branch-per-feature workflow → ch036 L3 (named only as source of dev cold-start / fix for shared-branch data mingling).
- Serverless driver, HTTP-vs-WebSocket, the `-pooler` pooled URL → ch036 L4. All connection strings here stay at simple host form, no `-pooler` suffix.
- Drizzle Kit migrations + Drizzle Studio → ch040 L1; seed script → ch040 L2 (named as "applies regardless of provider," not run).

**Terminology.** "One environment variable is the whole interface"; connection string; image / container / volume / port mapping (the four-word Docker ceiling); scale-to-zero; proxy (Neon Local = localhost stand-in forwarding to a real branch); ephemeral branch; prod-parity; "works on my machine" bug; major-version drift (named the #1 cause). One-line mental model: *the app reads `DATABASE_URL`; you decide what's on the other end; the course points it at a Neon branch.*

**Patterns and best practices (for ch041 project + later).** `DATABASE_URL` is the sole DB-location interface — app code never knows the host. `.env.local` only, never committed (incl. Neon API key). Pin the same Postgres major version (18) local and prod. Postgres 18 named-volume mount is the parent `/var/lib/postgresql` (NOT `/var/lib/postgresql/data` — pre-18 path silently fails to persist on v18). `docker compose down -v` wipes the volume; bare `down` keeps it. Docker Postgres and Neon Local both claim host port 5432 — one per project. Course default = Neon dev branch; Docker is the offline exception, with CI running against a Neon branch to catch drift.

**Misc.** Neon Local config: image `neondatabase/neon_local`; ephemeral branches via `PARENT_BRANCH_ID` (vs fixed `BRANCH_ID`); needs `NEON_API_KEY` + `NEON_PROJECT_ID`; app string `postgres://neon:npg@localhost:5432/neondb`. Neon free-tier scale-to-zero = fixed 5-min idle timeout (not configurable on free), ~0.5s cold wake. Self-hosted Postgres (RDS/Supabase/Fly) named once for recognition, never taught — course commits to Neon. No live-coding exercise by design; one decision-walker + one scenario MCQ carry comprehension; one optional `VideoCallout` added (TechWorld with Nana's Docker crash course, `pg19Z8LL06w`) after the Docker-vocab section as the full-Docker grounding the lesson skips.

## Lesson 3 — Neon branching and scale-to-zero

**Taught.** Pure infra mental-model lesson (zero app code/Drizzle/queries), all derived from one fact: **Neon separates storage (durable content-addressed log of page versions) from compute (stateless Postgres process started on demand, pointed at storage)**. From that split: branching = new compute on a copy-on-write snapshot of parent storage (near-instant, ~zero added storage until divergence); branch-per-preview-deploy via the Vercel–Neon integration (full PR lifecycle: opened → integration cuts `preview/<branch>` → Vercel injects that branch's `DATABASE_URL` → iterate isolated → merge/close → auto-delete); scale-to-zero (idle compute suspends, data safe in storage, next query wakes it); cold start as the honest cost; and the recognizable production topology. Read-only walkthrough — student does not touch Vercel.

**Cut.** Read replicas (the "multiple computes, one storage" consequence) named once and dropped, per outline — not taught.

**Debts (forward pointers made explicit to the student).**
- How the app opens a connection over the injected URL — driver, `-pooler` endpoint, HTTP-vs-WebSocket → ch036 L4 (this lesson stops at "integration injects a string, app reads it"; no `-pooler` shown).
- Drizzle `db` wiring → ch037.
- The branch→run→promote migration discipline / migration-on-a-branch mechanics → ch040 (named as the "what-if undo button," not run).
- Seeding preview/dev branches → ch040 L2 (named, not shown).
- Provisioning the project + wiring the integration at depth → Unit 20 / ch098 (deployment).

**Terminology.** "Storage split from compute" (the single causal lens — every feature is a consequence); stateless (compute holds no permanent state); copy-on-write; branch (= compute on a CoW snapshot at a point in time); **point-in-time** (branch captures parent at creation; afterward nothing crosses either way — parent's new rows invisible to branch, branch's writes never flow back = the safety property); scale-to-zero; cold start (latency the first query pays to wake a suspended compute); "`production` is just a branch by convention."

**Patterns and best practices (for ch041 project + later).** Course working setup = **two long-lived branches (`production` primary + `staging` forked off it) plus ephemeral `preview/*` per PR**, all under one Neon project. A branch per PR is the fix for shared-staging contamination (the named anti-pattern). Auto-delete of obsolete preview branches must be explicitly enabled or branches accumulate. Cold start is a **per-branch** knob: production tuned to stay warm (longer/disabled idle window) so no user eats a wake; dev/preview left to scale to zero (cheap beats fast there). `production` has no technical guard against destructive migrations — discipline (branch→test→apply) is the only railing. Free tier teaches the model but is undersized for live production traffic.

**Misc.** Numbers stated as drift-prone "around": idle window ~5 min (fixed on free, configurable down to ~1 min / never on paid Scale — consistent with L2's free-tier note), cold-start ~300–800ms (time-to-first-query ~0.5–1s); free tier ~100 compute-hours/mo, ~0.5 GB storage, ~10 branches. Two Vercel–Neon integration flavors named for recognition only: Neon-managed (opt into auto-delete, runs on next deploy) vs Vercel-managed (deleted when Vercel removes the deployment, ~6-month retention). No video by design.

## Lesson 4 — The serverless driver and the pooled URL

**Taught.** Pure decisions-before-syntax lesson (student writes no working code; all code blocks are explicit ch037 previews). Everything descends from one fact: a serverless function is born, runs one request, dies — it cannot amortize an in-process `pg` pool the way a long-lived Node server does. From that broken assumption, two **orthogonal** axes: (1) **which URL** — pooled (`-pooler` host, PgBouncer transaction mode) for serverless app traffic vs unpooled/direct host for migrations & long scripts; (2) **how the call site talks** — HTTP (`neon(...)`) for one-shot reads vs WebSocket `Pool` for interactive transactions. Motivated by the connection-exhaustion failure (`FATAL: too many connections`, 500s on a launch spike — invisible in dev). Lands on the **three-client** `db`/`dbTx`/`dbUnpooled` shape (pooled HTTP read client, pooled WebSocket transaction client, unpooled WebSocket migration client).

**Cut.** Chapter outline's `neonConfig` third shape dropped (not needed for the mental model). "Local dev — the driver still works" bullet dropped to a single closing aside. The outline's claim that `db.transaction()` over `neon-http` "is a no-op" was **corrected** (see Terminology): HTTP supports a *non-interactive batch* `transaction([q1,q2])`, just not interactive `transaction(async tx => ...)`.

**Debts (forward pointers made explicit to the student).**
- Real Drizzle wiring of all three clients — `drizzle()`, `casing`, schema, `neonConfig.webSocketConstructor` → ch037 (will mirror this three-client pattern). The `db/index.ts` sketch deliberately omits all of this.
- Server Actions, where the WebSocket/transactional client (`dbTx`) earns its weight → ch043 (named only).
- Migrations run on the unpooled URL (the half-applied-schema hazard if run pooled) → ch040 (justified here, not run).
- Every query in the course flows through one of `db`/`dbTx`/`dbUnpooled` → ch038 onward.
- Long-lived Node processes (workers/jobs) use plain `pg` against the same URLs → Unit 12 (closing aside only).

**Terminology.** Two reflexes (the keepers): *"pooled URL for app traffic, unpooled URL for migrations & long scripts"* and *"HTTP for reads, WebSocket for transactions"*, both reducing to *"match the connection to the call site's lifetime."* "One `DATABASE_URL` in your head, two endpoints underneath, three clients." backend (= one OS process per connection); `max_connections` (the wall, ~100 illustrative); handshake (TCP+TLS+auth); connection pool (the in-process `pg` pool serverless can't use); PgBouncer; transaction mode (lends a backend for one transaction, then reclaims — vs session mode); multiplexing; **interactive transaction** (begin→read→branch→write on one held connection) vs **non-interactive batch** (`transaction([q1,q2,q3])`, one round-trip, what HTTP *does* support). Drivers: `@neondatabase/serverless` (v1.0 GA), `neon(...)`=HTTP, `Pool`/`Client`=WebSocket; Drizzle wrappers `drizzle-orm/neon-http` and `drizzle-orm/neon-serverless`.

**Patterns and best practices (for ch037 + ch041 project + later).** `db/index.ts` exports **three** clients by course convention (ch037 will mirror this exact shape): `db` = pooled HTTP (`drizzleHttp(env.DATABASE_URL)`, the default imported almost everywhere for one-shot Server Component reads); `dbTx` = pooled WebSocket (`drizzleWs(new Pool({ connectionString: env.DATABASE_URL }))`, the **same** pooled URL but the transactional shape, for Server Actions doing interactive read-decide-write); `dbUnpooled` = unpooled WebSocket (`drizzleWs(new Pool({ connectionString: env.DATABASE_URL_UNPOOLED }))`, direct host, reserved for migrations & long scripts). Both pooled clients share `DATABASE_URL`; the WebSocket driver (`drizzle-orm/neon-serverless`) backs both `dbTx` and `dbUnpooled`, the HTTP driver (`drizzle-orm/neon-http`) backs `db`. Two prod env vars: `DATABASE_URL` (pooled, `-pooler` host) + `DATABASE_URL_UNPOOLED` (direct host — same db/creds, host routing is the only diff). Never run a migration over the pooled URL (PgBouncer can sever a long DDL transaction mid-flight → partial schema). Keep work inside transactions / avoid session state (`SET`, session `LISTEN`/`NOTIFY`, cross-statement advisory locks, temp tables outside a tx) and the pooler stays invisible. Default reads → `db` (pooled HTTP); transactional writes → `dbTx` (pooled WebSocket).

**Misc.** Connection numbers (~100 cap, "a few dozen" backends) framed as illustrative, never load-bearing. `@neondatabase/serverless` is the *serverless-runtime* answer, not the only driver — `pg` still works against the same Neon URLs. Edge runtimes named once for recognition; course pins Vercel + Node. No video, no live-coding exercise by design (no query to run yet — ch038 owns first queries); comprehension carried by one `StateMachineWalker` decision tree, one `Buckets` sort (three buckets: pooled `db`/HTTP, pooled `dbTx`/WebSocket, unpooled `dbUnpooled`), one `MultipleChoice` (the axes-are-independent trap: app traffic + transaction = pooled URL **+** WebSocket, not unpooled).
