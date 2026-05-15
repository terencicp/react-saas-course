## Concept 1 — Two layers, two abuse shapes

**Why it's hard.** Students who have only seen one rate limiter (or none) collapse the WAF and the application limiter into "the rate limiter," then either skip Upstash because "the WAF covers it" or skip the WAF because "Upstash is fancier." The misconception is that the two layers compete; the truth is that each sees a request shape the other is blind to, and the public-URL-plus-auth surface needs both.

**Ideal teaching artifact.** A side-by-side attacker simulator (Concept archetype). The student picks an attack profile from a small set — *one IP, many passwords against one email*, *botnet (many IPs), many passwords against one email*, *one IP crawling all paths* — and watches two stacked lanes ("Edge — Vercel WAF" and "Application — Upstash per-email") light up or stay dark as the requests flow through. The lanes show which one rejects and which one shrugs. The credential-stuffing-via-botnet profile is the one that makes the application lane the only thing standing between the attacker and the victim's account. Reading the diagram once is not enough; the student has to flip between the three profiles and *see* the WAF go dark on the botnet case.

**Engagement.** A `Buckets` round after the simulator: ten attack descriptions ("a scraper hitting `/api/posts` from one IP", "a botnet trying `password123` against `alice@…`", "a single IP retrying the right password after a typo") sorted into "WAF catches", "App limiter catches", "Both catch", "Neither catches yet". The neither-catches bucket holds the cases the chapter has not addressed (captcha territory, named once).

**Components.**
- New: `LayeredRequestSimulator` — props: attack profiles array, two lane definitions (each with per-request rules), animated request packets traversing left to right. Lanes glow on reject, packets continue on pass.
- Existing: `Buckets` for the sort that locks recall in after the simulator.
- Alternative if the bespoke widget is out of budget: a `DiagramSequence` with three frames (one per profile), each frame a hand-SVG inside `Figure` showing the two lanes statically — loses the "flip and see" feel but preserves the comparison.

**Project link.** Chapter 15.4 keeps the WAF rules from before and adds the Upstash limiters; this concept is the reason the project does both rather than choosing one.

---

## Concept 2 — The threshold that makes app-level non-negotiable

**Why it's hard.** "Add rate limiting when you grow" is the folk rule, and it is wrong by a year. The actual trigger is the public URL plus an authentication form — past that point, the lockout-by-email vector is open and the WAF cannot see it. Students need to internalize the trigger as a date on the deploy calendar, not a vague scale milestone.

**Ideal teaching artifact.** A timeline-shaped Decision diagram with three vertical markers — *preview URL, no auth*, *preview URL, auth*, *public URL, auth* — and a horizontal bar across each marker showing which controls are sufficient (WAF light, WAF tight, WAF + per-email app limiter). The student reads it left to right and sees the layering build, not as gradual sophistication but as a specific control snapping on when a specific surface goes live. The decision is named on the diagram: *the public URL with email+password is the trigger.*

**Engagement.** A short `MultipleChoice` (single correct): "Your app is at a custom domain, sign-in lives at `/sign-in`. Which of these is sufficient?" — choices include "Vercel WAF rate-limit on `/sign-in`", "Better Auth's built-in in-memory limiter", "Upstash per-email + per-IP at the action", "All three". The right answer foreshadows the dual-keying rule in Concept 5.

**Components.**
- Hand-SVG timeline inside `Figure` — three markers, three control bars, the trigger annotated. The diagram is single-use in this chapter and has no obvious forward-link, so static SVG inside `Figure` is the correct scope.
- Existing: `MultipleChoice` for the recall beat.

**Project link.** Chapter 15.4 opens at the third marker (public URL, auth) — the project brief assumes the threshold has already fired and the limiter is overdue, not optional.

---

## Concept 3 — Why Upstash, specifically

**Why it's hard.** "Use Redis" is a checkbox that turns into an hours-long detour without context — connection pools, TCP, multi-region, self-hosted vs. managed. The student needs the senior-shaped reason Upstash wins on the 2026 Vercel stack: connectionless HTTP/REST works in edge runtimes where TCP does not, scale-to-zero pricing matches a serverless cost shape, and the limiter library is published by the same vendor. Without this, the student picks whichever Redis they Googled and discovers in production that `ioredis` does not work in an edge function.

**Ideal teaching artifact.** A Decision matrix as a `TabbedContent` with three tabs — *Node serverless route handler*, *Edge route handler*, *Trigger.dev worker*. Each tab shows the same `limit('user:42')` call against four candidates: Upstash Redis (HTTP), self-hosted Redis with `ioredis` (TCP), Vercel KV, Cloudflare KV. The cells show pass / fail / works-but / overkill, with a one-line reason on each. The student reads the *Edge route handler* tab and sees three rows go red — the connectionless requirement is the load-bearing constraint, not a preference.

