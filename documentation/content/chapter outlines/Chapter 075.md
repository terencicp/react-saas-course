# Chapter 075 — Project: Upstash rate limits on the auth surface

## Chapter framing

Chapter 075 cashes in chapter 074 — the public-URL-plus-auth trigger (lesson 1 of chapter 074), the Upstash primitives and sliding-window default (lesson 2 of chapter 074), the three module-scope limiters, dual-keying, `RateLimit-*` headers, user-safe 429 body, fail-open policy, and the Better-Auth-built-in replacement (lesson 3 of chapter 074) — as one runnable surface on the chapter 055 email+password auth flows. The student writes `lib/rate-limit.ts` (three module-scope `Ratelimit` instances), `lib/keys.ts` (`getClientIp`, `normalizeEmail`), `safeLimit(limiter, key)` (fail-open wrapper), `rateLimitHeaders(result)` (IETF-draft headers), and wraps sign-in / sign-up / reset at the action seam — sign-in with per-IP **and** per-email dual gates. Better Auth's built-in limiter is turned off.

The build is a UI-and-data-layer project, so every requirement is a behavior the student watches happen on `/inspector` or an operator-observable fact in Redis: a 429 firing on the 11th request with the right headers and an opaque body, the "Remaining tokens" panel counting down, the structured-log tail growing, and the Upstash Data Browser holding the keys with TTLs. Each build closes runnable: lesson 2 ends with limiters declared and the inspector's "Remaining tokens" panel live; lesson 3 ends with sign-in dual-gated, 429s firing with correct headers and body, and Better Auth's built-in off; lessons 4 and 5 add the sign-up and reset gates.

### Project goals (the "Done when" the student is building toward)

The finished surface satisfies every clause below; each Implementation lesson owns the clauses its capability proves, and the lesson's "Moment of truth" is where the student confirms them.

- The 11th sign-in request from the same IP within one minute returns 429; requests 1-10 return 401 (Better Auth, wrong password) with `RateLimit-Remaining` counting 9 → 0.
- The same email from a different IP is throttled separately on the per-email gate — the 11th cross-IP attempt against one address returns 429 with `key: 'email:alice@example.com'`, proving the per-email gate closes the cross-IP credential-stuffing vector.
- Every response carries `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; 429s also carry `Retry-After`.
- Every 429 body reads exactly `{"error":"Too many attempts. Please try again later."}`, identical regardless of which gate tripped (no information leak).
- After a 429, once the window resets (or counters are cleared), the next request returns 401 again with `Remaining: 9` — window resets release tokens.
- The Upstash dashboard shows the keys: `rl:signin:ip:<addr>` and `rl:signin:email:alice@example.com` present in the Data Browser with TTLs ≤ their window, and the Analytics tab shows the rejection blip.
- Sign-up is rate-limited per-IP: 6 attempts with random-suffix emails return 429 on the 6th, with five different emails accepted (per-email could not have been the gate).
- Reset is rate-limited per-IP and per-email: 4 attempts against `eve@example.com` return 429 on the 4th (`limiter: 'reset'`, `key: 'email:eve@example.com'`), and the gate survives an IP switch.
- The gate runs before the password hash: with "Gate after work" off, the 11th+ requests skip the hash (`verify_ms ≈ 0`); with it on, every request pays the hash even past the budget.
- Better Auth's built-in limiter is off — the only `rateLimit` entry in `lib/auth.ts` is `{ enabled: false }`.
- The limiter fails open under an Upstash outage: with "Force Upstash down" on, 15 spammed sign-ins all proceed and the structured-log tail shows 15 `rate_limit_unavailable` rows.
- Module-scope declaration is load-bearing: the first request after a cold start hits Redis once per `limit()` call; subsequent requests within the cache window hit `ephemeralCache` with zero Redis round-trips, visible in the request-trace panel.
- `pending` analytics are flushed off-path via `after()` — awaiting `pending` on the response path instead adds 5-10ms per call.
- Env validation gates Redis usage: commenting out `UPSTASH_REDIS_REST_URL` fails the boot with the Zod error.

### Cross-cutting design rules (thread through every lesson)

- The limiter is a named seam — call sites import from `lib/rate-limit.ts`, never construct inline.
- Module-scope declaration is load-bearing: the in-memory `ephemeralCache` only survives across hot invocations when the instance is reused.
- Sign-in runs two `limit()` calls — `ip:<addr>` and `email:<normalized>`, both must pass, cheaper first.
- Gating runs **before** the password hash and the database lookup.
- The 429 body is identical regardless of which gate tripped (no information leak).
- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` ship on every response; `Retry-After` adds on rejection.
- `pending` analytics are handed to `after()` (from `next/server`) so the user response is not blocked.
- `safeLimit` wraps every `limit()` call so a Redis outage logs a structured event and fail-opens on the auth path.
- Better Auth's built-in `rateLimit: { enabled: false }` — replacing the in-memory limiter with the application-level limiter is the architectural point.
- The inspector's "Spam X" buttons hammer endpoints deterministically so the 11th-as-429-with-headers is the on-page reading every Moment of truth uses.

