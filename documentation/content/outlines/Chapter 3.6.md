# Chapter 3.6 — Fetch and live streams

## Chapter framing

Chapter 3.1 named the request lifecycle from URL bar to interactive page. Chapter 3.2 named HTTP — methods, status codes, headers — as the contract every request rides. Chapter 3.3 named URLs and origins. Chapter 3.4 named cookies as the credential the browser replays automatically. Chapter 3.5 named the DOM and the event model. This chapter installs the application-side API that does the work — `fetch` and the four primitives that come with it (`Request`, `Response`, `Headers`, `FormData`) plus `ReadableStream` as the body shape — and the streaming pattern that the modern SaaS UI reaches for when a single request needs to surface progress over time (export job progress, LLM token streams, live activity feeds, deploy logs).

The senior framing: **`fetch` is the universal HTTP client of the 2026 stack, isomorphic between Node and the browser, and built on stream-based request and response bodies whose senior reach is to pipe rather than buffer.** The student writes `fetch` against the SaaS's own server (where the framework's `cookies()` and `headers()` are the more typical surface — full treatment in Unit 5.5 and Unit 7.5) and against the small set of third-party APIs the course will reach for (Stripe in Unit 12.2, Resend in Unit 8.1, Trigger.dev in Unit 13.1, Cloudflare R2 in Unit 13.3). Every one of those calls goes through a fetch in some form. The student leaves this chapter able to construct any HTTP request as a `Request` object, read any response through the four body-consumer methods, build a multipart form upload through `FormData`, attach an `AbortSignal`, and (the chapter's primary payoff) consume a server-sent event stream from a Next.js Route Handler that emits progress over a long-running operation.

The chapter ships two teaching lessons plus the quiz. The TOC's two-bullet slicing holds — each lesson installs a distinct mental model and fits comfortably under an hour. Lesson 3.6.1 installs `fetch` and its four classes (`Request`, `Response`, `Headers`, `FormData`) at the depth a senior reaches for them in 2026 code; it names `ReadableStream` as the body shape and uses the four body-consumer methods (`.json()`, `.text()`, `.formData()`, `.arrayBuffer()`/`.blob()`) at face value. Lesson 3.6.2 cashes in `ReadableStream` as the chapter's payoff — chunked transfer encoding, the `text/event-stream` content type and the SSE format, the senior decision between SSE / WebSockets / polling, the `EventSource` API, the `fetch`-plus-streams alternative for POST and custom headers, and the Next.js Route Handler shape that emits the stream from the server. The quiz closes the chapter and Unit 3's outbound-to-the-network treatment.

Threads that must run through every lesson:

- **`fetch` is the universal client of the 2026 stack.** The Fetch standard ships in every browser and in every modern Node runtime (Node 18+ native, no `node-fetch` import). The course's stack runs on Node 24 LTS where `fetch` is the platform default. The student writes the same `fetch` call on both sides of the boundary — a Server Component fetching from a third-party API, a Client Component fetching from the SaaS's own Route Handler, a Route Handler fetching from Stripe. The signature, the `Request` object, the `Response` object, the body methods are identical. The legacy alternatives (`XMLHttpRequest`, `axios`, `request`, `got`, `node-fetch`) get a one-line dismissal at the lesson opener with the trigger that would flip the choice; for the course's purposes, the trigger is never met.
- **The 2026 senior rarely writes `fetch` against their own backend.** The framework's surface — Server Component data fetching through Drizzle directly (Unit 6.3), Server Actions for mutations (Chapter 7.2), Route Handlers for the rare API-shaped endpoint (Chapter 7.5) — is the call site for first-party data. The student writes a *direct `fetch` to their own server* only when a Client Component needs to talk to a Route Handler that's exposed for a specific reason (a streaming SSE endpoint that emits over time, a public API for a partner integration, a third-party webhook receiver). The chapter names this seam plainly: the rest of Unit 3 and Units 4–7 install the framework primitives; this chapter installs the lower-level surface those primitives use under the hood and that the student writes directly only where the trigger applies.
- **Request and response bodies are streams, not strings.** This is the load-bearing reframing of the chapter. A `Response` body is a `ReadableStream<Uint8Array>` that the browser delivers chunk by chunk as bytes arrive. The four body-consumer methods (`.json()`, `.text()`, `.formData()`, `.arrayBuffer()`, `.blob()`) are convenience wrappers that drain the stream into a single value and return it. The senior knows the stream is the primitive and the consumers are the conveniences; when a long response is taking 30 seconds to arrive and the UI should show progress, the stream is what the senior pipes through instead of awaiting the consumer. Lesson 3.6.2 cashes this in.
- **Parse, validate, fail — every body crossing the wire goes through Zod.** Chapter 2.9.1 named the discipline; this chapter is one of its primary call sites. The pattern is `const raw = await response.json()` returns `unknown`, then `const parsed = Schema.parse(raw)` (or `safeParse` at the framework boundary). The senior reach: never trust the wire's shape; every `.json()` is followed by a Zod parse. Full schema-authoring discipline lands in Chapter 7.1; this chapter writes the parse step in every snippet and names the discipline at the seam.
- **Errors at the fetch boundary are not what students expect.** A `fetch` that gets a `404` or `500` from the server still *resolves* — the `Response` object's `.ok` is `false`, `.status` is `404`. A `fetch` rejects only on a network failure: DNS failure, TCP reset, the request was cancelled (`AbortError`), CORS blocked the response. The senior reflex: every `fetch` is followed by an `if (!response.ok)` check; the error branch reads the body for an RFC 9457 Problem Details JSON (Chapter 3.2.2). Default to throwing a typed error or returning a `Result` shape per Chapter 7.2.2.
- **`AbortSignal` is the cancellation primitive `fetch` speaks.** Chapter 2.7.4 installed `AbortController` and `AbortSignal`. Every `fetch` call in the chapter passes `{ signal }` — either an `AbortSignal.timeout(ms)` for any server-to-server call, an `AbortSignal.any([userSignal, AbortSignal.timeout(ms)])` for a user-cancellable upload, or `request.signal` from a Route Handler's `Request` object so a client disconnect tears down in-flight work. The lesson cashes in the chapter 2.7 thread.
- **The `Headers` class is case-insensitive and immutable on `Request`/`Response` by default.** The 2026 senior reads a header through `headers.get('content-type')` and writes one through `headers.set('authorization', 'Bearer ...')`. Both `Request` and `Response` constructors copy the headers into an internal map; mutating `request.headers` after construction throws in modern browsers (the headers are `guarded` per spec — Chapter 3.2.3 named this). The `getSetCookie()` method (the only multi-valued header that gets special treatment) is named once at the boundary with cookies.
- **`FormData` is the multipart-encoding surface and the React 19 form contract.** Chapter 7.3.2 owns the React form-side; this chapter installs the network-side: `FormData` is the class the browser uses to serialize a `<form>` submission, and `fetch(url, { method: 'POST', body: formData })` sets the right `Content-Type` (with the boundary token) automatically. The Server Action signature `(formData: FormData)` is the same `FormData` class. The student writes `new FormData()` to construct one programmatically and `formData.append('name', value)` to add fields.
- **JSON vs. `FormData` vs. URL-encoded vs. multipart — the body-encoding decision.** Four wire encodings the chapter names with the trigger for each. JSON (`Content-Type: application/json`, `body: JSON.stringify(payload)`) is the senior default for any structured payload going to an API the application owns or a third-party JSON API. `FormData` is the reach when files are part of the payload (the browser handles the multipart boundary) and when integrating with the React 19 form pattern. URL-encoded (`new URLSearchParams(...).toString()`) is the reach for the few legacy APIs and for OAuth token endpoints (the OAuth 2.0 spec mandates `application/x-www-form-urlencoded`). Raw bytes (`Blob`/`ArrayBuffer`/`Uint8Array`) is the reach for file uploads to S3/R2 presigned URLs (Chapter 13.3) and for byte-level streaming.
- **Streaming is a first-class shape, not a special case.** Lesson 3.6.2's deliverable. The student leaves able to recognize three orthogonal streaming concepts that the chapter teases apart: chunked transfer encoding (HTTP-level, how bytes arrive over the wire), `ReadableStream` (the JavaScript surface to those bytes), and Server-Sent Events (the `text/event-stream` content type with a defined message framing on top of chunked transfer). The senior knows that "the response streams" can mean any of three things at three different layers and names the layer when discussing the design.
- **SSE is the 2026 default for one-way server-to-client live data.** Polling is the wrong default — it wastes RTTs and battery. WebSockets are the wrong default — they need a separate connection lifecycle, separate auth, separate framing, and a separate scaling story (sticky sessions on the load balancer, a Redis-backed pub/sub for fan-out, a heartbeat protocol). SSE rides on plain HTTP, multiplexes over HTTP/2 and HTTP/3, traverses every CDN and proxy without configuration, handles reconnection automatically through the browser's `EventSource`, and is the de facto transport for LLM token streams, deploy logs, export progress, and live notification deliveries in 2026. The trigger that flips the choice is real bidirectional streaming (a collaborative editor, a multiplayer game, a financial trading terminal) — and even those frequently use SSE plus a `POST` API for the client-to-server channel.
- **The `EventSource` API has constraints the senior names.** `EventSource` is GET-only, cookies-only for auth (no custom headers on the initial connection), no body. The senior trigger to drop `EventSource` and use `fetch` with `ReadableStream` instead: any of those constraints fails. The canonical case the lesson installs: an authenticated POST endpoint that returns an `text/event-stream` response — `fetch` with a `Bearer` header is the reach; the response body's `ReadableStream` is parsed manually (or with `eventsource-parser`).
- **Senior anchors for later units are seeded here.** The `fetch` signature lands again at every third-party integration — Stripe (Chapter 12.2), Resend (Chapter 8.1), Cloudflare R2 presigned PUT/GET (Chapter 13.3), Better Auth's OAuth provider callbacks (Chapter 9.3.8), Trigger.dev's API (Chapter 13.1). The `Request` and `Response` classes land at every Next.js Route Handler signature (Chapter 7.5.1). The `FormData` class lands at the native React 19 form pattern (Chapter 7.3.2). The `ReadableStream` body shape lands again at Suspense-driven streaming SSR (Chapter 5.3.2 — different layer, same primitive at the HTTP wire). The SSE pattern lands again at the LLM token streaming surface in the AI SDK (Chapter 23.2). The error-shape discipline (`.ok`, `.status`, RFC 9457 Problem Details) lands at the canonical Server Action Result return (Chapter 7.2.2) and the route handler error model (Chapter 7.5).

This chapter ships short `fetch`-shaped code snippets, a handful of `ScriptCoding` blocks that exercise the API surface, and one `ReactCoding`-or-`ScriptCoding` block for the SSE consumer. Diagrams carry weight: a hand-authored SVG anatomy of a `fetch` call (the four pieces — URL, options, request, response — labeled), a `DiagramSequence` walking the request and response bodies as streams of chunks, a Mermaid sequence for the SSE handshake and message flow, and a `TabbedContent` block for the SSE-vs-WebSockets-vs-polling decision. The chapter is meaningful on its own — by the end the student writes any `fetch` call with the senior shape (Zod-validated JSON body, `AbortSignal` for cancellation, `if (!response.ok)` error branch), consumes a multipart `FormData` upload, and wires a Next.js Route Handler that emits SSE progress for an export-style operation with a Client Component reading it through `EventSource` (or `fetch` for the authenticated variant).

The chapter ordering follows the dependency. Fetch fundamentals come first because streaming is a refinement of the body model fetch installs; you can't reason about a streamed response without naming `ReadableStream` as the body shape. Streaming comes second because it's the chapter's primary payoff and lands on the model the first lesson installed. The quiz closes the chapter.

---

## Lesson 3.6.1 — The universal HTTP client

Write any `fetch` call with the senior shape — `Request`, `Response`, `Headers`, `FormData`, the body consumer methods, `AbortSignal.timeout`, the `if (!response.ok)` branch, and the Zod parse on the success path.

Topics to cover:

- The chapter-opening senior question: the student needs to call the SaaS's own Route Handler from a Client Component to trigger a job, then call Stripe's API from a Server Action to create a checkout session, then receive a webhook on a Route Handler where they read the request body and validate a signature. All three call sites speak HTTP. What's the universal API surface the senior writes against, and what's the shape that makes the three sites look like the same code? The answer is `fetch` plus its four standard classes — `Request`, `Response`, `Headers`, `FormData` — and the body-consumer methods that drain a stream into a value. The lesson installs the surface at the depth that lets the student write the three sites by reflex and recognize the underlying primitive on every later integration.
- **The Fetch API in one paragraph.** `fetch(url, options?)` returns a `Promise<Response>` that resolves when the response *headers* have arrived (the body may still be streaming in). The signature is identical between the browser, Node 18+, and every modern runtime — Cloudflare Workers, Deno, Bun — the API is part of the WHATWG Fetch standard, not a library. The 2026 senior default is `fetch` for every HTTP client need; the legacy alternatives (`XMLHttpRequest`, `axios`, `node-fetch`, `got`, `request`) get a one-line dismissal — `axios` had a place in 2019 for default error throwing and interceptors; in 2026, the senior writes a small wrapper or uses `ofetch` (the `unjs` ecosystem's small layer over `fetch`) when the application's call shape demands it, and ships `fetch` directly otherwise.
- **The two call shapes**, named at the surface:
  - **The simple shape.** `fetch(url, { method, headers, body, signal, credentials, cache })`. The first argument is a URL string or a `URL` object; the second is an options bag. The 2026 senior default for one-off calls.
  - **The `Request`-object shape.** `fetch(new Request(url, options))`. The first argument is a constructed `Request` object that bundles all the options. The senior reach when a request needs to be passed around as a value (a middleware chain, a retrying wrapper, a request that's logged before send). The two shapes are interchangeable — `fetch(request)` and `fetch(url, options)` produce the same network call.
- **The `Request` class as the request-as-value.** The constructor `new Request(url, options)` takes the same options as `fetch` and stores them on properties: `request.url`, `request.method`, `request.headers`, `request.body`, `request.signal`. The senior reach for the class:
  - **Inside a Route Handler** — Next.js passes a `Request` object as the first argument to every `route.ts` handler. The handler reads `request.method`, `request.url`, `await request.json()` (or `request.formData()`), `request.signal` for cancellation. The class is the same one `fetch` uses; the surface is symmetric.
  - **Inside a webhook receiver** — the same `Request` class. Reading the raw body for signature validation is `await request.text()` (or `request.arrayBuffer()` when the signature is computed over bytes). Chapter 12.1 owns the depth.
  - **Inside a middleware/proxy chain** — pass the `Request` through, possibly mutating headers, before forwarding to the next handler. Chapter 5.5 owns the depth.
  - **As a request value the application logs** — construct a `Request`, log its details, then pass to `fetch`. The 2026 senior reach: logging the `Request` (with sensitive headers redacted) gives a single canonical representation that's identical across runtimes.
- **The `Response` class as the response-as-value.** Every `fetch` resolves to a `Response`. The surface:
  - **`response.status`** — the HTTP status code (a number, `200`, `404`, `500`). Chapter 3.2.2 owns the semantic mapping.
  - **`response.ok`** — a boolean, `true` if `status` is in `200-299`, `false` otherwise. The senior reach for the success branch: `if (!response.ok) { ... handle error ... }`.
  - **`response.statusText`** — the textual status phrase. Often empty on modern HTTP/2 and HTTP/3 (the spec omits it). Don't rely on it.
  - **`response.headers`** — a `Headers` object (see below). Read with `response.headers.get('content-type')`.
  - **`response.url`** — the final URL after redirect following.
  - **`response.redirected`** — boolean, `true` if at least one redirect was followed.
  - **`response.type`** — the response type per the Fetch spec: `'basic'` (same-origin), `'cors'` (cross-origin with CORS), `'opaque'` (cross-origin without CORS — the body is not readable), `'opaqueredirect'` (a manual-mode redirect response). The senior reach: an `opaque` response is the symptom of a cross-origin fetch that the server didn't CORS-authorize (Chapter 3.3.3).
  - **The body consumer methods** (see below).
- **The body consumer methods** — the four ways to drain a `Response` body into a value:
  - **`await response.json()`** — drain the body, parse as JSON, return as `unknown`. The senior default for any JSON API response. Type-annotate with the Zod-parsed result, not the `.json()` return value; never trust the wire's shape. Calling `.json()` twice on the same response throws — the body stream is single-use.
  - **`await response.text()`** — drain the body as UTF-8 text. The senior reach for HTML responses, plain-text endpoints, and webhook bodies the signature is computed over (Chapter 12.1.1 — the canonical Stripe pattern).
  - **`await response.formData()`** — drain a multipart or URL-encoded body into a `FormData` object. The senior reach inside a Route Handler whose `Content-Type` is `multipart/form-data` or `application/x-www-form-urlencoded` — the framework's Server Action wrapper does this internally for `<form action={serverAction}>` (Chapter 7.3.3).
  - **`await response.arrayBuffer()`** — drain the body as a binary `ArrayBuffer`. The senior reach for binary payloads, signature verification over raw bytes, and the underlying primitive when the others don't fit.
  - **`await response.blob()`** — drain the body as a `Blob` (a file-shaped binary value). The senior reach for file downloads from the browser. Chapter 3.7.4 owns the `Blob` / `File` / `URL.createObjectURL` triplet.
  - **The body as a `ReadableStream`** — `response.body` is the underlying `ReadableStream<Uint8Array>`. The consumer methods are conveniences that drain it. The senior reach when streaming is the lesson — Lesson 3.6.2 cashes this in.
- **The single-use body rule.** Every `Response` (and `Request`) body is a `ReadableStream` that can be read exactly once. After `await response.json()`, calling `response.text()` throws. The senior reach when the body needs to be read more than once: `response.clone()` returns a copy with a separate body stream (the bytes are buffered internally — not free). The canonical sites for `clone`: logging a response body before passing it on, computing a webhook signature over the raw bytes before parsing as JSON.
- **The `Headers` class as the case-insensitive header map.** The class is shared between requests and responses. Construction: `new Headers({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token })` from an object literal, `new Headers([['x-foo', 'bar'], ['x-baz', 'qux']])` from an array of pairs, or `new Headers(otherHeaders)` to copy. The surface:
  - **`headers.get(name)`** — returns the value or `null`. Case-insensitive — `headers.get('Content-Type')` and `headers.get('content-type')` return the same value.
  - **`headers.set(name, value)`** — replaces any existing value.
  - **`headers.append(name, value)`** — adds without replacing. The reach for `Set-Cookie` (multiple values) — though `Set-Cookie` is the only header where appending multiple values is the correct shape, and `getSetCookie()` is its dedicated reader.
  - **`headers.delete(name)`**, **`headers.has(name)`** — the remaining surface.
  - **Iteration** — `for (const [name, value] of headers)` walks every entry; `headers.entries()`, `headers.keys()`, `headers.values()` are the explicit iterators.
  - **`headers.getSetCookie()`** — the only multi-valued header API the spec exposes (Chapter 3.2.3 named this; the `Set-Cookie` header is the only one HTTP forbids from collapsing into a single comma-separated value). Returns an array of `Set-Cookie` values. The senior reach when reading `Set-Cookie`s off an incoming response (rare in application code; the framework's cookie helper handles it).
- **The senior request shape**, walked one example at a time. Three canonical sites:
  - **A JSON `POST` from a Server Action to a third-party API.**
    ```ts
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new StripeError(await response.text(), { status: response.status });
    }
    const session = StripeCheckoutSession.parse(await response.json());
    ```
    The annotations the lesson names: the `Authorization` header pattern, the URL-encoded body Stripe specifically requires (the senior watch-out — Stripe's API uses URL-encoded, not JSON), `AbortSignal.timeout` as the universal server-to-server timeout, the `!response.ok` check, the Zod parse on the success path. Chapter 12.2 owns the depth; this lesson installs the shape.
  - **A JSON `POST` from a Client Component to a Route Handler.**
    ```ts
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, customerId }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const problem = await response.json();
      throw new ApiError(problem);
    }
    const invoice = InvoiceSchema.parse(await response.json());
    ```
    The watch-out the lesson names: the senior reach for first-party data is a Server Action, not a `fetch` to a Route Handler — this site exists because the example needs a `fetch`; the actual production pattern is `<form action={createInvoice}>`. Chapter 7.5.1 owns the route-handler trigger.
  - **A multipart `POST` with a file.**
    ```ts
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', userId);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });
    ```
    The annotations: no explicit `Content-Type` header — the browser sets it (`multipart/form-data; boundary=...`) and computes the boundary token; setting it manually breaks the request. The lesson names this load-bearing watch-out at the call site.
- **The `FormData` class as the form-encoding surface.** The class the browser uses to serialize a `<form>` submission and the contract the React 19 form pattern speaks (Chapter 7.3.2 owns the depth):
  - **Construction.** `new FormData()` for an empty instance; `new FormData(formElement)` to initialize from a DOM `<form>`. The latter walks the form's fields and includes every named input.
  - **Writing.** `formData.append(name, value)` adds a field. `formData.set(name, value)` replaces all values for the name. `formData.delete(name)` removes. `formData.append('file', fileBlob, 'optional-filename.png')` adds a file; the third argument overrides the filename.
  - **Reading.** `formData.get(name)` returns the first value (a `string` or a `File`); `formData.getAll(name)` returns all values. `formData.has(name)`. `formData.entries()` for iteration.
  - **As a `fetch` body.** `fetch(url, { method: 'POST', body: formData })`. The browser handles `Content-Type` and the boundary; the developer must not set `Content-Type` manually.
  - **The wire encodings.** `FormData` serializes as `multipart/form-data` when files are present, as `application/x-www-form-urlencoded` is *not* a `FormData` encoding by default (browsers always pick multipart). The senior reach for URL-encoded bodies is `new URLSearchParams(...).toString()` with `Content-Type: application/x-www-form-urlencoded` set explicitly.
- **The `body` shape — what `fetch` accepts.** The `body` option in `fetch` accepts five concrete types:
  - **A string** — sent as UTF-8 bytes; the developer sets the `Content-Type` header.
  - **A `URLSearchParams`** — sent as URL-encoded bytes; `Content-Type` is set to `application/x-www-form-urlencoded` automatically.
  - **A `FormData`** — sent as multipart; `Content-Type` (with the boundary) is set automatically.
  - **A `Blob`**, **`ArrayBuffer`**, **`Uint8Array`** — sent as raw bytes; the developer sets `Content-Type` (typically `application/octet-stream` or the file's MIME type). The reach for presigned PUT uploads to S3/R2 (Chapter 13.3).
  - **A `ReadableStream`** — streamed as bytes. The reach for genuinely streamed uploads (rare; the canonical site is `fetch(url, { method: 'PUT', body: file.stream(), duplex: 'half' })` for a large file upload that should stream rather than buffer). The `duplex: 'half'` option is mandatory for streamed request bodies as of 2024+; named once.
- **The `headers` option** — the developer-facing surface that becomes the `Headers` object internally. Accepts an object literal, an array of pairs, or a constructed `Headers` instance. The senior pattern: an object literal for clarity unless headers are computed (in which case a `Headers` instance is constructed and mutated, then passed in).
- **The `cache` option in `fetch`.** The fetch spec's HTTP cache directive. Five values: `'default'`, `'no-store'`, `'reload'`, `'no-cache'`, `'force-cache'`, `'only-if-cached'`. Mostly invisible to application code on the SaaS side because Next.js extends `fetch` with its own cache semantics (Chapter 5.4 owns the depth — the `use cache` directive, `cacheLife`, `cacheTag` are Next.js's surface). Named here for recognition: a `fetch(url, { cache: 'no-store' })` inside a Next.js component opts out of Next.js's caching for that call.
- **The `credentials` option** — controls cookie attachment:
  - **`'same-origin'`** (the default) — cookies are sent only on same-origin requests.
  - **`'include'`** — cookies are sent on cross-origin requests too. Required for any cross-origin authenticated fetch (Chapter 3.3.3 named this); the server must respond with `Access-Control-Allow-Credentials: true` and a non-wildcard `Access-Control-Allow-Origin`.
  - **`'omit'`** — cookies are never sent. The reach for explicitly anonymous calls.
  - The senior watch-out: the default is `same-origin` since 2018; older code might assume `omit` from pre-2018 behavior. The 2026 default is right for the SaaS case (same-origin requests carry cookies; cross-origin require explicit opt-in).
- **The `redirect` option** — `'follow'` (the default), `'error'` (reject on redirect), `'manual'` (return the redirect response opaquely). The senior reach for the default; `'manual'` is used in middleware/proxy chains where the redirect should be forwarded to the client unchanged.
- **The `mode` option** — `'cors'` (the default for cross-origin), `'no-cors'` (an opaque response is acceptable), `'same-origin'` (refuse cross-origin). Rarely set in application code; named for completeness.
- **The fetch error model**, named at the depth that lands here:
  - **`fetch` does not reject on HTTP error status.** A `404` or `500` from the server resolves the Promise with a `Response` whose `.ok` is `false`. The senior reflex: every `fetch` has an `if (!response.ok)` check after the await.
  - **`fetch` rejects on network failure.** DNS resolution failed, TCP reset, the request was cancelled (`AbortError`), CORS blocked the response. The rejection is a `TypeError` (or `DOMException` for cancellation). The catch handler discriminates: `if (error instanceof DOMException && error.name === 'AbortError')` — user cancelled, not a failure; `else if (error instanceof TypeError)` — network failure, retry or show offline state.
  - **The RFC 9457 Problem Details response body.** When the server returns an error with a JSON body in the `application/problem+json` content type, the body has a defined shape (`type`, `title`, `status`, `detail`, `instance`). Chapter 3.2.2 named this; the senior consumer reads the body when `.ok` is false, parses with a Zod schema, and surfaces the `detail` to the user-message channel (Chapter 17.1).
  - **The retry / backoff decision.** The senior reach for transient failures (network errors, 5xx, 429 with `Retry-After`): a small retry-with-exponential-backoff helper. The course doesn't ship one in this chapter; named in one paragraph with the trigger (server-to-server calls to flaky third parties — Stripe webhooks acknowledging, Resend send failures). Trigger.dev's durable retries (Chapter 13.1) are the senior reach for the harder shape.
- **`AbortSignal` integration with `fetch`** — Chapter 2.7.4 owns the depth; the recap:
  - `fetch(url, { signal: AbortSignal.timeout(5_000) })` — the universal server-to-server timeout. The runtime owns the timer; no `setTimeout` cleanup.
  - `fetch(url, { signal: AbortSignal.any([userSignal, AbortSignal.timeout(30_000)]) })` — the canonical user-cancellable-with-timeout pattern (a file upload, a long-running generation).
  - `fetch(url, { signal: request.signal })` inside a Route Handler — passes the client's disconnect signal down to the outbound call so a client disconnect tears down the entire chain.
  - **The 2026 senior default for any server-to-server `fetch` is a timeout.** A `fetch` without a signal can hang for the runtime's default timeout (often unlimited or platform-bounded at 5-15 minutes). The reflex: every fetch outside a user-initiated UI action gets `AbortSignal.timeout(...)`.
- **Isomorphic `fetch` — Server Component, Server Action, Client Component, Route Handler — same API.** The lesson names the call sites where the student writes `fetch` directly:
  - **Server Component fetching from a third-party API.** `const data = await fetch('https://api.example.com/...', { signal: AbortSignal.timeout(5_000) }).then(r => r.json())`. Next.js's `cache` semantics layer on top — Chapter 5.4 owns the depth.
  - **Server Action fetching from a third-party API.** Same call shape; the action's `Result` return wraps the success/error split.
  - **Route Handler fetching from a third-party API.** Same call shape; the route's `Response` return wraps the result.
  - **Client Component fetching from a Route Handler.** `await fetch('/api/...')` with relative URL (the browser resolves against the current origin). The same-origin cookie default carries the session automatically.
- **The watch-outs a senior names**:
  - **Setting `Content-Type` manually on a `FormData` body breaks the upload.** The boundary token must match the actual multipart body; only the browser knows it. Always omit `Content-Type` when `body` is a `FormData`.
  - **`response.body` is a `ReadableStream`, not a Promise.** `await response.body` doesn't work the way `.json()` does — it returns the stream itself, which the caller must drain. Lesson 3.6.2 cashes this in; named here for the watch-out.
  - **`await response.json()` on a non-JSON response throws.** The senior reach when the response type is unknown: check `response.headers.get('content-type')` first, or `await response.text()` and parse with a `try/catch`.
  - **A `Response` from `Response.json(...)`** — the static constructor `Response.json(data, init?)` creates a `Response` with the data serialized to JSON and `Content-Type` set automatically. The senior reach inside a Route Handler when returning a JSON response. The dual on the request side is `Response.redirect(url, status?)` for redirects and `Response.error()` for a network error response (rare).
  - **The `Request` and `Response` constructors take a body that may need to be consumable later.** Constructing `new Request(url, { body: stream })` and then reading `request.body` again drains the stream; clone the request first if both sides need access.
  - **Streaming a request body requires `duplex: 'half'`** as of recent Chrome and Node versions. Without it, the fetch errors. Named once; rare in application code outside large-file uploads.
  - **Cross-origin opaque responses are unreadable.** A `mode: 'no-cors'` fetch or a CORS-failed fetch returns a `Response` whose `.body` is `null`, `.status` is `0`, `.headers` is empty. The senior reach: never use `mode: 'no-cors'` in application code; if the response needs reading, the server has to CORS-authorize.
  - **`fetch` doesn't time out by default.** The platform may impose its own limit (Vercel's function timeout, the browser's tab-suspension on background tabs), but the API itself doesn't. The senior reflex: every server-to-server fetch has an explicit `AbortSignal.timeout`.
  - **The `Authorization` header is not forwarded across redirects to a different origin.** A fetch that gets a `302` to a different origin drops the `Authorization` header for the second request. The senior reach: handle the redirect manually (`redirect: 'manual'`) when authorization must be preserved across origins (rare in 2026 SaaS code; OAuth flows redirect through the browser, not through `fetch`).
  - **`fetch` follows redirects by default; the final URL is on `response.url`.** Useful for logging the redirect chain or for catching unexpected redirects (a login expiration that redirects the API call to the sign-in page — read `response.url` to detect).
  - **`URL`-vs-string** for the first argument — `fetch` accepts both. The senior reach: construct a `URL` object (Chapter 3.3.1) when building from parts, pass the `URL` directly to `fetch`. The result is the same; the readability is better.

What this lesson does not cover:

- The `ReadableStream` surface at depth, chunked transfer, SSE, the streaming consumer pattern (3.6.2).
- WebSockets, the bidirectional alternative (3.6.2 names the boundary; full WebSocket coverage is out of scope for the course).
- Next.js's `fetch` extension — the `cache` semantics, `cacheLife`, `cacheTag` (Chapter 5.4).
- Next.js Route Handlers — the file convention, the `route.ts` shape, the parameter types (Chapter 7.5.1).
- The React 19 `<form action={serverAction}>` pattern and how it serializes to `FormData` (Chapter 7.3.3).
- TanStack Query, SWR, or any data-fetching library — the conditional client-state surface (Chapter 16.1).
- Stripe-specific URL-encoded body shape at depth (Chapter 12.2).
- Webhook signature verification with constant-time comparison (Chapter 12.1.1, Chapter 3.7.2).
- The `Cookie` and `Set-Cookie` header surface (Chapter 3.4 owns it; named here for the cross-reference).
- `AbortController` and `AbortSignal` at depth (Chapter 2.7.4).
- Zod schemas, `safeParse`, the full validation surface (Chapter 7.1).
- The `Result<T, E>` return shape from Server Actions and route handlers (Chapter 7.2.2).
- The legacy `XMLHttpRequest` API — named in one line and dismissed.
- The `Beacon` API, `navigator.sendBeacon` — out of scope (named once if analytics ever needs it).

Pedagogical approach:

Mechanics archetype with a strong reference beat. The lesson teaches a specific API surface (the four classes plus the `fetch` function) and the senior shape — request, response, body consumer, error branch, abort — as one canonical pattern repeated across three call sites. The deliverable is recognition vocabulary plus the senior request shape as muscle memory: the student writes `fetch` with `AbortSignal.timeout`, `if (!response.ok)`, and a Zod parse on the success path by reflex.

Open with the senior question — "you need to call your own Route Handler from a Client Component, then call Stripe from a Server Action, then read a webhook body; what's the universal API?" — and a small `MultipleChoice` exercise comparing three options (a different library per call site; `axios` everywhere; `fetch` everywhere). The discrimination — the platform's `fetch` is the universal client in 2026 — frames the lesson.

A `Figure` with a hand-authored SVG renders the `fetch` call anatomy: the URL on the left, the options bag in the middle (method, headers, body, signal), an arrow to the `Request` object, an arrow over the wire, the `Response` object on the right with status, headers, body. The student sees the four primitives in one picture.

A `TabbedContent` block organizes the four body consumer methods into tabs: `.json()` (the senior default for JSON APIs), `.text()` (HTML, plain text, webhook signature inputs), `.formData()` (multipart/URL-encoded in route handlers), `.arrayBuffer()` (binary). Each tab has the canonical site and the senior trigger.

A `ScriptCoding` block puts the student in the seat. They write three `fetch` calls in sequence — a GET that reads JSON, a POST that sends JSON, a POST that sends `FormData` — each with the senior shape (`AbortSignal.timeout`, `if (!response.ok)` check, the Zod parse on the success path). The grader checks the shape: signal present, `.ok` branch reached, parse step present.

A `Matching` exercise pairs five body types with their `Content-Type` header — JSON string body (`application/json`), `URLSearchParams` body (`application/x-www-form-urlencoded`, set automatically), `FormData` body (`multipart/form-data`, set automatically with boundary), `Blob` body (caller-set, usually `application/octet-stream` or the file's MIME), raw text (`text/plain` or caller-set). The "automatic vs. manual" split locks in the `FormData`-no-manual-Content-Type watch-out.

A `Buckets` exercise sorts eight `fetch` scenarios into "rejects (network error)" vs. "resolves with `.ok = false` (HTTP error)" — DNS resolution failed (rejects), 404 from the server (resolves, not ok), CORS blocked the response (rejects), the user clicked cancel and triggered an `AbortController.abort()` (rejects with `AbortError`), the server returned 500 with a JSON body (resolves, not ok), the client lost network mid-response (rejects), the server returned 401 with `WWW-Authenticate` header (resolves, not ok), the server returned 204 No Content (resolves, ok). The discrimination locks in the load-bearing point.

An `AnnotatedCode` block walks the senior `fetch` shape — the timeout, the `!response.ok` check, the body read on the error branch, the Zod parse on the success branch, the discriminated error catch (`AbortError` vs. `TypeError` vs. unknown). The annotations name what each piece prevents.

A second `AnnotatedCode` block walks the multipart `FormData` upload — the construct, the `append`, the `fetch` body, the *no manual `Content-Type`* annotation as the load-bearing watch-out. The student sees the senior shape with the trap-and-fix highlighted.

A `CodeReview` exercise on a 40-line snippet that mixes three `fetch` calls with five seeded issues:
- A `fetch` with no `signal` (no timeout — server-to-server call can hang).
- A `fetch` to a third-party API with `body: JSON.stringify(...)` but no `Content-Type` header set (the API receives the body but doesn't know to parse it as JSON).
- A `FormData` upload with a manual `'Content-Type': 'multipart/form-data'` header (the boundary token is missing and the upload breaks).
- A `fetch` followed by `const data = await response.json()` with no `.ok` check (a 500 response is read as JSON and the parse fails or returns garbage).
- A `fetch` consumer that calls `.json()` and then `.text()` on the same response (the second call throws — the body is single-use).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. A `fetch` to `/api/does-not-exist` that returns 404 — the Promise resolves (not rejects); `response.ok` is `false`; `response.status` is `404`.
2. A `fetch` to a same-origin URL with `credentials` unset — cookies are sent (default is `same-origin`); the request carries the session.
3. A `fetch` to a cross-origin URL with `credentials` unset — cookies are *not* sent (cross-origin default is `omit`-like behavior); the request is anonymous.

The trap-and-fix shape locks in the credentials and error-shape defaults.

A `SandboxCallout` offers an interactive playground where the student fires arbitrary fetches against `https://httpbin.org` or a course-provided echo endpoint and observes the `Response` object's properties live (`status`, `ok`, headers, body). Optional; gives the student a free-play moment after the structured exercises.

Close with a `TrueFalse` round of five statements: "`fetch` rejects on HTTP 404" (false — resolves with `.ok = false`), "Setting `Content-Type` manually on a `FormData` body is required" (false — the browser sets it with the boundary; setting it manually breaks the upload), "`response.json()` can be called multiple times on the same response" (false — single-use; use `clone()` to read twice), "`fetch` follows redirects by default" (true), "A cross-origin `fetch` sends cookies by default" (false — default is `same-origin`; cross-origin needs `credentials: 'include'`). The vocabulary is locked in.

Estimated student time: 50 to 65 minutes. Load-bearing for Lesson 3.6.2, every later third-party integration (Chapter 8.1, Chapter 12.1, Chapter 12.2, Chapter 13.1, Chapter 13.3), every Route Handler (Chapter 7.5), the native React 19 form pattern (Chapter 7.3), and the canonical Server Action Result shape (Chapter 7.2.2).

---

## Lesson 3.6.2 — Streaming progress with SSE

Read response bodies as `ReadableStream` chunks, emit Server-Sent Events from a Next.js Route Handler, consume them with `EventSource` or `fetch`, and pick between SSE, WebSockets, and polling.

Topics to cover:

- The senior question: the SaaS triggers an export job that takes 30 seconds to complete. The naive shape is a `POST` that hangs for 30 seconds before returning a JSON `{ downloadUrl }` — the user stares at a spinner and the platform's function-timeout limit clips the call before it returns. The senior shape is the server emitting progress events over time on a single open HTTP response — `5% done... 22% done... 78% done... complete, downloadUrl=...` — and the UI reading each event as it arrives. What's the protocol that gives the application this shape, what's the JavaScript API on each side, and what's the decision against the WebSocket alternative. The lesson installs the three layers (chunked transfer encoding at HTTP, `ReadableStream` at JavaScript, Server-Sent Events on top), names the decision matrix against WebSockets and polling, and walks the Next.js Route Handler shape that emits SSE plus the Client Component that consumes it.
- **The three layers, named at the top of the lesson so the rest is legible**:
  - **Chunked transfer encoding (HTTP).** The HTTP/1.1 `Transfer-Encoding: chunked` mechanism that lets a server send a response body whose length isn't known up front. On HTTP/2 and HTTP/3 the explicit header is gone (the protocols frame messages natively), but the semantic — "the server sends bytes as they're ready, the client receives them as they arrive" — is the same. The application doesn't write this header itself; the runtime emits it when the response body is a stream.
  - **`ReadableStream` (JavaScript).** The Web Streams API class that represents a stream of `Uint8Array` chunks. The body of any `Response` (and `Request`) is a `ReadableStream`. The producer side writes chunks into a `ReadableStream`; the consumer side reads chunks out, one at a time, until the stream closes.
  - **Server-Sent Events (a protocol on top).** A specific `text/event-stream` content type and a defined message framing — events separated by blank lines, each event a sequence of `field: value\n` lines (the `data:` field carries the payload). On the wire it's just chunked text; the framing is a protocol on top. The `EventSource` API in the browser is the dedicated consumer.
- **`ReadableStream` — the surface a senior reaches for**:
  - **The consumer side.** Every `Response` body is one. `const reader = response.body.getReader()` gets a reader; `const { value, done } = await reader.read()` reads the next chunk (a `Uint8Array`) or signals end-of-stream. The reader has a *lock* on the stream — only one reader per stream at a time. `reader.releaseLock()` releases.
  - **The `for await...of` consumer** — `for await (const chunk of response.body)` walks every chunk. The 2026 senior reach for reading a streamed body; the `getReader().read()` form is the imperative alternative when fine control over the read loop is needed.
  - **`TextDecoder`** — chunks arrive as `Uint8Array`; the consumer typically wants text. `const decoder = new TextDecoder()` and `decoder.decode(chunk, { stream: true })` decode chunk by chunk with multi-byte UTF-8 boundary handling. The `{ stream: true }` option is load-bearing — a multi-byte character that spans two chunks would corrupt without it.
  - **`response.body.pipeThrough(transformStream)`** — pipe a stream through a `TransformStream` (a stream that transforms each chunk). The senior reach when the consumer wants to apply a parser (an SSE parser, an NDJSON parser, a binary decoder) and then consume the parsed values. Rare in application code; the canonical use is the SSE parser below.
  - **`response.body.pipeTo(writableStream)`** — pipe a stream into a `WritableStream` (a file write target, a network upload, a Worker message). The senior reach when the stream's destination is something other than a `for await` loop. Rare in 2026 SaaS application code.
- **`ReadableStream` — the producer side**:
  - **Construction.** `new ReadableStream({ start(controller) { ... }, pull(controller) { ... }, cancel(reason) { ... } })`. The `controller.enqueue(chunk)` writes a chunk; `controller.close()` signals end-of-stream; `controller.error(reason)` errors the stream.
  - **The 2026 senior reach inside a Next.js Route Handler.** Construct a `ReadableStream` in the route's body, return `new Response(stream, { headers: ... })`. The runtime streams the response to the client as the producer enqueues chunks. The lesson's primary code shape (see below).
  - **The `enqueue` / `close` discipline.** Every stream eventually closes (or errors). A stream that never closes hangs the client forever; a stream that errors propagates the error to the consumer's `read()` rejection. The senior reach inside a route handler: `try { ... enqueue ... } catch (error) { controller.error(error) } finally { controller.close() }`.
- **Chunked transfer encoding** at the HTTP-protocol depth that lands here:
  - **The mechanism on HTTP/1.1.** The server sets `Transfer-Encoding: chunked` and omits `Content-Length`. The response body is a sequence of chunks; each chunk is preceded by its size in hex followed by `\r\n`, followed by the chunk bytes, followed by `\r\n`. A zero-size chunk terminates the body.
  - **The mechanism on HTTP/2 and HTTP/3.** The transport protocols frame messages natively; the `Transfer-Encoding: chunked` header is invalid on HTTP/2 (the spec forbids it). The chunking happens at the transport layer transparently. The application doesn't see the difference — it writes to a `ReadableStream` and the runtime negotiates the transport.
  - **The browser exposes the chunks as they arrive.** The Fetch API's `response.body` `ReadableStream` emits a chunk every time the browser receives a transport frame (or a chunked-encoding chunk). The latency from "server enqueued the chunk" to "client reads the chunk" is one network RTT plus the runtime's flush cadence.
  - **The senior watch-out: middleware that buffers.** Some load balancers, proxies, and CDNs buffer the full response before forwarding (the legacy default for many setups). The 2026 reality: Vercel's edge passes chunked responses through without buffering; Cloudflare passes through with `cf-cache-status: BYPASS` or with the right headers; nginx requires `proxy_buffering off`. The bug class: the streamed response works locally but the deployed version hangs until completion. Named for recognition; the application sets `Cache-Control: no-store, no-transform` and `X-Accel-Buffering: no` (nginx's pass-through header) when the deployment target requires it.
- **Server-Sent Events** — the chapter's payoff:
  - **The protocol in one paragraph.** A response with `Content-Type: text/event-stream` and a body of UTF-8 text framed as events. Each event is a sequence of `field: value\n` lines, terminated by a blank line. The defined fields: `data:` (the payload — the only required field), `event:` (the event type — a custom string the consumer can switch on), `id:` (the event ID — the browser stores it and sends it back as `Last-Event-ID` on reconnection), `retry:` (the reconnection delay in milliseconds).
  - **The canonical message**:
    ```
    event: progress
    data: {"percent": 42, "stage": "rendering"}
    id: 17

    event: complete
    data: {"downloadUrl": "https://..."}
    id: 18

    ```
    The blank line at the end of each event is load-bearing — the parser uses it as the event terminator. A line starting with `:` is a comment (and a keepalive — see below). A `data:` line whose value is JSON is the canonical SaaS shape.
  - **The keepalive.** A long-running SSE connection that emits no events for tens of seconds may be closed by intermediate proxies. The server emits a comment (`:keepalive\n\n`) every 15-30 seconds to keep the connection alive; the client's parser ignores comment lines.
- **The Next.js Route Handler shape that emits SSE**:
  ```ts
  export async function GET(request: Request) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };
        try {
          for (let percent = 0; percent <= 100; percent += 10) {
            if (request.signal.aborted) break;
            sendEvent('progress', { percent });
            await new Promise((r) => setTimeout(r, 500));
          }
          sendEvent('complete', { downloadUrl: 'https://...' });
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }
  ```
  The annotations the lesson names: the `TextEncoder` for converting JS strings to bytes, the SSE wire format inside `sendEvent`, the `request.signal.aborted` check for client-disconnect tear-down, the `try`/`catch`/`finally` discipline for stream closure, the response headers that prevent buffering and signal the content type. The lesson teaches the shape as the canonical reach for any streamed server-to-client live data on this stack.
- **The browser-side consumer with `EventSource`**:
  ```ts
  const source = new EventSource('/api/export/stream?jobId=' + jobId);

  source.addEventListener('progress', (event) => {
    const { percent } = JSON.parse(event.data);
    setProgress(percent);
  });

  source.addEventListener('complete', (event) => {
    const { downloadUrl } = JSON.parse(event.data);
    setDownloadUrl(downloadUrl);
    source.close();
  });

  source.addEventListener('error', () => {
    // The browser handles reconnection automatically; this fires on retry attempts too.
    if (source.readyState === EventSource.CLOSED) {
      setError('Connection lost');
    }
  });
  ```
  The annotations the lesson names: the `addEventListener('event-name', ...)` pattern dispatches by the `event:` field; the `JSON.parse` step converts the `data` string back to an object; the automatic reconnection (the browser reconnects on connection drop, sends the last `Last-Event-ID` if the server set one); the `readyState` check on the error handler distinguishes "trying to reconnect" from "given up." The student wires this inside a `useEffect` with the cleanup function calling `source.close()` to prevent leaks on unmount (Chapter 4.9.2 owns the cleanup discipline).
- **The constraints of `EventSource` and when to drop to `fetch`**:
  - **`EventSource` is GET-only.** Method, body — both unavailable. A `POST` SSE endpoint can't be consumed with `EventSource`.
  - **`EventSource` doesn't support custom headers.** Authentication via a `Bearer` header in the `Authorization` header is impossible on the initial connection. Cookie-based auth works (the browser sends cookies automatically); query-parameter auth works (`?token=...` — the senior watch-out: short-lived tokens only, since query parameters often land in server logs).
  - **`EventSource` doesn't support custom credentials behavior.** Cross-origin credentialed connections work only with the `{ withCredentials: true }` option (named once) plus the server-side CORS configuration; rare in SaaS code that defaults to same-origin.
  - **When the constraints fail: use `fetch` with `ReadableStream`.** The pattern:
    ```ts
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new ApiError(response);
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      const text = decoder.decode(chunk, { stream: true });
      // parse SSE events manually, or use a parser like `eventsource-parser`
    }
    ```
    The watch-outs the lesson names: the manual SSE parser is a 30-line state machine (parse line by line, accumulate fields, dispatch on blank line). The 2026 senior reach is to use `eventsource-parser` (the npm package; ~2 KB, no dependencies) or to consume through a higher-level library when the call site warrants. Reconnection is *not* automatic with `fetch` — the consumer writes it.
  - **The Vercel AI SDK** uses this exact pattern internally (Chapter 23.2 cashes in). Its `useChat` hook hides the fetch-and-parse loop; the student knows it's there because the lesson named the pattern.
- **The decision matrix: SSE vs. WebSockets vs. polling**:
  - **Polling.** Repeated `fetch` calls on an interval. The wrong default for live data — wastes RTTs and battery, adds latency, scales poorly. The trigger that flips: small SaaS surfaces with no streaming infrastructure and infrequent updates (a notification count refreshed every 30 seconds); even those are usually better off as SSE.
  - **WebSockets.** A bidirectional, persistent connection upgraded from HTTP. The trigger that flips: real bidirectional streaming where the client also needs to send a continuous stream (collaborative editors, multiplayer games, financial trading terminals). The cost: a separate connection lifecycle, separate auth model, separate framing, sticky-session requirement on the load balancer, separate scaling story with a Redis-backed pub/sub for fan-out, separate keepalive (ping/pong frames). For most 2026 SaaS, WebSockets are the wrong reach.
  - **SSE.** The 2026 senior default for one-way server-to-client live data. Rides plain HTTP, traverses every CDN and proxy without configuration, the browser handles reconnection. The canonical sites: LLM token streams (the dominant use case), export job progress, deploy logs, live notification deliveries, multi-step task pipelines (Trigger.dev's UI streams).
  - **The decision tree**: does the client need to push a continuous stream to the server? → WebSockets. Otherwise → SSE. (Polling has no senior reach for live data in 2026.)
- **The Next.js platform constraints**, named at the depth that lands here:
  - **Function timeouts.** On Vercel's serverless functions (the Node.js runtime default), the maximum execution time is platform-tier-bounded — 60s on Hobby, 300s on Pro, 900s on Enterprise (as of 2026). A long-running SSE that exceeds the limit is killed; the client sees a connection close and reconnects. The senior reach for long-running streams: durable execution via Trigger.dev (Chapter 13.1) where the long work runs in a worker and the SSE just streams the worker's state changes.
  - **Streaming on the Edge runtime vs. the Node runtime.** Both support streaming responses. The Edge has lower cold-start and is a fit for the SSE shape; the course's stack defaults to Node (Chapter 21.3.3 names the senior call). The student writes the same `ReadableStream` code on both; the platform handles the transport.
  - **The `Connection: keep-alive` header is platform-handled.** The application sets it for clarity, but Vercel and modern HTTP servers manage the connection lifecycle.
- **The `Streams` API surface a senior recognizes** — named once for the breadth:
  - **`ReadableStream`** — the read-side stream (lesson's focus).
  - **`WritableStream`** — the write-side stream (rare in application code; the canonical use is `pipeTo`).
  - **`TransformStream`** — a paired readable + writable; the input is transformed to the output. Used for parsers, decoders, encoders. The senior reach: piping `response.body.pipeThrough(textDecoderStream).pipeThrough(sseParserStream)` — but the imperative `for await` form is usually clearer.
  - **`TextEncoderStream` and `TextDecoderStream`** — the streaming variants of `TextEncoder` and `TextDecoder`. The senior reach when piping bytes to text or vice versa. Available in Node 24+ and every modern browser.
  - **Backpressure** — the streams API handles flow control automatically (a slow consumer slows the producer through the `pull` mechanism). The application rarely writes backpressure code; named once for recognition.
- **WebSockets, in one paragraph for the boundary.** A bidirectional persistent connection over a single TCP/TLS socket, upgraded from HTTP via the `Upgrade: websocket` header. The browser surface is `new WebSocket(url)`. The trigger to reach for them is genuine bidirectional streaming; the cost is the parallel infrastructure (sticky sessions, fan-out pub/sub, separate auth). Out of scope for the course's stack in 2026 — the SaaS use cases the course covers (notifications, exports, LLM streams, deploy logs) are all one-way server-to-client and SSE-shaped. The student recognizes the API and the trigger; the wiring isn't taught.
- **The watch-outs a senior names**:
  - **`response.body` is `null` for opaque cross-origin responses and for responses with no body.** Check before consuming: `if (!response.body) throw new Error('No body')`.
  - **The SSE blank-line terminator is load-bearing.** A `data: ...\n` line without the trailing blank line is buffered by the parser indefinitely. The producer must always end each event with `\n\n`.
  - **`TextDecoder` without `{ stream: true }` corrupts multi-byte characters at chunk boundaries.** A UTF-8 character split across two chunks reads as garbage. Always use the `stream: true` option when decoding chunks one at a time.
  - **`EventSource` reconnects automatically on connection drop with exponential backoff.** The default retry interval is 3 seconds; the server's `retry: ...` field overrides. The consumer doesn't need to write reconnection logic.
  - **The server's `Last-Event-ID` is the resumption mechanism.** When the server sets `id:` on each event and the connection drops, the browser sends `Last-Event-ID: <id>` on the reconnection request; the server resumes from that point. The application implements the resumption logic — store events past the last acknowledged ID, replay on reconnect.
  - **A `fetch`-based SSE consumer doesn't reconnect automatically.** The consumer writes the retry loop; the canonical shape uses `eventsource-parser` plus a small reconnect-on-error wrapper.
  - **Stream-based responses can't have a `Content-Length` header.** The server doesn't know the length up front. The browser shows "loading" until the stream closes, but the response body's chunks are emitted as they arrive.
  - **The `Cache-Control: no-store, no-transform` header on SSE responses is load-bearing.** Without it, intermediate proxies may buffer or transform the response, breaking the streaming shape.
  - **Closing the SSE on the client matters.** `source.close()` releases the connection; without it, the connection stays open until the page unloads or the browser closes the tab. The `useEffect` cleanup pattern is the discipline.
  - **A stream that errors propagates to the consumer's `read()` rejection.** The consumer's `for await...of` loop will throw; wrap in `try`/`catch` to handle.
  - **`request.signal.aborted` inside the route handler's stream producer is the client-disconnect signal.** When the client closes the connection (the user navigated away, the tab closed, the network dropped), the signal aborts. The producer should check and break the loop, freeing server-side resources.
  - **The Vercel AI SDK streams use a custom protocol on top of SSE** (their `data` chunks carry typed messages — text deltas, tool calls, finish reasons). Named once for the forward reference; Chapter 23.2 owns the AI SDK surface.
  - **`fetch` with a streaming response body cancels through `AbortSignal`.** Calling `controller.abort()` mid-stream closes the connection and rejects the in-flight `read()` with `AbortError`. The senior reach for canceling a long-running stream from the client side.

What this lesson does not cover:

- The full `WritableStream` and `TransformStream` API surface — out of scope (named for recognition).
- WebSockets at depth — out of scope; named for the boundary.
- The Vercel AI SDK's streaming protocols and `useChat` hook (Chapter 23.2).
- Trigger.dev's task progress streams (Chapter 13.1).
- The full Suspense-driven streaming SSR model (Chapter 5.3.2 — different layer).
- Backpressure and stream throttling at depth — named once.
- Service Workers and streaming intercept — out of scope.
- HTTP/3 stream multiplexing at the transport layer (Chapter 3.1 owns the protocol surface).
- The `Last-Event-ID` resumption flow end-to-end with server-side replay storage (the canonical shape is named; full event-sourcing is out of scope).
- WebTransport, WebRTC, and other bidirectional alternatives — out of scope.

Pedagogical approach:

Concept-plus-pattern archetype. The lesson teaches a mental model (three layers: chunked transfer, `ReadableStream`, SSE) and the canonical pattern (the Route Handler producer plus the Client Component consumer) as one cohesive piece. The deliverable is the SSE pattern as a senior reflex — when the student sees a long-running operation that should surface progress, the corner of their mind hears "SSE from a Route Handler, `EventSource` on the client" and recognizes the constraint that flips the choice to `fetch`-with-streams.

Open with the senior question — "the export job takes 30 seconds; the user is staring at a spinner; what's the shape that surfaces progress over the same HTTP response?" — and a `MultipleChoice` exercise comparing four options (polling every 2 seconds for status — wrong, wastes RTTs and adds latency; opening a WebSocket — overengineered for one-way data; long-polling with a 30-second hang — fragile, server function timeout, no progress mid-call; Server-Sent Events with `EventSource` — right, the senior default). The discrimination installs SSE as the canonical reach.

A `Figure` with a hand-authored SVG renders the three layers as stacked bands: at the bottom, the HTTP transport (chunked transfer encoding on HTTP/1.1, native framing on HTTP/2 and HTTP/3); in the middle, the `ReadableStream` (chunks arriving as `Uint8Array`); on top, the SSE message framing (events with `event:`, `data:`, `id:` fields separated by blank lines). The student sees the three layers in one picture and reads them top-to-bottom as the lesson unfolds.

A `TabbedContent` block organizes the three real-time transports as a decision card. Tab 1 is SSE (the senior default for one-way live data; the canonical sites; the trigger that flips). Tab 2 is WebSockets (genuine bidirectional streaming; the cost in infrastructure; the canonical sites). Tab 3 is polling (the wrong default in 2026; named for completeness). Each tab has the cost model, the canonical use case, and the watch-out.

An `AnnotatedCode` block walks the Next.js Route Handler that emits SSE — the example from above. Annotations highlight: the `TextEncoder` for converting strings to bytes, the SSE wire format (`event:`, `data:`, `\n\n`), the `request.signal.aborted` check for client-disconnect tear-down, the `try`/`catch`/`finally` discipline that always closes the stream, the response headers (the `Content-Type`, the cache-control that prevents buffering). The student sees the senior shape as one piece.

A second `AnnotatedCode` block walks the Client Component that consumes SSE — the example from above. Annotations highlight: the `addEventListener('event-name', ...)` pattern dispatching by `event:` field, the `JSON.parse` step on the `data`, the `source.close()` on completion, the cleanup pattern that closes the connection on unmount, the automatic reconnection the browser handles.

A `ScriptCoding` block has the student write a tiny SSE producer in a worker-style function — `function* progressEvents()` that yields three events with delays, and a consumer that reads them through a manually-constructed `ReadableStream`. The mechanics of `controller.enqueue`, `controller.close`, and `for await` over the stream are concrete.

A `CodeVariants` block contrasts two consumer shapes: tab 1 is `EventSource` (the simple case — cookies-only auth, GET, automatic reconnection); tab 2 is `fetch` with `ReadableStream` and `eventsource-parser` (the conditional case — POST, custom headers, manual reconnect). The trigger annotation on each tab names what flips the choice (any of `EventSource`'s constraints failing).

A `Buckets` exercise sorts eight scenarios into "SSE with EventSource" vs. "fetch with ReadableStream" vs. "WebSockets" vs. "polling (the wrong reach)" — an export job progress stream from a Route Handler authenticated by cookies (EventSource), an LLM chat stream that needs a `Bearer` token (fetch), a collaborative document where users see each other's cursors in real time (WebSockets), a notification badge that refreshes every 30s (polling — and the senior fix is SSE), the Trigger.dev task run progress UI (SSE), the SaaS dashboard's "live activity" panel showing org-scoped events (SSE), a multiplayer game's state sync (WebSockets), a deploy log streamed from the CI/CD system (SSE). The decision practice locks in.

A `Matching` exercise pairs five SSE fields with their role — `event:` (the event type dispatched by `addEventListener`), `data:` (the payload, usually JSON), `id:` (the event ID stored as `Last-Event-ID` for resumption), `retry:` (the reconnection delay in ms), `:comment` (the keepalive ignored by the parser). The protocol vocabulary is locked in.

A `CodeReview` exercise on a 50-line Route Handler that emits SSE with five seeded issues:
- The producer emits `data: ${payload}` without a trailing blank line (events never dispatch — parser buffers indefinitely).
- The response is returned without `Cache-Control: no-store` (intermediate proxy buffers the stream).
- The producer doesn't check `request.signal.aborted` (the loop continues running after the client disconnects, wasting server resources).
- The `controller.close()` is missing in the success path (the stream hangs after the last event).
- The `data` field is set with `data: \n{ multi-line JSON }\n` (multi-line JSON would need a `data: ` prefix on each line; the senior fix is one-line JSON or a base64-encode).

The student leaves a comment per issue with the senior fix.

A `PredictOutput` exercise on three scenarios:
1. An SSE consumer with `addEventListener('message', ...)` but the producer emits `event: progress\ndata: ...\n\n` — predict whether the handler fires (no — `'message'` is the default for events without an `event:` field; explicit `event:` requires `addEventListener('progress', ...)`).
2. An SSE consumer where the connection drops mid-stream — predict the browser behavior (automatically reconnects after 3 seconds by default, sends `Last-Event-ID` if any event had an `id:`).
3. A `fetch` returning a streaming response where the consumer calls `await response.json()` instead of reading the body as a stream — predict the result (the consumer waits for the entire stream to finish, then parses; the streaming property is lost; if the body isn't valid JSON at the end — e.g., it's SSE — the parse throws).

The recognition of the protocol semantics is concrete.

An interactive widget (a small SSE simulator) shows a Route Handler producer on the left enqueueing events at intervals and a Client Component consumer on the right receiving them. The student adjusts the interval, simulates a connection drop, and observes the automatic reconnection. The model is tangible.

A `SandboxCallout` offers an interactive playground where the student wires a small SSE Route Handler + `EventSource` consumer end-to-end against the course's stack. Optional; gives the student a free-play moment.

Close with a `TrueFalse` round of five statements: "SSE supports `POST` requests with custom headers through `EventSource`" (false — `EventSource` is GET-only with cookie auth; `POST`/custom-headers requires `fetch` with `ReadableStream`), "WebSockets are the 2026 default for live SaaS data" (false — SSE is the default for one-way data; WebSockets are the conditional reach for genuine bidirectional), "The browser handles SSE reconnection automatically" (true — `EventSource` reconnects with exponential backoff; the server's `retry:` overrides), "A streamed response body has a `Content-Length` header" (false — the length isn't known up front; the response is chunked), "The `request.signal` inside a Route Handler aborts when the client disconnects" (true — the senior reach for tearing down server-side work on client disconnect). The vocabulary is locked in.

Estimated student time: 55 to 70 minutes. Load-bearing for the LLM streaming surface in Chapter 23.2 (the AI SDK's `useChat`), Trigger.dev's task progress streams (Chapter 13.1), the export job pattern in the Unit 13 project, and any future live-data surface the course adds.

---

## Lesson 3.6.3 — Quizz

Top ten topics to quiz:

1. The `fetch` signature and the two call shapes — `fetch(url, options)` vs. `fetch(new Request(url, options))`; both produce the same network call; the platform's `fetch` is the universal 2026 client across browser and Node 18+.
2. The body consumer methods — `.json()`, `.text()`, `.formData()`, `.arrayBuffer()`, `.blob()` — drain the body once (single-use); `response.clone()` for multiple reads; `response.body` is the underlying `ReadableStream<Uint8Array>`.
3. The fetch error model — HTTP errors resolve with `.ok = false`; network failures reject with `TypeError` or `DOMException`; the senior reflex is `if (!response.ok)` before consuming the body and an `error.name === 'AbortError'` discrimination at the catch.
4. The `Headers` class — case-insensitive `.get`/`.set`/`.append`/`.delete`; immutable on `Request`/`Response` after construction (`guarded`); `getSetCookie()` is the only multi-valued read.
5. The `FormData` class — `append`/`set`/`get`/`getAll`; constructed from a `<form>` or programmatically; passed as `body` to `fetch` with no manual `Content-Type` header (the browser sets the multipart boundary).
6. The four body encodings and their `Content-Type` — JSON (`application/json`, manual), URL-encoded (`application/x-www-form-urlencoded`, automatic from `URLSearchParams`), multipart (`multipart/form-data`, automatic from `FormData`), raw bytes (`application/octet-stream` or caller-set, from `Blob`/`ArrayBuffer`).
7. `AbortSignal` integration — `AbortSignal.timeout(ms)` for every server-to-server `fetch`, `AbortSignal.any([userSignal, AbortSignal.timeout(ms)])` for user-cancellable timed operations, `request.signal` inside a Route Handler for client-disconnect propagation.
8. The three streaming layers — chunked transfer encoding (HTTP, transport-handled in HTTP/2 and HTTP/3), `ReadableStream<Uint8Array>` (the JavaScript surface, consumed with `for await...of` plus `TextDecoder({ stream: true })`), Server-Sent Events (a `text/event-stream` protocol on top with `event:`/`data:`/`id:`/`retry:` fields and blank-line terminators).
9. The SSE consumer surface — `EventSource(url)` for the simple case (GET, cookie auth, automatic reconnection with `Last-Event-ID`); `fetch` with `ReadableStream` plus `eventsource-parser` when any of `EventSource`'s constraints fails (POST, custom headers, cross-origin without `withCredentials`).
10. The SSE-vs-WebSockets-vs-polling decision — SSE is the 2026 default for one-way server-to-client live data (LLM token streams, export progress, deploy logs, notifications); WebSockets are the conditional reach for genuine bidirectional streaming (collaborative editors, multiplayer games); polling is the wrong default in 2026.

---

## Total chapter time

Roughly 110 to 145 minutes across the two teaching lessons plus the quiz. The chapter fits across two short evenings — fetch fundamentals in the first sitting (60-75 minutes including the quiz orientation), streaming and SSE in the second sitting (60-80 minutes including the quiz). The student finishes the chapter able to write any `fetch` call with the senior shape (Zod-validated body, `AbortSignal.timeout`, `if (!response.ok)` error branch), construct multipart uploads through `FormData`, consume any streamed response through `ReadableStream` plus `for await`, wire a Next.js Route Handler that emits SSE for a long-running operation, consume that stream through `EventSource` for the simple case or `fetch`-with-streams for the authenticated case, and pick between SSE, WebSockets, and polling by reflex. Chapter 3.7 opens on the other side with the small surface of browser platform APIs the SaaS UI reaches for — Web Crypto, Clipboard, Blob/File, localStorage — completing Unit 3's tour of the browser substrate before Unit 4 lands on JSX and the React render model.
