## Concept 1 — Object storage is the conditional half of the unit

**Why it's hard.** The student arrived in Unit 13 expecting "and now we learn S3-style uploads." The reflex is to assume every SaaS needs a bucket, and the natural failure mode is to plumb R2 into the project before any trigger condition fires — operational complexity for nothing. The senior posture is the inverse: most B2B SaaS in 2026 ships without ever writing a byte outside Postgres, and the threshold for adding a second storage system has to be defensible out loud before the bucket exists.

**Ideal teaching artifact.** A "would you reach for R2?" classifier the student runs against twelve recognizable product surfaces — a markdown editor for support docs, a 200 MB video tutorial library, an avatar uploader, a settings JSON blob, a generated PDF invoice, a 50-row CSV email export, a profile bio (text), a shared marketing image deck, a contract-attachment field, a feature-flag config, a generated OG card, a third-party media import. For each row the student commits a verdict (R2 / Postgres / build pipeline / no storage) and a one-line trigger reason before the senior call is revealed. The reveal column maps each correct answer back to one of the three named trigger conditions (user uploads, generated assets, third-party media) or to the named "this does not justify R2" set. Decision archetype as a predict-then-reveal classifier — the artifact teaches the threshold by making the student defend each "no" against a real-looking surface.

**Engagement.** The classifier carries the prediction. A follow-up `Buckets` round sorts six new surfaces (a 20-page generated PDF report, a SaaS pricing page logo, three lines of YAML, a customer-uploaded ZIP, a server-rendered Twitter card, a cached external icon) into "R2 earns its weight" vs. "stays out of R2" — confirming the threshold transfers to surfaces the lesson didn't pre-name.

**Components.**
- Reuse `ClassificationTable` (proposed in Chapter 15.1, primary if it ships before 13.3): rows are surfaces, columns are the verdict commit and the trigger reason; reveal shows the senior call. Forward-link from 15.1 means this is the second compounding use.
- Alternative if `ClassificationTable` is not yet built: a static `Figure` table plus per-row `MultipleChoice` for the verdict. Workable but loses the columnar comparison across surfaces.
- Closing recall: `Buckets` (R2 in / R2 out) on six unseen surfaces.

**Project link.** Chapter 13.4 opens by reusing this threshold to defend why the project's `<input type="file">` falls inside the "user uploads" trigger and why the 13.2 CSV retrofit falls inside "generated assets" — both rows resolve cleanly to R2.

---

## Concept 2 — R2 over S3, UploadThing, Vercel Blob, Supabase Storage

**Why it's hard.** Once the student accepts that storage is needed, the default 2026 reflex is "S3 is the noun for object storage." The misconception that bites: storage vendors are interchangeable on the read path, and the choice is a feature comparison. The senior framing is bottom-line — for any SaaS that serves files back to users (which is most of them once trigger condition (2) fires), the egress line on the monthly bill is the entire decision, and R2's zero-egress pricing flips that line by an order of magnitude.

**Ideal teaching artifact.** A side-by-side cost calculator the student drives with two sliders — storage volume (1 GB to 50 TB) and monthly egress (1× to 20× the stored volume). The artifact renders the monthly bill on five providers (R2, S3, Vercel Blob, UploadThing, Supabase Storage) as a stacked bar with two segments: storage cost and egress cost. As the egress slider climbs, the S3 / Vercel Blob / UploadThing bars stretch off the chart while R2's stays flat. The student watches the structural difference rather than reading numbers — the artifact makes "egress dominates the bill" visible by manipulation. Below the calculator, a second pane fixes the workload at a realistic SaaS shape (10 TB storage, 50 TB egress/month) and labels each provider's bar with the actual dollar number. Decision archetype with the comparison embedded in the manipulation.

**Engagement.** A `MultipleChoice` ambush right after the calculator: "your SaaS hosts 5 TB of customer PDFs and the average customer downloads them 8× per month. Which line on the bill drives the storage decision?" with distractors "storage cost," "PUT operation cost," "egress cost," "engineering time on the upload widget." The correct egress answer is one click; the distractors expose the residual assumption that the visible cost (the widget) drives the call.

**Components.**
- New `ProviderCostCalculator`: two sliders (storage, egress multiplier), stacked-bar visualization per provider, pinned-workload comparison pane underneath. Inputs: provider pricing config object. Forward-link: Chapter 21 deploy/cost story can reuse the shape for the Vercel-vs-self-host comparison.
- Alternative if the calculator doesn't earn its build: a static `Figure` with a pre-rendered stacked-bar chart at the pinned workload, plus a `TabbedContent` showing three workload presets (light, typical, heavy). Loses the live manipulation that makes "egress dominates" feel structural.
- Closing recall: `MultipleChoice` on the dominant cost line.

