# Lesson 1 outline — Two layers: edge WAF and application limiter

## Lesson title

- Title: `Two layers: edge WAF and application limiter`
- Sidebar label: `Two layers of rate limiting`

## Lesson framing

This is the chapter's **threshold lesson**. It is architecture and decisions, not syntax — almost no code is written here. Lesson 2 owns the `@upstash/ratelimit` API surface; lesson 3 owns the wiring. This lesson's only job is to leave the student with three crisp mental models:

1. **Two layers, not one.** Edge controls (Vercel WAF) and application controls (`@upstash/ratelimit`) are different rings catching different abuse shapes. A 2026 SaaS runs both; removing one is a regression.
2. **The trigger that flips application limiting from optional to mandatory** is concrete and nameable — the public URL with an email+password sign-in form — not vague "scale" or "growth."
3. **Upstash Redis is the default reach** for the application layer, and the fail-open-on-auth policy is the senior default for what happens when it's unreachable.

Pedagogical stance (from guidelines): decisions before syntax, trigger before tool, defaults before conditionals. Lead every section with *why this, when does it break, what would a senior do.* The student arrives with strong prerequisite scaffolding — Better Auth sign-in (Unit 8), Server Actions / route handlers as write seams (Unit 6), the cache layer (ch072/073), webhooks (Unit 11). Lesson 052 already told them "per-account lockout composes with the per-IP rate limit," so the *idea* of per-IP limiting is not new — what's new is the **layering**, the **per-key** dimension, and **where the state lives.**

Cognitive-load discipline: build the model in stages. Start with the single most visceral problem (the email-lockout / credential-stuffing math), because it is the *one* idea that justifies the entire chapter and the dual-keying everything else depends on. Get the student to *feel* the trap before naming tools. Then layer in the two-layer architecture, then the timeline (pre-launch → public launch), then the tool choice, then the fail-mode.

Biggest beginner pitfalls this lesson must inoculate against (surfaced inline, never bundled into a "watch-outs" section):
- "The WAF rate-limit rule covers `/api/auth/*`, so I'm done." — The single most common mistake in this stack; the per-email check is invisible to the WAF.
- In-memory limiters in serverless functions ("works in dev, collapses in prod, every invocation has its own memory").
- Provisioning Upstash in a region distant from Vercel (adds 30–80ms/call).
- Reaching for Upstash to "speed up the database" — wrong trigger, wrong tool.
- Fail-closed on the auth path taking the whole user base offline during a Redis incident.

Tone: adult, terse, production-framed. No celebratory scaffolding. Frame everything in real production stakes (an incident, a botnet, a locked-out office).

