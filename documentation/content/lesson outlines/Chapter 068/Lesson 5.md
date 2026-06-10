# Lesson 5 — Wiring R2 into our app — two workloads, one mechanism

- **Title:** Wiring R2 into our app — two workloads, one mechanism
- **Sidebar label:** Wiring R2 into the app

---

## Lesson framing

This is the **bridge / synthesis lesson** that closes chapter 068. The four prior lessons each taught one primitive in isolation (threshold, bucket+CORS, presigned mechanics, `file_metadata` row). This lesson does no new SDK teaching — its job is to **assemble those primitives into a map of where R2 plugs into the course's actual app**, and just as importantly, where it deliberately does not. Estimated 25-30 min; keep it short and decision-dense.

**The one load-bearing idea:** *two workloads, one mechanism.* The same `lib/r2.ts` client and the same `org/${orgId}/...` keying serve two structurally different consumers:

1. **User uploads** (ch069 project) — browser-side presigned PUT, a `file_metadata` row per file, presigned GET per render, soft-delete lifecycle.
2. **Generated-asset retrofit** (the ch067 CSV export) — server-side PUT from a Trigger.dev worker, **no** metadata row, lifecycle-rule cleanup.

The pedagogical payload is the **contrast**: why one workload earns a metadata row and soft-delete while the other doesn't. If the student internalizes the decision rule — *long-lived user-managed files get a row; short-lived single-consumer generated outputs don't* — the ch069 project lands without a "wait, why are these two different?" stall. That rule is the senior judgment this lesson sells.

**Two senior mental-model corrections this lesson must make explicit:**

- The "function is never a byte pipe" rule (drilled in lessons 1 and 3) is about **user-facing request handlers**, not an absolute ban on the server touching bytes. The export worker *does* stream the CSV bytes through itself — and that's correct, because it's a background Trigger.dev run with no user waiting on an HTTP response and no per-request bandwidth bill. The student must leave understanding *why the rule doesn't apply here*, or they'll either wrongly "fix" the export to presign or wrongly route user uploads through the function.
- A metadata row is a **cost with a purpose** (queryability, ownership, lifecycle, audit), not a reflex. Generated outputs with exactly one consumer (the email recipient, inside a 10-minute window) don't pay that cost — a lifecycle rule reclaims them.

**Framing stance** (per pedagogical guidelines): decisions over syntax. Lead each section with the senior question. Code excerpts are *illustrative anchors* for already-taught APIs, not new teaching — keep them short. The centerpiece is a **side-by-side comparison** (the two workloads) and a **decision aid** (metadata row: yes/no). This is the chapter's "zoom out and see the whole board" moment before the ch069 build.

**Tone check:** this lesson must resist re-teaching. Lessons 2-4 already taught the client, CORS, presigning, and the row. Reference those by name and link, then spend the budget on placement and the contrast.

---

## Lesson sections

### Introduction (no header)

Open with the senior question: *the student now has the threshold, the bucket, the presigned mechanics, and the metadata row — four primitives, each learned alone. Where in the course's app do they actually get wired, and where would a senior deliberately leave R2 out?*

Frame the lesson as the zoom-out: the next chapter (069) is a build; this lesson is the architecture sketch that build follows. State the one idea up front — **two workloads share one mechanism, but only one of them needs a metadata row** — so the student reads the rest looking for *why*.

Keep it to ~4-5 sentences. Connect back: the ch067 CSV export ended on a `console.log` placeholder for `downloadUrl`; this lesson is where that placeholder finally gets a real R2 home. That dangling thread is the concrete motivation — reference it early.

No code here.

---

### Two workloads, one mechanism

The core section. Establish the two consumers and the single shared mechanism, then drive the contrast.

**Content:**

- Name the shared mechanism first: both workloads import the same `lib/r2.ts` `S3Client`, both key objects under `org/${organizationId}/...`, both live in the same R2 bucket. "One mechanism" is literal — one client module, one bucket, one tenancy convention.
- Then the divergence. Lay out the two workloads as a **side-by-side table** (best vehicle — the whole lesson is a comparison):

| Dimension | User uploads (ch069) | Export output (ch067 retrofit) |
| --- | --- | --- |
| Who initiates the PUT | The **browser**, via presigned PUT | The **Trigger.dev worker**, server-side PUT |
| Does the function/worker touch bytes | No — bytes go browser→R2 | Yes — worker holds the CSV buffer |
| `file_metadata` row | Yes — one per file | No |
| Key prefix | `org/${orgId}/files/${id}.${ext}` | `org/${orgId}/exports/${runId}.csv` |
| How the consumer reads it | Presigned GET per render | Presigned GET in the email, clicked once |
| Lifetime / cleanup | Long-lived; soft-delete + cooled-off sweep | Short-lived; R2 lifecycle rule (e.g. 7 days) |
| Number of consumers | Many (gallery views, downloads) | One (the email recipient) |

