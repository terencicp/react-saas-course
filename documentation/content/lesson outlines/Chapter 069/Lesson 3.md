# Lesson 3 — Browser PUT, HEAD, then insert

## Lesson title

Chapter-outline title "Browser PUT, HEAD, then insert" fits — it names the three-beat path the lesson installs. Keep it.

- **Page title:** Browser PUT, HEAD, then insert
- **Sidebar title:** Browser PUT, then insert

## Lesson type

Implementation

## Lesson framing

The student installs the trust boundary of a direct-to-browser upload: the server never trusts what the client says about a file, it reads the truth back from storage. They wire the second half of the two-step write — `finalizeUpload` HEADs the object the browser just PUT, learns its real size and content type, and inserts the `file_metadata` row plus its audit entry in one transaction — and the XHR-driven form that drives it with a live progress bar. The senior payoff: a working upload surface where the multi-MB body never crosses a function, a client that lies about its size is caught at the HEAD before any row lands, and the row-and-audit either both commit or both roll back.

## Codebase state

### Entry

Lesson 2 shipped `presignedPut` (`lib/files/presigned-put.ts`): a `member`-gated action that signs a 5-min direct-to-R2 PUT URL, server-builds the `objectKey` from `ctx.orgId` + a `uuidv7()`, and writes no row. Provided and unchanged: `lib/r2.ts` (`r2`, `BUCKET`, `ALLOWED_CONTENT_TYPES`, `MAX_BYTES`); `lib/files/keys.ts`; `lib/files/errors.ts` (`UploadError` with the four codes + `UploadError.toResult`); `db/schema.ts` carrying the `file_metadata` table + migration `drizzle/0008_add_file_metadata.sql` (already applied by `pnpm db:migrate` in Setup); `db/audit-log.ts` (`logAudit`); `db/tenant.ts` (`tenantDb`); `lib/auth/authed-action.ts`; `lib/result.ts` (`ok`/`err`/`isUniqueViolation`); the `Progress` and `Input` UI components. Stubs still pending: `lib/files/finalize.ts` returns `err('internal', 'Not implemented')`; `app/files/upload-form.tsx` is an empty `<div data-testid="upload-form" />`; `app/files/page.tsx` renders a static "No files yet." shell.

### Exit

`finalizeUpload` (`lib/files/finalize.ts`) is fully implemented — HEADs the object, maps a missing object to `object-not-found` and a type/size discrepancy to `size-mismatch`, then inserts the row from HEAD-observed `byteSize`/`contentType` and writes one `file.uploaded` audit row in a single `tenantDb` transaction, mapping a unique-key violation to `conflict`. `app/files/upload-form.tsx` is the full `UploadForm` client component (status state machine, `Progress` bar, XHR PUT with `onprogress`, client-side pre-checks, `presignedPut` → PUT → `finalizeUpload` → `router.refresh()`). `app/files/page.tsx` mounts `UploadForm` above a minimal empty-state list — full list rendering and per-row download links remain for Lesson 4. A picked file now lands in R2 and writes its row.

## Lesson sections

Implementation lesson — render the contract's section list: *Goal + Finished result* (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One sentence goal in user terms: choosing a file on `/files` uploads it straight to R2 with a live progress bar and records it as a file the app knows about. Then a one-paragraph description of the working feature: the status text walks `signing → uploading → finalizing → done`, the progress bar fills smoothly, and one `file_metadata` row appears with the size and content type read back from R2 — plus one audit entry. Reference the project-overview finished-state figure rather than introducing a new screenshot (a mid-flight progress bar belongs to the overview's figure).

### Your mission (header: "Your mission")

Coherent prose paragraph, no subsection headers, no implementation hints. Weave in:

- **Feature.** Complete the browser upload path so a picked file streams directly to R2 with a live progress bar and is recorded as a `file_metadata` row whose size and content type are read back from the object, not trusted from the client.
- **Why both halves land together.** `finalizeUpload` has nothing to finalize without the form, and the form has nowhere to record its result without `finalizeUpload` — neither reaches a confirmable state alone, so this lesson ships both.
- **The trust boundary.** After the browser reports a successful PUT, `finalizeUpload` HEADs the object to learn the true content length and content type, then inserts the row from those server-observed values inside a `tenantDb` transaction that also writes the audit entry, so the two commit or roll back together.
- **Layered size defense.** The HEAD catches a client that lied about its size in the signing step (it sees the real bytes); the `unique(objectKey)` constraint is the second layer, rejecting a replayed finalize.
- **Constraints to weave.** The `file_metadata` table and migration are provided — this lesson inserts into an existing table, it does not author one. The HEAD-then-insert is not transactional with R2 (a microsecond gap, accepted; lifecycle rules sweep the orphan-object case). A 4xx on the PUT means re-running the whole flow, not reusing the signed URL. The browser PUT must send the exact `Content-Type` that was signed — the `.JPG`-is-sometimes-`image/pjpeg` normalization trap surfaces as `403 SignatureDoesNotMatch`. Client-side size and type pre-checks are defense-in-depth for instant feedback, never a substitute for the server boundary. The one new browser tool is `XMLHttpRequest` (only XHR exposes upload progress to user code); reuse `logAudit` and the `UploadError` codes.
- **Out of scope (one line).** The rendered file list and download links — Lesson 4; leave a minimal empty state.

