# Chapter 069 — Lesson 4 outline

## Lesson title

**Fresh-per-render GETs** — fits, keep as is. Sentence case, no markup.
Sidebar: **Fresh-per-render GETs**

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior reflex that a presigned URL is a short-lived credential, not a stable address — so a read surface mints a new one for every row on every render and refuses to cache the response that would freeze them. They ship the `/files` list: tenant-scoped reads, a fresh signed "Download" link per row, the keyset "Next page" cursor, and the proof that a copied URL dies at the 10-minute mark while a refresh re-issues a working one. The payoff is the read-boundary discipline — no `use cache`, no persisted URL, no audit on render, tenancy enforced at every read — that every later file-read surface copies.

## Codebase state

**Entry.** The upload path is complete (lessons 2–3): `presignedPut` signs, the browser PUTs straight to R2, `finalizeUpload` HEADs and inserts a `file_metadata` row with an audit entry. `/files` mounts a working `UploadForm` above a minimal "No files yet." shell (no real list rendering). `db/queries/file-metadata.ts` is a stub — all four functions throw `new Error('not implemented')`. Provided and unexercised so far: `lib/files/cursor.ts` (`FileCursor` + `encodeCursor`/`decodeCursor`, base64url keyset), `lib/files/soft-delete.ts` (`softDeleteFile`, not wired to UI), the `file_metadata` composite index `(organizationId, softDeletedAt, uploadedAt desc, id desc)`, `tenantDb(orgId)`, `lib/r2.ts` (`r2`, `BUCKET`), the `Badge` ui component.

**Exit.** `db/queries/file-metadata.ts` is fully implemented: `getFile`, `getFileDownloadUrl` (fresh GET with RFC 5987 `ResponseContentDisposition`, `expiresIn: 600`), the tenant-free `getSignedGetForKey` (signs a raw key, no tenant scope — staged here for the lesson-5 export worker), and `listFiles` (newest-first keyset, `limit + 1` trick). `app/files/page.tsx` renders the real list — per-row async `FileRow` signing a fresh `getFileDownloadUrl`, type badge, formatted size, fixed-UTC timestamp, "Download" link, empty state, and a keyset "Next page" link — with no `use cache` and no audit write. The export retrofit (lesson 5) is the only remaining TODO.

## Lesson sections

Implementation contract order. Components: `Code` for the test command and small blocks; `AnnotatedCode` for `listFiles` (the keyset predicate + `limit + 1` trick + cursor encode need stepped focus) and for `getFileDownloadUrl` (the `ResponseContentDisposition` / RFC 5987 line is the non-obvious part); `Checklist` with `tested`/`untested` chips for the requirements list and the by-hand verification. No diagram — the flow is prose-carryable (read → sign per row → render link). The whole *Coding time* solution is wrapped in `<details>` by the writer.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: each uploaded file shows a working "Download" link that saves under its original name, signed fresh on every render so it never goes stale. Then a one-paragraph description (or a screenshot of the `/files` list with rows + "Download" links + "Next page"): an uploaded file appears in the list; clicking "Download" saves it under its original name; a link copied off the page stops working after its 10-minute window while a refresh hands back a fresh, working one.

### Your mission

Prose paragraph then a `Checklist`. The brief carries **no implementation hints**.

Feature: render the `/files` list so each uploaded file shows a working "Download" link, minted fresh on every render.

Weave into the prose: the load-bearing idea — a presigned URL is a credential with a short life, not a stable address, so the page mints a new one per row per render and never stores or caches it. Constraints that follow: the `/files` Server Component must not opt into `use cache` (a cached response freezes URLs that then expire, leaving the page lying about dead links); signing N URLs per render is fine because `getSignedUrl` is local HMAC with no R2 round trip, effectively free. Reads go through `tenantDb(orgId)` filtered to non-deleted rows — the structural enforcement that one org never sees another's files and soft-deleted rows stay hidden. The download must save under the user's original file name (sets `ResponseContentDisposition`, RFC 5987-encoded). Render never audits — auditing is action/task-only, so no `file.list_viewed` event exists. Out of scope: a soft-delete button (the column and `softDeleteFile` action exist, unused here — link to lesson 4 of chapter 068 / chapter 061 for soft-delete discipline) and any caching layer (forecast to chapter 072). Reuse the provided `lib/files/cursor.ts` keyset cursor rather than authoring one; reuse `tenantDb`, `lib/r2.ts`, `UploadError`.

Functional requirements (numbered `Checklist`, each tagged):
1. An uploaded file appears as a row in the `/files` list showing its original name, content type (badge), formatted size, and upload time. `[tested]`
2. Each row's "Download" link points at a fresh presigned R2 URL and downloading it saves the file under its original name. `[untested]` (download-disposition behavior is a browser concern, not asserted by the runner)
3. A download URL copied from the page returns `403 AccessDenied` after its 10-minute window passes, while refreshing `/files` yields a different, working URL for the same row. `[untested]` (time-window expiry runs in real time — by-hand only)
4. A file uploaded by one org is absent from another org's list, and `getFileDownloadUrl` for that file while acting as the other org returns the `not_found` error code. `[tested]`
5. The list renders past the first page through a keyset "Next page" cursor link. `[tested]`
6. The render writes no audit entry, regardless of how many rows it signs. `[tested]`

### Coding time

