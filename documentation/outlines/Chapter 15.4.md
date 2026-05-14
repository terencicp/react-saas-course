# Chapter 15.4 — Project: Upstash rate limit on auth endpoints

## Chapter framing

Chapter 15.4 cashes in 15.3 — the public-URL-plus-auth trigger (15.3.1), the Upstash primitives and sliding-window default (15.3.2), the three module-scope limiters, dual-keying, `RateLimit-*` headers, user-safe 429 body, fail-open policy, and the Better-Auth-built-in replacement (15.3.3) — as one runnable surface on the 9.5 email+password auth flows. The student writes `lib/rate-limit.ts` (three module-scope `Ratelimit` instances), `lib/keys.ts` (`getClientIp`, `normalizeEmail`), `safeLimit(limiter, key)` (fail-open wrapper), `rateLimitHeaders(result)` (IETF-draft headers), and wraps sign-in / sign-up / reset at the action seam — sign-in with per-IP **and** per-email dual gates. Better Auth's built-in limiter is turned off. Each build closes runnable: 15.4.3 ends with limiters declared and the inspector's "Remaining tokens" panel live; 15.4.4 ends with the three endpoints wrapped and 429s firing with correct headers and body; 15.4.5 walks "Done when" against the inspector and the Upstash dashboard.

Threads through every lesson: the limiter is a named seam — call sites import from `lib/rate-limit.ts`, never construct inline; module-scope declaration is load-bearing (the in-memory `ephemeralCache` only survives across hot invocations when the instance is reused); sign-in runs two `limit()` calls — `ip:<addr>` and `email:<normalized>`, both must pass, cheaper first; gating runs **before** the password hash and the database lookup; the 429 body is identical regardless of which gate tripped (no information leak); `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every response, `Retry-After` added on rejection; `pending` analytics handed to `after()` (from `next/server`) so the user response is not blocked; `safeLimit` wraps every `limit()` call so a Redis outage logs a structured event and fail-opens on the auth path; Better Auth's built-in `rateLimit: { enabled: false }` — replacing the in-memory limiter with the application-level limiter is the architectural point; the inspector's "Spam X" buttons hammer endpoints deterministically so the 11th-as-429-with-headers is the on-page reading every verify step uses.

### Dependency carry-in

- **From 9.5:** Better Auth catch-all at `app/api/auth/[...all]/route.ts`; the `auth` instance in `src/lib/auth.ts` with email+password, verification, reset; `sendVerificationEmail` / `sendResetPasswordEmail` wired to `lib/email.ts` (mocked — bumps `MOCK_EMAIL_SENT_COUNT`); `proxy.ts` gate; `/dashboard`; sign-out action; seeded `alice@example.com` with a known password.
- **From 9.3.1 / 9.3.2 / 9.3.4:** `auth.api.signUpEmail`, `auth.api.signInEmail`, `auth.api.forgetPassword` — the student wraps these at the action boundary.
- **From 15.3.1:** the public-URL-plus-auth trigger; two-layer architecture (edge WAF + application limiter); fail-open-on-auth policy.
- **From 15.3.2:** `Redis.fromEnv()`; the `Ratelimit` constructor (`redis`, `limiter`, `prefix`, `analytics`); `Ratelimit.slidingWindow(max, window)`; `{ success, limit, remaining, reset, pending }` shape; IETF `RateLimit-*` headers; module-scope rule; `ephemeralCache`.
- **From 15.3.3:** dual-keying (`ip:` and `email:` prefixes through one limiter); gate-before-work; user-safe 429 body; `safeLimit` fail-open; Better-Auth-built-in replacement; `getClientIp`; `normalizeEmail` (trim + lowercase, no `+` strip).
- **From 1.4.5:** `env.ts` with Zod-validated env — extended with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **From 7.2 + 7.6:** Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`.
- **From 2.9:** `RateLimitError` subclass (`RATE_LIMITED`).
- **From 20.1 (foreshadowed):** structured log shape `{ event: 'rate_limit_rejected' | 'rate_limit_unavailable', limiter, key, remaining, reset }`.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided (no cache changes from 9.5)
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
                                #           RESEND_API_KEY, APP_URL,
                                #           UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
package.json                    # provided: db:migrate, db:seed, dev, build
scripts/
  seed.ts                       # provided: alice@example.com (verified) with known password,
                                #           bob@example.com (verified) with known password,
                                #           eve@example.com seeded for the password-reset target
src/
  env.ts                        # provided: Zod-validated env — TODO student adds the two
                                #           Upstash entries to the schema
  db/
    schema.ts                   # provided: Better Auth's four core tables (user, session,
                                #           account, verification)
    client.ts                   # provided
  lib/
    auth.ts                     # provided from 9.5; TODO student disables the built-in
                                #           rateLimit and exports the three endpoint wrappers
    auth-client.ts              # provided
    email.ts                    # provided: mocked in inspector mode — bumps
                                #           MOCK_EMAIL_SENT_COUNT for the reset-email check
    redis.ts                    # TODO student: Redis.fromEnv() one-liner
    rate-limit.ts               # TODO student: three Ratelimit instances + types
    keys.ts                     # TODO student: getClientIp + normalizeEmail helpers
    safe-limit.ts               # TODO student: try/catch wrapper, fail-open helper,
                                #           structured-log line
    rate-limit-headers.ts       # TODO student: rateLimitHeaders(result) helper
    errors.ts                   # provided: RateLimitError subclass extending BaseError (2.9)
  app/
    (public)/
      sign-in/page.tsx          # provided shell from 9.5 (form posts to the action below)
      sign-up/page.tsx          # provided shell
      reset/page.tsx            # provided shell
    actions/
      sign-in.ts                # provided shell from 9.5; TODO student wraps with dual-keying
      sign-up.ts                # provided shell; TODO student wraps with per-IP
      reset.ts                  # provided shell; TODO student wraps with per-IP + per-email
    api/
      auth/[...all]/route.ts    # provided: Better Auth catch-all (the student does NOT
                                #           wrap this — the route handler stays a thin
                                #           passthrough; limits land at the action seam
                                #           that calls auth.api.* directly)
    inspector/page.tsx          # provided: three "Spam X" buttons, per-limiter remaining
                                #           tokens panel, recent-responses log (status +
                                #           RateLimit-* headers), force-redis-down toggle,
                                #           Upstash-dashboard link, reset-counters action,
                                #           manual "send 11 in a row" runner
