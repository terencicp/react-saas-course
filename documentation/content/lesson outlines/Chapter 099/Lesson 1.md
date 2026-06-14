# Lesson outline — Chapter 099, Lesson 1

## Lesson title

- **Title:** Expand, migrate, contract
- **Sidebar label:** Expand, migrate, contract

## Lesson framing

This is a **concept + pattern** lesson. The load-bearing deliverable is one mental model: the three-deploy cadence (expand → migrate → contract) that lets a breaking schema change ship without an outage. No new tooling, no setup — the student already knows the Drizzle `generate`/`migrate` loop (ch040), Vercel's alias-swap deploy (ch098.1), and server actions mutating Drizzle (Unit 6). This lesson reframes those known pieces around a new problem.

**The senior question that opens the lesson (state implicitly, never as a header):** a live app always has a request mid-flight against the database. A migration that changes the *shape* the app expects — drops, renames, or tightens a column — breaks some of those requests in the seconds the deploy and migration are racing. How do you change the shape without that window ever existing?

**The one root cause everything hangs off — teach it first, simplified, before any cadence step.** The deploy is not atomic with the migration. Vercel's alias swap is atomic, but the function pool warms over seconds; for a window, *both* code versions hit the *same* database. This is the constraint. The entire cadence is the consequence of refusing to ever let the schema break either live code version. If the student leaves with only one idea, it's this one. Everything else is derivation.

**Cognitive-load plan (simple → complex).** (1) Establish the race window with a small visual — two function fleets, one database, a window where both are live. (2) Derive the invariant: the schema must satisfy *both* code versions during that window. (3) Only then introduce the three steps, each as a direct answer to "how do we keep both versions working?" Expand = add new shape, both work. Migrate = dual-write/backfill/dual-read, both still work. Contract = old shape now unread, safe to drop. (4) Layer the supporting patterns (dual-write, backfill batching, dual-read fall-through, the optional feature flag) inside the migrate step where they belong, not as a separate parade.

**The mental model the student ends with.** A breaking schema change is never one event; it's a *forward-only sequence of states*, where every intermediate state is fully runnable on the previous deploy. The old shape and the new shape coexist on purpose, and the coexistence is the safety. "Three PRs, three reviews, weeks of calendar" is the cost; the calendar is the safety margin, not theatre. Rollback (ch098.7) is the cure; the cadence is the prevention — and instant rollback does *not* undo a forward-only migration, which is exactly why each step must leave production runnable on the prior deploy.

**What the student can do at the end.** Explain why a one-shot rename is an outage; name the three steps and what each PR contains; write a structural dual-write inside a server action; write a bounded, idempotent backfill; reason about which step is reversible by `git revert` and which is a data-recovery problem.

**Where beginners go wrong (seed these as watch-outs in-section, not bundled).** Believing the alias swap is atomic with the migration; skipping dual-write because "the backfill is quick"; making the backfill one giant transaction (table lock, dead app); dropping the old column in the same PR as the rename (the canonical "I broke prod"); bundling the dual-write with three other features so `git revert` is no longer sane.

**Scope guard, stated up front to downstream agents.** This lesson teaches the cadence as a *general pattern*. It must NOT teach *which* migrations need it (that's lesson 2's trigger map — only gesture at "some changes need this, some don't, next lesson tells you which") and must NOT teach *how to rehearse it on a Neon branch* (lesson 3). It must NOT walk the chapter-100 invoices project step by step. Use a single running example throughout — renaming `invoices.customer_name` to a FK `invoices.customer_id` — but keep it illustrative, not a project build.

**Code's role.** Code is illustrative of decisions, kept short. The three migration SQL snippets (one per step) and the dual-write/backfill TS shapes are the only code. No exercises that require a live DB or the full app — use a guided ordering/decision exercise instead.

## Lesson sections

### Introduction (no header — lesson intro prose)

Open with the concrete failure: a teammate renames a column, runs the migration on deploy, and for ninety seconds half the app 500s. Connect to what they know — they shipped to Vercel last chapter (ch098) and learned the alias swap; they learned the `generate`/`migrate` loop back in ch040. ch040 named "expand-backfill-contract" once, in passing, as a reflex; this chapter cashes it in. Preview the payoff: by the end they'll hold the three-deploy model that makes a rename a non-event. Keep it warm and brief, two short paragraphs.

### The deploy and the migration are not the same moment

The root-cause section. Goal: install the race window before any solution.

