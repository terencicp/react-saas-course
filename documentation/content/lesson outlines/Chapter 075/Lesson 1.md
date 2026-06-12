# Lesson 1 — Project overview

## Lesson title

Chapter-outline title is "Project Overview" — the contract mandates this exact title for the first project lesson. Keep it.

- **Page title:** Project overview
- **Sidebar title:** Project overview

## Lesson type

`Project overview` — first lesson of a project chapter. No feature built; the student leaves with the chapter 055 auth starter running locally, the inspector loaded but inert. No test-coder run for this lesson (no `tests/lessons/Lesson 1.test.ts`).

## Lesson framing

The student walks away owning the canonical 2026 rate-limiter shape — an application-level limiter wrapped at the Server Action seam without touching the auth core — and a running starter that proves where every gate fires. The senior payoff installed here is the mental model the whole chapter cashes in: limits land at the action seam (not the `[...all]` catch-all), the budget rides the action `Result` (not HTTP headers, because `headers()` is read-only), rejections are user-opaque but operator-honest, and a Redis outage fails open on the auth path. This lesson builds none of that; it loads the chapter 055 auth surface plus a provided `/inspector` so the student can see exactly which six stubs and three action wrappers lessons 2–5 will fill, and why each exists.

## Lesson sections

Project-overview section list, in order: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No `<details>`, no exercises, no tests.

### What we're building (intro, no header)

One paragraph: take the chapter 055 email+password auth flows and instrument sign-in, sign-up, and reset with `@upstash/ratelimit` at the action boundary, then watch every gate fire on `/inspector` and in the Upstash dashboard. Name the finished shape in one breath — sign-in dual-gated per-IP and per-email; sign-up and reset per-IP (reset also per-email); every action carrying its rate-limit budget inside the `Result`; rejections returning an opaque `rate_limited` message; a Redis outage failing open and logging alertable events; Better Auth's built-in limiter off.

Then a single `Figure` with a `Screenshot` of `/inspector` after a finished "Spam sign-in": the recent-responses log showing ten `unauthorized` outcomes counting the per-IP `remaining` 9 → 0 and the 11th flipping to `rate_limited`, alongside the structured-log tail's honest `rate_limit_rejected` row. Caption names it as the verification surface every later lesson uses. (Screenshot to be captured from the running solution at `/inspector`.)

No technology rationale here — that belongs to chapters 074 (and is linked from later lessons), not this overview.

### What we'll practice

Bulleted list (the five skill bullets from the chapter outline, lightly tightened):

- Wrapping an existing auth surface with an application-level rate limiter at the Server Action seam, without touching the auth core.
- Designing limiter keys: dual-keying sign-in per-IP and per-email through one limiter with two prefixes; choosing per-IP-only vs per-IP-plus-per-email per endpoint.
- Making rejection observable and safe: the budget carried inside the action `Result`, an opaque user-facing message, an operator-honest structured log, and the literal `RateLimit-*` headers reserved for the route-handler twin.
- Building for resilience: fail-open on a Redis outage, module-scope limiters with in-memory caching, and `after()` for off-path analytics.
- Swapping Better Auth's built-in limiter for the application-level pattern as a deliberate architectural decision.

Close with the transfer sentence: this is the canonical limiter shape every other abusable endpoint copies (webhook receivers, file uploads, AI generation) — a fourth limiter is one new `Ratelimit` instance plus one action wrap, same `Result`-carried budget, same fail-open. `safeLimit`, `rateLimited`, `rateLimitBudget` are the action-path seam; `rateLimitHeaders` / `rateLimitedResponse` are the route-handler seam.