One line directing the student to implement the read helpers and the `/files` server page against the brief and the tests, then the hidden solution `<details>`.

Reference implementation, organized as in the repo. Both files are TODO surfaces this lesson:

- **`src/db/queries/file-metadata.ts`** (replaces the stub). Present all four exports in repo order:
  - `getFile(orgId, fileId)` — `tenantDb(orgId).query.fileMetadata.findFirst` with `and(eq(id), isNull(softDeletedAt))`, returns `row ?? null`. Positional args, not a ctx object.
  - `getFileDownloadUrl(orgId, fileId)` — calls `getFile`; no row → `UploadError.toResult(new UploadError('object-not-found', …))` → `not_found`; signs `GetObjectCommand({ Bucket, Key: row.objectKey, ResponseContentDisposition: \`attachment; filename*=UTF-8''${encodeRFC5987(row.originalFileName)}\` })` with `{ expiresIn: 600 }`; returns `ok({ url, fileName, contentType })`. `AnnotatedCode` to focus the `ResponseContentDisposition` + the file-local `encodeRFC5987` helper.
  - `getSignedGetForKey({ objectKey, expiresIn })` — tenant-free, signs a raw-key `GetObjectCommand` with no `ResponseContentDisposition`. Callout: this is staged here but first consumed in lesson 5 — the export worker is inside the trust boundary (owns the key it just PUT), so there is no org row to scope against.
  - `listFiles({ orgId, cursor, limit = 20 })` — `decodeCursor`, build the `(uploadedAt, id)` keyset predicate (`or(lt(uploadedAt, cursorAt), and(eq(uploadedAt, cursorAt), lt(id, decoded.id)))`), `findMany` with `and(isNull(softDeletedAt), keysetPredicate)`, `orderBy: [desc(uploadedAt), desc(id)]`, `limit: limit + 1`; `hasMore`/slice/`encodeCursor` next-cursor trick. `AnnotatedCode` for the keyset predicate and the `limit + 1` trick.
- **`src/app/files/page.tsx`** (replaces the empty-list shell, keeps the mounted `UploadForm` from lesson 3). Server Component: `requireOrgUser()` → `cursorSchema.parse((await searchParams).cursor ?? null)` → `listFiles({ orgId, cursor })`; render the per-row async `FileRow` (signs `getFileDownloadUrl`, renders name / `Badge` type / `formatBytes` / `formatUploadedAt` fixed-UTC string / conditional "Download" `<a>` when `download.ok`), the `files-empty` empty state, and the keyset "Next page" `Link`. Pure file-local `formatBytes` and `formatUploadedAt` helpers.

Decision rationale (one or two sentences each, covers the `[untested]` requirements):
- Why the page is not `use cache` — cached HTML outlives the signed URL; fresh-per-render is structural. (req 3 backbone)
- N signs per render is not a hot spot — `getSignedUrl` is local HMAC, no R2 round trip.
- `ResponseContentDisposition` + RFC 5987 encoding — without it the browser saves the opaque key segment, not the original name. (req 2)
- `isNull(softDeletedAt)` as the soft-delete read discipline — chapter 062's base-query helper would normally own this; link rather than re-explain.
- The provided file-local keyset cursor (`lib/files/cursor.ts`) versus chapter 041's hardcoded one — link.
- Render does not audit — auditing is action/task-only; the audit trail picks back up at `finalizeUpload`. (req 6)
- `getFile` returning `null` for a cross-org id makes a cross-org id indistinguishable from a missing file — the tenancy boundary leaks nothing. (req 4)
- Callout: `getSignedGetForKey` lands this lesson but is dead until lesson 5; it is the one tenant-free read in the file and that is deliberate.

External resources (resourcer appends after `<details>`, no header): candidate — AWS S3 presigner `ResponseContentDisposition` / RFC 5987 reference.

### Moment of truth

Test command: `pnpm test:lesson 4`. State the expected pass output (suite green).

Tests cover: an uploaded file appears in its org's list and not another's; `getFileDownloadUrl` returns `not_found` across orgs; the keyset cursor advances past the first page; render writes no audit entry.

By-hand `Checklist` for what the runner can't assert:
- [ ] The file uploaded last lesson appears in the list; clicking "Download" saves it under its original name.
- [ ] Viewing source shows real `https://<bucket>.r2.cloudflarestorage.com/...?X-Amz-Signature=...` hrefs.
- [ ] Copy an href, wait 11 minutes, open it in a new tab — `403 AccessDenied (Request has expired)`. Refresh `/files` — the same row's href is different and works. (Chapter headline proof; run the timer in real time or fast-forward the clock. Skipping it leaves a student who believes a signed URL survives a long page session.)

## Scope

This lesson does not cover:
- The upload path (`presignedPut`, `finalizeUpload`, the XHR form) — built in lessons 2–3.
- The export retrofit that consumes `getSignedGetForKey` (server-side PUT, real email link) — lesson 5.
- Soft-delete UI / orphan cleanup — the column and `softDeleteFile` exist but stay unwired; soft-delete discipline is lesson 4 of chapter 068 / chapter 061.
- Caching the metadata read one layer up — forecast to chapter 072; `/files` itself stays uncached.
- Authoring the `file_metadata` table, its index, or the keyset cursor type — all provided in the starter (schema from chapter 068, cursor in `lib/files/cursor.ts`).
