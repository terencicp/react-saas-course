# Chapter 3.4 — Cookies and the trust model

## Chapter framing

Chapters 3.1, 3.2, and 3.3 built the request-to-pixel pipeline, the HTTP contract, and the origin-and-CORS trust boundary. This chapter installs the cookie — the small piece of state the browser attaches to every same-site request, and the substrate every session, every CSRF defense, every server-set preference rides on. The center of gravity is a single `Set-Cookie` attribute table and one senior default the student will paste into every cookie-writing call for the rest of the course: `HttpOnly; Secure; SameSite=Lax; Path=/`, with `__Host-` prefixing the name when the cookie is host-locked. Every attribute earns its place by the failure mode it prevents — XSS exfiltration, plaintext sniffing, cross-site request forgery, scope leaks across subdomains, third-party tracking. The lesson is a Reference/survey of the attribute palette wrapped around one Decision (the default) with the failure modes inline.

Two threads run through every paragraph. First, **cookies are an ambient-credential mechanism, which is what makes them powerful and dangerous**. The browser attaches them automatically; the application code never sees them being sent. That's why `SameSite`, `HttpOnly`, and `Secure` exist — they constrain the ambient transmission and the JavaScript surface, not the server-side use. Second, **the 2026 third-party-cookie reality is a partial deprecation, not a clean cut**. Safari and Firefox block third-party cookies by default; Chrome retreated from forced deprecation but still ships `Partitioned` (CHIPS) as the path forward for legitimate cross-site embeds. The senior knows when to reach for `Partitioned; SameSite=None; Secure` (embedded widget, payment iframe) and when the answer is "don't use a cookie, use a token in postMessage." The chapter does not teach session design, CSRF token patterns, or authentication flows — Chapter 9 (auth) and Unit 17 (security baseline) own those. This chapter lands the attribute vocabulary they'll lean on.

The student finishes with: a precise reading of every attribute on a `Set-Cookie` header, the senior default committed to muscle memory and the conditions that flip each attribute off it, the `__Host-` and `__Secure-` prefix discipline, the `Partitioned` (CHIPS) reach for the cross-site-embed case, the Next.js 16 `cookies()` helper for reading in Server Components and writing in Server Actions and Route Handlers, and a clear forward link to the auth chapter that will use this surface to hold the session.

---

## Lesson 3.4.1 — Set-Cookie attributes and the senior default

Read the `Set-Cookie` header attribute by attribute — `HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age` / `Expires`, the `__Host-` and `__Secure-` prefixes, and the `Partitioned` (CHIPS) attribute — name the senior default (`HttpOnly; Secure; SameSite=Lax; Path=/`), map each attribute to the failure mode it prevents, and thread the Next.js `cookies()` helper and the 2026 third-party-cookie reality.

Topics to cover:

- The senior framing. A cookie is a key-value pair the server writes once with `Set-Cookie` and the browser then attaches automatically on every matching request as a `Cookie:` header. That automatic attachment is the feature (sessions stay logged in without app code) and the threat (a cross-site request the user never authored carries their cookie too). Every attribute on `Set-Cookie` exists to constrain when the browser attaches, who can read it on the page, and where it survives. The lesson is the attribute table; the senior default is the line the student copies into every cookie-writing call.

- The anatomy of `Set-Cookie`. One header sets one cookie. The shape is `Set-Cookie: name=value; Attribute1; Attribute2=value; ...`. The server can send multiple `Set-Cookie` headers in one response (the one HTTP header that legitimately appears multiple times in a response). One inline example: `Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000` with the attributes labeled.

- **`HttpOnly`** — the cookie is invisible to `document.cookie` and any JavaScript on the page. The browser still attaches it to requests; only the JS read API is blocked. *Failure mode it prevents:* XSS that finds an unescaped `innerHTML` sink can read every non-`HttpOnly` cookie and exfiltrate the session. `HttpOnly` does not stop XSS from making authenticated requests with the cookie attached — defense-in-depth, not a silver bullet — but it cuts off the most common exfiltration path. Senior rule: every session-bearing cookie is `HttpOnly`. The only cookies without `HttpOnly` are ones the client UI legitimately needs to read (a `theme=dark` preference, a CSRF double-submit token).

