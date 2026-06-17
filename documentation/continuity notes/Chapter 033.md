# Chapter 033 — The request surface

## Lesson 1 — Reading the request with cookies() and headers()

**Taught.** `cookies()`/`headers()` from `next/headers` as the two async, server-only request reads; the read-once-high-in-the-tree-pass-resolved-values-down pattern; the never-trust-a-raw-header-for-authz rule; the `use cache` build-error interaction; the cookie/header size budget.

**Mental model installed (chapter-wide anchor).** A route's only inputs are the URL, the headers, and the cookies — no hidden fourth channel. This lesson owns headers + cookies; URL (`searchParams`/`params`) is lessons 4–5.

**Debts (forward references named, not taught).**
- Cookie/header *writes* live in a Server Action (Unit 6 / ch 043) or a route handler (named, ch 034) — render is read-only. Reason given: `Set-Cookie` is a response-header instruction and HTTP forbids setting headers after streaming starts. Phrasing: `set`/`delete` from a Server Component is "not supported during rendering — Next.js flags it" (not "throws" — the methods exist on the store, the *context* is wrong); match this wording in the quiz and ch 043.
- `getCurrentUser()` is the canonical session read: an imported, React-`cache()`d black-box helper resolving the session cookie via Better Auth — built in Unit 8. Layouts/pages never touch the raw session cookie; children re-call it rather than prop-drilling `user`.
- Client IP read (`x-forwarded-for`) is for recognition only here; rate-limiting using it is ch 073.
- Locale: the lesson reads a `locale` cookie with `accept-language` fallback but defers resolution/ICU/`next-intl` to Unit 17.
- `proxy.ts` request enrichment (proxy-to-route header pattern) flagged as lesson 2.

**Terminology / mental models later lessons can reuse.**
- "Read high, pass resolved values down; reads happen during render, writes happen in an action."
- Cookie = client-side storage; server only reads what the browser sends and emits `Set-Cookie` instructions.
- "Headers are for telemetry and platform-provided signals; the session is for identity and permission." On Vercel the trustworthy proxy headers are `x-forwarded-for` / `x-real-ip`.
- "A cookie holds a reference, not a record" — store an ID, look up server-side.
- The `use cache` fix: read the request value in an uncached parent, pass it as an argument so it becomes part of the cache key; lift cached chrome out of the dynamic subtree.

**Patterns / best practices (for project chapters).**
- Session reads always go through `getCurrentUser()`, never a hand-rolled `getSession`/cookie read in a page or layout.
- Cookie `get` returns `{ name, value } | undefined` — always unwrap with `?.value`; header `get` returns `string | null`.
- Session cookie convention: `__Host-` prefix, `HttpOnly; Secure; SameSite=Lax`.
- `layout.tsx` uses a default export (framework-dictated carve-out); everything else named.
- Don't reflexively wrap trivial cookie reads in `cache()`; `cache()` earns its place only behind expensive derivation.

**Misc.**
- Deliberate divergence: primitive demo blocks use a benign `theme` / `user-agent` read; the worked root-layout example uses the production `getCurrentUser` helper + the `locale` derivation. Keep these distinct downstream.
- Lesson assumes (does not re-teach) ch 032 lesson 7 async-request-API syntax (`await` / `React.use()`) and the dynamic-by-default model.

## Lesson 2 — proxy.ts and the matcher

**Taught.** Next.js 16 `middleware.ts`→`proxy.ts` rename (file + exported `proxy` fn) and the *why* — it's a network proxy at the boundary, not Express application middleware; a last-resort tool. Node-only runtime (setting `runtime` throws; Edge named once, set aside). The cost model (proxy runs on every matched request, before render). The matcher as the cost-control surface (string / array / negative-lookahead regex / object `has`+`missing` forms; static-analyzability; the Server-Action-POST trap). The four legitimate jobs vs the anti-list. `NextRequest`/`NextResponse` surface at recognition depth. The proxy→route header-enrichment pattern. Cookie-write timing gotcha. Tight auth-gating worked example.

