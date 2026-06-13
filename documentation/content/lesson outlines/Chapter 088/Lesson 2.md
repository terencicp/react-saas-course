# One database per worker

- Title (h1): One database per worker
- Sidebar label: One DB per worker

## Lesson framing

This is the **infrastructure-and-wiring** lesson of the chapter. Lesson 1 taught the per-test isolation contract (`withRollback` + the `tx` seam). It deliberately deferred the question *where does the real Postgres that `db.transaction` opens against actually come from?* This lesson answers it: how the test database is provisioned, migrated, seeded, and — the headline — **isolated per Vitest worker** so parallel files don't trample each other.

Senior framing (the implicit lesson-intro question): Vitest runs test files in parallel workers. Point them all at one Postgres and they collide on the migration runner, sequences, advisory locks, and each other's uncommitted rows. The reach is **one logical database per worker**, keyed by `VITEST_POOL_ID`, migrated once per worker, never shared. CI keeps the same per-worker shape but can swap the *provisioning substrate* (Docker → Neon branch) when realistic data volume earns it.

Pedagogical priorities:

- **The mental model is the payload.** The single most important takeaway is a picture: N workers, N databases, one migration run apiece, `VITEST_POOL_ID` as the routing key. Everything else (env files, fsync, CI) is plumbing that serves that picture. Lead with the diagram, then justify each piece.
- **Layer the lifecycle, don't dump it.** There are two distinct lifecycle scopes that beginners conflate: **once-for-the-whole-suite** (`globalSetup`) vs. **once-per-worker** (`setupFiles`). Getting the wrong thing in the wrong scope is the central bug of this lesson (migrations-per-file is a 10x regression; DB-creation-per-worker races). Teach the two scopes as a hard dichotomy with a "what runs where" table, then map each task onto it.
- **This is a one-time setup the student will copy, then forget.** Unlike `withRollback` (written once, *used* every test), this wiring is authored once and rarely touched. So the goal is *understanding deep enough to debug it when it breaks*, not memorization. Optimize for "you'll recognize the failure mode," not "you'll type this from memory." Each watch-out is a future 3am incident.
- **Defaults before conditionals.** Docker Compose + per-worker DBs is the course default (simple, free, local-parity). Neon branch-per-CI-run is the **conditional** move — name its trigger explicitly (local seed > ~5s, or assertions need production-shaped row counts / RLS depth) before showing it. Do not present Neon as "the better way"; present it as "the way you reach for when the default's seed step gets slow."
- **Fail-fast on the production-URL footgun.** The scariest failure in the lesson — pointing `.env.test` at production `DATABASE_URL` and dropping prod tables on first migrate — gets a dedicated, vivid treatment plus the cheap structural guard (URL-prefix assertion). This is a "real production stakes" moment; lean into it.
- **Connect to prior knowledge.** Students have met: Drizzle migrations (Ch 039), `drizzle-seed` for dev (Ch 040 L3), env validation via `@t3-oss/env-nextjs` (Ch security baseline), Docker basics, the Vitest project split and `VITEST_POOL_ID` existence (Ch 086 L1), and `withRollback`/`tx` (this chapter, L1). Frame every new piece as an extension of one of these.
- **Version currency is load-bearing here.** Vitest 4 **removed `poolOptions`**; `maxThreads` is now the top-level `maxWorkers`, and the env knob is `VITEST_MAX_WORKERS`. `VITEST_POOL_ID` survives as the per-worker discriminator (always ≤ `maxWorkers`). The chapter outline predates this rename — the lesson must teach the **current** config shape. Flagged for downstream agents.

Running domain: continue the chapter's `createInvoice` / `invoices` example. The seed baseline (`seed_org`, `seed_admin_user`) and any sample query should use that domain so the student sees one example deepen.

Estimated length target: 45–55 min. Heavy on config files and one strong diagram; lighter on live exercises than a pattern lesson (this is wiring, not a reusable coding move).

---

## Lesson sections

### Introduction (no header)

