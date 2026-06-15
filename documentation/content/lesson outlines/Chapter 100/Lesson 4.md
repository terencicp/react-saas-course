# Chapter 100 — Lesson 4 outline

## Lesson title

Chapter-outline title fits and is accurate. Keep: **PR 2 (Migrate): dual-write, backfill, dual-read**.

Sidebar (short): **PR 2: Migrate**

## Lesson type

`Implementation`

(The test-coder runs for this lesson: it turns `tests/lessons/Lesson 4.test.ts` from its `describe.todo` skeleton into real assertions against the student's dual-write actions, dual-read queries, and the backfill.)

## Lesson framing

The student installs the senior reflex at the dangerous middle of a destructive schema change: teach the application both shapes at once so a future PR can read only the new one without ever surprising live code. They ship the migrate step as one PR — structural dual-write of `subtotal`/`tax`/`total` in a single Drizzle write, `coalesce` dual-read fall-through, a bounded-idempotent backfill run against production *after* the write is live — then a separate small `SET NOT NULL` promotion PR, all while production keeps serving traffic and the inspector's data-integrity diff stays at zero. The payoff is the discipline of ordering (write before backfill), the transitional bridge (`total = subtotal + tax`) that is born to die in PR 3, and an idempotency guard that makes a re-run a no-op.

## Codebase state

### Entry (after Lesson 3 / PR 1 merged)

- `src/db/schema.ts`: `invoices` carries `total numeric(12,2) NOT NULL` plus the two PR-1 columns `subtotal numeric(12,2)` and `tax numeric(12,2)`, both **nullable**, unread. The `TODO(L4)` promotion marker and `TODO(L5)` drop marker remain. Migration `0005_expand_subtotal_tax.sql` is in `drizzle/`.
- `src/lib/invoices/actions.ts`: unchanged baseline — `createInvoice`/`updateInvoice` schemas accept `total: z.string()`, write only the `total` column, `rowToInvoice` maps `total`. The `TODO(L4)`/`TODO(L5)` markers sit on both actions.
- `src/lib/invoices/queries.ts`: `InvoiceRow` has `total: string` (no `subtotal`/`tax`); selects `invoices.total`; `-total`/`total` sorts order on `invoices.total`. `TODO(L4)`/`TODO(L5)` markers present.
- `src/lib/invoices/money.ts`: **does not exist yet.**
- `src/app/(protected)/invoices/[id]/edit/edit-form.tsx`: single `<Input name="total" data-testid="total-input">` field with `TODO(L4)`/`TODO(L5)` markers.
- `src/app/(protected)/invoices/table.tsx` and `.../[id]/edit/conflict-banner.tsx`: render the raw `row.total` / `current.total` column value.
- `scripts/backfill_subtotal_tax.ts`: stub `runBackfill()` that logs `[backfill] not implemented`; CLI guard present; `TODO(L4)` marker.
- `tests/lessons/Lesson 4.test.ts`: `describe.todo` skeleton.
- Production live; split-coverage 0%; Sentry quiet. Branch-protected `main`, four-job CI + `vercel-build` green path established.

### Exit (after PR 2 + the promotion PR merged)

- `src/lib/invoices/money.ts`: new file exporting `combinedAmount({ subtotal, tax }): string` (integer-cents add, `toFixed(2)`).
- `src/lib/invoices/actions.ts`: both schemas accept `subtotal` + `tax`; both writes carry all three columns in one `.values({...})` / `.set({...})` with `total: combinedAmount({ subtotal, tax })`; a legacy-amount fallback (`subtotal = amount, tax = '0'`) tolerates a post that still sends only the combined amount; `rowToInvoice` maps the pair.
- `src/lib/invoices/queries.ts`: `InvoiceRow` surfaces `subtotal`/`tax` via `coalesce(invoices.subtotal, invoices.total)` / `coalesce(invoices.tax, 0)`, still returning `total`; the sort orders on the combined `coalesce(subtotal,total) + coalesce(tax,0)` expression.
- `edit-form.tsx`: `subtotal` + `tax` inputs replace the single `total` input.
- `table.tsx`/`conflict-banner.tsx`: read `combinedAmount(row)` / `combinedAmount(current)`.
- `scripts/backfill_subtotal_tax.ts`: implemented bounded-idempotent loop on `dbUnpooled`.
- `src/db/schema.ts`: `subtotal`/`tax` promoted to `.notNull()` (the `TODO(L4)` marker consumed); migration `0006_set_subtotal_tax_not_null.sql` added.
- Production: dual-writing all three columns, reads via the pair, backfill complete (split-coverage 100%), columns `NOT NULL`, data-integrity diff empty, Sentry quiet. The PR-2 runbook entry filled. `TODO(L5)` markers remain for Lesson 5.

## Lesson sections

Render the **Implementation** contract section list.

### Goal + Finished result (intro, no header)

One-sentence goal in project terms: teach every mutation to write `subtotal`/`tax`/`total` together and every read to resolve through the new pair, backfill the legacy rows, then promote the columns to `NOT NULL` — all without a moment where the live app and live schema disagree. Follow with a one-paragraph description (or a `Screenshot` of the inspector) of the working result: the dual-write panel showing `subtotal + tax = total` on the most recent rows, split-coverage at 100%, an empty data-integrity diff, and the schema-state panel reading `subtotal NOT NULL` / `tax NOT NULL`. No diagram needed — the cadence flow was established in Lesson 1 and chapter 099; do not re-draw it.

### Your mission (header: "Your mission")

Coherent prose paragraph(s), no subsection headers, **no implementation hints**. Weave in:

- **Feature** (user terms): every invoice create/edit now persists a separate subtotal and tax; the app keeps the old combined-amount column populated so nothing breaks mid-deploy, then once every legacy row is filled the new columns become required.
- **Constraints** to surface as senior reasoning:
  - Dual-write must be **structural** — one `.set({...})` writing all three columns; the classic bug is a wrapper that writes `total` "separately later," splitting one statement into two and becoming the divergence the data-integrity diff exists to catch.
  - **Order is load-bearing**: backfill runs only *after* the dual-write code is live in production, else rows created in the gap keep null `subtotal`/`tax`.
  - **Idempotent + bounded** backfill: `WHERE subtotal IS NULL` guard means a re-run after a hiccup writes zero rows; processed in batches; runs over the **unpooled** connection (long scripts vs. the pooler's transaction mode).
  - Money stays a **`string` end to end**, `total` computed in integer cents (never float `+`).
  - The transitional bridge (`total = subtotal + tax`, plus the legacy-amount fallback) is deliberately temporary — born to die in PR 3.
  - `SET NOT NULL` is held for its **own small PR** for reviewability of the irreversible-ish tightening.
  - Named-but-out-of-scope at seed size: a million-row `SET NOT NULL` takes an `ACCESS EXCLUSIVE` lock (reach for `CHECK ... NOT VALID` instead); a 200K-row backfill runs on Trigger.dev, not a local script; `subtotal = total, tax = 0` is a deliberate modeling simplification over a per-invoice tax-rate history.
- **Out of scope** (one line): dropping `total` and removing the bridge — that is Lesson 5 (PR 3, Contract).

Then the **Functional requirements** as a numbered list, each tagged `[tested]` / `[untested]`, phrased as outcomes (never as files/exports). Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip. Draft:

1. `[tested]` Creating an invoice persists `subtotal`, `tax`, and a `total` equal to the integer-cents sum of the two.
2. `[tested]` Editing an invoice persists the new `subtotal`/`tax` and recomputes `total` as their sum, leaving the version-precondition behavior intact.
3. `[untested]` A mutation that arrives with only a combined amount is tolerated (`subtotal` = that amount, `tax` = `'0'`) rather than rejected.
4. `[untested]` List and detail reads surface `subtotal`/`tax` for un-backfilled rows by falling through to the legacy `total` (subtotal) and `0` (tax).
5. `[tested]` Running the backfill twice writes no rows the second time (idempotent); a single run populates every legacy row's `subtotal`/`tax`.
6. `[untested]` On the preview branch the backfill brings split-coverage to 100% with zero rows in the data-integrity diff. *(requires the live preview branch + inspector)*
7. `[untested]` After the dual-write code is live in production, the production backfill completes and split-coverage reads 100% against production.
8. `[untested]` The `SET NOT NULL` promotion ships as its own PR, merges green, and succeeds against the fully-backfilled table; the schema-state probe then shows `subtotal`/`tax` as `NOT NULL`.
9. `[untested]` Across both PRs production keeps serving: the list renders from the new pair, new mutations show all three columns with `subtotal + tax = total`, and Sentry stays quiet.
10. `[untested]` The PR-2 entry in `docs/runbooks/migration-subtotal-tax.md` records dual-write live, backfill complete, columns `NOT NULL`.

### Coding time (header: "Coding time")

One-line build prompt directing the student to implement against the brief and the tests, rehearse on the preview, merge, run the production backfill, then ship the promotion PR. Then the full reference solution wrapped in `<details>` (writer collapses it). Organize as it appears in the repo, on branch `migrate/subtotal-tax-dual-write`:

- **`src/lib/invoices/money.ts` (new).** `Code` block. `combinedAmount({ subtotal, tax }: { subtotal: string; tax: string }): string` — `Math.round(Number(subtotal)*100) + Math.round(Number(tax)*100)`, return `(cents/100).toFixed(2)`. Rationale (one line): numeric maps to `string` at the Drizzle runtime, so add in integer cents to avoid float drift. Note that `table.tsx` and `conflict-banner.tsx` switch from `row.total`/`current.total` to `combinedAmount(...)`. Money topic owned by chapter 062 / the carried-in surface — link, do not re-explain numeric→string.
- **`src/lib/invoices/actions.ts`.** Use `AnnotatedCode` — the dual-write change touches the Zod schema, the `.values({...})`/`.set({...})` call, and the fallback in several spots; direct focus to: (a) schema now has `subtotal`/`tax` instead of `total`; (b) all three columns written in one call with `total: combinedAmount({ subtotal, tax })`; (c) the legacy-amount fallback at the action layer (`subtotal = amount, tax = '0'`) so a combined-only post does not fail validation during the deploy window; (d) `rowToInvoice` maps the pair. Apply to both `createInvoice` and `updateInvoice`; lifecycle actions untouched. Cover `[untested]` requirement 3 (fallback placement) here. Callout: the single `.set({...})` is the structural-dual-write requirement — splitting it is the divergence bug.
- **`src/lib/invoices/queries.ts`.** `Code` (or `AnnotatedCode` if focusing the coalesce + sort). `InvoiceRow` gains `subtotal`/`tax` (keep `total`); selects `coalesce(invoices.subtotal, invoices.total)` as `subtotal`, `coalesce(invoices.tax, 0)` as `tax`, still selecting `total`; `amountExpr`/sort orders on the combined `coalesce(...)+coalesce(...)` expression. Rationale: the fall-through lets un-backfilled rows read correctly while the combined `total` stays available to callers.
- **`src/app/(protected)/invoices/[id]/edit/edit-form.tsx`.** `Code` excerpt of just the field block: replace the single `name="total"` input with `name="subtotal"` + `name="tax"` inputs (`data-testid="subtotal-input"` / `"tax-input"`). The rest of the form (version round-trip, conflict resolution) is owned by chapter 062 — link, do not re-explain.
- **`scripts/backfill_subtotal_tax.ts`.** `AnnotatedCode` — this is the most senior-decision-dense block. Direct focus to: (a) `dbUnpooled` connection (long script vs. pooler transaction mode); (b) the `WHERE subtotal IS NULL` select bounded by `limit ${BATCH_SIZE}` (1000); (c) the `update ... set subtotal = total, tax = '0' where id = any(...) and subtotal is null` — the re-guard that makes it idempotent and concurrency-safe; (d) the `while(true)` loop exiting when a batch touches no rows; (e) the raw `db.execute(sql\`...\`)` form (not the typed builder) — note this is *why* it still compiles against the final solution schema that has no `total` column. Cover `[untested]` idempotency reasoning here. Callout: raw SQL by literal sidesteps the typed builder.
- **The promotion PR** (`migrate-notnull/subtotal-tax`, after the production backfill). Prose plus a `Code` block of `0006_set_subtotal_tax_not_null.sql` (two `ALTER COLUMN ... SET NOT NULL` with a breakpoint). Note: promote `subtotal`/`tax` to `.notNull()` in `schema.ts` (consume the `TODO(L4)` marker), `pnpm db:generate`. State the seniority point: shipping `SET NOT NULL` inside the contract PR is also correct; this project prefers the separate PR for reviewability.
- **Workflow + rationale prose** (cover `[untested]` requirements 6, 7, 9, 10): rehearse on the preview (point `pnpm db:backfill` at the preview branch's unpooled URL; confirm split-coverage 100%, all-three populated, empty diff); open PR 2 titled `migrate: dual-write subtotal and tax, backfill, dual-read fall-through` with **no schema migration**; merge green; run `pnpm db:backfill` against production with the production unpooled URL in the script's session only (never committed); watch the inspector for the first ~10 min — a single-site dual-write bug shows immediately as `subtotal + tax <> total`; then ship the promotion PR; fill the PR-2 runbook entry.
- The cadence/dual-write/backfill *concepts* are owned by chapter 099 lesson 1 and `authedAction`/`withTenant`/`logAudit` by chapters 056/057 — link, do not re-explain.

No diagram. No external-resources block unless the resourcer adds one.

### Moment of truth (header: "Moment of truth")

- Test command in a `Code` block: `pnpm test:lesson 4`. Note the runner is the provided `scripts/test-lesson.mjs` executing `tests/lessons/Lesson 4.test.ts`.
- State what the suite asserts (matches `[tested]` 1–5): create/edit write all three columns with `total = combinedAmount({ subtotal, tax })`; the legacy-amount fallback populates the pair; reads resolve through the `coalesce` fall-through for un-backfilled rows; a second `runBackfill()` writes no rows.
- Expected pass output: a green Vitest summary (all Lesson 4 tests passing). The test-coder owns the exact assertions; describe the pass surface only.
- By-hand checklist (`Checklist`/`ChecklistItem`) for the `[untested]` items the suite cannot reach — the preview backfill → 100% coverage + empty diff; production backfill completes + 100% against prod; promotion PR green + schema-state shows `NOT NULL`; production `/invoices` renders from the pair, mutations populate all three, Sentry zero new errors; runbook PR-2 entry filled.

## Scope

- **First production deploy / Vercel + Neon wiring / launch checklist** — Lesson 2.
- **The expand step (nullable column add, additive migration)** — Lesson 3 (PR 1).
- **Dropping `total`, removing the `coalesce` fall-through and the transitional bridge, the final `subtotal`/`tax`-only shape** — Lesson 5 (PR 3, Contract).
- **Rollback rehearsal and the "alias re-point does not undo a forward-only migration" caveat** — Lesson 6.
- **Expand-migrate-contract cadence theory, dual-write/dual-read/backfill as a pattern** — chapter 099 lesson 1 (link, do not re-teach).
- **`authedAction` / `withTenant` / `logAudit` / Result shape** — chapters 056/057/043 (carried in, link only).
- **The invoices surface (URL state, version concurrency, conflict resolution, money string handling)** — chapter 062 (carried in, link only).