**Mental model (chapter-wide).** *Do the cheap thing in the proxy, do the authoritative thing in the route* — defense in depth, not redundancy. Proxy = UX optimization (fast bounce, cookie *presence*); route = security boundary (real validation, fresh, every time).

**Cut (vs chapter outline).** Chapter outline anchored auth gating on "a fast verification (Better Auth's session check, or a JWT signature verify)"; lesson deliberately keeps the proxy **presence-only** (`getSessionCookie`), pushing all decode/verify to the route. Chapter outline listed `request.geo`/`request.ip` as part of the `NextRequest` surface — corrected: those were **removed** (Next 15), now `geolocation(request)`/`ipAddress(request)` from `@vercel/functions`. Downstream must follow the corrected forms.

**Debts (forward references named, not taught).**
- Redirect-vs-rewrite semantics, 307/308, `?next=` open-redirect validation, proxy-vs-`next.config` decision tree → lesson 3 (named as two of the four jobs; worked example uses an unvalidated `next=` redirect on purpose, flagged as lesson 3's job).
- Real session/JWT verification, Better Auth wiring → Unit 8. Proxy gets the cookie-presence *slot* only.
- `requireUser()` referenced as "the route's authoritative check" (built Unit 8); `SESSION_COOKIE_PREFIX` imported from `lib/auth.ts` (Unit 8).
- i18n routing in `proxy.ts` (next-intl, runs before the auth gate) → Unit 17, not covered here.

**Terminology / mental models later lessons can reuse.**
- "Proxy" = network boundary that can short-circuit / rewrite / pass through, never a second app layer.
- Three outcomes map to returns: `NextResponse.redirect()` (short-circuit, route never runs), `NextResponse.rewrite()` (different internal route, URL unchanged), `NextResponse.next()` (pass through). Plus the direct-`Response`/`NextResponse.json` escape hatch (rare in proxy).
- "No implicit pass-through" — every branch must return or the request hangs.
- Matcher negative-lookahead canonical form: `'/((?!api|_next/static|_next/image|favicon.ico).*)'`.
- "Presence here, real check there." Better Auth keeps a short-lived (minutes) session cache, so the proxy can read a *stale* session — hence it can never authorize.
- Proxy fails **open** (not closed): a non-authoritative gate wraps risky work in `try/catch` and passes through on error, because the route re-checks anyway. (Contrast with the course's general fail-closed rule for authoritative gates.)

**Patterns / best practices (for project chapters).**
- `proxy.ts` lives at project root or `src/proxy.ts`; uses a **default export** (framework-dictated carve-out — Next also accepts a named `export function proxy`, but the course uses default).
- Matcher must be a **static literal** (read at build time; runtime-computed matchers silently match nothing).
- Tight matcher always excludes assets + API routes; object form `missing: [{ type: 'cookie', key }]` gates before the function body runs.
- Auth gate uses `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` — presence only, never a hand-rolled cookie read. Pass the prefix explicitly: the helper defaults to `'better-auth.'` and silently misses the `__Host-` prefix.
- Proxy→route enrichment: clone `new Headers(request.headers)`, set only headers *you* derived (allow-list — never forward a client-supplied identity header), forward via `NextResponse.next({ request: { headers } })`. `next({ request: { headers } })` ≠ `next({ headers })` — the `request:` wrapper sets what the **route** sees; without it you set the **client** response headers.
- Imports: `import { NextResponse } from 'next/server'`, `import type { NextRequest } from 'next/server'`.
- Never DB-query or run heavy/business logic in the proxy (cost multiplies across every matched request).
- Migration: `npx @next/codemod@canary middleware-to-proxy .` (keep `@canary`); read the diff, custom/Edge code may need manual cleanup.

**Misc.**
- Cookie set on the response is visible only on the *next* request, not the current one's `cookies()` read — same model as lesson 1.
- Worked example does only two of the four jobs (auth gate + pass-through); the legacy-URL redirect is deliberately held for lesson 3's worked example to avoid scope bleed.
- Worked-example matcher is the bare negative-lookahead string (no `missing` clause); the object `missing` form is taught earlier in the matcher section, kept out of the final file to keep it minimal.
- `AnnotatedCode` worked-example color = **blue** (continuity anchor reused by lessons 3–5).
- Build added a `VideoCallout` (ByteGrad, 23 min, `videoId="zNgCFXZLoRk"`) in the "what belongs in the proxy" section — outline had said skip video; the build kept one because it reinforces the auth-belongs-in-the-DAL-not-the-proxy line. The two external-resource cards (proxy.js file convention + v16 upgrade guide) are as planned.

## Lesson 3 — Rewrites and redirects in proxy.ts

**Taught.** Redirect (visible URL change, 3xx + `Location`, two round trips, history/SEO) vs rewrite (invisible internal swap, one round trip, address bar unchanged) — disambiguated by "what the address bar does". 307 (default, temporary) vs 308 (permanent, second arg) and why not 301/302 (method-rewrite footgun). The three-home decision tree for *where a redirect rule belongs*. The subdomain-rewrite multi-tenant pattern + its rewrite-loop pitfall. Setting a cookie on a redirect response. The `?next=` open-redirect hole and the `safeNext` fix. The three-job worked `proxy.ts` completing lesson 2's file (debt paid).

**Cut (vs chapter outline).** No geo/IP redirect example (outline floated `request.geo`); decision-tree request-conditional cases use cookie/host/session instead, avoiding the `@vercel/functions` dependency. The optional rewrite-loop micro-diagram was skipped (prose + caution aside carry it).

**Debts (forward references named, not taught).**
- Static `redirects()` in `next.config.ts` (CDN-edge, zero function invocation) → ch 034.3, named as the cheaper home for request-independent rules.
- `redirect()` / `permanentRedirect()` / `notFound()` from `next/navigation` (per-action/per-route) → back-ref to ch 029 routing.
- Cached tenancy lookup behind `isKnownOrg`, real subdomain parse (apex + `www`) → Unit 9 multi-tenancy. `isKnownOrg` is a deliberate stand-in, never a DB call.
- The `[org]` route reads `params.org`; the async-`params` shape (Promise in Next 16) → lesson 4.
- Hardened `safeNext` (parse with `new URL()`, compare resolved origin) named as the production form; the `startsWith` checks are the teaching shape, not the last word.

**Terminology / mental models later lessons can reuse.**
- "Redirect changes what the user sees in the address bar; rewrite changes what the server renders behind it. Neither is better — they answer different product questions."
- "Static-and-known goes in the config; request-conditional goes in the proxy; after-an-action goes in `redirect()`." Two ordered questions: (1) does it depend on the request? (2) does it need to happen before the route renders?
- "Never redirect to a user-supplied URL without proving it's a same-origin path." Open redirect = phishing primitive.
- `link equity` (308 forwards it), `protocol-relative URL` (`//evil.com`, the `safeNext` trap).
- A 308 is sticky/cached/indexed and hard to un-tell — under-commit with 307 when unsure.

**Patterns / best practices (for project chapters).**
- `safeNext(next, fallback = '/dashboard')` lives in `lib/redirects.ts`; rule is absolute — never pass `searchParams.get('next')` straight into a redirect, always through the helper. Checks: falsy → fallback, not `/`-leading → fallback, `//`-leading → fallback.
- `NextResponse.redirect(url)` defaults to 307; pass `308` explicitly for permanent. Use only 307/308, never 301/302.
- Subdomain extract: `host.split(':')[0]?.split('.')[0]` — strip port *first* (dev host is `acme.localhost:3000`); optional chaining for `noUncheckedIndexedAccess`.
- Use `NextResponse.rewrite()`, never a hand-rolled `fetch` — the helper propagates the RSC headers client navigation needs.
- Rewrite-loop fix: exclude the rewrite target from the matcher (the three-job proxy's matcher adds `orgs` to the negative lookahead) — or sentinel header (`x-rewritten: 1`, short-circuit on re-entry) when exclusion isn't possible.
- Set a cookie on a redirect: `const res = NextResponse.redirect(url); res.cookies.set(...); return res` — visible on the next request (the redirect *is* that request).
- Body order: cheap/specific rules first (legacy redirect), rewrite next, auth gate last (so its `next=` capture sees the final path). Every branch returns.

**Misc.**
- The three-job worked `proxy.ts` continues lesson 2's file: matcher (now excludes `orgs`) + legacy `/billing/manage`→`/settings/billing` 308 + subdomain rewrite + auth gate with validated `safeNext(pathname)`. Under fifty lines. Imports `safeNext` from `@/lib/redirects`, `SESSION_COOKIE_PREFIX` from `@/lib/auth`.
- The legacy redirect is co-located in the proxy (not `next.config.ts`) on purpose — "the file already owns the app's URL shaping" — with the config-is-cheaper tradeoff named as ch 034.3.
- `AnnotatedCode` colors: violet for the standalone subdomain-rewrite, blue for the three-job worked example (matches lesson 2's worked-example blue).

## Lesson 4 — URL state with searchParams and route params

**Taught.** The URL-vs-component-state decision rule (one-question heuristic: "would the user expect this back on refresh?" → URL, else `useState`) + the canonical URL-state quartet (filter, sort, pagination, tab). The `params`-for-identity / `searchParams`-for-view-state split. Reading both as **Promises** on the server (`await props.params` / `await props.searchParams`) — the await is the explicit dynamic signal. Validating `searchParams` at the boundary with a hand-written Zod schema + `safeParse`, falling back to all-defaults (`schema.parse({})`) so a bad URL renders the default view, never a 500. The read-validate-query-render Server Component pattern that replaces the client `useState`+`useEffect` waterfall. The `string | string[] | undefined` repeated-key shape (normalized once at the parser with `z.union(...).transform(...)`). Opaque base64 cursors as a URL shape only. The Cache Components interaction (`await searchParams` inside `use cache` = build error; lift cached chrome outside the dynamic table). What never goes in the URL (secrets, >1 KB blobs, transient UI state). `nuqs` named as the production layer past the 2–3-surface threshold, with the server-read `createSearchParamsCache` pattern.

**Mental model (chapter-wide anchor).** "The server is a pure function of the URL" — same URL in, same page out; the client's only job is changing the URL (lesson 5). This lesson owns the third input channel (URL) after lesson 1 owned headers + cookies; reuses lesson 1's "read high, pass resolved values down" reflex for the server-read default.

**Cut (vs chapter outline).** The `key`-based derived-state remount-on-`searchParams`-change watch-out (back-ref ch 023.5) was dropped — outline had flagged it as optional/one-line only, so no later dependency. Cursor *versioning across schema changes* mentioned only as a one-line "the encoded shape can evolve" benefit, not as a watch-out.

**Debts (forward references named, not taught).**
- Writing the URL from the client (`useRouter().push`/`replace`, `useSearchParams`, the chip-list handler, the Suspense requirement) → lesson 5. Named at every "user changes the filter" point; never shown.
- The full four-pillar URL-state list view (filter chips, committed-vs-typed search, cursor-reset-on-filter invariant) → ch 060 project, which builds on this lesson's canonical page shape and adopts the `nuqs` `createSearchParamsCache` setup as its reference.
- Cursor mechanics (tiebreaker rules, n+1 hasNext, composite index, building/decoding) → ch 038.6 (and ch 060.4 for cursor-in-URL pagination). Taught here as opaque-base64 URL shape only.
- Zod depth (refinements, transforms beyond the array-normalize, error formatting, `drizzle-zod`) → ch 042. Only `z.enum`, `.optional()`, `.default()`, `safeParse`, `.transform()` used here.
- Async-request-API *syntax* basics (why Promises, `await` vs `React.use()`) → ch 032.7 / ch 030.4, redefined in one line. `React.use(searchParams)` named as the client-unwrap counterpart, not taught.
- The `listInvoices(...)` query is a named black box → ch 038 owns Drizzle querying internals.
- PPR (static shell + dynamic holes) → ch 032, reused not re-taught.

**Terminology / mental models later lessons can reuse.**
- "The path says who you're looking at; the query says how you're looking at them." `params` = identity/nouns, `searchParams` = view state/adjectives.
- **Dynamic segment** = `[org]` folder → `params.org`; the file system shapes the `params` type, you don't wire it.
- **Opaque** = data the user only round-trips, not reads/edits; **tiebreaker** = secondary sort key for deterministic ordering on ties.
- "Validate at the boundary, once, at the top of the page" — `searchParams` are user-controlled input (the address bar is a text field).
- "Garbage in the URL becomes defaults out, not a crash" — `safeParse` never throws; `.default()` is what makes a param omittable.
- Five-word pattern summary: "URL in, typed filters, table out."
- "Cache the shell, read the URL only where the data is dynamic."

**Patterns / best practices (for project chapters).**
- Canonical page signature: `props: { params: Promise<{ org: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }`; `async` page; `await` both at the top.
- One `parseSearchParams(raw: unknown)` helper **per route**, called once at the top, living in `app/orgs/[org]/invoices/_lib/search-params.ts`. Returns typed values; on `safeParse` failure returns `schema.parse({})` (all defaults).
- Schema enums spell out real domain values (`status: ['draft','paid','overdue']`, `sort: ['-date','date','-total','total']`), `sort` carries `.default('-date')` so the param is omittable.
- Route-local colocated dirs: `_lib/` (parse helpers), `_components/` (e.g. `invoice-table.tsx`) — underscore-prefixed, route-private.
- Repeated-key params normalized to an array **at the parser** (`z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v : [v]).default([])`) so downstream sees one shape.
- Cursor decode lives in the parse helper alongside the Zod schema; the query consumes the decoded shape.
- `nuqs` server parsers import from **`nuqs/server`** (the bare `nuqs` entry carries `'use client'`); `createSearchParamsCache` + `parseAsStringEnum(...).withDefault(...)`, read anywhere in the tree via `searchParamsCache.get(...)` / `.parse(props.searchParams)`. Honest framing: the cache's value is one typed declaration shared across the whole render tree (not "the page can't read its prop").

**Misc.**
- **Deliberate divergence (don't "correct" downstream):** teaching schema is a hand-written `z.enum`, *not* `createSelectSchema`/`drizzle-zod` — clarity over the project's richer derived schema (ch 042). Flag held over from the outline.
- **Query-helper naming divergence from chapter outline:** MDX uses `listInvoices({ org, status, sort, cursor })` imported from `@/db/queries/invoices`, not the outline's `db.invoices.findForOrg(orgId, ...)`. Use `listInvoices` as the reference shape if continuing this codebase.
- `AnnotatedCode` color = **blue** for the worked invoice-list page (continuity with lessons 2–3's blue worked examples).
- `nuqs` parser shown is `parseAsStringEnum` (outline had said `parseAsString`); use the enum form for typed status/sort.

## Lesson 5 — Client-side navigation hooks

**Taught.** The four `next/navigation` client hooks: `useRouter` (the one write hook — `push`/`replace`/`back`/`forward`/`refresh`/`prefetch`), `usePathname` (path string), `useSearchParams` (`ReadonlyURLSearchParams`), `useParams` (sync dynamic segments). The read-on-server / write-on-client division. `push` vs `replace` decided by back-button expectation; `{ scroll: false }` for in-page filter/sort changes. `router.refresh` re-renders but is **not** a cache bust. `useSearchParams` Suspense-boundary build requirement + the why (query unknown at prerender). `usePathname` `startsWith` vs `===` for active-nav. Client `useParams` synchronous vs server async `params`. The worked chip-list (`StatusFilter`) completing lesson 4's invoice page, and the merge-don't-clobber query-string construction.

**Mental model (chapter pair anchor).** Mirror of lesson 4's "server is a pure function of the URL": **the client's only job is to change the URL.** The two halves close the URL channel. Closes the chapter's three-input model (headers+cookies = L1, URL = L4/L5).

**Headline insight (reusable).** The interactive leaf reads its **active state from a prop** the server already passed down (`aria-pressed={status === current}`), not from `useSearchParams`. Hooks are the escape hatch for when the prop path is genuinely costly, never the default — same judgment for `useSearchParams`-vs-prop and `useParams`-vs-prop. Extends lesson 1's "read high, pass resolved values down."

**Cut (vs chapter outline).** The `push` same-URL-no-op guard watch-out dropped (not load-bearing). View Transitions `transitionTypes` option on `push`/`replace` explicitly out of scope.

**Debts (forward references named, not taught).**
- `nuqs` `useQueryState('status', parseAsStringEnum(...))` named as the production layer wrapping `useSearchParams` + `router.replace`; threshold = past 2–3 URL-state surfaces (reuses lesson 4's threshold). Built in ch 060 project. Keep consistent with lesson 4's `nuqs/server` `createSearchParamsCache` server-read half.
- `router.refresh` pairs with `revalidateTag(tag, 'max')` in a Server Action when cached data must change → ch 032.6 cache invalidation (two-arg form required).
- Calling Server Actions directly (not via the router) → ch 043.
- `<Link>` auto-prefetch (viewport/hover) → ch 029, back-ref for the `prefetch` contrast.
- The full chip-list / committed-vs-typed-search / cursor-reset list view → ch 060.

**Terminology / mental models later lessons can reuse.**
- **soft navigation** = client route change swapping new route's Server Component output, no full document reload (vs hard navigation/full reload); `router.push` = programmatic `<Link>` click.
- **history entry** = back/forward stack frame; `push` adds one, `replace` overwrites the top. One-liner: "If the user wouldn't think of it as 'a place I navigated to,' use `replace`."
- `ReadonlyURLSearchParams` = read-only `URLSearchParams` subclass; `get`/`getAll`/`has` only, no `set`/`delete` (type-enforced).
- "The Suspense boundary is the cost of reading the URL on the client — usually the right move is not to pay it: read on the server, pass the prop down." Boundary requirement is specific to `useSearchParams` (query unknown at prerender), not `usePathname`/`useParams` (path/segments known).

**Patterns / best practices (for project chapters).**
- Filter/sort writes use `router.replace(..., { scroll: false })`; genuine view changes use `push`.
- Build the next query by merging: `const params = new URLSearchParams(searchParams.toString()); params.set(key, value); router.replace(\`?${params.toString()}\`)` — never write `?status=paid` directly (clobbers `sort`/`cursor`). Lift into a `withParam(searchParams, key, value)` helper in `_lib/` shared across all filter/sort controls.
- Active state derived from a server-passed prop, not re-read on the client.
- Client navigation hooks live only at the smallest interactive leaf (`'use client'`); the build error for `useSearchParams` without Suspense lists three exits (Suspense / `connection()` force-dynamic / server-prop) — server-prop is the default, Suspense the fallback.

**Misc.**
- The `ReactCoding` exercise runs in an iframe with **no Next router**: navigation is stubbed via an `onNavigate(href)` callback prop (not a real `router.replace`); tests assert merge-don't-clobber and active-from-prop. Reuse this stub shape for any router-dependent in-iframe exercise downstream.
- `StatusFilter` is the named component completing lesson 4's invoice page (`current` prop from the server-read `status`).
- Build complete: all components materialized. CodeVariants (waterfall-vs-server, push-vs-replace), AnnotatedCode blue (Suspense page, `StatusFilter` worked chip), `ReactCoding` (stubbed `onNavigate`), one `MultipleChoice` (push/replace category+price-filter), and a `VideoCallout` (ByteGrad, `videoId="ukpgxEemXsk"`, "STOP using useState, put state in URL"). Four `ExternalResource` cards: the four-hook Next.js ref, Linking-and-Navigating, MDN `URLSearchParams`, nuqs.
