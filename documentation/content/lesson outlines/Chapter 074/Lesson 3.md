# Lesson outline — Chapter 074, Lesson 3

## Lesson title

- **Title:** Dual-keying the auth endpoints
- **Sidebar label:** Dual-keying auth

## Lesson framing

This is the chapter's payoff lesson: lessons 1–2 sold the trigger and taught the `@upstash/ratelimit` primitives in isolation; this lesson assembles them into the production wiring on three Better Auth flows — sign-in, sign-up, password reset. It is a **systems-design lesson, not a syntax lesson** — the durable takeaways are *where* the limiter runs (the seam), *what key(s)* each endpoint counts under (the strategy), and *how rejection is shaped* (safe to the user, honest to the operator, resilient to a Redis outage). The student already owns the `Ratelimit` object and `limit()` shape from lesson 2; almost no new API is introduced — what's new is the **decision layer** wrapped around it.

The single load-bearing idea is the **dual-keying rule**: sign-in runs two independent gates — per-IP **and** per-email — both must pass. The whole lesson is built to make the student feel *why* one gate alone is broken: per-IP alone lets a botnet stuff one victim's password across 10,000 IPs; per-email alone is itself the attack (an attacker locks a victim out by tripping their email cap). Two gates close both holes at once. This is the "aha" — lead with the threat model, derive the two gates from it, only then show the code. The credential-stuffing-vs-lockout tension was *introduced* in lesson 1; here it becomes a concrete two-`safeLimit`-call pattern.

Three seam rules ride alongside, each framed as a production stake a senior gets right reflexively:
1. **Gate first, work second** — the limiter runs before the password hash and the DB lookup, because those are exactly the costs the limiter exists to cap. Gating *after* the hash means the attacker already won the resource fight.
2. **Opaque to the user, honest to the log** — the rejection the user sees is one fixed string regardless of which gate tripped (a per-gate message leaks whether an email exists / whether an IP is throttled); the structured log carries the truth for the operator.
3. **Fail open on the auth path** — a Redis outage must not lock every user out of their own account, so `safeLimit` catches, logs an alertable event, and lets the request through. This is a *judgment call with a default*, not a law — name the trade-off and the high-stakes endpoints that flip it.

