# The abusable-endpoint matrix

Title: The abusable-endpoint matrix
Sidebar label: Abusable-endpoint matrix

## Lesson framing

This is an **audit / cataloging lesson, not a wiring lesson**. Chapter 074 already taught the entire `@upstash/ratelimit` machinery — the connectionless client, the three algorithms, module-scope declaration, the `limit(key)` return shape, dual-keying, RFC headers, and the `safeLimit` fail-open wrapper. The student can already protect *one* endpoint. What's missing is the senior's coverage discipline: a repeatable way to look at a whole codebase and answer "which endpoints are abusable, which *must* have a limiter, what key does each one count under, and how does coverage stay grep-able as the app grows."

The mental model the student should leave with: **rate limiting is not "throttle everything" — it's a targeted control applied where one of three abuse conditions holds, keyed at the smallest scope that contains the abuse without hurting legitimate users.** The deliverable is a coverage matrix — a table of (category, file, limiter prefix, key strategy, covered Y/N) — where every "N" is a ticket. This matrix is one of the catalog artifacts chapter 082's audit project consumes.

Pedagogical priorities, in order:
1. **The three triggers are the load-bearing idea.** Beginners over-apply rate limiting (a limiter on every read, fragmenting analytics and hurting UX) or under-apply it (only auth, because that's the one the tutorial covered). The three triggers — costs money, can attack a third party, touches state addressable without auth — are the decision filter that replaces both reflexes. Teach them as a checklist where *any one* makes a limiter mandatory.
2. **The seven categories are the recall scaffold.** They're the worked output of running the three triggers across a real SaaS surface. Auth is already covered (chapter 074) and is shown as the solved example the other six generalize from. The categories make the abstract triggers concrete and give the student a memorable inventory to walk a codebase against.
3. **Key strategy is "smallest scope that contains the abuse."** The recurring per-category mistake (per-IP-only locks out office NAT; per-email-only enables rotate-and-burn; one shared limiter fragments analytics) all reduce to picking the wrong scope. Teach key choice as a single principle, then table the per-category application.
4. **Two grep-able invariants keep the matrix honest** — every `limit(` goes through `safeLimit`; every limiter is declared at module scope in `lib/rate-limit.ts`. These are restated from 074/080, not taught fresh; their role *here* is that they make the audit a mechanical grep rather than a judgment call.

Framing throughout: production stakes ("which of these endpoints, if left open, would show up as a Resend deliverability incident, a surprise LLM bill, or a victim's flooded inbox"). Keep prose terse and senior; the student has the API in muscle memory already, so spend tokens on decisions, not syntax. This lesson is conceptual — favor a decision diagram, a category map, and a classification exercise over live coding (the API isn't the thing being taught, and `@upstash/ratelimit` can't run in the in-browser ReactCoding sandbox regardless).

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete: chapter 074 wired a limiter on sign-in with per-IP-and-per-email dual keying — that one endpoint is safe. Then `curl` the rest of the app. The contact form fires Resend on every POST. The search endpoint runs an unindexed query. The presigned-upload route mints an R2 URL per call. None are rate-limited. The naive fix ("add a limiter to every route") is wrong — it fragments analytics and trips legitimate users. The senior fix is a *matrix*: name the abusable categories, decide each against a fixed threshold, key each at the right scope, and keep the whole thing grep-able. State the end deliverable up front (the coverage matrix) so the student reads the lesson as building toward a concrete artifact. Keep it to ~4 sentences; connect explicitly to "you already know how to protect one endpoint — this is how you stay covered across all of them."

### Three triggers decide whether an endpoint needs a limiter

The decision filter — the most important section. An endpoint gets a dedicated limiter if it matches **any one** of three triggers:

- **(a) It costs money per call** — LLM/AI completions, transactional email (Resend), SMS, any metered third-party API. One abuser maps directly to a line on an invoice.
- **(b) It can be used to attack a third party** — anything that sends to a victim's inbox (invites, password-reset email, notifications), or makes an outbound fetch on user-controlled input (link unfurl, webhook test, image proxy). The abuse target is someone outside your system; you're the relay.
- **(c) It touches state addressable without auth** — public sign-up, invite-accept-by-token, password reset, public webhooks, anything reachable before a session exists. No user id to key on means the cheap defenses don't apply.

Teach the contrapositive explicitly to kill the over-application reflex: an authenticated endpoint that fails all three (an ordinary tenant-scoped list read, a settings toggle) does **not** get a hand-rolled limiter — it gets the wrapper's coarse default per-user/per-org defensive budget and nothing more. "Limiter on every endpoint" is the anti-pattern; the three triggers are the line.

**Diagram — `StateMachineWalker`, `kind="decision"`.** A short decision walk: "Does this endpoint cost money per call?" → no → "Can it be used to attack a third party?" → no → "Does it touch state addressable without auth?" → no → Leaf: "Coarse per-user default only — no dedicated limiter." Any "yes" → Leaf: "Mandatory dedicated limiter — pick the key strategy next." Pedagogical goal: force the student through the *order* the senior asks the questions (cost → third-party → unauth), and make "no dedicated limiter" a legitimate, named outcome rather than an omission. Keep the tree shallow (3 questions, 2 leaves). Do not wrap in `<Figure>` (the walker is its own card).

`Term` candidates in this section: *credential stuffing* (referenced as the canonical (c)-style abuse), *inbox bombing* / *email bombing* (the (b) failure mode), *relay* (you-as-attacker's-proxy framing).

### Seven categories of abusable endpoints

The recall scaffold — the worked output of running the three triggers across a real SaaS surface. Present as a catalog, each entry naming the category, an example endpoint or two from this course's stack, and which trigger(s) flag it:

1. **Auth flows** — sign-in, sign-up, password reset. *Already covered (chapter 074).* Shown first as the solved example the rest generalize from. Triggers (b)+(c).
2. **Email-sending paths** — invitations, notification sends, contact/support forms. Spam-relay and inbox-bomb vectors. Triggers (a)+(b).
3. **Webhook fan-out** — the *receiver* is gated by signature verify (chapter 063); the emails and background jobs the webhook *triggers* are the uncapped cost. Trigger (a). This is the subtle one — call it out as the category beginners miss because they think "the webhook is already verified."
4. **Expensive public reads** — search, unindexed-filter list endpoints, AI completions. Trigger (a) (compute/LLM cost), sometimes (c) if public.
5. **File uploads** — R2 presigned-URL issuance (chapter 069). Storage cost + abuse surface. Trigger (a).
6. **Write-heavy actions on shared resources** — a single attacker filling the org's quota or flooding a shared collection. Trigger (a) (their cost becomes the org's).
7. **Anonymous endpoints** — public sign-up, request-demo, public webhooks, metrics scrape. Trigger (c); the absence of a user id is the defining trait.

Keep each entry to 1–2 lines; this is an inventory, not eight mini-lessons. Use a `Card`/`CardGrid` *or* a plain table — prefer a table since the matrix deliverable later is also a table and the parallel reinforces the format. Mark auth with a `Badge` ("covered") so the student sees six of seven are open work.

**Exercise — `Buckets`, two-column.** Sort ~8–10 concrete endpoints into "Needs a dedicated limiter" vs "Coarse default is enough." Items drawn from this stack: `POST /contact` (send), `GET /search?q=` (unindexed), the Stripe webhook receiver's *fan-out* email, `POST` presigned-upload, an authed `GET /invoices` list (default only), a settings-toggle Server Action (default only), public `POST /sign-up`, `GET /api/health` (default/none). Pedagogical goal: make the student *apply* the three triggers rather than recognize the categories — the discriminating items (the authed list, the settings toggle, the *fan-out* vs the *receiver*) are where the learning is. Put it directly after the catalog so recognition immediately converts to application.

### The threshold key for each category

The principle, then the table. State the single rule: **the key is the smallest scope that contains the abuse without affecting legitimate use.** Too broad (per-IP on an authed action) trips shared NATs and offices; too narrow (per-resource when the abuser rotates resources) lets the attack through. Derive the per-category strategies from that one principle so the student isn't memorizing a table — they're seeing the principle applied.

Per-category key strategy table (category | key strategy | why this scope):
- **Auth** — per-IP **and** per-email, both must pass (restated from 074; per-IP alone misses botnet stuffing, per-email alone is the lockout vector).
- **Email-sending** — per-org-per-recipient **and** per-org-total (stops one org spamming one victim, and one org spamming broadly).
- **Webhook fan-out** — per-tenant on the fan-out work (the cost is per-customer; the provider's retries shouldn't compound it).
- **Expensive public reads** — per-IP generous when anonymous, per-user tight behind auth.
- **File uploads** — per-user-per-day count **and** per-user-per-minute rate (two windows: total volume and burst).
- **Write-heavy shared actions** — per-org, per resource type.
- **Anonymous endpoints** — per-IP, tight.

Reinforce the dual-window and dual-key idea (two limiters, both must pass) as a recurring shape, not a special case — the student saw it on auth in 074; here it generalizes to email-sending and uploads.

**Diagram — small annotated illustration (HTML + CSS inside `<Figure>`, or `ArrowDiagram`).** A "scope ladder": a vertical strip from broadest (per-IP) → per-org → per-user → narrowest (per-resource), with a callout on each band naming what abuse it catches and what legitimate traffic it risks tripping. Pedagogical goal: visualize "smallest scope that contains the abuse" as a dial the senior tunes, making the per-category choices feel like points on one axis rather than seven unrelated rules. Keep it compact and horizontal-friendly; cap height.

`Term` candidates: *NAT* (why per-IP trips offices — many users behind one address), *fan-out* (restated: the downstream work a single inbound event triggers).

### Two invariants keep coverage grep-able

The audit-discipline section — restated from chapter 074 (module-scope) and chapter 080 L3 (`safeLimit`), but framed here for their *audit* role: they turn "is this endpoint covered correctly?" from a judgment call into a mechanical grep.

- **Every `limit(` call goes through `safeLimit(limiter, key)`.** This is the single seam where the fail-open carve-out (Redis outage → allow + log + alert) lives. Audit step: `grep` for `limit(` *not* preceded by `safeLimit` — every hit is a finding (a call bypassing the documented fail policy). Restate the fail policy in one line (fail-open on Redis/transport errors with a logged warning; fail-closed only on genuine quota exhaustion) and point to chapter 080 L3 as the owner — do not re-teach the wrapper's internals.
- **Every limiter is declared at module scope in `lib/rate-limit.ts`.** Reference shape (show, don't re-derive): `export const emailLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'), prefix: 'rl:email', analytics: true })`. Two reasons, both restated from 074: the in-memory cache survives across hot invocations only at module scope, and — the reason that matters *here* — the file becomes the single catalog the audit reads top-to-bottom. Inside-handler limiters fragment analytics, cold-cache per call, and hide from the audit.

**Code — `AnnotatedCode`.** A single `lib/rate-limit.ts` excerpt showing 3–4 limiters declared at module scope (the shared `redis` client, then e.g. `emailLimiter`, `uploadLimiter`, `searchLimiter`), each with a distinct `prefix` and `analytics: true`. Steps highlight: (1) the shared `Redis.fromEnv()` client reused by all limiters; (2) one limiter's algorithm+budget+`prefix` triad, naming `prefix` as the namespace that keeps analytics separate; (3) `analytics: true` as the line that makes the Upstash dashboard per-prefix view work; (4) the whole file as "the catalog the audit greps." Use `AnnotatedCode` (not plain `Code`) because the pedagogical point is directing attention to specific fields' *audit roles*, not teaching the API (already known). Keep `maxLines` modest; color steps blue. Note for the agent: this is a *recognition* read, not authoring — the student already wrote this shape in 074; do not turn it into a live exercise.

`CodeTooltips` candidate (optional, inline within the block or in prose): `prefix` (namespaces keys in Redis so two limiters' counts never collide), `analytics: true` (populates the per-prefix dashboard timeline). Only if it doesn't crowd the `AnnotatedCode` steps — the steps may already cover these; don't duplicate.

### The 429 response, restated for coverage

Brief — the user-facing contract, restated from chapter 074 for completeness of the audit (every covered endpoint must honor it), not taught fresh.

- **The 429 body is generic and identical regardless of which limiter or key tripped** — "Too many attempts. Please try again later." No leak about which limiter, which key, or whether an email exists. The structured operator log carries the truth (which limiter, which key, remaining, reset). This is the message-split rule from chapter 080 L2 applied to rate limiting; name it as such in one line.
- **The RFC RateLimit headers ship on rate-limited responses.** Restate the set chapter 074 shipped — `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, plus `Retry-After` on the 429 — projected directly from the `limit()` result's `limit` / `remaining` / `reset` fields (no hand-computing). **Forward-looking note for the agent:** the IETF draft (`draft-ietf-httpapi-ratelimit-headers`, now at -11, Jan 2026) has since converged on two combined structured fields — `RateLimit` (carrying limit/remaining/reset together) and `RateLimit-Policy` — superseding the three separate `RateLimit-*` headers. The course standardizes on the three-field form chapter 074 shipped (it's what `@upstash/ratelimit` and most 2026 clients still emit), so **keep teaching that form for consistency**, but add a one-sentence aside noting the draft's direction so the student isn't surprised to see `RateLimit` + `RateLimit-Policy` in newer APIs. Use an `Aside` (note) for this; do not contradict or re-teach 074.

