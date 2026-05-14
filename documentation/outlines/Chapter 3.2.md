# Chapter 3.2 — The HTTP contract every endpoint signs

## Chapter framing

Chapter 3.1 walked the request lifecycle from URL bar to interactive page and installed the network-side substrate — DNS, the transport handshake, TLS, and the seam where the framework's SSR meets hydration. The lesson named "an HTTP request" as the fourth step and stopped there. The body of every request and response, the verb and the path and the status and the headers — the actual *surface* the application code reads and writes — is what this chapter opens.

The senior framing: **HTTP is the application-layer contract every endpoint in the codebase signs.** The framework hides the transport but every Server Action, Route Handler, webhook receiver, fetch call, and Stripe SDK call eventually pushes or pulls bytes through this contract. The senior call when designing an endpoint isn't "what library do I reach for"; it's "what method should this be, what status do I return on each outcome, what headers signal the cache and the content type, what's safe to retry, and what's the failure mode the client has to handle." A wrong method makes the endpoint unsafe to retry. A wrong status code makes the client misinterpret the failure. A missing or wrong header turns a working endpoint into one a CDN won't cache, a browser won't honor, or a third party won't authenticate.

The chapter ships three teaching lessons. The first installs the method palette and the idempotency model — the senior anchor that decides whether a network blip can be retried or whether retrying causes a duplicate charge. The second installs the status-code palette at the depth that matters for SaaS — the 2xx/3xx/4xx/5xx split, the specific codes that bite (200 vs. 201 vs. 204; 301 vs. 302 vs. 307 vs. 308; 400 vs. 401 vs. 403 vs. 404 vs. 409 vs. 422 vs. 429; 500 vs. 502 vs. 503), and RFC 9457 Problem Details as the 2026-default error-body shape. The third installs the header surface — content negotiation, caching, auth, and the custom-header convention — as the metadata channel that rides every request and response.

Threads that must run through every lesson:

- **Decisions before syntax.** Each lesson opens with the senior question the topic answers. The method lesson answers "what method should this endpoint be, and is it safe to retry?" The status lesson answers "the request failed; what code do I return so the client can react correctly?" The header lesson answers "what metadata does this response need, and what's the failure mode if it's missing?"
- **The framework owns the wire; the senior owns the contract.** Next.js 16's Route Handlers and Server Actions handle parsing the request and serializing the response. The student rarely writes a raw `Response` constructor in application code — but they decide what method the endpoint accepts, what status it returns, what headers it sets, and what idempotency guarantees it makes. The chapter teaches the *decision* layer; the wiring layer lands in Unit 5 (Next.js routing), Unit 7 (Server Actions and Route Handlers), and Unit 12.1 (the webhook receiver).
- **Idempotency is the senior anchor.** The single most load-bearing idea in the chapter. The student leaves Lesson 3.2.1 able to answer "is this endpoint safe to retry" by inspection and able to design an endpoint that *is* safe to retry when the operation isn't naturally idempotent (the `Idempotency-Key` header pattern). The pattern lands again at the Stripe webhook in Chapter 12.1, the Trigger.dev durable job in Chapter 13.1, and the auth flow's magic-link send in Chapter 9.3.
- **Status codes are protocol, not decoration.** A 400 means the *request* was malformed; a 422 means the request was well-formed but the *content* was invalid; a 409 means the resource state conflicts with the request. The distinctions matter because clients (browsers, fetch retry libraries, the application's error boundary) react differently to each. The senior reflex is to pick the code that names the actual failure, not the closest-feeling 4xx.
- **RFC 9457 is the 2026 default error-body shape.** Problem Details for HTTP APIs — `application/problem+json` with `type`, `title`, `status`, `detail`, `instance` fields — has become the industry norm by 2026, with Stripe, GitHub, Cloudflare, and the major frameworks emitting it. The chapter installs the shape and names where the course's stack lands on it (Zod's `ZodError` formatted as Problem Details, Next.js Route Handlers returning `application/problem+json` for typed errors). Full treatment in Chapter 17.1; this chapter installs the recognition.
- **Headers are the metadata channel, and most of them are read by infrastructure, not application code.** The framework, the CDN, the browser, and the third-party API consume most headers. The senior reach is to know which headers infrastructure reads (so the application sets them correctly) and which headers the application reads (so it reacts correctly). The 2026 default is to lean on the framework's defaults (Next.js's `Cache-Control` on static assets, the platform's `Strict-Transport-Security`) and intervene only when the application's contract demands a specific value.
- **Cookies are headers but earn their own chapter.** The `Cookie` request header and `Set-Cookie` response header are part of HTTP, but the trust model — `Secure`, `HttpOnly`, `SameSite`, scope, expiration — is load-bearing enough that Chapter 3.4 owns it. This chapter names cookies as a header pair once and points forward.
- **CORS is a security boundary, not a header story.** The `Origin`, `Access-Control-*` headers exist, but the model that governs when they're sent and what they mean is Chapter 3.3's same-origin policy. This chapter names the headers exist and points forward.
- **HTTPS-only and HSTS are deployment baseline, not application code.** The `Strict-Transport-Security` header is set by the platform (Vercel) or the framework's security baseline (Chapter 17.2). The application doesn't write it. Named once for recognition; the depth lives in 17.2.
- **Senior anchors for later units are seeded here.** Idempotency lands at the Server Actions surface (Chapter 7.2), the Stripe webhook (Chapter 12.1), and the rate-limited auth endpoint (Chapter 15.4). The status-code discipline lands at the Server Actions error path (Chapter 7.2), the Route Handler contract (Chapter 7.5), and the error monitoring story (Chapter 17.1, Chapter 20.1). Cache headers land at the Next.js caching model (Chapter 5.4) and the CDN baseline (Chapter 21.3). The `Authorization` header lands at the Better Auth session model (Chapter 9.1) and the webhook signature pattern (Chapter 12.1, Chapter 3.7.2). Each lesson plants the forward reference at the call site.

This chapter ships small code snippets — `fetch` calls, `Response` constructors, request/response inspection in DevTools — and a handful of `TabbedContent` and `CodeVariants` blocks for the canonical comparisons (PUT vs. PATCH, 400 vs. 422 vs. 409, `Cache-Control` directive matrix). A couple of `Matching` and `MultipleChoice` exercises lock the vocabulary in. A `CodeReview` exercise per lesson exercises the senior reflex on a small endpoint. The chapter is heavier on prose and reading practice than on hands-on coding — the wiring lands in Units 5 and 7. The deliverable is a senior's mental model of the protocol.

The chapter ordering follows the layering. Methods come first because the choice of method is the first decision when designing any endpoint, and idempotency is the chapter's load-bearing senior anchor. Status codes come second because they're the response side of the contract — every method has a set of valid response codes the student needs to recognize. Headers come third because they're the metadata that rides both, and several of them (`Cache-Control`, `ETag`, `Idempotency-Key`) only make sense once the method and status models are in place. The quiz closes the chapter.

---

## Lesson 3.2.1 — Methods and the safe-to-retry contract

