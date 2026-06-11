# Lesson 4 — Eventual invalidation

## Lesson title

Chapter-outline title "Eventual invalidation" fits — it names the senior concept (the eventual half of the read-your-writes vs. eventual split that anchors the chapter). Keep it.

- Page title: `Eventual invalidation`
- Sidebar (short): `Eventual invalidation`

## Lesson type

`Implementation`

The test-coder runs for this lesson (it generates `lesson-verification/Lesson 4.ts`, currently a `describe.todo` stub). The writer renders the Implementation section list.

## Lesson framing

The student installs the second of the two cache-invalidation primitives and learns to pick it by ownership, not habit: the per-org summary is recomputed by a background job that no user is waiting on, so the job calls `revalidateTag` (stale-while-revalidate — the new aggregate lands on the *next* visit) rather than `updateTag` (read-your-writes — would refresh the in-flight render). The payoff is the completed four-call decision tree from chapter 072 made real end-to-end: `updateTag` from Server Actions for the interactive paths (lesson 3), `revalidateTag` from the job for the eventual path (this lesson). The student ships the `recomputeOrgSummary` job body — Zod-validated payload, recompute, upsert, `revalidateTag` through the `tags.ts` helper — and confirms the framework itself enforces the split: `updateTag` throws outside a Server Action.

## Codebase state

Last lesson of the chapter — Entry only.

### Entry

Lessons 2 and 3 are complete:

- `src/lib/cache/tags.ts` — `invoiceTags.list/record/summary` return real scoped strings.
- `src/lib/cache/profiles.ts` — `cacheProfiles` populated (`listInvoices`/`getInvoiceDetail` → `'minutes'`, `getOrgInvoiceSummary` → `'hours'`).
- `src/lib/invoices/queries.ts` — the three reads carry `'use cache'` + `cacheLife` + `cacheTag` and emit `fetchedAt`. `getOrgInvoiceSummary` reads the `summaries` Map row when present and falls back to a live count + sum over active invoices when absent.
- `src/lib/invoices/actions.ts` — the four lifecycle actions fan `updateTag` (list + record + summary) out after commit, log via `logCacheInvalidation(tag, 'action')`, and `updateInvoice` carries the misuse-`revalidateTag` branch behind `misuseFlag`.
- `src/server/jobs/summary-recompute.ts` — **the one remaining stub**: `recomputeOrgSummary` throws `new Error('summary job not implemented')` (`TODO(L4)`). The inspector's "Run summary task" button is wired to the provided `runSummaryJob` Server Action, which already calls `recomputeOrgSummary({ orgId: session.orgId })`, so the button throws on click.

Everything else (inspector, store, `<FetchedAtStrip />`, force-`updateTag` route + island) is provided and untouched.

### Exit

The whole chapter ships: `recomputeOrgSummary` recomputes the org's active-invoice totals, upserts the `summaries` row, and calls `revalidateTag(invoiceTags.summary(orgId), 'max')` + `logCacheInvalidation(summaryTag, 'job')`. "Run summary task" works end-to-end; `summaryFetchedAt` is stable on the redirected render and advances on the next refresh. `pnpm test:lesson 4` is green. This is the only file changed from Entry.

## Lesson sections

Implementation type — section order per the contract: Goal + Finished result (intro, no header) / Your mission / Coding time / Moment of truth.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: recompute the per-org summary off a background job so the new aggregate lands on the next visit without any user waiting on it. Then one short paragraph describing the finished behavior: from the inspector, "Run summary task" recomputes the `summaries` row and redirects to `/inspector` with `summaryFetchedAt` still stable on that render; a second refresh advances `summaryFetchedAt` and shows the new totals. This is the stale-while-revalidate sequence the chapter has been building toward. No header.

### Your mission

Prose-first per the contract; weave Features + Constraints + Out of scope into a coherent paragraph, then the numbered requirements checklist (the only list). No implementation hints, no file/export names in the requirement phrasing.

