# Chapter 3.3 — URLs, origins, and security boundaries

## Chapter framing

Chapter 3.1 traced one request from URL bar to interactive pixel, and Chapter 3.2 read the HTTP envelope every endpoint signs. This chapter zooms into the URL itself and the trust boundaries the browser enforces around it. Three load-bearing ideas thread every lesson. First, **the URL is a structured value, not a string** — `new URL()` and `URLSearchParams` are the senior reach, and string concatenation is the bug factory the chapter retires. Second, **the origin is the unit the browser uses to scope trust** — the same-origin policy gates *responses*, not *requests*, and protects the user, not the server. Third, **CORS is the opt-in that loosens the default**, with `credentials: 'include'` plus `Access-Control-Allow-Credentials: true` as the load-bearing pair, and the wildcard-with-credentials trap as the most common production foot-gun.

The chapter ships no application code beyond illustrative snippets and a small CORS Route Handler in 3.3.3 that the student can paste into the starter from Chapter 1.4. Cookie attributes (`Secure`, `SameSite`, `__Host-`, `Partitioned`) belong to Chapter 3.4 and are named here only at the points where they intersect with origin and site comparisons. `fetch` itself is Chapter 3.6; this chapter touches `fetch` only to name the `credentials`, `mode`, and `Origin`-header surface that the cross-origin contract reads. The student leaves able to parse and build URLs without escaping bugs, articulate origin versus site precisely, predict whether any given cross-origin call needs preflight, write the four `Access-Control-Allow-*` response headers that production needs, and diagnose a CORS browser error from its exact wording.

---

## Lesson 3.3.1 — Parse, don't concatenate

Teach the URL as a structured value with `origin` / `pathname` / `search` / `hash`, `new URL()` and `URLSearchParams` as the senior reach, percent-encoding rules including the `%20`-vs-`+` split, and the bug classes string concatenation produces.

Topics to cover:

- The senior framing. URLs look like strings and aren't. Every URL has a parser inside it (the WHATWG URL spec), and the senior move is to use that parser instead of treating the URL as a template. The lesson retires `\`${base}/users?id=${id}\`` and installs `new URL()` plus `URLSearchParams` as the reach for every URL construction the student will write in Units 4 through 7.
- The URL anatomy named once against the WHATWG model. A URL is six fields: `protocol`, `host` (which decomposes into `hostname` and `port`), `pathname`, `search`, `hash`, plus the read-only `origin` shorthand. The `username`/`password` fields exist and are intentionally ignored — they're deprecated for navigation and unsafe to ship. One line on `searchParams` as the live `URLSearchParams` view of `search`, so mutating it updates the URL string. An inline annotated example like `https://api.acme.com:8443/v1/invoices?status=paid&limit=20#row-7` with arrows to each field is the load-bearing visual.
- `new URL(input, base)` as the senior constructor. The two-argument form resolves relative paths against a base — `new URL('/v1/invoices', 'https://api.acme.com')` is the canonical pattern for assembling API URLs from an env-derived base. It throws on invalid input; the senior pattern is to let it throw at boot for misconfigured envs (fail fast) rather than catch silently. Name the static `URL.canParse(input, base)` as the boolean-returning safe-check for user input where throwing would be wrong.
- `URLSearchParams` as the senior reach for query strings. The four shapes of construction (`new URLSearchParams(stringOrRecordOrEntries)`, `url.searchParams`, `new URLSearchParams({ status: 'paid' })`, `new URLSearchParams([['tag','a'], ['tag','b']])`), the multi-value model (`getAll`, `append` vs. `set`), iteration order preservation, and `toString()` as the encoded output. The student writes `params.set('q', userInput)` and never thinks about escaping again — that's the win.
- Percent-encoding rules, two encoding contexts at once. The WHATWG URL spec uses *different* percent-encode sets for different positions in the URL. The two the student must internalize:
  - **Path segments and the URL fragment** encode space as `%20`. `encodeURIComponent` matches this set most of the time.
  - **`application/x-www-form-urlencoded` query strings** — the format `URLSearchParams` produces and the format HTML form submissions use — encode space as `+`. On decode, `+` is interpreted as space, and a literal `+` must be encoded as `%2B`.
  This is the `%20`-vs-`+` split. The bug class it produces: building a URL with `\`?q=${encodeURIComponent(s)}\`` and decoding it with `URLSearchParams` reads a `+` in `s` as a space; or building it with `URLSearchParams` and decoding it with `decodeURIComponent` reads a `+` as a literal `+`. Senior rule: *encode and decode with the same model end to end*. The simplest rule is to do both with `URLSearchParams`.
