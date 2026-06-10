# Lesson 2 outline — The task boundary: schemaTask and the per-org queue

## Lesson title

Chapter-outline title fits. Keep: **The task boundary: schemaTask and the per-org queue**.
Sidebar (short): **The task boundary**.

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior decision that separates a SaaS app from its long-running work: a Server Action that *fires* a durable job and returns immediately, never blocking the request. They confirm the `exportInvoices` boundary (the module-scope predeclared queue, the strict-payload `schemaTask`) and write `startExport` — wiring per-org serialization via `concurrencyKey` and same-day dedup via a global idempotency key. The payoff is the canonical fire-and-forget trigger shape: validated at the edge, back-pressured per tenant, deduped per day, with the body still a placeholder. Everything later in the chapter hangs off this boundary being right.

## Codebase state

**Entry.** A complete Better Auth + Drizzle app from the Project Overview setup. The three `trigger/` task files exist; `export-invoices.ts` already ships its full boundary (the `exportQueue` declaration, the `schemaTask` shell with strict payload, `queue`, `retry`) but its body is a placeholder (`metadata.set('pagesDone', 0); return { ok: true }`). `paginate-page.ts` and `send-export-email.ts` throw `not implemented`. `src/lib/exports/start.ts` returns `err('internal', 'Not implemented')`, so clicking Export errors. The inspector page, REST poller route, `trigger-client.ts`, `dayBucket`, `exports` table, `authedAction`, and `tenantDb` are all provided and working.

**Exit.** `startExport` is implemented: it inserts a `queued` `exports` row, fires `exportInvoices` fire-and-forget with `concurrencyKey: orgId` + a 24h global daily key, updates the row's `runId`, and `revalidatePath('/inspector')`. Clicking Export now produces a real run that appears in the dashboard with a validated payload and completes against the placeholder body; the inspector run panel switches to the new `runId` and polls it. A same-day duplicate returns the first run. `paginate-page.ts` and `send-export-email.ts` are still stubs — lessons 3 and 4.

## Lesson sections

