# Chapter 075 — Lesson 3 outline

## Lesson title

- **Full:** Gate sign-in with dual-keying and swap out Better Auth's built-in
- **Sidebar:** Gate sign-in

The chapter-outline title fits — it names both deliverables (the dual-keyed sign-in gate and the architectural swap). Keep it.

## Lesson type

`Implementation`

(Test-coder runs for this lesson against `tests/lessons/Lesson 3.test.ts`, currently a `describe.todo` placeholder.)

## Lesson framing

The student installs the canonical application-level rate-limit seam on the auth surface's highest-value endpoint and makes it the *single* enforcement point. By the end, sign-in is gated per-IP **and** per-email (the dual key that closes cross-IP credential stuffing without becoming a lockout vector), every rejection returns one opaque message while the honest gate+key land only in the structured log, the budget rides the action's `Result` (because a Server Action's `headers()` is read-only), the limiter fails open on a Redis outage, and Better Auth's built-in limiter is off so two limiters never compete on one surface. This is the shape lessons 4 and 5 — and every future abusable endpoint — copy.

## Codebase state

**Entry.** Lesson 2 stood up the infrastructure: `src/env.ts` carries the two Upstash vars, `src/lib/redis.ts` exports the live `redis` client + `pingRedis()`, and `src/lib/rate-limit.ts` declares the three real module-scope `Ratelimit` instances + `LIMITER_MAX`. The inspector's "Upstash up?" badge is green and "Remaining tokens" reads five live `n/n` rows. Still stubbed: `src/lib/keys.ts` (`getClientIp` always returns `'unknown'`), `src/lib/safe-limit.ts` (`safeLimit` is an always-pass no-op, `RateLimitResult` hand-written), `src/lib/rate-limit-headers.ts` (all four functions return zeros/`{}`/no-log), all three action files return `err('internal', 'Not implemented')`, and `src/lib/auth.ts` still has Better Auth's built-in limiter on. So "Spam sign-in" records `internal` / "Not implemented" rows. The inspector, `/api/limit-demo`, DB schema, `rate-limit-log.ts`, `redis-mock.ts`, and `mapAuthError` are all pre-provided.

**Exit.** The student has implemented `keys.ts` (real `getClientIp` + `normalizeEmail`), `safe-limit.ts` (real fail-open `safeLimit` + library-inferred `RateLimitResult`), `rate-limit-headers.ts` (`rateLimitBudget` / `rateLimited` / `rateLimitHeaders` / `rateLimitedResponse` all real), wrapped `src/app/(auth)/sign-in/actions.ts` with the dual gate, and flipped `src/lib/auth.ts` to `rateLimit: { enabled: false }`. Sign-in's 11th rapid call returns `rate_limited`; the cross-IP runner trips the per-email gate; fail-open works; a successful sign-in still lands on `/dashboard`. Sign-up and reset actions remain `Not implemented` (lessons 4–5). `keys.ts`, `safe-limit.ts`, and `rate-limit-headers.ts` are now complete and reused unchanged by lessons 4 and 5.

## Lesson sections

Implementation type → four sections in order: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: gate the sign-in action with per-IP and per-email limits so the 11th rapid attempt is rejected with an opaque `rate_limited` `Result`, and make the application limiter the single enforcement point by turning Better Auth's built-in off. Then a one-paragraph description of the finished feedback loop on `/inspector` (lifted from the chapter outline's "finished result"): "Spam sign-in" → ten `unauthorized` rows with per-IP `remaining` counting 9 → 0, then an 11th `rate_limited` with `Too many attempts. Please try again later.` and `remaining: 0`; the "Distinct IPs runner" still caught on the per-email gate; "Force Upstash down" → sign-ins proceed and the log fills with `rate_limit_unavailable`. Use a `Screenshot` of `/inspector` post-spam (recent-responses log + structured-log tail) if a finished-app capture is available; otherwise the prose description stands.

### Your mission (header: "Your mission")