Then the requirements checklist (the only list in the section), every item phrased as a verifiable outcome, each tagged `[tested]` or `[untested]`:

1. Choosing a valid file on `/files` runs the status through signing → uploading → finalizing → done with a smooth progress bar. `[untested]`
2. After a successful upload, one `file_metadata` row exists with `byteSize` and `contentType` taken from the post-upload HEAD and `uploadedBy` set to the current user. `[tested]`
3. During a successful upload the function exchanges only small JSON with the two actions while the multi-MB body goes straight to `<bucket>.r2.cloudflarestorage.com`. `[untested]`
4. A client that signs a small claimed size and then PUTs an over-cap body is rejected at finalize with `size-mismatch` and no row is inserted. `[tested]`
5. Picking an over-cap file is rejected in the browser before any signing call, and a disallowed type is kept out by the file picker. `[untested]`
6. Each successful upload records exactly one `file.uploaded` audit entry, committed in the same transaction as the row. `[tested]`
7. Serving the app on a host not in the CORS allowlist makes the browser PUT fail, while the allowed `localhost` origin succeeds. `[untested]`

Note for the test-coder: the `[tested]` items assert at the `finalizeUpload` action boundary against the real DB and a real (or seeded) R2 object — item 2 (row written with HEAD-sourced values), item 4 (oversized HEAD → `size-mismatch`, zero rows), item 6 (exactly one `file.uploaded` audit row, same transaction). The browser-only items (1, 3, 5, 7) live in the by-hand checklist — the XHR progress bar, the Network-tab byte split, the client pre-check, and the CORS preflight are not reproducible in the action test harness.

### Coding time (header: "Coding time")

One line directing the student to implement `finalizeUpload` and the upload form against the brief and the tests, then the hidden solution. The writer wraps the solution body in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo. Three files:

- **`lib/files/finalize.ts`** — `finalizeUpload`, an `authedAction('member', ...)` with a Zod `strictObject` input (`uploadId: z.uuid()`, `objectKey: z.string().min(1)`, `originalFileName: z.string().min(1).max(255)`, `contentType: z.enum(ALLOWED_CONTENT_TYPES)`). Body: `HeadObjectCommand({ Bucket, Key: input.objectKey })`; a module-level `isMissingObject(e)` helper matches the SDK `NotFound`/`NoSuchKey` name or `$metadata.httpStatusCode === 404` (re-throws anything else) and maps to `UploadError('object-not-found')`; `head.ContentType !== input.contentType` → `UploadError('size-mismatch')`; `byteSize = head.ContentLength ?? 0`, `byteSize > MAX_BYTES` → `UploadError('size-mismatch')`; then `tenantDb(ctx.orgId).transaction` inserts the row (`id: input.uploadId`, `uploadedBy: ctx.user.id`, `byteSize` and `contentType` from the HEAD) and `logAudit(tx, { action: 'file.uploaded', subjectType: 'file', subjectId: input.uploadId, payload: { byteSize, contentType } })`; a unique-key violation (`isUniqueViolation`) maps to `err('conflict', ...)`; returns `ok({ fileId: input.uploadId })`. Render this with **AnnotatedCode** — direct the student's focus across the four beats (HEAD + missing-object catch, the two `size-mismatch` checks, the transactional insert+audit, the unique-violation → conflict map).
- **`app/files/upload-form.tsx`** — `'use client'` `UploadForm`. Client-local `ALLOWED_CLIENT_TYPES`/`MAX_BYTES` mirrors of the server allowlist (a Client Component cannot import the server-only `lib/r2.ts` — the poison pill), driving instant pre-checks only. A module-level `putToR2(url, file, onProgress)` wraps an `XMLHttpRequest` PUT in a promise (`xhr.setRequestHeader('Content-Type', file.type)`, `xhr.upload.onprogress` drives the bar, 2xx resolves else rejects). `onSubmit`: pre-check (file present, allowed type, under cap), `setStatus('signing')`, call `presignedPut(null, FormData)`, `setStatus('uploading')` + `putToR2`, `setStatus('finalizing')` + `finalizeUpload(null, FormData)`, `setStatus('done')` + reset input + `router.refresh()`; errors surface `error.userMessage` / the XHR error. UI: `<Input type="file" accept={ACCEPT}>`, `Progress` bar, status text, error line, submit button — all disabled while `busy`. Render with **AnnotatedCode** to walk the four-state flow (sign, XHR PUT with progress, finalize, refresh); the `putToR2` promise wrapper and the `signFd`/`finalizeFd` FormData construction are the focus points. Note for the writer: the actions are called as `action(null, formData)` because `authedAction` exposes the `useActionState` two-arg shape — link to the Unit 6 / chapter 057 lesson that owns `authedAction`, do not re-explain the wrapper.
- **`app/files/page.tsx`** — mount `<UploadForm />` above the minimal empty-state list section (`"No files yet."`); full list rendering is Lesson 4. Render with a simple **Code** block — this is a small mount, not a focus-directing read.

