# Chapter 033 — The request surface

## Chapter framing

Chapter 033 covers the request surface that sits between routing (chapter 029) and Server Actions (Unit 6): how a Server Component reads the request (`cookies()`, `headers()`), how code can run before the route does (`proxy.ts`), how URL state flows through `searchParams` and dynamic params, and how Client Components read and write the URL. The student leaves with one mental model — the route's inputs are the URL, the headers, the cookies, and nothing else; everything dynamic the route renders flows from those four channels — and the syntactic vocabulary to consume each on either side of the server/client boundary.

Threads that run through every lesson: under Cache Components (lesson 1 of chapter 032), reading request data does not flip a route dynamic any more — every route is dynamic by default, and the explicit signal is the `await` itself; all request-reading APIs return Promises and must be awaited in Server Components or unwrapped with `React.use()` in Client Components; the senior reflex is to read on the server first and pass resolved values down as props, reaching for Client navigation hooks only when interaction is the lesson; `middleware.ts` was renamed to `proxy.ts` in Next.js 16 and the runtime is Node-only (the Edge runtime is no longer the deployment target); the proxy is a network-boundary tool, not a place to run application logic, and the cost question (every matched request pays the proxy roundtrip) dictates the matcher config; URL state is the canonical place to hold filter, sort, pagination, and tab state for any view a user can share or refresh, and the URL is the source of truth that server components read on each render; transient state (open/closed dropdowns, hover, focus) belongs in component state, not the URL; the chapter sets the foundations the URL-state list project in Chapter 060 builds on, and the auth and RBAC chapters (Unit 8, Unit 9) lean on `cookies()` and the proxy. The chapter ships five teaching lessons plus a quiz.

---

## Lesson 1 — Reading the request with cookies() and headers()

Teaches the async, server-only, read-only `cookies()` and `headers()` APIs from `next/headers`, the senior pattern of reading once at the top and passing resolved values down, the trust-the-platform caveat on proxy headers, and the build-time constraints these reads place on Cache Components.

Topics to cover:

- **The senior question.** A Server Component needs the user's session token, their preferred locale, the request's IP for rate-limiting, and the `User-Agent` for analytics. Where do those values come from in the App Router, what's the syntax, and what does reading them cost? The lesson names `cookies()` and `headers()` from `next/headers` as the canonical server-side reads, both async, both Promise-returning in Next.js 16.
- **The two primitives — what each returns.** `await cookies()` returns a read-only `ReadonlyRequestCookies` store with `get(name)`, `getAll()`, `has(name)`. `await headers()` returns a read-only `Headers` instance (the same web-platform `Headers` API the student knows from chapter 015). Both are scoped to the current request and discarded after the render.
- **Read-only by default, mutation lives in Server Actions and route handlers.** From a Server Component, `cookies()` cannot `set` or `delete` — the response has already started streaming. Setting cookies requires a Server Action context or a route handler where the response is still composable. The same applies to `headers()` (response headers are written via the platform, not via this read API). The lesson names the constraint and points to Server Actions (Chapter 043) for write paths.
- **The async shape and `React.use()` on the client.** Both APIs return Promises; `await` them in Server Components. Client Components don't have direct access — values must be passed as props or threaded through context. If a Promise is passed across the boundary, `React.use()` unwraps it (the same shape from lesson 4 of chapter 030 and lesson 7 of chapter 032).
- **The senior pattern — read once at the top.** Read `cookies()` and `headers()` at the layout or page level, derive what's needed (session, locale, IP), pass resolved values down to children. Avoid reading the same store in deep components — pair with `cache()` from lesson 5 of chapter 032 when a derived value (like the current user) is read from many places.
- **Common reads — the SaaS reference list.** Session cookie (auth layer, Unit 8), CSRF cookie (Better Auth handles, named here), locale preference (Unit 17), feature-flag cookie, A/B-test cookie. Headers: `x-forwarded-for` for client IP (with the trust-the-platform caveat), `User-Agent` for analytics, `Accept-Language` for locale fallback, `referer` for navigation analytics.
- **Trust boundaries on headers.** `x-forwarded-for` and related proxy headers are user-controllable upstream of a trusted proxy. The right reach: trust them only when behind a known proxy (Vercel, Cloudflare) and consult the platform's documented header (Vercel uses `x-forwarded-for` and `x-real-ip`). The senior anchor: never use raw headers for authorization — use the session.
- **What reading these does to caching.** Under Cache Components (lesson 1 of chapter 032), reading `cookies()` or `headers()` is one of the explicit dynamic signals — placing such a read inside a `use cache` function is a build error. The route is dynamic by default anyway, so the read costs nothing relative to "no read"; what it prevents is making that subtree static. The senior reach: keep the read in the dynamic part of the tree and lift cached chrome outside.
- **The contrast with the Client Component pattern.** A Client Component cannot call `cookies()` or `headers()` — both are server-only. The client gets cookies via `document.cookie` (for non-`HttpOnly` cookies) and headers only via inspecting `Response` objects from `fetch`. The senior reflex is to read on the server and pass down; reaching for `document.cookie` is rare and usually signals an architecture mistake.
- **Worked example — reading session and locale at the root layout.** A `RootLayout` reads `cookies()` for the session token and `headers()` for `Accept-Language`, derives `user` (via the cached `getCurrentUser`) and `locale`, and renders the shell with those values resolved. Children consume `user` via the cached function; locale flows as a prop or context. The example is the production shape the chapter and Unit 8 build on.
- **Watch-outs.** Synchronous access (`cookies().get(...)` without `await`) is a build error in 16 — the codemod from lesson 7 of chapter 032 fixes most cases; `cookies()` and `headers()` in a Client Component is a build error — the imports are server-only; setting a cookie from a Server Component (no Action context) throws — move the write to a Server Action or route handler; reading raw `x-forwarded-for` outside a trusted proxy is a security mistake — read the platform-provided header; large header values (oversized JWTs, fat cookies) bloat every request — name the size budget once, keep cookies small, use `HttpOnly` and `Secure` flags by default; reading the same cookie store in many components without `cache()` is fine in 16 (the read is per-request anyway) but `cache()` lets you put expensive derivation behind it.

