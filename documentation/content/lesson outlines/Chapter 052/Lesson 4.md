# Lesson 4 — getCurrentUser across the five surfaces

- **Title:** Reading the session everywhere with one call shape
- **Sidebar label:** Reading the session

## Lesson framing

This is the payoff lesson of Chapter 052 and the last teaching lesson before the quiz.
L1 wired the instance, L2 the tables, L3 the lifetimes + cookie hardening.
Sessions now exist and persist — this lesson is about *reading* them at request time, everywhere.

The single load-bearing idea: **one call shape — `auth.api.getSession({ headers: await headers() })` — answers "who is this user?" identically in all five server surfaces** (proxy, layouts, Server Components, Server Actions, route handlers).
The student should leave able to write that call without re-deciding anything, and — more importantly — reach for the two thin helpers that wrap it (`getCurrentUser`, `requireUser`) instead of scattering the raw call.

Three sub-ideas hang off the spine, in increasing subtlety:
1. **The call is the same; the response to `null` differs by surface** (redirect vs `unauthorized` Result vs 401). Teach the shared call once, then the per-surface tail.
2. **Memoize per request with `React.cache`** so the layout, header, and page don't each pay for the read. This is the moment to nail `React.cache` (request-scoped) vs `'use cache'` (cross-request) — the single most dangerous confusion in the lesson, because the wrong reach leaks one user's session into another's cached entry.
3. **The proxy is a different animal.** It does **cookie-presence gating only** via `getSessionCookie`, never a real session read. Real validation lives in the layout's `requireUser()`. This is a correction to the chapter outline (which had the proxy calling `auth.api.getSession`) — Code conventions and Better Auth's own docs both say cookie-presence + validate-in-page; honor that.

Pedagogical stance, per the guidelines: senior mindset over syntax. The call shape is two lines; the *teaching weight* is the mental model of which layer decides what, and why the client read (`useSession`) is for display while the server read is for decisions. Frame in production stakes — every example is "the header shows the user's name," "the action refuses an anonymous mutation," "the proxy bounces a signed-out visitor cheaply." Build the model simplest-first: one call → one helper → memoization → the five tails → the proxy exception → the client/server split. Keep cognitive load low by reusing one running call shape and only varying the tail.

This is a pattern + setup hybrid. The `getCurrentUser`/`requireUser` helpers are the durable pattern; the minimum `proxy.ts` is the structural enforcement that gives L1's smoke test somewhere to redirect to. End with a smoke test that proves the gate end-to-end.

## Lesson sections

### Introduction (no header)

Open with the concrete problem, not the API.
A signed-in dashboard renders a header with the user's avatar, a page body keyed to their data, and a sidebar that hides an admin link — three places, same request, all asking "who is this?".
A mutating action needs the same answer before it writes. A route handler serving JSON needs it before it responds. The proxy needs a cheap version of it before the route even renders.
The senior question (stated implicitly, warm and brief): now that sessions exist, what is the *one* way to read "who is this user?" that works in every server context, and where does each context diverge?
Preview the deliverable: a `getCurrentUser()` / `requireUser()` pair every downstream chapter calls, plus a minimal `proxy.ts` gate.
Connect back: L3 hardened the cookie and turned on the cookie cache; this lesson is the read path that benefits from both.

### The one call: `auth.api.getSession({ headers })`

The spine. Teach the call in isolation before any surface.

- Show the bare line: `const session = await auth.api.getSession({ headers: await headers() });`
- What it returns: `Promise<{ user, session } | null>`. `user` is the typed `user` row; `session` is the typed `session` row (carries `expiresAt`, `ipAddress`, `userAgent`). `null` = no valid session cookie = anonymous request.
- **Why `headers()` is the argument** — this is the non-obvious part and the #1 silent-failure source. Server Components don't hand the auth library a cookie store implicitly; you pass the incoming request's `Headers` (from `next/headers`), and Better Auth reads the `Cookie` header off it. In Next.js 16 `headers()` is async, so `await headers()` is the canonical form (tie back to Caching conventions: async request APIs are Promises in Next.js 16).
- Note the cookie-cache tie-in from L3: this call reads the signed `…session_data` cookie when the cache is fresh, the DB otherwise — **the call shape is identical either way**. The student already enabled the cache in L3; here they see why the read path doesn't care.

Component: `AnnotatedCode` on the bare call (4 short steps): (1) `await headers()` — the incoming headers, color violet to flag it as the load-bearing argument; (2) `auth.api.getSession` — the server-side API, in-process; (3) the `{ user, session } | null` return, color blue; (4) `null` means anonymous, not "error". Keep `maxLines` default.

Tooltip (`Term`): "opaque session token" (one-line callback to Ch 051 — the random id in the cookie, looked up server-side) if it reads naturally; do not over-define.

### Five surfaces, one call, different tails

