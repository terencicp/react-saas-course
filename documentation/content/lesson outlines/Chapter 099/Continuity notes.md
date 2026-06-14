# Chapter 099 — Migrating a live schema without an outage

## Lesson 1 — Expand, migrate, contract

**Taught:** The expand-migrate-contract three-deploy cadence: why a single migration + alias swap produces an overlap window where two code fleets share one database, the invariant that schema must satisfy both live code versions, and how each of the three deploys maintains that invariant; plus dual-write (structural, in the shared mutation path), batched idempotent backfill (`WHERE new IS NULL`, `LIMIT 5000`, loop-until-zero, `dbUnpooled`), dual-read fall-through (`coalesce`), optional feature-flag gating for behavior changes, and the reversibility asymmetry (expand + migrate → `git revert`; contract → data-recovery).

**Cut:** Wall-clock pacing ("soak" time between deploys, one-to-three weeks) from the chapter outline was mentioned only as "often one to three weeks" without detail. The migrate-step migration file note (sometimes an index added concurrently) was omitted; only the expand and contract SQL were shown.

**Debts:**
- Lesson 2: which migrations need the cadence (trigger map, decision tree, `NOT VALID`/`CONCURRENTLY` locking mechanics, pgroll). Lesson 1 gestures once: "not every change needs all three — that's the next lesson."
- Lesson 3: rehearsing on a Neon preview branch; backfill timing extrapolation. Lesson 1 promises: "you'll rehearse this backfill's timing on a production-shaped branch before you run it for real."
- Ch098.1 (alias swap / Vercel deploy model) is a stated prerequisite recalled, not re-taught.
- Ch040 (Drizzle `generate`/`migrate`, forward-only, never `push` in prod) is a stated prerequisite recalled in one sentence.
- Ch093 (PostHog feature flags) named as optional lever, not taught.
- Unit 12 (Trigger.dev) named for million-row backfills, not taught.
- Locking-safe `ALTER TABLE` details (FK `NOT VALID`, `NOT NULL` promotion on large tables) explicitly deferred to lesson 2 in two places.

**Terminology:**
- **alias swap** — Vercel points production domain at new immutable deployment; instantaneous but not the same as cutover.
- **fleet / function pool** — set of serverless instances serving a code version; old fleet drains while new fleet warms.
- **Rolling Releases** — Vercel feature routing a fraction of traffic to the new deployment deliberately; makes the overlap window intentional and potentially long.
- **overlap window** — the period where both v1 and v2 fleets serve requests against the shared database.
- **expand** — first deploy: additive-only schema change (nullable column, no app-code change).
- **migrate** — second deploy: dual-write + backfill + dual-read scaffolding.
- **contract** — third deploy: drop old shape, remove scaffolding; the only irreversible step.
- **dual-write** — setting both old and new columns in the same `update`/`insert` statement inside the shared mutation path; structural, not opt-in.
- **backfill** — one-time script populating new column for historical rows; uses `dbUnpooled`, `LIMIT 5000`, `WHERE customer_id IS NULL` guard, loop-until-zero.
- **dual-read fall-through** — `coalesce(joined-new-value, legacy-text-column)` in the query helper; removed at contract.
- **forward-only** — no down migrations; rollback is always a forward-fix migration.
- **scaffolding** — dual-write + dual-read code that is born to be deleted at the contract deploy.

**Patterns and best practices:**
- Dual-write lives in the single shared mutation path (`tenantDb(orgId).update(invoices).set({ customerId, customerName })`) — never opt-in per call site.
- Dual-read lives in the query helper, defined once, not scattered across call sites.
- Backfill script in `scripts/` directory, run against `dbUnpooled`, batched with `WHERE new IS NULL` + subquery `LIMIT`, loop-until-zero.
- Each cadence PR must be small enough that `git revert` is sane — never bundle dual-write with unrelated features.
- Migration naming: `drizzle-kit generate --name expand_invoices_customer_id`; never `push` in production; always review generated SQL.
- Running example throughout: `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`).

**Misc:**
- The lesson uses the rename (`customer_name` → `customer_id` FK) as the illustrative example throughout; ch100 project uses a different running example (subtotal/tax column) to avoid pre-spoiling the project.
- Lesson explicitly does NOT name which migrations need the cadence — that belongs to lesson 2. Students are told "not every `ADD COLUMN` is a three-week affair."
- Contract section notes: `SET NOT NULL` promotion is safe after backfill + dual-write guarantee no nulls remain; locking-safe ordering deferred to lesson 2.
- Lesson 2 of ch040 is the source of the "expand-backfill-contract" phrase mentioned in passing; this lesson is where it is cashed in.

