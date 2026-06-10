# Chapter 069 — Project: presigned R2 upload

## Chapter framing

Chapter 069 cashes in the chapter 068 primitives — scoped credentials and CORS (lesson 2 of chapter 068), presigned PUT/GET with the two-step write (lesson 3 of chapter 068), the `file_metadata` row shape with tenancy at the read boundary (lesson 4 of chapter 068), the workload split between user uploads and export outputs (lesson 5 of chapter 068) — and lands them as one runnable upload surface. The student writes the `presignedPut` Server Action that signs against R2 without piping bytes through the function, the browser-side direct-to-R2 PUT with XHR progress, the `finalizeUpload` action that HEADs the object and inserts the row, the `Files` list rendering rows with fresh per-render presigned GETs, and the retrofit on the chapter 067 export job so the `console.log`-shaped `downloadUrl` becomes a real R2 object and the email's link is a 10-minute presigned GET.

This project builds a UI-plus-data-layer feature, so its verifiable outcomes are user-facing behaviors and object-storage results: a chosen file lands in R2 and writes a `file_metadata` row, the `Files` list renders working downloads, a copied download URL dies at 11 minutes while a refreshed page keeps working, the export emails a real R2 link, and the export writes no `file_metadata` row. Each Implementation lesson closes on one such outcome the student can confirm: lesson 2 ends with a fireable action verified by `curl`-PUT; lesson 3 ends with the browser upload landing the bytes and the row; lesson 4 ends with the `Files` page rendering downloads and a copied URL expiring; lesson 5 ends with the export emailing a working R2 link.

### Project goals

The student leaves the chapter having built and confirmed:

- A 5 MB file chosen from `/files` lands as one R2 object at `org/<orgId>/files/<uuid>.<ext>` and writes one `file_metadata` row with matching `objectKey`, `byteSize`, and `contentType`.
- The `Files` list renders each row with a working "Download" link that saves under the original file name.
- A download URL copied from the page returns `403 AccessDenied` after 11 minutes, while a refresh of `/files` re-issues a fresh, working URL for the same row — the URL is never persisted and never cached.
- The chapter 067 export emails a real R2 link that downloads the CSV when clicked within the 10-minute window, with the inspector panel showing the same link.
- For user uploads the function never sees the bytes — the Network tab shows small JSON to and from the action while the multi-MB PUT goes straight to `${bucket}.r2.cloudflarestorage.com`.
- Payload validation at the action boundary rejects a disallowed content type or an over-cap `claimedSize` before any R2 call.
- Tenancy holds at the GET boundary — `getFileDownloadUrl` for a file owned by one org returns the `not_found` result code to another (a cross-org id is indistinguishable from a missing file).
- The layered size defense catches a lying client — a small `claimedSize` followed by an over-cap PUT is rejected by the post-upload HEAD, and no row is inserted.
- The bucket CORS allows the upload from `localhost` and rejects a non-allowed host.
- Exports write no `file_metadata` row — `select count(*) from file_metadata where object_key like 'exports/%'` returns 0.

### Threads through every lesson

The function never sees the bytes for user uploads — Network tab shows small JSON to/from the action and the multi-MB PUT going straight to `${bucket}.r2.cloudflarestorage.com`; the two-step write is structural — sign → upload → finalize-with-HEAD → row insert, never row-before-upload; `objectKey` is server-constructed (`org/${orgId}/files/${uploadId}.${ext}`), never client-supplied; `byteSize` and `contentType` come from the post-upload `HeadObjectCommand`, not the client's claim; presigned GETs are fresh-per-render, never persisted, never cached past expiry; tenancy is enforced at every read via `tenantDb(orgId)` and at the action via `authedAction('member', ...)`; `lib/r2.ts` is constructed once and powers both consumers (browser-PUT user uploads, server-PUT export retrofit) — one mechanism, two consumers.

### Dependency carry-in

- **From lesson 2 of chapter 068:** the bucket with CORS for `http://localhost:3000` (the `NEXT_PUBLIC_APP_URL` value) allowing `GET`/`PUT`/`content-type`; scoped token with Object Read + Object Write; env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; `lib/r2.ts` with `S3Client({ region: 'auto', endpoint, credentials })`.
- **From lesson 3 of chapter 068:** `getSignedUrl` + `PutObjectCommand`/`GetObjectCommand`, 5-min PUT expiry / 10-min GET expiry, layered size defense, content-type allowlist, two-step write, CORS preflight failure shape.
- **From lesson 4 of chapter 068:** the row shape (`id` UUIDv7 as key segment, `organizationId`, `uploadedBy`, `objectKey` unique, `originalFileName`, `contentType`, `byteSize`, `uploadedAt`, `softDeletedAt`); index `(organizationId, softDeletedAt, uploadedAt desc, id desc)`; no-`url`-column rule. The table and its migration (`drizzle/0008_add_file_metadata.sql`) ship in the starter — this chapter consumes the shape, it does not author it.
- **From lesson 5 of chapter 068:** user uploads use `file_metadata` + browser PUT + soft-delete; exports use no metadata row + server-side worker PUT + lifecycle-rule cleanup; lesson 5 of chapter 069 retrofits the export to write `exports/org/${orgId}/${runId}.csv`.
- **From chapter 067:** the `exportInvoices` parent task with the paginate-page loop, `metadata.set('downloadUrl', ...)`, `sendExportEmail` child accepting `downloadUrl`, the inspector reading `run.metadata`.
- **From chapter 050:** `sendEmail` in `lib/email.ts`; `ExportReadyEmail` template taking `{ orgName, rowCount, downloadUrl }`.
- **From chapter 056/chapter 057:** `tenantDb(orgId)`; `authedAction('member', schema, fn)`; `audit_logs` with `logAudit(tx, event)`.
- **From chapter 043:** canonical Result shape; Zod validation at the action boundary.
- **From chapter 032/chapter 072:** the `Files` list is *not* `use cache` — presigned GETs are per-render-fresh and would poison a cached response.
- **From chapter 061:** `deletedAt` discipline.
- **From chapter 016:** file picker, MIME/size validation, blob URL preview — thread closed here.
- **From chapter 009:** `UploadError` subclass with codes `unsupported-type | too-large | size-mismatch | object-not-found`.

