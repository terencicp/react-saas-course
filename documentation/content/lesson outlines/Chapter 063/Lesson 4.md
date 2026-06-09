# Lesson 4 — One pattern, four surfaces

- **Title (h1):** One pattern, four surfaces
- **Sidebar label:** One pattern, four surfaces

---

## Lesson framing

This is the **generalization lesson** of the chapter. Lessons 1–3 built the webhook handler concretely; this lesson lifts the one structural move underneath it — *a unique-on-key DB constraint plus an atomic insert in the same transaction as the work* — and shows it is the **single idempotency discipline** that protects four different "could happen twice" surfaces: webhooks, Server Actions, retried background jobs, and public route handlers. The student arrives already owning the webhook instance (`processed_events`, `ON CONFLICT DO NOTHING RETURNING`, the outer transaction). The job here is **recognition, not new machinery**: same shape, the only thing that changes is *where the key comes from* and *what triggers the replay*.

Pedagogical spine, in order of importance:

1. **The pattern stated once, then pattern-matched four times.** This is the whole lesson. Do not teach four independent techniques — teach one, then run it across four columns. The payoff mental model the student leaves with: "idempotency is a key + a unique constraint + atomic claim-and-work; pick the key that names *the attempt*." Everything else is detail.
2. **Where the key comes from is the only real variable.** The recurring beginner mistake is generating the dedup key *server-side per request* — which mints a fresh key every time and defeats the point. Hammer the rule: the key is generated at **the source that owns the definition of "this attempt"** (the sender, the form render, the job run, the client) and re-sent on replay. This is the single highest-value insight in the lesson; frame it as the discriminator that separates working idempotency from a no-op.
3. **Scoping the key by tenant/owner is structural, not cosmetic.** Two different clients can pick the same key string; the constraint must be composite (`(provider, eventId)`, `(clientId, idempotencyKey)`, `(orgId, …)`) or keys collide across customers. Tie this back to the composite-key reasoning from L2.
4. **Idempotency caches the *response*, not the *state*.** This is the non-obvious bit of the route-handler surface and the one place the four surfaces genuinely differ in behavior: a public POST replay returns the *byte-identical prior response* even if the underlying state has since moved on. Webhooks/jobs/actions short-circuit-and-return-success; the public API additionally *stores and replays the response body*. Make that distinction explicit.
5. **The 90% test — reach for the smallest version.** Not every write needs an explicit `idempotencyKey` column. When a natural domain unique already exists (`(orgId, slug)`, `email`), it already does the dedup job for free. An explicit key column is overhead the row pays forever. Senior judgment: add the column when there's no natural key and the operation "would be bad to do twice"; otherwise lean on the natural constraint. This keeps the lesson from reading as "bolt an idempotency table onto everything."
6. **Orthogonality to signatures/auth.** Signatures and auth answer *"who is this from"*; idempotency keys answer *"is this the same attempt as before."* A webhook has both (signature + `event.id`); a public route has both (auth + header). Name the two axes so the student doesn't conflate them.

Tone: senior, terse, recognition-driven. This lesson is short (45–55 min) and should feel like a *click* — the moment four things the student half-knew snap into one shape. Lead every surface section by pointing back at the webhook instance the student already owns.