```

### Reference solution signatures lessons display

- **Redis client** (`src/lib/redis.ts`): `export const redis = Redis.fromEnv();` — one line. The `env.ts` validation ensures the URL/token exist before this module loads.
- **Three limiters** (`src/lib/rate-limit.ts`), all at module scope, all with `analytics: true` and per-limiter `ephemeralCache: new Map()`:
  - `signInLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:signin', ... })`.
  - `signUpLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'rl:signup', ... })`.
  - `resetLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '15 m'), prefix: 'rl:reset', ... })`.
  - Distinct prefixes namespace keys in Redis.
- **Key parse helpers** (`src/lib/keys.ts`):
  - `getClientIp(headers: Headers): string` — read `x-forwarded-for`, split on `,`, trim, return first; fall back to `x-real-ip`; fall back to `'unknown'`. Trust boundary noted in prose.
  - `normalizeEmail(email: string): string` — `email.trim().toLowerCase()`. No `+`-alias stripping (15.3.3).
- **Safe-limit wrapper** (`src/lib/safe-limit.ts`):
  - `safeLimit(limiter, key): Promise<RatelimitResponse>` — `try { return await limiter.limit(key); } catch (err) { logRateLimit({ event: 'rate_limit_unavailable', limiter: limiter.prefix, key }); return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }; }`.
  - The fail-open policy is the one-place decision; flipping to fail-closed is a one-line change here.
- **Header helpers** (`src/lib/rate-limit-headers.ts`):
  - `rateLimitHeaders(result)` — returns `{ 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset' }` (Reset as delta-seconds via `Math.ceil((result.reset - Date.now()) / 1000)`).
  - `rateLimitedResponse(result): Response` — status 429, the three headers plus `Retry-After: <delta-seconds>`, body `{"error":"Too many attempts. Please try again later."}`. Identical body regardless of gate.
- **Sign-in action** (`src/app/actions/sign-in.ts`): `signInAction(formData): Promise<Response>` — Zod parse; resolve `ip` and `email`; `ipLimit = await safeLimit(signInLimiter, 'ip:' + ip)`; return `rateLimitedResponse(ipLimit)` on `!success`; same for `emailLimit = await safeLimit(signInLimiter, 'email:' + email)`; call `auth.api.signInEmail`; on success build `Response` and merge `rateLimitHeaders(ipLimit)`. `after(ipLimit.pending)` and `after(emailLimit.pending)` flush analytics off-path (Next.js 16 `after()` from `next/server`).
- **Sign-up action** (`src/app/actions/sign-up.ts`): one `safeLimit(signUpLimiter, 'ip:' + ip)` gate, then `auth.api.signUpEmail`. Per-IP only — the email is the attacker's choice (15.3.3).
- **Reset action** (`src/app/actions/reset.ts`): `safeLimit(resetLimiter, 'ip:' + ip)` then `safeLimit(resetLimiter, 'email:' + email)`; the per-email gate protects victim's inbox + Resend cost. Calls `auth.api.forgetPassword` on success.
- **Better Auth built-in disabled** (`src/lib/auth.ts`): inside `betterAuth({...})`, set `rateLimit: { enabled: false }`. Application-level limiters at the action boundary are the one place.
- **`env.ts` extension:** `UPSTASH_REDIS_REST_URL: z.string().url()`, `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)`. Boot fails fast on missing vars.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for every "Done when" clause. Server-side reads from Upstash; refreshes on submit via `router.refresh()` and posts via Server Actions.

