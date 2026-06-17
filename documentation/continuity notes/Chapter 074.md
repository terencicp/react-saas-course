# Chapter 074 — Rate limiting with Upstash Redis

## Lesson 1 — Two layers: edge WAF and application limiter

**Taught:** The two-layer model (Vercel WAF edge ring + `@upstash/ratelimit` application ring), the credential-stuffing / per-email-lockout motivation for dual-keying, the public-URL+email-password trigger that makes the application limiter mandatory, why Upstash Redis is the stack default (derived via constraint cascade), and the fail-open-on-auth policy.

**Cut:** Algorithm details (sliding window vs token bucket — lesson 2); `@upstash/ratelimit` API surface including `Redis.fromEnv()`, `Ratelimit` config, `limit()` return shape, `prefix`, `analytics`, module-scope declaration (lesson 2); per-IP + per-email dual-keying implementation, `RateLimit-*` response headers, 429 body, real `safeLimit` helper (lesson 3); Better Auth's built-in rate limiter and swap-out (lesson 3 / ch075); Vercel Firewall SDK (named once only); alerting wiring / structured-log shape (Unit 19).

**Debts:** Lesson 2 owns the full `@upstash/ratelimit` API and algorithm choice. Lesson 3 owns the real `safeLimit` helper, dual-keyed wiring into the Better Auth action, and the `RateLimit-*` headers. Ch075 project owns the verify recipe (run N requests, read headers, watch dashboard).

**Terminology:**
- Two rings: **edge controls** (Vercel WAF — sees IP, path, headers; blocks before compute is billed) vs **application controls** (`@upstash/ratelimit` — sees email, user, org, body; runs inside the Server Action).
- **Credential stuffing** — replaying leaked username/password pairs across many IPs to dodge per-IP limits.
- **NAT** — many devices sharing one public IP; aggressive per-IP limits lock out whole offices.
- **Per-email limit** — the only gate that catches distributed stuffing; can only live inside the app where the email is visible after parsing.
- **TTL** — automatic key expiry that resets a rate-limit counter after its window.
- **Fail-open** — allow the request when the limiter can't reach Redis; opposite risk to fail-closed.
- Four names kept distinct: **Redis** (protocol/data structures), **Upstash Redis** (managed service), **`@upstash/redis`** (HTTP/REST client), **`@upstash/ratelimit`** (limiter library using the client).
- Module: `lib/rate-limit.ts`; helper name: `safeLimit`; structured log event: `rate_limit_unavailable`.

**Patterns and best practices:**
- Both layers ship together and are permanent, not a migration phase; removing one is a regression.
- WAF rule ships with the very first preview (no redeploy needed, zero cost within free/Pro allotment, can log before denying).
- Application limiter is mandatory the moment the app goes public with an email+password form — not at "scale."
- Fail-open on the auth path is the course default: `catch` logs `rate_limit_unavailable` at error level, returns `{ success: true }`. Fail-closed only for high-value endpoints (admin-only actions, non-retryable billing webhooks) — per-endpoint decision.
- Upstash provisioned via Vercel Marketplace integration; region must match primary Vercel region (mismatch adds 30–80 ms per `limit()` call).
- Two env vars: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — already wired into `env.ts` (`@t3-oss/env-nextjs` + Zod, from ch037).
- Upstash is not a Postgres replacement, not a durable queue (Trigger.dev owns that), not the Next.js data cache (`cacheTag` owns that).

**Misc:**
- "Vercel KV" is deprecated / migrated to Upstash Redis (Dec 2024); on Vercel the key-value product is Upstash via Marketplace — do not list Vercel KV as an alternative.
- The fail-open skeleton (`safeLimit`) shown in lesson 1 is intent-only; lesson 3 ships the real implementation — downstream lessons must not treat the lesson-1 snippet as the production contract.
- The request-path strip diagram (Client → Edge WAF ring → Vercel Function{App limiter ring} → Better Auth verify → DB) is the chapter's reusable spine; lesson 3 should reuse / reference it rather than redraw it.

---

## Lesson 2 — The @upstash/ratelimit API surface

