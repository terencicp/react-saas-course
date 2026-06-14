# Which migrations need the cadence

- Title: Which migrations need the cadence
- Sidebar label: When the cadence applies

## Lesson framing

Lesson 1 taught the expand-migrate-contract cadence as a *capability*. This lesson is the *decision*: most schema changes don't need three deploys, and the senior skill is reading a schema diff and routing it correctly in seconds. This is a **Decision** lesson — the load-bearing artifacts are (1) a trigger map sorting change types into one-deploy vs three-deploy, and (2) a three-question decision tree the student internalizes so they don't memorize the map. Frame both upstream of any SQL: the student already knows *how* to run the cadence; they need to know *when* to spend it.

Pedagogical spine, ordered to minimize cognitive load:

1. **Lead with the cost-asymmetry framing**, not with a taxonomy. The whole lesson exists because the cadence is expensive (three PRs, weeks of calendar) and most changes are cheap. The senior question is "does this change break old code reading the new schema, or new code reading the old?" — that single invariant (recalled from Lesson 1) is the root of the entire decision tree. Open by re-stating it as the lens.

2. **Teach the decision tree before the lists.** Beginners over-fit to lists ("rename = three deploys") and then mis-classify a change the list didn't name. The three-question tree generalizes: (Q1) additive-only? (Q2) does one statement hold a long lock? (Q3) does running code read/write a shape about to disappear? The tree is the durable mental model; the trigger map is its worked output. This inverts the chapter-outline order deliberately and should be noted to downstream agents.

3. **The two locking escape hatches are the lesson's only genuinely new mechanics.** `CONCURRENTLY` (recalled from ch040) and `NOT VALID` → `VALIDATE` (new here, lightly). These convert several would-be-expensive changes into one-deploy changes, which is *why* Q2 has a "redesign, then re-ask" loop rather than a terminal verdict. Teach the lock classes as named primitives only (ACCESS EXCLUSIVE = blocks everything incl. reads; SHARE UPDATE EXCLUSIVE = reads+writes proceed) — do not teach the Postgres locking model. The pedagogical payoff: the student sees that "needs a long lock" and "breaks the old code" are *independent* axes, and a migration can fail either.

4. **The `NOT NULL` promotion is the showcase three-step** because it touches both axes at once (long lock AND old-code-still-writes-nulls) and its safe form (write-on-insert → backfill → `CHECK NOT VALID` → `VALIDATE` → `SET NOT NULL`) is the single most valuable concrete pattern a junior can carry to real production. Give it the most detailed treatment.

5. **Keep the running example continuous with Lesson 1**: `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`). Reuse it so the trigger map's "FK-required column" row lands as "this is the Lesson 1 example, now classified." Do NOT use the ch100 project's example (subtotal/tax) — that pre-spoils the project.

6. **The senior reflex is bias-under-uncertainty.** Close the reasoning with the false-positive/false-negative asymmetry: over-applying the cadence wastes a week; under-applying it is an outage. When unsure, lean toward the cadence. This is the one-sentence takeaway.

The student should leave able to: look at a `drizzle-kit generate` SQL diff and a one-line description of the intent, run the three questions, and state "one PR" or "three PRs" with the reason — and recognize the handful of locking rewrites that look additive but aren't.

## Lesson sections

### Introduction (no header)

Open on the concrete tension: Lesson 1's cadence is real engineering cost — three PRs, three reviews, weeks of soak. Then the pivot: you do *not* pay that for `ADD COLUMN notes text`. Most migrations ship in one deploy. State the lesson's job plainly — give the student a reflex for telling the two apart from a schema diff. Recall the Lesson 1 invariant in one sentence as the lens for everything that follows: *a change is safe in one deploy only if the schema keeps working for both the old code and the new code during the overlap window.* Keep it to ~4 sentences, adult and terse (no "in this lesson we will").

### The two questions hiding in every schema diff

Purpose: establish the two *independent* axes before any classification, so the trigger map later reads as consequence not arbitrary. This is the conceptual core.