**Critical seam correction (overrides the chapter-outline framing).** The chapter 074 outline and lesson-2 continuity describe rejection as an "HTTP 429 response" with `RateLimit-*` headers, language that fits a **route handler**. But in this stack the auth flows are **Server Actions** (Better Auth's `signInEmail` / `signUpEmail` / `forgetPassword` wrapped in `(state, formData)` actions returning `Result`, established back in chapter 053). The canonical project (chapter 075, reference signatures) confirms the real shape: the action returns `Result.err({ code: 'rate_limited', ... })`, attaches `RateLimit-*` headers via **Next.js 16's server-action response-`headers()` API**, and flushes `pending` analytics via **`after()` from `next/server`** — *not* `ctx.waitUntil()`. This lesson must teach the Server-Action seam as primary, and name the route-handler twin (a real 429 `Response` via a `rateLimitedResponse(result)` helper) as the variant for non-browser surfaces. Treating the user-visible rejection as "the 429 body" is fine as the *mental model* of the contract, but the literal artifact is a `Result` for actions. This keeps the lesson coherent with chapters 043/047/053 and with the `Result` error-handling convention (`rate_limited` is already a `Result` code).

**Pedagogical spine.** Heaviest lesson in the chapter (55–70 min). Manage cognitive load by teaching one decision at a time against a single running example (the sign-in action), building it up in stages: (1) the threat model and the two-gate idea, visualized; (2) the three limiters declared; (3) the gate-first seam; (4) the dual-key calls; (5) the safe/honest rejection contract; (6) `safeLimit` fail-open; (7) the parse helpers; (8) `after()` for analytics; (9) the Better Auth built-in swap; then fan the pattern out to sign-up/reset and other surfaces. Code is the vehicle but every block is introduced by its *decision*. Reuse, don't redraw, the chapter's request-path spine diagram from lesson 1.

**End state.** The student can wire an application limiter onto any abusable Server Action: pick the key strategy from the threat model, place the gate before the work, return a safe `Result` with honest logs, and fail open under outage. They leave with the exact pattern chapter 075 implements end-to-end, so the project is recognition + practice, not first contact.

---

## Lesson sections

### Introduction (no header)

Open with the concrete scenario, not abstractions. The app just went public with email+password (the lesson-1 trigger has fired); Upstash is provisioned and the `Ratelimit` object works (lesson 2). Now the actual job: three auth flows are abusable in three different ways, and a single per-IP budget — the obvious first instinct — gets one of them dangerously wrong. Pose the senior question from the outline tightly: sign-in needs per-IP **and** per-email so an attacker rotating IPs against one victim hits the email cap while the office NAT keeps signing in; where do the calls go, what budgets fit, and how is rejection shaped so it carries the headers without leaking the truth. Preview the end state: by the lesson's close the student can wire any abusable action with the same shape — and chapter 075 is where they build it for real. Warm, ~4 sentences, name the three flows.

### Why one rate-limit key is a trap

**Goal:** make the dual-keying rule *inevitable* by walking the two single-key failures before showing the fix. This is the lesson's conceptual core and must land before any code.

Teach the threat model as a short narrative in three beats:
- **Per-IP only.** A tight per-IP budget stops a single noisy host. But credential stuffing (re-define inline via `Term`) replays leaked email+password pairs from a botnet — thousands of IPs, each making a handful of attempts, none tripping a per-IP cap. The victim's one email is hammered indefinitely. The WAF (lesson 1) can't see the email; only the application can.
- **Per-email only.** So count per-email instead. Now the attacker doesn't even need a botnet — they hammer a *victim's* email with garbage passwords until the email cap trips, and the legitimate user is locked out of their own account. The limiter became the attack. This is the **lockout vector**.
- **Both gates.** Run *both*, independently, both must pass. Per-IP catches the crude single-source flood; per-email catches the distributed stuff; neither alone is the lockout vector because the per-email cap is sized to tolerate a real human's typo-retries (looser than you'd fear) while still being far below a stuffing campaign's volume. This is the rule the rest of the lesson implements.

End the section with the subtle budget watch-out as prose (it belongs to *this* concept): setting per-email *tighter* than per-IP re-opens the lockout vector — an attacker abuses the shared office NAT IP to burn a victim's tighter email budget. Keep per-email comparable-to-or-looser than per-IP; let its job be catching the stuffing *pattern*, not policing the office.

**Diagram (primary visual of the lesson).** A `DiagramSequence` with 3 steps making the two failures and the fix viscerally clear. Reuse the visual language of the chapter's request-path spine (Client → app limiter → Better Auth verify) but specialize it to the attacker model. Each step is a small HTML/CSS scene (a cloud of attacker IPs on the left, one victim email node, the limiter as a gate, the account as the target):
- Step 1 "Per-IP gate alone — stuffing slips through": many IP dots each fire 1–2 arrows at the victim's email through an IP gate that stays green (each IP under budget); arrows reach the account. Caption: distributed low-per-IP volume defeats a per-IP cap.
- Step 2 "Per-email gate alone — the limiter becomes the lockout": a single attacker IP floods the victim's email; the email gate trips red and the *legitimate user* (a separate node) is now bounced too. Caption: one gate keyed on the victim's identifier is a denial-of-service on the victim.
- Step 3 "Both gates — stuffing capped, owner safe": both gates present; the stuffing cloud trips the email gate (campaign volume) while a normal user from a normal IP passes both. Caption: two independent gates, both must pass; each closes the other's hole.
Pedagogical goal: the student should *see* that the two gates are non-redundant — they catch orthogonal attacks. Author with `<DiagramSequence>` (own card, no `<Figure>` wrapper). Keep each scene short to respect the tallest-step height rule.

`Term` candidates here: **credential stuffing**, **NAT** (office/CGNAT sharing one public IP), **lockout vector**.

### The three limiters, declared once

**Goal:** ground the three concrete `Ratelimit` instances and justify each budget as a senior call tied to the endpoint's abuse cost — not arbitrary numbers.

