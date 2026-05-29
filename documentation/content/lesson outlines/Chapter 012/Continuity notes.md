# Chapter 012 — Continuity notes

Running record for coordinating lessons within this chapter and the unit. Terse facts only.

---

## Lesson 1 — Parse, don't concatenate

**Taught:** URL as a structured value parsed by `new URL()` / `URLSearchParams`; the six-field anatomy (`protocol`, `host`→`hostname`+`port`, `pathname`, `search`, `hash`, read-only `origin`); `new URL(input, base)` (throws → fail-fast for config), `URL.canParse`/`URL.parse` for untrusted input; `URLSearchParams` four construction shapes, `get`/`getAll`/`append`/`set`, `toString()`; the `%20`-vs-`+` percent-encode split; the `encodeURI`/`encodeURIComponent`/`URLSearchParams` decision table; bug classes concatenation produces (param injection, double-encoding, path traversal, IDN, trailing-slash drift).

**Cut:** Senior watch-out "reassigning `url.search` rebuilds `url.searchParams`" (only the forward direction — mutating `searchParams` updates `search` — was taught); no `SandboxCallout` playground (used an `ExternalResource` link to partsofaurl.com instead).

**Debts:**
- `origin` field named as anatomy only; **L2 owns** what origin gates, trust, comparisons. L1 left exactly one forward-nod: "normalization makes origin comparisons reliable."
- `Origin` request header **not** named here — deferred to L2.
- Env-derived base URL pattern (`new URL('/path', baseFromEnv)`) referenced; full env-validation story deferred to a later unit (Unit 5, `@t3-oss/env-nextjs`).
- `useSearchParams()` returns read-only `URLSearchParams` — one-line continuity nod; full treatment Unit 4.
- `URLPattern` named once, no code; Unit 4 middleware uses it.
- Zod/JSON-validation discipline deliberately NOT pulled in (URL parsing is structural, not schema).

**Terminology:**
- "URLs look like strings, and they aren't" / "a URL is a structured value with a parser inside it" — the chapter's core reframe.
- The three-step move: hand string to parser (`new URL`) → manipulate fields (`url.searchParams`) → read string back (`url.href` / `params.toString()`).
- `<Term>` definitions established: **WHATWG**, **percent-encoding** (= URL-encoding), **IDN**, **Punycode**.
- "Encode and decode with the same model, end to end" — the boxed takeaway rule.
- Normalization facts stated (L2 depends on these): `new URL` lowercases the hostname and drops default ports (`:80` http, `:443` https).
- `username`/`password` URL fields intentionally ignored course-wide (deprecated, unsafe).

**Patterns and best practices (for project chapters):**
- Build every URL with `new URL()` + `URLSearchParams`; never string-concatenate or hand-escape query values.
- Let `new URL()` throw at boot for misconfigured config; reserve `URL.canParse`/`URL.parse` for untrusted user input.
- `set` for single-valued params, `append` for repeated keys; do query encode/decode end-to-end with `URLSearchParams`.
- `encodeURIComponent` for a path segment value; `URLSearchParams` for any query; `encodeURI` almost never.
- Treat `URL`/`URLSearchParams` as runtime globals — no imports in any runtime the course ships on.

**Misc.:** Illustrative snippets are deliberately bare expressions (not wrapped in functions/components) as pedagogical staging — note this style if later lessons reuse the convention. Live exercise (`ScriptCoding`, vanilla) grades the `+`-survives-round-trip assertion on a `buildSearchUrl(base, { q, tags })` task.

---

## Lesson 2 — Origin is the unit of browser trust

**Taught:** origin = `(scheme, host, port)` (all three exact-match), accessed via read-only `URL.origin`; site = `(scheme, eTLD+1)` — schemeful, port-agnostic, subdomains share; eTLD/Public Suffix List/registrable domain (with the `github.io` curveball killing the "last two labels" heuristic); classifying any URL pair on both axes (six-row table + 12-item `Buckets` sort); the policy gates the **response read, not the request** (request flies, cookies attach, server runs, browser checks `Access-Control-Allow-Origin` only on the return trip); it protects the **user (response confidentiality), not the server** → state-changing `GET` is exploitable via hidden `<img src>` with no CORS error; carve-outs are embed/navigate permissions not read permissions ("loaded ≠ readable"); cross-window cross-origin property subset (`postMessage`, write-only `location`, `close`/`closed`/`focus`/`blur`, `window[0]`, else `SecurityError`); the `Origin` request header as the browser-owned question CORS answers.

