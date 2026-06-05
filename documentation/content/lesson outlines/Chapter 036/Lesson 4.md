# The serverless driver and the pooled URL

**Title (h1):** The serverless driver and the pooled URL
**Sidebar label:** Driver and pooled URL

---

## Lesson framing

This is the connection lesson: it closes Chapter 036 by answering how the app actually opens a connection over the `DATABASE_URL` the previous three lessons set up.
L1 modeled the data, L2 decided where the DB runs (Neon dev branch, Postgres 18), L3 explained Neon's storage/compute split and the per-preview branch URL.
This lesson teaches two orthogonal decisions and one failure mode that motivates both:

1. **Pooling** — *which connection string* the app uses. Pooled (`-pooler` host, PgBouncer transaction mode) for serverless app traffic; unpooled (direct host) for migrations and long-running scripts.
2. **Driver shape** — *how the call site talks*. HTTP (`neon(...)` / `drizzle-orm/neon-http`) for one-shot reads; WebSocket Pool (`Pool` / `drizzle-orm/neon-serverless`) for interactive transactions.

**The single causal spine.** Everything in this lesson descends from one fact the student must internalize: *a serverless function is born, runs one request, and dies — it does not hold a long-lived connection like a traditional Node server does.* The traditional `pg` connection-pool-in-the-process model assumes a long-lived server; serverless breaks that assumption. Both the pooler (server-side connection reuse the app can no longer do itself) and the HTTP driver (no connection to hold at all) are answers to that one broken assumption. Lead with the failure mode (connection exhaustion on a spike), then both fixes fall out naturally. This ordering is the whole lesson — do not present the four cells of the matrix as flat trivia.

**Pedagogical priorities.**
- This is a *decisions-before-syntax* lesson. The student writes almost no code here; Drizzle wiring is Chapter 037's job. The deliverable is a **mental model and two reflexes**, not a working `db/index.ts`. State explicitly that the code shapes shown are previews of what Chapter 037 wires.
- Cognitive-load staging: simplified model first (one Postgres, a hard connection cap, one function = one connection), then introduce the spike that breaks it, then the pooler, then — separately — the driver-shape axis. Keep the two axes (pooling vs driver) visually and narratively distinct; conflating them is the #1 way this topic confuses beginners.
- Frame in production stakes throughout: the failure isn't abstract, it's `FATAL: too many connections` and a 500 page during the launch-day traffic spike — exactly when it hurts most. This is a "looks fine in dev, falls over under load" bug, the kind seniors are paid to prevent.
- The end-state reflexes, stated as a memorable pair: **pooled URL for app traffic, unpooled URL for migrations; HTTP for reads, WebSocket for transactions.** Both reduce to "match the connection to the call site's lifetime."

**What the student can do at the end.** Look at a connection string and tell pooled from unpooled by the host; explain why a serverless read uses the pooled HTTP path and a migration uses the unpooled direct path; predict which operations break under transaction-mode pooling; recognize the two-client (`db` / `dbUnpooled`) shape they'll meet in Chapter 037 and know why it exists.

**No video, no live-coding exercise by design** (consistent with the rest of the chapter — this is infra reasoning, and there is no query for the student to run yet; PGlite/Drizzle exercises arrive in ch038). One decision-walker and one or two comprehension checks (MultipleChoice / Buckets) carry assessment. A diagram-sequence carries the spike-and-pooler story.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely: a Server Component is rendering an invoice list inside a Vercel function. Launch day arrives, 500 people hit the page at once, 500 functions boot. *How does each one reach Postgres without knocking the database over?*
Anchor to what the student already knows from L1–L3: they have a schema, a Neon Postgres, and a `DATABASE_URL`. The missing piece is the connection itself.
State the lesson's two takeaways up front (the two reflexes) so the student has a frame to hang detail on, then promise the failure mode that motivates them.
Keep it warm and brief; the senior question does the motivating, do not over-explain here.

`Term` candidates in this section: **serverless function** (re-anchor: ephemeral compute, one invocation per request, no persistent process), **Server Component** (brief re-anchor — renders on the server, can read the DB directly; taught in ch032).

---

### Why a fresh connection per request breaks Postgres

The motivating failure mode. This section must land *before* any mention of poolers or drivers — it is the "why" both halves of the lesson exist.

