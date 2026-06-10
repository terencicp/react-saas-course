# Lesson 4 outline — Postgres owns identity, R2 owns bytes

## Lesson title

- Title: `Postgres owns identity, R2 owns bytes`
- Sidebar label: `The file_metadata row`

## Lesson framing

This is the data-modeling climax of the chapter. Lessons 1–3 built the conceptual split (two stores, one key), the bucket/credentials/CORS, and the presigned PUT/GET mechanics. This lesson designs the Postgres half: the `file_metadata` table that is the canonical record of "this file exists, for this org, at this key, with this verified size." The bytes already live in R2; this lesson makes Postgres the source of truth *about* those bytes.

**Mental model to land.** R2 is dumb storage keyed by a path. The `file_metadata` row is the assertion that a HEAD-verified object exists at that path for that tenant. The app never lists the bucket to find files — it queries Postgres, reads each row's `objectKey`, and reaches the bytes through it. A row without an object is a lie (worse); an object without a row is litter (cheaper). The whole row shape and lifecycle is engineered to keep those two stores from drifting.

**Pedagogical stance.** The student already owns every prerequisite primitive: Drizzle schema authoring with UUIDv7 PKs and snake-case casing, `tenantDb(orgId)` scoping (ch056), soft-delete with `softDeletedAt` (ch061), composite-index-leads-with-org discipline (ch039), and the presigned helpers + two-step write (lesson 3). So this lesson is *not* a Drizzle tutorial — it is a sequence of **design decisions**, each framed as "here is the obvious shape, here is where it breaks, here is the senior shape." Lead every subsection with the decision, justify with the failure mode, show the minimal code. The cognitive load is in the *reasoning*, not the syntax. Build the row incrementally: start with the naive four columns a beginner would write, then add each column as a problem forces it.

**Where beginners go wrong (the lesson's targets).** (1) Storing the presigned URL in the row — it goes stale, the row lies. (2) Building `objectKey` from the user's filename — collisions, unsafe chars, length. (3) Trusting the client's `byteSize` claim instead of the HEAD result. (4) Hard-deleting the row and orphaning the bytes, or deleting the object instantly and losing recovery. (5) Reading `file_metadata` outside `tenantDb` — cross-tenant leak. Each watch-out is taught inside the subsection that establishes the right shape, never bundled at the end.

**What the student can do at the end.** Write the `file_metadata` Drizzle schema from scratch with the right columns, constraints, and index; explain why `id` doubles as the key segment and why there is no `url` column; place tenancy enforcement at the read helper; describe the soft-delete + cooled-off-cleanup lifecycle and the orphan failure modes in both directions; and recognize that the row is written *after* the HEAD verification, never before.

**Visualization plan.** Two diagrams carry the abstract relationship. (1) A "two stores, one key" figure (D2 `sql_table` + a bucket box, key as the join) makes the ownership split concrete. (2) A `DiagramSequence` walking the orphan failure modes in both directions — the row/object pair drifting and the sweep that reconciles them. One `DrizzleSchemaCoding` exercise lets the student build the row and a probe verifies the `objectKey` unique constraint fires. One `Buckets` drill sorts "which store owns this fact." Code is shown with `AnnotatedCode` for the schema (multiple columns each need a focused justification) and plain `Code` / `CodeVariants` for the helpers and the no-`url`-column wrong-vs-right.

## Lesson sections

### Introduction (no header)

Open on the senior question, stated implicitly: the bytes are in R2, keyed by `org/${orgId}/files/${fileId}`. What does Postgres need to remember about them, and how does that record stay in sync with the bucket without ever scanning it? Connect back: lesson 1 promised "Postgres owns identity, R2 owns bytes" as the chapter's spine — this lesson cashes that promise as a table. Preview the deliverable: by the end the student has the `file_metadata` schema, the tenant-scoped read helper, the fresh-URL-per-render rule, and the soft-delete lifecycle. Keep it to ~4 sentences, warm and terse. No celebratory tone.

### The split: identity in Postgres, bytes in R2

Establish the ownership boundary before any column appears. Postgres owns identity, ownership, content-type, size, and lifecycle metadata. R2 owns the bytes and nothing else — it has no notion of user, org, or "deleted." The `file_metadata` row is the canonical record; the object is the payload the row points at. State the load-bearing rule once, plainly: **reads always go through `file_metadata`; nothing in the app ever lists the bucket to discover files.** Justify — a bucket list is O(objects) with no tenancy, no filtering, no ordering; Postgres gives all three for free against an indexed table. This reframes R2 from "the file system" to "a content-addressed blob store the database indexes."

Diagram (D2, `direction: right`, wrapped in `<Figure>`): left = a `shape: sql_table` for `file_metadata` showing the key columns with their constraint badges (`id` primary_key, `object_key` unique); right = a plain rectangle labeled "R2 bucket" containing one object box `org/acme/files/0192f…pdf`. One edge from the row's `object_key` cell to the object, labeled "the only join." Pedagogical goal: the student sees that the relationship is a single string and that everything else about the file lives in Postgres. Keep it under ~400px tall; bump `**.style.font-size` to ~26.

### The naive row, and the three problems it hides

Start with the row a beginner writes — the obvious shape — then break it. Show it in a plain `Code` block: `id`, `organizationId`, `url` (the R2 URL), `fileName`. Then name the three problems this shape hides, each becoming a later subsection: (1) the `url` column will go stale (presigned URLs expire — lesson 3); (2) `fileName` as the key is unsafe and collision-prone; (3) there is no verified size, so the client's claim is trusted. This subsection is the hook that motivates the real schema — it makes each subsequent design decision feel earned rather than handed down. Keep the naive block small (4 fields) and explicitly labeled as the shape we are about to fix.

### Why `id` is also the object key

The first design decision. The row's UUIDv7 primary key *is* the `${fileId}` segment in `org/${orgId}/files/${id}.${ext}` — established in lesson 3's key construction (continuity: the key segment is the row `id`, never `nanoid()`). Teach the wins as a chain: row→object lookup becomes a pure function (`id` → `objectKey`, no secondary table); listing an org's files is a Postgres query, never a bucket list; deleting the row's lifecycle drives the object's deletion. Contrast the alternative once — a random `objectKey` independent of the row id forces a lookup table in both directions and breaks recovery (you can't reconstruct the key from the row). Tie to the UUIDv7 choice already taught: time-ordered ids give index locality on the canonical "newest files first" query *and* a sortable key prefix.

