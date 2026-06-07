# Sessions versus JWTs, and the cookie that carries them

- Title (h1): Sessions versus JWTs, and the cookie that carries them
- Sidebar label: Sessions vs JWTs

## Lesson framing

Concept-archetype lesson, second of three in Ch 051's "auth mental model" arc. No Better Auth API, no Drizzle schema, no React/Next code the student types — the student leaves with a *model*, not syntax. Estimated 35–45 min.

The senior question that opens it: authn happens once, at the sign-in click (established in L1). Every later request still needs to answer "who is this?" without re-typing a password. **What travels between browser and server to carry the proven identity, where does it live on each side, and what's the 2026 default for a Next.js SaaS?** The lesson answers: a server-stored opaque session ID in a hardened cookie is the default; a self-contained signed JWT is a conditional reach. Revocation is the load-bearing property that decides between them.

Pedagogical spine — build one mental model, then stress-test it:

1. **"A session is a handle."** This is the single anchoring metaphor. The browser holds a coat-check ticket (opaque ID); the coat (user data, source of truth) stays on the server. Every downstream property — revocation, metadata columns, multi-device, fixation defense — falls out of this one idea. Establish it before any comparison.
2. **The two shapes, side by side.** Opaque-session-in-cookie vs JWT-in-cookie, taught as a *contrast* so each clarifies the other. The student must be able to say what each puts in the cookie, what the server does per request, and what each costs.
3. **Revocation as the decider.** Don't present session-vs-JWT as a balanced toss-up — that's the misframe to kill. Present the trade matrix, then collapse it: for browser-driven SaaS the answer is sessions, *because* revocation is the property you cannot give up, and a JWT denylist re-introduces the exact state JWTs claimed to escape. JWT is the special-case reach (edge reads, service-to-service), not the default.
4. **The cookie that carries the handle.** Ch 013 taught the attribute palette; here the student sees the *specific auth-cookie configuration* the rest of Unit 8 assumes, with each attribute justified by an attack it closes. `__Host-` prefix is the structural enforcement story (the browser refuses a misscope), not a style choice.
5. **The lifecycle + the columns.** Issue / refresh / revoke / expire, plus *why* each non-obvious session-row column earns its weight by pointing at the downstream feature it powers. This is the "stateful is a feature, not a tax" payoff.

Where beginners go wrong (these drive the watch-outs, placed inline in the section that teaches the concept they qualify, never bundled at the end):

- "Stateless is modern, so JWT" — reaching for JWT by fashion, then paying the revocation cost via a denylist anyway.
- "The cookie exists, so they're authenticated" (carried from L1) — sharpened here: a *stolen* `HttpOnly` cookie is still a valid session until revoked; that's *why* revocation and short-ish lifetimes matter.
- Putting the user's role/email *in* the cookie (JWT claims) and trusting it at the action boundary — stale capabilities. The action boundary re-reads from the DB. (Seed for Ch 057.)
- `localStorage` for tokens — re-opens the XSS exfiltration line Ch 016 already drew.
- `===` on raw token bytes in hand-rolled code instead of constant-time compare.

The mental model the student should end with: *the cookie is a tamper-evident pointer to a server-side row; the server owns the truth and can erase it in one statement; the cookie is hardened so the browser enforces its scope and JS can't touch it.* They should be able to (a) explain why sessions beat JWTs for this stack in one sentence about revocation, (b) read an auth-cookie's attributes and name what each prevents, (c) name what's on a session row and why, (d) describe issue→refresh→revoke→expire.

Visual budget (this is a concept lesson — diagrams earn their weight, don't over-decorate): one comparison table (session vs JWT), one scrubbable sequence (sign-in → cookie set → next request → revoke) via `DiagramSequence`, one small annotated illustration of the cookie name/attributes via `Figure`+HTML/CSS. Two checks-for-understanding: a `Buckets` sort and a short `Sequence`/`MultipleChoice`. No live-coding — there's no runnable surface here, and `ReactCoding` can't load auth libs (and we're teaching no API anyway).