Decision rationale to cover (one or two sentences each, covering the `[untested]` requirements):

- `XMLHttpRequest` over `fetch` for upload progress — closes the chapter 016 file-picker thread; XHR is the only browser API that exposes `upload.onprogress`.
- The exact-`Content-Type` match and the `.JPG` normalization trap (`403 SignatureDoesNotMatch`) — covers why `putToR2` sends `file.type` verbatim.
- The HEAD catching a stale/lying `uploadId`/`objectKey` plus the `unique(objectKey)` constraint as the layered defense — the HEAD is the real size boundary because R2 does not enforce the signed `ContentLength` (link to chapter 068 lesson 3, do not re-explain).
- Audit written in the same transaction as the row insert — both commit or roll back together (link to chapter 057 for `logAudit`).
- The non-transactional HEAD-then-insert gap, named and accepted; lifecycle rules sweep the orphan object.
- Client validation as defense-in-depth, not duplication — the server re-validates and the HEAD reads the true size; covers requirement 5 (client pre-check) and the poison-pill reason the allowlist is mirrored client-side.
- Full-flow retry on a 4xx PUT (re-sign, do not reuse the URL) and the orphan object on a mid-PUT network drop.

For the Result shape and Zod-at-the-boundary mechanics, link to chapter 043 / chapter 042 rather than re-explaining. No diagram needed — the three-beat path is carried by the AnnotatedCode steps and the overview's architecture shape.

### Moment of truth (header: "Moment of truth")

State the test command and the expected pass output:

- Command: `pnpm test:lesson 3`
- Expected: all suites green — the by-hand notes below confirm what the harness cannot reach.

Tests cover: a valid upload writes one row with HEAD-sourced size and content type (req 2); a lying-size client is rejected at finalize with `size-mismatch` and no row (req 4); exactly one `file.uploaded` audit entry per upload, committed with the row (req 6).

Then the by-hand checklist (Checklist component, the student ticks as they go):

- [ ] A ~1 MB upload runs to `done` with a smooth progress bar.
- [ ] During that upload the Network tab shows a small POST to `presignedPut`, an MB-scale PUT to `r2.cloudflarestorage.com`, and a small POST to `finalizeUpload`.
- [ ] Picking a 30 MB file is rejected client-side with no `presignedPut` call; an `.exe` is excluded by the picker.
- [ ] Serving on `127.0.0.1:3000` (not in the allowlist) makes the browser PUT fail; restoring `localhost` works. (The browser preflight cannot be reproduced with `curl` — run this in a browser.)

## Scope

This lesson does not cover:

- Rendering the file list, per-row presigned GET download links, the keyset cursor, or the fresh-per-render / never-`use cache` discipline — **Lesson 4 (Fresh-per-render GETs)**. Leave only the minimal empty-state mount here.
- Signing the PUT URL, the `objectKey` construction, the 5-min expiry, or the `member`-role rationale — installed in **Lesson 2 (Sign the PUT, no DB write)**; reuse `presignedPut` as-is.
- The server-side worker PUT for exports and the tenant-free `getSignedGetForKey` helper — **Lesson 5 (Real downloadUrl for the export)**.
- The `authedAction` wrapper, the Result shape, and Zod-at-the-boundary validation — owned by chapter 057 / chapter 043 / chapter 042; link, do not re-teach.
- R2-side `ContentLength` non-enforcement and presigned-PUT/GET mechanics — owned by **chapter 068 lesson 3**; link.
- The soft-delete action and column — `softDeleteFile` ships provided but is exercised nowhere in this chapter.
