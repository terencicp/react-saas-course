# Chapter 075 — Lesson 2 outline

## Lesson title

Chapter-outline title fits with light trimming. Use: **Declare the Redis client and three module-scope limiters**.
Sidebar (short): **Declare the limiters**.

## Lesson type

`Implementation`

(Lesson 2 of 5; not first, not last. Test-coder runs; writer renders the Implementation section list.)

## Lesson framing

The student installs the senior reflex that a rate limiter is a **named, module-scope seam** before it ever gates traffic: one file (`lib/rate-limit.ts`) is the only place `new Ratelimit(...)` may appear, the instances live at module scope so the library's in-memory `ephemeralCache` survives across hot invocations, and budgets are read with `getRemaining` (non-consuming) rather than `limit` (consuming). They wire the Zod-validated env gate so a missing Upstash credential fails the boot, not the first request. They walk away with the limiter infrastructure standing — three correctly-budgeted, distinctly-prefixed limiters reporting live remaining tokens on `/inspector` — with zero behavior change on any endpoint. The payoff is the discipline (seam, module scope, non-consuming reads, fail-fast env), not the eight lines of construction.

## Codebase state

### Entry

Starter from lesson 1 runs locally: chapter 055 email+password auth works end-to-end (sign in as `alice` → `/dashboard`). `/inspector` loads but is inert — the "Remaining tokens" panel reads `n/a` and "Spam X" buttons surface a "not implemented" notice. Six stub files carry TODOs. Relevant to this lesson:
- `src/env.ts` — provided, Upstash entries missing (`TODO(L2)`).
- `src/lib/redis.ts` — stub: `redis = {} as unknown as Redis`, `pingRedis` returns `false` (`TODO(L2)`).
- `src/lib/rate-limit.ts` — stub: three `{} as unknown as Ratelimit` inert instances; `LIMITER_MAX` already exported correctly (`TODO(L2)`).
- Provided and read-only this lesson: `src/lib/redis-mock.ts`, `src/lib/rate-limit-log.ts`, the whole `/inspector` tree (`inspector-reads.ts` calls `getRemaining`/`pingRedis`, `remaining-panel.tsx`, `upstash-badge.tsx`), `/api/limit-demo/route.ts`. The three action stubs still return `err('internal', 'Not implemented')`.

### Exit

`src/env.ts`, `src/lib/redis.ts`, `src/lib/rate-limit.ts` are real. The dev server boots only with both Upstash vars present (Zod fails the boot otherwise). `/inspector` shows a green "Upstash up?" badge and five live "Remaining tokens" rows reading at full budget (`10/10`, `10/10`, `5/5`, `3/3`, `3/3`). No endpoint is gated — the panel reads state via `getRemaining`, consuming nothing; "Spam X" still records `internal`/"Not implemented". The three action stubs and the four helper files (`keys.ts`, `safe-limit.ts`, `rate-limit-headers.ts`, plus the action wraps) remain untouched for lessons 3-5.

## Lesson sections

Implementation type. Section order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: stand up the Redis client and three `Ratelimit` instances so the inspector reports each limiter's live remaining budget straight from Redis. Then a one-paragraph (or `Screenshot`) description of the finished result: `/inspector` with a green "Upstash up?" badge and the five-row "Remaining tokens" panel at full budget — `signin → ip:<addr> → 10/10`, `signin → email:<active-email> → 10/10`, `signup → ip:<addr> → 5/5`, `reset → ip:<addr> → 3/3`, `reset → email:eve@example.com → 3/3` (the reset-email row tracks the reset spam target `eve@example.com`, not the active identity). No endpoint gated yet; the panel reads state, it does not spend budget. A `Screenshot` of this panel is the natural figure here.

### Your mission

Coherent prose, no subsection headers, no implementation hints. Weave in:

- **Feature (user terms):** the inspector reports live per-limiter remaining budgets instead of `n/a`; the "Upstash up?" badge goes green. The only observable change — no endpoint behaves differently.
- **Constraints (senior decisions that shape the solution):**
  - The limiter is a **named seam** — `lib/rate-limit.ts` is the one and only place `new Ratelimit(...)` may appear; constructing inline elsewhere defeats `ephemeralCache` and corrupts the prefix namespace.
  - **Module scope is load-bearing** — the library caches counters and `pending` writes in process memory; declaring inside a handler defeats the cache and makes a sustained hot key hit Redis every request.
  - Each limiter gets its **own `ephemeralCache: new Map()`** (sharing one works but blurs eviction) and a **distinct prefix** (`rl:signin`/`rl:signup`/`rl:reset`) so two limiters cannot collide on a shared key; cross-app collision is already handled by per-database scope.
  - `analytics: true` adds one rolling-counter write per call for the dashboard; its `pending` promise is the deferral seam wired in a later lesson (named, not built here).
  - The inspector reads via **`getRemaining(key)` (non-consuming)** — using `limit(key)` for a readout would burn a token per render and lock the user out through the panel itself.
  - **Budget choices are senior calls** (carried from chapter 074 lesson 3): sign-in 10/min (tolerates legitimate typos), sign-up 5/10m, reset tightest at 3/15m (concrete abuse cost — inbox noise + Resend deliverability).
  - **Env validation is the prerequisite gate** (chapter 037 lesson 2 pattern): adding the two Upstash vars makes a missing credential fail the boot, not the first request.
- **Out of scope (one line):** no gating, headers, or fail-open handling yet — those arrive once an action exercises the limiter (lesson 3).