Match the Implementation contract: *Goal + Finished result* (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: clicking "Export invoices" fires a real, validated, per-org-serialized run instead of erroring. Then a one-paragraph description of the working result: the run appears in the Trigger.dev dashboard with payload `{ organizationId, requestedBy }` and reaches `completed` against the placeholder body; the inspector switches to the new `runId` and polls it; a duplicate same-day click returns the same run (the daily key dedups); exports across different orgs run in parallel in their own `concurrencyKey` lanes. No screenshot needed — a prose description of the inspector after a click (run panel showing the `runId`, status `completed`, progress bar at `0/0` since `pagesTotal` lands next lesson) suffices.

### Your mission

Prose brief in the project's terms — no implementation hints, no subsection headers. Weave these threads as coherent prose:

- The decision: the boundary between app and durable job. A Server Action fires the task and returns immediately; the task validates its payload and lands on the right queue. The body's real work is the next two lessons.
- The shipped boundary the student *confirms* (does not write): module-scope `queue()`, the `schemaTask` shell with the strict payload, `queue: exportQueue`, `retry: { maxAttempts: 3 }`, placeholder body.
- A task has no request context, so `organizationId` and `requestedBy` travel in the payload; `schemaTask` validates with `z.strictObject` at the trigger edge, before any retry is spent, never in the body.
- **Constraints** (non-functional, shape the solution): payload ids are `z.string().min(1)` not `z.uuid()` (the seed assigns base62 ids like `org_acme`); one predeclared queue at `concurrencyLimit: 1` with per-tenant isolation from `concurrencyKey: organizationId` at the trigger call (sequential within an org, parallel across orgs) — the v4-native shape, the v3 dynamically-named-queue / trigger-time-limit pattern is rejected; fire with `tasks.trigger` not `triggerAndWait` (an in-task wait from an action would block past `maxDuration`); a 24h global daily idempotency key from `(orgId, userId, dayBucket())`; the action pinned to `member` via `authedAction`.
- **Out of scope** (one line): the body does no pagination, email, or audit write yet — the shipped placeholder sets `pagesDone: 0` and returns `{ ok: true }`; cross-step keys and real work land in lessons 3–4.

Then the **Functional requirements** as a numbered list, each tagged `[tested]` or `[untested]`. Use the `Checklist`/`ChecklistItem` component with tested/untested chips. Phrase each as a verifiable outcome, never a file/export. Tag mapping (the test-coder asserts only `[tested]`; the rest live in the reference solution and the by-hand checklist):

1. Firing the export inserts one `queued` `exports` row, then fires `export-invoices` with payload `{ organizationId, requestedBy }`, and updates the row with the returned `runId`. `[tested]`
2. A second trigger on the same calendar day for the same org+user returns the first run's `runId` and leaves a single `exports` row (the global daily key short-circuits). `[tested]`
3. A malformed payload (`organizationId: ''` failing `.min(1)`, or an extra key rejected by `strictObject`) fails at the schema boundary before the body runs. `[tested]` — assert the schema parse rejects, not dashboard behavior.
4. The action is gated to the `member` role; a sub-member caller is rejected before any trigger. `[tested]`
5. Clicking Export switches the inspector run panel to the new `runId` and the run reaches `status: completed` in the dashboard. `[untested]` (requires a live worker + browser).
6. Exports across different orgs run in parallel, each in its own `concurrencyKey` lane on the shared `export` queue. `[untested]` (cross-org behavior needs the live dashboard).
7. The student can explain how the per-org `concurrencyKey` lane at `concurrencyLimit: 1` serializes two genuinely-distinct same-org runs, even though the daily key dedups two same-org clicks to one run. `[untested]` (conceptual).

### Coding time

One line directing the student to confirm the boundary in `trigger/export-invoices.ts` (shipped) and implement `src/lib/exports/start.ts` against the brief and tests. Then the reference solution, which the writer wraps in `<details>` (collapsed).

Present the reference in two code blocks, in repo order:

1. **The shipped `exportInvoices` boundary** (`trigger/export-invoices.ts`, header through the `schemaTask` shell — show the imports, the module-scope `export const exportQueue = queue({ name: 'export', concurrencyLimit: 1 })`, and the `schemaTask({ id, schema: z.strictObject({ organizationId: z.string().min(1), requestedBy: z.string().min(1) }), queue: exportQueue, retry: { maxAttempts: 3 }, run })` with the placeholder body only — stop before the pagination loop, that's lesson 3). Use **`AnnotatedCode`**: this block has several decision-bearing parts the student must focus on one at a time — the module-scope queue line, the `z.strictObject` + `z.string().min(1)` schema, `queue: exportQueue`, `retry`, and the `metadata` module-level import note. Each annotation step carries one rationale.

2. **`startExport`** (`src/lib/exports/start.ts`, full file). Use **`AnnotatedCode`**: direct focus to the `authedAction('member', z.strictObject({}), ...)` wrapper, the pre-trigger `ctx.db.insert(exports)` with `status: 'queued'` + `dayBucket` + `runId: null`, the `tasks.trigger<typeof exportInvoices>` call with `concurrencyKey: ctx.orgId` / `idempotencyKeys.create([orgId, userId, bucket], { scope: 'global' })` / `idempotencyKeyTTL: '24h'` / `tags`, the post-trigger `runId` update, and `revalidatePath('/inspector')` + `ok({ runId: handle.id })`.

Decision rationale to cover (one or two sentences each; for owned topics link rather than re-explain):
- `id: 'export-invoices'` is the durable API — the string identity, not the symbol, is what Trigger.dev keys on across deploys. Link to lesson 4 of chapter 066.
- Predeclared `queue()` at module scope referenced via `queue: exportQueue`; `concurrencyKey: organizationId` at the trigger call is the per-tenant knob. Show/name the v3 dynamically-named / trigger-time-`concurrencyLimit` shape as the break that no longer works — a one-line **`CodeVariants`** before/after (v3 broken vs v4 correct) carries this cleanly if the writer wants the contrast, otherwise a prose callout. Link to lesson 4 of chapter 066.
- `tasks.trigger` from the action vs the `triggerAndWait`-from-an-action timeout failure mode. Link to lesson 4 of chapter 066.
- The business-key shape `idempotencyKeys.create([orgId, userId, day], { scope: 'global' })` + `idempotencyKeyTTL: '24h'`, and why the same daily key dedups two same-org clicks to one run (so the inspector's "Trigger 2 (same org)" button returns the existing run rather than queueing a second). Link to lesson 5 of chapter 066.
- The two-step `exports` write (insert with `runId: null`, update after the trigger returns) and the named production hardening: wrapping the trigger in the transaction and accepting a rare orphan `queued` row on trigger failure — named, not built. This is an `[untested]`-adjacent code-organization point; cover it here.
- Why payload ids are `z.string().min(1)` not `z.uuid()` (base62 seed ids).
- The `member` role pin as the structural enforcement of who may export — covers requirement 4's `[untested]`/`[tested]` split. Link to chapter 057 (`authedAction`).
- `metadata` as the module-level `@trigger.dev/sdk` import (not destructured off the run's second arg) — a one-line callout, since the shipped boundary imports it but the placeholder barely uses it; the full progress story is lesson 3.

Callout on the unusual-at-a-glance: the SDK is imported from `@trigger.dev/sdk/v3` even though this is v4 — the v4 package keeps the `/v3` entry path. One sentence.

External resources slot (no header) goes after the `<details>`; the resourcer fills it.

### Moment of truth

The test command and expected pass output:
- `pnpm test:lesson 2` — expect all tests pass, reporting: the action fires the task with a validated payload and writes the `exports` row; the business daily key short-circuits a duplicate to the same `runId`; a malformed payload rejects at the schema boundary; the `member` gate rejects a sub-member caller. Show the expected green Vitest summary via **`Code`** (output block).

Then the by-hand checklist (`Checklist`/`ChecklistItem`) for the `[untested]` outcomes the suite can't reach (live worker + dashboard + browser):
- Click "Export invoices" for the active org → inspector switches to the new `runId`; dashboard shows one run, `status: completed`, payload `{ organizationId, requestedBy }`; progress bar reads `0/0` (`pagesTotal` is next lesson).
- Click Export twice quickly → second returns the same `runId`; one `exports` row; one dashboard run.
- From the dashboard "Run task" tool fire `export-invoices` with `{ organizationId: '' }` or an extra key → fails immediately at the Zod parse, body never runs.
- Click "Trigger 2 (same org)" → both submits share the daily key, collapse to one run; observe the dedup and reason how a `concurrencyKey` lane at limit 1 *would* serialize two distinct runs.
- Switch the acting org (dev switcher) and fire "Trigger 3 (cross org)" → each org's run reaches `executing` in its own lane on the shared queue, in parallel.

## Diagrams

Optional, not required. If the writer judges the per-org-lane mechanic needs more than prose, a single small horizontal figure helps: one `export` queue at `concurrencyLimit: 1`, splitting into independent per-`concurrencyKey` lanes (org A serial, org B serial, A and B parallel). Best fit is **plain HTML + CSS** (color-coded lanes) inside `<Figure>`, capped well under 800px tall, horizontal. Brief only — prose can carry this if the figure adds friction. No sequence/architecture diagram needed.

## Scope

This lesson stops at the boundary. It does **not** cover:
- The real paginated body — `paginatePage` child runs, per-page run-scoped idempotency keys, `metadata` progress writes, `AbortTaskRunError` on empty resultset → **Lesson 3**.
- The email child, the closing `tenantDb` transaction, and the audit write → **Lesson 4**.
- The Trigger.dev primitives themselves (`schemaTask`, queues-in-code, `tasks.trigger` vs `triggerAndWait`, idempotency-key scopes, retries) — taught in **Chapter 066 lessons 4–5**; this lesson applies them, linking rather than re-teaching.
- R2 upload / real `downloadUrl` → Chapter 069. No per-user rate limit on `startExport` → Unit 15b. No scheduled exports → Unit 14.