### Dependency carry-in

- **From chapter 055:** Better Auth catch-all at `app/api/auth/[...all]/route.ts`; the `auth` instance in `src/lib/auth.ts` with email+password, verification, reset; `sendVerificationEmail` / `sendResetPasswordEmail` wired to `lib/email.ts` (mocked — bumps `MOCK_EMAIL_SENT_COUNT`); `proxy.ts` gate; `/dashboard`; sign-out action; seeded `alice@example.com` with a known password.
- **From lesson 1 of chapter 053 / lesson 2 of chapter 053 / lesson 4 of chapter 053:** `auth.api.signUpEmail`, `auth.api.signInEmail`, `auth.api.forgetPassword` — the student wraps these at the action boundary.
- **From lesson 1 of chapter 074:** the public-URL-plus-auth trigger; two-layer architecture (edge WAF + application limiter); fail-open-on-auth policy.
- **From lesson 2 of chapter 074:** `Redis.fromEnv()`; the `Ratelimit` constructor (`redis`, `limiter`, `prefix`, `analytics`); `Ratelimit.slidingWindow(max, window)`; `{ success, limit, remaining, reset, pending }` shape; IETF `RateLimit-*` headers; module-scope rule; `ephemeralCache`.
- **From lesson 3 of chapter 074:** dual-keying (`ip:` and `email:` prefixes through one limiter); gate-before-work; user-safe 429 body; `safeLimit` fail-open; Better-Auth-built-in replacement; `getClientIp`; `normalizeEmail` (trim + lowercase, no `+` strip).
- **From chapter 041 (origin lesson 2 of chapter 037):** `src/env.ts` with Zod-validated env — extended with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **From chapter 043 + chapter 047:** Result shape, Zod 4 `strictObject` at the action boundary, `'use server'`.
- **From chapter 009:** `RateLimitError` subclass (`RATE_LIMITED`).
- **From chapter 092 (foreshadowed):** structured log shape `{ event: 'rate_limit_rejected' | 'rate_limit_unavailable', limiter, key, remaining, reset }`.

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
    auth.ts                     # provided from chapter 055; TODO student disables built-in rateLimit
    auth-client.ts              # provided
    email.ts                    # provided: mocked in inspector mode (MOCK_EMAIL_SENT_COUNT)
    redis.ts                    # TODO student: Redis.fromEnv() one-liner
    rate-limit.ts               # TODO student: three Ratelimit instances
    keys.ts                     # TODO student: getClientIp + normalizeEmail
    safe-limit.ts               # TODO student: fail-open wrapper + structured log
    rate-limit-headers.ts       # TODO student: rateLimitHeaders + rateLimitedResponse
    rate-limit-log.ts           # provided: logRateLimit helper writing to rate_limit_log
    errors.ts                   # provided: RateLimitError subclass (chapter 009)
  app/
    (auth)/
      sign-in/page.tsx          # provided shell from chapter 055
      sign-in/actions.ts        # provided from chapter 055; TODO student wraps with dual-keying
      sign-up/page.tsx          # provided shell
      sign-up/actions.ts        # provided from chapter 055; TODO student wraps per-IP
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
  - `normalizeEmail(email: string): string` — `email.trim().toLowerCase()`. No `+`-alias stripping (lesson 3 of chapter 074).
- **Safe-limit wrapper** (`src/lib/safe-limit.ts`):
  - `safeLimit(limiter, key): Promise<RatelimitResponse>` — `try { return await limiter.limit(key); } catch (err) { logRateLimit({ event: 'rate_limit_unavailable', limiter: limiter.prefix, key }); return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }; }`.
  - The fail-open policy is the one-place decision; flipping to fail-closed is a one-line change here.
- **Header helpers** (`src/lib/rate-limit-headers.ts`):
  - `rateLimitHeaders(result)` — `{ 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset' }` (Reset as delta-seconds via `Math.ceil((result.reset - Date.now()) / 1000)`).
  - `rateLimitedResponse(result): Response` — 429, the three headers plus `Retry-After: <delta-seconds>`, body `{"error":"Too many attempts. Please try again later."}`. Identical body regardless of gate.