What this lesson does not cover:

- Setting cookies from Server Actions (Chapter 043).
- `draftMode()` for CMS preview (lesson 7 of chapter 032 named once).
- The Better Auth session shape (Unit 8).
- Rate-limiting using the client IP (Chapter 073).
- Locale resolution and ICU (Unit 17).
- The `proxy.ts` request-time reads (lesson 2 of chapter 033).

Estimated student time: 25 to 35 minutes. Short, foundational, and the dependency for every later lesson that says "read the session."

---

## Lesson 2 — proxy.ts and the matcher

Teaches the Next.js 16 rename of `middleware.ts` to Node-only `proxy.ts`, the canonical file shape with `NextRequest`/`NextResponse`, the matcher config as the cost-control surface, the proxy-to-route header pattern, and what belongs in the proxy versus the route.

Topics to cover:

- **The senior question.** A request to `/dashboard` lands on the server. Before the route renders, the app needs to verify the session, redirect unauthenticated users to `/login`, and rewrite legacy `/billing/old/*` URLs to the new structure. Where does that code live, what's the cost of running it on every request, and what's the rename the student will see in older codebases? The lesson names `proxy.ts` as the Next.js 16 file convention, the rename of `middleware.ts`, and the matcher as the cost-control surface.
- **The rename — `middleware.ts` to `proxy.ts`.** Next.js 16 renamed the file convention to clarify intent: this code is a network proxy in front of the app, not an application-layer middleware in the Express sense. The exported function is now `proxy`, not `middleware`. `middleware.ts` is deprecated and warns at build; the codemod renames the file and the function automatically.
- **Runtime — Node-only in 16.** `proxy.ts` runs on the Node runtime. The Edge runtime is no longer the deployment target for new code; the legacy `middleware.ts` retains Edge support for the deprecation window but should be migrated. The senior anchor: Vercel ships `proxy.ts` to a fast Node serverless function near the user, and the cold-start and capability story is now uniform with the rest of the app.
- **File location and the canonical shape.** `proxy.ts` lives at the project root (or under `src/` if the project uses the `src/` layout). It exports a default `proxy` function that receives a `NextRequest` and returns a `NextResponse` (or `undefined`/`NextResponse.next()` to pass through). Returning a response with a status code short-circuits the request — the route never runs.
- **The matcher config — the cost-control surface.** Every request matched by the matcher pays the proxy roundtrip. Default behavior matches every path; the senior reach is to declare an explicit `config.matcher` array that names only the routes that need the proxy. Without a tight matcher, the proxy runs on every static asset, every image, every API route — burning latency and cost. The lesson names the matcher as the first knob to tune.
- **Matcher syntax — paths, regexes, missing/has clauses.** Strings (`'/dashboard/:path*'`), arrays of strings (`['/dashboard/:path*', '/billing/:path*']`), and object form (with `source`, `has`, `missing` clauses to gate by cookie presence, header value, query string). The object form is the production shape for "run only on authenticated routes" — `missing: [{ type: 'cookie', key: 'next-auth.session-token' }]` flips the predicate.
- **What proxy.ts is for — the senior list.** The four legitimate reaches: auth gating (redirect unauthenticated users), URL rewrites and redirects (lesson 3 of chapter 033), request enrichment (set a header the app reads via `headers()`), and feature-flag routing (A/B test bucketing via cookie writes that downstream routes read). Anything else (heavy auth checks, database calls, complex business logic) belongs in the route, not in the proxy.
- **What proxy.ts is *not* for.** Not a place for database queries on every request — the latency multiplies; not a place for complex business logic — debugging across the proxy/route boundary is painful; not a substitute for route-level auth — the proxy is a fast gate, the route still enforces the real check (defense in depth). The senior reach: do the cheap thing in the proxy (cookie presence, simple JWT decode), do the authoritative thing in the route.
- **`NextRequest` — what's available.** The request's `url`, `cookies` (read and write via `request.cookies` / `response.cookies`), `headers`, `geo` (Vercel-provided geolocation), `ip`. The shape mirrors the platform's `Request` (Chapter 015) with Next.js extensions. The lesson lists the surface; the student doesn't memorize, they recognize.
- **`NextResponse` — the shape of a proxy reply.** `NextResponse.next()` passes through; `NextResponse.redirect(url, status)` short-circuits with a redirect; `NextResponse.rewrite(url)` rewrites internally without changing the visible URL; `new NextResponse(body, { status, headers })` for arbitrary responses (rare in `proxy.ts`, more common in route handlers). Setting cookies on the response and reading them on the next request is how state flows from proxy to route.
- **The proxy-to-route header pattern.** The proxy decodes the JWT, attaches `x-user-id` and `x-org-id` as request headers via `response.headers.set` and `NextResponse.next({ request: { headers } })`, and the route reads them via `headers()`. The route never re-decodes the token. The pattern centralizes the cheap auth check in one place and the headers propagate via the platform.
- **Auth gating — the canonical shape.** The proxy reads the session cookie, calls a fast verification (Better Auth's session check, or a JWT signature verify), redirects to `/login?next=...` on failure. The full auth wiring lands in Unit 8; this lesson sets the proxy slot.
- **Diagram — the request lifecycle through the proxy.** Client request to proxy (matcher decides) to either (a) short-circuit response, (b) rewrite to a different internal route, or (c) pass through to the matched route. The diagram pins where the proxy sits in the platform stack.
- **Watch-outs.** A missing or overly broad matcher runs the proxy on static assets and images — performance regression that's invisible until the bill arrives; database queries in the proxy are a latency mistake — keep the proxy cheap; setting a cookie from the proxy doesn't make the *current* request's `cookies()` read see the new value — the next request reads the new cookie; throwing in the proxy returns a 500 for every matched request — wrap in `try/catch` and pass through on the error path; the `middleware.ts` rename codemod handles the easy cases but custom imports may need manual cleanup; `proxy.ts` runs on Node — the Edge runtime is named once and rejected for new code in 2026.

What this lesson does not cover:

- Rewrites and redirects in depth (lesson 3 of chapter 033).
- Auth verification specifics (Unit 8).
- Rate limiting at the proxy (Chapter 073).
- Internationalization routing (Unit 17).
- `next.config.ts` rewrites and redirects (lesson 3 of chapter 034) — the static-config alternative.

Estimated student time: 45 to 55 minutes. Sets the file convention every later auth and routing lesson references.

---

## Lesson 3 — Rewrites and redirects in proxy.ts

Teaches the redirect-vs-rewrite semantic split, 307/308 status codes, the proxy-vs-`next.config.ts`-vs-`redirect()` decision tree, the subdomain-rewrite multi-tenant pattern, and open-redirect prevention on the `?next=` return-URL idiom.

Topics to cover:

- **The senior question.** A SaaS launches a v2 of its billing surface and the URL changes from `/billing/manage` to `/settings/billing`. Some links in old emails point to the old URL; the app needs a permanent redirect, search engines need to see 308, and the user lands on the right page. Separately, the app multi-tenants on subdomains — `acme.app.com/dashboard` should serve `app.com/[org]/dashboard` internally without the URL changing. The lesson names redirects as the user-visible URL change (browser navigates, history updates, SEO sees 301/308) and rewrites as the internal URL swap (browser address bar unchanged, user sees one URL, app renders another).
- **The two operations — semantic difference.** Redirect: the response is a 3xx with a `Location` header; the browser issues a new request to the new URL; the URL in the address bar changes; bookmarks update; search engines treat 308 (permanent) as the canonical replacement. Rewrite: the response is the content of a different internal route; the URL in the address bar stays the same; the user sees one URL, the server renders another. Neither is "better" — they answer different product questions.
- **Status codes — the SEO and history surface.** `307` (temporary) preserves the request method; `308` (permanent) is the senior reach for legacy-URL migration. `301` and `302` exist but lose method semantics on POST — modern code uses 307/308. `NextResponse.redirect(url)` defaults to 307; the `status` argument promotes to 308 for permanent.
- **Redirects in `proxy.ts` — the conditional case.** The proxy decides at request time based on cookies, headers, geo, or query — anything that's request-dependent. The canonical reach: redirect by user state (e.g., already-logged-in user on `/login` lands on `/dashboard`), by feature flag, by A/B test bucket. The cost: every matched request runs the proxy.
- **Redirects in `next.config.ts` — the static case (forward reference).** When the redirect rule is static (always-true, request-independent), the `redirects()` config in `next.config.ts` is cheaper — the platform handles it at the CDN edge without invoking the proxy. The decision rule: static-and-known goes in the config (lesson 3 of chapter 034); request-conditional goes in `proxy.ts`.
- **Rewrites in `proxy.ts` — the multi-tenant pattern.** `NextResponse.rewrite(new URL('/orgs/acme/dashboard', request.url))` serves the org-scoped route for the subdomain `acme.app.com/dashboard`. The proxy extracts the subdomain from `request.headers.get('host')`, validates it against the org table (cheap check, no DB call in production — use a cached lookup), rewrites internally. The user's address bar shows the original URL.
- **The proxy-rewrite + dynamic-segment pattern.** A subdomain rewrite hits a route group `[org]/(routes)/dashboard/page.tsx`; the `[org]` param is the subdomain. The route reads `params.org`, validates against the database, queries scoped data. The same pattern works for path-based tenancy (`app.com/orgs/acme/...`) — the rewrite is optional in that case.
- **The redirect-loop pitfall.** A rewrite that targets a path that itself matches the proxy's matcher re-enters the proxy. Without a guard, this loops to a 500. The senior reach: the matcher excludes the rewrite target, or the proxy checks a header it sets on the rewrite (`x-internal-rewrite: 1`) and short-circuits on second pass. The framework throws a recursion-detected error after a fixed depth.
- **Setting cookies during a redirect.** `const response = NextResponse.redirect(url); response.cookies.set('locale', 'es'); return response;` writes the cookie *and* redirects. The pattern is used for "set a preference, navigate to the next step" flows. The cookie is visible on the next request.
- **The `next` parameter pattern for post-login return.** A redirect to `/login?next=${encodeURIComponent(request.nextUrl.pathname)}` lets the login flow return to the originally-requested URL after auth. The login action validates the `next` param (must be a relative URL on the same origin to prevent open-redirect attacks) and uses it as the redirect target. Named here as the canonical pattern; full auth flow lands in Unit 8.
- **Open-redirect prevention.** Never redirect to a URL that came from user-controlled input without validation — a `?next=https://attacker.com` is the classic open-redirect bug. Validate by parsing as `URL`, checking the origin matches, or by allowing only paths (starts with `/`, no `//`, no protocol). The senior reach: a small `safeNext(input)` helper used at every redirect site.
- **Decision tree — proxy vs. next.config vs. route-level redirect.** Always-static (legacy URL migration, marketing-URL changes): `next.config.ts` redirects (lesson 3 of chapter 034). Request-conditional (auth gating, A/B buckets, locale routing): `proxy.ts`. Per-action server-side (after a Server Action completes): `redirect()` from `next/navigation` (lesson 4 of chapter 029). Per-route server-side (route exists but resource is gone): `notFound()` or `permanentRedirect()`. The student leaves with a clear sorting rule.
- **Worked example — a small `proxy.ts` that does three jobs.** Matcher gates the relevant paths. Auth check redirects unauthenticated `/dashboard` requests to `/login?next=...`. Subdomain rewrite maps `*.app.com/dashboard` to `/orgs/[subdomain]/dashboard`. Legacy URL redirect maps `/billing/manage` to `/settings/billing` with 308. The file is under fifty lines and shows the full shape.
- **Watch-outs.** Rewriting to a path the matcher also covers causes a loop — exclude the rewrite target; redirecting with 302 or 301 instead of 307/308 silently changes POST to GET — use the modern statuses; cookies set on a redirect response are not visible until the *next* request, not the redirect target's render; open-redirect via `?next=...` is the classic security hole — validate; subdomain extraction from `host` includes the port in development (`localhost:3000`) — strip before lookup; in dev, the proxy runs on every page reload and slow logic is noticeable — keep the work tight.

What this lesson does not cover:

- The proxy.ts file convention and matcher in full (lesson 2 of chapter 033).
- Static redirects and rewrites in `next.config.ts` (lesson 3 of chapter 034).
- Auth verification (Unit 8).
- The full subdomain-tenancy pattern (Unit 9 — multi-tenancy).
- `redirect()` and `notFound()` from `next/navigation` (lesson 4 of chapter 029).

Estimated student time: 40 to 50 minutes. Pairs with lesson 2 of chapter 033 as the two-part anatomy of the proxy file.

---

## Lesson 4 — URL state with searchParams and route params

Teaches the URL-vs-component-state decision rule, the `params`-for-identity / `searchParams`-for-view-state split, the async Promise shape in Next.js 16, Zod validation at the boundary, opaque base64 cursors, and `nuqs` as the production layer.

Topics to cover:

- **The senior question.** A dashboard list shows invoices filtered by status, sorted by date, paginated with a cursor. The user shares the URL with a coworker; the coworker opens it and sees the same view. The user refreshes; the view persists. The user hits back; the previous filter returns. Where does that state live, and what's the syntax for reading it on the server and writing it from the client? The lesson names URL state as the canonical home for filter, sort, pagination, and tab state — anything that should survive a refresh or a share.
- **The decision rule — URL vs. component state.** State that should survive a refresh, be shareable, or appear in browser history belongs in the URL. State that's transient (open/closed dropdowns, hover, focus, in-progress form input pre-submit) belongs in component state. The reflex question: would the user expect this state to come back if they refreshed? If yes, URL.
- **Two URL-state vehicles — `params` and `searchParams`.** Route `params` carry identity (which invoice, which org); `searchParams` carry view state (filter, sort, page). A URL like `/orgs/acme/invoices?status=paid&sort=-date&cursor=eyJpZCI6NDJ9` has both: `params.org = 'acme'`, `searchParams = { status: 'paid', sort: '-date', cursor: '...' }`. The lesson pins the distinction.
- **The async shape — Promises in Next.js 16.** Page and layout receive `params` and `searchParams` as Promises. `const { status } = await props.searchParams;` in a Server Component; `React.use(props.searchParams)` in a Client Component (lesson 7 of chapter 032 covered the syntax — this lesson is about the usage pattern).
- **Validate before use — Zod at the boundary.** `searchParams` are user-controlled — anyone can type anything in the URL. Validate every read with a Zod schema: `status: z.enum(['draft', 'paid', 'overdue']).optional()`, `sort: z.enum(['-date', 'date', '-total', 'total']).default('-date')`. Invalid values fall back to a sensible default; the schema documents the contract. The senior shape: one `parseSearchParams(input)` helper per route, called once at the top of the page.
- **The Server-Component pattern — read on the server, render the filtered result.** The page reads and validates `searchParams`, calls the database with the parsed filters, renders the table. No client state, no `useEffect`, no waterfall. The user changes the filter, the URL updates (lesson 5 of chapter 033), the page re-renders on the server with the new params. The lesson sets the canonical shape Chapter 060 builds.
- **The shape of repeated keys — strings vs. arrays.** A URL `?tag=billing&tag=urgent` produces `searchParams.tag = ['billing', 'urgent']`. The shape is `string | string[] | undefined`. Zod's `z.union([z.string(), z.array(z.string())]).transform(...)` normalizes; the production helper does this once.
- **Encoding cursors — opaque base64.** A pagination cursor encodes the last-row sort key plus tiebreaker as opaque base64 JSON. The URL shows `cursor=eyJpZCI6NDJ9` — opaque to the user, deterministic for the server. Decoding lives in the route's parse helper; the database query consumes the decoded shape. lesson 6 of chapter 038 covers cursors at depth; the lesson names the URL shape.
- **The cost question — does reading searchParams flip caching?** Under Cache Components, every route is dynamic by default, and reading `searchParams` is one of the explicit dynamic signals — but the route was dynamic anyway. The relevant interaction: a `use cache` function that awaits `searchParams` fails the build. The senior reach: keep cached chrome (sidebar, header) outside the dynamic table; the table reads `searchParams` and runs at request time, the chrome streams from the static cache (PPR, lesson 2 of chapter 032).
- **nuqs as the type-safe URL-state layer — when it earns its weight.** `nuqs` provides typed parsers, default values, and a Client-side `useQueryState` hook that keeps URL state synced. The threshold: when the project has more than two or three URL-state surfaces and the parse/serialize code is becoming a tax, `nuqs` pays for itself. For a single filter or a one-off page, plain `searchParams` reading plus Zod is fine. The lesson names nuqs as the canonical pick for production lists.
- **`createSearchParamsCache` on the server — the nuqs server pattern.** `createSearchParamsCache({ status: parseAsString, sort: parseAsString.withDefault('-date') })` produces a typed parser. Inside a Server Component, `await searchParamsCache.parse(props.searchParams)` returns the typed object. The same cache is read across the render via `searchParamsCache.get('status')`. The lesson names the API; Chapter 060 uses it in the project.
- **Writing URL state — the Client-side surface.** Reading is server-side; writing happens from a Client Component via `router.push(\`?status=paid\`)` or via `useQueryState` (nuqs). The lesson points to lesson 5 of chapter 033 for the navigation hooks and leaves the writing pattern there.
- **What URL state is not.** Not a place for secrets — anything in the URL leaks to logs, referrer headers, browser history; not a place for large blobs — keep it under a kilobyte; not a place for ephemeral UI state that the user doesn't want bookmarked.
- **Worked example — a filtered invoice list.** The route `/orgs/[org]/invoices` reads `params.org` and `searchParams = { status, sort, cursor }`, validates, queries `db.invoices.findForOrg(orgId, { status, sort, cursor })`, renders. The same URL, on refresh, produces the same view. The user clicks a filter chip; a Client Component (covered next lesson) calls `router.push` with the new params; the page re-renders.
- **Watch-outs.** Reading `searchParams` without validation lets malicious or malformed input crash the query — always parse; the `string | string[]` shape surprises code that assumes `string` — pin it at the parser; the URL grows quickly with state — keep parameter names short, default values implicit (omit defaults from the URL); putting object-shaped state in JSON-stringified params is brittle — use flat parameters or invest in nuqs; the cursor cannot be reused across schema changes — version cursors or accept the migration; `searchParams` change between renders without re-mounting the page — derived state must reset via `key` (lesson 5 of chapter 023) if the visual needs a hard reset.

What this lesson does not cover:

- Client-side navigation hooks for writing URL state (lesson 5 of chapter 033).
- Cursor pagination at the database layer (lesson 6 of chapter 038).
- The full URL-state list view pattern (Chapter 060).
- Zod schemas in full (Chapter 042).
- The async-API syntax basics (lesson 7 of chapter 032).

Estimated student time: 45 to 60 minutes. The conceptual center of the chapter; sets up the URL-state list project in chapter 060.

---

## Lesson 5 — Client-side navigation hooks

Teaches the four `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`, `useParams`), the read-on-server / write-on-client division of labor, `push` vs. `replace` vs. `refresh`, the Suspense requirement on `useSearchParams`, and the chip-list pattern that puts it all together.

