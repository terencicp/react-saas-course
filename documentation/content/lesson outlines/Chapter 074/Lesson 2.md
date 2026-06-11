# The @upstash/ratelimit API surface

- Title (h1): The @upstash/ratelimit API surface
- Sidebar label: The ratelimit API

---

## Lesson framing

This is the **mechanics lesson** of chapter 074. Lesson 1 already sold the *why*: two rings (edge WAF + application limiter), the public-URL-plus-email-password trigger, why Upstash Redis is the stack default, fail-open on auth. Lesson 3 will *wire* the dual-keyed limiters into the Better Auth sign-in/sign-up/reset actions. This lesson sits between them: it teaches the **primitive vocabulary** — the client, the limiter object, the three algorithms, the `limit()` return shape, key design, the cost/latency model, and the RFC-shape headers — so lesson 3 can spend its budget on the *seam* (gate-first, dual-key, 429 contract) instead of re-explaining the API.

Pedagogical conclusions that govern the whole lesson:

- **Code is the vehicle, decisions are the lesson.** This is an API-surface lesson, so code blocks dominate — but every block is framed by a senior decision (which algorithm, where the limiter lives, what the key encodes, whether to keep analytics on). Never present the API as a config reference; present each field as an answer to a question. The course's filter is *systems design over syntax*; even here the syntax serves a decision.
- **Build the mental model in two moves, lowest cognitive load first.** Move 1: the *connectionless* model — Redis over HTTP/REST, one shared client, no pool, no lifecycle (this is the surprising part for anyone who has used `ioredis`/`pg`, so land it early and explicitly). Move 2: `@upstash/ratelimit` as a *thin wrapper* over that client — "you write the config, the library writes the Lua." Don't show the limiter before the client; the limiter consumes the client.
- **One canonical artifact threads the lesson.** Build `lib/rate-limit.ts` incrementally: a single `signInLimiter` declared at module scope, then read its `limit()` result, then map that result onto HTTP headers. The student should leave able to *read and write* this file. Lesson 3 expands it to three limiters + `safeLimit`; this lesson establishes the shape and explicitly flags that `safeLimit` and dual-keying are deferred so downstream agents and students don't treat the bare `await limiter.limit(key)` here as the production call site.
- **The module-scope rule is the one footgun that bites in production but not in dev.** It deserves its own beat with a before/after, because the failure mode (limiter-in-handler ⇒ cold cache every request ⇒ a Redis round-trip on every call) *works fine in dev* and only shows up as latency/cost under traffic. This matches the "what beginners get wrong in the real world" prompt.
- **Headers are a contract, not decoration.** The IETF `RateLimit-*` headers are how clients and load-tests read limiter state. Teach the de-facto three-field form (`RateLimit-Limit`/`-Remaining`/`-Reset`) because that is what the ecosystem and the verify recipe in ch075 use, but be honest about the draft's current direction (see Fact-check note) so the student isn't surprised reading the spec. Headers-on-every-response (not just 429s) is a senior reflex worth naming.
- **Numbers anchor confidence.** Students hesitate to add limiters because they fear cost/latency. Give concrete order-of-magnitude figures (free tier, per-call cost, same-region p50/p99) so "add a limiter" stops feeling expensive. Frame against the request budget the auth endpoint already pays (DB round-trip + password hash).
- **Visual aids over prose for two things:** (1) the connectionless client model vs a pooled TCP client — a small two-panel comparison kills the "where's the connection pool?" confusion; (2) the `limit()` result → HTTP response mapping — a labeled diagram showing each return field flowing to its header/branch is higher-bandwidth than a table. Keep both compact (laptop-short).
- **Check understanding with low-friction interactives,** placed at the moment each concept lands: a `Buckets` drill for the algorithm-selection decision, a `Dropdowns` fill-in on the `limit()` destructure + header mapping. No heavy sandbox — `@upstash/ratelimit` cannot run in the ReactCoding iframe (react-only) and needs a live Redis, so live-coding the real limiter is off the table; lean on guided exercises instead.