- **Sign-in action** (`src/app/(auth)/sign-in/actions.ts`): `signInAction(state, formData)` returning `Result<never, 'invalid-credentials' | 'email-not-verified' | 'rate-limited'>` — Zod parse; resolve `ip` and `email`; `ipLimit = await safeLimit(signInLimiter, 'ip:' + ip)`; on `!success` attach `rateLimitHeaders(ipLimit)` + `Retry-After` via Next.js 16's server-action `headers()` API and return `Result.err('rate-limited')`; same for `emailLimit = await safeLimit(signInLimiter, 'email:' + email)`; call `auth.api.signInEmail`; on success attach `rateLimitHeaders(ipLimit)` and `redirect(sanitizeNext(formData.get('next')) ?? '/dashboard')`. `after(ipLimit.pending)` + `after(emailLimit.pending)` flush analytics off-path (Next.js 16 `after()` from `next/server`).
- **Sign-up action** (`src/app/(auth)/sign-up/actions.ts`): one `safeLimit(signUpLimiter, 'ip:' + ip)` gate, then `auth.api.signUpEmail`. Per-IP only — the email is the attacker's choice (lesson 3 of chapter 074).
- **Reset action** (`src/app/(auth)/reset/actions.ts`): `safeLimit(resetLimiter, 'ip:' + ip)` then `safeLimit(resetLimiter, 'email:' + email)`; the per-email gate protects victim's inbox + Resend cost. Calls `auth.api.forgetPassword` on success.
- **Better Auth built-in disabled** (`src/lib/auth.ts`): inside `betterAuth({...})`, set `rateLimit: { enabled: false }`. Application-level limiters at the action boundary are the one place.
- **`env.ts` extension:** `UPSTASH_REDIS_REST_URL: z.string().url()`, `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)`. Boot fails fast on missing vars.

### Inspector page spec

Single Server Component at `/inspector`. Reads server-side from Upstash; refreshes via `router.refresh()` and Server Actions. Provided in full — the student writes only `redis.ts`, `rate-limit.ts`, `keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`, and the three action wrappers. The Project Overview's Starting file tree marks it as a provided focus file; the lessons that light up each panel describe the panel where they first use it.

- **Header:** session-user switcher (`alice` / `bob` / unauthenticated); "Reset Upstash counters" Server Action via a starter-provided `clearLimiterKeys()` helper — the inspector tracks touched keys in a `seen-keys` Redis set because Upstash REST has no `SCAN`.
- **"Remaining tokens" panel:** live readouts for `rl:signin` (per-IP and per-email for the active identity), `rl:signup` (per-IP), `rl:reset` (per-IP and per-email). Each row shows `prefix`, `key`, `remaining`, `limit`, `reset` countdown. Reads via `limiter.getRemaining(key)` — no budget consumed.
- **"Spam X" buttons:** "Spam sign-in" runs `signInAction` 11x against `alice` with a wrong password; "Spam sign-up" runs `signUpAction` 6x with random-suffix emails (per-IP is the gate); "Spam reset" runs `resetAction` 4x against `eve@example.com` (4th trips the per-email gate).
- **"Send one" buttons:** non-spamming single-call versions of each endpoint — used in Moment of truth to walk request 1 through 11 and watch `RateLimit-Remaining` decline.
- **Recent-responses log:** last 20 calls — `endpoint`, `status`, the three `RateLimit-*` headers, `Retry-After`, truncated body.
- **"Force Upstash down" toggle:** when on, `lib/redis.ts` swaps to a mocked client that throws `UpstashConnectionError`. Verifies `safeLimit` fail-open — every call logs `rate_limit_unavailable` and the request proceeds.
- **Structured-log tail:** Server Component reading the last 20 rows from `rate_limit_log` (`{ event, limiter, key, remaining, reset, firedAt }`). The operator-honest surface from lesson 3 of chapter 074.
- **Failure-mode toggles:** "Gate after work" (runs `auth.api.signInEmail` **before** `safeLimit`); "Disable per-email gate" (skips the `email:` call — paired with a "Distinct IPs runner" that spoofs `x-forwarded-for`); "Distinct 429 bodies" (rejection body leaks "Email rate-limited" vs. "IP rate-limited").
- **Upstash dashboard panel:** deep link to the project's Upstash console derived from the REST URL.

### Concepts demonstrated → owning lesson

- Public-URL-plus-auth trigger and two-layer architecture — lesson 1 of chapter 074.
- Upstash Redis as the 2026 default for the application limiter — lesson 1 of chapter 074.
- `Redis.fromEnv()` and the connectionless HTTP/REST client — lesson 2 of chapter 074.
- Module-scope `Ratelimit` declaration and `ephemeralCache` — lesson 2 of chapter 074.
- Sliding-window as the default algorithm — lesson 2 of chapter 074.
- `{ success, limit, remaining, reset, pending }` return shape — lesson 2 of chapter 074.
- IETF `RateLimit-*` headers, `Retry-After` precedence — lesson 2 of chapter 074 + lesson 3 of chapter 074.
- `prefix` namespacing and key design (`ip:` / `email:`) — lesson 2 of chapter 074 + lesson 3 of chapter 074.
- Dual-keying rule on sign-in — lesson 3 of chapter 074.
- Gate-before-work order — lesson 3 of chapter 074.
- User-safe 429 body, operator-honest log — lesson 3 of chapter 074.
- Fail-open policy via `safeLimit` — lesson 3 of chapter 074.
- Replacing Better Auth's built-in limiter — lesson 3 of chapter 074.
- `getClientIp` + `x-forwarded-for` trust boundary — lesson 3 of chapter 074.
- `normalizeEmail` (trim + lowercase) — lesson 3 of chapter 074.
- `after()` for `pending` analytics flush — lesson 2 of chapter 074 + Next.js 16 (chapter 030).
- Zod-validated env — lesson 2 of chapter 037.
- `RateLimitError` subclass — chapter 009.