- **Header:** session-user switcher (`alice` / `bob` / unauthenticated), "Reset Upstash counters" Server Action (calls `redis.del('rl:signin:ip:*', 'rl:signin:email:*', 'rl:signup:ip:*', 'rl:reset:ip:*', 'rl:reset:email:*')` via the pipeline; the starter provides a `clearLimiterKeys()` helper because Upstash REST doesn't ship `SCAN` out of the box — the inspector tracks the keys it touched in a local `seen-keys` Redis set and deletes from there).
- **Per-limiter "Remaining tokens" panel:** three live readouts — for `rl:signin` (per-IP **and** per-email rows for the active inspector session), `rl:signup` (per-IP), `rl:reset` (per-IP and per-email). Each row shows `prefix`, `key`, `remaining`, `limit`, `reset` (as a countdown). The data is read by calling `limiter.getRemaining(key)` on each on render — a no-cost diagnostic call that does not consume budget.
- **"Spam sign-in" button:** posts a Server Action that runs `signInAction` 11 times in a tight loop against the active inspector identity (a known wrong password against `alice@example.com`). The response of each call (status + the four headers + body) is captured into the recent-responses log.
- **"Spam sign-up" button:** same shape; posts to `signUpAction` 6 times with random-suffix emails so the per-email check is irrelevant (per-IP is the gate).
- **"Spam reset" button:** same shape; posts to `resetAction` 4 times against `eve@example.com` so the per-email gate is the one that trips on the 4th call.
- **Single-step "Send one" buttons:** for each endpoint, a non-spamming "send one" button — used in the verify lesson to walk request 1 to request 11 individually and read the `RateLimit-Remaining` count down by one each time.
- **Recent-responses log:** a tail of the last 20 endpoint calls — `endpoint`, `status`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (countdown), `Retry-After` (when present), body (truncated). The recent calls show the `RateLimit-Remaining` count declining and the 11th flipping to 429.
- **"Force Upstash down" toggle:** when on, the starter's `lib/redis.ts` swap returns a mocked client whose `limit()`-shaped operations throw `UpstashConnectionError`. The toggle verifies the `safeLimit` fail-open path — every endpoint logs `rate_limit_unavailable` and lets the request through. The structured-log tail (below) is the on-page reading.
- **Structured-log tail:** a Server Component panel reading the last 20 lines from a starter-provided `rate_limit_log` table (the `safeLimit` helper writes a row `{ event, limiter, key, remaining, reset, firedAt }` next to each call). The tail is the operator-honest surface from 15.3.3 — the body of the 429 is opaque, the log is the diagnosis.
- **"Misuse" toggles (for the failure-mode demos):**
  - **"Gate after work" toggle** — when on, the sign-in action runs `auth.api.signInEmail` **before** the `safeLimit` calls. The inspector's spam runner shows the password-hash cost paid on every request even after the gate would have tripped; the senior call from 15.3.3.
  - **"Disable per-email gate" toggle** — when on, the sign-in action skips the `email:` `limit()` call. The inspector's reproducer (10 wrong passwords from one IP, then a single attempt from a different IP against the same email — the second IP repeated 10 times) demonstrates the credential-stuffing-across-IPs vector the dual gate exists to close.
  - **"Distinct 429 bodies" toggle** — when on, the rejection body says `"Email rate-limited"` vs. `"IP rate-limited"`. The inspector surfaces the information leak.
- **Upstash dashboard panel:** a deep link to the project's Upstash dashboard (the URL is the env-derived REST URL converted to the console URL). The verify lesson walks this surface to confirm the analytics keys.

The inspector is provided in full; the student writes only `redis.ts`, `rate-limit.ts`, `keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`, and the three action wrappers.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| 11th sign-in request from the same IP in 1 min returns 429 | "Spam sign-in" against `alice`. Recent-responses log: requests 1-10 return 401 (Better Auth — wrong password) with `RateLimit-Remaining` counting from 9 down to 0; request 11 returns 429 with `RateLimit-Remaining: 0` and `Retry-After: <≤60>`. |
| Same email from a different IP also gets throttled separately on the per-email gate | Set inspector "Force x-forwarded-for" to a different value; run "Send one" against `alice` 10 times. The per-IP gate stays fresh (new IP), the per-email gate counts down (same `alice@example.com`); the 11th from this second IP returns 429 with `RateLimit-Remaining: 0` on the `email:` gate. The per-email gate caught the cross-IP pattern. |
| Response includes `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` | Every entry in the recent-responses log shows all three; the 429 entries additionally show `Retry-After`. |
| 429 body is user-safe and identical | Every 429 body in the log reads `{ "error": "Too many attempts. Please try again later." }` — no "email" or "IP" wording. Toggle "Distinct 429 bodies" on; rerun; the leaky variants appear; toggle off. |
| Window resets release tokens | After the 11th 429 on sign-in, wait until `Retry-After` reaches 0 (or click "Reset Upstash counters"); send one — returns 401 again with `RateLimit-Remaining: 9` (fresh window). |
| Upstash dashboard shows the keys | Click the dashboard link; navigate to the Data Browser; filter by prefix `rl:signin`; rows for `rl:signin:ip:<addr>` and `rl:signin:email:alice@example.com` are present with TTLs ≤ 60 seconds. Analytics tab shows the rejection blip. |
| Sign-up rate-limited per-IP | "Spam sign-up" with 6 random-suffix emails; request 6 returns 429; the 5 successes use 5 different emails so per-email could not have been the gate. |
| Reset rate-limited per-IP and per-email | "Spam reset" against `eve@example.com` 4 times; request 4 returns 429 — read the log line to confirm `limiter: 'reset'`, `key: 'email:eve@example.com'`. Then switch IP, run again against `eve` once — still 429 on the per-email gate. |
| Gate runs before the password hash | Toggle "Gate after work" on; rerun "Spam sign-in"; observe the action's timing (log line records `verify_ms` from a starter-provided timer) — every request pays the hash cost even after the budget is exhausted. Toggle off; rerun; the 11th-and-later requests skip the hash entirely (verify_ms ≈ 0). |
| Per-email gate closes the cross-IP credential-stuffing vector | Toggle "Disable per-email gate" on; in the inspector's "Distinct IP" runner, simulate 10 attempts against `alice` from IP-A then another 10 from IP-B; all 20 succeed reaching `auth.api.signInEmail` (per-IP gates were both fresh). Toggle off; rerun; the 11th attempt overall trips the per-email gate regardless of source IP. |
| Better Auth's built-in limiter is off | Grep `lib/auth.ts` for `rateLimit:` — the only entry is `{ enabled: false }`. With the built-in on (toggle in the inspector flips a config flag in dev), bursting Better Auth's catch-all directly (via `fetch('/api/auth/sign-in', ...)` bypassing the action) gets the built-in's coarse limit; with it off, that path is unprotected — the architectural point is that all auth traffic must funnel through the wrapped actions, which the sign-in form already does. The lesson surfaces the implication. |
| Fail-open under Upstash outage | Toggle "Force Upstash down" on; run "Spam sign-in" 15 times; every request goes through (no 429s), each `safeLimit` call writes a `rate_limit_unavailable` line to the log. The structured-log tail shows 15 rows with the event. Toggle off; rerun; normal behavior resumes. |
| Module-scope declaration | Restart the dev server; in dev, watch the first request to a fresh function instance; the `ephemeralCache` is empty (one Redis call). The second request reuses the instance — no second Redis call within the cache window. Confirmed by the request-trace panel (provided by the starter). |
| `pending` analytics flushed off-path | Inspector's per-request timing panel shows the user-visible response time excludes the analytics roundtrip — the difference between the `pending`-awaited path (a toggle for the demo) and the `after()` path is 5-10ms. |
| Env validation gates Redis usage | Remove `UPSTASH_REDIS_REST_URL` from `.env.local`, restart dev — the boot fails with the Zod error from `env.ts`; the limiter is impossible to silently no-op. |

### Concepts demonstrated → owning lesson

- The public-URL-plus-auth trigger and the two-layer architecture — 15.3.1.
- Upstash Redis as the 2026 default for the application limiter — 15.3.1.
- `Redis.fromEnv()` and the connectionless HTTP/REST client — 15.3.2.
- Module-scope `Ratelimit` declaration and the in-memory `ephemeralCache` — 15.3.2.
- Sliding-window as the default algorithm — 15.3.2.
- The `{ success, limit, remaining, reset, pending }` return shape — 15.3.2.
- The IETF `RateLimit-*` headers, `Retry-After` precedence — 15.3.2 + 15.3.3.
- `prefix` namespacing and key design (`ip:` / `email:`) — 15.3.2 + 15.3.3.
- The dual-keying rule on sign-in — 15.3.3.
- The gate-before-work order — 15.3.3.
- User-safe 429 body, operator-honest log line — 15.3.3.
- The fail-open policy via `safeLimit` — 15.3.3.
- Replacing Better Auth's built-in limiter with the application-level pattern — 15.3.3.
- `getClientIp` parse + `x-forwarded-for` trust boundary — 15.3.3.
- `normalizeEmail` normalization (trim + lowercase, no `+`-alias stripping) — 15.3.3.
- `after()` for `pending` analytics flush — 15.3.2 + Next.js 16 (5.2).
- Zod-validated env for required Upstash vars — 1.4.5.
- `RateLimitError` subclass — 2.9.

---

## Lesson 15.4.1 — Project brief

Goals:

- Frame the build: take the 9.5 email+password auth surface and instrument the three abusable endpoints (sign-in, sign-up, password reset) with `@upstash/ratelimit` at the action boundary. Sign-in carries the dual-keying rule. Better Auth's built-in limiter goes off. Every response carries `RateLimit-*` headers; rejections add `Retry-After`. A Redis outage fails open and logs an alertable event. Show one screenshot of `/inspector` after a finished "Spam sign-in" run: the recent-responses log with ten 401s counting `RateLimit-Remaining` down from 9 to 0 and the 11th flipping to 429 with `Retry-After`.
- State the "Done when" in one paragraph: hammering sign-in with 11 requests from the same IP in a minute returns the 11th as 429; the same email from a different IP also gets throttled separately on the per-email gate; sign-up and reset gate per-IP (reset additionally per-email); every response carries `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; the Upstash dashboard shows the keys with TTLs.
- Scope cuts: no per-user or per-org limits beyond auth (named, deferred — the auth surface is the chapter's trigger; other surfaces are forward references); no Vercel WAF rule configuration (named in 15.3.1, the dashboard wiring is two clicks and is not coded here); no captcha (the next layer past the limiter when the limiter is consistently maxed by humans; named, deferred); no `Ratelimit.deny()` blocklist (named in 15.3.2, deferred); no multi-region Upstash replication (named, deferred — single-region is the project's deploy shape); no integration tests for the headers (deferred to 19.3 — Playwright assertions on `RateLimit-*` are mechanical once the surface exists); no migration of an existing app's Better Auth `secondary-storage` to Upstash (named in 15.3.3 as the alternative path, not chosen).
- Senior payoff: this is the canonical limiter shape every other abusable endpoint in the course copies — webhook receivers, file uploads, AI generation. Adding a fourth limiter is one new `Ratelimit` instance in `rate-limit.ts`, one new action wrap, same headers, same fail-open. The `safeLimit` and `rateLimitHeaders` helpers are the seam.
- Show the end UX: a short capture of the inspector — 11 sign-ins (the 11th red-bordered as a 429), the dashboard panel screenshot showing the keys, the "Force Upstash down" toggle producing 15 fail-opens with log events.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 9.5 working end-to-end: email+password sign-up, verification, sign-in, password reset, protected layout. This project layers limiters on top — no Better Auth core changes, only the action wrappers and the `auth.ts` config flag flip.
- Better Auth's built-in limiter is on by default in the starter (matching 9.5's shipped state). The student turns it off in 15.4.4 as the deliberate architectural swap — the lesson surfaces the before-and-after so the cut is visible.
- The Upstash free tier covers the project comfortably; the verify lesson burns at most a few hundred operations across the spam runs. The Vercel Marketplace integration is the recommended provisioning path (15.3.1); for a local-only run the student creates a free database via the Upstash dashboard and pastes the two env vars.
- The `/api/auth/[...all]` catch-all stays unwrapped — limits land at the action seam that *calls* `auth.api.*` directly. The implication: any traffic that hits the catch-all directly (a misbehaving client posting to `/api/auth/sign-in`) bypasses the application limiter. The surface area for that traffic is the project's frontend forms, which all go through the wrapped actions; the senior call to add a route-handler-level limiter as defense-in-depth is named, deferred.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded, Upstash project created and `.env.local` populated, `pnpm dev` shows the 9.5 auth flows working (sign-in/sign-up/reset live, verification email mocked); `/inspector` loads but the "Remaining tokens" panel reads `n/a` (the limiters don't exist yet) and the "Spam X" buttons throw on first use.

Estimated student time: 15 to 20 minutes.

---

## Lesson 15.4.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on six files: `src/lib/redis.ts` (empty — 15.4.3), `src/lib/rate-limit.ts` (empty — 15.4.3), `src/lib/keys.ts` (empty — 15.4.4), `src/lib/safe-limit.ts` (empty — 15.4.4), `src/lib/rate-limit-headers.ts` (empty — 15.4.4), and the three action files (`sign-in.ts`, `sign-up.ts`, `reset.ts` — 15.4.4).
- Read `src/lib/auth.ts`: confirm `rateLimit: { enabled: true }` is set (the 9.5 default). The 15.4.4 step flips it to `enabled: false` once the application-level limiters are wired — the lesson surfaces the before-and-after so the architectural cut is visible in one diff.
- Read `src/env.ts`: confirm the existing entries; the student adds the two Upstash vars in 15.4.3. The `env.ts` validation is the gate that prevents a deploy without the limiter — the senior reflex of Zod-at-the-boundary applies to runtime config (1.4.5).
- Read the inspector end-to-end — every panel, button, toggle. It is the verification surface for every later lesson. Confirm the "Remaining tokens" panel calls `limiter.getRemaining(key)` (which the starter shims to a `n/a` value when the limiter is undefined); the panel becomes live once the limiters exist. The "Spam X" buttons are wired to the three action stubs; the actions throw `NotImplementedError` until wrapped.
- Read the seed and the test identities. `alice@example.com` and `bob@example.com` are verified users with known passwords (provided in `scripts/seed.ts` as constants the inspector reads). `eve@example.com` is the password-reset target — a verified user whose mailbox is the deliverability concern the per-email reset gate exists to protect.
- Read the provided `rate_limit_log` table and the small `logRateLimit` helper. The helper is exported from `src/lib/rate-limit-log.ts` for `safeLimit` to call alongside every rejection and every `rate_limit_unavailable` event.
- Read `src/app/api/auth/[...all]/route.ts`: a one-liner Better Auth handler. The student does not modify this file. All limits land in the actions that call `auth.api.*` directly.
- Run the app: sign in as `alice` (form posts to the unprotected action), redirect to `/dashboard`; sign out; visit `/inspector`; click "Spam sign-in" — it throws because the action stub is not yet wrapped. The dev server logs the error; the inspector's recent-responses log shows a single "500" entry.

Senior calls and watch-outs:

- `lib/rate-limit.ts` will be the only place `new Ratelimit(...)` exists. Call sites import the three named instances; constructing a limiter inline anywhere else defeats the in-memory cache (15.3.2) and corrupts the prefix namespace.
- The starter's `lib/email.ts` is mocked in inspector mode: `sendResetPasswordEmail` bumps `MOCK_EMAIL_SENT_COUNT` instead of hitting Resend. The reset-rate-limit verify path reads the counter to confirm a successful reset call actually triggered an email send (and that a rate-limited request did not).
- The Better Auth `auth.api.signInEmail` and friends accept `{ body, headers }` and return either a success response or throw — the action wrapper handles both branches.
- `next/server`'s `after()` is the canonical 2026 way to flush analytics off the user response path (introduced in 5.2). The reference uses it for the `pending` promise.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded, Upstash provisioned, env populated.
Codebase state at exit: every provided file read, inspector clicked through, `alice` sign-in tried, "Spam" buttons error as expected. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 15.4.3 — Redis client, three limiters, and the live readout

Goals:

- Add the two Upstash entries to `src/env.ts`: `UPSTASH_REDIS_REST_URL: z.string().url()`, `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)`. Restart dev; the boot now refuses to start without the two vars. The runtime gate from 1.4.5 covers the limiter prerequisite.
- Fill `src/lib/redis.ts`: one line — `export const redis = Redis.fromEnv();`. The `fromEnv()` reads the validated `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Add a one-line health check the inspector can call (`redis.ping()` returning `'PONG'`) so the "Upstash up?" badge on the inspector turns green.
- Fill `src/lib/rate-limit.ts`: declare the three `Ratelimit` instances per reference. All three at module scope, all three with `analytics: true`, all three with their own `ephemeralCache: new Map()`. The three prefixes are `rl:signin`, `rl:signup`, `rl:reset` — distinct keyspaces. Budgets per 15.3.3: sign-in 10/min, sign-up 5/10m, reset 3/15m.
- Wire the inspector's "Remaining tokens" panel: the starter's panel calls `limiter.getRemaining('ip:' + currentIp)` and `limiter.getRemaining('email:' + currentEmail)` for the active inspector identity and renders the result. The student does not author the panel; once the three limiter exports exist the panel becomes live. The lesson surfaces what `getRemaining` returns (a `{ remaining, reset }` shape without consuming budget) and why the inspector uses it instead of `limit()` for the readout.
- Run the app: open `/inspector`; the "Upstash up?" badge is green; the "Remaining tokens" panel shows `signin → ip:<addr> → 10/10`, `signup → ip:<addr> → 5/5`, `reset → ip:<addr> → 3/3`, `reset → email:<active-email> → 3/3`. Click "Spam sign-in" — still errors (the action stub is not wrapped yet) but the readout panel is operational.

