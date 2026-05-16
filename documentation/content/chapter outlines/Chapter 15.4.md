# Chapter 15.4 — Project: Upstash rate limits on the auth surface

## Chapter framing

Chapter 15.4 cashes in 15.3 — the public-URL-plus-auth trigger (15.3.1), the Upstash primitives and sliding-window default (15.3.2), the three module-scope limiters, dual-keying, `RateLimit-*` headers, user-safe 429 body, fail-open policy, and the Better-Auth-built-in replacement (15.3.3) — as one runnable surface on the 9.5 email+password auth flows. The student writes `lib/rate-limit.ts` (three module-scope `Ratelimit` instances), `lib/keys.ts` (`getClientIp`, `normalizeEmail`), `safeLimit(limiter, key)` (fail-open wrapper), `rateLimitHeaders(result)` (IETF-draft headers), and wraps sign-in / sign-up / reset at the action seam — sign-in with per-IP **and** per-email dual gates. Better Auth's built-in limiter is turned off. Each build closes runnable: 15.4.3 ends with limiters declared and the inspector's "Remaining tokens" panel live; 15.4.4 ends with the three endpoints wrapped and 429s firing with correct headers and body; 15.4.5 walks "Done when" against the inspector and the Upstash dashboard.

Threads through every lesson: the limiter is a named seam — call sites import from `lib/rate-limit.ts`, never construct inline; module-scope declaration is load-bearing (the in-memory `ephemeralCache` only survives across hot invocations when the instance is reused); sign-in runs two `limit()` calls — `ip:<addr>` and `email:<normalized>`, both must pass, cheaper first; gating runs **before** the password hash and the database lookup; the 429 body is identical regardless of which gate tripped (no information leak); `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every response, `Retry-After` added on rejection; `pending` analytics handed to `after()` (from `next/server`) so the user response is not blocked; `safeLimit` wraps every `limit()` call so a Redis outage logs a structured event and fail-opens on the auth path; Better Auth's built-in `rateLimit: { enabled: false }` — replacing the in-memory limiter with the application-level limiter is the architectural point; the inspector's "Spam X" buttons hammer endpoints deterministically so the 11th-as-429-with-headers is the on-page reading every verify step uses.

### Dependency carry-in

- **From 9.5:** Better Auth catch-all at `app/api/auth/[...all]/route.ts`; the `auth` instance in `src/lib/auth.ts` with email+password, verification, reset; `sendVerificationEmail` / `sendResetPasswordEmail` wired to `lib/email.ts` (mocked — bumps `MOCK_EMAIL_SENT_COUNT`); `proxy.ts` gate; `/dashboard`; sign-out action; seeded `alice@example.com` with a known password.
- **From 9.3.1 / 9.3.2 / 9.3.4:** `auth.api.signUpEmail`, `auth.api.signInEmail`, `auth.api.forgetPassword` — the student wraps these at the action boundary.
- **From 15.3.1:** the public-URL-plus-auth trigger; two-layer architecture (edge WAF + application limiter); fail-open-on-auth policy.
- **From 15.3.2:** `Redis.fromEnv()`; the `Ratelimit` constructor (`redis`, `limiter`, `prefix`, `analytics`); `Ratelimit.slidingWindow(max, window)`; `{ success, limit, remaining, reset, pending }` shape; IETF `RateLimit-*` headers; module-scope rule; `ephemeralCache`.
- **From 15.3.3:** dual-keying (`ip:` and `email:` prefixes through one limiter); gate-before-work; user-safe 429 body; `safeLimit` fail-open; Better-Auth-built-in replacement; `getClientIp`; `normalizeEmail` (trim + lowercase, no `+` strip).
- **From 6.6 (origin 1.4.5):** `src/env.ts` with Zod-validated env — extended with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **From 7.2 + 7.6:** Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`.
- **From 2.9:** `RateLimitError` subclass (`RATE_LIMITED`).
- **From 20.1 (foreshadowed):** structured log shape `{ event: 'rate_limit_rejected' | 'rate_limit_unavailable', limiter, key, remaining, reset }`.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
.env.example                    # provided: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
                                #           RESEND_API_KEY, APP_URL,
                                #           UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
package.json                    # provided: db:migrate, db:seed, dev, build
scripts/
  seed.ts                       # provided: alice@example.com + bob@example.com (verified, known
                                #           passwords); eve@example.com (password-reset target)