**Engagement.** A `TrueFalse` round of five statements that pulls the matrix into recall: "Upstash needs a TCP connection pool" (false), "`ioredis` works inside an edge route handler" (false), "Upstash's free tier covers a small SaaS for free" (true), "Upstash replaces Postgres for the user table" (false), "The Vercel Marketplace integration writes the two env vars in all three environments" (true).

**Components.**
- Existing: `TabbedContent` for the three-runtime decision matrix, with each tab a small static table (hand HTML inside the slot).
- Existing: `TrueFalse` for the recall beat.

**Project link.** Chapter 15.4.3 has the student wire `Redis.fromEnv()` and the Marketplace integration's env vars — this concept is the reason that one line is the only setup step, with no pool, no client lifecycle.

---

## Concept 4 — Module-scope limiter, sliding window default

**Why it's hard.** Two independent traps live in the limiter declaration: declaring it inside the handler kills the in-memory cache (one Redis hit per call, every call), and picking the algorithm at random misses that sliding window is the chapter's default for a reason — token bucket and fixed window have specific triggers. Both errors compile, both work in dev, and both bite under traffic.

**Ideal teaching artifact.** This concept needs two beats. The first is a Pattern code panel showing two variants side-by-side via `CodeVariants` — *wrong: declared inside the handler*, *right: declared at module scope* — with the surrounding prose naming what survives across invocations. The second is a small algorithm-shape visualizer (Concept archetype): three stacked time-axis strips labeled *sliding window*, *token bucket*, *fixed window*. The student clicks a "send request" button repeatedly; each strip shows in real time how the request budget responds — sliding window's smooth weighted count, fixed window's hard reset at the boundary creating the thundering-minute pattern, token bucket's drip refill. The visual makes the boundary-effect concrete in a way prose cannot.

**Engagement.** A `Matching` round: three traffic shape descriptions ("steady drip with occasional bursts up to N", "we accept some unfairness around the minute boundary in exchange for half the Redis ops", "smoothest user experience, auth defaults here") matched to the three algorithms.

**Components.**
- Existing: `CodeVariants` for the wrong/right declaration site.
- New: `RateLimitAlgorithmStrips` — props: array of `{ name, capacity, window, refillRate? }`, a "send request" button, an animation loop showing the budget timeline. Three strips render in parallel so identical clicks produce three different outcomes.
- Existing: `Matching` for recall.

**Project link.** Chapter 15.4.3 declares three `Ratelimit` instances at module scope, all sliding window. This concept makes that choice an obvious default rather than a tribal habit.

---

## Concept 5 — Dual-keying: per-IP AND per-email

**Why it's hard.** This is the load-bearing security insight of the chapter, and it is non-obvious. Per-IP alone lets a botnet through. Per-email alone is the lockout vector — an attacker hammering `alice@example.com` from one IP locks Alice out of her own account. The fix is two independent gates against the same `signInLimiter` with `ip:` and `email:` prefixes, both must pass, neither can be skipped. The misconception students arrive with is "one limiter, one key, done."

**Ideal teaching artifact.** A wrong-by-default sandbox the student has to repair (new archetype: *repair sandbox*). The starting state shows a sign-in action with a single limiter call — `await signInLimiter.limit(email)`. Three attack scenarios are presented as runnable buttons: *single IP, brute force one email*, *botnet, brute force one email*, *attacker locks out Alice from her account*. The student clicks each and reads a small log panel showing what got through and what got blocked. The single-key code lets two of three attacks succeed. The student is asked to edit the action — add the per-IP gate, or swap which key is checked, or both — and re-run. Only the both-gates version produces a clean log across all three scenarios. The artifact carries the assessment because the student cannot proceed without producing a passing edit.

**Engagement.** The artifact is the assessment. Follow it with a one-question `MultipleChoice` confirming the rule in words: "Why does sign-in need both gates? (a) Belt and suspenders, (b) Per-IP alone misses credential stuffing across IPs and per-email alone is the lockout vector, (c) The IETF draft requires it, (d) Better Auth needs it."

**Components.**
- New: `RateLimitRepairSandbox` — props: starting code (TS string), three attack scenario definitions (each with a sequence of `{ ip, email }` requests and an expected pass/block outcome), a code editor pane, a "run scenario" button, a log output pane. Grader is structural (does the code call both `limit('ip:'+...)` and `limit('email:'+...)`?) plus behavioral (do all three scenarios produce clean logs?).
- Existing: `MultipleChoice` for the confirming beat.
- Alternative if the bespoke sandbox is out of budget: a `ReactCoding` exercise in target-match mode with a fixed attack-runner harness and the student writes the action body. Less self-explanatory than the dedicated UI but reuses an existing component.