- Recall from ch098.1: a Vercel production deploy is an **atomic alias swap** — the domain points at the new immutable deployment instantly. Restate concisely (this is prerequisite, not new).
- The crucial gap: atomic *alias swap* ≠ atomic *cutover*. The function pool warms over seconds-to-minutes. During that window the **v1 fleet** (old code) and the **v2 fleet** (new code) are *both serving requests against the one shared database*.
- Strengthen the point with a current Vercel fact (verified June 2026): the overlap isn't only incidental warmup — Vercel's **Rolling Releases** can *deliberately* serve a fraction of traffic to the new deployment while the rest stays on the old one, for as long as the team chooses. So in 2026 the "both versions live at once" window can be an *intentional, extended* state, not just a few seconds. This makes the invariant below stronger, not weaker. Mention in one sentence; don't teach rolling releases as a feature (that's deployment-model territory, ch098). Tooltip: `Rolling Releases` (Term — "Vercel feature that routes a configurable share of traffic to the new deployment before promoting it to 100%").
- The migration is a *separate* event from the swap — it runs as part of the build/deploy, committing to the database at a single instant. So there is necessarily a window where new code meets old schema or old code meets new schema.
- Drive the contradiction with the rename: old code `SELECT customer_name`, new code `SELECT customer_id`. If the migration runs *before* the swap, v1 reads fail. If *after*, v2 reads fail. There is no ordering of one migration + one swap that satisfies both fleets.
- Land the invariant in one bolded sentence: **during the window, the schema must be valid for every code version that is live.** That single constraint generates the entire cadence.

**Diagram — "The overlap window" (DiagramSequence, 3 steps).** Pedagogical goal: make the abstract "window" concrete and temporal so the student *sees* the moment both fleets touch one DB. Horizontal timeline, capped height.
- Step 1: alias points at v1; v1 fleet → DB (old schema). Single clean path.
- Step 2: alias swaps to v2; v2 fleet spinning up while v1 fleet still draining — **both** fleets → the **same** DB. Highlight this overlap band as the danger zone. Caption: "For these seconds, both code versions share one database."
- Step 3: v1 fully drained; only v2 → DB. Caption ties back: the migration committed somewhere across steps 1–3, so the schema had to be readable by whichever fleets were live.
Author as simple labeled HTML boxes/arrows inside each `DiagramStep` (two fleet boxes, one DB cylinder, arrows). No engine needed beyond styled divs. Reason for DiagramSequence over a static figure: the *temporality* (swap, overlap, drain) is the whole point and a scrubber makes the overlap legible without three stacked images.

Watch-out inline (Aside, caution): "The alias swap is instant; the cutover is not. Treating them as the same moment is the root mistake this whole chapter exists to correct."

Tooltip terms here: `alias swap` (Term — "Vercel points the production domain at a new immutable deployment; instantaneous, ch098"), `function pool` / `fleet` (Term — "the set of serverless instances serving your code; the new set warms over seconds while the old set drains").

### Three deploys, one safe path

Bridge section that names the cadence as the answer to the invariant, before detailing each step. Keep short — this is the map, the next three subsections are the territory.

- Reframe: since no single migration can satisfy both fleets, split the change across **three deploys**, where every intermediate database state is valid for the code that is live at that moment.
- Name the three, one line each, as answers to "how do both versions keep working?":
  - **Expand** — add the new shape *alongside* the old; old code is untouched, new shape is unused.
  - **Migrate** — app code dual-writes both shapes and reads new-with-fallback; a backfill fills history; both shapes now hold the truth.
  - **Contract** — once nothing reads the old shape, drop it.
- Foreshadow the cost honestly (one sentence): three PRs, three reviews, often one-to-three weeks calendar. The next lesson decides *when* the cost is worth paying; this lesson assumes it is.
- One-sentence forward pointer to lesson 2 ("not every change needs all three — that's the next lesson") so the student isn't left thinking every `ADD COLUMN` is a three-week affair.

**Diagram — "The cadence at a glance" (Figure, simple HTML).** Pedagogical goal: a single horizontal three-panel strip the student can hold in working memory for the rest of the lesson — Expand | Migrate | Contract, each panel showing the schema state (old-only → both → new-only) and a one-word app-code state (unchanged → dual-write → cleaned up). This is the spine all later sections refer back to. Plain styled HTML columns inside `<Figure>`; cap height. Keep it deliberately minimal — it's a memory anchor, not a detailed diagram.

### Expand — add the new shape, break nothing

First deploy. Goal: additive-only, old code completely undisturbed.

