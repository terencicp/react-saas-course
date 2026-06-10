# Defending the no — when object storage earns its weight

- **Title (h1):** Defending the no — when object storage earns its weight
- **Sidebar label:** When R2 earns its weight

---

## Lesson framing

This is the conditional-half opener of Unit 12 and a pure **"trigger before tool" / decision** lesson. Almost no code — the deliverable is a mental model and a defensible threshold, not a working feature. The whole chapter (lessons 2-4) and the chapter 069 project assume the student has already decided R2 belongs in the app; this lesson is where that decision gets made *and where the student learns to say no*. Per the pedagogical "defaults before conditionals" filter, the single most valuable takeaway is the discipline to leave R2 out of an app that does not need it.

Target student: a junior dev who has built through Unit 11 — Postgres/Drizzle, Server Actions with the `authedAction`/thin-action discipline, multi-tenancy on `organizationId`, soft delete, Stripe webhooks, and (chapter 067, the immediately prior chapter) a durable Trigger.dev CSV export whose `downloadUrl` is currently a `console.log` placeholder. They have the database reflex hammered in by five units. The pain this lesson must surface: that reflex ("everything goes in Postgres") quietly breaks the moment the app handles binary payloads, and the student needs *named, observable* trigger conditions so the decision is repeatable, not vibes.

Where students get this wrong in the real world, and what the lesson must pre-empt:
- **Premature adoption** — reaching for S3/R2 on day one "because real apps have file storage," paying operational complexity (a second storage system, a second set of credentials, CORS, a sync problem) for nothing. The lesson leads with the "no."
- **The base64-in-Postgres trap** — stuffing avatars/attachments into a `text` or `bytea` column. Works in the demo, kills `pg_dump` and balloons every backup snapshot at real volume. This is the single most common beginner mistake and gets a dedicated failure-mode pass.
- **Cost surprise** — picking S3 (the name they know) and getting a four-figure egress bill for a read-heavy product. The lesson makes the unit-economics case concrete with 2026 numbers.
- **Function-as-byte-pipe** — assuming uploads route *through* the backend (multipart POST → function → forward to storage). The lesson names the correct shape (function signs, browser transfers direct) and forecasts the mechanics to lesson 3; it does not build it here.

Mental model the student should leave with — three sentences they can recite:
1. Most B2B SaaS ships without object storage; the database holds every byte that matters until the app starts handling **binary payloads** (files in or files out).
2. When it crosses that line, the senior split is: **Postgres owns identity, ownership, and lifecycle; the bucket owns the bytes; the join is the object key, and the Postgres row is the source of truth.**
3. The function is **never a byte pipe** — it signs a URL, the browser transfers directly to the bucket.

Pedagogical vehicles (cognitive-load-minimizing, simple→complex):
- Open on a concrete scene (a SaaS at launch) and a single senior question, matching the chapter 066 lesson 1 opener tone — adult, terse, no celebratory scaffolding.
- A **`StateMachineWalker` (kind="decision")** is the spine of the lesson's central section: the student walks the "does this need object storage?" decision tree one branch at a time, landing on either "no — Postgres/CDN/build covers it" leaves or "yes — R2" leaves. This forces the *order* the senior asks the questions in (is there a binary payload at all? → is it user-supplied, app-generated-and-served-back, or third-party media? → would Postgres be wrong for it?) and is far stickier than a prose list of conditions.
- A small **HTML+CSS "ownership split" diagram** (two columns: Postgres owns / R2 owns, joined by the object key) introduces the architectural shape at the simplified level — just the nouns, no code, no flow arrows yet (those are lesson 3+).
- A **cost comparison** rendered as a simple HTML+CSS bar/table figure makes the R2-vs-S3 egress argument land viscerally (the bill, not the feature matrix).
- A **`Buckets` classification exercise** lets the student self-check the threshold: drag candidate payloads into "R2 earns its weight" vs "keep it in Postgres / ship with the build." This is the assimilation checkpoint for the lesson's core skill.
- A closing **`MultipleChoice`** on the unit-economics reasoning (why R2 over S3 for a read-heavy product) checks the one quantitative argument.
- Keep code to near-zero. No `lib/r2.ts`, no presigning, no schema. At most one tiny illustrative snippet of the *wrong* shape (the function piping bytes) shown only to be rejected, and only if prose alone is weaker — prefer a one-line `<Aside>` or the diagram over a code block here.

Estimated student time 25-35 min; this is one of the shorter, denser lessons.