Code: a small `Code` block showing `buildObjectKey({ orgId, fileId, ext })` returning the template-literal path (the `lib` helper named in lesson 3's file layout). Reinforce the convention rule from Code conventions §Naming (`buildObjectKey`, verb-led pure helper). Note the extension is sanitized server-side — forward the detail to the next subsection rather than expanding here.

### Why the original filename is a separate column

Second decision. The user uploaded `Q4 Financials FINAL.pdf`; the object key is `org/acme/files/0192f….pdf`. These are two different facts and the row stores both. `originalFileName` (text) preserves the human label for display; `objectKey` is the URL-safe, collision-free path derived from the row id plus a sanitized extension. Teach the rule: never let user-controlled text into the key — spaces, slashes, unicode, and length limits all break object keys or open path-confusion. Then close the loop on *why we still keep the original name*: the presigned-GET download sets `Content-Disposition: attachment; filename="${originalFileName}"` so the browser saves the file under the name the user recognizes, not the UUID. This is the payoff that makes the separate column non-negotiable.

Use `CodeVariants` (two tabs) for the wrong-vs-right key construction: tab "Filename as key" (uses `file.name` verbatim — collisions, unsafe chars), tab "Id as key, name preserved" (id-derived key + `originalFileName` column). One paragraph each. The before/after is exactly the A/B shape `CodeVariants` is for.

### The row that ships

Now assemble the full Drizzle schema, every column justified by the problems already raised. Present it with `AnnotatedCode` (the block is one `pgTable` with ~9 columns + an index; the student's attention needs steering to each column in turn — this is precisely AnnotatedCode's job). Walk steps:

- `id` — `uuid().primaryKey().$defaultFn(() => uuidv7())`. The key segment. (color blue)
- `organizationId` — `uuid().notNull().references(() => organizations.id)`, the tenant anchor; FK `onDelete` is `cascade` (the org's files die with the org) — name the `onDelete` choice explicitly per Code conventions §Data layer.
- `uploadedBy` — `uuid().references(() => users.id)`, who uploaded; `set null` on delete so a removed user doesn't erase the file record.
- `objectKey` — `text().notNull().unique()`, the join key; the unique constraint is the structural guarantee that no two rows reference the same blob. Highlight the `.unique()` and state the rule once.
- `originalFileName` — `text().notNull()`, display + `Content-Disposition`.
- `contentType` — `text().notNull()`, from the validated upload (the allow-list lives at the action, lesson 3).
- `byteSize` — `bigint({ mode: 'number' })`, the HEAD-verified actual size; emphasize *verified*, not claimed (color this step orange as the watch-out).
- `uploadedAt` — Drizzle form is `timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow()` (the SQL type is `timestamptz`; Code conventions store instants as `timestamptz`, the Temporal codec sits at the read boundary — name it once, do not expand).
- `softDeletedAt` — `timestamp('soft_deleted_at', { withTimezone: true })` nullable, the ch061 soft-delete carry-over (forward to the lifecycle subsection).

Then a separate short step for the index (see next subsection — but the index line lives in this same block so AnnotatedCode can highlight it as the final step). Keep each step's prose to one tight paragraph. After the walkthrough, restate the `$inferSelect` rule (Code conventions §Data layer): row type comes from `typeof fileMetadata.$inferSelect`, never hand-written.

`CodeTooltips` candidates inside this block: `timestamptz` (one-line: "Postgres timestamp with time zone; stores an instant in UTC"), `$defaultFn` (one-line: "Drizzle hook that runs in JS at insert time to generate a default"). Use sparingly — only these two.

### Indexing the access pattern, not the columns

Short, focused. Restate the ch039 discipline: index the query you actually run, lead with the tenant column. The canonical read is "list this org's non-deleted files, newest first," so the index is `index('idx_file_metadata_org_active').on(t.organizationId, t.softDeletedAt, t.uploadedAt.desc())` — name it explicitly per Code conventions §Data layer (always pass an explicit `name`, lead with `orgId`). Explain the column order: `organizationId` narrows to the tenant, `softDeletedAt` lets the planner skip deleted rows, `uploadedAt DESC` serves the sort without a separate sort step. Mention the partial-unique option for soft-delete lifecycle from Code conventions only if it clarifies — here the `objectKey` unique is already global (a key is unique forever, even after soft-delete, because the object may still exist), so a plain `.unique()` is correct and a partial unique would be wrong; call that out as a deliberate divergence so the student doesn't reflexively reach for the partial-unique pattern they saw for slugs.

### Tenancy lives at the read, never after the load

The security spine. Every read goes through `tenantDb(orgId)` so the `where` clause pins `organizationId` in SQL — a fabricated `fileId` from another org cannot resolve a row, because the row simply isn't in the scoped result set. Restate the ch056 rule (Code conventions §Data layer): tenant filters live in the `where` clause, never as a post-load check. Show the `db/queries/file-metadata.ts` read helper: `getFile(orgId, id)` returning the row or `null`, closing over `tenantDb(orgId)`. Tie the file location to Code conventions (`db/queries/` is the home for tenant-scoped reads, one file per entity, verb-led functions). Forecast the ch069 `getFile` / `listFiles` call sites.

Code: a single `Code` block (the helper is short and the shape is familiar from prior chapters — no need for AnnotatedCode here). Watch-out inline: reading `file_metadata` through bare `db.<table>` is the cross-tenant leak the linter pattern flags.

Optional small exercise here or fold into the end-of-section drill: a `MultipleChoice` — "A user requests file `X` that belongs to another org. With `tenantDb(orgId)`, what does `getFile` return?" (correct: `null` / not-found, because the scope excludes it). Reinforces that tenancy is structural, not a branch the developer remembers to write.

### No URL column: the helper mints fresh

The decision that ties this lesson to lesson 3. The row carries the *permanent* facts (org, key, type, size, names); it never stores a URL, because a presigned URL expires and a stored URL lies. Reads mint a fresh presigned GET per request through a helper that sits on the metadata layer: `getFileDownloadUrl(orgId, id)` → looks up the row in tenant scope, presigns a 10-minute GET against `objectKey`, returns `{ url, fileName }` for the client's `<a href>` / `<img src>`. Restate the lesson-3 rule (continuity): GET URLs are fresh-issued per render, never persisted, never cached past expiry. Connect to Architectural Principle #5 (Code conventions §Data layer / Forms): the R2 SDK is not abstracted, but the call site has a thin helper that *composes* the SDK to generate URLs on demand.

Use `CodeVariants` (two tabs) for the contrast: tab "Stored URL (lies)" — schema has a `url` column, set at upload; 25 hours later the link is dead. Tab "No URL, minted fresh" — no column, `getFileDownloadUrl` presigns on read. This is the canonical wrong-vs-right and reuses the lesson-3 email-link anti-pattern as the concrete failure.

### Soft delete, and the cooled-off object sweep

The lifecycle decision. Carry the ch061 discipline: deletion sets `softDeletedAt`, the row stays. Teach the two reasons specific to *files*: (1) audit and recovery — "did this user have access to this file two weeks ago" stays answerable, and a fat-fingered delete is reversible; (2) decoupled object cleanup — the row marks deletion *intent*, and a background sweep deletes the R2 object only after a cooling window (`softDeletedAt < now() - interval '30 days'`). Spell out why the window matters in both directions: hard-deleting the row immediately orphans the bytes (no record points to them, so nothing ever cleans them); deleting the object the instant the row is soft-deleted destroys the recovery window. The cooled-off sweep is the senior shape that respects both. Name the sweep as a Trigger.dev/cron job (ch066/067 vocabulary) but **do not build it** — forward note.

Show the soft-delete write as a tiny `Code` snippet (`softDeleteFile` sets `softDeletedAt: <now>` inside the tenant scope). Watch-out inline: deleting the object synchronously with the soft-delete is the no-recovery trap.

### The orphan problem in both directions

The reconciliation story — this is where the "two stores can drift" theme pays off, and it earns the chapter's recurring orphan vocabulary. Two failure modes, deliberately asymmetric in cost:

- **Orphan bytes** — PUT succeeded, `finalizeUpload` never ran (network drop, function timeout, user navigated away). An object sits in R2 with no `file_metadata` row. Cost: cheap. Cleanup: a daily sweep lists `org/*/files/*` objects, left-joins against `file_metadata.objectKey`, deletes the unmatched ones after a 24h grace. Litter, not a bug.
- **Orphan rows** — a `file_metadata` row whose object doesn't exist. Cost: expensive — the UI lists a file that 404s on download; the database lies. This is why the two-step write (lesson 3) writes the row *after* the HEAD confirms the object. Defense-in-depth cleanup: an hourly query for rows older than an hour whose R2 HEAD returns 404, hard-deleted.

Land the senior takeaway explicitly: **orphan bytes are a cleanup chore; orphan rows are a correctness bug.** That asymmetry is *why* the row is written last. Neither sweep is built here — both are forward notes (ch069 or beyond).

Diagram: a `DiagramSequence` (provides its own card — do **not** wrap in `<Figure>`). Steps walk one timeline:
1. Sign + PUT → object in R2, no row yet (a box for R2 holding an object, a box for Postgres empty). Caption: bytes land first.
2. `finalizeUpload` HEAD-verifies, inserts row → both in sync. Caption: the row is the assertion the object exists.
3. Branch A — finalize fails → object present, row absent = **orphan bytes** (tint the lone object). Caption: cheap litter, daily sweep reclaims it.
4. Branch B — hypothetical row-without-object = **orphan row** (tint the lone row). Caption: the row lies; this is why we write it last.
Pedagogical goal: make the temporal ordering of the two-step write visible and show *which* drift each ordering choice prevents. Keep boxes simple (two labeled columns, an object/row chip that appears/disappears per step). Plan for the tallest step to set the height.

### Auditing every file event

Brief — names the discipline, doesn't re-teach audit infrastructure. Every file lifecycle event writes one `audit_logs` row at the action boundary (ch ten-series `logAudit` vocabulary): `file.uploaded` (payload `{ fileId, byteSize, contentType }`), `file.download_url_issued`, `file.soft_deleted`. State why files specifically warrant it: file access is a common compliance and incident-review surface ("who downloaded the contract, when"). Tie to the continuity fact that `logAudit` derives actor/org from the session at the action boundary. One sentence per event, a tiny illustrative `logAudit` call for `file.uploaded`. Do not expand into the audit table schema — that's owned elsewhere.

### Practice: build the file_metadata row

Place a `DrizzleSchemaCoding` exercise here (after the schema and constraints are taught, before the recap). The student writes the `file_metadata` table to a `requirements` spec and a probe verifies the `objectKey` unique constraint actually rejects a duplicate.

- `instructions`: "Complete the `fileMetadata` table: every file needs a tenant, a unique object key, the user's original filename, a verified byte size, and soft-delete support."
- `starter`: a partial `pgTable` with `id` and `organizationId` already present (plus a stub `organizations` table to satisfy the FK), the rest as a `// add columns` comment. Use `integer` PKs and `text`/`bigint`/`timestamp` per the exercise runtime's builder set; note for the build agent: PGlite probes can't run `uuidv7()` (Phase-B gotcha), so the exercise uses `integer`/`serial` ids, not UUIDv7 — flag this as a deliberate simplification from the production schema, with one sentence telling the student the real table uses UUIDv7 (taught above).
- `requirements`: `fileMetadata` with columns `organization_id` (notNull, references `organizations.id`), `object_key` (text, notNull), `original_file_name` (text, notNull), `content_type` (text, notNull), `byte_size` (bigint, notNull), `uploaded_at` (timestamp, notNull, hasDefault), `soft_deleted_at` (timestamp, nullable); single-column `unique` on `object_key`.
- `seedSQL`: one `organizations` row.
- `probes`: (1) inserting two rows with distinct keys succeeds (`mustSucceed: true`); (2) inserting two rows with the same `object_key` fails (`mustSucceed: false`) — proves the unique constraint.

Grading goal: the student internalizes the column set and that the unique key is a real, enforced constraint, not decoration.

### Recap drill: which store owns this fact

Close with a `Buckets` (two-column) drill cementing the ownership split — the lesson's central mental model, checked one last time.

- Bucket "Postgres (`file_metadata`)" — owns identity facts.
- Bucket "R2 (the bucket)" — owns bytes only.
- Items: "Which org a file belongs to" (PG), "The raw PDF bytes" (R2), "The user's original filename" (PG), "Whether the file is soft-deleted" (PG), "The verified byte size" (PG), "The thumbnail image data" (R2 — if such a thing existed), "Who uploaded it" (PG), "The content-type recorded at upload" (PG). Skew deliberately toward Postgres to drive home that R2 owns *only* bytes; the few R2 items are pure payload.
- `instructions`: "Sort each fact into the store that owns it."

This is the recall check the chapter framing wants: the student should leave able to answer "who owns what" instantly.

### External resources (optional)

One or two `ExternalResource` cards: Drizzle `pgTable` column-types reference; optionally the AWS SDK `HeadObjectCommand` reference (since `byteSize` provenance traces to it). Keep to canonical docs only; no marketing pages.

## Scope

**Prerequisites to redefine concisely, not re-teach:**
- `tenantDb(orgId)` — the factory that bakes `organizationId` into the SQL `where` clause (ch056). One-sentence refresher at the tenancy subsection; do not re-derive.
- Soft-delete (`softDeletedAt` nullable timestamp, deletion sets it, reads filter it) — ch061. One-sentence refresher.
- UUIDv7 PKs and snake-case casing on the Drizzle client — established convention. State the column form, don't justify UUIDv7 from scratch beyond the index-locality + sortable-key-prefix wins relevant *here*.
- Composite-index-leads-with-tenant — ch039. One-sentence refresher at the index subsection.
- Presigned PUT/GET, the two-step write, HEAD verification, the `objectKey` construction — **all owned by lesson 3.** This lesson *consumes* them: it assumes `byteSize` arrives HEAD-verified and that GET URLs are minted fresh. Restate the conclusions (write row last; never store the URL) but do not re-teach the signing mechanics.

**This lesson does NOT cover:**
- The full browser-side upload flow, `<input type="file">`, the `Files` gallery UI, `finalizeUpload`'s full body wiring — **Chapter 069** (the project). This lesson defines the *schema and helper signatures* the project fills in.
- Building the orphan-byte / orphan-row sweeps — named as forward notes, not built (ch069 or beyond).
- The presigned signing mechanics, expiry trade-offs, `ContentType`/`ContentLength` pins, CORS — **lesson 3.**
- Bucket/credentials/CORS setup — **lesson 2.**
- The threshold decision (when to reach for R2 at all) and the R2-vs-S3 economics — **lesson 1.**
- The CSV-export retrofit and the "two workloads, one mechanism" wiring (export outputs deliberately get *no* `file_metadata` row) — **lesson 5.** Resist the urge to contrast user-uploads vs export-outputs here; that split is lesson 5's job.
- Image transformation / resizing by content-type — out of scope (Cloudflare Images), named once at most.
- Per-file ACLs (private-to-one-user-within-an-org) — out of scope; org-level tenancy is the course default.
- Object versioning — out of scope.

## Notes for the build agent

- Lead with decisions, not Drizzle syntax — the student knows Drizzle. Every subsection is "obvious shape → where it breaks → senior shape."
- The schema `AnnotatedCode` block is the centerpiece; keep `maxLines` at/under 18 (it's a hard ceiling) — the ~9 columns + index fit if prose is tight.
- Keep code blocks aligned to Code conventions §Data layer: explicit `onDelete`, explicit index `name` leading with `orgId`, `$inferSelect` for row types, `db/queries/` for read helpers, `bigint({ mode: 'number' })` for `byteSize`, `timestamptz` for instants. Where the `DrizzleSchemaCoding` exercise diverges (integer ids, no UUIDv7, plain `timestamp`) flag it as a deliberate PGlite-probe simplification and tell the student the production table uses UUIDv7/timestamptz.
- The two diagrams are load-bearing — the static D2 split-of-ownership and the `DiagramSequence` orphan timeline. Don't skip them for prose.
- Watch-outs are taught inline in the subsection that owns the right shape (Pedagogical guidelines / lesson structure) — never collected into a trailing "gotchas" section.
- Do not contrast user-uploads vs export-outputs; that's lesson 5.
