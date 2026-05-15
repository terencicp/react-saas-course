## Concept 1 — The limiter seam: action boundary, not catch-all

**Why it's hard.** The student's instinct is to wrap the framework-provided handler — Better Auth's `[...all]` catch-all, or "the route" — because that's where requests visibly arrive. They also default to leaving Better Auth's built-in limiter on as belt-and-braces. Both choices defeat the chapter: limits at the catch-all double-count with Better Auth's internal limiter, and the application-level pattern can't be reused for non-auth endpoints later.

**Ideal teaching artifact.** A side-by-side request-flow diagram, two columns. Left column: the *naive layering* — request → catch-all (wrapped) → Better Auth → its in-memory limiter → `auth.api.signInEmail`. The diagram is annotated with two red flags: "two limiters competing, different budgets" and "direct `auth.api.*` callers from server actions skip the wrap". Right column: the *chapter's choice* — request → server action → `safeLimit` → `auth.api.signInEmail` → Better Auth (`rateLimit: { enabled: false }`). One seam, one place to change budgets, same shape every future endpoint copies. Decision archetype: lead with the threshold ("the moment you call `auth.api.*` directly from a server action") and the alternative ("the `secondary-storage` adapter would point Better Auth's built-in at Upstash; named in 15.3.3, not chosen because the action-boundary pattern reuses for webhooks and uploads").