- After the table, narrate the *why* behind the two rows that surprise students:
  - **Why the export worker is allowed to be a byte pipe.** Restate the "function is never a byte pipe" rule and then carve the exception precisely: the rule protects **user-facing request handlers** — the per-request CPU-seconds and bandwidth bill, and the function timeout. A background Trigger.dev run has none of those constraints (no user awaiting an HTTP response; the worker already assembled the full CSV in memory from the ch067 page loop). Presigning a PUT *back to the same worker* would be pure ceremony. Server-side PUT is the correct, simpler shape here. This is the most important paragraph in the lesson — the student must end able to state the boundary, not just the rule.
  - **Why the export skips the metadata row.** A `file_metadata` row buys queryability, ownership, lifecycle, and audit. The export output has exactly one consumer (the email recipient) inside a ~10-minute click window, is never listed in a gallery, is never user-managed, and is reclaimed by a prefix lifecycle rule. A row would be write-only noise that grows unbounded. The decision rule, stated plainly: **long-lived, user-managed, multi-consumer files earn a row; short-lived, single-consumer generated outputs don't.**

**Components:**

- The comparison is a plain **Markdown table** (it's tabular data, not a diagram). Optionally promote to a `TabbedContent` with two tabs ("User upload" / "Export output") each showing the flow as a short `ArrowDiagram` — but the table is the primary artifact; only add the tabbed diagrams if the writer judges the flows need visual reinforcement. Default to the table to respect the 25-30 min budget.
- If a flow diagram is added: a single `ArrowDiagram` inside `<Figure>` is enough — see the dedicated diagram section below. Do not over-build.

**Exercise** — this section is where understanding must be checked, because the whole lesson rides on the contrast. Use a **`Buckets`** drill (`twoCol`): the student sorts characteristics/decisions into "Gets a `file_metadata` row" vs "No metadata row (lifecycle cleanup)". Items (mix of the two workloads and a couple of forward-looking cases to force the rule, not memorization):
- "User-uploaded contract PDF" → row
- "Org logo a member uploads" → row
- "CSV export emailed to one recipient" → no row
- "Generated OG image regenerated on every deploy" → no row (forward case; tests the rule)
- "Avatar a user manages from settings" → row
- "Nightly report PDF emailed once, then irrelevant" → no row

This is the right exercise type: it's a classification judgment, exactly what the lesson teaches, and `Buckets` grades it cleanly. Keep instructions tied to the decision rule.

---

### The export retrofit: a real downloadUrl at last

Resolve the ch067 dangling thread concretely. This is the payoff the introduction promised.

**Content:**

- Recap the ch067 end-state in one sentence: the `exportInvoices` task looped pages, accumulated CSV rows, and left `downloadUrl` as a `console.log` placeholder in the email step.
- Show the **one structural change**: after the page loop, the accumulated CSV string becomes a `Buffer`, and the parent task does a single server-side `PutObjectCommand` to `org/${organizationId}/exports/${ctx.run.id}.csv` with `ContentType: 'text/csv'`. Then the email step's payload gains `downloadUrl` from a presigned GET (`expiresIn: 600`) against that key. The email template (the React Email one from Unit 8) renders the link; the user clicks within the window.
- Make the **transaction-discipline** note explicit (this is a code-convention touchpoint): the R2 PUT is an external call — it lives **outside** any DB transaction, same rule as email/Stripe sends. Here it's inside a Trigger.dev step, which is the right boundary.
- Reinforce the **no-metadata-row** decision from the prior section in context: nothing is inserted into `file_metadata`; a prefix-scoped lifecycle rule on the exports path (the surface named in lesson 2) reclaims old exports after ~7 days. State this rule once. *(Accuracy note for the writer: R2 lifecycle rules filter on a literal key prefix + expiration-in-days, configured via the dashboard or `PutBucketLifecycleConfiguration`. Phrase the example as "a lifecycle rule on the `org/.../exports/` prefix" — R2 prefix matching is not glob, so avoid writing `org/*/exports/*` as if it were a wildcard pattern. Since the tenant id varies per org, the rule scopes by the `exports/` segment of the keying convention, not a single literal org path.)*

**Components:**

- **`CodeVariants`** with two tabs — "Before (ch067)" showing the placeholder `downloadUrl: 'console.log placeholder'` line, and "After" showing the `PutObjectCommand` + `presignedGet` wiring. This before/after is exactly what `CodeVariants` is for, and it makes the "one step grows" claim visceral. Keep each tab to the ~6-12 relevant lines of the task body — not the whole ch067 task. Add a per-tab explanation noting the worker-touches-bytes point and the no-row decision.
- Code shape (illustrative, the APIs were taught in lessons 2-3): `await r2.send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key, Body: buffer, ContentType: 'text/csv' }))` then `const downloadUrl = await presignedGet({ objectKey: key, expiresIn: 600 })`. Reference the helper from lesson 3's named layout; do not re-derive `getSignedUrl`.

**Scope guard for the writer:** this section *names and sketches* the retrofit — it does **not** ship the full ch067 task file or the working project. The actual end-to-end code is ch069's lesson 5 ("Real downloadUrl for the export"). Keep excerpts to the delta.

---

### The lib surface and env you'll carry into the project

Pre-load the file layout and env shape so the ch069 project starts with a known map. This is forward-loading, not teaching — keep it as a labeled inventory.

**Content:**

- **The lib surface** — present as a `FileTree` so the student sees the shape at a glance. Align to the continuity-established layout (lessons 2-4):
  - `lib/r2.ts` — the configured `S3Client` singleton (built in lesson 2; `import 'server-only'`, `region: 'auto'`, derived endpoint). The only place the client is constructed.
  - `lib/files/presigned-put.ts` — `presignedPut(...)` (lesson 3 signature).
  - `lib/files/presigned-get.ts` — `presignedGet({ objectKey, expiresIn }) → { url }`.
  - `lib/files/finalize.ts` — the post-upload HEAD-and-insert (lesson 3/4; full body is ch069).
  - `db/queries/file-metadata.ts` — tenant-scoped reads `getFile(orgId, id)` / `getFileDownloadUrl(orgId, id)` (lesson 4; reads live in `db/queries/`, **not** `lib/files/` — this is the convention, correct the chapter-outline brainstorm which said `lib/files/file-metadata.ts`).
  - State the principle once: `lib/r2.ts` exports only the client; the helpers **compose** the SDK, they don't wrap it behind a generic interface (Architectural Principle #5). Reference, don't re-argue.
- **The env surface** — the four server-only vars carried from lesson 2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. No `NEXT_PUBLIC_` prefix. The endpoint is **derived** in `lib/r2.ts` from the account id, not a fifth var. `NEXT_PUBLIC_APP_URL` (already in env) is reused for the bucket's CORS `AllowedOrigins` — no new var. This forecasts the ch069 `.env.example`.

**Components:**

- `FileTree` for the lib/db layout (the canonical tool for directory listings).
- A short `Code` block or inline list for the env vars; no need for AnnotatedCode here — it's an inventory, not a walkthrough.

**Scope guard:** name the files and signatures; do **not** write their bodies. Lessons 2-4 hold the parts already built; ch069 builds the rest. This section is a packing list.

---

### Production deploy and cost, in operational terms

Close on the operational reality a senior checks before shipping either workload. Short — this is the "don't get surprised in prod" section.

**Content:**

- **CORS is environment-specific and must precede the first prod upload.** Dev bucket: `AllowedOrigins: ['http://localhost:3000']`; prod bucket: `AllowedOrigins: ['https://app.example.com']`. Restate the rule from lesson 2 — never `*` in production. The deploy-order trap: configure CORS on the **prod** bucket *before* the first production user upload, or the PUT fails CORS preflight in production while it worked in dev. One sentence, high value.
- **No new CI step.** R2 credentials are env vars; bucket + CORS + lifecycle are one-time setup. The only deploy nuance worth naming: rotating R2 credentials needs the staged-rollover discipline (forward-ref Unit 20) — a hard swap drops in-flight reads. Don't teach rotation here; name it as a future concern.
- **Cost in operational terms** (the senior reach, stated plainly, no pricing tables — lesson 1 owns the economics):
  - Export job: one PUT per export, one GET per email click — pennies per thousand exports. Negligible.
  - User-upload gallery: one PUT per file (rare), one GET per render — **Class B reads dominate** for a heavily-browsed gallery. The senior rule: **mint the presigned GET once per page render and reuse it for that render's lifetime; do not re-issue on every component re-render.** State this rule once — it's the one cost mistake a junior makes with presigned GETs (it also dovetails with lesson 3's "fresh per render, not per re-render" and lesson 4's no-`url`-column rule). This is the most actionable cost guidance in the lesson.
- **The off-ramp, restated in one line:** R2 is a managed service, but the S3-compatible API is the structural off-ramp — four env vars and the endpoint move the same code to S3, Backblaze B2, or MinIO. Lesson 1 argued this; restate as a closing reassurance, don't re-derive.

**Components:** prose only. Maybe one `Aside` (caution) for the "configure prod CORS before first upload" trap — it's a deploy footgun worth setting apart. Keep the section tight.

**Forward note** (end of section or a short closing line, not its own header): preview ch069 in one sentence — it ships the user-upload path end-to-end (presigned-PUT action, browser direct PUT, `file_metadata` migration + `finalizeUpload`, the `Files` list with fresh GETs, and this export retrofit as working code). Sets the expectation that the next chapter is hands-on.

---

## Diagram (optional, inside "Two workloads, one mechanism")

If the writer judges the table needs visual reinforcement, add **one** figure — the two flows side by side. Recommended shape: a `TabbedContent` with two `TabbedItem`s, each an `ArrowDiagram` inside the tab.

- **Tab "User upload"** — boxes: `Browser` → (presigned PUT) → `R2 (files/ prefix)`; separately `Browser` → (small JSON) → `Server Action` → `file_metadata row`. Pedagogical goal: show the bytes bypass the function while the metadata round-trips through it. Color the byte path one color, the metadata path another.
- **Tab "Export output"** — boxes: `Trigger.dev worker` → (server-side PUT, bytes) → `R2 (exports/ prefix)` → (presigned GET) → `Email link`. Pedagogical goal: show the worker *is* in the byte path and there's no `file_metadata` box at all — visually reinforcing the two asymmetries the section narrates.

Keep diagrams flat and horizontal (vertical-space constraint). The `ArrowDiagram` byte-path color-coding is the payload: one glance should show "bytes touch the worker here, but not the function there." Do **not** build a single combined diagram cramming both flows — the contrast reads better as two tabs. This is genuinely optional; the table carries the lesson if the budget is tight.

---

## Terms (Tooltip candidates)

Be sparing — most terms are already defined in lessons 1-4 and this is a synthesis lesson. Only add a `Term` where a concept is load-bearing *here* and the student may not hold it fresh:

- **`Class B operations`** — R2's read/HEAD request tier (vs Class A writes); the cost driver for read-heavy galleries. Load-bearing in the cost section.
- **`lifecycle rule`** — prefix-scoped auto-deletion of objects older than N days; the export-cleanup mechanism. Named in lesson 2, re-surface briefly here since it carries the "no metadata row" half of the contrast.
- **`presigned GET` / `presigned PUT`** — do **not** re-`Term` these; lesson 3 owns them. Link to lesson 3 instead if a refresher is needed.

Skip Terms for `object key`, `CORS`, `egress`, `S3-compatible API` — all defined upstream; link rather than redefine.

---

## Scope

**This lesson does NOT cover (defer / out of scope):**

- **Any working project code.** No full `exportInvoices` task file, no upload UI, no `finalizeUpload` body, no `Files` gallery. All of that is **chapter 069**. This lesson sketches deltas and inventories signatures only.
- **Re-teaching the four primitives.** The threshold (lesson 1), bucket/CORS/scoped-token/client setup (lesson 2), presigned PUT/GET/HEAD mechanics and the layered size defense (lesson 3), and the full `file_metadata` schema + soft-delete + orphan modes (lesson 4) are **prerequisites** — reference and link, do not re-derive. Quick one-line refreshers are fine; full re-explanation is not.
- **Background orphan-byte / orphan-row sweeps.** Named in lessons 3-4 as the safety net; not built here, not built in 068 at all (forward note to ch069 or beyond).
- **Multipart upload for files >100 MB.** Named once for recognition upstream; not built.
- **Cloudflare Images / transformation / resizing.** Separate product; out of scope for the whole chapter.
- **Credential rotation mechanics.** Named as a future concern (Unit 20 owns the deploy/rotation story); do not teach the staged rollover here.
- **Public-bucket mode and Cloudflare Workers in front of R2.** Out of scope; the course is private-bucket + presigned everywhere.

**Prerequisites to redefine concisely (one line each, then move on):**

- *Function is never a byte pipe* (lessons 1, 3) — needed because this lesson carves its exception. Restate, then carve.
- *`org/${orgId}/...` object-key tenancy* (lessons 2, 4) — needed because both prefixes (`files/`, `exports/`) follow it.
- *ch067 CSV export end-state* (`console.log` placeholder `downloadUrl`, Trigger.dev `exportInvoices` task) — needed as the retrofit target. One-sentence recap.
- *`tenantDb(orgId)` scoping and `lib/r2.ts` singleton* — referenced in the lib-surface inventory; assume from lessons 2/4.
