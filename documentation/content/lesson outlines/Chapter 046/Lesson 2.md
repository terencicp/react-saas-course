# Lesson outline — Chapter 046, Lesson 2

## Lesson title

- Title: `Wire contracts as Zod schemas`
- Sidebar label: `Zod wire contracts`

---

## Lesson framing

**Archetype.** Pattern. This is the lesson the chapter project and every later route handler writes back to for the contract discipline. The student leaves able to author a complete, honest route-handler contract: one Zod schema per input source, a typed response schema, and an RFC 9457 Problem Details error body — plus the helpers that make every handler's first ten lines identical.

**The senior question that frames the whole lesson** (state implicitly in the intro, not as a heading): the Server Action contract was "the schema's input type in, the canonical `Result` out" — a *typed JS function call*. A route handler is `Request` in, `Response` out: wire bytes both directions, no implicit shape, no typed call site, no compiler watching the boundary. So what discipline keeps the contract honest? Answer: Zod is the single source of truth on *both* directions — it validates what comes in and describes (and validates) what goes out. The student already met this idea for Server Actions in Ch 042–043; this lesson ports it to the HTTP wire.

**What the student already knows — lean on it hard, do not re-teach** (see Scope for the full list): Zod builders (`z.object`, `z.strictObject`, `z.enum`, `z.uuid`, `z.coerce`), `safeParse` vs `parse` and the `{ success, data | error }` discriminated result, `z.flattenError`/`z.treeifyError`, the canonical `Result<T>` shape (`{ ok, data } | { ok: false, error: { code, userMessage, fieldErrors? } }`) with `ok`/`err` helpers and the standardized error-code enum, the five RFC 9457 Problem Details fields seen *from the consumer side* in Ch 011, and the RHF `applyServerErrors(form, result)` mapping. From Ch 046 L1 the student knows the `route.ts` shape, `NextRequest`/`NextResponse`, `params` is a `Promise` in Next.js 16, the five-seam mapping (parse → authorize → mutate → revalidate → return), and the `safeParse`-at-the-boundary reflex. This lesson's job is to assemble these into a contract, not to re-explain any one of them.

**The single most important mental model to leave behind:** *the schema is the contract, and the contract runs in both directions.* Inbound, `safeParse` is the gate — nothing the handler does is allowed to read unparsed wire bytes. Outbound, the response schema is what a senior code review checks against, and for public APIs `parse`-on-the-way-out is how "the handler returned a field the schema doesn't declare" gets caught *before deploy* rather than by an angry client. The naked, hand-typed `NextResponse.json(row)` that ships an internal field by accident is the failure mode this lesson inoculates against.

**The second durable idea: one schema, one mutator, two callers.** When the same operation needs both a form-driven Server Action and a public HTTP endpoint, the shape is one shared input schema in `/lib/schemas`, one pure mutator in `/lib`, and two thin seams that differ only in wire format (action parses `FormData` → returns `Result`; handler parses JSON → returns `Response`). This is the lesson's payoff and the bridge back to everything the student built in Ch 043. Make it concrete with a worked before/after, not just an assertion.

**Cognitive-load staging.** Build complexity in this order so no single step is heavy: (1) the four input sources and *why parse order matters* (cheapest-first short-circuit), (2) the success response schema and validate-on-the-way-out, (3) the Problem Details error body + the two helpers (`problem`, `parseOr422`) that compress the boilerplate, (4) the one-schema-two-callers synthesis. Each section ends with the student able to write that slice; the final section assembles them into a full handler they can read top to bottom.

**Tone / stance.** Adult, terse, decision-first (per pedagogical guidelines). Every pattern leads with the senior *why* and names the failure mode it prevents. Do not enumerate the chapter-outline "Watch-outs" as a list — fold each into the section teaching the concept it qualifies, phrased as "the review-rejecting mistake here is …".

**Out-of-scope items named once, never built** (keep these to a single sentence each where they appear): the OpenAPI-from-Zod generator and the published-API track, content negotiation beyond a one-line `Accept` guard, the contract changelog / versioning discipline. Status codes, idempotency, and list-query authoring are *explicitly deferred to L3/L4* — do not teach them here (see Scope).

