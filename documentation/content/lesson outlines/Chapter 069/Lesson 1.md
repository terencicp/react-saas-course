# Lesson 1 — Project overview

- **Title:** Project overview (sentence case, plain text). Sidebar: `Project overview`.
- **Type:** Project overview.

## Lesson framing

The student walks away with a running starter for a direct-browser-to-R2 upload surface plus the chapter 067 export retrofit, and a clear mental map of the senior shape this whole project installs: `lib/r2.ts` built once and driven by two consumers, a presigned PUT that keeps bytes off the function, the two-step write with a post-upload HEAD as the trust boundary, fresh-per-render GETs that are never cached, and `file_metadata` as the canonical identity. No feature is built here — the payoff is orientation plus a locally-running app the four Implementation lessons will fill in.

## Codebase state

First lesson — no entry/exit detail required. Exit condition: the starter runs locally; `/files` renders an empty list with a non-functional form (action stubs return `err('internal', 'Not implemented')`); `/inspector` (under `(protected)`) carries the intact chapter 067 surface, still emitting a placeholder `downloadUrl`, not an R2 link.

## Lesson sections

Contract: Project overview → *What we're building* (intro, no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*.

### What we're building (intro, no header)

One paragraph framing the runnable upload surface and naming the senior shape it copies: a direct-browser-to-R2 upload with a `Files` list, plus the chapter 067 export retrofit so the export email carries a real R2 link — `lib/r2.ts` constructed once, presigned PUT, two-step write with a post-upload HEAD, fresh-per-render GETs, `file_metadata` as canonical identity, and the retrofit proving the same primitives work from a worker's server-side PUT.

Figure: one `Screenshot` (desktop) of `/files` showing the form, a progress bar mid-flight, and a list of completed rows. Wrap in `<Figure>`.

State the scope cuts here so the student knows the edges (weave as prose, not a list): no image transformation (Cloudflare Images, named once); no multipart for files over 100 MB (project caps at 25 MB); no virus scanning (named); no client preview past the file-picker echo; no soft-delete UI (the action and column exist and are verified, no button); no orphan-cleanup sweep (forward note).

### What we'll practice

Bulleted list, phrased as skills being developed (per contract, header is "What we'll practice"):
- Signing a presigned PUT in a Server Action so the function never pipes the bytes.
- The two-step write — sign, upload, finalize-with-HEAD, insert — and why the row never lands before the bytes.
- Verifying true size and content type from a post-upload HEAD instead of trusting the client's claim.
- Issuing fresh-per-render presigned GETs and keeping the page out of the cache so URLs never go stale.
- Enforcing tenancy at every read and a `member` role gate at the action.
- Driving one `lib/r2.ts` from two consumers — browser-PUT user uploads and a server-PUT export retrofit.

### Architecture

Shape only — mechanics belong to chapter 068 and the Implementation lessons. **Diagram:** brief one system-architecture diagram (D2, inside `<Figure>`, horizontal, capped height). It carries the byte-flow split that prose struggles with — the small-JSON path through the function versus the multi-MB PUT going straight to R2. Boxes/edges:
- Browser → `presignedPut` action (signs, no DB) → browser PUTs bytes **straight to R2** (the thick edge, bypassing the function) → `finalizeUpload` action (HEADs, inserts row).
- `/files` server render → `listFiles` → per-row `getFileDownloadUrl` (fresh presigned GET) → "Download" links.
- chapter 067 export worker → server-side `PutObjectCommand` under `exports/org/<id>/` → `getSignedGetForKey` → `downloadUrl` on the email.
- One `lib/r2.ts` `S3Client`, two consumers (Next.js function, Trigger.dev worker); one bucket per environment, prefixes (`org/<id>/files/`, `exports/org/<id>/`) carry the workload split.

If the agent judges D2 overkill, fall back to a labeled `<ul>` of the four flows — but the browser-bypass edge must read as visually distinct from the function-mediated calls.

### Starting file tree

`FileTree` of the annotated top-level layout from the chapter outline ("Starter file tree" block). Comment one line on each file changed from chapter 067 or that a lesson will touch; leave the rest uncommented. Highlight the **six TODO surfaces** as the focus:
- `src/lib/files/presigned-put.ts` — TODO L2
- `src/lib/files/finalize.ts` — TODO L3
- `src/db/queries/file-metadata.ts` — TODO L4
- `src/app/files/upload-form.tsx` — TODO L3
- `src/app/files/page.tsx` — TODO L3 + L4
- `trigger/export-invoices.ts` — TODO L5 retrofit

Explicitly note the `file_metadata` table and its migration (`drizzle/0008_add_file_metadata.sql`) are **provided**, not a TODO — this chapter consumes the shape, it does not author it.