- The rule: **additive only, never destructive.** New *nullable* column, new table, or new (concurrently-built) index. Nothing the old code reads changes.
- Why old code is safe: the new column is nullable so existing inserts still satisfy the schema; the old code never names the new column, so it can't be surprised by it.
- What the PR contains: the `db/schema.ts` edit, the generated migration SQL, and **ideally no application-code change at all**. After this deploy, v1 code runs against a schema that carries *both* shapes.
- The migration SQL (single short `Code` block, sql): `ALTER TABLE invoices ADD COLUMN customer_id uuid REFERENCES customers(id);` — emphasize **nullable, no `NOT NULL`**. Note the FK can be added here in non-validating form, but defer the `NOT VALID` mechanics to lesson 2 (one sentence: "the FK can be added safely now; the locking-safe details are lesson 2's").
- Reversibility note: rolling back expand is cheap — `git revert` the (empty) app changes plus a forward-fix migration that drops the unread new column. Plant the forward-only idea here without yet over-explaining it (full treatment in the rollback section).

Connect to ch040: this is still the ordinary `drizzle-kit generate --name expand_… → review → migrate` loop — restate the convention (named migration, never `push` in prod, review the generated SQL) in one sentence, don't re-teach it.

### Migrate — dual-write, backfill, dual-read

Second deploy and the conceptual heart. Goal: make the system correct against *either* schema state. This subsection carries three nested patterns — present them in the order data flows: write path (dual-write), then history (backfill), then read path (dual-read).

Lead: after expand, the new column exists but is empty for every historical row and for any row written by code that doesn't know about it. The migrate deploy fixes both: new writes hit both columns, and a backfill fills the past. **At the end of migrate, both columns hold the truth — this is the safety the cadence buys.**

#### Dual-write: the write path that feeds both columns

