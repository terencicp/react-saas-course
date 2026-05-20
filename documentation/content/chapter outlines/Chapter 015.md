# Chapter 015 — The HTTP contract every endpoint signs

## Chapter framing

Chapter 014 walked the wire from URL bar to pixels. This chapter zooms in on the message envelope itself — the method, the status code, the headers — and treats them as a contract the client and server both sign. Every endpoint a SaaS engineer writes in later units (route handlers in Unit 5, server actions in Unit 7, the Stripe webhook in Unit 12, the public route handler in Chapter 050) honors this contract, so it has to land here at HTTP depth before any framework abstracts it away.

Three threads run through every lesson. First, **the senior reads HTTP semantically, not as transport** — a method declares an intent (safe, idempotent), a status code declares a category of outcome (client fault, server fault, success), a header declares metadata for one of three audiences (browser, infrastructure, application). Second, **defaults before conditionals** — the lesson states the senior default plainly (GET for reads, 422 for validation, `Cache-Control: private, no-store` for authenticated HTML) and then names the condition that flips it. Third, **map every concept to where it appears in the 2026 stack** — Next.js route handler return shapes, Stripe's `Idempotency-Key`, Better Auth's 401 vs. 403, Upstash's `RateLimit-*` response headers — so HTTP knowledge attaches to the surface students will write against.

---

## lesson 1 of chapter 015 Methods and the safe-to-retry contract

Archetype: Concept + Pattern. Methods exist to encode two orthogonal properties — *safety* (no observable side effect) and *idempotency* (repeating the call leaves the same final state) — that together decide whether a network blip is recoverable.

Topics to cover:

- **The five-method palette.** GET, POST, PUT, PATCH, DELETE — what each declares about intent and what semantic mismatch (e.g., a GET that writes, a POST that reads) costs in caching, prefetching, and retry behavior. Brief mention that HEAD and OPTIONS exist; HEAD reappears in Chapter 073 for R2 size-of-object reads, OPTIONS in Chapter 016 for CORS preflight.
- **Safety and idempotency as the anchor properties.** Define both crisply; build the 2x2 (safe/unsafe x idempotent/non-idempotent) and place each method in a cell. Land that *idempotency is the property a retry policy reads*: a transient network error on an idempotent request is automatically retryable; on POST it is not.
- **PUT vs. PATCH.** PUT replaces the resource (idempotent — sending the same body twice yields the same final state); PATCH applies a diff (idempotent only if the diff is absolute, not relative). Name the `application/merge-patch+json` (RFC 7396) shape as the default 2026 reach when PATCH bodies need a wire format, and the `application/json-patch+json` (RFC 6902) array-of-ops form as the alternative when partial-update semantics need to be explicit.
- **The retry problem and the `Idempotency-Key` header.** Why a retried POST can charge a card twice or create two orgs. The pattern: client generates a stable UUID per logical operation, server stores `(key, response)` and returns the cached response on replay. Mention the IETF httpapi working-group draft as the standardizing force and Stripe / PayPal as the de-facto deployments. Forward-reference Chapter 067 (`event.id` for Stripe webhooks) and Chapter 047 / chapter 050 (Server Actions and public route handlers) as the four surfaces that operationalize this pattern in the course.
- **Method choice on the request line of a route handler.** Concrete: in a Next.js App Router route handler, `export async function GET / POST / PATCH` is the dispatch — picking the verb is picking the contract.
- **The body-on-GET footgun.** GET requests with bodies are not portable; intermediaries strip them. If the read needs structure, use query params; if it needs a body, it is not a read.

What this lesson does not cover:

- Server Actions as the form-submission surface (Unit 7).
- Idempotency-key storage schema and the unique-constraint pattern (Chapter 067).
- WebDAV verbs, TRACE, CONNECT, and other rarely-touched methods.
- CORS preflight mechanics (Chapter 016).

---

## lesson 2 of chapter 015 Status codes and Problem Details

Archetype: Reference/survey + Pattern. The lesson installs the status-code subset a SaaS engineer actually sends and pairs it with RFC 9457 Problem Details as the 2026 default error-body shape.

Topics to cover:

- **The 1xx/2xx/3xx/4xx/5xx classes as semantic buckets.** Brief sweep — 1xx informational (mention `100 Continue`, `101` for WebSocket upgrade, `103` Early Hints as the Next.js / CDN preload signal), 2xx success, 3xx redirection, 4xx client fault, 5xx server fault. The class is the first signal an on-call human or alerting rule reads.
- **The senior subset of 2xx.** `200 OK` for reads and updates with a body, `201 Created` paired with a `Location` header for resource creation, `202 Accepted` for fire-and-forget enqueue, `204 No Content` for successful mutations the client does not need a body for.
- **The senior subset of 3xx.** `301` vs. `308` (permanent, with `308` preserving method), `302` vs. `307` (temporary, with `307` preserving method), `303 See Other` as the POST-Redirect-GET reflex, `304 Not Modified` paired with `ETag` / `If-None-Match`. Name `307` and `308` as the modern defaults because they preserve the request method on redirect.
- **The 4xx discriminations that matter.** The reviewer's table: `400` malformed request (cannot parse), `401` not authenticated (no or bad credentials), `403` authenticated but not allowed, `404` resource not found *or* tenancy-scoped resource hidden, `405` method not allowed, `409` conflict (unique constraint, version mismatch), `410` gone, `422` validation failed (parsed but semantically invalid), `429` too many requests. Drill the three confusions: `400` vs. `422` (parse failure vs. validation failure), `403` vs. `404` (tenancy scope intentionally returns 404 to avoid existence leaks — forward-ref Unit 10), `409` for unique-constraint violations.
- **The 5xx subset.** `500` internal error (the catch-all bug), `502 / 503 / 504` as the load-balancer trio (upstream down, overloaded, upstream timeout), `507` for storage exhaustion. State the 4xx/5xx split as the **on-call paging contract**: 4xx is the client's fault and does not page; a 5xx spike is the server's fault and does.
- **RFC 9457 Problem Details as the error-body shape.** The five core fields (`type`, `title`, `status`, `detail`, `instance`), the `application/problem+json` content type, the extension-member pattern for typed `errors` arrays (the canonical Zod-issue carrier), and the stability rule that `type` URIs are the version-stable identifier the client codes against. Note RFC 9457 supersedes RFC 7807 and is backward-compatible.
- **Where Problem Details lands in the course.** Forward-ref Chapter 050 (route handler error shape), Chapter 061 (`authedRoute` 401 / 403 / 422 / 404 map), Chapter 067 (webhook 400 with `problem+json` before any business logic).
- **The status-code-and-body coherence rule.** The status code on the response line and the `status` field inside the Problem Details body must match; the body field is advisory but mismatching it confuses generic HTTP tooling.

What this lesson does not cover:

- Implementing the route handler error helper (Chapter 050).
- Building `authedAction` / `authedRoute` (Chapter 061).
- I18n of error messages (Unit 18).
- Logging and alerting on 5xx (Unit 20).

---

## lesson 3 of chapter 015 Headers as the metadata channel

Archetype: Reference/survey, organized by audience. The lesson teaches the header surface a SaaS engineer touches, and frames each header by *who reads it* — the browser, the infrastructure layer (CDN, proxy, load balancer), or the application.

Topics to cover:

- **The three audiences.** Every header is sent for someone: the browser enforces it (`Set-Cookie`, `Strict-Transport-Security`, `Content-Security-Policy`), the infrastructure layer enforces it (`Cache-Control`, `Vary`, `Content-Encoding`), or the application reads it (`Authorization`, `Idempotency-Key`, `If-None-Match`). The audience determines where the header is set in the stack (`next.config.ts` for static, `proxy.ts` middleware for per-request, route handler for response-specific).
- **Content negotiation.** `Content-Type` (what the body *is*) vs. `Accept` (what the client *wants*), `Content-Length`, `Content-Encoding` (`br`, `gzip`, `zstd` — `zstd` as the 2026 default for new traffic where supported), `Vary` as the cache-key extender (`Vary: Accept-Encoding, Cookie`), and `Accept-Language` as the locale signal Unit 18 will read.
- **Caching directives.** `Cache-Control` — `public` vs. `private`, `max-age`, `s-maxage` (CDN-only), `no-store` vs. `no-cache` (the two are not synonyms — `no-store` forbids storage, `no-cache` allows storage but forces revalidation), `must-revalidate`, `stale-while-revalidate`, `immutable` for hashed static assets. The senior defaults: `private, no-store` for authenticated HTML; `public, max-age=31536000, immutable` for hashed asset filenames; `s-maxage=N, stale-while-revalidate=M` for cacheable pages on the CDN edge. Foreshadow Next.js 16 `cacheLife` as the framework wrapper.
- **Conditional requests.** `ETag` and `Last-Modified` on the response; `If-None-Match` and `If-Modified-Since` on the follow-up request; `304 Not Modified` as the savings. The pattern fits read-mostly resources; mutations use `If-Match` for optimistic concurrency (a different reach, but worth a sentence).
- **Authorization schemes.** `Authorization: Bearer <token>` as the dominant 2026 pattern for API clients and machine-to-machine; `Authorization: Basic` as the rare reach for internal tooling; the cookie-based session as the *browser* default for first-party app traffic (Unit 9's Better Auth path), which deliberately does not use the `Authorization` header. State the rule: cookies for browser sessions, `Bearer` for programmatic clients.
- **Rate-limit signaling.** The IETF httpapi draft `RateLimit` and `RateLimit-Policy` headers (the structured-field successor to the legacy `X-RateLimit-*` set), `Retry-After` on 429 and 503 as the back-off signal the client must honor. Note the headers are not yet a finalized RFC as of May 2026 but the draft is the de-facto shape Upstash and most gateways emit. Forward-ref Chapter 079 for the `rate-limit-headers.ts` helper that lands them on responses.
- **Security-baseline headers.** Name the irreducible six — `Strict-Transport-Security`, `Content-Security-Policy` (with the nonce-and-`'strict-dynamic'` shape), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (deny-by-default), `frame-ancestors` (via CSP, retiring `X-Frame-Options`) — and the `Reporting-Endpoints` pairing for CSP and Permissions-Policy violation reports. Treat this lesson as the shape sketch; Chapter 085 owns the implementation, the report-only rollout, and the `proxy.ts` per-request nonce.
- **Request-context headers application code reads.** `Cookie`, `User-Agent`, `Referer` (with the misspelling history named), `Origin` (the load-bearing header Server Actions check for CSRF — forward-ref Chapter 058), `Host` and `:authority` under HTTP/2 and HTTP/3, the `X-Forwarded-*` family vs. the modern `Forwarded` header (RFC 7239) and the trust-the-edge rule (only the immediate proxy's hop is trustworthy).
- **The custom-header convention.** The `X-` prefix is deprecated (RFC 6648); name your application headers without a prefix or with a vendor token (e.g., `Stripe-Signature`, `X-Better-Auth-Cookie`). Stripe and GitHub are the reference shapes.
- **Where headers are set in a Next.js app.** Static headers in `next.config.ts` `headers()`; per-request headers (CSP nonce, request-id) in `middleware.ts` / `proxy.ts`; response-specific headers (`Cache-Control` per route, `Idempotency-Key` echo) in the route handler or Server Action response. Brief inline example of each layer's setter, no full file.

What this lesson does not cover:

- The full security-headers configuration with CSP nonce wiring (Chapter 085).
- Cookie attributes and the `Set-Cookie` deep dive (Chapter 017).
- CORS response headers (Chapter 016).
- The Next.js `fetch` cache and `cacheLife` API (Unit 5).
- Building the rate-limit middleware (Chapter 079).
- HTTP/2 and HTTP/3 frame-level header compression (HPACK / QPACK).

---

## lesson 4 of chapter 015 Quizz

Top 10 topics to quiz:

1. Safety vs. idempotency — placing each of the five methods in the 2x2 grid.
2. When `Idempotency-Key` is required and what the server stores against it.
3. `PUT` vs. `PATCH` and the merge-patch vs. json-patch distinction.
4. `400` vs. `422` (parse failure vs. validation failure).
5. `401` vs. `403` and when a tenancy-scoped resource returns `404` instead.
6. `307` / `308` preserving method vs. `302` / `301` not preserving it, and the POST-Redirect-GET role of `303`.
7. The five core RFC 9457 Problem Details fields and the `application/problem+json` content type.
8. `Cache-Control: no-store` vs. `no-cache` and the senior default for authenticated HTML.
9. Cookie-based sessions vs. `Authorization: Bearer` — which is the browser default and which the programmatic-client default.
10. The three-audience model for headers (browser / infrastructure / application) and where each is set in a Next.js app.