Teaches the GET/POST/PUT/PATCH/DELETE palette, idempotency as the anchor that decides whether a network blip can be retried, and the `Idempotency-Key` header pattern that makes non-idempotent POSTs retry-safe.

Topics to cover:

- The chapter-opening senior question: the student is designing an endpoint — "delete invoice," "create user," "update profile," "process webhook." What method should it accept? The naive answer is "POST for anything that changes data." The senior answer picks the method that names the operation's *semantics* and decides whether retrying the same request is safe. The lesson installs the method palette and the idempotency model. The decision shows up again at every Server Action (Chapter 7.2), Route Handler (Chapter 7.5), webhook receiver (Chapter 12.1), and external API call the codebase makes.
- **The five methods a SaaS engineer reaches for**, each with its semantics and idempotency status:
  - **`GET`** — read a resource. Safe (no side effects) and idempotent (repeating it produces the same result). The browser caches `GET` responses by default. The senior reach: any URL the user can navigate to or refresh; any data-fetching endpoint the framework's SSR or `fetch` calls. The watch-out: a `GET` that mutates state (a "click this link to confirm" endpoint that activates the account on visit) is a 2010-era anti-pattern — browsers, preview tools, link prefetchers, and corporate proxies will GET it speculatively and trigger the side effect. The senior reflex: confirmations and state changes are `POST`.
  - **`POST`** — create a resource, or trigger a non-idempotent operation. *Not safe* (has side effects) and *not idempotent* (repeating it creates a second resource or triggers the operation twice). The default for any operation that doesn't fit cleanly into the other methods. The senior reach: form submissions, Server Actions, webhook receivers, any endpoint that creates a record, sends an email, charges a card, or enqueues a job. The retry watch-out is what `Idempotency-Key` (named below) solves.
  - **`PUT`** — replace a resource. Not safe (has side effects) but *idempotent* (repeating the same request leaves the resource in the same state). The senior reach: replace-the-whole-record endpoints — the canonical "settings page submit" or "replace the user's profile with this payload" pattern. The student writes `PUT` rarely in application code (Server Actions handle most of the surface), but reads it on REST-style endpoints. The watch-out: a `PUT` that *creates* the resource if it doesn't exist (the "upsert") is allowed and common — the idempotent contract holds (creating once and then replacing twice produces the same final state as creating once).
  - **`PATCH`** — partial update. *Not safe*, and *not inherently idempotent* — though many APIs design `PATCH` endpoints to behave idempotently. The senior reach when the operation modifies a subset of fields on a resource: `PATCH /invoices/123` with `{ "status": "paid" }`. The implementation choice the senior makes: design the patch payload so applying it twice produces the same final state. A patch payload of `{ "balance": "deduct 10" }` is *not* idempotent (deducting twice gives -20); a payload of `{ "balance": 90 }` is. The course's preference: idempotent patches, expressed as "set field to value" rather than "increment field by value."
  - **`DELETE`** — remove a resource. Not safe, but *idempotent* (deleting an already-deleted resource is a no-op). The senior reach: the canonical "remove this record" endpoint. The watch-out: returning `404` on the second delete is technically correct per spec, but most modern APIs return `200` or `204` on both first and second delete because the *end state* (resource is gone) is the same and the client doesn't need to discriminate. The course's preference: 204 on every successful delete, regardless of prior state. Full status-code treatment is in 3.2.2.
- **Idempotency, defined sharply.** A method is **idempotent** if making the same request N times has the same effect on the server's state as making it once. Idempotency is *not* the same as safety — a safe method has no side effects; an idempotent method has side effects but they don't compound on retry. `GET` and `HEAD` are safe; `PUT`, `DELETE`, and well-designed `PATCH` are idempotent but not safe; `POST` is neither by default. The 2026 senior reach: design every endpoint to be idempotent when feasible, and use the `Idempotency-Key` pattern (named below) when it isn't.
- **The retry model**, named concretely. Every layer of the network — the browser's automatic retry on connection drop, the CDN's retry-on-5xx, the framework's `fetch` retry library, the Stripe SDK's retry on transient failure, the Trigger.dev job runner's retry on task failure — assumes that **idempotent requests are safe to retry**. A `GET` that times out is automatically re-issued. A `PUT` that returns a 502 from the gateway can be safely re-tried. A `POST` that times out *cannot* be safely retried without an `Idempotency-Key` — the server may have processed it and the network failed on the response leg, in which case the retry creates a duplicate. The senior reflex: when designing a `POST` endpoint, ask "if the client retries this on timeout, what happens?" — the answer must be "the server recognizes the retry and returns the original response."
- **The `Idempotency-Key` header pattern**, named as the 2026 senior reach. The draft IETF standard (`draft-ietf-httpapi-idempotency-key-header`) codifies the pattern Stripe pioneered:
  - The client generates a fresh UUID (or any sufficiently random string) for each *logical* operation.
  - The client sends the request with `Idempotency-Key: <uuid>` as a header.
  - The server, on receiving the request, looks up the key in a store (Redis or a Postgres table). If absent, it processes the request, stores the result keyed by the idempotency key, and returns the response. If present, it returns the stored response without re-processing.
  - The client retries the same request with the *same* idempotency key on timeout. The server returns the original response — no duplicate processing.
  - The key has a TTL (Stripe uses 24 hours). After expiration, a new request with the same key is a fresh operation.
  - Stripe's implementation also stores the request *parameters* and refuses retries with mismatched parameters — the same key must be paired with the same request body.
  Named here at recognition depth and as the pattern the senior reaches for; the full implementation lands at the Stripe webhook in Chapter 12.1 and the Server Action retry surface in Chapter 7.2. The student doesn't write the server-side dedup store in this chapter; they recognize the pattern when they read Stripe's docs or design their own webhook receiver.
- **Where the framework hands the method to the application**, named for orientation. Next.js 16 Server Actions are *always* `POST` under the hood — the framework generates an opaque endpoint and serializes the action call into the body. The student doesn't choose the method; they design the action to be safely retryable (or use the `Idempotency-Key` pattern). Next.js 16 Route Handlers expose explicit method exports — a route file exports `GET`, `POST`, `PUT`, `PATCH`, `DELETE` functions, and the framework routes by method. Form submissions in HTML are `GET` (the default) or `POST` (with `method="POST"`); the form chapters (Unit 7) own the full treatment. Webhook receivers are always `POST` because the third party (Stripe, Clerk, GitHub) chose the method. The senior knows where method choice is theirs (Route Handlers) and where it's not (Server Actions, webhooks).
- **The other methods**, named for recognition and dismissed:
  - **`HEAD`** — like `GET` but the server returns only headers, no body. Used by link checkers, CDN cache validators, and the rare client that wants to inspect metadata before downloading. The senior reach: never write a `HEAD` handler in application code; the framework or the CDN handles it.
  - **`OPTIONS`** — used by CORS preflights (Chapter 3.3) and as a discovery primitive. The framework handles it.
  - **`CONNECT`**, **`TRACE`** — proxy and diagnostic methods; out of scope for application code.