### Starter file tree (stubs marked TODO)

The `file_metadata` table and its migration are *provided* in the starter — the student does not author the schema or generate the migration in this chapter. There are exactly six TODO surfaces, all stub → implementation replacements (the start and solution file trees are identical).

```
docker-compose.yml             # provided
drizzle.config.ts              # provided
trigger.config.ts              # provided (from chapter 067)
.env.example                   # provided: chapter 067 vars + R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME
package.json                   # provided: chapter 067 scripts + r2:cors, r2:lifecycle
drizzle/
  0008_add_file_metadata.sql   # provided: file_metadata table + unique objectKey + composite index
scripts/
  seed.ts                      # provided: orgs + invoices from chapter 067; no file_metadata rows
  r2-cors.ts                   # provided: PutBucketCorsCommand, AllowedOrigins=[NEXT_PUBLIC_APP_URL]
  r2-lifecycle.ts              # provided: 7-day rule on the 'exports/' prefix
src/
  env.ts                       # provided: adds R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME
  db/
    schema.ts                  # provided: chapter 067 schema + file_metadata table (already present)
    tenant.ts                  # provided: tenantDb() facade + withTenant()
    audit-log.ts               # provided: logAudit() writer
    queries/
      file-metadata.ts         # TODO student: getFile + getFileDownloadUrl + getSignedGetForKey + listFiles
  lib/
    email.ts                   # provided
    r2.ts                      # provided: S3Client + ALLOWED_CONTENT_TYPES + MAX_BYTES
    auth/authed-action.ts      # provided
    files/
      keys.ts                  # provided: extFor + buildObjectKey({ orgId, fileId, contentType })
      errors.ts                # provided: UploadError class
      cursor.ts                # provided: FileCursor + encodeCursor/decodeCursor
      presigned-put.ts         # TODO student: presignedPut authedAction
      finalize.ts              # TODO student: finalizeUpload authedAction
      soft-delete.ts           # provided: softDeleteFile (named, not exercised)
    exports/                   # provided (chapter 067)
  trigger/
    export-invoices.ts         # provided (chapter 067) — student edits in lesson 5 of chapter 069
    paginate-page.ts           # provided (chapter 067)
    send-export-email.ts       # provided (chapter 067) — payload already accepts downloadUrl
  emails/ExportReadyEmail.tsx  # provided (chapter 067)
  app/
    files/
      page.tsx                 # TODO student: server-rendered list + per-row presigned GETs
      upload-form.tsx          # TODO student: client component + XHR + progress + finalize
    (protected)/inspector/     # provided: chapter 067 surface + downloadUrl renders as clickable link
```

### Reference solution signatures lessons display

