## Concept 1 — The byte-pipe rule: function never sees user-upload bytes

**Why it's hard.** Returning students reach for the `fetch('/api/upload', { body: file })` shape they last shipped in 2019. They cannot picture how a 25 MB PUT bypasses a Server Action entirely while the action still "runs the upload." Until the path of the bytes is drawn separately from the path of the metadata, every later discipline (presigned URL, HEAD, fresh GET) reads like ceremony.

**Ideal teaching artifact.** A side-by-side Network-tab replica. Two stacked columns: left, the wrong picture — `presignedPut` POST carrying the full file body through the function. Right, the right picture — three traffic rows: tiny POST to `presignedPut` (~400 B), megabyte-scale PUT direct to `<bucket>.r2.cloudflarestorage.com`, tiny POST to `finalizeUpload` (~100 B). A toggle scales the bars to true byte ratio so the asymmetry is visceral, not symbolic. Archetype: **Concept** rendered as a real-artifact replica — the student is staring at the same DevTools surface they will inspect in 13.4.7's verify, only annotated.

**Engagement.** After the replica, a `Buckets` round: drag eight traffic rows (presignedPut response, the PUT body, finalizeUpload payload, a hypothetical 100 MB form POST, a presigned GET, the HEAD response, etc.) into "function sees bytes" vs. "function sees JSON only". The bucket sort forces the student to defend the byte-pipe rule case by case, not just nod at the headline.

**Components.**
- `Figure` wrapping a hand-SVG of the two Network-tab columns with proportional bars. The asymmetry is the lesson; a static SVG with two labeled scenarios carries it without a bespoke widget.
- `Buckets` for the classification round.
- Alternative: a bespoke `NetworkAsymmetry` component with a slider that scales the bytes ratio — recurs nowhere else in the chapter and has no forward-link, so demoted.

**Project link.** This concept gates 13.4.7's "function never sees the bytes" verify clause. Lesson 13.4.3's `curl`-PUT-to-R2 proof is the same picture without a browser in it; the artifact pre-loads the mental model the student then confirms in DevTools.

---

## Concept 2 — Two-step write: sign, upload, HEAD, insert (never row-before-bytes)

**Why it's hard.** The instinct from CRUD-shaped form-handlers is to insert the row first ("reserve a pending status") and then write the file. R2 has no transaction with Postgres; a `pending` row whose bytes never arrive lies to the UI forever. The senior call — row only after bytes — looks paranoid until you have lived with the alternative.

**Ideal teaching artifact.** A scrubbable four-frame sequence: (1) signed PUT URL returned, no row yet; (2) bytes streaming to R2, still no row; (3) HEAD reads true size + content type from R2; (4) row inserted inside `tenantDb.transaction`, audit log written. Each frame shows what state Postgres is in *and* what state R2 is in, side by side. A second tab on the same widget runs the wrong sequence: row inserted first, then a tab-close before PUT — the student sees an orphan row hanging in the table with no object behind it. Archetype: **Pattern** in scrubbable form — the structural failure shown by contrast.

**Engagement.** A `Sequence` exercise: the student drags six labeled steps (Zod parse, generate `uploadId`, sign PUT, browser PUT, HEAD, insert row) into the correct order, with two distractors (`insert pending row`, `update row to "complete"`) that have no correct slot. Wrong placements show which orphan shape they produce.

**Components.**
- `DiagramSequence` carries the two-tab scrub — frames 1–4 of the correct path, with a comparison tab for the wrong path. Existing component, exact fit.
- `Sequence` for the recall step. Distractor handling is native to the component.

**Project link.** 13.4.4's `finalizeUpload` body and 13.4.7's "HEAD-based size verification" verify clause both land on this sequence. The artifact is the spine the student carries through both lessons.

---

## Concept 3 — Server-constructed objectKey: tenancy in the path itself

**Why it's hard.** The student wants the client to send `objectKey: 'avatars/me.jpg'`. The senior call is the opposite — the server builds `org/${orgId}/files/${uploadId}.${ext}` from the validated content type, and the client never touches it. The failure mode (a crafted UUID clobbering another tenant's row at finalize) is too abstract until you watch the attack happen.

