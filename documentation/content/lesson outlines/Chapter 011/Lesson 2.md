# Lesson 2 outline — Status codes and Problem Details

## Lesson title

- **Title (h1):** Status codes and the Problem Details body
- **Sidebar label:** Status codes and Problem Details

The chapter-outline title was close but the body half does the load-bearing work for the second half of the lesson — surface it. Keep "Status codes" first (recall ordering matches the lesson order).

## Lesson framing — conclusions from brainstorm

**Target student.** Junior just off Lesson 1 (methods + safety/idempotency + `Idempotency-Key`). Has issued `fetch` calls and seen `response.status` but never had to pick a status code on the server side. Comes in knowing TS/Zod (Unit 1), `Result<T>` discriminated unions (Unit 1, Error handling), and the Next.js route-handler skeleton (one async function per method) — but has not implemented a handler yet.

**What this lesson is.** A reference-survey lesson with one pattern (Problem Details) embedded at the back. Two halves:

1. **The status-code catalog**, taught as semantic buckets the on-call human and the client both read — not as a 60-code memorisation drill. Five classes (1xx–5xx) framed as "who is at fault" and "should this page someone." Inside that frame, a senior subset per class: the 4–10 codes a SaaS engineer actually sends.
2. **The error-body shape**, RFC 9457 Problem Details, as the 2026 default. The status code on the response line and the JSON body on the way back have to agree; that's the unit of communication.

Student exits able to (a) pick the right status code by reasoning about which class — and which discrimination within it — fits the outcome; (b) explain the three confusion pairs (400 vs 422, 401 vs 403, 403 vs 404 for tenancy); (c) write a Problem Details JSON body with the five core fields and an `errors` extension for validation; (d) understand the 4xx/5xx paging contract.

**The senior frame carried through.** A status code is a **declaration of outcome category**. The class (first digit) is what the alerting rule reads; the specific code is what the client codes against. Pick the wrong class and you page the wrong team; pick the wrong code within a class and you confuse every retry policy downstream. The body is the human/machine-readable detail; the type URI is the version-stable identifier the client switches on.

**Pedagogical levers.**
- **Class-first, then code-within-class.** The 1xx–5xx classes are the durable mental scaffold. The catalog is hung off the classes, not the other way around. Students who memorise codes lose them; students who internalise classes can reason about new codes they meet later.
- **Defaults before conditionals.** State the senior subset; name the carve-outs in one line. "GET success → 200; resource creation → 201 + `Location`; validation failure → 422; not authenticated → 401" — then briefly the carve-outs.
- **The three confusion pairs are the lesson's centre of gravity for 4xx.** 400 vs 422 (parse vs validation), 401 vs 403 (identity vs permission), 403 vs 404 (tenancy hiding). Each gets its own paragraph and a recall drill.
- **Trigger before tool for Problem Details.** Open the Problem Details section with the cost of *not* having a standard shape (every API invents its own `{ error: "…" }`, clients have to special-case each one). Then RFC 9457 as the answer.
- **Real production stakes.** The 4xx/5xx split is *the on-call paging contract*. A 5xx spike pages someone at 2am; a 4xx spike is a client problem. Frame this once and it carries.
- **The coherence rule.** The status code on the response line and the `status` field in the Problem Details body must match. This is the closing rule — small but it's a real production gotcha.

**Common beginner traps to defuse.**
- Treating 200 as the default and sprinkling 200 everywhere with `{ success: false }`. Status code is the first signal; the body is the second. They must agree.
- Returning 500 for validation failures because "something went wrong." 5xx pages you; 4xx doesn't. Confusing the two means your dashboard lights up red for client bugs.
- Conflating 401 and 403. "Unauthorized" is a misnomer — 401 is *un*authenticated (no/bad credentials); 403 is authenticated *but* not allowed.
- Returning 403 for cross-tenant resource access. Returning 403 leaks existence (the resource is real, just not yours). Senior default: 404, same as a record that doesn't exist.
- Returning 400 for "the email field is missing." 400 is for parse failure (malformed JSON, wrong content type); 422 is for "parsed cleanly but failed validation." This is the most-shipped mistake.
- Using 302 for "after POST, go look at the new resource." 302 historically allows method change to GET (browsers do this), but the spec is loose — 303 is the explicit "use GET on the next request" code, and the modern temporary redirect that *preserves* method is 307. Default in 2026: 303 for post-redirect-get, 307/308 for method-preserving redirects.
- Returning a JSON body with `{ error: "..." }` shaped however that day's developer feels. Every endpoint's own dialect. RFC 9457 closes this hole.