**Project link.** Chapter 13.4 uses R2 in code without re-litigating the choice — this concept produces the bill-of-materials defense the student carries forward through every later R2-touching lesson.

---

## Concept 3 — Postgres owns identity, R2 owns bytes — the three nouns

**Why it's hard.** The student's instinct is to treat the bucket as the source of truth ("the file is in R2; the database optionally mirrors metadata"). The two misconceptions this fixes: the row in Postgres is the canonical record (the object in R2 is what the row points to, not the other way around), and the three nouns — bucket, object key, metadata row — each own a distinct slice of the file's identity. Until the student internalizes the split, they will write code that lists the bucket, treats the URL as the file's identity, or stores the URL on the row.

**Ideal teaching artifact.** A two-pane "split anatomy" diagram. Left pane: a Postgres row card showing the `file_metadata` fields (`id`, `organizationId`, `objectKey`, `originalFileName`, `contentType`, `byteSize`, `uploadedBy`, `uploadedAt`, `softDeletedAt`). Right pane: an R2 object icon labelled with the object key path. A line connects the row's `objectKey` column to the object — labelled as "the join." The student then drags eight question cards onto the right pane ("the user's display filename," "does this file belong to org A," "the actual size in bytes," "the bytes themselves," "has this been soft-deleted," "the unique identity of the file in the app," "the public download URL," "the lifecycle deletion timestamp") — each card snaps to either the Postgres row or the R2 object. The "public download URL" card pointedly does not snap to either — it belongs to neither, and the artifact's eighth slot is a third bin "generated on demand, owned by neither." The drop targets correct the misconception in place. Concept archetype as a guided sort over an anatomical diagram.

**Engagement.** The drag-sort is the assessment. A short `TrueFalse` round confirms the split lands: "the row's `id` and the `${fileId}` segment in the object key are the same UUID" (true), "listing files by org is a bucket list operation" (false), "the presigned URL is stored on the row" (false), "deleting the row immediately deletes the R2 object" (false).

**Components.**
- New `SplitAnatomy` (primary): two-pane diagram with a drop-zone interaction. Inputs: left pane field list, right pane object label, draggable item set with target keys, an optional third bin. Renders the join line as static SVG between the panes. Forward-link: Unit 14 dispatcher (the channels-vs-registry split has the same shape), Unit 17 audit (subject-vs-action split for audit rows), Unit 8 email (provider vs. template-render split).
- Alternative: static `Figure` with hand-SVG anatomy plus a separate `Buckets` (two columns: Postgres / R2, third row for "neither"). Loses the spatial mapping between the question and the location, but covers the recall.
- Closing recall: `TrueFalse` on four statements.

**Project link.** Chapter 13.4 builds the `file_metadata` schema (13.4.4) and the `listFiles` join (13.4.5) directly against this anatomy — the lesson references the diagram when writing the Drizzle schema.

---

## Concept 4 — The bucket's trust boundary: scoped tokens, environments, CORS, object-key tenancy

**Why it's hard.** The R2 dashboard has eight knobs the student hasn't seen before, and the natural failure mode is to use the account-level token (it works) with `AllowedOrigins: ['*']` (CORS errors go away) and a client-supplied object key (the upload works). Each step is locally rational and each is a production leak waiting to fire. The senior model: every R2 dashboard click is either a trust boundary or dashboard noise, and four specific configurations carry the whole trust story — bucket-per-environment, scoped tokens, CORS pinned to the app origin, server-constructed object keys with org-prefix tenancy.

**Ideal teaching artifact.** A guided "configure the bucket" puzzle in three rounds. Round 1: the student is shown a dashboard mockup with five token configurations (account-level, bucket-scoped read-only, bucket-scoped read+write, bucket-scoped read+write+admin, account-level with bucket filter) and four environments (prod, staging, dev shared, dev per-developer); they have to pick one token-environment pairing that satisfies the senior defaults. Wrong picks reveal the failure mode in a one-line callout ("admin scope is delete-bucket blast radius"). Round 2: a CORS JSON editor pre-filled with `AllowedOrigins: ['*'], AllowedHeaders: ['*']`; the student edits to the correct shape, and a "simulated attack" panel shows a forged origin attempting to PUT — the wide-open config accepts it, the correct config refuses. The panel also surfaces the R2-specific quirk that `AllowedHeaders: ['*']` silently fails. Round 3: an object-key constructor where the student picks between four candidates (`${file.name}`, `${userId}/${file.name}`, `org/${organizationId}/files/${fileId}`, `${nanoid()}`); each pick is paired with an attacker scenario (a fabricated client key, a collision, a tenancy escape, a path traversal) showing which fail. Pattern archetype, named for what each configuration prevents — the puzzle carries the assessment by making the wrong defaults visibly broken.