- Axis A — **the overlap-window axis** (recalled from Lesson 1): does the change alter a shape the running code reads or writes? Additive shapes (new nullable column, new table, new index) are invisible to old code; destructive/mutating shapes (drop, rename, type-rewrite, NOT NULL) break one fleet or the other.
- Axis B — **the lock axis** (new framing): does the migration's SQL hold a lock that blocks the table long enough to be an outage *by itself*, even with one code version? Two named lock classes, taught as primitives only:
  - `ACCESS EXCLUSIVE` — blocks everything, including `SELECT`. A table rewrite or a non-concurrent index build takes it. Holding it for minutes on a hot table = outage.
  - `SHARE UPDATE EXCLUSIVE` — the "polite" lock; concurrent reads and writes proceed. `CREATE INDEX CONCURRENTLY` and `VALIDATE CONSTRAINT` take it.
- The senior insight to land explicitly: **these axes are orthogonal.** A change can break old code but lock nothing (a rename), lock hard but break nothing (a non-concurrent index on a 10M-row table), both (naive `SET NOT NULL`), or neither (`ADD COLUMN ... NULL`). The trigger map and the locking checklist are *two separate gates* — passing one doesn't pass the other. This pre-empts the watch-out "the trigger map said one PR, so I skipped CONCURRENTLY."

Component: a small 2x2 matrix as the anchor visual. Use a **`<Figure>` wrapping a hand-built HTML+CSS 2x2 grid** (per diagrams INDEX: simple visual aid, color-coded segments → HTML+CSS, not a diagram engine). Axes: "breaks old/new code" (x) × "needs a long lock" (y). One representative example per quadrant (e.g. bottom-left "neither": add nullable column; top-left "lock only": non-concurrent index; bottom-right "code only": rename; top-right "both": naive NOT NULL). Pedagogical goal: make orthogonality visible and give the student a spatial home for every change type the rest of the lesson names. Cap height well under 800px.

Terms for `<Term>`: `ACCESS EXCLUSIVE` (Postgres lock that blocks all access including reads), `SHARE UPDATE EXCLUSIVE` (lighter lock that lets concurrent reads and writes continue). Define inline at first use; no Tooltip needed if defined in prose, but tag them as `<Term>` since they recur.

### The decision tree: three questions in order

Purpose: the durable, generalizable mental model. Taught *before* the trigger map so the student internalizes reasoning over memorization.

- Walk the three questions as prose first, in order, explaining *why this order*:
  - **Q1 — Is the change additive only (does old code keep working untouched)?** Yes → candidate for one PR, fall through to Q2 to check the lock. No → it mutates a live shape; jump toward three deploys (but Q2 may still apply to individual statements).
  - **Q2 — Does any single statement hold `ACCESS EXCLUSIVE` long enough to matter?** This is the *redesign* gate, not a verdict. Index without `CONCURRENTLY`, table-rewriting type change, constraint validation without `NOT VALID` — all take the heavy lock. The senior move: rewrite the migration to the lock-light form (`CONCURRENTLY`, `NOT VALID`+`VALIDATE`) and **re-ask Q1**. Only an unavoidable rewrite (e.g. `int`→`bigint`) escalates to the cadence on lock grounds.
  - **Q3 — Does running code read or write a shape that's about to disappear or change meaning?** Yes → three deploys (expand-migrate-contract). No → one PR. This is the question that actually triggers the cadence; Q1/Q2 filter and reshape before it.
- Emphasize the order is the lesson: a junior who asks Q3 first mis-handles a slow additive index; a junior who asks Q2 first wastes effort lock-proofing a rename that needs the cadence regardless.