Restate the module-scope rule briefly (owned by lesson 2 — one sentence + link, do not re-teach the `ephemeralCache` mechanics): all limiters live at module scope in `lib/rate-limit.ts`, the one place `new Ratelimit(...)` may appear. Then show the file as the source of truth.

Present the three instances and reason about the budgets together so the student sees the *relative* tuning:
- `signInLimiter` — `slidingWindow(10, '1 m')`, prefix `rl:signin`. Looser, because legitimate users fat-finger passwords; 10/min tolerates retries.
- `signUpLimiter` — `slidingWindow(5, '10 m')`, prefix `rl:signup`. Tighter and longer-windowed; signing up is a rare event, a burst is almost always a bot.
- `resetLimiter` — `slidingWindow(3, '15 m')`, prefix `rl:reset`. Tightest, because the abuse cost is the most concrete: every reset sends real mail (Resend deliverability + a third party's inbox).
Note the budgets are *starting points* a real project tunes from monitoring (foreshadow the dashboards section), not constants to memorize. Note each gets `analytics: true` and its own `ephemeralCache: new Map()` and a distinct prefix (lesson 2's rule — keys can't collide).

**Component:** a single `Code` block (TS) for `lib/rate-limit.ts` — it's a flat declaration list, no need for `AnnotatedCode`; let the prose above carry the budget reasoning. Keep `import 'server-only'` at the top per conventions and the `redis` import from `lib/redis.ts`.

### Gate first, work second

**Goal:** establish the seam placement as an architectural rule before the dual-key details, so the student internalizes ordering independent of key count.

Teach the principle: the limiter call runs **before** any expensive or sensitive work — before the DB lookup, before the password hash, before `auth.api.signInEmail`. The reasoning is the whole point of a limiter: the password hash (Argon2id, deliberately slow — re-link chapter 053) is precisely the resource an attacker tries to exhaust; gating *after* it means every over-budget request still pays the cost the limiter was supposed to cap. Frame as the five-seam Server Action shape the student knows (`parse → authorize → mutate → revalidate → return`, link the convention) with rate-limiting slotting in as the **first half of authorize**, right after `parse`: you can't gate before you've parsed the email out of the form, but you gate before everything else.

**Diagram:** a small horizontal phase strip (HTML+CSS, wrapped in `<Figure>`) showing the action's pipeline with the gate's correct position highlighted vs. the wrong position. Two rows or a before/after: `parse → [GATE] → hash+verify → session` (correct, gate green and early) vs `parse → hash+verify → [GATE] → session` (wrong, gate red and late, the hash box marked "cost already paid"). Pedagogical goal: position is load-bearing, and "it still rejects eventually" is not good enough. Keep it compact, horizontal.

This section sets up the canonical action skeleton the next sections fill in; show only the *ordering* skeleton here (parse, resolve ip+email, GATE placeholder, then `auth.api.signInEmail`) as a small `Code` block, leaving the gate body as a comment to be expanded next.

### Two gates on sign-in

**Goal:** the concrete dual-key implementation — two `safeLimit` calls under one limiter with `ip:` / `email:` prefixes, cheaper check first, both awaited, early-return on either failure.

Build directly on the skeleton. Teach the mechanics:
- Resolve the two identifiers: `const ip = getClientIp(headers)` and `const email = normalizeEmail(parsed.email)` (helpers defined in the next section — forward-reference them so this section stays about the gating logic).
- Two calls on the **same** `signInLimiter` with distinct key namespaces: `safeLimit(signInLimiter, 'ip:' + ip)` then `safeLimit(signInLimiter, 'email:' + email)`. Explain that the limiter's own `prefix` (`rl:signin`) namespaces it against *other* limiters; the `ip:` / `email:` prefix on the *key* namespaces the two gates against *each other* within this one limiter — two budgets, one config. (This is the lesson-2 teaser cashed in.)
- **Order:** IP first — it needs no normalization and is the cheaper/coarser check; bail early on a crude flood before touching the per-email path.
- **Both must pass:** `if (!ipLimit.success) return <reject>;` then `if (!emailLimit.success) return <reject>;`. Stress the most common bug — checking only one of the two `success` values leaves the unchecked vector wide open.

Note `safeLimit` is used (not bare `limit`) — its fail-open behavior is taught two sections down; here just establish that every gate call goes through it.

**Component:** `AnnotatedCode` (TS) over the sign-in action body — this is the file the student's focus must be directed across multiple parts, so step through: (1) the `(state, formData)` signature + Zod `strictObject` parse, (2) resolve `ip` and `email`, (3) the per-IP gate + early return, (4) the per-email gate + early return, (5) the `auth.api.signInEmail` call reached only when both gates pass, (6) the success return with headers attached. Use `color` per step (blue default; green for the pass-through to real work; orange/red for the reject branches). Keep each step ≤6 lines of prose. This single annotated block is the lesson's reference artifact; later sections zoom into individual lines (helpers, headers, `after`) rather than re-showing the whole file.

`Term` candidates: **sliding window** (one-line refresher, link lesson 2).

### Rejection that is safe to the user and honest to the operator

**Goal:** the two-audience contract — one opaque user message, a structured honest log — and the `RateLimit-*` header attachment, taught in the Server-Action `Result` shape (with the route-handler 429 twin named).

This is where the seam-correction lands explicitly. Teach in two halves:

**The user side — `Result`, not a raw 429.** The sign-in action returns `Result.err({ code: 'rate_limited', userMessage: 'Too many attempts. Please try again later.' })`. The `userMessage` is **identical regardless of which gate tripped**. Spell out the leak each per-gate message would cause: "this email is locked" *confirms the email exists* (an enumeration leak — tie back to Better Auth's enumeration discipline, link the convention), and "your IP is rate-limited" tells an attacker their evasion is working. One string, every path. The UI renders `userMessage` via the existing `useActionState` form contract (link chapter 053) — no new UI work.

**The operator side — the honest log.** Before returning, write a structured event the operator can actually act on: `logRateLimit({ event: 'rate_limit_rejected', limiter: signInLimiter.prefix, key, remaining, reset })`. The user sees the opaque string; the log carries *which gate, which key, what budget state*. Frame via the "two channels" / "user-facing vs operator-facing diverge at the wrapper" convention and the 3am rule (link Logging conventions). Note the log shape is the foreshadowed chapter 092 structured-logger contract; here it's a provided `logRateLimit` helper, not pino-in-detail.

**The headers — attached, not hand-counted.** Every response carries `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (delta-seconds), and on rejection also `Retry-After`; `Retry-After` takes precedence when both are present (IETF draft — lesson 2's rule, restate in one line). The senior reflex: headers are a pure function of the `limit()` result — a `rateLimitHeaders(result)` helper derives them, never compute by hand. The **delta-seconds conversion** is the bug to flag: `reset` is a Unix ms timestamp; the header wants `Math.ceil((reset - Date.now()) / 1000)` (lesson 2 named it; restate because it bites here). On **success**, attach headers from the per-IP result (the more informative budget for a well-behaved client backing off). On **rejection**, attach from whichever gate rejected.

**The Server-Action mechanism.** Attaching response headers from a Server Action uses Next.js 16's server-action response-`headers()` API (the canonical project's stated mechanism). Show the call shape briefly; do not over-explain the platform API — the load-bearing idea is *headers come from the limiter result and ride every response*. 

**The route-handler twin (named, shown compactly).** Because some abusable surfaces *are* route handlers (webhooks, public APIs, file uploads), name the variant: a `rateLimitedResponse(result): Response` helper returns a real `429` with the same headers and the same opaque JSON body `{"error":"Too many attempts. Please try again later."}` — RFC-9457-adjacent, and 429 is the enforced status for rate-limited in the route-handler status table (link Route handlers convention). This is the literal "429 body" the chapter outline references; clarify it's the route-handler form, while the action form is the `Result`.

**Component:** `CodeVariants` to make the two-surface contract concrete and prevent the student conflating them — tab "Server Action (sign-in)" showing the `Result.err({ code: 'rate_limited' })` + `headers()` attachment, tab "Route handler (public API)" showing `rateLimitedResponse(result)` returning the 429 `Response`. First sentence of each tab states the surface. This A/B is the clearest way to land "same contract, two shapes." Keep the helper bodies (`rateLimitHeaders`, `rateLimitedResponse`) as a small adjacent `Code` block if needed, or fold into the variant.

`Term` candidates: **enumeration** (revealing whether an account exists via differential responses), **delta-seconds** (link lesson 2), **`Retry-After`**.

### Failing open when Redis is down

**Goal:** the `safeLimit` wrapper and the fail-open-on-auth policy as a named, one-place judgment call.

Teach the failure mode first: `limiter.limit(key)` does a network round-trip to Upstash; Upstash can be down, slow, or rate-limit *you*. The call can throw or time out. The senior question: when the limiter can't reach its store, do you **fail open** (allow the request, log loudly) or **fail closed** (reject as if over budget)? Reason it through for the auth path: fail-closed under an Upstash outage locks *every* user out of *their own account* — the limiter's outage becomes a full auth outage, far worse than the brief abuse window fail-open allows. So this course defaults to **fail-open on the auth path**.

Show `safeLimit(limiter, key)` (`lib/safe-limit.ts`): a `try` returning `await limiter.limit(key)`, a `catch` that calls `logRateLimit({ event: 'rate_limit_unavailable', limiter: limiter.prefix, key })` at error level and returns a synthetic success result (`{ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve() }`) so the action proceeds. Stress the design value: the policy lives in **one place** — flipping to fail-closed is a one-line change here, not a sweep across every call site. Tie to the convention's "every gate treats an exception inside the check as a refusal" and note rate-limiting is the *deliberate exception* to that default precisely because locking users out is the worse failure — call this divergence out so it reads as intentional, not a contradiction.

Name the nuance from the outline: high-value endpoints (admin-only privileged mutations, a billing webhook the customer can't retry) may flip to fail-closed — a per-endpoint call, made in this one helper. And name the operator reflex: a sustained `rate_limit_unavailable` rate is a *Upstash incident alert*, not quiet drift (chapter 092 wires the alert).

**Component:** `Code` (TS) for the `safeLimit` body — short enough that a plain block with a couple of highlighted lines (the `catch` log + the synthetic-success return) reads cleanly. Optionally a one-line `Aside` (caution) reinforcing that this is the one knob that flips the whole policy.

`Term` candidates: **fail-open** / **fail-closed** (link lesson 1 where introduced; restate the trade in one line).

### The two keys, normalized once

**Goal:** the `getClientIp` and `normalizeEmail` parse helpers and the two trust/normalization decisions they encode.

These were forward-referenced in "Two gates"; teach them now as the boundary helpers in `lib/keys.ts`.

**`getClientIp(headers): string`.** On Vercel, read `x-forwarded-for`, split on `,`, trim, take the **first** entry (the original client; later entries are proxies), fall back to `x-real-ip`, fall back to `'unknown'`. The senior point is the **trust boundary**: you trust `x-forwarded-for` *only because Vercel sets and controls it*; on a self-hosted box behind a misconfigured proxy a client can spoof the header and dodge per-IP limits — there, trust must be gated at the load balancer. Note the `'unknown'` fallback is deliberately loose (one bucket for unidentifiable clients); strict rejection of missing-IP is deferred to chapter 081.

**`normalizeEmail(email): string`.** `email.trim().toLowerCase()`. The course default is trim + lowercase only — **no `+`-alias stripping**. Name the trade so the student knows it's a deliberate choice: stripping `+` closes a Gmail `user+rand@` bypass (an attacker varying the alias to dodge the per-email gate) but *breaks* on providers that treat `+` addresses as distinct mailboxes (collapsing real, different users into one key). The non-negotiable invariant: **the normalization used for the limiter key must match the normalization used for the DB lookup**, or the limiter and the auth lookup count two different identifiers and the gate is meaningless.

**Component:** `CodeVariants` or two adjacent `Code` blocks for the two helpers; prefer a single `Code` block per helper with the decision carried in prose — these are short pure functions and the *reasoning* (trust boundary, match-the-lookup) is the payload, not the syntax. A `Tokens` exercise could let the student click the "first entry" / `.toLowerCase()` parts, but it's optional; the helpers are simple. Prefer prose + a watch-out.

`Term` candidates: **`x-forwarded-for`** (proxy-appended client-IP chain).

### Keeping analytics off the response path

**Goal:** `after(result.pending)` as the non-blocking analytics flush, in the correct Next.js 16 shape (not `ctx.waitUntil`).

Short, focused section. Restate from lesson 2 in one line: `analytics: true` makes each `limit()` return a `pending` promise that writes the rolling counter to Upstash. The decision: that write must **not** block the user's response. The Next.js 16 mechanism is `after()` from `next/server` — `after(ipLimit.pending)` and `after(emailLimit.pending)` schedule the flush after the response is sent. Correct the chapter-outline/lesson-2 `ctx.waitUntil()` language explicitly: `waitUntil` is the raw serverless/edge primitive (what the Upstash docs show); in this stack `after()` is the canonical seam and is *built on* `waitUntil` under the hood — use `after()`. The watch-out: `await`ing `pending` on the request path adds the analytics write (~5–10ms) to every user-visible response — the exact regression `after()` exists to prevent. `pending` is fire-and-forget by design; best-effort.

**Component:** a small `Code` (TS) snippet showing the two `after(...)` calls in the action; or fold as a highlighted line into the reference annotated block via a callback. Keep it tight.

`Term` candidates: **`after()`** (Next.js post-response scheduling), brief.

### Replacing Better Auth's built-in limiter

**Goal:** the deliberate architectural swap — turn Better Auth's in-memory limiter off and make the application limiters the single enforcement point.

Teach the *why*, since the student must understand this is a decision, not a default. Better Auth ships an in-memory rate limiter that stores counters in process memory; it is **enabled in production by default** (and off in development), guarding all its endpoints with one coarse, global budget. Be precise about this dev-vs-prod default — do not say "always on." Three reasons the 2026 senior turns it off explicitly and runs the `lib/rate-limit.ts` limiters instead:
1. **In-memory doesn't survive serverless** — each invocation has its own memory (the lesson-1/2 thread); the built-in limiter's counts evaporate and don't coordinate across the fleet.
2. **Not the per-key shape the auth surface needs** — no per-endpoint budgets, no per-IP-and-per-email dual gate.
3. **Outside the action seam** — leaving it on means *two* limiters with different budgets and keys competing on one surface: debugging hell. One enforcement point, one place to lint.

The change is one line in `lib/auth.ts`: `rateLimit: { enabled: false }`, with a comment naming the rule. Name the **alternative not chosen**: Better Auth's `secondaryStorage` adapter (its official Redis storage package, which talks Redis over ioredis/TCP rather than the HTTP `@upstash/redis` client this course standardizes on) lets the *framework* manage the limiter against shared storage — a legitimate path for teams that want the framework to own the rules and accept a second Redis client, but this course wires limits at the action seam for the single-lint-point reason and one HTTP client everywhere. Recognition, not implementation; do not show a full `secondaryStorage` setup.

**Component:** `CodeVariants` — "Default (built-in on)" vs "Course (built-in off, app limiter)" — or a single `Code` block with the one-line flag and the comment, plus prose for the `secondaryStorage` alternative. The flag is tiny; the *reasoning* is the content. A short `Aside` (note) can hold the `secondaryStorage` named-alternative.

### Sign-up and reset: the same shape, different keys

**Goal:** generalize the pattern by contrasting the three endpoints' key strategies side by side, proving "a new endpoint is one limiter + one wrap."

Now that sign-in is fully built, derive the other two from the same skeleton and the *threat model*, reinforcing that the **key strategy follows from who the abusable identity is**:
- **Sign-up — per-IP only.** The email on a sign-up is the *attacker's own choice*; keying on it lets one host cycle fresh addresses to defeat the gate. The abusable identity is the originating IP. One `safeLimit(signUpLimiter, 'ip:' + ip)` gate, everything else identical.
- **Reset — per-IP and per-email.** Dual-keyed like sign-in, but the per-email gate exists for a *different reason*: not lockout-prevention but **third-party cost** — every accepted reset sends real mail, so an attacker hammering a victim's address floods that inbox and burns Resend deliverability/budget. The per-email gate (`email:<normalized>`) protects the targeted address and must survive an IP switch; the tightest budget (3/15m) because the abuse cost is highest. (Suppression/deliverability story is chapter 048's — name, don't re-teach.)

Make the contrast explicit and memorable. The shared rules carry over verbatim: gate before work, opaque rejection, `RateLimit-*` headers, `safeLimit` fail-open, `after(pending)`.

**Component / exercise:** a `Buckets` exercise is the strongest fit here — drag scenarios into "per-IP only" vs "per-IP + per-email" buckets, forcing the student to reason from the threat model rather than memorize: items like "sign-in", "sign-up", "password reset", and recognition-stretch items "public read API (per-key budget)", "a webhook receiver", framed by *whether a victim identifier is involved*. Pair with a compact comparison `Code` block or a three-column table of the three actions × {key strategy, budget, why}. The `Buckets` checks the transferable understanding the lesson is really after.

`Term` candidates: **deliverability** (sender-reputation impact of bouncing/abused mail — one line, link chapter 048).

### Worked walkthrough: one sign-in, end to end

**Goal:** consolidate every decision into the single request lifecycle so the student holds the whole pattern at once — the reference the chapter 075 project implements.

Trace one sign-in request through the assembled action, naming each seam as it fires: parse the form (Zod `strictObject`) → resolve `ip` and `normalizedEmail` → `safeLimit(signInLimiter, 'ip:'+ip)` → reject-with-headers-and-log if `!success` → `safeLimit(signInLimiter, 'email:'+email)` → reject if `!success` → `auth.api.signInEmail` (reached only past both gates) → attach `rateLimitHeaders(ipLimit)` to the success response → `after(ipLimit.pending)` + `after(emailLimit.pending)` → `redirect` to the post-sign-in destination (with `safeNext` open-redirect closure — name, link convention). Then the failure branch: an over-budget request short-circuits at the first failing gate, the user gets the one opaque `userMessage`, the log gets the honest event, the headers tell a good client when to retry.

**Component:** the cleanest fit is the full reference `Code` block (the complete `signInAction`) shown once here as the consolidated artifact, OR a `DiagramSequence` scrubbing the request through the seams (parse → gate1 → gate2 → verify → respond), each step captioned with what's checked and what's attached. Given the lesson already used `AnnotatedCode` for the action body and a `DiagramSequence` for the threat model, prefer here the **full assembled `Code` block** as the "here it all is" reference (avoids a third heavy interactive). Close by stating this is exactly the shape chapter 075 builds and verifies (the verify recipe — run 11 requests, watch the headers, watch the dashboard — is the project's job, named not done here).

### Watching the limiter in production (brief)

**Goal:** orient the student to the operator surfaces so the budgets and logs connect to real incident response; keep short, defer wiring to chapter 092.

Name what an operator watches: the Upstash dashboard's analytics tab (per-prefix reject rate over time, top keys), and the structured `rate_limit_rejected` / `rate_limit_unavailable` log stream. The senior reads: a sustained reject-rate spike on `rl:signin` is an attack or a buggy client; one email dominating `rl:reset` top-keys means a *victim is being targeted* — escalate; a sustained `rate_limit_unavailable` rate is a Upstash incident. Two-to-three sentences; this is situational awareness, not a tools tour. Defer alerting wiring to chapter 092 (link/foreshadow).

### The pattern travels: other abusable surfaces

**Goal:** close by naming the reach points so the student sees this lesson as the template for the rest of the course, not a one-off for auth.

One short paragraph: the same shape — module-scope limiter, key strategy from the threat model, dual-key when a victim identifier is involved, headers on every response, fail-open via `safeLimit` — copies onto public APIs, webhook receivers (chapter 063 owns idempotency; rate-limiting the receiver guards against burst-amplification), file uploads (Unit 13), and AI generation endpoints (Unit 22, often per-user or per-org keyed). Adding a fourth limiter is one new `Ratelimit` instance plus one action/route wrap. Name captcha as the *next* layer past the limiter — the reach when the limiter is consistently maxed by *humans*, not bots — deferred. End on the durable mental model: rate-limiting is a named seam at the write boundary, the key encodes the threat model, and rejection is safe-to-user / honest-to-operator / resilient-to-outage.

### External resources (optional)

`ExternalResource` cards: Upstash Ratelimit docs (algorithms + `limit()` features), the IETF `RateLimit-*` headers draft, Better Auth rate-limit / `secondaryStorage` docs, Next.js `after` reference. Include only those that directly support the lesson; keep to 2–4.

---

## Scope

**Prerequisites to restate briefly, not re-teach (link out):**
- `Ratelimit` constructor, `slidingWindow`, `limit()` return shape (`success/limit/remaining/reset/pending`), `ephemeralCache`, module-scope rule, the `RateLimit-*` header set + `Retry-After` precedence + delta-seconds — all **lesson 2**; restate in a line each at point of use, never re-derive.
- The two-layer model (WAF + app limiter), credential-stuffing/lockout *motivation*, the public-URL trigger, fail-open *policy name*, the four package names (Redis/Upstash/`@upstash/redis`/`@upstash/ratelimit`) — **lesson 1**; one-line refreshers only.
- Better Auth sign-in/sign-up/reset Server Actions, the `Result` discriminant surface, `useActionState` `(state, formData)` shape, enumeration discipline, Argon2id hashing — **chapter 053 / Better Auth convention**; the lesson *wraps* these, it does not teach the auth flows.
- `Result<T>` / `ok`/`err`, Zod 4 `strictObject` at the action boundary, the five-seam action shape, `safeNext` open-redirect closure, structured logging + 3am rule — **conventions / earlier units**; name and link.
- `Redis.fromEnv()` + the two env vars in `env.ts` — **lesson 2 / chapter 037**; assume present.

**This lesson does NOT cover (belongs elsewhere):**
- The chapter 075 verify recipe — running 11 requests, reading headers live, watching the inspector/dashboard. The teaching lesson establishes the *pattern*; the project *exercises* it. Show reference code, not a runnable build.
- The full Better Auth action internals / auth-flow construction — chapter 053 owns these; this lesson touches only the seam where the limiter wraps `auth.api.*`.
- The pino logger internals, structured-log key set, redaction config, and the alerting rule — chapter 092. Here `logRateLimit` is a provided helper with a named event shape; do not implement the logger.
- Vercel WAF rule authoring / Vercel Firewall SDK — named once in lesson 1, out of scope.
- Algorithm selection (token bucket / fixed window) and the `Ratelimit.deny()` blocklist / `MultiRegionRatelimit` — lesson 2; not revisited beyond a one-line "sliding window, see lesson 2."
- Email suppression / deliverability mechanics — chapter 048; named as the *reason* reset is tightest, not taught.
- Per-org / per-user budgets on non-auth endpoints — named for recognition in the fan-out section only; the chapter's seam is auth.
- Captcha as the next layer — named once, deferred.
- The Upstash dashboard tour / incident-review workflow as a procedure — orientation only.

**Deliberate divergences from convention (flag for downstream agents):**
- The chapter-074 outline's "429 response body + headers" framing is **reframed** to the Server-Action `Result` shape as primary, with the literal 429 `Response` (`rateLimitedResponse`) named as the route-handler twin. This is the correct stack shape (chapters 053/075) and aligns with the `Result` `rate_limited` code. Do not author the sign-in rejection as a raw `Response` — it's a `Result`.
- `after()` from `next/server` is the canonical `pending` flush, **replacing** the outline's `ctx.waitUntil()` language (`waitUntil` is named only as the underlying primitive). Verified against Next.js 16 docs.
- Rate-limiting is the sanctioned **exception** to the convention's "a thrown error inside a gate means refusal (fail-closed)" rule — `safeLimit` fails *open* on the auth path. Call this out as intentional so it doesn't read as a contradiction of the error-handling convention.