`Term` candidate: *RFC 9457* only if Problem Details is mentioned for the 429 body shape — otherwise skip (the generic-message rule is the load-bearing part).

### CAPTCHA as the next gate when per-IP isn't enough

Short, named-not-wired — the escalation past rate limiting. Per-IP limits assume an attacker controls few IPs; a distributed botnet defeats that on public endpoints (sign-up, request-demo). The next gate is a CAPTCHA / bot-challenge on those specific public endpoints. Name **Cloudflare Turnstile** as the 2026 default (free, invisible for most users), with hCaptcha / Friendly Captcha as alternatives. Frame the trigger precisely: reach for it when a public endpoint's limiter is *consistently maxed by humans-shaped distributed traffic*, not by a single source — i.e., when per-IP is structurally insufficient, not as a default-on control. Explicitly defer wiring (out of scope here; not built in this lesson). One short paragraph; an `Aside` (tip) or `ExternalResource` to Turnstile docs is enough.

`Term` candidate: *CAPTCHA* (only if the student-base needs it — likely safe to assume known; skip unless brief).

### Build the coverage matrix

The deliverable section — converts the lesson into the concrete artifact chapter 082 consumes. Define the matrix columns: **endpoint/category | file path | limiter prefix | key strategy | covered (Y/N)**. Every "N" is a ticket; every gap is a finding. Show a partially-filled example matrix for this course's stack (auth = Y, the others a mix of Y/N) so the student sees the shape and the "find the gaps" workflow. Frame it as the senior's recurring audit pass — you don't memorize which endpoints are covered, you regenerate the matrix from a grep of `lib/rate-limit.ts` (the declared limiters) cross-referenced against the endpoint inventory.