Senior calls and watch-outs:

- Module scope is load-bearing. The library caches `pending` writes and recent counters in process memory; declaring the limiter inside the action handler defeats both. The lesson surfaces the rule with the failure mode: a sustained hot key would otherwise hit Redis on every request.
- Each limiter gets its own `ephemeralCache: new Map()`. Sharing one `Map` across limiters works but blurs the eviction story; one per limiter is the cleaner default.
- `analytics: true` adds one extra write per call (the rolling counter for the dashboard). The `pending` promise is the deferral seam — the student wires that in 15.4.4.
- Prefix discipline: `rl:signin`, `rl:signup`, `rl:reset` — distinct so two limiters cannot collide on a shared key. Cross-app collisions are prevented by the per-Upstash-database scope (each project gets its own database).
- The `getRemaining(key)` call the inspector uses does **not** consume budget; it reads the current state. Using `limit(key)` for the readout would burn one budget per render and cause the panel itself to lock the user out.
- The budget choices (10/min, 5/10m, 3/15m) are senior calls from 15.3.3. Surface the reasoning briefly: sign-in tolerates more attempts (legitimate typos, lockouts cost users); sign-up and reset are rarer events so tighter; reset is tightest because the abuse cost is concrete (inbox noise + Resend deliverability).

Codebase state at entry: `redis.ts`, `rate-limit.ts`, and the two env entries empty; inspector "Remaining tokens" reads `n/a`.
Codebase state at exit: env validated, Redis client wired, three limiters declared at module scope with `analytics`, `ephemeralCache`, and per-limiter prefixes; inspector's "Remaining tokens" panel reads live values for the active identity. **Runnable — the limiters exist and the inspector verifies state from Redis; no endpoint is gated yet.**