- `encodeURI` vs. `encodeURIComponent` vs. `URLSearchParams`. `encodeURI` preserves URL structural characters (`:`, `/`, `?`, `#`, `&`, `=`) and is for whole URLs that the caller already trusts as well-formed — rarely the right tool. `encodeURIComponent` escapes those structural characters and is for single field values being interpolated into a path segment or a query value — correct for path segments. `URLSearchParams` is correct for any query-string construction. A three-row decision table is the right teaching shape.
- The bug classes string concatenation produces, each in one line.
  - Double-encoding (`encodeURIComponent` on a value already escaped by `URLSearchParams`).
  - Forgetting to escape user input — `\`?q=${q}\`` with `q = 'a&admin=true'` injecting a parameter.
  - Path-traversal-shaped values (`'../admin'`) treated as path syntax by the server.
  - Whitespace and Unicode in hostnames — the URL parser handles IDN (Unicode hostnames) via Punycode normalization; manual templating doesn't.
  - Trailing-slash drift — `'https://api.acme.com'` plus `'/v1'` versus `'https://api.acme.com/'` plus `'v1'` produces different strings; the `URL` constructor resolves both deterministically.
- The Node and Next.js context. `URL` and `URLSearchParams` are globals in every runtime the course ships on — the browser, the Node.js server runtime, and the Vercel Edge runtime. No imports. One line on `next/navigation`'s `useSearchParams()` hook returning a read-only `URLSearchParams` instance, so the same vocabulary carries from URL strings into the React rendering tree.
- The 2026 `URLPattern` reach, named once. `URLPattern` is the standardized URL-matching primitive (path-to-regexp-shaped) now shipping in every evergreen browser and on the Node and Edge runtimes. The student does not write `URLPattern` in this chapter — Next.js's file-system router covers route matching — but it earns a one-line forward link because Unit 5's middleware uses pattern objects under the hood.
- Senior watch-outs.
  - Mutating `url.searchParams` mutates `url.search`. Reassigning `url.search` rebuilds `url.searchParams`. Pick one mental model per code path.
  - `new URL('/path')` with no base throws. The base is required for relative inputs; absolute inputs ignore the second argument.
  - The `URL` constructor lowercases the hostname and normalizes the default port off (`:80` for http, `:443` for https). This matters for origin comparisons in 3.3.2.

What this lesson does not cover:

- The same-origin policy and how the browser uses `origin` — Lesson 3.3.2 owns it.
- CORS headers and the cross-origin opt-in — Lesson 3.3.3 owns it.
- Cookie attributes and the cookie trust model — Chapter 3.4.
- The `fetch` body, methods, and `AbortSignal` shape — Chapter 3.6.
- Next.js route matching, `params`, and `searchParams` in Server Components — Unit 5.
- The `nuqs` URL-state library for typed search-params state in React — Unit 4.8 names it.
- Legacy `escape`/`unescape` globals. Deprecated; the lesson does not surface them.

Pedagogical approach:

Mechanics archetype. Open with one paragraph on parse-don't-concatenate and the bug class it retires. The URL anatomy is a hand-authored SVG with arrows to each field on a single example URL, captioned with the property name. The `URLSearchParams` and `new URL()` material is short prose with three or four tight code snippets — never the full surface, the senior subset. The `%20`-vs-`+` split lives in a small `CodeVariants` block showing the same input encoded both ways with the decoded round-trip labeled. The encoding decision table (encodeURI / encodeURIComponent / URLSearchParams) is a three-row `Table`. Close with one live exercise: the student is handed a record `{ q: 'a+b', tags: ['x', 'y'] }` and a base URL, and must produce the correct encoded URL with `URLSearchParams`, with a test that checks the decoded round trip. Optional `SandboxCallout` with a `new URL()` playground for the student to paste any URL and see the parsed fields.

Estimated student time: 35 to 45 minutes.

---

## Lesson 3.3.2 — Origin is the unit of browser trust

Teach origin as the `(scheme, host, port)` tuple versus site as `(scheme, eTLD+1)`, what the same-origin policy blocks versus what it always allows, and the load-bearing point that the policy protects the *user* (not the server) by gating the *response*, not the request.

