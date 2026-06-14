# Lesson outline — Chapter 099, Lesson 3

## Lesson title

- **Title:** Rehearsing on a Neon preview branch
- **Sidebar label:** Rehearse on a preview branch

## Lesson framing

This is a **setup/wiring + pattern** lesson. The chapter taught a dangerous skill across L1 (the expand-migrate-contract cadence) and L2 (which migrations need it). L3 is the safety net that catches a mistake *before merge*: every cadence step is a hypothesis ("the migration applies cleanly, the app works while both schemas coexist, the backfill finishes in a sane window"), and the hypothesis gets tested against a copy-on-write Neon branch of production data (ch098.5) before the PR merges. No new framework — the student already owns the cadence (L1), the trigger map (L2), the Neon preview-branch wiring (ch098.5), and the CI gate (ch097). This lesson composes those into a repeatable rehearsal discipline.

**The senior question that opens the lesson (state implicitly, never as a header):** you wrote a cadence step and reviewed the SQL — but reviewed SQL is a *belief*, not a *fact*. How do you turn each cadence step from "this should be safe" into "I watched it run safely against production-shaped data" without ever touching production?

**The load-bearing deliverable.** A four-check rehearsal checklist the student runs on *each* cadence step (expand, migrate, contract independently), plus the senior reflex that the rehearsal is **necessary but not sufficient** — there is a named list of failure modes the rehearsal *catches* and a named list it *can't*. If the student leaves with two things: (1) the rehearsal loop is per-step, not once-per-feature, and (2) "the preview's migration worked" never licenses skipping the production canary-and-watch discipline.

