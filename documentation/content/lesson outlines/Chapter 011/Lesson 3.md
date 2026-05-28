# Lesson 3 outline — Headers as the metadata channel

## Lesson title

- **Title (h1):** Headers as the metadata channel
- **Sidebar label:** Headers and the three audiences

The chapter-outline title nails what the lesson is for — headers carry every piece of metadata the body doesn't. Keep it. Sidebar gets the durable mental model (three audiences) so the TOC reads as a property, not a topic.

## Lesson framing — conclusions from brainstorm

**Target student.** Junior just off Lessons 1 (methods, `Idempotency-Key`) and 2 (status codes, Problem Details). Has seen `Content-Type`, `Cookie`, `Authorization` in DevTools and copied them from `curl` examples. Has never had to choose which header to send, where in the stack to set it, or who downstream is reading it. Comes in knowing `Result<T>`, Zod 4, the route-handler shape (one async function per method), Better Auth cookie sessions (as concept), and the Next.js 16 file-system conventions (`next.config.ts`, `proxy.ts`, `route.ts`). Has *not* yet implemented anything that reads or writes headers.

**What this lesson is.** A reference-survey lesson, like Lesson 2, but organised around a different spine. The catalog of headers a SaaS engineer touches is large; the durable take-away is the **three-audience model** — every header is sent for someone (the browser, the infrastructure layer, the application). The audience determines (a) where the header is set in the stack, (b) what the consequence of getting it wrong is, and (c) which lesson elsewhere in the course owns the implementation.

Student exits able to (a) name the three audiences and place an unfamiliar header into one by reasoning about who reads it; (b) pick the senior `Cache-Control` default for authenticated HTML versus hashed static assets; (c) explain why a browser session uses cookies and a machine-to-machine API uses `Authorization: Bearer`, and not pick the other way round; (d) recognise the four 2026 security-baseline header names without writing the CSP yet; (e) decide which Next.js file (`next.config.ts`, `proxy.ts`, `route.ts`) sets a given header.

**The senior frame carried through.** A header is not a free-form key-value pair the server tacks onto a response. It is **metadata addressed to a specific audience** that the audience reads and acts on. The audience is what determines where in the stack the header is set; the header's value is what determines the behaviour downstream. Pick the wrong audience and you set it in the wrong file; pick the wrong value and you leak data, break caching, or break the trust model.

**Pedagogical levers.**
- **Audience-first, then surface-within-audience.** Same shape as Lesson 2's class-first frame for status codes. The three audiences are the durable scaffold; the catalog hangs off them, not the other way round. Students who memorise headers lose them; students who internalise audiences can place new ones they meet later.
- **Defaults before conditionals.** Each section names the senior default plainly first (`Cache-Control: private, no-store` for authenticated HTML; cookies for browser sessions; `Forwarded`/`X-Forwarded-For` only as far as the immediate edge), then the carve-out in one line.
- **Trigger before tool for each header family.** Open every section with the failure mode — what breaks without this header, or with the wrong value — before naming the directive.
- **Real production stakes.** Three concrete failure scenarios carry the lesson: (a) `Cache-Control: public, max-age=...` on a logged-in user's HTML leaks one user's data into another's browser through a shared cache; (b) trusting an unverified `X-Forwarded-For` lets a hostile client spoof its IP for rate-limit bypass; (c) cookies sent with `SameSite=None` on a public Bearer-token API leaves CSRF surface open. Each gets named once.
- **The "where to set" decision tree is the closing payoff.** The lesson ends on a concrete mapping of header-family → Next.js setter (`next.config.ts headers()` for static, `proxy.ts` for per-request, route handler or Server Action response for per-response). That mapping is what the student will actually look up later when shipping.

**Common beginner traps to defuse.**
- Reaching for `Cache-Control: no-cache` thinking it means "don't cache." `no-cache` *allows* storage and forces revalidation on every read; `no-store` is the directive that forbids storage. The two are not synonyms.
- Putting `Authorization: Bearer <token>` on browser requests for a first-party app. The browser's cookie is the session vehicle for first-party browser traffic; `Bearer` is for programmatic clients (mobile, server-to-server, SDKs).
- Setting `Cache-Control: public, max-age=...` on the response of a logged-in user's page. The `public` directive lets shared caches (CDNs, corporate proxies) store and replay the response — including the next user's request. The default for authenticated HTML is `private, no-store`.
- Trusting `X-Forwarded-For` or `Forwarded` end-to-end. Only the *immediate* edge's hop is trustworthy; every earlier hop's value can have been forged by the client.
- Inventing `X-Whatever` for a custom application header. RFC 6648 deprecated the `X-` prefix in 2012; senior 2026 practice is to use a vendor-token prefix (`Stripe-Signature`, `Svix-Id`) or no prefix at all.
- Conflating `Content-Type` (what the body *is*) with `Accept` (what the client *wants*). Both can be present on the same request; they answer different questions.
- Forgetting `Vary: Cookie` on a per-user cacheable response. Without it, the CDN keys the cache on URL only, and user A's response gets served to user B.
- Setting `Content-Encoding: gzip` (or `br`, or `zstd`) by hand in a Next.js response. The platform negotiates compression for you based on `Accept-Encoding`; manually setting the encoding without compressing the body is a content-mismatch bug.

**Forward links named once each, never elaborated:**
- Cookie attributes (`HttpOnly`, `Secure`, `SameSite`, `__Host-`, `Partitioned`) and the `Set-Cookie` deep dive → Chapter 013.
- CORS response headers (`Access-Control-Allow-*`) and the preflight dance → Chapter 012.
- Next.js 16 `'use cache'` and `cacheLife` (the framework-level abstraction over `Cache-Control`) → Unit 4 (Chapter 035+).
- Building the rate-limit headers helper (`rate-limit-headers.ts`) → Chapter 075.
- Full security-baseline implementation with the CSP nonce and the report-only rollout → Chapter 081.
- `authedRoute` 401 with `WWW-Authenticate: Bearer` → Chapter 057.
- Better Auth's `__Host-` cookie hardening (`HttpOnly; Secure; SameSite=Lax; Path=/`) → Unit 8.
- Server Action `Origin` header check for CSRF → Chapter 054.
- HEAD reads on R2 object metadata → Chapter 069.

**Pre-requisite refresh, one line each (not full re-teaches):**
- HTTP message shape = request/status line + headers + body. (Chapter 010 named it; Lessons 1 and 2 referenced it.)
- A header is a `Name: value` line; names are case-insensitive; values are ASCII (modern HTTP/2 and HTTP/3 encode them as field blocks but the abstract model is the same).
- The Next.js file-system: `next.config.ts` for build-time config, `proxy.ts` (formerly `middleware.ts`) at the project root for per-request edge logic, `app/.../route.ts` for route handlers, Server Actions for form-targeted mutations.