- **`lib/r2.ts`** (provided) — exports `r2: S3Client`, `BUCKET: string`, `ALLOWED_CONTENT_TYPES` (`as const` tuple of `image/png | image/jpeg | image/webp | application/pdf | text/csv`), `MAX_BYTES = 25 * 1024 * 1024`.
- **`buildObjectKey`** (provided) — `({ orgId, fileId, contentType }) => \`org/${orgId}/files/${fileId}.${extFor(contentType)}\``. Extension comes from the validated content type via a static map; never from the user's filename.
- **`presignedPut`** (`lib/files/presigned-put.ts`) — `authedAction('member', z.strictObject({ fileName: z.string().min(1).max(255), contentType: z.enum(ALLOWED_CONTENT_TYPES), claimedSize: z.coerce.number().int().positive().max(MAX_BYTES) }), async (input, ctx): Promise<Result<{ uploadId, url, objectKey }>>)`. Generates `uploadId = uuidv7()`, builds `objectKey`, signs `PutObjectCommand({ Bucket, Key: objectKey, ContentType, ContentLength: claimedSize })` with `{ signableHeaders: new Set(['content-type']), expiresIn: 300 }`. No DB write.
- **`finalizeUpload`** (`lib/files/finalize.ts`) — `authedAction('member', z.strictObject({ uploadId: z.uuid(), objectKey: z.string().min(1), originalFileName: z.string().min(1).max(255), contentType: z.enum(ALLOWED_CONTENT_TYPES) }), ...): Promise<Result<{ fileId }>>`. HEADs the object (a 404/`NotFound`/`NoSuchKey` → `UploadError('object-not-found')`), maps `head.ContentType !== input.contentType` and `head.ContentLength > MAX_BYTES` to `UploadError('size-mismatch')`. In `tenantDb(ctx.orgId).transaction`: inserts the row with `id: uploadId`, `uploadedBy: ctx.user.id`, `byteSize: head.ContentLength`, `contentType: head.ContentType`; calls `logAudit(tx, { action: 'file.uploaded', ... })`. A unique-key violation maps to `err('conflict', ...)`.
- **`getFileDownloadUrl`** (`db/queries/file-metadata.ts`) — `(orgId: string, fileId: string): Promise<Result<{ url, fileName, contentType }>>` (positional args, not a ctx object). Reads via `getFile(orgId, fileId)` → `tenantDb(orgId)` filtered by `isNull(softDeletedAt)`; no row → `UploadError('object-not-found')` → `not_found`. Signs `GetObjectCommand({ Bucket, Key: row.objectKey, ResponseContentDisposition: \`attachment; filename*=UTF-8''${encodeRFC5987(row.originalFileName)}\` })` with `expiresIn: 600`.
- **`getFile`** (`db/queries/file-metadata.ts`) — `(orgId, fileId) => Promise<FileMetadata | null>`. Tenant-scoped single read filtered by `isNull(softDeletedAt)`.
- **`getSignedGetForKey`** (`db/queries/file-metadata.ts`) — tenant-free helper, `({ objectKey, expiresIn }) => Promise<{ url }>`. No tenant check — caller is the export worker, inside the trust boundary; no `ResponseContentDisposition` (the export key's own `ContentDisposition` was set at PUT time).
- **`listFiles`** (`db/queries/file-metadata.ts`) — `({ orgId, cursor, limit = 20 }) => Promise<{ rows, nextCursor }>`. `tenantDb(orgId).query.fileMetadata.findMany` with `isNull(softDeletedAt)` plus a `(uploadedAt, id)` keyset predicate decoded from `cursor`, `orderBy: [desc(uploadedAt), desc(id)]`, `limit + 1` n+1 trick.
- **`file_metadata` table** (provided in `db/schema.ts`) — `id uuid pk` (UUIDv7), `organizationId text not null references organization(id) on delete cascade`, `uploadedBy text references user(id) on delete set null`, `objectKey text not null unique('file_metadata_object_key_unique')`, `originalFileName text not null`, `contentType text not null`, `byteSize bigint not null check (>= 0)`, `uploadedAt timestamptz not null default now()`, `softDeletedAt timestamptz`. Index `idx_file_metadata_org_active`: `(organizationId, softDeletedAt, uploadedAt desc, id desc)`. The id/FK columns are `text`, not `uuid`, because Better Auth assigns base62 text ids.
- **CORS JSON** (`scripts/r2-cors.ts`) — `[{ AllowedOrigins: [env.NEXT_PUBLIC_APP_URL], AllowedMethods: ['GET', 'PUT'], AllowedHeaders: ['content-type'], ExposeHeaders: ['etag'], MaxAgeSeconds: 3600 }]`.
- **`upload-form.tsx`** — `XMLHttpRequest` for the R2 PUT (so `xhr.upload.onprogress` fires); the two Server Actions (`presignedPut`, `finalizeUpload`) are called directly.
- **Export retrofit** (`trigger/export-invoices.ts`) — after the page loop, `Buffer.from(csv)`, `r2.send(new PutObjectCommand({ Bucket, Key: \`exports/org/${organizationId}/${ctx.run.id}.csv\`, Body, ContentType: 'text/csv', ContentDisposition: \`attachment; filename="export-${dayBucket()}.csv"\` }))`, then `getSignedGetForKey({ objectKey, expiresIn: 600 })` → `metadata.set('downloadUrl', url)` → pass `downloadUrl` to `sendExportEmail`. No `file_metadata` row.
- **Env** — `env.ts` adds `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (all server-only). The R2 endpoint is derived from `R2_ACCOUNT_ID` in `lib/r2.ts`; no fifth env var.

### Inspector / Files page spec

**`/files` page (TODO student).**

- **Upload form** (client component): `<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/csv">`; XHR progress bar; status `idle | signing | uploading | finalizing | done | failed`; error from `error.userMessage`. On success, `router.refresh()`.
- **List** (server component): per-row `FileRow` with `originalFileName`, `contentType` badge, formatted `byteSize`, a fixed-UTC `uploadedAt` string, `"Download"` link whose `href` is the fresh presigned GET. Empty state when no rows. Keyset "Next page" cursor link. No audit write on render.
- **No `use cache`** — fresh-per-render is structural here.

**`/inspector` page** (provided, from chapter 067 + one addition; lives under the `(protected)` route group): the run-status panel renders `metadata.downloadUrl` as a clickable link once the export completes.

### Concepts demonstrated → owning lesson

- Threshold for object storage, R2 vs. S3 — lesson 1 of chapter 068.
- Bucket + scoped credentials + CORS, S3-compatible endpoint, `region: 'auto'` — lesson 2 of chapter 068.
- Presigned PUT/GET mechanics, `ContentType`/`ContentLength` pinning, expiry trade-offs — lesson 3 of chapter 068.
- Two-step write, layered size defense, R2-specific `ContentLength` non-enforcement — lesson 3 of chapter 068.
- `file_metadata` shape, `id` as key segment, no-`url`-column rule — lesson 4 of chapter 068.
- Tenancy at read via `tenantDb(orgId)`; audit on upload (and soft-delete, named) — render never audits — lesson 4 of chapter 068 / chapter 056 / chapter 057.
- Soft delete with cooled-off cleanup (named) — lesson 4 of chapter 068 / chapter 061.
- One bucket two prefixes, browser-vs-worker byte-pipe rule — lesson 5 of chapter 068.
- `authedAction('member', ...)` — chapter 057. Result shape — chapter 043. Zod validation — chapter 042/chapter 043.
- `XMLHttpRequest` for upload progress — closes chapter 016.
- Principle #3 (named seams: `lib/files/` actions, `db/queries/file-metadata.ts` reads) — chapter 035/chapter 043. Principle #5 (R2 SDK at the call site) — lesson 2 of chapter 068.

---

## Lesson 1 — Project Overview

No feature is built. The student leaves with the starter running: `/files` rendering an empty list with a non-functional form, and `/inspector` (under the `(protected)` route group) carrying the chapter 067 surface.

### What we're building

One paragraph framing the runnable upload surface: a direct-browser-to-R2 upload with a `Files` list, plus the chapter 067 export retrofit so the export email carries a real R2 link. The canonical R2 shape every later upload feature copies — `lib/r2.ts` constructed once, a presigned PUT, the two-step write with a post-upload HEAD, fresh-per-render GETs, and `file_metadata` as the canonical identity — with the chapter 067 retrofit proving the same primitives work from a worker doing a server-side PUT.

Figure: one screenshot of `/files` with the form, a progress bar mid-flight, and a list of completed rows. (An animated capture of choose-file → progress → row appears → download → export fires → email arrives → click email → CSV opens is a nice-to-have.)

Scope cuts, stated here so the student knows the edges: no image transformation (Cloudflare Images, named once); no multipart for files over 100 MB (the project caps at 25 MB); no virus scanning (named); no client preview past the file-picker echo; no soft-delete UI (the action exists and the column is verified, but no button); no orphan-cleanup sweep (forward note).

### What we'll practice

- Signing a presigned PUT in a Server Action so the function never pipes the bytes.
- The two-step write — sign, upload, finalize-with-HEAD, insert — and why the row never lands before the bytes.
- Verifying true size and content type from a post-upload HEAD instead of trusting the client's claim.
- Issuing fresh-per-render presigned GETs and keeping the page out of the cache so URLs never go stale.
- Enforcing tenancy at every read and a `member` role gate at the action.
- Driving one `lib/r2.ts` from two consumers — browser-PUT user uploads and a server-PUT export retrofit.

### Architecture

Labeled shape (shape only — mechanics belong to chapter 068 and the Implementation lessons):

- Browser → `presignedPut` action (signs, no DB) → browser PUTs bytes straight to R2 → `finalizeUpload` action (HEADs, inserts row).
- `/files` server render → `listFiles` → per-row `getFileDownloadUrl` (fresh presigned GET) → "Download" links.
- chapter 067 export worker → server-side `PutObjectCommand` under `exports/org/<id>/` → `getSignedGetForKey` → `downloadUrl` on the email.
- One `lib/r2.ts` `S3Client`, two consumers (Next.js function, Trigger.dev worker); one bucket per environment, prefixes carry the workload split.

### Starting file tree

Use the annotated tree under "Starter file tree (stubs marked TODO)" above. Comment one line on each file changed from chapter 067 or that a lesson will touch; leave the rest uncommented. Mark the six TODO surfaces as the highlighted focus: the two `lib/files/` action stubs (`presigned-put.ts`, `finalize.ts`), the `db/queries/file-metadata.ts` read helpers, the two `app/files/` files (`page.tsx`, `upload-form.tsx`), and the `trigger/export-invoices.ts` retrofit. The `file_metadata` table and its migration are *provided* — not a TODO.

Brief orientation only — name each provided piece in one line and defer the deep read to the lesson that first touches it:

- `lib/r2.ts` — singleton `S3Client` plus `ALLOWED_CONTENT_TYPES` and `MAX_BYTES` constants. Reused as-is from chapter 068; first exercised in lesson 2.
- `db/schema.ts` — the `file_metadata` table (provided), already present in the starter; first read in lesson 3 (`finalizeUpload` inserts into it).
- `lib/files/keys.ts` — pure `extFor` + `buildObjectKey`, extension from the validated content type, never the user filename. First exercised in lesson 2.
- `lib/files/errors.ts` — `UploadError` with the four codes (`unsupported-type | too-large | size-mismatch | object-not-found`) and `UploadError.toResult`. First exercised in lesson 3 (`object-not-found` / `size-mismatch`).
- `lib/files/cursor.ts` — `FileCursor` plus `encodeCursor`/`decodeCursor`, the base64url keyset cursor. First exercised in lesson 4.
- `lib/files/soft-delete.ts` — `softDeleteFile`, provided and named but not wired to UI.
- `scripts/r2-cors.ts`, `scripts/r2-lifecycle.ts` — the idempotent CORS push and the 7-day lifecycle rule; run in Setup and lesson 5 respectively.
- `app/(protected)/inspector/` — the chapter 067 surface intact, with the "render `metadata.downloadUrl` as a clickable link" addition provided; the link goes live in lesson 5.
- `trigger/*`, `lib/exports/*` — chapter 067 task files in full chapter 067 form; the student edits `trigger/export-invoices.ts` in lesson 5.

### Roadmap

One Card per Implementation lesson:

- **Lesson 2 — Sign the PUT, no DB write.** Adds the `presignedPut` action that signs a direct-to-R2 upload, verified by `curl`.
- **Lesson 3 — Browser PUT, HEAD, then insert.** Implements the `finalizeUpload` HEAD-then-insert (against the provided `file_metadata` table) and the XHR upload form, so a picked file lands in R2 and writes its row.
- **Lesson 4 — Fresh-per-render GETs.** Adds the un-cached `/files` list that signs a new download URL per row per render, with the 11-minute expiry proof.
- **Lesson 5 — Real downloadUrl for the export.** Retrofits the chapter 067 export to write a real R2 object and email a working presigned link.

### Setup

Command sequence (Steps component), in order. Expected outcome stated for the final step.

1. Clone the starter via `degit`, then `pnpm install`.
2. Bring up Postgres (`docker compose up -d`), then `pnpm db:migrate` and `pnpm db:seed` — the chapter 067 schema and seed data (orgs and invoices; no `file_metadata` rows yet).
3. Create the R2 bucket, a scoped token with Object Read + Object Write, and fill the env values (see below).
4. Run `pnpm r2:cors` once for this environment to push the CORS rules. The script logs the effective rules after the push — confirm `AllowedOrigins: ['http://localhost:3000']`, not `'*'`. This must run before the first browser upload or the preflight fails.
5. Start two terminals: `pnpm trigger:dev` (the chapter 067 Trigger.dev project, needed for the lesson 5 export) and `pnpm dev`.

Expected result: `/files` renders an empty list with a non-functional form (the actions are empty stubs), and `/inspector` shows the working chapter 067 surface (the export still produces a `console.log`-shaped placeholder, not an R2 link yet).

Env vars (carried from chapter 068; student's own R2 account fills the values):

- `R2_ACCOUNT_ID` — the Cloudflare account ID; from the R2 dashboard.
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — the scoped token credentials; shown once when the token is created.
- `R2_BUCKET_NAME` — the bucket created in step 3.
- Plus the chapter 067 vars carried in `.env.example` (`DATABASE_URL`, Resend, Trigger.dev).

Note on a course choice the student should understand, not just follow: the 25 MB cap is the simplest defense against the size-bomb attack lesson 3 exercises; production often allows 100 MB+ via multipart, named but not built.

---

## Lesson 2 — Sign the PUT, no DB write

The student builds the `presignedPut` Server Action that hands the browser a short-lived URL to upload a file straight to R2, with no bytes through the function.

By the end, calling the action from the browser console returns a signed R2 URL, and `curl`-PUTting a file to that URL lands the object in the bucket without any server involvement in the transfer.

### Your mission

This is the first half of the two-step write. The action's whole job is to authorize one upload: it validates what the client claims about the file, decides where the object will live, and signs a time-boxed `PutObjectCommand` the browser can PUT to directly. It writes no database row — the row belongs to `finalizeUpload` in the next lesson, after the bytes are confirmed in R2, so a never-completed upload leaves no orphan row lying in the UI. The constraints that shape the solution: the object key is server-constructed from the org and a server-generated UUID, never anything the client sends, because letting the client choose the key or the ID is the tenancy-bypass shape — a crafted value could later clobber another org's row; the content type is constrained to the shared `ALLOWED_CONTENT_TYPES` allowlist reused at the Zod boundary, so the policy has one source of truth; the signed URL expires in five minutes, long enough to push 25 MB on a slow link (and the client can re-sign on retry) but short enough that a leaked URL grants no lasting write; and the action gates on the `member` role, the structural defense given that the R2 credentials are app-wide. Sign `ContentLength` from the claimed size even though R2 will not enforce it server-side — signing documents intent and matches the SDK shape, but the real size check is the post-upload HEAD next lesson. Out of scope: any DB write, any client-side upload UI, and trusting the claimed size as the final word. Reuse `buildObjectKey` and the `authedAction` wrapper rather than re-deriving either.

- Calling the action with a valid file name, an allowlisted content type, and a claimed size within the cap returns a signed `https://<bucket>.r2.cloudflarestorage.com/...` URL plus the server-generated upload ID and object key, with no database row written.
- `curl`-PUTting a file to that URL with the matching `Content-Type` returns 200 and the object appears in R2 at `org/<orgId>/files/<uploadId>.<ext>` — proof the byte transfer involves no function.
- `curl`-PUTting with a `Content-Type` that differs from the signed one is rejected by R2 with `403 SignatureDoesNotMatch`.
- Calling the action with a disallowed content type is rejected with the `validation` error code (the Zod enum fails at the `authedAction` boundary) and no R2 call.
- Calling the action with a claimed size over the cap is rejected the same way.

### Coding time

One line directing the student to implement `presignedPut` against the brief and the tests, then the hidden solution `<details>`.

Reference implementation: `lib/files/presigned-put.ts` per the signature under "Reference solution signatures" — Zod `strictObject` input (`fileName`, `contentType` from the enum, `claimedSize` coerced positive int ≤ `MAX_BYTES`); `uploadId = uuidv7()`; `objectKey = buildObjectKey({ orgId: ctx.orgId, fileId: uploadId, contentType })`; `getSignedUrl` over `PutObjectCommand({ Bucket, Key: objectKey, ContentType, ContentLength: claimedSize })` with `{ signableHeaders: new Set(['content-type']), expiresIn: 300 }`; returns `ok({ uploadId, url, objectKey })`. The `signableHeaders` set is what binds the signed URL to its content type, so a mismatched `curl`-PUT trips `403 SignatureDoesNotMatch`.

Decision rationale to cover in the walkthrough:

- `uploadId` is server-generated; a client-chosen ID is the tenancy-bypass shape that could clobber an existing row when `finalizeUpload` inserts by that ID.
- `ContentLength` is signed but not enforced by R2 (the chapter 068 lesson 3 quirk) — link to that lesson rather than re-explaining; the enforcement is next lesson's HEAD.
- The five-minute expiry trade-off; the client re-signs on retry.
- Role `member`, not `admin` — the function-level gate is the defense because R2 credentials are app-wide.
- No "reserved" row with `status: pending` — no row until the bytes are confirmed. Orphan objects are cheap to clean; orphan rows lie in the UI.
- The `validation` error code is mapped at the `authedAction` boundary (Unit 9), not in the action body — link rather than re-explain.

### Moment of truth

Tests cover the action's contract: a valid call returns a signed URL and upload ID with no DB write, a disallowed content type returns the `validation` code with no R2 call, and an over-cap claimed size returns `validation`.

Run the lesson's test suite (state the command and the expected pass output). Then confirm by hand:

- [ ] `curl -X PUT -H "Content-Type: image/jpeg" --data-binary @some.jpg "<signed-url>"` returns 200 and the object appears in the R2 dashboard at `org/<orgId>/files/<uploadId>.jpg`.
- [ ] `curl`-PUT with a mismatched `Content-Type: image/png` against the JPEG-signed URL returns `403 SignatureDoesNotMatch`.

---

## Lesson 3 — Browser PUT, HEAD, then insert

The student completes the upload path so a file picked in the browser streams straight to R2 with a live progress bar and lands as a `file_metadata` row whose size and content type are read back from the object, not trusted from the client.

By the end, choosing a file on `/files` shows a smooth progress bar, the bytes go directly to R2, and one row appears in `file_metadata` with the true size and content type — with one audit entry recorded.

### Your mission

This lesson lands the second half of the two-step write and the browser side that drives it, all at once, because neither piece reaches a confirmable state alone — `finalizeUpload` has nothing to finalize without the form, and the form has nowhere to record the result without `finalizeUpload`. The `file_metadata` table and its migration are provided in the starter (applied by `pnpm db:migrate` in Setup), so this lesson inserts into an existing table rather than authoring one. `finalizeUpload` is the trust boundary: after the browser reports a successful PUT, it HEADs the object to learn the true content length and content type, then inserts the row with those server-observed values inside a `tenantDb` transaction that also writes the audit entry, so the two commit or roll back together. This is where the layered size defense pays off — a client that lied about its size in the signing step is caught here, because the HEAD sees the real bytes; the `unique` constraint on the object key is the second layer, rejecting a replayed finalize. The browser form uses `XMLHttpRequest` rather than `fetch` for one concrete reason — only XHR exposes upload progress to user code — and its PUT must send the exact `Content-Type` that was signed, the common `.JPG`-is-sometimes-`image/pjpeg` trap that surfaces as `403 SignatureDoesNotMatch`. Client-side size and type checks are defense-in-depth for instant feedback, not a substitute for the server boundary. Out of scope: the rendered file list (next lesson) — leave a minimal empty state. Constraints to weave in: the HEAD-then-insert is not transactional with R2 (a microsecond gap, accepted, lifecycle rules cover the orphan case), and a 4xx on the PUT means re-running the whole flow, not reusing the signed URL. Reuse `logAudit` and the `UploadError` codes; the one new browser tool is `XMLHttpRequest`.

- Choosing a valid file on `/files` runs the status through signing → uploading → finalizing → done with a smooth progress bar.
- After a successful upload, one `file_metadata` row exists with `byteSize` and `contentType` taken from the post-upload HEAD and `uploadedBy` set to the current user.
- During a successful upload the function exchanges only small JSON with the two actions while the multi-MB body goes straight to `<bucket>.r2.cloudflarestorage.com`.
- A client that signs a small claimed size and then PUTs an over-cap body is rejected at finalize with `size-mismatch` and no row is inserted.
- Picking an over-cap file is rejected in the browser before any signing call, and a disallowed type is kept out by the file picker.
- Each successful upload records exactly one `file.uploaded` audit entry, committed in the same transaction as the row.
- Serving the app on a host not in the CORS allowlist makes the browser PUT fail, while the allowed `localhost` origin succeeds.

### Coding time

One line directing the student to implement `finalizeUpload` and the upload form against the brief and the tests, then the hidden solution `<details>`.

Reference implementation, organized as in the repo:

- `lib/files/finalize.ts` — Zod `strictObject` input (`uploadId` uuid, `objectKey` non-empty string, `originalFileName`, `contentType` from the enum); `HeadObjectCommand`, catching a 404/`NotFound`/`NoSuchKey` as `UploadError('object-not-found')`; map `head.ContentType !== input.contentType` and `head.ContentLength > MAX_BYTES` to `UploadError('size-mismatch')`; in `tenantDb(ctx.orgId).transaction` insert the row (`id: uploadId`, `uploadedBy: ctx.user.id`, `byteSize`/`contentType` from the HEAD) and `logAudit(tx, { action: 'file.uploaded', ... })`; a unique-key violation maps to `err('conflict', ...)`; return `ok({ fileId: uploadId })`.
- `app/files/upload-form.tsx` — client component, `<input type="file" accept="...">`; status state (`idle | signing | uploading | finalizing | done | failed`) + `Progress` bar; client-side allowlist pre-checks, then `presignedPut`, then an `XMLHttpRequest` PUT (`Content-Type` header set to the file's type, `xhr.upload.onprogress` drives the bar), then `finalizeUpload`, then `router.refresh()` and reset; errors surface `error.userMessage`.
- `app/files/page.tsx` — mount the `UploadForm` above the minimal empty-state list section; full list rendering is next lesson.

Decision rationale to cover: `XMLHttpRequest` over `fetch` for upload progress; the exact-`Content-Type` match and the `.JPG` normalization trap; the HEAD catching a stale `uploadId`/`objectKey` plus the `unique` constraint as layered defense; the non-transactional HEAD-then-insert gap, named and accepted; audit in the same transaction; client validation as defense-in-depth, not duplication; full-flow retry on a 4xx PUT; orphan object on a mid-PUT network drop.

### Moment of truth

Tests cover: a valid upload writes one row with HEAD-sourced size and content type; a lying-size client is rejected at finalize with `size-mismatch` and no row; one `file.uploaded` audit entry per upload.

Run the lesson's test suite (state the command and the expected pass output). Then confirm by hand:

- [ ] A ~1 MB upload runs to `done` with a smooth progress bar.
- [ ] During that upload the Network tab shows a small POST to `presignedPut`, an MB-scale PUT to `r2.cloudflarestorage.com`, and a small POST to `finalizeUpload`.
- [ ] Picking a 30 MB file is rejected client-side with no `presignedPut` call; an `.exe` is excluded by the picker.
- [ ] Serving on `127.0.0.1:3000` (not in the allowlist) makes the browser PUT fail; restoring `localhost` works. (The browser preflight cannot be reproduced with `curl` — this check must run in a browser.)

---

## Lesson 4 — Fresh-per-render GETs

The student renders the `/files` list so each uploaded file shows a working "Download" link, signed fresh on every page render so a link is never stale and never cached.

By the end, an uploaded file appears in the list with a "Download" link that saves under its original name, and a link copied off the page stops working after its 10-minute window while a refresh of the page hands back a fresh, working one.

### Your mission

This lesson closes the user-upload loop with a read surface, and its load-bearing idea is that a presigned URL is a credential with a short life, not a stable address — so the page mints a new one for every row on every render and never stores or caches it. That single decision drives the rest: the `/files` Server Component must not opt into `use cache`, because a cached response would freeze URLs that then expire, leaving the page lying about links that no longer work; signing N URLs per render is fine because `getSignedUrl` is local HMAC with no R2 round trip, so it is effectively free. Reads go through `tenantDb(orgId)` filtered to non-deleted rows, the structural enforcement that one org never sees another's files and that soft-deleted rows stay hidden. The download must save under the user's original file name, which means setting `ResponseContentDisposition` (RFC 5987-encoded `filename*=UTF-8''…`) on the GET — without it the browser saves the opaque object-key segment. Render never audits — auditing is action/task-only, so no `file.list_viewed` event exists; the audit trail picks back up at `finalizeUpload`. The same file also exports a tenant-free `getSignedGetForKey` helper for the worker caller next lesson, which has no request context and signs a raw key. The keyset cursor (`lib/files/cursor.ts`, `{ uploadedAt, id }` base64url, provided) is reused rather than authored here. Out of scope: a soft-delete button (the column and `softDeleteFile` action exist, unused here) and any caching layer (forecast for chapter 072).

- An uploaded file appears as a row in the `/files` list showing its original name, content type (badge), formatted size, and upload time.
- Each row's "Download" link points at a fresh presigned R2 URL and downloading it saves the file under its original name.
- A download URL copied from the page returns `403 AccessDenied` after its 10-minute window passes, while refreshing `/files` yields a different, working URL for the same row.
- A file uploaded by one org is absent from another org's list, and `getFileDownloadUrl` for that file while acting as the other org returns the `not_found` error code (a cross-org id is indistinguishable from a missing file).
- The list renders past the first page through a keyset "Next page" cursor link.
- The render writes no audit entry, regardless of how many rows it signs.

### Coding time

One line directing the student to implement the read helpers and the `/files` server page against the brief and the tests, then the hidden solution `<details>`.

Reference implementation, organized as in the repo:

- `db/queries/file-metadata.ts` — `getFile(orgId, fileId)` and `getFileDownloadUrl(orgId, fileId)` (positional args) read via `tenantDb(orgId)` filtered by `isNull(softDeletedAt)`, return `UploadError('object-not-found')` → `not_found` on no row, and sign `GetObjectCommand` with the RFC 5987 `ResponseContentDisposition` at `expiresIn: 600`; the tenant-free `getSignedGetForKey({ objectKey, expiresIn })` for the worker (no `ResponseContentDisposition`); and `listFiles({ orgId, cursor, limit = 20 })` — `tenantDb(orgId).query.fileMetadata.findMany` with `isNull(softDeletedAt)` plus the decoded `(uploadedAt, id)` keyset predicate, `orderBy: [desc(uploadedAt), desc(id)]`, `limit + 1` for the next-cursor trick.
- `app/files/page.tsx` — Server Component: validate `searchParams.cursor`, call `listFiles`, render a per-row async `FileRow` that signs a fresh `getFileDownloadUrl`, plus the keyset "Next page" link. No audit write; never `use cache`.

Decision rationale to cover: why the page is not `use cache` (cached HTML outlives the URL); N signs per render is not a hot spot; `ResponseContentDisposition` and the RFC 5987 encoding; `isNull(softDeletedAt)` as the soft-delete read discipline (chapter 062's base-query helper would normally own this — link); the provided file-local cursor versus chapter 041's hardcoded one; render does not audit — auditing is action/task-only.

### Moment of truth

Tests cover: an uploaded file appears in its org's list and not another org's; `getFileDownloadUrl` returns `not_found` across orgs; the keyset cursor advances past the first page.

Run the lesson's test suite (state the command and the expected pass output). Then confirm by hand:

- [ ] The file uploaded last lesson appears in the list; clicking "Download" saves it under its original name.
- [ ] Viewing source shows real `https://<bucket>.r2.cloudflarestorage.com/...?X-Amz-Signature=...` hrefs.
- [ ] Copy an href, wait 11 minutes, open it in a new tab — `403 AccessDenied (Request has expired)`. Refresh `/files` — the same row's href is different and works. (This is the chapter's headline proof; run the timer in real time or fast-forward the clock. Skipping it leaves a student who believes a signed URL survives a long page session.)

---

## Lesson 5 — Real downloadUrl for the export

The student retrofits the chapter 067 CSV export so its email carries a real, working R2 download link instead of the placeholder, proving the same `lib/r2.ts` powers a worker doing a server-side PUT.

By the end, triggering an export from `/inspector` produces a real R2 object, the completion panel and the email both link to it, and clicking within the window downloads the CSV — with no `file_metadata` row written for the export.

### Your mission

This lesson closes the project by reusing every primitive from the other side of the trust boundary. The chapter 067 export already accumulates the CSV in memory; the retrofit writes those bytes to R2 with a server-side `PutObjectCommand` at key `exports/org/<orgId>/<runId>.csv`, signs a download URL with the tenant-free `getSignedGetForKey` helper, and hands it to the existing export email. This is the one place in the project where a function sees the bytes, and that is correct: the byte-pipe rule is browser-PUT for user-facing flows, server-PUT for workers, which have no browser to offload to. Exports are throwaway artifacts, so they get no `file_metadata` row — a 7-day lifecycle rule scoped to the literal `exports/` prefix (`scripts/r2-lifecycle.ts`) handles cleanup, and you confirm the rule by logging the effective rules rather than waiting a week. The export and the user uploads share one bucket; the prefix, not a separate bucket, carries the workload split. Constraints to weave in: the 10-minute GET expiry means a user opening the email an hour later gets a dead link, and the senior call is re-trigger rather than a longer-lived URL; the in-memory CSV is bounded by page count times page size, fine at project scale but a switch to multipart streaming past ~100 MB, named not built; and the R2 write must sit at the end of the resumed parent run so the chapter 067 kill-resume idempotency still holds. Out of scope: any change to the pagination loop or the email template. Reuse `getSignedGetForKey`, the chapter 067 `metadata.set` and `sendExportEmail` plumbing (its payload already accepts the URL), and the same `lib/r2.ts` client.

- Triggering an export writes one R2 object at `exports/org/<orgId>/<runId>.csv` via a server-side PUT.
- The export completion panel on `/inspector` renders the download URL as a real R2 link that downloads the CSV when clicked, named `export-<day>.csv`.
- The export email arrives carrying the same URL, and clicking it within the 10-minute window downloads the CSV.
- The export writes no `file_metadata` row — `select count(*) from file_metadata where object_key like 'exports/%'` returns 0.
- The 7-day lifecycle rule on the `exports/` prefix is present (confirmed by logging the effective rules).
- Killing the trigger mid-run and restarting still produces exactly one CSV, one email, and one audit entry, with the R2 PUT happening once at the end of the resumed parent.

### Coding time

One line directing the student to retrofit `trigger/export-invoices.ts` against the brief and the tests, then the hidden solution `<details>`.

Reference implementation: after the page loop, `Buffer.from(csvAccumulator)`, a server-side `PutObjectCommand({ Bucket, Key: \`exports/org/${organizationId}/${ctx.run.id}.csv\`, Body, ContentType: 'text/csv', ContentDisposition: \`attachment; filename="export-${dayBucket()}.csv"\` })`, then `getSignedGetForKey({ objectKey, expiresIn: 600 })`, `metadata.set('downloadUrl', ...)`, and the URL passed to `sendExportEmail`. No `file_metadata` row. Lifecycle configured via `pnpm r2:lifecycle` (script provided).

Decision rationale to cover: the server-PUT-for-workers rule (link to chapter 068 lesson 5); same bucket, prefix carries the split; the 10-minute expiry trade-off and the re-trigger answer; in-memory CSV bounds and the multipart escape hatch, named not built; the same `lib/r2.ts` driving two consumers; `getSignedGetForKey` taking a raw key because the worker has no request context; the PUT placed so the chapter 067 cross-step idempotency holds (link to chapter 067).

### Moment of truth

Tests cover: the export writes an object under the exports prefix and no `file_metadata` row; the export email and metadata carry the same signed URL; the kill-resume drill yields one object, one email, one audit entry.

Run the lesson's test suite (state the command and the expected pass output). Then confirm by hand:

- [ ] Trigger an export from `/inspector`; the panel shows a real R2 `downloadUrl`; clicking it downloads `export-<day>.csv`.
- [ ] The email arrives in the Resend-verified inbox with the same URL; clicking within 10 minutes downloads the CSV.
- [ ] `select count(*) from file_metadata where object_key like 'exports/%'` returns 0.
- [ ] Run the chapter 067 kill-resume drill — Ctrl-C the trigger CLI at `pagesDone: 2/7`, restart — and confirm the export resumes, the PUT happens once at the end, and the result is one CSV, one email, one audit row.

This is the last lesson, so it also closes the project. The audit log now carries `file.uploaded` per upload (from `finalizeUpload`) and `export.invoices.completed` per export run (from the worker, written with `actorUserId: null` because a task has no session) — confirmable with `select action, count(*) from audit_logs group by action`. The `/files` render writes no audit row, and `file.soft_deleted` exists in the API but is not exercised here. The senior calls the student should be able to articulate: the function never sees bytes for user uploads; the two-step write; size and content type from the HEAD, not the client; the server-constructed object key; fresh-per-render GETs that are never persisted or cached; tenancy at every read; one bucket per environment with prefixes carrying the workload split and one `lib/r2.ts` for both consumers; `file_metadata` for user uploads versus no row plus a lifecycle rule for exports; CORS scoped to a specific origin. Forward references worth naming: Unit 13's notification dispatcher can fire on `file.uploaded`; Unit 15a may cache one layer up at the metadata read if volume demands while `/files` itself stays uncached; Unit 16 treats the layered size defense, CORS specificity, and `deletedAt` reads as audit line items; Unit 20 rotates R2 credentials under staged-rollover discipline; and a custom avatar field (forward note) reuses this chapter's shape with the content type restricted to images.
