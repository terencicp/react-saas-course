# Presigned URLs — signing the upload seam

- **Title:** Presigned URLs — signing the upload seam
- **Sidebar label:** Presigned URLs

---

## Lesson framing

This is the "I can sign safely" lesson of Chapter 068 — the trust boundary every later upload depends on. Lessons 1–2 already won the architecture (Postgres owns identity, R2 owns bytes; the function is never a byte pipe) and stood up the surface (bucket, scoped token, `lib/r2.ts` singleton, CORS). The student arrives with a configured bucket and an `S3Client` that can't yet *do* anything. This lesson installs the one verb that makes the whole architecture real: the function signs a URL, the browser transfers bytes directly to R2, the function never sees them. It is a **teaching lesson** — prose, two diagrams, code blocks, two understanding-checks — **not a project**. No mission/Checklist/test-suite framing, no `pnpm test:lesson`. Chapter 069 wires the browser-side code and the UI; here we teach the mechanics and the signatures.

Pedagogical conclusions that shape the whole lesson:

- **The mental model is the destination, the API is the vehicle.** The single load-bearing idea is *a presigned URL is a time-boxed, operation-scoped capability the function mints with its credentials and hands to a client that has none*. Lead with that — what a presigned URL *is* and *why it exists* — before any `getSignedUrl(...)` call. The student should be able to explain "why can the browser PUT to R2 with no R2 credentials?" before they see the signature. Once the capability model lands, PUT and GET are two instances of one idea, and every watch-out (expiry, content-type pin, size) is "how do I scope the capability tightly."
- **Two diagrams carry the conceptual weight, and they are different shapes.** (1) A **sequence diagram (Mermaid)** of the two-step write — browser → function (request URL), function → browser (signed URL + key), browser → R2 (direct PUT, the fat arrow), browser → function (finalize), function → R2 (HEAD verify), function → Postgres (row). This is the canonical "actors over time" shape and it makes the byte-never-touches-the-function rule *visible*: the only fat arrow skips the function entirely. (2) An **annotated illustration (HTML/CSS inside `<Figure>`) of a presigned URL's anatomy** — one URL broken into base (bucket+key), `X-Amz-Expires`, `X-Amz-SignedHeaders`, `X-Amz-Signature`, with a callout per segment. CSS over SVG because it's a labeled string, not a geometric artifact, and the segments are just tinted `<span>`s. **Pedagogical goal of (2):** demystify the signature — students treat presigned URLs as magic; seeing the expiry and signed-headers *in the URL itself* converts magic into mechanism and makes "the signature pins these headers" concrete.
- **Teach the size defense as the lesson's senior payoff, and ground it in a real R2 quirk.** This is the section that separates "I followed a tutorial" from "I understand the boundary." The fact that *matters*: **R2 does not enforce a maximum body size from a signed `ContentLength` the way S3's POST-policy `content-length-range` does** — a client holding a valid presigned PUT URL can stream a terabyte to the bucket regardless of what size it claimed. (Verified June 2026 — see fact-check.) The naive belief ("I signed `ContentLength`, so I'm safe") is the trap. The senior answer is the **three-layer defense**: client pre-checks `file.size`, the function caps `claimedSize` before signing, and the finalize step issues a `HeadObjectCommand` and compares the *actual* stored size to the claim before writing the row. Teach it as "neither the client nor the URL is the boundary — the post-upload HEAD is." This reframes the whole flow: the row is the assertion "I verified this object," not "I issued a URL."
- **The content-type pin is the structural answer to "upload an exe to a .png key."** Distinct from size: the signed URL carries `ContentType`, and a mismatched `Content-Type` header on the PUT returns `403 SignatureDoesNotMatch` on R2 (verified). Teach this as the *one* constraint the signature enforces well for free — and pair it with the server-side allow-list check *before* signing, so the function never even mints a URL for an unsupported type. The split: the allow-list is the policy, the signature is the enforcement.
- **Expiry is a trust-window decision, taught through a failure.** The reflex students get wrong: long expiries "to be safe." Invert it — every minute of expiry is a minute the capability is live if the URL leaks (browser history, analytics, a shared screenshot). The course pins 5 min for PUT, 10 min for GET. The teaching hook is the "24-hour download link in an email" anti-pattern: it *feels* user-friendly and is a leak surface; the right shape is a fresh short-lived GET minted at render/click time. Connect forward to lesson 4 (`getFileDownloadUrl` mints per call, never persists the URL).
- **Anchor everything to patterns the student already owns.** The signing helper is a thin compose over the SDK at the call site (Architectural Principle #5, identical to the `lib/email.ts` / `lib/r2.ts` "do not wrap" stance from lessons 1–2). The Server Action that issues the URL is the same `authedAction(role, schema, fn)` shape from Unit 10 — *the role/tenant boundary is at the action, not at R2*. The two-step write reuses the five-seam action shape (parse → authorize → mutate → revalidate → return) and the `Result<T>` contract. The student is applying known disciplines to a new resource; the only genuinely new surface is `getSignedUrl` + the size quirk.
- **CORS is closed out here, not re-taught.** Lesson 2 configured the rule; this lesson shows the one *runtime* symptom the student will actually hit — a green `OPTIONS` 200 followed by a red `PUT` 403 in the Network tab — and decodes it: CORS allowed the preflight, but the sent `Content-Type` didn't match the signed one. One paragraph + the network-tab read; reference lesson 2 for the rule itself.

Mental model the student should end with: "A presigned URL is a short-lived, single-operation capability my function mints with its R2 credentials. I scope it tight — one method, one key, one content-type, a 5–10 minute fuse — and hand it to a browser that has no credentials of its own. The browser uploads straight to R2; my function never touches the bytes. Because R2 won't enforce the size for me, the row I write afterward is an *assertion that I HEAD-verified the object*, not a promise that I issued a URL."

The lesson should feel like signing a production upload seam alongside a senior who keeps asking "and what stops a client from abusing that?" Adult, terse, no celebratory tone (pedagogy filter #2).

---

## Lesson sections

### Introduction (no header)

Open with the senior question, stated implicitly (pedagogy filter #1): the bucket exists, the token is scoped, CORS is set — *how does a byte actually get from the user's browser into R2 without ever passing through the Next.js function, and what does the function sign so a client can't abuse the upload?* State the destination in one breath: by the end the student can mint a presigned PUT and GET, scope each tightly (method, key, content-type, expiry), defend the upload size, and read the two-step sign-then-finalize flow — and explain why the metadata row is written *after* the upload, not before. Name what this lesson teaches vs. defers: mechanics and the Server Action signature here; the browser-side code and `Files` UI in Chapter 069; the full `file_metadata` schema in lesson 4. Keep to ~2 short paragraphs.

### A presigned URL is a borrowed capability

**Purpose:** install the mental model before any API. This is the simplified-model-first move — the capability idea is the whole lesson compressed; everything after is "how to scope the capability."

Content:
- Define it plainly: a presigned URL is an ordinary R2 (S3-style) object URL with extra query parameters — a signature (HMAC computed over the bucket, key, HTTP method, expiry, and any pinned headers, using the function's R2 credentials) plus the metadata that signature covers. Anyone holding the URL can perform *exactly that one operation* until it expires, with **no R2 credentials of their own**. The function mints it; the client spends it.
- Frame the "why" as the answer to a problem the student already feels: the function has the credentials, the browser must not (a `NEXT_PUBLIC_` R2 secret is a public-write hole). A presigned URL is how the function *delegates one narrow action* without handing over the keys. Tie explicitly to Architectural Principle #3 — the upload-issue endpoint is the seam the course has been building toward; this is its concrete form.
- Three flavors, named, with the course's pick called out:
  - **Presigned PUT** — the browser uploads one object to the signed key. The course's default for uploads under 100 MB.
  - **Presigned GET** — anyone with the URL reads the object until expiry. The course's default for serving private files back.
  - **Presigned POST (policy-based)** — an alternative that *can* enforce server-side size and content-type constraints via a policy document. Named once for recognition; **not built** — PUT covers the project, and the size enforcement POST offers is replaced by the HEAD-verify step taught later. (Forward-flag: this is *why* the course tolerates PUT's missing size enforcement.)

**Diagram — presigned URL anatomy (HTML/CSS inside `<Figure>`).** One example URL laid out as tinted segments on (ideally) one or two wrapped lines: `https://<account>.r2.cloudflarestorage.com/<bucket>/org/<orgId>/files/<id>.png` then `?X-Amz-Algorithm=…&X-Amz-Expires=300&X-Amz-SignedHeaders=content-type&X-Amz-Signature=…`. A short callout under each tinted segment: base = *which object, which operation*; `X-Amz-Expires` = *the fuse (seconds)*; `X-Amz-SignedHeaders` = *the headers the client must send unchanged*; `X-Amz-Signature` = *seals all of the above — tamper with any and it's 403*. **Pedagogical goal:** convert "signature = magic" into "signature = these fields, sealed." Keep height well under 800px; this is a labeled string, not a graph. Use `<Term>` is not needed inside the figure — the callouts carry the definitions. Use real-looking but obviously-truncated signature/credential values (e.g. `…a1b2c3` ellipses) so no high-entropy literal trips gitleaks.

### Signing a PUT — the upload capability

**Purpose:** the concrete PUT mechanics, taught as "scope the capability tight."

Content, built around an `AnnotatedCode` walkthrough of the signing call (single block, the SDK shows at the call site — Principle #5). Suggested block (server-side helper body, ~8–10 lines):
```ts
const command = new PutObjectCommand({
  Bucket: env.R2_BUCKET_NAME,
  Key: objectKey,
  ContentType: contentType,
  ContentLength: claimedSize,
});
const url = await getSignedUrl(r2, command, {
  expiresIn: 300,
  signableHeaders: new Set(['content-type']),
});
```
`AnnotatedStep`s (each one paragraph, ≤6 lines, prefer colored highlights — blue default):
1. `PutObjectCommand` with `Bucket` + `Key` — the operation and the target object. The `Key` is the tenancy-scoped path (`org/${orgId}/files/${id}.${ext}`) constructed *server-side* (forecast lesson 4; restate lesson 2's "never accept the key from the client"). (blue)
2. `ContentType` pinned — this is what the signature will enforce; the browser must send the matching header or R2 returns `403 SignatureDoesNotMatch`. (green)
3. `ContentLength: claimedSize` — *signed, but see the size section: R2 will not reject an oversize body on this alone.* Flag the limitation here, resolve it two sections down. (orange — this is the trap)
4. `getSignedUrl(r2, command, { expiresIn: 300 })` — 5-minute fuse; returns a plain string URL. `r2` is the singleton from `lib/r2.ts`. (blue)
5. `signableHeaders: new Set(['content-type'])` — forces `content-type` into the signed header set so the pin actually binds (note: the v3 presigner won't always sign it implicitly). (violet)

After the walkthrough, one short paragraph on the *browser side* (named, not built — it's Chapter 069): `await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`. The single rule to carry: **the `Content-Type` the browser sends must equal the `ContentType` that was signed**, byte-for-byte — mismatch is a silent 403. This is the most common first-upload failure; name it now so the student recognizes it in lesson 4 / Chapter 069.

Use `<Term>` on `HMAC` (one-line: keyed hash that proves the URL was minted by the credential holder and hasn't been altered).

### Signing a GET — the read-back capability, fresh every time

**Purpose:** the GET mechanics and the expiry/leak discipline, taught through the email anti-pattern.

Content:
- The GET shape is smaller — no body, no content-type to pin. A short `Code` block:
  ```ts
  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }),
    { expiresIn: 600 },
  );
  ```
  10-minute fuse; the URL drops straight into `<img src>`, `<a href>`, or an email body.
- **The senior rule, stated hard:** presigned GET URLs are minted *fresh per render/request* and **never persisted** — not in the database, not in a cache that outlives the expiry. The row stores the *parts that are permanent* (key, type, size, names); the URL is derived on demand. (Forecast lesson 4's `getFileDownloadUrl` and its no-`url`-column rule; this is the same rule seen from the GET side.)
- **The "24-hour link in an email" anti-pattern.** Walk the failure: a long-expiry GET feels friendlier ("the link works all day"), but it is a wide leak window — the URL lives in the email provider's logs, the recipient's history, any forward. And the symmetric failure of the *right* short fuse: the user opens the email after the window and the link is dead. The senior resolution (preview, built in Chapter 069's CSV retrofit, lesson 5): the email links to an *app route* that re-mints a short GET on click, not to the raw presigned URL. Name the pattern; don't build it here.

### The size defense — why the signed length isn't the boundary

**Purpose:** the lesson's senior payoff. Teach the R2 quirk, kill the naive belief, install the three-layer model.

Content:
- State the quirk directly and cite it as a real platform difference (not a Cloudflare bug): **S3's presigned-POST policy supports a `content-length-range` condition the storage layer enforces; R2's presigned PUT does not enforce a maximum body size from the signed `ContentLength`.** A client holding a valid PUT URL can stream far more than it claimed. So "I signed `ContentLength`, therefore the size is safe" is **false on R2** — this is the trap from the PUT walkthrough's orange step, now resolved.
- The three-layer defense, taught as defense-in-depth (no single layer is the boundary):
  1. **Client pre-check** — validate `file.size` before even requesting a URL. *UX, not security* — it gives instant feedback and avoids a wasted round-trip; trivially bypassed, so it is never the boundary.
  2. **Server cap before signing** — the action checks `claimedSize` against a per-tenant/per-type max before minting the URL. *Policy* — refuses to issue a capability for an over-cap claim. Still trusts a number the client sent.
  3. **Post-upload HEAD verify** — after the PUT completes, the finalize action issues `HeadObjectCommand({ Bucket, Key })`, reads the *actual* `ContentLength` R2 reports, and compares it to the claim (and re-checks the cap) **before** inserting the row. *The real boundary.* If the stored object exceeds the cap, the row is never written and the orphaned object is left for the cleanup sweep (named in lesson 4).
- Reframe the row's meaning: the `file_metadata` row is the function's **assertion that it HEAD-verified the object**, not a record that "a URL was issued." This is the through-line into the two-step write.
- Pair with the **content-type allow-list** (policy/enforcement split): the action rejects unsupported types *before* signing — `if (!ALLOWED_TYPES.has(contentType)) return err('validation', 'Unsupported file type')` — and the signed `ContentType` is the runtime enforcement (the 403 from the GET/PUT sections). Together they answer "upload an executable to a `.png` key": the function never signs the exe's type, and even a forged key can't change the sealed content-type.

**Exercise — `Buckets` (classification).** Two columns: **"Stops an oversize upload"** vs **"Doesn't stop it / wrong tool."** Items to sort: *client-side `file.size` check* (doesn't — UX only), *server cap on `claimedSize`* (doesn't fully — trusts the claim), *post-upload `HeadObjectCommand` size compare* (stops it — the boundary), *signed `ContentLength`* (doesn't on R2 — the quirk), *signed `ContentType`* (wrong tool — that's the type pin, not size), *short `expiresIn`* (wrong tool — that's the leak window). **Goal:** force the student to articulate that only the HEAD verify is load-bearing for size, and that the type pin/expiry are orthogonal defenses. Grading is the column placement; the component's per-item feedback restates *why*.

### The two-step write — sign, upload, finalize

**Purpose:** assemble the pieces into the canonical flow and establish the ordering rule (row written after, not before).

Content:
- Walk the four steps as prose tied to the sequence diagram below:
  1. **Request + sign** — client calls the `presignedPut` action with `{ fileName, contentType, claimedSize }`; the action parses, authorizes (role), checks the type allow-list and the size cap, constructs the server-side `objectKey`, signs the PUT, returns `{ url, objectKey, uploadId }`.
  2. **Direct upload** — client PUTs the file straight to R2 with the signed URL. *The function is not in this path* — this is the byte-never-touches-the-function rule made literal.
  3. **Finalize** — on PUT success, the client calls a second action, `finalizeUpload`, with `{ uploadId, objectKey }` (the actual size is read server-side via HEAD, not trusted from the client).
  4. **Verify + persist** — the finalize action HEADs the object, compares size to the cap, inserts the `file_metadata` row, returns success.
- **The ordering rule, stated as a senior anchor:** the metadata row is written *after* the upload is confirmed, never before. Reasoning, both directions of failure:
  - **Orphan bytes** (PUT succeeded, finalize never ran — network drop, user navigated away): the row is absent; the partial/complete bytes sit in R2 unreferenced. Cheap to clean — a prefix-scoped lifecycle rule or a daily list-and-delete sweep handles them (named in lessons 4–5, *not built*).
  - **Orphan rows** (row written before upload, then the upload failed): the UI shows a file that doesn't exist; every read 404s on the bytes. *Worse* — the database lies, and lies are expensive to detect.
  - The asymmetry is the lesson: orphaned bytes are a cleanup chore; orphaned rows are a correctness bug. So we bias toward possibly-orphaned bytes by writing the row last.
- **The Server Action signature** (forecast the Chapter 069 reference; restate the `authedAction` discipline):
  ```ts
  presignedPut(input: { fileName: string; contentType: string; claimedSize: number })
    : Promise<Result<{ url: string; objectKey: string; uploadId: string }>>
  ```
  Wrapped in `authedAction('member', schema, fn)` — the role/tenant boundary is at the action, R2 has no notion of the user. State plainly that `finalizeUpload` is the twin action (full shape is lesson 4 territory); here we only need that it exists and runs the HEAD.

**Diagram — two-step write sequence (Mermaid `sequenceDiagram` inside `<Figure>`).** Actors: `Browser`, `Function` (the Server Actions), `R2`, `Postgres`. Messages in order: Browser→Function `presignedPut(fileName, type, size)`; Function→Browser `{ url, objectKey }`; Browser→R2 **`PUT file (the bytes)`** — annotate as the only fat/heavy arrow, ideally a `Note over Browser,R2: bytes never touch the function`; R2→Browser `200`; Browser→Function `finalizeUpload(objectKey)`; Function→R2 `HEAD object`; R2→Function `actual size`; Function→Postgres `INSERT file_metadata`; Function→Browser `ok`. **Pedagogical goal:** make the architecture *visible* — the eye should immediately see that the byte-carrying arrow bypasses Function entirely, and that the row write is the *last* message. Bump `themeCSS` message font to ~18–20px per the Mermaid doc so it reads after scale-down. Watch the height; a 4-actor sequence with ~9 messages is fine.

**Exercise — `Sequence` (ordering).** Instructions: "Order the steps of a safe direct-to-R2 upload." Steps in correct source order: (1) client validates `file.size` locally; (2) client calls `presignedPut` with the file's name, type, and size; (3) server checks type + size cap and signs a 5-minute PUT URL; (4) browser PUTs the file straight to R2; (5) client calls `finalizeUpload`; (6) server HEADs the object and compares the real size to the cap; (7) server inserts the `file_metadata` row. **Goal:** cement the ordering and especially that the row insert is last and the HEAD precedes it. The shuffle + check loop is exactly the recall this flow needs.

### Reading the failures in the Network tab

**Purpose:** close out CORS at the runtime level and give the student the diagnostic skill, without re-teaching the lesson-2 rule.

Content (short — one or two paragraphs + a tight list):
- The verification reflex (senior anchor, forecast Chapter 069's verify step): open the Network tab during an upload. You should see the `presignedPut` call carrying a *tiny* JSON request (`{ fileName, contentType, claimedSize }`) and returning a *tiny* JSON response (`{ url, objectKey }`) — **bytes, not megabytes** — and a separate `PUT` going to `…r2.cloudflarestorage.com`, *not* to your domain. If the big request is hitting your function, the architecture is broken (you're piping bytes).
- The two failure signatures to recognize:
  - **`OPTIONS 200` then `PUT 403`** — CORS allowed the preflight (lesson 2's rule is working) but the PUT signature rejected it. Almost always the sent `Content-Type` ≠ the signed `ContentType`. Fix at the sign/PUT pair, not in CORS.
  - **`PUT` blocked with a CORS error (no 403, the browser cancels it)** — the bucket CORS rule doesn't list the origin/method/header at all. Fix in the bucket CORS (lesson 2), not in the signing code.
  - The distinction *is* the skill: a 403 means "reached R2, signature/headers wrong"; a browser-cancelled request means "CORS never let it leave." Reference lesson 2 for the rule; don't restate the JSON.

`<Term>` on `preflight` is unnecessary if lesson 2 already defined it (continuity notes confirm it did) — reference, don't redefine.

### External resources (optional)

One or two `ExternalResource` cards: the Cloudflare R2 presigned-URLs doc and the `@aws-sdk/s3-request-presigner` reference. Keep to the two canonical sources; this is a mechanics lesson and the official docs are the right deep-dive.

---

## Scope

**Prerequisites the student already has (redefine in one line max, do not re-teach):**
- The bucket, the scoped Object-Read-&-Write token, `lib/r2.ts` (the `S3Client` singleton + `import 'server-only'`), and the CORS rule — all from lesson 2. This lesson *uses* `lib/r2.ts`; it does not reconstruct it. CORS is referenced for the runtime failure, not re-configured.
- The object-key tenancy convention `org/${orgId}/files/${id}` — introduced in lesson 2 as a naming decision; this lesson signs against it but does not own its construction code.
- `authedAction(role, schema, fn)`, the five-seam action shape, and `Result<T>` / `ok`/`err` — from Unit 6 / Unit 10. Applied here, not re-derived. Architectural Principle #3 (function-as-seam) and #5 (don't wrap the SDK) are *referenced by name* and applied; they were taught earlier.
- `HMAC`, `preflight`, `egress`, `S3-compatible API`, `object key` — defined in earlier chapters / Chapter 068 lessons 1–2. `HMAC` gets a one-line `Term` refresher (it's load-bearing here); the rest are referenced.

**This lesson does NOT cover (defer explicitly):**
- **The full `file_metadata` row schema** (columns, indexes, soft-delete, `originalFileName` vs `objectKey`, the `getFileDownloadUrl` helper, tenancy at the read) — **lesson 4**. This lesson names the row only as "the assertion written after HEAD-verify" and shows the *action signatures*, not the Drizzle schema or the metadata-layer helpers.
- **The object-key *construction* code** (UUIDv7 row id as the `${id}` segment + sanitized extension) — **lesson 4**. Here the key is a given the action receives/passes; lesson 4 builds it server-side.
- **The browser-side upload code and `Files` UI** (the `<input type="file">`, the `fetch` PUT wiring, `useActionState`, optimistic UI, the gallery with per-render GETs) — **Chapter 069**. Named in one paragraph for the model; not built.
- **The CSV-export retrofit** (server-side PUT from the Trigger.dev worker, the email's GET link, the app-route re-mint pattern) — **lesson 5 + Chapter 069**. Referenced once as the resolution of the email-link anti-pattern.
- **CORS configuration** — **lesson 2**. Only the runtime symptom (OPTIONS/PUT in the Network tab) is taught here.
- **Multipart presigned uploads for files >100 MB**, and **presigned POST policy uploads** — named once each for recognition, **not built**. PUT under 100 MB is the course default; the POST policy's size enforcement is explicitly the thing the HEAD-verify step replaces.
- **Orphan cleanup sweeps** (lifecycle rule, daily list-and-delete) — named as the safety net for orphaned bytes; **built in neither lesson** (forward note to lessons 4–5 / a future ops chapter).
- **Virus scanning / content moderation** — out of scope, not named beyond "this is where production hardening between upload and 'available' lives" if it comes up naturally.

---

## Notes for downstream agents (code conventions + deliberate divergences)

- **Helper shape (Principle #5):** the signing helpers compose the SDK at the call site — `getSignedUrl(r2, new PutObjectCommand(...), { ... })` is shown inline, *not* hidden behind a generic `StorageProvider` interface. Mirror the lesson-2 `lib/r2.ts` stance. The Chapter 069 file layout will be `lib/files/presigned-put.ts`, `lib/files/presigned-get.ts`, `lib/files/finalize.ts` (per the chapter outline) — this lesson can reference those filenames as forward-looking but should keep the code excerpts to the bare signing call, not full module scaffolding.
- **`env`:** read R2 config from the typed `env` (`env.R2_BUCKET_NAME`), never `process.env` directly — the Zod env pattern from Chapter 034 / lesson 2.
- **`Result` contract:** use the canonical `Result<T>` with `ok(data)` / `err(code, userMessage, fieldErrors?)`. Error codes for the action: `'validation'` (bad/unsupported type, over-cap size), `'forbidden'` (role), `'internal'` (HEAD/sign failure). Don't invent codes outside the conventions' union.
- **`authedAction('member', …)`:** confirm the role string against the project's role enum when Chapter 069 builds it; the chapter outline writes `'member'`, the conventions example uses `'member'`-class roles — keep it as `'member'` here and let the project reconcile. Flag this as a forward-resolved detail, not a claim to verify in this lesson.
- **`signableHeaders`:** include `signableHeaders: new Set(['content-type'])` in the `getSignedUrl` options in the PUT example — verified that the v3 presigner does not always fold `Content-Type` into the signature implicitly, and the content-type pin is load-bearing for the lesson's security claim. This is a deliberate, correctness-driven inclusion; note it so a downstream agent doesn't "simplify" it away.
- **`ContentLength` is shown but explicitly flagged as non-enforcing on R2.** Do not present it as the size boundary. This is a pedagogically deliberate "show the trap, then resolve it" sequence — keep the orange annotation and the size-defense section together.
- **No high-entropy literals:** any example signature/credential/key values in the URL-anatomy figure must be obviously truncated (`…a1b2c3`) to avoid tripping the pre-commit gitleaks hook (known repo gotcha).
- **ID convention:** when the key segment appears, prefer the row UUID (`org/${orgId}/files/${id}.${ext}`) consistent with lesson 4's "id-as-key-segment" decision and the conventions' UUIDv7 default — *not* `nanoid()` (the chapter-outline brainstorm wrote `nanoid()`, but lesson 4's continuity makes the row `id` the segment; favor that for cross-lesson consistency). Flag for the writer.