Per the contract: one opening prose paragraph in project terms weaving the constraints, the senior reasoning, and the out-of-scope line — **no implementation hints, no subsection headers** — followed by a single requirements checklist where each item is one observable outcome tagged `[tested]` / `[untested]`. Render with `Checklist` / `ChecklistItem` (the `tested`/`untested` chip). Constraints to weave (user terms, not code shapes):

- Sign-in is the *dual-keyed* endpoint: per-IP catches a single noisy host, per-email catches credential stuffing spread across IPs; per-IP alone misses the cross-IP attack and per-email alone is a lockout vector, so **both gates must pass**.
- Gating runs **before** the password check — gating after pays the hash cost on every call even past the budget (the senior cost argument).
- Every rejection is **identical** regardless of which gate tripped: returning "IP-limited" vs "email-limited" leaks which gate fired and confirms an address exists. The opaque message is user-facing; the honest gate+key are operator-only (structured log).
- The action **cannot set HTTP response headers** (Server Action `headers()` is read-only), so the rate-limit budget travels inside the success `Result`; literal `RateLimit-*` headers exist only on the read-only route-handler twin.
- The limiter **fails open** on a Redis outage — auth must not go down because Redis is unreachable; the outage is logged as an alertable event.
- Better Auth's built-in limiter goes **off**: the application wrapper is the one enforcement point; two limiters with different budgets/keys on one surface is a debugging trap.
- Senior trust calls (prose, no code): `getClientIp` trusts the platform's `x-forwarded-for` (correct on Vercel); `normalizeEmail` is trim+lowercase only (no `+`-alias stripping) and the same normalization runs at the DB lookup so limiter and lookup count one identifier.
- Out of scope (one line): the sign-up and reset gates (lessons 4–5).

