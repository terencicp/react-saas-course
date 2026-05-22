# Chapter 069 — Project: presigned R2 upload

## Chapter framing

Chapter 069 cashes in the chapter 068 primitives — scoped credentials and CORS (lesson 2 of chapter 068), presigned PUT/GET with the two-step write (lesson 3 of chapter 068), the `file_metadata` row shape with tenancy at the read boundary (lesson 4 of chapter 068), the workload split between user uploads and export outputs (lesson 5 of chapter 068) — and lands them as one runnable upload surface. The student writes the `presignedPut` Server Action that signs against R2 without piping bytes through the function, the browser-side direct-to-R2 PUT with XHR progress, the `finalizeUpload` action that HEADs the object and inserts the row, the `Files` list rendering rows with fresh per-render presigned GETs, and the retrofit on the chapter 067 export job so the `console.log`-shaped `downloadUrl` becomes a real R2 object and the email's link is a 10-minute presigned GET. Each build lesson closes on a runnable state: lesson 3 of chapter 069 ends with a fireable action verified by `curl`-PUT; lesson 4 of chapter 069 ends with the browser upload landing the bytes and the row; lesson 5 of chapter 069 ends with the `Files` page rendering downloads; lesson 6 of chapter 069 ends with the export emailing a working R2 link. Verify walks the "Done when" clause-by-clause, including the long-tail proof — a refresh 11 minutes later still works because GETs are re-issued per render.

Threads through every lesson: the function never sees the bytes for user uploads — Network tab shows small JSON to/from the action and the multi-MB PUT going straight to `${bucket}.r2.cloudflarestorage.com`; the two-step write is structural — sign → upload → finalize-with-HEAD → row insert, never row-before-upload; `objectKey` is server-constructed (`org/${organizationId}/files/${rowId}.${ext}`), never client-supplied; `byteSize` and `contentType` come from the post-upload `HeadObjectCommand`, not the client's claim; presigned GETs are fresh-per-render, never persisted, never cached past expiry; tenancy is enforced at every read via `tenantDb(orgId)` and at the action via `authedAction('member', ...)`; `lib/r2.ts` is constructed once and powers both consumers (browser-PUT user uploads, server-PUT export retrofit) — one mechanism, two consumers.

### Dependency carry-in

- **From lesson 2 of chapter 068:** the bucket with CORS for `http://localhost:3000` allowing `GET`/`PUT`/`Content-Type`; scoped token with Object Read + Object Write; env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; `lib/r2.ts` with `S3Client({ region: 'auto', endpoint, credentials })`.
- **From lesson 3 of chapter 068:** `getSignedUrl` + `PutObjectCommand`/`GetObjectCommand`, 5-min PUT expiry / 10-min GET expiry, layered size defense, content-type allowlist, two-step write, CORS preflight failure shape.
- **From lesson 4 of chapter 068:** the row shape (`id` UUIDv7 as key segment, `organizationId`, `uploadedBy`, `objectKey` unique, `originalFileName`, `contentType`, `byteSize`, `uploadedAt`, `deletedAt`); index `(organizationId, deletedAt, uploadedAt desc, id desc)`; no-`url`-column rule.
- **From lesson 5 of chapter 068:** user uploads use `file_metadata` + browser PUT + soft-delete; exports use no metadata row + server-side worker PUT + lifecycle-rule cleanup; lesson 6 of chapter 069 retrofits the export to write `org/${orgId}/exports/${runId}.csv`.
- **From chapter 067:** the `exportInvoices` parent task with the paginate-page loop, `metadata.set('downloadUrl', ...)`, `sendExportEmail` child accepting `downloadUrl`, the inspector reading `run.metadata`.
- **From chapter 050:** `sendEmail` in `lib/email.ts`; `ExportReadyEmail` template taking `{ orgName, rowCount, downloadUrl }`.
- **From chapter 056/chapter 057:** `tenantDb(orgId)`; `authedAction('member', schema, fn)`; `audit_logs` with `logAudit(tx, event)`.
- **From chapter 043:** canonical Result shape; Zod validation at the action boundary.
- **From chapter 032/chapter 072:** the `Files` list is *not* `use cache` — presigned GETs are per-render-fresh and would poison a cached response.
- **From chapter 061:** `deletedAt` discipline.
- **From chapter 016:** file picker, MIME/size validation, blob URL preview — thread closed here.
- **From chapter 009:** `UploadError` subclass with codes `unsupported-type | too-large | size-mismatch | object-not-found`.

### Starter file tree (stubs marked TODO)