Brief orientation only — one line per provided piece, defer the deep read to the lesson that first touches it:
- `lib/r2.ts` — singleton `S3Client` + `ALLOWED_CONTENT_TYPES` + `MAX_BYTES`. Reused as-is from chapter 068; first exercised L2.
- `db/schema.ts` — the `file_metadata` table (provided), already present; first read L3 (`finalizeUpload` inserts).
- `lib/files/keys.ts` — pure `extFor` + `buildObjectKey`; extension from the validated content type, never the user filename. First exercised L2.
- `lib/files/errors.ts` — `UploadError` with four codes (`unsupported-type | too-large | size-mismatch | object-not-found`) + `UploadError.toResult`. First exercised L3.
- `lib/files/cursor.ts` — `FileCursor` + `encodeCursor`/`decodeCursor`, base64url keyset cursor. First exercised L4.
- `lib/files/soft-delete.ts` — `softDeleteFile`, provided and named, not wired to UI.
- `scripts/r2-cors.ts`, `scripts/r2-lifecycle.ts` — idempotent CORS push and 7-day lifecycle rule; run in Setup and L5 respectively.
- `app/(protected)/inspector/` — chapter 067 surface intact, with the "render `metadata.downloadUrl` as clickable link" addition provided; link goes live L5.
- `trigger/*`, `lib/exports/*` — chapter 067 task files in full; student edits `trigger/export-invoices.ts` in L5.

### Roadmap

`CardGrid` with one `Card` per Implementation lesson (number + title + one sentence on what it adds):
- **Lesson 2 — Sign the PUT, no DB write.** Adds the `presignedPut` action that signs a direct-to-R2 upload, verified by `curl`.
- **Lesson 3 — Browser PUT, HEAD, then insert.** Implements the `finalizeUpload` HEAD-then-insert (into the provided `file_metadata` table) and the XHR upload form, so a picked file lands in R2 and writes its row.
- **Lesson 4 — Fresh-per-render GETs.** Adds the un-cached `/files` list that signs a new download URL per row per render, with the 11-minute expiry proof.
- **Lesson 5 — Real downloadUrl for the export.** Retrofits the chapter 067 export to write a real R2 object and email a working presigned link.

### Setup

`Steps` component, exact commands in order. First step must be the project-repo line.
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 069/start/`. Then `pnpm install`.
2. Bring up Postgres (`docker compose up -d`), then `pnpm db:migrate` and `pnpm db:seed` — chapter 067 schema + seed data (orgs and invoices; no `file_metadata` rows yet).
3. Create the R2 bucket, a scoped token with Object Read + Object Write, fill the env values (see below).
4. Run `pnpm r2:cors` once for this environment to push the CORS rules. The script logs the effective rules after the push — confirm `AllowedOrigins: ['http://localhost:3000']`, not `'*'`. Must run before the first browser upload or the preflight fails.
5. Two terminals: `pnpm trigger:dev` (the chapter 067 Trigger.dev project, needed for the L5 export) and `pnpm dev`.

Expected result (state on the final step): `/files` renders an empty list with a non-functional form (actions are empty stubs); `/inspector` shows the working chapter 067 surface (export still produces a `console.log`-shaped placeholder, not an R2 link yet).

Env var list (carried from chapter 068; student's own R2 account fills the values) — name, purpose, how to obtain:
- `R2_ACCOUNT_ID` — Cloudflare account ID; from the R2 dashboard.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — scoped token credentials; shown once when the token is created.
- `R2_BUCKET_NAME` — the bucket created in step 3.
- Plus the chapter 067 vars already in `.env.example` (`DATABASE_URL`, Resend, Trigger.dev) — reference, don't re-document.

`Aside` (note) on a course choice the student should understand, not just follow: the 25 MB cap is the simplest defense against the size-bomb attack L3 exercises; production often allows 100 MB+ via multipart, named but not built.

## Code samples handling

- File tree → `FileTree`.
- Architecture flow → D2 diagram inside `<Figure>` (or labeled `<ul>` fallback).
- Setup → `Steps`; commands as inline `Code` where shown.
- No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` here — this lesson builds nothing, so no implementation code blocks. Technology rationale belongs in regular lessons (chapter 068), not here.

## Scope

This lesson only gets the starter running and maps the project; it builds no feature. The presigned-PUT mechanics, the two-step write, fresh-per-render GETs, and the export retrofit each belong to their Implementation lesson (L2–L5). The R2 primitives themselves — bucket + scoped credentials + CORS, presigned PUT/GET mechanics, the `file_metadata` shape, the browser-vs-worker byte-pipe rule — are taught in chapter 068 and are only *named* here, not re-explained.
