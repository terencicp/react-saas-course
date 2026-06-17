# Chapter 068 — Object storage

## Lesson 1 — Defending the no — when object storage earns its weight

**Taught.** Decision framework for when object storage earns its weight: the three trigger conditions (user uploads, generated assets the app serves back, third-party media), conditions that do NOT trigger it, why Postgres is the wrong home for blobs, why R2 beats S3 on unit economics (zero egress), why R2 beats UploadThing/Vercel Blob/Supabase Storage, the two-stores-one-key ownership split, and the "function is never a byte pipe" rule.

**Cut.** The chapter outline's "watch-out" for orphaned objects/rows in both directions was omitted (appropriate — that belongs to lessons 3 and 4).

**Debts.** Lesson 2: bucket creation, scoped tokens, `lib/r2.ts` S3 client, CORS configuration, object-key tenancy detail. Lesson 3: presigned PUT/GET mechanics, expiry discipline, layered size defense, sign-then-finalize two-step. Lesson 4: full `file_metadata` row schema. Chapter 069: wires the CSV export's `console.log` placeholder to a real R2 download link.

**Terminology.**
- `object storage` — bucket-of-blobs addressed by key over HTTP; not a database, not a filesystem.
- `binary payload` — raw bytes (image, PDF, CSV) as opposed to structured rows/JSON.
- `object key` — the unique path string addressing one object in the bucket, e.g. `org/${organizationId}/files/${fileId}`; the join key between Postgres row and bytes.
- `egress` — data transferred out of the storage provider to the internet; the line item that dominates a read-heavy bill.
- `S3-compatible API` — de-facto-standard object-storage HTTP API originated by AWS S3; multiple providers implement it so one SDK talks to all.
- `pg_dump` — Postgres logical backup tool that serializes the whole database to a file; unusable at real blob volume.

**Patterns and best practices.**
- Ownership split: Postgres owns identity, ownership, and lifecycle; R2 owns bytes; the join is the object key; the Postgres row is the source of truth.
- App never lists the bucket to find files — it queries Postgres and uses each row's `objectKey` to reach bytes.
- Function is never a byte pipe: function signs a presigned URL, browser transfers directly to R2, function records metadata afterward.
- Pick R2 over S3 for any read-heavy SaaS: zero egress vs ~$0.09/GB out on S3 for the dominant cost driver.
- SDK: `@aws-sdk/client-s3` works against R2 unchanged (endpoint + credentials swap); portability is structural, not a rewrite.

**Misc.** Metadata row fields established for downstream lessons: `id`, `organizationId`, `objectKey`, `contentType`, `byteSize`, `uploadedBy`, `uploadedAt`. Object key tenancy pattern established: `org/${organizationId}/files/${fileId}`. The chapter 067 CSV export `console.log` placeholder is the concrete trigger-condition-(2) example referenced throughout and the retrofit target in chapter 069.

---

## Lesson 2 — Standing up R2 — buckets, scoped tokens, and CORS

**Taught.** Minimum R2 surface to trust in production: one bucket per environment, bucket-scoped Object Read & Write token per environment, `lib/r2.ts` singleton S3 client, CORS rule with explicit origin/methods/headers, and the `org/${orgId}/files/${fileId}` object-key tenancy convention.

**Cut.** Local dev strategy (shared `acme-saas-dev` bucket with `local/${developer}/` prefix + 24 h lifecycle rule) and observability (Class A/B dashboard metrics) were covered only as brief named-once surfaces in the "What you don't configure" section, consistent with the outline's intent. No code was cut.

**Debts.** Lesson 3: presigned PUT/GET mechanics (`getSignedUrl`, `PutObjectCommand`/`GetObjectCommand`, expiry, `ContentType`/`ContentLength` pins, layered size defense, sign-then-finalize two-step, `HeadObjectCommand` verification) — `@aws-sdk/s3-request-presigner` is installed here but not called. Lesson 4: `file_metadata` row schema and key construction (`${fileId}` from row UUID + sanitized extension). Lesson 5: export-output prefix (`org/${orgId}/exports/`) and lifecycle rule on that prefix.

**Terminology.**
- `blast radius` — scope of damage a single leaked credential can cause; shrunk by granting the least access the job actually needs.
- `CORS` (Cross-Origin Resource Sharing) — browser rule that a page may only call another origin if that origin opts in via response headers; enforced by the browser, configured on the bucket, independent of whether the presigned signature is valid.
- `preflight` — automatic `OPTIONS` request the browser sends before certain cross-origin requests to check permission; the bucket's CORS rule is the answer script.
- `object key` — reinforced as the unique path addressing one bucket object; tenancy carried in the prefix `org/${organizationId}/`.
- Token grades: `Admin Read & Write`, `Object Read & Write`, `Object Read only`.