Estimated student time: 40 to 55 minutes.

---

## Lesson 15.4.4 — Wire the three actions with dual-keying, headers, and fail-open

Goals:

- Fill `src/lib/keys.ts`: `getClientIp(headers)` per reference (parse `x-forwarded-for` first entry, fall back to `x-real-ip`, fall back to `'unknown'`); `normalizeEmail(email)` per reference (trim + lowercase, no `+`-alias stripping — name the senior call inline). One file, two pure functions.
- Fill `src/lib/safe-limit.ts`: `safeLimit(limiter, key)` per reference. `try { return await limiter.limit(key); } catch (err) { await logRateLimit({ event: 'rate_limit_unavailable', limiter: limiter.prefix, key, err: err.message }); return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }; }`. The fail-open shape returns a `success: true` result so call sites have one branch — the failure mode is observable in the log, not in user behavior. Note: real production logging goes through the structured logger from 20.1; the starter's `logRateLimit` is the development-time analog that writes to the `rate_limit_log` table the inspector tails.
- Fill `src/lib/rate-limit-headers.ts`: `rateLimitHeaders(result)` per reference (three headers, `Reset` as delta-seconds via `Math.ceil((result.reset - Date.now()) / 1000)`). `rateLimitedResponse(result)` per reference (429 status, the four headers including `Retry-After: <delta-seconds>`, the user-safe identical body `{"error":"Too many attempts. Please try again later."}`).
- Edit `src/app/actions/sign-in.ts` per reference: parse with Zod (`z.strictObject({ email: z.email(), password: z.string().min(1) })`); resolve `ip` and `email`; `safeLimit(signInLimiter, 'ip:' + ip)` first, return `rateLimitedResponse` on rejection; then `safeLimit(signInLimiter, 'email:' + email)`, return `rateLimitedResponse` on rejection; call `auth.api.signInEmail({ body, headers: await headers() })`. On success build the response and merge `rateLimitHeaders(ipLimit)` so the client sees its remaining budget even on the happy path. Hand both `ipLimit.pending` and `emailLimit.pending` to `after()` (from `next/server`) so analytics flush off-path.
- Edit `src/app/actions/sign-up.ts` per reference: one `safeLimit(signUpLimiter, 'ip:' + ip)` call, gate before `auth.api.signUpEmail`. Same response shape and header merge.
- Edit `src/app/actions/reset.ts` per reference: `safeLimit(resetLimiter, 'ip:' + ip)` then `safeLimit(resetLimiter, 'email:' + email)`, gate before `auth.api.forgetPassword`. Same response shape.
- Disable Better Auth's built-in limiter: open `src/lib/auth.ts`, change `rateLimit: { enabled: true }` to `rateLimit: { enabled: false }`. The application-level limiters at the action boundary are now the one place. Add a one-line comment naming the architectural rule for future readers.
- Run the app: open `/inspector`; "Spam sign-in" produces 11 entries in the recent-responses log — the first 10 are 401s (Better Auth — wrong password) each with `RateLimit-Remaining` counting from 9 to 0, the 11th is a 429 with `Retry-After`. The body of the 429 reads exactly the user-safe message. The "Remaining tokens" panel updates after the spam burst. "Force Upstash down" toggle on → the next 15 sign-in attempts all return 401 (limiter fails open, request reaches Better Auth) and the structured-log tail captures 15 `rate_limit_unavailable` rows.