- **The watch-outs a senior names**:
  - **A `GET` with a side effect is a security and reliability bug.** Browsers, prefetchers, link unfurlers (Slack, Discord, link-preview services), corporate proxies, and the speculation features in modern browsers all issue `GET`s without user intent. Confirmations, account activations, "click to unsubscribe" endpoints — all must be `POST` from a real form, not `GET` from a link.
  - **`POST` is not the answer for everything.** A new senior reaches for `PUT` or `PATCH` when the operation is naturally idempotent, even on a Server Action surface where the framework picks `POST`. The shape of the operation matters more than the wire method — design the operation to be idempotent and document it.
  - **The retry assumption goes both ways.** If your endpoint is idempotent and you advertise it (via the method semantics), clients will retry on failure. If your endpoint is *not* idempotent and the method semantics imply it is (a `PUT` that increments a counter), clients will retry and you'll have duplicate side effects. Match the implementation to the method.
  - **Form submissions on a refresh.** A `POST` form whose response is rendered directly causes the canonical "are you sure you want to resubmit?" browser prompt on refresh. The fix is the **POST-redirect-GET** pattern: the `POST` handler returns a `303 See Other` redirect to a `GET` endpoint that renders the result. Next.js's Server Actions handle this implicitly. Named for recognition.
  - **`PATCH` payload formats.** Two standards exist — JSON Merge Patch (RFC 7396, simpler: send the partial object) and JSON Patch (RFC 6902, more powerful: send an array of operations). The 2026 senior default is JSON Merge Patch (or just "send the partial object"); JSON Patch is over-engineered for SaaS endpoints. Named in one paragraph.
  - **HTML forms only natively support `GET` and `POST`.** A `<form method="DELETE">` is parsed by the browser as `GET`. The framework handles the bridge — Server Actions and Route Handlers receive `POST` from forms and route by the action name or the URL — but the student should know the constraint. Full form treatment in Unit 7.3.

What this lesson does not cover:

- HTTP status codes — 3.2.2 owns the response side.
- HTTP headers and the content-negotiation surface — 3.2.3.
- URL design, route patterns, and `URLSearchParams` (Chapter 3.3.1).
- Cookies and the `Cookie`/`Set-Cookie` headers (Chapter 3.4).
- CORS and the same-origin policy (Chapter 3.3).
- The Fetch API's request and response objects (Chapter 3.6.1).
- Server Action surface, form submission wiring, and the React 19 form pattern (Unit 7).
- Route Handler authoring (Chapter 7.5).
- The Stripe webhook signature and replay-protection mechanism (Chapter 12.1).
- The Trigger.dev job retry semantics (Chapter 13.1).
- WebSockets, Server-Sent Events, and the streaming response shape (Chapter 3.6.2).
- gRPC, GraphQL, JSON:API — alternative protocols out of scope for this stack.

Pedagogical approach:

Decision archetype with a Mechanics beat for the `Idempotency-Key` pattern. The lesson opens with the senior question — "you're writing a Server Action that charges a customer; the network drops the response and the user clicks the button again. What happens?" — and a small `MultipleChoice` exercise where the student picks among four outcomes (the customer is charged twice, the customer is charged once because the framework deduplicates, the customer is charged twice because POST isn't idempotent, the charge fails because the connection was lost). The discrimination — `POST` is not idempotent by default and the duplicate charge is real — frames the chapter's load-bearing concept.

A `TabbedContent` block organizes the five methods (GET, POST, PUT, PATCH, DELETE) as a reference card. Each tab has the semantic ("read," "create or trigger," "replace," "partial update," "remove"), the idempotency status, the canonical SaaS use case, and the one-line watch-out. The student leaves with a glance-reference they return to when designing endpoints.

A small `Matching` exercise pairs five endpoint descriptions ("fetch the invoice list," "submit a new comment," "update the user's avatar URL," "delete an integration," "replace the user's notification settings with a new object") with the right method. The decision discipline locks in.

A `CodeVariants` block contrasts a naive `POST /confirm-account` (one that activates on visit via `GET`) with the corrected pattern (a `GET /confirm-account?token=...` that renders a form, plus a `POST /confirm-account` that processes the activation). The annotation names the security and reliability failure of the GET-with-side-effect form, plus the link-prefetcher attack vector.

An `AnnotatedCode` block walks the `Idempotency-Key` pattern on a small charge-creation endpoint. The annotations highlight the four pieces: the client generates the UUID, the client sends the header, the server checks the dedup store, the server returns the stored response on collision. The senior reach is concrete; the student recognizes the pattern when reading Stripe's docs in Chapter 12.

A `CodeReview` exercise on a 30-line Route Handler file with three issues: a `GET` handler that updates the database on visit (security and reliability bug), a `POST /payments` endpoint without idempotency handling (duplicate-charge bug), and a `PATCH` payload that uses "increment by N" semantics (non-idempotent patch). The student leaves a comment per bug with the senior fix.

A `Buckets` exercise sorts eight operations into "naturally idempotent" or "needs `Idempotency-Key`" — fetch a user, create a user, delete an invoice, replace a settings object, send a magic-link email, increment a counter, set a feature flag to true, charge a customer. The recognition is the deliverable.

Close with a small `TrueFalse` round of five statements on method semantics and idempotency: "A `GET` can change server state if the operation is fast" (false), "A `PUT` request is idempotent" (true), "A `DELETE` on a non-existent resource should return 404" (false — depends on API contract; the modern default is 204), "POST-redirect-GET is the fix for the form-resubmit prompt" (true), "`Idempotency-Key` is required by HTTP for all POST requests" (false — it's an opt-in pattern). The vocabulary is locked in.

Estimated student time: 45 to 55 minutes. Load-bearing for Units 7, 12, and 13.

---

## Lesson 3.2.2 — Status codes and Problem Details

Teaches the 2xx/3xx/4xx/5xx codes a SaaS engineer reaches for, the 400-vs-422-vs-409 discriminations, the 4xx/5xx split as the on-call paging contract, and RFC 9457 Problem Details as the 2026 default error-body shape.

Topics to cover:

- The senior question: an endpoint just processed a request. What status code does it return? The naive answer is "200 if it worked, 500 if it didn't." The senior answer picks the code that names the *kind* of outcome — success with a body, success with no body, success that creates a new resource, redirect, the client got something wrong, the resource state conflicts, the validation failed, the rate limit fired, the upstream service is down. The lesson installs the codes a SaaS engineer reaches for and the canonical errors RFC 9457 standardizes.
- **The four classes**, named with the senior framing:
  - **2xx — success.** The request was received, understood, and processed successfully.
  - **3xx — redirection.** The client needs to take a further action (usually follow a redirect) to complete the request.
  - **4xx — client error.** The request had a problem the *client* caused — bad input, missing auth, lack of permission, conflict, rate limit exceeded.
  - **5xx — server error.** The request might have been fine but the server failed to handle it — bug, downstream outage, timeout, capacity.
  The senior reach: the 4xx/5xx split is *load-bearing for observability*. A 5xx fires an alert; a 4xx fires a metric. The error monitoring story (Chapter 20.1) treats them differently — 5xx tells the on-call there's a bug; 4xx tells the product team that users are seeing validation errors. The senior reflex: a server-side bug must return 5xx, not 400 with a vague message, or the alert never fires.
- **The 2xx codes that matter**:
  - **200 OK** — the default success for `GET` and for `POST`/`PUT`/`PATCH` requests that return a meaningful response body.
  - **201 Created** — the response to a `POST` (or `PUT`) that created a new resource. The senior reach includes a `Location` header pointing at the created resource's canonical URL. Useful when the client wants to navigate to the new record. The course's typical SaaS surface uses 201 on "create invoice," "create user," "create comment" Route Handlers.
  - **202 Accepted** — the request was accepted for processing but the work hasn't completed yet. The 2026 senior reach: any endpoint that enqueues a background job (Trigger.dev in Chapter 13.1, the durable export endpoint in Chapter 13.2). The response body typically includes a status URL the client polls.
  - **204 No Content** — the request succeeded and there's nothing meaningful to return. The senior reach: `DELETE` responses (deletion succeeded, no body needed), `PUT` responses on resource replacement when the new state is what the client just sent, the canonical "no-op success" status.
  - **Other 2xx codes** (203, 205, 206, 207, 208, 226) — named in a sentence each and dismissed; the four above cover 95% of SaaS endpoints.
- **The 3xx codes that matter**:
  - **301 Moved Permanently** — the resource has a new canonical URL; clients should update bookmarks. Browsers cache the redirect indefinitely. The senior reach: marketing URL changes, domain migrations, the canonical-URL story for SEO. Watch-out: aggressive browser caching means a 301 to a wrong URL bites for months on user machines; prefer 302 or 307 for any redirect that might change.
  - **302 Found** — the resource is temporarily at a different URL. The semantic for ambiguous "follow this redirect" cases. The 2026 senior reach: the framework's default for most redirects, including auth flows.
  - **303 See Other** — the canonical "POST-redirect-GET" status. After a `POST` that succeeded, redirect the client to a `GET` URL that renders the result. Browsers handle the method change correctly; Next.js Server Actions and form handlers use this implicitly.
  - **304 Not Modified** — the conditional-request response. When the client sends `If-None-Match: <etag>` and the resource hasn't changed, the server returns 304 with no body. The CDN and the browser cache use this aggressively. Named here; the `ETag`/`If-None-Match` mechanics live in 3.2.3.
  - **307 Temporary Redirect** and **308 Permanent Redirect** — like 302 and 301 but *preserve the method* on redirect (a `POST` redirected with 307 stays a `POST`; with 302 it may convert to `GET`). The senior reach in 2026 when the redirect must keep the method: API redirects, the `https://` enforcement when an HTTPS upgrade should preserve the POST body. Named for recognition.
- **The 4xx codes that bite in SaaS**:
  - **400 Bad Request** — the request was malformed: invalid JSON, missing required fields the server couldn't even parse, syntactically broken. The senior reach: parse-level failures, not validation failures (422 owns those). A 400 says "I couldn't even read your request"; a 422 says "I read it but it doesn't make sense."
  - **401 Unauthorized** — the request has no credentials or the credentials are invalid. The semantic is "authenticate." The canonical SaaS use: the session cookie is missing or expired. The senior reach: the auth chapter (Chapter 9) returns 401 when the session is missing; the application redirects to the login page on a 401 from a fetch.
  - **403 Forbidden** — the request has valid credentials but the principal lacks permission. The semantic is "the server understood who you are; you're not allowed." The senior distinction: 401 means "log in," 403 means "you're logged in but you can't do this." The RBAC chapter (Chapter 10.2) returns 403 on a permission denial.
  - **404 Not Found** — the resource doesn't exist. The senior reach: the canonical "no such record" response. Watch-out: 404 is *also* used as a privacy shield — returning 404 instead of 403 hides the existence of a resource the requester can't see. The senior call when the security model demands it: return 404 even when the resource exists but the user lacks permission, to avoid leaking existence through the status code.
  - **405 Method Not Allowed** — the resource exists, but the method isn't supported. The framework usually emits this when the Route Handler exports `GET` but the client sends `POST`. The senior reach: rarely write it by hand; recognize it in DevTools when the wrong method is hitting the endpoint.
  - **409 Conflict** — the request conflicts with the resource's current state. The canonical SaaS uses: a unique-constraint violation (email already taken on signup), an optimistic-concurrency failure (the resource was modified since the client last read it), a state-machine transition that's not valid from the current state (trying to cancel an already-cancelled subscription). The senior reach: 409 is *not* for validation errors (422 is); it's specifically about state collision. Full optimistic concurrency treatment in Chapter 11.2; this lesson installs the code.
  - **410 Gone** — the resource used to exist but is permanently removed; the client should stop asking. Stronger than 404. Rare in modern SaaS; named for recognition.
  - **413 Content Too Large** (formerly "Payload Too Large") — the request body exceeds the server's limit. Common at file-upload endpoints (Chapter 13.3 with R2).
  - **415 Unsupported Media Type** — the request's `Content-Type` is wrong. Named for recognition.
  - **422 Unprocessable Content** — the request was syntactically valid but semantically failed validation. The 2026 senior default for "Zod refused the parsed body." The course's Server Action and Route Handler patterns (Unit 7) return 422 with the Zod error formatted as Problem Details. Distinct from 400 (which means "I couldn't parse you at all"). Distinct from 409 (which means "your request is valid but the state conflicts"). The senior reflex: 422 is the *Zod-rejected-the-parse* code.
  - **429 Too Many Requests** — the client exceeded the rate limit. The senior reach: paired with the `Retry-After` response header (named in 3.2.3) so the client knows when to retry. The rate-limiting chapter (Chapter 15.3) owns the implementation; this lesson installs the code.
- **The 5xx codes that matter**:
  - **500 Internal Server Error** — the catch-all server bug. An unhandled exception, a logic error, a panicking handler. The senior reflex: a 500 in production triggers an alert through Sentry (Chapter 20.1); a 500 in development is a stack trace to fix.
  - **502 Bad Gateway** — the server, acting as a gateway, got an invalid response from an upstream service. The senior reach: a Next.js Route Handler that calls a third-party API which returned malformed data, a CDN that couldn't reach the origin, an API gateway in front of a backend that crashed. Often transient; safe to retry idempotent requests.
  - **503 Service Unavailable** — the server is temporarily unable to handle the request (overloaded, in maintenance). May include `Retry-After`. Often transient.
  - **504 Gateway Timeout** — the gateway didn't get a response from the upstream in time. The senior reach: the canonical "the database query took too long" symptom on a serverless edge runtime. Often a sign of an unindexed query (Chapter 6.4) or a missing cache (Chapter 5.4, Chapter 15.1).
  - **Other 5xx codes** (501, 505, 506, 507, 508, 510, 511) — named in a line each and dismissed.
- **RFC 9457 Problem Details as the 2026 error-body shape**:
  - The format. `application/problem+json` content type. The body is a JSON object with the following standard members:
    - `type` (URI reference identifying the problem type; e.g., `https://example.com/probs/out-of-credit`).
    - `title` (human-readable summary; e.g., `"You don't have enough credit."`).
    - `status` (the HTTP status code, repeated for clients that only parse the body).
    - `detail` (human-readable detail specific to this occurrence).
    - `instance` (URI reference identifying this specific occurrence; useful for tracing).
    - Extension members the API defines (e.g., `errors` for a Zod-style field-level breakdown, `balance` for the failing field's value).
  - The 2026 adoption. The format has become the industry norm — Stripe, GitHub, Cloudflare, the Spring Boot 4 default, the Node.js ecosystem's recommended shape. The course's stack adopts it: Zod errors at the wire boundary serialize to Problem Details with an `errors` extension carrying the field-level breakdown. Full implementation in Chapter 17.1; this lesson installs the shape.
  - The senior reach: every typed error in the application's Route Handlers returns Problem Details. The client (the frontend, a third-party integration) can parse the body uniformly regardless of which endpoint returned the error. The bug class Problem Details fixes: every microservice inventing its own error JSON shape, every client writing custom parsing per endpoint.
- **The watch-outs a senior names**:
  - **A 4xx that's actually a 5xx.** The most common status-code bug. The server crashed on a database connection drop and the handler caught the exception and returned 400 with a "Bad Request" message — the on-call never gets paged, the bug runs for weeks. The senior reflex: server bugs are 5xx; only return 4xx when the client genuinely did something wrong.
  - **A 200 that's actually an error.** The opposite anti-pattern: the endpoint always returns 200 and signals failure in a `success: false` field in the body. Breaks every layer of infrastructure that reads status codes — the CDN doesn't know to skip caching, the retry library doesn't know to retry, the error monitor doesn't know to alert. The senior reflex: HTTP-level outcomes use HTTP status codes.
  - **204 vs. 200 with empty body.** A 204 says "no body"; the server skips sending one and the framework knows not to expect it. A 200 with an empty body is technically valid but a smell — the client doesn't know whether to parse the body. The senior default: 204 when there's no body to return.
  - **404 vs. 403 as a privacy shield.** Returning 404 when the resource exists but the user can't see it is a deliberate choice to avoid leaking existence. The senior call: when the existence of the resource is itself sensitive (private documents, draft posts, other users' invoices), return 404. When existence is public but access is gated, return 403. The default for multi-tenant SaaS: 404.
  - **The redirect chain.** A 301 cached by the browser stays cached. If the canonical URL changes again, the old 301 still routes users to the previous canonical. The senior reach: prefer 302 or 307 for redirects that might change; reserve 301 for permanent moves with high confidence.
  - **Retries on 429 without `Retry-After`.** Hammering a 429ing endpoint without backoff produces the canonical "service is dying because clients won't stop" symptom. The senior reach in client code: respect `Retry-After` if present; use exponential backoff with jitter when absent.

What this lesson does not cover:

- HTTP method semantics (3.2.1).
- HTTP headers, including `Retry-After`, `Location`, `Cache-Control`, `ETag` (3.2.3).
- CORS-specific status codes and the preflight failure modes (Chapter 3.3.3).
- The full Zod error shape and the field-level error handling pattern (Chapter 7.1).
- Server Action error serialization across the React 19 boundary (Chapter 7.2).
- Route Handler error wrapping and the typed-error pattern (Chapter 7.5).
- Optimistic concurrency at the database layer (Chapter 11.2).
- Rate limiting implementation with Upstash (Chapter 15.3).
- Error monitoring via Sentry and the structured-log shape (Chapter 17.1, Chapter 20.1).
- WebSocket close codes — out of scope.

Pedagogical approach:

Mechanics archetype with a Reference beat for the status-code table. The lesson opens with the senior question — "your `POST /users` endpoint failed validation; what status do you return?" — and a `MultipleChoice` exercise pitting 400 against 422. The discrimination — 400 is "I couldn't parse you," 422 is "I parsed you but the data didn't validate" — is the lesson's load-bearing distinction.

A `TabbedContent` block organizes the four status-code classes as a reference card. Tab 1 (2xx) lists 200, 201, 202, 204 with the senior use case for each. Tab 2 (3xx) lists 301, 302, 303, 307, 308 with the method-preservation note. Tab 3 (4xx) lists 400, 401, 403, 404, 405, 409, 410, 413, 415, 422, 429 with the canonical SaaS trigger for each. Tab 4 (5xx) lists 500, 502, 503, 504 with the operations-team interpretation for each. The card is the lesson's primary reference deliverable.

A `Matching` exercise pairs ten endpoint outcomes ("the session cookie expired," "the user tried to delete a record they don't own," "the email is already taken," "Zod refused the parsed body," "the database connection timed out," "the rate limiter fired," "the file is bigger than the upload limit," "the resource was created," "the request body wasn't valid JSON," "the background job was enqueued") with the right status code. The decision discipline locks in.

A `CodeVariants` block contrasts three error responses on the same endpoint: tab 1 is the naive `200 { success: false, message: 'Validation failed' }` (the "200 that's actually an error" anti-pattern), tab 2 is a `400 Bad Request` with a plain string body (the "everything is a 400" anti-pattern), tab 3 is the senior reach — `422 Unprocessable Content` with an `application/problem+json` body containing `type`, `title`, `status`, `detail`, and an `errors` extension with the field-level Zod errors. The annotations name the failure mode of tabs 1 and 2 and the win of tab 3.

An `AnnotatedCode` block walks a Problem Details response shape on a real validation failure. The annotations highlight the five standard fields (`type`, `title`, `status`, `detail`, `instance`) and the extension shape for field-level errors. The student recognizes the format when they read Stripe's or GitHub's error responses.

A `CodeReview` exercise on a 25-line Route Handler with four status-code issues: a `GET` that returns 500 when the record isn't found (should be 404), a `POST` that catches every exception and returns 400 with the error message (should be 500 for unexpected errors, 422 for validation), a `DELETE` that returns 200 with `{ deleted: true }` (should be 204), and a `POST` that returns 201 with no `Location` header (should include the new resource's URL). The student leaves a comment per issue.

A `Buckets` exercise sorts eight error scenarios into "4xx (client's fault)" or "5xx (server's fault)" — the database is down, the user submitted invalid input, the third-party API returned a malformed response, the session cookie is missing, the user lacks permission, the request body exceeded the size limit, the upstream service timed out, the unique constraint fired on insert. The recognition is the deliverable.

A `PredictOutput` exercise: given a sequence of three requests against an endpoint (a `POST /users` with invalid JSON, a `POST /users` with valid JSON but the email is already taken, a `DELETE /users/123` on a record the user doesn't own), the student predicts the status code each returns. The decision discipline is concrete.

Close with a `TrueFalse` round of five statements on status codes: "A 200 response always has a body" (false — 200 with empty body is allowed but 204 is the senior choice), "A 5xx response means the client should not retry" (false — 502/503/504 are retryable, especially for idempotent requests), "The 4xx/5xx split governs whether on-call gets paged" (true), "A 409 is the right code for a missing record" (false — that's 404), "RFC 9457 Problem Details is the 2026 default error-body shape" (true). The vocabulary is locked in.

Estimated student time: 50 to 60 minutes. Load-bearing for Units 7, 17, and 20.

---

## Lesson 3.2.3 — Headers as the metadata channel

Teaches the header surface a SaaS engineer touches — content negotiation, `Cache-Control` directives, `Authorization` schemes, rate-limit signaling, security-baseline headers, and the custom-header naming convention — and which headers infrastructure reads versus which the application sets.

Topics to cover:

- The senior question: an HTTP request and response carry a body, but most of what governs how they're handled — what format they are, who they're for, whether they can be cached, whether the client is authorized — rides in the headers. The naive answer to "what headers should this response set?" is "let the framework handle it." The senior answer knows which headers infrastructure reads (so the framework's defaults can be trusted or overridden), which headers the application reads or sets (so the contract holds), and which headers are security baseline (so the platform's defaults match the application's needs). The lesson installs the header surface a SaaS engineer touches with the regularity that makes it muscle memory.
- **The header model in one paragraph.** Headers are `Name: Value` pairs that precede the body in both requests and responses. Names are case-insensitive (`Content-Type` and `content-type` are equivalent; the HTTP/2 and HTTP/3 wire format normalizes to lowercase, but most code reads case-insensitively). Values are strings with format conventions per header. Multiple headers with the same name are allowed and concatenate; the modern reach for a single key with multiple values is comma-separated (the `Accept-Encoding: gzip, deflate, br` form). Custom headers traditionally used the `X-` prefix; RFC 6648 deprecated that convention in 2012 — new custom headers use plain names (the course writes `Request-Id`, not `X-Request-Id`, when defining its own).
- **Content negotiation headers** — how the client tells the server what format it expects, and how the server confirms what it sent:
  - **`Content-Type`** (request and response) — names the media type of the body. The 2026 senior defaults: `application/json` for API requests and responses, `application/problem+json` for Problem Details error bodies (Chapter 3.2.2), `multipart/form-data; boundary=...` for file uploads (Chapter 13.3), `application/x-www-form-urlencoded` for HTML form submissions without files, `text/html; charset=utf-8` for SSR responses, `text/event-stream` for SSE streams (Chapter 3.6.2). The senior reflex: every request body needs a `Content-Type`; every response with a body needs a `Content-Type`. The framework sets this for typed responses; the application overrides only for custom shapes.
  - **`Accept`** (request) — what media types the client wants. The browser sends `Accept: text/html` on navigation, the framework's `fetch` defaults to `Accept: */*`, an application explicitly requesting JSON sends `Accept: application/json`. The senior reach: rarely set by hand in 2026 — `fetch` defaults are correct.
  - **`Accept-Encoding`** (request) and **`Content-Encoding`** (response) — the compression negotiation. The browser sends `Accept-Encoding: gzip, deflate, br` (Brotli) and increasingly `zstd` in 2026; the server compresses with one of those and sets `Content-Encoding`. The CDN and the framework handle this transparently. Named for recognition.
  - **`Accept-Language`** (request) and **`Content-Language`** (response) — the locale negotiation. The browser sends the user's language preferences from the OS or browser settings; the i18n chapter (Chapter 18.2) reads this to pick the locale. Named here; the depth lives in 18.2.
  - **`Content-Length`** (request and response) — the body size in bytes. The framework computes it; the application rarely sets it by hand. Bypassed entirely by streaming responses (Chapter 3.6.2), which use `Transfer-Encoding: chunked` instead.
- **Caching headers** — the contract between the application, the CDN, and the browser cache:
  - **`Cache-Control`** — the canonical cache-policy header. The senior reach for SaaS endpoints, named with the directives that matter:
    - **`public`** — the response can be cached by any cache (browser, CDN, intermediate proxy). The default for static assets and for cacheable API responses.
    - **`private`** — the response can be cached only by the user's browser, not by shared caches. The default for user-specific responses (dashboards, account pages).
    - **`no-store`** — don't cache anywhere. The default for sensitive responses (auth tokens, payment data).
    - **`no-cache`** — cache, but revalidate with the origin on every use (via `ETag`/`If-None-Match`). Different from `no-store` despite the name.
    - **`max-age=N`** — the response is fresh for N seconds. Browser caches honor it.
    - **`s-maxage=N`** — the shared-cache (CDN) version of `max-age`. Lets the CDN cache for longer than the browser.
    - **`stale-while-revalidate=N`** — after the response expires, serve the stale version for N more seconds while revalidating in the background. The Next.js / Vercel canonical reach.
    - **`immutable`** — the response will never change at this URL. Paired with a content-hashed filename (`app-a1b2c3.js`). Browsers skip even the revalidation request.
  - The 2026 framework defaults the student trusts:
    - Next.js sets `Cache-Control: public, max-age=31536000, immutable` on hashed static assets — they're cached for a year because the hash changes when the content does.
    - Next.js's `fetch()` integrates with the Data Cache (Chapter 5.4) and the per-request memoization layer; the student reads about `cacheTag` and `cacheLife` in Unit 5, not by hand-tuning `Cache-Control`.
    - Server Actions and dynamic pages default to `Cache-Control: private, no-store, no-cache, must-revalidate` to prevent CDN caching of user-specific responses.
    - The `revalidateTag` and `revalidatePath` primitives in Next.js 16 invalidate the data cache; the student uses them, not raw `Cache-Control` headers (Chapter 5.4 owns this).
  - **`ETag`** — a content-derived identifier the server sets on a response. The client caches it with the response; on the next request, the client sends `If-None-Match: <etag>` and the server can return `304 Not Modified` with no body if the resource hasn't changed. The senior reach: the framework or the CDN handles ETag for static assets; the application sets ETags by hand for the rare optimistic-concurrency endpoint (Chapter 11.2 uses ETag-style version checks in the database layer).
  - **`Last-Modified`** and **`If-Modified-Since`** — the older version-check pair, by timestamp instead of content hash. Largely superseded by ETag; named for recognition.
  - **`Vary`** — names which request headers the response varies on. A response that depends on `Accept-Language` sets `Vary: Accept-Language`; the CDN then keys its cache by both the URL and the request's `Accept-Language`. The watch-out: many CDNs don't fully support `Vary` and the framework's interaction with it is subtle — Next.js uses an internal `_rsc` query param hash to side-step the limitation. Named for recognition; the depth is in Chapter 5.4 and Chapter 21.3.
- **Auth and identity headers**:
  - **`Authorization`** — the canonical auth header. The format is `Authorization: <scheme> <credentials>`. Common schemes:
    - **`Bearer <token>`** — the OAuth 2.0 default and the 2026 SaaS norm for API auth. The token is opaque to the protocol; the server validates it. Used by Stripe (`Bearer sk_live_...`), GitHub, every modern API.
    - **`Basic <base64(user:pass)>`** — the legacy form, still common in webhook receivers that use HTTP Basic auth, in admin UIs behind a proxy, and in CI tools.
    - The course's stack — Better Auth (Unit 9) — uses session cookies for browser auth, not the `Authorization` header. The header lands when the application calls an external API (Stripe in Chapter 12.2, Resend in Chapter 8) or when the application *is* the API and is called server-to-server.
  - **`Cookie`** (request) and **`Set-Cookie`** (response) — the cookie pair. Named here as a header pair; the full trust model (`Secure`, `HttpOnly`, `SameSite`, scope, expiration) lives in Chapter 3.4. The auth chapter (Unit 9) writes the `Set-Cookie` value; the framework parses the `Cookie` header for the application.
  - **`Origin`** (request) and the `Access-Control-*` (response) family — the CORS surface. Named here as headers that exist; the model that governs when they're sent and what they mean is Chapter 3.3.
- **Rate-limit and retry signaling headers**:
  - **`Retry-After`** (response) — paired with `429 Too Many Requests` and with `503 Service Unavailable`. The value is either a delta-seconds integer (`Retry-After: 60` = wait 60 seconds) or an HTTP-date (`Retry-After: Wed, 21 Oct 2026 07:28:00 GMT` = wait until then). The senior reach in client code: respect `Retry-After` before retrying; combine with exponential backoff and jitter when it's absent. The rate-limiting chapter (Chapter 15.3) sets it on the server side.
  - **`X-RateLimit-Limit`**, **`X-RateLimit-Remaining`**, **`X-RateLimit-Reset`** — the de-facto-standard rate-limit headers (the IETF draft `draft-ietf-httpapi-ratelimit-headers` is iterating on a renamed form, `RateLimit-Limit`, etc.). The senior reach: emit them on rate-limited endpoints so client SDKs can self-throttle. Chapter 15.3 implements them.
  - **`Idempotency-Key`** (request) — named in 3.2.1; the recognition lands here as the request header that the client sends and the server reads.
- **Security-baseline headers**, named for recognition and pointed forward:
  - **`Strict-Transport-Security` (HSTS)** — tells browsers to refuse HTTP for this host for N seconds. Set by the platform (Vercel) or by the framework's security baseline. Chapter 17.2 owns it.
  - **`Content-Security-Policy` (CSP)** — controls which sources the browser will load. Set by the security baseline. Chapter 17.2.
  - **`X-Content-Type-Options: nosniff`** — refuses MIME-sniffing. Chapter 17.2.
  - **`X-Frame-Options`** / **`frame-ancestors`** in CSP — refuses framing (clickjacking protection). Chapter 17.2.
  - **`Referrer-Policy`** — controls what's sent in the `Referer` header. Chapter 17.2.
  - The student knows these exist and that the platform sets them; they don't author them in application code in this chapter.
- **Diagnostic and tracing headers**:
  - **`Request-Id` / `X-Request-Id`** — a per-request correlation identifier the application generates (or the platform sets) and propagates through logs. The structured-log chapter (Chapter 20.1) wires it. The student names it as the trace handle.
  - **`User-Agent`** (request) — the client identifier string. Read by analytics and for the rare client-discrimination check; rarely the right primitive for actual logic.
  - **`Referer`** (note the historical misspelling preserved in the spec) — the URL that linked to the current request. Read by analytics; the `Referrer-Policy` response header controls how much detail clients send.
  - **`Host`** (request) — the canonical hostname being requested. The framework reads this for multi-host deployments.
- **Custom headers and the `X-` legacy**, named in one paragraph. The `X-` prefix convention is deprecated (RFC 6648, 2012). New custom headers use plain names — the application defines `Request-Id`, `Tenant-Id`, `Webhook-Signature` without the prefix. The senior reach for naming: lowercase-hyphenated, descriptive, and documented. The watch-out: custom request headers trigger CORS preflights (Chapter 3.3.3) when sent cross-origin.
- **Reading and setting headers in 2026 SaaS code**, named with the framework's surface:
  - In **Next.js 16 Route Handlers**, the request headers come in via the `Request` object: `request.headers.get('authorization')`. The response headers go on the `Response` constructor: `new Response(body, { headers: { 'Content-Type': 'application/json' } })`.
  - In **Server Actions**, the framework parses and serializes headers; the application reads cookies via Next.js's `cookies()` helper and rarely touches raw headers.
  - In **`fetch` calls** from the application code: `fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })`. The senior reach: build a thin wrapper that adds the common headers and pass it everything.
  - In **middleware** (Chapter 5.5), the request and response headers are mutable; the framework runs middleware before the route handler.
- **The watch-outs a senior names**:
  - **Don't fight the framework's defaults.** Next.js sets sane `Cache-Control` for static assets, dynamic responses, and Server Actions. The application overrides only when the contract demands a specific value — and overriding aggressively (like setting `Cache-Control: no-store` on every response) defeats the cache and produces a slower app.
  - **`Set-Cookie` is plural-by-shape**. A response can include multiple `Set-Cookie` headers. The `Headers` interface in the Fetch API handles this through `getSetCookie()` rather than `get('set-cookie')`. Named for recognition; the cookie chapter owns the details.
  - **Case insensitivity vs. consistency.** Header names are case-insensitive, but the `Headers` interface returns lowercase keys. The application's code should read with consistent lowercase to avoid bugs in cross-framework portability.
  - **The `Vary` trap.** A response that depends on a request header (the user's locale, the auth state) but doesn't set `Vary` causes the CDN to serve a cached response for the wrong user. The senior watch-out: any response whose body or status depends on a request header must either set `Vary` or be marked `private`/`no-store`.
  - **Sensitive data in headers.** The `Referer` header leaks the URL the user came from; the `Authorization` header leaks tokens. Both end up in logs by default. The senior reflex: redact `Authorization` and `Cookie` before logging (Chapter 20.1 owns the structured-log redaction). Set `Referrer-Policy: strict-origin-when-cross-origin` (the modern browser default) or stricter.
  - **`Content-Type` mismatches.** A response with `Content-Type: text/plain` but a JSON body parses as a string in `fetch().then(r => r.json())` — it works, because the parser ignores the header, but the watch-out lands elsewhere: a CDN's compression decision is based on `Content-Type`, and the wrong type can skip compression entirely.
  - **The `OPTIONS` preflight tax.** Custom request headers in a cross-origin fetch trigger a CORS preflight (a separate `OPTIONS` request before the real one). The senior reach in cross-origin contexts is to limit custom request headers to what's strictly necessary; Chapter 3.3.3 owns the preflight cost.

What this lesson does not cover:

- HTTP method semantics and idempotency (3.2.1).
- HTTP status codes (3.2.2).
- The CORS preflight mechanics and the same-origin policy (Chapter 3.3).
- The cookie trust model — `Secure`, `HttpOnly`, `SameSite`, scope, expiration (Chapter 3.4).
- HSTS, CSP, X-Frame-Options, and the full security-baseline header surface (Chapter 17.2).
- The Next.js caching model — `cacheTag`, `cacheLife`, `revalidateTag`, `revalidatePath` (Chapter 5.4).
- The Fetch API request and response objects at depth (Chapter 3.6.1).
- Multipart form handling and file uploads (Chapter 13.3).
- Server-Sent Events and the `text/event-stream` body shape (Chapter 3.6.2).
- The structured-log shape and the `Request-Id` propagation pattern (Chapter 20.1).
- WebSocket upgrade headers — out of scope for the course.
- HTTP/3 frame-level headers and HPACK/QPACK compression internals — out of scope.

Pedagogical approach:

Reference archetype with two Mechanics beats — caching directives and the auth scheme matrix. The lesson opens with the senior question — "your API endpoint is being cached by the CDN and serving stale data to users; what header do you set?" — and a small `MultipleChoice` exercise on `Cache-Control` directives (the right answer is `Cache-Control: private, no-store` for user-specific endpoints, named with the reason).

A `TabbedContent` block organizes the header surface into five categories: content negotiation (Content-Type, Accept, Accept-Encoding), caching (Cache-Control, ETag, Vary), auth (Authorization, Cookie), rate-limit signaling (Retry-After, RateLimit-*), and security baseline (HSTS, CSP, X-Frame-Options, X-Content-Type-Options). Each tab has the canonical SaaS use case for each header and a one-line "what infrastructure reads it" note. The student leaves with a glance-reference.

A `Matching` exercise pairs eight scenarios ("the response should be cached only by the browser, not the CDN," "the client wants to know how long to wait before retrying," "the request is sending an OAuth token," "the response is a Problem Details error body," "the client wants gzip-compressed bytes," "the response varies by user locale," "the request body is a multipart form upload," "the server wants to invalidate the cached version") with the right header and value. The vocabulary is locked in.

A `CodeVariants` block contrasts three `Cache-Control` settings on the same API endpoint: tab 1 is `no-store` (defeats all caches — the wrong default for SaaS), tab 2 is `public, max-age=300` (the right reach for a list endpoint shared across users), tab 3 is `private, max-age=60, stale-while-revalidate=300` (the right reach for a user-specific endpoint that benefits from browser caching). The annotations name when each is correct.

An `AnnotatedCode` block walks a Next.js 16 Route Handler that reads the `Authorization` header, returns a 401 with a Problem Details body when missing, and sets `Cache-Control: private, no-store` on the response. The annotations highlight the request-side read (`request.headers.get('authorization')`), the response-body Content-Type (`application/problem+json`), and the Cache-Control directive choice.

A `ScriptCoding` block has the student write a small `fetch` wrapper that injects an `Authorization` header from a closure-captured token and a `Request-Id` from `crypto.randomUUID()`. The wrapper is the senior pattern; the student exercises building it once and using it everywhere.

A `CodeReview` exercise on a 30-line Route Handler with four header issues: a response missing `Content-Type` (browser may render as text), a `Cache-Control: public, max-age=3600` on a user-specific dashboard endpoint (cross-user cache leak), an `Authorization` header logged unredacted into the request log, and a custom request header named `X-Custom-Id` (the deprecated X- prefix). The student leaves a comment per issue.

A `Buckets` exercise sorts ten headers into "request," "response," or "both" — Content-Type, Cache-Control, Accept, Authorization, Set-Cookie, Cookie, Retry-After, Origin, Host, Strict-Transport-Security. The directional discipline is the deliverable.

Close with a `PredictOutput` exercise on three Cache-Control scenarios: a response with `Cache-Control: public, max-age=60, stale-while-revalidate=300` retrieved 65 seconds after caching (served stale; revalidation in background), a response with `Cache-Control: no-store` retrieved twice (fresh from origin both times), a response with `Cache-Control: immutable` retrieved twice (no revalidation; second request hits browser cache). The mental model is concrete.

Estimated student time: 50 to 60 minutes. Load-bearing for Units 5, 9, 12, 15, 17, and 20.

---

## Lesson 3.2.4 — Quizz

Top ten topics to quiz:

1. The five methods a SaaS engineer writes — GET (safe, idempotent), POST (neither), PUT (idempotent, full replace), PATCH (partial update, designed to be idempotent), DELETE (idempotent) — and the canonical use case for each.
2. Idempotency as the safe-to-retry contract — GET/HEAD/PUT/DELETE are idempotent by spec; POST is not by default; `Idempotency-Key` header is the 2026 senior reach (Stripe's pattern, IETF draft) when POST needs to be retry-safe.
3. The GET-with-side-effect anti-pattern — link prefetchers, browser speculation, and unfurlers will trigger any GET endpoint without user intent; state changes must be POST.
4. The 4xx/5xx split as the on-call paging contract — 5xx alerts on-call (server bugs, downstream outages); 4xx are user-facing validation/auth/permission failures and feed product metrics, not alerts.
5. 400 vs. 422 vs. 409 — 400 is "I couldn't parse the request"; 422 is "I parsed it but the content failed validation"; 409 is "your valid request conflicts with the resource's current state."
6. The senior 2xx palette — 200 for response with body, 201 for create-and-return-Location, 202 for accepted-and-queued, 204 for success-with-no-body (the senior default for DELETE).
7. RFC 9457 Problem Details as the 2026 default error-body shape — `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, plus extension members. Adopted by Stripe, GitHub, Cloudflare, the Spring Boot 4 default, the Node.js norm.
8. The Cache-Control directive matrix — `public`/`private`/`no-store`/`no-cache`, `max-age` vs. `s-maxage`, `stale-while-revalidate`, `immutable`. The senior default for user-specific endpoints is `private, no-store`; the framework sets sane defaults for the rest.
9. The Authorization header schemes — `Bearer <token>` is the OAuth 2.0 default and the 2026 SaaS API norm; `Basic` is legacy. The course's stack uses session cookies for browser auth (Unit 9), `Bearer` for server-to-server and external APIs.
10. The retry signaling pair — `429 Too Many Requests` + `Retry-After: <seconds>` for rate limits; `503 Service Unavailable` + `Retry-After` for transient outages. The senior reach in client code: respect `Retry-After`, then exponential backoff with jitter when absent.

---

## Total chapter time

Roughly 145 to 175 minutes across the three teaching lessons plus the quiz. The chapter fits across two evenings — methods and idempotency in the first sitting (45-55 minutes), status codes and headers together in a second longer sitting (100-120 minutes), the quiz at the end. The student finishes the chapter able to design an endpoint by picking the right method and naming the idempotency guarantee, return the right status code on every outcome, set the right cache and content-type headers, recognize Problem Details when reading third-party errors, and read the request/response surface in DevTools with vocabulary for every field. The HTTP contract Unit 5 (Next.js Route Handlers and Server Actions) and Unit 7 (the Server Action + form pattern) will land on is in place. Chapter 3.3 opens on the other side with the URL spec and the origin model — the security-boundary frame around the request/response surface this chapter installed.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
