# Chapter 100 — Lesson 3 outline

## Lesson title

Full: **PR 1 (Expand): add the nullable subtotal and tax columns** (chapter-outline title fits — keep it).
Sidebar: **PR 1: Expand**

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior reflex that opens every destructive schema change safely: the *expand* move — widen the schema so old and new shapes coexist, touching zero application code and rewriting zero rows, then ship it through a green PR rehearsed on a copy-on-write Neon preview branch before it reaches production. The payoff is the load-bearing observation made concrete: a column add can be deployed against a live app with no incompatibility window, *because* the new columns are nullable and nothing reads them yet. They leave knowing why nullability is the entire safety argument here, why `NOT NULL` is deferred to PR 2's tail, and why ruthless scope discipline (schema-only, no "while I'm here" writes) is what keeps the rollback story cheap.

## Codebase state

**Entry.** Production is live from Lesson 2: a `*.vercel.app` URL serving the chapter-062 invoices surface behind Better Auth, against the Neon `main` branch. `main` is branch-protected (PR + green CI required), the Vercel build command is `pnpm db:migrate && next build`, the Neon integration provisions a branch per PR, and the launch checklist is green. The repo is the start state: `src/db/schema.ts` carries `total: numeric('total', { precision: 12, scale: 2 }).notNull()` as the single combined column with the three `TODO(L3/L4/L5)` markers beneath it; migrations `0000`–`0004` exist; `actions.ts`/`queries.ts` read and write `total`; `tests/lessons/Lesson 3.test.ts` is a `describe.todo` skeleton; `docs/runbooks/migration-subtotal-tax.md` is a stub with empty `## PR 1 — Expand` / `## PR 2` / `## PR 3` headers.

**Exit.** `src/db/schema.ts` has two new nullable columns — `subtotal` and `tax`, both `numeric(12, 2)` with no `.notNull()` — added alongside the still-present `total`; the `TODO(L3)` marker is gone, `TODO(L4)`/`TODO(L5)` remain. `drizzle/0005_expand_subtotal_tax.sql` exists (two `ADD COLUMN` statements with a `--> statement-breakpoint`). No `actions.ts`/`queries.ts`/`money.ts`/edit-form changes. `0005` is applied against production's Neon `main` branch via a merged PR whose commit SHA matches its merge commit. The `## PR 1 — Expand` runbook section is filled. `tests/lessons/Lesson 3.test.ts` will be turned into real assertions by the next agent.

## Lesson sections

Implementation type — render the contract's four sections in order. Project lessons carry no inline exercises (the test suite is the exercise) and no diagram is warranted here (the flow is one additive migration; prose carries it).

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: ship the cadence's expand step — an additive-only migration adding `subtotal` and `tax` as nullable columns, rehearsed on a preview branch and merged to production. Then a one-paragraph description of the state when it lands: production runs the *unchanged* chapter-062 app against a schema that now carries `total` plus two new nullable columns nothing reads yet, and the inspector's schema-state probe shows both new columns present and nullable with split-coverage at 0%. No screenshot required; a one-line pointer to the inspector's schema-state and split-coverage panels suffices.

### Your mission

Prose paragraph (no subsection headers, no implementation hints) introducing the expand step as the safe opening move of a destructive change: widen the schema so new and old shapes coexist without touching app code or rewriting a row. Weave in the senior decisions and pre-empted failure modes:
- **Why nullable is the whole safety argument** — the running app does not read `subtotal`/`tax`, so a `NOT NULL` add would fail against existing rows that have no value; the `NOT NULL` promotion is deferred to PR 2's tail after the backfill.
- **Precision match** — copy `total`'s `numeric(12, 2)` exactly; mismatched precision is a quiet money-corruption source, and the senior reflex is to copy the producer's type.
- **Constraint: ruthless scope** — schema + migration only; no `actions.ts`/`queries.ts` edits, no tests, no env changes. Name the "also start writing the new columns while I'm here" temptation as the thing that muddies the rollback story; it is held for PR 2.
- **Reading the preview build log line by line** — which migrations applied, whether any failed, whether the breakpoint produced two statements; a corrupted preview branch is fixed by close-and-reopen (Neon recreates from `main`), never by hand. This is the most valuable habit the lesson builds.

Then the **Functional requirements** as the section's only list, each phrased as a verifiable outcome (never a file/export), tagged `[tested]`/`[untested]`. Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip. The tested ones are the static/data-shape facts a node-env Vitest run can reach against the student's schema + generated migration; the deploy/preview/Sentry/runbook ones are untested (hand-confirmed in *Moment of truth*):

