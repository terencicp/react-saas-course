# Chapter 067 — Lesson 3 outline

## Lesson title

- Page title: `One checkpoint per page` (chapter-outline title fits — it names the durability unit precisely and reads well in sentence case).
- Sidebar (short): `One checkpoint per page`.

## Lesson type

`Implementation`

(Test-coder runs; writer renders the Implementation section list: *Goal + Finished result* / *Your mission* / *Coding time* / *Moment of truth*.)

## Lesson framing

The student installs the senior reflex that **durability lives at step boundaries**: they replace the placeholder body with a real paginated export where every page is its own `triggerAndWait` child run, so a crashed-then-retried parent re-issues the same run-scoped idempotency keys and gets completed pages back from cache instead of re-running them. They also learn the partner reflex — **permanents abort, transients throw** — by aborting an empty resultset with `AbortTaskRunError` so it fails once instead of burning all three retries, and they wire `run.metadata` as the live-progress channel the inspector polls. The payoff is not "a loop that builds a CSV" but the resumable-checkpoint shape every later durable job copies.

## Codebase state

**Entry.** The lesson-2 boundary is live: `trigger/export-invoices.ts` ships the module-scope `exportQueue = queue({ name: 'export', concurrencyLimit: 1 })`, the `schemaTask` shell with the strict `{ organizationId, requestedBy }` payload (`z.string().min(1)`), `queue: exportQueue`, `retry: { maxAttempts: 3 }`, and a placeholder body that does `metadata.set('pagesDone', 0); return { ok: true }`. `src/lib/exports/start.ts` is the finished `startExport` action — clicking Export fires a real validated per-org-serialized run that completes, dedups on the daily key, and shows `0/0` on the progress bar. `trigger/paginate-page.ts` is a stub (`throw new Error('not implemented')`). `trigger/send-export-email.ts` is still a stub (lesson 4). All provided helpers exist: `listInvoices`/`countInvoices` (`src/db/queries/invoices.ts`), `rowsToCsv` (`src/lib/exports/to-csv.ts`), `ExportError` (`src/lib/exports/errors.ts`), `tenantDb` (`src/db/tenant.ts`), the inspector page + 1s poller, and the REST-backed `/api/exports/[runId]` route.

**Exit.** `trigger/paginate-page.ts` is fully implemented: reads one page via `listInvoices({ orgId, view: 'active', cursor, pageSize: 500 })`, returns `{ csv, nextCursor, rowCount }`. The `exportInvoices` parent body is grown through the page loop: `countInvoices` → `AbortTaskRunError` on `total === 0`, `pagesTotal = Math.ceil(total / PAGE_SIZE)` with `PAGE_SIZE = 500`, a sequential `for` loop calling `paginatePage.triggerAndWait(..., { idempotencyKey: await idempotencyKeys.create([organizationId, 'page', String(page)]) }).unwrap()`, accumulating CSV and advancing the cursor, `metadata.set('pagesTotal', ...)` once and `metadata.set('pagesDone', page + 1)` each iteration, closing with a `console.log` of CSV size and `metadata.set('downloadUrl', 'https://example.com/exports/${ctx.run.id}.csv')`. The email step (`sendExportEmail.triggerAndWait`) and the closing `tenantDb` transaction (row update + audit write) remain stubbed/absent for lesson 4 — the body still returns the placeholder-shaped value pending lesson 4's `{ ok: true, runId, rowCount }`. Progress bar drives to full against a seeded org; empty org aborts with no children.

## Lesson sections