**Engagement.** The three-round puzzle is the assessment. A closing `Buckets` round sorts ten R2 dashboard knobs (lifecycle rules, public bucket toggle, location hint, scoped token, CORS origin, CORS allowed-header, multipart upload threshold, request-counts dashboard, account-level API key, bucket-create permission) into "trust boundary, configure deliberately" vs. "dashboard noise, defaults are fine" — confirming the student can grade the surface.

**Components.**
- New `BucketTrustPuzzle` (primary): three-round guided configurator. Inputs: per-round option set, per-option failure mode copy, per-round attack simulation snippet. Renders the dashboard mockup, the simulated attack panel, and the round-by-round progression. Forward-link: Unit 17 audit (similar three-round shape for IAM-role least-privilege puzzles), Unit 9 Better Auth (session-cookie trust-boundary configuration carries the same anatomy).
- Alternative: three separate `MultipleChoice` rounds inside a `Steps` block with a static `Figure` per round showing the failure mode as a sequence diagram. Covers the teaching but loses the cumulative "you are configuring one bucket" framing that makes the four trust knobs feel like one coherent surface.
- Closing recall: `Buckets` on ten R2 knobs (trust boundary vs. noise).

**Project link.** The 13.4 starter ships the prod bucket pre-configured by the instructor, but the project's `pnpm cors:apply` script is the production version of round 2 — the student runs it once and the script's source is the corrected JSON from this puzzle. The dev bucket's per-developer prefix matches the round 1 staging/dev decision.

---

## Concept 5 — The bytes never touch the function

**Why it's hard.** Every prior endpoint in the course has been a function the request flows through. The student's reflex is to write the same shape for uploads — `<form action={uploadFile}>` with a multipart body, the function reads the buffer, the function writes to R2. Locally it works for a 10 KB test file. In production it doubles the bandwidth bill, doubles the upload time, and hits the function timeout for any real file. Architectural Principle #3 says the function is never a byte pipe; the student has to *see* the function step out of the byte path before the presigned URL mechanics make sense.

**Ideal teaching artifact.** A side-by-side network-tab time-travel widget. The student picks a file size (1 MB, 50 MB, 500 MB) and presses play. Two timelines animate in parallel. Top timeline — the naive shape: browser POSTs multipart to `/upload`, function receives bytes, function PUTs to R2; a "function CPU seconds" counter ticks up, a "function bandwidth" counter ticks up, a "user wait" bar fills, the 500 MB case hits the 60-second timeout and the timeline goes red. Bottom timeline — the presigned shape: browser POSTs a tiny JSON to `/presigned-put`, function returns a 200-byte URL, browser PUTs directly to `r2.cloudflarestorage.com`, function fires `finalizeUpload` with a tiny JSON; both counters stay flat regardless of file size. The student watches the byte pipe disappear from the function and the cost line stay flat as the file grows. Concept archetype as a controllable simulation — manipulation is the lesson because reading the rule never lands the cost-vs-file-size shape.

**Engagement.** A `PredictOutput`-style round right after the simulation: three scenarios with a file size and an upload path ("multipart POST to `/api/upload`, file is 200 MB," "presigned PUT, file is 5 GB," "presigned PUT, file is 50 MB but the function HEADs the object after"), and the student predicts whether function bandwidth bills (yes/no) and whether function CPU bills (yes/no) for each. The HEAD scenario forces the student to distinguish a small post-upload metadata check from a byte pipe.

**Components.**
- New `BytePipeSimulator` (primary): side-by-side animated network timelines with a file-size slider and the four meters (function CPU, function bandwidth, user wait, R2 storage). Inputs: file-size options, animation timing config, the two flow definitions. Forward-link: Chapter 21 deploy-cost story (similar shape for serverless vs. always-on cost models), Unit 22 streaming AI responses (the function as a passthrough vs. byte pipe distinction recurs).
- Alternative: a static `Figure` with two sequence diagrams side by side plus a small `DiagramSequence` of three file-size frames. Conveys the structural shape but loses the cost-as-you-scale visceral that makes the rule stick.
- Closing recall: `PredictOutput` with three scenarios on the two billing axes.

**Project link.** Chapter 13.4.7 walks the student through opening the browser's network tab during an upload and confirming the PUT lands at the `r2.cloudflarestorage.com` host while the function call carries a 200-byte JSON — the verification step is the live version of this simulation.