```
docker-compose.yml             # provided
drizzle.config.ts              # provided
trigger.config.ts              # provided (from chapter 067)
.env.example                   # provided: chapter 067 vars + R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME
package.json                   # provided: chapter 067 scripts + r2:cors, r2:lifecycle
scripts/
  seed.ts                      # provided: orgs + invoices from chapter 067; no file_metadata rows
  r2-cors.ts                   # provided: PutBucketCors with the CORS JSON
  r2-lifecycle.ts              # provided: 7-day rule on org/*/exports/*
src/
  db/schema.ts                 # provided: chapter 067 schema; file_metadata TODO student
  lib/
    tenant-db.ts               # provided
    authed-action.ts           # provided
    audit-log.ts               # provided
    email.ts                   # provided
    r2.ts                      # provided: S3Client + ALLOWED_CONTENT_TYPES + MAX_BYTES
    files/
      keys.ts                  # provided: buildObjectKey({ orgId, fileId, contentType })
      errors.ts                # provided: UploadError class
      presigned-put.ts         # TODO student: presignedPut authedAction
      finalize.ts              # TODO student: finalizeUpload authedAction
      presigned-get.ts         # TODO student: getFileDownloadUrl + getSignedGetForKey helpers
      list.ts                  # TODO student: listFiles({ orgId, cursor })
      soft-delete.ts           # provided: softDeleteFile (named, not exercised)
    invoices/                  # provided (chapter 067)
    exports/                   # provided (chapter 067) — student edits in lesson 6 of chapter 069
  trigger/
    export-invoices.ts         # provided (chapter 067) — student edits in lesson 6 of chapter 069
    paginate-page.ts           # provided (chapter 067)
    send-export-email.ts       # provided (chapter 067) — payload already accepts downloadUrl
  emails/ExportReadyEmail.tsx  # provided (chapter 067)
  app/
    files/
      page.tsx                 # TODO student: server-rendered list + presigned GETs
      upload-form.tsx          # TODO student: client component + XHR + progress + finalize
    inspector/page.tsx         # provided: chapter 067 surface + downloadUrl renders as clickable link
```

### Reference solution signatures lessons display

- **`lib/r2.ts`** (provided) — exports `r2: S3Client`, `BUCKET: string`, `ALLOWED_CONTENT_TYPES` (`as const` tuple of `image/png | image/jpeg | image/webp | application/pdf | text/csv`), `MAX_BYTES = 25 * 1024 * 1024`.
- **`buildObjectKey`** (provided) — `({ orgId, fileId, contentType }) => \`org/${orgId}/files/${fileId}.${extFor(contentType)}\``. Extension comes from the validated content type via a static map; never from the user's filename.
- **`presignedPut`** — `authedAction('member', z.strictObject({ fileName: z.string().min(1).max(255), contentType: z.enum(ALLOWED_CONTENT_TYPES), claimedSize: z.int().positive().max(MAX_BYTES) }), async (input, ctx): Promise<Result<{ uploadId, url, objectKey }>>)`. Generates `uploadId = uuidv7()`, builds `objectKey`, signs `PutObjectCommand({ Bucket, Key: objectKey, ContentType, ContentLength: claimedSize })` with `expiresIn: 300`. No DB write.
- **`finalizeUpload`** — `authedAction('member', z.strictObject({ uploadId: z.uuid(), objectKey: z.string(), originalFileName: z.string().min(1).max(255), contentType: z.enum(ALLOWED_CONTENT_TYPES) }), ...): Promise<Result<{ fileId }>>`. HEADs the object (`object-not-found` on 404), asserts `head.ContentType === input.contentType`, asserts `head.ContentLength <= MAX_BYTES` (`size-mismatch` otherwise). In `tenantDb(ctx.orgId).transaction`: inserts the row with `id: uploadId`, `byteSize: head.ContentLength`, `contentType: head.ContentType`; writes `audit_logs` `file.uploaded`.
- **`getFileDownloadUrl`** — `({ fileId }, ctx): Promise<Result<{ url, fileName, contentType }>>`. Reads via `tenantDb(ctx.orgId)` filtered by `isNull(deletedAt)`. Signs `GetObjectCommand({ Bucket, Key: row.objectKey, ResponseContentDisposition: \`attachment; filename="${encodeRFC5987(row.originalFileName)}"\` })` with `expiresIn: 600`.
- **`getSignedGetForKey`** — pure helper, `({ objectKey, expiresIn }) => Promise<{ url }>`. No tenant check — caller is a worker, inside the trust boundary.
- **`listFiles`** — `({ orgId, cursor, limit = 20 }) => Promise<{ rows, nextCursor }>`. `tenantDb(orgId).fileMetadata.findMany` with `isNull(deletedAt)`, `orderBy: [desc(uploadedAt), desc(id)]`, `limit + 1` n+1 trick.
- **`file_metadata` table** — `id uuid pk` (UUIDv7), `organizationId uuid not null references organizations(id) on delete cascade`, `uploadedBy uuid not null references users(id) on delete restrict`, `objectKey text not null unique`, `originalFileName text not null`, `contentType text not null`, `byteSize bigint not null check (byteSize >= 0)`, `uploadedAt timestamptz not null default now()`, `deletedAt timestamptz`. Index: `(organizationId, deletedAt, uploadedAt desc, id desc)`.
- **CORS JSON** — `[{ AllowedOrigins: [env.APP_URL], AllowedMethods: ['GET', 'PUT'], AllowedHeaders: ['content-type'], ExposeHeaders: ['etag'], MaxAgeSeconds: 3600 }]`.
- **`upload-form.tsx`** — `XMLHttpRequest` for the R2 PUT (so `xhr.upload.onprogress` fires); `fetch` for the two Server Action calls.
- **Export retrofit** — after the page loop, `Buffer.from(csvAccumulator)`, `r2.send(new PutObjectCommand({ Bucket, Key: \`org/${organizationId}/exports/${ctx.run.id}.csv\`, Body, ContentType: 'text/csv', ContentDisposition: \`attachment; filename="export-${dayBucket()}.csv"\` }))`, then `getSignedGetForKey({ objectKey, expiresIn: 600 })` → pass `downloadUrl` to `sendExportEmail`. No `file_metadata` row.
- **Env** — carried from lesson 2 of chapter 068.