The heart of the lesson. The call is constant; what you do with `null` is the variable. Teach the shared call once (above), then enumerate the five surfaces as *tails*.

Lead with a small framing visual, then the per-surface code.

**Diagram (Figure + plain HTML/CSS):** a single horizontal "request → `getSession` → branch" strip. Center node is the one call; five labeled lanes fan out to the right (proxy, layout/Server Component, Server Action, route handler, client-via-prop). Pedagogical goal: cement "one call, many call sites" visually before the code makes it concrete. Keep it flat and wide (vertical-space constraint). `expandable` default. Caption: the call is identical; only the handling of `null` changes per surface.

Then walk the surfaces. Group the four *server* surfaces with a `CodeVariants` block (tabs: Layout / Server Component, Server Action, Route handler — and note the proxy is deliberately its own section because it does NOT use this call). Each tab: the same `getSession`-via-helper read, differing only in the `null` tail. Keep each tab's prose to one paragraph.

- **Layouts & Server Components** — read to drive identity-aware UI (header name, conditional admin link). `null` tail: render the signed-out variant, or `requireUser()` to redirect if the whole subtree demands a session. Senior note: a layout that reads the session opts its subtree into dynamic rendering (callback to Cache Components, Ch 032) — intended, not a smell; read at the highest layout where the gate belongs, not in every leaf, and lean on PPR so the static shell still ships.
- **Server Actions** — read at the *top* of every mutating action. `null` tail: return the `unauthorized` `Result` discriminant (tie to the `Result` type in Error-handling conventions: `err('unauthorized', …)`). Authz (role/org) layers on top later — name `authedAction` (Ch 057) as the forward home, but the *read* happens here.
- **Route handlers** — same call, same shape. `null` tail: 401 (callback to the Problem Details contract, Ch 046, named not re-taught).
- **Client Components via a server prop** — when a Client Component needs the user, read it on the server and pass it down as a prop; never reach for the auth client just to learn "who is logged in" on the server side. This sets up the client/server split section.

After the variants block, a one-line synthesis: same call, four `null` tails — redirect, `unauthorized` Result, 401, prop. Reinforces the spine.

### Read once per request with `React.cache`

The performance + correctness reflex, and the lesson's most important conceptual guardrail.

- Motivate concretely: one dashboard render reads the session in the layout, the header SC, the page body, maybe a sidebar — four reads of the same thing in one request. Without memoization each pays the cookie-cache decode (or a DB hit).
- The fix: wrap the read in `cache()` from `react` so every call within the same request returns the same evaluated `Promise`.
- **The dangerous distinction — make it loud.** `React.cache` is *request-scoped* (deduped within one request, discarded after). `'use cache'` is *cross-request* (persisted, shared across users). Per-user session data must NEVER go in `'use cache'` — the cache key wouldn't include the cookie, so user A's session-derived UI would be served to user B. This is a security bug, not a perf nit. Tie to Caching conventions verbatim: "React `cache()` for request-scoped memoization of work that depends on request data; `'use cache'` for cross-request persistence. They are different tools." Also tie to the rule "Never capture request-scoped data" in a cached function.

Component: `CodeVariants` two tabs — "`React.cache` (correct)" vs "`'use cache'` (leaks)". The leak tab uses `del`/`ins` framing or a violet-tinted highlight on `'use cache'` with prose stating the cross-user leak. This is the before/after where the wrong version is genuinely dangerous — exactly the case CodeVariants is for.

Tooltips (`Term`): "request-scoped" (lives for one request, then gone) and "memoize" if the audience needs it — strategic, not blanket.

### The helpers everyone calls: `getCurrentUser` and `requireUser`

The durable artifact. Everything above converges into two exports in `lib/auth.ts` that downstream chapters import without re-deciding.