**Forward links named once each, never elaborated:**
- Route handler error helper (Chapter 046) — where this lesson's catalog gets a `problemResponse(code, ...)` helper that builds the response.
- `authedRoute` 401/403/422/404 map (Chapter 057).
- Stripe webhook 400 with `problem+json` before any business logic (Chapter 063).
- Cookie attributes / Set-Cookie (Chapter 013) — when 401 ships with `WWW-Authenticate`, that lives in Lesson 3.
- CORS preflight (Chapter 012) — where 204 reappears.
- Headers full surface, including `Location`, `Retry-After`, `Cache-Control` (Lesson 3 of this chapter).

**Pre-requisite refresh, one line each (not full re-teaches):**
- HTTP response shape = status line (`HTTP/3 200`) + headers + body. (Chapter 010 named it once.)
- `Result<T>` discriminated union with `code` field (Unit 1, Error handling section) — the `code` values map onto status codes; this lesson is what the wrapper turns them into.
- Zod 4 `safeParse` returns `{ success: true, data } | { success: false, error }`. The `error.issues` array is the natural carrier for the validation field-errors extension in Problem Details.

**Estimated student time:** 35–45 minutes.

---

## Lesson sections

The lesson opens with a short introduction (no h2), then six h2 sections, then a closing recall round.

### Introduction (no header)

Two short paragraphs.

1. **The senior frame.** A status code is not a label the server sticks on the response — it is a *declaration of outcome category* that every layer downstream reads. The class (the first digit) drives alerting and paging; the specific code drives client behavior; the body fills in detail. Mismatched signals at any layer break the contract.
2. **What this lesson lands.** The five status classes as semantic buckets, the senior subset within each class, the three 4xx discriminations that matter (parse vs validation, identity vs permission, tenancy hiding), the 4xx/5xx paging contract, and RFC 9457 Problem Details as the 2026 default error-body shape. Close on: "By the end you can pick a status code by reasoning about the outcome category, and write the body shape every modern SaaS API converges on."

### Status codes are outcome categories

A short framing section (~3 short paragraphs) installs the class-first mental model.

- **The shape of the status line.** One sentence reminder from chapter 010: `HTTP/3 200 OK`. The number is what the rest of the stack reads; the reason phrase ("OK") is for humans skimming logs.
- **The first digit is the class.** Five buckets, each with a one-line semantic: 1xx informational ("hold on"), 2xx success ("done"), 3xx redirection ("go look there"), 4xx client fault ("your bad"), 5xx server fault ("our bad"). The class is what the on-call dashboard, the CDN, and the load balancer key off; the specific code is what the client codes against.
- **Two consumers downstream.** Two concrete consumers of the class, named tersely:
  - **Alerting and paging** read the 4xx/5xx split. A 5xx spike pages someone; a 4xx spike does not. If you return 500 for validation failures, your team gets paged when users mistype emails.
  - **Retry policies** read the class too. Most HTTP clients retry 502/503/504 (load-balancer trio) and 429 (rate limited); they don't retry 4xx by default. Pick the wrong code and you either retry forever or never.
- **Senior watch-out (`<Aside type="caution">`).** "If you're tempted to return 200 with `{ ok: false }` in the body, you're encoding the failure in two places at once. Pick the status code, set the body to match. The two signals are one signal."

**Compact reference card.** Right after the prose, a small HTML+CSS card inside `<Figure>` showing the five classes as a horizontal strip — each class a colored swatch with the first-digit number, the one-word label ("Informational / Success / Redirection / Client error / Server error"), and the one-line "who reads this." Goal: a glanceable scaffold the student rebuilds the catalog on. Keep it under ~150px tall.

### A class-by-class tour of the senior subset

The catalog section. Organised by class, not as one flat table — the lesson is class-first by design. For each class, prose names the codes a SaaS engineer actually sends; codes outside the subset are not listed (no historical detours).