**Ideal teaching artifact.** A two-panel "wrong-by-default" widget. Left panel: a fake action that accepts `objectKey` from the client. The student is given three crafted requests to send: one that writes under another tenant's prefix, one that clobbers an existing row's key, one that puts a `.exe` under a `.jpg` extension. Each one succeeds — the widget shows the resulting object listing colored by tenant. Right panel: the same actions routed through `buildObjectKey({ orgId: ctx.orgId, fileId: uploadId, contentType })`. The same three requests now produce keys the attacker cannot influence. Archetype: **Pattern** rendered as a misconception-first ambush — the student is invited to break the wrong shape, then shown the shape that cannot be broken.

**Engagement.** The widget is the assessment — the student must successfully exploit the wrong panel before the right panel unlocks. Follow-up: a single `MultipleChoice` asking which of four `objectKey` constructions are safe to trust from the client (answer: none).

**Components.**
- Bespoke `KeyConstructionAmbush`: client-vs-server key-construction sandbox with three pre-loaded attack payloads. Inputs: a list of attack payloads and the two key-builder functions. Output: visualized R2 listing colored by tenancy.
- Alternative: `CodeVariants` showing the trusted and untrusted code paths side by side, with prose walking the three attack shapes — covers the concept if the bespoke build does not land in time.

**Project link.** 13.4.3's "uploadId is server-generated, never client-supplied" senior call lands cleanly on the ambush. The widget is the mental model that survives into every future upload feature the student writes.

---

## Concept 4 — HEAD-verified truth: the client lies, R2 tells you

**Why it's hard.** The client claims `claimedSize: 1024`. The bytes that arrive are 10 MB. R2's S3-compatible signing does *not* enforce `ContentLength` server-side (a 13.3.3 quirk the student has been told once and forgotten). Without HEAD-then-verify at finalize, the `byteSize` column lies and the size cap is decorative. The layered-defense argument only clicks when the student watches the upper layer fail and the lower layer catch it.

**Ideal teaching artifact.** A short scripted "lying client" walkthrough. Two code panes side by side: the signed PUT command with `ContentLength: 1024`, and a `curl` invocation pushing a 10 MB file. A run button executes both. Output panel shows: PUT returns 200 (R2 accepted the bytes), HEAD reports `ContentLength: 10485760`, `finalizeUpload` throws `size-mismatch`, no row inserted, the 10 MB orphan object visible in the listing pane and named as lifecycle's job. Archetype: **Pattern** as a small playable model — the failure mode is the lesson, run as a real artifact rather than narrated.

**Engagement.** A `PredictOutput` round before the run button: given the signed PUT with `ContentLength: 1024` and a 10 MB body, what happens at each layer? Three predictions (PUT status, HEAD reading, finalize result) gate the reveal. The student who predicts "R2 rejects the PUT" gets to see otherwise — that prediction error *is* the teaching moment.

**Components.**
- Bespoke `LayeredDefenseTrace`: a scripted three-layer trace (PUT response, HEAD output, finalize verdict) with a single run button. Inputs: claimed size, actual body size, expected content-type, actual content-type. Output: a labeled three-row table of what each layer saw and decided. The shape generalizes to any "request walks a defense pipeline" scenario — see Component proposals for the forward-link argument.
- `PredictOutput` for the prediction round.

**Project link.** 13.4.7's "HEAD-based size verification" verify clause runs the same scenario for real. The widget is the dress rehearsal.

---

## Concept 5 — Fresh-per-render presigned GETs (the 11-minute proof)

**Why it's hard.** Every instinct says "store the URL on the row so we don't have to re-sign". The senior call is the opposite — never persist, never cache, sign per render. The discipline only makes sense once the student watches a copied URL die while a refreshed page keeps working. This is the chapter's headline proof and the place a single visceral demonstration replaces three paragraphs of argument.

**Ideal teaching artifact.** A two-pane time-travel widget. Top pane: a faux `/files` page with a "Download" link, plus a visible countdown showing the URL's remaining lifetime (10:00 → 0:00). Bottom pane: the same row, but the page is *re-rendered* every time the student clicks "Refresh", showing the `href` changing each time. The student copies the top-pane URL, fast-forwards the clock (button: `+11 min`), pastes the copied URL into a "test request" field — `403 AccessDenied`. Then clicks Refresh on the bottom pane — new `href`, click — works. The clock control is the lesson; the student must *experience* time passing without waiting 11 minutes.