Teach, step by step, building the simplified model then breaking it:
- **The cost of one connection.** Opening a Postgres connection is not free: TCP + TLS handshake + auth, then it occupies one *backend slot*. Frame a backend as a real OS process Postgres forks per connection — slots are finite and memory-bound.
- **The hard cap.** Postgres has a `max_connections` ceiling (commonly ~100 on managed tiers; Neon's is plan-dependent). State the number as illustrative, not load-bearing (versions/plans drift). The point is *there is a wall*.
- **Why the traditional fix doesn't apply.** A long-lived Node server opens a small in-process pool of, say, 10–20 connections once at boot and reuses them for every request — `pg`'s `Pool`. That works because the process lives for days. **A serverless function lives for one request.** It can't amortize a pool across requests, because by the next request the function (and its pool) may be gone. This is the crux — say it plainly and tie everything back to it.
- **The spike math.** N concurrent invocations, each opening its own connection, = N connections. Past the cap, Postgres rejects with `FATAL: sorry, too many connections for role`, and the app 500s. The dev machine never sees this — one developer, a handful of connections. It only appears under concurrency, which is why it ships to production undetected.

**Diagram — `DiagramSequence` (the spike).** Pedagogical goal: make the exhaustion *visceral and temporal*, not a static box-graph. Scrub through ~4 steps:
1. Calm state: 3 functions, 3 connections, Postgres well under its cap (show a "connections: 3 / 100" gauge).
2. Traffic spike: many functions boot at once, connection count climbs toward the cap.
3. Cap hit: new functions get `too many connections` (red), users see 500s.
4. (Optional teaser frame) the same spike with a pooler in front — many functions, but the connection count to Postgres stays flat and low. This frame *foreshadows* the next section without explaining it yet.
Use a simple HTML/CSS or `ArrowDiagram`-style composition inside each `DiagramSequence` step (functions on the left, a pooler/Postgres on the right, a numeric gauge). Keep it horizontal and short (height budget).

`Term` candidates: **backend slot / backend** (a Postgres server process serving one connection), **`max_connections`** (the server-side ceiling on concurrent connections), **handshake** (TCP+TLS+auth round-trips paid to open a connection), **connection pool** (a reused set of open connections — here, the *in-process* `pg` pool that serverless can't use).

State explicitly: **the fix moved out of application code.** Years ago you tuned your app's pool; in 2026 the database provider runs a pooler in front of Postgres and the app just talks to it. This is the bridge into the next section.

---

### The pooled connection string: PgBouncer in transaction mode

Now the first fix, on the *pooling* axis. This section is about *which URL*, not which driver — keep that boundary sharp.

Teach:
- **What Neon runs.** Neon puts **PgBouncer** in front of Postgres in **transaction mode**. Explain the multiplexing simply: thousands of short-lived client connections (your booting functions) map onto a *small, fixed* set of real Postgres backend connections. PgBouncer hands a client a backend *for the duration of one transaction*, then returns it to the pool. So 500 functions can share, say, a few dozen real backends — the connection count to Postgres stays flat under the spike (callback to the optional teaser frame).
- **How you turn it on: the hostname.** This is the concrete, memorable bit. The pooled endpoint differs from the direct one by a **`-pooler` segment in the host**:
  - direct: `…ep-cool-name-123456.us-east-2.aws.neon.tech`
  - pooled: `…ep-cool-name-123456-pooler.us-east-2.aws.neon.tech`
  Same database, same credentials — only the host's routing changes. Neon's console gives you both; the connection-string copy box has a "Pooled connection" toggle.
- **The default.** Pooled URL for all serverless app traffic. This is `DATABASE_URL` in production. Unpooled is the exception (next-but-one section).

**Code presentation — `CodeVariants`** comparing the two strings side by side (label "Pooled" / "Direct/unpooled"), each fence highlighting the `-pooler` token with `"-pooler"` so the eye lands on the only difference. One sentence of prose per tab: which call sites use it. This is the ideal `CodeVariants` use — same artifact, the diff *is* the lesson. Keep secrets fake/placeholder.

Then the caveat subsection (do **not** make it its own watch-out section — it belongs to the mechanism it qualifies):

#### What transaction-mode pooling takes away

Transaction mode reuses a backend across many clients, so **anything that relies on a connection persisting across transactions breaks**. Enumerate the casualties plainly, each with a one-line "why":
- **Session-pinned prepared statements** — a statement prepared on one backend isn't there when you get a different backend next transaction. (Note Drizzle/modern drivers handle this for you, so the student rarely trips it — but name it so the failure is recognizable.)
- **`SET` for the session, session-level `LISTEN`/`NOTIFY`, advisory locks held across statements** — the session they belong to is gone after the transaction.
- **Temporary tables outside a transaction** — same reason.
The senior framing, stated as the takeaway: *keep your work inside transactions, don't lean on session state, and you never notice the pooler exists.* The two operations the course genuinely cares about that DO need a stable session — **migrations** and **long-running scripts** — are exactly why the unpooled URL exists. This sentence is the hinge into the unpooled section later; plant it here.

`Term` candidates: **PgBouncer** (a lightweight connection pooler that sits between clients and Postgres), **transaction mode** (PgBouncer hands out a backend only for one transaction, then reclaims it — vs session mode, which pins a backend to a client for its whole session), **multiplexing** (many client connections sharing few server connections), **advisory lock** (an app-defined Postgres lock — brief, it's niche), **`LISTEN`/`NOTIFY`** (Postgres pub/sub on a session — brief).

---

### Two ways to send a query: HTTP and WebSocket

Pivot to the **second, independent axis** — the *driver shape*. Open by explicitly separating the axes so the student doesn't fuse them: *pooling decided which URL; this decides how the call site talks to the database. They're orthogonal — you make both choices.* (You can still pool both; in practice both URLs here are the pooled one for app traffic.)

Introduce `@neondatabase/serverless` (the driver, now at **v1.0**, GA) as the serverless-runtime stand-in for node-postgres. It exposes two relevant shapes:
- **`neon(connectionString)` — HTTP.** Each query is a single `fetch` POST to Neon's SQL-over-HTTP endpoint. No persistent connection to hold (which is *exactly* why it suits serverless — nothing to leak, nothing to exhaust). Lowest latency for a single one-shot query. **No interactive transactions** — but it *does* support a *non-interactive* batch: `transaction([q1, q2, q3])` (an array of queries) runs them in one transaction in a single round-trip. It cannot do `begin … read result … decide … write` interactively.
- **`Pool` / `Client` — WebSocket.** A persistent connection over a WebSocket, `pg`-compatible. Supports **interactive transactions** (`db.transaction(async (tx) => { … })`), sessions, multiple round-trips on one connection. The reach when a single request must read, branch on the result, then write atomically.

**Naming the Drizzle wrappers (preview only).** State that Chapter 037 wires each via `drizzle-orm/neon-http` (HTTP) and `drizzle-orm/neon-serverless` (WebSocket Pool). Show them only as the names the student will meet; do not teach the Drizzle setup. This keeps the scope line with ch037 crisp.

**Code presentation — `CodeVariants`** with two tabs, "HTTP (one-shot read)" and "WebSocket (transaction)". Keep each to a few lines, illustrative, *labeled as a Chapter 037 preview in the prose*:
- HTTP tab: `const sql = neon(env.DATABASE_URL); const rows = await sql\`select ...\`;` — prose: "one query, one fetch; the default for Server Component reads."
- WebSocket tab: a `Pool` + `db.transaction(async (tx) => { ... })` sketch — prose: "persistent connection; the reach when one request needs a real transaction."
Highlight the import/constructor difference (`neon` vs `Pool`) with `"neon"` / `"Pool"` quoted marks.

Then a short subsection making the choice operational:

#### Which one a call site reaches for

This is the decision rule, and it maps cleanly onto things the student already knows:
- **Server Component read** (ch032) → HTTP. It fetches once and renders; no transaction, latency matters. The course default for data fetches.
- **Server Action / route handler that writes** (ch043) → WebSocket, when the write needs a transaction (read-modify-write, multiple statements that must all-or-nothing). Name ch043 as where this earns its weight; don't teach Server Actions here.
- Heuristic to remember: *one read → HTTP; a transaction → WebSocket.*

**Interactive decision exercise — `StateMachineWalker` (`kind="decision"`).** Pedagogical goal: drill the *order* of the senior's questions and unify both axes into one walk. This is the section's centerpiece exercise. Walk:
- Q1 "What's the call site?" → app request vs migration/maintenance script.
  - migration/script → **Leaf: unpooled direct URL + node-postgres or unpooled WS** (stable session, multi-statement DDL; details in ch040). This folds the unpooled axis into the same tree.
  - app request → Q2.
- Q2 "Does this single request need a transaction (read-modify-write, multi-statement atomic)?"
  - no, it's a read → **Leaf: pooled URL + HTTP driver (`neon-http`)** — the default for Server Component reads.
  - yes → **Leaf: pooled URL + WebSocket Pool (`neon-serverless`)** — interactive transactions for Server Actions.
Each leaf's body states the URL, the driver, and the one-line why. Place this after the decision-rule prose so the walker reinforces, not introduces. (Do not wrap in `<Figure>` — the walker is its own card.)

`Term` candidates: **`@neondatabase/serverless`** (Neon's HTTP/WebSocket driver for serverless runtimes; drop-in for node-postgres), **node-postgres / `pg`** (the standard long-lived-process Postgres driver — brief), **interactive transaction** (begin, read a result, decide, then write, all on one connection — vs a fixed batch sent at once), **WebSocket** (a persistent bidirectional connection over HTTP — brief re-anchor).

---

### Two clients, one job each: the `db` / `dbUnpooled` shape

Synthesis section. Tie pooling + driver + the unpooled exception into the single artifact the student will actually see in Chapter 037, so this lesson's reasoning has a concrete landing place.

Teach:
- **The shape.** `db/index.ts` exports two clients (course convention): `db` — the **pooled** client used by Server Components, Server Actions, route handlers (the default, the one imported almost everywhere); and `dbUnpooled` — over the **unpooled direct URL**, reserved for migrations and long-running maintenance. Two env vars back them in production: `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).
- **Why two, not one.** Connect every part back to this lesson: `db` rides the pooler because app traffic is many short bursts that must not exhaust Postgres; `dbUnpooled` skips the pooler because a migration is one long multi-statement session that transaction-mode pooling would chop at a transaction boundary (callback to the caveat planted earlier). This is the unpooled-URL payoff promised two sections ago.
- **The migration hazard, stated as the consequence it is** (not a detached watch-out): run a migration over the *pooled* URL and a long `BEGIN … many DDL statements … COMMIT` can be silently severed when PgBouncer reclaims the backend mid-transaction — partial migration, corrupt state. That's the entire reason `dbUnpooled` exists. Migrations are Chapter 040; here we only justify the second client.
- **Symmetry note.** "One `DATABASE_URL` in your head, two endpoints underneath" — the app reasons about one logical database; the two strings are an operational detail the two-client export hides.

**Code presentation — `AnnotatedCode`** over a minimal `db/index.ts` *sketch* (clearly framed as a Chapter 037 preview, casing/Drizzle specifics deferred). Steps:
1. The two imports (`neon-http`, `neon-serverless`) — "two drivers, because two call-site shapes."
2. `export const db = …` over `env.DATABASE_URL` (pooled) — "the default; Server Components and Actions import this."
3. `export const dbUnpooled = …` over `env.DATABASE_URL_UNPOOLED` (direct) — "migrations and long scripts only."
Use `color="blue"` for the default `db` step, `color="orange"` for the `dbUnpooled` exception so the eye separates default from escape hatch. Keep the code skeletal — the goal is the *shape and the why*, and ch037 owns the real wiring (say so in step 1's prose).

Optional **`Buckets`** comprehension check here or as the section's close: sort operations into **Pooled `db` / HTTP**, **Pooled `db` / WebSocket**, **Unpooled `dbUnpooled`**. Items e.g.: "render an invoice list in a Server Component" (pooled HTTP), "Server Action: deduct credits then insert a charge atomically" (pooled WS), "`drizzle-kit migrate` on deploy" (unpooled), "a nightly cleanup script holding a session for minutes" (unpooled), "fetch one user by id for a page" (pooled HTTP). Grades the synthesis directly and cheaply.

`Term` candidates: **`DATABASE_URL_UNPOOLED`** (the direct-host connection string, reserved for migrations/long sessions), **DDL** (data-definition language — `CREATE`/`ALTER`/`DROP`; brief re-anchor from L1).

---

### The senior reflexes (close)

Short consolidation, not a new concept dump. Restate the two reflexes as the lesson's keepers, and re-tie them to the one root cause so the student leaves with the spine, not four disconnected rules:

- **Pooled URL for app traffic, unpooled URL for migrations and long scripts.** (Because serverless = many short connections that must not exhaust Postgres; migrations = one long session the pooler would sever.)
- **HTTP driver for reads, WebSocket driver for transactions.** (Because a one-shot read needs no held connection; a read-modify-write needs one.)
- The unifying line: *match the connection to the call site's lifetime.* One logical `DATABASE_URL`, two endpoints, two clients.

Forward pointers, one line each, so the debts are explicit: Drizzle wires both clients (ch037); Server Actions are where the transactional client earns its weight (ch043); migrations run on the unpooled URL (ch040); every query in the course flows through one of these two clients (ch038).

A final brief callout (`Aside` "note"): `pg` (node-postgres) still works against the *same* Neon URLs and is the reach for genuinely long-lived Node processes — background workers and jobs (Unit 12). `@neondatabase/serverless` is specifically the *serverless-runtime* answer; it isn't the only driver, it's the right one here. One sentence; don't expand.

**Optional `ExternalResource` cards** (External resources, end of lesson): Neon serverless-driver docs page, Drizzle "Connect Neon" page. Two max.

---

## Scope

**Prerequisites to re-state concisely (already taught — do not re-teach):**
- `DATABASE_URL` as the single connection-string contract and connection-string anatomy (L2) — assume known; this lesson only adds the `-pooler` host variant.
- Neon = storage/compute split, the per-preview branch URL injected by the integration (L3) — assume known; this lesson is "how the app *opens* that URL."
- Postgres 18, Neon dev branch as the course default (L2) — assume known.
- Server Components render on the server and can read the DB (ch032); env validation via `@t3-oss/env-nextjs` + Zod in `env.ts`, `.env.local`-never-committed (ch037 L2 / referenced in L2) — re-anchor in one clause each, do not expand.

**Out of scope — defer, do not teach:**
- **Drizzle's actual `db` wiring** — `drizzle()` calls, `casing`, schema passing, `neonConfig.webSocketConstructor = ws` setup → **Chapter 037**. Code here is an explicitly-labeled preview of the *shape*, never a build step. (Note for downstream agents: this is a deliberate staged simplification — the `db/index.ts` sketch omits real Drizzle config on purpose.)
- **Server Actions** and *where* transactions earn their weight → **Chapter 043**. Name only.
- **Migrations** — `drizzle-kit generate`/`migrate`, why the unpooled URL, expand-migrate-contract → **Chapter 040**. This lesson only *justifies* `dbUnpooled`'s existence; it runs nothing.
- **Writing queries / `db.select` / `db.query` traversals** → **Chapter 038**. No real query is executed by the student here.
- **`EXPLAIN ANALYZE`, indexes, the real cost of joins** → **Chapter 039**.
- **Read replicas, read/write splitting** → out of scope (named once in L3, dropped).
- **Edge runtime specifics** (Cloudflare Workers, Deno Deploy) → name once for recognition; the course pins **Vercel + Node**.
- **Background workers / long-lived Node clients** with `pg` → **Unit 12**; named once in the closing aside only.
- **Provisioning the Neon project / wiring the Vercel integration at depth** → already L3 + Unit 20 (ch098).
- **No PGlite/Drizzle live-coding exercise** — there's no query to run yet; comprehension is checked with decision-walker + MultipleChoice/Buckets only.

---

## Notes for downstream agents (corrections to chapter-outline phrasing)

- The chapter outline says `db.transaction(...)` over `neon-http` "is a no-op (the driver throws or auto-batches single statements only)." **Refine this:** the HTTP driver *does* support a **non-interactive** `transaction([q1, q2, …])` (an array of queries, one round-trip, one transaction). What it cannot do is an **interactive** `db.transaction(async (tx) => …)` where you read a result mid-transaction and branch. Teach the interactive-vs-batch distinction, not "no-op."
- `@neondatabase/serverless` is **v1.0 (GA)** as of late 2025 — present it as stable/1.0, not pre-release; GA requires Node 19+ (course is on Node 24, fine).
- Keep the `-pooler` hostname as the concrete pooled-vs-unpooled tell — verified current on Neon. Present the example host as illustrative (region/endpoint id are placeholders).
- Connection-count numbers (`~100` max_connections, "a few dozen" backends) are **illustrative** — frame as "there is a wall," never as a guaranteed figure (plan/version dependent).