**Functional requirements** (numbered, each tagged; test-coder asserts `[tested]`):
1. With either Upstash env var missing, the dev server fails to boot with a Zod error naming the variable; with both present, it boots. `[tested]`
2. The inspector's "Upstash up?" badge reads green — `pingRedis()` succeeds against the live database. `[untested]` (needs live Upstash; the inspector surface confirms it by hand)
3. The "Remaining tokens" panel reads five live rows at full budget: `signin → ip → 10/10`, `signin → email → 10/10`, `signup → ip → 5/5`, `reset → ip → 3/3`, `reset → email:eve@example.com → 3/3`. `[tested]`
4. Re-rendering the inspector (`router.refresh()`) does not decrement any budget — reading the panel never consumes a token. `[tested]`
5. Each limiter's keys carry its own prefix in Redis (`rl:signin`/`rl:signup`/`rl:reset`), with no collision between limiters. `[tested]`

Note for the test-coder: assertions target observable behavior (the rendered panel rows, `getRemaining` not decrementing across repeated reads, distinct prefixes producing distinct Redis keys, boot failure on a missing var), not file paths or imports. Requirement 1 is assertable by importing `env.ts` with a stubbed/missing var and asserting the createEnv throw. The `LIMITER_MAX` cap is already provided, so tests should pair `getRemaining(key).remaining` against the live limiter, not against a re-declared constant.

### Coding time

One-line build prompt: implement `src/env.ts` (two Upstash entries), `src/lib/redis.ts`, and `src/lib/rate-limit.ts` against the brief and the tests; this lesson gates no endpoint, so the inspector's "Remaining tokens" panel is the surface that confirms the work.

Reference solution in `<details>` (writer wraps), organized as it appears in the repo. Three files, all short — use `Code` blocks (simple, no multi-part focus needed). Files and content to render:

- **`src/env.ts`** — add `UPSTASH_REDIS_REST_URL: z.url()` and `UPSTASH_REDIS_REST_TOKEN: z.string().min(1)` to both `server` and `runtimeEnv`. Show only the added lines in context (the file is provided; the diff is two pairs of lines). Rationale (one line): the env boundary fails the boot on a missing credential rather than surfacing at the first Redis call — link to chapter 037 lesson 2 for the `@t3-oss/env-nextjs` pattern rather than re-explaining.
- **`src/lib/redis.ts`** — `export const redis = Redis.fromEnv();` plus the `pingRedis()` health-check (`try { await redis.ping(); return true } catch { return false }`) the badge reads. Rationale (one line each): `fromEnv()` is the connectionless HTTP/REST client reading the two validated vars (link chapter 074 lesson 2); `pingRedis` swallows the error to a boolean so the badge degrades to red instead of throwing.
- **`src/lib/rate-limit.ts`** — the three module-scope `new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(max, window), prefix, analytics: true, ephemeralCache: new Map() })` instances (signin 10/'1 m', signup 5/'10 m', reset 3/'15 m') importing `redis` from `@/lib/redis`; `LIMITER_MAX` is already present (provided) — note it stays. This is the one file where `new Ratelimit(...)` appears.

Decision rationale to cover (one or two sentences each; these are the `[untested]`-requirement and code-organization coverage): why module scope (cache survival across hot invocations), why per-limiter `ephemeralCache` (eviction clarity), why distinct prefixes (Redis key namespacing, no cross-limiter collision), why `getRemaining` for the readout not `limit` (non-consuming), why the inspector pairs `getRemaining(key).remaining` with the static `LIMITER_MAX` cap (`getRemaining` returns remaining only, the cap supplies the denominator for the `10/10` display), and the budget choices (sign-in lenient, reset tightest). Callout on the one thing that looks unusual at a glance: `analytics: true` writes a counter per call but its `pending` promise is ignored this lesson (the deferral seam is lesson 3+). For the `Ratelimit` constructor, `slidingWindow`, `ephemeralCache`, and the `{ success, limit, remaining, reset, pending }` shape, link to chapter 074 lesson 2 rather than re-teaching. For `getRemaining`, link chapter 074 lesson 2.

(No diagram — the flow is three short module declarations; prose carries it.)

### Moment of truth

Test command and expected pass output: `pnpm test:lesson 2` → all tests pass.

By-hand checklist (the items tests don't fully cover, ticked off via the inspector — render with `Checklist`/`ChecklistItem`):
- Restart `dev` with `UPSTASH_REDIS_REST_URL` commented out → boot fails with the Zod error naming the var; uncomment → boot succeeds.
- Open `/inspector` → "Upstash up?" badge is green; "Remaining tokens" panel reads the five full-budget rows.
- Click "Spam sign-in" → recent-responses log records `internal` / "Not implemented" (the action stub is unwrapped), confirming this lesson stood up state only, not gating.
- The timing readout shows the first read hitting Redis and subsequent reads within the cache window served from `ephemeralCache`.

## Scope

This lesson does **not** cover:
- Gating any endpoint, the opaque rejection message, or the budget riding the `Result` — lesson 3 (sign-in).
- The fail-open `safeLimit` wrapper and the structured `rate_limit_unavailable` log — lesson 3.
- `getClientIp` / `normalizeEmail` key helpers and the `x-forwarded-for` trust boundary — lesson 3.
- Disabling Better Auth's built-in limiter — lesson 3.
- `after()` for off-path `pending` analytics flush — lesson 3.
- The literal `RateLimit-*` headers / 429 route-handler twin — provided in `/api/limit-demo`, exercised from lesson 3 on.
- Sign-up per-IP gate — lesson 4; reset per-IP-plus-per-email gate — lesson 5.