**Taught:** The connectionless `Redis.fromEnv()` client, the module-scope `Ratelimit` declaration (`redis`, `limiter`, `prefix`, `analytics`), the three algorithms (sliding window default; token bucket for bursty endpoints; fixed window when boundary slop is acceptable), the `limit(key)` return shape (`success`, `limit`, `remaining`, `reset` in ms, `pending` analytics promise), and the `RateLimit-*` header contract.

**Cut:** The `getClientIp` / `normalizeEmail` parse helpers (`lib/keys.ts`) — lesson 3. The real `safeLimit` fail-open wrapper — lesson 3. The full dual-keyed wiring (`ip:`/`email:` under one limiter) — lesson 3 (teased only). Better Auth's built-in limiter swap-out — lesson 3 / ch075. The Upstash dashboard tour and alerting — ch092.

**Debts:**
- Lesson 3 owns `safeLimit`, `lib/keys.ts`, dual-keying applied to sign-in/sign-up/reset, and the production 429 body with `Retry-After`.
- The `pending` → `after()` wiring is named here but the exact call-site integration is deferred to lesson 3 / ch075.
- Ch075 project owns the verify recipe (run N requests, assert headers, dashboard check).

**Terminology:**
- **connectionless** — Upstash Redis reached over stateless HTTPS requests; no socket pool, no connect/end lifecycle, each operation is its own `fetch`.
- **`Redis.fromEnv()`** — reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from env; throws at startup if either is missing.
- **`ephemeralCache`** — in-process Map the limiter keeps to answer blocked-key checks without a Redis round-trip; on by default, survives only on hot invocations; module-scope declaration is the prerequisite.
- **hot invocation** — a serverless instance reused between requests with module-scope memory still live (vs. cold start where module init re-runs).
- **`prefix`** — namespaces all Redis keys a limiter writes (`rl:signin`, `rl:signup`, `rl:reset`); each limiter must have a distinct prefix; the key passed to `limit()` does NOT include the prefix.
- **Sliding window** — `Ratelimit.slidingWindow(limit, window)` — weights count across current + previous fixed window; no boundary spike; chapter default.
- **Token bucket** — `Ratelimit.tokenBucket(refillRate, interval, maxTokens)` — allows bursts up to bucket capacity then throttles to refill rate; reach for bursty endpoints (LLM calls, batch).
- **Fixed window** — `Ratelimit.fixedWindow(limit, window)` — cheapest, hard clock-aligned reset, ~2× budget can slip through at boundary ("thundering minute").
- **`reset`** — Unix timestamp in **milliseconds** when the window rolls over; must be converted to delta-seconds (`Math.ceil((reset - Date.now()) / 1000)`) for `RateLimit-Reset` / `Retry-After` headers — raw ms value is a common bug.
- **`pending`** — Promise returned by `limit()` for the analytics flush; hand to `after()` from `next/server` (stack-canonical post-response scheduler), never `await` on the request path. (`waitUntil` is the underlying serverless primitive `after()` is built on — recognize it in Upstash docs, but reach for `after()`.)
- **delta-seconds** — relative count of seconds from now (what `RateLimit-Reset` and `Retry-After` carry), not an absolute timestamp.
- **`Retry-After`** — takes precedence over `RateLimit-Reset` when both are present.
- **IETF `RateLimit-*` draft** — de-facto convention the ecosystem (including `@upstash/ratelimit`) still ships; current draft (v11) moves toward single `RateLimit` + `RateLimit-Policy` header but three-field form is what the stack and ch075 verify recipe use.
- **`reason`** — field on a denial (`'timeout'` / `'cacheBlock'` / `'denyList'`); auth surface doesn't branch on it.
- **`MultiRegionRatelimit`** — reads nearest replica, syncs via CRDTs; eventual consistency on counts; only needed for genuinely multi-region Vercel deploys.
- **`Ratelimit.deny()`** — hard-blocks specific identifiers with no Redis round-trip; recognition only.