---

## Lesson sections

### Introduction (no heading, opens the page)

Open on the contrast the student can already feel: in Ch 043 the form called the action as a typed function — TypeScript knew the argument shape, the action returned a `Result` the form destructured. A route handler has none of that safety net: the client could be a Python script, a mobile app, or `curl`, and all the handler receives is a `NextRequest` whose body is `unknown` bytes. State the goal: by the end, the student authors the four input schemas, a typed response schema, and a Problem Details error body, and wires the two helpers that make this a three-line ritual at the top of every handler. Preview the payoff explicitly: a single create-invoice operation served by *both* a Server Action and a public endpoint, sharing one schema and one mutator. Keep it warm and to ~4 sentences. Reuse the L1 mental model phrase "two seams, one trust posture" so the chapter reads continuously.

Frame the inbound discipline in one line the rest of the lesson hangs on: **the body is `unknown` until parsed — TypeScript's inferred type at the wire boundary is a lie the schema makes true.**

---

### h2 — `route.ts` reads four input sources, parsed cheapest first

**Goal:** install the four input sources (path params, headers, query, body), the schema-per-source convention, and the parse-order rule with its short-circuit rationale. This is the inbound half of the contract.

**Content to teach:**

- The four sources, each with its accessor and the schema that guards it:
  - *Path params* — `(_req, { params })`, `await params` (Promise in Next.js 16 — reuse the L1 gotcha, do not re-explain *why* it's a Promise), then `ParamsSchema.safeParse(awaited)`. Typically `z.object({ invoiceId: z.uuid() })`. Frame the format check as the cheapest "is this even a valid request" gate — a malformed UUID is rejected before any I/O.
  - *Headers that carry data* — `request.headers.get('idempotency-key')`, `'content-type'`, `'accept'`, `'if-none-match'`. Parse against a `HeadersSchema` *only the one or two headers the handler relies on*, not all of them. Emphasize: most handlers parse zero or one header explicitly.
  - *Query string* — `request.nextUrl.searchParams` (a `URLSearchParams`) against a `QuerySchema`. The contract-level point only: `searchParams` is strings, and `z.coerce`/`z.preprocess` bridge them exactly as the `FormData` boundary did in Ch 042 L6 — *same coercion story, different source*. Explicitly defer the full filter/sort/search treatment to L4 (one sentence).
  - *Body* — the four body accessors and when each applies: `await request.json()` for typed JSON (the default), `await request.text()` for the raw bytes a webhook signature is computed over (name webhooks → Ch 063, do not teach verification), `await request.formData()` for multipart uploads, `request.body` (a `ReadableStream`) only when streaming earns its weight (→ Unit 22). Each feeds a `BodySchema.safeParse(...)`.

- **The parse-order rule and its rationale.** Path params → headers → query → body, cheapest disqualifier first, fail fast. The senior anchor to state plainly: *the handler's first ten lines are a sequence of `safeParse` calls and short-circuits — no business logic, no DB touch, until everything parses.* A malformed UUID in the path returns 400 without the handler ever reading (or awaiting) the body. Tie this back to the L1 five-seam model: this whole section is the expanded "parse" seam.

- **`safeParse`, never `parse`, at the wire boundary** — restate as the reflex (the student knows the distinction from Ch 042 L5; here it's *why it's non-negotiable on a public endpoint*: `parse` throws an uncaught 500 on hostile input, which is both a worse client experience and a noise source in the 5xx alerting from Unit 19). One sentence; this is reinforcement, not new teaching.

**Components / vehicles:**

- **`DiagramSequence`** — the centerpiece of this section. Four steps walking a single request (`POST /api/invoices/[invoiceId]/line-items`) through the parse gauntlet: step 1 params parsed (✓), step 2 headers parsed (✓), step 3 query parsed (✓), step 4 body `safeParse` runs. Add a fifth step showing the *short-circuit*: a malformed UUID in step 1 returns 400 immediately, the remaining sources never read. Author each step as simple HTML — a vertical strip of four labeled gates with the active one lit and the downstream ones dimmed, plus a small caption naming the accessor and the status on failure. Pedagogical goal: make "cheapest-first short-circuit" *visible* rather than asserted — students new to this default-parse-everything before checking anything. Do **not** wrap in `<Figure>` (DiagramSequence is its own card).

- **`AnnotatedCode`** — a skeleton `POST` handler (~12 lines) showing all four `safeParse` calls stacked at the top before any business logic, each short-circuiting. Steps: (1) the signature with `{ params }`, (2) `await params` + params parse, (3) the header read + parse, (4) the body parse, (5) the "business logic goes here, and only here" comment line. Use `color` per step (blue default). This is the inbound-contract reference the student copies. Keep the response side as a single `// → returns a typed Response (next sections)` placeholder so the focus stays on parsing.

- **`Term`** tooltips: `idempotency-key` (brief: "client-generated unique id so a retried request isn't processed twice — operationalized in the next lesson"), `multipart/form-data` (brief encoding definition), `ReadableStream` (one-line Web Streams definition). Keep `NextRequest`/`NextResponse` un-tooltipped — established in L1.

**Reasoning:** parse order is the one genuinely *new* discipline here (the accessors are mechanical, the schemas are Ch 042 vocabulary). A scrubbable sequence earns its weight because the short-circuit is a temporal behavior — a static code block can't show "the body is never read." The AnnotatedCode anchors the shape the student will reproduce.

---

### h2 — The response schema validates what goes out

**Goal:** the outbound half. A response is also a contract; the schema validates it on the way out for public APIs, and types it for internal ones. This is the section that most distinguishes a route handler from "just return some JSON."

**Content to teach:**

- **Typed success bodies.** The success response is a JSON shape a schema *declares*: `const InvoiceResponse = z.object({ id: z.uuid(), total: z.number(), status: z.enum(['draft','sent','paid']) })`. The handler returns `NextResponse.json(InvoiceResponse.parse(data))`. The teaching beat: the schema validates the response *on the way out*, not merely as documentation — `parse` (throw, here, deliberately — see below) is how a code review catches "the handler returns a field the schema doesn't declare" before it ships. Name the concrete failure: a handler that does `NextResponse.json(invoiceRow)` leaks `internalNotes` or `createdBy` that the DB row carries but the public contract never promised. The response schema is the allowlist.

- **`parse` on the way out is the deliberate exception to the `safeParse` reflex.** Reconcile this carefully so the student isn't confused by the rule they just learned: *inbound* data is untrusted → `safeParse`. *Outbound* data is the handler's own construction; if it doesn't match the response schema that's a *programmer* error, not a client error, so a throw (→ caught by the route's error boundary → 500) is the *correct* signal — the same throw-at-the-framework-edge rule from Ch 043 L3, applied to the response. State this as a one-paragraph principle, it's the subtle bit students miss.

- **The public-vs-internal reach.** Validate-on-the-way-out costs a runtime parse on every response. The senior call: *validate the response for public/external APIs; type the return (no runtime parse) for internal-only handlers* where the cost isn't justified and the consumer is your own typed code. Give the rule, not a long cost analysis.

- **Type inference on the way back.** `type InvoiceResponse = z.infer<typeof InvoiceResponse>` is the type external clients code against and the type an OpenAPI generator would pick up. Same one-source-of-truth principle as Ch 042, now on the wire boundary. Mention the OpenAPI generator in exactly one sentence as the escape hatch when the API leaves the codebase (`next-openapi-gen` or `@hono/zod-openapi`), gated on "is this published externally" — most SaaS ships a README, not an OpenAPI doc, in year one. Do not build it.

**Components / vehicles:**

- **`CodeVariants`** — three tabs framing the response-shape decision, using `del=`/`ins=` markers:
  - *"Leaks the row"* — `return NextResponse.json(invoiceRow)` with the extra DB columns highlighted as the leak. First sentence: "Ships every column the row carries — `internalNotes` crosses the wire."
  - *"Typed but unguarded"* — `return NextResponse.json(data satisfies InvoiceResponse)` / explicit return type. First sentence: "Right shape at compile time, but a future refactor can still ship a stray field at runtime — fine for internal handlers."
  - *"Validated"* — `return NextResponse.json(InvoiceResponse.parse(data))`. First sentence: "The schema is the allowlist; a stray field throws in review, not in production. The public-API default."
  This makes the leak concrete and the three positions comparable at a glance.

- **`ZodCoding`** — short exercise. Give the student a `data` object that includes an extra `internalNotes` field and a starter `InvoiceResponse` schema; fixtures assert the public response *rejects* the leaking shape and *accepts* the clean one. `schemaName: 'InvoiceResponse'`. Goal: the student feels the response schema acting as an allowlist, and watches `z.infer` resolve the client-facing type. Keep it to ~3 fixtures (clean pass, leaking-field fail, missing-required-field fail). Note for the builder: ZodCoding runs real Zod via esm.sh, so this is safe; it does *not* run Next.js, so the exercise is schema-only (no `NextResponse`), framed as "what shape does the wire allow."

**Reasoning:** this is the lesson's least-intuitive idea (responses have contracts too; `parse` vs `safeParse` flips direction-by-direction). It needs both the visual A/B/C of CodeVariants and a hands-on ZodCoding so the allowlist behavior is *felt*, not just read. The exercise is the natural understanding-check for the whole inbound/outbound `parse`/`safeParse` distinction.

---

### h2 — Errors speak `application/problem+json`

**Goal:** make RFC 9457 Problem Details operational as the canonical error body, and ship the two helpers (`problem`, `parseOr422`) that turn it into a one-liner. This section converts the consumer-side knowledge from Ch 011 into authoring discipline.

**Content to teach:**

- **The error body shape.** Every error response is `application/problem+json` (the content type matters — generic HTTP tooling keys off it) with the five core fields `{ type, title, status, detail, instance }` plus extension members. The student saw these *from the consumer side* in Ch 011 L2; here they *write* them. Re-anchor the fields concisely (one line each, not a re-teach): `type` is a stable URI that *is* the machine-readable error code (one URI per error class, the docs page anchors it), `title` and `status` are the class-level human + numeric, `detail` is the instance-specific message, `instance` identifies this occurrence.

- **The `problem()` helper.** A `problem(status, code, options?)` function in `/lib/api` that takes a status code and an internal error code and returns a `NextResponse` with the correct `Content-Type: application/problem+json`, the matching `status`, and a typed body. Show its shape and one call site. The senior anchor: *one helper for every error response* — no handler hand-builds a Problem body, so the API's error shape can't drift handler-to-handler and a client writes exactly one error renderer.

- **Mapping `safeParse` failures to 422, and the `parseOr422` helper.** When a body parse fails, return **422** (Unprocessable Entity) with a Problem body whose `errors` extension carries the Zod issues flattened to per-field messages. Ship a `parseOr422(schema, input)` helper: returns the parsed value on success, or short-circuits to the Problem response on failure — the same one-liner at the top of every handler, so the handler body reads `const body = parseOr422(BodySchema, await request.json())`. (Pattern note for the builder: in MDX prose, model this as returning a discriminated result or throwing a `Response` the handler returns — pick the throw-a-Response shape so the call site stays a single line; flag this as a deliberate teaching simplification of error plumbing.)

- **The `errors` extension carries the *flat* `fieldErrors` shape — the field-vocabulary bridge.** This is the load-bearing continuity point. The Problem Details `errors` extension uses `z.flattenError(result.error).fieldErrors` → a `Record<string, string[]>` — *the exact same `fieldErrors` shape the Server Action's `Result` returns* (Ch 043 L3) and the exact shape the RHF `applyServerErrors` helper (Ch 045 L3) consumes. State the payoff explicitly: because the handler and the action share the field vocabulary, *the form's error renderer is reusable when a route handler is the caller* — one renderer, both seams. **Code-conventions reconciliation (flag for the builder):** the course standard is `z.flattenError` for the flat `Record<string, string[]>`, even though Ch 042 L5 also taught `z.treeifyError`; use `flattenError` here to match `Result.error.fieldErrors`. Do not use `treeifyError` in this lesson.

- **The action-vs-handler return-shape contrast, named once.** A Server Action returns `Result` (a JS object the React form layer destructures); a route handler returns `Response` (an HTTP message the client decodes). They are *not* the same object — but they deliberately *share field names* (`fieldErrors`, `userMessage`/`detail`, `code`/`type`) so the middle layer (the error renderer) is reusable. The one-line rule: **stay HTTP-native at the handler boundary, stay JS-native at the action boundary, share the field vocabulary in the middle.** A small comparison table is the right vehicle (see below).

- The `type` URI is the error code: one URI per error *class*, `detail` carries the per-instance message. State the review-rejecting mistake inline: returning the same `type` for different error classes (clients can't branch), or returning an arbitrary JSON error shape instead of `problem+json` (the shared renderer breaks). Fold these into the prose, not a watch-out list.

**Components / vehicles:**

- **`AnnotatedCode`** — the `problem()` helper plus a handler error path (~14 lines). Steps walk: (1) the helper signature `problem(status, code, options?)`, (2) the `application/problem+json` content-type header (the bit that's easy to forget), (3) the five-field body assembly, (4) the `errors` extension built from `z.flattenError`, (5) a call site `return problem(422, 'validation-failed', { errors })`. Goal: the student sees the whole error helper in one place and understands the content-type + flat-fieldErrors are the load-bearing details.

- **A comparison table inside `<Figure>`** (plain HTML/Markdown table) — "Server Action vs route handler error shapes." Three columns: *concern* | *Server Action (`Result`)* | *route handler (`Response`)*, rows for: transport (JS object / HTTP body), success shape (`{ ok: true, data }` / `2xx` + JSON), error envelope (`{ ok: false, error }` / `application/problem+json`), per-field errors (`error.fieldErrors` / `errors` extension — *same `Record<string,string[]>`*), human message (`error.userMessage` / `detail`), machine code (`error.code` / `type` URI). Caption: "Different envelopes, shared field vocabulary — the form's error renderer works for both." Pedagogical goal: cement that these are two wire formats over one contract, not two contracts. Use `<Figure>` (a table survives relocation, so leave `expandable` default).

- **`MultipleChoice`** (single question, understanding-check) — "A client POSTs a body that is valid JSON but fails the Zod schema (a missing required field). Which status does the handler return, and what content type?" Choices distinguish 400 vs 422 and `application/json` vs `application/problem+json`. Correct: 422 + `application/problem+json`. This checks the one decision from this section the student must get right; the *full* status-code table is L3, so keep this to the single 400/422 + content-type beat and reference L3 in the explanation.

- **`Term`** tooltips: `RFC 9457` ("the spec for the `application/problem+json` error body; supersedes RFC 7807"), `extension member` ("a custom field added to a Problem Details body beyond the five core fields — here, `errors`"). Use `422` inline with a one-clause gloss rather than a Term (full table is L3).

**Reasoning:** this is the section with the most cross-lesson wiring (Ch 011, 043, 045 all converge), so the comparison table is essential to keep the threads legible. The helpers are the operational payoff — without `problem()` and `parseOr422()` the student writes the five-field body by hand every time and the API drifts. The MCQ guards the single most-confused decision (400 vs 422) without straying into L3's territory.

---

### h2 — One schema, one mutator, two callers

**Goal:** the synthesis. Show the full shape when a single operation must be served by *both* a form-driven Server Action and a public route handler. This is the lesson's payoff and the bridge back to Ch 043.

**Content to teach:**

- **The problem it solves.** A `createInvoice` operation needs a form-driven action (the dashboard) *and* a public endpoint (a partner integration). The lazy reach duplicates the validation and the business logic across both — drift the day a rule changes. The senior reach: one `CreateInvoiceInput` schema in `/lib/schemas`, one pure mutator `createInvoice(input)` in `/lib`, two thin seams.

- **The three pieces, made concrete:**
  - The **shared schema** in `/lib/schemas/invoice.ts` (the student met this exact file in Ch 045 L3 — reuse it).
  - The **pure mutator** in `/lib/invoices.ts` — takes the parsed, typed input, does the DB work, returns the created entity. No `Request`, no `Response`, no `FormData` — Architectural Principle #3 (thin seams, pure `/lib`) made operational. The student built this exact split in Ch 043 L4; this is the reuse.
  - The **two seams**: the action parses `Object.fromEntries(formData)` → calls the mutator → returns `Result` via `ok`/`err`; the handler parses `await request.json()` → calls the same mutator → returns `NextResponse.json(...)` / `problem(...)`. The *only* difference is the wire format on each end.

- The senior anchor to state plainly: *any time a handler and an action would duplicate business logic, the shared mutator is the seam.* The wire format is the variable; the logic is the constant.

**Components / vehicles:**

- **`CodeVariants`** — two tabs, *"Server Action"* and *"Route handler"*, each showing its thin seam side by side, with the *identical* `createInvoice(input)` mutator call highlighted in both (use a quoted-token highlight on `createInvoice(input)` in both panes so the shared call jumps out). First sentence of the action tab: "Parses `FormData`, returns `Result` — the form destructures it." First sentence of the handler tab: "Parses JSON, returns a `Response` — the client decodes it. Same mutator, same schema." This is the cleanest possible way to show "two seams, one core" — the diff between the panes *is* the lesson.

- **`FileTree`** (small, inside `<Figure>` or inline) — the three-file layout: `lib/schemas/invoice.ts` (the schema), `lib/invoices.ts` (the mutator), `app/invoices/actions.ts` (the action) and `app/api/invoices/route.ts` (the handler), with a one-word annotation on each showing what it owns. Pedagogical goal: the *physical* separation that enforces the logical one — the student sees that the schema and mutator live in `/lib`, imported by both seams.

- **`Sequence`** exercise (ordering drill) — give the student the shuffled steps of a route-handler `POST` body (await + parse params, parse body via `parseOr422`, call the shared mutator, validate the response with the response schema, return `NextResponse.json`) and have them order them. Optionally include the cheapest-first parse steps so the drill reinforces parse order *and* the seam shape from the previous sections. Goal: the student internalizes the canonical handler skeleton as a sequence, which is exactly what they'll reproduce. This is a better fit than a sandbox because the skeleton's *order* is the learnable thing and there's a single correct sequence.

**Reasoning:** the whole lesson converges here. Everything taught (input parse, response schema, Problem errors) assembles into the two-seam shape, and the CodeVariants diff is the single most memorable artifact the student takes away. The `Sequence` drill is the active-recall capstone — cheaper and more focused than a full sandbox, and it grades a single correct ordering, which suits the "canonical skeleton" goal. (ReactCoding/Sandpack are wrong here: the code is server-side route handlers, not React, and can't run in the React-only ReactCoding iframe per the project constraint; a full Next.js sandbox would be heavyweight for what is fundamentally an ordering/shape lesson.)

---

### External resources (optional, end of page)

`ExternalResource` cards: the Zod 4 docs (parsing / error formatting), the RFC 9457 spec page, and the Next.js Route Handlers docs. Keep to three, all current.

---

## Scope

**This lesson covers:** authoring `Params`/`Headers`/`Query`/`Body` Zod schemas and the cheapest-first parse-order rule; typed response schemas and validate-on-the-way-out (`parse` outbound) vs type-only for internal handlers; RFC 9457 Problem Details as the error body with the `problem()` and `parseOr422()` helpers; the flat `fieldErrors` extension that bridges to the action `Result` and the RHF renderer; the one-schema-one-mutator-two-callers pattern.

**Explicitly deferred — do NOT teach here:**

- **HTTP status-code semantics and method-by-intent** (GET/POST/PUT/PATCH/DELETE, the full 2xx/3xx/4xx/5xx table, 404-over-403 on tenant scope, 409 on conflict) → **L3**. This lesson uses only the *one* status decision it must (422 for schema-failed bodies, and whatever status a success response carries) and points forward for the rest. Resist drilling the status table.
- **Idempotency operationalized** (the `Idempotency-Key` dedup, `processed_requests`, `INSERT … ON CONFLICT`) → **L3**. This lesson *names* the `Idempotency-Key` header as one of the data-carrying headers a `HeadersSchema` might parse, nothing more.
- **Filter/sort/search/paginate query authoring** (the `ListInvoicesQuery` schema, cursor envelope, the shared `where`-builder) → **L4**. This lesson establishes only that `searchParams` is a string source parsed with `z.coerce`, identical to the `FormData` boundary.
- **Authorization at the route boundary** (`authedRoute(role, schema, handler)`) → Ch 057 L3. Named in L1 as the action-wrapper twin; do not build or re-name it here beyond, at most, a one-clause "authorize after parse" reminder if the parse-order discussion needs it.
- **Webhook signature verification on the raw body** → Ch 063. This lesson shows `await request.text()` as *one body accessor* and says "webhooks compute a signature over these bytes," nothing about HMAC.
- **Streaming bodies / SSE / AI `streamText`** → Unit 22. `request.body` as a `ReadableStream` is named as the fourth body accessor, not taught.
- **The OpenAPI generator and the published-API track** (`next-openapi-gen`, `@hono/zod-openapi`, versioning, the contract changelog) → named once each, out of scope, never built.
- **Content negotiation beyond a one-line `Accept` mention** → out of scope; most handlers serve JSON only.
- **The shadcn/RHF rendering of the `fieldErrors` back into the form** → already covered in Ch 045 L3; this lesson only notes that the shared field vocabulary makes that existing helper reusable.

**Prerequisites to redefine *briefly* (one line each, do not re-teach):** `safeParse` vs `parse`; the `Result<T>` shape and `ok`/`err`; `z.flattenError`; the `route.ts` / `NextRequest` / `NextResponse` shape and `params`-as-Promise (all from L1 and Ch 042–045). Assume fluency; gloss only at the call site.

---

## Code-convention notes for the builder

- **`z.flattenError`, not `z.treeifyError`**, for the `fieldErrors` extension — the course `Result.error.fieldErrors` contract is the flat `Record<string, string[]>` (Code conventions §"Schemas with Zod 4"). This lesson must match so the action/handler field vocabulary is genuinely shared. Flag this explicitly since Ch 042 L5 taught both shapes.
- **Top-level format builders** everywhere: `z.uuid()`, `z.email()`, `z.iso.datetime()` — never the deprecated `z.string().uuid()` chains.
- **`z.object` default; `z.strictObject`** for request bodies where an unexpected key is a client bug worth a 422 (call this out for the `BodySchema` example — it's the senior reach at the request boundary).
- **Named exports** for everything except the framework-dictated `route.ts` method exports (`GET`, `POST`, …) — which *are* the required shape, not a violation.
- **`safeParse` inbound, `parse` outbound** — the deliberate direction-dependent split; note in the prose that the outbound `parse` is intentional (a response-shape mismatch is a programmer error → throw → framework boundary), so a reviewer doesn't "fix" it to `safeParse`.
- **Helpers live in `/lib`**: `problem()` and `parseOr422()` in `/lib/api`, the shared schema in `/lib/schemas`, the pure mutator in `/lib/invoices.ts` (or `db/queries/` per conventions for the read side — for the create mutator `/lib` is correct). Keep the worked example's invoice schema consistent with whatever Ch 045 L3 shipped (`/lib/schemas/invoice.ts`).
- **Deliberate simplification to flag:** the `parseOr422` helper modeled as "throw a `Response` the handler returns" is a teaching simplification of real error plumbing (real code might return a discriminated result and let the caller decide). Note this inline so downstream agents know it's intentional, not sloppy.