Senior calls and watch-outs:

- Gate before work. The two `safeLimit` calls run **before** `auth.api.signInEmail`. Putting them after pays the password-hash cost on every request even after the budget is exhausted — the inspector's "Gate after work" toggle is the deliberate failure-mode demo for 15.4.5.
- Both sign-in gates must pass. Checking `success` on only one leaves the other vector open: per-IP alone misses credential stuffing across IPs; per-email alone is the lockout vector. The lesson surfaces the two-`if` shape (early return on each `!success`) as the structural enforcement — a single combined check is harder to read and to lint.
- The 429 body is identical across both gates. Returning `"IP rate-limited"` vs. `"email rate-limited"` leaks which gate tripped — and leaks that the email exists in the system (the per-email gate only counts when the email is known). The "Distinct 429 bodies" inspector toggle surfaces the leak; production never ships that variant.
- The `pending` promise must be handled or the analytics write is lost on serverless cold-shutdowns. `after()` is the 2026 Next.js way (from `next/server`) — it lets the response flush while the analytics continue. `await ipLimit.pending` on the user response adds 5-10ms; the verify lesson shows the difference in the timing panel.
- `safeLimit` is the one place the fail-open policy lives. Flipping to fail-closed for a higher-stakes future endpoint (a billing-action limiter, an admin endpoint) is a one-line change inside `safeLimit` — or, more honestly, a second `safeLimitClosed` helper exported next to `safeLimit` so the choice is named per call site. The lesson surfaces the senior reflex: the policy decision is one place, not strewn across `try/catch` blocks at every limiter call.
- Disabling Better Auth's built-in limiter is the deliberate architectural swap. With the built-in on, two limiters compete (the in-memory one inside Better Auth's catch-all, the Upstash one in the action) — different budgets, different keys, different storage, debugging hell. Off, the action wrapper is the one place. Better Auth 1.5 supports a `secondary-storage` adapter that would point the built-in at Upstash; that path is named in 15.3.3 as an alternative for teams that want the framework to manage the rules, not the chapter's choice (the application-level pattern is the more flexible seam for non-auth endpoints later).
- Trust boundary on `x-forwarded-for`: Vercel sets it correctly, taking the first entry of the comma-separated list. On a self-hosted deploy (Fly, Railway, a VPS), trust requires gating at the load balancer — the lesson surfaces the gate so the student knows where to look. `'unknown'` as the IP fallback means a single key for every unidentifiable request — overly tight in aggregate; the senior call is to reject the request when `x-forwarded-for` is absent in production, which is a one-line policy change deferred to the security audit in 17.2.
- The `email:` key uses the normalized email. The same normalization runs at the database lookup site so the limiter and the user record are keyed identically. Tightening normalization (lowercase + strip `+`) is a senior decision per app: gmail's `+` aliasing makes target-an-email-via-alias trivial, and a malicious crawler can vary `+rand` per attempt to bypass the per-email gate. The chapter's default is trim + lowercase only; the comment in `keys.ts` surfaces the trade-off.