Tone: adult, terse, senior-framed. No celebratory scaffolding. Lead every subsection with the decision or the stakes.

## Lesson sections

### Introduction (no heading)

Warm, brief, ~2 short paragraphs. Reconnect to L1: "Last lesson, authn proved *who* — once, at sign-in. But HTTP is stateless; the next request arrives with no memory of that proof." State the problem concretely: re-typing a password on every click is absurd, so something must carry the proven identity forward. Name the two candidate shapes (server-stored session ID, self-contained JWT) and the one question that picks between them (revocation), and promise the cookie discipline that any browser choice inherits. Preview the end state: "you'll read Better Auth's cookie and session config in Ch 052 and know exactly what every value means." Name Better Auth once as "what implements this in Unit 8" — no API.

### A session is a handle, not the data

Install the anchoring metaphor first, before any comparison. A session is a *server-side record*: "this opaque ID maps to user X, created at T, last-used at U, expires at E, seen on this device." The browser holds **only the opaque ID** — never the user data. Each request presents the ID; the server looks it up; the request runs as the mapped user.

Senior framing to state explicitly: *the session is a handle; the source of truth lives on the server.* Use the coat-check ticket analogy (ticket = opaque ID in the cookie; coat = the row on the server). The point of the analogy: you can rip up the coat-check stub from the server side (revocation) and the ticket becomes worthless instantly.

Small `Figure` (HTML/CSS or `ArrowDiagram`) — two boxes: **Browser** holding `__Host-session = a8f3…` (just an opaque string), **Server** holding the full row `{ id, userId, expiresAt, lastActiveAt, … }`, an arrow labeled "presents ID on every request" one way and "looks up → User | null" back. Pedagogical goal: cement *where each piece lives* — the asymmetry is the whole lesson. Keep it horizontal, compact.

Terms (`Term`): **opaque** (the ID carries no readable meaning — it's a random lookup key, not encoded data); **CSPRNG** (cryptographically secure pseudo-random number generator — unguessable randomness, vs `Math.random`).

### The two shapes: opaque session vs JWT

Teach the contrast head-on. Two subsections, then the table, then the verdict subsection.

#### Server-stored opaque sessions

The 2026 default for browser-driven SaaS. The cookie carries a random unguessable token (e.g. `crypto.randomUUID()` — 122 bits — or 32 bytes from `crypto.getRandomValues()`) that is the primary key of a `session` row. The server validates every protected request with an indexed lookup (`SELECT … WHERE token = ?`). Properties to land: instant revocation (delete the row), arbitrary metadata lives on the row, ~1–3 ms indexed lookup per request on a warm pool, **stateful by definition** — framed as a feature, not a cost. This is Better Auth's default and the path the rest of Unit 8 takes.

Tiny `Code` block (conceptual, marked not-real-API per the L1 convention) showing the *idea* only: a cookie value `a8f3c1…` and a one-line pseudo-lookup `findSession(token) -> { userId, expiresAt }`. Do not present real Better Auth or Drizzle calls.

#### Self-contained JWTs

The conditional alternative. The cookie carries a JSON payload `{ sub, iat, exp, … }` signed with the server's secret (HS256) or a private key (RS256/EdDSA). The server validates by verifying the signature and `exp` — **no database read**. Properties: faster per-request validation (no I/O), portable across services (same token authenticates a separate API), **no instant revocation** (valid until `exp` unless a denylist is bolted on — which re-introduces the per-request DB read), and the payload is *readable by anyone holding the cookie* (signed ≠ encrypted; it's tamper-evident, not secret).

Show the structure with a `Figure` containing the three dot-separated JWT segments `header.payload.signature`, each color-segmented, with a callout: "payload is base64url — decode it and you read every claim; the signature only proves it wasn't *changed*." Pedagogical goal: kill the "JWT is encrypted/secret" misconception that drives people to stuff secrets in claims.

Term: **JWT** (JSON Web Token — a signed, self-describing token; "jot"); **claim** (a key/value statement inside the payload, e.g. `sub` = subject = user id); **signed vs encrypted** (signing proves integrity/authenticity; it does *not* hide the contents).