End the section with an **Out of scope** `Aside` (note variant), naming-but-deferring: no per-user/per-org limits beyond auth; no Vercel WAF rule configuration (named in chapter 074 lesson 1, dashboard wiring is two clicks); no captcha (the next layer past the limiter for human abuse); no `Ratelimit.deny()` blocklist (named chapter 074 lesson 2); no multi-region Upstash replication; no Playwright assertions on `RateLimit-*` (deferred to chapter 088); no migration to Better Auth `secondaryStorage` (named chapter 074 lesson 3 as the alternative, not chosen). The `/api/auth/[...all]` catch-all stays unwrapped — limits land at the action seam that calls `auth.api.*` directly; route-handler-level limits as defense-in-depth are named, deferred.

### Architecture

Shape only. Two-layer model carried in from chapter 074 lesson 1: the edge WAF (out of scope here) and the application limiter (the build). Render the gated-action request flow as an `ArrowDiagram` inside a `Figure` (a single linear flow with one branch — prose alone blurs the pass-vs-reject split and the budget-vs-headers distinction, so a box-and-arrow figure earns its place):

- form post → Server Action → Zod parse → resolve `ip` + normalized `email` → ordered `safeLimit` gate(s) on the shared limiter →
  - **pass:** `auth.api.*` then `ok({ …, rateLimit: rateLimitBudget(ipLimit) })`
  - **reject:** `rateLimited(...)` returns `err('rate_limited', <opaque message>)`
- annotate that the action carries the budget in its `Result`, not in HTTP headers (`headers()` is read-only); `pending` analytics flush via `after()`; Better Auth's built-in limiter is off so the action wrapper is the single enforcement point; the literal `RateLimit-*` headers live only on the read-only `/api/limit-demo` route-handler twin.

Keep the diagram to ~6 boxes plus the two branch sinks. If `ArrowDiagram` framing fights the branch, fall back to a labeled list with the same content — shape only, no code.

### Starting file tree

Render the chapter framing's "Starter file tree" as a `FileTree`. Comment one line each only on files lessons touch; leave the rest uncommented. Mark as highlighted focus the six TODO stubs and three to-be-wrapped action files:

- `src/env.ts` — TODO L2: add the two Upstash entries
- `src/lib/redis.ts` — TODO L2: `Redis.fromEnv()` + `pingRedis()`
- `src/lib/rate-limit.ts` — TODO L2: three module-scope `Ratelimit` instances + `LIMITER_MAX`
- `src/lib/keys.ts` — TODO L3: `getClientIp` + `normalizeEmail`
- `src/lib/safe-limit.ts` — TODO L3: fail-open wrapper + structured log
- `src/lib/rate-limit-headers.ts` — TODO L3: `rateLimitBudget` / `rateLimited` (+ route-twin `rateLimitHeaders` / `rateLimitedResponse`)
- `src/app/(auth)/sign-in/actions.ts` — TODO L3: wrap with dual-keying
- `src/app/(auth)/sign-up/actions.ts` — TODO L4: wrap per-IP
- `src/app/(auth)/reset/actions.ts` — TODO L5: wrap per-IP + per-email

Call out (uncommented-but-noted in surrounding prose, not as focus):

- `src/app/inspector/page.tsx` (+ `_components/`, `inspector-reads.ts`, `inspector-store.ts`, `actions.ts`) — provided in full; the verification surface every Moment of truth uses. Student writes none of it.
- `src/app/api/limit-demo/route.ts` — provided route-handler twin; the one place literal `RateLimit-*` headers + a 429 body exist (parity, no auth path).
- `src/lib/auth.ts` — provided from chapter 055; Better Auth's built-in limiter is still **on** here (lesson 3 flips it off).
- `src/lib/redis-mock.ts`, `src/lib/rate-limit-log.ts` — provided: the fail-open demo's down-Redis and the `logRateLimit` helper writing to `rate_limit_log`.
- `src/lib/email.ts` — provided: mocked in inspector mode; `getMockEmailSentCount()` is what lesson 5 reads.
- `scripts/seed.ts` — provided: `alice@example.com` / `bob@example.com` (verified, known password); `eve@example.com` (reset target).

Use the framing's tree as the canonical structure; do not invent paths. Note the inspector lives at `src/app/inspector/` with the component split from the code outline (do not enumerate every `_component` in the tree comments — one line on the inspector folder suffices).