**Patterns and best practices:**
- Declare `redis` and all `Ratelimit` instances once at module scope in `lib/rate-limit.ts`; in-handler declaration defeats the `ephemeralCache` and pays a Redis round-trip on every call — passes in dev, shows as latency/cost under load.
- One limiter per abusable intent; each limiter gets its own `prefix` — shared prefix silently corrupts counts across limiters.
- `analytics: true` on the auth surface — keep it on for incident review; costs one extra Redis write per call but `pending` keeps it off the user path.
- Write `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` on **every** response (success and 429), not only rejections — well-behaved clients read remaining on 200 and back off before being throttled.
- Headers are a pure function of the `limit()` result; never hand-count them. Use `Awaited<ReturnType<typeof signInLimiter.limit>>` to type the helper parameter without a separate type to keep in sync.
- `timeout` constructor field (default 5000ms) bounds how long `limit()` blocks on Redis — relevant to the fail-open policy, owned by lesson 3.
- Same-region Upstash: ~5–15ms p50, ~25–40ms p99; cross-region 50–100ms — co-locate.

**Misc:**
- The canonical `lib/rate-limit.ts` at the end of lesson 2 exports only `signInLimiter`; lesson 3 adds `signUpLimiter` and `resetLimiter` to the same file.
- The bare `await signInLimiter.limit(key)` in this lesson is a teaching shape; lesson 3 wraps it in `safeLimit(signInLimiter, key)` — downstream agents must not treat the lesson-2 snippet as the production call site.
- Key normalization rule introduced but not implemented here: `email.trim().toLowerCase()` for per-email keys; `lib/keys.ts` helper is lesson 3's artifact. Normalization for the limiter key must match normalization for the DB lookup.
- Teaser for lesson 3: passing `'ip:' + ip` and `'email:' + email` to the same `signInLimiter` — two namespaces, one budget config.
- `after(result.pending)` is the canonical form for scheduling the analytics flush in this stack (`import { after } from 'next/server'`); Upstash docs use `ctx.waitUntil(result.pending)` — recognize it, but lesson 3 and ch075 must use `after()`.

---

## Lesson 3 — Dual-keying the auth endpoints

**Taught:** The dual-keying rule (per-IP and per-email as two independent gates on sign-in and reset; per-IP only on sign-up), gate-first/work-second seam placement, safe-to-user / honest-to-operator rejection shape, `safeLimit` fail-open wrapper, `getClientIp` / `normalizeEmail` parse helpers, `after(result.pending)` for off-path analytics, and disabling Better Auth's built-in in-memory rate limiter.

**Cut:** Nothing from the chapter outline was dropped; all chapter-outline topics for this lesson were delivered. The verify recipe (run N requests, read headers live, watch dashboard) is ch075's job per the chapter outline's explicit exclusion.

**Debts:**
- Ch075 project: implement and verify the full pattern against the real auth flows (eleven requests, header assertions, Upstash dashboard check).
- Ch081 (security baseline): strict rejection of requests with no resolvable IP (lesson defers to `'unknown'` fallback bucket for now).
- Ch092 (observability): pino structured logger internals, `logRateLimit` implementation, and the alerting rule that pages on sustained `rate_limit_unavailable` events.