---

## Lesson 2 — Which migrations need the cadence

**Taught:** The two-axis framework (overlap-window axis: does the change break old or new code; lock axis: does any statement hold `ACCESS EXCLUSIVE` long enough to be an outage), the three-question decision tree (Q1 additive-only → Q2 lock gate/redesign → Q3 live-code-touches-disappearing-shape), the one-deploy "green list," the three-deploy "red list," the middle-list conditionals, and the bias-toward-cadence asymmetry for uncertain calls.

**Cut:** The chapter outline listed "new unique constraint via `CONCURRENTLY` index then constraint promotion" as a one-deploy item; the lesson omits it (only `NOT VALID`/`VALIDATE` is shown for constraints). "Changing the primary key" is named for recognition only, as the outline specified.

**Debts:**
- Lesson 3: rehearsing each cadence step on a Neon preview branch; backfill timing extrapolation. The lesson names the FK-required-column cadence as "the exact shape ch100 walks" — ch100 project is the hands-on build.
- Ch040.2 recalled for `CONCURRENTLY` hand-edit and statement-breakpoint mechanics; not re-taught here.
- Ch040.1 recalled for `drizzle-kit generate --name`, forward-only, never `push` in prod.
- Ch098.1 recalled for the alias-swap / function-warmup overlap window as the reason the invariant exists.

**Terminology:**
- **overlap-window axis** — does the change alter a shape the running code reads or writes (breaks one of the two live fleets).
- **lock axis** — does any single SQL statement hold `ACCESS EXCLUSIVE` long enough to be an outage independent of code versions.
- **ACCESS EXCLUSIVE** — (`<Term>`) strongest Postgres lock; blocks all access including `SELECT`; taken by table rewrites and non-concurrent index builds.
- **SHARE UPDATE EXCLUSIVE** — (`<Term>`) polite lock; concurrent reads and writes proceed; taken by `CREATE INDEX CONCURRENTLY` and `VALIDATE CONSTRAINT`.
- **Q1 / Q2 / Q3** — the three decision-tree questions in the order an experienced engineer asks them (additive → lock → live-code-touches-disappearing-shape).
- **redesign gate** — Q2's role: not a verdict, a prompt to rewrite the SQL to the lock-light form and re-ask Q1.
- **NOT VALID** — constraint flag that skips the table scan at creation time; enforces only on new rows until `VALIDATE CONSTRAINT` is run; explicitly distinguished from `SET NOT NULL` (common junior confusion).
- **VALIDATE CONSTRAINT** — scans existing rows under `SHARE UPDATE EXCLUSIVE`; proves the constraint holds without blocking reads/writes.
- **read-then-drop** — the two-deploy collapse of the cadence for dropping a column the running code still reads.
- **pgroll** — Xata's open-source tool that automates expand/contract via Postgres views; named once, not adopted for the course stack.

**Patterns and best practices:**
- Always run both gates independently: the trigger map (Q1/Q3) and the locking checklist (Q2) are orthogonal — passing one does not clear the other.
- `CREATE INDEX` must use `CONCURRENTLY` in production; plain `CREATE INDEX` is a Q2 failure even when the change is otherwise additive.
- `ADD CONSTRAINT ... NOT VALID` + `VALIDATE CONSTRAINT` is the lock-light two-step for CHECK and FK constraints; one PR only when existing rows already satisfy the constraint.
- Safe `NOT NULL` promotion sequence: (1) deploy — write column on every insert/update; (2) backfill nulls; (3) `ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID`; (4) `VALIDATE CONSTRAINT` (polite lock, proves no nulls); (5) `SET NOT NULL` — now a near-instant metadata flip because Postgres sees the validated CHECK and skips the table scan; (6) drop the scaffolding CHECK.
- When uncertain, bias toward the cadence: false positive wastes a week of calendar time; false negative is an outage.
- Review generated `migration.sql` every time; a `DROP COLUMN` adjacent to an `ADD COLUMN` of similar shape is the rename disambiguation signal — route through the cadence, not one PR.
- Running example: `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`) — same as Lesson 1; do not introduce the ch100 subtotal/tax example.