Sub-structure inside this h2: five h3 sub-sections, one per class. Each one is short and concrete; the 4xx section gets the most space because that's where the discriminations live.

#### 1xx — informational

One short paragraph. Three codes worth naming:
- `100 Continue` — the client asks "may I send the body?" before sending it. Rare in modern stacks; mention and move on.
- `101 Switching Protocols` — the WebSocket upgrade handshake. The student will see this in DevTools the first time they open a WebSocket connection (Chapter 056).
- `103 Early Hints` — the server tells the browser "while I work on the real response, here are resources to preload." The CDN preload signal; Cloudflare and Fastly already cache these. Foreshadow: Next.js 16 has built-in support for emitting `Link` headers under 103.

No exercise here — 1xx is the smallest and least-touched class.

#### 2xx — success

One short paragraph plus a four-code list. The senior subset:

- `200 OK` — read with a body, or an update with a body. The default for almost every successful response.
- `201 Created` — resource creation. Pair with a `Location` header pointing at the new resource (forward-link to Lesson 3). One sentence on why: the client now has the URL to GET the new resource without parsing the body.
- `202 Accepted` — fire-and-forget enqueue. The work hasn't happened yet; the request was accepted for asynchronous processing. Use for "trigger an export," "send the email later" — anything that goes to a background job (forward-link to Chapter 062, Trigger.dev).
- `204 No Content` — successful mutation the client doesn't need a response body for. Common for DELETE and for PATCHes whose result the client doesn't display.

**Senior watch-out (`<Aside type="tip">`).** "204 means *no body* — not an empty body. If you set `Content-Type: application/json` and return `{}`, the response is 200 with an empty object, not 204."

#### 3xx — redirection

A short paragraph plus a compact comparison. The senior subset:

- `301 Moved Permanently` and `308 Permanent Redirect` — both permanent. The difference: 308 *preserves the request method* (a POST stays a POST); 301 historically allowed clients to change POST to GET. Senior default for new APIs: 308.
- `302 Found` and `307 Temporary Redirect` — both temporary. Same split: 307 preserves the method; 302 does not (browsers historically rewrite POST to GET on 302). Senior default: 307.
- `303 See Other` — the *explicit* "use GET on the next request" code. The classic Post-Redirect-Get pattern after a form submission lands on 303 → GET the result page.
- `304 Not Modified` — conditional request matched the `ETag` / `If-None-Match` headers. The body is omitted. Forward-link to Lesson 3 (conditional requests).

**`CodeVariants` with two tabs comparing the redirect mental model.** Side-by-side wire shapes for the same scenario: client POSTs a form, server wants to redirect to the result page.

- Tab 1 — **303 See Other (the form-submission default).**
  ```
  HTTP/3 303 See Other
  Location: /invoices/42
  ```
  Prose: "Client follows with `GET /invoices/42`. Use after form submission to land on a confirmation/detail page. The Post-Redirect-Get reflex."
- Tab 2 — **307 Temporary Redirect (preserves method).**
  ```
  HTTP/3 307 Temporary Redirect
  Location: /v2/invoices/42
  ```
  Prose: "Client follows with `POST /v2/invoices/42` — same method, same body. Use when the URL moved but the operation didn't change. Pair `307` with `308` for the temporary/permanent split."

`maxLines={6}` on the `CodeVariants` so the two stay tiny.

#### 4xx — client fault

The lesson's longest sub-section. The catalog plus the three confusion pairs.

**The senior 4xx subset.** Listed compactly:

- `400 Bad Request` — *malformed*. The server can't parse the request. Wrong JSON, wrong `Content-Type`, missing required headers. The request never made it past parsing.
- `401 Unauthorized` — *unauthenticated*. No credentials, expired credentials, or a bad token. The misnomer trap: "Unauthorized" actually means "Unauthenticated." Pair with `WWW-Authenticate` to tell the client what scheme is expected.
- `403 Forbidden` — *authenticated but not allowed*. The credentials are valid; the action is not. Wrong role, paywall, missing permission.
- `404 Not Found` — *resource not found*. Either it doesn't exist *or* it does exist but the current user is not allowed to know that. (Tenancy hiding — see the discrimination below.)
- `405 Method Not Allowed` — the path exists, the method doesn't. `GET /api/widgets` works but `DELETE /api/widgets` doesn't. Next.js route handlers fire this automatically when an unexported method is called.
- `409 Conflict` — *state conflict*. Unique-constraint violation, optimistic-concurrency mismatch (`If-Match` failed), or any "the resource is not in the state your request assumes."
- `410 Gone` — the resource was here and is permanently gone. Use sparingly; usually 404 suffices.
- `422 Unprocessable Content` — *parsed cleanly but failed validation*. The body is well-formed JSON, the fields are the right types, but a business rule rejected it (`endDate < startDate`, email format invalid, slug already taken on the parsed level — though that last one usually surfaces from the DB as 409). The validation-error code.
- `429 Too Many Requests` — rate limited. Pair with `Retry-After` (forward-link to Lesson 3).

**The three discriminations.** A small subsection that walks the three confusion pairs explicitly.

1. **400 vs 422 — parse vs validation.** 400 = couldn't parse; 422 = parsed cleanly but the data is semantically wrong. The reflex: did Zod's `safeParse` get to *run*? If parsing the JSON failed before `safeParse`, it's 400. If `safeParse` ran and returned `{ success: false }`, it's 422.

2. **401 vs 403 — identity vs permission.** 401 = "I don't know who you are." 403 = "I know who you are, you can't do this." The simplest mental test: would re-signing-in fix this? Yes → 401. No → 403.

3. **403 vs 404 — the tenancy-hiding rule.** When a user is authenticated and asks for a resource that belongs to a different organization, the senior default is to return **404**, not 403. Why: 403 says "this resource exists, you can't see it" — which leaks the resource's existence. 404 says "no such resource for you," which gives no information either way. This is a senior security default; Unit 9 builds the `tenantDb` factory that enforces it at the query layer.

**Small recall drill — `<Buckets>` with three buckets.** The student sorts six request scenarios into the right status code. The scenarios are deliberately written so the student has to apply a definition, not pattern-match a phrase from the prose.

Buckets:
- `s400` — "400 Bad Request"
- `s422` — "422 Unprocessable Content"
- `s403` — "403 Forbidden"

Items (scenarios as short prose chips):
- `s400` — "Request body is `not even json {{`."
- `s400` — "Request `Content-Type` is `text/plain` but the route expects JSON."
- `s422` — "Body parses fine; `endDate` is before `startDate`."
- `s422` — "Body parses fine; email field is `'not-an-email'`."
- `s403` — "Signed-in Viewer tries to call `DELETE /invoices/42`; only Admins can delete."
- `s403` — "Signed-in user with a free plan calls an enterprise-only endpoint."

`twoCol`. `instructions`: "Sort each request into the status code the server should return."

#### 5xx — server fault

Compact. The senior subset:

- `500 Internal Server Error` — the catch-all bug. An unhandled exception bubbled to the framework boundary. This is the one your error tracker (Sentry) groups by stack trace.
- `502 Bad Gateway` — an upstream service returned garbage. Often the proxy/load-balancer reporting that the origin app crashed.
- `503 Service Unavailable` — the server is overloaded or down for maintenance. Pair with `Retry-After`.
- `504 Gateway Timeout` — an upstream took too long. The classic timeout-at-the-CDN response.

The 502/503/504 trio is *the load-balancer trio* — when you see them, the bug is usually not in your application code but in the layer in front of it (CDN, proxy, origin reachability).

- `507 Insufficient Storage` — niche but specific: the write didn't go through because the storage backend is full. Mention once for completeness; not core.

**The on-call paging contract — a brief callout (~2-3 sentences) within this section, no Aside.** "4xx is the client's fault and does not page on-call. 5xx is the server's fault and does. If your dashboard is paging the team for 4xx spikes, it's miscalibrated; if it's silent on 5xx spikes, it's broken. Lesson takeaway: pick the class correctly and the alerting tier downstream auto-routes."

**`<MultipleChoice>` reality check after the 5xx subsection.** Single-correct. Question: "A POST handler hits an unhandled `TypeError` from a missing optional chain. The exception bubbles to the framework boundary. What status code should the client see?"