State the threshold (trigger-before-tool, per pedagogy): JWTs earn their place at **edge-rendered routes** or **service-to-service calls** where the DB round-trip per request is the measured bottleneck *and* revocation can be eventual (short 5–15 min access tokens + refresh-token rotation). This is the "JWT-shaped sessions as the threshold tool for stateless edge reads" thread from the chapter framing — name it as the exception, explicitly not the browser-session default.

#### The comparison table

A `<table>` (markdown) — the chapter framing calls for this and it earns its weight. Rows: *What's in the cookie* / *Per-request server work* / *Revocation* / *Metadata (last-seen, device, org)* / *Payload visibility* / *Cross-service portability* / *Statefulness* / *2026 default for browser SaaS?*. Columns: **Opaque session** / **JWT**. Keep cells terse. The revocation row is the one that decides — consider bolding it. This table is the reference the student returns to; make it scannable.

#### Why sessions win for this stack

Collapse the matrix. Don't leave it balanced — the senior call is decisive. Revocation is what you trade when you pick JWT, and for a SaaS you cannot trade it: "sign me out everywhere," "this account is compromised, kill it now," "this stolen cookie must stop working this second" are each *one* `DELETE` with sessions and *impossible* with a pure JWT. Add a denylist to get revocation back and you've re-introduced the per-request DB read — the stateless advantage is gone, and you now maintain two systems. The 2026 default for browser-driven SaaS is sessions, period; JWT is the special-case reach.

Name the **hybrid** once and wave it off correctly: short-lived access JWT (5–15 min) for fast reads + server-side refresh token for revocation. The senior call for early-stage SaaS: *don't reach for it yet* — the operational overhead of refresh-token rotation doesn't pay off until the DB round-trip is a measured bottleneck. (Defaults-before-conditionals.)

Inline watch-out here: "Reaching for JWT because *stateless is modern*" — the revocation bill comes due eventually; paying it with session rows is cheaper than with a denylist.

**Exercise — `Buckets` (two columns).** Title: "Which shape fits?" Sort scenario chips into **Opaque session (default)** vs **JWT (special case)**. Chips: "A user clicks Sign out everywhere" (session), "Edge middleware reads identity with no DB nearby" (JWT), "Support needs to instantly kill a compromised account" (session), "A separate analytics service must trust the same token" (JWT), "Settings → show my active devices with revoke buttons" (session), "Browser session for a typical Next.js SaaS" (session). Goal: rehearse the trade matrix as a decision, not trivia. Grading: chip→bucket exact match.

### The cookie carries the handle

Pivot: the opaque ID has to *ride* between browser and server safely. Ch 013 taught the attribute palette generically; here is the **specific auth-cookie configuration** the rest of Unit 8 assumes, each attribute justified by the attack it closes. Open with a concise re-statement (one sentence) that a Set-Cookie response header writes the cookie and the browser returns it on matching requests — prerequisite refresher, not a re-teach.

Lead visual: a `Figure` with an annotated illustration (HTML/CSS) of the full cookie string, callouts pointing at each part:

```
__Host-session=a8f3c1…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```

Then prose, one short item per attribute (these are teaching points, not a bundled tips list — each is the *why* for a piece of the cookie shown above):