Open on the concrete collision. The student already has `withRollback` from L1 calling `db.transaction(...)` — but against *what* connection? Pose it as the gap L1 left open. Then the failure: run the suite with two workers against one shared test DB and watch non-determinism appear — worker A's migration runs while worker B queries half-migrated tables; sequences interleave; a `FOR UPDATE` lock from one file blocks another. One sentence naming the reach (one DB per worker, `VITEST_POOL_ID`-keyed), one sentence on the CI fork (same shape, swappable substrate), then preview the end state: `pnpm vitest run --project integration` spins up isolated DBs, migrates each once, and runs hundreds of integration tests with zero cross-worker interference. Warm, ~5 sentences.

Reference the L1 dependency explicitly but do not re-teach rollback — link forward-back: "L1 gave you the per-*test* isolation; this lesson gives you the per-*worker* isolation underneath it."

### The worker-to-database map

The keystone section — the mental model lands here before any config.

Teach the topology: Vitest's `integration` project runs each `*.int.test.ts` file in a pool of workers (threads by default for a node project). Each worker is a long-lived OS thread that runs many files sequentially; **`VITEST_POOL_ID`** is a stable small integer (1..N, always ≤ `maxWorkers`) identifying which worker a test is running on. The scheme: create `test_w1`…`test_wN` once, then each worker connects to `test_w{VITEST_POOL_ID}` and owns it exclusively for the run.

Why per-worker and not per-file or per-test:
- Per-test DB = thousands of create/drop cycles, unusable.
- Per-file DB = hundreds of migration runs, still 10x too slow.
- Per-worker DB = exactly `maxWorkers` migration runs (4–8 typically), each worker reuses its DB across all its files, and `withRollback` (L1) handles the per-test isolation *inside* that one DB. The two isolation layers compose: worker-DB isolation across files, transaction-rollback isolation across tests.

**Diagram — primary, do this first.** A D2 system diagram, `direction: right`, wrapped in `<Figure>`. Three Vitest worker nodes (`Worker 1` `VITEST_POOL_ID=1`, `Worker 2 =2`, `Worker 3 =3`) on the left, each with an arrow labeled `connects to` pointing to its own database cylinder-ish box (`test_w1`, `test_w2`, `test_w3`) on the right. A `globalSetup` node above spanning to all three DBs with a dashed `creates` edge. Annotate that each worker runs many `.int.test.ts` files (small stacked `shape: page` nodes behind each worker, or a label "runs files 1..k"). Caption: "Each Vitest worker owns one database for the whole run; `globalSetup` creates them up front, `VITEST_POOL_ID` routes each worker to its own." Pedagogical goal: cement the N-workers-N-DBs picture as a single glance before the student reads a line of setup code. Keep font-size bumped (`**.style.font-size: 26`) since it's a wide diagram squeezed to card width. `direction: right` to stay short.

Tooltip (`Term`) on **`VITEST_POOL_ID`** at first mention: "Vitest env var holding the current worker's index (1..N, ≤ maxWorkers). Stable per worker for the whole run — the key the per-worker-DB scheme routes on."

### Two lifecycle scopes: `globalSetup` vs. `setupFiles`

The conceptual fork that prevents the chapter's signature bug. Teach the dichotomy crisply.