Topics to cover:

- **The senior question.** A Client Component renders a filter chip. The user clicks it; the URL should update from `?status=draft` to `?status=paid` without a full page load; the server re-renders the list; the back button returns to the previous filter. What hooks make that work, where do they live, and what's the cost of each? The lesson names the four hooks from `next/navigation` — `useRouter`, `usePathname`, `useSearchParams`, `useParams` — and the read-on-server, write-on-client division of labor.
- **The four hooks — what each gives you.** `useRouter` returns the router object with `push`, `replace`, `back`, `forward`, `refresh`, and `prefetch`. `usePathname` returns the current path as a string (no query, no hash). `useSearchParams` returns a `ReadonlyURLSearchParams` instance for the current query. `useParams` returns the current route's dynamic segments as an object. All four are Client Component hooks; calling them from a Server Component is a build error.
- **The senior division of labor — read on the server, navigate on the client.** Server Components read `params` and `searchParams` from props (lesson 4 of chapter 033). Client Components use the hooks only when interaction is the lesson — clicking a chip, typing in a search box, toggling a sort. The reflex: if the component doesn't need to write to the URL or react to URL changes for animation, it doesn't need the hooks.
- **`useRouter().push` — soft client navigation.** Updates the URL, pushes a history entry, fetches and renders the new route's Server Components, scrolls to top by default. `router.push('/dashboard?status=paid')` is the equivalent of clicking a `<Link>` programmatically. The `scroll: false` option preserves scroll for in-page state changes (filter chips, sort toggles).
- **`router.push` vs. `router.replace`.** `push` adds a history entry; `replace` swaps the current one. The senior reach: `replace` for filter/sort/pagination changes (so the back button skips intermediate states), `push` for genuine navigation between distinct views. A list page with frequent filter changes should `replace` — the user expects "back" to leave the page, not undo the last chip.
- **`router.refresh` — re-render the current route.** Tells the router to re-fetch the current route's Server Components without changing the URL. The reach: after a Client-side action (like a manual "refresh" button) that should re-pull server data. Does not invalidate caches (lesson 6 of chapter 032); pair with `revalidateTag` in the action if cache invalidation is needed.
- **`router.prefetch` — manual prefetch.** Tells the router to prefetch a route's data and code before the user navigates. The reach: when `<Link>`'s automatic prefetch (on viewport, on hover) doesn't fit — e.g., a "next item" button that's not a link, a wizard flow with known next step. Rare in practice; `<Link>` covers most cases.
- **`useSearchParams` — reading the URL query from the client.** Returns a `ReadonlyURLSearchParams` instance; `get('status')`, `getAll('tag')`, `has('cursor')`. The Client read is the right reach when the component needs to *react* to URL changes (animating a chip into the active state, syncing local state to URL). For pure reads at render time, the server-side `searchParams` prop is cheaper.
- **The Suspense requirement on `useSearchParams`.** A Client Component that calls `useSearchParams` must be wrapped in a `<Suspense>` boundary at the parent level — without it, the build fails. The reason: the search params are not available until hydration, and the suspense boundary handles the rendering gap. The error message points to the missing boundary.
- **`usePathname` — current path for active-link styling.** Returns the path without query or hash. The canonical reach: a navigation component that highlights the active item. `<NavItem href="/invoices" isActive={pathname.startsWith('/invoices')} />`. Fast, side-effect-free, common.
- **`useParams` — dynamic segments on the client.** Same shape as the server `params` (an object keyed by segment name), but resolved synchronously on the client (the route has already matched). The reach: a Client Component deep in the tree that needs the org slug without threading it as a prop. The senior anchor: prefer threading as a prop when the prop tree is shallow; reach for `useParams` when the depth makes prop-drilling painful.
- **The chip-list pattern — putting it together.** A Client Component takes the current filter as a prop, renders chips, on click calls `router.replace(\`?status=${value}\`, { scroll: false })`. The server re-renders the list with the new filter. The chip's active state is derived from the prop (passed from the server), not from `useSearchParams` — simpler and equivalent.
- **Building a URL with `URLSearchParams`.** `const params = new URLSearchParams(searchParams); params.set('status', 'paid'); router.replace(\`?${params.toString()}\`)`. The pattern preserves other params; setting one without resetting the others is the senior shape. Common helper: `withParam(searchParams, key, value)` returning the new query string.
- **The interaction with nuqs (forward reference).** nuqs's `useQueryState('status', parseAsString)` returns `[value, setValue]` where `setValue` writes to the URL and triggers re-render. It wraps `useSearchParams` and `router.replace` into a typed hook. The lesson names nuqs as the production layer for non-trivial URL state; the bare hooks are the foundation.
- **What these hooks don't do.** They don't read response headers, cookies, or anything server-side — those are server reads only (lesson 1 of chapter 033). They don't trigger Server Actions — those are called directly. They don't fetch arbitrary URLs — `fetch` is the tool for that. They are scoped to the Next.js router's responsibilities: read what's in the URL, navigate to a new URL, refresh the current one.
- **Watch-outs.** Calling any of these in a Server Component is a build error — the hooks are client-only; missing `<Suspense>` around a component that uses `useSearchParams` fails the build with a specific message — wrap or move the call up the tree; `router.push` with a same-URL target is a no-op — guard with `if (newUrl !== currentUrl)` if the side effect matters; mutating `searchParams` from `useSearchParams` is forbidden (the type is `Readonly`) — construct a new `URLSearchParams` from the current one and update; the hooks re-render on every URL change — heavy work in the component (large derived lists, expensive memo) needs the same patterns as the rest of React; `router.refresh` is a no-op on a fully static route — combine with `revalidateTag` when the cache needs busting.