The centerpiece visual is a **four-column "one pattern, four surfaces" comparison** (the chapter-outline's explicit ask). It is the anchor the whole lesson hangs on — introduce a skeletal version early, then fill columns as each surface is taught, and present the complete grid at the end as the takeaway.

Code strategy: this lesson's code is route handlers, Server Actions, and SQL/Drizzle — **none of it runs in `ReactCoding`** (server/Node surface, no DOM). Use `Code`/`AnnotatedCode`/`CodeVariants` for exposition. The one *runnable* exercise that fits the in-browser harness is a **`DrizzleCoding`** drill on the atomic-claim-and-cache shape (PGlite). Everything else is reinforced with non-coding exercises (`Buckets`, `Matching`, `MultipleChoice`) which is the right call given the [ReactCoding-is-react-only] and [Sandpack-network] constraints — prefer guided non-coding interactives over a flaky Node sandbox.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely. The student just hardened a webhook against duplicate delivery. Now widen the lens: a Server Action fired twice by a double-click; a background job the runtime retries after a timeout; a public API POST a flaky client replays. **Four surfaces, one fear: the operation runs twice and money moves twice / two rows appear / two emails send.** Pose the question the lesson answers: *is this four separate problems, or one?* Promise the answer up front — it's one pattern, and the student already wrote it once. Connect explicitly to L2 (`processed_events` + atomic claim) and to the Chapter 043 L5 debt (the form already ships a `crypto.randomUUID()` hidden input waiting for an action body — this lesson writes that body). Keep it to ~2 short paragraphs.

Reasoning: the pedagogical guidelines want the senior question implicit in the intro and a connection to prior knowledge. The strongest hook here is "you already built this once; now see it's universal."

### The pattern, stated once

The crux section. State the discipline as a **single reusable recipe**, abstracted from webhooks:

> For any operation where *exactly once* matters: (1) choose a **key that identifies this attempt**, (2) store it under a **unique constraint**, (3) do the work in the **same transaction** as the insert. On replay, the conflict (`ON CONFLICT DO NOTHING` returns zero rows, or a caught unique violation) tells you the work already happened — short-circuit and return success (or the cached prior response).

Present this as three numbered moves with `Steps`. Then immediately map it onto the webhook the student already owns, so the abstraction lands on familiar ground: key = `event.id`, table = `processed_events`, constraint = `(provider, eventId)`, work + claim = one `db.transaction`. Use a small `AnnotatedCode` over the L2 claim-and-transact skeleton (reproduced, not re-derived) with steps highlighting (a) the key, (b) the unique target, (c) the shared transaction boundary — labeling each with its abstract role. This is the "simplified model first" move: the student sees the abstract recipe expressed in the concrete code they already wrote.

Name the two-axis framing here in one line (provenance vs. attempt-identity) and forward-ref the dedicated orthogonality section.

Terms to gloss with `<Term>`: **idempotent** ("an operation you can apply many times with the same end effect as applying it once"), **at-least-once delivery** (restate from L2 in one line, since it's the *reason* the pattern exists — "the transport may deliver the same message more than once; the receiver must tolerate it").

### Where the key comes from is the only thing that changes

The hinge section — the single highest-value idea. Establish that **the recipe is fixed; the only variable across surfaces is the source of the key and what triggers the replay.** Introduce the comparison artifact in skeletal form here:

**Four-column comparison table/diagram** (the chapter-outline centerpiece). Use a **`<Figure>` wrapping an HTML+CSS four-column grid** (per the diagrams guide: a "color-coded segments / compare" shape is HTML+CSS, not a graph engine; four parallel columns read better as a styled grid than a Mermaid graph, and stays within the horizontal-layout / height cap). Columns: **Webhook · Server Action · Background job · Public route**. Rows: *Who owns the attempt* / *Where the key is generated* / *The key* / *What triggers a replay* / *The constraint (scoping)* / *On replay*. At this point fill only the first three rows for all four columns (key source is the lesson's through-line); the remaining rows fill in as each surface section completes, and the full grid reprises at the end. (Author the grid once; the "filled" final version lives in the closing section — here, show the key-source rows as the focus.)

Pedagogical goal of the diagram: make "one pattern, four surfaces" *literally visible* as a single shape with one varying input. Caption: "Same three moves every column. Only the key's origin and the replay trigger change."

Drive the rule home: **never mint the key server-side per request.** Show the canonical bug as a `CodeVariants` before/after — "Broken: server generates a UUID inside the handler on every call (every attempt is a fresh key, the constraint never fires)" vs. "Correct: the key arrives from the source that defines the attempt." Wrong-then-right per the pedagogical convention. This is the section students will remember; spend the words here.

### Server Actions — the form-supplied key

Close the Chapter 043 L5 thread. The form already renders a stable `crypto.randomUUID()` hidden input (generated **once per form render** in the Client Component, preserved across pending/re-submit by React 19 form state). This lesson writes the **action-body half**: read the key from `formData`, insert it under a unique constraint in the same transaction as the create, conflict ⇒ the create already happened ⇒ return success (idempotently).

Code: an `AnnotatedCode` over the action body within the course's five-seam shape (`parse → authorize → mutate → revalidate → return`), highlighting where the key is read and where the claim+work transaction sits. Keep the action minimal and aligned to conventions (`'use server'` file, `safeParse` first, `db.transaction`, `Result` return, `revalidatePath`/`updateTag` after the write and before return). Show the key as a dedicated `idempotencyKey` column with a unique constraint scoped by `orgId`/`userId` — i.e. `unique(orgId, idempotencyKey)` — not as the row PK, so the natural PK (UUIDv7) stays independent. Note this is the *deliberate* shape; mention the PK-as-key alternative in one line and why the course prefers a separate scoped column (decouples dedup identity from row identity, lets the same table participate in other constraints).

Sub-point — **why client-supplied beats server-generated**, restated in this concrete setting: a server-generated key per invocation is a fresh key every submit; the whole point is *stability across the submit and its retry*. The Client Component mints it once per render; React 19's form/action state carries it through the pending transition and a resubmit. This is the same rule as the hinge section, now grounded.

Fill the Server-Action column's remaining rows in the comparison (conceptually; the grid is authored in the closing section).

`<Term>` candidate: **TOCTOU** only if not already assumed — but L2 introduced it, so reference by name, don't redefine (continuity note: L2 owns TOCTOU). Skip redefining.

### Retried background jobs — the stable run ID

Foreshadow Chapter 066 lightly — **same pattern, key = the job run ID.** The job runtime (Trigger.dev) assigns every *retry* of a run the **same `runId`**; the job body inserts its results keyed by that ID, so a retry conflicts cleanly. Frame it as the cleanest instance: the student writes *no* key-generation code at all — the runtime is the source that owns the attempt.

Keep this short (the mechanics belong to Chapter 066). One small `Code` block sketching the shape — `insert(jobResults).values({ runId, … }).onConflictDoNothing()` inside the task — and a one-line tie to the conventions' job idempotency-key naming (`webhook:${event.id}:${step}`, `${ctx.run.id}:${step}` — the run ID *is* the namespace). Point forward, don't drill. Fill the Background-job column rows conceptually.

Reasoning for brevity: this surface is the least code-bearing in this chapter and is owned downstream; its value here is purely as the third data point that proves "one pattern."

### Public route handlers — the Idempotency-Key header

The richest surface and the one genuinely-different behavior. A public POST endpoint (e.g. `/api/invoices` consumed by external integrations) accepts an **`Idempotency-Key` HTTP header** (the widely-adopted IETF draft; Stripe and others implement it). The client generates the key (`crypto.randomUUID()` is fine; any opaque re-sendable string works) and re-sends it on retry.

The pivotal teaching point: **this surface caches the response, not just a claim.** Store `(clientId, idempotencyKey, status, responseBody, createdAt)` keyed unique on `(clientId, idempotencyKey)`. First call: claim, do the work, **persist the status + body**, return it. Replay with the same key: read the stored row, **return the byte-identical prior response** — even if the underlying state has since changed. Senior anchor: *idempotency caches the response because the response is the contract the client trusts.* Contrast explicitly with the other three surfaces, which only short-circuit to "already done, success" without replaying a stored body.

Code: an `AnnotatedCode` over the route-handler shape, same dedup-and-transact skeleton from L2 with a response-cache attached. Steps: read header (400 if required-but-missing), open transaction, `insert … on conflict do nothing returning *`, branch — claimed ⇒ do work, write status+body back onto the row, return; not-claimed ⇒ read the row, return the cached status+body. Mark it as pseudo-real (the worked production version with the `authedRoute` wrapper is Unit 10+); keep the error body as RFC 9457 problem+json (restate one line, owned by Chapter 046).

Two policy sub-points, taught inline (not bundled as "watch-outs"):

- **What endpoints require it.** Not every POST. Keys earn their weight on operations with external side effects (payments, sends, creates) and are pointless on naturally-idempotent verbs (PUT replacing a value, DELETE). Rule: require it on writes that "would be bad to do twice," and **document the requirement in the API contract**; a missing-but-required header is a `400`, not a silent success (silently succeeding lets a non-idempotent client double-charge). Accepting the header but ignoring it makes the contract a lie — implement or remove.
- **Cache horizon.** Bounded, not forever. **24 hours** is the common contract; document it, and apply the same retention sweep + redaction discipline as `processed_events` (storing response bodies means storing user-visible data — same retention, same PII rules — restate, owned by L2/Chapter 092).

`<Term>` candidates: **Idempotency-Key** (the header name; "an opaque client-chosen token that lets the server recognize a retried request as the same attempt"), **IETF draft / RFC** if used (gloss "an internet standards proposal; widely implemented before final ratification" — keep optional, only if the acronym appears).

This is also where the **`DrizzleCoding` exercise** lands (see below) — the response-cache claim is the most concrete, most testable instance.

### Signatures prove provenance; keys prove sameness

Short, sharp orthogonality section (chapter-outline asks for it explicitly). Two independent axes:

- **Provenance** — *who is this from?* Answered by the webhook **signature** (L1) or by **auth** on a public route.
- **Attempt identity** — *is this the same attempt as before?* Answered by the **idempotency key**.

A real webhook has **both**: the signature proves it's Stripe, the `event.id` is the idempotency key. A public route has **both**: auth proves the client's identity, the header is the key. They compose; neither substitutes for the other.

Best vehicle: a tiny **2×2 or two-row `Matching`/`Buckets`** is tempting, but a compact `<Figure>` with two labeled axes + the "a webhook has both" example reads cleaner. Use a small HTML+CSS two-row strip (axis → question → mechanism). Pedagogical goal: prevent the common conflation "the signature already makes it safe, so I don't need dedup" (and its inverse). Pair with a single `TrueFalse` or `MultipleChoice` checking "a valid signature guarantees the event is processed at most once" (false — provenance ≠ dedup).

### Pick the smallest version that works

The senior-judgment closer before the recap — the **90% test**. An explicit `idempotencyKey` column is overhead the row carries forever; don't add it reflexively. When a **natural domain unique** already exists — `(orgId, slug)`, `email`, `(orgId, name)` — it *already* enforces "this can't happen twice" for free, and a double-submit conflicts on the natural key with no extra column. Decision rule:

- Natural unique exists and matches the operation's identity ⇒ **use it**, no key column.
- No natural unique, and the operation "would be bad to do twice" ⇒ **add the scoped `idempotencyKey` column**.
- Naturally idempotent operation (PUT/DELETE, set-a-value) ⇒ **nothing needed**.

Exercise: a **`Buckets`** drill — sort operations into "natural unique already covers it" / "needs an explicit idempotency key" / "naturally idempotent, needs neither." Items e.g.: *create org with unique slug* (natural), *charge a card* (explicit key), *send password-reset email* (explicit key), *set user's display name* (naturally idempotent), *create invoice from external API* (explicit/header), *accept invitation by token* (natural — token is the key). This cements the judgment, which is the part beginners most often over-apply.

Reasoning: the guidelines stress "defaults before conditionals" and avoiding bootcamp over-engineering. Without this section the lesson reads as "always add a dedup table," which is wrong and un-senior.

### One pattern, four surfaces — the full grid

Recap section built around the **completed four-column comparison** (the same `<Figure>` grid, now with every row filled). Present it as the single takeaway image. Rows fully populated:

| | Webhook | Server Action | Background job | Public route |
|---|---|---|---|---|
| Who owns the attempt | the sender (Stripe) | the form render | the job runtime | the calling client |
| Where the key is generated | provider | Client Component, once/render | runtime, per run | client, per request |
| The key | `event.id` | form UUID hidden input | `runId` | `Idempotency-Key` header |
| Replay trigger | retry / out-of-order redelivery | double-click / browser retry | runtime retry after failure | client retry on timeout |
| Constraint (scoped) | `(provider, eventId)` | `(orgId, idempotencyKey)` | `(runId)` | `(clientId, idempotencyKey)` |
| On replay | claim conflicts → 200 | conflict → return success | conflict → no-op | return **cached response** |

Close with the one-sentence mental model the student leaves with: *idempotency is a key + a unique constraint + atomic claim-and-work; choose the key that names the attempt, scope it to its owner, and let the database — not application code — enforce "once."* Optional final reinforcement: a `Matching` drill linking each surface to its key source (quick recall check).

### External resources (optional)

`CardGrid` of `ExternalResource` cards, 2–3 max:
- IETF "The Idempotency-Key HTTP Header Field" draft (idempotency-key header spec).
- Stripe docs — idempotent requests (canonical real-world implementation of the header + 24h horizon).
- Optionally Drizzle `onConflictDoNothing` / `.returning()` reference.

No YouTube video proposed — this is an abstract systems-design recognition lesson with no strong screencast fit; a talking-head would dilute the "click." Skip it.

---

## Exercises summary

- **`DrizzleCoding`** (in *Public route handlers* section) — the one runnable drill. Schema: an `idempotencyKeys` table with `clientId`, `idempotencyKey`, `status`, `responseBody`, `createdAt` and a composite unique on `(clientId, idempotencyKey)`; seed one already-claimed row. Task: write the Drizzle `insert(...).onConflictDoNothing({ target: [..] }).returning()` and have the student return the result demonstrating the **lost claim** (zero rows ⇒ replay path). `expectedRows={[]}` to show the conflict short-circuit, mirroring L2's lost-claim convention. Per [Phase-B PGlite limits] (continuity from L2/L3): explicit SQL column names on every column, table-level unique constraint, no `casing`, no `uuidv7()` — keep keys as plain text and IDs as integers/`bigint generatedAlwaysAsIdentity` only if the harness allows; prefer plain `integer` PK in the sandbox. Goal: feel the atomic claim fire on a duplicate.
- **`CodeVariants`** (in *Where the key comes from*) — broken (server-minted per-request key) vs. correct (source-supplied key). Conceptual, not graded.
- **`Buckets`** (in *Pick the smallest version*) — three-bucket judgment drill (natural unique / explicit key / naturally idempotent).
- **`TrueFalse` or `MultipleChoice`** (in *Signatures prove provenance*) — provenance ≠ dedup check.
- **`Matching`** (closing) — optional surface→key-source recall.

Use `Buckets` and `Matching` (not a sandbox) deliberately: the lesson's hard part is *judgment and recognition*, which non-coding interactives test better than a Node sandbox the harness can't run reliably.

---

## Scope

**Prerequisites (restate in one line each, do not re-teach):**
- Webhook dedup mechanics — `processed_events(provider, eventId)`, `ON CONFLICT DO NOTHING RETURNING`, the outer `db.transaction`, lost-claim ⇒ 200 (L2). This lesson *abstracts* it; it does not re-derive it.
- Out-of-order / `last_event_at` (L3) — orthogonal to idempotency; mention only to contrast "dedup protects against the same event twice; ordering protects against different events out of order" if needed.
- Signature verification (L1) — referenced in the orthogonality section as the provenance axis.
- The five-seam Server Action shape, `safeParse`-first, `db.transaction`, `Result`, `revalidatePath` (Chapter 043) — used as the frame for the action example, not taught.
- RFC 9457 problem+json error body (Chapter 046) — one-line restate for the route-handler 400.
- TOCTOU, atomic claim, constraint-first reflex (L2 terms) — reference by name, do not redefine.

**Out of scope (push forward / sideways, name the owner):**
- Full Server Action mechanics, `useActionState`, optimistic UI — Chapter 043 / 044. This lesson writes only the idempotency action-body half.
- Background job retries, `runId` lifecycle, Trigger.dev `schemaTask`/queues/idempotency-key naming depth — Chapter 066. Foreshadow only.
- The full IETF `Idempotency-Key` draft (fingerprinting mismatched payloads, `Idempotency-Replayed` response header, concurrency 409s) — referenced, not drilled. Teach the common 80% shape.
- `processed_events` retention sweep implementation and PII redaction internals — L2 + Chapter 092 (restate the discipline, don't implement).
- Route-handler `authedRoute` wrapper, tenant scoping via `tenantDb` — Unit 10+. Show the un-wrapped shape and note the wrapper exists.
- Webhook-specific dedup details already covered — L2.
- Distributed-systems idempotency theory beyond the SaaS surface (exactly-once impossibility, consensus, message-queue semantics) — explicitly out; the course teaches the practical DB-constraint discipline, not the theory.
- The Resend second instance of the pattern — L5 (this lesson generalizes; L5 applies again to a concrete provider).

---

## Code conventions notes for downstream agents

- Server Action example obeys §Forms and Server Actions: file-level `'use server'`, `Object.fromEntries` + `safeParse` first, `db.transaction` for the claim+work, `Result` return, `updateTag`/`revalidatePath` after write before return. Idempotency key read from `formData` as a string; **scoped composite unique** `unique(orgId, idempotencyKey)`, separate from the UUIDv7 PK.
- Route handler example obeys §Route handlers: named `POST` export, RFC 9457 problem+json on the missing-key 400, cheapest-first parse. Mark the `authedRoute` wrapper as the Unit-10+ production form; show the explicit shape for teaching.
- Drizzle: `onConflictDoNothing({ target: [...] }).returning(...)`, composite `unique(...)` constraint, `casing: 'snake_case'` in *production* snippets — but the `DrizzleCoding` sandbox uses **explicit SQL column names** and a **table-level unique**, no `casing`, no `uuidv7()` (PGlite harness limits, per L2/L3 continuity). Note this divergence inline so the build-out agent doesn't "fix" it.
- Background-job snippet aligns with §Background work naming (`runId` namespace) but stays a sketch — no full `schemaTask`.
- Keys/strings: single quotes, `crypto.randomUUID()` for client/route key generation.