---

## Concept 6 — Signed parameters and the layered size defense

**Why it's hard.** The presigned URL feels like one mechanism with one trust property ("only the holder can upload"), and the student misses that the signature *also* pins what the upload is allowed to be. The two failure modes the layered defense prevents: an attacker uploads a `.exe` to a `.png` key because no content-type was pinned, and a client upgrades a "5 MB profile photo" upload into a 5 GB size-bomb because no size-side check fired. The senior model: the signed parameters pin the upload's shape, *and* the function checks the claim before signing, *and* a post-upload HEAD verifies the actual bytes match the claim — three layers because no single one of them is the boundary.

**Ideal teaching artifact.** A two-panel diagnostic — left panel renders the signed PUT URL with each query parameter as a clickable token (`X-Amz-Signature`, `Bucket`, `Key`, `Content-Type`, `Content-Length`, `X-Amz-Expires`); clicking each token reveals what it pins and what attack it prevents. Right panel runs four attack simulations: (1) browser PUTs with a mismatched `Content-Type` header (403 SignatureDoesNotMatch), (2) browser PUTs a body 100× larger than the claim (R2 accepts it — this is the gap the HEAD closes), (3) browser PUTs without a content-type at all (the unsigned variant accepts arbitrary types — the signed variant rejects), (4) browser PUTs after the expiry (403 Expired). Below the panels, a third strip shows the three-layer defense as a relay: client-side `file.size` check → server-side per-tenant cap → post-upload HEAD comparison; each layer has a "what bypasses me?" tooltip clarifying why all three are required. Mechanics archetype embedded in an interactive failure-mode tour.

**Engagement.** After the diagnostic, a `Sequence` exercise reorders the layered defense's six steps for a single upload: client validates `file.size` → request presigned URL with `claimedSize` → server validates `claimedSize` against tenant cap → server signs URL with `ContentType` and `ContentLength` → browser PUTs with matching `Content-Type` header → server HEADs the object and compares actual size before inserting the row. The student drags the six steps into order; only the correct order produces a "signed, uploaded, verified" terminal state.

**Components.**
- New `SignedUrlAnatomy` (primary): clickable URL with per-parameter tooltips plus a four-scenario attack simulator. Inputs: parameter definitions, attack scenario set. Forward-link: Unit 9 (JWT anatomy — the same clickable-segments shape teaches `iss`/`sub`/`exp`/`aud`), Unit 12 (Stripe webhook signature anatomy). Strong forward reuse.
- The three-layer defense strip is a hand-SVG inside the same `Figure` — single artifact, two beats.
- Closing recall: `Sequence` on the six-step layered defense flow.

**Project link.** The 13.4 `presignedPut` action validates `claimedSize` against a tenant cap and signs with `ContentType` + `ContentLength`; the 13.4 `finalizeUpload` action HEADs the object before inserting the row. The student is implementing the three layers from this concept directly.

---

## Concept 7 — Expiry as the trust window; presigned GETs are fresh per render

**Why it's hard.** The student treats the presigned URL as a stable identifier — once issued, useful indefinitely — and the natural failure modes follow: the URL gets stored on the `file_metadata` row, pasted into a 24-hour email link, cached in a CDN. The senior reframe: the expiry isn't a TTL on a cache, it's the duration the URL is allowed to be trusted, and every minute of expiry is a minute the URL can sit in a screenshot, an analytics tracker, or a copy-paste log. Five-minute PUTs and ten-minute GETs are the senior default; persistence and long expiries are anti-patterns.

**Ideal teaching artifact.** A "leak surface across the URL's lifetime" timeline. Top track: the URL's expiry duration (slider, 5 min → 7 days). Bottom tracks: five named leak surfaces (browser history, analytics tracker, screenshot in Slack, persisted in a row's `url` column, sent in a 24h-delayed email) each rendered as a horizontal bar whose width is "how long this surface holds the URL." As the student drags the expiry slider longer, the leak surfaces light up red one by one: at 10 minutes, screenshot is still hot but the email delay misses; at 1 hour, the analytics tracker overlap turns red; at 24 hours, all five leak surfaces overlap the trust window. A second view of the same timeline shows the GET being re-issued fresh on each page render — the URL is short-lived, the row stores nothing, the screenshot fails the next morning. Concept archetype delivered as a controllable manipulation — the wrong answer (long expiry, persisted URL) becomes uncomfortable to look at as the leak surfaces stack.