src/
  env.ts                        # provided; TODO student adds the two Upstash entries
  db/
    schema.ts                   # provided: Better Auth's four core tables
    client.ts                   # provided
  lib/
    auth.ts                     # provided from 9.5; TODO student disables built-in rateLimit
    auth-client.ts              # provided
    email.ts                    # provided: mocked in inspector mode (MOCK_EMAIL_SENT_COUNT)
    redis.ts                    # TODO student: Redis.fromEnv() one-liner
    rate-limit.ts               # TODO student: three Ratelimit instances
    keys.ts                     # TODO student: getClientIp + normalizeEmail
    safe-limit.ts               # TODO student: fail-open wrapper + structured log
    rate-limit-headers.ts       # TODO student: rateLimitHeaders + rateLimitedResponse
    rate-limit-log.ts           # provided: logRateLimit helper writing to rate_limit_log
    errors.ts                   # provided: RateLimitError subclass (2.9)
  app/
    (auth)/
      sign-in/page.tsx          # provided shell from 9.5
      sign-in/actions.ts        # provided from 9.5; TODO student wraps with dual-keying
      sign-up/page.tsx          # provided shell
      sign-up/actions.ts        # provided from 9.5; TODO student wraps per-IP
      reset/page.tsx            # provided shell
      reset/actions.ts          # provided shell; TODO student wraps per-IP + per-email
    api/
      auth/[...all]/route.ts    # provided: Better Auth catch-all (NOT wrapped — limits land
                                #           at the action seam that calls auth.api.* directly)
    inspector/page.tsx          # provided: "Spam X" + "Send one" buttons, "Remaining tokens"
                                #           panel, recent-responses log, "Force Upstash down"
                                #           toggle, structured-log tail, failure-mode toggles
                                #           (gate-after-work, disable-per-email, distinct-429),
                                #           Upstash-dashboard link, reset-counters action
