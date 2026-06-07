# Methods, status codes, and idempotency

- Title: `Methods, status codes, and idempotency`
- Sidebar label: `Methods, codes, idempotency`

## Lesson framing

This is the third lesson of Chapter 046 (route handlers). L1 installed the five triggers and the `route.ts` shape; L2 made the wire contract Zod-in/Zod-out with RFC 9457 Problem Details, the `problem()` / `parseOr422()` helpers, and the shared-mutator-two-callers synthesis. This lesson is the **authoring discipline** layer: the student is now the author of an endpoint and must pick the *method* (intent) and the *status code* (outcome) a senior reviewer will enforce on every PR, then operationalize idempotency for POSTs with side effects.

Pedagogical conclusions for the lesson as a whole:

- **Archetype: decision/reference, runs long.** The chapter outline budgets 50-60 min and flags that "every status code and method choice maps to a senior review comment." The mental model the student must leave with is **the reviewer's table** — a glanceable lookup of which method + which status fits which situation. Do not let this degrade into a flat RFC enumeration (the anti-pattern pedagogical guidelines warn against, and the failure mode of most HTTP teaching). Every code is taught as *the decision a reviewer makes*, never as trivia.
- **Build on the consumer-side base from Ch 011, do not re-teach it.** Ch 011 taught methods (safe/idempotent 2x2), the status-code subset, and `Idempotency-Key` — all from the *caller's* perspective ("what to expect from someone else's API"). The single most important framing sentence for this lesson: **"You learned to read these as a client. Now you sign the contract as the author."** Redefine each prerequisite in one line, then spend the lesson on the authoring call. Reuse Ch 011's vocabulary (safety, idempotency) without rebuilding the 2x2.
- **Lead with the two senior anti-reflexes**, because they are the highest-value corrections and the most common beginner mistakes: (1) "POST for everything" — the method is documentation, and a `POST .../status` carrying `{status}` is a PATCH wearing a POST; (2) "return 200 with `{error}` in the body" — the status code *is* the contract, a client that reads only the status gets the wrong picture. Frame both as production stakes: monitoring, retry policies, and on-call paging all read the method and status, not the body.
- **Three distinct topics, taught in order of dependency:** methods (intent) → status codes (outcome) → idempotency (the cross-cutting safety property that ties a non-idempotent method to a header-driven dedup contract). Idempotency is the climax — it's the one genuinely operational thing this lesson ships, and it's the foreshadow-to-operational handoff named in the chapter framing (sets up Ch 063 webhooks).
- **Minimize cognitive load via progressive disclosure.** The full status-code universe is overwhelming; teach the **senior subset** (the ~12 codes a SaaS handler actually emits) in tiered groups (2xx success, 3xx redirect-named-briefly, 4xx client-fault, 5xx server-fault), each group as a small table, and reserve a single "named once" line for the rare codes (410, 413, 415, 502/503/504) so the student knows they exist without drowning. The 4xx discriminations (400-vs-422, 401-vs-403-vs-404, 409) are where the real teaching lives — give them the most space.
- **Diagrams and interaction earn their weight here** because the content is classificatory and decision-shaped: a status-code decision tree (the reviewer's mental flowchart), a method-intent reference figure, and an idempotency request-replay sequence. Exercises are essential for a reference lesson — the student must *practice the classification*, not just read it: a Buckets drill for codes, a Matching drill for method-to-intent, an MCQ pair for the hard discriminations.
- **No live coding component fits cleanly.** The lesson's "code" is route-handler snippets returning specific statuses (real Next.js, can't run in `ReactCoding` per the react-only constraint; not worth a Sandpack boot for response-shape snippets). Use static `Code` / `AnnotatedCode` blocks and put the assessment weight on the classification exercises, which test the actual skill (picking the right code) better than a sandbox would.
- **Code conventions to honor:** the §Route handlers status-code table is the canonical contract — 400 (malformed), 401 (no identity), 403 (identity, no permission), 404 (record not found OR cross-tenant), 409 (conflict), 422 (validation), 429 (rate limited), 5xx (server bug). Named exports per method. `Idempotency-Key` on public mutating endpoints. The `processed_events` ledger and `INSERT ... ON CONFLICT DO NOTHING` claim primitive (full build is Ch 063 — name and sketch the shape only). Reuse L2's `problem()` helper for every error body; never hand-roll an error response.

## Lesson sections

### Introduction (no header)