---

## Lesson sections

### Introduction (no heading)

Per pedagogical guidelines: warm, brief, concrete problem, connect to prior knowledge, preview the takeaway. Open on a scene: a SaaS is about to launch — forms, lists, dashboards, the org-scoped invoicing app the course has been building. The founder/senior asks: *does this need object storage?* State plainly that for most B2B SaaS the answer is **no**, and that knowing *why* it's no — and the exact conditions that flip it to yes — is the actual senior skill this lesson teaches. Connect back: every byte the course has stored so far lives in Postgres, and that has been correct. Forecast: by the end the student can defend leaving R2 out, name the three conditions that put it on the table, and explain why a senior reaches for R2 (not S3, not an upload-SaaS wrapper) when one fires. Name that the chapter is conditional — no project until chapter 069 — so the student knows this is a "decide" chapter, not a "build" chapter yet. Drop one forward thread: the chapter 067 CSV export's placeholder download link is the concrete thing that *does* cross the line, and we will wire it up later.

Reasoning: mirrors the chapter 066 lesson 1 structure (scene → senior question → "the most useful thing is knowing when *not* to") which is the direct sibling threshold lesson; keeps tone consistent across the unit.

### The default is no object storage

The "defend the no" core. Establish the baseline reflex the student already has and validate it: the product surface is forms, lists, dashboards; Postgres holds every byte that matters; adding a second storage system is operational complexity (second credential surface, CORS, a sync problem between two stores) bought for nothing. Land the threshold sentence explicitly: **object storage earns its weight only when the app handles user-supplied or app-generated binary payloads that would be wrong to put in Postgres.** This is the load-bearing definition the rest of the lesson elaborates.

Cover the **conditions that do NOT justify object storage** here, inline, as the concrete edge of the "no" (not as a separate watch-out section):
- A 2 KB JSON document → `jsonb` column.
- A handful of static marketing images → ship them with the Next.js build, the CDN serves them (connect to `next/image` / static assets from Unit 4).
- A few hundred KB of binary config → Postgres `bytea` is fine at small scale.
- "I want a separate bucket for cleanliness" → not a threshold; restate that cleanliness is not a cost the app is paying yet.

Reasoning: leading with the negative space is the whole point of the lesson per the framing. Putting the non-triggers *before* the triggers reinforces that "no" is the default and "yes" is the exception that must be earned.

Term candidates: `object storage` (Tooltip — bucket-of-blobs storage addressed by key over HTTP, distinct from a database and a filesystem), `jsonb` (brief — Postgres binary-JSON column type, already met in Unit 5 but re-anchor without breaking flow), `bytea` (brief — Postgres raw-bytes column type).

### Three conditions that put R2 on the table

The affirmative threshold, taught as three **named, observable** conditions so the decision is repeatable. Present each with example payloads drawn from a real SaaS so they're recognizable:
1. **User uploads** — avatars, document attachments, contract PDFs, profile/org logos. The moment the app accepts a file *from* a user, object storage is on the table.
2. **Generated assets the app must serve back** — the chapter 067 CSV export, generated PDF invoices, server-rendered OG-card images, exported reports. Rule of thumb: *if the file is too large to inline in an email and lives longer than the request, object storage wins.* Tie explicitly to the export the student already built.
3. **Third-party media** — partner imports, downloaded artifacts, cached external assets. Note it has the same shape as (1) from the function's point of view (bytes arriving that must be persisted and served).

After the three, restate the unifying test once: each is a **binary payload that outlives the request and would be wrong to inline in Postgres.**

Reasoning: three observable conditions beat an abstract rule for a junior — they can pattern-match a new feature against the list. Anchoring condition (2) to the chapter 067 export they personally built makes it concrete and seeds the chapter 069 retrofit.

**`StateMachineWalker` (kind="decision")** — the centerpiece of this section. The student walks the decision in senior order:
- Root `Question`: "Does this feature handle a binary payload at all (a file, not a record)?" → Branch "No, it's structured data" → `Leaf` verdict "Keep it in Postgres" (jsonb/columns; the DB is the source of truth and the simplest option). → Branch "Yes, there are bytes" → next Question.
- Question: "Where do the bytes come from / go to?" → Branch "A user uploads them" → Question on size/lifetime. → Branch "The app generates them to serve back later" → Question on size/lifetime. → Branch "They're tiny and static (ship-with-the-app)" → `Leaf` "Static assets in the build + CDN" (marketing images, icons). → Branch "Third-party media we ingest" → treat as user-upload path.
- Question (size/lifetime gate): "Is it small (a few KB), short-lived, and tied to one record?" → Branch "Yes, tiny" → `Leaf` "Postgres `bytea`/`jsonb` is fine at small scale" (with the caveat: re-evaluate if it grows). → Branch "No — it's a real file, or it outlives the request, or many of them" → `Leaf` verdict **"Object storage (R2)"** with the reason: the bytes are too big/too many for Postgres backups and need HTTP delivery without a function in the byte path.