A second short beat: a code panel highlighting `// Not 'use cache' — fresh-per-render is structural`, with a one-line annotation explaining why caching this page poisons the URL. The first beat builds the intuition; the code beat anchors it to the actual `/files/page.tsx` shape.

**Engagement.** A `TrueFalse` round on four statements after the widget: "the URL can be cached for 5 minutes if requests are rare" (false), "view-source on /files would show a different `href` after refresh" (true), "saving the URL in the row would be fine if we re-sign every Friday" (false), "the page must not use the React `cache` wrapper or `'use cache'`" (true). Each false-claim review names the specific failure mode.

**Components.**
- Bespoke `PresignedExpiryDemo`: a two-pane clock-controlled demo of presigned URL expiry. Inputs: expiry seconds, pre-baked signed URL, mock R2 endpoint that honors the expiry against widget-local time. Output: live `href` per render + a paste-and-test field that returns 200 or 403. The headline artifact of the chapter — worth building well.
- `TrueFalse` for the recall round.
- Alternative: `Figure` with a hand-SVG sequence diagram of three timeline rows (sign, copy, expire) — covers the *picture* but cannot deliver the felt experience of pasting a dead URL.

**Project link.** 13.4.5 is built around this proof and 13.4.7's "Fresh-per-render" verify clause is the live version. The widget is the only place the student feels the 11-minute death without actually waiting 11 minutes.

---

## Concept 6 — Tenancy at the read boundary: `tenantDb(orgId)` + `isNull(deletedAt)` are the gate

**Why it's hard.** The student has met `tenantDb` and `authedAction` in Unit 10 but has not yet had to *defend* a read where the URL of the resource is itself a long random string. The instinct is "the UUID is unguessable, that's the gate". The senior call: unguessability is not a gate, the gate is the `where organizationId = ctx.orgId` clause and the `isNull(deletedAt)` filter. The misconception is silent until a cross-org request leaks a download.

**Ideal teaching artifact.** A small inline guided puzzle. Three rows of `file_metadata` are visible (two in org A, one in org B). The student sees the `getFileDownloadUrl` function with three blanks: `tenantDb(___)`, `where(___, isNull(___))`, and a fourth blank for the error code returned on no row. Four request scenarios run against the function: A-user requests A-file (ok), A-user requests B-file (object-not-found), B-user requests A-file (object-not-found), A-user requests soft-deleted-A-file (object-not-found). The student fills the blanks; wrong fills produce the wrong scenario verdict. Archetype: **Pattern** as a fill-in-the-gate puzzle.

**Engagement.** The puzzle is the assessment — fills are correct or not. Follow-up: a `MultipleChoice` asking which of four error codes returning `object-not-found` (instead of `forbidden`) accomplishes — answer: hides the existence of the resource across tenants.

**Components.**
- `Dropdowns` with fenced-code `___` placeholders and an `answers` prop carries the gate-fill puzzle. The four scenarios run as static verdict labels keyed off the student's fills.
- `MultipleChoice` for the follow-up.

**Project link.** 13.4.5's cross-org test ("upload in A, switch to B, `/files` empty; `getFileDownloadUrl({ fileId: <A-id> })` → `object-not-found`") is this puzzle run as a verification step.

---

## Concept 7 — CORS as a browser-only trust boundary

**Why it's hard.** Students who last touched CORS were told it is "a security thing" and then handed `Access-Control-Allow-Origin: *` to make it shut up. Two misconceptions persist: (a) CORS is a server-side enforcement and (b) wildcard origin is fine for an internal app. The right model is that CORS is *browser-enforced*, the bucket policy is what stops `*` from working at scale, and `curl` cannot reproduce the failure because it does not run a preflight.