Estimated student time: 45–55 minutes.

---

## Lesson sections

### Introduction (no header)

Open with the concrete situation, senior-question-implicit (per pedagogy: the question is *in* the prose, not a heading). The student finished lesson 1 holding the *decision* — Upstash is provisioned, the two env vars are in `env.ts`, `@upstash/ratelimit` is installed — and now faces the blank `lib/rate-limit.ts`. State the three questions this lesson answers: what does the app actually *call*, which algorithm is the default and what flips it, and what does a `limit(key)` call *return* that the handler turns into a response. Connect back: they know route handlers and the request surface (ch033/046), they know `env.ts` validates the two Upstash vars (ch037/041). Preview the artifact they leave with: a readable `lib/rate-limit.ts` and the `limit()`→response mental model. Explicitly set the boundary: this lesson builds *one* limiter and reads it; the dual-keyed wiring and the fail-open wrapper are lesson 3. Keep it warm, ~2 short paragraphs.

One sentence to carry the lesson, stated here and reusable: **the limiter is a module-scope object you ask one question — `limit(key)` — and it answers with a verdict plus the numbers you put on the wire.**

### The connectionless client: Redis over HTTP

**Goal:** install the surprising-but-simple mental model before any limiter appears. Anyone who has used `pg` or `ioredis` expects a connection pool and a lifecycle; Upstash Redis is reached over HTTP/REST, so the "client" is just a thing that holds a URL + token and makes fetch calls.