### Inspector / Files page spec

**`/files` page (TODO student).**

- **Upload form** (client component): `<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/csv">`; XHR progress bar; status `idle | signing | uploading | finalizing | done | failed`; error from `error.userMessage`. On success, `router.refresh()`.
- **List** (server component): table with `originalFileName`, `contentType` badge, formatted `byteSize`, humanized `uploadedAt`, `"Download"` link whose `href` is the fresh presigned GET. Empty state when no rows. Cursor "Next page" link.
- **No `use cache`** — fresh-per-render is structural here.

**`/inspector` page** (provided, from chapter 067 + one addition): the run-status panel renders `metadata.downloadUrl` as a clickable link once the export completes.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| 5 MB file uploaded lands in R2 + `file_metadata` row written | Upload `fixtures/sample-5mb.jpg` from `/files`. Confirm one R2 object at `org/<orgId>/files/<uuid>.jpeg` and one row with matching `objectKey`, `byteSize ≈ 5242880`, `contentType: 'image/jpeg'`. |
| `Files` list renders rows with working download | List shows the row; click "Download"; browser saves as `sample-5mb.jpg` (from `Content-Disposition`). |
| Download works after the GET window | View source, copy a `href`. Wait 11 minutes. Copied URL returns `403 AccessDenied`. Refresh `/files` — same row's `href` is different; click — works. **Load-bearing proof.** |
| chapter 067 export emails a working R2 link | Trigger export. Inspector shows `downloadUrl` as a real R2 link. Email arrives with same URL — click within 10 minutes — CSV downloads. |
| Function never sees the bytes (user uploads) | Network tab: `presignedPut` POST ~400 B response; PUT to `<bucket>.r2.cloudflarestorage.com` carries the MB body; `finalizeUpload` POST ~100 B response. |
| Payload validation at the action boundary | `presignedPut({ contentType: 'application/octet-stream', ... })` → `{ ok: false, error: { code: 'invalid-input' } }`; no R2 call. Same for `claimedSize > MAX_BYTES`. |
| Tenancy at GET boundary | Upload in org A; switch to org B. `getFileDownloadUrl({ fileId: <orgA-id> })` → `{ ok: false, error: { code: 'object-not-found' } }`. |
| HEAD-based size verification | Debug helper: `claimedSize: 1024`, PUT 10 MB body. R2 accepts. `finalizeUpload` HEADs, sees 10 MB, throws `size-mismatch`. No row inserted. |
| CORS in the browser | Serve on `127.0.0.1:3000` (not allowed). PUT preflight 403 (R2-side). Restore `localhost` — works. |
| No `file_metadata` for exports | `select count(*) from file_metadata where object_key like 'org/%/exports/%'` → 0. |

### Concepts demonstrated → owning lesson

- Threshold for object storage, R2 vs. S3 — lesson 1 of chapter 068.
- Bucket + scoped credentials + CORS, S3-compatible endpoint, `region: 'auto'` — lesson 2 of chapter 068.
- Presigned PUT/GET mechanics, `ContentType`/`ContentLength` pinning, expiry trade-offs — lesson 3 of chapter 068.
- Two-step write, layered size defense, R2-specific `ContentLength` non-enforcement — lesson 3 of chapter 068.
- `file_metadata` shape, `id` as key segment, no-`url`-column rule — lesson 4 of chapter 068.
- Tenancy at read via `tenantDb(orgId)`, audit on upload/download/delete — lesson 4 of chapter 068 / chapter 056 / chapter 057.
- Soft delete with cooled-off cleanup (named) — lesson 4 of chapter 068 / chapter 061.
- One bucket two prefixes, browser-vs-worker byte-pipe rule — lesson 5 of chapter 068.
- `authedAction('member', ...)` — chapter 057. Result shape — chapter 043. Zod validation — chapter 042/chapter 043.
- `XMLHttpRequest` for upload progress — closes chapter 016.
- Principle #3 (named seams in `lib/files/`) — chapter 035/chapter 043. Principle #5 (R2 SDK at the call site) — lesson 2 of chapter 068.

---

## Lesson 1 — Brief and Done-when