**Engagement.** The slider exploration is the artifact; a closing `Buckets` round sorts seven URL-handling patterns ("store the presigned GET in `file_metadata.url`," "issue a fresh GET on every render," "pass a 24h GET in a transactional email," "cache the GET in `useMemo` keyed by `fileId` for the page's lifetime," "set the GET as the `<img src>` directly," "log the presigned URL in error reporting," "send a 10-minute GET in an email the user just requested") into "senior pattern" vs. "leak" vs. "depends on call site" — locking the discipline by application rather than restatement.

**Components.**
- New `TrustWindowTimeline` (primary): expiry slider, five leak-surface bars, comparison view with fresh-per-render second pane. Inputs: leak-surface definitions, expiry options. Forward-link: Unit 9 (session cookie expiry vs. refresh), Unit 22 (signed AI-output URL for streaming). Plausible reuse.
- Alternative: a static `Figure` showing two fixed timelines (10-minute correct, 24-hour wrong) side by side, no manipulation. The slider is what produces the "discomfort grows with expiry" felt sense; the static version is colder.
- Closing recall: `Buckets` on seven URL-handling patterns (senior / leak / context-dependent).

**Project link.** Chapter 13.4.5 builds the un-cached `/files` server component that issues a fresh GET per row per render, and 13.4.7 verifies the discipline by watching a copied URL die at 11 minutes while a page refresh keeps working. The timeline is the cognitive model behind that verification.

---

## Concept 8 — The two-step write and the orphan failure modes

**Why it's hard.** The student's instinct is to insert the metadata row before issuing the upload URL — the row reserves the file's identity, the upload "fills it in." Two production failures hide here: the upload never completes (partial bytes left in R2, but the row claims the file exists, so the UI lies); or the row references bytes that are the wrong size or type because the client lied about them. The senior model inverts the order — sign, upload, HEAD-verify the actual bytes, then insert the row inside a transaction — and acknowledges that orphan bytes in R2 are recoverable while orphan rows in Postgres are not.

**Ideal teaching artifact.** A scrubbable two-track failure simulator. Top track: the canonical happy-path sequence — `presignedPut` → `fetch(url, PUT)` → `finalizeUpload` (HEAD + row insert) → row exists, object exists, UI shows the file. Bottom track: the student picks a failure injection point from a dropdown ("upload fails mid-stream," "browser closes after PUT but before finalize," "client lies about `claimedSize`," "HEAD returns 404 because R2 hasn't propagated yet," "transaction rolls back after HEAD passes," "row inserted before upload, upload fails"). The track replays with that failure and shows the resulting state of three meters: R2 has the bytes (yes/no), Postgres has the row (yes/no), the UI is honest (yes/no). The injection that creates the worst state — row inserted, upload failed, UI lies — is the wrong shape; the canonical order leaves at worst orphan bytes that a lifecycle sweep cleans. Pattern archetype as a wrong-by-default failure tour.

**Engagement.** After the simulator, a `Sequence` exercise reorders the canonical four-step write (request presigned URL → browser PUT → HEAD + verify size → insert row in transaction). A `TrueFalse` round follows: "orphan rows are worse than orphan bytes" (true), "the row should be inserted before the upload to reserve the file's identity" (false), "the HEAD verifies the client's `claimedSize`" (true), "a daily lifecycle sweep can clean orphan rows" (false — sweeps clean orphan *bytes*; orphan rows are an active failure).

**Components.**
- New `TwoStepWriteSimulator` (primary): scrubbable canonical flow with failure-injection dropdown and three state meters. Inputs: flow steps, failure-injection definitions, per-failure state outcomes. Forward-link: Unit 12 Stripe (subscription state machine with the same shape — three sources of truth and the orphan failure modes), Unit 14 dispatcher (channel-vs-row failure mode). Strong reuse.
- Alternative: a static `Figure` with a Mermaid sequence diagram showing the canonical flow plus a `TabbedContent` of three labelled wrong orderings. Conveys the shape but loses the "watch the meters diverge" felt sense that makes orphan rows worse than orphan bytes.
- Closing recall: `Sequence` on the canonical four-step write, then `TrueFalse` on four statements.

**Project link.** Chapter 13.4.4 wires the exact two-step shape: `presignedPut` returns the URL and object key, the browser PUTs directly, `finalizeUpload` HEADs the object and inserts the row inside a `tenantDb` transaction. 13.4.7 walks the `SIZE_MISMATCH` rejection from a lying client as the verification.

---

## Concept 9 — The `file_metadata` row shape, fully justified