Code role: minimal. No limiter *configuration* code (that's lesson 2) and no *wiring* code (lesson 3). The only code-shaped artifacts here are (a) a tiny illustrative `try/catch` skeleton for the fail-open policy showing *shape and intent only* — pseudo-real, not the final `safeLimit` impl — and (b) one annotated screenshot/mock of a WAF rule to make "two clicks in the dashboard" concrete. Everything else is prose + diagrams + decision widgets + classification exercises.

---

## Lesson sections

### Introduction (no header — lesson intro prose)

Open on the senior question as a concrete scenario, not an abstract topic. A pre-launch demo is live on a Vercel preview URL; a crawler is hammering the sign-up form. The team hasn't provisioned Redis. A public launch with email+password is a week out. **Which controls run today, what flips the decision, and what does each tool catch that the other can't?** State that by the end the student will be able to name the two layers, name the exact trigger that makes the application limiter non-negotiable, justify Upstash as the default, and decide the fail-open vs fail-closed call. Keep it to a short paragraph or two — warm, brief, connects to "you already shipped Better Auth sign-in in Unit 8; this is the seam that protects it." Do not preview the algorithm or API (next lessons).

Reasoning: guidelines require the senior question to live in the intro implicitly; the scenario *is* that question and it threads through the whole lesson.

### One attacker, ten thousand IPs, one victim's email

Lead with the problem, before any tool. This is the emotional + logical core of the chapter — establish it first so every later decision has a reason to exist.

Walk the credential-stuffing / email-lockout math concretely:
- An attacker with a botnet has 10,000 IPs and a leaked password list. They target *one* victim's email, trying password after password, each guess from a different IP.
- A **per-IP** limit never trips — each IP makes one or two requests.
- Tightening the per-IP limit enough to stop a distributed attack would trip the **office NAT** (hundreds of legitimate users behind one IP) — collateral damage, support tickets, the wrong fix.
- The only limit that catches this is **per-email**: count attempts against the *email being targeted*, regardless of source IP.
- But a naive per-email limit is itself the weapon: an attacker can hammer a *victim's* email with garbage just to **lock the victim out** of their own account (a denial-of-service / lockout vector).
- Resolution preview (not yet implemented — lesson 3 owns it): the answer is **two independent limits per request, per-IP AND per-email**, each catching what the other misses. Name it here as the punchline; defer the wiring.

Then make the architectural inference explicit: the per-email limit can only exist **after** the request has been parsed and the email is in hand — i.e. **inside the application**, in the Server Action / route handler. An edge layer sitting in front of the app sees the IP and the path but **not the email**. This is the hinge that forces a *second* layer.

**Diagram — the two-attack contrast (TabbedContent, two tabs).** Pedagogical goal: make the per-IP-blind-spot visible at a glance. Use `TabbedContent` with two `TabbedItem`s, each an `ArrowDiagram` (boxes are real HTML so we can show "10k IPs" as a stacked cluster):
- Tab 1 "Single-source brute force": one IP box → many arrows to one sign-in box → caught by a per-IP gate (gate box tinted green/blocked). Caption: a per-IP limit catches this.
- Tab 2 "Distributed credential stuffing": a cluster of IP boxes (label "10,000 IPs") → arrows converging on one **email** box → the per-IP gate (tinted, "passes — each IP is under budget") then a per-email gate that blocks. Caption: only a per-email limit, applied where the email is visible, catches this.
Keep boxes few and horizontal (vertical-space constraint). Arrows converging on a single target is exactly the shape that reads here. If three-plus arrows crowd the gap, prefer color-matching the IP cluster to the converging endpoint over many labeled curves (per ArrowDiagram guidance).

Reasoning: this single contrast is the load-bearing intuition. Leading with it means the two-layer architecture in the next section lands as "oh, that's *why*" instead of an arbitrary taxonomy.

### The two layers: edge controls and application controls

Now name the architecture the previous section forced. Define the two rings precisely:
- **Edge controls** (Vercel WAF rate-limiting rules; Cloudflare's equivalent) sit *in front of* the application. They see **IPs, paths, headers** — nothing inside the request body, nothing about identity. They stop a single IP from crawling the whole site, scrapers, crude brute force, before the request ever reaches your function (so they're also the cheapest — no compute billed).
- **Application controls** (`@upstash/ratelimit` inside Server Actions and route handlers) sit *after* auth/parsing. They see the **user, the email, the org, the request body**. They stop the distributed-stuffing / lockout pattern the edge structurally cannot see.

State the rule plainly: **each catches what the other cannot; a 2026 SaaS runs both.** This is steady-state architecture, not a migration phase. (Foreshadow lightly: this is one row of the security baseline — SaaS pattern #12, audited in ch081 — but don't over-explain; that's a later unit.)

**Diagram — the request path through both rings (Figure + ArrowDiagram, or simple HTML+CSS layered strip).** Pedagogical goal: spatial model of *where each layer sits in the request lifecycle.* Left-to-right: `Client` → `[Edge / WAF ring]` → `[Vercel Function: Server Action / route handler]` containing `[App limiter ring]` → `[Better Auth verify]` → `[DB]`. Annotate each ring with what it can see (WAF: "IP, path, headers"; app: "+ email, user, org, body"). One horizontal flow, capped height. This is a "picture of a specific thing" (the request line) — HTML+CSS layered boxes or ArrowDiagram both fit; choose whichever renders the nested "ring inside the function" cleanly. Reuse/extend this same skeleton in the fail-mode section so the student sees one consistent map.

Small table or CardGrid contrasting the two layers on the axes that matter: **where it sits**, **what it sees**, **what it catches**, **what it costs**, **example abuse it stops**. Tables are good for a clean two-column contrast the student will want to refer back to.

**Exercise — classify the abuse (Buckets).** Pedagogical goal: check that the student internalized *which layer owns which abuse shape* (the whole point of the lesson). Two buckets: "Edge / WAF" and "Application limiter." Items to sort, e.g.: "One IP scraping every product page" (edge), "A botnet trying 10k passwords against one email" (app — per-email), "Per-org monthly export quota" (app — needs org identity, post-auth), "A single IP flooding `/api/*`" (edge), "Locking one user out by spamming their reset email" (app — per-email), "A known-bad IP you want hard-blocked" (edge). Each item, on grading, reinforces the see/can't-see distinction. This is the right exercise type because the skill is *classification*, and Buckets is purpose-built for it.

Reasoning: the two-layer taxonomy is the lesson's spine; a classification drill is the cleanest comprehension check and is far better than a sandbox (no code to run here anyway).

### Before the public URL: the edge layer is enough

Now the timeline. Frame the *defaults-before-conditionals* arc: what runs **today**, before the trigger fires.

- Pre-launch the app lives behind a Vercel preview or a private link; the abuse surface is mostly bots and the occasional probe. There is no victim-email vector yet because there's no public sign-in form being targeted.
- **Vercel WAF rate-limiting rules** cover the basics: per-IP request budgets on `/api/*`, on the sign-in/sign-up paths, on any costly route handler. Declared in the **dashboard** (or via the Vercel Firewall SDK — named once, not used). Key senior-relevant properties: rules take effect **without a redeploy**, cost is **zero on the free/Pro tier's included allotment**, and a rule can **log** (observe) or **deny** (block).
- The senior call: **ship the WAF rule with the first preview, don't wait.** It's the cheap outer ring and it's two clicks.

Surface *what a 2026 WAF rule looks like* without writing one in code — the architectural point is "the edge is the cheap first layer," and the wiring is dashboard config. Use a single annotated `Screenshot` or a small HTML mock of the rule shape: condition (path matches `/api/auth/*` AND request rate from one IP > N per window) → action (deny / log). Caption it as "this is config, not code — the value is that it's the layer that costs nothing and needs no deploy."

**Tooltip terms** in this section: `WAF` (Web Application Firewall — a filter in front of the app that inspects requests by IP, path, and headers before they reach your code), `edge` (the CDN/proxy tier that runs before your application function).

Reasoning: establishing the pre-launch baseline first satisfies the "defaults before conditionals" filter and sets up the next section's *trigger* as a clean state-change.

### The trigger: a public URL with email+password

The pivot of the lesson. Name the trigger **precisely**: the moment the app is reachable at a custom domain with a sign-in form, application-level rate limiting on the auth endpoints becomes **non-negotiable.** Not "scale," not "when we grow" — *this specific event.*

Re-state the reason crisply, now that the two-layer model and the credential-stuffing math are both established: the public sign-in form is the victim-email vector going live. The WAF can't see the email, so per-IP-at-the-edge alone leaves the distributed-stuffing and the lockout patterns open; the only fix is the per-IP-AND-per-email pair applied **inside the action** where both are visible (forward-ref: lesson 3 implements it).

Make the "both layers ship together" rule explicit and call out the trap: **shipping the public URL with only the WAF rule and no application limiter leaves the lockout-by-email vector wide open.** This is the inline watch-out for this section — it qualifies the trigger, so it lives here, not in a trailing list.

**Diagram — the decision, as a committed walk (StateMachineWalker, `kind="decision"`).** Pedagogical goal: drill the *order a senior asks the questions* — the lesson lives in the order, not any single leaf. Root question: "Is the app reachable at a public URL with a sign-in form?" Branches:
- "No — preview/private link only" → Question: "Any costly or crawlable public route handlers?" → Leaf "Edge WAF rule, ship it now" (per-IP budgets in the dashboard; no Redis needed yet) / Leaf "WAF rule still cheap insurance — add it."
- "Yes — public URL + email+password" → Leaf "Application limiter is non-negotiable — per-IP **and** per-email at the action boundary, on top of the WAF" (the WAF stays; this is the inner ring). 
StateMachineWalker provides its own card; do **not** wrap in Figure. Keep leaves' reason bodies to 1–3 sentences each. This component is the canonical "trigger before tool" vehicle per its own doc.

Reasoning: a `StateMachineWalker` forces the student through the senior's questioning order and makes the trigger feel like a gate they cross, reinforcing it far better than prose.

### Why Upstash Redis is the 2026 default

Tool choice for the application layer, framed as a sequence of constraints that eliminate the alternatives — *defaults before conditionals*, with the reasoning visible.

Start from the requirement the limiter imposes: a sliding-window limiter needs **per-key counters with sub-second precision and TTLs**, and that state must be **shared across every serverless invocation.** Drive the eliminations:
1. **In-memory state is out** — every serverless invocation has its own memory; counters wouldn't be shared. (This is the big footgun — state the trap explicitly: in-memory "lightweight" limiters *appear to work in dev and collapse under any real traffic* because dev is one long-lived process and prod is many short-lived ones.)
2. The store must be reachable from **every runtime the app uses** — Node serverless, edge functions, Trigger.dev workers.
3. **Upstash Redis** fits: it speaks **HTTP/REST** (so it works in edge contexts where Node TCP sockets are unavailable — `ioredis`-style TCP clients silently fail there), it **scales to zero** (no idle cost), it has a **generous free tier** (order-of-magnitude: ~500K commands/month — roughly 16K/day — at time of writing; state the current figure, not the old "10K/day" the chapter outline still references), and it's the **2026 default in the Vercel ecosystem** (`@upstash/ratelimit` is published and maintained by Upstash; the Vercel Marketplace integration writes the env vars).

**Name the alternatives once, with the condition that flips to each** (recognition, not depth): Cloudflare KV / D1 (when already on Cloudflare's edge), self-hosted Redis on Fly/Railway/EC2 (existing infra, or latency to a non-Vercel region). **Do not list "Vercel KV" as an alternative** — it was deprecated and migrated to Upstash Redis (Dec 2024); on Vercel the key-value product *is* Upstash Redis via the Marketplace now. If the student has heard of Vercel KV, a single clause clarifying it became Upstash is the right touch — not a live option. For a 2026 SaaS on *this* stack, Upstash is the default reach.

**The naming discipline** (short subsection-worth of prose, or a tight `CardGrid` of four cards): the 2026 senior names each precisely because the npm packages and docs do:
- **Redis** — the protocol and data structures.
- **Upstash Redis** — the managed service.
- **`@upstash/redis`** — the HTTP/REST client.
- **`@upstash/ratelimit`** — the rate-limiting library that uses `@upstash/redis` internally.

**What Upstash is *not*** (negative space — prevents over-reach). State plainly: not a Postgres replacement (no relational data, no cross-key transactions, no joins); not a durable queue (Trigger.dev owns that — Unit 12); not the Next.js data cache (the `cacheTag` world owns that — ch072/073). Reaching for Upstash to "speed up the database" is the **wrong trigger** — that work is the index plan (ch039) or the cached read (ch072). Naming the negative space is itself a senior reflex.

**The further upside (brief).** Once Upstash is in the stack for rate limiting, the same Redis cheaply serves other workloads — name three for recognition so the student knows the spend earns more than one use: (1) a cross-process cache for tiny/hot eventually-consistent values, (2) shared short-lived session-shaped data (single-use reset/verification tokens, the "send-email" cooldown the auth flow uses), (3) a foothold for pub/sub if the notification dispatcher later coalesces. Keep this to a few sentences — the **trigger of the chapter is still the auth endpoints**, the rest is upside. Do not implement any of it.

**Provisioning — one shape the course commits to.** Create the Upstash Redis DB via the **Vercel Marketplace integration**, which writes `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into the project's env across all three environments (production, preview, development); or via the **Upstash dashboard** for non-Vercel deploys (manual env wiring). **Pick the region to match the primary Vercel region** for the lowest p50 — call out the trap inline: a distant region adds **30–80ms per `limit()` call**, co-locate. Note the two env-var names map to the project's `env.ts` validation (built in ch037 via `@t3-oss/env-nextjs` + Zod) — the starter assumes they're present. No client code here (lesson 2 owns `Redis.fromEnv()`).

**Tooltip terms**: `Redis` (an in-memory key-value data store; here used for fast per-key counters with expiry), `Upstash` (a serverless, HTTP-accessible managed Redis), `TTL` (time-to-live — an automatic expiry on a key, what makes a counter reset after the window), `scale to zero` (no servers and no cost when idle; you pay per request, not per hour), `p50 / p99` (the median / 99th-percentile latency — the typical and near-worst-case round-trip).

Reasoning: presenting Upstash as the *survivor of a constraint cascade* (rather than "the recommended choice") teaches the student to derive the decision, matching the "decisions before syntax" pillar. The naming-discipline and negative-space subsections are cheap insurance against the two most common conceptual errors (confusing the packages; over-reaching with Redis).

### When the limiter can't reach Redis: fail open, log loud

The fail-mode question — the last decision, and a genuinely senior one.

Set up the failure: the auth endpoint's `limiter.limit(key)` call can **throw or time out** if Upstash is unreachable. The code must decide what happens next. Two options:
- **Fail-open** — allow the request, **log loudly at error level, alert on the rate.** Risk: a brief abuse window while Redis is down.
- **Fail-closed** — reject the request as if rate-limited. Risk: a Redis outage **locks every user out of their own account.**

State the course default and the reasoning: **fail-open on the auth path.** A Redis outage locking out the entire user base is worse than the brief abuse window — and the WAF outer ring is still up during that window, catching the crudest abuse. Name the nuance: high-value endpoints (admin-only privileged actions, billing webhooks the customer cannot retry) **may flip to fail-closed** — the trade-off is per-endpoint, decided once.

Implementation shape (intent only — lesson 3 ships the real `safeLimit`): a `try/catch` around the `limit()` call, the **policy decided in one helper**, not scattered at every call site. Show a *tiny* illustrative skeleton with `Code` (or `AnnotatedCode` if it earns two focal points) — `try { return await limiter.limit(key) } catch (e) { logger.error({ event: 'rate_limit_unavailable', ... }); return { success: true } }` — and label it explicitly as "shape, not the final implementation; lesson 3 wires the real helper." Match the canonical name (`safeLimit`) and the structured-log event name (`rate_limit_unavailable`) from the code conventions so downstream lessons inherit the same vocabulary. Tie the logging to the existing discipline: this is a `pino` `error`-level line (Unit 19 / `lib/logger.ts`), and a **sustained `rate_limit_unavailable` alert is an Upstash incident, not quiet drift** — the operator's reflex.

Note the failure mode is *not silent*: "the limiter never fails closed silently — a Redis outage is a logged, alertable event."

**Diagram (optional, small) — the fail-open branch.** Reuse the request-path strip from "the two layers" and overlay the Redis-unreachable branch: `limit()` throws → catch → log error → request proceeds. Keep it tiny; a Mermaid `flowchart LR` (try → success / catch → log+allow) is also fine here since the nodes are just labels. Pedagogical goal: cement that fail-open means *the request continues*, the limiter does not become a single point of failure for sign-in.

**Exercise — fail-open vs fail-closed call (MultipleChoice or TrueFalse round).** Pedagogical goal: verify the student can apply the policy per-endpoint. A few scenarios: "Redis is down and a user tries to sign in — fail-open: allow + log" (true), "A billing webhook the customer can't retry, Redis down — fail-closed may be the right call" (true), "Fail-closed on sign-in during a Redis outage is the safe default" (false — it takes the user base offline). TrueFalse round fits a short policy check cleanly.

**Tooltip term**: `fail-open` / `fail-closed` (when a security control breaks: fail-open lets traffic through, fail-closed blocks it — opposite risk profiles).

Reasoning: the fail-mode is where juniors reflexively pick "fail-closed = more secure" and take production down. Framing it as a per-endpoint trade-off with a default + named exceptions is the senior lesson; an applied exercise checks they can transfer it.

### External resources (optional)

A short `ExternalResource` / LinkCard set, only if they add value: Vercel WAF / Firewall docs (rate-limiting rules), Upstash Redis docs (overview + Vercel integration), the `@upstash/ratelimit` repo. Keep to two or three; do not duplicate lesson content. (Defer the IETF `RateLimit-*` header draft and the algorithm docs to lesson 2, where they belong.)

---

## Scope

**This lesson covers:** the two-layer model (edge WAF vs application limiter) and what each catches; the credential-stuffing / email-lockout intuition that motivates per-key limiting (the *why* of dual-keying — **not** its implementation); the pre-launch edge-only baseline and the public-URL+email-password trigger; why Upstash Redis is the 2026 default, the package naming, the negative space, and the one-shape provisioning; the fail-open-on-auth policy and trade-off.

**Explicitly out of scope (defer, name at most once):**
- The sliding-window vs token-bucket vs fixed-window algorithm decision — **lesson 2.** Do not explain the algorithms here; "sliding window is the default" may be mentioned in passing only if needed, without mechanics.
- The `@upstash/ratelimit` API surface — `Redis.fromEnv()`, the `Ratelimit` config, `limit(key)` return shape, `prefix`, `analytics`, module-scope declaration mechanics, `pending`/`waitUntil` — **lesson 2.** This lesson references "the limiter lives in `lib/rate-limit.ts` at module scope" as an architectural fact but writes **no config code.**
- The per-IP + per-email dual-keying *implementation*, the gate-first seam, the `RateLimit-*` response headers, the 429 user-safe body, the real `safeLimit` helper — **lesson 3.** This lesson names dual-keying as the *answer* and fail-open as the *policy* but ships only intent-level skeletons.
- Better Auth's built-in rate limiter and the swap-out — **lesson 3 / ch075.**
- The Vercel Firewall SDK / WAF rules in code — out of scope, named once.
- Upstash as a cross-process cache for the cache layer; self-hosted Redis on Fly/Railway/EC2; multi-region replication; deny-lists — named once each, deferred.
- The verify recipe (run N requests, read headers, watch the dashboard) — ch075 project.
- The security-baseline audit pass — ch081.
- Alerting wiring / structured-log line shape — Unit 19 (ch092).

**Prerequisites to redefine concisely (the student has these; one line each, don't re-teach):** Server Actions and route handlers are the canonical write seams (Unit 6); Better Auth owns the sign-in/sign-up/reset actions and enumeration-opaque errors (Unit 8 — lesson 052 already noted per-IP rate limiting composing with per-account lockout); `env.ts` validates env vars at build time via `@t3-oss/env-nextjs` + Zod (ch037); `pino` structured logging with `error`/`warn` levels and `lib/logger.ts` (Unit 19, named forward).

---

## Notes for downstream agents

- **Keep code near-zero.** The two only-permitted code artifacts are the intent-level fail-open `try/catch` skeleton and (optionally) a WAF-rule mock/screenshot. If you feel the urge to write a `Ratelimit` config or a `limit()` call, stop — that's lesson 2/3. Writing it here creates cross-lesson contract drift.
- **Match the canonical vocabulary** from `Code conventions.md` → Security baseline so lessons 2/3 inherit it: helper name `safeLimit`, module `lib/rate-limit.ts`, structured event `rate_limit_unavailable`, "fail-open on Redis-auth errors with a logged warning; fail-closed only on actual quota exhaustion," dual-key (per-IP and per-email). (Deliberate divergence for staging: this lesson shows fail-open returning `{ success: true }` as *shape*; the real impl is lesson 3's.)
- **Diagrams:** the request-path strip is the reusable spine — author it once, overlay it for the fail-mode. The two-attack contrast (TabbedContent of ArrowDiagrams) is the load-bearing intuition figure; invest there. Respect the ~800px height cap and prefer horizontal layouts.
- **Components used:** `TabbedContent` + `ArrowDiagram` (two-attack contrast), `Figure` + `ArrowDiagram` or HTML+CSS (request-path strip), `StateMachineWalker` `kind="decision"` (the trigger walk), `Buckets` (layer classification), `TrueFalse`/`MultipleChoice` (fail-mode policy), `Screenshot` or HTML mock (WAF rule), `CardGrid` (package naming), `Term` (tooltip terms listed per section), `Code`/`AnnotatedCode` (fail-open skeleton only), optional `ExternalResource`.