Component: render the tree as a **`StateMachineWalker` (`kind="decision"`)** — this is the centerpiece interactive. It forces the student through the questions in the senior's order, one commit at a time, exactly the "lesson lives in the order" use case the component is built for. Do NOT wrap in `<Figure>`.
- Structure: `<Question id="q1-additive">` → branches to `<Question id="q2-lock">` (on "additive") and toward Q3 (on "mutates a shape"). `q2-lock` branches: "no long lock" → `q3-readwrite`; "yes, but avoidable with CONCURRENTLY / NOT VALID" → a `<Leaf>` that says *rewrite the migration to the lock-light form, then re-run from Q1* (model the re-ask as a leaf instructing the loop, since the walker can't truly cycle in decision mode — note this to the builder); "yes, unavoidable rewrite" → `<Leaf verdict="Three deploys — table rewrite">`. `q3-readwrite` branches: "no" → `<Leaf verdict="One PR, ship it">`; "yes" → `<Leaf verdict="Three deploys — expand, migrate, contract">`.
- Leaf bodies: each names a concrete example and the why. The "one PR" leaf lists the additive set; the "three deploys" leaf points forward to "you already know how — Lesson 1."
- Builder note: keep branch labels natural-language ("It's additive — old code is unaware", "It mutates a shape old code reads"). Use `rationale` on the Q2 branches to disambiguate the redesign-vs-escalate split.

### The one-deploy changes: additive and lock-light

Purpose: the concrete "green list" — changes that ship in a single PR. Frame each as *why it passes Q1 (and how it clears Q2 if it would otherwise lock)*.

- New table — old code has no compiled query against it; zero read collision.
- New nullable column, unread by app — pure `ADD COLUMN`; old code unaware, new code writes when ready.
- New nullable column the new code reads — old code unaware; new code reads `null` for historical rows and handles it (`coalesce` or helper default).
- New index — only safe in one PR with `CREATE INDEX CONCURRENTLY` (Q2). Recall ch040 owns the `CONCURRENTLY` hand-edit and the statement-breakpoint; here just name that it's required and *why* (without it, ACCESS EXCLUSIVE blocks writes for the whole build).
- New CHECK or FK constraint via `NOT VALID` then `VALIDATE` — the lock-light two-step (taught in its own subsection below); one PR when existing data already satisfies it.
- New enum value (`ALTER TYPE ... ADD VALUE`) — Postgres 12+ permits it; one PR plus the statement-breakpoint marker (recall ch040).

Component: a `Code` block showing 3-4 representative one-PR migration SQL snippets (the `ADD COLUMN ... NULL`, `CREATE INDEX CONCURRENTLY`, `ALTER TYPE ADD VALUE`), each one line, to anchor "this is what a one-deploy diff looks like." Keep it tight — these are recognition targets, not deep dives. SQL only, no app code.

### The lock-light two-step: NOT VALID then VALIDATE

Purpose: the one genuinely new SQL mechanic in the lesson; the hinge that turns Q2 from a dead-end into a redesign. Give it a dedicated subsection so it's findable and reusable.

- The problem it solves: adding a CHECK or FK constraint the normal way scans the whole table under a lock while it validates — minutes of blocked writes on a big table.
- The two statements:
  1. `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` — applies the constraint to *new* rows only. Instant, no scan, brief lock.
  2. `ALTER TABLE ... VALIDATE CONSTRAINT ...` — scans existing rows, but under `SHARE UPDATE EXCLUSIVE`, so reads and writes keep flowing.
- The semantic distinction to nail (high-value watch-out): **`NOT VALID` ≠ `NOT NULL`.** `NOT VALID` is the "validate later" flag on a constraint; `SET NOT NULL` is a constraint promotion. Same three words feel related, mean different things. Call this out explicitly — it's a classic junior confusion.
- When it's one PR vs cadence: if existing rows already satisfy the constraint, the two-step is one PR. If some rows violate it, you must backfill the violators first (a migrate-style step), so it becomes the cadence.

Component: `CodeVariants` with two tabs — "Naive (locks the table)" showing `ADD CONSTRAINT ... CHECK (...)` with a note that this scans-and-blocks, vs "Lock-light (two statements)" showing the `NOT VALID` + `VALIDATE` pair. The before/after framing is exactly what `CodeVariants` is for, and it makes the lock cost visible by contrast. Each tab's prose names the lock class held.

### The three-deploy changes: the cadence earns its cost

Purpose: the "red list" — changes that must run expand-migrate-contract. Frame each as *why it fails Q3*, and map the trickier ones to how the cadence collapses.

- **Column rename** — the canonical case (the Lesson 1 example). Old fleet reads `customer_name`, new fleet reads `customer_id`; both live in the window. Full three-step.
- **Type change that rewrites the table** — the nuance worth teaching: `varchar(50)` → `text` is metadata-only and free; `int` → `bigint` rewrites the table under ACCESS EXCLUSIVE; `text` → `int` can fail per-row. The cadence applies to anything that *rewrites* (add new-typed column, dual-write, backfill, switch reads, drop old). This is the one case escalated by Q2 (lock) as much as Q3.
- **Dropping a column the running code still reads** — the cadence collapses to a *two-step* ("read-then-drop"): deploy 1 ships code that no longer reads the column; deploy 2 drops it. Expand is empty (no new shape), migrate is "remove the read," contract is the drop. Worth showing because it teaches that the cadence is a *shape*, not always literally three PRs.
- **Adding `NOT NULL` to an existing column** — the showcase (see dedicated subsection below).
- **Adding a foreign-key column that becomes required** — the Lesson 1 example, now fully classified: expand adds `customer_id uuid` nullable with FK `NOT VALID`; migrate dual-writes + backfills + `VALIDATE`s the FK; contract drops `customer_name` and promotes `customer_id` to `NOT NULL`. Note this is the exact shape ch100 walks — name it as the bridge, don't walk it here.
- **Changing the primary key** — named for recognition only; most expensive class, often needs a maintenance window or replica swap; out of scope for the course.

Component: this list is dense; consider a compact `Code` block per the FK-column case showing the three migration filenames + their one-line SQL across the three PRs (expand `ADD COLUMN ... NULL ... REFERENCES ... NOT VALID`; migrate: backfill is app-code, SQL often none; contract `DROP COLUMN customer_name` + `ALTER COLUMN customer_id SET NOT NULL`). This grounds "three PRs" as three concrete diffs. Reuse Lesson 1's `--name` convention (`expand_invoices_customer_id`, etc.).

#### Promoting a column to NOT NULL without locking the table

Purpose: the single most valuable concrete production pattern in the lesson; touches both axes; the safe form is non-obvious and the naive form is a classic outage.

- The trap: `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` does two bad things at once — it *fails* if any existing row is null, and even when it succeeds it takes `ACCESS EXCLUSIVE` and scans the whole table, blocking all access. (Confirmed current: Postgres 12+ behavior.)
- The safe five-move sequence, mapped onto the cadence:
  1. Deploy 1 (expand-ish): application code writes the column on *every* insert/update path — no new nulls are created. (Structural, in the shared mutation path — recall Lesson 1's dual-write discipline.)
  2. Backfill existing nulls to a sensible value (batched, idempotent — recall Lesson 1's backfill discipline; don't re-teach).
  3. `ALTER TABLE ... ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID` — instant.
  4. `ALTER TABLE ... VALIDATE CONSTRAINT ...` — scans under the polite lock; proves no nulls remain.
  5. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` — now **fast**, because Postgres finds the validated CHECK proving no nulls and *skips the table scan*. This is the key mechanic and the payoff of the whole subsection.
- Land the senior insight: the expensive `SET NOT NULL` becomes a cheap metadata flip *because* the validated CHECK did the proving under a light lock. The cadence isn't bureaucracy here — each step removes a different risk.

Component: `AnnotatedCode` over the five-statement/step sequence (mix of app-code-write note + the four SQL statements), stepping the student through one move at a time with the "what risk this removes" explanation per step. This is exactly the "one complex block, focus attention on parts in turn" use case. Alternatively `DiagramSequence` if the builder prefers a scrubbable step-through; `AnnotatedCode` is the default pick.

### The middle list: it depends

Purpose: defeat the "memorize the map" failure mode by showing changes whose answer is conditional — reinforces that the *tree*, not the list, is the tool.

- **Renaming a table** — `ALTER TABLE RENAME TO` is metadata-only and fast (passes Q2), but the app-code window has the same problem as a column rename (fails Q3 *if the table has live writes*). Cadence if hot; a maintenance-window cutover may beat three PRs for a write-rare lookup table.
- **Adding a default to an existing column** — Postgres 11+: `SET DEFAULT` is metadata-only (historical rows unchanged, future inserts get it). One PR. Senior reflex: confirm the Postgres version supports the fast path (the course's Neon is current, so it's the default). Older Postgres rewrote the table.
- **Removing a default** — metadata only, one PR.
- **Tightening a CHECK constraint** — one PR via `NOT VALID`+`VALIDATE` if all existing rows already pass; the cadence (backfill violators first) if some fail. Ties back to the two-step subsection.

Component: this is the ideal spot for the **classification exercise** (see below) — the middle list proves the student must reason, not recall.

### Reading the Drizzle diff to route the PR

Purpose: connect the abstract tree to the artifact the student actually sees — the `drizzle-kit generate` output. This is where the decision happens in practice.

- The generated `migration.sql` *is* the diff; reading it answers Q1 and Q2 directly (you can see `ADD COLUMN` vs `DROP COLUMN`, see whether `CONCURRENTLY` is present, see a type change).
- The rename disambiguation (recall ch040): when Drizzle Kit emits a `DROP COLUMN` next to an `ADD COLUMN` of similar shape, that's the prompt to decide rename-vs-remove-and-add — and a true rename routes through the cadence. The reviewer recognizes the shape and routes accordingly.
- Recall the convention (don't re-teach): `drizzle-kit generate --name <verb>_<noun>`, never `push` in prod, always read the generated SQL. Cross-reference ch040 for mechanics.

Component: the **`CodeReview` exercise** fits naturally here — show a small PR diff (a generated `migration.sql` plus a one-line app-code change) where the plant is "this is a rename shipped as a single `DROP`+`ADD` in one PR" (the canonical Q3 miss) and/or "non-concurrent index on a large table" (the Q2 miss). The student leaves an inline comment; the kernel names the defect. This exercises *reading a real diff to route it* — the actual job. See exercises below for the kernel phrasing.

### Tooling that automates the cadence (and why we don't reach for it)

Purpose: name the alternative so the student knows it exists, then justify the course default. Short — one tool, named and dropped.

- **pgroll** (open-source, Apache-2.0, from Xata): runs both schema versions side-by-side via Postgres *views*, so old and new code each see the schema they expect, and handles the expand/contract choreography (and lock-safe backfills) automatically. Reach for it if a team runs many cadence-class migrations a quarter and wants the choreography off their plate.
- Course default: hand-rolled cadence with Drizzle Kit. The *discipline* is the lesson; one more tool is one tool too many for the course's minimum-viable stack. Named so the student recognizes it in the wild.
- `<Aside type="note">` is the right container — this is a sidebar, not core path. Include an `ExternalResource`/`LinkCard` to the pgroll repo or Xata's expand-contract post.

### The senior call: bias toward the cadence when unsure

Purpose: the closing synthesis and the one-sentence takeaway.

- The cost-of-error asymmetry, stated plainly: a **false positive** (running the cadence on a change that didn't need it) costs a week of calendar time and some review effort — no production damage. A **false negative** (shipping a rename or drop in one deploy) is an outage during the cutover. The downside is wildly lopsided.
- The reflex that follows: when the three questions don't give a confident answer, treat the change as cadence-class. The cost of being wrong toward caution is bounded; the cost of being wrong toward speed is not.
- Reinforce the orthogonality once more: the trigger map (Q1/Q3) and the locking checklist (Q2) are independent gates — a senior runs both, every time.
- The "during the window" watch-out as a closing sharpener: "no one will hit this table during the deploy" is the famous-last-words version of the false negative — the cutover is *exactly* when cron jobs, ops scripts, and staging tools touch it.

## Exercises

Place exercises at the section they reinforce, not bundled at the end.

1. **`Buckets` (two-column) — classify the change** (in or right after "The middle list"). Two buckets: "One PR" and "Three deploys (cadence)". Items drawn from all three lists so the student must apply the tree, including a couple of middle-list items framed with their disambiguating condition (e.g. "Rename a table that takes live writes", "Add a default to a column (current Postgres)"). Goal: check the student can route a change. Grading: each item's `bucket` is its correct class; middle-list items phrased to have a determinate answer given the stated condition. ~8-10 items.

2. **`CodeReview` — route the PR from its diff** (in "Reading the Drizzle diff"). One or two `<ReviewFile>`s: a generated `migration.sql` and optionally the matching app-code change. Plants (kernels):
   - line on the `DROP customer_name` + `ADD customer_id` pair → kernel: "this is a column rename shipped in one PR; old code still reads `customer_name` during the overlap window — needs expand-migrate-contract".
   - line on a `CREATE INDEX` (no `CONCURRENTLY`) → kernel: "non-concurrent index build takes ACCESS EXCLUSIVE and blocks writes for the whole build; add `CONCURRENTLY`".
   Goal: exercise reading-the-diff-to-route, the lesson's real-world action. `<ReviewWhy>`: the two plants are the Q3 and Q2 misses respectively — two independent gates, both failed in one PR.

3. Optional **`StateMachineWalker`** already serves as the active "exercise" for the tree itself (the student walks it). No separate quiz-style check needed there.

## Scope

Prerequisites to recall briefly (do not re-teach):
- The expand-migrate-contract cadence, the overlap window, dual-write, batched/idempotent backfill, dual-read fall-through, forward-only rollback — all from **Lesson 1 of this chapter**. This lesson decides *when* to apply them; Lesson 1 owns *how*.
- The Vercel alias-swap + function-warmup overlap window — **ch098 lesson 1**, recalled in one sentence as the reason the invariant exists.
- `drizzle-kit generate`/`migrate`, forward-only, never `push` in prod, the `--name` convention, reading generated SQL — **ch040 lesson 1**. Recall, cross-reference.
- `CREATE INDEX CONCURRENTLY`, statement-breakpoints, the five-question SQL review checklist — **ch040 lesson 2**. Name `CONCURRENTLY` as a required escape hatch; do NOT re-teach the hand-edit or breakpoint mechanics.
- `tenantDb(orgId)`, `dbUnpooled`, `db/queries/` — Unit 10 conventions; appear only as incidental context in code samples.

Explicitly out of scope (defer, don't teach):
- The cadence itself — **Lesson 1**.
- Rehearsing migrations on a Neon preview branch, backfill timing extrapolation — **Lesson 3 of this chapter**.
- The Postgres locking model at depth — treat ACCESS EXCLUSIVE / SHARE UPDATE EXCLUSIVE as named primitives only; no lock-conflict matrix, no MVCC.
- pgroll setup/config — named once as the automation alternative, not walked.
- Background-job backfills at scale (Trigger.dev) — **Unit 12**; named only where a million-row backfill would push a constraint validation past one PR.
- FK reference design (cascade behaviors, indexed FKs) — **ch037/ch039**.
- The ch100 project's hands-on full-cadence walkthrough — **ch100**; the FK-required-column row names it as the bridge but does not walk it.
- Wall-clock soak pacing between deploys — **Lesson 1** territory; not repeated here.

## Notes for downstream agents

- The chapter outline lists the trigger map *before* the decision tree; this outline deliberately inverts that (tree-first) to teach the generalizable model before its worked output. Honor the inverted order.
- `StateMachineWalker` decision mode can't truly cycle, so model Q2's "redesign and re-ask Q1" as a `<Leaf>` whose body instructs the loop verbally. This is a known constraint of the component, not a content gap.
- Keep the running example (`customer_name` → `customer_id` FK) identical to Lesson 1's; never introduce the ch100 subtotal/tax example.
- Treat the two lock classes as `<Term>`-tagged named primitives; resist any urge to expand into a locking-model section (out of scope).