Pedagogical goal: the lesson *lives in the order of the questions*, not in any single leaf. The walker makes the threshold a procedure the student internalizes rather than a fact they memorize. Keep leaves to 1-2 sentences (component constraint: short verdict pill + brief reason body). Do **not** wrap in `<Figure>` (component provides its own card).

Term candidate: `binary payload` (Tooltip — raw bytes like an image, PDF, or CSV file, as opposed to structured rows/JSON).

### Why Postgres is the wrong home for blobs

Name the failure modes of the base64/`bytea`-in-Postgres trap **once**, plainly — this is the most common beginner mistake so it earns its own short section rather than a buried watch-out. The four named failure modes:
- **Backups balloon.** Every snapshot pulls the bytes; a database that should be megabytes becomes gigabytes, backup/restore windows blow out.
- **`pg_dump` becomes unusable** at any real volume — the logical dump now carries every blob.
- **Connection-pool memory pressure** — reading a row drags the whole blob into the function's memory; large rows pressure the pool.
- **No built-in HTTP delivery** — every read is a function invocation streaming bytes back out (which also previews the byte-pipe problem in the next section).

Frame in production stakes: the demo works, the trap springs at scale when backups start timing out and the bill for streaming bytes through the function arrives. Make the contrast explicit — object storage is *built* for HTTP byte delivery and lives outside the database backup boundary.

Reasoning: a junior needs the *mechanism* of why this is wrong, not just "don't do it," or they'll do it anyway the first time it's convenient. Adult-depth treatment of a fundamental, framed as failure modes.

