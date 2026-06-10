# Chapter 069 — Lesson 2 outline

## Lesson title

Keep **Sign the PUT, no DB write**. It names the lesson's load-bearing decision (authorize the upload, write nothing). Sentence case, plain text.

- Sidebar: **Sign the PUT**

## Lesson type

`Implementation` — student builds `presignedPut` against a test file; the test-coder runs for this lesson.

## Lesson framing

The student installs the senior decision that defines a direct-to-R2 upload: the function authorizes one upload and signs a short-lived URL, but never sees the bytes and writes no database row. They ship the first half of the two-step write — a `presignedPut` Server Action that validates the client's claim at the Zod boundary, server-constructs the object key from the org plus a server-generated UUIDv7, and signs a content-type-bound `PutObjectCommand` that expires in five minutes. The payoff is the mental model that a presigned PUT is a scoped, time-boxed write capability, and that no row exists until the bytes are confirmed (next lesson) — so a never-completed upload leaves a cheap orphan object, never an orphan row that lies in the UI.

## Codebase state

**Entry.** The Lesson 1 starter runs locally: `/files` renders an empty list with a non-functional form, `/inspector` carries the chapter 067 surface (export still produces a placeholder `downloadUrl`). R2 bucket exists with CORS pushed (`pnpm r2:cors`), scoped token and `R2_*` env set. Provided and unchanged this lesson: `lib/r2.ts` (singleton `S3Client`, `BUCKET`, `ALLOWED_CONTENT_TYPES`, `MAX_BYTES = 25 MB`), `lib/files/keys.ts` (`extFor`, `buildObjectKey`), `lib/files/errors.ts` (`UploadError`), `lib/auth/authed-action.ts` (`authedAction(role, schema, fn)`), `lib/result.ts` (`Result`, `ok`, `err`). `lib/files/presigned-put.ts` is a stub returning `err('internal', 'Not implemented')` — the Zod schema and the `authedAction('member', …)` wrapper are already in place; only the body is a TODO.

**Exit.** `lib/files/presigned-put.ts` is fully implemented: generates `uploadId = uuidv7()`, builds `objectKey` via `buildObjectKey`, signs `getSignedUrl` over `PutObjectCommand` with `signableHeaders: content-type` and `expiresIn: 300`, returns `ok({ uploadId, url, objectKey })`, writes no DB row. A browser-console call returns a signed R2 URL; a `curl`-PUT to that URL lands the object in the bucket. The upload form, `finalizeUpload`, and the `/files` list remain stubs (Lessons 3–4).

## Lesson sections

Implementation type. Sections in contract order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: build the Server Action that hands the browser a short-lived URL to upload a file straight to R2, with no bytes through the function. Then a one-paragraph description of "working": calling the action from the browser console returns a signed `https://<bucket>.r2.cloudflarestorage.com/...` URL plus a server-generated upload ID and object key, and `curl`-PUTting a file to that URL lands the object in the bucket with zero server involvement in the transfer. No screenshot — this lesson has no UI; describe the console + `curl` result in prose. Keep warm and brief.

### Your mission

Prose-first per the contract — weave feature, constraints, and out-of-scope into coherent paragraphs, no subsection headers, no implementation hints, then close with the requirements checklist (the only list in the section).

Frame the capability: this is the first half of the two-step write, and the action's whole job is to *authorize* one upload — validate what the client claims, decide where the object lives, sign a time-boxed PUT the browser uses directly. Weave the constraints that shape the solution:

- No DB row — the row belongs to `finalizeUpload` next lesson, after the bytes are confirmed in R2, so a never-completed upload leaves no orphan row in the UI.
- The object key is server-constructed from the org and a server-generated UUID, never anything the client sends — a client-chosen key or ID is the tenancy-bypass shape that could later clobber another org's row.
- Content type is constrained to the shared `ALLOWED_CONTENT_TYPES` allowlist reused at the Zod boundary, so the policy has one source of truth.
- The signed URL expires in five minutes — long enough to push 25 MB on a slow link (and the client re-signs on retry), short enough that a leaked URL grants no lasting write.
- The action gates on the `member` role — the structural defense, because the R2 credentials are app-wide.
- Sign `ContentLength` from the claimed size even though R2 will not enforce it server-side; signing documents intent and matches the SDK shape — the real size check is the post-upload HEAD next lesson.

Out of scope (one line): any DB write, any client-side upload UI, and trusting the claimed size as the final word. Note the student reuses `buildObjectKey` and the `authedAction` wrapper rather than re-deriving either.

**Functional requirements** — numbered checklist, each tagged. Render with `Checklist`/`ChecklistItem` carrying the `tested`/`untested` chip.

1. `[tested]` Calling the action with a valid file name, an allowlisted content type, and a claimed size within the cap returns a signed `https://<bucket>.r2.cloudflarestorage.com/...` URL plus the server-generated upload ID and object key, and writes no database row.
2. `[tested]` Calling the action with a disallowed content type is rejected with the `validation` error code and triggers no R2 call.
3. `[tested]` Calling the action with a claimed size over the cap is rejected with the `validation` error code and triggers no R2 call.
4. `[untested]` `curl`-PUTting a file to the returned URL with the matching `Content-Type` returns 200 and the object appears in R2 at `org/<orgId>/files/<uploadId>.<ext>` — confirmed by hand (Moment of truth).
5. `[untested]` `curl`-PUTting with a `Content-Type` that differs from the signed one is rejected by R2 with `403 SignatureDoesNotMatch` — confirmed by hand.

Note for the test-coder: assertions target observable behavior (returned shape, error code, no R2 call, no row), not file paths or imports. Requirements 4–5 need a live R2 bucket and a browser preflight-free path, so they are hand-verified, not asserted.

### Coding time