**Engagement.** A four-statement true/false round immediately after the diagram: "Limits at the catch-all also cover server-action callers of `auth.api.*`" (F), "Better Auth's built-in and the application limiter can coexist" (technically yes, pedagogically F — the chapter's rule is one place), "Sign-up wrapping at the action seam also protects the catch-all route" (F), "Disabling Better Auth's built-in is part of the swap, not an optional polish" (T).

**Components.**
- `Figure` wrapping a two-column hand-SVG (naive vs. chosen layering). The arrows and the red-flag annotations are the lesson; a generic `ArrowDiagram` would dilute them.
- `TrueFalse` round below the figure.
- Alternative: render each column as its own `ArrowDiagram` inside a `TabbedContent` if the SVG proves heavy to author — loses simultaneous comparison.

**Project link.** Lands in 15.4.4 as the one-line flip of `rateLimit: { enabled: false }`; the diff is small but the diagram is what makes the flip non-arbitrary.

## Concept 2 — Module-scope instances and the in-memory cache

**Why it's hard.** Students reflexively construct dependencies "where they're used". A `new Ratelimit(...)` inside the action handler looks cleaner — fewer global exports, easier to read in isolation. The cost is invisible until the second request: `ephemeralCache` lives on the instance, and a fresh instance per request hits Redis on every `limit()` call. The misconception is "the cache is in Redis" — it isn't, it's in process memory keyed to the instance.

**Ideal teaching artifact.** A two-pane scrubbable timeline. Top pane: a sequence of 8 incoming requests over 10 seconds. Bottom pane: for each request, a stacked indicator showing whether the call hit Redis (one round-trip box) or `ephemeralCache` (zero round-trips, a faded box). A toggle flips between *module-scope* and *handler-scope* construction. Module-scope: request 1 hits Redis, requests 2–8 hit cache. Handler-scope: every request hits Redis, eight round-trips. The cumulative round-trip count ticks visibly. Mechanics-as-explorable archetype — the student sees the cost of the wrong placement instead of being told.

**Engagement.** After scrubbing, a `PredictOutput`-shaped question: "Module-scope, 50 requests in the cache window. How many Redis round-trips?" Answer: 1 (plus the rolling-window analytics writes deferred to `after()`, named in prose, not counted). Then a second prediction under handler-scope: 50.

**Components.**
- New: `LimiterCacheTimeline` (see proposals). Compounds in 15.2 cache lessons and Unit 22 (Upstash workloads).
- Alternative: a static `Figure` with two columns (module-scope vs. handler-scope) hand-drawn as small request-trace strips, plus a one-line cumulative-round-trip count under each. Less visceral but ships immediately.
- `MultipleChoice` for the recall beat.

**Project link.** 15.4.3 wires the three module-scope instances; the inspector's request-trace panel (provided) shows the cache hits live, which is the runtime confirmation of what the timeline taught.

## Concept 3 — Key resolution: `getClientIp` and `normalizeEmail`

**Why it's hard.** Both helpers look trivial — `headers.get('x-forwarded-for').split(',')[0]` and `email.trim().toLowerCase()`. The senior content lives in what they *don't* do. `getClientIp` trusts the platform; on Vercel that's safe, on a self-hosted Fly/Railway/VPS it isn't — a header set by the client themselves is the spoof vector. `normalizeEmail` deliberately *doesn't* strip the `+` alias, because Gmail treats `foo+a@` and `foo+b@` as the same mailbox but other providers don't. Both helpers carry a trust boundary the student has to see.

**Ideal teaching artifact.** A "trust the input?" decision table rendered as two adjacent panels — one per helper. Each panel: three columns — *input the helper receives*, *what the helper returns*, *what an attacker could do if you trusted further*. For `getClientIp`: `x-forwarded-for: 1.2.3.4, 5.6.7.8` → returns `1.2.3.4` (Vercel sets this; on self-hosted, the client may have injected it). For `normalizeEmail`: `Alice+spam@Gmail.COM` → returns `alice+spam@gmail.com` (the same per-email key as `alice+spam2@gmail.com` would *not* be, so a crawler using `+rand` bypasses the email gate on Gmail). The third column states the trade-off, not a fix. Pattern archetype — code block named for what it prevents.

**Engagement.** A `Buckets` sort: items like "Vercel deploy, request from real user", "Fly.io deploy without trusted proxy config", "Gmail user with `+work` alias", "Outlook user with `+work` alias". Buckets: "helper output is trustworthy", "helper output is trustworthy but call site needs a stricter rule". The point isn't right/wrong; the point is forcing the student to articulate the trust boundary per case.

**Components.**
- `Figure` wrapping a two-column hand-SVG decision table (the layout is the lesson — a generic `ArrowDiagram` doesn't carry the per-row trade-off cleanly).
- `Buckets` for the sort.
- Alternative: collapse the decision table into a `TabbedContent` (one tab per helper) — loses the side-by-side, gains breathing room.

## Concept 4 — Dual-keying through one limiter

**Why it's hard.** Three misconceptions stack. First, students reach for two `Ratelimit` instances when they hear "two gates" — one per-IP, one per-email — because instances feel like separate budgets. The chapter uses *one* limiter with two key prefixes, because the budget is the same and the counter is the same shape. Second, they expect one gate to be enough; per-IP alone misses cross-IP credential stuffing, per-email alone is the lockout vector. Third, they think the gates are OR'd; they're AND'd, and both must pass before the password hash runs.

**Ideal teaching artifact.** This is the chapter's load-bearing simulator and earns two beats. **Beat one** is a controllable attack-vs-defense playground. The student picks an attacker profile from a dropdown — "single attacker, one IP, password sprays" / "credential stuffer across a botnet, one target email" / "lockout griefer, one IP per attempt against one email". A "Run" button replays 20 requests. The student then toggles which gates are on: per-IP only, per-email only, both. The outcome panel reports two numbers: *requests that reached `auth.api.signInEmail`* (the attack surface) and *legitimate-user impact* (a fixed second-stream of one-request-per-minute from a different IP+email pair, count of those that get 429'd). The student discovers — not is told — that the per-email gate is the only one that defeats credential stuffing, and the per-IP gate is the only one that defeats single-source sprays without locking the user out of their own account from a new IP.

**Beat two** is the *code shape* the simulator's behavior implies: one limiter, two `safeLimit` calls, two `if (!result.success) return` blocks, both before `auth.api.signInEmail`. Shown as a `CodeVariants` flip between "one limiter, two keys" (correct) and "two limiters" (wrong — different prefixes mean different budgets, plus the lockout-only flavor returns the wrong key in logs). The simulator motivates the shape; the code variant is the shape itself.

**Engagement.** The simulator carries the assessment — the student must run all three attacker profiles against all three gate configurations and the inspector confirms "per-email gate caught the across-IPs vector" before the page advances. After the simulator, a one-question `MultipleChoice` locks the recall: "Per-email gate disabled, attacker uses a 1000-IP botnet against one email. The application limiter…" with the correct answer being "doesn't fire — every per-IP counter stays at 1".

**Components.**
- New: `DualKeyingSimulator` (see proposals). The chapter's anchor artifact and the highest-leverage new component.
- `CodeVariants` for the code-shape beat.
- `MultipleChoice` for the lock-in question.
- Alternative for the simulator: a `DiagramSequence` scrubbing through three pre-rendered attack scenarios, with no student-controlled toggles. Cheaper, but the active-prediction loop is the teaching — passive scrubbing leaves the misconception unchallenged.

**Project link.** This is the chapter's load-bearing proof. 15.4.5's "Cross-IP per-email proof" verify step is the runtime reenactment of beat one; the simulator primes the student to know what they're looking at when they spoof `x-forwarded-for` against the live inspector.

## Concept 5 — Gate-before-work

**Why it's hard.** The ordering inside the action is invisible at the syntax level — it's three function calls, the limiter could be before or after `auth.api.signInEmail` and the response would look identical on the happy path. The cost only appears under attack: gate-after-work pays the password-hash cost on every rejected request, which is exactly what an attacker exploits to amplify a spam burst into a CPU outage. Students who think of the limiter as "the thing that returns 429" miss that it's also "the thing that prevents the expensive work from running at all".

**Ideal teaching artifact.** A wrong-by-default code block. The action is shown with the order reversed — `auth.api.signInEmail` first, `safeLimit` second, the 429 returned from the catch. Above it, a timing graph: the x-axis is requests 1–20, the y-axis is `verify_ms` (the bcrypt cost, ~80–150ms). The graph stays flat-and-high across all 20 requests because every request pays the hash. A "Fix it" button reorders the calls; the timing graph re-renders, now flat-and-high for requests 1–10 and collapsing to ~5–15ms (Upstash round-trip only) for requests 11+. Pattern archetype — the broken version is the lesson, the fix is one line. The inspector's "Gate after work" toggle is the live runtime version of the same demo (15.4.5).

**Engagement.** A `Sequence` exercise: four steps — *parse input*, *resolve ip+email*, *gate*, *call `auth.api.signInEmail`* — to be ordered. Trivial after the artifact but locks the structural rule in one click.

**Components.**
- `AnnotatedCode` on the wrong version with steps walking through the failure mode; or `CodeVariants` with two tabs ("gate after work" / "gate before work") plus a small static timing strip per tab.
- `Sequence` for the recall beat.
- The live timing graph that re-renders on click is single-use here — demoted to alternative; the inspector's "Gate after work" toggle plus a static before/after timing strip inside `Figure` carries the same teaching.

**Project link.** 15.4.5's "Gate-before-work" verify step has the student flip the inspector's "Gate after work" toggle and watch `verify_ms` confirm the rule against real timings.

## Concept 6 — User-safe 429 body, operator-honest log

**Why it's hard.** Students who care about debugging make the response body verbose — `"Email rate-limited"` vs. `"IP rate-limited"` feels helpful. Both leak information: distinct bodies tell an attacker which gate tripped, and a per-email-distinct body confirms the email exists in the system. The senior rule is that the *response* stays opaque and identical across gates, and the *log* carries the diagnosis. The split is the trick — two surfaces, two audiences.

**Ideal teaching artifact.** A two-column "what each audience sees" panel. Left column: the user's network tab — every 429, regardless of gate, body reads `{"error":"Too many attempts. Please try again later."}`, headers identical except for the `Retry-After` value. Right column: the operator's `rate_limit_log` tail — same requests, distinct rows with `event`, `limiter`, `key` (`ip:1.2.3.4` vs. `email:alice@example.com`), `remaining`, `reset`. The student sees the same 11 requests rendered twice, once per audience, with the diagnosis visible only on the operator side. Concept archetype.

**Engagement.** A `Matching` drill: four facts on the left — "which gate tripped", "remaining budget", "reset timestamp", "the user's email address" — matched against two columns on the right, "exposed in the 429 response" and "exposed only in the structured log". Forces the student to make the split explicit.

**Components.**
- `Figure` wrapping a two-column hand-coded panel (left: a fake browser network-tab row, right: a fake log-tail row). The juxtaposition is the lesson; a generic `TabbedContent` flattens it.
- `Matching` for the recall beat.
- Alternative: `TabbedContent` with "User sees" / "Operator sees" tabs — loses simultaneous visibility, which is the whole point.

## Concept 7 — Headers contract and `Retry-After` precedence

**Why it's hard.** Three headers, one precedence rule, one delta-seconds gotcha. Students know `Retry-After` from HTTP courses; they don't always know about IETF `RateLimit-*`. They reach for the wrong unit (`Reset` as a Unix timestamp instead of delta-seconds, or vice versa per the draft revision). They miss that the three `RateLimit-*` headers ship on *every* response — successful 200s and 401s included — and `Retry-After` only adds on rejection. The contract is small but exact; getting any of it wrong breaks well-behaved clients silently.

**Ideal teaching artifact.** A reference table rendered as a four-row "header contract" — `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`. Per row: *value source* (which `limit()` result field), *unit*, *ships on success*, *ships on rejection*. Below the table, a worked example showing one successful 200 response and one rejected 429 response side by side with the four (resp. three+one) headers populated from a sample `result` object. Reference archetype — exhaustive on this one tiny surface because exhaustiveness is the point.

**Engagement.** `Tokens` on the sample headers block: the student clicks every header that ships on a 200 response (three correct picks; `Retry-After` is the decoy).

**Components.**
- `Figure` wrapping a static hand-coded table.
- A second `Figure` or inline `Code` block with the two example responses.
- `Tokens` for the recall beat.

**Project link.** Built in `rate-limit-headers.ts` in 15.4.4; verified in 15.4.5's "Header completeness" step.

## Concept 8 — `safeLimit` fail-open

**Why it's hard.** Fail-open vs. fail-closed is a real decision, not a default. The chapter chooses fail-open *on the auth path* because locking everyone out when Upstash hiccups is worse than briefly losing rate-limit enforcement. That choice isn't universal — a money-moving endpoint flips the other way. The teaching has to make the decision visible at the *one place it's encoded*, the `catch` block in `safeLimit`, so flipping it later is a one-line change at one site.

**Ideal teaching artifact.** A short pros/cons-as-decision diagram. Two paths labeled "Upstash up" (limiter result returned) and "Upstash down" (the `catch` fires). Under the down-path, two terminal states branch: *fail-open* (return `{ success: true, ... }`, log `rate_limit_unavailable`, request proceeds, attacker may exploit during the outage) and *fail-closed* (throw / return `success: false`, log, every request 429s during the outage, legitimate users locked out). One arrow is bolded — the chapter's choice for auth — and one is dashed with a "named, alternative" label. Decision archetype.

**Engagement.** A short scenario sort with `Buckets`: four endpoints — "sign-in", "password reset", "AI generation (paid)", "money transfer" — into two buckets, "fail-open is the default" and "fail-closed is the default". The point is that the per-endpoint decision lives in one place and the chapter only picks for the auth surface.

**Components.**
- `Figure` wrapping a small hand-SVG branching diagram (two states, two outcomes — `ArrowDiagram` works here, the layout is genuinely relational).
- `Buckets` for the scenario sort.

**Project link.** 15.4.5's "Fail-open under outage" step flips the inspector's "Force Upstash down" toggle; 15 fail-open events appear in the log tail.

## Concept 9 — `pending` analytics off-path via `after()`

**Why it's hard.** The `{ success, limit, remaining, reset, pending }` return shape hides one promise. Students assume the `limit()` call is self-contained — if they notice `pending` at all, the safe move feels like `await ipLimit.pending`, which adds 5–10ms to every response. The Next.js 16 `after()` from `next/server` is the off-path flush — it lets the response render and continues the analytics write after. Two misconceptions: that `await`ing is "correct" and `after()` is exotic, and that the analytics are part of the limit decision (they aren't — they're for the dashboard).

**Ideal teaching artifact.** A small response-timing strip, three rows. Row 1: `await ipLimit.pending` — user-visible time-to-response 95ms (Upstash round-trip + analytics write). Row 2: drop the await entirely — 85ms response time, but the analytics write is lost if the process gets recycled before the microtask flushes. Row 3: `after(ipLimit.pending)` — 85ms response time, analytics write completes after the response on the platform's continuation. The strip is annotated with one-line trade-offs per row. Mechanics archetype — the API surface is small, the lesson is what each option costs.

**Engagement.** A one-question `MultipleChoice`: "Why hand `pending` to `after()` instead of dropping it?" Correct: "the analytics write is best-effort but should still complete; `after()` is the platform's continuation seam". Decoys cover the two misconceptions (it affects the limit decision; it's faster than awaiting on the same path — the second is true but not why).

**Components.**
- `Figure` wrapping a three-row hand-coded timing strip.
- `MultipleChoice` for the recall.
- The inspector's "Await pending instead of after()" toggle (provided) is the live verification in 15.4.5.

## Component proposals

- **`LimiterCacheTimeline`** — scrubbable two-pane timeline showing 8 requests over 10 seconds, top pane the request strip, bottom pane the per-request Redis-hit indicator. Toggle for module-scope vs. handler-scope. Cumulative round-trip counter beneath.
  - Uses in this chapter: Concept 2.
  - Forward-links: 15.2 cache (instance caching of `cache()` calls), Unit 22 Upstash workloads (session-shaped tokens, pub/sub), 12.x webhook receivers (idempotency-key cache with the same shape).
  - Leanest v1: a static three-frame `DiagramSequence` (cold, warm, evicted) inside `Figure`, with hand-drawn round-trip counts. If v1 ships and the chapter reads well, the scrubbable version is the v2 — the v1 already carries the teaching, the v2 is polish.

- **`DualKeyingSimulator`** — interactive playground. Inputs: attacker profile (dropdown of three), gate configuration (three toggles: per-IP, per-email, both), "Run" button replaying 20 requests. Outputs: requests-that-reached-`auth.api.*` count, legitimate-user 429 count, a small request-by-request strip showing which gate (if any) tripped each one.
  - Uses in this chapter: Concept 4. The chapter's load-bearing simulator.
  - Forward-links: 17.2 security baseline audit (the limiter coverage checkpoint reuses the simulator's three-attacker frame), 19.3 integration tests (the simulator's scenarios become the test matrix).
  - Leanest v1: hard-coded three attacker profiles, three gate configurations, results pre-computed and lookup-keyed by `(profile, config)`; no real request loop, just a presentation of the matrix. The active-prediction loop survives because the student still picks both inputs and sees the result; the engineering survives because no real limiter runs in-browser.

## Build priority

`DualKeyingSimulator` first — it carries the chapter's load-bearing teaching (per-IP and per-email together defeating credential stuffing without lockout), it's the concept the verify lesson directly reenacts, and the leanest v1 (precomputed result matrix) is genuinely cheap. Forward-links into 17.2 and 19.3 mean it compounds within Unit 17 and Unit 19, not just 15.4.

`LimiterCacheTimeline` second, but ship the static-`DiagramSequence` v1 — module-scope-vs-handler-scope is a one-time concept in this chapter, and the forward-links (15.2, Unit 22, 12.x) are credible but each can be served by the same static three-frame composition rather than a full scrubbable widget. Build the interactive version only if a downstream chapter actually demands per-step controllability.

## Open pedagogical questions

- Concept 4's simulator overlaps with the inspector's live "Distinct IPs runner" toggle in 15.4.5. The simulator is the *priming* (decision-space exploration before code); the inspector is the *runtime confirmation* against real Upstash. Worth checking that the two don't feel redundant when the student walks them back-to-back.
- Concept 1's two-column diagram includes "Better Auth's `secondary-storage` adapter" as a named alternative; this is a Better Auth 1.5+ feature foregrounded in 15.3.3. If the alternative reads as more attractive than the chapter's choice (it's the one-line config flip), the diagram has to carry the trade-off — the action-boundary pattern reuses for non-auth endpoints, the adapter doesn't.