Implementation type. Section order and headers fixed by the contract.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: turn the placeholder body into a real paginated export where every page is its own durable child run. Then the working-feature description: clicking Export against a seeded org drives the progress bar to full while the Trigger.dev dashboard shows one `paginate-page` child run per page (one page for the seed's 200–240-row orgs at `PAGE_SIZE` 500); the empty org aborts immediately with no children; on a parent retry every completed page returns cached on its run-scoped key rather than re-running. Reference the lesson-1 inspector figure rather than introduce a new screenshot — no diagram needed here; the dashboard parent→child run tree is the visual and is described in prose.

### Your mission

Coherent prose paragraph(s), no subsection headers, no implementation hints. Weave in:

- **Feature.** Each invoice page becomes its own durable `paginatePage` child run spawned through `triggerAndWait`; the parent loops the pages, accumulates the CSV, and streams progress to the watching inspector.
- **The senior decision installed.** Every `triggerAndWait` is a checkpoint — a multi-page export has one checkpoint per page, so a crash between pages 3 and 4 resumes at page 4; on parent retry the same idempotency keys are re-issued and the runtime returns prior results for completed children. State plainly that the shipped seed gives each org a single page, so the multi-page resume is the *reasoned* story and the *reproducible* proof is cached-on-retry of the one page's key.
- **Constraints.** The cross-step key is run-scoped (`scope: 'run'` default), per-org; the page read uses cursor pagination (stable across writes); the progress channel is `run.metadata`; an empty resultset is a permanent failure; the loop is sequential.
- **Out of scope (one line).** CSV is accumulated in memory (bounded by the per-org row cap); a 100k-invoice org needs a streaming write to object storage inside each child — chapter 069. The email step stays empty; the body ends by logging CSV size and storing a placeholder `downloadUrl` on metadata for the next lesson.
- **Traps pre-empted (prose, no hints that give away code).** Forgetting the `pagesDone` write is the classic "completes but bar stays at zero" bug; aborting a permanent with a plain `throw` burns all three retries; a `'global'`-scoped page key collides across runs; folding `Date.now()` into the key breaks the cache on retry; `Promise.all`-ing the pages races the concurrency limit and reorders rows.

Then the **Functional requirements** numbered list — the only list in the section — each phrased as a verifiable outcome, tagged `[tested]`/`[untested]`:

1. Clicking Export against a seeded org drives the progress bar to full, and the dashboard shows one `paginate-page` child run per page (one for the single-page seed orgs), each parented under the export run with its payload and output. `[untested]` (requires a live worker + dashboard; the by-hand check covers it.)
2. Per-page progress advances through `run.metadata` — `pagesTotal` set once from the count, `pagesDone` incremented per page — and the bar reflects real per-page advancement, not a fixed or fabricated value. `[tested]`
3. Each page child is keyed by a run-scoped idempotency key derived from `[organizationId, 'page', String(page)]`, so a parent retry re-issues the same key and the runtime returns the completed page's cached result instead of re-executing it; the run reaches `completed` with the same `runId`. `[tested]`
4. The page child reads exactly one page via cursor pagination and emits the CSV fragment for those rows, advancing the cursor for the next page. `[tested]`
5. Exporting the empty seeded org (`org_empty`) fails on the first attempt with no retries, via `AbortTaskRunError`, and spawns no `paginate-page` children. `[tested]`
6. The page loop runs sequentially (one page awaited before the next), preserving row order. `[untested]` (covered in the reference solution — ordering is asserted indirectly via the CSV fragment, but the sequential-vs-parallel decision is a solution-only concern.)

Note for the test-coder: tests assert observable behavior (metadata progress shape, cached-on-retry returning the prior result, abort-without-retry on empty, single-page CSV fragment correctness), inlining helpers, depending only on the shared runner and the student's task code. The `[untested]` items are the dashboard-tree visual and the loop-shape decision.

### Coding time

One line directing the student to implement `trigger/paginate-page.ts` and grow the `exportInvoices` body against the brief, the reference signatures, and the tests — read the solution after attempting. Then the solution in `<details>` (writer wraps it).

Solution organized as it appears in the repo:

1. **`trigger/paginate-page.ts`** — the `paginatePage` schemaTask. Strict-object payload `{ organizationId: z.string().min(1), page: z.int().nonnegative(), cursor: z.string().nullable() }`; body destructures `{ organizationId, cursor }`, calls `listInvoices({ orgId: organizationId, view: 'active', cursor, pageSize: 500 })`, returns `{ csv: rowsToCsv(rows), nextCursor, rowCount: rows.length }`. Show with `Code`.
2. **`trigger/export-invoices.ts` (grown body)** — `const PAGE_SIZE = 500`; `countInvoices({ orgId: organizationId })` → `if (total === 0) throw new AbortTaskRunError(new ExportError('EMPTY_RESULTSET', ...).message)`; `pagesTotal = Math.ceil(total / PAGE_SIZE)`; `metadata.set('pagesTotal', pagesTotal)`; sequential `for` loop over pages with `cursor` carried across iterations, each iteration `await paginatePage.triggerAndWait({ organizationId, page, cursor }, { idempotencyKey: await idempotencyKeys.create([organizationId, 'page', String(page)]) }).unwrap()`, accumulate `csv`, advance `cursor = nextCursor`, `metadata.set('pagesDone', page + 1)`; closing `console.log` of CSV size and `metadata.set('downloadUrl', 'https://example.com/exports/${ctx.run.id}.csv')`. This block is complex with several focus points (the abort guard, the key construction, the two metadata writes, the cursor advance) — use **`AnnotatedCode`** to step the student through the parent body part by part.

Decision rationale to cover (one or two sentences each, link rather than re-explain owned topics):

- Every `triggerAndWait` is a durable checkpoint; walk the resume-at-page-4 story. Show the broken key shapes (`scope: 'global'`, folding in `Date.now()`) beside the correct `idempotencyKeys.create([organizationId, 'page', String(page)])` with default `scope: 'run'` — use **`CodeVariants`** (wrong vs right key construction). Link to lesson 5 of chapter 066 for the `idempotencyKeys.create` mechanics.
- `.unwrap()` on the `triggerAndWait` result, and the `String(page)` requirement (parts array is `string[]`; a raw number is rejected).
- `AbortTaskRunError` vs a plain throw and the wasted-retry cost — link lesson 5 of chapter 066. Note the abort wraps the class's `.message`, not the instance.
- Cursor pagination's stability across concurrent writes — link chapter 062 (and chapter 038 for the cursor primitive); do not re-explain.
- Why `pagesDone` is set from the parent (the parent's view is the user-facing one), and the zero-bar symptom of omitting it.
- `metadata` is the module-level `@trigger.dev/sdk` import, not a field on the run's second arg (which exposes `ctx`/`init`/`signal`) — link lesson 6 of chapter 066 for the metadata channel.
- The in-memory CSV accumulation bound and the pointer to chapter 069 for the streaming write.
- The sequential-vs-parallel loop decision (covers `[untested]` requirement 6).

Coverage of `[untested]` requirements in the solution prose: requirement 1 (dashboard parent→child tree) explained as what the loop produces operationally; requirement 6 (sequential loop) explained via the loop-shape rationale above.

External resources slot: none required from this outline; resourcer appends after the `<details>` if any (no header).

### Moment of truth

Test command: `pnpm test:lesson 3`. Expected pass output: all tests green, reporting per-page progress advances through metadata, the run-scoped key returns cached on retry without re-running, the single-page CSV fragment is correct, and an empty resultset aborts without retries. Render the expected pass summary with `Code`.

Then the by-hand checklist (use `Checklist`/`ChecklistItem`) for outcomes the tests can't reach:

- Click Export for a seeded org (one page at limit 500). Progress bar advances to full; the dashboard shows the `paginate-page` child with payload + output, parented under the export run.
- Retry-cache drill: complete an export, then replay/retry the parent from the dashboard. The completed page's child returns cached (not re-executed) on its run-scoped key; final state `completed` with the same `runId`. (The kill-worker-mid-page variant needs a multi-page org the seed doesn't ship — reason it through against the single page.)
- Trigger an export against `org_empty`. The body throws `AbortTaskRunError`; the dashboard shows one attempt, no retries, no children.
- Optional senior reach: confirm one child's `idempotencyKey` comes from `idempotencyKeys.create([organizationId, 'page', 0])` (run-scoped to the parent), force a parent retry, confirm the same key returns the cached output rather than re-executing.

## Scope

- The `startExport` action, the per-org `concurrencyKey` queue, and the daily business idempotency key are lesson 2's — this lesson assumes them live and does not re-derive them.
- The `sendExportEmail` child, the closing `tenantDb` transaction (row update + audit write), and the suppression path are lesson 4's — this lesson leaves the email step empty and stops at the placeholder `downloadUrl` on metadata.
- The real R2 presigned `downloadUrl` and streaming CSV writes to object storage are chapter 069 — referenced as forward notes only.
- `schemaTask`, queues-in-code, `triggerAndWait` vs `trigger`, run-level retry config, the `idempotencyKeys.create` scope semantics, and the metadata channel are taught in chapter 066 (lessons 4–6) — link, never re-teach.