- `getCurrentUser(): Promise<User | null>` — the safe read; returns `null` for anonymous. The reflex for surfaces that render differently signed-in vs out.
- `requireUser(next?): Promise<User>` — the assert form; `redirect('/sign-in?next=...')` when `null`. The reflex for protected pages and actions. Show the optional `next` param so post-sign-in return works (tie to Auth conventions' `requireUser(next?)` signature).
- Both are `React.cache`d so the underlying `getSession` runs once per request, and both resolve through `auth.api.getSession({ headers: await headers() })` exactly once. **The rule:** never call `getSession` directly from a page, layout, action, or route handler — always go through a helper, because the helper carries the `cache()` wrapping the raw call lacks (Auth conventions: "no parallel `getSession` calls anywhere").
- Mention `requireOrgUser(role?)` as the *third* helper that arrives with the organization plugin (Unit 9 / Ch 057) — named at recognition level so the student isn't surprised later, explicitly not built here (no org plugin yet).
- Frame the shape as the mirror of `lib/db.ts` from Unit 5: a thin, domain-shaped wrapper over the library, named once, called everywhere.

Component: `AnnotatedCode` on the full `lib/auth.ts` helper block (the two exports built on a private cached `getSession`). Steps: (1) `import { cache } from 'react'`; (2) the cached `getSession` core, color blue; (3) `getCurrentUser` returns `user ?? null`, color green; (4) `requireUser` with `redirect('/sign-in?next=...')`, color orange on the redirect; (5) the `next?` param threading. ~5 steps, `maxLines` default (block is short).

This section delivers the file the rest of Unit 8 depends on — keep the code conventions-exact (imports grouped, `redirect` from `next/navigation`).

### The proxy gate: cookie-presence, not a session read

The structural enforcement, and the section with the sharpest senior-reflex correction.

- First, the role split, stated up front to pre-empt the misconception: **the proxy bounces signed-out visitors cheaply; it does not authorize and it does not validate the session.** Real validation is the layout's `requireUser()`.
- The minimum `src/proxy.ts` (project root, not `src/app/`):
  - Exported function named `proxy` (Next.js 16 rename from `middleware`; callback to Ch 033 L2 — name it, don't re-teach).
  - Uses `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` — cookie-presence check only. If absent on a matched route, `NextResponse.redirect` to `/sign-in`.
  - `matcher` config selects protected paths — `['/dashboard/:path*']` for now; L1 of Ch 054 expands. (Callback to Ch 033 matcher, named.)
  - The proxy runs on the **Node runtime in Next.js 16 — not configurable, no edge**. Note that this *technically* makes a full `auth.api.getSession` read possible in the proxy now (the edge-runtime limitation that plagued earlier Next.js is gone), but the senior reflex is still cookie-presence here + real read in the layout — both because of the cookie-cache staleness window (L3) and Better Auth's own "this is not secure, validate in the page" guidance.
- **Why `getSessionCookie` and not `auth.api.getSession` in the proxy** — the load-bearing reasoning:
  1. Defense placement: authorization decisions re-check against the DB at the action boundary, never in the proxy (Auth conventions). The proxy is an optimistic UX redirect, not a security boundary.
  2. The `SESSION_COOKIE_PREFIX` link: `getSessionCookie` defaults to the `better-auth` prefix and **silently misses** any cookie set under a different prefix — and L3 set `__Host-better-auth` in production. Pass the exported `SESSION_COOKIE_PREFIX` constant (shipped by L3 — the one forward artifact it left for this lesson) so the proxy and the cookie config never drift. This is the canonical production bug: `__Host-`/`__Secure-` prefix + a hardcoded default in the proxy → cookie exists but the user is bounced to sign-in. The dev/prod prefix split from L3 is exactly what keeps this working across environments.

Component: `AnnotatedCode` on `src/proxy.ts` (5–6 steps): (1) `import { getSessionCookie }` + `SESSION_COOKIE_PREFIX`; (2) the `proxy` export signature; (3) `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })`, color violet (the constant is the anti-drift hero); (4) the redirect when absent, color orange; (5) `NextResponse.next()` pass-through; (6) the `matcher` config. Pair with a short `CodeVariants` or inline aside contrasting the hardcoded-prefix break vs the constant — but a single `Term` tooltip on `getSessionCookie` ("checks the cookie exists; does not validate it") plus prose may be lighter; prefer the lighter option unless the break needs its own pane.

Tooltips (`Term`): "matcher" (the path filter that decides which requests the proxy runs on) if not obvious from the Ch 033 callback.

### Client reads are for display, server reads are for decisions

The client/server split — the rule that prevents the most common real-world auth mistake.

- `authClient.useSession()` returns `{ data, isPending, error }` — reactive, refetches on focus. Perfect for header avatars and "signed in as X" chrome in Client Components.
- The hard rule: **client reads drive UI; server reads drive decisions.** The client value can be stale or forged in a debugger; the server value (`auth.api.getSession` via the helpers) is the truth. Never gate a mutation or a protected render on a client read.
- **Why you can't call `auth.api.getSession` from a Client Component anyway** — two reasons, both reinforce L1's split: (1) it would import `auth`, which is `server-only` (build error); (2) even if it didn't, the call needs the request's cookies, which the browser doesn't pass to itself. On the browser, use `authClient.useSession()` / `authClient.getSession()`; on the server, always `auth.api.getSession` with `await headers()`. Mirror pair from L1: `auth.api` reads identity on the server; `authClient` triggers/observes on the browser.
- Watch-out folded in: gating UI in a `useEffect` client read is the wrong instinct — the gate is server-side; the client read is for display only.

Component: this is the single best fit for `RequestTrace` with a `WireProp` `leak` — show a Client Component receiving `currentUser` as a prop from the server, with one `WireProp status="leak"` on a `sessionToken` field (serializable, so it crosses, but now in client JS) and one `status="ok"` on a safe `{ id, name }` shape. Phases `request,server-render,wire,hydrate`. Pedagogical goal: make "serializable ≠ safe to send" visceral, and show that the *right* server-read result is a trimmed `User`, not the session row. This component's wire panel exists for exactly this teaching point. (Provides its own card — do NOT wrap in `Figure`.)

### Check your understanding (exercise)

Place the exercise here, after both the server tails and the client/server split are taught — it checks the lesson's spine (which layer, which tool).

`Buckets`, `twoCol`, sorting call sites / situations into **"Server read (`auth.api.getSession` via helper)"** vs **"Client read (`authClient.useSession`)"** vs (optionally a third) **"Proxy (`getSessionCookie`, presence only)"**. Chips: "header avatar in a Client Component" → client; "refuse an anonymous mutation in a Server Action" → server; "bounce a signed-out visitor before `/dashboard` renders" → proxy; "hide an admin link in a layout" → server; "show 'signed in as X' chrome that updates on focus" → client; "return 401 from a route handler" → server; include a decoy like "decide whether a user may delete an invoice" → server (decisions are server-side, never client). Grades on correct placement; the decoy teaches the decisions-are-server-side rule.

If a third bucket muddies it, keep two (server vs client) and fold the proxy into a separate `TrueFalse` two-statement self-check ("the proxy validates the session" → false; "`React.cache` is safe for per-user session reads, `'use cache'` is not" → true).

### External resources (optional)

`ExternalResource` cards: Better Auth "Next.js integration" (session reads + middleware/proxy guidance) and the Next.js `headers()` / proxy docs. Keep to two.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `auth` instance, `authClient`, catch-all route, server/client split (L1).
- The four tables, the Drizzle adapter `schema` wiring (L2).
- `expiresIn`/`updateAge`/`freshAge`, the `__Host-` cookie prefix, the cookie cache, and the exported `SESSION_COOKIE_PREFIX` constant (L3) — this lesson *consumes* that constant in the proxy.
- `React.cache` vs `'use cache'` and dynamic-by-default rendering (Ch 032) — re-stated only as it bears on the session read.
- `proxy.ts` rename + `matcher` (Ch 033), `Result` type (Ch 043), Problem Details 401 (Ch 046), Server Components dynamic signal / PPR (Ch 032) — all callbacks, named not taught.

**Explicitly out of scope (defer, name the owner):**
- The full `proxy.ts` matcher pattern / multi-route protection — minimum gate only here; full surface is Ch 054 L1.
- The `authedAction` wrapper and role/org authz — Ch 057 (Unit 9). This lesson reads identity; it never authorizes.
- `requireOrgUser` implementation — named at recognition level; built with the organization plugin (Unit 9).
- Active-sessions list, "sign out everywhere," per-session revocation — Ch 054 L3.
- `freshAge` elevation / credential re-auth at the action boundary — Ch 054 L2 (L3 set the value; nobody reads it until Ch 054).
- 401-vs-403 wire shape on route handlers in depth — Ch 046 / Ch 054 L4.
- `useSession` in depth and the client patterns hanging off it — Ch 053 (as it builds sign-in surfaces).
- CSRF / SameSite mitigation surface — Ch 054 L4.
- `databaseHooks` for session-creation side effects (e.g. stamping `activeOrganizationId`) — Ch 056 L1. Out of scope here; do not introduce, the chapter outline floats it but it belongs with the org plugin.
- Email/password and OAuth sign-in flows that actually create sessions — Ch 053. This lesson assumes a session may or may not exist; it never creates one.

## Notes for downstream agents

- **Correction to the chapter outline, applied deliberately:** the chapter-outline text for this lesson has the proxy calling `auth.api.getSession`. Do NOT do that. The proxy does **cookie-presence only** via `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })`; real validation is the layout's `requireUser()`. This matches Code conventions (Authentication §: "The proxy gate is cookie-presence only…Never the proxy" for authorization) and Better Auth's own Next.js docs ("getSessionCookie…is NOT secure…validate in each page/route"). The Node-runtime proxy in Next.js 16 *could* run the full read, but the senior reflex doesn't — note this explicitly so the reasoning is visible.
- **Helpers:** ship exactly two (`getCurrentUser`, `requireUser`). Name `requireOrgUser` as the forward third; do not implement (no org plugin yet).
- Code must be conventions-exact: import groups (side-effecting first, then external, then `@/`, then relative; alphabetical within group), `redirect` from `next/navigation`, `headers` from `next/headers`, `getSessionCookie` from `better-auth/cookies`. `lib/auth.ts` already starts with `import 'server-only';` from L1 — the helpers live in that same file.
- Keep the running `getSession` call shape byte-identical everywhere it appears so the "one call" thesis is visually reinforced.