**Ideal teaching artifact.** A two-panel "who is enforcing what" diagram with an interactive request runner. Left panel: the browser sends an `OPTIONS` preflight, receives the bucket's CORS response, decides whether to send the PUT. Right panel: the bucket policy itself — the JSON the `r2:cors` script pushes. Three runs: from `localhost:3000` (allowed), from `127.0.0.1:3000` (rejected at preflight by the browser, never reaches the PUT), from `curl` (no preflight, PUT succeeds — which is the load-bearing surprise). Each run highlights which actor said "yes" and which said "no". Archetype: **Concept** as an actor-attribution diagram — anthropomorphic-actors-style, in the Lin Clark vein.

**Engagement.** After the diagram, a `MultipleChoice`: "A `curl` PUT to the signed URL succeeds from a non-allowlisted machine. The browser PUT fails. Which statement is true?" Four options exercise the browser-only / bucket-only / preflight / wildcard misconceptions. The right answer rebuilds the model in one shot.

**Components.**
- Bespoke `CORSActorDiagram`: a three-actor (browser, bucket, attacker `curl`) traffic visualization with selectable origin. Inputs: bucket CORS JSON, request origin, request method. Output: a labeled flow showing which actor stopped (or did not stop) the request.
- Alternative: `Figure` with a hand-SVG sequence diagram (browser → bucket preflight → browser decision → PUT) plus a small `TabbedContent` flipping between the three run scenarios. Single-use chapter component without a forward-link in upcoming units; demoted to alternative and the `Figure`-wrapped SVG is the primary recommendation.
- `MultipleChoice` for the recall.

**Project link.** 13.4.7's CORS verify clause ("serve on `127.0.0.1:3000`... PUT preflight fails... restore localhost — works") is the same scenario in real browser DevTools.

---

## Concept 8 — One bucket, two prefixes, two byte-pipe paths

**Why it's hard.** The student is asked to ship two upload paths in one chapter — browser PUT for user uploads, server PUT for the export retrofit — against *the same* `lib/r2.ts` client and *the same* bucket. The instinct to over-segregate (two buckets, two clients, two libs) is loud. The senior call: one bucket per environment, prefixes carry the workload split, the byte-pipe choice (browser vs. worker) comes from where the bytes already are, not from the storage layer.

**Ideal teaching artifact.** A `TabbedContent` matrix laying the two workloads side by side across six axes: where the bytes start, who PUTs them, which prefix they land under, does a `file_metadata` row exist, what cleans them up, what expiry the GET runs on. Each cell is a short pinned line, not a paragraph. The matrix is the lesson — two columns proving the *mechanism* is one, the *consumer shape* is two. Archetype: **Decision** rendered as a structural-comparison matrix.

**Engagement.** A `Matching` round: ten descriptors ("Trigger.dev worker writes the bytes", "browser writes the bytes", "lifecycle rule deletes at day 7", "soft-delete with cleanup sweep", "`tenantDb` filters reads", "no metadata row exists") matched to the workload they belong to. The matching forces the student to internalize which discipline lives on which side.

**Components.**
- `TabbedContent` with two tabs (user uploads / exports) and a shared row scaffold below.
- `Matching` for the engagement round.

**Project link.** 13.4.6 is the entire concept in code form — the retrofit reuses `lib/r2.ts` and `getSignedGetForKey` without touching `file_metadata`. The matrix is the model 13.4.6 confirms.

---

## Concept 9 — Expiry as a trade-off, not a value

**Why it's hard.** Junior instinct sets `expiresIn: 86400` ("a day, just in case") and ships. The senior call: 5-min PUT, 10-min GET, with explicit reasoning — short enough that leaked URLs do not grant indefinite write/read, long enough that a slow 25 MB upload still completes and a fresh page render serves the link. The export's "email opened 30 minutes later returns 403" is the trade-off made visible.

**Ideal teaching artifact.** A short comparison panel — three rows (PUT expiry, GET expiry, export email GET) — each with the chosen value, the user behavior it accommodates, the attack window it accepts, the user behavior it breaks. The third column is the senior contribution; without it the table is just numbers. A single decision-tree-style diagram below: "what changes the right value?" — slow networks bump PUT up, public sharing bumps GET down, email-driven flows bump GET up but mandate "re-trigger" instead of "extend". Archetype: **Decision** as a trade-off matrix.

**Engagement.** A `MultipleChoice` with one twist: "A user complains they opened the export email 25 minutes after it arrived and got a dead link. Pick the senior response." Options exercise "bump expiry to 1h" (wrong), "store the URL and re-render", "add a 'resend export' button" (correct), "make it permanent". The right answer rebuilds the trade-off-not-value frame.

