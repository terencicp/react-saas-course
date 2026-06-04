# Lesson outline — Chapter 033, Lesson 2

## Lesson title

- **Title:** proxy.ts and the matcher
- **Sidebar label:** proxy.ts and the matcher

## Lesson framing

This lesson installs the second of the chapter's three request channels: code that runs *before* the route, at the network boundary.
Lesson 1 owned cookies + headers read inside the render; this lesson owns the file that runs ahead of the render and can short-circuit, rewrite, or enrich the request before any route code executes.

**The single mental model the student should leave with.**
`proxy.ts` is a *network proxy in front of the app*, not Express-style application middleware.
It is a fast gate, not a place for application logic.
Two consequences fall out of that one framing and the lesson keeps returning to them:
1. **Cost** — every request the matcher selects pays the proxy roundtrip, so the matcher is the first thing a senior tunes.
2. **Cheap-vs-authoritative** — the proxy does the cheap thing (cookie *presence*, a header rewrite); the route does the authoritative thing (real session validation, DB reads). Defense in depth, not duplication.

**Why this framing matters pedagogically.**
Juniors arriving from Express treat middleware as "the place all my per-request logic goes." That instinct is the central misconception to dismantle. The rename from `middleware.ts` to `proxy.ts` is the lever: Vercel renamed it *specifically* to kill the Express association, and the lesson uses the rename as the hook for the whole "what belongs here / what doesn't" decision. Leading with the rename also serves the practical need — the student will meet `middleware.ts` in every pre-16 codebase and AI-generated snippet, and must recognize it as the deprecated former name.

**Decisions before syntax.** The `NextRequest`/`NextResponse` surface is recognition-not-recall — the student should leave able to *read* a proxy file and know where to look things up, not having memorized the API. The load-bearing teaching is the four legitimate jobs, the matcher cost model, the cheap-vs-authoritative split, and the proxy→route header pattern. Syntax is shown in service of those decisions.

**Scope discipline.** This lesson is the *anatomy of the file and its cost surface*. Rewrites/redirects get named as one of the four jobs and shown in the worked example at a depth sufficient to motivate them, but the redirect-vs-rewrite semantics, status codes, open-redirect prevention, and the proxy-vs-`next.config` decision tree are lesson 3's whole subject — defer them. Auth verification internals are Unit 8 — the proxy gets the *slot* (cookie-presence check), not the wiring.

**Tone.** Adult, terse, senior-mindset. Every API detail is anchored to a production stake (the bill, the 3am debug, the security boundary). The student is building real SaaS; frame the proxy as the thing that's invisibly cheap when configured right and an invisible tax when not.