Frames the runnable upload surface, locks the "Done when" clauses (5 MB lands, list downloads, 11-minute-later refresh still works, export emails a real R2 link), and names the scope cuts (no transforms, no multipart, no virus scan, no soft-delete UI).

Goals:

- Frame the build: direct-browser-to-R2 upload with `Files` list, plus the chapter 067 export retrofit so the email carries a real R2 link. One screenshot: `/files` with form, progress mid-flight, list of completed rows.
- State the "Done when" in one paragraph (5 MB lands and writes row, list renders downloads, refresh 11 min later still works because URL re-issues, export emails working R2 link, function never sees user-upload bytes, tenancy holds, layered size defense catches a lying client).
- Scope cuts: no image transformation (Cloudflare Images, named once); no multipart for >100 MB (25 MB cap); no virus scanning (named); no client preview past file-picker echo; no soft-delete UI in this chapter (action exists, column verified); no orphan-cleanup sweep (forward note).
- Senior payoff: the canonical R2 shape every later upload feature copies — `lib/r2.ts` once, presigned PUT, two-step write with HEAD, fresh-per-render GETs, `file_metadata` as canonical identity. The retrofit on chapter 067 proves the same primitives work from a worker with server-side PUT.
- Show the end UX: an animated capture of choose-file → progress → row appears → download → export fires → email arrives → click email → CSV opens.
- Link the starter via `degit`.

Senior calls and watch-outs:

- R2 account, bucket, scoped token, and CORS must be set up first (one-time). Starter ships env keys; student's account fills values. `pnpm r2:cors` runs once per environment before the first browser upload, or the preflight fails.
- Starter inherits chapter 067's Trigger.dev project. lesson 6 of chapter 069 needs both `pnpm trigger:dev` and `pnpm dev` in two terminals.
- 25 MB cap is a course choice; production often allows 100 MB+ via multipart. The cap is the simplest defense against the size-bomb attack the verify exercises.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, deps installed, Postgres up, chapter 067 schema migrated and seeded, R2 bucket/token/env created, `pnpm r2:cors` run, `/files` renders empty list with broken form, `/inspector` carries the chapter 067 surface.

Estimated student time: 20 to 30 minutes.

---

## Lesson 2 — Tour the starter

Walks the provided pieces (singleton `lib/r2.ts`, pure `buildObjectKey` keyed off the validated content type, `UploadError` codes, idempotent CORS script) and identifies the five `lib/files/` TODOs plus the two `app/files/` TODOs the student will fill in.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on the five TODO files in `lib/files/` and the two in `app/files/`. The chapter 067 task files are provided in full chapter 067 form; student edits them in lesson 6 of chapter 069.
- Read the provided pieces: `lib/r2.ts` (singleton `S3Client` + constants), `lib/files/keys.ts` (pure `buildObjectKey` — extension from the validated content type, never from the user filename), `lib/files/errors.ts` (the four error codes), `lib/files/soft-delete.ts` (named, not exercised), `scripts/r2-cors.ts` (CORS JSON per lesson 2 of chapter 068). Confirm `pnpm r2:cors` ran successfully.
- Read `app/inspector/page.tsx` — the chapter 067 surface intact, the new "downloadUrl as clickable link" rendering provided.
- Bring up the dev rhythm: `pnpm trigger:dev` in one terminal, `pnpm dev` in another. Visit `/files`: form renders, picking a file does nothing (action empty). Visit `/inspector`: chapter 067 surface works (export still produces `console.log`-shaped placeholder, not R2 yet).

Senior calls and watch-outs:

- `lib/r2.ts` is constructed once and imported everywhere — the same discipline as `lib/db.ts`, `lib/resend.ts`. Per-request construction churns the connection pool. Principle #5 — no wrapping past the call site.
- `ALLOWED_CONTENT_TYPES` is reused at the Zod boundary so the allowlist is one source of truth. Drift between Zod and the bucket policy is the kind of bug structural uniqueness prevents.
- `buildObjectKey` takes `contentType` and looks up the extension via a static map. User filenames are untrusted.
- `pnpm r2:cors` is idempotent — re-running overwrites the same rules. The script logs after the push so the student can eyeball-confirm `AllowedOrigins: ['http://localhost:3000']` (not `'*'`).

Codebase state at entry: starter cloned, deps installed, R2 set up.
Codebase state at exit: student has read every provided file, confirmed both terminals running, confirmed CORS rules, visited both pages. No code written.

Estimated student time: 20 to 30 minutes.

---

## Lesson 3 — Sign the PUT, no DB write

Builds the `presignedPut` Server Action with Zod-validated input, server-generated `uploadId`, a server-constructed `objectKey`, and a 5-minute signed `PutObjectCommand`, verified end-to-end by `curl`-PUTting bytes straight to R2.

Goals:

- Write `lib/files/presigned-put.ts` per the reference signature. The action: Zod input (`fileName`, `contentType` from the enum, `claimedSize` positive int ≤ `MAX_BYTES`); generates `uploadId = uuidv7()`; builds `objectKey = buildObjectKey({ orgId: ctx.orgId, fileId: uploadId, contentType })`; signs `PutObjectCommand` with `Bucket`, `Key: objectKey`, `ContentType`, `ContentLength: claimedSize` at `expiresIn: 300`; returns `{ ok: true, data: { uploadId, url, objectKey } }`.
- The action does **no** DB write. The row lands in `finalizeUpload` *after* the bytes are confirmed in R2.
- Verify without writing the client yet:
  - From the browser console: `await presignedPut({ fileName: 'sample.jpg', contentType: 'image/jpeg', claimedSize: 5_000_000 })` returns `{ ok: true, data: { uploadId, url: 'https://<bucket>.r2.cloudflarestorage.com/...?X-Amz-Signature=...', objectKey } }`.
  - `curl -X PUT -H "Content-Type: image/jpeg" --data-binary @some.jpg "<url>"` returns 200. R2 dashboard shows the object at `org/<orgId>/files/<uploadId>.jpeg`. **Proof that the byte-pipe rule holds — no function in the call.**
  - `curl`-PUT with mismatched `Content-Type: image/png` against the JPEG-signed URL — R2 returns 403 `SignatureDoesNotMatch`.
  - `presignedPut({ contentType: 'application/octet-stream' })` → `{ ok: false, error: { code: 'invalid-input' } }` from the Zod parse. No R2 call.
  - `presignedPut({ claimedSize: 100_000_000 })` (exceeds `MAX_BYTES`) → same.

Senior calls and watch-outs:

- `uploadId` is server-generated, never client-supplied. Letting the client choose the ID is the tenancy-bypass shape — a crafted UUID could clobber an existing row in `finalizeUpload`.
- `ContentLength` is signed but R2 does not enforce it server-side (the lesson 3 of chapter 068 quirk). Signing is still correct — it documents intent and matches the AWS SDK shape — but the *enforcement* is the post-upload HEAD in `finalizeUpload`.
- 5-min `expiresIn` is the trade-off — long enough for 25 MB on a slow connection (the client can also re-sign on retry), short enough that leaks don't grant indefinite write.
- Role is `member`, not `admin`. The function-level gate is the structural defense — R2 credentials are app-wide.
- Students often want to "reserve" a row with `status: pending`. The senior call: no row until the bytes are confirmed. Orphan rows lie in the UI; orphan objects are cheap to clean.
- `'invalid-input'` is mapped at the `authedAction` boundary (from Unit 9), not by the action body.

Codebase state at entry: empty `presigned-put.ts`.
Codebase state at exit: `presignedPut` works end-to-end against R2 (verified via `curl`); payload validation rejects bad inputs; no client-side upload yet. **Runnable — action fires; next lesson wires the browser.**

Estimated student time: 45 to 60 minutes.

---

## Lesson 4 — Browser PUT, HEAD, then insert

Lands the `file_metadata` migration, the `finalizeUpload` action that HEADs the object for true size and content-type before inserting the row inside a `tenantDb` transaction, and the XHR-driven client form that streams bytes direct to R2 with a live progress bar.

Goals:

- Write the `file_metadata` migration. Add the table to `db/schema.ts` per the reference. Run `pnpm db:generate --name add_file_metadata`, inspect emitted SQL, run `pnpm db:migrate`. Confirm in Studio.
- Write `lib/files/finalize.ts`: Zod input (`uploadId` uuid, `objectKey`, `originalFileName`, `contentType` from the enum). `r2.send(new HeadObjectCommand({ Bucket, Key: objectKey }))` — catch 404 → `UploadError('object-not-found')`. Assert `head.ContentType === input.contentType`. Assert `head.ContentLength <= MAX_BYTES` → `size-mismatch` otherwise. In `tenantDb(ctx.orgId).transaction`: insert the row with `id: input.uploadId`, `uploadedBy: ctx.user.id`, `byteSize: head.ContentLength`, `contentType: head.ContentType`; call `logAudit(tx, { action: 'file.uploaded', subjectType: 'file', subjectId: input.uploadId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { byteSize: head.ContentLength, contentType: head.ContentType } })`. Return `{ ok: true, data: { fileId: uploadId } }`.
- Write `app/files/upload-form.tsx` as a client component: `<input type="file" accept="...">` + `useRef`; status `useState` (`idle | signing | uploading | finalizing | done | failed`) + progress (0-100); on submit, client-side validation (`file.size <= MAX_BYTES`, `file.type` in allowlist) → `'signing'`, call `presignedPut` → `'uploading'`, create `XMLHttpRequest`, `xhr.open('PUT', data.url)`, `xhr.setRequestHeader('Content-Type', file.type)` (must match signed `ContentType`), `xhr.upload.onprogress` drives the bar, `xhr.send(file)`; on PUT 200 → `'finalizing'`, call `finalizeUpload` with the `uploadId` + `objectKey` + `originalFileName` + `contentType`; on success → `'done'`, `router.refresh()`, reset after 2s.
- Pre-fill the `/files` page list section with a minimal empty state. Full list rendering is lesson 5 of chapter 069.
- Verify: 1 MB upload runs to `done`, progress bar smooth; refresh shows empty list still (next lesson). 30 MB picks rejects client-side, no `presignedPut` call. `.exe` filtered by `accept` (or rejected by client validation on drag-drop). Network tab during success: small POST to `presignedPut`, MB-scale PUT to `r2.cloudflarestorage.com`, small POST to `finalizeUpload`. **Byte-pipe verification — function-side bytes, not megabytes.** `audit_logs` has one `file.uploaded` row.

