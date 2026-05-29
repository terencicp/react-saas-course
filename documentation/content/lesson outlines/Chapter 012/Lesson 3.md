# The preflight dance

- Title (h1): The preflight dance
- Sidebar label: The preflight dance

---

## Lesson framing

This is the chapter's mechanics-heavy payoff lesson. L2 left the student knowing *what* the same-origin policy blocks (cross-origin response reads) and *who* it protects (the user, not the server), and it introduced the `Origin` request header as "the browser-owned question." This lesson teaches the server's **answer**: CORS, the opt-in protocol that loosens the same-origin default for chosen origins.

Pedagogical conclusions that apply lesson-wide:

- **Lead with the decision, not the syntax.** The senior question is "will this `fetch` preflight, and what four headers does the server owe the browser?" Frame CORS as a server-side opt-in the whole way through — it is *not* a client feature, the client never sets `Access-Control-*`, and a non-browser caller ignores CORS entirely. This framing is the single most common beginner confusion (students try to "fix CORS" on the client).
- **Anchor on one working reality:** *JSON API calls always preflight.* The simple-request criteria are worth knowing precisely, but the operational takeaway is that the SaaS UI's `Content-Type: application/json` calls all trigger an `OPTIONS`. Teaching the criteria as trivia and then collapsing them to this one rule minimizes cognitive load.
- **Build the mental model in stages.** (1) Simple request: send, then the browser checks the response. (2) Preflighted request: ask first via `OPTIONS`, wait for authorization, then send. (3) The four response headers each map to a concrete failure mode. (4) The wildcard-with-credentials trap as the production foot-gun. Each stage adds one layer; never present the full header palette cold.
- **The pain CORS relieves vs. the pain CORS *is*.** CORS exists so a server can safely share responses across origins; but mis-set CORS is itself a top-3 production-error source. The lesson's value is letting the student *predict* the path and *read* the error, not memorize a config blob.
- **Tie every header to its DevTools-visible failure.** L2 promised a payoff "in a couple of lessons": the Network panel showing "request sent, response received, code still errors." This lesson delivers it — the four canonical browser error strings are the production reality, and reading them is half the skill. Pair each header with the exact error its absence produces.
- **Ground in the course's monolith default.** The SaaS-on-Next default is *same-origin* (app calls its own backend) → no CORS at all. CORS is the conditional reach: dedicated API subdomain, third-party API, browser extension, marketing site → app. Name the trigger before the tool (pedagogical filter "defaults before conditionals").
- **Code is illustrative, not project code.** One small, paste-able Next.js Route Handler with a `withCors` helper. The student is *not* expected to have built a Next backend yet (App Router depth is Unit 4+); the handler is shown as a recognizable shape, framed as "this is what the answer looks like," with the `OPTIONS`/`GET`/`POST` named-export dispatch named but not deeply taught. Keep the Result/Zod/`authedRoute` machinery from the code conventions OUT — those are Unit 10+ and would bury the CORS signal. Note this divergence so downstream agents keep the handler minimal.
- **Diagrams + exercises carry the load.** A Mermaid `sequenceDiagram` is the spine (the literal "dance"). A `DiagramSequence` reframes the same preflight as a DevTools-waterfall the student will recognize. A `Matching` exercise on the four error strings is the assessment. An optional sandbox lets the curious watch a real preflight fire.

Lesson archetype: **Pattern, with a heavy Mechanics body.** Estimated student time 50–65 min — this lesson carries the chapter's mechanics weight.

---

## Lesson sections

### Introduction (no header)

One to two short paragraphs, warm and terse. Recall the L2 cliffhanger in one sentence using the chapter's reused verbatim line: *the browser sends the request and lets the response come back, but it refuses to let the cross-origin page read the response* — and the `Origin` header as the question. State the lesson goal: CORS is how the **server answers** that question, opting chosen origins into reading the response. Preview the practical skill: by the end the student can predict whether any `fetch` preflights, write the four production response headers, dodge the wildcard-with-credentials trap, and diagnose a CORS error from its exact wording. Drop the senior question implicitly: *"Will this call preflight, and what does my server owe the browser?"*