Choices:
- `400 Bad Request` (distractor — student conflates "request caused a bug" with "request was bad")
- `422 Unprocessable Content` (distractor — student over-uses the validation code)
- `500 Internal Server Error` (correct)
- `503 Service Unavailable` (distractor — student confuses "server bug" with "server overloaded")

`<McqWhy>`: "500 is for the catch-all bug. 503 is for capacity/availability — the server is up but refusing work. The class boundary is what matters: this is a server fault (5xx), and inside that class it's a code bug, not a load issue. Sentry groups these by stack trace."

### Problem Details: the body shape that ships in 2026

The pattern section. Opens with the motivation, then the RFC, then the JSON shape, then the validation extension.

Structure:

- **The cost of dialect.** Every API that doesn't pick a standard body shape invents its own. `{ error: "..." }` here, `{ message: "...", code: 42 }` there, `{ errors: [{ field, msg }] }` somewhere else. Clients have to special-case each one; SDK generators can't infer the shape. The 2026 SaaS default is to converge on **RFC 9457 Problem Details**.
- **What RFC 9457 is.** A short IETF spec defining a JSON shape and a content type — `application/problem+json` — for HTTP error responses. Supersedes RFC 7807 (2016); backward-compatible. The 2026 default for any new API surface.

**The five core fields — a single `Code` fence with a fully-formed example.** Use `lang="http"` so Expressive Code highlights the response line and headers correctly, and the JSON body inside.

```http
HTTP/3 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.example.com/problems/validation-failed",
  "title": "Validation failed",
  "status": 422,
  "detail": "The invoice could not be created. See errors for details.",
  "instance": "/api/invoices",
  "errors": [
    { "path": "dueDate", "message": "Date must be after today." },
    { "path": "lines.0.amount", "message": "Must be positive." }
  ]
}
```

After the example, **`<AnnotatedCode>` with five steps walking the five core fields**. The code is the JSON body (only — strip the status line / `Content-Type` for the annotated walkthrough so the highlights line up cleanly on the JSON; the wire shape stays in the static `Code` fence above). Use `lang="json"` and `maxLines={12}`. Each step's `meta` highlights the key it's about (e.g. `"\"type\""`).

The annotation copy:

1. `meta='"\\"type\\""'` color=`blue` — "`type` is a URI that identifies the *kind* of problem. This is the field the client switches on — not the human-readable `title`, and not `status`. URIs are version-stable: you can change the title or detail text later, but `type` stays put."
2. `meta='"\\"title\\""'` color=`blue` — "`title` is a short, human-readable summary. Doesn't change between occurrences of the same type — `'Validation failed'`, not `'Validation failed for invoice 42'`. The per-occurrence detail goes in `detail`."
3. `meta='"\\"status\\""'` color=`orange` — "`status` mirrors the HTTP status code on the response line. Must match. Advisory but mismatching it confuses generic HTTP tooling and any proxy that re-emits the body."
4. `meta='"\\"detail\\""'` color=`blue` — "`detail` is a human-readable, *occurrence-specific* explanation. Safe to include user-supplied identifiers here — this is what a generic error UI surfaces."
5. `meta='"\\"instance\\""'` color=`blue` — "`instance` is a URI identifying this specific occurrence — usually the request path. Useful for log correlation and for matching a support ticket to a server-side trace."

- **The extension-member pattern.** Fields beyond the five core ones are allowed and encouraged. The convention: any field that isn't one of the five core fields is a *problem-type-specific extension*. The canonical one in this course is `errors` — an array of `{ path, message }` carrying Zod's `issue` shape (forward-link to Chapter 046 for the helper that does this conversion). Mention briefly that the choice of extension shape is yours per type, but that consistency *within* a `type` URI is required: clients code against a specific type's extension shape.

- **The content type matters.** `Content-Type: application/problem+json` (not generic `application/json`). Why: middleware, observability tools, and language SDK generators key off this to know the body shape is RFC 9457. One sentence.

- **The status-code-and-body coherence rule.** The status code on the response line and the `status` field inside the body must match. The body field is advisory by the RFC — but mismatching it breaks middleware that re-emits the body (e.g., proxies, error pages) and confuses clients that read one or the other. The rule: set them in one place server-side so they can't drift.

- **Senior watch-out (`<Aside type="caution">`).** "Don't leak internals in `detail`. Stack traces, internal IDs that aren't useful to the caller, raw exception messages — these belong in your error tracker, not in the response body. The `detail` field is what the client UI may display verbatim."