Requirements checklist (mirror the chapter outline's eight items; tags assigned by what the inspector/tests can assert vs. what only the reference solution shows). Mark `[tested]` the behaviors the test file can drive deterministically through the action/limiter; mark `[untested]` the inspector-timing-and-config observations:

1. The 11th sign-in from the same IP within one minute returns `rate_limited`; calls 1–10 return `unauthorized` with the per-IP `remaining` counting 9 → 0. **[tested]**
2. The same email hammered across distinct IPs is throttled on the per-email gate — the 11th cross-IP attempt returns `rate_limited` with logged `key: 'email:<active-email>'`, while each per-IP key stays fresh. **[tested]**
3. The action carries its budget inside the `ok` payload's `rateLimit` field (`limit`/`remaining`/`reset`); it sets no `RateLimit-*` HTTP headers (those exist only on `/api/limit-demo`). **[tested]**
4. The rejection message reads exactly `Too many attempts. Please try again later.`, identical whichever gate tripped; the gate+key surface only in the `rate_limit_log` row. **[tested]**
5. With "Force Upstash down" on, 15 spammed sign-ins all proceed (fail-open) and the log shows 15 `rate_limit_unavailable` rows. **[tested]**
6. After the window resets (or counters cleared), the next sign-in returns `unauthorized` again with `remaining: 9`. **[tested]**
7. `src/lib/auth.ts` carries `rateLimit: { enabled: false }` as its only `rateLimit` entry, and a successful sign-in still lands on `/dashboard`. **[untested]** (config + happy-path navigation — verified by hand in Moment of truth; tests don't reach into `auth.ts` config or drive a real login)
8. With "Gate after work" off, the 11th+ calls skip the password hash (`verify_ms ≈ 0`); with it on, every call pays the hash; awaiting `pending` on the path (the "Await pending" toggle) adds 5–10ms vs the `after()` baseline. **[untested]** (timing observation — read off the inspector's timing readout by hand)

### Coding time (header: "Coding time")

One build-prompt line directing the student to implement against the brief and tests: implement `src/lib/keys.ts`, `src/lib/safe-limit.ts`, `src/lib/rate-limit-headers.ts`; wrap `src/app/(auth)/sign-in/actions.ts`; flip `src/lib/auth.ts`. Then the full reference solution hidden in `<details>` (writer wraps it). Present the files in repo dependency order: helpers first, then the action that composes them, then the auth flag. The exact reference code lives in the solution repo at the paths below — reproduce it verbatim; key load-bearing points the prose must cover:

- **`src/lib/keys.ts`** — `getClientIp(headers)`: `x-forwarded-for` first comma-segment trimmed → `x-real-ip` → `'unknown'`; `normalizeEmail(email)`: `email.trim().toLowerCase()`. Use `Code` (two short functions, no stepping needed). Inline rationale: the `x-forwarded-for` trust boundary (correct on Vercel; strict rejection deferred to chapter 081) and the no-`+`-strip decision (an alias and its base stay distinct keys on purpose; same normalization at limiter key and DB lookup). Covers `[untested]` naming/placement of these pure helpers.
- **`src/lib/safe-limit.ts`** — `RateLimitResult = Awaited<ReturnType<Ratelimit['limit']>>` (derived from the library, not a parallel interface). `safeLimit(limiter, prefix, key)`: `try { return await limiter.limit(key); } catch { await logRateLimit({ event: 'rate_limit_unavailable', limiter: prefix, key }); return { success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }; }`. Use `Code`. **Callout** (`Aside` note): `prefix` is a parameter because `Ratelimit.prefix` is `protected readonly` in `@upstash/ratelimit@2.0.8` — reading `limiter.prefix` from outside is a TS2445; call sites pass the literal (`'rl:signin'`). Rationale: this is the *one place* the fail-open policy lives — flipping to fail-closed is changing the returned `success` to `false`, once.
- **`src/lib/rate-limit-headers.ts`** — `rateLimitBudget(r)` → `{ limit, remaining, reset: Math.ceil((r.reset - Date.now()) / 1000) }` (delta-seconds; raw ms is the bug). `rateLimited(r, gate, key)` → logs `rate_limit_rejected` (gate+key+remaining+reset) then `return err('rate_limited', 'Too many attempts. Please try again later.')` — the **action** reject helper, opaque message identical across gates. `rateLimitHeaders(r)` / `rateLimitedResponse(r)` → the **route-handler twin** set (literal `RateLimit-*` + `Retry-After` + JSON 429), used only by `/api/limit-demo`. Use `AnnotatedCode` here — four exports with distinct roles, and the action-path-vs-route-twin split is exactly the focus-direction `AnnotatedCode` is for (one step on `rateLimitBudget` = rides the `Result`, one on `rateLimited` = opaque message + honest log, one on the two route-twin functions = headers live only here). Covers the `[untested]` placement decision: the user-safe contract lives in `rateLimited`, not at the call site.
- **`src/app/(auth)/sign-in/actions.ts`** — the wrap. Zod `strictObject` parse (`email` trim+lower piped to `z.email()`, `password` min 1, `next` optional) → `ip = getClientIp(await headers())`, `email = parsed.data.email` → `ipLimit = await safeLimit(signInLimiter, 'rl:signin', \`ip:${ip}\`)`, early-return `rateLimited(ipLimit, 'ip', ip)` on `!success` → same for `emailLimit` with `\`email:${email}\`` (cheaper IP first) → `try { await auth.api.signInEmail(...) } catch (e) { after both pending; return mapAuthError(e) }` → on success `after(ipLimit.pending)` + `after(emailLimit.pending)`, then `ok({ redirectTo: safeNext(parsed.data.next) ?? '/dashboard', rateLimit: rateLimitBudget(ipLimit) })`. Use `AnnotatedCode` — the gate-before-work ordering, the two-gate early-return structure, the credential outcomes flowing through `mapAuthError` (not invented inline), the `ok`-not-`redirect` decision (the form navigates client-side off `state.data.redirectTo`, keeping the chapter-055 `useActionState` `(state, formData)` shape), and the `after(pending)` placement on **both** branches are the parts worth stepping. Rationale to cover: gate-before-work, the budget-rides-the-`Result` rule, why `after()` not `await`.
- **`src/lib/auth.ts`** — one-line flip: `rateLimit: { enabled: false }` with the naming comment ("app-level limiters are the single enforcement point; leaving the built-in on means two limiters competing over the same surface"). Use `Code` showing just the relevant config slice. The `secondaryStorage` adapter that would point the built-in at Upstash is the named-but-not-chosen alternative — one sentence, link out.

Cross-references (link, don't re-explain): lesson 3 of chapter 074 for dual-keying, gate-before-work, the opaque-message rule, `safeLimit` fail-open, `getClientIp`/`normalizeEmail`, and the `secondaryStorage` alternative; lesson 2 of chapter 074 for the `Ratelimit` return shape and the budget-on-`Result` rule; chapter 030 for `after()`. No new external resources expected (resourcer appends if any, after the `<details>`).

No diagram needed — the request flow (parse → ip gate → email gate → `signInEmail` → `ok` with budget / `rateLimited` on reject) is short and linear; the `AnnotatedCode` on the action carries it. The two-layer architecture diagram already lives in the Project Overview.

### Moment of truth (header: "Moment of truth")

Test command and expected pass output, then the by-hand checklist for the `[untested]` items. Command: `pnpm test:lesson 3`. Show the expected passing Vitest summary (all Lesson 3 assertions green). Then a hand-verification `Checklist` covering what the tests don't drive (lift the chapter-outline Moment-of-truth steps):

- "Reset counters" → "Spam sign-in" with a wrong password → ten `unauthorized` rows, per-IP `remaining` 9 → 0, entry 11 `rate_limited` with the opaque message + `remaining: 0` + logged `key: 'ip:<addr>'`; panel reads `signin → ip:<addr> → 0/10`; structured-log tail shows the honest `rate_limit_rejected` row.
- Run the "Distinct IPs runner" (`spoof-ip-runner`) → fresh synthetic `ip:` key per iteration but the same `email:<active-email>` key; 11th returns `rate_limited` with `key: 'email:<active-email>'`. (The chapter's load-bearing cross-IP proof.)
- Toggle "Gate after work" on → every call pays ~80–150ms hash even past the budget; off → 11th+ collapse to ~5–15ms (Upstash round-trip alone).
- Toggle "Force Upstash down" on → spam 15× → all `unauthorized`, log shows 15 `rate_limit_unavailable`; toggle off.
- After a rejection, "Reset counters" → "Send one" → `unauthorized` with `remaining: 9`.
- Toggle "Await pending instead of after()" on → per-call timing inflates 5–10ms; off → baseline.
- Open `src/lib/auth.ts` → `rateLimit: { enabled: false }` is the only `rateLimit` entry; a real sign-in as `alice` still lands on `/dashboard`.
- Open `/api/limit-demo` repeatedly → after the budget is spent it returns a real 429 with literal `RateLimit-*` headers + `Retry-After` and the opaque JSON body — the one place those headers exist.

## Scope

This lesson covers only the **sign-in** gate plus the three shared helper files and the Better Auth swap. It does **not** cover:

- The **sign-up** per-IP gate and the per-IP-only reasoning — lesson 4.
- The **reset** per-IP+per-email gate and its third-party-cost reasoning — lesson 5.
- Declaring the Redis client / limiter instances / env vars — lesson 2 (prerequisite, done at entry).
- The `Ratelimit` constructor internals, `ephemeralCache`, sliding-window choice — lesson 2 of chapter 074 (linked).
- Strict rejection of a missing/spoofed `x-forwarded-for` chain — chapter 081 (named, deferred).
- Pointing Better Auth's built-in at Upstash via `secondaryStorage` — named-but-not-chosen alternative, lesson 3 of chapter 074.
- Playwright/integration assertions on the `RateLimit-*` and 429 path — chapter 088.