```

### Reference solution signatures lessons display

- **Redis client** (`src/lib/redis.ts`): `export const redis = Redis.fromEnv();` — one line. The `env.ts` validation ensures URL/token exist before this module loads.
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
  - `rateLimitHeaders(result)` — `{ 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset' }` (Reset as delta-seconds via `Math.ceil((result.reset - Date.now()) / 1000)`).
  - `rateLimitedResponse(result): Response` — 429, the three headers plus `Retry-After: <delta-seconds>`, body `{"error":"Too many attempts. Please try again later."}`. Identical body regardless of gate.
- **Sign-in action** (`src/app/(auth)/sign-in/actions.ts`): `signInAction(state, formData)` returning `Result<never, 'invalid-credentials' | 'email-not-verified' | 'rate-limited'>` — Zod parse; resolve `ip` and `email`; `ipLimit = await safeLimit(signInLimiter, 'ip:' + ip)`; on `!success` attach `rateLimitHeaders(ipLimit)` + `Retry-After` via Next.js 16's server-action `headers()` API and return `Result.err('rate-limited')`; same for `emailLimit = await safeLimit(signInLimiter, 'email:' + email)`; call `auth.api.signInEmail`; on success attach `rateLimitHeaders(ipLimit)` and `redirect(sanitizeNext(formData.get('next')) ?? '/dashboard')`. `after(ipLimit.pending)` + `after(emailLimit.pending)` flush analytics off-path (Next.js 16 `after()` from `next/server`).
- **Sign-up action** (`src/app/(auth)/sign-up/actions.ts`): one `safeLimit(signUpLimiter, 'ip:' + ip)` gate, then `auth.api.signUpEmail`. Per-IP only — the email is the attacker's choice (15.3.3).
- **Reset action** (`src/app/(auth)/reset/actions.ts`): `safeLimit(resetLimiter, 'ip:' + ip)` then `safeLimit(resetLimiter, 'email:' + email)`; the per-email gate protects victim's inbox + Resend cost. Calls `auth.api.forgetPassword` on success.
- **Better Auth built-in disabled** (`src/lib/auth.ts`): inside `betterAuth({...})`, set `rateLimit: { enabled: false }`. Application-level limiters at the action boundary are the one place.
- **`env.ts` extension:** `UPSTASH_REDIS_REST_URL: z.string().url()`, `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)`. Boot fails fast on missing vars.

### Inspector page spec

Single Server Component at `/inspector`. Reads server-side from Upstash; refreshes via `router.refresh()` and Server Actions.

- **Header:** session-user switcher (`alice` / `bob` / unauthenticated); "Reset Upstash counters" Server Action via a starter-provided `clearLimiterKeys()` helper — the inspector tracks touched keys in a `seen-keys` Redis set because Upstash REST has no `SCAN`.
- **"Remaining tokens" panel:** live readouts for `rl:signin` (per-IP and per-email for the active identity), `rl:signup` (per-IP), `rl:reset` (per-IP and per-email). Each row shows `prefix`, `key`, `remaining`, `limit`, `reset` countdown. Reads via `limiter.getRemaining(key)` — no budget consumed.
- **"Spam X" buttons:** "Spam sign-in" runs `signInAction` 11x against `alice` with a wrong password; "Spam sign-up" runs `signUpAction` 6x with random-suffix emails (per-IP is the gate); "Spam reset" runs `resetAction` 4x against `eve@example.com` (4th trips the per-email gate).
- **"Send one" buttons:** non-spamming single-call versions of each endpoint — used in verify to walk request 1 through 11 and watch `RateLimit-Remaining` decline.
- **Recent-responses log:** last 20 calls — `endpoint`, `status`, the three `RateLimit-*` headers, `Retry-After`, truncated body.
- **"Force Upstash down" toggle:** when on, `lib/redis.ts` swaps to a mocked client that throws `UpstashConnectionError`. Verifies `safeLimit` fail-open — every call logs `rate_limit_unavailable` and the request proceeds.
- **Structured-log tail:** Server Component reading the last 20 rows from `rate_limit_log` (`{ event, limiter, key, remaining, reset, firedAt }`). The operator-honest surface from 15.3.3.
- **Failure-mode toggles:** "Gate after work" (runs `auth.api.signInEmail` **before** `safeLimit`); "Disable per-email gate" (skips the `email:` call — paired with a "Distinct IPs runner" that spoofs `x-forwarded-for`); "Distinct 429 bodies" (rejection body leaks "Email rate-limited" vs. "IP rate-limited").
- **Upstash dashboard panel:** deep link to the project's Upstash console derived from the REST URL.

The inspector is provided in full; the student writes only `redis.ts`, `rate-limit.ts`, `keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`, and the three action wrappers.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| 11th sign-in request from the same IP in 1 min returns 429 | "Spam sign-in" against `alice`. Log: requests 1-10 return 401 (Better Auth — wrong password) with `RateLimit-Remaining` counting 9 → 0; request 11 returns 429 with `Remaining: 0` and `Retry-After: <≤60>`. |
| Same email from a different IP is throttled separately on the per-email gate | Spoof `x-forwarded-for`; "Send one" against `alice` ten times from the new IP. The per-IP gate stays fresh; the per-email gate counts down (same `alice@example.com`); the 11th from the new IP returns 429 with `key: 'email:alice@example.com'`. |
| Response includes `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` | Every log entry shows all three; 429s also show `Retry-After`. |
| 429 body is user-safe and identical | Every 429 body reads `{"error":"Too many attempts. Please try again later."}`. Toggle "Distinct 429 bodies" on — the leaky variants appear; toggle off. |
| Window resets release tokens | After the 11th 429, wait until `Retry-After` reaches 0 (or "Reset counters"); send one → 401 again with `Remaining: 9`. |
| Upstash dashboard shows the keys | Click the dashboard link → Data Browser → filter `rl:signin`; rows for `rl:signin:ip:<addr>` and `rl:signin:email:alice@example.com` present with TTLs ≤ 60s. Analytics tab shows the rejection blip. |
| Sign-up rate-limited per-IP | "Spam sign-up" with 6 random-suffix emails; request 6 returns 429 — 5 successes used 5 different emails so per-IP is the gate. |
| Reset rate-limited per-IP and per-email | "Spam reset" against `eve@example.com` 4 times; request 4 returns 429 (`limiter: 'reset'`, `key: 'email:eve@example.com'`). Switch IP; "Send one" → still 429 on the per-email gate. |
| Gate runs before the password hash | Toggle "Gate after work" on; spam sign-in; the starter-provided `verify_ms` timing shows every request paying the hash even past the budget. Toggle off; the 11th+ requests skip the hash (verify_ms ≈ 0). |
| Per-email gate closes the cross-IP credential-stuffing vector | Toggle "Disable per-email gate" on; "Distinct IPs runner" hits `alice` 10x from IP-A then 10x from IP-B — all 20 succeed reaching Better Auth. Toggle off; rerun — the 11th attempt overall trips the email gate regardless of source IP. |
| Better Auth's built-in limiter is off | Grep `lib/auth.ts` — the only `rateLimit` entry is `{ enabled: false }`. |
| Fail-open under Upstash outage | Toggle "Force Upstash down" on; spam sign-in 15x; every request goes through; structured-log tail shows 15 `rate_limit_unavailable` rows. Toggle off → normal behavior. |
| Module-scope declaration | First request after cold start hits Redis (one round-trip per `limit()`); subsequent requests in the cache window hit `ephemeralCache` (zero Redis round-trips). Visible in the starter's request-trace panel. |
| `pending` analytics flushed off-path | "Await pending instead of after()" toggle adds 5-10ms per call to the user-visible timing panel. |
| Env validation gates Redis usage | Comment out `UPSTASH_REDIS_REST_URL`; restart dev → boot fails with the Zod error. Uncomment → boot succeeds. |

### Concepts demonstrated → owning lesson

- Public-URL-plus-auth trigger and two-layer architecture — 15.3.1.
- Upstash Redis as the 2026 default for the application limiter — 15.3.1.
- `Redis.fromEnv()` and the connectionless HTTP/REST client — 15.3.2.
- Module-scope `Ratelimit` declaration and `ephemeralCache` — 15.3.2.
- Sliding-window as the default algorithm — 15.3.2.
- `{ success, limit, remaining, reset, pending }` return shape — 15.3.2.
- IETF `RateLimit-*` headers, `Retry-After` precedence — 15.3.2 + 15.3.3.
- `prefix` namespacing and key design (`ip:` / `email:`) — 15.3.2 + 15.3.3.
- Dual-keying rule on sign-in — 15.3.3.
- Gate-before-work order — 15.3.3.
- User-safe 429 body, operator-honest log — 15.3.3.
- Fail-open policy via `safeLimit` — 15.3.3.
- Replacing Better Auth's built-in limiter — 15.3.3.
- `getClientIp` + `x-forwarded-for` trust boundary — 15.3.3.
- `normalizeEmail` (trim + lowercase) — 15.3.3.
- `after()` for `pending` analytics flush — 15.3.2 + Next.js 16 (5.2).
- Zod-validated env — 1.4.5.
- `RateLimitError` subclass — 2.9.

---

## Lesson 15.4.1 — Project brief

Frames the build: wrap the 9.5 sign-in, sign-up, and reset actions with three Upstash limiters, swap out Better Auth's built-in limiter, and verify the 11th-request 429 against the inspector and the Upstash dashboard.

Goals:

- Frame the build: take the 9.5 email+password auth surface and instrument sign-in, sign-up, and reset with `@upstash/ratelimit` at the action boundary. Sign-in carries the dual-keying rule. Better Auth's built-in limiter goes off. Every response carries `RateLimit-*` headers; rejections add `Retry-After`. A Redis outage fails open and logs alertable events. Show one screenshot of `/inspector` after a finished "Spam sign-in": the recent-responses log with ten 401s counting `RateLimit-Remaining` 9 → 0 and the 11th flipping to 429 with `Retry-After`.
- State the "Done when" in one paragraph: hammering sign-in with 11 requests from the same IP in a minute returns the 11th as 429; the same email from a different IP also gets throttled separately on the per-email gate; sign-up and reset gate per-IP (reset additionally per-email); every response carries the three `RateLimit-*` headers; the Upstash dashboard shows the keys with TTLs.
- Scope cuts: no per-user or per-org limits beyond auth (named, deferred); no Vercel WAF rule configuration (named in 15.3.1, the dashboard wiring is two clicks); no captcha (the next layer past the limiter for human abuse; named, deferred); no `Ratelimit.deny()` blocklist (named in 15.3.2); no multi-region Upstash replication (named); no Playwright assertions on `RateLimit-*` (deferred to 19.3); no migration from Better Auth `secondary-storage` (named in 15.3.3 as the alternative, not chosen).
- Senior payoff: this is the canonical limiter shape every other abusable endpoint copies — webhook receivers, file uploads, AI generation. Adding a fourth limiter is one new `Ratelimit` instance plus one action wrap; same headers, same fail-open. `safeLimit` and `rateLimitHeaders` are the seam.
- Show the end UX: a short capture — 11 sign-ins (the 11th red-bordered as a 429), the Upstash dashboard screenshot showing the keys, "Force Upstash down" producing 15 fail-opens.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 9.5 working end-to-end. This project layers limiters on top — no Better Auth core changes, only the action wrappers and the `auth.ts` config flag flip.
- Better Auth's built-in limiter is on by default in the starter (matching 9.5). The student turns it off in 15.4.4 as the deliberate architectural swap; the before-and-after is visible in one diff.
- The Upstash free tier covers the project. The Vercel Marketplace integration is the recommended provisioning path; for local-only, create a free database via the Upstash dashboard and paste the two env vars.
- The `/api/auth/[...all]` catch-all stays unwrapped — limits land at the action seam that calls `auth.api.*` directly. Direct traffic to the catch-all (a misbehaving client) bypasses the application limiter. The frontend forms all go through the wrapped actions; route-handler-level limits as defense-in-depth are named, deferred.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded, Upstash provisioned, `.env.local` populated, `pnpm dev` shows the 9.5 auth flows working; `/inspector` loads but "Remaining tokens" reads `n/a` and the "Spam X" buttons throw on use.

Estimated student time: 15 to 20 minutes.

---

## Lesson 15.4.2 — Tour the 9.5 auth starter and the inspector

Reads the provided file tree, the still-on Better Auth built-in limiter, the empty `lib/` stubs, the seeded `alice` / `bob` / `eve` accounts, the mocked email counter, and every panel and toggle on `/inspector`.

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on `src/lib/redis.ts`, `rate-limit.ts`, `keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts` (all empty — 15.4.3 / 15.4.4) and the three action files (provided shells, no wrapping — 15.4.4).
- Read `src/lib/auth.ts`: confirm `rateLimit: { enabled: true }` (the 9.5 default). The 15.4.4 step flips it off once the application-level limiters are wired; the before-and-after is visible in one diff.
- Read `src/env.ts`: existing entries; the student adds the two Upstash vars in 15.4.3. The Zod validation is the gate that prevents a deploy without the limiter (1.4.5).
- Read the inspector end-to-end — every panel, button, toggle. Confirm the "Remaining tokens" panel calls `limiter.getRemaining(key)` (shimmed to `n/a` when undefined); the panel becomes live once the limiters exist. The "Spam X" buttons throw until the actions are wrapped.
- Read the seed: `alice@example.com` and `bob@example.com` are verified with known passwords (read by the inspector as constants); `eve@example.com` is the password-reset target — a verified user whose mailbox is the deliverability concern the per-email reset gate protects.
- Read the provided `rate_limit_log` table and the `logRateLimit` helper exported from `src/lib/rate-limit-log.ts` for `safeLimit` to call alongside every rejection / `rate_limit_unavailable`.
- Read `src/app/api/auth/[...all]/route.ts`: one-liner Better Auth handler. The student does not modify this — all limits land at the action seam that calls `auth.api.*` directly.
- Run the app: sign in as `alice` (form posts to the unprotected action), redirect to `/dashboard`; sign out; visit `/inspector`; click "Spam sign-in" — throws (the action stub is not yet wrapped).

Senior calls and watch-outs:

- `lib/rate-limit.ts` will be the only place `new Ratelimit(...)` exists. Constructing inline anywhere else defeats the in-memory cache (15.3.2) and corrupts the prefix namespace.
- The starter's `lib/email.ts` is mocked in inspector mode: `sendResetPasswordEmail` bumps `MOCK_EMAIL_SENT_COUNT`. The reset-rate-limit verify reads the counter to confirm successful resets triggered emails and rate-limited ones did not.
- `auth.api.signInEmail` and friends accept `{ body, headers }` and return a success response or throw — the action wrapper handles both branches.
- `next/server`'s `after()` is the canonical 2026 way to flush analytics off the response path (introduced in 5.2).

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded, Upstash provisioned, env populated.
Codebase state at exit: every provided file read, inspector clicked through, `alice` sign-in tried, "Spam" buttons error as expected. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 15.4.3 — Declare the Redis client and three module-scope limiters

Adds the two Upstash env vars, writes `redis.ts` as `Redis.fromEnv()`, declares the sign-in, sign-up, and reset `Ratelimit` instances at module scope with distinct prefixes and per-limiter `ephemeralCache`, and lights up the inspector's "Remaining tokens" panel via `getRemaining`.

Goals:

- Add the two Upstash entries to `src/env.ts` per reference. Restart dev; boot now refuses to start without them. The runtime gate from 1.4.5 covers the limiter prerequisite.
- Fill `src/lib/redis.ts`: `export const redis = Redis.fromEnv();`. Add a small `redis.ping()` health-check the inspector uses to render the "Upstash up?" badge green.
- Fill `src/lib/rate-limit.ts`: declare the three `Ratelimit` instances per reference. All three at module scope, `analytics: true`, per-limiter `ephemeralCache: new Map()`. Distinct prefixes (`rl:signin`, `rl:signup`, `rl:reset`). Budgets per 15.3.3: sign-in 10/min, sign-up 5/10m, reset 3/15m.
- Wire the inspector's "Remaining tokens" panel: the starter calls `limiter.getRemaining(key)` for the active identity. Once the three exports exist, the panel becomes live. Surface what `getRemaining` returns and why the inspector uses it instead of `limit()` for the readout (no budget consumed).
- Run the app: open `/inspector`; "Upstash up?" green; the panel shows `signin → ip:<addr> → 10/10`, `signup → ip:<addr> → 5/5`, `reset → ip:<addr> → 3/3`, `reset → email:<active-email> → 3/3`. "Spam sign-in" still errors (action stub unwrapped) but the readout is operational.

Senior calls and watch-outs:

- Module scope is load-bearing. The library caches `pending` writes and counters in process memory; declaring inside the handler defeats both. A sustained hot key would otherwise hit Redis on every request.
- Each limiter gets its own `ephemeralCache: new Map()`. Sharing one across limiters works but blurs eviction.
- `analytics: true` adds one extra write per call (the rolling counter for the dashboard). The `pending` promise is the deferral seam — wired in 15.4.4.
- Prefix discipline: distinct prefixes so two limiters cannot collide on a shared key. Cross-app collisions are prevented by per-database scope (each project gets its own Upstash database).
- `getRemaining(key)` does **not** consume budget. Using `limit(key)` for the readout would burn one budget per render and lock the user out via the panel itself.
- Budget choices (10/min, 5/10m, 3/15m) are senior calls from 15.3.3: sign-in tolerates more attempts (legitimate typos); reset is tightest because the abuse cost is concrete (inbox noise + Resend deliverability).

Codebase state at entry: `redis.ts`, `rate-limit.ts`, the two env entries empty; inspector "Remaining tokens" reads `n/a`.
Codebase state at exit: env validated, Redis client wired, three limiters declared at module scope; inspector's "Remaining tokens" reads live for the active identity. **Runnable — the limiters exist and the inspector verifies state from Redis; no endpoint is gated yet.**

Estimated student time: 40 to 55 minutes.

---

## Lesson 15.4.4 — Gate the actions: dual-keying, headers, fail-open

Fills `keys.ts`, `safe-limit.ts`, and `rate-limit-headers.ts`; wraps sign-in with per-IP-and-per-email gates, sign-up with per-IP, and reset with per-IP-plus-per-email; flips Better Auth's built-in limiter off; and hands each `pending` to `after()`.

Goals:

- Fill `src/lib/keys.ts`: `getClientIp(headers)` and `normalizeEmail(email)` per reference. Two pure functions. Surface the senior call on `+`-alias stripping inline.
- Fill `src/lib/safe-limit.ts`: `safeLimit(limiter, key)` per reference. The catch logs `{ event: 'rate_limit_unavailable', limiter: limiter.prefix, key }` via `logRateLimit` and returns `{ success: true, ... }` so call sites have one branch. The failure mode is observable in the log, not in user behavior. Real production logging goes through 20.1's structured logger; the starter's `logRateLimit` writes to the `rate_limit_log` table the inspector tails.
- Fill `src/lib/rate-limit-headers.ts`: `rateLimitHeaders(result)` (three headers, Reset as delta-seconds) and `rateLimitedResponse(result)` (429, four headers including `Retry-After`, user-safe identical body).
- Edit `src/app/(auth)/sign-in/actions.ts` per reference: keep the 9.5 `(state, formData)` `useActionState` callback shape returning `Result<never, 'invalid-credentials' | 'email-not-verified' | 'rate-limited'>`. Zod parse (`z.strictObject({ email: z.email(), password: z.string().min(1), next: z.string().optional() })`); resolve `ip` and `email`; `safeLimit(signInLimiter, 'ip:' + ip)` first, attach `rateLimitHeaders` + `Retry-After` via Next.js 16's server-action `headers()` API and return `Result.err('rate-limited')` on rejection; then `safeLimit(signInLimiter, 'email:' + email)`, same treatment on rejection; call `auth.api.signInEmail`. On success attach `rateLimitHeaders(ipLimit)` and `redirect(sanitizeNext(formData.get('next')) ?? '/dashboard')`. Hand both `pending` promises to `after()`.
- Edit `src/app/(auth)/sign-up/actions.ts` per reference: one `safeLimit(signUpLimiter, 'ip:' + ip)` gate, then `auth.api.signUpEmail`.
- Edit `src/app/(auth)/reset/actions.ts` per reference: `safeLimit(resetLimiter, 'ip:' + ip)` then `safeLimit(resetLimiter, 'email:' + email)`, then `auth.api.forgetPassword`.
- Flip Better Auth's built-in limiter off: `rateLimit: { enabled: false }` in `src/lib/auth.ts`. The application-level limiters are now the one place. Add a one-line comment naming the architectural rule for future readers.
- Run the app: open `/inspector`; "Spam sign-in" produces 11 log entries — 10 are 401 with `RateLimit-Remaining` counting 9 → 0, the 11th is 429 with `Retry-After`. The 429 body reads exactly the user-safe message. "Remaining tokens" updates after the burst. "Force Upstash down" toggle on → the next 15 sign-in attempts all return 401 (fail-open) and the structured-log tail captures 15 `rate_limit_unavailable` rows.

Senior calls and watch-outs:

- Gate before work. The two `safeLimit` calls run **before** `auth.api.signInEmail`. Putting them after pays the password-hash cost on every request even past the budget — the "Gate after work" inspector toggle is the deliberate failure-mode demo for 15.4.5.
- Both sign-in gates must pass. Checking `success` on only one leaves the other vector open: per-IP alone misses credential stuffing across IPs; per-email alone is the lockout vector. The two-`if` shape (early return on each `!success`) is the structural enforcement.
- The 429 body is identical across both gates. Returning `"IP rate-limited"` vs. `"email rate-limited"` leaks which gate tripped, and per-email leaks confirms the email exists. The "Distinct 429 bodies" toggle surfaces the leak; production never ships that variant.
- The `pending` promise must be handled or the analytics write is lost on cold shutdown. `after()` (from `next/server`) is the 2026 way — let the response flush while analytics continue. `await ipLimit.pending` on the response path adds 5-10ms.
- `safeLimit` is the one place the fail-open policy lives. Flipping to fail-closed for a higher-stakes future endpoint is a one-line change here — or, more honestly, a second `safeLimitClosed` helper exported alongside so the choice is named per call site.
- Disabling Better Auth's built-in is the deliberate swap. With it on, two limiters compete (in-memory inside Better Auth, Upstash in the action) — different budgets, different keys, debugging hell. Off, the action wrapper is the one place. The `secondary-storage` adapter (Better Auth 1.5+) that would point the built-in at Upstash is named in 15.3.3 as an alternative; not the chapter's choice (the application-level pattern is the more flexible seam for non-auth endpoints later).
- Trust boundary on `x-forwarded-for`: Vercel sets it correctly. On self-hosted (Fly, Railway, VPS), trust requires gating at the load balancer. `'unknown'` as the IP fallback means a single key for every unidentifiable request — overly tight in aggregate; rejecting when `x-forwarded-for` is absent in production is the senior call deferred to 17.2.
- The `email:` key uses the normalized email. The same normalization runs at the database lookup so limiter and lookup count the same identifier. Tightening to strip `+` is a per-app senior decision: Gmail's `+` aliasing lets a crawler bypass per-email by varying `+rand`; the trade-off is stripping incorrectly on `+`-supporting providers that treat aliases as distinct mailboxes. The chapter's default is trim + lowercase only.

Codebase state at entry: limiters declared, no action wraps, every endpoint unprotected.
Codebase state at exit: three actions wrapped (sign-in with dual-keying, sign-up + reset documented strategies), Better Auth built-in off, headers on every response, fail-open on Upstash outage, `pending` handed to `after()`, `rate_limit_log` populated. **Runnable — every inspector "Spam" button produces the expected sequence with the expected headers; the architectural swap is complete.**

Estimated student time: 70 to 90 minutes. The chapter's heaviest lesson — dual-keying, header contract, fail-open, Better Auth swap all land together because each depends on the others to be observable.

---

## Lesson 15.4.5 — Verify against "Done when"

Walks every clause: the 11th-request 429 with `Retry-After`, the cross-IP per-email proof, window resets, opaque 429 bodies, gate-before-work timing, the fail-open log, module-scope cache hits, `pending` off-path, and the Upstash dashboard keys with TTLs.

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution and the surrounding senior commentary.
- **The 11th-request baseline:** "Reset counters"; "Spam sign-in" against `alice` with a wrong password. Log shows 10 entries status 401, `RateLimit-Limit: 10`, `Remaining` declining 9 → 0, `Reset` declining (sliding-window effect). Entry 11 → 429, body `{"error":"Too many attempts. Please try again later."}`, `Remaining: 0`, `Retry-After: <≤60>`. The panel shows `signin → ip:<addr> → 0/10` with countdown.
- **Cross-IP per-email proof:** spoof `x-forwarded-for`; "Send one" against `alice` (wrong password). 401 with `Remaining: 9` on the `ip:` gate (fresh) but `Remaining: <9-prev>` on the `email:` gate (the inspector renders both header sets). Repeat from the new IP until the email gate hits 0 → next request is 429, log line `key: 'email:alice@example.com'`. The per-email gate caught the across-IPs vector — the chapter's load-bearing proof.
- **Window reset:** after the 429s, wait until `Retry-After` reaches 0 (or "Reset counters"). Send one → 401 with `Remaining: 9` (fresh window).
- **Sign-up per-IP only:** "Spam sign-up" with 6 random-suffix emails; request 6 is 429 with `key: 'ip:<addr>'`. Five different emails accepted — per-email could not have been the gate.
- **Reset per-IP and per-email:** "Spam reset" against `eve@example.com` 4x from one IP; request 4 is 429 with `key: 'email:eve@example.com'`. Switch IP; "Send one" → still 429 (per-email didn't reset). `MOCK_EMAIL_SENT_COUNT` ticked by 3 — the three successes triggered `sendResetPasswordEmail`; the 4th and the cross-IP attempt did not.
- **Header completeness:** every log entry shows the three `RateLimit-*` headers; 429s also show `Retry-After`. Successful responses include the headers from the per-IP limiter.
- **Body opacity (the leak demo):** flip "Distinct 429 bodies" on; rerun spam; the rejection body now reads `"Email rate-limited"` or `"IP rate-limited"`. Information leak visible. Flip off → opaque again. The user-safe contract is enforced by the helper, not by the call site.
- **Gate-before-work (other load-bearing failure):** flip "Gate after work" on; spam sign-in; timing panel shows every request paying ~80-150ms hash cost — even the 11th, 12th, 20th. Flip off; the 11th+ requests skip the hash (timing collapses to ~5-15ms — Upstash round-trip alone).
- **Per-email-gate-disabled (cross-IP attack reproducer):** flip "Disable per-email gate" on; "Distinct IPs runner" simulates 10 wrong-password attempts against `alice` from IP-A, then 10 from IP-B. All 20 reach `auth.api.signInEmail`; both per-IP gates fresh. Flip off; rerun; the 11th attempt overall trips the `email:` gate. The dual-keying value is the diff between the two runs.
- **Fail-open under outage:** flip "Force Upstash down" on; spam sign-in 15x; every request 401 (limiter fails open, request reaches Better Auth); structured-log tail shows 15 `rate_limit_unavailable` rows. A sustained run of these is a Upstash incident; alerting lives in 20.1.
- **Better Auth built-in disabled:** open `src/lib/auth.ts`; `rateLimit: { enabled: false }` is the only entry. Two limiters competing on the same surface is debugging hell; one place is the rule.
- **Module-scope cache hits:** request-trace panel shows the first request after cold start hitting Redis (one round-trip per `limit()` call); subsequent requests within the in-memory window hit `ephemeralCache` (zero Redis round-trips).
- **`pending` off-path:** flip "Await pending instead of after()" on; user-visible response time inflates by 5-10ms per call. Flip off; baseline. The 2026 `after()` pattern (5.2) is the off-path flush.
- **Upstash dashboard:** click the dashboard panel → Data Browser → filter `rl:`; keys present with TTLs ≤ their window. Analytics tab → rejection blips for the spam runs visible per prefix. The dashboard is the operator's incident-review surface; the structured-log tail is the in-app development-time analog.
- **Env-gates-Redis:** comment out `UPSTASH_REDIS_REST_URL` in `.env.local`; restart → Zod validation fails the boot. Uncomment → boots. The runtime gate from 1.4.5 prevents a deploy without the limiter.
- Name the senior calls one more time:
  - Application-level rate limiting is non-negotiable from the public URL onward; Better Auth's built-in is off because the application-level pattern is the one place.
  - Three limiters at module scope, distinct prefixes, `ephemeralCache` per limiter, `analytics: true`.
  - Sign-in gates per-IP **and** per-email through one limiter with two key prefixes; both must pass.
  - The limiter runs before the password hash and the database lookup.
  - The 429 body is identical across gates; the structured log carries the diagnosis.
  - `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every response; `Retry-After` adds on rejection.
  - `safeLimit` owns the fail-open policy; flipping to fail-closed is a one-place decision.
  - `pending` handed to `after()` keeps analytics off the response path.
  - `getClientIp` trusts the platform's `x-forwarded-for`; non-Vercel hosts gate trust at the load balancer.
  - `normalizeEmail` runs the same normalization the database lookup runs.
  - Zod-validated env vars gate the limiter — boot fails fast on missing credentials.
- Forward references:
  - 15.3.4 chapter quiz — the topics covered here.
  - 12.1 / 12.3 — webhook receivers carry the same shape (per-Stripe-webhook-ID, per-origin keys).
  - 13.3 / 23 — file uploads and AI generation endpoints copy the pattern with per-user / per-org keys.
  - 17.2 — security baseline audit; the limiter coverage is one of the checkpoints.
  - 19.3 — integration tests for `RateLimit-*` and the 429 path.
  - 20.1 — structured logs; `rate_limit_log` is the production-dashboard analog.
  - Unit 22 — the "Upstash earns three more workloads" promise (cache, session-shaped tokens, dispatcher pub/sub) cashes in as triggers fire.

Senior calls and watch-outs:

- The verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- The cross-IP per-email proof must use the inspector's `x-forwarded-for` spoof, not real network changes — the spoof is the deterministic version of the attack.
- The fail-open demo runs as its own dedicated step; flipping the toggle mid-verification is confusing.
- After the chapter, spam-burst keys live in Upstash for up to the window's TTL. Resetting counters before walking away is the cleanup courtesy on a shared free-tier database.

Codebase state at entry: full limiter wiring, three actions wrapped, Better Auth built-in off, inspector verifying surface live.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`Redis.fromEnv`, three module-scope `Ratelimit` instances, sliding-window default, `prefix` discipline, dual-keying with two prefixes through one limiter, `getClientIp` + `normalizeEmail`, `safeLimit` fail-open, `rateLimitHeaders`, `rateLimitedResponse`, `after()` for `pending`, Better Auth built-in disabled) and which forward unit will lean on each.

Estimated student time: 35 to 50 minutes.
