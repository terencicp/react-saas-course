# Standing up R2 — buckets, scoped tokens, and CORS

- **Title:** Standing up R2 — buckets, scoped tokens, and CORS
- **Sidebar label:** Standing up R2

---

## Lesson framing

This is the "stand up the surface" lesson of Chapter 068. Lesson 1 already won the architecture argument (Postgres owns identity, R2 owns bytes; the function is never a byte pipe; R2 over S3 on egress). The student arrives convinced *that* they need R2 and *why*; this lesson is about *what to configure and what to ignore* so the surface is trustworthy in production. It is a **teaching lesson** — prose, diagrams, and a couple of understanding-checks — **not a project**. No mission/Checklist/test-suite framing, no `pnpm test:lesson`. Chapter 069 is where this gets built end-to-end; here we configure the bucket and write one module (`lib/r2.ts`).

Pedagogical conclusions that shape the whole lesson:

- **The senior frame is "which knobs are trust boundaries vs. dashboard noise."** The R2 dashboard has dozens of settings. The lesson's value is triage: bucket-per-environment, scoped-token-per-environment, and CORS are trust boundaries the student must get right; location hint, lifecycle rules, and public-bucket mode are named-once surfaces they should recognize but not reach for. Every config decision is justified by a failure it prevents, never "because the docs say so." This is the course's "decisions before syntax" filter applied directly.
- **Lead with the leak, not the form field.** The two highest-stakes mistakes here — an account-level token in app code, and `AllowedOrigins: ['*']` / `AllowedHeaders: ['*']` in CORS — are both invisible until exploited. Teach each by first showing the wrong-but-working config, naming the exact blast radius, then the right config. The student should leave able to *spot* these in a code review, which is the senior skill.
- **Anchor everything to patterns the student already owns.** `lib/r2.ts` is the *same shape* as `lib/db.ts` (Chapter 041) and `lib/email.ts` (Chapter 050): module-scope singleton client, `import 'server-only'` poison pill, reads from the typed `env`, convenience helpers compose the SDK but never abstract it (Architectural Principle #5, "do not wrap"). Explicitly call these parallels — the student is not learning a new discipline, they are applying a known one to a third client. This minimizes cognitive load: the *only* new thing is R2's S3-compatible config (`endpoint`, `region: 'auto'`, credentials) and the CORS trust boundary.
- **Two diagrams carry the load.** (1) An `<ArrowDiagram>` mapping the four config artifacts (bucket, scoped token, CORS rule, `lib/r2.ts`) to the four env vars and to *what each protects* — gives the student the whole surface on one screen before any code. (2) A small SVG/HTML diagram of the CORS preflight handshake (browser OPTIONS → R2 responds with allowed origin/method/header → browser proceeds, or blocks) — CORS is the concept students most reliably get wrong because it is invisible and asymmetric; a picture of *who asks whom* fixes the mental model far better than prose.
- **The object-key tenancy convention is the bridge to lessons 3–4.** `org/${organizationId}/files/${fileId}` is introduced *here* as a configuration-time decision (it is a naming convention, not code yet) and explicitly forecast: lesson 3 signs against it, lesson 4 constructs it server-side. The lesson plants the rule — *the key is always built on the server, never accepted from the client* — without building the construction code.
- **Mental model the student should end with:** "An R2 bucket is a namespace I create once per environment. I reach it with the AWS S3 SDK pointed at R2's endpoint, using a token scoped to *only this bucket* with *only read+write*. CORS on the bucket is what lets a browser upload to it directly — and a wildcard there is a public-write hole. My app reaches all of this through one `lib/r2.ts` singleton, exactly like `lib/db.ts`."

The lesson should feel like configuring a production resource alongside a senior who keeps saying "no, not that one — here's what bites you." Adult, terse, no celebratory tone (per pedagogy filter #2).

---

## Lesson sections

### Introduction (no header)

Open with the senior question, stated implicitly (pedagogy filter #1): the trigger conditions from lesson 1 fired, the team needs object storage. The dashboard offers dozens of toggles. *What is the minimum surface that gets bytes flowing, and which knobs are actual trust boundaries vs. cosmetic?* State the lesson's destination in one breath: by the end the student can create the bucket, scope a token to it, write `lib/r2.ts`, and configure CORS so a browser can upload directly — and explain the blast radius of getting each wrong. Name what ships: one configured bucket plus one module. Forecast that lessons 3–4 sign URLs against this surface and that Chapter 069 builds the upload flow on it. Keep it to ~2 short paragraphs.

### The four artifacts, and what each one protects

**Purpose:** give the whole surface on one screen before drilling in, so every later section slots into a frame the student already holds. This is the "simplified model first, complexity added gradually" pedagogy move.

Content: name the four things this lesson stands up and pair each with the failure it prevents:
- **Bucket** (per environment) → a staging upload can never land in production.
- **Scoped token** (per environment, per bucket, read+write only) → a leaked credential can't create/delete buckets or touch other buckets.
- **CORS rule** (explicit origin + method + header) → the browser can upload directly *and* a leaked presigned URL can't be replayed from an arbitrary origin's page.
- **`lib/r2.ts`** (singleton S3 client) → one configured client, reused; the SDK is composed, not abstracted.

**Diagram — `<ArrowDiagram>` inside `<Figure>`.** Three columns: left = the four artifacts as cards; middle = the env surface (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`); right = a one-line "protects against" badge per artifact. Arrows connect artifact → the env var(s) it produces/consumes, and artifact → its protection badge. Use per-line/block anchors (not inline spans) per the ArrowDiagram doc's cross-region rule. Color the "scoped token" and "CORS" arrows distinctly (these are the two trust boundaries the lesson dwells on). **Pedagogical goal:** the student sees that the four artifacts and four env vars are a closed set — there is nothing else to configure — which is itself the reassurance the "defend the no / minimum surface" thesis wants. Cap height ~480px.

This section is a map; keep prose tight and push detail into the sections below.

### Creating the bucket — one per environment

**Purpose:** the bucket itself, and the one decision that matters at creation (environment isolation) vs. the one that doesn't (location).

Content:
- A bucket is a namespace inside an R2 account, named once at creation. Use a `Steps` component for the dashboard click-path (create account/enable R2 → create bucket → name it) — this is a genuine ordered procedure the reader follows, the canonical `Steps` use case. Keep steps terse.
- **The environment-isolation rule.** Buckets do not auto-partition by environment. Create one bucket per environment explicitly: `acme-saas-prod`, `acme-saas-staging`, and a shared `acme-saas-dev`. The naming carries the environment so a misconfigured `R2_BUCKET_NAME` fails obviously rather than silently writing staging data into prod. This is the senior anchor of the section — frame it as the failure (a staging test upload corrupting a production tenant's file list) it prevents.
- **Location hint — named once, then dismissed.** R2 lets you pick a location hint; it is a *hint*, not a hard pin (R2 replicates). Pick the region closest to the user base and move on. Use an `Aside` (note) so it reads as "aware of it, not dwelling" — explicitly the "dashboard noise, not a trust boundary" triage the lesson is teaching.
- **Bucket privacy default.** State plainly: R2 buckets are private by default — no public URL, every read needs a presigned URL or a Worker route. The course keeps everything private + presigned. Name "public bucket" mode once (useful for fully public marketing assets; unsuitable for tenant files because anyone with the URL reads). An `Aside` (caution) is the right weight — it's a tempting wrong turn for someone serving images. Forecast that lesson 3 covers presigned GET as the private-read mechanism.

No code here — this is dashboard configuration. A `Screenshot` of the create-bucket dialog is optional and low-value; skip it unless trivially available, prefer the `Steps` click-path.

### Scoped tokens — the credential blast radius

**Purpose:** the highest-stakes trust boundary in the lesson. Teach by blast radius.

Content:
- R2 issues two grades of credential: **account-level** (the dashboard "Admin Read & Write" / "Manage R2" grade — can create and delete *any* bucket) and **bucket-scoped** (pick specific bucket(s), pick operation grade). Name the three operation grades the dashboard actually offers (verified current): **Admin Read & Write**, **Object Read & Write**, **Object Read only**.
- **The senior default, stated as a rule:** one token per environment, scoped to that environment's single bucket, granted **Object Read & Write** — never Admin, never "All buckets." Justify each narrowing by its blast radius:
  - Admin grade in app code → a leaked key can delete every bucket in the account. App code never creates or deletes buckets; it reads and writes objects. So Object Read & Write is the ceiling.
  - "All buckets" scope → a leaked staging key reaches production data. Scope to the one bucket.
  - One shared token across environments → same leak surface; staging and prod are separate tokens, and **production credentials never touch `localhost`**.
- **The artifact a token produces:** an Access Key ID + Secret Access Key pair (plus the S3 endpoint), shown once at creation. These become `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`. Note the "shown once" gotcha (copy to the password manager immediately) — a real operational papercut.

**Exercise — `Buckets` (classification drill).** Sort credential/scope choices into **"App code (production-safe)"** vs. **"Never in app code."** Items: `Object Read & Write, single bucket` (safe); `Admin Read & Write` (never); `All buckets, Object Read & Write` (never); `One token reused for staging and prod` (never); `Separate token per environment` (safe); `Object Read only for a public-asset reader` (safe). **Goal:** force the student to apply the blast-radius reasoning rather than recognize it passively. Grading is the bucket match. Place it right after the rule so the student tests the rule immediately.

`Term` candidate: **blast radius** (the scope of damage a single leaked credential can cause) — non-obvious as a security term to a career-switcher.

### Reaching R2 from code — `lib/r2.ts`

**Purpose:** the one module the student writes. The teaching weight is "this is the `lib/db.ts` shape again," plus the three R2-specific config lines.

Content:
- R2 speaks the S3 API, so the **AWS SDK v3** talks to it unchanged: `@aws-sdk/client-s3` for the client and commands, `@aws-sdk/s3-request-presigner` for signing (the latter is *named* here as the dependency lessons 3–4 use; not exercised yet). Name the structural off-ramp once: because this is the S3 API, moving to S3 / Backblaze B2 / MinIO later is an endpoint + credential swap, not a rewrite (restates lesson 1's portability claim, don't re-argue it).
- The three config values that make the SDK point at R2 instead of AWS: `region: 'auto'` (R2 ignores region but the SDK's signer requires *a* value — omitting it throws at signing time), `endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, and `credentials` from env.

**Code — `AnnotatedCode`** (single block, multiple parts need focus → AnnotatedCode is the right pick per its doc). Show `src/lib/r2.ts` in full (~15 lines). Steps:
1. `{1}` `import 'server-only';` — the poison-pill, same as `lib/db.ts` / `lib/email.ts`: this module holds the secret key and must never reach the client bundle; a stray client import becomes a build error. (color blue)
2. The imports + `env` read — `R2_ENDPOINT` is *derived* in this module from `R2_ACCOUNT_ID` (forecasts lesson 5's note that the endpoint is computed, not a fifth env var). Reads `env`, never `process.env`, so a missing var already failed the boot (Chapter 041 callback). (blue)
3. `region: 'auto'` — pin and explain the "SDK requires a value, R2 ignores it, omitting it throws" gotcha. This is the single most common first-run R2 error; flag it hard. (orange)
4. `endpoint` — the account-scoped S3 URL; the bucket is addressed per-operation, not baked into the client. (blue)
5. `credentials` + the module-scope `export const r2 = new S3Client({...})` — **constructed once at module scope, not per request** (connection-pool-churn watch-out), the same singleton discipline as the Resend client. (green)
6. A closing step on the "do not wrap" stance: this module exports the configured client; the `presignedPut` / `presignedGet` helpers (lessons 3–4) will *compose* it, not hide it behind a generic `StorageProvider` interface. Architectural Principle #5, identical to the `lib/email.ts` decision. (green)

Then a short `env.ts` snippet (plain `Code` block, `ins=` to show the added lines) showing the four R2 entries added to the existing `server` block and `runtimeEnv` map — reusing the exact `@t3-oss/env-nextjs` shape from Chapter 041/050 so it's recognized, not re-taught. Note in one sentence: these are server-only (no `NEXT_PUBLIC_` prefix) because the secret key must never ship to the browser — restate, don't re-derive, the server/client split.

`CodeTooltips` candidate: on the `S3Client` config object, tooltip `region: 'auto'` and `endpoint` with their one-line "why" so the inline code carries the rationale without a separate step — optional, only if it doesn't duplicate the AnnotatedStep prose. Prefer AnnotatedCode as primary; skip CodeTooltips to avoid redundancy.

### CORS — the browser-upload trust boundary

**Purpose:** the concept students most reliably misunderstand, taught with a diagram + a wrong/right comparison. This is the lesson's other trust-boundary centerpiece alongside scoped tokens.

Content, staged simplest-first:
- **Why CORS exists here at all.** In the course's architecture the *browser* PUTs directly to R2 (the function only signs — Architectural Principle #3, recall from lesson 1). A browser making a cross-origin request to `*.r2.cloudflarestorage.com` is governed by CORS: without a matching rule on the bucket, the browser blocks the request *before it sends* — even though the presigned signature is perfectly valid. Land the counter-intuitive point explicitly: **CORS is enforced by the browser, configured on the bucket, and has nothing to do with whether the signature is valid.** This is exactly where beginners burn hours ("my signature is right, why 403/blocked?").

**Diagram — the preflight handshake.** Hand-coded HTML+CSS or SVG inside `<Figure>` (a "picture of a specific thing" — the request line — per the diagrams doc; HTML+CSS preferred for a phase-strip). Three beats, left to right: (1) browser sends `OPTIONS` preflight to R2 asking "can origin X use method PUT with header content-type?"; (2) R2 checks the bucket's CORS rule and answers with the allowed origin/method/headers (or doesn't, → blocked); (3) browser, satisfied, sends the real `PUT`. **Pedagogical goal:** make CORS *directional and asymmetric* — the browser asks, the bucket answers, the function isn't in this conversation at all. A `DiagramSequence` is an option if the team wants the student to scrub the three beats; a static 3-panel strip is simpler and sufficient — prefer the strip unless animation clearly adds value.

- **The right CORS rule.** Show the JSON the project ships:
  ```
  AllowedOrigins: [APP_URL]        // http://localhost:3000 dev, https://app.example.com prod
  AllowedMethods: ['GET', 'PUT']
  AllowedHeaders: ['content-type']
  MaxAgeSeconds: 3600
  ```
  Explain each field by what it admits: origins = which web pages may talk to the bucket; methods = PUT to upload, GET for any direct browser read; headers = the `content-type` the presigned PUT pins (forecast lesson 3); max-age caches the preflight so the browser doesn't re-ask every upload. Note it's configured per bucket via the dashboard *or* a `PutBucketCors` API call, and the repo commits the JSON so prod and dev configs are reviewable.

**Code — `CodeVariants`** (wrong/right is the canonical CodeVariants use). Two tabs:
- **"Public write hole"** — `AllowedOrigins: ['*']`, `AllowedHeaders: ['*']`. Prose (≤6 lines, first sentence carries the framing): *Any origin can drive any presigned URL leaked from your logs or a user's devtools.* Explain the leak path concretely: a presigned PUT URL that appears in a browser network tab or an error log can be replayed from any attacker's page when origins are `*`. Use `del=` styling. Per-pane `data-mark-color="red"`.
- **"Scoped to your origin"** — the explicit rule above. First sentence: *Only your app's pages can use the bucket; a leaked URL is useless from anywhere else.* `ins=`, `data-mark-color="green"`.

  After the variants, in prose: the **R2-specific `AllowedHeaders` gotcha** — on R2 a wildcard `AllowedHeaders: ['*']` does **not** reliably admit the `content-type` header the presigned PUT needs; the working, recommended value is the explicit `['content-type']`. So `*` is wrong twice over: a security hole *and* often silently broken for the exact upload you're configuring. (Verified against current R2 practice; frame as "explicit headers are required on R2" rather than over-explaining the S3-vs-R2 mechanism.)

`Term` candidates: **CORS** (Cross-Origin Resource Sharing — the browser rule that a page may only call another origin if that origin opts in via response headers) and **preflight** (the automatic `OPTIONS` request the browser sends before certain cross-origin requests to check permission). Both are genuinely prerequisite-but-fuzzy for the target student; brief Tooltips keep flow.

### Keying objects by tenant — `org/{orgId}/files/{fileId}`

**Purpose:** plant the tenancy convention as a configuration-time decision and the server-builds-the-key rule, without writing the construction code (that's lesson 4).

Content:
- The path *inside* the bucket is the object key, and in a multi-tenant SaaS the key carries tenancy: `org/${organizationId}/files/${fileId}`. Two structural wins, each tied to something the student already knows:
  1. **Tenancy isolation by prefix** — a fabricated client key cannot land outside an org's prefix *because the server constructs the key*, never the client. Connect to the Unit 9 multi-tenancy discipline (tenant filter in the `where` clause, never trusted from the client) — this is the object-storage analogue.
  2. **Prefix-scoped operations** — dashboard diagnostics, lifecycle rules, and retention policies can scope by `org/${orgId}/` prefix. Forecast lesson 5's export-output convention (`org/${orgId}/exports/...`) so the student sees the prefix scheme is a system, not a one-off.
- **The rule, stated once and forecast:** the object key is *always* built on the server from validated inputs, never accepted verbatim from the client — that's the tenancy boundary. Lesson 4 builds the construction (`${fileId}` from the row's UUID + sanitized extension); this lesson only establishes the shape.

**Diagram (optional, small):** a plain HTML tree (`FileTree` or a styled `<ul>`) showing the bucket with two org prefixes, each with `files/` and `exports/` children, a couple of object keys as leaves. Cheap visual that makes "the key is a path and tenancy is a prefix" concrete. Keep it small; this is a minor aid, not a centerpiece.

`Term` candidate: **object key** (the unique path string that addresses one object in the bucket; the join between the Postgres row and the bytes) — already defined in lesson 1's terminology; re-tooltip only if the lesson reads standalone, otherwise skip to avoid repetition.

### What you don't configure — the named-once surfaces

**Purpose:** close the triage loop. The lesson's thesis is "minimum surface"; this section explicitly lists the knobs the student should *recognize but not touch*, so they don't gold-plate. Keep it tight — one short paragraph or a compact list, each item one line.

Content (each named once, with the "reach for it when" trigger so it's recognition, not a rabbit hole):
- **Lifecycle rules** — prefix-scoped auto-deletion (e.g. delete under `tmp/` after N days). Default: none. The course will use one in lesson 5 for export outputs and dev cleanup; named here so the surface is familiar.
- **Local development strategy** — the dev environment talks to a *real* shared `acme-saas-dev` bucket with a `local/${developer}/` prefix; per-developer buckets are overkill, a 24h lifecycle rule on `local/` is the cleanup. The MinIO-in-Docker local stub is named once — only worth it if R2 access is gated. Frame as the small-team senior default.
- **Observability** — the R2 dashboard surfaces per-bucket Class A (writes/list) and Class B (reads/head) operation counts and storage bytes. The senior reach: glance weekly like you do Vercel function invocations; an anomaly usually means a leaked presigned URL or a polling client. Named, not built.

An `Aside` (tip) or a compact `Card`/list is appropriate here — this is deliberately low-weight content.

### Optional: external resources

A small `CardGrid` of `ExternalResource` cards at the end (per pedagogy lesson structure, optional LinkCards): Cloudflare R2 S3-compatibility docs, R2 CORS docs, the `aws-sdk-js-v3` R2 example, and the `@aws-sdk/s3-request-presigner` package (forecasting lesson 3). 3–4 cards max.

---

## Scope

**Prerequisites to restate briefly (do not re-teach):**
- The `@t3-oss/env-nextjs` `createEnv` boundary and the server/client split (Chapter 041) — assume known; show only the four new R2 entries being added.
- The module-scope singleton client + `import 'server-only'` poison pill + "convenience layer, not abstraction" (Architectural Principle #5) discipline (Chapter 050, `lib/email.ts`) — name the parallel, don't re-derive.
- Multi-tenancy / tenant-scoped reads (Unit 9) — referenced as the analogue for object-key tenancy; one sentence, no re-teach.
- The "function is never a byte pipe" rule and R2-over-S3 economics (lesson 1 of this chapter) — assume held; recall in one line where CORS needs it.

**Out of scope (belongs to later lessons — do not teach):**
- **Presigned PUT/GET call mechanics** — `getSignedUrl`, `PutObjectCommand`/`GetObjectCommand`, `expiresIn`, the `ContentType`/`ContentLength` pins, the layered size defense, the sign-then-finalize two-step, `HeadObjectCommand` verification → **lesson 3**. This lesson *names* `@aws-sdk/s3-request-presigner` as a dependency and forecasts signing, but writes no signing code.
- **The `file_metadata` row design** — Drizzle schema, soft-delete, indexes, tenancy at the read layer, orphan sweeps → **lesson 4**. This lesson establishes the *object-key shape* only; it does not build key construction (`${fileId}` from the row UUID) — that's lesson 4.
- **Wiring R2 into the app's two workloads** (user-upload path + CSV-export retrofit), the `lib/files/*` helper surface, the Trigger.dev server-side PUT, cost-in-operational-terms → **lesson 5**. This lesson may forecast the export prefix (`org/${orgId}/exports/`) in one line but builds nothing.
- **The browser-side upload UI and the full upload flow code** → **Chapter 069**.
- **Cloudflare Workers in front of R2, Cloudflare Images / transformation, self-hosting MinIO past the named mention, CDN-cache invalidation, multipart upload for >100 MB, virus scanning** → out of scope, named once at most.
- **Credential rotation operational flow** → named once as a forward pointer to Unit 20; not taught here.
- No quiz in this lesson — Chapter 068 is a teaching chapter; the quiz is lesson 6.

---

## Notes for downstream agents

- **Code shape divergence (deliberate):** `lib/r2.ts` shows the bare configured `S3Client` export only. Do **not** add the `presignedPut`/`presignedGet` helpers here even though the file will grow them in lessons 3–5 — staging the module keeps this lesson's cognitive load on config, not signing. Note this so the lesson-3 author knows the module is intentionally minimal here.
- **Canonical env names:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (four entries). `R2_ENDPOINT` is **derived** inside `lib/r2.ts` from `R2_ACCOUNT_ID`, not a fifth env var — matches lesson 5's stated plan. `APP_URL` (already in env from earlier units as `NEXT_PUBLIC_APP_URL`) is reused for the CORS `AllowedOrigins` — do not mint a new var.
- **Canonical object-key shape:** `org/${organizationId}/files/${fileId}` (matches lesson 1 continuity notes and lesson 4). Export outputs use `org/${organizationId}/exports/${runId}.csv` (lesson 5) — only forecast, don't build.
- **Verified facts (June 2026):** R2 token grades are *Admin Read & Write*, *Object Read & Write*, *Object Read only*, and tokens can be scoped to specific bucket(s). The AWS SDK v3 (`@aws-sdk/client-s3`) talks to R2 with `region: 'auto'` + `endpoint: https://<account_id>.r2.cloudflarestorage.com` + R2 credentials; omitting `region` throws at signing. R2 CORS supports `AllowedOrigins`/`AllowedMethods`/`AllowedHeaders`/`MaxAgeSeconds`; the explicit `AllowedHeaders: ['content-type']` is the working/recommended value for presigned PUT and a wildcard is both a security hole and an unreliable header match on R2.