---

## Lesson 1 — Project Overview

Take the chapter 055 email+password auth surface and instrument sign-in, sign-up, and reset with `@upstash/ratelimit` at the action boundary, then watch every gate fire on `/inspector` and in the Upstash dashboard.

The finished app is the chapter 055 auth flows with three Upstash limiters layered on at the action seam: sign-in dual-gated per-IP and per-email, sign-up and reset per-IP (reset also per-email), every response carrying `RateLimit-*` headers, rejections carrying `Retry-After`, a Redis outage failing open and logging alertable events, and Better Auth's built-in limiter off. The screenshot shows `/inspector` after a finished "Spam sign-in": the recent-responses log with ten 401s counting `RateLimit-Remaining` 9 → 0 and the 11th flipping to 429 with `Retry-After`, alongside the Upstash dashboard showing the keys.

### What we'll practice

- Wrapping an existing auth surface with an application-level rate limiter at the Server Action seam, without touching the auth core.
- Designing limiter keys: dual-keying sign-in per-IP and per-email through one limiter with two prefixes; choosing per-IP-only vs. per-IP-plus-per-email per endpoint.
- Making rejection observable and safe: IETF `RateLimit-*` headers on every response, `Retry-After` on 429, an opaque user-facing body, and an operator-honest structured log.
- Building for resilience: fail-open on a Redis outage, module-scope limiters with in-memory caching, and `after()` for off-path analytics.
- Swapping Better Auth's built-in limiter for the application-level pattern as a deliberate architectural decision.

This is the canonical limiter shape every other abusable endpoint copies — webhook receivers, file uploads, AI generation. Adding a fourth limiter is one new `Ratelimit` instance plus one action wrap; same headers, same fail-open. `safeLimit` and `rateLimitHeaders` are the seam.

**Out of scope** (named here, deferred): no per-user or per-org limits beyond auth; no Vercel WAF rule configuration (named in lesson 1 of chapter 074, the dashboard wiring is two clicks); no captcha (the next layer past the limiter for human abuse); no `Ratelimit.deny()` blocklist (named in lesson 2 of chapter 074); no multi-region Upstash replication; no Playwright assertions on `RateLimit-*` (deferred to chapter 088); no migration to Better Auth `secondary-storage` (named in lesson 3 of chapter 074 as the alternative, not chosen). The `/api/auth/[...all]` catch-all stays unwrapped — limits land at the action seam that calls `auth.api.*` directly; route-handler-level limits as defense-in-depth are named, deferred.

### Architecture

Two-layer model carried in from lesson 1 of chapter 074: the edge WAF (out of scope here) and the application limiter (the build). Request flow for a gated action: form post → Server Action → resolve `ip` + normalized `email` → `safeLimit` gate(s) on the shared limiter → on pass, `auth.api.*`; on reject, `Result.err('rate-limited')` with headers attached. `pending` analytics flush via `after()`. Better Auth's built-in limiter is off, so the action wrapper is the single enforcement point. A labeled list or simple diagram of this flow, shape only.

### Starting file tree

Use the annotated tree from the Chapter framing's "Starter file tree" section. Comment one line each only on the files lessons touch; mark the six TODO stubs (`env.ts` Upstash entries, `redis.ts`, `rate-limit.ts`, `keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`) and the three provided-but-to-be-wrapped action files as the highlighted focus. Call out the provided `/inspector` page as the verification surface every Moment of truth uses, the still-on Better Auth built-in limiter in `auth.ts`, the seeded `alice` / `bob` / `eve` accounts, the mocked `email.ts` counter (`MOCK_EMAIL_SENT_COUNT`), and the provided `rate_limit_log` table with its `logRateLimit` helper. Leave the rest uncommented.

### Roadmap

One Card per lesson:

- **Lesson 2 — Declare the Redis client and three module-scope limiters.** Adds the Redis client and the three `Ratelimit` instances so the inspector's "Remaining tokens" panel reads live.
- **Lesson 3 — Gate sign-in with dual-keying and swap out Better Auth's built-in.** Adds the helper trio and the per-IP-and-per-email sign-in gate, with the architectural swap, so the 11th request returns a 429 with correct headers and an opaque body.
- **Lesson 4 — Gate sign-up per-IP.** Adds the per-IP sign-up gate so a single host cannot mass-register.
- **Lesson 5 — Gate reset per-IP and per-email.** Adds the per-IP-plus-per-email reset gate so a victim's inbox and Resend cost are protected across IPs.