Topics to cover:

- The senior framing. The browser carries the user's credentials (cookies, basic auth, client certs) automatically with every request to a host. Without a security policy, any page could make a request to `bank.acme.com`, the browser would attach the session cookie, and the page would read the response. The same-origin policy is the rule that makes the read fail. The lesson installs origin as the unit the rule scopes by and frames every later question (cookies, CORS, CSRF, postMessage) against it.
- Origin defined precisely. Origin is the tuple `(scheme, host, port)`. `https://app.acme.com` and `https://api.acme.com` are *different origins* (different host). `https://app.acme.com` and `http://app.acme.com` are *different origins* (different scheme). `https://app.acme.com` and `https://app.acme.com:8443` are *different origins* (different port — the default port `:443` collapses to no port, but any non-default port differs). The `URL` object's read-only `origin` property returns this string.
- Site defined precisely, and why it's the looser cousin. Site is `(scheme, eTLD+1)` — scheme plus the registrable domain. The **eTLD** (effective top-level domain) is taken from the Public Suffix List: for `app.acme.com` the eTLD is `.com` and eTLD+1 is `acme.com`; for `project.github.io` the eTLD is `github.io` and eTLD+1 is `project.github.io`. So `https://app.acme.com` and `https://api.acme.com` are *different origins* but the *same site* — both share scheme `https` and eTLD+1 `acme.com`. Ports are not part of site. This distinction is load-bearing for cookies: `SameSite=Lax` uses the *site* boundary, not the origin boundary, which Chapter 3.4 will lean on heavily.
- The senior mental anchor: same-site is permissive (subdomains share), same-origin is strict (subdomains don't share). The course calls this *the two boundaries* and the student should be able to classify any pair of URLs along both axes in five seconds.
- What the same-origin policy actually blocks. The single sentence to internalize: *the browser sends the request and lets the response come back, but it refuses to let the cross-origin page read the response.* The request still hits the server; cookies are still attached (subject to `SameSite`); the server still processes it and returns a body. The browser then checks `Access-Control-Allow-Origin` on the response and decides whether the calling page may read it. If not, the page sees an opaque error and zero of the body.
- The load-bearing implication. Same-origin protects **confidentiality of the response from the user's perspective** — it stops `evil.com` from reading `bank.acme.com/balance` on the user's behalf. It does not stop the request itself, so it does not protect the server from *write* side effects — that's what CSRF tokens and `SameSite` cookies are for, in their respective chapters. The bug class this framing prevents: building a state-changing GET endpoint and thinking the same-origin policy protects it. It doesn't. State-changing endpoints use POST/PUT/DELETE/PATCH, idempotency keys, and `SameSite` cookies.
- What the same-origin policy always allows (the carve-outs every senior knows).
  - **Top-level navigation** — clicking a link to a cross-origin URL, submitting a `<form>` to a cross-origin action. The browser navigates; the new page is loaded under that origin's trust.
  - **`<script src>`, `<link rel="stylesheet">`, `<img>`, `<video>`, `<audio>`, `<iframe>`** — cross-origin resources can be embedded, but the page typically cannot read their internals. (CORS unlocks reading; `crossorigin` attribute is the opt-in.)
  - **CSS, font, and image use** — the browser renders them; JavaScript cannot read pixel data from a cross-origin `<canvas>` drawn from a cross-origin image without CORS.
  - **Form submissions** — a `<form action="https://other.com/...">` is allowed. This is exactly the surface CSRF exploits and that `SameSite` cookies and CSRF tokens defend.
  The senior watch-out: the carve-outs exist because they predate the policy (the embed-everything web). They are *navigation and embed* permissions, not *read* permissions.
- Cross-origin object access on the page. Two pages from different origins can hold references to each other (via `window.open` or `<iframe>`), but the same-origin policy restricts which properties they can touch. The cross-origin-accessible subset is short: `location.href` (write-only for navigation), `location.replace`, `postMessage`, `closed`, `close`. Everything else throws. `postMessage` is the load-bearing primitive for cross-origin window communication — named here in one line; Chapter 3.5 owns the event model that fires `message`.
- The 2026 site-isolation reality. Chrome and Firefox isolate each site (eTLD+1) into its own renderer process. The student does not write code that depends on this; they should know that `process.env`-style information leaks between origins on the same site are still mostly possible and that the *origin* — not the site — is the unit the senior reasons about for confidentiality. The conditional power-tool name: **Cross-Origin Resource Policy** (`Cross-Origin-Resource-Policy: same-origin`) lets a server opt resources out of cross-origin embedding entirely; **Cross-Origin Opener Policy** (`Cross-Origin-Opener-Policy: same-origin`) breaks `window.opener` for cross-origin openers. Named in one line each, deferred to Unit 17's security baseline.
- The `Origin` request header named here. When a browser makes a cross-origin request (any non-`GET`/`HEAD` request, or any CORS-eligible request), it attaches an `Origin: https://app.acme.com` header. The server reads it and decides what to return. This is the single line that connects 3.3.2 to 3.3.3: CORS is the protocol the server uses to *answer* `Origin`.

What this lesson does not cover:

- CORS headers themselves, preflight, and credentials — Lesson 3.3.3.
- Cookie `SameSite`, `Secure`, `HttpOnly`, `Partitioned` — Chapter 3.4.
- CSRF token patterns — Unit 17.2.
- `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` headers in depth — Unit 17.
- `postMessage` event-handler shape and origin validation — Chapter 3.5 names it.
- Content Security Policy — Unit 17.
- IFrame sandboxing flags — out of scope on this stack.
- The history of XHR before CORS — no historical detour.

Pedagogical approach:

Concept archetype. The center of gravity is a single comparison diagram: a `Table` listing six URL pairs in the left column and two columns ("same origin?", "same site?") with a check or cross in each, so the student practices the classification before any policy text lands. The same-origin definition is one paragraph plus a Mermaid `flowchart` showing the request crossing the boundary, the response coming back, and the browser interposing at the *response* read. The carve-outs (navigation, embeds, form submissions) are a short `BulletList` with one line per carve-out. Close with a `Buckets` exercise: the student sorts twelve scenarios ("page A reads JSON from API B," "page A embeds an image from CDN B," "page A submits a form to bank.acme.com," "page A reads a font from another origin," etc.) into "allowed by default," "blocked by default, needs CORS," or "always allowed (navigation/embed)." No sandbox — the lesson is conceptual.

Estimated student time: 30 to 40 minutes.

---

## Lesson 3.3.3 — The preflight dance

Teach CORS as the opt-in that loosens same-origin, the simple-vs-preflighted decision, the `Access-Control-Allow-*` response-header palette, the wildcard-with-credentials trap, and the canonical browser error messages with their fixes.

Topics to cover:

- The senior framing. Same-origin is the default; CORS is the server's way to say "this response may be read by these other origins." The protocol has two shapes: simple requests, where the browser sends the request and checks the response headers after the fact; and preflighted requests, where the browser sends an `OPTIONS` request first and waits for the server to authorize before sending the real one. The senior knows which path any given `fetch` will trigger and what the four production response headers need to say.
- The simple-request criteria. A request is "simple" (no preflight) when *all* of these hold:
  - Method is `GET`, `HEAD`, or `POST`.
  - Headers are limited to the CORS-safelisted set (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`, `Range`).
  - `Content-Type`, if present, is one of `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`.
  - No `ReadableStream` body.
  In practice, **any `fetch` with `Content-Type: application/json` preflights**, and that's almost every API call the SaaS UI makes. The student should treat "JSON API calls always preflight" as the working reality.
- The preflight `OPTIONS` request, byte by byte. The browser sends:
  - `OPTIONS /resource HTTP/...`
  - `Origin: https://app.acme.com`
  - `Access-Control-Request-Method: POST`
  - `Access-Control-Request-Headers: content-type, authorization`
  The server responds with the matching `Access-Control-Allow-*` headers; if they don't match, the browser cancels the real request and surfaces the CORS error.
- The four production response headers, named with the failure mode they prevent.
  - **`Access-Control-Allow-Origin: https://app.acme.com`** — the exact echoed origin (or a list reduced to one). Tells the browser which origin may read the response. *Failure mode: the browser refuses the read; the page sees a CORS error.* Wildcards (`*`) work but disable credentials; see the trap below.
  - **`Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH`** — preflight only. Lists allowed methods. *Failure mode without it: a non-`GET`/`POST` method is rejected.*
  - **`Access-Control-Allow-Headers: content-type, authorization`** — preflight only. Lists request headers the actual request may send. *Failure mode without it: any custom header (including the json content-type) trips the preflight.*
  - **`Access-Control-Allow-Credentials: true`** — opts the response into being readable on credentialed requests. Paired with `fetch(..., { credentials: 'include' })` on the client. *Failure mode without it: cookies and auth headers aren't attached, or the response is blocked from being read.*
  Two supporting headers earn a line each: **`Access-Control-Max-Age: 86400`** caches the preflight result so the browser stops re-`OPTIONS`-ing every request, and **`Access-Control-Expose-Headers: X-Total-Count, X-Page`** lets JS read non-safelisted response headers (default is the safelist `Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`).
- The wildcard-with-credentials trap. `Access-Control-Allow-Origin: *` is legal *only* when the request is not credentialed. If the client sends `credentials: 'include'` and the server returns `*`, the browser refuses the response and the page sees a CORS error. The fix: echo the exact `Origin` value back (validated against an allow-list) and add `Vary: Origin` so the cached response doesn't bleed across origins. This is the most common production CORS bug, and naming it once is half the lesson.
- The `Vary: Origin` reflex. When the server's response depends on the request's `Origin` (which it does, the moment you echo it), the server must send `Vary: Origin` so any CDN or browser cache keys the response by origin. Without it, a response cached for one origin is served to a different origin and the browser rejects it. One paragraph; the rule is mechanical.
- The client surface, named once. `fetch(url, options)` has three knobs that interact with CORS:
  - `mode` defaults to `'cors'` for cross-origin; `'same-origin'` rejects cross-origin; `'no-cors'` lets the request go but the response is opaque (useless for reading). Senior never sets it manually.
  - `credentials` defaults to `'same-origin'` (cookies attached only same-origin); `'include'` attaches on cross-origin too; `'omit'` never attaches. The default is the senior pick for first-party SaaS; `'include'` is the explicit reach for a deliberate cross-origin authenticated call.
  - The `Origin` header is set by the browser automatically; the application never writes it. (Servers can validate it but can't trust it from a non-browser client.)
- The four canonical browser error messages and their fixes, paired one-to-one.
  - *"...has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource."* → Server didn't return the header. Fix the server route handler.
  - *"...the value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'."* → The wildcard-with-credentials trap. Echo the exact origin and add `Vary: Origin`.
  - *"...Response to preflight request doesn't pass access control check: It does not have HTTP ok status."* → The OPTIONS handler returned non-2xx. Make the OPTIONS handler return 204 with the headers.
  - *"...Request header field 'authorization' is not allowed by Access-Control-Allow-Headers in preflight response."* → Add `authorization` (or `content-type`, etc.) to `Access-Control-Allow-Headers`.
  These messages are the production reality; reading them is half the skill.
- Next.js Route Handler shape. The file lives at `app/api/<path>/route.ts` and named-export functions (`GET`, `POST`, `OPTIONS`, etc.) dispatch by HTTP method; full depth in Chapter 7.5. The student writes a tiny `route.ts` exporting `OPTIONS` and `GET`/`POST` handlers, each returning the response with the four headers. The Next.js 16 idiom is to set headers on the `Response` constructor or via `NextResponse.json(body, { headers })`; the lesson shows a `withCors` helper that wraps any handler and adds the four headers and `Vary: Origin`. No mention of `next.config.ts` `headers()` — that's a coarser tool; per-route is the senior reach because the allow-list belongs next to the route. The same handler also covers the `OPTIONS` preflight by returning 204 with the same headers and an empty body.
- Edge cases worth one line each.
  - **Same-origin app calling its own backend** — no CORS at all, no headers needed. The SaaS-on-Next-monolith default. The student should know that the chapter's CORS work *only* applies to cross-origin calls (third-party API, dedicated API subdomain, browser extension, marketing site calling app).
  - **API subdomain pattern** (`api.acme.com` ↔ `app.acme.com`) — cross-origin but same-site; CORS still required, but cookies with `SameSite=Lax` still travel.
  - **Browser extensions and `null` origin** — content scripts send `Origin: null`; allow-list it explicitly or refuse it.
  - **Preflight cache poisoning** — a too-permissive `Access-Control-Max-Age` plus a `Allow-Origin: *` bug compounds; senior pairs short max-age with an exact-echo origin in development.
- The non-CORS bypass paths, named so the student doesn't confuse them with the policy.
  - **A server-to-server fetch** (Next.js Server Action or Route Handler calling a third-party API) has no `Origin` header, no CORS check, and no browser between client and server. CORS does not apply.
  - **A reverse proxy** that exposes a third-party API under your own origin (Next.js `rewrites()`) collapses cross-origin to same-origin; CORS becomes unnecessary at the cost of a hop. Senior reach when a third party doesn't ship CORS and a server-side proxy is overkill.

What this lesson does not cover:

- The cookie attribute surface — Chapter 3.4. CORS-with-credentials cross-references `SameSite`; the cookie chapter owns the full attribute table.
- CSRF token patterns and double-submit cookies — Unit 17.2.
- Server Actions vs. Route Handlers as a design decision — Unit 5 and Unit 7.
- The `fetch` request body, methods, status, and `AbortSignal` — Chapter 3.6.
- `next.config.ts` `headers()` for app-wide headers — Unit 17 owns the security-header baseline.
- API gateways, service mesh, mTLS — out of scope.
- `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` — Unit 17.

Pedagogical approach:

Pattern archetype with a heavy Mechanics body. Open with one paragraph on CORS as the opt-in. The simple-vs-preflighted criteria are a `Table` with the three columns (method, headers, content-type) and one line under it telling the student the working reality: JSON APIs preflight. The preflight is a Mermaid `sequenceDiagram` showing the browser sending `OPTIONS`, receiving `Access-Control-Allow-*`, then sending the real request — labeled so the student can point at each lane in a DevTools waterfall. The four response headers are a `Table` keyed on header name with three columns (purpose, failure mode without it, example value). The wildcard-with-credentials trap and the `Vary: Origin` reflex each get a tight `Aside` callout. The Next.js handler is one labeled multi-file block (`app/api/.../route.ts` plus a tiny `lib/cors.ts` helper). The four canonical error messages are a `Matching` exercise — six messages, six fixes — that the student completes inline. Optional `SandboxCallout` with a Route Handler stub the student can paste into the starter and hit from a different origin (e.g. `http://localhost:5500` against the dev server) to watch the preflight in DevTools.

Estimated student time: 50 to 65 minutes.

---

## Lesson 3.3.4 — Quizz

Top 10 topics that should be quizzed:

1. The URL anatomy — `origin`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash` — and `new URL(input, base)` as the senior constructor including its throw-on-invalid behavior and `URL.canParse` as the safe-check.
2. `URLSearchParams` as the senior reach for query strings — the four construction shapes, `get` vs. `getAll`, `append` vs. `set`, and `toString()` as the encoded output.
3. The `%20`-vs-`+` split — path/fragment encoding versus form-urlencoded query encoding — and the round-trip rule that encode and decode must use the same model.
4. `encodeURI` vs. `encodeURIComponent` vs. `URLSearchParams` — which tool fits which position in a URL.
5. Origin as `(scheme, host, port)` versus site as `(scheme, eTLD+1)` — including classifying URL pairs along both axes and the role of the Public Suffix List.
6. What the same-origin policy blocks (cross-origin response reads) versus what it always allows (top-level navigation, `<script>`/`<img>`/`<iframe>` embeds, cross-origin form submissions) and the implication that it protects the user and not the server.
7. The simple-vs-preflighted decision and the working reality that `Content-Type: application/json` preflights.
8. The four production CORS response headers — `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Credentials` — and the role of `Access-Control-Max-Age` and `Access-Control-Expose-Headers`.
9. The wildcard-with-credentials trap, the exact-echo-with-`Vary: Origin` fix, and `fetch`'s `credentials: 'include'` requirement on the client side.
10. The four canonical browser CORS error messages and their fixes, including the OPTIONS-handler-returns-non-2xx case.

---

## Total chapter time

Roughly 115 to 150 minutes across the three teaching lessons plus the quiz. The chapter splits naturally across two evenings — 3.3.1 + 3.3.2 (the parser and the policy) as one sitting, 3.3.3 + the quiz (the cross-origin opt-in) as the second since the preflight lesson carries the chapter's mechanics weight. The student finishes with a working `URLSearchParams` reflex for every URL they will build in Units 4 through 7, a precise origin-versus-site vocabulary that Chapter 3.4 will lean on for `SameSite`, and a Next.js CORS Route Handler shape they can paste into any production allow-list. Chapter 3.4 lands on this foundation and teaches the cookie attribute table without restating origin or site.