What this lesson does not cover:

- The full Server-Action wiring (Chapter 043).
- The cache-invalidation surface — `revalidateTag`, `router.refresh` interaction (lesson 6 of chapter 032).
- `<Link>` prefetching internals (lesson 4 of chapter 029 covered the surface).
- nuqs in depth (Chapter 060 project).
- The Server Component read of `searchParams` and `params` (lesson 4 of chapter 033).

Estimated student time: 40 to 50 minutes. Closes the client/server pair on URL state.

---

## Lesson 6 — Quizz

Top 10 topics to quiz:

- `cookies()` and `headers()` as async, server-only, read-only by default; setting cookies requires a Server Action or route handler context.
- The `proxy.ts` rename from `middleware.ts` in Next.js 16, Node-only runtime, the matcher as the cost-control surface.
- What `proxy.ts` is for (auth gating, rewrites, request enrichment, A/B routing) versus what it's not for (DB queries on every request, complex business logic, the authoritative auth check).
- Redirect vs. rewrite — user-visible URL change versus internal swap, 307 vs. 308, when to use each.
- The decision tree — `proxy.ts` for conditional rules, `next.config.ts` for static rules, `redirect()` from `next/navigation` for action-time redirects.
- Open-redirect prevention on the `?next=` pattern — validate that the target is a same-origin path.
- URL-state vs. component-state decision rule — what survives a refresh or share belongs in the URL.
- `params` for identity, `searchParams` for view state — both async in Next.js 16, both validated with Zod at the boundary.
- The read-on-server, write-on-client division — Server Components read `props.searchParams`, Client Components use `useRouter().push`/`replace` to write.
- The Client-side hooks — `useRouter`, `usePathname`, `useSearchParams`, `useParams` — each's role, the Suspense requirement on `useSearchParams`, when `replace` beats `push`.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