Term candidate: `pg_dump` (Tooltip — Postgres's logical backup tool that serializes the whole database to a file).

### R2 over S3 — the unit-economics call

The cost argument, made concrete. This is a decision the student must be able to *defend with numbers*, so lead with the mechanism then show the bill.

Mechanism: **Cloudflare R2 charges zero egress.** S3 charges for data transfer out (~$0.09/GB after the first 100 GB free, tiering down at high volume). For any SaaS that *serves files back to users* — the entire trigger condition (2), and the read side of (1) — egress dominates the bill, and R2's storage (~$0.015/GB/month) plus per-operation pricing (Class A writes/lists, Class B reads) covers the rest cheaply.

Concrete 2026 numbers (verified — see fact-check): a typical read-heavy SaaS workload of **10 TB stored, 50 TB/month egress**:
- **R2:** ~$150/month storage + operations + **$0 egress** ≈ low-hundreds/month total.
- **S3:** storage in the same ballpark, but **egress alone runs into the low thousands/month** (50 TB out at tiered $0.09→$0.07/GB).

Land the conclusion: the decision is **operational unit economics, not a feature gap** — both speak the same API, both store blobs; R2 just doesn't bill you for the thing a read-heavy SaaS does most (serve files back).

Render the comparison as a **simple HTML+CSS figure** (wrapped in `<Figure>`) — a two-row cost table or a two-bar comparison (R2 vs S3 monthly bill for the example workload), egress segment visually dominating the S3 bar. Pedagogical goal: make the egress asymmetry *visible* — the eye should see one bar dwarf the other. Inline styles only (devtools-inspectable, per the html-css diagram doc); reset `margin: 0` on every inner element (Starlight prose-margin gotcha). Keep height well under the 800px cap — this is a small figure.

**The S3-compatible-API off-ramp.** State the structural portability win once: R2 speaks the S3 API, so the AWS SDK (`@aws-sdk/client-s3`) works against it unchanged — only the endpoint and credentials change. The off-ramp to S3, Backblaze B2, or any S3-compatible provider is *structural*, not a rewrite. This de-risks the choice: picking R2 is not lock-in. (Mechanics of constructing the client are lesson 2 — name the SDK package here, don't build.)

Reasoning: a junior dev's instinct is "use S3, it's the standard." The lesson must give them the senior counter-argument with real numbers *and* neutralize the lock-in fear, or they'll default to the name they know.

Term candidates: `egress` (Tooltip — data transferred *out* of the storage provider to the internet; the line item that dominates a read-heavy bill), `S3-compatible API` (Tooltip — the de-facto-standard object-storage HTTP API originated by AWS S3; multiple providers implement it so the same SDK talks to all of them).

### R2 over the upload-SaaS wrappers

Name the managed alternatives **once** and explain the senior pick, so the student isn't drawn to a tool that wins demos but loses at SaaS scale. Keep it tight — one or two sentences each:
- **UploadThing** — wraps S3 behind a managed upload widget with per-GB markup. Wins for prototypes (fastest to a working upload button); loses on cost and lock-in at SaaS scale, and it's the retail-S3 egress bill plus a margin.
- **Vercel Blob** — fine for Vercel-tight apps, but it *bills data transfer* (storage ~$0.023/GB-month + ~$0.05/GB egress as of its 2026 GA pricing). Cheaper than raw S3 egress, still the wrong shape for a read-heavy product vs R2's zero egress. (Verified June 2026; phrase as "charges egress," not "retail S3 pricing.")
- **Supabase Storage** — good *if Supabase is already your database*; outside that it pulls a whole second platform in for one feature.

Conclusion: each is a reasonable choice in its niche; for a course building a self-owned 2026 SaaS stack with a read-heavy surface and a Postgres-on-Neon database, **R2 wins on cost and the S3-compatible off-ramp keeps it un-locked-in.** Restate: name the alternatives, pick R2.

Reasoning: the student will encounter these tools in tutorials and threads; a senior knows them and can articulate why they're not the default here. This is the "should alternatives be mentioned" question answered yes — briefly, to justify the choice.

### Postgres owns identity, R2 owns bytes — the shape

Introduce the architectural shape at the *simplified* level — just the three nouns and the ownership split, no flow, no code (flow is lesson 3, schema is lesson 4). This is the conceptual payload the rest of the chapter builds on.

The three nouns:
- **Bucket** — a namespace inside R2 with scoped credentials and CORS configured for the app's origin. (Setup is lesson 2.)
- **Object key** — the path inside the bucket; the SaaS pattern keys objects by tenancy: `org/${organizationId}/files/${fileId}`. Mention the tenancy-on-the-key idea once; details lesson 4.
- **Metadata row** in Postgres — the canonical identity: `id`, `organizationId`, `objectKey`, `contentType`, `byteSize`, `uploadedBy`, `uploadedAt`. The row is the source of truth for "does this file exist for this user"; the object is the bytes the row references. (Full schema is lesson 4.)

State the split as the chapter's through-line: **Postgres owns identity, ownership, and lifecycle; R2 owns the bytes; the join is the object key; the row is the source of truth.** The bucket is dumb storage keyed by the row's path — never the other way around (the app never lists the bucket to find files; it queries Postgres).

**HTML+CSS "ownership split" diagram** (wrapped in `<Figure>`): two side-by-side panels — left "Postgres / `file_metadata` row" listing the identity fields, right "R2 bucket / object" showing a blob keyed by `org/.../files/...` — joined visually by the **object key** as the seam between them (a shared tinted token or a single connector). Pedagogical goal: cement the two-stores-one-key model as a *picture* before any code. Keep it static and simple (no animation — this is the resting-state model). Color-match the `objectKey` token on both sides per the ArrowDiagram doc's "color matching beats arrows" guidance, since this is pure correspondence, not direction. Inline styles, `margin: 0` reset throughout.

Reasoning: introducing the split as a labeled picture at the simplified level (nouns only) minimizes cognitive load; lessons 2-4 each zoom into one noun. This section is the bridge from "should we?" to "here's the shape we'll build."

Term candidate: `object key` (Tooltip — the unique path string that addresses one object inside a bucket, e.g. `org/42/files/abc.pdf`).

### The function is never a byte pipe

Teach Architectural Principle #3 as it applies to uploads — at the simplified, conceptual level (the *rule* and *why*), forecasting the mechanics to lesson 3. This is the second load-bearing rule of the chapter.

State the rule: the upload-issue endpoint is the **seam**. The function **signs a URL**; the **browser transfers the bytes directly** to R2; the function **records the metadata** after. The function's CPU and bandwidth bill is unchanged whether the upload is 5 KB or 5 GB.

Restate-and-reject the **naive shape** explicitly (this is the beginner default that must be killed): a multipart POST to the function, function buffers/pipes the bytes to R2. Why it's wrong, named once:
- **Doubles the bandwidth** — every byte travels client→function *and* function→R2.
- **Doubles the time** — two hops instead of one.
- **Hits the function timeout** for large files — serverless functions have execution limits; a multi-hundred-MB upload through the function will time out.

Frame as the structural reason R2 (or any object storage) is reached for at all in a serverless app: the whole point is to get the bytes *off* the function's critical path.

Forecast: lesson 3 builds the signing mechanics (presigned URLs); this lesson only establishes that the byte path goes around the function, not through it.

Optional minimal visual: a tiny **HTML+CSS contrast** — two mini flow strips, "naive (bytes through function)" vs "signed (bytes direct, function signs only)" — only if it reads faster than prose; otherwise an `<Aside type="caution">` stating the rejected shape is enough. Do not build a full sequence diagram here (that's lesson 3's job). Lean toward the small contrast figure since "bytes go around vs through" is inherently spatial.

Reasoning: this rule is the architecture's whole justification; if the student doesn't internalize "function signs, browser transfers," nothing in lessons 3-4 makes sense. Naming and rejecting the naive shape *now* (before they've written any upload code) inoculates against the most natural wrong implementation.

Tooltip/principle note: reference **Architectural Principle #3** by name (the function-as-seam-not-pipe principle the course has been building — it appeared in the thin-actions and authed-route lessons). Keep the reference light; the student has met the principle, this is a new application of it.

### What this chapter does and doesn't build

A short scoping/forecast section so the student knows the shape of the next four lessons and what's deliberately out of scope (named once for recognition, not taught). This doubles as the "preview the chapter" beat.

The chapter's scope cuts (each named once, with the one-line reason it's deferred or excluded):
- **No image resizing/transformation** — that's a separate product (Cloudflare Images); reach for it when the product calls for it.
- **No streaming multipart for >100 MB uploads** — presigned PUT caps at 5 GB; the streaming-multipart pattern exists, named for recognition, not built.
- **No virus scanning** — the production hardening that lives between "uploaded" and "available"; named, not built.
- **No CDN-cache-invalidation tactics** — R2 has a public-bucket option, but the course's default is **private + presigned GET** (every read gets a fresh short-lived signed URL).

The chapter's wiring preview (forecast the payoff): lesson 2 stands up the bucket + CORS + scoped token; lesson 3 the presigned PUT/GET mechanics; lesson 4 the `file_metadata` row design; chapter 069 builds the user-upload path end-to-end **and** retrofits the chapter 067 CSV export so the email carries a real R2 download link instead of `console.log`. Both call sites use the same presign helpers — *one mechanism, two consumers.*

Reasoning: bounding the scope up front prevents the student from expecting (or an over-eager downstream agent from teaching) transformation/scanning/multipart in this conditional chapter. The wiring preview gives the "no project yet" chapter a concrete future payoff to anchor motivation.

### Check your threshold (exercise placement)

Two assimilation checks, placed at the end of the body (acceptable here because they assess the lesson *as a whole* — the threshold judgment — rather than one section's concept; the threshold is the lesson's single deliverable).

**`Buckets` classification exercise** (`twoCol`). Instructions: "Sort each payload into where it belongs." Two buckets:
- `r2` — label "Object storage (R2)", description "binary payload, outlives the request"
- `pg` — label "Keep it in Postgres / ship with the build", description "structured, tiny, or static"

Items (mix the three trigger conditions and the three non-triggers, plus one or two tempters):
- `r2`: "A user's uploaded contract PDF" · "Generated PDF invoices the app emails and stores" · "The chapter 067 CSV export download" · "Org logo uploaded in settings" · "Partner-imported media files"
- `pg`: "A 2 KB JSON document of user preferences" · "Marketing hero images for the landing page" · "A few hundred KB of binary feature-flag config" · "An invoice's line items"

Pedagogical goal: forces the student to *apply* the threshold to concrete payloads, surfacing whether they internalized "binary + outlives request + would be wrong in Postgres" vs "structured/tiny/static." Wrong placements (e.g. dropping the marketing images into R2) are exactly the premature-adoption error the lesson targets.

**`MultipleChoice`** (single-answer) on the unit-economics call. Stem: "A read-heavy SaaS serves 50 TB/month of user files back. Why does a senior pick R2 over S3 here?" Choices with `McqWhy` rationales:
- ✅ "R2 charges zero egress; S3's per-GB data-transfer-out fee dominates the bill for any product that serves files back." (correct — the egress mechanism)
- ✗ "R2 is faster than S3." (wrong — not the argument; it's cost, not latency)
- ✗ "S3 can't store files this large." (wrong — both store the same files)
- ✗ "R2 is open source and S3 is proprietary." (wrong — R2 is a managed service; the portability win is the S3-compatible API, not licensing)

Pedagogical goal: verify the student can articulate the *mechanism* of the cost decision, not just "R2 is cheaper" — and pre-empt the common misconceptions (it's about latency / S3 has a size limit / it's a licensing thing).

Reasoning: a classification drill is the right tool for a threshold-judgment lesson (the skill *is* classification); an MCQ is the right tool for verifying a single quantitative argument. Both are pre-built components — no custom exercise needed.

### External resources (optional)

One or two `ExternalResource` cards at the very end: the Cloudflare R2 overview/pricing page (the zero-egress claim's primary source) and optionally the R2 pricing calculator so the student can run their own workload numbers. Keep to genuinely useful primary sources; do not pad.

---

## Scope

**Already taught (do not re-teach; re-anchor in one phrase max if needed):**
- Postgres/Drizzle, `jsonb`/`bytea` columns, indexes, env validation (Units 5; `@t3-oss/env-nextjs` pattern lands in chapter 034/041 — referenced, not re-taught).
- Server Actions, `authedAction`/thin-action discipline, Result types, Architectural Principles #3 and #5 (Unit 6, chapter 043/057) — Principle #3 is *applied* here to uploads, not re-derived.
- Multi-tenancy on `organizationId`, `tenantDb` (Unit 9, chapter 056) — tenancy-on-the-object-key is *previewed*, the enforcement mechanics are lesson 4.
- Soft delete (Unit 10, chapter 061) — relevant to the `file_metadata` lifecycle in lesson 4, not this lesson.
- The chapter 067 durable CSV export on Trigger.dev with its `console.log` placeholder download link (immediately prior chapter) — referenced as the concrete trigger-condition-(2) example and the future retrofit target.
- `next/image` and static assets / CDN (Unit 4) — the home for marketing images; referenced as a non-trigger.

**Reserved for later lessons (name/forecast only, do not teach):**
- Bucket creation, scoped tokens, the `lib/r2.ts` S3 client, CORS configuration, object-key tenancy convention details → **lesson 2 of this chapter.**
- Presigned PUT/GET mechanics, signed `ContentType`/`ContentLength`, expiries, the layered size defense, sign-then-finalize → **lesson 3.**
- The `file_metadata` row design (full schema, indexes, soft-delete cleanup, orphan failure modes, the no-`url`-column rule) → **lesson 4.**
- Which two call sites get wired and the off-R2 workloads → **lesson 5.**
- All upload/download *code* (browser-side PUT, `finalizeUpload`, `Files` list, the export retrofit) → **chapter 069 project.**

**Out of scope entirely (name once for recognition at most):**
- Image transformation/resizing (Cloudflare Images).
- Streaming multipart uploads for files >100 MB / >5 GB.
- Virus scanning and content moderation.
- CDN-cache-invalidation tactics; the public-bucket mode (the course default is private + presigned GET).
- Cloudflare Workers in front of R2; self-hosting MinIO.
- Per-file ACLs / file versioning.

**Prerequisite concepts to redefine concisely (Tooltip-level, not a section):** `object storage`, `binary payload`, `object key`, `egress`, `S3-compatible API`, `pg_dump`. Defined inline via `Term`, never as preamble.

---

## Code conventions notes

This lesson is essentially code-free by design (a decision/threshold lesson), so most code conventions don't apply. The few touch-points:
- If the *rejected* naive byte-pipe shape is shown at all, it's illustrative-only and must be visibly marked as the wrong pattern (an `<Aside>` or a labeled "don't" — never presented as a copyable shape). This is a deliberate divergence noted for downstream agents: the snippet exists to be rejected.
- Identifiers used in prose/diagrams must match the canonical contract the chapter will ship: object key `org/${organizationId}/files/${fileId}`, metadata fields `id`/`organizationId`/`objectKey`/`contentType`/`byteSize`/`uploadedBy`/`uploadedAt`, SDK package `@aws-sdk/client-s3`. Keep these exact so lessons 2-4 don't drift.
- Use British/course-standard sentence case for all headings (already applied above).