**Components.**
- `Figure` wrapping a three-row trade-off matrix as a small SVG table — single-use shape, hand-authored, no bespoke component needed.
- `MultipleChoice` for the recall.

**Project link.** 13.4.6's "10-min GET expiry trade-off" senior call lands on this matrix. The student who shipped it without thinking gets caught by the email-opened-late scenario.

---

## Concept 10 — XHR for upload progress (closing the 3.7 thread)

**Why it's hard.** The student last touched `XMLHttpRequest` in 3.7 as a deprecated curiosity. By Unit 13 they reach for `fetch` reflexively and lose the upload-progress event in the process. The narrow rule — XHR is still the right tool for upload progress in the browser today, and only there — needs to be stated bluntly with the failure mode named.

**Ideal teaching artifact.** A short side-by-side `CodeVariants`: the `fetch` version of the PUT (clean, modern, no progress event), the XHR version (verbose, ugly, fires `xhr.upload.onprogress`). A one-paragraph annotation names the reason — `fetch`'s `ReadableStream` upload support is still uneven across browsers in 2026 and does not expose progress to user code. Archetype: **Mechanics** as a wrong-then-right comparison, where "wrong" is "right for everything else but not this".

**Engagement.** A small `Tokens` exercise on the XHR code block: click the three lines that are doing the load-bearing work (`xhr.open`, `xhr.setRequestHeader('Content-Type', ...)`, `xhr.upload.onprogress`). The decoys are the `xhr.send(file)` and the response handler.

**Components.**
- `CodeVariants` for the fetch-vs-XHR comparison.
- `Tokens` for the engagement.

**Project link.** 13.4.4's `upload-form.tsx` is where this code lands. The student who skips the progress bar misses the byte-pipe verification in 13.4.7 — without progress, the asymmetry is invisible.

---

## Concept 11 — Validation at the action boundary as the structural gate

**Why it's hard.** Students conflate "Zod validates the payload" with "Zod is the security boundary". The senior frame: `authedAction('member', schema, fn)` is the gate; Zod is one layer inside it, the role check is another, the body's logic is the third. Each does one job. The student who hand-rolls a route handler with `if (!session) return 401` misses the `member`-vs-`admin` distinction and the `Result` shape's mapping of `'invalid-input'`.

**Ideal teaching artifact.** An `AnnotatedCode` walkthrough of the `presignedPut` action: step 1 highlights `authedAction('member', ...)` and names what it gates (auth + role + tenant scoping); step 2 highlights the Zod `strictObject` and names what it gates (schema + allowlist enums); step 3 highlights the body's pure logic (key construction, signing) and names what it does *not* defend against; step 4 highlights the `Result` return and names the mapping at the boundary. Archetype: **Pattern** rendered as a layered-defense walk — each step names what would slip through if that layer were removed.

**Engagement.** A `Buckets` round: nine concerns ("user is logged in", "user is in this org", "user is a member not a viewer", "content-type is in the allowlist", "claimed size ≤ 25 MB", "object key is server-built", "Result shape maps the error", "audit log fires") sorted into the three layers that handle them (`authedAction`, `Zod schema`, action body). Cross-layer ambiguities are the teaching moments.

**Components.**
- `AnnotatedCode` for the walkthrough.
- `Buckets` for the sort.

**Project link.** 13.4.3's "role is `member`, not `admin`" and 13.4.7's "payload validation" verify clause both land on this concept. The walkthrough is the model the student carries into 13.4.4's `finalizeUpload` without re-teaching.

---

## Component proposals

- **`PresignedExpiryDemo`** — two-pane clock-controlled demo of presigned URL expiry; pre-baked signed URL, configurable expiry, a `+11 min` time-travel button, and a paste-and-test field that returns 200 or 403.
  - Uses in this chapter: concept 5.
  - Forward-links: every later "credential / URL with a TTL" surface — Unit 21 (rotating R2 credentials, staged rollover), and any future webhook-signature or magic-link lesson where expiry-as-discipline shows up. Compounds.
  - Leanest v1: one pane (the `/files` row + countdown + paste field), single hardcoded expiry, a single `+11 min` button. No live `href` regeneration loop, no comparison code panel. The pasted-URL-is-dead beat is the load-bearing teaching moment; everything else is polish.