Content:
- The one line: `import { Redis } from '@upstash/redis'; const redis = Redis.fromEnv();`. `fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — the exact two vars lesson 1 wired into `env.ts`. Name that the project already validates them at build time, so a missing token fails `next build`, not a 3am request.
- The connectionless consequence: the client is safe to **share across requests** — no pool to size, no `connect()`/`end()`, no "too many connections" ceiling. Each operation is an HTTPS request. This is *why* it works in edge runtimes where TCP is unavailable (callback to lesson 1's runtime-portability point — one sentence, don't re-teach).
- Note the convention choice: the project uses `Redis.fromEnv()` rather than `new Redis({ url, token })` because the env boundary is already the single source of the two vars; passing them explicitly would duplicate the binding.

Component: a single `Code` block (ts) for the two lines — it's simple, no need for AnnotatedCode.

Diagram — **two-panel comparison, side by side** (HTML+CSS inside a `Figure`, or `TabbedContent` with two panels). Panel A "Pooled TCP client (`pg`, `ioredis`)": app → connection pool (N sockets, connect/idle/close lifecycle) → server. Panel B "Connectionless (`@upstash/redis`)": app → `fetch(url, token)` → server, no pool box. Pedagogical goal: make "where's the pool?" answer itself visually; the absence of the pool box *is* the point. Keep it short and horizontal. Caption: one HTTPS request per op; nothing to keep alive.

`Term` candidates here: **connectionless** (definition: reached over stateless HTTP requests, no long-lived socket or pool), **REST** only if it reads as a non-obvious acronym in context (likely skip — audience knows REST). Keep `CodeTooltips` for `fromEnv` if useful: "reads UPSTASH_REDIS_REST_URL + _TOKEN from the environment; throws at startup if either is missing."

### What @upstash/ratelimit adds on top

**Goal:** position the limiter library as a thin wrapper over the client the student just built — set expectations before showing config so the fields aren't a wall.

Content:
- One sentence on the layering: `@upstash/redis` is the client (last section); `@upstash/ratelimit` is a small library that *uses* that client to turn Redis into a limiter exposing one method, `limit(key)`.
- What the library does *for* you, so the student values it: the counter math, the key TTLs (so a window expires automatically — callback to lesson 1's TTL term, one line), the in-memory cache layer (introduced properly in the module-scope section), and the optional analytics write. "You write the configuration; the library writes the Lua that runs atomically in Redis." Name *why* atomic matters in one clause: two simultaneous requests can't both read-then-increment a stale count.
- Set the division of labor as the takeaway: the rest of this lesson is *configuration decisions*, not implementation.

Component: prose only, or one tiny inline `Code` showing the import line `import { Ratelimit } from '@upstash/ratelimit';` to anchor the package name distinct from `@upstash/redis` (reinforces lesson 1's four-names terminology — Redis / Upstash Redis / `@upstash/redis` / `@upstash/ratelimit`).

`Term`: **Lua** (definition: the scripting language Redis runs server-side; the library ships its counter logic as a Lua script so the check-and-increment is one atomic step) — non-obvious, supports the "why a library" point. **atomic** (definition: the whole check-and-increment runs as one indivisible step; no other request can interleave) — supports the correctness framing.

### Declaring a limiter in lib/rate-limit.ts

**Goal:** the central artifact. Show the canonical single-limiter declaration and make every constructor field a decision. This is the densest block — use `AnnotatedCode` so the student's focus is directed field-by-field rather than swallowing the whole object.

The canonical code (single source for the AnnotatedCode `code` prop), conventions-aligned (single quotes, 2-space, named export, `import type` not needed here, module scope):
```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const signInLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:signin',
  analytics: true,
});
```

AnnotatedCode steps (one paragraph each, blue default, colors to differentiate):
1. `{4}` — the shared client, declared once at module scope; every limiter in this file reuses it.
2. `{6}` "signInLimiter" — a named export, module scope (forward-ref the next section for *why* scope matters). One limiter per abusable intent.
3. `{7} "redis"` — hand the limiter the shared client.
4. `{8} "Ratelimit.slidingWindow(10, '1 m')"` color green — the algorithm + budget: 10 requests per rolling 1-minute window. Forward-ref the algorithms section for the choice. Note the window is a duration *string* (`'1 m'`, `'10 s'`, `'1 h'`) the library parses.
5. `{9} "prefix"` color orange — namespaces every key this limiter writes in Redis, so `rl:signin` counters never collide with `rl:signup`. **Each limiter gets a distinct prefix** — name this as a rule (shared prefix ⇒ two limiters corrupt each other's counts). The key you pass to `limit()` does *not* include the prefix; the library prepends it.
6. `{10} "analytics: true"` color violet — populates the Upstash dashboard's per-key timeline (rate over time, top keys, reject rate). Keep it on for the auth surface so an incident is reviewable; it costs one extra Redis write per call, made non-blocking via `pending` (forward-ref the return-shape section). Naming: lesson 1's debt says this file is `lib/rate-limit.ts` and the dashboard story is named-once, deferred to ch092 for alerting.

Add a short prose note on the **`timeout` field** (named once, not in the canonical block to keep it clean): the constructor accepts `timeout` (default 5000ms) that bounds how long `limit()` waits on Redis before it resolves — relevant to the fail-mode lesson 1 raised, but the *policy* (fail-open `safeLimit`) is lesson 3. One sentence, recognition only.

Convention note for downstream agents: the canonical block omits a return-type annotation because `signInLimiter` is a `const` value, not an exported function — the conventions require return types on exported *functions*, and inference is correct here. This is deliberate.

### Why the limiter lives at module scope

**Goal:** the one footgun beat. Make the in-memory cache concrete and show the failure mode that passes in dev.

Content:
- The mechanism: `@upstash/ratelimit` keeps a small in-process cache of recently-seen keys (the `ephemeralCache`, on by default). While a serverless function instance stays "hot," repeated `limit()` calls for a blocked key can answer from memory instead of a Redis round-trip.
- The rule: declare the limiter **once at module scope** so the same instance — and its warm cache — is reused across hot invocations of that function. Declare it *inside* the handler and you build a fresh limiter with a cold cache on every request, so every call pays a Redis round-trip. Name the precise consequence: not *incorrect* (counts are still right in Redis), just *slower and pricier* — which is why it sails through dev and only shows up under load. This is the "works in dev, collapses under traffic" trap.
- One sentence on `ephemeralCache`: it can be disabled (`ephemeralCache: false`) but the auth surface keeps it on; it's an optimization for bursty hot keys, not a correctness lever.

Component: `CodeVariants` with two tabs — **Module scope** (`ins`) vs **Inside the handler** (`del` on the in-handler `new Ratelimit(...)` line) — each one paragraph. The before/after is exactly what CodeVariants is for. Per-pane color: green for the correct pane, red for the wrong one. Keep both ~6 lines.

`Term`: **hot invocation** / **cold start** (definition: a serverless instance kept warm between requests reuses module-scope memory; a cold instance re-runs module init) — re-explains the serverless execution model without a detour, supports the whole beat. **in-memory cache** can be a Term too but is fairly self-evident.

### Three algorithms, sliding window by default

**Goal:** the algorithm decision. Name three, default to one, give the trigger that flips to each of the others. Keep it crisp — this is a *defaults-before-conditionals* moment.

Content (each algorithm = signature + one-line behavior + when to reach):
- **Sliding window** — `Ratelimit.slidingWindow(limit, window)`. Weights the count across the current and previous fixed windows, so the budget glides instead of resetting on a hard boundary — smoothest experience, no thundering-edge spike. **The chapter default**, used for the auth surface.
- **Token bucket** — `Ratelimit.tokenBucket(refillRate, interval, maxTokens)`. A bucket of `maxTokens` refills `refillRate` tokens every `interval`; each request spends one. Allows controlled bursts up to bucket size, then throttles to the drip rate. Reach when the workload is a *bursty* endpoint where a steady drip is the right model — e.g. an endpoint that calls an LLM and you want to cap sustained spend while tolerating a short burst. **(Fact-check correction:** the argument order is `(refillRate, interval, maxTokens)`, not the `(max, refillRate, refillInterval)` the chapter brainstorm listed — the canonical Upstash signature leads with refill rate.)
- **Fixed window** — `Ratelimit.fixedWindow(limit, window)`. One counter per clock-aligned window; cheapest and simplest, but allows up to ~2× the budget straddling a boundary (the "thundering minute" — name it). Reach when a little boundary slop is acceptable in exchange for fewer Redis ops, or for very coarse limits.
- Name once for recognition: **`cachedFixedWindow`** — fixed window that answers from the in-memory cache first and syncs to Redis after, trading exactness for the lowest latency. Recognition only; not the auth choice.

Mention the **custom `rate`** option once, in a sentence: `limit(key, { rate: n })` spends `n` tokens instead of 1 — useful when one request represents `n` units of work (e.g. a batch). Recognition; the auth surface spends 1 per attempt.

Component: a small comparison — either a 3-row table in prose (signature · behavior · reach-for) or, better for the *decision*, a `Buckets` exercise (see below) that doubles as the check. Optionally a tiny visual: a horizontal strip showing fixed-window's hard reset boundary vs sliding-window's gliding budget (HTML+CSS in a `Figure`) — pedagogical goal is to make "smooth vs boundary spike" visible in one glance. Keep it optional/short; the table may suffice.

Exercise — **`Buckets`**, placed right after the three are introduced. Two or three buckets (`Sliding window`, `Token bucket`, `Fixed window`); items are scenario chips the student sorts: "Sign-in attempts, want the smoothest cap" → sliding; "LLM endpoint, tolerate a short burst then throttle to a steady rate" → token bucket; "Coarse internal limit, a few extra at the boundary is fine, minimize Redis ops" → fixed; "The chapter's default for auth" → sliding. Grades the decision, not the syntax. `instructions` prop: "Match each workload to the algorithm a senior would reach for."

### What limit(key) returns

**Goal:** the return shape — the bridge to the response. This is the payoff field-set the handler branches on and serializes. Teach the destructure, then map each field to its job.

The canonical call (single source):
```ts
const { success, limit, remaining, reset, pending } = await signInLimiter.limit(key);
```

Content — each field, with where it goes:
- `success` — the boolean the handler branches on. `false` ⇒ respond 429.
- `limit` — the configured budget (e.g. 10). → `RateLimit-Limit` header.
- `remaining` — what's left in the current window. → `RateLimit-Remaining` header.
- `reset` — a **Unix timestamp in milliseconds** when the window rolls over. Note the conversion: the header wants *delta-seconds*, so `Math.ceil((reset - Date.now()) / 1000)` → `RateLimit-Reset` (and `Retry-After`). Flag the units explicitly — passing the raw ms timestamp as the header value is a common bug.
- `pending` — a Promise the library uses to flush the analytics write. Hand it to the platform's `waitUntil` (or `await` it) so the analytics write doesn't block the user response. Show the Vercel pattern in one line and name the saving (a few ms off the user-visible path); note it's best-effort by design.
- Name once for recognition: `reason` — present on a denial to say *why* (`'timeout'`, `'cacheBlock'`, `'denyList'`); the auth surface doesn't branch on it, but it's there for diagnostics.

`pending` + `waitUntil` note: the precise wiring into the action lives in lesson 3 / ch075; here show the shape so the field isn't a mystery. One sentence: on Vercel Functions you reach `waitUntil` via `import { waitUntil } from '@vercel/functions'` (or the route handler's context) — recognition, deferred for the real call site.

Components:
- `AnnotatedCode` (or `CodeTooltips`) on the destructure + the header mapping, walking field → destination. Given there are ~5 fields each going somewhere, AnnotatedCode with one step per field-group is the right focus tool. Use color to tie each field to its header.
- **Diagram — the result-to-response map** (`Figure`, HTML+CSS or `ArrowDiagram`). Left: the `limit()` result object with its fields listed. Right: an HTTP response with status line + the four headers. Arrows: `success` → branch (200 vs 429), `limit`→`RateLimit-Limit`, `remaining`→`RateLimit-Remaining`, `reset`→(convert to delta-seconds)→`RateLimit-Reset`/`Retry-After`, `pending`→`waitUntil` (off to the side, not on the response). Pedagogical goal: cement that the return shape *is* the response source — nothing is hand-computed. If `ArrowDiagram`, remember `expandable={false}` and it goes inside `Figure`. Caption names the units gotcha (ms timestamp → delta-seconds).

Exercise — **`Dropdowns`** (fenced-code mode with `___` blanks): give the destructure and a `headers` object with blanks for which field maps to which header (and the `reset` conversion), so the student commits the mapping. e.g. `'RateLimit-Remaining': String(___)` → `remaining`. Low-friction, checks exactly the mapping just taught.

### The RateLimit-* response headers

**Goal:** the header contract — what to send, on which responses, and the precedence rule. Frame as a contract clients and load-tests read, not decoration.

Content:
- The four headers: `RateLimit-Limit` (budget), `RateLimit-Remaining` (left), `RateLimit-Reset` (delta-seconds until reset), and on a 429 also `Retry-After` (delta-seconds; takes precedence when both are present).
- The senior reflex: write the headers on **every** response, success or 429 — not only on rejections. A well-behaved client reads `RateLimit-Remaining` on a 200 and backs off *before* it gets throttled. The verify recipe in ch075 reads these headers to assert the limiter works, so they're not optional.
- Build the headers *from the `limit()` result*, never hand-counted (callback to the previous diagram). Show a tiny `rateLimitHeaders(result)` helper shape that returns the header set — but keep it minimal; lesson 3 owns the production helper that also folds in `Retry-After` on rejection and the user-safe 429 body. Flag this as a sketch, not the final contract.
- **Fact-check honesty beat (short Aside or one paragraph):** the IETF draft (`draft-ietf-httpapi-ratelimit-headers`) is the convention these names come from, but the *current* draft (v11, Standards Track, expires Nov 2026) has moved toward a single structured `RateLimit` header paired with `RateLimit-Policy` rather than the three separate fields. The three-field form taught here is the earlier-draft shape that remains the **de-facto standard** the ecosystem (including `@upstash/ratelimit` examples and most clients) still uses. Teach the three-field form because it's what the stack and the verify recipe use; name the draft's direction so the student isn't surprised reading the spec, and so the lesson doesn't teach an outdated thing as *the* standard. Keep this to ~3 sentences — recognition, not a detour.

Components: one `Code` block for the header set / tiny helper; an `Aside` (note) for the IETF-draft nuance so it's visually set apart from the main teaching. `ExternalResource`/`LinkCard` to the IETF datatracker draft in the external-resources area at the end (optional).

`Term`: **delta-seconds** (definition: a count of seconds from now until the event, not an absolute timestamp — what `RateLimit-Reset`/`Retry-After` carry). **Retry-After** can be a Term if it reads as unfamiliar (definition: standard HTTP header telling the client how long to wait before retrying).

### Designing the key you pass to limit()

**Goal:** key design — the string is the identity the limiter counts under, and getting it wrong silently breaks the limit. This section is deliberately *narrow* (it sets up lesson 3's dual-keying without doing it).

Content:
- The key is the identifier counted under; the limiter prepends its `prefix`, so the key does **not** repeat it.
- The three shapes the auth surface uses (named here, *applied* in lesson 3):
  - per-IP — the client IP, read from the `x-forwarded-for` header (Vercel sets it; take the first entry). One sentence; the full parse helper (`getClientIp`, trust boundary) is lesson 3.
  - per-email — a **normalized** email (`email.trim().toLowerCase()`).
  - per-user — the authenticated user id.
- The senior rules:
  - **Normalize once, at a boundary helper** (foreshadow `lib/keys.ts` from lesson 3) so two call sites can't pick different shapes for the same intent — if one path lowercases and another doesn't, the attacker bypasses the per-email cap by varying case. Make this concrete: `User@x.com` and `user@x.com` must hit the *same* counter.
  - Keep keys lowercased and length-bounded; never embed PII beyond the email; never embed secrets (the key is written to Redis and shows in analytics).
  - The normalization used for the limiter key must match the normalization used for the DB lookup, or the limiter and the lookup count different identifiers (deeper in lesson 3; name it here in one clause).
- Distinct *namespaces under one limiter*: forward-ref that lesson 3 passes `'ip:'+ip` and `'email:'+email` to the **same** `signInLimiter` to keep two gates under one budget config — name it as a teaser, don't implement.

Component: a `Code` block showing the three key shapes as plain expressions (not a full handler). Optionally `CodeTooltips` on `trim().toLowerCase()` ("normalize so case/whitespace variants count as one key").

Exercise (optional, if budget allows) — a small `MultipleChoice` or `TrueFalse`: "Passing `req` IP without lowercasing the email lets an attacker bypass the per-email limit by varying case — true/false" (true), reinforcing the normalize-once rule. Keep light; the heavier key work is lesson 3.

### What a limiter costs

**Goal:** kill the cost/latency fear with numbers, so "add a limiter" feels cheap. Anchor against the request budget the endpoint already pays.

Content:
- **Redis ops:** one Upstash request per `limit()` call by default; near-zero when the in-memory cache answers (blocked hot keys). Analytics adds one more write per call — made non-blocking via `pending`. So budget ~1–2 ops per limited request.
- **Free tier:** sized for a small SaaS — order-of-magnitude figure (state it as "the free tier covers tens of thousands of commands/day; the next tier is pay-per-block"), framed so the student doesn't fear adding limiters to several endpoints. (Fact-check note: give the figure as an order of magnitude with a "verify current limits" nudge rather than a hard number, since pricing tiers drift.)
- **Latency:** same-region Upstash adds ~5–15ms p50, ~25–40ms p99; cross-region 50–100ms (callback to lesson 1's co-locate rule, one line). Put it in proportion: an auth endpoint already pays a DB round-trip plus a deliberately-slow password hash, so the limiter is a small slice of the request budget — and it runs *before* that work, capping it. This connects to observability (ch092, named once) for what to watch.
- The two levers to remember: `ephemeralCache` (cuts Redis calls on bursty hot keys) and `pending`/`waitUntil` (keeps the analytics write off the user path).

Component: prose with the figures called out — possibly a tiny `Code` comment-free snippet is unnecessary here; a compact two-column "op count / latency" callout via a `Figure` or `Aside` is enough. Keep it skimmable; numbers are the content.

`Term`: **p50 / p99** (definition: median and 99th-percentile latency — half of requests are faster than p50; 99% are faster than p99) — non-obvious shorthand, supports the section.

### Two escape hatches you should recognize

**Goal:** name `deny` lists and multi-region once each so the student recognizes them, without expanding scope. Single short section grouping the two "named for recognition" items (they share the *recognition-only* nature, but each is anchored to a real capability, so this is content-driven, not a tips bucket).

Content:
- **Deny lists** — `Ratelimit.deny()` (and the protection mode) hard-blocks specific identifiers (a known abuse IP, a sanctioned range) without a Redis round-trip. Reach when a specific out-of-band abuse signal needs an immediate block. The course's auth surface relies on the limiter plus Better Auth's existing security primitives rather than a hand-rolled deny list — so this is recognition, not a build step.
- **Multi-region replication** — `MultiRegionRatelimit` reads from the nearest replica and syncs counts across regions via CRDTs; the trade-off is eventual consistency on counts (a hot key in two regions can briefly exceed the budget). Reach when the Vercel deploy is genuinely multi-region; the course's single-region deploy doesn't need it.

Component: prose, two short paragraphs. Optionally a `Card`/`CardGrid` pair (one card each) to signal "reference, reach-for-when." `Term`: **CRDT** (definition: conflict-free replicated data type — a structure whose replicas merge automatically without coordination, so multi-region counts converge) — non-obvious acronym, supports the multi-region item.

### Recap / what you can do now (no header, or short "Putting it together")

**Goal:** consolidate the mental model and hand off cleanly to lesson 3. Restate the carry sentence. List the artifact the student can now read/write (`lib/rate-limit.ts` with one module-scope limiter), the decision they can make (algorithm by workload), the call they can read (`limit()` → fields → headers). Name the explicit handoff: lesson 3 adds the *three* limiters, the per-IP-and-per-email dual-keying, the `safeLimit` fail-open wrapper, and the user-safe 429 body — i.e. the bare `await limiter.limit(key)` shown here becomes `await safeLimit(limiter, key)` at the real call site.

Optional **external resources** (`ExternalResource`/LinkCard, end of lesson): Upstash ratelimit docs (algorithms + features pages), the IETF RateLimit-headers datatracker draft. Optionally a short `VideoCallout` *only if* a current, high-quality Upstash ratelimit walkthrough exists — do not invent one; the resourcer should verify before embedding. The API is simple enough that a video is a nice-to-have, not needed.

---

## Scope

**Prerequisites to restate briefly (one line each, do not re-teach):**
- The two-ring model, the public-URL+email-password trigger, why Upstash is the default, fail-open-on-auth, the four names (Redis / Upstash Redis / `@upstash/redis` / `@upstash/ratelimit`), `lib/rate-limit.ts` as the module, TTL — all from **lesson 1**. Reference, don't re-derive.
- `env.ts` validates `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` at build time (ch037/041) — assume present.
- Route handlers, the request surface, reading headers (ch033/046) — assume known.

**This lesson does NOT cover (defer, name at most once):**
- The per-IP **and** per-email dual-keying applied to sign-in — **lesson 3**. (Tease the `ip:`/`email:` namespaces only.)
- The real `safeLimit` fail-open wrapper and the `try/catch` policy decision — **lesson 3**. (Name `timeout` once; don't build the wrapper.)
- The user-safe 429 response body and the enumeration-safe error contract — **lesson 3**.
- The `getClientIp` / `normalizeEmail` parse helpers in `lib/keys.ts` (trust boundary, `+`-alias decision) — **lesson 3**. (Name the key *shapes* only.)
- Better Auth's built-in rate limiter and the swap-out / `secondary-storage` choice — **lesson 3 / ch075**.
- The verify recipe (run N requests, read headers, watch the dashboard) — **ch075 project (lesson 5)**.
- The Upstash dashboard tour, incident-review workflow, and alerting wiring — **named once, deferred to ch092**.
- Upstash Redis primitives beyond the limiter (`SETEX`, `INCR`, pub/sub, single-use tokens) — out of scope; named when other chapters reach for them.
- Per-region latency tuning beyond the one co-locate sentence; the full multi-region build — out of scope (named once).
- Writing the Vercel WAF / Firewall rule in code — lesson 1's scope (named once there), out of scope here.

---

## Code conventions notes (for downstream agents)

- Single quotes, 2-space indent, trailing commas multiline, semicolons on, line length 80 (Biome).
- Imports in three groups (external / `@/` aliases / relative), alphabetical within group; `@upstash/ratelimit` and `@upstash/redis` are external. In lesson code, real project files import `env` rather than `process.env`, but `Redis.fromEnv()` reads the env directly *inside the library* — that's fine; note the project already validated the vars via `env.ts`.
- `signInLimiter` is a `const` value, not an exported function — no return-type annotation needed (inference is correct). Module-scope, named export. This is deliberate and conventions-aligned.
- The bare `await limiter.limit(key)` here is a teaching shape; flag explicitly that the production call site wraps it in `safeLimit` (lesson 3). Downstream lessons must not treat this lesson's snippet as the final call site.
- `reset` is ms; header values are delta-seconds — show the `Math.ceil((reset - Date.now())/1000)` conversion so no agent ships the raw ms.
- Error-handling channel (`Result`) is not exercised here (no action boundary in this lesson); 429 shaping is lesson 3.

---

## Fact-check notes (verified June 2026)

- `@upstash/ratelimit` current version **v2.0.8** (published 2026-01-12). API surface confirmed against Upstash docs (algorithms + features pages) and the ratelimit-js README.
- **Algorithm signatures** confirmed: `Ratelimit.slidingWindow(limit, window)`, `Ratelimit.fixedWindow(limit, window)`, `Ratelimit.tokenBucket(refillRate, interval, maxTokens)`, `Ratelimit.cachedFixedWindow(...)`. **Corrected** the chapter-brainstorm's token-bucket arg order (`max, refillRate, refillInterval` → `refillRate, interval, maxTokens`).
- `limit()` return shape confirmed: `{ success, limit, remaining, reset, pending, reason }`. `reset` is a **ms** Unix timestamp. `pending` is the analytics-flush promise for `context.waitUntil`.
- Constructor config confirmed: `redis`, `limiter`, `prefix`, `analytics`, `ephemeralCache` (Map or auto; `false` to disable), `timeout` (default **5000ms**). Custom per-call `rate` and `MultiRegionRatelimit`/CRDT replication confirmed. `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.
- **IETF headers correction (important):** the chapter brainstorm presents `RateLimit-Limit`/`-Remaining`/`-Reset` as "the IETF draft." The *current* draft is **draft-ietf-httpapi-ratelimit-headers-11** (Standards Track, expires 2026-11-24) and has moved toward a **single structured `RateLimit` header + `RateLimit-Policy`**. The three-field form is the earlier-draft shape that remains the **de-facto** convention the ecosystem still ships (including `@upstash/ratelimit`). The lesson teaches the three-field form (what the stack/verify recipe use) and adds a short honesty beat naming the draft's direction so nothing outdated is taught as *the* standard.
- Free-tier figure: stated as an order of magnitude with a "verify current limits" nudge (pricing tiers drift); not a hard number.
