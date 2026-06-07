# Lesson 3 — Session lifetimes and cookie hardening

**Title:** Session lifetimes and cookie hardening
**Sidebar label:** Session and cookie config

---

## Lesson framing

This is a **decision-archetype** lesson, not a setup walkthrough. The tables and route exist (L1, L2); this lesson configures the two `betterAuth` option blocks that decide *operational* behavior: `session` (how long a login lasts, when it slides, when it counts as "fresh") and `advanced` (how the cookie is hardened). Every knob is taught as **default → does the default hold for SaaS? → the threshold that flips it**, matching filter "defaults before conditionals; trigger before tool."

The spine the student leaves with: **a session is a server-stored row reachable by an opaque token in a hardened cookie; its lifetime is three independent clocks (absolute, sliding, freshness), and reads can skip the DB at the cost of a bounded staleness window.** Three clocks confused as one is the central beginner trap — keep them visually and conceptually separate.

This lesson **honors decisions made conceptually in Ch 051 L2** (opaque-token-in-cookie, `__Host-` prefix, `SameSite`, server-side revocation) at the actual call site. It does **not** introduce the read path (`getSession`, `getCurrentUser`, proxy) — that is L4. The only forward artifact L4 depends on is the **`SESSION_COOKIE_PREFIX` export** from `lib/auth.ts`; this lesson must produce it.