### Where this lands in code

A short bridge section closing the loop from theory back to the Next.js route handler shape from Lesson 1. The student doesn't write the helper here — Chapter 046 owns that — but they should see the call shape now so the contract is recognisable.

**Single `Code` fence — a sketch of the call shape, not a full implementation.** Use `lang="ts"`, `title="src/app/api/invoices/route.ts"`. Title makes the file location explicit. No imports shown; the lesson's point is the *shape*, not the wiring.

```ts
export async function POST(request: NextRequest) {
  const parsed = createInvoiceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return problemResponse({
      type: 'https://api.example.com/problems/validation-failed',
      title: 'Validation failed',
      status: 422,
      detail: 'The invoice could not be created.',
      errors: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  // …happy path: insert, return 201 with Location.
}
```

Prose under (one paragraph): "One `safeParse` at the boundary, one `problemResponse` for the failure branch. The status code (`422`) and the `status` field on the Problem Details body are set in one place — the helper enforces coherence by accepting one argument. Chapter 046 builds the helper; Chapter 057's `authedRoute` wraps both the parse and the response into a single decorator. The happy path's `201 Created` + `Location` shape lands in Lesson 3 when headers cover `Location`."

No exercise here — the student isn't writing route handlers yet (Unit 4). The fence is read-not-written.

### Closing recall

One small drill that exercises the three discriminations and the paging contract — the lesson's load-bearing reasoning skills, not the catalog memorisation.

**`<TrueFalse>` round, five statements.** Each requires applying a definition, not pattern-matching a word.

1. `answer="true"` — "A request body that fails Zod validation should return `422 Unprocessable Content`, not `400 Bad Request`."
   - `<TfWhy>`: "400 means the server couldn't *parse* the request (malformed JSON, wrong content type). 422 is for body that parsed cleanly but fails business validation. The reflex: did `safeParse` get to run?"
2. `answer="false"` — "A signed-in user requesting a resource that belongs to another organization should receive `403 Forbidden` so they know the resource exists but isn't theirs."
   - `<TfWhy>`: "403 leaks existence — it confirms the resource is real. The senior default for cross-tenant access is `404`, same as a missing resource. Unit 9's `tenantDb` factory enforces this at the query layer."
3. `answer="false"` — "When the server crashes from a bug in your route handler, the right status code is `503 Service Unavailable`."
   - `<TfWhy>`: "503 is for capacity or availability problems — the server is healthy enough to respond 'I'm overloaded.' An unhandled exception is `500`, the catch-all server bug. Sentry groups 500s by stack trace; 503s are what the load balancer emits during a deploy."
4. `answer="true"` — "The `status` field inside a Problem Details body and the HTTP status code on the response line should always match."
   - `<TfWhy>`: "The body field is advisory by the RFC, but mismatching it confuses any middleware that re-emits the body and any client that reads one but not the other. Set them in one place so they can't drift."
5. `answer="true"` — "If your team's alerting rules page on-call for 4xx spikes, the rules are miscalibrated."
   - `<TfWhy>`: "4xx is the client's fault. A 4xx spike means clients are sending bad requests — that's a client bug or a product issue, not an on-call emergency. The on-call paging signal is the 5xx rate."

(Why TrueFalse over Buckets: the Buckets drill earlier in the lesson already covered the 4xx classification skill. This round targets the *reasoning* skill — applying definitions to edge cases — which is exactly what TrueFalse is for.)

### What stays out (named once)

A two-line wrap at the end:

- The full route-handler implementation and the `problemResponse(...)` helper itself — Chapter 046.
- `authedRoute` 401/403/422/404 wiring — Chapter 057.
- I18n of `title` and `detail` strings — Unit 17.
- Logging and 5xx alerting rules — Unit 19.
- The full header surface (`Location`, `Retry-After`, `Cache-Control`, conditional-request headers, `WWW-Authenticate`) — Lesson 3 of this chapter.
- CORS preflight (where 204 reappears) — Chapter 012.

