# Chapter 040 — Postgres on Neon

## Chapter framing

Chapter 040 establishes the data backplane the rest of Unit 6 (schema in chapter 041, queries in chapter 042, performance in chapter 043, migrations in chapter 044, project in chapter 045) and every later unit reads and writes through. It does two things and only two: it installs the mental model — rows, tables, foreign keys, normalization to 3NF as the default — that Drizzle schemas in chapter 041 will encode, and it stands up the running Postgres the student's `DATABASE_URL` will point at. The chapter does not write a `pgTable`, run a query, or touch Drizzle Kit; those are owned by chapter 041, chapter 042, and chapter 044 respectively. Postgres is the only database the course teaches; alternative engines (MySQL, SQLite, document stores) get one line for recognition.

Threads that run through every lesson: Postgres is the assumed engine; `DATABASE_URL` is the single connection-string contract every lesson consumes (introduced in lesson 5 of chapter 004); normalize to 3NF first and only denormalize against a measured read pattern; the local-dev database is a senior call between Docker Postgres (offline, drifts from prod) and Neon dev branch (matches prod exactly, needs connectivity), with Neon Local as the 2026 hybrid; production runs on Neon with a branch per preview deployment, scale-to-zero pricing, and the `@neondatabase/serverless` driver; the HTTP driver is the default for one-shot Server Component reads and the WebSocket/Pool driver is the conditional reach for transactions and Server Actions; the pooled connection string (PgBouncer transaction mode) is mandatory for any TCP/WebSocket use from serverless runtimes. The chapter ships four teaching lessons plus a quiz.

---

## Lesson 1 — Tables, rows, and 3NF

Teaches the relational model — tables, rows, typed columns, primary and foreign keys — and 3NF as the default schema shape, with the three legitimate triggers for denormalization.

Topics to cover:

- **The senior question.** Given a SaaS feature spec (invoices belonging to organizations, each with line items, each tagged), what shape does the data take on disk before any code is written? The lesson establishes that the schema is decided up front, in the relational shape Postgres expects, and that this shape constrains every component, query, and API surface downstream. Connects to Architectural Principle #2 (lesson 1 of chapter 041) — the schema is the source of truth.
- **The relational model in one paragraph.** A database is a set of tables; a table is a set of rows; a row is a set of typed columns; one column (or composite) is the primary key; relationships between tables are expressed by foreign keys pointing at primary keys. No graph, no document, no object — just sets and references.
- **Why typed columns matter.** Postgres enforces types at the boundary; the database is the last line of defense when application code, Zod, or a migration drifts. This is why "stringly typed everything" (`jsonb` for all the things) fails in production — the constraint moves into application code where it can be skipped.
- **Primary keys named, deferred.** Every row needs a unique identifier; the surrogate (UUID, bigserial) vs. natural (email, slug) decision is lesson 5 of chapter 041. Named here so the student knows what "primary key" means when normalization needs it.
- **Foreign keys named, deferred.** A column in table A whose values must exist as a primary key in table B; the cascade options (`ON DELETE`, `ON UPDATE`) are lesson 6 of chapter 041. Named here so "this row belongs to that one" has a vocabulary.
- **Normalization — 1NF, 2NF, 3NF — pragmatic treatment.** 1NF: atomic columns (no comma-separated lists, no "address1, address2, address3"). 2NF: every non-key column depends on the whole primary key (matters when keys are composite). 3NF: no non-key column depends on another non-key column (the "city implies zip" trap). The course's working definition: "every fact lives in exactly one place." BCNF and 4NF/5NF named once and dropped.
- **The default is 3NF.** Start normalized; the engine, the planner, and the foreign-key constraints earn their weight on a normalized schema. Most SaaS data fits 3NF without strain.
- **When to denormalize — the senior call.** Denormalization is a measured response to a read pattern, never a starting point. Three legitimate triggers: a hot read path where the join cost is measured and material (a feed showing usernames per comment), reporting tables built by jobs (not by hand), and `jsonb` for genuinely shapeless data (audit-log payloads, third-party webhook bodies — lesson 9 of chapter 042 owns this). The wrong trigger: "joins feel slow" without `EXPLAIN ANALYZE` (lesson 3 of chapter 043).
- **Worked example — invoices, organizations, line items, tags.** Walk the four-table shape: `organizations`, `invoices` (FK to organization), `invoice_line_items` (FK to invoice), `tags` + `invoice_tags` junction. The student sees what "every fact in one place" looks like before Drizzle expresses it. Diagram: ER diagram (Mermaid).
- **One-to-one, one-to-many, many-to-many — the three cardinalities.** Each gets a one-line shape: 1:1 collapses into one table or two with a shared key; 1:N is one foreign-key column on the many side; N:M is a junction table with two foreign keys (lesson 8 of chapter 041 owns the junction shape).
- **Postgres named as the engine.** Why Postgres and not MySQL/SQLite/Mongo for SaaS in 2026: full SQL with constraints, `jsonb` for the shapeless 5%, generated columns, partial indexes, mature ecosystem (Drizzle, Neon, Supabase, RDS). MySQL and SQLite named once; document stores named once as the wrong default for relational data.
- **Watch-outs:** comma-separated columns are a normalization failure that compounds; the `jsonb`-everywhere temptation moves type safety out of the database; denormalization without a measurement is premature optimization; "we'll just join more tables" is rarely the actual bottleneck — indexes (lesson 1 of chapter 043) are; relational shape is decided before code, not refactored after.