**Estimated student time:** 40–50 minutes. This is the longest of the three teaching lessons in the chapter; the catalog is wider than the methods or status-code surface.

---

## Lesson sections

The lesson opens with a short two-paragraph introduction (no h2), then nine h2 sections, then a closing recall round.

### Introduction (no header)

Two short paragraphs.

1. **The senior frame.** Headers are not a free-form key-value bag the server attaches to a response. Each header is a piece of metadata *addressed to a specific audience* — the browser, an infrastructure layer (CDN, proxy, load balancer), or the application server — and that audience reads it and acts on it before the body is ever touched. Pick the wrong header, or the wrong value, and the audience does something you didn't intend: a CDN caches a private response, a browser refuses your cookie, a rate-limit gateway lets a forged client through.
2. **What this lesson lands.** The three-audience model as the durable scaffold; the header families a SaaS engineer actually touches (content negotiation, caching, conditional requests, authorization, rate-limit signaling, security baseline, request context, custom headers); and the closing decision tree mapping header-family to the Next.js file that sets it. Close on: "By the end you'll place any header into one of three audiences, pick the senior default, and know where in a Next.js app to set it."

### Headers have three audiences

The lesson's spine. A short framing section (~3 short paragraphs) installs the audience model.

- **What "audience" means.** Every header is sent because *someone* will read it. The someone is one of three: the **browser**, which enforces the header (sets a cookie, applies a CSP, refuses an insecure transport); the **infrastructure layer** between client and server (CDN, reverse proxy, load balancer), which acts on the header (caches a response, compresses a body, throttles a client); or the **application**, which reads the header to make a decision (which user is this, what content type to return, what rate-limit window to use). The audience is the durable property of the header — once you know who reads it, you know where to set it and what the consequence of getting it wrong is.
- **The mapping is not always one-to-one but it's never ambiguous in practice.** `Cache-Control` is mostly an infrastructure header; the browser also caches and reads it, but the design audience is intermediaries. `Authorization` is an application header; the infrastructure layer might log it but doesn't act on it. The boundary cases are small — name them when they come up, don't get stuck on edge classification.
- **Where each audience's header lives in a Next.js app, briefly.** Browser-audience headers (security baseline, `Set-Cookie`) are mostly *static* — set them in `next.config.ts` (or in `proxy.ts` when they need per-request data like a CSP nonce). Infrastructure-audience headers (`Cache-Control`, `Vary`, `Content-Encoding`) are *response-specific* — set them where the response is produced (route handler, Server Action, page metadata). Application-audience headers (`Authorization`, `Idempotency-Key`, `If-None-Match`) are mostly *read*, not written, on the server — the application reads them off the request. Forward-promise the explicit "where to set" decision tree at the end of the lesson.

**The reference diagram — a horizontal three-column strip inside `<Figure>`, built as a lesson-specific HTML+CSS component.** Component path: `src/components/lessons/011/3/HeaderAudienceStrip.astro`. Layout matches the precedent set by Lesson 2's `StatusClassStrip` (a glanceable scaffold the student rebuilds the catalog on).

Each column carries:
- The audience name (Browser / Infrastructure / Application).
- The one-line "who reads it" semantic ("the browser enforces this header" / "CDNs and proxies act on this header" / "your application code reads this header").
- A small list of 3–4 example headers per audience, written in monospace, so the student can pattern-match later:
  - **Browser:** `Set-Cookie`, `Strict-Transport-Security`, `Content-Security-Policy`, `Permissions-Policy`.
  - **Infrastructure:** `Cache-Control`, `Vary`, `Content-Encoding`, `Retry-After`.
  - **Application:** `Authorization`, `Idempotency-Key`, `If-None-Match`, `Content-Type`.

Keep it under ~180px tall. Three-column flex with `flex-wrap: wrap; column-gap: 8px; row-gap: 20px;` so it survives narrow viewports. Per `diagrams/html-css.md`, set `margin: 0` on every descendant to avoid Starlight's prose-margin injection. No outer card on the component (`<Figure>` provides the chrome).

**Buckets recognition drill — placed immediately after the diagram.** The audience model needs an active recall step so the student internalises it before the catalog begins. `<Buckets>` with three buckets, the audience names, and eight items mixing the headers from the diagram with two unfamiliar ones the student can place by reasoning.

```mdx
<Buckets instructions="Place each header with the audience that reads it.">
  <Bucket name="browser" label="Browser" />
  <Bucket name="infra" label="Infrastructure" />
  <Bucket name="app" label="Application" />

  <Item bucket="browser">`Set-Cookie`</Item>
  <Item bucket="browser">`Content-Security-Policy`</Item>
  <Item bucket="browser">`Strict-Transport-Security`</Item>
  <Item bucket="infra">`Cache-Control`</Item>
  <Item bucket="infra">`Vary`</Item>
  <Item bucket="infra">`Content-Encoding`</Item>
  <Item bucket="app">`Authorization`</Item>
  <Item bucket="app">`Idempotency-Key`</Item>
</Buckets>
```

Drill placement rationale: same pattern as Lesson 2's `Buckets` inside the 4xx h3 — a recall drill on freshly-learned material, not an end-of-lesson exercise dump.

### Content-Type, Accept, and the Vary key extender

The first content-family section. Three headers, one rule.

- **`Content-Type` vs. `Accept`.** `Content-Type` describes what the *current* body *is* (`application/json`, `application/problem+json`, `text/html; charset=utf-8`, `multipart/form-data; boundary=...`). `Accept` is the request-side header saying what the client *wants* in the response (`Accept: application/json` from a SaaS API client, `Accept: text/html,application/xhtml+xml,...` from a browser navigating). They are not the same axis: a POST request can carry `Content-Type: application/json` *and* `Accept: application/problem+json`, meaning "I'm sending JSON; if you reject me, send the error as RFC 9457." Both can be present; they answer different questions.
- **`Content-Encoding` and the 2026 compression default.** `Content-Encoding` declares how the body was compressed before being put on the wire (`br` for Brotli, `gzip` for the legacy default, `zstd` for the 2026 default where the client supports it). The client advertises support via `Accept-Encoding`; the server picks one and stamps the response with `Content-Encoding`. **`zstd` is the senior 2026 reach for new traffic** — Chrome 123+, Edge 123+, Firefox 126+, and Safari 26+ on macOS/iOS support it, Cloudflare and other major CDNs negotiate it by default, and the bytes-per-CPU ratio is materially better than Brotli for the same fidelity. Brotli stays the cross-cutting default for older client support; gzip stays the fallback. **You almost never set this header by hand** — the platform (Next.js + the deploy target) negotiates compression and stamps the encoding for you. Setting it manually without actually compressing the body is a content-mismatch bug.
- **`Vary` extends the cache key.** `Vary: Accept-Encoding, Cookie` tells a shared cache: "this response varies by the values of these request headers; key the cache on them." Without `Vary: Cookie` on a per-user response, the CDN keys the cache by URL only and user A's response gets served to user B. Without `Vary: Accept-Encoding`, the Brotli body gets served to a client that only sent `Accept-Encoding: gzip`, which can't decompress it. The 2026 reflex: any response that varies meaningfully by request header sets `Vary`. The auth-default `private, no-store` (next section) makes `Vary: Cookie` redundant when the response is never cached at all; on cacheable per-user surfaces, `Vary` is mandatory.
- **`Accept-Language` is named in one line and forward-linked.** Locale negotiation header read by Unit 17's `next-intl` setup. Mention; don't expand.