**Patterns and best practices.**
- One bucket per environment, name carries the environment (`acme-saas-prod`, `acme-saas-staging`, `acme-saas-dev`) so a misconfigured `R2_BUCKET_NAME` fails loudly instead of silently writing to the wrong env.
- One scoped token per environment — Object Read & Write, locked to that env's single bucket; Admin grade and "all buckets" scope are never granted to app code. Production credentials never touch `localhost`.
- `lib/r2.ts`: `import 'server-only'` poison pill + `S3Client` constructed once at module scope + `region: 'auto'` (required by AWS signer; R2 ignores the value but omitting it throws at signing time) + endpoint derived as `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` (not a fifth env var). Same singleton shape as `lib/db.ts` and Resend client.
- R2 env vars — all four are server-only (no `NEXT_PUBLIC_` prefix): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. `NEXT_PUBLIC_APP_URL` (already in env) is reused for CORS `AllowedOrigins`; no new var needed.
- CORS rule: `AllowedOrigins: [APP_URL]`, `AllowedMethods: ['GET', 'PUT']`, `AllowedHeaders: ['content-type']` (explicit list required on R2 — wildcard `['*']` is both a security hole and unreliable on R2 for content-type matching), `MaxAgeSeconds: 3600`. Committed to the repo as JSON, applied per bucket.
- Object key tenancy: server always constructs the key from validated inputs, never accepts it verbatim from the client (same discipline as tenant `where` clause).
- `lib/r2.ts` exports only the configured `S3Client`; presigned helpers in later lessons compose it, do not wrap it behind a generic interface (Architectural Principle #5).

**Misc.** `lib/r2.ts` is intentionally minimal — just the configured client export. Lessons 3–5 grow it with `presignedPut`/`presignedGet` helpers. The `r2-cors.json` file is committed to the repo for reviewability. R2 buckets are private by default; public bucket mode is named once as suitable only for fully public assets, not tenant files. Lifecycle rules named as a surface to recognize; lesson 5 uses one on `org/*/exports/*`.

---

## Lesson 4 — Postgres owns identity, R2 owns bytes

**Taught.** Full `file_metadata` Drizzle schema with all columns justified by failure modes, tenant-scoped `getFile`/`getFileDownloadUrl` helpers, the no-URL-column rule, soft-delete lifecycle with deferred object cleanup, and the orphan failure modes (bytes vs rows) in both directions.

**Cut.** The chapter outline listed `tenantDb(orgId).fileMetadata.findById(id)` as the read helper form — the lesson uses the standard `tenantDb(orgId).select().from(fileMetadata).where(...)` shape consistent with prior chapters. `finalizeUpload`'s full body wiring was deferred to ch069 as planned. Background sweeps for orphan bytes and orphan rows were named but not built.

**Debts.** Ch069 owns: browser-side upload UI (`<input type="file">`, `useActionState`), `finalizeUpload` action full body (HEAD call + row insert), `Files` gallery, presigned-GET render per row, and the CSV-export retrofit. Orphan sweeps (bytes: daily bucket-left-join; rows: hourly HEAD-check) deferred to ch069 or beyond.

**Terminology.**
- `file_metadata` — the canonical Postgres record for a stored file; the source of truth for "does this file exist for this org."
- `originalFileName` — user-supplied display name, stored separately from `objectKey`; used only for display and `Content-Disposition: attachment; filename=` header on download.
- `objectKey` — unique text column, the only join to R2; unique constraint is global (not partial), because a soft-deleted key must stay reserved while its bytes may still exist in the bucket.
- `byteSize` — `bigint({ mode: 'number' })`; the HEAD-verified actual size, never the client's claim.
- `softDeletedAt` — nullable `timestamptz`; `null` = live, timestamp = deleted; same soft-delete pattern from ch061.
- `buildObjectKey({ orgId, fileId, ext })` — pure helper in `lib/`; derives the object path from the row id; never built from user-controlled text.
- `getFile(orgId, id)` — tenant-scoped read helper in `db/queries/file-metadata.ts`; returns `FileMetadata | null`; uses `tenantDb(orgId)`, never bare `db`.
- `getFileDownloadUrl(orgId, id)` — composes `getFile` + `GetObjectCommand`; returns `{ url, fileName } | null`; URL is fresh-minted per call, never persisted.
- orphan bytes — R2 object with no matching row; cheap litter, daily sweep reclaims.
- orphan rows — row with no matching R2 object; correctness bug, row lies; prevented by write-last ordering.

**Patterns and best practices.**
- `file_metadata` schema: `id` (UUIDv7 PK, also the `${fileId}` key segment), `organizationId` (`onDelete: 'cascade'`), `uploadedBy` (`onDelete: 'set null'`), `objectKey` (text, `.unique()` — global, not partial), `originalFileName`, `contentType`, `byteSize` (`bigint({ mode: 'number' })`), `uploadedAt` (`timestamptz`, `defaultNow()`), `softDeletedAt` (nullable `timestamptz`).
- Composite index `idx_file_metadata_org_active` on `(organizationId, softDeletedAt, uploadedAt.desc())` — leads with tenant, skips deleted rows, serves "newest first" sort without extra sort step.
- `objectKey` unique is global, not partial: a soft-deleted row's key must remain reserved while the object may still exist in the bucket; partial unique would allow key reuse during the cooling window.
- Tenancy enforced in the SQL `where` clause via `tenantDb(orgId)` — a cross-org `fileId` returns `null`, never a row to check afterward.
- No `url` column in `file_metadata`; presigned GET minted fresh per request via `getFileDownloadUrl`.
- Soft-delete row immediately; delete R2 object later in a background sweep after cooling window (`softDeletedAt < now() - interval '30 days'`). Synchronous object deletion on soft-delete destroys recovery window.
- Row written after HEAD verification (write-last): biases failures toward orphan bytes (cheap) not orphan rows (correctness bug).
- Audit events: `file.uploaded` (payload `{ byteSize, contentType }`), `file.download_url_issued`, `file.soft_deleted` — written inside the same transaction as the change via `logAudit`.
- `FileMetadata` row type from `typeof fileMetadata.$inferSelect`, never hand-written.
- Read helpers live in `db/queries/file-metadata.ts`, one file per entity, verb-led functions.

**Misc.** DrizzleSchemaCoding exercise uses `integer` PKs and plain `timestamp` (not UUIDv7/`timestamptz`) due to PGlite probe limitation; lesson explicitly flags this as a deliberate simplification. The lesson explicitly does NOT contrast user-uploads vs export-outputs — that split is lesson 5's job.

---

## Lesson 3 — Presigned URLs — signing the upload seam

**Taught.** Presigned PUT and GET mechanics: the capability mental model, `getSignedUrl` with `PutObjectCommand`/`GetObjectCommand`, `signableHeaders: new Set(['content-type'])` for content-type enforcement, the layered size defense (client pre-check → server cap → post-upload `HeadObjectCommand`), and the two-step write (sign → direct PUT → finalize-with-HEAD → row insert).

**Cut.** The chapter outline's `presignedPut` return included `uploadId` — the lesson's action signature also returns `uploadId` and `finalizeUpload` accepts it, consistent with the outline. The chapter outline mentions `actualSize` as a `finalizeUpload` input parameter; the lesson explicitly does *not* pass it (the server reads size via HEAD, never trusts the client) — lesson 4 must keep this when building `finalizeUpload`. Object key construction code (`org/${orgId}/files/${id}.${ext}` with UUIDv7 id + sanitized extension) deferred to lesson 4.

**Debts.** Lesson 4 owns: full `file_metadata` Drizzle schema, `finalizeUpload` action full shape (including HEAD call and row insert), `getFileDownloadUrl` helper, and the orphan-byte cleanup sweep (named here as the safety net but not built). Chapter 069 owns: browser-side upload code (`<input type="file">`, `fetch` PUT wiring, `useActionState`), the `Files` gallery, and the CSV-export app-route re-mint pattern.

**Terminology.**
- `presigned URL` — ordinary R2 object URL with HMAC query parameters minted by the server; delegates one narrow operation (method + key + optional headers) to a bearer with no R2 credentials.
- `signableHeaders` — `getSignedUrl` option that forces listed headers into the signature; required to make content-type enforcement binding (`new Set(['content-type'])`).
- `HeadObjectCommand` — SDK command that fetches object metadata without the body; used post-upload to read the *actual* stored size from R2.
- `ContentLength` trap — R2 does not enforce a maximum body size from the signed `ContentLength` the way S3 presigned-POST policy does; the post-upload HEAD is the real boundary.
- `orphan bytes` — R2 object with no matching `file_metadata` row (PUT succeeded, finalize never ran); cleaned by a background sweep.
- `orphan rows` — `file_metadata` row with no matching R2 object; a correctness bug (database lies), worse than orphan bytes.
- `two-step write` — sign → direct PUT → finalize-with-HEAD → row insert; the row is the assertion that the object was HEAD-verified, not a record that a URL was issued.

**Patterns and best practices.**
- `presignedPut` action signature: `presignedPut({ fileName, contentType, claimedSize }): Promise<Result<{ url, objectKey, uploadId }>>` wrapped in `authedAction('member', schema, fn)`; role/tenant boundary at the action, R2 has no notion of user or org.
- `finalizeUpload` action does NOT accept `actualSize` from the client — it reads size via `HeadObjectCommand` server-side. This is the real enforcement boundary.
- Content-type allow-list checked server-side before signing (`if (!ALLOWED_TYPES.has(contentType)) return err('validation', ...)`); signed `ContentType` is the runtime enforcement via `403 SignatureDoesNotMatch`.
- Presigned GET URLs minted fresh per render/request, never persisted to the database; `file_metadata` has no `url` column.
- PUT expiry: 300 s (5 min). GET expiry: 600 s (10 min). Never use long expiries (24 h) for GETs sent in emails — email a link to an app route that re-mints a short-lived GET on click.
- Network tab diagnostic: `presignedPut` call carries tiny JSON; the actual PUT goes to `…r2.cloudflarestorage.com`, not the app's domain. If the heavy request hits the function, the architecture is broken. `OPTIONS 200` + `PUT 403` = content-type mismatch (fix at signing); browser-cancelled PUT with CORS error = bucket CORS rule issue (fix in lesson 2 CORS config).
- Row written after upload confirmed (write-last rule): orphan bytes are a cheap cleanup chore; orphan rows are a correctness bug.

**Misc.** The lesson does not name `lib/files/presigned-put.ts` etc. in the finished MDX body — those filenames were in the outline only and are not part of the delivered lesson. The `preflight` Term was referenced but not re-defined here (lesson 2 owns it). `HMAC` got a one-line `Term` refresher (load-bearing in this lesson). The UUIDv7 row id as the key segment (`org/${orgId}/files/${id}.${ext}`) is assumed from lesson 4; do not use `nanoid()` in key construction — the chapter outline brainstorm wrote it but lesson 4 continuity makes the row `id` the segment. `PresignedUrlAnatomy` is a custom Astro component at `src/components/lessons/068/3/PresignedUrlAnatomy.astro` rendering the URL anatomy figure.

---

## Lesson 5 — Wiring R2 into our app — two workloads, one mechanism

**Taught.** Architecture synthesis showing where both R2 workloads (user uploads and CSV export) plug into the app using one `lib/r2.ts` client and one `org/${orgId}/...` tenancy convention, the decision rule for when a `file_metadata` row is warranted vs lifecycle-rule cleanup, the export-retrofit delta (placeholder `downloadUrl` → server-side `PutObjectCommand` + presigned GET), and operational production concerns (CORS deploy order, Class B cost discipline, credential rotation surface area).

**Cut.** No scope cuts with pedagogical consequence. The chapter outline listed an optional single combined ArrowDiagram; the lesson used a custom `TwoWorkloadsFlows` Astro component (two-tab flow diagrams) plus a `VideoCallout` for the Milan Jovanović architecture sketch — both within the outline's guidance.

**Debts.** Ch069 owns all working code: browser upload UI, `finalizeUpload` action full body (HEAD + INSERT), `Files` gallery with fresh GET per row, migration for `file_metadata`, and the export retrofit as tested running code.

**Terminology.**
- `Class B operations` — R2's read/HEAD request tier (vs Class A writes); the cost driver for a read-heavy gallery.
- `lifecycle rule` — prefix-scoped auto-deletion of bucket objects older than N days; configured once on the bucket, no app code runs. R2 prefix matching is a literal string prefix, not a glob — scope cleanup rules by the `exports/` segment, not `org/*/exports/*`.

**Patterns and best practices.**
- Decision rule for metadata row: long-lived, user-managed, multi-consumer files earn a `file_metadata` row; short-lived, single-consumer generated outputs (CSV exports, nightly reports) use a lifecycle rule and no row.
- "Function is never a byte pipe" rule applies only to user-facing request handlers (per-request timeout, bandwidth bill). A background Trigger.dev worker with the CSV already in memory issues a direct `PutObjectCommand` — presigning a PUT back to the same worker is pure ceremony.
- External calls (R2 PUT, email send, Stripe) never go inside a DB transaction; the export PUT sits in the Trigger.dev run body, before the close-out transaction.
- Mint presigned GET once per page render and reuse for that render; never re-issue on every component re-render (cost and correctness).
- CORS is environment-specific and bucket-level: configure prod CORS before the first production upload, not after the first failure. Never `*` in production.
- R2 credentials are a staged-rollover rotation concern (a hard key swap drops in-flight reads); named as a future concern, not built here.

**Misc.** Export-retrofit code shape is sketched here (delta only); ch069 lesson 5 ships the full wired, tested version. Export object key: `org/${organizationId}/exports/${ctx.run.id}.csv`. The `lib/` + `db/queries/` layout is confirmed: `db/queries/file-metadata.ts` for tenant-scoped reads, NOT `lib/files/file-metadata.ts` (the chapter-outline brainstorm was wrong on this). Four server-only env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) are the full R2 env surface; endpoint derived in `lib/r2.ts`, `NEXT_PUBLIC_APP_URL` reused for CORS — no new variable needed. Custom component `TwoWorkloadsFlows` at `src/components/lessons/068/5/TwoWorkloadsFlows.astro` renders the two-tab flow diagrams.