### Roadmap

`CardGrid` of four `Card`s, one per remaining lesson, each titled with lesson number + title and one sentence on what it adds:

- **Lesson 2 — Declare the Redis client and three module-scope limiters.** Adds the Redis client and three `Ratelimit` instances so the inspector's "Remaining tokens" panel reads live.
- **Lesson 3 — Gate sign-in with dual-keying and swap out Better Auth's built-in.** Adds the helper trio and the per-IP-and-per-email sign-in gate (plus the architectural swap) so the 11th call returns `rate_limited` with an opaque message and the budget riding the `Result`.
- **Lesson 4 — Gate sign-up per-IP.** Adds the per-IP sign-up gate so a single host cannot mass-register.
- **Lesson 5 — Gate reset per-IP and per-email.** Adds the per-IP-plus-per-email reset gate so a victim's inbox and Resend cost are protected across IPs.

### Setup

`Steps` component with exact commands in order. First step is the contract-mandated repo line.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 075/start/`. (Clone via `degit` — give the exact `npx degit` invocation targeting that subdirectory.)
2. `pnpm install`.
3. Provision Upstash: the Vercel Marketplace integration is the recommended path; for local-only, create a free database in the Upstash dashboard and copy the REST URL and token from the database's REST API panel. The free tier covers the project.
4. `docker compose up -d` (Postgres 18 from the provided `docker-compose.yml`).
5. Copy `.env.example` to `.env.local` and fill the values (env table below).
6. `pnpm db:migrate`.
7. `pnpm db:seed`.
8. `pnpm dev`.

Env var table (name / purpose / how to obtain) — list the two new Upstash vars plus the carried-in chapter 055 vars already in `.env.example`:

- `UPSTASH_REDIS_REST_URL` — Upstash REST endpoint; from the database's REST API panel.
- `UPSTASH_REDIS_REST_TOKEN` — read/write token; same panel.
- Carried in from chapter 055 (already in `.env.example`, so a one-line pointer suffices, do not re-document each): `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`. (`SEED` defaults to 1; mention only if relevant.)

Render commands with `Code`. Render the env list as a plain table or `Code` block, not an interactive component.

**Expected result** (the sentence that closes the section and the lesson): `pnpm dev` serves the chapter 055 auth flows working end-to-end — signing in as `alice` lands on `/dashboard`. `/inspector` loads, but the "Remaining tokens" panel reads `n/a` and the "Spam X" buttons surface a "not implemented" notice (no crash), because the limiters and action wrappers do not exist yet. The student leaves with the starter running locally and the inspector loaded but inert; building begins in lesson 2.

## Component usage summary

- `Figure` + `Screenshot` — finished `/inspector` shot in *What we're building*.
- `Aside` (note) — *Out of scope* block in *What we'll practice*.
- `Figure` + `ArrowDiagram` — gated-action request flow in *Architecture* (fallback: labeled list).
- `FileTree` — *Starting file tree*.
- `CardGrid` + `Card` — *Roadmap*.
- `Steps` + `Code` — *Setup*.

No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` — this overview shows no implementation code (rationale and signatures live in lessons 2–5). No live-coding or exercise components — project lessons assess via the inspector and the test suite, not inline exercises, and this lesson has neither.

## Scope

This lesson does **not**:

- Build or explain any limiter, key helper, wrapper, or action gate — lessons 2–5 own those, each against its own test file.
- Justify the technology choices (Upstash Redis as the 2026 default, sliding-window, module-scope, `ephemeralCache`, the `RateLimit-*` IETF headers, the budget-on-the-`Result` rule) — those are taught in chapter 074 lessons 1–3 and linked from the lessons that use them, never re-explained here.
- Touch the auth core, the `[...all]` catch-all, or the WAF layer — all named-but-deferred (catch-all stays unwrapped by design; WAF is chapter 074 lesson 1).
- Run any test — the first `tests/lessons/*.test.ts` belongs to lesson 2.