- **`__Host-` prefix** (`__Host-session`) — the browser *enforces* `Secure`, `Path=/`, and *rejects* any `Domain=` attribute at set time. The structural-enforcement framing: this moves "is the cookie scoped tightly?" from "the dev remembered" to "the browser refused to accept a misscope." Lead with this — it's the senior-flavored part.
- **`HttpOnly`** — `document.cookie` can't read it. XSS that runs arbitrary script still can't exfiltrate the session token. Non-negotiable for auth cookies. (Connect back to the `localStorage` anti-pattern from Ch 016: that's exactly the protection `localStorage` lacks.)
- **`Secure`** — HTTPS-only transport. Implied by `__Host-` but stated, because dev/preview may relax it and production never does.
- **`SameSite=Lax`** — sent on top-level navigations, withheld on cross-site `POST`s — the default CSRF mitigation for the Server Action surface. Explain why not the neighbors: `Strict` breaks sign-in-from-an-email-link (user clicks the link, lands logged-out); `None` re-opens CSRF and is only for third-party embeds this SaaS doesn't have. Defer full CSRF to Ch 054 (one line).
- **`Path=/`** — implied by `__Host-`; sent on every same-origin request.
- **Expiration / `Max-Age`** — session lifetime with sliding renewal on use. Persistent vs session-only is a UX call; a "remember me" toggle controls `Max-Age`.

State the concrete project defaults so this lesson and Unit 8 don't drift (sourced from code conventions): `expiresIn` 30 days, sliding `updateAge` ~1 day; cookie flags `HttpOnly; Secure; SameSite=Lax; Path=/` under the `__Host-` prefix; dev/preview may relax `Secure`, production never. Mention `freshAge` (~10 min) only as a forward-pointer: a *second*, shorter freshness clock that high-stakes actions check — full coverage in Ch 054. Do not implement it.

Terms: **`__Host-` prefix** (cookie-name prefix the browser treats as a contract: must be `Secure`, `Path=/`, no `Domain`); **CSRF** (cross-site request forgery — a malicious site triggering an authenticated request from the victim's browser); **`SameSite`** (controls whether the cookie rides cross-site requests).

Inline watch-out: using a non-`__Host-` name and forgetting `Secure` in prod — the prefix is the structural guarantee, not a style preference.

### Token entropy and constant-time comparison

Short, sharp section — two related safety properties of the token itself.

**Entropy.** The token must be unguessable to a network attacker: ≥128 bits from a CSPRNG. `crypto.randomUUID()` (122 bits in a v4 UUID) is fine; 32 bytes from `crypto.getRandomValues()` (taught Ch 016 L1) is more. The point: this is a *secret*, sized like one — never a sequential id, never `Math.random()`.

**Constant-time compare.** When verifying a presented token against the stored one, compare in constant time, not with `===` on raw bytes — naive comparison short-circuits on the first mismatched byte and leaks length/prefix info through timing. Connect to Ch 016 L1's constant-time compare. Senior reflex framing: the library does this by default; *you recognize it when reviewing hand-rolled auth.* (This is a review skill, not something the student codes here.)

Term: **timing attack** (inferring a secret from how long a comparison takes); **constant-time compare** (comparison whose duration doesn't depend on where the inputs differ).

Inline watch-out: comparing session tokens with `===` instead of a constant-time compare in any custom path.

### What lives on the session row

The "stateful is a feature" payoff. Beyond the minimum `(id, userId, expiresAt)`, each extra column earns its weight by powering a concrete downstream feature — teach each column *paired with its feature*, so the student sees metadata as leverage, not bloat:

- **`lastActiveAt`** — the "last seen 3 hours ago" UI (Ch 054 L3) and idle-timeout policies.
- **`userAgent` / `ipAddress`** — the active-sessions list (Ch 054 L3) and anomaly / takeover detection ("new device signed in").
- **`activeOrganizationId`** — the multi-tenancy hook (Unit 9): the session remembers *which org's data* to show.
- **`impersonatedBy`** — admin support reach; name it, don't build it.

Be explicit that the *full Drizzle schema is Ch 052 L2* — this lesson names the columns and the *why*, not the DDL. Present as a compact annotated list or a two-column `Figure` (column → what it powers). Reinforce the anchor: only opaque-session shape *can* carry this metadata cheaply; a JWT would bloat the cookie and still couldn't be revoked.

Tie-off the contrast with the storage anti-pattern (inline, as the *why* for keeping the cookie opaque): putting user data (email, role) *in* the cookie — whether as JWT claims or otherwise — breaks single-source-of-truth and lets a stale cookie show stale data / act with stale capabilities after a server-side change. The action boundary always re-reads from the DB for authz (seed for Ch 057). This is where the "trusting a JWT's role claim" watch-out lives.

### The session lifecycle: issue, refresh, revoke, expire

The dynamic model — what happens to the row and the cookie over time. Teach the four verbs, then the fixation defense, then multi-device, anchored by one scrubbable diagram.

Four verbs:

- **Issue** — on successful authentication: insert row, Set-Cookie with the opaque ID.
- **Refresh** — on activity: update `lastActiveAt`, optionally rotate the token on a cadence (defense-in-depth vs fixation; Better Auth rotates on a configurable schedule, ~24h default). Stress: rotate *on a cadence*, **not on every request** — per-request rotation breaks concurrent tabs and the multi-device model (race conditions).
- **Revoke** — on sign-out, password change, or admin action: delete the row; the next request from the stale cookie fails authn cleanly and gets bounced to sign-in. This is the revocation property made concrete.
- **Expire** — by `expiresAt`: the server treats expired rows as absent (`WHERE expires_at > now()`); a sweep prevents stale-row accumulation.

**`DiagramSequence`** — the load-bearing visual the chapter framing asked for ("sign-in → cookie set → next request"), extended through revoke. Steps (each a compact two-actor Browser↔Server panel, reuse the handle illustration style):

1. **Issue** — Browser POSTs credentials; Server verifies, inserts session row, responds with `Set-Cookie: __Host-session=…`.
2. **Authenticated request** — Browser auto-sends the cookie; Server does the indexed lookup → finds the row → request runs as user X.
3. **Refresh** — same as step 2, plus Server bumps `lastActiveAt` (and rotates the token on its cadence).
4. **Revoke** — user clicks "Sign out everywhere" / admin kills the account; Server `DELETE`s the row(s).
5. **Stale cookie** — Browser still holds the (now worthless) cookie, sends it; Server lookup → *no row* → 401, redirect to sign-in.

Pedagogical goal: make the abstract "handle + server truth" model *move*, and show revocation's instantaneity viscerally (step 4 → step 5: the cookie is unchanged but already dead). Per-step captions carry the prose. (Use `DiagramSequence`, not Mermaid sequence — the scrub-to-reveal pacing suits a 5-beat story better and lets each step show the row state, and it provides its own card.)

**Session fixation** (subsection or tight inline block within lifecycle): the attack — an attacker plants/ races a known session ID into the victim's browser *before* sign-in, so after sign-in the attacker's cookie is the authenticated one. The defense — **regenerate the token at sign-in**; never reuse a pre-auth ID for the post-auth session. Better Auth issues a fresh token on sign-in; the student recognizes the pattern when reviewing hand-rolled auth. Term: **session fixation**.

**Multi-device** (tight inline block): each browser/device gets its own row. "Settings → Security" reads `WHERE userId = ? ORDER BY lastActiveAt DESC` to list devices with revoke buttons (Ch 054 L3); "sign out everywhere" is `DELETE WHERE userId = ?`. The model is simple *because* sessions are stateful — call back to the anchor one last time. Do not implement; this names the shape.

**Exercise — `Sequence` (ordering) or `MultipleChoice`.** Prefer a `Sequence` that orders the issue→authenticated→refresh→revoke→stale-cookie-rejected lifecycle (reinforces the diagram from memory). Alternatively/additionally a single `MultipleChoice`: "A user reports their laptop was stolen and they want every session killed *now*. Why does the opaque-session design make this trivial where a pure-JWT design can't?" with the correct answer naming row-deletion vs token-valid-until-exp, and distractors capturing the common misframes (e.g. "JWTs can be deleted from the server" — false; "change the signing secret" — nukes *everyone*, wrong tool). Goal: confirm the revocation mental model landed.

### Where this cookie gets read (forward map)

Brief closing orientation — not new mechanics, a map of where the model resurfaces in Unit 8 so the student reads Ch 052/054 with anticipation. Same cookie, same lookup, same `User | null` result; only *where* the lookup happens and *what the caller does* with the answer differ:

- **`proxy.ts` middleware** (Next.js 16; `proxy.ts`, formerly `middleware.ts`) — runs before render; cheap **cookie-presence** check to bounce signed-out users to `/sign-in`. Crucial nuance to plant (don't fully teach): the proxy does *presence* gating, **not** real validation or authorization — there's a short cookie-cache window where it could read a stale session, so real authz lives at the action boundary. (Seed for Ch 054 L1 + Ch 057.)
- **Layouts / Server Components** — read the session to drive identity-dependent UI (Ch 052 L4).
- **Server Actions / route handlers** — read on every mutating call to enforce identity at the action boundary.

Keep this to a short list with one line each. End by restating the through-line in one sentence: the cookie is a hardened, tamper-evident pointer to a server row the server can erase at will — that single fact is why this stack chooses sessions, and why every read above is just a lookup away from `User | null`.

Optional `ExternalResource` LinkCards (max two, only if they're current and authoritative): MDN Set-Cookie / cookie prefixes reference; OWASP Session Management Cheat Sheet. Verify currency in the fact-check step before including.

## Scope

Prerequisites to *redefine in one line each* (taught earlier, do not re-teach): cookies and the Set-Cookie/attribute palette (Ch 013); `HttpOnly`/`localStorage` XSS line and Web Crypto CSPRNG + constant-time compare (Ch 016); Server Actions, `proxy.ts`/middleware, the `Result` discriminated union (Ch 033/034/043); authn vs authz, identification vs authentication, 401 vs 403, the three principal states, "the button is UX, the action is security" (Ch 051 L1, the immediately prior lesson — assume it cold).

This lesson does **not** cover (defer, do not teach):

- The Drizzle schema for `user` / `session` / `account` / `verification` — names columns and *why*, but no DDL, no `pgTable`, no cascades. (Ch 052 L2.)
- The `auth.api.getSession({ headers })` call shape and the `getCurrentUser`/`requireUser` helpers across the five surfaces. (Ch 052 L4.)
- Any Better Auth API, config object, or plugin call. Better Auth is named *once* as "what implements this in Unit 8." (Ch 052+.)
- The production proxy gate — matcher design, `?next=` round-trip, open-redirect closure, inverse gate. (Ch 054 L1.)
- Credential-mutation flows, `revokeOtherSessions`, the `freshAge` elevation re-prompt, `'requires-re-authentication'`. `freshAge` is named once as a forward-pointer only. (Ch 054 L2.)
- The active-sessions UI implementation — `listSessions`, device/location parsing, the revoke trio, the cookie-cache staleness window in depth. Named as the *feature* the columns power, not built. (Ch 054 L3.)
- The OAuth code-for-tokens exchange and PKCE. (Ch 051 L3, the next lesson.)
- Password hashing parameters and credential storage (Ch 053 L1); rate limiting / brute-force (Ch 074); CSRF in depth and the `dangerouslySetInnerHTML` opt-out (Ch 054 L4); RBAC roles and the `authedAction` wrapper (Ch 057) — each named in one line at most where it's the natural forward-pointer, never taught.
- Cookie attribute *mechanics* (how Set-Cookie parses, `Domain`/`Path` matching rules) — taught Ch 013; here only the *auth-specific configuration* and the *why* per attribute.

## Notes for downstream agents

- All code in this lesson is **conceptual sketch**, explicitly marked not-real-API (same convention L1 used: `findSession(token)`, illustrative cookie strings). This is deliberate — no Better Auth / Drizzle / Next call appears until Ch 052. Do not "upgrade" sketches to real API.
- Canonical project cookie defaults to hold exact (from code conventions, so L2 and Unit 8 don't drift): `__Host-` prefix, `HttpOnly; Secure; SameSite=Lax; Path=/`, `expiresIn` 30 days, `updateAge` ~1 day, `freshAge` ~10 min (forward-ref only). Production never relaxes `Secure`; dev/preview may.
- Keep the "session is a handle" metaphor as the single spine; every section should be able to point back to it.
- Don't let session-vs-JWT read as balanced. The verdict is sessions-for-browser-SaaS; JWT is the named exception. Revocation is the hinge.