**Cut:** The chapter outline's "2026 site-isolation reality" paragraph (renderer-process-per-site, info-leak nuance) — dropped per outline guidance as browser-internals trivia. COOP/COEP/`Cross-Origin-Resource-Policy` named in outline but NOT introduced here (deferred wholesale to Unit 16). Idempotency keys (outline mentioned for state-changing endpoints) not named.

**Debts:**
- `Access-Control-Allow-Origin` named only as "the header the browser checks"; **L3 owns** CORS mechanics, preflight, the four `Access-Control-Allow-*` headers.
- `Origin` request header introduced (paying L1's deferral); **L3 begins** with the server's answer to it.
- `SameSite` cookies named at the site-boundary forward link as the write defense; **Chapter 013 owns** the attribute model. Stated that `SameSite` keys on the **site** boundary, not origin.
- CSRF tokens named as the other write defense; deferred to chapter 081.
- `postMessage` named as the legitimate cross-origin channel; **Chapter 014 owns** the `message` event model and the must-validate-`event.origin` rule.
- `crossorigin` attribute named once (canvas-taint opt-in), not taught.
- DevTools Network-panel "request sent, response received, code sees error" payoff promised "in a couple of lessons" (L3 / the DevTools work).

**Terminology:**
- **The two boundaries** (course-named): "same-site is permissive (subdomains share), same-origin is strict (subdomains don't share)" — boxed anchor.
- The boxed sentence, reused verbatim in flowchart caption + exercise framing: *"The browser sends the request and lets the response come back, but it refuses to let the cross-origin page read the response."*
- "loaded ≠ readable" — the carve-out reframe.
- "the request flies; only the read is gated" — mechanism shorthand.
- `<Term>` definitions established: **client certificate**, **same-origin policy**, **origin**, **eTLD**, **Public Suffix List**, **registrable domain (eTLD+1)**, **`postMessage`**.
- Same-site is **schemeful** in 2026 (`http`/`https` are different sites); legacy scheme-blind model explicitly retired — do not reintroduce.

**Patterns and best practices (for project chapters):**
- State-changing endpoints use `POST`/`PUT`/`PATCH`/`DELETE`, never `GET` — a `GET` side effect is CSRF-exploitable.
- Reason about confidentiality on the **origin** boundary; never write code depending on renderer-process/site isolation.
- Same-origin app→own-backend calls engage none of this machinery (no `Origin` header on plain same-origin GET) — relevant when deciding whether CORS is even needed.

**Misc.:** No sandbox/live code (concept archetype) — assessment is the `Buckets` sort. Bare illustrative URL strings + two header snippets continue L1's bare-expression staging convention. Mermaid `flowchart LR` carries the request-flies/read-gated visual; checkpoint node deliberately labeled to map onto a future DevTools waterfall.

---

## Lesson 3 — The preflight dance

**Taught:** CORS as a server-configured, browser-enforced opt-in (response headers, never client-set); simple-vs-preflighted decision (3-dim table: method / safelisted headers / `Content-Type`) collapsing to the working rule **"JSON API calls always preflight"** (also any non-safelisted header like `Authorization`); the preflight `OPTIONS` round-trip byte by byte (`Access-Control-Request-Method`/`-Request-Headers` → `Access-Control-Allow-*`, browser cancels real request if unauthorized); the four production response headers + failure mode each (`Allow-Origin`, `Allow-Methods`, `Allow-Headers`, `Allow-Credentials`) plus supporting `Max-Age` (Chrome caps 7200s / Firefox 86400s) and `Expose-Headers`; the wildcard-with-credentials trap + exact-echo-origin fix + the `Vary: Origin` reflex; the three CORS-touching `fetch` knobs (`mode`/`credentials`/`Origin` header) all defaulting correctly for first-party SaaS; reading the four canonical console error strings (`TypeError: Failed to fetch` is generic, detail is the separate red string) mapped to server fixes; the minimal Next.js `route.ts` shape (named `OPTIONS`/`GET` exports, `lib/cors.ts` allow-list helper).

**Cut:** "Preflight cache poisoning" edge case (outline) folded into a one-clause `Max-Age` caveat rather than its own beat; the optional live sandbox downgraded to an `ExternalResource` (MDN preflight) + a "spin up your own when you reach Unit 4" deferral — no `StackBlitzCallout`/`SandboxCallout` shipped.

**Debts:**
- Full cookie attribute surface (`Secure`/`HttpOnly`/`SameSite`/`__Host-`/`Partitioned`) deferred to **Chapter 013**; this lesson cross-references `SameSite=Lax` only at the API-subdomain card (same-site cookies still travel cross-origin-same-site).
- CSRF named in passing; token mechanics **Chapter 081**.
- Full `fetch` surface (body, methods, status, `AbortSignal`) **Chapter 015** — only `mode`/`credentials`/`Origin` named here.
- `route.ts` deliberately bare: **omits** `authedRoute` wrapper, Zod parse, `Result<T>`, Problem Details — those land Unit 6/10+. Downstream agents must NOT pull the full handler stack into this lesson; the headers shown "slot into the fuller shape unchanged."
- Route Handler method-dispatch convention named, full depth **Unit 4 / Chapter 046**.
- `next.config.ts` `headers()` app-wide tool named once to justify per-route choice; **Unit 16** owns the security-header baseline.
- COOP/COEP/`Cross-Origin-Resource-Policy` not introduced (Unit 16).

**Terminology:**
- "CORS is enforced by the browser but configured on the server" — the load-bearing reframe; roles: browser = enforcer, server = authority, `Access-Control-*` headers = contract.
- "The preflight dance" = the `OPTIONS` permission-check round-trip before the real request; "two rows for one fetch" (DevTools `OPTIONS`+real-request waterfall) is the recognition anchor.
- "JSON API calls always preflight" — the boxed working reality.
- "Echo origin ⇒ `Vary: Origin`, always" — the mechanical reflex.
- "The `OPTIONS` export IS the preflight handler" — ties handler to sequence-diagram step.
- `<Term>` definitions established: **CORS**, **simple request**, **preflighted request**, **credentialed request**, **Route Handler**.

**Patterns and best practices (for project chapters):**
- CORS allow-list lives next to the route it guards (`lib/cors.ts` helper read per-route), NOT app-wide in `next.config.ts` — which origins may read a resource is a property of that route.
- Never use `Access-Control-Allow-Origin: *` with credentials; validate incoming `Origin` against an allow-list `Set`, echo the exact value, always pair with `Vary: Origin`.
- `OPTIONS` handler returns `204` empty body with the same headers; forgetting it (or returning non-2xx) is the cheapest CORS bug.
- Pair a modest `Access-Control-Max-Age` (e.g. `7200`) with exact-echo origin.
- Same-origin app→own-backend needs zero CORS; prefer server-to-server fetch or a `rewrites()` proxy to make CORS vanish when a third party ships none.
- Client side stays on `fetch` defaults (`mode: 'cors'`, `credentials: 'same-origin'`); `credentials: 'include'` is the deliberate cross-origin-authenticated reach requiring `Access-Control-Allow-Credentials: true`.

**Misc.:** Pattern archetype with heavy mechanics body. Assessment is the `Matching` exercise (four canonical error strings → server fixes); a 3-item `TrueFalse` checks the preflight-prediction skill mid-lesson. Mermaid `sequenceDiagram` (Page/Browser/Server, blue preflight band + green real-request band, `themeCSS` font bump) is the spine; a `PreflightWaterfall` lesson component (`src/components/lessons/012/3/`) inside `DiagramSequence` recasts it as a 4-step DevTools waterfall. Server snippets live inside handler functions (departs L1/L2 bare-expression staging, as expected). Reused L2's verbatim cliffhanger line in the intro.