Authoritative config values come from `Code conventions.md` §Authentication (the project deliberately overrides Better Auth defaults): `__Host-` prefix, `expiresIn` 30 days, `updateAge` 1 day, **`freshAge` 10 minutes** (not Better Auth's 1-day default — the tightening is the point), cookie flags `HttpOnly; Secure; SameSite=Lax`, cookie cache enabled with the ~5-minute staleness consequence, and `revokeOtherSessions: true` on credential mutations. Where the chapter outline and Code conventions disagree (e.g. `freshAge` framing), **Code conventions wins**.

Real production stakes to thread throughout: a session that never expires is a session that never rotates (leaked-cookie blast radius); a cookie cache on a billing/admin surface can serve revoked access for minutes; `__Host-` is the cheap structural defense that costs nothing in a single-origin Next.js app. The senior reflex per knob is "ship the default unless a named threshold forces the flip" — for this stack the *defaults the course ships* already differ from the *library defaults*, and the lesson must make that gap explicit so the student doesn't think they're getting library behavior for free.

The student should finish able to: read a `betterAuth({ session, advanced })` block and explain every value; pick `expiresIn`/`updateAge`/`freshAge` for a given sensitivity; decide cookie-cache on/off and `maxAge` from a route's access pattern and revocation needs; recognize (not configure) `secondaryStorage`, the `jwt` plugin, `multiSession`, and `trustedOrigins` as deferred reaches with a named trigger each.

Tone: terse, senior, no celebration. Lean on two comparison tables (the lesson archetype calls for them) and one diagram that separates the three clocks. Code blocks are config objects — show the final hardened block once via `AnnotatedCode`, and use a `CodeVariants` before/after for the cookie-prefix dev-vs-prod split.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, stated implicitly as a problem: the rows and the route are wired, but nothing yet says *how long a login survives, when its token rotates, whether a sensitive action trusts a months-old session, or whether every page load pays a DB query to know who you are.* Name that these are configuration decisions, not more plumbing — two option blocks (`session`, `advanced`) on the `auth` instance from L1. Connect back: Ch 051 L2 *decided* opaque-token-in-cookie with `__Host-`/`SameSite` and server-side revocation; this lesson makes those decisions real and adds the lifetime clocks on top. Preview the end state: a hardened `auth` config plus the exported `SESSION_COOKIE_PREFIX` the proxy (L4) will consume. Keep it to a short paragraph.

### Three clocks, not one: how long a session lives

The conceptual core; teach it **before** any config so the student maps numbers onto a model, not the reverse. The pain point: beginners collapse "expiry," "renewal," and "re-auth for sensitive actions" into a single "timeout" and then can't reason about why a user got logged out, or why "change password" re-prompted. Separate them as three independent clocks on the same `session` row.

- **`expiresIn` — the absolute lifetime.** Hard wall. Past it the session is invalid regardless of activity; user re-authenticates. Persisted on `session.expiresAt`. Library default 7 days; **course default 30 days** for SaaS (state the override explicitly).
- **`updateAge` — the sliding renewal cadence.** While inside `expiresIn`, when an incoming request finds the session older than `updateAge`, the library pushes `expiresAt` out by another full `expiresIn` window. This is what keeps an active user logged in indefinitely without an unbounded cookie. Default 1 day (course keeps it). The trade: shorter = more `UPDATE`s (write amplification on a hot table); longer = an active-but-bursty user can fall off the absolute wall mid-task.
- **`freshAge` — the freshness window for elevation.** A session is "fresh" if its `createdAt` is within `freshAge` (clarify: tied to **creation**, not last activity — this is a real Better Auth semantic and a common surprise). Inside it, high-stakes mutations (change password, change email, disable 2FA, delete account, transfer ownership) proceed; outside it the action layer demands re-authentication. Library default 1 day; **course tightens to 10 minutes** so the re-prompt is frequent for destructive actions. This lesson *configures* the value; the action-side check that reads it is L2 of Ch 054 — name that boundary, do not implement it here.

Mention `disableSessionRefresh` (default false) once as the opt-out for strict-absolute-expiry compliance regimes ("re-login every 24h regardless of activity") — recognition only.

**Diagram (load-bearing).** A horizontal timeline figure separating the three clocks — this is the lesson's centerpiece visual and directly attacks the "three-collapsed-into-one" trap. Recommend **HTML + CSS inside `<Figure>`** (annotated-illustration shape per diagrams INDEX; a single time axis with three labeled bands/markers). Show: a base time axis; an `expiresIn` bar (the outer wall); an `updateAge` tick partway with an arrow showing the wall sliding right on activity; a short `freshAge` band hugging `createdAt` near the origin, shaded as the "elevation-allowed" zone. Caption ties each band to its config key and the course value. Pedagogical goal: the student *sees* that freshness is a tiny window near login while the session as a whole lives for weeks. Keep height compressed (laptop viewport).

After the diagram, the **first comparison table** (the archetype's "expiresIn / updateAge / freshAge" table): columns = knob | what it controls | library default | course default | shorten when… | lengthen when…. This is the durable reference the student returns to.

Terms for `Term` tooltips in this section: **write amplification** (redundant repeated writes to a row, here the session-renewal `UPDATE`); **session fixation** (defined in the rotation section below, not here).

### Rotating the token so a leaked cookie expires fast

Short section, defense-in-depth framing. The opaque token in the cookie is a bearer credential; rotation limits how long a stolen one stays useful. Teach: Better Auth issues a **fresh token on sign-in** (never reuses a pre-auth id — this is the structural answer to session fixation, the threat named conceptually in Ch 051 L2), and the sliding-renewal path can mint a new token, invalidating the old. Frame the senior takeaway: rotation is *why* finite `expiresIn` + active `updateAge` beats one long-lived token — each renewal is a chance to rotate. Do not dive into the rotation-cadence internals; this is conceptual reinforcement, not a config tour. `Term` tooltip: **session fixation** (attacker plants a known session id before login and rides it after).

### Hardening the session cookie

The `advanced` block. Lead with the slogan: the cookie carries an opaque id and nothing secret, but its *attributes* are the structural defense — get them right once and a whole class of attacks is closed. Walk the relevant `advanced` keys, each as default → SaaS call:

- **`useSecureCookies`** — auto-true in production / on HTTPS `baseURL`, relaxes on HTTP localhost. Senior review: confirm production resolves to `true`; dev relaxing `Secure` is expected and fine.
- **`cookiePrefix`** — library default `'better-auth'` yields `better-auth.session_token`. **Course override: `'__Host-better-auth'`.** Explain the `__Host-` prefix as a *browser-enforced* contract (not a Better-Auth feature): the browser only accepts a `__Host-`-prefixed cookie if it is `Secure`, `Path=/`, and has **no `Domain`** — so the prefix makes downgrade/scope-widening attacks impossible by construction. This is the Ch 051 L2 decision realized. Note Better Auth's helpers (and `getSessionCookie` in L4) parse the prefixed name correctly when handed the prefix.
- **`defaultCookieAttributes`** — `sameSite: 'lax'` (the Ch 051 L2 call: blocks cross-site POST CSRF while keeping top-level navigation logins working), `httpOnly: true` (always for the session token — JS can never read it), `path: '/'`. State these are the secure defaults the course locks in.
- **`crossSubDomainCookies`** (`{ enabled, domain }`) — default off. Flip on only when one session must span sibling subdomains (`app.` and `admin.`). **Incompatible with `__Host-` by the cookie spec** (cross-subdomain needs a `Domain` attribute; `__Host-` forbids one) — present this as a genuine fork, not a footnote: you choose the structural `__Host-` lock *or* subdomain sharing, and for a single-origin SaaS you take the lock.

**The `SESSION_COOKIE_PREFIX` export — the forward contract.** This is the one artifact L4 consumes, so it earns explicit treatment here. `lib/auth.ts` exports `SESSION_COOKIE_PREFIX` as a `SCREAMING_SNAKE_CASE` constant whose value matches `advanced.cookiePrefix`, so the proxy's `getSessionCookie(req, { cookiePrefix: SESSION_COOKIE_PREFIX })` (L4) reads the same cookie name the instance writes — single source of truth, no restated literal. Explain the failure it prevents: `getSessionCookie` defaults to `'better-auth.'` and *silently* misses a cookie set under a custom prefix, so a signed-in user looks signed-out to the proxy. Name that L4 wires the read; this lesson only ships the export.

**Code presentation.** Use **`AnnotatedCode`** for the final hardened `betterAuth({ ..., session: {...}, advanced: {...} })` block (the `session` numbers + the `advanced` cookie keys + the exported prefix constant), stepping through: the three `session` numbers, the `cookiePrefix`, the `defaultCookieAttributes`, the exported constant. Color the override lines (e.g. `violet`) so the student sees *which* values diverge from library defaults. Then a **`CodeVariants`** before/after for the dev-vs-prod prefix concern: show the env-conditional that uses `'better-auth'` (or relaxed `Secure`) in dev and `'__Host-better-auth'` in prod — the canonical gotcha is that a `__Host-` cookie can't set on HTTP localhost, so dev must relax. Keep prose under the variants to one paragraph each per the component rule.

`CodeTooltips` candidates on the config block: `__Host-` (browser-enforced prefix requiring Secure + Path=/ + no Domain), `httpOnly` (cookie unreadable from `document.cookie`), `sameSite` (controls whether the cookie rides cross-site requests). `Term` tooltips in prose: **CSRF** (acronym; a logged-in user's browser tricked into firing an authenticated request to your site from another origin), **bearer credential** (any token that grants access merely by being presented, no further proof).

### One DB hit per request, or none: the cookie cache

The single performance reach this chapter takes — frame it exactly that way (the chapter is otherwise feature-minimal). Build the model in two stages to control cognitive load:

1. **Two separate cookies.** First disambiguate: the session **token** cookie (opaque id, non-negotiable) versus the optional session **data** cookie / *cookie cache* (`better-auth.session_data`) holding a signed, serialized copy of `{ user, session }`. Beginners conflate them; make the split explicit before any config.
2. **What enabling it changes.** `session: { cookieCache: { enabled: true, maxAge: 5 * 60 } }`. Inside `maxAge`, `getSession` verifies the cookie signature and deserializes — **zero DB round-trips**; past it, it refetches from the DB and refreshes the cache. Note the read *call shape is identical either way* (the caller can't tell) — that's why L4 can teach one `getSession` shape regardless. The cache payload is signed/tamper-evident; the encoding `strategy` is `compact` by default (`jwt`/`jwe` exist for interop) — name at recognition level, do not tour encodings.

**The trade (this is the teaching weight).** Faster reads vs **delayed propagation of server-side changes**: after an admin revokes a session or a user changes their email/role, the cached cookie keeps serving stale data for up to `maxAge`. Land the two senior consequences verbatim from Code conventions: **authorization decisions live at the action boundary, re-checked against the DB, never in the proxy** (the proxy does cookie-presence gating only); and **credential-mutating actions pass `revokeOtherSessions: true`** to force affected sessions to re-auth rather than trusting the cache to catch up. Name the staleness/source-of-truth bug class: custom `user` fields aren't in the cache unless declared via `additionalFields` (the L2 extension hook) — recognition only.

**Second comparison table** (the archetype's "cookie cache on vs off" table): rows = read latency | DB load per request | revocation latency | best-fit surface | when to shorten `maxAge` | when to disable. Fill it so the student can map a route to a decision: cache **on** for read-heavy identity-aware pages (every load reads the session); **shorten `maxAge`** when revocation latency matters; **off** for surfaces where instant revocation is non-negotiable (admin/billing) *or* rely on the action-boundary re-check + `revokeOtherSessions`.

**Exercise.** A `Buckets` drill, `twoCol`, titled around "cookie cache: leave on, or turn off / shorten?". Chips are concrete surfaces/requirements the student sorts into **Cache on (read-heavy, staleness tolerable)** vs **Cache off or short maxAge (revocation-sensitive)**: e.g. "marketing dashboard that reads the user's name on every page" → on; "admin panel that revokes a teammate's access" → off/short; "public blog index" (no session read at all — decoy framing toward on/irrelevant); "billing settings page mid-plan-change"; "header avatar"; "role-demotion just happened." Grading is the bucket match. Goal: convert the trade table into a reflex. (Custom-build not needed — `Buckets` fits; specify chips so the build agent has them.)

### Reaches this chapter names but doesn't take

Bundle the four deferred power-tools as a single "recognize the name, know the trigger, don't reach yet" section — each is a *conditional* whose threshold hasn't been crossed for an early-stage SaaS, so they belong together as "not yet," not scattered as tips. For each: one line of what it is + the named trigger + where it lands.

- **`secondaryStorage` (Redis/Upstash).** Moves session reads off Postgres into a KV store. Trigger: thousands of session reads/sec where the DB lookup is a *measured* bottleneck. Lands in Ch 074 (same Redis as rate limiting). Senior call for early SaaS: the cookie cache already closes most of the gap — don't reach.
- **The `jwt()` plugin.** Issues JWTs for a *second service* that must verify identity without hitting the auth DB. Trigger: that second service exists. Hard rule: **never replace the browser session cookie with a JWT** — the server-side revocation property from Ch 051 L2 is non-negotiable for browser sessions.
- **`multiSession()`.** Multi-**account** in one browser (Gmail-style switching between `personal@` and `work@`), distinct from multi-**device** (the active-sessions list, which is built-in, no plugin). Full coverage Ch 054 L3.
- **`trustedOrigins`.** The CSRF allowlist; Better Auth refuses to set auth cookies for origins not on it. Defaults to `[baseURL]` — correct for same-origin Next.js. Add a specific origin only for a separate-domain client (mobile webview, extension). Hard rule: **never `['*']`** — that reopens every CSRF vector `SameSite` is closing.

Presentation: a compact list or a small `Card`/`CardGrid`, each card = name + trigger. Optionally a `StateMachineWalker` (`kind="decision"`) titled "Which session reach does this app need?" walking the senior question order — but only if it stays tight (Postgres bottleneck? → second service? → multi-account UX? → cross-origin client?), each leaf naming the tool and reaffirming "default until the trigger." Keep it lightweight; the cards alone suffice if the walker would bloat the page.

`Term` tooltips: **JWT** (signed, self-contained token a service verifies locally without a DB lookup — and therefore can't be revoked server-side before expiry).

### Sign-out is a row deletion

Close the loop on revocation, tying the cookie surface to the lifetime model. `auth.api.signOut` **deletes the `session` row** server-side and clears the cookie via the `nextCookies` plugin (from L1) — the row deletion is *what makes the now-stale cookie harmless*, the concrete payoff of "server-stored opaque token" over a self-contained JWT. Name "sign out everywhere" as deleting every session row for the user (Ch 054 L3 builds the UI). Keep it short — this is the satisfying conceptual close, not a new API tour. Reinforce the through-line: lifetime config decides *when* sessions end on their own; sign-out / revocation decides *that* they can be ended on demand — both rest on the row being the source of truth.

### Common ways this configuration goes wrong

Do **not** make this a generic watch-outs dump — fold each into the concept it qualifies if it reads better, but a short consolidated "these are the field-mistakes" list at the end is acceptable here because they cut across the whole config and serve as a pre-ship review. Source them from the chapter outline + Code conventions, each one line, each tied to the knob:

- `expiresIn` set to 365 days / "forever" for UX — a session that never expires never rotates; pick finite + lean on `updateAge`.
- Cookie cache left on for a destructive-action surface — up-to-`maxAge` staleness collides with the `freshAge` elevation check; force a fresh read at the action boundary (and `revokeOtherSessions` on credential mutations).
- `crossSubDomainCookies` flipped on with `__Host-` configured — the browser silently rejects the cookie (spec conflict).
- `trustedOrigins: ['*']` to "fix" a CORS error — the fix is the specific origin.
- Shipping production with `cookiePrefix: 'better-auth'` instead of `__Host-better-auth` — the structural defense is just missing.
- Assuming the cookie cache updates instantly on a user-data change — email/profile/role/org changes need a session refresh or a `maxAge`-bounded wait.
- Forgetting to export `SESSION_COOKIE_PREFIX` / restating the prefix literal in the proxy — the two drift and `getSessionCookie` silently misses the cookie.

A `TrueFalse` round could land these as a quick self-check (e.g. "A `__Host-` cookie can set on `http://localhost` — T/F"; "Turning on the cookie cache means a revoked session is rejected on the very next request — T/F") — optional, use if it doesn't over-lengthen the page given the `Buckets` exercise already exists. Prefer one strong interaction over two mediocre ones.

### External resources (optional)

One or two `ExternalResource` cards to Better Auth's Sessions and Cookies docs pages for the student who wants the full options surface. Optional.

---

## Scope

**Prerequisite, redefine in one line each (do not re-teach):** opaque-session-token-in-cookie, `__Host-`/`SameSite`/`HttpOnly`, server-side revocation, session fixation, the elevation/step-up idea (all *conceptually* from Ch 051 L1–L2 — this lesson realizes them in config). The `auth` instance, `nextCookies` plugin, `betterAuth({...})` shape, `secret`/`baseURL`, validated env (Ch 052 L1). The four tables, `session.token`/`session.expiresAt`, `additionalFields` as the extension hook, Drizzle adapter (Ch 052 L2). Cookie attribute mechanics at the HTTP level (Ch 051) — name, don't re-derive.

**Out of scope — defer, do not teach:**

- The read path: `auth.api.getSession({ headers })`, `getCurrentUser`/`requireUser`, `React.cache` memoization, the `proxy.ts` gate (all Ch 052 L4). This lesson produces only the `SESSION_COOKIE_PREFIX` export L4 consumes; it must not implement or demo a session read.
- Sign-up/sign-in code that *creates* sessions, password hashing, `useSession`, enumeration discipline (Ch 053).
- The active-sessions list, "sign out everywhere" UI, per-session revocation UI (Ch 054 L3) — named only.
- The `freshAge` *elevation re-prompt flow* and the action-side `requires-re-authentication` check (Ch 054 L2) — this lesson sets the value, the check reads it elsewhere.
- The `authedAction` wrapper / authorization decisions (Ch 057) — only the principle "authz at the action boundary, not the proxy" is stated, not built.
- `secondaryStorage` / Redis wiring (Ch 074); full `jwt` plugin config + key rotation; `multiSession` config — all recognition-level only.
- CSRF/SameSite in depth, the route-handler 401/403 wire shape (Ch 054 L4, Ch 046).
- Rate limiting / brute-force defenses on the cookie surface (Ch 074).
- Secret rotation operations (named in L1; not revisited).
- Cookie-cache `refreshCache` / stateless-mode internals — out of scope (this stack uses DB sessions; the option is a stateless-mode concern).

---

## Notes for downstream agents

- **`freshAge` is creation-relative, not activity-relative**, and the course value is **10 minutes** (Better Auth default is 1 day) — verified against Better Auth docs; do not "correct" it back to the library default.
- Course config **deliberately diverges from Better Auth defaults** (prefix, `expiresIn` 30d, `freshAge` 10m). Make the divergence explicit to the student; do not present these as what you get out of the box.
- Cookie-cache `strategy` values are `compact` (default), `jwt`, `jwe` (all three are current). Keep encodings recognition-level — name `compact` as the default and don't tour the alternatives.
- `crossSubDomainCookies` ⊥ `__Host-` is a **cookie-spec** fact (Domain required vs Domain forbidden), not a Better-Auth quirk — frame it that way.
- Keep this lesson read-path-free; `getSession` and the proxy belong to L4. The only handoff is the exported `SESSION_COOKIE_PREFIX` constant.