1. `[tested]` The migration is additive only — it adds two columns and contains no `DROP`, no `NOT NULL` add, no `RENAME`.
2. `[tested]` Both new columns are nullable and declared `numeric(12, 2)`, matching `total`'s precision and scale.
3. `[untested]` The migration applies cleanly against the live database without rewriting existing rows, confirmed by the preview build log and sub-second completion on seed data.
4. `[untested]` On the preview deployment the existing app behaves identically (list renders; create / edit / archive / restore all succeed) while the inspector shows `subtotal`/`tax` present, nullable, and unwritten (split-coverage 0%).
5. `[untested]` The PR merges green across all CI checks and `vercel-build`, producing a production deployment whose commit SHA matches the merge commit.
6. `[untested]` After merge, production keeps working against the expanded schema (list renders; mutations succeed reading/writing `total`; inspector shows the two nullable columns) and Sentry stays quiet across a two-minute observation window.
7. `[untested]` A PR-1 entry in `docs/runbooks/migration-subtotal-tax.md` records what is true in production now and the cheap rollback available while nothing reads the new columns.

Note for the test-coder: assertions target observable behavior, not file paths — the migration-additive and column-shape checks read the generated `0005` SQL and/or the applied schema, and the read/write-over-`total`-unchanged check exercises behavior, not imports. Keep the test file self-contained per the contract.

### Coding time

One-line build prompt directing the student to implement against the brief and rehearse on the preview before merging. Full reference solution wrapped in `<details>` (writer collapses it). Contents, organized as it appears in the repo:

- **`src/db/schema.ts`** — replace the `// TODO(L3)` marker with the two columns added alongside `total`. Use `Code` (simple two-line block):
  ```ts
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
  tax: numeric('tax', { precision: 12, scale: 2 }),
  ```
  Rationale callout: both omit `.notNull()` — the load-bearing choice; leave `total` and the `TODO(L4)`/`TODO(L5)` markers in place.
- **Generate the migration** — `pnpm db:generate`; Drizzle Kit emits `drizzle/0005_expand_subtotal_tax.sql` with two `ALTER TABLE "invoices" ADD COLUMN` statements separated by `--> statement-breakpoint`. Show the generated SQL with `Code`. Callout (the one thing that looks unusual at a glance): nullable column adds with no default are metadata-only in Postgres, so the breakpoint is not strictly required here — it is kept for cadence-shape consistency, not for safety.
- **Open the PR** — branch `expand/subtotal-tax`, commit migration + schema, push, open PR titled `expand: add subtotal and tax columns (nullable)`. Self-review covers untested req: the diff is exactly two column additions plus the migration, nothing else.
- **Merge and watch production** — merge once green; production rebuilds, `pnpm db:migrate` applies `0005` against the Neon `main` branch, the new function fleet rolls out over a few minutes.
- **Fill the runbook** (untested req coverage) — the PR-1 section of `migration-subtotal-tax.md`: the additive `0005` migration, the two nullable columns, the "no app touch / no row rewrite" note, and the cheap rollback (revert the migration; nothing reads the columns).

Link rather than re-explain: the expand-migrate-contract cadence and the forward-only / no-incompatibility-window rationale are owned by Chapter 099 lesson 1; the build-command migration path and preview-branch rehearsal are owned by Chapter 098 lessons 5/3; Drizzle Kit `generate`/`migrate` and statement-breakpoints are owned by Chapter 040. Reference, do not duplicate.

The resourcer may append external resources after the `<details>` with no header.

### Moment of truth

Test command and expected pass output:
```sh
pnpm test:lesson 3
```
Expected: all Lesson 3 assertions pass — the additive-migration, nullable-`numeric(12,2)`, and unchanged-`total`-read/write checks green. (`test:lesson` runs `node scripts/test-lesson.mjs` → the single `tests/lessons/Lesson 3.test.ts`.)

Then the hand-confirmation checklist for the untested requirements (`Checklist`/`ChecklistItem`), one ticked item each:
- Preview build log shows `0005_expand_subtotal_tax` applied with a success line and sub-second timing.
- On the preview, the inspector's schema-state probe shows `subtotal`/`tax` nullable and `information_schema.columns` reports `is_nullable = YES` for both.
- On the preview, create / edit / archive / restore all succeed and the dual-write probe shows `subtotal`/`tax` null for every row (split-coverage 0%).
- After merge, production `/invoices` renders, mutations succeed, inspector shows the two nullable columns, Sentry reports zero new errors after a two-minute wait.
- `docs/runbooks/migration-subtotal-tax.md` carries the PR-1 state and rollback note.

## Scope

- **No app-code changes.** Dual-write in `actions.ts`, the `coalesce` dual-read in `queries.ts`, the `combinedAmount` helper, the edit-form split, the backfill, and the `NOT NULL` promotion are all PR 2 — owned by Lesson 4. This lesson touches only `schema.ts`, the generated `0005` migration, and the runbook's PR-1 section.
- **No column drop or finalization.** `DROP COLUMN total` and legacy-reference cleanup are PR 3 — owned by Lesson 5.
- **No Vercel/Neon wiring.** The production URL, build-command override, Neon integration, branch protection, and launch checklist were established in Lesson 2; this lesson assumes them and only exercises the preview-per-PR workflow they enable.
- **No rollback rehearsal.** The alias-re-point gesture and `rollback.md` are Lesson 6. PR 1's rollback note is just the one-line "revert the migration; nothing reads the columns" entry in the migration runbook.
