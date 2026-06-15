# Lesson 5 outline — PR 3 (Contract): drop the old column, promote the new pair

## Lesson title

Chapter-outline title fits. Keep: **PR 3 (Contract): drop the old column, promote the new pair**.
Sidebar (short): **PR 3 — Contract**.

## Lesson type

`Implementation`

(Test-coder runs: turns `tests/lessons/Lesson 5.test.ts` from its `describe.todo` skeleton into real assertions.)

## Lesson framing

The student installs the senior reflex that the contract step — the cadence's one irreversible move — is also its smallest and safest *because* the prior PRs did the work: a single `DROP COLUMN total` plus mechanical cleanup, with the type checker and one scoped grep as the safety nets that prove no reader survives. They ship the destructive change to live production with the cadence's central claim — production was never incompatible with the live schema — held intact across all three deploys, and walk away understanding that a drop is metadata-only/fast but unreversible-by-alias, the setup for lesson 6.

## Codebase state

### Entry
PR 1 (expand) and PR 2 (migrate + promotion) merged. Live production state:
- `invoices` schema carries `total numeric(12,2) NOT NULL` **plus** `subtotal numeric(12,2) NOT NULL` and `tax numeric(12,2) NOT NULL` (PR 2's `0006` promoted the pair after the backfill brought split-coverage to 100%).
- `src/lib/invoices/actions.ts` — `createInvoice`/`updateInvoice` dual-write: accept `subtotal`+`tax`, write all three columns in one `.values({...})`/`.set({...})` with `total: combinedAmount({subtotal, tax})`, plus a legacy-amount fallback (`subtotal = amount, tax = '0'`). `TODO(L5)` markers present on both.
- `src/lib/invoices/queries.ts` — `InvoiceRow` still has `total: string`; `listInvoices`/`getInvoiceDetail` surface `subtotal`/`tax` via `coalesce(subtotal, total)` / `coalesce(tax, 0)` and still return `total`; the `-total`/`total` sort orders on the coalesce-derived combined expression. `TODO(L5)` marker present.
- `src/lib/invoices/money.ts` exists (`combinedAmount`); `table.tsx` + `conflict-banner.tsx` render `combinedAmount(row)`.
- `edit-form.tsx` already has split `subtotal`+`tax` inputs (from PR 2); a `TODO(L5)` marker flags any remaining combined-amount affordance.
- Migrations `0000`–`0006` applied on the Neon `main` branch.
- `docs/runbooks/migration-subtotal-tax.md` carries PR-1 and PR-2 entries.

### Exit
- `src/db/schema.ts` — `total` column removed; `subtotal`+`tax` are the only money columns, both `.notNull()`. Matches the solution `schema.ts` exactly.
- `drizzle/0007_contract_total.sql` — single `ALTER TABLE "invoices" DROP COLUMN "total";` (no breakpoint).
- `actions.ts` — schemas accept only `subtotal`+`tax`; `rowToInvoice` maps the pair; writes two columns; the `total` write and legacy-amount fallback both gone. Matches solution.
- `queries.ts` — `InvoiceRow` has `subtotal`/`tax`, no `total`; `coalesce` fall-through removed (selects `invoices.subtotal`/`invoices.tax` directly); `amountExpr = sql\`(${invoices.subtotal} + ${invoices.tax})\`` drives the `-total`/`total` sort. Matches solution.
- `edit-form.tsx` — `TODO(L5)` marker removed; no combined-amount affordance left.
- PR 3 merged green; production runs migration `0007` against Neon `main`; live schema is the target (`subtotal NOT NULL`, `tax NOT NULL`, no `total`), split-coverage 100%, data-integrity diff renders "n/a — total dropped".
- `docs/runbooks/migration-subtotal-tax.md` carries the closing entry (cadence complete).
- Rollback rehearsal (`docs/runbooks/rollback.md`) is still untouched — that is lesson 6.

## Lesson sections

Implementation type. Section order per contract: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: drop the legacy `total` column and land production on the target `subtotal`+`tax` schema, completing the cadence with its safety claims intact.
Then a one-paragraph description of the feature working: production reads the pair directly, `total` is gone, the inspector's schema-state probe shows `subtotal NOT NULL` / `tax NOT NULL` / no `total`, split-coverage holds 100%, data-integrity reads "n/a — total dropped", Sentry quiet.
No screenshot required (no UI change — the table/edit form already render the pair from PR 2); a short prose description of the inspector panels suffices. If a figure is wanted, reference the inspector schema-state panel showing the dropped column — but treat as optional, not load-bearing.

### Your mission (header)
Coherent prose paragraph, no subsection headers, **no implementation hints**. Weave in:
- Feature (user terms): drop `total`, strip every legacy reference, settle production on the target schema — the cadence's payoff and its single irreversible move.
- Why it is the *smallest* PR: PR 2's `NOT NULL` promotion and dual-write/dual-read already did the heavy lifting, so the schema change is just the one-statement drop; keeping it to that one statement makes the consequential PR the easiest to review.
- Constraints that shape the solution: type checker is the first net (Drizzle's typed builder no longer exposes `invoices.total`, so any surviving typed reference is a build error), backed by one **scoped** grep (`invoices.total` / `invoiceTotal`, not the bare English word) because raw SQL strings and external scripts slip past the type system. Combined amount is computed at the app layer (`subtotal + tax`), never read from a column.
- The senior risk named but **out of scope here**: non-app readers (a report script, an analytics pipeline) break the instant the column disappears — which is why a real production contract PR is gated on a sweep of every reader of the table; this project has no external readers, so the grep + type check suffice.
- One-line forward pointer: this is the one PR whose schema move an alias rollback cannot undo (lesson 6 makes it concrete).
- Out of scope: the rollback rehearsal (lesson 6); any new feature work.

Then the requirements checklist — the only list in the section, rendered via `Checklist`/`ChecklistItem` with `tested`/`untested` chips. Each item phrased as a verifiable outcome, never a file/export. Tagging:

1. `[tested]` The migration is a single `DROP COLUMN total` and contains nothing destructive beyond it.
2. `[tested]` Create and edit accept and persist only `subtotal` and `tax`; the transitional combined-amount write and the legacy-amount fallback are both gone.
3. `[tested]` The list and detail reads return `subtotal` and `tax` directly with no `coalesce` fall-through.
4. `[tested]` Any combined-amount surface is computed (via `combinedAmount`) rather than read from a column.
5. `[untested]` No reference to the old column survives anywhere — the type check is green and a scoped grep returns nothing.
6. `[untested]` On the preview, the schema-state probe shows `subtotal NOT NULL`, `tax NOT NULL`, no `total`; the list and all mutations work against the new shape; a `SELECT total` returns column-does-not-exist.
7. `[untested]` The PR merges green across CI and `vercel-build`, producing a production deployment whose SHA matches the merge commit.
8. `[untested]` After merge, production keeps working on the target schema: list renders, mutations succeed, the inspector shows the target shape with split-coverage 100% and an empty/"n/a" data-integrity diff, Sentry quiet.
9. `[untested]` The runbook's closing entry records the completed cadence.

(Tested set = the four code-shape requirements the lesson test can assert against the student's `schema.ts`/`actions.ts`/`queries.ts`/`money.ts`; the deploy/preview/runbook outcomes are confirmed by hand in *Moment of truth*.)

### Coding time (header)
One line directing the student to implement against the brief + tests, rehearse on the preview, then merge. Reference solution hidden in `<details>` (writer wraps it). Organize as it appears in the repo, on branch `contract/drop-total`:

- **`src/db/schema.ts`** — remove the `total` column and the `TODO(L5)` marker; `subtotal`/`tax` are already `.notNull()` from PR 2. Use `Code` for the resulting two-column money block (matches solution lines 44–45). Rationale callout: `DROP COLUMN` is metadata-only in Postgres — fast even on large tables, space reclaimed by background `VACUUM` — so no `--> statement-breakpoint` and no lock concern (contrast with PR 2's `SET NOT NULL` scan; link to lesson 4 rather than re-explain).
- **`drizzle/0007_contract_total.sql`** — generated by `pnpm db:generate`. `Code` block: single `ALTER TABLE "invoices" DROP COLUMN "total";`. Note it is the whole migration.
- **`src/lib/invoices/actions.ts`** — remove every `total` reference (the `TODO(L5)` markers on `createInvoice` and `updateInvoice`): drop `total` from both Zod schemas, drop `total: combinedAmount(...)` from the `.values({...})`/`.set({...})`, drop the legacy-amount fallback, and drop `total` from `rowToInvoice`. Reads accept only `subtotal`+`tax`. Use `AnnotatedCode` on the `createInvoice`/`updateInvoice` write paths to direct focus to the three deletions (schema field, the `.values`/`.set` total line, the fallback) — this is the file where "what comes out" is least obvious at a glance. Note the lifecycle actions touch no money column and stay unchanged.
- **`src/lib/invoices/queries.ts`** — remove `total` from `InvoiceRow`; drop the `coalesce(subtotal, total)` / `coalesce(tax, 0)` fall-through, selecting `invoices.subtotal` / `invoices.tax` directly in both `listInvoices` and `getInvoiceDetail`; switch the `-total`/`total` sort to order on `amountExpr = sql\`(${invoices.subtotal} + ${invoices.tax})\``. `CodeVariants` (before = PR-2 coalesce dual-read + `total` field; after = direct pair + `amountExpr`) earns its place here — the diff is the clearest single illustration of "dual-read fall-through removed." Rationale: the sort can no longer order on a `total` column, so it orders on the derived expression.
- **`src/app/(protected)/invoices/[id]/edit/edit-form.tsx`** — remove the `TODO(L5)` marker (retire any remaining combined-amount affordance); the split inputs and `combinedAmount(...)` reads in `table.tsx`/`conflict-banner.tsx` already landed in PR 2, so this file needs no further change beyond clearing the marker. Keep this brief — link to lesson 4 for the PR-2 form/render work rather than re-explaining.
- **Self-review + merge** prose: run `pnpm verify` (biome + `tsc` + `next build`) and `pnpm test` locally until green; open PR 3 titled `contract: drop total, finalize subtotal + tax`; one scoped grep for `invoices.total` / `invoiceTotal` proves no typed reference survives (note the inspector's raw-SQL probes reference columns by SQL literal and stay valid — that is why the inspector compiles against both schemas); migration is the drop only; merge once green; production rebuilds, `0007` applies against Neon `main`, column gone.
- **Closing rationale callout** (`Aside` tip): the transitional bridge in PR 2 is what kept this PR small — had PR 2 not written `total` and tolerated legacy posts, PR 3 would also carry the form-flow refactor. The bridge was born to die here.

No diagram needed in this lesson — the change is a column drop and mechanical deletions; prose + `Code`/`AnnotatedCode`/`CodeVariants` carry it.

External resources slot (no header, after the `<details>`) left for the resourcer.

### Moment of truth (header)
Test command and expected pass output:
```sh
pnpm test:lesson 5
```
Describe what the lesson test (the test-coder will write) asserts against the student's code: the `0007` migration drops the column and contains nothing destructive beyond it; create/edit accept and persist only `subtotal`+`tax`; the reads return the pair directly; any combined-amount surface is computed via `combinedAmount` rather than read from a column. Show the expected green pass summary via `Code`.

Then the by-hand checklist (`Checklist`/`ChecklistItem`, untested chips) for what tests can't reach:
- [ ] Scoped grep for `invoices.total` / `invoiceTotal` returns nothing across app and scripts.
- [ ] On the preview, schema-state shows `subtotal NOT NULL`, `tax NOT NULL`, no `total`; `SELECT total FROM invoices` in Drizzle Studio errors.
- [ ] On the preview, the list renders from the pair and create / edit / archive all succeed.
- [ ] After merge, production `/invoices` renders, mutations succeed, the inspector shows the target shape with split-coverage 100% and the data-integrity diff "n/a — total dropped", Sentry zero new errors.
- [ ] `docs/runbooks/migration-subtotal-tax.md` carries the closing state.

## Scope

- **Does not cover** the production rollback rehearsal, promoting the post-PR-2 deployment, or `docs/runbooks/rollback.md` — that is lesson 6 (rollback rehearsal and the schema caveat), which uses *this* PR's contract deployment as the rehearsal target.
- **Does not cover** the expand migration or the nullable-column add — lesson 3 (PR 1).
- **Does not cover** dual-write, the `coalesce` dual-read, the backfill, or the `SET NOT NULL` promotion — lesson 4 (PR 2); this lesson assumes they are already live.
- **Does not cover** the `combinedAmount` helper's internals or the table/conflict-banner render switch — introduced in lesson 4; reference, don't re-explain.
- **Does not cover** the deployment/Vercel/Neon/CI wiring — lesson 2; this lesson reuses the established preview-per-PR + build-time-migration path.
- Handling non-app readers of the dropped column (report scripts, analytics pipelines) is named as the real-world gate but is out of scope because the project has no external readers.