**Project link.** Chapter 15.4.4 lands the dual-keying in real code against the Better Auth sign-in action. The sandbox here is the dry run; 15.4.4 is the actual rep.

---

## Concept 6 — Gate first, work second

**Why it's hard.** Where the limiter call sits inside the action is an architectural decision, not a stylistic one. After `await betterAuth.signIn(...)` defeats the purpose — the attacker has already burned the database read and the password hash. After the database lookup for the user record, same problem. The student needs to see the action as a sequence of gates and work, and to internalize that the limiter is the cheapest gate and goes first.

**Ideal teaching artifact.** A scrubbable timeline (`DiagramSequence`) of the sign-in action, six frames: *parse input → normalize email → extract IP → limit('ip:'+ip) → limit('email:'+email) → betterAuth.signIn*. Each frame annotates the cost incurred so far on the right edge (cumulative ms estimate + "Redis op count" + "DB op count"). The student scrubs forward and watches the cost climb. Then a "wrong order" toggle moves the limiter calls to after `betterAuth.signIn`; the same scrub now shows the password-hash cost incurred *before* the rate-limit reject. The visual makes "gate first, work second" a measurable property, not a slogan.

**Engagement.** A `Sequence` ordering drill: six step labels (parse input, normalize email, extract IP, per-IP limit, per-email limit, Better Auth verify) dragged into the correct order. The drill is short because the timeline did the heavy lift.

**Components.**
- Existing: `DiagramSequence` with six frames, each frame a hand-SVG of the action stack with annotated cost. The "wrong order" toggle is a second `DiagramSequence` rendered in a `TabbedContent` tab so the student can flip between the two orders.
- Existing: `Sequence` for the ordering recall.

**Project link.** Chapter 15.4.4's verify pass in 15.4.5 explicitly checks gate-before-work timing — this concept is the rule that pass enforces.

---

## Concept 7 — The 429 contract: user-safe body, operator-honest log

**Why it's hard.** Information leaks via error messages are subtle and easy to ship. Returning "too many attempts on this email" or "your IP has been throttled" tells an attacker either that the email exists in the system (defeating the careful work the sign-in flow does to keep that secret) or that they should rotate IPs. The student also needs the IETF-shape `RateLimit-*` headers on *every* response, not just 429s, and to understand that `Retry-After` takes precedence on a reject. The dual-channel rule — opaque to user, structured to log — is the senior reflex.

**Ideal teaching artifact.** A side-by-side "response inspector" panel showing two columns: *what the user sees* (body + status + visible headers) and *what the operator sees* (structured log line). Three buttons at the top — *successful sign-in*, *per-IP gate trips*, *per-email gate trips*. The student clicks each and watches both columns update. The user column is *identical* across the two reject cases ("Too many attempts. Please try again later."). The operator column differs by which limiter rejected and which key. The artifact is a Pattern teaching the contract by making the two views literally side-by-side.

