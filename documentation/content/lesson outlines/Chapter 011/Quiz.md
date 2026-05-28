sources:
  11.1: Methods and the safe-to-retry contract
  11.2: Status codes and the Problem Details body
  11.3: Headers as the metadata channel
questions:
  - source: 11.2
    question: |
      A `POST /invoices` route handler runs `safeParse` on the request body. The JSON parses fine, but the schema rejects the value because `dueDate` is in the past. What status code should the response carry?
    choices:
      - text: |
          `400 Bad Request` — the request was rejected, and 400 is the generic client-fault code.
        correct: false
      - text: |
          `422 Unprocessable Content` — the body parsed cleanly but a business rule rejected the parsed value.
        correct: true
      - text: |
          `409 Conflict` — the date conflicts with the server's notion of "today."
        correct: false
    why: |
      The mental test the lesson drilled: did `safeParse` get to run? If it did, and it returned `{ success: false }`, the code is `422`. `400` is reserved for requests the server couldn't *parse* at all — malformed JSON, wrong `Content-Type`, broken structure. `409` is for state conflicts like unique-constraint violations or `If-Match` failures, not for value validation.

  - source: 11.1
    question: |
      A wallet endpoint receives `PATCH /wallets/42` with the body `{ "delta": 5 }` and the server adds 5 to the current balance on every call. The client retries the same request after a network blip. Is the endpoint idempotent?
    choices:
      - text: |
          Yes — `PATCH` is idempotent per the HTTP spec.
        correct: false
      - text: |
          No — the diff is relative, so each retry shifts the final state by another 5.
        correct: true
      - text: |
          Only if the server sets `Content-Type: application/merge-patch+json` on the response.
        correct: false
    why: |
      Idempotency travels with the *diff shape*, not the method label. A relative diff (`delta`) accumulates: five retries of the same request leave the balance 25 higher than one call. To make this endpoint idempotent the body would name an absolute target (e.g. `{ "balance": 500 }`) so every replay lands at the same final state. The "PATCH is idempotent" shorthand is really "PATCH-with-absolute-diff is idempotent."

  - source: 11.3
    question: |
      A page at `/invoices` is server-rendered, varies by the signed-in user's organization, and is reached via a sidebar link. Which `Cache-Control` value is the senior 2026 default for the response?
    choices:
      - text: |
          `public, max-age=300`
        correct: false
      - text: |
          `private, max-age=300`
        correct: false
      - text: |
          `private, no-store`
        correct: true
      - text: |
          `no-cache`
        correct: false
    why: |
      The senior default for any authenticated HTML is `private, no-store`. `private` keeps shared caches (CDNs, corporate proxies) out so user A's response can't be served to user B; `no-store` keeps the browser itself from holding onto the page, which closes the back-button-after-sign-out leak. `private, max-age=300` still lets the browser show the page after sign-out; `public` lets a CDN store and replay it across users; `no-cache` *allows* storage and only forces revalidation, which doesn't close the storage question.

  - source: 11.2
    question: |
      Pick the statements that describe correct 2026 senior defaults for status codes. (Select all that apply.)
    choices:
      - text: |
          A signed-in user requests an invoice that belongs to a different organization — the response is `404 Not Found`, not `403 Forbidden`.
        correct: true
      - text: |
          An unhandled `TypeError` bubbles to the framework boundary — the response is `503 Service Unavailable`.
        correct: false
      - text: |
          A form submission succeeds and the server redirects to a detail page the user should reach with `GET` — the response is `303 See Other` with a `Location` header.
        correct: true
      - text: |
          A successful `DELETE` that returns no body — the response is `200 OK` with an empty JSON object.
        correct: false
    why: |
      Cross-tenant access returns `404` because `403` leaks the resource's existence; the multi-tenancy unit later enforces this at the query layer. An unhandled exception is `500`, the catch-all server bug — `503` is for capacity or availability problems. `303 See Other` is the Post-Redirect-Get reflex: the browser follows with a `GET`, and the result page is safe to refresh. A successful `DELETE` with no body should be `204 No Content`; `200` with `{}` is a 200 with an empty JSON object, which middleware that expects 204 to skip body parsing can mishandle.

  - source: 11.3
    question: |
      A SaaS rate limiter behind Vercel reads the client IP from `request.headers.get('x-forwarded-for')` and uses the leftmost entry to key its bucket. What's wrong with this?
    choices:
      - text: |
          Nothing — `X-Forwarded-For` is appended in order by each proxy, so the leftmost entry is the original client.
        correct: false
      - text: |
          The leftmost entry is whatever the original client sent and can be forged; only the rightmost hop (or the value the trusted edge appended, e.g. `x-vercel-forwarded-for`) is trustworthy.
        correct: true
      - text: |
          `X-Forwarded-For` was retired by RFC 7239; the limiter should read `Forwarded` instead, which is unforgeable.
        correct: false
    why: |
      The leftmost entry of `X-Forwarded-For` is whatever the original client wrote in the request — an attacker can spoof it freely and rotate IPs through your limiter at will. The trust-the-edge rule: count proxies from the right and stop at the first untrusted hop, or read the value your trusted edge appended under a vendor name. RFC 7239's `Forwarded` is a cleaner shape but it's still client-spoofable on the leftmost entries; the trust property comes from *which hop set it*, not which header name carries it.

  - source: 11.1
    question: |
      A payments client retries `POST /payments/charge` after a network blip. The team wants the retry to be safe. Which implementation actually closes the duplicate-charge hole?
    choices:
      - text: |
          The client generates a fresh `Idempotency-Key` for each network attempt and sends it on every retry.
        correct: false
      - text: |
          The client generates one `Idempotency-Key` per logical operation, reuses it on every retry, and the server stores `(key, response)` *before* sending the response back.
        correct: true
      - text: |
          The server returns `200 OK` on the original request and `409 Conflict` on any duplicate body it sees within a minute.
        correct: false
    why: |
      The contract is: one key per logical operation (not per attempt), reused across retries, with the server persisting `(key, response)` before responding so a crash between "respond" and "persist" doesn't leave the work unrecorded. A fresh key per attempt defeats the entire pattern — every retry looks like a new operation. Body-based deduplication is fragile (clock drift, semantically equivalent but byte-different bodies) and isn't the contract Stripe, PayPal, and the IETF draft standardise.

  - source: 11.3
    question: |
      In a Next.js 16 app, which file is the right place to set the per-request CSP nonce header?
    choices:
      - text: |
          `next.config.ts` `headers()` — it's a security header and lives with HSTS and `Referrer-Policy`.
        correct: false
      - text: |
          `proxy.ts` — the nonce has to be fresh per request, so it needs request-time data.
        correct: true
      - text: |
          The route handler's `Response` — every route should mint its own nonce alongside the body.
        correct: false
    why: |
      `next.config.ts headers()` is the build-time setter for headers that are static across requests; HSTS, `X-Content-Type-Options`, and `Referrer-Policy` belong there. CSP with a per-request nonce needs fresh data on every request, which is what `proxy.ts` (Next.js 16's rename of `middleware.ts`) is for. Setting the nonce in the route handler would duplicate the work on every route and miss the pages the framework renders without one.