- **`Secure`** — the cookie is only attached on requests over HTTPS. *Failure mode it prevents:* on an HTTP network leg (rare in 2026, but coffee-shop wifi and corporate proxies still produce them), the browser would attach the cookie in plaintext and any on-path attacker reads it. Modern browsers treat `http://localhost` as a secure context for most APIs but `Secure` cookies behavior on plain localhost is inconsistent across browsers — Chapter 3.1.3's `mkcert` HTTPS setup makes this a non-issue locally. Senior rule: every cookie is `Secure`. The only context that flips it off is a legacy HTTP test fixture, which is rare on this stack.

- **`SameSite`** — the load-bearing attribute. Three values:
  - **`Strict`** — the cookie is *only* attached on requests originating from the same site. Even a top-level navigation from a third party (clicking a link from `gmail.com` to `app.acme.com`) does not attach the cookie on the first request. This is the strongest CSRF defense and the worst UX for sign-in links (the user clicks a magic link and the server doesn't see them as logged in until they refresh). Reserved for highly sensitive sub-cookies; not the default.
  - **`Lax`** — the cookie is attached on same-site requests and on **top-level safe-method navigations** from a third party (a `<a href>` click, a `<form method="get">` submission). The cookie is *not* attached on cross-site `POST`, `<img>`, `<iframe>`, or `fetch` requests. This is the senior default for session cookies because it preserves the magic-link UX while blocking the CSRF surface (a state-changing endpoint refuses cross-site POSTs because the cookie isn't attached). One line on the 2020 Chrome shift that made `SameSite=Lax` the *implicit* default when the attribute is absent — but senior never omits the attribute; they write it explicitly.
  - **`None`** — the cookie is attached on every request, same-site or cross-site, including cross-site embeds and third-party fetches. Requires `Secure`. Reserved for legitimate cross-site use (a payment iframe, an embedded widget the user has authenticated with). In 2026, `SameSite=None` cookies without the `Partitioned` attribute are blocked by Safari and Firefox by default and increasingly degraded in Chrome; `Partitioned` is the senior pair-with — see below.
  *Failure mode `SameSite=Lax` prevents:* the entire classic CSRF attack surface — a malicious page POSTs to `app.acme.com/transfer` and the browser would attach the session cookie. With `Lax`, the cookie doesn't go, the server sees an unauthenticated request, and the transfer fails. This is why `SameSite=Lax` plus state-changing endpoints using POST/PUT/DELETE retires the bulk of the CSRF problem.

- **`Path`** — the cookie is only attached on requests whose pathname starts with this prefix. Default is the path of the page that set the cookie, which is usually a sub-path and produces surprising bugs (a cookie set on `/admin/login` doesn't attach on `/admin/users`). Senior default: `Path=/`. The cookie is scoped by `Domain`/`Origin` rules and by the cookie name; `Path` is not a security boundary — any same-origin script can read across paths if they share a name. One line: `Path` exists for cookie scoping convenience, not for security; do not treat it as one.

- **`Domain`** — the cookie is attached on requests to the named host *and all its subdomains*. **The senior default is to omit `Domain` entirely** so the cookie is host-only (attached only to the exact host that set it). The moment you write `Domain=acme.com`, every subdomain (`app.acme.com`, `api.acme.com`, *and* `marketing.acme.com`) receives the cookie. *Failure mode this prevents:* a session cookie scoped to `app.acme.com` should not be readable by `marketing.acme.com` (which may have a CMS with a lower security bar). Omit `Domain` unless cross-subdomain attachment is the explicit feature.

- **`Max-Age` / `Expires`** — `Max-Age` is seconds-from-now (`Max-Age=2592000` is 30 days). `Expires` is an absolute HTTP-date. **Without either, the cookie is a session cookie** — it lives until the browser closes (which on mobile and tab-restore browsers is "approximately forever," not "the actual session"). Senior default for a session cookie that should expire predictably: `Max-Age` with a value matching the session lifetime. `Max-Age=0` deletes the cookie. The browser ceiling: Chrome and Firefox cap cookie lifetimes at **400 days** (RFC 6265bis); any larger value is clamped silently. Name the cap once.

- **`__Host-` and `__Secure-` prefixes** — naming conventions the browser enforces. A cookie name starting with `__Host-` must be set with `Secure`, no `Domain` attribute, and `Path=/`. A cookie starting with `__Secure-` must be set with `Secure` (but `Domain` and `Path` are unrestricted). The browser rejects the `Set-Cookie` if the attributes don't match. *Failure mode they prevent:* a subdomain attacker setting a cookie that the parent domain reads — `__Host-` makes the cookie host-locked at the browser level, so a write from `evil.acme.com` cannot land a `__Host-sid` cookie that `app.acme.com` reads. Senior rule: prefix session cookies with `__Host-` whenever you don't need cross-subdomain attachment. The `__Host-` prefix is the 2026 default for new code; `__Secure-` is the relaxed alternative for the cross-subdomain case.

- **`Partitioned` (CHIPS)** — the 2026 attribute for legitimate cross-site embeds. A `Partitioned` cookie is keyed not just by its own origin but by the *top-level site* that embeds it; the same widget on `news.com` and `blog.com` sees two completely separate cookie jars. *Failure mode it prevents:* cross-site tracking via shared third-party cookies, which is why Safari and Firefox already block unpartitioned third-party cookies and why `Partitioned` is the path forward. Must be combined with `Secure` and `SameSite=None`. Senior rule: when shipping an embedded widget, a payment iframe, or any legitimate cross-site cookie, set `__Host-` (optional but recommended), `Secure; SameSite=None; Partitioned`. The pair `SameSite=None; Secure` alone is degraded by browsers; `Partitioned` is what restores it.

- **The 2026 third-party-cookie reality.** Safari and Firefox block third-party cookies by default and have for years. Google retreated from forced deprecation in 2024–2025 and announced in April 2025 that Chrome would keep cookie controls inside existing settings rather than ship a separate prompt; in October 2025 Google retired most of the Privacy Sandbox effort. The senior reading: third-party cookies are not dead in Chrome but cannot be relied on, and `Partitioned` is the only mechanism that survives across all browsers. The chapter does not teach analytics tracking, ad attribution, or cross-site identity — that work is mostly being rebuilt on FedCM, first-party data, and server-to-server channels; out of scope here.

- **The senior default written once.** For a session cookie set by the SaaS app on its own domain: `Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`. Read aloud: host-locked name, no JavaScript read, HTTPS only, attached on top-level same-site navigations, scoped to the whole app, expires in 30 days. The student should be able to recite this and explain each attribute.

- **The Next.js 16 `cookies()` helper.** Three call sites, three behaviors.
  - **Read in a Server Component or Route Handler:** `const sid = (await cookies()).get('__Host-sid')?.value`. `cookies()` is async in App Router; the `await` is mandatory.
  - **Write in a Server Action or Route Handler:** `(await cookies()).set({ name: '__Host-sid', value, httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })`. The shape mirrors the attribute table. The `partitioned: true` option is the CHIPS opt-in when needed.
  - **Delete:** `(await cookies()).delete('__Host-sid')` or set `maxAge: 0`.
  - The senior constraint, named once: cookies can only be written in contexts that have not yet started streaming the response — Server Actions and Route Handlers, never Server Components rendering markup. Calling `set` from a Server Component throws. Chapter 5 owns the boundary; this lesson states the constraint and moves on.

- **The client side, named in one line.** `document.cookie` reads non-`HttpOnly` cookies as a single semicolon-separated string. The student does not write `document.cookie` parsers; the senior reach when the client must read a cookie is to use a Server Action / Route Handler to read the cookie server-side and pass the value down, or to read it via a small parser if the cookie was deliberately set non-`HttpOnly`. The lesson does not show the parser.

- **Senior watch-outs.**
  - A cookie set with `SameSite=None` *without* `Secure` is rejected silently by the browser. Pair them or skip both.
  - A cookie set with `Domain` cannot use `__Host-`. Pick one — host-locked or shared.
  - Cookie size cap is 4 KB per cookie, 50 cookies per domain in most browsers. Sessions should hold an opaque ID, not user state. State lives server-side.
  - The `Cookie:` request header concatenates every matching cookie into one comma-prefixed string; large cookies tax every request. Treat the cookie as expensive bandwidth.
  - Setting a cookie and reading it in the same response cycle does not work — the cookie lands on the *next* request. Plan for the round trip.
  - The "browser deletes session cookies on tab close" model is fictional on mobile; treat unbounded session cookies as effectively permanent and prefer `Max-Age`.

What this lesson does not cover:

- Session design — what the cookie value *is* (opaque ID vs. JWT), how it's signed, how it's rotated. Chapter 9.2 (Better Auth setup) owns this; the senior 2026 default is opaque server-stored sessions with the cookie carrying only an unguessable ID.
- CSRF token patterns and double-submit cookies — Chapter 17.2 (security baseline) owns these. `SameSite=Lax` plus state-changing methods retires most of the surface; tokens cover the rest.
- Authentication flows (sign-in, sign-out, magic links, OAuth) — Unit 9 owns these end-to-end; this chapter only names cookies as the storage substrate.
- The `cookies()` helper's full API surface (the `RequestCookies` vs. `ResponseCookies` distinction) — Unit 5 owns the App Router request surface in depth.
- Cookie consent banners, GDPR/CCPA categorization, analytics opt-in flows — Unit 17 and out of scope for the SaaS-app-cookie surface; cookies set for session and CSRF are "strictly necessary" and exempt from consent.
- Cross-site tracking, FedCM, Privacy Sandbox APIs (Topics, Attribution Reporting) — out of scope on this stack.
- Cookie-store API (`cookieStore.set` on the browser) — niche; the senior reach is server-side `Set-Cookie`.
- Legacy `Set-Cookie2`, `expires`-vs-`max-age` history — no historical detour.
- The full RFC 6265bis spec — the senior subset above is what production needs.

Pedagogical approach:

Reference/survey archetype with a Decision-shaped opening (the senior default) and a Pattern-shaped closing (the Next.js helper). The center of gravity is one large attribute table — eight rows (`HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age`/`Expires`, prefixes, `Partitioned`) and four columns (attribute, what it controls, failure mode without it, senior default). Open with one paragraph on the ambient-credential framing and the senior default line; the student commits the default to memory before the table lands. Each attribute then gets one short prose section keyed to its row in the table, with a tiny `Set-Cookie` snippet showing it in context. The `SameSite` section is the longest because it carries the most weight; a small Mermaid `flowchart` or `Table` comparing `Strict`/`Lax`/`None` against three request shapes (same-site fetch, cross-site top-level nav, cross-site POST) drives the cause-and-effect home. The `Partitioned` and prefixes sections each get an `Aside` callout. The Next.js helper is a labeled multi-file snippet — one Server Action setting the cookie, one Server Component reading it, with the constraint named in surrounding prose. Close with one `Matching` exercise pairing six `Set-Cookie` headers (some correct, some with the `SameSite=None`-without-`Secure` bug, some with `Domain` and `__Host-` together, some missing `HttpOnly` on a session) to the failure mode each produces or the fix. Optional `SandboxCallout` with a Route Handler stub setting a cookie, so the student can paste it into the starter, hit it from DevTools, and inspect the cookie jar in the Application panel.

Estimated student time: 50 to 65 minutes.

---

## Lesson 3.4.2 — Quizz

Top 10 topics that should be quizzed:

1. The senior default cookie line — `HttpOnly; Secure; SameSite=Lax; Path=/` with `__Host-` prefix and `Max-Age` — and the failure mode each attribute prevents.
2. `HttpOnly` and the XSS exfiltration path it cuts off, plus the load-bearing point that it does not stop XSS from *using* the cookie.
3. `SameSite=Lax` vs. `Strict` vs. `None` — which requests attach the cookie under each, and why `Lax` is the default for session cookies (top-level safe-method navigations still work, cross-site POSTs don't).
4. The CSRF-defense logic of `SameSite=Lax` combined with state-changing methods (POST/PUT/DELETE), and what it doesn't cover.
5. `Path=/` as the senior default and why `Path` is a scoping convenience, not a security boundary.
6. The `Domain` attribute and the host-only-by-omission default — why writing `Domain=acme.com` leaks the cookie to every subdomain.
7. The `__Host-` prefix — the three attribute constraints the browser enforces (`Secure`, no `Domain`, `Path=/`) and the subdomain-attacker failure mode it prevents.
8. `Partitioned` (CHIPS) — when to use it (legitimate cross-site embeds), what to pair it with (`Secure; SameSite=None`), and the 2026 third-party-cookie reality across Safari, Firefox, and Chrome.
9. `Max-Age` vs. `Expires` vs. session cookies, and the 400-day browser cap on cookie lifetime.
10. The Next.js 16 `cookies()` helper — `await cookies()` in async App Router contexts, reading in Server Components / Route Handlers, writing only in Server Actions / Route Handlers, the option-bag shape, and the "set lands on the next request" round-trip rule.

---

## Total chapter time

Roughly 60 to 80 minutes across the single teaching lesson plus the quiz — a one-evening chapter. The lesson runs long because the attribute table is the lesson, and the student leaves with a memorized senior default and a precise reading of every attribute they'll see on real `Set-Cookie` headers for the rest of the course. Chapter 3.5 lands on this without restating the cookie surface; Unit 9 (auth) and Unit 17.2 (security baseline) are the downstream chapters that lean hardest on this vocabulary.