**Why it's hard.** A `file_metadata` table looks deceptively simple — "id, path, who uploaded, when" — and the student writes a schema that omits the load-bearing pieces (the unique constraint on `objectKey`, `softDeletedAt` for cooled-off cleanup, the HEAD-verified `byteSize`, the separate `originalFileName` for display) or adds the wrong piece (a persistent `url` column that lies the moment the URL expires). Each missing or extra column is a small misconception, and the row's correct shape is the sum of nine deliberate decisions, not a default schema.

**Ideal teaching artifact.** A schema-design diff puzzle. The student is shown a "draft" schema with eight columns (`id`, `path`, `userId`, `createdAt`, `size`, `url`, `mimeType`, `filename`). A side panel presents nine targeted critiques ("path is ambiguous — is it relative to the bucket or the app's mount?", "`url` will lie the moment the URL expires," "`userId` doesn't carry org scope — every read leaks across tenants," "`size` from where — the client's claim or the post-upload HEAD?", "no soft-delete column, so deletes are hard and recovery is impossible," "`filename` doubles for display and storage key — collision and special-character risks", "no unique constraint on the object key — two rows can point at the same blob," "no index for the canonical org-list query," "`mimeType` accepted from the client without server-side validation — wrong type sails through"). The student maps each critique to the column it indicts and proposes the senior fix (rename, drop, split, add, constrain, index). Each accepted fix updates the schema in place; the puzzle terminates with the nine-field canonical shape from 13.3.4. The artifact teaches the row shape *by indictment* — the student earns each column. Pattern archetype as a wrong-by-default schema repair.

**Engagement.** The puzzle carries the assessment. A closing `DrizzleSchemaCoding` exercise asks the student to write the final `file_metadata` table in Drizzle with the constraints and indexes; the grader checks the column set, the `unique` constraint on `objectKey`, the foreign keys, and the composite index on `(organizationId, softDeletedAt, uploadedAt DESC)`.

**Components.**
- New `SchemaCritiqueDiff` (primary): a draft-schema pane with clickable columns, a critique pane with mapping-and-fix slots, an updated-schema pane that diff-renders after each accepted fix. Inputs: draft schema, critique set with `{ column, critique, fix }`, target final schema. Forward-link: Unit 11 audit-logs schema design, Unit 14 notification-preferences schema, Unit 17 RBAC schema, Unit 12 Stripe-subscription projection. Very strong reuse — schema-design teaching recurs across the whole back half of the course.
- Closing recall: `DrizzleSchemaCoding` on the canonical `file_metadata` table.

**Project link.** Chapter 13.4.4 ships the migration that creates exactly the schema this puzzle terminates with. The puzzle's nine columns are the migration's nine columns.

---

## Concept 10 — Two workloads, one mechanism: when the row applies and when it doesn't

**Why it's hard.** Concepts 3 and 9 establish "Postgres owns identity," and the student over-generalizes — every R2 write needs a `file_metadata` row. The retrofitted 13.2 CSV export breaks the rule cleanly: the export's output is short-lived (the email recipient clicks once within ten minutes), has one consumer, and lives under a prefix the lifecycle rule sweeps after seven days. A row would be noise. The senior pattern: user-managed long-lived files use `file_metadata` + presigned PUT + soft-delete; generated short-lived outputs use no row + server-side PUT from the worker + lifecycle rule. Same `lib/r2.ts`, two distinct policies.

**Ideal teaching artifact.** A two-column policy card layout. Left column: "User uploads (long-lived, user-managed)" — listed primitives are presigned PUT from the browser, `file_metadata` row, soft-delete with cooled-off object cleanup, fresh-per-render GETs, tenant-scoped reads. Right column: "Generated outputs (short-lived, one consumer)" — server-side PUT from the worker, no metadata row, lifecycle-rule cleanup, GET embedded in the consumer (email) within the trust window. Below the columns, the student drags six concrete features from the course's app onto the correct column: avatar upload, CSV export download link, generated PDF invoice (forecast for Unit 14), OG image route output, customer contract attachment, weekly automated digest CSV. Each drop reveals a one-line justification ("user uploads it, browses to it, may delete it later → left column"; "the worker generates it, the recipient consumes it once, lifecycle cleans it → right column"). The two-column layout encodes the policy split spatially. Decision archetype as a policy-aware classifier.

**Engagement.** The drag-classify is the assessment. A short `MultipleChoice` follow-up confirms the boundary: "an admin requests a one-time report export that the system PUTs to R2 and emails. Does it get a `file_metadata` row?" with three distractors that lean the wrong way ("yes — every R2 object should be tracked," "yes — for audit", "depends on whether the admin is in the same org as the report subject") and the correct answer ("no — the email is the one consumer, lifecycle cleans the bytes, the audit lives in `audit_logs` not `file_metadata`").