**Engagement.** A `Tokens` round on a rendered 429 response — the student clicks the four required headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`) on a stub response, with decoys (`X-RateLimit-Reason: email-gate`, `WWW-Authenticate`, etc.) that look right but leak.

**Components.**
- New: `ResponseInspectorPanel` — props: array of scenarios, each producing `{ user: { status, body, headers }, operator: { log } }`. Two-column rendering, a row of scenario buttons. Recurs naturally in Unit 17 (security headers, CSP) and Unit 20 (observability log shape) — the forward-link weight justifies the bespoke build.
- Existing: `Tokens` for the header-identification recall.

**Project link.** Chapter 15.4.5's verify pass checks opaque-body and four-header-on-429; this concept is the rule the verify enforces.

---

## Concept 8 — Fail-open is a decision, not a default

**Why it's hard.** The naive instinct under a Redis outage is to fail-closed (reject the request "to be safe"). On an auth endpoint, fail-closed means the entire user base cannot log in for the duration of the outage — a worse failure than a brief abuse window. The senior call is fail-open with structured alerting, and the rule is that fail-open is a *deliberate decision* expressed in one helper (`safeLimit`), not a swallowed `catch` block. Some endpoints (billing webhooks, privileged admin actions) flip the default the other way, and the student needs to see the trade-off so the flip is principled.

**Ideal teaching artifact.** A two-axis Decision matrix as a hand-SVG inside `Figure`: rows are endpoint classes (sign-in, sign-up, password reset, billing webhook, admin destructive action, public read API), columns are *fail-open consequence* and *fail-closed consequence*. Each cell is one phrase ("brief abuse window, alert fires" vs. "user base locked out", or "duplicate webhook ignored, retried" vs. "Stripe gives up after retries, money lost"). The chart's diagonal makes the rule visible: the cells with the most painful consequence flip the default. The course's default — fail-open on the auth path — is marked. The implementation note follows: one `safeLimit(limiter, key)` helper, policy lives in one place, every call site flips by changing the helper not the call.

**Engagement.** A short `MultipleChoice` (multi-select): "Which endpoint classes should default to fail-closed on a limiter error?" with the two correct picks (billing webhook receiver, admin destructive action) and three plausible decoys (sign-in, password reset, public read API).

**Components.**
- Hand-SVG decision matrix inside `Figure`. Single-use in this chapter, with a weak forward-link to Chapter 17.2's security baseline audit — defaulting to static SVG inside `Figure` rather than a bespoke component is the right call.
- Existing: `MultipleChoice` (multi-select) for the recall beat.

**Project link.** Chapter 15.4.4 has the student write `safeLimit` and wire the `rate_limit_unavailable` log event. This concept is the trade-off that makes that one helper a senior-shaped abstraction rather than a swallowed error.

---

## Component proposals

**`LayeredRequestSimulator`** — picks an attack profile, animates request packets through two stacked lanes (edge WAF, application limiter), lanes light up on reject.
- Uses in this chapter: Concept 1.
- Forward-links: Unit 17.2 (security baseline audit — same two-layer model resurfaces); Unit 12.1 (webhook receiver layering, though abuse shape differs).
- Leanest v1: two static lanes, three pre-baked attack profiles as buttons, no animation — just a side-by-side reject/pass indicator that updates on click. Passes the teaching bar; the animation polish is upside.

**`RateLimitAlgorithmStrips`** — three time-axis strips (sliding, token bucket, fixed), a "send request" button, each strip shows the budget responding in real time.
- Uses in this chapter: Concept 4.
- Forward-links: None — single-use in this chapter, and the algorithm trio is unlikely to recur. Demoted to the alternative bullet in Concept 4 if the build budget is tight: a `DiagramSequence` of three frames per algorithm at fixed request counts gets most of the lesson done.
- Leanest v1: three SVG strips inside one `Figure`, no interactivity, annotated with three timestamps showing how each algorithm responds to the same request burst. If the static version teaches it, build the static version.

**`RateLimitRepairSandbox`** — wrong-by-default code editor with three attack scenarios as run buttons and a structural+behavioral grader.
- Uses in this chapter: Concept 5.
- Forward-links: Unit 17.2 (security baseline audit — the same repair shape fits CSP misconfigurations, missing audit-log fields); Unit 9.5 (Better Auth wiring fixes). Genuine reuse potential.
- Leanest v1: a `ReactCoding` exercise in target-match mode with a fixed attack-runner harness. The dedicated component adds clearer affordances (scenario buttons rather than test names) but `ReactCoding` carries the teaching at lower cost.

**`ResponseInspectorPanel`** — two-column user/operator view of the same response, scenario buttons drive updates.
- Uses in this chapter: Concept 7.
- Forward-links: Unit 17.2 (security headers, CSP — same user/operator split), Unit 20.1 (observability — log shape vs. response shape), Chapter 12.1 (webhook receivers — opaque public response, detailed log). Strong reuse.
- Leanest v1: a `TabbedContent` with one tab per scenario, each tab containing a two-column static table (user column, operator column). Loses the "click and watch both update" feel but preserves the contract. Build the bespoke version when the side-by-side-update is teachable in another chapter too.

## Build priority

`ResponseInspectorPanel` carries the most forward-link weight — the user-safe-public / operator-honest-log split recurs in Units 17 and 20 and in webhook receivers. Build it first; this chapter is the proof-of-concept.

`RateLimitRepairSandbox` is second priority but the recommendation is to ship the leanest v1 (`ReactCoding` in target-match mode) for Chapter 15.3 and only invest in the bespoke component once Unit 17.2's audit lessons confirm the repair shape recurs. The teaching bar passes either way.

`LayeredRequestSimulator` is third — the static v1 (two lanes, three pre-baked buttons) probably suffices, with the animated upgrade earned only if Unit 17.2 reuses the lane model.

`RateLimitAlgorithmStrips` should ship static (SVG inside `Figure`) and not as a bespoke component — single-use with no credible forward-link.

## Open pedagogical questions

- Concept 5's repair sandbox vs. a `ReactCoding` exercise: the bespoke component reads more clearly for the abuse-scenario framing, but `ReactCoding` already exists. Worth a build-vs-reuse call before drafting 15.3.3.
- Concept 4's two-beat structure (Pattern code panel + algorithm visualizer) may run long for one lesson slot — if 15.3.2 is already heavy, the algorithm visualizer could be cut to a static three-strip SVG with the prose carrying the boundary-effect description.