### Setup

- Link the starter and clone it via `degit`.
- Provision Upstash: the Vercel Marketplace integration is the recommended path; for local-only, create a free database in the Upstash dashboard and copy the REST URL and token. The free tier covers the project. Env vars: `UPSTASH_REDIS_REST_URL` (Upstash REST endpoint, from the database's REST API panel) and `UPSTASH_REDIS_REST_TOKEN` (the read/write token from the same panel), plus the chapter 055 vars already in `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `APP_URL`).
- Command sequence (Steps): clone via `degit`; install deps with `pnpm install`; start Postgres with `docker compose up -d`; copy `.env.example` to `.env.local` and fill the values; run `pnpm db:migrate`; run `pnpm db:seed`; run `pnpm dev`.
- Expected result: `pnpm dev` serves the chapter 055 auth flows working end-to-end — signing in as `alice` redirects to `/dashboard`. `/inspector` loads, but the "Remaining tokens" panel reads `n/a` and the "Spam X" buttons throw on use, because the limiters and action wrappers do not exist yet.

The student leaves with the starter running locally and the inspector loaded but inert. Building begins in lesson 2.

---

## Lesson 2 — Declare the Redis client and three module-scope limiters

Stand up the Redis client and the three `Ratelimit` instances so the inspector reports each limiter's live remaining budget straight from Redis.

The finished result: `/inspector` shows a green "Upstash up?" badge and a "Remaining tokens" panel reading `signin → ip:<addr> → 10/10`, `signup → ip:<addr> → 5/5`, `reset → ip:<addr> → 3/3`, and `reset → email:<active-email> → 3/3` for the active identity. No endpoint is gated yet — the panel reads state, it does not consume budget.

### Your mission

This lesson stands up the limiter infrastructure without wiring it to any endpoint yet, so the only observable change is the inspector reporting live budgets instead of `n/a`. The limiter is a named seam: `lib/rate-limit.ts` is the one and only place `new Ratelimit(...)` is allowed to appear, because constructing inline anywhere else defeats the in-memory `ephemeralCache` and corrupts the prefix namespace. Module scope is load-bearing — the library caches `pending` writes and counters in process memory, so declaring inside a handler defeats both and makes a sustained hot key hit Redis on every request. Each limiter gets its own `ephemeralCache: new Map()` (sharing one across limiters works but blurs eviction) and a distinct prefix (`rl:signin`, `rl:signup`, `rl:reset`) so two limiters cannot collide on a shared key; cross-app collisions are already prevented by per-database scope. `analytics: true` adds one rolling-counter write per call for the dashboard; its `pending` promise is the deferral seam wired in a later lesson. The inspector reads each budget through `getRemaining(key)`, which does **not** consume budget — using `limit(key)` for a readout would burn a token per render and lock the user out via the panel itself. The budget choices are senior calls carried in from lesson 3 of chapter 074: sign-in tolerates more attempts (legitimate typos) at 10/min, sign-up sits at 5/10m, and reset is tightest at 3/15m because its abuse cost is concrete (inbox noise plus Resend deliverability). The Zod-validated env from lesson 2 of chapter 037 is the prerequisite gate — adding the two Upstash vars makes a missing credential fail the boot rather than surface at the first request. Out of scope: no gating, headers, or fail-open handling yet (those arrive once an action exercises the limiter).

Requirements checklist:

- [ ] Restarting the dev server with either Upstash env var missing fails the boot with the Zod error; with both present, it boots.
- [ ] The inspector's "Upstash up?" badge reads green (a `redis.ping()` health-check succeeds against the live database).
- [ ] The "Remaining tokens" panel reads live for the active identity: `signin → ip:<addr> → 10/10`, `signup → ip:<addr> → 5/5`, `reset → ip:<addr> → 3/3`, `reset → email:<active-email> → 3/3`.
- [ ] Re-rendering the inspector (`router.refresh()`) does not decrement any budget — reading the panel never consumes a token.
- [ ] Each limiter's keys carry its own prefix in Redis (`rl:signin`, `rl:signup`, `rl:reset`), with no collision between limiters.

### Coding time

Build prompt: implement `src/env.ts` (the two Upstash entries), `src/lib/redis.ts`, and `src/lib/rate-limit.ts` against the brief and the tests; this lesson gates no endpoint, so the inspector's "Remaining tokens" panel is the surface that confirms the work.

Solution in `<details>`: the `env.ts` extension (`UPSTASH_REDIS_REST_URL: z.string().url()`, `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)`); `redis.ts` as `export const redis = Redis.fromEnv();` plus a small `redis.ping()` health-check the badge reads; `rate-limit.ts` with the three module-scope `Ratelimit` instances per the reference signatures. Rationale to cover: why module scope and per-limiter `ephemeralCache`, why distinct prefixes, why `getRemaining` rather than `limit` for the readout, and the budget choices. Link to lesson 2 of chapter 074 for the `Ratelimit` constructor and `ephemeralCache` rather than re-explaining; link to lesson 2 of chapter 037 for the env pattern.

### Moment of truth

Run the lesson's test suite (the command and the expected pass output). Then confirm by hand, ticking each off: restart `dev` with `UPSTASH_REDIS_REST_URL` commented out → boot fails with the Zod error; uncomment → boot succeeds. Open `/inspector` → "Upstash up?" is green; the "Remaining tokens" panel reads the four rows above. Click "Spam sign-in" → it still throws (the action stub is not wrapped yet), confirming this lesson only stood up state, not gating. The request-trace panel shows the first read hitting Redis and subsequent reads in the cache window hitting `ephemeralCache`.

---

## Lesson 3 — Gate sign-in with dual-keying and swap out Better Auth's built-in

Gate the sign-in action with per-IP and per-email limits so the 11th rapid attempt is rejected with a 429, and make the application limiter the single enforcement point by turning Better Auth's built-in off.

The finished result: on `/inspector`, "Spam sign-in" against `alice` produces ten 401s with `RateLimit-Remaining` counting 9 → 0, then an 11th response that is a 429 with `Retry-After` and the body `{"error":"Too many attempts. Please try again later."}`. The same email hammered from a different (spoofed) IP is still caught on the per-email gate. With "Force Upstash down" on, sign-ins proceed and the structured-log tail fills with `rate_limit_unavailable` rows.

### Your mission

This lesson is where the limiter first meets traffic: sign-in is the dual-keyed endpoint, and wrapping it pulls in the three helper files (`keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`) plus the deliberate swap of Better Auth's built-in limiter, because none of those become observable until a gated action exercises them. The two `safeLimit` calls — `ip:<addr>` then `email:<normalized>`, cheaper first — must run **before** `auth.api.signInEmail`, because gating after the call pays the password-hash cost on every request even past the budget. Both gates must pass: per-IP alone misses credential stuffing spread across IPs, and per-email alone is a lockout vector, so the structural enforcement is an early return on each `!success`. The rejection body is identical across both gates — returning "IP rate-limited" versus "email rate-limited" leaks which gate tripped, and the per-email variant confirms an email exists — so the user-safe contract lives in the `rateLimitedResponse` helper, not at the call site. `safeLimit` is the one place the fail-open policy lives: a Redis outage logs `rate_limit_unavailable` through `logRateLimit` and returns success so the auth path stays up, and flipping to fail-closed is a one-line change there. Each `pending` promise is handed to `after()` (from `next/server`, chapter 030) so analytics flush off the response path; awaiting on the path adds 5-10ms. Two senior trust calls surface in prose: `getClientIp` trusts the platform's `x-forwarded-for` (correct on Vercel; on self-hosted hosts trust is gated at the load balancer, and the `'unknown'` fallback is deliberately loose, with strict rejection deferred to chapter 081), and `normalizeEmail` is trim + lowercase only — stripping `+` aliases is a per-app decision (it closes a Gmail `+rand` bypass but breaks on providers that treat aliases as distinct mailboxes), and the same normalization must run at the database lookup so limiter and lookup count the same identifier. Finally, Better Auth's built-in limiter goes off (`rateLimit: { enabled: false }` in `auth.ts`) with a one-line comment naming the rule: leaving it on means two limiters with different budgets and keys compete on one surface (debugging hell); the application wrapper is the one place, and the `secondary-storage` adapter that would point the built-in at Upstash is the named-but-not-chosen alternative. Keep the chapter 055 `(state, formData)` `useActionState` shape and the `Result` return type. Out of scope: sign-up and reset gates (later lessons).

Requirements checklist:

- [ ] The 11th sign-in from the same IP within one minute returns 429; requests 1-10 return 401 with `RateLimit-Remaining` counting 9 → 0.
- [ ] The same email hammered from a different IP is throttled on the per-email gate — the 11th cross-IP attempt against `alice` returns 429 with `key: 'email:alice@example.com'`, while the per-IP gate for the new IP stays fresh.
- [ ] Every sign-in response carries `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; the 429 also carries `Retry-After`.
- [ ] The 429 body reads exactly `{"error":"Too many attempts. Please try again later."}`, identical whichever gate tripped; toggling "Distinct 429 bodies" on surfaces the leaky variants and off restores the opaque body.
- [ ] With "Gate after work" off, the 11th+ requests skip the password hash (`verify_ms ≈ 0`); with it on, every request pays the hash even past the budget.
- [ ] With "Force Upstash down" on, 15 spammed sign-ins all proceed (fail-open) and the structured-log tail shows 15 `rate_limit_unavailable` rows.
- [ ] After the window resets (or counters are cleared), the next sign-in returns 401 again with `Remaining: 9`.
- [ ] `src/lib/auth.ts` carries `rateLimit: { enabled: false }` as its only `rateLimit` entry, and a successful sign-in still redirects to `/dashboard`.
- [ ] Awaiting `pending` on the response path (the inspector's "Await pending instead of after()" toggle) adds 5-10ms per call versus the `after()` baseline.

### Coding time

Build prompt: implement `src/lib/keys.ts`, `src/lib/safe-limit.ts`, `src/lib/rate-limit-headers.ts`, wrap `src/app/(auth)/sign-in/actions.ts`, and flip `src/lib/auth.ts` against the brief and the tests.

Solution in `<details>`: the two pure functions in `keys.ts`; `safeLimit` with the `try/catch` and `logRateLimit` call per the reference; `rateLimitHeaders` and `rateLimitedResponse` per the reference; the sign-in action with the Zod `strictObject` parse, IP/email resolution, the two ordered `safeLimit` gates with header attachment via Next.js 16's server-action `headers()` API and `Result.err('rate-limited')` on rejection, the `auth.api.signInEmail` call, the success-path header attachment and `redirect`, and both `after(pending)` calls; the `auth.ts` flag flip with its naming comment. Rationale to cover: gate-before-work ordering, the two-gate early-return structure, the one-place fail-open decision, why the body is opaque, and the Better Auth swap. Note the `+`-alias and `x-forwarded-for` trust-boundary calls inline. Link to lesson 3 of chapter 074 for dual-keying, gate-before-work, and the `secondary-storage` alternative; link to chapter 030 for `after()`.

### Moment of truth

Run the lesson's test suite (command and expected pass output). Then confirm by hand, ticking each off:

- "Reset counters"; "Spam sign-in" against `alice` with a wrong password → log shows ten 401s with `RateLimit-Limit: 10` and `Remaining` declining 9 → 0, then entry 11 is a 429 with the opaque body, `Remaining: 0`, and `Retry-After: <≤60>`; the panel shows `signin → ip:<addr> → 0/10`.
- Spoof `x-forwarded-for`; "Send one" against `alice` from the new IP repeatedly → the per-IP gate stays fresh while the per-email gate counts down on the same `alice@example.com`; the 11th overall returns 429 with `key: 'email:alice@example.com'`. This cross-IP per-email proof is the chapter's load-bearing result.
- Toggle "Gate after work" on; spam sign-in → the timing panel shows every request paying ~80-150ms hash cost even past the budget; toggle off → the 11th+ collapse to ~5-15ms (Upstash round-trip alone).
- Toggle "Distinct 429 bodies" on → the leaky "Email rate-limited" / "IP rate-limited" variants appear; toggle off → opaque again.
- Toggle "Force Upstash down" on; spam sign-in 15x → all 401, and the structured-log tail shows 15 `rate_limit_unavailable` rows; toggle off → normal behavior.
- After a 429, wait until `Retry-After` reaches 0 (or "Reset counters"); "Send one" → 401 with `Remaining: 9`.
- Toggle "Await pending instead of after()" on → the user-visible timing inflates 5-10ms per call; toggle off → baseline.
- Open `src/lib/auth.ts` → `rateLimit: { enabled: false }` is the only `rateLimit` entry.

---

## Lesson 4 — Gate sign-up per-IP

Gate the sign-up action with a single per-IP limit so one host cannot mass-register accounts, while each attempt still carries the rate-limit headers.

The finished result: on `/inspector`, "Spam sign-up" with six random-suffix emails returns the 6th as a 429 with `key: 'ip:<addr>'`; the five preceding attempts succeed with different emails, proving the gate is per-IP and not per-email.

### Your mission

Sign-up is the per-IP-only endpoint, and the contrast with sign-in is the whole point: the email on a sign-up request is the attacker's choice, so keying on it would let a single host cycle fresh addresses to defeat the gate — the abusable identity is the originating IP. The single `safeLimit(signUpLimiter, 'ip:' + ip)` gate reuses the helpers and the limiter from earlier lessons; this is the proof that adding an endpoint is one limiter plus one wrap. The same rules carry over: the gate runs before `auth.api.signUpEmail`, the rejection uses the opaque `rateLimitedResponse` body, every response carries the `RateLimit-*` headers (with `Retry-After` on rejection), `safeLimit` keeps the fail-open policy, and `pending` goes to `after()`. Out of scope: any per-email keying on this endpoint (deliberately omitted, and the reason is the requirement below).

Requirements checklist:

- [ ] The 6th sign-up from the same IP within the window returns 429 with `key: 'ip:<addr>'`.
- [ ] Five sign-ups with five different random-suffix emails are accepted, demonstrating the gate is per-IP — varying the email cannot bypass it.
- [ ] Every sign-up response carries `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; the 429 also carries `Retry-After` and the opaque body.
- [ ] With "Force Upstash down" on, spammed sign-ups proceed (fail-open) and log `rate_limit_unavailable`.

### Coding time

Build prompt: wrap `src/app/(auth)/sign-up/actions.ts` against the brief and the tests, reusing `signUpLimiter`, `safeLimit`, and the header helpers.

Solution in `<details>`: the sign-up action with the single per-IP `safeLimit` gate before `auth.api.signUpEmail`, header attachment on both branches, and `after(pending)`, per the reference. Rationale to cover: why per-IP only (the email is attacker-controlled) and how little code a new endpoint adds. Link to lesson 3 of chapter 074 for the per-IP-only reasoning.

### Moment of truth

Run the lesson's test suite (command and expected pass output). Then confirm by hand, ticking each off: "Reset counters"; "Spam sign-up" → the log shows five accepted sign-ups (distinct emails) and the 6th as a 429 with `key: 'ip:<addr>'`, the opaque body, and `Retry-After`; the "Remaining tokens" panel shows `signup → ip:<addr> → 0/5`. Toggle "Force Upstash down" on; spam again → all proceed and the structured-log tail shows `rate_limit_unavailable` rows; toggle off.

---

## Lesson 5 — Gate reset per-IP and per-email

Gate the password-reset action with per-IP and per-email limits so neither a single host nor a campaign against one victim's address can flood reset emails, protecting the target's inbox and Resend cost.

The finished result: on `/inspector`, "Spam reset" against `eve@example.com` four times returns the 4th as a 429 (`limiter: 'reset'`, `key: 'email:eve@example.com'`); switching IP and sending one more is still rejected on the per-email gate; `MOCK_EMAIL_SENT_COUNT` ticks up only by the three successful resets.

### Your mission

Reset is the second dual-keyed endpoint, but its per-email gate exists for a different reason than sign-in's: here the cost of abuse is concrete and lands on a third party — every accepted reset sends real mail, so an attacker hammering a victim's address floods that inbox and burns Resend deliverability and budget. The per-IP gate stops a single noisy host; the per-email gate (`email:<normalized>`) protects the targeted address even when the attacker rotates IPs, which is why it must survive an IP switch. The two ordered `safeLimit` calls run before `auth.api.forgetPassword`, reusing `resetLimiter` and the helpers, with the tightest budget in the project (3/15m) because the abuse cost is highest. The same shared rules hold: gate before work, opaque rejection body, `RateLimit-*` headers on every response, fail-open through `safeLimit`, `pending` to `after()`. The mocked `email.ts` makes the protection legible — `sendResetPasswordEmail` bumps `MOCK_EMAIL_SENT_COUNT`, so the student can read that only the successful resets sent mail and the rate-limited ones did not. Out of scope: real email delivery (mocked here; the live path is chapter 050's concern).

Requirements checklist:

- [ ] The 4th reset request against `eve@example.com` from one IP returns 429 with `limiter: 'reset'` and `key: 'email:eve@example.com'`.
- [ ] After switching IP, one more reset against `eve@example.com` is still rejected on the per-email gate — the gate survives the IP change.
- [ ] A burst from one IP against distinct addresses is rejected on the per-IP gate once the per-IP budget is spent.
- [ ] `MOCK_EMAIL_SENT_COUNT` increases only by the number of successful resets; rate-limited attempts send no mail.
- [ ] Every reset response carries `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`; the 429 also carries `Retry-After` and the opaque body.

### Coding time

Build prompt: wrap `src/app/(auth)/reset/actions.ts` against the brief and the tests, reusing `resetLimiter`, `safeLimit`, and the header helpers.

Solution in `<details>`: the reset action with the ordered per-IP then per-email `safeLimit` gates before `auth.api.forgetPassword`, header attachment, and `after(pending)`, per the reference. Rationale to cover: why reset carries a per-email gate (inbox + Resend cost on a third party) and why the budget is tightest. Link to lesson 3 of chapter 074 for the per-email reset reasoning and to chapter 050 for the live email path.

### Moment of truth

Run the lesson's test suite (command and expected pass output). Then confirm by hand, ticking each off: "Reset counters"; "Spam reset" against `eve@example.com` 4x from one IP → requests 1-3 succeed and request 4 is a 429 with `limiter: 'reset'`, `key: 'email:eve@example.com'`, the opaque body, and `Retry-After`. Switch IP; "Send one" → still 429 on the per-email gate. Read `MOCK_EMAIL_SENT_COUNT` → ticked by exactly 3. The "Remaining tokens" panel shows `reset → email:eve@example.com → 0/3`. Toggle "Force Upstash down" on; spam again → all proceed and the structured-log tail shows `rate_limit_unavailable` rows; toggle off.

After this lesson the surface is complete: every "Done when" clause in the Chapter framing has an owning lesson and has been confirmed in that lesson's Moment of truth. The same shape carries forward — webhook receivers (chapter 063 / chapter 065), file uploads and AI generation (chapter 068 / unit 22) copy the pattern with per-user / per-org keys; chapter 081's security audit checks limiter coverage; chapter 088 adds integration tests for the `RateLimit-*` and 429 path; chapter 092's structured logger is the production analog of `rate_limit_log`.