**Misc:**
- The 2×2 matrix figure (axes: "breaks old/new code" × "needs a long lock") is rendered via a custom `<AxesMatrix />` component (`src/components/lessons/099/2/AxesMatrix.astro`), not a TODO placeholder.
- The lesson deliberately inverts the chapter-outline order: decision tree is taught before the trigger lists so students internalize reasoning over memorization.
- `StateMachineWalker` Q2 "redesign and re-ask Q1" branch terminates at a `<Leaf>` that verbally instructs the loop (component can't truly cycle in decision mode); this is a known component constraint, not a content gap.

---

## Lesson 3 — Rehearsing on a Neon preview branch

**Taught:** The two-ring verification model (automatic ring: build runs `pnpm db:migrate` against the preview branch + CI type-check/tests; manual ring: walk the preview URL + direct branch queries); the four-check rehearsal loop run per cadence step; the dual-write row inspection in Drizzle Studio; three escalation rehearsals (backfill timing extrapolation, synthetic-load lock contention, data-integrity value diff); per-step failure-mode → catching-check mapping; what the rehearsal cannot catch (production-scale concurrency, post-branch data, long-running prod transactions); and the production handoff framing (rehearsal is a fair copy → prod run is a repeat).

**Cut:** The chapter outline listed `auto_explain` and `pg_locks` as tooling for the lock-contention rehearsal; the lesson covers the technique in prose only (synthetic write-traffic script + Neon metrics) without naming those Postgres extensions.

**Debts:**
- Ch100 project: hands-on full-cadence walkthrough using a different running example (subtotal/tax); this lesson names it as the next step but does not spoil it.
- Unit 12 (Trigger.dev): named as the escape hatch for backfills too slow on the branch; not taught.
- Unit 19 (Sentry/observability): named as the production-watch discipline for high-stakes migrations; not taught.

**Terminology:**
- **automatic ring** — the two verifications the build performs without developer action: `db:migrate` against the preview branch + CI type-check/tests; proves the migration *applies* and typed code *compiles*.
- **manual ring** — the two verifications the developer performs by hand: walk the preview URL + query the branch directly; proves the change is *correct*.
- **dual-write inspection** — querying both old and new columns on a row mutated through the preview URL to confirm both are populated; the check the type system cannot perform.
- **data-integrity diff** — pair of SQL audit queries run after the backfill: null-count (`WHERE customer_id IS NULL` → 0) and value-match (`WHERE customer_name IS DISTINCT FROM (SELECT name FROM customers ...)` → 0); proves completeness and correctness.
- **IS DISTINCT FROM** — (`<Term>`) SQL comparison treating NULL as an ordinary value; used in the value-match audit query so null-bearing rows are not silently dropped from the count.
- **rehearsal is necessary, not sufficient** — the senior conclusion; the production run still requires a low-traffic deploy window + watched dashboards.
- **fair copy** — describes the preview branch: same data shape as production; the production run is a "repeat" of what was rehearsed.
- **neonctl branches reset \<branch\> --parent** — CLI command to overwrite a stale branch's schema and data from its parent; described as "the database equivalent of `git reset --hard`."

**Patterns and best practices:**
- Run all four checks on *each* cadence step (expand, migrate, contract independently) — three rehearsals for a full rename, not one.
- Check one: confirm migration row in `__drizzle_migrations` and verify schema shape in Studio/`\d invoices` (not just build-log green).
- Check two: if migration was slow on the branch, treat it as an early warning for production — fix the plan before merging.
- Dual-write inspection: mutate through the preview URL, then `SELECT customer_name, customer_id FROM invoices WHERE id = '...'` — both columns must be non-null.
- Before merging contract: grep codebase for the old column name to catch raw-SQL stragglers Drizzle's type system cannot see.
- Backfill timing extrapolation: `time pnpm tsx scripts/backfill_customer_ids.ts` on the branch; linear-to-production estimate is a ceiling, not a promise.
- Fresh branch via `neonctl branches create --parent main` only when the first rehearsal raised a question a stale snapshot cannot answer.

**Misc:**
- The two anchor visuals are rendered as custom Astro components: `<RingsOfVerification />` (`src/components/lessons/099/3/RingsOfVerification.astro`) and `<ChecksAcrossSteps />` (`src/components/lessons/099/3/ChecksAcrossSteps.astro`).
- The lesson reframes the preview branch from "safety net" (ch098.5 framing) to "rehearsal stage" — explicitly stated early; later lessons can reference this reframe without re-deriving it.
- Running example: `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`); ch100 uses a different example (subtotal/tax) to avoid pre-spoiling the project.