Codebase state at entry: limiters declared, no action wraps, every endpoint unprotected.
Codebase state at exit: three actions wrapped (sign-in with dual-keying, sign-up + reset with the documented strategies), Better Auth built-in off, headers on every response, fail-open on Upstash outage, `pending` analytics handed to `after()`, `rate_limit_log` populated. **Runnable — every inspector "Spam" button produces the expected sequence with the expected headers; the architectural swap is complete.**

Estimated student time: 70 to 90 minutes. The chapter's heaviest lesson — the dual-keying, the header contract, the fail-open policy, and the Better Auth swap all land together because each depends on the others to be observable.

---

## Lesson 15.4.5 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **The 11th-request baseline:** open `/inspector` as a fresh identity; "Reset Upstash counters"; "Spam sign-in" against `alice` with a wrong password. The recent-responses log shows 10 entries with status 401, `RateLimit-Limit: 10`, `RateLimit-Remaining` declining from 9 to 0, `RateLimit-Reset` declining each time (the sliding window's effect). Entry 11 flips to status 429, body `{"error":"Too many attempts. Please try again later."}`, `RateLimit-Remaining: 0`, `Retry-After: <≤60>`. The "Remaining tokens" panel for `signin → ip:<addr>` shows `0/10` and a countdown.
- **Cross-IP per-email proof:** flip the inspector's "Force x-forwarded-for" to a different value; click "Send one" against `alice` (wrong password). The response is 401 with `RateLimit-Remaining: 9` on the `ip:` gate (fresh) but `RateLimit-Remaining: <9-prev>` on the `email:` gate (the inspector renders both header sets). Repeat from this new IP until the email gate's `Remaining` hits 0; the next request is 429 — the log line confirms `key: 'email:alice@example.com'`. The per-email gate caught the across-IPs vector the per-IP gate cannot see — the chapter's load-bearing proof.
- **Window reset:** after the 429s on sign-in, wait until `Retry-After` reaches 0 (the inspector shows a countdown; alternatively "Reset Upstash counters"). Send one — 401 again with `RateLimit-Remaining: 9` (fresh window). Tokens release on schedule.
- **Sign-up per-IP only:** "Spam sign-up" with 6 random-suffix emails; request 6 returns 429. The log confirms `limiter: 'signup'`, `key: 'ip:<addr>'`. The five accepted requests used five different emails — per-email could not have been the gate; per-IP is.
- **Reset per-IP and per-email:** "Spam reset" against `eve@example.com` 4 times from one IP; request 4 returns 429 with `key: 'email:eve@example.com'`. Switch IP; "Send one" against `eve` — still 429 (the per-email gate didn't reset). The inspector's `MOCK_EMAIL_SENT_COUNT` ticked up by 3 (the three successes triggered `sendResetPasswordEmail`); the 4th and the cross-IP attempt did not. The per-email gate protects the victim's inbox and the Resend budget.
- **Header completeness:** every entry in the recent-responses log shows `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`. The 429 entries additionally show `Retry-After`. The IETF-draft set is the on-page reading. Successful responses include the headers from the per-IP limiter (the more informative budget for the typical sign-in client).
- **Body opacity (the leak demo):** flip "Distinct 429 bodies" on; rerun the spam; the rejection body now reads `"Email rate-limited"` or `"IP rate-limited"`. The information leak is visible. Flip off; rerun; the body returns to the opaque message. The user-safe contract is enforced by the helper, not by the call site — surfacing it as one helper is the structural choice.
- **Gate-before-work (the chapter's other load-bearing failure mode):** flip "Gate after work" on; "Spam sign-in"; the inspector's timing panel shows every request paying ~80-150ms of password-hash cost — even the 11th, the 12th, the 20th. Flip off; rerun; the 11th-and-later requests skip the hash (timing collapses to ~5-15ms — the Upstash round-trip alone). The senior reflex from 15.3.3 is the diff in the timing panel.
- **Per-email-gate-disabled (the cross-IP attack reproducer):** flip "Disable per-email gate" on; the inspector's "Distinct IPs runner" simulates 10 wrong-password attempts against `alice` from IP-A, then 10 from IP-B (the runner spoofs `x-forwarded-for` deterministically). All 20 reach `auth.api.signInEmail`; the per-IP gates are both fresh. Flip off; rerun; the 11th attempt overall (across IPs) trips the `email:` gate. The dual-keying rule's value is the diff between the two runs.
- **Fail-open under Upstash outage:** flip "Force Upstash down" on; "Spam sign-in" 15 times; every request returns 401 (limiter fails open, request reaches Better Auth); the structured-log tail shows 15 `rate_limit_unavailable` rows with the failing key. The senior reflex: a sustained run of these rows is a Upstash incident, not a quiet drift — alerting lives in 20.1.
- **Better Auth built-in disabled:** open `src/lib/auth.ts`; the `rateLimit: { enabled: false }` line is the only `rateLimit` reference. The application-level limiters are the one place. The senior call from 15.3.3: two limiters competing on the same surface is a debugging hell; one place is the rule.
- **Module-scope cache hits:** the inspector's request-trace panel shows the first request after a cold start hitting Redis (one round-trip per `limit()` call); subsequent requests within the in-memory window hit the `ephemeralCache` (zero Redis round-trips logged). The library handles the cache window automatically.
- **`pending` analytics flushed off-path:** flip "Await pending instead of after()" on; the request-timing panel shows the user-visible response time inflated by 5-10ms per call. Flip off; the timing returns to baseline. The 2026 `after()` pattern (5.2) is the off-path flush.
- **Upstash dashboard:** click the dashboard panel; in the Upstash console, navigate to Data Browser; filter by `rl:` prefix. The keys `rl:signin:ip:<addr>`, `rl:signin:email:alice@example.com`, `rl:signup:ip:<addr>`, `rl:reset:ip:<addr>`, `rl:reset:email:eve@example.com` are present with TTLs ≤ their window. Analytics tab → the rejection blips for the spam runs are visible per prefix. The dashboard is the operator's incident-review surface; the structured-log tail is the in-app development-time analog.
- **Env-gates-Redis:** comment out `UPSTASH_REDIS_REST_URL` in `.env.local`; restart `pnpm dev`; the Zod validation in `env.ts` fails the boot with a clear message. Uncomment; restart; the app boots. The runtime gate from 1.4.5 prevents a deploy without the limiter — the limiter is impossible to silently no-op.
- Name the senior calls one more time:
  - Application-level rate limiting is non-negotiable from the public URL onward; Better Auth's built-in is off because the application-level pattern is the one place and the more flexible seam for non-auth endpoints later.
  - Three limiters at module scope, distinct prefixes, `ephemeralCache` per limiter, `analytics: true`.
  - Sign-in gates per-IP **and** per-email through one limiter with two key prefixes; both must pass.
  - The limiter runs before the password hash and the database lookup — gating after the cost is paid defeats the purpose.
  - The 429 body is identical across both gates; the structured log carries the diagnosis.
  - `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every response; `Retry-After` adds on rejection.
  - `safeLimit` owns the fail-open policy; flipping to fail-closed for a higher-stakes endpoint is a one-place decision.
  - `pending` handed to `after()` keeps analytics off the user response path.
  - The `getClientIp` parse trusts the platform's `x-forwarded-for`; on non-Vercel hosts trust is gated at the load balancer.
  - `normalizeEmail` runs the same normalization the database lookup runs — limiter and lookup count the same identifier.
  - Zod-validated env vars gate the limiter — boot fails fast on missing Upstash credentials.
- Forward references:
  - Unit 15.3.4 (chapter quiz) — the topics quizzed cover this project's primitives end-to-end.
  - Unit 12.1 / 12.3 — webhook receivers carry the same shape: module-scope limiter, per-key strategy, fail-open, `RateLimit-*` headers; the per-source key strategy (per Stripe webhook ID, per origin) is the next adaptation.
  - Unit 13.3 / 23 — file uploads and AI generation endpoints copy the pattern with per-user or per-org keys.
  - Unit 17.2 — security baseline audit; the limiter coverage on every abusable endpoint is one of the audit's checkpoints. Per-route rate-limit assertion lives in the audit checklist.
  - Unit 19.3 — integration tests for the `RateLimit-*` headers and the 429 path; Playwright assertions on the response headers are mechanical once the surface exists.
  - Unit 20.1 — structured logs; the `rate_limit_log` table is the development-time analog of the production dashboard for rejection rate, fail-open rate, and per-key timeline.
  - Unit 22 — the chapter's "Upstash earns three more workloads" promise (cache, session-shaped tokens, dispatcher pub/sub) gets cashed in when each trigger fires.

Senior calls and watch-outs:

- The verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- The cross-IP per-email proof must use the inspector's `x-forwarded-for` spoof, not real network changes. Real IP rotation across a residential ISP doesn't happen on demand; the spoof is the deterministic version of the attack.
- The fail-open demo must run with the toggle deliberately; flipping it in the middle of an unrelated verification produces confusing results. Use it as its own dedicated step.
- After the chapter, the spam-burst keys live in Upstash for up to the window's TTL. Resetting counters before walking away is the cleanup courtesy on a shared free-tier database.

Codebase state at entry: full limiter wiring, three actions wrapped, Better Auth built-in off, inspector verifying surface live.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`Redis.fromEnv`, three module-scope `Ratelimit` instances, sliding-window default, `prefix` discipline, dual-keying with two prefixes through one limiter, `getClientIp` and `normalizeEmail`, `safeLimit` fail-open, `rateLimitHeaders`, `rateLimitedResponse`, `after()` for `pending`, Better Auth built-in disabled) and which forward unit will lean on each.

Estimated student time: 35 to 50 minutes.