Prose to cover:
- **Feature (user terms):** the per-org totals summary is refreshed by a background recompute job; the refresh is not interactive, so the new number appears on the user's next visit, not mid-request.
- **The senior decision (lead with it):** ownership picks the primitive. The summary is the one read a job owns, not a user action. Because no specific user is sitting on the recompute, `revalidateTag` is correct — the framework serves the stale value on the in-flight render and refreshes on the next read. Frame this against lesson 3's `updateTag`: same chapter-072 decision tree, opposite branch, chosen by asking who is waiting.
- **Constraint — boundary validation:** the job validates its `{ orgId }` payload at the boundary (Zod-at-the-boundary, the discipline from chapter 042 / lesson 4 of chapter 066) so a misconfigured caller surfaces as a parse error, not a silent recompute of the wrong org.
- **Constraint — tags through the helper:** the invalidation tag comes only through the `tags.ts` helper, never a raw string (the chapter-wide rule).
- **The contrast the API enforces:** `updateTag` is unavailable in this non-Server-Action context — the framework throws — while `revalidateTag` works in background work. The API itself gatekeeps which path a non-interactive recompute may take. (The inspector's force-`updateTag`-from-Route-Handler island is the provided proof; the student observes it, doesn't build it.)
- **Out of scope:** scheduling on a real cron, and any change to lesson 3's action-side invalidation. The production shape — a Trigger.dev `schemaTask` with a code-defined queue and concurrency limit — is *named* (chapter 066 lineage) but not built; the in-process function stands in for it, so no Trigger.dev account/env key.

Requirements checklist — tag each `[tested]` / `[untested]`. The test file is a fresh `describe.todo` stub; the test-coder will assert the `[tested]` items by importing the student's `recomputeOrgSummary` and exercising it against the in-memory store. Assertions target observable behavior (return value, store mutation, log entry, parse rejection), not file paths or imports.

1. Running the recompute returns the correct active-invoice count and total amount for the org (excludes archived and soft-deleted rows). `[tested]`
2. Running the recompute upserts (creates or replaces) the org's one `summaries` row with the recomputed totals and a fresh `updatedAt`. `[tested]`
3. A payload with a malformed/empty `orgId` is rejected at the job boundary (parse error) rather than recomputing the wrong org. `[tested]`
4. Running the recompute records one summary-tag invalidation entry sourced as `job` (distinct from the `action` entries lesson 3 emits). `[tested]`
5. From the inspector, "Run summary task" redirects to `/inspector` with `summaryFetchedAt` unchanged on that render (stale value served). `[untested]` — UI/redirect timing, observed by hand.
6. A manual refresh of `/inspector` after the job advances `summaryFetchedAt` and shows the recomputed totals. `[untested]` — eventual-refresh timing, by hand.
7. The inspector's "Force `updateTag` from a Route Handler" island shows a thrown framework error with a clear message — `updateTag` is unavailable outside a Server Action. `[untested]` — provided surface, observed by hand.

Note for the test-coder: requirements 1–4 are the mechanically assertable core (recompute math, upsert, payload validation, job-sourced log entry); 5–7 depend on Next.js cache/render timing and the inspector UI, so they stay in the by-hand checklist of Moment of truth. The chapter-outline note that `revalidateTag` must pass a `cacheLife` profile as its second arg (`'max'`) is load-bearing — surface it.

### Coding time

One line directing the student to implement `recomputeOrgSummary`'s body against the brief and the tests, then read the reference walkthrough. The writer wraps the walkthrough in `<details>` (collapsed).

Reference implementation is the full `src/server/jobs/summary-recompute.ts` (one file, ~50 lines) — present it as it appears in the repo. Render with `AnnotatedCode` so focus lands sequentially on the four decisions; the file is short but each line carries a distinct rationale.

