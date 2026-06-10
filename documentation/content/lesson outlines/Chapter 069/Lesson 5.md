# Lesson 5 — Real downloadUrl for the export

## Lesson title

Chapter-outline title "Real downloadUrl for the export" fits — it names the concrete payoff (the placeholder becomes a real link). Keep it.

- **Page title:** Real downloadUrl for the export
- **Sidebar title:** Export download link

## Lesson type

`Implementation`

(Last lesson of the chapter — closes the project. The test-coder runs; the writer renders the Implementation section list.)

## Lesson framing

The student installs the senior call that one `lib/r2.ts` powers both sides of the trust boundary: the same client that signed a browser PUT for user uploads now does a server-side PUT from a Trigger.dev worker, because a worker has no browser to offload bytes to. They retrofit the chapter 067 export so its placeholder `https://example.com/...` link becomes a real R2 object under the `exports/` prefix and a fresh 10-minute presigned GET that lands on both the inspector panel and the export email — while deliberately writing no `file_metadata` row, because a throwaway artifact swept by a lifecycle rule is a different lifecycle from a user file. The lesson closes the project: the byte-pipe rule, the prefix-carries-the-split decision, and the kill-resume idempotency invariant all hold under one verification.

## Codebase state

**Entry.** Lessons 2–4 are complete: `presignedPut` signs (L2), `finalizeUpload` HEADs-and-inserts (L3), and `/files` lists with fresh-per-render GETs (L4). `db/queries/file-metadata.ts` already exports the tenant-free `getSignedGetForKey({ objectKey, expiresIn })` helper (authored in L4 for this lesson's caller). `lib/r2.ts` (`r2`, `BUCKET`), `lib/exports/day-bucket.ts` (`dayBucket()`), `scripts/r2-lifecycle.ts` (the 7-day `exports/` rule, provided), and the whole chapter 067 export pipeline ship intact. The single TODO surface is `trigger/export-invoices.ts`: after the page loop it hardcodes `const downloadUrl = ` `https://example.com/exports/${ctx.run.id}.csv` `` and `metadata.set('downloadUrl', downloadUrl)`. `/inspector` already renders `metadata.downloadUrl` as a clickable link (provided) — it just points at a dead placeholder. The export email template already takes `downloadUrl`; `sendExportEmail` already receives it.

**Exit.** `trigger/export-invoices.ts` writes the accumulated CSV to R2 with a server-side `PutObjectCommand` at `exports/org/${organizationId}/${ctx.run.id}.csv`, signs a 10-minute GET via `getSignedGetForKey`, and feeds the real URL to `metadata.set` and `sendExportEmail` — no `file_metadata` row. The placeholder is gone. Triggering an export from `/inspector` produces a downloadable CSV from both the panel and the email; `select count(*) from file_metadata where object_key like 'exports/%'` returns 0; the kill-resume drill still yields exactly one CSV, one email, one audit row. This is the final lesson — no further codebase state.

## Lesson sections

Implementation section list: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: the export email and inspector panel now carry a real, working R2 download link instead of a placeholder. Then a one-paragraph description of the feature working: triggering an export from `/inspector`, the completion panel shows a `downloadUrl` that downloads `export-<day>.csv`, and the same link arrives by email — clickable within 10 minutes. Optionally a `Screenshot` of the inspector completion panel with the live link, but a prose description suffices (this is a retrofit of an existing surface, no new UI). No new component machinery in the intro.

### Your mission

Prose paragraph weaving Feature, Constraints, and Out of scope — no subsection headers, no implementation hints, then the requirements `Checklist`.

**Feature (user terms):** the CSV export's email and inspector link become a real R2 download instead of the chapter 067 placeholder.

**Constraints to weave in (the senior decisions the brief surfaces):**
- The byte-pipe rule flips for the worker: user-facing flows offload the PUT to the browser, but a worker already holds the bytes in memory and has no browser, so it PUTs to R2 directly — presigning a PUT back to itself would be ceremony. This is the one place in the project where a function sees the bytes, and that is correct.
- Same `lib/r2.ts` client, one bucket per environment — the `exports/` prefix (not a second bucket) carries the workload split between throwaway exports and long-lived user uploads.
- Exports get **no** `file_metadata` row — they are single-consumer throwaway artifacts; a 7-day lifecycle rule scoped to the literal `exports/` prefix handles cleanup, confirmed by logging the effective rules rather than waiting a week.
- The 10-minute GET expiry means a user opening the email an hour later gets a dead link; the senior call is re-trigger, not a longer-lived URL.
- The in-memory CSV is bounded by page-count × page-size — fine at project scale; a switch to multipart streaming past ~100 MB is named, not built.
- The R2 PUT must sit after the page loop and **before** the close-out transaction (an external call never sits inside a DB transaction) and at the end of the resumed parent, so the chapter 067 kill-resume idempotency still holds — a parent retry re-PUTs the same key and an overwrite is idempotent.

**Out of scope (one line):** no change to the pagination loop or the email template; reuse the chapter 067 `metadata.set` / `sendExportEmail` plumbing.

**Functional requirements** — numbered `Checklist`, each tagged `[tested]`/`[untested]`. Phrase as outcomes, never files:
1. Triggering an export writes one R2 object at `exports/org/<orgId>/<runId>.csv` via a server-side PUT. `[tested]`
2. The export email and the inspector `metadata.downloadUrl` carry the same signed URL. `[tested]`
3. The export writes no `file_metadata` row — `select count(*) from file_metadata where object_key like 'exports/%'` returns 0. `[tested]`
4. Killing the trigger mid-run and restarting still produces exactly one CSV, one email, and one audit entry, with the R2 PUT happening once at the end of the resumed parent. `[tested]`
5. The inspector completion panel renders the `downloadUrl` as a real R2 link that downloads the CSV when clicked, named `export-<day>.csv`. `[untested]` (browser/UI — verified by hand)
6. The export email arrives carrying the same URL and clicking it within the 10-minute window downloads the CSV. `[untested]` (real inbox + timer — verified by hand)
7. The 7-day lifecycle rule on the `exports/` prefix is present, confirmed by logging the effective rules. `[untested]` (run `pnpm r2:lifecycle`, read the logged config)

Test-coder note: assertions target observable behavior, not file paths or imports. Requirements 1–4 are the `[tested]` set; the runner inspects the run's `metadata.downloadUrl` and R2/DB state. Requirement 4 (kill-resume) may be infeasible to drive in an automated runner — if so, the test-coder should assert the idempotency-key invariant it can reach (one object at the run-id key, one audit row) and the by-hand drill carries the rest; flag the gap in the test file's comments.

### Coding time

One line directing the student to retrofit `trigger/export-invoices.ts` against the brief and the tests, then the hidden solution `<details>` (the writer wraps it). Material framed as read-after-attempt.

**Reference implementation** — the diff is a single block replacing the placeholder after the page loop in `trigger/export-invoices.ts`. Use `CodeVariants` (two tabs: "Before — chapter 067 placeholder" / "After — real R2 link") so the student sees exactly what the retrofit swaps — the placeholder `const downloadUrl = ` `https://example.com/...` `` line out, the PUT-sign-set block in. The new imports (`PutObjectCommand` from `@aws-sdk/client-s3`; `getSignedGetForKey` from `@/db/queries/file-metadata`; `BUCKET, r2` from `@/lib/r2`) are part of the diff — show them in the "After" tab.

The inserted block, in repo order:
- `const body = Buffer.from(csv)` and `const objectKey = ` `exports/org/${organizationId}/${ctx.run.id}.csv` ``.
- `await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, Body: body, ContentType: 'text/csv', ContentDisposition: ` `attachment; filename="export-${dayBucket()}.csv"` ` }))`.
- `const { url: downloadUrl } = await getSignedGetForKey({ objectKey, expiresIn: 600 })`, then the existing `metadata.set('downloadUrl', downloadUrl)`.

Decision rationale (one or two sentences each):
- **Server-PUT for workers** — the byte-pipe rule's other half; link to lesson 5 of chapter 068 rather than re-explaining.
- **`exports/` leading prefix, not a second bucket** — R2 lifecycle matching is a literal leading-string prefix, so the rule must lead with `exports/` (org scoping nests under it) to sweep every org's CSVs; user uploads live under `org/` and are untouched.
- **No `file_metadata` row** — a throwaway single-consumer artifact; covers `[untested]` requirement that exports never write a row.
- **`ContentDisposition` set at PUT time** (not on the GET) — so `getSignedGetForKey` stays a bare-key signer with no `ResponseContentDisposition`; the download name is baked into the stored object. Contrast briefly with `getFileDownloadUrl` (lesson 4), which sets disposition on the GET because user-upload names aren't known at PUT time.
- **`getSignedGetForKey` takes a raw key** — the worker owns the key it just wrote inside the trust boundary, so there's no org row to scope against (unlike the tenant-scoped `getFileDownloadUrl`).
- **PUT placed after the loop, before the close-out transaction** — an external call never sits inside a DB transaction; placing it at the end of the resumed parent keeps the chapter 067 cross-step idempotency intact (re-PUT on retry overwrites the same key). Link to chapter 067 for the kill-resume mechanism rather than re-explaining.
- **10-minute expiry / re-trigger** — the trade-off and why a longer-lived URL is the wrong fix.

**Lifecycle step:** the 7-day `exports/` rule is configured by the provided `scripts/r2-lifecycle.ts`, run once via `pnpm r2:lifecycle` against the student's own bucket. Show the command and note the script logs the effective rules after the push (the confirmation, instead of waiting seven days). Use `Code` for the command and the expected logged-rules snippet.

Code components: `CodeVariants` for the before/after retrofit diff (the load-bearing comparison). `Code` for the `pnpm r2:lifecycle` command and its logged-rules output. No `AnnotatedCode` needed — the inserted block is short and the rationale is carried in prose. No diagram — the flow (worker → PUT → sign → email) is linear and already drawn in the lesson 1 Architecture; prose carries it.

### Moment of truth

State the test command and expected pass output, then the by-hand `Checklist`.

- **Command:** `pnpm test:lesson 5` — wrap in `Code`.
- **Expected pass output:** a brief passing summary (the writer renders the runner's real shape; describe it as the lesson-5 suite green). Tests cover: the export writes an object under the `exports/` prefix and no `file_metadata` row; the email and `metadata` carry the same signed URL; the kill-resume invariant (one object, one email, one audit entry — to the extent the runner can reach it).

By-hand checklist (`Checklist`, the `[untested]` set):
- [ ] Trigger an export from `/inspector`; the panel shows a real R2 `downloadUrl`; clicking it downloads `export-<day>.csv`.
- [ ] The email arrives in the Resend-verified inbox with the same URL; clicking within 10 minutes downloads the CSV.
- [ ] `select count(*) from file_metadata where object_key like 'exports/%'` returns 0.
- [ ] `pnpm r2:lifecycle` logs a single `expire-exports-after-7-days` rule scoped to `Filter.Prefix: 'exports/'`.
- [ ] Kill-resume drill: Ctrl-C the trigger CLI at `pagesDone: 2/7`, restart — the export resumes, the PUT happens once at the end, and the result is one CSV, one email, one audit row.

**Project close-out** (after the verification, in prose — this is the last lesson). One short paragraph: the audit log now carries `file.uploaded` per upload and `export.invoices.completed` per export run (written with `actorUserId: null` — a task has no session), while `/files` render writes no audit row and `file.soft_deleted` exists in the API but is unexercised — confirmable with `select action, count(*) from audit_logs group by action`. Then the senior calls the student should be able to articulate, as a tight `Card`/`CardGrid` or bullet list: function never sees bytes for user uploads; the two-step write; size and content type from the HEAD not the client; server-constructed object key; fresh-per-render GETs never persisted or cached; tenancy at every read; one bucket per environment with prefixes carrying the workload split and one `lib/r2.ts` for both consumers; `file_metadata` for user uploads versus no-row-plus-lifecycle-rule for exports; CORS scoped to a specific origin. Optionally name forward references in one line: Unit 13's dispatcher can fire on `file.uploaded`; Unit 16 audits the layered size defense, CORS specificity, and `deletedAt` reads; Unit 20 rotates R2 credentials.

## Scope

- Does **not** author `getSignedGetForKey` or the `file-metadata.ts` read helpers — those are built in lesson 4; this lesson only consumes the tenant-free helper.
- Does **not** explain the chapter 067 export pipeline (page loop, `paginatePage`, `sendExportEmail` child, kill-resume idempotency mechanism) — owned by chapter 067; link, don't re-teach.
- Does **not** explain presigned-GET mechanics, expiry trade-offs, or the server-PUT-vs-browser-PUT split at first principles — owned by chapter 068 (lessons 3 and 5); link.
- Does **not** author the lifecycle script or the `exports/` rule — provided in the starter; this lesson runs it.
- Does **not** build user-facing upload UI, the `/files` list, or soft-delete — lessons 3, 4, and the (named-not-wired) `softDeleteFile` action.
- Does **not** cover multipart streaming for files over ~100 MB or a longer-lived URL strategy — named as the escape hatch, not built.
- Caching the metadata read one layer up is a forward note to Unit 15a/chapter 072, not this lesson.