What this lesson does not cover:

- Drizzle's `pgTable`, columns, or relations — Chapter 041.
- Postgres data types in depth — lesson 3 of chapter 041.
- Primary keys (surrogate vs. natural) — lesson 5 of chapter 041.
- Foreign keys and cascade behavior — lesson 6 of chapter 041.
- Junction-table mechanics — lesson 8 of chapter 041.
- `jsonb` querying — lesson 9 of chapter 042.
- Indexes and `EXPLAIN ANALYZE` — Chapter 043.
- Multi-tenant scoping patterns — Unit 10.

Estimated student time: 45 to 55 minutes. Load-bearing for every schema, query, and migration in Units 6 through 23.

---

## Lesson 2 — Local dev: Docker, Neon branch, or Neon Local

Teaches the three credible local-database options for 2026 — Docker Postgres, a Neon dev branch, and Neon Local — and the offline-vs-prod-parity trade that picks between them under one `DATABASE_URL` contract.

Topics to cover:

- **The senior question.** Where does the database the student's `pnpm dev` talks to actually run? The two credible 2026 answers — a Docker Postgres container on the laptop, or a Neon dev branch in the cloud — trade off offline-capability against drift from production. The lesson names the threshold that flips the choice and lands on a default for the course.
- **`DATABASE_URL` as the single contract.** Whatever runs the database, the app reads a Postgres connection string from `env.ts` (lesson 5 of chapter 004). Switching providers is changing one environment variable. This is the abstraction the lesson protects.
- **Docker in one paragraph.** Just enough vocabulary to follow the setup: a *container* is an isolated process running from an *image* (a read-only disk template — here, `postgres:17`); a *volume* is persisted storage mounted into the container so the database files survive a `docker compose down` and restart; *port mapping* (`5432:5432`) exposes the container's internal port on the host, so the app talks to `localhost:5432`. Full Docker is out of scope for the course.
- **Option A — Docker Postgres.** `docker compose up` with the official `postgres:17` image, a named volume, port 5432 mapped to localhost. Offline-capable: works on a plane, on a coffee-shop wifi outage, on a Friday when the cloud provider has an incident. The cost: the local image drifts from production (different version, no extensions, no row-level security configured the same way), so "works on my machine" bugs land in CI or staging. Shown as a minimal `docker-compose.yml` with the `pgvector` extension named as a one-line addition.
- **Option B — Neon dev branch.** A long-lived development branch on Neon (free tier, scale-to-zero), `DATABASE_URL` points at the cloud. Matches production exactly: same Postgres version, same extensions, same connection pooler, same pricing model. The cost: needs connectivity; cold-start latency on first query after idle; shared if the student doesn't branch per feature.
- **Option C — Neon Local (the 2026 hybrid).** A Docker container running a proxy that exposes a local `postgres://localhost:5432` while transparently routing to an ephemeral Neon branch in the cloud. Auto-creates a branch on container start and deletes it on stop. Gets the localhost connection string for app code and the prod-parity of Neon — at the cost of still needing connectivity. Named as the senior default for teams that want both.
- **The decision tree.** Default to Neon dev branch for a course-aligned SaaS on this stack — prod-parity wins for most students. Reach for Docker Postgres when offline work is a hard constraint or the team's compliance posture forbids cloud dev data. Reach for Neon Local when both matter and the network is reliable.
- **The course's default.** The course assumes Neon dev branch in subsequent chapters; the Docker Compose alternative is shown once here and the lesson notes that swapping providers is one env variable. Project starters in Unit chapter 045 and later assume `DATABASE_URL` is set, agnostic to source.
- **Database GUIs — named, dropped.** TablePlus, pgAdmin, DataGrip, Neon's web console, Drizzle Studio (lesson 1 of chapter 044). The course teaches Drizzle Studio as the in-stack default; alternatives named once for the student to pick later.
- **Migrations and seeds named, deferred.** Whichever provider runs, the same Drizzle Kit migrations apply (lesson 1 of chapter 044) and the same seed script populates (lesson 2 of chapter 044). The lesson does not run them.
- **Watch-outs:** `DATABASE_URL` in `.env.local` only — never committed (lesson 5 of chapter 004); the Docker volume persists data across `docker compose down`, but `docker compose down -v` nukes it; Neon dev branches scale to zero and the first query after idle takes a second or two — this is the feature, not a bug; running both Docker Postgres and Neon Local at once collides on port 5432; Postgres major-version drift between local and prod is the single most common "works on my machine" cause.