Structure of the file and the rationale to narrate (one or two sentences each):
- **`import 'server-only'`** at the top — the job is server-only by construction; the import makes a client import a build error.
- **The Zod payload schema** (`z.strictObject({ orgId: z.string().min(1) })`) declared at module scope, `inputSchema.parse(input)` first thing in the body — this is the boundary contract standing in for a `schemaTask` payload schema; a typoed `orgId` is a parse error, not a wrong-org recompute. Link to the validation/Server-Actions lesson rather than re-explaining Zod.
- **Recompute** via `scopedInvoices(orgId).active().take(Number.MAX_SAFE_INTEGER)` — reuses the same tenant-scoped read path the queries use (covers the `[untested]` "active = non-archived, non-deleted" requirement, since `.active()` applies `activeFilter`); `totalCount = active.length`, `totalAmount = active.reduce(...)`. Callout: `take(Number.MAX_SAFE_INTEGER)` is the terminal that materializes all rows — unusual at a glance, but the fluent builder's `.take(n)` is how you get the array out, and the recompute deliberately wants *every* active row, not a page.
- **`upsertSummaryRow({ orgId, totalCount, totalAmount, updatedAt: new Date().toISOString() })`** — writes the one aggregate row for the org into the `summaries` Map (the `org_invoice_summaries` analog).
- **`revalidateTag(summaryTag, 'max')`** where `summaryTag = invoiceTags.summary(orgId)` — `revalidateTag`, not `updateTag`, because no user is waiting (the eventual path); the `'max'` second arg is required in Next.js 16 (single-arg form deprecated); the tag string only ever comes through the helper. Link the read-your-writes-vs-eventual decision to lesson 3 / lesson 2 of chapter 072 rather than re-deriving it.
- **`logCacheInvalidation(summaryTag, 'job')`** placed *after* `revalidateTag` returns — a throwing invalidation must never leave a log row claiming success (same ordering discipline as lesson 3's `'action'` logging); `'job'` is what distinguishes job-sourced entries in the inspector's invalidation-log tail.
- **`return { orgId, totalCount, totalAmount }`** — the result the inspector's `runSummaryJob` surfaces.

Production-framing callout (use an `Aside`): the in-process function stands in for a Trigger.dev `schemaTask` with a code-defined queue + concurrency limit (chapter 066 shape) — named, not built, so no Trigger.dev account/env. Forward-reference chapter 074: the cross-process shared cache backend (Vercel + Upstash) is what makes `revalidateTag` work across instances in production.

No before/after comparison is needed (the start file just throws), so `CodeVariants` is not warranted; `AnnotatedCode` on the single finished file is the right call. No diagram — the flow is a single linear function and prose plus the annotated steps carry it; the stale-while-revalidate *timing* is demonstrated interactively in the inspector, not by a figure.

External resources (if any) appended here after the `<details>` with no header — the resourcer adds these later.

### Moment of truth

Header "Moment of truth". Test command and expected pass output, then the by-hand checklist for the `[untested]` requirements (rendered as a tickable `Checklist`).

- Command: `pnpm test:lesson 4` — runs `lesson-verification/Lesson 4.ts`. Expected: all assertions green, covering the recompute math, the upsert, the payload validation, and the job-sourced log entry. Show the pass output (Vitest summary, suite + N passed) via `Code`.
- By-hand checklist (the `[untested]` items):
  - [ ] Inspector "Run summary task"; the redirect to `/inspector` shows `summaryFetchedAt` stable on that render.
  - [ ] Refresh `/inspector` again; `summaryFetchedAt` advances and the new totals are visible.
  - [ ] The invalidation log tail shows the summary tag sourced as `job`.
  - [ ] The "Force `updateTag` from a Route Handler" island shows a thrown framework error with a clear message.
- Closing line: both invalidation paths are now wired — the four-call decision tree is real end-to-end (`updateTag` from actions for read-your-writes, `revalidateTag` from the job for eventual), and the inspector reads every cache-state change off the `fetchedAt` strip.

## Scope

- **`updateTag` / read-your-writes invalidation and the misuse demo** — owned by lesson 3 of this chapter; carried in as Entry state, not re-taught here.
- **`use cache` / `cacheLife` / `cacheTag` annotation and the `tags.ts`/`profiles.ts` helpers** — owned by lesson 2 of this chapter.
- **The four-call decision tree, the user-expectation question, `revalidateTag` semantics** — taught in lesson 2 of chapter 072; this lesson *applies* the eventual branch, links rather than re-derives.
- **Trigger.dev `schemaTask`, code-defined queues, concurrency limits** — taught in lesson 4 of chapter 066; named here as the production shape, not built.
- **Cross-process / distributed cache backend (Upstash + Vercel)** — chapter 074; one-line forward reference only.
- **Integration tests for invalidation paths** — chapter 088; the per-lesson Vitest suite here is the project's own assessment, not the layered test stack.