- The pattern: inside the server action (or `db/queries` mutation helper) that already mutates the row, write **both** columns in the **same** statement. Drizzle's `insert`/`update` simply take both fields.
- The key insight — **structural, not opt-in.** The dual-write lives in the one code path the app already uses for that mutation, so every mutation hits both columns whether or not the developer remembers. If dual-write were a thing you "remember to also do," a missed call site silently rots a row.
- Born to be deleted: this code exists only until contract removes it. Frame it as scaffolding from day one.
- Code: an `AnnotatedCode` (ts) over a small `createInvoice`/`updateInvoice` server action showing the five-seam shape collapsed to the relevant bit, highlighting the line that sets *both* `customerName` and `customerId`. Steps: (1) the action shape (parse→authorize→mutate), brief; (2) the mutate line writing both fields, colored green, "one statement, both columns"; (3) note this is the *only* place the row is mutated, so dual-write is guaranteed. Reason for AnnotatedCode: focus the student on the single dual-write line inside otherwise-familiar action code without a wall of prose.
- Honor conventions: action follows `parse → authorize → mutate → revalidate → return`; mutation via `db`/`tx`; tenant scoping via `tenantDb(orgId)` shown or referenced (keep minimal — don't re-teach the wrapper). Note to downstream: it's fine to elide `authedAction`/full Zod to keep focus on dual-write; say so.

Watch-out inline (caution): skipping dual-write because "the backfill is quick" — any write to the old column in the gap between backfill and contract leaves a row inconsistent. Dual-write is what makes the backfill a *one-time* job rather than a race.

#### The backfill: bounded, batched, idempotent

- Purpose: populate the new column for historical rows the dual-write will never touch.
- Three properties, taught as a checklist:
  - **Bounded/batched** — update in batches of ~1,000–10,000 rows, not one transaction. A single `UPDATE` over millions of rows holds a lock and can freeze the app. Loop in batches, each its own transaction.
  - **Idempotent** — guard with `WHERE customer_id IS NULL` so re-running doesn't double-process and a crash mid-run is resumable. Running it twice is a no-op on already-filled rows.
  - **Run from where** — a one-shot `scripts/backfill_customer_ids.ts` run from the dev machine against the **unpooled** connection (`dbUnpooled`) for small/medium datasets. For millions of rows where the work must be observable and resumable, reach for Trigger.dev (Unit 12) — name it, don't teach it.
- Code: short `Code` (ts) of a batched, idempotent backfill loop — `WHERE customer_id IS NULL`, `LIMIT 5000`, loop until zero rows affected. Keep it ~12 lines. Mention `dbUnpooled` and `scripts/` naming per conventions.
- One sentence connecting to lesson 3: "you'll rehearse this backfill's timing on a production-shaped branch before you run it for real" — pointer only.

Watch-out inline (caution): the single-transaction backfill is the classic table-lock outage; batching is non-negotiable on any real table.

#### Dual-read: the fall-through while history catches up

- The problem: while the backfill runs, some rows have `customer_id`, some still only have `customer_name`. The read path must return a consistent value either way.
- The pattern: `coalesce(customer_id-derived value, customer_name)` — or an explicit null-branch — in the **query helper** (`db/queries/…`), so it's defined once, not scattered across call sites.
- Lifespan: removed in contract, like the dual-write.
- Code: a one-or-two-line `Code` (ts/sql) showing the coalesce in the read helper. Keep tiny.
- Optional feature-flag lever (brief, one short paragraph): when the new column powers a *new feature* (not just a renamed value), gate the *read* path behind a PostHog flag (ch093). The flag enables staged rollout and is the fastest rollback if the new data has a quality issue. Flag is deleted at/after contract. Keep this clearly optional — "a fourth lever you reach for when the change is also a behavior change," with a forward nod that lesson 2 separates schema-change from behavior-change concerns. Tooltip: `feature flag` (Term — "a runtime switch that turns behavior on/off without a deploy, ch093").

Close the migrate section by restating the win: **the system is now correct against either schema state, and reversible by `git revert` because the old column still holds the truth.**

### Contract — drop the old shape once it's unread

Third deploy. Goal: remove the scaffolding, return the schema to a single clean shape.

- Precondition (state it as a gate): contract is safe **only after** the new code has been live long enough that nothing reads the old shape — no live function reads it, no cron, no script, no integration. (Lesson 3 owns *verifying* this; here, state it as the precondition.)
- What the PR contains: the schema edit dropping the old column, the generated SQL with `DROP COLUMN` (and any `SET NOT NULL` promotion on the new column), and the **app-code cleanup** that deletes the dual-write and the dual-read fall-through.
- The migration SQL (short `Code`, sql): `ALTER TABLE invoices DROP COLUMN customer_name;` plus `ALTER TABLE invoices ALTER COLUMN customer_id SET NOT NULL;`. Note the `NOT NULL` promotion is now safe because the backfill + dual-write guarantee no nulls remain (the locking-safe ordering of `NOT NULL` is lesson 2 — one-sentence pointer).
- The asymmetry that makes contract special: this is the **only irreversible step**. `git revert` won't bring back dropped bytes. Rollback past contract is a *data-recovery* problem (re-add the column, backfill from a known source), not a deploy problem. This is why contract goes last and only after certainty.

Watch-out inline (danger): dropping the old column in the *same PR* as introducing the new one is the canonical "I broke prod" pattern from ch040.2 — it collapses three states into one and recreates the exact race the cadence removes.

### Forward-only, and what rollback can and cannot undo

Synthesis section tying the cadence to the rollback model from ch098.7. Goal: correct the likely misconception that "we have instant rollback, so why all this care?"

- Restate forward-only (from ch040): no down migrations. Each step is a *forward* migration that leaves the system runnable. Rolling "back" is rolling *forward* to a safe state.
- Map rollback per step (this is the payoff table):
  - **Expand** → `git revert` the (empty) app PR + forward-fix migration dropping the unread new column. Cheap.
  - **Migrate** → `git revert` the app PR. The data in the new column is harmless; reads fall through to the old column which still holds the truth. No migration needed.
  - **Contract** → not reversible by deploy. Forward-fix re-creates the column and backfills from a known source. Expensive, rare.
- The senior line, bolded: **instant rollback (ch098.7) re-promotes a deployment; it does not un-drop a column.** The cadence is the prevention precisely because the cure doesn't reach a forward-only migration. Every step earns its place by keeping production runnable on the *previous* deploy.

**Diagram — "Reversibility across the cadence" (Figure, simple HTML or reuse the three-panel strip with a reversibility row added).** Pedagogical goal: a one-glance summary mapping each step to its rollback cost (green/cheap, green/cheap, red/data-recovery). Could be a small three-column table styled in `<Figure>`. This is the artifact the student screenshots.

Watch-out inline (caution): the cadence makes each step reversible *only if each PR is small enough that `git revert` is sane.* Bundling the dual-write with three unrelated feature changes erases the reversibility — keep each cadence PR focused.

### When the cadence isn't enough

Short honesty section so the student doesn't equate "the cadence shipped" with "the change is safe." Two named-and-deferred cases, one line each:
- **A behavior change rides along with the schema change** — the cadence handles the schema; the *behavior* needs its own feature-flag rollout plan (ch093). Don't conflate "schema migrated" with "feature safely live."
- **The migration also has to repair wrong existing data** — then the backfill becomes a *data migration* with its own correctness story (verifying values, not just presence). Out of scope here.
Frame these as "the cadence solves the shape problem; these are different problems wearing the same clothes." Keep tight; both are genuinely out of scope, named only for recognition.

### Practice: order the cadence (exercise)

Goal: check that the student internalized the *sequence and the reasoning*, not just memorized three words. Place at the end of the body.

**Primary exercise — `Sequence` (ordering drill).** Present a scrambled list of ~7 cadence steps mixing all three deploys, e.g.: "add nullable `customer_id`", "dual-write both columns in the action", "run the batched backfill", "switch reads to coalesce(new, old)", "wait until old shape is unread", "drop `customer_name`", "promote `customer_id` to NOT NULL". Student drags into correct order. Grading: exact order. This directly exercises the temporal mental model, which is the lesson's whole point. Use `Sequence` (no live DB needed — fits the "no full-app exercise" constraint).

**Secondary check — `MultipleChoice` (one or two questions).** Targeted at the root misconception:
- Q1: "A teammate ships a column rename in a single PR — schema and code together — reasoning the deploy is instant. What happens during the deploy window?" Correct: both fleets hit one DB; one fleet's reads break. Distractors: nothing (deploy is atomic), only the new code runs, the migration waits for the swap.
- Q2 (optional): "Which cadence step is the only one that can't be undone by `git revert` + re-promote?" Correct: contract. Distractors: expand, migrate, all of them.

Reason for these over live coding: this lesson is conceptual; a `DrizzleCoding`/`SQLCoding` sandbox can't model a multi-deploy timeline, and `ReactCoding` can't load the app. Ordering + targeted MCQ assess the actual learning objective (the mental model) better than syntax practice. No custom component needed.

### External resources (optional)

One or two `ExternalResource` cards if a high-quality, current source exists — e.g. the PlanetScale/Xata-style "expand-contract" / "online schema change" write-ups, or the Postgres docs on safe DDL. Keep to genuinely authoritative, recent links. A short explainer **VideoCallout** could support the overlap-window idea if a good, current one exists (verify in fact-check step); skip if nothing strong — the diagrams already carry the concept.

## Scope

**This lesson teaches:** the *why* (deploy ≠ migration race), the three-step cadence as a general pattern, and the supporting app-code patterns (dual-write, batched/idempotent backfill, dual-read fall-through, optional feature flag), plus the forward-only rollback mapping per step.

**Explicitly NOT in this lesson (defer, with at most a one-sentence pointer):**
- **Which migrations need the cadence** — the trigger map, the three-question decision tree, the one-deploy additive list, the `NOT VALID`/`VALIDATE` and `CONCURRENTLY` locking-safe mechanics, `pgroll`. All lesson 2 of chapter 099. This lesson assumes the change *does* need the cadence and gestures once that "not all do."
- **Rehearsing on a Neon preview branch** — the four-check rehearsal, dual-write verification in Studio, backfill timing extrapolation, lock-contention rehearsal, the CI gate's role, data-integrity diffs. All lesson 3 of chapter 099.
- **The chapter-100 project** — the hands-on subtotal/tax-column walkthrough. Use a *different* running example (`customer_name` → `customer_id`) so this lesson doesn't pre-spoil the project.
- **Drizzle Kit mechanics / the daily generate→migrate loop** — chapter 040 lesson 1. Restate in one sentence as prerequisite, never re-teach.
- **The five-question SQL review checklist and `CREATE INDEX CONCURRENTLY` hand-edit** — chapter 040 lesson 2.
- **Vercel's deployment model and the alias swap in depth** — chapter 098 lesson 1. Recall concisely; the function-warmup window is the one piece this lesson leans on.
- **Two-layer rollback in depth** — chapter 098 lesson 7. This lesson uses its conclusion (instant rollback re-promotes a deploy) to make the forward-only point; it doesn't re-teach the rollback mechanics.
- **Feature flags at depth** — chapter 093 lesson 5. Named as an optional lever only.
- **Background-job backfills at scale (Trigger.dev)** — Unit 12. Named as the reach for million-row backfills only.
- **Server Actions and the Drizzle-mutation seam in depth** — Unit 6 / conventions. The dual-write code rides on the known action shape; don't re-teach the seam.
- **Postgres locking model** — out of scope; lock behavior is lesson 2's concern and even there only as named primitives.

**Prerequisites to restate concisely (one line each, not re-taught):** Vercel alias-swap deploy + preview deployments (ch098); Drizzle `generate`/`migrate`, forward-only, never `push` in prod (ch040); server action five-seam shape mutating Drizzle (Unit 6); UUIDv7 FK columns (ch037).