What this lesson does not cover:

- Neon production branching per preview deploy and scale-to-zero economics — lesson 3 of chapter 040.
- The `@neondatabase/serverless` driver, HTTP vs. WebSocket, pooling — lesson 4 of chapter 040.
- Drizzle's connection setup in code — Chapter 041.
- Drizzle Kit migrations, the studio — lesson 1 of chapter 044.
- Seeding for dev and test — lesson 2 of chapter 044.
- Self-hosted Postgres on RDS/Supabase/Fly — named once, never taught; the course commits to Neon.

Estimated student time: 35 to 45 minutes. Load-bearing for every later lesson in Unit 6, which assumes a running Postgres at `DATABASE_URL`.

---

## Lesson 3 — Neon branching and scale-to-zero

Teaches Neon's storage/compute separation, copy-on-write branch-per-preview-deploy via the Vercel integration, and the scale-to-zero pricing model that makes ephemeral preview branches economically sustainable.

Topics to cover:

- **The senior question.** What does production Postgres look like for a 2026 SaaS that ships PR previews and pays for what it uses? Neon's storage/compute separation answers both: branch the database per Vercel preview deployment (test data isolated, no shared staging contamination), scale compute to zero when idle (no fixed cost for an idle preview). The lesson installs the model; lesson 4 of chapter 040 owns how the app connects.
- **Neon's architecture in two sentences.** Storage and compute are separated — storage is a content-addressed log of pages, compute is a stateless Postgres process the platform spins up against the storage. Branches share underlying storage (copy-on-write) so creating one is near-instant and near-free.
- **The branch-per-preview workflow.** Vercel's Neon integration creates a Neon branch on every PR preview deployment, points the preview's `DATABASE_URL` at it, and deletes the branch when the PR closes or merges. Each preview gets isolated data; tests in one PR can't poison another. Diagram: sequence (PR opened → Neon branch created → Vercel preview deployed with branch URL → PR merged → branch deleted).
- **Production, staging, preview — the three long-lived environments.** Production is the primary branch (`main`); staging is a long-lived branch off `main`; previews are ephemeral branches per PR. The course's working setup is two long-lived (`production`, `staging`) plus ephemerals.
- **Scale-to-zero — the pricing model.** Compute auto-suspends after a configurable idle window (default ~5 minutes on the free tier); a fresh query wakes it in roughly 500ms. Branches that nobody touches cost storage only. Senior implication: idle preview branches don't bill compute, so "branch per PR" is economically sustainable.
- **Cold-start latency — the cost.** First query after suspend pays 300–700ms; subsequent queries on the same compute are fast. For a SaaS, this hits dev branches and idle previews, not production traffic. The mitigation: production keeps compute alive (configurable minimum); dev tolerates the cold start.
- **Branching for data migrations and "what-if" debugging.** A senior reach: branch production, run the destructive migration or the exploratory query on the branch, throw the branch away. Named here so the student knows it's available; the migration workflow is lesson 1 of chapter 044.
- **Read replicas named, dropped.** Neon supports read replicas (separate compute pointed at the same storage) for read-scaling and analytics workloads. Named once; not in the course's default.
- **Provisioning the production project — the senior shape (described, not executed).** The shape the student should recognize: a Neon project with `production` as the primary branch, a long-lived `staging` branch off it, and a Vercel Neon integration that injects a per-deploy `DATABASE_URL` into every preview. Read-only walkthrough at this point — the student does not act on Vercel here; Chapter 102 owns the deployment wiring and the integration setup at depth.
- **Watch-outs:** branch creation is near-instant but data is point-in-time at the parent at branch creation — fresh data in the parent doesn't appear in an old branch; PR-preview branches can accumulate if auto-delete isn't enabled in the integration; `production` is just a branch by convention — nothing stops a junior from running a destructive migration on it without branching first; scale-to-zero idle windows are configurable per-branch and matter for cold-start budgets; Neon's free tier has a hard limit on compute-hours per month — fine for a course, undersized for live traffic.