**Components.**
- New `WorkloadPolicySplit` (primary): two-column policy card with drag-classify slot for features. Inputs: left/right policy primitives, draggable feature set with target column and per-feature justification copy. Forward-link: Unit 14 dispatcher (channel-vs-channel policy split), Unit 15 cache (cached vs. dynamic route classification — closely related to the `ClassificationTable` from 15.1), Unit 17 audit (audit-row vs. operational-log policy split). Moderate-to-strong reuse.
- Alternative: a static `Figure` with a two-column comparison table plus a `Buckets` exercise sorting the six features. The drag-classify-with-justification reveal is more informative than a pure sort because each drop teaches *why* one column or the other, not just *which*.
- Closing recall: `MultipleChoice` on the boundary case.

**Project link.** Chapter 13.4.6 retrofits the 13.2 export task to right-column policy (server-side PUT, no row, lifecycle cleanup, fresh GET handed to the email) while 13.4.3–13.4.5 build the left-column policy (presigned PUT, `file_metadata` insert, fresh-per-render GETs). The same `lib/r2.ts` serves both; the policy split lives in the call sites.

---

## Component proposals

- **`ProviderCostCalculator`** — two-slider (storage, egress multiplier) live cost comparison across five providers, stacked-bar storage-vs-egress rendering.
  - **Uses in this chapter:** Concept 2.
  - **Forward-links:** Chapter 21 deploy/cost story (Vercel vs. self-host total-cost comparison); Unit 16 freshness-vs-revalidation cost framing if cost ever surfaces there.
  - **Leanest v1:** single egress slider against a fixed 10 TB storage workload, three providers (R2, S3, Vercel Blob). v1 misses the "storage volume also varies" axis but still produces the egress-dominates revelation; build v1, layer the second slider in a later pass.

- **`SplitAnatomy`** — two-pane (or three-pane with a "neither" bin) diagram with drag-to-pane question cards, joining line between the panes.
  - **Uses in this chapter:** Concept 3.
  - **Forward-links:** Unit 14 dispatcher (registry vs. channels), Unit 17 audit (subject vs. action), Unit 8 email (provider vs. template), Unit 12 Stripe (event projection vs. row). Strong reuse — the split-anatomy framing recurs whenever responsibility for a thing splits across two systems.
  - **Leanest v1:** two-pane layout with three drop-zones (left, right, neither), no animated join line. v1 covers the teaching cleanly; the animated join is polish.

- **`BucketTrustPuzzle`** — three-round guided configurator (tokens, CORS, object key) with per-round attack simulation.
  - **Uses in this chapter:** Concept 4.
  - **Forward-links:** Unit 17 audit (IAM-role least-privilege puzzle), Unit 9 Better Auth (cookie/session trust-boundary puzzle). Plausible reuse but requires investment.
  - **Leanest v1:** three `MultipleChoice` rounds inside a `Steps` block with one static `Figure` per round showing the failure mode. v1 is dramatically thinner and still passes the teaching bar; build v1 and consider the bespoke version only when the forward-link uses materialize.

- **`BytePipeSimulator`** — side-by-side animated network timelines with file-size slider and four metering bars.
  - **Uses in this chapter:** Concept 5.
  - **Forward-links:** Chapter 21 (serverless cost-as-you-scale framing), Unit 22 streaming (function as passthrough vs. byte pipe).
  - **Leanest v1:** two static sequence diagrams side by side at one file size (50 MB), with cost numbers labelled on each step rather than meters. v1 misses the manipulation that produces the "cost stays flat as files grow" felt sense; that visceral is the load-bearing teaching beat, so v1 is meaningfully weaker. Build the full version.

- **`SignedUrlAnatomy`** — clickable URL with per-query-parameter tooltips and a four-scenario attack simulator.
  - **Uses in this chapter:** Concept 6.
  - **Forward-links:** Unit 9 JWT anatomy, Unit 12 Stripe webhook signature anatomy. Very strong reuse — every signed-URL-shaped artifact in the course can use this.
  - **Leanest v1:** clickable URL with tooltips only, no attack simulator (the attacks ship as static `Figure` callouts beneath the URL). v1 carries the parameter-by-parameter teaching; the attack simulator adds the "see the failure" beat but the static failure callouts cover the recall.