Open with the senior question, made concrete with three decisions the student can't yet answer cleanly: which method does "soft-delete this invoice" use? which status does a duplicate-key create return? what body does a 202 carry? State the lesson's promise: by the end the student holds **the table a reviewer enforces** — method by intent, status by outcome, plus the idempotency contract that stops a retried POST from charging a card twice.

Anchor to prior knowledge in two sentences: Ch 011 taught these from the consumer side (reading someone else's API); L1/L2 of this chapter gave the `route.ts` shape and the Zod/Problem-Details contract. This lesson is the authoring discipline that sits on top. Keep it warm and brief (pedagogical guidelines §3).

Drop the framing sentence early: **the method and the status code are the contract; the body is only the explanation.** This is the through-line for the whole lesson.

### The method is the contract, not POST-for-everything

Teach method selection by **intent**, leading with the anti-reflex because it's the highest-value correction.

Open with the failure mode: a codebase where every endpoint is POST "because the spec permits it." The senior posture — **methods are documentation**; the method is the first signal of intent, the URL is the second, the body is last. A reviewer reads the request line before the body.

Then the five-method palette, each as *what it declares* (reuse Ch 011's safe/idempotent properties as one-line reminders, do not rebuild the 2x2):

- **GET** — safe, idempotent, cacheable. Reads, search, listing. No side effects, ever. The reflex: anything that "lists" or "fetches" is GET.
- **POST** — non-idempotent by default. Creating a resource the *server* names (`POST /invoices` returns the new id), or invoking a non-idempotent operation (send an email, charge a card). Repeat-call may duplicate unless the handler enforces idempotency (forward-pointer to the last section).
- **PUT** — idempotent full replacement. Client provides the *whole* new shape; repeat-call lands the same state.
- **PATCH** — partial update. Idempotent only if the change itself is (setting a status to a fixed value is; incrementing a counter is not). Name the merge-patch vs json-patch wire forms in one line only (Ch 011 already covered them) — default reach is a plain JSON partial body.
- **DELETE** — idempotent removal. First call deletes; second call's response is a *contract choice* (404 "it's gone" vs 204 "the end state you wanted is reached"). Name this as a per-project decision, don't over-explain.

The sharp example that makes the anti-reflex land: `POST /invoices/[id]/cancel` is **correct** because cancel is a genuinely non-idempotent intent (sends email, fires a webhook); `POST /invoices/[id]/status` carrying `{ status: 'cancelled' }` is **wrong** — it's a PATCH wearing a POST, and the reviewer rejects it. The discriminator: is the operation a state-diff (→ PATCH/PUT) or a non-idempotent action (→ POST)?

**Code:** a single small `Code` block (or two-tab `CodeVariants`) showing the named-method exports in one `route.ts` (`export async function GET`, `export async function POST`) — reinforces L1's "one function per method, no `if (method===…)` switch" and grounds "picking the verb is picking the contract." Keep it to the signatures; the bodies are taught later. Reuse L1/L2 invoice domain (`app/api/invoices/.../route.ts`).

**Exercise — `Matching`:** match each method to its intent/property. Left column the five methods; right column intents like "idempotent full replacement," "non-idempotent action with side effects," "safe cacheable read," "partial state-diff update," "idempotent removal." Tests the intent mapping directly. Place it right after the palette, before status codes.

**Tooltips (`Term`):** `idempotent` (re-explain in one line: repeating the call leaves the same final state — prerequisite from Ch 011, refresh without breaking flow); `safe` (no observable side effect). These two carry the whole method section; gloss them inline rather than assuming recall.

### The status code is the outcome the reviewer reads first

The core reference section. Frame it as the **on-call/monitoring contract**: the status class (2xx/4xx/5xx) is the first thing an alerting rule or an on-call human reads — 4xx is the client's fault and doesn't page, a 5xx spike is the server's fault and does (reuse Ch 011's paging-contract framing in one line). Then the anti-reflex restated: **never 200-with-`{error}`** — the protocol is the contract; a 200 body that says "failed" lies to every generic HTTP tool and retry policy.

Teach the senior subset in tiered groups. Use small tables (a `Figure` wrapping a compact HTML table, or plain markdown tables) per group so each is glanceable — this is the artifact the student keeps.

**2xx — success:**
- 200 OK — succeeded, body returned. GET reads; mutations that return the updated resource.
- 201 Created — POST created a resource; pair with a `Location` header pointing at the new resource URL.
- 202 Accepted — accepted but not finished (queued for a background job). Body carries a poll URL or job id. One line only — the full background-job 202 pattern is Ch 066.
- 204 No Content — succeeded, no body. The senior call: **prefer 200-with-the-updated-row over 204** for mutations the client cares about, so the client doesn't re-fetch. Name 204's legitimate home (DELETE, fire-and-forget PATCH).

**3xx — redirects, named briefly** (most route handlers don't redirect; this is a quick orientation, not a deep dive — Ch 011 covered it): 308 preserves method (permanent moves), 303 See Other is the POST-redirect-GET reflex (target is always GET). Name 307/301 in a half-sentence. Keep this group to a few lines — it's the lowest-value group for a SaaS *author*.

**4xx — client fault. This is where the lesson spends its budget.** Table the discriminations, then teach the three hard lines as their own focused beats:

- The **400-vs-422 line.** 400 = the wire payload is *malformed* (truncated JSON, wrong content type, can't even parse). 422 = the payload *parsed* but failed the Zod schema (field-level validation). This is the operational meaning of L2's "schema `safeParse` failure → 422." State that some teams collapse both into 400 — name the team-convention rule (pick one, stay consistent) once.
- The **401-vs-403-vs-404 line on auth and tenancy.** 401 = no/invalid credentials (handler can't identify the caller). 403 = identified but lacks permission (role check fails). 404 = doesn't exist **or** belongs to another tenant — return **404, not 403**, for tenant-scoped resources, because 403 leaks existence. This is the single most important security-shaped status decision in the lesson; give it a short worked beat. Name that the `authedRoute` wrapper (Ch 057 L3) returns 401/403 and the `tenantDb` helper (Ch 059) enforces the 404-scope structurally — do not build either.
- **409 Conflict** — the request collides with current state: a duplicate unique key, or an optimistic-concurrency version mismatch. The body's Problem Details carries the conflict reason. Name the version-column 409 as Ch 061 L3's territory (the in-app form reads it via the Result; the route handler returns it as HTTP) — name, don't build.
- **429 Too Many Requests** — rate limit exceeded; `Retry-After` header carries the wait. Set the **response shape** here (seconds, not a date — clients parse seconds without timezone bugs); the limiter *wiring* is Ch 081. One line.
- Rare-but-real, **named once each** so they're recognized not drowned: 405 (method not allowed — *let the framework return it*, don't hand-write; Next.js 16 auto-returns 405 for any HTTP method the file doesn't export — verified against the 16.2 route-handler docs. Do **not** assert the framework auto-populates an `Allow` header listing the supported methods — the official docs don't document that, so a downstream agent must verify before claiming it; the safe teaching is just "the framework returns 405 for you"), 410 Gone, 413 Content Too Large (the 1 MB action cap; route handlers can stream past it — ties back to L1's streaming trigger), 415 Unsupported Media Type.

**5xx — server fault:**
- 500 — uncaught exception. The senior reach: the framework boundary catches it and returns a Problem body that does **not** leak the stack trace; the trace goes to the observability sink (Ch 14) and the body carries a `correlationId` support can look up. This is the production-stakes payoff — leaking a stack trace is a real security finding.
- 502/503/504 — upstream failure / unavailable / gateway timeout. Propagate when an upstream (Stripe, Resend, AI provider) fails; the body names *which* upstream so the client doesn't blame the wrong service. One line.

**Diagram — status-code decision tree (`Figure` + Mermaid `flowchart LR`).** Pedagogical goal: externalize the reviewer's mental flowchart so the student internalizes the *order* of questions, not a flat list. Shape: start at "request arrived" → "could you parse it?" (no → 400) → "could you identify the caller?" (no → 401) → "is the caller allowed?" (no → 403) → "does the resource exist in this tenant?" (no → 404) → "does the request conflict with current state?" (yes → 409) → "did the schema validate?" (no → 422) → "did the work succeed?" (yes → 200/201/202/204; no/uncaught → 500). Horizontal layout per the diagrams vertical-space constraint. This is the lesson's centerpiece visual — the glanceable artifact. Diagrams INDEX picks Mermaid `flowchart LR` for decision trees.

**Code — `AnnotatedCode`:** one route-handler `POST` (or `PATCH`) skeleton walking the early-return ladder: parse-fail → 400/422 via L2's `parseOr422`, auth-fail → 401/403, not-in-tenant → 404, conflict → 409, success → 200/201 with the response. Steps highlight each return and name the code chosen. Reuse L2's `problem()` helper for every error response (zero drift — name this explicitly). This shows the decision tree *as code*, tying the diagram to the handler. ~14-16 lines, `maxLines` capped.

**Exercise — `Buckets`:** the 8-item classification drill the chapter framing/continuity already plans. Buckets are the codes; items are short scenarios ("the JSON body was truncated mid-stream," "the caller's role is `member` but the route needs `admin`," "the invoice id belongs to another org," "two requests raced on the same unique slug," "the body parsed but `total` was negative," "no session cookie present," "an upstream Stripe call timed out," "the resource was created"). The hardest, highest-value drill in the lesson — it tests the exact discriminations a reviewer enforces. Place right after the decision-tree diagram.

**Exercise — `MultipleChoice` (one or two):** the two confusions that survive a Buckets drill. (1) 400 vs 422 on "valid JSON, schema rejected `email` field." (2) 403 vs 404 on "invoice exists but belongs to another tenant" — explanation reinforces the existence-leak reasoning. Multi-select auto-switches if a question has two correct answers; keep these single-answer for crispness.

**Tooltips (`Term`):** `RFC 9457` / `Problem Details` (one line — the `application/problem+json` error body shape from L2/Ch 011; refresh without re-teaching); `correlationId` (the request id the support team looks up in observability); `optimistic concurrency` (one line — detecting a lost-update race via a version column, full treatment Ch 061).

### Idempotency: making a retried POST safe

The operational climax. This is the one section that ships a genuinely new capability, and the foreshadow-to-operational handoff the chapter framing names (it sets up Ch 063 webhooks). Give it real space.

**Start with the production pain, concretely.** A POST that charges a card. The client's network blips after the server processed the charge but before the response arrived. The platform (or the user's retry button) re-sends. Without protection: **two charges land.** This is the stake — frame it as money, because it is. The property that fixes it: idempotency — but POST is non-idempotent by default, so the *handler* must add it.

**The contract.** Any public POST with a non-idempotent side effect (charge, email send, webhook fire, resource creation) accepts an **`Idempotency-Key`** request header — a client-generated UUID v4 identifying the *logical operation*, stable across retries. Reuse Ch 011's one-line definition; here it becomes the authoring requirement. Note this is L2's "header that carries data" parsed by a `HeadersSchema` — the thread connects.

**The mechanism, taught as four steps (this is where a diagram earns its weight):**
1. Read the `Idempotency-Key` header.
2. Hash it together with the **route** and the **authenticated tenant** (so one tenant's key can't collide with or replay against another's — a security point worth stating).
3. Look up the dedup row in a `processed_requests` table: `INSERT ... ON CONFLICT DO NOTHING` is the atomic claim primitive — either you win the insert (first time → proceed and store the response) or you lose it (replay → return the cached response).
4. On replay, return the **cached** response, not a re-execution.

Be explicit about the scope boundary: **name and sketch** the claim primitive and the table shape, but the **full transaction wrapping** (claim + mutation in one transaction, lost-claim handling) is Ch 063 L2. State this so the downstream agent doesn't over-build — this lesson teaches the *contract and the why*, Ch 063 ships the production transaction. The continuity note must record that `INSERT ... ON CONFLICT DO NOTHING` and `processed_requests`/`processed_events` are introduced here at *recognition* level, built fully in Ch 063.

**The lifetime.** The dedup row expires after a tunable window — **24 hours** by default (the Stripe convention); after expiry a replay produces a new row. One line; the cleanup job is Ch 066.

**The Server Action twin.** The form-driven Server Action equivalent is a form-supplied UUID hidden input (foreshadowed in Ch 043 L5 / the `useOptimistic` UUID pattern, and the same key that reconciles optimistic UI). Name the parallel in one line — same idempotency discipline, different carrier (header for handlers, hidden field for actions). This reinforces L2's "stay HTTP-native at the handler, JS-native at the action, share the vocabulary in the middle."

**Diagram — idempotency replay (`Figure` + Mermaid sequence diagram, or `DiagramSequence` for a scrubbable step-through).** Pedagogical goal: show *why* the same key produces the same response on a retry, making the dedup tangible. Actors: Client, Route Handler, `processed_requests`. Frame 1: first request — key not found, claim succeeds, side effect runs, response stored + returned. Frame 2: retry with the *same* key — claim hits the conflict, cached response returned, **side effect does not run again.** Diagrams INDEX picks Mermaid for sequences; `DiagramSequence` is the strong choice here because the two-pass replay is inherently temporal and scrubbing the "second request short-circuits" frame is the aha moment. Pick one — prefer `DiagramSequence` for the temporal punch.

**Code — `Code` or small `AnnotatedCode`:** the claim sketch inside a POST handler — read the header, hash with route+tenant, `INSERT ... ON CONFLICT DO NOTHING RETURNING`, branch on win/lose. Keep it deliberately a *sketch* (comment the transaction-wrapping as "→ Ch 063 wires the full transaction") so it reads as recognition-level, matching the scope decision. Note this divergence-from-production explicitly for downstream agents: the snippet is intentionally simpler than the shipped Ch 063 version.

**Exercise — `MultipleChoice` or `TrueFalse`:** when is `Idempotency-Key` required vs optional? Scenarios: charging a card (required), a pure GET read (N/A — already idempotent), creating an org (required), a PUT full-replace (already idempotent by method — the subtle one worth testing). Tests the discrimination that idempotency-via-header is for *non-idempotent methods with side effects*, not a blanket rule. A `TrueFalse` round fits the "is this required here?" shape well.

**Tooltips (`Term`):** `Idempotency-Key` (one line — client-generated UUID identifying a logical operation, stable across retries); `UUID v4` (only if not already glossed earlier in the chapter — random 128-bit id; skip if redundant).

### External resources

Optional `ExternalResource` cards (pedagogical guidelines §3, step 5). Candidates, choose 2-3 that survive fact-check: MDN HTTP status codes reference; the RFC 9457 Problem Details spec (already the canonical error shape, link for depth); the Stripe idempotency docs (the de-facto reference for the `Idempotency-Key` pattern, 24h window). A short YouTube explainer on HTTP status codes is *not* recommended here — the content is reference-shaped and the exercises carry retention better than a video would; only add a `VideoCallout` if the resourcer finds a tight, current (last 6 months irrelevant for evergreen HTTP, but quality-gated) idempotency explainer that adds something the prose can't.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Safe/idempotent method properties and the 2x2 (Ch 011 L1) — refresh as one-line `Term` glosses; do not rebuild the grid.
- The status-code subset and Problem Details *from the consumer side* (Ch 011 L2) — this lesson flips them to the author side.
- The `route.ts` shape, named-method exports, dynamic-by-default caching (Ch 046 L1) — assume known; reuse, don't restate.
- The Zod-in/Zod-out contract, `problem()` / `parseOr422()` helpers, 422-for-validation, the flat `fieldErrors` bridge, the shared-mutator-two-callers synthesis (Ch 046 L2) — assume known; reuse `problem()` in every error snippet without re-explaining it.

**This lesson does NOT cover (defer, name-once-max):**
- Building the `authedRoute(role, schema, fn)` wrapper and its full 401/403/422/404 plumbing → Ch 057 L3. This lesson teaches what each code *means*; name the wrapper as the carrier only.
- The version-column optimistic-concurrency mechanism and the Drizzle UPDATE precondition behind the 409 → Ch 061 L3. Teach 409 *semantics*; name the source once.
- The conditional-request surface (`If-Match` / `If-None-Match` / `ETag` / 412 Precondition Failed) → name once as the HTTP-layer twin of the version-column 409; do not build. (Lower priority than the chapter outline implies — keep to one or two sentences so it doesn't compete with the core 4xx teaching.)
- The full idempotency dedup **transaction** — `processed_events`/`processed_requests` claim + mutation wrapped in one transaction, lost-claim 200, the "one pattern four surfaces" synthesis → Ch 063 L2/L4. This lesson ships the *contract and the claim-primitive sketch* at recognition level only.
- Rate-limit *wiring* (`safeLimit`, Upstash, dual-key) → Ch 081 L2. Set only the 429 response shape (`Retry-After` in seconds).
- Background-job 202 patterns end-to-end → Ch 066. Name 202's shape (poll URL / job id) only.
- Tenant-scoping mechanics — the `tenantDb` helper → Ch 059. Name as the structural enforcer of the 404-over-403 rule only.
- HTTP caching at the CDN edge, `Cache-Control` / `ETag` / `s-maxage` / `stale-while-revalidate` operational detail → Ch 032 / Ch 14. L1 already set the dynamic-by-default posture; **this lesson does not re-open caching** beyond noting 304 exists alongside conditional requests. (Chapter outline lists a "cache headers operational reach" bullet — deliberately demote it; it overlaps L1 and Ch 032, and the lesson already runs long. Keep to at most one sentence or cut.)
- The Zod request/response schema authoring (Ch 046 L2) and filter/sort/search query authoring (Ch 046 L4).
- Webhook signature verification on the raw body → Ch 063 L1.
- Content negotiation (`Accept` / 406) → L2 already named it once; do not revisit.