**The one mental shift this lesson installs.** ch098.5 wired the preview branch as a *safety* feature (a test insert can't pollute prod). This lesson reframes the *same* branch as a *rehearsal stage*: the most production-like environment that is cheap to break, where you deliberately run the scary migration first. Same wiring, new job. State this reframe explicitly early — the student already has the branch; this lesson teaches what to *do* with it for migrations.

**Cognitive-load plan (simple → complex).** (1) Recall the branch and reframe it as a rehearsal stage. (2) Distinguish what the build does *automatically* (runs `db:migrate` against the branch — one verification, free) from what the developer must verify *manually* (correctness, which no build step checks). (3) Teach the four-check checklist as the manual core. (4) Layer the three deeper rehearsals that only some migrations need (backfill timing extrapolation, lock-contention under synthetic load, the data-integrity value diff) as reach-for-it escalations, not defaults. (5) Map each cadence step's specific failure mode to the check that catches it. (6) Close honestly with what the rehearsal can't catch and the production handoff.

**The mental model the student ends with.** Two concentric safety rings around a migration: the **automatic ring** (the build's `db:migrate` run + the CI typecheck/test gate — proves the SQL *applies* and the typed code still *compiles*) and the **manual ring** (the developer walking the preview URL and querying the branch directly — proves the change is *correct*). The type system catches every dropped-column read that goes through Drizzle's typed query builder; raw SQL, external integrations, and *value* correctness slip through and need eyes. The rehearsal is a fair copy of the production run, so promotion to prod is a repeat — but production has real traffic, real long transactions, and post-branch data the snapshot missed, so the high-stakes migration still gets a low-traffic window and a watched Sentry/Neon dashboard.

**What the student can do at the end.** Run the four-check rehearsal on any cadence step; inspect a dual-write by querying both columns on a row mutated through the preview URL; time a backfill on the branch and extrapolate to production row counts; write the two data-integrity audit queries (null-count, value-mismatch); name which failure modes the rehearsal catches and which it can't; and know when a migration warrants the synthetic-load lock rehearsal.

**Where beginners go wrong (seed as in-section watch-outs, never bundled).** Trusting the build's green migration step as the *only* verification (it proves SQL applies, not that the change is correct); rehearsing only the migrate step and skipping expand/contract (each has its own failure mode); skipping the Studio dual-write inspection (the type system never proves the dual-write path is *reached* for every mutation site); assuming "the preview's migration worked, so prod can't fail" (almost always true, but the watch-Sentry discipline is still the rule); reusing a stale preview branch after `main` advanced (the snapshot is from branch-creation time).

**Scope guard, stated up front to downstream agents.** This lesson teaches *how to rehearse* the cadence. It must NOT re-teach the cadence itself (L1), NOT re-teach the trigger map (L2), NOT re-teach the Neon preview-branch *wiring* (ch098.5 — recall the integration and the `db:migrate &&` build command in one or two sentences, never re-derive copy-on-write from scratch), and NOT re-teach the CI gate internals (ch097). It must NOT walk the chapter-100 project. Reuse the chapter's running example throughout — the `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`) rename, with the `scripts/backfill_customer_ids.ts` backfill from L1. Do NOT introduce the ch100 subtotal/tax example.

**Code's and figures' roles.** Code is short and procedural: SQL audit queries, a `time pnpm tsx …` timing command, a Studio query, a `neonctl branches create --parent main` command. The heavy lifting is one anchor diagram (the two safety rings / where each failure mode is caught) and the four-check `Checklist`. All Vercel/Neon UI surfaces are **HTML/CSS mocks**, not real screenshots — chapter-wide convention carried from ch098. No live-coding exercise models a multi-deploy rehearsal; the `Checklist` is the assessment vehicle, supported by a `Matching` drill (failure mode → catching check) and a targeted `MultipleChoice`.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open with the gap between belief and fact: in L1 and L2 the student learned to *plan* a safe migration and *review* its SQL, but a reviewed migration is still a hypothesis until it runs against real-shaped data. Connect to what they have: ch098.5 gave every PR a throwaway Neon branch that *is* production's data minus the risk. Reframe in one line — that branch was sold as a safety net; here it becomes a rehearsal stage where you run the scary migration first, on purpose. Preview the payoff: a four-check loop you run on each cadence step so a missed dual-write site or a table-locking backfill surfaces on a preview URL, not in a production incident. Two short paragraphs, warm and brief.

### The preview branch is your rehearsal stage

The reframe section. Goal: convert the student's existing mental model of the preview branch (safety) into the new one (rehearsal) and set up the two rings of verification.

- Recall ch098.5 concisely (prerequisite, not new): the Native Vercel-Neon Integration gives every PR its own copy-on-write branch off `main` (production's branch); it carries production's data — same row counts, same distribution, same indexes — and the preview build runs `pnpm db:migrate && next build`, so the PR's migration applies to *that branch* before the app boots. One short paragraph; do not re-derive copy-on-write.
- The reframe, stated plainly: this is **the most production-like environment that is free to break.** Production-shaped data + isolation = the ideal place to run a migration you're nervous about. Every cadence step gets exercised here before it ever reaches `main`.
- Introduce the two rings (the lesson's spine — name them now, detail them next): the **automatic ring** runs without you (the build's `db:migrate` + the CI gate from ch097); the **manual ring** is what you do by hand (walk the preview URL, query the branch). The automatic ring proves the migration *applies* and the typed code *compiles*; only the manual ring proves the change is *correct*.
- Land the per-step rule early: expand, migrate, and contract are **three separate PRs**, so each gets **its own rehearsal**. "Rehearse the cadence" means "rehearse each step," not "rehearse once."

**Diagram — anchor visual #1, "Two rings of verification" (`Figure`, HTML/CSS).** Pedagogical goal: a single memory anchor the rest of the lesson refers back to — concentric framing showing a migration at the center, an inner *automatic* ring (build `db:migrate` + CI typecheck/test) and an outer *manual* ring (preview URL walk + direct branch queries), with a one-line label on each ring stating what it proves ("applies + compiles" vs "is correct"). Keep it compact and horizontal-friendly per the vertical-space constraint. Reason for a static `Figure` over an animated component: this is a structural relationship the student holds in working memory, not a temporal sequence. `expandable` default is fine (plain HTML survives relocation).

`Term` candidates here: none new — `copy-on-write`, `branch`, `main branch` were all defined in ch098.5; reference them in prose without re-tooltipping.

### What the build checks for free

The automatic ring. Goal: bound what the green build *does* and *doesn't* prove, so the student never mistakes it for the whole rehearsal.

- What runs automatically: the moment the PR's commit lands, Vercel's build runs `db:migrate` against the preview branch (the `db:migrate &&` override from ch098.5). A failure here — bad SQL, type mismatch, lock timeout on the branch — **fails the build, posts to the PR, and never reaches production.** This is the first verification, and it's free.
- The CI gate's half of the automatic ring (recall ch097, don't re-teach): typecheck + tests run against the codebase's *expectations*. The killer property to state explicitly — **Drizzle's typed query builder catches every dropped-column read at compile time.** Once contract drops `customer_name`, the `invoices.customerName` field no longer exists on the inferred type, so every typed read of it is a build error before a human looks. This is why the contract step's "did I miss a read?" is *mostly* answered by the type system.
- The precise boundary, stated as the section's payoff: the automatic ring proves the migration **applies** and the typed code **compiles**. It does **not** prove the app behaves correctly, that the dual-write path is *reached*, that the backfill *finishes in time*, or that the backfilled *values are right*. Those are the manual ring's job — next section. Frame this boundary as the reason a green build is necessary but not sufficient.
- The dependency watch-out (caution Aside): the whole automatic ring depends on the build command actually carrying `pnpm db:migrate &&` (ch098.5). Without it, the preview runs the *new code against the old schema* — exactly the broken state the cadence exists to prevent — and the build goes green while the app 500s. Verify the override is in place before trusting any rehearsal.

`Term` candidates: `__drizzle_migrations` (Term — "the bookkeeping table Drizzle's migrator writes to record which migration files have been applied to a database") — used in the next section's check, define it here at first mention.

### The four-check rehearsal

The manual ring and the lesson's load-bearing artifact. Goal: a repeatable checklist the student runs on *every* cadence step. Teach the four checks as a unit; they apply to each step with step-specific emphasis (drawn out in the failure-mode section later).

Frame as: the build went green, so the SQL applies — now *you* prove it's correct. Four checks, in order.

1. **The migration applied — and matches the PR.** The Vercel build log shows the `db:migrate` step succeeded; the new migration row appears in the branch's `__drizzle_migrations` table; Drizzle Studio (or a `\d invoices` query) confirms the live schema diff matches the PR's SQL — the column is there, the type and nullability are what you intended.
2. **It finished in a reasonable time.** A migration that takes ten minutes against a production-*shaped* branch will take *longer* against production proper — busier, smaller lock windows. If the branch run is slow, the plan needs revisiting: usually a missed `CONCURRENTLY` (L2) or a backfill that should have batched (L1). Slow-on-the-branch is the early warning for slow-on-prod.
3. **The app still works against the new schema.** Open the preview URL and walk the critical paths — list pages render, mutations succeed, dashboard counts match. The branch is fully populated, so a broken query breaks *visibly*. This is the check the type system can't do: it exercises raw SQL, external integrations, and runtime behavior.
4. **The old shape still works where it's supposed to.** For *expand*, query the old column directly in Studio — still readable, still writable (additive change broke nothing). For *migrate*, hit the real code paths via the preview URL — every mutation writes both columns, every read returns the new value if present and the old if not. This check guards the invariant from L1: the schema must satisfy *both* live code versions.

- Code: a short `Code` (sql) block for the check-1 schema confirmation (`SELECT * FROM __drizzle_migrations ORDER BY id DESC LIMIT 1;` and/or a `\d invoices`-style note). Keep it minimal — one or two queries.

**The dual-write inspection (subsection of check 4, the bit students skip).** Goal: make the most-skipped verification concrete because it's the one the type system can't help with.
- The move: through the preview URL, perform a mutation (create/edit an invoice). Then open Studio against the branch and look at that exact row — it should have **both** `customer_name` (old) **and** `customer_id` (new) populated. The dual-write is doing its job.
- The failure it catches: if only one column is populated, the dual-write code path wasn't reached for that mutation site — fix the missed site, push, re-verify. State the why explicitly: **the type system never proves the dual-write path is *reached* for every mutation site** (an `update` that sets only the old column still type-checks). Only a row-level look proves coverage.
- Code: a tiny `Code` (sql) — `SELECT customer_name, customer_id FROM invoices WHERE id = '…';` after the mutation. Keep to one line.

**Diagram — anchor visual #2, "The four checks across the three steps" (`Figure` with a small HTML/CSS grid, OR `TabbedContent` with one tab per cadence step).** Pedagogical goal: show that the *same* four checks apply to each step, with the emphasis shifting (expand emphasizes check 4's "old still works"; migrate emphasizes the dual-write inspection; contract emphasizes check 3's "nothing broke when the old shape vanished"). A compact 3-column (Expand/Migrate/Contract) × 4-row (the checks) grid where each cell notes the step-specific thing to look for. Reason: reinforces the per-step rule visually and prevents the "rehearse once" mistake. If a grid is too dense, `TabbedContent` with three tabs (one per step) each holding the four checks is the fallback — diagram agent's call.

`Term` candidates: `Drizzle Studio` (Term — "Drizzle's browser-based table viewer for inspecting and editing rows in a database; here pointed at the preview branch") if not already a familiar term from Unit 5 — keep it cheap, one line.

### The deeper rehearsals some migrations need

The escalation tier. Goal: three additional rehearsals that are *not* defaults — taught as "reach for these when the change warrants it," matching the course's trigger-before-tool filter. State the threshold for each.

#### Timing the backfill and extrapolating to production

- The move: run the migrate step's backfill against the branch and **time it** — `time pnpm tsx scripts/backfill_customer_ids.ts` (the script from L1). Extrapolate against production row counts: a 200K-row backfill that takes 90 seconds on the branch is *roughly* 900 seconds on a 2M-row production table — a linear first approximation (reality is sub-linear thanks to OS cache, so treat the estimate as a ceiling, not a promise).
- The decision it drives: if the projection exceeds an acceptable window, batch smaller (L1) or move the backfill to Trigger.dev (Unit 12 — named, not taught). Better to discover the multi-hour backfill on the branch than halfway through the production run.
- Threshold: any backfill on a table large enough that "how long will this take?" is a real question. Code: one `Code` (bash) line showing the `time pnpm tsx …` invocation.

#### Lock contention under synthetic load

- The gap this closes: the branch sees *zero real traffic* during a normal rehearsal, so a migration that's slow only *under write contention* looks instant. To rehearse the contention, load the branch with synthetic write traffic — a small script hammering the relevant mutation — *while* the migration runs. If the migration takes a long lock, the writes stall and Neon's metrics show the spike. This catches the "looked fine in dev, stalled prod" failure mode.
- Threshold, stated as the trigger: reach for this only when the target table has write traffic measured in **writes-per-second, not per-minute.** For the vast majority of tables, the plain four-check rehearsal is enough; over-applying synthetic load is wasted effort.
- Connect to L2: this is the empirical companion to L2's lock axis — L2 *reasons* about whether a statement takes `ACCESS EXCLUSIVE`; this *measures* whether that lock actually stalls real writes. Keep code light or omit — describe the synthetic-load script in prose (a loop firing the mutation) rather than a full listing; the technique matters more than the exact script.

#### The data-integrity diff — proving the values are right

- The gap this closes: check 1 proves the column *exists*; the backfill can populate it with **wrong values** and every schema check still passes. Silent corruption. The fix is a value-level audit after the backfill runs on the branch.
- Two audit queries, taught as a pair:
  - **Null-count:** `SELECT count(*) FROM invoices WHERE customer_id IS NULL;` — should be zero after a complete backfill. Proves *completeness*.
  - **Value-match:** `SELECT count(*) FROM invoices i WHERE i.customer_name IS DISTINCT FROM (SELECT c.name FROM customers c WHERE c.id = i.customer_id);` — should be zero if the backfill mapped each invoice to the *correct* customer. Proves *correctness*. (`IS DISTINCT FROM` so nulls compare correctly — note this in one clause.)
- The point, bolded: **a schema that's structurally perfect can still hold wrong data.** The value diff is the only check that catches a backfill that ran cleanly but mapped rows wrong.
- Code: a short `Code` (sql) with both queries. This is the section's load-bearing artifact — keep it tight and copy-pasteable. Threshold: any backfill that *derives* a value (a join, a lookup, a computation), as opposed to a pure column copy.

`Term` candidates: `IS DISTINCT FROM` (Term — "SQL comparison that treats NULL as a normal value, so `NULL IS DISTINCT FROM 5` is true; needed because plain `<>` returns NULL when either side is NULL") — define inline, it's the non-obvious bit of the value-match query.

### Every cadence step fails differently

The synthesis section: map each cadence step's *specific* failure mode to the rehearsal check that catches it. Goal: cement that the rehearsal is per-step by showing each step has a distinct thing that can go wrong. Present as prose walking the three steps, then crystallize in the matching exercise.

- **Expand's failure mode — the new FK rejects valid backfill values.** Adding `customer_id uuid REFERENCES customers(id)` assumes every value the migrate step will write points at a real customer row. The rehearsal catches it because the backfill runs against production-*shaped* data: an FK violation (an invoice whose derived customer doesn't exist) surfaces immediately when the backfill runs on the branch, not in prod. Fix in the migrate PR before merging.
- **Migrate's failure mode #1 — dual-write skips a code path.** Caught by the direct Studio inspection (previous section): a row written through one path has both columns; a row written through a missed path has only the old. The type system can't catch this; the row-level look can.
- **Migrate's failure mode #2 — the backfill takes too long.** Caught by timing it on the branch and extrapolating. The senior reach is batch-smaller or Trigger.dev. Discover it at the preview stage, not mid-production-run.
- **Contract's failure mode — something still reads the old column.** Caught two ways: Drizzle's types catch every *typed* read at compile time (the field is gone); the preview URL catches the rest — raw SQL, external integrations — because dropping the column breaks those reads *visibly* on the page. State the senior move: before merging contract, grep the codebase for the old column name to catch raw-SQL stragglers the types miss.
- **Cross-step failure mode — a CI job still references the old column.** A test fixture or seed script naming `customer_name` after contract fails the CI build; the PR is blocked until tests are updated. This is the ch097 CI gate as the second line of defense behind the type system.

**Exercise — `Matching` (failure mode → catching check).** Goal: directly assess the per-step mapping that is this section's whole point. Left column = failure modes ("dual-write skips a mutation site", "backfill maps rows to the wrong customer", "a destructive migration locks the table", "a raw-SQL query still reads the dropped column", "the FK rejects a backfill value"); right column = the catching check ("direct row inspection in Studio", "the value-match audit query", "synthetic-load lock rehearsal", "walking the preview URL", "running the backfill against production-shaped data"). Reason for `Matching` over MCQ: the learning objective is a many-to-many association, which a matching drill assesses better than isolated questions.

### What the rehearsal can't catch, and the production handoff

The honesty + handoff section. Goal: prevent the "the preview worked, so prod is safe" overconfidence and connect the rehearsal to the actual production run.

- The "can't catch" list, stated plainly (three items):
  - **Production-scale concurrency.** The branch sees zero real traffic during the rehearsal, so a migration slow only under contention can look fast unless you ran the synthetic-load rehearsal — and even that is an approximation of real production load.
  - **Post-branch data.** The branch is a *snapshot* from the moment it was created; rows added to production since then aren't in it. A migration that's fine on the snapshot can hit a value the snapshot never saw.
  - **Long-running production transactions.** A migration can be blocked by a transaction that only exists in production (a slow report, a stuck connection). The branch has no such transactions.
- The senior conclusion, bolded: **the rehearsal is necessary, not sufficient.** For a high-stakes migration, the rehearsal *plus* a low-traffic deploy window *plus* a watched Sentry and Neon dashboard during the run is the discipline. (Sentry/observability is Unit 19 — named, not taught.)
- The handoff, stated as the payoff: once the four checks pass, merge the PR. Vercel re-runs `db:migrate` against production's `main` branch as part of the production build. Because the branch run already validated the migration, **the production run is a repeat** — same SQL, same migration runner, same shape of data, just the real rows this time. Confidence comes from the rehearsal having been a *fair copy*, which is exactly why the branch carrying real production-shaped data matters.
- The stale-branch watch-out (caution Aside): the rehearsal is only fair if the branch's data actually matches production *now*. If `main` advanced significantly since the branch was created (e.g. a recent production backfill populated a column), the snapshot is stale — close and reopen the PR for a fresh branch, or `neonctl branches reset <branch> --parent` to re-sync schema and data from the parent (a full overwrite, like `git reset --hard`). Verified June 2026: the CLI is `neonctl branches reset <id|name> --parent` and `neonctl branches create --parent <name>`.

**The fresh-branch reach (short subsection).** Goal: one escalation for the highest-stakes migration. For the busiest tables, add one step to the rehearsal cycle: take a *fresh* branch off production at the moment the PR is ready (`neonctl branches create --parent main`) so the snapshot is as current as possible, run the cadence step against it under synthetic load, observe. The integration creates a branch on PR *open*; a manual `neonctl` branch can be created at any moment. Reach for this when the first rehearsal raised a question only a current snapshot can answer. Code: one `Code` (bash) line — `neonctl branches create --parent main`. Recall ch098.5's `neonctl` framing in half a sentence (the manual escape hatch); don't re-teach the CLI.

`Term` candidates: none new — `neonctl` was framed in ch098.5; reference in prose.

### Your rehearsal checklist

Close the lesson with the assessment vehicle: the `Checklist` the student ticks while rehearsing their own cadence step. Goal: make the abstract discipline a concrete, tickable gate, mirroring the project-lesson "Moment of truth" pattern.

- A single `Checklist` (give it an `id`), one row per verification, ordered to match the lesson, each row an observable outcome with an `untested` chip where it's a manual check:
  - The preview build's `db:migrate` step is green and the new row is in `__drizzle_migrations`.
  - Studio confirms the live schema matches the PR's SQL (column, type, nullability).
  - The migration finished fast on the branch (no unexpectedly long run).
  - Every critical path on the preview URL still works.
  - The old shape still reads/writes where it should (expand) / both columns populate on a mutation (migrate) / nothing broke when the old shape vanished (contract).
  - (Backfill steps) the backfill's branch timing, extrapolated to production row counts, fits an acceptable window.
  - (Derived backfills) the null-count and value-match audit queries both return zero.
  - CI typecheck + tests are green against the PR.
- State the framing in one line: this checklist is run **per cadence step** — three times across a full expand-migrate-contract change. The last row before merge is always "I watched it run, I didn't just review it."

Reason for `Checklist` as the closer: this is a procedural-discipline lesson; the durable takeaway is a repeatable routine, and a persistent tickable list is the artifact that turns the routine into a habit. It also doubles as the comprehension check (the student can't tick a row they didn't understand).

### External resources (optional)

One or two `ExternalResource` cards only if a genuinely authoritative, current source exists — e.g. Neon's docs on branching for testing/CI, or a write-up on testing migrations against production-shaped data. Skip if nothing strong and recent; the lesson's checklist and diagrams carry the content. No video unless fact-check surfaces a current, high-quality one on rehearsing/testing schema migrations — the topic is niche enough that a forced embed adds little.

---

## Scope

**This lesson teaches:** rehearsing each cadence step on the per-PR Neon branch — the two verification rings (automatic build+CI vs. manual URL-walk+queries), the four-check rehearsal checklist, the dual-write row inspection, the three escalation rehearsals (backfill timing extrapolation, synthetic-load lock contention, the data-integrity value diff), the per-step failure-mode → catching-check mapping, the rehearsal's limits, and the production handoff.

**Explicitly NOT in this lesson (defer, with at most a one-sentence pointer):**
- **The expand-migrate-contract cadence itself** — L1. Recall the three steps and the running example; do not re-teach the cadence or re-derive dual-write/backfill/dual-read patterns. The rehearsal *exercises* L1's artifacts (`scripts/backfill_customer_ids.ts`, the dual-write in the shared mutation path, the `coalesce` dual-read).
- **The trigger map / which migrations need the cadence** — L2. The lock-contention rehearsal *connects* to L2's lock axis but doesn't re-teach the decision tree, the green/red lists, or `NOT VALID`/`CONCURRENTLY` mechanics.
- **The Neon preview-branch wiring** — ch098.5. Recall the integration and the `pnpm db:migrate && next build` build command in one or two sentences; do not re-derive copy-on-write, re-walk the integration install, or re-teach `neonctl`.
- **The CI gate internals (typecheck, lint, test, build)** — ch097. Named as the automatic ring's other half; recalled, not re-taught.
- **Drizzle Kit and the `db:migrate` runner** — ch040 / conventions. The runner is recalled as "the command the build runs"; `generate → review → migrate` (never `push`) is a one-line reminder.
- **Background-job backfills at scale (Trigger.dev)** — Unit 12. Named as the reach for backfills too slow on the branch.
- **Sentry and production observability during the cutover** — Unit 19. Named in the "rehearsal can't catch" conclusion as the production-watch discipline.
- **The chapter-100 project's hands-on full-cadence walkthrough** — ch100. Use the chapter's `customer_name` → `customer_id` example only; do not pre-spoil the project's subtotal/tax example.
- **Postgres locking model at depth** — out of scope; lock classes (`ACCESS EXCLUSIVE`) are named primitives recalled from L2, not re-derived.

**Prerequisites to restate concisely (one line each, not re-taught):** the three cadence steps and the running rename example (L1); the per-PR copy-on-write Neon branch + `db:migrate &&` build command (ch098.5); the CI typecheck/test gate (ch097); `dbUnpooled` and the `scripts/` backfill (L1 / conventions); Drizzle Studio as the branch's row viewer (Unit 5).

---

## Notes for downstream agents

- **Chapter-wide conventions carried from ch098 and L1/L2:** all Vercel/Neon UI surfaces are **HTML/CSS mocks**, never real screenshots; `proxy.ts` never `middleware.ts`; `pnpm@11.x`; migrations are `generate → review → migrate`, never `push`; the unpooled client is `dbUnpooled`; the running example is `invoices.customer_name` (text) → `invoices.customer_id` (uuid FK to `customers`) with backfill `scripts/backfill_customer_ids.ts`.
- **The two anchor visuals** (the two-rings figure, the four-checks-across-three-steps grid/tabs) are the lesson's backbone; the two-rings figure is the higher-value one — prioritize it if budget is tight. Both are static HTML/CSS inside `<Figure>`/`TabbedContent`; no diagram engine needed.
- **No live-coding exercise fits** — there is no in-browser runtime for a multi-deploy migration rehearsal, and `DrizzleCoding`/`SQLCoding` (PGlite) can't model a preview-branch/production split or the dual-write-across-deploys timeline. The `Checklist` is the primary assessment; the `Matching` drill (failure mode → catching check) is the strongest comprehension check; one targeted `MultipleChoice` on the "green build is necessary but not sufficient" misconception is a good optional addition. Do not force a coding sandbox.
- **Code blocks are all short and procedural** (SQL audit queries, a `time` invocation, a Studio query, a `neonctl` command) — plain `Code` blocks suffice; no `AnnotatedCode`/`CodeVariants` needed (the lesson has no complex single-file walkthrough or before/after code contrast; the data-integrity SQL is the most substantial block and is two queries).
- **Keep the "rehearsal is necessary, not sufficient" thread visible** across the build-checks section, the can't-catch section, and the checklist's final row — it's the senior takeaway the quiz (L4) will likely test.