What this lesson does not cover:

- The `@neondatabase/serverless` driver, HTTP vs. WebSocket, connection pooling — lesson 4 of chapter 040.
- Drizzle's connection code — Chapter 041.
- Migration workflow against branches — lesson 1 of chapter 044.
- Vercel deployment, environment variables, preview deployments at depth — Unit 21.
- Multi-region replication and geographic latency — out of scope.
- Self-hosted alternatives (RDS, Supabase, Fly Postgres) — out of scope.

Estimated student time: 40 to 50 minutes. Load-bearing for lesson 4 of chapter 040 (the driver choice depends on understanding that production runs on Neon), Unit 21 (deployment wires the Vercel integration), and the project in Chapter 045.

---

## Lesson 4 — The serverless driver and the pooled URL

Teaches the `@neondatabase/serverless` driver, the HTTP-vs-WebSocket decision for reads vs. transactions, PgBouncer transaction-mode pooling, and the two-DB-clients pattern with pooled and unpooled connection strings.

Topics to cover:

- **The senior question.** From a Server Component reading invoices in a Vercel function, how does the request reach Postgres without exhausting Postgres's connection limit on the first traffic spike? The answer in 2026 has two parts: the right driver for the call site (HTTP for one-shot reads, WebSocket/Pool for transactions), and the pooled connection string (PgBouncer transaction mode) for any TCP/WebSocket use.
- **Why connection pooling matters — the failure mode without it.** Each serverless function invocation that opens a fresh `pg` TCP connection pays a handshake (TLS, auth) and consumes one Postgres backend slot. Postgres caps total connections (the standard is ~100). A traffic spike of N concurrent invocations creates N connections; past the cap, Postgres rejects with `too many connections` and the app 500s. The fix moved out of application code years ago — the database provider runs PgBouncer in front of Postgres and the app talks to the pooler.
- **PgBouncer in transaction mode — what Neon runs.** Neon's pooled endpoint multiplexes thousands of short client connections onto a small set of Postgres backend connections, releasing each backend at transaction boundaries. The app's connection-string suffix flips it on: `-pooler` in the hostname (e.g., `…pooler.us-east-2.aws.neon.tech`). Senior default: use the pooled URL for serverless app traffic; use the unpooled URL for migrations (lesson 1 of chapter 044) and long-running scripts.
- **Transaction-mode caveats — what breaks.** Session-state features die under transaction-mode pooling: prepared statements pinned to a session (Drizzle handles this), `SET`/`LISTEN`/advisory locks across statements, temporary tables outside a transaction. The senior reach: keep work transactional, don't rely on session state, and you don't notice the pooler exists. Named so the student recognizes the failure mode if it surfaces.
- **The `@neondatabase/serverless` driver — the call site.** Drop-in for `pg` on serverless runtimes. Exposes three shapes: `neon(connectionString)` for HTTP one-shot queries, `Pool`/`Client` (constructors) for WebSocket-based connections with session and multi-statement-transaction support, and `neonConfig` for fetch/WebSocket tuning. Drizzle (Chapter 041) wraps each via `drizzle-orm/neon-http` and `drizzle-orm/neon-serverless`.
- **HTTP vs. WebSocket — the decision tree.** HTTP (`neon-http`): one query per request, no transactions across queries, lowest latency for one-shot reads. The default for Server Component data fetches in chapter 036. WebSocket (`neon-serverless` + `Pool`): persistent connection, multi-statement transactions, `pg`-compatible. The reach for Server Actions (Chapter 047) that batch reads and writes in one transaction. Decision: default to HTTP for reads; reach for WebSocket when a single request needs a transaction or multiple round-trips.
- **The two-DB-clients pattern.** The 2026 senior shape: export a `db` (HTTP, for Server Components) and a `dbTx` or pool-backed `db` (WebSocket, for Server Actions and route handlers that need transactions) from `db/index.ts`. Each is a one-liner over the pooled URL. Chapter 041 owns the Drizzle wiring; the lesson names the pattern.
- **The unpooled connection string — when to reach for it.** Migrations (Drizzle Kit, lesson 1 of chapter 044) and long-running maintenance scripts use the unpooled URL so they hold a stable session, run multi-statement DDL, and don't fight the pooler's transaction mode. Two environment variables in production: `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
- **Local dev — the driver still works.** Against Docker Postgres or Neon Local, the same driver code runs; `neon-http` falls back to a local protocol via the proxy, or the student uses standard `pg` for Docker. Drizzle abstracts this — Chapter 041 wires it.
- **The senior reflex.** Pooled URL for app traffic, unpooled URL for migrations; HTTP driver for reads, WebSocket driver for transactions; one `DATABASE_URL` in code, two underlying endpoints.
- **Watch-outs:** the unpooled URL in app code blows up under load; the pooled URL in a migration script silently truncates a long transaction at the next pool boundary; HTTP driver doesn't support multi-statement transactions — `db.transaction(...)` over `neon-http` is a no-op (the driver throws or auto-batches single statements only); session-pinned features (LISTEN/NOTIFY, advisory locks) need WebSocket plus a careful pool config; `@neondatabase/serverless` is the serverless-runtime driver — node-postgres (`pg`) still works against the same URLs and is the reach for long-lived Node processes (workers, jobs in Chapter 13).

What this lesson does not cover:

- Drizzle's `db` wiring, `drizzle-orm/neon-http`, `drizzle-orm/neon-serverless` setup code — Chapter 041.
- Server Actions and where transactions earn their weight — Chapter 047.
- Migrations under the unpooled URL — lesson 1 of chapter 044.
- Read/write splitting, read replicas — out of scope.
- Edge runtime specifics (Cloudflare Workers, Deno Deploy) — named once; the course pins Vercel + Node.
- Background workers and long-lived Postgres clients — Unit 13.

Estimated student time: 45 to 55 minutes. Load-bearing for Chapter 041 (Drizzle's `db` setup mirrors the two-client pattern), Chapter 042 (every query in the course runs through one of the two clients), Chapter 044 (migrations use the unpooled URL), and Chapter 047 (Server Actions reach for the transactional client).

---

## Lesson 5 — Quizz

Top 10 topics to quiz:

- The relational model — tables, rows, columns, primary keys, foreign keys; the one-line definition of each.
- 1NF / 2NF / 3NF — the working definitions and which violation each catches; "every fact in one place" as the senior heuristic.
- When to denormalize — the three legitimate triggers (measured hot read path, reporting tables built by jobs, `jsonb` for genuinely shapeless data) and the wrong trigger (vibes).
- One-to-one, one-to-many, many-to-many — the shape each takes in a relational schema; junction tables for N:M.
- Local-dev database — the Docker vs. Neon dev branch trade (offline-capable but drifts vs. prod-parity but needs connectivity); Neon Local as the hybrid; `DATABASE_URL` as the swap-one-variable contract.
- Neon's branching model — storage/compute separation, copy-on-write branches, branch-per-preview-deploy via Vercel integration, ephemeral branches deleted on PR merge.
- Scale-to-zero — compute auto-suspends when idle and cold-starts on next query; branches that idle cost storage only.
- Connection pooling — why a serverless function opening a fresh `pg` connection exhausts Postgres on a spike; PgBouncer in transaction mode; the pooled URL (`-pooler` hostname); the unpooled URL for migrations.
- HTTP driver vs. WebSocket driver — the decision tree (HTTP for one-shot Server Component reads, WebSocket/Pool for transactions and Server Actions); transaction-mode pooler caveats.
- The two-DB-clients pattern — pooled HTTP `db` for reads, pooled WebSocket `db` for transactions, unpooled URL reserved for migrations.