One line directing the student to implement `presignedPut` against the brief and the tests, then the hidden solution `<details>` (the writer wraps this section's body in `<details>`, collapsed by default).

Reference implementation: `lib/files/presigned-put.ts` exactly as in the solution — `'use server'`; imports `PutObjectCommand`, `getSignedUrl`, `uuidv7`, `z`, `authedAction`, `buildObjectKey`, `ALLOWED_CONTENT_TYPES`/`BUCKET`/`MAX_BYTES`/`r2`, `ok`/`Result`. The `authedAction('member', …)` call with the `z.strictObject({ fileName: z.string().min(1).max(255), contentType: z.enum(ALLOWED_CONTENT_TYPES), claimedSize: z.coerce.number().int().positive().max(MAX_BYTES) })` schema is already present in the stub — the student fills the body: `uploadId = uuidv7()`, `objectKey = buildObjectKey({ orgId: ctx.orgId, fileId: uploadId, contentType })`, `url = await getSignedUrl(r2, new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: input.contentType, ContentLength: input.claimedSize }), { signableHeaders: new Set(['content-type']), expiresIn: 300 })`, `return ok({ uploadId, url, objectKey })`.

Render the full file with `AnnotatedCode` — direct the student's attention across four parts in sequence: (1) the `z.strictObject` schema and the shared `ALLOWED_CONTENT_TYPES`/`MAX_BYTES` reuse at the Zod boundary; (2) `uuidv7()` + `buildObjectKey` — the server-built key; (3) the `getSignedUrl`/`PutObjectCommand` call with `signableHeaders` and `expiresIn`; (4) `ok({ uploadId, url, objectKey })` and the absence of any DB write.

Decision rationale to cover (one or two sentences each, covering every `[untested]` choice — code organization, naming, error-handling placement):

- `uploadId` is server-generated; a client-chosen ID is the tenancy-bypass shape that could clobber an existing row when `finalizeUpload` inserts by that ID.
- `signableHeaders: new Set(['content-type'])` is what binds the signed URL to its content type — a mismatched `curl`-PUT trips `403 SignatureDoesNotMatch` (requirement 5). Call this out as the non-obvious mechanism behind the hand-check.
- `ContentLength` is signed but **not** enforced by R2 server-side (the chapter 068 lesson 3 quirk) — link to lesson 3 of chapter 068 rather than re-explaining; enforcement is next lesson's HEAD.
- The five-minute (`expiresIn: 300`) expiry trade-off; the client re-signs on retry rather than reusing a stale URL.
- Role `member`, not `admin` — the function-level gate is the defense because R2 credentials are app-wide; link to chapter 057 for `authedAction` role pins rather than re-explaining.
- No "reserved" row with `status: pending` — no row until the bytes are confirmed. Orphan objects are cheap to clean (lifecycle-swept); orphan rows lie in the UI.
- The `validation` error code is mapped at the `authedAction` boundary (`schema.safeParse` fails before `fn` runs), not in the action body — link to chapter 043 (Result) / chapter 042 (Zod validation) rather than re-explaining. This is why requirements 2–3 short-circuit with no R2 call.
- `extFor('image/jpeg')` maps to `jpg` (not `jpeg`) — call this out so the `curl` checklist and the student's expectation of the object key match (`...<uploadId>.jpg`).

Link, don't re-explain: presigned PUT/GET mechanics and the `ContentLength` non-enforcement (lesson 3 of chapter 068); `lib/r2.ts` construction and `region: 'auto'` (lesson 2 of chapter 068); `authedAction`/role pins (chapter 057); Result shape (chapter 043); Zod boundary validation (chapter 042/043); `buildObjectKey` / `extFor` (provided, first exercised here — show the `keys.ts` source briefly for context, do not re-teach).

No diagram needed — the flow is a single action; prose plus the annotated file carries it.

### Moment of truth

State the test command and expected pass output, then a hand-verification checklist for the two `[untested]` requirements.

- Command: `pnpm test:lesson 2` (runs `node scripts/test-lesson.mjs`). Expected: the lesson 2 suite passes — a valid call returns a signed URL and upload ID with no DB write; a disallowed content type returns `validation` with no R2 call; an over-cap `claimedSize` returns `validation`. Show the pass-only output shape (suite name + passing assertions, no failures).
- Hand-verification checklist (`Checklist`/`ChecklistItem`):
  - `[ ]` `curl -X PUT -H "Content-Type: image/jpeg" --data-binary @some.jpg "<signed-url>"` returns 200 and the object appears in the R2 dashboard at `org/<orgId>/files/<uploadId>.jpg`.
  - `[ ]` `curl`-PUT with a mismatched `Content-Type: image/png` against the JPEG-signed URL returns `403 SignatureDoesNotMatch`.
- Note: obtain `<signed-url>` by calling `presignedPut` from the browser console (or a thin throwaway harness) while signed in as a `member` of a seeded org — the action requires a session, so a raw `curl` to the action itself won't authorize.

Code blocks: use `Code` for the `curl` commands and the test-pass output (simple blocks, no multi-part focus needed).

## Scope

This lesson does **not** cover:

- The browser upload UI, the XHR progress bar, or `finalizeUpload`'s HEAD-then-insert — lesson 3 of this chapter.
- The `/files` list render and fresh-per-render presigned GETs — lesson 4 of this chapter.
- The export retrofit's server-side PUT and `getSignedGetForKey` — lesson 5 of this chapter.
- How `lib/r2.ts` is constructed, the scoped token, and CORS — lesson 2 of chapter 068 (provided here, run in Setup).
- Why R2 ignores the signed `ContentLength` and the layered size defense's second half — lesson 3 of chapter 068 (the enforcement lands at the HEAD in lesson 3 of this chapter).
- The `file_metadata` table shape and the no-`url`-column rule — provided in the starter; first inserted in lesson 3 of this chapter.