No `LinkCards` — every link is internal to the course.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| Five-class reference strip | HTML+CSS inside `<Figure>` |
| 3xx wire-shape comparison (303 vs 307) | `<CodeVariants>` with two `http` fenced blocks, `maxLines={6}` |
| 4xx classification drill | `<Buckets twoCol>` with three buckets |
| 5xx reality check | `<MultipleChoice>` with one `<McqWhy>` |
| Problem Details full wire shape | Single `Code` fence with `lang="http"` |
| Problem Details field-by-field walk | `<AnnotatedCode>` with five `<AnnotatedStep>`s on a JSON body |
| Route-handler call-shape sketch | Single fenced ` ```ts ` block with `title="…"` |
| Senior watch-outs | `<Aside type="caution">` / `<Aside type="tip">` |
| Closing recall | `<TrueFalse>` round, five statements |

No live-coding component — student doesn't yet write route handlers (Unit 4) and Zod parsing is already known from Unit 1. The drills here are recognition and reasoning.

No video embed — the topic reads cleanly in prose with the diagram and example; no canonical short video on status-code subset + Problem Details at a quality bar worth embedding.

## Term tooltips to author

Strategic, sentence-level definitions. Use `<Term>` only where it earns its weight.

- `Problem Details` — "RFC 9457 (2023): a standard JSON shape and `application/problem+json` content type for HTTP error response bodies. Supersedes RFC 7807. The 2026 default for new API surfaces."
- `idempotent` — Already authored in Lesson 1; **do not re-author**. Referenced inline here if the prose touches it (it shouldn't need to).
- `Post-Redirect-Get` — "Pattern: a POST submission returns `303 See Other` with a `Location` header, the client follows with a GET, the result page is reachable on refresh. Prevents form re-submission on browser back/refresh."
- `WWW-Authenticate` — "Response header on a 401 that names the authentication scheme the server expects (e.g. `Bearer`). Forward-link: Lesson 3 covers the full authorization header surface."

No `Term` for "status code," "200," "404" etc. — they don't need definitions; they need the reasoning frame the body builds.

---

## Scope

### What this lesson covers

- The five status classes (1xx–5xx) as semantic buckets, each with a one-line "who reads it."
- The senior subset within each class — concrete codes a SaaS engineer actually sends, listed compactly with their meanings:
  - 1xx: `100`, `101`, `103` (one line each).
  - 2xx: `200`, `201` (+ `Location`), `202`, `204`.
  - 3xx: `301` / `308`, `302` / `307`, `303`, `304` — with the method-preservation rule.
  - 4xx: `400`, `401`, `403`, `404`, `405`, `409`, `410`, `422`, `429`.
  - 5xx: `500`, `502`, `503`, `504`, `507`.
- The three 4xx discriminations: 400 vs 422 (parse vs validation), 401 vs 403 (identity vs permission), 403 vs 404 (tenancy-hiding security default).
- The 4xx/5xx paging contract — what alerting rules read.
- RFC 9457 Problem Details:
  - Why a standard error-body shape matters (the cost of dialect).
  - The five core fields (`type`, `title`, `status`, `detail`, `instance`).
  - The `application/problem+json` content type.
  - The extension-member pattern for `errors` (Zod-issue carrier).
  - That RFC 9457 supersedes RFC 7807 (backward-compatible).
  - The status-code-and-body coherence rule.
- The call shape in a Next.js route handler — a sketch (`safeParse` → `problemResponse(...)`) showing where this lesson's content is consumed.

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **Methods, safety, idempotency, `Idempotency-Key`** — Lesson 1 owns these. Do not re-teach.
- **Headers beyond brief mentions of `Location`, `Retry-After`, `WWW-Authenticate`** — Lesson 3 owns the audience model and the full surface (caching, CORS, security, auth schemes, conditional requests). Forward-link in one line; don't elaborate.
- **The `problemResponse` helper implementation** — Chapter 046. Show only the call shape.
- **`authedRoute(role, schema, fn)` wrapper** — Chapter 057. Mention by name only.
- **Webhook 400 with `problem+json` before any business logic** — Chapter 063. Don't pre-teach.
- **Zod `safeParse` API surface, `treeifyError`, `flattenError`** — Unit 1 owns them. Use `.success` and `.error.issues` inline without re-teaching.
- **CORS and 204 in the preflight response** — Chapter 012.
- **Logging, Sentry grouping, 5xx alerting rules** — Unit 19. Name the paging contract; don't build the alerting.
- **I18n of error strings (`title`, `detail`)** — Unit 17.
- **WebDAV-specific status codes** (`102`, `207`, `208`, `226`, `423`, `424`, etc.) — permanently out of scope. Not mentioned.
- **Reason phrase customization** (custom strings on the status line) — irrelevant in HTTP/2 and HTTP/3 (Chapter 010 established HTTP/3 over QUIC as the 2026 default). Don't mention.
- **AI-related framing** — not an AI lesson.

### Prerequisites the student already has (do not re-teach)

- Lesson 1: methods, safety/idempotency, the route-handler skeleton, `Idempotency-Key`.
- Chapter 010: the response line shape (`HTTP/3 200 OK`), URL → first byte → pixels.
- Unit 1: `Result<T>` discriminated unions with `code` fields; Zod 4 `safeParse` returning `{ success, data | error }`; `error.issues` array shape.
- TS/JS: object literals, async/await, named exports.

---

## Notes for the writer agent

- **Class-first.** Don't open with a flat table of 30 codes. The class-as-bucket framing is the durable mental model; the codes hang off it. The compact reference strip after the framing prose is the visual aid, not a substitute for it.
- **The three confusion pairs are the lesson's centre of gravity for 4xx.** Each deserves its own short paragraph and the Buckets drill that follows.
- **The 4xx/5xx paging contract carries the lesson's senior-mindset weight.** Frame it once clearly in the 5xx subsection; reuse the framing in the TrueFalse recall.
- **Problem Details: the body shape, not the helper.** Don't write `problemResponse` here; show the call shape in the bridge section. The helper is Chapter 046's territory.
- **RFC 9457 supersedes RFC 7807.** Name both once with the supersedes relation; don't dwell on the history. Backward-compatibility is the relevant fact for the student.
- **Coherence rule.** State it once, plainly: status line and `status` body field must match. The bridge section's call shape demonstrates how the helper enforces this.
- **Code conventions reminders.**
  - Single quotes in strings; semicolons on; `const` over `let`; trailing commas; 2-space indent.
  - `import type` for type-only imports (verbatimModuleSyntax) — not needed in the route-handler sketch since no types are imported in the shown snippet.
  - The route handler example deliberately omits imports — implementation is out of scope; the shape is the point.
  - JSON in fenced blocks uses double quotes (it's JSON, not JS) — this is fine; don't auto-correct.
  - In the route-handler sketch, the schema name `createInvoiceSchema` follows the `<verbEntity>Schema` naming rule (Code conventions, Naming).
  - The Problem Details `type` URI uses `https://api.example.com/problems/<kebab-name>` shape — illustrative, not prescriptive; the writer doesn't need to invent a real domain.
  - Status code listings use the canonical IANA reason phrase ("422 Unprocessable Content" — note: the IANA name updated from "Unprocessable Entity" with RFC 9110, 2022). Use **"Unprocessable Content"** not the legacy "Unprocessable Entity" — this is the current name in 2026.
- **The Aside discipline.** Three Asides total: one `caution` after the framing (don't return 200 with `{ ok: false }`), one `tip` after 204 (no body vs empty body), one `caution` after Problem Details (don't leak internals in `detail`). Don't add more — asides earn weight one at a time.
- **HTTP/3 on the wire-shape examples.** Lesson 1 set the precedent (the chapter is HTTP/3-default per Chapter 010). Use `HTTP/3` on response-line examples.
- **The `Buckets` drill placement.** Inside the 4xx h3 subsection, right after the three discriminations. Don't move it to a separate "exercise" section at the end of the lesson — the placement is what makes it a recall drill on freshly-learned content.
- **The `AnnotatedCode` walks JSON only.** Strip the status line and `Content-Type` header from the annotated block; they appear in the static `Code` fence right above. This keeps the annotated highlights from competing with the wire shape and lets `lang="json"` highlight the body cleanly.
- **No `crypto.randomUUID()` reach.** That was Lesson 1. The bridge section's route-handler sketch uses `safeParse(...)` and `problemResponse(...)` — no UUIDs here.
- **Estimated lesson length:** 1800-2400 words of prose plus the visuals and exercises listed.