Set the monolith framing immediately so the student knows the scope: a same-origin Next app calling its own backend engages **none** of this — CORS is the cross-origin reach. One sentence, with a forward pointer to the "When CORS doesn't apply" section so the student isn't anxious about over-applying it.

### CORS is the server's opt-in, not a client feature

The senior framing, one tight section. Define CORS (`<Term>`: Cross-Origin Resource Sharing) as a set of **response** headers the server sends to tell the browser "this response may be read by these other origins." Hammer the load-bearing reframe: **CORS is enforced by the browser but configured on the server.** The client `fetch` never sets `Access-Control-*` headers; "fixing CORS in the frontend" is the beginner mistake. The browser is the enforcer; the server is the authority; the headers are the contract.

Two shapes preview (sets up the next two sections): **simple requests** (browser sends, then checks the response headers after the fact) and **preflighted requests** (browser asks first with `OPTIONS`, waits for authorization, then sends the real request). One sentence each. No code yet — this is the conceptual hinge.

Use a short `Aside type="caution"` titled something like "CORS lives on the server" reinforcing that a CORS error in the browser console is almost always a server-config fix, not a client change. This pre-empts the chapter's most common confusion before any mechanics land.

`<Term>` candidates here: **CORS**, **preflight** (define as "a permission-check `OPTIONS` request the browser sends before the real one").

### Will this request preflight?

The simple-vs-preflighted decision. This is the predictive skill, so lead with it before the `OPTIONS` mechanics.

Present the simple-request criteria as a markdown `Table` (native MDX table; no Table component exists). The cleanest shape per the outline: three rows keyed on the dimension that decides simple-ness:

| Dimension | Simple (no preflight) | Anything else preflights |
| --- | --- | --- |
| Method | `GET`, `HEAD`, `POST` | `PUT`, `PATCH`, `DELETE`, … |
| Headers | only CORS-safelisted (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`, `Range`) | any other header (e.g. `Authorization`) |
| `Content-Type` | `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` | `application/json`, anything else |

Below the table, the **one rule that matters**, set off as a `<Aside type="tip">` or a bolded sentence: *"In practice, any `fetch` sending `Content-Type: application/json` preflights — and that's nearly every API call your SaaS UI makes. Treat 'JSON APIs always preflight' as the working reality."* Add the one-liner that a custom header like `Authorization` also forces preflight, so token-bearing calls always preflight too. (Mention `ReadableStream` bodies preflight in a single trailing clause; do not dwell.)

Reasoning: the criteria are spec-precise but the student only needs to *recognize* simple requests (form posts, image beacons) and *assume preflight* for everything the app actually does. Fact verified against the fetch spec — `application/json` is not safelisted, so it always preflights.

Optional tiny `MultipleChoice` or 3-item `TrueFalse` check right here — "does this fetch preflight?" with a `GET` with no custom headers (no), a `POST` with JSON body (yes), a `GET` with an `Authorization` header (yes). Keeps the predictive skill active before the mechanics. Prefer `TrueFalse` (3 statements) for speed; this is a low-stakes recognition check, not the main assessment.

### The preflight dance, step by step

The mechanical heart and the lesson's namesake. Teach the `OPTIONS` round-trip.

Primary vehicle: a Mermaid `sequenceDiagram` wrapped in `<Figure>`, three actors — **Browser**, and **Server** (and optionally the **Page/JS** as the originator to show JS never sees the OPTIONS). Lanes, in order:

1. Page calls `fetch('https://api.acme.com/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }})`.
2. Browser → Server: `OPTIONS /invoices` carrying `Origin: https://app.acme.com`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type`.
3. Server → Browser: `204` with `Access-Control-Allow-Origin: https://app.acme.com`, `Access-Control-Allow-Methods: …`, `Access-Control-Allow-Headers: content-type`.
4. Browser checks the headers; if they match, Browser → Server: the real `POST` (with `Origin`).
5. Server → Browser: `200` + body + `Access-Control-Allow-Origin`.
6. Browser hands the body to the Page.

Add a note/annotation in the diagram that if step 3's headers don't match, the browser **cancels the real request** and surfaces the CORS error — the JS `fetch` promise rejects with a generic `TypeError` and the *detail* is only in the console. This connects to the error-reading section.

Apply the `themeCSS` font-size bump from the Mermaid doc (`.messageText` ~18–22px) since this is a wide multi-message diagram that Starlight will scale down. Escape any literal `;` in message text with `#59;`.

Caption it so the student can map each lane onto a DevTools Network waterfall — explicitly say "you'll see two rows: an `OPTIONS` then your `POST`."

Then a **`DiagramSequence`** (scrubbable) recasting the *same* exchange as a DevTools-style two-row waterfall: step 1 shows only the `OPTIONS` row pending, step 2 shows it resolved `204`, step 3 shows the real `POST` firing, step 4 shows the `200` + body arriving. Pedagogical goal: cement that **the preflight is a real, separate network request** the student will literally see in DevTools — paying off L2's promised "request sent, response received" payoff in the tool they'll use. Content is custom HTML rows styled like a network panel (two labeled request rows with method/status/timing pills). Keep ≤4 steps, cap height per the diagram vertical-space rule.

Briefly name the byte-level preflight request headers in prose under the diagram (`Access-Control-Request-Method`, `Access-Control-Request-Headers`) so the student recognizes them in DevTools, but the diagram carries the load — don't re-list them in a table.

### The four headers your server owes the browser

The response-header palette. This is the reference section the student will return to.

Present as a markdown `Table` keyed on header name with three columns — **purpose**, **failure mode without it**, **example value** — exactly the outline's prescribed shape. Rows:

| Header | What it does / failure mode | Example |
| --- | --- | --- |
| `Access-Control-Allow-Origin` | Names which origin may read the response. Missing → browser refuses the read, page sees the canonical "No 'Access-Control-Allow-Origin' header" error. | `https://app.acme.com` (echoed exact origin; `*` works only without credentials — see trap) |
| `Access-Control-Allow-Methods` | (preflight only) Lists allowed methods. Missing → a `PUT`/`DELETE`/`PATCH` is rejected at preflight. | `GET, POST, PUT, DELETE, PATCH` |
| `Access-Control-Allow-Headers` | (preflight only) Lists request headers the real request may send. Missing → any custom header (incl. JSON `Content-Type`, `Authorization`) trips preflight. | `content-type, authorization` |
| `Access-Control-Allow-Credentials` | Opts the response into being readable on credentialed requests; pair with client `credentials: 'include'`. Missing → cookies/auth not usable, response blocked. | `true` |

Below the four, a short paragraph naming the **two supporting headers** with one line each:
- `Access-Control-Max-Age: 86400` — caches the preflight result so the browser stops re-`OPTIONS`-ing every call. Add the verified caveat: **Chrome caps this at 7200s (2h), Firefox at 86400s (24h)** — so a larger value is silently clamped. Senior pairs a modest max-age with an exact-echo origin.
- `Access-Control-Expose-Headers: X-Total-Count, X-Page` — lets JS read non-safelisted *response* headers (default exposed set is `Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`). The pagination/total-count case is the canonical reason a senior reaches for it.

Reasoning: keep the four "production" headers visually primary and the two supporting headers as a secondary tier — mirrors how often each is actually needed and controls cognitive load.

### The wildcard-with-credentials trap

The chapter's flagged "most common production CORS bug." It earns its own section because naming it once is, per the outline, half the lesson.

Teach the rule plainly: `Access-Control-Allow-Origin: *` is legal **only** when the request is *not* credentialed. The moment the client sends `credentials: 'include'` and the server answers `*`, the browser refuses the response — the page sees the canonical "...must not be the wildcard '*' when the request's credentials mode is 'include'" error.

The fix, as a tight before/after using `CodeVariants` (two variants, "Broken" / "Fixed"), each a tiny server-side header-set snippet:
- **Broken:** `res.headers.set('Access-Control-Allow-Origin', '*')` + `credentials: 'include'` on the client → blocked. Use `del=` marker on the `*` line.
- **Fixed:** validate the incoming `Origin` against an allow-list, **echo the exact value back**, add `Access-Control-Allow-Credentials: true` AND `Vary: Origin`. Use `ins=` markers. Show the allow-list as a small `Set`/array check.

Immediately follow with the **`Vary: Origin` reflex** as its own short beat (a `<Aside type="caution">` titled "Echo the origin? Then `Vary: Origin`"): the moment the response *depends on* the request's `Origin` (which it does once you echo it), the server must send `Vary: Origin` so any CDN or browser cache keys the response by origin. Without it, a response cached for origin A is served to origin B and the browser rejects it — a confusing, intermittent, cache-shaped bug. One paragraph; the rule is mechanical: *echo origin ⇒ `Vary: Origin`, always.*

`<Term>` candidate: **credentialed request** (a cross-origin request that carries cookies/HTTP-auth/client-cert because the client set `credentials: 'include'`).

### The three fetch knobs that touch CORS

The client surface, named once, framed as "what the client controls — which is less than you'd think." Three knobs, each one line, emphasizing the **default is the senior pick** and the client never touches `Access-Control-*`:

- `mode` — defaults to `'cors'` for cross-origin (the only useful value); `'same-origin'` rejects cross-origin; `'no-cors'` sends the request but the response is **opaque** (unreadable — a trap for the impatient). Senior never sets it.
- `credentials` — defaults to `'same-origin'` (cookies attach only same-origin); `'include'` attaches on cross-origin too (and requires `Access-Control-Allow-Credentials: true` server-side); `'omit'` never attaches. Default is the first-party SaaS pick; `'include'` is the explicit, deliberate cross-origin-authenticated reach.
- The `Origin` header — set by the **browser automatically**; the application can never write or forge it. Servers can *validate* it but cannot *trust* it from a non-browser client (which can send anything).

Keep this terse — a short `Code` block or a 3-row markdown table. Cross-reference L2: `credentials: 'same-origin'` is why the monolith default carries cookies without ceremony. Reasoning: the student must leave knowing the client side is mostly defaults, so they stop trying to fix server problems on the client.

Forward-link in one clause: the full `fetch` body/method/`AbortSignal` surface is Chapter 015; here we only name the CORS-touching knobs.

### Reading the CORS error in the console

The diagnostic skill — per the outline, "reading them is half the skill." This is the lesson's main assessment.

Brief prose: a CORS failure rejects the `fetch` promise with an unhelpful generic `TypeError: Failed to fetch`; the *actionable* detail is the red console string. Train the student to read four canonical messages. Each maps one-to-one to a fix the student already learned.

Deliver as a **`Matching`** exercise (the outline's prescribed component) — left column = the four error strings (abbreviated to the load-bearing phrase), right column = the fix. Use `instructions` to frame it. The four pairs:

1. "No 'Access-Control-Allow-Origin' header is present on the requested resource." → Server didn't send the header — add it in the route handler.
2. "...must not be the wildcard '*' when the request's credentials mode is 'include'." → The wildcard-with-credentials trap — echo the exact origin + `Vary: Origin`.
3. "Response to preflight request doesn't pass access control check: It does not have HTTP ok status." → The `OPTIONS` handler returned non-2xx — return `204` with the headers.
4. "Request header field 'authorization' is not allowed by Access-Control-Allow-Headers in preflight response." → Add `authorization` (or the offending header) to `Access-Control-Allow-Headers`.

(Four pairs is within `Matching`'s 8-pair comfort bound and its 8-hue limit.)

Reasoning: matching forces the student to bind symptom→cause, which is exactly the debugging move; it reuses every concept from the prior sections, so it doubles as recall. This is preferable to a sandbox here because the skill is *reading*, not *writing*.

### What the answer looks like in Next.js

The single illustrative code artifact. Frame it explicitly as recognition, not authorship: "you haven't built a Next backend yet (that's Unit 4 and beyond) — but here's the shape of the server's answer so you recognize it when you write it."

Use `CodeVariants` to group the **two files** (the outline's "one labeled multi-file block"):
- **`lib/cors.ts`** — a tiny `withCors(handler)` helper (or a `corsHeaders(origin)` function) that: validates `origin` against an allow-list `Set`, echoes it into `Access-Control-Allow-Origin`, sets `Allow-Methods`/`Allow-Headers`/`Allow-Credentials`/`Max-Age`, and adds `Vary: Origin`. Plain TS, no Zod/Result/`authedRoute` — note this is a deliberate simplification (those land Unit 10+).
- **`app/api/invoices/route.ts`** — named exports `OPTIONS` (returns `new Response(null, { status: 204, headers })`) and `GET`/`POST` (returns `NextResponse.json(body, { headers })` wrapped by `withCors`). One sentence naming the App-Router convention: a `route.ts` file dispatches by HTTP method via named-export functions; full depth in Unit 4 / Chapter 046.

Prefer `CodeVariants` over `AnnotatedCode` because there are two related files (its stated use case). If a single-file deep focus is wanted instead, `AnnotatedCode` on the `route.ts` is an acceptable alternative — but two-file grouping better shows the helper/handler split that is the senior pattern (allow-list lives next to the route).

Two short follow-up beats in prose:
- **The `OPTIONS` handler IS the preflight handler** — the same four headers, status `204`, empty body. Tie back to the sequence diagram's step 3 and to canonical error #3.
- **Why per-route, not `next.config.ts` `headers()`** — one sentence: the allow-list belongs next to the route it guards; the config-level `headers()` is a coarser, app-wide tool (Unit 16's security baseline owns it). Defaults-before-conditionals: per-route is the senior reach here.

Code-convention alignment to honor: named exports for `GET`/`POST`/`OPTIONS` (the framework-dictated default-export list does NOT include these as default — they're named exports; verified against conventions doc line 56 and line 242). `route.ts` filename. Keep the body minimal and note the omission of the Result/Zod/wrapper stack as intentional staging.

`<Term>` candidate: **Route Handler** (a Next.js `app/api/.../route.ts` file that responds to HTTP requests by exporting one function per method).

### When CORS doesn't apply

The scoping section — prevents the student from over-applying CORS, and names the bypass paths so they aren't confused with the policy. Short, mostly a `BulletList` / `CardGrid` of cases, one to two lines each:

- **Same-origin app → its own backend** — no CORS, no headers, nothing. The SaaS-on-Next-monolith default and the course's normal case. (Reassures the student that most of their code never touches this.)
- **API subdomain** (`api.acme.com` ↔ `app.acme.com`) — cross-origin but **same-site** (callback to L2's two boundaries): CORS *is* required, yet `SameSite=Lax` cookies still travel because the site matches. One line; defer cookie depth to Chapter 013.
- **Server-to-server fetch** (a Next Route Handler or Server Action calling a third-party API) — **no browser, no `Origin` header, no CORS check at all.** A common "I'll just fetch it from the server" escape hatch.
- **Reverse proxy / Next `rewrites()`** — expose a third party under your own origin and cross-origin collapses to same-origin; CORS becomes unnecessary at the cost of a network hop. Senior reach when a third party ships no CORS and a full server proxy is overkill.
- **Browser extension / `null` origin** — content scripts send `Origin: null`; allow-list it explicitly or refuse it. One line, edge-case awareness only.

Reasoning: this section operationalizes the "trigger before tool" filter from the back — having taught the tool, it re-draws the boundary of *when you actually need it*, which is the senior judgment the chapter is really selling.

### Optional: watch a preflight fire (sandbox)

A single optional embed so the curious student can see a real `OPTIONS`/`POST` pair in DevTools. Use `StackBlitzCallout` (`mode="github"`, a minimal Next route handler repo) OR a generic `SandboxCallout`, gated with `ctl` to spare CPU, `label` like "Open the CORS playground." The framing sentence: paste/open the route handler, hit it from a different origin (the outline's `http://localhost:5500` against the dev server), and watch the two-row waterfall in the Network panel — the diagram made real.

Keep this clearly optional and last-in-section; it is not load-bearing (the `Matching` exercise is the real assessment). If a vetted public repo/sandbox isn't readily available, downgrade to an `ExternalResource` link to MDN's CORS guide instead rather than fabricate a project ID.

### External resources (optional)

One or two `ExternalResource` cards: MDN's "Cross-Origin Resource Sharing (CORS)" guide (the canonical reference for the header palette and error strings) and optionally the WHATWG Fetch spec's CORS protocol section for the spec-precise reader. Keep to the lesson's end per the lesson structure.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- Origin = `(scheme, host, port)`; site = `(scheme, eTLD+1)`; the two boundaries (L2). Restate in one clause only where the API-subdomain case needs it.
- The same-origin policy gates the **response read, not the request**, and protects the **user, not the server** (L2). One-sentence recall in the intro using the verbatim chapter line.
- The `Origin` request header is browser-set and answers "who is asking" (introduced L2). This lesson begins with the server's answer to it.
- `new URL()` / `URLSearchParams` (L1) — assume fluent; use freely in any URL shown, never explain.

**This lesson does NOT cover (owned elsewhere):**
- Cookie attribute surface — `Secure`, `HttpOnly`, `SameSite`, `__Host-`, `Partitioned`. **Chapter 013.** CORS-with-credentials cross-references `SameSite` only at the API-subdomain bullet; the full attribute table is Ch. 013's. Do not teach cookie flags here.
- CSRF token patterns / double-submit cookies — **chapter 081.** May name CSRF in one clause (L2 already framed write-defense) but no token mechanics.
- The `fetch` request **body, methods, status handling, `AbortSignal`** — **Chapter 015.** This lesson names only `mode`, `credentials`, and the `Origin` header as the CORS-touching knobs; nothing else about `fetch`.
- Server Actions vs. Route Handlers as a **design decision**, and the full Route Handler depth (Zod parse order, `Result`, `authedRoute`, Problem Details, RFC 9457) — **Unit 4 / Unit 6 / Unit 10+.** The `route.ts` here is a deliberately bare illustrative shape; explicitly note the omission so downstream agents don't pull in the conventions' full handler stack.
- `next.config.ts` `headers()` for app-wide headers — **Unit 16** (security-header baseline). Named in one sentence only to justify the per-route choice.
- `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` — **Unit 16.** (The course site itself is COOP/COEP-isolated, but that's not this lesson's topic.) Do not introduce.
- API gateways, service mesh, mTLS — **out of scope on this stack.**
- `URLPattern`, Next route matching / `params` / `searchParams` — **Unit 4.** Not relevant here.

**Deliberate divergences from code conventions (noted for downstream agents):**
- The illustrative `route.ts` omits the `authedRoute` wrapper, Zod parse-in-order, `Result<T>` returns, and Problem Details error shape mandated by the Route Handlers convention. Rationale: those are Unit 10+ machinery and would drown the CORS signal in a lesson where the student hasn't yet built any Next backend. Keep the handler to: method dispatch + the four headers + `Vary: Origin`.
- Headers are set imperatively for teaching clarity (`headers` object / `NextResponse.json(body, { headers })`); this matches the verified Next.js 16 idiom and the chapter outline's `withCors` helper. Fine to ship.

---

## Notes for downstream agents

- **Lesson id for component import paths:** lesson MDX lives at `src/content/docs/012 .../3 The preflight dance.mdx`; component imports use the `../../../components/...` depth shown in each component doc. Any lesson-specific custom component (none strictly required here) would go under `src/components/lessons/<lesson id>/`.
- **Verified facts (May 2026):** `application/json` is NOT CORS-safelisted → always preflights (Fetch spec / MDN). Chrome caps `Access-Control-Max-Age` at 7200s, Firefox at 86400s (MDN). Preflight `OPTIONS` should answer `204` (or `200`) with the headers and empty body; non-2xx → canonical error #3. Next.js 16 sets CORS via `NextResponse.json(body, { headers })` or `new Response(null, { status, headers })` with named-export method functions in `route.ts` (Next.js docs).
- **Mermaid:** apply `themeCSS` font bump (`.messageText` ~18–22px) on the wide sequence diagram; escape literal `;` as `#59;`; wrap in `<Figure>`.
- **Bare-expression staging:** L1/L2 used bare illustrative snippets (not wrapped in functions/components). This lesson's server snippets necessarily live inside handler functions — that's fine and expected; the convention applied to client-side URL/header expressions, which this lesson has few of.