Senior calls and watch-outs:

- Migration adds the table; re-running `db:generate` emits "no changes" (determinism signal from chapter 040).
- `XMLHttpRequest` over `fetch` for one reason — `xhr.upload.onprogress` fires per chunk; `fetch` does not expose upload progress to user code.
- PUT's `Content-Type` must match the signed one *exactly*. Common bug: `.JPG` is `image/jpeg` on some OSes, `image/pjpeg` on others. Symptom: `403 SignatureDoesNotMatch`. Fix: normalize via the allowlist before signing.
- `finalizeUpload` HEADs to catch a malicious client calling with a stale `uploadId`/`objectKey` from a previous flow. The `unique` constraint on `objectKey` also rejects a duplicate row insert. Layered defense.
- HEAD-then-insert is not transactional with R2 — between HEAD and insert, the object could (in principle) be deleted. Microsecond gap, lifecycle rules are 7-day prefix-scoped. Named, accepted.
- `audit_logs` writes are in the same `tenantDb(orgId).transaction` as the row insert — both roll back together.
- Client-side validation duplicates the server-side allowlist — defense-in-depth, not duplication smell. Client = instant feedback; server = trust boundary.
- 4xx on PUT triggers full-flow retry (re-sign + re-upload), not PUT-only. Reusing a signed URL after a 4xx is undefined.
- Network drop or tab close mid-PUT leaves an orphan object (lifecycle cleanup).

Codebase state at entry: `presignedPut` works; no migration, no `finalizeUpload`, no client form.
Codebase state at exit: full upload flow end-to-end — file picked, progress, row in `file_metadata`, bytes in R2, audit logged. List still empty (next lesson). **Runnable — uploads work.**

Estimated student time: 75 to 90 minutes. The chapter's heaviest lesson — migration + action + client land together because each one alone is not runnable.

---

## Lesson 5 — Fresh-per-render GETs

Writes `getFileDownloadUrl`, `listFiles`, and the un-cached `/files` server component that signs a new GET per row per render, then proves the discipline by watching a copied URL die at 11 minutes while a refreshed page keeps working.

Goals:

- Write `lib/files/presigned-get.ts`: read the row via `tenantDb(ctx.orgId)` filtered by `isNull(deletedAt)`; on no row → `{ ok: false, error: { code: 'object-not-found' } }`; sign `GetObjectCommand({ Bucket, Key: row.objectKey, ResponseContentDisposition: \`attachment; filename="${encodeRFC5987(row.originalFileName)}"\` })` at `expiresIn: 600`; return `{ url, fileName: row.originalFileName, contentType: row.contentType }`. Also export `getSignedGetForKey({ objectKey, expiresIn })` — pure, no tenant check, for the worker caller in lesson 6 of chapter 069.
- Write `lib/files/list.ts`: `tenantDb(orgId).fileMetadata.findMany({ where: isNull(deletedAt), orderBy: [desc(uploadedAt), desc(id)], limit: limit + 1 })`. Cursor decode/encode lives in a new `lib/files/cursor.ts` with shape `{ uploadedAt: string; id: string }` (base64url-encoded JSON, Zod-validated) — `db/cursor.ts` from chapter 041 hardcodes `createdAt` and is not reusable here.
- Write `app/files/page.tsx` as a Server Component: read `searchParams.cursor` (Zod-validated); call `listFiles`; for each row call `getFileDownloadUrl({ fileId: row.id })` to attach a fresh signed URL (**N signing calls per page render**, ~microseconds each, no R2 round trip); render the table; render `"Next page"` link with `nextCursor`. Call `logAudit(tx, { action: 'file.list_viewed', subjectType: 'file', subjectId: 'list', actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { fileIds } })` once per page render (batched — one row per view, not per signed URL).
- Verify: upload from lesson 4 of chapter 069 now appears; click "Download" → fetches via presigned GET; saves as `originalFileName`. View source — `href`s are real `https://<bucket>.r2.cloudflarestorage.com/...?X-Amz-Signature=...` URLs. **Fresh-per-render proof:** copy a URL, wait 11 minutes, paste in new tab — `403 AccessDenied`. Refresh `/files` — same row's `href` is different; click — works. **Senior anchor of the chapter.** Cross-org test: upload in A, switch to B, `/files` empty; `getFileDownloadUrl({ fileId: <A-id> })` → `object-not-found`.

Senior calls and watch-outs:

- Page is **not** `use cache`. Caching serves stale presigned URLs; the URL expires, the cached HTML lies. Fresh-per-render belongs at the boundary; cache lives one layer up (forecasts chapter 072).
- N signing calls per render is not a hot spot — `getSignedUrl` is local HMAC, no R2 round trip. Signing is free; R2 round trips are not.
- `ResponseContentDisposition` overrides the default. Without it, the browser saves as the `objectKey` segment (`<uuid>.jpeg`). Must be RFC 5987-encoded for non-ASCII names (`encodeRFC5987` helper provided).
- `isNull(deletedAt)` is the structural enforcement of soft-delete hiding. The base-query helper from chapter 062 would normally enforce this; the project has one read shape so the manual `isNull` is the discipline.
- Cursor shape is `{ uploadedAt, id }` (file-local, in `lib/files/cursor.ts`) — `(uploadedAt desc, id desc)` matched by the composite index. chapter 041's `db/cursor.ts` is `createdAt`-hardcoded and not reusable for an `uploadedAt` payload.
- Audit at the user action (visit), not the derived effect (sign N URLs). Cardinality choice.

Codebase state at entry: uploads work, no list.
Codebase state at exit: full upload + list flow — pick, upload, see row, download, get the file. Multi-tenancy verified, URL freshness verified. **Runnable end-to-end for user uploads.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 6 — Real downloadUrl for the export

Retrofits the chapter 067 export task to do a server-side `PutObjectCommand` under the `org/<id>/exports/` prefix, hand a fresh `getSignedGetForKey` URL to the email, and rely on the lifecycle rule for cleanup with no `file_metadata` row written.

Goals:

- Edit `trigger/export-invoices.ts`. After the page loop accumulates `csvAccumulator`: `const buffer = Buffer.from(csvAccumulator, 'utf8'); const objectKey = \`org/${organizationId}/exports/${ctx.run.id}.csv\`; await r2.send(new PutObjectCommand({ Bucket, Key: objectKey, Body: buffer, ContentType: 'text/csv', ContentDisposition: \`attachment; filename="export-${dayBucket()}.csv"\` }))`. **Server-side PUT** — bytes pass through this Trigger.dev worker, which is correct per lesson 5 of chapter 068.
- `const { url: downloadUrl } = await getSignedGetForKey({ objectKey, expiresIn: 600 })`. `metadata.set('downloadUrl', downloadUrl)`. Pass `downloadUrl` to `sendExportEmail.triggerAndWait({ ..., downloadUrl })` (payload schema already accepts it from chapter 067).
- **No `file_metadata` row** — exports are short-lived; lifecycle rule (7-day) on `org/*/exports/*` handles cleanup. Configure via `pnpm r2:lifecycle` (script provided); verify by logging effective rules, not by waiting 7 days.
- Verify: trigger export from `/inspector`; on completion, panel renders `downloadUrl` as a real R2 link → click → CSV downloads (filename `export-<day>.csv` from `ContentDisposition`). Email arrives in Resend-verified inbox with same URL — click within 10 min → CSV. **Full end-to-end retrofit proof.** R2 dashboard shows the object at `org/<orgId>/exports/<runId>.csv`. `select count(*) from file_metadata where object_key like 'org/%/exports/%'` → 0. Run the kill-resume drill from chapter 067 — Ctrl-C trigger CLI at `pagesDone: 2/7`, restart; export resumes; the R2 PUT happens at end of the resumed parent (not on retry of completed pages); cross-step idempotency holds. Final: one CSV, one email, one audit row.

Senior calls and watch-outs:

- Server-side PUT is the *only* place in the project where a function (Trigger.dev worker) sees the bytes. The rule from lesson 5 of chapter 068 — browser PUT for user-facing flows; server PUT for workers.
- CSV-in-memory is bounded by `pagesTotal × pageSize × avgRowSize`. Project-scale: MB. Production-scale (>100 MB or >10s generation): switch to multipart streaming per `paginatePage`. Named, not built.
- Same bucket as user uploads — one bucket per environment, prefixes carry the workload split. Separate buckets per environment, never per workload.
- 10-min GET expiry trade-off: user who opens the email 30 minutes later gets a dead link; senior call is "re-trigger" rather than "longer expiry".
- Same `lib/r2.ts` for both Next.js function and Trigger.dev worker — one client, two consumers.
- `getSignedGetForKey({ objectKey, expiresIn })` takes a raw key (no tenant check) because the worker has no request context. Tenant checks live at the boundary the caller is on.

Codebase state at entry: chapter 067 export works against placeholder URL.
Codebase state at exit: export end-to-end produces a real R2 object; email link works; both consumers of `lib/r2.ts` operate against the same bucket. **Runnable — full project surface complete.**

Estimated student time: 45 to 60 minutes.

---

## Lesson 7 — Verify

Walks each "Done when" clause as a runnable check — the 11-minute URL-death proof, function-side byte-pipe inspection, cross-org GET denial, `size-mismatch` from a lying client, CORS preflight on a non-allowed host, and the exports-have-no-row SQL.

Goals:

- Walk every "Done when" clause as a verification step (the table in the framing).
- **User upload + row:** upload `fixtures/sample-5mb.jpg` from `/files`; confirm one R2 object at `org/<orgId>/files/<uuid>.jpeg`; confirm one `file_metadata` row with matching `objectKey`, `byteSize ≈ 5242880`, `contentType: 'image/jpeg'`, `uploadedBy: ctx.user.id`.
- **List + download:** click "Download"; file saves as `sample-5mb.jpg` via `Content-Disposition`.
- **Fresh-per-render (chapter's load-bearing proof):** view source, copy a `href`, wait 11 minutes, paste in new tab → `403 AccessDenied (Request has expired)`. Refresh `/files` — same row's `href` is different; click — works. **Senior anchor of the chapter — the URL is never persisted, never cached.**
- **Export emails working R2 link:** trigger export; panel shows real R2 `downloadUrl`; click — CSV downloads. Email has the same URL; click within 10 min — CSV downloads.
- **Function never sees user-upload bytes:** Network tab — `presignedPut` ~400 B response; PUT to `<bucket>.r2.cloudflarestorage.com` carries the MB body; `finalizeUpload` ~100 B response. Function-side bytes are orders of magnitude less than the upload.
- **Payload validation:** `presignedPut({ contentType: 'application/octet-stream' })` → `{ ok: false, error: { code: 'invalid-input' } }`, no R2 call. Same for `claimedSize: 100_000_000`.
- **Tenancy at GET:** upload in A; switch session to B (seeded users); `/files` empty; `getFileDownloadUrl({ fileId: <A-id> })` → `object-not-found`. Even with the right ID, wrong org returns no row.
- **HEAD-based size verification (layered defense):** `debug:fake-upload` calls `presignedPut({ claimedSize: 1024 })` then PUTs 10 MB. R2 accepts. `finalizeUpload` reads `head.ContentLength: 10485760` → throws `size-mismatch`. No row inserted. Orphan 10 MB object remains (cleanup sweep named).
- **CORS in the browser:** serve on `127.0.0.1:3000` (not in allowlist). PUT preflight returns 200 (allowed for the host); R2 returns 403 on the PUT because origin doesn't match. Restore `localhost` — works.
- **No `file_metadata` for exports:** `select count(*) from file_metadata where object_key like 'org/%/exports/%'` → 0.
- **Audit log:** `select action, count(*) from audit_logs group by action` — `file.uploaded` per upload (the `finalizeUpload` `logAudit(tx, { action: 'file.uploaded', subjectType: 'file', subjectId: fileId, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { byteSize, contentType } })` call), `file.list_viewed` per page render (the `/files` `logAudit(tx, { action: 'file.list_viewed', subjectType: 'file', subjectId: 'list', actorUserId: ctx.user.id, orgId: ctx.orgId, payload: { fileIds } })` call), `file.download_url_issued` per email link from the export task (`logAudit(tx, { action: 'file.download_url_issued', subjectType: 'file', subjectId: objectKey, actorUserId: null, orgId: organizationId, payload: { objectKey, expiresIn: 600 } })`).
- **Soft-delete column exists:** `select column_name from information_schema.columns where table_name = 'file_metadata' and column_name = 'deleted_at'` returns the column. Action exists in `lib/files/soft-delete.ts`; structural shape verified.
- Name the senior calls once more:
  - Function never sees bytes for user uploads — browser PUT direct to R2.
  - Two-step write — sign → upload → finalize-with-HEAD → row insert.
  - `byteSize` and `contentType` from the HEAD, not the client claim.
  - `objectKey` server-constructed; never client-supplied.
  - Presigned GETs fresh-per-render; never persisted, never cached.
  - Tenancy at every read via `tenantDb(orgId)`.
  - One bucket per environment; prefixes carry the workload split. One `lib/r2.ts` for both consumers.
  - User uploads use `file_metadata`; exports use no row + lifecycle rule.
  - CORS specific origin, never `*`.
- Forward references:
  - **Unit 13:** `file.uploaded` fires the notification dispatcher; channel choice is the dispatcher's.
  - **Unit 15a:** `/files` deliberately not cached; cache one layer up at the metadata read if volume demands.
  - **Unit 16:** layered size defense, CORS specificity, `deletedAt` reads are audit line items.
  - **Unit 20:** rotating R2 credentials follows staged-rollover discipline.
  - **Avatars (9.x forward note):** Better Auth's hosted avatar handles its own pipeline; a custom avatar field reuses this chapter's shape with `contentType` restricted to images. Named, not built.

Senior calls and watch-outs:

- Verify rehearses each failure mode and names what would break without the disciplines. If a verification fails, point at the owning build lesson.
- The 11-min-later refresh proof is the chapter's headline verification — run the timer in real time (or fast-forward the system clock). Skipping it produces a student who thinks `<img src>={signedUrl}` survives a long page session.
- The CORS test requires actually serving on a non-allowed host — `curl` won't reproduce the browser preflight. CORS is a browser concept; verify must run in a browser.

Codebase state at entry: full upload + list + export retrofit wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.