- **`LayeredDefenseTrace`** — scripted multi-layer trace showing what each layer of a defense pipeline saw and decided. Inputs: a list of layers (label + verdict function), a scenario payload (claimed vs. actual values). Output: a labeled per-layer table with the layer that finally caught the lie highlighted.
  - Uses in this chapter: concept 4 (HEAD-based size verification). Adaptable to concept 7 (CORS preflight chain) and concept 11 (auth → Zod → body), though each of those has a leaner existing-component fit.
  - Forward-links: any later "wrong-by-default request walks the defense stack" lesson — Unit 17 (security audit line items: CORS specificity, layered size defense, `deletedAt` reads), Unit 21 (credential rotation). Compounds modestly.
  - Leanest v1: three pinned rows (PUT response, HEAD output, finalize verdict), hardcoded for the size-mismatch scenario. No general layer-list API. If the component proves its weight, generalize later.

- **`KeyConstructionAmbush`** — client-vs-server key-construction sandbox with pre-loaded attack payloads. Inputs: list of attack payloads, two key-builder functions (untrusted-client, trusted-server). Output: visualized R2 listing colored by tenancy after each attack runs.
  - Uses in this chapter: concept 3.
  - Forward-links: any later "untrusted client input as identity" surface — webhook payload identity (12.3 lookback context, not new), notification dispatch keys, audit subject IDs. Possible reuse but not certain.
  - Leanest v1: a static three-row "attack outcome" table generated by clicking each of three pre-loaded attack buttons, with the right-panel `buildObjectKey` shown as the antidote in code. No live JS execution of the attacks — the outcomes are scripted. If single-use risk materializes, this collapses cleanly to a `CodeVariants` with prose annotations (the alternative listed under concept 3).

- **`CORSActorDiagram`** — three-actor (browser, bucket, attacker-`curl`) request flow with selectable origin and method. Inputs: bucket CORS JSON, request origin, method. Output: a labeled actor-by-actor verdict trace.
  - Uses in this chapter: concept 7.
  - Forward-links: none in the current TOC — CORS is taught once, here. Browser-vs-server enforcement attribution does not recur.
  - Leanest v1: `Figure` with a hand-SVG of the three actors and a `TabbedContent` switching between three pinned scenarios. The bespoke build is demoted under concept 7 for the single-use reason. Listed here for completeness — the `Figure`-wrapped alternative is the primary recommendation.

## Build priority

`PresignedExpiryDemo` is the headline build — it carries the chapter's load-bearing proof (the 11-minute death) that no existing component can deliver, and it forward-links cleanly to every TTL-discipline surface later in the curriculum. Build it well; the leanest v1 already gets most of the teaching weight.

`LayeredDefenseTrace` is the second priority — narrower fit in this chapter but the *shape* (a scripted walk through a defense pipeline) is the right reusable artifact for the security and credential-rotation lessons in Units 17 and 21. Start with the size-mismatch-only v1; promote to a general layer API only if Unit 17's needs confirm it.

`KeyConstructionAmbush` and `CORSActorDiagram` are demoted. The first reduces cleanly to `CodeVariants` plus prose if the bespoke build slips; the second has no forward-link and a hand-SVG `Figure` is the correct shape. If chapter budget is tight, ship neither and rely on the alternatives — concept clarity is not at risk.

## Open pedagogical questions

- Concept 5's clock-controlled demo assumes a widget-local mock R2 endpoint that honors expiry against widget time. If the mock layer is heavy to build, an alternative is to actually sign against a sandbox bucket with `expiresIn: 30` — real expiry, 30-second waits. The trade-off: real network vs. felt-time control. The widget-local mock keeps the teaching tight; flagging in case the build cost says otherwise.
- Concept 3's `KeyConstructionAmbush` benefits from the student actually firing the attack request (the visceral "this succeeded?" beat). If only a scripted outcome is feasible, the engagement loses bite and the `CodeVariants` alternative may be the honest call. Decision can wait until the v1 prototype.