**Small `http` fence — request and response wire shape, three headers each side**, to anchor the abstract description. Single `<Code>` block, `lang="http"`, no `maxLines` cap (it's tiny).

```http
GET /api/invoices HTTP/3
Accept: application/json
Accept-Encoding: zstd, br, gzip
Cookie: session=abc...
```

```http
HTTP/3 200 OK
Content-Type: application/json
Content-Encoding: zstd
Vary: Accept-Encoding, Cookie
```

Use two consecutive fences (request then response). No prose interleaved — the prose above already explained each header.

### Cache-Control and the senior defaults

The lesson's longest section. The `Cache-Control` directive surface plus the four senior defaults.

Structure inside this h2:

- **The directive list.** `Cache-Control` is a comma-separated list of directives. The ones a SaaS engineer reaches for:
  - **`private`** vs. **`public`** — `private` means "only the client's own cache may store this" (browser cache only); `public` lets shared caches (CDNs, corporate proxies) store it too. Authenticated responses are `private`; anonymous responses can be `public`.
  - **`max-age=N`** — how long the response stays fresh (no revalidation) in seconds.
  - **`s-maxage=N`** — same as `max-age` but applies only to *shared* caches (CDN edge). Useful when you want the CDN to keep the response longer than the browser does.
  - **`no-store`** vs. **`no-cache`** — *not synonyms*. `no-store` forbids any cache from storing the response. `no-cache` *allows* storage but forces revalidation (a conditional request — next section) on every read. The default-confusion of these two is the most common cache bug.
  - **`must-revalidate`** — once a response is stale, it must be revalidated; intermediaries may not serve it stale as a fallback.
  - **`stale-while-revalidate=N`** — once stale, the cache may serve the stale response *and* asynchronously fetch the new one. Keeps p99 low at the cost of one window of stale.
  - **`immutable`** — the response will never change at this URL. Browsers may skip revalidation entirely even on reload. The marker for hashed static assets.

- **The four senior defaults.** State each plainly, in `Cache-Control` form, with the trigger.
  - **Authenticated HTML:** `Cache-Control: private, no-store`. The default for any page that varies by user identity. No shared cache may touch it; the browser must not store it either (so the back-button doesn't show signed-in content after sign-out).
  - **Hashed static assets** (filename includes a content hash, like `/_next/static/chunks/main.a1b2c3.js`): `Cache-Control: public, max-age=31536000, immutable`. One year. New deploys ship new hashes — the URL itself is the version.
  - **Cacheable HTML on the CDN edge** (marketing pages, blog posts, anything anonymous): `Cache-Control: s-maxage=300, stale-while-revalidate=86400`. Five minutes fresh on the CDN, a day of stale-while-revalidate behind it. The user always sees a fast response; the CDN refreshes in the background.
  - **API responses that change rapidly:** `Cache-Control: private, no-store`. Default for anything the client is reading on a logged-in surface and the server can't guarantee won't change.

- **Where this lands in Next.js.** Next.js 16's framework-level abstraction is the `'use cache'` directive paired with `cacheLife(...)` and `cacheTag(...)` — not `Cache-Control` written by hand. The lesson names this once: "the directives in this section are the underlying HTTP contract; Next.js 16's `'use cache'` + `cacheLife` is the framework wrapper that emits them. Unit 4 builds the wrapper. The header surface in this lesson is what the wrapper produces."

- **The shared-cache leak — the failure mode, called out (Aside type="caution").** "If you ship `Cache-Control: public, max-age=...` on a response that varies by signed-in user, a shared cache (Vercel's edge, Cloudflare, a corporate proxy) can store one user's response and serve it to another. This is the single worst cache header bug. The default for authenticated HTML is `private, no-store`. Reach for `public` only when you can prove the response is identical for every user."

- **`no-store` vs. `no-cache` comparison — `<CodeVariants>` with two tabs**, `maxLines={6}` so the tabs stay compact. The two wire shapes side by side make the distinction memorable.

  - Tab 1 — **`no-store` (forbid storage):**
    ```http
    HTTP/3 200 OK
    Cache-Control: private, no-store
    ```
    Prose: "Nothing — browser, CDN, corporate proxy — stores this response. The next request re-runs the server work. The default for anything user-specific."
  - Tab 2 — **`no-cache` (allow storage, force revalidation):**
    ```http
    HTTP/3 200 OK
    Cache-Control: no-cache
    ETag: "v1"
    ```
    Prose: "The cache may store the response, but must revalidate before serving it — a conditional request with `If-None-Match: \"v1\"`. The next section covers the revalidation flow."

  Per the `code-variants.md` guidance, the variant-specific framing is the first sentence of the prose; no header decorations on the tabs.

- **MultipleChoice — the "which `Cache-Control` for this scenario" drill.** Single-correct, three distractors. Question: "A Server Component renders an invoice list for the signed-in user at `/invoices`. The page is server-rendered, varies by `orgId`, and the client navigates here from a sidebar link. What `Cache-Control` does the response need?"
  - `public, max-age=300` (distractor — the `public` directive lets a shared cache serve user A's list to user B).
  - `private, max-age=300` (distractor — keeps it out of shared caches, but the browser's own back-button can still flash a stale signed-in list after sign-out).
  - `private, no-store` (correct).
  - `no-cache` (distractor — allows storage anywhere, forces revalidation on every read; correct semantic for some cases but not the senior default for authenticated HTML).

  `<McqWhy>`: "The senior default for any page that varies by user identity is `private, no-store`. `private` keeps shared caches out; `no-store` keeps the browser from caching it locally either, which is what closes the post-sign-out back-button leak. The other three choices each leak something — `public` to other users, `private, max-age` to the back button, `no-cache` to a degraded revalidation experience without solving the storage question."

### Conditional requests: ETag and If-None-Match

A short section (~2 paragraphs + one wire shape). The conditional-request pair completes the caching story.

- **The pattern.** The server stamps the response with `ETag: "v1"` (an opaque token identifying this version of the resource). On the next read, the client sends `If-None-Match: "v1"` in the request. If the resource hasn't changed, the server replies with `304 Not Modified` and no body. The client uses its cached copy. The savings are the body bytes — the round-trip is still paid, but the payload isn't.
- **When to reach for it.** Read-mostly resources that the client revisits — list endpoints, large JSON payloads, image metadata — that don't change often enough to justify re-shipping the body. The pattern fits naturally with `Cache-Control: no-cache` (allow storage, force revalidation), where every read is conditional.
- **The mutation cousin.** `If-Match: "v1"` on a write request implements **optimistic concurrency** — "only apply this mutation if the resource is still at version v1." If the server's current version is v2, the response is `412 Precondition Failed`. Useful for collaborative-edit surfaces; not the daily reach. One sentence, forward-link not needed.
- **`Last-Modified` and `If-Modified-Since` exist.** Same pattern with a timestamp instead of an opaque token. `ETag` is the senior 2026 default because timestamps have second-precision and can't disambiguate two writes inside the same second; ETag values are opaque to the client and the server can hash whatever shape (row version, content hash, monotonic counter) it wants.

**Small `http` fence — the four-line exchange** (request, response, follow-up request, follow-up response). Same shape as content-negotiation section.

```http
GET /api/invoices HTTP/3
If-None-Match: "v1"
```

```http
HTTP/3 304 Not Modified
ETag: "v1"
```

No exercise — the pattern is small and the section is short.

### Authorization: cookies for browsers, Bearer for machines

The application-audience section. The senior cut between the two authentication channels.

- **The two authorization channels.** The browser-authenticated session and the machine-authenticated API call live on different headers. **Cookies** (`Cookie:` on the request, `Set-Cookie:` on the response) carry browser sessions: the cookie is set once at sign-in, sent automatically on every same-origin request, and cleared at sign-out. **`Authorization: Bearer <token>`** carries machine credentials: a mobile app, a server-to-server SDK call, a public API client opaque enough to expect raw HTTP. The two are not interchangeable.
- **Why the split.** Cookies have built-in mitigations browsers have evolved over thirty years (`HttpOnly` keeps them out of JS, `Secure` requires HTTPS, `SameSite=Lax` defangs CSRF on top-level navigations, `__Host-` prefix locks the origin). Those mitigations are why first-party browser traffic uses cookies. `Authorization: Bearer` has none of them — it is a raw credential in the request, which is the right shape for *programmatic* clients that manage their own token lifecycle, but the wrong shape for a browser session that JS shouldn't be able to read.
- **Practical 2026 default.** Better Auth (Unit 8) ships the project's session as a `__Host-`-prefixed `HttpOnly; Secure; SameSite=Lax; Path=/` cookie. Public API surfaces (Chapter 046's route handlers, when called by non-browser clients) read `Authorization: Bearer <token>`. The two coexist in a SaaS — pick by who calls the endpoint.
- **`Authorization: Basic`** — one sentence. Base64-encoded `username:password`. Only safe over HTTPS, and only used in 2026 for internal tooling, admin scripts, and the occasional CI/CD job; never user-facing.
- **`WWW-Authenticate` on a 401.** The companion header on a 401 response that tells the client *which* scheme the server expects (`WWW-Authenticate: Bearer`). Forward-link to Chapter 057 for the `authedRoute` 401 mapping. One sentence.
- **Forward-link cookie attributes once.** "The deep dive on `Set-Cookie` attributes (`HttpOnly`, `Secure`, `SameSite`, `__Host-`, `Partitioned`) lives in Chapter 013."

**Senior watch-out (`<Aside type="caution">`).** "The `Authorization` header is logged by most observability tools. It contains a long-lived credential. Configure your logger's redaction list to strip it (and `Cookie:`) before any request body lands in a log line. Chapter 081 covers the redaction seam."

**Small `http` fence — two requests side by side via `<CodeVariants>` (`maxLines={6}`)**: the browser-session call vs. the machine-API call.

- Tab 1 — **Browser session (cookie):**
  ```http
  GET /invoices HTTP/3
  Cookie: __Host-session=abc...
  ```
  Prose: "Set once at sign-in by `Set-Cookie`, sent automatically on every same-origin request. The browser manages the lifecycle."
- Tab 2 — **Machine API (Bearer):**
  ```http
  GET /api/v1/invoices HTTP/3
  Authorization: Bearer sk_live_abc...
  ```
  Prose: "The SDK or HTTP client adds the header on every call. The token lives in the client's config or vault, not in a browser cookie store."

### Rate-limit signaling and Retry-After

A short section. The 2026 IETF draft is the de-facto shape; Upstash and most gateways emit it.

- **The pair.** `RateLimit` (current state) and `RateLimit-Policy` (the policy that produced it) are the two response headers the IETF httpapi working group has been standardising (draft-ietf-httpapi-ratelimit-headers, currently at -11 as of November 2025, intended Standards Track). They are **structured fields** per RFC 9651 — lists of items with parameters, not the loose `X-RateLimit-*` set the older Heroku/Twitter shape used. The 2026 senior reach is the IETF shape: Upstash, Cloudflare, and most modern gateways emit it.
- **`Retry-After` on 429 and 503.** When the server says "back off," it says how long with `Retry-After: <seconds>` (or an HTTP-date). The HTTP client is required to honor it. The 503 case is a load-balancer reach during overload; the 429 case is the rate limiter speaking.
- **The senior reflex.** On a 429, the client reads `Retry-After` and schedules a retry; on a 503, the client reads `Retry-After` and either retries or surfaces "service unavailable" depending on UX. The retry logic on 429 must be idempotency-aware (Lesson 1's `Idempotency-Key`) — retrying a POST without a key is the bug the whole lesson 1 was about.
- **Where this lands.** Chapter 075's `rate-limit-headers.ts` helper applies the IETF shape on every limited response. The lesson names the headers; the implementation lands later.

**One `http` fence — a 429 wire shape with both headers.**

```http
HTTP/3 429 Too Many Requests
RateLimit: "auth-sign-in";r=0;t=27
RateLimit-Policy: "auth-sign-in";q=10;w=60
Retry-After: 27
Content-Type: application/problem+json
```

Brief prose: "Ten requests per 60-second window, zero remaining, 27 seconds to reset. `Retry-After` says the same thing in the form the HTTP client library reads."

No exercise — short section, the catalog is the point.

### The security baseline: the irreducible six

The browser-audience section, kept as a shape sketch. The chapter outline explicitly defers implementation to Chapter 081. Lesson 3 names the six and the audience mapping; Chapter 081 wires them.

- **The six headers.** Each one with a one-line semantic — what it tells the browser, what it stops.
  - **`Strict-Transport-Security` (HSTS):** "always use HTTPS for this host, for the next N seconds, including subdomains." Closes the downgrade-to-HTTP MITM window.
  - **`Content-Security-Policy` (CSP):** "only execute scripts from these sources." The 2026 senior shape is nonce-based with `'strict-dynamic'` — every request gets a fresh nonce, the inline `<script>` tags carry it, and other scripts inherit trust from nonced scripts. Closes XSS as a class. Chapter 081 owns the implementation; this lesson names the nonce shape.
  - **`X-Content-Type-Options: nosniff`:** "do not sniff the body to guess a `Content-Type` — trust the header." Closes the MIME-confusion attack where a `.txt` upload is sniffed as `text/html` and executed.
  - **`Referrer-Policy`:** "what to put in `Referer` on outgoing navigations." The senior 2026 default is `strict-origin-when-cross-origin` — full URL same-origin, origin-only cross-origin, nothing on HTTPS-to-HTTP. Closes the credential-in-URL leak through referer.
  - **`Permissions-Policy`:** "which browser features (camera, microphone, geolocation, USB, payment) this origin and its iframes may use." Senior default is deny-by-default with the per-feature grants the app actually needs.
  - **`frame-ancestors` (a CSP directive, not a separate header):** "who may embed this page in an iframe." Replaces `X-Frame-Options` in 2026 — `X-Frame-Options` is retired in favour of the CSP directive because it composes with the rest of CSP.

- **Audience mapping.** All six are *browser*-audience. The browser enforces them; the infrastructure layer doesn't read them; the application produces them at response time. That is why they live in `next.config.ts` (static) and `proxy.ts` (per-request when they need data like a CSP nonce).
- **Why the lesson names them and stops.** The implementation (the CSP nonce wired through `proxy.ts`, the report-only rollout, the `Reporting-Endpoints` companion) is Chapter 081's territory. Lesson 3's payoff is recognition: the student should see `Strict-Transport-Security` in DevTools and know what it is.

**No code fence in this section.** A static list of six headers is more pedagogically efficient as prose with inline `<code>` than as a wire shape — the senior insight is the audience and the role, not the specific values.

### Request-context headers and the trust-the-edge rule

The "what the application reads off the request" section. Five headers worth naming.

- **`Cookie:`** — the cookie value the browser sends. Read by Better Auth's session middleware (Unit 8). The application reads it; the infrastructure layer doesn't.
- **`User-Agent:`** — what client is calling. Forensic / analytics signal only — never trust the value, the client controls it. Useful for "is this a bot, a mobile browser, a server-to-server SDK" segmentation, not for authorization.
- **`Referer:`** (the misspelling history named in one parenthetical — "the header has been misspelled since RFC 1945 in 1996; the field name is canonical now") — the previous URL the user navigated from. Limited by `Referrer-Policy` (note the correct spelling on the policy header — the spec uses both spellings, depending on which one you're reading). The application reads this for analytics.
- **`Origin:`** — the load-bearing header for CSRF defense on Server Actions. On any cross-origin request that includes credentials, the browser sets `Origin:` to the calling origin. Server Actions check this header against the app's own origin and reject mismatches. Forward-link to Chapter 054.
- **`Host:`** (and `:authority:` under HTTP/2 and HTTP/3) — which hostname the client meant. The application reads it for multi-tenant subdomain routing (org A on `acme.app.com`, org B on `globex.app.com`); the infrastructure layer routes on it.

**The trust-the-edge rule for `X-Forwarded-*` and `Forwarded` (RFC 7239).** The hardest of the request-context cases.

- **The problem.** A request can pass through several proxies (CDN → load balancer → application). The application sees the load balancer's IP as the client IP. To recover the *real* client IP, each proxy appends to `X-Forwarded-For` (or to the structured `Forwarded` header, RFC 7239). The application then walks the chain.
- **The trust boundary.** The only hop you can trust is the **immediate edge** — the proxy your application talks to directly. Every value to the left of that hop can have been forged by the original client. If your CDN is the only edge in front of your app, trust the rightmost entry your CDN appended; *do not* trust the rest of the chain just because it's there. Rate-limiting by an unverified `X-Forwarded-For` is a spoofable bypass.
- **`Forwarded` (RFC 7239) vs. `X-Forwarded-*`.** `Forwarded` is the standardised replacement — one structured header (`Forwarded: for=192.0.2.60;proto=https;by=203.0.113.43`) instead of three separate `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`. The senior 2026 default is to emit `Forwarded` from your edge; the legacy `X-Forwarded-*` set persists because most upstream tooling still reads it. Read whichever your edge sets; configure your edge to set the modern one.

**Senior watch-out (`<Aside type="caution">`).** "Reading `X-Forwarded-For` from the request without verifying which hop appended it is the most common spoofable header bug. The fix is to count proxies from the right and stop at the first untrusted hop. Vercel's `request.headers.get('x-vercel-forwarded-for')` returns the trusted value Vercel's edge appended, which is the right reach on Vercel; on a custom edge, configure the same shape."

### Custom-header naming after RFC 6648

The convention section, kept short.

- **The `X-` prefix is deprecated.** RFC 6648 (2012) deprecated the `X-` prefix for custom headers. The rationale: when a custom header eventually became standard (the `gzip` / `x-gzip` mess), removing the prefix broke every consumer. The 2026 reach is **no prefix** for plain application headers (e.g. `Request-Id`, `Idempotency-Key`) and **vendor tokens** for third-party-defined headers (e.g. `Stripe-Signature`, `Svix-Id`, `Svix-Timestamp`, `Svix-Signature`).
- **The senior practice.** Pick a name that doesn't collide with the IANA registry; pick a vendor token if the header carries proprietary semantics; pick the IETF draft shape if one exists (`Idempotency-Key`, `RateLimit`). The lesson names two reference shapes — Stripe and GitHub (`X-GitHub-Event` is a legacy GitHub holdout, named once as the exception that proves the rule).
- **One paragraph total.** No code fence — the convention is a naming rule, not a wire shape.

### Where headers are set in a Next.js app

The closing payoff section. The decision tree from header-family to file.

Structure:

- **Three setters, three triggers.** The audience model maps cleanly onto where the header is set in a Next.js app.
  - **`next.config.ts headers()`** — for headers that are **static** across requests (or static per route prefix). HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`-via-CSP-without-nonce, `Cache-Control` on `/_next/static`, etc. The build-time setter.
  - **`proxy.ts`** (the Next.js 16 rename of `middleware.ts`) — for headers that need **per-request data**. The most common reach is the CSP nonce (`Content-Security-Policy: ... 'nonce-<random>'`) generated per request and injected into both the response header and the `<script>` tag that needs it. Also where rate-limit headers, request-id headers, and per-request auth headers live. Runs on the Node.js runtime in Next.js 16; the edge runtime is no longer supported.
  - **The response itself** (`route.ts` route handler, `Server Action` response, page `metadata`) — for headers that are **response-specific**. `Cache-Control` per route, `Idempotency-Key` echo on a webhook response, `ETag` per resource, `WWW-Authenticate: Bearer` on a 401 from `authedRoute`, the Problem Details `Content-Type: application/problem+json`.

- **The mapping shown as a diagram.** A small horizontal three-stage flow built with HTML+CSS (a lesson-specific component at `src/components/lessons/011/3/WhereHeadersAreSet.astro`). Three labelled cards laid out left-to-right (or wrapping on narrow viewports per the html-css.md guidance):
  - **Card 1: `next.config.ts headers()`** — caption "Static across requests" — example chips `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
  - **Card 2: `proxy.ts`** — caption "Per-request data (CSP nonce, request-id)" — example chips `Content-Security-Policy` (with nonce), `X-Request-Id`, `RateLimit`.
  - **Card 3: route handler / Server Action** — caption "Per-response" — example chips `Cache-Control`, `ETag`, `WWW-Authenticate`, `Content-Type: application/problem+json`.

  No `<Figure>` wrapper if the component provides its own card; the precedent from `StatusClassStrip` uses `<Figure caption="...">` with the strip slotted in, so do the same here.

- **Three inline code-fence sketches — one per setter — to anchor the diagram.** Each is a short snippet (5–10 lines) showing the *shape* only. Author each as a separate `<Code>` fence; no `<CodeVariants>` (these are not alternatives, they're three different files that coexist). Use `lang="ts"` and `title="<filename>"` on each.

  Setter 1 — `next.config.ts`:
  ```ts
  // next.config.ts
  const nextConfig = {
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ],
        },
      ];
    },
  };
  export default nextConfig;
  ```

  Setter 2 — `proxy.ts` (the Next.js 16 rename of `middleware.ts`):
  ```ts
  // proxy.ts
  import { NextResponse, type NextRequest } from 'next/server';

  export function proxy(request: NextRequest) {
    const nonce = crypto.randomUUID();
    const response = NextResponse.next();
    response.headers.set(
      'Content-Security-Policy',
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    );
    response.headers.set('X-Request-Id', nonce);
    return response;
  }
  ```

  Setter 3 — `app/api/invoices/route.ts` (response-specific):
  ```ts
  // app/api/invoices/route.ts
  export async function GET() {
    return new Response(JSON.stringify({ invoices: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
        'ETag': '"v1"',
      },
    });
  }
  ```

  Prose under each: one sentence naming what's specific about the setter ("Static; runs at build time, applies to every matching request." / "Per-request; runs on the Node.js runtime before the route handler; the nonce is fresh per request." / "Per-response; set on the route handler's `Response` object so they ride with this specific body.").

  Code conventions reminders: single quotes; semicolons; trailing commas; `const`; `export default` only on `next.config.ts` (framework-required). The route handler exports `GET` as a named export (framework-required). The `proxy` function is a named export per the Next.js 16 file convention. No imports beyond what the snippet uses.

- **No live exercise here.** The student isn't writing route handlers yet (Unit 4) or proxy code yet (Unit 9 onward). The fences are read-not-written; the diagram is the takeaway.

### Closing recall

One short drill exercising the three audiences and the three failure modes — the lesson's load-bearing reasoning, not catalog recall.

**`<TrueFalse>` round, six statements.** Each requires applying a definition or recognising a trap.

1. `answer="false"` — "`Cache-Control: no-cache` forbids the cache from storing the response, so it's the senior default for authenticated HTML."
   - `<TfWhy>`: "`no-cache` *allows* storage but forces revalidation on every read. The directive that forbids storage entirely is `no-store`. The senior default for authenticated HTML is `private, no-store`."
2. `answer="true"` — "A first-party browser session uses cookies; a server-to-server API call uses `Authorization: Bearer`."
   - `<TfWhy>`: "Browser sessions live in cookies because the browser enforces `HttpOnly`, `Secure`, `SameSite`, and the `__Host-` prefix — mitigations a Bearer token doesn't have. Programmatic clients use Bearer because they manage their own credential lifecycle and shouldn't store credentials in a cookie store."
3. `answer="false"` — "Rate-limiting by the leftmost IP in `X-Forwarded-For` is safe because the proxies append in order."
   - `<TfWhy>`: "The only hop you can trust is the immediate edge. Every value to the left of that hop could have been forged by the original client. Count from the right and stop at the first untrusted hop, or read the value your trusted edge appended (e.g. Vercel's `x-vercel-forwarded-for`)."
4. `answer="true"` — "The `Vary: Cookie` response header tells a shared cache to key the cache by the request's `Cookie` value, so user A's response doesn't get served to user B."
   - `<TfWhy>`: "Without `Vary: Cookie`, the cache keys by URL only and serves the first response it cached to every user that hits that URL. The auth-default `private, no-store` makes the question moot — the response isn't cached at all — but on cacheable per-user surfaces, `Vary` is mandatory."
5. `answer="false"` — "Custom application headers should be prefixed with `X-` to mark them as non-standard."
   - `<TfWhy>`: "RFC 6648 deprecated the `X-` prefix in 2012. The senior reach is no prefix (e.g. `Request-Id`, `Idempotency-Key`) or a vendor token (`Stripe-Signature`)."
6. `answer="true"` — "The CSP nonce is set in `proxy.ts` rather than `next.config.ts` because each request needs a fresh nonce."
   - `<TfWhy>`: "`next.config.ts headers()` is for static-across-requests headers. CSP with a per-request nonce needs request-time data, which means the proxy. Same rule for any request-id, rate-limit, or per-tenant header."

(Why TrueFalse over MultipleChoice or Buckets: the audience-Buckets drill earlier in the lesson covered the audience-placement skill. The MultipleChoice in the Cache-Control section covered the senior-default decision. This closing round targets the *reasoning* layer — applying the audience model and the senior defaults to edge cases — which is what TrueFalse is for.)

### What stays out (named once)

A two-line wrap at the end:

- Cookie attributes (`HttpOnly`, `Secure`, `SameSite`, `__Host-`, `Partitioned`) and the `Set-Cookie` deep dive — Chapter 013.
- CORS response headers (`Access-Control-Allow-*`) — Chapter 012.
- Next.js 16's `'use cache'` and `cacheLife` — Unit 4.
- The full security-baseline implementation with CSP nonce wiring and the report-only rollout — Chapter 081.
- The `rate-limit-headers.ts` helper that emits `RateLimit` and `Retry-After` on limited responses — Chapter 075.
- Server Action `Origin` header check for CSRF — Chapter 054.
- HEAD on R2 for object metadata — Chapter 069.

No `LinkCards` block — every forward link is internal to the course.

**External resources (optional `ExternalResource` cards in a small `CardGrid`)** — for students who want to dig deeper before later chapters land. Pick two, no more:

- MDN's HTTP headers index — the canonical reference. (`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers`)
- The IETF httpapi RateLimit draft tracker — for students curious about the standardisation state. (`https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/`)

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| Three-audience reference strip | HTML+CSS lesson-specific component at `src/components/lessons/011/3/HeaderAudienceStrip.astro`, inside `<Figure>` |
| Audience-placement recognition drill | `<Buckets>` with three buckets (browser / infra / app) |
| Content-negotiation wire shape | Single `<Code>` fence with `lang="http"`, two consecutive blocks (request, response) |
| `no-store` vs `no-cache` comparison | `<CodeVariants>` with two `http` fences, `maxLines={6}` |
| Cache-Control senior-default decision | `<MultipleChoice>` with one `<McqWhy>` |
| Conditional-request wire shape | Two `<Code>` fences with `lang="http"` |
| Authorization channel comparison | `<CodeVariants>` with two `http` fences, `maxLines={6}` |
| Rate-limit 429 wire shape | Single `<Code>` fence with `lang="http"` |
| "Where each header is set" diagram | HTML+CSS lesson-specific component at `src/components/lessons/011/3/WhereHeadersAreSet.astro`, inside `<Figure>` |
| Three setter sketches (`next.config.ts`, `proxy.ts`, `route.ts`) | Three `<Code>` fences with `lang="ts"` and `title="…"` |
| Senior watch-outs (3 total) | `<Aside type="caution">` |
| Closing recall | `<TrueFalse>` round, six statements |
| Optional further-reading | `<ExternalResource>` cards in a small `CardGrid` (≤2) |

**No live-coding component.** Student is not yet writing Next.js code (Units 4+). The Buckets, MultipleChoice, and TrueFalse drills are recognition and reasoning at the right depth for this lesson.

**No video embed.** No canonical short video on the audience-model framing exists at the quality bar worth embedding. The MDN reference card in the external resources is the right link-out.

**No `DiagramSequence` or `ArrowDiagram`.** The lesson's visuals are static reference scaffolds (the audience strip, the setter diagram) — temporal sequences would over-engineer them.

## Term tooltips to author

Strategic, sentence-level definitions. Use `<Term>` only where it earns its weight.

- `ETag` — "Opaque token the server stamps on a response (`ETag: \"v1\"`) so the client can ask 'has this changed?' on the next read via `If-None-Match`."
- `HSTS` — "Strict-Transport-Security. Response header telling the browser to use HTTPS for this host for the next N seconds. Forecloses MITM downgrade attacks."
- `CSP` — "Content-Security-Policy. Response header telling the browser which sources may execute scripts, load styles, frame the page, etc. The 2026 senior shape is nonce-based with `'strict-dynamic'`."
- `nonce` — "A one-time random value generated per request. In CSP, the server emits a nonce in the header and the same nonce on each `<script>` tag it trusts; the browser executes only matching scripts."
- `same-origin` — "The browser's notion of 'same site' for security policies — same scheme, host, and port. Defined fully in Chapter 012."
- `Idempotency-Key` — already authored in Lesson 1; **do not re-author**.
- `Problem Details` — already authored in Lesson 2; **do not re-author**.

No `<Term>` for "header," "request," "response" — they don't need definitions; they need the audience model the body builds. No `<Term>` for the directive names (`no-store`, `private`, `public`) — those are taught inline with definitions.

---

## Scope

### What this lesson covers

- The three-audience model (browser, infrastructure, application) as the durable scaffold.
- Content negotiation: `Content-Type`, `Accept`, `Content-Encoding` (with `zstd` as the 2026 default for new traffic where supported), `Vary` as the cache-key extender, `Accept-Language` named in one sentence.
- `Cache-Control` directives — `public`/`private`, `max-age`/`s-maxage`, `no-store` vs `no-cache`, `must-revalidate`, `stale-while-revalidate`, `immutable` — with four senior defaults (authenticated HTML, hashed static assets, cacheable HTML on CDN edge, fast-changing API). Brief forward-link to Next.js 16's `'use cache'` + `cacheLife`.
- Conditional requests with `ETag` + `If-None-Match` (and `Last-Modified`/`If-Modified-Since` mentioned once). `If-Match` for optimistic concurrency named in one sentence.
- Authorization schemes — `Bearer` for machine-to-machine, cookies for browser sessions, `Basic` for rare internal tooling. `WWW-Authenticate` on 401 named in one sentence.
- Rate-limit signaling — `RateLimit` and `RateLimit-Policy` per the IETF draft (-11, structured fields per RFC 9651), `Retry-After` on 429 and 503.
- Security-baseline headers — the irreducible six (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`-via-CSP) named with one-line semantics. `X-Frame-Options` retired in favour of `frame-ancestors` (CSP).
- Request-context headers the application reads — `Cookie`, `User-Agent`, `Referer`, `Origin`, `Host`, and the `X-Forwarded-*` vs. `Forwarded` (RFC 7239) family with the trust-the-edge rule.
- Custom-header convention after RFC 6648 — no `X-` prefix; vendor token (`Stripe-Signature`, `Svix-*`) or no prefix.
- Where each header is set in a Next.js 16 app — `next.config.ts headers()` for static, `proxy.ts` for per-request, route handler / Server Action response for per-response. Three inline `Code` sketches (read-only).

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **Methods, safety, idempotency, `Idempotency-Key` body** — Lesson 1. Reference `Idempotency-Key` by name when it appears in the rate-limit-retry paragraph; do not re-explain.
- **Status codes, the 4xx/5xx split, Problem Details body shape** — Lesson 2. Reference `Content-Type: application/problem+json` when it appears; do not re-teach the body shape.
- **Cookie attributes deep dive** (`HttpOnly`, `Secure`, `SameSite`, `__Host-`, `Partitioned`, `Set-Cookie`) — Chapter 013. Mention Better Auth's senior defaults in one line; do not expand.
- **CORS** (`Access-Control-Allow-*`, simple vs. preflighted, the wildcard-with-credentials trap) — Chapter 012. Do not mention except by name in the closing scope list.
- **Same-origin policy and the origin tuple** — Chapter 012. Use the term `<Term>same-origin</Term>` with a one-line forward-link tooltip.
- **The Next.js 16 `'use cache'` directive, `cacheLife`, `cacheTag`, `revalidateTag` semantics** — Unit 4. Name once: "Next.js 16's `'use cache'` + `cacheLife` is the framework wrapper that emits the directives in this section." Do not elaborate.
- **The `authedRoute` route-handler wrapper and the 401/403/422/404 Problem Details map** — Chapter 057. Mention `WWW-Authenticate: Bearer` on a 401 with a one-line forward-link.
- **CSP nonce implementation, report-only rollout, `Reporting-Endpoints`, the `proxy.ts` per-request nonce wiring beyond the one-snippet sketch** — Chapter 081. Name the six security-baseline headers; do not build the CSP.
- **The `rate-limit-headers.ts` helper, `safeLimit(...)`, the Upstash integration** — Chapter 075. Name the IETF shape and `Retry-After`; do not build.
- **Server Action `Origin` header check for CSRF** — Chapter 054. One-line forward-link.
- **HEAD method on R2 for object metadata** — Chapter 069. Do not mention; out of this lesson's scope.
- **Webhook signature verification headers** (`Stripe-Signature`, `Svix-*`) — Chapter 063. Name them as the canonical vendor-token examples in the custom-header section; do not expand.
- **Better Auth's session-read ladder, cookie hardening, and the proxy gate** — Unit 8. One-line cross-reference; do not re-teach.
- **HTTP/2 and HTTP/3 frame-level header compression (HPACK, QPACK)** — permanently out of scope; the abstract `Name: value` model is the level a SaaS engineer reasons at.
- **WebSocket upgrade headers (`Sec-WebSocket-*`)** — Chapter 056 if at all; do not mention.
- **Range requests (`Range`, `If-Range`, `Content-Range`, 206)** — niche; not in 2026 SaaS daily reach. Do not mention.
- **AI-related framing** — not an AI lesson.

### Prerequisites the student already has (do not re-teach)

- Lesson 1: methods, safety/idempotency, `Idempotency-Key` (header name only when it surfaces here).
- Lesson 2: status codes, Problem Details, `Content-Type: application/problem+json`, the response line shape, `Location`/`Retry-After`/`WWW-Authenticate` mentioned-but-deferred to this lesson.
- Chapter 010: HTTP/3 over QUIC as the 2026 default transport; URL → first byte → pixels.
- Unit 1: `Result<T>`, Zod 4 `safeParse`, `error.issues`.
- Architecture concept: Better Auth ships cookie-based sessions (named in Unit 8 — this lesson references the design choice, not the implementation).
- Next.js 16 file-system conventions: `next.config.ts`, `proxy.ts` (renamed from `middleware.ts` in Next.js 16), `app/.../route.ts`, Server Actions. The lesson references these by name; the student has seen them in Chapter 010's DevTools tour.

---

## Notes for the writer agent

- **Audience-first.** The three-audience model is the durable scaffold. Do not open with a 30-header table. The `<Buckets>` drill right after the strip is what makes the model active; don't move it to a later section.
- **HTTP/3 on the wire-shape examples.** Lessons 1 and 2 established the precedent; the chapter is HTTP/3-default per Chapter 010. Every `http` fence opens with `HTTP/3` on the request or response line.
- **`http` fences are tiny.** None should exceed ~8 lines. The point is the shape, not a literal endpoint. Strip any header that isn't load-bearing for the section. Where prose explains a header, don't include it in the fence unless the wire shape is the point.
- **Senior defaults stated plainly.** "For X, the senior default is Y." Four of these in the Cache-Control section; one in the Authorization section; one in the security baseline section. Do not hedge.
- **The Aside discipline.** Three `<Aside type="caution">` Asides total: one in the Cache-Control section (the shared-cache leak), one in the Authorization section (don't log `Authorization`), one in the request-context section (the trust-the-edge spoof). Do not add more; do not use other Aside types in this lesson. Each Aside earns its weight one at a time.
- **The Buckets drill is the audience-model recall, the MultipleChoice is the Cache-Control senior-default recall, the TrueFalse is the closing reasoning round.** Three exercise types, three different reasoning skills. Do not duplicate exercise types.
- **The closing setter section is the lesson's payoff.** The student should leave with a concrete map from header-family → file. The HTML+CSS diagram and the three small code sketches are the artifact. Do not make the snippets full implementations — the *shape* is the lesson, not the wiring.
- **`proxy.ts` is the Next.js 16 name for what used to be `middleware.ts`.** Per the chapter outline and AGENTS.md. The lesson uses `proxy.ts` throughout. Do not write `middleware.ts` except in the one-clause parenthetical that names the rename.
- **`zstd` as the 2026 compression default — name it once, briefly.** Browser support landed in Chrome 123+, Edge 123+, Firefox 126+, Safari 26+ on macOS/iOS. Cloudflare and other major CDNs negotiate it. Do not turn the content-negotiation section into a compression-algorithm tour; the lesson's point is which header carries the negotiation, not the algorithm.
- **IETF RateLimit draft state — name once, accurately.** As of November 2025, the draft is at `draft-ietf-httpapi-ratelimit-headers-11`, intended Standards Track, expires November 24, 2026. Not yet a finalised RFC, but the de-facto shape Upstash and most gateways emit. Do not over-hedge the wording; the senior 2026 reach is the draft shape.
- **RFC numbers earn one mention each, no more.** RFC 9457 (Problem Details — Lesson 2's territory, mention `application/problem+json` content type in passing only), RFC 7239 (Forwarded), RFC 6648 (X- deprecation), RFC 9651 (Structured Fields, named in the rate-limit paragraph). Do not add the full RFC title each time; "RFC 7239" is sufficient.
- **Code conventions reminders.**
  - Single quotes; semicolons; 2-space indent; trailing commas; `const`; named exports except framework-default-exports (`next.config.ts` is `export default`; the route handler exports `GET` named; the proxy exports `proxy` named).
  - The three setter snippets are read-only. No imports beyond what the snippet uses.
  - The `proxy.ts` snippet uses `crypto.randomUUID()` for the nonce — matches Lesson 1's reach for `Idempotency-Key`.
  - The route handler snippet uses a plain `new Response(...)` shape, not `NextResponse.json(...)`, because the lesson hasn't introduced `NextResponse` yet (Unit 4). The platform shape is the point.
  - In the rate-limit `http` fence, the structured-field shape (`"auth-sign-in";r=0;t=27`) follows RFC 9651 — quoted string identifier, semicolon-prefixed key=value parameters.
  - JSON / HTTP fences are not auto-formatted by Biome; preserve the exact `Cache-Control` directive order shown.
- **The lesson is the longest of the three teaching lessons in this chapter.** Aim for 2400–3200 words of prose plus visuals and exercises. Resist the urge to deepen any single section — the catalog is wide on purpose; depth lives in the future chapters that own the implementation.
- **No `LinkCards`.** Every forward link is internal. External-resource `<ExternalResource>` cards at the end are optional and capped at two — MDN's HTTP headers index and the IETF RateLimit draft tracker. If a third feels needed, drop one of the two.
- **The diagrams' captions matter.** Each `<Figure>` caption is a one-sentence summary the student can scan separately from the diagram. Don't re-state the diagram contents; state the *point*.