**Terminology:**
- **Dual-keying rule** — sign-in and reset run two independent `safeLimit` calls on the same limiter: `ip:<ip>` and `email:<email>`; both gates must pass; dropping either check silently disables half the defense.
- **Lockout vector** — keying a gate on a victim-chosen identifier (email) lets an attacker trip the victim's budget and deny them access; avoided by sizing the per-email budget generously (comparable to or looser than per-IP) so it catches stuffing-campaign volume, not human typos.
- **Gate-first, work-second** — rate-limit calls run after Zod parse but before the password hash / `auth.api.signInEmail`; gating after the hash pays the cost the limiter exists to cap.
- **`safeLimit(limiter, key)`** — `try/catch` wrapper around `limiter.limit(key)`; on catch logs `rate_limit_unavailable` and returns `{ success: true, … }` (fail-open); single point to flip policy to fail-closed per endpoint.
- **`rateLimited(result, gate, key)`** — reject helper: logs honest structured event (`rate_limit_rejected`, gate, key, remaining, reset) and returns `err('rate_limited', 'Too many attempts. Please try again later.')` — opaque message identical regardless of which gate tripped.
- **`rateLimitedResponse(result)`** — route-handler twin of `rateLimited`; returns a real `429 Response` with `rateLimitHeaders` and same opaque JSON body; used for webhooks / public APIs, not Server Actions.
- **`rateLimitHeaders(result)`** — pure function deriving `RateLimit-Limit / -Remaining / -Reset` (delta-seconds) and `Retry-After` (rejection only) from the `limit()` result; `reset` converted via `Math.ceil((result.reset - Date.now()) / 1000)`.
- **`after(result.pending)`** — `next/server` post-response scheduler flushes analytics off the user path; canonical form in this stack (not `ctx.waitUntil`).
- **`getClientIp(headers)`** in `lib/keys.ts` — splits `x-forwarded-for` on `,`, takes first entry, falls back to `x-real-ip`, then `'unknown'`; trusted only on Vercel where the header is overwritten by the platform.
- **`normalizeEmail(email)`** in `lib/keys.ts` — `email.trim().toLowerCase()`; no `+`-alias stripping (course default); normalization must match the DB lookup normalization. Applied once at the **Zod schema parse boundary** via `z.string().transform(normalizeEmail).pipe(z.email())` — so `parsed.data.email` is already key-ready; the action does not call `normalizeEmail` manually.
- **`rateLimit: { enabled: false }`** in `lib/auth.ts` — disables Better Auth's in-memory limiter; app-level limiters in `lib/rate-limit.ts` are the single enforcement point.
- **`lib/rate-limit.ts` final exports:** `signInLimiter` (10/1m), `signUpLimiter` (5/10m), `resetLimiter` (3/15m), all with `analytics: true` and distinct prefixes; plus `safeLimit`, `rateLimitBudget`, `RateLimitBudget` (type), `rateLimitHeaders`, `rateLimited`, `rateLimitedResponse`.
- **`lib/keys.ts` exports:** `getClientIp`, `normalizeEmail`.
- **Key strategy per endpoint:** sign-in → dual-keyed (`ip:` + `email:`); sign-up → per-IP only (email is attacker-chosen); password reset → dual-keyed (per-email prevents third-party inbox cost / deliverability damage, tightest budget).

**Patterns and best practices:**
- Rejection user message is identical regardless of which gate tripped — per-gate messages leak enumeration info or IP throttle status to attackers.
- **Server Actions cannot set arbitrary response headers** — `headers()` from `next/headers` is read-only; only `cookies()` mutates response state. On success the per-IP budget rides **inside the `ok` payload** via `rateLimitBudget(ipLimit)` (a `RateLimitBudget` field on the `Result`), not as HTTP headers. Real `RateLimit-*` HTTP headers are emitted only by the route-handler twin (`rateLimitedResponse` / `rateLimitHeaders`) on surfaces that return a `Response`.
- Per-email budget should be comparable to or looser than per-IP; setting per-email tighter re-opens the lockout vector via office NAT.
- `safeLimit` is the one knob for fail policy — fail-open is the auth-path default; high-value endpoints (admin-only, non-retryable billing webhooks) may flip to fail-closed here, not at every call site.
- `after()` not `await` for `pending` — awaiting adds 5–10ms to every user response.
- Better Auth `secondaryStorage` adapter (TCP `ioredis` client) is the named alternative for teams wanting the framework to own limiter rules; not chosen here (second Redis client; TCP vs HTTP client mismatch).

**Misc:**
- The five-seam Server Action shape from ch043/ch047: `parse → authorize → mutate → revalidate → return`; rate-limiting is the first half of the authorize seam — after parse (need the email), before everything else.
- `err('rate_limited', …)` is a `Result` code, not a raw `Response` — ch075 and UI must handle it via the existing `useActionState` form contract (same channel as `err('validation', …)`). On the success branch the `ok` payload carries `rateLimit: RateLimitBudget` (per-IP budget); ch075 may surface this to a well-behaved API client but it is not rendered in the form UI.
- `logRateLimit` helper called with a fixed event shape (`rate_limit_rejected` / `rate_limit_unavailable`); the underlying pino logger and redaction config are ch092's job — lesson provides the helper, not the implementation.
- `RateLimitResult` type: `Awaited<ReturnType<Ratelimit['limit']>>` — derive from the library, no separate interface to maintain.
- The ch053 sign-in action assigns `signInEmail`'s result and forks on a two-factor branch; the lesson's reference `signIn` elides that fork to keep gate logic in focus — ch075 must reintegrate it.