- **`globalSetup`** — runs **once**, in the main process, *before* and *after* the entire suite, *outside* any worker. No access to test globals or the worker's module graph. This is where you do process-level, run-level work: bring up Docker, connect as superuser, `CREATE DATABASE test_w1..test_wN`, and (in teardown) optionally drop them.
- **`setupFiles`** — runs **once per worker** (technically per test-file context, but with worker reuse it's effectively per-worker for the expensive bits guarded by a module-level flag or `beforeAll`), *inside* the worker. Has the worker's env (`VITEST_POOL_ID` is set here). This is where the worker connects to *its* DB, runs migrations against it, registers MSW (Ch L5), and wires the `withRollback` registration (L1).

Present as a **"what runs where" table** (plain markdown table, or a 2-column `Buckets`-style mental sort): rows = {Docker bring-up, create N databases, connect to this worker's DB, run migrations, seed baseline, MSW server.listen, drop databases}; columns = {globalSetup (once), setupFiles (per worker)}. This table is the section's payload.

Hammer the two failure directions:
- DB creation in `setupFiles` → N workers race to `CREATE DATABASE` the same names → duplicate-key / "database already exists" flakes. Belongs in `globalSetup`.
- Migrations in `globalSetup` against one DB, or worse per file → either the per-worker DBs never get migrated, or you pay the migration cost the wrong number of times. Migrations belong in `setupFiles`, once per worker.

Code via **`CodeVariants`** — two tabs, `vitest.config.ts` and the two setup files conceptually. Actually better here: show the **config wiring** as one `Code` block (the `integration` project entry pointing at `globalSetup` + `setupFiles`, with `maxWorkers` top-level), then the two setup files as a `CodeVariants` with tabs `globalSetup.ts` and `setup.ts`. Each tab's prose names its scope in the first sentence ("Runs once, in the main process…" / "Runs once per worker…").

Critical version note for the config block: write the **Vitest 4** shape — `maxWorkers` is a **top-level** option (not `poolOptions.threads.maxThreads`). If a per-pool setting is shown, it's top-level. Add a one-line aside: pre-v4 tutorials nest this under `poolOptions.threads`; the current API flattens it. (Downstream: confirm against the repo's pinned Vitest before finalizing the exact key names.)

### Migrating each worker's database

Now the per-worker `setupFiles` body in detail. The student knows migrations from Ch 039 (authoring) — here they run the *same* `drizzle/*.sql` files programmatically.

Teach:
- Import `migrate` from `drizzle-orm/node-postgres/migrator`; call `await migrate(db, { migrationsFolder: 'drizzle' })` against the worker's DB connection. **Same migration files production runs** — no separate test schema, no hand-maintained DDL. This is the whole point: the test DB *is* the production schema.
- **Once per worker, not per test, not per file.** Guard it: open the pool and migrate inside a module-level idempotent step or a `beforeAll` that the worker hits once. (The worker reuses its module graph across files in the same worker, so a top-level promise-memoized migrate is the clean shape — but be careful with the lazy-open gotcha below.)
- **Lazy-open the pool.** A subtle but real bug: if `setupFiles` opens the Drizzle/`pg` pool at *module-eval* time, it can fire before `globalSetup`'s `CREATE DATABASE` has completed on the very first worker scheduling, and connect to a database that doesn't exist yet. Fix: open the connection lazily inside `beforeAll` (or a memoized getter), not at top-level import. Note this is the inverse of the usual "singletons at module scope" advice — here ordering across the global/worker boundary forces laziness.

**Schema-drift guard.** Before the suite (or as a CI pre-step), run `drizzle-kit check` — it fails if a developer wrote a migration file but the schema and journal disagree, or added schema changes without generating a migration. Catches the "works on my machine because I never ran the migration" class. Same check runs in CI. Present as a short `Code` (`pnpm drizzle-kit check`) with one sentence on what it protects against. Distinguish `check` (drift detection, the guard) from `migrate` (apply, the runtime step) — students conflate the two kit subcommands.

Use **`AnnotatedCode`** for the worker `setup.ts` migrate body if it's worth stepping through (connect lazily → migrate once → seed baseline → register rollback): 3–4 steps, each ≤6 lines of prose, colors to separate "connect", "migrate", "seed". Only if the block exceeds ~8 lines; otherwise a plain `Code` with a sentence each.

### One baseline seed, then per-test factories

Short, sharp boundary-setting section. Prevents the student from over-seeding test setup.

- After migrating, insert a **tiny** baseline inside the worker's DB: one `seed_org`, one `seed_admin_user`. That's it. These exist so a test that doesn't care about org/user setup has a valid FK target.
- **Heavy, realistic data is NOT this.** That's `drizzle-seed` (Ch 040 L3), which is a *dev/demo* concern — explicitly not test setup. Re-state the line: dev seeding fills a database to *look at*; test seeding gives a *minimal valid baseline* and lets per-test factories build exactly what each test asserts on.
- Per-test data = factories (`buildInvoice({...}, tx)`, introduced Ch 087 L2, extended Ch 088 L3) called **inside the transaction**, so they roll back. The seed baseline lives outside any test transaction (it's inserted in setup, committed to the worker DB) and is shared read-only across that worker's tests — which is fine *because tests never mutate it directly; they build their own rows*.
- Watch-out: a test that mutates a seed row (not a factory row) leaks across tests in the same worker — the seed is committed, not in `tx`. Rule: treat seed rows as immutable; if a test needs to mutate, it builds its own row via a factory.

No diagram. One `Code` block showing the baseline insert; prose carries the boundary. Optionally a 2-bucket `Buckets` exercise here (see exercises below) sorting data into "seed baseline" vs "per-test factory."

### The `.env.test` surface and the production-URL guard

The safety-critical section. Give it weight.

- A dedicated **`.env.test`** holds the test connection surface: a base `DATABASE_URL` (superuser, for `globalSetup` to create databases) and a `WORKER_DATABASE_URL_PATTERN` like `postgres://test:test@localhost:5433/test_w{id}` that each worker fills in with its `VITEST_POOL_ID`. Loaded explicitly (e.g. `dotenv`/`@dotenvx`) in `globalSetup` and the worker setup. Production `.env` and `.env.local` are **excluded** — never loaded by the test harness.
- **The footgun, vividly.** If `.env.test` (or a leaked `.env.local`) points at the *production* `DATABASE_URL`, the first `migrate`/`CREATE DATABASE` runs against prod. Worst case: tables dropped, data gone. This has happened to real teams. Frame as the production-stakes moment of the lesson.
- **The cheap structural guard.** A fail-fast assertion at the top of `globalSetup`: refuse to run unless the URL host/db-name matches a test pattern (e.g. starts with `localhost:5433` or db name begins `test_`). One `if (!url.includes('5433') && !isNeonBranch) throw` is insurance against catastrophe. Show this assertion.
- **`fsync` off — and why it's safe only because this DB is disposable.** Tie env to performance here. The test Postgres runs `fsync=off`, `synchronous_commit=off`, `full_page_writes=off` — an order of magnitude faster, because durability doesn't matter for a database that's recreated every run. This config is **baked into the Docker image's `postgresql.conf`**, never set on a server holding real data. Connect the dots: the same "disposable" property that makes the URL-guard necessary is what makes fsync-off acceptable. Show the relevant `postgresql.conf` lines + the compose service snippet (`command: -c fsync=off -c synchronous_commit=off`, port `5433`).

**`CodeVariants`** with two tabs: `.env.test` (the connection surface) and `docker-compose.test.yml` (Postgres 17 on 5433 with fsync-off command). Or three-way `TabbedContent` (`.env.test` / `docker-compose.test.yml` / `postgresql.conf`) if the conf is shown separately. First sentence of each names its role.

Tooltip (`Term`) on **`fsync`**: "Postgres setting that forces writes to physical disk before acknowledging a commit. `off` trades crash-durability for speed — safe only on a throwaway database."

Watch-outs cluster: prod URL in `.env.test` (covered above, the big one); Docker on default port 5432 colliding with a local dev Postgres → pin **5433**; `.env.local` precedence accidentally shadowing `.env.test`.

### Wiring it into GitHub Actions

The CI section. Keep the default shape simple; this is not the CI-depth lesson (that's Ch 097 — matrix, caching, reporters).

- The default CI job mirrors local exactly: GitHub Actions **`services: postgres`** (a sidecar Postgres 17 container the job talks to on 5432), then `pnpm install --frozen-lockfile`, `pnpm drizzle-kit migrate` (or let the per-worker setup migrate), `pnpm vitest run --project integration`. Free, fast, no external dependency. JUnit reporter for CI surfacing is forward-pointed to Ch 097, not built here.
- **The health-check is load-bearing** — and it echoes the lazy-open theme. The `services.postgres` block needs `options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5`, or the migrate step races the container boot and fails on connection-refused. Same ordering hazard as the worker connecting before `CREATE DATABASE` finished: the DB must be *ready*, not just *declared*. Call out the parallel explicitly — it reinforces the lesson's recurring "exists ≠ ready" idea.
- `if: always()` on cleanup so a failed test run still tears down — mention briefly.
- Name the runner commands triad (a small table or inline): **local watch** `vitest --project integration`; **CI** `vitest run --project integration` (later `--reporter=junit`, Ch 097); **pre-push** (lefthook, Ch 096) `vitest run --project integration --changed` for only-affected files. Frame each by *when* you run it, not as ceremony.

Show the GitHub Actions job as one `Code` (yaml), with the `services.postgres` block highlighted. Keep it to the integration-relevant steps; don't teach Actions syntax from scratch (assumed from earlier CI exposure / forward to Ch 097).

### When the default isn't enough: a Neon branch per CI run

The **conditional** move. Defaults-before-conditionals discipline: name the trigger first, then the tool.

- **Trigger first.** Reach for this when the Docker-`services` default stops paying off: the **seed/setup step exceeds ~5s** because tests need production-shaped row counts, or assertions depend on data volume / RLS-policy depth that a schema-only fresh DB can't provide. Until then, the simple `services: postgres` shape wins — say so.
- **What Neon gives you.** Neon's **copy-on-write branching** forks a full database (schema *and* data) from a parent (e.g. a staging branch) in ~O(1) — under a second regardless of size. So every CI run gets an isolated, full-data copy of staging, runs against it, and discards it. The per-worker shape is unchanged — you still get one logical DB per worker; only the *substrate* swapped from "freshly-migrated empty Docker" to "instant full-data Neon branch."
- **Wiring.** `neondatabase/create-branch-action@v6` at job start creates the branch and exposes outputs `db_url` (and `db_url_pooled`, `branch_id`); reference `${{ steps.<id>.outputs.db_url }}` as the run's `DATABASE_URL`; the companion `neondatabase/delete-branch-action` on `if: always()` cleans up via `branch_id`. Note the driver swap: local uses node-postgres against Docker; Neon CI may use the Neon serverless driver — but the test code is unchanged because it talks to `db`/`tx`, not the driver.
- **Cost reality.** Neon free-tier branch limits can queue concurrent CI runs — name this as the "upgrade trigger," consistent with the honest cost-accounting tone.

Present the two CI shapes as a decision, not a ranking. A small **`StateMachineWalker`** (decision mode) could work: "Does your integration suite need production-shaped data volume or RLS depth? / Does local seed take > ~5s?" → recommends `services: postgres` (default) vs Neon branch. Goal: make the *trigger* the deciding input, reinforcing the pedagogy. If `StateMachineWalker` is overkill for two outcomes, use a two-tab `CodeVariants` (`Docker services (default)` vs `Neon branch (conditional)`) for the CI yaml diff and let prose carry the trigger. Lean `StateMachineWalker` if it reads cleanly; it makes the conditional-vs-default lesson tactile.

Tooltip (`Term`) on **copy-on-write**: "Branch shares the parent's data pages until written to; a new branch is near-instant and cheap regardless of database size."

### Sizing the worker pool

Short closing-practical section.

- `maxWorkers` default suggestion: `Math.min(4, cpus)` locally; CI runners can go higher. The sweet spot is empirical — "as many workers as your test Postgres handles before connection/lock contention eats the parallelism win," typically 4–8 on a laptop.
- Tie back to the topology: more workers = more databases = more migration runs at startup *and* more concurrent connections into one Postgres. There's a knee where adding workers stops helping (Postgres contention) — the student should reason about it, not memorize a number.
- One-line: the per-worker-DB scheme makes worker count safe to tune freely — no shared state means no correctness risk from raising it, only a throughput/contention tradeoff.

No new component; a sentence and maybe the `maxWorkers` line echoed.

### Exercises

Place exercises in their home sections, not bundled at the end.

1. **`Buckets` — lifecycle scope sort** (in the `globalSetup` vs `setupFiles` section, or just after). Two buckets: `globalSetup (once)` / `setupFiles (per worker)`. Items: "Bring up Docker Postgres", "`CREATE DATABASE test_w1..N`", "Connect to this worker's database", "Run `migrate()` against the schema", "Insert the seed baseline org/user", "`server.listen()` for MSW", "Drop the test databases". This is the single highest-value check in the lesson — it directly tests the dichotomy that prevents the signature bug. Grading is built into `Buckets`.

2. **`Sequence` — startup order** (in the migrating section or CI section). Order the boot steps: "`globalSetup` connects as superuser" → "Create `test_w1..N`" → "Workers start, each reads `VITEST_POOL_ID`" → "Each worker connects to `test_w{id}`" → "Each worker runs migrations once" → "Each worker seeds its baseline" → "Tests run inside `withRollback` transactions". Reinforces the global-then-per-worker ordering and why lazy-open matters (DB must exist before the worker connects).

3. Optional **`MultipleChoice`** in the `.env.test` section: "Your integration suite just dropped three production tables on first run. Which single guard would have prevented it?" with the URL-prefix fail-fast assertion as correct, distractors = "more workers", "fsync on", "per-test rollback" (rollback doesn't help — `CREATE DATABASE`/migrate aren't in a test transaction). Drives home that rollback isolation does *not* protect against a misconfigured target DB.

No live coding component fits well here — this is config/infra wiring, not a reusable code move, and `DrizzleCoding`/`ScriptCoding` runtimes can't model multi-worker DB provisioning. Prefer the guided drills above over any sandbox.

### Terms for `Term` tooltips

Strategic, lesson-supporting only:
- **`VITEST_POOL_ID`** — the per-worker index; the routing key. (Section 2.)
- **`fsync`** — disk-durability setting; why off is safe on a throwaway DB. (env section.)
- **copy-on-write** — what makes Neon branching O(1). (Neon section.)
- **`globalSetup`** — possibly, if not fully explained inline; otherwise the section header carries it.

Do not over-tooltip: `setupFiles`, `migrate`, Docker, Postgres are all explained inline or assumed from prior chapters.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `withRollback` + `tx` seam (Ch 088 L1): the per-test isolation layer this lesson's per-worker DBs sit underneath. One sentence; link back.
- Drizzle migration *authoring* and the `drizzle/*.sql` journal (Ch 039): assumed. This lesson only *runs* them.
- `drizzle-seed` for dev/demo data (Ch 040 L3): named as the contrast to test seeding; not taught.
- Env validation via `@t3-oss/env-nextjs` + Zod (security baseline): assumed; `.env.test` is just another env file.
- Vitest project split, `VITEST_POOL_ID` existence, worker parallelism (Ch 086 L1): assumed; this lesson *uses* the `integration` project.
- Factories (`buildInvoice`) (Ch 087 L2): named as the per-test data source; extended in L3, not here.

**Explicitly out of scope — do NOT cover (forward-points):**
- The rollback pattern internals — Ch 088 L1 (done).
- Auth fixtures / `signedInAs` — Ch 088 L3.
- Network-boundary mocking, MSW mechanics — Ch 088 L4–L5 (MSW `server.listen` is *mentioned* only as a setupFiles task, not taught).
- Webhook receiver / Server Action end-to-end tests — Ch 088 L6–L7.
- Flake taxonomy — Ch 088 L8 (port-collision watch-out is mentioned in passing only).
- CI depth: matrix builds, dependency/build caching, JUnit reporter detail, lefthook config — Ch 097 and Ch 096. This lesson shows the *minimal* integration job and forward-points.
- RLS testing / `auth.uid()` — Chapter 11. (Named only as a Neon-trigger justification.)
- Drizzle transaction semantics at depth — Unit 5.
- Production migration strategy (zero-downtime, expand-contract) — Ch 039 / later. This is test-DB migration only.

**Deliberate divergences from Code conventions (flag for downstream):**
- Code conventions §Testing says integration tests live in `tests/integration/`. **Superseded** by Ch 086's colocation glob `src/**/*.int.test.ts` (per L1 continuity notes). Use the `.int.test.ts` colocation; do not place tests in `tests/integration/`.
- Code conventions / chapter outline reference `poolOptions.threads.maxThreads`. **Stale** — Vitest 4 removed `poolOptions`; use top-level `maxWorkers` and env `VITEST_MAX_WORKERS`. `VITEST_POOL_ID` is unchanged. This is a deliberate currency correction, not a divergence to flag for fixing.

---

## Notes for downstream agents

- Verify the exact Vitest config key names against the repo's pinned Vitest version before writing `vitest.config.ts` — the 4.0 flattening (`maxWorkers` top-level, `poolOptions` removed) is confirmed current but pin-check the precise surface.
- Confirm `VITEST_POOL_ID` is set under the project's chosen `pool` (threads is the documented home; if the repo runs `forks` for the integration project, `VITEST_POOL_ID` still applies but double-check). Course default per outline + conventions is the node `integration` project on threads.
- Pin `neondatabase/create-branch-action@v6` (current major).
- Driver: node-postgres (`drizzle-orm/node-postgres`) for local Docker; Neon serverless driver only in the Neon-CI path. Match L1's node-postgres choice.
- Keep the running example `createInvoice`/`invoices`; seed baseline is `seed_org` + `seed_admin_user`.