**Two facts the chapter outline got stale on — corrected in this outline, downstream agents must follow the corrected form:**
- `request.geo` and `request.ip` were **removed** from `NextRequest` (Next.js 15, PR #68379). The chapter-outline bullet listing them as part of the `NextRequest` surface is outdated. Geolocation/IP now come from `@vercel/functions` (`geolocation(request)`, `ipAddress(request)`) on Vercel, or from platform headers elsewhere. Teach the corrected form; mention `request.geo`/`request.ip` only as "removed, you'll see it in old code."
- The auth-gating example anchors on Better Auth's `getSessionCookie(req, { cookiePrefix: SESSION_COOKIE_PREFIX })` cookie-**presence** check (per Code conventions §Authentication), not a hand-rolled "decode the JWT." Decoding/verifying is the route's job. Keep the proxy example presence-only.

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the senior question, concretely: a request to `/dashboard` lands on the server; before the route renders, the app wants to bounce signed-out users to `/sign-in` and rewrite a legacy URL. Where does code that runs *before the route* live, what does running it on every request cost, and what's the rename the student will see in older code?
Name the three deliverables of the lesson in one breath: the `proxy.ts` file convention (renamed from `middleware.ts`), the matcher as the cost-control knob, and the rule for what belongs in the proxy versus the route.
Connect back to lesson 1: "Last lesson you read cookies and headers *inside* the render. This lesson is about code that runs *before* the render and can change the request before the route ever sees it." Keep it to a short paragraph; the senior question carries it.

### From middleware.ts to proxy.ts

The rename and the *why*, because the why is the mental model.
Teach: Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` and the exported function from `middleware` to `proxy`. The rename is semantic, not cosmetic — "middleware" collided with the Express meaning (a chain of per-request application handlers) and encouraged piling application logic into it. "Proxy" names what it actually is: a network boundary in front of the app that can short-circuit, rewrite, or pass through a request before it reaches route code. State plainly that the framework now treats this as a *last-resort* tool — reach for a route-level pattern first.
Cover the migration mechanics tightly: `middleware.ts` is deprecated and warns at build; the codemod `npx @next/codemod@canary middleware-to-proxy .` renames the file and the function (the docs use the `@canary` tag for this codemod — keep it). Custom imports or edge-specific code may need manual cleanup after the codemod — name this so the student doesn't trust it blindly.
The practical anchor: the student *will* see `middleware.ts` and `export function middleware` in pre-16 repos and in most AI-generated snippets — recognize it as the old name for this exact file.

**Component:** a small `CodeVariants` with two tabs, "Next.js 16 (`proxy.ts`)" and "Legacy (`middleware.ts`, deprecated)", same trivial body (a one-line redirect), so the student sees the rename is *just* the filename + function name, logic unchanged. Use `del=`/`ins=` framing is overkill here; plain blocks with the first-sentence prose calling out "identical body, renamed shell." Keep both under ~8 lines.

**Tooltip (`Term`):** "codemod" — "An automated script that rewrites your source code to a new API. Next.js ships codemods for breaking changes."

### Where the proxy runs and what that costs

The runtime and the cost model — the conceptual core of the cheap-gate framing.
Teach the runtime first: `proxy.ts` runs on the **Node.js runtime** in Next.js 16, and this is not configurable — setting the `runtime` config option in a proxy file *throws*. The Edge runtime was the old deployment target; for new code in 2026 it's named once and set aside. The senior payoff: the proxy's capabilities and cold-start story are now uniform with the rest of the app — no separate edge-only API subset to reason about. On Vercel the proxy ships to a fast Node function near the user.
Then the cost model, which is the lesson's recurring drumbeat: **the proxy runs on every request the matcher selects, before the route renders.** With no matcher it runs on *everything* — every page, every `_next/static` asset, every `_next/image` optimization, every file in `public/`. That's latency and serverless invocation cost on requests that have nothing to do with auth or rewrites. Frame it as the watch-out the chapter outline flags: "a performance regression that's invisible until the bill arrives."
Set up the next section: the matcher is how you stop paying for requests the proxy doesn't care about.

**Diagram — request lifecycle through the proxy.** Pedagogical goal: pin *where* the proxy sits and the *three outcomes* a request can have, so the rest of the lesson has a shared spatial model. Use a **Mermaid `flowchart LR`** inside a `<Figure>` (horizontal, fits the short-viewport constraint). Shape: `Client request` → `Matcher` decision node → on no-match, straight to `Route renders`; on match, into `proxy()` which fans to three terminals: **(a) short-circuit** (`NextResponse.redirect` / a `Response` with a status — route never runs), **(b) rewrite** (`NextResponse.rewrite` — different internal route renders, URL unchanged), **(c) pass through** (`NextResponse.next()` — the matched route renders, optionally with enriched headers). Keep labels terse; this is a "where things sit" diagram, not an exhaustive API map. Caption ties it to the cost model: only the matched branch pays the proxy.

### The matcher: the cost-control surface

The first knob a senior tunes. This is a load-bearing section — give it room.
Teach the three matcher forms, simplest first (cognitive-load ramp):
1. **A single string** — `matcher: '/dashboard/:path*'`. Introduce the path-to-regexp segment syntax minimally: `:path*` is zero-or-more segments, `:path` is one, `?`/`+` modifiers exist. Don't over-teach the syntax — name it and point at the shape.
2. **An array of strings** — `matcher: ['/dashboard/:path*', '/settings/:path*']`. The common "run on these app sections" shape.
3. **The negative-lookahead regex** — the canonical production shape for "run on everything *except* assets": `'/((?!api|_next/static|_next/image|favicon.ico).*)'`. This is the pattern the student will copy most; explain *why* it exists (the default matches assets, this excludes them) rather than asking them to parse the regex character by character.
4. **The object form** — `{ source, has, missing, locale }`. Cover `has`/`missing` as the predicate gate: `missing: [{ type: 'cookie', key: '__Host-...' }]` runs the proxy only when a cookie is *absent* (the "gate unauthenticated requests" shape); `has` for the inverse; `type` can be `'cookie' | 'header' | 'query'`. This is the form that lets the matcher itself do cheap gating before the function body even runs.

Two non-obvious facts to surface (both from current docs, both senior-relevant):
- **The matcher must be statically analyzable** — values are read at build time, so a matcher built from a runtime variable is silently ignored. Name it; it's a real footgun.
- **The Server Function trap.** A matcher that excludes a path *also* stops the proxy from running on Server Action POSTs to that path. The framework's own guidance: never rely on the proxy alone for auth — verify inside each Server Function / route. This is the strongest possible motivation for the cheap-vs-authoritative split coming next, so plant it here and pay it off in "What belongs in the proxy."

**Component:** `AnnotatedCode` over a single `config` export that shows the negative-lookahead-plus-`missing` object form (the real production matcher). Steps walk: (1) the `source` negative lookahead excluding assets, (2) the `missing` cookie clause gating to signed-out requests, (3) the static-analyzability note as a callout on the literal array. ~6 lines of code, 3 steps, `color="blue"`.

**Exercise — `Buckets`, two columns.** Title-frame: "Should the proxy run on this request?" Buckets: "Matcher should select it" / "Matcher should exclude it". Items (drag): `GET /dashboard`, `GET /settings/billing`, a request for `/_next/static/chunk.js`, an `<img>` from `/public/logo.png`, `GET /api/health`, `POST` to a sign-in route. Pedagogical goal: cement the cost model — assets and most API routes should be excluded; app pages selected. Grading is the bucket match. This checks the single most consequential decision in the lesson (matcher scope) with near-zero ceremony.

**Tooltips (`Term`):** "path-to-regexp" — "The library Next.js uses to turn matcher path patterns like `/dashboard/:path*` into regular expressions."; "negative lookahead" — "A regex group `(?!...)` that matches only when the enclosed pattern is *not* present — used here to match every path except the listed assets."

### What belongs in the proxy, and what doesn't

The decision section — the heart of the senior framing. This is where the Express misconception gets fully dismantled.
Teach the **four legitimate jobs**, each in one or two sentences with the production stake:
1. **Auth gating** — bounce signed-out requests cheaply (cookie *presence*, then redirect to `/sign-in?next=...`). The proxy is the fast bounce; the route does the real validation.
2. **Rewrites and redirects** — URL migrations and internal route swaps (named here; lesson 3 owns the depth).
3. **Request enrichment** — set a header the downstream route reads via `headers()` (the proxy→route pattern, next section).
4. **Feature-flag / A/B routing** — bucket via a cookie the proxy writes and downstream routes read.

Then the **anti-list**, framed as the consequences of the proxy being a network boundary, not the app:
- **No database queries on every request** — the latency multiplies across every matched request; this is the classic "why is every page slow" regression.
- **No complex business logic** — debugging across the proxy/route boundary is painful, and the proxy is "meant to be invoked separately of your render code" (don't share app modules/globals through it).
- **Not the authoritative auth check** — the proxy does cookie *presence*; the route's `requireUser()` does the real session validation against the DB. Tie back to two earlier plants: (a) the Server-Function matcher trap (a refactor can silently drop proxy coverage), and (b) Better Auth's cookie-cache staleness window — the proxy can read a stale session for minutes, so authorization decisions must live at the route/action boundary, never the proxy. This is **defense in depth**, not redundancy: the proxy is a UX optimization (fast bounce), the route is the security boundary.

The one-line senior heuristic to land: *do the cheap thing in the proxy, do the authoritative thing in the route.*

**Component:** `StateMachineWalker` (`kind="decision"`, no diagram slot) — "Does this belong in `proxy.ts`?" A short decision walk that forces the *order* a senior asks questions in. Root: "Does it need to run before the route renders?" → no → leaf "Route, layout, or Server Action." → yes → "Is it cheap (cookie/header inspection, a redirect decision)?" → no (DB read, heavy logic) → leaf "Move it to the route — the proxy multiplies the cost across every matched request." → yes → "Is it the *authoritative* security decision?" → yes → leaf "Cookie *presence* in the proxy as a fast gate; real validation in the route. Defense in depth." → no → leaf "Good fit: auth gate / rewrite / header enrichment / A-B bucket." This is exactly the walker's sweet spot (a senior decision filter where the lesson lives in the order). Keep leaves to 1–2 sentences.

### Reading the request and shaping the reply

The `NextRequest`/`NextResponse` surface — recognition, not memorization. Keep it brisk; the student looks this up.
**`NextRequest`** — what's available, framed as "the platform `Request` you met in chapter 015, plus Next.js extensions": `request.nextUrl` (a parsed URL with `pathname`, `searchParams`), `request.cookies` (a `RequestCookies` store with `get`/`getAll`/`has`/`set`/`delete`), `request.headers` (the web `Headers` you know). **Correction the student must internalize:** geolocation and client IP are **not** `request.geo`/`request.ip` anymore — those were removed. On Vercel, import `geolocation(request)` and `ipAddress(request)` from `@vercel/functions`; off Vercel, read the platform's documented header. Name `request.geo`/`request.ip` once as "removed — you'll see it in pre-15 code."
**`NextResponse`** — the four shapes of a reply, mapped back to the lifecycle diagram's three outcomes:
- `NextResponse.next()` — pass through (the route renders). The default "do nothing special" return.
- `NextResponse.redirect(url, status?)` — short-circuit with a 3xx; route never runs. (Semantics/status codes are lesson 3 — just name it here.)
- `NextResponse.rewrite(url)` — render a different internal route, visible URL unchanged. (Depth in lesson 3.)
- `Response.json(body, { status })` / `new NextResponse(body, { status })` — respond directly (e.g., a 401 for an API path). Rare in `proxy.ts`; common in route handlers.

The senior anchor on returns: forgetting to return (or to `return NextResponse.next()`) leaves the request hanging — there's no implicit pass-through.

**Component:** `CodeTooltips` over a ~6-line proxy body that reads `request.nextUrl.pathname` and `request.cookies.get(...)` and returns `NextResponse.next()`. Tooltips on `nextUrl` ("parsed URL — `.pathname`, `.searchParams`, etc."), `cookies` ("`RequestCookies` store — `get` returns `{ name, value } | undefined`"), `NextResponse.next()` ("pass the request through to the matched route"). Lets the student probe the surface inline without a prose dump.

**Tooltip (`Term`):** "@vercel/functions" — "Vercel's helper package; `geolocation()` and `ipAddress()` replace the removed `request.geo` / `request.ip`."

### Passing data from the proxy to the route

The proxy→route header pattern — the one genuinely new *technique* in the lesson, and the bridge back to lesson 1's `headers()`.
Teach the pattern and the exact gotcha that bites everyone:
- The proxy does a cheap derivation once (e.g., reads a value, or — in production — Better Auth resolves the session) and wants the route to use the result without redoing the work.
- It clones the incoming headers, sets `x-user-id` (etc.), and forwards them with `NextResponse.next({ request: { headers: requestHeaders } })`. The route then reads them with `headers()` (lesson 1) and never re-derives.
- **The load-bearing gotcha:** `next({ request: { headers } })` sets headers the *route* sees upstream; `next({ headers })` sets headers the *client* sees. They look almost identical and do opposite things. This is the single most important detail in the section — give it a dedicated callout.
- **The security caveat (current senior guidance):** don't blindly clone *all* incoming headers onto the forwarded request — an attacker can send an `x-user-id` header from the outside and you'd forward it as if it were trusted. Allow-list the headers you set, and set identity headers from values *you* derived in the proxy, never pass through a client-supplied one. This is the modern footgun the docs now call out explicitly.

Also cover the **cookie-write timing gotcha** here since it's the same "state from proxy to route" theme: setting a cookie on the response (`response.cookies.set(...)`) does **not** make the *current* request's `cookies()` read see it — the new cookie is visible on the *next* request. Frame with the lesson-1 model: a cookie is an instruction to the browser, and the browser only sends it back on the following request.

**Component:** `AnnotatedCode` over the canonical enrichment proxy (~10 lines): (1) clone incoming headers, (2) derive + set `x-user-id` on the clone (allow-list framing in the step prose), (3) return `NextResponse.next({ request: { headers } })` — step prose hammers the `request:` wrapper vs client-headers distinction, `color="orange"` on that line, (4) a separate step or sibling note showing the route reading it via `await headers()`. If showing both files reads better, switch to `CodeVariants` (tab "proxy.ts (enrich)" / tab "the route (read)") — author's call; `AnnotatedCode` is the default since the focus is on parts of the proxy file.

**Tooltip (`Term`):** "allow-list" — "Explicitly enumerate the permitted values and reject everything else — safer than a deny-list, which fails open on anything you forgot."

### A proxy that gates the app

The worked example — pulls the lesson together into one production-shaped file.
Build a single `proxy.ts` (default export, under ~30 lines) that does two of the four jobs, kept deliberately tight:
1. **Matcher** gates app routes and excludes assets (the negative-lookahead form from earlier).
2. **Auth gate**: read the session cookie via Better Auth's `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` (presence only — anchor on the Code-conventions shape, import `SESSION_COOKIE_PREFIX` from `lib/auth.ts`); if absent and the path is protected, `redirect` to `/sign-in?next=<pathname>` (the `next=` round-trip is *named*, validation/open-redirect is lesson 3 — do not teach it here).
3. **Pass through** with `NextResponse.next()` otherwise.
Keep a legacy-URL redirect *out* of this example — it's lesson 3's worked example, and including it here would bleed scope. The framing line: "this is the production slot; Unit 8 fills in the real session wiring, lesson 3 adds the rewrite/redirect jobs."

Use `AnnotatedCode` (single file, attention directed to parts) — steps: matcher, the presence check, the conditional redirect with `next=`, the pass-through return, and a final step underscoring "presence here, authoritative check in the route's `requireUser()`." Reinforce the cheap-vs-authoritative split one last time in the closing step.

Reference the `getSessionCookie` cookie-prefix detail with a one-line note (don't re-derive it): the helper defaults to `'better-auth.'` and silently misses a custom prefix, so the exported constant keeps proxy and auth config from drifting. This is a Code-conventions rule worth surfacing because it's a real silent-failure class.

### Watch-outs (fold into sections above; do not create a trailing tips section)

Per pedagogy, each watch-out lives in the section teaching the concept it qualifies. Placement map for the writer:
- Overly-broad / missing matcher runs on assets → **The matcher** section.
- Matcher must be a static literal (runtime values ignored) → **The matcher** section.
- Matcher excluding a path also skips Server Action POSTs there; verify auth in the action → **The matcher** section (planted) + **What belongs in the proxy** (paid off).
- DB queries / heavy logic in the proxy multiply latency → **What belongs in the proxy** section.
- `next({ request: { headers } })` vs `next({ headers })` → **Passing data from the proxy to the route** (dedicated callout).
- Don't forward all incoming headers (spoofable identity) → same section.
- Cookie set on the response isn't visible to the *current* request's `cookies()` → same section.
- Throwing in the proxy 500s every matched request → **Reading the request and shaping the reply** or the worked example: wrap risky work in `try/catch` and pass through (`NextResponse.next()`) on the error path (ties to Code-conventions "an exception inside a gate is a refusal" — but here the safe default for a *non-authoritative* gate is fail-open to the route, which still enforces auth; note this nuance).
- `request.geo`/`request.ip` removed → **Reading the request** section.
- Node-only; Edge named once and set aside → **Where the proxy runs** section.

Use `Aside` (`caution`/`danger`) for the two security-flavored ones (header spoofing, cookie timing); inline prose for the rest.

### External resources (optional, end of lesson)

Two `ExternalResource` cards max:
- Next.js docs — `proxy.ts` file convention (the page fetched for this outline; current, authoritative on matcher + NextResponse).
- Next.js "Migration to Proxy" / upgrade-to-16 page — for students migrating a `middleware.ts` codebase.

No YouTube embed: this topic is fast-moving (renamed in 16) and config-shaped rather than concept-shaped; video would age badly and add little over the annotated code. Skip `VideoCallout`.

---

## Scope

**This lesson teaches:** the `middleware.ts`→`proxy.ts` rename and the *why* (network proxy, not Express middleware; last-resort tool); the Node-only runtime; the matcher as the cost-control surface (string / array / negative-lookahead regex / object `has`+`missing` forms, static-analyzability, the Server-Function trap); the four legitimate jobs vs the anti-list; the `NextRequest`/`NextResponse` surface at recognition depth; the proxy→route header-enrichment pattern with its `request:`-wrapper and header-spoofing gotchas; the cookie-write timing gotcha; and a tight auth-gating worked example anchored on Better Auth cookie-presence.

**Prerequisites — assume taught, redefine in one line at most if needed:**
- `cookies()` / `headers()` async server reads, "read high, pass resolved values down," cookie = browser-side storage the server only reads/instructs (lesson 1 of this chapter). The proxy→route pattern *connects* to lesson 1's `headers()` — reference, don't re-teach.
- Dynamic-by-default rendering and the async request-API model under Cache Components (chapter 032 lesson 7). Don't re-explain `await`.
- The web `Request`/`Headers`/`Response` platform APIs (chapter 015). `NextRequest`/`NextResponse` extend these — say so, don't re-teach the platform shapes.
- `getCurrentUser` / `requireUser` as the canonical session helpers (named in lesson 1's debts; built in Unit 8). The proxy references `requireUser()` as "the route's authoritative check" without building it.

**Explicitly out of scope — defer, do not teach:**
- **Redirect-vs-rewrite semantics, 307/308 status codes, `?next=` open-redirect prevention, the proxy-vs-`next.config.ts`-vs-`redirect()` decision tree, the subdomain multi-tenant rewrite, redirect loops** → lesson 3 of this chapter. This lesson *names* redirect/rewrite as two of the four jobs and uses a redirect in the worked example, but stops at "it short-circuits / it swaps the internal route." Do not explain status codes or validation.
- **Real session/JWT verification, Better Auth wiring internals, the session-read ladder construction** → Unit 8. The proxy gets the cookie-presence *slot* only.
- **Rate limiting at the proxy** → chapter 073.
- **Internationalization routing (`createMiddleware(routing)`, locale resolution)** → Unit 17. (Code conventions notes next-intl runs in `proxy.ts` before the auth gate; mention at most as "i18n also lives here, covered later" if it comes up — otherwise omit.)
- **`next.config.ts` static rewrites/redirects and security headers** → lesson 3 of chapter 034. Name only as the "static alternative" forward-reference inside lesson 3, not here.
- **`searchParams` / route `params` / client navigation hooks** → lessons 4–5 of this chapter (the URL channel).
- **`waitUntil` / `NextFetchEvent` background work, CORS handling, `skipProxyUrlNormalize`/`skipTrailingSlashRedirect` advanced flags, unit-testing utilities** → niche; omit. (Mention `try/catch`-and-pass-through as the only robustness pattern needed at this level.)

---

## Code conventions alignment notes (for downstream agents)

- **`proxy.ts` uses a default export** per Code conventions §Function form (framework-dictated carve-out). The Next docs accept *either* a default export or a named `proxy` export; show the default export in the worked example, and mention in one line that a named `export function proxy` is equally valid (the student will see both). Do not present the named export as the project convention.
- **Filename is `proxy.ts`**, project root or under `src/` if the project uses the `src/` layout (Code conventions §File and folder layout shows it at `src/proxy.ts`).
- **Cookie reads:** session cookie convention is the `__Host-` prefix; auth gating uses `getSessionCookie(req, { cookiePrefix: SESSION_COOKIE_PREFIX })`, never a hand-rolled cookie read. `SESSION_COOKIE_PREFIX` is imported from `lib/auth.ts`.
- **Imports:** `import { NextResponse } from 'next/server'` and `import type { NextRequest } from 'next/server'` (type-only import for the type per `verbatimModuleSyntax`). `@vercel/functions` for `geolocation`/`ipAddress`.
- **Formatting:** single quotes, 2-space indent, semicolons, trailing commas multiline (Biome). Keep all example files ≤30 lines and stripped of unrelated noise.
- **Deliberate divergence:** the worked example references `requireUser()` and `SESSION_COOKIE_PREFIX` as imported black boxes (built in Unit 8) — this is intentional forward-referencing, not incompleteness. Note it so a downstream agent doesn't try to inline-build the auth layer.