- **`TrustWindowTimeline`** — expiry slider with five leak-surface bars and a fresh-per-render comparison view.
  - **Uses in this chapter:** Concept 7.
  - **Forward-links:** Unit 9 session/refresh expiry, Unit 22 signed AI-output URLs. Plausible reuse.
  - **Leanest v1:** two fixed timelines (correct, wrong) side by side as a static `Figure`, no slider. v1 loses the felt growth of leak-surface discomfort as the slider drags; the slider is the artifact's teaching engine, so the static version meaningfully under-delivers. Build the slider version.

- **`TwoStepWriteSimulator`** — scrubbable canonical flow with failure-injection dropdown and three state meters (R2, Postgres, UI honesty).
  - **Uses in this chapter:** Concept 8.
  - **Forward-links:** Unit 12 Stripe subscription state machine, Unit 14 dispatcher channel-vs-row failures. Strong reuse.
  - **Leanest v1:** static `Figure` with a Mermaid sequence of the canonical flow plus a `TabbedContent` of three labelled wrong orderings (each tab labelled with the resulting state). v1 covers the teaching for this chapter; the simulator is worth building when the Unit 12 / Unit 14 reuses materialize.

- **`SchemaCritiqueDiff`** — draft-schema pane with column-mapped critiques and an updated-schema pane that diff-renders after each accepted fix.
  - **Uses in this chapter:** Concept 9.
  - **Forward-links:** Unit 11 audit-logs schema, Unit 14 notification-preferences, Unit 17 RBAC, Unit 12 Stripe projection. Strongest forward-link of any proposal in this chapter — schema-design teaching is dense in the back half.
  - **Leanest v1:** a static `Figure` showing the draft schema and the canonical schema side by side, with critique callouts pointing at each changed column; no interactive mapping. v1 is dramatically thinner but loses the "earn each column by indictment" engagement that makes the row shape stick. The interactive version pulls weight given the forward-link count.

- **`WorkloadPolicySplit`** — two-column policy card with drag-classify feature slots and per-feature justification reveal.
  - **Uses in this chapter:** Concept 10.
  - **Forward-links:** Unit 14 dispatcher, Unit 17 audit, Unit 15 cache classification (overlap with `ClassificationTable`). Moderate reuse; some overlap with proposed/existing classification components.
  - **Leanest v1:** static two-column `Figure` with a `Buckets` exercise underneath sorting the six features. v1 is meaningfully thinner; the per-drop justification reveal is the teaching beat that makes the *why* land, not just the *which*. The bespoke version is the better build if `ClassificationTable` (15.1) doesn't already cover this shape.

## Build priority

Nine new components are on the table. Ranking by reuse weight and teaching load:

1. **`SchemaCritiqueDiff`** — the deepest forward-link count in the chapter (Unit 11, 12, 14, 17 all teach schema design under different framings) and the strongest in-chapter teaching for the hardest concept (the row shape's nine deliberate decisions). Build first.
2. **`SignedUrlAnatomy`** — clickable-URL anatomy is the canonical artifact for JWT (Unit 9) and Stripe webhook signatures (Unit 12) as well as R2 presigned URLs. The shape generalizes; build second.
3. **`SplitAnatomy`** — the registry-vs-channels, subject-vs-action, provider-vs-template splits across the rest of the course all rely on the same two-pane drag-classify shape. Build third.

`BytePipeSimulator` and `TwoStepWriteSimulator` are load-bearing within the chapter but their forward-links are more distant; they're strong second-tier builds. `TrustWindowTimeline` is single-chapter primary but the slider is what carries the teaching, so its full version is the right scope when budget allows. `BucketTrustPuzzle` and `WorkloadPolicySplit` both have credible `MultipleChoice`-plus-`Figure` v1s — start there.

`ProviderCostCalculator` is one of the more impactful in-chapter artifacts but its forward-link is thinner (Chapter 21 only); a v1 with a single slider is the right build.

## Open pedagogical questions

- Concept 5's `BytePipeSimulator` and Concept 8's `TwoStepWriteSimulator` both animate a two-track timeline against a configurable input. Is there a shared abstraction (`TimelineComparator` or similar) that covers both, plus the `TrustWindowTimeline`? Worth a separate component-architecture pass before any of the three are built.
- Concept 2's calculator uses 2026 provider pricing that drifts. The verify-2026-facts rule applies — the pricing config is the only thing that ages; the teaching shape stays fixed. Is the right authoring posture to pin the prices in a single `data/provider-pricing.ts` file with a "verified through" date, or to fetch live from the providers' pricing pages?
- Concept 10's `WorkloadPolicySplit` overlaps with `ClassificationTable` from Chapter 15.1 — both classify features into policy classes. Worth merging the two into a single configurable component with N columns and per-drop justification reveals, rather than shipping two near-identical components.