**Exercise — custom matrix-completion, or `Dropdowns` in a table.** Present a near-complete coverage matrix with 2–3 cells blank (a missing key strategy for the email-sending row; a "covered?" verdict for the webhook fan-out row). Student fills the blanks via `<select>` (`Dropdowns` with a fenced table or inline `DropdownChoice`s). Goal: synthesize the whole lesson — pick the right key strategy and the right verdict by applying the triggers + scope principle in one place. Grading: the email row's key is per-org-per-recipient + per-org-total; the fan-out row is "N — receiver verified but fan-out uncapped." If `Dropdowns` can't cleanly render a table, fall back to a `MultipleChoice` per blank or a short custom component (describe: a static matrix table with two `<select>` cells and a Check button that greens/reds each). Prefer `Dropdowns` first.

**Optional closing — `Checklist`.** A tickable audit checklist mirroring the matrix workflow: "Every money/third-party/unauth endpoint has a dedicated limiter," "Every `limit(` goes through `safeLimit`," "Every limiter is at module scope in `lib/rate-limit.ts` with a distinct prefix," "429 body is generic," "Coverage matrix has no unexplained N." Reinforces that the lesson's output is a repeatable pass, not a one-time read.

### External resources (optional)

`ExternalResource` cards: the `@upstash/ratelimit` docs (for the limiter shapes, since they're referenced), Cloudflare Turnstile docs (the CAPTCHA carve-out), and optionally the IETF RateLimit-headers draft for the curious. Keep to 2–3.

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- `@upstash/ratelimit` API, the three algorithms, the `limit(key)` return shape, module-scope declaration, dual-keying mechanics — **chapter 074**. This lesson *uses* all of it; it teaches none of it.
- `safeLimit(limiter, key)` wrapper and the fail-open-on-auth carve-out — **chapter 080 L3**. Restated for its audit role only.
- The user-message / operator-message split and the generic 429 body — **chapter 080 L2**. Applied here, not taught.
- Webhook signature verification on the raw body — **chapter 063**. Named only to distinguish the (verified) receiver from the (uncapped) fan-out.
- R2 presigned-URL uploads — **chapter 069**. Named as the file-upload category's example.

**Explicitly out of scope (defer or name only):**
- Any new `@upstash/ratelimit` syntax, new algorithms, or re-derivation of the `limit()` call shape — owned by chapter 074.
- The `safeLimit` wrapper's internal implementation (the try/catch, the logged event) — owned by chapter 080 L3; this lesson only states the grep invariant.
- Vercel WAF / edge rate-limiting rules and writing them in code — named once in chapter 074 L1; not revisited here beyond a possible one-line "the edge is the outer ring" reminder.
- CAPTCHA / Turnstile wiring — named as the escalation, explicitly not built.
- CI enforcement of the grep invariants (a lint rule for `limit(` without `safeLimit`) — **chapter 097**; name as a forward reference at most.
- Per-endpoint budget tuning methodology (the 99th-percentile reasoning) — touch only as a one-line watch-out ("limits that trip legitimate users are worse than none — set them at the 99th percentile"), don't expand into a tuning lesson.
- The audit-log, GDPR/retention, consent, secrets, env, and dep-hygiene categories — sibling lessons in this chapter (L3–L8); this lesson is *only* the rate-limit-coverage category of the baseline. Do not drift into them.
- The full audit run against a seeded codebase — **chapter 082**; this lesson produces the matrix that project consumes.
